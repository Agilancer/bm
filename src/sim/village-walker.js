import { LISANDRA_SCALE } from '../core/lisandra.js';
import { C, C_PALETTE } from '../core/layout.js';
import { quatAxisAngle, quatMul, quatRotate, quatYaw, wrapAngle } from '../core/math.js';
import { ArmsRig } from './anim.js';

const WALK = 'Walk_Loop';
const SPEED = 0.9;
const RADIUS = 0.48;

export class VillageWalker {
  constructor(buffer, form, opening = false) {
    this.route = form.route;
    this.legRadii = form.legRadii;
    this.bodyRadius = RADIUS * 2;
    const clips = new Set([WALK, 'idle']);
    if (opening) clips.add('afraid');
    this.rig = new ArmsRig(buffer, LISANDRA_SCALE, clips);
    this.skirtLegs = ['Left', 'Right'].flatMap((side) => ['UpLeg', 'Leg', 'Foot'].map(
      (part) => this.rig.index.get(`mixamorig:${side}${part}`),
    ));
    for (const clip of Object.values(this.rig.clips)) this.fitArms(clip, form.armClearance);
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

  // Rotate the upper arms away from the dress in chest space. Recalculate the
  // local axis at each key so the clearance follows the pose through the cycle.
  fitArms(clip, angle) {
    const rig = this.rig;
    const palette = new Float32Array(rig.count * 8);
    const inverse = new Float32Array(4), rotation = new Float32Array(4), axis = new Float32Array(3);
    const forward = [0, 0, 1];
    for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
      const arm = rig.index.get(`mixamorig:${side}Arm`);
      const track = clip.rots[arm];
      const parent = rig.parent[arm] * 4;
      for (let i = 0; i < clip.frames; i++) {
        rig.solve(clip, clip.dur * i / (clip.frames - 1), 1, palette, 0);
        inverse.set([-rig.wq[parent], -rig.wq[parent + 1], -rig.wq[parent + 2], rig.wq[parent + 3]]);
        quatRotate(axis, 0, inverse, 0, forward, 0);
        quatAxisAngle(rotation, 0, axis[0], axis[1], axis[2], sign * angle);
        quatMul(track, i * 4, rotation, 0, track, i * 4);
      }
    }
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

  update(dt, world, wait = false, idle = 'idle') {
    const [tx, tz] = this.route[this.next];
    const dx = tx - this.x, dz = tz - this.z;
    const distance = Math.hypot(dx, dz);
    const step = Math.min(distance, SPEED * dt);
    const x = distance ? this.x + dx / distance * step : tx;
    const z = distance ? this.z + dz / distance * step : tz;
    const clear = !world.inside(x, z, RADIUS);
    if (clear && !wait) {
      this.x = x;
      this.z = z;
      if (distance > 0) this.yaw += wrapAngle(Math.atan2(dx, dz) - this.yaw) * Math.min(1, 7 * dt);
      if (step === distance) this.next = (this.next + 1) % this.route.length;
    }
    this.y = world.height(this.x, this.z);
    const clip = clear && !wait ? WALK : idle;
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
    // The render pass uses the current thigh and shin shapes to keep the marked
    // dress panels outside the moving legs. Points are in world space.
    const skirt = offset + C_PALETTE + rig.count * 8;
    this.skirtLegs.forEach((joint, i) => {
      const k = joint * 3, p = skirt + i * 4;
      snap[p] = rig.wt[k];
      snap[p + 1] = rig.wt[k + 1];
      snap[p + 2] = rig.wt[k + 2];
      snap[p + 3] = this.legRadii[i % 3];
    });
    snap[skirt + 24] = this.yaw;
    snap[offset + C.ACTIVE] = 1;
    snap[offset + C.X] = this.x;
    snap[offset + C.Y] = this.y;
    snap[offset + C.Z] = this.z;
    snap[offset + C.YAW] = this.yaw;
  }
}
