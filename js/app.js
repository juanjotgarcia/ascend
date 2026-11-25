/* ZELUM — views, navigation and actions. */

const VERSION = '1.14.1';
/* Browser engine version (the Android app's WebView updates separately from Chrome), shown under Me for support */
const engineTag = () => { const m = navigator.userAgent.match(/Chrome\/(\d+)/); return m ? ` · ${/LedgerAndroid|; wv\)/.test(navigator.userAgent) ? 'WebView' : 'Chrome'} ${m[1]}` : ''; };
const NAV = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'train', label: 'Train', icon: 'train' },
  { id: 'habits', label: 'Habits', icon: 'habits' },
  { id: 'fuel', label: 'Fuel', icon: 'fuel' },
  { id: 'me', label: 'Me', icon: 'user' },
];
let route = 'today';
let fuelDay = today();
let missionTab = 'daily';
let onb = { step: 0, d: { name: '', height: 171, weight: '', age: 22, sex: 'm', pullups: 8, pushups: 25, dips: 10, pistol: 'no', trainDays: 4, bodyGoal: 'gain', goal: 'g_muscleup', target: '', weeks: 12, why: '',
  discipline: 'cal', experience: 'beginner', focus: 'hypertrophy', kit: 'gym', sessionMin: 60 } };
let rest = null;            // { end, total }
let pendingLevelUp = 0;
let installEvt = null;
let foodServings = 1, foodMeal = 'Breakfast', foodQuery = '';
let trainTab = 'workouts';

/* ---------- XP hook (called by addXP) ---------- */
function onXP(amt, why, newLevel) {
  if (amt > 0) { xpToast(amt, why); xpFloat(amt); }
  if (amt > 0 && /^Badge/.test(why)) setTimeout(() => SFX.play('badge'), 350);
  if (newLevel) pendingLevelUp = Math.max(pendingLevelUp, newLevel);
}
function flushLevelUp() {
  if (!pendingLevelUp) return;
  const lvl = pendingLevelUp; pendingLevelUp = 0;
  setTimeout(() => showLevelUp(lvl), 500);
}
function showLevelUp(lvl) {
  const v = dailyLine('lvl' + lvl);
  const ri = rankIndex(lvl), newRank = RANKS[ri].lvl === lvl;
  openSheet(`<div class="levelup">
    <div class="lu-glow"></div>
    <p class="eyebrow gold">${newRank ? 'New rank unlocked' : 'Level up'}</p>
    ${newRank ? `<div class="lu-shield">${shieldSVG(ri, 150)}</div><h2>${esc(RANKS[ri].title)}</h2><p class="gold small" style="margin:-8px 0 12px">${esc(RANKS[ri].shield)} · Level ${lvl}</p>`
      : `<div class="lu-num">${lvl}</div><h2>${esc(titleFor(lvl))}</h2>`}
    ${lineHTML(v)}
    <button class="btn primary wide mt" data-act="closeSheet">Keep climbing</button></div>`, { cls: 'center' });
  burst(innerWidth / 2, innerHeight / 2, 40); SFX.play('levelUp'); haptic([30, 40, 60]);
}

/* ---------- Navigation ---------- */
/* '#settings/notifications' → ['settings', 'notifications']; anything unknown → Today */
function parseRoute(r) {
  r = String(r || '');
  if (r === 'skills') { trainTab = 'skills'; return ['train', null]; }
  if (r === 'settings' || r.startsWith('settings/')) { const sec = r.split('/')[1] || null; return ['settings', SETTINGS_SECS.some(x => x.id === sec) ? sec : null]; }
  return [NAV.find(n => n.id === r) || r === 'path' ? r : 'today', null];
}
// History entries pushed for Settings (so Android's back button steps out). Leaving Settings by a tab unwinds them.
let navDepth = 0, pendingGo = null;
function go(target, fromHistory = false) {
  const [r, sec] = parseRoute(target);
  if (!fromHistory && navDepth > 0 && r !== 'settings') { pendingGo = target; const n = navDepth; navDepth = 0; history.go(-n); return; }
  if (r === 'habits' && route !== 'habits') habitDay = today();
  const same = route === r && settingsSec === sec;
  const deeper = !fromHistory && r === 'settings' && (route !== 'settings' || (!settingsSec && sec));
  route = r; settingsSec = sec; clearFx();
  const h = '#' + r + (sec ? '/' + sec : '');
  if (location.hash !== h) { if (deeper) { history.pushState(null, '', h); navDepth++; } else history.replaceState(null, '', h); }
  const swap = () => { render(true); document.querySelector('.nav-btn.on')?.classList.add('just'); };
  // A short crossfade between screens. The browser snapshots only what is on screen and fades the two pictures
  // on the GPU, so it stays smooth at 120 Hz. Skipped for reduced motion, Smooth graphics and software drawing.
  if (!same && document.startViewTransition && !document.hidden && Gfx.motion()) {
    document.documentElement.classList.add('vt-tab');
    const t = document.startViewTransition(swap);
    t.ready.catch(() => { });   // skipped (e.g. the app went to the background): the screen still changes
    t.finished.catch(() => { }).finally(() => document.documentElement.classList.remove('vt-tab'));
  } else swap();
}
function refresh(flush = true) { syncDailyXP(); checkAchievements(); save(); render(); if (flush) flushLevelUp(); }

/* A new screen (navigation, or a fresh state from the cloud/backup) is built from scratch so its
   entry animation plays; any other update on the same screen is patched in place (morphHTML). */
function paintView(v, key, html, fresh) {
  if (fresh || v.dataset.route !== key) { v.innerHTML = html; v.__html = html; } else morphHTML(v, html);
  if (v.dataset.route !== key) v.dataset.route = key;
}
/* The screen's SVG gradient ids restart from zero on every render, so an unchanged shield or figure keeps
   the same markup and the in-place update skips it. Sheets keep their own ids (no prefix), so no clashes. */
function stableIds(fn) {
  const saved = [shieldSeq, figSeq]; shieldSeq = figSeq = 0; svgIdPrefix = 'v';
  try { return fn(); } finally { [shieldSeq, figSeq] = saved; svgIdPrefix = ''; }
}
function render(scrollTop = false) {
  const app = document.getElementById('app'), v = document.getElementById('view');
  if (!S.onboarded) { app.classList.add('onboarding'); paintView(v, 'onb' + onb.step, viewOnboarding(), scrollTop); renderNav(); return; }
  app.classList.remove('onboarding');
  paintView(v, route, stableIds(({ today: viewToday, train: viewTrain, habits: viewHabits, fuel: viewFuel, me: viewMe, path: viewPath, settings: viewSettings })[route]), scrollTop);
  renderNav();
  if (scrollTop) {
    window.scrollTo({ top: 0 });
    v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
    clearTimeout(render._t); render._t = setTimeout(() => v.classList.remove('enter'), 1200);
  }
  for (const [sel, cls] of fxQueue) document.querySelectorAll(sel).forEach(n => { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); });
  fxQueue = [];
  countUps(scrollTop);
  Motion.routeChanged(!S.onboarded ? '' : route === 'path' ? 'Path to King' : route === 'settings' ? ((SETTINGS_SECS.find(x => x.id === settingsSec) || {}).title || 'Settings') : (NAV.find(n => n.id === route) || {}).label || '');
  tick();
}
let fxQueue = [];
const fx = (sel, cls) => fxQueue.push([sel, cls]);
function renderNav() {
  const claim = S.onboarded ? claimableCount() : 0;
  const ni = Math.max(0, NAV.findIndex(n => n.id === (route === 'path' || route === 'settings' ? 'me' : route)));
  const nav = document.getElementById('nav');
  nav.style.setProperty('--ni', ni); nav.style.setProperty('--nc', NAV.length);
  morphHTML(nav, `
    <i class="nav-pill" aria-hidden="true"></i>
    <div class="brand">${logoSVG({ size: 34 })}<span>ZELUM</span></div>
    ${NAV.map(n => `<button class="nav-btn ${route === n.id || ((route === 'path' || route === 'settings') && n.id === 'me') ? 'on' : ''}" data-go="${n.id}" aria-label="${n.label}">
      <span class="nav-ic">${icon(n.icon)}${n.id === 'today' && claim ? `<b class="dot">${claim}</b>` : ''}${n.id === 'train' && S.active ? '<b class="dot live"></b>' : ''}</span><span class="nav-l">${n.label}</span></button>`).join('')}
    <button class="nav-btn coach-side" data-act="coach"><span class="nav-ic">${icon('chat')}</span><span class="nav-l">Coach</span></button>`);
  document.getElementById('fab').style.display = S.onboarded ? '' : 'none';
}

/* ---------- Shared bits ---------- */
const head = (title, sub = '', right = '') => `<header class="page-head"><div><p class="eyebrow">${sub}</p><h1>${title}</h1></div>${right}</header>`;
const card = (inner, cls = '') => `<section class="card glass tint ${cls}">${inner}</section>`;
const cardHead = (title, right = '', ic = '') => `<div class="card-head"><h3>${ic ? icon(ic, 'sm') : ''}${title}</h3>${right}</div>`;
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

/* =====================================================================
   TODAY
   ===================================================================== */
function viewToday() {
  const li = levelInfo(), st = streak(), k = today();
  const v = verseOfDay(), faithDone = !!S.claimed[`done:m:${k}:faith`];
  const d = parseDay(k);
  return `
  <header class="today-head">
    <button class="round-btn glass" data-act="appearance" aria-label="Appearance and colors">${icon('palette')}</button>
    <p class="title">Today<span>, ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}</span></p>
    <button class="lvl-pill glass" data-go="path" aria-label="Level ${li.lvl}, view path">${ring({ pct: li.pct, size: 38, sw: 3.5, color: 'var(--xp)', inner: `<b>${li.lvl}</b>` })}</button>
  </header>
  <h1 class="hello">${greeting()}${S.profile.name ? ', ' + esc(S.profile.name) : ''}</h1>
  <div data-nowplaying>${nowPlayingHTML()}</div>

  <section class="hero today-hero glass">
    <div class="hero-art">${logoSVG({ size: 220, mark: 'currentColor', bg: 'transparent' })}</div>
    <div class="row center gap">
      <button class="hero-shield" data-go="path" aria-label="View the path to King">${shieldSVG(rankIndex(li.lvl), 64)}</button>
      <div class="grow"><p class="eyebrow gold">Level ${li.lvl} · ${esc(li.title)}</p><p class="xp-num"><b data-count="${li.into}" data-ck="xpinto">${fmtN(li.into)}</b> / ${fmtN(li.need)} XP</p></div>
      <div class="streak ${st ? 'hot' : ''}">${st ? flame() : icon('flame')}<b>${st}</b><span>day${st === 1 ? '' : 's'}</span></div>
    </div>
    ${bar(li.pct, 'linear-gradient(90deg,var(--xp-lo),var(--xp),var(--xp-hi))', 'xp-bar')}
    <p class="tiny muted mt-s">${fmtN(xpOnDay(k))} XP earned today · <button class="link" data-go="path">Path to King ${icon('right', 'xs')}</button></p>
  </section>

  ${todayHabits()}

  <div class="grid mt">
    ${questCard()}
    ${faithOn() ? card(`
      ${cardHead('Verse of the day', faithDone ? `<span class="chip green">${icon('check', 'xs')} Amen</span>` : '', 'cross')}
      <p class="verse-text">“${esc(v.text)}”</p>
      <p class="verse-ref">${esc(v.ref)}</p>
      <p class="verse-note">${esc(v.note)}</p>
      ${faithDone ? '' : `<button class="btn soft wide mt" data-act="amen">${icon('heart', 'sm')} I've read & prayed — Amen</button>`}`, 'verse-card') : ''}
    ${trainTodayCard()}
    ${missionsCard()}
    ${card(`<p class="quote">${esc(quoteOfDay())}</p>`, 'quote-card')}
  </div>`;
}

function questCard() {
  const g = S.goal;
  if (!g) return card(`${cardHead('Main Quest', '', 'target')}<p class="muted">Everything in Zelum points to one goal. Choose yours.</p><button class="btn primary wide mt" data-act="pickGoal">Choose Main Quest</button>`, 'quest-card');
  const gp = goalProgress(), dl = goalDaysLeft();
  const action = g.type === 'skill' ? `<button class="btn soft" data-act="openSkill" data-skill="${g.skill}">Open skill tree</button>`
    : g.type === 'reps' ? `<button class="btn soft" data-act="maxTest">Log a max test</button>`
    : g.type === 'lift' ? `<button class="btn soft" data-act="exInfo" data-ex="${g.ex}">Open lift</button>`
    : `<button class="btn soft" data-act="weighIn">Weigh in</button>`;
  return card(`
    ${cardHead('Main Quest', `<span class="chip ${dl < 0 ? 'red' : ''}">${dl >= 0 ? `${dl} days left` : 'Past deadline'}</span>`, 'target')}
    <div class="quest">
      ${ring({ pct: gp.pct, size: 92, sw: 9, color: 'var(--gold)', inner: `<b class="big">${Math.round(gp.pct * 100)}%</b>` })}
      <div class="grow">
        <h2 class="quest-title">${esc(g.title)}</h2>
        <p class="muted">${esc(gp.label)}</p>
        ${gp.next ? `<p class="small mt-s">Next: <b>${esc(gp.next.name)}</b> · ${gp.next.target}${gp.next.kind === 'hold' ? ' s' : ' reps'}</p>` : ''}
        ${g.why ? `<p class="why">“${esc(g.why)}”</p>` : ''}
      </div>
    </div>
    <div class="row gap mt">${action}${gp.pct >= 1 ? `<button class="btn primary" data-act="completeGoal">${icon('trophy', 'sm')} Complete quest</button>` : ''}</div>`, 'quest-card');
}

function trainTodayCard() {
  if (S.active) {
    const done = sum(S.active.entries.map(e => doneSets(e).length));
    return card(`${cardHead('Workout in progress', '<span class="chip live">● Live</span>', 'bolt')}
      <h2 class="mt-s">${esc(S.active.name)}</h2><p class="muted">${done} sets done · <span data-elapsed></span></p>
      <button class="btn primary wide mt" data-go="train">${icon('play', 'sm')} Resume</button>`, 'train-card');
  }
  const todays = workoutsOn(today());
  if (todays.length) {
    const w = todays[todays.length - 1], vol = workoutVolume(w);
    return card(`${cardHead('Trained today', `<span class="chip green">${icon('check', 'xs')} Done</span>`, 'bolt')}
      <h2 class="mt-s">${esc(w.name)}</h2>
      <p class="muted">${w.mins} min · ${sum(w.entries.map(e => doneSets(e).length))} sets · ${vol.reps} reps${w.prs.length ? ` · ${w.prs.length} PR${w.prs.length > 1 ? 's' : ''} 🏆` : ''}</p>
      <p class="small mt">Now recover: protein, water, sleep.${faithOn() ? ` ${esc(VERSE_REST.ref)}: “${esc(VERSE_REST.text)}”` : ' Growth happens while you rest.'}</p>`, 'train-card');
  }
  const tpl = nextTemplate(), T = tplInfo(tpl), w = buildWorkout(tpl), trainDay = isTrainingDay();
  return card(`${cardHead(trainDay ? 'Today\'s training' : 'Rest day', trainDay ? '<span class="chip blue">Training day</span>' : '<span class="chip">Recover</span>', trainDay ? 'bolt' : 'moon')}
    ${trainDay ? '' : `<p class="muted small">${faithOn() ? `“${esc(VERSES[22].text)}” — ${VERSES[22].ref}.` : 'Recovery is part of the plan.'} Feeling fresh? You can still train.</p>`}
    <div class="row center gap mt-s"><span class="tpl-ic">${icon(T.icon)}</span><div><h2>${esc(T.name)}</h2><p class="muted small">${esc(T.desc)}</p></div></div>
    <ul class="ex-preview">${w.entries.map(e => { const ex = getEx(e.ex); return `<li><span>${esc(entryName(e))}</span><span class="muted">${isGym(ex) ? `${e.sets.length} × ${e.sets[0].t}${unitOf(ex)}${e.sets[0].kg ? ` @ ${e.sets[0].kg} kg` : ''}` : `${e.sets.map(s => s.t).join(' · ')}${unitOf(ex)}`}</span></li>`; }).join('')}</ul>
    <button class="btn primary wide mt" data-act="start" data-tpl="${tpl}">${icon('play', 'sm')} Start ${esc(T.name)}</button>`, 'train-card');
}

function missionRow(m) {
  const pct = m.max ? m.cur / m.max : 0;
  const right = m.claimed ? `<span class="claimed">${icon('check', 'sm')}</span>`
    : m.done ? `<button class="btn claim" data-act="claim" data-key="${m.key}" data-xp="${m.xp}" data-title="${esc(m.title)}">Claim</button>`
    : m.manual ? `<button class="btn soft sm" data-act="manualMission" data-key="${m.key}">Done</button>`
    : `<span class="xp-tag">+${m.xp}</span>`;
  return `<li class="mission ${m.done ? 'done' : ''} ${m.claimed ? 'claimed-row' : ''}" data-mkey="${m.key}">
    <span class="m-ic">${icon(m.icon)}</span>
    <div class="grow"><p class="m-title">${esc(m.title)}${m.sub ? ` <span class="chip gold xs">${m.sub}</span>` : ''}</p>
      ${m.max > 1 && !m.claimed ? `<div class="row center gap-s">${bar(pct, m.done ? 'var(--green)' : 'var(--blue)', 'thin')}<span class="tiny muted nowrap">${m.max >= 500 ? fmtL(m.cur) + ' / ' + fmtL(m.max) : `${fmtN(m.cur)} / ${fmtN(m.max)}`}</span></div>` : ''}
    </div>${right}</li>`;
}
function missionsCard() {
  const list = missionTab === 'daily' ? dailyMissions() : weeklyMissions();
  const done = list.filter(m => m.claimed).length;
  return card(`${cardHead('Missions', `<div class="seg sm"><button class="${missionTab === 'daily' ? 'on' : ''}" data-act="missionTab" data-v="daily">Daily</button><button class="${missionTab === 'weekly' ? 'on' : ''}" data-act="missionTab" data-v="weekly">Weekly</button></div>`, 'target')}
    <p class="tiny muted">${done}/${list.length} claimed ${missionTab === 'daily' ? '· resets at midnight' : '· resets Monday'}</p>
    <ul class="missions">${list.map(missionRow).join('')}</ul>`, 'missions-card');
}

/* Appearance: presets, every color role, glow and glass blur */
function appearanceHTML() {
  const t = S.settings.theme, c = themeColors();
  return `<div class="swatches">${Object.entries(THEMES).map(([id, T]) => `<button class="swatch ${t.preset === id && !Object.keys(t.colors || {}).length ? 'on' : ''}" data-act="themePreset" data-v="${id}">
      <span class="sw" style="background:radial-gradient(circle at 30% 25%, rgba(255,255,255,.35), transparent 45%), conic-gradient(from 200deg, ${T.colors.glow1}, ${T.colors.accent}, ${T.colors.xp}, ${T.colors.accent2}, ${T.colors.glow1})"></span>${T.name}</button>`).join('')}</div>
    ${Object.keys(t.colors || {}).length ? `<p class="tiny muted mt-s">Custom colors on top of ${esc(THEMES[t.preset]?.name || 'Midnight')}. <button class="btn ghost xs" data-act="themeReset">Reset colors</button></p>` : ''}
    <div class="slider-row"><label><span>Background glow</span><span id="glowVal">${Math.round((t.glow ?? .55) * 100)}%</span></label>
      <input type="range" min="0" max="100" value="${Math.round((t.glow ?? .55) * 100)}" data-input="themeGlow" aria-label="Background glow"></div>
    <div class="slider-row"><label><span>Glass blur</span><span id="blurVal">${t.blur ?? 26}px</span></label>
      <input type="range" min="0" max="50" value="${t.blur ?? 26}" data-input="themeBlur" aria-label="Glass blur"></div>
    <h4 class="mt">${icon('palette', 'sm')} Colors</h4>
    <div class="colors mt-s">${THEME_ROLES.filter(([k]) => k !== 'faith' || faithOn()).map(([k, name, desc]) => `<label class="color-row">
      <input type="color" value="${c[k]}" data-input="themeColor" data-change="themeColorDone" data-k="${k}" aria-label="${name}">
      <span class="grow"><b class="small">${name}</b><br><span class="tiny muted">${desc}</span></span><span class="hex" id="hex-${k}">${c[k].toUpperCase()}</span></label>`).join('')}</div>
    ${musicSettingsHTML()}`;
}

function waterMini() {
  const t = targets(), d = dayTotals();
  return card(`${cardHead('Water', '', 'drop')}
    <div class="row center gap">
      ${ring({ pct: d.water / t.water, size: 84, sw: 8, color: 'var(--teal)', inner: `${icon('drop', 'sm teal')}` })}
      <div class="grow"><p class="big-num">${fmtL(d.water)}</p><p class="muted small">of ${fmtL(t.water)} goal</p></div>
    </div>
    <div class="row gap mt"><button class="btn soft grow" data-act="water" data-ml="-${S.settings.glassMl}">${icon('minus', 'sm')}</button>
    <button class="btn teal grow2" data-act="water" data-ml="${S.settings.glassMl}">${icon('plus', 'sm')} ${S.settings.glassMl} ml</button>
    <button class="btn soft grow" data-act="water" data-ml="500">+500</button></div>`, 'water-card');
}

/* =====================================================================
   TRAIN
   ===================================================================== */
function viewTrain() {
  if (S.active) return viewActive();
  const gym = gymMode(), tabs = trainTabs();
  const body = trainTab === 'skills' ? skillsContent() : trainTab === 'coach' ? (can('coach') ? coachTab() : lockedHTML('coach')) : trainTab === 'library' ? libraryTab() : trainTab === 'records' ? (can('records') ? recordsTab() : lockedHTML('records'))
    : gym ? gymWorkoutsTab() : calWorkoutsTab();
  return trainHero() + tabs + body;
}
function calWorkoutsTab() {
  const rec = nextTemplate();
  return `<div class="grid mt">
    ${deloadBanner()}
    ${card(`${cardHead('Start a workout', '', 'play')}
      <div class="tpl-grid">${Object.entries(TEMPLATES).map(([id, T]) => `
        <button class="tpl glass-btn ${id === rec ? 'rec' : ''}" data-act="start" data-tpl="${id}">
          <span class="tpl-ic">${icon(T.icon)}</span><b>${esc(T.name)}</b><span class="tiny muted">${id === rec ? 'Recommended' : esc(T.desc)}</span></button>`).join('')}
      </div>`, 'span2')}
    ${trainWeekStrip()}
    ${weeklyCoachCard()}
    ${card(`${cardHead('Progressions', '<span class="tiny muted">Overload engine</span>', 'mountain')}
      <p class="tiny muted">Hit the top of the rep range on every set → add weight or level up. Tap a figure for form tips, ‹ › to adjust.</p>
      <ul class="progs">${Object.entries(FAMILIES).map(([fam, F]) => {
        const lv = familyLevel(fam), ex = F.ladder[lv], r = recommend(ex.id), best = bestEver(ex.id);
        return `<li class="prog">
          <button class="fig-tile sm" data-act="exGuide" data-ex="${ex.id}" aria-label="How to do ${esc(ex.name)}">${figureSVG(ex.id, 46)}</button>
          <div class="grow"><p class="tiny muted">${esc(F.name)}</p><p class="p-name">${esc(ex.name)}</p>
            <div class="ladder">${F.ladder.map((_, i) => `<i class="${i < lv ? 'past' : i === lv ? 'cur' : ''}" style="--c:${col(F.color)}"></i>`).join('')}</div>
            <p class="tiny ${r.status === 'levelup' ? 'gold' : 'muted'}">${best ? `Best ${best.v}${unitOf(ex)}${best.kg ? ` @ +${best.kg} kg` : ''} · ` : ''}${r.status === 'levelup' ? 'Ready to level up!' : r.status === 'new' ? 'Not logged yet' : recShort(r, ex)}</p></div>
          ${r.status === 'levelup' || r.next ? `<button class="btn claim sm" data-act="famLevel" data-fam="${fam}" data-d="1">Level up</button>` : ''}
          <div class="stepper"><button data-act="famLevel" data-fam="${fam}" data-d="-1" ${lv === 0 ? 'disabled' : ''} aria-label="Easier">${icon('left', 'sm')}</button><button data-act="famLevel" data-fam="${fam}" data-d="1" data-manual="1" ${lv === F.ladder.length - 1 ? 'disabled' : ''} aria-label="Harder">${icon('right', 'sm')}</button></div>
        </li>`;
      }).join('')}</ul>`)}
    ${routinesCard()}
    ${historyCard()}
  </div>`;
}

function viewActive() {
  const w = S.active;
  const exOptions = (sel = '', forEntry = null) => exOptionsHTML(sel, forEntry);
  return `<header class="page-head sticky-head glass">
      <div><p class="eyebrow"><span class="live-dot"></span> <span data-elapsed></span></p><h1 class="h-mid">${esc(w.name)}</h1></div>
      <button class="btn primary" data-act="finish">Finish</button></header>
    ${faithOn() ? `<section class="card glass dedicate"><p class="small"><b>Dedicate this session.</b> <i>“${esc(VERSES[15].text)}” — ${VERSES[15].ref}</i></p></section>` : ''}
    ${w.entries.map((e, ei) => {
      const ex = getEx(e.ex); if (!ex) return '';
      const u = unitOf(ex), loadable = ex.load, gym = isGym(ex), rest = e.rest || S.settings.restSec;
      const plates = gym && ex.kit === 'barbell' && ex.mech === 'C' && e.sets[0] && e.sets[0].kg >= 20 ? platesFor(e.sets[0].kg) : '';
      return `<section class="card glass ex-card" id="ex-${ei}">
        <div class="ex-top">
          <button class="fig-tile" data-act="exGuide" data-e="${ei}" aria-label="How to do ${esc(ex.name)}">${figureSVG(e.ex, 66, { grip: e.grip, width: e.width })}</button>
          <div class="grow"><p class="tiny muted">${gym ? `${esc(GROUPS[ex.group].name)} · ${KIT[ex.kit] || ''}` : ex.fam ? esc(FAMILIES[ex.fam].name) : 'Skill drill'}</p>
            <label class="ex-swap">${icon('swap', 'xs')}<select data-change="swapEx" data-e="${ei}" aria-label="Swap exercise"><option value="${e.ex}" selected>${esc(ex.name)}</option>${exOptions('', ex.skill ? null : e.ex)}</select><span class="ex-name">${esc(entryName(e))}</span></label></div>
          <button class="icon-btn" data-act="removeEx" data-e="${ei}" aria-label="Remove exercise">${icon('x', 'sm')}</button>
        </div>
        ${variantChips(e, ei)}
        <p class="rec ${e.status}">${icon(e.status === 'levelup' ? 'up' : e.status === 'load' ? 'plus' : e.status === 'deload' || e.status === 'stall' ? 'moon' : 'target', 'xs')} ${esc(e.rec)}</p>
        ${ex.how ? '' : `<p class="cue">${esc(ex.cue || '')}</p>`}
        <div class="row gap-s wrap mt-s ex-meta">${e.lo ? `<span class="chip xs">${icon('target', 'xs')} ${e.lo}–${e.hi}${u || ' reps'}</span>` : ''}<button class="chip xs chip-tap" data-act="cycleRest" data-e="${ei}">${icon('timer', 'xs')} Rest ${rest >= 60 ? `${Math.floor(rest / 60)}:${pad(rest % 60)}` : rest + 's'}</button>${plates ? `<span class="chip xs">${esc(plates)}</span>` : ''}</div>
        ${warmupTip(e, ei)}
        <div class="sets">
          <div class="set-row head"><span>Set</span><span>Target</span><span>${ex.kind === 'hold' ? 'Seconds' : 'Reps'}</span>${loadable ? `<span>${gym ? 'kg' : '+kg'}</span>` : '<span></span>'}<span></span></div>
          ${e.sets.map((s, si) => `<div class="set-row ${s.done ? 'done' : ''}" data-sid="${ei}-${si}">
            <span class="set-n">${si + 1}</span>
            <span class="muted">${s.t ?? '—'}${u}</span>
            <span class="num-step"><button data-act="setInc" data-e="${ei}" data-s="${si}" data-d="-${ex.kind === 'hold' ? 5 : 1}" aria-label="Less">${icon('minus', 'xs')}</button><input type="number" inputmode="numeric" min="0" value="${s.v ?? ''}" data-change="setVal" data-e="${ei}" data-s="${si}" data-f="v" aria-label="Value"><button data-act="setInc" data-e="${ei}" data-s="${si}" data-d="${ex.kind === 'hold' ? 5 : 1}" aria-label="More">${icon('plus', 'xs')}</button></span>
            ${loadable ? `<input class="kg" type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg || ''}" placeholder="0" data-change="setVal" data-e="${ei}" data-s="${si}" data-f="kg" aria-label="Added kg">` : '<span></span>'}
            <button class="set-done" data-act="setDone" data-e="${ei}" data-s="${si}" aria-label="Complete set">${icon('check', 'sm')}</button>
          </div>`).join('')}
        </div>
        <div class="row gap mt-s"><button class="btn ghost sm" data-act="addSet" data-e="${ei}">${icon('plus', 'xs')} Add set</button>${e.sets.length > 1 ? `<button class="btn ghost sm" data-act="delSet" data-e="${ei}">${icon('minus', 'xs')} Remove set</button>` : ''}</div>
        ${doneSets(e).length ? `<div class="effort mt-s"><span class="tiny muted">${gym ? 'Reps left in the tank?' : 'How did it feel?'}</span><div class="seg sm">${[1, 2, 3, 4].map(n => `<button class="${e.effort === n ? 'on' : ''}" data-act="setEffort" data-e="${ei}" data-v="${n}">${gym ? RIR[n] : EFFORT[n]}</button>`).join('')}</div></div>` : ''}
      </section>`;
    }).join('')}
    <section class="card glass">
      <label class="field"><span>Add exercise</span><select data-change="addEx"><option value="">Choose…</option>${exOptions()}</select></label>
    </section>
    <div class="row gap mt mb-xl"><button class="btn ghost grow danger-text" data-act="discard">Discard</button><button class="btn primary grow2" data-act="finish">${icon('check', 'sm')} Finish workout</button></div>`;
}

/* ---------- Training helpers: variants, guide sheet, weekly coach ---------- */
function variantChips(e, ei) {
  const ex = getEx(e.ex); if (!ex || !ex.vary) return '';
  const row = (k, opts) => `<div class="seg sm vchips">${Object.entries(opts).map(([v, n]) => `<button class="${(e[k] || (k === 'grip' ? 'over' : 'medium')) === v ? 'on' : ''}" data-act="setVariant" data-e="${ei}" data-k="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
  return `<div class="variants mt-s">${ex.vary.includes('grip') ? row('grip', GRIPS) : ''}${ex.vary.includes('width') ? row('width', WIDTHS) : ''}</div>`;
}
function recShort(r, ex) {
  const u = unitOf(ex);
  if (isGym(ex)) {
    if (r.status === 'load') return `Weight up → ${r.kg} kg × ${r.targets[0]}${u}`;
    if (r.status === 'stall') return `Stalled — reset to ${r.kg} kg`;
    if (r.status === 'reduce') return `Lighter: ${r.kg} kg × ${r.targets[0]}`;
    if (r.status === 'deload') return `Deload: ${r.kg} kg`;
    if (r.status === 'new') return `Start ${r.targets.length} × ${r.targets[0]}${r.kg ? ` @ ~${r.kg} kg` : ''}`;
    return `Next: ${r.kg ? `${r.kg} kg × ` : ''}${r.targets.join('·')}${u}`;
  }
  if (r.status === 'load') return `Add weight → +${r.kg} kg × ${r.targets[0]}${u}${r.next ? ' · or level up' : ''}`;
  if (r.status === 'deload') return 'Recovery day — lighter sets';
  if (r.status === 'hold') return `Repeat ${r.targets.join('·')}${u}, cleaner`;
  if (r.status === 'levelup') return `Ready for ${EX[r.next].name}`;
  if (r.status === 'new') return `Start ${r.targets.length} × ${r.targets[0]}${u}`;
  return `Next: ${r.targets.join('·')}${u}${r.kg ? ` @ +${r.kg} kg` : ''}`;
}
function weeklyCoachCard() {
  const R = weeklyReview();
  if (!R.sessions && !R.sessionsPrev) return '';
  const pct = (a, b) => b ? Math.round((a / b - 1) * 100) : null, dv = pct(R.vol, R.volPrev);
  const delta = (a, b, unit = '') => { const d = a - b; return b || a ? `<span class="tiny ${d > 0 ? 'green-t' : d < 0 ? 'red-t' : 'muted'}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}${unit}</span>` : ''; };
  const verdict = dv === null ? 'First week on record — next week Zelum compares the two.'
    : dv > 15 ? 'Big jump in volume. Great work — sleep and eat well so it sticks.'
    : dv >= 0 ? 'Steady progress. This is exactly how strength is built.'
    : dv > -20 ? 'A bit less than last week. Fine if you were tired — aim for your planned days.'
    : 'Much lower than last week. Rest is good; just don\'t let two weeks slip.';
  return card(`${cardHead('Weekly coach', '<span class="tiny muted">Last 7 days vs the 7 before</span>', 'chart')}
    <div class="wk-stats">
      <div><b>${R.sessions}</b><span class="tiny muted">sessions</span>${delta(R.sessions, R.sessionsPrev)}</div>
      <div><b>${fmtN(R.reps)}</b><span class="tiny muted">reps</span>${delta(R.reps, R.repsPrev)}</div>
      <div><b>${dv === null ? '—' : `${dv >= 0 ? '+' : ''}${dv}%`}</b><span class="tiny muted">volume</span></div>
      <div><b>${R.prs}</b><span class="tiny muted">PRs</span></div>
    </div>
    <p class="small muted mt-s">${verdict}</p>
    ${R.keys.length ? `<ul class="wk-list">${R.keys.map(k => { const kp = parseKey(k), ex = getEx(kp.ex), r = recommend(k);
      return `<li><button class="fig-tile xs" data-act="exGuide" data-ex="${kp.ex}" data-g="${kp.grip}" data-w="${kp.width}" aria-label="${esc(keyName(k))}">${figureSVG(kp.ex, 40, kp)}</button>
        <div class="grow"><p class="small"><b>${esc(keyName(k))}</b></p><p class="tiny ${r.status === 'load' || r.status === 'levelup' ? 'gold' : ['deload', 'stall', 'reduce'].includes(r.status) ? 'orange-t' : 'muted'}">${esc(recShort(r, ex))}</p></div></li>`; }).join('')}</ul>` : ''}`, 'span2');
}
/* =====================================================================
   SKILLS
   ===================================================================== */
function skillsContent() {
  const gs = goalSkill();
  return `
  <div class="skill-grid mt">${Object.entries(SKILLS).map(([id, K]) => {
    const d = S.skills[id] || 0, n = K.steps.length, cur = K.steps[d];
    return `<button class="skill-card glass ${id === gs ? 'quest' : ''}" data-act="openSkill" data-skill="${id}">
      ${id === gs ? '<span class="chip gold xs quest-tag">Main Quest</span>' : ''}
      ${ring({ pct: d / n, size: 70, sw: 6, color: col(K.color), inner: `<span class="glyph" style="color:${col(K.color)}">${K.emoji}</span>` })}
      <b>${esc(K.name)}</b>
      <span class="tiny muted">${d >= n ? 'Mastered 🏆' : `${d}/${n} · ${esc(cur.name)}`}</span></button>`;
  }).join('')}</div>
  ${card(`<p class="small muted">${icon('info', 'xs')} Practice skills <b>fresh</b>, at the start of a session, 2–3× a week. Log your best attempt; hit the target and the next step unlocks with bonus XP.</p>`)}`;
}

function skillSheet(id) {
  const K = SKILLS[id], d = S.skills[id] || 0;
  const logs = S.skillLog.filter(l => l.skill === id);
  return `<div class="row center gap"><span class="glyph-big" style="color:${col(K.color)}">${K.emoji}</span><div class="grow"><h3 class="sheet-title">${esc(K.name)}</h3><p class="muted small">${esc(K.blurb)}</p></div></div>
    <ol class="steps">${K.steps.map((s, i) => {
      const state = i < d ? 'done' : i === d ? 'cur' : 'locked';
      const best = Math.max(0, ...logs.filter(l => l.step === i).map(l => l.value));
      const u = s.kind === 'hold' ? 's' : ' reps';
      return `<li class="step ${state}">
        <span class="s-dot">${i < d ? icon('check', 'xs') : i + 1}</span>
        <span class="fig-tile xs">${figureSVG(`sk:${id}:${i}`, 40)}</span>
        <div class="grow"><p class="s-name">${esc(s.name)}</p><p class="tiny muted">Target ${s.target}${u}${best ? ` · best ${best}${u}` : ''}</p>
        ${state === 'cur' ? `<p class="small tip">💡 ${esc(s.tip)}</p>
          <div class="row gap-s mt-s center"><input class="inp sm" type="number" inputmode="numeric" min="0" placeholder="${s.kind === 'hold' ? 'Seconds' : 'Reps'}" id="skillVal" data-enter="logSkill" data-skill="${id}" data-noautofocus>
          <button class="btn soft sm" data-act="logSkill" data-skill="${id}">Log attempt</button>
          <button class="btn ${best >= s.target ? 'primary' : 'ghost'} sm" data-act="achieveSkill" data-skill="${id}">${icon('check', 'xs')} Achieved</button></div>` : ''}
        ${i === d - 1 ? `<button class="btn ghost xs mt-s" data-act="undoSkill" data-skill="${id}">Undo</button>` : ''}
        </div></li>`;
    }).join('')}</ol>
    <div class="row gap mt">${S.goal && S.goal.skill === id ? '<span class="chip gold">Main Quest</span>' : `<button class="btn ghost grow" data-act="pickGoal" data-preset="${(GOAL_PRESETS.find(g => g.skill === id) || {}).id || ''}">${icon('target', 'sm')} Make Main Quest</button>`}
    <button class="btn primary grow" data-act="startSkill" data-skill="${id}">${icon('play', 'sm')} Practice now</button></div>`;
}

/* =====================================================================
   FUEL
   ===================================================================== */
function viewFuel() {
  const k = fuelDay, t = targets(k), d = dayTotals(k), fd = peekFoodDay(k);
  const isToday = k === today();
  return `${head('Fuel', 'Nutrition & water', `<div class="date-nav glass"><button data-act="fuelDay" data-d="-1" aria-label="Previous day">${icon('left', 'sm')}</button><span>${relDay(k)}</span><button data-act="fuelDay" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Next day">${icon('right', 'sm')}</button></div>`)}
  ${card(`<div class="hero-art">${icon('fuel')}</div><div class="macro-rings">
      <div>${ring({ pct: d.kcal / t.kcal, size: 92, sw: 9, color: 'var(--orange)', inner: `<b>${fmtN(d.kcal)}</b><span class="tiny muted">kcal</span>` })}<p class="small muted">of ${fmtN(t.kcal)}</p></div>
      <div>${ring({ pct: d.p / t.protein, size: 92, sw: 9, color: 'var(--pink)', inner: `<b>${d.p}g</b><span class="tiny muted">protein</span>` })}<p class="small muted">of ${t.protein} g</p></div>
      <div>${ring({ pct: d.water / t.water, size: 92, sw: 9, color: 'var(--teal)', inner: `<b>${fmtL(d.water)}</b><span class="tiny muted">water</span>` })}<p class="small muted">of ${fmtL(t.water)}</p></div>
    </div>
    <div class="row gap mt"><button class="btn soft grow" data-act="water" data-ml="-${S.settings.glassMl}">${icon('minus', 'sm')}</button><button class="btn teal grow2" data-act="water" data-ml="${S.settings.glassMl}">${icon('drop', 'sm')} + Glass (${S.settings.glassMl} ml)</button><button class="btn soft grow" data-act="water" data-ml="500">+500</button></div>
    <p class="tiny muted mt-s center-t">${S.profile.bodyGoal === 'gain' ? 'Lean gain: small surplus, high protein.' : S.profile.bodyGoal === 'cut' ? 'Fat loss: moderate deficit, high protein.' : 'Maintenance: fuel performance.'} Targets adjust with your weight.</p>`, 'hero fuel-hero')}
  <div class="grid">
  ${MEALS.map(m => {
    const items = fd.items.filter(i => i.meal === m);
    return card(`${cardHead(m, `<span class="tiny muted">${fmtN(sum(items.map(i => i.kcal)))} kcal · ${Math.round(sum(items.map(i => i.p)))} g</span>`)}
      ${items.length ? `<ul class="food-list">${items.map(i => `<li><div class="grow"><p>${esc(i.name)}</p><p class="tiny muted">${i.qty} × ${esc(i.unit || 'serving')}</p></div><span class="small">${Math.round(i.kcal)} kcal · ${Math.round(i.p)} g</span><button class="icon-btn" data-act="delFood" data-id="${i.id}" aria-label="Remove">${icon('x', 'xs')}</button></li>`).join('')}</ul>` : '<p class="tiny muted">Nothing logged.</p>'}
      <button class="btn ghost sm mt-s" data-act="addFood" data-meal="${m}">${icon('plus', 'xs')} Add food</button>`);
  }).join('')}
  </div>
  ${faithOn() ? card(`<p class="verse-text small">“${esc(VERSE_FOOD.text)}”</p><p class="verse-ref">${VERSE_FOOD.ref}</p>`, 'verse-card') : ''}`;
}

function foodSheet() {
  const q = foodQuery.toLowerCase();
  const list = allFoods().filter(f => !q || f.name.toLowerCase().includes(q));
  return `<h3 class="sheet-title">Add to ${esc(foodMeal)}</h3>
    <input class="inp" type="search" placeholder="Search foods…" value="${esc(foodQuery)}" data-input="foodSearch" id="foodSearch" data-noautofocus>
    <div class="row center gap-s mt-s wrap"><span class="small muted">Servings</span>${[0.5, 1, 1.5, 2, 3, 4].map(n => `<button class="chip-btn ${foodServings === n ? 'on' : ''}" data-act="servings" data-n="${n}">${n === 0.5 ? '½' : n === 1.5 ? '1½' : n}</button>`).join('')}</div>
    <ul class="food-pick" id="foodPick">${list.map(f => `<li><button data-act="pickFood" data-id="${f.id}"><div class="grow"><p>${esc(f.name)}</p><p class="tiny muted">${esc(f.unit)} · ${f.kcal} kcal · ${f.p} g protein</p></div><span class="add-ic">${icon('plus', 'sm')}</span></button></li>`).join('') || '<li class="muted small">No match. Add it as a custom food below.</li>'}</ul>
    <details class="custom-food"><summary>${icon('edit', 'xs')} Custom food</summary>
      <div class="form-grid mt-s">
        <label class="field"><span>Name</span><input class="inp" id="cfName" value="${esc(foodQuery)}"></label>
        <label class="field"><span>Serving</span><input class="inp" id="cfUnit" placeholder="1 plate"></label>
        <label class="field"><span>kcal</span><input class="inp" id="cfKcal" type="number" inputmode="numeric"></label>
        <label class="field"><span>Protein g</span><input class="inp" id="cfP" type="number" inputmode="decimal"></label>
      </div>
      <button class="btn primary wide mt-s" data-act="customFood">Save & add</button>
    </details>`;
}

/* =====================================================================
   ME
   ===================================================================== */
function viewMe() {
  const li = levelInfo(), p = S.profile, w = latestWeight();
  const weeks = 8, wk0 = addDays(weekKey(), -7 * (weeks - 1));
  const perWeek = Array.from({ length: weeks }, (_, i) => { const a = addDays(wk0, i * 7), b = addDays(a, 7); return S.workouts.filter(x => x.date >= a && x.date < b).length; });
  const labels = Array.from({ length: weeks }, (_, i) => fmtDate(addDays(wk0, i * 7), { month: 'numeric', day: 'numeric' }));
  const bw = S.bodyweight.slice(-30).map(b => ({ x: fmtDate(b.date, { month: 'short', day: 'numeric' }), y: b.kg }));
  const nBadges = Object.keys(S.badges).length;
  return `${head('Me', 'Profile & progress', `<button class="round-btn glass" data-go="settings" aria-label="Settings">${icon('settings')}</button>`)}
  <section class="hero me-hero glass">
    <div class="hero-art">${shieldSVG(rankIndex(li.lvl), 190)}</div>
    <div class="row center gap">
    <button class="hero-shield big" data-go="path" aria-label="View the path to King">${shieldSVG(rankIndex(li.lvl), 78)}</button>
    <div class="grow"><h2>${esc(p.name || 'Athlete')}</h2><p class="gold small">Level ${li.lvl} · ${esc(li.title)}</p>
      <p class="tiny muted">${p.heightCm} cm · ${w ? w + ' kg' : 'weight not logged'} · ${p.discipline === 'gym' ? 'Gym' : 'Calisthenics'} · ${p.trainDays} days/week · ${{ gain: 'Lean gain', maintain: 'Maintain', cut: 'Fat loss' }[p.bodyGoal]}</p></div>
    <button class="icon-btn" data-act="editProfile" aria-label="Edit profile">${icon('edit', 'sm')}</button>
    </div>
    <button class="btn soft wide mt" data-go="path">${icon('crown', 'sm')} Path to King · ${esc(RANKS[Math.min(RANKS.length - 1, rankIndex(li.lvl) + 1)].title)} next</button>
  </section>
  ${card(planCardHTML(), 'plan-card-me')}
  ${accountCard()}
  <div class="stats">
    <div class="stat glass"><b>${S.workouts.length}</b><span>Workouts</span></div>
    <div class="stat glass"><b>${totalTonnage() ? fmtN(totalTonnage()) : fmtN(totalReps())}</b><span>${totalTonnage() ? 'kg lifted' : 'Total reps'}</span></div>
    <div class="stat glass"><b>${streak()}</b><span>Day streak</span></div>
    <div class="stat glass"><b data-count="${li.xp}" data-ck="xptotal">${fmtN(li.xp)}</b><span>Total XP</span></div>
  </div>
  <div class="grid">
    ${questCard()}
    ${card(`${cardHead('Bodyweight', `<button class="btn soft sm" data-act="weighIn">${icon('plus', 'xs')} Log</button>`, 'scale')}${lineChart(bw, { unit: ' kg' })}
      ${S.goal && S.goal.type === 'weight' ? `<p class="tiny muted mt-s">Goal: ${S.goal.target} kg</p>` : ''}`)}
    ${card(`${cardHead('Workouts per week', '', 'chart')}${barChart(perWeek, labels, { goal: p.trainDays })}`)}
    ${card(`${cardHead('Habit consistency', '<span class="tiny muted">12 weeks</span>', 'calendar')}${heatmap(12, k => dayCompletion(k))}
      <div class="row gap mt-s"><button class="btn ghost sm" data-go="habits">${icon('habits', 'xs')} Open Habits</button></div>`)}

  </div>`;
}

/* =====================================================================
   SETTINGS (v1.14.1) — everything that isn't progress, out of the Me screen.
   A phone-style list; each row opens one section, so only that section is built and drawn.
   Entering Settings or a section pushes a history entry, so Android's back button steps back out.
   ===================================================================== */
let settingsSec = null;
const SETTINGS_SECS = [
  { id: 'notifications', title: 'Notifications', icon: 'bell', c: 'var(--danger)', sub: () => S.settings.notif.enabled ? 'On' : 'Off' },
  { id: 'appearance', title: 'Appearance & music colors', icon: 'palette', c: 'var(--accent)', sub: () => (THEMES[S.settings.theme.preset] || {}).name || 'Custom' },
  { id: 'general', title: 'Training & app', icon: 'settings', c: 'var(--text-2)', sub: () => 'Days, goal, targets, sound, graphics' },
  { id: 'badges', title: 'Badges', icon: 'trophy', c: 'var(--xp)', sub: () => `${Object.keys(S.badges).length} of ${ACHIEVEMENTS.length} earned` },
  { id: 'data', title: 'Your data', icon: 'shield', c: 'var(--success)', sub: () => 'Backup, restore, reset' },
];
const SETTINGS_GROUPS = [['notifications', 'appearance'], ['general'], ['badges'], ['data']];
function settingsSection(id) {
  const p = S.profile, nBadges = Object.keys(S.badges).length;
  switch (id) {
    case 'notifications': return card(notifCardHTML(), 'notif-card');
    case 'appearance': return card(`${cardHead('Appearance', '', 'palette')}<p class="small muted" style="margin-bottom:12px">Choose a palette, then tune any color — accent, glows, XP, streak flames, water, food${faithOn() ? ', faith' : ''}.</p><div id="appearanceBody">${appearanceHTML()}</div>`, 'span2');
    case 'general': return card(`${cardHead('Settings', '', 'settings')}
      <button class="btn soft wide" data-act="trainSetup">${icon('dumbbell', 'sm')} Training setup — discipline, goal, level, days, equipment</button>
      <div class="form-grid mt">
        <label class="field"><span>Training days / week</span><select data-change="setting" data-k="trainDays">${[2, 3, 4, 5, 6].map(n => `<option ${p.trainDays === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>Body goal</span><select data-change="setting" data-k="bodyGoal">${[['gain', 'Lean muscle gain'], ['maintain', 'Maintain'], ['cut', 'Fat loss']].map(([v, l]) => `<option value="${v}" ${p.bodyGoal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Rest timer (s)</span><input class="inp" type="number" inputmode="numeric" value="${S.settings.restSec}" data-change="setting" data-k="restSec"></label>
        <label class="field"><span>Glass size (ml)</span><input class="inp" type="number" inputmode="numeric" value="${S.settings.glassMl}" data-change="setting" data-k="glassMl"></label>
        <label class="field"><span>Calorie target <em>(0 = auto)</em></span><input class="inp" type="number" inputmode="numeric" value="${S.settings.kcalTarget}" data-change="setting" data-k="kcalTarget"></label>
        <label class="field"><span>Protein g <em>(0 = auto)</em></span><input class="inp" type="number" inputmode="numeric" value="${S.settings.proteinTarget}" data-change="setting" data-k="proteinTarget"></label>
        <label class="field"><span>Water ml <em>(0 = auto)</em></span><input class="inp" type="number" inputmode="numeric" value="${S.settings.waterTarget}" data-change="setting" data-k="waterTarget"></label>
        <label class="field"><span>Sound effects</span><select data-change="setting" data-k="sound"><option value="1" ${S.settings.sound ? 'selected' : ''}>On</option><option value="0" ${S.settings.sound ? '' : 'selected'}>Off</option></select></label>
        <label class="field"><span>Volume <em id="volVal">${Math.round((S.settings.volume ?? 0.7) * 100)}%</em></span><input type="range" min="0" max="100" value="${Math.round((S.settings.volume ?? 0.7) * 100)}" data-input="volume" data-change="volumeDone" aria-label="Volume"></label>
        <label class="field"><span>Graphics</span><select data-change="gfx">${[['auto', 'Auto'], ['full', 'Full glass'], ['smooth', 'Smooth (less blur)']].map(([v, l]) => `<option value="${v}" ${Gfx.pref() === v ? 'selected' : ''}>${l}${v === 'auto' ? ` · now ${Gfx.lite() ? 'Smooth' : 'Full'}` : ''}</option>`).join('')}</select></label>
        ${Native.isApp && Native.renderMode ? `<label class="field"><span>Drawing mode <em>(Android)</em></span><select data-change="rendering">${RENDER_MODES.map(([v, l]) => `<option value="${v}" ${Native.renderMode === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      </div>
      ${Native.isApp && Native.renderMode ? '<p class="tiny muted mt-s">Seeing coloured dots or glitches while switching screens? Try another drawing mode; it applies instantly.</p>' : ''}
      <div class="nrow faith-row mt"><div class="grow"><b class="small">Faith mode</b><span class="tiny muted">Adds a verse of the day, Scripture in workouts and level-ups, prayer and Bible habits, and a daily faith mission.</span></div>
        <button class="switch ${faithOn() ? 'on' : ''}" data-act="faithToggle" role="switch" aria-checked="${faithOn()}" aria-label="Faith mode"><i></i></button></div>`);
    case 'badges': return card(`${cardHead('Badges', `<span class="tiny muted">${nBadges}/${ACHIEVEMENTS.length}</span>`, 'trophy')}
      <div class="badges">${ACHIEVEMENTS.map(a => `<div class="badge ${S.badges[a.id] ? 'on' : ''}" title="${esc(a.desc)}"><span>${icon(a.icon)}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>`, 'span2');
    case 'data': return card(`${cardHead('Your data', '', 'shield')}
      <p class="small muted">Everything is stored privately on this device and works offline. Export a backup regularly, and use it to move your progress between your phone and computer.</p>
      <div class="row gap mt wrap">
        <button class="btn soft" data-act="exportData">${icon('download', 'sm')} Export backup</button>
        <label class="btn soft">${icon('upload', 'sm')} Import backup<input type="file" accept="application/json,.json" hidden data-change="importData"></label>
        ${installEvt ? `<button class="btn primary" data-act="install">${icon('download', 'sm')} Install app</button>` : ''}
        <button class="btn ghost danger-text" data-act="resetAll">${icon('trash', 'sm')} Reset</button>
      </div>
      <p class="tiny muted mt">iPhone: open in Safari → Share → <b>Add to Home Screen</b>. Android/PC: browser menu → <b>Install app</b>. · <button class="link" data-act="whatsNew">v${VERSION} · What's new</button>${engineTag()}</p>`);
  }
  return '';
}
function viewSettings() {
  const sec = SETTINGS_SECS.find(x => x.id === settingsSec);
  const back = `<button class="round-btn glass" data-act="settingsBack" aria-label="Back">${icon('right', 'flip')}</button>`;
  if (sec) return `<header class="page-head set-head">${back}<div class="grow"><p class="eyebrow">Settings</p><h1>${sec.title}</h1></div></header>
    <div class="set-body">${settingsSection(sec.id)}</div>`;
  const row = x => `<button class="srow" data-go="settings/${x.id}"><span class="s-ic" style="--tc:${x.c}">${icon(x.icon, 'sm')}</span>
    <span class="grow"><b>${x.title}</b><span>${esc(x.sub())}</span></span>${icon('right', 'sm s-chev')}</button>`;
  return `<header class="page-head set-head">${back}<div class="grow"><p class="eyebrow">Me</p><h1>Settings</h1></div></header>
    ${SETTINGS_GROUPS.map(g => `<div class="sgroup glass">${g.map(id => row(SETTINGS_SECS.find(x => x.id === id))).join('')}</div>`).join('')}
    <div class="sgroup glass"><button class="srow" data-act="whatsNew"><span class="s-ic" style="--tc:var(--accent-hi)">${icon('info', 'sm')}</span>
      <span class="grow"><b>What's new</b><span>Zelum ${VERSION}</span></span>${icon('right', 'sm s-chev')}</button></div>`;
}

/* =====================================================================
   ONBOARDING
   ===================================================================== */
function viewOnboarding() {
  const d = onb.d, s = onb.step, total = 6, gym = d.discipline === 'gym';
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(d[k]) === String(v) ? 'on' : ''}" data-act="onbSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const num = (k, label, extra = '') => `<label class="field"><span>${label}</span><input class="inp" type="number" inputmode="decimal" name="${k}" value="${esc(d[k])}" data-input="onb" ${extra}></label>`;
  const steps = [
    () => `<div class="onb-hero">${logoSVG({ size: 110, cls: 'onb-logo' })}<h1 class="display">ZELUM</h1>
      <p class="lead">Every rep, every meal, every habit&nbsp;— tracked.<br>Calisthenics. Gym. Discipline.</p>
      <p class="quote mt">Small daily wins compound into the impossible.</p></div>`,
    () => `<h2>How do you train?</h2><p class="muted">You can switch any time — both keep their own plan, and one coach reads them together.</p>
      <div class="choice-list mt">${[['cal', 'Calisthenics', 'Bodyweight: bars, floor, skills like the muscle-up and handstand. Progressions instead of plates.', 'train'], ['gym', 'Gym / weights', 'Barbells, dumbbells, cables and machines. A full plan with sets, reps, weights and rest.', 'dumbbell']].map(([v, l, x, ic]) =>
        `<button class="choice glass-btn ${d.discipline === v ? 'on' : ''}" data-act="onbSet" data-k="discipline" data-v="${v}"><b>${icon(ic, 'sm')} ${l}</b><span class="small muted">${x}</span></button>`).join('')}</div>`,
    () => `<h2>About you</h2><p class="muted">Used for your nutrition and water targets. Not sure of your weight? Use your best guess and weigh in when you can.</p>
      <div class="form-grid mt">
        <label class="field span2"><span>Name</span><input class="inp" name="name" value="${esc(d.name)}" data-input="onb" placeholder="Your name" autocomplete="given-name"></label>
        ${num('height', 'Height (cm)')}${num('weight', 'Weight (kg)', 'placeholder="e.g. 61"')}${num('age', 'Age')}
        <label class="field"><span>Sex</span>${seg('sex', [['m', 'Male'], ['f', 'Female']])}</label>
      </div>`,
    () => gym ? `<h2>Your training</h2><p class="muted">This shapes your plan, rep ranges and how fast Zelum adds weight.</p>
      <div class="form-grid mt">
        <label class="field span2"><span>Experience</span>${seg('experience', [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']])}</label>
        <label class="field span2"><span>Goal</span>${seg('focus', [['hypertrophy', 'Muscle'], ['strength', 'Strength'], ['endurance', 'Endurance'], ['general', 'Fitness']])}</label>
        <label class="field span2"><span>Training days per week</span>${seg('trainDays', [[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']])}</label>
        <label class="field span2"><span>Session length</span>${seg('sessionMin', [[45, '45 min'], [60, '60 min'], [75, '75 min'], [90, '90 min']])}</label>
        <label class="field span2"><span>Where do you train?</span>${seg('kit', [['gym', 'Full gym'], ['home', 'Home gym'], ['db', 'Dumbbells']])}</label></div>
      <p class="tiny muted mt">Fine-tune equipment, split and favorite exercises later in Train → Setup.</p>`
    : `<h2>Placement test</h2><p class="muted">Max strict reps in one set — honest numbers. This sets your starting level on every progression.</p>
      <div class="form-grid mt">${num('pullups', 'Pull-ups')}${num('pushups', 'Push-ups')}${num('dips', 'Dips')}
        <label class="field"><span>Pistol squat?</span>${seg('pistol', [['no', 'No'], ['assisted', 'Assisted'], ['yes', 'Yes']])}</label>
        <label class="field span2"><span>Training days per week</span>${seg('trainDays', [[3, '3'], [4, '4'], [5, '5'], [6, '6']])}</label></div>
      <p class="tiny muted mt">Not sure? 4 days is a great default.</p>`,
    () => `<h2>Body goal</h2><p class="muted">Sets your calories. At your height, a lean gain usually makes skills easier to learn over time — strength first, then size.</p>
      <div class="choice-list mt">${[['gain', 'Lean muscle gain', 'Small surplus (+300 kcal), high protein. Aim +0.25 kg/week.'], ['maintain', 'Maintain & recomp', 'Eat at maintenance, get stronger at the same weight.'], ['cut', 'Lose fat', 'Moderate deficit (−400 kcal). Easier skills, slower strength.']].map(([v, l, x]) =>
        `<button class="choice glass-btn ${d.bodyGoal === v ? 'on' : ''}" data-act="onbSet" data-k="bodyGoal" data-v="${v}"><b>${l}</b><span class="small muted">${x}</span></button>`).join('')}</div>`,
    () => goalPicker(d, true),
    () => `<div class="onb-hero"><div class="onb-check">${icon('check')}</div><h2>Your quest begins</h2>
      <p class="muted">Every workout, meal, glass of water and habit earns XP. Missions refresh daily. Your coach, Caleb, is one tap away.</p>
      <p class="quote mt">The rep you don't want to do is the one that changes you.</p></div>`,
  ];
  return `<div class="onb glass">
    <div class="onb-progress">${Array.from({ length: total + 1 }, (_, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>
    <div class="onb-body">${steps[s]()}</div>
    <div class="row gap mt">${s > 0 ? `<button class="btn ghost" data-act="onbBack">Back</button>` : ''}
      <button class="btn primary grow" data-act="onbNext">${s === 0 ? 'Begin' : s === total ? 'Begin my journey' : 'Continue'}</button></div>
    ${s === 0 && Cloud.enabled() ? `<button class="btn google wide mt-s" data-act="cloudSignIn">${GOOGLE_G} I already use Zelum — restore with Google</button>` : ''}
  </div>`;
}

/* Account: Google sign-in keeps progress safe across phones and computers */
function accountCard() {
  if (!Cloud.enabled()) return card(`${cardHead('Account', '', 'shield')}
    <p class="small muted">Google sign-in is almost ready. Once it's connected, your progress is backed up to your Google account and syncs between your phone and computer.</p>`, 'account-card');
  const u = Cloud.user;
  if (!u) return card(`${cardHead('Account', '<span class="chip">Not signed in</span>', 'shield')}
    <p class="small muted">Sign in to back up your progress and sync it between your phone and computer. New phone? Sign in and everything comes back.</p>
    <button class="btn google wide mt" data-act="cloudSignIn">${GOOGLE_G} Continue with Google</button>`, 'account-card');
  return card(`${cardHead('Account', `<span class="chip green">${icon('check', 'xs')} Signed in</span>`, 'shield')}
    <div class="row center gap">
      ${u.photoURL ? `<img class="acct-photo" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<div class="acct-photo">${esc((u.displayName || u.email || '?')[0].toUpperCase())}</div>`}
      <div class="grow"><b>${esc(u.displayName || 'Google account')}</b><p class="tiny muted">${esc(u.email || '')}</p>
        <p class="tiny sync-line" data-cloud-status data-state="${Cloud.status}">${cloudStatusText()}</p></div>
    </div>
    <div class="row gap mt"><button class="btn soft grow" data-act="cloudSync">${icon('refresh', 'sm')} Sync now</button><button class="btn ghost" data-act="cloudSignOut">Sign out</button></div>
    <button class="btn ghost wide mt-s tiny muted" data-act="cloudDelete">Delete account &amp; cloud backup</button>`, 'account-card');
}
function goalPicker(d, inOnb) {
  const disc = inOnb ? d.discipline : S.profile.discipline, presets = GOAL_PRESETS.filter(g => !g.disc || g.disc === disc);
  const sel = presets.find(g => g.id === d.goal) || presets[0];
  const defTarget = sel.type === 'reps' ? sel.target : sel.type === 'lift' ? liftTarget(sel, +d.weight || latestWeight() || 65) : sel.type === 'weight' ? Math.round(((+d.weight || latestWeight() || 61) + 4)) : '';
  return `<h2>Choose your Main Quest</h2><p class="muted">One clear goal. Missions, workouts and the coach will all point you toward it.</p>
    <div class="goal-grid mt">${presets.map(g => `<button class="goal-opt glass-btn ${g.id === sel.id ? 'on' : ''}" data-act="${inOnb ? 'onbSet' : 'goalSet'}" data-k="goal" data-v="${g.id}">
      <span>${icon(g.type === 'skill' ? 'star' : g.type === 'reps' ? 'bolt' : g.type === 'lift' ? 'dumbbell' : 'scale')}</span><b>${esc(g.title)}</b><small class="muted">${g.type === 'skill' ? `${SKILLS[g.skill].steps.length}-step skill tree` : g.type === 'reps' ? 'Max reps in one set' : g.type === 'lift' ? 'Estimated 1-rep max' : 'Bodyweight target'}</small></button>`).join('')}</div>
    <div class="form-grid mt">
      ${sel.type !== 'skill' ? `<label class="field"><span>${sel.type === 'reps' ? 'Target reps' : sel.type === 'lift' ? 'Target (kg, est. 1-rep max)' : 'Target weight (kg)'}</span><input class="inp" type="number" inputmode="decimal" name="target" value="${esc(d.target || defTarget)}" data-input="${inOnb ? 'onb' : 'goalForm'}"></label>` : ''}
      <label class="field ${sel.type === 'skill' ? 'span2' : ''}"><span>Deadline</span><div class="seg">${[8, 12, 16, 24].map(n => `<button class="${+d.weeks === n ? 'on' : ''}" data-act="${inOnb ? 'onbSet' : 'goalSet'}" data-k="weeks" data-v="${n}">${n} wk</button>`).join('')}</div></label>
      <label class="field span2"><span>Why does this matter to you?</span><input class="inp" name="why" value="${esc(d.why)}" data-input="${inOnb ? 'onb' : 'goalForm'}" placeholder="e.g. To honor God with a strong body"></label>
    </div>`;
}
function placeLevels(d) {
  const pu = +d.pullups || 0, ps = +d.pushups || 0, dp = +d.dips || 0, L = {};
  L.vpull = pu === 0 ? 2 : pu < 12 ? 3 : pu < 18 ? 4 : 5;
  L.hrow = pu === 0 ? 0 : pu < 8 ? 1 : pu < 15 ? 2 : 3;
  L.hpush = ps < 5 ? 0 : ps < 15 ? 1 : ps < 30 ? 2 : ps < 45 ? 3 : 4;
  L.dip = dp === 0 ? (ps >= 10 ? 1 : 0) : dp < 5 ? 1 : 2;
  L.vpush = ps < 15 ? 0 : ps < 30 ? 1 : 2;
  L.squat = d.pistol === 'yes' ? 4 : d.pistol === 'assisted' ? 2 : 1;
  L.hinge = 1; L.core = pu === 0 ? 0 : pu < 8 ? 1 : pu < 15 ? 2 : 3; L.calves = 0;
  return L;
}
function liftTarget(p, bw) { return Math.max(p.target, Math.round(bw * p.bw / 5) * 5); }
function setGoalFrom(d) {
  const p = GOAL_PRESETS.find(g => g.id === d.goal) || GOAL_PRESETS[0];
  if (S.goal) S.pastGoals.push({ ...S.goal, ended: today(), completed: false });
  const g = { presetId: p.id, type: p.type, title: p.title, start: today(), deadline: addDays(today(), (+d.weeks || 12) * 7), why: (d.why || '').trim(), tests: [] };
  if (p.type === 'skill') { g.skill = p.skill; g.target = SKILLS[p.skill].steps.length; g.startValue = S.skills[p.skill] || 0; }
  if (p.type === 'reps') {
    g.ex = p.ex; g.target = Math.max(1, Math.round(+d.target || p.target));
    g.startValue = Math.max(bestEver(p.ex)?.v || 0, (S.placement && S.placement[p.ex]) || 0);
    if (g.target <= g.startValue) g.target = g.startValue + 5;
    g.title = p.title.replace(/^\d+/, g.target);
  }
  if (p.type === 'lift') {
    const rec = exRecords().find(r => r.ex === p.ex);
    g.ex = p.ex; g.startValue = rec ? Math.round(rec.e1 * 2) / 2 : 0;
    g.target = Math.max(1, Math.round(+d.target || liftTarget(p, latestWeight() || 65)));
    if (g.target <= g.startValue) g.target = Math.round(g.startValue * 1.1);
    g.title = `${getEx(p.ex).name.replace(/^Barbell /, '')} ${g.target} kg`;
  }
  if (p.type === 'weight') {
    g.startValue = latestWeight() || 61; g.target = Math.round((+d.target || g.startValue + 4) * 10) / 10;
    g.title = `${g.target > g.startValue ? 'Build lean muscle' : 'Reach'} → ${g.target} kg`;
  }
  S.goal = g;
}

/* =====================================================================
   COACH
   ===================================================================== */
function coachHTML() {
  const msgs = S.chat.slice(-60);
  const last = msgs[msgs.length - 1];
  return `<div class="coach-head"><div class="coach-av">C</div><div class="grow"><h3 class="sheet-title">Coach Caleb</h3><p class="tiny muted">Offline coach · reads your logs</p></div><button class="icon-btn" data-act="clearChat" aria-label="Clear chat">${icon('refresh', 'sm')}</button><button class="icon-btn" data-act="closeSheet" aria-label="Close">${icon('x', 'sm')}</button></div>
    <div class="chat" id="chat">${msgs.map(m => `<div class="msg ${m.who}">${md(m.text)}${m.action && m === last ? `<button class="btn primary sm mt-s" data-act="coachAction">${esc(m.action.label)}</button>` : ''}</div>`).join('')}</div>
    ${last && last.chips ? `<div class="chips">${last.chips.map(c => `<button class="chip-btn" data-act="coachChip" data-t="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    <div class="chat-input"><input class="inp" id="coachIn" placeholder="Ask Caleb… e.g. “I weigh 62 kg”" data-enter="coachSend" autocomplete="off"><button class="btn primary icon" data-act="coachSend" aria-label="Send">${icon('send', 'sm')}</button></div>`;
}
function openCoach() {
  if (!S.chat.length) {
    const r = coachReply('hello');
    S.chat.push({ who: 'bot', text: `${r.text}\n\nI'm here for training plans, nutrition, water, skills and encouragement — all offline.`, chips: ['Today\'s workout', 'My progress', 'How much protein?', 'Give me a verse'] });
  }
  openSheet(coachHTML(), { cls: 'coach' });
  scrollChat();
}
function rerenderCoach() { const s = sheetEl(); if (s && s.closest('.sheet-wrap') && s.classList.contains('coach')) { s.innerHTML = '<div class="grabber"></div>' + coachHTML(); scrollChat(); } }
function scrollChat() { const c = document.getElementById('chat'); if (c) c.scrollTop = c.scrollHeight; }
function coachSend(text) {
  text = (text || '').trim(); if (!text) return;
  S.chat.push({ who: 'me', text });
  rerenderCoach();
  const c = document.getElementById('chat');
  if (c) { c.insertAdjacentHTML('beforeend', '<div class="msg bot typing"><i></i><i></i><i></i></div>'); scrollChat(); }
  setTimeout(() => {
    const r = coachReply(text);
    S.chat.push({ who: 'bot', text: r.text, chips: r.chips, action: r.action });
    if (S.chat.length > 80) S.chat = S.chat.slice(-60);
    addXP(`coach:${today()}`, 5, 'Talked with your coach');
    syncDailyXP(); checkAchievements(); save();
    rerenderCoach(); render(); flushLevelUp();
    const inp = document.getElementById('coachIn'); if (inp && matchMedia('(pointer:fine)').matches) inp.focus();
  }, 450);
}

/* =====================================================================
   ACTION HELPERS
   ===================================================================== */
function logWeight(kg) {
  const k = today();
  S.bodyweight = S.bodyweight.filter(b => b.date !== k);
  S.bodyweight.push({ date: k, kg: Math.round(kg * 10) / 10 });
  S.bodyweight.sort((a, b) => a.date.localeCompare(b.date));
  addXP(`weigh:${weekKey()}`, 15, 'Weekly weigh-in');
  save();
}
function addWater(ml, k = today()) {
  const d = foodDay(k);
  d.water = Math.max(0, (d.water || 0) + ml);
  syncDailyXP(k); save();
}
function startWorkout(tpl, skill) {
  if (S.active) { go('train'); toast('Finish or discard your current workout first'); return; }
  if (tpl === 'skill' && skill) {
    const saved = S.goal; S.goal = { type: 'skill', skill }; S.active = buildWorkout('skill'); S.goal = saved;
    S.active.name = `${SKILLS[skill].name} Practice`;
  } else S.active = buildWorkout(tpl);
  closeSheet(true); save(); SFX.play('start'); haptic(); go('train');
  if (Native.isApp) Native.ensurePermission();
}
function startRest(sec) {
  rest = { end: Date.now() + sec * 1000, total: sec };
  islandSig = ''; tick();
}
function tick() {
  quitTick();
  if (S.active) {
    const el = (Date.now() - S.active.start) / 1000;
    document.querySelectorAll('[data-elapsed]').forEach(n => setText(n, `${Math.floor(el / 60)}:${pad(Math.floor(el % 60))}`));
  }
  if (rest && Date.now() >= rest.end) { rest = null; islandSig = ''; restFinished(); }
  renderIsland();
  checkReminders();
  if (Updater.pending) Updater.tryApply();   // a waiting update goes in as soon as things are calm
  try { Native.workoutSync(); } catch (e) { console.warn(e); }
}

/* ---------- Updates ----------
   The service worker opens Zelum from the copy on the phone (instant, offline) and downloads any new version in
   the background. When one is ready it says so, and the app restarts into it at a calm moment: right away when
   nothing is open, otherwise once sheets are closed and no rest timer runs, or silently when the app goes to the
   background. Progress is saved first; an active workout survives the restart. */
const Updater = {
  pending: null, lastCheck: 0,
  ready(v) { if (!v || v === VERSION) return; this.pending = v; this.tryApply(); },
  calm() {
    const a = document.activeElement;
    return !document.querySelector('.sheet-wrap') && !rest && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  },
  tryApply() { if (this.pending && !document.hidden && this.calm()) this.apply(false); },
  apply(silent) {
    const v = this.pending; this.pending = null;
    try { saveNow(false); } catch (e) { }
    if (silent) return location.reload();
    toast(`${icon('refresh', 'xs')} Updating Zelum to v${esc(v)}…`);
    setTimeout(() => location.reload(), 900);
  },
  check() {
    if (Date.now() - this.lastCheck < 5 * 60000) return this.tryApply();
    this.lastCheck = Date.now();
    navigator.serviceWorker.getRegistration().then(r => { if (r) { r.update().catch(() => { }); if (r.active) r.active.postMessage({ type: 'check' }); } }).catch(() => { });
    this.tryApply();
  },
};

/* =====================================================================
   ACTIONS (click)
   ===================================================================== */
const ACT = {
  settingsBack: () => { if (navDepth > 0) history.back(); else go(settingsSec ? 'settings' : 'me'); },
  closeSheet: () => closeSheet(),
  confirmYes: () => { const cb = confirmCb; confirmCb = null; closeSheet(true); cb && cb(); },
  coach: () => openCoach(),
  missionTab: d => { missionTab = d.v; render(); },
  trainTab: d => { trainTab = d.v; render(); },
  faithToggle: () => {
    S.settings.faith = !faithOn();
    if (S.settings.faith) {   // bring back prayer and Scripture habits for people who never had them
      const added = DEFAULT_HABITS.filter(h => h.faith && !S.habits.some(x => x.id === h.id)).map(h => normHabit({ ...h, created: today() }));
      S.habits.push(...added);
    }
    save(); SFX.play(S.settings.faith ? 'toggleOn' : 'toggleOff'); haptic(); render(); Native.sync();
    toast(S.settings.faith ? `${icon('check', 'xs')} Faith mode on: verse of the day, Scripture and prayer habits` : 'Faith mode off. Your prayer and Scripture habits stay until you remove them.');
  },
  amen: () => { S.claimed[`done:m:${today()}:faith`] = true; toggleHabit('pray', true); toggleHabit('word', true); SFX.play('check'); fx('[data-hid=pray],[data-hid=word]', 'pop'); haptic(); refresh(); },
  claim: (d, el) => {
    const r = el.getBoundingClientRect();
    if (addXP(d.key, +d.xp, d.title)) { burst(r.left + r.width / 2, r.top + r.height / 2, 18); SFX.play('coin'); haptic(20); fx(`[data-mkey="${d.key}"]`, 'claim-anim'); }
    refresh();
  },
  manualMission: d => { S.claimed[`done:${d.key}`] = true; SFX.play('check'); if (d.key.endsWith(':faith')) { toggleHabit('pray', true); toggleHabit('word', true); } haptic(); refresh(); },
  water: d => { addWater(+d.ml, route === 'fuel' ? fuelDay : today()); SFX.play(+d.ml > 0 ? 'water' : 'toggleOff'); haptic(); refresh(); },

  /* Habits */
  /* Appearance */
  appearance: () => openSheet(`<div class="row between center"><h3 class="sheet-title">Appearance</h3><button class="round-btn glass" data-act="closeSheet" aria-label="Close">${icon('x')}</button></div>
    <p class="small muted">Pick a palette, then fine-tune any color. Changes apply instantly.</p><div class="mt" id="appearanceBody">${appearanceHTML()}</div>`, { cls: 'tall' }),
  themePreset: d => { if (!FREE_THEMES.includes(d.v) && !requirePlan('themes')) return; S.settings.theme.preset = d.v; S.settings.theme.colors = {}; applyTheme(); save(); render(); rerenderAppearance(); haptic(); },
  themeReset: () => { S.settings.theme.colors = {}; applyTheme(); save(); render(); rerenderAppearance(); },
  start: d => startWorkout(d.tpl),
  startSkill: d => startWorkout('skill', d.skill),
  pickGoal: d => {
    const g = { goal: d.preset || S.goal?.presetId || 'g_muscleup', target: '', weeks: 12, why: S.goal?.why || '' };
    ACT._goalDraft = g;
    openSheet(`${goalPicker(g, false)}<div class="row gap mt"><button class="btn ghost grow" data-act="closeSheet">Cancel</button><button class="btn primary grow" data-act="saveGoal">Set Main Quest</button></div>`, { cls: 'tall' });
  },
  goalSet: d => { const g = ACT._goalDraft; g[d.k] = d.v; if (d.k === 'goal') g.target = ''; sheetEl().innerHTML = `<div class="grabber"></div>${goalPicker(g, false)}<div class="row gap mt"><button class="btn ghost grow" data-act="closeSheet">Cancel</button><button class="btn primary grow" data-act="saveGoal">Set Main Quest</button></div>`; },
  saveGoal: () => { setGoalFrom(ACT._goalDraft); addXP(`goalset:${S.goal.start}:${S.goal.presetId}`, 30, 'New Main Quest'); closeSheet(); toast(`${icon('target', 'xs')} Main Quest: ${esc(S.goal.title)}`); refresh(); },
  completeGoal: () => {
    const g = S.goal;
    S.pastGoals.push({ ...g, ended: today(), completed: true });
    addXP(`quest:${g.start}:${g.presetId}`, 500, `Quest complete: ${g.title}`);
    S.goal = null; burst(innerWidth / 2, innerHeight / 3, 50); SFX.play('levelUp');
    refresh(false);
    openSheet(`<div class="levelup"><div class="lu-glow"></div><p class="eyebrow gold">Quest complete</p><div class="lu-num">${icon('trophy')}</div><h2>${esc(g.title)}</h2>
      ${faithOn() ? '<p class="verse-text">“I have fought a good fight, I have finished my course, I have kept the faith.”</p><p class="verse-ref">2 Timothy 4:7</p>' : '<p class="quote">Every master was once a beginner who refused to stop.</p>'}
      <button class="btn primary wide mt" data-act="pickGoal">Choose the next quest</button></div>`, { cls: 'center', onClose: flushLevelUp });
  },
  maxTest: () => {
    const ex = getEx(S.goal.ex);
    openSheet(`<h3 class="sheet-title">Max test · ${esc(ex.name)}</h3><p class="muted small">Warm up well, then one all-out set with strict form.</p>
      <input class="inp mt" type="number" inputmode="numeric" id="maxVal" placeholder="Reps" data-enter="saveMax"><button class="btn primary wide mt" data-act="saveMax">Save</button>`);
  },
  saveMax: () => {
    const v = +document.getElementById('maxVal').value; if (!v) return;
    S.goal.tests = S.goal.tests || []; S.goal.tests.push({ date: today(), v });
    addXP(`maxtest:${today()}`, 25, 'Max test logged'); closeSheet(); refresh();
  },
  weighIn: () => openSheet(`<h3 class="sheet-title">Weigh in</h3><p class="muted small">Best: morning, after the bathroom, before eating. Once a week is enough.</p>
    <input class="inp mt" type="number" inputmode="decimal" step="0.1" id="wVal" placeholder="kg" value="${latestWeight() || ''}" data-enter="saveWeight"><button class="btn primary wide mt" data-act="saveWeight">Save</button>`),
  saveWeight: () => { const v = parseFloat(String(document.getElementById('wVal').value).replace(',', '.')); if (!(v >= 30 && v <= 200)) return toast('Enter a weight in kg'); logWeight(v); closeSheet(); refresh(); },

  /* Skills */
  openSkill: d => { if (!FREE_SKILLS.includes(d.skill) && d.skill !== goalSkill() && !requirePlan('skills')) return; openSheet(skillSheet(d.skill), { cls: 'tall' }); },
  logSkill: d => {
    const inp = document.getElementById('skillVal'), v = +inp.value; if (!v) return;
    const st = S.skills[d.skill] || 0;
    S.skillLog.push({ date: today(), skill: d.skill, step: st, value: v });
    addXP(`skilllog:${today()}:${d.skill}`, 15, 'Skill practice');
    const s = SKILLS[d.skill].steps[st];
    if (v >= s.target) toast(`${icon('star', 'xs')} Target hit! Tap “Achieved” to unlock the next step`);
    refresh(); sheetEl().innerHTML = '<div class="grabber"></div>' + skillSheet(d.skill);
  },
  achieveSkill: (d, el) => {
    const K = SKILLS[d.skill], st = S.skills[d.skill] || 0; if (st >= K.steps.length) return;
    S.skills[d.skill] = st + 1;
    addXP(`skill:${d.skill}:${st}`, 100 + st * 25, `Unlocked: ${K.steps[st].name}`);
    const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 36); SFX.play('badge'); haptic([20, 30, 40]);
    refresh(); sheetEl().innerHTML = '<div class="grabber"></div>' + skillSheet(d.skill);
  },
  undoSkill: d => { const st = S.skills[d.skill] || 0; if (!st) return; S.skills[d.skill] = st - 1; removeXP(`skill:${d.skill}:${st - 1}`); refresh(); sheetEl().innerHTML = '<div class="grabber"></div>' + skillSheet(d.skill); },

  /* Active workout */
  setInc: d => { const s = S.active.entries[d.e].sets[d.s]; s.v = Math.max(0, (+s.v || 0) + +d.d); save(); render(); },
  setDone: d => {
    const e = S.active.entries[d.e], s = e.sets[d.s];
    s.done = !s.done; if (s.done && !(s.v > 0)) s.v = s.t || 1;
    if (s.done) { SFX.play('set'); fx(`[data-sid="${d.e}-${d.s}"]`, 'pop'); } else SFX.play('toggleOff');
    save(); render(); haptic(15);
    if (s.done) { const ex = getEx(e.ex), r = e.rest || S.settings.restSec; startRest(ex && ex.kind === 'hold' && !isGym(ex) ? Math.min(r, 75) : r); }
  },
  addSet: d => { const e = S.active.entries[d.e], l = e.sets[e.sets.length - 1]; e.sets.push({ t: l ? l.t : null, v: l ? l.v : 0, kg: l ? l.kg : 0, done: false }); save(); render(); },
  delSet: d => { S.active.entries[d.e].sets.pop(); save(); render(); },
  removeEx: d => { S.active.entries.splice(+d.e, 1); save(); render(); },
  setVariant: d => {
    const e = S.active.entries[d.e]; if (!e || e[d.k] === d.v || !(d.k === 'grip' ? GRIPS : WIDTHS)[d.v]) return;
    const grip = d.k === 'grip' ? d.v : e.grip, width = d.k === 'width' ? d.v : e.width;
    S.variants = S.variants || {}; S.variants[e.ex] = { grip, width };
    if (!doneSets(e).length) { const n = makeEntry(e.ex, grip, width); n.effort = e.effort; S.active.entries[d.e] = n; }
    else { const r = recommend(keyOf(e.ex, grip, width)); Object.assign(e, { grip, width, rec: r.text, status: r.status, next: r.next || null }); }   // (variants exist on bodyweight moves only)
    SFX.play('tap'); save(); render();
  },
  setEffort: d => { const e = S.active.entries[d.e]; e.effort = e.effort === +d.v ? 0 : +d.v; SFX.play('tap'); haptic(10); save(); render(); },
  exGuide: d => {
    const e = d.e != null && S.active ? S.active.entries[d.e] : null;
    openSheet(exGuideSheet(e ? e.ex : d.ex, e ? e.grip : d.g, e ? e.width : d.w, e), { cls: 'tall' });
  },
  cycleRest: d => { const e = S.active.entries[d.e], opts = [45, 60, 90, 120, 150, 180, 240], cur = e.rest || S.settings.restSec; e.rest = opts.find(x => x > cur) || opts[0]; SFX.play('tap'); save(); render(); },
  restAdd: d => { if (rest) { const s = +(d.d || 15); rest.end = Math.max(Date.now() + 1000, rest.end + s * 1000); rest.total = Math.max(5, rest.total + s); tick(); } },
  restSkip: () => { rest = null; islandSig = ''; tick(); },
  discard: () => askConfirm('Discard workout?', 'Sets from this session will not be saved.', 'Discard', () => { S.active = null; rest = null; save(); render(); }),
  finish: () => {
    const any = S.active.entries.some(e => doneSets(e).length);
    if (!any) return askConfirm('No sets completed', 'Tap ✓ on each set you finish. Discard this session?', 'Discard', () => { S.active = null; save(); render(); });
    const w = S.active; S.active = null; rest = null;
    const { sets, skillHits } = finalizeWorkout(w);
    S.workouts.push(w);
    addXP(`workout:${w.id}`, w.xp, `${w.name} complete`);
    refresh(false);
    const vol = workoutVolume(w), v = dailyLine(w.id);
    const ups = w.entries.filter(e => getEx(e.ex)?.fam).map(e => ({ e, r: recommend(entryKey(e)) })).filter(x => x.r.next && (x.r.status === 'levelup' || x.r.status === 'load'));
    const loads = w.entries.filter(e => isGym(getEx(e.ex))).map(e => ({ e, r: recommendGym(entryKey(e), { lo: e.lo, hi: e.hi, sets: e.sets.length }) })).filter(x => x.r.status === 'load');
    openSheet(`<div class="summary"><div class="onb-check">${icon('check')}</div><h2>${esc(w.name)} complete</h2>
      <div class="stats mini"><div class="stat glass"><b>${w.mins}</b><span>min</span></div><div class="stat glass"><b>${sets}</b><span>sets</span></div><div class="stat glass"><b>${vol.kg ? fmtN(vol.kg) : vol.reps}</b><span>${vol.kg ? 'kg lifted' : 'reps'}</span></div><div class="stat glass gold"><b>+${w.xp}</b><span>XP</span></div></div>
      ${w.prs.length ? `<h4 class="mt">${icon('trophy', 'sm gold')} Personal records</h4><ul class="pr-list">${w.prs.map(p => `<li>${esc(p.name || getEx(p.ex).name)} <b>${esc(prText(p))}</b></li>`).join('')}</ul>` : ''}
      ${loads.length ? `<h4 class="mt">${icon('plus', 'sm gold')} Weight goes up next time</h4><ul class="pr-list">${loads.map(x => `<li>${esc(entryName(x.e))} <b>${x.r.kg} kg</b></li>`).join('')}</ul>` : ''}
      ${ups.length ? `<h4 class="mt">${icon('up', 'sm gold')} Ready to level up</h4>${ups.map(x => `<div class="row center between up-row"><span class="small">${esc(entryName(x.e))} → <b>${esc(EX[x.r.next].name)}</b></span><button class="btn claim sm" data-act="famLevel" data-fam="${getEx(x.e.ex).fam}" data-d="1" data-close="1">Level up</button></div>`).join('')}` : ''}
      ${skillHits.length ? `<h4 class="mt">${icon('star', 'sm gold')} Skill target hit</h4>${skillHits.map(h => `<div class="row center between up-row"><span class="small">${esc(SKILLS[h.skill].steps[h.step].name)}</span><button class="btn claim sm" data-act="openSkill" data-skill="${h.skill}">Unlock</button></div>`).join('')}` : ''}
      ${lineHTML(v, 'mt')}
      <button class="btn primary wide mt" data-act="closeSheet">${faithOn() ? 'Amen' : 'Done'}</button></div>`, { cls: 'center', onClose: flushLevelUp });
    burst(innerWidth / 2, innerHeight / 3, 30); SFX.play('complete'); if (w.prs.length) setTimeout(() => SFX.play('pr'), 700); haptic([30, 50, 30]);
  },
  famLevel: (d, el) => {
    const F = FAMILIES[d.fam], lv = familyLevel(d.fam), nv = clamp(lv + +d.d, 0, F.ladder.length - 1);
    if (nv === lv) return;
    const r = recommend(F.ladder[lv].id);
    S.levels[d.fam] = nv;
    if (+d.d > 0 && r.next) {
      S.flags.levelupEx = true;
      addXP(`prog:${d.fam}:${nv}`, 40, `Progressed to ${F.ladder[nv].name}`);
      const b = el.getBoundingClientRect(); burst(b.left + b.width / 2, b.top, 20);
    }
    if (d.close) el.closest('.up-row').innerHTML = `<span class="small gold">${icon('check', 'xs')} Now training ${esc(F.ladder[nv].name)}</span>`;
    refresh();
  },
  delWorkout: d => askConfirm('Delete workout?', 'This removes it from your history and its XP.', 'Delete', () => {
    S.workouts = S.workouts.filter(w => w.id !== d.id); removeXP(`workout:${d.id}`); refresh();
  }),

  /* Fuel */
  fuelDay: d => { const n = addDays(fuelDay, +d.d); if (n <= today()) { fuelDay = n; render(); } },
  addFood: d => { foodMeal = d.meal; foodQuery = ''; foodServings = 1; openSheet(foodSheet(), { cls: 'tall' }); },
  servings: d => { foodServings = +d.n; sheetEl().querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('on', +b.dataset.n === foodServings)); },
  pickFood: (d, el) => {
    const f = allFoods().find(x => x.id === d.id); if (!f) return;
    addFoodItem(f, foodServings);
    el.classList.add('added'); setTimeout(() => el.classList.remove('added'), 600);
    toast(`${icon('check', 'xs')} ${foodServings} × ${esc(f.name)} added`); SFX.play('toggleOn'); haptic();
  },
  customFood: () => {
    if (!requirePlan('foods')) return;
    const name = document.getElementById('cfName').value.trim(), kcal = +document.getElementById('cfKcal').value, p = +document.getElementById('cfP').value || 0;
    if (!name || !kcal) return toast('Add a name and calories');
    const f = { id: 'c_' + uid(), name, unit: document.getElementById('cfUnit').value.trim() || '1 serving', kcal, p };
    S.customFoods.unshift(f); addFoodItem(f, foodServings); closeSheet(); toast(`${icon('check', 'xs')} ${esc(name)} saved`);
  },
  delFood: d => { const fd = foodDay(fuelDay); fd.items = fd.items.filter(i => i.id !== d.id); refresh(); },

  /* Me */
  editProfile: () => {
    const p = S.profile;
    openSheet(`<h3 class="sheet-title">Edit profile</h3><div class="form-grid">
      <label class="field span2"><span>Name</span><input class="inp" id="pfName" value="${esc(p.name)}"></label>
      <label class="field"><span>Height (cm)</span><input class="inp" id="pfH" type="number" value="${p.heightCm}"></label>
      <label class="field"><span>Age</span><input class="inp" id="pfAge" type="number" value="${p.age}"></label>
      <label class="field"><span>Sex</span><select id="pfSex"><option value="m" ${p.sex === 'm' ? 'selected' : ''}>Male</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Female</option></select></label>
      <label class="field"><span>Activity</span><select id="pfAct">${[[1.5, 'Light'], [1.7, 'Active (farm work)'], [1.9, 'Very active']].map(([v, l]) => `<option value="${v}" ${p.activity == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div><button class="btn primary wide mt" data-act="saveProfile">Save</button>`);
  },
  saveProfile: () => {
    const p = S.profile;
    p.name = document.getElementById('pfName').value.trim(); p.heightCm = +document.getElementById('pfH').value || p.heightCm;
    p.age = +document.getElementById('pfAge').value || p.age; p.sex = document.getElementById('pfSex').value; p.activity = +document.getElementById('pfAct').value;
    closeSheet(); refresh();
  },
  exportData: () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ledger-backup-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Backup downloaded');
  },
  resetAll: () => askConfirm('Reset this device?', `All workouts, XP, habits and settings on this device will be erased.${Cloud.user ? ' You\'ll be signed out first, so your Google backup stays safe.' : ' Export a backup first if you want to keep them.'}`, 'Erase all', async () => {
    if (Cloud.user) await Cloud.signOut();
    localStorage.removeItem(STORE_KEY); S = defaultState(); applyTheme(); onb.step = 0; route = 'today'; render(true);
  }),

  /* Cloud */
  cloudSignIn: () => Cloud.signIn(),
  cloudDelete: () => askConfirm('Delete your account?', 'This permanently deletes your Zelum cloud backup and your sign-in from Zelum\'s servers. It can\'t be undone. Your progress stays on this device, and you can export a backup from Me first.', 'Delete forever', () => Cloud.deleteAccount()),
  cloudSignOut: () => askConfirm('Sign out?', 'Your progress stays on this device. Sign in again any time to sync.', 'Sign out', () => Cloud.signOut().then(() => render()), false),
  cloudSync: async () => { if (!Cloud.user) return; SFX.play('swoosh'); if (Cloud.unsynced()) await Cloud.push(); else await Cloud.reconcile(await Cloud.ref().get(), true); if (Cloud.status === 'synced') toast(`${icon('check', 'xs')} Up to date`); },
  cloudKeep: async d => {
    const p = Cloud.pending; if (!p) return closeSheet();
    closeSheet(true);
    if (d.v === 'cloud') Cloud.apply(p.cloud, p.cm, 'Using the progress from your Google account');
    else { try { localStorage.setItem('ledger.prev', JSON.stringify(p.cloud)); } catch (e) { } S.updatedAt = Math.max(stampNow(), p.cm.updated + 1); saveNow(false); await Cloud.push(); toast(`${icon('check', 'xs')} This device's progress is now in the cloud`); }
    Cloud.pending = null;
  },
  install: async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); },

  /* Coach */
  coachSend: () => { const i = document.getElementById('coachIn'); const t = i.value; i.value = ''; coachSend(t); },
  coachChip: d => coachSend(d.t),
  coachAction: () => {
    const a = S.chat[S.chat.length - 1].action; if (!a) return;
    if (a.act === 'start') startWorkout(a.tpl);
    if (a.act === 'openskill') { closeSheet(true); go('skills'); ACT.openSkill({ skill: a.skill }); }
  },
  clearChat: () => { S.chat = []; save(); closeSheet(true); openCoach(); },

  /* Onboarding */
  onbSet: d => { onb.d[d.k] = d.v; if (d.k === 'goal') onb.d.target = ''; render(); },
  onbBack: () => { onb.step = Math.max(0, onb.step - 1); render(); },
  onbNext: () => {
    const d = onb.d;
    if (onb.step === 2 && !(+d.weight >= 30)) { toast('Enter your weight (a best guess is fine)'); return; }
    if (onb.step === 1 && !GOAL_PRESETS.some(g => g.id === d.goal && (!g.disc || g.disc === d.discipline))) d.goal = d.discipline === 'gym' ? 'g_bench' : 'g_muscleup';
    if (onb.step < 6) { onb.step++; render(); window.scrollTo({ top: 0 }); return; }
    // Finish onboarding
    S.seenVersion = VERSION;   // new people start on this version: no What's new for them
    const gym = d.discipline === 'gym', days = +d.trainDays || 4, pu = +d.pullups || 0;
    Object.assign(S.profile, { name: d.name.trim(), heightCm: +d.height || 171, age: +d.age || 22, sex: d.sex, trainDays: days, bodyGoal: d.bodyGoal,
      discipline: d.discipline, schedule: [...(TRAIN_PATTERNS[days] || TRAIN_PATTERNS[4])],
      experience: gym ? d.experience : pu >= 15 ? 'advanced' : pu >= 5 ? 'intermediate' : 'beginner', focus: gym ? d.focus : 'general',
      sessionMin: gym ? +d.sessionMin || 60 : 45, equipment: gym ? [...EQUIP_PRESETS[d.kit].list] : ['pullbar', 'dipbars'] });
    S.placement = { pullup: pu, pushup: +d.pushups || 0, dip: +d.dips || 0 };
    S.levels = placeLevels(d);
    logWeight(+d.weight);
    if (gym) { S.flags.gymSetup = true; rebuildPlan(); }
    setGoalFrom(d);
    S.onboarded = true;
    addXP('onboard', 100, 'Answered the call');
    saveNow(); route = 'today'; render(true); flushLevelUp();
    setTimeout(() => burst(innerWidth / 2, 180, 40), 200);
  },
};

Object.assign(ACT, HABIT_ACT, RANK_ACT, MUSIC_ACT, NOTIF_ACT, TRAIN_ACT, PLAN_ACT, WHATSNEW_ACT, { manageHabits: () => go('habits') });

function addFoodItem(f, qty) {
  const fd = foodDay(fuelDay);
  fd.items.push({ id: uid(), foodId: f.id, name: f.name, unit: f.unit, qty, kcal: f.kcal * qty, p: f.p * qty, meal: foodMeal });
  addXP(`meal:${fuelDay}:${foodMeal}`, 10, `${foodMeal} logged`);
  syncDailyXP(fuelDay); checkAchievements(); save(); render(); flushLevelUp();
}
function rerenderAppearance() { document.querySelectorAll('#appearanceBody').forEach(b => morphHTML(b, appearanceHTML())); }
/* ---------- Change / input handlers ---------- */
/* How Android draws the app's WebView (native side: MainActivity.applyRendering) */
const RENDER_MODES = [['standard', 'Standard (default)'], ['layer', 'Layered'], ['software', 'Software (slowest, safest)']];
const CHG = {
  gfx: el => { Gfx.set(el.value); render(); toast(`Graphics: ${el.value === 'auto' ? 'Auto' : el.value === 'smooth' ? 'Smooth' : 'Full glass'}`); },
  rendering: el => Native.p.ledger.rendering({ mode: el.value }).then(r => { Native.renderMode = r.mode; toast(`Drawing mode: ${RENDER_MODES.find(m => m[0] === r.mode)?.[1] || r.mode}`); }).catch(() => toast('Update the Zelum app to change this')),
  setVal: el => { const s = S.active.entries[el.dataset.e].sets[el.dataset.s]; s[el.dataset.f] = Math.max(0, parseFloat(el.value) || 0); save(); },
  swapEx: el => { const old = S.active.entries[el.dataset.e], n = makeEntry(el.value, null, null, old && old.lo && getEx(el.value)?.gym ? { sets: old.sets.length, rest: old.rest } : null); S.active.entries[el.dataset.e] = n; save(); render(); },
  addEx: el => { if (!el.value) return; S.active.entries.push(makeEntry(el.value)); save(); render(); setTimeout(() => document.getElementById(`ex-${S.active.entries.length - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); },
  setting: el => {
    const k = el.dataset.k, v = el.value;
    if (k === 'trainDays') { S.profile.trainDays = +v; S.profile.schedule = [...(TRAIN_PATTERNS[+v] || TRAIN_PATTERNS[4])]; if (gymMode() && (!S.profile.split || S.profile.split === 'auto')) rebuildPlan(); }
    else if (k === 'bodyGoal') S.profile.bodyGoal = v;
    else if (k === 'sound') S.settings.sound = v === '1';
    else S.settings[k] = Math.max(0, +v || 0);
    refresh(); toast('Saved');
  },
  importData: el => {
    const f = el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || typeof data !== 'object' || !('workouts' in data) || !('profile' in data)) throw new Error('bad');
        askConfirm('Import backup?', `This replaces the data on this device with the backup (${data.workouts.length} workouts).`, 'Import', () => {
          S = migrate(data); applyTheme(); saveNow(); render(true); toast('Backup imported');
        }, false);
      } catch (e) { toast('That file is not a Zelum backup'); }
    };
    r.readAsText(f);
  },
  ...NOTIF_CHG,
  ...TRAIN_CHG,
  themeColorDone: () => { save(); render(); rerenderAppearance(); },
  volumeDone: () => { save(); SFX.play('check'); },
};
const INP = {
  ...HABIT_INP,
  ...TRAIN_INP,
  onb: el => { onb.d[el.name] = el.value; },
  goalForm: el => { ACT._goalDraft[el.name] = el.value; },
  foodSearch: el => {
    foodQuery = el.value;
    const tmp = document.createElement('div'); tmp.innerHTML = foodSheet();
    document.getElementById('foodPick').innerHTML = tmp.querySelector('#foodPick').innerHTML;
  },
  /* Live theme editing: update CSS variables instantly, save on release */
  themeColor: el => {
    if (!can('themes')) { rerenderAppearance(); return requirePlan('themes'); }
    S.settings.theme.colors = { ...(S.settings.theme.colors || {}), [el.dataset.k]: el.value };
    applyTheme(); const hx = document.getElementById(`hex-${el.dataset.k}`); if (hx) hx.textContent = el.value.toUpperCase(); save();
  },
  volume: el => { S.settings.volume = +el.value / 100; document.getElementById('volVal').textContent = `${el.value}%`; },
  themeGlow: el => { S.settings.theme.glow = +el.value / 100; applyTheme(); document.getElementById('glowVal').textContent = `${el.value}%`; save(); },
  themeBlur: el => { S.settings.theme.blur = +el.value; applyTheme(); document.getElementById('blurVal').textContent = `${el.value}px`; save(); },
};

/* ---------- Wiring ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-go]'); if (!el || el.disabled) return;
  if (el.dataset.go) { SFX.play('nav'); closeSheet(true); go(el.dataset.go); return; }
  const snd = { missionTab: 'tap', habitTod: 'tap', habitDayPick: 'tap', trainTab: 'tap', newHabit: 'open', themePreset: 'tap', fuelDay: 'tap', servings: 'tap', habitMonth: 'tap', setInc: 'tap', addSet: 'tap', delSet: 'tap', onbSet: 'tap', onbBack: 'tap', onbNext: 'swoosh', famLevel: 'coin', logSkill: 'toggleOn', setDisc: 'swoosh', libGroup: 'tap', libKit: 'tap', libMech: 'tap', libFav: 'tap', recFilter: 'tap', setupSet: 'tap', setupDay: 'tap', setupKit: 'tap', rtSets: 'tap', rtMove: 'tap', rtAdd: 'open', exInfo: 'open', trainSetup: 'open', setupSave: 'badge', rtSave: 'check', coachChip: 'tap', coachSend: 'tap', restAdd: 'tap', restSkip: 'tap', saveWeight: 'check', saveMax: 'check', saveGoal: 'badge', customFood: 'toggleOn', addHabit: 'toggleOn' }[el.dataset.act];
  if (snd) SFX.play(snd);
  const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INP[el.dataset.input]) INP[el.dataset.input](el, e); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter) { e.preventDefault(); ACT[e.target.dataset.enter]?.(e.target.dataset, e.target, e); }
  if (e.key === 'Escape') closeSheet();
});
window.addEventListener('hashchange', () => {
  if (pendingGo) { const t = pendingGo; pendingGo = null; go(t, true); return; }
  navDepth = Math.max(0, navDepth - 1);
  go(location.hash.slice(1), true);
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (route === 'me' || route === 'settings') render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.onboarded) { if (fuelDay > today()) fuelDay = today(); render(); } });

/* Boot */
load();
applyTheme();
try { Native.init(); } catch (e) { console.error("Native bridge failed — the app keeps working without it", e); }
Billing.init();   // Google Play subscriptions (Android app with a RevenueCat key only)
/* Safety net: never leave a blank screen — if nothing rendered, offer a reload */
window.addEventListener('error', e => { window.__ledgerErr = String(e.message || e.error || 'error'); });
setTimeout(() => {
  const v = document.getElementById('view');
  if (v && !v.innerHTML.trim()) v.innerHTML = `<div class="handback-card glass" style="margin:30vh auto 0"><h2>Zelum couldn't start</h2><p class="muted small">${esc(window.__ledgerErr || 'Unknown error')}</p><button class="btn primary wide mt" onclick="location.reload()">Reload</button></div>`;
}, 4000);
// Pieces that only depend on the saved state are remembered between renders (memoState in ui.js)
Gfx.init();
Motion.init();
dayCompletion = memoState(dayCompletion);
weeklyReview = memoState(weeklyReview);
[route, settingsSec] = parseRoute((location.hash || '#today').slice(1));
render(true);
setInterval(tick, 250);
WhatsNew.maybeShow();   // once per update
if (Cloud.enabled() && Cloud.meta().uid) Cloud.load();
Music.handleRedirect().finally(() => Music.start());   // restore the signed-in session quietly
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // The worker serves the app from the device cache; on a local preview that would hide fresh edits until a second reload.
  // The Google Play build has its files inside the app, so it needs no worker (and must drop the live site's old cache).
  // Add ?sw to a local preview's address to test the service worker (updates, offline) there too
  if (Native.store || (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !/[?&]sw\b/.test(location.search))) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => { });
    if (Native.store && window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => { });
  }
  else {
    navigator.serviceWorker.register('sw.js').catch(() => { });
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'update-ready') Updater.ready(e.data.version); });
    // Back in the foreground: look for a new version (and apply a waiting one while nothing is going on)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (Updater.pending && !S.active) Updater.apply(true); return; }
      Updater.check();
    });
  }
}
