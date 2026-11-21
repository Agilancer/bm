import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine, cellsOf } from './map.mjs';
const F = loadFine(new URL('../build/paths/fine-old.bin', import.meta.url)), reach = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url)), c = cellsOf(F);
const sq = new Map();
for (let q = 0; q < F.n; q++) {
  if (reach[q] !== 1) continue;
  for (let d = 0; d < 4; d++) {
    const l = F.link[q * 4 + d]; if (l < 0) continue;
    const k = c[q], ni = (k % W) + [1, -1, 0, 0][d], nj = ((k / W) | 0) + [0, 0, 1, -1][d], p = F.start[nj * W + ni] + l;
    if (reach[p] === 2) { const x = X0 + (ni + 0.5) * CELL, z = Z0 + (nj + 0.5) * CELL, key = `${Math.floor(x / 20)}_${Math.floor(z / 20)}`; const s = sq.get(key) || sq.set(key, { x, z, y0: F.ys[q], y1: F.ys[p], n: 0 }).get(key); s.n++; }
  }
}
console.log([...sq.values()].sort((a, b) => b.n - a.n).slice(0, 30).map((s) => `${s.x.toFixed(1)},${s.z.toFixed(1)} ${s.y0.toFixed(2)}->${s.y1.toFixed(2)} x${s.n}`).join('\n'), '\nsquares', sq.size);
