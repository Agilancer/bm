// What stands in the land against what has to stay clear: no collider on a road (ROUTES, to its worn width), on a seal's
// dais, or on a spot where somebody stands (K.spots); and how many triangles the places are. node tools/lands/check-sites.mjs
import { ROUTES, SITES } from '../../src/core/lands.js';
import { SEALS, buildSites } from '../../src/core/sites.js';
import { terrainHeight } from '../../src/core/terrain.js';

const B = buildSites();
// Is (x, z) within r of collider c's box?
const hits = (c, x, z, r) => {
  const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw || 0), sn = Math.sin(c.yaw || 0);
  const u = dx * cs - dz * sn, w = dx * sn + dz * cs;
  return Math.hypot(Math.max(Math.abs(u) - c.hx, 0), Math.max(Math.abs(w) - c.hz, 0)) < r;
};
// (Only what's out in the land: the Warrens and the Test Dungeon lie past the world's edge.)
const cols = B.colliders.filter((c) => Math.abs(c.x) < 5600 && Math.abs(c.z) < 5600 && c.t === undefined);
const near = (x, z, r) => cols.filter((c) => Math.abs(c.x - x) < 80 && Math.abs(c.z - z) < 80 && hits(c, x, z, r));
let bad = 0;
const say = (what, x, z, c) => { bad++; if (bad < 60) console.log(`BLOCKED: ${what} at (${x.toFixed(1)}, ${z.toFixed(1)}) by a collider at (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) ${c.hx.toFixed(1)} x ${c.hz.toFixed(1)}`); };
for (const r of ROUTES) for (let i = 0; i + 1 < r.pts.length; i++) {
  const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az));
  if (Math.hypot(ax, az) < 1100 && Math.hypot(bx, bz) < 1100) continue;
  let last = null;
  for (let k = 0; k <= n; k++) {
    const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
    for (const c of near(x, z, r.w * 0.8)) if (c !== last) { say(r.name, x, z, c); last = c; }
  }
}
for (const s of SEALS) for (const c of near(s.x, s.z, 3.7)) say(`the seal of ${s.name}`, s.x, s.z, c);
for (const [k, p] of Object.entries(B.spots)) {
  if (k.startsWith('seal_') || k.endsWith('_portal') || Math.abs(p[0]) > 5600 || Math.abs(p[2]) > 5600) continue;   // (seals, and the dungeons' own)
  for (const c of near(p[0], p[2], 1.2)) say(`spot ${k}`, p[0], p[2], c);
  const g = terrainHeight(p[0], p[2]); let slope = 0;
  for (let a = 0; a < 8; a++) slope = Math.max(slope, Math.abs(terrainHeight(p[0] + Math.cos(a * 0.785) * 2, p[2] + Math.sin(a * 0.785) * 2) - g));
  if (slope > 0.6) { bad++; console.log(`SLOPE: spot ${k} at (${p[0].toFixed(1)}, ${p[2].toFixed(1)}): ${slope.toFixed(2)} m in 2 m`); }
}
// The middles kept for a dungeon's portal: 7 m round the Howling Mouth's, and the ground before Blackvigil's gate.
for (const [what, x, z, r] of [['the Howling Mouth', SITES.deepsmouth.x, SITES.deepsmouth.z, 7], ["Blackvigil's gate", SITES.keep.x + 86, SITES.keep.z, 9]]) {
  for (const c of near(x, z, r)) say(`the portal's ground at ${what}`, x, z, c);
}
let tris = 0; for (const p of B.parts.values()) tris += p.idx.length / 3;
if (process.argv.includes('--spots')) for (const [k, p] of Object.entries(B.spots)) if (!k.startsWith('seal_')) console.log(k.padEnd(18), p.map((v) => +v.toFixed(2)).join(', '));
if (process.argv.includes('--seals')) for (const s of SEALS) console.log(s.key.padEnd(12), s.x, s.z);
console.log(`${tris} triangles, ${B.colliders.length} colliders, ${Object.keys(B.spots).length} spots, ${SEALS.length} seals`);
console.log(bad ? `${bad} blocked` : 'roads, seals and spots are clear');
process.exit(bad ? 1 : 0);
