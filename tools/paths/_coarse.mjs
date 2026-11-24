import fs from 'node:fs';
import { EastNav } from '../../src/sim/east-nav.js';
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), {});
const seen = fs.readFileSync(new URL('../build/paths/gseen.bin', import.meta.url));
const s = nav.nodesNear(9240, 0, 37.7, 7, 4), e = nav.nodesNear(10988.4, 87.9, 358.6, 7, 3);
console.log('start in flood', s.map((n) => seen[n]).join(''), 'ends in flood', e.map((n) => seen[n]).join(''));
for (const b of [400000, 2000000, 8000000]) { const t0 = performance.now(); const p = nav.coarse([[s[0], 0]], new Set(e), 10988.4, 87.9, b); console.log('budget', b, p ? p.length : 'NONE', (performance.now() - t0).toFixed(0), 'ms'); }
