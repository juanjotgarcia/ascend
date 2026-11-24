/* ZELUM — Coach Caleb's training analysis.
   Reads the workout log only (no guesses, no randomness) and turns it into ranked, explained advice:
   progress and stalls per exercise, weekly sets per muscle group, push/pull balance, training load,
   fatigue and recovery, consistency, and whether the split fits the weeks the athlete really trains.
   Every insight carries the numbers and the rule that produced it. */

const COACH_RULES = [
  ['Double progression', 'Work inside your rep range. When every set reaches the top of the range, add the smallest weight step (never more than about 10%) and start again at the bottom.'],
  ['Stalls', 'Three sessions in a row without a better estimated 1-rep max, at hard effort, count as a stall: reset about 10% lighter and build back, or swap to a similar exercise.'],
  ['Missed reps', 'Below the range on most sets once → repeat the weight. Twice in a row → 5–8% lighter.'],
  ['Weekly sets per muscle', 'Main muscles count 1 set, helping muscles ½ a set. Big groups aim for about 8–12 hard sets a week as a beginner, 10–16 intermediate and 12–20 advanced, scaled for your goal and the muscle\'s size.'],
  ['Frequency', 'Spreading a muscle\'s weekly sets over 2 or more days usually builds more than one big day.'],
  ['Balance', 'More than 1.5 pushing sets for every pulling set, or quads trained 2.5× more than hamstrings, gets flagged for joint health.'],
  ['Load spikes', 'If this week\'s volume is more than 1.5× your average of the 3 weeks before, keep the next session steady.'],
  ['Fatigue & deloads', 'When most sets end 1 rep from failure (or at failure) and lifts stall, take a deload week: about 10% lighter, one set fewer, then push again.'],
  ['Rest', 'Five or more training days in a row without rest → take a rest or mobility day.'],
  ['Estimated 1-rep max', 'weight × (1 + reps ÷ 30) — the Epley formula. Used to compare sets with different weights and reps; never a target to test.'],
  ['Safety', 'This is training guidance, not medical advice. Sharp or joint pain means stop that exercise and get it checked.'],
];
const GROUP_SCALE = { chest: 1, back: 1.1, shoulders: .9, biceps: .6, triceps: .6, forearms: .35, quads: 1, hamstrings: .8, glutes: .7, calves: .6, core: .6 };
const GROUP_PATS = { chest: ['ipress', 'fly', 'hpress'], back: ['hpull', 'vpull', 'pullover'], shoulders: ['raise', 'rear', 'vpress'], biceps: ['curl'], triceps: ['tri'],
  quads: ['kext', 'squat', 'lunge'], hamstrings: ['kflex', 'hinge'], glutes: ['thrust', 'gluteiso', 'abd'], calves: ['calf'], core: ['core'], forearms: ['forearm', 'carry'] };
const PUSH_PATS = ['hpress', 'ipress', 'vpress', 'fly', 'dip'], PULL_PATS = ['vpull', 'hpull', 'rear', 'pullover'];

function setTarget(g) {
  const base = { 1: [8, 12], 2: [10, 16], 3: [12, 20] }[expLv()], fm = { strength: .8, hypertrophy: 1, endurance: .8, general: .7 }[S.profile.focus] ?? 1, gm = GROUP_SCALE[g] ?? 1;
  return [Math.max(2, Math.round(base[0] * fm * gm)), Math.max(3, Math.round(base[1] * fm * gm))];
}
const fmt1 = n => (Math.round(n * 10) / 10).toString();

function coachReport() {
  const memoKey = `${S.updatedAt}|${today()}|${S.workouts.length}`;
  if (coachReport.memo && coachReport.memo.key === memoKey) return coachReport.memo.r;
  const r = buildReport(); coachReport.memo = { key: memoKey, r }; return r;
}

function buildReport() {
  const t = today(), BW = latestWeight() || 65, W = S.workouts, ins = [], gym = gymMode();
  const inWin = (a, b) => W.filter(w => w.date >= a && w.date <= b);
  const weeks = [0, 1, 2, 3].map(i => inWin(addDays(t, -6 - 7 * i), addDays(t, -7 * i)));
  const volOf = ws => sum(ws.flatMap(w => w.entries.map(e => { const ex = getEx(e.ex); return sum(doneSets(e).map(s => setVol(ex, s, BW))); })));
  const last7 = weeks[0], last14 = inWin(addDays(t, -13), t), last28 = inWin(addDays(t, -27), t);

  /* --- Sets per muscle group (last 7 days) --- */
  const groups = Object.keys(GROUPS).map(g => ({ g, sets: 0, days: new Set(), byDay: {} }));
  const G = Object.fromEntries(groups.map(x => [x.g, x]));
  for (const w of last7) for (const e of w.entries) {
    const n = doneSets(e).length; if (!n) continue;
    for (const [g, f] of Object.entries(exGroups(e.ex))) { if (!G[g]) continue; G[g].sets += n * f; if (f === 1) { G[g].byDay[w.date] = (G[g].byDay[w.date] || 0) + n; if (n >= 2) G[g].days.add(w.date); } }
  }
  for (const x of groups) { [x.lo, x.hi] = setTarget(x.g); x.sets = Math.round(x.sets * 2) / 2; }

  /* --- Load, streaks, effort --- */
  const acute = volOf(last7), chronicWeeks = weeks.slice(1).filter(w => w.length), chronic = chronicWeeks.length ? sum(chronicWeeks.map(volOf)) / chronicWeeks.length : 0;
  const acwr = chronic > 0 ? acute / chronic : null;
  let consec = 0; { let d = workoutsOn(t).length ? t : addDays(t, -1); while (workoutsOn(d).length) { consec++; d = addDays(d, -1); } }
  const rated = last14.flatMap(w => w.entries.filter(e => e.effort && doneSets(e).length)), hardShare = rated.length ? rated.filter(e => e.effort >= 3).length / rated.length : 0;
  const first = W.length ? W[0].date : t, weeksCovered = Math.min(4, Math.max(0, Math.floor(daysBetween(first, t) / 7) + (daysBetween(first, t) % 7 >= 3 ? 1 : 0)));
  const adherence = weeksCovered ? last28.length / (S.profile.trainDays * weeksCovered) : null;

  /* --- Exercise trends (last 8 weeks) --- */
  const keys = [...new Set(inWin(addDays(t, -55), t).flatMap(w => w.entries.filter(e => doneSets(e).length && !getEx(e.ex)?.skill).map(entryKey)))];
  const trends = keys.map(k => {
    const ex = getEx(parseKey(k).ex), ss = sessionsOf(k, null, 10).filter(s => s.date >= addDays(t, -55)).reverse();
    const m = s => isGym(ex) && ex.kind !== 'hold' ? Math.max(...s.sets.map(x => e1rm(x.kg || 0, x.v))) : Math.max(...s.sets.map(x => x.v * (1 + (x.kg || 0) / BW)));
    const vals = ss.map(m), n = vals.length;
    const change = n >= 2 && vals[0] > 0 ? (vals[n - 1] - vals[0]) / vals[0] : 0;
    const before = n >= 4 ? Math.max(...vals.slice(0, n - 3)) : null, recent = n >= 4 ? Math.max(...vals.slice(-3)) : null;
    const hard = ss.slice(-2).every(s => (s.effort || 0) >= 3);
    return { key: k, ex, n, change, from: vals[0], to: vals[n - 1], weeks: n >= 2 ? Math.max(1, Math.round(daysBetween(ss[0].date, ss[n - 1].date) / 7)) : 0,
      stalled: n >= 4 && recent <= before * 1.005, hard, gym: isGym(ex) && ex.kind !== 'hold' };
  });
  const prog = trends.filter(x => x.n >= 3 && x.change >= .03).sort((a, b) => b.change - a.change);
  const stall = trends.filter(x => x.stalled).sort((a, b) => (b.hard - a.hard) || (b.n - a.n));
  const ready = keys.map(k => ({ k, r: recommend(k) })).filter(x => x.r.status === 'load' || x.r.status === 'levelup');
  const prs14 = sum(last14.map(w => (w.prs || []).length));
  const name = k => esc(keyName(k));

  /* --- No data yet --- */
  if (!W.length) {
    ins.push({ id: 'start', kind: 'info', pri: 1, icon: 'bolt', title: 'Log your first workouts', body: 'I build every recommendation from your own sets, reps, weights and effort ratings. After 2–3 sessions I can show progress, weak spots and recovery.', why: ['No workouts logged yet.'] });
  }

  /* --- Deload / recovery --- */
  if (isDeload()) ins.push({ id: 'deload-on', kind: 'info', pri: 0, icon: 'moon', title: `Deload week until ${fmtDate(S.deload.until, { weekday: 'short', day: 'numeric', month: 'short' })}`,
    body: 'Targets are about 10% lighter with one set fewer. Move well, sleep, eat your protein — strength comes back higher next week.', why: ['You started a deload week.'], act: { label: 'End deload now', act: 'coachEndDeload' } });
  if (consec >= 5) ins.push({ id: 'rest', kind: 'alert', pri: 1, icon: 'moon', title: 'Take a rest day', body: `You've trained ${consec} days in a row. Muscles rebuild between sessions — a rest or mobility day now protects the next week.`,
    why: [`${consec} consecutive training days.`, 'Rule: 5+ days in a row without rest → rest day.'] });
  const stallHard = stall.filter(x => x.hard).length;
  if (!isDeload() && W.length >= 8 && ((rated.length >= 8 && hardShare >= .65 && (stallHard >= 1 || (acwr && acwr > 1.3))) || stallHard >= 3)) {
    ins.push({ id: 'deload', kind: 'alert', pri: 1, icon: 'moon', title: 'Time for a deload week', body: 'Fatigue is piling up faster than it clears: most sets end at or near failure and lifts have stopped moving. One lighter week usually unlocks new records.',
      why: [`${Math.round(hardShare * 100)}% of rated exercises in 14 days were "1 left" or "Failure".`, `${stall.length} exercise${stall.length === 1 ? '' : 's'} stalled.`, ...(acwr ? [`This week's load is ${fmt1(acwr)}× your recent average.`] : [])],
      act: { label: 'Start deload week', act: 'coachDeload' } });
  }
  if (acwr && acwr >= 1.5 && last7.length >= 2) ins.push({ id: 'spike', kind: 'warn', pri: 2, icon: 'chart', title: 'Training load jumped', body: `This week's volume is ${Math.round((acwr - 1) * 100)}% above your 3-week average. Big jumps raise fatigue and injury risk — keep the next session steady rather than adding more.`,
    why: [`7-day volume ${fmtN(acute)} vs ${fmtN(chronic)} average.`, 'Rule: more than 1.5× the recent average → hold steady.'] });
  if (acwr !== null && acwr <= .5 && chronicWeeks.length >= 2) ins.push({ id: 'drop', kind: 'info', pri: 3, icon: 'chart', title: 'Training dropped this week', body: 'Volume is less than half your usual. Rest is fine — if life got busy, a short full-body session keeps the progress you built.',
    why: [`7-day volume is ${Math.round(acwr * 100)}% of your 3-week average.`] });
  for (const x of groups) {
    const days = Object.entries(x.byDay).sort(([a], [b]) => a.localeCompare(b));
    for (let i = 1; i < days.length; i++) if (daysBetween(days[i - 1][0], days[i][0]) === 1 && days[i - 1][1] >= 6 && days[i][1] >= 6) {
      ins.push({ id: 'b2b-' + x.g, kind: 'warn', pri: 3, icon: 'moon', title: `${GROUPS[x.g].name}: back-to-back hard days`, body: `${GROUPS[x.g].name} got 6+ hard sets on two days in a row. Give a muscle about 48 hours before training it hard again.`,
        why: [`${days[i - 1][1]} sets on ${relDay(days[i - 1][0])}, ${days[i][1]} on ${relDay(days[i][0])}.`] });
      break;
    }
  }

  /* --- Consistency --- */
  if (adherence !== null && weeksCovered >= 2) {
    const avg = last28.length / weeksCovered;
    if (adherence < .6 && S.profile.trainDays > 2) {
      const n = Math.max(2, Math.min(S.profile.trainDays - 1, Math.round(avg)));
      ins.push({ id: 'adherence', kind: 'warn', pri: 2, icon: 'calendar', title: 'Your plan is bigger than your week', body: `You've averaged ${fmt1(avg)} sessions a week against a plan of ${S.profile.trainDays}. A plan you can finish beats a perfect one you can't — ${n} days${gym ? ` with a ${SPLITS[autoSplit(n)].name} split` : ''} would cover every muscle.`,
        why: [`${last28.length} sessions in the last ${weeksCovered} week${weeksCovered > 1 ? 's' : ''} (${Math.round(adherence * 100)}% of plan).`, 'Rule: under 60% of planned sessions → plan fewer days.'],
        act: { label: `Plan ${n} days a week`, act: 'coachDays', v: n } });
    } else if (adherence >= .9) ins.push({ id: 'consistent', kind: 'good', pri: 6, icon: 'flame', title: 'Rock-solid consistency', body: `${Math.round(Math.min(1, adherence) * 100)}% of planned sessions in the last ${weeksCovered} weeks. Consistency is the engine of every other number here.`, why: [`${last28.length} sessions, plan of ${S.profile.trainDays}/week.`] });
  }

  /* --- Muscle volume & frequency --- */
  if (last7.length >= 2 || (last7.length >= 1 && S.profile.trainDays <= 2)) {
    const under = groups.filter(x => x.g !== 'forearms' && x.sets < x.lo * .75).sort((a, b) => (a.sets / a.lo) - (b.sets / b.lo));
    under.slice(0, 2).forEach((x, i) => ins.push({ id: 'under-' + x.g, kind: 'warn', pri: 3 + i * .1, icon: 'target', title: `More work for ${GROUPS[x.g].name.toLowerCase()}`,
      body: `${x.sets} set${x.sets === 1 ? '' : 's'} this week; your target is ${x.lo}–${x.hi}. ${x.sets === 0 ? 'It got no direct work at all.' : `About ${Math.max(2, Math.round(x.lo - x.sets))} more sets would get it into the growth zone.`}`,
      why: [`Counted from the last 7 days: main muscle = 1 set, helper = ½.`, `Target for ${LEVELS[expLv()].toLowerCase()} · ${(FOCUS[S.profile.focus] || FOCUS.hypertrophy).name.toLowerCase()}: ${x.lo}–${x.hi} sets.`],
      act: gym ? { label: `Add ${GROUPS[x.g].name.toLowerCase()} to my plan`, act: 'coachAddVol', g: x.g } : null }));
    const over = groups.filter(x => x.sets > x.hi * 1.4 && x.sets >= 12);
    if (over.length) ins.push({ id: 'over', kind: 'info', pri: 4, icon: 'chart', title: `Very high volume: ${over.map(x => GROUPS[x.g].name).join(', ')}`, body: 'More than you can likely recover from in a week. Extra sets past this point add fatigue faster than muscle; trim 2–4 sets if joints ache or reps drop.',
      why: over.map(x => `${GROUPS[x.g].name}: ${x.sets} sets (target ${x.lo}–${x.hi}).`) });
    if (['hypertrophy', 'general'].includes(S.profile.focus) && S.profile.trainDays >= 3) {
      const once = groups.filter(x => ['chest', 'back', 'quads', 'shoulders', 'hamstrings'].includes(x.g) && x.days.size === 1 && x.sets >= 6);
      if (once.length) ins.push({ id: 'freq', kind: 'info', pri: 4, icon: 'calendar', title: 'Hit muscles twice a week', body: `${once.map(x => GROUPS[x.g].name).join(', ')} trained on one day only. Splitting the same sets over two days usually grows more.`,
        why: once.map(x => `${GROUPS[x.g].name}: ${x.sets} sets, 1 day.`), act: gym && planSplit() === 'bro' ? { label: `Switch to ${SPLITS[autoSplit()].name}`, act: 'coachSplit', v: autoSplit() } : null });
    }
  }

  /* --- Balance (last 14 days) --- */
  const patSets = pats => sum(last14.flatMap(w => w.entries.filter(e => pats.includes(getEx(e.ex)?.pat)).map(e => doneSets(e).length)));
  const push = patSets(PUSH_PATS), pull = patSets(PULL_PATS), quad = patSets(['squat', 'lunge', 'kext']), ham = patSets(['hinge', 'kflex']);
  if (push >= 8 && push > pull * 1.5) ins.push({ id: 'pushpull', kind: 'warn', pri: 3, icon: 'pull', title: 'More pushing than pulling', body: `${push} pushing sets vs ${pull} pulling in two weeks. Strong pulling (rows, pulldowns, face pulls) balances the shoulders and posture.`,
    why: [`Push ${push} : pull ${pull} = ${fmt1(push / Math.max(1, pull))} : 1.`, 'Rule: more than 1.5 : 1 gets flagged.'], act: gym ? { label: 'Add pulling to my plan', act: 'coachAddVol', g: 'back' } : null });
  if (quad >= 6 && quad > ham * 2.5 && !ins.some(i => i.id === 'under-hamstrings')) ins.push({ id: 'quadham', kind: 'warn', pri: 3, icon: 'legs', title: 'Hamstrings are falling behind', body: `${quad} quad sets vs ${ham} for hamstrings in two weeks. Hinges and leg curls protect the knees and add power.`,
    why: [`Quads ${quad} : hamstrings ${ham}.`], act: gym ? { label: 'Add hamstrings to my plan', act: 'coachAddVol', g: 'hamstrings' } : null });

  /* --- Exercise progress --- */
  stall.slice(0, 2).forEach((x, i) => {
    const subs = x.ex && !x.ex.cal ? substitutes(x.ex.id, 3).map(id => getEx(id).name) : [];
    ins.push({ id: 'stall-' + x.key, kind: 'warn', pri: 2 + i * .1, icon: 'mountain', title: `${keyName(x.key)} has stalled`,
      body: `No improvement over the last 3 sessions${x.hard ? ' even at hard effort' : ''}. ${x.gym ? 'Reset about 10% lighter and build back up with clean reps' : 'Slow the lowering to 3 seconds and add one set'}${subs.length ? `, or swap for ${subs.slice(0, 2).join(' / ')} for 4–6 weeks` : ''}. Sleep and enough protein matter here too.`,
      why: [`Best ${x.gym ? 'estimated max' : 'set'} before: ${fmt1(x.gym ? x.from : x.from)}${x.gym ? ' kg' : ''}; recent 3 sessions did not beat the earlier best.`, 'Rule: 3 sessions without a better best → stall.'],
      act: x.ex && !x.ex.cal ? { label: 'See substitutes', act: 'coachSwap', ex: x.ex.id } : null });
  });
  if (ready.length) ins.push({ id: 'ready', kind: 'good', pri: 3.5, icon: 'up', title: `Ready to progress: ${ready.length} exercise${ready.length === 1 ? '' : 's'}`,
    body: ready.slice(0, 4).map(x => { const ex = getEx(parseKey(x.k).ex); return `${keyName(x.k)} → ${x.r.status === 'levelup' ? EX[x.r.next].name : `${x.r.kg} kg${isGym(ex) ? '' : ' added'}`}`; }).join(' · '),
    why: ['You reached the top of the range on every set last time.', 'Double progression: add the smallest step, restart at the bottom of the range.'] });
  if (prog.length) ins.push({ id: 'progress', kind: 'good', pri: 5, icon: 'chart', title: 'Where you\'re getting stronger',
    body: prog.slice(0, 3).map(x => `${keyName(x.key)} +${Math.round(x.change * 100)}%${x.gym ? ` (est. max ${Math.round(x.from)} → ${Math.round(x.to)} kg)` : ''} in ${x.weeks} wk`).join(' · '),
    why: ['Compared your first and latest session of each exercise over the last 8 weeks (estimated 1-rep max for weights, best set for bodyweight).'] });
  if (prs14) ins.push({ id: 'prs', kind: 'good', pri: 6, icon: 'trophy', title: `${prs14} personal record${prs14 > 1 ? 's' : ''} in two weeks`, body: 'Records are the clearest proof the plan is working. Keep the same exercises long enough to keep breaking them.', why: [`${prs14} PRs logged since ${fmtDate(addDays(t, -13), { month: 'short', day: 'numeric' })}.`] });

  /* --- Split fit (gym) --- */
  if (gym && S.plan) {
    const sp = S.plan.split, best = SPLITS[sp] ? SPLITS[sp].best : null;
    if (sp === 'bro' && S.profile.focus !== 'strength' && !ins.some(i => i.id === 'freq'))
      ins.push({ id: 'split-bro', kind: 'info', pri: 4, icon: 'calendar', title: 'Each muscle gets one day a week', body: `A body-part split trains each muscle once. ${SPLITS[autoSplit()].name} uses the same days to hit everything twice — usually better for growth.`,
        why: ['Body-part split: every group appears on one day of the rotation.'], act: { label: `Switch to ${SPLITS[autoSplit()].name}`, act: 'coachSplit', v: autoSplit() } });
    else if (best && !best.includes(S.profile.trainDays) && SPLITS[sp] && sp !== autoSplit())
      ins.push({ id: 'split-fit', kind: 'info', pri: 4, icon: 'calendar', title: `${SPLITS[sp].name} fits ${best.join(' or ')} days`, body: `You plan ${S.profile.trainDays} days, so some muscles come round less often than others. ${SPLITS[autoSplit()].name} matches ${S.profile.trainDays} days.`,
        why: [`${SPLITS[sp].name}: ${SPLITS[sp].days.length}-day rotation over ${S.profile.trainDays} weekly sessions.`], act: { label: `Switch to ${SPLITS[autoSplit()].name}`, act: 'coachSplit', v: autoSplit() } });
  }

  /* --- Bodyweight vs goal --- */
  const bw = S.bodyweight.filter(b => b.date >= addDays(t, -35));
  if (bw.length >= 3 && S.profile.bodyGoal === 'gain' && W.length >= 8) {
    const d = bw[bw.length - 1].kg - bw[0].kg, wk = Math.max(1, daysBetween(bw[0].date, bw[bw.length - 1].date) / 7);
    if (d / wk < .05) ins.push({ id: 'bw-gain', kind: 'info', pri: 4, icon: 'scale', title: 'Weight isn\'t moving', body: `Your goal is lean gain but bodyweight changed ${d >= 0 ? '+' : ''}${fmt1(d)} kg in ${Math.round(wk)} weeks. Muscle needs fuel: add about 200 kcal a day (a glass of milk and a banana).`,
      why: [`${bw.length} weigh-ins over ${Math.round(wk)} weeks.`, 'Lean gain target: about +0.25 kg a week.'] });
  }
  if (S.profile.bodyGoal === 'cut' && stall.length && W.length >= 8)
    ins.push({ id: 'bw-cut', kind: 'info', pri: 5, icon: 'scale', title: 'Holding strength while losing fat', body: 'Slower progress is normal in a calorie deficit. Keeping your numbers steady is a win — keep protein high and do not cut volume.', why: ['Body goal: fat loss.', `${stall.length} exercise(s) flat.`] });
  if (expLv() === 1 && W.length < 12 && W.length) ins.push({ id: 'beginner', kind: 'info', pri: 5, icon: 'star', title: 'Beginner gains are real', body: 'You can add weight or reps almost every session right now. Own the technique first; Zelum raises the targets as soon as you hit the top of the range.', why: ['Experience: beginner.', `${W.length} workouts logged.`] });

  if (!ins.length) ins.push({ id: 'collecting', kind: 'info', pri: 9, icon: 'chart', title: 'Building your picture', body: 'Nothing needs changing yet. Log your sets and rate the effort after each exercise — with two sessions in a week I can compare muscles, spot stalls and check recovery.', why: [`${last7.length} session${last7.length === 1 ? '' : 's'} in the last 7 days, ${W.length} in total.`] });
  ins.sort((a, b) => a.pri - b.pri);
  const nextTpl = S.active ? null : nextTemplate();
  return { insights: ins, groups, acwr, acute, chronic, consec, adherence, weeksCovered, hardShare, rated: rated.length, prog, stall, ready, prs14, last7: last7.length, push, pull, nextTpl };
}

/* The one or two things to focus on next, in plain words */
function coachFocus(R = coachReport()) {
  const top = R.insights.filter(i => i.kind === 'alert' || i.kind === 'warn').slice(0, 2);
  return top.length ? top : R.insights.filter(i => i.kind === 'good').slice(0, 1);
}

/* Add work for an under-trained group to the gym plan: the day that already trains it (or the shortest day) */
function addVolumeToPlan(g) {
  const days = planRoutines(); if (!days.length) return null;
  const pats = GROUP_PATS[g] || [];
  const fits = days.filter(r => r.items.some(it => exGroups(it.ex)[g] === 1) || (DAYS[r.day] && DAYS[r.day].slots.some(([p]) => pats.includes(p))));
  const r = (fits.length ? fits : days).slice().sort((a, b) => a.items.length - b.items.length)[0];
  for (const pat of pats) {
    const ex = pickFor(pat, r.items.map(it => it.ex));
    if (ex && !r.items.some(it => it.ex === ex.id)) {
      const rg = ex.gym ? gymRange(ex) : { lo: ex.lo, hi: ex.hi };
      r.items.push({ ex: ex.id, sets: 3, lo: rg.lo, hi: rg.hi, rest: gymRest(ex) });
      r.edited = true;
      return { routine: r, ex };
    }
  }
  const it = r.items.find(x => exGroups(x.ex)[g] === 1);
  if (it) { it.sets = Math.min(6, it.sets + 1); r.edited = true; return { routine: r, ex: getEx(it.ex), addedSet: true }; }
  return null;
}
