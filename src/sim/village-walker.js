import { OPENING_CLIPS, OPENING_MOVES, OPENING_RUN } from '../core/opening.js';
import { LISANDRA_SCALE } from '../core/lisandra.js';
import { C, C_PALETTE, C_PROPS } from '../core/layout.js';
import { clamp, lerp, quatAxisAngle, quatMul, quatNormalize, quatRotate, quatYaw, wrapAngle } from '../core/math.js';
import { ArmsRig } from './anim.js';
import { Cloth } from './cloth.js';

const WALK = 'Walk_Loop';
const SPEED = 0.9;
const RADIUS = 0.48;
// Which way her finger joints bend to close (src/sim/village-walker.js storyPose: the snap).
const FINGER_CURL = 1;

export class VillageWalker {
  constructor(buffer, form, opening = false) {
    this.route = form.route;
    this.legRadii = form.legRadii;
    this.bodyRadius = RADIUS * 2;
    this.walk = form.walk || WALK;
    const clips = new Set([this.walk, 'idle']);
    if (opening) for (const clip of OPENING_CLIPS) clips.add(clip);
    this.rig = new ArmsRig(buffer, LISANDRA_SCALE, clips);
    // Her skirt, tabard and sleeves are bones that hang and swing (src/sim/cloth.js).
    this.cloth = this.rig.extras.cloth && form.cloth ? new Cloth(this.rig, this.rig.extras.cloth, form.cloth, LISANDRA_SCALE) : null;
    this.clothDt = 0;
    this.skirtLegs = ['Left', 'Right'].flatMap((side) => ['UpLeg', 'Leg', 'Foot'].map(
      (part) => this.rig.index.get(`mixamorig:${side}${part}`),
    ));
    const hipsJoint = this.rig.index.get('mixamorig:Hips');
    for (const clip of Object.values(this.rig.clips)) {
      this.fitArms(clip, form.armClearance);
      const track = clip.trs[hipsJoint];
      if (!OPENING_CLIPS.includes(clip.name) || OPENING_MOVES.includes(clip.name) || !track) continue;
      // Story blocking places Lisandra on her mark. Keep vertical recoil and
      // a little weight shift without carrying motion-capture travel into it.
      const x = track[0], z = track[2];
      for (let i = 0; i < track.length; i += 3) {
        track[i] = x + Math.max(-0.1, Math.min(0.1, track[i] - x));
        track[i + 2] = z + Math.max(-0.1, Math.min(0.1, track[i + 2] - z));
      }
    }
    if (opening) {
      for (const name of ['Spell_Simple_Idle_Loop', 'Idle_FoldArms_Loop', 'Crouch_Idle_Loop', 'wait', 'Idle_Talking_Loop', ...OPENING_MOVES]) {
        if (this.rig.clips[name]) this.rig.clips[name].loop = true;
      }
      // Her stride in the jog and the run, with the travel taken out as for the walk.
      this.moveRate = {};
      for (const name of OPENING_MOVES) {
        const c = this.rig.clips[name], tr = c?.trs[hipsJoint];
        if (!tr) continue;
        const travel = tr[tr.length - 1] - tr[2];
        for (let i = 0; i < c.frames; i++) tr[i * 3 + 2] -= travel * i / (c.frames - 1);
        // In a gown she runs with the knees kept low and the stride short (quicker steps for the same speed), her arms
        // closer in; the witch bent over a little even running.
        let stride = 1;
        if (form.gown) {
          const g = form.gown, sprint = name === 'Sprint_Loop';
          stride = sprint ? 0.8 : 0.72;
          this.gownWalk(c, { stride, knee: sprint ? 1.25 : 1.0, inward: (g.inward ?? 0.04) * 0.7, shift: 0.01, roll: 0.03, arms: Math.min(1, (g.arms ?? 1) * 1.7), stoop: (g.stoop || 0) * 0.6 });
        }
        this.moveRate[name] = c.dur / ((travel > 0.3 ? travel : name === 'Sprint_Loop' ? 3.4 : 2.3) * stride);
      }
      this.storyPose();
    }
    const clip = this.rig.clips[this.walk];
    clip.loop = true;
    if (form.gown) this.gownWalk(clip, form.gown);
    // The patrol moves the body. Remove the clip's forward travel while keeping sway and bob.
    const hips = clip.trs[this.rig.index.get('mixamorig:Hips')];
    const travel = hips[hips.length - 1] - hips[2];
    for (let i = 0; i < clip.frames; i++) hips[i * 3 + 2] -= travel * i / (clip.frames - 1);
    // An in-place clip has no travel to measure; then its stride is given.
    this.walkRate = SPEED * clip.dur / ((travel > 0.2 ? travel : form.stride * 2) * (form.gown?.stride ?? 1));
    // Her step in each way of moving, so a change of gait carries it on (act).
    this.stride = {};
    for (const name of [this.walk, ...(opening ? OPENING_MOVES : [])]) if (this.rig.clips[name]) this.stride[name] = this.strideOf(this.rig.clips[name]);
    this.rig.rootQ = new Float32Array(4);
    this.rig.rootT = new Float32Array(3);
    this.walkTravel = travel;
    this.reset();
  }

  // A walk for a long gown: shorter steps, the knee kept from kicking the heel up into the skirt, the feet set nearer one
  // line, the hips carried out over the standing leg, and the arms' swing kept small. stoop bends her over from the waist
  // (the witch's shuffle), with the head lifted back to see where she's going. Turns are made in the hips' parent space,
  // like fitArms.
  gownWalk(clip, { stride = 0.8, knee = 0.8, inward = 0.04, shift = 0.022, roll = 0.06, arms = 1, stoop = 0 }) {
    const rig = this.rig;
    // (In the clip's own space: with no root turn, not the one she's placed by.)
    const rootQ = rig.rootQ, rootT = rig.rootT;
    rig.rootQ = null; rig.rootT = null;
    const J = (n) => rig.index.get('mixamorig:' + n);
    const hips = J('Hips'), parentOf = (j) => rig.parent[j];
    const q = new Float32Array(4), d = new Float32Array(4), inv = new Float32Array(4), axis = new Float32Array(3);
    const frames = clip.frames, palette = new Float32Array(rig.count * 8);
    // When her left knee is furthest forward, her left heel is coming down: the rest of the sway keys off that.
    let lead = 0, best = -Infinity;
    for (let i = 0; i < frames; i++) {
      rig.solve(clip, clip.dur * i / (frames - 1), 1, palette, 0);
      const z = rig.wt[J('LeftLeg') * 3 + 2] - rig.wt[hips * 3 + 2];
      if (z > best) { best = z; lead = i; }
    }
    const phase = (i) => Math.sin(2 * Math.PI * (i - lead) / (frames - 1));
    for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
      const thigh = clip.rots[J(side + 'UpLeg')];
      if (thigh) {
        // Shorter steps: each key drawn toward the thigh's average turn.
        const m = new Float32Array(4);
        for (let i = 0; i < frames; i++) {
          const s0 = thigh[i * 4] * thigh[0] + thigh[i * 4 + 1] * thigh[1] + thigh[i * 4 + 2] * thigh[2] + thigh[i * 4 + 3] * thigh[3] < 0 ? -1 : 1;
          for (let a = 0; a < 4; a++) m[a] += thigh[i * 4 + a] * s0;
        }
        quatNormalize(m, 0);
        for (let i = 0; i < frames; i++) {
          const s0 = thigh[i * 4] * m[0] + thigh[i * 4 + 1] * m[1] + thigh[i * 4 + 2] * m[2] + thigh[i * 4 + 3] * m[3] < 0 ? -1 : 1;
          for (let a = 0; a < 4; a++) thigh[i * 4 + a] = m[a] + (thigh[i * 4 + a] * s0 - m[a]) * stride;
          quatNormalize(thigh, i * 4);
        }
      }
      const shin = clip.rots[J(side + 'Leg')];
      if (shin) {
        // The knee bends no further than `knee` radians before it eases off hard.
        const j = J(side + 'Leg') * 4, r = rig.restR;
        inv.set([-r[j], -r[j + 1], -r[j + 2], r[j + 3]]);
        for (let i = 0; i < frames; i++) {
          quatMul(d, 0, inv, 0, shin, i * 4);
          const w = Math.min(1, Math.abs(d[3])), angle = 2 * Math.acos(w);
          if (angle <= knee) continue;
          const want = knee + (angle - knee) * 0.3;
          const sn = Math.sin(angle / 2) || 1, k = Math.sin(want / 2) / sn * Math.sign(d[3] || 1);
          d[0] *= k; d[1] *= k; d[2] *= k; d[3] = Math.cos(want / 2);
          quatMul(shin, i * 4, r, j, d, 0);
          quatNormalize(shin, i * 4);
        }
      }
      // Feet toward one line: each thigh turned in a little about the forward axis.
      if (thigh) {
        const p = parentOf(J(side + 'UpLeg'));
        for (let i = 0; i < frames; i++) {
          rig.solve(clip, clip.dur * i / (frames - 1), 1, palette, 0);
          if (p >= 0) {
            inv.set([-rig.wq[p * 4], -rig.wq[p * 4 + 1], -rig.wq[p * 4 + 2], rig.wq[p * 4 + 3]]);
            quatRotate(axis, 0, inv, 0, [0, 0, 1], 0);
          } else axis.set([0, 0, 1]);
          quatAxisAngle(q, 0, axis[0], axis[1], axis[2], -sign * inward);
          quatMul(thigh, i * 4, q, 0, thigh, i * 4);
        }
      }
    }
    // The arms swing a part of what the clip swings: each key drawn toward the arm's average turn.
    if (arms < 1) {
      for (const n of ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm']) {
        const tr = clip.rots[J(n)];
        if (!tr) continue;
        const m = new Float32Array(4);
        for (let i = 0; i < frames; i++) {
          const s0 = tr[i * 4] * tr[0] + tr[i * 4 + 1] * tr[1] + tr[i * 4 + 2] * tr[2] + tr[i * 4 + 3] * tr[3] < 0 ? -1 : 1;
          for (let a = 0; a < 4; a++) m[a] += tr[i * 4 + a] * s0;
        }
        quatNormalize(m, 0);
        for (let i = 0; i < frames; i++) {
          const s0 = tr[i * 4] * m[0] + tr[i * 4 + 1] * m[1] + tr[i * 4 + 2] * m[2] + tr[i * 4 + 3] * m[3] < 0 ? -1 : 1;
          for (let a = 0; a < 4; a++) tr[i * 4 + a] = m[a] + (tr[i * 4 + a] * s0 - m[a]) * arms;
          quatNormalize(tr, i * 4);
        }
      }
    }
    // Bent over from the waist, the neck lifting the head back up: each a turn about her side, in body space.
    if (stoop) {
      for (const [n, angle] of [['Spine1', stoop * 0.55], ['Spine2', stoop * 0.45], ['Neck', -stoop * 0.5], ['Head', -stoop * 0.3]]) {
        const j = J(n), tr = clip.rots[j], pj = parentOf(j);
        if (!tr || pj < 0) continue;
        for (let i = 0; i < frames; i++) {
          rig.solve(clip, clip.dur * i / (frames - 1), 1, palette, 0);
          inv.set([-rig.wq[pj * 4], -rig.wq[pj * 4 + 1], -rig.wq[pj * 4 + 2], rig.wq[pj * 4 + 3]]);
          quatRotate(axis, 0, inv, 0, [1, 0, 0], 0);
          quatAxisAngle(q, 0, axis[0], axis[1], axis[2], angle);
          quatMul(tr, i * 4, q, 0, tr, i * 4);
        }
      }
    }
    // The hips sway out over the standing leg, and its side rides up.
    const hr = clip.rots[hips], ht = clip.trs[hips];
    const p = parentOf(hips);
    for (let i = 0; i < frames; i++) {
      const f = phase(i);
      if (ht) ht[i * 3] += shift * f;
      if (!hr) continue;
      if (p >= 0) {
        rig.solve(clip, clip.dur * i / (frames - 1), 1, palette, 0);
        inv.set([-rig.wq[p * 4], -rig.wq[p * 4 + 1], -rig.wq[p * 4 + 2], rig.wq[p * 4 + 3]]);
        quatRotate(axis, 0, inv, 0, [0, 0, 1], 0);
      } else axis.set([0, 0, 1]);
      quatAxisAngle(q, 0, axis[0], axis[1], axis[2], roll * f);
      quatMul(hr, i * 4, q, 0, hr, i * 4);
    }
    rig.rootQ = rootQ; rig.rootT = rootT;
  }

  // Rotate the upper arms away from the dress in chest space. Recalculate the
  // local axis at each key so the clearance follows the pose through the cycle.
  fitArms(clip, angle) {
    const rig = this.rig;
    const palette = new Float32Array(rig.count * 8);
    const inverse = new Float32Array(4), rotation = new Float32Array(4), axis = new Float32Array(3);
    const forward = [0, 0, 1];
    for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
      const arm = rig.index.get(`mixamorig:${side}Arm`);
      const track = clip.rots[arm];
      if (!track) continue;
      const parent = rig.parent[arm] * 4;
      for (let i = 0; i < clip.frames; i++) {
        rig.solve(clip, clip.dur * i / (clip.frames - 1), 1, palette, 0);
        inverse.set([-rig.wq[parent], -rig.wq[parent + 1], -rig.wq[parent + 2], rig.wq[parent + 3]]);
        quatRotate(axis, 0, inverse, 0, forward, 0);
        quatAxisAngle(rotation, 0, axis[0], axis[1], axis[2], sign * angle);
        quatMul(track, i * 4, rotation, 0, track, i * 4);
      }
    }
  }

  // The opening's touches on top of her clips, in body space so the rig's own bone axes don't matter: her head turned to
  // something (act's b.look), a tremble when she's frightened, a snap of her left fingers (this.snapT seconds in), her
  // hands put somewhere (b.reach), a finger pointed (b.point), fists (b.fists) and a lean into it (b.lean).
  storyPose() {
    const rig = this.rig, J = (n) => rig.index.get('mixamorig:' + n);
    const head = J('Head'), neck = J('Neck'), chest = J('Spine2');
    const chain = (j) => { const c = []; for (let p = rig.parent[j]; p >= 0; p = rig.parent[p]) c.unshift(p); return c; };
    const upNeck = chain(neck), upHead = chain(head), upChest = chain(chest);
    const spine = J('Spine1'), upSpine = spine !== undefined ? chain(spine) : [];
    // A bow forward (or back, < 0) spread down her back.
    const bow = (rot, a) => {
      if (spine === undefined) { turnAbout(rot, chest, upChest, SIDE, a); return; }
      turnAbout(rot, spine, upSpine, SIDE, a * 0.5);
      turnAbout(rot, chest, upChest, SIDE, a * 0.5);
    };
    // Each arm: shoulder, elbow, wrist, the joints above each, and the knuckles that tell which way the hand faces.
    const ARMS = {};
    for (const [k, n] of [['L', 'Left'], ['R', 'Right']]) {
      const A = { arm: J(`${n}Arm`), fore: J(`${n}ForeArm`), hand: J(`${n}Hand`), knuckle: J(`${n}HandMiddle1`), index: J(`${n}HandIndex1`), pinky: J(`${n}HandPinky1`), mirror: k === 'L' ? -1 : 1 };
      if (A.arm === undefined || A.fore === undefined || A.hand === undefined) continue;
      A.upArm = chain(A.arm); A.upFore = chain(A.fore); A.upHand = chain(A.hand);
      A.fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].map((f) => [1, 2, 3].map((i) => J(`${n}Hand${f}${i}`)));
      ARMS[k] = A;
    }
    const fingers = ARMS.L ? ARMS.L.fingers : [[], [], [], [], []];
    const world = new Float32Array(4), inv = new Float32Array(4), axis = new Float32Array(3), turn = new Float32Array(4);
    // Turn joint j by angle about an axis given in her body's space (list: the joints above it, root first).
    const turnAbout = (rot, j, list, ax, angle) => {
      world.set([0, 0, 0, 1]);
      for (const p of list) quatMul(world, 0, world, 0, rot, p * 4);
      inv.set([-world[0], -world[1], -world[2], world[3]]);
      quatRotate(axis, 0, inv, 0, ax, 0);
      quatAxisAngle(turn, 0, axis[0], axis[1], axis[2], angle);
      quatMul(rot, j * 4, turn, 0, rot, j * 4);
    };
    const UP = [0, 1, 0], SIDE = [1, 0, 0], FORE = [0, 0, 1];
    // The way her face points in the head bone's own frame (she faces +Z in the bind pose).
    const faceLocal = new Float32Array(3), hq = new Float32Array(4), fwd = new Float32Array(3), side = [1, 0, 0];
    quatRotate(faceLocal, 0, rig.ibQ, head * 4, FORE, 0);
    this.headJoint = head;
    this.lookYaw = 0; this.lookPitch = 0; this.lookW = 0; this.snapT = -1;
    this.reachW = { L: 0, R: 0 }; this.reachAt = { L: null, R: null }; this.pointW = 0; this.pointDir = null; this.fistW = 0; this.leanNow = 0;
    // Where joint j is in her body's space as posed so far (its position into out).
    const fq = new Float32Array(4), fv = new Float32Array(3);
    const where = (rot, tr, j, out) => {
      fq.set([0, 0, 0, 1]); out[0] = out[1] = out[2] = 0;
      for (let p = j, list = [...chain(j), j], i = 0; i < list.length; i++) {
        p = list[i];
        quatRotate(fv, 0, fq, 0, tr, p * 3);
        out[0] += fv[0]; out[1] += fv[1]; out[2] += fv[2];
        quatMul(fq, 0, fq, 0, rot, p * 4);
      }
      return out;
    };
    const pS = new Float32Array(3), pE = new Float32Array(3), pH = new Float32Array(3), pA = new Float32Array(3), pB = new Float32Array(3);
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (v) => Math.hypot(v[0], v[1], v[2]);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const angle = (a, b) => Math.acos(clamp((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / Math.max(1e-6, len(a) * len(b)), -1, 1));
    const unit = (v, fallback) => { const l = len(v); return l > 1e-5 ? [v[0] / l, v[1] / l, v[2] / l] : fallback; };
    // A hand to a point (body space) by the shoulder and the elbow, each turned whole at its joint: the elbow opens or
    // closes to the distance, the shoulder swings the arm onto the point. Out of reach, she leans into it first. face:
    // 'down' lays the palm flat on something, 'up' turns it up to look into, null leaves the wrist as the clip has it.
    const reach = (rot, tr, A, T, w, face) => {
      where(rot, tr, A.arm, pS); where(rot, tr, A.fore, pE); where(rot, tr, A.hand, pH);
      const a = len(sub(pE, pS)), b = len(sub(pH, pE));
      const want = [lerp(pH[0], T[0], w), lerp(pH[1], T[1], w), lerp(pH[2], T[2], w)];
      const short = len(sub(want, pS)) - (a + b) * 0.97;
      if (short > 0) {
        bow(rot, Math.min(0.45, short * 3) * w);
        where(rot, tr, A.arm, pS); where(rot, tr, A.fore, pE); where(rot, tr, A.hand, pH);
      }
      const u = sub(pS, pE), v = sub(pH, pE);
      const d = clamp(len(sub(want, pS)), Math.abs(a - b) + 1e-3, (a + b) * 0.999);
      const bend = Math.acos(clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
      turnAbout(rot, A.fore, A.upFore, unit(cross(u, v), [1, 0, 0]), bend - angle(u, v));
      where(rot, tr, A.hand, pH);
      const h = sub(pH, pS), t = sub(want, pS);
      turnAbout(rot, A.arm, A.upArm, unit(cross(h, t), [1, 0, 0]), angle(h, t));
      // The back of the hand (knuckles along, index to little finger across) turned to face up, or down.
      if (face && A.knuckle !== undefined && A.index !== undefined && A.pinky !== undefined) {
        where(rot, tr, A.hand, pH); where(rot, tr, A.knuckle, pE); where(rot, tr, A.index, pA); where(rot, tr, A.pinky, pB);
        const c = cross(sub(pE, pH), sub(pA, pB)), back = unit([c[0] * A.mirror, c[1] * A.mirror, c[2] * A.mirror], null);
        const to = face === 'up' ? [0, -1, 0] : UP;
        if (back) turnAbout(rot, A.hand, A.upHand, unit(cross(back, to), [1, 0, 0]), angle(back, to) * w);
      }
    };
    // Fingers closed by k (0..1): a fist, or with the index left out, a point. (Both hands' joints curl the same way round.)
    const FIST = [[0.5, 0.35, 0.2], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9]];
    const grip = (rot, A, k, point) => {
      A.fingers.forEach((bones, f) => bones.forEach((j, i) => {
        if (j === undefined || (point && f === 1)) return;
        if (f === 0) quatAxisAngle(turn, 0, 0, 1, 0, -0.8 * FIST[f][i] * k);
        else quatAxisAngle(turn, 0, 0, 0, 1, FIST[f][i] * k * FINGER_CURL);
        quatMul(rot, j * 4, rot, j * 4, turn, 0);
      }));
    };
    rig.poseModifier = (rot, tr) => {
      // Leaning in, then hands where they're put, a finger at you, and fists.
      if (Math.abs(this.leanNow) > 1e-3) bow(rot, this.leanNow);
      for (const k of ['L', 'R']) {
        if (!(this.reachW[k] > 1e-3 && this.reachAt[k] && ARMS[k])) continue;
        // (A knee by name, 'LeftLeg' or 'RightLeg': the wrist just behind the top of it, the palm over the kneecap.)
        let T = this.reachAt[k][1];
        if (typeof T === 'string') {
          const j = J(T);
          if (j === undefined) continue;
          where(rot, tr, j, pA);
          T = [pA[0], pA[1] + 0.08, pA[2] - 0.05];
        }
        reach(rot, tr, ARMS[k], T, this.reachW[k], this.reachAt[k][2]);
      }
      if (this.pointW > 1e-3 && this.pointDir && ARMS.R) {
        const A = ARMS.R, D = this.pointDir;
        where(rot, tr, A.arm, pS); where(rot, tr, A.fore, pE); where(rot, tr, A.hand, pH);
        const L = len(sub(pE, pS)) + len(sub(pH, pE));
        reach(rot, tr, A, [pS[0] + D[0] * L, pS[1] + D[1] * L, pS[2] + D[2] * L], this.pointW, null);
        grip(rot, A, this.pointW, true);
      }
      if (this.fistW > 1e-3) for (const k of ['L', 'R']) if (ARMS[k] && !(k === 'R' && this.pointW > 0.5)) grip(rot, ARMS[k], this.fistW, false);
      if (this.lookW > 1e-3) {
        // A real look: where the clip has her face pointing is measured, and the neck and head make up the difference to
        // the mark, so a clip that bows her head doesn't leave her talking to the floor.
        world.set([0, 0, 0, 1]);
        for (const p of upHead) quatMul(world, 0, world, 0, rot, p * 4);
        quatMul(hq, 0, world, 0, rot, head * 4);
        quatRotate(fwd, 0, hq, 0, faceLocal, 0);
        const hy = Math.atan2(fwd[0], fwd[2]), hp = Math.atan2(-fwd[1], Math.hypot(fwd[0], fwd[2]));
        const dy = clamp(wrapAngle(this.lookYaw - hy), -1.2, 1.2) * this.lookW * 0.9;
        const dp = clamp(this.lookPitch - hp, -1.3, 1.3) * this.lookW * 0.9;
        turnAbout(rot, neck, upNeck, UP, dy * 0.4);
        turnAbout(rot, head, upHead, UP, dy * 0.6);
        side[0] = Math.cos(this.lookYaw); side[2] = -Math.sin(this.lookYaw);
        // (A big lift, off the ground to your face, comes from the chest and neck as well as the head; with a hand put
        // somewhere, from the neck and head only, so the hand stays put.)
        const held = Math.max(this.reachW.L, this.reachW.R, this.pointW), fromChest = 0.25 * (1 - held);
        turnAbout(rot, chest, upChest, side, dp * fromChest);
        turnAbout(rot, neck, upNeck, side, dp * (0.3 + (0.25 - fromChest) * 0.5));
        turnAbout(rot, head, upHead, side, dp * (0.45 + (0.25 - fromChest) * 0.5));
      }
      if (this.heave) {
        // Winded: her chest heaving with each breath.
        const k = Math.sin(this.breath * 4.4);
        turnAbout(rot, chest, upChest, SIDE, k * 0.07);
        turnAbout(rot, head, upHead, SIDE, -k * 0.03);
      }
      if (this.frightened) {
        const t = this.time;
        turnAbout(rot, head, upHead, FORE, Math.sin(t * 19) * 0.012 + Math.sin(t * 31) * 0.006);
        turnAbout(rot, chest, upChest, SIDE, Math.sin(t * 8.5) * 0.014);
      }
      if (this.snapT >= 0 && this.snapT < 1.2 && fingers[2][0] !== undefined) {
        // Thumb and middle finger pressed, ring and little finger tucked; on the snap the middle finger cracks down into
        // the palm, and the hand eases open again after.
        const t = this.snapT, set = clamp(t / 0.18, 0, 1) * (1 - clamp((t - 0.8) / 0.4, 0, 1));
        const crack = clamp((t - 0.3) / 0.05, 0, 1);
        const curl = [[0.5, 0.35, 0.2], [0.35, 0.4, 0.3], [0.45 + 0.75 * crack, 0.4 + 0.9 * crack, 0.3 + 0.5 * crack], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9]];
        fingers.forEach((bones, f) => bones.forEach((j, k) => {
          if (j === undefined) return;
          if (f === 0) quatAxisAngle(turn, 0, 0, 1, 0, -0.8 * curl[f][k] * set);
          else quatAxisAngle(turn, 0, 0, 0, 1, curl[f][k] * set * FINGER_CURL);
          quatMul(rot, j * 4, rot, j * 4, turn, 0);
        }));
      }
    };
  }

  reset() {
    [this.x, this.z] = this.route[0];
    const [tx, tz] = this.route[1];
    this.yaw = Math.atan2(tx - this.x, tz - this.z);
    this.y = 0;
    this.next = 1;
    this.clip = this.walk;
    this.time = 0;
    this.fade = 1;
    this.cloth?.reset();
  }

  update(dt, world, wait = false, idle = 'idle', speed = SPEED) {
    this.frightened = wait && ['afraid', 'frightened', 'scared_02'].includes(idle);
    const [tx, tz] = this.route[this.next];
    const dx = tx - this.x, dz = tz - this.z;
    const distance = Math.hypot(dx, dz);
    const step = Math.min(distance, speed * dt);
    const x = distance ? this.x + dx / distance * step : tx;
    const z = distance ? this.z + dz / distance * step : tz;
    const clear = !world.inside(x, z, RADIUS);
    if (clear && !wait) {
      this.x = x;
      this.z = z;
      if (distance > 0) this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * Math.min(1, 7 * dt);
      if (step === distance) this.next = (this.next + 1) % this.route.length;
    }
    this.y = world.height(this.x, this.z);
    const clip = clear && !wait ? this.walk : idle;
    if (clip !== this.clip) {
      this.rig.capture();
      this.clip = clip;
      this.time = 0;
      this.fade = 0;
    }
    this.clothDt += dt;
    this.fade = Math.min(1, this.fade + dt * 5);
    this.time += dt * (clip === this.walk ? this.walkRate * speed / SPEED : 1);
  }

  // The opening's blocking (src/sim/opening.js). b.to: a mark to go to at b.speed, walking, jogging or running by the pace
  // (or, with b.keepFace, stepping there in b.clip while still facing b.face). Otherwise she stands in b.clip, turning to
  // b.face; b.hold stops the clip that many seconds in. b.look: a point to turn her head to (b.whip: fast). b.snap: seconds
  // into a snap of her fingers. b.tremble: she's shaking.

  // Where in a clip's loop her left heel comes down (its left knee furthest ahead of the right), as a part of the loop, and
  // how many strides the loop holds.
  strideOf(clip) {
    const rig = this.rig, rootQ = rig.rootQ, rootT = rig.rootT;
    rig.rootQ = null; rig.rootT = null;
    const L = rig.index.get('mixamorig:LeftLeg'), R = rig.index.get('mixamorig:RightLeg');
    const N = 64, s = [], palette = new Float32Array(rig.count * 8);
    for (let i = 0; i < N; i++) {
      rig.solve(clip, clip.dur * i / N, 1, palette, 0);
      s.push(rig.wt[L * 3 + 2] - rig.wt[R * 3 + 2]);
    }
    rig.rootQ = rootQ; rig.rootT = rootT;
    const mean = s.reduce((a, b) => a + b, 0) / N;
    let at = 0, n = 0;
    for (let i = 0; i < N; i++) {
      if (s[i] > s[at]) at = i;
      if (s[i] <= mean && s[(i + 1) % N] > mean) n++;
    }
    return { at: at / N, n: Math.max(1, n) };
  }
  act(dt, world, b) {
    let pace = 0;
    if (b.to && b.speed > 0) {
      const dx = b.to[0] - this.x, dz = b.to[1] - this.z, d = Math.hypot(dx, dz);
      // (b.pace, when given, is how fast she's really going, for the clip: b.speed may only be what puts her on her mark
      // this tick. Already on it, she's still under way, and stopping the walk for a tick would restart it.)
      if (d > 0.02) {
        const step = Math.min(d, b.speed * dt);
        this.x += dx / d * step; this.z += dz / d * step;
        pace = b.pace ?? b.speed;
        if (!b.keepFace) this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * Math.min(1, (b.turn ?? 9) * dt);
      } else if (b.pace > 0.05) pace = b.pace;
    }
    if ((!pace || b.keepFace) && b.face !== undefined && b.face !== null) this.yaw += wrapAngle(b.face - this.yaw) * Math.min(1, (b.turn ?? 6) * dt);
    // (b.lift: off the ground, stood on a shield or in a hop.)
    this.y = world.height(this.x, this.z) + (b.lift || 0);
    const moving = pace && !b.keepFace;
    // Walk, jog or sprint by pace (b.gaits: where the jog and the sprint begin), a little either side of each change so a
    // pace on the line doesn't flick between them.
    const jog = this.clip === OPENING_RUN, run = this.clip === 'Sprint_Loop', [toJog, toRun] = b.gaits || [2.1, 4.7];
    const clip = moving ? (pace < (jog || run ? toJog - 0.4 : toJog) ? this.walk : pace < (run ? toRun - 0.6 : toRun) ? OPENING_RUN : 'Sprint_Loop') : (b.clip || 'idle');
    if (clip !== this.clip) {
      // From one way of moving to another, her step carries on: the new clip picks up at the same point in her stride
      // (left heel down, right, ...) as the one she was in, rather than at its first frame, so her feet don't skip.
      const was = this.stride?.[this.clip], now = this.stride?.[clip], from = this.rig.clips[this.clip];
      this.rig.capture();
      if (moving && was && now && from && b.from === undefined) {
        const ph = ((((this.time % from.dur) / from.dur - was.at) * was.n) % 1 + 1) % 1;
        this.time = ((now.at + ph / now.n) % 1) * this.rig.clips[clip].dur;
      } else this.time = b.from ?? 0;
      this.clip = clip;
      this.fade = 0;
    }
    this.clothDt += dt;
    this.fade = Math.min(1, this.fade + dt * (b.blend ?? 5));
    const rate = !moving ? (b.rate ?? 1) : clip === this.walk ? this.walkRate * pace / SPEED : (this.moveRate?.[clip] ?? 0.4) * pace;
    this.time += dt * rate;
    if (b.hold !== undefined) this.time = Math.min(this.time, b.hold);
    this.frightened = !!b.tremble;
    this.heave = !!b.heave;
    this.breath = (this.breath || 0) + dt;
    this.snapT = b.snap ?? -1;
    // (A hand put somewhere eases there and back, and keeps its spot while it lets go.) b.reach: [[side, [x, y, z], face]],
    // in her body's space (x to her left, y up from her feet, z ahead). b.point: a point in the world for her right finger.
    const ease = Math.min(1, dt * 7);
    for (const s of ['L', 'R']) {
      const r = b.reach?.find((e) => e[0] === s);
      if (r) this.reachAt[s] = r;
      this.reachW[s] += ((r ? 1 : 0) - this.reachW[s]) * ease;
    }
    if (b.point) {
      const dx = b.point[0] - this.x, dy = b.point[1] - (this.y + 1.35), dz = b.point[2] - this.z, c = Math.cos(this.yaw), s = Math.sin(this.yaw);
      const bx = dx * c - dz * s, bz = dx * s + dz * c, l = Math.hypot(bx, dy, bz) || 1;
      this.pointDir = [bx / l, dy / l, bz / l];
    }
    this.pointW += ((b.point ? 1 : 0) - this.pointW) * Math.min(1, dt * 9);
    this.fistW += ((b.fists ? 1 : 0) - this.fistW) * Math.min(1, dt * 10);
    this.leanNow += ((b.lean || 0) - this.leanNow) * Math.min(1, dt * 6);
    const k = Math.min(1, dt * (b.whip ? 18 : 5));
    this.lookW += ((b.look ? 1 : 0) - this.lookW) * Math.min(1, dt * 4);
    if (b.look) {
      // From where her head really is (last frame's), so the look still finds you when she's down on one knee.
      const h = this.headJoint !== undefined ? this.headJoint * 3 : -1, wt = this.rig.wt;
      const hx = h >= 0 ? wt[h] : this.x, hy = h >= 0 && wt[h + 1] > this.y + 0.3 ? wt[h + 1] : this.y + 1.55, hz = h >= 0 ? wt[h + 2] : this.z;
      const lx = b.look[0] - hx, lz = b.look[2] - hz;
      // On the move the head mostly keeps to the way she's going: a glance, not a turn, and never bowed so far that her
      // hair falls over her face.
      const yaw = clamp(wrapAngle(Math.atan2(lx, lz) - this.yaw), moving ? -0.7 : -1.15, moving ? 0.7 : 1.15);
      const pitch = clamp(Math.atan2(hy - b.look[1], Math.max(0.5, Math.hypot(lx, lz))), -0.5, moving ? 0.18 : 0.6);
      this.lookYaw += (yaw - this.lookYaw) * k;
      this.lookPitch += (pitch - this.lookPitch) * k;
    }
  }

  write(snap, offset) {
    const rig = this.rig;
    quatYaw(rig.rootQ, 0, this.yaw);
    rig.rootT.set([this.x, this.y, this.z]);
    rig.solve(rig.clips[this.clip], this.time, this.fade, snap, offset + C_PALETTE);
    if (this.cloth) {
      // Put somewhere new (a cut, a teleport), the cloth starts hanging still rather than flying after her.
      if (Math.hypot(this.x - (this.clothX ?? this.x), this.z - (this.clothZ ?? this.z)) > 1.5) this.cloth.reset();
      this.clothX = this.x; this.clothZ = this.z;
      this.cloth.step(this.clothDt, snap, offset + C_PALETTE, this.wind || 0, this.y);
      this.clothDt = 0;
    }
    // The render pass uses the current thigh and shin shapes to keep the marked
    // dress panels outside the moving legs. Points are in world space.
    const skirt = offset + C_PALETTE + rig.count * 8;
    this.skirtLegs.forEach((joint, i) => {
      const k = joint * 3, p = skirt + i * 4;
      snap[p] = rig.wt[k];
      snap[p + 1] = rig.wt[k + 1];
      snap[p + 2] = rig.wt[k + 2];
      snap[p + 3] = this.legRadii[i % 3];
    });
    snap[skirt + 24] = this.yaw;
    // The unused NPC prop frame carries the animated speech anchor.
    const head = rig.index.get('mixamorig:Head') * 3;
    snap[offset + C_PROPS] = rig.wt[head];
    snap[offset + C_PROPS + 1] = rig.wt[head + 1] + 0.19;
    snap[offset + C_PROPS + 2] = rig.wt[head + 2];
    // Her left hand, where it is and how it's turned, for the book when she clutches it (src/gfx/opening.js placeBook).
    const hand = this.leftHand ??= rig.index.get('mixamorig:LeftHand');
    if (hand !== undefined) {
      for (let a = 0; a < 3; a++) snap[offset + C_PROPS + 4 + a] = rig.wt[hand * 3 + a];
      for (let a = 0; a < 4; a++) snap[offset + C_PROPS + 7 + a] = rig.wq[hand * 4 + a];
    }
    // And her right hand's place (where the story puts it: src/sim/opening.js).
    const right = this.rightHand ??= rig.index.get('mixamorig:RightHand');
    if (right !== undefined) for (let a = 0; a < 3; a++) snap[offset + C_PROPS + 12 + a] = rig.wt[right * 3 + a];
    snap[offset + C.ACTIVE] = 1;
    snap[offset + C.X] = this.x;
    snap[offset + C.Y] = this.y;
    snap[offset + C.Z] = this.z;
    snap[offset + C.YAW] = this.yaw;
  }
}
