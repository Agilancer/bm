// The ground as it's drawn against the ground as it's walked on. You stand on the land's own height (terrainHeight: src/sim/
// world.js), and the stones lie on it; the mesh (buildTerrain in src/core/ground-mesh.js) is that height at its corners and flat
// between them. Out in the woods the one great grid's cells were metres across, and the drawn ground was as much as two metres
// off where you stood, and more at the Warrens' portal. src/core/ground-patches.js draws it finer there. Out past the woods and
// in the countries it was ten metres off on a phone (and two to four on a PC), until the near ground (buildNear) came.
//   node --test tests/ground-mesh.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { groundPatches, nearCentre, nearGround } from '../src/core/ground-patches.js';
import { buildTerrain } from '../src/core/ground-mesh.js';
import { HUNT_GROUNDS, HUNT_PATHS } from '../src/core/hunts.js';
import { PORTAL } from '../src/core/dungeon.js';
import { LAND_HOLE } from '../src/core/church.js';
import { CLIFF, MOUNT, SITES } from '../src/core/lands.js';
import { terrainHeight } from '../src/core/terrain.js';

// The job worker, run here: its one listener, handed a job.
let listener = null, reply = null;
globalThis.self = { addEventListener: (_, f) => { listener = f; }, postMessage: (m) => { reply = m; } };
await import('../src/sim/job.worker.js');
async function terrain(n, cell) {
  await listener({ data: { id: 1, type: 'terrain', args: { opening: false, n, extent: 2400, patches: groundPatches(cell) } } });
  assert.ok(reply && !reply.error, `the terrain job failed: ${reply?.error}`);
  const { verts, idx } = reply.result;
  // Its triangles, by the 8 m square they lie over, round the town.
  const cells = new Map(), C = 8;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 6, idx[t + 1] * 6, idx[t + 2] * 6];
    const x0 = Math.min(verts[a], verts[b], verts[c]), x1 = Math.max(verts[a], verts[b], verts[c]);
    const z0 = Math.min(verts[a + 2], verts[b + 2], verts[c + 2]), z1 = Math.max(verts[a + 2], verts[b + 2], verts[c + 2]);
    if (x1 < -330 || x0 > 330 || z1 < -330 || z0 > 330) continue;
    for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) {
      const k = i * 4096 + j;
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(t);
    }
  }
  // The drawn ground's height at (x, z): the topmost of what lies over it, and how many layers do.
  const at = (x, z) => {
    let top = -Infinity, layers = 0;
    for (const t of cells.get(Math.floor(x / C) * 4096 + Math.floor(z / C)) || []) {
      const [a, b, c] = [idx[t] * 6, idx[t + 1] * 6, idx[t + 2] * 6];
      const ax = verts[a], az = verts[a + 2], bx = verts[b], bz = verts[b + 2], cx = verts[c], cz = verts[c + 2];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      layers++;
      top = Math.max(top, u * verts[a + 1] + v * verts[b + 1] + w * verts[c + 1]);
    }
    return { top, layers };
  };
  return { at, tris: idx.length / 3 };
}

const round = (cx, cz, r, step) => { const o = []; for (let a = -r; a <= r; a += step) for (let b = -r; b <= r; b += step) o.push([cx + a, cz + b]); return o; };
const paths = HUNT_PATHS.flatMap((p) => p.pts.slice(1).flatMap(([bx, bz], i) => {
  const [ax, az] = p.pts[i], L = Math.hypot(bx - ax, bz - az), o = [];
  for (let s = 0; s < L; s += 0.7) o.push([ax + (bx - ax) * s / L, az + (bz - az) * s / L]);
  return o;
}));
const worst = (mesh, pts) => {
  let w = 0;
  for (const [x, z] of pts) {
    const { top, layers } = mesh.at(x, z);
    assert.ok(layers >= 1, `no ground drawn at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    w = Math.max(w, Math.abs(top - terrainHeight(x, z)));
  }
  return w;
};

// [the tier's grid, its patches' cell, how far off the drawn ground may be: about the portal, in the woods]
for (const [name, n, cell, gate, woods] of [['a PC (High)', 384, 2, 0.15, 0.25], ['a phone', 128, 4, 0.35, 0.6]]) {
  test(`on ${name}, the ground is drawn where you walk on it`, async () => {
    const mesh = await terrain(n, cell);
    const w = { gate: worst(mesh, round(PORTAL.x, PORTAL.z, 18, 0.45)), glades: worst(mesh, HUNT_GROUNDS.flatMap((g) => round(g.x, g.z, g.r + 6, 0.9))), paths: worst(mesh, paths) };
    assert.ok(w.gate < gate, `the ground about the Warrens' portal is drawn ${w.gate.toFixed(2)} m off`);
    assert.ok(w.glades < woods, `a glade's ground is drawn ${w.glades.toFixed(2)} m off`);
    assert.ok(w.paths < woods, `a path's ground is drawn ${w.paths.toFixed(2)} m off`);
    // No hole anywhere round the town but the one over the church's stair, and the town itself still on the fine grid.
    let holes = 0;
    for (const [x, z] of round(0, 0, 300, 3.1)) if (!mesh.at(x, z).layers) holes++;
    assert.ok(holes < 40, `${holes} places with no ground`);
    assert.ok(worst(mesh, round(0, 0, 55, 1.3)) < (cell > 2 ? 0.5 : 0.1));
  });
}

test('every hunting ground and path lies inside the finer ground', () => {
  const woods = groundPatches(2).find((p) => p.skip);
  const inside = (x, z, m) => x - m > woods.x0 && x + m < woods.x1 && z - m > woods.z0 && z + m < woods.z1;
  for (const g of HUNT_GROUNDS) assert.ok(inside(g.x, g.z, g.r), `${g.key} runs out of it`);
  for (const [x, z] of paths) assert.ok(inside(x, z, 2));
});

// ---- the near ground, wherever you are -------------------------------------------------------------------------------------

// The land as src/gfx/renderer.js leaves it at its worst for you at (px, pz): the great grid laid round the town (near it) or
// some 400 m back (it's laid again past 420: followLand), and the near ground a step from you, as far as followNear lets it get.
function laid(lean, px, pz) {
  const N = nearGround(lean), town = Math.abs(px) < 700 && Math.abs(pz) < 700;
  const cx = town ? 0 : Math.round((px - 290) / 128) * 128, cz = town ? 0 : Math.round((pz + 290) / 128) * 128;
  const [nx, nz] = nearCentre(N, px - N.step + 1, pz - N.step + 1);
  const r = buildTerrain({ opening: false, n: lean ? 128 : 384, extent: 2400, patches: groundPatches(lean ? 4 : 2), cx, cz, near: { x: nx, z: nz, ...N } });
  assert.ok(r.near, `no near ground at ${px}, ${pz}`);
  return { ...r, N, n: lean ? 128 : 384, far: Math.max(...N.radii) };
}

// The drawn ground's top at (x, z), and how many layers there are, over the triangles within reach of (px, pz).
function drawn({ verts, idx, near }, px, pz, reach) {
  const cells = new Map(), C = 8;
  for (const [V, I] of [[verts, idx], [near.verts, near.idx]]) {
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 6, b = I[t + 1] * 6, c = I[t + 2] * 6;
      const x0 = Math.min(V[a], V[b], V[c]), x1 = Math.max(V[a], V[b], V[c]), z0 = Math.min(V[a + 2], V[b + 2], V[c + 2]), z1 = Math.max(V[a + 2], V[b + 2], V[c + 2]);
      if (x1 < px - reach || x0 > px + reach || z1 < pz - reach || z0 > pz + reach) continue;
      for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) {
        const k = i * 4096 + j;
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(V, t, I);
      }
    }
  }
  // (spread: how far apart the layers are. A point on an edge two triangles share is in both, at one height.)
  return (x, z) => {
    let top = -Infinity, low = Infinity, layers = 0;
    const L = cells.get(Math.floor(x / C) * 4096 + Math.floor(z / C)) || [];
    for (let q = 0; q < L.length; q += 3) {
      const V = L[q], t = L[q + 1], I = L[q + 2], a = I[t] * 6, b = I[t + 1] * 6, c = I[t + 2] * 6;
      const ax = V[a], az = V[a + 2], bx = V[b], bz = V[b + 2], cx = V[c], cz = V[c + 2];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (!d) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      layers++;
      const y = u * V[a + 1] + v * V[b + 1] + w * V[c + 1];
      top = Math.max(top, y); low = Math.min(low, y);
    }
    return { top, layers, spread: layers ? top - low : 0 };
  };
}

// How far the drawn height is outside the walked one within rho sideways: so a step in the land's own height (the winding hill
// road's legs, where the nearer of two sets it; Brightwater's cliff) counts for nothing at the step, and a slope drawn wrong does.
const offBy = (y, x, z, rho) => {
  let lo = Infinity, hi = -Infinity;
  for (let k = -1; k < 8; k++) {
    const h = k < 0 ? terrainHeight(x, z) : terrainHeight(x + rho * Math.cos(k * Math.PI / 4), z + rho * Math.sin(k * Math.PI / 4));
    lo = Math.min(lo, h); hi = Math.max(hi, h);
  }
  return Math.max(0, y - hi, lo - y);
};

// Round the town, its portal and its hill, out past the woods, and in every country: on its roads, its places and its hills.
const SPOTS = [['the square', 0, 0], ["the Warrens' portal", PORTAL.x, PORTAL.z], ['the hill road', -150, 120], ['past the woods', 400, 300],
  ['south-west of the woods', -650, -400], ['Millhaven Farm', SITES.farm.x, SITES.farm.z], ["Brightwater's cliff", CLIFF.x + 10, 0],
  ['Sallowmere', SITES.sallow.x, SITES.sallow.z], ['the Abbey', SITES.abbey.x, SITES.abbey.z], ['the Ashen Waste', -3800, -700],
  ['the Rimeholt Fells', 600, 3900], ['the Barrow Moor', -2900, 3400], ['the Gallowswood', 4100, 3200], ['the Deepwood', -1300, -1500],
  ["the Sorrowhorn's flank", MOUNT.x + 300, MOUNT.z + 500]];
const PC_SPOTS = new Set(['the square', "the Warrens' portal", 'past the woods', 'Millhaven Farm', 'the Abbey', 'the Rimeholt Fells']);

// [the tier, phone?, how far off within 60 m of you, a cell's half sideways]
for (const [name, lean, tol] of [['a PC (High)', false, 0.3], ['a phone', true, 0.5]]) {
  test(`on ${name}, wherever you are, the ground round you is drawn where you walk on it`, () => {
    for (const [where, px, pz] of SPOTS) {
      if (!lean && !PC_SPOTS.has(where)) continue;
      const L = laid(lean, px, pz), at = drawn(L, px, pz, L.far + 120), rho = L.N.cells[0] / 2;
      let worst = 0, wx = 0, wz = 0;
      for (let a = -60; a <= 60; a += 1.1) {
        for (let b = -60; b <= 60; b += 1.1) {
          const x = px + a, z = pz + b, { top, layers } = at(x, z);
          assert.ok(layers >= 1, `${where}: no ground drawn at ${x.toFixed(1)}, ${z.toFixed(1)}`);
          const e = offBy(top, x, z, rho);
          if (e > worst) { worst = e; wx = x; wz = z; }
        }
      }
      assert.ok(worst < tol, `${where}: the ground is drawn ${worst.toFixed(2)} m off at ${wx.toFixed(1)}, ${wz.toFixed(1)}`);
      // And ground everywhere out to past the near ground's edge, but over the church's stair.
      const R = L.far + 100, hole = (x, z) => x > LAND_HOLE.x0 - 4 && x < LAND_HOLE.x1 + 4 && z > LAND_HOLE.z0 - 4 && z < LAND_HOLE.z1 + 4;
      for (let a = -R; a <= R; a += 7.3) for (let b = -R; b <= R; b += 7.3) {
        if (hole(px + a, pz + b)) continue;
        assert.ok(at(px + a, pz + b).layers >= 1, `${where}: no ground drawn at ${(px + a).toFixed(1)}, ${(pz + b).toFixed(1)}`);
      }
    }
  });
}

test('the near ground meets the great grid corner to corner, and nothing is drawn twice out in the countries', () => {
  for (const lean of [true, false]) {
    for (const [px, pz] of [[SITES.abbey.x, SITES.abbey.z], [-3800, -700]]) {
      const L = laid(lean, px, pz), { verts, idx, near } = L;
      // The great grid's corners by their very bits, and its edges.
      const key = (V, k) => `${V[k]},${V[k + 1]},${V[k + 2]}`;
      const farAt = new Map(), farEdges = new Set();
      for (let k = 0; k < (L.n + 1) ** 2; k++) farAt.set(key(verts, k * 6), k);
      for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = idx[t + e], b = idx[t + (e + 1) % 3]; farEdges.add(`${Math.min(a, b)},${Math.max(a, b)}`); }
      // An edge of the near ground's that's on one triangle only is where one ring meets the next, or its border.
      const uses = new Map();
      for (let t = 0; t < near.idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = near.idx[t + e], b = near.idx[t + (e + 1) % 3], k = `${Math.min(a, b)},${Math.max(a, b)}`; uses.set(k, (uses.get(k) || 0) + 1); }
      const [nx, nz] = near.at, V = near.verts, ring = (a) => Math.max(Math.abs(V[a * 6] - nx), Math.abs(V[a * 6 + 2] - nz));
      const joins = L.N.radii.slice(0, -1).map(() => new Map());
      let border = 0;
      for (const [k, n] of uses) {
        if (n !== 1) continue;
        const [a, b] = k.split(',').map(Number), q = L.N.radii.findIndex((R) => Math.abs(ring(a) - R) < 1e-3 && Math.abs(ring(b) - R) < 1e-3);
        // (A ring's edge: kept, to be matched below.)
        if (q >= 0 && q < L.N.radii.length - 1) { joins[q].set(k, [a, b]); continue; }
        border++;
        const fa = farAt.get(key(near.verts, a * 6)), fb = farAt.get(key(near.verts, b * 6));
        assert.ok(fa !== undefined && fb !== undefined, `the near ground's edge at ${near.verts[a * 6].toFixed(1)}, ${near.verts[a * 6 + 2].toFixed(1)} isn't on the great grid's corners`);
        assert.ok(farEdges.has(`${Math.min(fa, fb)},${Math.max(fa, fb)}`), `the near ground's edge at ${near.verts[a * 6].toFixed(1)}, ${near.verts[a * 6 + 2].toFixed(1)} isn't one of the great grid's`);
      }
      assert.ok(border > 100, `only ${border} edges round the near ground`);
      // Where one ring meets the next, each of the outer ring's edges is two of the inner's, and the corner between them is on it.
      for (let q = 0; q < joins.length; q++) {
        const e = L.N.cells[q], at = new Map();
        for (const [a, b] of joins[q].values()) for (const v of [a, b]) at.set(`${V[v * 6]},${V[v * 6 + 2]}`, V[v * 6 + 1]);
        let long = 0;
        for (const [a, b] of joins[q].values()) {
          const len = Math.hypot(V[a * 6] - V[b * 6], V[a * 6 + 2] - V[b * 6 + 2]);
          if (Math.abs(len - 2 * e) > 1e-3) continue;
          long++;
          const mx = (V[a * 6] + V[b * 6]) / 2, mz = (V[a * 6 + 2] + V[b * 6 + 2]) / 2, y = at.get(`${Math.fround(mx)},${Math.fround(mz)}`);
          assert.ok(y !== undefined, `ring ${q + 1}'s edge at ${mx.toFixed(1)}, ${mz.toFixed(1)} has no corner of ring ${q}'s under its middle`);
          assert.ok(Math.abs(y - (V[a * 6 + 1] + V[b * 6 + 1]) / 2) < 1e-3, `a crack where ring ${q} meets ring ${q + 1} at ${mx.toFixed(1)}, ${mz.toFixed(1)}`);
        }
        assert.ok(long > 50, `ring ${q + 1} meets ring ${q} along only ${long} edges`);
      }
      // One layer everywhere: no hole at the seam, and none of the great grid left under the near ground.
      const at = drawn(L, px, pz, L.far + 200);
      for (let a = -L.far - 150; a <= L.far + 150; a += 3.7) for (let b = -L.far - 150; b <= L.far + 150; b += 3.7) {
        const { layers, spread } = at(px + a, pz + b);
        assert.ok(layers >= 1 && spread < 0.01, `${layers} layers of ground, ${spread.toFixed(2)} m apart, at ${(px + a).toFixed(1)}, ${(pz + b).toFixed(1)}`);
      }
    }
  }
});
