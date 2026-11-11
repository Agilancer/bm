// Homunculus at his anvil: the hammer, how his hand holds it, and where it lies when it's out of his hand. Shared by the
// town's thread (src/folk/folk.worker.js, which says where the hammer is), the renderer (src/gfx/folktools.js, which draws
// it), the folk viewer, and tools/folk/smith_clips.mjs, which makes the clips he works by so that the hammer's face comes
// down on the anvil's.
//
// The forge's own frame: he stands at its origin, on the floor, facing +z, his left to +x. The anvil
// (Home.anvil in tools/interior/build_interior.py) stands across his front, its horn to his left.
import { quatFromMat3, quatMul, quatRotate } from '../core/math.js';

export const FORGE = {
  off: 0.56,                    // from where he stands to the middle of the anvil
  face: 0.88,                   // the anvil's face, above the floor
  strike: [-0.12, 0.88, 0.56],  // where the blows land: the middle of the face, a little to his hammer hand's side
};

// The hammer in its own frame: the handle up +y, the hand's grip at the origin, the face to +z and the peen to -z.
export const HAMMER = {
  butt: -0.1, top: 0.275, handle: 0.015,       // the handle: from, to, and its half thickness
  head: 0.25, cheek: 0.024, eye: 0.026,        // the head: how far up the handle its middle is, half its width, half its height
  face: 0.062, peen: -0.068,                   // how far the face and the peen stand out from the handle
};

// The clips he works by (assets/game/folk/clips.*, made by tools/folk/smith_clips.mjs), and the moments in them that matter:
// when the blow lands in `hammer`, and when his hand closes on the handle in `hammer_take` (played backwards to put it down).
export const SMITH_CLIPS = { blow: 'hammer', hold: 'hammer_hold', take: 'hammer_take', blowAt: 0.6, takeAt: 0.5 };

const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// The turn that takes the hammer's own axes to: its handle along `h`, its face towards `c` (made square to h).
export function hammerQuat(h, c) {
  const y = unit(h), x = unit(cross(y, c)), z = cross(x, y);
  return quatFromMat3([x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]]);
}

// How a right hand holds it, read off a body's rest pose: the handle along the knuckles, out past the forefinger; the face
// the way the knuckles point; the grip in the palm, under the middle finger's root.
//   q, t: the hammer's frame in the hand joint's own.   k, f, palm: the knuckle line, the fingers' way and the palm's, at rest.
export function gripOf(rig) {
  const j = (n) => rig.index.get(`mixamorig:RightHand${n}`);
  const P = (i) => [rig.rest.t[i * 3], rig.rest.t[i * 3 + 1], rig.rest.t[i * 3 + 2]];
  const hand = rig.hands[1], w = P(hand), mid = P(j('Middle1')), ix = P(j('Index1')), pk = P(j('Pinky1'));
  const k = unit([ix[0] - pk[0], ix[1] - pk[1], ix[2] - pk[2]]);
  let f = [mid[0] - w[0], mid[1] - w[1], mid[2] - w[2]];
  const along = dot(f, k);
  f = unit([f[0] - k[0] * along, f[1] - k[1] * along, f[2] - k[2] * along]);
  // (Every body's bound with its palms to the floor.)
  let palm = cross(k, f);
  if (palm[1] > 0) palm = [-palm[0], -palm[1], -palm[2]];
  const reach = Math.hypot(mid[0] - w[0], mid[1] - w[1], mid[2] - w[2]);
  const at = [0, 1, 2].map((i) => w[i] + (mid[i] - w[i]) * 0.86 + palm[i] * reach * 0.3);
  const inv = [-rig.rest.q[hand * 4], -rig.rest.q[hand * 4 + 1], -rig.rest.q[hand * 4 + 2], rig.rest.q[hand * 4 + 3]];
  const q = [0, 0, 0, 1], t = [0, 0, 0];
  quatMul(q, 0, inv, 0, hammerQuat(k, f), 0);
  quatRotate(t, 0, inv, 0, [at[0] - w[0], at[1] - w[1], at[2] - w[2]], 0);
  return { q, t, k, f, palm, at: [at[0] - w[0], at[1] - w[1], at[2] - w[2]] };
}

// Where it's left when it's out of his hand, in the forge's frame: stood on its face on the anvil's, where the last blow fell,
// the handle level and out over the near edge towards his hammer hand, to be taken as it's held. { q, t }: the hammer's frame.
export const HAMMER_REST = (() => {
  const h = unit([0.2, 0, 1]), q = hammerQuat(h, [0, -1, 0]);
  const face = [-0.05, FORGE.face, FORGE.off - 0.012];
  return { q, t: [face[0] - h[0] * HAMMER.head, face[1] + HAMMER.face, face[2] - h[2] * HAMMER.head] };
})();

// The forge's frame for someone standing at (x, y, z) facing yaw, and the hammer at rest in the world from it.
export function hammerAtRest(x, y, z, yaw) {
  const root = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], q = [0, 0, 0, 1], t = [0, 0, 0];
  quatMul(q, 0, root, 0, HAMMER_REST.q, 0);
  quatRotate(t, 0, root, 0, HAMMER_REST.t, 0);
  return { q, t: [t[0] + x, t[1] + y, t[2] + z] };
}

// A frame (q at qi, t at ti) as one joint of a skinning palette: a dual quaternion, as src/folk/rig.js writes them.
export function writeDQ(out, o, q, qi, t, ti) {
  const x = q[qi], y = q[qi + 1], z = q[qi + 2], w = q[qi + 3], tx = t[ti], ty = t[ti + 1], tz = t[ti + 2];
  out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
  out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
  out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
  out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
  out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
}

// Where a palette joint's frame has its origin.
export function dqOrigin(p, o, out = [0, 0, 0]) {
  const x = p[o], y = p[o + 1], z = p[o + 2], w = p[o + 3], dx = p[o + 4], dy = p[o + 5], dz = p[o + 6], dw = p[o + 7];
  out[0] = 2 * (w * dx - dw * x + (y * dz - z * dy));
  out[1] = 2 * (w * dy - dw * y + (z * dx - x * dz));
  out[2] = 2 * (w * dz - dw * z + (x * dy - y * dx));
  return out;
}

// The hammer as a mesh in its own frame: { pos, nrm, uv, idx }. u picks its colour off a strip of four (HAMMER_PAINT).
export const HAMMER_PAINT = [
  [112, 82, 50, 235, 0],      // ash, handled smooth: colour, roughness, metal
  [150, 118, 78, 245, 0],     // its cut ends
  [44, 42, 42, 150, 215],     // the head, black from the fire
  [150, 148, 142, 95, 235],   // the face and the peen, worn bright
];
export function hammerMesh() {
  const pos = [], nrm = [], uv = [], idx = [];
  const quad = (a, b, c, d, n, col) => {
    const o = pos.length / 3;
    for (const p of [a, b, c, d]) { pos.push(...p); nrm.push(...n); uv.push((col + 0.5) / HAMMER_PAINT.length, 0.5); }
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  // A box from (x0, y0, z0) to (x1, y1, z1): its six sides, each its own colour if cols says so ([-x, +x, -y, +y, -z, +z]).
  const box = (x0, y0, z0, x1, y1, z1, cols) => {
    quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0], cols[0]);
    quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], cols[1]);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], cols[2]);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], cols[3]);
    quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1], cols[4]);
    quad([x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [0, 0, 1], cols[5]);
  };
  const H = HAMMER;
  // The handle: eight-sided, a little thicker in the hand than at the eye, its ends cut square.
  const N = 8, ring = (y, r) => Array.from({ length: N }, (_, i) => { const a = (i + 0.5) / N * Math.PI * 2; return [Math.sin(a) * r * 0.82, y, Math.cos(a) * r * 1.12]; });
  const rings = [ring(H.butt, H.handle * 1.12), ring(0, H.handle * 1.05), ring(H.head - H.eye, H.handle * 0.92), ring(H.top, H.handle * 0.92)];
  for (let s = 0; s + 1 < rings.length; s++) {
    for (let i = 0; i < N; i++) {
      const a = rings[s][i], b = rings[s][(i + 1) % N], c = rings[s + 1][(i + 1) % N], d = rings[s + 1][i];
      const n = unit([(a[0] + b[0]) / 0.82, 0, (a[2] + b[2]) / 1.12]);
      quad(a, b, c, d, n, 0);
    }
  }
  for (const [r, n] of [[rings[0], -1], [rings[rings.length - 1], 1]]) {
    const o = pos.length / 3;
    for (const p of r) { pos.push(...p); nrm.push(0, n, 0); uv.push(1.5 / HAMMER_PAINT.length, 0.5); }
    for (let i = 1; i + 1 < N; i++) idx.push(o, n > 0 ? o + i : o + i + 1, n > 0 ? o + i + 1 : o + i);
  }
  // The head: a square block about the eye, the face proud of it at one end, drawn down to a cross peen at the other.
  const y0 = H.head - H.eye, y1 = H.head + H.eye, c = H.cheek;
  box(-c, y0, -0.03, c, y1, H.face - 0.012, [2, 2, 2, 2, 2, 2]);
  box(-c - 0.002, y0 - 0.002, H.face - 0.012, c + 0.002, y1 + 0.002, H.face, [3, 3, 3, 3, 3, 3]);
  // (The peen: a wedge, its edge across the handle.)
  const e = 0.006, z0 = -0.03, z1 = H.peen;
  quad([-c, y0, z0], [-c, y1, z0], [-c, H.head + e, z1], [-c, H.head - e, z1], [-1, 0, 0], 2);
  quad([c, H.head - e, z1], [c, H.head + e, z1], [c, y1, z0], [c, y0, z0], [1, 0, 0], 2);
  const sl = unit([0, z0 - z1, -(H.eye - e)]);
  quad([-c, y1, z0], [c, y1, z0], [c, H.head + e, z1], [-c, H.head + e, z1], [0, sl[1], sl[2]], 2);
  quad([-c, H.head - e, z1], [c, H.head - e, z1], [c, y0, z0], [-c, y0, z0], [0, -sl[1], sl[2]], 2);
  quad([-c, H.head - e, z1], [-c, H.head + e, z1], [c, H.head + e, z1], [c, H.head - e, z1], [0, 0, -1], 3);
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint32Array(idx) };
}
