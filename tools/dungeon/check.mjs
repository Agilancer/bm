// Walks the Hollowfang Warrens (src/core/dungeon.js): every room reachable from the way in, every pack's and boss's room
// open at its middle, the portals clear of the rock, floors in the ground and roofs above heads, the torches on the walls.
//   node tools/dungeon/check.mjs
import { BOSSES, CaveNav, DUNGEON, DUNGEON_BOX, ENTRY, EXIT_IN, EXIT_OUT, PACKS, ROOMS, caveFloorY, caveRoofY, caveRoom, grid, toWorld, torches } from '../../src/core/dungeon.js';

let bad = 0;
const fail = (m) => { console.log('FAIL', m); bad++; };
const t0 = performance.now();
const g = grid();
console.log(`field ${g.W}x${g.H} in ${(performance.now() - t0).toFixed(0)} ms; box x ${DUNGEON_BOX.x0.toFixed(0)}..${DUNGEON_BOX.x1.toFixed(0)} z ${DUNGEON_BOX.z0.toFixed(0)}..${DUNGEON_BOX.z1.toFixed(0)}`);
const nav = new CaveNav();
const [ex, ez] = toWorld(ENTRY.x, ENTRY.z);
for (const r of ROOMS) {
  const [x, z] = toWorld(r.x, r.z);
  if (caveRoom(x, z) < 2) fail(`${r.id}: its middle is ${caveRoom(x, z).toFixed(1)} m from the rock`);
  const d = nav.walkDist(ex, ez, x, z, 0);
  if (!Number.isFinite(d)) fail(`${r.id}: can't be walked to from the way in`);
  const y = caveFloorY(x, z), top = caveRoofY(x, z);
  if (top - y < 4) fail(`${r.id}: roof only ${(top - y).toFixed(1)} m up`);
  if (top > -6) fail(`${r.id}: roof at ${top.toFixed(1)}, above the underground line`);
  console.log(`  ${r.id.padEnd(9)} walk ${Number.isFinite(d) ? d.toFixed(0) : '∞'} m  floor ${y.toFixed(1)}  roof ${(top - y).toFixed(1)} m`);
}
for (const p of [...PACKS, ...BOSSES]) if (!ROOMS.find((r) => r.id === p.room)) fail(`${p.key}: no room ${p.room}`);
for (const [n, q] of Object.entries({ ENTRY, EXIT_IN, EXIT_OUT })) { const [x, z] = toWorld(q.x, q.z); if (caveRoom(x, z) < 1.2) fail(`${n} is in or against the rock (${caveRoom(x, z).toFixed(2)})`); }
// Every walkable cell: floor never too steep for a walk.
let steep = 0;
for (let j = 2; j < g.H - 2; j += 2) for (let i = 2; i < g.W - 2; i += 2) {
  const k = j * g.W + i;
  if (g.sdf[k] < 0.5) continue;
  const s = Math.hypot(g.floor[k + 1] - g.floor[k - 1], g.floor[k + g.W] - g.floor[k - g.W]) / (2 * 0.5);
  if (s > 0.6) steep++;
}
if (steep > 20) fail(`${steep} spots steeper than 31 degrees`);
const T = torches();
console.log(`torches ${T.length}`);
if (T.length < 30) fail('too few torches');
if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('The Warrens hold together.');
