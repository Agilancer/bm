// Walks every party dungeon (src/core/dungeon.js DELVES: the Hollowfang Warrens, Blackvigil Keep, the Howling Deeps, the
// Drowned Vaults, the Sporehold, the Hollow Playhouse, the Kingsbarrow): every
// room reachable from the way in, every pack's and boss's place open, the portals clear of the rock, floors in the ground
// and roofs above heads and under the shaders' underground line, the fires on the walls, nothing of one delve inside
// another's box, every prop a kind the builder knows, and how many triangles each costs.
//   node tools/dungeon/check.mjs
import { ALL_PACKS, BOSSES, CaveNav, DELVES, GRID_UNIT, WARN, WARNINGS, braziers, caveFloorY, caveRoofY, caveRoom, delveAt, grid, roomOf, roomSpot, toWorld, torches } from '../../src/core/dungeon.js';
import { PROP_KINDS, buildDelves } from '../../src/core/delve-build.js';
import { FIGHTS } from '../../src/sim/delve-fights.js';
import { VARIANTS } from '../../src/core/tripo-monsters.js';
import { WORLD_EDGE } from '../../src/core/lands.js';
import { HALL_BOX } from '../../src/core/testhall.js';

let bad = 0;
const fail = (m) => { console.log('FAIL', m); bad++; };
const ids = new Set();
for (const d of DELVES) {
  const t0 = performance.now();
  const g = grid(d), B = d.box;
  console.log(`\n${d.name} (${d.key}, level ${d.level}, ${d.style}): field ${g.W}x${g.H} in ${(performance.now() - t0).toFixed(0)} ms; box x ${B.x0.toFixed(0)}..${B.x1.toFixed(0)} z ${B.z0.toFixed(0)}..${B.z1.toFixed(0)}`);
  if (Math.max(Math.abs(B.x0), Math.abs(B.x1)) < WORLD_EDGE + 40 && Math.max(Math.abs(B.z0), Math.abs(B.z1)) < WORLD_EDGE + 40) fail(`${d.key}: its box is inside the land's edge`);
  if (!(Math.min(Math.abs(B.x0), Math.abs(B.x1)) > WORLD_EDGE + 20 || Math.min(Math.abs(B.z0), Math.abs(B.z1)) > WORLD_EDGE + 20)) fail(`${d.key}: part of its box lies under the land`);
  for (const o of DELVES) if (o !== d && B.x0 < o.box.x1 && B.x1 > o.box.x0 && B.z0 < o.box.z1 && B.z1 > o.box.z0) fail(`${d.key}: its box overlaps ${o.key}'s`);
  if (B.x0 < HALL_BOX.x1 && B.x1 > HALL_BOX.x0 && B.z0 < HALL_BOX.z1 && B.z1 > HALL_BOX.z0) fail(`${d.key}: its box overlaps the Test Dungeon's`);
  if (delveAt(d.portal.x, d.portal.z)) fail(`${d.key}: its portal on the land is inside a delve's box`);
  const nav = new CaveNav(d);
  const [ex, ez] = toWorld(d.entry.x, d.entry.z, d);
  for (const r of d.rooms) {
    if (ids.has(r.id)) fail(`${r.id}: two rooms of that name`);
    ids.add(r.id);
    const [x, z] = toWorld(r.x, r.z, d);
    if (delveAt(x, z) !== d.key) fail(`${r.id}: not in its own delve's box`);
    if (caveRoom(x, z) < 2) fail(`${r.id}: its middle is ${caveRoom(x, z).toFixed(1)} m from the rock`);
    const w = nav.walkDist(ex, ez, x, z, 0);
    if (!Number.isFinite(w)) fail(`${r.id}: can't be walked to from the way in`);
    const y = caveFloorY(x, z), top = caveRoofY(x, z);
    if (top - y < 4) fail(`${r.id}: roof only ${(top - y).toFixed(1)} m up`);
    if (top > -22) fail(`${r.id}: roof at ${top.toFixed(1)}, above the shaders' underground line (-20)`);
    console.log(`  ${r.id.padEnd(13)} walk ${Number.isFinite(w) ? w.toFixed(0).padStart(4) : '   ∞'} m  floor ${y.toFixed(1)}  roof ${(top - y).toFixed(1)} m`);
  }
  for (const [n, q] of Object.entries({ entry: d.entry, exitIn: d.exitIn, exitOut: d.exitOut })) {
    const [x, z] = toWorld(q.x, q.z, d);
    if (caveRoom(x, z) < 1.2) fail(`${d.key} ${n} is in or against the rock (${caveRoom(x, z).toFixed(2)})`);
    if (!Number.isFinite(nav.walkDist(ex, ez, x, z, 0))) fail(`${d.key} ${n} can't be walked to`);
  }
  if (!BOSSES.find((b) => b.key === d.last && b.delve === d.key)) fail(`${d.key}: its last boss ${d.last} isn't one of its bosses`);
  for (const p of d.props) {
    if (!PROP_KINDS.includes(p.kind)) fail(`${d.key}: a prop of kind ${p.kind} has no builder (src/core/delve-build.js)`);
    const [x, z] = toWorld(p.x, p.z, d);
    const onProp = d.props.some((q) => q.solid && (q.hx !== undefined ? Math.abs(p.x - q.x) <= q.hx + 0.5 && Math.abs(p.z - q.z) <= q.hz + 0.5 : Math.hypot(p.x - q.x, p.z - q.z) <= q.r + 0.5));
    if (!p.solid && !onProp && caveRoom(x, z) < -0.8 && !['portcullis', 'hearth', 'falls'].includes(p.kind)) fail(`${d.key}: a ${p.kind} at ${p.x}, ${p.z} is in the rock`);
  }
  // Every walkable cell: floor never too steep for a walk (a castle's stairs and steps aside; and a drain, which is
  // barred at both ends and only looked down: it must be shut to the walk from the way in).
  const drains = d.tunnels.filter((t) => t.drain);
  const inDrain = (lx, lz) => drains.some((t) => t.pts.some((p, n) => {
    if (!n) return false;
    const a = t.pts[n - 1], ux = p[0] - a[0], uz = p[1] - a[1], L2 = ux * ux + uz * uz || 1, k = Math.max(0, Math.min(1, ((lx - a[0]) * ux + (lz - a[1]) * uz) / L2));
    return Math.hypot(lx - a[0] - ux * k, lz - a[1] - uz * k) < t.w / 2 + 1.5;
  }));
  for (const t of drains) {
    const a = t.pts[0], b = t.pts[t.pts.length - 1], [mx, mz] = toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d);
    const far = nav.walkDist(...toWorld(d.entry.x, d.entry.z, d), mx, mz, 0);
    if (Number.isFinite(far) && far < 1e5) fail(`${d.key}: the drain at ${a.map((v) => Math.round(v))} can be walked into (${Math.round(far)} m from the way in): bar both its ends`);
  }
  let steep = 0;
  for (let j = 2; j < g.H - 2; j += 2) for (let i = 2; i < g.W - 2; i += 2) {
    const k = j * g.W + i;
    if (g.sdf[k] * GRID_UNIT < 0.5) continue;
    if (drains.length && inDrain(g.x0 + i * 0.5 - d.x, g.z0 + j * 0.5 - d.z)) continue;
    const s = Math.hypot(g.floor[k + 1] - g.floor[k - 1], g.floor[k + g.W] - g.floor[k - g.W]) * GRID_UNIT / (2 * 0.5);
    if (s > 0.6) steep++;
  }
  if (steep > 20) fail(`${d.key}: ${steep} spots steeper than 31 degrees`);
  const T = torches(d), Bz = braziers(d);
  console.log(`  torches ${T.length}, braziers and other fires ${Bz.length}; to its way out ${nav.walkDist(ex, ez, ...toWorld(d.exitOut.x, d.exitOut.z, d), 0).toFixed(0)} m`);
  if (T.length < 30) fail(`${d.key}: too few torches`);
}
for (const p of ALL_PACKS) {
  const r = roomOf(p.room);
  if (!r) { fail(`${p.key}: no room ${p.room}`); continue; }
  if (r.delve.key !== p.delve) fail(`${p.key}: its room is in another delve`);
  const [x, , z] = roomSpot(p.room, p.at?.[0] || 0, p.at?.[1] || 0);
  if (caveRoom(x, z) < 1.5) fail(`${p.key}: stands ${caveRoom(x, z).toFixed(1)} m from the rock`);
  for (const q of [...(p.spots || []), ...(p.walk || []), ...(p.more ? [p.more.from] : [])]) { const [sx, sz] = toWorld(q[0], q[1], r.delve); if (caveRoom(sx, sz) < 0.9) fail(`${p.key}: a place of its own at ${q} is in or against the rock (${caveRoom(sx, sz).toFixed(1)})`); }
}
const keys = new Set();
for (const b of BOSSES) {
  if (keys.has(b.key)) fail(`two bosses called ${b.key}`);
  keys.add(b.key);
  const r = roomOf(b.room);
  if (!r || r.delve.key !== b.delve) { fail(`${b.key}: no room ${b.room} in ${b.delve}`); continue; }
  const [x, , z] = roomSpot(b.room, b.at?.[0] || 0, b.at?.[1] || 0);
  if (caveRoom(x, z) < 4) fail(`${b.key}: stands ${caveRoom(x, z).toFixed(1)} m from the rock`);
  for (const m of b.models) if (!VARIANTS[m]) fail(`${b.key}: no variant ${m} (src/core/tripo-monsters.js)`);
  if (b.delve !== 'warrens') {
    const spec = FIGHTS[b.key];
    if (!spec) { fail(`${b.key}: no fight (src/sim/delve-fights.js)`); continue; }
    const decks = spec.decks ? Object.values(spec.decks) : [spec.deck];
    for (const dk of decks) for (const f of [{ phase: 0 }, { phase: 2, last: 'sword' }]) for (const n of typeof dk === 'function' ? dk(f) : dk) if (!spec.moves[n]) fail(`${b.key}: its deck names a move ${n} it hasn't`);
    for (const mv of Object.values(spec.moves)) if (mv.warn && WARN[mv.warn] === undefined) fail(`${b.key}: a move calls ${mv.warn}, which isn't a warning`);
    for (const w of [spec.open, spec.enrage?.[2], ...(spec.adds || []).map((a) => a.warn)]) if (w && WARN[w] === undefined) fail(`${b.key}: calls ${w}, which isn't a warning`);
  }
}
if (WARNINGS[32] !== 'Venomaw stamps! Step in behind each ring as it lands.') fail("the Warrens' warnings have moved: their numbers are meant to hold");
// What it all costs to draw: the triangles of each delve's shell, fires, props and inside portals.
{
  const { Kit } = await import('../../src/core/sites.js').catch(() => ({}));
  if (Kit) {
    let was = 0;
    const count = (k) => { let n = 0; for (const p of k.parts.values()) n += p.idx.length / 3; return n; };
    for (const d of DELVES) {
      const k = new Kit();
      buildDelves(k, () => {}, [d]);
      const n = count(k);
      console.log(`${d.key}: ${n.toLocaleString()} triangles`);
      if (n > 260000) fail(`${d.key}: ${n} triangles is too many`);
      was += n;
    }
    console.log(`all of them: ${was.toLocaleString()} triangles`);
  } else console.log('(triangles not counted: src/core/sites.js would not load)');
}
if (bad) { console.log(`\n${bad} problem(s)`); process.exit(1); }
console.log('\nThe delves hold together.');
