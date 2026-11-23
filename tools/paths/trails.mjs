// City State Phobos's trails (src/core/phobos-trails.js): from every place auto-play goes in the east to the streets and the
// Throne Road, walked on the east's own walking map (assets/game/nav/east.bin), so none runs through a wall, a yard or a
// stall. The places: tools/paths/targets.mjs's (each delve's way in, the gates, hubs, forts, districts, towers, bridges),
// everyone posted in the east (src/folk/people.js POSTED), the lairs (src/core/tripo-monsters.js LAIRS) and the sites.
// Nearest the streets first, and each one laid is a trail the next may join, so they grow out from the roads as a tree.
//   node tools/paths/trails.mjs           (after graph.mjs; then trips.mjs: docs/PHOBOS-PATHS.md)
//   node tools/paths/trails.mjs --check   (fails if the file isn't what this makes now from east.bin)
import fs from 'node:fs';
import { targets } from './targets.mjs';
import { EastNav, TRAIL_NEAR, inEast } from '../../src/sim/east-nav.js';
import { trailRoots } from '../../src/core/phobos-trails.js';
import { POSTED } from '../../src/folk/people.js';
import { LAIRS } from '../../src/core/tripo-monsters.js';
import { SITES } from '../../src/core/lands.js';

const t0 = Date.now();
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const { World } = await import('../../src/sim/world.js');
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
const roots = trailRoots();
nav.setTrails(roots);

// The places, a few metres apart at least.
const spots = [];
const add = (name, x, z) => { if (inEast(x, z) && !spots.some((s) => Math.hypot(s.x - x, s.z - z) < 6)) spots.push({ name, x, z }); };
for (const t of targets()) add(`${t.kind}: ${t.name}`, t.x, t.z);
for (const p of POSTED) if (p.post) add(p.id, p.post[0], p.post[1]);
for (const l of LAIRS) add(`lair:${l.key}`, l.x, l.z);
for (const [k, s] of Object.entries(SITES)) if (s && Number.isFinite(s.x)) add(k, s.x, s.z);

// Where each is walked from: the nearest node the gate gets to, and how far it is from the trails so far.
const rootPts = roots.flat();
const nearRoot = (x, z) => { let b = Infinity, p = null; for (const q of rootPts) { const d = Math.hypot(q[0] - x, q[1] - z); if (d < b) { b = d; p = q; } } return [b, p]; };
for (const s of spots) {
  // (A tower's foot or a lair up on the castle's walls: what's walkable nearest it, up to 25 m off.)
  let near = nav.nodesNear(s.x, s.z, null, 10, 1e9).filter((n) => nav.live[n]);
  if (!near.length) near = nav.nodesNear(s.x, s.z, null, 25, 1e9).filter((n) => nav.live[n]);
  s.node = near.length ? near[0] : -1;
  [s.d] = nearRoot(s.x, s.z);
}
const mark = (pts) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
    for (let k = 0; k <= n; k++) for (const q of nav.nodesNear(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, a[2] + (b[2] - a[2]) * k / n, TRAIL_NEAR, 2)) nav.onTrail[q] |= 1;
  }
};
// (Straightened where it's walkable straight: the fewest points that keep to the nodes' line within a metre, and to its rise.)
const simplify = (P) => {
  const keep = [P[0]];
  let i = 0;
  while (i < P.length - 1) {
    let j = i + 1;
    for (let k = P.length - 1; k > i + 1; k--) {
      const a = P[i], b = P[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let ok = true;
      for (let q = i + 1; q < k && ok; q++) {
        const c = P[q], t = ((c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1])) / (L * L);
        const off = Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / L, y = a[2] + (b[2] - a[2]) * Math.max(0, Math.min(1, t));
        if (off > 1 || Math.abs(c[2] - y) > 0.5) ok = false;
      }
      if (ok) { j = k; break; }
    }
    keep.push(P[j]);
    i = j;
  }
  return keep;
};
const out = [], fails = [];
spots.sort((a, b) => a.d - b.d);
for (const s of spots) {
  if (s.node < 0) { fails.push(`${s.name}: no walkable ground near`); continue; }
  if (nav.onTrail[s.node] & 1) continue;
  const goal = new Set();
  for (let n = 0; n < nav.onTrail.length; n++) if (nav.onTrail[n] & 1 && nav.live[n]) goal.add(n);
  // (Out of people's houses but the one it starts in: EastNav INDOORS.)
  nav.homes = [[s.x, s.z]];
  const [, p] = nearRoot(s.x, s.z);
  const path = nav.coarse([[s.node, 0]], goal, p[0], p[1]);
  if (!path) { fails.push(`${s.name}: no way to a street`); continue; }
  const pts = simplify(path.map((n) => [nav.x[n], nav.z[n], nav.y[n]])).map((q) => q.map((v) => Math.round(v * 10) / 10));
  if (pts.length < 2) continue;
  out.push({ name: s.name, pts });
  mark(pts);
}
const metres = out.reduce((s, t) => s + t.pts.reduce((a, q, i) => a + (i ? Math.hypot(q[0] - t.pts[i - 1][0], q[1] - t.pts[i - 1][1]) : 0), 0), 0);
const text = `// Made by tools/paths/trails.mjs from assets/game/nav/east.bin: don't edit. ${out.length} trails, ${Math.round(metres)} m (src/core/phobos-trails.js).\nexport const TRAILS = [\n${out.map((t) => `  { name: ${JSON.stringify(t.name)}, pts: ${JSON.stringify(t.pts)} },`).join('\n')}\n];\n`;
for (const f of fails) console.log('  ' + f);
const file = new URL('../../src/core/phobos-trails-data.js', import.meta.url);
if (process.argv.includes('--check')) {
  const was = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  if (was !== text) { console.log('src/core/phobos-trails-data.js is out of date: run node tools/paths/trails.mjs'); process.exit(1); }
  console.log(`trails up to date: ${out.length}`);
} else {
  fs.writeFileSync(file, text);
  console.log(`${spots.length} places, ${out.length} trails laid, ${Math.round(metres)} m, ${fails.length} without one, in ${((Date.now() - t0) / 1000).toFixed(1)} s -> src/core/phobos-trails-data.js`);
}
