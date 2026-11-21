// node tools/paths/_house.mjs x z : the Phobos house nearest, its stair's treads in the world, and the map's places at each.
import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
import { phobosHouses, upstairs, footing } from '../../src/core/phobos-build.js';
const [x, z] = process.argv.slice(2).map(Number);
const H = phobosHouses().sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
const F0 = footing(H), c = Math.cos(H.yaw), s = Math.sin(H.yaw), up = upstairs(H, { ...F0, c, s });
console.log('house', H.x.toFixed(1), H.z.toFixed(1), 'yaw', H.yaw.toFixed(2), 'hx', H.hx, 'hz', H.hz, 'front', H.front, 'fy', up?.fy, 'uy', up?.uy);
const F = loadFine(), R = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
for (const [lx, lz, y] of up?.steps || []) {
  const wx = H.x + lx * c + lz * s, wz = H.z - lx * s + lz * c, k = Math.floor((wz - Z0) / CELL) * W + Math.floor((wx - X0) / CELL), ps = [];
  for (let q = F.start[k]; q < F.start[k + 1]; q++) ps.push(F.ys[q].toFixed(2) + (F.fit[q] ? '' : 'X') + ['', 'R', 'r'][R[q]]);
  console.log(wx.toFixed(2), wz.toFixed(2), 'tread', y.toFixed(2), '|', ps.join(' '));
}
