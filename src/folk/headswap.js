// Heads worn from another body: what makes a palette swap someone else and not the one it's made on in other clothes (the
// owner, 2026-11-20: 'Do head swaps between characters, make sure their faces are completely different'). A swap with
// `head: <model>` in assets/game/folk/folk.json folds its own head away (src/gfx/shaders.js SKIN, its vertices marked
// HEAD_SRC) and wears that model's head: the donor's head and the top of its neck, cut from its mesh, moved and sized onto
// the wearer's own neck in the wearer's bind pose, skinned from the wearer's palette, joint by joint by name, and painted
// with the donor's own colour map (src/gfx/folk.js). A few thousand vertices; no texture of its own.
import { accessor } from '../core/glb.js';
import { headFit } from './hats.js';

// In a body's source vertices, its head (folded away when it wears another's); in a worn head's own, nothing.
export const HEAD_SRC = 0x100000;
// What of a body's head is its head: as much of its weight on the Head joint (and the top of it) as this.
const OWN = 0.5;
// And what of a donor's is cut to be worn: a little more, down the neck, so it covers the fold.
const CUT = 0.3;

const jointNames = (glb) => glb.json.skins[0].joints.map((j) => glb.json.nodes[j].name || '');
const short = (n) => n.replace(/^.*[:|]/, '').toLowerCase();

// A joint's place in the bind pose: the inverse of its inverse bind matrix (a whole inverse: Mixamo's rigs carry a scale).
function bindAt(glb, j) {
  const m = accessor(glb, glb.json.skins[0].inverseBindMatrices).subarray(j * 16, j * 16 + 16);
  // (The translation of the inverse of a 4x4 affine matrix: -A^-1 t, A its upper 3x3, column-major as glTF keeps it.)
  const a = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]], t = [m[12], m[13], m[14]];
  const det = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const inv = [
    [(a[1][1] * a[2][2] - a[1][2] * a[2][1]) / det, (a[0][2] * a[2][1] - a[0][1] * a[2][2]) / det, (a[0][1] * a[1][2] - a[0][2] * a[1][1]) / det],
    [(a[1][2] * a[2][0] - a[1][0] * a[2][2]) / det, (a[0][0] * a[2][2] - a[0][2] * a[2][0]) / det, (a[0][2] * a[1][0] - a[0][0] * a[1][2]) / det],
    [(a[1][0] * a[2][1] - a[1][1] * a[2][0]) / det, (a[0][1] * a[2][0] - a[0][0] * a[2][1]) / det, (a[0][0] * a[1][1] - a[0][1] * a[1][0]) / det],
  ];
  return [0, 1, 2].map((r) => -(inv[r][0] * t[0] + inv[r][1] * t[1] + inv[r][2] * t[2]));
}

// How much of each vertex is head: its weight on the Head joint and the top of the head.
function headWeights(names, joints, weights) {
  const h = names.findIndex((n) => short(n) === 'head'), t = names.findIndex((n) => short(n) === 'headtop_end' || /headtop/i.test(n));
  const n = joints.length / 4, w = new Float32Array(n);
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) { const q = joints[v * 4 + k]; if (q === h || q === t) w[v] += weights[v * 4 + k]; }
  return { w, head: h };
}

// How wide a body's neck is, just under its Head joint: the mean distance out from the Head joint's line of the vertices
// there that the neck and head move (not a collar or a hood's: those stand further off, and are left out).
function neckWidth(names, pos, joints, weights, J) {
  const nk = names.findIndex((n) => short(n) === 'neck'), hd = names.findIndex((n) => short(n) === 'head');
  let sum = 0, cnt = 0;
  for (let v = 0; v < pos.length / 3; v++) {
    const y = pos[v * 3 + 1], d = Math.hypot(pos[v * 3] - J[0], pos[v * 3 + 2] - J[2]);
    if (y > J[1] - 0.01 || y < J[1] - 0.08 || d > 0.11) continue;
    let w = 0;
    for (let k = 0; k < 4; k++) { const q = joints[v * 4 + k]; if (q === nk || q === hd) w += weights[v * 4 + k]; }
    if (w < 0.5) continue;
    sum += d; cnt++;
  }
  return cnt > 12 ? sum / cnt : 0;
}

// What a body offers to the swaps: where its head is, how wide its neck, and its own head marked (srcFlag: HEAD_SRC on each
// vertex that's head enough to fold away). prim: the body's { pos, joints, weights }.
export function headOf(glb, prim) {
  const names = jointNames(glb), { w, head } = headWeights(names, prim.joints, prim.weights);
  if (head < 0) return null;
  const J = bindAt(glb, head), srcFlag = new Uint32Array(w.length);
  for (let v = 0; v < w.length; v++) if (w[v] >= OWN) srcFlag[v] = HEAD_SRC;
  // (And how high its hips stand: what sizes a head worn from it, or on it. Nothing a hat or hair does changes it.)
  const hp = names.findIndex((n) => short(n) === 'hips');
  return { names, J, hips: hp >= 0 ? bindAt(glb, hp)[1] : 0, neck: neckWidth(names, prim.pos, prim.joints, prim.weights, J), srcFlag, fit: headFit(names, prim) };
}

// A donor's head, cut out (its triangles wholly over CUT), as it stands on the donor: kept for the swaps that wear it.
export function cutHead(glb, prim, donor) {
  const { w } = headWeights(donor.names, prim.joints, prim.weights), idx = prim.idx;
  const keep = new Int32Array(w.length).fill(-1), tris = [];
  let n = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    if (w[a] < CUT || w[b] < CUT || w[c] < CUT) continue;
    for (const q of [a, b, c]) if (keep[q] < 0) keep[q] = n++;
    tris.push(keep[a], keep[b], keep[c]);
  }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  for (let v = 0; v < w.length; v++) {
    const k = keep[v];
    if (k < 0) continue;
    pos.set(prim.pos.subarray(v * 3, v * 3 + 3), k * 3); nrm.set(prim.nrm.subarray(v * 3, v * 3 + 3), k * 3); uv.set(prim.uv.subarray(v * 2, v * 2 + 2), k * 2);
    joints.set(prim.joints.subarray(v * 4, v * 4 + 4), k * 4); weights.set(prim.weights.subarray(v * 4, v * 4 + 4), k * 4);
  }
  return { pos, nrm, uv, joints, weights, idx: Uint32Array.from(tris), names: donor.names, J: donor.J, hips: donor.hips, neck: donor.neck, fit: donor.fit };
}

// The donor's head on the wearer: moved so its Head joint's on the wearer's, sized by their necks (within a sixth either
// way, by their bodies' sizes), its joints the wearer's of the same names; marked as head for the dye (HEAD_BIT, hats.js) and
// nothing for the fold. And where a hat would sit on it.
export function wornHead(cut, wearer, HEAD_BIT) {
  // (Sized as it was on its own body, by how much bigger or smaller the wearer's is: the donor's head was in proportion to the
  // donor (tools/folk/head_scale.py saw to the ones that weren't), so it is to the wearer. By their hips' heights, which
  // no hat, hood or hair can make bigger, as they did the heads' own widths. The owner, 2026-11-20: 'Fix all of their head
  // sizes'.)
  const s = Math.min(1.12, Math.max(0.88, cut.hips > 0 && wearer.hips > 0 ? wearer.hips / cut.hips : 1));
  const { J: Jd } = cut, { J: Jw } = wearer, n = cut.pos.length / 3;
  const pos = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) for (let k = 0; k < 3; k++) pos[v * 3 + k] = Jw[k] + (cut.pos[v * 3 + k] - Jd[k]) * s;
  const map = cut.names.map((nm) => { const i = wearer.names.findIndex((q) => short(q) === short(nm)); return i; });
  const head = wearer.names.findIndex((q) => short(q) === 'head');
  const joints = Uint16Array.from(cut.joints, (j) => (map[j] >= 0 ? map[j] : head));
  const fit = cut.fit && { joint: head, r: cut.fit.r * s, c: cut.fit.c.map((q, k) => Jw[k] + (q - Jd[k]) * s) };
  return { prim: { pos, nrm: cut.nrm, uv: cut.uv, idx: cut.idx, joints, weights: cut.weights, piece: new Uint32Array(n).fill(HEAD_BIT) }, fit, s };
}
