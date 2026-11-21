// Things that stand in three of Castle Velscour's dungeons (src/core/delve-castle-a.js: the Drowned Archive, the Gallery of
// a Thousand Portraits, the Alchemists' Undercroft), built as src/core/delve-build.js PROPS are and taken into them: a prop
// is (K, d, p, x, y, z), K the Kit, d the delve, p the prop as written, (x, y, z) where it stands on its floor.
//
// His castle: nothing here makes a cross or a T. A pipe turns at its end and never branches; a frame's two posts stop at
// its head; a press is two screws and a block between; a wheel is somebody else's (src/core/delve-props-b.js gear: three
// spokes or five). No letters on a label, a spine or a card.
import { caveFloorY, caveRoofY } from './dungeon.js';
import { hash2 } from './terrain-noise.js';

const TAU = Math.PI * 2, NO = { collide: false };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// A bar from a to b, t thick: four sides.
function bar(K, layer, a, b, t) {
  const d = unit(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], u = unit(cross(d, up)), v = cross(u, d);
  const C = (p, i) => { const su = (i === 0 || i === 3 ? -1 : 1) * t / 2, sv = (i < 2 ? -1 : 1) * t / 2; return [p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv]; };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; K.quad(layer, C(a, i), C(a, j), C(b, j), C(b, i)); }
}
// A frame facing yaw at (x, y, z): F(u across, h up, o out toward the room) is a point of it; F.n the way it faces.
function frame(x, y, z, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), F = (u, h, o = 0) => [x + u * c + o * s, y + h, z - u * s + o * c];
  F.n = [s, 0, c]; F.c = c; F.s = s;
  return F;
}
const face = (K, layer, F, u0, u1, h0, h1, o, uvs = null) => K.quad(layer, F(u0, h0, o), F(u1, h0, o), F(u1, h1, o), F(u0, h1, o), F.n, uvs);
// A slab stood at (x, y, z), w half across (along yaw's right), h tall, t thick, leaning `lean` radians from upright the
// way it faces: front and back in `layer`, its edges in `edge`.
function slab(K, layer, edge, x, y, z, yaw, w, h, t, lean = 0, roll = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll), cl = Math.cos(lean), sl = Math.sin(lean);
  // (Rolled: its across tipped up at one end, in its own plane. Leaned: its up tipped the way it faces.)
  const ax = [c * cr, sr, -s * cr], flat = [-c * sr, cr, s * sr], n0 = [s, 0, c];
  const up = [flat[0] * cl + n0[0] * sl, flat[1] * cl + n0[1] * sl, flat[2] * cl + n0[2] * sl], n = [n0[0] * cl - flat[0] * sl, n0[1] * cl - flat[1] * sl, n0[2] * cl - flat[2] * sl];
  const P = (u, v, o) => [x + ax[0] * u + up[0] * v + n[0] * o, y + ax[1] * u + up[1] * v + n[1] * o, z + ax[2] * u + up[2] * v + n[2] * o];
  K.quad(layer, P(-w, 0, t), P(w, 0, t), P(w, h, t), P(-w, h, t), n, [[0, h / 1.76], [w * 2 / 1.2, h / 1.76], [w * 2 / 1.2, 0], [0, 0]]);
  K.quad(layer, P(w, 0, -t), P(-w, 0, -t), P(-w, h, -t), P(w, h, -t), n.map((v) => -v), [[0, h / 1.76], [w * 2 / 1.2, h / 1.76], [w * 2 / 1.2, 0], [0, 0]]);
  K.quad(edge, P(-w, 0, -t), P(-w, 0, t), P(-w, h, t), P(-w, h, -t), ax.map((v) => -v));
  K.quad(edge, P(w, 0, t), P(w, 0, -t), P(w, h, -t), P(w, h, t), ax);
  K.quad(edge, P(-w, h, t), P(w, h, t), P(w, h, -t), P(-w, h, -t), up);
}

// A sitter, head and shoulders, in a frame's own plane: um its middle, sw half its shoulders, from v up sh. One of six: plain,
// hatted, hooded, crowned, horned, a child (drawn lower by who calls it).
function bust(K, F, um, sw, v, sh, liv, kind, t) {
  const o = 0.065, Q = (layer, a, b, c, e, oo = o) => K.quad(layer, F(a[0], a[1], oo), F(b[0], b[1], oo), F(c[0], c[1], oo), F(e[0], e[1], oo), F.n);
  Q(liv, [um - sw, v], [um + sw, v], [um + sw * 0.45 + t, v + sh * 0.45], [um - sw * 0.45 + t, v + sh * 0.45]);
  const fx = um + t, f0 = v + sh * 0.5, f1 = v + sh * 0.8, fw = sw * 0.32;
  if (kind === 2) Q(liv, [fx - fw * 1.7, f0 - sh * 0.08], [fx + fw * 1.7, f0 - sh * 0.08], [fx + fw * 1.2, f1 + sh * 0.1], [fx - fw * 1.2, f1 + sh * 0.1], 0.068);   // (a hood round the face)
  Q('pale:cloth_oat', [fx - fw, f0], [fx + fw, f0], [fx + fw * 1.1, f1], [fx - fw * 1.1, f1], 0.07);
  if (kind === 1) { Q('char:wood', [fx - fw * 2.2, f1 - sh * 0.02], [fx + fw * 2.2, f1 - sh * 0.02], [fx + fw * 2.2, f1 + sh * 0.03], [fx - fw * 2.2, f1 + sh * 0.03], 0.072); Q('char:wood', [fx - fw * 1.1, f1 + sh * 0.03], [fx + fw * 1.1, f1 + sh * 0.03], [fx + fw * 0.9, f1 + sh * 0.14], [fx - fw * 0.9, f1 + sh * 0.14], 0.072); }
  if (kind === 3) Q('p2_bronze_plates', [fx - fw * 1.1, f1], [fx + fw * 1.1, f1], [fx + fw * 1.4, f1 + sh * 0.09], [fx - fw * 1.4, f1 + sh * 0.09], 0.072);
  // (Horned: two, rising apart from the brow, his own V.)
  if (kind === 4) for (const e of [-1, 1]) Q('char:wood', [fx + e * fw * 0.5, f1], [fx + e * fw * 1.0, f1], [fx + e * fw * 1.9, f1 + sh * 0.16], [fx + e * fw * 1.7, f1 + sh * 0.16], 0.072);
}

export const PROPS_A = {
  // ---- the Drowned Archive ----
  // A sheet of standing water, hx by hz, lying `lvl` over the delve's own floor height (so it lies level over floor
  // that's been sunk under it: a room's daises with a dy below nothing). Dark and slick, darker still in a band round
  // its edge; leaves and boards afloat on it (float: how many); a pale glint where a light stands over it (glints:
  // [[x, z], ...], local to the delve).
  flood(K, d, p, x, y, z) {
    const y0 = d.y + (p.lvl ?? 0.1), hx = p.hx, hz = p.hz, e = Math.min(1.6, Math.min(hx, hz) * 0.3);
    const Q = (layer, x0, x1, z0, z1, up) => K.quad(layer, [x + x0, y0 + up, z + z0], [x + x0, y0 + up, z + z1], [x + x1, y0 + up, z + z1], [x + x1, y0 + up, z + z0], [0, 1, 0]);
    Q('dark:lake', -hx, hx, -hz, hz, 0);
    // (Its edge: the dark under the walls, a frame of four strips that meet at their ends and none across.)
    Q('char:lake', -hx, hx, -hz, -hz + e, 0.012); Q('char:lake', -hx, hx, hz - e, hz, 0.012);
    Q('char:lake', -hx, -hx + e, -hz + e, hz - e, 0.012); Q('char:lake', hx - e, hx, -hz + e, hz - e, 0.012);
    const n = p.float ?? Math.round(hx * hz / 14);
    for (let k = 0; k < n; k++) {
      const u = (hash2(k * 7 + x * 0.3, z * 0.7 + k) * 2 - 1) * (hx - 0.8), v = (hash2(k * 3 + z * 0.3, x * 0.9 - k) * 2 - 1) * (hz - 0.8), a = hash2(k, x + z) * TAU, kind = hash2(k * 5, x - z);
      const c = Math.cos(a), s = Math.sin(a), fx = x + u, fz = z + v;
      const R = (layer, w, l, up) => K.quad(layer, [fx - c * w - s * l, y0 + up, fz + s * w - c * l], [fx - c * w + s * l, y0 + up, fz + s * w + c * l], [fx + c * w + s * l, y0 + up, fz - s * w + c * l], [fx + c * w - s * l, y0 + up, fz - s * w - c * l], [0, 1, 0]);
      // (A loose leaf, a board of a broken case, a book lying open on its face.)
      if (kind < 0.6) R('pale:cloth_oat', 0.13, 0.19, 0.02);
      else if (kind < 0.85) R('dark:wood', 0.16, 0.7 + kind, 0.03);
      else K.box('p2_book_spines', fx, y0 - 0.05, fz, 0.2, 0.11, 0.14, a, NO);
    }
    for (const [gx, gz] of p.glints || []) {
      const wx = d.x + gx, wz = d.z + gz;
      // (A broken streak of it, three pieces end to end, lying the way the light falls from.)
      for (let k = 0; k < 3; k++) K.quad('pale:lake', [wx - 0.12, y0 + 0.02, wz - 0.9 + k * 0.62], [wx - 0.12, y0 + 0.02, wz - 0.42 + k * 0.62], [wx + 0.12 + k * 0.05, y0 + 0.02, wz - 0.42 + k * 0.62], [wx + 0.12 + k * 0.05, y0 + 0.02, wz - 0.9 + k * 0.62], [0, 1, 0]);
    }
  },
  // A tall case of books gone over in the water: leaning `lean` from upright the way it faces (yaw), sunk `sink` into the
  // floor, w half across and h tall; a case shelved both sides, its spines on both its faces.
  leanshelf(K, d, p, x, y, z) {
    slab(K, 'p2_book_spines', 'dark:wood', x, y - (p.sink ?? 0.8), z, p.yaw || 0, p.w || 2.2, p.h || 5, 0.3, p.lean ?? 0.5, p.roll || 0);
  },
  // The card-cases of a catalogue: a run of drawers hx or hz long, shoulder high, a brass pull to each; some pulled out,
  // their cards on the floor.
  cardcase(K, d, p, x, y, z) {
    const long = (p.hz || 0) >= (p.hx || 0), a = long ? p.hz : p.hx, t = 0.42, h = p.h || 1.6, yaw = long ? Math.PI / 2 : 0;
    K.box('dark:wood', x, y, z, long ? t : a, h, long ? a : t, 0, NO);
    K.box('dark:wood', x, y + h, z, (long ? t : a) + 0.06, 0.08, (long ? a : t) + 0.06, 0, NO);
    for (const sd of [-1, 1]) {
      const F = frame(x, y, z, yaw + (sd > 0 ? 0 : Math.PI));
      for (let row = 0; row < 5; row++) for (let u = -a + 0.3; u < a - 0.1; u += 0.5) {
        const hy = 0.2 + row * (h - 0.25) / 5, k = hash2(Math.round(u * 10) + row * 31 + sd * 7, x * 3 + z);
        // (A pulled drawer stands out a hand, a card or two on the floor under it; a shut one is its brass.)
        if (k > 0.93) {
          const q = F(u, hy - 0.06, t + 0.2), c = F(u + 0.3, 0, t + 0.5 + k);
          K.box('wood', q[0], q[1], q[2], 0.2, 0.2, 0.2, yaw, NO);
          K.quad('pale:cloth_oat', [c[0] - 0.1, y + 0.02, c[2] - 0.14], [c[0] - 0.1, y + 0.02, c[2] + 0.14], [c[0] + 0.1, y + 0.02, c[2] + 0.14], [c[0] + 0.1, y + 0.02, c[2] - 0.14], [0, 1, 0]);
        }
        face(K, 'p2_bronze_plates', F, u - 0.05, u + 0.05, hy, hy + 0.05, t + 0.012);
      }
      // (The rows of drawer fronts: a shadow line between each.)
      for (let row = 1; row < 5; row++) face(K, 'char:wood', F, -a + 0.05, a - 0.05, 0.12 + row * (h - 0.25) / 5, 0.15 + row * (h - 0.25) / 5, t + 0.008);
    }
  },
  // A binder's standing press: a bed, two screws, and the block between them wound down on a book. (The screws stop at
  // the head they turn in.)
  press(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, F = frame(x, y, z, yaw), w = p.w || 0.9, h = p.h || 2.2;
    K.box('dark:wood', x, y, z, w + 0.2, 0.5, 0.6, yaw, NO);
    for (const u of [-w, w]) { const q = F(u, 0.5, 0); K.drum('iron', q[0], q[1], q[2], 0.09, h - 0.75, 8, NO); }
    K.box('dark:wood', x, y + h - 0.25, z, w + 0.2, 0.3, 0.45, yaw, NO);
    K.box('wood', x, y + 0.5 + (p.down ?? 0.5), z, w - 0.14, 0.22, 0.5, yaw, NO);
    K.box('p2_book_spines', x, y + 0.5, z, w - 0.3, p.down ?? 0.5, 0.36, yaw, NO);
  },

  // ---- the Gallery of a Thousand Portraits ----
  // A wall hung floor to ceiling: a stretch w either way along it from (x, z), facing yaw into the room, from `lo` over
  // the floor up to `h`. Row on row of his house, flat in their frames, no two frames' sizes the same: a dark ground, a
  // sitter's shoulders in one of his liveries, a pale face. skip: [[u0, u1], ...] stretches along it left bare (a doorway).
  // s: how big they are (1; a cabinet's miniatures a third of that, a rotunda's great ones half as big again).
  hangwall(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), w = p.w, top = p.h || 8, lo = p.lo ?? 0.7, skip = p.skip || [], S = p.s || 1;
    const LIV = ['royal:cloth_red', 'cloth_red', 'dark:cloth_oat', 'pale:cloth_oat', 'blood:cloth_red', 'royal:cloth_red'];
    const FR = ['dark:wood', 'p2_bronze_plates', 'char:wood', 'dark:wood'];
    let row = 0;
    for (let h0 = lo; h0 < top - 0.7 * S; row++) {
      const rh = Math.min(top - h0, (1.25 + 0.75 * hash2(row * 13 + x, z + row * 5)) * S);
      for (let u = -w + 0.1 + 0.5 * S * hash2(row, x + z); u < w - 0.6 * S;) {
        const k = hash2(Math.round(u * 7) + row * 17, x * 5 + z * 3), cw = Math.min(w - u - 0.05, ((k * 19) % 1 < 0.62 ? 0.8 + 0.2 * k : 1.5 + 0.3 * k) * S);
        if (cw < 0.5 * S) break;
        const g = 0.07 * Math.min(1, S * 1.4), u0 = u + g, u1 = u + cw - g, v0 = h0 + g, v1 = h0 + rh - g, um = (u0 + u1) / 2;
        u += cw;
        if (skip.some(([a, b]) => u1 > a && u0 < b) || k > 0.94) continue;   // (and now and then a gap: one's been taken down)
        face(K, FR[Math.floor(k * 37) % 4], F, u0, u1, v0, v1, 0.04);
        const m = Math.min(0.11, (u1 - u0) * 0.14);
        // (Now and then an empty frame, the wall through it; or a canvas slashed corner to corner, its sitter gone.)
        const fate = (k * 29) % 1;
        if (fate < 0.04) { face(K, 'char:stone', F, u0 + m, u1 - m, v0 + m, v1 - m, 0.045); continue; }
        face(K, 'char:cloth_oat', F, u0 + m, u1 - m, v0 + m, v1 - m, 0.055);
        if (fate < 0.06) { K.quad('pale:cloth_oat', F(u0 + m, v0 + m, 0.062), F(u0 + m + 0.09, v0 + m, 0.062), F(u1 - m, v1 - m, 0.062), F(u1 - m - 0.09, v1 - m, 0.062), F.n); continue; }
        const iw = u1 - u0 - 2 * m, sh = v1 - v0 - 2 * m, t = (k * 11 % 1 - 0.5) * 0.12, liv = LIV[Math.floor(k * 53) % 6], kind = Math.floor(k * 71) % 7;
        if (kind === 6) { bust(K, F, um - iw * 0.22, iw * 0.21, v0 + m, sh, liv, 0, t); bust(K, F, um + iw * 0.22, iw * 0.21, v0 + m, sh * 0.9, LIV[(Math.floor(k * 53) + 2) % 6], 2, -t); }
        else bust(K, F, um, iw * 0.36, v0 + m, kind === 5 ? sh * 0.62 : sh, liv, kind, t);
      }
      h0 += rh;
    }
  },
  // A ring of stone carried round on the heads of a ring of piers, r out from (x, z) at `up`: the Rotunda's drum.
  ringbeam(K, d, p, x, y, z) {
    const N = p.n || 24, r = p.r, y0 = y + p.up, hh = p.h || 1.2, t = p.t || 0.8, L = p.layer || 'dark:stone';
    for (let k = 0; k < N; k++) {
      const a = (k + 0.5) / N * TAU;
      K.box(L, x + Math.cos(a) * r, y0, z + Math.sin(a) * r, t / 2, hh, Math.PI * r / N + 0.04, -a, NO);
    }
    // (And his blue hung under it right round, a short fall of cloth.)
    if (p.cloth) for (let k = 0; k < N; k++) {
      const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, P = (a, yy) => [x + Math.cos(a) * (r - t / 2 - 0.02), yy, z + Math.sin(a) * (r - t / 2 - 0.02)];
      K.quad(p.cloth, P(a0, y0 - 1.3), P(a1, y0 - 1.3), P(a1, y0), P(a0, y0), [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)]);
    }
  },
  // A canvas on its easel, facing yaw: two legs up to a point and one behind (no bar across them), a ledge, the canvas
  // stood on it; primed and bare, or begun (sitter: a livery's colour).
  easel(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), k = p.sz || 1, h = 2.5 * k;
    bar(K, 'dark:wood', F(-0.55 * k, 0, 0), F(0, h, -0.12), 0.07); bar(K, 'dark:wood', F(0.55 * k, 0, 0), F(0, h, -0.12), 0.07);
    bar(K, 'dark:wood', F(0, 0, -0.95 * k), F(0, h, -0.12), 0.06);
    { const q = F(0, 0.78 * k, 0.07); K.box('dark:wood', q[0], q[1], q[2], 0.62 * k, 0.05, 0.07, p.yaw || 0, NO); }
    face(K, 'pale:cloth_oat', F, -0.6 * k, 0.6 * k, 0.84 * k, 2.3 * k, 0.09);
    if (!p.sitter) return;
    K.quad(p.sitter, F(-0.4 * k, 0.84 * k, 0.1), F(0.4 * k, 0.84 * k, 0.1), F(0.2 * k, 1.5 * k, 0.1), F(-0.2 * k, 1.5 * k, 0.1), F.n);
    K.quad('char:cloth_oat', F(-0.13 * k, 1.55 * k, 0.1), F(0.13 * k, 1.55 * k, 0.1), F(0.15 * k, 1.95 * k, 0.1), F(-0.15 * k, 1.95 * k, 0.1), F.n);
  },

  // Frames stacked against a wall, facing yaw out from it: n of them one inside another's lean, each four lengths of
  // moulding mitred at its corners, the wall seen through them.
  framestack(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), n = p.n || 4;
    for (let i = 0; i < n; i++) {
      const k = hash2(i * 7 + x, z * 3 + i), w = (p.w || 1.3) * (1 - i * 0.13) * (0.9 + 0.2 * k), h = (p.h || 2.2) * (1 - i * 0.1), o = 0.12 + i * 0.16, u = (k - 0.5) * 0.5, t = 0.09;
      const L = ['dark:wood', 'p2_bronze_plates', 'char:wood', 'wood'][(i + Math.floor(k * 4)) % 4], B = (a, b) => bar(K, L, F(a[0], a[1], o + a[1] * -0.06), F(b[0], b[1], o + b[1] * -0.06), t);
      B([u - w, 0.05], [u + w, 0.05]); B([u - w, h], [u + w, h]); B([u - w, 0.05], [u - w, h]); B([u + w, 0.05], [u + w, h]);
    }
  },
  // A canvas the size of a wall, stretched on it and half painted: w either way from (x, z), from lo up to h, facing yaw.
  // Primed and bare at one end; at the other his house in rows, done; between, figures blocked in and not yet faced.
  canvaswall(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), w = p.w, lo = p.lo ?? 0.8, top = p.h || 10;
    face(K, 'dark:wood', F, -w - 0.2, w + 0.2, lo - 0.2, top + 0.2, 0.03); face(K, 'pale:cloth_oat', F, -w, w, lo, top, 0.05);
    const LIV = ['royal:cloth_red', 'cloth_red', 'dark:cloth_oat', 'blood:cloth_red'];
    for (let row = 0, v = lo + 0.3; v + 2.6 < top; row++, v += 3) for (let u = -w + 1.2; u < w * 0.45; u += 2.3) {
      const k = hash2(Math.round(u * 3) + row * 11, x + z), done = u < -w * 0.25;
      // (Done: a sitter whole. Begun: the shoulders laid in and a ground behind, no face yet.)
      face(K, 'char:cloth_oat', F, u - 0.95, u + 0.95, v, v + 2.5, 0.055);
      if (done) bust(K, F, u, 0.7, v, 2.5, LIV[Math.floor(k * 4)], Math.floor(k * 23) % 5, (k - 0.5) * 0.1);
      else K.quad(LIV[Math.floor(k * 4)], F(u - 0.7, v, 0.065), F(u + 0.7, v, 0.065), F(u + 0.3, v + 1.1, 0.065), F(u - 0.3, v + 1.1, 0.065), F.n);
    }
  },
  // Sheets hung to dry on a line between two posts (the line from the posts' heads, the sheets under it), along yaw.
  sheets(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, F = frame(x, y, z, yaw), w = p.w || 3, h = p.h || 2.6;
    for (const u of [-w, w]) { const q = F(u, 0, 0); K.box('dark:wood', q[0], q[1], q[2], 0.06, h, 0.06, yaw, NO); }
    bar(K, 'dark:wood', F(-w, h, 0), F(w, h, 0), 0.04);
    for (let u = -w + 0.3; u < w - 0.6; u += 0.85) {
      const k = hash2(Math.round(u * 5) + x, z), len = 1.0 + 0.9 * k;
      for (const sd of [-1, 1]) K.quad(k > 0.8 ? 'cloth_oat' : 'pale:cloth_oat', F(u, h - 0.04 - len, sd * 0.012), F(u + 0.7, h - 0.04 - len, sd * 0.012), F(u + 0.7, h - 0.04, sd * 0.012), F(u, h - 0.04, sd * 0.012), F.n.map((q) => q * sd));
    }
  },

  // ---- the Alchemists' Undercroft ----
  // A copper still as tall as two men: a firebox of block with its fire in it, the drum on that, banded, its head drawn
  // up to a neck. (Its neck's pipe is a `pipe` of its own, from neck: where that starts.) r: its radius; h: the drum's height.
  copper(K, d, p, x, y, z) {
    const r = p.r || 1.2, h = p.h || 2.4, yaw = p.yaw || 0, F = frame(x, y, z, yaw);
    K.box('soot:block', x, y, z, r + 0.2, 0.9, r + 0.2, yaw, NO);
    face(K, 'char:stone', F, -0.36, 0.36, 0.14, 0.7, r + 0.21); face(K, 'flame', F, -0.26, 0.26, 0.2, 0.5, r + 0.22);
    K.drum(p.layer || 'p2_bronze_plates', x, y + 0.9, z, r, h, 14, NO);
    for (const f of [0.08, 0.5, 0.92]) K.drum('umber:p2_bronze_plates', x, y + 0.9 + h * f - 0.07, z, r + 0.04, 0.14, 14, { open: true, collide: false });
    K.drum('p2_bronze_plates', x, y + 0.9 + h, z, r, 0.7, 14, { r2: 0.34, collide: false });
    K.drum('umber:p2_bronze_plates', x, y + 1.6 + h, z, 0.3, 0.5, 8, NO);
    // (A row of rivets' worth of shadow down its seam, and a tap.)
    { const q = F(0, 1.3, r + 0.02); K.drum('iron', q[0], q[1], q[2], 0.07, 0.07, 6, NO); const t = F(0.5, 0.9 + h * 0.3, r * 0.9); bar(K, 'iron', t, F(0.5, 0.9 + h * 0.3, r + 0.4), 0.06); }
  },
  // A run of copper pipe through pts: [[x, z, up], ...] (local to the delve; up over the floor under each). It turns at
  // each and never branches; a collar at each turn.
  pipe(K, d, p) {
    const t = p.t || 0.34, L = p.layer || 'p2_bronze_plates';
    const W = p.pts.map(([px, pz, up]) => [d.x + px, caveFloorY(d.x + px, d.z + pz) + up, d.z + pz]);
    for (let k = 1; k < W.length; k++) {
      bar(K, L, W[k - 1], W[k], t);
      if (k < W.length - 1) K.drum('iron', W[k][0], W[k][1] - t * 0.7, W[k][2], t * 0.85, t * 1.4, 8, NO);
    }
  },
  // A bench of small work: a board on trestles, two or three little stills on it, flasks of green glass, a candle.
  benchstills(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, F = frame(x, y, z, yaw), w = p.w || 1.8;
    K.box('wood', x, y + 0.82, z, w, 0.07, 0.5, yaw, NO);
    for (const u of [-w + 0.25, w - 0.25]) { const q = F(u, 0, 0); K.box('dark:wood', q[0], q[1], q[2], 0.06, 0.82, 0.42, yaw, NO); }
    for (let k = 0; k < 3; k++) {
      const u = -w + 0.5 + k * (w - 0.5), q = F(u, 0.89, k % 2 ? 0.12 : -0.1), rr = 0.2 + 0.05 * (k % 2);
      K.drum('umber:p2_bronze_plates', q[0], q[1], q[2], rr, 0.34, 8, NO); K.drum('umber:p2_bronze_plates', q[0], q[1] + 0.34, q[2], rr, 0.2, 8, { r2: 0.06, collide: false });
      bar(K, 'umber:p2_bronze_plates', [q[0], q[1] + 0.52, q[2]], F(u + 0.42, 1.2, 0.02), 0.05);
    }
    for (let k = 0; k < 5; k++) { const q = F(-w + 0.3 + k * 0.37 + (k > 2 ? 0.6 : 0), 0.89, 0.32 - (k % 2) * 0.62); K.drum('forest:obsidian', q[0], q[1], q[2], 0.07, 0.14 + 0.07 * (k % 3), 6, { r2: 0.04, collide: false }); }
  },
  // A great vessel of banded green glass on a stone stand, as tall as p.h: three iron bands, an iron lid; and on the side
  // it faces (yaw), where a lamp of his red's been set behind it, what's in it against the light.
  glassjar(K, d, p, x, y, z) {
    const r = p.r || 1, h = p.h || 2.8, yaw = p.yaw || 0, N = 14, y0 = y + 0.5;
    K.box('dark:block', x, y, z, r + 0.15, 0.5, r + 0.15, yaw, NO);
    K.drum('forest:obsidian', x, y0, z, r, h, N, { collide: false, turn: yaw });
    for (const f of [0.04, 0.5, 0.96]) K.drum('iron', x, y0 + h * f - 0.06, z, r + 0.03, 0.12, N, { open: true, collide: false, turn: yaw });
    K.drum('iron', x, y0 + h, z, r + 0.05, 0.16, N, { r2: r * 0.5, collide: false, turn: yaw });
    // (The lit side: three staves of the glass with the lamp behind them, and the dark of what floats there.)
    const F = frame(x, y0, z, yaw), o = r * Math.cos(Math.PI / N) + 0.015, hw = r * 0.62;
    // (The lamp seen through green glass is green: it was 'blood:flame', a red door in the wall with a man in it.)
    face(K, 'mire:flame', F, -hw, hw, h * 0.1, h * 0.9, o);
    // (And the glass's shine: a pale stave up each shoulder of it.)
    for (const sd of [-1, 1]) { const a = yaw + sd * 1.25, sx = x + Math.sin(a) * (r + 0.012), sz = z + Math.cos(a) * (r + 0.012), tx = Math.cos(a) * 0.07, tz = -Math.sin(a) * 0.07; K.quad('pale:lake', [sx - tx, y0 + h * 0.12, sz - tz], [sx + tx, y0 + h * 0.12, sz + tz], [sx + tx, y0 + h * 0.88, sz + tz], [sx - tx, y0 + h * 0.88, sz - tz], [Math.sin(a), 0, Math.cos(a)]); }
    const P = (u, v) => F(u * r, v * h, o + 0.012), Q = (a, b, c, e) => K.quad('char:stone', P(...a), P(...b), P(...c), P(...e), F.n);
    const k = (hash2(x * 3, z * 5) - 0.5) * 0.2;
    // (A body hung in it: a trunk, round at both ends, and a head bowed on it. Nothing thin, nothing crossed, no limb out.)
    Q([-0.2 + k, 0.24], [0.2 + k, 0.24], [0.32 + k, 0.36], [-0.32 + k, 0.36]);
    Q([-0.32 + k, 0.36], [0.32 + k, 0.36], [0.3 + k, 0.56], [-0.3 + k, 0.56]);
    Q([-0.3 + k, 0.56], [0.3 + k, 0.56], [0.14 + k, 0.64], [-0.14 + k, 0.64]);
    Q([-0.1 + k * 1.6, 0.64], [0.16 + k * 1.6, 0.64], [0.2 + k * 1.6, 0.72], [-0.14 + k * 1.6, 0.72]);
    Q([-0.14 + k * 1.6, 0.72], [0.2 + k * 1.6, 0.72], [0.12 + k * 1.6, 0.79], [-0.06 + k * 1.6, 0.79]);
  },
};
