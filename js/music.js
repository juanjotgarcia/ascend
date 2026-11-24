/* LEDGER — music-reactive colors.
   Reads what you're listening to and recolors the app from the album cover.
   Two sources:
     • Spotify (direct):   OAuth with PKCE, no server. Spotify requires the developer-app owner to have Premium.
     • Last.fm (free):     your public "now playing" via a free API key. Spotify (free or Premium) can
                           send plays to Last.fm, and on Android any music app can via a scrobbler app.
   Tokens and API keys stay on this device. */

const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';
const SPOTIFY_BLOCKED = 'Spotify refused this account. The Ledger owner must add its email in the Spotify Developer Dashboard → Ledger → User Management, then disconnect and connect Spotify here again.';
const LASTFM_BLANK = '2a96cbd8b46e442fc41c2b86b821562f';   // Last.fm's placeholder star image

const Music = {
  track: null,        // { id, title, artist, album, art, artSmall, url, playing }
  overlay: null,      // theme colors taken from the current album
  status: 'off',      // off | idle | playing | error | setup
  error: '',
  timer: null, misses: 0, lastId: '',
  blocked: false, blockedTold: false,   // Spotify refused this account (not on the developer app's user list)

  cfg() { return S.settings.music; },
  on() { return !!(this.cfg() && this.cfg().enabled); },
  ready() {
    const c = this.cfg();
    if (c.source === 'spotify') return !!(SPOTIFY_CLIENT_ID && this.sp());
    return !!(c.lfUser && c.lfKey);
  },

  /* ---------- Polling loop ---------- */
  start() {
    this.stop();
    if (!this.on() || !this.ready()) { this.setStatus(this.on() ? 'setup' : 'off'); this.clear(); return; }
    const loop = async () => {
      if (!document.hidden) await this.poll();
      this.timer = setTimeout(loop, this.blocked ? 60000 : this.track && this.track.playing ? 3000 : 8000);
    };
    loop();
  },
  stop() { clearTimeout(this.timer); this.timer = null; },
  async poll() {
    try {
      const t = this.cfg().source === 'spotify' ? await this.spotifyNow() : await this.lastfmNow();
      if (this.blocked) { this.blocked = false; renderNowPlaying(); }
      if (t && t.playing) {
        this.misses = 0;
        const changed = t.id !== this.lastId;
        this.track = t; this.lastId = t.id; this.setStatus('playing');
        if (changed) await this.recolor(t);
        renderNowPlaying();
      } else if (++this.misses >= 2) {           // nothing playing for a little while: fade back
        this.track = null; this.lastId = ''; this.setStatus('idle'); this.clear(); renderNowPlaying();
      }
    } catch (e) {
      console.warn('Music:', e); this.error = e.message || String(e);
      if (e.blocked) {
        const first = !this.blocked; this.blocked = true; this.track = null; this.clear(); renderNowPlaying();
        if (first && !this.blockedTold) { this.blockedTold = true; toast(`${icon('play', 'xs')} Spotify hasn't let this account into Ledger yet — see Me → Appearance`); }
      }
      this.setStatus('error');
    }
  },
  async recolor(t) {
    if (!t.artSmall) return;
    try { this.overlay = await paletteFrom(t.artSmall); applyTheme({ fade: true }); }
    catch (e) { console.warn('palette', e); }
  },
  clear() { if (this.overlay) { this.overlay = null; applyTheme({ fade: true }); } },
  setStatus(s) { this.status = s; document.querySelectorAll('[data-music-status]').forEach(el => el.textContent = musicStatusText()); },

  /* ---------- Last.fm ---------- */
  async lastfmNow() {
    const c = this.cfg();
    const u = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(c.lfUser)}&api_key=${encodeURIComponent(c.lfKey)}&format=json&limit=1`;
    const r = await fetch(u); const j = await r.json();
    if (j.error) throw new Error(j.message || 'Last.fm error');
    const tr = [].concat((j.recenttracks || {}).track || [])[0];
    if (!tr || !(tr['@attr'] && tr['@attr'].nowplaying === 'true')) return null;
    const img = s => ((tr.image || []).find(i => i.size === s) || {})['#text'] || '';
    const good = u => u && !u.includes(LASTFM_BLANK) ? u : '';
    return { id: `${tr.artist['#text']}|${tr.name}`, title: tr.name, artist: tr.artist['#text'], album: (tr.album || {})['#text'] || '',
      art: good(img('extralarge') || img('large')), artSmall: good(img('medium') || img('large')), url: tr.url, playing: true };
  },

  /* ---------- Spotify (Authorization Code + PKCE) ---------- */
  sp() { try { return JSON.parse(localStorage.getItem('ledger.spotify') || 'null'); } catch (e) { return null; } },
  setSp(v) { try { v ? localStorage.setItem('ledger.spotify', JSON.stringify(v)) : localStorage.removeItem('ledger.spotify'); } catch (e) { } },
  redirectUri() { return location.origin + location.pathname.replace(/index\.html$/, ''); },
  async connectSpotify() {
    if (!SPOTIFY_CLIENT_ID) return toast('Spotify isn\'t set up yet');
    const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[b % 66]).join('');
    const verifier = rnd(64), state = (Native.isApp ? 'app_' : '') + rnd(16);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    localStorage.setItem('ledger.spotify.pkce', JSON.stringify({ verifier, state }));
    const q = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: this.redirectUri(), scope: SPOTIFY_SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state });
    const url = `https://accounts.spotify.com/authorize?${q}`;
    if (Native.isApp) Native.openBrowser(url); else location.href = url;
  },
  async handleRedirect() {
    const p = new URLSearchParams(location.search);
    if (!p.get('code') && !p.get('error')) return;
    const state = p.get('state') || '';
    // Started in the Android app: hand the code back to the app (it holds the PKCE verifier)
    if (state.startsWith('app_') && !Native.isApp) return handBack(`ledger://spotify?${new URLSearchParams({ code: p.get('code') || '', state, error: p.get('error') || '' })}`, 'Spotify');
    history.replaceState(null, '', this.redirectUri() + location.hash);
    if (p.get('error')) return toast('Spotify connection cancelled');
    await this.exchange(p.get('code'), state);
  },
  async exchange(code, state) {
    const saved = JSON.parse(localStorage.getItem('ledger.spotify.pkce') || '{}');
    if (!code) return toast('Spotify connection cancelled');
    if (!saved.state || state !== saved.state) return toast('Spotify sign-in didn\'t match — try again');
    try {
      const tok = await this.tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: this.redirectUri(), code_verifier: saved.verifier });
      localStorage.removeItem('ledger.spotify.pkce');
      this.saveTokens(tok);
      S.settings.music.source = 'spotify'; S.settings.music.enabled = true; save();
      toast(`${icon('check', 'xs')} Spotify connected — play something!`); this.start(); render();
    } catch (e) { toast(`Spotify: ${esc(e.message)}`); }
  },
  async tokenRequest(body) {
    const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...body }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error_description || j.error || `HTTP ${r.status}`);
    return j;
  },
  saveTokens(j) {
    const old = this.sp() || {};
    this.setSp({ access: j.access_token, refresh: j.refresh_token || old.refresh, exp: Date.now() + (j.expires_in - 60) * 1000 });
  },
  async spotifyToken() {
    const t = this.sp(); if (!t) throw new Error('Not connected');
    if (Date.now() < t.exp) return t.access;
    this.saveTokens(await this.tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh }));
    return this.sp().access;
  },
  async spotifyNow() {
    let r = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode', { headers: { Authorization: `Bearer ${await this.spotifyToken()}` } });
    if (r.status === 204) return null;
    if (r.status === 401) { const t = this.sp(); if (t) { t.exp = 0; this.setSp(t); } return null; }
    if (r.status === 403) {
      // Development-mode Spotify apps only serve accounts the owner added under User Management (up to 5)
      const e = new Error(SPOTIFY_BLOCKED); e.blocked = true; throw e;
    }
    if (!r.ok) throw new Error(`Spotify HTTP ${r.status}`);
    const j = await r.json(), it = j.item; if (!it) return null;
    const imgs = (it.album || it.show || {}).images || [];
    return { id: it.id, title: it.name, artist: (it.artists || []).map(a => a.name).join(', ') || (it.show || {}).name || '', album: (it.album || {}).name || '',
      art: (imgs[1] || imgs[0] || {}).url || '', artSmall: (imgs[imgs.length - 1] || {}).url || '', url: (it.external_urls || {}).spotify || '', playing: !!j.is_playing };
  },
  disconnectSpotify() { this.setSp(null); this.track = null; this.clear(); this.start(); render(); },
};

/* ---------- Album-art palette ----------
   Reads the cover at 48×48, groups similar colors, and picks:
   accent  = the most vivid color (brightened to read well on black)
   accent2 = a second vivid color with a different hue
   glow1/2 = the cover's dominant colors, deepened for the background light */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslHex(h, s, l) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
async function paletteFrom(url) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; await img.decode();
  const N = 48, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, N, N);
  const px = x.getImageData(0, 0, N, N).data, buckets = new Map();
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
    const o = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    o.n++; o.r += r; o.g += g; o.b += b; buckets.set(key, o);
  }
  const cols = [...buckets.values()].map(o => { const r = o.r / o.n, g = o.g / o.n, b = o.b / o.n, [h, s, l] = rgbToHsl(r, g, b); return { h, s, l, n: o.n }; });
  const vivid = c => c.n * (0.15 + c.s * c.s) * (c.l > 0.12 && c.l < 0.9 ? 1 : 0.1);
  const byVivid = [...cols].sort((a, b) => vivid(b) - vivid(a)), byCount = [...cols].sort((a, b) => b.n - a.n);
  const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  const a1 = byVivid[0];
  const a2 = byVivid.find(c => c !== a1 && hueGap(c.h, a1.h) > 28 && c.s > 0.2) || { ...a1, h: (a1.h + 35) % 360 };
  const g1 = byCount.find(c => c.s > 0.15 && c.l > 0.08) || a1;
  const g2 = byCount.find(c => c !== g1 && c.s > 0.12 && hueGap(c.h, g1.h) > 20) || a2;
  const grey = a1.s < 0.12;                               // black & white covers stay elegant and neutral
  const accent = grey ? '#f2f2f7' : hslHex(a1.h, Math.max(0.55, a1.s), Math.min(0.68, Math.max(0.55, a1.l)));
  const accent2 = grey ? '#8e8e93' : hslHex(a2.h, Math.max(0.5, a2.s), Math.min(0.62, Math.max(0.48, a2.l)));
  return {
    accent, accent2,
    glow1: grey ? '#3a3a3f' : hslHex(g1.h, Math.min(0.85, Math.max(0.45, g1.s)), 0.32),
    glow2: grey ? '#1c1c1f' : hslHex(g2.h, Math.min(0.8, Math.max(0.4, g2.s)), 0.2),
    logo: grey ? '#ffffff' : hslHex(a1.h, Math.max(0.5, a1.s), 0.78),
  };
}

/* ---------- Now Playing bar (Today) ---------- */
function nowPlayingHTML() {
  const t = Music.track;
  if (Music.on() && Music.blocked) return `<button class="nowplaying glass np-blocked" data-go="me">
    <span class="np-art">${icon('play')}</span><span class="grow np-text"><b>Spotify hasn't let this account in yet</b><span>Ledger only follows what plays in Spotify · tap for the fix</span></span></button>`;
  if (!Music.on() || !t) return '';
  return `<a class="nowplaying glass" href="${esc(t.url || '#')}" target="_blank" rel="noopener">
    ${t.art ? `<img src="${esc(t.art)}" alt="" crossorigin="anonymous">` : `<span class="np-art">${icon('star')}</span>`}
    <span class="grow np-text"><b>${esc(t.title)}</b><span>${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</span></span>
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></a>`;
}
function renderNowPlaying() { document.querySelectorAll('[data-nowplaying]').forEach(el => el.innerHTML = nowPlayingHTML()); }
function musicStatusText() {
  const c = S.settings.music, s = Music.status;
  if (!c.enabled) return 'Off';
  if (s === 'setup') return c.source === 'spotify' ? 'Connect Spotify to start' : 'Add your Last.fm username and API key';
  if (s === 'error') return `Problem: ${Music.error}`;
  if (s === 'playing' && Music.track) return `Now playing: ${Music.track.title} — ${Music.track.artist}`;
  return 'Listening… play a song and the colors will follow';
}

/* Settings block (inside Appearance) */
function musicSettingsHTML() {
  const c = S.settings.music, sp = Music.sp();
  return `<h4 class="mt">${icon('sun', 'sm')} Colors from my music</h4>
    <div class="row between center mt-s"><span class="small">Recolor Ledger with the album I'm playing</span>
      <button class="switch ${c.enabled ? 'on' : ''}" data-act="musicToggle" role="switch" aria-checked="${c.enabled}" aria-label="Recolor with my music"><i></i></button></div>
    ${c.enabled ? `
    <div class="seg mt">${[['lastfm', 'Last.fm · free'], ['spotify', 'Spotify · Premium']].map(([v, l]) => `<button class="${c.source === v ? 'on' : ''}" data-act="musicSource" data-v="${v}">${l}</button>`).join('')}</div>
    ${c.source === 'spotify' ? (SPOTIFY_CLIENT_ID
      ? `<p class="tiny muted mt-s">Ledger doesn't play music: it follows what's playing in the Spotify app. Spotify only allows accounts the Ledger owner has added (Spotify Developer Dashboard → User Management, up to 5 people), and the owner needs Premium.</p>${sp ? `<button class="btn ghost wide mt-s" data-act="spotifyOff">Disconnect Spotify</button>` : `<button class="btn spotify wide mt-s" data-act="spotifyOn">${icon('play', 'sm')} Connect Spotify</button>`}`
      : `<p class="tiny muted mt-s">Spotify needs a one-time developer setup (and Premium). Ask Claude to finish it, or use Last.fm for free.</p>`)
      : `<p class="tiny muted mt-s">Connect Spotify to Last.fm once (last.fm → Settings → Applications → Spotify). On Android, a free scrobbler app adds YouTube Music, Apple Music and others.</p>
      <div class="form-grid mt-s">
        <label class="field"><span>Last.fm username</span><input class="inp" id="lfUser" value="${esc(c.lfUser)}" autocomplete="off" autocapitalize="off"></label>
        <label class="field"><span>API key</span><input class="inp" id="lfKey" value="${esc(c.lfKey)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      </div><button class="btn soft wide mt-s" data-act="lastfmSave">${icon('check', 'sm')} Save & test</button>`}
    <p class="tiny muted mt-s" data-music-status>${musicStatusText()}</p>` : ''}`;
}

const MUSIC_ACT = {
  musicToggle: () => { S.settings.music.enabled = !S.settings.music.enabled; save(); Music.start(); rerenderAppearance(); render(); },
  musicSource: d => { S.settings.music.source = d.v; save(); Music.track = null; Music.clear(); Music.start(); rerenderAppearance(); },
  spotifyOn: () => Music.connectSpotify(),
  spotifyOff: () => { Music.disconnectSpotify(); rerenderAppearance(); },
  lastfmSave: async () => {
    const c = S.settings.music;
    c.lfUser = document.getElementById('lfUser').value.trim(); c.lfKey = document.getElementById('lfKey').value.trim(); save();
    if (!c.lfUser || !c.lfKey) return toast('Add both your username and API key');
    try { await Music.lastfmNow(); toast(`${icon('check', 'xs')} Last.fm connected`); Music.start(); }
    catch (e) { toast(`Last.fm: ${esc(e.message)}`); Music.error = e.message; Music.setStatus('error'); }
  },
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && Music.on() && Music.ready()) Music.poll(); });

/* Full-screen "Return to Ledger" step used when a sign-in started in the Android app finishes in Chrome */
function handBack(url, what) {
  const el = document.createElement('div');
  el.className = 'handback';
  el.innerHTML = `<div class="handback-card glass"><div class="onb-check">${icon('check')}</div><h2>${esc(what)} connected</h2>
    <p class="muted small">Tap below to go back to the Ledger app.</p><a class="btn primary wide mt" href="${esc(url)}">Return to Ledger</a></div>`;
  document.body.appendChild(el);
  setTimeout(() => { location.href = url; }, 250);
}
