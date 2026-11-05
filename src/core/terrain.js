// The land. One deterministic height function shared by every thread: the sim walks on it, the GPU
// draws it. Flat where the village stands, rolling meadow beyond, big hills at the horizon.

function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, oct) {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, y);
    x = x * 2.03 + 11.7; y = y * 2.03 - 4.3; a *= 0.5;
  }
  return s;
}

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// (x, z, half x, half z), and the height they're all brought to, a little under a house's floor. The four round the square need none.
const PLOT_Y = 0.1;
const PLOTS = [[-10, 33, 5.5, 9], [15, 37, 6, 6.5], [38, -35, 8, 6.5], [43, -15, 7.5, 6.5], [-38, -14, 6.5, 7], [-41, 15, 6, 8], [8, -35, 5.5, 7.5], [-30, -36, 6.5, 6.5]];

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
    pts: [[-24, 2], [-70, 2], [-150, 8], [-235, 30], [-320, 58], [-395, 92], [-462, 138], [SUMMIT.x, SUMMIT.z]] },
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

export function terrainHeight(x, z) {
  let level = wild(x, z);
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
  // The cathedral's site, levelled, and on over the stair down behind it, which the land has to cover. Its floor stands a little above this: see tools/interior/build_interior.py.
  const site = Math.max(58 - x, x - 176, Math.abs(z) - 26);
  if (site < 14) level += (2.7 - level) * (1 - sstep(0, 14, site));
  // And the plots of the town's outer houses, under their floors: see tools/village/build_village.py.
  for (const p of PLOTS) {
    const d = Math.max(Math.abs(x - p[0]) - p[2], Math.abs(z - p[1]) - p[3]);
    if (d < 6) level += (PLOT_Y - level) * (1 - sstep(0, 6, d));
  }
  return level;
}

// How far you can go, either way along x and z. An unseen wall stands here. (Only so much of it is worked out for the things that hunt you: NAV_EDGE, in src/sim/world.js.)
export const LAND_EDGE = 600;

// Paths, as (x, z) polylines with half-widths. Door steps to the well and a road out to the south-west.
export const PATHS = [
  { pts: [[-1, -14.5], [-1.2, -8], [-1.5, -2], [-1.5, 1]], w: 2.0 },
  { pts: [[-14.5, 0.5], [-9, 1.2], [-4, 1.0], [-1.5, 1]], w: 1.8 },
  { pts: [[14.2, 3], [9, 2.2], [3, 1.4], [-1.5, 1]], w: 1.8 },
  { pts: [[8.5, 16.8], [6, 11], [2, 5.5], [-1.5, 1]], w: 1.7 },
  { pts: [[-1.5, 1], [-4, 9], [-2, 18], [0, 30], [6, 48], [8, 80], [0, 130], [-20, 190]], w: 2.2 },
  { pts: [[-1.5, 1], [10, -6], [24, -18], [50, -32], [95, -50], [160, -60]], w: 1.8 },
  { pts: [[-6, 36], [2.5, 34]], w: 1.4 }, { pts: [[12, 37], [3.5, 38]], w: 1.4 },
  { pts: [[38.3, -32], [37, -25.4]], w: 1.4 }, { pts: [[44.3, -20], [43, -28.5]], w: 1.4 },
  { pts: [[-36, -14], [-24, -8], [-14.5, 0.5]], w: 1.4 }, { pts: [[-38, 18], [-24, 6], [-14.5, 0.5]], w: 1.4 },
  { pts: [[7.7, -33], [13, -28], [22, -19.5]], w: 1.4 }, { pts: [[-29.7, -30], [-22, -27], [-10, -26], [13, -28]], w: 1.4 },
  // Out to the roads up the hill, from the ways by the west houses, and those as far as the map of the town goes.
  { pts: [[-24, 6], [-34, 26]], w: 1.6 }, { pts: [[-14.5, 0.5], [-24, 2]], w: 1.8 },
  ...ROADS.map((road) => ({ pts: road.line.filter((p) => Math.abs(p[0]) < 150 && Math.abs(p[1]) < 150), w: road.w * 0.9 })),
];

function segDist2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  const ex = ax + dx * t - px, ez = az + dz * t - pz;
  return ex * ex + ez * ez;
}

export function pathAmount(x, z) {
  // Wobble the edge, and bleed into a worn square around the well.
  const wob = (fbm(x * 0.35, z * 0.35, 3) - 0.5) * 1.6;
  let best = 0;
  for (const p of PATHS) {
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      const d = Math.sqrt(segDist2(x, z, ax, az, bx, bz));
      best = Math.max(best, 1 - sstep(p.w * 0.45, p.w * 1.2, d + wob));
    }
  }
  const square = Math.hypot((x + 1.5) * 0.9, z - 1) + wob * 1.8;
  return Math.max(best, 1 - sstep(4.5, 10.5, square));
}

// Building and prop footprints get bare dirt around them.
export function footprintDirt(x, z, colliders) {
  let m = 0;
  for (const c of colliders) {
    if (c.hx < 1.0 && c.hz < 1.0) continue;
    const s = Math.sin(c.yaw), co = Math.cos(c.yaw);
    const dx = x - c.x, dz = z - c.z;
    const lx = Math.abs(dx * co - dz * s) - c.hx, lz = Math.abs(dx * s + dz * co) - c.hz;
    const d = Math.hypot(Math.max(lx, 0), Math.max(lz, 0)) + Math.min(Math.max(lx, lz), 0);
    if (c.h >= 3) m = Math.max(m, 1 - sstep(0.1, 1.4, d));
    if (d < 0) m = 1;
  }
  return m;
}

export { PLOTS, fbm, hash2, segDist2, sstep };
