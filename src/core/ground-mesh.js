// The land's mesh, built in the pool's threads (src/sim/job.worker.js: 'terrain' and 'near') for src/gfx/renderer.js.
//
// You walk on the land's own height (terrainHeight: src/sim/world.js), and the stones, the boulders and the pines stand on it.
// The mesh is that height at its corners and flat between them, so wherever its cells are big the ground is drawn somewhere
// you aren't standing, and the rocks float or sink. Three layers:
//
//   - The great grid, out to the horizon: about 0.8 m a cell at its middle and metres, then tens of metres, further out. It's
//     laid round the town, and again round you out in the countries every few hundred metres (followLand).
//   - The patches (src/core/ground-patches.js): the hill and its roads, the woods round the town, the church's ground with its
//     hole, the Warrens' portal's hillside, the town; and Lisandra's cave mouth in the hill, in the opening. Laid with the great
//     grid, which leaves out what's well inside them.
//   - The near ground (buildNear): rings round you wherever you are, each ring's cells twice the last's. Its outer edge runs
//     along the great grid's own lines, and is joined to the great grid's own corners there, so the two meet with no crack and
//     nothing drawn twice: the great grid leaves out every cell inside that edge. Under its finest ring it takes the cells of
//     a patch that's coarser (the woods and the hill on a phone: `cut`), leaving a cell of the patch's over its edge; anywhere
//     else it leaves a patch to draw itself. Laid again each time you've gone a few dozen metres (followNear).
//
// node --test tests/ground-mesh.test.mjs holds the drawn ground to the walked on, round the town and out in the countries.
import { openingTerrain, terrainHeight } from './terrain.js';
import { WAY_BOX, caveCuts, wayDip } from './opening.js';

// The great grid's lines, centred on (cx, cz): about 0.8 m a cell at the middle, stretching out to the horizon.
export function greatLines(n, extent, cx = 0, cz = 0) {
  const c = 0.4 * n;
  const warp = (t) => Math.sign(t) * (c * Math.abs(t) + (extent - c) * Math.abs(t) ** 4);
  const xs = new Float32Array(n + 1), zs = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) { xs[i] = cx + warp(i / n * 2 - 1); zs[i] = cz + warp(i / n * 2 - 1); }
  return { xs, zs };
}

// Everything about where the mesh's corners are that both jobs need: the great grid's lines, each patch's size in cells, the
// cave's place in the hill's cells.
function plan({ n, extent, patches, cx = 0, cz = 0 }) {
  const { xs, zs } = greatLines(n, extent, cx, cz);
  const dims = patches.map((p) => [Math.round((p.x1 - p.x0) / p.cell), Math.round((p.z1 - p.z0) / p.cell)]);
  // Lisandra's cave mouth one finer still, on whole cells of the hill's (the first patch), with the hillside left open where the
  // tunnel runs in. (All of her way down too: the shelf, the steps and the path to the road are narrower than a cell of the hill's.)
  const hillP = patches[0], he = hillP.cell;
  const cave = openingTerrain ? (() => {
    const i0 = Math.floor((WAY_BOX.x0 - hillP.x0) / he), j0 = Math.floor((WAY_BOX.z0 - hillP.z0) / he);
    const i1 = Math.ceil((WAY_BOX.x1 - hillP.x0) / he), j1 = Math.ceil((WAY_BOX.z1 - hillP.z0) / he);
    const cell = he > 2 ? 1 : 0.5;
    return { i0, j0, i1, j1, x0: hillP.x0 + i0 * he, z0: hillP.z0 + j0 * he, cell, k: Math.round(he / cell), nx: (i1 - i0) * Math.round(he / cell), nz: (j1 - j0) * Math.round(he / cell) };
  })() : null;
  // (The cave's box and a cell of the hill's round it: the near ground leaves it all to the hill and the cave, whose rim is
  // joined to the hill's cells round it.)
  const keep = cave && { x0: cave.x0 - he, x1: cave.x0 + (cave.i1 - cave.i0 + 1) * he, z0: cave.z0 - he, z1: cave.z0 + (cave.j1 - cave.j0 + 1) * he };
  return { n, xs, zs, patches, dims, hillP, he, cave, keep };
}

// The cave mouth's heights: its rim takes the hill grid's own straight edges, so the two meet without a crack.
function caveHeights(P) {
  const { cave, hillP, he } = P;
  const m = cave.nx + 1, k = cave.k, ys = new Float32Array(m * (cave.nz + 1));
  const hill = (i, j) => terrainHeight(hillP.x0 + i * he, hillP.z0 + j * he);
  for (let j = 0; j <= cave.nz; j++) {
    for (let i = 0; i <= cave.nx; i++) {
      const x = cave.x0 + i * cave.cell, z = cave.z0 + j * cave.cell;
      // (Sunk a little under her stone steps, which lie over it: src/core/opening.js wayDip.)
      let y = terrainHeight(x, z) - wayDip(x, z);
      if (i === 0 || i === cave.nx || j === 0 || j === cave.nz) {
        const ci = cave.i0 + Math.floor(i / k), cj = cave.j0 + Math.floor(j / k), fi = (i % k) / k, fj = (j % k) / k;
        y = i === 0 || i === cave.nx ? hill(ci, cj) + (hill(ci, cj + 1) - hill(ci, cj)) * fj : hill(ci, cj) + (hill(ci + 1, cj) - hill(ci, cj)) * fi;
      }
      ys[j * m + i] = y;
    }
  }
  return ys;
}

const inside = (r, x0, x1, z0, z1) => x0 >= r.x0 && x1 <= r.x1 && z0 >= r.z0 && z1 <= r.z1;
const meets = (r, x0, x1, z0, z1) => x1 > r.x0 && x0 < r.x1 && z1 > r.z0 && z0 < r.z1;

// The triangles of the great grid, the patches and the cave, as an index list into buildTerrain's corners. near: what the near
// ground takes (buildNear's `takes`): the great grid's cells inside its edge, and the cut patches' under its finest ring.
function terrainIndex(P, near, caveYs) {
  const { n, xs, zs, patches, dims, cave, keep } = P;
  const fineCells = dims.reduce((m, [px, pz]) => m + px * pz, 0);
  const idx = new Uint32Array((n * n + fineCells + (cave ? cave.nx * cave.nz : 0)) * 6);
  // (A cell's left out only well inside a patch: the two overlap at the edge, and the ground's colour goes by where it is, so
  // nothing shows. Nor where a patch leaves the ground to this grid: its open skips, and twelve metres round them.)
  const under = (x, z) => patches.some((p) => x > p.x0 + 12 && x < p.x1 - 12 && z > p.z0 + 12 && z < p.z1 - 12
    && !(p.skip || []).some((r) => r.open && x > r.x0 - 12 && x < r.x1 + 12 && z > r.z0 - 12 && z < r.z1 + 12));
  const hole = near?.hole, core = near?.core;
  let o = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (hole && i >= hole.i0 && i < hole.i1 && j >= hole.j0 && j < hole.j1) continue;
      if (under(xs[i], zs[j]) && under(xs[i + 1], zs[j]) && under(xs[i], zs[j + 1]) && under(xs[i + 1], zs[j + 1])) continue;
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
  }
  let first = (n + 1) * (n + 1);
  patches.forEach((patch, q) => {
    const [px, pz] = dims[q], e = patch.cell, hl = patch.hole, skip = patch.skip || [];
    // (Under the near ground's finest ring, a cell's in from its edge: what the near ground draws finer.)
    const taken = core && patch.cut && e > core.e ? { x0: core.x0 + e, x1: core.x1 - e, z0: core.z0 + e, z1: core.z1 - e } : null;
    for (let j = 0; j < pz; j++) {
      for (let i = 0; i < px; i++) {
        if (q === 0 && cave && i >= cave.i0 && i < cave.i1 && j >= cave.j0 && j < cave.j1) continue;
        if (hl) {
          const cx = patch.x0 + (i + 0.5) * e, cz = patch.z0 + (j + 0.5) * e;
          if (cx > hl.x0 && cx < hl.x1 && cz > hl.z0 && cz < hl.z1) continue;
        }
        // (A cell wholly inside what another grid draws is left to it: skip.)
        const sx = patch.x0 + i * e, sz = patch.z0 + j * e;
        if (skip.some((r) => sx >= r.x0 && sx + e <= r.x1 && sz >= r.z0 && sz + e <= r.z1)) continue;
        if (taken && inside(taken, sx, sx + e, sz, sz + e) && !(keep && meets(keep, sx, sx + e, sz, sz + e))) continue;
        const a = first + j * (px + 1) + i, b = a + 1, c = a + px + 1, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }
    first += (px + 1) * (pz + 1);
  });
  if (cave) {
    const second = first, m = cave.nx + 1;
    const cut = (i, j) => caveCuts(cave.x0 + i * cave.cell, cave.z0 + j * cave.cell, caveYs[j * m + i]);
    for (let j = 0; j < cave.nz; j++) {
      for (let i = 0; i < cave.nx; i++) {
        if (cut(i, j) || cut(i + 1, j) || cut(i, j + 1) || cut(i + 1, j + 1)) continue;
        const a = second + j * m + i, b = a + 1, c = a + m, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }
  }
  return idx.slice(0, o);
}

// The great grid, the patches and the cave: their corners (x, y, z, and the normal) and triangles. near: { x, z, cells, radii }
// (src/core/ground-patches.js nearGround) lays the near ground round (x, z) as well, and leaves out what it takes.
export function buildTerrain(args) {
  const P = plan(args), { n, xs, zs, patches, dims, cave } = P;
  const fineVerts = dims.reduce((m, [px, pz]) => m + (px + 1) * (pz + 1), 0);
  const verts = new Float32Array(((n + 1) * (n + 1) + fineVerts + (cave ? (cave.nx + 1) * (cave.nz + 1) : 0)) * 6);
  const hs = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) hs[j * (n + 1) + i] = terrainHeight(xs[i], zs[j]);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, n), jl = Math.max(j - 1, 0), jr = Math.min(j + 1, n);
      const dx = (hs[j * (n + 1) + ir] - hs[j * (n + 1) + il]) / (xs[ir] - xs[il]);
      const dz = (hs[jr * (n + 1) + i] - hs[jl * (n + 1) + i]) / (zs[jr] - zs[jl]);
      const l = 1 / Math.hypot(dx, 1, dz);
      const k = (j * (n + 1) + i) * 6;
      verts[k] = xs[i]; verts[k + 1] = hs[j * (n + 1) + i]; verts[k + 2] = zs[j];
      verts[k + 3] = -dx * l; verts[k + 4] = l; verts[k + 5] = -dz * l;
    }
  }
  const vertex = (k, x, z, y, g) => {
    const dx = (terrainHeight(x + g, z) - terrainHeight(x - g, z)) / (2 * g);
    const dz = (terrainHeight(x, z + g) - terrainHeight(x, z - g)) / (2 * g);
    const l = 1 / Math.hypot(dx, 1, dz);
    verts[k] = x; verts[k + 1] = y; verts[k + 2] = z;
    verts[k + 3] = -dx * l; verts[k + 4] = l; verts[k + 5] = -dz * l;
  };
  let first = (n + 1) * (n + 1);
  patches.forEach((patch, q) => {
    const [px, pz] = dims[q], e = patch.cell;
    for (let j = 0; j <= pz; j++) {
      for (let i = 0; i <= px; i++) {
        const x = patch.x0 + i * e, z = patch.z0 + j * e;
        vertex((first + j * (px + 1) + i) * 6, x, z, terrainHeight(x, z), e);
      }
    }
    first += (px + 1) * (pz + 1);
  });
  let caveYs = null;
  if (cave) {
    caveYs = caveHeights(P);
    const m = cave.nx + 1;
    for (let j = 0; j <= cave.nz; j++) for (let i = 0; i <= cave.nx; i++) vertex((first + j * m + i) * 6, cave.x0 + i * cave.cell, cave.z0 + j * cave.cell, caveYs[j * m + i], cave.cell);
  }
  const near = args.near ? buildNear(P, args.near) : null;
  return { verts, idx: terrainIndex(P, near?.takes, caveYs), near: near && { verts: near.verts, idx: near.idx, at: [args.near.x, args.near.z] } };
}

// The near ground alone, laid round somewhere new over the great grid as it is: its corners and triangles, and the great
// grid's and the patches' triangles again, less what it takes.
export function buildNearOnly(args) {
  const P = plan(args), near = buildNear(P, args.near);
  return { idx: terrainIndex(P, near?.takes, P.cave ? caveHeights(P) : null), near: near && { verts: near.verts, idx: near.idx, at: [args.near.x, args.near.z] } };
}

// The rings round (x, z): ring k has cells of cells[k] out to radii[k] either way, less the ring inside it. Each is the land's
// own height at its corners, but for the corners on its outer edge between two of the next ring's, which lie on that ring's
// straight edge (so there's no crack between them). Past the last ring, out to the great grid's next line either way, a band
// joins its corners to the great grid's own, triangle by triangle along each side. null if it won't fit on the great grid.
export function buildNear(P, { x: cx, z: cz, cells, radii }) {
  const { n, xs, zs, patches, keep } = P;
  const last = cells.length - 1, R = radii[last], GAP = 0.5;
  // The great grid's cells left to it: those between its last lines short of the outer ring's edge either way.
  let i0 = -1, i1 = -1, j0 = -1, j1 = -1;
  for (let i = 0; i <= n; i++) { if (xs[i] <= cx - R - GAP) i0 = i; if (i1 < 0 && xs[i] >= cx + R + GAP) i1 = i; }
  for (let j = 0; j <= n; j++) { if (zs[j] <= cz - R - GAP) j0 = j; if (j1 < 0 && zs[j] >= cz + R + GAP) j1 = j; }
  if (i0 < 0 || i1 < 0 || j0 < 0 || j1 < 0) return null;
  const e0 = cells[0];
  const cutBy = (p) => p.cut && p.cell > e0;
  const verts = [], idx = [];
  // Which side a triangle faces: up, as the great grid's do (it's drawn with the back faces culled).
  const tri = (a, b, c) => {
    const s = (verts[b * 6 + 2] - verts[a * 6 + 2]) * (verts[c * 6] - verts[a * 6]) - (verts[b * 6] - verts[a * 6]) * (verts[c * 6 + 2] - verts[a * 6 + 2]);
    if (s > 0) idx.push(a, b, c); else if (s < 0) idx.push(a, c, b);
  };
  let inner = 0, edge = null;
  for (let k = 0; k <= last; k++) {
    const e = cells[k], Rk = radii[k], m = Math.round(2 * Rk / e), x0 = cx - Rk, z0 = cz - Rk;
    // The ring inside, in this ring's cells: [a, b) either way.
    const a = Math.round((Rk - inner) / e), b = Math.round((Rk + inner) / e);
    // The land's height on this ring's corners and one beyond them, for the normals (none deep inside the ring within).
    const W = m + 3, hs = new Float32Array(W * W);
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        if (inner && i - 1 > a + 1 && i - 1 < b - 1 && j - 1 > a + 1 && j - 1 < b - 1) continue;
        hs[j * W + i] = terrainHeight(x0 + (i - 1) * e, z0 + (j - 1) * e);
      }
    }
    const h = (i, j) => hs[(j + 1) * W + i + 1];
    const vid = new Int32Array((m + 1) * (m + 1)).fill(-1);
    const at = (i, j) => {
      const key = j * (m + 1) + i;
      if (vid[key] >= 0) return vid[key];
      let y = h(i, j);
      // (On the outer edge between two of the next ring's corners: on the line between them.)
      if (k < last) {
        if ((j === 0 || j === m) && i % 2) y = (h(i - 1, j) + h(i + 1, j)) / 2;
        else if ((i === 0 || i === m) && j % 2) y = (h(i, j - 1) + h(i, j + 1)) / 2;
      }
      const dx = (h(i + 1, j) - h(i - 1, j)) / (2 * e), dz = (h(i, j + 1) - h(i, j - 1)) / (2 * e), l = 1 / Math.hypot(dx, 1, dz);
      verts.push(x0 + i * e, y, z0 + j * e, -dx * l, l, -dz * l);
      return (vid[key] = verts.length / 6 - 1);
    };
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < m; i++) {
        if (i >= a && i < b && j >= a && j < b) continue;
        const sx = x0 + i * e, sz = z0 + j * e;
        // Left to a patch it's wholly inside: any patch, but under the finest ring one that's coarser than it (which leaves
        // its cells there to this), and the cave's box.
        if (patches.some((p) => (k > 0 || !cutBy(p)) && inside(p, sx, sx + e, sz, sz + e))) continue;
        if (k === 0 && keep && inside(keep, sx, sx + e, sz, sz + e)) continue;
        const va = at(i, j), vb = at(i + 1, j), vc = at(i, j + 1), vd = at(i + 1, j + 1);
        idx.push(va, vc, vb, vb, vc, vd);
      }
    }
    inner = Rk;
    if (k === last) edge = { at, m };
  }
  // The band out to the great grid. Its corners there are the great grid's own, copied as it lays them (buildTerrain), so the
  // two meet exactly.
  const far = new Map(), f32 = Math.fround;
  const H = (i, j) => f32(terrainHeight(xs[i], zs[j]));
  const farAt = (i, j) => {
    const key = j * (n + 1) + i;
    if (far.has(key)) return far.get(key);
    const il = Math.max(i - 1, 0), ir = Math.min(i + 1, n), jl = Math.max(j - 1, 0), jr = Math.min(j + 1, n);
    const dx = (H(ir, j) - H(il, j)) / (xs[ir] - xs[il]), dz = (H(i, jr) - H(i, jl)) / (zs[jr] - zs[jl]), l = 1 / Math.hypot(dx, 1, dz);
    verts.push(xs[i], H(i, j), zs[j], -dx * l, l, -dz * l);
    far.set(key, verts.length / 6 - 1);
    return far.get(key);
  };
  // (A triangle of it well inside a patch is left out: the great grid isn't drawn there, and the patch is.)
  const deep = (p, v) => v[1] > p.x0 + 12 && v[1] < p.x1 - 12 && v[2] > p.z0 + 12 && v[2] < p.z1 - 12;
  const band = (outer, inner) => {
    // outer, inner: [u along the side 0..1, x, z, () => the corner's index], from one corner of the side to the other.
    let p = 0, q = 0;
    const put = (A, B, C) => { if (!patches.some((pt) => deep(pt, A) && deep(pt, B) && deep(pt, C))) tri(A[3](), B[3](), C[3]()); };
    while (p < outer.length - 1 || q < inner.length - 1) {
      if (q === inner.length - 1 || (p < outer.length - 1 && outer[p + 1][0] <= inner[q + 1][0])) { put(outer[p], outer[p + 1], inner[q]); p++; }
      else { put(outer[p], inner[q + 1], inner[q]); q++; }
    }
  };
  const { at, m } = edge, X0 = cx - R, Z0 = cz - R, e = cells[last];
  const span = (lo, hi, v) => (v - lo) / (hi - lo);
  const outerX = (j) => { const o = []; for (let i = i0; i <= i1; i++) o.push([span(xs[i0], xs[i1], xs[i]), xs[i], zs[j], () => farAt(i, j)]); return o; };
  const outerZ = (i) => { const o = []; for (let j = j0; j <= j1; j++) o.push([span(zs[j0], zs[j1], zs[j]), xs[i], zs[j], () => farAt(i, j)]); return o; };
  const innerX = (j) => { const o = []; for (let i = 0; i <= m; i++) o.push([i / m, X0 + i * e, Z0 + j * e, () => at(i, j)]); return o; };
  const innerZ = (i) => { const o = []; for (let j = 0; j <= m; j++) o.push([j / m, X0 + i * e, Z0 + j * e, () => at(i, j)]); return o; };
  band(outerX(j0), innerX(0));
  band(outerX(j1), innerX(m));
  band(outerZ(i0), innerZ(0));
  band(outerZ(i1), innerZ(m));
  return {
    verts: new Float32Array(verts), idx: new Uint32Array(idx),
    takes: { hole: { i0, i1, j0, j1 }, core: { x0: cx - radii[0], x1: cx + radii[0], z0: cz - radii[0], z1: cz + radii[0], e: e0 } },
  };
}
