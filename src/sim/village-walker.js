import { OPENING_CLIPS, OPENING_MOVES } from '../core/opening.js';
import { LISANDRA_SCALE } from '../core/lisandra.js';
import { C, C_PALETTE, C_PROPS } from '../core/layout.js';
import { clamp, quatAxisAngle, quatMul, quatNormalize, quatRotate, quatYaw, wrapAngle } from '../core/math.js';
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
    this.rig.rootQ = new Float32Array(4);
    this.rig.rootT = new Float32Array(3);
    const clip = this.rig.clips[this.walk];
    clip.loop = true;
    if (form.gown) this.gownWalk(clip, form.gown);
    // The patrol moves the body. Remove the clip's forward travel while keeping sway and bob.
    const hips = clip.trs[this.rig.index.get('mixamorig:Hips')];
    const travel = hips[hips.length - 1] - hips[2];
    for (let i = 0; i < clip.frames; i++) hips[i * 3 + 2] -= travel * i / (clip.frames - 1);
    // An in-place clip has no travel to measure; then its stride is given.
    this.walkRate = SPEED * clip.dur / ((travel > 0.2 ? travel : form.stride * 2) * (form.gown?.stride ?? 1));
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
  // something (act's b.look), a tremble when she's frightened, and a snap of her left fingers (this.snapT seconds in).
  storyPose() {
    const rig = this.rig, J = (n) => rig.index.get('mixamorig:' + n);
    const head = J('Head'), neck = J('Neck'), chest = J('Spine2');
    const chain = (j) => { const c = []; for (let p = rig.parent[j]; p >= 0; p = rig.parent[p]) c.unshift(p); return c; };
    const upNeck = chain(neck), upHead = chain(head), upChest = chain(chest);
    const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].map((f) => [1, 2, 3].map((k) => J(`LeftHand${f}${k}`)));
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
    this.lookYaw = 0; this.lookPitch = 0; this.snapT = -1;
    rig.poseModifier = (rot) => {
      if (Math.abs(this.lookYaw) + Math.abs(this.lookPitch) > 1e-4) {
        turnAbout(rot, neck, upNeck, UP, this.lookYaw * 0.4);
        turnAbout(rot, head, upHead, UP, this.lookYaw * 0.6);
        turnAbout(rot, head, upHead, SIDE, this.lookPitch);
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
    this.y = world.height(this.x, this.z);
    const moving = pace && !b.keepFace;
    // Walk, jog or sprint by pace, a little either side of each change so a pace on the line doesn't flick between them.
    const jog = this.clip === 'Jog_Fwd_Loop', run = this.clip === 'Sprint_Loop';
    const clip = moving ? (pace < (jog || run ? 1.7 : 2.1) ? this.walk : pace < (run ? 4.1 : 4.7) ? 'Jog_Fwd_Loop' : 'Sprint_Loop') : (b.clip || 'idle');
    if (clip !== this.clip) {
      this.rig.capture();
      this.clip = clip;
      this.time = b.from ?? 0;
      this.fade = 0;
    }
    this.clothDt += dt;
    this.fade = Math.min(1, this.fade + dt * (b.blend ?? 5));
    const rate = !moving ? (b.rate ?? 1) : clip === this.walk ? this.walkRate * pace / SPEED : (this.moveRate?.[clip] ?? 0.4) * pace;
    this.time += dt * rate;
    if (b.hold !== undefined) this.time = Math.min(this.time, b.hold);
    this.frightened = !!b.tremble;
    this.snapT = b.snap ?? -1;
    let yaw = 0, pitch = 0;
    if (b.look) {
      const lx = b.look[0] - this.x, lz = b.look[2] - this.z;
      // On the move the head mostly keeps to the way she's going: a glance, not a turn, and never bowed so far that her
      // hair falls over her face.
      yaw = clamp(wrapAngle(Math.atan2(lx, lz) - this.yaw), moving ? -0.7 : -1.15, moving ? 0.7 : 1.15);
      pitch = clamp(Math.atan2(this.y + 1.55 - b.look[1], Math.max(0.5, Math.hypot(lx, lz))), -0.5, moving ? 0.18 : 0.6);
    }
    const k = Math.min(1, dt * (b.whip ? 18 : 5));
    this.lookYaw += (yaw - this.lookYaw) * k;
    this.lookPitch += (pitch - this.lookPitch) * k;
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
    snap[offset + C.ACTIVE] = 1;
    snap[offset + C.X] = this.x;
    snap[offset + C.Y] = this.y;
    snap[offset + C.Z] = this.z;
    snap[offset + C.YAW] = this.yaw;
  }
}
