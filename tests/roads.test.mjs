// The land's roads and paths as one system (src/core/roads.js): the ways laid by tools/roads/lay.mjs, the stretches the
// ground's shader draws, the graph everyone walks, and what lines them (src/core/roadside.js).   node --test tests/roads.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { WAYS } from '../src/core/roads-data.js';
import { RD_CELL, RD_HALF, RD_MAX, RD_N, RD_NX, SURFACE_LAYERS, allWays, overLand, roadGraph, roadSegments } from '../src/core/roads.js';
import { ROUTES, SITES } from '../src/core/lands.js';
import { Kit } from '../src/core/sites.js';
import { dressRoads } from '../src/core/roadside.js';
import { PLACES } from '../src/core/heroes.js';
import fs from 'node:fs';

test('the laid ways are whole, in the land, and in the routes', () => {
  assert.ok(WAYS.length > 500, `${WAYS.length} ways`);
  let km = 0;
  for (const w of WAYS) {
    assert.ok(['road', 'lane', 'path'].includes(w.cls) && w.w > 0.5 && w.w < 4, w.name);
    assert.ok(w.pts.length >= 2, w.name);
    for (const [x, z] of w.pts) assert.ok(Number.isFinite(x) && Number.isFinite(z) && x > -5600 && x < 11700 && Math.abs(z) < 5600, w.name);
    for (let i = 0; i + 1 < w.pts.length; i++) km += Math.hypot(w.pts[i + 1][0] - w.pts[i][0], w.pts[i + 1][1] - w.pts[i][1]) / 1000;
  }
  assert.ok(km > 150, `${km.toFixed(0)} km of new ways`);
  assert.ok(ROUTES.filter((r) => r.way).length === WAYS.length, 'every laid way is one of the routes');
});

test('the shader sees every stretch near it, and never more in a square than it reads', () => {
  const { idx, seg, count } = roadSegments();
  assert.equal(seg.length, count * 8);
  let most = 0;
  for (let k = 0; k < RD_NX * RD_N; k++) most = Math.max(most, idx[k * 2 + 1]);
  assert.ok(most <= RD_MAX, `a ${RD_CELL} m square lists ${most} stretches; the shader reads ${RD_MAX}`);
  // (A point on a way, anywhere: its square lists a stretch it's on.)
  for (const w of allWays().filter((_, i) => i % 7 === 0)) {
    const [ax, az] = w.pts[0], [bx, bz] = w.pts[1], x = (ax + bx) / 2, z = (az + bz) / 2;
    const k = (Math.floor((z + RD_HALF) / RD_CELL) * RD_NX + Math.floor((x + RD_HALF) / RD_CELL)) * 2;
    let near = Infinity;
    for (let i = 0; i < idx[k + 1]; i++) {
      const s = idx[idx[k] + i] * 8, dx = seg[s + 2] - seg[s], dz = seg[s + 3] - seg[s + 1], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - seg[s]) * dx + (z - seg[s + 1]) * dz) / L2));
      near = Math.min(near, Math.hypot(x - seg[s] - dx * t, z - seg[s + 1] - dz * t) - seg[s + 4]);
    }
    assert.ok(near < 0.3, `${w.name || 'a way'} at (${x.toFixed(0)}, ${z.toFixed(0)}) isn't drawn`);
  }
  // (And what each is laid with is a ground in the textures' manifest.)
  const man = JSON.parse(fs.readFileSync(new URL('../assets/game/tex/manifest.json', import.meta.url)));
  for (const l of SURFACE_LAYERS) assert.ok(man.ground.includes(l), l);
  assert.equal(man.ground.indexOf(SURFACE_LAYERS[0]), 18, 'the ways\' grounds are layers 18 on (the shader: 17 + what it\'s laid with)');
});

test('from Bellmourn the roads reach every town and place, and keep to the roads', () => {
  const { X, Z, around } = roadGraph();
  const onRoad = (x, z) => { let d = Infinity; around(x, z, 30, (i) => { d = Math.min(d, Math.hypot(X[i] - x, Z[i] - z)); }); return d < 12; };
  for (const key of ['hamlet', 'farm', 'thornwick', 'cinderford', 'sallow', 'belltower', 'abbey', 'khel', 'frostwatch', 'cairnfield']) {
    const s = SITES[key], way = overLand(60, 5, s.x, s.z);
    let L = 0, on = 0, n = 0;
    for (let i = 0; i + 1 < way.length; i++) {
      const [ax, az] = way[i], [bx, bz] = way[i + 1], d = Math.hypot(bx - ax, bz - az);
      L += d;
      for (let t = 0; t < d; t += 10) { n++; if (onRoad(ax + (bx - ax) * t / d, az + (bz - az) * t / d)) on++; }
    }
    const straight = Math.hypot(s.x - 60, s.z - 5);
    assert.ok(L < straight * 1.45, `${key}: ${L.toFixed(0)} m by road for ${straight.toFixed(0)} straight`);
    assert.ok(on / n > 0.85, `${key}: only ${(100 * on / n).toFixed(0)}% of the way on a road`);
  }
});

test('what lines the roads: the same each time, and nothing stops a body on a phone that doesn\'t on a PC', () => {
  const run = (lean) => {
    const K = new Kit(false); K.lean = lean;
    const kinds = {};
    for (const m of ['signpost', 'lantern', 'menhir', 'cart', 'rock', 'fence', 'campfire']) { const f = K[m].bind(K); K[m] = (...a) => { kinds[m] = (kinds[m] || 0) + 1; return f(...a); }; }
    dressRoads(K);
    return { kinds, colliders: JSON.stringify(K.colliders), lamps: K.lamps || [] };
  };
  const a = run(false), b = run(false), phone = run(true);
  assert.equal(a.colliders, b.colliders);
  assert.equal(phone.colliders, a.colliders);
  assert.ok(a.kinds.signpost > 60 && a.kinds.lantern > 40 && a.kinds.menhir > 40 && a.kinds.rock > 200 && a.kinds.cart > 10, JSON.stringify(a.kinds));
  assert.ok(!phone.kinds.campfire, 'the cold fires are a PC\'s');
  // The lights along the ways (src/core/roadside.js lantern): one in every lantern, hung out over a way; only where they're
  // called for, so a few hundred and not thousands; and none from a fire on a phone, which builds none.
  const lit = a.lamps.filter((l) => l.c[1] > 0.6), fires = a.lamps.length - lit.length;
  assert.equal(lit.length, a.kinds.lantern, 'a light in every lantern');
  assert.ok(lit.length > 120 && lit.length < 600, `${lit.length} lanterns lit`);
  assert.equal(phone.lamps.length, lit.length, 'a phone has the lanterns and not the fires');
  assert.ok(fires > 0 && fires <= a.kinds.campfire, `${fires} fires lit`);
  const ways = allWays();
  for (const l of a.lamps) {
    assert.ok(l.r > 0 && l.i > 0 && l.p.every(Number.isFinite), JSON.stringify(l));
    let best = 1e9;
    for (const w of ways) for (let i = 0; i + 1 < w.pts.length; i++) {
      const [ax, az] = w.pts[i], [bx, bz] = w.pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((l.p[0] - ax) * dx + (l.p[2] - az) * dz) / L2)) : 0;
      best = Math.min(best, Math.hypot(l.p[0] - ax - dx * t, l.p[2] - az - dz * t) - w.w);
    }
    assert.ok(best < 6, `a light ${best.toFixed(1)} m off any way, at ${l.p.map((v) => v.toFixed(0))}`);
  }
});

test('the other Tessariels have the towns down the roads to walk to', () => {
  const far = PLACES.filter((p) => p.kind === 'journey');
  assert.ok(far.length >= 8);
  for (const p of far) assert.ok(Number.isFinite(p.spot[0]) && Number.isFinite(p.spot[1]) && p.name && !/blackvigil|keep|crown/i.test(p.name), p.id);
});
