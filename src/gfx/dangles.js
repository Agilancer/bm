// What hangs off a staff in the hand (a stone on a cord, a chain, a ribbon) swings under its own weight as the staff moves.
// tools/staffs2/cut.py marks each hanging part with the point it hangs from; here each is a weight on a string, in the world:
// the string's top goes where the staff takes it, the weight falls and lags and settles. Each part is then turned about its
// point so it lies along its string, and that turn is one more joint on the held staff's skinning palette.

const G = 9.8;

// Quaternions [x, y, z, w] and dual quaternions [real, dual] as the skinning palette has them.
function qmul(a, b, o = [0, 0, 0, 0]) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  o[0] = aw * bx + ax * bw + ay * bz - az * by;
  o[1] = aw * by - ax * bz + ay * bw + az * bx;
  o[2] = aw * bz + ax * by - ay * bx + az * bw;
  o[3] = aw * bw - ax * bx - ay * by - az * bz;
  return o;
}
const conj = (q) => [-q[0], -q[1], -q[2], q[3]];
function rot(q, v) {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), conj(q));
  return [p[0], p[1], p[2]];
}
// A rigid transform as a dual quaternion: turn by r, then move by t.
function dq(r, t) { return [r, qmul([t[0] * 0.5, t[1] * 0.5, t[2] * 0.5, 0], r)]; }
function dqMul(a, b) {
  const r = qmul(a[0], b[0]), d1 = qmul(a[0], b[1]), d2 = qmul(a[1], b[0]);
  return [r, [d1[0] + d2[0], d1[1] + d2[1], d1[2] + d2[2], d1[3] + d2[3]]];
}
function dqInv(a) {
  const r = conj(a[0]), d = conj(a[1]);
  return [r, d];
}
function dqApply(a, p) {
  const r = a[0], d = a[1], t = qmul(d, conj(r));
  const v = rot(r, p);
  return [v[0] + 2 * t[0], v[1] + 2 * t[1], v[2] + 2 * t[2]];
}
// A column-major rigid 4x4 to a dual quaternion.
function dqFromMat(m) {
  const t = m[0] + m[5] + m[10];
  let x, y, z, w;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = 0.25 * s; x = (m[6] - m[9]) / s; y = (m[8] - m[2]) / s; z = (m[1] - m[4]) / s; }
  else if (m[0] > m[5] && m[0] > m[10]) { const s = Math.sqrt(1 + m[0] - m[5] - m[10]) * 2; w = (m[6] - m[9]) / s; x = 0.25 * s; y = (m[4] + m[1]) / s; z = (m[8] + m[2]) / s; }
  else if (m[5] > m[10]) { const s = Math.sqrt(1 + m[5] - m[0] - m[10]) * 2; w = (m[8] - m[2]) / s; x = (m[4] + m[1]) / s; y = 0.25 * s; z = (m[9] + m[6]) / s; }
  else { const s = Math.sqrt(1 + m[10] - m[0] - m[5]) * 2; w = (m[1] - m[4]) / s; x = (m[8] + m[2]) / s; y = (m[9] + m[6]) / s; z = 0.25 * s; }
  const l = Math.hypot(x, y, z, w);
  return dq([x / l, y / l, z / l, w / l], [m[12], m[13], m[14]]);
}
const mulPoint = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const mulDir = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// The turn that takes unit a to unit b, the short way.
function arc(a, b) {
  const c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (c < -0.9999) return [1, 0, 0, 0];
  const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0];
  const q = [x, y, z, 1 + c], l = Math.hypot(...q);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

// parts: [{ pivot, length, cloth }] in the staff's own (already turned) frame. bind: the staff's model to the rig's bind space.
export class Dangles {
  constructor(parts, bind) {
    this.parts = parts.map((p) => ({ ...p, len: Math.max(p.length * 0.6, 0.04), x: null, px: null }));
    this.bind = dqFromMat(bind);
    this.unbind = dqInv(this.bind);
    this.out = new Float32Array(parts.length * 8);
    this.debug = [];
  }

  reset() { for (const p of this.parts) p.x = null; }

  // weapon: the weapon joint's 8 palette floats. view: the view model's sway matrix. toWorld: the view model's space to the world's.
  step(dt, weapon, view, toWorld, time) {
    dt = Math.min(dt, 1 / 30);
    const M = [[weapon[0], weapon[1], weapon[2], weapon[3]], [weapon[4], weapon[5], weapon[6], weapon[7]]];
    // The staff's frame to the world: the item to bind space, the palette's joint, then the arms' sway and the view.
    const toItem = dqMul(M, this.bind);
    const world = (p) => mulPoint(toWorld, mulPoint(view, dqApply(toItem, p)));
    const worldDir = (v) => mulDir(toWorld, mulDir(view, rot(toItem[0], v)));
    const itemDir = (v) => {
      // world to item: the inverse of each step's turn (view and toWorld are rigid turns here, give or take the arms' sway).
      const a = [toWorld[0] * v[0] + toWorld[1] * v[1] + toWorld[2] * v[2], toWorld[4] * v[0] + toWorld[5] * v[1] + toWorld[6] * v[2], toWorld[8] * v[0] + toWorld[9] * v[1] + toWorld[10] * v[2]];
      const b = [view[0] * a[0] + view[1] * a[1] + view[2] * a[2], view[4] * a[0] + view[5] * a[1] + view[6] * a[2], view[8] * a[0] + view[9] * a[1] + view[10] * a[2]];
      return norm(rot(conj(toItem[0]), b));
    };
    this.debug.length = 0;
    this.parts.forEach((p, i) => {
      const top = world(p.pivot);
      if (!p.x) { p.x = [top[0], top[1] - p.len, top[2]]; p.px = p.x.slice(); }
      // A weight on a string: it keeps going, falls, and drags a little in the air (a cloth more), then the string pulls it in.
      const keep = p.cloth ? 0.9 : 0.965;
      const wind = p.cloth ? 0.25 * Math.sin(time * 2.3 + i * 1.7) : 0;
      const nx = p.x[0] + (p.x[0] - p.px[0]) * keep + wind * dt * dt * 6;
      const ny = p.x[1] + (p.x[1] - p.px[1]) * keep - G * dt * dt;
      const nz = p.x[2] + (p.x[2] - p.px[2]) * keep;
      p.px = p.x;
      const d = norm([nx - top[0], ny - top[1], nz - top[2]]);
      p.x = [top[0] + d[0] * p.len, top[1] + d[1] * p.len, top[2] + d[2] * p.len];
      // Along its string, in the staff's frame. It was made hanging straight down the staff (-Y): turn it from there,
      // never further than a part could go before it would be lying across the staff.
      let s = itemDir(d);
      const down = [0, -1, 0], c = -s[1], limit = Math.cos(1.2);
      if (c < limit) {
        const side = norm([s[0], 0, s[2]]), k = Math.sin(1.2);
        s = [side[0] * k, -limit, side[2] * k];
      }
      const r = arc(down, s);
      // About its point: move the point to the origin, turn, move it back.
      const rp = rot(r, p.pivot), local = dq(r, [p.pivot[0] - rp[0], p.pivot[1] - rp[1], p.pivot[2] - rp[2]]);
      const j = dqMul(M, dqMul(this.bind, dqMul(local, this.unbind)));
      this.out.set([...j[0], ...j[1]], i * 8);
      this.debug.push({ hang: s, down: itemDir([0, -1, 0]) });
    });
    void worldDir;
    return this.out;
  }
}
