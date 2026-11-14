// The townsfolk in motion. They all live by the same clips, Lisandra's (assets/game/folk/clips.*, packed by
// tools/folk/pack_clips.py), played on each one's own skeleton.
//
// Their rigs and hers are the same Tripo `mixamorig:` skeleton, but every body's bones point their own ways at rest, so a
// clip's local rotations can't be copied across. What carries over is how far each bone has turned from its rest, in the
// world: for a joint j with parent p,
//     theirs(j) = A(j) * hers(j) * B(j),   A(j) = restWorld_theirs(p)^-1 * restWorld_hers(p),   B(j) = restWorld_hers(j)^-1 * restWorld_theirs(j)
// worked out once per body. (Turning on either side by a fixed rotation keeps the shortest path between two poses, so
// clips can be blended in her terms before they're carried over.) The hips' travel is scaled by how much taller their
// hips stand than hers. No allocation per frame.
import { readSkeleton } from '../core/glb.js';
import { quatFromMat3, quatMul, quatNormalize, quatRotate, quatYaw } from '../core/math.js';

const I = [0, 0, 0, 1];
// On the run (these clips), the hands are fists, as anyone's are: her clips' hands are open. How far each finger's three
// joints turn in at a full fist, thumb first: her own fist (src/sim/village-walker.js grip), the same rig her clips are
// from, so the same turns: a finger about its joint's own z, a thumb about its y, the other way and a little less.
const RUN_CLIPS = new Set(['run', 'jog', 'flee']);
const FIST = [[0.5, 0.35, 0.2], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9]];
const FQ = new Float32Array(4);
const conj = (q, i = 0) => [-q[i], -q[i + 1], -q[i + 2], q[i + 3]];

// Parents-first forward kinematics of a rest pose: world rotations and positions.
function restWorld(parent, restT, restR) {
  const n = parent.length, q = new Float32Array(n * 4), t = new Float32Array(n * 3);
  for (let j = 0; j < n; j++) {
    const p = parent[j];
    if (p < 0) { q.set(restR.subarray(j * 4, j * 4 + 4), j * 4); t.set(restT.subarray(j * 3, j * 3 + 3), j * 3); continue; }
    quatMul(q, j * 4, q, p * 4, restR, j * 4);
    quatRotate(t, j * 3, q, p * 4, restT, j * 3);
    t[j * 3] += t[p * 3]; t[j * 3 + 1] += t[p * 3 + 1]; t[j * 3 + 2] += t[p * 3 + 2];
  }
  return { q, t };
}

// Her clips, decoded once for everyone: rotations as float tracks on a 30 Hz grid, the hips' path beside them.
export class FolkClips {
  constructor(meta, bin) {
    this.fps = meta.fps;
    const sk = meta.skeleton;
    this.count = sk.length;
    this.names = sk.map((j) => j.name);
    this.index = new Map(this.names.map((n, i) => [n, i]));
    this.parent = Int32Array.from(sk, (j) => j.parent);
    this.restT = new Float32Array(this.count * 3);
    this.restR = new Float32Array(this.count * 4);
    sk.forEach((j, i) => { this.restT.set(j.t, i * 3); this.restR.set(j.r, i * 4); });
    for (let j = 0; j < this.count; j++) if (this.parent[j] >= j) throw new Error('clips: joints must come parents first');
    // The fingers' joints, for that fist (FolkPose.solve): joint, its turn at a full fist, 1 for a thumb's.
    this.fist = [];
    for (const side of ['Left', 'Right']) {
      ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((f, fi) => [1, 2, 3].forEach((i) => {
        const j = this.index.get(`mixamorig:${side}Hand${f}${i}`);
        if (j !== undefined) this.fist.push(j, FIST[fi][i - 1], fi === 0 ? 1 : 0);
      }));
    }
    this.hips = this.index.get('mixamorig:Hips');
    this.rest = restWorld(this.parent, this.restT, this.restR);
    const rot = new Int16Array(bin, 0, meta.hipsByteOffset >> 1);
    const hips = new Float32Array(bin, meta.hipsByteOffset);
    this.clips = {};
    for (const [name, c] of Object.entries(meta.clips)) {
      const tracks = new Array(this.count).fill(null);
      for (const [j, off, still] of c.tracks) {
        const n = still ? 1 : c.frames;
        const q = new Float32Array(n * 4);
        for (let i = 0; i < n * 4; i++) q[i] = rot[off + i] / 32767;
        for (let i = 0; i < n; i++) {
          quatNormalize(q, i * 4);
          // Each key on the same side as the one before, so blending between them never goes the long way round.
          if (i && q[i * 4] * q[i * 4 - 4] + q[i * 4 + 1] * q[i * 4 - 3] + q[i * 4 + 2] * q[i * 4 - 2] + q[i * 4 + 3] * q[i * 4 - 1] < 0) {
            for (let k = 0; k < 4; k++) q[i * 4 + k] = -q[i * 4 + k];
          }
        }
        tracks[j] = q;
      }
      this.clips[name] = {
        name, frames: c.frames, dur: c.dur, loop: c.loop, travel: c.travel || 0, tracks,
        hips: hips.subarray(c.hips, c.hips + c.frames * 3),
      };
    }
  }

  // Her local rotations and her hips at time t (wrapped if it loops, held at either end if not). Joints with no track
  // are left as they were, so callers start from rest.
  sample(clip, t, rot, hips) {
    const last = clip.frames - 1;
    const f = clip.loop ? (((t % clip.dur) + clip.dur) % clip.dur) / clip.dur * last : Math.min(Math.max(t, 0) / clip.dur, 1) * last;
    let i = f | 0;
    if (i >= last) i = last - 1;
    const a = Math.min(1, f - i), b = 1 - a;
    const { tracks } = clip;
    for (let j = 0; j < tracks.length; j++) {
      const q = tracks[j];
      if (!q) continue;
      if (q.length === 4) { rot[j * 4] = q[0]; rot[j * 4 + 1] = q[1]; rot[j * 4 + 2] = q[2]; rot[j * 4 + 3] = q[3]; continue; }
      const k = i * 4;
      const x = q[k] * b + q[k + 4] * a, y = q[k + 1] * b + q[k + 5] * a, z = q[k + 2] * b + q[k + 6] * a, w = q[k + 3] * b + q[k + 7] * a;
      const l = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
      rot[j * 4] = x * l; rot[j * 4 + 1] = y * l; rot[j * 4 + 2] = z * l; rot[j * 4 + 3] = w * l;
    }
    const p = clip.hips, k = i * 3;
    hips[0] = p[k] * b + p[k + 3] * a; hips[1] = p[k + 1] * b + p[k + 4] * a; hips[2] = p[k + 2] * b + p[k + 5] * a;
  }

  // A weight for each of her joints: 1 on the joint named and everything below it.
  mask(...roots) {
    const w = new Float32Array(this.count);
    const ids = roots.map((r) => this.index.get(`mixamorig:${r}`));
    for (let j = 0; j < this.count; j++) {
      for (let k = j; k >= 0; k = this.parent[k]) if (ids.includes(k)) { w[j] = 1; break; }
    }
    return w;
  }
}

// One body: its skeleton, and how her clips carry over to it.
export class FolkRig {
  constructor(glb, clips, opts = {}) {
    // (A parsed GLB, or a skeleton already read out of one: what the main thread sends the town's worker.)
    const sk = glb.names ? glb : readSkeleton(glb);
    this.clips = clips;
    this.names = sk.names;
    this.count = sk.names.length;
    this.index = new Map(sk.names.map((n, i) => [n, i]));
    this.parent = sk.parent;
    this.restT = sk.restT;
    this.restR = sk.restR;
    for (let j = 0; j < this.count; j++) if (this.parent[j] >= j) throw new Error('folk: joints must come parents first');
    this.ibQ = new Float32Array(this.count * 4);
    this.ibT = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const m = sk.ibm.subarray(i * 16, i * 16 + 16);
      this.ibQ.set(quatFromMat3([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]), i * 4);
      this.ibT.set([m[12], m[13], m[14]], i * 3);
    }
    // Which of her joints each of ours follows, and the fixed turns either side of it.
    this.src = new Int32Array(this.count).fill(-1);
    this.A = new Float32Array(this.count * 4);
    this.B = new Float32Array(this.count * 4);
    const theirs = restWorld(this.parent, this.restT, this.restR), hers = clips.rest;
    this.rest = theirs;
    this.unmatched = [];
    for (let j = 0; j < this.count; j++) {
      const s = clips.index.get(this.names[j]);
      if (s === undefined) { this.unmatched.push(this.names[j]); continue; }
      const p = this.parent[j], sp = clips.parent[s];
      // (Her parent must be the one ours follows, or the turn handed down would be measured from the wrong bone.)
      if (p >= 0 && this.src[p] !== sp) { this.unmatched.push(this.names[j]); continue; }
      this.src[j] = s;
      quatMul(this.A, j * 4, p >= 0 ? conj(theirs.q, p * 4) : I, 0, sp >= 0 ? hers.q.subarray(sp * 4, sp * 4 + 4) : I, 0);
      quatMul(this.B, j * 4, conj(hers.q, s * 4), 0, theirs.q, j * 4);
    }
    const j = (n) => this.index.get(`mixamorig:${n}`) ?? -1;
    this.hips = j('Hips');
    if (this.hips < 0 || this.src[this.hips] < 0) throw new Error('folk: no hips');
    this.hipsHeight = theirs.t[this.hips * 3 + 1];
    this.hipsScale = this.hipsHeight / hers.t[clips.hips * 3 + 1];
    this.head = j('Head'); this.neck = j('Neck'); this.chest = j('Spine2');
    // What stays above the blanket abed (FolkPose.tuck): the neck, the head and everything on it.
    this.above = new Uint8Array(this.count);
    for (let k = 0; k < this.count; k++) for (let a = k; a >= 0; a = this.parent[a]) if (a === this.neck || a === this.head) { this.above[k] = 1; break; }
    this.arms = [j('LeftArm'), j('RightArm')];
    this.hands = [j('LeftHand'), j('RightHand')];
    this.fore = [j('LeftForeArm'), j('RightForeArm')];
    this.toes = [j('LeftToeBase'), j('RightToeBase')];
    this.legs = ['Left', 'Right'].flatMap((s) => ['UpLeg', 'Leg', 'Foot'].map((p) => j(`${s}${p}`)));
    this.headTop = theirs.t[this.head * 3 + 1];
    // Per body: how far the upper arms are drawn out from the body, for a gown or a big frame (radians), and the skirt.
    this.armOut = opts.armOut || 0;
    this.skirt = opts.skirt || null;
  }

  // How fast this body covers the ground in a moving clip played at rate 1, in metres a second.
  stride(clip) { return clip.travel * this.hipsScale / clip.dur; }
}

// The joints in the palette past a body's own: the skirt's six leg points and the facing (see SKIN in src/gfx/shaders.js).
export const SKIRT_JOINTS = 4;
// Abed, everything below the neck is sunk this far, into the mattress: the blanket over them (src/gfx/blankets.js) is shaped
// like a body, and nothing of one pokes through it, a gown's knee or a squire's plate.
const TUCK = 0.3;

const tq = new Float32Array(4), tq2 = new Float32Array(4), tv = new Float32Array(3), up = [0, 1, 0];

// One person's live pose: a clip playing, the one it's taking over from, and a layer over the top half.
export class FolkPose {
  constructor(rig) {
    const n = rig.clips.count;
    this.rig = rig;
    this.sa = new Float32Array(n * 4); this.sb = new Float32Array(n * 4); this.so = new Float32Array(n * 4);
    this.ha = new Float32Array(3); this.hb = new Float32Array(3); this.ho = new Float32Array(3);
    this.wq = new Float32Array(rig.count * 4); this.wt = new Float32Array(rig.count * 3);
    this.pq = new Float32Array(rig.count * 4); this.pt = new Float32Array(rig.count * 3);
    this.rootQ = new Float32Array(4);
    this.tuck = 0;            // 1 abed and under the blanket (src/folk/folk.worker.js), 0 otherwise
    this.a = { clip: null, t: 0, speed: 1 };
    this.b = { clip: null, t: 0, speed: 1 };
    this.w = 1; this.fade = 0.3;
    this.o = { clip: null, t: 0, speed: 1, w: 0, to: 0, fade: 0.3, mask: null };
    // Where they're looking, as turns of the head off the body's own facing (radians, + to their left / + up), eased.
    this.lookYaw = 0; this.lookPitch = 0; this.wantYaw = 0; this.wantPitch = 0;
    // Lying abed: how far the arms are brought in to rest, upper arms at the sides and hands on the belly (0-1, eased).
    this.rest = 0; this.restTo = 0;
    for (const s of [this.sa, this.sb, this.so]) s.set(rig.clips.restR);
  }

  get clip() { return this.a.clip; }
  get time() { return this.a.t; }

  // Start a clip. It takes over from what's playing over `fade` seconds. `sync`: a loop picks up at the same point of its
  // cycle as the loop it replaces (a walk into a jog keeps its feet). A negative speed plays it backwards from its end.
  play(name, { fade = 0.3, speed = 1, t = null, sync = false, restart = false } = {}) {
    const clip = this.rig.clips.clips[name];
    if (!clip) throw new Error(`folk: no clip ${name}`);
    if (this.a.clip === clip && !restart) { this.a.speed = speed; return; }
    const old = this.a;
    if (old.clip && fade > 0) {
      this.b.clip = old.clip; this.b.t = old.t; this.b.speed = old.speed;
      this.w = 0; this.fade = fade;
    } else this.w = 1;
    let start = t ?? (speed < 0 ? clip.dur : 0);
    if (t === null && sync && clip.loop && old.clip?.loop) start = (((old.t / old.clip.dur) % 1) + 1) % 1 * clip.dur;
    this.a = { clip, t: start, speed };
  }

  // A clip over the top half only (from `from` down: 'Spine1' for the chest up, 'LeftShoulder,RightShoulder' for the arms), or
  // null to let go of it.
  layer(name, { fade = 0.3, speed = 1, from = 'Spine1', weight = 1 } = {}) {
    const o = this.o;
    if (!name) { o.to = 0; o.fade = fade; return; }
    const clip = this.rig.clips.clips[name];
    if (!clip) throw new Error(`folk: no clip ${name}`);
    const key = `${from}`;
    if (o.clip !== clip) { o.clip = clip; o.t = 0; if (o.w < 0.01) o.w = 0; }
    if (o.key !== key) { o.key = key; o.mask = this.rig.clips.mask(...from.split(',')); }
    o.speed = speed; o.to = weight; o.fade = fade;
  }

  // Has a clip that doesn't loop played out?
  get done() {
    const a = this.a;
    return !a.clip || !a.clip.loop && (a.speed >= 0 ? a.t >= a.clip.dur : a.t <= 0);
  }

  step(dt) {
    this.a.t += dt * this.a.speed;
    if (this.w < 1) { this.b.t += dt * this.b.speed; this.w = Math.min(1, this.w + dt / this.fade); }
    const o = this.o;
    if (o.clip) {
      o.t += dt * o.speed;
      o.w += Math.sign(o.to - o.w) * Math.min(Math.abs(o.to - o.w), dt / o.fade);
      if (o.w <= 0 && o.to === 0) o.clip = null;
    }
    this.rest += Math.sign(this.restTo - this.rest) * Math.min(Math.abs(this.restTo - this.rest), dt / 1.1);
    const k = 1 - Math.exp(-dt * 6);
    this.lookYaw += (this.wantYaw - this.lookYaw) * k;
    this.lookPitch += (this.wantPitch - this.lookPitch) * k;
  }

  // The pose at (x, y, z) facing yaw, into out[off...] as dual quaternions (world space), and the skirt's points after it.
  solve(x, y, z, yaw, out, off) {
    const { rig } = this;
    const C = rig.clips, n = C.count;
    const sa = this.sa, ha = this.ha;
    C.sample(this.a.clip, this.a.t, sa, ha);
    if (this.w < 1 && this.b.clip) {
      C.sample(this.b.clip, this.b.t, this.sb, this.hb);
      blend(sa, this.sb, n, 1 - smooth(this.w));
      for (let k = 0; k < 3; k++) ha[k] += (this.hb[k] - ha[k]) * (1 - smooth(this.w));
    }
    const o = this.o;
    if (o.clip && o.w > 0) {
      C.sample(o.clip, o.t, this.so, this.ho);
      const w = smooth(o.w), m = o.mask;
      for (let j = 0; j < n; j++) if (m[j] > 0) nlerp(sa, j * 4, sa, this.so, j * 4, w * m[j]);
    }
    // Running, fists (eased across a change of clip, as the clips are).
    const runA = RUN_CLIPS.has(this.a.clip?.name) ? 1 : 0, runB = this.w < 1 && RUN_CLIPS.has(this.b.clip?.name) ? 1 : 0;
    const run = this.w < 1 ? runB + (runA - runB) * smooth(this.w) : runA;
    if (run > 0.01) {
      const F = C.fist;
      for (let i = 0; i < F.length; i += 3) {
        const a = F[i + 1] * run * (F[i + 2] ? -0.8 : 1) * 0.5;
        FQ[0] = 0; FQ[1] = F[i + 2] ? Math.sin(a) : 0; FQ[2] = F[i + 2] ? 0 : Math.sin(a); FQ[3] = Math.cos(a);
        quatMul(sa, F[i] * 4, sa, F[i] * 4, FQ, 0);
      }
    }
    this.fk(x, y, z, yaw);
    writePalette(this, out, off);
    if (rig.skirt) {
      const s = off + rig.count * 8, r = rig.skirt.legRadii;
      for (let i = 0; i < 6; i++) {
        const k = rig.legs[i] * 3, p = s + i * 4;
        out[p] = this.wt[k]; out[p + 1] = this.wt[k + 1] - TUCK * this.tuck; out[p + 2] = this.wt[k + 2]; out[p + 3] = r[i % 3];
      }
      out[s + 24] = yaw;
    }
  }

  fk(x, y, z, yaw) {
    const { rig, sa, ha, wq, wt, rootQ } = this;
    const { parent, restT, restR, A, B, src, count } = rig;
    const C = rig.clips;
    quatYaw(rootQ, 0, yaw);
    const hr = C.restT, hs = C.hips * 3, k = rig.hipsScale;
    for (let j = 0; j < count; j++) {
      const p = parent[j], s = src[j];
      // Our local rotation.
      if (s >= 0) { quatMul(tq, 0, A, j * 4, sa, s * 4); quatMul(tq2, 0, tq, 0, B, j * 4); } else tq2.set(restR.subarray(j * 4, j * 4 + 4));
      let T = restT, to = j * 3;
      if (j === rig.hips) {
        tv[0] = restT[to] + (ha[0] - hr[hs]) * k; tv[1] = restT[to + 1] + (ha[1] - hr[hs + 1]) * k; tv[2] = restT[to + 2] + (ha[2] - hr[hs + 2]) * k;
        T = tv; to = 0;
      }
      if (p < 0) {
        quatMul(wq, j * 4, rootQ, 0, tq2, 0);
        quatRotate(wt, j * 3, rootQ, 0, T, to);
        wt[j * 3] += x; wt[j * 3 + 1] += y; wt[j * 3 + 2] += z;
        continue;
      }
      quatRotate(wt, j * 3, wq, p * 4, T, to);
      wt[j * 3] += wt[p * 3]; wt[j * 3 + 1] += wt[p * 3 + 1]; wt[j * 3 + 2] += wt[p * 3 + 2];
      quatMul(wq, j * 4, wq, p * 4, tq2, 0);
      if (j === rig.neck || j === rig.head) this.turnHead(j, yaw, j === rig.head ? 0.6 : 0.4);
      else if (rig.armOut && (j === rig.arms[0] || j === rig.arms[1])) this.armOut(j, j === rig.arms[0] ? 1 : -1);
      if (this.rest > 0) {
        if (j === rig.arms[0] || j === rig.arms[1]) this.restArm(j, j === rig.arms[0] ? 0 : 1, false);
        else if (j === rig.fore[0] || j === rig.fore[1]) this.restArm(j, j === rig.fore[0] ? 0 : 1, true);
        else if (j === rig.legs[0] || j === rig.legs[1] || j === rig.legs[3] || j === rig.legs[4]) this.restLeg(j);
        else if (j === rig.legs[2] || j === rig.legs[5]) this.restFoot(j, j === rig.legs[2] ? 0 : 1);
      }
    }
  }

  // Lying on their back, legs out straight down the bed, a little apart.
  restLeg(j) {
    const { rig, wq, wt } = this;
    const k = rig.legs.indexOf(j), child = rig.legs[k + 1];
    if (child < 0) return;
    const h = rig.hips * 3, c = rig.chest * 3;
    let ux = wt[h] - wt[c], uy = wt[h + 1] - wt[c + 1], uz = wt[h + 2] - wt[c + 2];
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    // (Out to its own side: from the hips' middle to this hip, square to the body.)
    let lx = wt[j * 3] - wt[h], ly = wt[j * 3 + 1] - wt[h + 1], lz = wt[j * 3 + 2] - wt[h + 2];
    if (k % 3 === 0) {
      const d = lx * ux + ly * uy + lz * uz; lx -= ux * d; ly -= uy * d; lz -= uz * d;
      const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
    } else { lx = ly = lz = 0; }
    this.turnBone(j, child, ux + lx * 0.07, uy - 0.04, uz + lz * 0.07);
  }

  // A foot let fall, toes half down the bed and turned a little out, rather than stood up straight.
  restFoot(j, side) {
    const { rig, wt } = this;
    const toe = rig.toes[side];
    if (toe < 0) return;
    const h = rig.hips * 3, c = rig.chest * 3;
    let ux = wt[h] - wt[c], uy = wt[h + 1] - wt[c + 1], uz = wt[h + 2] - wt[c + 2];
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    let lx = wt[j * 3] - wt[h], lz = wt[j * 3 + 2] - wt[h + 2];
    const d = lx * ux + lz * uz; lx -= ux * d; lz -= uz * d;
    const ll = Math.hypot(lx, lz) || 1;
    this.turnBone(j, toe, ux * 0.8 + lx / ll * 0.45, 0.28, uz * 0.8 + lz / ll * 0.45);
  }

  // Turn joint j so the bone to its child points along (tx, ty, tz), by this.rest of the way.
  turnBone(j, child, tx, ty, tz) {
    const { rig, wq } = this;
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    quatRotate(tv, 0, wq, j * 4, rig.restT, child * 3);
    const dl = Math.hypot(tv[0], tv[1], tv[2]) || 1, dx = tv[0] / dl, dy = tv[1] / dl, dz = tv[2] / dl;
    let qx = dy * tz - dz * ty, qy = dz * tx - dx * tz, qz = dx * ty - dy * tx, qw = 1 + dx * tx + dy * ty + dz * tz;
    if (qw < 1e-4) return;
    const w = smooth(this.rest);
    qx *= w; qy *= w; qz *= w; qw = 1 - w + qw * w;
    const ql = Math.hypot(qx, qy, qz, qw);
    tq[0] = qx / ql; tq[1] = qy / ql; tq[2] = qz / ql; tq[3] = qw / ql;
    tq2.set(wq.subarray(j * 4, j * 4 + 4));
    quatMul(wq, j * 4, tq, 0, tq2, 0);
  }

  // Lying on their back: an upper arm laid down the side, elbow on the mattress, or a forearm across to the belly. Turns the
  // bone (and all under it) so it points where it should, by this.rest of the way.
  restArm(j, side, fore) {
    const { rig, wq, wt } = this;
    const child = fore ? rig.hands[side] : rig.fore[side];
    if (child < 0) return;
    const h = rig.hips * 3, c = rig.chest * 3, jj = j * 3;
    // Down the body, and out to this arm's side, in the world.
    let ux = wt[h] - wt[c], uy = wt[h + 1] - wt[c + 1], uz = wt[h + 2] - wt[c + 2];
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    let tx, ty, tz;
    if (!fore) {
      let lx = wt[jj] - wt[c], ly = wt[jj + 1] - wt[c + 1], lz = wt[jj + 2] - wt[c + 2];
      const d = lx * ux + ly * uy + lz * uz;
      lx -= ux * d; ly -= uy * d; lz -= uz * d;
      const ll = Math.hypot(lx, ly, lz) || 1;
      tx = ux + 0.3 * lx / ll; ty = uy + 0.3 * ly / ll - 0.14; tz = uz + 0.3 * lz / ll;
    } else {
      // To a point on the belly a little up from the hips, a hand's width to their own side of the middle.
      const k = 0.4, bx = wt[h] + (wt[c] - wt[h]) * k, by = wt[h + 1] + (wt[c + 1] - wt[h + 1]) * k + 0.07 * rig.hipsHeight / 0.95, bz = wt[h + 2] + (wt[c + 2] - wt[h + 2]) * k;
      tx = bx - wt[jj]; ty = by - wt[jj + 1]; tz = bz - wt[jj + 2];
    }
    this.turnBone(j, child, tx, ty, tz);
  }

  // Turn this joint (and so all under it) about the world's up, and nod it about the body's right.
  turnHead(j, yaw, share) {
    const { wq } = this;
    const ty = this.lookYaw * share, tp = this.lookPitch * share;
    if (Math.abs(ty) + Math.abs(tp) < 1e-4) return;
    const h = tp / 2, sh = Math.sin(h), c = Math.cos(yaw + ty), s = Math.sin(yaw + ty);
    const pitch = [-c * sh, 0, s * sh, Math.cos(h)];
    const turn = [0, Math.sin(ty / 2), 0, Math.cos(ty / 2)];
    quatMul(tq, 0, pitch, 0, turn, 0);
    tq2.set(wq.subarray(j * 4, j * 4 + 4));
    quatMul(wq, j * 4, tq, 0, tq2, 0);
  }

  // Draw an upper arm out from the body, about the chest's forward.
  armOut(j, side) {
    const { rig, wq } = this;
    const c = rig.chest * 4;
    // The chest's turn from rest, applied to forward.
    quatMul(tq, 0, wq, c, conj(rig.rest.q, c), 0);
    quatRotate(tv, 0, tq, 0, [0, 0, 1], 0);
    const a = side * rig.armOut / 2, s = Math.sin(a);
    const r = [tv[0] * s, tv[1] * s, tv[2] * s, Math.cos(a)];
    tq2.set(wq.subarray(j * 4, j * 4 + 4));
    quatMul(wq, j * 4, r, 0, tq2, 0);
  }

  // Where a joint is now, in the world.
  at(j, out = [0, 0, 0]) { out[0] = this.wt[j * 3]; out[1] = this.wt[j * 3 + 1]; out[2] = this.wt[j * 3 + 2]; return out; }
}

const smooth = (x) => x * x * (3 - 2 * x);

function blend(a, b, n, t) { for (let j = 0; j < n; j++) nlerp(a, j * 4, a, b, j * 4, t); }

function nlerp(out, oi, a, b, bi, t) {
  const d = a[oi] * b[bi] + a[oi + 1] * b[bi + 1] + a[oi + 2] * b[bi + 2] + a[oi + 3] * b[bi + 3];
  const s = d < 0 ? -t : t, r = 1 - t;
  const x = a[oi] * r + b[bi] * s, y = a[oi + 1] * r + b[bi + 1] * s, z = a[oi + 2] * r + b[bi + 2] * s, w = a[oi + 3] * r + b[bi + 3] * s;
  const l = 1 / (Math.sqrt(x * x + y * y + z * z + w * w) || 1);
  out[oi] = x * l; out[oi + 1] = y * l; out[oi + 2] = z * l; out[oi + 3] = w * l;
}

// The skinning palette, world times inverse bind, as dual quaternions: the same as src/sim/anim.js writes for everyone else.
function writePalette(pose, out, off) {
  const { rig, wq, wt, pq, pt } = pose;
  const { ibQ, ibT, count } = rig;
  for (let j = 0; j < count; j++) {
    quatMul(pq, j * 4, wq, j * 4, ibQ, j * 4);
    quatRotate(pt, j * 3, wq, j * 4, ibT, j * 3);
    pt[j * 3] += wt[j * 3]; pt[j * 3 + 1] += wt[j * 3 + 1]; pt[j * 3 + 2] += wt[j * 3 + 2];
    const x = pq[j * 4], y = pq[j * 4 + 1], z = pq[j * 4 + 2], w = pq[j * 4 + 3];
    const tx = pt[j * 3], ty = pt[j * 3 + 1] - (rig.above[j] ? 0 : TUCK * pose.tuck), tz = pt[j * 3 + 2];
    const o = off + j * 8;
    out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
    out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
    out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
    out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
    out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
  }
}


