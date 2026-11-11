// The monsters' attacks that aren't a blow: what they throw and what they mark on the ground, each made of the pieces in
// src/sim/perils.js and named, so anything can use any of them:
//
//   MOVES.fissure(sim.perils, monster, target, k)
//
// monster: whoever makes it (x, y, z, yaw; a Tripo monster's height is read if it has one). target: the body it's meant
// for. k: how hard, as one of the monster's own blows (its damage); every number below is a share of that.
//
// TRICKS says which of them each kind of Tripo monster has, and how often. A monster whose lair has tricks on
// (src/sim/tripo.js: the Warrens' packs, whatever's summoned in the Test Dungeon, any lair with `tricks: true`) plays one
// between its blows: tryTrick below picks it, and the monster's own body acts it out (TripoMonster.perform).
// The bosses' fights (src/sim/dungeon.js) call the same moves by name on their own clocks.
import { clamp, quatMul, wrapAngle } from '../core/math.js';
import { EV } from '../core/layout.js';
import { ELEM } from './spells.js';

const { FIRE, FROST, ARCANE, STORM, DRAIN, BONE, VOID, POISON, SPIRIT, STONE } = ELEM;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const tall = (m) => m.meta?.height || m.opts?.height || 1.8;
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const gap = (m, t) => Math.hypot(t.x - m.x, t.z - m.z);
// Where it throws from: a hand, or a mouth, out in front of it.
const hand = (m, up = 0.7, out = 0.5) => [m.x + Math.sin(m.yaw) * out * tall(m) * 0.5, m.y + (m.hover || 0) + tall(m) * up, m.z + Math.cos(m.yaw) * out * tall(m) * 0.5];
const from = (m, up, out) => { const h = hand(m, up, out); return { x: h[0], y: h[1], z: h[2], from: m }; };

export const MOVES = {
  // ---- stone ----
  /** A rock thrown overarm: a circle under you that follows a moment, then stays where it'll land. */
  rockLob(P, m, t, k) {
    P.lob(hand(m), { x: t.x, z: t.z, r: 2.3, dmg: k * 2.2, knock: 2, elem: STONE, follow: t, lock: 0.45, from: m, tag: 'rockLob' }, { time: 1.25 });
  },
  /** Four of them: one for you, three round you. */
  rockRain(P, m, t, k) {
    MOVES.rockLob(P, m, t, k);
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU, d = rnd(3, 6);
      P.later(0.15 * (i + 1), () => { if (!m.dead) P.lob(hand(m), { x: t.x + Math.sin(a) * d, z: t.z + Math.cos(a) * d, r: 2, dmg: k * 1.8, knock: 2, elem: STONE, from: m, tag: 'rockRain' }, { time: 1.3 }); });
    }
  },
  /** The ground split along a line from its feet. */
  fissure(P, m, t, k, o = {}) {
    P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + (o.turn || 0), r: o.r || 11, w: o.w || 1.1, fuse: o.fuse || 1, dmg: k * 2.6, knock: 3, elem: STONE, from: m, aim: o.turn ? null : t, lock: 0.5, tag: 'fissure' });
  },
  /** Three of them, fanned. */
  fissures(P, m, t, k, o = {}) { for (const turn of [-0.42, 0, 0.42]) MOVES.fissure(P, m, t, k, { ...o, turn: turn || 1e-6 }); },
  /** A stamp: three rings out from its feet, one after another. Step in behind each as it lands. */
  stompRings(P, m, t, k, o = {}) {
    const r = o.r || tall(m) * 1.3;
    P.rings(m.x, m.z, [r, r * 2, r * 3], 0.75, { fuse: 1.1, dmg: k * 1.5, knock: 3, elem: o.elem ?? STONE, from: m, tag: 'stompRings' });
  },
  /** A stamp that sends a ring along the ground: jump it. */
  quakeWave(P, m, t, k, o = {}) {
    P.mark({ x: m.x, z: m.z, r: tall(m) * 0.9, fuse: 0.9, dmg: k * 1.2, knock: 3, elem: o.elem ?? STONE, from: m, tag: 'quake',
      then: () => { P.wave(m.x, m.z, { speed: o.speed || 9, reach: o.reach || 18, touch: k * 1.6, knock: 2, elem: o.elem ?? STONE, from: m, r: tall(m) * 0.9, tag: 'quakeWave' }); P.sim.event(EV.GROUND, m.x, m.y, m.z); } });
  },
  /** A boulder that bursts into shards where it lands. */
  boulder(P, m, t, k) {
    P.lob(hand(m, 0.9), { x: t.x, z: t.z, r: 3.4, dmg: k * 2.4, knock: 4, elem: STONE, follow: t, lock: 0.5, from: m, tag: 'boulder',
      then: (q) => P.nova({ x: q.x, y: q.y + 0.7, z: q.z, speed: 10, dmg: k * 0.9, look: 'rock', elem: STONE, size: 0.24, life: 1.5, from: m, tag: 'shard' }, 8, Math.random() * TAU, 1.3) }, { time: 1.6, size: 0.7 });
  },

  // ---- blades and bolts ----
  /** Knives, fanned: three, or five from one in armour. */
  knifeFan(P, m, t, k, o = {}) {
    const n = o.n || (/armored/.test(m.opts?.model || '') ? 5 : 3);
    P.fan({ ...from(m, 0.75), yaw: yawTo(m, t), speed: 15, dmg: k * 1.5, look: 'blade', elem: SPIRIT, size: 0.2, life: 2, tag: 'knifeFan' }, n, 0.16 * (n - 1));
  },
  /** Feathers, or blades, flung out all round: stand between two. */
  bladeNova(P, m, t, k, o = {}) {
    P.nova({ ...from(m, 0.6, 0), speed: o.speed || 11, dmg: k * 1.2, look: 'blade', elem: o.elem ?? SPIRIT, size: 0.2, life: 2.2, tag: 'bladeNova' }, o.n || 10, o.turn ?? Math.random() * TAU);
  },
  /** A lance of blood down a line. */
  bloodLance(P, m, t, k) {
    P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 15, w: 0.8, fuse: 0.9, dmg: k * 2, knock: 2, elem: DRAIN, from: m, aim: t, lock: 0.55, tag: 'bloodLance',
      then: (q) => P.shot({ x: q.x, y: m.y + tall(m) * 0.6, z: q.z, yaw: q.yaw, speed: 40, dmg: 0, look: 'lance', elem: DRAIN, life: 0.36, ghost: true }) });
  },
  /** Three slow lights that come after you, and don't give up for a while. */
  seekers(P, m, t, k, o = {}) {
    const n = o.n || 3;
    for (let i = 0; i < n; i++) P.shot({ ...from(m, 0.8), yaw: m.yaw + (i - (n - 1) / 2) * 0.9, pitch: 0.3, speed: o.speed || 5.5, dmg: k * 1.6, elem: o.elem ?? VOID, size: 0.32, life: 6, home: 2.2, homeFor: 5, at: t, tag: 'seekers' });
  },
  /** A row of shots abreast with a way through. */
  boltWall(P, m, t, k, o = {}) {
    P.wall({ ...from(m, 0.5, 0), yaw: yawTo(m, t), speed: o.speed || 8, dmg: k * 1.4, elem: o.elem ?? FIRE, look: o.look || 'orb', size: 0.26, life: 3, tag: 'boltWall' }, { width: o.width || 14, n: o.n || 9, gap: 2 });
  },
  /** Shots poured out in turning streams. */
  spiral(P, m, t, k, o = {}) {
    P.spiral({ from: m, yaw: Math.random() * TAU, speed: o.speed || 8, dmg: k, elem: o.elem ?? POISON, size: 0.24, life: 2.6, tag: 'spiral' }, { arms: o.arms || 3, secs: o.secs || 3, every: 0.18, turn: o.turn || 1.5, up: tall(m) * 0.5 });
  },

  // ---- fire ----
  /** A pot of fire, thrown: it burns where it breaks. */
  firepot(P, m, t, k, o = {}) {
    P.lob(hand(m), { x: o.x ?? t.x, z: o.z ?? t.z, r: o.r || 2.5, dmg: k * 1.2, life: o.life || 6, dps: k * 1.3, elem: FIRE, follow: o.x === undefined ? t : null, lock: 0.4, from: m, tag: 'firepot' }, { time: 1.2, look: 'flask', size: 0.3 });
  },
  /** Three pots, in a row across where you stand. */
  firepots(P, m, t, k) {
    const a = yawTo(m, t) + Math.PI / 2;
    for (let i = -1; i <= 1; i++) P.later(0.12 * (i + 1), () => { if (!m.dead) MOVES.firepot(P, m, t, k, { x: t.x + Math.sin(a) * i * 4.6, z: t.z + Math.cos(a) * i * 4.6 }); });
  },
  /** Bolts of fire, fanned. */
  fireFan(P, m, t, k, o = {}) {
    P.fan({ ...from(m, 0.75), yaw: yawTo(m, t), speed: 13, dmg: k * 1.4, elem: o.elem ?? FIRE, size: 0.24, life: 2.4, tag: 'fireFan' }, o.n || 5, o.spread || 0.9);
  },
  /** Crossed bars of fire that turn about it: keep moving round with them, or get out past their ends. */
  fireWheel(P, m, t, k, o = {}) {
    P.mark({ shape: 'cross', ride: m, arms: o.arms || 4, r: o.r || 9, w: 0.75, fuse: 1.2, dmg: k * 1.2, life: o.life || 5, spin: o.spin || 0.7, touch: k * 1.3, again: 0.8, elem: o.elem ?? FIRE, from: m, tag: 'fireWheel',
      // (It turns on its own once it's lit, and stays where it was lit.)
      then: (q) => { q.ride = null; } });
  },

  // ---- poison and rot ----
  /** Spit, fanned: each gob leaves a puddle. */
  spitFan(P, m, t, k, o = {}) {
    P.fan({ ...from(m, 0.8), yaw: yawTo(m, t), pitch: -0.08, speed: 12, dmg: k * 1.2, elem: POISON, size: 0.24, life: 2.2, tag: 'spitFan',
      burst: { r: 1.6, life: 4, dps: k * 0.9 } }, o.n || 3, 0.5);
  },
  /** A cone of it from the mouth, that hangs there a while. */
  venomCone(P, m, t, k, o = {}) {
    P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || tall(m) * 3.2, half: o.half || 0.5, fuse: 1, dmg: k * 1.6, life: 3, dps: k * 0.9, elem: o.elem ?? POISON, from: m, aim: t, lock: 0.5, tag: 'venomCone' });
  },
  /** Gobs lobbed all about you. */
  spitRain(P, m, t, k, o = {}) {
    P.rain(t.x, t.z, o.R || 7, o.n || 6, 1.2, { r: 2.2, fuse: 1.3, dmg: k * 1.3, life: 4, dps: k * 0.8, elem: o.elem ?? POISON, from: m, tag: 'spitRain' });
  },
  /** A cross of plague from its feet. */
  plagueCross(P, m, t, k) {
    P.mark({ shape: 'cross', x: m.x, z: m.z, yaw: yawTo(m, t) + Math.PI / 4, arms: 4, r: 9, w: 1, fuse: 1.2, dmg: k * 1.6, life: 3, dps: k * 0.8, elem: POISON, from: m, tag: 'plagueCross' });
  },

  // ---- the dead and the uncanny ----
  /** A wail: a ring round it, with a still place close in against it. */
  wailRing(P, m, t, k) {
    P.mark({ shape: 'ring', x: m.x, z: m.z, r: 6.5, r0: 2, fuse: 1.1, dmg: k * 2, elem: SPIRIT, from: m, tag: 'wailRing' });
  },
  /** Spikes of bone coming up one after another, at you. */
  boneMarch(P, m, t, k) {
    const d = gap(m, t);
    P.march(m.x, m.z, yawTo(m, t), clamp(Math.round(d / 1.9) + 2, 4, 10), 1.9, 0.14, { r: 1.25, fuse: 0.8, dmg: k * 2, knock: 2, elem: BONE, from: m, tag: 'boneMarch' });
  },
  /** Threads run out from it three ways. */
  threads(P, m, t, k) {
    P.mark({ shape: 'cross', x: m.x, z: m.z, yaw: yawTo(m, t), arms: 3, r: 10, w: 0.5, fuse: 1, dmg: k * 1.6, elem: ARCANE, from: m, tag: 'threads' });
  },
  /** A howl that runs out along the ground: jump it. */
  howlWave(P, m, t, k) {
    P.wave(m.x, m.z, { speed: 10, reach: 16, touch: k * 1.4, knock: 3, elem: STORM, from: m, tag: 'howlWave' });
  },
  /** A cold ring thrown out and a second inside it. */
  frostRings(P, m, t, k) {
    P.rings(t.x, t.z, [3, 6], 0.7, { fuse: 1.1, dmg: k * 1.5, elem: FROST, from: m, tag: 'frostRings' });
  },

  // ---- with the whole body ----
  /** Head down along a line, and then it comes down it. */
  ram(P, m, t, k, o = {}) {
    const yaw = yawTo(m, t), r = Math.min(o.r || 14, gap(m, t) + 5);
    P.mark({ shape: 'line', x: m.x, z: m.z, yaw, r, w: o.w || 1.3, fuse: o.fuse || 1, dmg: k * 2.2, knock: 5, elem: o.elem ?? STONE, from: m, tag: 'ram' });
    dash(m, yaw, r - 1, o.fuse || 1, 0.4);
  },
  /** The tail, swung right round behind it; and the ground rings with it: jump that. Only for what has a tail. */
  tailWhip(P, m, t, k, o = {}) {
    const R = o.r || tall(m) * 1.9, fuse = o.fuse || 1.15;
    P.mark({ shape: 'cone', ride: m, turn: Math.PI, r: R, half: 1.7, fuse, dmg: k, knock: 7, elem: o.elem ?? POISON, from: m, tag: 'tailWhip',
      then: (q) => { q.ride = null; if (o.wave !== false) P.wave(m.x, m.z, { speed: 11, reach: R + 12, touch: k * 0.6, knock: 2, elem: o.elem ?? POISON, from: m, r: R * 0.6, tag: 'tailWave' }); } });
    whip(m, fuse);
  },
};

// ---- the body's part in them ------------------------------------------------------------------------------------------

// Along a line after a wait: the body is carried down it, whatever it was doing (its script: src/sim/tripo.js).
function dash(m, yaw, far, wait, secs) {
  if (!m.rig?.clips) return;
  let t = 0;
  const run = m.rig.clips.run ? 'run' : 'walk';
  m.script = (k, dt) => {
    t += dt;
    if (k.dead || t > wait + secs + 0.25) { k.script = null; k.setClip(k.idleClip); return false; }
    k.yaw += clamp(wrapAngle(yaw - k.yaw), -dt * 8, dt * 8);
    const go = t > wait && t < wait + secs;
    k.vx = go ? Math.sin(yaw) * far / secs : 0; k.vz = go ? Math.cos(yaw) * far / secs : 0;
    k.setClip(go ? run : k.idleClip);
    k.t += dt * (go ? 1.8 : 1);
    return true;
  };
}

// The tail's joints, root to tip, and the joints above them back to the root: found once for a rig.
function tailOf(rig) {
  if (rig.tail !== undefined) return rig.tail;
  const tail = [];
  rig.names.forEach((n, j) => { if (/Tail_\d+$/i.test(n)) tail.push(j); });
  // (Kept on the rig the bodies share, not on one body's own copy of it.)
  const base = Object.prototype.hasOwnProperty.call(rig, 'names') ? rig : Object.getPrototypeOf(rig);
  if (tail.length < 3) return (base.tail = null);
  tail.sort((a, b) => a - b);
  const above = [];
  for (let p = rig.parent[tail[0]]; p >= 0; p = rig.parent[p]) above.unshift(p);
  return (base.tail = { above, joints: tail });
}

const wq = new Float32Array(4), ry = new Float32Array(4), ta = new Float32Array(4), tb = new Float32Array(4);
// Bends the tail sideways in the pose about to be solved: each joint turned about the upright by angle(i, n), so the bends
// add up down its length. (rot: the joints' own rotations, parents first. The body's own turn goes on after, so "upright"
// here is the model's.)
export function bendTail(rig, rot, angle) {
  const t = tailOf(rig);
  if (!t) return;
  wq[0] = wq[1] = wq[2] = 0; wq[3] = 1;
  for (const j of t.above) { quatMul(ta, 0, wq, 0, rot, j * 4); wq.set(ta); }
  const n = t.joints.length;
  for (let i = 0; i < n; i++) {
    const j = t.joints[i], a = angle(i, n);
    quatMul(ta, 0, wq, 0, rot, j * 4);              // where it points now
    ry[0] = 0; ry[1] = Math.sin(a / 2); ry[2] = 0; ry[3] = Math.cos(a / 2);
    quatMul(tb, 0, ry, 0, ta, 0);                   // and turned
    // (Back into its parent's frame.)
    ta[0] = -wq[0]; ta[1] = -wq[1]; ta[2] = -wq[2]; ta[3] = wq[3];
    quatMul(rot, j * 4, ta, 0, tb, 0);
    wq.set(tb);
  }
}

// Tips the whole body in the pose about to be solved: nose down (pitch) and over on a wing (roll), about the model's own
// axes. For something in the air.
export function tipBody(rig, rot, pitch, roll) {
  const j = rig.parent.indexOf(-1);
  if (j < 0 || (!pitch && !roll)) return;
  const hp = pitch / 2, hr = roll / 2;
  ta[0] = Math.sin(hp); ta[1] = 0; ta[2] = 0; ta[3] = Math.cos(hp);
  tb[0] = 0; tb[1] = 0; tb[2] = Math.sin(hr); tb[3] = Math.cos(hr);
  quatMul(ry, 0, ta, 0, tb, 0);
  ta[0] = rot[j * 4]; ta[1] = rot[j * 4 + 1]; ta[2] = rot[j * 4 + 2]; ta[3] = rot[j * 4 + 3];
  quatMul(rot, j * 4, ry, 0, ta, 0);
}

export const hasTail = (m) => !!(m.rig && tailOf(m.rig));

// A tail whip, acted: it coils the tail to one side and leans away while the warning fills, then the whole body goes
// round once with the tail thrown out stiff behind it, and it settles. The tail's bend is laid over whatever clip it's in.
function whip(m, wind, swing = 0.5, settle = 0.55) {
  if (!hasTail(m)) return;
  let t = 0;
  const side = Math.random() < 0.5 ? 1 : -1, yaw0 = m.yaw;
  const ease = (v) => { const u = clamp(v, 0, 1); return u * u * (3 - 2 * u); };
  m.rig.poseModifier = (rot) => {
    // coil: curled to one side, tighter toward the tip. lash: thrown the other way, with a wave running down it.
    const coil = ease(t / (wind * 0.8)) * (1 - ease((t - wind) / (swing * 0.4)));
    const lash = ease((t - wind) / (swing * 0.35)) * (1 - ease((t - wind - swing) / settle));
    bendTail(m.rig, rot, (i, n) => side * (coil * (0.1 + 0.2 * i / n) - lash * (0.05 + 0.13 * i / n) * (1 + 0.6 * Math.sin((t - wind) * 18 - i * 0.7))));
  };
  m.script = (k, dt, sim) => {
    t += dt;
    if (k.dead || t > wind + swing + settle) { k.script = null; k.rig.poseModifier = null; k.yaw = wrapAngle(k.yaw); return false; }
    k.vx = k.vz = 0;
    // Leaning away as it coils, then once right round.
    const lean = -0.45 * ease(t / wind) * side, round = TAU * ease((t - wind) / swing) * side;
    k.yaw = yaw0 + lean * (1 - ease((t - wind - swing) / settle)) + round;
    if (t > wind && !k.whipped) { k.whipped = true; sim.event(EV.WHOOSH, k.x, k.y + 1, k.z); sim.event(EV.ROAR, k.x, k.y + tall(k) * 0.6, k.z, 1.1); }
    if (t <= wind) k.whipped = false;
    if (k.clip !== k.idleClip) k.setClip(k.idleClip);
    k.t = (k.t + dt) % k.rig.clips[k.clip].dur;
    return true;
  };
}

// ---- who has what ----------------------------------------------------------------------------------------------------
// By the bestiary's group (src/core/tripo-monsters.js GROUPS): the moves its monsters have besides their blows. cd: seconds
// between them, from and to. near, far: how far off its mark has to be. clip: what the body plays as it does it (a roar,
// unless it says). at: when in that the move goes off, in seconds.
export const TRICKS = {
  Goblins: [{ move: 'knifeFan', cd: [6, 10], near: 3, far: 18, clip: 'atk2' }, { move: 'firepot', cd: [9, 14], near: 4, far: 20, clip: 'atk1' }],
  Kobolds: [{ move: 'rockLob', cd: [6, 10], near: 3, far: 20, clip: 'atk1' }, { move: 'fissure', cd: [9, 14], near: 0, far: 10, clip: 'atk3' }],
  'Dead Children': [{ move: 'wailRing', cd: [8, 12], near: 0, far: 7 }],
  'The Possessed': [{ move: 'venomCone', cd: [8, 12], near: 0, far: 6 }],
  'Haunted Mannequins': [{ move: 'threads', cd: [8, 12], near: 0, far: 10 }],
  'Giant Spiders': [{ move: 'spitFan', cd: [7, 11], near: 3, far: 16 }, { move: 'venomCone', cd: [10, 15], near: 0, far: 7 }],
  'Goat Men': [{ move: 'ram', cd: [8, 12], near: 4, far: 14 }, { move: 'stompRings', cd: [11, 16], near: 0, far: 8, clip: 'jump' }],
  Werewolf: [{ move: 'howlWave', cd: [8, 12], near: 0, far: 14 }, { move: 'ram', cd: [9, 13], near: 5, far: 14 }],
  Harpies: [{ move: 'bladeNova', cd: [7, 11], near: 0, far: 12 }, { move: 'knifeFan', cd: [8, 12], near: 4, far: 18 }],
  Dragonlings: [{ move: 'spitFan', cd: [6, 10], near: 3, far: 16 }, { move: 'tailWhip', cd: [10, 15], near: 0, far: 5 }],
  'Plague Knights': [{ move: 'plagueCross', cd: [9, 13], near: 0, far: 9, clip: 'bash' }, { move: 'spitRain', cd: [11, 16], near: 4, far: 18 }],
  "Velscour's Knights": [{ move: 'bloodLance', cd: [8, 12], near: 3, far: 15, clip: 'atk1' }, { move: 'boltWall', cd: [12, 17], near: 5, far: 16, clip: 'bash', o: { elem: DRAIN, width: 10, n: 7 } }],
  'Night Paralysis Demons': [{ move: 'seekers', cd: [9, 13], near: 3, far: 20 }, { move: 'threads', cd: [10, 15], near: 0, far: 10 }],
  Necromancers: [{ move: 'boneMarch', cd: [7, 11], near: 4, far: 18, clip: 'atk1' }, { move: 'frostRings', cd: [10, 14], near: 4, far: 20, clip: 'atk2' }, { move: 'seekers', cd: [13, 18], near: 5, far: 20, o: { n: 2, elem: DRAIN } }],
  'Plague Giants': [{ move: 'stompRings', cd: [8, 12], near: 0, far: 12, clip: 'jump', o: { elem: POISON } }, { move: 'boulder', cd: [10, 15], near: 6, far: 24, clip: 'atk1' }],
  'Bone Giants': [{ move: 'quakeWave', cd: [8, 12], near: 0, far: 16, clip: 'jump', o: { elem: BONE } }, { move: 'fissures', cd: [10, 14], near: 0, far: 14, clip: 'atk3', o: { r: 15 } }],
  'Giant Worms': [{ move: 'spitRain', cd: [7, 11], near: 4, far: 24, o: { n: 8, R: 9 } }, { move: 'quakeWave', cd: [10, 15], near: 0, far: 14 }],
  Dragons: [{ move: 'tailWhip', cd: [9, 13], near: 0, far: 10 }, { move: 'spitRain', cd: [9, 14], near: 6, far: 30, o: { n: 8, R: 9, elem: FIRE } }, { move: 'fissures', cd: [11, 16], near: 0, far: 14, clip: 'atk1', o: { r: 16 } }, { move: 'spiral', cd: [14, 20], near: 0, far: 22, o: { elem: FIRE } }],
};

// One of a monster's tricks, if it's time for one and there's someone to play it on. Half the time that's you, if you're in
// reach of it, whoever it's fighting; else whoever it's on. (m: a TripoMonster; foe: who it's on.)
export function tryTrick(m, sim, foe) {
  const list = m.opts.tricks, P = sim.perils;
  if (!list || !P || P.marks.length > 48 || P.shots.length > 150) return false;
  const p = sim.player;
  const who = [];
  if (!p.dead && Math.random() < 0.5) who.push(p);
  if (foe && !foe.dead) who.push(foe);
  for (const t of who) {
    const d = gap(m, t);
    const fit = list.filter((q) => MOVES[q.move] && d >= q.near && d <= q.far && (q.move !== 'tailWhip' || hasTail(m)));
    if (!fit.length || !sim.world.sees(m.x, m.y + tall(m) * 0.6, m.z, t.x, t.y + 1, t.z)) continue;
    const q = pick(fit), k = m.opts.damage;
    const clip = q.clip && m.rig.clips[q.clip] ? q.clip : m.rig.clips.roar ? 'roar' : null;
    if (!m.perform({ clip, face: t, at: q.at ?? 0.45, secs: 1.3, fn: () => { if (!t.dead) MOVES[q.move](P, m, t, k, q.o); } })) return false;
    m.trickCd = rnd(q.cd[0], q.cd[1]);
    return true;
  }
  // (Nobody it could play one on just now: look again in a moment, not every tick.)
  m.trickCd = 0.6;
  return false;
}
