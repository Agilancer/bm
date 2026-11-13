// Auto-play's sense of the ground (src/sim/nav.worker.js).
// Out in the land: the pines and boulders it steps round. The world keeps them four numbers each ([x, z, radius, top]:
// World.trunkCell); read three at a time, every second "trunk" was made of the wrong numbers, and wherever z ran high the
// whole wood came out solid: no way to back off, no room to ride, no path across country. Checked against the trunks.
// In the town: its paths. Into every house by its door, square on (a place a pace before the doorway's middle, then one a
// pace beyond, from outside and from in); never a line that touches a wall; ending where a body can stand; and no path at
// all, rather than a line to walk at, when there's no way.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { navFor } from '../src/sim/nav.worker.js';
import { terrainHeight } from '../src/core/terrain.js';
import { lineClear } from '../src/sim/sight.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const world = new World(read('assets/game/village.json'), interior);
const nav = navFor(world, interior);
const CELL = 16;
// Every trunk and boulder within a cell of a point, as the world has them.
function trunksNear(x, z) {
  const out = [], ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
    const l = world.trunkCell(i, j);
    if (l) for (let k = 0; k < l.length; k += 4) out.push([l[k], l[k + 1], l[k + 2], l[k + 3]]);
  }
  return out;
}

// The woods north and south of the town, east and west: all four quarters, since the old fault showed only where z ran high.
const SPOTS = [[-45, 150], [60, 120], [-110, 110], [20, -125], [100, -128], [-160, 60], [170, 40], [-120, -60]];

test('open ground among the pines is open, and a trunk is solid', () => {
  let open = 0, solid = 0;
  for (const [sx, sz] of SPOTS) {
    for (let k = 0; k < 60; k++) {
      const x = sx + ((k * 37) % 23) - 11, z = sz + ((k * 53) % 19) - 9, y = terrainHeight(x, z) + 0.2;
      const near = trunksNear(x, z);
      const gap = Math.min(...near.map(([tx, tz, r, top]) => (y <= top ? Math.hypot(x - tx, z - tz) - r : Infinity)), Infinity);
      if (world.inside(x, z, 1.5) && gap > 1.5) continue;   // (a wall or a place's box: not this test's)
      if (gap > 0.6) { assert.equal(nav.solidAt(x, z, 0.45, y), false, `open ground at ${x}, ${z} (${gap.toFixed(1)} m from the nearest trunk) read as solid`); open++; }
    }
    for (const [tx, tz, r, top] of trunksNear(sx, sz).slice(0, 12)) {
      if (terrainHeight(tx, tz) + 0.2 > top) continue;
      assert.equal(nav.solidAt(tx, tz, 0.45, terrainHeight(tx, tz) + 0.2), true, `the trunk at ${tx.toFixed(1)}, ${tz.toFixed(1)} read as open`);
      solid++;
    }
  }
  assert.ok(open > 150, `only ${open} open spots tried`);
  assert.ok(solid > 30, `only ${solid} trunks tried`);
});

test('there is a way to step, wherever it stands in the woods', () => {
  let ways = 0, tried = 0;
  for (const [sx, sz] of SPOTS) {
    for (let k = 0; k < 12; k++) {
      const x = sx + k * 1.7 - 9, z = sz + ((k * 5) % 7) - 3, y = terrainHeight(x, z) + 0.2;
      if (nav.solidAt(x, z, 0.45, y)) continue;
      tried++;
      const r = nav.probe(x, z, y, 1, 0, 6);
      assert.ok(r, 'a way is named');
      if (r[2] >= 6) ways++;
    }
  }
  assert.ok(tried > 40, `only ${tried} places tried`);
  assert.ok(ways >= tried * 0.9, `a clear six metres from only ${ways} of ${tried} places`);
});

// ---- the town's paths ---------------------------------------------------------------------------------------------------

const SQUARE = [2, 3];
// The houses' own doors (the cathedral's and the Sexton's are another matter: a knight keeps one, a lock the other).
const houseDoors = nav.doorways().filter((d) => d.id >= 3 && d.id <= 17);
// A place two strides to one side of a doorway, on its middle line.
const beside = (d, side, far = 2.2) => [d.x + d.nx * side * far, d.z + d.nz * side * far];
const free = (x, z) => !world.inside(x, z, 0.45);
// Every tenth of a metre along a path from `from`: [x, z].
function* along(from, pts) {
  let [px, pz] = from;
  for (const q of pts) {
    const L = Math.hypot(q[0] - px, q[1] - pz), n = Math.max(1, Math.ceil(L / 0.1));
    for (let k = 0; k <= n; k++) yield [px + (q[0] - px) * k / n, pz + (q[1] - pz) * k / n];
    [px, pz] = q;
  }
}

test('every house has a door it knows', () => assert.equal(houseDoors.length, 15));

test('into every house, and out of it, by the door: square on, down the middle', () => {
  let through = 0;
  for (const d of houseDoors) {
    for (const side of [1, -1]) {
      const to = beside(d, side);
      if (!free(to[0], to[1])) continue;
      for (const [a, b] of [[SQUARE, to], [to, SQUARE]]) {
        const p = nav.path(a, b);
        assert.ok(p, `no path between the square and door ${d.id}'s ${side > 0 ? 'far' : 'near'} side`);
        const own = p.filter((q) => q[3] === d.id);
        if (!own.length) continue;   // (that side of this door is the square's side: no need to go through it)
        through++;
        assert.equal(own.length, 2, `door ${d.id}: a place before it and a place beyond`);
        const [u, v] = own;
        const off = (q) => Math.abs((q[0] - d.x) * d.nz + (q[1] - d.z) * d.nx), deep = (q) => (q[0] - d.x) * d.nx + (q[1] - d.z) * d.nz;
        assert.ok(off(u) < 0.05 && off(v) < 0.05, `door ${d.id}: both on its middle line (${off(u).toFixed(2)}, ${off(v).toFixed(2)} off)`);
        assert.ok(deep(u) * deep(v) < 0, `door ${d.id}: one each side of it`);
        for (const q of own) assert.ok(Math.abs(deep(q)) >= 0.39 && Math.abs(deep(q)) <= 1.01, `door ${d.id}: ${Math.abs(deep(q)).toFixed(2)} m from the doorway`);
        assert.equal(p.indexOf(v), p.indexOf(u) + 1, `door ${d.id}: straight from the one to the other`);
        assert.ok(u[2] && v[2], 'a doorway is walked, not run');
      }
    }
  }
  assert.ok(through >= 30, `only ${through} goings through a door`);
});

test('no path touches a wall, and each ends where a body can stand', () => {
  let n = 0;
  const ends = houseDoors.flatMap((d) => [beside(d, 1), beside(d, -1), beside(d, 1, 4), beside(d, -1, 4)]).filter(([x, z]) => free(x, z));
  for (let i = 0; i < ends.length; i++) {
    const from = i % 3 ? ends[(i * 7 + 3) % ends.length] : SQUARE, to = ends[i];
    const p = nav.path(from, to);
    if (!p) continue;
    n++;
    for (const [x, z] of along(from, p)) assert.equal(world.inside(x, z, 0.38), false, `the way from ${from.map((v) => v.toFixed(1))} to ${to.map((v) => v.toFixed(1))} touches a wall at ${x.toFixed(2)}, ${z.toFixed(2)}`);
  }
  assert.ok(n > 40, `only ${n} paths walked`);
  // Asked for a place in a wall (someone behind a counter, a chest against the wall): the nearest place to stand, not the wall.
  let walls = 0;
  for (const c of world.colliders) {
    if (c.b || c.t !== undefined || c.h < 2.5 || Math.abs(c.x) > 60 || Math.abs(c.z) > 60 || Math.max(c.hx, c.hz) < 2) continue;
    const p = nav.path(SQUARE, [c.x, c.z]);
    if (!p) continue;
    walls++;
    const end = p.at(-1);
    assert.equal(world.inside(end[0], end[1], 0.40), false, `a path to the middle of a wall at ${c.x}, ${c.z} ends in it`);
  }
  assert.ok(walls > 20, `only ${walls} walls tried`);
});

test('no way is no path: nothing to walk at', () => {
  // A house with its one door kept out of (a circle on its doorway, as a locked door is): no path in, and it says so.
  let shut = 0;
  for (const d of houseDoors) {
    const out = [1, -1].map((side) => beside(d, side, 2.5)).filter(([x, z]) => free(x, z));
    if (out.length < 2) continue;
    const open = nav.path(out[0], out[1]);
    if (!open || !open.some((q) => q[3] === d.id) || open.length > 4) continue;
    const barred = nav.path(out[0], out[1], [[d.x, d.z, 1.2]]);
    // (Null, or the long way round by another door if the house has one: never through the one that's barred.)
    if (barred) assert.ok(!barred.some((q) => q[3] === d.id) && barred.length > open.length, `door ${d.id}: barred, and still gone through`);
    else shut++;
  }
  assert.ok(shut >= 8, `only ${shut} houses shut by barring their door`);
});

test('to every house chest: a place a hand reaches it from, or no way at all', () => {
  // A chest sits in a corner, and the nearest free floor to it is often a gap shut in behind the bed, or the street
  // outside the wall. Asked for something to put a hand to, a path ends where a body can get to and nothing's between.
  const chests = interior.things.filter((t) => t.type === 'chest' && Math.abs(t.y - 0.2) < 0.5);
  assert.equal(chests.length, 15);
  let got = 0;
  for (const c of chests) {
    const p = nav.path(SQUARE, [c.x, c.z], null, c.y + 0.5);
    if (!p) continue;   // (one stands behind a screen with a way in too narrow for the grid: left, and known)
    const e = p.at(-1), d = Math.hypot(e[0] - c.x, e[1] - c.z);
    assert.ok(d < 2, `the chest at ${c.x}, ${c.z}: its path ends ${d.toFixed(2)} m off, out of reach`);
    assert.ok(lineClear(world, e[0], world.height(e[0], e[1]) + 1.5, e[1], c.x, c.y + 0.5, c.z), `the chest at ${c.x}, ${c.z}: a wall between it and where its path ends`);
    assert.equal(world.inside(e[0], e[1], 0.40), false);
    got++;
  }
  assert.ok(got >= 14, `only ${got} of the houses' 15 chests can be got to`);
});

// A nook a body fits with a finger's room, which the walking grid calls solid: between Silas Crane's hearth and the
// partition behind it. Auto-play got in, and its way out began through the partition. The nav thread finds the way out on a
// finer grid (escape): every point of it somewhere a body can be, ending on the walking grid.
test('out of a snug corner: a way a body can take, ending where the grid is free', () => {
  const from = [12, -39.72];
  assert.ok(!world.inside(from[0], from[1], 0.34), 'a body can stand there');
  const pts = nav.escape(from[0], from[1]);
  assert.ok(pts?.length > 3, 'a way out');
  for (const [x, z] of pts.slice(0, -1)) assert.ok(!world.inside(x, z, 0.33), `through something at ${x.toFixed(2)}, ${z.toFixed(2)}`);
  for (let i = 1; i < pts.length - 1; i++) assert.ok(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) < 0.45, 'no stride longer than the grid it was found on');
  const end = pts.at(-1), on = nav.path(end, SQUARE);
  assert.ok(on?.length, 'and a path on from its end');
  // (Never through the partition, which is the nearest free ground as the crow flies.)
  assert.ok(pts.every(([, z]) => z < -39.4), 'not through the partition');
});
