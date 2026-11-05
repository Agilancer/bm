// The player: first-person body, the swings of the sword in hand, and where the blade lands. The blade is tested
// where it appears on screen: each tick its tip and middle are projected through the view model's camera
// and cast from the eye into the world, so a cut lands exactly under what the player sees.
import { ARMOR_K } from '../items/items.js';
import { floorAt } from '../core/interior.js';
import { LAND_EDGE } from '../core/terrain.js';
import { EV, H, INPUT, VM_PALETTE, WEAPONS } from '../core/layout.js';
import { clamp, damp, wrapAngle } from '../core/math.js';
import { S } from './knight.js';
import { leanAmount } from './anim.js';
import { stepSurf } from './surf.js';

const WORLD_FOV = 64 * Math.PI / 180;
const EYE = 1.62;
const WALK = 4.1, SPRINT = 6.6;
const FALL_SAFE = 12, FALL_WORST = 11;   // (speed at the bottom. Five metres and you're fine; twenty, the bottom of the rift, and you're on your last legs.)
// How each rig fights, by how many hands it has on the sword. The swings are solved to that rig's length of sword, so the reach is theirs too.
const KICK = 1.4;      // how far the view kicks with a blow as it lands, against how far the body goes with it over the whole cut
const STANCES = {
  2: { idle: 'great_idle', walk: 'great_walk', combo: ['great_sky1', 'great_sky2', 'great_sky3', 'great_sky4', 'great_sky5'], wide: ['great_wide_r', 'great_wide_l'], air: 'great_slam', back: 'great_rise', run: 'great_chop', reach: { tip: 2.55, mid: 2.2 } },
  // (pace: a one-hander comes round far quicker than its clips were cut. It costs the same breath a second.)
  1: { idle: 'guard_idle', walk: 'guard_walk', combo: ['blade_sky1', 'blade_sky2', 'blade_sky3', 'blade_sky4', 'blade_sky5'], wide: ['blade_flat1', 'blade_flat2'], air: 'blade_sky5', back: 'blade_rise1', run: 'blade_stab', reach: { tip: 2.15, mid: 1.85 }, pace: 1.7 },
  // A staff doesn't cut: every move is the one cast, and it fires from the head (Casting.stepStaff).
  3: { idle: 'staff_idle', walk: 'staff_walk', combo: ['staff_cast'], wide: ['staff_cast', 'staff_cast'], air: 'staff_cast', back: 'staff_cast', run: 'staff_cast', reach: { tip: 0, mid: 0 }, shoots: true },
};
// The shield, after Bellmourn's: the right button brings it up and it shoves on the way, then it holds for as long as the button's down, and starts down the moment it's let go.
// Up in time for the blow (GUARD_PERFECT) it turns that blow aside whole and sets the striker reeling. Later it takes the blow on your breath, and when that runs out the guard breaks.
const G = { UP: 1, BASH: 2, HOLD: 3, DOWN: 4, STAB: 5 };
const GUARD_RATE = 1.35;       // how fast it comes up, shoves and goes down, against its clips
const GUARD_PERFECT = 0.3;
const GUARD_ARC = Math.cos(1.2);    // what it covers: this far either side of where you look
const GUARD_COST = 1.1, GUARD_LEAK = 0.1;   // breath per point of a blow taken on it, and how much of the blow gets through
const GUARD_DRAG = 0.6;
const BASH_AT = 0.16, BASH_REACH = 2.5, BASH_ARC = Math.cos(1.05), BASH_DMG = 3, BASH_POISE = 70, BASH_PUSH = 6, BASH_COST = 8;
const SURF_CROUCH = 0.3;   // the eye lower on the shield, the knees bent
const BASE_HP = 160;
const PUNCTURE_RADIUS = 0.07;
const MAX_GASH_LENGTH = 0.55;
// Each move has its own weight: cuts chain, wide swings cover ground but bite less, slams and chops break a guard.
const SWING_INFO = {
  staff_cast: { heavy: false, fromRight: 0, dmg: 0, poise: 0, stam: 0, width: 0 },
  great_sky1: { heavy: false, fromRight: 1, dmg: 5, poise: 30, stam: 10, width: 1 },
  great_sky2: { heavy: false, fromRight: -1, dmg: 5, poise: 30, stam: 10, width: 1 },
  great_sky3: { heavy: false, fromRight: 1, dmg: 5, poise: 30, stam: 10, width: 1 },
  great_sky4: { heavy: false, fromRight: -1, dmg: 5, poise: 30, stam: 10, width: 1 },
  great_sky5: { heavy: true, fromRight: 0, dmg: 11, poise: 75, stam: 20, width: 1.5 },
  great_slam: { heavy: true, fromRight: 0, dmg: 11, poise: 75, stam: 20, width: 1.5 },
  great_chop: { heavy: true, fromRight: 0, dmg: 10, poise: 65, stam: 18, width: 1.45 },
  great_rise: { heavy: false, fromRight: 0, dmg: 5, poise: 34, stam: 10, width: 1 },
  great_wide_r: { heavy: false, fromRight: 1, dmg: 4, poise: 24, stam: 12, width: 0.8 },
  great_wide_l: { heavy: false, fromRight: -1, dmg: 4, poise: 24, stam: 12, width: 0.8 },
  // In one hand: quicker and lighter, and it costs less breath.
  blade_sky1: { heavy: false, fromRight: 1, dmg: 4, poise: 24, stam: 8, width: 0.9 },
  blade_sky2: { heavy: false, fromRight: -1, dmg: 4, poise: 24, stam: 8, width: 0.9 },
  blade_sky3: { heavy: false, fromRight: 1, dmg: 4, poise: 26, stam: 8, width: 0.9 },
  blade_sky4: { heavy: false, fromRight: -1, dmg: 4, poise: 24, stam: 8, width: 0.9 },
  blade_sky5: { heavy: true, fromRight: 0, dmg: 8, poise: 55, stam: 14, width: 1.25 },
  blade_rise1: { heavy: false, fromRight: 1, dmg: 4, poise: 26, stam: 8, width: 0.9 },
  blade_flat1: { heavy: false, fromRight: 1, dmg: 3, poise: 18, stam: 9, width: 0.75 },
  blade_flat2: { heavy: false, fromRight: -1, dmg: 3, poise: 18, stam: 9, width: 0.75 },
  blade_stab: { heavy: false, fromRight: 0, dmg: 6, poise: 34, stam: 10, width: 0.8 },
  blade_stab_block: { heavy: false, fromRight: 0, dmg: 5, poise: 24, stam: 10, width: 0.8 },
};
const DODGE_TIME = 0.3, DODGE_COST = 26, DODGE_SPEED = 9;
const hit = { t: 0, piece: -1, lx: 0, ly: 0, lz: 0, nx: 0, ny: 0, nz: 0 };
const tmp = new Float32Array(3), tmp2 = new Float32Array(3), sweepDir = new Float32Array([1, 0, 0]);

export class Player {
  // rigs: the arms by how many hands they have on the sword.
  constructor(rigs) {
    this.rigs = rigs;
    this.arms = rigs[1];
    this.stance = STANCES[1];
    this.vmRatio = 1;
    const fov = (this.arms.extras.view?.fov || 76) * Math.PI / 180;
    this.vmRatio = Math.tan(WORLD_FOV / 2) / Math.tan(fov / 2);
    this.vmRatio = 1 / this.vmRatio;
    this.reset();
  }

  reset() {
    Object.assign(this, {
      x: -3.5, z: 40, y: 0, vx: 0, vz: 0, vy: 0, yaw: Math.PI, pitch: 0, onGround: true, hp: BASE_HP, maxHp: BASE_HP, dead: false, deadT: 0,
      weapon: -1, clip: this.stance.idle, rest: this.stance.idle, t: 0, fade: 1, rate: 1, queued: null, queuedT: 0, combo: 0, comboT: 0, wide: 0, swinging: false, recovering: false,
      threat: null, atkSeen: 0, wideSeen: 0, jumpSeen: 0, shakeX: 0, shakeY: 0, shakeR: 0, lean: [0, 0, 0], kick: 0, trauma: 0, flash: 0, drag: 0, contact: null, whiffed: true,
      stride: 0, bloodSword: 0, recoilT: 0, tipPrev: new Float32Array(3), midPrev: new Float32Array(3), havePrev: false, hitDir: 0, hitDirT: 9, sprinting: false, landKick: 0,
      struckGround: false, struckWall: false, regenT: 0, swingCount: 0, whiffCount: 0, aggression: 0, lastSwing: -9, knockX: 0, knockZ: 0, weak: 0,
      guard: 0, guardAt: -9, bashed: false, blockEvT: 0, hasShield: false, blockHeld: false,
      surfing: false, surfAir: false, surfHold: 0, surfCool: 0, surfSlow: 0, surfLow: 0, stamina: 100, staminaT: 0, winded: false, dodgeT: 0, dodgeCd: 0, dodgeX: 0, dodgeZ: 0, dodgeSeen: 0, iframes: false, aimWound: false, hits: 0,
    });
  }

  // The unseen wall at the edge of the grass. Indoors there's no such edge.
  keepToLand() {
    if ((Math.abs(this.x) > LAND_EDGE || Math.abs(this.z) > LAND_EDGE) && floorAt(this.x, this.z) === null) {
      this.x = clamp(this.x, -LAND_EDGE, LAND_EDGE); this.z = clamp(this.z, -LAND_EDGE, LAND_EDGE);
    }
  }

  // What's in the hand changed: the other rig, if it takes the other number of hands, and nothing left over from the last sword.
  setWeapon(w) {
    this.weapon = w;
    const hands = WEAPONS[w]?.hands || 1;
    this.arms = this.rigs[hands];
    this.stance = STANCES[hands];
    Object.assign(this, {
      clip: this.stance.idle, rest: this.stance.idle, t: 0, fade: 1, rate: 1, swingRate: 1, queued: null, combo: 0, comboT: 0, swinging: false, recovering: false,
      threat: null, recoilT: 0, drag: 0, contact: null, havePrev: false, bloodSword: 0, guard: 0,
    });
  }

  // The sword's rolls and gems, each tick: they can only change while the game is paused for the pack, but they cost nothing to read.
  readWeapon(input) {
    if ((input[INPUT.WEAPON] | 0) !== this.weapon) this.setWeapon(input[INPUT.WEAPON] | 0);
    this.dmgMin = input[INPUT.W_MIN]; this.dmgMax = input[INPUT.W_MAX];
    this.pierce = input[INPUT.W_PIERCE]; this.poise = input[INPUT.W_POISE];
    this.stamSave = input[INPUT.W_STAM]; this.speed = input[INPUT.W_SPEED]; this.leech = input[INPUT.W_LEECH];
    this.armor = input[INPUT.ARMOR];
    this.hasShield = input[INPUT.SHIELD] > 0.5; this.blockHeld = input[INPUT.BLOCK] > 0.5;
    const maxHp = BASE_HP + input[INPUT.W_LIFE];
    if (maxHp !== this.maxHp && !this.dead) { this.hp = clamp(this.hp + maxHp - this.maxHp, 1, maxHp); this.maxHp = maxHp; }
  }

  // A blow's weight against what the swings were balanced on, which is a sword of 20.
  bite() { return (this.dmgMin + (this.dmgMax - this.dmgMin) * Math.random()) / 20; }

  drink() { if (this.leech) this.hp = Math.min(this.maxHp, this.hp + this.leech); }

  // The moment around a swing's hit, when it can meet a blow.
  parryOpen() {
    if (!this.swinging || this.rate <= 0 || this.winded) return false;
    const info = this.arms.clips[this.clip];
    return Math.abs(this.t - info.hit) < 0.12;
  }

  spend(cost) {
    this.stamina = Math.max(0, this.stamina - cost);
    this.staminaT = 0.7;
    if (this.stamina <= 0) this.winded = true;
  }

  startSwing(sim, name) {
    const { arms } = this;
    arms.capture();
    this.clip = name; this.t = 0; this.fade = 0; this.rate = 1;
    this.contact = null; this.punctured = false; this.whiffed = true; this.struckGround = false; this.struckWall = false; this.drag = 0;
    this.havePrev = false; this.swinging = false; this.recovering = false;
    const info = arms.clips[name], tag = SWING_INFO[name];
    this.fired = false;
    this.threat = this.stance.shoots ? null : { name, t: 0, hit: info.hit, heavy: tag.heavy, fromRight: tag.fromRight };
    if (this.stance.shoots) this.whiffed = false;
    this.swingCount++;
    this.aggression = this.aggression * 0.8 + 0.2 * clamp(1.4 / Math.max(sim.time - this.lastSwing, 0.2), 0, 1.5);
    this.lastSwing = sim.time;
    for (const k of sim.knights) k.observeSwing(name);
    const pace = this.stance.pace || 1;
    this.spend(tag.stam * (1 - this.stamSave) / pace);
    // Out of breath, the sword comes round slowly.
    this.rate = (this.stamina < 12 ? 0.8 : 1) * (1 + this.speed) * pace;
    this.swingRate = this.rate;
    sim.event(EV.SWING, this.x, this.y + EYE, this.z, tag.heavy ? 1 : 0);
    // Weight behind the blow.
    const f = this.stance.shoots ? 0 : 0.75;
    this.vx += Math.sin(this.yaw) * f; this.vz += Math.cos(this.yaw) * f;
  }

  update(dt, tdt, input, sim) {
    this.readWeapon(input);
    if (this.dead) {
      this.deadT += dt;
      this.vx = damp(this.vx, 0, 6, dt); this.vz = damp(this.vz, 0, 6, dt);
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.t += dt * 0.5;
      return;
    }
    this.yaw = input[INPUT.YAW];
    this.pitch = input[INPUT.PITCH];
    // Attack input is a counter, so a click between ticks is never lost.
    if (input[INPUT.ATTACK] !== this.atkSeen) { this.atkSeen = input[INPUT.ATTACK]; this.queued = 'L'; this.queuedT = 0.5; }
    if (input[INPUT.WIDE] !== this.wideSeen) { this.wideSeen = input[INPUT.WIDE]; this.queued = 'R'; this.queuedT = 0.5; }
    this.queuedT -= dt;
    if (this.queuedT <= 0) this.queued = null;
    const mx = input[INPUT.MOVE_X], mz = input[INPUT.MOVE_Z];
    const len = Math.hypot(mx, mz);
    const sprint = input[INPUT.SPRINT] > 0.5 && mz > 0.3 && !this.winded && !this.surfing && !this.guard;
    this.sprinting = sprint && len > 0.1;
    // Breath: running and swinging spend it, standing gets it back.
    this.staminaT -= dt;
    if (this.sprinting) { this.stamina = Math.max(0, this.stamina - dt * 15); this.staminaT = 0.45; if (this.stamina <= 0) this.winded = true; }
    else if (this.staminaT <= 0) this.stamina = Math.min(100, this.stamina + dt * 26);
    if (this.winded && this.stamina > 28) this.winded = false;
    // A sidestep: quick, cheap, and for its first moments nothing touches you.
    this.dodgeCd -= dt;
    this.dodgeT -= dt;
    this.iframes = this.dodgeT > 0.08;
    if (input[INPUT.DODGE] !== this.dodgeSeen) {
      this.dodgeSeen = input[INPUT.DODGE];
      if (this.dodgeCd <= 0 && this.stamina >= DODGE_COST * 0.6 && this.onGround && !this.surfing) {
        const dl = Math.hypot(mx, mz);
        const lx = dl > 0.1 ? mx / dl : 0, lz = dl > 0.1 ? mz / dl : -1;
        const sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
        this.dodgeX = lx * -cs + lz * sn; this.dodgeZ = lx * sn + lz * cs;
        this.dodgeT = DODGE_TIME; this.dodgeCd = 0.62;
        this.spend(DODGE_COST);
        sim.event(EV.DODGE, this.x, this.y, this.z, lx);
      }
    }
    if (!stepSurf(this, dt, input, sim)) {
    const swingDrag = (this.guard ? GUARD_DRAG : this.swinging ? 0.5 : this.threat ? 0.72 : this.clip !== this.stance.idle ? 0.85 : 1) * sim.casting.drag;
    const speed = (sprint ? SPRINT : WALK) * swingDrag * (1 - this.weak * 0.2);
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    // Strafe right is -x when facing +z.
    const wx = (mx * -c + mz * s) * (len > 1 ? 1 / len : 1) * speed;
    const wz = (mx * s + mz * c) * (len > 1 ? 1 / len : 1) * speed;
    const accel = this.onGround ? 42 : 9;
    const stepV = accel * dt;
    const ax = wx - this.vx, az = wz - this.vz, al = Math.hypot(ax, az);
    if (al > 1e-4) { const k = Math.min(1, stepV / al); this.vx += ax * k; this.vz += az * k; }
    if (this.dodgeT > 0) {
      const v = DODGE_SPEED * clamp(this.dodgeT / DODGE_TIME + 0.2, 0, 1);
      this.vx = this.dodgeX * v; this.vz = this.dodgeZ * v;
    }
    if (this.onGround && input[INPUT.JUMP] !== this.jumpSeen && this.stamina > 6) {
      this.spend(8);
      this.vy = 5.0; this.onGround = false;
      sim.event(EV.JUMP, this.x, this.y, this.z);
    }
    this.jumpSeen = input[INPUT.JUMP];
    this.vy -= 14 * dt;
    this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
    tmp[0] = this.x; tmp[2] = this.z;
    sim.world.resolve(tmp, 0.36, this.y + 0.2);
    this.x = tmp[0]; this.z = tmp[2];
    this.keepToLand();
    const g = sim.world.heightFor(this.x, this.z, this.y);
    if (this.y <= g) {
      if (!this.onGround && this.vy < -2) {
        sim.event(EV.LAND, this.x, this.y, this.z, clamp(-this.vy / 7, 0, 1));
        this.landKick = clamp(-this.vy * 0.018, 0, 0.13);
        // A long way down costs you nearly everything, and never the last of it.
        if (this.vy < -FALL_SAFE) {
          this.hp = Math.max(1, this.hp - this.maxHp * Math.min(1, (-this.vy - FALL_SAFE) / FALL_WORST));
          this.regenT = 0;
          sim.event(EV.HURT, this.x, this.y + 1, this.z, 1);
        }
      }
      this.y = g; this.vy = 0; this.onGround = true;
    } else if (this.y > g + 0.06) this.onGround = false;
    else if (this.onGround) this.y = g;
    }
    this.surfLow = damp(this.surfLow, this.surfing ? SURF_CROUCH : 0, 10, dt);
    const gs = Math.hypot(this.vx, this.vz);
    this.groundSpeed = gs;
    if (this.onGround && gs > 0.5 && !this.surfing) {
      this.stride += gs * dt;
      const stepLen = this.sprinting ? 2.3 : 1.55;
      if (this.stride > stepLen) { this.stride -= stepLen; sim.event(EV.STEP, this.x, this.y, this.z, clamp(gs / 6, 0.2, 1), 0, -1); }
    }
    this.landKick = damp(this.landKick, 0, 9, dt);
    // Recover from wounds slowly when no one is on top of you.
    this.regenT += dt;
    if (this.regenT > 6 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * 1.6);
    this.weak = damp(this.weak, this.hp < this.maxHp * 0.28 ? 1 : 0, 2, dt);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.hitDirT += dt;
    this.bloodSword = Math.max(0, this.bloodSword - dt * 0.012);
    // Knock.
    if (this.knockX || this.knockZ) {
      this.x += this.knockX * dt; this.z += this.knockZ * dt;
      this.knockX = damp(this.knockX, 0, 8, dt); this.knockZ = damp(this.knockZ, 0, 8, dt);
      if (Math.abs(this.knockX) + Math.abs(this.knockZ) < 0.05) { this.knockX = 0; this.knockZ = 0; }
    }
    // Shake.
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    const tr = this.trauma * this.trauma;
    const tt = sim.time * 37;
    this.shakeX = tr * 0.05 * Math.sin(tt * 1.13 + 1.7);
    this.shakeY = tr * 0.05 * Math.sin(tt * 1.31 + 4.1);
    this.shakeR = tr * 0.06 * Math.sin(tt * 0.97 + 2.2);
    this.stepSwing(dt, tdt, sim);
    // The body goes with a blow: the view leans against it in the wind-up and with it through the cut, as far as the clip says.
    const swung = this.arms.clips[this.clip], k = swung.lean ? leanAmount(this.t, swung.wind, swung.through, swung.dur) : 0;
    for (let i = 0; i < 3; i++) this.lean[i] = damp(this.lean[i], swung.lean ? swung.lean[i] * k : 0, 16, dt);      // (a blow cut short by the next doesn't jolt the view)
    this.shakeX += this.lean[0]; this.shakeY += this.lean[1]; this.shakeR += this.lean[2];
    // ...and it kicks with the blow as it lands, there at once and gone in a quarter of a second, the world going by while the blade's stopped in it.
    this.kick = Math.max(0, this.kick - dt / 0.26);
    const kick = KICK * this.kick * this.kick * (swung.lean ? 1 : 0);
    if (kick > 0) { this.shakeX += swung.lean[0] * kick; this.shakeY += swung.lean[1] * kick; this.shakeR += swung.lean[2] * kick; }
  }

  // ---- the shield ----

  // Between the shield coming level and its starting down, it stops what comes at it from the front.
  get blocking() { return (this.guard === G.UP && this.t > 0.08) || this.guard === G.BASH || this.guard === G.HOLD || this.guard === G.STAB; }

  guardClip(name, g) {
    this.arms.capture();
    this.clip = name; this.t = 0; this.fade = 0; this.rate = 1; this.swingRate = 1; this.guard = g;
    this.swinging = false; this.recovering = false; this.threat = null;
  }

  startGuard(sim) {
    this.guardClip('shield_up', G.UP);
    this.guardAt = sim.time; this.bashed = false; this.recoilT = 0; this.drag = 0; this.queued = null;
  }

  // Everything in front, as wide as the shield and a stride deep, is knocked back and set reeling.
  bash(sim) {
    this.bashed = true;
    this.spend(BASH_COST * (1 - this.stamSave));
    sim.event(EV.WHOOSH, this.x, this.y + EYE, this.z, 1);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let met = false;
    for (const k of sim.knights) {
      if (k.dead || k.dormant || k.iframes) continue;
      const dx = k.x - this.x, dz = k.z - this.z, d = Math.hypot(dx, dz) || 1;
      if (d > BASH_REACH + (k.bodyRadius || 0.5) * 0.5 || (dx * fx + dz * fz) / d < BASH_ARC || Math.abs(k.y - this.y) > 2.2) continue;
      if (sim.world.rayBoxes(this.x, this.y + EYE - 0.4, this.z, dx / d, 0, dz / d, Math.max(d - 0.4, 0.01)) > 0) continue;
      met = true;
      k.hp -= BASH_DMG * this.bite() * (1 + this.poise);
      if (k.reel) k.reel(sim, 0.7);
      else k.onHit(sim, 'gash', this.x, this.z, BASH_POISE * (1 + this.poise));
      // (The Gravehart and the Hydra are far too big to shift.)
      if (k.knock !== undefined) { k.knockX = dx / d; k.knockZ = dz / d; k.knock = Math.max(k.knock, BASH_PUSH); } else if (k.kind === 2 || k.kind >= 5) { k.vx = dx / d * BASH_PUSH; k.vz = dz / d * BASH_PUSH; }
      sim.event(EV.BLOCK, k.x - dx / d * 0.4, this.y + 1.2, k.z - dz / d * 0.4, -dx / d, 0.1, -dz / d, k.id);
    }
    if (met) { sim.hitStop(0.06); this.trauma = Math.min(1, this.trauma + 0.3); this.kick = 1; }
  }

  // The button's let go: the shield starts down now, from wherever it's got to, so a shield still on its way up turns round where it is.
  dropGuard() {
    const up = this.guard === G.UP ? Math.min(1, this.t / this.arms.clips.shield_up.dur) : 1;
    this.queued = null;
    this.guardClip('shield_down', G.DOWN);
    this.t = (1 - up) * this.arms.clips.shield_down.dur;
  }

  stepGuard(tdt, sim) {
    if (!this.blockHeld && this.guard !== G.DOWN) { this.dropGuard(); return; }
    const info = this.arms.clips[this.clip];
    this.fade = Math.min(1, this.fade + tdt / 0.06);
    this.t += tdt * (this.guard === G.HOLD ? 0.25 + Math.min(1.3, this.groundSpeed / 6.2) : GUARD_RATE);
    switch (this.guard) {
      case G.UP:
        if (this.t >= info.dur) this.guardClip('shield_bash', G.BASH);
        break;
      case G.BASH:
        if (!this.bashed && this.t >= BASH_AT) this.bash(sim);
        if (this.t >= info.dur) this.guardClip('shield_hold', G.HOLD);
        break;
      case G.HOLD:
        // With the shield up the sword only thrusts, over the rim. The right button again is another shove.
        if (this.queued === 'L' && this.weapon > 0) {
          this.queued = null;
          this.startSwing(sim, 'blade_stab_block');
          this.guard = G.STAB;
        } else if (this.queued === 'R' && this.stamina > BASH_COST) {
          this.queued = null;
          this.guardClip('shield_bash', G.BASH);
          this.bashed = false;
        } else if (this.winded || !this.hasShield || this.surfing) {
          this.queued = null;
          this.guardClip('shield_down', G.DOWN);
        }
        break;
      default:
        if (this.t >= info.dur) { this.guard = 0; this.toIdle(); }
    }
  }

  // What comes at the shield. Returns whether any of it got through.
  blockBlow(sim, amount, fromX, fromZ, knock) {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const hx = this.x + fx * 0.7, hy = this.y + EYE - 0.35, hz = this.z + fz * 0.7;
    if (sim.time - this.guardAt < GUARD_PERFECT) {
      sim.event(EV.PARRY, hx, hy, hz);
      sim.hitStop(0.06);
      this.trauma = Math.min(1, this.trauma + 0.2);
      // Whoever struck it is thrown off their stride.
      const foe = sim.knights.find((k) => k.x === fromX && k.z === fromZ);
      if (foe) { if (foe.reel) foe.reel(sim, 0.9); else if (foe.onParried) foe.onParried(sim); else foe.onHit(sim, 'gash', this.x, this.z, BASH_POISE); }
      return false;
    }
    this.spend(amount * GUARD_COST * (1 - this.stamSave));
    if (sim.time > this.blockEvT) { this.blockEvT = sim.time + 0.12; sim.event(EV.BLOCK, hx, hy, hz, -fx, 0.1, -fz, -1); }
    this.trauma = Math.min(1, this.trauma + 0.2);
    const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1, push = 0.9 + Math.max(knock, 0) * 0.3;
    this.knockX = dx / L * push; this.knockZ = dz / L * push;
    if (this.stamina > 0) { this.hp = Math.max(1, this.hp - amount * GUARD_LEAK); this.regenT = 0; return false; }
    // Out of breath: the guard breaks, and half of it lands.
    sim.event(EV.SHIELD_BREAK, hx, hy, hz);
    this.guardClip('shield_down', G.DOWN);
    this.applyHurt(sim, amount * 0.5, fromX, fromZ, knock);
    return true;
  }

  stepSwing(dt, tdt, sim) {
    if (this.guard === G.STAB && !this.blockHeld) this.dropGuard();     // (a thrust goes with the shield: the button's what keeps either up)
    if (this.guard && this.guard !== G.STAB) { this.stepGuard(tdt, sim); return; }
    const { arms } = this;
    const info = arms.clips[this.clip];
    this.fade = Math.min(1, this.fade + tdt / 0.1);
    const dragRate = this.drag > 0 ? 0.65 : 1;
    this.drag = Math.max(0, this.drag - tdt);
    this.t += tdt * this.rate * dragRate;
    if (this.rate > 0 && this.drag <= 0 && this.swingRate) this.rate = this.swingRate;
    // The carry rides your steps, played by how fast you go; standing, it's the same sway, smaller and slowed right down.
    if (this.clip === this.stance.idle) {
      this.rate = 0.25 + Math.min(1.3, this.groundSpeed / 6.2);
      const rest = this.groundSpeed > 0.6 ? this.stance.walk : this.stance.idle;
      if (rest !== this.rest && this.fade >= 1) { arms.capture(); this.rest = rest; this.fade = 0; }
    }
    if (this.recoilT > 0) {
      this.recoilT -= tdt;
      if (this.recoilT <= 0) this.toIdle();
    }
    if (this.clip !== this.stance.idle) {
      if (this.threat) this.threat.t = this.t;
      const active = !this.stance.shoots && this.t >= info.wind && this.t <= info.through && this.rate > 0;
      if (active && !this.swinging) { this.swinging = true; sim.event(EV.WHOOSH, this.x, this.y + EYE, this.z, 1); }
      if (!active) this.swinging = false;
      if (this.t > info.hit) this.threat = null;
      if (this.t > info.through) {
        if (this.whiffed && !this.recovering) this.whiffCount++;
        this.recovering = true;
      }
      if (this.t >= info.dur) this.toIdle();
    } else {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    // The right button with a shield on the arm brings it up, at once: out of a wind-up or a follow-through, though not through a blow that's landing.
    if (this.queued === 'R' && this.hasShield && this.stance === STANCES[1] && !this.guard) {
      if (this.winded || this.surfing || this.stamina <= 6) this.queued = null;
      else if (!this.swinging && !sim.casting.busy) { this.startGuard(sim); return; }
    }
    // A buffered click starts the next swing at the end of the last one's follow-through.
    if (this.queued && !this.weapon) { this.queued = null; sim.event(EV.EMPTY_HANDS); }
    const canStart = !this.guard && !sim.casting.busy && (this.clip === this.stance.idle || (this.recovering && this.t > info.through + 0.04));
    if (this.queued && canStart && this.recoilT <= 0) {
      const st = this.stance;
      let name;
      if (this.queued === 'R') {
        name = st.wide[this.wide++ % 2];
      } else {
        const forward = this.vx * Math.sin(this.yaw) + this.vz * Math.cos(this.yaw);
        if (!this.onGround) name = st.air;
        else if (forward < -1.6) { name = st.back; this.combo = 0; }
        else if (this.sprinting) { name = st.run; this.combo = 0; }
        else { name = st.combo[this.combo]; this.combo = (this.combo + 1) % st.combo.length; this.comboT = 1.6; }
      }
      this.queued = null;
      this.startSwing(sim, name);
    }
  }

  toIdle() {
    // A thrust over the rim ends behind the shield.
    if (this.guard === G.STAB) { this.guardClip('shield_hold', G.HOLD); return; }
    this.arms.capture();
    this.clip = this.stance.idle; this.t = 0; this.fade = 0; this.rate = 1; this.swingRate = 1;
    this.swinging = false; this.recovering = false; this.threat = null; this.recoilT = 0;
    this.comboT = Math.max(this.comboT, 0.7);
  }

  // Blade thrown back by something it can't cut.
  recoil(sim, kick) {
    this.rate = -0.9;
    this.recoilT = 0.22;
    this.swinging = false;
    this.threat = null;
    this.trauma = Math.min(1, this.trauma + kick);
  }

  onParry(sim) {
    this.recoil(sim, 0.45);
    this.whiffed = false;
    this.swinging = false;
  }

  // Returns whether it landed: a shield can stop it. (unblockable: it comes up out of the ground under you.)
  damage(sim, amount, fromX, fromZ, knock, unblockable = false) {
    if (sim.gameState !== 0) return false;
    if (!unblockable && this.blocking) {
      const dx = fromX - this.x, dz = fromZ - this.z, L = Math.hypot(dx, dz) || 1;
      if ((dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / L > GUARD_ARC) return this.blockBlow(sim, amount, fromX, fromZ, knock);
    }
    this.applyHurt(sim, amount, fromX, fromZ, knock);
    return true;
  }

  applyHurt(sim, amount, fromX, fromZ, knock) {
    amount *= ARMOR_K / (ARMOR_K + (this.armor || 0));
    this.hp -= amount;
    this.regenT = 0;
    this.flash = Math.min(1, this.flash + 0.55 + amount * 0.012);
    this.trauma = Math.min(1, this.trauma + 0.55);
    const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1;
    // Screen direction of the blow, for the wound marker.
    this.hitDir = wrapAngle(this.yaw - Math.atan2(-dx, -dz));
    this.hitDirT = 0;
    this.knockX = dx / L * (2.2 + knock); this.knockZ = dz / L * (2.2 + knock);
    if (this.hp <= 0 && !this.dead) {
      this.hp = 0; this.dead = true; this.deadT = 0;
      this.swinging = false; this.threat = null;
      sim.event(EV.LOSE, this.x, this.y, this.z);
      sim.gameState = 2; sim.gameT = 0;
    } else if (amount > 14 && this.clip !== this.stance.idle && !this.swinging) {
      // A hard blow knocks an unfinished wind-up, or a guard taken from behind, out of your hands.
      this.guard = 0;
      this.toIdle();
    }
  }

  // The view model's solved joints give the blade's tip and middle in view space.
  solveViewModel(snap, sim) {
    const { arms } = this;
    arms.solve(arms.clips[this.clip === this.stance.idle ? this.rest : this.clip], this.t, this.fade, snap, VM_PALETTE);
    if (sim.casting.armDown > 0) this.lowerSwordArm(snap, sim.casting.armDown);
    const tp = arms.tip * 3, rp = arms.weapon * 3, w = arms.wt;
    snap[H.TIP_X] = w[tp]; snap[H.TIP_Y] = w[tp + 1]; snap[H.TIP_Z] = w[tp + 2];
    snap[H.ROOT_X] = w[rp]; snap[H.ROOT_Y] = w[rp + 1]; snap[H.ROOT_Z] = w[rp + 2];
  }

  // The sword arm goes down out of the way of the casting hand, and the shield arm stays where it is.
  lowerSwordArm(snap, k) {
    const { arms } = this;
    const chain = arms.swordArm || (arms.swordArm = arms.names.flatMap((n, j) => (/_R$/.test(n) || n === 'weapon' || n === 'weapon_tip' ? [j] : [])));
    const ty = -1.6 * k, tz = 0.2 * k;
    for (const j of chain) {
      const o = VM_PALETTE + j * 8, x = snap[o], y = snap[o + 1], z = snap[o + 2], w = snap[o + 3];
      snap[o + 4] += 0.5 * (ty * z - tz * y);
      snap[o + 5] += 0.5 * (ty * w + tz * x);
      snap[o + 6] += 0.5 * (-ty * x + tz * w);
      snap[o + 7] += -0.5 * (ty * y + tz * z);
    }
  }

  // View-space blade point to a world ray from the eye. The view model has a wider camera than the world,
  // so its slope is rescaled to land under the same pixel.
  rayFrom(px, py, pz, out) {
    const r = this.vmRatio;
    const d = Math.max(-pz, 0.05);
    const vx = (px / d) * r, vy = (py / d) * r;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw), sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    const fx = s * cp, fy = sp, fz = c * cp;
    const rx = -c, rz = s;
    const ux = -s * sp, uy = cp, uz = -c * sp;
    let x = rx * vx + ux * vy + fx, y = uy * vy + fy, z = rz * vx + uz * vy + fz;
    const l = 1 / Math.hypot(x, y, z);
    out[0] = x * l; out[1] = y * l; out[2] = z * l;
  }

  // Sweep the blade and resolve what it meets this tick.
  sweep(snap, sim) {
    const { arms } = this;
    const w = arms.wt, tp = arms.tip * 3, rp = arms.weapon * 3;
    const tipX = w[tp], tipY = w[tp + 1], tipZ = w[tp + 2];
    const mx = w[rp] * 0.25 + tipX * 0.75, my = w[rp + 1] * 0.25 + tipY * 0.75, mz = w[rp + 2] * 0.25 + tipZ * 0.75;
    const ey = this.y + EYE;
    this.rayFrom(mx, my, mz, tmp);
    this.bladeA = [this.x + tmp[0] * 0.6, ey + tmp[1] * 0.6, this.z + tmp[2] * 0.6];
    const REACH = this.stance.reach;
    this.bladeB = [this.x + tmp[0] * REACH.mid, ey + tmp[1] * REACH.mid, this.z + tmp[2] * REACH.mid];
    if (sim.tick % 8 === 0) this.checkAim(snap, sim, ey);
    if (!this.swinging) { this.havePrev = false; return; }
    // Which way the blade is travelling across the view: a cut is laid along this.
    if (this.havePrev) {
      this.rayFrom(this.tipPrev[0], this.tipPrev[1], this.tipPrev[2], tmp2);
      this.rayFrom(tipX, tipY, tipZ, tmp);
      const sx = tmp[0] - tmp2[0], sy = tmp[1] - tmp2[1], sz = tmp[2] - tmp2[2], sl = Math.hypot(sx, sy, sz);
      if (sl > 1e-5) { sweepDir[0] = sx / sl; sweepDir[1] = sy / sl; sweepDir[2] = sz / sl; }
    }
    const SUB = 3;
    for (let i = 1; i <= SUB; i++) {
      const a = this.havePrev ? i / SUB : 1;
      const px = this.tipPrev[0] + (tipX - this.tipPrev[0]) * a, py = this.tipPrev[1] + (tipY - this.tipPrev[1]) * a, pz = this.tipPrev[2] + (tipZ - this.tipPrev[2]) * a;
      const qx = this.midPrev[0] + (mx - this.midPrev[0]) * a, qy = this.midPrev[1] + (my - this.midPrev[1]) * a, qz = this.midPrev[2] + (mz - this.midPrev[2]) * a;
      this.rayFrom(px, py, pz, tmp);
      this.castRay(tmp, REACH.tip, ey, snap, sim, true);
      if (!this.swinging) break;
      this.rayFrom(qx, qy, qz, tmp);
      this.castRay(tmp, REACH.mid, ey, snap, sim, false);
      if (!this.swinging) break;
      if (!this.havePrev) break;
    }
    this.tipPrev[0] = tipX; this.tipPrev[1] = tipY; this.tipPrev[2] = tipZ;
    this.midPrev[0] = mx; this.midPrev[1] = my; this.midPrev[2] = mz;
    this.havePrev = true;
  }

  // Tell the crosshair when it's over a cut that a blow would go through.
  checkAim(snap, sim, ey) {
    this.aimWound = false;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw), sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    const dx = s * cp, dy = sp, dz = c * cp;
    for (let i = 0; i < sim.knights.length; i++) {
      const k = sim.knights[i];
      if (k.dead || !k.gashes.length || Math.hypot(k.x - this.x, k.z - this.z) > 4.2) continue;
      k.plateTransforms(snap, sim.charOffset(i), sim.tick);
      if (k.rayPlates(this.x, ey, this.z, dx, dy, dz, 4, hit) && k.nearestGash(hit.piece, hit.lx, hit.ly, hit.lz, this.punctureRadius(sim) * 1.3, -1)) this.aimWound = true;
    }
  }

  // Thumbs aim less finely than a mouse, so a cut is a wider target on touch screens.
  punctureRadius(sim) { return PUNCTURE_RADIUS * (sim.touchAssist ? 2 : 1); }

  castRay(dir, reach, ey, snap, sim, isTip) {
    const { x, z } = this;
    const dx = dir[0], dy = dir[1], dz = dir[2];
    let wallT = sim.world.rayBoxes(x, ey, z, dx, dy, dz, reach);
    for (let i = 0; i < sim.knights.length; i++) {
      const k = sim.knights[i];
      if (k.dead) continue;
      if (k.iframes) { if (Math.hypot(k.x - x, k.z - z) < reach + 1) this.whiffed = true; continue; }
      if (Math.hypot(k.x - x, k.z - z) > 4.6) continue;
      if (wallT > 0 && wallT < Math.hypot(k.x - x, k.z - z) - 0.5) continue;
      // The shield stands in front of everything when it's up.
      if (k.shieldPos && (k.shieldUp > 0.55 || k.state === S.BLOCK)) {
        const t = this.rayShield(k, x, ey, z, dx, dy, dz, reach);
        if (t > 0) {
          const hx = x + dx * t, hy = ey + dy * t, hz = z + dz * t;
          sim.event(EV.BLOCK, hx, hy, hz, -dx, -dy, -dz, k.id);
          sim.hitStop(0.05);
          k.onBlocked(sim, !!SWING_INFO[this.clip]?.heavy);
          this.whiffed = false;
          this.recoil(sim, 0.35);
          return;
        }
      }
      k.plateTransforms(snap, sim.charOffset(i), sim.tick);
      if (!k.rayPlates(x, ey, z, dx, dy, dz, reach, hit)) continue;
      this.onContact(sim, k, i, dx, dy, dz, ey);
      if (!this.swinging) return;
    }
    if (!isTip) return;
    if (wallT > 0 && !this.struckWall && !this.contact) {
      this.struckWall = true;
      const hx = x + dx * wallT, hy = ey + dy * wallT, hz = z + dz * wallT;
      sim.event(EV.WALL, hx, hy, hz, -dx, -dy, -dz);
      this.whiffed = false;
      this.recoil(sim, 0.3);
      return;
    }
    // The point digs in when a slam reaches the ground.
    const gy = sim.world.height(x + dx * reach, z + dz * reach);
    if (!this.struckGround && ey + dy * reach < gy) {
      this.struckGround = true;
      const tg = (gy - ey) / dy;
      const hx = x + dx * tg, hz = z + dz * tg;
      sim.event(EV.GROUND, hx, gy, hz);
      this.trauma = Math.min(1, this.trauma + 0.25);
      this.whiffed = false;
    }
  }

  rayShield(k, ox, oy, oz, dx, dy, dz, reach) {
    const s = k.shieldPos, nz = k.shieldAxisZ, ax = k.shieldAxisX, ay = k.shieldAxisY, scale = k.opts.shieldHit;
    const den = dx * nz[0] + dy * nz[1] + dz * nz[2];
    if (Math.abs(den) < 1e-4) return -1;
    const t = ((s[0] - ox) * nz[0] + (s[1] - oy) * nz[1] + (s[2] - oz) * nz[2]) / den;
    if (t < 0 || t > reach) return -1;
    const hx = ox + dx * t - s[0], hy = oy + dy * t - s[1], hz = oz + dz * t - s[2];
    const u = (hx * ax[0] + hy * ax[1] + hz * ax[2]) / (0.3 * scale);
    const v = (hx * ay[0] + hy * ay[1] + hz * ay[2]) / (0.5 * scale);
    // A kite: wide at the top, narrowing to its point.
    const shape = u * u + (v < 0 ? v * v * 0.9 : v * v * 1.6);
    return shape < 1 ? t : -1;
  }

  onContact(sim, k, charIndex, dx, dy, dz, ey) {
    const wx = this.x + dx * hit.t, wy = ey + dy * hit.t, wz = this.z + dz * hit.t;
    const c = this.contact;
    const sameKnight = c && c.k === k;
    if (sameKnight && c.piece === hit.piece && c.gash) {
      // Same plate still under the blade: the cut runs on, straight, the way the blade is going.
      const g = c.gash, d = g.dir;
      const along = (hit.lx - g.a[0]) * d[0] + (hit.ly - g.a[1]) * d[1] + (hit.lz - g.a[2]) * d[2];
      const L = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1], g.b[2] - g.a[2]);
      if (along > L && along < MAX_GASH_LENGTH) {
        g.b[0] = g.a[0] + d[0] * along; g.b[1] = g.a[1] + d[1] * along; g.b[2] = g.a[2] + d[2] * along;
        k.gashVersion++;
      }
      this.tryPuncture(sim, k, wx, wy, wz, g);
      return;
    }
    if (sameKnight && c.count >= 2) return;
    // First bite of this plate.
    const open = this.punctured ? null : k.nearestGash(hit.piece, hit.lx, hit.ly, hit.lz, this.punctureRadius(sim), this.swingCount);
    const first = !sameKnight;
    if (first) {
      this.whiffed = false;
      this.drag = 0.07;
      this.kick = 1;
      this.trauma = Math.min(1, this.trauma + 0.32);
    }
    k.plateTransforms(sim.scratch, sim.charOffset(charIndex), sim.tick);
    k.dirToBind(tmp2, hit.piece, 0, -1, 0);
    let g = null;
    if (open) {
      this.applyPuncture(sim, k, open, wx, wy, wz);
    } else {
      g = k.addGash(sim, hit.piece, hit.lx, hit.ly, hit.lz, hit.nx, hit.ny, hit.nz, tmp2[0], tmp2[1], tmp2[2]);
      g.swing = this.swingCount;
      const tag = SWING_INFO[this.clip];
      g.width *= tag.width;
      // A blow leaves a slash from the moment it lands, however little of the swing the plate was under the blade.
      k.dirToBind(tmp2, hit.piece, sweepDir[0], sweepDir[1], sweepDir[2]);
      const along = tmp2[0] * hit.nx + tmp2[1] * hit.ny + tmp2[2] * hit.nz;
      let tx = tmp2[0] - hit.nx * along, ty = tmp2[1] - hit.ny * along, tz = tmp2[2] - hit.nz * along;
      let tl = Math.hypot(tx, ty, tz);
      if (tl < 0.05) { tx = hit.ny; ty = -hit.nx; tz = 0; tl = Math.hypot(tx, ty, tz) || 1; }
      tx /= tl; ty /= tl; tz /= tl;
      const half = tag.heavy ? 0.13 : 0.09;
      g.dir = [tx, ty, tz];
      g.a = [hit.lx - tx * half, hit.ly - ty * half, hit.lz - tz * half];
      g.b = [hit.lx + tx * half, hit.ly + ty * half, hit.lz + tz * half];
      k.hp -= tag.dmg * this.bite();
      this.drink();
      this.hits++;
      sim.event(EV.GASH, wx, wy, wz, -dx, -dy, -dz, k.id);
      sim.firstBlood();
      if (first) { sim.hitStop(tag.heavy ? 0.1 : 0.07); k.onHit(sim, 'gash', this.x, this.z, tag.poise * (1 + this.poise)); }
    }
    this.contact = { k, piece: hit.piece, gash: g, count: (sameKnight ? c.count : 0) + 1 };
  }

  tryPuncture(sim, k, wx, wy, wz, current) {
    // A running cut that crosses an older wound goes through it.
    if (this.punctured) return;
    const open = k.gashes.find((g) => {
      if (g === current || g.piece !== hit.piece || g.punct >= 0 || g.swing === this.swingCount) return false;
      const a = g.a, b = g.b;
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
      const L2 = ex * ex + ey * ey + ez * ez;
      const t = L2 > 1e-8 ? clamp(((hit.lx - a[0]) * ex + (hit.ly - a[1]) * ey + (hit.lz - a[2]) * ez) / L2, 0, 1) : 0;
      const d = Math.hypot(a[0] + ex * t - hit.lx, a[1] + ey * t - hit.ly, a[2] + ez * t - hit.lz);
      if (d < this.punctureRadius(sim)) { g.tOn = t; return true; }
      return false;
    });
    if (open) this.applyPuncture(sim, k, open, wx, wy, wz);
  }

  applyPuncture(sim, k, g, wx, wy, wz) {
    const wasOpen = g.punct >= 0;
    this.punctured = true;
    this.hits++;
    k.puncture(sim, g, hit.lx, hit.ly, hit.lz, hit.nx, hit.ny, hit.nz);
    k.hp -= (wasOpen ? 12 : 26) * this.bite() * (1 + this.pierce);
    this.drink();
    this.bloodSword = Math.min(1, this.bloodSword + 0.35);
    k.plateTransforms(sim.scratch, sim.charOffset(sim.knights.indexOf(k)), sim.tick);
    k.bindToWorld(tmp2, g.piece, g.n[0] + 0, g.n[1] + 0, g.n[2] + 0);
    const iv = k.inv[g.piece];
    const nx = tmp2[0] - iv.t[0], ny = tmp2[1] - iv.t[1], nz = tmp2[2] - iv.t[2];
    sim.event(EV.PUNCTURE, wx, wy, wz, nx, ny, nz, k.id, wasOpen ? 1 : 0);
    sim.hitStop(0.09);
    this.trauma = Math.min(1, this.trauma + 0.45);
    k.onHit(sim, wasOpen ? 'reopen' : 'puncture', this.x, this.z, 45 * (1 + this.poise));
  }

  write(snap, sim) {
    snap[H.PX] = this.x; snap[H.PY] = this.y; snap[H.PZ] = this.z;
    snap[H.VX] = this.vx; snap[H.VY] = this.vy; snap[H.VZ] = this.vz;
    snap[H.HP] = this.hp; snap[H.MAX_HP] = this.maxHp;
    snap[H.SHAKE_X] = this.shakeX; snap[H.SHAKE_Y] = this.shakeY; snap[H.SHAKE_R] = this.shakeR;
    snap[H.DMG_FLASH] = this.flash;
    snap[H.BLOOD_SWORD] = this.bloodSword;
    snap[H.SWINGING] = this.swinging ? 1 : 0;
    snap[H.SWING_T] = this.clip === this.stance.idle ? 0 : this.t;
    snap[H.WEAPON] = this.weapon;
    snap[H.HIT_DIR] = this.hitDir; snap[H.HIT_DIR_T] = this.hitDirT;
    snap[H.GROUND_SPEED] = this.groundSpeed || 0;
    snap[H.ON_GROUND] = this.onGround ? 1 : 0;
    snap[H.SURF] = this.surfing ? 1 : 0;
    snap[H.CAM_DROP] = this.landKick + this.surfLow + (this.dead ? Math.min(this.deadT * 0.9, 1.25) : 0);
    snap[H.WEAK] = this.weak;
    snap[H.STAMINA] = this.stamina;
    snap[H.AIM_WOUND] = this.aimWound ? 1 : 0;
    snap[H.DODGE] = Math.max(0, this.dodgeT);
    this.solveViewModel(snap, sim);
  }
}

export { EYE };
