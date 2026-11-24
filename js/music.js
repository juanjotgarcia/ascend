/* ZELUM — music-reactive colors.
   Reads what you're listening to and recolors the app from the album cover.
   Three sources:
     • This phone (Android app only, default): reads the music controls of ANY player (Spotify, YouTube Music,
                           Apple Music, Deezer…) through Android's media sessions. Needs Notification access once.
                           No account and no user limit, so it scales to a public release.
     • Spotify (direct):   OAuth with PKCE, no server. Spotify requires the developer-app owner to have Premium,
                           and Development mode serves at most 5 allowlisted accounts.
     • Last.fm (free):     your public "now playing" via a free API key. Spotify (free or Premium) can
                           send plays to Last.fm, and on Android any music app can via a scrobbler app.
   Tokens and API keys stay on this device. */

const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';
const SPOTIFY_BLOCKED = 'Spotify refused this account. The Zelum owner must add its email in the Spotify Developer Dashboard → Ledger → User Management, then disconnect and connect Spotify here again.';
const LASTFM_BLANK = '2a96cbd8b46e442fc41c2b86b821562f';   // Last.fm's placeholder star image
const APK_URL = 'https://github.com/juanjotgarcia/ascend/releases/latest/download/ledger.apk';
const PLAYER_NAMES = {   // used when Android doesn't tell Zelum the player's name
  'com.spotify.music': 'Spotify', 'com.google.android.apps.youtube.music': 'YouTube Music', 'com.google.android.youtube': 'YouTube',
  'com.apple.android.music': 'Apple Music', 'deezer.android.app': 'Deezer', 'com.amazon.mp3': 'Amazon Music',
  'com.soundcloud.android': 'SoundCloud', 'com.aspiro.tidal': 'TIDAL', 'com.pandora.android': 'Pandora',
};

const Music = {
  track: null,        // { id, title, artist, album, art, artSmall, url, app, playing }
  overlay: null,      // theme colors taken from the current album
  status: 'off',      // off | idle | playing | error | setup
  error: '',
  timer: null, misses: 0, lastId: '', lastArt: '',
  blocked: false, blockedTold: false,   // Spotify refused this account (not on the developer app's user list)
  phone: { supported: null, access: false, art: {} },   // supported: null = not checked yet, false = web or an older APK

  cfg() { return S && S.settings ? S.settings.music : null; },   // null before the state has loaded
  /* The source actually used: "This phone" only exists in the Android app, so the web falls back to Last.fm */
  src() { const s = (this.cfg() || {}).source; return s === 'phone' && !Native.isApp ? 'lastfm' : s; },
  on() { return !!(this.cfg() && this.cfg().enabled); },
  ready() {
    const c = this.cfg(), s = this.src();
    if (s === 'phone') return !!(this.phone.supported && this.phone.access);
    if (s === 'spotify') return !!(SPOTIFY_CLIENT_ID && this.sp());
    return !!(c.lfUser && c.lfKey);
  },

  /* ---------- Polling loop ---------- */
  start() {
    this.stop();
    if (this.on() && this.src() === 'phone' && this.phone.supported === null) { this.checkPhone().then(() => this.start()); return; }
    if (!this.on() || !this.ready()) { this.track = null; this.lastId = ''; this.setStatus(this.on() ? 'setup' : 'off'); this.clear(); renderNowPlaying(); return; }
    const phone = this.src() === 'phone';   // local and cheap: check often so colors follow skips quickly
    const gen = this.gen;
    const loop = async () => {
      if (!document.hidden) await this.poll();
      if (gen !== this.gen) return;         // stopped or restarted while checking
      this.timer = setTimeout(loop, this.blocked ? 60000 : this.track && this.track.playing ? (phone ? 2500 : 3000) : (phone ? 5000 : 8000));
    };
    loop();
  },
  gen: 0,
  stop() { clearTimeout(this.timer); this.timer = null; this.gen++; },
  async poll() {
    try {
      const s = this.src();
      const t = s === 'phone' ? await this.phoneNow() : s === 'spotify' ? await this.spotifyNow() : await this.lastfmNow();
      if (this.blocked) { this.blocked = false; renderNowPlaying(); }
      if (t && t.playing) {
        this.misses = 0;
        const changed = t.id !== this.lastId || (t.artSmall || '') !== this.lastArt;   // a cover can arrive after its title
        this.track = t; this.lastId = t.id; this.lastArt = t.artSmall || ''; this.setStatus('playing');
        if (changed) await this.recolor(t);
        renderNowPlaying();
      } else if (++this.misses >= 2) {           // nothing playing for a little while: fade back
        this.track = null; this.lastId = ''; this.lastArt = ''; this.setStatus('idle'); this.clear(); renderNowPlaying();
      }
    } catch (e) {
      console.warn('Music:', e); this.error = e.message || String(e);
      if (e.blocked) {
        const first = !this.blocked; this.blocked = true; this.track = null; this.clear(); renderNowPlaying();
        if (first && !this.blockedTold) { this.blockedTold = true; toast(`${icon('play', 'xs')} Spotify hasn't let this account into Zelum yet — see Me → Appearance`); }
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

  /* ---------- This phone (Android media sessions, via LedgerPlugin.nowPlaying) ---------- */
  async checkPhone() {
    const was = { ...this.phone };
    if (!Native.isApp) this.phone.supported = false;
    else {
      try { const r = await Native.p.ledger.nowPlaying({ have: '' }); this.phone.supported = true; this.phone.access = !!r.access; }
      catch (e) { this.phone.supported = false; this.phone.access = false; }   // APK from before v1.10: no nowPlaying method
    }
    return was.supported !== this.phone.supported || was.access !== this.phone.access;
  },
  async phoneNow() {
    const have = Object.keys(this.phone.art)[0] || '';       // the cover Zelum already has isn't sent again
    const r = await Native.p.ledger.nowPlaying({ have });
    if (!r.access) { this.phone.access = false; setTimeout(() => { this.start(); rerenderAppearance(); }, 0); return null; }
    if (!r.playing) return null;
    if (r.art) this.phone.art = { [r.id]: r.art };          // keep only the current cover
    const art = this.phone.art[r.id] || '';
    return { id: r.id, title: r.title, artist: r.artist || '', album: r.album || '', art, artSmall: art, url: '',
      app: r.app || PLAYER_NAMES[r.pkg] || '', playing: true };
  },
  /* Android says a player changed: check now instead of waiting for the next tick */
  phoneEvent() {
    if (!this.on() || this.src() !== 'phone') return;
    clearTimeout(this.pingTimer);
    this.pingTimer = setTimeout(() => { if (this.ready()) this.poll(); else this.recheck(); }, 350);
  },
  /* Back from Android settings: notification access may have changed */
  async recheck() {
    if (!this.on() || this.src() !== 'phone') return;
    if (await this.checkPhone()) { this.start(); rerenderAppearance(); }
  },

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
    <span class="np-art">${icon('play')}</span><span class="grow np-text"><b>Spotify hasn't let this account in yet</b><span>${Native.isApp ? 'Tip: choose “Any app” to skip Spotify’s limit · tap' : 'Zelum only follows what plays in Spotify · tap for the fix'}</span></span></button>`;
  if (!Music.on() || !t) return '';
  const sub = esc(t.artist) + (t.app ? ' · ' + esc(t.app) : t.album ? ' · ' + esc(t.album) : '');
  const inner = `${t.art ? `<img src="${esc(t.art)}" alt="">` : `<span class="np-art">${icon('star')}</span>`}
    <span class="grow np-text"><b>${esc(t.title)}</b><span>${sub}</span></span>
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  // A phone player opens in its own app; Spotify and Last.fm tracks open their web page
  return t.url ? `<a class="nowplaying glass" href="${esc(t.url)}" target="_blank" rel="noopener">${inner}</a>`
    : `<button class="nowplaying glass np-btn" data-act="openPlayer" aria-label="Open ${esc(t.app || 'the music app')}">${inner}</button>`;
}
function renderNowPlaying() { document.querySelectorAll('[data-nowplaying]').forEach(el => el.innerHTML = nowPlayingHTML()); }
function musicStatusText() {
  const c = S.settings.music, s = Music.status, src = Music.src();
  if (!c.enabled) return 'Off';
  if (s === 'setup') {
    if (src === 'phone') return Music.phone.supported === false ? 'This Zelum app is too old for this. Install the newest one (link above).'
      : Music.phone.supported === null ? 'Checking…' : 'Turn on notification access to start';
    return src === 'spotify' ? 'Connect Spotify to start' : 'Add your Last.fm username and API key';
  }
  if (s === 'error') return `Problem: ${Music.error}`;
  if (s === 'playing' && Music.track) return `Now playing: ${Music.track.title} — ${Music.track.artist}${Music.track.app ? ' (' + Music.track.app + ')' : ''}`;
  return src === 'phone' ? 'Listening… play a song in any music app and the colors will follow'
    : 'Listening… play a song and the colors will follow';
}

/* Settings block (inside Appearance) */
function musicSettingsHTML() {
  const c = S.settings.music, sp = Music.sp(), src = Music.src(), ph = Music.phone;
  // Spotify lets a solo developer's app serve only 5 allowlisted accounts, so it is offered only to people already using it
  const sources = [...(Native.isApp ? [['phone', 'Any app']] : []), ['lastfm', 'Last.fm'], ...(c.source === 'spotify' || sp ? [['spotify', 'Spotify']] : [])];
  const phoneHTML = () => {
    if (ph.supported === false) return Native.store ? `<p class="tiny muted mt-s">Update Zelum from Google Play to use this.</p>` : `<p class="tiny muted mt-s">This works in the newest Zelum app. Install it over this one; your progress stays.</p>
      <a class="btn soft wide mt-s" href="${APK_URL}" target="_blank" rel="noopener">${icon('download', 'sm')} Get the newest Zelum app</a>`;
    return `<p class="tiny muted mt-s">Works with Spotify, YouTube Music, Apple Music, Deezer and any app that shows music controls. No account needed.</p>
      ${ph.access ? `<p class="tiny mt-s np-ok">${icon('check', 'xs')} Notification access is on</p>`
        : `<button class="btn primary wide mt-s" data-act="musicAccess">${icon('bell', 'sm')} Allow notification access</button>
      <p class="tiny muted mt-s">Android asks for “notification access” because that is where music controls live. Zelum only reads the song, artist and cover. It never reads your messages, and nothing leaves your phone.</p>
      <p class="tiny muted mt-s">Switch greyed out? Android blocks it for apps installed outside the Play Store: open App info → ⋮ (top right) → <b>Allow restricted settings</b>, then come back and tap Allow again.</p>
      <button class="btn ghost wide mt-s" data-act="musicAppInfo">Open App info</button>`}`;
  };
  return `<h4 class="mt">${icon('sun', 'sm')} Colors from my music</h4>
    <div class="row between center mt-s"><span class="small">Recolor Zelum with the album I'm playing</span>
      <button class="switch ${c.enabled ? 'on' : ''}" data-act="musicToggle" role="switch" aria-checked="${c.enabled}" aria-label="Recolor with my music"><i></i></button></div>
    ${c.enabled ? `
    <div class="seg mt">${sources.map(([v, l]) => `<button class="${src === v ? 'on' : ''}" data-act="musicSource" data-v="${v}">${l}</button>`).join('')}</div>
    ${src === 'phone' ? phoneHTML() : src === 'spotify' ? (SPOTIFY_CLIENT_ID
      ? `<p class="tiny muted mt-s">Zelum doesn't play music: it follows what's playing in the Spotify app. Spotify only allows accounts the Zelum owner has added (Spotify Developer Dashboard → User Management, up to 5 people), and the owner needs Premium.${Native.isApp ? ' “Any app” has no such limit.' : ''}</p>${sp ? `<button class="btn ghost wide mt-s" data-act="spotifyOff">Disconnect Spotify</button>` : `<button class="btn spotify wide mt-s" data-act="spotifyOn">${icon('play', 'sm')} Connect Spotify</button>`}`
      : `<p class="tiny muted mt-s">Spotify needs a one-time developer setup (and Premium). Ask Claude to finish it, or use Last.fm for free.</p>`)
      : `<p class="tiny muted mt-s">Connect Spotify to Last.fm once (last.fm → Settings → Applications → Spotify). On Android, a free scrobbler app adds YouTube Music, Apple Music and others.</p>
      <div class="form-grid mt-s">
        <label class="field"><span>Last.fm username</span><input class="inp" id="lfUser" value="${esc(c.lfUser)}" autocomplete="off" autocapitalize="off"></label>
        <label class="field"><span>API key</span><input class="inp" id="lfKey" value="${esc(c.lfKey)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      </div><button class="btn soft wide mt-s" data-act="lastfmSave">${icon('check', 'sm')} Save & test</button>`}
    <p class="tiny muted mt-s" data-music-status>${musicStatusText()}</p>` : ''}`;
}

const MUSIC_ACT = {
  musicToggle: () => { if (!S.settings.music.enabled && !requirePlan('music')) return; S.settings.music.enabled = !S.settings.music.enabled; save(); Music.start(); rerenderAppearance(); render(); },
  musicSource: d => { S.settings.music.source = d.v; save(); Music.track = null; Music.lastId = ''; Music.clear(); Music.start(); rerenderAppearance(); },
  musicAccess: async () => {
    try { await Native.p.ledger.musicSettings({ open: 'access' }); } catch (e) { toast('Open Settings → Notifications → Notification access → Zelum'); }
  },
  musicAppInfo: () => Native.p.ledger.musicSettings({ open: 'appinfo' }).catch(() => { }),
  openPlayer: () => Native.p.ledger.openPlayer().catch(() => { }),
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !Music.on()) return;
  if (Music.src() === 'phone') Music.recheck().then(() => { if (Music.ready()) Music.poll(); });   // back from Android settings?
  else if (Music.ready()) Music.poll();
});

/* Full-screen "Return to Zelum" step used when a sign-in started in the Android app finishes in Chrome */
function handBack(url, what) {
  const el = document.createElement('div');
  el.className = 'handback';
  el.innerHTML = `<div class="handback-card glass"><div class="onb-check">${icon('check')}</div><h2>${esc(what)} connected</h2>
    <p class="muted small">Tap below to go back to the Zelum app.</p><a class="btn primary wide mt" href="${esc(url)}">Return to Zelum</a></div>`;
  document.body.appendChild(el);
  setTimeout(() => { location.href = url; }, 250);
}
