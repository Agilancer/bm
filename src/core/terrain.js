// The land. One deterministic height function shared by every thread: the sim walks on it, the GPU
// draws it. Flat where the village stands, rolling meadow beyond, big hills at the horizon.

import { CAVE_MOUTH, CAVE_OUT, LANDINGS, LEDGE, LEDGE_Y, WAY, landingEdge, wayLevel } from './opening.js';
import { fbm, hash2, sstep } from './terrain-noise.js';
import { WORLD_EDGE, landHeight, setLandBase } from './lands.js';
import { CHURCH_GUARD, CHURCH_SITE, churchSite } from './church.js';
import { OLD_CHURCH_GROUND, oldChurchGround } from './town.js';
import { PORTAL, PORTAL_PAD } from './dungeon.js';
import { HUNT_PATHS } from './hunts.js';

export let openingTerrain = false;
export function setOpeningTerrain(enabled) { openingTerrain = !!enabled; }

// (x, z, half x, half z), and the height they're all brought to, a little under a house's floor. The four round the square need none.
const PLOT_Y = 0.1;
const PLOTS = [[-11, 33, 7.5, 11], [16, 37, 8, 8.5], [38, -36, 10, 8.5], [43, -16, 9.5, 8.5], [-39, -14, 8.5, 9], [-42, 15, 8, 10], [8, -36, 7.5, 9.5], [-30, -37, 8.5, 8.5]];

function wild(x, z) {
  const r = Math.hypot(x, z);
  // The village sits on a gently dished, nearly flat green.
  const lawn = (fbm(x * 0.07 + 3, z * 0.07 - 2, 3) - 0.44) * 0.5;
  const out = sstep(36, 95, r);
  const roll = (fbm(x * 0.012 + 7, z * 0.012 + 1, 5) - 0.42) * 26;
  const far = sstep(160, 700, r);
  const ridge = fbm(x * 0.0026 - 5, z * 0.0026 + 9, 6);
  const hills = Math.pow(ridge, 1.6) * 330;
  return lawn * (1 - out) + (roll + Math.max(0, r - 60) * 0.018) * out + hills * far;
}

// Round through its points, a sample every few metres.
function curve(pts, step) {
  const out = [];
  const at = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    const n = Math.max(1, Math.round(Math.hypot(c[0] - b[0], c[1] - b[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (u) => 0.5 * (2 * b[u] + (c[u] - a[u]) * t + (2 * a[u] - 5 * b[u] + 4 * c[u] - d[u]) * t2 + (3 * b[u] - a[u] - 3 * c[u] + d[u]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// The hill to the west, and its two ways up: for going up, and for coming down fast on a shield. The Long Road winds and never gets steep.
// The Fall goes nearly straight, steeper and steeper, with a short rise at the foot of each pitch. (The shield clings on over those: for air, Space hops.)
export const SUMMIT = { x: -512, z: 166, y: 146, r: 18 };
export const ROADS = [
  { name: 'the Long Road', w: 3.6, blend: 26,
    pts: [[-34, 26], [-70, 52], [-130, 104], [-200, 170], [-262, 214], [-320, 222], [-372, 262], [-420, 306], [-476, 292], [-452, 248], [-392, 216], [-345, 170], [-392, 146], [-452, 170], [-510, 218], [-560, 212], [-566, 176], [-528, 166], [SUMMIT.x, SUMMIT.z]] },
  { name: 'the Fall', w: 6.5, blend: 24,
    // Each pitch, up from the bottom: its length, and its slope in degrees.
    pitches: [[80, 2], [100, 8], [16, -3], [100, 14], [16, -3.5], [100, 18], [15, -4], [95, 22], [15, -4], [60, 21]],
    pts: [[-26, 2], [-70, 2], [-150, 8], [-235, 30], [-320, 58], [-395, 92], [-462, 138], [SUMMIT.x, SUMMIT.z]] },
];
for (const road of ROADS) {
  road.line = curve(road.pts, 7);
  const n = road.line.length;
  road.s = new Float32Array(n);
  for (let i = 1; i < n; i++) road.s[i] = road.s[i - 1] + Math.hypot(road.line[i][0] - road.line[i - 1][0], road.line[i][1] - road.line[i - 1][1]);
  // (Up to the height of the top by where its flat begins.)
  const L = road.s[n - 1] - SUMMIT.r, y0 = wild(road.line[0][0], road.line[0][1]);
  road.y = new Float32Array(n);
  if (road.pitches) {
    // Stretched to the length it comes to and the height of the top.
    let run = 0, rise = 0;
    const keys = [[0, 0]];
    for (const [len, deg] of road.pitches) { run += len; rise += len * Math.tan(deg * Math.PI / 180); keys.push([run, rise]); }
    for (let i = 0; i < n; i++) {
      const u = Math.min(1, road.s[i] / L) * run;
      let k = 0;
      while (k + 2 < keys.length && keys[k + 1][0] < u) k++;
      const v = keys[k][1] + (keys[k + 1][1] - keys[k][1]) * (u - keys[k][0]) / (keys[k + 1][0] - keys[k][0]);
      road.y[i] = y0 + (SUMMIT.y - y0) * v / rise;
    }
  } else {
    // An even climb, easing at each end.
    for (let i = 0; i < n; i++) { const u = Math.min(1, road.s[i] / L); road.y[i] = y0 + (SUMMIT.y - y0) * (u * 0.82 + 0.18 * sstep(0, 1, u)); }
  }
  const m = road.w + road.blend + 1;
  road.x0 = Math.min(...road.line.map((p) => p[0])) - m; road.x1 = Math.max(...road.line.map((p) => p[0])) + m;
  road.z0 = Math.min(...road.line.map((p) => p[1])) - m; road.z1 = Math.max(...road.line.map((p) => p[1])) + m;
}

// How far this is from the road's middle, and how high the road is there. Both go in NEAR.
const NEAR = { d: 0, y: 0 };
export function nearest(road, x, z) {
  let best = 1e18, y = 0;
  const { line, y: ys } = road;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const ex = a[0] + dx * t - x, ez = a[1] + dz * t - z, q = ex * ex + ez * ez;
    if (q < best) { best = q; y = ys[i] + (ys[i + 1] - ys[i]) * t; }
  }
  NEAR.d = Math.sqrt(best); NEAR.y = y;
  return NEAR;
}

setLandBase(wild);

export function terrainHeight(x, z) {
  let level = landHeight(x, z, wild(x, z));
  // The hill's top levelled, and its roads cut and banked into it, on over that.
  if (x < -20) {
    const top = Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
    if (top < SUMMIT.r + 26) level += (SUMMIT.y - level) * (1 - sstep(SUMMIT.r, SUMMIT.r + 26, top));
    for (const road of ROADS) {
      if (x < road.x0 || x > road.x1 || z < road.z0 || z > road.z1) continue;
      nearest(road, x, z);
      if (NEAR.d < road.w + road.blend) level += (NEAR.y - level) * (1 - sstep(road.w, road.w + road.blend, NEAR.d));
    }
  }
  // Where the cathedral stood, levelled as it was, for the town to grow onto (src/core/town.js). And where it stands now, out east
  // (src/core/church.js): its ground levelled a little under its floor, out past its walls and over the head of the stair, and let back
  // to the land's own lie slowly, so it sits on a broad terrace over the hollow west of it with its back cut into the foot of the hills.
  // Past the wing over the stair the land rises over the rest of the stair, which it has to cover. See tools/interior/build_interior.py.
  const old = oldChurchGround(x, z);
  if (old < OLD_CHURCH_GROUND.blend) level += (OLD_CHURCH_GROUND.y - level) * (1 - sstep(0, OLD_CHURCH_GROUND.blend, old));
  const site = churchSite(x, z);
  if (site < CHURCH_SITE.blend) level += (CHURCH_SITE.y - level) * (1 - sstep(0, CHURCH_SITE.blend, site));
  // And the plots of the town's outer houses, under their floors: see tools/village/build_village.py.
  for (const p of PLOTS) {
    const d = Math.max(Math.abs(x - p[0]) - p[2], Math.abs(z - p[1]) - p[3]);
    if (d < 6) level += (PLOT_Y - level) * (1 - sstep(0, 6, d));
  }
  // The Warrens' portal, dug into its hillside.
  level = portalCut(x, z, level);
  // Lisandra's ledge, a shelf of level ground in front of her cave's mouth on the Long Road. (The cave itself is a mesh of
  // its own under the hill: src/gfx/opening.js. The hillside is left open where it runs in, by the terrain's builder.)
  if (!openingTerrain) return level;
  // And her way down from it: the shelf, the flights of steps and the path, cut and banked into the hill.
  level = wayLevel(x, z, level);
  const lx = x - LEDGE[0], lz = z - LEDGE[1];
  if (lx * lx + lz * lz > 196) return level;
  const inward = (x - CAVE_MOUTH[0]) * -CAVE_OUT[0] + (z - CAVE_MOUTH[1]) * -CAVE_OUT[1];
  const shelf = (1 - sstep(4.2, 10, Math.hypot(lx, lz))) * (1 - sstep(-0.4, 2.6, inward));
  return level + (LEDGE_Y - level) * shelf;
}

// The hill cut back for the Warrens' portal's terrace (src/core/sites.js portalWall): down to a little under its floor over the
// whole of it and a little round, and from there a bank going up at 40 degrees to meet the hill. Never raised: where the land's
// lower than the floor, at the front, the terrace stands on its own walls. The floor is the hill's own height PORTAL_PAD.level
// in front of the wall, worked out once (the terrain's own height, without the cut).
let CUT = null;
const BANK = Math.tan(40 * Math.PI / 180);
export function portalFloor() {
  if (!CUT) {
    CUT = 'busy';
    const { hu, hw, at, level } = PORTAL_PAD, c = Math.cos(PORTAL.yaw), s = Math.sin(PORTAL.yaw);
    const ox = PORTAL.x - at * s, oz = PORTAL.z - at * c, w = at + level;
    const y = terrainHeight(ox + w * s, oz + w * c);
    CUT = { ox, oz, c, s, hu, hw, y };
  }
  return CUT === 'busy' ? null : CUT.y;
}
function portalCut(x, z, level) {
  const dx = x - PORTAL.x, dz = z - PORTAL.z;
  if (dx * dx + dz * dz > 50 * 50 || portalFloor() === null) return level;
  const { ox, oz, c, s, hu, hw, y } = CUT, px = x - ox, pz = z - oz;
  const u = px * c - pz * s, w = px * s + pz * c;
  const d = Math.max(0, Math.abs(u) - hu - 0.8, Math.abs(w) - hw - 0.8);
  return Math.min(level, y - 0.15 + d * BANK);
}

// How far you can go, either way along x and z. An unseen wall stands here. (Only so much of it is worked out for the things that hunt you: NAV_EDGE, in src/sim/world.js.)
export const LAND_EDGE = WORLD_EDGE;

// Paths, as (x, z) polylines with half-widths. Door steps to the well and a road out to the south-west.
// (The worn way off Lisandra's ledge: the shelf, the steps and the path down onto the road. src/core/opening.js WAY.)
export const CAVE_PATH = { pts: [LEDGE, ...WAY.map((p) => [p[0], p[1]])], w: 1.5 };
export const PATHS = [
  CAVE_PATH,
  { pts: [[-1, -14.5], [-1.2, -8], [-1.5, -2], [-1.5, 1]], w: 2.0 },
  { pts: [[-14.5, 0.5], [-9, 1.2], [-4, 1.0], [-1.5, 1]], w: 1.8 },
  { pts: [[14.2, 3], [9, 2.2], [3, 1.4], [-1.5, 1]], w: 1.8 },
  { pts: [[10.75, 16.8], [6, 11], [2, 5.5], [-1.5, 1]], w: 1.7 },
  { pts: [[-1.5, 1], [-4, 9], [-2, 18], [0, 30], [6, 48], [8, 80], [0, 130], [-20, 190]], w: 2.2 },
  { pts: [[-1.5, 1], [10, -6], [24, -18], [50, -32], [95, -50], [160, -60]], w: 1.8 },
  // The church road: off the north-east track, round the east house's yard, and out over the church's old ground to the foot of its steps.
  { pts: [[24, -18], [28.5, -20.4], [31.8, -15.5], [33.2, -10.8], [35.6, -5.6], [41, -1.6], [60, 0], [95, 0.6], [CHURCH_GUARD[0] - 26, CHURCH_GUARD[1] - 0.4], [CHURCH_GUARD[0] + 1, CHURCH_GUARD[1]]], w: 1.8 },
  // The east end's doors: the manor's through its forecourt, the bakehouse's and the herbalist's across the road.
  { pts: [[80, -7.1], [80, -0.2]], w: 1.4 }, { pts: [[62.75, 5.8], [62.6, 1.0]], w: 1.3 }, { pts: [[85.25, 6.3], [85.0, 1.2]], w: 1.2 },
  // The sexton's way: off the church road before the knight's ground, wide round the church's south side, to the little door in the
  // wing over the stair (the Sexton's Door, tools/interior/build_interior.py). It keeps well out of the knight's reach.
  { pts: [[112, 0.3], [126, 24], [150, 34], [190, 34], [212, 22], [216.9, 10.2]], w: 1.2 },
  { pts: [[-6, 36], [2.5, 34]], w: 1.4 }, { pts: [[12, 37], [3.5, 38]], w: 1.4 },
  // The smith's yard: in off the south road, and worn bare from the grindstone to the fire (src/folk/smithy.js STATIONS).
  { pts: [[-0.6, 27], [-4.2, 28.05], [-5.4, 28.22], [-7.6, 28.45], [-9.2, 28.45]], w: 2.4 },
  { pts: [[38, -31.6], [37, -25.4]], w: 1.4 }, { pts: [[44.3, -20], [43, -28.5]], w: 1.4 },
  { pts: [[-37, -14.4], [-33, -14], [-26, -8], [-14, -7], [-13, 0.5]], w: 1.4 }, { pts: [[-38.5, 18.4], [-36, 17.8], [-26, 9.5], [-12, 9.5], [-12, 0.5]], w: 1.4 },
  { pts: [[8, -32.6], [13, -28], [22, -19.5]], w: 1.4 }, { pts: [[-30, -29.6], [-22, -27], [-10, -26], [13, -28]], w: 1.4 },
  // Out to the roads up the hill, from the ways by the west houses, and those as far as the map of the town goes.
  { pts: [[-26, 9.5], [-34, 26]], w: 1.6 }, { pts: [[-26, -8], [-26, 2], [-26, 9.5]], w: 1.6 },
  ...ROADS.map((road) => ({ pts: road.line.filter((p) => Math.abs(p[0]) < 150 && Math.abs(p[1]) < 150), w: road.w * 0.9 })),
  // Out through the woods to where their monsters keep (src/core/hunts.js).
  ...HUNT_PATHS,
];

function segDist2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  const ex = ax + dx * t - px, ez = az + dz * t - pz;
  return ex * ex + ez * ez;
}

// Every stretch of the paths, laid flat for the functions that go over them a million times as the land is drawn (pathAmount
// here, forestAmount in src/core/forest.js), each with the box past which it's too far off to matter (reach(w) metres from
// it). The sums are the same ones as before, in the same order: only the stretches that would have come to nothing are
// passed by, so the land comes out exactly as it did.
export function pathStretches(paths, reach) {
  const out = [];
  for (const p of paths) {
    const m = reach(p.w);
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      out.push({ ax, az, bx, bz, w: p.w, lo: p.w * 0.45, hi: p.w * 1.2, cave: p === CAVE_PATH,
        x0: Math.min(ax, bx) - m, x1: Math.max(ax, bx) + m, z0: Math.min(az, bz) - m, z1: Math.max(az, bz) + m });
    }
  }
  return out;
}
// (A path wears the ground out to 1.2 of its width, and the wobble is never under -0.8: past that and a hair, nothing.)
let worn = null;

export function pathAmount(x, z) {
  // Wobble the edge, and bleed into a worn square around the well.
  const wob = (fbm(x * 0.35, z * 0.35, 3) - 0.5) * 1.6;
  let best = 0;
  if (!worn) worn = pathStretches(PATHS, (w) => w * 1.2 + 0.81);
  for (let i = 0; i < worn.length; i++) {
    const s = worn[i];
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    if (s.cave && !openingTerrain) continue;
    const d = Math.sqrt(segDist2(x, z, s.ax, s.az, s.bx, s.bz));
    best = Math.max(best, 1 - sstep(s.lo, s.hi, d + wob));
  }
  // (Her landings are flagged, and nothing grows up through them: src/core/opening.js LANDINGS.)
  if (openingTerrain && x < -280) for (const L of LANDINGS) best = Math.max(best, 1 - sstep(-0.2, 0.4, landingEdge(L, x, z) + wob * 0.2));
  const square = Math.hypot((x + 1.5) * 0.9, z - 1) + wob * 1.8;
  return Math.max(best, 1 - sstep(4.5, 10.5, square));
}

// Building and prop footprints get bare dirt around them.
// (A long list's boxes are worked out once. Past 1.4 m from a box's edge it adds nothing, so a box that far off is passed by.)
const footprintBoxes = new WeakMap();
const footprintBox = (c) => ({ c, s: Math.sin(c.yaw), co: Math.cos(c.yaw), R: Math.hypot(c.hx, c.hz) + 1.4 });
export function footprintDirt(x, z, colliders) {
  let m = 0;
  if (colliders.length < 16) {
    // (A short list, made fresh by the caller: src/sim/job.worker.js's church footprint.)
    for (const c of colliders) if (!(c.hx < 1.0 && c.hz < 1.0)) m = footprintAdd(m, x - c.x, z - c.z, c, Math.sin(c.yaw), Math.cos(c.yaw));
    return m;
  }
  let boxes = footprintBoxes.get(colliders);
  if (!boxes) footprintBoxes.set(colliders, boxes = colliders.filter((c) => !(c.hx < 1.0 && c.hz < 1.0)).map(footprintBox));
  for (let n = 0; n < boxes.length; n++) {
    const b = boxes[n], c = b.c;
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz >= b.R * b.R) continue;
    m = footprintAdd(m, dx, dz, c, b.s, b.co);
  }
  return m;
}

function footprintAdd(m, dx, dz, c, s, co) {
  const lx = Math.abs(dx * co - dz * s) - c.hx, lz = Math.abs(dx * s + dz * co) - c.hz;
  const d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0);
  if (c.h >= 3) m = Math.max(m, 1 - sstep(0.1, 1.4, d));
  if (d < 0) m = 1;
  return m;
}

export { PLOTS, fbm, hash2, segDist2, sstep };
