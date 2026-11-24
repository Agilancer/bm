// node tools/paths/_wk.mjs ax az ay bx bz by : EastNav.walkable, sample by sample
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav } from '../../src/sim/east-nav.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const [ax, az, ay, bx, bz, by] = process.argv.slice(2).map(Number);
console.log('walkable', nav.walkable([ax, az, ay], [bx, bz, by]));
const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2); let y = ay;
for (let q = 1; q <= n; q++) { const x = ax + (bx - ax) * q / n, z = az + (bz - az) * q / n, g = Math.max(world.heightFor(x, z, y), world.topUnder(x, z, y + 0.2)); if (Math.abs(g - y) > 0.01 || q > n - 4) console.log(x.toFixed(2), z.toFixed(2), y.toFixed(2), '->', g.toFixed(2), 'land', world.landAt(x, z).toFixed(2)); y = g; }
