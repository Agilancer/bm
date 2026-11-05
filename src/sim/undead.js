// The walking dead, after Bellmourn's: they wander until they see or hear you, call the others, and hunt where they last knew you
// were. They come apart a limb at a time, and carry on with what's left: one with no legs drags itself after you by the arms, one
// with no head goes by ear. Only running out of body stops them. The necromancers raise more of them at your feet from a distance,
// and the wizard hexes the ground you stand on; both throw bolts and blink away from a blade.
import { C, EV } from '../core/layout.js';
import { clamp, damp, quatYaw, wrapAngle, quatRotate } from '../core/math.js';
import { ArmsRig } from './anim.js';
import { Beast } from './beast.js';
import { CHILDREN, PART, partOfJoint } from './limbs.js';
import { ELEM, FX } from './spells.js';

const P = PART;
export const OGRE_SCALE = 1.55;
// What the renderer and the sim both build, in this order.
export const BODIES = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ model: `zombie_${n}`, count: 4, scale: 1 })),
  { model: 'zombie_ogre', count: 2, scale: OGRE_SCALE },
  { model: 'necromancer', count: 1, scale: 1 },
  { model: 'zombie_necromancer', count: 1, scale: 1 },
  { model: 'evil_wizard', count: 1, scale: 1 },
];

const STATE = { MOVE: 0, ATTACK: 3, STAGGER: 7, RISE: 8, PLAYDEAD: 9, DEAD: 10, CAST: 11 };
const GOAL = { WANDER: 0, CHASE: 1, HUNT: 2, SEARCH: 3 };
// A swing here does far less to a body than the same swing in Bellmourn, where a sword hits for its whole weight, so what lands is scaled to its numbers.
const BLOW = 6;
const LIMB_HP = { [P.HEAD]: 42, [P.UPPER_L]: 52, [P.UPPER_R]: 52, [P.FORE_L]: 36, [P.FORE_R]: 36, [P.HAND_L]: 22, [P.HAND_R]: 22, [P.THIGH_L]: 150, [P.THIGH_R]: 150, [P.SHIN_L]: 120, [P.SHIN_R]: 120, [P.FOOT_L]: 70, [P.FOOT_R]: 70, [P.HIPS]: 150 };
const LEGS = new Set([P.HIPS, P.THIGH_L, P.THIGH_R, P.SHIN_L, P.SHIN_R, P.FOOT_L, P.FOOT_R]);
const BOLTS = { arcane: { elem: ELEM.ARCANE, dmg: 10, speed: 14 }, blood: { elem: ELEM.DRAIN, dmg: 12, speed: 13 }, venom: { elem: ELEM.POISON, dmg: 9, speed: 12 }, fire: { elem: ELEM.FIRE, dmg: 13, speed: 15 } };
// Windows are the frames of each clip, at 30 a second, in which its blow can land.
const BLOWS = {
  attack_rake: { windows: [[18, 25]], dmg: 9 },
  attack_flurry: { windows: [[18, 24], [31, 37], [44, 50]], dmg: 5 },
  attack_bite: { windows: [[15, 22]], dmg: 14 },
  attack_pounce: { windows: [[26, 33]], dmg: 12 },
  crawl_attack: { windows: [[14, 19]], dmg: 7 },
  bolt: { windows: [[6, 11]], dmg: 10, reach: 1.6 },
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
      dead: false, deadT: 0, hostile: false, iframes: false, shieldUp: 0, gashes: [], bleeds: [], heart: Math.random(), gashVersion: (this.gashVersion || 0) + 1, bites: 0,
      chunks: [], jets: [], alive: new Array(15).fill(true), bit: new Array(15).fill(0), cutMask: 0, limb: { ...LIMB_HP }, crawling: false, headless: false, hobble: false,
      state: STATE.MOVE, stateT: 0, goal: GOAL.WANDER, aggro: false, attack: null, used: false, activeOn: -1, cool: rnd(0.5, 2), pounceCool: rnd(2, 6), senseT: Math.random() * 0.25,
      lastX: opts.spawn[0], lastZ: opts.spawn[1], lastSense: -99, wx: opts.spawn[0], wz: opts.spawn[1], wanderT: rnd(0, 5), moving: false, searchT: 0, rush: 0, orbit: 0, stuckT: 1, stuckX: opts.spawn[0], stuckZ: opts.spawn[1], sideT: 0, sideA: 0,
      groanT: rnd(2, 8), chasers: 0, stagger: 0, sink: 0, dirtT: 0, stepClock: 0, fadeTime: 0.2, dormant: false, looted: false, owner: null, flank: this.id % 3 - 1, pace: rnd(0.88, 1.12), clip: null, t: 0, fade: 1,
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

  // Up out of the ground, at someone's word.
  raiseAt(sim, x, z, owner) {
    this.reset({ ...this.opts, sleeper: false, type: 'shambler', spawn: [x, z], yaw: Math.atan2(sim.player.x - x, sim.player.z - z) });
    this.owner = owner;
    this.y = sim.world.height(x, z);
    this.state = STATE.RISE; this.stateT = 0; this.sink = -0.4;
    this.setClip(this.riseClip); this.fade = 1;
    this.aggro = true; this.goal = GOAL.CHASE; this.lastX = sim.player.x; this.lastZ = sim.player.z; this.lastSense = sim.time;
    sim.event(EV.DIRT, x, this.y, z, 1.5);
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
    sim.hitStop(0.05);
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

  onHit(sim, kind, fromX, fromZ, poise = 0) {
    this.aggro = true; this.hostile = true;
    this.lastX = sim.player.x; this.lastZ = sim.player.z; this.lastSense = sim.time;
    if (this.goal !== GOAL.CHASE) { this.goal = GOAL.CHASE; this.alert(sim, 9); }
    // Blows don't move them and don't stop one that's already swinging. It only checks its stride.
    if (this.state !== STATE.MOVE || this.crawling) return;
    this.state = STATE.STAGGER; this.stateT = 0;
    this.stagger = poise > 50 || kind === 'puncture' ? 0.55 : 0.32;
    this.setClipOver(pick(this.hitClips), 0.08);
  }

  alert(sim, r) {
    for (const k of sim.knights) {
      if (k === this || !(k instanceof Zombie) || k.dead) continue;
      const d = Math.hypot(k.x - this.x, k.z - this.z);
      if (d > r) continue;
      if (k.state === STATE.PLAYDEAD && d > r * 0.5) continue;
      k.aggro = true; k.lastX = sim.player.x; k.lastZ = sim.player.z; k.lastSense = sim.time;
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
    if (this.dormant || dt <= 0) { if (!this.dormant) this.t += 0; return; }
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt / this.fadeTime);
    if (this.fade >= 1) this.fadeTime = 0.2;
    const p = sim.player;
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
    this.t += dt;
    this.sink = Math.min(0, this.sink + dt * 0.5);
    this.dirtT -= dt;
    if (this.stateT < 1.6 && this.dirtT <= 0 && this.opts.summoned !== false) { this.dirtT = 0.14; sim.event(EV.DIRT, this.x, this.y, this.z, 0.3); }
    if (this.t >= c.dur) {
      this.sink = 0; this.hostile = true;
      this.setState(STATE.MOVE); this.setClip(this.idleClip);
      if (d < 28) this.goal = GOAL.CHASE;
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
        sim.world.updateField(p.x, p.z, sim.time, 0);
        sim.world.flow(flow, this.x, this.z, p.x, p.z, 0);
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
      const home = this.opts.spawn;
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
    if (f < first) this.yaw = turn(this.yaw, toPlayer, 3 * dt);
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
        p.damage(sim, dmg, this.x, this.z, this.scale > 1.2 ? 4 : 0);
        sim.event(EV.HURT, p.x, p.y + 1.1, p.z, dmg);
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

export class Caster extends Zombie {
  takes(opts) {
    this.senses = { sight: 32, hear: 1.1, turn: 3.2 };
    this.style = 'caster';
    this.walkClip = 'walk'; this.runClip = 'run';
    this.idleClip = 'idle'; this.riseClip = 'idle'; this.deathClip = 'death'; this.hitClips = ['hit'];
    this.walkPush = 1.5;
    this.dmgScale = 1;
    this.boltT = rnd(1, 3); this.bigT = rnd(6, 14); this.blinkT = 2; this.blinkAsk = false; this.circleDir = 1; this.circleT = 2; this.cast = null; this.fired = false; this.minions = [];
  }

  get canCast() { return !this.crawling && !this.headless && (this.armL || this.armR); }

  sever(sim, part) {
    super.sever(sim, part);
    // Nothing goes on casting without a head.
    if (part === P.HEAD && !this.dead) this.die(sim);
  }

  onHit(sim, kind, fromX, fromZ, poise = 0) {
    super.onHit(sim, kind, fromX, fromZ, poise);
    if (Math.random() < 0.5) this.blinkAsk = true;
  }

  // Keeps its distance and works: priority to getting clear, then a blade if you're in reach, then a great working, then a bolt.
  think(dt, sim, p, d, toPlayer, hunting) {
    if (!this.canCast || this.goal !== GOAL.CHASE) { super.think(dt, sim, p, d, toPlayer, hunting); return; }
    this.boltT -= dt; this.bigT -= dt; this.blinkT -= dt;
    const sees = sim.world.sees(this.x, this.y + 1.5, this.z, p.x, p.y + 1.5, p.z);
    const err = Math.abs(wrapAngle(toPlayer - this.yaw));
    if ((d < 2.6 || this.blinkAsk) && this.blinkT <= 0 && !this.hobble) { this.blink(sim, p, toPlayer); this.blinkAsk = false; return; }
    if (d < 1.8 && err < 0.6 && this.armR && this.cool <= 0) { this.startAttack(sim, 'bolt'); this.cool = 1; return; }
    if (sees && d > 4 && d < 22 && this.bigT <= 0) { this.startCast(sim, this.opts.role === 'wizard' ? 'hex' : 'summon'); this.bigT = this.opts.role === 'wizard' ? rnd(7, 11) : rnd(16, 26); return; }
    if (sees && d < 30 && err < 0.3 && this.boltT <= 0) { this.startCast(sim, 'bolt'); this.boltT = rnd(2.2, 4); return; }
    const walk = this.rig.clips.walk.speed * this.pace * this.walkPush;
    if (!sees || d > 17) {
      const fast = d > 12;
      sim.world.updateField(p.x, p.z, sim.time, 0);
      sim.world.flow(flow, this.x, this.z, p.x, p.z, 0);
      this.steer(dt, sim, flow[0], flow[1], fast ? this.rig.clips.run.speed * 0.8 * this.pace : walk, 3.2);
      this.stride(fast ? 'run' : 'walk', this.speed, dt, sim);
      return;
    }
    // In its range: faces you the whole time, and backs away or goes round.
    this.yaw = turn(this.yaw, toPlayer, 3.2 * dt);
    this.circleT -= dt;
    if (this.circleT <= 0) { this.circleT = rnd(2, 5); this.circleDir = Math.random() < 0.5 ? -1 : 1; }
    let ax, az, v, back = false;
    if (d < 7) { ax = -Math.sin(toPlayer); az = -Math.cos(toPlayer); v = walk * 1.1; back = true; } else { ax = Math.cos(toPlayer) * this.circleDir; az = -Math.sin(toPlayer) * this.circleDir; v = walk * 0.7; }
    const k = 1 - Math.exp(-7 * dt);
    this.vx += (ax * v - this.vx) * k; this.vz += (az * v - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
    this.setClip('walk');
    const rate = clamp(this.speed / (this.rig.clips.walk.speed || 0.7), 0.25, 2);
    this.t += dt * (back ? -rate : rate);
  }

  startCast(sim, name) {
    this.setClipOver(name, 0.18);
    this.cast = CASTS[name];
    this.fired = false;
    this.state = STATE.CAST; this.stateT = 0;
    this.hostile = true;
    if (name === 'summon') { sim.event(EV.CHANT, this.x, this.y + 1.5, this.z); this.boltT = Math.max(this.boltT, 1.5); }
  }

  thinkCast(dt, sim, p, d, toPlayer) {
    const c = this.rig.clips[this.clip], cast = this.cast;
    this.halt(dt);
    this.yaw = turn(this.yaw, toPlayer, 3 * dt);
    this.t += dt * cast.rate;
    const left = this.jointOf('hand_r'), wt = this.rig.wt;
    // Something gathers in the hand.
    if (!this.fired) sim.casting.fx(FX.FLARE, cast.elem(this), wt[left * 3], wt[left * 3 + 1], wt[left * 3 + 2], 0.05 + 0.12 * Math.min(1, this.t * cast.rate / (cast.at * c.dur + 0.01)), 0, 1, 0, 0, 0.8, 4, 3);
    if (!this.fired && this.t >= cast.at * c.dur) { this.fired = true; cast.fire(this, sim, p, d); }
    if (this.t >= c.dur * cast.until) { this.setState(STATE.MOVE); this.setClip(this.idleClip); this.cast = null; }
  }

  // Lands 8 to 13 m away on its own side of you, somewhere it can see you from. If there's nowhere, it stays put.
  blink(sim, p, toPlayer) {
    this.blinkT = rnd(6, 10);
    for (let i = 0; i < 16; i++) {
      const r = rnd(8, 13), a = toPlayer + Math.PI + rnd(-1.2, 1.2);
      const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (sim.world.inside(x, z, 0.5)) continue;
      const y = sim.world.height(x, z);
      if (!sim.world.sees(x, y + 1.5, z, p.x, p.y + 1.5, p.z)) continue;
      const c = sim.casting, e = this.opts.role === 'wizard' ? ELEM.ARCANE : ELEM.VOID;
      c.burst(FX.FLARE, e, this.x, this.y + 1, this.z, 0.5, 1.4, 0.3, { alpha: 1.2, light: 18, lightR: 8 });
      sim.event(EV.BLINK, this.x, this.y + 1, this.z);
      this.x = x; this.z = z; this.y = y; this.vx = 0; this.vz = 0;
      c.burst(FX.FLARE, e, x, y + 1, z, 1.4, 0.5, 0.3, { alpha: 1.2, light: 18, lightR: 8 });
      sim.event(EV.BLINK, x, y + 1, z);
      return;
    }
  }
}

const CASTS = {
  // Up to three of the dead, close around you rather than around it, as long as it has fewer than five about.
  summon: {
    rate: 3, at: 0.42, until: 0.8, elem: () => ELEM.VOID,
    fire(k, sim, p) {
      k.minions = k.minions.filter((m) => !m.dead && m.owner === k);
      const want = Math.min(3, 5 - k.minions.length);
      for (let n = 0; n < want; n++) {
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2, r = rnd(2.5, 5.5), x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
          if (sim.world.inside(x, z, 0.5)) continue;
          const m = raiseZombie(sim, x, z, k);
          if (m) {
            k.minions.push(m);
            const y = sim.world.height(x, z);
            sim.casting.burst(FX.RUNE, ELEM.VOID, x, y + 0.03, z, 0.4, 1.5, 1.2, { alpha: 0.9, light: 10, lightR: 6 });
          }
          break;
        }
      }
    },
  },
  // A ring at your feet that bursts after a moment. Moving is the answer to it.
  hex: {
    rate: 2.4, at: 0.42, until: 0.72, elem: () => ELEM.VOID,
    fire(k, sim, p) { sim.foeHexes.push({ x: p.x, z: p.z, t: 0, seed: Math.random() }); },
  },
  bolt: {
    rate: 1, at: 0.45, until: 1, elem: (k) => BOLTS[k.opts.bolt].elem,
    fire(k, sim, p, d) {
      const j = k.jointOf('hand_r'), wt = k.rig.wt;
      const b = BOLTS[k.opts.bolt], x = wt[j * 3], y = wt[j * 3 + 1], z = wt[j * 3 + 2];
      // Leads a moving target, not perfectly.
      const lead = d / b.speed * 0.6;
      let ax = p.x + p.vx * lead - x, ay = p.y + 1.1 - y, az = p.z + p.vz * lead - z;
      const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
      sim.foeBolts.push({ x, y, z, dx: ax, dy: ay, dz: az, speed: b.speed, dmg: b.dmg, elem: b.elem, age: 0, seed: Math.random() });
      sim.event(EV.SPELL_LOOSE, b.elem, 0, x, y, z);
    },
  },
};

export function raiseZombie(sim, x, z, owner) {
  let body = null, oldest = 8;
  for (const k of sim.knights) {
    if (!(k instanceof Zombie) || k instanceof Caster || k.scale > 1.2 || !k.dead) continue;
    if (k.dormant) { body = k; break; }
    if (k.deadT > oldest) { oldest = k.deadT; body = k; }
  }
  if (body) body.raiseAt(sim, x, z, owner);
  return body;
}

// The casters' spells, once they've left the hand. After the player's own, so they're drawn with this tick's shapes.
export function stepFoeSpells(dt, sim) {
  const c = sim.casting, p = sim.player;
  if (sim.foeBolts.length) {
    const keep = [];
    for (const b of sim.foeBolts) {
      b.age += dt;
      if (b.age < 0.6 && !p.dead) {
        // Turns toward you for its first moments, then it's on its way and you can step out of it.
        let ax = p.x - b.x, ay = p.y + 1.1 - b.y, az = p.z - b.z;
        const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
        const k = 1 - Math.exp(-1.6 * dt);
        b.dx += (ax - b.dx) * k; b.dy += (ay - b.dy) * k; b.dz += (az - b.dz) * k;
        const l = Math.hypot(b.dx, b.dy, b.dz) || 1; b.dx /= l; b.dy /= l; b.dz /= l;
      }
      b.x += b.dx * b.speed * dt; b.y += b.dy * b.speed * dt; b.z += b.dz * b.speed * dt;
      const low = clamp(b.y, p.y + 0.2, p.y + 1.5);
      const hit = !p.dead && !p.iframes && Math.hypot(b.x - p.x, b.y - low, b.z - p.z) < 0.42;
      const wall = b.y < sim.world.height(b.x, b.z) || sim.world.inside(b.x, b.z, 0.05) || b.age > 3.5;
      if (hit || wall) {
        if (hit) { p.damage(sim, b.dmg, b.x, b.z, 0); sim.event(EV.HURT, p.x, p.y + 1.1, p.z, b.dmg); }
        c.burst(FX.FLARE, b.elem, b.x, b.y, b.z, 0.3, 0.9, 0.22, { alpha: 1.2, light: 18, lightR: 7 });
        sim.event(EV.BLINK, b.x, b.y, b.z);
        continue;
      }
      c.fx(FX.ORB, b.elem, b.x, b.y, b.z, 0.14, 0, 1, 0, 0, 1, 16, 9, 0, b.seed);
      c.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, 0.09, -b.dx, -b.dy, -b.dz, Math.min(b.age * b.speed, 1.6), 0.8, 0, 0, 0, b.seed);
      keep.push(b);
    }
    sim.foeBolts = keep;
  }
  if (sim.foeHexes.length) {
    const keep = [];
    for (const h of sim.foeHexes) {
      h.t += dt;
      const y = sim.world.height(h.x, h.z) + 0.04, k = clamp(h.t / 1.2, 0, 1);
      c.fx(FX.RUNE, ELEM.VOID, h.x, y, h.z, 1.7, 0, 1, 0, 0, 0.5 + 0.5 * k, 3 + 10 * k, 5, k, h.seed);
      if (h.t < 1.2) { keep.push(h); continue; }
      c.burst(FX.SHOCK, ELEM.VOID, h.x, y + 0.2, h.z, 0.3, 2.2, 0.4, { alpha: 1.1, light: 30, lightR: 9 });
      c.burst(FX.COLUMN, ELEM.VOID, h.x, y, h.z, 1.2, 1.7, 0.4, { alpha: 1, len: 3 });
      sim.event(EV.SPELL_BOOM, ELEM.VOID, h.x, y + 0.5, h.z, 2);
      if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < 1.7 && Math.abs(p.y - y) < 1.5) {
        p.damage(sim, 18, h.x, h.z, 0);
        p.vy = Math.max(p.vy, 5);
        sim.event(EV.HURT, p.x, p.y + 1.1, p.z, 18);
      }
    }
    sim.foeHexes = keep;
  }
}

// ---- who's out there ----------------------------------------------------------------------------------------

// Where the first bodies stand: scattered over the fields round the village, a good way from it.
function fieldSpot(i, world) {
  for (let tries = 0; tries < 24; tries++) {
    const a = (i + tries * 0.37) * 2.399963, r = 24 + ((i * 7 + tries * 5) % 26);
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!world.inside(x, z, 0.8) && Math.hypot(x + 3.5, z - 40) > 20) return [x, z]; // (not on top of where you start)
  }
  return [Math.sin(i) * 40, Math.cos(i) * 40];
}

export async function addUndead(sim, base) {
  const fetchBuf = (m) => fetch(`${base}assets/monsters/zombie/${m}.glb`).then((r) => { if (!r.ok) throw new Error(`${m}: ${r.status}`); return r.arrayBuffer(); });
  const [zMeta, cMeta, buffers] = await Promise.all([
    fetch(`${base}assets/monsters/zombie/clips.json`).then((r) => r.json()),
    fetch(`${base}assets/monsters/zombie/caster_clips.json`).then((r) => r.json()),
    Promise.all(BODIES.map((b) => fetchBuf(b.model))),
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
      if (b.model === 'zombie_ogre') {
        sim.knights.push(new Zombie(id++, 6, rig, { model: b.model, scale: b.scale, spawn: i ? [-31, -36] : [33, 35], yaw: i * 2, hp: 380, limbs: 2.4, dmg: 2.2, type: 'runner' }));
      } else if (b.model === 'necromancer') {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: [-46, 8], yaw: 1.4, hp: 105, role: 'necromancer', bolt: 'blood', lootKind: 7 }));
      } else if (b.model === 'zombie_necromancer') {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: [46, -8], yaw: -1.7, hp: 105, role: 'necromancer', bolt: 'venom', lootKind: 7 }));
      } else if (b.model === 'evil_wizard') {
        sim.knights.push(new Caster(id++, 5, rig, { model: b.model, scale: 1, spawn: [22, -44], yaw: -0.4, hp: 105, role: 'wizard', bolt: 'arcane', lootKind: 7 }));
      } else {
        // Half stand in the fields from the start. The rest are in the ground, for the necromancers to call on.
        const sleeper = i >= 2;
        const r = (spot * 0.381966) % 1, type = sleeper ? 'shambler' : r < 0.08 ? 'lurker' : r < 0.4 ? 'runner' : 'shambler';
        const at = sleeper ? [0, 0] : fieldSpot(spot, sim.world);
        if (!sleeper) spot++;
        sim.knights.push(new Zombie(id++, 5, rig, { model: b.model, scale: 1, spawn: at, yaw: spot * 1.7, hp: 120, type, sleeper }));
      }
    }
  });
}
