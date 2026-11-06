import { LISANDRA_SCALE } from '../core/lisandra.js';
import { C, C_PALETTE } from '../core/layout.js';
import { quatYaw, wrapAngle } from '../core/math.js';
import { ArmsRig } from './anim.js';

const WALK = 'Walk_Loop';
const SPEED = 0.9;
const RADIUS = 0.48;

export class VillageWalker {
  constructor(buffer, route) {
    this.route = route;
    this.bodyRadius = RADIUS * 2;
    this.rig = new ArmsRig(buffer, LISANDRA_SCALE, new Set([WALK, 'idle']));
    this.rig.rootQ = new Float32Array(4);
    this.rig.rootT = new Float32Array(3);
    const clip = this.rig.clips[WALK];
    clip.loop = true;
    // The patrol moves the body. Remove the clip's forward travel while keeping sway and bob.
    const hips = clip.trs[this.rig.index.get('mixamorig:Hips')];
    const travel = hips[hips.length - 1] - hips[2];
    for (let i = 0; i < clip.frames; i++) hips[i * 3 + 2] -= travel * i / (clip.frames - 1);
    this.walkRate = SPEED * clip.dur / travel;
    this.reset();
  }

  reset() {
    [this.x, this.z] = this.route[0];
    const [tx, tz] = this.route[1];
    this.yaw = Math.atan2(tx - this.x, tz - this.z);
    this.y = 0;
    this.next = 1;
    this.clip = WALK;
    this.time = 0;
    this.fade = 1;
  }

  update(dt, world) {
    const [tx, tz] = this.route[this.next];
    const dx = tx - this.x, dz = tz - this.z;
    const distance = Math.hypot(dx, dz);
    const step = Math.min(distance, SPEED * dt);
    const x = distance ? this.x + dx / distance * step : tx;
    const z = distance ? this.z + dz / distance * step : tz;
    const clear = !world.inside(x, z, RADIUS);
    if (clear) {
      this.x = x;
      this.z = z;
      if (distance > 0) this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * Math.min(1, 7 * dt);
      if (step === distance) this.next = (this.next + 1) % this.route.length;
    }
    this.y = world.height(this.x, this.z);
    const clip = clear ? WALK : 'idle';
    if (clip !== this.clip) {
      this.rig.capture();
      this.clip = clip;
      this.time = 0;
      this.fade = 0;
    }
    this.fade = Math.min(1, this.fade + dt * 5);
    this.time += dt * (clip === WALK ? this.walkRate : 1);
  }

  write(snap, offset) {
    const rig = this.rig;
    quatYaw(rig.rootQ, 0, this.yaw);
    rig.rootT.set([this.x, this.y, this.z]);
    rig.solve(rig.clips[this.clip], this.time, this.fade, snap, offset + C_PALETTE);
    snap[offset + C.ACTIVE] = 1;
    snap[offset + C.X] = this.x;
    snap[offset + C.Y] = this.y;
    snap[offset + C.Z] = this.z;
    snap[offset + C.YAW] = this.yaw;
  }
}
