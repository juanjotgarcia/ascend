/* LEDGER — exercise illustrations, drawn as SVG.
   A capsule mannequin (shaded limbs, glossy head) posed by joint angles, with glass equipment:
   bars, benches, barbells, dumbbells, kettlebells, cable towers, machines.
   Small tiles show the start position as a faint ghost and the finish solid; the big guide view
   animates the real movement (SVG <animate>, no script loop), easing through the concentric and
   lowering more slowly. Colors come from the theme (--accent → --accent2). */

const SEG = { torso: 38, neck: 5, head: 9.5, ua: 22, fa: 21, th: 29, sh: 28, foot: 9, hd: 7 };
const W = { torso: 13, th: 11, sh: 9, ua: 8, fa: 7, foot: 6, hd: 5 };
const rad = d => d * Math.PI / 180;
const step2 = (p, a, len) => [p[0] + len * Math.cos(rad(a)), p[1] + len * Math.sin(rad(a))];
const lerp = (a, b, k) => a + (b - a) * k;

/* Angles in degrees, screen space: 0 = right, 90 = down, -90 = up. Figure faces right.
   t = hip→shoulder, h = head direction, ua/fa = upper arm / forearm, th/sh = thigh / shin, ft = foot,
   hd = hand (wrist work), *2 = far-side limb. ual/fal/thl/shl shorten a segment that points toward
   the viewer (foreshortening), so arms moving out to the side still read in a side view. */
const LEGS = { th: 90, sh: 90, th2: 92, sh2: 90 };
const SEAT = { th: 0, sh: 90, th2: 4, sh2: 92, ft: 0, ft2: 0 };
const BLEGS = { th: 160, sh: 112, ft: 180, th2: 156, sh2: 116, ft2: 180 };   // lying on a bench, feet on the floor
const POSE = {
  stand:     { t: -90, ua: 92, fa: 90, ua2: 88, fa2: 90, th: 90, sh: 90, th2: 92, sh2: 90 },
  hang:      { t: -90, ua: -93, fa: -90, ua2: -87, fa2: -90, th: 95, sh: 98, th2: 88, sh2: 95 },
  pullTop:   { t: -84, ua: 72, fa: -98, ua2: 66, fa2: -102, th: 104, sh: 88, th2: 96, sh2: 84 },
  supportTop:{ t: -82, ua: 94, fa: 93, ua2: 90, fa2: 91, th: 100, sh: 104, th2: 95, sh2: 98 },
  rowLow:    { t: -163, ua: -72, fa: -74, ua2: -68, fa2: -70, th: 14, sh: 14, th2: 12, sh2: 12 },
  rowHigh:   { t: -158, ua: 42, fa: -62, ua2: 48, fa2: -57, th: 18, sh: 18, th2: 16, sh2: 16 },
  pushTop:   { t: -14, ua: 86, fa: 90, ua2: 84, fa2: 90, th: 168, sh: 170, th2: 166, sh2: 170 },
  pushLow:   { t: -4, ua: 152, fa: 62, ua2: 148, fa2: 60, th: 174, sh: 176, th2: 172, sh2: 176 },
  inclTop:   { t: -38, ua: 70, fa: 72, ua2: 68, fa2: 70, th: 144, sh: 146, th2: 142, sh2: 146 },
  inclLow:   { t: -30, ua: 140, fa: 40, ua2: 136, fa2: 38, th: 150, sh: 152, th2: 148, sh2: 152 },
  declTop:   { t: 6, ua: 96, fa: 98, ua2: 94, fa2: 98, th: 188, sh: 188, th2: 186, sh2: 188 },
  lean:      { t: -20, h: -14, ua: 112, fa: 110, ua2: 108, fa2: 106, th: 172, sh: 174, th2: 170, sh2: 174 },
  pikeTop:   { t: 58, h: 70, ua: 96, fa: 96, ua2: 94, fa2: 94, th: 122, sh: 122, th2: 120, sh2: 120 },
  pikeLow:   { t: 66, h: 84, ua: 150, fa: 58, ua2: 148, fa2: 56, th: 118, sh: 118, th2: 116, sh2: 116 },
  hs:        { t: 90, h: 90, ua: 90, fa: 90, ua2: 88, fa2: 90, th: -90, sh: -90, th2: -86, sh2: -88 },
  hsLow:     { t: 90, h: 96, ua: 150, fa: 44, ua2: 146, fa2: 42, th: -90, sh: -90, th2: -86, sh2: -88 },
  dipTop:    { t: -88, ua: 93, fa: 92, ua2: 90, fa2: 90, th: 100, sh: 150, th2: 96, sh2: 145 },
  dipLow:    { t: -74, ua: 152, fa: 86, ua2: 148, fa2: 82, th: 110, sh: 160, th2: 105, sh2: 155 },
  bdipTop:   { t: -84, ua: 102, fa: 96, ua2: 98, fa2: 94, th: 6, sh: 88, th2: 4, sh2: 88 },
  bdipLow:   { t: -78, ua: 150, fa: 82, ua2: 146, fa2: 80, th: 22, sh: 82, th2: 20, sh2: 82 },
  squatLow:  { t: -55, ua: -4, fa: -4, ua2: -8, fa2: -8, th: 8, sh: 105, th2: 12, sh2: 108 },
  armsFwd:   { t: -90, ua: 6, fa: 2, ua2: 4, fa2: 0, th: 90, sh: 90, th2: 92, sh2: 90 },
  splitTop:  { t: -88, ua: 94, fa: 90, ua2: 90, fa2: 90, th: 86, sh: 92, th2: 118, sh2: 150, ft2: 178 },
  splitLow:  { t: -80, ua: 96, fa: 90, ua2: 92, fa2: 90, th: 20, sh: 100, th2: 108, sh2: 176, ft2: 178 },
  pistolTop: { t: -90, ua: 4, fa: 0, ua2: 2, fa2: -2, th: 90, sh: 90, th2: 62, sh2: 66 },
  pistolLow: { t: -48, ua: -10, fa: -10, ua2: -14, fa2: -14, th: 4, sh: 112, th2: -8, sh2: -4 },
  bridgeLow: { t: 178, h: 180, ua: 4, fa: 4, ua2: 2, fa2: 2, th: -42, sh: 82, th2: -40, sh2: 84 },
  bridgeTop: { t: 158, h: 168, ua: 20, fa: 4, ua2: 18, fa2: 2, th: -18, sh: 92, th2: -16, sh2: 94 },
  rdlLow:    { t: -8, h: -4, ua: 92, fa: 90, ua2: 88, fa2: 90, th: 92, sh: 90, th2: 176, sh2: 178 },
  kneel:     { t: -90, ua: 80, fa: 70, ua2: 84, fa2: 74, th: 90, sh: 180, th2: 92, sh2: 180, ft: 90, ft2: 90 },
  kneelLean: { t: -36, ua: 40, fa: 30, ua2: 44, fa2: 34, th: 144, sh: 180, th2: 146, sh2: 180, ft: 90, ft2: 90 },
  plank:     { t: -10, ua: 90, fa: 0, ua2: 88, fa2: -2, th: 172, sh: 174, th2: 170, sh2: 174 },
  hangLegs:  { t: -92, ua: -90, fa: -90, ua2: -86, fa2: -88, th: -4, sh: -4, th2: -8, sh2: -8 },
  hangKnees: { t: -90, ua: -90, fa: -90, ua2: -86, fa2: -88, th: -40, sh: 82, th2: -44, sh2: 80 },
  hangToes:  { t: -80, ua: -96, fa: -92, ua2: -92, fa2: -90, th: -72, sh: -76, th2: -74, sh2: -78 },
  flagLow:   { t: 168, h: 172, ua: 184, fa: 204, ua2: 180, fa2: 200, th: -8, sh: -8, th2: -10, sh2: -10 },
  flagHigh:  { t: 122, h: 128, ua: 184, fa: 210, ua2: 180, fa2: 206, th: -58, sh: -58, th2: -60, sh2: -60 },
  lsit:      { t: -90, ua: 92, fa: 90, ua2: 88, fa2: 90, th: 0, sh: 0, th2: -3, sh2: -3 },
  lsitTuck:  { t: -90, ua: 92, fa: 90, ua2: 88, fa2: 90, th: -38, sh: 88, th2: -40, sh2: 86 },
  fl:        { t: 180, h: 180, ua: -62, fa: -62, ua2: -58, fa2: -58, th: 0, sh: 0, th2: -2, sh2: -2 },
  flTuck:    { t: 180, h: 180, ua: -62, fa: -62, ua2: -58, fa2: -58, th: -125, sh: 5, th2: -123, sh2: 7 },
  flTuckPull:{ t: 180, h: 180, ua: 40, fa: -112, ua2: 44, fa2: -108, th: -125, sh: 5, th2: -123, sh2: 7 },
  flAdv:     { t: 180, h: 180, ua: -62, fa: -62, ua2: -58, fa2: -58, th: -90, sh: 0, th2: -88, sh2: 2 },
  flOne:     { t: 180, h: 180, ua: -62, fa: -62, ua2: -58, fa2: -58, th: 0, sh: 0, th2: -90, sh2: 0 },
  bl:        { t: 180, h: 176, ua: -36, fa: -36, ua2: -32, fa2: -32, th: 0, sh: 0, th2: -2, sh2: -2 },
  blTuck:    { t: 180, h: 176, ua: -36, fa: -36, ua2: -32, fa2: -32, th: 125, sh: -5, th2: 123, sh2: -7 },
  planche:   { t: -4, h: -2, ua: 110, fa: 105, ua2: 106, fa2: 102, th: 182, sh: 182, th2: 180, sh2: 180 },
  plTuck:    { t: -10, h: -6, ua: 104, fa: 100, ua2: 100, fa2: 98, th: 52, sh: 178, th2: 50, sh2: 176 },
  plAdv:     { t: -6, h: -4, ua: 108, fa: 104, ua2: 104, fa2: 100, th: 92, sh: 178, th2: 90, sh2: 176 },
  frog:      { t: -24, h: -14, ua: 98, fa: 96, ua2: 94, fa2: 94, th: 34, sh: 158, th2: 32, sh2: 156 },
  flag:      { t: 180, h: 180, ua: -125, fa: -125, ua2: 125, fa2: 125, th: 0, sh: 0, th2: -4, sh2: -4 },
  flagTuck:  { t: 180, h: 180, ua: -125, fa: -125, ua2: 125, fa2: 125, th: -60, sh: 30, th2: -62, sh2: 28 },
  calfTop:   { t: -90, ua: 92, fa: 90, ua2: 88, fa2: 90, th: 90, sh: 90, th2: 92, sh2: 90, ft: 50, ft2: 50 },

  /* ---- Gym: standing ---- */
  curlDown:  { t: -90, ua: 94, fa: 96, ua2: 90, fa2: 94, ...LEGS },
  curlUp:    { t: -90, ua: 98, fa: -64, ua2: 94, fa2: -60, ...LEGS },
  pdTop:     { t: -80, h: -84, ua: 98, fa: -14, ua2: 94, fa2: -10, th: 86, sh: 94, th2: 96, sh2: 92 },
  pdLow:     { t: -80, h: -84, ua: 94, fa: 88, ua2: 90, fa2: 86, th: 86, sh: 94, th2: 96, sh2: 92 },
  ohxLow:    { t: -90, ua: -96, fa: 120, ua2: -94, fa2: 122, ...LEGS },
  ohxTop:    { t: -90, ua: -84, fa: -86, ua2: -82, fa2: -86, ...LEGS },
  frTop:     { t: -90, ua: -2, fa: -4, ua2: 2, fa2: 0, ...LEGS },
  ohpRack:   { t: -88, ua: 66, fa: -100, ua2: 62, fa2: -102, ...LEGS },
  ohpTop:    { t: -90, ua: -86, fa: -88, ua2: -84, fa2: -88, ...LEGS },
  spTop:     { t: -72, h: -76, ua: -42, fa: -40, ua2: -38, fa2: -36, th: 84, sh: 96, th2: 94, sh2: 96 },
  spLow:     { t: -72, h: -76, ua: 98, fa: 98, ua2: 94, fa2: 94, th: 84, sh: 96, th2: 94, sh2: 96 },
  fpStart:   { t: -86, ua: -6, fa: -4, ua2: -2, fa2: 0, th: 80, sh: 94, th2: 102, sh2: 96 },
  fpEnd:     { t: -88, ua: 180, ual: .45, fa: -66, ua2: 176, fa2: -62, th: 80, sh: 94, th2: 102, sh2: 96 },
  brHang:    { t: -26, h: -18, ua: 92, fa: 93, ua2: 88, fa2: 91, th: 66, sh: 104, th2: 70, sh2: 106, ft: 0, ft2: 0 },
  brTop:     { t: -26, h: -18, ua: -168, fa: 98, ua2: -164, fa2: 100, th: 66, sh: 104, th2: 70, sh2: 106, ft: 0, ft2: 0 },
  dlLow:     { t: -30, h: -16, ua: 91, fa: 93, ua2: 89, fa2: 91, th: 26, sh: 102, th2: 30, sh2: 104, ft: 0, ft2: 0 },
  dlTop:     { t: -90, ua: 92, fa: 92, ua2: 88, fa2: 90, ...LEGS, ft: 0, ft2: 0 },
  rdlB:      { t: -16, h: -10, ua: 92, fa: 92, ua2: 88, fa2: 90, th: 80, sh: 98, th2: 84, sh2: 98, ft: 0, ft2: 0 },
  gmTop:     { t: -90, ...LEGS, ft: 0, ft2: 0 },
  gmLow:     { t: -12, h: -6, th: 82, sh: 96, th2: 86, sh2: 96, ft: 0, ft2: 0 },
  sqTop:     { t: -88, ...LEGS, ft: 0, ft2: 0 },
  sqLow:     { t: -46, h: -60, th: 12, sh: 112, th2: 16, sh2: 114, ft: 0, ft2: 0 },
  fsqLow:    { t: -62, h: -76, th: 8, sh: 116, th2: 12, sh2: 118, ft: 0, ft2: 0 },
  lgTop:     { t: -90, ua: 92, fa: 92, ua2: 88, fa2: 90, th: 82, sh: 94, th2: 102, sh2: 98, ft: 0, ft2: 40 },
  lgLow:     { t: -88, ua: 92, fa: 92, ua2: 88, fa2: 90, th: 8, sh: 96, th2: 112, sh2: 174, ft: 0, ft2: 60 },
  suLow:     { t: -76, h: -80, ua: 94, fa: 94, ua2: 90, fa2: 92, th: 4, sh: 104, th2: 104, sh2: 94, ft: 0, ft2: 0 },
  suTop:     { t: -90, ua: 92, fa: 92, ua2: 88, fa2: 90, th: 90, sh: 90, th2: 10, sh2: 98, ft: 0, ft2: 30 },
  kbLow:     { t: -34, h: -20, ua: 112, fa: 120, ua2: 108, fa2: 116, th: 52, sh: 102, th2: 56, sh2: 104, ft: 0, ft2: 0 },
  kbTop:     { t: -90, ua: -6, fa: -6, ua2: -2, fa2: -4, ...LEGS, ft: 0, ft2: 0 },
  gkA:       { t: -58, h: -44, ua: 6, fa: 4, ua2: 2, fa2: 2, th: 96, sh: 96, th2: 90, sh2: 90, ft: 0, ft2: 0 },
  gkB:       { t: -58, h: -44, ua: 6, fa: 4, ua2: 2, fa2: 2, th: 158, sh: 164, th2: 90, sh2: 90, ft2: 0 },
  farmA:     { t: -90, ua: 92, fa: 92, ua2: 88, fa2: 90, th: 74, sh: 96, th2: 108, sh2: 98, ft: 0, ft2: 20 },
  farmB:     { t: -90, ua: 92, fa: 92, ua2: 88, fa2: 90, th: 108, sh: 98, th2: 74, sh2: 96, ft: 20, ft2: 0 },

  /* ---- Gym: lying on a bench (head to the right) ---- */
  bpTop:     { t: 0, h: 4, ua: -88, fa: -90, ua2: -86, fa2: -90, ...BLEGS },
  bpLow:     { t: 0, h: 4, ua: 114, fa: -80, ua2: 110, fa2: -82, ...BLEGS },
  ibpTop:    { t: -30, h: -26, ua: -94, fa: -91, ua2: -92, fa2: -90, th: 172, sh: 104, ft: 180, th2: 168, sh2: 108, ft2: 180 },
  ibpLow:    { t: -30, h: -26, ua: 98, fa: -76, ua2: 94, fa2: -78, th: 172, sh: 104, ft: 180, th2: 168, sh2: 108, ft2: 180 },
  skTop:     { t: 0, h: 4, ua: -94, fa: -94, ua2: -92, fa2: -92, ...BLEGS },
  skLow:     { t: 0, h: 4, ua: -80, fa: 36, ua2: -78, fa2: 38, ...BLEGS },
  icA:       { t: -58, h: -52, ua: 94, fa: 94, ua2: 90, fa2: 92, th: 170, sh: 98, ft: 180, th2: 166, sh2: 100, ft2: 180 },
  icB:       { t: -58, h: -52, ua: 96, fa: -116, ua2: 92, fa2: -112, th: 170, sh: 98, ft: 180, th2: 166, sh2: 100, ft2: 180 },
  htLow:     { t: -152, h: -160, th: -32, sh: 78, th2: -28, sh2: 80, ft: 0, ft2: 0 },
  htTop:     { t: 178, h: 176, th: -2, sh: 92, th2: 2, sh2: 94, ft: 0, ft2: 0 },
  crA:       { t: 0, h: 0, th: -126, sh: 118, ft: 180, th2: -122, sh2: 120, ft2: 180 },
  crB:       { t: -30, h: -50, th: -126, sh: 118, ft: 180, th2: -122, sh2: 120, ft2: 180 },
  /* prone, face down (head right) */
  lcA:       { t: 0, h: 12, ua: 106, fa: 66, ua2: 102, fa2: 68, th: 180, sh: 180, ft: 100, th2: 178, sh2: 178, ft2: 100 },
  lcB:       { t: 0, h: 12, ua: 106, fa: 66, ua2: 102, fa2: 68, th: 180, sh: -66, th2: 178, sh2: -62 },
  beA:       { t: 84, h: 96, ua: 100, fa: 100, ua2: 96, fa2: 96, th: 136, sh: 136, th2: 134, sh2: 134, ft: 46, ft2: 44 },
  beB:       { t: -44, h: -40, ua: 140, fa: -80, ua2: 136, fa2: -78, th: 136, sh: 136, th2: 134, sh2: 134, ft: 46, ft2: 44 },

  /* ---- Gym: seated ---- */
  sohpLow:   { t: -90, ua: 92, ual: .42, fa: -90, ua2: 88, fa2: -90, ...SEAT },
  sohpTop:   { t: -90, ua: -86, fa: -88, ua2: -84, fa2: -88, ...SEAT },
  cpLow:     { t: -88, ua: 168, fa: 4, ua2: 164, fa2: 6, ...SEAT },
  cpTop:     { t: -88, ua: 2, fa: 0, ua2: 0, fa2: -2, ...SEAT },
  mrA:       { t: -82, h: -86, ua: -2, fa: 0, ua2: -4, fa2: 0, ...SEAT },
  mrB:       { t: -84, h: -88, ua: 166, fa: 8, ua2: 162, fa2: 10, ...SEAT },
  leA:       { t: -98, h: -92, ua: 76, fa: 30, ua2: 72, fa2: 28, th: 0, sh: 92, th2: 2, sh2: 94, ft: 0, ft2: 0 },
  leB:       { t: -98, h: -92, ua: 76, fa: 30, ua2: 72, fa2: 28, th: 0, sh: 4, th2: 2, sh2: 6, ft: -86, ft2: -84 },
  scA:       { t: -98, h: -92, ua: 76, fa: 30, ua2: 72, fa2: 28, th: 0, sh: 4, th2: 2, sh2: 6, ft: -86, ft2: -84 },
  scB:       { t: -98, h: -92, ua: 76, fa: 30, ua2: 72, fa2: 28, th: 0, sh: 104, th2: 2, sh2: 106, ft: 10, ft2: 10 },
  ccA:       { t: -44, h: -26, ua: 84, fa: 92, ua2: 116, fa2: 58, th: 0, sh: 92, th2: -6, sh2: 94, ft: 0, ft2: 0 },
  ccB:       { t: -44, h: -26, ua: 84, fa: -112, ua2: 116, fa2: 58, th: 0, sh: 92, th2: -6, sh2: 94, ft: 0, ft2: 0 },
  prA:       { t: -74, h: -70, ua: 42, fa: 44, ua2: 38, fa2: 42, ...SEAT },
  prB:       { t: -74, h: -70, ua: 42, fa: -66, ua2: 38, fa2: -62, ...SEAT },
  wcA:       { t: -60, h: -50, ua: 64, fa: 4, ua2: 60, fa2: 6, hd: 62, hd2: 60, ...SEAT },
  wcB:       { t: -60, h: -50, ua: 64, fa: 4, ua2: 60, fa2: 6, hd: -42, hd2: -40, ...SEAT },
  scalfA:    { t: -90, ua: 68, fa: 2, ua2: 64, fa2: 4, ...SEAT, ft: 4, ft2: 4 },
  scalfB:    { t: -90, ua: 68, fa: 2, ua2: 64, fa2: 4, ...SEAT, ft: 40, ft2: 40 },
  crwA:      { t: -60, h: -52, ua: 2, fa: 0, ua2: 0, fa2: 0, th: -8, sh: 8, th2: -6, sh2: 10, ft: -84, ft2: -82 },
  crwB:      { t: -94, h: -90, ua: 166, fa: 10, ua2: 162, fa2: 12, th: -8, sh: 8, th2: -6, sh2: 10, ft: -84, ft2: -82 },
  lpA:       { t: -150, h: -148, ua: 66, fa: 14, ua2: 62, fa2: 16, th: -66, sh: 34, th2: -64, sh2: 36, ft: -56, ft2: -54 },
  lpB:       { t: -150, h: -148, ua: 66, fa: 14, ua2: 62, fa2: 16, th: -38, sh: -38, th2: -36, sh2: -36, ft: -128, ft2: -126 },
  hkA:       { t: -112, h: -104, ua: 160, fa: -60, ua2: 156, fa2: -58, th: 72, sh: 102, th2: 76, sh2: 104, ft: 4, ft2: 4 },
  hkB:       { t: -116, h: -108, ua: 160, fa: -60, ua2: 156, fa2: -58, th: -8, sh: 122, th2: -4, sh2: 124, ft: 4, ft2: 4 },

  /* ---- Gym: kneeling / floor ---- */
  cxA:       { t: -76, h: -60, th: 92, sh: 180, th2: 94, sh2: 180, ft: 96, ft2: 96 },
  cxB:       { t: -14, h: 34, th: 104, sh: 180, th2: 106, sh2: 180, ft: 96, ft2: 96 },
  awA:       { t: -44, h: -30, ua: 88, fa: 90, ua2: 86, fa2: 90, th: 96, sh: 180, th2: 98, sh2: 180, ft: 96, ft2: 96 },
  awB:       { t: -10, h: -4, ua: -4, fa: -2, ua2: -6, fa2: -4, th: 154, sh: 180, th2: 156, sh2: 180, ft: 96, ft2: 96 },
};

/* Exercise archetypes: equipment, anchoring, start (a) and finish (b) poses.
   anchor: 'hands' (hands fixed on a bar) | 'floor' (lowest point on the ground) · pin: [joint, x, y] fixes
   one joint (benches, seats, machines; the floor is y = 0). impl: what the hands hold — bb barbell,
   db dumbbell, kb kettlebell, handle (cable), wheel; at: 'hand' or a point on the torso {j, al, pp}
   (along / perpendicular to the spine). grab: elbow direction when the hands reach for that point. */
const ARCH = {
  hang:      { eq: ['bar'], anchor: 'hands', b: 'hang' },
  scap:      { eq: ['bar'], anchor: 'hands', a: 'hang', b: 'pullTop', mix: 0.18 },
  pull:      { eq: ['bar'], anchor: 'hands', a: 'hang', b: 'pullTop' },
  muscleup:  { eq: ['bar'], anchor: 'hands', a: 'pullTop', b: 'supportTop' },
  row:       { eq: ['bar', 'floor'], anchor: 'hands', a: 'rowLow', b: 'rowHigh' },
  pushup:    { eq: ['floor'], anchor: 'floor', a: 'pushTop', b: 'pushLow' },
  incline:   { eq: ['floor', 'box:hand'], anchor: 'floor', align: 'toe', a: 'inclTop', b: 'inclLow' },
  decline:   { eq: ['floor', 'box:toe'], anchor: 'floor', align: 'hand', a: 'declTop', b: 'pushLow' },
  lean:      { eq: ['floor'], anchor: 'floor', a: 'pushTop', b: 'lean' },
  pike:      { eq: ['floor'], anchor: 'floor', a: 'pikeTop', b: 'pikeLow' },
  hs:        { eq: ['floor', 'wall'], anchor: 'floor', align: 'hand', a: 'hs', b: 'hsLow' },
  hsHold:    { eq: ['floor'], anchor: 'floor', align: 'hand', b: 'hs' },
  dip:       { eq: ['pbars'], anchor: 'hands', a: 'dipTop', b: 'dipLow' },
  benchdip:  { eq: ['floor', 'box:hand'], anchor: 'floor', align: 'toe', a: 'bdipTop', b: 'bdipLow' },
  squat:     { eq: ['floor'], anchor: 'floor', a: 'armsFwd', b: 'squatLow' },
  split:     { eq: ['floor', 'box:toe2'], anchor: 'floor', a: 'splitTop', b: 'splitLow' },
  pistol:    { eq: ['floor'], anchor: 'floor', a: 'pistolTop', b: 'pistolLow' },
  bridge:    { eq: ['floor'], anchor: 'floor', align: 'head', a: 'bridgeLow', b: 'bridgeTop' },
  rdl:       { eq: ['floor'], anchor: 'floor', a: 'stand', b: 'rdlLow' },
  nordic:    { eq: ['floor'], anchor: 'floor', align: 'knee', a: 'kneel', b: 'kneelLean' },
  plank:     { eq: ['floor'], anchor: 'floor', b: 'plank' },
  hkr:       { eq: ['bar'], anchor: 'hands', a: 'hang', b: 'hangKnees' },
  hlr:       { eq: ['bar'], anchor: 'hands', a: 'hang', b: 'hangLegs' },
  ttb:       { eq: ['bar'], anchor: 'hands', a: 'hang', b: 'hangToes' },
  dflag:     { eq: ['box:sh'], anchor: 'hands', a: 'flagLow', b: 'flagHigh' },
  lsit:      { eq: ['pbars'], anchor: 'hands', b: 'lsit' },
  lsitTuck:  { eq: ['pbars'], anchor: 'hands', b: 'lsitTuck' },
  fl:        { eq: ['bar'], anchor: 'hands', b: 'fl' },
  flTuck:    { eq: ['bar'], anchor: 'hands', b: 'flTuck' },
  flAdv:     { eq: ['bar'], anchor: 'hands', b: 'flAdv' },
  flOne:     { eq: ['bar'], anchor: 'hands', b: 'flOne' },
  flRow:     { eq: ['bar'], anchor: 'hands', a: 'flTuck', b: 'flTuckPull' },
  bl:        { eq: ['bar'], anchor: 'hands', b: 'bl' },
  blTuck:    { eq: ['bar'], anchor: 'hands', b: 'blTuck' },
  planche:   { eq: ['floor'], anchor: 'floor', align: 'hand', b: 'planche' },
  plTuck:    { eq: ['floor'], anchor: 'floor', align: 'hand', b: 'plTuck' },
  plAdv:     { eq: ['floor'], anchor: 'floor', align: 'hand', b: 'plAdv' },
  frog:      { eq: ['floor'], anchor: 'floor', align: 'hand', b: 'frog' },
  flag:      { eq: ['pole'], anchor: 'hands', b: 'flag' },
  flagTuck:  { eq: ['pole'], anchor: 'hands', b: 'flagTuck' },
  calf:      { eq: ['floor', 'box:toe'], anchor: 'floor', a: 'stand', b: 'calfTop' },

  /* ---- Gym ---- */
  bench:     { pin: ['hip', 0, -35], a: 'bpTop', b: 'bpLow', impl: 'bb', eq: [{ k: 'bench', a: 'hip', b: 'sh', ext: [-14, 10] }, { k: 'floor' }] },
  incBench:  { pin: ['hip', 0, -33], a: 'ibpTop', b: 'ibpLow', impl: 'bb', eq: [{ k: 'back', a: 'hip', b: 'sh', ext: [-2, 6] }, { k: 'seat', at: 'hip', w: 26 }, { k: 'floor' }] },
  skull:     { pin: ['hip', 0, -35], a: 'skTop', b: 'skLow', impl: 'bb', eq: [{ k: 'bench', a: 'hip', b: 'sh', ext: [-14, 10] }, { k: 'floor' }] },
  incCurl:   { pin: ['hip', 0, -33], a: 'icA', b: 'icB', impl: 'db', eq: [{ k: 'back', a: 'hip', b: 'sh', ext: [-2, 4] }, { k: 'seat', at: 'hip', w: 26 }, { k: 'floor' }] },
  curl:      { anchor: 'floor', a: 'curlDown', b: 'curlUp', impl: 'bb', eq: ['floor'] },
  cableCurl: { anchor: 'floor', a: 'curlDown', b: 'curlUp', impl: 'handle', eq: ['floor', { k: 'cable', from: [34, -6], to: 'hand' }] },
  preacher:  { pin: ['hip', 0, -34], a: 'prA', b: 'prB', impl: 'bb', eq: [{ k: 'pad', a: 'sh', b: 'el', off: 7, side: 1, ext: [-4, 6], legs: true }, { k: 'seat', at: 'hip', w: 22 }, { k: 'floor' }] },
  concCurl:  { pin: ['hip', 0, -34], a: 'ccA', b: 'ccB', impl: 'db', eq: [{ k: 'seat', at: 'hip', w: 30 }, { k: 'floor' }] },
  pushdown:  { anchor: 'floor', a: 'pdTop', b: 'pdLow', impl: 'handle', eq: ['floor', { k: 'cable', from: [30, -108], to: 'hand' }] },
  ohExt:     { anchor: 'floor', a: 'ohxLow', b: 'ohxTop', impl: 'db1', eq: ['floor'] },
  kickback:  { anchor: 'floor', a: 'kbkA', b: 'kbkB', impl: 'db', eq: ['floor', { k: 'box', at: 'hand2', w: 26 }] },
  wristCurl: { pin: ['hip', 0, -34], a: 'wcA', b: 'wcB', impl: 'bb', eq: [{ k: 'seat', at: 'hip', w: 26 }, { k: 'floor' }] },
  farmer:    { anchor: 'floor', a: 'farmA', b: 'farmB', impl: 'db', eq: ['floor'] },
  frontRaise:{ anchor: 'floor', a: 'curlDown', b: 'frTop', impl: 'db', eq: ['floor'] },
  ohp:       { anchor: 'floor', a: 'ohpRack', b: 'ohpTop', impl: 'bb', eq: ['floor'] },
  seatOhp:   { pin: ['hip', 0, -34], a: 'sohpLow', b: 'sohpTop', impl: 'db', eq: [{ k: 'back', a: 'hip', b: 'sh', ext: [-4, -6] }, { k: 'seat', at: 'hip', w: 26 }, { k: 'floor' }] },
  machPress: { pin: ['hip', 0, -34], a: 'sohpLow', b: 'sohpTop', impl: 'handle', eq: [{ k: 'stack', x: -34, h: 118 }, { k: 'back', a: 'hip', b: 'sh', ext: [-4, -6] }, { k: 'seat', at: 'hip', w: 26 }, { k: 'lever', from: [-30, -112], to: 'hand' }, { k: 'floor' }] },
  chestPress:{ pin: ['hip', 0, -34], a: 'cpLow', b: 'cpTop', impl: 'handle', eq: [{ k: 'stack', x: -32, h: 96 }, { k: 'back', a: 'hip', b: 'sh', ext: [-4, -4] }, { k: 'seat', at: 'hip', w: 26 }, { k: 'lever', from: [-28, -70], to: 'hand' }, { k: 'floor' }] },
  machRow:   { pin: ['hip', 0, -34], a: 'mrA', b: 'mrB', impl: 'handle', eq: [{ k: 'stack', x: 74, h: 96 }, { k: 'pad', a: 'hip', b: 'sh', off: -9, side: 1, ext: [-14, -10], fixed: true }, { k: 'seat', at: 'hip', w: 26 }, { k: 'lever', from: [70, -62], to: 'hand' }, { k: 'floor' }] },
  cableRow:  { pin: ['hip', 0, -14], a: 'crwA', b: 'crwB', impl: 'handle', eq: [{ k: 'seat', at: 'hip', w: 34, h: 9 }, { k: 'box', at: 'toe', w: 8, fixed: true }, { k: 'cable', from: [84, -12], to: 'hand' }, { k: 'floor' }] },
  straightPd:{ anchor: 'floor', a: 'spTop', b: 'spLow', impl: 'handle', eq: ['floor', { k: 'cable', from: [56, -112], to: 'hand' }] },
  facePull:  { anchor: 'floor', a: 'fpStart', b: 'fpEnd', impl: 'handle', eq: ['floor', { k: 'cable', from: [58, -92], to: 'hand' }] },
  bbRow:     { anchor: 'floor', a: 'brHang', b: 'brTop', impl: 'bb', eq: ['floor'] },
  dbRow:     { anchor: 'floor', a: 'dbrA', b: 'dbrB', impl: 'db1', eq: ['floor', { k: 'bench2', a: 'kn2', b: 'hand2' }] },
  deadlift:  { anchor: 'floor', a: 'dlLow', b: 'dlTop', impl: 'bb', eq: ['floor'] },
  rdlBar:    { anchor: 'floor', a: 'dlTop', b: 'rdlB', impl: 'bb', eq: ['floor'] },
  goodMorn:  { anchor: 'floor', a: 'gmTop', b: 'gmLow', impl: { k: 'bb', at: { j: 'sh', al: -3, pp: -8 } }, grab: 90, eq: ['floor'] },
  backSquat: { anchor: 'floor', a: 'sqTop', b: 'sqLow', impl: { k: 'bb', at: { j: 'sh', al: -3, pp: -8 } }, grab: 90, eq: ['floor'] },
  frontSquat:{ anchor: 'floor', a: 'sqTop', b: 'fsqLow', impl: { k: 'bb', at: { j: 'sh', al: -2, pp: 7 } }, grab: 0, eq: ['floor'] },
  goblet:    { anchor: 'floor', a: 'sqTop', b: 'fsqLow', impl: { k: 'db', at: { j: 'sh', al: -10, pp: 11 } }, grab: 90, eq: ['floor'] },
  lunge:     { anchor: 'floor', align: 'toe', a: 'lgTop', b: 'lgLow', impl: 'db', eq: ['floor'] },
  bulgarian: { anchor: 'floor', a: 'splitTop', b: 'splitLow', impl: 'db', eq: ['floor', 'box:toe2'] },
  stepUp:    { pin: ['toe', 0, -24], a: 'suLow', b: 'suTop', impl: 'db', eq: [{ k: 'box', at: 'toe', w: 40, fixed: true }, { k: 'floor' }] },
  legPress:  { pin: ['hip', 0, -28], a: 'lpA', b: 'lpB', eq: [{ k: 'rail', from: [-6, -14], ang: -38, len: 118 }, { k: 'back', a: 'hip', b: 'sh', ext: [-6, 4] }, { k: 'plate', at: 'an', ang: 52, len: 30, off: [3, -3] }, { k: 'base', x0: -56, x1: 70, y: -8 }, { k: 'floor' }] },
  hack:      { pin: ['toe', 30, -14], a: 'hkA', b: 'hkB', eq: [{ k: 'back', a: 'hip', b: 'sh', ext: [-10, 8], dyn: true }, { k: 'rail', from: [-50, -6], ang: -66, len: 130 }, { k: 'box', at: 'toe', w: 30, fixed: true }, { k: 'floor' }] },
  legExt:    { pin: ['hip', 0, -36], a: 'leA', b: 'leB', eq: [{ k: 'back', a: 'hip', b: 'sh', ext: [-4, -8] }, { k: 'seat', at: 'hip', w: 34 }, { k: 'roller', at: 'an', off: [4, 2], r: 5 }, { k: 'floor' }] },
  legCurlS:  { pin: ['hip', 0, -36], a: 'scA', b: 'scB', eq: [{ k: 'back', a: 'hip', b: 'sh', ext: [-4, -8] }, { k: 'seat', at: 'hip', w: 34 }, { k: 'roller', at: 'kn', off: [-6, -9], r: 5, fixed: true }, { k: 'roller', at: 'an', off: [-2, 6], r: 5 }, { k: 'floor' }] },
  legCurlL:  { pin: ['hip', 0, -38], a: 'lcA', b: 'lcB', eq: [{ k: 'bench', a: 'kn', b: 'sh', ext: [-4, 14] }, { k: 'roller', at: 'an', off: [0, -7], r: 5 }, { k: 'floor' }] },
  backExt:   { pin: ['an', -42, -14], a: 'beA', b: 'beB', eq: [{ k: 'pad', a: 'kn', b: 'hip', off: 8, side: -1, ext: [-2, 4], fixed: true }, { k: 'roller', at: 'an', off: [-3, -7], r: 4.5, fixed: true }, { k: 'rail', from: [-46, -4], ang: -42, len: 64 }, { k: 'floor' }] },
  hipThrust: { pin: ['sh', 0, -32], a: 'htLow', b: 'htTop', impl: { k: 'bb', at: { j: 'hip', al: 4, pp: 11 } }, grab: 90, eq: [{ k: 'box', at: 'sh', w: 30, off: 6, fixed: true }, { k: 'floor' }] },
  glutKick:  { anchor: 'floor', align: 'toe2', a: 'gkA', b: 'gkB', eq: ['floor', { k: 'cable', from: [48, -8], to: 'an' }, { k: 'post', x: 52, y: -112 }] },
  kbSwing:   { anchor: 'floor', a: 'kbLow', b: 'kbTop', impl: 'kb', eq: ['floor'] },
  calfDb:    { anchor: 'floor', a: 'stand', b: 'calfTop', impl: 'db', eq: ['floor', 'box:toe'] },
  calfMach:  { anchor: 'floor', a: 'stand', b: 'calfTop', eq: ['floor', 'box:toe', { k: 'roller', at: 'sh', off: [-2, -5], r: 5 }, { k: 'post', x: -26, y: -104 }] },
  seatCalf:  { pin: ['toe', 30, -12], a: 'scalfA', b: 'scalfB', eq: [{ k: 'seat', at: 'hip', w: 26, dyn: true }, { k: 'roller', at: 'kn', off: [-2, -8], r: 5 }, { k: 'box', at: 'toe', w: 18, fixed: true }, { k: 'floor' }] },
  cableCrunch:{ anchor: 'floor', align: 'kn', a: 'cxA', b: 'cxB', impl: { k: 'handle', at: { j: 'head', al: 0, pp: 0, off: [2, 7] } }, grab: 90, eq: ['floor', { k: 'cable', from: [46, -118], to: 'hand' }] },
  abWheel:   { pin: ['kn', 0, -5], a: 'awA', b: 'awB', impl: 'wheel', eq: [{ k: 'floor' }] },
  crunch:    { anchor: 'floor', align: 'hip', a: 'crA', b: 'crB', impl: { k: 'none', at: { j: 'head', off: [-4, -2] } }, grab: -90, eq: ['floor'] },
};
/* Poses that need the shared ones above */
Object.assign(POSE, {
  kbkA: { t: -16, h: -10, ua: 164, fa: 90, ua2: 92, fa2: 92, th: 92, sh: 96, th2: 80, sh2: 100, ft: 0, ft2: 0 },
  kbkB: { t: -16, h: -10, ua: 164, fa: 166, ua2: 92, fa2: 92, th: 92, sh: 96, th2: 80, sh2: 100, ft: 0, ft2: 0 },
  dbrA: { t: -12, h: -6, ua: 92, fa: 92, ua2: 84, fa2: 100, th: 100, sh: 92, th2: 92, sh2: 180, ft: 0, ft2: 90 },
  dbrB: { t: -12, h: -6, ua: -144, fa: 96, ua2: 84, fa2: 100, th: 100, sh: 92, th2: 92, sh2: 180, ft: 0, ft2: 90 },
});

const EX_FIG = {
  dead_hang: 'hang', scap_pull: 'scap', neg_pullup: 'pull', pullup: 'pull', c2b_pullup: 'pull', archer_pullup: 'pull', oap_neg: 'pull',
  incline_row: 'row', aus_row: 'row', fe_row: 'row', archer_row: 'row', tuck_fl_row: 'flRow',
  incline_pushup: 'incline', pushup: 'pushup', diamond_pushup: 'pushup', decline_pushup: 'decline', archer_pushup: 'pushup', pp_pushup: 'lean', oa_incline_pushup: 'incline',
  bench_dip: 'benchdip', neg_dip: 'dip', dip: 'dip', sb_dip: 'muscleup',
  pike_pushup: 'pike', epike_pushup: 'pike', wall_hs_neg: 'hs', wall_hspu: 'hs', deficit_hspu: 'hs',
  squat: 'squat', bulgarian: 'split', assisted_pistol: 'pistol', box_pistol: 'pistol', pistol: 'pistol',
  glute_bridge: 'bridge', sl_glute_bridge: 'bridge', sl_rdl: 'rdl', nordic_neg: 'nordic', nordic: 'nordic',
  plank: 'plank', hkr: 'hkr', hlr: 'hlr', ttb: 'ttb', df_neg: 'dflag', dragon_flag: 'dflag',
  calf_raise: 'calf', sl_calf_raise: 'calf',
};
const SKILL_FIG = {
  muscleup: ['pull', 'muscleup', 'pull', 'muscleup', 'muscleup', 'muscleup', 'muscleup'],
  handstand: ['hsHold', 'hsHold', 'hsHold', 'hsHold', 'hsHold', 'hsHold', 'hsHold'],
  frontlever: ['flTuck', 'flAdv', 'flOne', 'fl', 'fl'],
  planche: ['lean', 'frog', 'plTuck', 'plAdv', 'planche', 'planche'],
  lsit: ['lsitTuck', 'lsitTuck', 'lsitTuck', 'lsit', 'lsit', 'lsit'],
  pistol: ['pistol', 'pistol', 'pistol', 'pistol', 'pistol'],
  backlever: ['hang', 'blTuck', 'blTuck', 'bl', 'bl'],
  flag: ['flagTuck', 'flagTuck', 'flag', 'flag'],
};

/* ---------- Front view (movements out to the side: raises, flys, pulldowns, shrugs) ----------
   ra / la = screen-right / screen-left arm [upper arm, forearm] angles; la mirrors ra when omitted.
   lg = [thigh, shin] of the screen-right leg (mirrored). el lifts the shoulders (shrug).
   hands: [x, y] puts both hands on one point (elbows solved). ual/fal/thl shorten for depth. */
const FSTAND = { lg: [93, 90] }, FSEAT = { lg: [84, 90], thl: .32 };
const FPOSE = {
  latDown: { ra: [100, 96], ...FSTAND },  latUp:  { ra: [-6, -4], ...FSTAND },
  shrDown: { ra: [93, 90], ...FSTAND },   shrUp:  { ra: [93, 90], el: -6, ...FSTAND },
  urDown:  { ra: [104, 98], ...FSTAND },  urUp:   { ra: [-26, 128], ...FSTAND },
  arnA:    { ra: [100, -96], ual: .45, ...FSEAT }, arnB: { ra: [-74, -88], ...FSEAT },
  pdnA:    { ra: [-54, -78], ...FSEAT },  pdnB:   { ra: [40, -84], ...FSEAT },
  xoA:     { ra: [-24, -12], lg: [96, 90] }, xoB: { ra: [112, 124], lg: [96, 90] },
  pdkA:    { ra: [2, -90], ...FSEAT },    pdkB:   { ra: [178, -90], ual: .22, ...FSEAT },
  rpdA:    { ra: [178, 178], ual: .28, fal: .28, ...FSEAT }, rpdB: { ra: [0, 0], ...FSEAT },
  flyA:    { ra: [6, 16], lg: [92, 90] }, flyB:   { ra: [166, 176], ual: .3, fal: .3, lg: [92, 90] },
  abdA:    { ra: [96, 70], lg: [98, 90], thl: .4 }, abdB: { ra: [96, 70], lg: [36, 90], thl: .4 },
  wchA:    { hands: [30, -50], lg: [98, 88] }, wchB: { hands: [-22, -4], lg: [98, 88] },
  latCA:   { ra: [104, 102], la: [96, 120], ...FSTAND }, latCB: { ra: [-6, -2], la: [96, 120], ...FSTAND },
};
const FARCH = {
  lateral:   { a: 'latDown', b: 'latUp', impl: 'db', eq: [{ k: 'floor' }] },
  latCable:  { a: 'latCA', b: 'latCB', impl: 'handle', eq: [{ k: 'floor' }, { k: 'cable', from: [-46, -6], to: 'handR' }, { k: 'post', x: -50, y: -100 }] },
  shrug:     { a: 'shrDown', b: 'shrUp', impl: 'bbF', eq: [{ k: 'floor' }] },
  shrugDb:   { a: 'shrDown', b: 'shrUp', impl: 'db', eq: [{ k: 'floor' }] },
  upright:   { a: 'urDown', b: 'urUp', impl: 'bbF', eq: [{ k: 'floor' }] },
  arnold:    { pin: true, a: 'arnA', b: 'arnB', impl: 'db', eq: [{ k: 'fseat' }, { k: 'floor' }] },
  pulldown:  { pin: true, a: 'pdnA', b: 'pdnB', impl: 'barF', eq: [{ k: 'fseat' }, { k: 'kpad' }, { k: 'tower', y: -118 }, { k: 'floor' }] },
  crossover: { a: 'xoA', b: 'xoB', impl: 'handle', eq: [{ k: 'floor' }, { k: 'post', x: -64, y: -118 }, { k: 'post', x: 64, y: -118 }, { k: 'cable', from: [-62, -112], to: 'handL' }, { k: 'cable', from: [62, -112], to: 'handR' }] },
  pecdeck:   { pin: true, a: 'pdkA', b: 'pdkB', impl: 'none', eq: [{ k: 'fseat' }, { k: 'floor' }, { k: 'fpad' }] },
  revPec:    { pin: true, a: 'rpdA', b: 'rpdB', impl: 'handle', eq: [{ k: 'fseat' }, { k: 'floor' }] },
  fly:       { pin: true, top: true, a: 'flyA', b: 'flyB', impl: 'dbV', eq: [{ k: 'fbench' }] },
  hipAbd:    { pin: true, a: 'abdA', b: 'abdB', impl: 'none', eq: [{ k: 'fseat' }, { k: 'floor' }, { k: 'kroll', side: 1 }] },
  hipAdd:    { pin: true, a: 'abdB', b: 'abdA', impl: 'none', eq: [{ k: 'fseat' }, { k: 'floor' }, { k: 'kroll', side: -1 }] },
  woodchop:  { a: 'wchA', b: 'wchB', impl: 'handle1', eq: [{ k: 'floor' }, { k: 'post', x: 60, y: -120 }, { k: 'cable', from: [58, -112], to: 'handR' }] },
};

/* Figure spec for an exercise: calisthenics ids, skill drills "sk:<skill>:<step>", gym ids (GX in gym.js) */
function figSpec(exId) {
  const g = typeof GX !== 'undefined' && GX[exId];
  if (g && g.fig) {
    const f = typeof g.fig === 'string' ? { k: g.fig } : g.fig;
    if (FARCH[f.k]) return { view: 'front', A: { ...FARCH[f.k], ...f } };
    if (ARCH[f.k]) return { view: 'side', A: { ...ARCH[f.k], ...f } };
  }
  if (EX_FIG[exId]) return { view: 'side', A: ARCH[EX_FIG[exId]] };
  if (exId && exId.startsWith('sk:')) { const [, sk, st] = exId.split(':'); return { view: 'side', A: ARCH[(SKILL_FIG[sk] || [])[+st] || 'hsHold'] }; }
  return { view: 'side', A: { anchor: 'floor', b: 'stand', eq: ['floor'] } };
}
function figKey(exId) { const s = figSpec(exId); return Object.keys(s.view === 'front' ? FARCH : ARCH).find(k => (s.view === 'front' ? FARCH : ARCH)[k].b === s.A.b && (s.view === 'front' ? FARCH : ARCH)[k].a === s.A.a) || 'stand'; }

/* ---------- Geometry ---------- */
function mixPose(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? b[key], y = b[key] ?? a[key];
    o[key] = typeof x === 'number' ? x + (y - x) * k : Array.isArray(x) ? x.map((v, i) => v + ((y[i] ?? v) - v) * k) : y;
  }
  return o;
}
/* Elbow between shoulder s and hand h; of the two solutions pick the one pointing toward `pref` (degrees) */
function ikElbow(s, h, l1, l2, pref) {
  const dx = h[0] - s[0], dy = h[1] - s[1], d = Math.max(.5, Math.min(Math.hypot(dx, dy), l1 + l2 - .01));
  const a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const e1 = [s[0] + l1 * Math.cos(a + c), s[1] + l1 * Math.sin(a + c)], e2 = [s[0] + l1 * Math.cos(a - c), s[1] + l1 * Math.sin(a - c)];
  const px = Math.cos(rad(pref)), py = Math.sin(rad(pref));
  return (e1[0] - s[0]) * px + (e1[1] - s[1]) * py >= (e2[0] - s[0]) * px + (e2[1] - s[1]) * py ? e1 : e2;
}
function reach(s, h, l1, l2) {   // clamp a target to what the arm can reach
  const d = Math.hypot(h[0] - s[0], h[1] - s[1]), m = (l1 + l2) * .995;
  return d <= m ? h : [s[0] + (h[0] - s[0]) * m / d, s[1] + (h[1] - s[1]) * m / d];
}
function jointsOf(P, A = {}) {
  const ul = SEG.ua * (P.ual ?? 1), fl = SEG.fa * (P.fal ?? 1), tl = SEG.th * (P.thl ?? 1), sl = SEG.sh * (P.shl ?? 1);
  const hip = [0, 0], sh = step2(hip, P.t, SEG.torso), head = step2(sh, P.h ?? P.t, SEG.neck + SEG.head);
  let el = step2(sh, P.ua ?? 90, ul), hand = step2(el, P.fa ?? 90, fl);
  let el2 = step2(sh, P.ua2 ?? P.ua ?? 90, ul), hand2 = step2(el2, P.fa2 ?? P.fa ?? 90, fl);
  const kn = step2(hip, P.th, tl), an = step2(kn, P.sh, sl), toe = step2(an, P.ft ?? (P.sh - 90), SEG.foot);
  const kn2 = step2(hip, P.th2 ?? P.th, tl), an2 = step2(kn2, P.sh2 ?? P.sh, sl), toe2 = step2(an2, P.ft2 ?? P.ft ?? ((P.sh2 ?? P.sh) - 90), SEG.foot);
  const J = { hip, sh, head, el, hand, el2, hand2, kn, an, toe, kn2, an2, toe2 };
  if (P.hd != null) { J.tip = step2(hand, P.hd, SEG.hd); J.tip2 = step2(hand2, P.hd2 ?? P.hd, SEG.hd); }
  const ip = implPoint(A, J);
  if (ip && A.grab != null) {         // hands reach for the implement (bar on the back, dumbbell at the chest…)
    J.hand = reach(sh, ip, ul, fl); J.el = ikElbow(sh, J.hand, ul, fl, A.grab);
    J.hand2 = reach(sh, [ip[0] - 2, ip[1] + 1], ul, fl); J.el2 = ikElbow(sh, J.hand2, ul, fl, A.grab + 8);
  }
  return J;
}
function implKind(A) { return !A.impl ? null : typeof A.impl === 'string' ? A.impl : A.impl.k; }
function implPoint(A, J) {
  const at = A.impl && typeof A.impl === 'object' && A.impl.at; if (!at) return null;
  const base = J[at.j] || J.sh, dx = (J.sh[0] - J.hip[0]) / SEG.torso, dy = (J.sh[1] - J.hip[1]) / SEG.torso;
  const al = at.al || 0, pp = at.pp || 0, o = at.off || [0, 0];
  return [base[0] + dx * al - dy * pp + o[0], base[1] + dy * al + dx * pp + o[1]];
}
function shiftJ(J, dx, dy) { const o = {}; for (const k in J) o[k] = [J[k][0] + dx, J[k][1] + dy]; return o; }
const lowest = J => Math.max(...Object.entries(J).filter(([k]) => k !== 'head').map(([, p]) => p[1])) + 5;
function placeJ(A, J) {
  if (A.pin) { const [j, x, y] = A.pin; return shiftJ(J, x - J[j][0], y - J[j][1]); }
  if (A.anchor === 'hands' || A.anchor === 'hand') return shiftJ(J, -J.hand[0], -J.hand[1]);
  const al = { toe: 'toe', toe2: 'toe2', hand: 'hand', head: 'head', knee: 'kn', kn: 'kn', hip: 'hip' }[A.align || 'toe'];
  return shiftJ(J, -J[al][0], -lowest(J));
}
function sidePose(A, k) {          // k: 0 = start (a), 1 = finish (b)
  const pb = POSE[A.b], pa = A.a ? (A.mix ? mixPose(POSE[A.a], pb, A.mix) : POSE[A.a]) : pb;
  return placeJ(A, jointsOf(k >= 1 ? pb : k <= 0 ? pa : mixPose(pa, pb, k), A));
}

/* ---------- Primitive helpers: every shape is [tag, attrs] so frames can be merged into animations ---------- */
const GLF = 'rgba(255,255,255,.10)', GLS = 'rgba(255,255,255,.45)';
const pL = (p, q, w, extra = {}) => ['line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], 'stroke-width': w, 'stroke-linecap': 'round', ...extra }];
const pGlassRect = (x, y, w, h, r = 3) => [['rect', { x, y, width: Math.max(0, w), height: Math.max(0, h), rx: r, fill: GLF, stroke: GLS, 'stroke-width': 1.2 }],
  ['rect', { x: x + 2, y: y + 1.5, width: Math.max(0, w - 4), height: Math.min(2, h / 3), rx: 1, fill: 'rgba(255,255,255,.55)' }]];
function pPad(p, q, off, side, ext = [0, 0], wd = 8) {   // a cushion parallel to p→q, offset to one side
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
  const nx = -uy * side, ny = ux * side;
  const a = [p[0] + nx * off + ux * ext[0], p[1] + ny * off + uy * ext[0]], b = [q[0] + nx * off + ux * ext[1], q[1] + ny * off + uy * ext[1]];
  return { a, b, prims: [pL(a, b, wd, { stroke: 'rgba(255,255,255,.2)' }),
    pL([a[0] - nx * (wd / 2 - 1.2), a[1] - ny * (wd / 2 - 1.2)], [b[0] - nx * (wd / 2 - 1.2), b[1] - ny * (wd / 2 - 1.2)], 1.2, { stroke: 'rgba(255,255,255,.5)' })] };
}
function pDisc(c, r, op = 1) {
  return [['circle', { cx: c[0], cy: c[1], r, fill: 'rgba(255,255,255,.13)', stroke: 'rgba(255,255,255,.62)', 'stroke-width': 1.3, opacity: op }],
    ['circle', { cx: c[0], cy: c[1], r: r * .62, fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 1, opacity: op }],
    ['circle', { cx: c[0], cy: c[1], r: Math.max(1.6, r * .22), fill: 'rgba(255,255,255,.75)', opacity: op }]];
}
const R1 = n => Math.round(n * 10) / 10;
function primStr([tag, a]) { return `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${typeof v === 'number' ? R1(v) : v}"`).join(' ')}/>`; }
function boundsOf(prims, B) {
  for (const [tag, a] of prims) {
    if (tag === 'line') { B.x0 = Math.min(B.x0, a.x1, a.x2); B.x1 = Math.max(B.x1, a.x1, a.x2); B.y0 = Math.min(B.y0, a.y1, a.y2); B.y1 = Math.max(B.y1, a.y1, a.y2); }
    else if (tag === 'circle') { B.x0 = Math.min(B.x0, a.cx - a.r); B.x1 = Math.max(B.x1, a.cx + a.r); B.y0 = Math.min(B.y0, a.cy - a.r); B.y1 = Math.max(B.y1, a.cy + a.r); }
    else if (tag === 'rect') { B.x0 = Math.min(B.x0, a.x); B.x1 = Math.max(B.x1, a.x + a.width); B.y0 = Math.min(B.y0, a.y); B.y1 = Math.max(B.y1, a.y + a.height); }
  }
  return B;
}

/* ---------- Side view: body, implement, equipment ---------- */
function sideBody(J, gid, ghost) {
  const o = [], g = `url(#${gid}g)`;
  const seg = (p, q, w, op) => o.push(pL(p, q, w, op ? { stroke: g, opacity: op } : { stroke: g }));
  const shine = (p, q, w) => o.push(pL([p[0] - w * .22, p[1] - w * .26], [q[0] - w * .22, q[1] - w * .26], w * .3, { stroke: '#fff', 'stroke-opacity': .38 }));
  seg(J.sh, J.el2, W.ua, .42); seg(J.el2, J.hand2, W.fa, .42); if (J.tip2) seg(J.hand2, J.tip2, W.hd, .42);
  seg(J.hip, J.kn2, W.th, .42); seg(J.kn2, J.an2, W.sh, .42); seg(J.an2, J.toe2, W.foot, .42);
  const body = [[J.hip, J.sh, W.torso], [J.hip, J.kn, W.th], [J.kn, J.an, W.sh], [J.an, J.toe, W.foot]], arm = [[J.sh, J.el, W.ua], [J.el, J.hand, W.fa]];
  if (J.tip) arm.push([J.hand, J.tip, W.hd]);
  for (const [p, q, w] of body) { seg(p, q, w); if (!ghost) shine(p, q, w); }
  o.push(['circle', { cx: J.head[0], cy: J.head[1], r: SEG.head, fill: `url(#${gid}hd)` }]);   // near arm passes in front of the head
  for (const [p, q, w] of arm) { seg(p, q, w); if (!ghost) shine(p, q, w); }
  return o;
}
/* Implement in the hands: far copy (behind the body) and near copy (in front) */
function sideImpl(A, J) {
  const k = implKind(A), far = [], near = []; if (!k || k === 'none') return { far, near };
  const ip = implPoint(A, J), h = J.tip || J.hand, h2 = J.tip2 || J.hand2, at = ip && A.grab == null ? ip : h;
  if (k === 'bb') near.push(...pDisc(ip || h, 11));
  else if (k === 'db') { far.push(...pDisc(h2, 6.5, .5)); near.push(...pDisc(ip || h, 6.5)); }
  else if (k === 'db1') near.push(...pDisc(h, 6.5));
  else if (k === 'kb') { const c = [h[0], h[1] + 9]; near.push(['path', { d: `M${R1(h[0] - 4.5)} ${R1(h[1] + 4)} Q${R1(h[0])} ${R1(h[1] - 5)} ${R1(h[0] + 4.5)} ${R1(h[1] + 4)}`, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 2 }], ['circle', { cx: c[0], cy: c[1], r: 7.5, fill: 'rgba(255,255,255,.14)', stroke: 'rgba(255,255,255,.62)', 'stroke-width': 1.3 }]); }
  else if (k === 'wheel') near.push(...pDisc([h[0], h[1] + 2], 7.5));
  else if (k === 'handle') near.push(['circle', { cx: at[0], cy: at[1], r: 3, fill: 'rgba(255,255,255,.25)', stroke: 'rgba(255,255,255,.8)', 'stroke-width': 1.4 }]);
  return { far, near };
}
/* Equipment that moves with the body (cables, rollers, foot plates, levers) */
function sideDyn(A, J) {
  const back = [], front = [];
  for (const e of A.eq || []) {
    if (typeof e !== 'object' || e.fixed) continue;
    if (e.k === 'cable') { const t = e.to === 'an' ? J.an : (implPoint(A, J) && A.grab == null ? implPoint(A, J) : J.tip || J.hand); back.push(pL(e.from, t, 1.4, { stroke: 'rgba(255,255,255,.5)' })); }
    if (e.k === 'lever') { const t = J.hand; back.push(pL(e.from, t, 3.2, { stroke: 'rgba(255,255,255,.28)' })); }
    if (e.k === 'roller') { const p = J[e.at], o = e.off || [0, 0]; front.push(...pDisc([p[0] + o[0], p[1] + o[1]], e.r || 5)); }
    if (e.k === 'plate') { const p = J[e.at], o = e.off || [0, 0], c = [p[0] + o[0], p[1] + o[1]], d = [Math.cos(rad(e.ang)) * e.len / 2, Math.sin(rad(e.ang)) * e.len / 2];
      front.push(pL([c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]], 5, { stroke: 'rgba(255,255,255,.3)' }), pL([c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]], 1.2, { stroke: 'rgba(255,255,255,.7)' })); }
    if (e.k === 'back' && e.dyn) back.push(...pPad(J[e.a], J[e.b], 8, sideOf(J, e), e.ext).prims);
    if (e.k === 'seat' && e.dyn) back.push(...seatPrims(J, e, false));
  }
  return { back, front };
}
/* Back cushion goes on the side of the spine away from the chest */
function sideOf(J, e) { return e.side || 1; }
function seatPrims(J, e, legs = true) {
  const p = J[e.at], w = e.w || 26, h = e.h || 7, top = p[1] + 6;
  const o = pGlassRect(p[0] - w / 2, top, w, h, 3);
  if (legs) o.push(pL([p[0], top + h], [p[0], -1], 3, { stroke: 'rgba(255,255,255,.22)' }), pL([p[0] - 9, -.5], [p[0] + 9, -.5], 3, { stroke: 'rgba(255,255,255,.22)' }));
  return o;
}
/* Fixed equipment (computed once from the finish pose) */
function sideFixed(A, J, B, id) {
  const bg = [];
  for (const e of A.eq || []) {
    if (typeof e === 'string') {
      if (e === 'bar') { const y = (A.anchor === 'hands' ? 0 : J.hand[1]) - 2; bg.push(pL([B.x0 - 6, y], [B.x1 + 6, y], 4, { stroke: 'rgba(255,255,255,.55)' }), pL([B.x0 - 4, y - 1], [B.x1 + 4, y - 1], 1, { stroke: '#fff', 'stroke-opacity': .7 })); B.y0 = Math.min(B.y0, y - 6); }
      if (e === 'pbars') { const y = 1; bg.push(pL([-28, y], [26, y], 4.5, { stroke: 'rgba(255,255,255,.55)' }), pL([-20, y], [-20, y + 46], 3, { stroke: 'rgba(255,255,255,.22)' }), pL([18, y], [18, y + 46], 3, { stroke: 'rgba(255,255,255,.22)' })); B.y1 = Math.max(B.y1, y + 46); B.x0 = Math.min(B.x0, -32); B.x1 = Math.max(B.x1, 30); }
      if (e === 'pole') { const x = J.hand[0] - 3; bg.push(pL([x, B.y0 - 6], [x, B.y1 + 30], 5, { stroke: 'rgba(255,255,255,.5)' }), pL([x - 1, B.y0 - 4], [x - 1, B.y1 + 28], 1, { stroke: '#fff', 'stroke-opacity': .6 })); B.y1 += 30; B.x0 = Math.min(B.x0, x - 8); }
      if (e === 'wall') { const x = Math.max(J.toe[0], J.an[0], J.an2[0]) + 7; bg.push(pL([x, B.y0 - 4], [x, 0], 3, { stroke: 'rgba(255,255,255,.3)', 'stroke-linecap': 'butt' })); B.x1 = Math.max(B.x1, x + 6); }
      if (e.startsWith('box:')) {
        const j = { hand: 'hand', toe: 'toe', toe2: 'toe2', sh: 'sh' }[e.slice(4)], p = J[j], top = p[1] + 4, floor = A.anchor === 'floor' || A.eq.includes('floor') ? 0 : top + 22;
        const h = Math.max(10, floor - top); bg.push(...pGlassRect(p[0] - 16, top, 32, h, 4)); B.y1 = Math.max(B.y1, top + h + 4);
      }
      if (e === 'floor') floorPrims(bg, B, id);
      continue;
    }
    if (e.k === 'floor') floorPrims(bg, B, id);
    if (e.k === 'bench') { const pd = pPad(J[e.a], J[e.b], 0, 1, e.ext || [0, 0]); const y = Math.max(J[e.a][1], J[e.b][1]) + 6.5, x0 = Math.min(pd.a[0], pd.b[0]), x1 = Math.max(pd.a[0], pd.b[0]);
      bg.push(...pGlassRect(x0, y, x1 - x0, 7, 3), pL([x0 + 8, y + 7], [x0 + 8, -1], 3, { stroke: 'rgba(255,255,255,.22)' }), pL([x1 - 8, y + 7], [x1 - 8, -1], 3, { stroke: 'rgba(255,255,255,.22)' })); }
    if (e.k === 'bench2') { const a = J[e.a], b = J[e.b], y = Math.max(a[1], b[1]) + 5, x0 = Math.min(a[0], b[0]) - 8, x1 = Math.max(a[0], b[0]) + 8;
      bg.push(...pGlassRect(x0, y, x1 - x0, 6, 3), pL([x0 + 6, y + 6], [x0 + 6, -1], 3, { stroke: 'rgba(255,255,255,.22)' }), pL([x1 - 6, y + 6], [x1 - 6, -1], 3, { stroke: 'rgba(255,255,255,.22)' })); }
    if (e.k === 'back' && !e.dyn) { const pd = pPad(J[e.a], J[e.b], 8.5, sideOf(J, e), e.ext); bg.push(...pd.prims); }
    if (e.k === 'pad' && (e.fixed || !e.dyn)) { const pd = pPad(J[e.a], J[e.b], e.off, e.side || 1, e.ext); bg.push(...pd.prims); if (e.legs) { const m = [(pd.a[0] + pd.b[0]) / 2, Math.max(pd.a[1], pd.b[1]) + 4]; bg.push(pL(m, [m[0], -1], 3, { stroke: 'rgba(255,255,255,.22)' })); } }
    if (e.k === 'seat' && !e.dyn) bg.push(...seatPrims(J, e));
    if (e.k === 'box') { const p = J[e.at], w = e.w || 28, top = p[1] + (e.off ?? 4), h = Math.max(6, -top); bg.push(...pGlassRect(p[0] - w / 2, top, w, h, 3)); }
    if (e.k === 'roller' && e.fixed) { const p = J[e.at], o = e.off || [0, 0]; bg.push(...pDisc([p[0] + o[0], p[1] + o[1]], e.r || 5)); }
    if (e.k === 'stack') { bg.push(...pGlassRect(e.x - 7, -e.h, 14, e.h, 3)); for (let y = -16; y > -e.h * .42; y -= 5) bg.push(pL([e.x - 5, y], [e.x + 5, y], 3, { stroke: 'rgba(255,255,255,.25)', 'stroke-linecap': 'butt' })); }
    if (e.k === 'cable' && e.from) { const x = e.from[0], top = Math.min(e.from[1], -40) - 8; bg.push(...pGlassRect(x - 4, top, 8, -top, 3), ['circle', { cx: e.from[0], cy: e.from[1], r: 3.5, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.3 }]); }
    if (e.k === 'post') bg.push(...pGlassRect(e.x - 4, e.y, 8, -e.y, 3));
    if (e.k === 'rail') { const b = step2(e.from, e.ang, e.len); bg.push(pL(e.from, b, 3, { stroke: 'rgba(255,255,255,.2)' })); }
    if (e.k === 'base') bg.push(...pGlassRect(e.x0, e.y, e.x1 - e.x0, -e.y, 3));
    if (e.k === 'lever') bg.push(['circle', { cx: e.from[0], cy: e.from[1], r: 3, fill: 'rgba(255,255,255,.4)' }]);
  }
  boundsOf(bg, B);
  return bg;
}
function floorPrims(bg, B, id) {
  bg.unshift(['ellipse', { cx: (B.x0 + B.x1) / 2, cy: 2, rx: (B.x1 - B.x0) / 2.2, ry: 4, fill: `url(#${id}sd)` }], pL([B.x0, .5], [B.x1, .5], 1, { stroke: 'rgba(255,255,255,.22)', 'stroke-linecap': 'butt' }));
  B.y1 = Math.max(B.y1, 8);
}

/* ---------- Front view ---------- */
function frontJoints(P, A) {
  const el = P.el || 0, shY = -SEG.torso + el, ul = SEG.ua * (P.ual ?? 1), fl = SEG.fa * (P.fal ?? 1);
  const shR = [11, shY], shL = [-11, shY], mir = a => 180 - a;
  const ra = P.ra || [92, 90], la = P.la || [mir(ra[0]), mir(ra[1])];
  let elR = step2(shR, ra[0], ul), handR = step2(elR, ra[1], fl), elL = step2(shL, la[0], ul), handL = step2(elL, la[1], fl);
  if (P.hands) { handR = reach(shR, P.hands, ul, fl); handL = reach(shL, [P.hands[0] - 3, P.hands[1] + 2], ul, fl); elR = ikElbow(shR, handR, ul, fl, 20); elL = ikElbow(shL, handL, ul, fl, 160); }
  const tl = SEG.th * (P.thl ?? 1), sl = SEG.sh * (P.shl ?? 1), lg = P.lg || [93, 90];
  const hipR = [7, 0], hipL = [-7, 0], knR = step2(hipR, lg[0], tl), anR = step2(knR, lg[1], sl), knL = step2(hipL, mir(lg[0]), tl), anL = step2(knL, mir(lg[1]), sl);
  return { shR, shL, elR, elL, handR, handL, hipR, hipL, knR, knL, anR, anL, toeR: [anR[0] + 3, anR[1] + 4], toeL: [anL[0] - 3, anL[1] + 4],
    head: [0, shY - SEG.neck - SEG.head + 1 - el * .2], neck: [0, shY + 2], pelvis: [0, -3], hip: [0, 0] };
}
function frontPose(A, k) {
  const pb = FPOSE[A.b], pa = A.a ? FPOSE[A.a] : pb;
  const J = frontJoints(k >= 1 ? pb : k <= 0 ? pa : mixPose(pa, pb, k), A);
  if (A.pin) return J;                                  // seated / lying: hips stay put
  return shiftJ(J, 0, -(Math.max(J.toeR[1], J.toeL[1]) + 3));
}
function frontBody(J, gid, ghost) {
  const o = [], g = `url(#${gid}g)`;
  const ln = (p, q, w) => o.push(pL(p, q, w, { stroke: g }));
  const shine = (p, q, w) => o.push(pL([p[0] - w * .25, p[1]], [q[0] - w * .25, q[1]], w * .28, { stroke: '#fff', 'stroke-opacity': .36 }));
  for (const s of ['R', 'L']) { ln(J['hip' + s], J['kn' + s], W.th); ln(J['kn' + s], J['an' + s], W.sh); ln(J['an' + s], J['toe' + s], W.foot); }
  ln(J.neck, J.pelvis, W.torso + 7); ln(J.shL, J.shR, W.ua); if (!ghost) shine([0, J.neck[1] + 1], [0, J.pelvis[1] - 3], W.torso + 7);
  for (const s of ['R', 'L']) { ln(J['sh' + s], J['el' + s], W.ua); ln(J['el' + s], J['hand' + s], W.fa); if (!ghost) { shine(J['sh' + s], J['el' + s], W.ua); shine(J['el' + s], J['hand' + s], W.fa); } }
  o.push(['circle', { cx: J.head[0], cy: J.head[1], r: SEG.head, fill: `url(#${gid}hd)` }]);
  return o;
}
function frontImpl(A, J) {
  const k = implKind(A), o = []; if (!k || k === 'none') return o;
  const hs = [J.handR, J.handL];
  if (k === 'db') for (const h of hs) o.push(...pDisc(h, 6));
  if (k === 'dbV') for (const h of hs) o.push(pL([h[0], h[1] - 7], [h[0], h[1] + 7], 4, { stroke: 'rgba(255,255,255,.55)' }), ['rect', { x: h[0] - 4.5, y: h[1] - 10, width: 9, height: 5, rx: 2, fill: GLF, stroke: GLS, 'stroke-width': 1.1 }], ['rect', { x: h[0] - 4.5, y: h[1] + 5, width: 9, height: 5, rx: 2, fill: GLF, stroke: GLS, 'stroke-width': 1.1 }]);
  if (k === 'handle' || k === 'handle1') for (const h of k === 'handle1' ? [J.handR] : hs) o.push(['circle', { cx: h[0], cy: h[1], r: 3, fill: 'rgba(255,255,255,.25)', stroke: 'rgba(255,255,255,.8)', 'stroke-width': 1.4 }]);
  if (k === 'bbF' || k === 'barF') {
    const y = (J.handR[1] + J.handL[1]) / 2, half = k === 'bbF' ? 50 : Math.abs(J.handR[0] - J.handL[0]) / 2 + 10;
    o.push(pL([-half, y], [half, y], 3.5, { stroke: 'rgba(255,255,255,.6)' }));
    if (k === 'bbF') for (const s of [-1, 1]) o.push(['rect', { x: s * (half - 6) - 2.5, y: y - 13, width: 5, height: 26, rx: 2, fill: GLF, stroke: 'rgba(255,255,255,.6)', 'stroke-width': 1.2 }], ['rect', { x: s * (half - 12) - 2, y: y - 9, width: 4, height: 18, rx: 2, fill: GLF, stroke: GLS, 'stroke-width': 1 }]);
    else o.push(pL([0, y], [0, -118], 1.4, { stroke: 'rgba(255,255,255,.5)' }));
  }
  return o;
}
function frontDyn(A, J) {
  const back = [], front = [];
  for (const e of A.eq || []) {
    if (e.k === 'cable') back.push(pL(e.from, e.to === 'handL' ? J.handL : J.handR, 1.4, { stroke: 'rgba(255,255,255,.5)' }));
    if (e.k === 'fpad') for (const s of ['R', 'L']) { const pd = pPad(J['el' + s], J['hand' + s], 0, 1, [-2, 2], 9); front.push(...pd.prims); }
    if (e.k === 'kroll') for (const s of ['R', 'L']) { const kx = J['kn' + s][0] + (s === 'R' ? 1 : -1) * e.side * 7; front.push(...pDisc([kx, J['kn' + s][1] + 2], 4.5)); }
  }
  return { back, front };
}
function frontFixed(A, J, B, id) {
  const bg = [];
  for (const e of A.eq || []) {
    if (e.k === 'floor') floorPrims(bg, B, id);
    if (e.k === 'fseat') { bg.push(...pGlassRect(-19, 5, 38, 7, 3), pL([0, 12], [0, 40], 3, { stroke: 'rgba(255,255,255,.2)' })); if (!A.top) bg.push(...pGlassRect(-15, -44, 30, 40, 6)); }
    if (e.k === 'fbench') bg.push(...pGlassRect(-15, -66, 30, 96, 8));
    if (e.k === 'kpad') bg.push(...pGlassRect(-20, J.knR[1] - 10, 40, 6, 3));
    if (e.k === 'tower') bg.push(['circle', { cx: 0, cy: e.y, r: 3.5, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.3 }]);
    if (e.k === 'post') bg.push(...pGlassRect(e.x - 4, e.y, 8, -e.y, 3));
    if (e.k === 'cable') bg.push(['circle', { cx: e.from[0], cy: e.from[1], r: 3.5, fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1.3 }]);
  }
  boundsOf(bg, B);
  return bg;
}
/* Pull-up seen from the front: shows grip width on the bar */
const FRONT_PULL = ['neg_pullup', 'pullup', 'c2b_pullup'];
const HAND_X = { narrow: 13, medium: 23, wide: 36 };
function pullJoints(hw, shY) {
  const shR = [11, shY], shL = [-11, shY], handR = [hw, 0], handL = [-hw, 0];
  const elR = ikElbow(shR, handR, SEG.ua, SEG.fa, 0), elL = ikElbow(shL, handL, SEG.ua, SEG.fa, 180);
  const hipY = shY + SEG.torso, hipR = [7, hipY], hipL = [-7, hipY];
  const kn = x => [x * 1.05, hipY + SEG.th], an = x => [x * .9, hipY + SEG.th + SEG.sh];
  return { shR, shL, elR, elL, handR, handL, hipR, hipL, knR: kn(7), knL: kn(-7), anR: an(7), anL: an(-7), toeR: [an(7)[0] + 3, hipY + 61], toeL: [an(-7)[0] - 3, hipY + 61],
    head: [0, shY - SEG.neck - SEG.head + 1], neck: [0, shY + 2], pelvis: [0, hipY], hip: [0, hipY] };
}

/* ---------- Frames & animation ---------- */
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
/* start hold → lift (1.1 s) → squeeze → lower slowly (1.5 s) */
const ANIM = (() => { const T = [], K = []; const push = (t, k) => { T.push(t); K.push(k); };
  push(0, 0); push(.08, 0); for (let i = 1; i <= 8; i++) push(.08 + .34 * i / 8, ease(i / 8)); push(.52, 1); for (let i = 1; i <= 10; i++) push(.52 + .48 * i / 10, 1 - ease(i / 10));
  return { T, K, dur: 3.6 }; })();

function figureModel(exId, opts) {
  const spec = figSpec(exId), A = spec.A;
  if (FRONT_PULL.includes(exId)) {
    const hw = HAND_X[opts.width] || HAND_X.medium, top = exId === 'c2b_pullup' ? 22 : 15, hang = Math.sqrt(Math.max(1, (SEG.ua + SEG.fa) ** 2 - (hw - 11) ** 2));
    const grip = opts.grip || 'over';
    return { two: true, frame: k => pullJoints(hw, lerp(hang, top, k)), body: frontBody, impl: () => [], dyn: () => ({ back: [], front: [] }),
      fixed: (J, B, id) => { const bg = [pL([-46, 0], [46, 0], 4, { stroke: 'rgba(255,255,255,.55)' }), pL([-44, -1], [44, -1], 1, { stroke: '#fff', 'stroke-opacity': .7 })];
        B.x0 = Math.min(B.x0, -48); B.x1 = Math.max(B.x1, 48); B.y0 = Math.min(B.y0, -24); return bg; },
      over: J => [J.handR, J.handL].map(h => grip === 'neutral' ? pL([h[0], -9], [h[0], 9], 4, { stroke: 'rgba(255,255,255,.6)' })
        : ['rect', { x: h[0] - 4.5, y: -4.5, width: 9, height: 9, rx: 3, fill: grip === 'under' ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 1 }]) };
  }
  if (spec.view === 'front') return { two: !!A.a, frame: k => frontPose(A, k), body: frontBody, impl: J => frontImpl(A, J), dyn: J => frontDyn(A, J), fixed: (J, B, id) => frontFixed(A, J, B, id) };
  return { two: !!A.a, frame: k => sidePose(A, k), body: sideBody, impl: J => { const s = sideImpl(A, J); return [...s.far, ...s.near]; }, implSplit: J => sideImpl(A, J), dyn: J => sideDyn(A, J), fixed: (J, B, id) => sideFixed(A, J, B, id) };
}

let figSeq = 0;
const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function figureSVG(exId, size = 96, opts = {}) {
  const M = figureModel(exId, opts), id = svgIdPrefix + 'fg' + (++figSeq);
  const anim = opts.anim && M.two && !reducedMotion();
  const layers = J => {   // ordered layers for one pose
    const d = M.dyn(J), s = M.implSplit ? M.implSplit(J) : { far: [], near: M.impl(J) };
    return [...d.back, ...s.far, ...M.body(J, id, false), ...(M.over ? M.over(J) : []), ...s.near, ...d.front];
  };
  const Jb = M.frame(1), Ja = M.two ? M.frame(0) : null;
  const frames = anim ? ANIM.K.map(k => layers(M.frame(k))) : null;
  const B = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  if (anim) frames.forEach(f => boundsOf(f, B)); else { boundsOf(layers(Jb), B); if (Ja) boundsOf(layers(Ja), B); }
  B.x0 -= 8; B.x1 += 8; B.y0 -= 8; B.y1 += 6;
  const bg = M.fixed(Jb, B, id).map(primStr).join('');
  let fg;
  if (anim) {
    const kt = ANIM.T.map(t => R1(t * 1000) / 1000).join(';');
    fg = frames[0].map(([tag, a0], i) => {
      let attrs = '', kids = '';
      for (const k in a0) {
        const vals = frames.map(f => f[i] && f[i][1][k]), str = v => typeof v === 'number' ? R1(v) : v;
        if (vals.some(v => str(v) !== str(a0[k]))) kids += `<animate attributeName="${k}" values="${vals.map(str).join(';')}" keyTimes="${kt}" dur="${ANIM.dur}s" repeatCount="indefinite"/>`;
        attrs += ` ${k}="${str(a0[k])}"`;
      }
      return `<${tag}${attrs}>${kids}</${tag}>`;
    }).join('');
  } else {
    const ghost = Ja ? `<g opacity=".2">${(() => { const d = M.dyn(Ja); return [...d.back, ...M.body(Ja, id, true), ...M.impl(Ja), ...d.front]; })().map(primStr).join('')}</g>` : '';
    fg = ghost + layers(Jb).map(primStr).join('');
  }
  const w = B.x1 - B.x0, h = B.y1 - B.y0, side = Math.max(w, h);   // square-ish box so tiles line up
  const vx = B.x0 - (side - w) / 2, vy = B.y0 - (side - h) / 2;
  return `<svg class="fig ${opts.cls || ''}" viewBox="${R1(vx)} ${R1(vy)} ${R1(side)} ${R1(side)}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${R1(vx)}" y1="${R1(vy)}" x2="${R1(vx + side)}" y2="${R1(vy + side)}"><stop offset="0" style="stop-color:var(--accent-hi)"/><stop offset=".55" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent2)"/></linearGradient>
      <radialGradient id="${id}hd" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" style="stop-color:var(--accent-hi)"/><stop offset="1" style="stop-color:var(--accent2)"/></radialGradient>
      <radialGradient id="${id}sd"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    </defs>${bg}${fg}</svg>`;
}
