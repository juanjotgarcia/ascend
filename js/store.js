/* LEDGER — state, persistence, dates, XP ledger. Data stays on this device (localStorage). */

const STORE_KEY = 'ledger.v1';
const OLD_KEYS = ['ascend.v1'];   // data saved before the app was renamed
let S = null;

/* ---------- Dates (local time) ---------- */
const pad = n => String(n).padStart(2, '0');
function dayKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); }
function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
function weekKey(k = dayKey()) { const d = parseDay(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dayKey(d); }
const today = () => dayKey();
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------- State ---------- */
function defaultState() {
  return {
    v: 1,
    onboarded: false,
    created: today(),
    profile: { name: '', heightCm: 171, age: 22, sex: 'm', trainDays: 4, bodyGoal: 'gain', activity: 1.7,
      discipline: 'cal', focus: 'hypertrophy', experience: 'intermediate', equipment: ['pullbar', 'dipbars'], sessionMin: 60,
      split: 'auto', schedule: null, prefer: [], avoid: [] },
    goal: null,            // { presetId, type, title, skill?, ex?, target, startValue, start, deadline, why }
    pastGoals: [],
    levels: {},            // family -> ladder index
    workouts: [],          // { id, date, tpl, name, mins, entries:[{ex, sets:[{v, kg, done}]}], prs:[], xp }
    active: null,          // in-progress workout
    skills: {},            // skillId -> number of steps achieved
    skillLog: [],          // { date, skill, step, value }
    bodyweight: [],        // { date, kg }
    food: {},              // date -> { water: ml, items: [{id, foodId, name, qty, kcal, p, meal}] }
    customFoods: [],
    habits: DEFAULT_HABITS.map(h => normHabit({ ...h, created: today() })),
    habitLog: {},          // date -> [habitId] (yes/no habits)
    habitVals: {},         // date -> {habitId: amount} (amount habits)
    xpLog: {},             // key -> [amount, timestamp, reason]
    claimed: {},           // missionKey -> true
    badges: {},            // achievementId -> date
    chat: [],
    flags: {},
    variants: {},          // exId -> {grip, width} last used
    routines: [],          // { id, name, plan, day, icon, desc, items:[{ex, sets, lo, hi, rest}] }
    plan: null,            // gym plan: { split, built, days:[routineId] } — the rotation
    deload: null,          // { start, until } — a lighter recovery week
    settings: { glassMl: 250, restSec: 90, sound: true, waterTarget: 0, kcalTarget: 0, proteinTarget: 0,
      theme: { preset: 'midnight', colors: {}, glow: 0.55, blur: 26 },
      music: { enabled: false, source: 'lastfm', lfUser: '', lfKey: '' },
      notif: { enabled: false, workout: { on: true, time: '17:00' }, water: { on: true, every: 2, from: '08:00', to: '20:00' }, verse: { on: true, time: '07:00' }, habits: true } },
  };
}

function load() {
  try {
    let raw = localStorage.getItem(STORE_KEY);
    if (!raw) {   // carry over progress from the old name, keep the old copy as a safety net
      for (const k of OLD_KEYS) { raw = localStorage.getItem(k); if (raw) { localStorage.setItem(STORE_KEY, raw); break; } }
    }
    S = raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch (e) {
    console.error(e);
    S = defaultState();
  }
}
function migrate(s) {
  const d = defaultState();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  s.settings.theme = { ...d.settings.theme, ...(s.settings.theme || {}) };
  s.profile = { ...d.profile, ...s.profile };
  s.habitVals = s.habitVals || {};
  for (const h of s.habits) {
    const def = DEFAULT_HABITS.find(x => x.id === h.id);
    if (!h.cat) h.cat = def ? def.cat : 'body';
    if (def && h.id === 'water' && h.name === 'Hit water goal') h.name = def.name;
  }
  S = s; s.habits.forEach(normHabit);   // types, schedules, time of day (habits.js)
  return s;
}
let saveTimer = null;
/* Every save stamps the state; the cloud layer (if signed in) pushes it a few seconds later */
/* Always moves forward, even if another device's clock is ahead of this one */
const stampNow = () => Math.max(Date.now(), (S.updatedAt || 0) + 1);
function save() {
  S.updatedAt = stampNow();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch (e) { console.error(e); toast('Could not save — device storage may be full'); }
  }, 120);
  if (typeof Cloud !== 'undefined') Cloud.schedulePush();
  if (typeof Native !== 'undefined') try { Native.sync(); } catch (e) { console.warn(e); }
}
/* bump=false is used when applying a copy from the cloud, so it isn't sent straight back */
function saveNow(bump = true) {
  if (bump) S.updatedAt = stampNow();
  clearTimeout(saveTimer);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { console.error(e); }
  if (bump && typeof Cloud !== 'undefined') Cloud.schedulePush();
}

/* ---------- XP & levels ---------- */
const xpForLevel = n => 50 * n * (n - 1);               // cumulative XP needed to reach level n
const levelFromXP = xp => Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2));
function totalXP() { let t = 0; for (const v of Object.values(S.xpLog)) t += v[0]; return t; }
function levelInfo(xp = totalXP()) {
  const lvl = levelFromXP(xp), cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  return { lvl, xp, into: xp - cur, need: next - cur, pct: (xp - cur) / (next - cur), title: titleFor(lvl) };
}
function titleFor(lvl) { let t = TITLES[0][1]; for (const [l, name] of TITLES) if (lvl >= l) t = name; return t; }

/* Returns XP actually gained (0 if this key was already rewarded). */
function addXP(key, amt, why) {
  if (S.xpLog[key]) return 0;
  const before = levelFromXP(totalXP());
  S.xpLog[key] = [amt, Date.now(), why];
  const after = levelFromXP(totalXP());
  if (typeof onXP === 'function') onXP(amt, why, after > before ? after : 0);
  return amt;
}
function removeXP(key) { if (S.xpLog[key]) { delete S.xpLog[key]; return true; } return false; }
function xpOnDay(k) { let t = 0; for (const v of Object.values(S.xpLog)) if (dayKey(new Date(v[1])) === k) t += v[0]; return t; }

/* ---------- Common selectors ---------- */
function latestWeight() { const b = S.bodyweight; return b.length ? b[b.length - 1].kg : null; }
function foodDay(k = today()) { if (!S.food[k]) S.food[k] = { water: 0, items: [] }; return S.food[k]; }
function peekFoodDay(k) { return S.food[k] || { water: 0, items: [] }; }
function workoutsOn(k) { return S.workouts.filter(w => w.date === k); }
function familyLevel(fam) {
  if (S.levels[fam] === undefined) S.levels[fam] = 0;
  return Math.min(S.levels[fam], FAMILIES[fam].ladder.length - 1);
}
function currentEx(fam) { return FAMILIES[fam].ladder[familyLevel(fam)]; }
