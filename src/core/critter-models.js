// The gilded critters' bodies (src/core/critters.js), built in code as VELSCOUR's are (its tools/critters3d.html, three.js), in
// metres, part by rigid part: what moves on its own (a leg, a wing, a ring) is a part of its own, posed by a matrix each frame
// (src/gfx/critters.js). Nothing here needs a page: the shapes are lists of numbers, and tests/critters.test.mjs measures them.
//
// Every part's colours are one small palette (MATS): each corner's uv is its material's texel. The palette's metal map holds,
// in red, how much of the colour glows of itself (the ITEM shader's painted glow, src/gfx/materials.js), so a scarab's seam
// and gem and eyes glow on a body of plain polished gold. The moth's wings are the one painted picture (src/gfx/critters.js
// paints it): their uv is the wing's own place in it, WING_BOX.
//
// Each model's frame: x forward, y up, z to its right; the origin on the ground under it (a crawler) or at its heart (a wisp).

const TAU = Math.PI * 2;

// ------------------------------------------------------------------------------------------------ the palette
// c: colour (sRGB). rough, metal. glow: how much of it glows of itself (0..1; the part's own strength is src/gfx/critters.js's).
// (The gold glows hardly at all of itself: it's polished metal, and it shows the sun and the sky as metal does. What glows is
// what VELSCOUR lit: the scarab's seam and gem and eyes, a moth's eyes and stars, a wisp's heart and beads.)
const RAIN = ['#ff60d0', '#60d8ff', '#ffe050', '#80ff90', '#b070ff', '#ff9040'];
export const MATS = {
  gold: { c: '#ffc040', rough: 0.3, metal: 0.85, glow: 0.06 },
  gilt: { c: '#ffcc50', rough: 0.25, metal: 1, glow: 0.12 },
  deep: { c: '#d88a18', rough: 0.34, metal: 0.85, glow: 0.04 },
  bronze: { c: '#6a4416', rough: 0.35, metal: 0.8, glow: 0 },
  leg: { c: '#4a2a0e', rough: 0.4, metal: 0.6, glow: 0 },
  fleck: { c: '#ffe27a', rough: 0.15, metal: 1, glow: 0.12 },
  tq: { c: '#20b8a8', rough: 0.15, metal: 0.3, glow: 0.35 },
  gem: { c: '#40ffe8', rough: 0.1, metal: 0.4, glow: 1 },
  amber: { c: '#ffa020', rough: 0.4, metal: 0, glow: 1 },
  fur: { c: '#c8d4ff', rough: 0.9, metal: 0, glow: 0.06 },
  dusk: { c: '#2a2060', rough: 0.5, metal: 0, glow: 0 },
  frost: { c: '#9ad0ff', rough: 0.4, metal: 0, glow: 1 },
  tip: { c: '#fff0b0', rough: 0.4, metal: 0, glow: 1 },
  heart: { c: '#f4ffc8', rough: 0.4, metal: 0, glow: 1 },
  pheart: { c: '#fff0ff', rough: 0.4, metal: 0, glow: 1 },
  bead: { c: '#fff4c0', rough: 0.3, metal: 0, glow: 1 },
  red: { c: '#e01818', rough: 1, metal: 0, glow: 1 },
  redDark: { c: '#3a0000', rough: 1, metal: 0, glow: 0.2 },
  amberFace: { c: '#ffc030', rough: 1, metal: 0, glow: 1 },
  amberDark: { c: '#4a2600', rough: 1, metal: 0, glow: 0.2 },
  litFace: { c: '#ffe9a0', rough: 1, metal: 0, glow: 1 },
  ...Object.fromEntries(RAIN.map((c, i) => [`rain${i}`, { c, rough: 0.2, metal: 0.4, glow: 1 }])),
};
export const MAT_KEYS = Object.keys(MATS);
export const PALETTE_W = 16, PALETTE_H = 4;
// The last row: the scarab's shell, VELSCOUR's own gradient on it, from the rim (left) up its flanks to its crown (right). A
// corner's uv is somewhere along it, so the colour runs smoothly between (the palette is drawn filtered, with no smaller maps).
export const SHELL_ROW = 3;
const SHELL = [[0, '#6a3c08'], [0.42, '#c07a10'], [0.75, '#f0b838'], [1, '#fff2a0']];
const matUV = (name) => { const i = MAT_KEYS.indexOf(name); if (i < 0) throw new Error(`no material ${name}`); return [((i % PALETTE_W) + 0.5) / PALETTE_W, (Math.floor(i / PALETTE_W) + 0.5) / PALETTE_H]; };
const shellUV = (t) => [(Math.max(0, Math.min(1, t)) * (PALETTE_W - 1) + 0.5) / PALETTE_W, (SHELL_ROW + 0.5) / PALETTE_H];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** The palette's two pictures, as bytes: colour (sRGB) and its metal map (r glow, g roughness, b metal). */
export function paletteBytes() {
  const n = PALETTE_W * PALETTE_H, col = new Uint8Array(n * 4), mr = new Uint8Array(n * 4);
  if (MAT_KEYS.length > SHELL_ROW * PALETTE_W) throw new Error('the palette is full');
  MAT_KEYS.forEach((k, i) => {
    const m = MATS[k];
    col.set([...hex(m.c), 255], i * 4);
    mr.set([Math.round(m.glow * 255), Math.round(m.rough * 255), Math.round(m.metal * 255), 255], i * 4);
  });
  for (let x = 0; x < PALETTE_W; x++) {
    const t = x / (PALETTE_W - 1), j = SHELL.findIndex((s) => s[0] >= t), [t1, c1] = SHELL[Math.max(1, j)], [t0, c0] = SHELL[Math.max(1, j) - 1];
    const k = (t - t0) / (t1 - t0 || 1), a = hex(c0), b = hex(c1), i = SHELL_ROW * PALETTE_W + x;
    col.set([0, 1, 2].map((q) => Math.round(a[q] + (b[q] - a[q]) * k)).concat(255), i * 4);
    // (Its own glow, a little, so it's gold in the shade and at night too; less metal than a mirror, and rougher to its crown.)
    mr.set([18, Math.round((0.28 + 0.1 * t) * 255), 217, 255], i * 4);
  }
  return { col, mr };
}

// ------------------------------------------------------------------------------------------------ matrices (column-major)
export const M = {
  I: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  T: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  S: (x, y = x, z = x) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
  X: (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
  Y: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
  Z: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  mul(...ms) {
    let a = ms[0];
    for (let q = 1; q < ms.length; q++) {
      const b = ms[q], o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
      a = o;
    }
    return a;
  },
  // three.js's Euler 'XYZ'.
  E: (x, y, z) => M.mul(M.X(x), M.Y(y), M.Z(z)),
};
// The upper 3x3's inverse transpose, for normals under a squash.
function normalMat(m) {
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g), G = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
  const det = a * A + b * B + c * C || 1;
  // (inverse = adjugate / det; its transpose has the cofactors in place)
  return [A / det, B / det, C / det, D / det, E / det, F / det, G / det, H / det, I / det];
}

// ------------------------------------------------------------------------------------------------ geometry
export class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.idx = []; }
  get count() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, u = 0, w = 0) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, w); return this.count - 1; }
  /** g, moved by m, painted mat (or keeping its own uv if none). */
  add(g, m = null, mat = null) {
    const base = this.count, uv = mat ? matUV(mat) : null, nm = m ? normalMat(m) : null;
    for (let i = 0; i < g.count; i++) {
      let x = g.p[i * 3], y = g.p[i * 3 + 1], z = g.p[i * 3 + 2], nx = g.n[i * 3], ny = g.n[i * 3 + 1], nz = g.n[i * 3 + 2];
      if (m) {
        const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], Z = m[2] * x + m[6] * y + m[10] * z + m[14];
        x = X; y = Y; z = Z;
        const NX = nm[0] * nx + nm[3] * ny + nm[6] * nz, NY = nm[1] * nx + nm[4] * ny + nm[7] * nz, NZ = nm[2] * nx + nm[5] * ny + nm[8] * nz, l = 1 / (Math.hypot(NX, NY, NZ) || 1);
        nx = NX * l; ny = NY * l; nz = NZ * l;
      }
      this.v(x, y, z, nx, ny, nz, uv ? uv[0] : g.uv[i * 2], uv ? uv[1] : g.uv[i * 2 + 1]);
    }
    for (const k of g.idx) this.idx.push(base + k);
    return this;
  }
  prim() { return { pos: new Float32Array(this.p), nrm: new Float32Array(this.n), uv: new Float32Array(this.uv), idx: new Uint32Array(this.idx) }; }
  bounds() {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.p.length; i++) { lo[i % 3] = Math.min(lo[i % 3], this.p[i]); hi[i % 3] = Math.max(hi[i % 3], this.p[i]); }
    return { lo, hi };
  }
}

/** three.js's SphereGeometry, unit radius. */
export function sphere(ws = 16, hs = 12, phi0 = 0, phiL = TAU, th0 = 0, thL = Math.PI) {
  const g = new Geo(), thEnd = Math.min(th0 + thL, Math.PI);
  for (let iy = 0; iy <= hs; iy++) {
    const th = th0 + (iy / hs) * thL;
    for (let ix = 0; ix <= ws; ix++) {
      const ph = phi0 + (ix / ws) * phiL, x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th);
      g.v(x, y, z, x, y, z);
    }
  }
  for (let iy = 0; iy < hs; iy++) for (let ix = 0; ix < ws; ix++) {
    const a = iy * (ws + 1) + ix + 1, b = iy * (ws + 1) + ix, c = (iy + 1) * (ws + 1) + ix, d = (iy + 1) * (ws + 1) + ix + 1;
    if (iy !== 0 || th0 > 0) g.idx.push(a, b, d);
    if (iy !== hs - 1 || thEnd < Math.PI) g.idx.push(b, c, d);
  }
  return g;
}

/** A flat-faced octahedron, unit radius (squashed by the caller for a bipyramid). */
export function octa() {
  const g = new Geo(), P = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  for (let i = 0; i < 4; i++) for (const up of [1, -1]) {
    const a = P[i], b = P[(i + 1) % 4], t = [0, up, 0];
    const tri = up > 0 ? [t, a, b] : [t, b, a];
    const u = tri[1].map((v, k) => v - tri[0][k]), w = tri[2].map((v, k) => v - tri[0][k]);
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...n); n = n.map((v) => v / l);
    if (n[0] * (a[0] + b[0]) + n[1] * up + n[2] * (a[2] + b[2]) < 0) n = n.map((v) => -v);
    const base = g.count;
    for (const q of tri) g.v(...q, ...n);
    g.idx.push(base, base + 1, base + 2);
  }
  return g;
}

/** A box, w x h x d, about its middle. */
export function box(w, h, d) {
  const g = new Geo(), F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [-1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]]];
  const H = [w / 2, h / 2, d / 2];
  for (const [n, u, v] of F) {
    const base = g.count;
    for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.v(...[0, 1, 2].map((k) => (n[k] + u[k] * s + v[k] * t) * H[k]), ...n);
    g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return g;
}

/** three.js's TorusGeometry: round the z axis, in the xy plane. */
export function torus(R, r, rs = 8, ts = 48) {
  const g = new Geo();
  for (let j = 0; j <= rs; j++) for (let i = 0; i <= ts; i++) {
    const u = (i / ts) * TAU, v = (j / rs) * TAU;
    const x = (R + r * Math.cos(v)) * Math.cos(u), y = (R + r * Math.cos(v)) * Math.sin(u), z = r * Math.sin(v);
    const cx = R * Math.cos(u), cy = R * Math.sin(u), l = Math.hypot(x - cx, y - cy, z) || 1;
    g.v(x, y, z, (x - cx) / l, (y - cy) / l, z / l);
  }
  for (let j = 1; j <= rs; j++) for (let i = 1; i <= ts; i++) {
    const a = (ts + 1) * j + i - 1, b = (ts + 1) * (j - 1) + i - 1, c = (ts + 1) * (j - 1) + i, d = (ts + 1) * j + i;
    g.idx.push(a, b, d, b, c, d);
  }
  return g;
}

/** An open cylinder up y, bottom radius r0 at -h/2, top r1 at +h/2. */
export function cylinder(r0, r1, h, seg = 8) {
  const g = new Geo(), slope = (r0 - r1) / h;
  for (let j = 0; j <= 1; j++) for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU, r = j ? r1 : r0, c = Math.cos(a), s = Math.sin(a), l = Math.hypot(1, slope);
    g.v(r * s, (j - 0.5) * h, r * c, s / l, slope / l, c / l);
  }
  for (let i = 0; i < seg; i++) { const a = i, b = i + 1, c = seg + 1 + i, d = seg + 2 + i; g.idx.push(a, b, d, a, d, c); }
  return g;
}

// A frame whose y is d (any x and z round it).
function along(a, d) {
  const L = Math.hypot(...d) || 1, y = d.map((v) => v / L);
  const o = Math.abs(y[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  let x = [o[1] * y[2] - o[2] * y[1], o[2] * y[0] - o[0] * y[2], o[0] * y[1] - o[1] * y[0]];
  const lx = Math.hypot(...x); x = x.map((v) => v / lx);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [...x, 0, ...y, 0, ...z, 0, ...a, 1];
}
/** A rod from a to b, radius r0 at a and r1 at b. */
export function rod(a, b, r0, r1, seg = 8) {
  const d = b.map((v, k) => v - a[k]), mid = a.map((v, k) => (v + b[k]) / 2);
  return new Geo().add(cylinder(r0, r1, Math.hypot(...d), seg), along(mid, d));
}
export const ball = (p, r, ws = 10, hs = 8) => new Geo().add(sphere(ws, hs), M.mul(M.T(...p), M.S(r)));

/** A tube through pts (Catmull-Rom), its radius r(t) along it. */
export function tube(pts, r, tubular = 20, radial = 8) {
  const at = (t) => {
    const n = pts.length - 1, f = Math.min(n - 1e-9, Math.max(0, t * n)), i = Math.floor(f), u = f - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
  };
  const g = new Geo(), P = [], Tn = [];
  for (let i = 0; i <= tubular; i++) P.push(at(i / tubular));
  for (let i = 0; i <= tubular; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(tubular, i + 1)], d = b.map((v, k) => v - a[k]), l = Math.hypot(...d) || 1; Tn.push(d.map((v) => v / l)); }
  // (Frames carried along without twist.)
  let N = Math.abs(Tn[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  for (let i = 0; i <= tubular; i++) {
    const t = Tn[i], dn = N[0] * t[0] + N[1] * t[1] + N[2] * t[2];
    N = N.map((v, k) => v - t[k] * dn); const ln = Math.hypot(...N); N = N.map((v) => v / ln);
    const B = [t[1] * N[2] - t[2] * N[1], t[2] * N[0] - t[0] * N[2], t[0] * N[1] - t[1] * N[0]], R = r(i / tubular);
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * TAU, c = Math.cos(v), s = Math.sin(v), n = [0, 1, 2].map((k) => c * N[k] + s * B[k]);
      g.v(...P[i].map((p, k) => p + n[k] * R), ...n);
    }
  }
  for (let i = 1; i <= tubular; i++) for (let j = 1; j <= radial; j++) {
    const a = (radial + 1) * (i - 1) + j - 1, b = (radial + 1) * i + j - 1, c = (radial + 1) * i + j, d = (radial + 1) * (i - 1) + j;
    g.idx.push(a, b, d, b, c, d);
  }
  return g;
}

// ------------------------------------------------------------------------------------------------ the golden scarab
// A polished gold shell with a turquoise seam and inlays, a horned head, a glowing gem, and six legs in a tripod gait.
// (VELSCOUR's units, then SCARAB metres to the unit: about 42 cm from tail to horn.)
export const SCARAB = 0.016;
const SY = 3.5;    // the shell's rim over the ground (lower than VELSCOUR's: it hunkers in the grass)
// [hip x, reach]: front, middle, hind.
export const SCARAB_LEGS = [[5, 4.5], [0.5, 3.5], [-4.5, -4]];
export function scarabBody() {
  const g = new Geo(), Y = SY;
  // The wing cases: VELSCOUR's gold running from a dark rim up to a pale crown (SHELL_ROW), a few raised flecks over it.
  const cases = sphere(40, 20, 0, TAU, 0, Math.PI / 2);
  for (let i = 0; i < cases.count; i++) { const uv = shellUV(cases.p[i * 3 + 1] ** 0.85); cases.uv[i * 2] = uv[0]; cases.uv[i * 2 + 1] = uv[1]; }
  g.add(cases, M.mul(M.T(-2, Y, 0), M.S(8.5, 5.2, 6.6)));
  const shellAt = (x, zz) => Y + 5.2 * Math.sqrt(Math.max(0, 1 - ((x + 2) / 8.5) ** 2 - (zz / 6.6) ** 2));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const flecks = [];
  for (let n = 0; n < 40 && flecks.length < 24; n++) {
    const x = -9 + rnd() * 13, zz = (rnd() * 2 - 1) * 5.4;
    if (((x + 2) / 8.5) ** 2 + (zz / 6.6) ** 2 > 0.82 || Math.abs(zz) < 0.9) continue;
    // (Spread out, not in clumps.)
    if (flecks.some(([a, b]) => Math.hypot(a - x, b - zz) < 1.2)) continue;
    flecks.push([x, zz]);
    g.add(ball([x, shellAt(x, zz) - 0.1, zz], 0.44 + rnd() * 0.32, 6, 4), null, 'fleck');
  }
  g.add(sphere(24, 10, 0, TAU, Math.PI / 2, Math.PI / 2), M.mul(M.T(-2, Y, 0), M.S(8.2, 1.6, 6.2)), 'bronze');   // the belly
  // The seam: down the middle of the shell, on its curve, ending inside its rim; a dark groove where the cases part, and the
  // turquoise in it.
  const seam = [];
  for (let i = 0; i <= 24; i++) { const x = -10 + (i / 24) * 15.5; seam.push([x, shellAt(x, 0) + 0.1, 0]); }
  g.add(tube(seam.map(([x, y, zz]) => [x, y - 0.14, zz]), () => 0.38, 40, 6), null, 'bronze');
  g.add(tube(seam, () => 0.3, 40, 6), null, 'tq');
  for (const z of [-1, 1]) {   // an inlaid arc on each case, lying on its curve, in a rim of deeper gold
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const a = -0.9 + (i / 20) * 1.9, x = -2 + Math.cos(a) * 6, zz = z * (1.2 + Math.abs(Math.sin(a)) * 3.2);
      pts.push([x, shellAt(x, zz) + 0.15, zz]);
    }
    g.add(tube(pts.map(([x, y, zz]) => [x, y - 0.22, zz]), () => 0.85, 30, 6), null, 'deep');
    g.add(tube(pts, () => 0.6, 30, 6), null, 'tq');
  }
  g.add(sphere(32, 16, 0, TAU, 0, Math.PI / 2), M.mul(M.T(6.6, Y - 0.2, 0), M.S(3.8, 4, 5.2)), 'deep');   // the shield behind the head
  g.add(octa(), M.mul(M.T(7, Y + 4, 0), M.S(1.5)), 'gem');                                              // the gem
  g.add(sphere(24, 14), M.mul(M.T(10.4, Y - 0.6, 0), M.S(2.4, 2, 3)), 'deep');                           // the head
  const hp = []; for (let i = 0; i <= 10; i++) { const u = i / 10; hp.push([11.5 + u * 4, Y + 0.4 + u * u * 6, 0]); }
  g.add(tube(hp, (t) => 1 - t * 0.85, 20, 10), null, 'gold');                                          // the horn, curving up
  for (const z of [-1, 1]) {
    g.add(ball([11.4, Y, z * 2.3], 0.75, 12, 8), null, 'amber');                                         // eyes
    g.add(rod([12, Y - 0.6, z * 1.6], [15, Y + 0.6, z * 3.4], 0.18, 0.12, 6), null, 'bronze');          // feelers, with clubs
    g.add(ball([15, Y + 0.6, z * 3.4], 0.6, 10, 8), null, 'deep');
  }
  return new Geo().add(g, M.S(SCARAB));
}
/** One leg (the right's: z > 0), from its hip. The left's is it mirrored. */
// (A beetle's stance: low and wide, the knee hardly over the hip and well out past the shell's edge, the shin down to a foot
// out wider still, with two spines along it.)
export function scarabLeg(i) {
  const [, reach] = SCARAB_LEGS[i], g = new Geo();
  const knee = [reach * 0.45, 0.6, 6.5], foot = [reach * 0.95, -(SY - 0.6), 10];
  g.add(rod([0, 0, 0], knee, 0.85, 0.7, 8), null, 'leg');
  g.add(ball(knee, 0.75, 10, 8), null, 'deep');
  g.add(rod(knee, foot, 0.8, 0.32, 8), null, 'leg');
  for (const u of [0.35, 0.65]) {
    const p = knee.map((v, k) => v + (foot[k] - v) * u);
    g.add(rod(p, [p[0] - 0.9, p[1] + 0.25, p[2] + 0.55], 0.22, 0.04, 5), null, 'leg');
  }
  for (const t of [-1, 1]) g.add(rod(foot, [foot[0] + t * 0.8, foot[1], foot[2] + 0.7], 0.18, 0.08, 5), null, 'leg');
  return new Geo().add(g, M.S(SCARAB));
}
export const scarabHip = (i, side) => [SCARAB_LEGS[i][0] * SCARAB, (SY - 0.6) * SCARAB, side * 4.6 * SCARAB];

// ------------------------------------------------------------------------------------------------ the starmoth
// A fuzzy body, feathered feelers and four painted wings (indigo, silver edges, a gold eye spot and stars that glow). In
// VELSCOUR it flies; here it crawls about on six thin legs with its wings spread, fanning them, and flutters off a few steps.
export const MOTH = 0.01;
export const MOTH_UP = 3.6;     // its body's middle over the ground, crawling (units)
// The wings' outlines, as VELSCOUR has them: a start, then cubic Beziers; the box their picture covers.
export const WING_SHAPES = {
  fore: [[1.5, 0], [4, 7, 8, 16, 6, 23], [3, 26, -6, 25, -8, 21], [-9, 14, -6, 6, -4, 2], [-2, 0, 0, -0.5, 1.5, 0]],
  hind: [[-1, 0], [-3, 6, -6, 13, -10, 15], [-15, 16, -18, 12, -16, 7], [-14, 3, -8, 0.5, -4, -0.2], [-3, -0.5, -2, -0.4, -1, 0]],
};
export const WING_BOX = { x0: -19, x1: 9, y0: -1, y1: 27 };
export const WING_PIVOT = { fore: [1.6, 0.8, 1.6], hind: [-0.6, 0.8, 1.6] };
/** A wing's outline, as points. */
export function wingOutline(pts, per = 14) {
  const out = [];
  let p = pts[0];
  for (const c of pts.slice(1)) {
    for (let i = 0; i < per; i++) {
      const t = i / per, u = 1 - t;
      out.push([u * u * u * p[0] + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t * t * t * c[4], u * u * u * p[1] + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5]]);
    }
    p = [c[4], c[5]];
  }
  return out;
}
/** A wing: a fan from its middle out to its edge in rings, cupped a little so it catches the light, lying in the xz plane
 *  (its span along +z) as VELSCOUR turns it. uv: its place in the wing's picture. */
export function wing(kind) {
  const ring = wingOutline(WING_SHAPES[kind]), n = ring.length, RINGS = 4;
  let cx = 0, cy = 0;
  for (const [x, y] of ring) { cx += x; cy += y; }
  cx /= n; cy /= n;
  const g = new Geo(), B = WING_BOX;
  const put = (x, y) => g.v(x, -0.005 * y * y, y, 0, 1, 0, (x - B.x0) / (B.x1 - B.x0), (y - B.y0) / (B.y1 - B.y0));
  put(cx, cy);
  for (let k = 1; k <= RINGS; k++) for (const [x, y] of ring) put(cx + (x - cx) * (k / RINGS), cy + (y - cy) * (k / RINGS));
  for (let i = 0; i < n; i++) g.idx.push(0, 1 + i, 1 + ((i + 1) % n));
  for (let k = 1; k < RINGS; k++) for (let i = 0; i < n; i++) {
    const a = 1 + (k - 1) * n + i, b = 1 + (k - 1) * n + ((i + 1) % n), c = 1 + k * n + i, d = 1 + k * n + ((i + 1) % n);
    g.idx.push(a, c, b, b, c, d);
  }
  // (Normals from the cup.)
  const N = new Float64Array(g.count * 3);
  for (let t = 0; t < g.idx.length; t += 3) {
    const [a, b, c] = [g.idx[t], g.idx[t + 1], g.idx[t + 2]], P = (i) => [g.p[i * 3], g.p[i * 3 + 1], g.p[i * 3 + 2]];
    const A = P(a), u = P(b).map((v, k) => v - A[k]), w = P(c).map((v, k) => v - A[k]);
    let nr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    if (nr[1] < 0) nr = nr.map((v) => -v);
    for (const i of [a, b, c]) for (let k = 0; k < 3; k++) N[i * 3 + k] += nr[k];
  }
  for (let i = 0; i < g.count; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; for (let k = 0; k < 3; k++) g.n[i * 3 + k] = N[i * 3 + k] / l; }
  return new Geo().add(g, M.S(MOTH));
}
export function mothBody() {
  const g = new Geo();
  g.add(sphere(20, 14), M.mul(M.T(1, 0, 0), M.S(3.2)), 'fur');                    // the thorax
  for (let i = 0; i < 6; i++) g.add(sphere(16, 12), M.mul(M.T(-2.2 - i * 1.7, -0.3 - i * 0.25, 0), M.S((2.6 - i * 0.3) * 0.9, (2.6 - i * 0.3) * 0.95, 2.6 - i * 0.3)), i % 2 ? 'dusk' : 'fur');
  g.add(sphere(16, 12), M.mul(M.T(4, 0.4, 0), M.S(2)), 'dusk');                   // the head
  for (const z of [-1, 1]) {
    g.add(ball([5.2, 0.9, z * 1.2], 1.05, 14, 10), null, 'frost');                // big glowing eyes
    const o = [5, 1.8, z * 0.8], tipA = [6, 6, z * 4], at = (u) => [o[0] + tipA[0] * u, o[1] + tipA[1] * u, o[2] + tipA[2] * u];
    g.add(rod(o, at(1), 0.25, 0.15, 6), null, 'dusk');
    for (let i = 1; i <= 6; i++) { const u = i / 7, p = at(u); g.add(rod(p, [p[0] - 1.2, p[1] + 0.4, p[2] + z * 1.4 * (1 - u * 0.5)], 0.12, 0.05, 4), null, 'fur'); }
    g.add(ball(at(1), 0.6, 8, 6), null, 'tip');
  }
  return new Geo().add(g, M.S(MOTH));
}
// Its legs (the right's), from the thorax's underside to the ground: [hip x, foot x].
export const MOTH_LEGS = [[2.4, 6], [1, 1.5], [-0.4, -3.5]];
export function mothLeg(i) {
  const [hx, fx] = MOTH_LEGS[i], g = new Geo();
  const knee = [(hx + fx) / 2 - hx, 1.6, 3.2], foot = [fx - hx, -MOTH_UP + 1.4, 5];
  g.add(rod([0, 0, 0], knee, 0.32, 0.26, 6), null, 'dusk');
  g.add(rod(knee, foot, 0.24, 0.12, 6), null, 'dusk');
  return new Geo().add(g, M.S(MOTH));
}
export const mothHip = (i, side) => [MOTH_LEGS[i][0] * MOTH, -1.4 * MOTH, side * 1.2 * MOTH];

// ------------------------------------------------------------------------------------------------ the wisps
// A glowing heart in a see-through crystal that turns (src/gfx/critterglass.js: it's light, not a body), gold rings with
// beads going round it, motes circling, and a flame of nine glowing beads for a tail (the motes and the flame are light too:
// src/gfx/critters.js). The prismatic one's crystal is a tall bipyramid with every facet a colour of its own, and its three
// rings are coloured too.
export const WISP = 0.016;
export const WISP_RAIN = RAIN;
export const wispCore = () => new Geo().add(sphere(18, 14), M.S(3.6 * WISP), 'heart');
export const prismCore = () => new Geo().add(sphere(18, 14), M.S(3.6 * WISP), 'pheart');
/** VELSCOUR's tail: nine beads under its heart, i from 0, as [x, y, z, radius] in metres in the wisp's frame (ph: its sway). */
export function tailBead(i, ph) {
  const sw = Math.sin(ph + i * 0.7) * i * 0.55;
  return [(-i * 0.8 + sw) * WISP, (-5 - i * 2.4) * WISP, sw * 0.6 * WISP, 3.6 * (1 - i / 10) * WISP];
}
export const TAIL_FROM = '#ffa018', TAIL_TO = '#ff4a00';
export const WISP_RINGS = { wisp: [[1.25, 0.25], [0.35, -1.0]], prism: [[1.2, 0.3], [0.4, 1.1], [1.6, -0.9]] };
/** Ring i, in its own plane (round its z axis), beads every third of a turn. */
export function wispRing(prism, i) {
  const R = 11 + i * 1.6, g = new Geo();
  g.add(torus(R, 0.32, 8, 64), null, prism ? `rain${(i * 2) % 6}` : 'gilt');
  for (let b = 0; b < 3; b++) { const a = (b * TAU) / 3; g.add(ball([Math.cos(a) * R, Math.sin(a) * R, 0], 1.3, 10, 8), null, prism ? `rain${(i * 2 + b + 1) % 6}` : 'bead'); }
  return new Geo().add(g, M.S(WISP));
}

// ------------------------------------------------------------------------------------------------ the arrow
// VELSCOUR's red arrow, bobbing over a ripe one, pointing down at it: a flat arrow with depth, its point at the origin, 1 m
// tall (src/gfx/critters.js sizes it and turns it to face you), a thick dark rim round its face. face, rim: its materials (a
// gold one for a prismatic wisp's).
export function arrow(face = 'red', rim = 'redDark') {
  const outline = [[0, 0], [-0.47, 0.53], [-0.2, 0.53], [-0.2, 1], [0.2, 1], [0.2, 0.53], [0.47, 0.53]];
  // (The face, inset from the outline by the rim's width: each corner moved in along the two edges' inward normals.)
  const W = 0.075, n = outline.length, inner = outline.map((p, i) => {
    const a = outline[(i + n - 1) % n], b = outline[(i + 1) % n];
    const e0 = [p[0] - a[0], p[1] - a[1]], e1 = [b[0] - p[0], b[1] - p[1]], l0 = Math.hypot(...e0), l1 = Math.hypot(...e1);
    // (The outline goes round clockwise as seen from +z: the inside is to each edge's right.)
    const n0 = [e0[1] / l0, -e0[0] / l0], n1 = [e1[1] / l1, -e1[0] / l1], m = [n0[0] + n1[0], n0[1] + n1[1]], ml = Math.hypot(...m) || 1;
    const c = (m[0] / ml) * n0[0] + (m[1] / ml) * n0[1];
    return [p[0] + (m[0] / ml) * (W / c), p[1] + (m[1] / ml) * (W / c)];
  });
  const g = new Geo(), D = 0.09;
  const fan = (pts, z, nz, mat) => {
    const b = g.count;
    for (const [x, y] of pts) g.v(x, y, z, 0, 0, nz, ...matUV(mat));
    // (The head and the shaft, each a fan.)
    if (nz > 0) g.idx.push(b, b + 6, b + 1, b + 2, b + 4, b + 3, b + 2, b + 5, b + 4);
    else g.idx.push(b, b + 1, b + 6, b + 2, b + 3, b + 4, b + 2, b + 4, b + 5);
  };
  for (const [z, nz] of [[D, 1], [-D, -1]]) {
    fan(outline, z, nz, rim);
    fan(inner, z + nz * 0.004, nz, face);
  }
  for (let i = 0; i < n; i++) {   // its sides, dark
    const [x0, y0] = outline[i], [x1, y1] = outline[(i + 1) % n], dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, b = g.count;
    for (const [x, y, z] of [[x0, y0, D], [x1, y1, D], [x1, y1, -D], [x0, y0, -D]]) g.v(x, y, z, nx, ny, 0, ...matUV(rim));
    g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return g;
}
