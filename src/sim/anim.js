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
        tracks[j] = q;
      }
      this.clips[name] = { name, frames: c.frames, dur: c.dur, loop: c.loop, tracks, pelvis: pel.subarray(c.pelvis, c.pelvis + c.frames * 3) };
    }
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
      this.bindPos = accessor(glb, prim.attributes.POSITION);
      this.bindNormal = accessor(glb, prim.attributes.NORMAL);
      this.tris = accessor(glb, prim.indices);
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

export class ArmsRig {
  constructor(buffer, scale = 1) {
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
    const clips = readClips(glb, skel);
    for (const [name, c] of Object.entries(clips)) {
      const n = Math.max(2, Math.round(c.dur * 60) + 1);
      const rots = new Array(this.count).fill(null), trs = new Array(this.count).fill(null);
      const resample = (track, size) => {
        const out = new Float32Array(n * size);
        const { times, values } = track;
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

  // Crossfades from a previous pose (rot2, tr2) by fade (0 = previous, 1 = current).
  solve(clip, t, fade, out, off) {
    this.sampleInto(clip, t, this.rot, this.tr);
    const { rot, tr, rot2, tr2, wq, wt, pq, pt, parent, ibQ, ibT, count } = this;
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
