// The pines round the town: where they stand. Worked out the same on every thread, for the renderer to draw and the sim to bump into.
import { openingTerrain, PATHS, PLOTS, ROADS, SUMMIT, fbm, hash2, nearest, pathStretches, segDist2, sstep, terrainHeight } from './terrain.js';
import { churchSite } from './church.js';
import { oldChurchGround } from './town.js';
import { CAVE_MOUTH, CAVE_OUT, ESCORT_TO, inCaveBox } from './opening.js';
import { landTrees, routeDist, treeCode } from './lands.js';

// From the ledge outside Lisandra's cave you can see the town far below: along that line nothing grows that would stand up
// into the sight of it. The gap widens with distance and its edges are soft, and where the ground falls away far enough
// under the line the pines stand as they would; so from anywhere else it's only the woods a little thinner.
const LEDGE = [CAVE_MOUTH[0] + CAVE_OUT[0] * 5.6, CAVE_MOUTH[1] + CAVE_OUT[1] * 5.6];
let lane = null;
function viewLane(x, z) {
  if (!lane) {
    const dx = ESCORT_TO[0] - LEDGE[0], dz = ESCORT_TO[1] - LEDGE[1], L = Math.hypot(dx, dz);
    lane = { eye: terrainHeight(LEDGE[0], LEDGE[1]) + 1.6, town: terrainHeight(ESCORT_TO[0], ESCORT_TO[1]) + 5, ux: dx / L, uz: dz / L, L };
  }
  const { eye, town, ux, uz, L } = lane;
  const px = x - LEDGE[0], pz = z - LEDGE[1];
  const d = px * ux + pz * uz;
  if (d < 10 || d > L - 70) return 1;
  const half = 3 + d * 0.055, side = Math.abs(px * uz - pz * ux);
  if (side > half * 1.8) return 1;
  if (eye + (town - eye) * d / L - terrainHeight(x, z) > 24) return 1;
  return sstep(half, half * 1.8, side);
}

// The long paths' stretches, each with the box past which a tree is clear of it (src/core/terrain.js pathStretches).
const LONG_PATHS = pathStretches(PATHS.filter((p) => p.pts.length >= 5), (w) => w + 5.001);

// How thick the forest would stand here, 0 to 1: nothing in the town's clearing, on the church's ground or the roads, or on top of the hill.
export function forestAmount(x, z) {
  const r = Math.hypot(x, z);
  // (The clearing's edge is never past 86 m out, so beyond that there's no need to work out where it is.)
  let a = 1;
  if (r < 92) {
    const clearing = 64 + (fbm(x * 0.021 + 3, z * 0.021 + 7, 2) - 0.5) * 22;
    a = sstep(clearing, clearing + 16, r);
  }
  if (a <= 0) return 0;
  // The church's ground, where it stands now and where it stood, which is the town's to build on: src/core/church.js, src/core/town.js.
  const site = Math.min(oldChurchGround(x, z), churchSite(x, z));
  a *= sstep(8, 26, site);
  if (a <= 0) return 0;
  for (const p of PLOTS) {
    if (Math.max(Math.abs(x - p[0]) - p[2], Math.abs(z - p[1]) - p[3]) < 8) return 0;
  }
  // (Nothing grows over Lisandra's cave: a trunk stands in the way at any height, and the ledge is bare rock.)
  if (openingTerrain && inCaveBox(x, z, 7)) return 0;
  if (openingTerrain) { a *= viewLane(x, z); if (a <= 0) return 0; }
  if (r < 260) {
    for (let i = 0; i < LONG_PATHS.length; i++) {
      const s = LONG_PATHS[i];
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      if (s.cave && !openingTerrain) continue;
      if (segDist2(x, z, s.ax, s.az, s.bx, s.bz) < (s.w + 5) * (s.w + 5)) return 0;
    }
  }
  if (x < -10) {
    for (const road of ROADS) {
      if (x < road.x0 || x > road.x1 || z < road.z0 || z > road.z1) continue;
      a *= sstep(road.w + 2.5, road.w + 9, nearest(road, x, z).d);
    }
    const top = Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
    a *= sstep(SUMMIT.r + 8, SUMMIT.r + 34, top);
  }
  // Out past the near woods it comes in stands, with the hillsides' grass between them.
  if (r > 240) a *= sstep(0.36, 0.5, fbm(x * 0.0072 + 20, z * 0.0072 - 8, 3)) * (1 - 0.35 * sstep(240, 420, r));
  // Nothing grows on the roads out to the countries, nor right up to their edges.
  if (r > 250 && a > 0) {
    const rd = routeDist(x, z);
    if (rd.road) a *= sstep(rd.road.w + 2.5, rd.road.w + 8, rd.d);
    if (a <= 0) return 0;
  }
  // And out in the countries, as thick as each one grows them (src/core/lands.js).
  if (r > 1150 && a > 0) a = Math.min(1, a * landTrees(x, z));
  return a;
}

export const FOREST_REACH = 1040;
export const CELL = 10;

// (x, z, height, how wide, cos, sin, tint), a tree to each seven numbers. Out to reach, a square that far either way round (cx, cz).
// The tint is lands.js treeCode: 0 green, 1 rust, 2 snow-dusted, 3 dead.
export const TREE_FLOATS = 7;
export function forestTrees(reach = FOREST_REACH, cx = 0, cz = 0) {
  const i0 = Math.floor((cx - reach) / CELL), i1 = Math.ceil((cx + reach) / CELL);
  const j0 = Math.floor((cz - reach) / CELL), j1 = Math.ceil((cz + reach) / CELL);
  return treesInCells(i0, i1, j0, j1);
}

// The trees in the cells [i0, i1) x [j0, j1): the same trees whichever square they're asked for in.
export function treesInCells(i0, i1, j0, j1) {
  const out = [];
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const pick = hash2(i * 3 + 1, j * 5 + 2);
      const x = (i + 0.5 + (hash2(i + 91, j - 17) - 0.5) * 0.8) * CELL, z = (j + 0.5 + (hash2(i - 37, j + 53) - 0.5) * 0.8) * CELL;
      if (pick > forestAmount(x, z)) continue;
      const h = 21 + 15 * hash2(i - 11, j + 29) ** 1.3, a = hash2(i + 71, j + 11) * 6.2832;
      const code = Math.abs(x) > 1150 || Math.abs(z) > 1150 ? treeCode(x, z) : 0;
      // (Dead wood stands lower and thinner; snow pines lower.)
      const hk = code === 3 ? 0.62 : code === 2 ? 0.8 : 1;
      out.push(x, z, h * hk, (0.86 + 0.32 * hash2(i + 5, j + 131)) * (code === 3 ? 0.7 : 1), Math.cos(a), Math.sin(a), code);
    }
  }
  return new Float32Array(out);
}

// How thick a trunk is where you'd walk into it: the same as src/gfx/pines.js draws it.
export const trunkRadius = (h, width) => 0.018 * h * width;
