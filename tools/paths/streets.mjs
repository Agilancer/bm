// How much of auto-play's ways about City State Phobos keep to its streets (src/sim/east-nav.js WAY_COST): routes between
// places in the city, walked out whole, and the share of each on a street (inside a street's width of its middle).
//   node tools/paths/streets.mjs
import { readFileSync } from 'node:fs';
import { World } from '../../src/sim/world.js';
import { EastNav, WAY_COST } from '../../src/sim/east-nav.js';
import { PHOBOS } from '../../src/core/phobos-data.js';

const R = (p) => readFileSync(new URL(`../../${p}`, import.meta.url));
const world = new World(JSON.parse(R('assets/game/village.json')), JSON.parse(R('assets/game/interior/interior.json')));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(R('assets/game/nav/east.bin'), world);
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z); };
// (A place's ground, to set out from.)
export const at = (a) => [a[0], world.heightFor(a[0], a[1], 200), a[1]];
export const onStreet = (x, z) => PHOBOS.streets.some((st) => st.pts.some((p, i) => i + 1 < st.pts.length && segD(x, z, p, st.pts[i + 1]) < st.w + 0.5));
// The whole way, walked out: asked again from where each answer's walking stops, as auto-play does.
export function walk(from, to, r = 2) {
  let at = from, all = [[from[0], from[2]]], t0 = performance.now();
  for (let n = 0; n < 40; n++) {
    const pts = nav.route(at, to, r);
    if (!pts) return null;
    const out = pts.filter((p) => p[2] !== 2);
    for (const p of out.slice(1)) all.push([p[0], p[1]]);
    const L = out.at(-1);
    if (Math.hypot(L[0] - to[0], L[1] - to[1]) <= r + 0.5 || out.length < 2) break;
    at = [L[0], L[4], L[1]];
  }
  return { pts: all, ms: performance.now() - t0 };
}
export const share = (pts) => { let on = 0, off = 0; for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L)); for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n; if (onStreet(x, z)) on += L / n; else off += L / n; } } return { on, off }; };
// Places in the city a way is often walked between: the gate's square, Chainmarket, the Pennyless' Purse, the districts' middles.
const D = Object.fromEntries(PHOBOS.districts.map((d) => [d.key, d]));
export const TRIPS = [
  [[9360, 0], [9830, -110]], [[9830, -110], [9613, -289]], [[9440, 0], [9613, -289]], [[9640, 340], [9830, -110]],
  [[9440, 0], [9930, 380]], [[9640, -380], [9640, 340]], [[9960, 630], [9440, 0]], [[10000, -600], [9830, -110]],
];
if (process.argv[1]?.endsWith('streets.mjs')) {
  console.log('costs', WAY_COST);
  let ON = 0, OFF = 0;
  for (const [a, b] of TRIPS) {
    const w = walk(at(a), [b[0], b[1], null]);
    if (!w) { console.log(`${a} -> ${b}: no way`); continue; }
    const { on, off } = share(w.pts); ON += on; OFF += off;
    console.log(`${a} -> ${b}: ${Math.round(on + off)} m, ${(100 * on / (on + off)).toFixed(0)}% on the streets, ${w.ms.toFixed(0)} ms`);
  }
  console.log(`all: ${(100 * ON / (ON + OFF)).toFixed(0)}% on the streets`);
  void D;
}
