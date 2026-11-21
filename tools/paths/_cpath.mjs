// node tools/paths/_cpath.mjs x y z "target name" : the long way's nodes from there, as route() picks its start
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav } from '../../src/sim/east-nav.js';
import { targets } from './targets.mjs';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const [x, y, z] = process.argv.slice(2, 5).map(Number), t = targets().find((q) => q.name === process.argv[5]);
const f = (n) => [nav.x[n], nav.y[n], nav.z[n]].map((v) => v.toFixed(1)).join(',');
let near = nav.nodesNear(x, z, y, 7, 4).filter((n) => nav.live[n]);
const st = nav.fine(x, y, z, near.slice(0, 24).map((n) => [nav.x[n], nav.z[n], nav.y[n], 0.6]), [x - 10, z - 10], [x + 10, z + 10], 6000);
const s0 = st ? near[st.mark] : near[0]; console.log('start', st ? 'fine' : 'near[0]', f(s0), st && st.pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' '));
const ends = nav.nodesNear(t.x, t.z, t.y, Math.max(4, Math.min(t.r + 2, 30)), t.y === null ? 1e9 : 3).filter((n) => nav.live[n]);
const P = nav.coarse([[s0, 0]], new Set(ends.slice(0, 64)), t.x, t.z);
console.log(P.slice(0, 20).map(f).join('  '));
