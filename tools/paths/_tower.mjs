import fs from 'node:fs';
import { CELL, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
import { castleTowers } from '../../src/core/phobos-build.js';
const F = loadFine(), R = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
const CT = castleTowers();
const only = process.argv[2];
for (const t of CT.towers) {
  if (t.buried || (only && t.key !== only)) continue;
  const cx = t.tx ?? t.x, cz = t.tz ?? t.z, rr = 6;
  let hi = -1e9, hiAny = -1e9, n = 0, nr = 0;
  for (let z = cz - rr; z <= cz + rr; z += CELL) for (let x = cx - rr; x <= cx + rr; x += CELL) {
    const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL), k = j * W + i;
    for (let q = F.start[k]; q < F.start[k + 1]; q++) { if (!F.fit[q]) continue; n++; hiAny = Math.max(hiAny, F.ys[q]); if (R[q] === 1) { nr++; hi = Math.max(hi, F.ys[q]); } }
  }
  console.log(t.key.padEnd(9), t.kind.padEnd(6), 'from', (t.from ?? NaN).toFixed(0).padStart(4), 'deck', (t.deck ?? NaN).toFixed(0).padStart(4), 'top place', hiAny.toFixed(0).padStart(4), 'reached', hi.toFixed(0).padStart(5), `${nr}/${n}`);
}
