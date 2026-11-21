// How long EastNav.route takes from the gate road to every target: node tools/paths/_asks.mjs [kind]
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav, EAST_DOOR } from '../../src/sim/east-nav.js';
import { targets } from './targets.mjs';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const [dx, dz] = EAST_DOOR, dy = nav.ground(dx, dz, -100), L = [];
for (const t of targets().filter((q) => !process.argv[2] || q.kind === process.argv[2])) {
  const t0 = performance.now(), P = nav.route([dx, dy, dz], [t.x, t.z, t.y ?? NaN], t.r), ms = performance.now() - t0;
  L.push([ms, t.kind, t.name, P ? P.length : 'NONE']);
}
L.sort((a, b) => b[0] - a[0]);
for (const q of L.slice(0, 12)) console.log(q[0].toFixed(0).padStart(6), 'ms', ...q.slice(1));
