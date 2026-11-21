// node tools/paths/_cells.mjs x0 z0 x1 z1 ylo yhi : per half-metre cell the place in that height band (# reached, o not, X no fit)
import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
const [x0, z0, x1, z1, lo, hi] = process.argv.slice(2).map(Number);
const F = loadFine(), R = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
for (let z = z0; z <= z1; z += CELL) {
  let s = '';
  for (let x = x0; x <= x1; x += CELL) {
    const k = Math.floor((z - Z0) / CELL) * W + Math.floor((x - X0) / CELL);
    let c = '   .  ';
    for (let q = F.start[k]; q < F.start[k + 1]; q++) if (F.ys[q] > lo && F.ys[q] < hi) c = ' ' + F.ys[q].toFixed(1).padStart(4) + (F.fit[q] ? (R[q] === 1 ? '#' : R[q] === 2 ? 'r' : 'o') : 'X');
    s += c;
  }
  console.log(z.toFixed(1).padStart(7), s);
}
