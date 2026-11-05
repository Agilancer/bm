// The Bone Hydra: an old, heavy, territorial thing lying up at the bottom of the rift under the catacombs. Three heads means it has no blind side, and
// it can't be stalked the way the Gravehart stalks you; it lies watching, and bickers with itself, until you come too close.
// Then it roars once, and if you stay it comes on at a walk: it burns what's far and bites what's near, and swings its tail
// at anything that gets behind it. Its body barely minds a sword. Its necks do. Cut one enough and the head comes off and
// falls, then the neck above the stump if you keep at it; a head that's gone stops biting and burning, and when the last one
// is gone so is the hydra. The chunks are whole pieces of the skin, carried from then on by a rigid body each.
import { EV } from '../core/layout.js';
import { clamp, damp, quatRotate, quatYaw, wrapAngle } from '../core/math.js';
import { Beast } from './beast.js';

export const HYDRA_SCALE = 3.6;
const S = HYDRA_SCALE;
// Floor speeds of the clips, from assets/monsters/bone_hydra/clips.json, at this size.
const STRIDE = { walk_stalk: 0.1 * S, walk_lumber: 0.24 * S, run_lumber: 0.7174 * S, run_charge: 1.3529 * S };
const lunge = (f0, f1, dist, ramp) => ({ f0, f1, v: dist * S / ((f1 - f0 - ramp) / 30), ramp });
// Frames are the clips' own, at 30 a second. A hit is live for a moment either side of the frame it lands on.
const ATTACKS = {
  attack_bite: { hits: [{ by: 'm', at: 20 }], reach: 1.1, dmg: 26, knock: 3, lunge: lunge(11, 22, 0.16, 2) },
  attack_triple_bite: { hits: [{ by: 'r', at: 20 }, { by: 'l', at: 36 }, { by: 'm', at: 52 }], reach: 1.5, dmg: 19, knock: 2, lunge: lunge(14, 62, 0.28, 6) },
  attack_claw: { hits: [{ by: 'R', at: 31 }, { by: 'L', at: 55 }], reach: 1.6, dmg: 22, knock: 4 },
  attack_tail_sweep: { hits: [{ by: 'tail', at: 22, to: 38 }], reach: 1.5, dmg: 24, knock: 9, wide: true, pivot: 2.5 },
  attack_stomp: { hits: [{ by: 'both', at: 34, to: 36 }], reach: 4.2, dmg: 30, knock: 8, slam: 34, wide: true, lunge: lunge(18, 34, 0.16, 3) },
  attack_fire_cone: { fire: [['m', 34, 84]], rate: 1 },
  attack_fire_triple: { fire: [['r', 36, 84], ['l', 44, 88], ['m', 52, 92]], rate: 0.6 },
  attack_fire_sweep: { fire: [['r', 32, 86], ['l', 32, 86]], rate: 1, rake: true },
  jump: { hits: [{ by: 'both', at: 36, to: 38 }], reach: 3.6, dmg: 22, knock: 6, slam: 36, wide: true, lunge: lunge(21, 35, 0.42, 2) },
};
const STATE = { BASK: 0, ROAM: 1, ALERT: 2, DISPLAY: 3, HUNT: 4, ATTACK: 5, HURT: 6, FLEE: 7, LAIR: 8, DEAD: 10 };
const NECKS = ['l', 'm', 'r'];
// Where each mouth is on the bind pose, in model units, and which way along the neck the blow counts for how much.
const MOUTH = { l: [-0.25, 0.65, 0.315], m: [0.01, 0.795, 0.4], r: [0.25, 0.65, 0.4] };
const NECK_HP = 170, STUMP_HP = 70, TAIL_HP = 60, DRAPE_HP = 28;
const FIRE_RANGE = 10.5, FIRE_TICK = 0.25, FIRE_DMG = 5;
const WIND = [0.6, 0.8];
const tv = new Float32Array(3), tv2 = new Float32Array(3), flow = new Float32Array(2);
let PIT = null;     // the floor it lives on: HYDRA in src/sim/sim.worker.js

function turn(a, b, step) { const d = wrapAngle(b - a); return wrapAngle(a + clamp(d, -step, step)); }

export class Hydra extends Beast {
  constructor(id, kind, rig, opts) {
    super(id, kind, rig, opts);
    PIT = opts.pit;
    this.bodyRadius = 1.7;
    this.scale = S;
    this.jointOf = (n) => rig.index.get(n);
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw, vx: 0, vz: 0, speed: 0, hp: opts.hp, maxHp: opts.hp, stam: 100, armor: 1,
      state: STATE.BASK, stateT: 0, dead: false, deadT: 0, hostile: false, iframes: false, shieldUp: 0, gashes: [], bleeds: [], heart: Math.random(), gashVersion: (this.gashVersion || 0) + 1,
      clip: 'idle', t: Math.random() * 3, fade: 1, attack: null, cooldown: 0, bites: 0, stepClock: 0, seenHp: opts.hp, rayPiece: -1, fireClock: 0, burnClock: 0, slammed: false,
      aware: 0, warned: 0, angerAt: -99, wx: opts.spawn[0], wz: opts.spawn[1], waitT: 4, circleDir: 1, fled: false, bickerT: 12 + Math.random() * 10, chunks: [], jets: [], last: '',
      necks: { l: { head: true, upper: true, hp: NECK_HP }, m: { head: true, upper: true, hp: NECK_HP }, r: { head: true, upper: true, hp: NECK_HP } },
      tailOn: true, tailHp: TAIL_HP, drapes: { L: DRAPE_HP, R: DRAPE_HP },
    });
    this.buildSpheres();
    this.rig.rot.set(this.rig.restR); this.rig.tr.set(this.rig.restT);
    this.rig.rot2.set(this.rig.restR); this.rig.tr2.set(this.rig.restT);
  }

  // The blade's targets, and who owns them. Whatever's fallen off isn't one any more.
  buildSpheres() {
    const J = this.jointOf;
    const spheres = [], owner = new Map();
    const add = (n, r, part) => { spheres.push({ j: J(n), r: r * S }); if (part) owner.set(J(n), part); };
    for (const [n, r] of [['cog', 0.2], ['pelvis', 0.17], ['spine_1', 0.19], ['spine_2', 0.2], ['chest', 0.2], ['tail_1', 0.075], ['tail_2', 0.065], ['tail_3', 0.06]]) add(n, r);
    for (const s of ['L', 'R']) {
      for (const n of ['fore_upper', 'fore_fore', 'fore_paw', 'hind_thigh', 'hind_shin', 'hind_meta']) add(`${s}_${n}`, 0.06);
      if (this.drapes[s] > 0) add(`drape_${s}`, 0.055, { kind: 'drape', s });
    }
    if (this.tailOn) for (const n of ['tail_4', 'tail_5', 'tail_6']) add(n, 0.05, { kind: 'tail' });
    for (const k of NECKS) {
      const nk = this.necks[k];
      add(`${k}_1`, 0.075, nk.upper ? { kind: 'neck', k, w: 0.9, at: 'low' } : null);
      add(`${k}_2`, 0.07, nk.upper ? { kind: 'neck', k, w: 1, at: 'low' } : null);
      if (nk.upper) for (const n of [3, 4, 5]) add(`${k}_${n}`, 0.065, { kind: 'neck', k, w: 1.3, at: 'up' });
      if (nk.head) { add(`${k}_head`, 0.1, { kind: 'neck', k, w: 1.6, at: 'head' }); add(`${k}_jaw`, 0.065, { kind: 'neck', k, w: 1.6, at: 'head' }); }
    }
    this.spheres = spheres; this.owner = owner;
  }

  headsLeft() { return NECKS.reduce((n, k) => n + (this.necks[k].head ? 1 : 0), 0); }

  // ---- blows --------------------------------------------------------------------------------------

  rayPlates(ox, oy, oz, dx, dy, dz, maxT, hit) {
    const on = super.rayPlates(ox, oy, oz, dx, dy, dz, maxT, hit);
    if (on) this.rayPiece = hit.piece;
    return on;
  }

  // The player takes hp off directly; this works out what the blow landed on. The body shrugs off half of it.
  takeBlow(sim, amount) {
    const part = this.owner.get(this.rayPiece);
    if (!part) { this.hp = Math.min(this.maxHp, this.hp + amount * 0.5); return; }
    if (part.kind === 'neck') {
      const nk = this.necks[part.k];
      nk.hp -= amount * part.w;
      if (nk.hp <= 0) this.cutNeck(sim, part.k, part.at);
    } else if (part.kind === 'tail') {
      this.tailHp -= amount;
      if (this.tailHp <= 0 && this.tailOn) { this.tailOn = false; this.drop(sim, ['tail_4', 'tail_5', 'tail_6'], 0.13, 3); this.buildSpheres(); }
    } else if (this.drapes[part.s] > 0) {
      this.drapes[part.s] -= amount;
      if (this.drapes[part.s] <= 0) { this.drop(sim, [`drape_${part.s}`], 0.07, 1); this.buildSpheres(); }
    }
  }

  // A cut on the head takes the head; one on the neck takes everything above it, head and all.
  cutNeck(sim, k, at) {
    const nk = this.necks[k];
    if (nk.head && at === 'head') {
      nk.head = false; nk.hp = STUMP_HP;
      this.drop(sim, [`${k}_head`, `${k}_jaw`], 0.2, 2);
      this.bleedFrom(sim, `${k}_5`, 4.5);
    } else if (nk.upper) {
      const js = [`${k}_3`, `${k}_4`, `${k}_5`];
      if (nk.head) js.push(`${k}_head`, `${k}_jaw`);
      nk.head = false; nk.upper = false;
      this.drop(sim, js, 0.13, 3);
      this.bleedFrom(sim, `${k}_2`, 6);
    }
    this.buildSpheres();
    if (!this.headsLeft()) { this.die(sim); return; }
    // It reels, and comes back angrier.
    this.attack = null; this.vx *= 0.3; this.vz *= 0.3;
    this.state = STATE.HURT; this.stateT = 0;
    this.setClip('hurt');
    this.hostile = true; this.angerAt = sim.time; this.aware = 1.4;
    sim.event(EV.ROAR, this.x, this.y + 2.2, this.z, 0.85);
  }

  // ---- senses -----------------------------------------------------------------------------------------

  setState(s) { this.state = s; this.stateT = 0; }

  // Three heads look three ways: it sees all round, a little less far for each one it's lost.
  sense(p, dist) {
    if (p.dead) return 0;
    let n = 0;
    const eyes = 16 + this.headsLeft() * 6;
    if (dist < eyes) n = Math.max(n, clamp(1.6 - dist / (eyes * 0.75), 0, 1.4) * (p.sprinting ? 1.2 : 1));
    const loud = p.sprinting ? 22 : p.swinging ? 18 : Math.hypot(p.vx, p.vz) > 0.5 ? 10 : 4;
    if (dist < loud) n = Math.max(n, 1.1 * (1 - dist / loud));
    const dx = this.x - p.x, dz = this.z - p.z, along = (dx * WIND[0] + dz * WIND[1]) / Math.max(dist, 0.01);
    if (along > 0.55 && dist < 36) n = Math.max(n, 0.5 * (1 - dist / 36));
    return n;
  }

  update(dt, sim) {
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt / 0.2);
    const p = sim.player;
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz), toPlayer = Math.atan2(dx, dz);
    this.heart += dt * 0.8;
    const blow = this.seenHp - this.hp;
    if (blow > 0.01 && !this.dead) this.takeBlow(sim, blow);
    if (this.bleeds.length && !this.dead) { let f = 0; for (const b of this.bleeds) f += b.rate; this.hp -= dt * f * 1.4; }
    this.seenHp = this.hp;
    if (this.hp <= 0 && !this.dead) this.die(sim);
    this.cooldown = Math.max(0, this.cooldown - dt);
    let rate = 1;
    // (It can't climb. Up on the scaffold or the bridge you're as good as gone, however near you are across the ground.)
    const hunting = !p.dead && sim.gameState === 0 && p.y - this.y < 6;
    if (!this.dead) {
      const n = hunting ? this.sense(p, dist) : 0;
      this.aware = clamp(this.aware + (n > 0 ? n * dt : -dt * 0.08), 0, 1.4);
    }
    if (this.dead) {
      this.deadT += dt;
      this.vx = damp(this.vx, 0, 5, dt); this.vz = damp(this.vz, 0, 5, dt);
      this.t = Math.min(this.t + dt, this.rig.clips.death.dur);
    } else if (this.state === STATE.ATTACK) {
      this.thinkAttack(dt, sim, p, dist, toPlayer);
    } else {
      this.think(dt, sim, p, dist, toPlayer, hunting);
    }
    this.x += this.vx * dt; this.z += this.vz * dt;
    tv[0] = this.x; tv[2] = this.z;
    // (Its stride takes it over the rubble on the floor, the tallest of which comes to 1.3 m. It's the trench's walls that stop it.)
    sim.world.resolve(tv, 1.25, this.y + 1.4);
    this.x = tv[0]; this.z = tv[2];
    this.x = clamp(this.x, PIT.x0, PIT.x1); this.z = clamp(this.z, PIT.z0, PIT.z1);
    this.y = PIT.y;
    if (this.state !== STATE.ATTACK && !this.dead) {
      const stride = STRIDE[this.clip];
      if (stride) rate *= clamp(this.speed / stride, 0.3, 1.4);
      const c = this.rig.clips[this.clip];
      this.t += dt * rate;
      if (!c.loop && this.t > c.dur) this.t = c.dur;
      if (stride) {
        this.stepClock += dt * rate * 4 / c.dur;
        if (this.stepClock > 1 && this.speed > 0.1) {
          this.stepClock -= 1;
          sim.event(EV.STEP, this.x, this.y, this.z, clamp(this.speed / 4, 0.4, 1), 2, this.id);
        }
      }
    }
    this.stepChunks(dt, sim);
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT[0] = this.x; this.rig.rootT[1] = this.y; this.rig.rootT[2] = this.z;
  }

  go(dt, sim, tx, tz, speed, clipName, turnRate) {
    // The floor of the rift is one long open trench, so there's no working out a way: straight at it, as far as the trench goes.
    const ax = clamp(tx, PIT.x0, PIT.x1) - this.x, az = clamp(tz, PIT.z0, PIT.z1) - this.z, al = Math.hypot(ax, az) || 1;
    flow[0] = ax / al; flow[1] = az / al;
    const k = 1 - Math.exp(-2.4 * dt);
    this.vx += (flow[0] * speed - this.vx) * k; this.vz += (flow[1] * speed - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
    if (this.speed > 0.15) this.yaw = turn(this.yaw, Math.atan2(this.vx, this.vz), (turnRate || 1.4) * dt);
    this.setClip(clipName);
  }

  halt(dt, clipName) {
    this.vx = damp(this.vx, 0, 4, dt); this.vz = damp(this.vz, 0, 4, dt);
    this.speed = Math.hypot(this.vx, this.vz);
    if (clipName && this.speed < 0.5) this.setClip(clipName);
  }

  think(dt, sim, p, dist, toPlayer, hunting) {
    const home = this.opts.spawn, lair = this.opts.lair, fromHome = Math.hypot(p.x - home[0], p.z - home[1]);
    const inTerritory = fromHome < this.opts.territory;
    switch (this.state) {
      case STATE.BASK: case STATE.ROAM: this.thinkCalm(dt, sim, p, dist, toPlayer, hunting); break;
      case STATE.ALERT:
        // All three heads come round. It looks a long time before it does anything.
        this.halt(dt, 'idle');
        this.yaw = turn(this.yaw, toPlayer, 1.1 * dt);
        if (!hunting || (this.aware < 0.25 && this.stateT > 2)) { this.setState(STATE.BASK); this.waitT = 4; break; }
        if (this.stateT > 1.6) {
          if (sim.time - this.angerAt < 40) { this.setState(STATE.HUNT); break; }
          if (inTerritory || dist < 16) this.startDisplay(sim);
          else if (this.aware > 1.1) { this.setState(STATE.ROAM); this.waitT = 0; }
        }
        break;
      case STATE.DISPLAY: {
        this.halt(dt);
        this.yaw = turn(this.yaw, toPlayer, 0.9 * dt);
        const c = this.rig.clips[this.clip];
        if (this.t >= c.dur) {
          this.warned++;
          if (!hunting) { this.setState(STATE.BASK); break; }
          if (!inTerritory && dist > 22) { this.setState(STATE.ALERT); this.aware = 0.6; break; }
          if (this.warned >= 2 || dist < 13 || this.hp < this.maxHp) { this.hostile = true; this.angerAt = sim.time; this.setState(STATE.HUNT); break; }
          this.startDisplay(sim);
        }
        break;
      }
      case STATE.HUNT: this.thinkHunt(dt, sim, p, dist, toPlayer, hunting); break;
      case STATE.HURT: {
        this.halt(dt);
        const c = this.rig.clips.hurt;
        if (this.t >= c.dur) {
          // Down to its last head, it wants its ground under it. It only runs once.
          if (this.headsLeft() === 1 && !this.fled) { this.fled = true; this.setState(STATE.FLEE); break; }
          this.setState(STATE.HUNT); this.cooldown = 0.6;
        }
        break;
      }
      case STATE.FLEE: {
        this.go(dt, sim, lair[0], lair[1], STRIDE.run_lumber, 'run_lumber', 1.8);
        if (Math.hypot(lair[0] - this.x, lair[1] - this.z) < 4 || this.stateT > 12) this.setState(STATE.LAIR);
        break;
      }
      case STATE.LAIR:
        // It stops bleeding if it's left alone. Come after it and there's no more warning.
        this.halt(dt, 'idle');
        this.bleeds.forEach((b) => { b.rate = Math.max(0, b.rate - dt * 0.05); });
        this.bleeds = this.bleeds.filter((b) => b.rate > 0.02);
        if (hunting && dist < 14) { this.hostile = true; this.angerAt = sim.time; this.setState(STATE.HUNT); }
        break;
      default: this.setState(STATE.BASK);
    }
  }

  thinkCalm(dt, sim, p, dist, toPlayer, hunting) {
    if (hunting && this.aware > 0.5) {
      this.setState(STATE.ALERT);
      if (!sim.hydraSeen) { sim.hydraSeen = true; sim.event(EV.HYDRA_NOTICE); }
      sim.event(EV.ALERT, this.x, this.y + 2, this.z);
      return;
    }
    if (this.state === STATE.BASK) {
      // Left to itself it does nothing much, and its heads fall out with each other.
      this.bickerT -= dt;
      if (this.clip === 'taunt_bicker') {
        this.halt(dt);
        if (this.t >= this.rig.clips.taunt_bicker.dur) this.setClip('idle');
      } else {
        this.halt(dt, 'idle');
        if (this.bickerT <= 0 && this.headsLeft() > 1) { this.bickerT = 16 + Math.random() * 18; this.setClip('taunt_bicker'); sim.event(EV.ROAR, this.x, this.y + 2.2, this.z, 0.25); }
      }
      this.waitT -= dt;
      if (this.waitT <= 0 && this.clip === 'idle') {
        const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * (this.opts.territory * 0.45);
        this.wx = clamp(this.opts.spawn[0] + Math.sin(a) * r, PIT.x0, PIT.x1); this.wz = clamp(this.opts.spawn[1] + Math.cos(a) * r, PIT.z0, PIT.z1);
        this.setState(STATE.ROAM);
      }
    } else {
      this.go(dt, sim, this.wx, this.wz, STRIDE.walk_lumber, 'walk_lumber', 1);
      if (Math.hypot(this.wx - this.x, this.wz - this.z) < 3 || this.stateT > 30) { this.setState(STATE.BASK); this.waitT = 14 + Math.random() * 16; }
    }
  }

  startDisplay(sim) {
    this.setState(STATE.DISPLAY);
    this.setClip('taunt_roar');
    sim.event(EV.ROAR, this.x, this.y + 2.2, this.z, 1);
  }

  // It comes straight on. It's too heavy to circle and doesn't need to.
  thinkHunt(dt, sim, p, dist, toPlayer, hunting) {
    if (!hunting) { this.setState(STATE.ROAM); this.hostile = false; return; }
    // It won't follow you far off its ground, unless you're close enough to still be cutting at it.
    const strayed = Math.hypot(this.x - this.opts.spawn[0], this.z - this.opts.spawn[1]);
    if (this.aware < 0.12 || (strayed > this.opts.territory + 18 && dist > 9)) { this.hostile = false; this.angerAt = -1e9; this.aware = 0.3; this.wx = this.opts.spawn[0]; this.wz = this.opts.spawn[1]; this.setState(STATE.ROAM); return; }
    const heads = this.headsLeft();
    const off = Math.abs(wrapAngle(toPlayer - this.yaw));
    if (this.cooldown <= 0 && !p.dead) {
      const pick = this.choose(dist, off, heads);
      if (pick) { this.startAttack(sim, pick, toPlayer); return; }
    }
    const rage = heads === 1 ? 1.2 : 1;
    if (dist > 20) this.go(dt, sim, p.x, p.z, STRIDE.run_charge * rage, 'run_charge', 1.5);
    else if (dist > 12) this.go(dt, sim, p.x, p.z, STRIDE.run_lumber * rage, 'run_lumber', 1.6);
    else if (dist > 4.5) this.go(dt, sim, p.x, p.z, STRIDE.walk_lumber * 1.3 * rage, 'walk_lumber', 1.6);
    else {
      // Right on top of it: it turns to bring the heads round, shuffling.
      this.halt(dt, 'walk_stalk');
      this.yaw = turn(this.yaw, toPlayer, 1.4 * dt);
    }
  }

  // Which attack the distance, the angle and the heads it still has allow, without doing the same thing twice running.
  choose(dist, off, heads) {
    const N = this.necks, opts = [];
    const add = (name, w) => { if (name !== this.last) for (let i = 0; i < w; i++) opts.push(name); };
    if (dist < 3.4 && off > 1.6) add('attack_tail_sweep', this.tailOn ? 5 : 2);
    if (off < 1.1) {
      if (dist < 3.4) { add('attack_claw', 3); add('attack_stomp', 2); if (N.m.head) add('attack_bite', 3); add('attack_triple_bite', 2); }
      else if (dist < 5) { add('attack_triple_bite', 2); if (N.m.head) add('attack_bite', 3); add('attack_stomp', 2); add('jump', 2); }
      if (dist > 5 && dist < 13) {
        if (N.m.head) add('attack_fire_cone', 3);
        if (heads > 1) add('attack_fire_triple', 3);
        if (N.r.head || N.l.head) add('attack_fire_sweep', 3);
      }
    }
    return opts.length ? opts[Math.floor(Math.random() * opts.length)] : null;
  }

  // For the debug console: a given attack, now.
  force(sim, i) { const p = sim.player; this.startAttack(sim, Object.keys(ATTACKS)[i], Math.atan2(p.x - this.x, p.z - this.z)); }

  startAttack(sim, name, toPlayer) {
    this.setClip(name);
    this.last = name;
    this.attack = ATTACKS[name];
    this.state = STATE.ATTACK; this.stateT = 0;
    this.hostile = true; this.angerAt = sim.time;
    this.used = new Set(); this.slammed = false; this.fireClock = 0; this.burnClock = 0;
    this.speed = 0;
    sim.event(EV.GRUNT, this.x, this.y + 2, this.z, 2);
  }

  // How far the piece doing the hitting is from your body, feet to crown.
  gapTo(p, by) {
    const wt = this.rig.wt;
    let n = `${by}_jaw`;
    if (by === 'R' || by === 'L') n = `${by}_fore_paw`;
    else if (by === 'tail') n = this.tailOn ? 'tail_5' : 'tail_3';
    const j = this.jointOf(n), x = wt[j * 3], y = wt[j * 3 + 1], z = wt[j * 3 + 2];
    return Math.hypot(x - p.x, y - clamp(y, p.y, p.y + 1.8), z - p.z);
  }

  thinkAttack(dt, sim, p, dist, toPlayer) {
    const a = this.attack, c = this.rig.clips[this.clip];
    this.t += dt * (this.headsLeft() === 1 ? 1.12 : 1);
    const f = this.t * 30;
    const L = a.lunge;
    if (L) {
      const v = L.v * clamp((f - L.f0) / L.ramp, 0, 1) * clamp((L.f1 - f) / L.ramp, 0, 1), go = dist > 2.2 ? 1 : 0;
      this.vx = Math.sin(this.yaw) * v * go; this.vz = Math.cos(this.yaw) * v * go;
    } else { this.vx = damp(this.vx, 0, 7, dt); this.vz = damp(this.vz, 0, 7, dt); }
    if (a.hits) {
      const first = a.hits[0].at;
      // The tail sweeps round its left and rear, so it swings its hips to bring you under that; everything else faces you.
      if (f < first - 2) this.yaw = turn(this.yaw, toPlayer + (a.pivot || 0), 1.8 * dt);
      for (const h of a.hits) {
        if (this.used.has(h)) continue;
        const to = h.to ?? h.at + 3;
        if (f < h.at - 1.5 || f > to) continue;
        if (NECKS.includes(h.by) && !this.necks[h.by].head) continue;
        const near = (h.by === 'both' ? dist : this.gapTo(p, h.by)) < a.reach;
        if (near && !p.dead && !p.iframes && Math.abs(p.y - this.y) < 3 && (a.wide || Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.4)) {
          this.used.add(h); this.bites++;
          const landed = p.damage(sim, a.dmg, this.x, this.z, a.knock || 0);
          if (landed) sim.event(EV.HURT, p.x, p.y + 1.1, p.z, a.dmg);
        }
      }
      if (a.slam && f >= a.slam && !this.slammed) {
        this.slammed = true;
        const sx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
        sim.event(EV.GROUND, this.x + sx * 1.3 + cz * 0.7, this.y, this.z + cz * 1.3 - sx * 0.7);
        sim.event(EV.GROUND, this.x + sx * 1.3 - cz * 0.7, this.y, this.z + cz * 1.3 + sx * 0.7);
        sim.event(EV.CHUNK_LAND, this.x + sx * 1.3, this.y, this.z + cz * 1.3, 1);
        p.trauma = Math.min(1, (p.trauma || 0) + clamp(1 - dist / 14, 0, 0.7));
      }
    }
    if (a.fire) {
      const lit = a.fire[0][1];
      // Rakes turn with the clip alone; straight fire tracks you, slowly, so you can get out of it.
      if (f < lit) this.yaw = turn(this.yaw, toPlayer, 1.5 * dt);
      else if (!a.rake) this.yaw = turn(this.yaw, toPlayer, 0.32 * dt);
      this.fireClock -= dt; this.burnClock -= dt;
      const emit = this.fireClock <= 0, burn = this.burnClock <= 0;
      if (emit) this.fireClock = 1 / 30;
      for (const [k, f0, f1] of a.fire) if (f >= f0 && f < f1 && this.necks[k].head) this.breathe(sim, p, k, emit, burn, a);
      if (burn && f >= lit) this.burnClock = FIRE_TICK;
    }
    if (this.t >= c.dur) {
      this.attack = null;
      this.setState(STATE.HUNT);
      const n = this.headsLeft();
      this.cooldown = (a.fire ? 2.2 : 1.3) * (n === 1 ? 0.6 : 1) + Math.random() * 1.1;
      this.setClip('walk_lumber');
    }
  }

  // One head's fire this instant: out of its mouth, along its head, bent down to reach the ground it's aimed at.
  breathe(sim, p, k, emit, burn, a) {
    const j = this.jointOf(`${k}_head`), { pq, pt } = this.rig;
    const m = MOUTH[k];
    tv[0] = m[0] * S; tv[1] = m[1] * S; tv[2] = m[2] * S;
    quatRotate(tv2, 0, pq, j * 4, tv, 0);
    const ox = tv2[0] + pt[j * 3], oy = tv2[1] + pt[j * 3 + 1], oz = tv2[2] + pt[j * 3 + 2];
    tv[0] = 0; tv[1] = 0; tv[2] = 1;
    quatRotate(tv2, 0, pq, j * 4, tv, 0);
    let dx = tv2[0], dz = tv2[2];
    const hl = Math.hypot(dx, dz) || 1;
    dx /= hl; dz /= hl;
    // How far it's aiming: at you if you're in front of it, otherwise along the ground at a rake's distance.
    const to = Math.hypot(p.x - ox, p.z - oz);
    const ahead = (p.x - ox) * dx + (p.z - oz) * dz;
    const aim = a.rake || ahead < to * 0.75 ? 6.5 : clamp(to, 3, FIRE_RANGE);
    const drop = (PIT.y + (a.rake ? 0 : 1) - oy) / aim;
    const dy = clamp(drop, -1.2, 0.3), L = Math.hypot(1, dy);
    const nx = dx / L, ny = dy / L, nz = dz / L;
    if (emit) {
      sim.event(EV.FIRE, ox, oy, oz, nx, ny, nz);
      // Where it comes down, the ground burns.
      const gy = PIT.y;
      if (dy < -0.08 && aim * L < FIRE_RANGE) sim.event(EV.FIRE_HIT, ox + dx * aim, gy + 0.05, oz + dz * aim);
    }
    if (!burn || p.dead || p.iframes) return;
    // You're in it if you're near the line, and it widens as it goes.
    const px = p.x - ox, py = p.y + 1 - oy, pz = p.z - oz;
    const along = px * nx + py * ny + pz * nz;
    if (along < 0 || along > FIRE_RANGE) return;
    const off = Math.hypot(px - nx * along, py - ny * along, pz - nz * along);
    if (off < 0.8 + along * 0.17) {
      this.bites++;
      p.damage(sim, FIRE_DMG * a.rate, ox, oz, -1.9);
      sim.event(EV.BURN, p.x, p.y + 1, p.z);
    }
  }

  onHit(sim, kind) {
    this.aware = 1.4;
    if (!this.hostile) { this.hostile = true; this.angerAt = sim.time; }
    if (this.state === STATE.BASK || this.state === STATE.ROAM || this.state === STATE.ALERT || this.state === STATE.DISPLAY || this.state === STATE.LAIR) this.setState(STATE.HUNT);
    if (kind === 'puncture') this.cooldown = Math.max(this.cooldown, 0.4);
  }

  die(sim) {
    this.dead = true; this.hp = 0;
    this.state = STATE.DEAD; this.attack = null;
    this.setClip('death');
    sim.event(EV.CRAB_DIE, this.x, this.y + 0.3, this.z);
    sim.event(EV.ROAR, this.x, this.y + 2.2, this.z, 0.6);
  }
}
