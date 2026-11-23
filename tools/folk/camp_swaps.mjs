// The bodies of the people posted at the camps (src/core/camps-data.js, src/folk/people.js POSTED): each a townsman's or
// townswoman's own body, already loaded for Bellmourn, in cloth dyed another colour and hair of another (a dye swap: no
// picture of its own, recoloured in the shader, src/gfx/folk.js dyeCode). So a camp's people cost a phone nothing to hold.
// Writes them into assets/game/folk/folk.json's swaps as c_<body>_<1-3>, the same every time it's run.
//   node tools/folk/camp_swaps.mjs
// The dyes are earth colours, the shader's hues 2 to 12 (ochre, olive, green, plum), never strong: none of Velscour's red
// and none of Tessariel's blue and gold (the shader's sixteen hues have no blue in them at all).
import fs from 'node:fs';

const FILE = new URL('../../assets/game/folk/folk.json', import.meta.url);
const folk = JSON.parse(fs.readFileSync(FILE, 'utf8'));
// The town's plain bodies: not the two great houses' reds and blues, nor the children.
export const MEN = ['elder', 'sage', 'worker_2', 'dude', 'smith', 'wes', 'worker', 'old_man'];
export const WOMEN = ['wife_jolly', 'young_2', 'crone', 'young_3', 'wife_big', 'young_5', 'redhead', 'young_4', 'worker_f', 'young_1'];
// [dark cloth's dye, light cloth's, how strongly (0-3), how dark it's worn (0-15), hair (1-7 black, dark brown, chestnut, auburn, flaxen, grey, white)]
const DYES = [[4, 8, 1, 6], [9, 3, 1, 8], [11, 6, 1, 5], [6, 10, 2, 7], [3, 12, 1, 4], [8, 5, 2, 9], [10, 2, 1, 6], [5, 9, 1, 10], [12, 4, 1, 7]];
const HAIR = { elder: [6, 2, 7], sage: [7, 6, 1], worker_2: [2, 6, 3], dude: [1, 3, 5], smith: [2, 1, 6], wes: [3, 6, 1], worker: [1, 5, 2], old_man: [7, 6, 6],
  wife_jolly: [2, 6, 4], young_2: [5, 1, 3], crone: [7, 6, 7], young_3: [1, 4, 5], wife_big: [3, 6, 2], young_5: [2, 5, 1], redhead: [4, 2, 1], young_4: [3, 1, 5], worker_f: [6, 2, 4], young_1: [1, 5, 4] };
let n = 0;
const made = {};
[...MEN, ...WOMEN].forEach((base, b) => {
  if (!folk.models[base]) throw new Error(`no body ${base}`);
  for (let i = 0; i < 3; i++) { made[`c_${base}_${i + 1}`] = { base, dye: [...DYES[(b * 2 + i * 3) % DYES.length], HAIR[base][i]] }; n++; }
});
// (Written as tools/folk/manifest.py writes it, one line a swap, and only these lines: the rest of the file is left as it is.)
const py = (v) => (Array.isArray(v) ? `[${v.map(py).join(', ')}]` : v && typeof v === 'object' ? `{${Object.entries(v).map(([k, q]) => `${JSON.stringify(k)}: ${py(q)}`).join(', ')}}` : JSON.stringify(v));
const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter((l) => !/^    "c_/.test(l));
const end = lines.lastIndexOf('  }');
lines[end - 1] = lines[end - 1].replace(/,?$/, ',');
const add = Object.entries(made).map(([k, v], i, all) => `    ${JSON.stringify(k)}: ${py(v)}${i < all.length - 1 ? ',' : ''}`);
lines.splice(end, 0, ...add);
fs.writeFileSync(FILE, lines.join('\n'));
JSON.parse(fs.readFileSync(FILE, 'utf8'));
console.log(`${n} camp bodies written to assets/game/folk/folk.json (c_<body>_1 to _3; men: ${MEN.join(', ')}; women: ${WOMEN.join(', ')})`);
