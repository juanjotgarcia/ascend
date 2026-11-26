/* ZELUM — game & training logic: progressive overload, PRs, nutrition targets,
   habits, streaks, missions, achievements, goal progress and the Coach. */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sum = a => a.reduce((x, y) => x + y, 0);
const pick = (arr, seed) => arr[seed % arr.length];

/* ---------- Exercises (including skill drills "sk:<skill>:<step>") ---------- */
function getEx(id) {
  if (EX[id]) return EX[id];
  if (GX[id]) return GX[id];
  if (id && id.startsWith('sk:')) {
    const [, sk, st] = id.split(':');
    const s = SKILLS[sk] && SKILLS[sk].steps[+st];
    if (!s) return null;
    const lo = Math.max(1, Math.round(s.target * 0.5));
    return { id, name: `${SKILLS[sk].name} · ${s.name}`, kind: s.kind, lo, hi: s.target, cue: s.tip, skill: sk, skillStep: +st, fam: null };
  }
  return null;
}
const unitOf = ex => (ex && ex.kind === 'hold' ? 's' : '');

function doneSets(entry) { return entry.sets.filter(s => s.done && s.v > 0); }

/* ---------- Variants: grip & width, each tracked as its own exercise ---------- */
const GRIPS = { over: 'Overhand', under: 'Underhand', neutral: 'Neutral' };
const WIDTHS = { narrow: 'Narrow', medium: 'Medium', wide: 'Wide' };
const GRIP_TIPS = { over: 'Lats and upper back — the classic.', under: 'More biceps; usually your strongest grip.', neutral: 'Easiest on elbows and shoulders; hits the brachialis.' };
const WIDTH_TIPS = { narrow: 'More arms (biceps on pulls, triceps on pushes), longer range.', medium: 'Balanced — shoulder width.', wide: 'More lats / chest, shorter range, harder at the bottom.' };
const EFFORT = { 1: 'Easy', 2: 'Solid', 3: 'Hard', 4: 'Max' };
const FAM_BW = { vpull: 1, hrow: 0.6, hpush: 0.65, dip: 0.95, vpush: 0.7, squat: 0.8, hinge: 0.6, core: 0.35, calves: 1 };   // share of bodyweight moved
/* One comparable "effort volume" for any set: gym loads are relative to bodyweight, bodyweight sets count reps (+ added load) */
const isGym = ex => !!(ex && ex.gym);
function setVol(ex, st, BW) { return isGym(ex) && ex.kind !== 'hold' ? st.v * Math.max(.25, (st.kg || 0) / BW) : st.v * (1 + (st.kg || 0) / BW); }
const kgLabel = (ex, kg) => kg ? (isGym(ex) ? `${kg} kg` : `+${kg} kg`) : '';
const setLabel = (ex, s) => isGym(ex) && s.kg ? `${s.kg}×${s.v}${unitOf(ex)}` : `${s.v}${unitOf(ex)}${s.kg ? `+${s.kg}kg` : ''}`;

const keyOf = (ex, grip, width) => ex + (grip && grip !== 'over' ? `|g:${grip}` : '') + (width && width !== 'medium' ? `|w:${width}` : '');
function parseKey(key) {
  const [ex, ...rest] = String(key).split('|'), o = { ex, grip: 'over', width: 'medium' };
  for (const r of rest) { if (r.startsWith('g:')) o.grip = r.slice(2); if (r.startsWith('w:')) o.width = r.slice(2); }
  return o;
}
const entryKey = e => keyOf(e.ex, e.grip, e.width);
function variantName(exId, grip = 'over', width = 'medium') {
  const ex = getEx(exId); if (!ex) return exId;
  if (!ex.vary) return ex.name;
  let n = ex.name;
  if (ex.vary.includes('grip') && grip !== 'over') n = exId === 'pullup' && grip === 'under' ? 'Chin-ups' : `${n} · ${GRIPS[grip]}`;
  if (width !== 'medium') n += ` · ${WIDTHS[width]}`;
  return n;
}
const keyName = key => { const k = parseKey(key); return variantName(k.ex, k.grip, k.width); };
const entryName = e => variantName(e.ex, e.grip, e.width);

/* All logged sessions of one exercise variant, newest first */
function sessionsOf(key, excludeId, limit = 9999) {
  const out = [];
  for (let i = S.workouts.length - 1; i >= 0 && out.length < limit; i--) {
    const w = S.workouts[i]; if (w.id === excludeId) continue;
    for (const e of w.entries) {
      if (entryKey(e) !== key) continue;
      const ds = doneSets(e);
      if (ds.length) out.push({ date: w.date, sets: ds, effort: e.effort || 0, kg: Math.max(0, ...ds.map(s => s.kg || 0)) });
    }
  }
  return out;
}
function lastPerformance(key, excludeId) { return sessionsOf(key, excludeId, 1)[0] || null; }
function bestEver(key, excludeId) {
  let best = null;
  for (const ss of sessionsOf(key, excludeId)) for (const x of ss.sets) if (!best || x.v > best.v) best = { v: x.v, kg: x.kg || 0, date: ss.date };
  return best;
}
function bestLoad(key, excludeId) { return Math.max(0, ...sessionsOf(key, excludeId).map(x => x.kg)); }

/* This week vs last week for one exercise variant */
function weekStats(key) {
  const t = today(), w1 = addDays(t, -6), w2 = addDays(t, -13), BW = latestWeight() || 61;
  const all = sessionsOf(key, null, 60), ex = getEx(parseKey(key).ex);
  const vol = list => sum(list.map(x => sum(x.sets.map(st => setVol(ex, st, BW)))));
  const cur = all.filter(x => x.date >= w1), prev = all.filter(x => x.date >= w2 && x.date < w1);
  return { all, cur: cur.length, prev: prev.length, vol: vol(cur), volPrev: vol(prev) };
}
/* How much weight takes you from your current reps down to `targetReps` (Epley estimate) */
function kgStep(ex, vals, kg, targetReps) {
  const BW = latestWeight() || 61, f = FAM_BW[ex.fam] ?? 0.7;
  const L1 = BW * f + kg, r = Math.min(...vals), oneRM = L1 * (1 + r / 30), L2 = oneRM / (1 + targetReps / 30);
  return clamp(Math.round((L2 - L1) / 1.25) * 1.25, 1.25, 10);
}

/* ---------- Smart progressive overload ----------
   Reads the last session (reps, load, effort) and the last two weeks, then decides:
   new → start point · deload → stalled 3× at hard effort · load → exact kg to add ·
   levelup → next exercise · hold → repeat after a max effort · build / progress → reps */
function recommend(key, opt = {}) {
  const exId = parseKey(key).ex, ex = getEx(exId);
  if (!ex) return { status: 'new', targets: [5, 5, 5], kg: 0, text: '' };
  if (ex.gym) return recommendGym(key, opt);
  const r = recommendCal(key, ex, exId, opt);
  if (isDeload() && r.status !== 'new') {
    const t = r.targets.map(v => Math.max(1, Math.round(v * .75))), n = Math.max(2, t.length - 1), kg = r.kg ? roundLoad(ex, r.kg * .8) : 0;
    return { ...r, status: 'deload', next: null, targets: t.slice(0, n), kg, text: `Deload week: ${n} × ${t[0]}${unitOf(ex)}${kg ? ` @ +${kg} kg` : ''}, smooth and easy. Recover now, climb next week.` };
  }
  return r;
}
function recommendCal(key, ex, exId, opt) {
  const u = unitOf(ex), step = ex.kind === 'hold' ? 5 : 1, n = opt.sets || 3;
  const ws = weekStats(key), last = ws.all[0];
  if (!last) {
    const max = key === exId && S.placement && S.placement[exId];
    const start = max ? Math.round(clamp(max * 0.7, ex.lo, ex.hi)) : ex.lo;
    return { status: 'new', targets: Array(n).fill(start), kg: 0, text: `First time${max ? ` (from your ${max}-rep test)` : ''}: ${n} × ${start}${u}. Leave 1–2 reps in the tank and rate the effort.` };
  }
  const vals = last.sets.map(x => x.v), kg = last.kg, eff = last.effort || 0;
  const base = Array.from({ length: n }, (_, i) => vals[i] ?? vals[vals.length - 1]);
  const kgTxt = kg ? ` @ +${kg} kg` : '', effTxt = eff ? `, ${EFFORT[eff].toLowerCase()}` : '';
  const change = ws.volPrev ? Math.round((ws.vol / ws.volPrev - 1) * 100) : null;
  const trend = ws.cur ? ` · This week: ${ws.cur} session${ws.cur > 1 ? 's' : ''}${change !== null ? `, volume ${change >= 0 ? '+' : ''}${change}% vs last week` : ''}.` : '';
  const lastTxt = `Last: ${vals.join(' · ')}${u}${kgTxt}${effTxt}`;
  const ladder = ex.fam ? FAMILIES[ex.fam].ladder : null, next = ladder ? ladder[ex.step + 1] : null;
  const canLevel = next && familyLevel(ex.fam) === ex.step && key === exId;

  const recent = ws.all.slice(0, 3);
  if (recent.length === 3 && recent.every(x => (x.effort || 0) >= 3) && sum(recent[0].sets.map(x => x.v)) <= sum(recent[2].sets.map(x => x.v)) && recent[0].kg <= recent[2].kg) {
    const t = base.map(v => Math.max(1, Math.round(v * 0.8)));
    return { status: 'deload', targets: t.slice(0, 2), kg, text: `3 sessions with no progress at hard effort → recovery day: 2 × ${t[0]}${u}${kgTxt}, smooth reps. You'll bounce back stronger${trend}` };
  }
  if (vals.length >= n && vals.every(v => v >= ex.hi) && eff !== 4) {
    if (ex.load && ex.kind !== 'hold') {
      const goal = Math.max(ex.lo, Math.min(ex.hi - 2, ex.lo + 3)), add = kgStep(ex, vals, kg, goal);
      return { status: 'load', next: canLevel ? next.id : null, targets: Array(n).fill(goal), kg: kg + add,
        text: `${lastTxt}. You own ${ex.hi}${u || ' reps'}. Add ${add} kg (≈ ${add} L of water in a backpack, ${kg + add} kg total) → aim for ${n} × ${goal}${canLevel ? `, or level up to ${next.name}` : ''}${trend}` };
    }
    if (canLevel) return { status: 'levelup', next: next.id, targets: base.map(v => v + step), kg,
      text: `${lastTxt}. Mastered ${n}+ sets at ${ex.hi}${u} — you're ready for ${next.name}${trend}` };
    return { status: 'top', targets: base.map(v => v + step), kg, text: `${lastTxt}. Top of the range: keep adding ${ex.kind === 'hold' ? 'seconds' : 'reps'} or slow the lowering to 3 s${trend}` };
  }
  if (eff === 4) return { status: 'hold', targets: base, kg, text: `${lastTxt}. That was max effort — repeat these targets with cleaner form; the strength shows up next week${trend}` };
  if (Math.max(...vals) < ex.lo) return { status: 'build', targets: base.map(v => Math.min(ex.lo, v + step)), kg, text: `${lastTxt}. Building toward ${ex.lo}${u}: add ${step}${u || ' rep'} per set${trend}` };
  let targets;
  if (eff === 1) targets = base.map(v => Math.min(ex.hi, v + 2 * step));                       // easy → +2
  else if (eff === 3) { targets = [...base]; const i = targets.indexOf(Math.min(...targets)); targets[i] = Math.min(ex.hi, targets[i] + step); }   // hard → only the weakest set
  else targets = base.map(v => Math.min(ex.hi, v + step));                                      // solid / unrated → +1 each
  return { status: 'progress', targets, kg, text: `${lastTxt} → aim for ${targets.join(' · ')}${u}${kgTxt}${trend}` };
}

/* Exercise that hasn't improved over its last 3 sessions */
function stalled() {
  const out = [];
  for (const fam of Object.keys(FAMILIES)) {
    const ex = currentEx(fam), hist = sessionsOf(ex.id, null, 3).map(x => sum(x.sets.map(st => st.v)));
    if (hist.length === 3 && hist[0] <= hist[2]) out.push(ex);
  }
  return out;
}

/* Weekly review across everything trained in the last 14 days */
function weeklyReview() {
  const t = today(), w1 = addDays(t, -6), w2 = addDays(t, -13), BW = latestWeight() || 61;
  const inRange = (a, b) => S.workouts.filter(w => w.date >= a && w.date <= b);
  const cur = inRange(w1, t), prev = inRange(w2, addDays(w1, -1));
  const vol = ws => sum(ws.map(w => sum(w.entries.map(e => { const ex = getEx(e.ex); return sum(doneSets(e).map(st => setVol(ex, st, BW))); }))));
  const reps = ws => sum(ws.map(w => workoutVolume(w).reps));
  const keys = [];
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const w = S.workouts[i]; if (w.date < w2) break;
    for (const e of w.entries) { const k = entryKey(e); if (!keys.includes(k) && !getEx(e.ex)?.skill) keys.push(k); }
  }
  return { sessions: cur.length, sessionsPrev: prev.length, reps: reps(cur), repsPrev: reps(prev), vol: vol(cur), volPrev: vol(prev),
    prs: sum(cur.map(w => (w.prs || []).length)), keys: keys.slice(0, 6) };
}

/* ---------- Training schedule ---------- */
const TRAIN_PATTERNS = { 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
function trainWeekdays() { const s = S.profile.schedule; return s && s.length ? s : (TRAIN_PATTERNS[S.profile.trainDays] || TRAIN_PATTERNS[4]); }
function isTrainingDay(k = today()) { return trainWeekdays().includes(parseDay(k).getDay()); }
const gymMode = () => S.profile.discipline === 'gym';
function nextTemplate() {
  if (gymMode()) { const r = nextRoutine(); if (r) return 'r:' + r.id; }
  const rot = ROTATIONS[S.profile.trainDays] || ROTATIONS[Math.min(6, Math.max(3, S.profile.trainDays))] || ROTATIONS[4];
  const count = S.workouts.filter(w => rot.includes(w.tpl)).length;
  return rot[count % rot.length];
}
function goalSkill() { return S.goal && S.goal.type === 'skill' ? S.goal.skill : null; }

/* Name, icon and blurb for a template id or a routine ("r:<id>") */
function tplInfo(tpl) {
  if (tpl && tpl.startsWith('r:')) { const r = routineById(tpl.slice(2)); if (r) return { name: r.name, icon: r.icon || 'train', desc: r.desc || `${r.items.length} exercises · ~${routineMinutes(r)} min`, routine: r }; }
  return TEMPLATES[tpl] || TEMPLATES.custom;
}
function makeEntry(id, grip, width, item) {
  const ex = getEx(id), pref = (S.variants || {})[id] || {};
  if (ex && ex.gym) {
    const rg = item && item.lo ? { lo: item.lo, hi: item.hi } : gymRange(ex), sets = (item && item.sets) || gymSets(ex);
    const r = recommendGym(id, { ...rg, sets });
    return { ex: id, rec: r.text, why: r.why, status: r.status, next: null, lo: rg.lo, hi: rg.hi, rest: (item && item.rest) || gymRest(ex),
      sets: r.targets.map(t => ({ t, v: t, kg: r.kg || 0, done: false })) };
  }
  if (ex && ex.vary) {
    grip = [grip, pref.grip].find(g => GRIPS[g] && ex.vary.includes('grip')) || 'over';
    width = [width, pref.width].find(v => WIDTHS[v]) || 'medium';
  } else { grip = width = undefined; }
  const r = recommend(keyOf(id, grip, width), item ? { sets: item.sets } : {});
  const e = { ex: id, rec: r.text, status: r.status, next: r.next || null, sets: r.targets.map(t => ({ t, v: t, kg: r.kg || 0, done: false })) };
  if (ex && ex.vary) { e.grip = grip; e.width = width; }
  if (item && item.rest) e.rest = item.rest;
  return e;
}
function buildWorkout(tpl) {
  let ids = [];
  if (tpl === 'skill') {
    const sk = goalSkill() || 'handstand';
    const st = Math.min(S.skills[sk] || 0, SKILLS[sk].steps.length - 1);
    if (st > 0) ids.push(`sk:${sk}:${st - 1}`);
    ids.push(`sk:${sk}:${st}`);
    const support = { muscleup: ['vpull', 'dip'], handstand: ['vpush', 'core'], frontlever: ['hrow', 'core'], planche: ['hpush', 'dip'], lsit: ['core', 'dip'], pistol: ['squat', 'hinge'], backlever: ['hrow', 'core'], flag: ['vpull', 'core'] }[sk] || ['core'];
    ids.push(...support.map(f => currentEx(f).id));
  } else if (tpl && tpl.startsWith('r:')) {
    const r = routineById(tpl.slice(2));
    if (r) return { id: uid(), tpl, routine: r.id, disc: r.items.some(it => getEx(it.ex)?.gym) ? 'gym' : 'cal', name: r.name, start: Date.now(), date: today(), entries: r.items.filter(it => getEx(it.ex)).map(it => makeEntry(it.ex, null, null, it)) };
  } else if (TEMPLATES[tpl]) {
    ids = TEMPLATES[tpl].fams.map(f => currentEx(f).id);
  }
  return { id: uid(), tpl, disc: tpl === 'custom' && gymMode() ? 'gym' : 'cal', name: TEMPLATES[tpl] ? TEMPLATES[tpl].name : 'Workout', start: Date.now(), date: today(), entries: ids.map(id => makeEntry(id)) };
}

/* ---------- Finishing a workout: PRs, XP, skill logs ---------- */
function finalizeWorkout(w) {
  w.entries = w.entries.filter(e => doneSets(e).length);
  w.mins = Math.max(1, Math.round((Date.now() - w.start) / 60000));
  w.prs = [];
  const skillHits = [];
  for (const e of w.entries) {
    const ex = getEx(e.ex); if (!ex) continue;
    const ds = doneSets(e), top = Math.max(...ds.map(s => s.v)), topKg = Math.max(0, ...ds.map(s => s.kg || 0));
    const key = entryKey(e), prev = bestEver(key, w.id), prevKg = bestLoad(key, w.id);
    if (ex.gym && ex.kind !== 'hold') {        // gym: heaviest weight, else best estimated 1-rep max
      const hist = sessionsOf(key, w.id), prevE1 = Math.max(0, ...hist.flatMap(h => h.sets.map(s => e1rm(s.kg || 0, s.v))));
      const best = ds.reduce((b, s) => e1rm(s.kg || 0, s.v) > e1rm(b.kg || 0, b.v) ? s : b, ds[0]), e1 = e1rm(best.kg || 0, best.v);
      if (hist.length && topKg > prevKg) w.prs.push({ ex: e.ex, key, name: entryName(e), v: topKg, reps: Math.max(...ds.filter(s => (s.kg || 0) === topKg).map(s => s.v)), kind: 'kg' });
      else if (hist.length && e1 > prevE1 * 1.001) w.prs.push({ ex: e.ex, key, name: entryName(e), v: Math.round(e1 * 2) / 2, set: `${best.kg}×${best.v}`, kind: 'e1rm' });
      continue;
    }
    if (prev && top > prev.v) w.prs.push({ ex: e.ex, key, name: entryName(e), v: top, kind: ex.kind });
    else if (prev && topKg > prevKg && topKg > 0) w.prs.push({ ex: e.ex, key, name: entryName(e), v: topKg, kind: 'kg' });
    if (ex.skill) {
      S.skillLog.push({ date: w.date, skill: ex.skill, step: ex.skillStep, value: top });
      const achieved = S.skills[ex.skill] || 0;
      if (ex.skillStep === achieved && top >= ex.hi) skillHits.push({ skill: ex.skill, step: ex.skillStep });
    }
  }
  const sets = sum(w.entries.map(e => doneSets(e).length));
  w.xp = Math.min(220, 50 + sets * 3 + w.prs.length * 25);
  delete w.start;
  return { sets, skillHits };
}
function workoutVolume(w) {
  let reps = 0, secs = 0, kg = 0;
  for (const e of w.entries) { const ex = getEx(e.ex); for (const s of doneSets(e)) { ex && ex.kind === 'hold' ? (secs += s.v) : (reps += s.v); if (isGym(ex) && ex.kind !== 'hold') kg += s.v * (s.kg || 0); } }
  return { reps, secs, kg: Math.round(kg) };
}
function totalTonnage() { return sum(S.workouts.map(w => workoutVolume(w).kg)); }
function totalReps() { return sum(S.workouts.map(w => workoutVolume(w).reps)); }

/* ---------- Nutrition ---------- */
function targets(k = today()) {
  const st = S.settings, p = S.profile;
  const w = latestWeight() || 61, h = p.heightCm || 171, age = p.age || 22;
  const bmr = 10 * w + 6.25 * h - 5 * age + (p.sex === 'f' ? -161 : 5);
  const adj = { gain: 300, maintain: 0, cut: -400 }[p.bodyGoal] ?? 0;
  const kcal = st.kcalTarget || Math.round((bmr * (p.activity || 1.7) + adj) / 50) * 50;
  const protein = st.proteinTarget || Math.round(w * 1.8);
  const trained = workoutsOn(k).length > 0 || isTrainingDay(k);
  const water = st.waterTarget || Math.round((w * 35 + 500 + (trained ? 500 : 0)) / 250) * 250;
  return { kcal, protein, water };
}
function dayTotals(k = today()) {
  const d = peekFoodDay(k);
  return { kcal: Math.round(sum(d.items.map(i => i.kcal))), p: Math.round(sum(d.items.map(i => i.p))), water: d.water || 0 };
}
function allFoods() { return [...S.customFoods, ...FOODS]; }

/* Habits, streaks and daily habit XP live in habits.js */

/* ---------- Missions ---------- */
function fmtL(ml) { return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 ? 1 : 0)} L` : `${ml} ml`; }
function questMission() {
  const g = S.goal;
  if (!g) return { id: 'setgoal', title: 'Choose your Main Quest', icon: 'target', xp: 30, eval: () => ({ cur: S.goal ? 1 : 0, max: 1 }) };
  if (g.type === 'skill') {
    const sk = SKILLS[g.skill];
    return { id: 'quest', title: `Practice ${sk.name} drills`, sub: 'Main Quest', icon: 'star', xp: 50,
      eval: k => ({ cur: S.skillLog.some(l => l.date === k && l.skill === g.skill) ? 1 : 0, max: 1 }) };
  }
  if (g.type === 'lift') {
    const ex = getEx(g.ex), grp = ex ? ex.group : null;
    return { id: 'quest', title: `Train ${GROUPS[grp] ? GROUPS[grp].name.toLowerCase() : 'your lift'} today`, sub: 'Main Quest', icon: 'star', xp: 50,
      eval: k => ({ cur: workoutsOn(k).some(w => w.entries.some(e => e.ex === g.ex || getEx(e.ex)?.group === grp)) ? 1 : 0, max: 1 }) };
  }
  if (g.type === 'reps') {
    const ex = getEx(g.ex);
    return { id: 'quest', title: `Train ${FAMILIES[ex.fam].short.toLowerCase()} today`, sub: 'Main Quest', icon: 'star', xp: 50,
      eval: k => ({ cur: workoutsOn(k).some(w => w.entries.some(e => getEx(e.ex)?.fam === ex.fam)) ? 1 : 0, max: 1 }) };
  }
  return { id: 'quest', title: 'Eat to your calorie target', sub: 'Main Quest', icon: 'star', xp: 50,
    eval: k => ({ cur: dayTotals(k).kcal, max: Math.round(targets(k).kcal * 0.9) }) };
}
function dailyMissions(k = today()) {
  const t = targets(k), list = [questMission()];
  list.push(isTrainingDay(k)
    ? { id: 'workout', title: 'Complete a workout', icon: 'bolt', xp: 60, eval: d => ({ cur: workoutsOn(d).length, max: 1 }) }
    : { id: 'mobility', title: 'Rest day: 10 min of stretching', icon: 'leaf', xp: 25, manual: true });
  if (faithOn()) list.push({ id: 'faith', title: 'Read today\'s verse & pray', icon: 'cross', xp: 25, manual: true });
  const pool = [
    { id: 'water',   title: `Drink ${fmtL(t.water)} of water`, icon: 'drop', xp: 30, eval: d => ({ cur: dayTotals(d).water, max: t.water }) },
    { id: 'protein', title: `Eat ${t.protein} g of protein`, icon: 'flame', xp: 40, eval: d => ({ cur: dayTotals(d).p, max: t.protein }) },
    { id: 'meals',   title: 'Log 3 meals', icon: 'leaf', xp: 20, eval: d => ({ cur: new Set(peekFoodDay(d).items.map(i => i.meal)).size, max: 3 }) },
    { id: 'habits',  title: 'Complete 5 habits', icon: 'check', xp: 35, eval: d => ({ cur: habitsDoneCount(d), max: Math.max(1, Math.min(5, habitsDue(d).length)) }) },
  ];
  if (isTrainingDay(k)) pool.push(
    { id: 'pr',    title: 'Set a personal record', icon: 'trophy', xp: 50, eval: d => ({ cur: sum(workoutsOn(d).map(w => (w.prs || []).length)) ? 1 : 0, max: 1 }) },
    { id: 'sets',  title: 'Complete 15 sets', icon: 'bolt', xp: 35, eval: d => ({ cur: sum(workoutsOn(d).map(w => sum(w.entries.map(e => doneSets(e).length)))), max: 15 }) });
  list.push(pick(pool, hashStr(k)));
  return list.map(m => missionState(m, `m:${k}:${m.id}`, k));
}
function weeklyMissions(k = today()) {
  const wk = weekKey(k), days = Array.from({ length: 7 }, (_, i) => addDays(wk, i)).filter(d => d <= today());
  const list = [
    { id: 'wtrain', title: `Train ${S.profile.trainDays} days this week`, icon: 'bolt', xp: 200, eval: () => ({ cur: days.filter(d => workoutsOn(d).length).length, max: S.profile.trainDays }) },
    { id: 'wwater', title: 'Hit your water goal 5 days', icon: 'drop', xp: 150, eval: () => ({ cur: days.filter(d => dayTotals(d).water >= targets(d).water).length, max: 5 }) },
    faithOn() && { id: 'wfaith', title: 'Prayer & Scripture 5 days', icon: 'book', xp: 150, eval: () => ({ cur: days.filter(d => ['pray', 'word'].every(id => (S.habitLog[d] || []).includes(id))).length, max: 5 }) },
    { id: 'wweigh', title: 'Weigh in once', icon: 'scale', xp: 50, eval: () => ({ cur: S.bodyweight.some(b => b.date >= wk) ? 1 : 0, max: 1 }) },
  ];
  list.push(goalSkill()
    ? { id: 'wskill', title: 'Practice skills on 3 days', icon: 'star', xp: 120, eval: () => ({ cur: new Set(S.skillLog.filter(l => l.date >= wk).map(l => l.date)).size, max: 3 }) }
    : { id: 'wpr', title: 'Set 2 personal records', icon: 'trophy', xp: 120, eval: () => ({ cur: sum(S.workouts.filter(w => w.date >= wk).map(w => (w.prs || []).length)), max: 2 }) });
  return list.filter(Boolean).map(m => missionState(m, `wm:${wk}:${m.id}`, k));
}
function missionState(m, key, k) {
  let cur, max;
  if (m.manual) { cur = S.claimed[`done:${key}`] ? 1 : 0; max = 1; }
  else ({ cur, max } = m.eval(k));
  return { ...m, key, cur: Math.min(cur, max), max, done: cur >= max, claimed: !!S.xpLog[key] };
}
function claimableCount() { return [...dailyMissions(), ...weeklyMissions()].filter(m => m.done && !m.claimed).length; }

/* ---------- Goal progress ---------- */
function goalProgress(g = S.goal) {
  if (!g) return null;
  if (g.type === 'skill') {
    const sk = SKILLS[g.skill], n = sk.steps.length, d = Math.min(S.skills[g.skill] || 0, n);
    return { pct: d / n, cur: d, target: n, label: `${d} of ${n} steps`, next: sk.steps[d] || null };
  }
  if (g.type === 'lift') {
    const tests = (g.tests || []).map(t => t.v), rec = exRecords().find(r => r.ex === g.ex);
    const best = Math.round(Math.max(g.startValue || 0, rec ? rec.e1 : 0, ...tests) * 2) / 2;
    return { pct: clamp((best - g.startValue) / Math.max(1, g.target - g.startValue)), cur: best, target: g.target, label: `${best} / ${g.target} kg (est. 1-rep max)` };
  }
  if (g.type === 'reps') {
    const tests = (g.tests || []).map(t => t.v);
    const best = Math.max(g.startValue || 0, bestEver(g.ex)?.v || 0, ...tests);
    return { pct: clamp((best - g.startValue) / Math.max(1, g.target - g.startValue)), cur: best, target: g.target, label: `${best} / ${g.target} reps` };
  }
  const cur = latestWeight() || g.startValue;
  const span = g.target - g.startValue;
  return { pct: span ? clamp((cur - g.startValue) / span) : 0, cur, target: g.target, label: `${cur} → ${g.target} kg` };
}
function goalDaysLeft() { return S.goal ? daysBetween(today(), S.goal.deadline) : 0; }

/* ---------- Achievements ---------- */
function checkAchievements() {
  const n = S.workouts.length, prs = sum(S.workouts.map(w => (w.prs || []).length));
  const steps = sum(Object.values(S.skills)), lvl = levelInfo().lvl, st = streak(), reps = totalReps();
  const days = Object.keys(S.food);
  const water7 = days.filter(d => dayTotals(d).water >= targets(d).water).length >= 7;
  const prot7 = days.filter(d => dayTotals(d).p >= targets(d).protein).length >= 7;
  const rules = {
    first_workout: n >= 1, w10: n >= 10, w50: n >= 50, w100: n >= 100, first_pr: prs >= 1, pr10: prs >= 10,
    streak7: st >= 7, streak30: st >= 30, skill1: steps >= 1, skill10: steps >= 10, hydrated7: water7, protein7: prot7,
    reps1000: reps >= 1000, reps10000: reps >= 10000, lvl5: lvl >= 5, lvl10: lvl >= 10, lvl20: lvl >= 20,
    levelup_ex: !!S.flags?.levelupEx, goal_done: S.pastGoals.some(g => g.completed), weighin4: S.bodyweight.length >= 4,
    gym1: S.workouts.some(w => w.entries.some(e => isGym(getEx(e.ex)))), ton10: totalTonnage() >= 10000, ton100: totalTonnage() >= 100000,
  };
  const fresh = [];
  for (const a of ACHIEVEMENTS) if (rules[a.id] && !S.badges[a.id]) { S.badges[a.id] = today(); fresh.push(a); }
  for (const a of fresh) addXP(`badge:${a.id}`, 50, `Badge: ${a.name}`);
  return fresh;
}

/* ---------- Daily content ---------- */
function verseOfDay(k = today()) { return VERSES[hashStr('v' + k) % VERSES.length]; }
function quoteOfDay(k = today()) { return QUOTES[hashStr('q' + k) % QUOTES.length]; }

/* ---------- Faith mode ----------
   Off by default (a standard training app). Me → Settings → Faith mode adds the verse of the day, Scripture in
   workouts and level-ups, prayer and Bible habits and the faith missions. People who used the app before Faith
   mode existed keep it on (store.js migrate). */
const faithOn = () => !!(S && S.settings && S.settings.faith);
/* An encouraging line for a moment (level-up, finished workout): a verse in Faith mode, a training quote otherwise */
function dailyLine(seed) {
  const h = hashStr(String(seed));
  if (faithOn()) { const v = VERSES[h % VERSES.length]; return { text: v.text, ref: v.ref }; }
  return { text: QUOTES[h % QUOTES.length], ref: '' };
}
function lineHTML(l, cls = '') {
  return l.ref ? `<p class="verse-text ${cls}">“${esc(l.text)}”</p><p class="verse-ref">${esc(l.ref)}</p>` : `<p class="quote ${cls}">${esc(l.text)}</p>`;
}

/* ---------- Coach Caleb (offline assistant) ----------
   Named after Caleb, still strong at 85 (Joshua 14:11). Reads your data and answers. */
function coachReply(input) {
  const raw = input.trim(), t = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // accents off, so Spanish "tomé" matches "tome"
  const has = (...w) => w.some(x => x instanceof RegExp ? x.test(t) : t.includes(x));
  const name = S.profile.name || 'friend';
  const tg = targets(), tot = dayTotals(), li = levelInfo(), gp = goalProgress();
  const v = VERSES[Math.floor(Math.random() * VERSES.length)];
  const faith = faithOn(), vtag = x => faith ? `\n\n_“${x.text}” — ${x.ref}_` : '', vchip = faith ? 'Give me a verse' : 'Motivate me';

  // --- Actions: log weight / water from natural language
  const wm = t.match(/(?:weigh|weight|i'?m|i am|am|peso|pese|estoy en)\D{0,12}(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:kg|kilo|kilos)?\b/);
  if (wm && has('weigh', 'weight', 'kg', 'kilo', 'peso', 'pese')) {
    const kg = parseFloat(wm[1].replace(',', '.'));
    if (kg >= 30 && kg <= 200) {
      logWeight(kg);
      const first = S.bodyweight[0]?.kg;
      const diff = first != null && S.bodyweight.length > 1 ? (kg - first) : null;
      return { text: `Logged **${kg} kg** for today. ${diff != null ? `That's ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg since your first weigh-in. ` : ''}Weigh in once a week, same time (morning, after the bathroom) for honest numbers.`, chips: ['How much should I eat?', 'My progress'] };
    }
  }
  const wa = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l\b|liters?|litres?|litros?|glass(?:es)?|vasos?|cups?|tazas?|bottles?|botellas?)/);
  if (wa && has('drank', 'drink', 'water', 'had', 'add', 'tome', 'bebi', 'agua', 'agrega', 'anade', 'suma')) {
    let n = parseFloat(wa[1].replace(',', '.')), u = wa[2];
    let ml = u === 'ml' ? n : /^l|lit/.test(u) ? n * 1000 : /bottle|botella/.test(u) ? n * 500 : n * S.settings.glassMl;
    ml = Math.round(ml);
    if (ml > 0 && ml <= 5000) {
      addWater(ml);
      const left = Math.max(0, tg.water - dayTotals().water);
      return { text: `Added **${ml} ml** of water. ${left ? `${fmtL(left)} to go today.` : 'Water goal done for today! 💧'}${vtag(VERSE_WATER)}`, chips: ['What should I eat?', 'Today\'s workout'] };
    }
  }

  if (has('help', 'what can you', 'commands', 'ayuda', 'que puedes', 'comandos')) return { text: `I'm **Caleb**, your coach. I read your logs and help you climb. Try:\n• “What should I train today?”\n• “What should I focus on?” — weak spots & stalls\n• “Am I recovered?”\n• “How's my progress?”\n• “I weigh 61.5 kg” — I'll log it\n• “I drank 2 glasses” — I'll log it\n• “How much protein do I need?”\n• “I'm stuck on pull-ups”\n• “I'm sore / tired”\n• ${faith ? '“Give me a verse”' : '“Motivate me”'}`, chips: ['Today\'s workout', 'My progress', vchip] };

  if (has('pain', 'injur', 'hurt', 'sharp', 'tendon', 'elbow', 'wrist', 'shoulder pain', /\bdolor\b/, 'duele', 'lesion', 'codo', 'muneca'))
    return { text: `Listen to your body, ${name}. **Sharp or joint pain is a stop sign** — muscle burn is fine, joint pain is not.\n• Skip the movement that hurts; train what doesn't.\n• Elbows/wrists: warm up longer, reduce volume for 1–2 weeks, avoid the end range that hurts.\n• If pain is sharp, swelling, or lasts more than a week, please see a doctor or physiotherapist.${vtag(VERSES[18])}`, chips: ['Plan a light day', 'Motivate me'] };

  if (has('sore', 'tired', 'exhausted', 'fatigue', 'no energy', 'light day', /\brest\b/, 'adolorid', 'agujetas', 'cansad', 'agotad', 'sin energia', 'descans'))
    return { text: `Soreness means you challenged the muscle; it's not required for growth. Options:\n• **Light day:** mobility + skill practice (handstand / L-sit holds) at easy effort.\n• **Rest day:** walk, stretch, sleep 8 h, eat your protein (${tg.protein} g).\n• A physical job counts as activity. If you worked hard today, a short session is enough.${vtag(VERSE_REST)}`, chips: ['How much protein?', vchip] };

  if (has('stuck', 'plateau', 'not improving', 'deload', 'no progress', 'stall', 'estancad', 'meseta', 'no mejoro', 'no avanzo', 'sin progres')) {
    const st = [...new Set([...stalled().map(e => e.name), ...coachReport().stall.filter(x => x.hard).map(x => keyName(x.key))])].slice(0, 4);
    return { text: `${st.length ? `I see a stall in **${st.join(', ')}** (no improvement over 3 sessions). ` : 'Your numbers are still moving, but here\'s the plateau playbook: '}\n• **Deload** one week: same exercises, half the sets.\n• **Eat & sleep:** at ~${latestWeight() || '60'} kg, eat ~${tg.kcal} kcal and ${tg.protein} g protein. Under-eating is the #1 plateau cause.\n• **Change the stimulus:** slow negatives (5 s), pauses at the hardest point, or add a backpack load.\n• **Grease the groove:** a few easy sets of the stuck move through the day.${vtag(VERSES[6])}`, chips: ['Today\'s workout', 'How much should I eat?'] };
  }

  if (has('deload', 'fatigue', 'overtrain', 'recover', 'readiness', 'descarga', 'sobreentren', 'recupera')) {
    const R = coachReport(), rec = R.insights.filter(i => ['deload', 'deload-on', 'rest', 'spike', 'drop'].includes(i.id) || i.id.startsWith('b2b'));
    return { text: rec.length ? rec.map(i => `**${i.title}** — ${i.body}`).join('\n\n') : `Recovery looks fine: ${R.last7} session${R.last7 === 1 ? '' : 's'} in 7 days${R.acwr !== null ? `, load ${Math.round(R.acwr * 10) / 10}× your recent average` : ''}, ${R.consec ? `${R.consec} training day${R.consec === 1 ? '' : 's'} in a row` : 'and you rested yesterday'}. Keep sleeping 7–9 h and eating your protein.`, chips: ['What should I focus on?', 'Today\'s workout'] };
  }
  if (has('weak', 'undertrain', 'under-train', 'muscle group', 'volume', 'imbalance', 'balance', 'focus on', 'prioriti', 'analy', 'stagnat', 'debil', 'desequilibr', 'equilibr', 'enfoc', 'priori', 'analiz', 'volumen', 'grupo muscular')) {
    const R = coachReport(), f = R.insights.filter(i => i.kind === 'warn' || i.kind === 'alert').slice(0, 3), good = R.insights.find(i => i.id === 'progress');
    const low = R.groups.filter(x => x.g !== 'forearms' && x.sets < x.lo * .75).map(x => `${GROUPS[x.g].name} ${x.sets}/${x.lo}`);
    return { text: `${f.length ? `Here's what I'd prioritize:\n${f.map(i => `• **${i.title}** — ${i.body}`).join('\n')}` : 'Nothing is flagged right now — your training is balanced.'}${low.length ? `\n\nSets this week below target: ${low.join(' · ')}.` : ''}${good ? `\n\n📈 ${good.body}` : ''}\n\nOpen **Train → Coach** for every number behind this.`, chips: ['Today\'s workout', 'Am I recovered?'] };
  }
  if (has('skill', 'muscle-up', 'muscleup', 'muscle up', 'handstand', 'lever', 'planche', 'l-sit', 'lsit', 'pistol', 'flag', 'goal', 'quest', 'next step', 'habilidad', 'parada de manos', 'bandera', 'meta', 'mision', 'siguiente paso')) {
    let sk = Object.keys(SKILLS).find(k => t.includes(k) || t.includes(SKILLS[k].name.toLowerCase()) || (k === 'muscleup' && t.includes('muscle')) || (k === 'frontlever' && t.includes('front')) || (k === 'backlever' && t.includes('back lever')));
    sk = sk || goalSkill();
    if (sk) {
      const s = SKILLS[sk], d = S.skills[sk] || 0, step = s.steps[d];
      if (!step) return { text: `You've completed the whole **${s.name}** tree. 🏆 Pick a new Main Quest in Me — the mountain keeps going up.` };
      const last = S.skillLog.filter(l => l.skill === sk && l.step === d).slice(-1)[0];
      return { text: `**${s.name}** — step ${d + 1} of ${s.steps.length}: **${step.name}**\nTarget: ${step.target}${step.kind === 'hold' ? ' s hold' : ' reps'}${last ? ` · your last: ${last.value}${step.kind === 'hold' ? ' s' : ''}` : ''}\n\n💡 ${step.tip}\n\nPractice 3–5 quality attempts, 2–3× per week, when you're fresh (before strength work). Quality beats quantity on skills.`, chips: ['Today\'s workout', 'Motivate me'], action: { label: 'Open skill', act: 'openskill', skill: sk } };
    }
    if (gp) return { text: `**Main Quest: ${S.goal.title}** — ${Math.round(gp.pct * 100)}% (${gp.label}). ${goalDaysLeft() >= 0 ? `${goalDaysLeft()} days left.` : 'Deadline passed — adjust it in Me, no shame.'}`, chips: ['Today\'s workout'] };
  }

  if (has('water', 'hydrat', 'thirst', 'drink', 'agua', 'hidrat', /sed/, 'beber'))
    return { text: `Today: **${fmtL(tot.water)} / ${fmtL(tg.water)}**. ${tot.water >= tg.water ? 'Goal done! 💧' : `${fmtL(tg.water - tot.water)} left.`}\nWorking or training in the heat? Add 500 ml–1 L, and a pinch of salt + lemon or panela helps replace sweat.\n\nTell me “I drank 2 glasses” and I'll log it.`, chips: ['I drank 1 glass', 'How much protein?'] };

  if (has('protein', /\beat\b/, 'food', 'calor', 'diet', 'nutrition', 'meal', 'bulk', /\bgain\b/, 'mass', 'hungry', 'proteina', /\bcomer\b/, 'comida', 'dieta', 'nutricion', 'hambre', /\bmasa\b/, 'ganar peso'))
    return { text: `Your targets: **${tg.kcal} kcal** and **${tg.protein} g protein** (1.8 g/kg).\nToday so far: ${tot.kcal} kcal · ${tot.p} g protein.\n\nCheap, high-protein foods:\n• **Eggs** — 6 g each. 4 eggs = 25 g\n• **Beans/lentils + rice** — complete protein, ~20 g per plate\n• **Milk** — 8 g per glass; 2–3 glasses a day is easy protein & calories\n• **Canned tuna/sardines** — 22–28 g per can\n• **Fresh cheese, peanut butter, oats, plantain, potatoes** for calories\n\n${S.profile.bodyGoal === 'gain' ? 'To gain lean muscle: aim for +0.25 kg per week. Not gaining after 2 weeks? Add a glass of milk + a banana + 2 tbsp peanut butter (~450 kcal).' : ''}${vtag(VERSE_FOOD)}`, chips: ['I weigh 61 kg', 'Today\'s workout'] };

  if (has('what should', 'today', 'train', 'workout', /\bplan\b/, 'routine', 'session', 'que entreno', 'que hago', 'hoy', 'entren', 'rutina', 'sesion')) {
    if (S.active) return { text: `You've got **${S.active.name}** in progress. Finish strong — head to Train.`, chips: ['Motivate me'] };
    const tpl = nextTemplate(), w = buildWorkout(tpl);
    const lines = w.entries.map(e => { const ex = getEx(e.ex); return `• **${entryName(e)}** — ${e.sets.map(s => s.t).join(' · ')}${unitOf(ex)}${e.sets[0].kg ? ` @ ${kgLabel(ex, e.sets[0].kg)}` : ''}`; });
    const done = workoutsOn(today()).length;
    return { text: `${done ? 'You already trained today 💪 If you want more, here\'s the next session:' : isTrainingDay() ? 'Today is a training day. Next up:' : 'Scheduled rest day — but if you feel fresh, here\'s the next session:'} **${w.name}**\n${lines.join('\n')}\n\n${isDeload() ? 'Deload week: everything is a little lighter on purpose. ' : ''}Targets come from your last session (progressive overload).`, chips: ['Start workout', 'I\'m sore'], action: done ? null : { label: `Start ${w.name}`, act: 'start', tpl } };
  }

  if (has('progress', 'how am i', 'stats', 'level', 'doing', 'progres', 'como voy', 'estadistic', 'nivel')) {
    const wk = weekKey(), weekW = S.workouts.filter(w => w.date >= wk).length;
    const prs = sum(S.workouts.slice(-10).map(w => (w.prs || []).length));
    return { text: `Here's where you stand, ${name}:\n• **Level ${li.lvl} · ${li.title}** — ${li.need - li.into} XP to the next level\n• **Streak:** ${streak()} days\n• **This week:** ${weekW}/${S.profile.trainDays} workouts\n• **Workouts total:** ${S.workouts.length} · ${totalReps().toLocaleString()} reps\n• **Recent PRs:** ${prs} in your last 10 sessions\n${gp ? `• **Main Quest:** ${S.goal.title} — ${Math.round(gp.pct * 100)}% (${gp.label})` : '• No Main Quest yet — set one in Me.'}\n\n${prs ? 'You\'re getting stronger. Keep stacking.' : 'Log every set — progress you can see is progress you\'ll keep.'}`, chips: ['Next skill step', 'Today\'s workout'] };
  }

  if (has('sleep', 'insomnia', 'dormir', 'sueno', 'insomnio'))
    return { text: `Sleep is where the muscle is built. Aim for **7–9 h**. Early mornings? Then protect the bedtime: screens off 30 min before, ${faith ? 'a short prayer, ' : 'a calm wind-down, '}same time every night.`, chips: [vchip] };

  if (faith && has('verse', 'pray', 'god', 'jesus', 'faith', 'bible', 'scripture', 'lord', 'christ', 'versiculo', 'orar', 'oracion', 'dios', /fe/, 'biblia', 'escritura', 'senor', 'cristo'))
    return { text: `_“${v.text}”_\n— **${v.ref}**\n\n${v.note}\n\n🙏 *Lord Jesus, thank You for this body and this day. Give me strength to train with discipline, humility in my progress, and a heart that gives You the glory. Amen.*`, chips: ['Motivate me', 'Today\'s workout'] };

  if (has('motivat', 'lazy', 'give up', 'quit', 'don\'t feel', 'dont feel', 'unmotivated', 'sad', 'discourag', 'hard', 'motiva', 'pereza', 'flojer', 'rendir', 'sin ganas', 'no tengo ganas', 'triste', 'desanim', 'dificil'))
    return { text: `${name}, you started with nothing but a decision. You're still here. That's not luck — that's character.\n\n**“${quoteOfDay()}”**\n\nDo just the warm-up. If you still want to stop after 10 minutes, stop. You almost never will.${vtag(v)}`, chips: ['Today\'s workout', faith ? 'Give me a verse' : 'My progress'] };

  if (has('thank', 'thanks', 'amen', 'great', 'awesome', 'nice', 'gracias', 'genial', 'excelente', 'chevere', 'bacano'))
    return { text: `${faith ? 'Glory to God' : 'Anytime'}, ${name}. Keep climbing. 🏔️`, chips: ['My progress'] };

  if (has(/\b(hi|hello|hey|hola|yo|buenas)\b/, 'good morning', 'good evening', 'buenos dias', 'buenas tardes', 'buenas noches'))
    return { text: `Hey ${name}! Level ${li.lvl} ${li.title}, ${streak()}-day streak. ${isTrainingDay() ? 'Training day today.' : 'Rest day today.'} What do you need?`, chips: ['Today\'s workout', 'My progress', vchip] };

  return { text: `I'm not sure I got that. I'm an offline coach, so I understand training, food, water, skills and progress${faith ? ' and faith' : ''} questions. Try one of these:`, chips: ['Today\'s workout', 'My progress', 'How much protein?', 'Help'] };
}
