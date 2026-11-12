// Your own body, for the third-person view: the wizard (assets/game/player/wizard.glb, tools/player/build.mjs), posed here each
// tick from what the player is doing and written into a character slot like anyone else's, with what's in his hands.
//
// The file brings a walk, a run and a fall (the death). Everything else is made here, on top of them:
//   - standing: the bind pose with the arms let down, breathing;
//   - the legs: walk and run mixed by pace, in step with each other, played backwards going backwards, the hips turned the
//     way he's going and the chest kept to where you look; a jump is the run's flight;
//   - the arms: each hand is put where it holds what it holds (the staff as a walking staff in the right, the skull under
//     the left in a claw, or the shield on the left forearm), by a two-bone solve from the shoulder, with the fingers shut
//     round it. An empty hand swings as the clip has it;
//   - the casts: the staff's shot, a spell thrown with one hand or pushed with both, one raised with one hand or both.
//     They're poses of the arms and the chest alone, so they play standing, walking or running;
//   - the shield ride: feet on the board, knees bent, side on, looking down the hill.
// Everything is worked in his own space (y up, +z ahead, +x his left) and stood in the world by the rig's root.
import { C, C_PALETTE, C_PROPS } from '../core/layout.js';
import { clamp, damp, lerp, quatAxisAngle, quatFromMat3, quatMul, quatNlerp, quatNormalize, quatRotate, quatYaw, smoothstep, wrapAngle } from '../core/math.js';
import { ArmsRig } from './anim.js';

const TAU = Math.PI * 2;
// How fast the clips' own strides go, and how far past that the legs are let quicken: past it the feet slide a little
// rather than patter (the game's run is 5.6 m/s and its sprint 8.6, well over the clip's 4.2).
const QUICKEN = 1.22, QUICKEN_PAST = 0.22;
const HIP_TURN = 1.15;            // how far the hips turn from where you look, moving sideways (rad)
const AIR_PHASE = 0.3;            // where in the run's loop a jump hangs
const PALM = [0.085, 0.034];      // the middle of the palm from the wrist: along the fingers, and out of the palm (m)
const SKULL_DROP = 0.105;         // the skull's middle under the palm
const SKULL_SIZE = 1.12, SHIELD_SIZE = 1.28;
const SHIELD_SEAT = 0.085;        // the shield's back off the palm's middle, out past the back of the hand: the arm lies behind the board
const STAFF_FOOT = 1.14;           // the staff's foot under the fist (m)
const STAFF_HEAD = 0.5;           // the staff's head above the fist, where a shot leaves it (m)
// The shield slung on the back when the left hand has the skull: on the spine's top joint, this far behind it and above,
// leaned over so its point is down toward the right hip.
const BACK_AT = [0.02, -0.1, -0.185], BACK_LEAN = 0.5, BACK_TIP = 0.1;
// Put away, out of a fight (s.stow, 0 to 1: src/sim/sim.worker.js stepStow). The staff goes on his back, under the shield:
// nearly upright, its head over the right shoulder (STOW.staff: where its grip sits from the spine's top joint, how far it
// leans over, and how far its head tips in to the shoulders); the shield a little further out, over it (STOW.over); and the
// skull hangs at his left hip (STOW.skull: from the hip joint, and the way it faces). On the way there each swings out
// round him (STOW.arc), not through him.
const STOW = {
  staff: [0.03, 0.26, -0.14], lean: 0.17, rideLean: 0.95, tip: 0.04, over: 0.04,
  skull: [0.185, -0.045, 0.06], face: [0.78, 0, 0.62], size: 0.9,
  arc: { staff: [-0.3, 0.2, -0.12], shield: [0.34, 0.05, -0.1], skull: [0.16, 0, 0.1] },
};
// The shield ride.
const SURF = { side: -1.2, front: 0.2, back: 0.24, crouch: 0.2, lift: 0.105, ankle: 0.143 };
// His arms on it, which keep him up. Into a carve the leading hand goes round with the turn and down a little, and the
// trailing one back and up (swing, dip, rise: metres at a full lean); off a crest both go up (air). A hand with something
// in it does a part of that (held).
const RIDE_ARMS = { swing: 0.07, dip: 0.03, rise: 0.04, air: 0.08, held: 0.5, staffRise: 0.52, staffGive: 0.12 };

const v3 = () => [0, 0, 0];
const set = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; };
const add = (o, a, b, k = 1) => { o[0] = a[0] + b[0] * k; o[1] = a[1] + b[1] * k; o[2] = a[2] + b[2] * k; return o; };
const sub = (o, a, b) => { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (o, a, b) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; };
const norm = (o, a = o) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; };
const mix = (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
const ease = (t) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const conj = (o, q, qi = 0) => { o[0] = -q[qi]; o[1] = -q[qi + 1]; o[2] = -q[qi + 2]; o[3] = q[qi + 3]; return o; };

const A1 = v3(), A2 = v3(), A3 = v3(), B1 = v3(), B2 = v3(), B3 = v3(), M9 = new Array(9);
// The turn that takes the frame made of (a, then b squared to it) onto the frame made the same way of (c, d).
function turnBetween(out, a, b, c, d) {
  norm(A1, a); norm(A3, cross(A3, A1, b)); cross(A2, A3, A1);
  norm(B1, c); norm(B3, cross(B3, B1, d)); cross(B2, B3, B1);
  for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) M9[col * 3 + row] = B1[row] * A1[col] + B2[row] * A2[col] + B3[row] * A3[col];
  const q = quatFromMat3(M9);
  out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = q[3];
  return out;
}

// Where a hand goes for each thing it does: at, from its own shoulder (his space, metres); f, the way the fingers point;
// t, the way the thumb's side of the fist points (up the staff, up the shield); pole, where the elbow keeps to; curl and
// thumb, how far the fingers and the thumb are shut (rad a joint). x is given for the left arm and mirrored for the right.
const HOLD = {
  hang: { at: [0.07, -0.47, 0.06], f: [0.06, -1, 0.1], t: [0, 0.1, 1], pole: [0.5, -0.2, -1], curl: 0.3, thumb: 0.15 },
  // The staff as a walking staff: fist at the chest, the head tipped a little ahead. run: the same, carried higher and lower-angled.
  staff: { at: [0.1, -0.33, 0.25], f: [-0.25, 0, 1], t: [-0.04, 0.96, 0.28], pole: [0.7, -0.5, -0.6], curl: 1.25, thumb: 0.55 },
  staffRun: { at: [0.12, -0.2, 0.2], f: [-0.25, 0, 1], t: [-0.13, 0.7, 0.7], pole: [0.8, -0.4, -0.6], curl: 1.25, thumb: 0.55 },
  // The skull: the hand over the crown, the skull hanging under it.
  skull: { at: [0.05, -0.36, 0.3], f: [-0.2, -0.22, 1], t: [-1, 0, -0.1], pole: [0.8, -0.5, -0.5], curl: 0.62, thumb: 0.5, spread: 0.2 },
  // The shield on the forearm: at ease by the side, face out; and on guard, across the chest, face ahead.
  shield: { at: [0.1, -0.37, 0.19], f: [0.05, -0.42, 1], t: [0.12, 1, 0.3], pole: [0.8, -0.3, -0.7], curl: 1.2, thumb: 0.5 },
  guard: { at: [-0.06, -0.14, 0.4], f: [-1, 0.05, 0.25], t: [0, 1, 0.12], pole: [0.6, -0.8, 0], curl: 1.2, thumb: 0.5 },
  // On the board: the front arm out over its nose and the back arm out over its tail, each nearly straight, the elbow
  // let down behind it, the hand flat and in the forearm's own line. (The elbow behind, not under: a flat hand is then
  // hardly turned on its forearm, and all of that turn is in the wrist's skin.) The staff's fist is out at arm's length,
  // level with the shoulder, so its foot is off the ground: the forearm rises to it and the staff stands square to the
  // forearm, its head leaned in a little. The skull's hand is out ahead of him, not down at the knee.
  rideFront: { at: [0.42, -0.08, 0.19], f: [0.7, -0.04, 0.71], t: [-0.71, 0.1, 0.7], pole: [0, -0.5, -1], curl: 0.3, thumb: 0.2, spread: 0.12 },
  rideBack: { at: [0.4, -0.15, -0.12], f: [0.97, -0.2, 0.22], t: [-0.22, 0.1, 0.97], pole: [0, -0.5, -1], curl: 0.35, thumb: 0.2, spread: 0.1 },
  rideStaff: { at: [0.26, -0.24, 0.19], f: [0.36, 0, 0.93], t: [-0.8, 0.5, 0.31], pole: [0.9, -0.8, -0.35], curl: 1.25, thumb: 0.55 },
  rideSkull: { at: [0.3, -0.22, 0.24], f: [0.26, -0.3, 0.9], t: [-0.96, 0, 0.28], pole: [0.8, -0.3, -0.6], curl: 0.62, thumb: 0.5, spread: 0.2 },
  air: { at: [0.26, -0.3, 0.12], f: [0.5, -0.8, 0.3], t: [0, 0.2, 1], pole: [0.6, -0.3, -0.8], curl: 0.4, thumb: 0.2 },
};
// The casts: for each arm, where the hand is drawn back to (wind) and where it is as the spell leaves (hit). `staff`
// is the hand with the staff in it, `open` an empty hand, `skull` the hand with the skull, `shield` the arm with the
// shield on it. lean and twist: how the chest goes with it (rad: back is negative; twist turns the casting shoulder back).
const fist = { curl: 1.25, thumb: 0.55 }, flat = { curl: 0.12, thumb: 0.1, spread: 0.25 }, claw = { curl: 0.62, thumb: 0.5, spread: 0.2 };
const CASTS = {
  // The staff's own shot: it dips, lifts straight up and inward, and tips forward as it fires.
  shot: {
    lean: [-0.04, 0.1], twist: [0.1, -0.12],
    R: { staff: { wind: { at: [-0.06, -0.08, 0.2], f: [-0.3, 0, 1], t: [-0.05, 1, -0.16], pole: [0.8, -0.6, -0.3], ...fist },
      hit: { at: [-0.08, -0.12, 0.42], f: [-0.3, -0.5, 0.8], t: [-0.06, 0.8, 0.6], pole: [0.8, -0.6, -0.2], ...fist } } },
  },
  // Thrown with one hand: drawn back by the ear, and thrown out along where you look.
  throw1: {
    lean: [-0.12, 0.2], twist: [0.42, -0.34],
    R: { staff: { wind: { at: [0.1, 0.12, -0.04], f: [-0.3, 0.3, 1], t: [0.1, 0.78, -0.62], pole: [1, -0.2, -0.3], ...fist },
      hit: { at: [-0.1, -0.03, 0.47], f: [-0.2, -0.75, 0.6], t: [-0.1, 0.5, 0.86], pole: [0.8, -0.6, 0], ...fist } },
    open: { wind: { at: [0.1, 0.1, -0.02], f: [0, 1, 0.2], t: [-1, 0, 0], pole: [1, -0.3, -0.3], curl: 0.9, thumb: 0.4 },
      hit: { at: [-0.1, 0, 0.48], f: [-0.1, 0.9, 0.45], t: [-1, 0, 0], pole: [0.8, -0.6, 0], ...flat } } },
  },
  // Pushed with both: gathered at the chest, and shoved out together.
  throw2: {
    lean: [-0.14, 0.24], twist: [0, 0],
    R: { staff: { wind: { at: [0.02, -0.14, 0.12], f: [-0.4, 0, 1], t: [0, 0.95, -0.3], pole: [1, -0.5, -0.2], ...fist },
      hit: { at: [-0.12, -0.08, 0.46], f: [-0.3, -0.6, 0.7], t: [-0.28, 0.58, 0.76], pole: [0.9, -0.5, 0], ...fist } },
    open: { wind: { at: [0, -0.14, 0.12], f: [0, 1, 0.2], t: [-1, 0, 0], pole: [1, -0.5, -0.2], curl: 0.8, thumb: 0.4 },
      hit: { at: [-0.12, -0.06, 0.47], f: [0, 0.92, 0.4], t: [-1, 0, 0], pole: [0.9, -0.5, 0], ...flat } } },
    L: { open: { wind: { at: [0, -0.14, 0.12], f: [0, 1, 0.2], t: [-1, 0, 0], pole: [1, -0.5, -0.2], curl: 0.8, thumb: 0.4 },
      hit: { at: [-0.12, -0.06, 0.47], f: [0, 0.92, 0.4], t: [-1, 0, 0], pole: [0.9, -0.5, 0], ...flat } },
    skull: { wind: { at: [0.02, -0.2, 0.16], f: [-0.2, -0.1, 1], t: [-1, 0, -0.1], pole: [1, -0.5, -0.2], ...claw },
      hit: { at: [-0.1, -0.1, 0.47], f: [-0.1, -0.12, 1], t: [-1, 0, 0], pole: [0.9, -0.5, 0], ...claw } },
    shield: { wind: { at: [-0.04, -0.2, 0.26], f: [-1, 0.05, 0.25], t: [0, 1, 0], pole: [0.6, -0.8, 0], ...fist },
      hit: { at: [-0.1, -0.1, 0.45], f: [-1, 0.05, 0.2], t: [0, 1, 0.1], pole: [0.6, -0.8, 0], ...fist } } },
  },
  // Raised with one hand: a dip, and the staff straight up.
  raise1: {
    lean: [0.08, -0.1], twist: [0.06, 0.1],
    R: { staff: { wind: { at: [0.08, -0.34, 0.24], f: [-0.25, 0, 1], t: [-0.1, 0.8, 0.6], pole: [0.8, -0.4, -0.6], ...fist },
      hit: { at: [0.04, 0.3, 0.2], f: [-0.2, 0.1, 1], t: [0, 1, -0.05], pole: [1, -0.4, -0.3], ...fist } },
    open: { wind: { at: [0.08, -0.44, 0.2], f: [0, -0.3, 1], t: [-1, 0, 0], pole: [0.8, -0.4, -0.6], curl: 0.6, thumb: 0.3 },
      hit: { at: [0.06, 0.32, 0.18], f: [0, 0.6, 0.8], t: [1, 0, 0], pole: [1, -0.4, -0.3], ...flat } } },
  },
  // Raised with both: both hands down, and up over the head together.
  raise2: {
    lean: [0.1, -0.16], twist: [0, 0],
    R: { staff: { wind: { at: [0.08, -0.34, 0.24], f: [-0.25, 0, 1], t: [-0.1, 0.8, 0.6], pole: [0.8, -0.4, -0.6], ...fist },
      hit: { at: [0.06, 0.32, 0.18], f: [-0.2, 0.1, 1], t: [0.08, 1, -0.08], pole: [1, -0.4, -0.3], ...fist } },
    open: { wind: { at: [0.08, -0.44, 0.2], f: [0, -0.3, 1], t: [-1, 0, 0], pole: [0.8, -0.4, -0.6], curl: 0.6, thumb: 0.3 },
      hit: { at: [0.08, 0.33, 0.16], f: [0, 0.6, 0.8], t: [1, 0, 0], pole: [1, -0.4, -0.3], ...flat } } },
    L: { open: { wind: { at: [0.08, -0.44, 0.2], f: [0, -0.3, 1], t: [-1, 0, 0], pole: [0.8, -0.4, -0.6], curl: 0.6, thumb: 0.3 },
      hit: { at: [0.08, 0.33, 0.16], f: [0, 0.6, 0.8], t: [1, 0, 0], pole: [1, -0.4, -0.3], ...flat } },
    skull: { wind: { at: [0.06, -0.42, 0.24], f: [-0.2, -0.22, 1], t: [-1, 0, -0.1], pole: [0.8, -0.5, -0.5], ...claw },
      hit: { at: [0.06, 0.34, 0.22], f: [-0.1, 0.1, 1], t: [-1, 0, 0], pole: [1, -0.4, -0.3], ...claw } },
    shield: { wind: { at: [0.1, -0.4, 0.2], f: [0.05, -0.42, 1], t: [0.12, 1, 0.3], pole: [0.8, -0.3, -0.7], ...fist },
      hit: { at: [0.02, 0.26, 0.26], f: [-1, 0.3, 0.2], t: [0, 0.8, -0.5], pole: [1, -0.5, -0.2], ...fist } } },
  },
};

const SIDES = ['L', 'R'], AIMS = ['at', 'f', 't', 'pole'];
const FINGERS = ['Index', 'Mid', 'Ring', 'Pinky'];

export class PlayerBody {
  constructor(buffer) {
    const rig = this.rig = new ArmsRig(buffer);
    const J = (n) => { const j = rig.index.get(n); if (j === undefined) throw new Error(`player body: no joint ${n}`); return j; };
    const n = rig.count;
    this.count = n;
    rig.rootQ = new Float32Array(4); rig.rootT = new Float32Array(3);
    // The bind pose in his own space, and where each joint's branch ends (joints come parent first, a branch together).
    this.gq = new Float32Array(n * 4); this.gp = new Float32Array(n * 3);
    this.bq = new Float32Array(n * 4); this.bp = new Float32Array(n * 3);
    this.end = new Int32Array(n);
    for (let j = n - 1; j >= 0; j--) { this.end[j] = Math.max(this.end[j], j); const p = rig.parent[j]; if (p >= 0) this.end[p] = Math.max(this.end[p], this.end[j]); }
    this.fk(rig.restR, rig.restT, 0, n - 1);
    this.bq.set(this.gq); this.bp.set(this.gp);
    this.j = {
      root: J('BoneRoot'), hip: J('Hip'), waist: J('Waist'), spine1: J('Spine01'), spine2: J('Spine02'), neck: J('NeckTwist01'), head: J('Head'),
    };
    const bind = (j) => [this.bp[j * 3], this.bp[j * 3 + 1], this.bp[j * 3 + 2]];
    const local = (j, world) => { const q = conj([0, 0, 0, 0], this.bq, j * 4), o = v3(); quatRotate(o, 0, q, 0, world, 0); return o; };
    this.arms = {}; this.legs = {};
    for (const s of SIDES) {
      const sign = s === 'L' ? 1 : -1;
      const up = J(`${s}_Upperarm`), lo = J(`${s}_Forearm`), hand = J(`${s}_Hand`);
      const f = [sign, 0, 0], nrm = [0, -1, 0], t = [0, 0, 1];           // in the bind: fingers out along the arm, palm down, thumb ahead
      const digits = [];
      for (const name of [...FINGERS, 'Thumb']) {
        for (let k = 1; k <= 3; k++) {
          const j = J(`${s}_${name}${k}`), next = k < 3 ? J(`${s}_${name}${k + 1}`) : -1;
          // Which way this joint's bone runs in the bind, and so the axis it shuts about (toward the palm).
          const dir = next >= 0 ? norm(sub(v3(), bind(next), bind(j))) : norm(sub(v3(), bind(j), bind(rig.parent[j])));
          const axis = norm(cross(v3(), dir, nrm));
          // (Spreading the fingers: about the palm's own line.)
          digits.push({ j, thumb: name === 'Thumb', k, axis: local(j, axis), fan: local(j, nrm), spread: (FINGERS.indexOf(name) - 1.5) * (name === 'Thumb' ? 0 : 1) * -sign });
        }
      }
      this.arms[s] = {
        s, sign, up, lo, hand, clav: J(`${s}_Clavicle`), digits,
        l1: Math.hypot(...sub(v3(), bind(lo), bind(up))), l2: Math.hypot(...sub(v3(), bind(hand), bind(lo))),
        dirU: norm(sub(v3(), bind(lo), bind(up))), dirL: norm(sub(v3(), bind(hand), bind(lo))),
        hinge: [0, -sign, 0],                                              // the elbow bends the forearm forward
        f, t, n: nrm, fL: local(hand, f), tL: local(hand, t), nL: local(hand, nrm),
        // What the hand is doing, eased from one thing to the next.
        now: null, w: 0, pose: { at: v3(), f: v3(), t: v3(), pole: v3(), curl: 0, thumb: 0, spread: 0 }, keep: [up, lo, hand],
      };
      const th = J(`${s}_Thigh`), calf = J(`${s}_Calf`), foot = J(`${s}_Foot`), toe = J(`${s}_ToeBase`);
      this.legs[s] = {
        s, sign, up: th, lo: calf, foot, toe,
        l1: Math.hypot(...sub(v3(), bind(calf), bind(th))), l2: Math.hypot(...sub(v3(), bind(foot), bind(calf))),
        dirU: norm(sub(v3(), bind(calf), bind(th))), dirL: norm(sub(v3(), bind(foot), bind(calf))),
        hinge: [1, 0, 0],                                                  // the knee bends the shin back
      };
    }
    // Standing: the bind pose with the arms let down. Made once, by the same solve that holds things.
    this.idleR = new Float32Array(rig.restR); this.idleT = new Float32Array(rig.restT);
    this.curT = this.idleT;
    this.fk(this.idleR, this.idleT, 0, n - 1);
    for (const s of SIDES) { this.reach(this.idleR, this.arms[s], this.side(HOLD.hang, this.arms[s].sign, {})); this.shut(this.idleR, this.arms[s], 0.3, 0.15, 0); }
    // The walk and the run in step: where in each loop the left foot passes the right going forward.
    const walk = rig.clips.walk, run = rig.clips.run;
    walk.loop = run.loop = true;
    this.walkAt = this.stepAt(walk); this.runAt = this.stepAt(run);
    this.walkTravel = rig.extras.clips?.walk?.travel || 2.67; this.runTravel = rig.extras.clips?.run?.travel || 5.22;
    this.aR = new Float32Array(n * 4); this.aT = new Float32Array(n * 3);
    this.bR = new Float32Array(n * 4); this.bT = new Float32Array(n * 3);
    this.baseR = new Float32Array(n * 4);
    this.props = new Float32Array(48);
    this.head = v3(); this.palmL = v3(); this.palmR = v3(); this.staffTip = v3();
    rig.poseModifier = (rot, tr) => this.build(rot, tr);
    this.reset();
  }

  reset() {
    Object.assign(this, { phase: 0, wMove: 0, wRun: 0, wAir: 0, wRide: 0, wFly: 0, wDead: 0, twist: 0, backing: false, breath: Math.random() * 9, lean: 0, roll: 0, pitch: 0, guard: 0, time: 0, castW: 0, castA: 0, castB: 0, castKind: null, castHands: 1, airT: 0 });
    this.s = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, onGround: true };
    this.yaw = 0; this.boardYaw = undefined; this.twistTo = 0; this.castShake = 0;
    for (const s of SIDES) { this.arms[s].now = null; this.arms[s].w = 0; }
  }

  // Joints from..to (a branch, or all of them) stood in his space from their local turns and places.
  fk(rot, tr, from, to) {
    const { gq, gp } = this, parent = this.rig.parent;
    for (let j = from; j <= to; j++) {
      const p = parent[j];
      if (p < 0) { gq[j * 4] = rot[j * 4]; gq[j * 4 + 1] = rot[j * 4 + 1]; gq[j * 4 + 2] = rot[j * 4 + 2]; gq[j * 4 + 3] = rot[j * 4 + 3]; gp[j * 3] = tr[j * 3]; gp[j * 3 + 1] = tr[j * 3 + 1]; gp[j * 3 + 2] = tr[j * 3 + 2]; continue; }
      quatRotate(gp, j * 3, gq, p * 4, tr, j * 3);
      gp[j * 3] += gp[p * 3]; gp[j * 3 + 1] += gp[p * 3 + 1]; gp[j * 3 + 2] += gp[p * 3 + 2];
      quatMul(gq, j * 4, gq, p * 4, rot, j * 4);
    }
  }

  // Where in a loop the left foot passes the right, going forward (a part of the loop).
  stepAt(clip) {
    const rig = this.rig, N = 48, L = this.legs.L.foot, R = this.legs.R.foot, rot = new Float32Array(rig.count * 4), tr = new Float32Array(rig.count * 3), d = [];
    for (let i = 0; i < N; i++) { rig.sampleInto(clip, clip.dur * i / N, rot, tr); this.fk(rot, tr, 0, rig.count - 1); d.push(this.gp[L * 3 + 2] - this.gp[R * 3 + 2]); }
    for (let i = 0; i < N; i++) { const a = d[i], b = d[(i + 1) % N]; if (a <= 0 && b > 0) return (i + a / (a - b)) / N; }
    return 0;
  }

  // Joint j turned to stand as `world` (a turn in his space) says, and its branch stood again.
  stand(rot, j, world) {
    const p = this.rig.parent[j], q = Q1;
    conj(q, this.gq, p * 4);
    quatMul(rot, j * 4, q, 0, world, 0);
    quatNormalize(rot, j * 4);
    this.fk(rot, this.curT, j, this.end[j]);
  }

  // Joint j turned by `turn` (in his space) from where it stands now.
  turn(rot, j, turn) {
    quatMul(Q2, 0, turn, 0, this.gq, j * 4);
    this.stand(rot, j, Q2);
  }

  // A hold as one side has it: x mirrored for the right arm.
  side(h, sign, out) {
    for (const k of AIMS) { const o = out[k] || (out[k] = v3()), a = h[k]; o[0] = a[0] * sign; o[1] = a[1]; o[2] = a[2]; }
    out.curl = h.curl ?? 0.3; out.thumb = h.thumb ?? 0.2; out.spread = h.spread ?? 0;
    return out;
  }

  // A limb's upper and lower bone turned so its end is at `to` (his space), the joint between them kept toward `pole`.
  limb(rot, L, to, pole) {
    const { gp, bq } = this, S = P1, E = P2, d = P3, perp = P4, hinge = P5, u = P6, l = P7;
    set(S, gp[L.up * 3], gp[L.up * 3 + 1], gp[L.up * 3 + 2]);
    sub(d, to, S);
    const reach = L.l1 + L.l2, dist = clamp(Math.hypot(d[0], d[1], d[2]), Math.abs(L.l1 - L.l2) + 0.02, reach * 0.999);
    norm(d);
    const a = (L.l1 * L.l1 - L.l2 * L.l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, L.l1 * L.l1 - a * a));
    add(perp, pole, d, -dot(pole, d));
    if (Math.hypot(perp[0], perp[1], perp[2]) < 1e-4) set(perp, 0, -1, 0.01);
    norm(perp);
    set(E, S[0] + d[0] * a + perp[0] * h, S[1] + d[1] * a + perp[1] * h, S[2] + d[2] * a + perp[2] * h);
    norm(sub(u, E, S));
    set(l, S[0] + d[0] * dist - E[0], S[1] + d[1] * dist - E[1], S[2] + d[2] * dist - E[2]); norm(l);
    cross(hinge, u, l);
    if (Math.hypot(hinge[0], hinge[1], hinge[2]) < 1e-3) cross(hinge, perp, d);
    norm(hinge);
    turnBetween(Q3, L.dirU, L.hinge, u, hinge);
    quatMul(Q4, 0, Q3, 0, bq, L.up * 4);
    this.stand(rot, L.up, Q4);
    turnBetween(Q3, L.dirL, L.hinge, l, hinge);
    quatMul(Q4, 0, Q3, 0, bq, L.lo * 4);
    this.stand(rot, L.lo, Q4);
  }

  // An arm put where a hold says: the hand's place from its shoulder, and the way the hand is turned.
  reach(rot, A, h) {
    const { gp, bq } = this, to = P8, f = P10, t = P11;
    set(to, gp[A.up * 3] + h.at[0], gp[A.up * 3 + 1] + h.at[1], gp[A.up * 3 + 2] + h.at[2]);
    this.limb(rot, A, to, h.pole);
    // The hand: the thumb's side along t (up whatever it holds), the fingers along f as near as that allows.
    norm(t, h.t); norm(f, h.f);
    turnBetween(Q3, A.t, A.f, t, f);
    quatMul(Q4, 0, Q3, 0, bq, A.hand * 4);
    this.stand(rot, A.hand, Q4);
  }

  // The fingers shut by curl (rad a joint), the thumb by its own, the fingers fanned by spread.
  shut(rot, A, curl, thumb, spread) {
    const rest = this.rig.restR;
    for (const d of A.digits) {
      const a = d.thumb ? thumb * (d.k === 1 ? 0.6 : 1) : curl * (d.k === 1 ? 0.95 : d.k === 2 ? 1.05 : 0.8);
      quatAxisAngle(Q1, 0, d.axis[0], d.axis[1], d.axis[2], a);
      quatMul(rot, d.j * 4, rest, d.j * 4, Q1, 0);
      if (spread && d.k === 1 && !d.thumb) { quatAxisAngle(Q1, 0, d.fan[0], d.fan[1], d.fan[2], spread * d.spread); quatMul(rot, d.j * 4, rot, d.j * 4, Q1, 0); }
    }
    this.fk(rot, this.curT, A.hand, this.end[A.hand]);
  }

  // One tick. s: where he is and what he's doing (see Sim.playerPose in src/sim/sim.worker.js for where it comes from):
  //   x, y, z, yaw, pitch, vx, vz, onGround, sprinting, dodge (0..1 through a sidestep), dead, deadT,
  //   staff, skull, shield (what he has), guard (0..1, the shield raised),
  //   surf: null, or { hx, hz (the way the board's going), nx, ny, nz (the ground under it), tilt (the carve), air },
  //   cast: null, or { kind: 'shot' | 'throw' | 'raise', hands, wind (0..1 drawn back), hit (0..1 let go), w (0..1 how much of
  //   the arm is the cast's), shake }.
  update(dt, s) {
    this.s = s;
    this.time += dt;
    const sn = Math.sin(s.yaw), cs = Math.cos(s.yaw);
    const fwd = s.vx * sn + s.vz * cs, left = s.vx * cs - s.vz * sn, speed = Math.hypot(s.vx, s.vz);
    // (Off the ground for a moment is a step down a slope, not a jump: the stride carries on through it.)
    this.airT = s.onGround ? 0 : this.airT + dt;
    const grounded = this.airT < 0.12;
    const riding = !!s.surf, moving = !riding && !s.dead && grounded && speed > 0.3;
    this.wRide = damp(this.wRide, riding ? 1 : 0, 14, dt);
    this.wFly = damp(this.wFly, riding && s.surf.air ? 1 : 0, 8, dt);
    this.wDead = damp(this.wDead, s.dead ? 1 : 0, 10, dt);
    this.wAir = damp(this.wAir, !grounded && !riding && !s.dead ? 1 : 0, grounded ? 16 : 9, dt);
    this.wMove = damp(this.wMove, moving || (!grounded && speed > 1) ? 1 : 0, 11, dt);
    this.wRun = damp(this.wRun, smoothstep(1.7, 3.8, speed) * (this.backing ? 0.45 : 1), 8, dt);
    // The way the legs face: where he's going, or its opposite if that's behind him (then the stride runs backwards).
    if (speed > 0.3) {
      const way = Math.atan2(left, fwd);
      // (Held a little past square, so a sideways step doesn't flick between the two.)
      this.backing = Math.abs(way) > (this.backing ? 1.75 : 2.05);
      this.twistTo = clamp(this.backing ? wrapAngle(way - Math.PI) : way, -HIP_TURN, HIP_TURN);
    } else this.twistTo = 0;
    this.twist = damp(this.twist, moving ? this.twistTo : 0, 10, dt);
    // The stride, by the ground covered: the clips' own length of step, the legs quickened only so far past their own pace.
    const travel = lerp(this.walkTravel, this.runTravel, this.wRun), own = travel / lerp(this.rig.clips.walk.dur, this.rig.clips.run.dur, this.wRun);
    const over = speed / own, rate = (over > QUICKEN ? QUICKEN + (over - QUICKEN) * QUICKEN_PAST : over) * own / travel;
    if (grounded && !riding) this.phase = (this.phase + (this.backing ? -1 : 1) * rate * dt + 1) % 1;
    this.breath += dt;
    this.lean = damp(this.lean, s.sprinting ? 0.13 : 0, 6, dt);
    this.roll = damp(this.roll, (s.dodge > 0 ? clamp(left, -1, 1) * 0.3 : clamp(left / 6, -1, 1) * 0.05), 12, dt);
    this.pitch = damp(this.pitch, clamp(s.pitch, -1, 1), 14, dt);
    this.guard = s.guard || 0;
    const c = s.cast;
    this.castW = damp(this.castW, c ? c.w : 0, c ? 30 : 9, dt);
    if (c) { this.castKind = c.kind + (c.kind === 'shot' ? '' : c.hands === 2 ? '2' : '1'); this.castA = c.wind; this.castB = c.hit; this.castShake = c.shake || 0; }
    else this.castShake = 0;
    for (const side of SIDES) this.steer(this.arms[side], dt);
    // On the board he stands side on to the way it's going, whichever way you look.
    if (s.surf) {
      const want = Math.atan2(s.surf.hx, s.surf.hz) + SURF.side;
      this.boardYaw = this.boardYaw === undefined ? want : this.boardYaw + wrapAngle(want - this.boardYaw) * (1 - Math.exp(-12 * dt));
    } else if (this.wRide < 0.02) this.boardYaw = undefined;
    this.yaw = this.boardYaw === undefined ? s.yaw : s.yaw + wrapAngle(this.boardYaw - s.yaw) * ease(this.wRide);
  }

  // What each hand is doing now, eased from what it was doing.
  steer(A, dt) {
    const s = this.s, right = A.s === 'R', riding = !!s.surf;
    let hold = null;
    // (Put away, the hands are empty: they swing as the clip has them, or go out for balance on the board.)
    const away = (s.stow || 0) > 0.5;
    if (right) hold = riding ? (s.staff && !away ? HOLD.rideStaff : HOLD.rideBack) : s.staff && !away ? HOLD.staff : null;
    else hold = riding ? (s.skull && !away ? HOLD.rideSkull : HOLD.rideFront) : away ? null : s.skull ? HOLD.skull : s.shield ? HOLD.shield : null;
    if (!hold && this.wAir > 0.5 && !riding) hold = HOLD.air;
    const to = T1;
    if (hold) {
      this.side(hold, A.sign, to);
      if (right && hold === HOLD.staff) {
        // On the move the staff is carried, not planted: a little higher and further over, and it rides the stride.
        const r = this.side(HOLD.staffRun, A.sign, T2), k = this.wMove * (0.35 + 0.65 * this.wRun);
        this.blendHold(to, to, r, k);
        const bob = Math.sin((this.phase * 2 + 0.1) * TAU) * 0.018 * this.wMove;
        to.at[1] += bob; to.at[2] += Math.cos(this.phase * TAU) * 0.03 * this.wMove * this.wRun;
      }
      if (riding && hold === HOLD.rideStaff) this.staffAlong(A, to);
      if (riding) {
        const k = hold === HOLD.rideFront || hold === HOLD.rideBack ? 1 : RIDE_ARMS.held, lean = clamp(s.surf.tilt || 0, -1, 1);
        to.at[2] += lean * (right ? -1 : 1) * RIDE_ARMS.swing * k;
        to.at[1] += (Math.abs(lean) * (right ? RIDE_ARMS.rise : -RIDE_ARMS.dip) + this.wFly * RIDE_ARMS.air) * k;
      }
      if (!right && hold === HOLD.shield && this.guard > 0) this.blendHold(to, to, this.side(HOLD.guard, A.sign, T2), ease(this.guard));
    }
    // The hold eases in over the clip's own swing (an empty hand's weight is none).
    A.w = damp(A.w, hold ? 1 : 0, 9, dt);
    if (hold) {
      if (!A.now) { A.now = true; this.copyHold(A.pose, to); }
      else this.blendHold(A.pose, A.pose, to, 1 - Math.exp(-14 * dt));
    } else if (A.w < 0.02) A.now = null;
  }

  // The staff on the board: carried low, its head up the way the board's going and its foot trailed behind, on the board's
  // own lie (so its foot is as far off a hillside as off the flat). The fist is lifted or let down by the ground under it.
  staffAlong(A, to) {
    const b = this.s.surf, gp = this.gp, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
    const n = set(P9, b.nx * cs - b.nz * sn, b.ny, b.nx * sn + b.nz * cs), h = set(P10, b.hx * cs - b.hz * sn, 0, b.hx * sn + b.hz * cs);
    add(h, h, n, -dot(h, n)); norm(h);
    const c = Math.cos(RIDE_ARMS.staffRise), r = Math.sin(RIDE_ARMS.staffRise);
    set(to.t, h[0] * c + n[0] * r, h[1] * c + n[1] * r, h[2] * c + n[2] * r);
    const x = gp[A.up * 3] + to.at[0], z = gp[A.up * 3 + 2] + to.at[2];
    to.at[1] += clamp(-(n[0] * x + n[2] * z) / (n[1] || 1), -RIDE_ARMS.staffGive, RIDE_ARMS.staffGive);
  }

  copyHold(o, a) { set(o.at, ...a.at); set(o.f, ...a.f); set(o.t, ...a.t); set(o.pole, ...a.pole); o.curl = a.curl; o.thumb = a.thumb; o.spread = a.spread; return o; }

  blendHold(o, a, b, k) {
    mix(o.at, a.at, b.at, k); mix(o.f, a.f, b.f, k); mix(o.t, a.t, b.t, k); mix(o.pole, a.pole, b.pole, k);
    o.curl = lerp(a.curl, b.curl, k); o.thumb = lerp(a.thumb, b.thumb, k); o.spread = lerp(a.spread, b.spread, k);
    return o;
  }

  // The cast's pose for one arm, if this cast uses it.
  castHold(A, out) {
    const cast = CASTS[this.castKind], s = this.s;
    const arm = cast?.[A.s];
    if (!arm) return null;
    const has = A.s === 'R' ? (s.staff ? 'staff' : 'open') : s.skull ? 'skull' : s.shield && !s.surf ? 'shield' : 'open';
    const set_ = arm[has] || arm.open || arm.staff;
    if (!set_) return null;
    const w = this.side(set_.wind, A.sign, T3), h = this.side(set_.hit, A.sign, T4);
    // (Out through the hit quickly, and a little past it.)
    this.blendHold(out, w, h, ease(this.castB));
    if (this.castShake) { const t = this.time * 31; out.at[0] += Math.sin(t) * 0.004 * this.castShake; out.at[1] += Math.sin(t * 1.3 + 1) * 0.004 * this.castShake; }
    return out;
  }

  // The pose, written into the rig's local turns: called by the rig's solve, which then stands it in the world.
  build(rot, tr) {
    const rig = this.rig, s = this.s, n = this.count, j = this.j;
    this.curT = tr;
    // ---- the legs and the body under the arms ----
    rot.set(this.idleR); tr.set(this.idleT);
    if (this.wMove > 0.001 || this.wAir > 0.001) {
      const walk = rig.clips.walk, run = rig.clips.run, { aR, aT, bR, bT } = this;
      const air = this.wAir, ph = this.phase;
      rig.sampleInto(run, ((ph + this.runAt) % 1) * run.dur, bR, bT);
      if (this.wRun < 0.999) {
        rig.sampleInto(walk, ((ph + this.walkAt) % 1) * walk.dur, aR, aT);
        for (let k = 0; k < n; k++) quatNlerp(aR, k * 4, aR, k * 4, bR, k * 4, this.wRun);
        for (let k = 0; k < n * 3; k++) aT[k] += (bT[k] - aT[k]) * this.wRun;
      } else { aR.set(bR); aT.set(bT); }
      if (air > 0.001) {
        // A jump: the run's flight, held.
        rig.sampleInto(run, ((AIR_PHASE + this.runAt) % 1) * run.dur, bR, bT);
        for (let k = 0; k < n; k++) quatNlerp(aR, k * 4, aR, k * 4, bR, k * 4, air);
        for (let k = 0; k < n * 3; k++) aT[k] += (bT[k] - aT[k]) * air;
      }
      const w = Math.max(this.wMove, air);
      for (let k = 0; k < n; k++) quatNlerp(rot, k * 4, rot, k * 4, aR, k * 4, w);
      for (let k = 0; k < n * 3; k++) tr[k] += (aT[k] - tr[k]) * w;
    }
    if (this.wDead > 0.001) {
      const death = rig.clips.death, { aR, aT } = this;
      rig.sampleInto(death, Math.min(s.deadT || 0, death.dur), aR, aT);
      for (let k = 0; k < n; k++) quatNlerp(rot, k * 4, rot, k * 4, aR, k * 4, this.wDead);
      for (let k = 0; k < n * 3; k++) tr[k] += (aT[k] - tr[k]) * this.wDead;
    }
    const alive = 1 - this.wDead;
    this.baseR.set(rot);
    this.fk(rot, tr, 0, n - 1);
    // ---- the hips turned the way he's going, and the lean of a sprint or a sidestep ----
    const ride = this.wRide;
    if (ride > 0.001) this.ride(rot, tr, ride);
    if (Math.abs(this.twist) > 1e-3 && alive > 0.01) {
      const a = this.twist * alive * (1 - ride);
      quatAxisAngle(Q5, 0, 0, 1, 0, a);
      // (About his own middle: the root joint stands behind it.)
      const c = Math.cos(a), sn = Math.sin(a), x = tr[j.root * 3], z = tr[j.root * 3 + 2];
      tr[j.root * 3] = x * c + z * sn; tr[j.root * 3 + 2] = -x * sn + z * c;
      quatMul(rot, j.root * 4, Q5, 0, rot, j.root * 4);
      this.fk(rot, tr, 0, n - 1);
      // And the chest back to where you look, a third at each joint of the spine.
      quatAxisAngle(Q5, 0, 0, 1, 0, -a / 3);
      this.turn(rot, j.waist, Q5); this.turn(rot, j.spine1, Q5); this.turn(rot, j.spine2, Q5);
    }
    // ---- the chest: breath, the lean, the cast's wind-up and throw, and the head to where you look ----
    const cast = CASTS[this.castKind], cw = this.castW * alive;
    const breath = Math.sin(this.breath * 1.5) * 0.012 * (1 - this.wMove) * alive;
    let bend = this.lean * this.wMove * (1 - ride) + breath, turn = 0;
    if (cast && cw > 0.001) {
      const b = ease(this.castB);
      bend += lerp(cast.lean[0] * this.castA, cast.lean[1], b) * cw;
      turn += lerp(cast.twist[0] * this.castA, cast.twist[1], b) * cw;
    }
    if (Math.abs(bend) > 1e-4 || Math.abs(this.roll) > 1e-3) {
      quatAxisAngle(Q5, 0, 1, 0, 0, bend * 0.5);
      this.turn(rot, j.spine1, Q5); this.turn(rot, j.spine2, Q5);
      if (Math.abs(this.roll) > 1e-3) { quatAxisAngle(Q5, 0, 0, 0, 1, -this.roll * alive * (1 - ride)); this.turn(rot, j.waist, Q5); }
    }
    if (Math.abs(turn) > 1e-4) {
      // (The casting shoulder is the right: back is a turn to his right.)
      quatAxisAngle(Q5, 0, 0, 1, 0, -turn * 0.5);
      this.turn(rot, j.spine1, Q5); this.turn(rot, j.spine2, Q5);
    }
    if (alive > 0.01) {
      // Looking up or down, a part of it in the neck and the rest in the head; turned back from the chest's own turn.
      const look = -this.pitch * 0.32 * alive, back = turn * 0.6;
      quatAxisAngle(Q5, 0, 1, 0, 0, look); this.turn(rot, j.neck, Q5);
      quatAxisAngle(Q5, 0, 1, 0, 0, look * 0.8); this.turn(rot, j.head, Q5);
      if (Math.abs(back) > 1e-4) { quatAxisAngle(Q5, 0, 0, 1, 0, back); this.turn(rot, j.head, Q5); }
    }
    // ---- the arms ----
    for (const side of SIDES) {
      const A = this.arms[side];
      let w = A.w * alive, h = A.pose;
      const c = cw > 0.001 ? this.castHold(A, T5) : null;
      if (c) {
        // The cast over whatever the hand was doing (or over the clip's swing, for an empty one).
        if (A.now) h = this.blendHold(T6, A.pose, c, cw); else h = c;
        w = Math.max(w, cw);
      }
      if (w < 0.002 || !h) continue;
      // The clip's own arm, kept to blend with.
      const keep = A.keep;
      for (let k = 0; k < 3; k++) { const q = keep[k] * 4; KEEP[k * 4] = rot[q]; KEEP[k * 4 + 1] = rot[q + 1]; KEEP[k * 4 + 2] = rot[q + 2]; KEEP[k * 4 + 3] = rot[q + 3]; }
      this.reach(rot, A, h);
      this.shut(rot, A, h.curl, h.thumb, h.spread);
      if (w < 0.998) {
        for (let k = 0; k < 3; k++) quatNlerp(rot, keep[k] * 4, KEEP, k * 4, rot, keep[k] * 4, w);
        for (const d of A.digits) quatNlerp(rot, d.j * 4, this.baseR, d.j * 4, rot, d.j * 4, w);
        this.fk(rot, tr, A.up, this.end[A.up]);
      }
    }
  }

  // The shield ride: side on, feet on the board, knees bent. k: how far into it (0..1).
  ride(rot, tr, k) {
    const s = this.s, j = this.j, surf = s.surf || this.lastSurf;
    if (!surf) return;
    this.lastSurf = surf;
    // The board's heading and the ground's lie, in his own space (he's stood side on to it: see write).
    const yaw = this.yaw, sn = Math.sin(yaw), cs = Math.cos(yaw);
    const toOwn = (o, x, y, z) => set(o, x * cs - z * sn, y, x * sn + z * cs);
    const h = toOwn(P12, surf.hx, 0, surf.hz), up = toOwn(P13, surf.nx, surf.ny, surf.nz);
    // (Along the board, on its own plane.)
    add(h, h, up, -dot(h, up)); norm(h);
    const across = cross(P14, up, h);
    const crouch = SURF.crouch * k, tilt = (surf.tilt || 0) * 0.35;
    // Down into the knees, the weight over the middle of the board, leaned into the carve.
    tr[j.root * 3 + 1] -= crouch;
    tr[j.root * 3] += (h[0] * 0.02 - across[0] * tilt * 0.25) * k; tr[j.root * 3 + 2] += (h[2] * 0.02 - across[2] * tilt * 0.25) * k;
    this.fk(rot, tr, 0, this.count - 1);
    quatAxisAngle(Q5, 0, h[0], h[1], h[2], tilt * k); this.turn(rot, j.hip, Q5);
    quatAxisAngle(Q5, 0, 1, 0, 0, 0.2 * k); this.turn(rot, j.spine1, Q5);
    // The head and the chest part of the way round to look down the hill.
    const look = Math.atan2(h[0], h[2]) * k;
    quatAxisAngle(Q5, 0, 0, 1, 0, look * 0.16); this.turn(rot, j.spine1, Q5); this.turn(rot, j.spine2, Q5);
    quatAxisAngle(Q5, 0, 0, 1, 0, look * 0.3); this.turn(rot, j.neck, Q5); this.turn(rot, j.head, Q5);
    // The feet: the left ahead on the board, the right behind, toes across it.
    for (const side of SIDES) {
      const L = this.legs[side], front = side === 'L', along = front ? SURF.front : -SURF.back;
      const to = set(P15, h[0] * along, 0, h[2] * along);
      // (The board's top under that foot, on the ground's lie, and the ankle above it.)
      to[1] = SURF.lift + SURF.ankle - (up[0] * to[0] + up[2] * to[2]) / (up[1] || 1);
      const was = [this.gp[L.foot * 3], this.gp[L.foot * 3 + 1], this.gp[L.foot * 3 + 2]];
      mix(to, was, to, k);
      const toe = norm(P16, [across[0] * -1 + h[0] * (front ? 0.45 : 0.1), 0, across[2] * -1 + h[2] * (front ? 0.45 : 0.1)]);
      const pole = add(P17, toe, h, front ? 0.5 : -0.5); pole[1] = 0.1;
      this.limb(rot, L, to, pole);
      add(toe, toe, up, -dot(toe, up)); norm(toe);
      turnBetween(Q3, [0, 0, 1], [0, 1, 0], toe, up);
      quatMul(Q4, 0, Q3, 0, this.bq, L.foot * 4);
      quatNlerp(Q4, 0, this.gq, L.foot * 4, Q4, 0, k);
      this.stand(rot, L.foot, Q4);
    }
  }

  // The body into its slot of the snapshot: where it is, its palette, and what's in its hands and on its back.
  write(snap, off, shown) {
    const rig = this.rig, s = this.s;
    snap[off + C.ACTIVE] = shown ? 1 : 0;
    snap[off + C.KIND] = 0;
    snap[off + C.X] = s.x; snap[off + C.Y] = s.y; snap[off + C.Z] = s.z; snap[off + C.YAW] = s.yaw;
    snap[off + C.HP] = 1; snap[off + C.MAX_HP] = 1;
    if (!shown) return;
    quatYaw(rig.rootQ, 0, this.yaw);
    rig.rootT[0] = s.x; rig.rootT[1] = s.y; rig.rootT[2] = s.z;
    rig.solve(rig.clips.walk, 0, 1, snap, off + C_PALETTE);
    this.hold(snap, off + C_PROPS);
  }

  // A hand's own frame in the world: the middle of the palm, and the ways the fingers, the thumb's side and the palm face.
  grip(A, at, f, t, n) {
    const { wq, wt } = this.rig, h = A.hand;
    quatRotate(f, 0, wq, h * 4, A.fL, 0); quatRotate(t, 0, wq, h * 4, A.tL, 0); quatRotate(n, 0, wq, h * 4, A.nL, 0);
    set(at, wt[h * 3] + f[0] * PALM[0] + n[0] * PALM[1], wt[h * 3 + 1] + f[1] * PALM[0] + n[1] * PALM[1], wt[h * 3 + 2] + f[2] * PALM[0] + n[2] * PALM[1]);
  }

  // A place on him (off: in his own space, from the joint j, turned as q has that part of him turned from the bind).
  slung(out, q, j, off) {
    const wt = this.rig.wt;
    quatRotate(out, 0, q, 0, off, 0);
    out[0] += wt[j * 3]; out[1] += wt[j * 3 + 1]; out[2] += wt[j * 3 + 2];
    return out;
  }

  // The shield's frame slung on his back (x, t, z, at): its face out behind, leaned over so the point is down toward one
  // hip. With the staff put away under it (sw), a little further out.
  onBack(x, t, z, at, sw) {
    const c = Math.cos(BACK_LEAN), sn = Math.sin(BACK_LEAN), ct = Math.cos(BACK_TIP), st = Math.sin(BACK_TIP);
    // (In his space: z out of its back is ahead, tipped so the top leans in to the shoulders; y leaned over.)
    quatRotate(z, 0, Q2, 0, [0, st, ct], 0);
    quatRotate(t, 0, Q2, 0, [sn, c * ct, -c * st], 0);
    add(t, t, z, -dot(t, z)); norm(t); cross(x, t, z);
    BACK_NOW[0] = BACK_AT[0]; BACK_NOW[1] = BACK_AT[1]; BACK_NOW[2] = BACK_AT[2] - (this.s.staff ? STOW.over * sw : 0);
    this.slung(at, Q2, this.j.spine2, BACK_NOW);
  }

  // A thing in the hand (its frame x, y, z and its place at, changed here) on its way to where it's kept (y2 up it, z2
  // its face, a2 its place): k of the way there, swung out round him by arc (in the space q turns) at the middle of it.
  away(x, y, z, at, y2, z2, a2, q, arc, k) {
    mix(y, y, y2, k); norm(y);
    mix(z, z, z2, k); add(z, z, y, -dot(z, y)); norm(z);
    cross(x, y, z);
    mix(at, at, a2, k);
    const b = Math.sin(Math.PI * k);
    if (b > 1e-4) { quatRotate(P16, 0, q, 0, arc, 0); add(at, at, P16, b); }
  }

  // What he holds, a matrix each (a zero one: nothing there): the staff, the left hand's (skull, or the shield on the arm), the back's.
  hold(snap, off) {
    const s = this.s, m = this.props, R = this.arms.R, L = this.arms.L, at = P1, f = P2, t = P3, nn = P4, x = P5, z = P6;
    const sw = ease(s.stow || 0), { wq } = this.rig, sp = this.j.spine2, hp = this.j.hip;
    m.fill(0);
    // (How the back and the hips are turned from the bind, for what's slung on them.)
    conj(Q1, this.bq, sp * 4); quatMul(Q2, 0, wq, sp * 4, Q1, 0);
    conj(Q1, this.bq, hp * 4); quatMul(Q6, 0, wq, hp * 4, Q1, 0);
    this.grip(R, at, f, t, nn);
    set(this.palmR, at[0], at[1], at[2]);
    if (s.staff) {
      // Up the staff is the thumb's side of the fist; its face is to where the knuckles point.
      cross(x, t, f); norm(x); cross(z, x, t);
      if (sw > 0) {
        // On his back: its head up over the right shoulder, leaned a little, its face out behind.
        // (On the board he's down in a crouch: it lies further over then, across his back, so its foot keeps off the ground.)
        const lean = lerp(STOW.lean, STOW.rideLean, ease(this.wRide)), cl = Math.cos(lean), sl = Math.sin(lean);
        quatRotate(P9, 0, Q2, 0, [-sl, cl * Math.cos(STOW.tip), cl * Math.sin(STOW.tip)], 0);
        quatRotate(P10, 0, Q2, 0, [0, 0, -1], 0);
        this.away(x, t, z, at, P9, P10, this.slung(P11, Q2, sp, STOW.staff), Q2, STOW.arc.staff, sw);
      }
      put(m, 0, x, t, z, at, 1);
      add(this.staffTip, at, t, s.staffHead ?? STAFF_HEAD);
    } else set(this.staffTip, at[0], at[1], at[2]);
    this.grip(L, at, f, t, nn);
    set(this.palmL, at[0], at[1], at[2]);
    if (s.skull) {
      // The skull under the palm, its crown to the hand, its face the way the fingers point.
      const up = set(P7, -nn[0], -nn[1], -nn[2]), ahead = set(P8, Math.sin(this.yaw), 0, Math.cos(this.yaw));
      add(z, ahead, up, -dot(ahead, up));
      if (Math.hypot(z[0], z[1], z[2]) < 0.3) add(z, f, up, -dot(f, up));      // (the palm turned ahead: then by the fingers)
      norm(z); cross(x, up, z);
      add(at, at, nn, SKULL_DROP);
      set(this.palmL, at[0], at[1], at[2]);
      if (sw > 0) {
        // At his left hip, looking out and ahead.
        quatRotate(P9, 0, Q6, 0, [0, 1, 0], 0);
        quatRotate(P10, 0, Q6, 0, STOW.face, 0);
        this.away(x, up, z, at, P9, P10, this.slung(P11, Q6, hp, STOW.skull), Q6, STOW.arc.skull, sw);
      }
      put(m, 16, x, up, z, at, SKULL_SIZE * (1 + (STOW.size - 1) * sw));
    } else if (s.shield && !s.surf) {
      // The shield on the forearm: its grip in the fist, its top to the thumb's side, its face out from the back of the hand.
      cross(x, t, nn); norm(x); cross(z, x, t);
      add(at, at, z, -SHIELD_SEAT);
      // (Put away it goes round onto his back: then it's the back's.)
      if (sw > 0) { this.onBack(P12, P13, P14, P15, sw); this.away(x, t, z, at, P13, P14, P15, Q2, STOW.arc.shield, sw); put(m, 32, x, t, z, at, SHIELD_SIZE); }
      else put(m, 16, x, t, z, at, SHIELD_SIZE);
    }
    if (s.shield && s.skull && !s.surf) {
      // Slung on the back: its face out behind, leaned over so the point is down toward one hip.
      this.onBack(x, t, z, at, sw);
      put(m, 32, x, t, z, at, SHIELD_SIZE);
    } else if (s.surf) {
      // The board under his feet, on the ground's lie, its point the way it's going.
      const b = s.surf, n = [b.nx, b.ny, b.nz], h = [b.hx, 0, b.hz];
      add(h, h, n, -dot(h, n)); norm(h);
      const y = [-h[0], -h[1], -h[2]];
      cross(x, y, n);
      put(m, 32, x, y, n, [s.x, s.y + SURF.lift - 0.015, s.z], SHIELD_SIZE);
    }
    const head = this.j.head * 3;
    set(this.head, this.rig.wt[head], this.rig.wt[head + 1], this.rig.wt[head + 2]);
    snap.set(m, off);
  }
}

function put(m, o, x, y, z, at, k) {
  m[o] = x[0] * k; m[o + 1] = x[1] * k; m[o + 2] = x[2] * k; m[o + 3] = 0;
  m[o + 4] = y[0] * k; m[o + 5] = y[1] * k; m[o + 6] = y[2] * k; m[o + 7] = 0;
  m[o + 8] = z[0] * k; m[o + 9] = z[1] * k; m[o + 10] = z[2] * k; m[o + 11] = 0;
  m[o + 12] = at[0]; m[o + 13] = at[1]; m[o + 14] = at[2]; m[o + 15] = 1;
}

const BACK_NOW = [0, 0, 0], Q6 = new Float32Array(4);
const Q1 = new Float32Array(4), Q2 = new Float32Array(4), Q3 = new Float32Array(4), Q4 = new Float32Array(4), Q5 = new Float32Array(4), KEEP = new Float32Array(12);
const P1 = v3(), P2 = v3(), P3 = v3(), P4 = v3(), P5 = v3(), P6 = v3(), P7 = v3(), P8 = v3(), P9 = v3(), P10 = v3(), P11 = v3(), P12 = v3(), P13 = v3(), P14 = v3(), P15 = v3(), P16 = v3(), P17 = v3();
const hold0 = () => ({ at: v3(), f: v3(), t: v3(), pole: v3(), curl: 0, thumb: 0, spread: 0 });
const T1 = hold0(), T2 = hold0(), T3 = hold0(), T4 = hold0(), T5 = hold0(), T6 = hold0();
