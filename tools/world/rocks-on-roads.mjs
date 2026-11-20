// Every boulder in the land that lies over a road, path, lane or flight of steps: walks every way, gathers the boulder cells
// beside it, and tests each boulder's real outline (src/core/rocks.js REACH) against the ways. node tools/world/rocks-on-roads.mjs [--list]
import { BOULDER_CELL, ROCK_FLOATS, REACH, roadEdge, rockRadius, rocksInCells } from '../../src/core/rocks.js';
import { allWays } from '../../src/core/roads.js';
import { nearFlight } from '../../src/core/roadbed.js';

const t0 = performance.now();
const cells = new Set();
for (const w of allWays(false)) {
  const pts = w.pts, m = w.w + 22;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 6));
    for (let k = 0; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
      for (let i0 = Math.floor((x - m) / BOULDER_CELL); i0 <= Math.floor((x + m) / BOULDER_CELL); i0++)
        for (let j0 = Math.floor((z - m) / BOULDER_CELL); j0 <= Math.floor((z + m) / BOULDER_CELL); j0++) cells.add(i0 * 100000 + j0);
    }
  }
}
let all = 0, walk = 0;
const bad = [];
for (const key of cells) {
  const j = ((key % 100000) + 100000) % 100000 > 50000 ? (key % 100000) - (key % 100000 > 0 ? 100000 : -100000) : key % 100000;
  const i = Math.round((key - j) / 100000);
  const b = rocksInCells(i, i + 1, j, j + 1, true);
  for (let o = 0; o < b.length; o += ROCK_FLOATS) {
    all++;
    const x = b[o], z = b[o + 2], size = b[o + 3], c = b[o + 4], s = b[o + 5], tall = b[o + 6], v = b[o + 8];
    if (!rockRadius(size, tall, v)) continue;   // (one you'd step over)
    walk++;
    let over = 0, step = false;
    for (let d = 0; d < 16; d++) {
      // (The outline in the rock's own frame, turned into the world's.)
      const a = d / 16 * 2 * Math.PI, r = REACH[v][d] * size * 0.92, lx = Math.cos(a) * r, lz = Math.sin(a) * r;
      const px = x + c * lx - s * lz, pz = z + s * lx + c * lz;
      const e = roadEdge(px, pz);
      if (e.d < 0) over = Math.max(over, -e.d);
      if (nearFlight(px, pz, 0)) step = true;
    }
    if (over > 0.05 || step) bad.push({ x: +x.toFixed(1), z: +z.toFixed(1), size: +size.toFixed(2), v, over: +over.toFixed(2), step });
  }
}
bad.sort((p, q) => q.over - p.over);
console.log(`${cells.size} cells, ${all} boulders by the ways, ${walk} big enough to walk into; ${bad.length} over a way (${bad.filter((q) => q.step).length} on steps), ${((performance.now() - t0) / 1000).toFixed(0)} s`);
