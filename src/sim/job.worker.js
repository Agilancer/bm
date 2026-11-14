// A pool thread. At load it decodes textures and builds meshes in parallel. Once the game runs, each pool
// thread spends a small slice of every 40 ms playing out the duel to come, so the knight's next tactic is
// informed by however many cores the machine can spare.
import { CTRL, PLAN_FLOATS, PLAN_OBS, PLAN_TACTICS, mapShared } from '../core/layout.js';
import { TREE_FLOATS, TRIMMED, forestAmount, forestTrees } from '../core/forest.js';
import { openingTerrain, setOpeningTerrain, ROADS, SUMMIT, fbm, footprintDirt, hash2, nearest, pathAmount, sstep, terrainHeight } from '../core/terrain.js';
import { CHURCH_FOOTPRINT, CHURCH_WING } from '../core/church.js';
import { WAY_BOX, caveCuts, wayDip } from '../core/opening.js';
import { roadEdge, rocksAround } from '../core/rocks.js';
import { COUNTRIES, COUNTRY_KEYS, MOUNT, SITES, SITE_KEYS, countryWeights, groundCover, routeDist } from '../core/lands.js';

async function decode(url, flags) {
  const r = await fetch(url);
  const blob = await r.blob();
  const opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
  if (flags && flags.width) { opts.resizeWidth = flags.width; opts.resizeHeight = flags.height; opts.resizeQuality = 'high'; }
  return createImageBitmap(blob, opts);
}

// The terrain grid: dense under the village and stretching to the horizon with a warped spacing.
function buildTerrain({ n, extent, patches, cx = 0, cz = 0 }) {
  // The hill and its roads have a finer grid of their own: this one's cells are ten metres across out there, which a road can't be cut
  // into. So has the ground round the church, which has a hole in it (src/core/church.js LAND_HOLE).
  // And the woods round the town and the Warrens' portal's hillside, and wherever you are, two that go with you
  // (src/core/ground-patches.js, where the patches are named).
  const dims = patches.map((p) => [Math.round((p.x1 - p.x0) / p.cell), Math.round((p.z1 - p.z0) / p.cell)]);
  const fineVerts = dims.reduce((m, [px, pz]) => m + (px + 1) * (pz + 1), 0), fineCells = dims.reduce((m, [px, pz]) => m + px * pz, 0);
  // And Lisandra's cave mouth one finer still, on whole cells of the hill's (the first patch), with the hillside left open where the
  // tunnel runs in.
  const hillP = patches[0], he = hillP.cell;
  const cave = openingTerrain ? (() => {
    // (All of her way down too: the shelf, the steps and the path to the road are narrower than a cell of the hill's.)
    const i0 = Math.floor((WAY_BOX.x0 - hillP.x0) / he), j0 = Math.floor((WAY_BOX.z0 - hillP.z0) / he);
    const i1 = Math.ceil((WAY_BOX.x1 - hillP.x0) / he), j1 = Math.ceil((WAY_BOX.z1 - hillP.z0) / he);
    const cell = he > 2 ? 1 : 0.5;
    return { i0, j0, i1, j1, x0: hillP.x0 + i0 * he, z0: hillP.z0 + j0 * he, cell, k: Math.round(he / cell), nx: (i1 - i0) * Math.round(he / cell), nz: (j1 - j0) * Math.round(he / cell) };
  })() : null;
  const fnx = cave ? cave.nx : 0, fnz = cave ? cave.nz : 0;
  const verts = new Float32Array(((n + 1) * (n + 1) + fineVerts + (cave ? (fnx + 1) * (fnz + 1) : 0)) * 6);
  // About 0.8 m a cell at the centre, stretching out to the horizon.
  const c = 0.4 * n;
  const warp = (t) => Math.sign(t) * (c * Math.abs(t) + (extent - c) * Math.abs(t) ** 4);
  // (Centred on (cx, cz): out in the far countries the grid is moved under the player, src/gfx/renderer.js followLand.)
  const xs = new Float32Array(n + 1), zs = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) { xs[i] = cx + warp(i / n * 2 - 1); zs[i] = cz + warp(i / n * 2 - 1); }
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
  // (A cell's left out only well inside it: the two overlap at the edge, and the ground's colour goes by where it is, so nothing shows.)
  // (Nor where a patch leaves the ground to this grid: its open skips, and twelve metres round them.)
  // (lap: how far in from a patch's edge this grid's cells are still drawn, twelve metres unless it says. The ones that go with
  // you say none: this grid's cells are ten and twenty metres across out there, and wherever one lies over a patch it's the
  // higher of the two that shows.)
  const under = (x, z) => patches.some((p) => { const m = p.lap ?? 12; return x > p.x0 + m && x < p.x1 - m && z > p.z0 + m && z < p.z1 - m
    && !(p.skip || []).some((r) => r.open && x > r.x0 - 12 && x < r.x1 + 12 && z > r.z0 - 12 && z < r.z1 + 12); });
  const idx = new Uint32Array((n * n + fineCells + fnx * fnz) * 6);
  let o = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (under(xs[i], zs[j]) && under(xs[i + 1], zs[j]) && under(xs[i], zs[j + 1]) && under(xs[i + 1], zs[j + 1])) continue;
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
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
    const [px, pz] = dims[q], e = patch.cell, hole = patch.hole, skip = patch.skip || [];
    // (Its heights worked out once each, with a row more all round for the slopes: the same sums as vertex(), a fifth of the
    // work. The patches that go with you are laid again every few dozen metres.)
    const W = px + 3, hp = new Float64Array(W * (pz + 3));
    for (let j = 0; j < pz + 3; j++) for (let i = 0; i < W; i++) hp[j * W + i] = terrainHeight(patch.x0 + (i - 1) * e, patch.z0 + (j - 1) * e);
    for (let j = 0; j <= pz; j++) {
      for (let i = 0; i <= px; i++) {
        const k = (first + j * (px + 1) + i) * 6, h = (j + 1) * W + i + 1;
        const dx = (hp[h + 1] - hp[h - 1]) / (2 * e), dz = (hp[h + W] - hp[h - W]) / (2 * e), l = 1 / Math.hypot(dx, 1, dz);
        verts[k] = patch.x0 + i * e; verts[k + 1] = hp[h]; verts[k + 2] = patch.z0 + j * e;
        verts[k + 3] = -dx * l; verts[k + 4] = l; verts[k + 5] = -dz * l;
      }
    }
    for (let j = 0; j < pz; j++) {
      for (let i = 0; i < px; i++) {
        if (q === 0 && cave && i >= cave.i0 && i < cave.i1 && j >= cave.j0 && j < cave.j1) continue;
        if (hole) {
          const cx = patch.x0 + (i + 0.5) * e, cz = patch.z0 + (j + 0.5) * e;
          if (cx > hole.x0 && cx < hole.x1 && cz > hole.z0 && cz < hole.z1) continue;
        }
        // (A cell wholly inside what another grid draws is left to it: skip.)
        const sx = patch.x0 + i * e, sz = patch.z0 + j * e;
        if (skip.some((r) => sx >= r.x0 && sx + e <= r.x1 && sz >= r.z0 && sz + e <= r.z1)) continue;
        const a = first + j * (px + 1) + i, b = a + 1, c = a + px + 1, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }
    first += (px + 1) * (pz + 1);
  });
  if (cave) {
    // Its rim takes the hill grid's own straight edges, so the two meet without a crack.
    const second = first, m = fnx + 1, k = cave.k;
    const hill = (i, j) => terrainHeight(hillP.x0 + i * he, hillP.z0 + j * he);
    for (let j = 0; j <= fnz; j++) {
      for (let i = 0; i <= fnx; i++) {
        const x = cave.x0 + i * cave.cell, z = cave.z0 + j * cave.cell;
        // (Sunk a little under her stone steps, which lie over it: src/core/opening.js wayDip.)
        let y = terrainHeight(x, z) - wayDip(x, z);
        if (i === 0 || i === fnx || j === 0 || j === fnz) {
          const ci = cave.i0 + Math.floor(i / k), cj = cave.j0 + Math.floor(j / k), fi = (i % k) / k, fj = (j % k) / k;
          y = i === 0 || i === fnx ? hill(ci, cj) + (hill(ci, cj + 1) - hill(ci, cj)) * fj : hill(ci, cj) + (hill(ci + 1, cj) - hill(ci, cj)) * fi;
        }
        vertex((second + j * m + i) * 6, x, z, y, cave.cell);
      }
    }
    const cut = (i, j) => caveCuts(cave.x0 + i * cave.cell, cave.z0 + j * cave.cell, verts[(second + j * m + i) * 6 + 1]);
    for (let j = 0; j < fnz; j++) {
      for (let i = 0; i < fnx; i++) {
        if (cut(i, j) || cut(i + 1, j) || cut(i, j + 1) || cut(i + 1, j + 1)) continue;
        const a = second + j * m + i, b = a + 1, c = a + m, d = c + 1;
        idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
      }
    }
  }
  return { verts, idx: idx.subarray(0, o) };
}

// The pines: (x, y, z, height), (cos, sin, how wide, how dark), all the way out.
// (How dark goes in the last float's fraction; the tint, lands.js treeCode, times ten on top; and a hundred more for a pine
// with its low boughs off: src/gfx/pines.js reads all three.)
function buildForest({ reach, cx = 0, cz = 0 }) {
  const t = forestTrees(reach, cx, cz), F = TREE_FLOATS, n = t.length / F;
  const trees = new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    const x = t[i * F], z = t[i * F + 1], k = i * 8;
    trees[k] = x; trees[k + 1] = terrainHeight(x, z); trees[k + 2] = z; trees[k + 3] = t[i * F + 2];
    trees[k + 4] = t[i * F + 4]; trees[k + 5] = t[i * F + 5]; trees[k + 6] = t[i * F + 3];
    const code = t[i * F + 6], trim = code >= TRIMMED;
    trees[k + 7] = 0.72 + 0.42 * hash2(Math.round(x * 7), Math.round(z * 7)) + 10 * (trim ? code - TRIMMED : code) + (trim ? 100 : 0);
  }
  return { trees, cx, cz };
}

// A coarse map of all the land there is, for what the map over the village doesn't reach: r = worn road, g = under the pines,
// b = snow, a = bare rock. And beside it the countries' look (src/core/lands.js): rgb their tint over 1.5, a how wet.
// And a third, what kind of stone and ground: r the Ashen Waste (ash and basalt), g the Rustwood (rust-red stone), b the Downs and
// the Barrow Moor (pale limestone), a the Sorrowhorn's flanks (black stone). None of them: grey granite, as round the town.
// (Snow, rock and the tint change slowly, so they're worked out once to a block of four texels by four.)
const KIND_OF = { ashen: [1, 0, 0, 0], rustwood: [0, 1, 0, 0], downs: [0, 0, 1, 0], barrow: [0, 0, 0.8, 0] };
function buildFarRows({ size, half, rowStart, rowEnd }) {
  const data = new Uint8Array((rowEnd - rowStart) * size * 4);
  const tint = new Uint8Array((rowEnd - rowStart) * size * 4);
  const kind = new Uint8Array((rowEnd - rowStart) * size * 4);
  const cw = new Float32Array(COUNTRY_KEYS.length);
  const blocks = new Map();
  const block = (bi, bj) => {
    const key = bi * 65536 + bj;
    let b = blocks.get(key);
    if (b) return b;
    const x = (bi * 4 + 2) / size * 2 * half - half, z = (bj * 4 + 2) / size * 2 * half - half;
    b = [0, 0, 170, 170, 170, 0, 0, 0, 0, 0];
    if (Math.hypot(x, z) > 1000) {
      const g = 4, h = terrainHeight(x, z);
      const dx = (terrainHeight(x + g, z) - terrainHeight(x - g, z)) / (2 * g), dz = (terrainHeight(x, z + g) - terrainHeight(x, z - g)) / (2 * g);
      const slope = 1 - 1 / Math.hypot(dx, 1, dz);
      const [snow, rock] = groundCover(x, z, h, slope * 3);
      countryWeights(x, z, cw);
      let r = 0, gg = 0, bb = 0, wet = 0;
      COUNTRY_KEYS.forEach((k, c) => { const t = COUNTRIES[k]; r += cw[c] * t.tint[0]; gg += cw[c] * t.tint[1]; bb += cw[c] * t.tint[2]; wet += cw[c] * t.wet; });
      // (The near land keeps its own colour: the tint comes in past 1.15 km.)
      const k = sstep(1150, 1700, Math.hypot(x, z));
      const kd = [0, 0, 0, 0];
      COUNTRY_KEYS.forEach((key, c) => { const f = KIND_OF[key]; if (f) for (let q = 0; q < 4; q++) kd[q] += cw[c] * f[q]; });
      const md = Math.hypot(x - MOUNT.x, z - MOUNT.z);
      kd[3] = md < MOUNT.R ? sstep(0.15, 0.55, 1 - md / MOUNT.R) : 0;
      b = [snow, rock, (1 + (r - 1) * k) / 1.5 * 255, (1 + (gg - 1) * k) / 1.5 * 255, (1 + (bb - 1) * k) / 1.5 * 255, wet * k * 255, ...kd.map((v) => v * k * 255)];
    }
    blocks.set(key, b);
    return b;
  };
  let o = 0;
  for (let j = rowStart; j < rowEnd; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size * 2 * half - half, z = (j + 0.5) / size * 2 * half - half;
      let dirt = 0;
      if (x < -20 && x > -640 && z > -60 && z < 360) {
        const wob = (fbm(x * 0.21, z * 0.21, 2) - 0.5) * 2.6;
        for (const road of ROADS) {
          if (x < road.x0 || x > road.x1 || z < road.z0 || z > road.z1) continue;
          dirt = Math.max(dirt, 1 - sstep(road.w * 0.62, road.w * 1.18, nearest(road, x, z).d + wob));
        }
        dirt = Math.max(dirt, 1 - sstep(SUMMIT.r - 2, SUMMIT.r + 9, Math.hypot(x - SUMMIT.x, z - SUMMIT.z) + wob * 2));
      }
      // (The church's yard is out past the map over the village, so it's worn here: src/core/church.js.)
      if (Math.abs(x) < 240 && Math.abs(z) < 240) dirt = Math.max(dirt, pathAmount(x, z), footprintDirt(x, z, [CHURCH_FOOTPRINT, CHURCH_WING]));
      // The roads out to the countries, and the trodden ground of the places along them.
      if (Math.abs(x) > 280 || Math.abs(z) > 280) {
        const wob = (fbm(x * 0.13, z * 0.13, 2) - 0.5) * 3;
        const rd = routeDist(x, z);
        if (rd.road) dirt = Math.max(dirt, 1 - sstep(rd.road.w * 0.6, rd.road.w * 1.25, rd.d + wob));
        for (const key of SITE_KEYS) {
          const s = SITES[key];
          if (!s.pad) continue;
          const d = Math.hypot(x - s.x, z - s.z);
          if (d < s.pad) dirt = Math.max(dirt, (1 - sstep(s.pad * 0.35, s.pad * 0.9, d + wob * 2)) * 0.85);
        }
      }
      const b = block(i >> 2, j >> 2);
      tint[o] = b[2]; tint[o + 1] = b[3]; tint[o + 2] = b[4]; tint[o + 3] = b[5];
      kind[o] = b[6]; kind[o + 1] = b[7]; kind[o + 2] = b[8]; kind[o + 3] = b[9];
      data[o++] = Math.round(dirt * 255);
      data[o++] = Math.round(forestAmount(x, z) * 255);
      data[o++] = Math.round(b[0] * 255);
      data[o++] = Math.round(b[1] * 255);
    }
  }
  return { data, tint, kind, rowStart };
}

// Ground map over the village: r = worn dirt, g = grass density, b = large scale variation.
function buildGroundRows({ size, half, colliders, rowStart, rowEnd }) {
  const data = new Uint8Array((rowEnd - rowStart) * size * 4);
  const heights = new Float32Array((rowEnd - rowStart) * size);
  let o = 0;
  for (let j = rowStart; j < rowEnd; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size * 2 * half - half, z = (j + 0.5) / size * 2 * half - half;
      const dirt = Math.max(pathAmount(x, z), footprintDirt(x, z, colliders));
      const ph = Math.sin(x * 0.11 + z * 0.07) * 0.5 + Math.sin(x * 0.03 - z * 0.09 + 2) * 0.5;
      const grass = Math.max(0, 1 - dirt * 1.7) * (0.85 + 0.15 * ph) * (1 - 0.82 * forestAmount(x, z));
      data[o * 4] = Math.round(dirt * 255);
      data[o * 4 + 1] = Math.round(grass * 255);
      data[o * 4 + 2] = Math.round((ph * 0.5 + 0.5) * 255);
      data[o * 4 + 3] = 255;
      heights[o] = terrainHeight(x, z);
      o++;
    }
  }
  return { data, heights, rowStart };
}

// ---- planning -------------------------------------------------------------------------------------------

// Plays out one tactic in a coarse model of the duel, using what's actually been happening in this fight, and
// returns how it went for the knight. Each tactic has its own trade: distance, how often it swings, how well it
// guards, how much a whiff is punished, how well it lands, and how exposed it leaves him.
const PLANS = [
  { ring: 1.9, swing: 0.62, guard: 0.42, punish: 0.0, land: 0.08, cost: 0.14 },   // press
  { ring: 3.0, swing: 0.26, guard: 0.68, punish: 0.1, land: 0.0, cost: 0.14 },    // circle
  { ring: 3.7, swing: 0.16, guard: 0.22, punish: 0.45, land: -0.03, cost: 0.14 }, // bait
  { ring: 2.2, swing: 0.22, guard: 0.95, punish: 0.05, land: -0.06, cost: 0.12 }, // shield wall
  { ring: 3.6, swing: 0.38, guard: 0.5, punish: 0.2, land: 0.16, cost: 0.2 },     // flank dash
  { ring: 6.5, swing: 0.05, guard: 0.6, punish: 0.0, land: 0.0, cost: 0.1 },      // fall back
];

function rollout(tactic, obs, rng) {
  let dist = obs[0], hp = obs[1], php = obs[2], stam = obs[3];
  const bleeds = obs[4], aggression = obs[5], whiff = obs[6], repeat = obs[7];
  const landRate = obs[10] || 0.4, playerHits = obs[11] || 0.5, defended = obs[12] || 0.4;
  const plan = PLANS[tactic];
  const reach = 2.4;
  let dealt = 0, taken = 0, t = 0;
  const swingProb = 0.25 + aggression * 0.55;
  while (t < 7) {
    const dt = 0.25;
    t += dt;
    // Falling back lets a wound clot and gets the wind back.
    hp -= bleeds * 0.012 * dt * (tactic === 5 ? 0.55 : 1);
    stam = Math.min(1, stam + dt * (tactic === 5 ? 0.3 : 0.18));
    dist += Math.max(-1, Math.min(1, plan.ring - dist)) * dt * 1.5 - (aggression - 0.4) * dt * 0.9;
    dist = Math.max(0.8, dist);
    // The player's move.
    if (rng() < swingProb * dt * 2) {
      if (dist < reach + 0.4) {
        const read = 0.25 + defended * 0.3 + Math.min(repeat, 4) * 0.06;
        if (stam > 0.1 && (rng() < read || rng() < plan.guard * Math.min(1, stam * 1.8))) {
          stam -= 0.18;
          if (rng() < 0.4 + plan.punish) { php -= 0.11; dealt += 0.11; }
        } else if (rng() < playerHits + 0.2) {
          const hit = 0.02 + (bleeds > 0 ? 0.07 : 0.03);
          hp -= hit; taken += hit;
        }
      } else if (rng() < whiff * 0.5 + plan.punish) {
        php -= 0.14; dealt += 0.14;
      }
    }
    // The knight's move.
    if (stam > 0.3 && rng() < plan.swing * dt * 2) {
      stam -= plan.cost;
      if (dist < reach + 0.7 && rng() < landRate + plan.land) { php -= 0.16; dealt += 0.16; }
    }
    if (hp <= 0 || php <= 0) break;
  }
  const finish = (php <= 0 ? 1.4 : 0) - (hp <= 0 ? 1.8 : 0);
  return dealt * 1.5 - taken * (1.2 + (1 - obs[1]) * 1.5) + finish;
}

// The map's samples (src/ui/map.js rows), rows j0 to j1 of a paper `grid` samples across out to `edge`: the heights, and for
// the whole land's paper its woods and its countries' tints too. The same sums in the same order as the map's own.
function mapRows({ edge, grid, j0, j1, land }) {
  const N = grid + 1, step = (2 * edge) / grid, n = (j1 - j0) * N;
  const h = new Float32Array(n), wood = land ? new Float32Array(n) : null, tint = land ? new Float32Array(n * 3) : null;
  const w = new Float32Array(COUNTRY_KEYS.length);
  for (let j = j0; j < j1; j++) {
    const z = edge - j * step;
    for (let i = 0; i < N; i++) {
      const x = edge - i * step, k = (j - j0) * N + i;
      h[k] = terrainHeight(x, z);
      if (!land) continue;
      wood[k] = forestAmount(x, z);
      countryWeights(x, z, w);
      let r = 0, gg = 0, b = 0;
      COUNTRY_KEYS.forEach((key, c) => { const t = COUNTRIES[key].tint; r += w[c] * t[0]; gg += w[c] * t[1]; b += w[c] * t[2]; });
      tint[k * 3] = r; tint[k * 3 + 1] = gg; tint[k * 3 + 2] = b;
    }
  }
  return { h, wood, tint };
}

let planning = false;
function plannerLoop(shared, id, budgetMs, intervalMs) {
  let s = (id * 2654435761 + 1) >>> 0;
  const rng = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const obs = new Float32Array(PLAN_OBS);
  const sum = new Float32Array(PLAN_TACTICS), count = new Float32Array(PLAN_TACTICS);
  let total = 0;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  const { ctrl, plan } = shared;
  planning = true;
  while (planning && Atomics.load(ctrl, CTRL.PLAN_RUN)) {
    Atomics.wait(sleeper, 0, 0, intervalMs);
    if (plan[9] === 0) continue;
    obs.set(plan.subarray(0, PLAN_OBS));
    const end = performance.now() + budgetMs;
    while (performance.now() < end) {
      for (let k = 0; k < 16; k++) {
        const t = (rng() * PLAN_TACTICS) | 0;
        sum[t] += rollout(t, obs, rng); count[t]++; total++;
      }
    }
    // Age old results so the plan follows the fight.
    for (let t = 0; t < PLAN_TACTICS; t++) {
      plan[PLAN_OBS + t * 2] = plan[PLAN_OBS + t * 2] * 0.92 + sum[t];
      plan[PLAN_OBS + t * 2 + 1] = plan[PLAN_OBS + t * 2 + 1] * 0.92 + count[t];
      sum[t] = 0; count[t] = 0;
    }
    plan[PLAN_FLOATS - 1] += total;
    total = 0;
  }
}

self.addEventListener('message', async (e) => {
  const { id, type, args } = e.data;
  try {
    setOpeningTerrain(args.opening);
    let result, transfer = [];
    switch (type) {
      case 'decode':
        result = await decode(args.url, args);
        transfer = [result];
        break;
      case 'terrain':
        result = buildTerrain(args);
        transfer = [result.verts.buffer, result.idx.buffer];
        break;
      case 'forest':
        result = buildForest(args);
        transfer = [result.trees.buffer];
        break;
      case 'roadmap': {
        // The roads round (cx, cz) finely, for the ground's shader: how far each half-metre is from the nearest road's middle,
        // and that road's half-width (src/gfx/rocks.js followRoads).
        const N = 512, data = new Uint8Array(N * N * 4), x0 = args.cx - N * 0.25, z0 = args.cz - N * 0.25;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const e = roadEdge(x0 + (i + 0.5) * 0.5, z0 + (j + 0.5) * 0.5), o = (j * N + i) * 4;
          const far = e.d > 1e8;
          data[o] = far ? 255 : Math.min(255, Math.max(0, Math.round((e.d + e.w) / 12 * 255)));
          data[o + 1] = far ? 0 : Math.min(255, Math.round(e.w / 8 * 255));
          data[o + 3] = 255;
        }
        result = { data, x0, z0 };
        transfer = [data.buffer];
        break;
      }
      case 'maprows':
        result = mapRows(args);
        transfer = result.wood ? [result.h.buffer, result.wood.buffer, result.tint.buffer] : [result.h.buffer];
        break;
      case 'rocks':
        result = rocksAround(args.cx, args.cz, args.sreach, args.breach);
        transfer = [result.stones.buffer, result.boulders.buffer];
        break;
      case 'farground':
        result = buildFarRows(args);
        transfer = [result.data.buffer, result.tint.buffer, result.kind.buffer];
        break;
      case 'ground':
        result = buildGroundRows(args);
        transfer = [result.data.buffer, result.heights.buffer];
        break;
      case 'plan':
        plannerLoop(mapShared(args.buffer), args.index, args.budget, args.interval);
        return;
      default:
        throw new Error(`unknown job ${type}`);
    }
    self.postMessage({ id, result }, transfer);
  } catch (err) {
    self.postMessage({ id, error: err.message });
  }
});
