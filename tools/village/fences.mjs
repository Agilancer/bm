// Do the town's fences stand clear of its roads, and out of its houses?  node tools/village/fences.mjs
// (Their lines come out of tools/village/build_village.py, in village.json.) Fails if a fence crosses a road, or comes within CLEAR metres of one's edge, or of a house.
import { readFileSync } from 'node:fs';
import { PATHS, segDist2 } from '../../src/core/terrain.js';

const CLEAR = 1.0;
const v = JSON.parse(readFileSync(new URL('../../assets/game/village.json', import.meta.url)));
let bad = 0;
v.fences.forEach((f, i) => {
  for (let s = 0; s + 1 < f.length; s++) {
    const [ax, az] = f[s], [bx, bz] = f[s + 1];
    let road = 1e9, which = -1, house = 1e9;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      PATHS.forEach((p, pi) => {
        for (let k = 0; k + 1 < p.pts.length; k++) {
          const d = Math.sqrt(segDist2(x, z, p.pts[k][0], p.pts[k][1], p.pts[k + 1][0], p.pts[k + 1][1])) - p.w;
          if (d < road) { road = d; which = pi; }
        }
      });
      for (const c of v.footprints) {
        const co = Math.cos(c.yaw), si = Math.sin(c.yaw), dx = x - c.x, dz = z - c.z;
        const qx = Math.abs(dx * co - dz * si) - c.hx, qz = Math.abs(dx * si + dz * co) - c.hz;
        house = Math.min(house, Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0));
      }
    }
    const ok = road >= CLEAR && house >= CLEAR;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'BAD '} fence ${i} (${ax}, ${az}) to (${bx}, ${bz}): ${road.toFixed(2)} m from road ${which}'s edge, ${house.toFixed(2)} m from a house`);
  }
});
console.log(bad ? `${bad} bad` : 'all clear');
process.exit(bad ? 1 : 0);
