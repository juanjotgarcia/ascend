/* LEDGER — the path to King: 11 ranks, each with its own shield that evolves
   from plain farm wood to a crowned diamond shield. Shields are drawn as SVG. */

const RANKS = [
  { lvl: 1,  title: 'Farmhand',       shield: 'Plain Wooden Shield',      desc: 'Up before the sun, working the land. Every king starts here.', ref: '1 Samuel 16:11', verse: 'There remaineth yet the youngest, and, behold, he keepeth the sheep.' },
  { lvl: 3,  title: 'Villager',       shield: 'Sturdy Wooden Shield',     desc: 'Known in the village for showing up. Discipline is becoming habit.', ref: 'Zechariah 4:10', verse: 'For who hath despised the day of small things?' },
  { lvl: 5,  title: 'Squire',         shield: 'Iron-Banded Shield',       desc: 'Serving, learning, carrying the load. Your shield is getting stronger.', ref: 'Proverbs 22:29', verse: 'Seest thou a man diligent in his business? he shall stand before kings.' },
  { lvl: 8,  title: 'Militiaman',     shield: 'Iron-Rimmed Shield',       desc: 'Ready to stand when called. Iron on the rim, iron in the will.', ref: 'Nehemiah 4:17', verse: 'Every one with one of his hands wrought in the work, and with the other hand held a weapon.' },
  { lvl: 11, title: 'Soldier',        shield: 'Iron Shield',              desc: 'Trained, tested and dependable under pressure.', ref: '2 Timothy 2:3', verse: 'Thou therefore endure hardness, as a good soldier of Jesus Christ.' },
  { lvl: 15, title: 'Knight',         shield: 'Steel Knight\'s Shield',   desc: 'Strength with honor. You protect what matters.', ref: 'Ephesians 6:16', verse: 'Above all, taking the shield of faith, wherewith ye shall be able to quench all the fiery darts of the wicked.' },
  { lvl: 20, title: 'Knight-Captain', shield: 'Captain\'s Laurel Shield', desc: 'Others follow your example. Leading by doing.', ref: 'Psalm 18:35', verse: 'Thou hast also given me the shield of thy salvation: and thy right hand hath holden me up.' },
  { lvl: 25, title: 'Champion',       shield: 'Silver Champion Shield',   desc: 'Proven in many battles. Your mastery is visible.', ref: '1 Corinthians 9:25', verse: 'Every man that striveth for the mastery is temperate in all things.' },
  { lvl: 30, title: 'Lord',           shield: 'Golden Lord\'s Shield',    desc: 'Trusted with much, because you were faithful in little.', ref: 'Psalm 28:7', verse: 'The LORD is my strength and my shield; my heart trusted in him, and I am helped.' },
  { lvl: 40, title: 'Prince',         shield: 'Platinum Crown Shield',    desc: 'Royalty shows in discipline, humility and courage.', ref: 'Psalm 84:11', verse: 'For the LORD God is a sun and shield: the LORD will give grace and glory.' },
  { lvl: 50, title: 'King',           shield: 'Diamond Royal Shield',     desc: 'Faithful to the end. The crown is yours.', ref: 'Revelation 2:10', verse: 'Be thou faithful unto death, and I will give thee a crown of life.' },
];
const rankIndex = lvl => { let i = 0; RANKS.forEach((r, j) => { if (lvl >= r.lvl) i = j; }); return i; };

/* ---------- Shield drawing ---------- */
const MAT = {
  wood: ['#dca46a', '#a86c37', '#6c3f1c'], wood2: ['#c98a4e', '#8a5528', '#552f12'],
  iron: ['#b9c1cb', '#6f7883', '#3a4149'], steel: ['#f4f7fa', '#aeb9c6', '#5d6a7a'],
  bronze: ['#ffd49c', '#c8843e', '#7a481b'], silver: ['#ffffff', '#d7dee7', '#8996a7'],
  gold: ['#fff4b5', '#f6c544', '#b07a14'], platinum: ['#ffffff', '#e4ecf6', '#9fb0c7'],
  diamond: ['#f6feff', '#a8eeff', '#3f9dff'], crimson: ['#ea5a62', '#ad1f2e', '#650c16'], royal: ['#68a9ff', '#2160d8', '#0e2c72'],
};
const SHAPES = {
  round: 'M60 20 A52 52 0 1 1 59.9 20 Z',
  heater: 'M14 16 H106 V62 C106 100 86 122 60 134 C34 122 14 100 14 62 Z',
  kite: 'M60 6 L106 20 V64 C106 102 84 124 60 136 C36 124 14 102 14 64 V20 Z',
};
const TIERS = [
  { shape: 'round', body: 'wood', planks: 1, boss: 'wood2' },
  { shape: 'round', body: 'wood2', planks: 1, rim: 'wood', boss: 'wood', nails: 1 },
  { shape: 'round', body: 'wood', planks: 1, rim: 'iron', bands: 'iron', boss: 'iron' },
  { shape: 'heater', body: 'wood', planks: 1, rim: 'iron', boss: 'iron', rivets: 1 },
  { shape: 'heater', body: 'iron', rim: 'steel', emblem: 'steel', rivets: 1 },
  { shape: 'heater', body: 'crimson', rim: 'steel', emblem: 'silver', rivets: 1 },
  { shape: 'heater', body: 'royal', rim: 'bronze', emblem: 'gold', laurel: 'gold' },
  { shape: 'kite', body: 'silver', rim: 'steel', emblem: 'gold', filigree: 1, gems: ['#3f7dff'] },
  { shape: 'kite', body: 'gold', rim: 'bronze', emblem: 'platinum', rays: 1, gems: ['#e0203a', '#e0203a'] },
  { shape: 'kite', body: 'platinum', rim: 'gold', emblem: 'royal', crown: 'gold', gems: ['#2a6bff', '#2a6bff', '#2a6bff'], laurel: 'gold' },
  { shape: 'kite', body: 'diamond', rim: 'platinum', emblem: 'white', crown: 'gold', facets: 1, gems: ['#e0203a', '#2a6bff', '#1fbf6a'], aura: 1, sparkles: 1, laurel: 'gold' },
];
let shieldSeq = 0;
function shieldSVG(tier, size = 64, locked = false) {
  const t = TIERS[clamp(tier, 0, TIERS.length - 1)], id = svgIdPrefix + 'sh' + (++shieldSeq), d = SHAPES[t.shape];
  const grad = (name, m, x2 = 0.4, y2 = 1) => `<linearGradient id="${id}${name}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${MAT[m][0]}"/><stop offset=".5" stop-color="${MAT[m][1]}"/><stop offset="1" stop-color="${MAT[m][2]}"/></linearGradient>`;
  const mats = new Set([t.body, t.rim, t.boss, t.bands, t.emblem !== 'white' && t.emblem, t.laurel, t.crown].filter(Boolean));
  let defs = [...mats].map(m => grad(m, m)).join('')
    + `<clipPath id="${id}c"><path d="${d}"/></clipPath>`
    + `<linearGradient id="${id}hl" x1="0" y1="0" x2=".7" y2=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<radialGradient id="${id}au"><stop offset="0" stop-color="#bff3ff" stop-opacity=".9"/><stop offset="1" stop-color="#5ab8ff" stop-opacity="0"/></radialGradient>`;
  const f = m => `url(#${id}${m})`;
  let g = '';
  if (t.aura) g += `<circle cx="60" cy="72" r="74" fill="url(#${id}au)" opacity=".55"/>`;
  g += `<path d="${d}" fill="${f(t.body)}"/>`;
  let inner = '';
  if (t.planks) for (let x = 30; x <= 90; x += 15) inner += `<rect x="${x - 0.8}" y="0" width="1.6" height="140" fill="#3b2410" opacity=".45"/>`;
  if (t.planks) inner += `<path d="M20 40 C40 44 50 38 70 42 S100 40 104 44" stroke="#3b2410" stroke-width="1" fill="none" opacity=".25"/>`;
  if (t.facets) {
    const pts = [[60, 6], [106, 20], [106, 64], [84, 110], [60, 136], [36, 110], [14, 64], [14, 20]];
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; inner += `<path d="M60 70 L${p[0]} ${p[1]} L${q[0]} ${q[1]} Z" fill="#fff" opacity="${[0.35, 0.08, 0.22, 0.04, 0.3, 0.1, 0.26, 0.14][i]}"/>`; });
    inner += `<path d="M60 6 L60 136 M14 64 L106 64 M14 20 L106 110 M106 20 L14 110" stroke="#fff" stroke-width=".7" opacity=".55"/>`;
  }
  if (t.filigree) inner += `<path d="M24 30 C40 40 30 60 44 70 M96 30 C80 40 90 60 76 70 M30 96 C46 92 52 108 60 118 M90 96 C74 92 68 108 60 118" stroke="#fff" stroke-width="1.4" fill="none" opacity=".55"/>`;
  if (t.rays) for (let a = 0; a < 360; a += 22.5) inner += `<path d="M60 70 L${60 + 70 * Math.cos(a * Math.PI / 180)} ${70 + 70 * Math.sin(a * Math.PI / 180)}" stroke="#fff6c8" stroke-width="${a % 45 ? 1 : 2.4}" opacity=".35"/>`;
  if (t.bands) [48, 92].forEach(y => { inner += `<rect x="0" y="${y}" width="120" height="10" fill="${f(t.bands)}"/>`; for (let x = 22; x <= 98; x += 19) inner += `<circle cx="${x}" cy="${y + 5}" r="2.2" fill="#e6ebf0"/><circle cx="${x - 0.6}" cy="${y + 4.3}" r=".8" fill="#fff"/>`; });
  g += `<g clip-path="url(#${id}c)">${inner}<path d="${d}" fill="url(#${id}hl)"/></g>`;
  if (t.rim) g += `<path d="${d}" fill="none" stroke="${f(t.rim)}" stroke-width="${t.shape === 'round' ? 7 : 6}"/>`;
  else g += `<path d="${d}" fill="none" stroke="#3b2410" stroke-width="2" opacity=".6"/>`;
  if (t.rivets) {
    const rp = t.shape === 'round' ? [] : [[22, 24], [60, 22], [98, 24], [100, 62], [20, 62], [88, 104], [32, 104], [60, 124]];
    rp.forEach(([x, y]) => { g += `<circle cx="${x}" cy="${y}" r="2.6" fill="#d7dde4"/><circle cx="${x - 0.7}" cy="${y - 0.7}" r=".9" fill="#fff"/>`; });
  }
  if (t.boss) {
    const cy = t.shape === 'round' ? 72 : 66;
    g += `<circle cx="60" cy="${cy}" r="13" fill="${f(t.boss)}" stroke="#2a1a0c" stroke-opacity=".35"/><circle cx="56" cy="${cy - 4}" r="4" fill="#fff" opacity=".45"/>`;
    if (t.nails) [[0, -18], [18, 0], [0, 18], [-18, 0]].forEach(([x, y]) => { g += `<circle cx="${60 + x}" cy="${cy + y}" r="2.2" fill="#c9cfd6"/>`; });
  }
  if (t.laurel) {
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 6; i++) {
      const a = (200 + i * 24) * Math.PI / 180, x = 60 + s * 30 * Math.cos(a) * -1, y = 74 + 30 * Math.sin(a) * -1;
      g += `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="2.4" fill="${f(t.laurel)}" transform="rotate(${s * (i * 24 - 40)} ${x} ${y})"/>`;
    }
  }
  if (t.emblem) {
    const s = 0.15, tx = 60 - 256 * s, ty = 68 - 256 * s, fill = t.emblem === 'white' ? '#ffffff' : f(t.emblem);
    g += `<g transform="translate(${tx} ${ty}) scale(${s})">`
      + `<g fill="#000" opacity=".28" transform="translate(14 18)"><rect x="204" y="80" width="44" height="352"/><rect x="134" y="150" width="184" height="44"/><rect x="204" y="388" width="174" height="44"/></g>`
      + `<g fill="${fill}"><rect x="204" y="80" width="44" height="352"/><rect x="134" y="150" width="184" height="44"/><rect x="204" y="388" width="174" height="44"/></g></g>`;
  }
  if (t.gems) {
    const spots = [[34, 34], [86, 34], [60, 112]];
    t.gems.forEach((c, i) => { const [x, y] = spots[i]; g += `<path d="M${x} ${y - 6} L${x + 5} ${y} L${x} ${y + 6} L${x - 5} ${y} Z" fill="${c}" stroke="#fff" stroke-width=".8"/><path d="M${x} ${y - 6} L${x + 2} ${y} L${x} ${y + 1}" fill="#fff" opacity=".6"/>`; });
  }
  if (t.crown) {
    const y0 = t.shape === 'kite' ? -12 : 0;
    g += `<g transform="translate(0 ${y0})"><path d="M36 20 L40 2 L50 12 L60 -4 L70 12 L80 2 L84 20 Z" fill="${f(t.crown)}" stroke="#7a5208" stroke-width="1"/>`
      + `<rect x="36" y="18" width="48" height="6" rx="2" fill="${f(t.crown)}" stroke="#7a5208" stroke-width="1"/>`
      + `<circle cx="60" cy="-4" r="3" fill="#e0203a"/><circle cx="40" cy="2" r="2.2" fill="#2a6bff"/><circle cx="80" cy="2" r="2.2" fill="#2a6bff"/><circle cx="60" cy="21" r="2.2" fill="#1fbf6a"/></g>`;
  }
  if (t.sparkles) [[16, 12, 5], [104, 10, 4], [110, 96, 3.5], [10, 100, 3]].forEach(([x, y, r]) => { g += `<path d="M${x} ${y - r * 2} Q${x} ${y} ${x + r * 2} ${y} Q${x} ${y} ${x} ${y + r * 2} Q${x} ${y} ${x - r * 2} ${y} Q${x} ${y} ${x} ${y - r * 2} Z" fill="#fff"/>`; });
  return `<svg class="shield ${locked ? 'locked' : ''}" viewBox="0 -18 120 158" width="${size}" height="${size * 158 / 120}" aria-hidden="true"><defs>${defs}</defs>${g}</svg>`;
}

/* ---------- Path view ---------- */
function viewPath() {
  const li = levelInfo(), ci = rankIndex(li.lvl), cur = RANKS[ci], next = RANKS[ci + 1];
  const from = xpForLevel(cur.lvl), to = next ? xpForLevel(next.lvl) : from, pct = next ? (li.xp - from) / (to - from) : 1;
  return `
  <header class="today-head"><button class="round-btn glass" data-go="me" aria-label="Back">${icon('left')}</button><p class="title">Path to King</p><span></span></header>
  <section class="hero path-hero glass">
    <div class="ph-shield" data-act="rankInfo" data-i="${ci}">${shieldSVG(ci, 132)}</div>
    <p class="eyebrow gold">Rank ${ci + 1} of ${RANKS.length} · Level ${li.lvl}</p>
    <h1 class="hero-title">${esc(cur.title)}</h1>
    <p class="muted small">${esc(cur.shield)}</p>
    ${next ? `${bar(pct, 'linear-gradient(90deg,var(--xp-lo),var(--xp),var(--xp-hi))', 'xp-bar')}
      <p class="tiny muted mt-s"><b class="gold">${fmtN(to - li.xp)} XP</b> to <b>${esc(next.title)}</b> · level ${next.lvl}</p>`
      : `<p class="gold mt">You reached the summit. Long live the King.</p>`}
  </section>
  <div class="path">${RANKS.map((r, i) => {
    const state = i < ci ? 'done' : i === ci ? 'cur' : 'locked', need = xpForLevel(r.lvl) - li.xp;
    return `<button class="rank-node ${state} ${i % 2 ? 'right' : 'left'}" data-act="rankInfo" data-i="${i}">
      <span class="rn-shield">${shieldSVG(i, 66, state === 'locked')}${state === 'locked' ? `<i class="rn-lock">${icon('shield', 'xs')}</i>` : ''}</span>
      <span class="rn-text"><b>${esc(r.title)}</b><span class="tiny muted">Level ${r.lvl} · ${esc(r.shield)}</span>
      <span class="tiny ${state === 'locked' ? 'muted' : state === 'cur' ? 'gold' : 'green-t'}">${state === 'done' ? '✓ Earned' : state === 'cur' ? '● You are here' : `${fmtN(need)} XP away`}</span></span>
    </button>`;
  }).reverse().join('')}</div>
  <p class="tiny muted center-t mt mb-xl">Earn XP from workouts, habits, missions, water, food and skills to climb.</p>`;
}
function rankSheet(i) {
  const r = RANKS[i], li = levelInfo(), unlocked = li.lvl >= r.lvl;
  return `<div class="center-t rank-sheet">
    <div class="rs-shield">${shieldSVG(i, 170)}</div>
    <p class="eyebrow ${unlocked ? 'gold' : ''}">${unlocked ? 'Unlocked' : `Unlocks at level ${r.lvl}`}</p>
    <h2>${esc(r.title)}</h2><p class="muted small">${esc(r.shield)}</p>
    <p class="mt">${esc(r.desc)}</p>
    <p class="verse-text small mt">“${esc(r.verse)}”</p><p class="verse-ref">${esc(r.ref)}</p>
    ${unlocked ? '' : `<p class="tiny muted mt">${fmtN(xpForLevel(r.lvl) - li.xp)} XP to go</p>`}
    <button class="btn primary wide mt" data-act="closeSheet">${unlocked ? 'Amen' : 'Keep climbing'}</button></div>`;
}
const RANK_ACT = {
  rankInfo: d => { openSheet(rankSheet(+d.i), { cls: 'center' }); SFX.play('open'); },
};
