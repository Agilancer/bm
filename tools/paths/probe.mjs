// What the walking map has along a line: node tools/paths/probe.mjs x0 z0 x1 z1 [step]
import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
const F = loadFine(), reach = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
const [x0, z0, x1, z1, st = 0.5] = process.argv.slice(2).map(Number);
const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / st));
for (let s = 0; s <= n; s++) {
  const x = x0 + (x1 - x0) * s / n, z = z0 + (z1 - z0) * s / n, i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL), k = j * W + i;
  const ps = [];
  for (let q = F.start[k]; q < F.start[k + 1]; q++) ps.push(`${F.ys[q].toFixed(2)}${F.fit[q] ? '' : 'X'}${['', 'R', 'r'][reach[q]]}[${[0, 1, 2, 3].map((d) => F.link[q * 4 + d]).join(',')}]`);
  console.log(x.toFixed(2), z.toFixed(2), ps.join('  '));
}
