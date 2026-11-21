// node tools/paths/_at.mjs x y z "target name" : EastNav.route from that spot, its first points
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav } from '../../src/sim/east-nav.js';
import { targets } from './targets.mjs';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const [x, y, z] = process.argv.slice(2, 5).map(Number), to = targets().find((t) => t.name === process.argv[5]);
const near = nav.nodesNear(x, z, y, 7, 4);
console.log('near', near.slice(0, 8).map((n) => [nav.x[n], nav.y[n], nav.z[n], nav.live[n]].map((v) => (+v).toFixed(1)).join(',')).join(' | '));
const P = nav.route([x, y, z], [to.x, to.z, to.y], to.r);
console.log(P ? P.slice(0, +(process.argv[6] || 14)).map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1) + '/' + (p[4] ?? 0).toFixed(1) + (p[2] === 2 ? 'c' : '')).join('  ') : 'NONE');
