/* ZELUM — gym training: muscles, equipment, the exercise library, training splits, the plan builder
   and the double-progression engine. Calisthenics moves from data.js join the library as bodyweight
   exercises, so one history, one coach and one set of records cover both disciplines. */

/* ---------- Muscle groups & muscles ---------- */
const GROUPS = {
  chest:      { name: 'Chest',          color: 'orange' },
  back:       { name: 'Back',           color: 'blue' },
  shoulders:  { name: 'Shoulders',      color: 'purple' },
  biceps:     { name: 'Biceps',         color: 'teal' },
  triceps:    { name: 'Triceps',        color: 'pink' },
  forearms:   { name: 'Forearms',       color: 'yellow' },
  quads:      { name: 'Quadriceps',     color: 'green' },
  hamstrings: { name: 'Hamstrings',     color: 'yellow' },
  glutes:     { name: 'Glutes & hips',  color: 'pink' },
  calves:     { name: 'Calves',         color: 'teal' },
  core:       { name: 'Abs & core',     color: 'red' },
};
const MUSCLES = {
  chest: ['Chest (pectorals)', 'chest'], upper_chest: ['Upper chest', 'chest'],
  lats: ['Lats', 'back'], mid_back: ['Mid back (rhomboids)', 'back'], traps: ['Traps', 'back'], lower_back: ['Lower back (erectors)', 'back'],
  front_delt: ['Front delts', 'shoulders'], side_delt: ['Side delts', 'shoulders'], rear_delt: ['Rear delts', 'shoulders'],
  biceps: ['Biceps', 'biceps'], brachialis: ['Brachialis', 'biceps'],
  triceps: ['Triceps', 'triceps'],
  forearms: ['Forearms', 'forearms'], grip: ['Grip', 'forearms'],
  quads: ['Quadriceps', 'quads'], adductors: ['Adductors (inner thigh)', 'glutes'],
  hamstrings: ['Hamstrings', 'hamstrings'],
  glutes: ['Glutes', 'glutes'], glute_med: ['Glute medius (outer hip)', 'glutes'],
  calves: ['Calves (gastrocnemius)', 'calves'], soleus: ['Soleus', 'calves'],
  abs: ['Abs', 'core'], obliques: ['Obliques', 'core'], hip_flexors: ['Hip flexors', 'core'],
};
const groupOf = m => (MUSCLES[m] || [m, 'core'])[1];

/* ---------- Equipment ---------- */
const EQUIP = {
  barbell: 'Barbell & plates', rack: 'Squat rack', bench: 'Adjustable bench', dumbbell: 'Dumbbells', cable: 'Cable machine',
  machine: 'Weight machines', kettlebell: 'Kettlebell', pullbar: 'Pull-up bar', dipbars: 'Dip bars',
};
const EQUIP_PRESETS = {
  gym:   { name: 'Full gym', list: Object.keys(EQUIP) },
  home:  { name: 'Home gym', list: ['barbell', 'rack', 'bench', 'dumbbell', 'pullbar'] },
  db:    { name: 'Dumbbells only', list: ['dumbbell', 'bench'] },
  bw:    { name: 'Bodyweight', list: ['pullbar', 'dipbars'] },
};
const KIT = { barbell: 'Barbell', dumbbell: 'Dumbbell', cable: 'Cable', machine: 'Machine', bodyweight: 'Bodyweight', kettlebell: 'Kettlebell' };
const LEVELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
const EXP_LV = { beginner: 1, intermediate: 2, advanced: 3 };
const FOCUS = {
  hypertrophy: { name: 'Muscle growth', blurb: 'Moderate weights, 6–15 reps, more sets.' },
  strength:    { name: 'Strength',      blurb: 'Heavy compound lifts, 3–6 reps, long rests.' },
  endurance:   { name: 'Endurance',     blurb: 'Lighter weights, 12–25 reps, short rests.' },
  general:     { name: 'General fitness', blurb: 'Balanced: 8–15 reps, steady progress.' },
};

/* ---------- Exercise library ----------
   [id, name, group, primary, secondary, kit, needs, mech (C compound / I isolation), level 1–3, pattern, figure, steps, cue, start ratio]
   Start ratio = a cautious first-session load as a share of bodyweight (per hand for dumbbells). */
const GX_TABLE = [
  // Chest
  ['g_bench_bb', 'Barbell Bench Press', 'chest', ['chest'], ['front_delt', 'triceps'], 'barbell', ['barbell', 'bench', 'rack'], 'C', 2, 'hpress', 'bench',
    ['Lie with your eyes under the bar, feet flat, shoulder blades squeezed together.', 'Grip a little wider than your shoulders, unrack and hold the bar over your shoulders.', 'Lower under control to your mid-chest, forearms vertical.', 'Press up and slightly back to straight arms.'],
    'Upper back tight, feet planted. Use safety pins or a spotter when it gets heavy.', .45],
  ['g_incline_bb', 'Incline Barbell Press', 'chest', ['upper_chest'], ['front_delt', 'triceps'], 'barbell', ['barbell', 'bench', 'rack'], 'C', 2, 'ipress', 'incBench',
    ['Set the bench to 30–45°.', 'Unrack with a grip a little wider than your shoulders.', 'Lower to your upper chest, just below the collarbone.', 'Press straight up over your shoulders.'],
    'A 30° incline keeps it a chest press rather than a shoulder press.', .38],
  ['g_bench_db', 'Dumbbell Bench Press', 'chest', ['chest'], ['front_delt', 'triceps'], 'dumbbell', ['dumbbell', 'bench'], 'C', 1, 'hpress', { k: 'bench', impl: 'db' },
    ['Sit with the dumbbells on your thighs, lie back and bring them over your chest.', 'Lower with elbows about 45° from your body until you feel a stretch.', 'Press up until your arms are straight, dumbbells close but not touching.'],
    'Each arm works on its own — great for evening out a weaker side.', .16],
  ['g_incline_db', 'Incline Dumbbell Press', 'chest', ['upper_chest'], ['front_delt', 'triceps'], 'dumbbell', ['dumbbell', 'bench'], 'C', 1, 'ipress', { k: 'incBench', impl: 'db' },
    ['Set the bench to 30–45° and kick the dumbbells up to your shoulders.', 'Lower slowly beside your upper chest.', 'Press up and slightly in until your arms are straight.'],
    'Keep your shoulder blades pinned to the bench the whole set.', .14],
  ['g_fly_db', 'Dumbbell Fly', 'chest', ['chest'], ['front_delt'], 'dumbbell', ['dumbbell', 'bench'], 'I', 1, 'fly', 'fly',
    ['Lie on a flat bench, dumbbells over your chest, palms facing each other.', 'With a slight, fixed bend in the elbows, open your arms wide in an arc.', 'Stop at a deep stretch, then hug the weights back together.'],
    'Go lighter than you think: the stretch matters more than the load. (Shown from above.)', .06],
  ['g_cable_cross', 'Cable Crossover', 'chest', ['chest'], ['front_delt'], 'cable', ['cable'], 'I', 2, 'fly', 'crossover',
    ['Set both pulleys high, take a handle in each hand and step forward.', 'Lean forward slightly with a soft bend in your elbows.', 'Bring your hands down and together in front of your hips, squeezing the chest.', 'Return slowly until you feel a stretch.'],
    'Think "hug a tree" — the elbows stay softly bent.', 0],
  ['g_pec_deck', 'Pec Deck (Machine Fly)', 'chest', ['chest'], ['front_delt'], 'machine', ['machine'], 'I', 1, 'fly', 'pecdeck',
    ['Adjust the seat so the handles are at chest height.', 'Forearms or hands on the pads, squeeze the pads together in front of you.', 'Pause, then let them open slowly to a comfortable stretch.'],
    'Keep your shoulders down and back against the pad.', 0],
  ['g_chest_press', 'Machine Chest Press', 'chest', ['chest'], ['front_delt', 'triceps'], 'machine', ['machine'], 'C', 1, 'hpress', 'chestPress',
    ['Set the seat so the handles are level with your mid-chest.', 'Press the handles forward until your arms are straight.', 'Return slowly until you feel a stretch across the chest.'],
    'A safe way to push hard close to failure — no spotter needed.', .4],

  // Back
  ['g_deadlift', 'Deadlift', 'back', ['glutes', 'hamstrings', 'lower_back'], ['traps', 'grip', 'quads'], 'barbell', ['barbell'], 'C', 3, 'hinge', 'deadlift',
    ['Stand with the bar over your mid-foot, feet hip-width apart.', 'Hinge down and grip the bar just outside your legs; shins touch the bar.', 'Chest up, back flat, pull the slack out of the bar.', 'Push the floor away and stand tall; lower the same way, bar close to your legs.'],
    'Your back stays flat the whole time — if it rounds, the weight is too heavy. Learn it light.', .7],
  ['g_bb_row', 'Barbell Row', 'back', ['mid_back', 'lats'], ['rear_delt', 'biceps', 'lower_back'], 'barbell', ['barbell'], 'C', 2, 'hpull', 'bbRow',
    ['Hinge forward to about 45°, knees soft, back flat, bar hanging at your knees.', 'Pull the bar to your lower ribs, elbows driving back.', 'Squeeze your shoulder blades, then lower with control.'],
    'If your torso swings up to move the bar, lighten the load.', .4],
  ['g_db_row', 'One-Arm Dumbbell Row', 'back', ['lats', 'mid_back'], ['rear_delt', 'biceps'], 'dumbbell', ['dumbbell', 'bench'], 'C', 1, 'hpull', 'dbRow',
    ['Put one knee and hand on a bench, back flat and level.', 'Let the dumbbell hang straight down from your shoulder.', 'Pull it toward your hip, elbow close to your side.', 'Lower slowly to a full stretch.'],
    'Pull to the hip, not the chest — that is what makes the lats work.', .18],
  ['g_lat_pulldown', 'Lat Pulldown', 'back', ['lats'], ['biceps', 'mid_back'], 'cable', ['cable'], 'C', 1, 'vpull', 'pulldown',
    ['Sit with your thighs under the pad and grip the bar a little wider than your shoulders.', 'Lean back slightly and pull the bar to your upper chest.', 'Drive your elbows down toward your back pockets.', 'Let the bar rise until your arms are straight.'],
    'No yanking with your body — the back does the work.', .45],
  ['g_seated_row', 'Seated Cable Row', 'back', ['mid_back', 'lats'], ['biceps', 'rear_delt'], 'cable', ['cable'], 'C', 1, 'hpull', 'cableRow',
    ['Sit with your feet on the platform, knees slightly bent, chest up.', 'Pull the handle to your belly, squeezing your shoulder blades.', 'Reach forward slowly to stretch, without rounding your lower back.'],
    'Torso stays almost still — only a small lean at the end of each rep.', .4],
  ['g_machine_row', 'Chest-Supported Machine Row', 'back', ['mid_back', 'lats'], ['rear_delt', 'biceps'], 'machine', ['machine'], 'C', 1, 'hpull', 'machRow',
    ['Set the seat so the handles are at chest height with your chest on the pad.', 'Pull the handles back until your elbows pass your torso.', 'Return slowly to a full stretch.'],
    'The chest pad takes your lower back out of it — push hard here.', .4],
  ['g_straight_pd', 'Straight-Arm Pulldown', 'back', ['lats'], ['triceps', 'abs'], 'cable', ['cable'], 'I', 2, 'pullover', 'straightPd',
    ['Face a high pulley, hinge slightly, arms straight on a bar or rope.', 'Sweep the handle down in an arc to your thighs.', 'Let it rise slowly back to eye level.'],
    'Arms stay straight — feel the lats under your armpits do the work.', 0],
  ['g_shrug_bb', 'Barbell Shrug', 'back', ['traps'], ['grip'], 'barbell', ['barbell'], 'I', 1, 'shrug', 'shrug',
    ['Stand tall holding the bar in front of your thighs.', 'Lift your shoulders straight up toward your ears.', 'Pause one second, then lower all the way.'],
    'Straight up and down — no rolling the shoulders.', .6],
  ['g_shrug_db', 'Dumbbell Shrug', 'back', ['traps'], ['grip'], 'dumbbell', ['dumbbell'], 'I', 1, 'shrug', 'shrugDb',
    ['Stand tall with a dumbbell at each side.', 'Shrug your shoulders straight up as high as you can.', 'Pause, then lower slowly.'],
    'Let the arms hang like ropes; the traps lift.', .25],
  ['g_back_ext', 'Back Extension (45°)', 'back', ['lower_back', 'glutes'], ['hamstrings'], 'machine', ['machine'], 'I', 1, 'backext', 'backExt',
    ['Set the pad just below your hip bones and hook your feet.', 'Lower your torso by hinging at the hips, back flat.', 'Raise until your body is in a straight line — no further.'],
    'Do not over-arch at the top. Hold a plate to your chest to progress.', 0],

  // Shoulders
  ['g_ohp', 'Overhead Press', 'shoulders', ['front_delt'], ['side_delt', 'triceps', 'upper_chest'], 'barbell', ['barbell', 'rack'], 'C', 2, 'vpress', 'ohp',
    ['Unrack the bar at your collarbone, grip just outside your shoulders.', 'Squeeze your glutes and brace your abs.', 'Press straight up, moving your head back then through once the bar passes.', 'Lower to the collarbone with control.'],
    'Ribs down — do not lean back into a standing bench press.', .3],
  ['g_db_ohp', 'Seated Dumbbell Shoulder Press', 'shoulders', ['front_delt'], ['side_delt', 'triceps'], 'dumbbell', ['dumbbell', 'bench'], 'C', 1, 'vpress', 'seatOhp',
    ['Sit upright on a bench with back support, dumbbells at shoulder height.', 'Press up until your arms are straight overhead.', 'Lower until the dumbbells are level with your ears.'],
    'Keep your back against the pad — no arching.', .12],
  ['g_arnold', 'Arnold Press', 'shoulders', ['front_delt', 'side_delt'], ['triceps'], 'dumbbell', ['dumbbell', 'bench'], 'C', 2, 'vpress', 'arnold',
    ['Start with the dumbbells in front of your chin, palms facing you.', 'As you press up, rotate the palms to face forward.', 'Reverse the rotation on the way down.'],
    'Smooth rotation, no rushing — it trains the whole shoulder.', .1],
  ['g_machine_ohp', 'Machine Shoulder Press', 'shoulders', ['front_delt'], ['side_delt', 'triceps'], 'machine', ['machine'], 'C', 1, 'vpress', 'machPress',
    ['Set the seat so the handles start at shoulder height.', 'Press up until your arms are almost straight.', 'Lower slowly back to the start.'],
    'A stable way to train shoulders hard without balancing a bar.', .3],
  ['g_lateral', 'Dumbbell Lateral Raise', 'shoulders', ['side_delt'], ['traps'], 'dumbbell', ['dumbbell'], 'I', 1, 'raise', 'lateral',
    ['Stand tall, dumbbells at your sides, slight bend in the elbows.', 'Raise your arms out to the sides up to shoulder height.', 'Lower slowly — about 3 seconds.'],
    'Lead with your elbows and keep your shoulders away from your ears.', .05],
  ['g_cable_lateral', 'Cable Lateral Raise', 'shoulders', ['side_delt'], [], 'cable', ['cable'], 'I', 2, 'raise', 'latCable',
    ['Stand side-on to a low pulley, handle in the far hand.', 'Raise your arm out to the side up to shoulder height.', 'Lower slowly, feeling the cable keep tension at the bottom.'],
    'One arm at a time; the cable keeps the side delt working the whole rep.', 0],
  ['g_front_raise', 'Front Raise', 'shoulders', ['front_delt'], ['upper_chest'], 'dumbbell', ['dumbbell'], 'I', 1, 'fraise', 'frontRaise',
    ['Stand tall with the dumbbells in front of your thighs.', 'Raise them in front of you to shoulder height, arms nearly straight.', 'Lower with control.'],
    'Front delts already work hard in pressing — a little goes a long way.', .05],
  ['g_rev_pec', 'Reverse Pec Deck', 'shoulders', ['rear_delt'], ['mid_back'], 'machine', ['machine'], 'I', 1, 'rear', 'revPec',
    ['Sit facing the machine, chest on the pad, handles at shoulder height.', 'Sweep your arms out and back in a wide arc.', 'Pause, then return slowly.'],
    'Lead with your knuckles; do not squeeze the shoulder blades hard.', 0],
  ['g_face_pull', 'Face Pull', 'shoulders', ['rear_delt'], ['mid_back', 'traps'], 'cable', ['cable'], 'I', 1, 'rear', 'facePull',
    ['Set a rope at face height and step back with arms straight.', 'Pull the rope toward your face, hands ending beside your ears.', 'Elbows stay high; return slowly.'],
    'Great for shoulder health — balances all the pressing.', 0],
  ['g_upright_row', 'Upright Row', 'shoulders', ['side_delt', 'traps'], ['biceps'], 'barbell', ['barbell'], 'C', 2, 'raise', 'upright',
    ['Hold the bar in front of your thighs, hands shoulder-width or wider.', 'Pull it up along your body, elbows leading, to lower-chest height.', 'Lower slowly.'],
    'Stop at chest height and use a wider grip if your shoulders feel pinched.', .2],

  // Biceps
  ['g_bb_curl', 'Barbell Curl', 'biceps', ['biceps'], ['brachialis', 'forearms'], 'barbell', ['barbell'], 'I', 1, 'curl', 'curl',
    ['Stand tall, bar at your thighs, palms facing forward.', 'Curl the bar up, keeping your elbows at your sides.', 'Squeeze at the top, then lower slowly to straight arms.'],
    'If you have to swing your body, the weight is too heavy.', .2],
  ['g_db_curl', 'Dumbbell Curl', 'biceps', ['biceps'], ['brachialis', 'forearms'], 'dumbbell', ['dumbbell'], 'I', 1, 'curl', { k: 'curl', impl: 'db' },
    ['Stand with a dumbbell in each hand, palms facing forward.', 'Curl both up, elbows still at your sides.', 'Lower slowly to a full stretch.'],
    'Turn the pinky up slightly at the top for a harder squeeze.', .08],
  ['g_hammer', 'Hammer Curl', 'biceps', ['brachialis', 'biceps'], ['forearms'], 'dumbbell', ['dumbbell'], 'I', 1, 'curl', { k: 'curl', impl: 'db' },
    ['Hold the dumbbells with palms facing each other.', 'Curl up keeping the thumbs on top.', 'Lower slowly.'],
    'Builds arm thickness and grip — the brachialis sits under the biceps.', .09],
  ['g_preacher', 'Preacher Curl (EZ bar)', 'biceps', ['biceps'], ['brachialis'], 'barbell', ['barbell', 'bench'], 'I', 1, 'curl', 'preacher',
    ['Sit with your upper arms flat on the angled pad.', 'Curl the bar up toward your shoulders.', 'Lower slowly until your arms are almost straight.'],
    'The pad stops cheating; the bottom stretch is where it works hardest.', .15],
  ['g_cable_curl', 'Cable Curl', 'biceps', ['biceps'], ['brachialis', 'forearms'], 'cable', ['cable'], 'I', 1, 'curl', 'cableCurl',
    ['Stand facing a low pulley with a straight bar or handle.', 'Curl up keeping your elbows by your sides.', 'Lower slowly — the cable keeps tension all the way.'],
    'Step back a little so the cable pulls at an angle.', 0],
  ['g_incline_curl', 'Incline Dumbbell Curl', 'biceps', ['biceps'], ['brachialis'], 'dumbbell', ['dumbbell', 'bench'], 'I', 2, 'curl', 'incCurl',
    ['Lie back on a bench set to about 60°, arms hanging straight down.', 'Curl up without moving your upper arms forward.', 'Lower slowly to a full stretch.'],
    'Long-stretch position — lighter weight, big effect.', .06],
  ['g_conc_curl', 'Concentration Curl', 'biceps', ['biceps'], ['brachialis'], 'dumbbell', ['dumbbell', 'bench'], 'I', 1, 'curl', 'concCurl',
    ['Sit and brace the back of your arm against your inner thigh.', 'Curl the dumbbell toward your shoulder.', 'Lower slowly to a full stretch.'],
    'Slow and strict; one arm at a time.', .07],

  // Triceps
  ['g_pushdown', 'Cable Triceps Pushdown', 'triceps', ['triceps'], [], 'cable', ['cable'], 'I', 1, 'tri', 'pushdown',
    ['Face a high pulley, elbows pinned at your sides.', 'Push the bar or rope down until your arms are straight.', 'Let it rise until your forearms are just above parallel.'],
    'Only the forearms move — elbows stay glued to your ribs.', 0],
  ['g_oh_ext', 'Overhead Dumbbell Extension', 'triceps', ['triceps'], [], 'dumbbell', ['dumbbell'], 'I', 1, 'tri', 'ohExt',
    ['Hold one dumbbell overhead with both hands.', 'Lower it behind your head by bending the elbows.', 'Extend back up until your arms are straight.'],
    'Overhead work stretches the long head of the triceps — the biggest part.', .12],
  ['g_skull', 'Skull Crusher (EZ bar)', 'triceps', ['triceps'], [], 'barbell', ['barbell', 'bench'], 'I', 2, 'tri', 'skull',
    ['Lie on a bench with the bar straight over your chest.', 'Bend only the elbows to lower the bar toward your forehead.', 'Extend back to straight arms.'],
    'Upper arms angled slightly back; lower slowly and under control.', .18],
  ['g_cgbp', 'Close-Grip Bench Press', 'triceps', ['triceps'], ['chest', 'front_delt'], 'barbell', ['barbell', 'bench', 'rack'], 'C', 2, 'tri', 'bench',
    ['Lie on the bench and grip the bar about shoulder-width.', 'Lower to your lower chest, elbows close to your body.', 'Press back up to straight arms.'],
    'Shoulder-width is close enough — narrower only strains the wrists.', .38],
  ['g_kickback', 'Dumbbell Kickback', 'triceps', ['triceps'], [], 'dumbbell', ['dumbbell', 'bench'], 'I', 1, 'tri', 'kickback',
    ['Support yourself on a bench, torso flat, upper arm along your side.', 'Straighten your arm back until it is in line with your body.', 'Squeeze, then bend back to 90° slowly.'],
    'Upper arm stays still and parallel to the floor.', .05],

  // Forearms
  ['g_wrist_curl', 'Wrist Curl', 'forearms', ['forearms'], [], 'barbell', ['barbell', 'bench'], 'I', 1, 'forearm', 'wristCurl',
    ['Sit with your forearms on your thighs, palms up, wrists past the knees.', 'Let the bar roll down to your fingers.', 'Curl it back up with your wrists only.'],
    'Short, controlled range — high reps work well here.', .15],
  ['g_rev_wrist', 'Reverse Wrist Curl', 'forearms', ['forearms'], [], 'dumbbell', ['dumbbell', 'bench'], 'I', 1, 'forearm', { k: 'wristCurl', impl: 'db' },
    ['Sit with forearms on your thighs, palms down.', 'Lift the backs of your hands up toward you.', 'Lower slowly.'],
    'Balances the forearm and helps protect the elbows.', .04],
  ['g_farmer', "Farmer's Carry", 'forearms', ['grip', 'traps'], ['forearms', 'abs', 'obliques'], 'dumbbell', ['dumbbell'], 'C', 1, 'carry', 'farmer',
    ['Pick up heavy dumbbells, one in each hand.', 'Stand tall, shoulders down, and walk with short steps.', 'Walk for the target time, then set them down with a flat back.'],
    'Like carrying water buckets on the farm — posture first.', .35, 'hold'],
  ['g_rev_curl', 'Reverse Curl', 'forearms', ['brachialis', 'forearms'], ['biceps'], 'barbell', ['barbell'], 'I', 1, 'forearm', 'curl',
    ['Hold the bar with palms facing down.', 'Curl it up keeping your wrists straight.', 'Lower slowly.'],
    'Lighter than a normal curl — the forearms limit it.', .15],

  // Quadriceps
  ['g_back_squat', 'Barbell Back Squat', 'quads', ['quads', 'glutes'], ['adductors', 'lower_back', 'abs'], 'barbell', ['barbell', 'rack'], 'C', 2, 'squat', 'backSquat',
    ['Bar on your upper back, feet shoulder-width, toes turned out slightly.', 'Brace your abs, then sit down and back between your heels.', 'Go as deep as you can with a flat back — hips at or below knees.', 'Drive up through the whole foot.'],
    'Knees track over the toes. Set the safety pins just below your bottom position.', .55],
  ['g_front_squat', 'Front Squat', 'quads', ['quads'], ['glutes', 'abs', 'mid_back'], 'barbell', ['barbell', 'rack'], 'C', 3, 'squat', 'frontSquat',
    ['Rest the bar on the front of your shoulders, elbows high.', 'Squat straight down keeping your torso upright.', 'Drive up leading with your elbows.'],
    'If your elbows drop the bar rolls forward — keep them up.', .45],
  ['g_goblet', 'Goblet Squat', 'quads', ['quads', 'glutes'], ['adductors', 'abs'], 'dumbbell', ['dumbbell'], 'C', 1, 'squat', 'goblet',
    ['Hold one dumbbell vertically against your chest.', 'Squat down between your knees, chest up.', 'Stand back up through your whole foot.'],
    'The best way to learn the squat — the weight in front keeps you upright.', .2],
  ['g_leg_press', 'Leg Press', 'quads', ['quads', 'glutes'], ['adductors'], 'machine', ['machine'], 'C', 1, 'squat', 'legPress',
    ['Sit with your back flat on the pad, feet shoulder-width on the platform.', 'Release the safeties and lower until your knees are near your chest.', 'Press back up without locking your knees hard.'],
    'Do not let your lower back peel off the pad at the bottom.', 1],
  ['g_hack', 'Hack Squat', 'quads', ['quads'], ['glutes'], 'machine', ['machine'], 'C', 2, 'squat', 'hack',
    ['Back against the pad, shoulders under the pads, feet mid-platform.', 'Release and squat down as deep as you comfortably can.', 'Drive back up through your whole foot.'],
    'Feet lower on the platform = more quads.', .6],
  ['g_leg_ext', 'Leg Extension', 'quads', ['quads'], [], 'machine', ['machine'], 'I', 1, 'kext', 'legExt',
    ['Sit with the pad on your lower shins, knees in line with the machine pivot.', 'Straighten your legs fully and squeeze.', 'Lower slowly.'],
    'Hold the top for a second; control the lowering.', .3],
  ['g_lunge', 'Dumbbell Walking Lunge', 'quads', ['quads', 'glutes'], ['hamstrings', 'adductors'], 'dumbbell', ['dumbbell'], 'C', 1, 'lunge', 'lunge',
    ['Hold dumbbells at your sides and take a long step forward.', 'Lower until your back knee nearly touches the floor.', 'Push off the front foot and step through into the next lunge.'],
    'Front knee follows the toes; torso tall.', .12],
  ['g_bss_db', 'Dumbbell Bulgarian Split Squat', 'quads', ['quads', 'glutes'], ['adductors'], 'dumbbell', ['dumbbell', 'bench'], 'C', 2, 'lunge', 'bulgarian',
    ['Back foot on a bench, front foot a long step ahead, dumbbells at your sides.', 'Lower straight down until your front thigh is about parallel.', 'Drive up through the front heel.'],
    'Tough but very effective — start light.', .1],
  ['g_step_up', 'Dumbbell Step-up', 'quads', ['quads', 'glutes'], ['hamstrings'], 'dumbbell', ['dumbbell', 'bench'], 'C', 1, 'lunge', 'stepUp',
    ['Stand facing a knee-high box or bench with dumbbells at your sides.', 'Step up and drive through the top foot until you stand tall.', 'Step down slowly with the same leg leading.'],
    'Push through the top leg; do not bounce off the bottom one.', .1],

  // Hamstrings
  ['g_rdl', 'Romanian Deadlift', 'hamstrings', ['hamstrings', 'glutes'], ['lower_back', 'grip'], 'barbell', ['barbell'], 'C', 2, 'hinge', 'rdlBar',
    ['Stand tall holding the bar at your thighs.', 'Push your hips back, knees soft, sliding the bar down your legs.', 'Stop at a strong hamstring stretch (around mid-shin) with a flat back.', 'Drive your hips forward to stand up.'],
    'It is a hip hinge, not a squat — the knees barely bend.', .5],
  ['g_db_rdl', 'Dumbbell Romanian Deadlift', 'hamstrings', ['hamstrings', 'glutes'], ['lower_back'], 'dumbbell', ['dumbbell'], 'C', 1, 'hinge', { k: 'rdlBar', impl: 'db' },
    ['Hold the dumbbells in front of your thighs.', 'Hinge back with soft knees until you feel a deep hamstring stretch.', 'Squeeze your glutes to stand up.'],
    'Keep the dumbbells close to your legs the whole way.', .2],
  ['g_lying_curl', 'Lying Leg Curl', 'hamstrings', ['hamstrings'], ['calves'], 'machine', ['machine'], 'I', 1, 'kflex', 'legCurlL',
    ['Lie face down with the pad just above your heels.', 'Curl your heels toward your glutes.', 'Lower slowly to almost straight.'],
    'Hips stay down on the bench.', .2],
  ['g_seated_curl', 'Seated Leg Curl', 'hamstrings', ['hamstrings'], [], 'machine', ['machine'], 'I', 1, 'kflex', 'legCurlS',
    ['Sit with the lower pad behind your ankles and the thigh pad locked down.', 'Pull your heels down and back under the seat.', 'Return slowly.'],
    'Lean forward slightly to stretch the hamstrings more.', .25],
  ['g_good_morning', 'Good Morning', 'hamstrings', ['hamstrings', 'lower_back'], ['glutes'], 'barbell', ['barbell', 'rack'], 'C', 3, 'hinge', 'goodMorn',
    ['Bar on your upper back, feet hip-width, knees soft.', 'Push your hips back and lower your chest toward the floor, back flat.', 'Stop at a strong stretch and drive your hips forward.'],
    'Start very light; this one is about control.', .25],

  // Glutes
  ['g_hip_thrust', 'Barbell Hip Thrust', 'glutes', ['glutes'], ['hamstrings', 'quads'], 'barbell', ['barbell', 'bench'], 'C', 2, 'thrust', 'hipThrust',
    ['Upper back on a bench, bar across your hips (use a pad).', 'Feet flat, knees bent about 90° at the top.', 'Drive your hips up until your body is a straight line from knees to shoulders.', 'Lower with control.'],
    'Chin tucked, ribs down; squeeze the glutes hard at the top.', .6],
  ['g_cable_kick', 'Cable Glute Kickback', 'glutes', ['glutes'], ['hamstrings'], 'cable', ['cable'], 'I', 1, 'gluteiso', 'glutKick',
    ['Attach an ankle strap to a low pulley and hold the frame.', 'Kick the leg straight back, squeezing the glute.', 'Return slowly without arching your lower back.'],
    'Move from the hip — not the lower back.', 0],
  ['g_hip_abd', 'Hip Abduction Machine', 'glutes', ['glute_med'], ['glutes'], 'machine', ['machine'], 'I', 1, 'abd', 'hipAbd',
    ['Sit with the pads on the outside of your knees.', 'Push your knees apart as far as you can.', 'Return slowly.'],
    'Lean forward slightly to hit more of the glutes.', 0],
  ['g_hip_add', 'Hip Adduction Machine', 'glutes', ['adductors'], [], 'machine', ['machine'], 'I', 1, 'add', 'hipAdd',
    ['Sit with the pads on the inside of your knees.', 'Squeeze your legs together.', 'Open slowly back to a stretch.'],
    'Strong adductors support your squat.', 0],
  ['g_kb_swing', 'Kettlebell Swing', 'glutes', ['glutes', 'hamstrings'], ['lower_back', 'abs', 'grip'], 'kettlebell', ['kettlebell'], 'C', 2, 'hinge', 'kbSwing',
    ['Hike the bell back between your legs with a flat back.', 'Snap your hips forward to float the bell to chest height.', 'Let it fall and hinge again as it comes back.'],
    'A hip snap, not a squat and not an arm raise.', .25],

  // Calves
  ['g_calf_machine', 'Standing Calf Raise (machine)', 'calves', ['calves'], ['soleus'], 'machine', ['machine'], 'I', 1, 'calf', 'calfMach',
    ['Shoulders under the pads, balls of your feet on the step.', 'Lower your heels to a deep stretch.', 'Rise up as high as you can and pause.'],
    'Pause at the bottom — no bouncing.', .6],
  ['g_calf_db', 'Dumbbell Calf Raise', 'calves', ['calves'], ['soleus'], 'dumbbell', ['dumbbell'], 'I', 1, 'calf', 'calfDb',
    ['Stand on a step holding a dumbbell, heels hanging off.', 'Lower your heels to a full stretch.', 'Rise onto your toes and squeeze.'],
    'Hold a rail with the free hand for balance.', .15],
  ['g_seated_calf', 'Seated Calf Raise', 'calves', ['soleus'], ['calves'], 'machine', ['machine'], 'I', 1, 'calf', 'seatCalf',
    ['Sit with the pad on your lower thighs, balls of the feet on the step.', 'Lower your heels to a stretch.', 'Push up as high as you can.'],
    'Bent knees shift the work to the soleus.', .3],

  // Core
  ['g_cable_crunch', 'Cable Crunch', 'core', ['abs'], ['obliques'], 'cable', ['cable'], 'I', 1, 'core', 'cableCrunch',
    ['Kneel facing a high pulley, rope held beside your head.', 'Curl your ribs down toward your hips.', 'Return slowly; your hips stay still.'],
    'Round the spine — it is a crunch, not a bow.', 0],
  ['g_ab_wheel', 'Ab Wheel Rollout', 'core', ['abs'], ['lats', 'hip_flexors'], 'bodyweight', [], 'C', 2, 'core', 'abWheel',
    ['Kneel holding the wheel under your shoulders.', 'Roll forward slowly, keeping your back from sagging.', 'Pull back with your abs to the start.'],
    'Only go as far as you can keep a flat back.', 0],
  ['g_woodchop', 'Cable Woodchop', 'core', ['obliques'], ['abs'], 'cable', ['cable'], 'I', 2, 'core', 'woodchop',
    ['Set a pulley high and stand side-on to it.', 'With straight arms, pull the handle down and across your body.', 'Rotate from your trunk; return slowly.'],
    'Turn the back foot as you rotate.', 0],
  ['g_crunch', 'Crunch', 'core', ['abs'], [], 'bodyweight', [], 'I', 1, 'core', 'crunch',
    ['Lie on your back, knees bent, hands lightly behind your head.', 'Curl your shoulders off the floor.', 'Lower slowly.'],
    'Do not pull on your neck.', 0],
];
const GX = {};
for (const r of GX_TABLE) {
  const [id, name, g, p, s, kit, needs, mech, lvl, pat, fig, how, cue, sr, kind] = r;
  GX[id] = { id, name, group: g, prim: p, sec: s, kit, needs, mech, lvl, pat, fig, how, cue, sr: sr || 0, kind: kind || 'reps', gym: true, load: true, fam: null };
}
GX.g_hammer.fig = { k: 'curl', impl: 'db1' };

/* ---------- Calisthenics moves in the library (muscles, equipment, pattern) ---------- */
const FAM_META = {
  vpull: { g: 'back', p: ['lats', 'biceps'], s: ['mid_back', 'rear_delt', 'grip'], needs: ['pullbar'], pat: 'vpull', mech: 'C' },
  hrow:  { g: 'back', p: ['mid_back', 'lats'], s: ['biceps', 'rear_delt'], needs: ['pullbar'], pat: 'hpull', mech: 'C' },
  hpush: { g: 'chest', p: ['chest', 'triceps'], s: ['front_delt', 'abs'], needs: [], pat: 'hpress', mech: 'C' },
  dip:   { g: 'chest', p: ['chest', 'triceps'], s: ['front_delt'], needs: ['dipbars'], pat: 'dip', mech: 'C' },
  vpush: { g: 'shoulders', p: ['front_delt', 'triceps'], s: ['upper_chest', 'traps'], needs: [], pat: 'vpress', mech: 'C' },
  squat: { g: 'quads', p: ['quads', 'glutes'], s: ['adductors', 'abs'], needs: [], pat: 'squat', mech: 'C' },
  hinge: { g: 'hamstrings', p: ['hamstrings', 'glutes'], s: ['lower_back'], needs: [], pat: 'hinge', mech: 'C' },
  core:  { g: 'core', p: ['abs'], s: ['hip_flexors', 'obliques'], needs: [], pat: 'core', mech: 'I' },
  calves:{ g: 'calves', p: ['calves'], s: ['soleus'], needs: [], pat: 'calf', mech: 'I' },
};
const EX_META = {
  dead_hang: { g: 'forearms', p: ['grip'], s: ['lats'], pat: 'carry' }, scap_pull: { p: ['lats', 'traps'], s: [] },
  diamond_pushup: { g: 'triceps', p: ['triceps'], s: ['chest'] }, bench_dip: { g: 'triceps', p: ['triceps'], s: ['chest', 'front_delt'], needs: [] },
  glute_bridge: { g: 'glutes', p: ['glutes'], s: ['hamstrings'], pat: 'thrust' }, sl_glute_bridge: { g: 'glutes', p: ['glutes'], s: ['hamstrings'], pat: 'thrust' },
  nordic_neg: { pat: 'kflex', p: ['hamstrings'], s: [] }, nordic: { pat: 'kflex', p: ['hamstrings'], s: [] },
  plank: { s: ['obliques'] }, hkr: { p: ['abs', 'hip_flexors'], s: ['grip'], needs: ['pullbar'] }, hlr: { p: ['abs', 'hip_flexors'], s: ['grip'], needs: ['pullbar'] }, ttb: { needs: ['pullbar'] },
  bulgarian: { pat: 'lunge' }, assisted_pistol: { pat: 'lunge' }, box_pistol: { pat: 'lunge' }, pistol: { pat: 'lunge' },
  sb_dip: { needs: ['pullbar'] }, pp_pushup: { p: ['front_delt', 'chest'], s: ['triceps', 'abs'] },
};
const SKILL_MUSCLES = {
  muscleup: [['lats', 'chest', 'triceps'], ['biceps', 'abs']], handstand: [['front_delt', 'abs'], ['triceps', 'traps']],
  frontlever: [['lats', 'abs'], ['mid_back', 'biceps']], planche: [['front_delt', 'chest'], ['abs', 'triceps']],
  lsit: [['abs', 'hip_flexors'], ['triceps']], pistol: [['quads', 'glutes'], ['abs']], backlever: [['lats', 'chest'], ['biceps', 'abs']], flag: [['lats', 'obliques'], ['front_delt']],
};
for (const [id, e] of Object.entries(EX)) {
  const f = FAM_META[e.fam], m = EX_META[id] || {};
  Object.assign(e, { group: m.g || f.g, prim: m.p || f.p, sec: m.s || f.s, needs: m.needs || f.needs, pat: m.pat || f.pat, mech: m.mech || f.mech, kit: 'bodyweight', lvl: Math.min(3, 1 + Math.floor(e.step / 2)), cal: true });
}
/* Bodyweight moves shown in the gym library */
const LIB_CAL = ['pullup', 'c2b_pullup', 'aus_row', 'pushup', 'diamond_pushup', 'dip', 'bench_dip', 'pike_pushup', 'squat', 'bulgarian', 'pistol', 'glute_bridge', 'nordic_neg', 'plank', 'hkr', 'hlr', 'ttb', 'calf_raise', 'dead_hang'];

function exMuscles(id) {
  const ex = getEx(id); if (!ex) return { prim: [], sec: [] };
  if (ex.skill) { const m = SKILL_MUSCLES[ex.skill] || [['abs'], []]; return { prim: m[0], sec: m[1] }; }
  return { prim: ex.prim || [], sec: ex.sec || [] };
}
/* Groups an exercise trains: primary counts a full set, secondary half */
function exGroups(id) {
  const m = exMuscles(id), o = {};
  for (const x of m.sec) o[groupOf(x)] = Math.max(o[groupOf(x)] || 0, .5);
  for (const x of m.prim) o[groupOf(x)] = 1;
  return o;
}
function libraryIds(disc = S.profile.discipline) {
  const cal = disc === 'cal' ? Object.keys(EX) : LIB_CAL;
  return [...Object.keys(GX), ...cal];
}

/* ---------- Profile helpers ---------- */
const prof = () => S.profile;
const expLv = () => EXP_LV[S.profile.experience] || 1;
const hasKit = ex => (ex.needs || []).every(n => (S.profile.equipment || []).includes(n));
const isFav = id => (S.profile.prefer || []).includes(id);
const isAvoid = id => (S.profile.avoid || []).includes(id);

/* Rep range, sets and rest for an exercise, from the goal and whether it is a big compound lift */
const REPS = {
  strength:    { C: [3, 6], I: [8, 12], restC: 180, restI: 90 },
  hypertrophy: { C: [6, 10], I: [10, 15], restC: 120, restI: 75 },
  endurance:   { C: [12, 20], I: [15, 25], restC: 60, restI: 45 },
  general:     { C: [8, 12], I: [10, 15], restC: 90, restI: 60 },
};
function gymRange(ex) {
  const R = REPS[S.profile.focus] || REPS.hypertrophy;
  if (ex.kind === 'hold') return { lo: 30, hi: 60 };
  let [lo, hi] = R[ex.mech === 'C' ? 'C' : 'I'];
  if (['lunge', 'core', 'calf'].includes(ex.pat) || ex.id === 'g_kb_swing') { lo = Math.max(lo, 8); hi = Math.max(hi, lo + 4); }   // single-leg, core and swings: never heavy triples
  return { lo, hi };
}
function gymRest(ex) { const R = REPS[S.profile.focus] || REPS.hypertrophy; return ex.mech === 'C' ? R.restC : R.restI; }
function gymSets(ex, prio = 2) {
  const lv = expLv(), f = S.profile.focus;
  let n = prio === 1 ? (lv >= 2 ? 4 : 3) : prio === 2 ? 3 : (lv >= 3 ? 3 : 2);
  if (f === 'strength' && ex.mech === 'C' && prio === 1) n += 1;
  if (f === 'endurance') n = Math.max(2, n - 1);
  return Math.min(5, n);
}

/* ---------- Loads ---------- */
const LOWER = ['squat', 'hinge', 'thrust', 'lunge', 'calf', 'kext', 'kflex', 'abd', 'add', 'carry', 'gluteiso'];
function loadStep(ex) {
  const lower = LOWER.includes(ex.pat), lv = expLv();
  if (ex.cal) return 2.5;
  if (ex.kit === 'barbell') return lower && lv === 1 && ex.mech === 'C' ? 5 : 2.5;
  if (ex.kit === 'dumbbell') return 2;
  if (ex.kit === 'kettlebell') return 4;
  if (ex.kit === 'machine') return lower && ex.mech === 'C' ? 5 : 2.5;
  return 2.5;
}
function roundLoad(ex, kg) {
  const inc = ex.kit === 'dumbbell' ? 1 : ex.kit === 'kettlebell' ? 2 : ex.cal ? 1.25 : 2.5;
  return Math.max(0, Math.round(kg / inc) * inc);
}
const e1rm = (kg, reps) => kg > 0 && reps > 0 ? kg * (1 + Math.min(reps, 15) / 30) : 0;
const RIR = { 1: '3+ left', 2: '2 left', 3: '1 left', 4: 'Failure' };
/* A cautious first-session load from bodyweight, experience and sex (never more than a starting guess) */
function startGuess(ex) {
  if (!ex.sr) return 0;
  const BW = latestWeight() || 65, lv = expLv(), upper = !LOWER.includes(ex.pat);
  let kg = BW * ex.sr * ({ 1: .75, 2: 1.1, 3: 1.35 }[lv]) * (S.profile.sex === 'f' ? (upper ? .65 : .8) : 1);
  kg = roundLoad(ex, kg);
  if (ex.kit === 'barbell' && ex.mech === 'C' && ex.pat !== 'thrust') kg = Math.max(20, kg);   // the empty bar
  return kg;
}
/* Plates on each side of a 20 kg bar */
function platesFor(kg, bar = 20) {
  let side = (kg - bar) / 2; if (side <= 0) return kg >= bar ? 'empty bar' : '';
  const out = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) while (side >= p - 1e-6) { out.push(p); side -= p; }
  return out.join(' + ') + ' a side';
}
const isDeload = () => !!(S.deload && today() <= S.deload.until);

/* ---------- Double progression for gym lifts ----------
   Every rule is explained in the returned text so the athlete can see exactly why. */
function recommendGym(key, opt = {}) {
  const ex = getEx(parseKey(key).ex), rg = opt.lo ? { lo: opt.lo, hi: opt.hi } : gymRange(ex), n = opt.sets || gymSets(ex);
  const u = ex.kind === 'hold' ? 's' : '', unit = ex.kind === 'hold' ? 'seconds' : 'reps';
  const hist = sessionsOf(key, null, 6), last = hist[0], step = loadStep(ex), why = [];
  if (!last) {
    const g = startGuess(ex), t = Math.max(rg.lo, Math.min(rg.hi, rg.hi - 2));
    return { status: 'new', targets: Array(n).fill(t), kg: g, why,
      text: `First time: ${n} × ${t}${u}. ${g ? `Cautious starting guess ≈ ${g} kg — do a lighter warm-up set first and adjust.` : 'Pick a weight you could lift about 2–3 more times than the target.'} Rate how many reps you had left; Zelum takes it from there.` };
  }
  const W = last.kg, ws = last.sets.filter(s => (s.kg || 0) === W), reps = ws.map(s => s.v), eff = last.effort || 0;
  const lastTxt = `Last: ${W ? `${W} kg × ` : ''}${last.sets.map(s => s.v).join(' · ')}${u}${eff ? ` (${RIR[eff].toLowerCase()})` : ''}`;
  const e1 = h => Math.max(0, ...h.sets.map(s => e1rm(s.kg || 0, s.v)));
  const base = Array.from({ length: n }, (_, i) => reps[i] ?? reps[reps.length - 1] ?? rg.lo);
  why.push(`Your range for this lift is ${rg.lo}–${rg.hi} ${unit} (${(FOCUS[S.profile.focus] || FOCUS.hypertrophy).name.toLowerCase()}).`);

  if (isDeload()) {
    const kg = roundLoad(ex, W * .9);
    return { status: 'deload', targets: Array(Math.max(2, n - 1)).fill(Math.min(rg.hi, Math.max(rg.lo, base[0]))), kg, why: [...why, 'Deload week: about 10% lighter and one set fewer, so fatigue drops and strength shows up.'],
      text: `${lastTxt}. Deload week → ${kg} kg, ${Math.max(2, n - 1)} easy sets. Leave 3+ reps in the tank.` };
  }
  // stalled: three exposures without a better estimated max, at hard effort
  if (hist.length >= 3 && W > 0) {
    const a = e1(hist[0]), c = e1(hist[2]), hard = hist.slice(0, 2).every(h => (h.effort || 0) >= 3);
    if (a <= c * 1.005 && e1(hist[1]) <= c * 1.005 && hard) {
      const kg = roundLoad(ex, W * .9);
      return { status: 'stall', targets: Array(n).fill(rg.lo + 1), kg, why: [...why, `Estimated max stuck around ${Math.round(c)} kg for 3 sessions at hard effort.`, 'A 10% reset lets you build momentum back with better reps.'],
        text: `${lastTxt}. Stalled 3 sessions → reset to ${kg} kg for ${n} × ${rg.lo + 1} and build back up. If it stalls again, try a substitute exercise.` };
    }
  }
  const allTop = reps.length >= n && reps.every(v => v >= rg.hi), failed = reps.filter(v => v < rg.lo).length >= Math.ceil(reps.length / 2);
  if (failed && eff >= 3) {
    const prevFailed = hist[1] && hist[1].kg === W && hist[1].sets.filter(s => s.v < rg.lo).length >= Math.ceil(hist[1].sets.length / 2);
    if (prevFailed || W === 0) {
      const kg = roundLoad(ex, W * .92);
      return { status: 'reduce', targets: Array(n).fill(rg.lo), kg, why: [...why, `Below ${rg.lo} ${unit} on most sets two sessions in a row at ${W} kg.`],
        text: `${lastTxt}. Two sessions under ${rg.lo}${u || ' reps'} → drop to ${kg} kg and own ${n} × ${rg.lo} with clean reps.` };
    }
    return { status: 'hold', targets: base.map(v => Math.max(v, rg.lo)), kg: W, why: [...why, `Under ${rg.lo} ${unit} once — repeat before changing anything.`],
      text: `${lastTxt}. Under the range once → same ${W} kg, aim for ${rg.lo}+ on every set. One bad day is not a trend.` };
  }
  if (allTop && eff !== 4) {
    let add = step * (eff === 1 ? 2 : 1);
    if (W >= 20) add = Math.min(add, Math.max(step, roundLoad(ex, W * .1)));   // never more than ~10% at once
    const kg = roundLoad(ex, W + add), big = W > 0 && (kg - W) / W > .125;
    why.push(`All ${n} sets reached ${rg.hi} ${unit}${eff ? ` with ${RIR[eff].toLowerCase()}` : ''} → double progression says add weight.`);
    return { status: 'load', targets: Array(n).fill(rg.lo), kg, why,
      text: `${lastTxt}. You hit ${rg.hi}${u || ' reps'} on every set → add ${R1n(kg - W)} kg (${kg} kg) and restart at ${n} × ${rg.lo}.${big ? ` If that jump is too much, keep ${W} kg and push to ${rg.hi + 3} reps first.` : ''}` };
  }
  if (eff === 4) return { status: 'hold', targets: base, kg: W, why: [...why, 'Last session went to failure — repeating lets you recover and own those reps.'],
    text: `${lastTxt}. That went to failure → repeat ${W} kg for the same reps with cleaner form.` };
  const plus = eff === 1 ? 2 : 1;
  const targets = eff === 3 ? (() => { const t = [...base]; const i = t.indexOf(Math.min(...t)); t[i] = Math.min(rg.hi, t[i] + 1); return t; })() : base.map(v => Math.min(rg.hi, Math.max(rg.lo, v + plus)));
  why.push(`Inside the range → add reps at the same weight until every set reaches ${rg.hi}, then the weight goes up.`);
  return { status: 'progress', targets, kg: W, why, text: `${lastTxt} → same ${W} kg, aim for ${targets.join(' · ')}${u}. At ${rg.hi} on all sets the weight goes up.` };
}
const R1n = n => Math.round(n * 100) / 100;

/* ---------- Splits & plan builder ---------- */
const SPLITS = {
  fb:    { name: 'Full Body', days: ['fbA', 'fbB', 'fbC'], best: [2, 3], blurb: 'Every muscle 2–3× a week in short sessions. Ideal for beginners and busy weeks.' },
  ul:    { name: 'Upper / Lower', days: ['upA', 'loA', 'upB', 'loB'], best: [4], blurb: 'Each muscle twice a week; balanced and easy to recover from.' },
  ppl:   { name: 'Push / Pull / Legs', days: ['push', 'pull', 'legs'], best: [3, 6], blurb: 'Groups muscles by movement. Twice a week when you train 6 days.' },
  ulppl: { name: 'Upper/Lower + PPL', days: ['upA', 'loA', 'push', 'pull', 'legs'], best: [5], blurb: 'Five days that hit everything about twice a week.' },
  bro:   { name: 'Body-part split', days: ['chestD', 'backD', 'shD', 'armD', 'legD'], best: [5], blurb: 'One muscle group a day with lots of sets. Each muscle once a week.' },
};
/* Day slots: [movement pattern, priority] — priority 1 lifts are kept even in short sessions */
const DAYS = {
  push:  { name: 'Push', icon: 'push', desc: 'Chest, shoulders, triceps', slots: [['hpress', 1], ['vpress', 1], ['ipress', 2], ['raise', 2], ['tri', 2], ['fly', 3], ['tri', 3]] },
  pull:  { name: 'Pull', icon: 'pull', desc: 'Back, rear delts, biceps', slots: [['vpull', 1], ['hpull', 1], ['rear', 2], ['curl', 2], ['hpull', 3], ['curl', 3], ['shrug', 3]] },
  legs:  { name: 'Legs', icon: 'legs', desc: 'Quads, hamstrings, glutes, calves', slots: [['squat', 1], ['hinge', 1], ['lunge', 2], ['kflex', 2], ['calf', 2], ['kext', 3], ['core', 3]] },
  upA:   { name: 'Upper A', icon: 'push', desc: 'Horizontal push & pull focus', slots: [['hpress', 1], ['hpull', 1], ['vpress', 2], ['vpull', 2], ['raise', 3], ['curl', 3], ['tri', 3]] },
  upB:   { name: 'Upper B', icon: 'pull', desc: 'Vertical pull & incline focus', slots: [['vpull', 1], ['ipress', 1], ['hpull', 2], ['raise', 2], ['rear', 3], ['tri', 3], ['curl', 3]] },
  loA:   { name: 'Lower A', icon: 'legs', desc: 'Squat focus', slots: [['squat', 1], ['hinge', 2], ['lunge', 2], ['kflex', 2], ['calf', 3], ['core', 3]] },
  loB:   { name: 'Lower B', icon: 'legs', desc: 'Hinge & glute focus', slots: [['hinge', 1], ['squat', 2], ['thrust', 2], ['kext', 2], ['calf', 3], ['core', 3]] },
  fbA:   { name: 'Full Body A', icon: 'full', desc: 'Squat · press · row', slots: [['squat', 1], ['hpress', 1], ['hpull', 1], ['vpress', 2], ['kflex', 3], ['curl', 3], ['core', 3]] },
  fbB:   { name: 'Full Body B', icon: 'full', desc: 'Hinge · pulldown · incline', slots: [['hinge', 1], ['vpull', 1], ['ipress', 1], ['lunge', 2], ['raise', 3], ['tri', 3], ['calf', 3]] },
  fbC:   { name: 'Full Body C', icon: 'full', desc: 'Lunge · press · row', slots: [['lunge', 1], ['hpress', 1], ['vpull', 1], ['thrust', 2], ['rear', 3], ['curl', 3], ['core', 3]] },
  chestD:{ name: 'Chest', icon: 'push', desc: 'Chest & triceps', slots: [['hpress', 1], ['ipress', 1], ['fly', 2], ['hpress', 2], ['tri', 3], ['fly', 3]] },
  backD: { name: 'Back', icon: 'pull', desc: 'Lats, mid back, traps', slots: [['vpull', 1], ['hpull', 1], ['hpull', 2], ['pullover', 2], ['shrug', 3], ['backext', 3]] },
  shD:   { name: 'Shoulders', icon: 'push', desc: 'Delts & traps', slots: [['vpress', 1], ['raise', 1], ['rear', 2], ['raise', 2], ['fraise', 3], ['shrug', 3]] },
  armD:  { name: 'Arms', icon: 'bolt', desc: 'Biceps, triceps, forearms', slots: [['curl', 1], ['tri', 1], ['curl', 2], ['tri', 2], ['forearm', 3], ['curl', 3]] },
  legD:  { name: 'Legs', icon: 'legs', desc: 'Quads, hamstrings, glutes, calves', slots: [['squat', 1], ['hinge', 1], ['kext', 2], ['kflex', 2], ['lunge', 2], ['calf', 3]] },
};
function autoSplit(days = S.profile.trainDays) { return days <= 3 ? (days === 3 && expLv() >= 2 ? 'fb' : 'fb') : days === 4 ? 'ul' : days === 5 ? 'ulppl' : 'ppl'; }
function planSplit() { const s = S.profile.split; return SPLITS[s] ? s : autoSplit(); }

const MAIN_PATS = ['hpress', 'ipress', 'vpress', 'hpull', 'squat', 'hinge', 'thrust'];
/* Best exercise for a slot: available equipment, level, favorites, history, variety */
function pickFor(pat, used = [], opts = {}) {
  const lv = expLv(), recent = new Set(S.workouts.slice(-30).flatMap(w => w.entries.map(e => e.ex)));
  const pool = libraryIds('gym').map(getEx).filter(ex => ex && ex.pat === pat && hasKit(ex) && !isAvoid(ex.id) && (ex.lvl || 1) <= lv + 1 && !(opts.exclude || []).includes(ex.id));
  const order = libraryIds('gym');
  const score = ex => (isFav(ex.id) ? 60 : 0) + (recent.has(ex.id) ? 18 : 0) - (used.includes(ex.id) ? 40 : 0)
    + (ex.cal ? (S.profile.discipline === 'gym' ? -6 : 4) : 0)
    + (lv === 1 && ['machine', 'dumbbell', 'cable'].includes(ex.kit) ? 6 : 0) + (lv >= 2 && ex.kit === 'barbell' && MAIN_PATS.includes(pat) ? 6 : 0)
    - ((ex.lvl || 1) > lv ? 4 : 0) - order.indexOf(ex.id) * .01;
  return pool.sort((a, b) => score(b) - score(a))[0] || null;
}
function buildDay(dayId, used) {
  const D = DAYS[dayId], mins = S.profile.sessionMin || 60, picked = [];
  D.slots.forEach(([pat, prio], i) => { const ex = pickFor(pat, [...used, ...picked.map(p => p.ex)]); if (ex) picked.push({ i, prio, ex: ex.id }); });
  // fit the session length: keep priority 1, then 2, then 3, in that order, while time allows
  let time = 6; const keep = new Set();
  for (const p of [...picked].sort((a, b) => a.prio - b.prio || a.i - b.i)) {
    const ex = getEx(p.ex), sets = gymSets(ex, p.prio), t = sets * (gymRest(ex) + 40) / 60 + 1.5;
    if (keep.size < 3 || time + t <= mins) { keep.add(p); time += t; }
  }
  const items = picked.filter(p => keep.has(p)).map(p => { const ex = getEx(p.ex), r = ex.gym ? gymRange(ex) : { lo: ex.lo, hi: ex.hi }; return { ex: p.ex, sets: gymSets(ex, p.prio), lo: r.lo, hi: r.hi, rest: gymRest(ex) }; });
  // still too long for the session? take sets off the biggest blocks (never below 2)
  const total = () => 6 + sum(items.map(it => it.sets * (it.rest + 40) / 60 + 1.5));
  while (total() > mins + 3) { const it = items.filter(x => x.sets > 2).sort((a, b) => b.sets - a.sets)[0]; if (!it) break; it.sets--; }
  items.forEach(it => used.push(it.ex));
  return { id: 'r' + uid(), name: D.name, day: dayId, icon: D.icon, desc: D.desc, plan: true, items };
}
function rebuildPlan(split = planSplit()) {
  const used = [], days = SPLITS[split].days.map(d => buildDay(d, used));
  S.routines = (S.routines || []).filter(r => !r.plan).concat(days);
  S.plan = { split, built: today(), days: days.map(r => r.id) };
  return S.plan;
}
function ensurePlan() { if (!S.plan || !(S.plan.days || []).length || !S.plan.days.every(id => routineById(id))) rebuildPlan(); return S.plan; }
const routineById = id => (S.routines || []).find(r => r.id === id);
function planRoutines() { ensurePlan(); return S.plan.days.map(routineById).filter(Boolean); }
function nextRoutine() {
  const days = planRoutines(); if (!days.length) return null;
  for (let i = S.workouts.length - 1; i >= 0; i--) { const j = S.plan.days.indexOf(S.workouts[i].routine); if (j >= 0) return days[(j + 1) % days.length]; }
  return days[0];
}
function routineMinutes(r) { return Math.round(6 + sum(r.items.map(it => { const ex = getEx(it.ex); return ex ? it.sets * ((it.rest || 90) + 40) / 60 + 1.5 : 0; }))); }

/* Substitutes: same movement pattern first, then same main muscle; only what your equipment allows */
function substitutes(id, n = 6) {
  const ex = getEx(id); if (!ex) return [];
  const main = exMuscles(id).prim.map(groupOf);
  return libraryIds('gym').filter(x => x !== id).map(getEx).filter(x => x && hasKit(x) && !isAvoid(x.id) && !x.skill)
    .map(x => ({ x, s: (x.pat === ex.pat ? 10 : 0) + (exMuscles(x.id).prim.map(groupOf).some(g => main.includes(g)) ? 4 : 0) + (x.group === ex.group ? 2 : 0) + (x.mech === ex.mech ? 1 : 0) + (isFav(x.id) ? 1 : 0) }))
    .filter(o => o.s >= 6).sort((a, b) => b.s - a.s).slice(0, n).map(o => o.x.id);
}

/* ---------- Records ---------- */
function exRecords() {
  const map = {};
  for (const w of S.workouts) for (const e of w.entries) {
    const ex = getEx(e.ex); if (!ex || ex.skill) continue;
    const k = entryKey(e), r = map[k] || (map[k] = { key: k, ex: e.ex, last: w.date, sessions: 0, best: null, kg: 0, e1: 0, e1date: '', kgdate: '' });
    r.sessions++; if (w.date > r.last) r.last = w.date;
    for (const s of doneSets(e)) {
      const kg = s.kg || 0, est = ex.gym && ex.kind !== 'hold' ? e1rm(kg, s.v) : 0;
      if (!r.best || s.v > r.best.v || (s.v === r.best.v && kg > r.best.kg)) if (!ex.gym || ex.kind === 'hold') r.best = { v: s.v, kg, date: w.date };
      if (ex.gym && ex.kind !== 'hold' && (!r.best || est > e1rm(r.best.kg, r.best.v))) r.best = { v: s.v, kg, date: w.date };
      if (kg > r.kg) { r.kg = kg; r.kgdate = w.date; }
      if (est > r.e1) { r.e1 = est; r.e1date = w.date; }
    }
  }
  return Object.values(map).sort((a, b) => b.last.localeCompare(a.last));
}
/* Best estimated 1RM per session for a lift (oldest first) — feeds the progress chart */
function e1Series(key, limit = 16) {
  return sessionsOf(key, null, limit).reverse().map(s => ({ date: s.date, v: Math.max(0, ...s.sets.map(x => e1rm(x.kg || 0, x.v))), reps: Math.max(...s.sets.map(x => x.v)) }));
}
