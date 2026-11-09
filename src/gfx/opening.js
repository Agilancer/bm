// Lisandra's cave, drawn: the rock and the face round its mouth, her clutter, the floating candles, the swirl round her and
// the portal, the rubble when it falls in, and the lights that go with each. Everything keys off the story's clock
// (src/core/opening.js), so a replay or a skip lands on the same picture.
import { accessor, parseGLB } from '../core/glb.js';
import { C, C_PROPS, C_SIZE, CHARS_START, H } from '../core/layout.js';
import { damp, lerp, mat4FromQT, quatAxisAngle, quatMul, quatYaw, smoothstep, wrapAngle } from '../core/math.js';
import {
  CANDLES, CANDLES_AT, CAVE_LINE, CAVE_MOUTH, CAVE_OUT, CHAMBER_LEN, CHAMBER_YAW, CIRCLE, CLUTTER, DUST_AT, OPENING, PORTAL,
  PORTAL_YAW, SNAP_AT, SWAP_AT, caveNearest, chamberPoint, chamberShape,
} from '../core/opening.js';
import { terrainHeight } from '../core/terrain.js';
import { routeDir } from '../core/escort.js';
import { groundAt } from '../core/interior.js';
import { boardPose } from '../items/drops.js';
import { makeBuffer } from './gpu.js';

const BOOK_ASSET = 'assets/game/lisandra/spellbook.glb';
const BOOK_SCALE = 0.95;
const SPINE = [-0.182, 0.24, -0.167];
const TEX = 'assets/game/interior/';
const MAX_GLOW = 420;   // quads of light a frame: candle flames, the swirl, the circle
const PARKED = [1e5, -1e4, 1e5];

// ---- little helpers --------------------------------------------------------------------------------------------------
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise2(x, y) {
  const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  return lerp(lerp(hash(i, j), hash(i + 1, j), u), lerp(hash(i, j + 1), hash(i + 1, j + 1), u), v);
}
// Rock's lumps, 0 to 1.
const lumps = (a, b) => noise2(a, b) * 0.55 + noise2(a * 2.3 + 5.1, b * 2.3) * 0.3 + noise2(a * 5.3, b * 5.3 + 9.7) * 0.15;
let seed = 11;
const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * seed / 2147483647; };

// A mesh being built: positions, normals, uv, triangles. done() winds every triangle to face the way its normals point (the
// item shader turns the normal round for a face seen from behind, so the winding has to agree with it).
class Geo {
  constructor() { this.p = []; this.n = []; this.t = []; this.i = []; }
  get count() { return this.p.length / 3; }
  v(p, n, u, w) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.t.push(u, w); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  // A grid of rows of [x, y, z, u, v, wx, wy, wz] (w: which way it should face), with smooth normals.
  grid(rows) {
    const R = rows.length, K = rows[0].length, base = this.count;
    for (let r = 0; r < R; r++) for (let c = 0; c < K; c++) {
      const q = rows[r][c], a = rows[r][Math.max(0, c - 1)], b = rows[r][Math.min(K - 1, c + 1)];
      const d = rows[Math.max(0, r - 1)][c], e = rows[Math.min(R - 1, r + 1)][c];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = e[0] - d[0], vy = e[1] - d[1], vz = e[2] - d[2];
      let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const l = Math.hypot(...n) || 1;
      n = n.map((x) => x / l);
      if (n[0] * q[5] + n[1] * q[6] + n[2] * q[7] < 0) n = n.map((x) => -x);
      this.v(q, n, q[3], q[4]);
    }
    for (let r = 0; r + 1 < R; r++) for (let c = 0; c + 1 < K; c++) { const a = base + r * K + c; this.quad(a, a + 1, a + K + 1, a + K); }
  }
  done() {
    const P = this.p, N = this.n, I = this.i;
    for (let k = 0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const ex = P[b] - P[a], ey = P[b + 1] - P[a + 1], ez = P[b + 2] - P[a + 2], fx = P[c] - P[a], fy = P[c + 1] - P[a + 1], fz = P[c + 2] - P[a + 2];
      const gx = ey * fz - ez * fy, gy = ez * fx - ex * fz, gz = ex * fy - ey * fx;
      if (gx * (N[a] + N[b] + N[c]) + gy * (N[a + 1] + N[b + 1] + N[c + 1]) + gz * (N[a + 2] + N[b + 2] + N[c + 2]) < 0) { const s = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = s; }
    }
    return { pos: new Float32Array(P), nrm: new Float32Array(N), uv: new Float32Array(this.t), idx: I };
  }
}

// A thing's own space (x across, y up, z ahead) to the world's: turned by pitch about x, then yaw about y, scaled by k.
function frame(x0, y0, z0, yaw = 0, pitch = 0, k = 1) {
  const c = Math.cos(yaw), s = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const R = (x, y, z) => { const y1 = y * cp - z * sp, z1 = y * sp + z * cp; return [x * c + z1 * s, y1, -x * s + z1 * c]; };
  return { R, P: (x, y, z) => { const r = R(x * k, y * k, z * k); return [x0 + r[0], y0 + r[1], z0 + r[2]]; } };
}

// A box from (x0, y0, z0) to (x1, y1, z1) in a frame; its uv in metres over `tile`.
function box(g, F, x0, y0, z0, x1, y1, z1, tile = 0.6, uv = null) {
  const faces = [
    [[1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]], [[-1, 0, 0], [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]]],
    [[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]], [[0, -1, 0], [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]]],
    [[0, 0, 1], [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]]], [[0, 0, -1], [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]],
  ];
  for (const [n, q] of faces) {
    const wn = F.R(...n);
    const ids = q.map((p, k) => {
      const a = n[0] ? p[2] : p[0], b = n[1] ? p[2] : p[1];
      return g.v(F.P(...p), wn, uv ? uv[0] : a / tile, uv ? uv[1] : b / tile);
    });
    g.quad(...ids);
  }
}

// Turned on a lathe about the frame's y: profile [[radius, y], ...], n sides, an optional bump(angle, y) on the radius.
function lathe(g, F, profile, n, tile = 0.6, bump = null, uv = null) {
  const base = g.count;
  for (let j = 0; j < profile.length; j++) {
    const [r, y] = profile[j], a = profile[Math.max(0, j - 1)], b = profile[Math.min(profile.length - 1, j + 1)];
    const dr = b[0] - a[0], dy = b[1] - a[1];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), rr = r * (1 + (bump ? bump(t, y) : 0));
      const nr = dy, ny = -dr, l = Math.hypot(nr, ny) || 1;
      g.v(F.P(c * rr, y, s * rr), F.R(c * nr / l, ny / l, s * nr / l), uv ? uv[0] : (i / n) * 2 * Math.PI * Math.max(r, 0.05) / tile, uv ? uv[1] : y / tile);
    }
  }
  for (let j = 0; j + 1 < profile.length; j++) for (let i = 0; i < n; i++) {
    const a = base + j * (n + 1) + i;
    g.quad(a, a + n + 1, a + n + 2, a + 1);
  }
}

// ---- the cave's rock --------------------------------------------------------------------------------------------------
const UP = [0, 1, 0];
const ARCH = 26;
// Stations along the line: a little out past the mouth too, so the rock reaches the hillside's edge.
const STATIONS = (() => {
  const p = CAVE_LINE[0], out = [];
  for (const back of [0.6, 0.3]) out.push([p[0] - p[2] * back, p[1] - p[3] * back, p[2], p[3], -back, p[5], p[6], p[7], -1]);
  return out.concat(CAVE_LINE);
})();
// A point on the arch at a station: k of ARCH round from the right-hand foot. The rock only ever bulges outward, so it stays
// clear of where you can walk (src/core/opening.js caveKeep).
function archPoint(st, k) {
  const [x, z, dx, dz, s, floor, w, h] = st;
  const th = (k / ARCH) * Math.PI, c = Math.cos(th), sn = Math.sin(th);
  let X = w * Math.sign(c) * Math.abs(c) ** 0.8, Y = h * sn ** 0.8 - 0.2 * (1 - sn);
  const rough = (0.1 + 0.05 * Math.min(w, 6)) * lumps(s * 0.75, th * 3.2) + (w > 3 ? 0.45 * noise2(s * 0.3, th * 1.4) : 0);
  const l = Math.hypot(X, Y + 0.2) || 1;
  X += X / l * rough; Y += (Y + 0.2) / l * rough;
  const sx = dz, sz = -dx;
  return [x + sx * X, floor + Y, z + sz * X, th, X, Y];
}

// A point on the face round the mouth: k round the arch, t from the arch's edge (0) out over the hillside (1).
function facePoint(k, t) {
  const m = STATIONS[0], inX = m[2], inZ = m[3], sx = m[3], sz = -m[2];
  const [, , , th, X0, Y0] = archPoint(m, k);
  const lump = lumps(k * 0.37 + 3, t * 3.1) * t;
  const X = X0 * (1 + 1.5 * t) + Math.sign(X0 || 1) * (0.25 * t + 0.35 * lump);
  const Y = (Y0 + 0.2) * (1 + 0.75 * t) - 0.2 + 0.35 * t + 0.3 * lump * Math.sin(th);
  const D = m[4] + 3.4 * t * t;
  const px = CAVE_MOUTH[0] + inX * D + sx * X, pz = CAVE_MOUTH[1] + inZ * D + sz * X;
  const ground = terrainHeight(px, pz);
  let y = m[5] + Y;
  y = lerp(y, Math.max(y, ground + 0.22 + 0.25 * lump), smoothstep(0.05, 0.35, t));
  y = lerp(y, ground - 0.6, smoothstep(0.72, 1, t));
  return [px, y, pz, CAVE_MOUTH[0] + inX * D, CAVE_MOUTH[1] + inZ * D];
}

// One rough boulder: a jittered, squashed icosahedron split once (80 faces), shaded mostly smooth with a little of each
// face's own plane left in, so it reads as weathered stone rather than a cut gem. flat squashes it into a slab.
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => { const l = Math.hypot(...p); return p.map((x) => x / l); });
  const base = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const mids = new Map();
  const mid = (a, b) => {
    const key = a < b ? a * 64 + b : b * 64 + a;
    if (!mids.has(key)) { const p = v[a].map((x, i) => x + v[b][i]), l = Math.hypot(...p); v.push(p.map((x) => x / l)); mids.set(key, v.length - 1); }
    return mids.get(key);
  };
  const f = [];
  for (const [a, b, c] of base) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); f.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
  return { v, f };
})();
function boulder(g, px, py, pz, size, uvK = 0.9, flat = 1) {
  const sq = [size * rnd(0.8, 1.3), size * rnd(0.55, 0.9) * flat, size * rnd(0.8, 1.2)], yaw = rnd(0, 6.3);
  const F = frame(px, py, pz, yaw, rnd(-0.4, 0.4));
  const jit = ICO.v.map(() => rnd(0.84, 1.12));
  const pts = ICO.v.map((p, i) => F.P(p[0] * sq[0] * jit[i], p[1] * sq[1] * jit[i], p[2] * sq[2] * jit[i]));
  // The smooth normal: the squashed sphere's, turned into the world.
  const smooth = ICO.v.map((p) => { const n = F.R(p[0] / sq[0], p[1] / sq[1], p[2] / sq[2]), l = Math.hypot(...n) || 1; return n.map((x) => x / l); });
  for (const [a, b, c] of ICO.f) {
    const A = pts[a], B = pts[b], Cc = pts[c];
    const e = B.map((x, i) => x - A[i]), f = Cc.map((x, i) => x - A[i]);
    let n = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]];
    const l = Math.hypot(...n) || 1; n = n.map((x) => x / l);
    const mid = [(A[0] + B[0] + Cc[0]) / 3 - px, (A[1] + B[1] + Cc[1]) / 3 - py, (A[2] + B[2] + Cc[2]) / 3 - pz];
    if (n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2] < 0) n = n.map((x) => -x);
    // Each face takes the texture flat along its own main axis, so steep faces aren't streaked.
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    const uvs = [A, B, Cc].map((p) => (ay >= ax && ay >= az ? [p[0], p[2]] : ax >= az ? [p[2], p[1]] : [p[0], p[1]]).map((v) => v * uvK));
    const nv = (k) => { const m = smooth[k].map((x, i) => x * 0.7 + n[i] * 0.3), ml = Math.hypot(...m) || 1; return m.map((x) => x / ml); };
    g.tri(g.v(A, nv(a), ...uvs[0]), g.v(B, nv(b), ...uvs[1]), g.v(Cc, nv(c), ...uvs[2]));
  }
}

function caveRock() {
  const g = new Geo();
  // The tunnel and the chamber: one swept arch.
  // Its texture runs by the true distance round each ring (the arch's points aren't evenly spaced, and the rock bulges)
  // and the true distance along the wall from ring to ring (where the chamber widens, a step down the cave is a long
  // stretch of wall), so the stone keeps its proportions everywhere instead of smearing into streaks.
  let prev = null;
  const along = new Float64Array(ARCH + 1);
  const rows = STATIONS.map((st) => {
    let round = 0, last = null;
    const row = Array.from({ length: ARCH + 1 }, (_, k) => {
      const p = archPoint(st, k);
      if (last) round += Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]);
      if (prev) along[k] += Math.hypot(p[0] - prev[k][0], p[1] - prev[k][1], p[2] - prev[k][2]);
      last = p;
      return [p[0], p[1], p[2], round / 2.2, along[k] / 2.2, st[0] - p[0], st[5] + st[7] * 0.45 - p[1], st[1] - p[2]];
    });
    prev = row;
    return row;
  });
  g.grid(rows);
  // The chamber's end: closed off just past the last ring.
  const last = STATIONS.at(-1), apex = [last[0] + last[2] * 0.7, last[5] + last[7] * 0.45, last[1] + last[3] * 0.7];
  const inward = [-last[2], 0, -last[3]];
  const top = g.v(apex, inward, 0, 0);
  const ring = Array.from({ length: ARCH + 1 }, (_, k) => { const p = archPoint(last, k); return g.v(p, inward, k / ARCH * 3, 1); });
  const foot = g.v([last[0], last[5] - 0.2, last[1]], inward, 1.5, 1.4);
  for (let k = 0; k < ARCH; k++) g.tri(top, ring[k], ring[k + 1]);
  g.tri(foot, ring[ARCH], ring[0]);
  // The face round the mouth: from the first ring out over the hillside, lying on it, and down into it at the edge.
  const m = STATIONS[0], inX = m[2], inZ = m[3];
  const R = 10, face = [];
  for (let r = 0; r <= R; r++) {
    const t = r / R, row = [];
    for (let k = 0; k <= ARCH; k++) {
      const [px, y, pz, cx, cz] = facePoint(k, t);
      row.push([px, y, pz, k / ARCH * 4.2, t * 2.4, px - cx - inX * 0.8, y - (m[5] + 1.0), pz - cz - inZ * 0.8]);
    }
    face.push(row);
  }
  g.grid(face);
  // Boulders: a broken crown round the arch, big ones at its feet, more strewn up the face, so the mouth is a split in
  // the hill and not a pipe out of it. All outside the arch, clear of the way in.
  seed = 71;
  for (let i = 0; i <= 13; i++) {
    const k = (i / 13) * ARCH, foot = Math.min(i, 13 - i) < 2;
    const size = foot ? rnd(0.7, 1.05) : rnd(0.35, 0.7);
    const [px, y, pz] = facePoint(k, foot ? rnd(0.2, 0.3) : rnd(0.16, 0.3));
    boulder(g, px, foot ? Math.max(y, terrainHeight(px, pz)) - size * 0.25 : y + size * 0.15, pz, size, 1.3);
  }
  for (let i = 0; i < 12; i++) {
    const t = rnd(0.35, 0.8), k = rnd(1, ARCH - 1);
    const [px, y, pz] = facePoint(k, t);
    boulder(g, px, y, pz, rnd(0.3, 0.7), 1.3);
  }
  // In the chamber: masses of rock standing out of the walls, slabs fallen at their feet, and the roof hanging lower in
  // places, so it's a hollow in the hill and not a smooth barrel. Each sits mostly in the rock, bulging a little way in.
  seed = 131;
  const room = STATIONS.filter((st) => st[8] >= 2.5 && st[8] <= CHAMBER_LEN - 1.4);
  const mass = (k, size, push, flat = 1) => {
    const st = room[Math.floor(rnd(0, room.length))];
    const [, , , , X, Y] = archPoint(st, k);
    const l = Math.hypot(X, Y + 0.2) || 1, ox = X / l, oy = (Y + 0.2) / l;
    const sx = st[3], sz = -st[2], d = size * push;
    boulder(g, st[0] + sx * (X + ox * d), st[5] + Y + oy * d, st[1] + sz * (X + ox * d), size, 1.1, flat);
  };
  for (let i = 0; i < 26; i++) mass(rnd() < 0.5 ? rnd(1.2, 6) : ARCH - rnd(1.2, 6), rnd(0.6, 1.3), 0.62);
  for (let i = 0; i < 10; i++) mass(rnd(8.5, 17.5), rnd(0.9, 1.8), 0.5);
  for (let i = 0; i < 8; i++) mass(rnd() < 0.5 ? rnd(0.15, 0.6) : ARCH - rnd(0.15, 0.6), rnd(0.6, 1.0), 0.45, 0.4);
  return g.done();
}

// The floor: flat where you walk, and out over the ledge, sinking into it.
function caveFloor() {
  const g = new Geo(), W = 8;
  const m = STATIONS[0];
  const apron = [-1.3, -0.95].map((b) => [m[0] + m[2] * (b - m[4]), m[1] + m[3] * (b - m[4]), m[2], m[3], b, m[5], m[6] + 0.6 * (-0.6 - b) / 0.7, m[7], -1]);
  const rows = apron.concat(STATIONS).map((st) => Array.from({ length: W + 1 }, (_, j) => {
    const q = (j / W * 2 - 1) * (st[6] + 0.12), x = st[0] + st[3] * q, z = st[1] - st[2] * q;
    let y = st[5] + 0.006 * (noise2(x * 3, z * 3) - 0.5);
    if (st[4] < -0.3) y = lerp(y, terrainHeight(x, z) - 0.1, smoothstep(-0.45, -1.3, st[4]));
    return [x, y, z, x / 2, z / 2, 0, 1, 0];
  }));
  g.grid(rows);
  return g.done();
}

// The rubble that fills the mouth when it comes down, right up to the lintel and out in the sun, and spills down over the
// ledge: big at the bottom, boulders rolled clear, stones scattered. (Her way out, down the middle, is left clear.)
function caveRubble() {
  const g = new Geo();
  const m = STATIONS[0], inX = m[2], inZ = m[3], sx = m[3], sz = -m[2];
  const rock = (D, X, Y, size, flat = 1) => boulder(g, CAVE_MOUTH[0] + inX * D + sx * X, m[5] + Y, CAVE_MOUTH[1] + inZ * D + sz * X, size, 0.9, flat);
  seed = 23;
  const w = m[6], h = m[7];
  for (let k = 0; k < 7; k++) for (let j = 0; j < 6; j++) rock(0.45 + rnd(-0.2, 0.25), (j / 5 * 2 - 1) * (w + 0.1), 0.25 + k * (h + 0.1) / 6, rnd(0.5, 0.75));
  for (let k = 0; k < 6; k++) {
    const n = 8 - k;
    for (let j = 0; j < n; j++) {
      const across = (j / Math.max(1, n - 1) * 2 - 1) * (w + 0.5) * (1 - k * 0.1);
      rock(-0.2 - (5 - k) * 0.28 + rnd(-0.25, 0.25), across + rnd(-0.15, 0.15), k * 0.5 + rnd(0, 0.2), rnd(0.4, 0.75) * (1.15 - k * 0.06));
    }
  }
  const aside = () => (rnd() < 0.5 ? -1 : 1) * rnd(1.0, w + 0.8);
  for (let j = 0; j < 5; j++) rock(-rnd(1.6, 2.6), aside(), 0.15, rnd(0.35, 0.6));
  for (let j = 0; j < 16; j++) rock(-rnd(0.8, 3.0), rnd(-w - 1.4, w + 1.4), 0.02, rnd(0.1, 0.3), 0.7);
  return g.done();
}

// ---- her clutter ------------------------------------------------------------------------------------------------------
const BOOK_COLOURS = [[94, 30, 26], [38, 52, 40], [60, 40, 24], [34, 30, 52], [112, 84, 42], [70, 22, 44], [40, 36, 32], [86, 58, 34]];
function bookUV(i) { return [(0.5 + 0.5 * ((i % 8) + 0.5) / 8), 0.94]; }

function clutter() {
  const wood = new Geo(), iron = new Geo(), cloth = new Geo(), burlap = new Geo(), paper = new Geo(), wax = new Geo();
  seed = 41;
  const floorAt = (s) => chamberShape(s)[2];
  const books = (F, n, y0 = 0) => {
    let y = y0;
    for (let i = 0; i < n; i++) {
      const hx = rnd(0.1, 0.15), hz = rnd(0.14, 0.2), hy = rnd(0.018, 0.035), turn = rnd(-0.35, 0.35);
      const G = frame(...F.P(0, y, 0), F.yaw + turn);
      box(paper, G, -hx, 0, -hz, hx, hy * 2, hz, 1, bookUV(Math.floor(rnd(0, 8))));
      y += hy * 2;
    }
  };
  for (const [kind, s, q, turn, k, on] of CLUTTER) {
    const [x, z] = chamberPoint(s, q), yaw = turn + CHAMBER_YAW, y = floorAt(s) + (on ?? 0);
    const F = frame(x, y, z, yaw, 0, k);
    F.yaw = yaw;
    if (kind === 'crate') {
      box(wood, F, -0.3, 0, -0.3, 0.3, 0.62, 0.3, 0.5);
      // Its frame: the edges standing a little proud.
      const e = 0.045, o = 0.32;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(wood, F, a * o - e, 0, b * o - e, a * o + e, 0.64, b * o + e, 0.25);
      for (const yy of [0, 0.6]) for (const a of [-1, 1]) {
        box(wood, F, -o, yy, a * o - e, o, yy + 0.04, a * o + e, 0.25);
        box(wood, F, a * o - e, yy, -o, a * o + e, yy + 0.04, o, 0.25);
      }
    } else if (kind === 'barrel') {
      const r = (yy) => 0.26 + 0.045 * Math.sin(Math.PI * yy / 0.85);
      lathe(wood, F, [0, 0.1, 0.2, 0.32, 0.45, 0.58, 0.7, 0.8, 0.85].map((yy) => [r(yy), yy]).concat([[0.2, 0.84], [0, 0.83]]), 14, 0.5);
      for (const yy of [0.1, 0.42, 0.74]) lathe(iron, F, [[r(yy) + 0.008, yy - 0.025], [r(yy) + 0.012, yy], [r(yy) + 0.008, yy + 0.025]], 14, 0.3);
    } else if (kind === 'table') {
      box(wood, F, -0.75, 0.76, -0.42, 0.75, 0.82, 0.42, 0.7);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(wood, F, a * 0.66 - 0.04, 0, b * 0.33 - 0.04, a * 0.66 + 0.04, 0.76, b * 0.33 + 0.04, 0.4);
      box(cloth, F, -0.2, 0.82, -0.43, 0.2, 0.826, 0.43, 0.5);
      books(frame(...F.P(-0.45, 0.82, 0.1), yaw), 4);
      books(frame(...F.P(0.42, 0.82, -0.12), yaw + 1.2), 2);
      lathe(iron, frame(...F.P(0.1, 0.826, 0.18), yaw), [[0, 0], [0.07, 0.005], [0.09, 0.05], [0.085, 0.07], [0.07, 0.03]], 10, 0.2);
    } else if (kind === 'chest') {
      box(wood, F, -0.42, 0, -0.28, 0.42, 0.36, 0.28, 0.5);
      // The vaulted lid.
      const base = wood.count, N = 8;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI, cz = Math.cos(a) * 0.28, cy = 0.36 + Math.sin(a) * 0.17;
        const n = F.R(0, Math.sin(a), Math.cos(a));
        wood.v(F.P(-0.42, cy, cz), n, 0, i * 0.12); wood.v(F.P(0.42, cy, cz), n, 1.4, i * 0.12);
      }
      for (let i = 0; i < N; i++) wood.quad(base + i * 2, base + i * 2 + 1, base + i * 2 + 3, base + i * 2 + 2);
      for (const sx of [-1, 1]) {
        const c = wood.v(F.P(sx * 0.42, 0.42, 0), F.R(sx, 0, 0), 0.5, 0.5);
        const ring = Array.from({ length: N + 1 }, (_, i) => { const a = (i / N) * Math.PI; return wood.v(F.P(sx * 0.42, 0.36 + Math.sin(a) * 0.17, Math.cos(a) * 0.28), F.R(sx, 0, 0), Math.cos(a), Math.sin(a)); });
        for (let i = 0; i < N; i++) wood.tri(c, ring[i], ring[i + 1]);
      }
      for (const bx of [-0.27, 0.27]) box(iron, F, bx - 0.03, -0.005, -0.29, bx + 0.03, 0.37, 0.29, 0.3);
      box(iron, F, -0.06, 0.24, 0.28, 0.06, 0.36, 0.3, 0.2);
    } else if (kind === 'books') {
      books(F, 5);
      books(frame(...F.P(0.32, 0, 0.12), yaw + 0.9), 3);
    } else if (kind === 'bedroll') {
      box(cloth, F, -0.45, 0, -0.75, 0.45, 0.05, 0.85, 0.6);
      const G = frame(...F.P(-0.47, 0.16, -0.86), yaw);
      const roll = { R: (a, b, c) => G.R(b, a, c), P: (a, b, c) => G.P(b, a, c) };
      lathe(cloth, roll, [[0, 0], [0.15, 0.01], [0.16, 0.06], [0.16, 0.88], [0.15, 0.93], [0, 0.94]], 12, 0.5);
    } else if (kind === 'cauldron') {
      lathe(iron, frame(x, y + 0.08, z, yaw, 0, k), [[0, 0], [0.26, 0.03], [0.38, 0.16], [0.42, 0.32], [0.37, 0.48], [0.4, 0.5], [0.4, 0.53], [0.35, 0.52], [0.32, 0.4], [0.3, 0.43]], 16, 0.4);
      for (let i = 0; i < 3; i++) { const a = i * 2.09; box(iron, frame(...F.P(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24), yaw + a), -0.03, 0, -0.03, 0.03, 0.14, 0.03, 0.2); }
    } else if (kind === 'lectern') {
      box(wood, F, -0.24, 0, -0.2, 0.24, 0.05, 0.2, 0.5);
      box(wood, F, -0.05, 0.05, -0.05, 0.05, 0.98, 0.05, 0.5);
      const T = frame(...F.P(0, 1.02, 0), yaw, -0.42, k);
      box(wood, T, -0.3, -0.03, -0.22, 0.3, 0.0, 0.22, 0.5);
      box(wood, T, -0.3, 0.0, -0.24, 0.3, 0.035, -0.21, 0.3);
      // The ledger, open: two leaves of names (drawn on the paper's top half).
      for (const side of [-1, 1]) {
        const base = paper.count, n = T.R(0, 1, 0);
        const pts = [[0, 0.004, -0.17], [side * 0.27, 0.018, -0.17], [side * 0.27, 0.018, 0.17], [0, 0.004, 0.17]];
        const us = side < 0 ? [0.25, 0, 0, 0.25] : [0.25, 0.5, 0.5, 0.25];
        pts.forEach((p, i) => paper.v(T.P(p[0], p[1] + 0.012 * Math.sin(Math.abs(p[0]) / 0.27 * Math.PI), p[2]), n, us[i], i < 2 ? 0.86 : 0.0));
        paper.quad(base, base + 1, base + 2, base + 3);
      }
    } else if (kind === 'sack') {
      lathe(burlap, F, [[0, 0], [0.2, 0.01], [0.26, 0.12], [0.25, 0.3], [0.17, 0.43], [0.07, 0.5], [0.09, 0.55], [0.05, 0.58], [0, 0.58]], 12, 0.4,
        (a, yy) => 0.12 * (noise2(a * 1.3 + x, yy * 6) - 0.5));
    }
  }
  // The candles' wax: each where it floats, and the three on the tunnel's ledges.
  for (const c of CANDLES) {
    const r = c.ledge ? 0.03 : 0.022 + c.tall * 0.04;
    const F = frame(c.x, c.y, c.z, c.phase);
    lathe(wax, F, [[0, 0], [r, 0], [r * 1.04, c.tall * 0.4], [r, c.tall], [r * 0.7, c.tall + 0.008], [0, c.tall + 0.004]], 8, 0.2,
      (a, yy) => (yy < c.tall * 0.9 ? 0.15 * Math.max(0, Math.sin(a * 3 + c.phase)) * (1 - yy / c.tall) : 0));
  }
  return { wood: wood.done(), iron: iron.done(), cloth: cloth.done(), burlap: burlap.done(), paper: paper.done(), wax: wax.done() };
}

// The paper: the ledger's two leaves above (a column of names, all but the last struck through), book cloth below.
async function paperTexture() {
  const W = 512, Hh = 512;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d');
  g.fillStyle = '#d8c7a0'; g.fillRect(0, 0, W, Hh);
  seed = 5;
  for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(${90 + rnd(0, 40)},${70 + rnd(0, 30)},${40},${rnd(0.02, 0.08)})`; g.fillRect(rnd(0, W), rnd(0, Hh * 0.88), rnd(1, 6), rnd(1, 6)); }
  // Two leaves side by side across the top 86%, the gutter darkened.
  const top = 0, bottom = Hh * 0.86;
  const grd = g.createLinearGradient(W * 0.5 - 30, 0, W * 0.5 + 30, 0);
  grd.addColorStop(0, 'rgba(70,50,20,0)'); grd.addColorStop(0.5, 'rgba(70,50,20,0.35)'); grd.addColorStop(1, 'rgba(70,50,20,0)');
  g.fillStyle = grd; g.fillRect(W * 0.5 - 30, top, 60, bottom);
  // (Only loops: the hand is no alphabet anyone reads, and nothing in it is a mark of his.)
  const hand = (x0, y0, len, ink) => {
    g.strokeStyle = ink; g.lineWidth = 1.6; g.beginPath();
    let x = x0;
    g.moveTo(x, y0);
    while (x < x0 + len) {
      const w = rnd(3, 6), hgt = rnd(4, 8);
      g.bezierCurveTo(x + w * 0.2, y0 - hgt, x + w * 0.9, y0 - hgt, x + w * 0.6, y0 - 1);
      g.bezierCurveTo(x + w * 0.4, y0 + 1.5, x + w, y0 + 1, x + w * 1.2, y0);
      x += w * 1.2;
      if (rnd() < 0.12) { x += rnd(5, 9); g.moveTo(x, y0); }
    }
    g.stroke();
  };
  for (const [x0, x1] of [[26, W * 0.5 - 22], [W * 0.5 + 22, W - 26]]) {
    for (let y = 34, row = 0; y < bottom - 22; y += 19, row++) {
      const last = x0 > W * 0.4 && y + 19 >= bottom - 22;
      const len = rnd(0.45, 0.85) * (x1 - x0);
      hand(x0, y, len, last ? 'rgba(60,30,90,0.95)' : 'rgba(40,28,18,0.85)');
      if (!last) {
        g.strokeStyle = 'rgba(120,20,16,0.8)'; g.lineWidth = 1.4; g.beginPath();
        g.moveTo(x0 - 4, y - 2 + rnd(-1, 1)); g.lineTo(x0 + len + 4, y - 3 + rnd(-1, 1)); g.stroke();
      }
    }
  }
  // Book cloth: eight colours along the bottom strip's right half.
  for (let i = 0; i < 8; i++) {
    const [r, gg, b] = BOOK_COLOURS[i];
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(W * 0.5 + i * W / 16, Hh * 0.88, W / 16, Hh * 0.12);
  }
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}

// ---- the spellbook ---------------------------------------------------------------------------------------------------
function part(indices, positions, normals, uv, select, origin) {
  const remap = new Map(), pos = [], nrm = [], tex = [], idx = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    if (!select((positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3)) continue;
    for (const v of [a, b, c]) {
      if (!remap.has(v)) {
        remap.set(v, pos.length / 3);
        for (let axis = 0; axis < 3; axis++) { pos.push(positions[v * 3 + axis] - origin[axis]); nrm.push(normals[v * 3 + axis]); }
        tex.push(uv[v * 2], uv[v * 2 + 1]);
      }
      idx.push(remap.get(v));
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(tex), idx };
}

const HER_BOARD = 'kite_tree';
const item = (model, noShadow = true) => ({ openingModel: model, mat: new Float32Array(16), noShadow });

async function loadBook(renderer, base) {
  const response = await fetch(base + BOOK_ASSET);
  if (!response.ok) throw new Error(`${BOOK_ASSET}: ${response.status}`);
  const glb = parseGLB(await response.arrayBuffer());
  const pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
  const geo = [accessor(glb, pr.indices), accessor(glb, a.POSITION), accessor(glb, a.NORMAL), accessor(glb, a.TEXCOORD_0)];
  const mat = glb.json.materials[pr.material], pbr = mat.pbrMetallicRoughness;
  const src = (texture) => glb.json.textures[texture.index].source;
  const texScale = renderer.tier.texScale;
  const [alb, nrm, mr] = await Promise.all([
    renderer.imageTexture(glb, src(pbr.baseColorTexture), 'rgba8unorm-srgb', texScale),
    renderer.imageTexture(glb, src(mat.normalTexture), 'rgba8unorm', texScale),
    renderer.imageTexture(glb, src(pbr.metallicRoughnessTexture), 'rgba8unorm', texScale),
  ]);
  const model = (select, origin) => item(renderer.lyingModel(part(...geo, select, origin), alb, nrm, mr, [0.025, 0.010, 0.045, 0.7]), false);
  // The source holds two poses of the book in one mesh: the open one's leaves turn on the spine, the shut one's its cover.
  return {
    left: model((x) => x < SPINE[0], SPINE),
    right: model((x) => x >= SPINE[0] && x < 0.13, SPINE),
    closed: model((x) => x >= 0.13, [0.32, 0.24, 0.045]),
  };
}

const PORTAL_MESH = {
  pos: new Float32Array([-1.29, -1.65, 0, 1.29, -1.65, 0, 1.29, 1.65, 0, -1.29, 1.65, 0]),
  nrm: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]),
  uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), idx: [0, 1, 2, 0, 2, 3],
};

// ---- loading ------------------------------------------------------------------------------------------------------------
export async function loadOpeningStage(renderer, base) {
  const scale = renderer.tier.texScale;
  const tex = async (name, srgb) => renderer.bitmapTexture(await fetch(base + TEX + name + '.webp').then((r) => r.blob()), srgb ? 'rgba8unorm-srgb' : 'rgba8unorm', scale);
  const flat = renderer.flatNormal || (renderer.flatNormal = renderer.pixel('rgba8unorm', [128, 128, 255, 255]));
  const rough = (r, m = 0) => renderer.pixel('rgba8unorm', [255, r, m, 255]);
  const [rockC, rockD, earthC, earthD, rubbleC, rubbleD, woodC, woodD, clothC, clothD, paperC] = await Promise.all([
    tex('wall_rough_c', true), tex('wall_rough_d'), tex('cata_earth_c', true), tex('cata_earth_d'), tex('cata_rubble_c', true), tex('cata_rubble_d'),
    tex('wood_b1_c', true), tex('wood_b1_d'), tex('cloth_red_c', true), tex('cloth_red_d'),
    paperTexture().then((b) => renderer.bitmapTexture(b, 'rgba8unorm-srgb', 1)),
  ]);
  const props = clutter();
  const model = (prim, alb, nrm, mr, glow = [0, 0, 0, 0]) => renderer.lyingModel(prim, alb, nrm, mr, glow);
  const stage = new OpeningStage(renderer, {
    rock: item(model(caveRock(), rockC, rockD, rough(238)), false),
    floor: item(model(caveFloor(), earthC, earthD, rough(245))),
    rubble: item(model(caveRubble(), rubbleC, rubbleD, rough(240)), false),
    wood: item(model(props.wood, woodC, woodD, rough(200))),
    iron: item(model(props.iron, renderer.pixel('rgba8unorm-srgb', [46, 42, 40, 255]), flat, rough(125, 190))),
    cloth: item(model(props.cloth, clothC, clothD, rough(240))),
    burlap: item(model(props.burlap, renderer.pixel('rgba8unorm-srgb', [124, 98, 66, 255]), clothD, rough(250))),
    paper: item(model(props.paper, paperC, flat, rough(215))),
    wax: item(model(props.wax, renderer.pixel('rgba8unorm-srgb', [226, 210, 178, 255]), flat, rough(150), [0.05, 0.03, 0.01, 0.5])),
    portal: item(model(PORTAL_MESH, rockC, flat, rough(200), [0, 0, 0, -1])),
  }, await loadBook(renderer, base));
  return stage;
}

// ---- each frame -------------------------------------------------------------------------------------------------------
// The floating candles, gathered into a few lights between them (one light each would be far too many).
function candleGroups() {
  const groups = [];
  const room = CANDLES.filter((c) => !c.ledge);
  const along = (c) => (c.x - CAVE_LINE.at(-1)[0]) * -CAVE_LINE.at(-1)[2] + (c.z - CAVE_LINE.at(-1)[1]) * -CAVE_LINE.at(-1)[3];
  room.sort((a, b) => along(a) - along(b));
  const N = 7, per = Math.ceil(room.length / N);
  for (let i = 0; i < room.length; i += per) groups.push(room.slice(i, i + per));
  for (const c of CANDLES.filter((c) => c.ledge)) groups.push([c]);
  return groups;
}

class OpeningStage {
  constructor(r, items, book) {
    this.r = r;
    Object.assign(this, items);
    this.book = book;
    for (const k of ['rock', 'floor', 'rubble', 'wood', 'iron', 'cloth', 'burlap', 'paper', 'wax']) mat4FromQT(this[k].mat, [0, 0, 0, 1], 0, [0, 0, 0], 0);
    this.position = new Float32Array(3); this.heading = new Float32Array(4); this.tilt = new Float32Array(4);
    this.hinge = new Float32Array(4); this.rotation = new Float32Array(4); this.q = new Float32Array(4);
    this.yaw = 0; this.last = null;
    // The shield she rides down the road when you ride yours: an old tree on green, nobody's colours (never a V or a T).
    this.herBoard = { sword: HER_BOARD, mat: new Float32Array(16), slot: -1, model: null };
    r.sword(HER_BOARD);   // (Loaded now, so it's there the moment she jumps on.)
    // The lights: the portal, the book, her glamour (a key and a rim), the candles, the cauldron.
    const L = (c, r, i, flicker) => ({ p: [...PARKED], r, c, i, flicker });
    this.lights = {
      portal: L([0.5, 0.13, 1], 8, 0, 0.65), book: L([0.55, 0.22, 1], 3.2, 0, 0.4),
      key: L([1, 0.78, 0.46], 4.5, 0, 0.1), rim: L([1, 0.86, 0.62], 4, 0, 0.1),
      fill: L([0.6, 0.45, 1], 5.5, 0, 0.2),
    };
    this.groups = candleGroups().map((list) => {
      const n = list.length, c = [0, 0, 0];
      for (const k of list) { c[0] += k.x / n; c[1] += k.y / n; c[2] += k.z / n; }
      return { list, c, light: L([1, 0.6, 0.28], list[0].ledge ? 3.6 : 8, 0, 0.45) };
    });
    r.lights.push(...Object.values(this.lights), ...this.groups.map((g) => g.light));
    // Light quads, written each frame and drawn added over the world (src/gfx/interior.js's glow pipeline).
    this.glow = new Float32Array(MAX_GLOW * 6 * 9);
    this.glowVB = makeBuffer(r.device, this.glow, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    this.glowN = 0;
    seed = 77;
    this.motes = Array.from({ length: 40 }, (_, i) => ({ r: rnd(0.3, 1.5), y: rnd(0.2, 2.2), a: rnd(0, 6.3), w: rnd(0.5, 1.5), s: rnd(0.04, 0.11), gold: i % 4 === 0 }));
  }

  // The story's moment, as the pieces need it: how far the portal has died, how many candles burn, the cave's own light.
  moment(stage, t) {
    const m = { portal: 1, swirl: 0, kick: 0, candles: -1, out: 1e9, glamour: 0, circle: 0, rubble: false, inside: stage < OPENING.ESCORT };
    if (stage === OPENING.WAKE) {
      m.swirl = t < SNAP_AT ? smoothstep(0, 1.5, t) : 1 - smoothstep(SNAP_AT, SNAP_AT + 0.45, t);
      m.kick = smoothstep(SNAP_AT, SNAP_AT + 0.45, t);
      // (A first gold blur of her even on the first try.)
      m.glamour = t < SWAP_AT ? 0.35 * smoothstep(2.6, 3.6, t) + 0.65 * smoothstep(4, 6.5, t) : 0;
      m.flash = Math.max(0, 1 - Math.abs(t - SWAP_AT) / 0.25);
      m.candles = t;
      m.circle = 1;
    } else if (stage <= OPENING.LEAVE) {
      m.candles = 99; m.circle = 0.75;
      // It hitches as you go: the door she's holding open slipping.
      if (stage === OPENING.LEAVE) m.portal = 1 + 0.08 * Math.sin(t * 31) * Math.max(0, Math.sin(t * 1.7)) ** 6;
    } else if (stage === OPENING.COLLAPSE) {
      m.candles = 99;
      m.portal = 1 - smoothstep(2.6, 4.1, t) ** 0.7;
      m.flash = t > 4.0 && t < 4.3 ? 1 - (t - 4.0) / 0.3 : 0;
      m.out = 3.0;   // the candles gutter out from here
      m.circle = 0.75 * (1 - smoothstep(2.6, 3.6, t));
      m.time = t;
      // The rocks come down once she is clear of the heap (she leaves the mouth at 6 m/s as the dust goes up): the roof
      // slumping into the mouth and spilling out of it over a third of a second, and the cave's lights out once it's shut.
      // (Down and out from inside the mouth, never straight down: a heap dropped from above would sweep through where she
      // stands in front of it.)
      m.rubble = t >= DUST_AT + 0.3;
      const fall = Math.min(1, Math.max(0, (t - DUST_AT - 0.3) / 0.32));
      m.drop = 1 - fall * fall;
      m.inside = t < DUST_AT + 0.65;
    } else m.rubble = true;
    return m;
  }

  // How lit a candle is: caught at its moment with a flare, and out (in the collapse) at its own.
  candleLit(c, m) {
    if (m.candles < c.at) return 0;
    let k = Math.min(1, (m.candles - c.at) / 0.12);
    if (m.time !== undefined) k *= 1 - smoothstep(m.out + c.phase * 0.2, m.out + 0.15 + c.phase * 0.2, m.time);
    return k;
  }

  append(items, snap, dt, cam) {
    const stage = snap[H.OPENING];
    const r = this.r;
    this.glowN = 0;
    r.inCave = false;
    if (!stage) { this.park(); r.caveAmb = null; return; }
    const t = snap[H.OPENING_TIME], time = snap[H.TIME];
    const m = this.moment(stage, t);
    items.push(this.rock, this.floor);
    if (m.rubble) {
      const k = m.drop || 0;
      mat4FromQT(this.rubble.mat, [0, 0, 0, 1], 0, [-CAVE_OUT[0] * 1.8 * k, 0.6 * k, -CAVE_OUT[1] * 1.8 * k], 0);
      items.push(this.rubble);
    }
    if (m.inside) items.push(this.wood, this.iron, this.cloth, this.burlap, this.paper, this.wax);
    if (cam) {
      const n = caveNearest(cam.x, cam.z);
      r.inCave = n.s > 0.3 && Math.abs(n.d) < n.w + 1 && cam.y < n.floor + n.h + 1;
    }
    const witch = CHARS_START + (snap[H.NCHARS] - 1) * C_SIZE;
    const wx = snap[witch + C.X], wy = snap[witch + C.Y], wz = snap[witch + C.Z], wyaw = snap[witch + C.YAW];
    this.placeBook(items, stage, t, time, dt, wx, wy, wz, wyaw, snap.subarray(witch + C_PROPS, witch + C_PROPS + 3));
    // (Its point down the road, flat on the ground's slope under her boots: src/sim/opening.js rides her on it.)
    if (stage === OPENING.ESCORT && snap[H.OPENING_RIDE] > 0.5) {
      const [hx, hz] = routeDir(snap[H.OPENING_NEXT]);
      boardPose(this.herBoard.mat, wx, groundAt(wx, wz), wz, hx, hz, true);
      items.push(this.herBoard);
    }
    // The cave's own light, for the shader (src/gfx/shaders.js caveAt): violet before the candles, warm after, dark after.
    const lit = stage === OPENING.WAKE ? smoothstep(CANDLES_AT, CANDLES_AT + 1.4, t) : 1;
    const dark = stage === OPENING.COLLAPSE ? smoothstep(3.0, 4.4, t) : stage > OPENING.COLLAPSE ? 1 : 0;
    const boost = r.tier.lean ? 1.7 : 1;
    const amb = [lerp(0.011, 0.13, lit), lerp(0.006, 0.084, lit), lerp(0.02, 0.046, lit)].map((v) => lerp(v, 0.008, dark) * boost);
    r.caveAmb = [...amb, 1];
    if (!m.inside) { this.park(); return; }
    // The portal, behind where you woke.
    if (m.portal > 0.01) {
      quatYaw(this.q, 0, PORTAL_YAW);
      mat4FromQT(this.portal.mat, this.q, 0, PORTAL, 0);
      for (let i = 0; i < 12; i++) this.portal.mat[i] *= m.portal;
      items.push(this.portal);
    }
    this.light(this.lights.portal, PORTAL[0], PORTAL[1], PORTAL[2], 17 * m.portal ** 1.5 + (m.flash && stage === OPENING.COLLAPSE ? 40 * m.flash : 0));
    // The swirl round her and her book, and her glamour's two lights, until the flash.
    const toYou = Math.atan2(snap[H.PX] - wx, snap[H.PZ] - wz);
    // (Out of the cave its glow fades with the cave's lights rather than going out in a frame.)
    const bookFade = stage === OPENING.COLLAPSE ? 1 - smoothstep(DUST_AT - 0.1, DUST_AT + 0.6, t) : 1;
    this.light(this.lights.book, this.position[0], this.position[1], this.position[2], (1.6 + 2.6 * m.swirl) * (stage === OPENING.WAKE ? 1 : 0.35) * bookFade);
    this.light(this.lights.key, wx + Math.sin(toYou) * 1.3, wy + 1.9, wz + Math.cos(toYou) * 1.3, 5.5 * m.glamour + 34 * (m.flash || 0) * (stage === OPENING.WAKE ? 1 : 0));
    this.light(this.lights.rim, wx - Math.sin(toYou) * 0.9, wy + 2.1, wz - Math.cos(toYou) * 0.9, 6.5 * m.glamour);
    // After the flash, before the candles: the portal's violet behind you on her front, so she isn't only a shape.
    const fill = stage === OPENING.WAKE && t > SWAP_AT ? 9 * (1 - smoothstep(CANDLES_AT, CANDLES_AT + 1.5, t)) : 0;
    this.light(this.lights.fill, wx + Math.sin(toYou) * 1.8, wy + 1.7, wz + Math.cos(toYou) * 1.8, fill);
    // The candles.
    for (const g of this.groups) {
      let k = 0;
      for (const c of g.list) k += this.candleLit(c, m);
      k /= g.list.length;
      this.light(g.light, g.c[0], g.c[1], g.c[2], (g.list[0].ledge ? 2.6 : 15) * k);
    }
    if (!cam) return;
    // ---- the light quads ----
    const rx = cam.fy * cam.uz - cam.fz * cam.uy, ry = cam.fz * cam.ux - cam.fx * cam.uz, rz = cam.fx * cam.uy - cam.fy * cam.ux;
    const R = [rx, ry, rz], U = [cam.ux, cam.uy, cam.uz];
    for (const c of CANDLES) {
      const k = this.candleLit(c, m);
      if (k <= 0) continue;
      const age = m.candles - c.at, flare = 1 + 2.2 * Math.max(0, 1 - age / 0.3);
      const fl = 0.85 + 0.15 * Math.sin(time * 13 + c.phase * 7) + 0.08 * Math.sin(time * 29 + c.phase);
      const top = [c.x, c.y + c.tall + 0.035, c.z];
      this.blob(top, R, U, 0.028 * fl * flare, 0.05 * fl * flare, [1.5 * k, 0.95 * k, 0.42 * k], 0.02);
      this.blob(top, R, U, 0.3 * flare, 0.3 * flare, [0.16 * k, 0.075 * k, 0.025 * k]);
    }
    if (m.swirl > 0.01) {
      const ox = this.position[0], oy = wy, oz = this.position[2];
      for (const mo of this.motes) {
        const a = mo.a + time * mo.w * (mo.gold ? -0.8 : 1), out = 1 + 5 * m.kick;
        const p = [wx + Math.cos(a) * mo.r * out, oy + mo.y + 0.12 * Math.sin(time * 1.3 + mo.a * 3) + m.kick * 0.8, wz + Math.sin(a) * mo.r * out];
        const tint = mo.gold && m.glamour > 0 ? [1.0, 0.7, 0.3].map((v) => v * 0.55 * m.glamour * m.swirl) : [0.42, 0.12, 0.95].map((v) => v * 0.6 * m.swirl);
        this.blob(p, R, U, mo.s, mo.s, tint);
      }
      this.blob([ox, this.position[1], oz], R, U, 0.55, 0.55, [0.22 * m.swirl, 0.06 * m.swirl, 0.45 * m.swirl]);
      this.blob([wx, wy + 1.2, wz], R, U, 2.2, 2.2, [0.07 * m.swirl, 0.02 * m.swirl, 0.15 * m.swirl]);
    }
    if (m.glamour > 0.01) this.blob([wx, wy + 1.4, wz], R, U, 1.5, 1.8, [0.1 * m.glamour, 0.07 * m.glamour, 0.03 * m.glamour]);
    // The circle you woke in, on the floor.
    if (m.circle > 0.01) {
      const [cx, cz] = CIRCLE, cy = chamberShape(11.8)[2] + 0.02, pulse = 0.75 + 0.25 * Math.sin(time * 2.1);
      for (const [rad, wid, b] of [[1.25, 0.07, 1], [1.05, 0.035, 0.6], [0.45, 0.03, 0.45]]) this.ring(cx, cy, cz, rad, wid, [0.32, 0.08, 0.75].map((v) => v * b * m.circle * pulse));
    }
    // Down the tunnel behind her as she runs, the mouth burns white: the day outside, and the dust in it. The glare is a
    // card facing you, so it's kept well beyond her as she runs out through the mouth (grown to look the same size): a
    // card she reached would whiten whatever of her was past it, head first.
    if (stage === OPENING.COLLAPSE && t > 4.6 && t < DUST_AT + 0.2) {
      const k = smoothstep(4.6, 5.3, t) * (1 - smoothstep(DUST_AT - 0.1, DUST_AT + 0.2, t));
      const past = (wx - CAVE_MOUTH[0]) * CAVE_OUT[0] + (wz - CAVE_MOUTH[1]) * CAVE_OUT[1];
      const at = (d) => [CAVE_MOUTH[0] + CAVE_OUT[0] * d, CAVE_LINE[0][5] + CAVE_LINE[0][7] * 0.5, CAVE_MOUTH[1] + CAVE_OUT[1] * d];
      const near = at(0.3), mouth = at(Math.max(0.3, past + 2.0));
      const grow = Math.hypot(mouth[0] - cam.x, mouth[1] - cam.y, mouth[2] - cam.z) / Math.max(0.5, Math.hypot(near[0] - cam.x, near[1] - cam.y, near[2] - cam.z));
      this.blob(mouth, R, U, CAVE_LINE[0][6] * 1.5 * grow, CAVE_LINE[0][7] * 0.75 * grow, [1.4 * k, 1.3 * k, 1.12 * k]);
      this.blob(mouth, R, U, CAVE_LINE[0][6] * 2.6 * grow, CAVE_LINE[0][7] * 1.3 * grow, [0.5 * k, 0.45 * k, 0.38 * k]);
    }
    if (this.glowN) r.device.queue.writeBuffer(this.glowVB, 0, this.glow, 0, this.glowN * 6 * 9);
  }

  light(L, x, y, z, i) {
    if (i <= 0.01) { L.p[0] = PARKED[0]; L.p[1] = PARKED[1]; L.p[2] = PARKED[2]; L.i = 0; return; }
    L.p[0] = x; L.p[1] = y; L.p[2] = z; L.i = i;
  }

  park() {
    for (const L of Object.values(this.lights)) this.light(L, 0, 0, 0, 0);
    for (const g of this.groups) this.light(g.light, 0, 0, 0, 0);
  }

  // A soft round of light facing the camera, w across and h tall (lifted by `up`).
  blob(p, R, U, w, h, tint, up = 0) {
    if (this.glowN >= MAX_GLOW) return;
    const c = [p[0] + U[0] * up, p[1] + U[1] * up, p[2] + U[2] * up];
    const corner = (a, b) => [c[0] + R[0] * a * w + U[0] * b * h, c[1] + R[1] * a * w + U[1] * b * h, c[2] + R[2] * a * w + U[2] * b * h];
    this.quad(corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), tint, 101, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }

  // A thin glowing ring on the floor.
  ring(x, y, z, rad, wid, tint) {
    const N = 48;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const P = (a, rr) => [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr];
      this.quad(P(a0, rad - wid), P(a0, rad + wid), P(a1, rad + wid), P(a1, rad - wid), tint, 100, [[0, 1], [1, 1], [1, 1], [0, 1]]);
    }
  }

  quad(a, b, c, d, tint, layer, uv) {
    if (this.glowN >= MAX_GLOW) return;
    const g = this.glow;
    let o = this.glowN * 54;
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const p = [a, b, c, d][k];
      g[o++] = p[0]; g[o++] = p[1]; g[o++] = p[2]; g[o++] = uv[k][0]; g[o++] = uv[k][1]; g[o++] = tint[0]; g[o++] = tint[1]; g[o++] = tint[2]; g[o++] = layer;
    }
    this.glowN++;
  }

  drawGlow(pass) {
    if (!this.glowN || !this.r.interior) return;
    pass.setPipeline(this.r.pGlow);
    pass.setBindGroup(1, this.r.interior.atlas.bg);
    pass.setVertexBuffer(0, this.glowVB);
    pass.draw(this.glowN * 6);
  }

  // Her spellbook: floating open before her while she reads, shut at her side after, and always with her. When the cave
  // comes down she snatches it out of the air and runs with it in her fist (hand: her left hand's place, from the sim),
  // until she's on her feet again and lets it float.
  // head: her speech mark (0.19 m over the head joint), so the book can keep to her shoulder when she's down on a knee.
  placeBook(items, stage, t, time, dt, wx, wy, wz, yaw, head) {
    const reading = stage === OPENING.WAKE && t < 6.6;
    const close = stage === OPENING.COLLAPSE && t > 4.45 && t < 11.4 && head[1] > wy + 0.3 && head[1] - wy < 3;
    const side = reading ? -0.56 : -0.68, forward = reading ? 0.46 : -0.31;
    let x = wx + Math.cos(yaw) * side + Math.sin(yaw) * forward;
    let y = wy + (reading ? 1.10 : 1.04) + 0.065 * Math.sin(time * 2.85) + 0.018 * Math.sin(time * 5.8);
    let z = wz - Math.sin(yaw) * side + Math.cos(yaw) * forward;
    if (close) {
      // Through the escape it keeps in tight at her shoulder, just behind, the way a frightened cat keeps to your heels;
      // once she's up and has her breath it drifts back out to where it floats.
      const cs = -0.36, cf = -0.16;
      x = head[0] + Math.cos(yaw) * cs + Math.sin(yaw) * cf;
      y = head[1] - 0.5 + 0.025 * Math.sin(time * 4.1);
      z = head[2] - Math.sin(yaw) * cs + Math.cos(yaw) * cf;
    }
    if (this.last === null || time < this.last || Math.hypot(x - this.position[0], z - this.position[2]) > 5) { this.position.set([x, y, z]); this.yaw = yaw; }
    this.last = time;
    const rate = close ? 16 : 5;
    this.position[0] = damp(this.position[0], x, rate, dt);
    this.position[1] = damp(this.position[1], y, rate, dt);
    this.position[2] = damp(this.position[2], z, rate, dt);
    this.yaw += wrapAngle(yaw - this.yaw) * (1 - Math.exp(-(close ? 12 : 4) * dt));
    this.held = 0;
    const shut = stage === OPENING.WAKE ? smoothstep(6.0, 6.9, t) : 1;
    quatYaw(this.heading, 0, this.yaw + Math.PI + (reading ? -0.5 : 0.35) + this.held * (Math.PI / 2 - 0.35));
    quatAxisAngle(this.tilt, 0, 1, 0, 0, lerp(-0.92 + shut * 0.68 + Math.sin(time * 1.8) * 0.07, -1.45, this.held));
    quatMul(this.heading, 0, this.heading, 0, this.tilt, 0);
    if (shut > 0.92) {
      this.transform(this.book.closed, 0);
      items.push(this.book.closed);
    } else {
      this.transform(this.book.left, shut * 0.82);
      this.transform(this.book.right, -shut * 0.82);
      items.push(this.book.left, this.book.right);
    }
  }

  transform(part, fold) {
    quatYaw(this.hinge, 0, fold);
    quatMul(this.rotation, 0, this.heading, 0, this.hinge, 0);
    mat4FromQT(part.mat, this.rotation, 0, this.position, 0);
    for (let i = 0; i < 12; i++) part.mat[i] *= BOOK_SCALE;
  }
}

// Where the dust and the stones come from when it falls in (src/main.js: the collapse).
export const MOUTH_TOP = [CAVE_MOUTH[0], CAVE_LINE[0][5] + CAVE_LINE[0][7], CAVE_MOUTH[1]];
