// The two-letter rule out in the land: no seal (the order's, so Tessariel's) and no Tessariel place within 1.5 km of a
// Velscour place. node tools/lands/check-vt.mjs
import { SITES } from '../../src/core/lands.js';
import { SEALS } from '../../src/core/sites.js';
const V = Object.entries(SITES).filter(([, s]) => s.keep);
const T = Object.entries(SITES).filter(([, s]) => s.light).map(([k, s]) => [k, s.x, s.z]).concat(SEALS.map((s) => [`seal:${s.key}`, s.x, s.z]));
let bad = 0;
for (const [vk, v] of V) for (const [tk, x, z] of T) {
  const d = Math.hypot(v.x - x, v.z - z);
  if (d < 1500) { console.log(`TOO NEAR: ${vk} and ${tk}, ${d.toFixed(0)} m`); bad++; }
}
console.log(bad ? `${bad} too near` : 'V and T kept apart: every pair over 1.5 km');
process.exit(bad ? 1 : 0);
