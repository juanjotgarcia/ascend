/* LEDGER — notifications.
   • Banners: iOS-style liquid-glass notifications that drop from the top (swipe up to dismiss, tap to open).
   • Live Activity: a floating "island" during workouts — elapsed time, next set, rest ring; tap to expand.
   • Reminders: habits (each can have a time), workout, water and the daily verse.
     Shown as banners while Ledger is open, and as system notifications while it's in the background.
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
    <span class="bn-body"><span class="bn-top"><b>LEDGER</b><span>now</span></span><b class="bn-title">${esc(title)}</b>${body ? `<span class="bn-text">${esc(body)}</span>` : ''}</span>`;
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
  if (!('Notification' in window)) { notify({ title: 'Notifications aren\'t supported here', body: 'Install Ledger to your home screen to enable them.', ic: 'info', tone: 'danger', system: false }); return false; }
  if (Notification.permission === 'granted') return true;
  const r = await Notification.requestPermission();
  if (r !== 'granted') notify({ title: 'Notifications are blocked', body: 'Allow them for Ledger in your browser or phone settings.', ic: 'info', tone: 'danger', system: false });
  return r === 'granted';
}
const notifState = () => Native.isApp ? 'granted' : !('Notification' in window) ? 'unsupported' : Notification.permission;

/* ---------- Live Activity (workout island) ---------- */
let islandOpen = false, islandSig = '';
function nextSet() {
  const w = S.active; if (!w) return null;
  for (const e of w.entries) {
    const i = e.sets.findIndex(s => !s.done);
    if (i >= 0) { const ex = getEx(e.ex); return { name: ex ? entryName(e) : e.ex, n: i + 1, of: e.sets.length, t: e.sets[i].t, kg: e.sets[i].kg, kgTxt: kgLabel(ex, e.sets[i].kg), u: unitOf(ex), rest: e.rest }; }
  }
  return { done: true };
}
function renderIsland() {
  const box = document.getElementById('island'); if (!box) return;
  const show = S.onboarded && S.active && (route !== 'train' || rest);
  if (!show) { box.className = ''; box.innerHTML = ''; islandSig = ''; return; }
  const ns = nextSet(), resting = !!rest;
  const sig = `${resting}|${islandOpen}|${ns && (ns.done ? 'done' : ns.name + ns.n)}|${S.active.name}`;
  if (sig !== islandSig) {
    islandSig = sig;
    const sub = ns.done ? 'All sets done — finish when ready' : `${resting ? 'Next · ' : ''}Set ${ns.n}/${ns.of} · ${ns.name}`;
    const target = ns.done ? '' : `${ns.t ?? ''}${ns.u}${ns.kg ? ` · ${ns.kgTxt}` : ''}`;
    box.className = `on ${resting ? 'resting' : ''} ${islandOpen ? 'open' : ''}`;
    box.innerHTML = `<div class="isl glass" data-act="islandToggle" role="button" aria-label="Workout in progress">
      <span class="isl-dot"></span>
      <span class="isl-main"><b>${esc(resting ? 'Rest' : S.active.name)}</b><span>${esc(sub)}</span></span>
      <span class="isl-right">${resting ? `<svg class="isl-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,.15)" stroke-width="3.2" fill="none"/><circle data-isl-ring cx="18" cy="18" r="15" stroke="var(--accent)" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-dasharray="94.25" transform="rotate(-90 18 18)"/></svg>` : ''}<b class="isl-time" data-isl-time></b></span>
      ${islandOpen ? `<div class="isl-x">
        ${target ? `<p class="isl-target">${icon('target', 'xs')} Target <b>${esc(target)}</b></p>` : ''}
        <div class="isl-ctrl">
          ${resting ? `<button class="chip-btn" data-act="restAdd" data-d="-15">−15s</button><button class="chip-btn" data-act="restAdd" data-d="15">+15s</button><button class="chip-btn" data-act="restSkip">Skip</button>`
            : `<button class="chip-btn" data-act="islandSetDone">${icon('check', 'xs')} Set done</button>`}
          <button class="chip-btn on" data-go="train">${icon('train', 'xs')} Open</button>
        </div></div>` : ''}
    </div>`;
  }
  const t = box.querySelector('[data-isl-time]');
  if (resting) {
    const left = Math.max(0, (rest.end - Date.now()) / 1000);
    setText(t, `${Math.floor(Math.ceil(left) / 60)}:${pad(Math.ceil(left) % 60)}`);
    const ring = box.querySelector('[data-isl-ring]'); if (ring) ring.style.strokeDashoffset = String(94.25 * (1 - left / rest.total));
  } else {
    const el = (Date.now() - S.active.start) / 1000;
    setText(t, `${Math.floor(el / 60)}:${pad(Math.floor(el % 60))}`);
  }
}
function restFinished() {
  const ns = nextSet();
  const body = ns && !ns.done ? `Set ${ns.n} of ${ns.name}${ns.t ? ` · ${ns.t}${ns.u}` : ''}` : 'Finish strong.';
  SFX.play('rest'); haptic([200, 100, 200]);
  notify({ title: 'Rest over — next set', body, ic: 'bolt', tone: 'accent', sound: '', go: 'train', tag: 'rest' });
}

/* ---------- Reminders ---------- */
const NOTIF_DEFAULTS = { enabled: false, workout: { on: true, time: '17:00' }, water: { on: true, every: 2, from: '08:00', to: '20:00' }, verse: { on: true, time: '07:00' }, habits: true };
const toMin = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fmtHM = hm => { const [h, m] = hm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
function todaysReminders() { return remindersFor(today()); }
/* Reminders for any day (future days assume nothing is done yet; the app reschedules after every change) */
function remindersFor(k) {
  const n = S.settings.notif, out = [], isToday = k === today();
  if (!n || !n.enabled) return out;
  if (n.verse.on && !S.claimed[`done:m:${k}:faith`]) {
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
  return `<div class="row between center"><div><b>Notifications</b><p class="tiny muted">${perm === 'granted' ? 'Allowed on this device' : perm === 'denied' ? 'Blocked — allow Ledger in your browser/phone settings' : perm === 'unsupported' ? 'Install Ledger to your home screen to use them' : 'Not allowed yet'}</p></div>
      <button class="switch ${n.enabled ? 'on' : ''}" data-act="notifToggle" data-k="enabled" role="switch" aria-checked="${n.enabled}" aria-label="Notifications"><i></i></button></div>
    ${n.enabled ? `<div class="nlist mt">
      ${row('Workout reminder', 'On training days, if you haven\'t trained yet', 'workout', n.workout.on, `<input class="inp time" type="time" value="${n.workout.time}" data-change="notifTime" data-k="workout">`)}
      ${row('Water', `Every ${n.water.every} h between ${fmtHM(n.water.from)} and ${fmtHM(n.water.to)}, only if you're behind`, 'water', n.water.on, `<select class="inp time" data-change="notifEvery">${[1, 1.5, 2, 3].map(h => `<option value="${h}" ${n.water.every == h ? 'selected' : ''}>${h} h</option>`).join('')}</select>`)}
      ${row('Verse of the day', 'Morning Scripture', 'verse', n.verse.on, `<input class="inp time" type="time" value="${n.verse.time}" data-change="notifTime" data-k="verse">`)}
      ${row('Habit reminders', habitsWithTimes.length ? habitsWithTimes.map(h => `${esc(h.name)} ${fmtHM(h.remind)}`).join(' · ') : 'Set a time on any habit (edit habit → Reminder)', 'habits', n.habits)}
    </div>` : ''}
    <div class="row gap mt"><button class="btn soft grow" data-act="notifTest">${icon('bell', 'sm')} Send a test</button></div>
    <p class="tiny muted mt-s">${Native.isApp ? 'Reminders are scheduled on your phone and arrive on time, even when Ledger is closed. During workouts a live notification shows your timer and next set.' : 'While Ledger is open you\'ll see glass banners. When it\'s in the background your phone shows them as normal notifications. Exact reminders while Ledger is fully closed come with the Android app.'}</p>`;
}

const NOTIF_ACT = {
  islandToggle: (d, el, e) => { if (e && e.target.closest('button')) return; islandOpen = !islandOpen; islandSig = ''; SFX.play('tap'); renderIsland(); },
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
  notifTest: async () => {
    if (Native.isApp) return Native.testNotification();
    await askNotifPermission();
    notify({ title: 'Ledger notifications are on', body: 'This is how reminders, rest timers and milestones will look.', ic: 'bell', tone: 'accent', system: false, sound: 'check' });
    setTimeout(() => sysNotify('Ledger · test', 'And this is a system notification, for when Ledger is in the background.', 'test', 'today'), 1200);
  },
};
const NOTIF_CHG = {
  notifTime: el => { S.settings.notif[el.dataset.k].time = el.value; save(); },
  notifEvery: el => { S.settings.notif.water.every = +el.value; save(); render(); },
};
