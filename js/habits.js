/* LEDGER — advanced habits.
   Three kinds:  check (yes/no) · count (an amount: glasses, pages, minutes…) · quit (break a bad habit).
   Schedules: every day, chosen weekdays, or N times per week. Time of day groups the list.
   Streaks respect schedules; quit habits track clean time live, with milestones, urges and slips. */

const HABIT_KINDS = {
  check: { name: 'Do it', sub: 'Yes / no each day', icon: 'check' },
  count: { name: 'Amount', sub: 'Count glasses, pages, minutes…', icon: 'plus' },
  quit:  { name: 'Break free', sub: 'Stop a bad habit, track clean time', icon: 'ban' },
};
const TODS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', any: 'Anytime' };
const DOW1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const QUIT_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];
const MILESTONE_XP = { 1: 10, 3: 25, 7: 60, 14: 100, 30: 200, 60: 300, 90: 450, 180: 700, 365: 1200 };
const SLIP_TRIGGERS = ['Stress', 'Boredom', 'Tired', 'Alone', 'With others', 'Phone', 'Other'];
const HABIT_ICONS = ['check', 'cross', 'book', 'heart', 'moon', 'sun', 'leaf', 'drop', 'bolt', 'flame', 'star', 'shield', 'timer', 'target', 'mountain', 'train', 'fuel', 'edit', 'phone', 'ban', 'chat', 'trophy'];
const HABIT_SWATCHES = ['var(--accent)', 'var(--faith)', 'var(--water)', 'var(--success)', 'var(--xp)', 'var(--streak)', 'var(--protein)', 'var(--danger)', '#ac8e68', '#8e8e93'];
const HABIT_TEMPLATES = [
  { name: 'Read the Bible', type: 'count', target: 10, unit: 'min', step: 5, icon: 'book', cat: 'faith', tod: 'morning' },
  { name: 'Pray', type: 'check', icon: 'cross', cat: 'faith', tod: 'morning' },
  { name: 'Push-ups through the day', type: 'count', target: 100, unit: 'reps', step: 10, icon: 'bolt', cat: 'body', tod: 'any' },
  { name: 'Walk', type: 'count', target: 8000, unit: 'steps', step: 1000, icon: 'mountain', cat: 'body', tod: 'any' },
  { name: 'Read a book', type: 'count', target: 20, unit: 'pages', step: 5, icon: 'book', cat: 'mind', tod: 'evening' },
  { name: 'Cold shower', type: 'check', icon: 'drop', cat: 'body', tod: 'morning' },
  { name: 'Journal', type: 'check', icon: 'edit', cat: 'mind', tod: 'evening' },
  { name: 'In bed by 10:30 pm', type: 'check', icon: 'moon', cat: 'body', tod: 'evening' },
  { name: 'No social media before noon', type: 'quit', icon: 'phone', cat: 'mind' },
  { name: 'No sugar & sweets', type: 'quit', icon: 'ban', cat: 'fuel' },
  { name: 'No soda', type: 'quit', icon: 'ban', cat: 'fuel' },
  { name: 'Quit smoking / vaping', type: 'quit', icon: 'flame', cat: 'body' },
  { name: 'Purity (no pornography)', type: 'quit', icon: 'shield', cat: 'faith' },
  { name: 'No phone in bed', type: 'quit', icon: 'moon', cat: 'mind' },
];

let habitDay = today(), habitTod = 'all', habitMonth = today().slice(0, 7), habitDraft = null;

/* ---------- Model ---------- */
function normHabit(h) {
  if (!h.type) h.type = (h.auto === 'water' || h.auto === 'protein') ? 'count' : 'check';
  if (!h.sched) h.sched = { kind: 'daily', days: [0, 1, 2, 3, 4, 5, 6], times: 3 };
  if (!h.tod) h.tod = ({ pray: 'morning', word: 'morning', sleep: 'morning', stretch: 'evening', grateful: 'evening' })[h.id] || 'any';
  if (!h.cat) h.cat = 'body';
  if (!h.created) h.created = (typeof S !== 'undefined' && S && S.created) || today();
  if (h.type === 'count' && !h.auto) { h.target = h.target || 1; h.unit = h.unit || 'times'; h.step = h.step || 1; }
  if (h.type === 'quit') { h.quitStart = h.quitStart || Date.now(); h.slips = h.slips || []; h.urges = h.urges || {}; }
  return h;
}
const habitColor = h => h.color || (HABIT_CATS[h.cat] || {}).color || 'var(--accent)';
const activeHabits = () => S.habits.filter(h => !h.archived);
const fmtV = v => (Math.round(v * 10) / 10).toLocaleString('en-US');
const dayOf = t => dayKey(new Date(t));

function isDue(h, k = today()) {
  if (h.archived) return false;
  if (h.type === 'quit') return k >= dayOf(h.quitStart);
  if (k < (h.created || '0')) return false;
  return h.sched.kind === 'days' ? h.sched.days.includes(parseDay(k).getDay()) : true;
}
function habitTarget(h, k = today()) {
  if (h.auto === 'water') return Math.max(1, Math.round(targets(k).water / S.settings.glassMl));
  if (h.auto === 'protein') return targets(k).protein;
  if (h.type === 'count') return h.target || 1;
  return 1;
}
function habitValue(h, k = today()) {
  if (h.auto === 'water') return dayTotals(k).water / S.settings.glassMl;
  if (h.auto === 'protein') return dayTotals(k).p;
  if (h.auto === 'train') return workoutsOn(k).length > 0 || S.skillLog.some(l => l.date === k) ? 1 : 0;
  if (h.type === 'quit') return quitCleanOn(h, k) ? 1 : 0;
  if (h.type === 'count') return (S.habitVals[k] || {})[h.id] || 0;
  return (S.habitLog[k] || []).includes(h.id) ? 1 : 0;
}
function habitDone(h, k = today()) {
  if (h.auto === 'water') return dayTotals(k).water >= targets(k).water;
  return habitValue(h, k) >= habitTarget(h, k);
}
const quitRunStart = h => Math.max(h.quitStart, ...h.slips.map(s => s.t));
function quitCleanOn(h, k) { return k >= dayOf(h.quitStart) && !h.slips.some(s => dayOf(s.t) === k); }
function weekCount(h, wk) {
  let n = 0;
  for (let i = 0; i < 7; i++) { const k = addDays(wk, i); if (k <= today() && k >= (h.created || '0') && habitDone(h, k)) n++; }
  return n;
}

/* ---------- Streaks & stats ---------- */
function habitStreak(h) {
  if (h.type === 'quit') return Math.floor((Date.now() - quitRunStart(h)) / 86400000);
  if (h.sched.kind === 'weekly') {
    let wk = weekKey(), n = 0;
    if (weekCount(h, wk) < h.sched.times) wk = addDays(wk, -7);
    while (n < 520 && wk >= weekKey(h.created) && weekCount(h, wk) >= h.sched.times) { n++; wk = addDays(wk, -7); }
    return n;
  }
  let k = today(), n = 0, g = 0;
  if (isDue(h, k) && !habitDone(h, k)) k = addDays(k, -1);
  while (g++ < 3700 && k >= h.created) { if (isDue(h, k)) { if (!habitDone(h, k)) break; n++; } k = addDays(k, -1); }
  return n;
}
const streakUnit = h => h.sched.kind === 'weekly' && h.type !== 'quit' ? 'week' : 'day';
function habitStats(h) {
  const t = today(), k30 = addDays(t, -29), k7 = addDays(t, -6);
  if (h.type === 'quit') {
    const pts = [h.quitStart, ...h.slips.map(s => s.t).sort((a, b) => a - b), Date.now()];
    let best = 0; for (let i = 1; i < pts.length; i++) best = Math.max(best, pts[i] - pts[i - 1]);
    let clean = 0, k = dayOf(h.quitStart), g = 0;
    while (k <= t && g++ < 3700) { if (quitCleanOn(h, k)) clean++; k = addDays(k, 1); }
    return { current: habitStreak(h), best: Math.floor(best / 86400000), total: clean, slips: h.slips.length, urges: Object.values(h.urges).reduce((a, b) => a + b, 0) };
  }
  let k = h.created < t ? h.created : t, run = 0, best = 0, total = 0, due30 = 0, done30 = 0, sum = 0, sum7 = 0, g = 0;
  while (k <= t && g++ < 3700) {
    if (isDue(h, k)) {
      const d = habitDone(h, k);
      if (d) { run++; total++; best = Math.max(best, run); } else if (k !== t) run = 0;
      if (k >= k30 && (k !== t || d)) { due30++; if (d) done30++; }
    }
    if (h.type === 'count') { const v = habitValue(h, k); sum += v; if (k >= k7) sum7 += v; }
    k = addDays(k, 1);
  }
  return { current: habitStreak(h), best: Math.max(best, habitStreak(h)), total, rate: due30 ? done30 / due30 : 0, sum, avg7: sum7 / 7 };
}
function habitsDue(k = today()) { return activeHabits().filter(h => isDue(h, k)); }
function buildDue(k = today()) { return habitsDue(k).filter(h => h.type !== 'quit'); }
function habitsDoneCount(k = today()) { return habitsDue(k).filter(h => habitDone(h, k)).length; }
function dayCompletion(k) { const d = buildDue(k); return d.length ? d.filter(h => habitDone(h, k)).length / d.length : 0; }
function activeDay(k) { return workoutsOn(k).length > 0 || buildDue(k).some(h => habitDone(h, k)); }
function streak() {
  let k = today(), n = 0;
  if (!activeDay(k)) k = addDays(k, -1);
  while (activeDay(k) && n < 3650) { n++; k = addDays(k, -1); }
  return n;
}
function perfectStreak() {
  let k = today(), n = 0;
  if (dayCompletion(k) < 1) k = addDays(k, -1);
  while (n < 3650 && buildDue(k).length && dayCompletion(k) >= 1) { n++; k = addDays(k, -1); }
  return n;
}
function consistency30() {
  let due = 0, done = 0;
  for (let i = 0; i < 30; i++) { const k = addDays(today(), -i), d = buildDue(k); if (k < S.created) break; if (i === 0) { done += d.filter(h => habitDone(h, k)).length; due += d.filter(h => habitDone(h, k)).length; continue; } due += d.length; done += d.filter(h => habitDone(h, k)).length; }
  return due ? done / due : 0;
}

/* XP for amounts, perfect days and clean-time milestones (idempotent: keys are unique) */
function syncDailyXP(k = today()) {
  const t = targets(k), d = dayTotals(k);
  if (d.water >= t.water) addXP(`water:${k}`, 20, 'Water goal reached'); else removeXP(`water:${k}`);
  if (d.p >= t.protein) addXP(`protein:${k}`, 20, 'Protein goal reached'); else removeXP(`protein:${k}`);
  for (const h of activeHabits()) {
    if (h.type === 'count' && !h.auto) { if (isDue(h, k) && habitDone(h, k)) addXP(`habit:${k}:${h.id}`, 10, h.name); else removeXP(`habit:${k}:${h.id}`); }
    if (h.type === 'quit' && k === today()) {
      const days = habitStreak(h), run = quitRunStart(h);
      for (const m of QUIT_MILESTONES) if (days >= m) addXP(`quit:${h.id}:${run}:${m}`, MILESTONE_XP[m], `${m} day${m > 1 ? 's' : ''} free · ${h.name}`);
    }
  }
  const due = buildDue(k);
  if (due.length && due.every(h => habitDone(h, k))) addXP(`allhabits:${k}`, 30, 'Perfect day — all habits done'); else removeXP(`allhabits:${k}`);
}

/* ---------- Actions on data ---------- */
function toggleHabit(id, forceOn, k = today()) {
  const h = S.habits.find(x => x.id === id); if (!h || h.type !== 'check' || h.auto) return;
  const list = S.habitLog[k] = S.habitLog[k] || [], on = list.includes(id);
  if (on && !forceOn) { list.splice(list.indexOf(id), 1); removeXP(`habit:${k}:${id}`); }
  else if (!on) { list.push(id); addXP(`habit:${k}:${id}`, 10, h.name); }
}
function setHabitValue(h, v, k = habitDay) {
  const day = S.habitVals[k] = S.habitVals[k] || {};
  day[h.id] = Math.max(0, Math.round(v * 100) / 100);
}
function clockText(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
  return d ? `${d}d ${pad(hh)}h ${pad(mm)}m` : `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
function nextMilestone(days) { return QUIT_MILESTONES.find(m => m > days) || null; }
function quitTick() {
  document.querySelectorAll('[data-quit-clock]').forEach(el => {
    const h = S.habits.find(x => x.id === el.dataset.quitClock); if (h) setText(el, clockText(Date.now() - quitRunStart(h)));
  });
}
function schedLabel(h) {
  if (h.type === 'quit') return 'Every day';
  if (h.sched.kind === 'days') return h.sched.days.length === 7 ? 'Every day' : [1, 2, 3, 4, 5, 6, 0].filter(d => h.sched.days.includes(d)).map(d => DOW3[d]).join(' · ');
  if (h.sched.kind === 'weekly') return `${h.sched.times}× per week`;
  return 'Every day';
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function habitSub(h, k) {
  if (!isDue(h, k)) return `Rest · ${schedLabel(h)}`;
  if (h.type === 'count' || h.auto === 'water' || h.auto === 'protein') return `<b>${fmtV(habitValue(h, k))}</b> / ${fmtV(habitTarget(h, k))} ${esc(h.auto === 'water' ? 'glasses' : h.auto === 'protein' ? 'g protein' : h.unit)}`;
  if (h.auto === 'train') { const n = workoutsOn(k).length; return n ? `${n} workout${n > 1 ? 's' : ''} logged` : 'Log a workout or skill practice'; }
  if (h.sched.kind === 'weekly') return `<b>${weekCount(h, weekKey(k))}</b> / ${h.sched.times} this week`;
  return TODS[h.tod] === 'Anytime' ? schedLabel(h) : `${TODS[h.tod]} · ${schedLabel(h)}`;
}
function habitRing(h, k) {
  const done = habitDone(h, k), c = habitColor(h);
  if (!isDue(h, k)) return `<span class="hring off">${icon('moon', 'sm')}</span>`;
  if (done && h.type === 'check') return `<button class="hring done" data-act="${h.auto ? 'openHabit' : 'toggleHabit'}" data-id="${h.id}" aria-label="Done — tap to undo">${icon('check')}</button>`;
  const r = 20, circ = 2 * Math.PI * r, pct = clamp(habitValue(h, k) / habitTarget(h, k));
  const dashed = pct === 0 && h.type === 'check';
  let act = 'toggleHabit', glyph = 'check', go = '';
  if (h.auto === 'water') { act = 'habitWater'; glyph = done ? 'check' : 'plus'; }
  else if (h.auto === 'protein') { act = ''; go = 'fuel'; glyph = done ? 'check' : 'flame'; }
  else if (h.auto === 'train') { act = ''; go = 'train'; glyph = 'play'; }
  else if (h.type === 'count') { act = 'habitInc'; glyph = done ? 'check' : 'plus'; }
  return `<button class="hring ${done ? 'full' : ''}" ${act ? `data-act="${act}"` : `data-go="${go}"`} data-id="${h.id}" aria-label="${h.type === 'count' ? `Add ${h.step || 1}` : 'Complete'}">
    <svg class="r" viewBox="0 0 46 46"><circle cx="23" cy="23" r="${r}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2.4" ${dashed ? 'stroke-dasharray="5 4.2"' : ''}/>
    ${pct > 0 ? `<circle cx="23" cy="23" r="${r}" fill="none" stroke="${done ? 'var(--success)' : c}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}" transform="rotate(-90 23 23)"/>` : ''}</svg>
    ${icon(glyph)}</button>`;
}
function habitRow(h, k, i = 0) {
  if (h.type === 'quit') return quitCard(h, i);
  const done = habitDone(h, k), st = habitStreak(h);
  return `<div class="hrow glass tint ${done ? 'done' : ''} ${isDue(h, k) ? '' : 'rest'}" data-hid="${h.id}" style="--tc:${habitColor(h)};animation-delay:${i * 0.03}s">
    <button class="h-main" data-act="openHabit" data-id="${h.id}">
      <span class="h-icon">${icon(h.icon || 'check')}</span>
      <span class="grow"><span class="h-name"><span class="t">${esc(h.name)}</span>${st ? `<span class="str">${flame()}${st}${streakUnit(h) === 'week' ? 'w' : ''}</span>` : ''}</span>
      <span class="h-sub">${habitSub(h, k)}</span></span>
    </button>
    ${habitRing(h, k)}
  </div>`;
}
function quitCard(h, i = 0) {
  const days = habitStreak(h), next = nextMilestone(days), prev = [...QUIT_MILESTONES].reverse().find(m => m <= days) || 0;
  const pct = next ? (days - prev) / (next - prev) : 1, urgesToday = h.urges[today()] || 0;
  return `<div class="qcard glass tint" data-hid="${h.id}" style="--tc:${habitColor(h)};animation-delay:${i * 0.03}s">
    <button class="q-top" data-act="openHabit" data-id="${h.id}">
      <span class="h-icon">${icon(h.icon || 'ban')}</span>
      <span class="grow"><span class="h-name">${esc(h.name)}</span><span class="h-sub">Free since ${fmtDate(dayOf(quitRunStart(h)), { month: 'short', day: 'numeric' })}</span></span>
      ${icon('right', 'sm muted')}
    </button>
    <div class="q-clock"><b>${days}</b><span>day${days === 1 ? '' : 's'} free</span><em data-quit-clock="${h.id}">${clockText(Date.now() - quitRunStart(h))}</em></div>
    <div class="q-next">${bar(pct, 'linear-gradient(90deg, var(--tc), color-mix(in srgb, var(--tc) 50%, #fff))', 'thin')}<span class="tiny muted nowrap">${next ? `${next - days} day${next - days === 1 ? '' : 's'} to ${next}-day badge` : 'Every milestone earned 🏆'}</span></div>
    <div class="row gap-s mt-s"><button class="chip-btn" data-act="urge" data-id="${h.id}">${icon('shield', 'xs')} Resisted an urge${urgesToday ? ` <span class="n">${urgesToday}</span>` : ''}</button></div>
  </div>`;
}
function weekStrip() {
  let out = '';
  for (let i = 6; i >= 0; i--) {
    const k = addDays(today(), -i), pct = dayCompletion(k), d = parseDay(k);
    out += `<button class="wday ${k === habitDay ? 'on' : ''} ${pct >= 1 ? 'full' : ''}" data-act="habitDayPick" data-k="${k}" aria-label="${fmtDate(k)}">
      <span>${DOW1[d.getDay()]}</span>${ring({ pct, size: 34, sw: 3.4, color: pct >= 1 ? 'var(--success)' : 'var(--accent)', glow: pct >= 1, inner: `<b>${d.getDate()}</b>` })}</button>`;
  }
  return `<div class="wstrip">${out}</div>`;
}

function viewHabits() {
  const k = habitDay, isToday = k === today();
  const due = buildDue(k), done = due.filter(h => habitDone(h, k)).length;
  const quits = activeHabits().filter(h => h.type === 'quit');
  const rest = activeHabits().filter(h => h.type !== 'quit' && !isDue(h, k));
  const list = due.filter(h => habitTod === 'all' || h.tod === habitTod);
  const groups = habitTod === 'all' ? Object.keys(TODS).map(t => [t, list.filter(h => h.tod === t)]).filter(([, l]) => l.length) : [[habitTod, list]];
  const ps = perfectStreak();
  let i = 0;
  return `
  <section class="hero habits-hero glass">
    <div class="hero-art">${icon('check')}</div>
    <p class="eyebrow">${isToday ? 'Today' : relDay(k)} · Habits</p>
    <div class="row center gap">
      ${ring({ pct: due.length ? done / due.length : 0, size: 112, sw: 10, color: done === due.length && due.length ? 'var(--success)' : 'var(--accent)', inner: `<b class="big">${done}<small>/${due.length}</small></b><span class="tiny muted">done</span>` })}
      <div class="grow">
        <h1 class="hero-title">${done === due.length && due.length ? 'Perfect day' : due.length - done === 1 ? 'One to go' : `${due.length - done} to go`}</h1>
        <div class="hero-stats">
          <div><b>${ps ? flame() : ''}${ps}</b><span>perfect days</span></div>
          <div><b>${Math.round(consistency30() * 100)}%</b><span>30-day</span></div>
          ${quits.length ? `<div><b>${Math.max(...quits.map(habitStreak))}</b><span>days free</span></div>` : ''}
        </div>
      </div>
    </div>
    ${weekStrip()}
  </section>

  <div class="hcats">
    ${[['all', 'All'], ...Object.entries(TODS)].map(([v, l]) => `<button class="chip-btn ${habitTod === v ? 'on' : ''}" data-act="habitTod" data-v="${v}">${l}</button>`).join('')}
  </div>
  ${groups.map(([t, l]) => `<h4 class="sec-h">${icon(t === 'morning' ? 'sun' : t === 'evening' ? 'moon' : t === 'afternoon' ? 'leaf' : 'timer', 'sm')} ${TODS[t]}</h4><div class="hlist">${l.map(h => habitRow(h, k, i++)).join('')}</div>`).join('') || '<p class="muted small mt">Nothing scheduled here.</p>'}
  ${quits.length ? `<h4 class="sec-h">${icon('shield', 'sm')} Breaking free</h4><div class="hlist">${quits.map(h => quitCard(h, i++)).join('')}</div>` : ''}
  ${rest.length ? `<details class="rest-list"><summary class="sec-h">${icon('moon', 'sm')} Not scheduled ${isToday ? 'today' : 'this day'} · ${rest.length}</summary><div class="hlist">${rest.map(h => habitRow(h, k, i++)).join('')}</div></details>` : ''}
  <button class="btn primary wide mt" data-act="newHabit">${icon('plus', 'sm')} New habit</button>
  <div class="grid mt">
    ${card(`${cardHead('Consistency', '<span class="tiny muted">12 weeks</span>', 'calendar')}${heatmap(12, kk => dayCompletion(kk))}
      <p class="tiny muted mt-s">Each dot is a day — brighter means more habits done.</p>`, 'span2')}
  </div>`;
}

/* Compact list for the Today screen */
function todayHabits() {
  const k = today(), due = buildDue(k), open = due.filter(h => !habitDone(h, k)), doneL = due.filter(h => habitDone(h, k));
  const show = [...open, ...doneL].slice(0, 6), quits = activeHabits().filter(h => h.type === 'quit');
  return `<section class="habits-sec">
    <div class="card-head" style="margin:0 2px 8px"><h3>${icon('habits', 'sm')} Habits</h3><button class="chip ${open.length ? '' : 'green'}" data-go="habits">${due.length - open.length}/${due.length} done ${icon('right', 'xs')}</button></div>
    <div class="hlist">${show.map((h, i) => habitRow(h, k, i)).join('')}</div>
    ${quits.length ? `<div class="qpills">${quits.map(h => `<button class="qpill glass" data-act="openHabit" data-id="${h.id}" style="--tc:${habitColor(h)}">${icon(h.icon || 'ban', 'xs')}<b>${habitStreak(h)}d</b> ${esc(h.name)}</button>`).join('')}</div>` : ''}
    ${due.length > show.length ? `<button class="btn ghost wide mt-s" data-go="habits">See all ${due.length} habits</button>` : ''}
  </section>`;
}

/* ---------- Detail sheet ---------- */
function habitSheet(id) {
  const h = S.habits.find(x => x.id === id); if (!h) return '';
  return h.type === 'quit' ? quitSheet(h) : buildSheet(h);
}
function calendarHTML(h, id) {
  const k = today(), [y, m] = habitMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), daysIn = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<i class="out"></i>';
  for (let d = 1; d <= daysIn; d++) {
    const dk = `${y}-${pad(m)}-${pad(d)}`;
    let cls = '';
    if (dk > k) cls = 'future';
    else if (h.type === 'quit') cls = dk < dayOf(h.quitStart) ? 'out-range' : h.slips.some(s => dayOf(s.t) === dk) ? 'slip' : 'fire';
    else if (!isDue(h, dk)) cls = 'rest';
    else if (habitDone(h, dk)) cls = (habitDone(h, addDays(dk, -1)) || (dk < k && habitDone(h, addDays(dk, 1)))) ? 'fire' : 'done';
    else if (dk < k && dk >= (h.created || k)) cls = 'miss';
    if (dk === k) cls += ' today';
    cells += `<i class="${cls}">${d}</i>`;
  }
  const canNext = `${y}-${pad(m)}` < k.slice(0, 7);
  return `<div class="cal-head"><h3>${icon('calendar', 'sm')} ${first.toLocaleDateString('en-US', { month: 'long', year: y !== parseDay(k).getFullYear() ? 'numeric' : undefined })}</h3>
      <div class="row gap-s"><button class="icon-btn" data-act="habitMonth" data-id="${id}" data-d="-1" aria-label="Previous month">${icon('left', 'sm')}</button><button class="icon-btn" data-act="habitMonth" data-id="${id}" data-d="1" ${canNext ? '' : 'disabled'} aria-label="Next month">${icon('right', 'sm')}</button></div></div>
    <div class="cal-dow">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="cal">${cells}</div>`;
}
function sheetTop(h) {
  return `<div class="row between center"><button class="round-btn glass" data-act="closeSheet" aria-label="Close">${icon('x')}</button>
    <span class="chip">${esc((HABIT_CATS[h.cat] || {}).name || '')} · ${HABIT_KINDS[h.type].name}</span>
    <button class="round-btn glass" data-act="editHabit" data-id="${h.id}" aria-label="Edit habit">${icon('edit')}</button></div>`;
}
function buildSheet(h) {
  const k = habitDay, st = habitStats(h), done = habitDone(h, k), u = streakUnit(h);
  const isCount = h.type === 'count' || h.auto === 'water' || h.auto === 'protein';
  const v = habitValue(h, k), t = habitTarget(h, k), unit = h.auto === 'water' ? 'glasses' : h.auto === 'protein' ? 'g' : h.unit;
  let chart = '';
  if (isCount) {
    const vals = [], labels = [];
    for (let i = 13; i >= 0; i--) { const kk = addDays(today(), -i); vals.push(Math.round(habitValue(h, kk))); labels.push(i % 2 ? '' : String(parseDay(kk).getDate())); }
    chart = `<h4 class="mt">${icon('chart', 'sm')} Last 14 days</h4>${barChart(vals, labels, { h: 110, color: habitColor(h), goal: t })}`;
  }
  const control = !isDue(h, k) ? `<p class="small muted mt center-t">Not scheduled ${k === today() ? 'today' : 'this day'} (${schedLabel(h)}).</p>`
    : h.auto === 'water' ? `<div class="amount mt"><b>${fmtV(v)}<small> / ${fmtV(t)} ${unit}</small></b>${bar(v / t, habitColor(h))}</div><button class="btn teal wide mt" data-act="habitWater" data-id="${h.id}" data-sheet="1">${icon('drop', 'sm')} Add a glass (${S.settings.glassMl} ml)</button>`
    : h.auto === 'protein' ? `<div class="amount mt"><b>${fmtV(v)}<small> / ${fmtV(t)} g</small></b>${bar(v / t, habitColor(h))}</div><button class="btn soft wide mt" data-go="fuel">${icon('fuel', 'sm')} Log food in Fuel</button>`
    : h.auto === 'train' ? `<button class="btn primary wide mt" data-go="train">${icon('play', 'sm')} Go train</button>`
    : h.type === 'count' ? `<div class="amount mt"><button class="round-btn glass" data-act="habitInc" data-id="${h.id}" data-d="-1" data-sheet="1" aria-label="Less">${icon('minus')}</button>
        <div class="grow center-t"><b>${fmtV(v)}<small> / ${fmtV(t)} ${esc(unit)}</small></b>${bar(v / t, done ? 'var(--success)' : habitColor(h))}</div>
        <button class="round-btn glass" data-act="habitInc" data-id="${h.id}" data-d="1" data-sheet="1" aria-label="More">${icon('plus')}</button></div>
        <div class="row gap-s mt-s wrap center-j">${[h.step * 2, h.step * 5].filter((x, i, a) => a.indexOf(x) === i).map(n => `<button class="chip-btn" data-act="habitInc" data-id="${h.id}" data-n="${n}" data-sheet="1">+${fmtV(n)}</button>`).join('')}
        <input class="inp sm" type="number" inputmode="decimal" id="habitAmt" placeholder="Amount" data-enter="habitAdd" data-id="${h.id}" data-noautofocus><button class="chip-btn" data-act="habitAdd" data-id="${h.id}">Add</button></div>`
    : `<div class="hd-actions">
        <div class="side">${flame()}<span>${st.current} ${u}${st.current === 1 ? '' : 's'}</span></div>
        <button class="hd-check ${done ? '' : 'off'}" data-act="habitCheck" data-id="${h.id}" aria-label="${done ? 'Completed' : 'Complete'}">${icon('check')}</button>
        <button class="side" data-act="habitCheck" data-id="${h.id}" data-undo="1" ${done ? '' : 'disabled'}>${icon('undo')}<span>Undo</span></button></div>`;
  return `<div class="hd" style="--tc:${habitColor(h)}">
    ${sheetTop(h)}
    <p class="hd-streak mt">${st.current ? flame() : icon('flame', 'sm')} ${st.current}-${u} streak</p>
    <h2 class="hd-title">${icon(h.icon || 'check')}${esc(h.name)}</h2>
    <p class="hd-meta">${schedLabel(h)} · ${TODS[h.tod]}${h.auto ? ' · <span class="chip blue">Automatic</span>' : ''}${k !== today() ? ` · <span class="chip gold">${relDay(k)}</span>` : ''}</p>
    ${h.why ? `<p class="why center-t">“${esc(h.why)}”</p>` : ''}
    ${control}
    <div class="hd-grid">
      <div><b>${st.current}</b><span>Current ${u}s</span></div>
      <div><b>${icon('laurel', 'sm')}${st.best}</b><span>Best streak</span></div>
      <div><b>${Math.round(st.rate * 100)}%</b><span>Last 30 days</span></div>
      <div><b>${isCount && h.type === 'count' ? fmtN(st.sum) : st.total}</b><span>${isCount && h.type === 'count' ? `Total ${esc(unit)}` : 'Days done'}</span></div>
    </div>
    ${chart}
    ${calendarHTML(h, h.id)}
  </div>`;
}
function quitSheet(h) {
  const st = habitStats(h), days = st.current, slips = [...h.slips].sort((a, b) => b.t - a.t).slice(0, 8);
  return `<div class="hd" style="--tc:${habitColor(h)}">
    ${sheetTop(h)}
    <h2 class="hd-title mt">${icon(h.icon || 'ban')}${esc(h.name)}</h2>
    ${h.why ? `<p class="why center-t">“${esc(h.why)}”</p>` : ''}
    <div class="q-big"><span class="tiny muted">Free for</span><b data-quit-clock="${h.id}">${clockText(Date.now() - quitRunStart(h))}</b><span class="small muted">since ${new Date(quitRunStart(h)).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
    <div class="miles">${QUIT_MILESTONES.map(m => `<div class="mile ${days >= m ? 'on' : ''}"><span>${days >= m ? flame() : icon('shield', 'xs')}</span><b>${m >= 365 ? '1y' : m + 'd'}</b></div>`).join('')}</div>
    <div class="hd-grid">
      <div><b>${days}</b><span>Days free</span></div>
      <div><b>${icon('laurel', 'sm')}${st.best}</b><span>Best run</span></div>
      <div><b>${st.urges}</b><span>Urges resisted</span></div>
      <div><b>${st.slips}</b><span>Slips</span></div>
    </div>
    <div class="row gap mt"><button class="btn soft grow" data-act="urge" data-id="${h.id}" data-sheet="1">${icon('shield', 'sm')} I resisted an urge</button>
      <button class="btn ghost grow danger-text" data-act="slip" data-id="${h.id}">I slipped</button></div>
    <p class="verse-text small mt center-t">“For a just man falleth seven times, and riseth up again.”</p><p class="verse-ref center-t">Proverbs 24:16</p>
    ${calendarHTML(h, h.id)}
    ${slips.length ? `<h4 class="mt">${icon('calendar', 'sm')} Slip history</h4><ul class="slips">${slips.map(s => `<li><span>${new Date(s.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><span class="muted">${esc([s.trigger, s.note].filter(Boolean).join(' · ') || '—')}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}
function slipSheet(id) {
  return `<h3 class="sheet-title">It's okay. Be honest.</h3>
    <p class="small muted">Logging a slip resets the clock, not your progress. Your best run and every badge stay. What was going on?</p>
    <div class="row gap-s wrap mt">${SLIP_TRIGGERS.map(t => `<button class="chip-btn" data-act="slipTrigger" data-v="${t}">${t}</button>`).join('')}</div>
    <input class="inp mt" id="slipNote" placeholder="Note (optional) — what will you do differently?" data-noautofocus>
    <button class="btn danger wide mt" data-act="slipConfirm" data-id="${id}">Log slip & start again</button>
    <button class="btn ghost wide mt-s" data-act="openHabit" data-id="${id}">Cancel</button>`;
}

/* ---------- Editor ---------- */
function habitEditor() {
  const d = habitDraft, isNew = !d.id, locked = !!d.auto;
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(d[k]) === String(v) ? 'on' : ''}" data-act="hdSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<div class="row between center"><h3 class="sheet-title">${isNew ? 'New habit' : 'Edit habit'}</h3><button class="round-btn glass" data-act="closeSheet" aria-label="Close">${icon('x')}</button></div>
    ${isNew ? `<p class="tiny muted">Start from an idea or build your own.</p><div class="tmpl">${HABIT_TEMPLATES.map((t, i) => `<button class="chip-btn" data-act="hdTemplate" data-i="${i}">${icon(t.icon, 'xs')} ${esc(t.name)}</button>`).join('')}</div>` : ''}
    <label class="field mt"><span>Name</span><input class="inp" name="name" value="${esc(d.name)}" data-input="hdraft" placeholder="e.g. Read the Bible"></label>
    ${locked ? '' : `<div class="field mt"><span>Type</span><div class="kinds">${Object.entries(HABIT_KINDS).map(([v, K]) => `<button class="kind glass-btn ${d.type === v ? 'on' : ''}" data-act="hdSet" data-k="type" data-v="${v}">${icon(K.icon, 'sm')}<b>${K.name}</b><span class="tiny muted">${K.sub}</span></button>`).join('')}</div></div>`}
    ${d.type === 'count' && !locked ? `<div class="form-grid mt">
      <label class="field"><span>Daily goal</span><input class="inp" type="number" inputmode="decimal" name="target" value="${esc(d.target)}" data-input="hdraft"></label>
      <label class="field"><span>Unit</span><input class="inp" name="unit" value="${esc(d.unit)}" data-input="hdraft" placeholder="glasses, pages, min…"></label>
      <label class="field"><span>Tap adds</span><input class="inp" type="number" inputmode="decimal" name="step" value="${esc(d.step)}" data-input="hdraft"></label></div>` : ''}
    ${d.type !== 'quit' && !locked ? `<div class="field mt"><span>Schedule</span>${seg('schedKind', [['daily', 'Every day'], ['days', 'Some days'], ['weekly', 'X per week']])}
      ${d.schedKind === 'days' ? `<div class="dows mt-s">${[1, 2, 3, 4, 5, 6, 0].map(i => `<button class="${d.days.includes(i) ? 'on' : ''}" data-act="hdDay" data-v="${i}">${DOW3[i].slice(0, 2)}</button>`).join('')}</div>` : ''}
      ${d.schedKind === 'weekly' ? `<div class="row center gap mt-s"><button class="round-btn glass" data-act="hdTimes" data-d="-1">${icon('minus', 'sm')}</button><b class="big-num">${d.times}</b><span class="muted">times per week</span><button class="round-btn glass" data-act="hdTimes" data-d="1">${icon('plus', 'sm')}</button></div>` : ''}</div>` : ''}
    ${d.type !== 'quit' ? `<div class="field mt"><span>Time of day</span>${seg('tod', Object.entries(TODS))}</div>
      <label class="field mt"><span>Reminder <em>(optional — a notification at this time if it's not done yet)</em></span><input class="inp" type="time" name="remind" value="${esc(d.remind || '')}" data-input="hdraft"></label>` : ''}
    <div class="field mt"><span>Category</span>${seg('cat', Object.entries(HABIT_CATS).map(([v, C]) => [v, C.name]))}</div>
    <div class="field mt"><span>Icon</span><div class="icons">${HABIT_ICONS.map(n => `<button class="${d.icon === n ? 'on' : ''}" data-act="hdSet" data-k="icon" data-v="${n}" aria-label="${n}">${icon(n, 'sm')}</button>`).join('')}</div></div>
    <div class="field mt"><span>Color</span><div class="swatch-row">${['', ...HABIT_SWATCHES].map(c => `<button class="${(d.color || '') === c ? 'on' : ''}" data-act="hdSet" data-k="color" data-v="${c}" style="background:${c || (HABIT_CATS[d.cat] || {}).color}" aria-label="${c ? 'Color' : 'Category color'}">${c ? '' : icon('refresh', 'xs')}</button>`).join('')}</div></div>
    <label class="field mt"><span>Why does it matter? <em>(optional)</em></span><input class="inp" name="why" value="${esc(d.why || '')}" data-input="hdraft" placeholder="${d.type === 'quit' ? 'e.g. To be free and present for my family' : 'e.g. To grow closer to God'}"></label>
    <button class="btn primary wide mt" data-act="hdSave">${isNew ? 'Create habit' : 'Save changes'}</button>
    ${isNew ? '' : `<div class="row gap mt-s"><button class="btn ghost grow" data-act="hdArchive">${icon('moon', 'sm')} Archive</button>${d.auto ? '' : `<button class="btn ghost grow danger-text" data-act="hdDelete">${icon('trash', 'sm')} Delete</button>`}</div>`}
    ${archivedList()}`;
}
function archivedList() {
  const a = S.habits.filter(h => h.archived);
  if (!a.length || (habitDraft && habitDraft.id)) return '';
  return `<details class="rest-list mt"><summary class="sec-h">${icon('moon', 'sm')} Archived · ${a.length}</summary><ul class="manage">${a.map(h => `<li>${icon(h.icon || 'check', 'sm')}<span class="grow">${esc(h.name)}</span><button class="btn soft xs" data-act="hdRestore" data-id="${h.id}">Restore</button></li>`).join('')}</ul></details>`;
}
function draftFrom(h) {
  return h ? { ...h, schedKind: h.sched.kind, days: [...h.sched.days], times: h.sched.times }
    : { name: '', type: 'check', target: 8, unit: 'times', step: 1, schedKind: 'daily', days: [1, 2, 3, 4, 5], times: 3, tod: 'any', cat: 'body', icon: 'check', color: '', why: '' };
}
function openEditor(h) { habitDraft = draftFrom(h); openSheet(habitEditor(), { cls: 'tall' }); }
function rerenderEditor() { const s = sheetEl(); if (s) morphHTML(s, '<div class="grabber"></div>' + habitEditor()); }
function rerenderHabitSheet(id) { const s = sheetEl(); if (s && s.querySelector('.hd')) morphHTML(s, '<div class="grabber"></div>' + habitSheet(id)); }

/* ---------- Actions (merged into ACT by app.js) ---------- */
let slipTrigger = '';
const HABIT_ACT = {
  habitTod: d => { habitTod = d.v; render(); },
  habitDayPick: d => { habitDay = d.k; render(); },
  newHabit: () => openEditor(null),
  editHabit: d => openEditor(S.habits.find(h => h.id === d.id)),
  openHabit: d => { habitMonth = today().slice(0, 7); const h = S.habits.find(x => x.id === d.id); if (h) openSheet(habitSheet(d.id), { cls: 'tall', tc: habitColor(h) }); },
  habitMonth: d => {
    const [y, m] = habitMonth.split('-').map(Number), dt = new Date(y, m - 1 + +d.d, 1), next = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
    if (next > today().slice(0, 7)) return; habitMonth = next; rerenderHabitSheet(d.id);
  },
  toggleHabit: d => {
    const h = S.habits.find(x => x.id === d.id), k = route === 'habits' ? habitDay : today(), on = !habitDone(h, k);
    toggleHabit(d.id, undefined, k);
    SFX.play(on ? 'toggleOn' : 'toggleOff'); if (on) fx(`[data-hid="${d.id}"]`, 'pop'); haptic(on ? 18 : 8); refresh();
  },
  habitCheck: (d, el) => {
    const h = S.habits.find(x => x.id === d.id), k = habitDay, was = habitDone(h, k);
    if (d.undo && !was) return;
    toggleHabit(d.id, !was ? true : undefined, k);
    if (!was) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 24); SFX.play('check'); } else SFX.play('toggleOff');
    haptic(20); refresh(); rerenderHabitSheet(d.id);
  },
  habitInc: (d, el) => {
    const h = S.habits.find(x => x.id === d.id), k = route === 'habits' || d.sheet ? habitDay : today(), was = habitDone(h, k);
    const delta = d.n ? +d.n : (h.step || 1) * (+d.d || 1);
    setHabitValue(h, habitValue(h, k) + delta, k);
    const now = habitDone(h, k);
    SFX.play(now && !was ? 'check' : delta > 0 ? 'tap' : 'toggleOff');
    if (now && !was) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 20); fx(`[data-hid="${h.id}"]`, 'pop'); }
    haptic(now && !was ? 20 : 8); refresh(); if (d.sheet) rerenderHabitSheet(h.id);
  },
  habitAdd: d => {
    const inp = document.getElementById('habitAmt'), n = parseFloat(String(inp && inp.value).replace(',', '.'));
    if (!(n > 0)) return; const el = document.querySelector('[data-act=habitAdd]'); HABIT_ACT.habitInc({ id: d.id, n, sheet: 1 }, el || document.body);
  },
  habitWater: (d, el) => {
    addWater(S.settings.glassMl, today()); SFX.play('water'); fx(`[data-hid="${d.id}"]`, 'pop'); haptic();
    const h = S.habits.find(x => x.id === d.id), r = el.getBoundingClientRect(); if (h && habitDone(h)) burst(r.left + r.width / 2, r.top + r.height / 2, 14);
    refresh(); if (d.sheet) rerenderHabitSheet(d.id);
  },
  habitAuto: d => { const h = S.habits.find(x => x.id === d.id); if (h && h.auto === 'protein') go('fuel'); else if (h && h.auto === 'train') go('train'); },
  urge: (d, el) => {
    const h = S.habits.find(x => x.id === d.id), k = today(), n = (h.urges[k] || 0) + 1;
    h.urges[k] = n; if (n <= 5) addXP(`urge:${k}:${h.id}:${n}`, 5, 'Urge resisted');
    SFX.play('toggleOn'); const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 12); haptic(15);
    if (n === 1) toast(`${icon('shield', 'xs')} Strong. Every “no” makes the next one easier.`);
    refresh(); if (d.sheet) rerenderHabitSheet(h.id);
  },
  slip: d => { slipTrigger = ''; openSheet(slipSheet(d.id), { tc: 'var(--danger)' }); },
  slipTrigger: (d, el) => { slipTrigger = slipTrigger === d.v ? '' : d.v; el.parentElement.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('on', b.dataset.v === slipTrigger)); },
  slipConfirm: d => {
    const h = S.habits.find(x => x.id === d.id), note = (document.getElementById('slipNote').value || '').trim();
    h.slips.push({ t: Date.now(), trigger: slipTrigger, note });
    SFX.play('toggleOff'); haptic(30); refresh();
    openSheet(`<div class="levelup"><p class="eyebrow">New run</p><div class="lu-num" style="font-size:64px">${icon('refresh')}</div><h2>The clock starts again — and so do you.</h2>
      <p class="verse-text">“It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning.”</p><p class="muted small">Lamentations 3:22–23</p>
      <button class="btn primary wide mt" data-act="openHabit" data-id="${h.id}">Keep going</button></div>`, { cls: 'center' });
  },
  hdSet: d => { habitDraft[d.k] = d.v; if (d.k === 'type' && d.v === 'quit' && habitDraft.icon === 'check') habitDraft.icon = 'ban'; SFX.play('tap'); rerenderEditor(); },
  hdDay: d => { const v = +d.v, a = habitDraft.days; habitDraft.days = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; rerenderEditor(); },
  hdTimes: d => { habitDraft.times = clamp(habitDraft.times + +d.d, 1, 7); rerenderEditor(); },
  hdTemplate: d => { const t = HABIT_TEMPLATES[+d.i]; habitDraft = { ...draftFrom(null), ...t, color: '' }; SFX.play('tap'); rerenderEditor(); },
  hdSave: () => {
    const d = habitDraft, name = (d.name || '').trim();
    if (!name) return toast('Give your habit a name');
    if (d.schedKind === 'days' && !d.days.length) return toast('Pick at least one day');
    const base = d.id ? S.habits.find(h => h.id === d.id) : { id: 'h_' + uid(), created: today() };
    Object.assign(base, { name, icon: d.icon, cat: d.cat, color: d.color || '', why: (d.why || '').trim(), tod: d.type === 'quit' ? 'any' : d.tod, remind: d.type === 'quit' ? '' : (d.remind || '') });
    if (base.remind && !S.settings.notif.enabled) { S.settings.notif.enabled = true; askNotifPermission(); }
    if (!d.auto) {
      if (base.type !== d.type) { delete base.quitStart; }
      base.type = d.type;
      base.sched = { kind: d.schedKind, days: [...d.days].sort(), times: d.times };
      if (d.type === 'count') { base.target = Math.max(0.1, +d.target || 1); base.unit = (d.unit || 'times').trim(); base.step = Math.max(0.1, +d.step || 1); }
    }
    normHabit(base);
    if (!d.id) S.habits.push(base);
    closeSheet(); SFX.play('badge'); toast(`${icon('check', 'xs')} ${d.id ? 'Saved' : 'Habit created'}: ${esc(name)}`);
    if (!d.id) addXP(`newhabit:${base.id}`, 15, 'New habit');
    refresh();
  },
  hdArchive: () => { const h = S.habits.find(x => x.id === habitDraft.id); h.archived = true; closeSheet(); toast('Archived — restore it any time from New habit'); refresh(); },
  hdRestore: d => { const h = S.habits.find(x => x.id === d.id); h.archived = false; save(); rerenderEditor(); render(); },
  hdDelete: () => askConfirm('Delete habit?', 'Its history and streaks will be removed. Archive it instead if you might want it back.', 'Delete', () => {
    S.habits = S.habits.filter(h => h.id !== habitDraft.id); refresh();
  }),
};
const HABIT_INP = { hdraft: el => { habitDraft[el.name] = el.value; } };
