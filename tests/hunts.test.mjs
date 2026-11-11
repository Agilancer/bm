// The hunting grounds (src/core/hunts.js): every monster's place in the town's woods has its glade and a path to it, nothing
// grows on those paths, and the Warrens' portal can be walked onto from its front and both its ends.
//   node --test tests/hunts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { HUNT_GROUNDS, HUNT_PATHS, huntEdge, huntPathEdge, huntTrimmed } from '../src/core/hunts.js';
import { LAIRS } from '../src/core/tripo-monsters.js';
import { FIELD_CREATURES } from '../src/core/field-creatures.js';
import { TREE_FLOATS, TRIMMED, forestAmount, forestTrees } from '../src/core/forest.js';
import { PATHS, ROADS, portalFloor, terrainHeight } from '../src/core/terrain.js';
import { PORTAL, PORTAL_PAD } from '../src/core/dungeon.js';
import { buildSites } from '../src/core/sites.js';

const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
};
const lineDist = (x, z, pts) => Math.min(...pts.slice(1).map((b, i) => segDist(x, z, pts[i], b)));

test('every lair and field creature in the town\'s woods stands in a glade', () => {
  const near = [...LAIRS.filter((l) => Math.hypot(l.x, l.z) < 330).map((l) => [l.key, l.x, l.z]), ...FIELD_CREATURES.map((f) => [f.model, ...f.spawn])];
  assert.ok(near.length >= 7);
  for (const [key, x, z] of near) {
    assert.ok(huntEdge(x, z) < 0, `${key} is not in a hunting ground`);
    assert.equal(forestAmount(x, z), 0, `pines grow where ${key} stands`);
  }
  // And the lairs out in the countries.
  for (const l of LAIRS) assert.ok(huntEdge(l.x, l.z) < 0, `${l.key} has no glade`);
});

test('a path runs into every ground, from a road or a path that was there before', () => {
  const old = [...PATHS.filter((p) => !p.hunt).map((p) => p.pts), ...ROADS.map((r) => r.line)];
  for (const g of HUNT_GROUNDS) {
    assert.ok(HUNT_PATHS.some((p) => lineDist(g.x, g.z, p.pts) < g.r + 12), `no path into ${g.key}`);
  }
  // Each path can be followed back to an old way through the ones it joins.
  const joined = new Set();
  const ends = (p) => [p.pts[0], p.pts[p.pts.length - 1]];
  for (let round = 0; round < HUNT_PATHS.length; round++) {
    for (const p of HUNT_PATHS) {
      if (joined.has(p)) continue;
      const lines = [...old, ...[...joined].map((q) => q.pts)];
      if (ends(p).some(([x, z]) => lines.some((pts) => lineDist(x, z, pts) < 4))) joined.add(p);
    }
  }
  for (const p of HUNT_PATHS) assert.ok(joined.has(p), `the path from ${p.pts[0]} joins nothing`);
});

test('nothing grows on a hunting path, and the pines beside one are trimmed', () => {
  for (const p of HUNT_PATHS) {
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s <= L; s += 0.5) {
        const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L;
        assert.ok(huntPathEdge(x, z) < 0);
        for (const off of [-2.5, 0, 2.5]) assert.equal(forestAmount(x - (bz - az) / L * off, z + (bx - ax) / L * off), 0, `a pine at ${x.toFixed(0)}, ${z.toFixed(0)}`);
      }
    }
  }
  const t = forestTrees(340);
  let trimmed = 0;
  for (let k = 0; k < t.length; k += TREE_FLOATS) {
    const is = t[k + 6] >= TRIMMED;
    if (is) trimmed++;
    if (huntEdge(t[k], t[k + 1]) < 40 || huntPathEdge(t[k], t[k + 1]) < 10) assert.ok(is, 'an untrimmed pine by a ground');
    if (huntEdge(t[k], t[k + 1]) > 63 && huntPathEdge(t[k], t[k + 1]) > 20) assert.ok(!is, 'a trimmed pine out in the wild wood');
  }
  assert.ok(trimmed > 300 && trimmed < t.length / TREE_FLOATS * 0.6, `${trimmed} trimmed`);
  assert.ok(huntTrimmed(40, 190, 0.5) && !huntTrimmed(0, 0, 0.5));
});

test('the Warrens\' portal can be walked onto up the hill and from either end', () => {
  const K = buildSites();
  const plat = K.floors.find((p) => Math.hypot(p.x - PORTAL.x, p.z - PORTAL.z) < 3);
  const cols = K.colliders.filter((q) => Math.hypot(q.x - PORTAL.x, q.z - PORTAL.z) < 24);
  const height = (x, z) => {
    let best = null;
    for (const f of plat.rects) {
      const dx = x - f.x, dz = z - f.z;
      if (Math.abs(dx * f.c - dz * f.s) <= f.hu && Math.abs(dx * f.s + dz * f.c) <= f.hw && (best === null || f.y > best)) best = f.y;
    }
    return best ?? terrainHeight(x, z);
  };
  const stopped = (x, z, y) => cols.some((q) => {
    const dx = x - q.x, dz = z - q.z, c = Math.cos(q.yaw), s = Math.sin(q.yaw);
    return Math.abs(dx * c - dz * s) < q.hx + 0.35 && Math.abs(dx * s + dz * c) < q.hz + 0.35 && (q.t === undefined || y < q.t);
  });
  const c = Math.cos(PORTAL.yaw), s = Math.sin(PORTAL.yaw), ox = PORTAL.x - PORTAL_PAD.at * s, oz = PORTAL.z - PORTAL_PAD.at * c;
  const P = (u, w) => [ox + u * c + w * s, oz - u * s + w * c];
  const top = portalFloor();
  for (const [name, u0, w0, u1, w1] of [['the front', 0, 17, 0, 3.6], ['its left end', -14, 2, -3.6, 2], ['its right end', 14, 2, 3.6, 2]]) {
    const L = Math.hypot(u1 - u0, w1 - w0);
    let prev = null;
    for (let t = 0; t <= L; t += 0.1) {
      const [x, z] = P(u0 + (u1 - u0) * t / L, w0 + (w1 - w0) * t / L), y = height(x, z);
      assert.ok(!stopped(x, z, y), `stopped coming from ${name}, ${t.toFixed(1)} m along`);
      if (prev !== null) assert.ok(y - prev < 0.45, `a step of ${(y - prev).toFixed(2)} m coming from ${name}`);
      prev = y;
    }
    assert.ok(Math.abs(prev - top) < 0.4, `${name} doesn't come out on the terrace`);
  }
  // The front flight comes all the way down to the ground, and a hunting path ends at its foot.
  const [fx, fz] = P(0, PORTAL_PAD.hw + 7.5);
  assert.ok(top - terrainHeight(fx, fz) > 2, 'the hill falls away in front of it');
  assert.ok(HUNT_PATHS.some((p) => { const [x, z] = p.pts[p.pts.length - 1]; return Math.hypot(x - fx, z - fz) < 8; }));
});
