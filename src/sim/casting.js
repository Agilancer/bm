// Spells on the sim's side: the hands, the mana, everything in the air and on the ground, and what it does to whoever is there.
// Each tick it writes what's alive as a list of shapes (FX in spells.js) into the snapshot, for src/gfx/spellfx.js to draw.
import { EV, FX_FLOATS, FX_START, H, INPUT, MAX_FX, SPELL_PALETTE, WEAPONS } from '../core/layout.js';
import { SHIELD_FACE_POINT, shieldRise, shieldX, shieldY } from '../core/shield-pose.js';
import { EYE } from './player.js';
import { ELEM, FX, MANA_REGEN, MAX_MANA, SPELLS } from './spells.js';
import { STAFFS2 } from '../items/staffs2.js';
import { STAFF_GRAND, STAFF_SHOTS, installStaffShots } from './staffshots.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { const s = Math.sin(n * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const SUFFIX = { R: 'r', L: 'l', both: 'both' };
const RESUME = 0.16;   // after a hold, the cast picks up this long past its hit
const TICK = 0.18;     // how often a held spell bites
const tmp = [0, 0, 0], out3 = [0, 0, 0];
// What each staff fires, a spell's bolt from its head. It costs what the spell costs.
const STAFF_BOLT = { crystal_staff: 'frost', greenwood_staff: 'plague', skullhorn_staff: 'firebolt', gnarled_crook: 'lightning' };
// The eight elemental staffs fire these, not a spell. mana is the cost of a shot; the rest is each one's own, in land() and the zones.
const { FIRE, FROST, HEAL, DRAIN, VOID, POISON, SPIRIT, STONE } = ELEM;
const STAFF_SHOT = {
  vine_staff: { key: 'vine', elem: POISON, mana: 8, speed: 30, size: 0.16, dmg: 34, reach: 10, grab: 5 },
  wind_staff: { key: 'gale', elem: SPIRIT, mana: 10, dmg: 16, life: 5 },
  fire_staff: { key: 'comet', elem: FIRE, mana: 8, speed: 30, size: 0.42, dmg: 48, radius: 2.5, embers: 6 },
  ice_staff: { key: 'rime', elem: FROST, mana: 8, speed: 38, size: 0.2, dmg: 30, freeze: 1.4, spray: 8 },
  earth_staff: { key: 'boulder', elem: STONE, mana: 9, speed: 21, size: 0.42, dmg: 40, radius: 2.5, lift: 0.22, grav: 15, life: 6, bounces: 3 },
  dark_staff: { key: 'shade', elem: VOID, mana: 6, speed: 26, size: 0.3, dmg: 32, reach: 13, hops: 4, drink: 3 },
  death_staff: { key: 'doom', elem: DRAIN, mana: 8, speed: 44, size: 0.2, dmg: 62, fuse: 1.3, leaps: 2 },
  life_staff: { key: 'bloom', elem: HEAL, mana: 7, speed: 30, size: 0.24, dmg: 34, radius: 2.5, heal: 4 },
};
// A staff fights from far off, so it bites for far less than a blade up close: what a bolt's spell does, times this, times the staff's roll against a sword of 20.
const STAFF_BITE = 0.55, STAFF_MANA = 5, STAFF_BLAST = 2.5;   // (Raised when the swords went: this is the left click now, the thing you do between spells.)
const SPELL_BITE = 0.6;   // every spell against the quicker dying of the overhaul: a firebolt takes a zombie, ten take a knight
const STAFF_AHEAD = 0.85;   // how far along the head's ray a bolt starts, as a palm's does

// The hands' camera is wider than the world's: this turns a slope from one into the slope under the same pixel in the other.
const WORLD_HALF_TAN = Math.tan(32 * Math.PI / 180);
const TO_WORLD = WORLD_HALF_TAN / Math.tan(38 * Math.PI / 180);

// (5 is a zombie or a caster, 6 the ogre.)
const chestOf = (k) => k.y + (k.crawling ? 0.35 : k.opts?.height ? k.opts.height * 0.6 : [1.25, 1.25, 0.55, 1.3, 1.4, 1.2, 1.9][k.kind]);
const radiusOf = (k) => k.opts?.radius ?? [0.55, 0.55, 1.15, 1.5, 1.7, 0.5, 0.8][k.kind];
const heightOf = (k) => (k.crawling ? 0.7 : k.opts?.height ?? [2, 2, 1.2, 2.2, 3.1, 1.9, 2.9][k.kind]);

// What a staff fires: the old twelve by their own tables, the new ones by the kind of shot their row names.
const SHOT_OF = Object.fromEntries(STAFFS2.map((s) => [s.id, s.shot]));
const OLD_SHOT = Object.fromEntries(Object.values(STAFF_SHOT).map((d) => [d.key, d]));
function staffShot(id) {
  if (STAFF_SHOT[id]) return STAFF_SHOT[id];
  if (STAFF_BOLT[id]) return SPELLS.find((d) => d.key === STAFF_BOLT[id]);
  const shot = SHOT_OF[id];
  if (STAFF_GRAND[id]) return { ...STAFF_SHOTS[shot], ...STAFF_GRAND[id] };
  return STAFF_SHOTS[shot] || OLD_SHOT[shot] || SPELLS.find((d) => d.key === shot) || SPELLS.find((d) => d.key === 'frost');
}

export class Casting {
  constructor(rigs) {
    this.rigs = rigs;
    this.data = new Float32Array(MAX_FX * FX_FLOATS);
    this.n = 0;
    this.castSeen = -1;
    this.reset();
  }

  reset() {
    Object.assign(this, {
      waves: [], power: 1, maxMana: MAX_MANA, regen: 1, thrift: 0, leechT: 0, mana: MAX_MANA, state: 'idle', def: null, rig: null, clip: null, t: 0, fade: 1, fadeRate: 10, side: 'R', keep: false, lower: 0, armOnly: false, armLower: 0, asked: 0,
      gathered: false, charge: 0, held: 0, tickT: 0, fizzleT: 0, selected: 0, summonT: 0, launchT: 0, heldNow: false, flip: false,
      bolts: [], zones: [], bursts: [], missiles: [], spikes: [], blades: null, wisp: null,
    });
    this.aff = new Map();
  }

  get busy() { return this.state !== 'idle'; }
  // How far the sword arm alone has gone down, for a shield that stays up.
  get armDown() { return smooth(this.armLower); }
  // What a spell does to how fast its target runs: frozen stops, chilled drags.
  rate(k) { const a = this.aff.get(k); return !a ? 1 : a.freeze > 0 ? 0 : a.slow > 0 ? 0.5 : 1; }
  // And to how fast you walk with your hands up.
  get drag() { return this.state === 'hold' || this.state === 'gather' ? 0.68 : this.state === 'idle' ? 1 : 0.85; }

  affOf(k) {
    let a = this.aff.get(k);
    if (!a) { a = { burn: 0, freeze: 0, slow: 0, rot: 0, vx: 0, vz: 0, h: 0, vh: 0, tickT: 0, frozeT: 0 }; this.aff.set(k, a); }
    return a;
  }

  update(dt, tdt, input, sim) {
    this.n = 0;
    this.stepGhosts(tdt, input, sim);
    if (this.castSeen < 0) this.castSeen = input[INPUT.CAST_N];
    const tapped = input[INPUT.CAST_N] !== this.castSeen;
    this.castSeen = input[INPUT.CAST_N];
    // (A press made mid-swing waits for the swing, a moment.)
    this.asked = tapped ? 0.35 : Math.max(0, this.asked - dt);
    const none = input[INPUT.SPELL] < 0;   // (No spell learned yet: a staff's bolt is another matter.)
    if (none) this.asked = 0;
    const held = input[INPUT.CAST] > 0.5 && !none;
    this.selected = clamp(input[INPUT.SPELL] | 0, 0, SPELLS.length - 1);
    if (this.state !== 'hold') this.mana = Math.min(this.maxMana, this.mana + MANA_REGEN * this.regen * dt);
    this.fizzleT -= dt;
    this.stepHands(dt, held || this.asked > 0, held, sim);
    this.stepBolts(tdt, sim);
    this.stepZones(tdt, sim);
    this.stepMissiles(tdt, sim);
    this.stepSpikes(tdt, sim);
    this.stepBlades(tdt, sim);
    this.stepWisp(tdt, sim);
    this.stepAfflictions(tdt, sim);
    this.stepBursts(tdt);
  }

  write(snap) {
    snap[H.MANA] = this.mana; snap[H.MAX_MANA] = this.maxMana;
    snap[H.SPELL] = this.selected;
    snap[H.VM_LOWER] = smooth(this.lower);
    snap[H.SKULL_LOWER] = smooth(this.skullLower || 0);
    snap[H.CAST_HELD] = this.state === 'hold' ? this.def.elem + 1 : 0;
    snap[H.SPELL_RIG] = 0;
    if (this.rig) {
      this.rig.solve(this.rig.clips[this.clip], this.t, this.fade, snap, SPELL_PALETTE);
      snap[H.SPELL_RIG] = this.rig === this.rigs.attack ? 1 : 2;
    }
    snap[H.FX_N] = this.n;
    snap.set(this.data.subarray(0, this.n * FX_FLOATS), FX_START);
  }

  // One shape. alpha < 0 draws it over the hands, not behind them. `extra` is the shape's own: a beam's far width, a bolt's jaggedness.
  fx(shape, elem, x, y, z, size, ax = 0, ay = 1, az = 0, len = 0, alpha = 1, light = 0, lightR = 0, age = 0, seed = 0, extra = 0) {
    if (this.n >= MAX_FX) return;
    const d = this.data, o = this.n++ * FX_FLOATS;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size;
    d[o + 4] = ax; d[o + 5] = ay; d[o + 6] = az; d[o + 7] = len;
    d[o + 8] = shape; d[o + 9] = elem; d[o + 10] = seed; d[o + 11] = age;
    d[o + 12] = alpha; d[o + 13] = light; d[o + 14] = lightR; d[o + 15] = extra;
  }

  // Something that runs its course and is gone: size goes from s0 to s1 over its life.
  burst(shape, elem, x, y, z, s0, s1, life, o = {}) {
    this.bursts.push({ shape, elem, x, y, z, s0, s1, life, age: 0, ax: o.ax ?? 0, ay: o.ay ?? 1, az: o.az ?? 0, len: o.len ?? 0, alpha: o.alpha ?? 1, light: o.light ?? 0, lightR: o.lightR ?? 0, seed: Math.random(), extra: o.extra ?? 0, ease: o.ease ?? 2.2 });
  }

  stepBursts(dt) {
    const keep = [];
    for (const b of this.bursts) {
      b.age += dt;
      const k = b.age / b.life;
      if (k >= 1) continue;
      const grow = 1 - (1 - k) ** b.ease;
      const a = (1 - k) ** 1.5;
      this.fx(b.shape, b.elem, b.x, b.y, b.z, b.s0 + (b.s1 - b.s0) * grow, b.ax, b.ay, b.az, b.len, b.alpha * a, b.light * a, b.lightR, k, b.seed, b.extra);
      keep.push(b);
    }
    this.bursts = keep;
  }

  // ---- the hands ----

  clipName(prefix) { return `${prefix}_${SUFFIX[this.side]}`; }

  setClip(name, t, fadeRate) {
    if (this.rig && this.clip) { this.rig.capture(); this.fade = 0; this.fadeRate = fadeRate; } else this.fade = 1;
    this.clip = name; this.t = t;
  }

  begin(sim) {
    const def = SPELLS[this.selected], p = sim.player;
    if (this.mana < def.mana * (1 - this.thrift)) {
      if (this.fizzleT <= 0) { sim.event(EV.SPELL_FIZZLE); this.fizzleT = 0.8; }
      return;
    }
    this.mana -= def.mana * (1 - this.thrift);
    this.asked = 0;
    const swordHands = WEAPONS[p.weapon]?.hands || 0, shield = swordHands === 1 && p.hasShield;
    // A free hand beside a one-handed sword casts, and the sword stays up. With a shield on the other arm the sword goes away and the sword hand casts,
    // and the shield stays where it is. Otherwise whatever's held goes down.
    this.side = def.hands === 2 ? 'both' : swordHands === 1 && !shield ? 'L' : 'R';
    this.keep = def.hands === 1 && swordHands === 1 && !shield;
    this.armOnly = def.hands === 1 && shield;
    this.def = def;
    this.rig = this.rigs[def.rig];
    this.clip = null;
    this.setClip(this.clipName('cast'), 0, 10);
    this.state = 'wind';
    this.gathered = false; this.charge = 0; this.held = 0; this.tickT = 0; this.summonT = 0;
    // (One solve, so the palms are where they are from the first tick.)
    this.rig.solve(this.rig.clips[this.clip], 0, 1, this.data, 0);
    sim.event(EV.SPELL_CAST, def.elem, this.selected, p.x, p.y + EYE, p.z);
  }

  stepHands(dt, want, held, sim) {
    const p = sim.player;
    if (this.state === 'idle') {
      if (p.stance.shoots || p.staffSurf) this.stepStaff(sim);
      this.lower = Math.max(0, this.lower - dt * 3.2);
      this.skullLower = Math.max(0, (this.skullLower || 0) - dt * 3.2);
      this.armLower = Math.max(0, this.armLower - dt * 3.2);
      if (want && !p.dead && !p.swinging && !p.guard && p.staffSurfT === null && p.clip === p.stance.idle && sim.gameState === 0) this.begin(sim);
      if (this.state === 'idle') return;
    }
    const def = this.def;
    const clip = this.rig.clips[this.clip];
    this.lower = this.keep || this.armOnly ? Math.max(0, this.lower - dt * 5) : Math.min(1, this.lower + dt * 6);
    if (this.armOnly) this.armLower = Math.min(1, this.armLower + dt * 6);
    // The skull's hand is free of a one-handed spell, and only goes down for one that needs both.
    this.skullLower = def.hands === 2 ? Math.min(1, (this.skullLower || 0) + dt * 6) : Math.max(0, (this.skullLower || 0) - dt * 5);
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * this.fadeRate);
    if (p.dead) { this.endCast(); return; }
    switch (this.state) {
      case 'wind':
        this.t += dt;
        this.palmGlow(def, smooth(this.t / clip.hit) * 0.55, sim);
        if (def.gather && !this.gathered && this.t >= clip.wind) { this.t = clip.wind; this.state = 'gather'; sim.event(EV.SPELL_CAST, def.elem, this.selected, p.x, p.y + EYE, p.z, 1); } else if (this.t >= clip.hit) {
          if (def.channel) {
            this.setClip(this.clipName('hold'), 0, 10);
            this.state = 'hold';
            this.channel(def, dt, sim, true);
          } else {
            this.fire(def, sim);
            this.state = 'out';
          }
        }
        break;
      case 'gather':
        this.charge += dt;
        this.palmGlow(def, 0.55 + 0.45 * this.charge / def.gather, sim);
        if (this.charge >= def.gather || (!held && this.charge >= def.minGather)) { this.gathered = true; this.state = 'wind'; }
        break;
      case 'hold':
        this.t += dt;
        this.held += dt;
        // A full fan of missiles costs little to keep.
        this.mana = Math.max(0, this.mana - (1 - this.thrift) * def.drain * dt * (def.cast === 'swarm' && this.waiting() >= def.max ? 0.15 : 1));
        if ((!held && this.held >= def.minHold) || this.mana <= 0) {
          this.setClip(this.clipName('cast'), this.rig.clips[this.clipName('cast')].hit + RESUME, 10);
          this.state = 'out';
        } else {
          this.palmGlow(def, 0.8, sim);
          this.channel(def, dt, sim, false);
        }
        break;
      default:
        this.t += dt;
        if (def.rig === 'raise') this.palmLift(def, clip, sim);
        if (this.t >= clip.dur) this.endCast();
    }
  }

  endCast() { this.state = 'idle'; this.rig = null; this.clip = null; this.def = null; }

  // Where a palm is on screen, as a point in the world this far along the ray under that pixel.
  palm(side, dist, sim, out) {
    const r = this.rig, p = sim.player, w = r.wt;
    let vx, vy, vz;
    if (side === 'both') {
      const a = r.index.get('palm_R') * 3, b = r.index.get('palm_L') * 3;
      vx = (w[a] + w[b]) / 2; vy = (w[a + 1] + w[b + 1]) / 2; vz = (w[a + 2] + w[b + 2]) / 2;
    } else {
      const a = r.index.get(`palm_${side}`) * 3;
      vx = w[a]; vy = w[a + 1]; vz = w[a + 2];
    }
    const d = Math.max(-vz, 0.05), sx = vx / d * TO_WORLD, sy = vy / d * TO_WORLD;
    const s = Math.sin(p.yaw), c = Math.cos(p.yaw), sp = Math.sin(p.pitch), cp = Math.cos(p.pitch);
    const x = -c * sx - s * sp * sy + s * cp, y = cp * sy + sp, z = s * sx - c * sp * sy + c * cp, L = dist / Math.hypot(x, y, z);
    out[0] = p.x + x * L; out[1] = p.y + EYE + y * L; out[2] = p.z + z * L;
    return out;
  }

  // Use the staff tip's screen ray on foot, or the off-screen hand at the lower-right corner when surfing.
  staffOrigin(p, aspect, out) {
    let sx, sy, eyeY = p.y + EYE;
    if (p.surfing) {
      const edge = 1.1 * WORLD_HALF_TAN;
      sx = edge * aspect;
      sy = -edge;
      eyeY -= p.surfLow + p.landKick;
    } else {
      const a = p.arms.tip * 3, w = p.arms.wt;
      const d = Math.max(-w[a + 2], 0.05);
      sx = w[a] / d * TO_WORLD;
      sy = w[a + 1] / d * TO_WORLD;
    }
    const s = Math.sin(p.yaw), c = Math.cos(p.yaw), sp = Math.sin(p.pitch), cp = Math.cos(p.pitch);
    const x = -c * sx - s * sp * sy + s * cp, y = cp * sy + sp, z = s * sx - c * sp * sy + c * cp, L = STAFF_AHEAD / Math.hypot(x, y, z);
    out[0] = p.x + x * L; out[1] = eyeY + y * L; out[2] = p.z + z * L;
    return out;
  }

  // A cast in the staff's arm: the head gathers light on the lift, and on the hit a bolt leaves it for what's under the crosshair.
  stepStaff(sim) {
    const p = sim.player;
    const t = p.staffSurf ? p.staffSurfT : p.clip === 'staff_cast' ? p.t : null;
    if (t === null) return;
    const id = WEAPONS[p.weapon].id, def = staffShot(id), info = p.rigs[3].clips.staff_cast;
    const from = this.staffOrigin(p, sim.input[INPUT.VIEW_ASPECT] || 16 / 9, out3);
    if (t < info.hit) {
      const k = smooth(t / info.hit);
      this.fx(FX.FLARE, def.elem, from[0], from[1], from[2], 0.015 + 0.035 * k, 0, 1, 0, 0, -(0.2 + 0.5 * k), 0, 0, 0, 0.3);
      this.fx(FX.LIGHT, def.elem, from[0], from[1], from[2], 0, 0, 1, 0, 0, 1, 0.1 + 0.3 * k, 1.5);
      return;
    }
    if (p.fired) return;
    p.fired = true;
    const cost = (def.mana && !SPELLS.includes(def) ? def.mana : STAFF_MANA) * (1 - this.thrift);
    if (this.mana < cost) {
      if (this.fizzleT <= 0) { sim.event(EV.SPELL_FIZZLE); this.fizzleT = 0.8; }
      return;
    }
    this.mana -= cost;
    this.charge = def.gather || 0;
    const k = STAFF_BITE * p.bite();
    const scaled = {};
    for (const f of def.scaled || []) scaled[f] = def[f] * k;
    if (def.key === 'gale') this.loose_gale({ ...def, dmg: def.dmg * k }, sim, from);
    else if (def.loose) this[`loose_${def.key}`]({ ...def, ...scaled, staff: true, dmg: def.dmg * k }, sim, [from[0], from[1], from[2]]);
    else this.cast_bolt({ ...def, ...scaled, staff: true, radius: Math.min(def.radius ?? STAFF_BLAST, STAFF_BLAST), dmg: def.dmg * k, lash: def.lash * k, dps: def.dps * k }, sim, [from[0], from[1], from[2]]);
    sim.event(EV.SPELL_CAST, def.elem, SPELLS.indexOf(def), p.x, p.y + EYE, p.z);
  }

  // The hands are lit from where they're drawn, which is further off than they look: this is that place.
  palmShading(side, sim, out) {
    const r = this.rig, p = sim.player, w = r.wt, a = r.index.get(`palm_${side}`) * 3;
    const s = Math.sin(p.yaw), c = Math.cos(p.yaw), sp = Math.sin(p.pitch), cp = Math.cos(p.pitch);
    const px = w[a], py = w[a + 1], pz = -w[a + 2] + 0.03;
    out[0] = p.x - c * px - s * sp * py + s * cp * pz;
    out[1] = p.y + EYE + cp * py + sp * pz;
    out[2] = p.z + s * px - c * sp * py + c * cp * pz;
    return out;
  }

  palmGlow(def, k, sim) {
    const sides = this.side === 'both' ? ['R', 'L'] : [this.side];
    for (const side of sides) {
      this.palm(side, 0.85, sim, out3);
      const size = def.key === 'firebolt' ? 0.05 + 0.16 * k : 0.03 + 0.07 * k;
      this.fx(def.key === 'firebolt' ? FX.ORB : FX.FLARE, def.elem, out3[0], out3[1], out3[2], size, 0, 1, 0, 0, -(0.35 + 0.65 * k), 0, 0, 0, 0.3);
      this.palmShading(side, sim, out3);
      // (A palm turned to the eye shows all it lights, and the whole arm below it: it wants far less.)
      this.fx(FX.LIGHT, def.elem, out3[0], out3[1], out3[2], 0, 0, 1, 0, 0, 1, (0.5 + 1.3 * k) * (def.rig === 'raise' ? 0.08 : 0.12), 1.5);
    }
  }

  // Once a spell has been raised, what's left of it lifts off the palms and away.
  palmLift(def, clip, sim) {
    const after = this.t - clip.hit, fade = smooth(after / 0.06) * smooth((0.55 - after) / 0.3);
    if (fade <= 0) return;
    for (const side of this.side === 'both' ? ['R', 'L'] : [this.side]) {
      this.palm(side, 0.85, sim, out3);
      for (let i = 0; i < 7; i++) {
        const u = (after * 1.5 + i / 7) % 1, a = i * 2.4 + after * 5;
        this.fx(FX.FLARE, def.elem, out3[0] + Math.cos(a) * 0.03 * (1 + u), out3[1] + u * 0.3, out3[2] + Math.sin(a) * 0.03 * (1 + u), 0.035 * (1.2 - u), 0, 1, 0, 0, -fade * (1 - u), 0, 0, 0.5, i * 0.13);
      }
    }
  }

  // ---- looking at things ----

  forward(p, out) {
    const cp = Math.cos(p.pitch);
    out[0] = Math.sin(p.yaw) * cp; out[1] = Math.sin(p.pitch); out[2] = Math.cos(p.yaw) * cp;
    return out;
  }

  // How far a ray goes before the walls or the ground stop it.
  trace(sim, ox, oy, oz, dx, dy, dz, maxT) {
    const w = sim.world;
    let end = maxT;
    const b = w.rayBoxes(ox, oy, oz, dx, dy, dz, maxT);
    if (b > 0 && b < end) end = b;
    const steps = Math.ceil(end / 0.5);
    let last = 0;
    for (let i = 1; i <= steps; i++) {
      const s = end * i / steps;
      if (oy + dy * s < w.height(ox + dx * s, oz + dz * s)) {
        let lo = last, hi = s;
        for (let j = 0; j < 5; j++) { const m = (lo + hi) / 2; if (oy + dy * m < w.height(ox + dx * m, oz + dz * m)) hi = m; else lo = m; }
        return lo;
      }
      last = s;
    }
    return end;
  }

  // The first body on a line. Spells miss nothing for being a shield's width off: they fly at a body's own shape, an upright capsule.
  foeOn(sim, ox, oy, oz, dx, dy, dz, len, rad, skip) {
    let best = null, bestT = len;
    const xz2 = dx * dx + dz * dz;
    for (const k of sim.foes) {
      if (k.dead || (skip && skip.has(k))) continue;
      const R = radiusOf(k) + rad;
      const fx = k.x - ox, fz = k.z - oz;
      let t = xz2 > 1e-6 ? clamp((fx * dx + fz * dz) / xz2, 0, len) : 0;
      const cx = ox + dx * t - k.x, cz = oz + dz * t - k.z, c2 = cx * cx + cz * cz;
      if (c2 > R * R) continue;
      if (xz2 > 1e-6) t = Math.max(0, t - Math.sqrt((R * R - c2) / xz2));
      const y = oy + dy * t;
      if (y < k.y - rad - 0.1 || y > k.y + heightOf(k) + rad) continue;
      if (t <= bestT) { bestT = t; best = k; }
    }
    return best ? { k: best, t: bestT } : null;
  }

  // The foe nearest the line of sight, within so many radians.
  lockOn(sim, range, angle) {
    const p = sim.player, f = this.forward(p, []), ey = p.y + EYE;
    let best = null, bestA = angle;
    for (const k of sim.foes) {
      if (k.dead) continue;
      const dx = k.x - p.x, dy = chestOf(k) - ey, dz = k.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d > range || d < 0.01) continue;
      const a = Math.acos(clamp((dx * f[0] + dy * f[1] + dz * f[2]) / d, -1, 1));
      // A knight who hasn't turned on you isn't sought out, unless you're looking right at him.
      if (!k.hostile && a > 0.08) continue;
      if (a < bestA && sim.world.sees(p.x, ey, p.z, k.x, chestOf(k), k.z)) { bestA = a; best = k; }
    }
    return best;
  }

  nearestFoe(sim, x, y, z, range, skip) {
    let best = null, bestD = range;
    for (const k of sim.foes) {
      if (k.dead || !k.hostile || (skip && skip.has(k))) continue;
      const d = Math.hypot(k.x - x, chestOf(k) - y, k.z - z);
      if (d < bestD && sim.world.sees(x, y, z, k.x, chestOf(k), k.z)) { bestD = d; best = k; }
    }
    return best;
  }

  // Where the crosshair lands, a little kindly: on a body if one's right there.
  aim(sim, range, out) {
    const p = sim.player, f = this.forward(p, []), ey = p.y + EYE;
    const lock = this.lockOn(sim, range, 0.06);
    if (lock) { out[0] = lock.x; out[1] = chestOf(lock); out[2] = lock.z; return lock; }
    const t = this.trace(sim, p.x, ey, p.z, f[0], f[1], f[2], range);
    out[0] = p.x + f[0] * t; out[1] = ey + f[1] * t; out[2] = p.z + f[2] * t;
    return null;
  }

  // Where the crosshair meets the ground, or the ground under the end of its reach.
  groundAim(sim, range, out) {
    this.aim(sim, range, out);
    out[1] = sim.world.height(out[0], out[2]);
    return out;
  }

  // ---- what they do to whoever's there ----

  hurt(sim, k, dmg, elem, x, y, z, fromX, fromZ, poise = dmg * 0.7, kind = 'gash') {
    if (k.dead) return;
    // A knight's raised shield takes most of a spell from the front.
    if (k.spellGuard) { const through = k.spellGuard(sim, fromX, fromZ, dmg); dmg *= through; poise *= through; }
    // (A jelly's own make-up: amber shrugs off fire, pitch burns: src/sim/slimes.js SPECIES resist.)
    const res = k.sp?.resist?.[elem];
    if (res !== undefined) { dmg *= res; poise *= res; }
    const a = this.affOf(k);
    k.hp -= (a.freeze > 0 ? dmg * 1.5 : dmg) * SPELL_BITE * this.power;
    k.playerHitT = sim.time;     // (The player had a hand in it: src/sim/sim.worker.js, whose kill it is.)
    // Leech: a drink for each hit, but a held spell's ticks don't add up to a fountain.
    if (sim.time > this.leechT) { this.leechT = sim.time + 0.25; sim.player.drink(); }
    k.onHit(sim, kind, fromX, fromZ, poise);
    sim.event(EV.SPELL_HIT, elem, x, y, z, dmg, sim.mobIndex ? sim.mobIndex(k) : -1);
  }

  shove(k, vx, vz, up = 0) {
    const a = this.affOf(k);
    a.vx += vx; a.vz += vz;
    if (up > 0) a.vh = Math.max(a.vh, up);
  }

  // The shove made visible, after Bellmourn's shovewave.js: a see-through, rim-lit ghost of the shield leaves its face and flies out across
  // the shove's box, swelling to the box's width and fading at the far end.
  ghostShield(reach, half) {
    this.waves.push({ reach, half, t: 0, from: null, travel: null });
  }

  stepGhosts(tdt, input, sim) {
    const WAVE_TIME = 0.36;
    const p = sim.player;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      if (w.from) w.t += tdt;
      else {
        if (!p.hasShield || p.hasSkull || p.surfing || p.dead) { this.waves.splice(i, 1); continue; }
        // Let the board rise into the view. A quick tap still launches on release.
        if (p.guard && p.blockHeld && p.shieldUp < 0.5) continue;
        const rise = shieldRise(p.shieldUp);
        const [x, y, z] = SHIELD_FACE_POINT;
        const sx = (x + shieldX(rise, input[INPUT.VIEW_ASPECT] || 16 / 9)) * TO_WORLD;
        const sy = (y + shieldY(rise)) * TO_WORLD;
        const s = Math.sin(p.yaw), c = Math.cos(p.yaw), sp = Math.sin(p.pitch), cp = Math.cos(p.pitch);
        w.from = [p.x - c * sx - s * sp * sy - s * cp * z, p.y + EYE + cp * sy - sp * z, p.z + s * sx - c * sp * sy - c * cp * z];
        const fx = s * cp, fy = sp, fz = c * cp;
        const distance = Math.max(-z + 0.05, this.trace(sim, p.x, p.y + EYE, p.z, fx, fy, fz, w.reach));
        w.travel = [p.x + fx * distance - w.from[0], p.y + EYE + fy * distance - w.from[1], p.z + fz * distance - w.from[2]];
        const length = Math.hypot(...w.travel);
        w.dir = w.travel.map((d) => d / length);
      }
      const k = Math.min(1, w.t / WAVE_TIME), e = 1 - (1 - k) * (1 - k);
      const a = 0.9 * (k < 0.15 ? 1 : ((1 - k) / 0.85) ** 1.6);
      const [x, y, z] = w.from, [dx, dy, dz] = w.travel;
      this.fx(FX.KITE, ELEM.SPIRIT, x + dx * e, y + dy * e, z + dz * e, 0.27 + (w.half - 0.27) * e, ...w.dir, 0, a, 8 * a, 6, k, 0);
      if (k >= 1) this.waves.splice(i, 1);
    }
  }

  // A blast: hurts and throws everything within radius, by how near it is.
  explode(sim, x, y, z, radius, dmg, elem, force, up = 0, skip = null) {
    const p = sim.player;
    for (const k of sim.foes) {
      if (k.dead || (skip && skip === k)) continue;
      // Measured from a knight's width in, so a blast on the flank of something huge isn't a near miss.
      const dx = k.x - x, dz = k.z - z, d = Math.max(0, Math.hypot(dx, dz, chestOf(k) - y) - (radiusOf(k) - 0.55));
      if (d > radius + 0.55) continue;
      const f = clamp(1 - d / (radius + 0.55), 0.25, 1);
      this.hurt(sim, k, dmg * f, elem, k.x, chestOf(k), k.z, x, z, 60 * f, f > 0.55 ? 'puncture' : 'gash');
      const L = Math.hypot(dx, dz) || 1;
      this.shove(k, dx / L * force * f, dz / L * force * f, up * f);
    }
    const near = Math.hypot(p.x - x, p.y + EYE - y, p.z - z);
    p.trauma = Math.min(1, p.trauma + clamp(radius * 0.22 / (1 + near * 0.16), 0, 0.8));
    sim.event(EV.SPELL_BOOM, elem, x, y, z, radius);
    const R = radius;
    this.burst(FX.FLARE, elem, x, y, z, R * 1.2, R * 2.2, 0.32, { alpha: 1.4, light: 26 + R * 8, lightR: R * 5 });
    this.burst(FX.ORB, elem, x, y, z, R * 0.45, R * 0.95, 0.42, { alpha: 1.1, ease: 3 });
    this.burst(FX.SHOCK, elem, x, y, z, R * 0.3, R * 1.3, 0.48, { alpha: 0.9, ease: 3.2 });
    this.burst(FX.RING, elem, x, sim.world.height(x, z), z, R * 0.3, R * 1.5, 0.62, { alpha: 1, ease: 2.6 });
    this.burst(FX.DISC, elem, x, sim.world.height(x, z), z, R * 0.7, R * 0.9, 2.2, { alpha: 0.9, ease: 6 });
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * TAU, r = Math.random() * R * 0.4;
      this.burst(FX.PUFF, elem, x + Math.cos(a) * r, y + Math.random() * R * 0.3, z + Math.sin(a) * r, R * 0.35, R * 0.95, 1.1 + Math.random() * 0.5, { alpha: 0.55, ease: 2 });
    }
  }

  // Frozen for so long, less each time within a few seconds of the last thaw, and less again for the great ones: a fight
  // can be slowed by ice, not held still by it.
  freezeFor(sim, f, secs) {
    const a = this.affOf(f), again = (a.thawAt ?? -1e9) > sim.time - 6;
    const s = secs * (again ? 0.35 : 1) * (f.maxHp >= 400 ? 0.4 : 1);
    if (s > a.freeze) { a.freeze = s; a.thawAt = sim.time + s; }
  }

  stepAfflictions(dt, sim) {
    for (const [k, a] of this.aff) {
      // (A body that's dead and still: forgotten, or every slime and lair monster ever touched stays in here for good.)
      if (k.dead && !(a.h > 0) && Math.abs(a.vx) + Math.abs(a.vz) <= 0.02) { this.aff.delete(k); continue; }
      // Thrown about: a slide on the ground and a flight off it.
      if (Math.abs(a.vx) + Math.abs(a.vz) > 0.02) {
        out3[0] = k.x + a.vx * dt; out3[1] = 0; out3[2] = k.z + a.vz * dt;
        sim.world.resolve(out3, radiusOf(k), k.y + 0.2);
        k.x = out3[0]; k.z = out3[2];
        const drag = Math.max(0, 1 - 3.6 * dt);
        a.vx *= drag; a.vz *= drag;
      }
      if (a.vh !== 0 || a.h > 0) {
        a.h += a.vh * dt; a.vh -= 16 * dt;
        if (a.h <= 0) { a.h = 0; a.vh = 0; }
      }
      k.y += a.h;
      if (k.dead) { a.freeze = 0; a.slow = 0; a.rot = 0; }
      a.freeze = Math.max(0, a.freeze - dt);
      a.slow = Math.max(0, a.slow - dt);
      a.burn = Math.max(0, a.burn - dt);
      a.rot = Math.max(0, a.rot - dt);
      a.tickT -= dt;
      if (a.tickT <= 0 && (a.burn > 0 || a.rot > 0) && !k.dead) {
        a.tickT = 0.5;
        if (a.burn > 0) this.hurt(sim, k, 3.5, ELEM.FIRE, k.x, chestOf(k), k.z, k.x, k.z, 0);
        if (a.rot > 0) this.hurt(sim, k, 2.5, ELEM.POISON, k.x, chestOf(k), k.z, k.x, k.z, 0);
      }
      const tall = heightOf(k), wide = radiusOf(k);
      if (a.burn > 0 && !k.dead) {
        for (let i = 0; i < 3; i++) this.fx(FX.FLAME, ELEM.FIRE, k.x + Math.cos(i * 2.1) * wide * 0.3, k.y + 0.1 + i * 0.3, k.z + Math.sin(i * 2.1) * wide * 0.3, tall * 0.85, 0, 1, 0, wide * 1.1, Math.min(1, a.burn * 2), i === 0 ? 8 : 0, 5, 0, k.id + i * 0.31);
      }
      if (a.freeze > 0) {
        a.frozeT += dt;
        const size = smooth(a.frozeT / 0.18) * smooth(a.freeze / 0.3);
        for (let i = 0; i < 9; i++) {
          const ang = i * 2.399 + k.id, r = wide * (0.5 + hash(i + k.id) * 0.45), y = tall * (0.05 + (i / 9) * 0.85);
          const ox = Math.cos(ang), oz = Math.sin(ang), L = 0.55 + hash(i * 3.1) * 0.5;
          this.fx(FX.ICE, ELEM.FROST, k.x + ox * r * 0.6, k.y + y - 0.15, k.z + oz * r * 0.6, 0.14 * size * L * 1.6, ox * 0.75, 0.66, oz * 0.75, L * size, 1, i === 0 ? 4 : 0, 4, 0, i * 0.37);
        }
      } else a.frozeT = 0;
      if (a.rot > 0 && !k.dead) this.fx(FX.PUFF, ELEM.POISON, k.x, k.y + tall * 0.55, k.z, tall * 0.65, 0, 1, 0, 0, 0.35, 0, 0, 0, k.id * 0.17);
      if (a.slow > 0 && a.freeze <= 0 && !k.dead) this.fx(FX.RING, ELEM.FROST, k.x, k.y, k.z, wide * 1.6, 0, 1, 0, 0, 0.5, 0, 0, 0.3, k.id * 0.13);
    }
  }

  // ---- casting ----

  fire(def, sim) {
    this[`cast_${def.cast}`](def, sim);
    sim.event(EV.SPELL_LOOSE, def.elem, SPELLS.indexOf(def), sim.player.x, sim.player.y + EYE, sim.player.z);
  }

  cast_bolt(def, sim, head = null) {
    const aim = [0, 0, 0], from = head || this.palm(this.side, 0.85, sim, [0, 0, 0]);
    this.aim(sim, 90, aim);
    const n = def.shards || 1;
    for (let i = 0; i < n; i++) {
      let dx = aim[0] - from[0], dy = aim[1] - from[1], dz = aim[2] - from[2];
      const L = 1 / (Math.hypot(dx, dy, dz) || 1);
      dx *= L; dy *= L; dz *= L;
      if (n > 1) {
        // A fan, side by side across the view.
        const off = (i - (n - 1) / 2) * def.spread, px = -dz, pz = dx;
        dx += px * off + (Math.random() - 0.5) * 0.01; dy += (Math.random() - 0.5) * 0.02; dz += pz * off + (Math.random() - 0.5) * 0.01;
      }
      if (def.lift) dy += def.lift;
      const g = def.gather ? clamp(this.charge / def.gather, 0.2, 1) : 1;
      this.bolts.push({
        def, elem: def.elem, x: from[0], y: from[1], z: from[2], vx: dx * def.speed, vy: dy * def.speed, vz: dz * def.speed, age: 0,
        size: def.size * (def.gather ? 0.45 + 0.55 * g : 1), power: g, grav: def.grav || 0, through: def.pierce ? new Set() : null, seed: Math.random(), lashT: 0,
        maxAge: def.fuse || def.life || 3,
      });
    }
    this.burst(FX.FLARE, def.elem, from[0], from[1], from[2], 0.09, head ? 0.18 : 0.26, head ? 0.1 : 0.14, { alpha: head ? -0.55 : -0.8 });
  }

  stepBolts(dt, sim) {
    if (!this.bolts.length) return;
    const keep = [];
    for (const b of this.bolts) {
      b.age += dt;
      b.vy -= b.grav * dt;
      const sp = Math.hypot(b.vx, b.vy, b.vz) || 1, dx = b.vx / sp, dy = b.vy / sp, dz = b.vz / sp, step = sp * dt;
      const end = this.trace(sim, b.x, b.y, b.z, dx, dy, dz, step);
      const foe = this.foeOn(sim, b.x, b.y, b.z, dx, dy, dz, end, b.size * 0.3, b.through);
      if (foe) {
        const x = b.x + dx * foe.t, y = b.y + dy * foe.t, z = b.z + dz * foe.t;
        if (!b.through) { b.x = x; b.y = y; b.z = z; this.land(b, sim, foe.k); continue; }
        b.through.add(foe.k);
        this.hurt(sim, foe.k, b.def.dmg, b.elem, x, y, z, b.x, b.z, 45, 'puncture');
        this.shove(foe.k, dx * 3.5, dz * 3.5);
        sim.event(EV.SPELL_BOOM, b.elem, x, y, z, 0.6);
      }
      b.x += dx * end; b.y += dy * end; b.z += dz * end;
      if (end < step - 1e-4 || b.age > b.maxAge) { this.land(b, sim, null, dx, dy, dz, end < step - 1e-4); continue; }
      this.drawBolt(b, dx, dy, dz, sp, dt, sim);
      keep.push(b);
    }
    this.bolts = keep;
  }

  drawBolt(b, dx, dy, dz, sp, dt, sim) {
    const fly = this[`fly_${b.def.key}`];
    if (fly) { fly.call(this, b, dx, dy, dz, sp, dt, sim); return; }
    const { x, y, z, size, elem } = b, flown = b.age * sp, tail = Math.min(flown, 1);
    switch (b.def.key) {
      case 'vine': case 'bloom': case 'doom':
        this.fx(FX.ORB, elem, x, y, z, size, 0, 1, 0, 0, 1, 10, 7, 0, b.seed);
        this.fx(FX.TRAIL, elem, x, y, z, size * 0.7, -dx, -dy, -dz, Math.min(flown, tail * 2), 0.8, 0, 0, 0, b.seed);
        break;
      case 'shade':
        this.fx(FX.VORTEX, elem, x, y, z, size, 0, 1, 0, 0, 1, 8, 7, 0, b.seed);
        break;
      case 'boulder':
        this.fx(FX.ROCK, elem, x - dx * size, y - dy * size, z - dz * size, size, dx, dy, dz, size * 2, 1, 4, 5, 0.5, b.seed);
        break;
      case 'comet': case 'ember':
      case 'firebolt':
        this.fx(FX.ORB, elem, x, y, z, size, 0, 1, 0, 0, 1, 18 + 26 * b.power, 14, 0, b.seed);
        this.fx(FX.TRAIL, elem, x, y, z, size * 0.72, -dx, -dy, -dz, Math.min(flown, tail * (2.2 + size * 2.4)), 0.9, 0, 0, 0, b.seed);
        break;
      case 'frost':
        this.fx(FX.ICE, elem, x - dx * 0.45, y - dy * 0.45, z - dz * 0.45, 0.075, dx, dy, dz, 0.9, 1, 3, 5, 0, b.seed);
        this.fx(FX.TRAIL, elem, x, y, z, 0.1, -dx, -dy, -dz, Math.min(flown, tail * 1.8), 0.7, 0, 0, 0, b.seed);
        break;
      case 'lightning':
        this.fx(FX.ORB, elem, x, y, z, size * (0.92 + 0.14 * Math.sin(b.age * 31)), 0, 1, 0, 0, 1, 26, 15, 0, b.seed);
        b.lashT -= dt;
        for (let i = 0; i < 4; i++) {
          const a = hash(b.seed + Math.floor(b.age * 11) + i) * TAU, e = hash(i * 7.3 + Math.floor(b.age * 9)) * 2 - 1;
          const ax = Math.cos(a) * (1 - e * e) ** 0.5, ay = e, az = Math.sin(a) * (1 - e * e) ** 0.5;
          const t = this.trace(sim, x, y, z, ax, ay, az, 2.6 + hash(i + b.age) * 2);
          this.fx(FX.BOLT, elem, x, y, z, 0.35, ax, ay, az, t, 0.9, 0, 0, 0, b.seed + i + Math.floor(b.age * 14) * 0.17, 0.7);
        }
        if (b.lashT <= 0) {
          b.lashT = 0.35;
          for (const k of sim.foes) {
            if (k.dead) continue;
            const c = chestOf(k), d = Math.hypot(k.x - x, c - y, k.z - z);
            if (d > 7 || !k.hostile) continue;
            this.hurt(sim, k, b.def.lash, elem, k.x, c, k.z, x, z, 8);
            this.burst(FX.BOLT, elem, x, y, z, 0.7, 0.7, 0.2, { ax: (k.x - x) / d, ay: (c - y) / d, az: (k.z - z) / d, len: d, extra: 1.1 });
          }
        }
        break;
      case 'lance':
        this.fx(FX.LANCE, elem, x - dx * 1.5, y - dy * 1.5, z - dz * 1.5, 0.06, dx, dy, dz, 1.9, 1, 3, 4, 0, b.seed);
        this.fx(FX.TRAIL, elem, x, y, z, 0.07, -dx, -dy, -dz, Math.min(flown, tail * 2.6), 0.6, 0, 0, 0, b.seed);
        break;
      case 'well':
        this.fx(FX.VORTEX, elem, x, y, z, size * 0.9, 0, 1, 0, 0, 1, 10, 9, 0, b.seed);
        break;
      default:   // the flask
        this.fx(FX.FLASK, elem, x - dx * 0.16, y - dy * 0.16, z - dz * 0.16, 0.085, Math.sin(b.age * 13), Math.cos(b.age * 13), 0.2, 0.32, 1, 4, 5, 0, b.seed);
        this.fx(FX.TRAIL, elem, x, y, z, 0.09, -dx, -dy, -dz, Math.min(flown, tail * 1.2), 0.55, 0, 0, 0, b.seed);
    }
  }

  land(b, sim, foe, dx = 0, dy = 0, dz = 0, struck = true) {
    const { x, y, z, elem, def } = b;
    const hit = this[`hit_${def.key}`];
    if (hit) { hit.call(this, b, sim, foe, dx, dy, dz, struck); return; }
    switch (def.key) {
      case 'firebolt':
        this.explode(sim, x, y, z, def.radius * (0.55 + 0.45 * b.power), def.dmg * (0.3 + 0.7 * b.power), elem, 6 * b.power);
        if (foe && !def.staff) this.affOf(foe).burn = Math.max(this.affOf(foe).burn, 3);
        break;
      case 'frost':
        if (foe) { this.hurt(sim, foe, def.dmg, elem, x, y, z, x - b.vx * 0.01, z - b.vz * 0.01, 14); this.affOf(foe).slow = Math.max(this.affOf(foe).slow, def.chill); }
        sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.9);
        this.burst(FX.FLARE, elem, x, y, z, 0.5, 1, 0.16, { light: 10, lightR: 6 });
        this.burst(FX.SHOCK, elem, x, y, z, 0.2, 1.1, 0.26);
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * TAU, e = Math.random();
          this.burst(FX.ICE, elem, x + Math.cos(a) * 0.1, y, z + Math.sin(a) * 0.1, 0.07, 0.01, 0.4, { ax: Math.cos(a), ay: e, az: Math.sin(a), len: 0.3 + e * 0.5 });
        }
        break;
      case 'lightning':
        this.explode(sim, x, y, z, def.radius, def.dmg, elem, 7);
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU, ax = Math.cos(a), az = Math.sin(a), ay = (hash(i) - 0.4) * 0.8;
          this.burst(FX.BOLT, elem, x, y, z, 0.7, 0.7, 0.28 + hash(i + 3) * 0.2, { ax, ay, az, len: this.trace(sim, x, y, z, ax, ay, az, 6 + hash(i + 7) * 3), extra: 1 });
        }
        break;
      case 'lance':
        sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.8);
        // It stays where it stuck, a good way into what stopped it.
        if (struck) this.zones.push({ kind: 'stuck', x: x - dx * 1.4, y: y - dy * 1.4, z: z - dz * 1.4, dx, dy, dz, t: 0, life: 5, seed: b.seed, quiver: 1 });
        break;
      case 'well': {
        const g = sim.world.height(x, z);
        this.zones.push({ kind: 'well', def, x, y: Math.max(y, g + 1.3), z, t: 0, life: def.duration, seed: b.seed });
        sim.event(EV.SPELL_LOOSE, elem, 16, x, y, z);
        break;
      }
      case 'vine': this.land_vine(b, sim, foe); break;
      case 'comet':
        this.explode(sim, x, y, z, def.radius, def.dmg, elem, 6);
        this.spray(b, foe, def.embers, (a, off) => this.bolts.push({ ...b, def: { ...def, key: 'ember', dmg: def.dmg * 0.35, radius: 1.5 }, x: x + Math.cos(a) * off, y: y + 0.4, z: z + Math.sin(a) * off, vx: Math.cos(a) * 7, vy: 7 + Math.random() * 3, vz: Math.sin(a) * 7, size: 0.16, grav: 18, age: 0, maxAge: 2 }));
        break;
      case 'ember':
        this.explode(sim, x, y, z, def.radius, def.dmg, elem, 2);
        for (const k of sim.foes) if (!k.dead && k.hostile && Math.hypot(k.x - x, chestOf(k) - y, k.z - z) < def.radius + radiusOf(k)) this.affOf(k).burn = Math.max(this.affOf(k).burn, 2.5);
        break;
      case 'rime':
        if (foe) { this.hurt(sim, foe, def.dmg, elem, x, y, z, x, z, 20); this.freezeFor(sim, foe, def.freeze); }
        sim.event(EV.SPELL_BOOM, elem, x, y, z, 1.4);
        this.burst(FX.SHOCK, elem, x, y, z, 0.3, 2.2, 0.3, { light: 12, lightR: 7 });
        this.spray(b, foe, def.spray, (a, off) => this.bolts.push({ ...b, def: { ...def, key: 'frost', dmg: def.dmg * 0.45, chill: 3 }, x: x + Math.cos(a) * off, y: y + 0.5, z: z + Math.sin(a) * off, vx: Math.cos(a) * 22, vy: 0, vz: Math.sin(a) * 22, age: 0, maxAge: 0.45 }));
        break;
      case 'boulder': {
        this.explode(sim, x, y, z, def.radius, def.dmg, elem, 6, 6);
        const hops = b.hops ?? def.bounces;
        // Off the ground or a body it goes on, lower each time. A wall or the end of its time stops it.
        if (hops > 0 && struck && (foe || (dy < -0.2 && Math.abs(dy) > Math.hypot(dx, dz) * 0.3))) this.bolts.push({ ...b, y: y + 0.2, vx: b.vx * 0.85, vz: b.vz * 0.85, vy: Math.max(4, Math.abs(b.vy) * 0.65), hops: hops - 1 });
        break;
      }
      case 'shade':
        if (foe) this.shadeBite(sim, foe, def, x, y, z);
        sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.8);
        this.zones.push({ kind: 'shade', def, x, y, z, t: 0, life: 6, seed: b.seed, k: null, left: def.hops, seen: new Set(foe ? [foe] : []) });
        break;
      case 'doom':
        sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.7);
        if (foe) this.markDoom(foe, def, 0);
        break;
      case 'bloom': {
        for (const k of sim.foes) if (!k.dead && k.hostile && Math.hypot(k.x - x, chestOf(k) - y, k.z - z) < def.radius + radiusOf(k)) this.zones.push({ kind: 'mote', def, x: k.x, y: chestOf(k), z: k.z, t: 0, life: 5, seed: Math.random() });
        this.explode(sim, x, y, z, def.radius, def.dmg, elem, 3);
        break;
      }
      case 'plague': {
        const g = sim.world.height(x, z);
        if (foe) this.hurt(sim, foe, def.dmg, elem, x, y, z, x, z, 12);
        sim.event(EV.SPELL_BOOM, elem, x, y, z, 1.8);
        this.burst(FX.FLARE, elem, x, y, z, 0.7, 1.6, 0.2, { light: 12, lightR: 8 });
        this.zones.push({ kind: 'cloud', def, x, y: g, z, t: 0, life: def.duration, seed: b.seed, tickT: 0 });
        break;
      }
    }
  }

  // Things thrown out all round from a landing: clear of the body it struck, or the first thing they'd hit is that.
  spray(b, foe, n, make) {
    const off = foe ? radiusOf(foe) + 0.5 : 0.3, turn = Math.random() * TAU;
    for (let i = 0; i < n; i++) make(turn + i / n * TAU, off);
  }

  // Vines out of the ground where it landed, or out of whoever it struck, to everyone near: they're hurt and dragged in, and so is the one they're dragged to.
  land_vine(b, sim, foe) {
    const { x, y, z, def, elem } = b, g = sim.world.height(x, z), seen = new Set(foe ? [foe] : []), ties = [];
    if (foe) this.hurt(sim, foe, def.dmg, elem, x, y, z, x, z, 20);
    while (ties.length < def.grab) {
      const k = this.nearestFoe(sim, x, foe ? y : g + 1, z, def.reach, seen);
      if (!k) break;
      seen.add(k);
      ties.push({ k, bit: false, seed: Math.random() });
    }
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 1.2);
    this.burst(FX.RING, elem, x, g + 0.05, z, 0.4, 2.4, 0.5);
    if (ties.length) this.zones.push({ kind: 'vines', def, x, y: foe ? y : g + 0.15, z, t: 0, life: 1.1, anchor: foe, ties });
  }

  zone_vines(z, dt, sim) {
    const def = z.def, e = def.elem;
    if (z.anchor && !z.anchor.dead) { z.x = z.anchor.x; z.y = chestOf(z.anchor); z.z = z.anchor.z; }
    const reach = smooth(z.t / 0.18), fade = 1 - smooth((z.t - z.life + 0.2) / 0.2);
    for (const t of z.ties) {
      const k = t.k, c = chestOf(k);
      if (reach >= 1 && !t.bit) { t.bit = true; this.hurt(sim, k, def.dmg, e, k.x, c, k.z, z.x, z.z, 30); if (z.anchor) this.hurt(sim, z.anchor, def.dmg * 0.25, e, z.x, z.y, z.z, k.x, k.z, 0); }
      if (k.dead) continue;
      const dx = z.x - k.x, dz = z.z - k.z, d = Math.hypot(dx, dz) || 1, stop = radiusOf(k) + (z.anchor ? radiusOf(z.anchor) : 0) + 0.3;
      if (reach >= 1 && d > stop) { const a = this.affOf(k), sp = Math.min(17, (d - stop) * 7); a.vx = dx / d * sp; a.vz = dz / d * sp; a.slow = Math.max(a.slow, 0.5); }
      this.drawVine(e, z.x, z.y, z.z, z.x + (k.x - z.x) * reach, z.y + (c - z.y) * reach, z.z + (k.z - z.z) * reach, t.seed, z.t, fade);
    }
  }

  // A wavering line, in short lengths.
  drawVine(e, x0, y0, z0, x1, y1, z1, seed, t, alpha) {
    const N = 7, L = Math.hypot(x1 - x0, y1 - y0, z1 - z0) || 1, sx = -(z1 - z0) / L, sz = (x1 - x0) / L;
    const at = (i, o) => {
      const u = i / N, w = Math.sin(u * Math.PI) * Math.min(0.45, L * 0.08) * Math.sin(u * 9 + seed * 20 + t * 9);
      o[0] = x0 + (x1 - x0) * u + sx * w; o[1] = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 0.25; o[2] = z0 + (z1 - z0) * u + sz * w;
    };
    const a = [0, 0, 0], c = [0, 0, 0];
    at(0, a);
    for (let i = 1; i <= N; i++) {
      at(i, c);
      const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], l = Math.hypot(dx, dy, dz) || 1;
      this.fx(FX.BEAM, e, a[0], a[1], a[2], 0.06, dx / l, dy / l, dz / l, l, alpha, i === 4 ? 4 : 0, 4, 0, seed, 0.06);
      a[0] = c[0]; a[1] = c[1]; a[2] = c[2];
    }
  }

  // The wind staff's tornado leaves the head no bigger than a hand and comes down to the ground, growing as it goes.
  loose_gale(def, sim, from) {
    const aim = [0, 0, 0];
    this.aim(sim, 60, aim);
    const dx = aim[0] - sim.player.x, dz = aim[2] - sim.player.z, L = Math.hypot(dx, dz) || 1;
    this.zones.push({ kind: 'gale', def, x: from[0], y: from[1], z: from[2], dx: dx / L, dz: dz / L, t: 0, life: def.life, tickT: 0, seed: Math.random() });
    this.burst(FX.FLARE, def.elem, from[0], from[1], from[2], 0.09, 0.2, 0.12, { alpha: -0.55 });
    sim.event(EV.SPELL_BOOM, def.elem, from[0], from[1], from[2], 0.5);
  }

  zone_gale(z, dt, sim) {
    const def = z.def, e = def.elem, grow = smooth(z.t / (def.life * 0.8)), R = 0.18 + 3 * grow, tall = 0.5 + 7.5 * grow, end = z.t > def.life - 0.35 ? (def.life - z.t) / 0.35 : 1;
    const sp = 8 - 4.5 * grow, step = sp * dt, gh = sim.world.height(z.x, z.z);
    z.y += (gh - z.y) * Math.min(1, 7 * dt);
    if (this.trace(sim, z.x, gh + 1, z.z, z.dx, 0, z.dz, step + 0.3) < step + 0.3) {
      // Round a wall, not through it.
      const t = z.dx, turn = hash(z.seed) > 0.5 ? 1 : -1; z.dx = -z.dz * turn; z.dz = t * turn;
    } else { z.x += z.dx * step; z.z += z.dz * step; }
    const rings = 9;
    for (let i = 0; i < rings; i++) {
      const u = i / (rings - 1), r = (0.12 + u ** 1.4 * 0.95) * R * end;
      const sway = Math.sin(z.t * 5 + u * 3 + z.seed * 9) * 0.22 * R * u;
      const cx = z.x + Math.cos(z.t * 3 + u * 4) * sway, cz = z.z + Math.sin(z.t * 3 + u * 4) * sway, cy = z.y + 0.05 + u * tall;
      this.fx(FX.RING, e, cx, cy, cz, r, 0, 1, 0, 0, 0.75 * end, 0, 0, 0.3, z.seed + i * 0.11 + z.t * 0.5);
      if (i % 2 === 0) this.fx(FX.VORTEX, e, cx, cy, cz, r * 0.95, 0, 1, 0, 0, 0.5 * end, i === 4 ? 9 * end : 0, 4 + R * 3, 0, z.seed + i * 0.17);
    }
    this.fx(FX.PUFF, e, z.x, z.y + 0.3, z.z, R * 1.2, 0, 1, 0, 0, 0.3 * end, 0, 0, 0, z.seed);
    z.tickT -= dt;
    const bite = z.tickT <= 0;
    if (bite) z.tickT = 0.25;
    for (const k of sim.foes) {
      if (k.dead || !k.hostile) continue;
      const dx = z.x - k.x, dz = z.z - k.z, d = Math.hypot(dx, dz) || 1, reach = R * 2 + 1 + radiusOf(k);
      if (d > reach) continue;
      // Drawn in and round, and off the ground once it's grown.
      const pull = (40 + 50 * grow) * dt;
      this.shove(k, (dx / d - dz / d * 0.9) * pull, (dz / d + dx / d * 0.9) * pull, d < R + radiusOf(k) && grow > 0.35 ? 2 + 4 * grow : 0);
      if (bite) this.hurt(sim, k, def.dmg * (0.35 + 0.65 * grow), e, k.x, chestOf(k), k.z, z.x, z.z, 6 + 10 * grow);
    }
  }

  shadeBite(sim, k, def, x, y, z) {
    this.hurt(sim, k, def.dmg, def.elem, x, y, z, x, z, 18);
    this.mana = Math.min(this.maxMana, this.mana + def.drink);
    this.burst(FX.SHOCK, def.elem, x, y, z, 0.2, 1.4, 0.3, { light: 8, lightR: 6 });
  }

  // From a landing it goes looking: to the nearest it hasn't bitten, and on, until there's no one left or it's done.
  zone_shade(z, dt, sim) {
    const def = z.def;
    if (!z.k || z.k.dead) {
      z.k = z.left > 0 ? this.nearestFoe(sim, z.x, z.y, z.z, def.reach, z.seen) : null;
      if (!z.k) return false;
    }
    const k = z.k, dx = k.x - z.x, dy = chestOf(k) - z.y, dz = k.z - z.z, d = Math.hypot(dx, dy, dz) || 1, step = 20 * dt;
    if (d <= step + radiusOf(k)) {
      this.shadeBite(sim, k, def, z.x, z.y, z.z);
      z.seen.add(k); z.k = null; z.left--;
    } else { z.x += dx / d * step; z.y += dy / d * step; z.z += dz / d * step; }
    this.fx(FX.VORTEX, def.elem, z.x, z.y, z.z, 0.4, 0, 1, 0, 0, 1, 10, 7, 0, z.seed);
    this.fx(FX.TRAIL, def.elem, z.x, z.y, z.z, 0.2, -dx / d, -dy / d, -dz / d, 1.2, 0.7, 0, 0, 0, z.seed);
  }

  markDoom(k, def, gen) {
    this.zones.push({ kind: 'doom', def, k, gen, t: 0, life: 99, seed: Math.random() });
  }

  // A mark over a foe, closing on it. When it's run, or they've died first, it falls: and a death sends it on.
  zone_doom(z, dt, sim) {
    const { def, k } = z, e = def.elem, u = clamp(z.t / def.fuse, 0, 1), c = chestOf(k);
    this.fx(FX.RUNE, e, k.x, k.y + 0.06, k.z, (radiusOf(k) + 0.7) * (1.6 - u * 0.7), 0, 1, 0, 0, 0.5 + u * 0.5, 3 + u * 8, 5, u, z.seed);
    this.fx(FX.ORB, e, k.x, k.y + heightOf(k) + 0.35, k.z, 0.12 + u * 0.12, 0, 1, 0, 0, 1, 0, 0, 0, z.seed);
    if (u < 1 && !k.dead) return;
    if (!k.dead) this.hurt(sim, k, def.dmg, e, k.x, c, k.z, k.x, k.z, 50, 'puncture');
    this.explode(sim, k.x, c, k.z, 2, def.dmg * 0.25, e, 3, 0, k);
    this.burst(FX.COLUMN, e, k.x, k.y, k.z, 1.4, 2, 0.45, { len: 0.7, light: 16, lightR: 7 });
    if (k.dead && z.gen < def.leaps) {
      const seen = new Set([k]);
      for (let i = 0; i < 2; i++) {
        const n = this.nearestFoe(sim, k.x, c, k.z, 11, seen);
        if (!n) break;
        seen.add(n);
        const L = Math.hypot(n.x - k.x, chestOf(n) - c, n.z - k.z) || 1;
        this.burst(FX.BEAM, e, k.x, c, k.z, 0.1, 0.03, 0.3, { ax: (n.x - k.x) / L, ay: (chestOf(n) - c) / L, az: (n.z - k.z) / L, len: L, extra: 0.1 });
        this.markDoom(n, def, z.gen + 1);
      }
    }
    return false;
  }

  // A speck of green off a foe, home to you, where it heals.
  zone_mote(z, dt, sim) {
    const p = sim.player, dx = p.x - z.x, dy = p.y + EYE * 0.7 - z.y, dz = p.z - z.z, d = Math.hypot(dx, dy, dz) || 1, step = (9 + z.t * 22) * dt;
    if (d <= step + 0.3) {
      p.hp = Math.min(p.maxHp, p.hp + z.def.heal);
      this.burst(FX.RING, z.def.elem, p.x, p.y + 0.05, p.z, 0.3, 1.3, 0.35);
      return false;
    }
    z.x += dx / d * step; z.y += dy / d * step + Math.sin(z.t * 8 + z.seed * 9) * 0.02; z.z += dz / d * step;
    this.fx(FX.ORB, z.def.elem, z.x, z.y, z.z, 0.14, 0, 1, 0, 0, 1, 6, 4, 0, z.seed);
    this.fx(FX.TRAIL, z.def.elem, z.x, z.y, z.z, 0.1, -dx / d, -dy / d, -dz / d, 0.8, 0.6, 0, 0, 0, z.seed);
  }

  cast_heal(def, sim) {
    const p = sim.player;
    p.hp = Math.min(p.maxHp, p.hp + def.amount + 0.15 * p.maxHp);
    this.zones.push({ kind: 'mend', def, x: p.x, y: p.y, z: p.z, t: 0, life: 1.6, seed: Math.random() });
  }

  cast_wisp(def, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]);
    this.wisp = { x: from[0], y: from[1], z: from[2], t: 0, life: def.duration, elem: def.elem };
  }

  stepWisp(dt, sim) {
    const w = this.wisp;
    if (!w) return;
    w.t += dt;
    if (w.t > w.life) { this.wisp = null; return; }
    const p = sim.player, s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    const tx = p.x + s * 1.2 - c * 0.85, ty = p.y + EYE + 0.5 + Math.sin(w.t * 1.7) * 0.12, tz = p.z + c * 1.2 + s * 0.85;
    const k = 1 - Math.exp(-dt * 3.2);
    w.x += (tx - w.x) * k; w.y += (ty - w.y) * k; w.z += (tz - w.z) * k;
    const fade = smooth((w.life - w.t) / 2) * smooth(w.t / 0.3);
    this.fx(FX.ORB, w.elem, w.x, w.y, w.z, 0.11 * fade, 0, 1, 0, 0, fade, 13 * fade, 16, 0, 0.7);
    this.fx(FX.FLARE, w.elem, w.x, w.y, w.z, 0.3 * fade, 0, 1, 0, 0, 0.35 * fade, 0, 0, 0.5, 0.3);
  }

  cast_wall(def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]), p = sim.player;
    const s = Math.sin(p.yaw), co = Math.cos(p.yaw);
    this.zones.push({ kind: 'wall', def, x: c[0], y: c[1], z: c[2], rx: -co, rz: s, t: 0, life: def.duration, tickT: 0, seed: Math.random() });
    sim.event(EV.SPELL_BOOM, def.elem, c[0], c[1] + 0.4, c[2], 2.2);
    sim.event(EV.SPELL_ZONE, def.elem, SPELLS.indexOf(def), c[0], c[1] + 0.6, c[2], def.duration);
  }

  cast_cone(def, sim) {
    const p = sim.player, from = this.palm('both', 0.85, sim, [0, 0, 0]), f = this.forward(p, []);
    const ey = p.y + EYE;
    for (const k of sim.foes) {
      if (k.dead) continue;
      const dx = k.x - p.x, dy = chestOf(k) - ey, dz = k.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d > def.range + radiusOf(k) || d < 0.01) continue;
      if (Math.acos(clamp((dx * f[0] + dy * f[1] + dz * f[2]) / d, -1, 1)) > def.angle + 0.12) continue;
      if (!sim.world.sees(p.x, ey, p.z, k.x, chestOf(k), k.z)) continue;
      this.hurt(sim, k, def.dmg, def.elem, k.x, chestOf(k), k.z, p.x, p.z, 90, 'puncture');
      const L = Math.hypot(dx, dz) || 1;
      this.shove(k, dx / L * def.force, dz / L * def.force, 3);
    }
    p.trauma = Math.min(1, p.trauma + 0.55);
    const reach = this.trace(sim, from[0], from[1], from[2], f[0], f[1], f[2], def.range);
    sim.event(EV.SPELL_BOOM, def.elem, from[0] + f[0] * reach * 0.6, from[1] + f[1] * reach * 0.6, from[2] + f[2] * reach * 0.6, 2);
    this.burst(FX.BEAM, def.elem, from[0], from[1], from[2], 0.3, 0.5, 0.34, { ax: f[0], ay: f[1], az: f[2], len: reach, extra: Math.tan(def.angle) * reach, alpha: 0.5 });
    // (Its light well out along it: so close to the arms, they'd take all of it.)
    const lit = Math.min(reach * 0.5, 4);
    this.burst(FX.LIGHT, def.elem, from[0] + f[0] * lit, from[1] + f[1] * lit, from[2] + f[2] * lit, 0, 0, 0.34, { light: 26, lightR: 14 });
    // (From each palm, not between them: and small, the blast is for the thing it hits, the player has to see that.)
    for (const side of this.side === 'both' ? ['R', 'L'] : [this.side]) {
      this.palm(side, 0.85, sim, out3);
      this.burst(FX.FLARE, def.elem, out3[0], out3[1], out3[2], 0.1, 0.3, 0.16, { alpha: -0.8 });
    }
    for (let i = 1; i <= 3; i++) {
      const at = reach * i / 3.4;
      this.burst(FX.SHOCK, def.elem, from[0] + f[0] * at, from[1] + f[1] * at, from[2] + f[2] * at, at * 0.25, at * Math.tan(def.angle) * 1.25, 0.2 + i * 0.09, { alpha: 0.5 });
    }
  }

  cast_nova(def, sim) {
    const p = sim.player;
    this.zones.push({ kind: 'nova', def, x: p.x, y: p.y, z: p.z, t: 0, life: 3.4, seed: Math.random(), hit: new Set() });
    p.trauma = Math.min(1, p.trauma + 0.5);
    sim.event(EV.SPELL_BOOM, def.elem, p.x, p.y + 0.6, p.z, 5);
  }

  cast_meteor(def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]), p = sim.player;
    // It comes in over your shoulder, so you can watch it come.
    const L = Math.hypot(c[0] - p.x, c[2] - p.z) || 1;
    const fx = c[0] - (c[0] - p.x) / L * 16 + 7, fz = c[2] - (c[2] - p.z) / L * 16 + 5;
    this.zones.push({ kind: 'meteor', def, x: c[0], y: c[1], z: c[2], fx, fy: c[1] + 46, fz, t: 0, life: def.fall, seed: Math.random() });
  }

  cast_storm(def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'storm', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.duration, tickT: 0, seed: Math.random() });
    sim.event(EV.SPELL_ZONE, def.elem, SPELLS.indexOf(def), c[0], c[1] + 1, c[2], def.duration);
  }

  cast_blink(def, sim) {
    const p = sim.player, s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    const sx = p.x, sy = p.y, sz = p.z;
    // As far as the way is clear, on the level, along where you face.
    let t = def.range;
    for (const h of [0.5, 1.4]) { const b = sim.world.rayBoxes(p.x, p.y + h, p.z, s, 0, c, t); if (b > 0 && b < t) t = b; }
    t = Math.max(0, t - 0.6);
    const seen = new Set();
    const tear = this.foeOn(sim, sx, sy + 1, sz, s, 0, c, t, 0.5, seen);
    let foe = tear;
    while (foe) {
      seen.add(foe.k);
      this.hurt(sim, foe.k, def.dmg, def.elem, foe.k.x, chestOf(foe.k), foe.k.z, sx, sz, 60);
      this.shove(foe.k, -c * 5 * (foe.k.x - sx > 0 ? 1 : -1), s * 5, 2);
      foe = this.foeOn(sim, sx, sy + 1, sz, s, 0, c, t, 0.5, seen);
    }
    p.x += s * t; p.z += c * t;
    out3[0] = p.x; out3[1] = 0; out3[2] = p.z;
    sim.world.resolve(out3, 0.36, p.y + 0.2);
    p.x = out3[0]; p.z = out3[2];
    p.y = Math.max(p.y, sim.world.height(p.x, p.z));
    p.trauma = Math.min(1, p.trauma + 0.3);
    const e = def.elem, ey = EYE - 0.3;
    this.burst(FX.COLUMN, e, sx, sy, sz, 2.6, 2.6, 0.5, { len: 0.8, light: 18, lightR: 8 });
    this.burst(FX.SHOCK, e, sx, sy + ey, sz, 0.3, 2, 0.34);
    this.burst(FX.BEAM, e, sx, sy + ey, sz, 0.1, 0.02, 0.28, { ax: s, ay: 0, az: c, len: t, extra: 0.3 });
    // It leaves you stepping out of a bright split in the air ahead of what you were looking at.
    this.burst(FX.SHOCK, e, p.x + s * 1.2, p.y + EYE, p.z + c * 1.2, 0.2, 2.6, 0.3, { alpha: 0.8, light: 18, lightR: 8 });
    sim.event(EV.SPELL_BOOM, e, sx, sy + 1, sz, 1.2);
    sim.event(EV.SPELL_BOOM, e, p.x, p.y + 1, p.z, 1.2);
  }

  cast_blades(def, sim) {
    this.blades = { def, t: 0, ang: sim.player.yaw, cool: new Map(), elem: def.elem };
  }

  stepBlades(dt, sim) {
    const b = this.blades;
    if (!b) return;
    const def = b.def, p = sim.player;
    b.t += dt;
    if (b.t >= def.duration) { this.blades = null; return; }
    const k = smooth(b.t / 0.5) * smooth((def.duration - b.t) / 1.5);
    b.ang += dt * 3.4;
    const r = def.radius * (0.4 + 0.6 * Math.min(1, b.t / 0.5));
    for (let i = 0; i < def.count; i++) {
      const a = b.ang + i * TAU / def.count, ox = Math.cos(a), oz = Math.sin(a);
      const x = p.x + ox * r, y = p.y + 1.1 + 0.18 * Math.sin(a * 2 + i), z = p.z + oz * r;
      // Up and out, flat to you, cutting edge first.
      let ax = ox * 0.35, ay = 1, az = oz * 0.35;
      const L = 1 / Math.hypot(ax, ay, az);
      ax *= L; ay *= L; az *= L;
      const len = 1.34 * k;
      this.fx(FX.BLADE, b.elem, x - ax * len * 0.5, y - ay * len * 0.5, z - az * len * 0.5, 0.07 * k, ax, ay, az, len, 1, i === 0 ? 6 * k : 0, 7, 0, i * 0.21);
      this.fx(FX.TRAIL, b.elem, x + ax * 0.4, y + ay * 0.4, z + az * 0.4, 0.12 * k, oz, 0, -ox, 0.95, 0.5 * k, 0, 0, 0, i * 0.3);
      if (k < 0.3) continue;
      for (const f of sim.foes) {
        if (f.dead || !f.hostile) continue;
        if (Math.hypot(f.x - x, f.z - z) > radiusOf(f) + 0.45 || Math.abs(f.y + 1 - y) > 1.7) continue;
        const key = f.id * 16 + i, t = b.cool.get(key) || 0;
        if (t > b.t) continue;
        b.cool.set(key, b.t + 0.4);
        this.hurt(sim, f, def.dmg, b.elem, x, y, z, p.x, p.z, 16);
        this.shove(f, (f.x - p.x) / (r + 1) * 2.5 - oz * 1.5, (f.z - p.z) / (r + 1) * 2.5 + ox * 1.5);
      }
    }
  }

  cast_spikes(def, sim) {
    const p = sim.player, s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    const hit = new Set();
    let px = p.x, py = p.y, pz = p.z, made = 0;
    for (let i = 0; i < def.count; i++) {
      const x = p.x + s * (1.5 + i * def.step), z = p.z + c * (1.5 + i * def.step);
      const step = Math.hypot(x - px, z - pz);
      const wall = sim.world.rayBoxes(px, py + 0.6, pz, s, 0, c, step);
      if (wall > 0 && wall < step) break;   // a wall stops it
      const y = sim.world.height(x, z);
      if (y < py - 1.6) break;
      px = x; py = y; pz = z;
      const h = 1.3 + Math.random() * 0.9 + i * 0.04;
      this.spikes.push({ def, x, y, z, t: -i * 0.05, h, s, c, hit, up: false, i, seed: Math.random() });
      made++;
    }
    if (made) p.trauma = Math.min(1, p.trauma + 0.35);
  }

  stepSpikes(dt, sim) {
    if (!this.spikes.length) return;
    const keep = [];
    for (const s of this.spikes) {
      s.t += dt;
      if (s.t < 0) { keep.push(s); continue; }
      if (!s.up) {
        s.up = true;
        sim.event(EV.SPELL_BOOM, s.def.elem, s.x, s.y + 0.1, s.z, 1.1);
        this.burst(FX.RING, s.def.elem, s.x, s.y, s.z, 0.4, 2, 0.36);
        for (const k of sim.foes) {
          if (k.dead || s.hit.has(k) || Math.hypot(k.x - s.x, k.z - s.z) > radiusOf(k) + 0.6 || Math.abs(k.y - s.y) > 1.6) continue;
          s.hit.add(k);
          this.hurt(sim, k, s.def.dmg, s.def.elem, k.x, k.y + 0.8, k.z, s.x, s.z, 70, 'puncture');
          this.shove(k, s.s * 2, s.c * 2, 7.5);
        }
      }
      const rise = smooth(s.t / 0.09), sink = smooth((s.t - 1.9) / 0.6), lift = 1 - rise + sink, sx = -s.c, sz = s.s;
      for (let i = -1; i <= 1; i++) {
        const big = i === 0, h = big ? s.h : s.h * (0.45 + hash(s.seed + i) * 0.25), lean = big ? 0.14 : 0.42;
        const ax = sx * i * lean + (hash(s.seed * 7) - 0.5) * 0.28, az = sz * i * lean + (hash(s.seed * 9) - 0.5) * 0.28, L = 1 / Math.hypot(ax, 1, az);
        const off = big ? 0 : 0.33 * i;
        this.fx(FX.SPIKE, s.def.elem, s.x + sx * off, s.y - h * lift - 0.1, s.z + sz * off, big ? 0.34 : 0.2, ax * L, L, az * L, h + 0.1, 1, big && s.t < 0.2 ? 5 : 0, 5, clamp(s.t / 0.7, 0, 1), s.seed + i * 0.13);
      }
      if (s.t < 2.5) keep.push(s);
    }
    this.spikes = keep;
  }

  stepZones(dt, sim) {
    if (!this.zones.length) return;
    const keep = [];
    for (const z of this.zones) {
      z.t += dt;
      if (this[`zone_${z.kind}`](z, dt, sim) !== false && z.t < z.life) keep.push(z);
    }
    this.zones = keep;
  }

  zone_stuck(z) {
    const q = Math.exp(-z.t * 7) * Math.sin(z.t * 70) * 0.06;
    this.fx(FX.LANCE, ELEM.BONE, z.x, z.y, z.z, 0.06 * smooth((z.life - z.t) / 0.5), z.dx + q, z.dy + q * 0.5, z.dz - q, 1.9, 1, 0, 0, 0, z.seed);
  }

  zone_mend(z, dt, sim) {
    const k = smooth(z.t / 0.2) * smooth((z.life - z.t) / 0.5), p = sim.player, e = z.def.elem;
    this.fx(FX.RUNE, e, p.x, p.y, p.z, 2.1 * smooth(z.t / 0.3), 0, 1, 0, 0, k, 5 * k, 6, 0, z.seed);
    // Motes wind up around you, through the view.
    for (let i = 0; i < 10; i++) {
      const u = (z.t * 0.7 + i / 10) % 1, a = i * 2.4 + z.t * 3.2, r = 0.95 - u * 0.25;
      this.fx(FX.FLARE, e, p.x + Math.cos(a) * r, p.y + 0.1 + u * 2.3, p.z + Math.sin(a) * r, 0.11, 0, 1, 0, 0, k * (1 - u) * 0.9, 0, 0, 0.5, i * 0.1);
    }
  }

  zone_wall(z, dt, sim) {
    const def = z.def, k = smooth(z.t / 0.4) * smooth((z.life - z.t) / 0.7), N = Math.ceil(def.length / 1.05), e = def.elem;
    for (let i = 0; i < N; i++) {
      const o = (i - (N - 1) / 2) * 1.05, x = z.x + z.rx * o, c = z.z + z.rz * o, y = sim.world.height(x, c) - 0.1;
      const edge = 1 - Math.abs(o) / (def.length * 0.62), h = (2.2 + 1.4 * hash(i + z.seed)) * Math.min(1, edge * 2.4 + 0.3);
      this.fx(FX.FLAME, e, x, y, c, h * k, 0, 1, 0, 1.02, 0.95, i % 3 === 1 ? 20 * k : 0, 11, 0, i * 0.37 + z.seed);
    }
    this.fx(FX.DISC, e, z.x, z.y, z.z, def.length * 0.62, 0, 1, 0, 0, 0.75 * k, 0, 0, z.t / z.life, z.seed);
    z.tickT -= dt;
    if (z.tickT > 0 || k < 0.2) return;
    z.tickT = 0.25;
    for (const f of sim.foes) {
      if (f.dead) continue;
      const dx = f.x - z.x, dz = f.z - z.z, along = dx * z.rx + dz * z.rz, off = Math.abs(dx * z.rz - dz * z.rx);
      if (Math.abs(along) > def.length / 2 + 0.4 || off > radiusOf(f) + 0.75) continue;
      this.hurt(sim, f, def.dps * 0.25, e, f.x, chestOf(f), f.z, f.x, f.z, 3);
      const a = this.affOf(f);
      a.burn = Math.max(a.burn, def.burn);
    }
  }

  zone_burning(z, dt, sim) {
    const k = smooth(z.t / 0.2) * smooth((z.life - z.t) / 1.2);
    this.fx(FX.DISC, ELEM.FIRE, z.x, z.y, z.z, z.r, 0, 1, 0, 0, k, 20 * k, z.r * 3, z.t / z.life, z.seed);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.399 + z.seed * 9, r = z.r * (0.25 + 0.6 * hash(i + z.seed));
      const x = z.x + Math.cos(a) * r, c = z.z + Math.sin(a) * r;
      this.fx(FX.FLAME, ELEM.FIRE, x, sim.world.height(x, c) - 0.05, c, (0.9 + hash(i * 2 + z.seed) * 0.9) * k, 0, 1, 0, 0.8, 0.8, 0, 0, 0, i * 0.41 + z.seed);
    }
    z.tickT = (z.tickT || 0) - dt;
    if (z.tickT > 0) return;
    z.tickT = 0.3;
    for (const f of sim.foes) {
      if (f.dead || Math.hypot(f.x - z.x, f.z - z.z) > z.r + radiusOf(f) * 0.5) continue;
      this.hurt(sim, f, 4, ELEM.FIRE, f.x, chestOf(f), f.z, f.x, f.z, 2);
      this.affOf(f).burn = Math.max(this.affOf(f).burn, 2);
    }
  }

  zone_nova(z, dt, sim) {
    const def = z.def, R = def.radius, wave = Math.min(R, z.t * 26), e = def.elem, k = smooth((z.life - z.t) / 1.2);
    if (wave < R) this.fx(FX.RING, e, z.x, z.y, z.z, wave, 0, 1, 0, 0, 1, 22, 16, wave / R * 0.7, z.seed);
    this.fx(FX.DISC, e, z.x, z.y, z.z, wave * 1.04, 0, 1, 0, 0, k, 0, 0, z.t / z.life, z.seed);
    // A wreath of ice bursts up behind the wave.
    for (let i = 0; i < 34; i++) {
      const a = i * 2.399 + z.seed * 6, rr = R * (0.28 + 0.72 * Math.sqrt((i + 0.5) / 34)) * (0.85 + hash(i) * 0.2);
      if (rr > wave) continue;
      const age = z.t - rr / 26, grow = smooth(age / 0.14) * k, ox = Math.cos(a), oz = Math.sin(a);
      const x = z.x + ox * rr, c = z.z + oz * rr, L = (0.5 + hash(i * 3) * 1) * (1.2 - rr / R * 0.5);
      this.fx(FX.ICE, e, x, sim.world.height(x, c) - 0.14, c, 0.17 * L * grow, ox * 0.5, 0.86, oz * 0.5, L * 1.3 * grow, 1, 0, 0, 0, i * 0.17);
    }
    for (const f of sim.foes) {
      if (f.dead || z.hit.has(f)) continue;
      if (Math.hypot(f.x - z.x, f.z - z.z) > wave + radiusOf(f)) continue;
      z.hit.add(f);
      this.hurt(sim, f, def.dmg, e, f.x, chestOf(f), f.z, z.x, z.z, 0);
      this.freezeFor(sim, f, def.freeze);
      sim.event(EV.SPELL_BOOM, e, f.x, chestOf(f), f.z, 1.4);
    }
  }

  zone_meteor(z, dt, sim) {
    const def = z.def, u = clamp(z.t / z.life, 0, 1), f = u * u * (0.6 + 0.4 * u), e = def.elem;
    const x = z.fx + (z.x - z.fx) * f, y = z.fy + (z.y - z.fy) * f, c = z.fz + (z.z - z.fz) * f;
    this.fx(FX.RUNE, e, z.x, z.y, z.z, def.radius * smooth(z.t / 0.25), 0, 1, 0, 0, 0.7 + u * 0.5, 0, 0, u, z.seed);
    let dx = z.x - z.fx, dy = z.y - z.fy, dz = z.z - z.fz;
    const L = 1 / Math.hypot(dx, dy, dz);
    dx *= L; dy *= L; dz *= L;
    this.fx(FX.ROCK, e, x - dx * 1.4, y - dy * 1.4, c - dz * 1.4, 1.5, dx, dy, dz, 2.8, 1, 42, 30, u, z.seed);
    this.fx(FX.ORB, e, x, y, c, 2.9, 0, 1, 0, 0, 0.9, 0, 0, 0, z.seed);
    this.fx(FX.TRAIL, e, x, y, c, 1.85, -dx, -dy, -dz, 15, 1, 0, 0, 0, z.seed);
    if (u < 1) return;
    this.explode(sim, z.x, z.y + 1, z.z, def.radius, def.dmg, e, 10, 6.5);
    this.burst(FX.COLUMN, e, z.x, z.y, z.z, 13, 15, 0.5, { len: def.radius * 0.7, alpha: 0.8 });
    sim.player.trauma = Math.min(1, sim.player.trauma + 0.5);
    this.zones.push({ kind: 'burning', x: z.x, y: z.y, z: z.z, r: def.radius * 0.8, t: 0, life: 7, seed: z.seed });
    return false;
  }

  zone_storm(z, dt, sim) {
    const def = z.def, R = def.radius, k = smooth(z.t / 0.4) * smooth((z.life - z.t) / 0.8), e = def.elem;
    this.fx(FX.DISC, e, z.x, z.y, z.z, R * 1.04, 0, 1, 0, 0, k, 10 * k, R * 3, z.t / z.life, z.seed);
    this.fx(FX.RUNE, e, z.x, z.y, z.z, R * 1.02, 0, 1, 0, 0, 0.55 * k, 0, 0, 0.9, z.seed);
    const N = 26;
    for (let i = 0; i < N; i++) {
      const phase = z.t * 1.7 + i / N, turn = Math.floor(phase), u = phase - turn, s = i * 7.1 + turn * 3.3;
      const a = hash(s) * TAU, r = R * Math.sqrt(hash(s + 1)), x = z.x + Math.cos(a) * r, c = z.z + Math.sin(a) * r, g = sim.world.height(x, c);
      if (k < 0.5 && hash(s + 2) > k * 2) continue;
      if (u > 0.86) {
        if (i % 2 === 0) this.fx(FX.SHOCK, e, x, g + 0.1, c, 0.2 + (u - 0.86) * 8, 0, 1, 0, 0, 0.8 * (1 - u) * 7, 0, 0, (u - 0.86) * 7, s);
        continue;
      }
      const ff = u / 0.86, y = g + 16 * (1 - ff), lean = 0.18;
      const ax = lean, ay = -1, az = lean * 0.6, L = 1 / Math.hypot(ax, ay, az);
      this.fx(FX.ICE, e, x + (1 - ff) * 3, y, c + (1 - ff) * 1.8, 0.11, ax * L, ay * L, az * L, 1.15, 1, 0, 0, 0, s);
      this.fx(FX.TRAIL, e, x + (1 - ff) * 3, y + 0.1, c + (1 - ff) * 1.8, 0.07, -ax * L, -ay * L, -az * L, 2.2, 0.35, 0, 0, 0, s);
    }
    z.tickT -= dt;
    if (z.tickT > 0 || k < 0.3) return;
    z.tickT = 0.35;
    for (const f of sim.foes) {
      if (f.dead || Math.hypot(f.x - z.x, f.z - z.z) > R + radiusOf(f) * 0.5) continue;
      this.hurt(sim, f, def.dmg, e, f.x, chestOf(f), f.z, f.x, f.z, 3);
      this.affOf(f).slow = Math.max(this.affOf(f).slow, 1.2);
    }
  }

  zone_cloud(z, dt, sim) {
    const def = z.def, k = smooth(z.t / 0.5) * smooth((z.life - z.t) / 1.5), e = def.elem, R = def.radius * (0.5 + 0.5 * smooth(z.t / 1.2));
    this.fx(FX.DISC, e, z.x, z.y, z.z, R * 1.15, 0, 1, 0, 0, k * 0.85, 7 * k, R * 2.4, z.t / z.life, z.seed);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.399 + z.t * (0.1 + hash(i) * 0.1), r = R * Math.sqrt((i + 0.5) / 11);
      const x = z.x + Math.cos(a) * r, c = z.z + Math.sin(a) * r;
      this.fx(FX.PUFF, e, x, sim.world.height(x, c) + 0.55 + hash(i * 3) * 0.7, c, 1.5 + hash(i * 2) * 0.9, 0, 1, 0, 0, 0.62 * k, 0, 0, 0, i * 0.23 + z.seed);
    }
    z.tickT -= dt;
    if (z.tickT > 0 || k < 0.2) return;
    z.tickT = 0.5;
    for (const f of sim.foes) {
      if (f.dead || Math.hypot(f.x - z.x, f.z - z.z) > R + radiusOf(f) * 0.5) continue;
      this.hurt(sim, f, def.dps * 0.5, e, f.x, chestOf(f), f.z, f.x, f.z, 2);
      const a = this.affOf(f);
      if (!def.staff) a.rot = Math.max(a.rot, 1.6);
      a.slow = Math.max(a.slow, 1.2);
    }
  }

  zone_well(z, dt, sim) {
    const def = z.def, k = smooth(z.t / 0.3), e = def.elem, c = z.y, pulse = 1 + 0.08 * Math.sin(z.t * 18);
    this.fx(FX.VORTEX, e, z.x, c, z.z, 2.6 * k * pulse, 0, 1, 0, 0, 1, 18 * k, 13, 0, z.seed);
    this.fx(FX.RUNE, e, z.x, sim.world.height(z.x, z.z), z.z, def.radius * k, 0, 1, 0, 0, 0.5 * k, 0, 0, 0.8, z.seed);
    for (const f of sim.foes) {
      if (f.dead && f.kind >= 2) continue;
      const dx = z.x - f.x, dz = z.z - f.z, d = Math.hypot(dx, dz);
      if (d > def.radius || d < 0.6) continue;
      const a = (46 * (1 - d / def.radius) + 8) * dt;
      this.shove(f, dx / d * a, dz / d * a);
      if (!f.dead) { const af = this.affOf(f); af.slow = Math.max(af.slow, 0.3); }
    }
    if (z.t < z.life) return;
    this.explode(sim, z.x, c, z.z, 5.5, def.dmg, e, 13, 5);
    this.burst(FX.SHOCK, e, z.x, c, z.z, 1, 9, 0.5, { alpha: 1.2, light: 40, lightR: 20 });
    return false;
  }

  // ---- what's held ----

  channel(def, dt, sim, first) {
    this[`hold_${def.cast}`](def, dt, sim, first);
  }

  hold_beam(def, dt, sim) {
    const from = this.palm('both', 0.85, sim, [0, 0, 0]), to = [0, 0, 0];
    const p = sim.player;
    this.aim(sim, def.range, to);
    let dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    const L = 1 / (Math.hypot(dx, dy, dz) || 1);
    dx *= L; dy *= L; dz *= L;
    let t = this.trace(sim, from[0], from[1], from[2], dx, dy, dz, def.range);
    const foe = this.foeOn(sim, from[0], from[1], from[2], dx, dy, dz, t, 0.3);
    if (foe) t = foe.t;
    const x = from[0] + dx * t, y = from[1] + dy * t, z = from[2] + dz * t;
    const wide = 0.2 + t * 0.055 + 0.03 * Math.sin(this.held * 24);
    // One out of each palm, to where they both land. (The aim is between them; the light is out at the far end.)
    for (const side of this.side === 'both' ? ['R', 'L'] : [this.side]) {
      this.palm(side, 0.85, sim, out3);
      const bx = x - out3[0], by = y - out3[1], bz = z - out3[2], len = Math.hypot(bx, by, bz) || 1, seed = side === 'R' ? 0 : 0.23;
      this.fx(FX.BEAM, def.elem, out3[0], out3[1], out3[2], 0.1, bx / len, by / len, bz / len, len, 1, 0, 0, 0, 0.41 + seed, wide * 0.7);
      this.fx(FX.BEAM, def.elem, out3[0], out3[1], out3[2], 0.04, bx / len, by / len, bz / len, len, 1, 0, 0, 0, 0.77 + seed, wide * 0.3);
    }
    this.fx(FX.ORB, def.elem, x, y, z, 0.8 + wide, 0, 1, 0, 0, 1, 24, 10, 0, 0.13);
    this.fx(FX.FLAME, def.elem, x, sim.world.height(x, z), z, foe ? 0.3 : 1.2, 0, 1, 0, 0.9, 0.8, 0, 0, 0, 0.31);
    this.tickT -= dt;
    if (this.tickT > 0) return;
    this.tickT = TICK;
    if (foe) {
      this.hurt(sim, foe.k, def.dmg, def.elem, x, y, z, p.x, p.z, 7);
      this.affOf(foe.k).burn = Math.max(this.affOf(foe.k).burn, def.burn);
    }
    sim.event(EV.SPELL_BOOM, def.elem, x, y, z, 0.35);
  }

  hold_chain(def, dt, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]), p = sim.player, e = def.elem;
    const seedT = Math.floor(this.held * 20) * 0.37;
    let k = this.lockOn(sim, def.range, 0.38);
    const bite = (this.tickT -= dt) <= 0;
    if (bite) this.tickT = TICK;
    let x = from[0], y = from[1], z = from[2];
    if (!k) {
      const to = [0, 0, 0];
      this.aim(sim, def.range * 0.7, to);
      const d = Math.hypot(to[0] - x, to[1] - y, to[2] - z) || 1;
      this.fx(FX.BOLT, e, x, y, z, 0.42, (to[0] - x) / d, (to[1] - y) / d, (to[2] - z) / d, d, 1, 20, 12, 0, seedT, 1);
      this.fx(FX.FLARE, e, to[0], to[1], to[2], 0.5, 0, 1, 0, 0, 1, 0, 0, 0.5, seedT);
      return;
    }
    const seen = new Set();
    for (let i = 0; i <= def.jumps && k; i++) {
      seen.add(k);
      const c = chestOf(k), d = Math.hypot(k.x - x, c - y, k.z - z) || 1;
      this.fx(FX.BOLT, e, x, y, z, 0.48, (k.x - x) / d, (c - y) / d, (k.z - z) / d, d, 1, i < 3 ? 18 : 0, 10, 0, seedT + i, 1.05);
      this.fx(FX.BOLT, e, x, y, z, 0.3, (k.x - x) / d, (c - y) / d, (k.z - z) / d, d, 0.65, 0, 0, 0, seedT * 1.7 + i + 0.5, 0.8);
      this.fx(FX.FLARE, e, k.x, c, k.z, 0.9, 0, 1, 0, 0, 1, 0, 0, 0.5, seedT);
      if (bite) this.hurt(sim, k, def.dmg * (1 - i * 0.1), e, k.x, c, k.z, p.x, p.z, 7);
      x = k.x; y = c; z = k.z;
      k = this.nearestFoe(sim, x, y, z, def.reach, seen);
    }
  }

  hold_drain(def, dt, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]), p = sim.player, e = def.elem;
    const k = this.lockOn(sim, def.range, 0.6);
    if (!k) return;
    const c = chestOf(k), d = Math.hypot(k.x - from[0], c - from[1], k.z - from[2]) || 1;
    const ax = (k.x - from[0]) / d, ay = (c - from[1]) / d, az = (k.z - from[2]) / d;
    this.fx(FX.BOLT, e, from[0], from[1], from[2], 0.5, ax, ay, az, d, 1, 12, 9, 0, Math.floor(this.held * 7) * 0.31, 0.32);
    this.fx(FX.BEAM, e, from[0], from[1], from[2], 0.03, ax, ay, az, d, 0.8, 0, 0, 0, 0.2, 0.06);
    this.fx(FX.ORB, e, k.x, c, k.z, 0.5 + 0.08 * Math.sin(this.held * 19), 0, 1, 0, 0, 0.9, 0, 0, 0, 0.71);
    // Beads of it run back along the thread.
    for (let i = 0; i < 6; i++) {
      const u = 1 - ((this.held * 0.8 + i / 6) % 1), wob = Math.sin(this.held * 7 + i * 2) * 0.05;
      this.fx(FX.ORB, e, from[0] + ax * d * u + wob, from[1] + ay * d * u + wob, from[2] + az * d * u, 0.1, 0, 1, 0, 0, 1, 0, 0, 0, i * 0.3);
    }
    this.tickT -= dt;
    if (this.tickT > 0) return;
    this.tickT = TICK;
    // (What it drinks is what it took: a knight's board or the Hydra's bone gives back less.)
    const before = k.hp;
    this.hurt(sim, k, def.dmg, e, k.x, c, k.z, p.x, p.z, 5);
    p.hp = Math.min(p.maxHp, p.hp + Math.max(0, before - k.hp) * def.heal / (SPELL_BITE * this.power || 1) * Math.min(this.power, 1.6));
  }

  waiting() { let n = 0; for (const m of this.missiles) if (m.state !== 'seek') n++; return n; }

  summon(def, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]);
    let slot = 0;
    const used = new Set(this.missiles.map((m) => m.slot));
    while (used.has(slot)) slot++;
    this.missiles.push({ def, x: from[0], y: from[1], z: from[2], vx: 0, vy: 0, vz: 0, state: 'hover', slot, age: 0, hoverT: 0, target: null, seed: Math.random() });
  }

  hold_swarm(def, dt, sim, first) {
    if (first) { for (let i = 0; i < def.volley; i++) this.summon(def, sim); this.summonT = 0; }
    this.summonT += dt;
    while (this.summonT > def.every) {
      this.summonT -= def.every;
      if (this.waiting() < def.max) this.summon(def, sim);
    }
  }

  // A place in the fan held up in front of you, above the line of sight so as not to hide what you're looking at.
  slot(i, p, out) {
    const row = Math.floor(i / 8), col = i % 8;
    const theta = p.yaw + (col - 3.5) * (0.26 - row * 0.02), r = 1.75 + row * 0.26, bob = Math.sin(i * 1.7 + p.t0 * 2.4) * 0.03;
    out[0] = p.x + Math.sin(theta) * r;
    out[1] = p.y + EYE + 0.55 + row * 0.34 - Math.abs(col - 3.5) * 0.05 + Math.sin(p.pitch) * r + bob;
    out[2] = p.z + Math.cos(theta) * r;
    return out;
  }

  stepMissiles(dt, sim) {
    if (!this.missiles.length) return;
    const p = sim.player, keep = [];
    p.t0 = sim.time;
    this.launchT -= dt;
    if (this.launchT <= 0) {
      let m = null;
      for (const o of this.missiles) if (o.state === 'hover' && (!m || o.hoverT > m.hoverT)) m = o;
      if (m) {
        const foe = this.lockOn(sim, 60, 1.1) || this.nearestFoe(sim, m.x, m.y, m.z, 40);
        // Nothing to hunt for long, it goes where you look.
        if (foe || (m.hoverT > 8 && this.state !== 'hold')) {
          m.state = 'seek'; m.target = foe; m.age = 0;
          const to = [0, 0, 0];
          if (foe) { to[0] = foe.x; to[1] = chestOf(foe); to[2] = foe.z; } else this.aim(sim, 60, to);
          const d = Math.hypot(to[0] - m.x, to[1] - m.y, to[2] - m.z) || 1;
          m.vx = (to[0] - m.x) / d * 7; m.vy = (to[1] - m.y) / d * 7; m.vz = (to[2] - m.z) / d * 7;
          this.launchT = m.def.interval;
          sim.event(EV.SPELL_LOOSE, m.def.elem, 6, m.x, m.y, m.z);
        }
      }
    }
    for (const m of this.missiles) {
      m.age += dt;
      const e = m.def.elem;
      if (m.state !== 'seek') {
        this.slot(m.slot, p, out3);
        const K = 14;
        m.vx = (m.vx + (out3[0] - m.x) * K * K * dt) * Math.max(0, 1 - 2 * K * dt * 0.9);
        m.vy = (m.vy + (out3[1] - m.y) * K * K * dt) * Math.max(0, 1 - 2 * K * dt * 0.9);
        m.vz = (m.vz + (out3[2] - m.z) * K * K * dt) * Math.max(0, 1 - 2 * K * dt * 0.9);
        m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
        m.hoverT += dt;
        this.fx(FX.ORB, e, m.x, m.y, m.z, 0.1, 0, 1, 0, 0, 1, m.slot % 6 === 0 ? 7 : 0, 7, 0, m.seed);
        this.fx(FX.FLARE, e, m.x, m.y, m.z, 0.24, 0, 1, 0, 0, 0.6, 0, 0, 0.5, m.seed);
        keep.push(m);
        continue;
      }
      if (m.target && m.target.dead) m.target = this.nearestFoe(sim, m.x, m.y, m.z, 40);
      const sp = Math.min(26, 7 + m.age * 45);
      let dx = m.vx, dy = m.vy, dz = m.vz;
      const L = 1 / (Math.hypot(dx, dy, dz) || 1);
      dx *= L; dy *= L; dz *= L;
      if (m.target) {
        const t = m.target, c = chestOf(t), d = 1 / (Math.hypot(t.x - m.x, c - m.y, t.z - m.z) || 1), bend = Math.min(1, dt * (6 + m.age * 10));
        dx += ((t.x - m.x) * d - dx) * bend; dy += ((c - m.y) * d - dy) * bend; dz += ((t.z - m.z) * d - dz) * bend;
        const N = 1 / (Math.hypot(dx, dy, dz) || 1);
        dx *= N; dy *= N; dz *= N;
      }
      m.vx = dx * sp; m.vy = dy * sp; m.vz = dz * sp;
      const step = sp * dt, end = this.trace(sim, m.x, m.y, m.z, dx, dy, dz, step);
      const foe = this.foeOn(sim, m.x, m.y, m.z, dx, dy, dz, end, 0.08);
      if (foe || end < step - 1e-4 || m.age > 4) {
        const t = foe ? foe.t : end, x = m.x + dx * t, y = m.y + dy * t, z = m.z + dz * t;
        if (foe) this.hurt(sim, foe.k, m.def.dmg, e, x, y, z, m.x, m.z, 10);
        sim.event(EV.SPELL_BOOM, e, x, y, z, 0.5);
        this.burst(FX.FLARE, e, x, y, z, 0.4, 0.9, 0.16, { light: 10, lightR: 6 });
        this.burst(FX.SHOCK, e, x, y, z, 0.1, 0.8, 0.2);
        continue;
      }
      m.x += dx * step; m.y += dy * step; m.z += dz * step;
      this.fx(FX.ORB, e, m.x, m.y, m.z, 0.11, 0, 1, 0, 0, 1, 0, 0, 0, m.seed);
      this.fx(FX.TRAIL, e, m.x, m.y, m.z, 0.09, -dx, -dy, -dz, Math.min(m.age * sp, 1.6), 0.85, 0, 0, 0, m.seed);
      keep.push(m);
    }
    this.missiles = keep;
  }
}

installStaffShots(Casting, { chestOf, radiusOf, hash, smooth, clamp, EYE });
