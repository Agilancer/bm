// The shapes of the smith's kit (src/folk/smithy.js KIT): his hammer, the tongs and the iron in them, the blade he's
// making, his file and his rag, the bellows' top board with its leather, the pole that works them, the grindstone, and the
// great axe on its rack. Three small meshes, each vertex on one joint of the kit:
//
//   kitMesh()    everything that's plain steel, wood, leather and bone, and the axe with its runes
//   barMesh()    the iron in the tongs, which glows by how hot it is
//   coalMesh()   the fire's bed of coals, which glows by how the bellows have blown it
//
// Their paint is one strip of colours (PAINT): u picks one, or a place between two that stand side by side in it. A colour
// that says `glow` is lit of itself, by as much as its mesh is told (src/gfx/folktools.js): hot iron, live coals, the runes
// cut in the axe.
//
// The axe is Varrow's, out of VELSCOUR (tools/varrowaxe3d.js there): double-bitted, two crescent blades honed bright, a
// death's head on each face of the socket, a spike over it, iron langets and bronze collars on an ebony haft wrapped in
// leather, a spike on its butt, broken chains hanging from its collar. Its runes are no letters: see RUNES.
import { quatMul, quatRotate } from '../core/math.js';
import { AXE, BLADE, BOARD_SHUT, FILE, FIRE, HAMMER, KJ, STATIONS, TONGS, WHEEL, inYard, machines } from './smithy.js';

// colour (0-255 sRGB), roughness, metal (0-255), and how much of its glow it has (0-1)
export const PAINT = {
  ash: [112, 82, 50, 235, 0, 0],            // a handle, handled smooth
  ash_end: [150, 118, 78, 245, 0, 0],       // its cut ends
  black: [44, 42, 42, 150, 215, 0],         // iron black from the fire
  bright: [150, 148, 142, 95, 235, 0],      // a face worn bright
  steel: [70, 74, 80, 110, 240, 0],         // the blade he's making: its flat,
  keen: [196, 200, 206, 60, 250, 0],        // and its edge off the stone
  oak: [96, 68, 42, 225, 0, 0],             // the bellows' boards, the pole
  hide: [86, 52, 30, 215, 0, 0],            // their leather,
  hide_dark: [52, 31, 19, 230, 0, 0],       // and its folds
  rope: [150, 128, 88, 250, 0, 0],
  rag: [164, 150, 122, 250, 0, 0],
  rag_dark: [122, 110, 90, 250, 0, 0],
  grit: [128, 120, 108, 250, 0, 0],         // the grindstone,
  grit_wet: [92, 88, 82, 170, 0, 0],        // and its rim, wet
  // The axe.
  ebony: [30, 22, 18, 150, 0, 0],
  wrap: [74, 42, 26, 215, 0, 0],
  wrap_dark: [50, 28, 17, 225, 0, 0],
  bronze: [150, 112, 52, 105, 235, 0],
  gunmetal: [40, 46, 50, 105, 245, 0],      // the blades' steel, dark and a little green,
  rime: [176, 214, 220, 40, 250, 0],        // out to an edge like ice
  bone: [206, 196, 170, 215, 0, 0],
  socket: [10, 11, 12, 240, 0, 0],
  rune: [70, 235, 205, 240, 0, 1],
  // The iron in the tongs: black where the jaws have it, and its end the colour it comes out of the fire.
  iron: [46, 44, 44, 160, 215, 0],
  hot: [255, 178, 74, 220, 0, 1],
  // The coals: clinker, and what's alight in it.
  coal: [20, 18, 17, 250, 0, 0],
  ember: [255, 126, 40, 250, 0, 1],
};
const NAMES = Object.keys(PAINT);
const U = (name) => (NAMES.indexOf(name) + 0.5) / NAMES.length;
// The strip as two rows of texels for the renderer: colour (sRGB), and [1, roughness, metal, 1 - glow].
export function paintStrips() {
  return {
    n: NAMES.length,
    color: NAMES.flatMap((k) => [PAINT[k][0], PAINT[k][1], PAINT[k][2], 255]),
    mr: NAMES.flatMap((k) => [255, PAINT[k][3], PAINT[k][4], Math.round(255 * (1 - PAINT[k][5]))]),
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const TAU = Math.PI * 2;

// A mesh being built: corners, flat-shaded, each on the joint that's current (`joint`), in that joint's own frame. A colour is
// a name from PAINT, or [a, b, t]: t of the way from a to b, which have to be neighbours in the strip.
class Geo {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; this.jn = []; this.joint = 0; this.q = [0, 0, 0, 1]; this.t = [0, 0, 0]; }

  // Whatever fn builds is turned by q and moved by t (inside whatever's already set).
  at(t, q, fn) {
    const q0 = this.q, t0 = this.t, nq = [0, 0, 0, 1], nt = [0, 0, 0];
    quatMul(nq, 0, q0, 0, q || [0, 0, 0, 1], 0);
    quatRotate(nt, 0, q0, 0, t, 0);
    this.q = nq; this.t = add(nt, t0);
    fn();
    this.q = q0; this.t = t0;
  }

  u(c) { return typeof c === 'string' ? U(c) : U(c[0]) + (U(c[1]) - U(c[0])) * c[2]; }

  // Corners going round as seen from outside; cols: one colour, or one for each corner.
  face(pts, cols) {
    const P = pts.map((p) => { const o = [0, 0, 0]; quatRotate(o, 0, this.q, 0, p, 0); return add(o, this.t); });
    let n = [0, 0, 0];
    for (let i = 1; i + 1 < P.length; i++) n = add(n, cross(sub(P[i], P[0]), sub(P[i + 1], P[0])));
    if (Math.hypot(...n) < 1e-12) return;
    n = unit(n);
    const o = this.pos.length / 3;
    P.forEach((p, i) => {
      this.pos.push(...p); this.nrm.push(...n); this.uv.push(this.u(Array.isArray(cols) && cols.length === pts.length && typeof cols[2] !== 'number' ? cols[i] : cols), 0.5);
      this.jn.push(this.joint);
    });
    for (let i = 1; i + 1 < P.length; i++) this.idx.push(o, o + i, o + i + 1);
  }

  // The same, wound whichever way faces away from `mid`.
  out(pts, cols, mid) {
    let n = [0, 0, 0];
    for (let i = 1; i + 1 < pts.length; i++) n = add(n, cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0])));
    const c = mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
    if (dot(n, sub(c, mid)) < 0) { pts = pts.slice().reverse(); if (Array.isArray(cols) && cols.length === pts.length && typeof cols[2] !== 'number') cols = cols.slice().reverse(); }
    this.face(pts, cols);
  }

  box(x0, y0, z0, x1, y1, z1, col) {
    const m = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], c = (k) => (Array.isArray(col) && col.length === 6 ? col[k] : col);
    this.out([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], c(0), m);
    this.out([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c(1), m);
    this.out([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], c(2), m);
    this.out([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c(3), m);
    this.out([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], c(4), m);
    this.out([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c(5), m);
  }

  // Rings of corners, each the same number round, skinned between; the ends shut unless caps says not. cols: a colour, or one a ring.
  loft(rings, cols, caps = [true, true], capCols = null) {
    const all = rings.flat(), mid = mul(all.reduce(add, [0, 0, 0]), 1 / all.length), n = rings[0].length;
    const col = (i) => (Array.isArray(cols) && typeof cols[2] !== 'number' ? cols[i] : cols);
    for (let r = 0; r + 1 < rings.length; r++) {
      const a = rings[r], b = rings[r + 1], m = mul(a.concat(b).reduce(add, [0, 0, 0]), 0.5 / n);
      for (let k = 0; k < n; k++) this.out([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]], [col(r), col(r), col(r + 1), col(r + 1)], m);
    }
    [0, rings.length - 1].forEach((r, e) => { if (caps[e]) this.out(rings[r], capCols ? capCols[e] : col(r), mid); });
  }

  // A rod from a to b, r thick (r2 at b), `sides` round.
  rod(a, b, r, col, sides = 6, r2 = r, caps = [true, true], capCols = null) {
    const d = unit(sub(b, a)), s = unit(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t = cross(d, s);
    const ring = (c, rr) => Array.from({ length: sides }, (_, i) => { const an = (i + 0.5) / sides * TAU; return add(c, add(mul(s, Math.cos(an) * rr), mul(t, Math.sin(an) * rr))); });
    this.loft([ring(a, r), ring(b, r2)], col, caps, capCols);
  }

  // A lump: a ball of rings, squashed by sq.
  ball(c, r, col, sq = [1, 1, 1], seg = 6, rings = 4) {
    const R = [];
    for (let i = 1; i < rings; i++) {
      const ph = i / rings * Math.PI, y = Math.cos(ph), rr = Math.sin(ph);
      R.push(Array.from({ length: seg }, (_, k) => { const an = k / seg * TAU; return add(c, [Math.cos(an) * rr * r * sq[0], y * r * sq[1], Math.sin(an) * rr * r * sq[2]]); }));
    }
    const top = add(c, [0, r * sq[1], 0]), bot = add(c, [0, -r * sq[1], 0]);
    for (let k = 0; k < seg; k++) { this.out([top, R[0][k], R[0][(k + 1) % seg]], col, c); this.out([bot, R[R.length - 1][k], R[R.length - 1][(k + 1) % seg]], col, c); }
    this.loft(R, col, [false, false]);
  }

  // A chain from a towards b: links end to end, each turned a quarter from the last.
  chain(a, b, col, link = 0.034, w = 0.011) {
    const L = Math.hypot(...sub(b, a)), n = Math.max(1, Math.round(L / (link * 0.72))), d = unit(sub(b, a));
    const s = unit(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t = cross(d, s);
    for (let i = 0; i < n; i++) {
      const c = add(a, mul(d, (i + 0.5) * L / n)), side = i % 2 ? s : t, thin = i % 2 ? t : s, h = L / n * 0.72;
      const P = (u, v, k) => add(c, add(add(mul(d, u), mul(side, v)), mul(thin, k)));
      // (A link as a flat ring's outline: four sides of it.)
      for (const [u0, v0, u1, v1] of [[-h, -w, h, -w * 0.45], [-h, w * 0.45, h, w], [-h, -w, -h * 0.6, w], [h * 0.6, -w, h, w]]) {
        const m = P((u0 + u1) / 2, (v0 + v1) / 2, 0), k = w * 0.3;
        const cs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        this.out(cs.map(([u, v]) => P(u, v, k)), col, m); this.out(cs.map(([u, v]) => P(u, v, -k)), col, m);
        for (let e = 0; e < 4; e++) { const [ua, va] = cs[e], [ub, vb] = cs[(e + 1) % 4]; this.out([P(ua, va, -k), P(ub, vb, -k), P(ub, vb, k), P(ua, va, k)], col, m); }
      }
    }
  }

  done() {
    const n = this.pos.length / 3, joints = new Uint8Array(n * 4), weights = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { joints[i * 4] = this.jn[i]; weights[i * 4] = 1; }
    return { pos: new Float32Array(this.pos), nrm: new Float32Array(this.nrm), uv: new Float32Array(this.uv), idx: new Uint32Array(this.idx), joints, weights };
  }
}

// ---- his tools ----

function hammer(g) {
  const H = HAMMER, N = 8;
  // The handle: eight-sided, a little thicker in the hand than at the eye, its ends cut square.
  const ring = (y, r) => Array.from({ length: N }, (_, i) => { const a = (i + 0.5) / N * TAU; return [Math.sin(a) * r * 0.82, y, Math.cos(a) * r * 1.12]; });
  g.loft([ring(H.butt, H.handle * 1.12), ring(0, H.handle * 1.05), ring(H.head - H.eye, H.handle * 0.92), ring(H.top, H.handle * 0.92)], 'ash', [true, true], ['ash_end', 'ash_end']);
  // The head: a square block about the eye, the face proud of it at one end, drawn down to a cross peen at the other.
  const y0 = H.head - H.eye, y1 = H.head + H.eye, c = H.cheek, e = 0.006;
  g.box(-c, y0, -0.03, c, y1, H.face - 0.012, 'black');
  g.box(-c - 0.002, y0 - 0.002, H.face - 0.012, c + 0.002, y1 + 0.002, H.face, 'bright');
  g.loft([[[-c, y0, -0.03], [c, y0, -0.03], [c, y1, -0.03], [-c, y1, -0.03]], [[-c, H.head - e, H.peen], [c, H.head - e, H.peen], [c, H.head + e, H.peen], [-c, H.head + e, H.peen]]], 'black', [false, true], [null, 'bright']);
}

function tongs(g) {
  const T = TONGS;
  // Two reins side by side in the hand, crossing at the rivet, each ending in a flat jaw; shut on the iron.
  for (const s of [-1, 1]) {
    g.rod([s * 0.017, T.butt, 0], [s * 0.013, T.rivet - 0.05, 0], 0.0062, 'black', 5);
    g.rod([s * 0.013, T.rivet - 0.05, 0], [-s * 0.004, T.rivet, 0], 0.007, 'black', 5);
    g.box(Math.min(-s * 0.004, -s * 0.021), T.rivet, -0.011, Math.max(-s * 0.004, -s * 0.021), T.jaws, 0.011, 'black');
  }
  g.rod([0, T.rivet - 0.004, -0.013], [0, T.rivet - 0.004, 0.013], 0.0085, 'bright', 6);
}

function blade(g) {
  const B = BLADE, t = B.thick;
  // The tang, bare; then the flat out to a point, its edge ground bright.
  g.box(-t, B.butt, -0.008, t, B.heel, 0.008, 'black');
  const sec = (y, k) => [[-t * k, y, B.back * k], [t * k, y, B.back * k], [0, y, B.edge * k]];
  const ys = [B.heel, B.heel + 0.03, B.tip - 0.12, B.tip - 0.04, B.tip], ks = [0.55, 1, 1, 0.7, 0.04];
  const mid = [0, (B.heel + B.tip) / 2, 0.005];
  for (let i = 0; i + 1 < ys.length; i++) {
    const a = sec(ys[i], ks[i]), b = sec(ys[i + 1], ks[i + 1]);
    g.out([a[0], a[1], b[1], b[0]], 'steel', mid);
    for (const k of [0, 1]) g.out([a[k], a[2], b[2], b[k]], ['steel', ['steel', 'keen', 1], ['steel', 'keen', 1], 'steel'], mid);
  }
  g.out(sec(ys[0], ks[0]), 'steel', mid);
}

function file(g) {
  const F = FILE;
  g.loft([0, 1, 2].map((i) => { const y = F.butt + i * (F.heel - F.butt) / 2, r = [0.013, 0.016, 0.011][i]; return Array.from({ length: 6 }, (_, k) => { const a = k / 6 * TAU; return [Math.cos(a) * r, y, Math.sin(a) * r]; }); }), 'ash', [true, true], ['ash_end', 'ash_end']);
  g.box(-0.0025, F.heel, -0.011, 0.0025, F.tip, 0.011, 'black');
}

function rag(g) {
  // A cloth wadded in the fist, or tucked in his belt: a lump of it, and an end hanging out.
  g.ball([0, 0.0, 0.01], 0.047, 'rag', [0.8, 1.15, 1.0], 6, 3);
  g.loft([[[-0.02, -0.03, 0.03], [0.02, -0.03, 0.03], [0.024, -0.03, 0.045], [-0.024, -0.03, 0.045]], [[-0.03, -0.05, 0.085], [0.026, -0.055, 0.09], [0.03, -0.05, 0.098], [-0.027, -0.047, 0.095]], [[-0.015, -0.06, 0.13], [0.02, -0.058, 0.125], [0.02, -0.055, 0.132], [-0.015, -0.056, 0.136]]], ['rag', 'rag_dark', 'rag'], [false, true]);
}

// ---- the bellows ----

// The outline of a bellows board, from the hinge (z = 0) back to its round tail: [x, z] going round.
export function boardShape() {
  const L = FIRE.long, w = FIRE.wide / 2, pts = [[-0.07, 0], [-w * 0.72, L * 0.3], [-w, L * 0.62]];
  for (let i = 1; i < 6; i++) { const a = Math.PI - i / 6 * Math.PI; pts.push([Math.cos(a) * w, L * 0.62 + Math.sin(a) * (L * 0.38)]); }
  pts.push([w, L * 0.62], [w * 0.72, L * 0.3], [0.07, 0]);
  return pts;
}

function bellows(g) {
  const shape = boardShape(), th = 0.028;
  // The top board, a batten across it and a ring for the chain at its tail.
  g.joint = KJ.board;
  g.loft([shape.map(([x, z]) => [x, 0, z]), shape.map(([x, z]) => [x, th, z])], 'oak');
  g.box(-FIRE.wide * 0.4, th, FIRE.long * 0.56, FIRE.wide * 0.4, th + 0.02, FIRE.long * 0.62, 'oak');
  g.rod([0, th, FIRE.long - 0.07], [0, th + 0.035, FIRE.long - 0.07], 0.012, 'black', 5);
  // The leather between the boards: from the top board's rim down to the bottom one's, which never moves, in two folds.
  // (Each corner is on one joint or the other, so the folds open and shut as the board lifts.)
  const hinge = machines(0, 0, [0, 0]).board.t;
  const world = (p) => { const o = [0, 0, 0]; quatRotate(o, 0, STATIONS_BACK, 0, p, 0); return add(o, hinge); };
  for (let k = 0; k < shape.length; k++) {
    const [ax, az] = shape[k], [bx, bz] = shape[(k + 1) % shape.length];
    if (az === 0 && bz === 0) continue;
    const top = [[ax * 0.97, 0, az * 0.985], [bx * 0.97, 0, bz * 0.985]];
    // (The fold between them bellies out a little, and hangs from the top board: it rides most of the way up with it.)
    const foldT = [[ax * 1.07, -0.035 * Math.min(1, az / 0.3), az], [bx * 1.07, -0.035 * Math.min(1, bz / 0.3), bz]];
    const low = [world([ax * 0.97, 0, az * 0.985]), world([bx * 0.97, 0, bz * 0.985])];
    const mid = [0, -0.05, FIRE.long * 0.5], col = k % 2 ? 'hide' : 'hide_dark';
    const quad = (pa, ja, pb, jb, pc, jc, pd, jd) => {
      // Wound to face out, judged with the bellows half open (the top board's corners as if on the world's joint).
      const asWorld = (p, j) => (j === KJ.board ? world(add(p, [0, 0.07 * (p[2] / FIRE.long), 0])) : p);
      const W_ = [asWorld(pa, ja), asWorld(pb, jb), asWorld(pc, jc), asWorld(pd, jd)], c = world(mid);
      let n = cross(sub(W_[1], W_[0]), sub(W_[2], W_[0]));
      let order = [[pa, ja], [pb, jb], [pc, jc], [pd, jd]];
      if (dot(n, sub(W_[0], c)) < 0) { order = order.reverse(); n = mul(n, -1); }
      n = unit(n);
      const o = g.pos.length / 3;
      for (const [p, j] of order) { g.pos.push(...p); g.nrm.push(...(j === KJ.board ? back(n) : n)); g.uv.push(g.u(col), 0.5); g.jn.push(j); }
      g.idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    };
    quad(top[0], KJ.board, top[1], KJ.board, foldT[1], KJ.board, foldT[0], KJ.board);
    quad(foldT[0], KJ.board, foldT[1], KJ.board, low[1], KJ.yard, low[0], KJ.yard);
  }
  // The pole: a peeled ash pole rocking on its pin, iron at each end.
  g.joint = KJ.lever;
  g.rod([0, 0, -FIRE.pull - 0.05], [0, 0, FIRE.link + 0.05], 0.026, 'ash', 6, 0.03, [true, true], ['ash_end', 'ash_end']);
  g.rod([-0.06, 0, 0], [0.06, 0, 0], 0.012, 'black', 5);
  for (const z of [-FIRE.pull, FIRE.link]) g.rod([0, -0.03, z], [0, 0.03, z], 0.031, 'black', 6);
  // (An arm out from its near end towards where he stands, for the rope.)
  g.rod([0.02, 0, -FIRE.pull], [-FIRE.reach - 0.03, 0, -FIRE.pull], 0.02, 'ash', 6, 0.017, [true, true], ['ash_end', 'ash_end']);
  // The rope down from its near end, and the grip across it.
  g.joint = KJ.pull;
  g.rod([0, 0, 0], [0, -FIRE.rope + 0.012, 0], 0.008, 'rope', 5);
  g.rod([-0.07, -FIRE.rope, 0], [0.07, -FIRE.rope, 0], 0.016, 'ash', 6, 0.016, [true, true], ['ash_end', 'ash_end']);
  // The chain down from its far end to the board's tail.
  g.joint = KJ.link;
  const drop = FIRE.pivot[1] - FIRE.hinge[1] - FIRE.long * Math.sin(BOARD_SHUT) - 0.06;
  g.chain([0, 0, 0], [0, -drop, 0], 'black', 0.052, 0.014);
}
// (The bellows' frame at rest: what turns its own axes into the world's. Set by kitMesh before bellows() runs.)
let STATIONS_BACK = [0, 0, 0, 1];
// A direction of the world's, in the bellows' frame.
const back = (n) => { const o = [0, 0, 0]; quatRotate(o, 0, [-STATIONS_BACK[0], -STATIONS_BACK[1], -STATIONS_BACK[2], STATIONS_BACK[3]], 0, n, 0); return o; };

// ---- the grindstone ----

function wheel(g) {
  const W = WHEEL, n = 16, h = W.thick / 2;
  const ring = (x, r) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [x, Math.cos(a) * r, Math.sin(a) * r]; });
  // The stone: its cheeks dry, its rim dark with water; worn a little out of round, so its turning shows.
  const lump = (x, r) => ring(x, r).map((p, i) => [p[0], p[1] * (1 + 0.012 * Math.sin(i * 1.7)), p[2] * (1 + 0.012 * Math.cos(i * 2.3))]);
  g.loft([lump(-h, W.r * 0.2), lump(-h, W.r), lump(h, W.r), lump(h, W.r * 0.2)], ['grit', 'grit_wet', 'grit_wet', 'grit'], [false, false]);
  // A chip out of one cheek, and a streak of rust, to follow round.
  g.box(-h - 0.002, W.r * 0.45, -0.03, -h, W.r * 0.8, 0.03, 'grit_wet');
  g.box(h, -W.r * 0.75, -0.022, h + 0.002, -W.r * 0.4, 0.022, 'grit_wet');
  // The axle through it, and the crank on its far end.
  g.rod([-h - 0.16, 0, 0], [h + 0.2, 0, 0], 0.018, 'black', 6);
  g.box(h + 0.17, -0.02, -0.02, h + 0.2, 0.15, 0.02, 'black');
  g.rod([h + 0.2, 0.13, 0], [h + 0.27, 0.13, 0], 0.012, 'black', 5);
}

// ---- the axe ----

// The marks cut in its blades. Strokes in a cell two wide and four high, [x0, y0, x1, y1]. None of them is a letter of any
// hand that's written here, and none is anything like a V or a T (the owner's rule: CLAUDE.md, "The two sides").
export const RUNES = [
  [[0.2, 0, 1.8, 1.4], [1.8, 1.4, 0.2, 2.6], [0.2, 2.6, 1.8, 4]],                       // a bolt
  [[1, 4, 0, 2.9], [0, 2.9, 1, 1.8], [1, 1.8, 2, 2.9], [2, 2.9, 1, 4], [1, 1.8, 1, 0]],  // a lozenge on a stem
  [[0, 0, 2, 0], [2, 0, 0, 4], [0, 4, 2, 4], [2, 4, 0, 0]],                              // an hourglass
  [[0, 3.4, 2, 3.4], [2, 3.4, 2, 1], [2, 1, 0, 1], [0, 1, 0, 3.4], [0, 1, 2, 3.4], [1, 0.4, 1, 0]],  // a crossed pane on a foot
  [[0, 3.6, 2, 2.8], [0, 2.4, 2, 1.6], [0, 1.2, 2, 0.4]],                                // three falling strokes
  [[1, 4, 1, 0], [0, 3, 2, 3], [0, 1, 2, 1], [0, 3, 0, 1], [2, 3, 2, 1]],                // a barred gate
];

function crescent(g) {
  // One blade, its edge out along +x from the socket: thick at the socket, drawn to nothing at the edge, an arc of it.
  const C = 0.1, R = 0.36, a1 = 1.05, a0 = -1.25, N = 14, root = 0.055;
  const edge = (a) => [C + R * Math.cos(a), R * Math.sin(a)];
  // Where each rib of it starts at the socket: from the upper lobe round to the beard.
  const inner = (s) => [root + 0.035 * Math.sin(s * Math.PI), 0.135 - 0.27 * s];
  const KS = [0, 0.5, 0.86, 1], TH = [0.02, 0.0155, 0.007, 0];
  const cols = ['gunmetal', 'gunmetal', ['gunmetal', 'rime', 0.55], 'rime'];
  const rib = (s_, f) => { const e = edge(a1 + (a0 - a1) * s_), in_ = inner(s_); return KS.map((k, i) => [in_[0] + (e[0] - in_[0]) * k, in_[1] + (e[1] - in_[1]) * k, TH[i] * f]); };
  for (const f of [1, -1]) {
    for (let i = 0; i < N; i++) {
      const p = rib(i / N, f), q = rib((i + 1) / N, f);
      for (let k = 0; k < 3; k++) g.out([p[k], q[k], q[k + 1], p[k + 1]], [cols[k], cols[k], cols[k + 1], cols[k + 1]], [0.25, 0, 0]);
    }
  }
  // Its top and bottom, where the two faces don't meet.
  for (const s_ of [0, 1]) {
    const p = rib(s_, 1), q = rib(s_, -1), mid = [0.25, 0, 0];
    for (let k = 0; k < 3; k++) g.out([p[k], p[k + 1], q[k + 1], q[k]], [cols[k], cols[k + 1], cols[k + 1], cols[k]], mid);
  }
  // (And the socket's side of it, shut.)
  for (let i = 0; i < N; i++) { const p = rib(i / N, 1), q = rib((i + 1) / N, 1), p2 = rib(i / N, -1), q2 = rib((i + 1) / N, -1); g.out([p[0], q[0], q2[0], p2[0]], 'gunmetal', [0.25, 0, 0]); }
  // Three runes down each face, following the edge round.
  let k = 0;
  for (const face of [1, -1]) for (const a of [0.52, -0.08, -0.7]) {
    const r = R * 0.6, cx = C + r * Math.cos(a), cy = r * Math.sin(a), sc = 0.024, lift = 0.0125;
    const rq = [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
    g.at([cx, cy, lift * face], rq, () => {
      for (const [x0, y0, x1, y1] of RUNES[(k + (g.runeTurn || 0)) % RUNES.length]) {
        const A = [(x0 - 1) * sc, (y0 - 2) * sc], B = [(x1 - 1) * sc, (y1 - 2) * sc], d = unit([B[0] - A[0], B[1] - A[1], 0]), w = 0.0042, n = [-d[1] * w, d[0] * w];
        const z0 = 0, z1 = 0.0035 * face;
        const q = [[A[0] - n[0], A[1] - n[1]], [B[0] - n[0], B[1] - n[1]], [B[0] + n[0], B[1] + n[1]], [A[0] + n[0], A[1] + n[1]]];
        const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, z0];
        g.out(q.map(([x, y]) => [x, y, z1]), 'rune', mid);
        for (let e = 0; e < 4; e++) g.out([[...q[e], z0], [...q[(e + 1) % 4], z0], [...q[(e + 1) % 4], z1], [...q[e], z1]], 'rune', mid);
      }
    });
    k++;
  }
}

function axe(g) {
  const A = AXE, top = -A.chain, head = -A.head, butt = -A.butt;
  // The chain it hangs by, from the hook down to a ring in the spike's cap.
  g.chain([0, 0, 0], [0, top, 0], 'black', 0.04, 0.013);
  // The haft: ebony, a little thicker at the butt, leather wound round its grip, three collars of bronze, an iron ferrule and a spike.
  const hy0 = butt + 0.1, hy1 = head + 0.04;
  g.rod([0, hy0, 0], [0, hy1, 0], 0.03, 'ebony', 8, 0.026);
  for (let i = 0, y = hy0 + 0.16; y < hy0 + 0.62; y += 0.042, i++) g.rod([0, y, 0], [0, y + 0.03, 0], 0.0345, i % 2 ? 'wrap' : 'wrap_dark', 8, 0.0345);
  for (const y of [hy0 + 0.12, hy0 + 0.64, head - 0.3]) g.rod([0, y, 0], [0, y + 0.03, 0], 0.04, 'bronze', 8);
  g.rod([0, hy0 - 0.012, 0], [0, hy0 + 0.035, 0], 0.036, 'black', 8, 0.032);
  g.rod([0, hy0 - 0.012, 0], [0, butt, 0], 0.03, 'black', 6, 0.002);
  // Iron langets up the haft into the head, riveted with bronze.
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 0.03, z = Math.sin(a) * 0.03;
    g.box(x - 0.006, head - 0.32, z - 0.006, x + 0.006, head - 0.02, z + 0.006, 'black');
    for (const y of [head - 0.26, head - 0.12]) g.ball([x * 1.2, y, z * 1.2], 0.009, 'bronze', [1, 1, 1], 5, 3);
  }
  // The head: the socket, banded with bronze above and below; the two blades; a spike over it, capped.
  g.at([0, head, 0], null, () => {
    g.box(-0.056, -0.15, -0.044, 0.056, 0.15, 0.044, 'black');
    for (const y of [-0.15, 0.124]) g.box(-0.064, y, -0.05, 0.064, y + 0.026, 0.05, 'bronze');
    crescent(g);
    g.runeTurn = 3;
    g.at([0, 0, 0], [0, 1, 0, 0], () => crescent(g));
    g.runeTurn = 0;
    g.rod([0, 0.15, 0], [0, 0.335, 0], 0.036, 'black', 6, 0.006);
    g.rod([0, 0.325, 0], [0, 0.35, 0], 0.016, 'bronze', 6);
    // A death's head on each face of the socket.
    for (const s of [1, -1]) {
      g.at([0, 0.012, s * 0.044], s < 0 ? [0, 1, 0, 0] : null, () => {
        g.ball([0, 0.012, 0.004], 0.05, 'bone', [1, 1.12, 0.52], 8, 5);
        g.box(-0.021, -0.058, 0, 0.021, -0.03, 0.022, 'bone');
        for (const x of [-0.019, 0.019]) g.ball([x, 0.014, 0.024], 0.0135, 'socket', [1, 1.05, 0.6], 6, 3);
        g.out([[-0.007, -0.014, 0.027], [0.007, -0.014, 0.027], [0, 0.002, 0.029]], 'socket', [0, -0.01, 0]);
        for (const x of [-0.012, 0, 0.012]) g.box(x - 0.0016, -0.056, 0.0215, x + 0.0016, -0.034, 0.0232, 'socket');
      });
    }
  });
  // Two of its old chains still on it, hanging broken from the collar under the head.
  for (const [x, z, n] of [[0.044, 0.008, 0.2], [-0.04, -0.012, 0.14]]) g.chain([x, head - 0.3, z], [x * 1.15, head - 0.3 - n, z * 1.2], 'black', 0.03, 0.01);
}

// ---- the three meshes ----

let kit = null;
export function kitMesh() {
  if (kit) return kit;
  const g = new Geo(), M = machines(0, 0, [0, 0]);
  STATIONS_BACK = M.lever.q;
  const piece = (name, fn) => { g.joint = KJ[name]; fn(g); };
  piece('hammer', hammer); piece('tongs', tongs); piece('blade', blade); piece('file', file); piece('rag', rag);
  bellows(g);
  piece('wheel', wheel); piece('axe', axe);
  kit = g.done();
  return kit;
}
// (The hammer alone, as it was drawn before there was a kit: the folk viewer and the tests look at it.)
export function hammerMesh() { const g = new Geo(); hammer(g); return g.done(); }

// The iron in the tongs' jaws: square, drawn down to a point at the end he's working, black at the jaws and hot from there out.
export function barMesh() {
  const g = new Geo(), T = TONGS, b = T.bar;
  g.joint = KJ.tongs;
  const sq = (y, k) => [[-b * k, y, -b * k], [b * k, y, -b * k], [b * k, y, b * k], [-b * k, y, b * k]];
  const ys = [T.iron, T.iron + 0.08, T.iron + 0.15, T.tip - 0.09, T.tip], ks = [1, 1, 1, 0.9, 0.3];
  const heat = [0, 0.12, 0.7, 1, 1].map((h) => ['iron', 'hot', h]);
  g.loft(ys.map((y, i) => sq(y, ks[i])), heat);
  return g.done();
}

// The coals in the hearth: a heap of lumps round the fire's heart, the ones in the middle alight. In the world's own frame.
export function coalMesh() {
  const g = new Geo(), c = inYard(STATIONS.fire, FIRE.coals);
  g.joint = KJ.yard;
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.3, lit = r < 0.2 && rnd() < 0.8;
    const h = 0.05 * (1 - r / 0.36) + 0.012;
    g.at([c[0] + Math.cos(a) * r, c[1] - 0.045 + h, c[2] + Math.sin(a) * r * 0.9], [0, Math.sin(a), 0, Math.cos(a)], () => {
      g.ball([0, 0, 0], 0.036 + rnd() * 0.026, lit ? ['coal', 'ember', 0.35 + rnd() * 0.65] : 'coal', [1.1, 0.72, 0.9], 5, 3);
    });
  }
  return g.done();
}
