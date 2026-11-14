// A knight on the UAL skeleton: layered animation, plate hits and wounds, and the brain.
import { C, C_BLEEDS, C_GASH, C_MASKS, C_PALETTE, C_PROPS, EV, GASH_FLOATS, MAX_BLEEDS, MAX_GASH, PROPS_PER_CHAR, TACTICS } from '../core/layout.js';
import { carryFrame, carryMat4, carryPalette, carryPoint } from '../core/carry.js';
import { clamp, damp, lerp, mat4FromQT, quatAxisAngle, quatMul, quatNlerp, quatRotate, smoothstep, wrapAngle } from '../core/math.js';
import { inTown } from '../core/town.js';
import { stepStow } from '../core/stow.js';
import { Pose, solveFK, writePalette } from './anim.js';
import { PlateBVH } from './world.js';

export const S = { PATROL: 0, ALERT: 1, APPROACH: 2, CIRCLE: 3, ATTACK: 4, BLOCK: 5, ROLL: 6, STAGGER: 7, RETREAT: 8, BREAK: 9, DEAD: 10, TAUNT: 11, FEINT: 12, IDLE: 13 };

// Blows the knight knows. active is where in the clip the blade can land, as fractions, measured from the hand's
// speed in each clip (see tools/armor/measure_blows.py). end cuts a combo's long recovery short.
const ATTACKS = {
  a: { clip: 'Sword_Regular_A', rec: 'Sword_Regular_A_Rec', rate: 0.62, active: [[0.4, 0.66]], reach: 2.7, dmg: 13, lunge: [0.2, 0.62, 3.4], stam: 6, range: [0, 2.5], hold: true },
  b: { clip: 'Sword_Regular_B', rec: 'Sword_Regular_B_Rec', rate: 0.6, active: [[0.34, 0.6]], reach: 2.6, dmg: 13, lunge: [0.1, 0.56, 2.8], stam: 6, range: [0, 2.4], hold: true },
  c: { clip: 'Sword_Regular_C', rate: 0.86, active: [[0.27, 0.37]], reach: 2.8, dmg: 20, lunge: [0.08, 0.33, 4.2], stam: 10, range: [1.0, 2.8], end: 0.62, tele: true, hold: true },
  over: { clip: 'Sword_Attack', rate: 0.92, active: [[0.19, 0.29]], reach: 2.7, dmg: 21, lunge: [0.08, 0.26, 2.6], stam: 10, range: [0, 2.5], end: 0.7, tele: true, hold: true },
  dash: { clip: 'Sword_Dash', rate: 0.95, active: [[0.15, 0.27]], reach: 2.9, dmg: 18, lunge: [0.03, 0.24, 7.6], stam: 14, range: [3.0, 4.6], end: 0.7, hold: true },
  bash: { clip: 'Shield_Dash', rate: 0.95, active: [[0.22, 0.5]], reach: 1.5, dmg: 8, lunge: [0.1, 0.52, 7.2], stam: 12, range: [1.6, 4.2], knock: 7.5, shield: true },
  hook: { clip: 'Melee_Hook', rec: 'Melee_Hook_Rec', rate: 0.72, active: [[0.36, 0.62]], reach: 1.5, dmg: 7, lunge: [0.2, 0.6, 1.8], stam: 5, range: [0, 1.6], knock: 3.5, shield: true },
  combo: { clip: 'Sword_Regular_Combo', rate: 0.82, active: [[0.055, 0.105], [0.21, 0.27], [0.49, 0.535]], reach: 2.7, dmg: 12, lunge: [0.03, 0.52, 2.0], stam: 16, range: [0, 2.4], end: 0.68, hold: true },
  heavy: { clip: 'Sword_Heavy_Combo', rate: 0.9, active: [[0.07, 0.13], [0.25, 0.29], [0.4, 0.44], [0.57, 0.605]], reach: 2.9, dmg: 17, lunge: [0.05, 0.6, 2.2], stam: 22, range: [0, 2.6], end: 0.74, hold: true },
  // Lisandra's, retargeted (tools/armor/lisandra_clips.py). Windows from where the striking limb passes in front of him.
  // hold: her left hand is empty in these, so his shield arm keeps its guard instead of flinging the board overhead.
  // turn: how far the body turns (radians, about up) by the blow, so it lands down his facing; measured on the clip.
  // tele: a heavy wind-up played slow enough to read, then the blow fast.
  slash: { clip: 'L_Slash', rate: 1.05, active: [[0.58, 0.72]], reach: 2.8, dmg: 16, lunge: [0.3, 0.62, 3.0], stam: 9, range: [0.6, 2.4], end: 0.76, link: 0.7, hold: true, turn: -0.4 },
  chop: { clip: 'L_Chop', rate: 1.0, active: [[0.5, 0.66]], reach: 2.7, dmg: 19, lunge: [0.3, 0.56, 2.4], stam: 10, range: [0, 2.3], end: 0.78, link: 0.68, hold: true, turn: -0.4 },
  kick: { clip: 'L_SnapKick', rate: 1.1, active: [[0.55, 0.66]], reach: 1.6, dmg: 7, lunge: [0.42, 0.7, 2.6], stam: 9, range: [0, 1.7], knock: 7, limb: 'ball_r', breaker: true, end: 0.9, link: 0.8, hold: true, turn: -1.2, tele: true },
  // The leap only: he lands and the chop comes straight off it.
  pounce: { clip: 'L_Pounce', rate: 1.0, active: [[0.6, 0.72]], reach: 2.8, dmg: 22, lunge: [0.16, 0.6, 8.4], stam: 18, range: [3.0, 4.6], end: 0.74, link: 0.66, hold: true, turn: -0.15, tele: true, then: ['chop', 'over'] },
  jab: { clip: 'L_ShieldJab', rate: 1.15, active: [[0.4, 0.66]], reach: 1.5, dmg: 6, lunge: [0.3, 0.56, 2.6], stam: 6, range: [0, 1.6], knock: 4, shield: true, breaker: true, end: 0.85, link: 0.7 },
  cross: { clip: 'L_ShieldCross', rate: 1.35, active: [[0.18, 0.42], [0.6, 0.82]], reach: 1.5, dmg: 6, lunge: [0.1, 0.75, 1.8], stam: 10, range: [0, 1.6], knock: 4.5, shield: true, breaker: true, end: 0.9, link: 0.86 },
};
// tip: how far ahead of his hips the blade, boot or board gets inside the blow's windows, on the 2.12 m black knight
// (scaled to each knight's height). Measured with the shield hold and the turn on. He closes to where it lands.
const TIP = { a: 1.71, b: 1.59, c: 1.79, over: 1.87, dash: 1.44, bash: 0.68, hook: 0.53, combo: 1.79, heavy: 1.79, slash: 1.36, chop: 0.92, kick: 1.12, pounce: 0.98, jab: 0.87, cross: 0.65 };
for (const [k, a] of Object.entries(ATTACKS)) { a.key = k; a.tip = TIP[k]; }
// What a blow's hit test allows past the tip: the blade's 0.42 m, the boot's 0.5, the board's 1.15 (less a margin).
const PAD = (a) => (a.limb ? 0.35 : a.shield ? 0.9 : 0.3);
// How close a knight comes, hips to hips: two knights stay a body apart; you keep your own space in first person.
const GAP_KNIGHT = 1.3, GAP_PLAYER = 1.5;
// How much harder a town guard's blow falls on a beast or one of the dead than on plate (Knight.hitBeast).
const GUARD_BITE = 2.2;
// Clips the shield arm keeps its guard through, besides the blows marked hold.
const HOLD_CLIPS = new Set(['Roll', 'L_HitHead', 'L_HitBody', 'L_HitGut', 'Hit_Head', 'Hit_Chest']);
// What can follow what, once a blow is past its link point. Read in chainNext by how the last one went.
const NEXT = {
  a: ['b', 'slash', 'kick', 'jab'], b: ['a', 'chop', 'c', 'kick'], c: ['jab', 'kick'], over: ['jab', 'kick', 'slash'],
  dash: ['jab', 'slash', 'kick'], bash: ['chop', 'over', 'slash'], hook: ['chop', 'over', 'c'],
  slash: ['kick', 'chop', 'jab', 'b'], chop: ['jab', 'slash', 'a', 'kick'],
  kick: ['over', 'chop', 'slash', 'c'], pounce: ['chop'],
  jab: ['chop', 'a', 'slash', 'over'], cross: ['over', 'chop', 'kick'],
};
const FAST = new Set(['a', 'b', 'slash', 'chop', 'jab', 'kick']);
const HEAVY = new Set(['c', 'over', 'heavy', 'pounce']);
// Who each knight is. Velscour's is a brute who stalks, kicks and hacks, and taunts a man he's put down. Tessariel's is a
// duellist: shield first, quick blades, and a counter for every blow he stops.
const STYLES = {
  black: { aggro: 1.3, combo: [1, 3], likes: { over: 1.6, c: 1.4, kick: 1.8, pounce: 1.6, slash: 1.4, chop: 1.5, heavy: 0.6, hook: 0.5 }, taunt: 'L_Angry', alert: 'L_Point', gait: { walk: 'L_Stalk', jog: 'L_Run' }, riposte: 0.45, blockSpells: 0.55 },
  silver: { aggro: 0.95, combo: [0, 2], likes: { a: 1.4, b: 1.4, jab: 1.8, cross: 1.2, slash: 1.2, bash: 1.4, kick: 0.6, pounce: 0.5 }, taunt: 'Idle_No_Loop', alert: 'Yes', gait: {}, riposte: 0.9, blockSpells: 0.85 },
};
const HIT_HIGH = ['L_HitHead', 'Hit_Head'], HIT_LOW = ['L_HitGut', 'L_HitBody', 'Hit_Chest'];

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
    // The shield arm, for holding its guard through a blow from a clip whose left hand is empty.
    this.leftArm = new Float32Array(n);
    names.forEach((name, j) => { if (/^(clavicle|upperarm|lowerarm|hand)(_twist_?\d+)?_l$/.test(name)) this.leftArm[j] = 1; });
    this.rH = new Float32Array(n * 4);
    this.J = { spine1: rig.index.get('spine_01'), spine2: rig.index.get('spine_02'), spine3: rig.index.get('spine_03'), neck: rig.index.get('neck_01'), head: rig.index.get('Head'),
      handR: rig.index.get('hand_r'), handL: rig.index.get('hand_l'), foreL: rig.index.get('lowerarm_l'), pelvis: rig.index.get('pelvis'), ball_r: rig.index.get('ball_r') };
    this.style = STYLES[opts.style] || STYLES.silver;
    // Where each blow lands from on this body, and the furthest it can be started from: the lunge's ground on top.
    this.reach = {};
    const scale = rig.height / 2.12;
    for (const [k, a] of Object.entries(ATTACKS)) {
      const stop = a.tip * scale + PAD(a);
      const lunge = a.lunge[2] * (a.lunge[1] - a.lunge[0]) * (bank.clips[a.clip]?.dur ?? 1) / a.rate * (2 / Math.PI);
      // (The gap closers, dash and pounce, keep their own window: covering ground is what they are for.)
      this.reach[k] = { stop, max: a.range[0] >= 3 ? a.range[1] : Math.min(a.range[1], stop + lunge * 0.75) };
    }
    // A gait of the knight's own in a fight: its clip and the ground one cycle covers, at this model's size.
    this.gaits = {};
    for (const [slot, name] of Object.entries(this.style.gait)) {
      const c = bank.clips[name];
      if (c?.travel) this.gaits[slot] = { clip: c, speed: c.travel[c.travel.length - 1] / c.dur * rig.motionScale };
    }
    // (One set of trees for a suit, shared by everyone in it: they're over the suit as it was made, and nothing changes them.)
    this.bvh = rig.plateTrees ||= rig.pieces.map((p) => (p.kind === 'mail' ? null : new PlateBVH(rig.bindPos, rig.tris, p.tstart, p.tcount)));
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
      // At ease the blade hangs point-down along the leg.
      this.swordEase = new Float32Array(frame(mix3(k, 0.5, f, 0.87), f));
      this.swordT.set(off(f, L * 0.66, p, L * 0.3));
    }
    // How a shield is carried, after the period sources: the board rides on the outside of the forearm, close to the
    // body. At ease the arm hangs, palm to the thigh, and the board hangs against his left side, face out, its top a
    // hand below the shoulder and its point by the shin. On guard the forearm crosses the chest and the board stands
    // upright before it, face to the foe, top at the chin, over his left side and centre. Each hold is found on this
    // body in its own pose, then rides the forearm as if strapped to it.
    const axis = (j) => norm([...rig.restT.subarray(j * 3, j * 3 + 3)]);
    const ua = rig.index.get('upperarm_l'), fl = rig.index.get('lowerarm_l'), hl = rig.index.get('hand_l');
    this.carryJ = [[ua, axis(fl), CARRY_UPPER], [fl, axis(hl), CARRY_FORE]];
    this.foreAxis = axis(hl);
    this.shieldEase = new Float32Array(4); this.shieldFight = new Float32Array(4);
    this.shieldTEase = new Float32Array(3); this.shieldTFight = new Float32Array(3);
    this.aimQ = new Float32Array(4); this.aimD = new Float32Array(3);
    this.foreHang = [0, 0, 0]; this.foreGuard = [0, 0, 0];
    this.fistOff = new Float32Array(grip.l.fingers.map((v) => v * lenOf('l') * 0.62));
    {
      const pose = new Pose(rig), u = rig.height / 1.92, L = lenOf('l');
      const place = (clip, carry, face, up, aside, qOut, tOut, aim) => {
        pose.rot.set(rig.restR); pose.pelvis.set(bank.pelvisRest);
        bank.sample(clip, 0, pose.rot, pose.pelvis);
        if (carry) this.carryArm(pose.rot, 1);
        solveFK(pose, 0, 0, 0, 0, null, null);
        const q = [0, 0, 0, 1], inv = [0, 0, 0, 1], fist = [0, 0, 0], d = [0, 0, 0];
        quatMul(q, 0, pose.wq, fl * 4, rig.restR, hl * 4);
        inv[0] = -q[0]; inv[1] = -q[1]; inv[2] = -q[2]; inv[3] = q[3];
        quatRotate(fist, 0, q, 0, grip.l.fingers.map((v) => v * L * 0.62), 0);
        // The board: +Y up, +Z its back toward him (the painted face is -Z). Facing (yaw 0) is +Z, his left +X.
        const B = frame(up, [-face[0], -face[1], -face[2]]);
        const back = [0, 0, 0]; quatRotate(back, 0, B, 0, [0, 0, 1], 0);
        // The grip sits in the fist; the board stands off the knuckles by the handle's depth.
        for (let i = 0; i < 3; i++) d[i] = fist[i] - back[i] * 0.09 * u + (i === 0 ? aside * u : 0);
        quatMul(qOut, 0, inv, 0, B, 0);
        quatRotate(tOut, 0, inv, 0, d, 0);
        // Where the forearm points in this pose, seen from the chest.
        this.chestView(pose, aim ? this.foreGuard : this.foreHang);
        if (aim) {
          // The same guard, kept by the chest instead of the forearm, for blows that drive the board at the foe.
          const s = pose.wq.subarray(this.J.spine3 * 4, this.J.spine3 * 4 + 4), sInv = [-s[0], -s[1], -s[2], s[3]];
          quatMul(this.aimQ, 0, sInv, 0, B, 0);
          quatRotate(this.aimD, 0, sInv, 0, [d[0] - fist[0], d[1] - fist[1], d[2] - fist[2]], 0);
        }
      };
      place(bank.clips.Idle_Loop, true, [1, 0, 0.3], [0, 1, 0.1], 0, this.shieldEase, this.shieldTEase);
      place(bank.clips.Idle_Shield_Loop, false, [-0.12, -0.05, 1], [-0.1, 1, 0.05], 0.12, this.shieldFight, this.shieldTFight, true);
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
    this.propMatrices = new Float32Array(32);
    // Where his arms are kept out of a fight (src/core/stow.js): the sword at his left hip, point down and back, and the
    // board on his back. Found once on this body stood at rest, and kept by the hips and the chest. (A hero's: src/sim/hero.js.)
    if (bank.clips.Idle_Loop) {
      const hold = restHold(rig, bank), u = rig.height / 1.8, pj = this.J.pelvis, sj = this.J.spine3;
      this.stowMain = hold(pj, [0.12, -0.86, -0.5], [1, 0.1, 0], [0.21 * u, hold.y(pj) + 0.04 * u, 0.03 * u]);
      this.stowOff = hold(sj, [0.12, 1, 0.05], [0, 0.1, 1], [0.04 * u, hold.y(sj) - 0.16 * u, -0.24 * u]);
    }
    this.clearanceJoints = ['pelvis', 'spine_03', 'Head', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'].map(n => rig.index.get(n));
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw ?? 0, vx: 0, vz: 0, speed: 0,
      hostile: !!opts.hostile, hp: opts.hp, maxHp: opts.hp, stam: 60, state: S.PATROL, stateT: 0,
      faceYaw: opts.yaw ?? 0, phase: Math.random(), combat: 0, combatTarget: 0, shieldUp: 0, shieldTarget: 0, fromW: 0, calmT: 1e3, stow: 1,
      action: null, actT: 0, actRate: 1, actW: 0, actMask: 'full', actEnd: 0, gashVersion: this.gashVersion ? this.gashVersion + 1 : 1,
      gashes: [], masks: new Uint32Array(64), bleeds: [], heart: 0, routeI: 0, pauseT: Math.random() * 2, stepSide: 0,
      attack: null, attackUsed: false, attackT: 1.6, strafe: Math.random() < 0.5 ? -1 : 1, strafeT: 2, reactT: -1, reacted: false,
      seen: false, lastSeenT: 0, lastX: 0, lastZ: 0, recovering: false, rollCd: 0, blockT: 0, armor: 1, dead: false, deadT: 0, lookYaw: 0, lookPitch: 0, glint: 0,
      tactic: 1, tacticT: 0, tacticWeights: new Float32Array(TACTICS.length).fill(1 / TACTICS.length), hurt: 0, rootX: 0, rootZ: 0, staggerRes: 0, recentHits: 0,
      spellSeen: null, spellReactAt: 0, target: null, hitT: 10, swingBlade: null, coverX: 0, coverZ: 0, iframes: false, knock: 0, knockX: 0, knockZ: 0, lastAttack: '', tauntT: 6,
      seenSwings: { great_cut1: 0, great_cut2: 0, great_slam: 0, great_chop: 0, great_rise: 0, great_wide_r: 0, great_wide_l: 0 },
      habit: { total: 0, last: '', repeat: 0 }, moveYaw: opts.yaw ?? 0, backward: false, rollDirX: 0, rollDirZ: 0, wasOnAttack: false, activeOn: -1,
      armorHits: 0, prevClipT: 0, stamDelay: 0, lastRetreat: -99, poise: 100, groundLift: 0, windRate: 1, stats: { attacks: 0, landed: 0, blocks: 0, rolls: 0, hitsTaken: 0, chained: 0, breaks: 0, ripostes: 0, spellBlocks: 0, dives: 0, falls: 0 },
      comboLeft: 0, outcome: '', recent: [], blockedRun: 0, chainTried: false, boltT: 0, riposte: false, travelDir: null, travelPrev: 0, down: false, gaitW: 0, gaitClip: null, leashed: false, holdW: 0, bodyTurn: 0, chainLen: 0, gloat: false, lastFall: -99, hangW: 1, carryW: 1, aimW: 0,
      duty: null, foeR: 0,
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
    if (this.shieldUp > 0.5) this.holdW = 1;
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
    const hero = !!this.opts.hero;
    // (A hero turning on the spot steps round on its feet rather than pivoting on still legs: see Hero.update's turnRate.)
    const sp = hero ? Math.max(this.speed, this.turnStep || 0) : this.speed;
    const wounded = this.hurt;
    const inFight = this.combat;
    // Locomotion. The stride speeds below stop the feet skating at any pace.
    const WALK = 1.45 * rig.motionScale, JOG = 3.1 * rig.motionScale, RUN = 5.6 * rig.motionScale;
    const stride = sp < WALK ? WALK : sp < JOG ? lerp(WALK, JOG, (sp - WALK) / (JOG - WALK)) : lerp(JOG, RUN, clamp((sp - JOG) / (RUN - JOG), 0, 1));
    const cycle = lerp(clips.Walk_Loop.dur, clips.Jog_Fwd_Loop.dur, smoothstep(WALK, JOG, sp));
    // Heroes walk until they mean to run: the jog comes in only past a brisk walk (about 2.1 m/s for a man's height), and
    // the walk's own stride is played faster up to there, so the feet never skate.
    const heroJog = hero ? smoothstep(1.9 * rig.motionScale, 2.35 * rig.motionScale, sp) : 0;
    const heroRun = hero ? smoothstep(JOG * 1.05, RUN * 0.85, sp) : 0;
    const before = this.phase;
    // A knight's own fighting gait (Velscour's stalk and run) when he's going where he faces.
    const along = sp > 0.25 ? Math.cos(wrapAngle(Math.atan2(this.vx, this.vz) - this.yaw)) : 0;
    const wantGait = inFight > 0.5 && this.hostile && !this.backward && along > 0.82 && !this.action ? 1 : 0;
    const gait = sp > (this.gaits.jog ? (this.gaits.walk ? WALK * 1.5 : 0) : Infinity) ? this.gaits.jog : this.gaits.walk;
    if (gait !== this.gaitClip) { this.gaitClip = gait; this.gaitW = Math.min(this.gaitW, 0.3); }
    this.gaitW = gait ? damp(this.gaitW, wantGait, 5, dt) : 0;
    if (hero && sp > 0.02) {
      // Metres per cycle: a walk's, a jog's, a run's (the run is played on the jog's cycle, as below).
      const per = lerp(lerp(WALK * clips.Walk_Loop.dur, JOG * clips.Jog_Fwd_Loop.dur, heroJog), RUN * clips.Jog_Fwd_Loop.dur, heroRun);
      this.phase += (this.backward ? -1 : 1) * dt * Math.max(sp, 0.08) / per;
    } else if (sp > 0.05) {
      const dir = this.backward ? -1 : 1;
      const own = gait ? Math.max(sp, 0.3) / (gait.speed * gait.clip.dur) : 0;
      this.phase += dir * dt * lerp((Math.max(sp, 0.3) / stride) / cycle, own, this.gaitW);
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
    // (A hero's legs are walking from the first step: a slow walk is a slow walk, never a slide on standing legs.)
    const moveW = hero ? smoothstep(0.02, 0.16, sp) : smoothstep(0.06, 0.7, sp);
    // (How far a hero is running, past a brisk walk: their empty hands are fists for it, src/sim/hero.js afterPose.)
    if (hero) this.runK = heroJog * moveW;
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
      const jogW = hero ? heroJog : smoothstep(WALK * 1.05, JOG * 0.8, sp);
      if (jogW > 0.001) {
        bank.sample(clips.Jog_Fwd_Loop, ph * clips.Jog_Fwd_Loop.dur, rB, pB);
        blend(rA, rA, rB, jogW, rig.count);
        lerp3(pA, pA, pB, jogW);
        const runW = hero ? heroRun : smoothstep(JOG * 1.05, RUN * 0.85, sp);
        if (runW > 0.001) {
          bank.sample(clips.Sprint_Loop, ph * clips.Sprint_Loop.dur, rB, pB);
          blend(rA, rA, rB, runW, rig.count);
          lerp3(pA, pA, pB, runW);
        }
      }
      if (this.gaitW > 0.001) {
        bank.sample(gait.clip, ph * gait.clip.dur, rB, pB);
        blend(rA, rA, rB, this.gaitW, rig.count);
        lerp3(pA, pA, pB, this.gaitW);
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
    // On a board (a hero riding a shield, src/sim/hero.js): crouched on it, under whatever the arms are doing.
    if (this.rideW > 0.001 && clips.Crouch_Idle_Loop) {
      bank.sample(clips.Crouch_Idle_Loop, sim.time, rA, pA);
      blend(rot, rot, rA, this.rideW, rig.count);
      lerp3(pel, pel, pA, this.rideW);
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
    // The shield arm keeps its guard, whole joints from the guard idle, through a blow whose clip has no shield in it.
    const atk = this.attack || this.reviewAttack, mine = atk && this.action === clips[atk.clip];
    const holdOn = (mine && atk.hold) || (this.action && !this.down && HOLD_CLIPS.has(this.action.name)) ? 1 : 0;
    this.holdW = holdOn ? Math.min(1, this.holdW + dt / 0.1) : Math.max(0, this.holdW - dt / 0.15);
    if (this.holdW > 0.001) {
      bank.sample(clips.Idle_Shield_Loop, sim.time, this.rH, null);
      blendMask(rot, rot, this.rH, this.holdW, this.leftArm, rig.count);
    }
    // And the body turns into the blow so it lands down his facing, eased in through the wind-up.
    const turnTo = mine && atk.turn ? atk.turn * smoothstep(0, atk.active[0][0] * 0.9, this.actT / this.action.dur) : 0;
    this.bodyTurn = damp(this.bodyTurn, turnTo, 14, dt);
    // A shield blow, or a spell met on the board, drives it square at the foe instead of letting it roll with the fist.
    const aimOn = this.action && !this.dead && (this.action.name === 'Shield_OneShot' || (mine && atk.shield)) ? 1 : 0;
    this.aimW = damp(this.aimW, aimOn, 14, dt);
    // A hanging shield arm carries the board at his side: turned palm to thigh (how far it hangs is last frame's).
    // (Before the fade, whose pose from a moment ago is already turned.)
    this.carryW = this.dead ? 0 : this.hangW;
    if (this.carryW > 0.001) this.carryArm(rot, this.carryW);
    // Ease out of whatever was showing a moment ago.
    if (this.fromW > 0.001) {
      this.fromW = Math.max(0, this.fromW - dt / this.fadeTime);
      const w = this.fromW * this.fromW * (3 - 2 * this.fromW);
      blend(rot, rot, this.rFrom, w, rig.count);
      lerp3(pel, pel, this.pFrom, w);
    }
    // The board and its handle share the forearm frame, so the wrist stays seated in the grip.
    {
      const hl = J0.handL;
      quatNlerp(rot, hl * 4, rot, hl * 4, rig.restR, hl * 4, 1);
    }
    // Hands stay shut on sword and shield.
    // (A hero's fingers are bound to their own joints and kept as modelled, dead or not: the clips' fingers aren't theirs.)
    if (!this.dead || this.opts.hero) for (const j of this.fingerJoints) { rot[j * 4] = this.fist[j * 4]; rot[j * 4 + 1] = this.fist[j * 4 + 1]; rot[j * 4 + 2] = this.fist[j * 4 + 2]; rot[j * 4 + 3] = this.fist[j * 4 + 3]; }
    // Keep the chest on the target and the eyes on the player, without wringing a rigid cuirass over the waist.
    this.twist.fill(0);
    // (Eased: a whole-body clip that ends with the chest wanted well round would wring it there in a tick.)
    // (And not at all for something right behind him: there the chest would be thrown from one side to the other as he comes round.)
    const want = wrapAngle(this.faceYaw - this.yaw);
    const offTo = this.action && this.actMask === 'full' ? 0 : clamp(want, -0.62, 0.62) * (1 - smoothstep(2.0, 2.9, Math.abs(want)));
    const off = this.chestOff = damp(this.chestOff ?? offTo, offTo, 14, dt);
    const { J } = this;
    this.twist[J.pelvis] = this.bodyTurn;
    this.twist[J.spine1] = off * 0.28; this.twist[J.spine2] = off * 0.36; this.twist[J.spine3] = off * 0.36;
    this.twist[J.neck] = this.lookYaw * 0.45; this.twist[J.head] = this.lookYaw * 0.55;
    this.nod.fill(0);
    this.nod[J.head] = this.lookPitch;
    solveFK(pose, this.x, this.y, this.z, this.yaw, this.twist, this.nod);
    // (What a body does that no clip has in it: a hero's flips, a bard's hands on the lute. src/sim/hero.js afterPose.)
    if (this.afterPose) this.afterPose(dt, sim);
    // (Where the pose was made: write carries it on to wherever he's got to since. See src/core/carry.js.)
    this.posedX = this.x; this.posedY = this.y; this.posedZ = this.z; this.posedYaw = this.yaw; this.poseVer = (this.poseVer || 0) + 1;
    {
      // How far the shield arm hangs, from guard (0) to at ease (1), judged from his chest so a stoop isn't a hang.
      const d = hangV, a = this.foreHang, g = this.foreGuard;
      this.chestView(pose, d);
      const ag = [a[0] - g[0], a[1] - g[1], a[2] - g[2]];
      const t = ((d[0] - g[0]) * ag[0] + (d[1] - g[1]) * ag[1] + (d[2] - g[2]) * ag[2]) / (ag[0] * ag[0] + ag[1] * ag[1] + ag[2] * ag[2]);
      this.hangW = smoothstep(0.3, 0.75, t);
    }
    this.solveGround(dt, sim);
    this.writeProps(this.propMatrices, 0);
  }

  // The shield forearm's direction in the chest's own frame.
  chestView(pose, out) {
    const s = this.J.spine3 * 4, w = pose.wq;
    quatRotate(hangF, 0, w, this.J.foreL * 4, this.foreAxis, 0);
    hangC[0] = -w[s]; hangC[1] = -w[s + 1]; hangC[2] = -w[s + 2]; hangC[3] = w[s + 3];
    quatRotate(out, 0, hangC, 0, hangF, 0);
  }

  // The shield arm at ease, turned palm to thigh: mostly in the forearm, a little at the shoulder. Each joint turns
  // about its own length, so nothing bends and the elbow stays where the clip put it.
  carryArm(rot, w) {
    for (const [j, ax, a] of this.carryJ) {
      quatAxisAngle(carryQ, 0, ax[0], ax[1], ax[2], a * w);
      quatMul(rot, j * 4, rot, j * 4, carryQ, 0);
    }
  }

  // How far sword or shield sits inside the body's capsules (squared metres summed over sample points). For tests:
  // the knights used to search their arms out of every overlap each frame, which flung them into scarecrow poses
  // and made them jitter. The clips carry the arms now, and the ease holds keep a hanging shield off the leg.
  equipmentPenalty(side) {
    this.writeProps(this.propMatrices, 0);
    const m = this.propMatrices, off = side === 'r' ? 0 : 16;
    const points = side === 'r' ? SWORD_POINTS : this.kind === 0 ? BLACK_SHIELD_POINTS : SILVER_SHIELD_POINTS;
    const wt = this.pose.wt, joints = this.clearanceJoints, u = this.rig.height / 2.12;
    let penalty = 0;
    for (const [x, y, z] of points) {
      const p = [m[off] * x + m[off + 4] * y + m[off + 8] * z + m[off + 12],
        m[off + 1] * x + m[off + 5] * y + m[off + 9] * z + m[off + 13],
        m[off + 2] * x + m[off + 6] * y + m[off + 10] * z + m[off + 14]];
      for (const [a, b, radius] of BODY_CAPSULES) {
        const j = joints[a] * 3, k = joints[b] * 3;
        const dx = wt[k] - wt[j], dy = wt[k + 1] - wt[j + 1], dz = wt[k + 2] - wt[j + 2];
        const t = clamp(((p[0] - wt[j]) * dx + (p[1] - wt[j + 1]) * dy + (p[2] - wt[j + 2]) * dz) / (dx * dx + dy * dy + dz * dz || 1), 0, 1);
        const overlap = radius * u - Math.hypot(p[0] - wt[j] - dx * t, p[1] - wt[j + 1] - dy * t, p[2] - wt[j + 2] - dz * t);
        if (overlap > 0) penalty += overlap * overlap;
      }
    }
    return penalty;
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
    // The board rides the forearm in the hold that fits what the arm is doing: hanging at ease, or across on guard.
    const ease = this.carryW;
    quatNlerp(this.shieldQ, 0, this.shieldFight, 0, this.shieldEase, 0, ease);
    for (let i = 0; i < 3; i++) this.shieldT[i] = this.shieldTFight[i] + (this.shieldTEase[i] - this.shieldTFight[i]) * ease;
    quatMul(q, 0, pose.wq, J.handR * 4, this.swordQ, 0);
    quatRotate(t, 0, pose.wq, J.handR * 4, this.swordT, 0);
    t[0] += pose.wt[J.handR * 3]; t[1] += pose.wt[J.handR * 3 + 1]; t[2] += pose.wt[J.handR * 3 + 2];
    mat4FromQT(tmpM, q, 0, t, 0);
    const ss = this.opts.swordScale, si = this.opts.shieldScale;
    for (let i = 0; i < 12; i++) tmpM[i] *= ss;
    out.set(tmpM, off);
    if (this.stow > 0.001 && this.stowMain && !this.opts.hero) this.putAway(out, off, this.stowMain, ss);
    // Blade segment for hit tests.
    const L = this.opts.bladeLen;
    this.bladeA = [t[0], t[1], t[2]];
    this.bladeB = [t[0] + tmpM[4] * L, t[1] + tmpM[5] * L, t[2] + tmpM[6] * L];
    // Strapped to the forearm, the board doesn't follow every flick of the wrist.
    quatMul(armQ, 0, pose.wq, J.foreL * 4, this.rig.restR, J.handL * 4);
    quatMul(q, 0, armQ, 0, this.shieldQ, 0);
    quatRotate(t, 0, armQ, 0, this.shieldT, 0);
    t[0] += pose.wt[J.handL * 3]; t[1] += pose.wt[J.handL * 3 + 1]; t[2] += pose.wt[J.handL * 3 + 2];
    if (this.aimW > 0.001) {
      // Driven: upright with his chest, standing off the fist wherever the fist goes.
      const w = this.aimW, f = aimF, d = aimV;
      quatMul(aimR, 0, pose.wq, J.spine3 * 4, this.aimQ, 0);
      quatNlerp(q, 0, q, 0, aimR, 0, w);
      quatRotate(f, 0, armQ, 0, this.fistOff, 0);
      quatRotate(d, 0, pose.wq, J.spine3 * 4, this.aimD, 0);
      for (let i = 0; i < 3; i++) t[i] += (pose.wt[J.handL * 3 + i] + f[i] + d[i] - t[i]) * w;
    }
    mat4FromQT(tmpM, q, 0, t, 0);
    this.shieldPos = [t[0], t[1], t[2]];
    this.shieldAxisX = [tmpM[0], tmpM[1], tmpM[2]];
    this.shieldAxisY = [tmpM[4], tmpM[5], tmpM[6]];
    this.shieldAxisZ = [tmpM[8], tmpM[9], tmpM[10]];
    for (let i = 0; i < 12; i++) tmpM[i] *= si;
    out.set(tmpM, off + 16);
    if (this.stow > 0.001 && this.stowOff && !this.opts.hero) this.putAway(out, off + 16, this.stowOff, si);
  }

  // A thing in the hand (its matrix at out[o]) on its way to where it's kept on him (slot: { j, q, t }, from restHold),
  // this.stow of the way there, swung out round him at the middle of it and not through him. k: its size.
  putAway(out, o, slot, k) {
    if (out[o + 15] === 0) return;
    const { wq, wt } = this.pose, j = slot.j, e = smoothstep(0, 1, this.stow);
    // (slot.hip: kept by where a hero's hips stand, not by the pelvis bone: src/sim/hero.js hipNow.)
    if (slot.hip) {
      this.hipNow();
      quatMul(stowQ, 0, this.hipQ, 0, slot.q, 0);
      quatRotate(stowT, 0, this.hipQ, 0, slot.t, 0);
      stowT[0] += this.hipT[0]; stowT[1] += this.hipT[1]; stowT[2] += this.hipT[2];
    } else {
      quatMul(stowQ, 0, wq, j * 4, slot.q, 0);
      quatRotate(stowT, 0, wq, j * 4, slot.t, 0);
      stowT[0] += wt[j * 3]; stowT[1] += wt[j * 3 + 1]; stowT[2] += wt[j * 3 + 2];
    }
    if (e < 0.999) {
      const q0 = matToQuat([out[o] / k, out[o + 1] / k, out[o + 2] / k], [out[o + 4] / k, out[o + 5] / k, out[o + 6] / k], [out[o + 8] / k, out[o + 9] / k, out[o + 10] / k]);
      quatNlerp(stowQ, 0, q0, 0, stowQ, 0, e);
      // (Out from his middle, by whichever side it's passing.)
      const mx = (out[o + 12] + stowT[0]) / 2 - this.x, mz = (out[o + 14] + stowT[2]) / 2 - this.z, ml = Math.hypot(mx, mz) || 1, b = Math.sin(e * Math.PI) * 0.3;
      stowT[0] = out[o + 12] + (stowT[0] - out[o + 12]) * e + mx / ml * b;
      stowT[1] = out[o + 13] + (stowT[1] - out[o + 13]) * e;
      stowT[2] = out[o + 14] + (stowT[2] - out[o + 14]) * e + mz / ml * b;
    }
    mat4FromQT(stowM, stowQ, 0, stowT, 0);
    for (let i = 0; i < 12; i++) stowM[i] *= k;
    out.set(stowM, o);
  }

  // ---- plates -----------------------------------------------------------------------------------------

  // Bind-space transforms of every plate, from the palette. Plates with two joints blend as dual quaternions.
  plateTransforms(snap, cOff, tick) {
    if (this.invTick === tick) return;
    this.invTick = tick;
    const pal = cOff + C_PALETTE, inv = this.inv;
    // Each plate's joints and weights flat, [j, w, j, w, ...], worked out once for the rig.
    const jws = this.rig.plateJW || (this.rig.plateJW = this.rig.pieces.map((p) => p.joints.flat()));
    for (let i = 0; i < jws.length; i++) {
      const jw = jws[i], iv = inv[i];
      let qx = 0, qy = 0, qz = 0, qw = 0, dx = 0, dy = 0, dz = 0, dw = 0;
      const sign0 = pal + jw[0] * 8;
      for (let n = 0; n < jw.length; n += 2) {
        const o = pal + jw[n] * 8;
        let s = jw[n + 1];
        if (n && snap[o] * snap[sign0] + snap[o + 1] * snap[sign0 + 1] + snap[o + 2] * snap[sign0 + 2] + snap[o + 3] * snap[sign0 + 3] < 0) s = -s;
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
    }
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
    const slot = tx === sim.player.x && tz === sim.player.z ? 0 : `k${this.id}`;
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
    const ox = this.x, oz = this.z;
    // Substeps keep charges and knockbacks from tunnelling through thin geometry.
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vz) * dt / 0.2));
    for (let i = 0; i < steps; i++) {
      tmp3[0] = this.x + this.vx * dt / steps; tmp3[2] = this.z + this.vz * dt / steps;
      sim.world.resolve(tmp3, this.bodyRadius, this.y + 0.2);
      this.x = tmp3[0]; this.z = tmp3[2];
    }
    if (dt > 0) {
      this.vx = (this.x - ox) / dt; this.vz = (this.z - oz) / dt;
      if (!this.action) this.speed = Math.hypot(this.vx, this.vz);
    }
    this.y = sim.world.groundFor(this.x, this.z, this.y);
  }

  // A guard on a post doesn't chase you across the land: past his leash from it, he lets you go.
  outOfReach(p) {
    const L = this.opts.leash;
    // Six metres more for one he's already fighting, so he doesn't flicker between chase and home at the line.
    // And it only stops a chase: anyone close enough to cut him gets fought, wherever he is.
    return !!L && Math.hypot(p.x - this.x, p.z - this.z) > 6 && Math.hypot(p.x - this.opts.spawn[0], p.z - this.opts.spawn[1]) > L + (p === this.target ? 6 : 0);
  }

  // One of Tessariel's town guard (src/core/knights.js guard, src/sim/town-watch.js), as long as nothing's set him against you
  // (the review scenes do that).
  get keeper() { return !!this.opts.guard && !this.hostile; }

  selectTarget(sim) {
    // The town's guard fights what the watch sends him to, and whoever of Velscour's comes at him; nothing else.
    if (this.keeper) {
      const d = this.duty;
      if (d && !d.dead && !d.hidden && !d.dormant) return d;
      for (const other of sim.knights) {
        if (!(other instanceof Knight) || other.kind !== 0 || other.dead || other.hidden || other.target !== this) continue;
        if (Math.hypot(other.x - this.x, other.z - this.z) < 7) return other;
      }
      return null;
    }
    let target = sim.player;
    let best = this.hostile && !target.dead && !this.letGo(target) && !this.outOfReach(target) ? Math.hypot(target.x - this.x, target.z - this.z) : Infinity;
    // (And the other Tessariels, src/sim/hero.js, who are kind 1: Velscour's men fight them as they fight Tessariel's knights.)
    for (const other of sim.heroes ? [...sim.knights, ...sim.heroes] : sim.knights) {
      // (A town guard come for him is fought wherever he's met: no leash lets him walk away from that.)
      const comeFor = other.keeper && other.duty === this;
      if (!(other instanceof Knight) || other === this || other.kind === this.kind || other.dead || other.hidden || other.below > 0 || (!comeFor && this.outOfReach(other))) continue;
      const d = Math.hypot(other.x - this.x, other.z - this.z);
      // (A town guard walking his beat past a post is let by: only one come for him, or at arm's length, is fought.)
      if (other.keeper && other.duty !== this && other.target !== this && d > 6) continue;
      if (d < 18 && d < best && sim.world.sees(this.x, this.y + 1.4, this.z, other.x, other.y + 1.4, other.z)) {
        target = other; best = d;
      }
    }
    return Number.isFinite(best) ? target : null;
  }

  // Velscour's knight keeps the church (opts.keep): he won't follow anyone into the town, or near it, and goes back to his door. Nobody
  // in the town is anything to him. (Put down in the town, he fights where he stands: the review scenes do that.) src/core/town.js.
  letGo(p) { return !!this.opts.keep && inTown(p.x, p.z, 6) && !inTown(this.x, this.z); }

  get threat() {
    if (!this.attack || !this.action) return null;
    return { name: this.attack.clip, hit: this.attack.active[0][0] * this.action.dur / this.actRate,
      t: this.actT / this.actRate, heavy: this.attack.dmg >= 20, fromRight: 0 };
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

    const target = this.selectTarget(sim);
    if (!this.dead && target !== this.target) {
      this.target = target;
      this.attack = null; this.activeOn = -1; this.iframes = false;
      this.stopAction(0.2);
      if (!target) this.setState(S.PATROL);
      else if (this.state !== S.PATROL && this.state !== S.IDLE) this.setState(S.APPROACH);
      // (A beast's girth: the town guard measures to its hide, not its middle. Nothing for a man in a suit, or you.)
      this.foeR = target && !(target instanceof Knight) && target !== sim.player ? Math.max(0, (target.bodyRadius || 0.5) * 0.7 - 0.3) : 0;
    }
    const p = target || sim.player;
    const dx = p.x - this.x, dz = p.z - this.z;
    const dist = Math.max(0.2, Math.hypot(dx, dz) - (target ? this.foeR : 0));
    const toPlayer = Math.atan2(dx, dz);
    this.dist = dist; this.toPlayer = toPlayer;

    if (this.dead) {
      this.vx = damp(this.vx, 0, 6, dt); this.vz = damp(this.vz, 0, 6, dt); this.speed = 0;
      this.deadT += dt;
      this.move(dt, sim);
      this.animateDue(dt, sim);
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
    // (Sword and board in hand for a fight and a while after, and put away for the round: src/core/stow.js.)
    stepStow(this, dt, this.combatTarget > 0 || !!this.action || this.shieldTarget > 0, this.x, this.z);
    this.move(dt, sim);
    this.animateDue(dt, sim);
  }

  // A full pose when one's due (Sim.poseGap), with all the time since the last; write carries that one along in between. Every
  // tick in a fight or a move of his own.
  animateDue(dt, sim) {
    this.poseT = (this.poseT || 0) + dt;
    const gap = this.combat > 0.05 || this.action || !sim.poseGap ? 0 : sim.poseGap(this, this.lodSlot);
    if (this.posedYaw !== undefined && this.poseT < gap - 1e-6) return;
    this.animate(this.poseT, sim);
    this.poseT = 0;
  }

  applyAction(dt, sim, p) {
    if (!this.action) return;
    const clip = this.action;
    const f = this.actT / clip.dur;
    // A clip that travels (a dive, a fall) carries the body the way it was sent, at the clip's own pace.
    if (clip.travel && this.travelDir && (this.state === S.ROLL || this.state === S.STAGGER)) {
      const d = this.bank.travel(clip, this.actT) * this.rig.motionScale;
      const v = dt > 0 ? (d - this.travelPrev) / dt : 0;
      this.travelPrev = d;
      this.vx = this.travelDir[0] * v; this.vz = this.travelDir[1] * v;
      this.speed = 0;
      if (this.state === S.ROLL) { this.iframes = f > 0.18 && f < 0.62; this.faceYaw = this.yaw; }
      return;
    }
    if (this.state === S.ROLL) {
      const v = f < 0.36 ? 2.5 : f < 0.66 ? 6.2 : f < 0.78 ? lerp(6.2, 0.4, (f - 0.66) / 0.12) : 0;
      this.vx = this.rollDirX * v; this.vz = this.rollDirZ * v;
      this.speed = 0;
      this.iframes = f > 0.33 && f < 0.68;
      this.faceYaw = this.yaw;
    } else if (this.attack && clip === this.bank.clips[this.attack.clip]) {
      const a = this.attack;
      // Slow through the wind-up, then the clip's own speed: nothing lands in under 0.45 s.
      this.actRate = f < a.active[0][0] ? this.windRate : a.rate * (a.tele ? 1.3 : 1);
      const [l0, l1, lv] = a.lunge;
      const v = f > l0 && f < l1 ? lv * Math.sin((f - l0) / (l1 - l0) * Math.PI) : 0;
      // A blade wants its length of room; a boot or a board goes in closer. He doesn't lunge into a clinch.
      // Closes to where this blow lands from, and no closer: no clinch, and no swing at air.
      const close = this.dist < Math.max(this.reach[a.key].stop, p instanceof Knight ? GAP_KNIGHT : GAP_PLAYER) ? 0 : 1;
      this.vx = Math.sin(this.yaw) * v * close; this.vz = Math.cos(this.yaw) * v * close;
      this.speed = 0;
      // Track the player through the wind-up only.
      if ((a.active[0][0] - f) * clip.dur / Math.max(this.actRate, 0.05) > 0.1) this.yaw = turn(this.yaw, this.toPlayer, (a === ATTACKS.dash ? 2.2 : 3.4) * dt);
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
    // (A town guard never lays a blade on you, nor on the other Tessariels.)
    if (this.keeper && (p === sim.player || p.kind === 1)) return;
    let d;
    const girth = this.foeR;
    if (a.limb) {
      // A kick lands with the ball of the foot, on the body's capsule.
      const j = this.J[a.limb] * 3, wt = this.pose.wt;
      const foot = [wt[j], wt[j + 1], wt[j + 2]];
      const res = segSegDist(foot, foot, [p.x, p.y + 0.2, p.z], [p.x, p.y + 1.6, p.z]);
      if (res.dist > 0.5 + girth) return;
    } else if (a.shield) {
      const s = this.shieldPos;
      d = Math.hypot(s[0] - p.x, s[2] - p.z);
      if (d > 1.15 + girth) return;
    } else {
      // Distance from the blade to the player's body, a vertical capsule.
      const bot = [p.x, p.y + 0.3, p.z], top = [p.x, p.y + 1.6, p.z];
      const res = segSegDist(this.bladeA, this.bladeB, bot, top);
      if (res.dist > 0.42 + girth) return;
    }
    if (!sim.world.sees(this.x, this.y + 1.2, this.z, p.x, p.y + 1.2, p.z)) return;
    if (p.iframes) return;
    // This blow lands, unless the player's swing meets it at the moment it does.
    if (!a.shield && p.parryOpen?.() && Math.abs(wrapAngle(Math.atan2(this.x - p.x, this.z - p.z) - p.yaw)) < 0.85) {
      this.attackUsed = true;
      const mx = (this.bladeA[0] + this.bladeB[0]) / 2, my = (this.bladeA[1] + this.bladeB[1]) / 2, mz = (this.bladeA[2] + this.bladeB[2]) / 2;
      sim.event(EV.PARRY, mx, my, mz);
      sim.hitStop(0.1);
      p.onParry(sim);
      this.onParried(sim);
      this.outcome = 'parried';
      return;
    }
    this.attackUsed = true;
    this.stats.landed++;
    // (Velscour's men bite deep; the town's guard, whose duels must end, nearly as deep on them.)
    const bite = a.dmg * (this.opts.hostile ? 1.8 : this.keeper && p instanceof Knight && p.kind === 0 ? 1.5 : 1);
    if (p instanceof Knight) {
      const frontal = Math.abs(wrapAngle(Math.atan2(this.x - p.x, this.z - p.z) - p.faceYaw)) < 1.2;
      const guarded = frontal && (p.shieldUp > 0.65 || p.state === S.BLOCK) && p.stam > 0 && p.state !== S.BREAK;
      // A boot or a board driven into a raised shield breaks the guard behind it.
      if (guarded && a.breaker) { this.outcome = 'broke'; this.stats.breaks++; p.guardBroken(sim, this.x, this.z, a.knock || 5); return; }
      if (guarded && !a.shield) { this.outcome = 'blocked'; p.onBlocked(sim, a.dmg >= 20, this); return; }
      this.outcome = 'hit';
      p.hp -= bite;
      const hostile = p.hostile;
      p.onHit(sim, a.limb ? 'kick' : 'cut', this.x, this.z, a.dmg + (a.knock || 0) * 4, a);
      if (p.down) this.gloat = true;
      p.hostile = hostile; // A duel does not turn Tessariel's knight against the player.
      if (p.hp <= 0) p.die(sim);
      return;
    }
    // One of the town guard at a beast or one of the dead (src/sim/town-watch.js): it turns on him.
    if (p !== sim.player) { this.outcome = 'hit'; this.hitBeast(sim, p, a); return; }
    // A kick goes through the player's guard as a shove: little harm, a long way back.
    const through = !!a.limb;
    const landed = p.damage(sim, bite, this.x, this.z, a.knock || 0, through);
    this.outcome = landed ? 'hit' : 'blocked';
    if (landed && HEAVY.has(a.key)) this.gloat = true;
    if (landed) sim.event(EV.HURT, p.x, p.y + 1.2, p.z, bite);
  }

  // Kicked or bashed through a raised shield: the guard drops and he reels back, open.
  guardBroken(sim, fromX, fromZ, knock) {
    const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1;
    this.attack = null; this.activeOn = -1;
    this.knockX = dx / L; this.knockZ = dz / L; this.knock = Math.min(knock, 6);
    this.stam = Math.max(0, this.stam - 30); this.stamDelay = 1.2;
    this.shieldUp = 0.2; this.shieldTarget = 0;
    this.play('Idle_Shield_Break', 1.25, 'full', 0.06);
    this.setState(S.BREAK);
    sim.event(EV.SHIELD_BREAK, this.x, this.y + 1.2, this.z);
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
        if (this.stateT > (this.style.alert === 'L_Point' ? 1.5 : 0.9)) this.setState(S.APPROACH);
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
        if (this.down && (!this.action || this.actT >= this.action.dur)) {
          // Back up off the floor.
          this.down = false; this.travelDir = null;
          this.play('LayToIdle', 1.3, 'full', 0.2);
          break;
        }
        if (!this.action || this.actT >= this.action.dur) {
          this.stopAction(0.22);
          this.setState(hostile || p instanceof Knight || (p === this.duty && !p.dead) ? S.CIRCLE : S.PATROL);
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
        if (this.actT / this.action?.dur > 0.08 || !this.action) {
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
      // Armed patrols keep their hands on their equipment.
      if (this.action && this.actT >= this.action.dur - 0.2) this.stopAction(0.4);
    } else {
      if (this.action) this.stopAction(0.4);
      const [tx, tz] = route[this.routeI];
      const d = Math.hypot(tx - this.x, tz - this.z);
      if (d < 1.1) { this.routeI = (this.routeI + 1) % route.length; this.pauseT = 1 + Math.random() * 3.5; }
      else {
        // Whether the way to the post is clear, looked at five times a second, not every tick: it's a walk of the whole line
        // in steps of a hand, and nothing on it moves. (A new post is looked at straight away.)
        if ((this.lineT = (this.lineT || 0) - dt) <= 0 || this.lineTo !== this.routeI) {
          this.lineT = 0.2; this.lineTo = this.routeI;
          this.lineClear = sim.world.clearance(this.x, this.z, (tx - this.x) / d, (tz - this.z) / d, d, this.bodyRadius) >= d;
        }
        if (!this.lineClear) this.goto(dt, sim, tx, tz, this.opts.walk, Math.atan2(tx - this.x, tz - this.z));
        else { const fx = (tx - this.x) / d, fz = (tz - this.z) / d; this.steer(dt, fx * this.opts.walk, fz * this.opts.walk, 4, Math.atan2(fx, fz)); }
      }
    }
    // Sent by the watch (src/sim/town-watch.js): no looking about for it, he's on his way.
    if (this.duty && p === this.duty && !p.dead) {
      if (this.action) this.stopAction(0.2);
      this.seen = true;
      sim.event(EV.ALERT, this.x, this.y + 1.5, this.z);
      this.setState(S.APPROACH);
      return;
    }
    if ((!this.hostile && !(p instanceof Knight)) || p.dead || this.letGo(p) || this.outOfReach(p)) return;
    // Sight is a cone. A sprint close by is heard, and anything at arm's length is felt.
    // (The ray only when it could matter: in the cone and in range.)
    const inCone = Math.abs(wrapAngle(toPlayer - this.faceYaw)) < 1.9;
    const sees = inCone && dist < (this.opts.hostile ? 18 : 22) && sim.world.sees(this.x, this.y + 1.7, this.z, p.x, p.y + 1.6, p.z);
    if (sees || (dist < 9 && p.sprinting) || dist < 5) {
      this.seen = true;
      if (this.action) this.stopAction(0.2);
      sim.event(EV.ALERT, this.x, this.y + 1.5, this.z);
      this.setState(S.ALERT);
      // Velscour's knight levels his blade at you; Tessariel's gives a nod.
      this.play(this.style.alert, this.style.alert === 'L_Point' ? 1.3 : 1.2, 'upper', 0.25);
    }
  }

  thinkApproach(dt, sim, p, dist, toPlayer) {
    this.combatTarget = 1; this.shieldTarget = dist < 11 ? 1 : 0.4;
    if (this.action && this.actMask === 'upper' && this.actT >= this.action.dur - 0.1) this.stopAction(0.3);
    const lim = 1 - this.hurt * 0.35;
    // Spells in the air: he comes on behind the board at a walk, and runs the gaps between them.
    const fire = p === sim.player && this.boltThreat(sim, 1.3, 1.6);
    if (fire) this.shieldTarget = 1;
    const speed = (fire ? 2.1 : dist > 7 ? 5.4 : p instanceof Knight ? 1.9 : 3.5) * lim;
    this.goto(dt, sim, p.x, p.z, speed, undefined);
    this.faceYaw = dist < 8 ? turn(this.faceYaw, toPlayer, 7 * dt) : turn(this.faceYaw, this.yaw, 7 * dt);
    if (dist < 7.2 && sim.world.sees(this.x, this.y + 1.2, this.z, p.x, p.y + 1.2, p.z)) {
      // Close the last few metres behind the shield, or commit with a dash across open ground.
      if (dist > 3.0 && dist < 4.6 && this.stam > 40 && Math.random() < dt * 1.4 * this.style.aggro && !p.dead) this.startAttack(sim, Math.random() < 0.5 ? ATTACKS.pounce : ATTACKS.dash);
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
    let ring = p instanceof Knight ? { press: 2.2, circle: 2.7, bait: 3.2, 'shield wall': 2.4, 'flank dash': 3.2, 'fall back': 6.5 }[name] : 2.4;
    // Ready to swing and nothing reaches from here: he stalks in to where something does, rather than circle at range.
    if (this.attackT <= 0 && name !== 'fall back') ring = Math.min(ring, 2.0);
    // Each plan shows in how he holds himself: bait drops the shield and dares you.
    this.shieldTarget = name === 'bait' ? 0.12 : 1;
    if (this.tacticStart) {
      this.tacticStart = false;
      if (name === 'fall back' && (this.bleeds.length || this.hurt > 0.05)) { this.startRetreat(sim, p); return; }
      if (name === 'flank dash' && this.rollCd <= 0 && this.stam > 45 && dist < 5.5) { this.startRoll(sim, p, false, true); return; }
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
    let sx = tz * this.strafe, sz = -tx * this.strafe;
    if (sim.world.clearance(this.x, this.z, sx, sz, 1.5, this.bodyRadius) < 1.5) { this.strafe = -this.strafe; this.strafeT = 1.5; sx = -sx; sz = -sz; }
    const radial = clamp((dist - ring) * 1.2, -1.2, 1.4);
    const speed = (name === 'press' ? 1.9 : name === 'shield wall' ? 1.15 : 1.45) * lim;
    if (!sim.world.sees(this.x, this.y + 1.2, this.z, p.x, p.y + 1.2, p.z)) {
      this.setState(S.APPROACH); this.goto(dt, sim, p.x, p.z, speed, toPlayer); return;
    }
    const mx = sx + tx * radial, mz = sz + tz * radial, ml = Math.hypot(mx, mz) || 1;
    if (sim.world.clearance(this.x, this.z, mx / ml, mz / ml, 0.8, this.bodyRadius) < 0.4 && dist > 2.5) {
      this.goto(dt, sim, p.x, p.z, speed, toPlayer);
    } else this.steer(dt, mx * speed, mz * speed, 6, wrapAngle(toPlayer + woundBias));
    if (dist > 8.5 && name !== 'fall back') { this.setState(S.APPROACH); return; }
    if (name === 'fall back' && (this.hurt > 0.05 || this.bleeds.length) && this.stateT > 0.4) { this.startRetreat(sim, p); return; }
    if (this.reactToSwing(dt, sim, p, dist)) return;
    // Cornered with the player on top of him: roll out past them.
    if (dist < 2.0 && this.rollCd <= 0 && sim.world.clearance(this.x, this.z, -tx, -tz, 2, this.bodyRadius) < 1.2 && Math.random() < dt * 1.6) { this.startRoll(sim, p, true); return; }
    if (this.action && this.actMask === 'upper' && this.actT >= this.action.dur) this.stopAction(0.15);
    if (name !== 'fall back') this.attackT -= dt * (name === 'press' ? 1.5 : name === 'shield wall' ? 0.45 : name === 'circle' || name === 'bait' ? 0.75 : 1);
    if (p.recovering && dist < 6) this.attackT -= dt * 7;
    if (this.attackT <= 0 && !p.dead && !this.action) {
      const pick = this.pickAttack(sim, p, dist, name);
      if (pick === 'feint') { this.startFeint(); return; }
      if (pick) { this.startAttack(sim, pick); return; }
    }
    this.tauntT -= dt;
    // He taunts over a man he's put on the floor, not at the air.
    if (this.gloat && this.tauntT <= 0 && dist > 2.6 && dist < 9 && !this.boltThreat(sim, 1.5, 2)) {
      this.gloat = false;
      this.tauntT = 8 + Math.random() * 8;
      this.play(this.style.taunt, 1.1, 'upper', 0.3);
      this.setState(S.TAUNT);
      sim.event(EV.TAUNT, this.x, this.y + 1.6, this.z);
    }
  }

  // How shut the target is behind a shield, 0 to 1. A player who's blocked his last two blows counts as shut.
  targetGuard(p) {
    const up = p instanceof Knight ? (p.state === S.BLOCK ? 1 : p.state === S.BREAK ? 0 : p.shieldUp) : (p.blocking ? 1 : p.shieldUp || 0);
    const learned = this.blockedRun >= 2 ? 0.7 : 0;
    return Math.max(up, learned);
  }

  // The target is open: swinging and missed, reeling, on the floor, or guard broken.
  targetOpen(p) {
    return !!(p.recovering || (p instanceof Knight && (p.state === S.STAGGER || p.state === S.BREAK || p.down)));
  }

  pickAttack(sim, p, dist, tactic) {
    // He keeps a reserve for the shield and the roll, unless he's dying anyway.
    const reserve = this.hurt > 0.8 ? 0 : 24;
    const guard = this.targetGuard(p), open = this.targetOpen(p), likes = this.style.likes;
    const out = [];
    for (const [k, a] of Object.entries(ATTACKS)) {
      if (dist < a.range[0] || dist > this.reach[k].max || this.stam - a.stam < reserve) continue;
      if (!(p instanceof Knight) && a.range[0] < 3 && this.reach[k].stop + (a.limb ? 0.15 : a.shield ? 0.25 : 0.12) < GAP_PLAYER) continue;
      let w = likes[k] ?? 1;
      if (k === 'combo' || k === 'heavy') w *= this.hurt > 0.5 ? 1.6 : 0.5;
      // A raised shield wants a boot or a board; an open one wants the big blow.
      if (a.breaker) w *= 0.6 + guard * 4;
      else if (!a.shield) w *= 1 - guard * 0.6;
      if (open) w *= HEAVY.has(k) ? 3.2 : FAST.has(k) ? 1.6 : 1;
      if (k === 'dash' || k === 'pounce') w *= tactic === 'flank dash' || tactic === 'bait' || p.recovering ? 3 : 1;
      if (k === 'bash') w *= tactic === 'shield wall' ? 3 : 1;
      // He's mid-swing at you: only something quick gets there first.
      if (p.threat && !FAST.has(k)) w *= 0.3;
      if (this.riposte) w *= FAST.has(k) ? 3 : 0.4;
      // A caster at range is closed on hard.
      if (!(p instanceof Knight) && dist > 3.3) w *= k === 'pounce' || k === 'dash' ? 2.2 : 1;
      // And a knight with one idea is easy to read.
      const n = this.recent.reduce((c, r) => c + (r === k), 0);
      w *= n === 0 ? 1 : n === 1 ? 0.35 : 0.1;
      out.push([k, w]);
    }
    this.riposte = false;
    if (!out.length) return null;
    // A feint now and then, more when the target is the kind who swings first.
    const eager = this.habit.total > 4 ? 0.28 : 0.12;
    if (p instanceof Knight && !p.recovering && !open && dist < 2.5 && Math.random() < eager * (2 - this.style.aggro)) return 'feint';
    let sum = out.reduce((t, e) => t + e[1], 0), r = Math.random() * sum;
    for (const [k, w] of out) { r -= w; if (r <= 0) { this.lastAttack = k; return ATTACKS[k]; } }
    return ATTACKS[out[0][0]];
  }

  // Past a blow's link point, what comes next depends on how it went: through a guard, the big one; into a
  // shield, a boot to break it; landed, another quick one before they recover; at air, close the gap or stop.
  chainNext(sim, p, dist) {
    const o = this.outcome;
    if (p.dead || o === 'parried' || !this.attack) return null;
    const guard = this.targetGuard(p);
    let best = null, bw = 0;
    for (const k of NEXT[this.attack.key] || []) {
      const a = ATTACKS[k];
      if (this.stam - a.stam < 6 || dist < a.range[0] - 0.3 || dist > this.reach[k].max + 0.2) continue;
      if (!(p instanceof Knight) && this.reach[k].stop + (a.limb ? 0.15 : a.shield ? 0.25 : 0.12) < GAP_PLAYER) continue;
      let w = (this.style.likes[k] ?? 1) * (0.6 + Math.random() * 0.8);
      if (o === 'blocked' || guard > 0.6) w *= a.breaker ? 4 : 0.4;
      if (o === 'broke') w *= HEAVY.has(k) ? 6 : 0.7;
      if (o === 'hit') w *= FAST.has(k) ? 2 : 1;
      if (o === 'whiff') w *= dist > 3 ? (k === 'pounce' ? 3 : 0.4) : 0.8;
      if (this.recent[this.recent.length - 1] === k) w *= 0.2;
      if (w > bw) { bw = w; best = a; }
    }
    return best;
  }

  startFeint() {
    this.setState(S.FEINT);
    this.play('Sword_Attack', 1.1, 'full', 0.1);
  }

  startAttack(sim, a, chained = false) {
    this.attack = a;
    this.attackUsed = false;
    this.activeOn = -1;
    this.glintDone = false;
    this.chainTried = false;
    this.stam -= a.stam;
    this.stats.attacks++;
    if (!chained) {
      const [lo, hi] = this.style.combo;
      this.comboLeft = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (this.stam < 35 || this.hurt > 0.7) this.comboLeft = Math.min(this.comboLeft, 1);
    }
    this.outcome = 'whiff';
    this.recent.push(a.key);
    if (this.recent.length > 4) this.recent.shift();
    const clipDur = this.bank.clips[a.clip].dur;
    // A first blow is slowed through its wind-up so it can be read; a follow-up keeps more of its pace.
    this.windRate = Math.min(a.rate, a.active[0][0] * clipDur / (chained ? 0.3 : 0.45));
    if (a.tele) this.windRate = Math.min(this.windRate, a.rate * (chained ? 0.8 : 0.65));
    this.chainLen = chained ? this.chainLen + 1 : 1;
    this.play(a.clip, this.windRate, 'full', chained ? 0.08 : 0.1);
    this.setState(S.ATTACK);
    this.yaw = this.faceYaw;
    this.shieldTarget = a.hold ? 1 : 0.3;
  }

  thinkAttack(dt, sim, p, dist) {
    if (!this.action) { this.setState(S.CIRCLE); return; }
    const cur = this.attack;
    if (cur && this.action.name === cur.clip && !this.chainTried && this.actT >= this.action.dur * (cur.link ?? (cur.end ? cur.end - 0.06 : 0.86))) {
      this.chainTried = true;
      if (this.outcome === 'blocked') this.blockedRun = (this.blockedRun || 0) + 1; else if (this.outcome === 'hit' || this.outcome === 'broke') this.blockedRun = 0;
      const then = cur.then && ATTACKS[cur.then[p instanceof Knight ? 0 : 1]];
      const forced = then && dist < then.range[1] + 0.6 && this.stam > 4 ? then : null;
      const next = forced || (this.comboLeft > 0 || this.outcome === 'broke' ? this.chainNext(sim, p, dist) : null);
      if (next) {
        this.comboLeft = Math.max(0, this.comboLeft - 1);
        this.stats.chained++;
        this.startAttack(sim, next, true);
        return;
      }
    }
    if (this.actT >= this.action.dur * (this.attack?.end || 1)) {
      if (this.attack?.rec && this.action.name === this.attack.clip) {
        const rec = this.attack.rec;
        this.attack = null;
        this.play(rec, 1.0, 'full', 0.05);
      } else {
        this.attack = null;
        this.stopAction(0.2);
        // A run of three and he stands off to breathe; a caster gets a beat more to answer.
        this.attackT = (this.chainLen >= 3 ? 1.2 + Math.random() * 0.6 : 0.7 + Math.random() * 1.2) + (p instanceof Knight ? 0 : 0.35);
        this.setState(S.CIRCLE);
      }
      return;
    }
    // Late in a swing he can still bail out with a roll, if he has the legs.
    if (!this.attack && this.actT > 0.3) this.reactToSwing(dt, sim, p, dist);
  }

  // Reading the player's swing: wait a human moment, then shield, roll or step out.
  reactToSwing(dt, sim, p, dist) {
    if (!(p instanceof Knight)) return p === sim.player ? this.reactToSpell(dt, sim, p) : false;
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

  // The nearest bolt that will reach him within horizon seconds, passing within pad of his middle.
  boltThreat(sim, horizon, pad) {
    let incoming = null, soonest = horizon;
    for (const b of sim.casting?.bolts || []) {
      const v2 = b.vx ** 2 + b.vz ** 2;
      if (v2 < 1) continue;
      const t = ((this.x - b.x) * b.vx + (this.z - b.z) * b.vz) / v2;
      if (t < 0.12 || t > soonest) continue;
      if (Math.hypot(b.x + b.vx * t - this.x, b.z + b.vz * t - this.z) > (pad ?? this.bodyRadius) + (b.size || 0.1)) continue;
      const y = b.y + (b.vy || 0) * t;
      if (y < this.y || y > this.y + this.rig.height) continue;
      if (!sim.world.sees(this.x, this.y + 1.4, this.z, b.x, b.y, b.z)) continue;
      incoming = b; soonest = t;
    }
    this.boltT = soonest;
    return incoming;
  }

  reactToSpell(dt, sim, p) {
    // React to visible incoming projectiles, not the caster's inputs or aim.
    const incoming = this.boltThreat(sim, 0.85);
    if (!incoming) { this.spellSeen = null; this.spellReactAt = 0; return false; }
    if (this.spellSeen !== incoming) { this.spellSeen = incoming; this.spellReactAt = sim.time + 0.18; return false; }
    if (sim.time < this.spellReactAt) return false;
    // Coming at the front, with the legs for it: the shield takes it. Otherwise he gets out of the way.
    const from = Math.atan2(incoming.x - this.x, incoming.z - this.z);
    const frontal = Math.abs(wrapAngle(from - this.faceYaw)) < 1.0;
    if (frontal && this.stam > 26 && this.state !== S.BLOCK && this.state !== S.BREAK && Math.random() < this.style.blockSpells) {
      this.spellReactAt = Infinity;
      this.startBlock(sim, this.boltT + 0.2);
      return true;
    }
    if (this.rollCd > 0 || this.stam < 22) return false;
    const before = this.state;
    this.startRoll(sim, p, false, true);
    return this.state !== before;
  }

  // A spell meets the board: most of it spent on the shield and on his legs. Returns the share that gets through.
  spellGuard(sim, fromX, fromZ, dmg) {
    if (this.dead || this.state === S.BREAK || this.state === S.ROLL || this.stam <= 0) return 1;
    if (!(this.shieldUp > 0.6 || this.state === S.BLOCK) || Math.hypot(fromX - this.x, fromZ - this.z) < 0.5) return 1;   // (a burn from inside has no front)
    if (Math.abs(wrapAngle(Math.atan2(fromX - this.x, fromZ - this.z) - this.faceYaw)) > 1.0) return 1;
    this.stam -= 5 + dmg * 0.45; this.stamDelay = 0.8;
    this.stats.spellBlocks++;
    if (!this.action) this.play('Shield_OneShot', 1.3, 'upper', 0.05);
    const sp = this.shieldPos || [this.x, this.y + 1.2, this.z];
    sim.event(EV.BLOCK, sp[0], sp[1], sp[2], Math.sin(this.faceYaw), 0.2, Math.cos(this.faceYaw));
    if (this.stam <= 0) { this.stam = 0; this.guardBroken(sim, fromX, fromZ, 3); return 0.5; }
    return 0.15;
  }

  startBlock(sim, hold) {
    this.attack = null; this.activeOn = -1;
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
      // Riposte: a blocked swing leaves the attacker open, and he's straight back with something quick.
      if (p.recovering || this.riposte) this.attackT = Math.min(this.attackT, 0.06);
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
      const clear = sim.world.clearance(this.x, this.z, dx, dz, 3.5, this.bodyRadius);
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
    this.attack = null; this.activeOn = -1;
    this.rollDirX = bx; this.rollDirZ = bz;
    this.yaw = Math.atan2(bx, bz);
    this.faceYaw = this.yaw;
    this.stam -= 14;
    this.rollCd = 1.9;
    // Into the tuck through a quick crouch, skipping the clip's leap. (Lisandra's dive went head first onto the
    // kite shield and left him on his back: plate rolls, it doesn't dive.)
    this.play('Roll', 1.05, 'full', 0.15);
    this.actT = this.bank.clips.Roll.dur * 0.3;
    this.travelDir = null;
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
      if (dist > 3.0 && dist < 4.6 && this.stam > 25) this.startAttack(sim, ATTACKS.dash);
      else this.setState(S.APPROACH);
    }
  }

  // ---- taking blows ---------------------------------------------------------------------------------

  onBlocked(sim, heavy, attacker) {
    const cost = heavy ? 38 : 16;
    this.stam -= cost;
    this.stamDelay = 1.5;
    this.stats.blocks++;
    if (attacker && this.stam > 20 && Math.random() < this.style.riposte) {
      this.riposte = true; this.stats.ripostes++;
      if (this.state === S.CIRCLE) this.attackT = Math.min(this.attackT, 0.1);
    }
    if (!this.action) this.play('Shield_OneShot', 1.2, 'upper', 0.05);
    if (this.stam <= 0) {
      this.stam = 0;
      this.play('Idle_Shield_Break', 1, 'full', 0.05);
      this.setState(S.BREAK);
      sim.event(EV.SHIELD_BREAK, this.x, this.y + 1.2, this.z);
    }
  }

  // A guard's blow on something that isn't a man in a suit: a beast, one of the dead, a Tripo monster. Hit hard (the town's
  // swords are there to end it), and it holds on him a while instead of whoever it was after (src/sim/foes.js fixOn).
  hitBeast(sim, m, a) {
    const dmg = a.dmg * GUARD_BITE;
    m.hp -= dmg;
    if (m.seenHp !== undefined) m.seenHp = m.hp;
    m.guardHitT = sim.time;
    m.onHit?.(sim, a.limb ? 'kick' : 'gash', this.x, this.z, a.dmg + (a.knock || 0) * 4, null);
    m.fixOn = this; m.fixT = sim.time + 5;
    if (a.knock && (m.bodyRadius || 0.5) < 1 && sim.casting?.shove) {
      const dx = m.x - this.x, dz = m.z - this.z, L = Math.hypot(dx, dz) || 1;
      sim.casting.shove(m, dx / L * a.knock, dz / L * a.knock, 0);
    }
    if (Math.hypot(sim.player.x - m.x, sim.player.z - m.z) < 60) sim.event(EV.BITE, m.x, m.y + 1.1, m.z, Math.min(1, dmg / 20), m.bodyRadius > 1.2 ? 0 : 1);
    if (m.hp <= 0 && !m.dead) m.die?.(sim);
  }

  // Bitten, clawed or burnt by a monster that's turned on him (src/sim/foes.js): the board takes it from the front.
  damage(sim, amount, fromX, fromZ, knock = 0, unblockable = false) {
    if (this.dead || this.iframes) return false;
    const front = Math.abs(wrapAngle(Math.atan2(fromX - this.x, fromZ - this.z) - this.faceYaw)) < 1.1;
    if (!unblockable && front && (this.shieldUp > 0.6 || this.state === S.BLOCK) && this.stam > 0 && this.state !== S.BREAK) {
      this.hp -= amount * 0.15;
      this.onBlocked(sim, amount >= 20, null);
      return false;
    }
    this.hp -= amount;
    if (knock > 0) { const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1; this.knockX = dx / L; this.knockZ = dz / L; this.knock = Math.min(knock, 5); }
    this.onHit(sim, 'cut', fromX, fromZ, amount * 1.5, null);
    if (this.hp <= 0 && !this.dead) this.die(sim);
    return true;
  }

  onHit(sim, kind, fromX, fromZ, poise = 30, by = null) {
    this.hitT = 0;
    this.recentHits += 1;
    const wasPatrol = this.state === S.PATROL || this.state === S.IDLE;
    // (The town guard isn't turned by a blow: whatever struck him, it's not you he fights.)
    if (!this.hostile && !this.opts.guard) { this.hostile = true; }
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
      const floored = (this.state === S.BREAK || (by && HEAVY.has(by.key))) && sim.time - this.lastFall > 10 && (this.state === S.BREAK || this.hurt > 0.3 || Math.random() < 0.5);
      if (floored) this.lastFall = sim.time;
      if (floored) {
        // Off his feet, facing the blow: he goes over backwards and lands on his back, where LayToIdle starts.
        this.knockX = dx / L; this.knockZ = dz / L; this.knock = 5.5;
        this.play('Hit_Knockback', 1.0, 'full', 0.06);
        this.travelDir = null;
        this.down = true; this.stats.falls++;
      } else if (kind === 'puncture') {
        this.knockX = dx / L; this.knockZ = dz / L; this.knock = 4.5;
        this.play('Hit_Knockback', 1.05, 'full', 0.06);
      } else {
        const pool = kind === 'kick' ? ['L_HitGut'] : Math.random() < 0.4 ? HIT_HIGH : HIT_LOW;
        this.play(pool[Math.random() * pool.length | 0], 1.25, 'full', 0.06);
      }
      this.setState(S.STAGGER);
      sim.event(EV.GRUNT, this.x, this.y + 1.5, this.z, kind === 'puncture' ? 1 : 0.4);
    } else if (this.state === S.CIRCLE && !this.action) {
      // Rides the blow on the upper body and keeps moving.
      this.play(Math.random() < 0.5 ? 'L_HitBody' : 'Hit_Chest', 1.5, 'upper', 0.05);
      this.attackT = Math.min(this.attackT, 0.5);
    }
  }

  die(sim) {
    this.dead = true;
    this.hp = 0;
    this.attack = null;
    this.iframes = false;
    this.play('Death01', 1, 'full', 0.15);
    // The slow fall of a knight the player has just cut down close by; not the whole world slowed for any knight anywhere.
    if (sim.time - (this.playerHitT ?? -1e9) < 1 && sim.player && Math.hypot(sim.player.x - this.x, sim.player.z - this.z) < 25) sim.slowMo(1.3);
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
    // The palette and what's in the hands are worked out once for each pose (they cost about what the pose did) and kept. Moved
    // since the pose was made (posed only now and then far off, or shouldered aside after), they're carried along with him, so he
    // glides rather than standing and jumping (src/core/carry.js).
    const n = this.rig.count, fresh = !this.palKept || this.keptVer !== this.poseVer;
    const pal = this.palKept || (this.palKept = new Float32Array(n * 8)), props = this.propsKept || (this.propsKept = new Float32Array(PROPS_PER_CHAR * 16));
    const head = this.headKept || (this.headKept = new Float32Array(3));
    if (fresh) {
      this.keptVer = this.poseVer; writePalette(this.pose, pal, 0); this.writeProps(props, 0);
      if (this.J.head !== undefined) for (let a = 0; a < 3; a++) head[a] = this.pose.wt[this.J.head * 3 + a];
      else { head[0] = this.x; head[1] = this.y + 1.7; head[2] = this.z; }
    }
    const c = this.posedYaw !== undefined && carryFrame(bodyCarry, this.posedYaw, this.posedX, this.posedY, this.posedZ, this.yaw, this.x, this.y, this.z) ? bodyCarry : null;
    if (c) {
      carryPalette(pal, 0, snap, cOff + C_PALETTE, n, c);
      for (let o = 0; o < PROPS_PER_CHAR * 16; o += 16) {
        if (props[o + 15] !== 0) carryMat4(props, o, snap, cOff + C_PROPS + o, c); else snap.set(props.subarray(o, o + 16), cOff + C_PROPS + o);
      }
      carryPoint(head, 0, snap, cOff + C.HEAD_X, c);
    } else { snap.set(pal, cOff + C_PALETTE); snap.set(props, cOff + C_PROPS); snap.set(head, cOff + C.HEAD_X); }
    // The plates' frames, for where a blow lands and where the blood runs from: kept up whenever a blow could come (near the player,
    // in a fight) or he's bleeding. Otherwise worked out when something asks (plateTransforms, from the snapshot).
    if (fresh || c && (this.bleeds.length || this.combat > 0.05 || this.foe || !sim.poseGap || !sim.poseGap(this, this.lodSlot))) this.plateTransforms(snap, cOff, sim.tick);
    else if (c) this.invTick = -1;
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
const bodyCarry = new Float32Array(8);
const tv = new Float32Array(3), lo = new Float32Array(3), ld = new Float32Array(3), hn = new Float32Array(3), tmp3 = new Float32Array(3);
// The shield arm's turn at ease, in radians about each joint's own length: upper arm, forearm.
const CARRY_UPPER = -0.15, CARRY_FORE = -0.75;
const hangV = [0, 0, 0], hangF = [0, 0, 0], hangC = [0, 0, 0, 1];
const carryQ = new Float32Array(4), aimR = new Float32Array(4), aimF = new Float32Array(3), aimV = new Float32Array(3);
const BODY_CAPSULES = [[0, 1, 0.32], [1, 2, 0.19], [3, 4, 0.16], [4, 5, 0.12], [6, 7, 0.16], [7, 8, 0.12]];
// Dense conservative surface samples in the shipped prop files' local coordinates.
const SWORD_POINTS = Array.from({ length: 25 }, (_, i) => [-0.09, 0, 0.09].map(z => [0, -0.11 + i * 1.11 / 24, z])).flat();
const shieldPoints = (w, low, high) => Array.from({ length: 13 }, (_, i) => Array.from({ length: 9 }, (_, j) =>
  [-0.085, 0.06].map(z => [-w + j * w / 4, low + i * (high - low) / 12, z]))).flat(2);
const BLACK_SHIELD_POINTS = shieldPoints(0.237, -0.406, 0.294);
const SILVER_SHIELD_POINTS = shieldPoints(0.18, -0.534, 0.386);
const armQ = new Float32Array(4), weaponQ = new Float32Array(4), weaponT = new Float32Array(3), tmpM = new Float32Array(16), flowDir = new Float32Array(2);

function turn(a, b, step) {
  const d = wrapAngle(b - a);
  return wrapAngle(a + clamp(d, -step, step));
}

// Places on a body for things to be kept (a board on the back, a sword at the hip): found on it stood at rest, facing +Z
// with its left +X, and kept by a joint from then on. hold(j, y, z, at): the thing's own +Y along y and its +Z toward z,
// its grip at `at`, as { j, q, t } in that joint's frame. hold.y(j): how high the joint stands.
export function restHold(rig, bank) {
  const pose = new Pose(rig);
  pose.rot.set(rig.restR); pose.pelvis.set(bank.pelvisRest);
  bank.sample(bank.clips.Idle_Loop, 0, pose.rot, pose.pelvis);
  solveFK(pose, 0, 0, 0, 0, null, null);
  const hold = (j, y, z, at) => {
    const sq = pose.wq.subarray(j * 4, j * 4 + 4), inv = [-sq[0], -sq[1], -sq[2], sq[3]];
    const yy = norm(y), zz = norm(orth(z, yy)), q = new Float32Array(4), t = new Float32Array(3);
    quatMul(q, 0, inv, 0, matToQuat(cross(yy, zz), yy, zz), 0);
    quatRotate(t, 0, inv, 0, [at[0] - pose.wt[j * 3], at[1] - pose.wt[j * 3 + 1], at[2] - pose.wt[j * 3 + 2]], 0);
    return { j, q, t };
  };
  hold.y = (j) => pose.wt[j * 3 + 1];
  return hold;
}
const stowQ = new Float32Array(4), stowT = new Float32Array(3), stowM = new Float32Array(16);

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

export { ATTACKS, segSegDist, blend, blendMask, lerp3, turn, norm, cross, orth, matToQuat };
