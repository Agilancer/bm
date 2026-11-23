// What stands in a body's way in City State Phobos's streets and alleys, for the whole city at once: the crates, barrels,
// woodpiles, carts and lean-tos behind the houses, the goods by a shop's step, what stands along the streets (src/core/
// phobos-build.js keepProps). The near cells draw them only round the eye (src/gfx/phobos-near.js), so on their own they
// stopped nothing and auto-play walked through them. This builds every cell as from near, keeps what they'd put in the
// way, and writes it to src/core/phobos-props-data.js, which buildSites() stands up as colliders for the sim, the walking
// thread and the walking map's bake.
//   node tools/paths/props.mjs            (then tools/paths/bake.mjs, map.mjs, graph.mjs, trips.mjs: docs/PHOBOS-PATHS.md)
//   node tools/paths/props.mjs --check    (fails if the file isn't what the build makes now: tests/phobos-trails.test.mjs)
import fs from 'node:fs';
import { Kit } from '../../src/core/sites.js';
import { CASTLE_CELLS, inDoorway, phobosCell, phobosHouses, towerCells, wallCells } from '../../src/core/phobos-build.js';
import { cityTowers } from '../../src/core/phobos-towers.js';
import { packProps } from '../../src/core/phobos-props.js';

const cells = [...new Set([...phobosHouses().map((h) => h.cell), ...CASTLE_CELLS, ...towerCells(), ...wallCells(), ...cityTowers().map((t) => t.cell)])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const t0 = Date.now(), all = [];
for (const cell of cells) {
  const K = new Kit(false);
  K.props = [];
  phobosCell(K, cell);
  for (const c of K.props) all.push(c);
}
// (Nothing's set down in a doorway (inDoorway, K.clear): checked again here, so a prop made some other way can't trap a house.)
const clear = all.filter((c) => !inDoorway(c.x, c.z, Math.hypot(c.hx, c.hz)));
// Neighbours merged where one box round both is hardly bigger than the two: a row of crates and barrels along a back wall is
// one strip, a cart's wheels and bed one box. (Thirty thousand boxes were 3 MB a thread on a phone; the owner's rule is to
// save memory where it can be.)
function merge(list) {
  const corners = (c) => { const co = Math.cos(c.yaw), s = Math.sin(c.yaw); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [c.x + u * c.hx * co + v * c.hz * s, c.z - u * c.hx * s + v * c.hz * co]); };
  const union = (a, b) => {
    const co = Math.cos(a.yaw), s = Math.sin(a.yaw);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of [...corners(a), ...corners(b)]) { const dx = x - a.x, dz = z - a.z, u = dx * co - dz * s, v = dx * s + dz * co; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
    return { x: a.x + um * co + vm * s, z: a.z - um * s + vm * co, hx: (u1 - u0) / 2, hz: (v1 - v0) / 2, yaw: a.yaw, h: Math.max(a.h, b.h) };
  };
  const square = (a, b) => { const d = Math.abs(((a.yaw - b.yaw) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2)); return Math.min(d, Math.PI / 2 - d) < 0.12; };
  let boxes = list.filter((c) => c.b === undefined).map((c) => ({ x: c.x, z: c.z, hx: c.hx, hz: c.hz, yaw: c.yaw, h: c.h }));
  for (let pass = 0; pass < 6; pass++) {
    const grid = new Map(), key = (x, z) => Math.floor(x / 3) * 100000 + Math.floor(z / 3);
    boxes.forEach((c, i) => { const k = key(c.x, c.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    const gone = new Uint8Array(boxes.length);
    let n = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (gone[i]) continue;
      const a = boxes[i];
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const j of grid.get(key(a.x + di * 3, a.z + dj * 3)) || []) {
        if (j === i || gone[j] || gone[i]) continue;
        const b = boxes[j];
        if (!square(a, b) || Math.abs(a.h - b.h) > 1.2 || Math.hypot(a.x - b.x, a.z - b.z) > a.hx + a.hz + b.hx + b.hz + 0.6) continue;
        const U = union(a, b);
        if (4 * U.hx * U.hz > 1.2 * 4 * (a.hx * a.hz + b.hx * b.hz) + 0.15 || Math.min(U.hx, U.hz) > 0.9) continue;
        boxes[i] = Object.assign(a, U); gone[j] = 1; n++;
      }
    }
    boxes = boxes.filter((_, i) => !gone[i]);
    if (!n) break;
  }
  return boxes;
}
const merged = merge(clear);
console.log(`${all.length} boxes, ${all.length - clear.length} in a doorway left out, merged to ${merged.length}`);
const text = packProps(merged);
const out = new URL('../../src/core/phobos-props-data.js', import.meta.url);
if (process.argv.includes('--check')) {
  const was = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n') : '';
  if (was !== text) { console.log(`src/core/phobos-props-data.js is out of date: run node tools/paths/props.mjs (and rebake east.bin)`); process.exit(1); }
  console.log(`props up to date: ${merged.length} from ${cells.length} cells`);
} else {
  fs.writeFileSync(out, text);
  console.log(`${all.length} props from ${cells.length} cells in ${((Date.now() - t0) / 1000).toFixed(1)} s -> src/core/phobos-props-data.js (${(text.length / 1024).toFixed(0)} KB)`);
}
