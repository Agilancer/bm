// The walking dead, after Bellmourn's: they wander until they see or hear you, call the others, and hunt where they last knew you
// were. They come apart a limb at a time, and carry on with what's left: one with no legs drags itself after you by the arms, one
// with no head goes by ear. Only running out of body stops them. Over them are the casters, who think: see Caster below, and foespells.js
// for what they throw.
import { C, EV } from '../core/layout.js';
import { churchAt, churchSite, toChurch } from '../core/church.js';
import { floorAt } from '../core/interior.js';
import { inTown } from '../core/town.js';
import { clamp, damp, quatYaw, wrapAngle, quatRotate } from '../core/math.js';
import { getFile } from '../core/files.js';
import { ArmsRig } from './anim.js';
import { Beast } from './beast.js';
import { CHILDREN, PART, partOfJoint } from './limbs.js';
import { FOE, lastRite } from './foespells.js';
import { foeOf, heroBusy } from './foes.js';
import { ELEM, FX } from './spells.js';

const P = PART;
export const OGRE_SCALE = 1.55;
// What the renderer and the sim both build, in this order.
export const BODIES = [
  // (The last gives up a body in the ground so a second wizard fits.)
  // kept: how many of a model's bodies, the last of them, are kept for the road down from Lisandra's cave
  // (src/sim/opening.js, openingRaise below): nine more of the dead for its waves, and the two necromancers who come
  // out of the trees at the end of it. They're more bodies of a model that's here already, so nothing is fetched or
  // built twice for them.
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ model: `zombie_${n}`, count: (n === 6 ? 3 : 4) + (n % 2 ? 3 : 0), kept: n % 2 ? 3 : 0, scale: 1 })),
  { model: 'zombie_ogre', count: 2, scale: OGRE_SCALE },
  { model: 'necromancer', count: 3, kept: 2, scale: 1 },
  { model: 'zombie_necromancer', count: 1, scale: 1 },
  { model: 'evil_wizard', count: 2, scale: 1 },
  // And the road's ten children: one of the dead's own bodies, small. (Its file is read once for both: addUndead, and
  // the renderer's load.)
  { model: 'zombie_2', count: 10, kept: 10, scale: 0.6, child: true },
];

const STATE = { MOVE: 0, ATTACK: 3, STAGGER: 7, RISE: 8, PLAYDEAD: 9, DEAD: 10, CAST: 11 };
const GOAL = { WANDER: 0, CHASE: 1, HUNT: 2, SEARCH: 3 };
// A swing here does far less to a body than the same swing in Bellmourn, where a sword hits for its whole weight, so what lands is scaled to its numbers.
const BLOW = 6;
const LIMB_HP = { [P.HEAD]: 42, [P.UPPER_L]: 52, [P.UPPER_R]: 52, [P.FORE_L]: 36, [P.FORE_R]: 36, [P.HAND_L]: 22, [P.HAND_R]: 22, [P.THIGH_L]: 150, [P.THIGH_R]: 150, [P.SHIN_L]: 120, [P.SHIN_R]: 120, [P.FOOT_L]: 70, [P.FOOT_R]: 70, [P.HIPS]: 150 };
const LEGS = new Set([P.HIPS, P.THIGH_L, P.THIGH_R, P.SHIN_L, P.SHIN_R, P.FOOT_L, P.FOOT_R]);
// Windows are the frames of each clip, at 30 a second, in which its blow can land.
const BLOWS = {
  attack_rake: { windows: [[18, 25]], dmg: 9 },
  attack_flurry: { windows: [[18, 24], [31, 37], [44, 50]], dmg: 5 },
  attack_bite: { windows: [[15, 22]], dmg: 14 },
  attack_pounce: { windows: [[26, 33]], dmg: 12 },
  crawl_attack: { windows: [[14, 19]], dmg: 7 },
};
const WALKS = ['walk_shamble', 'walk_drag', 'walk_reach', 'walk_stagger'];
const RUNS = { runner: ['run_lope', 'run_hobble', 'run_frenzy', 'run_charge'], lurker: ['run_hobble', 'run_lope'] };
const STYLES = { shambler: ['shambler', 'shambler', 'flanker', 'shambler'], runner: ['stalker', 'pouncer', 'flanker', 'shambler'], lurker: ['pouncer', 'stalker', 'pouncer', 'stalker'] };
const SENSES = { shambler: { sight: 20, hear: 1, turn: 2.4 }, runner: { sight: 24, hear: 1.2, turn: 3.2 }, lurker: { sight: 10, hear: 0.7, turn: 3 } };

const tv = new Float32Array(3), flow = new Float32Array(2), hand = new Float32Array(3);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
function turn(a, b, step) { const d = wrapAngle(b - a); return wrapAngle(a + clamp(d, -step, step)); }

export class Zombie extends Beast {
  constructor(id, kind, rig, opts) {
    super(id, kind, rig, opts);
    this.scale = opts.scale || 1;
    this.jointOf = (n) => rig.index.get(n);
    this.partOf = rig.names.map(partOfJoint);
    // What a blade landing on each joint is hitting: the neck is the head's, and low in the spine is the waist's.
    this.hitPart = rig.names.map((n, j) => (n === 'neck_01' ? P.HEAD : n === 'spine_01' || n === 'spine_02' ? P.HIPS : this.partOf[j]));
    this.parentPart = {};
    for (const [a, list] of Object.entries(CHILDREN)) for (const c of list) this.parentPart[c] = +a;
    const S = this.scale, rad = { pelvis: 0.17, spine_01: 0.16, spine_02: 0.16, spine_03: 0.18, neck_01: 0.065, Head: 0.12 };
    this.bones = [];
    const bone = (a, b, r) => { if (J(a) !== undefined && J(b) !== undefined) this.bones.push({ j: J(a), k: J(b), r: r * S, part: this.partOf[J(a)] }); };
    const J = this.jointOf;
    bone('pelvis', 'spine_01', rad.pelvis); bone('spine_01', 'spine_02', rad.spine_01); bone('spine_02', 'spine_03', rad.spine_02); bone('spine_03', 'neck_01', rad.spine_03);
    bone('neck_01', 'Head', rad.neck_01); bone('Head', 'Head', rad.Head);
    for (const s of ['l', 'r']) {
      bone(`clavicle_${s}`, `upperarm_${s}`, 0.07); bone(`upperarm_${s}`, `lowerarm_${s}`, 0.06); bone(`lowerarm_${s}`, `hand_${s}`, 0.052); bone(`hand_${s}`, `middle_02_${s}`, 0.05);
      bone(`thigh_${s}`, `calf_${s}`, 0.085); bone(`calf_${s}`, `foot_${s}`, 0.065); bone(`foot_${s}`, `ball_${s}`, 0.06);
    }
    this.pelvisJoint = J('pelvis');
    this.reset(opts);
  }

  // ---- bodies coming and going ---------------------------------------------------------------------------

  reset(opts) {
    const S = this.scale;
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw, vx: 0, vz: 0, speed: 0, stam: 100, armor: 1, hp: opts.hp, maxHp: opts.hp, seenHp: opts.hp, rayPiece: -1,
      dead: false, deadT: 0, hostile: false, iframes: false, shieldUp: 0, gashes: [], bleeds: [], heart: Math.random(), gashVersion: (this.gashVersion || 0) + 1, bites: 0, below: false,
      chunks: [], jets: [], alive: new Array(15).fill(true), bit: new Array(15).fill(0), cutMask: 0, limb: { ...LIMB_HP }, crawling: false, headless: false, hobble: false,
      state: STATE.MOVE, stateT: 0, goal: GOAL.WANDER, aggro: false, attack: null, used: false, activeOn: -1, cool: rnd(0.5, 2), pounceCool: rnd(2, 6), senseT: Math.random() * 0.25,
      lastX: opts.spawn[0], lastZ: opts.spawn[1], lastSense: -99, wx: opts.spawn[0], wz: opts.spawn[1], wanderT: rnd(0, 5), moving: false, searchT: 0, rush: 0, orbit: 0, stuckT: 1, stuckX: opts.spawn[0], stuckZ: opts.spawn[1], sideT: 0, sideA: 0,
      groanT: rnd(2, 8), chasers: 0, stagger: 0, sink: 0, dirtT: 0, stepClock: 0, fadeTime: 0.2, dormant: false, looted: false, champion: false, owner: null, home: opts.spawn, riseRate: 1, riseLift: 0.5, graveUp: false, flank: this.id % 3 - 1, pace: rnd(0.88, 1.12), clip: null, t: 0, fade: 1,
    });
    this.takes(opts);
    this.bodyRadius = 0.5 * S;
    this.buildSpheres();
    this.rig.rot.set(this.rig.restR); this.rig.tr.set(this.rig.restT);
    this.rig.rot2.set(this.rig.restR); this.rig.tr2.set(this.rig.restT);
    if (opts.sleeper) {
      this.dead = true; this.dormant = true; this.looted = true; this.state = STATE.DEAD;
      this.setClip(this.idleClip);
    } else if (opts.type === 'lurker') {
      this.state = STATE.PLAYDEAD;
      this.setClip(this.riseClip);
      this.y = 0;
    } else this.setClip(this.idleClip);
    this.fade = 1;
  }

  // Every body has its own way of going about it.
  takes(opts) {
    const type = opts.type || 'shambler';
    this.senses = SENSES[type];
    this.style = pick(STYLES[type]);
    this.walkClip = pick(WALKS); this.runClip = RUNS[type] ? pick(RUNS[type]) : null;
    this.idleClip = 'Zombie_Idle_Loop'; this.riseClip = 'LayToIdle'; this.deathClip = 'Death01'; this.hitClips = ['Hit_Chest', 'Hit_Head'];
    // The clips walk slower than the Bellmourn dead do, so a walker plays its stride up to speed.
    this.walkPush = 1.5;
    this.dmgScale = opts.dmg || 1;
  }

  // Up out of the ground, at someone's word. Calm, it's a servant, and follows its master about until there's something to do.
  // (A body lying where it fell just gets up off the ground. Any other comes up out of it.)
  raiseAt(sim, x, z, owner, calm = false, type = 'shambler') {
    const lying = this.dead && !this.dormant && Math.hypot(this.x - x, this.z - z) < 1;
    this.reset({ ...this.opts, sleeper: false, type, spawn: [x, z], yaw: Math.atan2(sim.player.x - x, sim.player.z - z) });
    this.owner = owner;
    this.y = sim.world.height(x, z);
    this.rise(sim, lying);
    if (!calm) { this.aggro = true; this.goal = GOAL.CHASE; this.lastX = sim.player.x; this.lastZ = sim.player.z; this.lastSense = sim.time; }
  }

  // Every body that comes into the world outside the catacombs comes up out of the earth. It starts a body's depth down and
  // claws its way up as it gets to its feet, slower than the clip runs on its own, with the ground breaking round it the whole
  // way. (Casters have no getting-up clip: they come up standing, out of a deeper hole.)
  rise(sim, shallow = false) {
    const caster = this.riseClip === this.idleClip, deep = (shallow ? 0.4 : caster ? 1.9 : 1.15) * this.scale;
    this.state = STATE.RISE; this.stateT = 0;
    this.setClip(this.riseClip); this.t = 0; this.fade = 1;
    this.riseRate = shallow || caster ? 1 : 0.55;
    this.sink = -deep;
    this.riseLift = shallow ? 0.5 : deep / (this.rig.clips[this.riseClip].dur / this.riseRate * 0.8);
    this.dirtT = 0;
    sim.event(EV.DIRT, this.x, this.y, this.z, shallow ? 1.5 : 2.2);
  }

  // Blown apart: nothing of it gets up again.
  burst(sim) {
    if (!this.dead) this.die(sim);
    for (const part of [P.UPPER_L, P.UPPER_R, P.HEAD, P.THIGH_L, P.THIGH_R]) if (this.alive[part]) this.sever(sim, part);
    this.deadT = Math.max(this.deadT, 40);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  setClipOver(name, seconds) { this.setClip(name); this.fadeTime = seconds; }

  get armL() { return this.alive[P.UPPER_L] && this.alive[P.FORE_L]; }

  get armR() { return this.alive[P.UPPER_R] && this.alive[P.FORE_R]; }

  get arms() { return (this.armL ? 1 : 0) + (this.armR ? 1 : 0); }

  buildSpheres() { this.liveBones = this.bones.filter((b) => this.alive[b.part]); }

  // ---- blows ------------------------------------------------------------------------------------------------

  // Limbs are long and thin, so the blade tests along each bone rather than at its joints.
  rayPlates(ox, oy, oz, dx, dy, dz, maxT, hit) {
    const { wt } = this.rig;
    let best = -1, bj = -1, cx = 0, cy = 0, cz = 0, br = 1;
    for (const b of this.liveBones) {
      const a = b.j * 3, e = b.k * 3;
      const steps = b.j === b.k ? 1 : 3;
      for (let i = 0; i < steps; i++) {
        const f = (i + 0.5) / steps;
        const sx = wt[a] + (wt[e] - wt[a]) * f, sy = wt[a + 1] + (wt[e + 1] - wt[a + 1]) * f, sz = wt[a + 2] + (wt[e + 2] - wt[a + 2]) * f;
        const lx = sx - ox, ly = sy - oy, lz = sz - oz;
        const tca = lx * dx + ly * dy + lz * dz;
        const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
        const r = b.r * 1.15;
        if (d2 > r * r) continue;
        const t = tca - Math.sqrt(r * r - d2);
        if (t > 0 && t < maxT && (best < 0 || t < best)) { best = t; bj = b.j; cx = sx; cy = sy; cz = sz; br = r; }
      }
    }
    if (best < 0) return false;
    this.plateTransforms();
    const iv = this.inv[bj];
    tv[0] = ox + dx * best - iv.t[0]; tv[1] = oy + dy * best - iv.t[1]; tv[2] = oz + dz * best - iv.t[2];
    quatRotate(hand, 0, iv.r, 0, tv, 0);
    hit.lx = hand[0]; hit.ly = hand[1]; hit.lz = hand[2];
    tv[0] = (ox + dx * best - cx) / br; tv[1] = (oy + dy * best - cy) / br; tv[2] = (oz + dz * best - cz) / br;
    quatRotate(hand, 0, iv.r, 0, tv, 0);
    hit.nx = hand[0]; hit.ny = hand[1]; hit.nz = hand[2];
    hit.t = best; hit.piece = bj;
    this.rayPiece = bj;
    return true;
  }

  // The player takes hp off directly; this works out what the blow landed on. A blow to a limb goes mostly into the limb.
  takeBlow(sim, amount) {
    const j = this.rayPiece;
    this.rayPiece = -1;
    if (j < 0) {
      // A spell. Big ones blow things off now and then.
      this.hp = this.seenHp - amount * 2;
      if (amount >= 20 && Math.random() < 0.25) this.tryOff(sim, pick([P.HEAD, P.FORE_L, P.FORE_R, P.UPPER_L, P.UPPER_R]));
      return;
    }
    // (A blow through an open wound counts for a good hard cut and no more: these come apart, they don't drop at a stab.)
    const part = this.hitPart[j], hard = Math.min(amount, 10) * BLOW;
    if (part === P.TORSO || !this.alive[part]) { this.hp = this.seenHp - hard; return; }
    this.hp = this.seenHp - hard * (part === P.HIPS ? 0.6 : 0.35);
    this.limb[part] -= hard * (LEGS.has(part) ? 0.85 : 1.15) / (this.opts.limbs || 1);
    if (this.limb[part] <= 0) this.tryOff(sim, part);
  }

  // A head holds until the body's nearly done, legs till it's half gone. Arms come off whenever they're cut through.
  tryOff(sim, part) {
    const left = this.hp / this.maxHp;
    if (this.dead || !this.alive[part] || (part === P.HEAD && left > 0.3) || (LEGS.has(part) && left > 0.5)) { this.limb[part] = 1; return; }
    this.sever(sim, part);
  }

  sever(sim, part) {
    const names = [], parts = [];
    const gather = (p) => {
      if (!this.alive[p]) return;
      parts.push(p);
      this.rig.names.forEach((n, j) => { if (this.partOf[j] === p && n !== 'root') names.push(n); });
      for (const c of CHILDREN[p] || []) gather(c);
    };
    gather(part);
    if (!names.length) return;
    this.addThrownBlood(sim, names[0], (LEGS.has(part) || part === P.HIPS ? 0.13 : 0.1) * this.scale);
    // Two neighbours always differ in this bit, however many cuts have been made, because the skin parts wherever they do.
    const bit = this.bit[this.parentPart[part]] ^ 1;
    for (const p of parts) { this.bit[p] = bit; this.alive[p] = false; }
    for (const p of parts) for (const c of CHILDREN[p] || []) if (!parts.includes(c) && this.bit[c] === bit) this.bit[c] ^= 1;
    this.cutMask = this.bit.reduce((m, b, p) => m | (b << p), 0);
    this.drop(sim, names, part === P.HIPS ? 0.2 : part === P.HEAD ? 0.16 : 0.08, Math.min(3, Math.ceil(names.length / 4)));
    const stump = { [P.HEAD]: 'neck_01', [P.HIPS]: 'spine_01', [P.UPPER_L]: 'clavicle_l', [P.UPPER_R]: 'clavicle_r', [P.FORE_L]: 'upperarm_l', [P.FORE_R]: 'upperarm_r', [P.HAND_L]: 'lowerarm_l', [P.HAND_R]: 'lowerarm_r', [P.THIGH_L]: 'pelvis', [P.THIGH_R]: 'pelvis', [P.SHIN_L]: 'thigh_l', [P.SHIN_R]: 'thigh_r', [P.FOOT_L]: 'calf_l', [P.FOOT_R]: 'calf_r' }[part];
    this.bleedFrom(sim, stump, part === P.HIPS ? 14 : 9);
    this.buildSpheres();
    // (No hit-stop here: it held the whole world still for anyone's blow anywhere, a hero's a hundred metres off included. The
    // player's own blows hold it, in src/sim/player.js.)
    if (this.dead) return;
    if (part === P.HEAD) {
      this.headless = true;
      this.hp -= 30;
      this.groanT = 1e9;
    } else if (part === P.FOOT_L || part === P.FOOT_R) {
      this.hobble = true;
    } else if (LEGS.has(part)) {
      this.collapse();
    }
    if (this.attack && this.state === STATE.ATTACK) { this.attack = null; this.setState(STATE.MOVE); }
  }

  // Down it goes, and it comes on along the ground.
  collapse() {
    if (this.crawling) return;
    this.crawling = true;
    this.rush = 0;
    this.state = STATE.STAGGER; this.stateT = 0; this.stagger = 0.6;
    this.setClipOver('crawl', 0.6);
    this.bodyRadius = 0.45 * this.scale;
  }

  onHit(sim, kind, fromX, fromZ, poise = 0, by = null) {
    this.aggro = true; this.hostile = true;
    // (by: one of the other Tessariels, src/sim/hero.js. It turns on them instead: src/sim/foes.js.)
    const who = by || sim.player;
    this.lastX = who.x; this.lastZ = who.z; this.lastSense = sim.time;
    if (this.goal !== GOAL.CHASE) { this.goal = GOAL.CHASE; this.alert(sim, 9, by); }
    // Blows don't move them and don't stop one that's already swinging. It only checks its stride.
    if (this.state !== STATE.MOVE || this.crawling) return;
    this.flinch(kind, poise);
  }

  flinch(kind, poise) {
    this.state = STATE.STAGGER; this.stateT = 0;
    this.stagger = poise > 50 || kind === 'puncture' ? 0.55 : 0.32;
    this.setClipOver(pick(this.hitClips), 0.08);
  }

  // A shield in the face knocks it off its stride, whatever it was doing, unless it's on the ground. by: who did it, if
  // not the player (one of the other Tessariels), so it turns on them and not on you.
  reel(sim, seconds, by = null) {
    this.onHit(sim, 'bash', by ? by.x : sim.player.x, by ? by.z : sim.player.z, 0, by);
    if (this.crawling || this.state === STATE.RISE || this.state === STATE.PLAYDEAD || this.state === STATE.DEAD) return;
    this.state = STATE.STAGGER; this.stateT = 0; this.stagger = seconds;
    this.setClipOver(pick(this.hitClips), 0.08);
  }

  alert(sim, r, by = null) {
    const who = by || sim.player;
    for (const k of sim.knights) {
      if (k === this || !(k instanceof Zombie) || k.dead) continue;
      const d = Math.hypot(k.x - this.x, k.z - this.z);
      if (d > r) continue;
      if (k.state === STATE.PLAYDEAD && d > r * 0.5) continue;
      k.aggro = true; k.lastX = who.x; k.lastZ = who.z; k.lastSense = sim.time;
      if (by) { k.heroFoe = by; k.heroFoeT = sim.time; }
      if (k.goal !== GOAL.CHASE) k.goal = GOAL.HUNT;
      if (k.state === STATE.PLAYDEAD) k.wake();
    }
  }

  wake() { this.state = STATE.RISE; this.stateT = 0; this.setClip(this.riseClip); this.fade = 1; }

  die(sim) {
    this.dead = true; this.hp = 0; this.deadT = 0; this.attack = null; this.hostile = false;
    this.state = STATE.DEAD;
    if (!this.crawling) this.setClipOver(this.deathClip, 0.15);
    sim.event(EV.UNDEAD_DIE, this.x, this.y + 0.4, this.z);
  }

  // ---- senses ---------------------------------------------------------------------------------------------

  sense(sim, p, d, toPlayer) {
    const { sight, hear } = this.senses;
    const dy = Math.abs(p.y - this.y);
    const facing = Math.cos(wrapAngle(toPlayer - this.yaw));
    const eye = this.crawling ? 0.4 : 1.5 * this.scale;
    const seen = !this.headless && d < sight && dy < 2.6 && (facing > 0.2 || d < 2.5) && sim.world.sees(this.x, this.y + eye, this.z, p.x, p.y + 1.5, p.z);
    const pace = Math.hypot(p.vx, p.vz);
    let loud = pace > 5 ? 15 : pace > 1 ? 7.5 : 2.2;
    if (p.swinging) loud = Math.max(loud, 14);
    loud *= hear * (this.headless ? 1.6 : 1);
    const heard = d < loud;
    if (seen || heard) { this.lastX = p.x; this.lastZ = p.z; }
    if (seen) {
      if (!this.aggro) {
        this.aggro = true; this.hostile = true;
        this.groan(sim, 1);
        this.alert(sim, 18);
      }
      this.goal = GOAL.CHASE; this.lastSense = sim.time;
    } else if (heard) {
      this.hostile = true;
      if (this.aggro && this.goal === GOAL.CHASE) this.lastSense = sim.time;
      else if (this.goal !== GOAL.CHASE) this.goal = GOAL.HUNT;
      this.wanderT = 0;
    } else if (this.goal === GOAL.CHASE && sim.time - this.lastSense > 1.2) {
      this.goal = GOAL.HUNT;
    }
    if (this.goal === GOAL.CHASE) {
      let n = 0;
      for (const k of sim.knights) if (k !== this && k instanceof Zombie && !k.dead && k.goal === GOAL.CHASE && Math.hypot(k.x - p.x, k.z - p.z) < 12) n++;
      this.chasers = n;
    }
  }

  groan(sim, loud) {
    if (this.headless || sim.time - (sim.groanAt ?? -9) < 0.35) return;
    sim.groanAt = sim.time;
    sim.event(EV.GROAN, this.x, this.y + 1.5 * this.scale, this.z, loud * this.scale);
  }

  // ---- each tick --------------------------------------------------------------------------------------------

  update(dt, sim) {
    if (this.dormant) return;
    // (Frozen stiff, a body run out of life still falls.)
    if (dt <= 0) { if (!this.dead && this.hp <= 0) this.die(sim); return; }
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt / this.fadeTime);
    if (this.fade >= 1) this.fadeTime = 0.2;
    const p = foeOf(this, sim);
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz), toPlayer = Math.atan2(dx, dz);
    this.heart += dt * 0.9;
    const blow = this.seenHp - this.hp;
    if (blow > 0.01 && !this.dead) this.takeBlow(sim, blow);
    if (this.bleeds.length && !this.dead) { let f = 0; for (const b of this.bleeds) f += b.rate; this.hp -= dt * f * 2.2; }
    this.seenHp = this.hp;
    if (this.hp <= 0 && !this.dead) this.die(sim);
    this.cool = Math.max(0, this.cool - dt);
    this.pounceCool = Math.max(0, this.pounceCool - dt);
    this.rush = Math.max(0, this.rush - dt);

    if (this.dead) {
      this.thinkDead(dt, sim);
    } else {
      const hunting = !p.dead && sim.gameState === 0;
      if (!hunting) { this.goal = GOAL.WANDER; this.aggro = false; this.hostile = false; } else {
        this.senseT -= dt;
        if (this.senseT <= 0 && this.state !== STATE.PLAYDEAD) {
          this.senseT = d > 32 ? 0.6 : 0.25;
          this.sense(sim, p, d, toPlayer);
        }
      }
      this.groanT -= dt;
      if (this.groanT <= 0 && d < 40) { this.groanT = this.aggro ? rnd(3, 8) : rnd(9, 22); this.groan(sim, this.aggro ? 0.8 : 0.5); }
      switch (this.state) {
        case STATE.PLAYDEAD:
          this.t = 0; this.halt(dt);
          this.yaw = this.opts.yaw;
          if (hunting && d < 4.2) { this.wake(); this.aggro = true; this.hostile = true; this.goal = GOAL.CHASE; this.lastX = p.x; this.lastZ = p.z; this.groan(sim, 1); sim.event(EV.DIRT, this.x, this.y, this.z, 0.6); }
          break;
        case STATE.RISE: this.thinkRise(dt, sim, p, d); break;
        case STATE.STAGGER:
          this.halt(dt);
          this.t += dt;
          if (this.stateT >= this.stagger) this.setState(STATE.MOVE);
          break;
        case STATE.ATTACK: this.thinkAttack(dt, sim, p, d, toPlayer); break;
        case STATE.CAST: this.thinkCast(dt, sim, p, d, toPlayer); break;
        default: this.think(dt, sim, p, d, toPlayer, hunting);
      }
    }
    if (!this.dormant) this.settle(dt, sim);
  }

  settle(dt, sim) {
    this.x += this.vx * dt; this.z += this.vz * dt;
    tv[0] = this.x; tv[2] = this.z;
    sim.world.resolve(tv, 0.32 * this.scale, this.y + 0.5);
    this.x = tv[0]; this.z = tv[2];
    this.y = sim.world.height(this.x, this.z) + this.sink;
    this.stepChunks(dt, sim);
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT[0] = this.x; this.rig.rootT[1] = this.y; this.rig.rootT[2] = this.z;
  }

  thinkDead(dt, sim) {
    this.deadT += dt;
    this.vx = damp(this.vx, 0, 5, dt); this.vz = damp(this.vz, 0, 5, dt);
    const c = this.rig.clips[this.clip];
    if (!c.loop) this.t = Math.min(this.t + dt, c.dur);
    // They lie a while, then the ground takes them, and that body can get up again somewhere else.
    if (this.deadT > 60) this.sink -= dt * 0.12 * this.scale;
    if (this.deadT > 66) { this.dormant = true; this.looted = true; }
  }

  thinkRise(dt, sim, p, d) {
    this.halt(dt);
    const c = this.rig.clips[this.clip];
    this.t += dt * this.riseRate;
    this.sink = Math.min(0, this.sink + dt * this.riseLift);
    this.dirtT -= dt;
    if ((this.stateT < 1.6 || this.sink < -0.05) && this.dirtT <= 0 && this.opts.summoned !== false) { this.dirtT = 0.14; sim.event(EV.DIRT, this.x, this.y, this.z, this.sink < -0.3 ? 0.5 : 0.3); }
    if (this.t >= c.dur) {
      this.sink = 0; this.hostile = true; this.riseRate = 1; this.riseLift = 0.5;
      this.setState(STATE.MOVE); this.setClip(this.idleClip);
      if (d < 28 && this.aggro) this.goal = GOAL.CHASE;
    }
  }

  halt(dt) {
    this.vx = damp(this.vx, 0, 8, dt); this.vz = damp(this.vz, 0, 8, dt);
    this.speed = Math.hypot(this.vx, this.vz);
  }

  // How fast its stride carries it at this speed: the clip plays to match, so feet stay on the ground.
  stride(name, speed, dt, sim) {
    this.setClip(name);
    const c = this.rig.clips[name], base = (c.speed || 0.5) * this.scale;
    const rate = clamp(speed / base, 0.25, 2.4);
    this.t += dt * rate;
    this.stepClock += dt * rate * 2 / c.dur;
    if (this.stepClock > 1 && speed > 0.1 && !this.crawling) {
      this.stepClock -= 1;
      sim.event(EV.STEP, this.x, this.y, this.z, clamp(speed / 4 * this.scale, 0.25, 1), 2, this.id);
    }
  }

  // Heads for a spot, turning as fast as it can turn and slowing for what it has to turn through.
  steer(dt, sim, ax, az, speed, rate) {
    let want = Math.atan2(ax, az);
    this.stuckT -= dt;
    if (this.stuckT <= 0) {
      const moved = Math.hypot(this.x - this.stuckX, this.z - this.stuckZ);
      if (moved < 0.15 * speed && speed > 0.2) { this.sideT = 0.9; this.sideA = Math.random() < 0.5 ? 1.3 : -1.3; this.wanderT = 0; }
      this.stuckT = 1; this.stuckX = this.x; this.stuckZ = this.z;
    }
    if (this.sideT > 0) { this.sideT -= dt; want += this.sideA; }
    const err = wrapAngle(want - this.yaw);
    this.yaw = turn(this.yaw, want, rate * dt);
    const v = speed * Math.max(0.25, Math.cos(err));
    const k = 1 - Math.exp(-7 * dt);
    this.vx += (Math.sin(this.yaw) * v - this.vx) * k; this.vz += (Math.cos(this.yaw) * v - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
  }

  think(dt, sim, p, d, toPlayer, hunting) {
    const S = this.scale;
    const clipSpeed = (name) => (this.rig.clips[name].speed || 0.5) * S * this.pace;
    const walk = clipSpeed(this.walkClip) * this.walkPush * (this.hobble ? 0.65 : 1);
    const arms = this.arms;
    const turnRate = this.crawling ? 1.9 : this.senses.turn;
    const moveAs = (speed, tx, tz, useField) => {
      let ax = tx - this.x, az = tz - this.z;
      if (useField) {
        sim.world.updateField(p.x, p.z, sim.time, p === sim.player ? 0 : p);
        sim.world.flow(flow, this.x, this.z, p.x, p.z, p === sim.player ? 0 : p);
        ax = flow[0]; az = flow[1];
      }
      this.steer(dt, sim, ax, az, speed, turnRate);
    };
    switch (this.goal) {
      case GOAL.CHASE: {
        if (this.tryAttack(sim, p, d, toPlayer)) return;
        const reach = this.stopAt();
        if (d < reach) {
          this.halt(dt);
          this.yaw = turn(this.yaw, toPlayer, turnRate * dt);
          this.setClip(this.crawling ? 'crawl' : this.idleClip);
          this.t += dt * (this.crawling ? 0.2 : 1);
          return;
        }
        if (this.crawling) {
          const v = (0.26 + 0.27 * arms) * S;
          moveAs(v, p.x, p.z, true);
          this.stride('crawl', v, dt, sim);
          return;
        }
        const runs = this.runClip && !this.hobble && !this.headless && (d < 13 || this.rush > 0) && d > 1.7;
        let tx = p.x, tz = p.z, field = true;
        if (this.headless) {
          // No eyes, so it goes wide of where it thinks you are.
          const off = Math.min(3, 0.35 * d) * Math.sin(sim.time * 0.7 + this.id);
          tx += Math.cos(toPlayer) * off; tz -= Math.sin(toPlayer) * off; field = false;
        } else if (this.rush <= 0 && this.style === 'stalker' && d > 2.6 && d < 9.5) {
          // Works round at a distance, and comes in when your back's turned or someone else has your attention.
          this.orbit += dt;
          const eyes = Math.abs(wrapAngle(Math.atan2(this.x - p.x, this.z - p.z) - p.yaw)) < 0.8;
          if (!eyes || this.chasers > 1 || this.orbit > 9) { this.rush = 3; this.orbit = 0; } else {
            const a = Math.atan2(this.x - p.x, this.z - p.z) + (this.flank || 1) * 0.5;
            tx = p.x + Math.sin(a) * 6.5; tz = p.z + Math.cos(a) * 6.5; field = false;
          }
        } else if (this.style === 'flanker' && d > 2.4 && d < 12) {
          const s = this.flank || 1;
          tx += Math.cos(p.yaw) * 2.2 * s - Math.sin(p.yaw) * 1.2; tz += -Math.sin(p.yaw) * 2.2 * s - Math.cos(p.yaw) * 1.2; field = false;
        } else if (this.chasers > 2 && d > 2.4 && d < 10 && this.flank) {
          const off = Math.min(2.6, 0.45 * d) * this.flank;
          tx += Math.cos(toPlayer) * off; tz -= Math.sin(toPlayer) * off; field = false;
        }
        const speed = runs ? clipSpeed(this.runClip) : this.rush > 0 ? walk * 1.9 : this.headless ? Math.min(walk * 1.05, walk * 1.1) : walk * 1.05;
        moveAs(speed, tx, tz, field);
        this.stride(runs ? this.runClip : this.walkClip, this.speed, dt, sim);
        return;
      }
      case GOAL.HUNT: {
        const left = Math.hypot(this.lastX - this.x, this.lastZ - this.z);
        if (left < 1.3) { this.goal = GOAL.SEARCH; this.searchT = rnd(7, 12); this.wanderT = 0; break; }
        const v = this.crawling ? 0.42 * S : walk;
        moveAs(v, this.lastX, this.lastZ, false);
        this.stride(this.crawling ? 'crawl' : this.walkClip, this.speed, dt, sim);
        return;
      }
      case GOAL.SEARCH: {
        this.searchT -= dt; this.wanderT -= dt;
        if (this.searchT <= 0) { this.goal = GOAL.WANDER; this.aggro = false; this.wanderT = 0; break; }
        if (this.wanderT <= 0) { this.wanderT = rnd(2.5, 4.5); this.wx = this.lastX + rnd(-4, 4); this.wz = this.lastZ + rnd(-4, 4); }
        const v = this.crawling ? 0.32 * S : walk * 0.9;
        if (Math.hypot(this.wx - this.x, this.wz - this.z) < 0.6) { this.halt(dt); this.setClip(this.crawling ? 'crawl' : this.idleClip); this.t += dt * (this.crawling ? 0.2 : 1); return; }
        moveAs(v, this.wx, this.wz, false);
        this.stride(this.crawling ? 'crawl' : this.walkClip, this.speed, dt, sim);
        return;
      }
      default:
    }
    // Nothing on its mind.
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = rnd(5, 12);
      this.moving = Math.random() < 0.65;
      // A servant's home is wherever its master has got to.
      const master = this.owner && !this.owner.dead ? [this.owner.x, this.owner.z] : null;
      if (master) { this.wanderT = rnd(2, 4); this.moving = true; }
      const home = master || this.home;
      for (let i = 0; i < 6; i++) {
        this.wx = home[0] + rnd(-6, 6); this.wz = home[1] + rnd(-6, 6);
        if (!sim.world.inside(this.wx, this.wz, 0.5)) break;
      }
    }
    if (this.moving && Math.hypot(this.wx - this.x, this.wz - this.z) > 0.7) {
      const v = this.crawling ? 0.32 * S : walk * 0.85;
      moveAs(v, this.wx, this.wz, false);
      this.stride(this.crawling ? 'crawl' : this.walkClip, this.speed, dt, sim);
    } else {
      this.halt(dt);
      this.setClip(this.crawling ? 'crawl' : this.idleClip);
      this.t += dt * (this.crawling ? 0.2 : 1);
    }
  }

  stopAt() { return (this.crawling ? 0.95 : 1.1) * this.scale; }

  // ---- blows of its own ----------------------------------------------------------------------------------

  tryAttack(sim, p, d, toPlayer) {
    const S = this.scale, err = Math.abs(wrapAngle(toPlayer - this.yaw));
    if (p.dead || Math.abs(p.y - this.y) > 1.2 * S || sim.world.rayBoxes(this.x, this.y + 1, this.z, Math.sin(toPlayer), 0, Math.cos(toPlayer), Math.max(d - 0.3, 0.01)) > 0) return false;
    if (this.crawling) {
      if (this.cool <= 0 && d < 1.55 * S && err < 0.6 && (this.armR || !this.headless)) { this.startAttack(sim, 'crawl_attack'); return true; }
      return false;
    }
    // A leap, from further out.
    if (this.runClip && !this.hobble && !this.headless && this.arms === 2 && this.pounceCool <= 0 && d > 2.6 * S && d < (this.style === 'pouncer' ? 3.8 : 3.3) * S && err < 0.3) {
      this.pounceCool = rnd(4, 8);
      this.startAttack(sim, 'attack_pounce');
      return true;
    }
    if (this.cool > 0 || err > 0.6) return false;
    const can = [];
    if (d < 1.95 * S && this.arms === 2) can.push('attack_flurry');
    if (d < 1.5 * S) {
      if (this.armR) can.push('attack_rake', 'attack_rake');
      if (!this.headless) can.push('attack_bite');
    }
    if (!can.length) return false;
    this.startAttack(sim, pick(can));
    return true;
  }

  startAttack(sim, name) {
    // Only so many at your throat at once: the rest jostle and look for a gap, so a crowd is a threat and not a blender.
    if (this.style !== 'caster' && sim.knights.filter((k) => k instanceof Zombie && !k.dead && k.state === STATE.ATTACK && k.style !== 'caster').length >= MELEE_AT_ONCE) { this.cool = 0.3; return; }
    // And never two landing together: a beat between blows, to read and to answer.
    if (this.style !== 'caster') { if (sim.time - (sim.lastMeleeAt ?? -9) < 0.25) { this.cool = 0.15; return; } sim.lastMeleeAt = sim.time; }
    this.setClipOver(name, 0.14);
    this.attack = BLOWS[name];
    this.attackMeta = this.rig.clips[name];
    this.reach = (this.attackMeta.reach || BLOWS[name].reach || 1.2) * this.scale;
    this.state = STATE.ATTACK; this.stateT = 0;
    this.activeOn = -1; this.used = false;
    this.hostile = true;
    this.groan(sim, 0.8);
  }

  thinkAttack(dt, sim, p, d, toPlayer) {
    const a = this.attack, c = this.rig.clips[this.clip];
    this.t += dt;
    const f = this.t * 30, first = a.windows[0][0];
    // (Square on to its mark by the time the blow falls: it used to turn too slowly to finish, and swung beside them.)
    if (f < first) this.yaw = turn(this.yaw, toPlayer, 7 * dt);
    // Its clip's own travel, and whatever else it takes to bring the blow home. It never comes closer than the blow reaches from.
    let v = 0;
    const root = this.attackMeta.root;
    if (root && f >= root.start && f < root.end) {
      const k = root.ramp, span = root.end - root.start, u = f - root.start;
      v = root.dist / ((span - k) / 30) * Math.min(1, (u + 0.5) / Math.max(k, 1), (span - u + 0.5) / Math.max(k, 1)) * this.scale;
    }
    if (f < first && d > this.reach + 0.05) v = Math.max(v, 1.4 * this.scale);
    if (d < this.reach - 0.05) v = 0;
    this.vx = Math.sin(this.yaw) * v; this.vz = Math.cos(this.yaw) * v;
    this.speed = 0;
    const w = a.windows.findIndex((x) => f >= x[0] && f <= x[1]);
    if (w >= 0) {
      if (this.activeOn !== w) { this.activeOn = w; this.used = false; }
      if (!this.used && !p.dead && !p.iframes && d < this.reach + 0.75 * this.scale && Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.2 && Math.abs(p.y - this.y) < 1.7 * this.scale) {
        this.used = true; this.bites++;
        const dmg = a.dmg * this.dmgScale;
        if (p.damage(sim, dmg, this.x, this.z, this.scale > 1.2 ? 4 : 0) && p === sim.player) sim.event(EV.HURT, p.x, p.y + 1.1, p.z, dmg);
      }
    }
    if (this.t >= c.dur) {
      this.attack = null; this.cool = rnd(0.35, 0.75);
      this.setState(STATE.MOVE);
      this.setClip(this.crawling ? 'crawl' : this.idleClip);
    }
  }

  write(snap, cOff, sim) {
    if (this.dormant) { snap[cOff + C.ACTIVE] = 0; snap[cOff + C.CUT] = 0; return; }
    super.write(snap, cOff, sim);
    snap[cOff + C.CUT] = this.cutMask;
  }

  writeGashes(snap, cOff, sim) { if (!this.dormant) super.writeGashes(snap, cOff, sim); }
}

// ---- those who command them -------------------------------------------------------------------------------

// Each kind's book, and when it reaches for what. A score is how good an idea it looks right now; what's on the table is worked out
// once when it decides, with the best of it taken, give or take a little. Each spell has its own wait after it's been cast, so nobody
// repeats themselves. Combos are what comes straight after, without a breath.
const low = (s) => s.hurt < 0.45;
const WIZARD = [
  { spell: 'bolt', wait: [1.5, 3], score: (s) => (s.sees ? 1 : 0) },
  { spell: 'prism', wait: [5, 8], score: (s) => (s.sees && s.d > 5 ? 2.2 : 0) },
  { spell: 'crown', wait: [13, 18], score: (s) => (s.sees && s.d < 22 ? 2.6 : 0) },
  { spell: 'fallingSky', wait: [13, 19], score: (s) => (s.sees && s.d > 7 ? 2 + (s.d > 14 ? 1 : 0) + (s.running ? 0 : 1) : 0) },
  { spell: 'stormCage', wait: [17, 24], score: (s) => (s.sees && s.d > 6 && s.d < 24 ? 3 : 0), then: ['fallingSky', 'prism'] },
  { spell: 'searingRay', wait: [11, 16], score: (s) => (s.sees && s.d > 5 && s.d < 20 ? 2.7 : 0) },
  { spell: 'slowStar', wait: [16, 22], score: (s) => (s.sees && low(s) ? 4 : 0) },
  { spell: 'ward', wait: [14, 20], score: (s) => (s.hurtLately && s.k.ward <= 0 ? 3.4 : 0) },
  { spell: 'hound', wait: [6, 9], score: (s) => (!s.sees && s.d < 45 ? 4 : 0) },
];
const NECROMANCER = [
  { spell: 'bolt', wait: [1.6, 3.2], score: (s) => (s.sees ? 1 : 0) },
  { spell: 'graveRite', wait: [14, 20], score: (s) => (s.minions < 2 && s.d > 4 && s.d < 30 && s.spare ? 4 : 0) },
  { spell: 'boneCage', wait: [17, 24], score: (s) => (s.sees && s.d > 4 && s.d < 24 ? 3.1 : 0), then: ['graveRite'] },
  { spell: 'boneFurrow', wait: [5, 8], score: (s) => (s.sees && s.d > 4 && s.d < 22 ? 2.4 : 0) },
  { spell: 'soulLeech', wait: [12, 17], score: (s) => (s.sees && s.d > 5 && s.d < 22 ? 2 + (low(s) ? 2 : 0) : 0) },
  { spell: 'wraiths', wait: [8, 12], score: (s) => (s.d < 26 && s.sees ? 2.3 : 0) },
  { spell: 'corpseBomb', wait: [8, 12], target: (s) => s.k.bombNearYou(s.sim), score: (s) => (s.bomb ? 3.6 : 0) },
  { spell: 'reap', wait: [14, 20], target: (s) => s.k.nearestMinion(14), score: (s) => (low(s) && s.nearMinion ? 5 : 0) },
];
const PLAGUEBEARER = [
  { spell: 'bolt', wait: [1.8, 3.4], score: (s) => (s.sees ? 0.8 : 0) },
  { spell: 'graveRite', wait: [14, 20], score: (s) => (s.minions < 2 && s.d > 4 && s.d < 30 && s.spare ? 4 : 0) },
  { spell: 'flask', wait: [3.5, 6], score: (s) => (s.d > 5 && s.d < 19 && s.sees ? 2.6 : 0) },
  { spell: 'bloom', wait: [10, 15], score: (s) => (s.sees && s.d > 4 && s.d < 28 ? 2.8 : 0) },
  { spell: 'locusts', wait: [15, 21], score: (s) => (s.d < 28 ? 2.4 + (s.running ? 0 : 0.8) : 0) },
  { spell: 'rotWave', wait: [9, 13], score: (s) => (s.d < 13 ? 3 + (s.d < 7 ? 1.5 : 0) : 0) },
  { spell: 'wraiths', wait: [9, 13], score: (s) => (s.d < 26 && s.sees ? 1.9 : 0) },
  { spell: 'corpseBomb', wait: [8, 12], target: (s) => s.k.bombNearYou(s.sim), score: (s) => (s.bomb ? 3.3 : 0) },
  { spell: 'reap', wait: [14, 20], target: (s) => s.k.nearestMinion(14), score: (s) => (low(s) && s.nearMinion ? 5 : 0) },
];
const BOOKS = { wizard: WIZARD, necromancer: NECROMANCER, plaguebearer: PLAGUEBEARER };
// How far off each likes to work, and how long between one thing and the next.
const MANNER = {
  wizard: { near: 9, far: 16, breath: [0.5, 1.2], walk: 'stride', dodge: 0.7 },
  necromancer: { near: 12, far: 20, breath: [0.9, 1.7], walk: 'walk', dodge: 0.25 },
  plaguebearer: { near: 8, far: 15, breath: [0.9, 1.8], walk: 'walk', dodge: 0.2 },
};
const palm = [0, 0, 0];

export function corpsesNear(sim, k, r) {
  const found = [];
  for (const m of sim.knights) {
    if (!(m instanceof Zombie) || m instanceof Caster || m.scale > 1.2 || !m.dead || m.dormant || m.doomed) continue;
    const d = Math.hypot(m.x - k.x, m.z - k.z);
    if (d < r && m.deadT > 1.5 && m.deadT < 40) found.push(m);
  }
  return found;
}

export class Caster extends Zombie {
  takes(opts) {
    const role = opts.role;
    this.senses = { sight: 32, hear: 1.1, turn: 3.2 };
    this.style = 'caster';
    this.manner = MANNER[role]; this.book = BOOKS[role];
    this.walkClip = this.manner.walk; this.runClip = 'run';
    this.idleClip = 'idle'; this.riseClip = 'idle'; this.deathClip = 'death'; this.hitClips = ['hit', 'hit_head'];
    this.walkPush = 1.6;
    this.dmgScale = 1;
    this.waits = {}; this.minions = []; this.queue = []; this.casting = null; this.ward = 0; this.caged = null;
    this.breath = rnd(0.6, 2); this.blinkT = 2; this.blinkAsk = false; this.lastHurtAt = -99; this.seenBolts = new WeakSet();
    this.spot = null; this.spotT = 0; this.strain = 0; this.steadyT = 0;
    this.vigil = { kind: 'go', t: 0, x: opts.spawn[0], z: opts.spawn[1] }; this.revealed = false;
  }

  get canCast() { return !this.crawling && !this.headless && (this.armL || this.armR); }

  // Where a spell starts from: the hand the clip raises, which is the left. A throw is the right's. It makes do with whichever is left.
  handAt(right = false) {
    const name = (right ? this.armR : !this.armL) ? 'hand_r' : 'hand_l', j = this.jointOf(name), wt = this.rig.wt;
    palm[0] = wt[j * 3]; palm[1] = wt[j * 3 + 1]; palm[2] = wt[j * 3 + 2];
    return palm;
  }

  nearestMinion(r) {
    let best = null, bd = r;
    for (const m of this.minions) {
      if (m.dead || m.owner !== this || m.doomed) continue;
      const d = Math.hypot(m.x - this.x, m.z - this.z);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  // Something near you with a body to give: on its feet, or lying where it fell.
  bombNearYou(sim) {
    const p = sim.player;
    let best = null, bd = 9;
    for (const m of sim.knights) {
      if (!(m instanceof Zombie) || m instanceof Caster || m.scale > 1.2 || m.dormant || m.doomed) continue;
      if (m.dead ? m.deadT > 40 : m.owner !== this) continue;
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  // Down on the ground it claws like the rest. On its feet it has no blows of its own to swing.
  tryAttack(sim, p, d, toPlayer) { return this.crawling && super.tryAttack(sim, p, d, toPlayer); }

  sever(sim, part) {
    super.sever(sim, part);
    // Nothing goes on casting without a head.
    if (part === P.HEAD && !this.dead) this.die(sim);
  }

  die(sim) {
    this.stopCasting();
    super.die(sim);
    lastRite(this, sim);
  }

  takeBlow(sim, amount) {
    if (this.ward > 0) {
      const soak = Math.min(this.ward, amount);
      this.ward -= soak;
      sim.casting.burst(FX.SHOCK, ELEM.ARCANE, this.x, this.y + 1.05, this.z, 1.1, 1.5, 0.16, { alpha: 1, light: 10, lightR: 4 });
      if (amount - soak <= 0.01) { this.hp = this.seenHp; this.rayPiece = -1; return; }
      amount -= soak;
    }
    // (The dead are soft to spells, at twice what they do. Those who cast them aren't.)
    super.takeBlow(sim, this.rayPiece < 0 ? amount * 0.5 : amount);
  }

  // Burns and scratches don't check it, and nor does anything so soon after the last time.
  flinch(kind, poise) {
    if ((poise < 18 && kind !== 'puncture') || this.steadyT > 0) return;
    this.steadyT = 2.5;
    super.flinch(kind, poise);
  }

  onHit(sim, kind, fromX, fromZ, poise = 0, by = null) {
    super.onHit(sim, kind, fromX, fromZ, poise, by);
    this.lastHurtAt = sim.time;
    if (Math.random() < 0.3) this.blinkAsk = true;
    // A blow or two in the middle of a working, and it's lost. A throw's already gone.
    const s = this.casting;
    if (this.state === STATE.CAST && s && s.def.how !== 'lob' && s.phase !== 'release' && s.phase !== 'out' && poise > 0 && this.steadyT <= 0) {
      this.strain += 1 + poise / 40 + (kind === 'puncture' ? 0.5 : 0);
      if (this.strain >= 2) this.interrupt(sim);
    }
  }

  stopCasting() { if (this.casting) { this.casting.token.live = false; this.casting = null; } }

  interrupt(sim) {
    const e = this.casting.def.elem(this), h = this.handAt();
    sim.casting.burst(FX.FLARE, e, h[0], h[1], h[2], 0.4, 1.1, 0.2, { alpha: 1.1, light: 14, lightR: 5 });
    sim.event(EV.SPELL_FIZZLE, h[0], h[1], h[2]);
    this.stopCasting();
    this.queue.length = 0;
    this.steadyT = 4;
    this.state = STATE.STAGGER; this.stateT = 0; this.stagger = 0.75;
    this.setClipOver('knock', 0.08);
    this.breath = rnd(0.3, 0.8);
  }

  // A shield in the face, or a parried clap, loses whatever it was working.
  reel(sim, seconds) {
    if (this.casting) this.interrupt(sim);
    super.reel(sim, seconds);
  }

  // Wherever it is in a working, frozen stiff it's dropped.
  update(dt, sim) {
    if (dt <= 0 && this.casting) this.casting.token.live = false;
    this.steadyT = Math.max(0, this.steadyT - dt);
    super.update(dt, sim);
  }

  // Three things on its mind, in turn: you, the last it knew of you, and its own business.
  think(dt, sim, p, d, toPlayer, hunting) {
    if (!this.canCast) { super.think(dt, sim, p, d, toPlayer, hunting); return; }
    // Knocked out of a working by something else: it picks itself up and thinks again.
    if (this.casting) { this.stopCasting(); this.breath = rnd(0.3, 0.8); }
    this.blinkT -= dt; this.breath -= dt;
    for (const w in this.waits) this.waits[w] -= dt;
    if (this.goal === GOAL.CHASE) this.fight(dt, sim, p, d, toPlayer);
    else if (this.goal === GOAL.HUNT || this.goal === GOAL.SEARCH) this.seek(dt, sim, p, d, toPlayer);
    else this.keepVigil(dt, sim, p, d);
  }

  // ---- in a fight -----------------------------------------------------------------------------------------------

  fight(dt, sim, p, d, toPlayer) {
    const sees = sim.world.sees(this.x, this.y + 1.5, this.z, p.x, p.y + 1.5, p.z);
    if (this.react(sim, p, d, toPlayer)) return;
    if (this.queue.length && this.breath <= 0.4) {
      const next = this.queue.shift();
      if ((this.waits[next] || 0) <= 0 && sees) { this.begin(sim, this.book.find((b) => b.spell === next), null); return; }
    }
    if (this.breath <= 0 && this.decide(sim, p, d, sees)) return;
    this.reposition(dt, sim, p, d, toPlayer, sees);
  }

  // What it can't wait for. A blade at its throat; a spell on its way. Getting clear comes before anything else.
  react(sim, p, d, toPlayer) {
    if (this.blinkT > 0) return false;
    // It watches what you throw, and sometimes it isn't there when it lands.
    for (const b of sim.casting.bolts) {
      if (this.seenBolts.has(b)) continue;
      const ax = this.x - b.x, ay = this.y + 1.1 - b.y, az = this.z - b.z, L = Math.hypot(ax, ay, az);
      if (L > 11 || L < 0.01) continue;
      const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
      if ((ax * b.vx + ay * b.vy + az * b.vz) / (L * sp) < 0.94) continue;
      this.seenBolts.add(b);
      if (Math.random() < this.manner.dodge) { this.blinkAcross(sim, b.vx / sp, b.vz / sp, p, toPlayer); return true; }
    }
    if (d >= 3 && !this.blinkAsk) return false;
    this.blinkAsk = false;
    const role = this.opts.role;
    if (role === 'wizard') {
      // With its back to nobody: comes out behind you, and hits you with the clap before you've turned.
      if (d < 4 && (this.waits.thunderclap || 0) <= 0 && this.ambush(sim, p)) { this.waits.thunderclap = rnd(8, 12); this.begin(sim, { spell: 'thunderclap', wait: [8, 12] }, null); this.breath = 0; return true; }
      return this.blink(sim, p, toPlayer);
    }
    // A servant takes its place, if there's one to take it.
    const m = this.nearestMinion(16);
    if (m && d < 4) { this.swap(sim, m); return true; }
    return this.blink(sim, p, toPlayer);
  }

  decide(sim, p, d, sees) {
    const hurtLately = sim.time - this.lastHurtAt < 2.5;
    const look = {
      k: this, sim, p, d, sees, hurt: this.hp / this.maxHp, hurtLately, running: Math.hypot(p.vx, p.vz) > 3.2,
      minions: (this.minions = this.minions.filter((m) => !m.dead && m.owner === this)).length,
      nearMinion: !!this.nearestMinion(14), bomb: !!this.bombNearYou(sim), spare: this.anyToRaise(sim),
    };
    let best = null, top = 0;
    for (const b of this.book) {
      if ((this.waits[b.spell] || 0) > 0) continue;
      if (FOE[b.spell].big && sim.time < sim.foeBigAt) continue;
      const v = b.score(look);
      if (v <= 0) continue;
      const scored = v + Math.random() * 1.1;
      if (scored > top) { top = scored; best = b; }
    }
    if (!best) return false;
    this.begin(sim, best, best.target ? best.target(look) : null);
    return true;
  }

  anyToRaise(sim) { return sim.knights.some((k) => k instanceof Zombie && !(k instanceof Caster) && k.scale <= 1.2 && k.dead && (k.dormant || k.deadT > 1.5)); }

  begin(sim, entry, target) {
    this.waits[entry.spell] = rnd(entry.wait[0], entry.wait[1]) * (this.hp / this.maxHp < 0.45 ? 0.72 : 1);
    if (entry.then) this.queue = [entry.then[Math.floor(Math.random() * entry.then.length)]];
    this.startCast(sim, entry.spell, target);
  }

  // Finds a place to stand, at its distance, with you in sight and the way clear, and where you aren't looking if it can. It always walks facing the way it's going.
  reposition(dt, sim, p, d, toPlayer, sees) {
    const { near, far } = this.manner;
    if (!sees || d > far + 3) {
      const fast = d > far + 9;
      sim.world.updateField(p.x, p.z, sim.time, p === sim.player ? 0 : p);
      sim.world.flow(flow, this.x, this.z, p.x, p.z, p === sim.player ? 0 : p);
      this.steer(dt, sim, flow[0], flow[1], fast ? this.rig.clips.run.speed * this.pace : this.rig.clips[this.walkClip].speed * this.walkPush * this.pace, 3.2);
      this.stride(fast ? 'run' : this.walkClip, this.speed, dt, sim);
      return;
    }
    this.spotT -= dt;
    if (!this.spot || this.spotT <= 0 || d < near * 0.6) this.pickSpot(sim, p, near, far);
    if (this.spot) {
      const ax = this.spot.x - this.x, az = this.spot.z - this.z;
      if (Math.hypot(ax, az) > 0.7) {
        const fast = d < near * 0.75;
        this.steer(dt, sim, ax, az, fast ? this.rig.clips.run.speed * this.pace : this.rig.clips[this.walkClip].speed * this.walkPush * this.pace, 3.6);
        this.stride(fast ? 'run' : this.walkClip, this.speed, dt, sim);
        return;
      }
      this.spot = null; this.spotT = 0.5;
    }
    this.halt(dt);
    this.yaw = turn(this.yaw, toPlayer, 3.2 * dt);
    this.setClip(this.idleClip);
    this.t += dt;
  }

  pickSpot(sim, p, near, far) {
    let best = null, top = -1e9;
    const here = Math.atan2(this.x - p.x, this.z - p.z), wounded = this.hp / this.maxHp < 0.45, servants = this.minions.filter((m) => !m.dead);
    for (let i = 0; i < 10; i++) {
      const a = here + rnd(-1.6, 1.6), r = rnd(near, far), x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (sim.world.inside(x, z, 0.6)) continue;
      const y = sim.world.height(x, z), ax = x - this.x, az = z - this.z, L = Math.hypot(ax, az);
      if (Math.abs(y - this.y) > 1.8) continue;
      if (L > 0.5 && sim.world.rayBoxes(this.x, this.y + 1, this.z, ax / L, 0, az / L, L) > 0) continue;
      if (!sim.world.sees(x, y + 1.5, z, p.x, p.y + 1.5, p.z)) continue;
      // Out of the corner of your eye, not far to go, further off when it's hurt. A master stands with its servants between you and it.
      let v = -Math.cos(wrapAngle(a - p.yaw)) * 1.5 - L * 0.08 + (wounded ? r * 0.08 : 0);
      for (const m of servants) {
        const mx = m.x - p.x, mz = m.z - p.z, mL = Math.hypot(mx, mz) || 1;
        if (mL < r && Math.cos(Math.atan2(mx, mz) - a) > 0.85) v += 1;
      }
      if (v > top) { top = v; best = { x, z }; }
    }
    this.spot = best; this.spotT = rnd(2.8, 5);
  }

  // ---- having lost you ---------------------------------------------------------------------------------------------

  seek(dt, sim, p, d, toPlayer) {
    if (this.goal === GOAL.HUNT) {
      const ax = this.lastX - this.x, az = this.lastZ - this.z, left = Math.hypot(ax, az);
      if (left < 1.5) { this.goal = GOAL.SEARCH; this.searchT = rnd(7, 12); this.wanderT = 0; this.revealed = false; return; }
      this.steer(dt, sim, ax, az, this.rig.clips[this.walkClip].speed * this.walkPush * this.pace, 3.2);
      this.stride(this.walkClip, this.speed, dt, sim);
      return;
    }
    this.searchT -= dt;
    if (this.searchT <= 0) { this.goal = GOAL.WANDER; this.aggro = false; return; }
    // Having got there, a wizard goes looking the quick way.
    if (!this.revealed && this.opts.role === 'wizard') { this.revealed = true; this.startCast(sim, 'reveal'); return; }
    // Otherwise a turn on the spot, looking about, and it sends whatever it has on ahead.
    if (Math.random() < dt * 0.3) for (const m of this.minions) if (!m.dead && m.goal !== GOAL.CHASE) { m.aggro = true; m.goal = GOAL.HUNT; m.lastX = this.lastX + rnd(-6, 6); m.lastZ = this.lastZ + rnd(-6, 6); }
    this.halt(dt);
    this.yaw = wrapAngle(this.yaw + Math.sin(sim.time * 0.6 + this.id) * 1.2 * dt);
    this.setClip(this.idleClip);
    this.t += dt;
  }

  // Something found it: it knows where you are, whatever it can see.
  findAt(sim) {
    const p = sim.player;
    this.lastX = p.x; this.lastZ = p.z; this.lastSense = sim.time;
    this.aggro = true; this.hostile = true; this.goal = GOAL.CHASE;
    this.alert(sim, 18);
  }

  // ---- its own business --------------------------------------------------------------------------------------------

  // A necromancer goes from grave to grave, kneels, and now and then something gets up and follows it about. A wizard walks its rounds,
  // stops, folds its arms, and works at something in its hand.
  keepVigil(dt, sim, p, d) {
    const v = this.vigil, home = this.opts.spawn, wizard = this.opts.role === 'wizard';
    v.t -= dt;
    if (v.kind === 'go') {
      const ax = v.x - this.x, az = v.z - this.z;
      if (Math.hypot(ax, az) < 0.8 || v.t < -14) { v.kind = 'stay'; v.t = wizard ? rnd(4, 7) : rnd(7, 11); v.done = false; return; }
      this.steer(dt, sim, ax, az, this.rig.clips[this.walkClip].speed * this.pace * 1.25, 2.4);
      this.stride(this.walkClip, this.speed, dt, sim);
      return;
    }
    this.halt(dt);
    if (v.kind === 'work') {
      this.setClip('cast_hold');
      const h = this.handAt();
      sim.casting.fx(FX.FLARE, this.opts.boltElem, h[0], h[1], h[2], 0.09 + 0.03 * Math.sin(sim.time * 5), 0, 1, 0, 0, 0.8, 3, 3, 0.5, this.id * 0.1);
    } else this.setClip(wizard ? 'guard' : 'tend');
    this.t += dt;
    // A servant, from the grave it's kneeling at, if the ground has one to spare.
    if (!wizard && !v.done && v.t < 2.5) {
      v.done = true;
      this.minions = this.minions.filter((m) => !m.dead && m.owner === this);
      if (this.minions.length < 2 && d < 90) {
        const a = this.yaw + rnd(-1, 1), x = this.x + Math.sin(a) * 1.7, z = this.z + Math.cos(a) * 1.7;
        if (!sim.world.inside(x, z, 0.5)) {
          const m = raiseZombie(sim, x, z, this, true);
          if (m) {
            this.minions.push(m);
            sim.casting.burst(FX.RUNE, ELEM.VOID, x, sim.world.height(x, z) + 0.03, z, 0.4, 1.3, 1.2, { alpha: 0.85, light: 7, lightR: 5 });
            sim.event(EV.CHANT, this.x, this.y + 1.2, this.z);
          }
        }
      }
    }
    if (v.t > 0) return;
    if (wizard && v.kind === 'stay' && Math.random() < 0.6) { v.kind = 'work'; v.t = rnd(3, 5); return; }
    for (let i = 0; i < 6; i++) {
      v.x = home[0] + rnd(-9, 9); v.z = home[1] + rnd(-9, 9);
      if (!sim.world.inside(v.x, v.z, 0.6)) break;
    }
    v.kind = 'go'; v.t = 0;
  }

  // ---- a working, from the hand going up to the hand coming down -------------------------------------------------------

  startCast(sim, name, target = null) {
    const def = FOE[name];
    this.casting = { name, def, target, phase: 'in', t: 0, fired: false, token: { live: true, end: false } };
    if (def.big) sim.foeBigAt = sim.time + 2.5;
    this.state = STATE.CAST; this.stateT = 0;
    this.strain = 0;
    this.hostile = true;
    this.spot = null;
    if (def.how === 'lob') { this.casting.phase = 'release'; this.setClipOver('lob', 0.16); } else this.setClipOver('cast_in', 0.14);
    this.breath = 1e9;
  }

  fireCast(sim, p, d) {
    const s = this.casting;
    s.fired = true;
    const h = this.handAt(s.def.how === 'lob');
    sim.foeTarget = p === sim.player ? null : p;
    try { s.def.fire(this, sim, p, d, s.token, [h[0], h[1], h[2]], s.target); } finally { sim.foeTarget = null; }
  }

  endCast() {
    this.stopCasting();
    this.state = STATE.MOVE; this.stateT = 0;
    this.setClipOver(this.idleClip, 0.2);
    this.breath = rnd(this.manner.breath[0], this.manner.breath[1]) * (this.hp / this.maxHp < 0.45 ? 0.7 : 1);
  }

  thinkCast(dt, sim, p, d, toPlayer) {
    const s = this.casting;
    if (!s || !s.token.live) { this.endCast(); return; }
    const def = s.def, clip = this.rig.clips[this.clip], e = def.elem(this);
    this.halt(dt);
    this.yaw = turn(this.yaw, toPlayer, 3 * dt);
    this.t += dt; s.t += dt;
    const next = (phase, name) => { s.phase = phase; s.t = 0; if (name !== this.clip) this.setClipOver(name, 0.12); };
    // Something gathers in the hand, for all to see, and the ground knows about it under a greater one.
    if (s.phase === 'in' || s.phase === 'charge') {
      const h = this.handAt(), grown = s.phase === 'in' ? s.t / clip.dur * 0.4 : 0.4 + 0.6 * s.t / Math.max(def.charge, 0.01);
      sim.casting.fx(FX.FLARE, e, h[0], h[1], h[2], 0.08 + 0.3 * grown, 0, 1, 0, 0, 0.9, 3 + 7 * grown, 4, 0.5, this.id * 0.1);
      sim.casting.fx(FX.ORB, e, h[0], h[1], h[2], 0.05 + 0.13 * grown, 0, 1, 0, 0, 1, 0, 0, 0, this.id * 0.2);
      if (def.big || def.ground) sim.casting.fx(FX.RUNE, e, this.x, sim.world.height(this.x, this.z) + 0.04, this.z, 1.1 + 0.6 * grown, 0, 1, 0, 0, 0.35 + 0.5 * grown, 2 + 8 * grown, 4, grown, this.id * 0.3);
    }
    switch (s.phase) {
      case 'in':
        if (this.t >= clip.dur) next('charge', 'cast_hold');
        break;
      case 'charge':
        if (s.t < def.charge) break;
        if (def.how === 'raise') { this.fireCast(sim, p, d); if (this.casting === s) next('channel', 'cast_hold'); } else next('release', 'bolt');
        break;
      case 'channel': {
        const h = this.handAt();
        sim.casting.fx(FX.FLARE, e, h[0], h[1], h[2], 0.2, 0, 1, 0, 0, 0.9, 5, 4, 0.5, this.id * 0.1);
        if (s.t >= def.hold || s.token.end) next('out', 'cast_out');
        break;
      }
      case 'release':
        // A throw lets go as the arm comes through, a bolt as soon as the hand kicks.
        if (!s.fired && this.t >= (def.how === 'lob' ? clip.dur * 0.34 : 0.05)) this.fireCast(sim, p, d);
        if (this.casting !== s) break; // (Parried as it left the hand.)
        if (this.t >= clip.dur * (def.how === 'lob' ? 0.82 : 0.9)) { if (def.how === 'lob') this.endCast(); else next('out', 'cast_out'); }
        break;
      default:
        if (this.t >= clip.dur) this.endCast();
    }
  }

  // ---- getting about ------------------------------------------------------------------------------------------------

  flash(sim, x, y, z, scale) {
    const e = this.opts.role === 'wizard' ? ELEM.ARCANE : ELEM.VOID;
    sim.casting.burst(FX.FLARE, e, x, y + 1, z, 0.5 * scale, 1.4 * scale, 0.3, { alpha: 1.2, light: 18, lightR: 8 });
    sim.event(EV.BLINK, x, y + 1, z);
  }

  place(sim, x, z) {
    this.flash(sim, this.x, this.y, this.z, 1);
    this.x = x; this.z = z; this.y = sim.world.height(x, z); this.vx = 0; this.vz = 0;
    this.spot = null;
    this.flash(sim, x, this.y, z, 1);
  }

  // Lands 8 to 13 m away on its own side of you, somewhere it can see you from. If there's nowhere, it stays put.
  blink(sim, p, toPlayer) {
    this.blinkT = rnd(6, 10);
    for (let i = 0; i < 16; i++) {
      const r = rnd(8, 13), a = toPlayer + Math.PI + rnd(-1.2, 1.2);
      const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (sim.world.inside(x, z, 0.5)) continue;
      if (!sim.world.sees(x, sim.world.height(x, z) + 1.5, z, p.x, p.y + 1.5, p.z)) continue;
      this.place(sim, x, z);
      return true;
    }
    return false;
  }

  // Out of the way of something coming at it, to one side of its line.
  blinkAcross(sim, dx, dz, p, toPlayer) {
    this.blinkT = rnd(3.5, 6);
    const side = Math.random() < 0.5 ? 1 : -1;
    for (const r of [5.5, 4, 3]) {
      for (const s of [side, -side]) {
        const x = this.x - dz * s * r, z = this.z + dx * s * r;
        if (sim.world.inside(x, z, 0.5) || Math.abs(sim.world.height(x, z) - this.y) > 1.5) continue;
        this.place(sim, x, z);
        this.yaw = turn(this.yaw, Math.atan2(p.x - x, p.z - z), 1.5);
        return;
      }
    }
    this.blink(sim, p, toPlayer);
  }

  // Right behind you.
  ambush(sim, p) {
    this.blinkT = rnd(5, 8);
    const x = p.x - Math.sin(p.yaw) * 3.3, z = p.z - Math.cos(p.yaw) * 3.3;
    if (sim.world.inside(x, z, 0.5) || Math.abs(sim.world.height(x, z) - p.y) > 1.2) return false;
    this.place(sim, x, z);
    this.yaw = Math.atan2(p.x - x, p.z - z);
    return true;
  }

  // It and one of its own, changing places, when you've got too close.
  swap(sim, m) {
    this.blinkT = rnd(5, 8);
    const x = m.x, z = m.z, mx = this.x, mz = this.z;
    this.place(sim, x, z);
    m.x = mx; m.z = mz; m.y = sim.world.height(mx, mz);
    m.rush = 2;
  }
}

export function raiseZombie(sim, x, z, owner, calm = false) {
  let body = null, oldest = 8;
  // (The road down from Lisandra's cave: its necromancers call up what's fallen round them, the freshest first, or else
  // one of the bodies kept for the road; and nobody else has those.)
  const road = !!owner?.opts.reserve;
  for (const k of sim.knights) {
    if (!(k instanceof Zombie) || k instanceof Caster || k.scale > 1.2 || !k.dead) continue;
    if (road) {
      if (k.dormant) { if (k.opts.reserve && !body) body = k; } else if (k.deadT > 1.5 && Math.hypot(k.x - x, k.z - z) < 30 && (!body || body.dormant || k.deadT < body.deadT)) body = k;
      continue;
    }
    if (k.opts.reserve) continue;
    if (k.dormant) { body = k; break; }
    if (k.deadT > oldest) { oldest = k.deadT; body = k; }
  }
  if (body) {
    body.raiseAt(sim, x, z, owner, calm);
    if (road) { const easy = EASY[body.opts.child ? 'child' : 'adult']; body.hp = body.maxHp = body.seenHp = easy.hp; body.dmgScale = easy.dmg; }
  }
  return body;
}

// ---- who's out there ----------------------------------------------------------------------------------------

// Where the woods' dead are buried: four old burial grounds out in the trees, three to each, 40 m and more off the roads and
// 70 m and more from the town. By the necromancer's post in the west woods, by the plague wood, in the hill woods by the fire
// wizard's, and in the pines south-west of where you start. (src/core/heroes.js PLACES sends the other Tessariels to them.)
const GRAVEYARDS = [[-128, -90], [100, -128], [-170, 70], [-62, 160]];
const GRAVE_ROW = [[0, 0], [2.4, 0.9], [-1.2, 2.6]];
function graveSpot(i, world) {
  const [cx, cz] = GRAVEYARDS[Math.floor(i / 3) % GRAVEYARDS.length], [ox, oz] = GRAVE_ROW[i % 3];
  for (let t = 0; t < 8; t++) if (!world.inside(cx + ox + t * 1.3, cz + oz, 0.8)) return [cx + ox + t * 1.3, cz + oz];
  return [cx + ox, cz + oz];
}

// ---- the catacombs -------------------------------------------------------------------------------------------

// Below ground there are more places to stand than there are bodies, so bodies with nothing better to do are stood ahead of you as
// you go down: first the ones nobody's using, then the long dead, then whoever's still in the fields, a long way above. Each place is
// filled once, so what you've cleared stays clear. The big ones and the casters have rooms of their own, when you get near them.
// (Where, in the church's own frame, and moved with it: src/core/church.js.)
const along = (p) => toChurch(p.x, p.z)[0];
const LORDS = [
  { model: 'zombie_necromancer', when: (p) => p.y < -10, near: churchAt(205, -33) },
  { model: 'necromancer', when: (p) => p.y < -20, near: churchAt(186, -100) },
  { model: 'zombie_ogre', when: (p) => p.y < -20, near: churchAt(197, -78) },
  { model: 'zombie_ogre', when: (p) => p.y < -20 && along(p) > 200, near: churchAt(236, -86) },
  { model: 'evil_wizard', when: (p) => p.y < -20 && along(p) > 200, near: churchAt(250, -86) },
];
const NEAR = 12, FAR = 32, OUT_OF_SIGHT = 20;
const used = new Set();
const lordsDone = new Set();
let nextLook = 0;
// A new game, a death or a load: the catacombs are stood again from nothing (sim.time starts over too).
export function resetCatacombs() { used.clear(); lordsDone.clear(); nextLook = 0; }

function standAt(sim, body, s) {
  const r = Math.random();
  const type = body.opts.type && !body.opts.role && body.opts.model === 'zombie_ogre' ? body.opts.type : r < 0.12 ? 'lurker' : r < 0.42 ? 'runner' : 'shambler';
  body.reset({ ...body.opts, sleeper: false, type: body.opts.role ? undefined : type, spawn: [s.x, s.z], yaw: s.yaw });
  body.y = sim.world.height(s.x, s.z);
}

export function stepCatacombs(sim) {
  const p = sim.player;
  if (along(p) < 125 || sim.time < nextLook) return;   // (Past the office, at the head of the stair down.)
  nextLook = sim.time + 0.5;
  const spawns = sim.world.spawns;
  const idle = (k) => k instanceof Zombie && !k.opts.role && !k.opts.reserve && k.opts.model !== 'zombie_ogre' && !heroBusy(k, sim) && (k.dormant || (k.dead && k.deadT > 4) || (!k.dead && !k.aggro && Math.hypot(k.x - p.x, k.z - p.z) > 70));
  LORDS.forEach((l, n) => {
    if (lordsDone.has(n) || !l.when(p)) return;
    const body = sim.knights.find((k) => k.opts && k.opts.model === l.model && !k.below && !k.aggro && !k.dead);
    if (!body) return;
    let best = null, bd = 1e9;
    spawns.forEach((s, i) => { const d = Math.hypot(s.x - l.near[0], s.z - l.near[1]); if (!used.has(i) && d < bd) { bd = d; best = i; } });
    if (best === null) return;
    // (Only once the lord is found and placed: one out fighting, or dead, is looked for again next time.)
    lordsDone.add(n);
    used.add(best);
    body.below = true;
    standAt(sim, body, spawns[best]);
  });
  // The Bell Crypt's warden, at night, while the quest wants it (src/folk/quests.js): a champion of the dead, stood up in the
  // crypt as you come down the stair to it.
  if (sim.wardenWanted && p.y < -8 && along(p) > 150 && along(p) < 200 && Math.abs(toChurch(p.x, p.z)[1]) < 14) {
    const body = sim.knights.find((k) => idle(k) && (k.dormant || k.dead)) || sim.knights.find(idle);
    if (body) {
      sim.wardenWanted = false;
      const at = churchAt(194, 0);
      standAt(sim, body, { x: at[0], z: at[1], yaw: -Math.PI / 2 });
      body.champion = true; body.hp = body.maxHp = body.hp * 6; body.dmgScale *= 1.8; body.pace *= 1.1;
    }
  }
  let room = 2;
  for (let i = 0; i < spawns.length && room > 0; i++) {
    if (used.has(i)) continue;
    const s = spawns[i], d = Math.hypot(s.x - p.x, s.z - p.z);
    if (d < NEAR || d > FAR) continue;
    if (d < OUT_OF_SIGHT && sim.world.sees(p.x, p.y + 1.5, p.z, s.x, sim.world.height(s.x, s.z) + 1.5, s.z)) continue;
    // The ground's own dead first; then any that have lain long enough; then the fields.
    const body = sim.knights.find((k) => idle(k) && k.dormant) || sim.knights.find((k) => idle(k) && k.dead) || sim.knights.find(idle);
    if (!body) return;
    used.add(i);
    standAt(sim, body, s);
    room--;
  }
}

// ---- the woods -----------------------------------------------------------------------------------------------
// Between the quiet stretches, a pack comes for you out of the trees: a champion and its followers, and sometimes a caster behind them.
// The bodies are the same few as ever, stood up again wherever you are. Nothing comes while you're near the town (src/core/town.js), or
// indoors, or on the church's ground, where its knight is enough.
const PACK_NEAR = 20, PACK_FAR = 30, QUIET = [18, 34], MOST_AT_ONCE = 14, MELEE_AT_ONCE = 4, WAVE_GAP = 4;

function standPack(sim, b, cx, cz) {
  let x = cx, z = cz;
  for (let t = 0; t < 6; t++) {
    const a = rnd(0, 6.28), r = rnd(1.5, 6);
    x = cx + Math.sin(a) * r; z = cz + Math.cos(a) * r;
    if (!sim.world.inside(x, z, 0.7)) break;
  }
  huntFrom(sim, b, x, z, Math.random() < 0.6 ? 'runner' : 'shambler');
}

// Up out of the ground at (x, z), and after you. (Nothing just appears: Zombie.rise.)
function huntFrom(sim, b, x, z, type) {
  const p = sim.player;
  b.reset({ ...b.opts, sleeper: false, type, spawn: [x, z], yaw: Math.atan2(p.x - x, p.z - z) });
  b.y = sim.world.height(x, z);
  b.aggro = true; b.hostile = true; b.goal = GOAL.HUNT; b.lastX = p.x; b.lastZ = p.z; b.lastSense = sim.time;
  b.rise(sim);
}

// Set on the player wherever they are, as a pack is (the Test Dungeon's, src/sim/testhall.js): kept on them if it's lost them.
export function huntPlayer(sim, b) {
  const p = sim.player;
  if (b.dead || b.dormant || b.state === STATE.RISE || b.state === STATE.PLAYDEAD) return;
  b.hostile = true;
  if (b.aggro && sim.time - b.lastSense < 3) return;
  b.aggro = true; b.goal = GOAL.HUNT; b.lastX = p.x; b.lastZ = p.z; b.lastSense = sim.time;
}

// Graves' own dead are the last the packs call on, so a grave you come to still has someone in it.
const graveLast = (a, b) => (a.opts.grave ? 1 : 0) - (b.opts.grave ? 1 : 0);

// ---- the graves ----------------------------------------------------------------------------------------------
// Half the woods' dead lie in graves out in the trees (graveSpot), and come up out of them when someone living comes by: after
// you, or, for one of the other Tessariels, standing about for them to find. One at a time, so a grave of four breaks open in turn.
// A body that's up and gone (to a pack, to a necromancer) leaves its grave empty until it's back in the ground.
const GRAVE_WAKE = 22, GRAVE_HERO = 16;

export function stepGraves(sim) {
  if (sim.time < (sim.graveAt || 0)) return;
  sim.graveAt = sim.time + 0.4;
  const p = sim.player;
  for (const k of sim.knights) {
    const g = k.opts?.grave;
    if (!g || !(k instanceof Zombie) || !k.dormant || k.graveUp || heroBusy(k, sim)) continue;
    let hero = null;
    const you = !p.dead && Math.hypot(p.x - g[0], p.z - g[1]) < GRAVE_WAKE;
    if (!you) hero = sim.heroes.find((h) => h.active && !h.dead && Math.hypot(h.x - g[0], h.z - g[1]) < GRAVE_HERO);
    if (!you && !hero) continue;
    k.raiseAt(sim, g[0], g[1], null, !you, k.opts.type);
    if (hero) k.yaw = Math.atan2(hero.x - g[0], hero.z - g[1]);
    k.graveUp = true;
    return;
  }
}

export function stepWoods(sim) {
  const p = sim.player;
  // The rest of the last pack, a moment behind the first of it.
  if (sim.wave && sim.time >= sim.wave.at) {
    const w = sim.wave; sim.wave = null;
    if (!p.dead) for (const b of w.bodies) if (b.dead || b.dormant || !b.aggro) standPack(sim, b, w.x, w.z);
  }
  if (p.dead || sim.time < sim.packAt) return;
  sim.packAt = sim.time + 1;
  // (On the way down from Lisandra's cave the woods are hers to stage: src/sim/opening.js.)
  if (sim.opening?.onRoad) return;
  const out = Math.hypot(p.x, p.z);
  if (inTown(p.x, p.z, -12) || out > 125) sim.reachedTown = true;   // In the town, or gone out past it: until then the woods hold their packs back.
  if (!sim.reachedTown || inTown(p.x, p.z, 26) || churchSite(p.x, p.z) < 6 || floorAt(p.x, p.z) !== null || Math.abs(p.x) > 235 || Math.abs(p.z) > 235) return;
  const list = sim.knights;
  if (list.filter((k) => k instanceof Zombie && !k.dead && !k.dormant && k.aggro && Math.hypot(k.x - p.x, k.z - p.z) < 50).length >= MOST_AT_ONCE) return;
  // Somewhere ahead or to the side, and off the path of what's clear.
  let cx = 0, cz = 0, found = false;
  for (let t = 0; t < 12 && !found; t++) {
    const a = p.yaw + rnd(-1.9, 1.9), r = rnd(PACK_NEAR, PACK_FAR);
    cx = p.x + Math.sin(a) * r; cz = p.z + Math.cos(a) * r;
    found = !inTown(cx, cz, 6) && churchSite(cx, cz) > 0 && floorAt(cx, cz) === null && !sim.world.inside(cx, cz, 1);
  }
  if (!found) return;
  const free = (k) => k instanceof Zombie && !k.opts.role && !k.opts.reserve && k.opts.model !== 'zombie_ogre' && !heroBusy(k, sim) && (k.dormant || (k.dead && k.deadT > 4) || (!k.dead && !k.aggro && Math.hypot(k.x - p.x, k.z - p.z) > 60));
  const bodies = list.filter(free).sort(graveLast).slice(0, Math.min(12, 6 + Math.floor(out / 60)));
  if (bodies.length < 3) return;
  const first = Math.ceil(bodies.length / 2);
  sim.packN = (sim.packN || 0) + 1;
  bodies.slice(0, first).forEach((b, i) => {
    standPack(sim, b, cx, cz);
    // A champion with every other pack.
    if (i === 0 && sim.packN % 2) { b.champion = true; b.hp = b.maxHp = b.hp * 5; b.dmgScale *= 1.8; b.pace *= 1.15; }
  });
  sim.wave = { at: sim.time + WAVE_GAP, bodies: bodies.slice(first), x: cx, z: cz };
  // A caster at the back, once in a while, if one's free.
  if (Math.random() < 0.4) {
    const c = list.find((k) => k.opts?.role && !heroBusy(k, sim) && ((k.dead && k.deadT > 45) || (!k.dead && !k.aggro && Math.hypot(k.x - p.x, k.z - p.z) > 90)));
    const x = cx + (cx - p.x) * 0.3, z = cz + (cz - p.z) * 0.3;
    if (c && !sim.world.inside(x, z, 0.8) && floorAt(x, z) === null && !inTown(x, z, 6)) huntFrom(sim, c, x, z, undefined);
  }
  sim.event(EV.ROAR, cx, sim.world.height(cx, cz) + 1, cz, 1);
  sim.packAt = sim.time + rnd(QUIET[0], QUIET[1]) * (out > 170 ? 0.6 : 1);   // Quieter near the town, relentless far out.
}

// The opening's ambush on the road down (src/sim/opening.js): n of the dead, slow ones, stood up around (cx, cz) and set on
// you. Returns them, so the story knows when they're down.
export function ambush(sim, cx, cz, n) {
  const free = (k) => k instanceof Zombie && !k.opts.role && !k.opts.reserve && k.opts.model !== 'zombie_ogre' && !heroBusy(k, sim) && (k.dormant || k.dead || !k.aggro);
  const bodies = sim.knights.filter(free).sort(graveLast).slice(0, n);
  bodies.forEach((b, i) => {
    const a = i * 2.4 + rnd(-0.4, 0.4), r = rnd(1.5, 4);
    let x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
    if (sim.world.inside(x, z, 0.7)) { x = cx; z = cz; }
    huntFrom(sim, b, x, z, 'shambler');
  });
  sim.event(EV.ROAR, cx, sim.world.height(cx, cz) + 1, cz, 1);
  return bodies;
}

// ---- the road down from Lisandra's cave ----------------------------------------------------------------------
// Its dead are easy: this is your first fight. (src/sim/opening.js stages it: how many, where and when.)
const EASY = { adult: { hp: 16, dmg: 0.35 }, child: { hp: 8, dmg: 0.25 } };
// One more of them up out of the ground at (x, z) and after you: a body kept for the road, or one of the woods' that's
// in the ground with nothing to do; failing those, one of the fight's own (mine) that's been down a few seconds, which
// goes back into the earth and comes up again here. Null if there's no body to be had just now.
export function openingRaise(sim, x, z, child, mine) {
  const ok = (k) => k instanceof Zombie && !(k instanceof Caster) && !k.opts.role && k.opts.model !== 'zombie_ogre' && !!k.opts.child === child && !heroBusy(k, sim);
  let body = null;
  for (const k of sim.knights) {
    if (!ok(k) || !k.dormant || (!k.opts.reserve && k.opts.grave)) continue;
    if (!body || (k.opts.reserve && !body.opts.reserve)) body = k;
  }
  if (!body) for (const k of sim.knights) if (ok(k) && k.dead && !k.dormant && k.deadT > 2.5 && (k.opts.reserve || mine.has(k)) && (!body || k.deadT > body.deadT)) body = k;
  if (!body) return null;
  const easy = EASY[child ? 'child' : 'adult'], p = sim.player;
  huntFrom(sim, body, x, z, child || Math.random() < 0.25 ? 'runner' : 'shambler');
  body.hp = body.maxHp = body.seenHp = easy.hp; body.dmgScale = easy.dmg;
  body.lastX = p.x; body.lastZ = p.z;
  return body;
}

// One of the road's two necromancers, stood at (x, z) in the trees and set on you. Null if both are up already.
export function openingCaster(sim, x, z) {
  const k = sim.knights.find((c) => c instanceof Caster && c.opts.reserve && c.dead && (c.dormant || c.deadT > 4));
  if (!k) return null;
  const p = sim.player;
  k.reset({ ...k.opts, sleeper: false, spawn: [x, z], yaw: Math.atan2(p.x - x, p.z - z), hp: 70 });
  k.y = sim.world.height(x, z);
  k.aggro = true; k.hostile = true; k.goal = GOAL.HUNT; k.lastX = p.x; k.lastZ = p.z; k.lastSense = sim.time; k.revealed = true;
  return k;
}

export async function addUndead(sim, base) {
  const fetchBuf = (m) => getFile(`${base}assets/monsters/zombie/${m}.glb`);
  const [zMeta, cMeta, buffers] = await Promise.all([
    getFile(`${base}assets/monsters/zombie/clips.json`, 'json'),
    getFile(`${base}assets/monsters/zombie/caster_clips.json`, 'json'),
    // (A model with two entries, the children's, is fetched the once.)
    (() => { const got = new Map(); return Promise.all(BODIES.map((b) => got.get(b.model) || got.set(b.model, fetchBuf(b.model)).get(b.model))); })(),
  ]);
  let id = sim.knights.length, spot = 0;
  BODIES.forEach((b, n) => {
    const rig = new ArmsRig(buffers[n], b.scale);
    const caster = !b.model.startsWith('zombie_') || b.model === 'zombie_necromancer';
    const meta = caster ? cMeta : zMeta;
    for (const [name, c] of Object.entries(rig.clips)) {
      const m = meta[name];
      if (!m) continue;
      c.loop = !!m.loop; c.speed = m.speed || 0; c.reach = m.reach; c.root = m.root;
    }
    for (let i = 0; i < b.count; i++) {
      // (An ogre and the plaguebearer keep the woods north of the church, and went out east with it, off the town's new ground.)
      // (The road's own: in the ground, wherever, till it calls them up.)
      const reserve = i >= b.count - (b.kept || 0);
      if (reserve && caster) {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: [0, 0], yaw: i, hp: 90, limbs: 1.8, role: 'necromancer', boltElem: ELEM.DRAIN, lootKind: 7, sleeper: true, reserve: true }));
      } else if (reserve) {
        sim.knights.push(new Zombie(id++, 5, rig, { model: b.model, scale: b.scale, spawn: [0, 0], yaw: i * 1.3, hp: b.child ? 12 : 34, dmg: b.child ? 0.5 : 1, type: b.child ? 'runner' : 'shambler', sleeper: true, reserve: true, child: !!b.child }));
      } else if (b.model === 'zombie_ogre') {
        sim.knights.push(new Zombie(id++, 6, rig, { model: b.model, scale: b.scale, spawn: i ? [-72, -78] : churchAt(28, -64), yaw: i * 2, hp: 130, limbs: 2.4, dmg: 2.2, type: 'runner' }));
      } else if (b.model === 'necromancer') {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: [-150, -75], yaw: 1.4, hp: 90, limbs: 1.8, role: 'necromancer', boltElem: ELEM.DRAIN, lootKind: 7 }));
      } else if (b.model === 'zombie_necromancer') {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: churchAt(-8, -100), yaw: -1.7, hp: 90, limbs: 1.8, role: 'plaguebearer', boltElem: ELEM.POISON, lootKind: 7 }));
      } else if (b.model === 'evil_wizard') {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: i ? [-160, 60] : [50, -128], yaw: i ? 2.2 : -0.4, hp: 80, limbs: 1.8, role: 'wizard', boltElem: i ? ELEM.FIRE : ELEM.ARCANE, lootKind: 7 }));
      } else {
        // All of them start in the ground. Half in graves out in the woods (stepGraves); the rest anywhere, for the packs and the
        // necromancers to call on.
        const buried = i < 2;
        const r = (spot * 0.381966) % 1, type = !buried ? 'shambler' : r < 0.08 ? 'lurker' : r < 0.4 ? 'runner' : 'shambler';
        const at = buried ? graveSpot(spot, sim.world) : [0, 0];
        if (buried) spot++;
        sim.knights.push(new Zombie(id++, 5, rig, { model: b.model, scale: 1, spawn: at, yaw: spot * 1.7, hp: 34, type, sleeper: true, grave: buried ? at : null }));
      }
    }
  });
}
