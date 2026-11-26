/* ZELUM — notifications.
   • Banners: iOS-style liquid-glass notifications that drop from the top (swipe up to dismiss, tap to open).
   • Live Activity: a floating "island" during workouts — elapsed time, next set, rest ring; tap to expand.
   • Reminders: habits (each can have a time), workout, water and the daily verse.
     Shown as banners while Zelum is open, and as system notifications while it's in the background.
     (Exact reminders while the app is fully closed need the Android app or a push server — see README.) */

/* ---------- Banners ---------- */
const TONES = { accent: 'var(--accent)', xp: 'var(--xp)', success: 'var(--success)', water: 'var(--water)', faith: 'var(--faith)', streak: 'var(--streak)', danger: 'var(--danger)' };
function notify({ title, body = '', ic = 'bell', tone = 'accent', art = '', sound = 'toggleOn', go: to = '', act = '', sticky = false, system = true, tag = '' }) {
  if (document.hidden && system) return sysNotify(title, body, tag || title, to);
  const box = document.getElementById('banners');
  const el = document.createElement('div');
  el.className = 'banner';
  el.style.setProperty('--tc', TONES[tone] || tone);
  el.innerHTML = `<span class="bn-ic">${art ? `<img src="${esc(art)}" alt="">` : icon(ic)}</span>
    <span class="bn-body"><span class="bn-top"><b>ZELUM</b><span>now</span></span><b class="bn-title">${esc(title)}</b>${body ? `<span class="bn-text">${esc(body)}</span>` : ''}</span>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 380); };
  let y0 = null, dy = 0;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
  el.addEventListener('pointermove', e => { if (y0 === null) return; dy = Math.min(20, e.clientY - y0); el.style.transform = `translateY(${dy}px)`; el.style.opacity = String(1 - Math.max(0, -dy) / 120); });
  el.addEventListener('pointerup', () => {
    el.style.transition = ''; y0 = null;
    if (dy < -36) return close();
    el.style.transform = ''; el.style.opacity = '';
    if (Math.abs(dy) < 6) { close(); if (to) go(to); if (act && ACT[act]) ACT[act]({}, el); }
  });
  box.prepend(el);
  while (box.children.length > 3) box.lastChild.remove();
  if (sound) SFX.play(sound);
  haptic([12, 40, 12]);
  if (!sticky) setTimeout(close, 5200);
  return el;
}
async function sysNotify(title, body, tag, to = '') {
  title = tr(title); body = tr(body);   // a system notification is plain text, so translate it here
  if (Native.isApp) return;   // native notifications handle the background in the Android app
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    const opts = { body, tag, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', vibrate: [80, 60, 80], data: { url: './index.html#' + (to || route || 'today') } };
    if (reg) reg.showNotification(title, opts); else new Notification(title, opts);
  } catch (e) { console.warn('notify', e); }
}
async function askNotifPermission() {
  if (Native.isApp) return Native.ensurePermission();
  if (!('Notification' in window)) { notify({ title: 'Notifications aren\'t supported here', body: 'Install Zelum to your home screen to enable them.', ic: 'info', tone: 'danger', system: false }); return false; }
  if (Notification.permission === 'granted') return true;
  const r = await Notification.requestPermission();
  if (r !== 'granted') notify({ title: 'Notifications are blocked', body: 'Allow them for Zelum in your browser or phone settings.', ic: 'info', tone: 'danger', system: false });
  return r === 'granted';
}
const notifState = () => Native.isApp ? 'granted' : !('Notification' in window) ? 'unsupported' : Notification.permission;

/* ---------- Live workout bar (v1.15.1) ----------
   One glass widget for the whole workout: elapsed time, workout name, the current exercise and set, and the
   rest timer (ring + countdown) — never a second bubble on top of it.
   • On Train it is the sticky header of the workout (with Finish); elsewhere it floats at the top (#island).
   • Workout: green tint (--success). Rest: the "Rest timer" color (Me → Appearance; follows the album when
     music colors are on and the user hasn't picked one). Rest over: a short green flash in the bar itself.
   • Tap: a glass panel slides out under the bar (transform + opacity only, so it stays smooth at 120 Hz).
   The HTML depends only on state that changes on events (sig); the clock and ring are written by tick(). */
let islandOpen = false, islandSig = '', restDoneAt = 0;
function nextSet() {
  const w = S.active; if (!w) return null;
  for (let ei = 0; ei < w.entries.length; ei++) {
    const e = w.entries[ei], i = e.sets.findIndex(s => !s.done);
    if (i >= 0) { const ex = getEx(e.ex); return { ei, name: ex ? entryName(e) : e.ex, n: i + 1, of: e.sets.length, t: e.sets[i].t, kg: e.sets[i].kg, kgTxt: kgLabel(ex, e.sets[i].kg), u: unitOf(ex), rest: e.rest }; }
  }
  return { done: true };
}
const mmss = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
const LB_C = 94.25;   // ring circumference (r = 15)
function liveClock() {
  const el = (Date.now() - S.active.start) / 1000;
  if (!rest) return { el, left: 0, frac: 0 };
  const left = Math.max(0, (rest.end - Date.now()) / 1000);
  return { el, left, frac: rest.total ? left / rest.total : 0 };
}
function setsProgress() {
  let done = 0, all = 0;
  for (const e of S.active.entries) { all += e.sets.length; done += e.sets.filter(s => s.done).length; }
  return all ? done / all : 0;
}
function liveBarHTML(where) {
  const w = S.active, ns = nextSet() || { done: true }, resting = !!rest, flash = !resting && Date.now() - restDoneAt < 4000;
  const c = liveClock(), head = where === 'head';
  if (!head && LbPos.mini()) return `<div class="lb lb-mini glass ${resting ? 'resting' : ''} ${flash ? 'flash' : ''}" data-act="islandToggle" role="button" aria-label="Workout in progress — tap for the full bar">
    <span class="lb-ring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="lb-track"/>
      <circle data-lb-ring cx="18" cy="18" r="15" class="lb-arc" stroke-dasharray="${LB_C}" style="stroke-dashoffset:${(LB_C * (1 - (resting ? c.frac : setsProgress()))).toFixed(2)}" transform="rotate(-90 18 18)"/></svg>
      ${resting ? `<b class="lb-count" data-lb-left>${mmss(Math.ceil(c.left))}</b>` : '<i class="lb-dot"></i>'}</span>
    <b class="lb-mtime">${resting ? 'Rest' : `<span data-lb-elapsed>${mmss(c.el)}</span>`}</b></div>`;
  const ring = resting ? c.frac : setsProgress();
  const target = ns.done ? '' : `${ns.t ?? ''}${ns.u || ' reps'}${ns.kg ? ` · ${ns.kgTxt}` : ''}`;
  const title = resting ? 'Rest' : flash ? 'Rest over — next set' : ns.done ? 'All sets done — finish when ready' : ns.name;
  const sub = ns.done ? w.name : resting ? `Next · ${ns.name} · Set ${ns.n}/${ns.of}` : `Set ${ns.n}/${ns.of}${target ? ` · ${target}` : ''}`;
  const cls = `lb glass ${resting ? 'resting' : ''} ${flash ? 'flash' : ''} ${islandOpen ? 'open' : ''}`;
  return `<div class="${cls}" data-act="islandToggle" role="button" aria-expanded="${islandOpen}" aria-label="Workout in progress">
    <div class="lb-row">
      <span class="lb-ring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="lb-track"/>
        <circle data-lb-ring cx="18" cy="18" r="15" class="lb-arc" stroke-dasharray="${LB_C}" style="stroke-dashoffset:${(LB_C * (1 - ring)).toFixed(2)}" transform="rotate(-90 18 18)"/></svg>
        ${resting ? `<b class="lb-count" data-lb-left>${mmss(Math.ceil(c.left))}</b>` : '<i class="lb-dot"></i>'}</span>
      <span class="lb-main"><span class="lb-eye"><b data-lb-elapsed>${mmss(c.el)}</b> · ${esc(w.name)}</span>
        <b class="lb-title">${esc(title)}</b><span class="lb-sub">${esc(sub)}</span></span>
      ${head ? '<button class="btn primary lb-finish" data-act="finish">Finish</button>' : ''}
    </div>
    <div class="lb-panel glass" aria-hidden="${!islandOpen}">
      ${target && !resting ? `<p class="lb-target">${icon('target', 'xs')} Target <b>${esc(target)}</b></p>` : ''}
      <div class="lb-ctrl">
        ${resting ? `<button class="chip-btn" data-act="restAdd" data-d="-15">−15 s</button><button class="chip-btn" data-act="restAdd" data-d="15">+15 s</button><button class="chip-btn on" data-act="restSkip">Skip</button>`
          : ns.done ? '' : `<button class="chip-btn on" data-act="islandSetDone">${icon('check', 'xs')} Set done</button>`}
        ${head ? (ns.done ? '' : `<button class="chip-btn" data-act="lbGoEx" data-e="${ns.ei}">${icon('down', 'xs')} Go to exercise</button>`)
          : `<button class="chip-btn" data-go="train">${icon('train', 'xs')} Open</button>`}
      </div>
    </div>
  </div>`;
}
function liveSig() {
  const ns = nextSet() || {};
  return [!!rest, rest && rest.total, islandOpen, LbPos.mini(), Date.now() - restDoneAt < 4000, ns.done ? 'done' : `${ns.name}|${ns.n}|${ns.of}|${ns.t}|${ns.kg}`, S.active.name, route].join('|');
}
/* Kept under its old name: tick(), the native bridge and the actions call it */
function renderIsland() {
  const box = document.getElementById('island'); if (!box) return;
  const on = S.onboarded && S.active;
  const head = on && route === 'train' ? document.querySelector('.live-head') : null;
  const float = on && !head && route !== 'train';
  if (!on) { if (box.className) { box.className = ''; box.innerHTML = ''; box.__html = ''; closeLbMenu(); } islandSig = ''; return; }
  const sig = liveSig();
  if (sig !== islandSig) {
    islandSig = sig;
    if (head) morphHTML(head, liveBarHTML('head'));
    if (float) { box.classList.add('on'); morphHTML(box, liveBarHTML('island')); requestAnimationFrame(() => LbPos.apply(box)); }
  }
  if (!float && box.className) { box.className = ''; closeLbMenu(); }
  // Clock and ring, every tick, in whichever bar is showing
  const c = liveClock();
  document.querySelectorAll('[data-lb-elapsed]').forEach(n => setText(n, mmss(c.el)));
  if (rest) {
    document.querySelectorAll('[data-lb-left]').forEach(n => setText(n, mmss(Math.ceil(c.left))));
    document.querySelectorAll('[data-lb-ring]').forEach(n => { n.style.strokeDashoffset = (LB_C * (1 - c.frac)).toFixed(2); });
  }
}
function restFinished() {
  const ns = nextSet();
  SFX.play('rest'); haptic([200, 100, 200]);
  if (document.hidden) {   // only the system notification needs words; on screen the bar itself says it
    const body = ns && !ns.done ? `Set ${ns.n} of ${ns.name}${ns.t ? ` · ${ns.t}${ns.u}` : ''}` : 'Finish strong.';
    notify({ title: 'Rest over — next set', body, ic: 'bolt', tone: 'accent', sound: '', go: 'train', tag: 'rest' });
  } else { restDoneAt = Date.now(); setTimeout(() => { islandSig = ''; renderIsland(); }, 4050); }
}

/* ---------- Moving and shrinking the floating bar (v1.15.2) ----------
   The floating bar (other tabs) must never hide what's under it, like the palette button or the Settings gear.
   • Hold it 0.35 s: it lifts (haptic). Drag it anywhere and let go; it stays there.
   • Hold and let go without moving: a small glass menu — Shrink / Full size, Top, Middle, Bottom.
   • Shrunk, it is a pill with the ring and the time; tap it to bring the full bar back.
   Saved per device as fractions of the free space, so it lands in the same spot after rotating or resizing.
   While dragging only #island's transform changes (no layout); the drop eases in with a spring.
   The Train header stays where it is: it's part of the workout page, not floating over another one. */
const LbPos = {
  KEY: 'ledger.lbPos',
  s: (() => { try { return JSON.parse(localStorage.getItem('ledger.lbPos')) || {}; } catch (e) { return {}; } })(),   // { x, y: 0..1, mini }
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.s)); } catch (e) { } },
  mini() { return !!this.s.mini; },
  // Free space for #island's translate: from where CSS puts it (top, left) to above the tab bar / right edge
  room(box) {
    const nav = document.getElementById('nav'), nr = nav && nav.getBoundingClientRect();
    const bottom = nr && nr.height && nr.top > innerHeight / 2 ? nr.top : innerHeight;
    return { x: Math.max(0, innerWidth - 12 - box.offsetLeft - box.offsetWidth), y: Math.max(0, bottom - 10 - box.offsetTop - box.offsetHeight) };
  },
  px(box) { const r = this.room(box); return { x: this.mini() ? (this.s.x ?? 0.5) * r.x : 0, y: (this.s.y ?? 0) * r.y, r }; },
  apply(box) {
    if (!box || !box.classList.contains('on')) return;
    const p = this.px(box);
    box.style.setProperty('--ix', `${p.x.toFixed(1)}px`); box.style.setProperty('--iy', `${p.y.toFixed(1)}px`);
    box.classList.toggle('up', (this.s.y ?? 0) > 0.5);              // the panel opens upward near the bottom
    box.classList.toggle('at-top', p.y < 40);                        // banners make room only when it's at the top
  },
  set(patch) { Object.assign(this.s, patch); this.save(); islandSig = ''; renderIsland(); },
};
(() => {
  const box = document.getElementById('island'); if (!box) return;
  let t = 0, sx = 0, sy = 0, base = null, lifted = false, moved = false, eat = false, pid = null;
  const cancel = () => { clearTimeout(t); t = 0; };
  box.addEventListener('pointerdown', e => {
    if (!box.classList.contains('on') || e.button > 0 || e.target.closest('button, .lb-panel')) return;
    closeLbMenu();
    sx = e.clientX; sy = e.clientY; moved = false; pid = e.pointerId;
    t = setTimeout(() => {   // long-press: lift
      t = 0; lifted = true; base = LbPos.px(box);
      try { box.setPointerCapture(pid); } catch (er) { }
      box.classList.add('lifted'); haptic(14); SFX.play('tap');
      if (islandOpen) { islandOpen = false; islandSig = ''; renderIsland(); }
    }, 350);
  });
  box.addEventListener('pointermove', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!lifted) { if (t && Math.hypot(dx, dy) > 8) cancel(); return; }
    if (Math.hypot(dx, dy) > 6) moved = true;
    const r = base.r, x = LbPos.mini() ? Math.min(r.x, Math.max(0, base.x + dx)) : 0, y = Math.min(r.y, Math.max(0, base.y + dy));
    box.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    box.__drop = { x, y, r };
  });
  const end = () => {
    cancel();
    if (!lifted) return;
    lifted = false; eat = true; box.classList.remove('lifted');
    const d = box.__drop; box.__drop = null;
    // Park it where the finger left it (same values as the inline transform, so nothing jumps), then save
    if (moved && d) { box.style.setProperty('--ix', `${d.x}px`); box.style.setProperty('--iy', `${d.y}px`); }
    box.style.transform = '';
    if (moved && d) { haptic(8); LbPos.set({ y: d.r.y ? d.y / d.r.y : 0, x: d.r.x ? d.x / d.r.x : 0.5 }); }
    else openLbMenu();
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  box.addEventListener('contextmenu', e => e.preventDefault());   // no Android text/long-press menu
  // The click that follows a long-press must not also toggle the bar
  box.addEventListener('click', e => { if (eat) { eat = false; e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener('resize', () => LbPos.apply(box), { passive: true });
})();
function openLbMenu() {
  const box = document.getElementById('island'), bar = box && box.querySelector('.lb'); if (!bar) return;
  let m = document.getElementById('lbmenu');
  if (!m) { m = document.createElement('div'); m.id = 'lbmenu'; m.setAttribute('role', 'menu'); document.body.appendChild(m); }
  const y = LbPos.s.y ?? 0, mini = LbPos.mini();
  const item = (act, ic, label, on = false, extra = '') => `<button class="lbm-i ${on ? 'on' : ''}" role="menuitem" data-act="${act}" ${extra}>${icon(ic, 'sm')}<span>${label}</span></button>`;
  m.innerHTML = `<div class="lbm glass">
    ${item('lbMini', mini ? 'plus' : 'minus', mini ? 'Full size' : 'Shrink')}
    <div class="lbm-sep"></div>
    ${item('lbPlace', 'up', 'Top', y < 0.15, 'data-y="0"')}
    ${item('lbPlace', 'target', 'Middle', y >= 0.15 && y <= 0.85, 'data-y="0.5"')}
    ${item('lbPlace', 'down', 'Bottom', y > 0.85, 'data-y="1"')}
    <p class="lbm-hint">Hold and drag it anywhere</p></div>`;
  // Next to the bar: below it in the top half, above it in the bottom half
  const r = bar.getBoundingClientRect(), mw = 230, below = r.top + r.height / 2 < innerHeight / 2;
  const left = Math.min(innerWidth - mw - 10, Math.max(10, r.left + r.width / 2 - mw / 2));
  m.style.left = `${left}px`; m.style.width = `${mw}px`;
  m.style.top = below ? `${r.bottom + 10}px` : ''; m.style.bottom = below ? '' : `${innerHeight - r.top + 10}px`;
  m.className = below ? 'from-top' : 'from-bottom';
  requestAnimationFrame(() => m.classList.add('on'));
  setTimeout(() => document.addEventListener('pointerdown', lbMenuOutside, true), 0);
}
function lbMenuOutside(e) { if (!e.target.closest('#lbmenu')) closeLbMenu(); }
function closeLbMenu() {
  document.removeEventListener('pointerdown', lbMenuOutside, true);
  const m = document.getElementById('lbmenu'); if (!m || !m.classList.contains('on')) return;
  m.classList.remove('on'); setTimeout(() => { if (!m.classList.contains('on')) m.innerHTML = ''; }, 300);
}

/* ---------- Reminders ---------- */
const NOTIF_DEFAULTS = { enabled: false, workout: { on: true, time: '17:00' }, water: { on: true, every: 2, from: '08:00', to: '20:00' }, verse: { on: true, time: '07:00' }, habits: true };
const toMin = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
// toLocaleTimeString is slow (~0.2 ms a call) and the Me screen re-renders often: remember each answer.
const fmtHMMemo = new Map();
const fmtHM = hm => { let s = fmtHMMemo.get(hm); if (s === undefined) { const [h, m] = hm.split(':').map(Number); s = new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' }); fmtHMMemo.set(hm, s); } return s; };
function todaysReminders() { return remindersFor(today()); }
/* Reminders for any day (future days assume nothing is done yet; the app reschedules after every change) */
function remindersFor(k) {
  const n = S.settings.notif, out = [], isToday = k === today();
  if (!n || !n.enabled) return out;
  if (faithOn() && n.verse.on && !S.claimed[`done:m:${k}:faith`]) {
    const v = verseOfDay(k); out.push({ key: 'verse', at: toMin(n.verse.time), title: `Verse of the day · ${v.ref}`, body: v.text.length > 110 ? v.text.slice(0, 108) + '…' : v.text, ic: 'cross', tone: 'faith', to: 'today' });
  }
  if (n.workout.on && isTrainingDay(k) && !workoutsOn(k).length && !(isToday && S.active)) {
    const T = tplInfo(nextTemplate());
    out.push({ key: 'workout', at: toMin(n.workout.time), title: `Time to train · ${T.name}`, body: `${T.desc}. Your targets are ready — beat last time.`, ic: 'bolt', tone: 'accent', to: 'train' });
  }
  if (n.water.on) {
    const t = targets(k), from = toMin(n.water.from), to = toMin(n.water.to), step = Math.max(30, n.water.every * 60);
    for (let m = from + step; m <= to; m += step) {
      const due = t.water * (m - from) / Math.max(1, to - from), have = dayTotals(k).water;
      if (!isToday || have < due * 0.85) out.push({ key: `water${m}`, at: m, title: 'Time for water', body: `${fmtL(have)} of ${fmtL(t.water)} so far. One glass now keeps you on track.`, ic: 'drop', tone: 'water', to: 'habits' });
    }
  }
  if (n.habits) for (const h of activeHabits()) {
    if (!h.remind || !isDue(h, k) || h.type === 'quit' || habitDone(h, k)) continue;
    const st = habitStreak(h);
    out.push({ key: `h:${h.id}`, at: toMin(h.remind), title: h.name, body: st ? `Keep your ${st}-${streakUnit(h)} streak alive.` : (h.why || 'A small step today.'), ic: h.icon || 'check', tone: habitColor(h), to: 'habits' });
  }
  return out;
}
function firedToday() { try { const f = JSON.parse(localStorage.getItem('ledger.fired') || '{}'); return f.day === today() ? f : { day: today(), keys: [] }; } catch (e) { return { day: today(), keys: [] }; } }
let lastReminderCheck = 0;
function checkReminders(force) {
  if (Native.isApp || !S.onboarded || (!force && Date.now() - lastReminderCheck < 15000)) return;   // the Android app schedules real notifications instead
  lastReminderCheck = Date.now();
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), f = firedToday();
  for (const r of todaysReminders()) {
    if (f.keys.includes(r.key) || nowMin < r.at || nowMin - r.at > 20) continue;   // only within 20 min of its time
    f.keys.push(r.key);
    notify({ title: r.title, body: r.body, ic: r.ic, tone: r.tone, go: r.to, tag: r.key });
  }
  try { localStorage.setItem('ledger.fired', JSON.stringify(f)); } catch (e) { }
}
document.addEventListener('visibilitychange', () => checkReminders(true));

/* Settings card (Me) */
function notifCardHTML() {
  const n = S.settings.notif, perm = notifState();
  const row = (label, sub, k, on, extra = '') => `<div class="nrow"><div class="grow"><b class="small">${label}</b><span class="tiny muted">${sub}</span></div>${extra}<button class="switch ${on ? 'on' : ''}" data-act="notifToggle" data-k="${k}" role="switch" aria-checked="${on}" aria-label="${label}"><i></i></button></div>`;
  const habitsWithTimes = activeHabits().filter(h => h.remind && h.type !== 'quit');
  return `<div class="row between center"><div><b>Notifications</b><p class="tiny muted">${perm === 'granted' ? 'Allowed on this device' : perm === 'denied' ? 'Blocked — allow Zelum in your browser/phone settings' : perm === 'unsupported' ? 'Install Zelum to your home screen to use them' : 'Not allowed yet'}</p></div>
      <button class="switch ${n.enabled ? 'on' : ''}" data-act="notifToggle" data-k="enabled" role="switch" aria-checked="${n.enabled}" aria-label="Notifications"><i></i></button></div>
    ${n.enabled ? `<div class="nlist mt">
      ${row('Workout reminder', 'On training days, if you haven\'t trained yet', 'workout', n.workout.on, `<input class="inp time" type="time" value="${n.workout.time}" data-change="notifTime" data-k="workout">`)}
      ${row('Water', `Every ${n.water.every} h between ${fmtHM(n.water.from)} and ${fmtHM(n.water.to)}, only if you're behind`, 'water', n.water.on, `<select class="inp time" data-change="notifEvery">${[1, 1.5, 2, 3].map(h => `<option value="${h}" ${n.water.every == h ? 'selected' : ''}>${h} h</option>`).join('')}</select>`)}
      ${!faithOn() ? '' : row('Verse of the day', 'Morning Scripture', 'verse', n.verse.on, `<input class="inp time" type="time" value="${n.verse.time}" data-change="notifTime" data-k="verse">`)}
      ${row('Habit reminders', habitsWithTimes.length ? habitsWithTimes.map(h => `${esc(h.name)} ${fmtHM(h.remind)}`).join(' · ') : 'Set a time on any habit (edit habit → Reminder)', 'habits', n.habits)}
      ${Native.isApp && (Native.exact === 'granted' || Native.exact === 'denied') ? `<div class="nrow"><div class="grow"><b class="small">Exact times</b><span class="tiny muted">${Native.exact === 'granted' ? 'Reminders arrive at the exact minute' : 'Off: Android may hold reminders a few minutes to save battery. Turn on in Alarms &amp; reminders'}</span></div><button class="switch ${Native.exact === 'granted' ? 'on' : ''}" data-act="notifExact" role="switch" aria-checked="${Native.exact === 'granted'}" aria-label="Exact times"><i></i></button></div>` : ''}
    </div>` : ''}
    <div class="row gap mt"><button class="btn soft grow" data-act="notifTest">${icon('bell', 'sm')} Send a test</button></div>
    <p class="tiny muted mt-s">${Native.isApp ? 'Reminders are scheduled on your phone and arrive even when Zelum is closed. During workouts a live notification shows your timer and next set.' : 'While Zelum is open you\'ll see glass banners. When it\'s in the background your phone shows them as normal notifications. Exact reminders while Zelum is fully closed come with the Android app.'}</p>`;
}

const NOTIF_ACT = {
  islandToggle: (d, el, e) => { if (e && e.target.closest('button')) return; if (LbPos.mini() && el.closest('#island')) { LbPos.set({ mini: false }); SFX.play('tap'); return; } islandOpen = !islandOpen; islandSig = ''; SFX.play('tap'); renderIsland(); },
  lbMini: () => { closeLbMenu(); haptic(8); LbPos.set({ mini: !LbPos.mini() }); },
  lbPlace: d => { closeLbMenu(); haptic(8); LbPos.set({ y: +d.y }); },
  lbGoEx: d => { islandOpen = false; islandSig = ''; renderIsland(); const el = document.getElementById(`ex-${d.e}`); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); },
  islandSetDone: () => {
    const w = S.active; if (!w) return;
    for (let ei = 0; ei < w.entries.length; ei++) { const si = w.entries[ei].sets.findIndex(s => !s.done); if (si >= 0) { ACT.setDone({ e: ei, s: si }); break; } }
    islandSig = ''; renderIsland();
  },
  notifToggle: async d => {
    const n = S.settings.notif;
    if (d.k === 'enabled') { if (!n.enabled) { await askNotifPermission(); n.enabled = true; } else n.enabled = false; }
    else if (d.k === 'habits') n.habits = !n.habits;
    else n[d.k].on = !n[d.k].on;
    save(); render(); SFX.play('tap');
  },
  notifExact: () => { SFX.play('tap'); return Native.allowExact(); },
  notifTest: async () => {
    if (Native.isApp) return Native.testNotification();
    await askNotifPermission();
    notify({ title: 'Zelum notifications are on', body: 'This is how reminders, rest timers and milestones will look.', ic: 'bell', tone: 'accent', system: false, sound: 'check' });
    setTimeout(() => sysNotify('Zelum · test', 'And this is a system notification, for when Zelum is in the background.', 'test', 'today'), 1200);
  },
};
const NOTIF_CHG = {
  notifTime: el => { S.settings.notif[el.dataset.k].time = el.value; save(); },
  notifEvery: el => { S.settings.notif.water.every = +el.value; save(); render(); },
};
