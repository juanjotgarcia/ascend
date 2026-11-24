/* LEDGER — Train screen pieces shared by both disciplines: discipline switch, gym plan & weekly
   schedule, routine editor, exercise library & detail, personal records, the coach tab and the
   training setup sheet. Views return HTML strings; actions live in TRAIN_ACT / TRAIN_CHG / TRAIN_INP. */

let libQ = '', libGroup = '', libKit = '', libMech = '', libFav = false, recFilter = 'all';
let rtDraft = null, rtPicking = false, rtPickQ = '', rtPickGroup = '';
let setupDraft = null;
const WEEKDAYS = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
const dots = n => `<span class="lv-dots" title="${LEVELS[n] || ''}">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const groupChip = g => GROUPS[g] ? `<span class="chip xs" style="--gc:${col(GROUPS[g].color)}"><i class="gdot"></i>${GROUPS[g].name}</span>` : '';
function prText(p) {
  if (p.kind === 'kg') return getEx(p.ex)?.gym ? `${p.v} kg${p.reps ? ` × ${p.reps}` : ''}` : `+${p.v} kg`;
  if (p.kind === 'e1rm') return `est. max ${p.v} kg${p.set ? ` (${p.set})` : ''}`;
  return `${p.v}${p.kind === 'hold' ? 's' : ' reps'}`;
}

/* ---------- Hero with the discipline switch ---------- */
function trainHero() {
  const gym = gymMode(), rec = nextTemplate(), T = tplInfo(rec);
  const wk = weekKey(), weekN = S.workouts.filter(w => w.date >= wk).length, doneToday = workoutsOn(today()).length;
  return `<section class="hero train-hero glass">
    <div class="hero-art">${icon(gym ? 'dumbbell' : 'train')}</div>
    <div class="row between center wrap gap-s"><p class="eyebrow">${isDeload() ? 'Deload week' : isTrainingDay() ? 'Training day' : 'Rest day — optional'}</p>
      <div class="seg sm disc-seg" role="tablist" aria-label="Training discipline">
        <button class="${gym ? '' : 'on'}" data-act="setDisc" data-v="cal">${icon('train', 'xs')} Calisthenics</button>
        <button class="${gym ? 'on' : ''}" data-act="setDisc" data-v="gym">${icon('dumbbell', 'xs')} Gym</button></div></div>
    <div class="row center gap mt-s">
      ${ring({ pct: weekN / S.profile.trainDays, size: 96, sw: 9, color: 'var(--accent)', inner: `<b class="big">${weekN}<small>/${S.profile.trainDays}</small></b><span class="tiny muted">this week</span>` })}
      <div class="grow"><h1 class="hero-title">${doneToday ? 'Trained today' : esc(T.name)}</h1><p class="muted small">${doneToday ? (gym ? 'Recover well — protein, water, sleep.' : 'Recover well — or add a skill session.') : esc(T.desc) + ' · next in your rotation'}</p>
        <div class="row gap-s mt-s wrap">${doneToday ? '' : `<button class="btn primary" data-act="start" data-tpl="${rec}">${icon('play', 'sm')} Start</button>`}
        <button class="btn soft" data-act="trainSetup">${icon('settings', 'sm')} Setup</button></div></div>
    </div>
  </section>`;
}
function trainTabs() {
  const gym = gymMode(), tabs = [['workouts', 'train', 'Workouts'], ...(gym ? [] : [['skills', 'star', 'Skills']]), ['coach', 'chat', 'Coach'], ['library', 'book', 'Library'], ['records', 'trophy', 'Records']];
  if (!tabs.some(t => t[0] === trainTab)) trainTab = 'workouts';
  return `<div class="seg tabs scroll mt">${tabs.map(([id, ic, l]) => `<button class="${trainTab === id ? 'on' : ''}" data-act="trainTab" data-v="${id}">${icon(ic, 'sm')} ${l}</button>`).join('')}</div>`;
}

/* ---------- Gym workouts tab ---------- */
function deloadBanner() {
  if (!isDeload()) return '';
  return card(`<div class="row center gap"><span class="m-ic">${icon('moon')}</span><div class="grow"><b>Deload week</b><p class="tiny muted">Until ${fmtDate(S.deload.until)} · targets ~10% lighter, one set fewer.</p></div><button class="btn ghost sm" data-act="coachEndDeload">End</button></div>`, 'span2 deload-card');
}
/* This week, Monday → Sunday: done sessions, planned sessions (next routines in order), rest days */
function trainWeekStrip() {
  const wk = weekKey(), t = today(), gym = gymMode();
  let queue = [];
  if (gym) { const days = planRoutines(), nx = nextRoutine(); if (nx) { const i = days.indexOf(nx); queue = [...days.slice(i), ...days.slice(0, i)]; } }
  let qi = 0;
  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(wk, i), done = workoutsOn(d), train = isTrainingDay(d), isT = d === t;
    let label = '', cls = '';
    if (done.length) { label = done[done.length - 1].name; cls = 'done'; }
    else if (d >= t && train) { if (gym && queue.length) { label = queue[qi % queue.length].name; qi++; } else label = d === t ? tplInfo(nextTemplate()).name : 'Train'; cls = 'plan'; }
    else if (d < t && train && d >= (S.created || d)) { label = 'Missed'; cls = 'miss'; }
    else { label = 'Rest'; cls = 'rest'; }
    return `<div class="wday ${cls} ${isT ? 'today' : ''}"><span class="tiny">${fmtDate(d, { weekday: 'short' }).slice(0, 2)}</span><b>${cls === 'done' ? icon('check', 'xs') : parseDay(d).getDate()}</b><span class="wl">${esc(label)}</span></div>`;
  }).join('');
  return card(`${cardHead('This week', `<button class="btn ghost xs" data-act="trainSetup">${icon('calendar', 'xs')} Schedule</button>`, 'calendar')}<div class="week-strip">${cells}</div>`, 'span2');
}
function routineRow(r, next) {
  const groups = [...new Set(r.items.flatMap(it => Object.entries(exGroups(it.ex)).filter(([, f]) => f === 1).map(([g]) => g)))].slice(0, 4);
  return `<li class="rt-row ${next ? 'next' : ''}">
    <span class="tpl-ic">${icon(r.icon || 'train')}</span>
    <div class="grow"><p class="h-title">${esc(r.name)} ${next ? '<span class="chip blue xs">Next</span>' : ''}</p>
      <p class="tiny muted">${r.items.length} exercises · ~${routineMinutes(r)} min</p>
      <div class="row gap-s wrap mt-xs">${groups.map(groupChip).join('')}</div></div>
    <div class="col gap-s"><button class="btn ${next ? 'primary' : 'soft'} sm" data-act="start" data-tpl="r:${r.id}">${icon('play', 'xs')} Start</button>
      <button class="btn ghost sm" data-act="editRoutine" data-id="${r.id}">${icon('edit', 'xs')} Edit</button></div></li>`;
}
function planCard() {
  const days = planRoutines(), nx = nextRoutine(), sp = S.plan.split;
  return card(`${cardHead(`Your plan · ${esc(SPLITS[sp] ? SPLITS[sp].name : 'Custom')}`, `<button class="btn ghost xs" data-act="rebuildPlan">${icon('refresh', 'xs')} Rebuild</button>`, 'dumbbell')}
    <p class="tiny muted">${SPLITS[sp] ? esc(SPLITS[sp].blurb) : 'Your own rotation.'} ${S.profile.trainDays} days/week · ${(FOCUS[S.profile.focus] || FOCUS.hypertrophy).name} · ${esc(S.profile.experience)}.</p>
    <ul class="rt-list">${days.map(r => routineRow(r, nx && r.id === nx.id)).join('')}</ul>`, 'span2');
}
function routinesCard() {
  const mine = (S.routines || []).filter(r => !r.plan);
  return card(`${cardHead('My routines', '', 'edit')}
    ${mine.length ? `<ul class="rt-list">${mine.map(r => routineRow(r, false)).join('')}</ul>` : '<p class="tiny muted">Build your own workout — pick exercises, sets, reps and rest. Gym and bodyweight moves can be mixed.</p>'}
    <div class="row gap mt-s wrap"><button class="btn soft" data-act="newRoutine">${icon('plus', 'sm')} New routine</button><button class="btn ghost" data-act="start" data-tpl="custom">${icon('play', 'sm')} Empty workout</button></div>`);
}
function historyCard() {
  const hist = [...S.workouts].reverse().slice(0, 25);
  return card(`${cardHead('History', `<span class="tiny muted">${S.workouts.length} total</span>`, 'calendar')}
    ${hist.length ? `<ul class="history">${hist.map(w => {
      const vol = workoutVolume(w);
      return `<li><details><summary><div class="grow"><p class="h-title">${esc(w.name)} ${(w.prs || []).length ? `<span class="chip gold xs">${w.prs.length} PR</span>` : ''}</p><p class="tiny muted">${relDay(w.date)} · ${w.mins} min · ${sum(w.entries.map(e => doneSets(e).length))} sets · ${vol.kg ? `${fmtN(vol.kg)} kg lifted` : `${vol.reps} reps`}${vol.secs ? ` · ${vol.secs}s holds` : ''}</p></div><span class="xp-tag">+${w.xp}</span></summary>
        <ul class="h-sets">${w.entries.map(e => { const ex = getEx(e.ex); return `<li><span>${esc(ex ? entryName(e) : e.ex)}${e.effort ? ` <i class="tiny muted">· ${isGym(ex) ? RIR[e.effort] : EFFORT[e.effort]}</i>` : ''}</span><span class="muted">${doneSets(e).map(s => setLabel(ex, s)).join(' · ')}</span></li>`; }).join('')}</ul>
        <button class="btn ghost sm danger-text mt-s" data-act="delWorkout" data-id="${w.id}">${icon('trash', 'xs')} Delete</button></details></li>`;
    }).join('')}</ul>` : '<p class="muted">No workouts yet. Your first one is the most important.</p>'}`);
}
function gymWorkoutsTab() {
  ensurePlan();
  const top = coachFocus()[0];
  return `<div class="grid mt">
    ${deloadBanner()}
    ${top ? card(`<div class="row center gap"><span class="m-ic ${top.kind}">${icon(top.icon)}</span><div class="grow"><p class="tiny muted">Coach Caleb</p><b class="small">${esc(top.title)}</b></div><button class="btn ghost sm" data-act="trainTab" data-v="coach">Why ${icon('right', 'xs')}</button></div>`, 'span2 coach-peek') : ''}
    ${trainWeekStrip()}
    ${planCard()}
    ${routinesCard()}
    ${weeklyCoachCard()}
    ${historyCard()}
  </div>`;
}

/* ---------- Coach tab ---------- */
function coachTab() {
  const R = coachReport(), kinds = { alert: 'red', warn: 'orange', good: 'green', info: 'blue' };
  const nx = R.nextTpl ? buildWorkout(R.nextTpl) : null, T = R.nextTpl ? tplInfo(R.nextTpl) : null;
  const load = R.acwr === null ? '—' : R.acwr >= 1.5 ? 'Spiking' : R.acwr >= 1.2 ? 'Rising' : R.acwr >= .8 ? 'Steady' : 'Low';
  const maxSets = Math.max(...R.groups.map(x => Math.max(x.sets, x.hi)), 1);
  return `<div class="grid mt">
    ${card(`${cardHead('Readiness', '<span class="tiny muted">From your log</span>', 'shield')}
      <div class="wk-stats">
        <div><b>${R.last7}</b><span class="tiny muted">sessions / 7 d</span></div>
        <div><b>${load}</b><span class="tiny muted">training load${R.acwr !== null ? ` · ${(Math.round(R.acwr * 10) / 10)}×` : ''}</span></div>
        <div><b>${R.adherence === null ? '—' : Math.round(Math.min(1, R.adherence) * 100) + '%'}</b><span class="tiny muted">of planned</span></div>
        <div><b>${R.consec}</b><span class="tiny muted">days in a row</span></div>
      </div>
      ${coachFocus(R).length ? `<p class="small mt-s"><b>Focus next:</b> ${coachFocus(R).map(i => esc(i.title)).join(' · ')}</p>` : ''}`, 'span2')}
    ${nx ? card(`${cardHead('Next workout', `<span class="chip blue xs">${esc(T.name)}</span>`, 'play')}
      <ul class="next-list">${nx.entries.map(e => { const ex = getEx(e.ex); return `<li><span class="fig-tile xs">${figureSVG(e.ex, 40, e)}</span><div class="grow"><p class="small"><b>${esc(entryName(e))}</b> <span class="muted">${e.sets.length} × ${e.lo ? `${e.sets[0].t} (${e.lo}–${e.hi})` : e.sets[0].t}${unitOf(ex)}${e.sets[0].kg ? ` @ ${kgLabel(ex, e.sets[0].kg)}` : ''}</span></p><p class="tiny muted">${esc(e.rec)}</p></div></li>`; }).join('')}</ul>
      <button class="btn primary wide mt" data-act="start" data-tpl="${R.nextTpl}">${icon('play', 'sm')} Start ${esc(T.name)}</button>`, 'span2') : ''}
    ${card(`${cardHead('Insights', `<span class="tiny muted">${R.insights.length}</span>`, 'chat')}
      <ul class="insights">${R.insights.map(i => `<li class="ins ${i.kind}">
        <span class="m-ic ${i.kind}">${icon(i.icon)}</span>
        <div class="grow"><p class="ins-t">${esc(i.title)}</p><p class="small muted">${esc(i.body)}</p>
          <details class="whyd"><summary class="tiny">Why?</summary><ul>${i.why.map(w => `<li class="tiny muted">${esc(w)}</li>`).join('')}</ul></details>
          ${i.act ? `<button class="btn soft sm mt-s" data-act="${i.act.act}" ${i.act.v != null ? `data-v="${i.act.v}"` : ''} ${i.act.g ? `data-g="${i.act.g}"` : ''} ${i.act.ex ? `data-ex="${i.act.ex}"` : ''}>${esc(i.act.label)}</button>` : ''}</div></li>`).join('')}</ul>`, 'span2')}
    ${card(`${cardHead('Sets per muscle · 7 days', '<span class="tiny muted">shaded = target</span>', 'target')}
      <ul class="mvol">${R.groups.map(x => `<li><span class="small">${esc(GROUPS[x.g].name)}</span>
        <span class="mbar"><i class="band" style="left:${(x.lo / maxSets * 100).toFixed(1)}%;width:${((x.hi - x.lo) / maxSets * 100).toFixed(1)}%"></i><i class="fill ${x.sets < x.lo * .75 ? 'low' : x.sets > x.hi * 1.4 ? 'high' : ''}" style="width:${(Math.min(x.sets, maxSets) / maxSets * 100).toFixed(1)}%"></i></span>
        <span class="tiny muted nowrap">${x.sets} / ${x.lo}–${x.hi}</span></li>`).join('')}</ul>
      <p class="tiny muted mt-s">Main muscle = 1 set, helper muscle = ½. Push ${R.push} : pull ${R.pull} sets in 14 days.</p>`)}
    ${card(`${cardHead('How Caleb decides', '', 'info')}
      <p class="tiny muted">No guesses and no randomness — only your logged sets, reps, weights, effort ratings and bodyweight, run through these rules:</p>
      <dl class="rules">${COACH_RULES.map(([t, d]) => `<dt class="small">${esc(t)}</dt><dd class="tiny muted">${esc(d)}</dd>`).join('')}</dl>`)}
  </div>`;
}

/* ---------- Library ---------- */
function libraryMatches() {
  const q = libQ.trim().toLowerCase();
  return libraryIds().map(getEx).filter(ex => ex && !ex.skill
    && (!libGroup || ex.group === libGroup || exMuscles(ex.id).prim.some(m => groupOf(m) === libGroup))
    && (!libKit || ex.kit === libKit) && (!libMech || ex.mech === libMech) && (!libFav || isFav(ex.id))
    && (!q || ex.name.toLowerCase().includes(q) || (GROUPS[ex.group] && GROUPS[ex.group].name.toLowerCase().includes(q)) || exMuscles(ex.id).prim.some(m => MUSCLES[m][0].toLowerCase().includes(q))));
}
function libraryListHTML() {
  const list = libraryMatches();
  return list.length ? list.map(ex => `<button class="lib-card glass-btn ${hasKit(ex) ? '' : 'nokit'}" data-act="exInfo" data-ex="${ex.id}">
      <span class="fig-tile">${figureSVG(ex.id, 64)}</span>
      <span class="lib-txt"><b>${esc(ex.name)}</b><span class="tiny muted">${esc(GROUPS[ex.group] ? GROUPS[ex.group].name : '')} · ${KIT[ex.kit] || 'Bodyweight'}</span>
      <span class="row center gap-s">${dots(ex.lvl || 1)}<span class="tiny muted">${ex.mech === 'C' ? 'Compound' : 'Isolation'}</span>${isFav(ex.id) ? `<span class="fav-on">${icon('star', 'xs')}</span>` : ''}${isAvoid(ex.id) ? `<span class="tiny red-t">avoided</span>` : ''}</span></span></button>`).join('')
    : '<p class="muted small">No exercises match. Clear a filter.</p>';
}
function libraryTab() {
  const chips = (v, cur, act, label) => `<button class="chip-btn sm ${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
  return `<div class="mt">${card(`
    <label class="search-box">${icon('search', 'sm')}<input class="inp" type="search" placeholder="Search ${libraryIds().length} exercises, muscles…" value="${esc(libQ)}" data-input="libSearch" id="libSearch" data-noautofocus></label>
    <div class="chip-row mt-s">${chips('', libGroup, 'libGroup', 'All muscles')}${Object.entries(GROUPS).map(([g, G]) => chips(g, libGroup, 'libGroup', G.name)).join('')}</div>
    <div class="chip-row mt-s">${chips('', libKit, 'libKit', 'All equipment')}${Object.entries(KIT).map(([k, n]) => chips(k, libKit, 'libKit', n)).join('')}</div>
    <div class="chip-row mt-s">${chips('', libMech, 'libMech', 'All types')}${chips('C', libMech, 'libMech', 'Compound')}${chips('I', libMech, 'libMech', 'Isolation')}
      <button class="chip-btn sm ${libFav ? 'on' : ''}" data-act="libFav">${icon('star', 'xs')} Favorites</button></div>`)}
    <div class="lib-grid mt" id="libList">${libraryListHTML()}</div>
    <p class="tiny muted mt center-t">Faded figure = start · solid = finish. Open an exercise to watch it move.</p></div>`;
}

/* ---------- Exercise detail (library, workouts, history) ---------- */
function planItemFor(id) { for (const r of (S.plan ? planRoutines() : [])) { const it = r.items.find(x => x.ex === id); if (it) return it; } return null; }
function exGuideSheet(exId, grip, width, entry) {
  const ex = getEx(exId); if (!ex) return '';
  grip = grip || 'over'; width = width || 'medium';
  const key = keyOf(exId, grip, width), gym = isGym(ex), u = unitOf(ex);
  const it = !entry && gym ? planItemFor(exId) : null;
  const r = entry && entry.rec ? { text: entry.rec, status: entry.status, why: entry.why, kg: entry.sets[0] && entry.sets[0].kg } : recommend(key, it ? { lo: it.lo, hi: it.hi, sets: it.sets } : {});
  const hist = sessionsOf(key, null, 6), best = bestEver(key), m = exMuscles(exId);
  const F = ex.fam ? FAMILIES[ex.fam] : null;
  const tips = ex.vary ? [ex.vary.includes('grip') ? `<li><b>${GRIPS[grip]} grip:</b> ${GRIP_TIPS[grip]}</li>` : '', `<li><b>${WIDTHS[width]} width:</b> ${WIDTH_TIPS[width]}</li>`].join('') : '';
  const rg = entry && entry.lo ? { lo: entry.lo, hi: entry.hi } : it ? { lo: it.lo, hi: it.hi } : gym ? gymRange(ex) : { lo: ex.lo, hi: ex.hi };
  const sets = entry ? entry.sets.length : it ? it.sets : gym ? gymSets(ex) : 3, rest = (entry && entry.rest) || (it && it.rest) || (gym ? gymRest(ex) : S.settings.restSec);
  const series = gym && ex.kind !== 'hold' ? e1Series(key).map(p => ({ x: fmtDate(p.date, { month: 'short', day: 'numeric' }), y: Math.round(p.v * 2) / 2 })) : [];
  const subs = ex.skill ? [] : substitutes(exId, 5);
  const steps = ex.how || (ex.cue ? [ex.cue] : []);
  return `<div class="guide">
    <div class="guide-art">${figureSVG(exId, 200, { cls: 'big', grip, width, anim: true })}<span class="tiny muted">${figSpec(exId).A.top ? 'Seen from above · ' : ''}${figSpec(exId).A.a ? 'Lift, squeeze, lower slowly' : 'Hold this position'}</span></div>
    <div class="row gap-s wrap mt">${ex.group ? groupChip(ex.group) : ''}<span class="chip xs">${KIT[ex.kit] || 'Bodyweight'}</span><span class="chip xs">${ex.mech === 'C' ? 'Compound' : 'Isolation'}</span><span class="chip xs">${dots(ex.lvl || 1)} ${LEVELS[ex.lvl || 1]}</span>${F ? `<span class="chip xs">${esc(F.name)} · step ${ex.step + 1}/${F.ladder.length}</span>` : ''}</div>
    <h3 class="sheet-title mt-s">${esc(variantName(exId, grip, width))}</h3>
    <div class="musc mt-s"><p class="tiny"><b>Primary:</b> ${m.prim.map(x => esc(MUSCLES[x] ? MUSCLES[x][0] : x)).join(', ') || '—'}</p>${m.sec.length ? `<p class="tiny muted"><b>Secondary:</b> ${m.sec.map(x => esc(MUSCLES[x] ? MUSCLES[x][0] : x)).join(', ')}</p>` : ''}
      ${(ex.needs || []).length ? `<p class="tiny muted"><b>Equipment:</b> ${ex.needs.map(n => EQUIP[n]).join(', ')}${hasKit(ex) ? '' : ' <span class="red-t">· not in your equipment</span>'}</p>` : ''}</div>
    ${steps.length ? `<h4 class="mt">How to do it</h4><ol class="how">${steps.map(s => `<li class="small">${esc(s)}</li>`).join('')}</ol>` : ''}
    ${ex.how && ex.cue ? `<p class="small cue mt-s">💡 ${esc(ex.cue)}</p>` : ''}
    ${tips ? `<ul class="guide-tips mt-s">${tips}</ul>` : ''}
    ${rg.lo ? `<div class="presc mt"><div><b>${sets}</b><span class="tiny muted">sets</span></div><div><b>${rg.lo}–${rg.hi}</b><span class="tiny muted">${ex.kind === 'hold' ? 'seconds' : 'reps'}</span></div><div><b>${rest >= 60 ? `${Math.floor(rest / 60)}:${pad(rest % 60)}` : rest + 's'}</b><span class="tiny muted">rest</span></div><div><b>${r.kg ? kgLabel(ex, r.kg) : gym ? '—' : 'BW'}</b><span class="tiny muted">${gym ? 'weight' : 'load'}</span></div></div>
      <p class="tiny muted mt-s">For your goal (${(FOCUS[S.profile.focus] || FOCUS.hypertrophy).name.toLowerCase()}) and level.${ex.load && !gym ? ' Add weight with a backpack once the top of the range is easy.' : ''}</p>` : ''}
    ${r.text ? `<p class="rec ${r.status} mt">${icon(r.status === 'load' ? 'plus' : r.status === 'levelup' ? 'up' : r.status === 'deload' || r.status === 'stall' ? 'moon' : 'target', 'xs')} ${esc(r.text)}</p>` : ''}
    ${r.why && r.why.length ? `<details class="whyd mt-s"><summary class="tiny">Why this target?</summary><ul>${r.why.map(w => `<li class="tiny muted">${esc(w)}</li>`).join('')}</ul></details>` : ''}
    ${series.length >= 2 ? `<h4 class="mt">Estimated 1-rep max</h4>${lineChart(series, { unit: ' kg', h: 120, color: 'var(--accent)' })}` : ''}
    ${hist.length ? `<h4 class="mt">Recent sessions${best ? ` <span class="tiny muted">· best ${gym && best.kg ? `${best.kg} kg × ${best.v}` : `${best.v}${u}${best.kg ? ` @ +${best.kg} kg` : ''}`}</span>` : ''}</h4>
      <ul class="h-sets">${hist.map(h => `<li><span>${relDay(h.date)}${h.effort ? ` <i class="tiny muted">· ${gym ? RIR[h.effort] : EFFORT[h.effort]}</i>` : ''}</span><span class="muted">${h.sets.map(s => setLabel(ex, s)).join(' · ')}</span></li>`).join('')}</ul>` : '<p class="tiny muted mt">Not logged yet.</p>'}
    ${subs.length ? `<h4 class="mt">${icon('swap', 'xs')} Substitutes</h4><div class="chip-row mt-s">${subs.map(id => `<button class="chip-btn sm" data-act="exInfo" data-ex="${id}">${esc(getEx(id).name)}</button>`).join('')}</div>` : ''}
    ${ex.skill ? '' : `<div class="row gap mt wrap"><button class="btn ${isFav(exId) ? 'primary' : 'soft'} sm" data-act="exFav" data-ex="${exId}">${icon('star', 'xs')} ${isFav(exId) ? 'Favorite' : 'Add to favorites'}</button>
      <button class="btn ${isAvoid(exId) ? 'danger' : 'ghost'} sm" data-act="exAvoid" data-ex="${exId}">${icon('ban', 'xs')} ${isAvoid(exId) ? 'Avoided' : 'Avoid'}</button>
      ${(S.routines || []).length ? `<label class="btn ghost sm add-to">${icon('plus', 'xs')} Add to routine<select data-change="exToRoutine" data-ex="${exId}"><option value="">Choose…</option>${S.routines.map(rt => `<option value="${rt.id}">${esc(rt.name)}${rt.plan ? ' (plan)' : ''}</option>`).join('')}</select></label>` : ''}</div>`}
    <button class="btn ghost wide mt" data-act="closeSheet">Close</button></div>`;
}

/* ---------- Records ---------- */
function recordsTab() {
  const all = exRecords().filter(r => recFilter === 'all' || (recFilter === 'gym' ? isGym(getEx(r.ex)) : !isGym(getEx(r.ex))));
  const prs = S.workouts.slice().reverse().flatMap(w => (w.prs || []).map(p => ({ ...p, date: w.date }))).slice(0, 12);
  const tonnage = totalTonnage();
  return `<div class="grid mt">
    <div class="stats span2"><div class="stat glass"><b>${sum(S.workouts.map(w => (w.prs || []).length))}</b><span>PRs total</span></div><div class="stat glass"><b>${exRecords().length}</b><span>Exercises</span></div>
      <div class="stat glass"><b>${fmtN(tonnage)}</b><span>kg lifted</span></div><div class="stat glass"><b>${fmtN(totalReps())}</b><span>Total reps</span></div></div>
    ${card(`${cardHead('Recent records', '', 'trophy')}${prs.length ? `<ul class="pr-list">${prs.map(p => `<li><span>${esc(p.name || getEx(p.ex)?.name || p.ex)} <span class="tiny muted">· ${relDay(p.date)}</span></span><b>${esc(prText(p))}</b></li>`).join('')}</ul>` : '<p class="tiny muted">Beat a previous best and it lands here.</p>'}`)}
    ${card(`${cardHead('Best per exercise', `<div class="seg sm">${[['all', 'All'], ['gym', 'Gym'], ['bw', 'Bodyweight']].map(([v, l]) => `<button class="${recFilter === v ? 'on' : ''}" data-act="recFilter" data-v="${v}">${l}</button>`).join('')}</div>`, 'chart')}
      ${all.length ? `<ul class="rec-list">${all.map(r => { const ex = getEx(r.ex), gym = isGym(ex) && ex.kind !== 'hold', kp = parseKey(r.key);
        return `<li><button class="fig-tile xs" data-act="exGuide" data-ex="${kp.ex}" data-g="${kp.grip}" data-w="${kp.width}" aria-label="${esc(keyName(r.key))}">${figureSVG(kp.ex, 40, kp)}</button>
          <div class="grow"><p class="small"><b>${esc(keyName(r.key))}</b></p><p class="tiny muted">${r.sessions} session${r.sessions > 1 ? 's' : ''} · last ${relDay(r.last)}</p></div>
          <div class="right-t"><p class="small"><b>${gym ? `${r.best.kg} kg × ${r.best.v}` : `${r.best.v}${unitOf(ex)}${r.best.kg ? ` +${r.best.kg}kg` : ''}`}</b></p>${gym && r.e1 ? `<p class="tiny muted">est. max ${Math.round(r.e1 * 2) / 2} kg</p>` : r.kg && !gym ? `<p class="tiny muted">max load +${r.kg} kg</p>` : ''}</div></li>`; }).join('')}</ul>` : '<p class="tiny muted">No records yet.</p>'}`, 'span2')}
  </div>`;
}

/* ---------- Routine editor ---------- */
function routineEditorHTML() {
  const d = rtDraft;
  if (rtPicking) {
    const q = rtPickQ.toLowerCase(), list = libraryIds(d.items.some(it => getEx(it.ex)?.cal) && !d.items.some(it => getEx(it.ex)?.gym) ? 'cal' : 'gym').map(getEx)
      .filter(ex => ex && !ex.skill && (!rtPickGroup || ex.group === rtPickGroup) && (!q || ex.name.toLowerCase().includes(q)));
    return `<div class="row between center"><h3 class="sheet-title">Add exercise</h3><button class="btn ghost sm" data-act="rtPickClose">Done</button></div>
      <input class="inp" type="search" placeholder="Search…" value="${esc(rtPickQ)}" data-input="rtPickSearch" id="rtPickSearch" data-noautofocus>
      <div class="chip-row mt-s">${[['', 'All'], ...Object.entries(GROUPS).map(([g, G]) => [g, G.name])].map(([v, l]) => `<button class="chip-btn sm ${rtPickGroup === v ? 'on' : ''}" data-act="rtPickGroup" data-v="${v}">${l}</button>`).join('')}</div>
      <ul class="food-pick" id="rtPickList">${list.map(ex => `<li><button data-act="rtPick" data-ex="${ex.id}"><span class="fig-tile xs">${figureSVG(ex.id, 40)}</span><div class="grow"><p>${esc(ex.name)}</p><p class="tiny muted">${esc(GROUPS[ex.group] ? GROUPS[ex.group].name : '')} · ${KIT[ex.kit] || 'Bodyweight'}${hasKit(ex) ? '' : ' · not in your equipment'}</p></div><span class="add-ic">${d.items.some(it => it.ex === ex.id) ? icon('check', 'sm') : icon('plus', 'sm')}</span></button></li>`).join('')}</ul>`;
  }
  const rests = [30, 45, 60, 75, 90, 120, 150, 180, 240];
  return `<div class="row between center"><h3 class="sheet-title">${d.isNew ? 'New routine' : 'Edit routine'}</h3><button class="round-btn glass" data-act="rtCancel" aria-label="Close">${icon('x')}</button></div>
    <label class="field"><span>Name</span><input class="inp" value="${esc(d.name)}" data-input="rtName" placeholder="e.g. Push day"></label>
    ${d.plan ? '<p class="tiny muted mt-s">Part of your plan rotation. Rebuilding the plan replaces it.</p>' : `<label class="row center gap-s mt-s small"><input type="checkbox" ${d.inPlan ? 'checked' : ''} data-change="rtInPlan"> Include in my plan rotation</label>`}
    <ul class="rt-items mt">${d.items.map((it, i) => { const ex = getEx(it.ex); if (!ex) return ''; const subs = ex.skill ? [] : substitutes(it.ex, 6);
      return `<li class="rt-item glass">
        <div class="row center gap-s"><span class="fig-tile xs">${figureSVG(it.ex, 40)}</span>
          <label class="ex-swap grow">${icon('swap', 'xs')}<select data-change="rtSwap" data-i="${i}" aria-label="Swap exercise"><option value="${it.ex}" selected>${esc(ex.name)}</option>${subs.length ? `<optgroup label="Substitutes">${subs.map(id => `<option value="${id}">${esc(getEx(id).name)}</option>`).join('')}</optgroup>` : ''}</select><span class="ex-name small">${esc(ex.name)}</span></label>
          <button class="icon-btn" data-act="rtMove" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up', 'xs')}</button>
          <button class="icon-btn" data-act="rtDel" data-i="${i}" aria-label="Remove">${icon('trash', 'xs')}</button></div>
        <div class="rt-cfg mt-s">
          <label><span class="tiny muted">Sets</span><span class="num-step sm"><button data-act="rtSets" data-i="${i}" data-d="-1">${icon('minus', 'xs')}</button><b>${it.sets}</b><button data-act="rtSets" data-i="${i}" data-d="1">${icon('plus', 'xs')}</button></span></label>
          <label><span class="tiny muted">${ex.kind === 'hold' ? 'Seconds' : 'Reps'}</span><span class="row center gap-s"><input class="inp xs" type="number" inputmode="numeric" value="${it.lo}" data-change="rtRange" data-i="${i}" data-k="lo" aria-label="Lowest reps">–<input class="inp xs" type="number" inputmode="numeric" value="${it.hi}" data-change="rtRange" data-i="${i}" data-k="hi" aria-label="Highest reps"></span></label>
          <label><span class="tiny muted">Rest</span><select data-change="rtRest" data-i="${i}">${rests.map(s => `<option value="${s}" ${+it.rest === s ? 'selected' : ''}>${s >= 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : s + 's'}</option>`).join('')}</select></label>
        </div></li>`; }).join('')}</ul>
    <button class="btn soft wide mt-s" data-act="rtAdd">${icon('plus', 'sm')} Add exercise</button>
    <p class="tiny muted mt-s">~${routineMinutes(d)} min with your rest times.</p>
    <div class="row gap mt">${d.isNew ? '' : `<button class="btn ghost danger-text" data-act="rtDelete">${icon('trash', 'sm')}</button>`}<button class="btn ghost grow" data-act="rtCancel">Cancel</button><button class="btn primary grow" data-act="rtSave">Save</button></div>
    ${d.items.length ? `<button class="btn soft wide mt-s" data-act="rtStart">${icon('play', 'sm')} Save & start</button>` : ''}`;
}
function rerenderRt() { const s = sheetEl(); if (s) { const st = s.scrollTop; s.innerHTML = '<div class="grabber"></div>' + routineEditorHTML(); s.scrollTop = rtPicking ? 0 : st; } }
function itemFor(id) { const ex = getEx(id), rg = ex.gym ? gymRange(ex) : { lo: ex.lo, hi: ex.hi }; return { ex: id, sets: ex.gym ? gymSets(ex) : 3, lo: rg.lo, hi: rg.hi, rest: ex.gym ? gymRest(ex) : S.settings.restSec }; }
function openRoutine(r) {
  rtDraft = r ? { ...JSON.parse(JSON.stringify(r)), inPlan: !!(S.plan && S.plan.days.includes(r.id)) } : { id: 'r' + uid(), name: '', items: [], plan: false, icon: 'edit', isNew: true, inPlan: false };
  rtPicking = false; rtPickQ = ''; rtPickGroup = '';
  openSheet(routineEditorHTML(), { cls: 'tall' });
}
function saveRoutine() {
  const d = rtDraft; if (!d) return null;
  d.name = (d.name || '').trim() || (d.items.length ? `${GROUPS[getEx(d.items[0].ex)?.group]?.name || 'My'} workout` : 'My routine');
  const { isNew, inPlan, ...r } = d; r.edited = true;
  if (!r.plan || !r.desc) r.desc = `${r.items.length} exercises · ~${routineMinutes(r)} min`;
  S.routines = (S.routines || []).filter(x => x.id !== r.id); S.routines.push(r);
  if (!r.plan && S.plan) { const has = S.plan.days.includes(r.id); if (inPlan && !has) { S.plan.days.push(r.id); S.plan.split = 'custom'; } if (!inPlan && has) { S.plan.days = S.plan.days.filter(x => x !== r.id); S.plan.split = 'custom'; } }
  if (!r.plan && inPlan && !S.plan) S.plan = { split: 'custom', built: today(), days: [r.id] };
  rtDraft = null; save(); return r;
}

/* ---------- Training setup (personalization) ---------- */
function setupHTML() {
  const d = setupDraft, gym = d.discipline === 'gym';
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(d[k]) === String(v) ? 'on' : ''}" data-act="setupSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const auto = autoSplit(d.schedule.length);
  return `<div class="row between center"><h3 class="sheet-title">Training setup</h3><button class="round-btn glass" data-act="closeSheet" aria-label="Close">${icon('x')}</button></div>
    <p class="small muted">Ledger shapes your plan, rep ranges, rest times and coaching around these answers. Change them any time.</p>
    <div class="setup">
      <label class="field"><span>Discipline</span>${seg('discipline', [['cal', 'Calisthenics'], ['gym', 'Gym / weights']])}</label>
      <div class="field"><span>Goal</span><div class="choice-list sm">${Object.entries(FOCUS).map(([v, F]) => `<button class="choice glass-btn ${d.focus === v ? 'on' : ''}" data-act="setupSet" data-k="focus" data-v="${v}"><b>${F.name}</b><span class="tiny muted">${F.blurb}</span></button>`).join('')}</div></div>
      <label class="field"><span>Experience</span>${seg('experience', [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']])}</label>
      <p class="tiny muted">Beginner: under ~1 year of steady training. Advanced: several years, progress now comes slowly.</p>
      <div class="field"><span>Training days <em>${d.schedule.length}/week</em></span><div class="days-pick">${WEEKDAYS.map(([n, l]) => `<button class="${d.schedule.includes(n) ? 'on' : ''}" data-act="setupDay" data-v="${n}" aria-label="${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][n]}">${l}</button>`).join('')}</div></div>
      <label class="field"><span>Session length</span>${seg('sessionMin', [[30, '30'], [45, '45'], [60, '60'], [75, '75'], [90, '90 min']])}</label>
      ${gym ? `<div class="field"><span>Split</span><div class="choice-list sm">${[['auto', { name: `Automatic — ${SPLITS[auto].name}`, blurb: `Best match for ${d.schedule.length} days a week.` }], ...Object.entries(SPLITS)].map(([v, Sp]) => `<button class="choice glass-btn ${d.split === v ? 'on' : ''}" data-act="setupSet" data-k="split" data-v="${v}"><b>${Sp.name}</b><span class="tiny muted">${Sp.blurb}</span></button>`).join('')}</div></div>
      <div class="field"><span>Equipment you have</span><div class="chip-row">${Object.entries(EQUIP_PRESETS).map(([k, P]) => `<button class="chip-btn sm" data-act="setupKitPreset" data-v="${k}">${P.name}</button>`).join('')}</div>
        <div class="kit-pick mt-s">${Object.entries(EQUIP).map(([k, n]) => `<button class="${d.equipment.includes(k) ? 'on' : ''}" data-act="setupKit" data-v="${k}">${d.equipment.includes(k) ? icon('check', 'xs') : ''}${n}</button>`).join('')}</div></div>
      <p class="tiny muted">${(S.profile.prefer || []).length} favorite and ${(S.profile.avoid || []).length} avoided exercises — set them from the Library. Favorites are picked first; avoided ones never appear.</p>` : ''}
    </div>
    <button class="btn primary wide mt" data-act="setupSave">${gym ? 'Save & build my plan' : 'Save'}</button>`;
}
function openSetup() {
  const p = S.profile;
  setupDraft = { discipline: p.discipline, focus: p.focus || 'hypertrophy', experience: p.experience || 'intermediate', schedule: [...trainWeekdays()], sessionMin: p.sessionMin || 60, split: p.split || 'auto', equipment: [...(p.equipment || [])] };
  if (setupDraft.discipline === 'gym' && !setupDraft.equipment.some(k => ['barbell', 'dumbbell', 'cable', 'machine'].includes(k))) setupDraft.equipment = [...EQUIP_PRESETS.gym.list];
  openSheet(setupHTML(), { cls: 'tall' });
}
function rerenderSetup() { const s = sheetEl(); if (s) { const st = s.scrollTop; s.innerHTML = '<div class="grabber"></div>' + setupHTML(); s.scrollTop = st; } }

/* ---------- Active workout helpers ---------- */
function exOptionsHTML(sel = '', forEntry = null) {
  let o = '';
  if (forEntry) { const subs = substitutes(forEntry, 8); if (subs.length) o += `<optgroup label="Suggested substitutes">${subs.map(id => `<option value="${id}">${esc(getEx(id).name)}</option>`).join('')}</optgroup>`; }
  const gymOpts = () => Object.entries(GROUPS).map(([g, G]) => { const xs = Object.values(GX).filter(x => x.group === g); return xs.length ? `<optgroup label="Gym · ${esc(G.name)}">${xs.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>` : ''; }).join('');
  const calOpts = () => { let c = ''; for (const [, F] of Object.entries(FAMILIES)) c += `<optgroup label="${esc(F.name)}">${F.ladder.map(e => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</optgroup>`;
    for (const [sk, K] of Object.entries(SKILLS)) c += `<optgroup label="Skill · ${esc(K.name)}">${K.steps.map((s, i) => `<option value="sk:${sk}:${i}" ${`sk:${sk}:${i}` === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`; return c; };
  return o + (gymMode() ? gymOpts() + calOpts() : calOpts() + gymOpts());
}
function warmupTip(e, ei) {
  const ex = getEx(e.ex); if (!isGym(ex) || ex.kit !== 'barbell' || ex.mech !== 'C') return '';
  const kg = e.sets[0] && e.sets[0].kg; if (!kg || kg < 40) return '';
  const first = S.active.entries.findIndex(x => { const y = getEx(x.ex); return isGym(y) && y.kit === 'barbell' && y.mech === 'C'; });
  if (first !== ei) return '';
  const w = p => roundLoad(ex, kg * p);
  return `<p class="tiny muted mt-s">${icon('timer', 'xs')} Warm-up: bar × 10 · ${w(.5)} kg × 5 · ${w(.7)} kg × 3 · ${w(.85)} kg × 1</p>`;
}

/* ---------- Actions ---------- */
const TRAIN_ACT = {
  setDisc: d => {
    if (S.profile.discipline === d.v) return;
    S.profile.discipline = d.v;
    if (d.v === 'gym') {
      if (!S.profile.equipment.some(k => ['barbell', 'dumbbell', 'cable', 'machine'].includes(k))) S.profile.equipment = [...EQUIP_PRESETS.gym.list];
      ensurePlan();
      if (!S.flags.gymSetup) { S.flags.gymSetup = true; save(); render(); openSetup(); return; }
    }
    trainTab = 'workouts'; save(); render(); haptic();
  },
  trainSetup: () => openSetup(),
  setupSet: d => { setupDraft[d.k] = d.k === 'sessionMin' ? +d.v : d.v; rerenderSetup(); },
  setupDay: d => { const n = +d.v, s = setupDraft.schedule; setupDraft.schedule = s.includes(n) ? (s.length > 1 ? s.filter(x => x !== n) : s) : [...s, n].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); rerenderSetup(); },
  setupKit: d => { const e = setupDraft.equipment; setupDraft.equipment = e.includes(d.v) ? e.filter(x => x !== d.v) : [...e, d.v]; rerenderSetup(); },
  setupKitPreset: d => { setupDraft.equipment = [...EQUIP_PRESETS[d.v].list]; rerenderSetup(); },
  setupSave: () => {
    const d = setupDraft, p = S.profile, gymChanged = ['focus', 'experience', 'sessionMin', 'split'].some(k => String(p[k]) !== String(d[k])) || p.schedule?.length !== d.schedule.length || d.equipment.join() !== (p.equipment || []).join();
    Object.assign(p, { discipline: d.discipline, focus: d.focus, experience: d.experience, schedule: d.schedule, trainDays: d.schedule.length, sessionMin: d.sessionMin, split: d.split, equipment: d.equipment });
    S.flags.gymSetup = true;
    const apply = () => { if (d.discipline === 'gym' && (gymChanged || !S.plan)) rebuildPlan(); closeSheet(); trainTab = 'workouts'; refresh(); toast(`${icon('check', 'xs')} ${d.discipline === 'gym' ? `Plan ready: ${esc(SPLITS[S.plan.split]?.name || 'Custom')}` : 'Saved'}`); };
    if (d.discipline === 'gym' && gymChanged && S.plan && planRoutines().some(r => r.edited)) askConfirm('Rebuild your plan?', 'You edited some plan days. Rebuilding with the new settings replaces them (your own routines stay).', 'Rebuild', apply, false);
    else apply();
  },
  rebuildPlan: () => askConfirm('Rebuild your plan?', 'Ledger picks fresh exercises for every plan day from your settings, equipment and favorites. Your own routines and history stay.', 'Rebuild', () => { rebuildPlan(); refresh(); toast(`${icon('refresh', 'xs')} Plan rebuilt`); }, false),

  /* Routines */
  newRoutine: () => openRoutine(null),
  editRoutine: d => openRoutine(routineById(d.id)),
  rtSets: d => { const it = rtDraft.items[d.i]; it.sets = clamp(it.sets + +d.d, 1, 10); rerenderRt(); },
  rtMove: d => { const i = +d.i, j = i + +d.d, a = rtDraft.items; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; rerenderRt(); },
  rtDel: d => { rtDraft.items.splice(+d.i, 1); rerenderRt(); },
  rtAdd: () => { rtPicking = true; rerenderRt(); },
  rtPickClose: () => { rtPicking = false; rerenderRt(); },
  rtPickGroup: d => { rtPickGroup = d.v; rerenderRt(); },
  rtPick: (d, el) => { if (!rtDraft.items.some(it => it.ex === d.ex)) { rtDraft.items.push(itemFor(d.ex)); SFX.play('toggleOn'); haptic(); } const a = el.querySelector('.add-ic'); if (a) a.innerHTML = icon('check', 'sm'); },
  rtCancel: () => { rtDraft = null; closeSheet(); },
  rtSave: () => { if (!rtDraft.items.length) return toast('Add at least one exercise'); const r = saveRoutine(); closeSheet(); refresh(); toast(`${icon('check', 'xs')} ${esc(r.name)} saved`); },
  rtStart: () => { if (!rtDraft.items.length) return; const r = saveRoutine(); closeSheet(true); startWorkout('r:' + r.id); },
  rtDelete: () => { const id = rtDraft.id; askConfirm('Delete routine?', 'Your workout history stays.', 'Delete', () => {
    S.routines = S.routines.filter(r => r.id !== id); if (S.plan) S.plan.days = S.plan.days.filter(x => x !== id); rtDraft = null; refresh(); }); },

  /* Library & exercise sheet */
  libGroup: d => { libGroup = d.v; render(); },
  libKit: d => { libKit = d.v; render(); },
  libMech: d => { libMech = d.v; render(); },
  libFav: () => { libFav = !libFav; render(); },
  recFilter: d => { recFilter = d.v; render(); },
  exInfo: d => openSheet(exGuideSheet(d.ex), { cls: 'tall' }),
  exFav: d => { const p = S.profile; p.prefer = isFav(d.ex) ? p.prefer.filter(x => x !== d.ex) : [...(p.prefer || []), d.ex]; p.avoid = (p.avoid || []).filter(x => x !== d.ex); save(); render(); sheetEl().innerHTML = '<div class="grabber"></div>' + exGuideSheet(d.ex); haptic(); },
  exAvoid: d => { const p = S.profile; p.avoid = isAvoid(d.ex) ? p.avoid.filter(x => x !== d.ex) : [...(p.avoid || []), d.ex]; p.prefer = (p.prefer || []).filter(x => x !== d.ex); save(); render(); sheetEl().innerHTML = '<div class="grabber"></div>' + exGuideSheet(d.ex); },

  /* Coach actions */
  coachDeload: () => askConfirm('Start a deload week?', 'For 7 days your targets drop about 10% in weight with one set fewer. Then normal progression resumes.', 'Start deload', () => { S.deload = { start: today(), until: addDays(today(), 6) }; refresh(); toast(`${icon('moon', 'xs')} Deload week started`); }, false),
  coachEndDeload: () => { S.deload = null; refresh(); toast('Deload ended — back to progression'); },
  coachDays: d => { const n = +d.v, pat = TRAIN_PATTERNS[n] || TRAIN_PATTERNS[3]; S.profile.trainDays = n; S.profile.schedule = [...pat]; if (gymMode()) { S.profile.split = 'auto'; rebuildPlan(); } refresh(); toast(`${icon('calendar', 'xs')} Planning ${n} days a week`); },
  coachSplit: d => { S.profile.split = d.v; rebuildPlan(d.v); refresh(); toast(`${icon('check', 'xs')} Switched to ${esc(SPLITS[d.v].name)}`); },
  coachAddVol: d => { const r = addVolumeToPlan(d.g); if (!r) return toast('No fitting exercise with your equipment'); refresh(); toast(`${icon('plus', 'xs')} ${r.addedSet ? `+1 set of ${esc(r.ex.name)}` : esc(r.ex.name)} → ${esc(r.routine.name)}`); },
  coachSwap: d => openSheet(exGuideSheet(d.ex), { cls: 'tall' }),
};
const TRAIN_CHG = {
  rtSwap: el => { const it = rtDraft.items[el.dataset.i], n = itemFor(el.value); rtDraft.items[el.dataset.i] = { ...n, sets: it.sets }; rerenderRt(); },
  rtRange: el => { const it = rtDraft.items[el.dataset.i]; it[el.dataset.k] = Math.max(1, +el.value || 1); if (it.lo > it.hi) [it.lo, it.hi] = [it.hi, it.lo]; rerenderRt(); },
  rtRest: el => { rtDraft.items[el.dataset.i].rest = +el.value; rerenderRt(); },
  rtInPlan: el => { rtDraft.inPlan = el.checked; },
  exToRoutine: el => {
    const r = routineById(el.value); if (!r) return;
    if (!r.items.some(it => it.ex === el.dataset.ex)) { r.items.push(itemFor(el.dataset.ex)); r.edited = true; }
    save(); toast(`${icon('check', 'xs')} Added to ${esc(r.name)}`); el.value = '';
  },
};
const TRAIN_INP = {
  libSearch: el => { libQ = el.value; const l = document.getElementById('libList'); if (l) l.innerHTML = libraryListHTML(); },
  rtName: el => { rtDraft.name = el.value; },
  rtPickSearch: el => { rtPickQ = el.value; const tmp = document.createElement('div'); tmp.innerHTML = routineEditorHTML(); document.getElementById('rtPickList').innerHTML = tmp.querySelector('#rtPickList').innerHTML; },
};
