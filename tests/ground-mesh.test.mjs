// The ground as it's drawn against the ground as it's walked on. You stand on the land's own height (terrainHeight: src/sim/
// world.js), and the stones lie on it; the mesh (buildTerrain in src/sim/job.worker.js) is that height at its corners and flat
// between them. Out in the woods the one great grid's cells were metres across, and the drawn ground was as much as two metres
// off where you stood, and more at the Warrens' portal. src/core/ground-patches.js draws it finer there, and wherever you are.
//   node --test tests/ground-mesh.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { HERE_STEP, groundPatches } from '../src/core/ground-patches.js';
import { HUNT_GROUNDS, HUNT_PATHS } from '../src/core/hunts.js';
import { PORTAL } from '../src/core/dungeon.js';
import { terrainHeight } from '../src/core/terrain.js';

// The job worker, run here: its one listener, handed a job.
let listener = null, reply = null;
globalThis.self = { addEventListener: (_, f) => { listener = f; }, postMessage: (m) => { reply = m; } };
await import('../src/sim/job.worker.js');
// (here: where the patches that go with you are centred. cx, cz: the great grid's middle. ox, oz: the middle of what's looked at.)
async function terrain(n, cell, { here, cx = 0, cz = 0, ox = 0, oz = 0 } = {}) {
  await listener({ data: { id: 1, type: 'terrain', args: { opening: false, n, extent: 2400, patches: groundPatches(cell, here), cx, cz } } });
  assert.ok(reply && !reply.error, `the terrain job failed: ${reply?.error}`);
  const { verts, idx } = reply.result;
  // Its triangles, by the 8 m square they lie over, round the town.
  const cells = new Map(), C = 8;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 6, idx[t + 1] * 6, idx[t + 2] * 6];
    const x0 = Math.min(verts[a], verts[b], verts[c]), x1 = Math.max(verts[a], verts[b], verts[c]);
    const z0 = Math.min(verts[a + 2], verts[b + 2], verts[c + 2]), z1 = Math.max(verts[a + 2], verts[b + 2], verts[c + 2]);
    if (x1 < ox - 330 || x0 > ox + 330 || z1 < oz - 330 || z0 > oz + 330) continue;
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

// Out past the woods and in the countries, where there's only the great grid and the two patches that go with you: people
// stood in the ground to the knee out there, and stones hung over the brow of a hill. The grid's middle is where followLand
// (src/gfx/renderer.js) leaves it, as far from you as it lets it get, and you as far from the patches' middle as it lets you.
// [where you are, the great grid's middle, and whether the land there has edges no grid follows: a crag, the lip of a cliff, a barrow's foot]
const FAR = [
  ['west of the woods', [-300, -420], [0, 0]], ['north of the town, by the edge of the grid', [150, -690], [0, 0]],
  ['on the way to Silk Dell', [40, -2300], [128, -2688]], ['on the Sorrowhorn', [-2040, -2500], [-2304, -2304], true],
  ['under the cliff', [2590, -160], [2304, 128], true], ['among the barrows', [-2880, 3400], [-2560, 3200], true], ['in the east', [3900, 2100], [4096, 2432]],
];
// [the tier's grid, its patches' cell, how many times a PC's the drawn ground may be off, and how far out it's looked at]
// (Without the patches a PC's was 3.6 m off west of the woods, 6 m north of the town and 9 m on the mountain; a phone's 12 to 20.)
for (const [name, n, cell, times, reach] of [['a PC (High)', 384, 2, 1, 250], ['a phone', 128, 4, 3, 200]]) {
  test(`on ${name}, the ground is drawn where you walk on it wherever you are`, async () => {
    for (const [where, [x, z], [cx, cz], craggy] of FAR) {
      // (As far off the patches' middle as you get before they're laid again, both ways.)
      const here = [Math.round((x - HERE_STEP * 1.5) / HERE_STEP) * HERE_STEP, Math.round((z + HERE_STEP * 1.5) / HERE_STEP) * HERE_STEP];
      const mesh = await terrain(n, cell, { here, cx, cz, ox: x, oz: z });
      const near = worst(mesh, round(x, z, 100, 1.3)), far = worst(mesh, round(x, z, reach, 3.7));
      assert.ok(near < (craggy ? 2 : 0.4) * times, `${where}: the ground round you is drawn ${near.toFixed(2)} m off`);
      assert.ok(far < (craggy ? 5.5 : 1.2) * times, `${where}: the ground as far as you can make anyone out is drawn ${far.toFixed(2)} m off`);
    }
  });
}

test('the patches that go with you leave the town, the church and its hole to the ones that are always there', async () => {
  const count = async (here) => { const mesh = await terrain(384, 2, { here }); let holes = 0, twice = 0; for (const [x, z] of round(0, 0, 300, 3.1)) { const l = mesh.at(x, z).layers; if (!l) holes++; if (l > 2) twice++; } return { holes, twice, w: worst(mesh, round(0, 0, 55, 1.3)) }; };
  const none = await count(null), there = await count([64, 32]);
  assert.equal(there.holes, none.holes);
  assert.ok(there.w < 0.1, `the town's ground is drawn ${there.w.toFixed(2)} m off`);
});
