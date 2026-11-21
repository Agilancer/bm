// node tools/paths/_h.mjs x z0 z1 y : heightFor / topUnder / fits along z at x, feet at y
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const [x, z0, z1, y, dx = 0] = process.argv.slice(2).map(Number);
const t = [0, 0, 0];
for (let k = 0; k <= 20; k++) { const z = z0 + (z1 - z0) * k / 20, xx = x + dx * k / 20; t[0] = xx; t[2] = z; world.resolve(t, 0.36, y + 0.2, true); console.log(xx.toFixed(2), z.toFixed(2), 'hF', world.heightFor(xx, z, y).toFixed(2), 'tU', world.topUnder(xx, z, y + 0.2).toFixed(2), 'push', (t[0] - xx).toFixed(2), (t[2] - z).toFixed(2), 'land', world.landAt(xx, z).toFixed(2)); }
