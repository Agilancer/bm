// Bakes where Phobos's street crowd sleep (src/folk/phobos-homes.js, from the houses' own plans) into src/folk/phobos-beds.js,
// so the townsfolk's thread needn't lay out the whole city's ten thousand houses to find 333 beds (about 100 MB and a
// second and a half of it, on a phone). tests/phobos-crowd.test.mjs checks the baked file is what the plans say.
//   node tools/homes/bake-beds.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { bedOf } from '../../src/folk/phobos-homes.js';
import { CROWD } from '../../src/folk/people.js';
import { phobosHouses } from '../../src/core/phobos-build.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
export function bakedBeds() {
  const H = phobosHouses(), out = {};
  for (const p of CROWD) {
    const b = bedOf(p.id);
    if (!b) continue;
    const h = H[b.house], e = b.edge;
    // [house, house x, house z, x, y, z, yaw, level, kind (0 bed, 1 pallet), middle x, middle z, half width, side, edge x, edge z, edge y, edge yaw, blanket]
    out[p.id] = [b.house, r3(h.x), r3(h.z), r3(b.x), r3(b.y), r3(b.z), r3(b.yaw), b.level, b.kind === 'pallet' ? 1 : 0, r3(b.cx), r3(b.cz), r3(b.hu), b.side, r3(e.x), r3(e.z), r3(e.y), r3(e.yaw), b.blanket];
  }
  return out;
}
export const BAKED = new URL('../../src/folk/phobos-beds.js', import.meta.url);
export function bakedText() {
  const rows = Object.entries(bakedBeds()).map(([id, a]) => `  ${id}: ${JSON.stringify(a)},`);
  return `// Where Phobos's street crowd sleep: baked by tools/homes/bake-beds.mjs from src/folk/phobos-homes.js (the houses' own plans,
// src/core/phobos-rooms.js). Don't edit: run it again when the houses or their rooms change.
// id: [house, house x, house z, x, y, z, yaw, level, kind (0 bed, 1 pallet), middle x, middle z, half width, side, edge x, edge z, edge y, edge yaw, blanket]
const ROWS = {
${rows.join('\n')}
};
const BEDS = new Map();
// The bed of person id, as phobos-homes.js bedOf gives it (and hx, hz: their house's middle), or null.
export function bakedBed(id) {
  if (BEDS.has(id)) return BEDS.get(id);
  const a = ROWS[id];
  const b = a ? { house: a[0], hx: a[1], hz: a[2], x: a[3], y: a[4], z: a[5], yaw: a[6], level: a[7], kind: a[8] ? 'pallet' : 'bed', cx: a[9], cz: a[10], hu: a[11], side: a[12], blanket: a[17],
    edge: { x: a[13], z: a[14], y: a[15], yaw: a[16], level: a[7] } } : null;
  BEDS.set(id, b);
  return b;
}
`;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const text = bakedText();
  if (process.argv.includes('--check')) { const same = readFileSync(BAKED, 'utf8').replace(/\r/g, '') === text; console.log(same ? 'baked beds are current' : 'STALE: run node tools/homes/bake-beds.mjs'); process.exit(same ? 0 : 1); }
  writeFileSync(BAKED, text);
  console.log('baked', Object.keys(bakedBeds()).length, 'beds into src/folk/phobos-beds.js');
}
