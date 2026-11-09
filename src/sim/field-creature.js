// Native Mixamo creatures using the existing monster wounds and spell damage.
import { Beast } from './beast.js';
import { foeOf } from './foes.js';
import { clamp, quatYaw, wrapAngle } from '../core/math.js';
import { EV } from '../core/layout.js';
import { OPENING } from '../core/opening.js';
import { townDist } from '../core/town.js';

export class FieldCreature extends Beast {
  constructor(id, rig, opts) {
    super(id, opts.kind, rig, opts);
    this.bodyRadius = opts.radius * 2;
    this.scale = opts.scale;
    this.flow = new Float32Array(2);
    this.position = new Float32Array(3);
    this.spheres = ['Hips', 'Spine2', 'Head', 'LeftUpLeg', 'RightUpLeg', 'LeftArm', 'RightArm'].map((name) => ({
      j: rig.index.get('mixamorig:' + name), r: (name === 'Head' ? 0.17 : 0.22) * opts.scale,
    }));
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw,
      vx: 0, vz: 0, speed: 0, hp: opts.hp, maxHp: opts.hp, stam: 100,
      armor: 1, state: 0, dead: false, deadT: 0, hostile: true, iframes: false,
      shieldUp: 0, gashes: [], bleeds: [], heart: 0, bites: 0,
      gashVersion: (this.gashVersion || 0) + 1,
      clip: 'idle', t: 0, fade: 1, cooldown: 1, aggro: false, used: false,
      flinch: 0, waypoint: 0,
    });
    this.rig.rot.set(this.rig.restR); this.rig.tr.set(this.rig.restT);
    this.rig.rot2.set(this.rig.restR); this.rig.tr2.set(this.rig.restT);
  }

  update(dt, sim) {
    if (dt <= 0) return;
    const p = foeOf(this, sim), o = this.opts;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flinch = Math.max(0, this.flinch - dt);
    this.fade = Math.min(1, this.fade + dt * 5);
    this.heart += dt;
    if (this.bleeds.length && !this.dead) this.hp -= dt * this.bleeds.reduce((sum, b) => sum + b.rate, 0) * 3;
    if (this.hp <= 0 && !this.dead) this.die(sim);
    const distance = Math.hypot(p.x - this.x, p.z - this.z);
    const yaw = Math.atan2(p.x - this.x, p.z - this.z);
    // The cave escort remains safe until its first quest finishes.
    const story = sim.opening && sim.opening.stage < OPENING.ARRIVED;
    const canHunt = !story && !p.dead && sim.gameState === 0 && townDist(p.x, p.z) > 4;
    if (canHunt && distance < 24 && sim.world.sees(this.x, this.y + 1.2, this.z, p.x, p.y + 1, p.z)) this.aggro = true;
    if (!canHunt || distance > 42) this.aggro = false;
    let speed = 0;
    if (this.dead) {
      this.deadT += dt;
      this.t = Math.min(this.rig.clips.death.dur, this.t + dt);
    } else if (this.state === 3) {
      this.t += dt * (this.flinch > 0 ? 0.35 : 1);
      const fraction = this.t / this.rig.clips.attack.dur;
      if (fraction < 0.28) this.yaw += clamp(wrapAngle(yaw - this.yaw), -dt * 3, dt * 3);
      if (fraction >= 0.36 && fraction <= 0.62 && !this.used && canHunt) {
        if (distance < o.reach && Math.abs(p.y - this.y) < 1.4
          && Math.abs(wrapAngle(yaw - this.yaw)) < 1.2
          && sim.world.sees(this.x, this.y + 1, this.z, p.x, p.y + 1, p.z)) {
          this.used = true;
          if (p.damage(sim, o.damage, this.x, this.z, 2)) this.bites++;
        }
      }
      if (fraction >= 1) {
        this.state = 0; this.cooldown = 1.2;
        this.setClip('idle');
      }
    } else {
      let tx, tz;
      if (this.aggro) { tx = p.x; tz = p.z; }
      else {
        const angle = this.waypoint * Math.PI / 2;
        tx = o.spawn[0] + Math.sin(angle) * 4;
        tz = o.spawn[1] + Math.cos(angle) * 4;
        if (Math.hypot(tx - this.x, tz - this.z) < 0.7) this.waypoint = (this.waypoint + 1) % 4;
      }
      if (this.aggro && distance < o.reach * 0.9 && this.cooldown <= 0) {
        this.state = 3; this.used = false; this.setClip('attack');
        sim.event(EV.GRUNT, this.x, this.y + 1.1, this.z, 2);
      } else {
        sim.world.updateField(tx, tz, sim.time, this.id + 1);
        const flow = this.flow;
        sim.world.flow(flow, this.x, this.z, tx, tz, this.id + 1);
        speed = this.flinch > 0 ? 0 : this.aggro ? o.speed : 0.75;
        this.vx = flow[0] * speed; this.vz = flow[1] * speed;
        if (Math.hypot(...flow) > 0.1) {
          const turn = Math.atan2(flow[0], flow[1]);
          this.yaw += clamp(wrapAngle(turn - this.yaw), -dt * 3.5, dt * 3.5);
        }
        this.setClip(this.aggro ? 'run' : 'walk');
        const clip = this.rig.clips[this.clip];
        this.t += dt * clamp(speed / clip.speed, 0.2, 1.7);
      }
    }
    if (this.dead || this.state === 3) this.vx = this.vz = 0;
    if (!this.dead) {
      const pos = this.position;
      pos.set([this.x + this.vx * dt, this.y, this.z + this.vz * dt]);
      sim.world.resolve(pos, o.radius, this.y + 0.2);
      this.x = pos[0]; this.z = pos[2];
    }
    this.speed = Math.hypot(this.vx, this.vz);
    this.y = sim.world.height(this.x, this.z);
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT.set([this.x, this.y, this.z]);
  }

  onHit() { this.aggro = true; this.flinch = 0.18; }

  die() {
    this.dead = true; this.hp = 0; this.state = 10; this.deadT = 0;
    this.vx = this.vz = 0;
    this.setClip('death');
  }
}
