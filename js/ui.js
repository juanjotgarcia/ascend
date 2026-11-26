/* ZELUM — UI primitives: icons, formatting, rings, charts, sheets, toasts, effects. */

const ICONS = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  train: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  dumbbell: '<rect x="2.5" y="8.5" width="3" height="7" rx="1"/><rect x="5.5" y="6.5" width="3" height="11" rx="1"/><rect x="15.5" y="6.5" width="3" height="11" rx="1"/><rect x="18.5" y="8.5" width="3" height="7" rx="1"/><path d="M8.5 12h7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  star: '<path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/>',
  skill: '<path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/>',
  fuel: '<path d="M12 21c-4 0-7-3.5-7-8 0-3.5 2.5-6 5.5-6 1 0 1.5.4 1.5.4s.5-.4 1.5-.4c3 0 5.5 2.5 5.5 6 0 4.5-3 8-7 8z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  right: '<path d="M9 5l7 7-7 7"/>', left: '<path d="M15 5l-7 7 7 7"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  flame: '<path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.5-6-4-8 0 2.5-1.5 4-3 4 .5-3-1-6-4-8 0 4-4 6.5-4 12 0 4.2 3 7 8 7z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  cross: '<path d="M12 3v18M7 8h10"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15zM5 19l7-7"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  send: '<path d="M4 12l16-8-6 16-2-7z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  mountain: '<path d="M2 20l7-12 4 6 3-4 6 10z"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 10a5 5 0 0 1 8 0M12 10l1.5-2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>',
  push: '<path d="M4 12h12M12 6l6 6-6 6M20 4v16"/>',
  pull: '<path d="M20 12H8M12 6l-6 6 6 6M4 4v16"/>',
  legs: '<path d="M9 3v8l-3 10M15 3v8l3 10M9 11h6"/>',
  full: '<circle cx="12" cy="5" r="2"/><path d="M5 9h14M12 9v6l-4 6M12 15l4 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  habits: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.2 9.4"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M11 18.5h2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  laurel: '<path d="M7 4c-3 3-3 10 1 14M17 4c3 3 3 10-1 14M5 9c1 .5 2 .5 3 0M4.5 13c1.2.3 2.3.1 3.2-.6M19 9c-1 .5-2 .5-3 0M19.5 13c-1.2.3-2.3.1-3.2-.6"/>',
};
/* Solid flame used for streak counters */
const flame = (cls = '') => `<svg class="ic fl ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22c4.4 0 7.5-3 7.5-7.3 0-3.8-2.6-6.4-4.3-8.6-.3 2.5-1.6 4-3.1 4 .4-3.2-1.1-6.3-4.2-8.1 0 4.2-4.4 6.8-4.4 12.6C3.5 19 7.4 22 12 22z"/><path fill="rgba(255,255,255,.55)" d="M12 21c-1.9 0-3.2-1.3-3.2-3.1 0-2.2 1.8-3.3 2.6-5 .9 1.2 3.8 2.6 3.8 5.1 0 1.8-1.3 3-3.2 3z"/></svg>`;
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.star}</svg>`;

const COLORS = { blue: 'var(--blue)', teal: 'var(--teal)', orange: 'var(--orange)', pink: 'var(--pink)', purple: 'var(--purple)', green: 'var(--green)', yellow: 'var(--gold)', gold: 'var(--gold)', red: 'var(--red)' };
const col = c => COLORS[c] || c || 'var(--blue)';
/* Prefix for gradient ids inside generated SVGs (shields, exercise figures); see stableIds() in app.js */
let svgIdPrefix = '';

/* ---------- Theme ---------- */
function themeColors() {
  const t = S.settings.theme || {};
  const music = typeof Music !== 'undefined' && Music.overlay && Music.on() ? Music.overlay : {};
  return { ...THEMES.midnight.colors, ...(THEMES[t.preset] || {}).colors, ...(t.colors || {}), ...music };
}
function hexToRgb(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function luminance(h) { return hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); }
/* fade: true only for album-driven changes (music.js). Without it colors switch instantly, so start-up
   and dragging the Appearance sliders don't animate the styles of the whole page. */
function applyTheme({ fade = false } = {}) {
  const t = S.settings.theme || {}, c = themeColors(), root = document.documentElement.style, de = document.documentElement;
  if (fade) { de.classList.add('theme-fade'); clearTimeout(applyTheme._t); applyTheme._t = setTimeout(() => de.classList.remove('theme-fade'), 1400); }
  for (const [k, v] of Object.entries(c)) {
    root.setProperty(`--${k}`, v);
    root.setProperty(`--on-${k}`, luminance(v) > 0.42 ? '#0b0b0d' : '#ffffff');   // readable text on that color
  }
  root.setProperty('--glow-o', String(t.glow ?? 0.55));
  root.setProperty('--blur-px', `${t.blur ?? 26}px`);
  // Browser tab / desktop icon follows the logo colors
  const fav = document.querySelector('link[rel=icon]');
  if (fav) fav.href = 'data:image/svg+xml,' + encodeURIComponent(logoSVG({ mark: c.logo, bg: c.logoBg, size: 64, xmlns: true }));
}
/* The Zelum mark: a split Z (two bars and a free-standing diagonal). Same geometry as icons/icon.svg
   and the icon generators in tools/ (512 x 512 units). */
const LOGO_PATH = 'M136 132H376V180H136Z M136 332H376V380H136Z M293 198H376L219 314H136Z';
function logoSVG({ mark = 'var(--logo)', bg = 'var(--logoBg)', size = 40, cls = '', xmlns = false } = {}) {
  return `<svg ${xmlns ? 'xmlns="http://www.w3.org/2000/svg" ' : ''}class="logo ${cls}" viewBox="0 0 512 512" width="${size}" height="${size}" aria-hidden="true">`
    + `<rect width="512" height="512" rx="115" fill="${bg}"/><path fill="${mark}" d="${LOGO_PATH}"/></svg>`;
}
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- Text ---------- */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,!?]|$)/gm, '$1<i>$2</i>')
    .replace(/(^|[\s(])\*(.+?)\*(?=[\s).,!?]|$)/gm, '$1<i>$2</i>')
    .replace(/\n/g, '<br>');
}
const fmtN = n => Math.round(n).toLocaleString('en-US');
/* toLocaleDateString is slow (it builds an Intl formatter per call) and the screens ask for the same few dates
   over and over, so remember every answer */
const fmtDateMemo = new Map();
function fmtDate(k, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const key = k + '|' + (opts.weekday || '') + (opts.month || '') + (opts.day || '') + (opts.year || '');
  let s = fmtDateMemo.get(key);
  if (s === undefined) { if (fmtDateMemo.size > 2000) fmtDateMemo.clear(); s = parseDay(k).toLocaleDateString(LOCALE, opts); fmtDateMemo.set(key, s); }
  return s;
}
/* Wraps a function whose result only depends on the saved state (and today's date): repeated calls between two
   saves return the remembered answer. save() stamps S.updatedAt, which starts a fresh memory. */
function memoState(fn) {
  let epoch = '', memo = new Map();
  return function (...args) {
    const e = (S && S.updatedAt) + '|' + today();
    if (e !== epoch) { epoch = e; memo = new Map(); }
    const key = args.join('|');
    if (memo.has(key)) return memo.get(key);
    const v = fn.apply(this, args); memo.set(key, v); return v;
  };
}
function relDay(k) {
  const d = daysBetween(k, today());
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 7 ? parseDay(k).toLocaleDateString(LOCALE, { weekday: 'long' }) : fmtDate(k);
}

/* ---------- Rings & bars ---------- */
function ring({ pct = 0, size = 64, sw = 7, color = 'var(--blue)', inner = '', glow = true }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, p = clamp(pct);
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.09)" stroke-width="${sw}" fill="none"/>
      ${glow && p > 0 ? `<circle class="ring-fg ring-halo" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${sw + 5}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c0:${c}"/>` : ''}
      <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c0:${c}"/>
    </svg><div class="ring-in">${inner}</div></div>`;
}
const bar = (pct, color = 'var(--blue)', cls = '') => `<div class="bar ${cls}"><i style="width:${(clamp(pct) * 100).toFixed(1)}%;background:${color}"></i></div>`;

/* ---------- Charts (inline SVG) ---------- */
function lineChart(pts, { h = 150, color = 'var(--teal)', unit = '' } = {}) {
  if (pts.length < 2) return `<div class="empty-chart">${pts.length ? `${pts[0].y}${unit} logged. Add another weigh-in to see the trend.` : 'No data yet.'}</div>`;
  const W = 600, H = h, pad = { l: 34, r: 12, t: 14, b: 22 };
  const ys = pts.map(p => p.y), mn = Math.min(...ys), mx = Math.max(...ys), span = Math.max(1, mx - mn);
  const lo = mn - span * 0.15, hi = mx + span * 0.15;
  const x = i => pad.l + (i / (pts.length - 1)) * (W - pad.l - pad.r);
  const y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const area = `${d}L${x(pts.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
  const ticks = [lo + (hi - lo) * 0.2, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.8];
  const id = 'lc' + hashStr(JSON.stringify(pts) + color);   // stable, so in-place updates leave the chart alone
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${h}px">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map(t => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="rgba(255,255,255,.06)"/><text x="4" y="${y(t) + 4}" class="tick">${t.toFixed(1)}</text>`).join('')}
    <path d="${area}" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="3.5" fill="${color}"><title>${esc(p.x)}: ${p.y}${unit}</title></circle>`).join('')}
    <text x="${pad.l}" y="${H - 5}" class="tick">${esc(pts[0].x)}</text><text x="${W - pad.r}" y="${H - 5}" class="tick" text-anchor="end">${esc(pts[pts.length - 1].x)}</text>
  </svg>`;
}
function barChart(vals, labels, { h = 120, color = 'var(--blue)', goal = 0 } = {}) {
  const mx = Math.max(1, goal, ...vals);
  return `<div class="bars" style="height:${h}px">
    ${goal ? `<div class="bars-goal" style="bottom:${(goal / mx) * 100}%"></div>` : ''}
    ${vals.map((v, i) => `<div class="bars-col"><div class="bars-v">${v || ''}</div><div class="bars-b" style="height:${(v / mx) * 100}%;background:${goal && v >= goal ? 'var(--green)' : color}"></div><div class="bars-l">${esc(labels[i])}</div></div>`).join('')}
  </div>`;
}
function heatmap(weeks, fn) {
  const start = addDays(weekKey(), -7 * (weeks - 1));
  let cols = '';
  for (let w = 0; w < weeks; w++) {
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const k = addDays(start, w * 7 + d);
      const v = k > today() ? -1 : fn(k);
      cells += `<i title="${k}" style="${v < 0 ? 'opacity:.15' : v > 0 ? `background:color-mix(in srgb, var(--success) ${Math.round(25 + 75 * v)}%, transparent);box-shadow:0 0 ${v > .8 ? 8 : 0}px color-mix(in srgb, var(--success) 60%, transparent)` : ''}"></i>`;
    }
    cols += `<div>${cells}</div>`;
  }
  return `<div class="heat">${cols}</div>`;
}

/* ---------- Overlays ---------- */
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2900);
}
function xpToast(amt, why) { toast(`<span class="xp-chip">+${amt} XP</span> ${esc(why)}`, 'xp'); }

function openSheet(html, { cls = '', onClose, tc } = {}) {
  closeSheet(true);
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet glass ${cls}" role="dialog" aria-modal="true" ${tc ? `style="--tc:${tc}"` : ''}><div class="grabber"></div>${html}</div>`;
  wrap._onClose = onClose;
  document.body.appendChild(wrap);
  if (typeof SFX !== 'undefined') SFX.play('open');
  requestAnimationFrame(() => wrap.classList.add('in'));
  const first = wrap.querySelector('input:not([type=hidden]):not([data-noautofocus]),textarea');
  if (first && matchMedia('(pointer:fine)').matches) setTimeout(() => first.focus(), 250);
  return wrap;
}
function closeSheet(instant) {
  document.querySelectorAll('.sheet-wrap').forEach(w => {
    const cb = w._onClose; w._onClose = null; if (cb) cb();
    if (instant) return w.remove();
    if (typeof SFX !== 'undefined') SFX.play('close');
    w.classList.remove('in'); setTimeout(() => w.remove(), 320);
  });
}
/* ---------- Graphics: Full glass or Smooth ----------
   Real-time blur (backdrop-filter) behind the nav bar and sticky headers is the most expensive thing the GPU does
   while you scroll. Fast phones handle it at 120 Hz; slower GPUs drop frames. "Auto" watches the first few scrolls:
   if more than a quarter of the frames arrive late, it switches this device to Smooth (no blur, same look otherwise).
   The choice is per device (localStorage), never synced: a fast phone and a slow one can differ. */
const Gfx = {
  key: 'ledger.gfx', autoKey: 'ledger.gfxAuto',
  pref() { try { return localStorage.getItem(this.key) || 'auto'; } catch (e) { return 'auto'; } },
  autoLite() { try { return localStorage.getItem(this.autoKey) === 'smooth'; } catch (e) { return false; } },
  lite() { const p = this.pref(); return p === 'smooth' || (p === 'auto' && this.autoLite()); },
  motion() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (typeof Native !== 'undefined' && Native.renderMode === 'software') return false;
    return !this.lite();
  },
  apply() { document.documentElement.classList.toggle('gfx-lite', this.lite()); },
  set(v) { try { localStorage.setItem(this.key, v); if (v === 'auto') localStorage.removeItem(this.autoKey); } catch (e) { } this.apply(); this.samples = 0; },
  init() {
    this.apply();
    addEventListener('scroll', () => this.watch(), { passive: true });
  },
  /* Frame-time sampling during a scroll (auto mode only, until a verdict) */
  samples: 0, late: 0, watching: false,
  watch() {
    if (this.watching || this.pref() !== 'auto' || this.autoLite() || this.samples >= 240) return;
    this.watching = true;
    let last = 0, n = 0;
    const deltas = [];
    const step = t => {
      if (last) deltas.push(t - last);
      last = t;
      if (++n < 60) return requestAnimationFrame(step);
      this.watching = false;
      if (document.hidden || deltas.length < 30) return;
      const sorted = [...deltas].sort((a, b) => a - b), base = sorted[Math.floor(sorted.length * 0.2)];   // the screen's own frame time
      this.samples += deltas.length;
      this.late += deltas.filter(d => d > base * 1.6).length;
      if (this.samples >= 120 && this.late / this.samples > 0.25) {
        try { localStorage.setItem(this.autoKey, 'smooth'); } catch (e) { }
        this.apply();
      }
    };
    requestAnimationFrame(step);
  },
};
/* Clocks tick 4× a second: only touch the DOM when the visible text actually changes */
function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }
function sheetEl() { return document.querySelector('.sheet-wrap .sheet'); }

/* ---------- In-place updates ----------
   morphHTML(el, html) makes el's contents match html while keeping every node that is
   still the same. A tap then repaints only what really changed (a number, a ring, a row)
   instead of rebuilding and re-rasterizing the whole screen; images don't reload, entry
   animations don't replay, focus and inner scroll positions survive, and the CSS
   transitions on rings and bars finally get to run. */
const nodeKey = n => n.nodeType === 1 ? (n.id || n.getAttribute('data-hid') || n.getAttribute('data-key') || '') : '';
/* Speed (120 Hz leaves 8 ms per frame, and a budget phone is ~5× slower than a PC):
   - the same HTML as last time is skipped outright, with no parsing and no diff;
   - an unchanged card is recognised natively with isEqualNode and skipped whole, so a tap
     only walks the cards that really changed. Subtrees with form fields still go through
     morphNode, which keeps their live values in step. */
function morphHTML(el, html) {
  if (el.__html === html) return;
  const t = document.createElement('template');
  t.innerHTML = html;
  morphChildren(el, t.content);
  el.__html = html;
}
const hasField = n => n.nodeType === 1 && (/^(INPUT|SELECT|TEXTAREA)$/.test(n.nodeName) || !!n.querySelector('input,select,textarea'));
function morphChildren(from, to) {
  let a = from.firstChild, b = to.firstChild;
  while (b) {
    const nextB = b.nextSibling;
    if (!a) from.appendChild(b);
    else if (a.nodeType === b.nodeType && a.nodeName === b.nodeName && nodeKey(a) === nodeKey(b)) { if (!a.isEqualNode(b) || hasField(a)) morphNode(a, b); a = a.nextSibling; }
    else { from.replaceChild(b, a); a = b.nextSibling; }
    b = nextB;
  }
  while (a) { const nextA = a.nextSibling; from.removeChild(a); a = nextA; }
}
function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  delete a.__html;   // its contents change here, so its own skip-cache (morphHTML) no longer applies
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  for (let i = a.attributes.length - 1; i >= 0; i--) { const n = a.attributes[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
  morphChildren(a, b);
  const tag = a.nodeName, focused = a === document.activeElement;
  if (tag === 'INPUT') { a.checked = b.checked; if (!focused && a.value !== b.value) a.value = b.value; }
  else if (tag === 'TEXTAREA') { if (!focused && a.value !== b.defaultValue) a.value = b.defaultValue; }
  else if (tag === 'SELECT' && !focused) { const o = [...b.options].find(x => x.defaultSelected) || b.options[0]; if (o && a.value !== o.value) a.value = o.value; }
}

let confirmCb = null;
function askConfirm(title, body, yesLabel, cb, danger = true) {
  confirmCb = cb;
  openSheet(`<h3 class="sheet-title">${esc(title)}</h3><p class="muted">${esc(body)}</p>
    <div class="row gap mt"><button class="btn ghost grow" data-act="closeSheet">Cancel</button>
    <button class="btn ${danger ? 'danger' : 'primary'} grow" data-act="confirmYes">${esc(yesLabel)}</button></div>`);
}

function haptic(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }
/* Floating "+XP" that rises from where you tapped */
let lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('pointerdown', e => { lastPointer = { x: e.clientX, y: e.clientY }; if (typeof SFX !== 'undefined') SFX.unlock(); }, { passive: true, capture: true });
function xpFloat(amt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = 'xp-float'; el.textContent = `+${amt} XP`;
  el.style.left = `${Math.min(innerWidth - 50, Math.max(50, lastPointer.x))}px`; el.style.top = `${lastPointer.y}px`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}
/* Numbers that roll from their previous value to the new one */
const countMemo = {};
function countUps(fromZero) {
  document.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, key = el.dataset.ck, from = fromZero ? 0 : (countMemo[key] ?? to);
    countMemo[key] = to;
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmtN(to); return; }
    const t0 = performance.now(), dur = 700;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmtN(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* Remove every particle and floating +XP still in flight (called on tab switch, so none outlive their screen) */
function clearFx() { document.querySelectorAll('.spark, .xp-float').forEach(n => n.remove()); }
function burst(x = innerWidth / 2, y = innerHeight / 2, n = 28) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['--xp', '--accent', '--streak', '--faith', '--success'].map(cssVar).concat('#fff');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'spark';
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = 80 + Math.random() * 140;
    p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    p.addEventListener('animationend', () => p.remove(), { once: true });
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
