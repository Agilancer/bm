// Each side of Phobos's wall: at ten points along it, the walk's place there (the highest under 200) and whether it's reached.
import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
import { CITY_WALL } from '../../src/core/east.js';
const F = loadFine(), R = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
for (let i = 0; i < 12; i++) {
  const a = CITY_WALL[i], b = CITY_WALL[(i + 1) % 12];
  let s = '';
  for (let k = 1; k < 20; k++) {
    const x = a[0] + (b[0] - a[0]) * k / 20, z = a[1] + (b[1] - a[1]) * k / 20, c = Math.floor((z - Z0) / CELL) * W + Math.floor((x - X0) / CELL);
    let best = -1;
    for (let q = F.start[c]; q < F.start[c + 1]; q++) if (F.ys[q] < 200 && (best < 0 || F.ys[q] > F.ys[best])) best = q;
    s += best < 0 ? ' ' : !F.fit[best] ? 'x' : R[best] === 1 ? '#' : R[best] === 2 ? 'r' : '.';
    if (k === 10) s += `(${best < 0 ? '-' : F.ys[best].toFixed(0)})`;
  }
  console.log(i, a.map((v) => v.toFixed(0)).join(','), '->', b.map((v) => v.toFixed(0)).join(','), s);
}
