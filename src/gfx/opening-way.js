// Lisandra's way down from her ledge, drawn (src/core/opening.js WAY, LANDINGS): broad flights of split limestone, each
// step laid in two or three stones; a landing at every turn flagged in stones of every shape, fitted; dry-stone walls along
// the flights and round the landings that hold the hill back or the floor up; and two hundred years of her keeping it: pots
// and troughs of flowers, lavender in the beds between the flights, ivy on the walls, a rail, lanterns at every landing, a
// bench where the view is. One mesh to a material; the garden's colours are swatches on one small picture (gardenTexture).
import { LANDINGS, WAY_PROPS, WAY_SEGS, landingEdge, onWay, wayY } from '../core/opening.js';
import { terrainHeight } from '../core/terrain.js';
import { Geo, box, frame, lathe } from './opening.js';

let seed = 4111;
const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * seed / 2147483647; };
const pick = (list) => list[Math.floor(rnd(0, list.length - 1e-9))];

// ---- the garden's picture -----------------------------------------------------------------------------------------------
// Swatches, 8 to a row: each thing in the garden takes the middle of one, so a leaf is a leaf's green and a petal its own.
const SW = {
  leaf: 0, ivy: 1, young: 2, lavender: 3, foxglove: 4, marigold: 5, buttercup: 6, daisy: 7,
  forget: 8, poppy: 9, pot: 10, potDark: 11, soil: 12, sage: 13, eye: 14, rose: 15, stem: 16, moss: 17,
};
const SWATCH = [
  [74, 112, 46], [38, 66, 34], [118, 146, 58], [128, 98, 176], [196, 98, 150], [222, 128, 34], [232, 200, 62], [236, 232, 220],
  [96, 136, 210], [196, 40, 34], [170, 92, 58], [124, 64, 42], [64, 46, 32], [122, 138, 110], [214, 168, 40], [204, 120, 132],
  [88, 118, 54], [86, 104, 50],
];
const suv = (i) => [((i % 8) + 0.5) / 8, (Math.floor(i / 8) + 0.5) / 8];
export function gardenTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#4a7030'; g.fillRect(0, 0, 256, 256);
  SWATCH.forEach(([r, gg, b], i) => {
    const x = (i % 8) * 32, y = Math.floor(i / 8) * 32;
    g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(x, y, 32, 32);
    // (A little grain in each, so a broad petal or a pot isn't flat paint.)
    for (let k = 0; k < 60; k++) { const d = rnd(-18, 18); g.fillStyle = `rgba(${d > 0 ? 255 : 0},${d > 0 ? 255 : 0},${d > 0 ? 240 : 0},${Math.abs(d) / 255})`; g.fillRect(x + 4 + rnd(0, 24), y + 4 + rnd(0, 24), 2, 2); }
  });
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

// Leaves, close set, for the shrubs' skins: a few thousand leaves of a few greens, lit from above, the picture wrapping at
// its edges so it tiles.
export function foliageTexture() {
  const N = 256, cv = document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d');
  g.fillStyle = '#1f3a18'; g.fillRect(0, 0, N, N);
  const greens = [[46, 84, 34], [58, 100, 40], [72, 116, 46], [40, 72, 32], [88, 128, 52], [64, 94, 44]];
  const s0 = seed;
  seed = 777;
  for (let i = 0; i < 1400; i++) {
    const x = rnd(0, N), y = rnd(0, N), a = rnd(0, 6.3), l = rnd(5, 11), w = l * rnd(0.4, 0.6), [r, gg, b] = pick(greens), k = rnd(0.75, 1.2);
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      if (x + ox < -14 || x + ox > N + 14 || y + oy < -14 || y + oy > N + 14) continue;
      g.save(); g.translate(x + ox, y + oy); g.rotate(a);
      g.fillStyle = `rgb(${r * k | 0},${gg * k | 0},${b * k | 0})`; g.beginPath(); g.ellipse(0, 0, l, w, 0, 0, 6.2832); g.fill();
      g.fillStyle = `rgba(255,255,220,${rnd(0.05, 0.14)})`; g.beginPath(); g.ellipse(-l * 0.2, -w * 0.25, l * 0.6, w * 0.4, 0, 0, 6.2832); g.fill();
      g.strokeStyle = 'rgba(20,40,10,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-l, 0); g.lineTo(l, 0); g.stroke();
      g.restore();
    }
  }
  seed = s0;
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

// ---- small pieces ----------------------------------------------------------------------------------------------------
// A flat piece in one swatch: a triangle or a quad, its normal given (the item shader turns it round for the back).
function tri(g, a, b, c, n, sw) { const [u, v] = suv(sw); g.tri(g.v(a, n, u, v), g.v(b, n, u, v), g.v(c, n, u, v)); }
function quad(g, a, b, c, d, n, sw) { const [u, v] = suv(sw); g.quad(g.v(a, n, u, v), g.v(b, n, u, v), g.v(c, n, u, v), g.v(d, n, u, v)); }
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

// A blade of a leaf from (x, y, z), leaning toward (lx, lz), h tall and w wide at its foot, bent over toward its tip.
function blade(g, x, y, z, h, w, lx, lz, sw) {
  const sx = -lz, sz = lx, mid = [x + lx * h * 0.25, y + h * 0.55, z + lz * h * 0.25], tip = [x + lx * h * 0.7, y + h * (0.85 + rnd(0, 0.1)), z + lz * h * 0.7];
  const n = norm([lx, 0.3, lz]);
  quad(g, [x - sx * w, y, z - sz * w], [x + sx * w, y, z + sz * w], [mid[0] + sx * w * 0.6, mid[1], mid[2] + sz * w * 0.6], [mid[0] - sx * w * 0.6, mid[1], mid[2] - sz * w * 0.6], n, sw);
  tri(g, [mid[0] - sx * w * 0.6, mid[1], mid[2] - sz * w * 0.6], [mid[0] + sx * w * 0.6, mid[1], mid[2] + sz * w * 0.6], tip, n, sw);
}
// A flower's head at c, facing up a little toward (fx, fz): n petals round a heart.
function head(g, c, r, sw, heart, fx = 0, fz = 0, n = 5) {
  const up = norm([fx * 0.6, 1, fz * 0.6]), a0 = rnd(0, 6.3);
  const ax = norm([up[1], -up[0], 0]), bx = [up[1] * ax[2] - up[2] * ax[1], up[2] * ax[0] - up[0] * ax[2], up[0] * ax[1] - up[1] * ax[0]];
  const at = (a, rr, lift) => [c[0] + (ax[0] * Math.cos(a) + bx[0] * Math.sin(a)) * rr + up[0] * lift, c[1] + (ax[1] * Math.cos(a) + bx[1] * Math.sin(a)) * rr + up[1] * lift, c[2] + (ax[2] * Math.cos(a) + bx[2] * Math.sin(a)) * rr + up[2] * lift];
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * 6.2832, da = 3.1416 / n;
    tri(g, at(a, r * 0.15, 0), at(a - da * 0.8, r * 0.8, r * 0.15), at(a, r, r * 0.25), up, sw);
    tri(g, at(a, r * 0.15, 0), at(a, r, r * 0.25), at(a + da * 0.8, r * 0.8, r * 0.15), up, sw);
  }
  if (heart !== undefined) for (let i = 0; i < 3; i++) tri(g, at(a0 + i * 2.09, r * 0.28, r * 0.08), at(a0 + i * 2.09 + 2.09, r * 0.28, r * 0.08), at(0, 0, r * 0.14), up, heart);
}
// A thin stalk from a to b.
function stalk(g, a, b, w, sw) {
  const d = norm([b[0] - a[0], 0, b[2] - a[2]]), s = [-d[2] || 1, 0, d[0]];
  quad(g, [a[0] - s[0] * w, a[1], a[2] - s[2] * w], [a[0] + s[0] * w, a[1], a[2] + s[2] * w], [b[0] + s[0] * w * 0.6, b[1], b[2] + s[2] * w * 0.6], [b[0] - s[0] * w * 0.6, b[1], b[2] - s[2] * w * 0.6], norm([s[2], 0.2, -s[0]]), sw);
}

// A clump of something growing, its foot at (x, y, z), spread about r. Kinds: lavender, daisy, foxglove, marigold, poppy,
// forget-me-not, and plain green (fern-ish leaves for the shade).
const KINDS = ['lavender', 'daisy', 'foxglove', 'marigold', 'poppy', 'forget', 'lavender', 'daisy', 'rose'];
let THIN = 1;   // (a phone gets each clump thinned, set by wayModels)
function clump(g, x, y, z, r, kind) {
  const leaves = Math.max(2, Math.round((kind === 'green' ? 11 : kind === 'lavender' ? 4 : 6) * THIN)), tall = { lavender: 0.5, daisy: 0.38, foxglove: 0.95, marigold: 0.28, poppy: 0.5, forget: 0.2, green: 0.45, rose: 0.6 }[kind] ?? 0.4;
  for (let i = 0; i < leaves; i++) {
    const a = rnd(0, 6.3), d = rnd(0, r * 0.7), lx = Math.cos(a), lz = Math.sin(a);
    blade(g, x + lx * d, y - 0.02, z + lz * d, tall * (kind === 'green' ? rnd(0.6, 1) : rnd(0.35, 0.6)), rnd(0.025, 0.05), lx, lz, kind === 'lavender' ? SW.sage : pick([SW.leaf, SW.leaf, SW.young]));
  }
  const heads = Math.round(({ lavender: 9, daisy: 7, foxglove: 3, marigold: 6, poppy: 4, forget: 12, green: 0, rose: 5 }[kind] ?? 5) * THIN);
  for (let i = 0; i < heads; i++) {
    const a = rnd(0, 6.3), d = rnd(0, r), lx = Math.cos(a), lz = Math.sin(a), h = tall * rnd(0.75, 1.1);
    const foot = [x + lx * d * 0.4, y - 0.02, z + lz * d * 0.4], top = [x + lx * d, y + h, z + lz * d];
    stalk(g, foot, top, 0.008, kind === 'lavender' ? SW.sage : SW.stem);
    if (kind === 'lavender') {
      // (A spike of little purple flowers: two crossed narrow leaves of it.)
      for (const [sx, sz] of [[1, 0], [0, 1]]) quad(g, [top[0] - sx * 0.014, top[1] - 0.02, top[2] - sz * 0.014], [top[0] + sx * 0.014, top[1] - 0.02, top[2] + sz * 0.014], [top[0] + sx * 0.008, top[1] + 0.11, top[2] + sz * 0.008], [top[0] - sx * 0.008, top[1] + 0.11, top[2] - sz * 0.008], [sz, 0.2, sx], SW.lavender);
    } else if (kind === 'foxglove') {
      // (A tall spike hung with bells, smaller toward the top.)
      for (let k = 0; k < 6; k++) { const f = k / 6, c = [top[0] + Math.cos(k * 2.3) * 0.03, top[1] - 0.32 + f * 0.36, top[2] + Math.sin(k * 2.3) * 0.03]; head(g, c, 0.045 * (1 - f * 0.5), SW.foxglove, undefined, Math.cos(k * 2.3), Math.sin(k * 2.3), 4); }
    } else {
      const sw = { daisy: SW.daisy, marigold: SW.marigold, poppy: SW.poppy, forget: SW.forget, rose: SW.rose }[kind] ?? SW.buttercup;
      const rr = { daisy: 0.035, marigold: 0.038, poppy: 0.05, forget: 0.016, rose: 0.045 }[kind] ?? 0.03;
      head(g, top, rr * rnd(0.85, 1.15), sw, kind === 'forget' || kind === 'rose' ? undefined : kind === 'poppy' ? SW.soil : SW.eye, lx, lz, kind === 'rose' ? 7 : 5);
    }
  }
}
// A pot of clay: its foot at (x, y, z), r across its mouth, h tall; earth in it, and something growing.
function pot(G, x, y, z, r, h, kind) {
  const F = frame(x, y, z, rnd(0, 6.3));
  lathe(G, F, [[0, 0.01], [r * 0.62, 0], [r * 0.72, h * 0.25], [r * 0.95, h * 0.82], [r * 1.06, h * 0.86], [r * 1.06, h], [r * 0.92, h], [r * 0.9, h * 0.9]], 12, 0.6, null, suv(SW.pot));
  lathe(G, F, [[r * 0.9, h * 0.9], [r * 0.5, h * 0.92], [0, h * 0.93]], 10, 0.6, null, suv(SW.soil));
  clump(G, x, y + h * 0.92, z, r * 0.8, kind);
}

// Ivy hanging down a wall's face from its top: small leaves, a hand wide at the top and narrowing as it trails down. (x, z)
// on the face, n the way it looks, t along it.
function ivy(g, x, z, top, drop, nx, nz, tx, tz) {
  const n = [nx, 0.15, nz], count = Math.round(18 + drop * 22);
  for (let i = 0; i < count; i++) {
    const f = Math.pow(rnd(), 0.8), y = top - f * drop, spread = (0.35 - 0.22 * f) * rnd(-1, 1);
    const cx = x + tx * spread + nx * rnd(0.01, 0.05), cz = z + tz * spread + nz * rnd(0.01, 0.05), s = rnd(0.035, 0.06), a = rnd(0, 6.3);
    const ca = Math.cos(a) * s, sa = Math.sin(a) * s;
    const P = (u, v) => [cx + tx * (u * ca - v * sa), y + (u * sa + v * ca), cz + tz * (u * ca - v * sa)];
    quad(g, P(-1, 0), P(0, -0.8), P(1, 0), P(0, 1.1), n, rnd() < 0.7 ? SW.ivy : SW.leaf);
  }
}

// A shrub: a lumpy dome of leaves r across its foot at (x, y, z), and what flowers on it. Kinds: box (plain green), lavender
// (grey-green, purple spikes all over its top), rose (pink and red heads), hydrangea (round heads, blue or pink), broom
// (yellow), foxglove (a mound with tall spikes standing out of it).
const SHRUBS = ['lavender', 'rose', 'hydrangea', 'box', 'broom', 'lavender', 'rose', 'hydrangea'];
let LEAF = null;   // (the shrubs' leafy skins go in a mesh of their own, set by wayModels)
function shrub(g, x, y, z, r, kind) {
  const h = r * rnd(0.75, 1.05), ph = rnd(0, 9), F = frame(x, y - 0.06, z, rnd(0, 6.3));
  const bumpy = (a, yy) => 0.16 * (Math.sin(a * 3 + ph) * Math.sin(yy * 9 / h + ph) + 0.6 * Math.sin(a * 7 + ph * 2) * 0.5);
  // (Its body, and two smaller lobes off it, so it's a bush and not a dome.)
  const dome = (Fd, rr, hh, bump) => lathe(LEAF, Fd, [[rr * 0.75, 0], [rr * 1.0, hh * 0.3], [rr * 0.92, hh * 0.62], [rr * 0.6, hh * 0.88], [rr * 0.2, hh * 1.0], [0, hh * 1.02]], 7, 0.55, bump);
  dome(F, r, h, bumpy);
  for (let k = 0; k < 1; k++) { const a = rnd(0, 6.3), q = F.P(Math.cos(a) * r * 0.7, 0, Math.sin(a) * r * 0.7); dome(frame(q[0], q[1] - 0.04, q[2], rnd(0, 6.3)), r * rnd(0.5, 0.65), h * rnd(0.55, 0.75), null); }
  // (What flowers on it, over its top two thirds, sat out on its skin.)
  const on = (a, f) => { const rr = r * (f < 0.5 ? 0.98 : 0.98 - (f - 0.5) * 1.4) * (1 + bumpy(a, f * h)); return [Math.cos(a) * Math.max(0.05, rr), f * h * 1.0, Math.sin(a) * Math.max(0.05, rr)]; };
  const n = Math.round(r * (kind === 'lavender' ? 34 : 18));
  if (kind === 'box') return;
  const swF = { rose: [SW.rose, SW.poppy, SW.rose], hydrangea: rnd() < 0.5 ? [SW.forget, SW.lavender] : [SW.foxglove, SW.rose], broom: [SW.buttercup, SW.marigold], lavender: [SW.lavender] }[kind] || [SW.daisy];
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.283), f = rnd(0.35, 0.95), [lx, ly, lz] = on(a, f), p = F.P(lx, ly, lz);
    const ox = Math.cos(a), oz = Math.sin(a);
    if (kind === 'lavender') {
      const tp = [p[0] + ox * 0.03, p[1] + 0.14, p[2] + oz * 0.03];
      quad(g, [p[0] - oz * 0.012, p[1], p[2] + ox * 0.012], [p[0] + oz * 0.012, p[1], p[2] - ox * 0.012], [tp[0] + oz * 0.008, tp[1], tp[2] - ox * 0.008], [tp[0] - oz * 0.008, tp[1], tp[2] + ox * 0.008], [ox, 0.3, oz], SW.lavender);
    } else if (kind === 'hydrangea') {
      // (A round head of small flowers: two crossed discs of it.)
      const c = [p[0] + ox * 0.04, p[1] + 0.02, p[2] + oz * 0.04], sw = pick(swF);
      head(g, c, 0.08, sw, undefined, ox, oz, 6); head(g, c, 0.07, sw, undefined, -oz * 2, ox * 2, 5);
    } else head(g, [p[0] + ox * 0.02, p[1] + 0.01, p[2] + oz * 0.02], kind === 'rose' ? 0.05 : 0.035, pick(swF), kind === 'rose' ? undefined : SW.eye, ox, oz, kind === 'rose' ? 6 : 5);
  }
}

// ---- stone -----------------------------------------------------------------------------------------------------------
// A dry-stone wall along a line of points, each [x, z, bottom, top, nx, nz, hill, walk] (n: the way its outer face looks;
// hill: the ground's height outside it, walk: the way's beside it): its two faces of fieldstone, one run along the whole
// line so it bends with it, from the ground up; a coping of the steps' stone along its top, flat slabs laid with the slope,
// a little proud either side. Only what can be seen: the outer face above the hill, the inner above the way.
const WALL_UV = 1.5;
function wall(W, Lm, line, thick = 0.46) {
  if (line.length < 2) return;
  const S = [0];
  for (let i = 1; i < line.length; i++) S.push(S[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = S.at(-1);
  if (total < 0.3) return;
  const off = (p, k) => [p[0] + p[4] * k, p[1] + p[5] * k];
  // (The faces: a strip each, a quad to a stretch, its foot where the ground is.)
  for (const [k, low] of [[thick / 2, (p) => Math.min(p[6], p[7]) - 0.35], [-thick / 2, (p) => p[7] - 0.12]]) {
    const n0 = k > 0 ? 1 : -1;
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i], b = line[i + 1];
      const ya = low(a), yb = low(b);
      if (a[3] - ya < 0.03 && b[3] - yb < 0.03) continue;
      const [ax, az] = off(a, k), [bx, bz] = off(b, k), na = [a[4] * n0, 0, a[5] * n0], nb = [b[4] * n0, 0, b[5] * n0];
      W.quad(W.v([ax, Math.min(ya, a[3]), az], na, S[i] / WALL_UV, ya / WALL_UV), W.v([bx, Math.min(yb, b[3]), bz], nb, S[i + 1] / WALL_UV, yb / WALL_UV),
        W.v([bx, b[3], bz], nb, S[i + 1] / WALL_UV, b[3] / WALL_UV), W.v([ax, a[3], az], na, S[i] / WALL_UV, a[3] / WALL_UV));
    }
  }
  // Its ends.
  for (const [p, q, e] of [[line[0], line[1], -1], [line.at(-1), line.at(-2), -1]]) {
    const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, n = [dx / l * e, 0, dz / l * e];
    const [ox, oz] = off(p, thick / 2), [ix, iz] = off(p, -thick / 2), lo = Math.min(p[6], p[7]) - 0.35;
    W.quad(W.v([ix, lo, iz], n, 0, lo / WALL_UV), W.v([ox, lo, oz], n, thick / WALL_UV, lo / WALL_UV), W.v([ox, p[3], oz], n, thick / WALL_UV, p[3] / WALL_UV), W.v([ix, p[3], iz], n, 0, p[3] / WALL_UV));
  }
  // The coping: slabs 0.45 to 0.8 long, each laid from the wall's top at one end to its top at the other.
  const at = (s) => {
    let i = 0;
    while (i + 2 < S.length && S[i + 1] < s) i++;
    const a = line[i], b = line[i + 1], t = Math.max(0, Math.min(1, (s - S[i]) / (S[i + 1] - S[i] || 1)));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[3] + (b[3] - a[3]) * t, a[4] + (b[4] - a[4]) * t, a[5] + (b[5] - a[5]) * t];
  };
  const hw = thick / 2 + 0.045;
  for (let s = 0; s < total - 0.04;) {
    const sl = Math.min(rnd(0.45, 0.8), total - s), s0 = s + 0.006, s1 = s + sl - 0.006, h = rnd(0.07, 0.1);
    s += sl;
    // (Cut to the bend: each slab's ends square across the wall where they are, so a curve is laid in short straight stones.)
    const ends = [at(s0), at(s1)].map(([x, z, y, nx, nz]) => { const l = Math.hypot(nx, nz) || 1; return { x, z, y, nx: nx / l, nz: nz / l }; });
    const P = (e, k, up) => [e.x + e.nx * k, e.y + up, e.z + e.nz * k];
    const [A, B] = ends, dirx = B.x - A.x, dirz = B.z - A.z, dl = Math.hypot(dirx, dirz) || 1;
    const top = norm([-(B.y - A.y) * dirx / dl / dl, 1, -(B.y - A.y) * dirz / dl / dl]);
    const u = (e) => (e === A ? s0 : s1) / 1.3;
    Lm.quad(Lm.v(P(A, -hw, h), top, u(A), 0), Lm.v(P(B, -hw, h), top, u(B), 0), Lm.v(P(B, hw, h), top, u(B), hw * 2 / 1.3), Lm.v(P(A, hw, h), top, u(A), hw * 2 / 1.3));
    for (const k of [-hw, hw]) {
      const n = [A.nx * Math.sign(k), 0, A.nz * Math.sign(k)];
      Lm.quad(Lm.v(P(A, k, 0), n, u(A), 0), Lm.v(P(B, k, 0), n, u(B), 0), Lm.v(P(B, k, h), n, u(B), h / 1.3), Lm.v(P(A, k, h), n, u(A), h / 1.3));
    }
    for (const [E, sg] of [[A, -1], [B, 1]]) {
      const n = [dirx / dl * sg, 0, dirz / dl * sg];
      Lm.quad(Lm.v(P(E, -hw, 0), n, 0, 0), Lm.v(P(E, hw, 0), n, hw * 2 / 1.3, 0), Lm.v(P(E, hw, h), n, hw * 2 / 1.3, h / 1.3), Lm.v(P(E, -hw, h), n, 0, h / 1.3));
    }
  }
}

// The flags on a landing: stones of every shape, fitted, inside its outline. (Each a cell of the points nearest a scatter
// of seeds, cut by the outline, drawn in a little from its neighbours, its face tipped a hair.)
function flags(Lm, L) {
  const seeds = [];
  const S = 0.6;
  for (let x = L.x - L.reach - S; x < L.x + L.reach + S; x += S) for (let z = L.z - L.reach - S; z < L.z + L.reach + S; z += S) {
    // (Some seeds dropped, so here and there a big stone; the rest shaken well out of their rows.)
    if (rnd() < 0.12) continue;
    const p = [x + rnd(-0.3, 0.3), z + rnd(-0.3, 0.3)];
    if (landingEdge(L, p[0], p[1]) < S) seeds.push(p);
  }
  const clip = (poly, nx, nz, d) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], fp = p[0] * nx + p[1] * nz - d, fq = q[0] * nx + q[1] * nz - d;
      if (fp <= 0) out.push(p);
      if ((fp < 0) !== (fq < 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  };
  for (const s of seeds) {
    let cell = L.poly.slice();
    for (const o of seeds) {
      if (o === s) continue;
      const dx = o[0] - s[0], dz = o[1] - s[1];
      if (dx * dx + dz * dz > 2.4) continue;
      const l = Math.hypot(dx, dz);
      cell = clip(cell, dx / l, dz / l, ((o[0] + s[0]) * dx + (o[1] + s[1]) * dz) / (2 * l));
      if (cell.length < 3) break;
    }
    if (cell.length < 3) continue;
    let cx = 0, cz = 0;
    for (const p of cell) { cx += p[0]; cz += p[1]; }
    cx /= cell.length; cz /= cell.length;
    // (Drawn in from its neighbours: the joints. Kept to the outline's own edge where it has one.)
    const ring = cell.map(([x, z]) => { const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1, k = Math.max(0, l - 0.022) / l; return [cx + dx * k, cz + dz * k]; });
    const tipX = rnd(-0.012, 0.012), tipZ = rnd(-0.012, 0.012), top = L.y + 0.015 + rnd(-0.006, 0.006), bot = L.y - 0.16;
    const yAt = (x, z) => top + (x - cx) * tipX + (z - cz) * tipZ;
    const n = norm([-tipX, 1, -tipZ]), uo = rnd(0, 1), vo = rnd(0, 1);
    const c = Lm.v([cx, yAt(cx, cz), cz], n, cx / 1.3 + uo, cz / 1.3 + vo);
    const tops = ring.map(([x, z]) => Lm.v([x, yAt(x, z), z], n, x / 1.3 + uo, z / 1.3 + vo));
    for (let i = 0; i < ring.length; i++) Lm.tri(c, tops[i], tops[(i + 1) % ring.length]);
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length], sn = norm([q[1] - p[1], 0, p[0] - q[0]]);
      const e = Math.hypot(q[0] - p[0], q[1] - p[1]);
      Lm.quad(Lm.v([p[0], yAt(p[0], p[1]), p[1]], sn, 0, 0), Lm.v([q[0], yAt(q[0], q[1]), q[1]], sn, e / 1.3, 0), Lm.v([q[0], bot, q[1]], sn, e / 1.3, 0.13), Lm.v([p[0], bot, p[1]], sn, 0, 0.13));
    }
  }
}

// ---- the whole way ---------------------------------------------------------------------------------------------------
export function wayModels(lip, lean = false) {
  THIN = lean ? 0.55 : 1;
  seed = 4111;
  const Lm = new Geo(), W = new Geo(), D = new Geo(), G = new Geo(), I = new Geo(), Q = new Geo();
  LEAF = new Geo();
  const flights = WAY_SEGS.filter((g) => g.stairs);
  const ground = (x, z) => terrainHeight(x, z);
  // (Round the flights and the landings, and a little way out: where her garden goes.)
  const WAY_BOX_IN = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const g of flights) for (const [x, z] of [[g.ax, g.az], [g.bx, g.bz]]) { WAY_BOX_IN.x0 = Math.min(WAY_BOX_IN.x0, x - 7); WAY_BOX_IN.x1 = Math.max(WAY_BOX_IN.x1, x + 7); WAY_BOX_IN.z0 = Math.min(WAY_BOX_IN.z0, z - 7); WAY_BOX_IN.z1 = Math.max(WAY_BOX_IN.z1, z + 7); }

  // The flights: each step two or three stones across, its nose a little proud.
  for (const sg of flights) {
    const ux = sg.dx / sg.len, uz = sg.dz / sg.len, yaw = Math.atan2(ux, uz), hw = sg.w;
    const run = sg.len - sg.flat0 - sg.flat1, n = Math.max(1, Math.round((sg.ay - sg.by) / 0.165)), d = run / n;
    for (let i = 0; i < n; i++) {
      const t = (sg.flat0 + (i + 0.5) * d) / sg.len, top = wayY(sg, t) + 0.02;
      const F = frame(sg.ax + sg.dx * t, top, sg.az + sg.dz * t, yaw + rnd(-0.012, 0.012));
      const k = rnd() < 0.5 ? 2 : 3, cuts = [-hw];
      for (let j = 1; j < k; j++) cuts.push(-hw + (2 * hw) * (j / k) + rnd(-0.25, 0.25));
      cuts.push(hw);
      for (let j = 0; j < k; j++) box(Lm, F, cuts[j] + 0.012, -0.55, -d / 2 - 0.05, cuts[j + 1] - 0.012, rnd(-0.01, 0.01), d / 2 + rnd(0.02, 0.05), 1.3);
    }
    // Where it's level at each end and that's off the landing's floor (a long level end), flagged on.
    for (const [s0, s1, y] of [[0, sg.flat0, sg.ay], [sg.len - sg.flat1, sg.len, sg.by]]) {
      for (let s = s0; s < s1 - 0.05;) {
        const sl = Math.min(rnd(0.45, 0.7), s1 - s), mx = sg.ax + ux * (s + sl / 2), mz = sg.az + uz * (s + sl / 2);
        if (!LANDINGS.some((L) => landingEdge(L, mx, mz) < -0.1)) box(Lm, frame(mx, y + 0.015, mz, yaw), -hw, -0.3, -sl / 2 + 0.012, hw, 0, sl / 2 - 0.012, 1.3);
        s += sl;
      }
    }
    // Its walls, both sides: a kerb where the hill's level with it, a wall holding the hill back where it's higher, a wall
    // down to it where it's lower. They stop at the landings, whose own walls take over.
    for (const side of [-1, 1]) {
      const line = [];
      const px = -uz * side, pz = ux * side;
      for (let s = 0; s <= sg.len + 1e-6; s += 0.5) {
        const ss = Math.min(s, sg.len), t = ss / sg.len;
        const x = sg.ax + ux * ss + px * (hw + 0.24), z = sg.az + uz * ss + pz * (hw + 0.24);
        if (LANDINGS.some((L) => landingEdge(L, x, z) < 0.25)) { if (line.length > 1) wall(W, Lm, line); line.length = 0; continue; }
        const walk = wayY(sg, t), hill = ground(x + px * 0.6, z + pz * 0.6), foot = Math.min(hill, ...[1.1, 1.8].map((o) => ground(x + px * o, z + pz * o)));
        const top = hill > walk + 0.18 ? hill + 0.1 : walk + 0.32, bot = Math.min(foot, walk) - 0.4;
        line.push([x, z, bot, top, px, pz, Math.min(foot, hill), walk]);
      }
      if (line.length > 1) wall(W, Lm, line);
    }
  }

  // The landings: their flags, and a wall round each but where the way comes on and goes off.
  for (const L of LANDINGS) {
    flags(Lm, L);
    const line = [], n = Math.ceil(L.poly.reduce((s, p, i) => s + Math.hypot(L.poly[(i + 1) % L.poly.length][0] - p[0], L.poly[(i + 1) % L.poly.length][1] - p[1]), 0) / 0.5);
    // Round its outline, from just past the way off it, all the way to just short of the way on.
    const along = [];
    for (let i = 0; i < L.poly.length; i++) {
      const p = L.poly[i], q = L.poly[(i + 1) % L.poly.length], e = Math.hypot(q[0] - p[0], q[1] - p[1]), m = Math.max(1, Math.round(e / 0.5));
      const nx = (q[1] - p[1]) / e, nz = (p[0] - q[0]) / e;
      for (let j = 0; j < m; j++) along.push([p[0] + (q[0] - p[0]) * j / m + nx * 0.22, p[1] + (q[1] - p[1]) * j / m + nz * 0.22, nx, nz]);
    }
    void n;
    const open = (x, z) => WAY_SEGS.some((g) => {
      if (g.kind === 'landing') return false;
      const t = Math.max(0, Math.min(1, ((x - g.ax) * g.dx + (z - g.az) * g.dz) / (g.len * g.len)));
      return Math.hypot(g.ax + g.dx * t - x, g.az + g.dz * t - z) < g.w + 0.15;
    });
    let start = along.findIndex(([x, z]) => open(x, z));
    start = start < 0 ? 0 : start;
    for (let k = 0; k <= along.length; k++) {
      const [x, z, nx, nz] = along[(start + k) % along.length];
      if (open(x, z)) { if (line.length > 1) wall(W, Lm, line); line.length = 0; continue; }
      const hill = ground(x + nx * 0.6, z + nz * 0.6), foot = Math.min(hill, ...[1.1, 1.8].map((o) => ground(x + nx * o, z + nz * o)));
      const top = hill > L.y + 0.18 ? hill + 0.1 : L.y + (foot < L.y - 0.8 ? 0.5 : 0.34), bot = Math.min(foot, L.y) - 0.4;
      line.push([x, z, bot, top, nx, nz, Math.min(foot, hill), L.y]);
    }
    if (line.length > 1) wall(W, Lm, line);
  }

  // ---- her garden ----------------------------------------------------------------------------------------------------
  const walkLine = (x, z) => {
    let best = 1e9;
    for (const g of WAY_SEGS) {
      const t = Math.max(0, Math.min(1, ((x - g.ax) * g.dx + (z - g.az) * g.dz) / (g.len * g.len)));
      best = Math.min(best, Math.hypot(g.ax + g.dx * t - x, g.az + g.dz * t - z));
    }
    return best;
  };
  const taken = WAY_PROPS.map((p) => [p.x, p.z, Math.max(p.hx, p.hz) + 0.35]);
  const free = (x, z, r) => taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > r + tr);

  // What's on the landings.
  for (const p of WAY_PROPS) {
    const F = frame(p.x, p.y, p.z, p.yaw);
    if (p.kind === 'bench') {
      // A plain bench of three boards on two stone feet, a back of two boards, its front to the view.
      for (const sx of [-0.62, 0.62]) box(Lm, F, sx - 0.09, -0.05, -0.2, sx + 0.09, 0.42, 0.2, 1.3);
      for (let k = 0; k < 3; k++) box(D, F, -0.78, 0.42, -0.21 + k * 0.145, 0.78, 0.47, -0.08 + k * 0.145, 1.2);
      for (const sx of [-0.62, 0.62]) box(D, F, sx - 0.04, 0.42, -0.27, sx + 0.04, 0.92, -0.2, 1.2);
      for (const yb of [0.6, 0.78]) box(D, F, -0.78, yb, -0.27, 0.78, yb + 0.11, -0.23, 1.2);
      // (A folded blanket at one end, and a cup.)
      box(G, F, 0.28, 0.47, -0.16, 0.66, 0.53, 0.14, 1, suv(SW.rose));
      lathe(G, frame(p.x, p.y, p.z, p.yaw), [[0, 0.47], [0.035, 0.47], [0.04, 0.55], [0.034, 0.55]].map(([r, y]) => [r, y]), 8, 0.6, null, suv(SW.potDark));
    } else if (p.kind === 'trough') {
      // A stone trough, earth in it, and a row of flowers.
      box(Lm, F, -0.6, -0.04, -0.22, 0.6, 0.46, -0.16, 1.3); box(Lm, F, -0.6, -0.04, 0.16, 0.6, 0.46, 0.22, 1.3);
      box(Lm, F, -0.6, -0.04, -0.16, -0.54, 0.46, 0.16, 1.3); box(Lm, F, 0.54, -0.04, -0.16, 0.6, 0.46, 0.16, 1.3);
      quad(G, F.P(-0.54, 0.4, -0.16), F.P(0.54, 0.4, -0.16), F.P(0.54, 0.4, 0.16), F.P(-0.54, 0.4, 0.16), [0, 1, 0], SW.soil);
      const kind = pick(['lavender', 'daisy', 'marigold', 'rose']);
      for (let k = 0; k < 4; k++) { const q = F.P(-0.4 + k * 0.27, 0.4, rnd(-0.05, 0.05)); clump(G, q[0], q[1], q[2], 0.16, k === 3 ? 'forget' : kind); }
    } else if (p.kind === 'lantern') {
      // A post on a stone foot, an arm out over the floor, and an old lantern hung from it on a short chain.
      lathe(Lm, frame(p.x, p.y, p.z), [[0.2, -0.05], [0.2, 0.12], [0.14, 0.2], [0, 0.2]], 8, 1.3);
      box(D, F, -0.06, 0.15, -0.06, 0.06, 2.2, 0.06, 1.2);
      box(D, F, -0.04, 2.08, -0.04, 0.04, 2.15, -0.62, 1.2);
      box(D, F, -0.03, 1.75, -0.04, 0.03, 2.1, -0.1, 1.2);   // (its brace)
      box(I, F, -0.008, 1.84, -0.56, 0.008, 2.08, -0.54, 1);
      const L0 = 1.5, Fl = frame(...F.P(0, L0, -0.55), p.yaw);
      box(I, Fl, -0.1, 0, -0.1, 0.1, 0.03, 0.1, 1);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(I, Fl, a * 0.085 - 0.01, 0.03, b * 0.085 - 0.01, a * 0.085 + 0.01, 0.3, b * 0.085 + 0.01, 1);
      box(Q, Fl, -0.075, 0.035, -0.075, 0.075, 0.29, 0.075, 1);
      lathe(I, Fl, [[0.12, 0.3], [0.11, 0.32], [0.04, 0.4], [0.015, 0.42], [0.02, 0.34 + 0.0], [0, 0.34]].slice(0, 4).concat([[0, 0.42]]), 6, 1);
      lathe(I, frame(...Fl.P(0, 0.44, 0)), [[0.02, -0.02], [0.025, 0], [0.02, 0.02]], 6, 1);
    }
  }

  // Pots on every landing, round its edge, clear of the way across it and of her things.
  LANDINGS.forEach((L) => {
    let n = 0;
    for (let tries = 0; tries < 40 && n < 4; tries++) {
      const a = rnd(0, 6.283), dx = Math.cos(a), dz = Math.sin(a);
      let t = 0;
      while (t < L.reach && landingEdge(L, L.x + dx * (t + 0.05), L.z + dz * (t + 0.05)) < -0.32) t += 0.05;
      const x = L.x + dx * t, z = L.z + dz * t, r = rnd(0.15, 0.24);
      if (walkLine(x, z) < 1.5 || !free(x, z, r)) continue;
      pot(G, x, L.y + 0.01, z, r, r * rnd(1.4, 1.9), pick(KINDS));
      taken.push([x, z, r]);
      n++;
      // (Often a little one beside it.)
      if (rnd() < 0.5) {
        const b = a + rnd(-0.6, 0.6), rr = rnd(0.09, 0.13), x2 = x + Math.cos(b + 1.57) * (r + rr + 0.06), z2 = z + Math.sin(b + 1.57) * (r + rr + 0.06);
        if (walkLine(x2, z2) > 1.4 && landingEdge(L, x2, z2) < -0.15 && free(x2, z2, rr)) { pot(G, x2, L.y + 0.01, z2, rr, rr * rnd(1.3, 1.7), pick(KINDS)); taken.push([x2, z2, rr]); }
      }
    }
  });

  // On the flights: a pot at the end of a step here and there, by the wall; and above the walls, the beds she keeps.
  for (const sg of flights) {
    const ux = sg.dx / sg.len, uz = sg.dz / sg.len, run = sg.len - sg.flat0 - sg.flat1, n = Math.max(1, Math.round((sg.ay - sg.by) / 0.165)), d = run / n;
    for (let i = 3; i < n - 2; i += 5 + Math.floor(rnd(0, 3))) {
      const t = (sg.flat0 + (i + 0.5) * d) / sg.len, side = rnd() < 0.5 ? -1 : 1, r = rnd(0.12, 0.17);
      const x = sg.ax + sg.dx * t - uz * side * (sg.w - r - 0.06), z = sg.az + sg.dz * t + ux * side * (sg.w - r - 0.06);
      pot(G, x, wayY(sg, t) + 0.02, z, r, r * rnd(1.4, 1.8), pick(KINDS));
    }
    for (const side of [-1, 1]) {
      const px = -uz * side, pz = ux * side;
      for (let s = 0.4; s < sg.len - 0.3; s += rnd(0.7, 1.3)) {
        const t = s / sg.len, walk = wayY(sg, t), cx = sg.ax + ux * s, cz = sg.az + uz * s;
        const wx = cx + px * (sg.w + 0.24), wz = cz + pz * (sg.w + 0.24);
        if (LANDINGS.some((L) => landingEdge(L, wx, wz) < 0.3)) continue;
        const bx = cx + px * (sg.w + 0.85), bz = cz + pz * (sg.w + 0.85), hill = terrainHeight(bx, bz);
        if (hill > walk + 0.15) {
          // A bed along the top of the wall that holds the hill back: flowers leaning out over the coping.
          if (rnd() < 0.8 && !onWay(bx, bz, 0.1)) clump(G, bx, hill, bz, rnd(0.18, 0.3), pick(KINDS));
        } else if (walk - hill > 0.6 && rnd() < 0.65) {
          // Ivy down the face of a wall that falls away, often right to its foot.
          ivy(G, wx + px * 0.25, wz + pz * 0.25, walk + 0.3, Math.min(walk - hill + 0.3, rnd(0.8, 2.4)), px, pz, ux, uz);
        }
        // (And at the foot of a wall that falls away, shrubs against it, so it stands in a garden and not on bare hill.)
        const fx = cx + px * (sg.w + 1.0), fz = cz + pz * (sg.w + 1.0), fy = terrainHeight(fx, fz);
        if (walk - fy > 0.7 && rnd() < 0.7 && !onWay(fx, fz, 0.3)) shrub(G, fx, fy, fz, rnd(0.5, 0.85), pick(SHRUBS));
        // (Where it falls a long way, a second row lower down, so the bank under the wall is a garden too and not bare rock.)
        const gx = cx + px * (sg.w + 2.1), gz = cz + pz * (sg.w + 2.1), gy = terrainHeight(gx, gz);
        if (walk - gy > 1.6 && rnd() < (lean ? 0.35 : 0.7) && !onWay(gx, gz, 0.3)) shrub(G, gx, gy, gz, rnd(0.55, 0.9), pick(SHRUBS));
      }
    }
  }
  // And round the landings' edges: beds above where the hill's held back, ivy down where it falls away.
  for (const L of LANDINGS) {
    for (let i = 0; i < L.poly.length; i++) {
      const p = L.poly[i], q = L.poly[(i + 1) % L.poly.length], e = Math.hypot(q[0] - p[0], q[1] - p[1]), nx = (q[1] - p[1]) / e, nz = (p[0] - q[0]) / e;
      for (let s = rnd(0.2, 0.6); s < e; s += rnd(0.7, 1.2)) {
        const x = p[0] + (q[0] - p[0]) * s / e, z = p[1] + (q[1] - p[1]) * s / e;
        if (walkLine(x, z) < 2.2) continue;
        const bx = x + nx * 0.85, bz = z + nz * 0.85, hill = terrainHeight(bx, bz);
        if (hill > L.y + 0.15) { if (rnd() < 0.8 && !onWay(bx, bz, 0.1)) clump(G, bx, hill, bz, rnd(0.2, 0.32), pick(KINDS)); }
        else if (L.y - hill > 0.6 && rnd() < 0.65) ivy(G, x + nx * 0.47, z + nz * 0.47, L.y + 0.45, Math.min(L.y - hill + 0.3, rnd(0.8, 2.4)), nx, nz, -nz, nx);
        const fx = x + nx * 1.1, fz = z + nz * 1.1, fy = terrainHeight(fx, fz);
        if (L.y - fy > 0.7 && rnd() < 0.6 && !onWay(fx, fz, 0.3)) shrub(G, fx, fy, fz, rnd(0.5, 0.85), pick(SHRUBS));
        const gx = x + nx * 2.2, gz = z + nz * 2.2, gy = terrainHeight(gx, gz);
        if (L.y - gy > 1.6 && rnd() < (lean ? 0.35 : 0.7) && !onWay(gx, gz, 0.3)) shrub(G, gx, gy, gz, rnd(0.55, 0.9), pick(SHRUBS));
      }
    }
  }
  // The hillside between and below the flights, planted: flowers and ferns all over it, thickest by the way.
  for (let x = WAY_BOX_IN.x0; x < WAY_BOX_IN.x1; x += 1.25) {
    for (let z = WAY_BOX_IN.z0; z < WAY_BOX_IN.z1; z += 1.25) {
      const px = x + rnd(-0.55, 0.55), pz = z + rnd(-0.55, 0.55), near = walkLine(px, pz);
      if (near > 7.5 || near < 2 || onWay(px, pz, 0.6) || rnd() > (0.8 - near * 0.06) * (lean ? 0.45 : 1)) continue;
      const y = terrainHeight(px, pz), e = 0.4, steep = Math.hypot(terrainHeight(px + e, pz) - terrainHeight(px - e, pz), terrainHeight(px, pz + e) - terrainHeight(px, pz - e)) / (2 * e);
      // (Shrubs where it's steep, to hold the bank and hide its bare rock; flowers between.)
      if (rnd() < (steep > 0.7 ? 0.8 : 0.45)) shrub(G, px, y, pz, rnd(0.4, 0.75), pick(SHRUBS));
      else clump(G, px, y, pz, rnd(0.22, 0.4), rnd() < 0.25 ? 'green' : pick(KINDS));
    }
  }

  lip(Lm);   // (the stones round the ledge's lip, which were always the steps' stone)
  return { lime: Lm.done(), wall: W.done(), wood: D.done(), garden: G.done(), iron: I.done(), glass: Q.done(), leaf: LEAF.done() };
}
