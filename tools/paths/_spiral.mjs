// node tools/paths/_spiral.mjs cx cz r a0 turn y0 : a body's feet carried round a spiral stair's middle line, step by step
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav } from '../../src/sim/east-nav.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const [cx, cz, r, a0, turn, y0] = process.argv.slice(2).map(Number);
let y = y0;
for (let k = 0; k <= 80; k++) {
  const a = a0 + turn * k / 80, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
  const g = Math.max(world.heightFor(x, z, y), world.topUnder(x, z, y + 0.2));
  console.log(k, x.toFixed(1), z.toFixed(1), 'y', y.toFixed(2), '->', g.toFixed(2), 'fits', nav.fits(x, z, g), 'roomy', nav.fits(x, z, g, 0.62));
  y = g;
}
