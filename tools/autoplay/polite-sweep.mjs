// Every way across Bellmourn the polite pathing (src/sim/nav.worker.js `politePath`) finds against the plain one: from a few
// starting points to every reachable spot on a 5 m grid. Lists any the plain way reaches and the polite one doesn't, or
// ends further off, and the worst detours.
//   node tools/autoplay/polite-sweep.mjs
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
import { navFor } from '../../src/sim/nav.worker.js';
import { TOWN } from '../../src/core/town.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const nav = navFor(new World(read('assets/game/village.json'), interior), interior);
const len = (a, pts) => { let s = 0, [px, pz] = a; for (const [x, z] of pts || []) { s += Math.hypot(x - px, z - pz); [px, pz] = [x, z]; } return s; };
const end = (pts, to) => (pts?.length ? Math.hypot(pts.at(-1)[0] - to[0], pts.at(-1)[1] - to[1]) : Infinity);

const FROM = [[17.1, -2.3], [1.5, 4], [-26, 0], [62.6, 1.5], [12.5, -30]];
let n = 0, lost = [], worse = [], slow = 0, t0 = performance.now();
for (const from of FROM) {
  for (let x = TOWN.x0; x <= TOWN.x1; x += 5) for (let z = TOWN.z0; z <= TOWN.z1; z += 5) {
    if (nav.solidAt?.(x, z)) continue;
    const to = [x, z];
    const a = nav.path(from, to, []);
    if (!a?.length || end(a, to) > 1.5) continue;
    n++;
    const t = performance.now();
    const b = nav.politePath(from, to, []);
    if (performance.now() - t > 60) slow++;
    if (!b?.length || end(b, to) > 1.5) lost.push({ from, to, plainEnd: +end(a, to).toFixed(2), politeEnd: +end(b, to).toFixed(2), politeLen: b?.length ?? null });
    else if (len(from, b) > len(from, a) * 1.8 + 10) worse.push({ from, to, plain: Math.round(len(from, a)), polite: Math.round(len(from, b)) });
  }
}
console.log(`${n} ways in ${((performance.now() - t0) / 1000).toFixed(1)} s; ${lost.length} the polite way doesn't reach; ${worse.length} much further round; ${slow} over 60 ms`);
for (const l of lost.slice(0, 15)) console.log('lost', JSON.stringify(l));
for (const w of worse.sort((p, q) => q.polite / q.plain - p.polite / p.plain).slice(0, 8)) console.log('round', JSON.stringify(w));
