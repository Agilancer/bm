// Where a trap meets the rest: node tools/paths/_border.mjs x0 z0 x1 z1 ylo yhi — cells reached one way only (r) next to cells
// reached both ways (#), with their heights.
import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
const [x0, z0, x1, z1, lo, hi] = process.argv.slice(2).map(Number);
const F = loadFine(), R = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
const at = (x, z) => Math.floor((z - Z0) / CELL) * W + Math.floor((x - X0) / CELL);
let n = 0;
for (let z = z0; z <= z1; z += CELL) for (let x = x0; x <= x1; x += CELL) {
  const k = at(x, z);
  for (let q = F.start[k]; q < F.start[k + 1]; q++) {
    if (R[q] !== 2 || F.ys[q] < lo || F.ys[q] > hi) continue;
    for (const [dx, dz] of [[CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL]]) {
      const j = at(x + dx, z + dz);
      for (let p = F.start[j]; p < F.start[j + 1]; p++) if (R[p] === 1 && Math.abs(F.ys[p] - F.ys[q]) < 6 && n++ < 30) console.log(x, z, F.ys[q].toFixed(2), '->', x + dx, z + dz, F.ys[p].toFixed(2));
    }
  }
}
console.log(n, 'borders');
