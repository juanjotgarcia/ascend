/* ZELUM — content library: exercises, skills, foods, verses, quotes, levels, missions.
   Everything here is static data; app state lives in store.js. */

/* ---------- Movement families & progression ladders ----------
   kind: 'reps' or 'hold' (seconds). lo/hi = working range used by the overload engine.
   load: true when it makes sense to add weight (backpack, feed sack, water jugs). */
const FAMILIES = {
  vpull: { name: 'Vertical Pull', short: 'Pull-ups', color: 'blue', ladder: [
    { id: 'dead_hang',      name: 'Dead Hang',                 kind: 'hold', lo: 20, hi: 60, cue: 'Shoulders active, ribs down, breathe slow.' },
    { id: 'scap_pull',      name: 'Scapular Pull-ups',         kind: 'reps', lo: 8,  hi: 15, cue: 'Arms straight, pull the shoulder blades down and back.' },
    { id: 'neg_pullup',     name: 'Negative Pull-ups',         kind: 'reps', lo: 3,  hi: 6,  cue: 'Jump to the top, lower for a full 5 seconds.' },
    { id: 'pullup',         name: 'Pull-ups',                  kind: 'reps', lo: 5,  hi: 12, load: true, cue: 'Dead hang to chin over bar. No kipping.' },
    { id: 'c2b_pullup',     name: 'Chest-to-Bar Pull-ups',     kind: 'reps', lo: 4,  hi: 10, load: true, cue: 'Pull the bar to your sternum, elbows drive to your pockets.' },
    { id: 'archer_pullup',  name: 'Archer Pull-ups (each side)', kind: 'reps', lo: 3, hi: 8, cue: 'One arm pulls, the other stays nearly straight as a guide.' },
    { id: 'oap_neg',        name: 'One-Arm Pull-up Negatives', kind: 'reps', lo: 2,  hi: 5,  cue: 'Start at the top, fight the descent for 5+ seconds.' },
  ]},
  hrow: { name: 'Horizontal Pull', short: 'Rows', color: 'teal', ladder: [
    { id: 'incline_row',    name: 'Incline Rows (high bar / table)', kind: 'reps', lo: 8, hi: 15, cue: 'Body straight like a plank, pull chest to the bar.' },
    { id: 'aus_row',        name: 'Australian Rows',           kind: 'reps', lo: 8,  hi: 15, cue: 'Bar at hip height, squeeze shoulder blades at the top.' },
    { id: 'fe_row',         name: 'Feet-Elevated Rows',        kind: 'reps', lo: 6,  hi: 12, load: true, cue: 'Feet on a bucket or bench, hips locked.' },
    { id: 'archer_row',     name: 'Archer Rows (each side)',   kind: 'reps', lo: 5,  hi: 10, cue: 'Shift your weight to the pulling arm.' },
    { id: 'tuck_fl_row',    name: 'Tuck Front Lever Rows',     kind: 'reps', lo: 4,  hi: 10, cue: 'Hold the tuck lever, pull the bar to your hips.' },
  ]},
  hpush: { name: 'Horizontal Push', short: 'Push-ups', color: 'orange', ladder: [
    { id: 'incline_pushup', name: 'Incline Push-ups',          kind: 'reps', lo: 8,  hi: 20, cue: 'Hands on a fence rail or table, full range.' },
    { id: 'pushup',         name: 'Push-ups',                  kind: 'reps', lo: 10, hi: 25, load: true, cue: 'Elbows ~45°, chest touches the ground.' },
    { id: 'diamond_pushup', name: 'Diamond Push-ups',          kind: 'reps', lo: 8,  hi: 20, cue: 'Hands together under the chest, elbows close.' },
    { id: 'decline_pushup', name: 'Decline Push-ups',          kind: 'reps', lo: 8,  hi: 20, load: true, cue: 'Feet elevated, keep the core tight.' },
    { id: 'archer_pushup',  name: 'Archer Push-ups (each side)', kind: 'reps', lo: 5, hi: 12, cue: 'Wide hands, shift onto one arm, the other stays straight.' },
    { id: 'pp_pushup',      name: 'Pseudo-Planche Push-ups',   kind: 'reps', lo: 6,  hi: 15, cue: 'Hands by the hips, fingers out, lean forward.' },
    { id: 'oa_incline_pushup', name: 'One-Arm Incline Push-ups (each)', kind: 'reps', lo: 4, hi: 10, cue: 'Feet wide, body square, lower slow.' },
  ]},
  dip: { name: 'Dips', short: 'Dips', color: 'pink', ladder: [
    { id: 'bench_dip',      name: 'Bench Dips',                kind: 'reps', lo: 10, hi: 20, cue: 'Shoulders down, elbows back.' },
    { id: 'neg_dip',        name: 'Negative Dips',             kind: 'reps', lo: 3,  hi: 6,  cue: 'Lower for 5 seconds to 90° elbows.' },
    { id: 'dip',            name: 'Parallel Bar Dips',         kind: 'reps', lo: 6,  hi: 15, load: true, cue: 'Slight forward lean, shoulders below elbows.' },
    { id: 'sb_dip',         name: 'Straight Bar Dips',         kind: 'reps', lo: 5,  hi: 12, load: true, cue: 'Key muscle-up transition strength. Lean over the bar.' },
  ]},
  vpush: { name: 'Vertical Push', short: 'Overhead', color: 'purple', ladder: [
    { id: 'pike_pushup',    name: 'Pike Push-ups',             kind: 'reps', lo: 6,  hi: 15, cue: 'Hips high, head travels in front of the hands.' },
    { id: 'epike_pushup',   name: 'Elevated Pike Push-ups',    kind: 'reps', lo: 5,  hi: 12, cue: 'Feet on a box, more weight on the shoulders.' },
    { id: 'wall_hs_neg',    name: 'Wall Handstand Push-up Negatives', kind: 'reps', lo: 3, hi: 6, cue: 'Lower slowly into a tripod with the head.' },
    { id: 'wall_hspu',      name: 'Wall Handstand Push-ups',   kind: 'reps', lo: 3,  hi: 10, cue: 'Head and hands make a triangle.' },
    { id: 'deficit_hspu',   name: 'Deficit Handstand Push-ups', kind: 'reps', lo: 3, hi: 8, cue: 'Hands on blocks, go below hand level.' },
  ]},
  squat: { name: 'Legs — Squat', short: 'Squats', color: 'green', ladder: [
    { id: 'squat',          name: 'Bodyweight Squats',         kind: 'reps', lo: 15, hi: 30, cue: 'Hips below knees, heels down.' },
    { id: 'bulgarian',      name: 'Bulgarian Split Squats (each)', kind: 'reps', lo: 8, hi: 15, load: true, cue: 'Back foot on a bench, front knee tracks toes.' },
    { id: 'assisted_pistol', name: 'Assisted Pistol Squats (each)', kind: 'reps', lo: 6, hi: 12, cue: 'Hold a post or doorframe lightly.' },
    { id: 'box_pistol',     name: 'Box Pistol Squats (each)',  kind: 'reps', lo: 5,  hi: 10, cue: 'Sit to a low box on one leg, stand without momentum.' },
    { id: 'pistol',         name: 'Pistol Squats (each)',      kind: 'reps', lo: 3,  hi: 10, load: true, cue: 'Full depth, free leg straight in front.' },
  ]},
  hinge: { name: 'Legs — Hinge', short: 'Hamstrings', color: 'yellow', ladder: [
    { id: 'glute_bridge',   name: 'Glute Bridges',             kind: 'reps', lo: 12, hi: 25, cue: 'Drive through heels, squeeze at the top.' },
    { id: 'sl_glute_bridge', name: 'Single-Leg Glute Bridges (each)', kind: 'reps', lo: 10, hi: 20, cue: 'Hips level, pause at the top.' },
    { id: 'sl_rdl',         name: 'Single-Leg RDL (each)',     kind: 'reps', lo: 8,  hi: 15, load: true, cue: 'Hinge at the hip, flat back. Hold a bucket for load.' },
    { id: 'nordic_neg',     name: 'Nordic Curl Negatives',     kind: 'reps', lo: 3,  hi: 6,  cue: 'Feet anchored under a bar or by a partner. Fall slow.' },
    { id: 'nordic',         name: 'Nordic Curls',              kind: 'reps', lo: 2,  hi: 6,  cue: 'Lower and pull yourself back up with the hamstrings.' },
  ]},
  core: { name: 'Core', short: 'Core', color: 'red', ladder: [
    { id: 'plank',          name: 'Plank',                     kind: 'hold', lo: 30, hi: 90, cue: 'Glutes tight, posterior pelvic tilt.' },
    { id: 'hkr',            name: 'Hanging Knee Raises',       kind: 'reps', lo: 8,  hi: 15, cue: 'No swinging, knees to chest.' },
    { id: 'hlr',            name: 'Hanging Leg Raises',        kind: 'reps', lo: 6,  hi: 15, cue: 'Straight legs to 90°, control down.' },
    { id: 'ttb',            name: 'Toes-to-Bar',               kind: 'reps', lo: 5,  hi: 12, cue: 'Strict, roll the pelvis, touch the bar.' },
    { id: 'df_neg',         name: 'Dragon Flag Negatives',     kind: 'reps', lo: 3,  hi: 6,  cue: 'Body straight from the shoulders, lower slowly.' },
    { id: 'dragon_flag',    name: 'Dragon Flags',              kind: 'reps', lo: 3,  hi: 8,  cue: 'Full Bruce Lee. Rigid body all the way.' },
  ]},
  calves: { name: 'Calves', short: 'Calves', color: 'teal', ladder: [
    { id: 'calf_raise',     name: 'Calf Raises',               kind: 'reps', lo: 15, hi: 30, cue: 'On a step, full stretch at the bottom.' },
    { id: 'sl_calf_raise',  name: 'Single-Leg Calf Raises (each)', kind: 'reps', lo: 10, hi: 25, load: true, cue: 'Pause 1s at the top.' },
  ]},
};

/* Flat exercise index */
const EX = {};
for (const [fam, f] of Object.entries(FAMILIES)) {
  f.ladder.forEach((e, i) => { EX[e.id] = { ...e, fam, step: i }; });
}

/* Grip / width variations (tracked separately in history and overload) */
const VARY = { neg_pullup: ['grip', 'width'], pullup: ['grip', 'width'], c2b_pullup: ['grip', 'width'],
  incline_row: ['grip', 'width'], aus_row: ['grip', 'width'], fe_row: ['grip', 'width'],
  incline_pushup: ['width'], pushup: ['width'], decline_pushup: ['width'] };
for (const [id, v] of Object.entries(VARY)) EX[id].vary = v;

/* ---------- Workout templates ---------- */
const TEMPLATES = {
  push:  { name: 'Push Day',     icon: 'push',  desc: 'Chest, shoulders, triceps',   fams: ['hpush', 'dip', 'vpush', 'core'] },
  pull:  { name: 'Pull Day',     icon: 'pull',  desc: 'Back, biceps, grip',          fams: ['vpull', 'hrow', 'core', 'calves'] },
  legs:  { name: 'Legs & Core',  icon: 'legs',  desc: 'Squat, hinge, core',          fams: ['squat', 'hinge', 'calves', 'core'] },
  full:  { name: 'Full Body',    icon: 'full',  desc: 'Everything, efficiently',     fams: ['vpull', 'hpush', 'squat', 'dip', 'core'] },
  skill: { name: 'Skill Session', icon: 'skill', desc: 'Drills for your quest skill', fams: [] },
  custom:{ name: 'Custom',       icon: 'plus',  desc: 'Build it as you go',          fams: [] },
};

/* Rotation by training days per week */
const ROTATIONS = {
  3: ['full', 'full', 'full'],
  4: ['push', 'pull', 'legs', 'full'],
  5: ['push', 'pull', 'legs', 'skill', 'full'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
};

/* ---------- Skill trees ---------- */
const SKILLS = {
  muscleup: { name: 'Muscle-up', emoji: '⤴', color: 'gold', blurb: 'Pull over the bar in one fluid motion.', steps: [
    { name: 'Chest-to-bar pull-ups',   kind: 'reps', target: 5,  tip: 'Pull higher than your chin, the bar must touch your chest.' },
    { name: 'Straight bar dips',       kind: 'reps', target: 10, tip: 'Builds the top half of the muscle-up.' },
    { name: 'Explosive pull-ups to waist', kind: 'reps', target: 5, tip: 'Pull as fast as possible, hands come off the bar briefly.' },
    { name: 'Negative muscle-ups',     kind: 'reps', target: 3,  tip: 'Jump above the bar and lower through the transition slowly.' },
    { name: 'Kipping muscle-up',       kind: 'reps', target: 1,  tip: 'Use a hollow-arch swing; lean over the bar early.' },
    { name: 'Strict muscle-up',        kind: 'reps', target: 1,  tip: 'False grip, pull to the lower chest, then turn the wrists over.' },
    { name: '5 strict muscle-ups',     kind: 'reps', target: 5,  tip: 'Consistency. Same technique every rep.' },
  ]},
  handstand: { name: 'Handstand', emoji: '⇅', color: 'purple', blurb: 'Balance upside-down, stacked and still.', steps: [
    { name: 'Wall plank hold',         kind: 'hold', target: 30, tip: 'Feet on the wall, hands close to it, body straight.' },
    { name: 'Chest-to-wall handstand', kind: 'hold', target: 60, tip: 'Push tall through the shoulders, squeeze glutes.' },
    { name: 'Wall shoulder taps',      kind: 'reps', target: 10, tip: 'Shift weight slowly; trains balance in the fingers.' },
    { name: 'Freestanding 5s',         kind: 'hold', target: 5,  tip: 'Kick up softly. Fingers grab the ground to save it.' },
    { name: 'Freestanding 15s',        kind: 'hold', target: 15, tip: 'Look between your hands, stack the hips over the shoulders.' },
    { name: 'Freestanding 30s',        kind: 'hold', target: 30, tip: 'Breathe. Small corrections only.' },
    { name: 'Freestanding 60s',        kind: 'hold', target: 60, tip: 'Mastery. Try it on grass, on the farm, anywhere.' },
  ]},
  frontlever: { name: 'Front Lever', emoji: '═', color: 'blue', blurb: 'Hold your body horizontal under the bar.', steps: [
    { name: 'Tuck front lever',        kind: 'hold', target: 15, tip: 'Arms straight, pull the bar to your hips, knees to chest.' },
    { name: 'Advanced tuck',           kind: 'hold', target: 10, tip: 'Flat back, hips open to 90°.' },
    { name: 'One-leg front lever',     kind: 'hold', target: 10, tip: 'Extend one leg, the other stays tucked.' },
    { name: 'Straddle front lever',    kind: 'hold', target: 8,  tip: 'Legs wide shorten the lever.' },
    { name: 'Full front lever',        kind: 'hold', target: 5,  tip: 'Legs together, body like a plank.' },
  ]},
  planche: { name: 'Planche', emoji: '▬', color: 'orange', blurb: 'Hold your body parallel to the ground on straight arms.', steps: [
    { name: 'Planche lean',            kind: 'hold', target: 30, tip: 'Push-up position, lean forward until shoulders pass the hands.' },
    { name: 'Frog stand',              kind: 'hold', target: 30, tip: 'Knees on the elbows, balance forward.' },
    { name: 'Tuck planche',            kind: 'hold', target: 10, tip: 'Straight arms, knees tucked, protracted scapula.' },
    { name: 'Advanced tuck planche',   kind: 'hold', target: 8,  tip: 'Flat back, hips level with the shoulders.' },
    { name: 'Straddle planche',        kind: 'hold', target: 5,  tip: 'Legs wide, hips high, posterior tilt.' },
    { name: 'Full planche',            kind: 'hold', target: 3,  tip: 'Years of patience. Elite.' },
  ]},
  lsit: { name: 'L-sit', emoji: '∟', color: 'green', blurb: 'Hold your legs straight out, supported on your hands.', steps: [
    { name: 'Foot-supported L-sit',    kind: 'hold', target: 20, tip: 'Heels on the ground, lift the hips, push the shoulders down.' },
    { name: 'Tuck L-sit',              kind: 'hold', target: 20, tip: 'Knees to chest, feet off the ground.' },
    { name: 'One-leg L-sit',           kind: 'hold', target: 15, tip: 'Alternate legs each set.' },
    { name: 'L-sit 10s',               kind: 'hold', target: 10, tip: 'Legs straight, toes pointed.' },
    { name: 'L-sit 30s',               kind: 'hold', target: 30, tip: 'Compress harder; quads on fire.' },
    { name: 'Tuck V-sit',              kind: 'hold', target: 5,  tip: 'Lift the legs above horizontal.' },
  ]},
  pistol: { name: 'Pistol Squat', emoji: '↧', color: 'teal', blurb: 'One-leg squat, full depth, full control.', steps: [
    { name: 'Assisted pistol (each)',  kind: 'reps', target: 8,  tip: 'Hold a post, use as little help as possible.' },
    { name: 'Box pistol (each)',       kind: 'reps', target: 8,  tip: 'Lower the box over time.' },
    { name: 'First full pistol',       kind: 'reps', target: 1,  tip: 'Counterweight in front helps (a small rock or bucket).' },
    { name: '5 pistols each leg',      kind: 'reps', target: 5,  tip: 'Smooth tempo, no bounce.' },
    { name: 'Weighted pistol (each)',  kind: 'reps', target: 5,  tip: 'Hold a water jug or feed sack.' },
  ]},
  backlever: { name: 'Back Lever', emoji: '⎯', color: 'pink', blurb: 'Horizontal hold facing the ground, behind the bar.', steps: [
    { name: 'German hang',             kind: 'hold', target: 20, tip: 'Go slow. Opens the shoulders. Never force it.' },
    { name: 'Tuck back lever',         kind: 'hold', target: 15, tip: 'Straight arms, back parallel to the ground.' },
    { name: 'Advanced tuck back lever', kind: 'hold', target: 10, tip: 'Open the hips.' },
    { name: 'Straddle back lever',     kind: 'hold', target: 8,  tip: 'Legs wide, squeeze glutes.' },
    { name: 'Full back lever',         kind: 'hold', target: 5,  tip: 'Rigid line from head to toes.' },
  ]},
  flag: { name: 'Human Flag', emoji: '⚑', color: 'red', blurb: 'Hold sideways off a vertical pole. Fence posts count.', steps: [
    { name: 'Vertical flag',           kind: 'hold', target: 10, tip: 'Top arm pulls, bottom arm pushes. Body vertical.' },
    { name: 'Tuck flag',               kind: 'hold', target: 8,  tip: 'Knees tucked, hips up.' },
    { name: 'Straddle flag',           kind: 'hold', target: 5,  tip: 'Open the legs wide.' },
    { name: 'Full human flag',         kind: 'hold', target: 5,  tip: 'Legs together, parallel to the ground.' },
  ]},
};

/* ---------- Goal presets ---------- */
const GOAL_PRESETS = [
  { id: 'g_muscleup',  type: 'skill', skill: 'muscleup',   title: 'Strict Muscle-up',      icon: 'skill', disc: 'cal' },
  { id: 'g_handstand', type: 'skill', skill: 'handstand',  title: 'Freestanding Handstand', icon: 'skill', disc: 'cal' },
  { id: 'g_frontlever',type: 'skill', skill: 'frontlever', title: 'Full Front Lever',      icon: 'skill', disc: 'cal' },
  { id: 'g_planche',   type: 'skill', skill: 'planche',    title: 'Planche Journey',       icon: 'skill', disc: 'cal' },
  { id: 'g_pistol',    type: 'skill', skill: 'pistol',     title: 'Pistol Squat Mastery',  icon: 'skill', disc: 'cal' },
  { id: 'g_bench',     type: 'lift',  ex: 'g_bench_bb',   target: 60,  bw: 1,    title: 'Bench Press Bodyweight', icon: 'push', disc: 'gym' },
  { id: 'g_squat',     type: 'lift',  ex: 'g_back_squat', target: 80,  bw: 1.5,  title: 'Squat 1.5× Bodyweight',  icon: 'legs', disc: 'gym' },
  { id: 'g_deadlift',  type: 'lift',  ex: 'g_deadlift',   target: 100, bw: 2,    title: 'Deadlift 2× Bodyweight', icon: 'pull', disc: 'gym' },
  { id: 'g_ohp',       type: 'lift',  ex: 'g_ohp',        target: 40,  bw: .66,  title: 'Overhead Press ⅔ Bodyweight', icon: 'push', disc: 'gym' },
  { id: 'g_pullups',   type: 'reps',  ex: 'pullup',  target: 20, title: '20 Strict Pull-ups', icon: 'pull' },
  { id: 'g_pushups',   type: 'reps',  ex: 'pushup',  target: 50, title: '50 Push-ups in a Row', icon: 'push', disc: 'cal' },
  { id: 'g_dips',      type: 'reps',  ex: 'dip',     target: 25, title: '25 Dips in a Row',   icon: 'push', disc: 'cal' },
  { id: 'g_mass',      type: 'weight', target: 66,   title: 'Build Lean Muscle',  icon: 'scale' },
];

/* ---------- Budget food list (per typical serving, approximate) ---------- */
const FOODS = [
  { id: 'egg',       name: 'Egg',                         unit: '1 large',        kcal: 72,  p: 6.3 },
  { id: 'rice',      name: 'White rice, cooked',          unit: '1 cup',          kcal: 205, p: 4.3 },
  { id: 'beans',     name: 'Beans, cooked',               unit: '1 cup',          kcal: 225, p: 15 },
  { id: 'lentils',   name: 'Lentils, cooked',             unit: '1 cup',          kcal: 230, p: 18 },
  { id: 'milk',      name: 'Whole milk',                  unit: '1 glass (250 ml)', kcal: 150, p: 8 },
  { id: 'oats',      name: 'Oats, dry',                   unit: '½ cup (40 g)',   kcal: 150, p: 5 },
  { id: 'banana',    name: 'Banana',                      unit: '1 medium',       kcal: 105, p: 1.3 },
  { id: 'plantain',  name: 'Plantain, cooked',            unit: '1 medium',       kcal: 220, p: 2 },
  { id: 'arepa',     name: 'Arepa / corn cake',           unit: '1 medium',       kcal: 150, p: 3.5 },
  { id: 'tortilla',  name: 'Corn tortilla',               unit: '1',              kcal: 55,  p: 1.5 },
  { id: 'bread',     name: 'Bread',                       unit: '1 slice',        kcal: 75,  p: 3 },
  { id: 'pasta',     name: 'Pasta, cooked',               unit: '1 cup',          kcal: 220, p: 8 },
  { id: 'potato',    name: 'Potato, boiled',              unit: '1 medium',       kcal: 150, p: 4 },
  { id: 'yuca',      name: 'Cassava (yuca), boiled',      unit: '1 cup',          kcal: 200, p: 1.7 },
  { id: 'corn',      name: 'Corn on the cob',             unit: '1 ear',          kcal: 90,  p: 3 },
  { id: 'chicken',   name: 'Chicken breast, cooked',      unit: '100 g',          kcal: 165, p: 31 },
  { id: 'chicken_t', name: 'Chicken thigh, cooked',       unit: '100 g',          kcal: 210, p: 26 },
  { id: 'beef',      name: 'Beef, cooked',                unit: '100 g',          kcal: 215, p: 26 },
  { id: 'pork',      name: 'Pork, cooked',                unit: '100 g',          kcal: 240, p: 27 },
  { id: 'fish',      name: 'Fish fillet (tilapia)',       unit: '100 g',          kcal: 130, p: 26 },
  { id: 'tuna',      name: 'Canned tuna, drained',        unit: '1 can',          kcal: 130, p: 28 },
  { id: 'sardines',  name: 'Canned sardines',             unit: '1 can',          kcal: 190, p: 22 },
  { id: 'cheese',    name: 'Fresh white cheese',          unit: '50 g',           kcal: 140, p: 9 },
  { id: 'yogurt',    name: 'Plain yogurt',                unit: '1 cup',          kcal: 150, p: 8.5 },
  { id: 'pb',        name: 'Peanut butter',               unit: '2 tbsp',         kcal: 190, p: 7 },
  { id: 'peanuts',   name: 'Peanuts',                     unit: 'handful (30 g)', kcal: 170, p: 7 },
  { id: 'avocado',   name: 'Avocado',                     unit: '½ fruit',        kcal: 120, p: 1.5 },
  { id: 'fruit',     name: 'Fruit (apple, orange, mango)', unit: '1 piece',       kcal: 90,  p: 1 },
  { id: 'veg',       name: 'Mixed vegetables',            unit: '1 cup',          kcal: 50,  p: 2 },
  { id: 'soup',      name: 'Hearty soup with meat & tubers', unit: '1 bowl',      kcal: 320, p: 18 },
  { id: 'aguapanela',name: 'Cane sugar drink (aguapanela)', unit: '1 glass',     kcal: 100, p: 0 },
  { id: 'coffee_m',  name: 'Coffee with milk',            unit: '1 cup',          kcal: 60,  p: 3 },
  { id: 'whey',      name: 'Whey protein',                unit: '1 scoop',        kcal: 120, p: 24 },
];
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

/* ---------- Scripture (KJV, public domain) ---------- */
const VERSES = [
  { ref: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', note: 'Strength is renewed, not just spent. Train hard, then rest in Him.' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.', note: 'Not a promise of easy reps, a promise you will not face the hard ones alone.' },
  { ref: '1 Corinthians 9:24', text: 'Know ye not that they which run in a race run all, but one receiveth the prize? So run, that ye may obtain.', note: 'Train with purpose. Every set is part of the race.' },
  { ref: '1 Corinthians 9:27', text: 'But I keep under my body, and bring it into subjection.', note: 'Discipline today is freedom tomorrow.' },
  { ref: '1 Corinthians 6:19–20', text: 'What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own? For ye are bought with a price: therefore glorify God in your body, and in your spirit, which are God\'s.', note: 'Caring for your body is an act of worship.' },
  { ref: '1 Timothy 4:8', text: 'For bodily exercise profiteth little: but godliness is profitable unto all things, having promise of the life that now is, and of that which is to come.', note: 'Train the body, but train the soul first.' },
  { ref: 'Galatians 6:9', text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.', note: 'Progress is slow, then sudden. Keep showing up.' },
  { ref: 'Colossians 3:23', text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.', note: 'No one is watching on the farm. He is. Give your best rep.' },
  { ref: 'Joshua 1:9', text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.', note: 'Courage for the hard skill you\'re afraid to try.' },
  { ref: 'Hebrews 12:1–2', text: 'Let us run with patience the race that is set before us, looking unto Jesus the author and finisher of our faith.', note: 'Patience is a training principle too.' },
  { ref: 'Hebrews 12:11', text: 'Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness unto them which are exercised thereby.', note: 'The burn is temporary; the fruit stays.' },
  { ref: '2 Timothy 4:7', text: 'I have fought a good fight, I have finished my course, I have kept the faith.', note: 'Finish the workout. Finish the day. Keep the faith.' },
  { ref: 'Psalm 18:32', text: 'It is God that girdeth me with strength, and maketh my way perfect.', note: 'Your strength is a gift. Use it well.' },
  { ref: 'Psalm 28:7', text: 'The LORD is my strength and my shield; my heart trusted in him, and I am helped.', note: 'Trust Him with the plateau, too.' },
  { ref: 'Proverbs 24:16', text: 'For a just man falleth seven times, and riseth up again.', note: 'Missed a rep? Missed a day? Rise again.' },
  { ref: 'Proverbs 16:3', text: 'Commit thy works unto the LORD, and thy thoughts shall be established.', note: 'Dedicate this session before you start it.' },
  { ref: 'Nehemiah 8:10', text: 'For the joy of the LORD is your strength.', note: 'Train with joy, not just grit.' },
  { ref: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', note: 'Upheld, like a spotter that never lets go.' },
  { ref: '2 Corinthians 12:9', text: 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.', note: 'Weak days are where faith gets trained.' },
  { ref: 'Romans 5:3–4', text: 'We glory in tribulations also: knowing that tribulation worketh patience; and patience, experience; and experience, hope.', note: 'Hard sets build patience. Patience builds hope.' },
  { ref: 'Romans 8:37', text: 'Nay, in all these things we are more than conquerors through him that loved us.', note: 'You are an overcomer.' },
  { ref: 'James 1:12', text: 'Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life.', note: 'Endurance has a reward greater than any medal.' },
  { ref: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', note: 'Rest is part of the program. Take it without guilt.' },
  { ref: 'Lamentations 3:22–23', text: 'His compassions fail not. They are new every morning: great is thy faithfulness.', note: 'Yesterday\'s missed workout doesn\'t define today.' },
  { ref: 'Zechariah 4:10', text: 'For who hath despised the day of small things?', note: 'One more rep. One more second. Small things add up.' },
  { ref: 'Ecclesiastes 9:10', text: 'Whatsoever thy hand findeth to do, do it with thy might.', note: 'Farm work or pull-ups: full effort.' },
  { ref: 'Psalm 118:24', text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.', note: 'Today is a gift. Make it count.' },
  { ref: 'Philippians 3:14', text: 'I press toward the mark for the prize of the high calling of God in Christ Jesus.', note: 'Eyes on the goal. Keep pressing.' },
  { ref: 'Deuteronomy 31:6', text: 'Be strong and of a good courage, fear not: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.', note: 'You never train alone.' },
  { ref: 'Habakkuk 3:19', text: 'The LORD God is my strength, and he will make my feet like hinds\' feet, and he will make me to walk upon mine high places.', note: 'He leads you to higher places. Keep climbing.' },
  { ref: 'Psalm 73:26', text: 'My flesh and my heart faileth: but God is the strength of my heart, and my portion for ever.', note: 'When the muscles fail, He doesn\'t.' },
];
/* Situational verses */
const VERSE_FOOD  = { ref: '1 Corinthians 10:31', text: 'Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.' };
const VERSE_WATER = { ref: 'John 4:14', text: 'But whosoever drinketh of the water that I shall give him shall never thirst.' };
const VERSE_BREAD = { ref: 'Matthew 6:11', text: 'Give us this day our daily bread.' };
const VERSE_REST  = { ref: 'Psalm 46:10', text: 'Be still, and know that I am God.' };

/* ---------- Motivation (original lines) ---------- */
const QUOTES = [
  'Gravity is free. So is discipline. Use both.',
  'You don\'t need a gym. You need a bar, a floor, and a reason.',
  'The rep you don\'t want to do is the one that changes you.',
  'Consistency beats intensity when intensity quits.',
  'Every master was once a beginner who refused to stop.',
  'Strong is built in silence, on ordinary days.',
  'Your body hears everything your mind says. Speak strength.',
  'Small daily wins compound into the impossible.',
  'Don\'t count the days. Make the days count.',
  'Tired is a feeling. Done is a decision.',
  'The farm builds work ethic. The bar builds the rest.',
  'Progress, not perfection. One more rep than last time.',
  'Fall seven times, stand up eight.',
  'Sore today, strong tomorrow.',
  'Hard work in the dark shines in the light.',
  'Motivation gets you started. Habits keep you going.',
  'You are one workout away from a better mood.',
  'Champions are made when no one is watching.',
  'If it doesn\'t challenge you, it won\'t change you.',
  'The goal is not to be better than anyone else, but better than you were yesterday.',
  'Rest when you\'re tired. Don\'t quit.',
  'A year from now, you\'ll wish you started today. You already did — keep going.',
  'Earn the skill. No shortcuts on the way up.',
  'Strength is a byproduct of showing up.',
  'Bodyweight is the oldest barbell in the world.',
  'Feed the body, train the body, rest the body, trust the process.',
  'You\'re not starting over. You\'re starting stronger.',
  'Grip the bar like you mean it.',
];

/* ---------- Levels ---------- */
const TITLES = [
  [1, 'Farmhand'], [3, 'Villager'], [5, 'Squire'], [8, 'Militiaman'], [11, 'Soldier'], [15, 'Knight'],
  [20, 'Knight-Captain'], [25, 'Champion'], [30, 'Lord'], [40, 'Prince'], [50, 'King'],
]

/* ---------- Habits ---------- */
const DEFAULT_HABITS = [
  { id: 'pray',     name: 'Morning prayer',          icon: 'cross', cat: 'faith', faith: true },   // faith: only in Faith mode
  { id: 'word',     name: 'Read Scripture',          icon: 'book',  cat: 'faith', faith: true },
  { id: 'train',    name: 'Train or practice a skill', icon: 'bolt', auto: 'train', cat: 'body' },
  { id: 'water',    name: 'Drink water',             icon: 'drop',  auto: 'water', cat: 'fuel' },
  { id: 'protein',  name: 'Hit protein goal',        icon: 'flame', auto: 'protein', cat: 'fuel' },
  { id: 'stretch',  name: 'Stretch / mobility 10 min', icon: 'leaf', cat: 'body' },
  { id: 'sleep',    name: 'Slept 7+ hours',          icon: 'moon',  cat: 'body' },
  { id: 'grateful', name: 'Gratitude: 3 things',     icon: 'heart', cat: 'mind' },
];
/* Habit categories → which theme color tints them */
const HABIT_CATS = {
  faith: { name: 'Faith', color: 'var(--faith)' },
  body:  { name: 'Body',  color: 'var(--accent)' },
  fuel:  { name: 'Fuel',  color: 'var(--water)' },
  mind:  { name: 'Mind',  color: 'var(--xp)' },
};

/* ---------- Themes (every role is user-editable in Me → Appearance) ---------- */
const THEME_ROLES = [
  ['accent',  'Accent',            'Buttons, tabs, highlights'],
  ['accent2', 'Accent blend',      'Second color in gradients'],
  ['glow1',   'Background glow',   'Light at the top of the screen'],
  ['glow2',   'Second glow',       'Light at the bottom'],
  ['xp',      'XP & rewards',      'Levels, missions, Main Quest'],
  ['streak',  'Streak flames',     'Fire and streak counters'],
  ['success', 'Completed',         'Checks, done habits, PRs, the live workout'],
  ['rest',    'Rest timer',        'The workout bar while you rest'],
  ['water',   'Water',             'Hydration rings'],
  ['kcal',    'Calories',          'Calorie ring'],
  ['protein', 'Protein',           'Protein ring'],
  ['faith',   'Faith & verses',    'Scripture and prayer'],
  ['danger',  'Warnings',          'Delete, reset'],
  ['logo',    'Logo',              'The Z mark'],
  ['logoBg',  'Logo background',   'Behind the mark'],
];
const THEMES = {
  midnight: { name: 'Midnight', colors: { accent: '#0a84ff', accent2: '#5e5ce6', glow1: '#3b2bd9', glow2: '#0b4a5c', xp: '#ffd60a', streak: '#ff9f0a', success: '#30d158', water: '#64d2ff', kcal: '#ff9f0a', protein: '#ff375f', faith: '#bf5af2', danger: '#ff453a', logo: '#ffffff', logoBg: '#000000' } },
  ember:    { name: 'Ember',    colors: { accent: '#ff9f0a', accent2: '#ff5e1a', glow1: '#9a4a0c', glow2: '#3d1804', xp: '#ffcc4d', streak: '#ff7a1a', success: '#30d158', water: '#5ac8fa', kcal: '#ff9f0a', protein: '#ff6482', faith: '#ffb36b', danger: '#ff453a', logo: '#ffb340', logoBg: '#000000' } },
  ocean:    { name: 'Ocean',    colors: { accent: '#32ade6', accent2: '#0a84ff', glow1: '#0a4f7a', glow2: '#063a36', xp: '#ffd60a', streak: '#ff9f0a', success: '#34c759', water: '#64d2ff', kcal: '#ff9f0a', protein: '#ff6482', faith: '#7d7aff', danger: '#ff453a', logo: '#64d2ff', logoBg: '#000000' } },
  forest:   { name: 'Forest',   colors: { accent: '#30d158', accent2: '#0fa36b', glow1: '#0e5a2c', glow2: '#2a3a08', xp: '#e8d44d', streak: '#ff9f0a', success: '#30d158', water: '#5ac8fa', kcal: '#ffb340', protein: '#ff6482', faith: '#a6e3a1', danger: '#ff453a', logo: '#30d158', logoBg: '#000000' } },
  rose:     { name: 'Rose',     colors: { accent: '#ff375f', accent2: '#bf5af2', glow1: '#7a1240', glow2: '#2e0a42', xp: '#ffd60a', streak: '#ff7a1a', success: '#30d158', water: '#64d2ff', kcal: '#ff9f0a', protein: '#ff375f', faith: '#da8fff', danger: '#ff453a', logo: '#ff6482', logoBg: '#000000' } },
  royal:    { name: 'Royal',    colors: { accent: '#bf5af2', accent2: '#5e5ce6', glow1: '#4a1a8a', glow2: '#3d2c05', xp: '#ffd60a', streak: '#ff9f0a', success: '#30d158', water: '#64d2ff', kcal: '#ff9f0a', protein: '#ff375f', faith: '#ffd60a', danger: '#ff453a', logo: '#ffd60a', logoBg: '#000000' } },
  mono:     { name: 'Graphite', colors: { accent: '#f2f2f7', accent2: '#8e8e93', glow1: '#3a3a3f', glow2: '#1a1a1c', xp: '#e5e5ea', streak: '#ff9f0a', success: '#30d158', water: '#c7c7cc', kcal: '#aeaeb2', protein: '#8e8e93', faith: '#d1d1d6', danger: '#ff453a', logo: '#ffffff', logoBg: '#000000' } },
};
/* Rest timer color (v1.15.1): each palette rests in its blend color */
for (const t of Object.values(THEMES)) if (!t.colors.rest) t.colors.rest = t.colors.accent2;

/* ---------- Achievements ---------- */
const ACHIEVEMENTS = [
  { id: 'first_workout', name: 'First Step',      desc: 'Log your first workout',       icon: 'bolt' },
  { id: 'w10',           name: 'Showing Up',      desc: 'Log 10 workouts',          icon: 'shield' },
  { id: 'w50',           name: 'Iron Will',       desc: 'Log 50 workouts',              icon: 'crown' },
  { id: 'w100',          name: 'Centurion',       desc: 'Log 100 workouts',             icon: 'crown' },
  { id: 'first_pr',      name: 'New Heights',     desc: 'Set a personal record',        icon: 'trophy' },
  { id: 'pr10',          name: 'Record Breaker',  desc: 'Set 10 personal records',      icon: 'trophy' },
  { id: 'streak7',       name: 'Seven Days',      desc: '7-day active streak',          icon: 'flame' },
  { id: 'streak30',      name: 'Rooted',          desc: '30-day active streak',         icon: 'flame' },
  { id: 'skill1',        name: 'Skill Unlocked',  desc: 'Complete a skill step',        icon: 'star' },
  { id: 'skill10',       name: 'Artisan',         desc: 'Complete 10 skill steps',      icon: 'star' },
  { id: 'hydrated7',     name: 'Well Hydrated',   desc: 'Hit your water goal 7 days',   icon: 'drop' },
  { id: 'protein7',      name: 'Protein Week',    desc: 'Hit your protein goal 7 days', icon: 'flame' },
  { id: 'reps1000',      name: 'Thousand Reps',   desc: '1,000 total reps logged',      icon: 'bolt' },
  { id: 'reps10000',     name: 'Ten Thousand',    desc: '10,000 total reps logged',     icon: 'bolt' },
  { id: 'lvl5',          name: 'Squire',         desc: 'Reach level 5',                icon: 'up' },
  { id: 'lvl10',         name: 'Rising',          desc: 'Reach level 10',               icon: 'up' },
  { id: 'lvl20',         name: 'Knight-Captain',        desc: 'Reach level 20',               icon: 'up' },
  { id: 'levelup_ex',    name: 'Next Progression', desc: 'Advance an exercise progression', icon: 'mountain' },
  { id: 'goal_done',     name: 'Quest Complete',  desc: 'Complete a Main Quest',        icon: 'target' },
  { id: 'weighin4',      name: 'Know Thyself',    desc: 'Log your weight 4 times',      icon: 'scale' },
  { id: 'gym1',          name: 'Iron Initiate',   desc: 'Finish your first gym workout', icon: 'dumbbell' },
  { id: 'ton10',         name: 'Ten Tonnes',      desc: 'Lift 10,000 kg in total',      icon: 'dumbbell' },
  { id: 'ton100',        name: 'Hundred Tonnes',  desc: 'Lift 100,000 kg in total',     icon: 'crown' },
];
