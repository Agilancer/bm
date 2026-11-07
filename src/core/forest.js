// The pines round the town: where they stand. Worked out the same on every thread, for the renderer to draw and the sim to bump into.
import { CAVE_PATH, openingTerrain, PATHS, PLOTS, ROADS, SUMMIT, fbm, hash2, nearest, segDist2, sstep } from './terrain.js';

const LONG_PATHS = PATHS.filter((p) => p.pts.length >= 5);

// How thick the forest would stand here, 0 to 1: nothing in the town's clearing, on the church's ground or the roads, or on top of the hill.
export function forestAmount(x, z) {
  const r = Math.hypot(x, z);
  const clearing = 64 + (fbm(x * 0.021 + 3, z * 0.021 + 7, 2) - 0.5) * 22;
  let a = sstep(clearing, clearing + 16, r);
  if (a <= 0) return 0;
  const site = Math.max(58 - x, x - 176, Math.abs(z) - 26);
  a *= sstep(8, 26, site);
  if (a <= 0) return 0;
  for (const p of PLOTS) {
    if (Math.max(Math.abs(x - p[0]) - p[2], Math.abs(z - p[1]) - p[3]) < 8) return 0;
  }
  if (r < 260) {
    for (const p of LONG_PATHS) {
      if (p === CAVE_PATH && !openingTerrain) continue;
      for (let i = 0; i + 1 < p.pts.length; i++) {
        const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
        if (segDist2(x, z, ax, az, bx, bz) < (p.w + 5) * (p.w + 5)) return 0;
      }
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
  return a;
}

export const FOREST_REACH = 1040;
const CELL = 10;

// (x, z, height, how wide, cos, sin), a tree to each six numbers. Out to reach, a square that far either way.
export function forestTrees(reach = FOREST_REACH) {
  const n = Math.floor(reach / CELL);
  const out = [];
  for (let j = -n; j < n; j++) {
    for (let i = -n; i < n; i++) {
      const pick = hash2(i * 3 + 1, j * 5 + 2);
      const x = (i + 0.5 + (hash2(i + 91, j - 17) - 0.5) * 0.8) * CELL, z = (j + 0.5 + (hash2(i - 37, j + 53) - 0.5) * 0.8) * CELL;
      if (pick > forestAmount(x, z)) continue;
      const h = 21 + 15 * hash2(i - 11, j + 29) ** 1.3, a = hash2(i + 71, j + 11) * 6.2832;
      out.push(x, z, h, 0.86 + 0.32 * hash2(i + 5, j + 131), Math.cos(a), Math.sin(a));
    }
  }
  return new Float32Array(out);
}

// How thick a trunk is where you'd walk into it: the same as src/gfx/pines.js draws it.
export const trunkRadius = (h, width) => 0.018 * h * width;
