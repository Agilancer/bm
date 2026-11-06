// Is anything standing on a road or a lane? Walks every path in src/core/terrain.js, its middle and a player's width either side, against
// everything solid from the village build.  node tools/village/paths_clear.mjs
import { readFileSync } from 'node:fs';
import { PATHS } from '../../src/core/terrain.js';

const v = JSON.parse(readFileSync(new URL('../../assets/game/village.json', import.meta.url)));
const boxes = v.colliders.map((c) => ({ ...c, s: Math.sin(c.yaw || 0), co: Math.cos(c.yaw || 0) }));
const R = 0.5;   // a player and a little room
const hits = new Map();
PATHS.forEach((path, n) => {
  const start = path.pts[0], end = path.pts[path.pts.length - 1];
  for (let i = 0; i + 1 < path.pts.length; i++) {
    const [ax, az] = path.pts[i], [bx, bz] = path.pts[i + 1], L = Math.hypot(bx - ax, bz - az) || 1;
    if (Math.abs(ax) > 130 || Math.abs(az) > 130) continue;
    for (let s = 0; s <= L; s += 0.4) {
      const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L;
      for (const c of boxes) {
        const dx = x - c.x, dz = z - c.z;
        if (Math.abs(dx * c.co - dz * c.s) < c.hx + R && Math.abs(dx * c.s + dz * c.co) < c.hz + R) {
          const key = `${c.x.toFixed(1)},${c.z.toFixed(1)} ${(c.hx * 2).toFixed(1)}x${(c.hz * 2).toFixed(1)} h${(c.h ?? 0).toFixed(1)}`;
          if (!hits.has(key)) hits.set(key, `path ${n} (${start}..${end}) at ${x.toFixed(1)},${z.toFixed(1)}`);
        }
      }
    }
  }
});
for (const [k, w] of hits) console.log(k, ' on ', w);
console.log(hits.size ? `${hits.size} in the way` : 'all clear');
process.exitCode = hits.size ? 1 : 0;
