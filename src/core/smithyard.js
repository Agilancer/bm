// The smith's yard: what's built out under the lean-to on the north side of his house and on the ground east of it, and
// never moves. The hearth itself, its chimney and the lean-to's roof are the village's (tools/village/build_village.py);
// this is everything else: the anvil on its block, the bellows' trestle and bottom board, the slack tub, the bench and
// the tools hung over it, the grindstone's frame and trough, the coal, the iron, the staffs he's made, the rack the great
// axe hangs from, and the lights posted round it all. Built with the land's own kit (src/core/sites.js) in the town's own
// paintings, so it's drawn with the village in the one buffer.
//
// Where everything stands is src/folk/smithy.js's (STATIONS and what's at each), which the smith's clips are made from and
// the moving parts are placed by: nothing here has a number of its own for where he works.
//
// What stops a body (YARD_COLLIDERS) and what lights the place (YARD_LIGHTS) go into assets/game/village.json with the
// village's own, by `node tools/village/smithyard.mjs`, so everything that reads the town (the sim, the townsfolk's
// walking, the map) has them. tests/smithy.test.mjs fails if the file's fallen behind this.
import { BENCH, FIRE, FORGE, RACK, STATIONS, TUB, WHEEL, YARD_Y, inYard } from '../folk/smithy.js';
import { boardShape } from '../folk/smithkit.js';

const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mean = (ps) => mul(ps.reduce(add, [0, 0, 0]), 1 / ps.length);

// The town's oak: a beam that runs the width of one of the wall paintings (TIMBER in tools/village/build_village.py), laid
// along each piece's length.
const OAK = 'wall_07', OAK_V = [440 / 1024, 502 / 1024], OAK_W = 4.6;

// The kit, with a station's frame to build in: every point given is in that frame (y from the ground).
class Yard {
  constructor(K) { this.K = K; this.st = null; }
  in(st, fn) { const was = this.st; this.st = st; fn(); this.st = was; }
  w(p) { return this.st ? inYard(this.st, p) : [p[0], p[1] + YARD_Y, p[2]]; }

  // A face, its corners going round, wound to look away from mid (all in the station's frame). layer OAK lays the beam along
  // its longest side.
  face(layer, pts, mid) {
    let P = pts.map((p) => this.w(p));
    const M = this.w(mid);
    let n = [0, 0, 0];
    for (let i = 1; i + 1 < P.length; i++) n = add(n, cross(sub(P[i], P[0]), sub(P[i + 1], P[0])));
    if (Math.hypot(...n) < 1e-10) return;
    if (dot(n, sub(mean(P), M)) < 0) { P = P.reverse(); n = mul(n, -1); }
    n = unit(n);
    let uv = null;
    if (layer === OAK) {
      let e = [1, 0, 0], best = 0;
      for (let i = 0; i < P.length; i++) { const d = sub(P[(i + 1) % P.length], P[i]), l = dot(d, d); if (l > best) { best = l; e = d; } }
      e = unit(e);
      const ac = unit(cross(n, e)), ts = P.map((p) => dot(p, ac)), t0 = Math.min(...ts), span = Math.max(Math.max(...ts) - t0, 1e-6);
      const seed = Math.abs(Math.sin(P[0][0] * 12.9898 + P[0][1] * 4.1414 + P[0][2] * 78.233) * 43758.5453) % 1;
      uv = P.map((p, i) => [dot(p, e) / OAK_W + seed, OAK_V[0] + (ts[i] - t0) / span * (OAK_V[1] - OAK_V[0])]);
    }
    const K = this.K;
    if (P.length === 4) K.quad(layer, P[0], P[1], P[2], P[3], n, uv || undefined);
    else for (let i = 1; i + 1 < P.length; i++) {
      // (Three corners as a four-cornered face with two of them the same: the kit's own tri has no say in its uv.)
      K.quad(layer, P[0], P[i], P[i + 1], P[i + 1], n, uv ? [uv[0], uv[i], uv[i + 1], uv[i + 1]] : [[0, 0], [0.1, 0], [0.1, 0.1], [0.1, 0.1]]);
    }
  }

  // Rings of corners, each the same number round, skinned between, the ends shut unless caps says not.
  loft(layer, rings, caps = [true, true], capLayer = null) {
    const mid = mean(rings.flat()), n = rings[0].length;
    for (let r = 0; r + 1 < rings.length; r++) {
      const a = rings[r], b = rings[r + 1], m = mean(a.concat(b));
      for (let k = 0; k < n; k++) this.face(layer, [a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]], m);
    }
    [0, rings.length - 1].forEach((r, e) => { if (caps[e]) this.face(capLayer || layer, rings[r], mid); });
  }

  box(layer, x0, y0, z0, x1, y1, z1) {
    this.loft(layer, [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]]);
  }

  // A timber from a to b, w by h in section (h up, or the way `up` says).
  beam(layer, a, b, w, h = w, up = [0, 1, 0]) {
    const d = unit(sub(b, a)), s = unit(cross(d, Math.abs(dot(d, up)) > 0.95 ? [1, 0, 0] : up)), t = cross(s, d);
    const ring = (c) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => add(c, add(mul(s, i * w / 2), mul(t, j * h / 2))));
    this.loft(layer, [ring(a), ring(b)]);
  }

  // A rod, round: from a to b, r thick (r2 at b).
  rod(layer, a, b, r, sides = 6, r2 = r, caps = [true, true]) {
    const d = unit(sub(b, a)), s = unit(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t = cross(d, s);
    const ring = (c, rr) => Array.from({ length: sides }, (_, i) => { const an = (i + 0.5) / sides * TAU; return add(c, add(mul(s, Math.cos(an) * rr), mul(t, Math.sin(an) * rr))); });
    this.loft(layer, [ring(a, r), ring(b, r2)], caps);
  }

  // Staves standing in a ring: a tub, a bucket. Open at the top, with a floor, and thick enough to see its rim.
  staves(c, r, h, n = 12, th = 0.022, r2 = r) {
    const ring = (rr, y) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [c[0] + Math.cos(a) * rr, c[1] + y, c[2] + Math.sin(a) * rr]; });
    const o0 = ring(r, 0), o1 = ring(r2, h), i0 = ring(r - th, 0.03), i1 = ring(r2 - th, h);
    const mid = [c[0], c[1] + h / 2, c[2]];
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      this.face(OAK, [o0[k], o1[k], o1[k2], o0[k2]], mid);
      // (The inside looks in: wound away from a point outside it.)
      this.face(OAK, [i0[k], i1[k], i1[k2], i0[k2]], add(mid, mul(sub(mean([o0[k], o0[k2]]), mid), 3)));
      this.face(OAK, [o1[k], i1[k], i1[k2], o1[k2]], [mid[0], mid[1] - h, mid[2]]);
    }
    this.face(OAK, i0.slice(0, 4), [c[0], c[1] - 1, c[2]]);
    for (let k = 4; k + 1 < n; k += 2) this.face(OAK, [i0[0], i0[k - 1], i0[k], i0[k + 1]], [c[0], c[1] - 1, c[2]]);
    this.face(OAK, [i0[0], i0[n - 2], i0[n - 1]], [c[0], c[1] - 1, c[2]]);
  }

  hoop(c, r, y, h = 0.035, n = 12) {
    const ring = (rr, yy) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [c[0] + Math.cos(a) * rr, c[1] + yy, c[2] + Math.sin(a) * rr]; });
    this.loft('iron', [ring(r, y), ring(r, y + h)], [false, false]);
  }

  // A level round of something (water in a tub).
  pool(layer, c, r, n = 12) {
    const ring = Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r]; });
    for (let k = 1; k + 1 < n; k += 2) this.face(layer, [ring[0], ring[k], ring[k + 1], ring[(k + 2) % n]], [c[0], c[1] - 1, c[2]]);
  }

  // A chain hanging from a, n links down: flat links of iron, each turned a quarter from the last.
  chain(a, len, link = 0.045) {
    const n = Math.max(1, Math.round(len / (link * 0.74)));
    for (let i = 0; i < n; i++) {
      const y = a[1] - (i + 0.5) * len / n, w = 0.012, t = 0.004, h = len / n * 0.68;
      if (i % 2) this.box('iron', a[0] - w, y - h, a[2] - t, a[0] + w, y + h, a[2] + t);
      else this.box('iron', a[0] - t, y - h, a[2] - w, a[0] + t, y + h, a[2] + w);
    }
  }

  // A horseshoe hung on a wall, its ends down: at c, on a wall whose face looks along -z.
  shoe(c, r = 0.065) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a0 = -0.35 + i / n * (Math.PI + 0.7), a1 = -0.35 + (i + 1) / n * (Math.PI + 0.7);
      const p = (a, rr) => [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, c[2]];
      const q = [p(a0, r), p(a1, r), p(a1, r - 0.02), p(a0, r - 0.02)];
      this.loft('iron', [q, q.map((v) => [v[0], v[1], v[2] - 0.012])]);
    }
  }

  // A light on a post: an iron basket of fire at the head of an oak stake.
  torch(p, h = 1.95) {
    this.beam(OAK, [p[0], -0.2, p[2]], [p[0], h, p[2]], 0.085);
    const ring = (r, y, n = 6) => Array.from({ length: n }, (_, i) => { const a = (i + 0.5) / n * TAU; return [p[0] + Math.cos(a) * r, y, p[2] + Math.sin(a) * r]; });
    this.loft('iron', [ring(0.05, h), ring(0.105, h + 0.05), ring(0.125, h + 0.2)], [true, false]);
    this.loft('iron', [ring(0.125, h + 0.2).reverse(), ring(0.1, h + 0.06).reverse()], [false, false]);
    for (const s of [-1, 1]) this.beam('iron', [p[0] + s * 0.02, h - 0.14, p[2]], [p[0] + s * 0.085, h + 0.04, p[2]], 0.014);
    this.loft('flame', [ring(0.085, h + 0.14, 5), ring(0.07, h + 0.3, 5), [[p[0] + 0.012, h + 0.5, p[2] - 0.01], [p[0] + 0.014, h + 0.5, p[2]], [p[0] + 0.012, h + 0.5, p[2] + 0.01], [p[0] + 0.01, h + 0.5, p[2]], [p[0] + 0.011, h + 0.5, p[2] - 0.005]]], [true, true]);
  }
}

// ---- where the lights are, and what stops a body ----

const P = (st, p) => inYard(STATIONS[st], p);
const round = (v) => Math.round(v * 1000) / 1000;
// The torches on their stakes: round the open yard, and one at the lean-to's far end.
export const TORCHES = [[-6.25, 0, 25.35], [-3.72, 0, 26.2], [-3.75, 0, 30.55], [-13.9, 0, 25.5]];
const TORCH_H = 1.95;
// The lantern on its chain from the lean-to's rafter, over the anvil and the bench.
export const LANTERN = [-8.55, 2.42, 28.55];
// The bucket set down by the axe: the vessel he offered.
const BUCKET = [1.02, 0, RACK.off + 0.1];

export const YARD_LIGHTS = [
  ...TORCHES.map((t) => ({ p: [t[0], round(YARD_Y + TORCH_H + 0.32), t[2]], c: [1.0, 0.6, 0.26], r: 8.0, i: 3.2, flicker: 0.7, yard: 1 })),
  { p: [LANTERN[0], round(LANTERN[1] + YARD_Y - 0.1), LANTERN[2]], c: [1.0, 0.64, 0.3], r: 6.5, i: 2.4, flicker: 0.5, yard: 1 },
  // The axe's own: cold, and slow. (What it's lit by is the runes': src/gfx/folktools.js turns it up and down with them.)
  { p: P('axe', [0, RACK.hook - 0.62, RACK.off - 0.22]).map(round), c: [0.36, 0.95, 0.82], r: 4.2, i: 1.5, flicker: 0.12, yard: 2 },
];

const boxOf = (st, c, hx, hz, h) => { const w = P(st, [c[0], 0, c[1]]); return { x: round(w[0]), z: round(w[2]), hx, hz, yaw: round(STATIONS[st].yaw), h, yard: 1 }; };
export const YARD_COLLIDERS = [
  boxOf('anvil', [0.06, FORGE.off], 0.3, 0.2, FORGE.face),
  boxOf('fire', [FIRE.hinge[0] - 0.02, FIRE.hinge[2] - FIRE.long / 2], 0.34, FIRE.long / 2 + 0.05, 1.15),
  boxOf('tub', [0, TUB.off], TUB.r * 0.85, TUB.r * 0.85, TUB.rim),
  boxOf('bench', [0, BENCH.off + 0.03], BENCH.hx, BENCH.hz - 0.03, BENCH.top),
  boxOf('wheel', [0, WHEEL.off + 0.05], 0.3, WHEEL.r - 0.03, 1.1),
  boxOf('axe', [0, RACK.off + 0.18], RACK.post + 0.16, 0.32, 2.3),
  boxOf('axe', BUCKET.filter((_, i) => i !== 1), 0.14, 0.14, 0.3),
  ...TORCHES.map((t) => ({ x: t[0], z: t[2], hx: 0.07, hz: 0.07, yaw: 0, h: 2.0, yard: 1 })),
  // The coal, the iron and the rack of staffs.
  { x: -12.45, z: 27.2, hx: 0.55, hz: 0.42, yaw: 0, h: 0.6, yard: 1 },
  { x: -13.25, z: 26.75, hx: 0.16, hz: 0.5, yaw: 0, h: 1.2, yard: 1 },
  { x: -7.05, z: 26.5, hx: 0.5, hz: 0.2, yaw: 0, h: 1.4, yard: 1 },
];

// ---- the building of it ----

export function smithYard(K) {
  if (!K.geometry) return;
  const Y = new Yard(K);

  // The anvil on its block: a length of oak trunk banded with iron, and the anvil the house's own was (Home.anvil in
  // tools/interior/build_interior.py): feet, a waist, the body spread under the face, a step, and the horn to his left.
  Y.in(STATIONS.anvil, () => {
    const o = FORGE.off, ring = (r, y, n = 10) => Array.from({ length: n }, (_, i) => { const a = (i + 0.3) / n * TAU; return [Math.cos(a) * r, y, o + Math.sin(a) * r]; });
    Y.loft('bark', [ring(0.215, -0.2), ring(0.205, 0.5)], [false, true], 'wood');
    for (const h of [0.07, 0.4]) Y.loft('iron', [ring(0.221, h), ring(0.221, h + 0.045)], [false, false]);
    const rect = (u0, u1, hw, h) => [[u0, h, o + hw], [u1, h, o + hw], [u1, h, o - hw], [u0, h, o - hw]];
    Y.loft('iron', [rect(-0.15, 0.15, 0.11, 0.5), rect(-0.15, 0.15, 0.11, 0.548), rect(-0.1, 0.1, 0.07, 0.6), rect(-0.085, 0.085, 0.052, 0.68),
      rect(-0.12, 0.11, 0.058, 0.735), rect(-0.22, 0.14, 0.065, 0.77), rect(-0.22, 0.14, 0.065, FORGE.face)]);
    Y.loft('iron', [rect(0.14, 0.19, 0.06, 0.775), rect(0.14, 0.19, 0.06, FORGE.face - 0.022)]);
    const horn = (u, cy, r) => Array.from({ length: 8 }, (_, k) => { const a = k / 8 * TAU; return [u, cy + Math.sin(a) * r, o + Math.cos(a) * r]; });
    Y.loft('iron', [horn(0.19, 0.815, 0.043), horn(0.27, 0.822, 0.036), horn(0.34, 0.832, 0.024), horn(0.4, 0.842, 0.008)]);
    // A horseshoe nailed to the block, for luck. (His holy symbol, he'll tell you.)
    Y.shoe([0, 0.27, o - 0.222], 0.06);
  });

  // The fire: an iron ring round its bed of coals on the hearth, the bellows' nose into the hearth's side, their bottom
  // board on its trestle, and the post the pole rocks on.
  Y.in(STATIONS.fire, () => {
    const c = FIRE.coals, ring = (r, y, n = 12) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [c[0] + Math.cos(a) * r, y, c[2] + Math.sin(a) * r * 0.92]; });
    Y.loft('iron', [ring(0.37, FIRE.top - 0.01), ring(0.37, FIRE.top + 0.05), ring(0.335, FIRE.top + 0.05), ring(0.335, FIRE.top - 0.01)], [false, false]);
    const h = FIRE.hinge, B = (x, y, z) => [h[0] - x, h[1] + y, h[2] - z];     // the bellows' own frame: z back from the nose
    Y.rod('iron', B(0, -0.02, 0.06), B(0, -0.03, -0.14), 0.05, 6, 0.028);
    const shape = boardShape();
    Y.loft(OAK, [shape.map(([x, z]) => B(x, -0.035, z)), shape.map(([x, z]) => B(x, 0, z))]);
    // (The trestle under it: two pairs of legs and the rails between.)
    for (const z of [0.2, FIRE.long - 0.12]) {
      for (const s of [-1, 1]) Y.beam(OAK, B(s * 0.2, -h[1] - 0.2, z), B(s * 0.16, -0.035, z), 0.07);
      Y.beam(OAK, B(-0.24, -0.075, z), B(0.24, -0.075, z), 0.06, 0.08);
    }
    Y.beam(OAK, B(0, -0.4, 0.2), B(0, -0.4, FIRE.long - 0.12), 0.05, 0.07);
    for (const z of [0.2, FIRE.long - 0.12]) Y.beam(OAK, B(-0.19, -0.4, z), B(0.19, -0.4, z), 0.05, 0.07);
    // (The post, on the side away from him, an arm out from it over the bellows, and the pin's two cheeks.)
    const pz = h[2] - FIRE.pivot[2], py = FIRE.pivot[1] - h[1];
    Y.beam(OAK, B(0.36, -h[1] - 0.2, pz), B(0.36, py + 0.16, pz), 0.11);
    Y.beam(OAK, B(0.42, py - 0.075, pz), B(-0.1, py - 0.075, pz), 0.07, 0.09);
    Y.beam(OAK, B(0.36, py - 0.5, pz), B(0.1, py - 0.12, pz), 0.05);
    for (const s of [-1, 1]) Y.box('iron', ...B(s * 0.05 + 0.012, py - 0.03, pz + 0.03), ...B(s * 0.05 - 0.012, py + 0.06, pz - 0.03));
  });

  // The slack tub: half a cask of water, hooped, the dipper's handle over its rim.
  Y.in(STATIONS.tub, () => {
    const c = [0, 0, TUB.off];
    Y.staves([0, -0.1, TUB.off], TUB.r, TUB.rim + 0.1, 12, 0.026, TUB.r + 0.02);
    Y.hoop(c, TUB.r + 0.006, 0.08); Y.hoop(c, TUB.r + 0.02, TUB.rim - 0.12);
    Y.pool('water', [0, TUB.water, TUB.off], TUB.r - 0.02);
  });

  // The bench along the wall: planks on four legs, a shelf under, and on it what he isn't using. Over it a board on the
  // wall with pegs, and his other tools hung from it.
  Y.in(STATIONS.bench, () => {
    const o = BENCH.off, hx = BENCH.hx, hz = BENCH.hz, t = BENCH.top;
    for (let i = 0; i < 3; i++) { const z0 = o - hz + i * (hz * 2 / 3); Y.beam(OAK, [-hx, t - 0.03, z0 + hz / 3], [hx, t - 0.03, z0 + hz / 3], hz * 2 / 3 - 0.006, 0.06, [0, 0, 1]); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Y.beam(OAK, [sx * (hx - 0.1), -0.2, o + sz * (hz - 0.07)], [sx * (hx - 0.1), t - 0.06, o + sz * (hz - 0.07)], 0.08);
    for (const sz of [-1, 1]) Y.beam(OAK, [-hx + 0.1, 0.24, o + sz * (hz - 0.07)], [hx - 0.1, 0.24, o + sz * (hz - 0.07)], 0.05, 0.07);
    for (let i = 0; i < 2; i++) Y.beam(OAK, [-hx + 0.12, 0.29, o - 0.12 + i * 0.24], [hx - 0.12, 0.29, o - 0.12 + i * 0.24], 0.22, 0.025, [0, 0, 1]);
    // (On it: a leg vice at its end, a swage block, a few short bars, a hardy; under it a box of nails and a coil of chain.)
    Y.box('iron', 0.78, t, o - 0.08, 0.98, t + 0.11, o + 0.12);
    Y.box('iron', 0.86, t + 0.11, o - 0.05, 0.9, t + 0.2, o + 0.09);
    Y.rod('iron', [0.88, t + 0.15, o - 0.2], [0.88, t + 0.15, o + 0.16], 0.012, 5);
    Y.box('iron', 0.34, t, o + 0.08, 0.56, t + 0.07, o + 0.26);
    for (let i = 0; i < 4; i++) Y.beam('iron', [-0.98 + i * 0.03, t + 0.011 + (i % 2) * 0.004, o + 0.05 + i * 0.045], [-0.5 + i * 0.05, t + 0.011, o + 0.1 + i * 0.045], 0.02);
    Y.box(OAK, -0.9, 0.3, o - 0.14, -0.6, 0.46, o + 0.1);
    Y.loft('iron', [[[0.3, 0.3, o - 0.1], [0.62, 0.3, o - 0.1], [0.62, 0.3, o + 0.14], [0.3, 0.3, o + 0.14]], [[0.36, 0.38, o - 0.05], [0.56, 0.38, o - 0.05], [0.56, 0.38, o + 0.09], [0.36, 0.38, o + 0.09]]]);
    // The house's wall in front of him: the board, 4 cm proud of it.
    const wz = BENCH.wall - STATIONS.bench.z - 0.04;
    Y.beam(OAK, [-0.95, 1.62, wz], [0.95, 1.62, wz], 0.03, 0.13, [0, 1, 0]);
    const peg = (x) => Y.rod(OAK, [x, 1.62, wz - 0.015], [x, 1.635, wz - 0.085], 0.011, 5);
    // (Two pairs of tongs by their rivets, a sledge and a small hammer by their heads, two punches, three horseshoes.)
    for (const [x, len] of [[-0.8, 0.5], [-0.62, 0.42]]) {
      peg(x);
      for (const s of [-1, 1]) { Y.rod('iron', [x + s * 0.006, 1.66, wz - 0.05], [x + s * 0.035, 1.62 - len, wz - 0.045], 0.0065, 5); Y.rod('iron', [x + s * 0.006, 1.66, wz - 0.05], [x - s * 0.02, 1.76, wz - 0.05], 0.008, 5); }
    }
    for (const [x, len, hw] of [[-0.36, 0.62, 0.075], [-0.14, 0.34, 0.045]]) {
      peg(x - hw * 0.6); peg(x + hw * 0.6);
      Y.box('iron', x - hw, 1.64, wz - 0.085, x + hw, 1.64 + hw * 0.9, wz - 0.085 + hw * 0.9);
      Y.rod(OAK, [x, 1.645, wz - 0.085 + hw * 0.45], [x, 1.64 - len, wz - 0.05], 0.014, 6);
    }
    for (const x of [0.06, 0.16]) { peg(x); Y.rod('iron', [x, 1.6, wz - 0.06], [x, 1.36, wz - 0.045], 0.009, 5, 0.004); }
    for (const [x, y] of [[0.42, 1.6], [0.62, 1.63], [0.82, 1.59]]) { Y.rod('iron', [x, y + 0.062, wz - 0.012], [x, y + 0.062, wz - 0.05], 0.006, 4); Y.shoe([x, y, wz - 0.03]); }
  });

  // The grindstone's frame: two trestles the axle runs in, a trough of water under the stone, and the treadle that turns it.
  Y.in(STATIONS.wheel, () => {
    const o = WHEEL.off, ax = WHEEL.axle, s0 = WHEEL.thick / 2 + 0.085;
    for (const s of [-1, 1]) {
      const x = s * s0;
      for (const f of [-1, 1]) Y.beam(OAK, [x, -0.2, o + f * 0.27], [x, ax + 0.03, o + f * 0.04], 0.065);
      Y.beam(OAK, [x, 0.24, o - 0.2], [x, 0.24, o + 0.2], 0.05, 0.07);
      Y.box('iron', x - 0.02, ax - 0.045, o - 0.06, x + 0.02, ax + 0.045, o + 0.06);
    }
    Y.beam(OAK, [-s0, 0.24, o + 0.17], [s0, 0.24, o + 0.17], 0.05, 0.07);
    // (The trough: a box of planks, the water in it up to the stone's rim.)
    const t0 = ax - WHEEL.r - 0.09, t1 = ax - WHEEL.r + 0.07;
    for (const s of [-1, 1]) Y.beam(OAK, [s * 0.075, (t0 + t1) / 2, o - 0.24], [s * 0.075, (t0 + t1) / 2, o + 0.24], 0.02, t1 - t0);
    for (const f of [-1, 1]) Y.beam(OAK, [-0.075, (t0 + t1) / 2, o + f * 0.24], [0.075, (t0 + t1) / 2, o + f * 0.24], 0.02, t1 - t0);
    Y.beam(OAK, [0, t0, o - 0.24], [0, t0, o + 0.24], 0.15, 0.02);
    for (const f of [-1, 1]) Y.beam(OAK, [-s0, t0 - 0.035, o + f * 0.13], [s0, t0 - 0.035, o + f * 0.13], 0.045, 0.05);
    Y.face('water', [[-0.065, t1 - 0.03, o - 0.23], [0.065, t1 - 0.03, o - 0.23], [0.065, t1 - 0.03, o + 0.23], [-0.065, t1 - 0.03, o + 0.23]], [0, t0 - 1, o]);
    // (The treadle: a board hinged at the far side, coming back under the stone to his foot, a rod up from it to the crank.)
    const cx = WHEEL.thick / 2 + 0.235;
    Y.beam(OAK, [cx, 0.05, o + 0.36], [cx - 0.1, 0.13, o - 0.36], 0.1, 0.025);
    Y.rod('iron', [cx, 0.1, o - 0.1], [cx, ax - 0.13, o], 0.008, 5);
  });

  // The coal: a bin of planks open at the front, heaped. The iron: bars stood in a rack against the lean-to's west post.
  // The staffs he's made, stood along a rail by its east one, their iron shoes and heads on.
  Y.in(null, () => {
    const bx = -12.45, bz = 27.2;
    for (const [x0, z0, x1, z1] of [[bx - 0.55, bz - 0.42, bx - 0.55, bz + 0.42], [bx + 0.55, bz - 0.42, bx + 0.55, bz + 0.42], [bx - 0.55, bz + 0.42, bx + 0.55, bz + 0.42]]) {
      for (let i = 0; i < 3; i++) Y.beam(OAK, [x0, 0.09 + i * 0.185, z0], [x1, 0.09 + i * 0.185, z1], 0.03, 0.175);
    }
    for (const [x, z] of [[bx - 0.55, bz - 0.42], [bx + 0.55, bz - 0.42], [bx - 0.55, bz + 0.42], [bx + 0.55, bz + 0.42]]) Y.beam(OAK, [x, -0.2, z], [x, 0.62, z], 0.07);
    let s = 11;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 30; i++) {
      const x = bx + (rnd() - 0.5) * 0.92, z = bz + (rnd() - 0.5) * 0.7 - (i > 24 ? 0.5 : 0), top = i > 24 ? 0.02 : 0.38 - Math.hypot(x - bx, z - bz - 0.1) * 0.42, r = 0.05 + rnd() * 0.05;
      const ring = (y, k) => Array.from({ length: 5 }, (_, j) => { const a = j / 5 * TAU + i; return [x + Math.cos(a) * r * k, top + y, z + Math.sin(a) * r * k]; });
      Y.loft('dark:stone', [ring(-0.06, 0.8), ring(0, 1), ring(0.05, 0.55)], [false, true]);
    }
    Y.box('dark:stone', bx - 0.52, 0, bz - 0.4, bx + 0.52, 0.2, bz + 0.4);
    // (A shovel stood in it.)
    Y.rod(OAK, [bx + 0.3, 0.2, bz - 0.2], [bx + 0.48, 1.15, bz - 0.36], 0.017, 6);
    Y.box('iron', bx + 0.2, 0.14, bz - 0.26, bx + 0.38, 0.3, bz - 0.12);
    const ix = -13.25, iz = 26.75;
    Y.beam(OAK, [ix - 0.12, 0.9, iz - 0.5], [ix - 0.12, 0.9, iz + 0.5], 0.05, 0.07);
    for (const z of [iz - 0.5, iz + 0.5]) Y.beam(OAK, [ix - 0.12, -0.2, z], [ix - 0.12, 0.94, z], 0.06);
    Y.beam(OAK, [ix + 0.1, 0.04, iz - 0.5], [ix + 0.1, 0.04, iz + 0.5], 0.06, 0.08);
    for (let i = 0; i < 9; i++) { const z = iz - 0.42 + i * 0.105, len = 1.25 + (i * 37 % 5) * 0.11; Y.beam('iron', [ix + 0.08, 0.08, z], [ix - 0.09 - (i % 3) * 0.004, len, z + ((i * 7) % 3 - 1) * 0.01], 0.02 + (i % 3) * 0.006); }
    const sx = -7.05, sz = 26.5;
    for (const x of [sx - 0.5, sx + 0.5]) { Y.beam(OAK, [x, -0.2, sz], [x, 1.32, sz], 0.065); Y.beam(OAK, [x, 0.03, sz - 0.2], [x, 0.03, sz + 0.2], 0.06, 0.06); }
    Y.beam(OAK, [sx - 0.56, 1.22, sz], [sx + 0.56, 1.22, sz], 0.045, 0.06);
    Y.beam(OAK, [sx - 0.5, 0.08, sz + 0.12], [sx + 0.5, 0.08, sz + 0.12], 0.04, 0.05);
    for (let i = 0; i < 5; i++) {
      const x = sx - 0.38 + i * 0.19, len = 1.62 + (i % 3) * 0.09, foot = [x, 0.02, sz + 0.2], head = [x + ((i % 2) - 0.5) * 0.03, len, sz - 0.045];
      const d = unit(sub(head, foot));
      Y.rod(OAK, foot, head, 0.018, 6, 0.016);
      Y.rod('iron', foot, add(foot, mul(d, 0.09)), 0.021, 6, 0.019);
      // (Each a different head: a cage of iron, a ring, a spike, a knop.)
      const top = add(head, mul(d, 0.005));
      if (i % 4 === 0) { for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; Y.rod('iron', top, add(top, [Math.cos(a) * 0.05, 0.11, Math.sin(a) * 0.05]), 0.006, 4); Y.rod('iron', add(top, [Math.cos(a) * 0.05, 0.11, Math.sin(a) * 0.05]), add(top, [0, 0.21, 0]), 0.006, 4); } }
      else if (i % 4 === 1) Y.rod('iron', top, add(top, mul(d, 0.2)), 0.02, 5, 0.002);
      else if (i % 4 === 2) { Y.rod('iron', top, add(top, mul(d, 0.05)), 0.022, 6); Y.rod('iron', add(top, mul(d, 0.05)), add(top, mul(d, 0.11)), 0.038, 6, 0.03); }
      else Y.rod('iron', top, add(top, mul(d, 0.07)), 0.022, 6, 0.03);
    }
  });

  // The rack the great axe hangs from: a slab of stone gone white with rime, two posts stood on crossed feet, a bar over them
  // braced at each end, the hook under its middle, and four of the seven chains that were on the axe when he took the shop,
  // hanging where he struck them off. By it, the bucket he offered the saint for a vessel.
  Y.in(STATIONS.axe, () => {
    const o = RACK.off, px = RACK.post, top = RACK.bar;
    Y.box('frost:stone', -px - 0.34, -0.2, o - 0.2, px + 0.34, 0.13, o + 0.62);
    for (const s of [-1, 1]) {
      Y.beam(OAK, [s * px, 0.13, o], [s * px, top + 0.07, o], 0.11);
      Y.beam(OAK, [s * px, 0.175, o - 0.16], [s * px, 0.175, o + 0.56], 0.1, 0.09);
      Y.beam(OAK, [s * px, 0.2, o + 0.5], [s * px, 0.7, o + 0.03], 0.055);
      Y.beam(OAK, [s * px, 0.2, o - 0.13], [s * px, 0.42, o - 0.03], 0.055);
      Y.beam(OAK, [s * (px - 0.36), top - 0.02, o], [s * px, top - 0.4, o], 0.06);
      Y.box('iron', s * px - 0.066, top - 0.5, o - 0.066, s * px + 0.066, top - 0.45, o + 0.066);
    }
    Y.beam(OAK, [-px - 0.2, top, o], [px + 0.2, top, o], 0.1, 0.13);
    for (const s of [-1, 1]) Y.box('iron', s * (px + 0.21) - 0.012, top - 0.075, o - 0.06, s * (px + 0.21) + 0.012, top + 0.075, o + 0.06);
    // (The hook: a strap of iron round the bar and an eye under it.)
    Y.box('iron', -0.035, top - 0.075, o - 0.062, 0.035, top + 0.075, o + 0.062);
    Y.rod('iron', [0, top - 0.065, o], [0, RACK.hook - 0.02, o], 0.012, 5);
    for (const [x, len] of [[-0.52, 0.5], [-0.3, 0.27], [0.34, 0.62], [0.56, 0.36]]) { Y.box('iron', x - 0.02, top - 0.07, o - 0.058, x + 0.02, top + 0.07, o + 0.058); Y.chain([x, top - 0.065, o], len); }
    // (Rime on the slab under the axe's point.)
    for (const [x, z, r, n] of [[0.05, o + 0.08, 0.26, 7], [-0.42, o + 0.3, 0.16, 5], [0.5, o + 0.02, 0.13, 6], [0.2, o + 0.42, 0.1, 5]]) {
      const ring = Array.from({ length: n }, (_, i) => { const a = i / n * TAU + x * 9; return [x + Math.cos(a) * r * (0.75 + 0.25 * Math.sin(i * 2.4)), 0.134, z + Math.sin(a) * r * (0.6 + 0.3 * Math.cos(i * 1.7))]; });
      for (let k = 1; k + 1 < n; k++) Y.face('ice', [ring[0], ring[k], ring[k + 1]], [x, -1, z]);
    }
    Y.staves([BUCKET[0], 0, BUCKET[2]], 0.13, 0.27, 10, 0.014, 0.15);
    Y.hoop([BUCKET[0], 0, BUCKET[2]], 0.137, 0.05, 0.025, 10); Y.hoop([BUCKET[0], 0, BUCKET[2]], 0.15, 0.2, 0.025, 10);
  });

  // The lights: the torches, and the lantern on its chain.
  Y.in(null, () => {
    for (const t of TORCHES) Y.torch(t, TORCH_H);
    const [x, y, z] = LANTERN;
    Y.chain([x, y + 0.62, z], 0.42);
    const ring = (r, yy) => Array.from({ length: 4 }, (_, i) => { const a = (i + 0.5) / 4 * TAU; return [x + Math.cos(a) * r, yy, z + Math.sin(a) * r]; });
    Y.loft('iron', [ring(0.03, y + 0.2), ring(0.12, y + 0.13), ring(0.12, y + 0.11)], [true, true]);
    Y.loft('iron', [ring(0.11, y - 0.13), ring(0.11, y - 0.11)], [true, true]);
    for (const p of ring(0.105, 0)) Y.beam('iron', [p[0], y - 0.12, p[2]], [p[0], y + 0.12, p[2]], 0.012);
    Y.loft('flame', [ring(0.045, y - 0.1), ring(0.04, y + 0.02), ring(0.006, y + 0.1)], [true, true]);
  });
}
