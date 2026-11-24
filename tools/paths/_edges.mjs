// node tools/paths/_edges.mjs x z y [r] : east.bin's nodes near there and the steps out of each
import fs from 'node:fs';
import { EastNav } from '../../src/sim/east-nav.js';
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), {});
const [x, z, y, r = 4] = process.argv.slice(2).map(Number), f = (n) => [nav.x[n], nav.y[n], nav.z[n]].map((v) => v.toFixed(1)).join(',');
for (const n of nav.nodesNear(x, z, y, r, 3)) { const o = []; for (let e = nav.eStart[n]; e < nav.eStart[n + 1]; e++) o.push(f(nav.eTo[e])); console.log(n, f(n), '->', o.join('  ')); }
