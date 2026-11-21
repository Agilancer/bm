// node tools/paths/_layer.mjs x z r ylo yhi : the places at those heights round (x, z), as a picture (# reached, r trap, . not)
import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
const [x, z, r, lo, hi] = process.argv.slice(2).map(Number);
const F = loadFine(), R = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
for (let zz = z - r; zz <= z + r; zz += 1) {
  let s = '';
  for (let xx = x - r; xx <= x + r; xx += 1) {
    const k = Math.floor((zz - Z0) / CELL) * W + Math.floor((xx - X0) / CELL);
    let c = ' ';
    for (let q = F.start[k]; q < F.start[k + 1]; q++) if (F.ys[q] >= lo && F.ys[q] <= hi) c = !F.fit[q] ? 'x' : R[q] === 1 ? '#' : R[q] === 2 ? 'r' : '.';
    s += c;
  }
  console.log(s);
}
