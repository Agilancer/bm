// The great crabs of the outer fields. They come for the player from several sides at once, and their
// wounds work like the knights': a cut, then a second blow through the same cut, and it bleeds.
import { EV } from '../core/layout.js';
import { clamp, damp, quatMul, quatYaw, wrapAngle } from '../core/math.js';
import { Beast } from './beast.js';
import { foeOf } from './foes.js';
import { OPENING } from '../core/opening.js';

export const CRAB_SCALE = 2.6;
const S = CRAB_SCALE;
// Floor speeds of the clips, from assets/monsters/crab_monster/clips.json, at this size.
const STRIDE = { walk_stalk: 0.1 * S, walk_skitter: 0.32 * S, run_scuttle: 1.0667 * S, run_gallop: 1.992 * S };
const ATTACKS = {
  attack_bite: { rate: 1.08, windows: [[0.3, 0.46]], reach: 1.05 * S, dmg: 12, lunge: [0.24, 0.42, 3.4] },
  attack_claw: { rate: 1.0, windows: [[0.28, 0.41], [0.43, 0.56]], reach: 1.0 * S, dmg: 9, lunge: [0.2, 0.34, 1.6] },
  attack_slam: { rate: 0.95, windows: [[0.5, 0.57]], reach: 1.1 * S, dmg: 18, lunge: [0.26, 0.5, 6.2], knock: 6 },
  jump: { rate: 1.0, windows: [[0.56, 0.62]], reach: 0.8 * S, dmg: 10, lunge: [0.3, 0.57, 8.2], knock: 4 },
};
const STATE = { WANDER: 0, STALK: 1, CHASE: 2, ATTACK: 3, DEAD: 10 };
const tv = new Float32Array(3);

function turn(a, b, step) { const d = wrapAngle(b - a); return wrapAngle(a + clamp(d, -step, step)); }

export class Crab extends Beast {
  constructor(id, kind, rig, opts) {
    super(id, kind, rig, opts);
    this.bodyRadius = 1.45;
    const J = (n) => rig.index.get(n);
    const sph = (n, r) => ({ j: J(n), r: r * S });
    this.spheres = [sph('cog', 0.3), sph('body_front', 0.27), sph('body_rear', 0.26), sph('mouth_top', 0.14), sph('L_pincer_2', 0.08), sph('R_pincer_2', 0.08)];
    for (const side of ['L', 'R']) for (const leg of [1, 2, 3, 4]) { this.spheres.push(sph(`${side}_leg${leg}_2`, 0.06), sph(`${side}_leg${leg}_3`, 0.05)); }
    this.mouth = J('mouth_top');
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw, faceYaw: opts.yaw, vx: 0, vz: 0, speed: 0, hp: opts.hp, maxHp: opts.hp, stam: 100, armor: 1,
      state: STATE.WANDER, stateT: 0, dead: false, deadT: 0, hostile: true, iframes: false, shieldUp: 0, gashes: [], bleeds: [], heart: Math.random(), gashVersion: (this.gashVersion || 0) + 1,
      clip: 'walk_stalk', t: Math.random(), fade: 1, attack: null, activeOn: -1, used: false, cooldown: 0, bites: 0, hitOnce: false, wanderT: 0, wx: 0, wz: 0, flinch: 0, tilt: 0, slammed: false,
      flankAngle: opts.flank, stepClock: 0,
    });
    this.rig.rot.set(this.rig.restR); this.rig.tr.set(this.rig.restT);
    this.rig.rot2.set(this.rig.restR); this.rig.tr2.set(this.rig.restT);
    this.pickWander();
  }

  pickWander() {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 8;
    this.wx = this.opts.spawn[0] + Math.sin(a) * r;
    this.wz = this.opts.spawn[1] + Math.cos(a) * r;
    this.wanderT = 4 + Math.random() * 5;
  }

  update(dt, sim) {
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt / 0.14);
    const p = foeOf(this, sim);
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    this.heart += dt * 1.1;
    if (this.bleeds.length && !this.dead) { let flow = 0; for (const b of this.bleeds) flow += b.rate; this.hp -= dt * flow * 3.0; }
    if (this.hp <= 0 && !this.dead) this.die(sim);
    this.flinch = Math.max(0, this.flinch - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    let rate = this.flinch > 0 ? 0.35 : 1;
    if (this.dead) {
      this.deadT += dt;
      this.vx = damp(this.vx, 0, 5, dt); this.vz = damp(this.vz, 0, 5, dt);
      // The legs give out on the belly-down frame of the slam, and the shell settles.
      const c = this.rig.clips.attack_slam;
      this.clip = 'attack_slam';
      this.t = Math.min(this.t + dt * 1.6, c.dur * 0.53);
      if (this.t < c.dur * 0.42) this.t = c.dur * 0.42;
      rate = 0;
    } else if (this.state === STATE.ATTACK) {
      this.thinkAttack(dt, sim, p, dist, toPlayer);
    } else {
      this.thinkMove(dt, sim, p, dist, toPlayer);
    }
    this.x += this.vx * dt; this.z += this.vz * dt;
    tv[0] = this.x; tv[2] = this.z;
    sim.world.resolve(tv, 0.95, this.y + 0.6);
    this.x = tv[0]; this.z = tv[2];
    this.y = sim.world.height(this.x, this.z);
    // Clip time.
    if (this.state !== STATE.ATTACK && !this.dead) {
      const stride = STRIDE[this.clip];
      if (stride) rate *= clamp(this.speed / stride, 0.25, 1.5);
      this.t += dt * rate;
      const dur = this.rig.clips[this.clip].dur;
      this.stepClock += dt * rate * 6 / dur;
      if (this.stepClock > 1 && this.speed > 0.1) {
        this.stepClock -= 1;
        sim.event(EV.STEP, this.x, this.y, this.z, clamp(this.speed / 5, 0.1, 1), 2, this.id);
      }
    }
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT[0] = this.x; this.rig.rootT[1] = this.y; this.rig.rootT[2] = this.z;
    if (this.dead) {
      // The legs give out, the shell settles and it tips slowly over.
      const k = Math.min(this.deadT / 1.4, 1), e = k * k * (3 - 2 * k);
      const a = e * 0.32 * this.tipSide / 2;
      tip[0] = 0; tip[1] = 0; tip[2] = Math.sin(a); tip[3] = Math.cos(a);
      yawQ[0] = this.rig.rootQ[0]; yawQ[1] = this.rig.rootQ[1]; yawQ[2] = this.rig.rootQ[2]; yawQ[3] = this.rig.rootQ[3];
      quatMul(this.rig.rootQ, 0, yawQ, 0, tip, 0);
      this.rig.rootT[1] -= e * 0.16;
    }
  }

  thinkMove(dt, sim, p, dist, toPlayer) {
    // They wake a while after the first blood is spilled, or in the end regardless, and then they know where you
    // are. They lose interest once the knight is dead, so a win isn't taken away by a crab.
    // (Only when you come near, or strike first.)
    // (Not while Lisandra walks you down to town, the way the field creatures leave you be, unless you strike it.)
    const story = sim.opening && sim.opening.stage < OPENING.ARRIVED;
    const awake = (dist < 24 && !story) || this.hitOnce;
    const senses = awake && !p.dead && sim.gameState === 0;
    if (senses && !sim.crabWoke) { sim.crabWoke = true; sim.event(EV.CRAB_WAKE); }
    let dvx = 0, dvz = 0, want;
    if (!senses) {
      this.state = STATE.WANDER;
      this.wanderT -= dt;
      if (this.wanderT <= 0 || Math.hypot(this.wx - this.x, this.wz - this.z) < 1.5) this.pickWander();
      const a = Math.atan2(this.wx - this.x, this.wz - this.z);
      dvx = Math.sin(a) * 0.8; dvz = Math.cos(a) * 0.8;
      want = 'walk_skitter';
    } else {
      this.state = dist > 14 ? STATE.STALK : STATE.CHASE;
      // They spread out and come at you from different sides.
      const side = toPlayer + Math.PI + this.flankAngle * clamp(dist / 12, 0, 1);
      const tx = p.x + Math.sin(side) * Math.min(dist * 0.55, 6), tz = p.z + Math.cos(side) * Math.min(dist * 0.55, 6);
      sim.world.updateField(p.x, p.z, sim.time);
      sim.world.flow(flow, this.x, this.z, tx, tz);
      const speed = dist > 5 ? 5.5 : 2.7;
      const sp = speed * (1 - this.bleeds.length * 0.1);
      dvx = flow[0] * sp; dvz = flow[1] * sp;
      want = sp > 3.8 ? 'run_gallop' : 'run_scuttle';
      if (this.cooldown <= 0 && !p.dead) {
        if (dist < 2.5) { this.startAttack(sim, Math.random() < 0.55 ? 'attack_bite' : 'attack_claw'); return; }
        if (dist < 6.5 && dist > 3.4 && Math.random() < dt * 1.5) { this.startAttack(sim, Math.random() < 0.6 ? 'attack_slam' : 'jump'); return; }
      }
    }
    const k = 1 - Math.exp(-6 * dt);
    this.vx += (dvx - this.vx) * k; this.vz += (dvz - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
    if (this.speed > 0.3) this.yaw = turn(this.yaw, Math.atan2(this.vx, this.vz), 3.4 * dt);
    this.setClip(want);
  }

  startAttack(sim, name) {
    this.setClip(name);
    this.attack = ATTACKS[name];
    this.state = STATE.ATTACK;
    this.activeOn = -1; this.used = false;
    sim.event(EV.GRUNT, this.x, this.y + 1.2, this.z, 2);
  }

  thinkAttack(dt, sim, p, dist, toPlayer) {
    const a = this.attack, c = this.rig.clips[this.clip];
    this.t += dt * a.rate * (this.flinch > 0 ? 0.4 : 1);
    const f = this.t / c.dur;
    const [l0, l1, lv] = a.lunge;
    const v = f > l0 && f < l1 ? lv : 0;
    const go = dist > 1.6 ? 1 : 0;
    this.vx = Math.sin(this.yaw) * v * go; this.vz = Math.cos(this.yaw) * v * go;
    this.speed = 0;
    if (f < l0) this.yaw = turn(this.yaw, toPlayer, 2.8 * dt);
    const w = a.windows.findIndex((x) => f >= x[0] && f <= x[1]);
    if (w >= 0) {
      if (this.activeOn !== w) { this.activeOn = w; this.used = false; }
      if (!this.used && !p.dead && !p.iframes) {
        const m = this.mouth * 3, wt = this.rig.wt;
        const d = Math.min(dist, Math.hypot(wt[m] - p.x, wt[m + 2] - p.z));
        const facing = Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.4;
        if (d < a.reach && facing && Math.abs(p.y - this.y) < 1.5) {
          this.used = true;
          this.bites++;
          const landed = p.damage(sim, a.dmg, this.x, this.z, a.knock || 0);
          if (landed && p === sim.player) sim.event(EV.HURT, p.x, p.y + 1.1, p.z, a.dmg);
        }
      }
    }
    if (this.clip === 'attack_slam' && f > 0.5 && !this.slammed) {
      this.slammed = true;
      sim.event(EV.GROUND, this.x + Math.sin(this.yaw), this.y, this.z + Math.cos(this.yaw));
    }
    if (this.t >= c.dur) {
      this.slammed = false;
      this.attack = null;
      this.state = STATE.CHASE;
      this.cooldown = 0.8 + Math.random() * 1.8;
      this.setClip('run_scuttle');
    }
  }

  onHit(sim, kind) {
    this.flinch = kind === 'puncture' ? 0.4 : 0.18;
    this.cooldown = Math.max(this.cooldown, kind === 'puncture' ? 0.8 : 0.3);
    this.hitOnce = true;
  }

  die(sim) {
    this.dead = true; this.hp = 0;
    this.tipSide = Math.random() < 0.5 ? -1 : 1;
    this.state = STATE.DEAD;
    this.attack = null;
    this.rig.capture();
    this.fade = 0;
    this.t = this.rig.clips.attack_slam.dur * 0.42;
    sim.event(EV.CRAB_DIE, this.x, this.y + 0.3, this.z);
  }
}

const flow = new Float32Array(2), tip = new Float32Array(4), yawQ = new Float32Array(4);
