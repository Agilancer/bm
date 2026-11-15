// Skeletons, clip sampling and forward kinematics. Everything here runs on the sim thread at 120 Hz with
// no allocation per tick.
import { accessor, parseGLB, readClips, readSkeleton } from '../core/glb.js';
import { quatFromMat3, quatMul, quatNormalize, quatRotate, quatYaw } from '../core/math.js';

// The UAL clips, decoded from assets/game/clips.bin into float tracks.
export class ClipBank {
  constructor(meta, bin) {
    this.fps = meta.fps;
    this.skeleton = meta.skeleton;
    this.grip = meta.grip;
    this.pelvisRest = meta.pelvisRest;
    this.count = meta.skeleton.length;
    this.clips = {};
    const rot = new Int16Array(bin, 0, meta.pelvisByteOffset >> 1);
    const pel = new Float32Array(bin, meta.pelvisByteOffset);
    for (const [name, c] of Object.entries(meta.clips)) {
      const tracks = new Array(this.count).fill(null);
      for (const [j, off, still] of c.tracks) {
        const n = still ? 1 : c.frames;
        const q = new Float32Array(n * 4);
        for (let i = 0; i < n * 4; i++) q[i] = rot[off + i] / 32767;
        for (let i = 0; i < n; i++) quatNormalize(q, i * 4);
        tracks[j] = sameHemisphere(q);
      }
      // travel: how far a clip that goes somewhere has carried the body forward, frame by frame (master units).
      this.clips[name] = { name, frames: c.frames, dur: c.dur, loop: c.loop, tracks, pelvis: pel.subarray(c.pelvis, c.pelvis + c.frames * 3), travel: c.travel ? Float32Array.from(c.travel) : null };
    }
  }

  // Forward distance a clip has carried the body by time t (0 for clips that stay put).
  travel(clip, t) {
    const tr = clip.travel;
    if (!tr) return 0;
    const f = Math.min(Math.max(t, 0) / clip.dur, 1) * (clip.frames - 1), i = Math.min(f | 0, clip.frames - 2);
    return tr[i] + (tr[i + 1] - tr[i]) * (f - i);
  }

  // Writes joint rotations for this clip at time t (wrapped if looping). Joints with no track are left alone.
  sample(clip, t, rots, pelvis) {
    const last = clip.frames - 1;
    let f = clip.loop ? (((t % clip.dur) + clip.dur) % clip.dur) / clip.dur * last : Math.min(Math.max(t, 0) / clip.dur, 1) * last;
    let i = f | 0;
    if (i >= last) { i = last - 1; f = last; }
    const a = f - i, b = 1 - a;
    const { tracks } = clip;
    for (let j = 0; j < tracks.length; j++) {
      const q = tracks[j];
      if (!q) continue;
      if (q.length === 4) { rots[j * 4] = q[0]; rots[j * 4 + 1] = q[1]; rots[j * 4 + 2] = q[2]; rots[j * 4 + 3] = q[3]; continue; }
      const k = i * 4;
      const x = q[k] * b + q[k + 4] * a, y = q[k + 1] * b + q[k + 5] * a, z = q[k + 2] * b + q[k + 6] * a, w = q[k + 3] * b + q[k + 7] * a;
      const l = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
      rots[j * 4] = x * l; rots[j * 4 + 1] = y * l; rots[j * 4 + 2] = z * l; rots[j * 4 + 3] = w * l;
    }
    if (pelvis) {
      const p = clip.pelvis, k = i * 3;
      pelvis[0] = p[k] * b + p[k + 3] * a; pelvis[1] = p[k + 1] * b + p[k + 4] * a; pelvis[2] = p[k + 2] * b + p[k + 5] * a;
    }
  }
}

// One rigged model: its proportions over the master skeleton.
export class Rig {
  constructor(glb, bank) {
    const skel = readSkeleton(glb);
    this.names = skel.names;
    this.index = new Map(skel.names.map((n, i) => [n, i]));
    this.parent = skel.parent;
    this.count = skel.names.length;
    this.restT = skel.restT;
    this.restR = skel.restR;
    this.ibQ = new Float32Array(this.count * 4);
    this.ibT = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const m = skel.ibm.subarray(i * 16, i * 16 + 16);
      this.ibQ.set(quatFromMat3([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]), i * 4);
      this.ibT.set([m[12], m[13], m[14]], i * 3);
    }
    const extras = glb.json.scenes[0].extras || {};
    this.pieces = extras.pieces || [];
    this.height = extras.height || 1.8;
    this.pelvisBase = extras.pelvisBase;
    this.pelvisRest = extras.pelvisRest || (bank && bank.pelvisRest);
    this.motionScale = extras.motionScale || 1;
    this.pelvisIndex = this.index.get('pelvis');
    this.bank = bank;
    const prim = glb.json.meshes.find((m) => m.primitives[0].attributes.WEIGHTS_0)?.primitives[0];
    if (prim) {
      // (Copies: a view would keep the whole file in memory, its pictures too, for as long as the rig's about.)
      this.bindPos = accessor(glb, prim.attributes.POSITION).slice();
      this.bindNormal = accessor(glb, prim.attributes.NORMAL).slice();
      this.tris = accessor(glb, prim.indices).slice();
    }
    for (let i = 0; i < this.count; i++) if (this.parent[i] >= i) throw new Error('joints must be parents first');
  }
}

// Live pose for one character.
export class Pose {
  constructor(rig) {
    this.rig = rig;
    this.rot = new Float32Array(rig.count * 4);
    this.rot.set(rig.restR);
    this.pelvis = new Float32Array(3);
    this.wq = new Float32Array(rig.count * 4);
    this.wt = new Float32Array(rig.count * 3);
    this.pq = new Float32Array(rig.count * 4);
    this.pt = new Float32Array(rig.count * 3);
    this.twist = null;
  }
}

const tq = new Float32Array(4), tq2 = new Float32Array(4), tv = new Float32Array(3), rootQ = new Float32Array(4);

// Forward kinematics. Yaw offsets in `twist` (joint -> radians) turn a joint about world up, which is how
// a walking body keeps its chest on its target.
export function solveFK(pose, x, y, z, yaw, twist, pitchTwist) {
  const { rig, rot, wq, wt, pelvis } = pose;
  const { parent, restT, count } = rig;
  quatYaw(rootQ, 0, yaw);
  const pi = rig.pelvisIndex;
  for (let j = 0; j < count; j++) {
    const p = parent[j];
    if (p < 0) {
      quatMul(wq, j * 4, rootQ, 0, rot, j * 4);
      quatRotate(wt, j * 3, rootQ, 0, restT, j * 3);
      wt[j * 3] += x; wt[j * 3 + 1] += y; wt[j * 3 + 2] += z;
      continue;
    }
    let tOff = j * 3, src = restT;
    if (j === pi) {
      const s = rig.motionScale, b = rig.pelvisBase, r = rig.pelvisRest;
      tv[0] = b[0] + (pelvis[0] - r[0]) * s; tv[1] = b[1] + (pelvis[1] - r[1]) * s; tv[2] = b[2] + (pelvis[2] - r[2]) * s;
      src = tv; tOff = 0;
    }
    quatRotate(wt, j * 3, wq, p * 4, src, tOff);
    wt[j * 3] += wt[p * 3]; wt[j * 3 + 1] += wt[p * 3 + 1]; wt[j * 3 + 2] += wt[p * 3 + 2];
    quatMul(wq, j * 4, wq, p * 4, rot, j * 4);
    if (twist && twist[j]) {
      quatYaw(tq, 0, twist[j]);
      tq2[0] = wq[j * 4]; tq2[1] = wq[j * 4 + 1]; tq2[2] = wq[j * 4 + 2]; tq2[3] = wq[j * 4 + 3];
      quatMul(wq, j * 4, tq, 0, tq2, 0);
    }
    if (pitchTwist && pitchTwist[j]) {
      // Nod about the character's own right axis.
      const c = Math.cos(yaw), s = Math.sin(yaw), h = pitchTwist[j] / 2, sh = Math.sin(h);
      tq[0] = c * sh; tq[1] = 0; tq[2] = -s * sh; tq[3] = Math.cos(h);
      tq2[0] = wq[j * 4]; tq2[1] = wq[j * 4 + 1]; tq2[2] = wq[j * 4 + 2]; tq2[3] = wq[j * 4 + 3];
      quatMul(wq, j * 4, tq, 0, tq2, 0);
    }
  }
}

// Skinning palette as dual quaternions, written straight to the shared snapshot.
export function writePalette(pose, out, off) {
  const { rig, wq, wt, pq, pt } = pose;
  const { ibQ, ibT, count } = rig;
  for (let j = 0; j < count; j++) {
    quatMul(pq, j * 4, wq, j * 4, ibQ, j * 4);
    quatRotate(pt, j * 3, wq, j * 4, ibT, j * 3);
    pt[j * 3] += wt[j * 3]; pt[j * 3 + 1] += wt[j * 3 + 1]; pt[j * 3 + 2] += wt[j * 3 + 2];
    const x = pq[j * 4], y = pq[j * 4 + 1], z = pq[j * 4 + 2], w = pq[j * 4 + 3];
    const tx = pt[j * 3], ty = pt[j * 3 + 1], tz = pt[j * 3 + 2];
    const o = off + j * 8;
    out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
    out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
    out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
    out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
    out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
  }
}

// The first-person arms: their own GLB, skeleton and swing clips, resampled to a 60 Hz grid.
const smooth = (x) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
/** How far the body has gone with a blow, at time t of its clip: against it in the wind-up, with it through the cut, back by the end. */
export function leanAmount(t, wind, through, dur) {
  if (t < wind) return -0.35 * smooth(t / wind);
  if (t < through) return -0.35 + 1.35 * smooth((t - wind) / (through - wind));
  return 1 - smooth((t - through) / (dur - through));
}

function sameHemisphere(values) {
  const out = Float32Array.from(values);
  for (let i = 4; i < out.length; i += 4) {
    if (out[i] * out[i - 4] + out[i + 1] * out[i - 3] + out[i + 2] * out[i - 2] + out[i + 3] * out[i - 1] < 0) for (let s = 0; s < 4; s++) out[i + s] = -out[i + s];
  }
  return out;
}

const FIST_RAISE = 0.65;

// Fists, for any body on an ArmsRig whose owner asks for them (rig.fistK, 0 to 1: Beast.write, for anything running): each
// finger's three joints turned in toward the palm by FIST_TURN at a full fist. The way each turns is found once per model
// from its rest pose: the palm's way from the knuckles (index to little finger) and the line of the hand (wrist to the
// middle finger), so it's right whichever way the hand was modelled. Mixamo's names and Unreal's both. (No thumbs: half the
// models have none bound.) Kept by the model's rest rotations, which every body on that model shares.
const FIST_TURN = [1.1, 1.25, 0.85];
const FISTS = new WeakMap(), FQ = new Float32Array(4), FQ2 = new Float32Array(4);
function fistAxes(rig) {
  let out = FISTS.get(rig.restR);
  if (out) return out;
  const n = rig.count, wq = new Float32Array(n * 4), wt = new Float32Array(n * 3);
  for (let j = 0; j < n; j++) {
    const p = rig.parent[j];
    if (p < 0) { wq.set(rig.restR.subarray(j * 4, j * 4 + 4), j * 4); wt.set(rig.restT.subarray(j * 3, j * 3 + 3), j * 3); continue; }
    quatMul(wq, j * 4, wq, p * 4, rig.restR, j * 4);
    quatRotate(wt, j * 3, wq, p * 4, rig.restT, j * 3);
    wt[j * 3] += wt[p * 3]; wt[j * 3 + 1] += wt[p * 3 + 1]; wt[j * 3 + 2] += wt[p * 3 + 2];
  }
  const hands = {};
  rig.names.forEach((name, j) => {
    let m = /(Left|Right)Hand(Index|Middle|Ring|Pinky)(\d)$/.exec(name), side, f, k;
    if (m) { side = m[1][0]; f = m[2].toLowerCase(); k = +m[3]; } else if ((m = /^(index|middle|ring|pinky)_0(\d)_(l|r)$/.exec(name))) { side = m[3].toUpperCase(); f = m[1]; k = +m[2]; }
    if (!m || k < 1 || k > 3) return;
    ((hands[side] ||= {})[f] ||= [])[k - 1] = j;
  });
  const P = (j) => [wt[j * 3], wt[j * 3 + 1], wt[j * 3 + 2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  out = [];
  for (const side of ['L', 'R']) {
    const H = hands[side];
    const first = (f) => H?.[f]?.find((j) => j !== undefined);
    const ix = first('index'), pk = first('pinky') ?? first('ring'), md = first('middle') ?? ix;
    if (ix === undefined || pk === undefined || ix === pk) continue;
    const hand = rig.parent[md];
    if (hand < 0) continue;
    // (For a left hand the palm is the hand's line crossed with the knuckles' from little finger to first; a right is its mirror.)
    const c = cross(sub(P(md), P(hand)), sub(P(ix), P(pk))), palm = unit(side === 'L' ? c : [-c[0], -c[1], -c[2]]);
    for (const f of ['index', 'middle', 'ring', 'pinky']) {
      const chain = (H[f] || []).filter((j) => j !== undefined);
      chain.forEach((j, i) => {
        // The bone's line: to the next joint of the finger, or (the last) the line of the one before it.
        const d = i + 1 < chain.length ? sub(P(chain[i + 1]), P(j)) : i ? sub(P(j), P(chain[i - 1])) : null;
        if (!d) return;
        const a = unit(cross(d, palm)), q = wq.subarray(j * 4, j * 4 + 4), local = [0, 0, 0];
        quatRotate(local, 0, [-q[0], -q[1], -q[2], q[3]], 0, a, 0);
        out.push(j, local[0], local[1], local[2], FIST_TURN[Math.min(2, i)]);
      });
    }
  }
  FISTS.set(rig.restR, out);
  return out;
}

export class ArmsRig {
  constructor(buffer, scale = 1, clipNames) {
    const glb = parseGLB(buffer);
    const skel = readSkeleton(glb);
    this.names = skel.names;
    this.index = new Map(skel.names.map((n, i) => [n, i]));
    this.parent = skel.parent;
    this.count = skel.names.length;
    this.restT = skel.restT;
    this.restR = skel.restR;
    this.extras = glb.json.scenes[0].extras || {};
    this.ibQ = new Float32Array(this.count * 4);
    this.ibT = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const m = skel.ibm.subarray(i * 16, i * 16 + 16);
      this.ibQ.set(quatFromMat3([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]), i * 4);
      this.ibT.set([m[12] * scale, m[13] * scale, m[14] * scale], i * 3);
    }
    if (scale !== 1) for (let i = 0; i < this.restT.length; i++) this.restT[i] *= scale;
    this.rootQ = null; this.rootT = null;
    this.clips = {};
    const clips = readClips(glb, skel, clipNames);
    for (const [name, c] of Object.entries(clips)) {
      const n = Math.max(2, Math.round(c.dur * 60) + 1);
      const rots = new Array(this.count).fill(null), trs = new Array(this.count).fill(null);
      const resample = (track, size) => {
        const out = new Float32Array(n * size);
        const { times } = track;
        // q and -q are the same turn, and exporters hand over either. Blended straight across a change of sign they pass through nothing, and for that frame the bone points anywhere: so each key takes the sign nearest the last.
        const values = size === 4 ? sameHemisphere(track.values) : track.values;
        let k = 0;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1) * c.dur;
          while (k + 2 < times.length && times[k + 1] < t) k++;
          const span = Math.max(times[k + 1] - times[k], 1e-6);
          const a = Math.min(1, Math.max(0, (t - times[k]) / span));
          for (let s = 0; s < size; s++) out[i * size + s] = values[k * size + s] * (1 - a) + values[(k + 1) * size + s] * a;
          if (size === 4) quatNormalize(out, i * 4);
        }
        return out;
      };
      for (const [j, tr] of c.rot) rots[j] = tr.times.length > 1 ? resample(tr, 4) : null;
      for (const [j, tr] of c.trans) {
        trs[j] = tr.times.length > 1 ? resample(tr, 3) : null;
        if (trs[j] && scale !== 1) for (let i = 0; i < trs[j].length; i++) trs[j][i] *= scale;
      }
      const info = (this.extras.clips || {})[name] || {};
      this.clips[name] = { name, frames: n, dur: c.dur, rots, trs, loop: !!info.loop || /^((walk|run)_|idle$)/.test(name), hit: info.hit, wind: info.wind, through: info.through, lean: info.lean };
    }
    this.rot = new Float32Array(this.count * 4);
    this.tr = new Float32Array(this.count * 3);
    this.wq = new Float32Array(this.count * 4);
    this.wt = new Float32Array(this.count * 3);
    this.pq = new Float32Array(this.count * 4);
    this.pt = new Float32Array(this.count * 3);
    this.rot2 = new Float32Array(this.count * 4);
    this.tr2 = new Float32Array(this.count * 3);
    this.weapon = this.index.get('weapon');
    this.tip = this.index.get('weapon_tip');
  }

  sampleInto(clip, t, rot, tr) {
    rot.set(this.restR); tr.set(this.restT);
    const last = clip.frames - 1;
    let f = clip.loop ? (((t % clip.dur) + clip.dur) % clip.dur) / clip.dur * last : Math.min(Math.max(t, 0) / clip.dur, 1) * last;
    let i = f | 0;
    if (i >= last) { i = last - 1; f = last; }
    const a = f - i, b = 1 - a;
    for (let j = 0; j < this.count; j++) {
      const q = clip.rots[j];
      if (q) {
        const k = i * 4;
        const x = q[k] * b + q[k + 4] * a, y = q[k + 1] * b + q[k + 5] * a, z = q[k + 2] * b + q[k + 6] * a, w = q[k + 3] * b + q[k + 7] * a;
        const l = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
        rot[j * 4] = x * l; rot[j * 4 + 1] = y * l; rot[j * 4 + 2] = z * l; rot[j * 4 + 3] = w * l;
      }
      const p = clip.trs[j];
      if (p) {
        const k = i * 3;
        tr[j * 3] = p[k] * b + p[k + 3] * a; tr[j * 3 + 1] = p[k + 1] * b + p[k + 4] * a; tr[j * 3 + 2] = p[k + 2] * b + p[k + 5] * a;
      }
    }
  }

  // The left arm part way up to where it holds a shield, so that its hand, shut on the grip that isn't there, is at the bottom of your view. The right arm isn't touched.
  closeLeft(rot, tr) {
    if (!this.holdRot) {
      this.holdRot = new Float32Array(rot.length);
      this.holdTr = new Float32Array(tr.length);
      this.sampleInto(this.clips.shield_hold, 0, this.holdRot, this.holdTr);
      this.leftArm = this.names.flatMap((n, j) => (/^(upperarm|forearm|hand)(_twist\d)?_L$/.test(n) ? [j] : []));
    }
    const hold = this.holdRot, holdT = this.holdTr;
    for (const j of this.leftArm) {
      const k = j * 4;
      for (let i = 0; i < 3; i++) tr[j * 3 + i] += (holdT[j * 3 + i] - tr[j * 3 + i]) * FIST_RAISE;
      const s = rot[k] * hold[k] + rot[k + 1] * hold[k + 1] + rot[k + 2] * hold[k + 2] + rot[k + 3] * hold[k + 3] < 0 ? -1 : 1;
      for (let i = 0; i < 4; i++) rot[k + i] += (hold[k + i] * s - rot[k + i]) * FIST_RAISE;
      quatNormalize(rot, k);
    }
  }

  // The hands eased by k (0 to 1) into fists: each finger's joints to the rest pose turned in (see fistAxes), whatever the
  // clip had them doing, so a hand its clip already curls isn't shut twice over.
  closeFists(rot, k) {
    const F = fistAxes(this), R = this.restR;
    for (let i = 0; i < F.length; i += 5) {
      const j = F[i] * 4, h = F[i + 4] * 0.5, s = Math.sin(h);
      FQ[0] = F[i + 1] * s; FQ[1] = F[i + 2] * s; FQ[2] = F[i + 3] * s; FQ[3] = Math.cos(h);
      quatMul(FQ2, 0, R, j, FQ, 0);
      const d = rot[j] * FQ2[0] + rot[j + 1] * FQ2[1] + rot[j + 2] * FQ2[2] + rot[j + 3] * FQ2[3], sg = d < 0 ? -1 : 1;
      for (let c = 0; c < 4; c++) rot[j + c] += (FQ2[c] * sg - rot[j + c]) * k;
      quatNormalize(rot, j);
    }
  }

  // Crossfades from a previous pose (rot2, tr2) by fade (0 = previous, 1 = current).
  solve(clip, t, fade, out, off) {
    this.sampleInto(clip, t, this.rot, this.tr);
    const { rot, tr, rot2, tr2, wq, wt, pq, pt, parent, ibQ, ibT, count } = this;
    if (this.leftFist) this.closeLeft(rot, tr);
    if (fade < 1) {
      for (let j = 0; j < count; j++) {
        const k = j * 4;
        const d = rot[k] * rot2[k] + rot[k + 1] * rot2[k + 1] + rot[k + 2] * rot2[k + 2] + rot[k + 3] * rot2[k + 3];
        const s = d < 0 ? -1 : 1;
        rot[k] = rot2[k] * s * (1 - fade) + rot[k] * fade;
        rot[k + 1] = rot2[k + 1] * s * (1 - fade) + rot[k + 1] * fade;
        rot[k + 2] = rot2[k + 2] * s * (1 - fade) + rot[k + 2] * fade;
        rot[k + 3] = rot2[k + 3] * s * (1 - fade) + rot[k + 3] * fade;
        quatNormalize(rot, k);
        tr[j * 3] = tr2[j * 3] * (1 - fade) + tr[j * 3] * fade;
        tr[j * 3 + 1] = tr2[j * 3 + 1] * (1 - fade) + tr[j * 3 + 1] * fade;
        tr[j * 3 + 2] = tr2[j * 3 + 2] * (1 - fade) + tr[j * 3 + 2] * fade;
      }
    }
    this.poseModifier?.(rot, tr);
    if (this.fistK > 0.01) this.closeFists(rot, this.fistK);
    for (let j = 0; j < count; j++) {
      const p = parent[j];
      if (p < 0) {
        if (this.rootQ) {
          quatMul(wq, j * 4, this.rootQ, 0, rot, j * 4);
          quatRotate(wt, j * 3, this.rootQ, 0, tr, j * 3);
          wt[j * 3] += this.rootT[0]; wt[j * 3 + 1] += this.rootT[1]; wt[j * 3 + 2] += this.rootT[2];
        } else {
          wq[j * 4] = rot[j * 4]; wq[j * 4 + 1] = rot[j * 4 + 1]; wq[j * 4 + 2] = rot[j * 4 + 2]; wq[j * 4 + 3] = rot[j * 4 + 3];
          wt[j * 3] = tr[j * 3]; wt[j * 3 + 1] = tr[j * 3 + 1]; wt[j * 3 + 2] = tr[j * 3 + 2];
        }
      } else {
        quatRotate(wt, j * 3, wq, p * 4, tr, j * 3);
        wt[j * 3] += wt[p * 3]; wt[j * 3 + 1] += wt[p * 3 + 1]; wt[j * 3 + 2] += wt[p * 3 + 2];
        quatMul(wq, j * 4, wq, p * 4, rot, j * 4);
      }
      quatMul(pq, j * 4, wq, j * 4, ibQ, j * 4);
      quatRotate(pt, j * 3, wq, j * 4, ibT, j * 3);
      pt[j * 3] += wt[j * 3]; pt[j * 3 + 1] += wt[j * 3 + 1]; pt[j * 3 + 2] += wt[j * 3 + 2];
      if (this.leftDrop > 0 && /_L$/.test(this.names[j])) pt[j * 3 + 1] -= this.leftDrop * 0.9;     // (the left arm, down out of view, whole)
      const x = pq[j * 4], y = pq[j * 4 + 1], z = pq[j * 4 + 2], w = pq[j * 4 + 3];
      const tx = pt[j * 3], ty = pt[j * 3 + 1], tz = pt[j * 3 + 2];
      const o = off + j * 8;
      out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
      out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
      out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
      out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
      out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
    }
  }

  capture() { this.rot2.set(this.rot); this.tr2.set(this.tr); }
}
