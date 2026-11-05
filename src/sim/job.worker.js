// A pool thread. At load it decodes textures and builds meshes in parallel. Once the game runs, each pool
// thread spends a small slice of every 40 ms playing out the duel to come, so the knight's next tactic is
// informed by however many cores the machine can spare.
import { CTRL, PLAN_FLOATS, PLAN_OBS, PLAN_TACTICS, mapShared } from '../core/layout.js';
import { forestAmount, forestTrees } from '../core/forest.js';
import { ROADS, SUMMIT, fbm, footprintDirt, hash2, nearest, pathAmount, sstep, terrainHeight } from '../core/terrain.js';

async function decode(url, flags) {
  const r = await fetch(url);
  const blob = await r.blob();
  const opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
  if (flags && flags.width) { opts.resizeWidth = flags.width; opts.resizeHeight = flags.height; opts.resizeQuality = 'high'; }
  return createImageBitmap(blob, opts);
}

// The terrain grid: dense under the village and stretching to the horizon with a warped spacing.
function buildTerrain({ n, extent, patch }) {
  // The hill and its roads have a finer grid of their own: this one's cells are ten metres across out there, which a road can't be cut into.
  const px = Math.round((patch.x1 - patch.x0) / patch.cell), pz = Math.round((patch.z1 - patch.z0) / patch.cell);
  const verts = new Float32Array(((n + 1) * (n + 1) + (px + 1) * (pz + 1)) * 6);
  // About 0.8 m a cell at the centre, stretching out to the horizon.
  const c = 0.4 * n;
  const warp = (t) => Math.sign(t) * (c * Math.abs(t) + (extent - c) * Math.abs(t) ** 4);
  const xs = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) xs[i] = warp(i / n * 2 - 1);
  const hs = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) hs[j * (n + 1) + i] = terrainHeight(xs[i], xs[j]);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, n), jl = Math.max(j - 1, 0), jr = Math.min(j + 1, n);
      const dx = (hs[j * (n + 1) + ir] - hs[j * (n + 1) + il]) / (xs[ir] - xs[il]);
      const dz = (hs[jr * (n + 1) + i] - hs[jl * (n + 1) + i]) / (xs[jr] - xs[jl]);
      const l = 1 / Math.hypot(dx, 1, dz);
      const k = (j * (n + 1) + i) * 6;
      verts[k] = xs[i]; verts[k + 1] = hs[j * (n + 1) + i]; verts[k + 2] = xs[j];
      verts[k + 3] = -dx * l; verts[k + 4] = l; verts[k + 5] = -dz * l;
    }
  }
  // (A cell's left out only well inside it: the two overlap at the edge, and the ground's colour goes by where it is, so nothing shows.)
  const under = (x, z) => x > patch.x0 + 12 && x < patch.x1 - 12 && z > patch.z0 + 12 && z < patch.z1 - 12;
  const idx = new Uint32Array((n * n + px * pz) * 6);
  let o = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (under(xs[i], xs[j]) && under(xs[i + 1], xs[j]) && under(xs[i], xs[j + 1]) && under(xs[i + 1], xs[j + 1])) continue;
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
  }
  const first = (n + 1) * (n + 1), e = patch.cell;
  for (let j = 0; j <= pz; j++) {
    for (let i = 0; i <= px; i++) {
      const x = patch.x0 + i * e, z = patch.z0 + j * e;
      const dx = (terrainHeight(x + e, z) - terrainHeight(x - e, z)) / (2 * e);
      const dz = (terrainHeight(x, z + e) - terrainHeight(x, z - e)) / (2 * e);
      const l = 1 / Math.hypot(dx, 1, dz);
      const k = (first + j * (px + 1) + i) * 6;
      verts[k] = x; verts[k + 1] = terrainHeight(x, z); verts[k + 2] = z;
      verts[k + 3] = -dx * l; verts[k + 4] = l; verts[k + 5] = -dz * l;
    }
  }
  for (let j = 0; j < pz; j++) {
    for (let i = 0; i < px; i++) {
      const a = first + j * (px + 1) + i, b = a + 1, c = a + px + 1, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
  }
  return { verts, idx: idx.subarray(0, o) };
}

// The pines: (x, y, z, height), (cos, sin, how wide, how dark), all the way out.
function buildForest({ reach }) {
  const t = forestTrees(reach), n = t.length / 6;
  const trees = new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    const x = t[i * 6], z = t[i * 6 + 1], k = i * 8;
    trees[k] = x; trees[k + 1] = terrainHeight(x, z); trees[k + 2] = z; trees[k + 3] = t[i * 6 + 2];
    trees[k + 4] = t[i * 6 + 4]; trees[k + 5] = t[i * 6 + 5]; trees[k + 6] = t[i * 6 + 3]; trees[k + 7] = 0.72 + 0.42 * hash2(i, 77);
  }
  return { trees };
}

// A coarse map of all the land there is, for what the map over the village doesn't reach: r = worn road, g = under the pines.
function buildFarRows({ size, half, rowStart, rowEnd }) {
  const data = new Uint8Array((rowEnd - rowStart) * size * 4);
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
      if (Math.abs(x) < 240 && Math.abs(z) < 240) dirt = Math.max(dirt, pathAmount(x, z));
      data[o++] = Math.round(dirt * 255);
      data[o++] = Math.round(forestAmount(x, z) * 255);
      data[o++] = 0;
      data[o++] = 255;
    }
  }
  return { data, rowStart };
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
      case 'farground':
        result = buildFarRows(args);
        transfer = [result.data.buffer];
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
