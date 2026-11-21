// Floors of a stair near (x, z) between heights: node tools/paths/_tread.mjs x z r ylo yhi
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const [x, z, r, lo, hi] = process.argv.slice(2).map(Number), seen = new Set();
for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) {
  for (let y = lo; y <= hi; y += 0.5) {
    const h = world.heightFor(x + dx, z + dz, y), k = h.toFixed(2);
    if (h > lo && h < hi && !seen.has(k)) { seen.add(k); console.log(k, (x + dx).toFixed(2), (z + dz).toFixed(2), 'land', world.landAt(x + dx, z + dz).toFixed(1)); }
  }
}
