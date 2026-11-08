// What's set out on the market stalls round the well (STALLS in tools/village/build_village.py, `stall` in src/folk/town.js PLACES),
// and the tarp roped over each counter when it's packed up for the night. The keeper sets them out and takes them in
// (src/folk/brain.js, stall); the renderer shows one or the other (Renderer.stallOpen).
//
// Each is a mesh in its stall's own frame: the counter's top at y 0.96, x -1.7..1.7, z -0.95..-0.33 (a board 0.6 deep across the
// customers' side), the keeper's side to +z. One small palette texture colours the lot: a vertex's u picks its colour (PALETTE),
// and its roughness and metal (MR); its v runs from that colour (0) to its SHADE (1), so a loaf's crust can bake darker on top.

export const PALETTE = [
  [139, 104, 62],   // 0 wicker
  [172, 136, 92],   // 1 crust: pale gold where the oven didn't reach (its shade, the baked top, below in SHADE)
  [226, 206, 168],  // 2 crumb, flour, froth
  [178, 166, 140],  // 3 linen
  [112, 76, 44],    // 4 cask oak
  [72, 68, 64],     // 5 iron
  [150, 148, 140],  // 6 pewter
  [150, 84, 52],    // 7 red clay
  [138, 46, 36],    // 8 madder
  [204, 188, 152],  // 9 undyed wool
  [86, 100, 56],    // 10 moss green
  [64, 96, 78],     // 11 green glaze
  [78, 50, 30],     // 12 dark wood
  [150, 126, 86],   // 13 rope
  [146, 134, 106],  // 14 tarp, weathered
  [176, 140, 70],   // 15 brass
  [64, 36, 18],     // 16 a score cut, opened dark in the bake
];
// The far end of each colour's run: crust baked dark, the rest a little deeper.
export const SHADE = PALETTE.map((c, i) => (i === 1 ? [96, 58, 30] : i === 2 ? [212, 186, 144] : c.map((v) => Math.round(v * 0.78))));
// [ao, roughness, metal] for each.
export const MR = PALETTE.map((_, i) => (i === 5 ? [255, 150, 190] : i === 6 ? [255, 120, 200] : i === 15 ? [255, 110, 220] : i === 11 ? [255, 70, 0] : [255, 225, 0]));

// The gems on the curios stall: [x, z, colour], on its tray. (Drawn as the game's own gems, glowing faintly.)
export const CURIO_GEMS = [[0.85, -0.76, '#c0283a'], [1.01, -0.66, '#7a3fc8'], [1.15, -0.78, '#2f9a5a']];
// Where the tray they're on stands, its top's height.
export const CURIO_TRAY_Y = 0.995;

function mesh() {
  const pos = [], nrm = [], uv = [];
  let seed = 19;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const col = (c, sh = 0) => [(c + 0.5) / PALETTE.length, 0.25 + 0.5 * Math.min(1, Math.max(0, sh))];
  const norm = (x, y, z) => { const l = 1 / (Math.hypot(x, y, z) || 1); return [x * l, y * l, z * l]; };
  // A triangle, flat; or, given a normal for each corner, smooth (each turned to the face's side, so a fold in a profile can't
  // light from inside).
  // shs: how far toward its shade each corner is (0..1).
  const tri = (a, b, c, k, ns, shs) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = norm(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
    [a, b, c].forEach((q, i) => {
      pos.push(...q); uv.push(...col(k, shs ? shs[i] : 0));
      const m = ns ? ns[i] : n, sg = ns && m[0] * n[0] + m[1] * n[1] + m[2] * n[2] < 0 ? -1 : 1;
      nrm.push(m[0] * sg, m[1] * sg, m[2] * sg);
    });
  };
  // A box, centre c, half sizes, turned yaw about y.
  const box = (c, hx, hy, hz, k, yaw = 0) => {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (x, y, z) => [c[0] + x * cs + z * sn, c[1] + y, c[2] - x * sn + z * cs];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    for (const [a, b, c2, d] of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]]) { tri(v[a], v[b], v[c2], k); tri(v[a], v[c2], v[d], k); }
  };
  // A turned shape round an axis from a: profile is [[r, t], ...] along it, t in metres. Capped where r is above nothing.
  const lathe = (a, axis, prof, sides, k, squash = 1) => {
    const d = norm(...axis);
    const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = norm(d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]);
    const e2 = [d[1] * e1[2] - d[2] * e1[1], d[2] * e1[0] - d[0] * e1[2], d[0] * e1[1] - d[1] * e1[0]];
    const ring = (r, t) => Array.from({ length: sides }, (_, i) => {
      const th = i / sides * Math.PI * 2, x = Math.cos(th) * r, y = Math.sin(th) * r * squash;
      return [a[0] + d[0] * t + e1[0] * x + e2[0] * y, a[1] + d[1] * t + e1[1] * x + e2[1] * y, a[2] + d[2] * t + e1[2] * x + e2[2] * y];
    });
    // Out from the axis at each step round: smooth round it, sharp along the profile (a rim stays a rim).
    const out = Array.from({ length: sides }, (_, i) => {
      const th = i / sides * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th) / squash;
      return [e1[0] * c + e2[0] * sn, e1[1] * c + e2[1] * sn, e1[2] * c + e2[2] * sn];
    });
    const rings = prof.map(([r, t]) => ring(r, t));
    for (let j = 0; j + 1 < rings.length; j++) {
      const dr = prof[j + 1][0] - prof[j][0], dt = prof[j + 1][1] - prof[j][1];
      const sn = out.map((o) => norm(o[0] * dt - d[0] * dr, o[1] * dt - d[1] * dr, o[2] * dt - d[2] * dr));
      for (let i = 0; i < sides; i++) {
        const i1 = (i + 1) % sides;
        tri(rings[j][i], rings[j][i1], rings[j + 1][i1], k, [sn[i], sn[i1], sn[i1]]);
        tri(rings[j][i], rings[j + 1][i1], rings[j + 1][i], k, [sn[i], sn[i1], sn[i]]);
      }
    }
    const ends = [[0, -1], [prof.length - 1, 1]];
    for (const [j, s] of ends) {
      if (prof[j][0] < 1e-4) continue;
      const t = prof[j][1], c = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
      for (let i = 0; i < sides; i++) {
        const i1 = (i + 1) % sides;
        if (s < 0) tri(c, rings[j][i1], rings[j][i], k); else tri(c, rings[j][i], rings[j][i1], k);
      }
    }
  };
  // A rounded lump: a squashed ball, rx by ry by rz, turned yaw.
  // (Smooth: its normals the ellipsoid's own.) baked: its top toward the colour's shade, as an oven browns a loaf: pale at the
  // foot, darkest on the crown.
  const lump = (c, rx, ry, rz, k, yaw = 0, seg = 8, baked = false) => {
    seg = Math.max(12, seg + 6);
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (th, ph) => {
      const x = Math.cos(ph) * Math.cos(th) * rx, y = Math.sin(ph) * ry, z = Math.cos(ph) * Math.sin(th) * rz;
      return [c[0] + x * cs + z * sn, c[1] + y, c[2] - x * sn + z * cs];
    };
    const N = (th, ph) => {
      const x = Math.cos(ph) * Math.cos(th) / rx, y = Math.sin(ph) / ry, z = Math.cos(ph) * Math.sin(th) / rz;
      return norm(x * cs + z * sn, y, -x * sn + z * cs);
    };
    const rows = seg >> 1;
    const B = (ph) => (baked ? Math.max(0, Math.sin(ph)) ** 0.7 : 0);
    for (let j = 0; j < rows; j++) {
      const p0 = -Math.PI / 2 + j / rows * Math.PI, p1 = -Math.PI / 2 + (j + 1) / rows * Math.PI;
      for (let i = 0; i < seg; i++) {
        const t0 = i / seg * Math.PI * 2, t1 = (i + 1) / seg * Math.PI * 2;
        tri(P(t0, p0), P(t1, p1), P(t1, p0), k, [N(t0, p0), N(t1, p1), N(t1, p0)], [B(p0), B(p1), B(p0)]);
        tri(P(t0, p0), P(t0, p1), P(t1, p1), k, [N(t0, p0), N(t0, p1), N(t1, p1)], [B(p0), B(p1), B(p1)]);
      }
    }
  };
  // A loaf: baked, scored across the crown so the pale crumb shows in the cuts, and dusted with flour.
  const loaf = (c, rx, ry, rz, yaw, cuts = 2, seg = 4) => {
    lump(c, rx, ry, rz, 1, yaw, seg, true);
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let i = 0; i < cuts; i++) {
      const t = cuts > 1 ? (i / (cuts - 1) - 0.5) * 1.1 * rx : 0;
      const top = Math.sqrt(Math.max(0, 1 - (t / rx) ** 2)) * ry;
      // (A dark groove sunk to the crust's own level, not a pale strip stood on it: those read as tape.)
      box([c[0] + t * cs, c[1] + top - 0.0035, c[2] - t * sn], 0.005, 0.004, rz * 0.55, 16, yaw - 0.35);
    }
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 0.55, x = Math.cos(a) * r * rx, z = Math.sin(a) * r * rz;
      const y = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (z / rz) ** 2)) * ry;
      box([c[0] + x * cs + z * sn, c[1] + y - 0.002, c[2] - x * sn + z * cs], 0.007 + rnd() * 0.006, 0.002, 0.006 + rnd() * 0.005, 2, rnd() * 3);
    }
  };
  const done = () => ({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint32Array(pos.length / 3).map((_, i) => i) });
  return { box, lathe, lump, loaf, rnd, done };
}

const TOP = 0.96;
// The counter's depth: its front edge (the customers'), its middle, and its back.
const F = -0.95, M = -0.64, K = -0.33;

export function wareMesh(kind) {
  const m = mesh();
  const { box, lathe, lump, loaf, rnd } = m;
  if (kind === 'setting') {
    // A place at table, the table's top at y 0: a wooden trencher with pottage on it, a heel of bread, a clay cup, a horn spoon.
    // Local +z runs away from the one sat at it.
    lathe([0, 0, 0], [0, 1, 0], [[0.13, 0], [0.135, 0.012], [0.125, 0.018], [0.0, 0.018]], 16, 4);
    lump([0, 0.019, 0.005], 0.085, 0.012, 0.08, 7, 0, 10);
    lump([-0.02, 0.028, 0.0], 0.028, 0.01, 0.022, 10, 0.4, 6);
    lump([-0.19, 0.03, 0.06], 0.07, 0.035, 0.05, 1, 0.6, 8, true);
    box([-0.17, 0.03, 0.035], 0.045, 0.028, 0.004, 2, 0.6);
    lathe([0.19, 0, 0.1], [0, 1, 0], [[0.036, 0], [0.04, 0.02], [0.044, 0.085], [0.047, 0.09], [0.042, 0.09], [0.039, 0.02]], 12, 7);
    lump([0.19, 0.08, 0.1], 0.037, 0.004, 0.037, 12, 0, 8);
    box([0.1, 0.022, -0.06], 0.008, 0.004, 0.07, 9, -0.3);
    return m.done();
  }
  if (kind === 'tankard') {
    // An ale at the inn: a stave-built tankard, iron-hooped, with its handle, half drunk. (The crust once beside it read as a coin.)
    lathe([0.04, 0, 0.06], [0, 1, 0], [[0.05, 0], [0.047, 0.14]], 12, 12);
    lathe([0.04, 0.02, 0.06], [0, 1, 0], [[0.052, 0], [0.052, 0.018]], 12, 5);
    lathe([0.04, 0.105, 0.06], [0, 1, 0], [[0.05, 0], [0.05, 0.016]], 12, 5);
    lump([0.04, 0.12, 0.06], 0.044, 0.008, 0.044, 2, 0, 8);
    box([0.105, 0.075, 0.06], 0.012, 0.042, 0.008, 12);
    return m.done();
  }
  if (kind === 'tarp') {
    // Canvas over the bare counter, hanging down all round, roped twice across.
    box([0, TOP + 0.03, M], 1.8, 0.025, 0.36, 14);
    box([0, TOP - 0.17, F - 0.055], 1.8, 0.2, 0.012, 14);
    box([0, TOP - 0.12, K + 0.055], 1.8, 0.15, 0.012, 14);
    for (const s of [-1, 1]) box([s * 1.81, TOP - 0.14, M], 0.012, 0.18, 0.36, 14);
    for (const x of [-0.95, 0.95]) {
      box([x, TOP + 0.06, M], 0.012, 0.012, 0.38, 13);
      box([x, TOP - 0.2, F - 0.07], 0.012, 0.26, 0.012, 13);
      box([x, TOP - 0.2, K + 0.07], 0.012, 0.26, 0.012, 13);
    }
    return m.done();
  }
  if (kind === 'bread') {
    // A cloth on the board, two baskets of loaves, a row of rolls, a big round loaf floured on top, and one cut on its board.
    box([0, TOP + 0.004, M], 1.62, 0.004, 0.3, 3);
    box([0, TOP - 0.1, F - 0.004], 1.62, 0.1, 0.006, 3);
    for (const [bx, bz, n] of [[-1.08, M - 0.01, 5], [-0.42, M - 0.01, 4]]) {
      lathe([bx, TOP + 0.008, bz], [0, 1, 0], [[0.21, 0], [0.26, 0.1], [0.27, 0.13], [0.24, 0.13], [0.23, 0.04]], 12, 0, 0.94);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rnd() * 0.4, r = i ? 0.12 : 0;
        loaf([bx + Math.cos(a) * r, TOP + 0.13 + (i ? 0 : 0.03), bz + Math.sin(a) * r * 0.8], 0.115, 0.055, 0.068, a + Math.PI / 2 + (rnd() - 0.5) * 0.5, 3);
      }
    }
    for (let i = 0; i < 6; i++) lump([0.18 + i * 0.125, TOP + 0.034, -0.84 + (i % 2) * 0.05], 0.052, 0.036, 0.05, 1, rnd(), 7, true);
    loaf([1.34, TOP + 0.06, M + 0.02], 0.15, 0.075, 0.15, 0.4, 0);
    // Three slashes across the round one.
    for (const o of [-0.045, 0, 0.045]) box([1.34 + o * Math.cos(0.4), TOP + 0.1305 - Math.abs(o) * 0.25, M + 0.02 - o * Math.sin(0.4)], 0.006, 0.004, 0.085 - Math.abs(o) * 0.5, 16, 0.4 + 0.5);
    box([0.62, TOP + 0.015, -0.5], 0.24, 0.015, 0.13, 12);
    loaf([0.56, TOP + 0.075, -0.5], 0.13, 0.06, 0.08, 0, 2);
    box([0.69, TOP + 0.075, -0.5], 0.005, 0.05, 0.07, 2);
    lump([0.76, TOP + 0.06, -0.5], 0.04, 0.045, 0.07, 1, 0, 6, true);
    return m.done();
  }
  if (kind === 'ale') {
    // A cask on its cradle, its spigot to the customers, tankards set out, two of them drawn, and a jug.
    const cx = -0.95, cz = M - 0.02, cy = TOP + 0.33, L = 0.4;
    for (const s of [-1, 1]) box([cx + s * 0.26, TOP + 0.06, cz], 0.04, 0.06, 0.24, 12);
    lathe([cx - L, cy, cz], [1, 0, 0], [[0.23, 0], [0.27, 0.16], [0.29, 0.4], [0.27, 0.64], [0.23, 0.8]], 14, 4);
    for (const t of [0.06, 0.26, 0.54, 0.74]) lathe([cx - L + t - 0.012, cy, cz], [1, 0, 0], [[0.27 + 0.02 * Math.sin(t / 0.8 * Math.PI), 0], [0.27 + 0.02 * Math.sin(t / 0.8 * Math.PI), 0.024]], 14, 5);
    lathe([cx, cy - 0.12, cz - 0.27], [0, 0, -1], [[0.022, 0], [0.018, 0.1]], 6, 15);
    box([cx, cy - 0.16, cz - 0.36], 0.012, 0.03, 0.012, 15);
    for (let i = 0; i < 5; i++) {
      const x = -0.1 + i * 0.22, z = -0.82 + (i % 2) * 0.13, hgt = 0.13;
      lathe([x, TOP, z], [0, 1, 0], [[0.05, 0], [0.047, hgt]], 10, 4);
      lathe([x, TOP + 0.02, z], [0, 1, 0], [[0.052, 0], [0.052, 0.018]], 10, 5);
      lathe([x, TOP + hgt - 0.035, z], [0, 1, 0], [[0.05, 0], [0.05, 0.016]], 10, 5);
      box([x + 0.065, TOP + 0.07, z], 0.012, 0.04, 0.008, 4);
      if (i === 1 || i === 3) lump([x, TOP + hgt, z], 0.044, 0.014, 0.044, 2, 0, 8);
    }
    lathe([1.38, TOP, -0.56], [0, 1, 0], [[0.07, 0], [0.1, 0.08], [0.095, 0.15], [0.05, 0.22], [0.05, 0.26], [0.058, 0.27]], 12, 7);
    box([1.48, TOP + 0.18, -0.56], 0.012, 0.06, 0.01, 7);
    box([0.62, TOP + 0.006, -0.44], 0.3, 0.006, 0.09, 12);
    return m.done();
  }
  if (kind === 'cloth') {
    // Three bolts, madder, undyed and moss; a length of the undyed run out over the front; folded pieces in stacks; the ell-wand.
    for (const [x, k] of [[-1.2, 8], [-0.65, 9], [-0.1, 10]]) {
      lathe([x, TOP + 0.1, F + 0.06], [0, 0, 1], [[0.1, 0], [0.1, 0.5]], 14, k);
      lathe([x, TOP + 0.1, F + 0.03], [0, 0, 1], [[0.025, 0], [0.025, 0.56]], 6, 12);
      box([x - 0.105, TOP + 0.02, M], 0.012, 0.02, 0.24, 12);
      box([x + 0.105, TOP + 0.02, M], 0.012, 0.02, 0.24, 12);
    }
    box([-0.65, TOP + 0.006, F + 0.04], 0.24, 0.005, 0.05, 9);
    box([-0.65, TOP - 0.16, F - 0.008], 0.24, 0.165, 0.005, 9);
    for (const [x, z, ks] of [[0.45, -0.78, [8, 9, 10, 9]], [1.0, -0.78, [10, 8, 9]], [0.74, -0.47, [9, 9, 8]]]) {
      ks.forEach((k, j) => box([x + (rnd() - 0.5) * 0.02, TOP + 0.022 + j * 0.044, z + (rnd() - 0.5) * 0.02], 0.22, 0.021, 0.15, k, (rnd() - 0.5) * 0.08));
    }
    box([-0.55, TOP + 0.012, K - 0.035], 0.62, 0.012, 0.014, 12);
    for (const s of [-1, 1]) box([-0.55 + s * 0.62, TOP + 0.012, K - 0.035], 0.018, 0.016, 0.018, 15);
    return m.done();
  }
  if (kind === 'curios') {
    // Pots and jars, a little iron-bound casket, a book, a brass candlestick, and the tray the gems are set out on.
    lathe([-1.35, TOP, -0.76], [0, 1, 0], [[0.07, 0], [0.1, 0.1], [0.09, 0.2], [0.05, 0.25], [0.06, 0.27]], 12, 7);
    lathe([-1.1, TOP, -0.86], [0, 1, 0], [[0.05, 0], [0.065, 0.06], [0.06, 0.14], [0.035, 0.17], [0.04, 0.19]], 10, 11);
    lathe([-1.22, TOP, -0.48], [0, 1, 0], [[0.08, 0], [0.09, 0.18], [0.085, 0.2], [0.0, 0.2]], 12, 11);
    lump([-1.22, TOP + 0.215, -0.48], 0.05, 0.02, 0.05, 12, 0, 8);
    lathe([-0.9, TOP, -0.6], [0, 1, 0], [[0.045, 0], [0.06, 0.05], [0.055, 0.1], [0.03, 0.13], [0.034, 0.14]], 10, 7);
    box([-0.4, TOP + 0.09, -0.7], 0.2, 0.09, 0.13, 12, 0.1);
    for (const t of [-0.12, 0.12]) box([-0.4 + t, TOP + 0.09, -0.7], 0.014, 0.095, 0.136, 5, 0.1);
    box([-0.4 - 0.01, TOP + 0.13, -0.835], 0.03, 0.025, 0.006, 15, 0.1);
    box([0.18, TOP + 0.03, -0.56], 0.15, 0.03, 0.11, 8, -0.25);
    box([0.18, TOP + 0.03, -0.56], 0.14, 0.024, 0.1, 3, -0.25);
    lathe([0.5, TOP, -0.45], [0, 1, 0], [[0.06, 0], [0.06, 0.015], [0.015, 0.03], [0.012, 0.2], [0.035, 0.21], [0.035, 0.225]], 10, 15);
    lathe([0.5, TOP + 0.225, -0.45], [0, 1, 0], [[0.016, 0], [0.016, 0.09]], 8, 9);
    box([1.0, TOP + 0.017, -0.72], 0.24, 0.017, 0.13, 12);
    box([1.0, CURIO_TRAY_Y - 0.002, -0.72], 0.22, 0.003, 0.11, 8);
    return m.done();
  }
  return m.done();
}
