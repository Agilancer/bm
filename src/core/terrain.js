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

export function terrainHeight(x, z) {
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

// Paths, as (x, z) polylines with half-widths. Door steps to the well and a road out to the south-west.
export const PATHS = [
  { pts: [[-1, -14.5], [-1.2, -8], [-1.5, -2], [-1.5, 1]], w: 2.0 },
  { pts: [[-14.5, 0.5], [-9, 1.2], [-4, 1.0], [-1.5, 1]], w: 1.8 },
  { pts: [[14.2, 3], [9, 2.2], [3, 1.4], [-1.5, 1]], w: 1.8 },
  { pts: [[8.5, 16.8], [6, 11], [2, 5.5], [-1.5, 1]], w: 1.7 },
  { pts: [[-1.5, 1], [-4, 9], [-2, 18], [0, 30], [6, 48], [8, 80], [0, 130], [-20, 190]], w: 2.2 },
  { pts: [[-1.5, 1], [10, -6], [24, -18], [50, -32], [95, -50], [160, -60]], w: 1.8 },
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

export { fbm };
