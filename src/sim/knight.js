// A knight on the UAL skeleton: layered animation, plate hits and wounds, and the brain.
import { C, C_BLEEDS, C_GASH, C_MASKS, C_PALETTE, C_PROPS, EV, GASH_FLOATS, MAX_BLEEDS, MAX_GASH, TACTICS } from '../core/layout.js';
import { clamp, damp, lerp, mat4FromQT, quatMul, quatNlerp, quatRotate, smoothstep, wrapAngle } from '../core/math.js';
import { Pose, solveFK, writePalette } from './anim.js';
import { PlateBVH } from './world.js';

export const S = { PATROL: 0, ALERT: 1, APPROACH: 2, CIRCLE: 3, ATTACK: 4, BLOCK: 5, ROLL: 6, STAGGER: 7, RETREAT: 8, BREAK: 9, DEAD: 10, TAUNT: 11, FEINT: 12, IDLE: 13 };

// Blows the knight knows. active is where in the clip the blade can land, as fractions, measured from the hand's
// speed in each clip (see tools/armor/measure_blows.py). end cuts a combo's long recovery short.
const ATTACKS = {
  a: { clip: 'Sword_Regular_A', rec: 'Sword_Regular_A_Rec', rate: 0.62, active: [[0.4, 0.66]], reach: 2.7, dmg: 13, lunge: [0.2, 0.62, 3.4], stam: 6, range: [0, 2.9] },
  b: { clip: 'Sword_Regular_B', rec: 'Sword_Regular_B_Rec', rate: 0.6, active: [[0.34, 0.6]], reach: 2.6, dmg: 13, lunge: [0.1, 0.56, 2.8], stam: 6, range: [0, 2.7] },
  c: { clip: 'Sword_Regular_C', rate: 0.86, active: [[0.27, 0.37]], reach: 2.8, dmg: 20, lunge: [0.08, 0.33, 4.2], stam: 10, range: [1.0, 3.3], end: 0.62 },
  over: { clip: 'Sword_Attack', rate: 0.92, active: [[0.19, 0.29]], reach: 2.7, dmg: 21, lunge: [0.08, 0.26, 2.6], stam: 10, range: [0, 3.0], end: 0.7 },
  dash: { clip: 'Sword_Dash', rate: 0.95, active: [[0.15, 0.27]], reach: 2.9, dmg: 18, lunge: [0.03, 0.24, 7.6], stam: 14, range: [3.2, 6.8], end: 0.7 },
  bash: { clip: 'Shield_Dash', rate: 0.95, active: [[0.22, 0.5]], reach: 1.5, dmg: 8, lunge: [0.1, 0.52, 7.2], stam: 12, range: [1.6, 5.2], knock: 7.5, shield: true },
  hook: { clip: 'Melee_Hook', rec: 'Melee_Hook_Rec', rate: 0.72, active: [[0.36, 0.62]], reach: 1.5, dmg: 7, lunge: [0.2, 0.6, 1.8], stam: 5, range: [0, 1.9], knock: 3.5, shield: true },
  combo: { clip: 'Sword_Regular_Combo', rate: 0.82, active: [[0.055, 0.105], [0.21, 0.27], [0.49, 0.535]], reach: 2.7, dmg: 12, lunge: [0.03, 0.52, 2.0], stam: 16, range: [0, 2.8], end: 0.68 },
  heavy: { clip: 'Sword_Heavy_Combo', rate: 0.9, active: [[0.07, 0.13], [0.25, 0.29], [0.4, 0.44], [0.57, 0.605]], reach: 2.9, dmg: 17, lunge: [0.05, 0.6, 2.2], stam: 22, range: [0, 3.0], end: 0.74 },
};

const UPPER = { spine_01: 0.45, spine_02: 0.9, spine_03: 1, neck_01: 1, Head: 1 };

function segSegDist(p1, q1, p2, q2) {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]];
  const r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const a = d1[0] ** 2 + d1[1] ** 2 + d1[2] ** 2, e = d2[0] ** 2 + d2[1] ** 2 + d2[2] ** 2;
  const f = d2[0] * r[0] + d2[1] * r[1] + d2[2] * r[2];
  const c = d1[0] * r[0] + d1[1] * r[1] + d1[2] * r[2];
  const b = d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2];
  const den = a * e - b * b;
  let s = den > 1e-8 ? clamp((b * f - c * e) / den, 0, 1) : 0;
  let t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
  const dx = r[0] + d1[0] * s - d2[0] * t, dy = r[1] + d1[1] * s - d2[1] * t, dz = r[2] + d1[2] * s - d2[2] * t;
  return { dist: Math.hypot(dx, dy, dz), x: p1[0] + d1[0] * s, y: p1[1] + d1[1] * s, z: p1[2] + d1[2] * s };
}

export class Knight {
  constructor(id, kind, rig, bank, opts) {
    this.id = id; this.kind = kind; this.rig = rig; this.bank = bank; this.opts = opts;
    this.bodyRadius = 0.82;
    this.pose = new Pose(rig);
    const n = rig.count;
    this.rA = new Float32Array(n * 4); this.rB = new Float32Array(n * 4); this.rFrom = new Float32Array(n * 4);
    this.pA = new Float32Array(3); this.pB = new Float32Array(3); this.pFrom = new Float32Array(3);
    this.twist = new Float32Array(n);
    this.nod = new Float32Array(n);
    this.upper = new Float32Array(n);
    this.armR = new Float32Array(n);
    const names = rig.names;
    names.forEach((name, j) => {
      let w = UPPER[name] ?? 0;
      if (w === 0 && /^(clavicle|upperarm|lowerarm|hand|index|middle|ring|pinky|thumb)_/.test(name)) w = 1;
      this.upper[j] = w;
    });
    this.J = { spine1: rig.index.get('spine_01'), spine2: rig.index.get('spine_02'), spine3: rig.index.get('spine_03'), neck: rig.index.get('neck_01'), head: rig.index.get('Head'),
      handR: rig.index.get('hand_r'), handL: rig.index.get('hand_l'), foreL: rig.index.get('lowerarm_l'), pelvis: rig.index.get('pelvis') };
    this.bvh = rig.pieces.map((p) => (p.kind === 'mail' ? null : new PlateBVH(rig.bindPos, rig.tris, p.tstart, p.tcount)));
    this.inv = rig.pieces.map(() => ({ q: new Float32Array(4), t: new Float32Array(3), r: new Float32Array(4) }));
    this.invTick = -1;
    // Where a sword and a shield sit in the fists, on this model's proportions. Each has two holds: a
    // fighting grip, and one for arms hanging at ease, so a shield isn't carried flat at the hip.
    const grip = bank.grip;
    const lenOf = (side) => Math.hypot(...rig.restT.subarray(rig.index.get(`middle_01_${side}`) * 3, rig.index.get(`middle_01_${side}`) * 3 + 3));
    const frame = (y, z) => { const yy = norm(y), zz = norm(orth(z, yy)); return matToQuat(cross(yy, zz), yy, zz); };
    const mix3 = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
    const off = (f, kf, p, kp) => mix3(f, kf, p, kp);
    this.swordQ = new Float32Array(4); this.swordT = new Float32Array(3);
    this.shieldQ = new Float32Array(4); this.shieldT = new Float32Array(3);
    {
      const { fingers: f, palm: p, knuckles: k } = grip.r;
      const L = lenOf('r');
      this.swordFight = new Float32Array(frame(mix3(k, Math.cos(0.32), f, Math.sin(0.32)), f));
      this.swordEase = new Float32Array(frame(mix3(k, 0.5, f, 0.87), f));
      this.swordT.set(off(f, L * 0.66, p, L * 0.3));
    }
    {
      const { fingers: f, palm: p, knuckles: k } = grip.l;
      const L = lenOf('l');
      // The arm sits behind the board with air between, and the board leans out from the forearm a little.
      const lean = 0.12;
      this.shieldFight = new Float32Array(frame(k, mix3(p, Math.cos(lean), f, -Math.sin(lean))));
      this.shieldEase = new Float32Array(frame([-f[0], -f[1], -f[2]], mix3(p, Math.cos(lean), f, Math.sin(lean))));
      this.shieldT.set(off(f, L * 0.62, p, -L * 0.42));
    }
    // Where each joint stands on the ground in the bind pose, for keeping soles and bodies out of the earth.
    const bindY = (j) => {
      const q = rig.ibQ.subarray(j * 4, j * 4 + 4), t = rig.ibT.subarray(j * 3, j * 3 + 3);
      const conj = [-q[0], -q[1], -q[2], q[3]];
      const o = [0, 0, 0];
      quatRotate(o, 0, conj, 0, t, 0);
      return -o[1];
    };
    const u = rig.height / 1.9;
    this.ground = [];
    for (const side of ['l', 'r']) {
      this.ground.push([rig.index.get(`foot_${side}`), bindY(rig.index.get(`foot_${side}`))]);
      this.ground.push([rig.index.get(`ball_${side}`), bindY(rig.index.get(`ball_${side}`))]);
      this.ground.push([rig.index.get(`hand_${side}`), 0.05 * u]);
    }
    this.ground.push([this.J.pelvis, 0.17 * u], [this.J.spine3, 0.2 * u], [this.J.head, 0.16 * u]);
    // Fingers stay closed on what they hold, whatever a clip's hand is doing.
    this.fingerJoints = [];
    this.fist = new Float32Array(rig.count * 4);
    bank.sample(bank.clips.Idle_Shield_Loop, 0, this.fist, null);
    rig.names.forEach((n, j) => { if (/^(index|middle|ring|pinky|thumb)_/.test(n)) this.fingerJoints.push(j); });
    bank.sample(bank.clips.Sword_Idle, 0, this.rA, null);
    this.fingerJoints.forEach((j) => { if (rig.names[j].endsWith('_r')) for (let k = 0; k < 4; k++) this.fist[j * 4 + k] = this.rA[j * 4 + k]; });
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw ?? 0, vx: 0, vz: 0, speed: 0,
      hostile: !!opts.hostile, hp: opts.hp, maxHp: opts.hp, stam: 60, state: S.PATROL, stateT: 0,
      faceYaw: opts.yaw ?? 0, phase: Math.random(), combat: 0, combatTarget: 0, shieldUp: 0, shieldTarget: 0, fromW: 0,
      action: null, actT: 0, actRate: 1, actW: 0, actMask: 'full', actEnd: 0, gashVersion: this.gashVersion ? this.gashVersion + 1 : 1,
      gashes: [], masks: new Uint32Array(64), bleeds: [], heart: 0, routeI: 0, pauseT: Math.random() * 2, stepSide: 0,
      attack: null, attackUsed: false, attackT: 1.6, strafe: Math.random() < 0.5 ? -1 : 1, strafeT: 2, reactT: -1, reacted: false,
      seen: false, lastSeenT: 0, lastX: 0, lastZ: 0, recovering: false, rollCd: 0, blockT: 0, armor: 1, dead: false, deadT: 0, lookYaw: 0, lookPitch: 0, glint: 0,
      tactic: 1, tacticT: 0, tacticWeights: new Float32Array(TACTICS.length).fill(1 / TACTICS.length), hurt: 0, rootX: 0, rootZ: 0, staggerRes: 0, recentHits: 0,
      hitT: 10, swingBlade: null, coverX: 0, coverZ: 0, iframes: false, knock: 0, knockX: 0, knockZ: 0, lastAttack: '', tauntT: 6,
      seenSwings: { great_cut1: 0, great_cut2: 0, great_slam: 0, great_chop: 0, great_rise: 0, great_wide_r: 0, great_wide_l: 0 },
      habit: { total: 0, last: '', repeat: 0 }, moveYaw: opts.yaw ?? 0, backward: false, rollDirX: 0, rollDirZ: 0, wasOnAttack: false, activeOn: -1,
      armorHits: 0, prevClipT: 0, stamDelay: 0, lastRetreat: -99, poise: 100, groundLift: 0, windRate: 1, stats: { attacks: 0, landed: 0, blocks: 0, rolls: 0, hitsTaken: 0 },
    });
    this.pose.rot.set(this.rig.restR);
    this.pose.pelvis.set(this.bank.pelvisRest);
    this.rFrom.set(this.rig.restR);
  }

  // ---- animation ------------------------------------------------------------------------------------

  play(name, rate = 1, mask = 'full', fade = 0.12) {
    this.rFrom.set(this.pose.rot);
    this.pFrom.set(this.pose.pelvis);
    this.fromW = 1;
    this.fadeTime = fade;
    this.action = this.bank.clips[name];
    this.actT = 0; this.actRate = rate; this.actMask = mask; this.actW = 1;
    this.prevClipT = 0;
  }

  stopAction(fade = 0.18) {
    if (!this.action) return;
    this.rFrom.set(this.pose.rot);
    this.pFrom.set(this.pose.pelvis);
    this.fromW = 1; this.fadeTime = fade;
    this.action = null;
  }

  animate(dt, sim) {
    const { bank, pose, rA, rB, pA, pB, rig, J: J0 } = this;
    const { clips } = bank;
    const rot = pose.rot, pel = pose.pelvis;
    const sp = this.speed;
    const wounded = this.hurt;
    const inFight = this.combat;
    // Locomotion. The stride speeds below stop the feet skating at any pace.
    const WALK = 1.45 * rig.motionScale, JOG = 3.1 * rig.motionScale, RUN = 5.6 * rig.motionScale;
    const stride = sp < WALK ? WALK : sp < JOG ? lerp(WALK, JOG, (sp - WALK) / (JOG - WALK)) : lerp(JOG, RUN, clamp((sp - JOG) / (RUN - JOG), 0, 1));
    const cycle = lerp(clips.Walk_Loop.dur, clips.Jog_Fwd_Loop.dur, smoothstep(WALK, JOG, sp));
    const before = this.phase;
    if (sp > 0.05) {
      const dir = this.backward ? -1 : 1;
      this.phase += dir * dt * (Math.max(sp, 0.3) / stride) / cycle;
    }
    const ph = this.phase - Math.floor(this.phase);
    rot.set(rig.restR);
    pel.set(bank.pelvisRest);
    // Stand: at ease and on guard are weighted together, so moving between them never pops.
    bank.sample(clips.Idle_Loop, sim.time, rot, pel);
    if (inFight > 0.005) {
      bank.sample(clips.Idle_Shield_Loop, sim.time, rA, pA);
      blend(rot, rot, rA, inFight, rig.count);
      lerp3(pel, pel, pA, inFight);
    }
    if (wounded > 0.01) { bank.sample(clips.Zombie_Idle_Loop, sim.time, rA, null); blend(rot, rot, rA, wounded * 0.7, rig.count); }
    const moveW = smoothstep(0.06, 0.7, sp);
    if (moveW > 0.001) {
      bank.sample(clips.Walk_Formal_Loop, ph * clips.Walk_Formal_Loop.dur, rA, pA);
      if (inFight > 0.005) {
        bank.sample(clips.Walk_Loop, ph * clips.Walk_Loop.dur, rB, pB);
        blend(rA, rA, rB, inFight, rig.count);
        lerp3(pA, pA, pB, inFight);
      }
      const limp = smoothstep(0.4, 0.75, wounded);
      if (limp > 0.005) {
        bank.sample(clips.Zombie_Walk_Fwd_Loop, ph * clips.Zombie_Walk_Fwd_Loop.dur, rB, pB);
        blend(rA, rA, rB, limp, rig.count);
        lerp3(pA, pA, pB, limp);
      }
      const jogW = smoothstep(WALK * 1.05, JOG * 0.8, sp);
      if (jogW > 0.001) {
        bank.sample(clips.Jog_Fwd_Loop, ph * clips.Jog_Fwd_Loop.dur, rB, pB);
        blend(rA, rA, rB, jogW, rig.count);
        lerp3(pA, pA, pB, jogW);
        const runW = smoothstep(JOG * 1.05, RUN * 0.85, sp);
        if (runW > 0.001) {
          bank.sample(clips.Sprint_Loop, ph * clips.Sprint_Loop.dur, rB, pB);
          blend(rA, rA, rB, runW, rig.count);
          lerp3(pA, pA, pB, runW);
        }
      }
      blend(rot, rot, rA, moveW, rig.count);
      lerp3(pel, pel, pA, moveW);
      // Footfalls.
      const steps = this.backward ? [ph, before - Math.floor(before)] : [before - Math.floor(before), ph];
      for (const mark of [0.0, 0.5]) {
        const a = steps[0], b = steps[1];
        const crossed = a <= b ? a < mark && b >= mark : a < mark || b >= mark;
        if (crossed && !this.action) sim.event(EV.STEP, this.x, this.y, this.z, clamp(sp / 5, 0.2, 1), 1, this.id);
      }
    }
    // Guard stance on the upper body while moving.
    const guard = this.shieldUp * moveW;
    if (guard > 0.001) {
      bank.sample(clips.Idle_Shield_Loop, sim.time, rA, null);
      blendMask(rot, rot, rA, guard, this.upper, rig.count);
    }
    // One-shot action on top.
    if (this.action) {
      const clip = this.action;
      this.prevClipT = this.actT;
      this.actT += dt * this.actRate;
      bank.sample(clip, this.actT, rA, pA);
      // Plate doesn't fly: the roll's dive is held down to a low shoulder roll.
      if (clip === clips.Roll) pA[2] = Math.min(pA[2], bank.pelvisRest[2] * 0.62);
      const m = this.actMask === 'upper' ? this.upper : null;
      if (m) blendMask(rot, rot, rA, this.actW, m, rig.count);
      else { blend(rot, rot, rA, this.actW, rig.count); lerp3(pel, pel, pA, this.actW); }
    }
    // Ease out of whatever was showing a moment ago.
    if (this.fromW > 0.001) {
      this.fromW = Math.max(0, this.fromW - dt / this.fadeTime);
      const w = this.fromW * this.fromW * (3 - 2 * this.fromW);
      blend(rot, rot, this.rFrom, w, rig.count);
      lerp3(pel, pel, this.pFrom, w);
    }
    // In a roll or a charge the clip's left wrist would take the fist off the shield's handle, so it stays nearly straight.
    if (this.action === clips.Roll || this.action === clips.Shield_Dash) {
      const hl = J0.handL;
      quatNlerp(rot, hl * 4, rot, hl * 4, rig.restR, hl * 4, 0.8 * this.actW);
    }
    // Hands stay shut on sword and shield.
    if (!this.dead) for (const j of this.fingerJoints) { rot[j * 4] = this.fist[j * 4]; rot[j * 4 + 1] = this.fist[j * 4 + 1]; rot[j * 4 + 2] = this.fist[j * 4 + 2]; rot[j * 4 + 3] = this.fist[j * 4 + 3]; }
    // Keep the chest on the target and the eyes on the player, without wringing a rigid cuirass over the waist.
    this.twist.fill(0);
    const off = this.action && this.actMask === 'full' ? 0 : clamp(wrapAngle(this.faceYaw - this.yaw), -0.62, 0.62);
    const { J } = this;
    this.twist[J.spine1] = off * 0.28; this.twist[J.spine2] = off * 0.36; this.twist[J.spine3] = off * 0.36;
    this.twist[J.neck] = this.lookYaw * 0.45; this.twist[J.head] = this.lookYaw * 0.55;
    this.nod.fill(0);
    this.nod[J.head] = this.lookPitch;
    solveFK(pose, this.x, this.y, this.z, this.yaw, this.twist, this.nod);
    this.solveGround(dt, sim);
  }

  // No clip knows about the earth at this model's size. Find whichever joint is nearest going under and move the
  // whole body to keep it out, or down to meet the ground if every sole is hanging.
  solveGround(dt, sim) {
    const { wt } = this.pose;
    let lowest = 1e9;
    for (const [j, h] of this.ground) {
      const clear = wt[j * 3 + 1] - h - sim.world.height(wt[j * 3], wt[j * 3 + 2]);
      if (clear < lowest) lowest = clear;
    }
    const want = clamp(-lowest, -0.08, 0.7);
    // Up at once, so nothing is ever seen under the ground. Down gently, so a stride doesn't bob.
    this.groundLift = want > this.groundLift ? want : damp(this.groundLift, want, 9, dt);
    if (Math.abs(this.groundLift) < 1e-4) return;
    for (let j = 0; j < this.rig.count; j++) wt[j * 3 + 1] += this.groundLift;
  }

  // World-space weapon and shield, written as matrices for the renderer.
  writeProps(out, off) {
    const { pose, J } = this;
    const q = weaponQ, t = weaponT;
    quatNlerp(this.swordQ, 0, this.swordEase, 0, this.swordFight, 0, smoothstep(0.15, 0.85, Math.max(this.combat, this.action ? 1 : 0)));
    quatNlerp(this.shieldQ, 0, this.shieldEase, 0, this.shieldFight, 0, smoothstep(0.2, 0.8, this.shieldUp));
    quatMul(q, 0, pose.wq, J.handR * 4, this.swordQ, 0);
    quatRotate(t, 0, pose.wq, J.handR * 4, this.swordT, 0);
    t[0] += pose.wt[J.handR * 3]; t[1] += pose.wt[J.handR * 3 + 1]; t[2] += pose.wt[J.handR * 3 + 2];
    mat4FromQT(tmpM, q, 0, t, 0);
    const ss = this.opts.swordScale, si = this.opts.shieldScale;
    for (let i = 0; i < 12; i++) tmpM[i] *= ss;
    out.set(tmpM, off);
    // Blade segment for hit tests.
    const L = this.opts.bladeLen;
    this.bladeA = [t[0], t[1], t[2]];
    this.bladeB = [t[0] + tmpM[4] * L, t[1] + tmpM[5] * L, t[2] + tmpM[6] * L];
    // Strapped to the forearm, the board doesn't follow every flick of the wrist.
    quatMul(armQ, 0, pose.wq, J.foreL * 4, this.rig.restR, J.handL * 4);
    quatMul(q, 0, armQ, 0, this.shieldQ, 0);
    quatRotate(t, 0, pose.wq, J.handL * 4, this.shieldT, 0);
    t[0] += pose.wt[J.handL * 3]; t[1] += pose.wt[J.handL * 3 + 1]; t[2] += pose.wt[J.handL * 3 + 2];
    mat4FromQT(tmpM, q, 0, t, 0);
    // The arm stands off the back of the board: the grip in the file is on it.
    for (let i = 0; i < 3; i++) { t[i] -= tmpM[8 + i] * SHIELD_OFF; tmpM[12 + i] = t[i]; }
    this.shieldPos = [t[0], t[1], t[2]];
    this.shieldAxisX = [tmpM[0], tmpM[1], tmpM[2]];
    this.shieldAxisY = [tmpM[4], tmpM[5], tmpM[6]];
    this.shieldAxisZ = [tmpM[8], tmpM[9], tmpM[10]];
    for (let i = 0; i < 12; i++) tmpM[i] *= si;
    out.set(tmpM, off + 16);
  }

  // ---- plates -----------------------------------------------------------------------------------------

  // Bind-space transforms of every plate, from the palette. Plates with two joints blend as dual quaternions.
  plateTransforms(snap, cOff, tick) {
    if (this.invTick === tick) return;
    this.invTick = tick;
    const pal = cOff + C_PALETTE;
    this.rig.pieces.forEach((p, i) => {
      const iv = this.inv[i];
      let qx = 0, qy = 0, qz = 0, qw = 0, dx = 0, dy = 0, dz = 0, dw = 0;
      let sign0 = null;
      for (const [j, w] of p.joints) {
        const o = pal + j * 8;
        let s = w;
        if (sign0 === null) sign0 = o;
        else if (snap[o] * snap[sign0] + snap[o + 1] * snap[sign0 + 1] + snap[o + 2] * snap[sign0 + 2] + snap[o + 3] * snap[sign0 + 3] < 0) s = -w;
        qx += snap[o] * s; qy += snap[o + 1] * s; qz += snap[o + 2] * s; qw += snap[o + 3] * s;
        dx += snap[o + 4] * s; dy += snap[o + 5] * s; dz += snap[o + 6] * s; dw += snap[o + 7] * s;
      }
      const l = 1 / (Math.hypot(qx, qy, qz, qw) || 1);
      qx *= l; qy *= l; qz *= l; qw *= l; dx *= l; dy *= l; dz *= l; dw *= l;
      // Translation out of the dual part.
      iv.t[0] = 2 * (-dw * qx + dx * qw - dy * qz + dz * qy);
      iv.t[1] = 2 * (-dw * qy + dx * qz + dy * qw - dz * qx);
      iv.t[2] = 2 * (-dw * qz - dx * qy + dy * qx + dz * qw);
      iv.q[0] = qx; iv.q[1] = qy; iv.q[2] = qz; iv.q[3] = qw;
      iv.r[0] = -qx; iv.r[1] = -qy; iv.r[2] = -qz; iv.r[3] = qw;
    });
  }

  // Nearest plate along a world ray. Returns the bind-space point and normal.
  rayPlates(ox, oy, oz, dx, dy, dz, maxT, hit) {
    let best = -1, bestP = -1;
    this.bvh.forEach((bvh, i) => {
      if (!bvh) return; // mail sleeves sit under the plates
      const iv = this.inv[i];
      tv[0] = ox - iv.t[0]; tv[1] = oy - iv.t[1]; tv[2] = oz - iv.t[2];
      quatRotate(lo, 0, iv.r, 0, tv, 0);
      tv[0] = dx; tv[1] = dy; tv[2] = dz;
      quatRotate(ld, 0, iv.r, 0, tv, 0);
      const t = bvh.ray(lo[0], lo[1], lo[2], ld[0], ld[1], ld[2], best < 0 ? maxT : best, hn);
      if (t > 0 && (best < 0 || t < best)) {
        best = t; bestP = i;
        hit.lx = lo[0] + ld[0] * t; hit.ly = lo[1] + ld[1] * t; hit.lz = lo[2] + ld[2] * t;
        hit.nx = hn[0]; hit.ny = hn[1]; hit.nz = hn[2];
      }
    });
    hit.t = best; hit.piece = bestP;
    return best > 0;
  }

  bindToWorld(out, piece, x, y, z) {
    const iv = this.inv[piece];
    tv[0] = x; tv[1] = y; tv[2] = z;
    quatRotate(out, 0, iv.q, 0, tv, 0);
    out[0] += iv.t[0]; out[1] += iv.t[1]; out[2] += iv.t[2];
    return out;
  }

  // Bring a world direction into a plate's bind space.
  dirToBind(out, piece, x, y, z) {
    tv[0] = x; tv[1] = y; tv[2] = z;
    quatRotate(out, 0, this.inv[piece].r, 0, tv, 0);
    return out;
  }

  addGash(sim, piece, lx, ly, lz, nx, ny, nz, downX, downY, downZ) {
    if (this.gashes.length >= MAX_GASH) this.gashes.shift();
    const g = { piece, a: [lx, ly, lz], b: [lx, ly, lz], n: [nx, ny, nz], flow: [downX, downY, downZ], born: sim.time, punct: -1, width: 0.0074 + Math.random() * 0.0024 };
    this.gashes.push(g);
    this.gashVersion++;
    this.armor = Math.max(0, this.armor - 0.05);
    return g;
  }

  // Is there an open cut on this plate close enough for the blade to go through?
  nearestGash(piece, lx, ly, lz, radius, swing) {
    let best = null, bd = radius;
    for (const g of this.gashes) {
      if (g.piece !== piece || g.swing === swing) continue;
      const a = g.a, b = g.b;
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const L2 = dx * dx + dy * dy + dz * dz;
      const t = L2 > 1e-8 ? clamp(((lx - a[0]) * dx + (ly - a[1]) * dy + (lz - a[2]) * dz) / L2, 0, 1) : 0;
      const d = Math.hypot(a[0] + dx * t - lx, a[1] + dy * t - ly, a[2] + dz * t - lz);
      if (d < bd) { bd = d; best = g; best.tOn = t; }
    }
    return best;
  }

  puncture(sim, g, lx, ly, lz, nx, ny, nz) {
    // Through a wound that's already open: it bleeds harder.
    if (g.punct >= 0) {
      const old = this.bleeds.find((b) => b.gash === g);
      if (old) old.rate = Math.min(2.5, old.rate + 0.6);
      return;
    }
    // The point of the blow, snapped onto the old cut.
    const t = g.tOn ?? 0.5;
    const px = g.a[0] + (g.b[0] - g.a[0]) * t, py = g.a[1] + (g.b[1] - g.a[1]) * t, pz = g.a[2] + (g.b[2] - g.a[2]) * t;
    g.punct = sim.time;
    g.a2 = [px, py, pz];
    if (this.bleeds.length < MAX_BLEEDS) {
      this.bleeds.push({ gash: g, piece: g.piece, p: [px, py, pz], n: [g.n[0], g.n[1], g.n[2]], born: sim.time, rate: 1 });
    }
    this.gashVersion++;
    this.armor = Math.max(0, this.armor - 0.1);
  }

  writeGashes(snap, cOff, sim) {
    const u = sim.snapU;
    const start = cOff + C_GASH;
    const masks = cOff + C_MASKS;
    this.masks.fill(0);
    this.gashes.forEach((g, i) => {
      const o = start + i * GASH_FLOATS;
      snap[o] = g.a[0]; snap[o + 1] = g.a[1]; snap[o + 2] = g.a[2]; snap[o + 3] = g.width;
      snap[o + 4] = g.b[0]; snap[o + 5] = g.b[1]; snap[o + 6] = g.b[2]; snap[o + 7] = g.born;
      snap[o + 8] = g.n[0]; snap[o + 9] = g.n[1]; snap[o + 10] = g.n[2]; snap[o + 11] = g.punct;
      snap[o + 12] = g.flow[0]; snap[o + 13] = g.flow[1]; snap[o + 14] = g.flow[2];
      snap[o + 15] = g.a2 ? (g.a2[0] - g.a[0]) * (g.b[0] - g.a[0]) + (g.a2[1] - g.a[1]) * (g.b[1] - g.a[1]) + (g.a2[2] - g.a[2]) * (g.b[2] - g.a[2]) : 0;
      const bit = 1 << i;
      this.masks[g.piece] |= bit;
      // Plates riding the same joint share wounds that run across their edges.
      const jt = this.rig.pieces[g.piece].joints[0][0];
      this.rig.pieces.forEach((p, pi) => { if (p.joints[0][0] === jt && p.joints.length === this.rig.pieces[g.piece].joints.length) this.masks[pi] |= bit; });
    });
    for (let i = 0; i < 64; i++) u[masks + i] = this.masks[i];
  }

  // ---- brain ------------------------------------------------------------------------------------------

  setState(s) {
    this.state = s; this.stateT = 0;
    if (s === S.CIRCLE && this.tacticT <= 0 && this.simRef) this.chooseTactic(this.simRef);
  }

  goto(dt, sim, tx, tz, speed, face) {
    const slot = tx === sim.player.x && tz === sim.player.z ? 0 : 1 + this.id;
    sim.world.updateField(tx, tz, sim.time, slot);
    sim.world.flow(flowDir, this.x, this.z, tx, tz, slot);
    this.steer(dt, flowDir[0] * speed, flowDir[1] * speed, 7, face);
  }

  // Drive velocity toward a desired value, keep clear of walls, turn the hips into the motion.
  steer(dt, dvx, dvz, accel, face) {
    const k = 1 - Math.exp(-accel * dt);
    this.vx += (dvx - this.vx) * k;
    this.vz += (dvz - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
    if (face !== undefined) this.faceYaw = turn(this.faceYaw, face, 7 * dt);
    if (this.speed > 0.25) {
      const my = Math.atan2(this.vx, this.vz);
      // Walking backwards past 110 degrees off the chest, so a retreat doesn't spin around.
      const off = wrapAngle(my - this.faceYaw);
      this.backward = Math.abs(off) > 1.9;
      const heading = this.backward ? wrapAngle(my + Math.PI) : my;
      // The hips turn toward the motion, up to what the spine can bring back to the target.
      const rel = clamp(wrapAngle(heading - this.faceYaw), -1.15, 1.15);
      this.yaw = turn(this.yaw, wrapAngle(this.faceYaw + rel), 9 * dt);
    } else {
      this.backward = false;
      this.yaw = turn(this.yaw, this.faceYaw, 3.5 * dt);
    }
  }

  move(dt, sim) {
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    tmp3[0] = this.x; tmp3[2] = this.z;
    sim.world.resolve(tmp3, 0.42, this.y + 0.2);
    this.x = tmp3[0]; this.z = tmp3[2];
    this.y = sim.world.height(this.x, this.z);
  }

  observeSwing(name) {
    const h = this.habit;
    this.seenSwings[name] = (this.seenSwings[name] || 0) + 1;
    h.repeat = h.last === name ? h.repeat + 1 : 0;
    h.last = name; h.total++;
  }

  update(dt, sim) {
    this.simRef = sim;
    this.stateT += dt;
    this.hitT += dt;
    this.rollCd = Math.max(0, this.rollCd - dt);
    this.staggerRes = Math.max(0, this.staggerRes - dt);
    this.recentHits = Math.max(0, this.recentHits - dt * 0.25);
    this.poise = Math.min(100, this.poise + dt * 16);
    this.glint = Math.max(0, this.glint - dt * 2.6);
    this.heart += dt * (1.3 + (1 - this.hp / this.maxHp) * 1.1);
    this.stamDelay = Math.max(0, this.stamDelay - dt);
    if (this.stamDelay <= 0) this.stam = Math.min(100, this.stam + dt * (this.state === S.BLOCK ? 8 : 20));
    this.tacticT -= dt;
    const blood = this.bleeds.length;
    if (blood && !this.dead) {
      // A wound pours at first and clots down to a steady seep, and blood loss alone can't finish him.
      let flow = 0;
      for (const b of this.bleeds) { b.rate = Math.max(0.4, b.rate - dt * 0.035); flow += b.rate; }
      if (this.hp > this.maxHp * 0.12) this.hp -= dt * flow * 2.0;
    }
    this.hurt = damp(this.hurt, clamp((1 - this.hp / this.maxHp - 0.45) * 2 + blood * 0.05, 0, 1), 1.5, dt);
    if (this.hp <= 0 && !this.dead) this.die(sim);

    const p = sim.player;
    const dx = p.x - this.x, dz = p.z - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    this.dist = dist; this.toPlayer = toPlayer;

    if (this.dead) {
      this.vx = damp(this.vx, 0, 6, dt); this.vz = damp(this.vz, 0, 6, dt); this.speed = 0;
      this.deadT += dt;
      this.move(dt, sim);
      this.animate(dt, sim);
      return;
    }
    // Heads turn toward a nearby player, in peace or war.
    const want = dist < 14 && Math.abs(wrapAngle(toPlayer - this.faceYaw)) < 1.6 ? wrapAngle(toPlayer - this.faceYaw) : 0;
    this.lookYaw = damp(this.lookYaw, clamp(want, -1, 1), 5, dt);
    const eyeDrop = (p.y + 1.6) - (this.y + this.rig.height * 0.9);
    this.lookPitch = damp(this.lookPitch, dist < 14 ? clamp(Math.atan2(-eyeDrop, Math.max(dist, 0.5)), -0.5, 0.5) : 0, 5, dt);

    if (!this.action && this.state !== S.ROLL) this.rootMotion = 0;
    this.think(dt, sim, p, dist, toPlayer);
    // Root motion from attacks and rolls.
    this.applyAction(dt, sim, p);
    this.combat = damp(this.combat, this.combatTarget, 5, dt);
    this.shieldUp = damp(this.shieldUp, this.shieldTarget, 8, dt);
    this.move(dt, sim);
    this.animate(dt, sim);
  }

  applyAction(dt, sim, p) {
    if (!this.action) return;
    const clip = this.action;
    const f = this.actT / clip.dur;
    if (this.state === S.ROLL) {
      const v = f < 0.36 ? 2.5 : f < 0.66 ? 6.2 : f < 0.78 ? lerp(6.2, 0.4, (f - 0.66) / 0.12) : 0;
      this.vx = this.rollDirX * v; this.vz = this.rollDirZ * v;
      this.speed = 0;
      this.iframes = f > 0.33 && f < 0.68;
      this.faceYaw = this.yaw;
    } else if (this.attack && clip === this.bank.clips[this.attack.clip]) {
      const a = this.attack;
      // Slow through the wind-up, then the clip's own speed: nothing lands in under 0.45 s.
      this.actRate = f < a.active[0][0] ? this.windRate : a.rate;
      const [l0, l1, lv] = a.lunge;
      const v = f > l0 && f < l1 ? lv * Math.sin((f - l0) / (l1 - l0) * Math.PI) : 0;
      const close = this.dist < 1.05 ? 0 : 1;
      this.vx = Math.sin(this.yaw) * v * close; this.vz = Math.cos(this.yaw) * v * close;
      this.speed = 0;
      // Track the player through the wind-up only.
      if (f < a.active[0][0]) this.yaw = turn(this.yaw, this.toPlayer, (a === ATTACKS.dash ? 2.2 : 3.4) * dt);
      this.faceYaw = this.yaw;
      // Glint on the blade just before a blow, so it can be read.
      const nextOn = a.active.find((w) => f < w[0]);
      if (nextOn && (nextOn[0] - f) * clip.dur / Math.max(this.actRate, 0.05) < 0.3 && !this.glintDone) { this.glint = 1; this.glintDone = true; sim.event(EV.GLINT, this.bladeB[0], this.bladeB[1], this.bladeB[2], a.shield ? 1 : 0); }
      const inWindow = a.active.findIndex((w) => f >= w[0] && f <= w[1]);
      if (inWindow >= 0) {
        if (this.activeOn !== inWindow) { this.activeOn = inWindow; this.attackUsed = false; this.glintDone = false; sim.event(EV.WHOOSH, this.bladeB[0], this.bladeB[1], this.bladeB[2]); }
        if (!this.attackUsed) this.strike(sim, p, a);
      }
    } else if (this.knock > 0) {
      this.vx = this.knockX * this.knock; this.vz = this.knockZ * this.knock;
      this.speed = 0;
      this.knock = Math.max(0, this.knock - dt * 9);
    } else {
      this.vx = damp(this.vx, 0, 10, dt); this.vz = damp(this.vz, 0, 10, dt);
      this.speed = 0;
    }
  }

  strike(sim, p, a) {
    if (!this.bladeA || p.dead || sim.gameState !== 0) return;
    let d;
    if (a.shield) {
      const s = this.shieldPos;
      d = Math.hypot(s[0] - p.x, s[2] - p.z);
      if (d > 1.15) return;
    } else {
      // Distance from the blade to the player's body, a vertical capsule.
      const bot = [p.x, p.y + 0.3, p.z], top = [p.x, p.y + 1.6, p.z];
      const res = segSegDist(this.bladeA, this.bladeB, bot, top);
      if (res.dist > 0.42) return;
    }
    if (!sim.world.sees(this.x, this.y + 1.2, this.z, p.x, p.y + 1.2, p.z)) return;
    if (p.iframes) return;
    // This blow lands, unless the player's swing meets it at the moment it does.
    if (!a.shield && p.parryOpen() && Math.abs(wrapAngle(Math.atan2(this.x - p.x, this.z - p.z) - p.yaw)) < 0.85) {
      this.attackUsed = true;
      const mx = (this.bladeA[0] + this.bladeB[0]) / 2, my = (this.bladeA[1] + this.bladeB[1]) / 2, mz = (this.bladeA[2] + this.bladeB[2]) / 2;
      sim.event(EV.PARRY, mx, my, mz);
      sim.hitStop(0.1);
      p.onParry(sim);
      this.onParried(sim);
      return;
    }
    this.attackUsed = true;
    this.stats.landed++;
    if (p.damage(sim, a.dmg, this.x, this.z, a.knock || 0)) sim.event(EV.HURT, p.x, p.y + 1.2, p.z, a.dmg);
  }

  onParried(sim) {
    this.attack = null;
    this.activeOn = -1;
    // Long enough for the player to punish it.
    this.play('Hit_Chest', this.bank.clips.Hit_Chest.dur / 0.8, 'full', 0.08);
    this.setState(S.STAGGER);
    this.stats.parried = (this.stats.parried || 0) + 1;
    this.staggerRes = 3;
    this.stam = Math.max(0, this.stam - 18);
  }

  think(dt, sim, p, dist, toPlayer) {
    const hostile = this.hostile;
    switch (this.state) {
      case S.PATROL: this.thinkPatrol(dt, sim, p, dist, toPlayer); break;
      case S.IDLE: this.thinkPatrol(dt, sim, p, dist, toPlayer); break;
      case S.ALERT:
        this.combatTarget = 1; this.shieldTarget = 1;
        this.steer(dt, 0, 0, 8, toPlayer);
        this.yaw = turn(this.yaw, toPlayer, 3 * dt);
        if (this.stateT > 0.9) this.setState(S.APPROACH);
        break;
      case S.APPROACH: this.thinkApproach(dt, sim, p, dist, toPlayer); break;
      case S.CIRCLE: this.thinkCircle(dt, sim, p, dist, toPlayer); break;
      case S.ATTACK: this.thinkAttack(dt, sim, p, dist, toPlayer); break;
      case S.BLOCK: this.thinkBlock(dt, sim, p, dist, toPlayer); break;
      case S.ROLL:
        if (!this.action || this.actT >= this.action.dur) {
          this.iframes = false;
          this.stopAction(0.2);
          this.faceYaw = this.yaw;
          this.afterEvade(sim, p, dist);
        }
        break;
      case S.STAGGER:
        if (!this.action || this.actT >= this.action.dur) {
          this.stopAction(0.22);
          this.setState(hostile ? S.CIRCLE : S.PATROL);
          this.attackT = Math.min(this.attackT, 0.4 + Math.random() * 0.7);
          // Hurt and too close: gets out before the next one lands.
          if (hostile && dist < 3 && this.stam > 16 && this.rollCd <= 0 && Math.random() < 0.55 + this.hurt * 0.3) this.startRoll(sim, p, false);
        }
        break;
      case S.BREAK:
        this.shieldTarget = 0;
        if (!this.action || this.actT >= this.action.dur) { this.stopAction(0.25); this.stam = 45; this.setState(S.CIRCLE); }
        break;
      case S.RETREAT: this.thinkRetreat(dt, sim, p, dist, toPlayer); break;
      case S.TAUNT:
        this.steer(dt, 0, 0, 8, toPlayer);
        if (!this.action || this.actT >= this.action.dur) { this.stopAction(0.3); this.setState(S.CIRCLE); }
        else this.reactToSwing(dt, sim, p, dist);
        break;
      case S.FEINT:
        this.steer(dt, 0, 0, 8, toPlayer);
        if (this.actT / this.action?.dur > 0.17 || !this.action) {
          this.stopAction(0.16);
          this.setState(S.CIRCLE);
          this.attackT = 0.15 + Math.random() * 0.3;
        }
        break;
    }
  }

  thinkPatrol(dt, sim, p, dist, toPlayer) {
    this.combatTarget = 0; this.shieldTarget = 0;
    const route = this.opts.route;
    if (this.pauseT > 0) {
      this.pauseT -= dt;
      this.steer(dt, 0, 0, 6, this.faceYaw);
      if (!this.action && this.opts.pauseClip && this.pauseT > 1 && Math.random() < dt * 0.25) this.play(this.opts.pauseClip, 1, 'full', 0.4);
      if (this.action && this.actT >= this.action.dur - 0.2) this.stopAction(0.4);
    } else {
      if (this.action) this.stopAction(0.4);
      const [tx, tz] = route[this.routeI];
      const d = Math.hypot(tx - this.x, tz - this.z);
      if (d < 1.1) { this.routeI = (this.routeI + 1) % route.length; this.pauseT = 1 + Math.random() * 3.5; }
      else {
        if (!sim.world.sees(this.x, 1, this.z, tx, 1, tz)) this.goto(dt, sim, tx, tz, this.opts.walk, Math.atan2(tx - this.x, tz - this.z));
        else { const fx = (tx - this.x) / d, fz = (tz - this.z) / d; this.steer(dt, fx * this.opts.walk, fz * this.opts.walk, 4, Math.atan2(fx, fz)); }
      }
    }
    if (!this.hostile || p.dead) return;
    // Sight is a cone. A sprint close by is heard, and anything at arm's length is felt.
    const sees = sim.world.sees(this.x, this.y + 1.7, this.z, p.x, p.y + 1.6, p.z);
    const inCone = Math.abs(wrapAngle(toPlayer - this.faceYaw)) < 1.9;
    if ((sees && inCone && dist < 22) || (dist < 9 && p.sprinting) || dist < 5) {
      this.seen = true;
      if (this.action) this.stopAction(0.2);
      sim.event(EV.ALERT, this.x, this.y + 1.5, this.z);
      this.setState(S.ALERT);
      this.play('Yes', 1.2, 'upper', 0.25);
    }
  }

  thinkApproach(dt, sim, p, dist, toPlayer) {
    this.combatTarget = 1; this.shieldTarget = dist < 11 ? 1 : 0.4;
    if (this.action && this.actMask === 'upper' && this.actT >= this.action.dur - 0.1) this.stopAction(0.3);
    const lim = 1 - this.hurt * 0.35;
    const speed = (dist > 14 ? 5.4 : dist > 7 ? 3.5 : 1.9) * lim;
    this.goto(dt, sim, p.x, p.z, speed, undefined);
    this.faceYaw = dist < 8 ? turn(this.faceYaw, toPlayer, 7 * dt) : turn(this.faceYaw, this.yaw, 7 * dt);
    if (dist < 7.2 && sim.world.sees(this.x, 1.2, this.z, p.x, 1.2, p.z)) {
      // Close the last few metres behind the shield, or commit with a dash across open ground.
      if (dist > 3.6 && dist < 6.4 && this.stam > 40 && Math.random() < dt * 0.9 && !p.dead) this.startAttack(sim, ATTACKS.dash);
      else if (dist < 4.8) this.setState(S.CIRCLE);
    }
    this.reactToSwing(dt, sim, p, dist);
  }

  chooseTactic(sim) {
    // Bleeding from two places, he goes to ground for a moment, however the odds fall.
    if (this.bleeds.length >= 2 && sim.time - this.lastRetreat > 16) {
      this.tactic = TACTICS.indexOf('fall back');
      this.tacticT = 6; this.tacticStart = true;
      return;
    }
    const w = sim.tacticWeights;
    let sum = 0;
    for (let i = 0; i < w.length; i++) sum += w[i];
    // Reluctant to repeat itself: a knight with one idea is easy to read.
    sum -= w[this.tactic] * 0.7;
    let r = Math.random() * sum;
    for (let i = 0; i < w.length; i++) { r -= i === this.tactic ? w[i] * 0.3 : w[i]; if (r <= 0) { this.tactic = i; break; } }
    this.tacticT = 3 + Math.random() * 3.5;
    this.tacticStart = true;
  }

  thinkCircle(dt, sim, p, dist, toPlayer) {
    this.combatTarget = 1;
    if (this.tacticT <= 0) this.chooseTactic(sim);
    const lim = 1 - this.hurt * 0.3;
    const name = TACTICS[this.tactic];
    const ring = { press: 1.9, circle: 3.0, bait: 3.7, 'shield wall': 2.2, 'flank dash': 3.6, 'fall back': 6.5 }[name];
    // Each plan shows in how he holds himself: bait drops the shield and dares you.
    this.shieldTarget = name === 'bait' ? 0.12 : 1;
    if (this.tacticStart) {
      this.tacticStart = false;
      if (name === 'fall back' && (this.bleeds.length || this.hurt > 0.05)) { this.startRetreat(sim, p); return; }
      if (name === 'flank dash' && this.rollCd <= 0 && this.stam > 45 && dist < 5.5) { this.startRoll(sim, p, false, true); return; }
      if (name === 'bait' && dist > 2.8) { this.play('Idle_No_Loop', 1, 'upper', 0.3); this.setState(S.TAUNT); sim.event(EV.TAUNT, this.x, this.y + 1.6, this.z); return; }
    }
    this.strafeT -= dt;
    // Protect the wounded side: keep it turned away from the player.
    let woundBias = 0;
    if (this.bleeds.length) {
      const b = this.bleeds[this.bleeds.length - 1];
      woundBias = b.p[0] > 0 ? 0.35 : -0.35;
    }
    if (this.strafeT <= 0) {
      this.strafe = -this.strafe;
      this.strafeT = 1.2 + Math.random() * 2.6;
    }
    const tx = Math.sin(toPlayer), tz = Math.cos(toPlayer);
    const sx = tz * this.strafe, sz = -tx * this.strafe;
    if (sim.world.clearance(this.x, this.z, sx, sz, 1.5, 0.4) < 1.5) { this.strafe = -this.strafe; this.strafeT = 1.5; }
    const radial = clamp((dist - ring) * 1.2, -1.2, 1.4);
    const speed = (name === 'press' ? 1.9 : name === 'shield wall' ? 1.15 : 1.45) * lim;
    this.steer(dt, (sx + tx * radial) * speed, (sz + tz * radial) * speed, 6, wrapAngle(toPlayer + woundBias));
    if (dist > 8.5 && name !== 'fall back') { this.setState(S.APPROACH); return; }
    if (name === 'fall back' && (this.hurt > 0.05 || this.bleeds.length) && this.stateT > 0.4) { this.startRetreat(sim, p); return; }
    if (this.reactToSwing(dt, sim, p, dist)) return;
    // Cornered with the player on top of him: roll out past them.
    if (dist < 2.0 && this.rollCd <= 0 && sim.world.clearance(this.x, this.z, -tx, -tz, 2, 0.4) < 1.2 && Math.random() < dt * 1.6) { this.startRoll(sim, p, true); return; }
    if (this.action && this.actMask === 'upper' && this.actT >= this.action.dur) this.stopAction(0.15);
    if (name !== 'fall back') this.attackT -= dt * (name === 'press' ? 1.5 : name === 'shield wall' ? 0.45 : name === 'circle' || name === 'bait' ? 0.75 : 1);
    if (p.recovering && dist < 6) this.attackT -= dt * 7;
    if (this.attackT <= 0 && !p.dead && !this.action) {
      const pick = this.pickAttack(sim, p, dist, name);
      if (pick === 'feint') { this.startFeint(); return; }
      if (pick) { this.startAttack(sim, pick); return; }
    }
    this.tauntT -= dt;
    if (this.tauntT <= 0 && dist > 3.4) {
      this.tauntT = 8 + Math.random() * 8;
      this.play('Idle_No_Loop', 1, 'upper', 0.3);
      this.setState(S.TAUNT);
      sim.event(EV.TAUNT, this.x, this.y + 1.6, this.z);
    }
  }

  pickAttack(sim, p, dist, tactic) {
    // He keeps a reserve for the shield and the roll, unless he's dying anyway.
    const reserve = this.hurt > 0.8 ? 0 : 30;
    const out = [];
    for (const [k, a] of Object.entries(ATTACKS)) {
      if (dist < a.range[0] || dist > a.range[1] || this.stam - a.stam < reserve) continue;
      let w = 1;
      if (k === 'combo' || k === 'heavy') w = this.hurt > 0.5 ? 1.6 : 0.5;
      if (k === 'dash') w = tactic === 'flank dash' || tactic === 'bait' || p.recovering ? 4 : 1;
      if (k === 'bash') w = tactic === 'shield wall' ? 3 : 1;
      if (k === 'hook') w = p.recovering ? 0.4 : 1;
      if (this.lastAttack === k) w *= 0.3;
      out.push([k, w]);
    }
    if (!out.length) return null;
    // A feint now and then, more when the player is the kind who swings first.
    const eager = this.habit.total > 4 ? 0.28 : 0.12;
    if (!p.recovering && dist < 3.4 && Math.random() < eager) return 'feint';
    let sum = out.reduce((s, e) => s + e[1], 0), r = Math.random() * sum;
    for (const [k, w] of out) { r -= w; if (r <= 0) { this.lastAttack = k; return ATTACKS[k]; } }
    return ATTACKS[out[0][0]];
  }

  startFeint() {
    this.setState(S.FEINT);
    this.play('Sword_Attack', 1.1, 'full', 0.1);
  }

  startAttack(sim, a) {
    this.attack = a;
    this.attackUsed = false;
    this.activeOn = -1;
    this.glintDone = false;
    this.stam -= a.stam;
    this.stats.attacks++;
    const clipDur = this.bank.clips[a.clip].dur;
    this.windRate = Math.min(a.rate, a.active[0][0] * clipDur / 0.45);
    this.play(a.clip, this.windRate, 'full', 0.1);
    this.setState(S.ATTACK);
    this.yaw = this.faceYaw;
    this.shieldTarget = 0.3;
  }

  thinkAttack(dt, sim, p, dist) {
    if (!this.action) { this.setState(S.CIRCLE); return; }
    if (this.actT >= this.action.dur * (this.attack?.end || 1)) {
      if (this.attack?.rec && this.action.name === this.attack.clip) {
        const rec = this.attack.rec;
        this.attack = null;
        this.play(rec, 1.0, 'full', 0.05);
      } else {
        this.attack = null;
        this.stopAction(0.2);
        this.attackT = 0.7 + Math.random() * 1.2;
        this.setState(S.CIRCLE);
      }
      return;
    }
    // Late in a swing he can still bail out with a roll, if he has the legs.
    if (!this.attack && this.actT > 0.3) this.reactToSwing(dt, sim, p, dist);
  }

  // Reading the player's swing: wait a human moment, then shield, roll or step out.
  reactToSwing(dt, sim, p, dist) {
    const sw = p.threat;
    if (!sw) { this.reacted = false; this.reactT = -1; return false; }
    const aimed = dist < 3.9 && Math.abs(wrapAngle(Math.atan2(this.x - p.x, this.z - p.z) - p.yaw)) < 1.05;
    if (!aimed) return false;
    if (this.reacted) return false;
    if (this.reactT < 0) {
      // Recognises the moves you lean on: repeat one and he reads it sooner.
      const familiar = clamp((this.seenSwings[sw.name] || 0) / 6, 0, 1) + this.habit.repeat * 0.12;
      this.reactT = lerp(0.3, 0.1, clamp(familiar, 0, 1)) * (1 + this.hurt * 0.7);
      this.reactBase = sim.time;
    }
    if (sim.time - this.reactBase < this.reactT) return false;
    this.reacted = true;
    // Too late to do anything clever: take it.
    const left = (sw.hit - sw.t);
    if (left < 0.06) return false;
    const frontal = Math.abs(wrapAngle(this.toPlayer - this.faceYaw)) < 1.2;
    const heavy = sw.heavy;
    let block = frontal && this.stam > 18 && this.state !== S.BREAK ? 1.1 : 0;
    if (heavy) block *= 0.45;
    let roll = this.rollCd <= 0 && this.stam > 14 ? 0.62 + this.hurt * 0.9 + (heavy ? 0.7 : 0) + (this.gashes.length ? 0.2 : 0) : 0;
    let step = dist > 2.1 ? 0.5 : 0;
    const sum = block + roll + step;
    if (sum <= 0) return false;
    let r = Math.random() * sum;
    if ((r -= block) < 0) { this.startBlock(sim, left); return true; }
    if ((r -= roll) < 0) { this.startRoll(sim, p, false); return true; }
    // Step back out of reach.
    const bx = -Math.sin(this.toPlayer), bz = -Math.cos(this.toPlayer);
    this.vx = bx * 4.2; this.vz = bz * 4.2;
    return false;
  }

  startBlock(sim, hold) {
    this.setState(S.BLOCK);
    this.blockT = hold + 0.42;
    this.shieldTarget = 1;
    this.combatTarget = 1;
    if (this.action) this.stopAction(0.08);
    this.shieldUp = Math.max(this.shieldUp, 0.6);
  }

  thinkBlock(dt, sim, p, dist, toPlayer) {
    this.steer(dt, 0, 0, 10, toPlayer);
    this.yaw = turn(this.yaw, toPlayer, 2 * dt);
    this.stam = Math.min(100, this.stam + dt * 2);
    this.blockT -= dt;
    if (this.blockT <= 0) {
      this.stopAction(0.2);
      this.setState(S.CIRCLE);
      // Riposte: a blocked swing leaves the player open.
      if (p.recovering) this.attackT = Math.min(this.attackT, 0.12);
    }
  }

  startRoll(sim, p, past, flank) {
    if (this.rollCd > 0) return;
    // Sample eight ways out. Prefer clear ground, beyond reach, and on the player's flank.
    const px = p.x, pz = p.z;
    let bx = 0, bz = 0, best = -1e9;
    for (let i = 0; i < 8; i++) {
      const a = this.toPlayer + i / 8 * Math.PI * 2 + 0.2;
      const dx = Math.sin(a), dz = Math.cos(a);
      const clear = sim.world.clearance(this.x, this.z, dx, dz, 3.5, 0.45);
      if (clear < 2) continue;
      const ex = this.x + dx * clear, ez = this.z + dz * clear;
      const endD = Math.hypot(ex - px, ez - pz);
      const rel = wrapAngle(a - this.toPlayer);
      let score = clear;
      score += past ? (Math.abs(rel) < 1.4 ? 1.6 : -1) : (endD > 2.6 ? 1.4 : -1.5);
      score += Math.abs(Math.abs(rel) - 2.1) < 0.7 ? 0.9 : 0;
      if (flank) score += Math.abs(Math.abs(rel) - Math.PI / 2) < 0.5 ? 3 : -1;
      // Roll away from the side the blade comes from.
      if (p.threat) {
        const fromRight = p.threat.fromRight;
        if (fromRight !== 0) score += Math.sign(Math.sin(rel)) * fromRight * 0.9;
      }
      score += Math.random() * 0.6;
      if (score > best) { best = score; bx = dx; bz = dz; }
    }
    if (best < -1e8) return;
    this.rollDirX = bx; this.rollDirZ = bz;
    this.yaw = Math.atan2(bx, bz);
    this.faceYaw = this.yaw;
    this.stam -= 14;
    this.rollCd = 1.9;
    // Into the tuck through a quick crouch, skipping the clip's leap.
    this.play('Roll', 1.05, 'full', 0.15);
    this.actT = this.bank.clips.Roll.dur * 0.3;
    this.stats.rolls++;
    this.setState(S.ROLL);
    sim.event(EV.ROLL, this.x, this.y, this.z);
  }

  afterEvade(sim, p, dist) {
    this.setState(S.CIRCLE);
    this.vx = 0; this.vz = 0;
    this.faceYaw = this.toPlayer;
    // Came up behind a swing that's still finishing: make them pay.
    if ((p.recovering || TACTICS[this.tactic] === 'flank dash') && dist < 6.8 && this.stam > 20) this.attackT = 0.05;
    else this.attackT = Math.min(this.attackT, 0.9);
  }

  startRetreat(sim, p) {
    // Look for ground the player can't see, out of a sword's reach.
    let best = -1e9;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 9;
      const x = this.x + Math.sin(a) * r, z = this.z + Math.cos(a) * r;
      if (sim.world.inside(x, z, 0.8) || Math.abs(x) > 40 || Math.abs(z) > 40) continue;
      let s = sim.world.sees(p.x, 1.4, p.z, x, 1.4, z) ? 0 : 3;
      s += Math.min(Math.hypot(x - p.x, z - p.z), 12) * 0.2 - r * 0.08;
      if (s > best) { best = s; this.coverX = x; this.coverZ = z; }
    }
    this.stats.retreats = (this.stats.retreats || 0) + 1;
    this.lastRetreat = sim.time;
    this.setState(S.RETREAT);
  }

  thinkRetreat(dt, sim, p, dist, toPlayer) {
    this.shieldTarget = 1;
    const d = Math.hypot(this.coverX - this.x, this.coverZ - this.z);
    const speed = 3.6 * (1 - this.hurt * 0.3);
    if (d > 1 && this.stateT < 5) this.goto(dt, sim, this.coverX, this.coverZ, speed, undefined);
    else this.steer(dt, 0, 0, 8, toPlayer);
    this.faceYaw = dist < 5 ? turn(this.faceYaw, toPlayer, 7 * dt) : turn(this.faceYaw, this.yaw, 7 * dt);
    this.reactToSwing(dt, sim, p, dist);
    if (this.state !== S.RETREAT) return;
    // Waits to get his breath, then comes back around the corner fast.
    if (this.stateT > 5.5 || (dist < 2.3 && this.stateT > 1.6) || (d <= 1 && this.stam > 70 && this.stateT > 1.6)) {
      this.tactic = 0; this.tacticT = 4;
      if (dist > 3.2 && dist < 6.8 && this.stam > 25) this.startAttack(sim, ATTACKS.dash);
      else this.setState(S.APPROACH);
    }
  }

  // ---- taking blows ---------------------------------------------------------------------------------

  onBlocked(sim, heavy) {
    const cost = heavy ? 38 : 16;
    this.stam -= cost;
    this.stamDelay = 1.5;
    this.stats.blocks++;
    if (!this.action) this.play('Shield_OneShot', 1.2, 'upper', 0.05);
    if (this.stam <= 0) {
      this.stam = 0;
      this.play('Idle_Shield_Break', 1, 'full', 0.05);
      this.setState(S.BREAK);
      sim.event(EV.SHIELD_BREAK, this.x, this.y + 1.2, this.z);
    }
  }

  onHit(sim, kind, fromX, fromZ, poise = 30) {
    this.hitT = 0;
    this.recentHits += 1;
    const wasPatrol = this.state === S.PATROL || this.state === S.IDLE;
    if (!this.hostile) { this.hostile = true; }
    if (wasPatrol) { sim.event(EV.ALERT, this.x, this.y + 1.5, this.z); }
    this.seen = true;
    this.combatTarget = 1;
    if (this.state === S.ROLL) return;
    // Plate takes a cut without flinching much. Only a first thrust through it, or a run of blows, breaks his
    // footing, and not twice in five seconds.
    this.stats.hitsTaken++;
    this.poise -= poise;
    const committed = this.state === S.ATTACK && this.attack && (this.attack === ATTACKS.heavy || this.attack === ATTACKS.combo);
    const breaks = (kind === 'puncture' || this.poise <= 0) && !committed && this.staggerRes <= 0;
    if (breaks) {
      this.poise = 100;
      this.staggerRes = 5;
      const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1;
      this.attack = null; this.activeOn = -1;
      this.yaw = Math.atan2(-dx, -dz); this.faceYaw = this.yaw;
      if (kind === 'puncture') {
        this.knockX = dx / L; this.knockZ = dz / L; this.knock = 4.5;
        this.play('Hit_Knockback', 1.05, 'full', 0.06);
      } else {
        this.play(Math.random() < 0.5 ? 'Hit_Chest' : 'Hit_Head', 1.25, 'full', 0.06);
      }
      this.setState(S.STAGGER);
      sim.event(EV.GRUNT, this.x, this.y + 1.5, this.z, kind === 'puncture' ? 1 : 0.4);
    } else if (this.state === S.CIRCLE && !this.action) {
      // Rides the blow on the upper body and keeps moving.
      this.play('Hit_Chest', 1.5, 'upper', 0.05);
      this.attackT = Math.min(this.attackT, 0.5);
    }
  }

  die(sim) {
    this.dead = true;
    this.hp = 0;
    this.attack = null;
    this.iframes = false;
    this.play('Death01', 1, 'full', 0.15);
    sim.slowMo(1.3);
    this.setState(S.DEAD);
    this.combatTarget = 0;
    this.shieldTarget = 0;
    sim.event(EV.DEATH, this.x, this.y + 1, this.z);
  }

  write(snap, cOff, sim) {
    snap[cOff + C.ACTIVE] = 1;
    snap[cOff + C.KIND] = this.kind;
    snap[cOff + C.X] = this.x; snap[cOff + C.Y] = this.y; snap[cOff + C.Z] = this.z; snap[cOff + C.YAW] = this.yaw;
    snap[cOff + C.HP] = this.hp; snap[cOff + C.MAX_HP] = this.maxHp;
    snap[cOff + C.BLEED] = this.bleeds.length;
    snap[cOff + C.STATE] = this.state;
    snap[cOff + C.GASH_VERSION] = this.gashVersion;
    snap[cOff + C.GASH_COUNT] = this.gashes.length;
    snap[cOff + C.HOSTILE] = this.hostile ? 1 : 0;
    snap[cOff + C.STAM] = this.stam;
    snap[cOff + C.GLINT] = this.glint;
    snap[cOff + C.HEART] = this.heart;
    snap[cOff + C.ARMOR] = this.armor;
    snap[cOff + C.LANDED] = this.stats.landed;
    snap[cOff + C.SPEED] = this.speed;
    writePalette(this.pose, snap, cOff + C_PALETTE);
    this.writeProps(snap, cOff + C_PROPS);
    this.plateTransforms(snap, cOff, sim.tick);
    snap[cOff + C.N_BLEEDS] = this.bleeds.length;
    this.bleeds.forEach((b, i) => {
      const o = cOff + C_BLEEDS + i * 8;
      this.bindToWorld(tmp3, b.piece, b.p[0], b.p[1], b.p[2]);
      snap[o] = tmp3[0]; snap[o + 1] = tmp3[1]; snap[o + 2] = tmp3[2];
      tv[0] = b.n[0]; tv[1] = b.n[1]; tv[2] = b.n[2];
      quatRotate(tmp3, 0, this.inv[b.piece].q, 0, tv, 0);
      snap[o + 3] = tmp3[0]; snap[o + 4] = tmp3[1]; snap[o + 5] = tmp3[2];
      snap[o + 6] = b.rate; snap[o + 7] = b.born;
    });
    this.writeGashes(snap, cOff, sim);
  }
}

// Cross-module helpers.
const tv = new Float32Array(3), lo = new Float32Array(3), ld = new Float32Array(3), hn = new Float32Array(3), tmp3 = new Float32Array(3);
const SHIELD_OFF = 0.065;
const armQ = new Float32Array(4), weaponQ = new Float32Array(4), weaponT = new Float32Array(3), tmpM = new Float32Array(16), flowDir = new Float32Array(2);

function turn(a, b, step) {
  const d = wrapAngle(b - a);
  return wrapAngle(a + clamp(d, -step, step));
}

function norm(v) { const l = 1 / (Math.hypot(v[0], v[1], v[2]) || 1); return [v[0] * l, v[1] * l, v[2] * l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function orth(a, b) { const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; return [a[0] - b[0] * d, a[1] - b[1] * d, a[2] - b[2] * d]; }

function matToQuat(x, y, z) {
  const m = [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
  const t = m[0] + m[4] + m[8];
  let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [(m[5] - m[7]) / s, (m[6] - m[2]) / s, (m[1] - m[3]) / s, 0.25 * s]; }
  else if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; q = [0.25 * s, (m[3] + m[1]) / s, (m[6] + m[2]) / s, (m[5] - m[7]) / s]; }
  else if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; q = [(m[3] + m[1]) / s, 0.25 * s, (m[7] + m[5]) / s, (m[6] - m[2]) / s]; }
  else { const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; q = [(m[6] + m[2]) / s, (m[7] + m[5]) / s, 0.25 * s, (m[1] - m[3]) / s]; }
  return q;
}

function blend(out, a, b, t, n) {
  if (t <= 0.0005) { if (out !== a) out.set(a); return; }
  if (t >= 0.9995) { out.set(b.subarray(0, n * 4)); return; }
  for (let j = 0; j < n; j++) quatNlerp(out, j * 4, a, j * 4, b, j * 4, t);
}

function blendMask(out, a, b, t, mask, n) {
  for (let j = 0; j < n; j++) { const w = t * mask[j]; if (w > 0.0005) quatNlerp(out, j * 4, a, j * 4, b, j * 4, w); }
}

function lerp3(out, a, b, t) { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; }

export { ATTACKS, segSegDist };
