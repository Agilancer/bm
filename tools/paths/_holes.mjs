// node tools/paths/_holes.mjs x0 z0 x1 z1 y : where a body at y in that box has nothing under it within 1.2 m (holes in a deck)
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const [x0, z0, x1, z1, y] = process.argv.slice(2).map(Number);
for (let z = z0; z <= z1; z += 0.25) { let s = ''; for (let x = x0; x <= x1; x += 0.25) { const g = Math.max(world.heightFor(x, z, y), world.topUnder(x, z, y + 0.2)); s += y - g < 0.3 ? '#' : y - g < 1.2 ? '+' : '.'; } console.log(z.toFixed(2).padStart(8), s); }
