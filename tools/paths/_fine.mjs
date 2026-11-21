// node tools/paths/_fine.mjs x y z tx tz ty [box] : EastNav.fine from a spot to a spot (live world, no east.bin), its points
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav } from '../../src/sim/east-nav.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const [x, y, z, tx, tz, ty, b = 25] = process.argv.slice(2).map(Number);
const f = nav.fine(x, y, z, [[tx, tz, ty, 1]], [Math.min(x, tx) - b, Math.min(z, tz) - b], [Math.max(x, tx) + b, Math.max(z, tz) + b], 400000);
console.log(f ? f.pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('  ') : 'NONE');
