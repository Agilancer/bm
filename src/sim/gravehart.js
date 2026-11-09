// The Gravehart: an animal, not a soldier. It keeps a territory north of the village and has no interest in the duel.
// It wanders, sniffs and feeds until it notices you, by eye, by ear or by scent on the wind. It warns you off before it
// fights, and if you leave it lets you. If you stay it hunts: it stalks from behind and freezes when you look round, it
// pounces on a turned back, it charges from range, and it breaks off after each strike to circle and pick its moment.
// Hurt badly enough, it runs for its lair and fights like a cornered thing if you follow it there.
import { EV } from '../core/layout.js';
import { clamp, damp, quatYaw, wrapAngle } from '../core/math.js';
import { Beast } from './beast.js';
import { foeOf } from './foes.js';

export const GRAVEHART_SCALE = 3.0;
const S = GRAVEHART_SCALE;
// Floor speeds of the clips, from assets/monsters/gravehart/clips.json, at this size.
const STRIDE = { walk_prowl: 0.16 * S, walk_roam: 0.34 * S, run_lope: 1.1739 * S, run_gallop: 2.1111 * S };
// Windows and lunges are fractions of each clip.
const lunge = (f0, f1, dist, frames, rate = 1, ramp = 0) => [f0 / frames, f1 / frames, dist * S / ((f1 - f0 - ramp) / 30 / rate), Math.max(ramp, 0.01) / frames];
const ATTACKS = {
  attack_bite: { rate: 1.05, windows: [[0.34, 0.47]], reach: 1.0 * S, dmg: 20, lunge: lunge(13, 22, 0.2, 56, 1.05), joints: ['head', 'jaw'] },
  attack_swipe: { rate: 1.0, windows: [[0.42, 0.52], [0.58, 0.68]], reach: 0.8 * S, dmg: 16, lunge: lunge(30, 46, 0.06, 68), knock: 3, joints: ['R_fore_paw', 'L_fore_paw'] },
  attack_pounce: { rate: 1.0, windows: [[0.56, 0.68]], reach: 0.95 * S, dmg: 30, lunge: lunge(26, 42, 0.95, 76, 1, 2), knock: 7, joints: ['head', 'R_fore_paw', 'L_fore_paw'] },
  attack_antler_charge: { rate: 1.0, reach: 0.75 * S, dmg: 34, knock: 11, joints: ['head', 'antler_L_1', 'antler_R_1'], charge: { from: 30 / 112, to: 76 / 112, speed: 2.1111 * S * 1.33, hook: 77 / 112, rate: 1.33, cycle: 18 / 30, relap: 72 / 112, range: 26 } },
  jump: { rate: 1.05, windows: [[0.6, 0.68]], reach: 0.7 * S, dmg: 14, lunge: lunge(20, 34, 0.55, 60, 1.05, 2), knock: 4, joints: ['R_fore_paw', 'L_fore_paw'] },
};
const STATE = { ROAM: 0, GRAZE: 1, ALERT: 2, ATTACK: 3, DISPLAY: 4, STALK: 5, CIRCLE: 6, FLEE: 7, LAIR: 8, FEED: 9, DEAD: 10 };
const tv = new Float32Array(3), flow = new Float32Array(2);
// How far each leap reaches: the distance it covers plus what it can hit from where it lands.
const POUNCE = 5.4, LEAP = 3.7;
const WIND = [0.6, 0.8]; // which way the air moves; it carries your scent along it

function turn(a, b, step) { const d = wrapAngle(b - a); return wrapAngle(a + clamp(d, -step, step)); }

export class Gravehart extends Beast {
  constructor(id, kind, rig, opts) {
    super(id, kind, rig, opts);
    this.bodyRadius = 1.5;
    const J = (n) => rig.index.get(n);
    const sph = (n, r) => ({ j: J(n), r: r * S });
    this.spheres = [sph('cog', 0.17), sph('pelvis', 0.16), sph('spine_1', 0.17), sph('spine_2', 0.18), sph('chest', 0.18), sph('neck_1', 0.13), sph('neck_2', 0.11), sph('head', 0.09), sph('tail_1', 0.08), sph('tail_2', 0.07)];
    for (const s of ['L', 'R']) {
      for (const n of ['fore_upper', 'fore_fore', 'fore_paw', 'hind_thigh', 'hind_shin', 'hind_meta']) this.spheres.push(sph(`${s}_${n}`, 0.065));
      this.spheres.push(sph(`antler_${s}_1`, 0.05), sph(`antler_${s}_2`, 0.05));
    }
    this.jointOf = J;
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw, vx: 0, vz: 0, speed: 0, hp: opts.hp, maxHp: opts.hp, stam: 100, armor: 1,
      state: STATE.GRAZE, stateT: 0, dead: false, deadT: 0, hostile: false, iframes: false, shieldUp: 0, gashes: [], bleeds: [], heart: Math.random(), gashVersion: (this.gashVersion || 0) + 1,
      clip: 'idle', t: Math.random() * 3, fade: 1, attack: null, activeOn: -1, used: false, cooldown: 0, bites: 0, flinch: 0, stepClock: 0,
      aware: 0, warned: 0, angerAt: -99, onTerritory: 0, wx: opts.spawn[0], wz: opts.spawn[1], waitT: 2, circleDir: 1, circleT: 0, frozenT: 0, fled: false, restT: 0, meal: null, ate: new Set(), tauntNext: 'taunt_bellow', dust: false, stuck: 0, rush: 0, chargeRun: 0, frenzy: false,
    });
    this.rig.rot.set(this.rig.restR); this.rig.tr.set(this.rig.restT);
    this.rig.rot2.set(this.rig.restR); this.rig.tr2.set(this.rig.restT);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // ---- senses -----------------------------------------------------------------------------------------

  // How strongly it notices the player this instant: 1 builds to full awareness in about a second.
  sense(p, dist, toPlayer) {
    if (p.dead) return 0;
    const facing = Math.abs(wrapAngle(toPlayer - this.yaw));
    const eyes = this.state === STATE.FEED ? 0.35 : 1;
    let n = 0;
    if (dist < 34 && facing < 1.9) n = Math.max(n, eyes * clamp(1.5 - dist / 24, 0, 1.4) * (p.sprinting ? 1.25 : 1));
    const loud = p.sprinting ? 22 : p.swinging ? 18 : Math.hypot(p.vx, p.vz) > 0.5 ? 11 : 4;
    if (dist < loud) n = Math.max(n, 1.1 * (1 - dist / loud));
    // Scent runs downwind: from the player toward it along the moving air.
    const dx = this.x - p.x, dz = this.z - p.z, along = (dx * WIND[0] + dz * WIND[1]) / Math.max(dist, 0.01);
    if (along > 0.55 && dist < 40) n = Math.max(n, 0.55 * (1 - dist / 40));
    return n;
  }

  // Whether the player is looking its way.
  watched(p) {
    const py = wrapAngle(Math.atan2(this.x - p.x, this.z - p.z) - p.yaw);
    return Math.abs(py) < 0.75;
  }

  update(dt, sim) {
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt / 0.16);
    const p = foeOf(this, sim);
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz), toPlayer = Math.atan2(dx, dz);
    this.heart += dt * 1.2;
    if (this.bleeds.length && !this.dead) { let flow_ = 0; for (const b of this.bleeds) flow_ += b.rate; this.hp -= dt * flow_ * 2.2; }
    if (this.hp <= 0 && !this.dead) this.die(sim);
    this.flinch = Math.max(0, this.flinch - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.stuck = Math.max(0, this.stuck - dt);
    let rate = this.flinch > 0 ? 0.4 : 1;
    const hunting = !p.dead && sim.gameState === 0;
    if (!this.dead) {
      const n = hunting ? this.sense(p, dist, toPlayer) : 0;
      this.aware = clamp(this.aware + (n > 0 ? n * dt : -dt * 0.09), 0, 1.4);
    }
    if (this.dead) {
      this.deadT += dt;
      this.vx = damp(this.vx, 0, 4, dt); this.vz = damp(this.vz, 0, 4, dt);
      const c = this.rig.clips.death;
      this.t = Math.min(this.t + dt, c.dur);
      rate = 0;
    } else if (this.state === STATE.ATTACK) {
      this.thinkAttack(dt, sim, p, dist, toPlayer);
    } else if (this.stuck > 0) {
      // Antlers driven into something: it has to wrench itself free.
      this.vx = damp(this.vx, 0, 7, dt); this.vz = damp(this.vz, 0, 7, dt); this.speed = 0;
      this.setClip('taunt_thrash');
    } else {
      this.think(dt, sim, p, dist, toPlayer, hunting);
    }
    this.x += this.vx * dt; this.z += this.vz * dt;
    tv[0] = this.x; tv[2] = this.z;
    sim.world.resolve(tv, 1.05, this.y + 0.6);
    this.hitWall = Math.hypot(tv[0] - this.x, tv[2] - this.z) > 0.04;
    this.x = tv[0]; this.z = tv[2];
    this.y = sim.world.height(this.x, this.z);
    if (this.state !== STATE.ATTACK && !this.dead) {
      const stride = STRIDE[this.clip];
      if (stride) rate *= clamp(this.speed / stride, 0.3, 1.45);
      const c = this.rig.clips[this.clip];
      this.t += dt * rate;
      if (!c.loop && this.t > c.dur) this.t = c.dur;
      if (stride) {
        this.stepClock += dt * rate * 4 / c.dur;
        if (this.stepClock > 1 && this.speed > 0.1) {
          this.stepClock -= 1;
          sim.event(EV.STEP, this.x, this.y, this.z, clamp(this.speed / 6, 0.2, 1), 2, this.id);
        }
      }
    }
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT[0] = this.x; this.rig.rootT[1] = this.y; this.rig.rootT[2] = this.z;
  }

  // Steers along the village's flow field, with the wide, committed turns of something this heavy.
  go(dt, sim, tx, tz, speed, clipName, turnRate) {
    sim.world.updateField(tx, tz, sim.time, 7);
    sim.world.flow(flow, this.x, this.z, tx, tz, 7);
    const k = 1 - Math.exp(-3.6 * dt);
    this.vx += (flow[0] * speed - this.vx) * k; this.vz += (flow[1] * speed - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
    if (this.speed > 0.2) this.yaw = turn(this.yaw, Math.atan2(this.vx, this.vz), (turnRate || 2.2) * dt);
    this.setClip(clipName);
  }

  halt(dt, clipName) {
    this.vx = damp(this.vx, 0, 5, dt); this.vz = damp(this.vz, 0, 5, dt);
    this.speed = Math.hypot(this.vx, this.vz);
    if (clipName && this.speed < 0.6) this.setClip(clipName);
  }

  think(dt, sim, p, dist, toPlayer, hunting) {
    const home = this.opts.spawn, lair = this.opts.lair, fromHome = Math.hypot(p.x - home[0], p.z - home[1]);
    const inTerritory = fromHome < this.opts.territory;
    const weak = this.hp < this.maxHp * 0.3;
    // First wound: it flees once, the moment the hurt is more than it wants.
    if (weak && !this.fled && this.state !== STATE.FLEE) { this.fled = true; this.setState(STATE.FLEE); sim.event(EV.GRUNT, this.x, this.y + 1.2, this.z, 2); }
    switch (this.state) {
      case STATE.ROAM: case STATE.GRAZE: this.thinkCalm(dt, sim, p, dist, toPlayer, hunting, inTerritory); break;
      case STATE.FEED: this.thinkFeed(dt, sim, p, dist, toPlayer, hunting); break;
      case STATE.ALERT: {
        // Stops dead and looks hard at what it heard, deciding.
        this.halt(dt, 'idle');
        this.yaw = turn(this.yaw, toPlayer, 2.4 * dt);
        if (this.clip === 'idle') this.t = Math.max(this.t, 0);
        if (!hunting || (this.aware < 0.25 && this.stateT > 1.5)) { this.setState(STATE.ROAM); this.waitT = 0; break; }
        if (this.stateT > 1.2 + Math.random() * 0.02) {
          if (sim.time - this.angerAt < 40) { this.setState(STATE.STALK); break; }
          if (inTerritory || dist < 16) this.startDisplay(sim);
          else if (this.aware > 1.1 && dist < 30) { this.setState(STATE.ROAM); this.waitT = 0; }
        }
        break;
      }
      case STATE.DISPLAY: {
        // The warning: stands broadside to its size and makes its noise. You have until it finishes to leave.
        this.halt(dt);
        this.yaw = turn(this.yaw, toPlayer, 1.4 * dt);
        const c = this.rig.clips[this.clip];
        if (this.clip === 'taunt_thrash' && this.t > c.dur * 0.2 && this.t < c.dur * 0.26 && !this.dust) { this.dust = true; sim.event(EV.GROUND, this.x + Math.sin(this.yaw) * 1.3, this.y, this.z + Math.cos(this.yaw) * 1.3); }
        if (this.t >= c.dur) {
          this.dust = false;
          this.warned++;
          if (!hunting) { this.setState(STATE.ROAM); break; }
          // A warning heeded is the end of it. It watches you go.
          if (!inTerritory && dist > 22) { this.setState(STATE.ALERT); this.aware = 0.6; break; }
          if (this.warned >= 2 || dist < 13 || this.hp < this.maxHp) { this.hostile = true; this.angerAt = sim.time; this.setState(STATE.STALK); break; }
          this.startDisplay(sim);
        }
        break;
      }
      case STATE.STALK: this.thinkStalk(dt, sim, p, dist, toPlayer, hunting, fromHome); break;
      case STATE.CIRCLE: this.thinkCircle(dt, sim, p, dist, toPlayer, hunting); break;
      case STATE.FLEE: {
        const d = Math.hypot(lair[0] - this.x, lair[1] - this.z);
        this.go(dt, sim, lair[0], lair[1], STRIDE.run_gallop * 0.9, 'run_gallop', 2.6);
        if (d < 4 || this.stateT > 14) { this.setState(STATE.LAIR); this.restT = 0; }
        break;
      }
      case STATE.LAIR: {
        // Licking its wounds. Bleeding stops and strength creeps back, as long as nothing comes near.
        this.halt(dt, 'idle');
        this.restT += dt;
        this.bleeds.forEach((b) => { b.rate = Math.max(0, b.rate - dt * 0.05); });
        this.bleeds = this.bleeds.filter((b) => b.rate > 0.02);
        this.hp = Math.min(this.maxHp * 0.6, this.hp + dt * 2.2);
        if (hunting && dist < 11) {
          // Cornered. There's nowhere left to run, so nothing holds it back now.
          this.yaw = turn(this.yaw, toPlayer, 3 * dt);
          this.hostile = true; this.angerAt = sim.time;
          this.frenzy = true;
          this.setState(STATE.CIRCLE); this.circleT = 0;
          sim.event(EV.ALERT, this.x, this.y + 1.5, this.z);
        } else if (this.hp >= this.maxHp * 0.6) { this.fled = false; this.setState(STATE.GRAZE); this.waitT = 4; }
        break;
      }
      default: this.setState(STATE.ROAM);
    }
  }

  thinkCalm(dt, sim, p, dist, toPlayer, hunting, inTerritory) {
    if (hunting && this.aware > 0.5) {
      this.setState(STATE.ALERT);
      if (!sim.heartSeen) { sim.heartSeen = true; sim.event(EV.BEAST_NOTICE); }
      sim.event(EV.ALERT, this.x, this.y + 1.5, this.z);
      return;
    }
    // Anything dead on its ground is a meal.
    for (const k of sim.knights) {
      if (k === this || !k.dead || k.dormant || this.ate.has(k.id)) continue;
      if (Math.hypot(k.x - this.opts.spawn[0], k.z - this.opts.spawn[1]) < this.opts.territory + 8) { this.meal = k; this.setState(STATE.FEED); return; }
    }
    if (this.state === STATE.GRAZE) {
      this.halt(dt, 'idle');
      this.waitT -= dt;
      if (this.waitT <= 0) {
        const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * (this.opts.territory - 7);
        this.wx = this.opts.spawn[0] + Math.sin(a) * r; this.wz = this.opts.spawn[1] + Math.cos(a) * r;
        this.setState(STATE.ROAM);
      }
    } else {
      this.go(dt, sim, this.wx, this.wz, STRIDE.walk_roam, 'walk_roam', 1.5);
      if (Math.hypot(this.wx - this.x, this.wz - this.z) < 2.5 || this.stateT > 22) { this.setState(STATE.GRAZE); this.waitT = 5 + Math.random() * 7; }
    }
  }

  thinkFeed(dt, sim, p, dist, toPlayer, hunting) {
    const k = this.meal;
    if (hunting && this.aware > 0.75) { this.setState(STATE.ALERT); return; }
    if (!k || !k.dead) { this.setState(STATE.ROAM); return; }
    const d = Math.hypot(k.x - this.x, k.z - this.z);
    if (d > 2.6) { this.go(dt, sim, k.x, k.z, STRIDE.walk_roam, 'walk_roam', 1.6); this.stateT = 0; return; }
    this.halt(dt, 'idle');
    this.yaw = turn(this.yaw, Math.atan2(k.x - this.x, k.z - this.z), 1.2 * dt);
    // The stretch of its idle with its nose to the ground, held and worked over.
    const c = this.rig.clips.idle, f = this.t / c.dur * 180;
    if (f < 56 || f > 94) this.t = (58 / 180) * c.dur;
    if (this.stateT > 20) { this.ate.add(k.id); this.meal = null; this.setState(STATE.GRAZE); this.waitT = 3; }
  }

  startDisplay(sim) {
    this.setState(STATE.DISPLAY);
    const name = this.tauntNext;
    this.tauntNext = name === 'taunt_bellow' ? 'taunt_thrash' : 'taunt_bellow';
    this.setClip(name);
    sim.event(EV.ROAR, this.x, this.y + 1.6, this.z, name === 'taunt_bellow' ? 1 : 0.55);
  }

  // Comes on low and wide, keeping behind you. Freezes while you look its way. Your back is what it wants.
  thinkStalk(dt, sim, p, dist, toPlayer, hunting, fromHome) {
    if (!hunting) { this.setState(STATE.ROAM); this.hostile = false; return; }
    // It lets you go if you've left its ground for a good while.
    if (this.aware < 0.12 || (fromHome > this.opts.territory + 26 && this.stateT > 6 && dist > 26)) { this.hostile = false; this.setState(STATE.ROAM); return; }
    const watched = this.watched(p);
    const behind = !watched;
    if (dist > 22) {
      // Too far to creep: lopes in, wide.
      const a = toPlayer + Math.PI + this.circleDir * 0.7, tx = p.x + Math.sin(a) * 11, tz = p.z + Math.cos(a) * 11;
      this.go(dt, sim, tx, tz, STRIDE.run_lope, 'run_lope', 2.2);
      return;
    }
    if (this.cooldown <= 0 && !p.dead) {
      if (behind && dist < POUNCE && dist > 4) { this.startAttack(sim, 'attack_pounce', toPlayer); return; }
      if (behind && dist < 11) { this.startRush(); return; }
      if (dist < 4) { this.startAttack(sim, Math.random() < 0.6 ? 'attack_bite' : 'attack_swipe', toPlayer); return; }
      if (watched && dist > 11 && dist < 21 && this.stateT > 1.4) { this.startAttack(sim, 'attack_antler_charge', toPlayer); return; }
      if (watched && dist < 11 && this.stateT > 2.5) { this.startRush(); return; }
    }
    if (watched && dist > 7) {
      // Stock-still under your eye, for as long as its nerve holds.
      this.frozenT += dt;
      if (this.frozenT < 2.6) { this.halt(dt, 'walk_prowl'); this.t += 0; this.yaw = turn(this.yaw, toPlayer, 1.0 * dt); return; }
    } else this.frozenT = 0;
    // Works round toward your back.
    const a = p.yaw + Math.PI + this.circleDir * 0.3, r = clamp(dist - 2, 4.5, 14);
    const tx = p.x + Math.sin(a) * r, tz = p.z + Math.cos(a) * r;
    this.go(dt, sim, tx, tz, STRIDE.walk_prowl * 1.4, 'walk_prowl', 2);
  }

  // Keeps its distance and walks an arc round you, head on you, reading you. Strikes when you've spent yourself.
  thinkCircle(dt, sim, p, dist, toPlayer, hunting) {
    if (!hunting) { this.setState(STATE.ROAM); this.hostile = false; return; }
    if (this.rush > 0) {
      // Done reading you: it drops the circle and comes straight in, and leaps when the leap will carry.
      this.rush -= dt;
      this.go(dt, sim, p.x, p.z, STRIDE.run_gallop * 0.9, 'run_gallop', 3.2);
      if (dist < POUNCE) { this.rush = 0; this.strikeClose(sim, dist, toPlayer); }
      return;
    }
    this.circleT -= dt;
    const a = toPlayer + Math.PI + this.circleDir * 0.55;
    const want = this.frenzy ? 5 : 8;
    const tx = p.x + Math.sin(a) * want, tz = p.z + Math.cos(a) * want;
    const away = dist < 5.5 && this.stateT < 1.6;
    this.go(dt, sim, tx, tz, away ? STRIDE.run_lope * 1.1 : STRIDE.walk_roam * 1.35, away ? 'run_lope' : 'walk_roam', 3);
    if (!away) this.yaw = turn(this.yaw, toPlayer, 2.2 * dt);
    if (this.circleT <= 0) { this.circleDir = -this.circleDir; this.circleT = 2 + Math.random() * 3; }
    if (this.cooldown > 0) return;
    const spent = p.swinging || p.stamina < 25 || !this.watched(p);
    const patience = this.frenzy ? 1 : (spent ? 1.2 : 5);
    if (this.stateT > patience) {
      if (dist < POUNCE) this.strikeClose(sim, dist, toPlayer);
      else if (dist < 11) this.startRush();
      else if (dist < 21) this.startAttack(sim, 'attack_antler_charge', toPlayer);
      else this.setState(STATE.STALK);
    } else if (dist > 24) this.setState(STATE.STALK);
    else if (this.stateT > 3 && Math.random() < dt * 0.12 && dist > 7) this.startDisplay(sim);
  }

  startRush() { this.setState(STATE.CIRCLE); this.rush = 2.6; this.frozenT = 0; }

  // Picks whichever strike reaches from here.
  strikeClose(sim, dist, toPlayer) {
    if (dist < 3.2) this.startAttack(sim, Math.random() < 0.55 ? 'attack_bite' : 'attack_swipe', toPlayer);
    else if (dist < LEAP && Math.random() < 0.45) this.startAttack(sim, 'jump', toPlayer);
    else this.startAttack(sim, 'attack_pounce', toPlayer);
  }

  startAttack(sim, name, toPlayer) {
    this.setClip(name);
    this.attack = ATTACKS[name];
    this.joints = this.attack.joints.map((n) => this.jointOf(n));
    this.state = STATE.ATTACK; this.stateT = 0;
    this.hostile = true; this.angerAt = sim.time;
    this.activeOn = -1; this.used = false; this.impact = false; this.frozenT = 0;
    this.chargeYaw = toPlayer; this.chargeRun = 0; this.rush = 0;
    sim.event(EV.GRUNT, this.x, this.y + 1.2, this.z, 2);
  }

  reachOf(p) {
    let d = Math.hypot(p.x - this.x, p.z - this.z);
    const wt = this.rig.wt;
    for (const j of this.joints) d = Math.min(d, Math.hypot(wt[j * 3] - p.x, wt[j * 3 + 2] - p.z));
    return d;
  }

  land(sim, p, a) {
    this.used = true;
    this.bites++;
    const landed = p.damage(sim, a.dmg, this.x, this.z, a.knock || 0);
    if (landed && p === sim.player) sim.event(EV.HURT, p.x, p.y + 1.1, p.z, a.dmg);
  }

  thinkAttack(dt, sim, p, dist, toPlayer) {
    const a = this.attack, c = this.rig.clips[this.clip];
    const ch = a.charge;
    let f = this.t / c.dur;
    const running = ch && f >= ch.from && f < ch.to;
    this.t += dt * a.rate * (running ? ch.rate : 1) * (this.flinch > 0 ? 0.45 : 1);
    f = this.t / c.dur;
    if (ch) {
      this.speed = 0;
      if (f < ch.from) {
        // Scraping the ground, sighting along its antlers.
        this.chargeYaw = toPlayer;
        this.yaw = turn(this.yaw, toPlayer, 2.6 * dt);
        this.vx = damp(this.vx, 0, 6, dt); this.vz = damp(this.vz, 0, 6, dt);
        if (f > 0.05 && !this.impact) { this.impact = true; sim.event(EV.GROUND, this.x + Math.sin(this.yaw) * 1.3, this.y, this.z + Math.cos(this.yaw) * 1.3); }
      } else if (f < ch.to) {
        // Committed: a charging animal barely turns, so a step aside at the last moment beats it.
        this.yaw = turn(this.yaw, this.chargeYaw, 0.5 * dt);
        const v = ch.speed * clamp((f - ch.from) / 0.05, 0, 1);
        this.vx = Math.sin(this.yaw) * v; this.vz = Math.cos(this.yaw) * v;
        this.chargeRun += v * dt;
        if (f >= ch.relap && !this.used && dist > 2 && Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.2 && this.chargeRun < ch.range) this.t -= ch.cycle;
        const near = !this.used && !p.dead && !p.iframes && this.reachOf(p) < a.reach && Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.3 && Math.abs(p.y - this.y) < 1.8;
        if (near) { this.land(sim, p, a); this.rig.capture(); this.fade = 0; this.t = ch.hook * c.dur; }
        if (this.hitWall && f > ch.from + 0.06) {
          // Into a wall at full speed: it stands there shaking its head.
          sim.event(EV.GROUND, this.x + Math.sin(this.yaw) * 1.8, this.y + 1, this.z + Math.cos(this.yaw) * 1.8);
          this.attack = null; this.vx = 0; this.vz = 0; this.state = STATE.CIRCLE; this.stateT = 0; this.stuck = 1.9; this.cooldown = 3; this.circleT = 2;
          return;
        }
      } else {
        const v = ch.speed * 0.6 * clamp(1 - (f - ch.to) / 0.1, 0, 1);
        this.vx = Math.sin(this.yaw) * v; this.vz = Math.cos(this.yaw) * v;
      }
    } else {
      const [l0, l1, lv, lr] = a.lunge;
      const v = lv * clamp((f - l0) / lr, 0, 1) * clamp((l1 - f) / lr, 0, 1);
      const go = dist > 1.9 ? 1 : 0;
      this.vx = Math.sin(this.yaw) * v * go; this.vz = Math.cos(this.yaw) * v * go;
      this.speed = 0;
      if (f < l0) this.yaw = turn(this.yaw, toPlayer, 3.0 * dt);
      const w = a.windows.findIndex((x) => f >= x[0] && f <= x[1]);
      if (w >= 0) {
        if (this.activeOn !== w) { this.activeOn = w; this.used = false; }
        if (!this.used && !p.dead && !p.iframes && this.reachOf(p) < a.reach && Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.5 && Math.abs(p.y - this.y) < 1.7) this.land(sim, p, a);
      }
      if (a.knock >= 7 && f > a.windows[0][0] && !this.impact) { this.impact = true; sim.event(EV.GROUND, this.x + Math.sin(this.yaw) * 1.4, this.y, this.z + Math.cos(this.yaw) * 1.4); }
    }
    if (this.t >= c.dur) {
      // It never stands and trades. After every strike it gets clear and goes round again.
      this.attack = null;
      this.state = STATE.CIRCLE; this.stateT = 0;
      this.circleT = 2.5; this.circleDir = Math.random() < 0.5 ? -1 : 1;
      this.cooldown = (this.frenzy ? 0.5 : 1.4) + Math.random() * 1.2;
      this.setClip('walk_roam');
    }
  }

  onHit(sim, kind) {
    this.flinch = kind === 'puncture' ? 0.4 : 0.18;
    this.cooldown = Math.max(this.cooldown, kind === 'puncture' ? 0.7 : 0.25);
    this.aware = 1.4;
    if (!this.hostile) { this.hostile = true; this.angerAt = sim.time; }
    if (this.state !== STATE.ATTACK && this.state !== STATE.FLEE && this.state !== STATE.CIRCLE) { this.setState(STATE.CIRCLE); this.circleT = 2; }
  }

  die(sim) {
    this.dead = true; this.hp = 0;
    this.state = STATE.DEAD; this.attack = null;
    this.setClip('death');
    sim.event(EV.CRAB_DIE, this.x, this.y + 0.3, this.z);
  }
}
