// The new staffs' shots: twelve kinds, each its own way of hurting, drawn with the spells' own shapes (FX in spells.js). They ride
// Casting's bolts and zones: a bolt's flight is fly_<key>, its landing hit_<key>; a shot that isn't a bolt is loose_<key>; what stays
// in the world is zone_<kind>. dmg and the fields in `scaled` are multiplied by the staff's roll when it fires (Casting.stepStaff).
import { EV } from '../core/layout.js';
import { ELEM, FX } from './spells.js';

const { FIRE, FROST, ARCANE, STORM, LIGHT, DRAIN, BONE, VOID, POISON, SPIRIT } = ELEM;
const TAU = Math.PI * 2;

export const STAFF_SHOTS = {
  sunburst: { key: 'sunburst', elem: LIGHT, mana: 8, speed: 34, size: 0.36, dmg: 36, radius: 2.2, rays: 4, rayDmg: 16, reach: 9, scaled: ['rayDmg'] },
  crescent: { key: 'crescent', elem: SPIRIT, mana: 8, loose: true, speed: 24, size: 0.8, dmg: 26, out: 17 },
  stasis: { key: 'stasis', elem: ARCANE, mana: 12, speed: 26, size: 0.3, dmg: 34, zoneR: 4.2, hold: 2.6 },
  singularity: { key: 'singularity', elem: VOID, mana: 11, speed: 9, size: 0.55, dmg: 58, radius: 2.5, drag: 6.5, pull: 32, life: 2.8 },
  prism: { key: 'prism', elem: FROST, mana: 7, speed: 46, size: 0.24, dmg: 26, beams: 3, beamDmg: 24, reach: 15, fan: 0.55, scaled: ['beamDmg'] },
  leech: { key: 'leech', elem: DRAIN, mana: 8, speed: 32, size: 0.34, dmg: 22, reach: 8, ties: 3, drain: 20, heal: 0.4, hold: 2.2, scaled: ['drain'] },
  wyrm: { key: 'wyrm', elem: FIRE, mana: 10, speed: 19, size: 0.38, dmg: 34, radius: 2.4, turn: 3.2, life: 3.2, seek: 28 },
  phoenix: { key: 'phoenix', elem: FIRE, mana: 12, speed: 23, size: 0.6, dmg: 30, pierce: true, radius: 2.5, ring: 5.5, ringDmg: 55, heal: 6, life: 1.5, scaled: ['ringDmg'] },
  tesla: { key: 'tesla', elem: STORM, mana: 10, speed: 30, size: 0.32, dmg: 8, reach: 7, hold: 3, every: 0.45 },
  souls: { key: 'souls', elem: BONE, mana: 9, loose: true, speed: 15, size: 0.17, dmg: 17, count: 5, reach: 22, life: 3.5 },
  thorns: { key: 'thorns', elem: POISON, mana: 8, speed: 46, size: 0.2, dmg: 11, shards: 5, spread: 0.075, bleed: 3 },
  starfall: { key: 'starfall', elem: ARCANE, mana: 12, loose: true, dmg: 30, radius: 2.2, count: 6, range: 55, spread: 2.6, delay: 0.3 },
  // Seraph's Coil's alone: a sword of light called down where you look, that blinds what it doesn't kill.
  judgement: { key: 'judgement', elem: LIGHT, mana: 13, loose: true, dmg: 70, radius: 3.4, range: 60, delay: 0.45, daze: 1.2 },
};

// The legendaries fire a grander kind of what lesser staffs fire, so each is its own the moment it's loosed.
export const STAFF_GRAND = {
  sunbanner_staff: { rays: 8, rayDmg: 22, radius: 3, reach: 12, size: 0.42 },
  shroud_of_the_lich: { count: 9, dmg: 19, life: 4.5 },
  wyrmcoil_staff: { shards: 2, spread: 0.16, dmg: 30 },
  celestial_orrery: { count: 11, spread: 3.4 },
  eye_of_the_maelstrom: { dmg: 72, pull: 40, drag: 8, size: 0.7 },
};

// helpers: chestOf, radiusOf, hash, smooth, clamp from casting.js.
export function installStaffShots(Casting, { chestOf, radiusOf, hash, smooth, clamp, EYE }) {
  const P = Casting.prototype;
  const foes = (sim) => sim.foes.filter((k) => !k.dead && k.hostile);

  // ---- Sunburst: a mote of the sun. Where it lands, a pillar of light, and rays to the nearest. ----
  P.fly_sunburst = function (b, dx, dy, dz, sp) {
    const flown = b.age * sp;
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size, 0, 1, 0, 0, 1, 16, 12, 0, b.seed);
    this.fx(FX.FLARE, b.elem, b.x, b.y, b.z, b.size * 2.2 * smooth(b.age / 0.3), 0, 1, 0, 0, 0.45, 0, 0, 0.5, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.6, -dx, -dy, -dz, Math.min(flown, 2.2), 0.8, 0, 0, 0, b.seed);
  };
  P.hit_sunburst = function (b, sim) {
    const { x, y, z, def, elem } = b;
    this.explode(sim, x, y, z, def.radius, def.dmg, elem, 4);
    const g = sim.world.height(x, z);
    this.burst(FX.COLUMN, elem, x, g, z, 0.9, 1.6, 0.6, { len: 1.2, light: 22, lightR: 9 });
    this.burst(FX.SHOCK, elem, x, y, z, 0.3, 2.6, 0.32);
    const seen = new Set();
    for (let i = 0; i < def.rays; i++) {
      const k = this.nearestFoe(sim, x, y, z, def.reach, seen);
      if (!k) break;
      seen.add(k);
      const c = chestOf(k), L = Math.hypot(k.x - x, c - y, k.z - z) || 1;
      this.hurt(sim, k, def.rayDmg, elem, k.x, c, k.z, x, z, 10);
      this.burst(FX.BEAM, elem, x, y, z, 0.08, 0.02, 0.35, { ax: (k.x - x) / L, ay: (c - y) / L, az: (k.z - z) / L, len: L, extra: 0.08, light: 6, lightR: 4 });
      this.burst(FX.FLARE, elem, k.x, c, k.z, 0.2, 0.9, 0.25);
    }
  };

  // ---- Crescent: a spinning moon that cuts out and comes back. ----
  P.loose_crescent = function (def, sim, from) {
    const aim = [0, 0, 0];
    this.aim(sim, def.out, aim);
    let dx = aim[0] - from[0], dy = aim[1] - from[1], dz = aim[2] - from[2];
    const L = Math.hypot(dx, dy, dz) || 1;
    this.zones.push({ kind: 'crescent', def, x: from[0], y: from[1], z: from[2], dx: dx / L, dy: dy / L, dz: dz / L, t: 0, life: 4, back: false, gone: 0, hit: new Set(), seed: Math.random() });
    this.burst(FX.FLARE, def.elem, from[0], from[1], from[2], 0.09, 0.3, 0.14, { alpha: -0.55 });
  };
  P.zone_crescent = function (z, dt, sim) {
    const def = z.def, e = def.elem, p = sim.player;
    let dx = z.dx, dy = z.dy, dz = z.dz;
    if (z.back) {
      // Home to the hand.
      const tx = p.x, ty = p.y + EYE - 0.3, tz = p.z, L = Math.hypot(tx - z.x, ty - z.y, tz - z.z);
      if (L < 0.9) { this.burst(FX.FLARE, e, z.x, z.y, z.z, 0.2, 0.5, 0.15, { alpha: -0.6 }); return false; }
      dx = (tx - z.x) / L; dy = (ty - z.y) / L; dz = (tz - z.z) / L;
    }
    const sp = def.speed * (z.back ? 1.25 : 1 - 0.55 * smooth(z.gone / def.out)), step = sp * dt;
    const end = z.back ? step : this.trace(sim, z.x, z.y, z.z, dx, dy, dz, step);
    z.x += dx * end; z.y += dy * end; z.z += dz * end; z.gone += end;
    if (!z.back && (end < step - 1e-4 || z.gone >= def.out)) { z.back = true; z.hit.clear(); sim.event(EV.SPELL_BOOM, e, z.x, z.y, z.z, 0.4); }
    for (const k of foes(sim)) {
      if (z.hit.has(k) || Math.hypot(k.x - z.x, k.z - z.z) > radiusOf(k) + def.size || Math.abs(chestOf(k) - z.y) > 1.2) continue;
      z.hit.add(k);
      this.hurt(sim, k, def.dmg, e, z.x, z.y, z.z, z.x - dx, z.z - dz, 20);
      this.shove(k, dx * 2, dz * 2);
      this.burst(FX.SHOCK, e, z.x, z.y, z.z, 0.15, 1, 0.2);
    }
    // A crescent: three blades round an arc, the whole turning fast, flat to the way it flies.
    const spin = z.t * 22, s = def.size, ux = -dz, uz = dx;
    for (let i = 0; i < 3; i++) {
      const a = spin + i * 0.55, ca = Math.cos(a), sa = Math.sin(a);
      const ox = ux * ca, oy = sa, oz = uz * ca;
      this.fx(FX.BLADE, e, z.x + ox * s * 0.55, z.y + oy * s * 0.55, z.z + oz * s * 0.55, 0.05, -oy * ux + 0, ca, -oy * uz, s * 0.7, 1, i === 1 ? 9 : 0, 6, 0, z.seed + i * 0.2);
    }
    this.fx(FX.RING, e, z.x, z.y, z.z, s * 0.75, dy * 0 + ux * 0, 0, 0, 0, 0.35, 0, 0, 0.2, z.seed);
    this.fx(FX.TRAIL, e, z.x, z.y, z.z, s * 0.5, -dx, -dy, -dz, 2.6, 0.85, 0, 0, 0, z.seed);
  };

  // ---- Stasis: a sphere where time stops. What's inside hangs there, takes half again from everything, then pays at once. ----
  P.fly_stasis = function (b, dx, dy, dz, sp) {
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size, 0, 1, 0, 0, 1, 12, 8, 0, b.seed);
    this.fx(FX.RING, b.elem, b.x, b.y, b.z, b.size * 1.6 * smooth(b.age / 0.3), dx, dy, dz, 0, 0.7, 0, 0, b.age * 2, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.5, -dx, -dy, -dz, Math.min(b.age * sp, 1.5), 0.6, 0, 0, 0, b.seed);
    // A clock face turning backwards round it, so it reads as time and not as one more orb.
    this.fx(FX.RUNE, b.elem, b.x, b.y, b.z, b.size * 2.4 * smooth(b.age / 0.3), dx, dy, dz, 0, 0.85, 0, 0, -b.age * 0.8, b.seed);
  };
  P.hit_stasis = function (b, sim) {
    const { x, y, z, def, elem } = b, g = sim.world.height(x, z);
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 1.2);
    this.burst(FX.SHOCK, elem, x, y, z, 0.3, def.zoneR, 0.35, { light: 14, lightR: 9 });
    this.zones.push({ kind: 'stasis', def, x, y: Math.max(y, g + 1), z, g, t: 0, life: def.hold, held: new Set(), seed: b.seed });
  };
  P.zone_stasis = function (z, dt, sim) {
    const def = z.def, e = def.elem, R = def.zoneR, open = smooth(z.t / 0.25), k = open * smooth((z.life - z.t) / 0.2);
    // (Held by the one rule every hold goes by, Casting.holdFor: once, as it's caught, for what's left of the sphere's time;
    // less for the great ones and for what was held a moment ago. Hung in time, not frozen: no half again from the blows.)
    if (!z.echoed) for (const f of foes(sim)) {
      if (Math.hypot(f.x - z.x, chestOf(f) - z.y, f.z - z.z) > R + radiusOf(f) * 0.5) continue;
      if (!z.held.has(f)) { z.held.add(f); this.holdFor(sim, f, z.life - z.t, false, true); }
      const a = this.affOf(f);
      if (a.stun > 0) { a.vx = 0; a.vz = 0; }
    }
    this.fx(FX.ORB, e, z.x, z.y, z.z, R * k, 0, 1, 0, 0, 0.13 * k, 10 * k, R * 2.5, 0, z.seed);
    this.fx(FX.RUNE, e, z.x, z.g + 0.05, z.z, R * 1.05, 0, 1, 0, 0, 0.8 * k, 0, 0, z.t / z.life, z.seed);
    // The hands of a clock round its rim, going backwards.
    for (let i = 0; i < 2; i++) {
      const a = -z.t * (i ? 0.9 : 5) + z.seed * 9, L = R * (i ? 0.55 : 0.85);
      this.fx(FX.BEAM, e, z.x, z.y, z.z, 0.04, Math.cos(a), 0, Math.sin(a), L * k, 0.8, 0, 0, 0, z.seed + i, 0.04);
    }
    this.fx(FX.RING, e, z.x, z.y, z.z, R * k, 0, 1, 0, 0, 0.5, 0, 0, z.t, z.seed);
    if (z.t + dt < z.life) return;
    // Time comes back all at once.
    for (const f of z.held) if (!f.dead) {
      this.hurt(sim, f, def.dmg, e, f.x, chestOf(f), f.z, z.x, z.z, 40);
      this.burst(FX.SHOCK, e, f.x, chestOf(f), f.z, 0.2, 1.4, 0.3);
    }
    sim.event(EV.SPELL_BOOM, e, z.x, z.y, z.z, 2);
    this.burst(FX.SHOCK, e, z.x, z.y, z.z, R, 0.3, 0.3, { alpha: 0.8, light: 20, lightR: 10 });
    // (The spell's Temporal Echo: a second after time comes back, it comes back again.)
    if (def.echo && !z.echoed) { this.zones.push({ ...z, def: { ...def, dmg: def.dmg * def.echo, zoneR: 0.01, hold: 1 }, t: 0, life: 1, echoed: true }); }
    return false;
  };

  // ---- Singularity: a black star, slow, dragging everything it passes along behind it. ----
  P.fly_singularity = function (b, dx, dy, dz, sp, dt, sim) {
    const def = b.def;
    for (const k of foes(sim)) {
      const ox = b.x - k.x, oz = b.z - k.z, d = Math.hypot(ox, oz) || 1;
      if (d > def.drag + radiusOf(k)) continue;
      const pull = def.pull * (1 - d / (def.drag + radiusOf(k))) * dt;
      this.shove(k, ox / d * pull + b.vx * dt * 2, oz / d * pull + b.vz * dt * 2);
    }
    // It grows as it leaves the head: at full size it would fill the eye.
    const g = smooth(b.age / 0.45);
    this.fx(FX.VORTEX, b.elem, b.x, b.y, b.z, b.size * 2.2 * g, 0, 1, 0, 0, 0.9, 0, 0, 0, b.seed);
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size * (0.3 + 0.7 * g) * (0.9 + 0.1 * Math.sin(b.age * 17)), 0, 1, 0, 0, 1, 6 * g, 8, 0, b.seed);
    this.fx(FX.RING, b.elem, b.x, b.y, b.z, def.drag * (0.25 + 0.1 * Math.sin(b.age * 6)) * g, 0, 1, 0, 0, 0.25 * g, 0, 0, b.age, b.seed);
  };
  P.hit_singularity = function (b, sim) {
    const { x, y, z, def, elem } = b;
    for (const k of foes(sim)) {
      const ox = x - k.x, oz = z - k.z, d = Math.hypot(ox, oz) || 1;
      if (d < def.drag) this.shove(k, ox / d * 9, oz / d * 9, 2);
    }
    this.explode(sim, x, y, z, def.radius, def.dmg, elem, -3, 1);
    this.burst(FX.VORTEX, elem, x, y, z, def.drag * 0.6, 0.05, 0.45, { light: 18, lightR: 9 });
    this.burst(FX.SHOCK, elem, x, y, z, def.drag, 0.2, 0.35, { alpha: 0.7 });
  };

  // ---- Prism: a crystal that splits on what it strikes into three beams running on. ----
  P.fly_prism = function (b, dx, dy, dz, sp) {
    this.fx(FX.ICE, b.elem, b.x - dx * 0.5, b.y - dy * 0.5, b.z - dz * 0.5, 0.1, dx, dy, dz, 0.8, 1, 6, 5, 0, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, 0.09, -dx, -dy, -dz, Math.min(b.age * sp, 2.4), 0.7, 0, 0, 0, b.seed);
  };
  P.hit_prism = function (b, sim, foe, dx, dy, dz, struck) {
    const { x, y, z, def, elem } = b;
    if (foe) this.hurt(sim, foe, def.dmg, elem, x, y, z, x - dx, z - dz, 18);
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.9);
    this.burst(FX.FLARE, elem, x, y, z, 0.3, 1.1, 0.2, { light: 12, lightR: 6 });
    // On through a body; back off a wall, as light off glass.
    let fx = dx, fz = dz;
    if (!foe && struck) { fx = -dx; fz = -dz; }
    const L = Math.hypot(fx, fz) || 1;
    fx /= L; fz /= L;
    for (let i = 0; i < def.beams; i++) {
      const a = (i - (def.beams - 1) / 2) * def.fan, c = Math.cos(a), s = Math.sin(a);
      const ax = fx * c - fz * s, az = fx * s + fz * c;
      const ox = x + ax * 0.3, oz = z + az * 0.3;
      const reach = this.trace(sim, ox, y, oz, ax, 0, az, def.reach), seen = new Set(foe ? [foe] : []);
      let hit = this.foeOn(sim, ox, y, oz, ax, 0, az, reach, 0.25, seen);
      while (hit) {
        seen.add(hit.k);
        if (hit.k.hostile) { this.hurt(sim, hit.k, def.beamDmg, elem, ox + ax * hit.t, y, oz + az * hit.t, ox, oz, 12, 'puncture'); if (def.beamChill) this.affOf(hit.k).slow = Math.max(this.affOf(hit.k).slow, def.beamChill); }
        hit = this.foeOn(sim, ox, y, oz, ax, 0, az, reach, 0.25, seen);
      }
      this.burst(FX.BEAM, elem, ox, y, oz, 0.09, 0.02, 0.6, { ax, ay: 0, az, len: reach, extra: 0.06, light: 5, lightR: 4 });
    }
  };

  // ---- Leech: a drop of blood that bursts in threads; they fasten on and drink. ----
  P.fly_leech = function (b, dx, dy, dz, sp) {
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size * (1 + 0.2 * Math.sin(b.age * 25)), 0, 1, 0, 0, 1, 10, 7, 0, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.6, -dx, -dy, -dz, Math.min(b.age * sp, 1.6), 0.8, 0, 0, 0, b.seed);
  };
  P.hit_leech = function (b, sim, foe) {
    const { x, y, z, def, elem } = b, seen = new Set(), ties = [];
    if (foe) { ties.push({ k: foe, seed: Math.random() }); seen.add(foe); }
    while (ties.length < def.ties) {
      const k = this.nearestFoe(sim, x, y, z, def.reach, seen);
      if (!k) break;
      seen.add(k); ties.push({ k, seed: Math.random() });
    }
    if (foe) this.hurt(sim, foe, def.dmg, elem, x, y, z, x, z, 14);
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.8);
    this.burst(FX.SHOCK, elem, x, y, z, 0.2, 1.4, 0.25, { light: 10, lightR: 6 });
    if (ties.length) this.zones.push({ kind: 'leech', def, x, y, z, t: 0, life: def.hold, ties, tickT: 0, seed: b.seed });
  };
  P.zone_leech = function (z, dt, sim) {
    const def = z.def, e = def.elem, p = sim.player, fade = 1 - smooth((z.t - z.life + 0.3) / 0.3);
    z.tickT -= dt;
    const bite = z.tickT <= 0;
    if (bite) z.tickT = 0.25;
    let alive = 0;
    const hand = [p.x, p.y + EYE - 0.4, p.z];
    for (const t of z.ties) {
      const k = t.k;
      if (k.dead) continue;
      alive++;
      const c = chestOf(k);
      if (bite) {
        const before = k.hp;
        this.hurt(sim, k, def.drain * 0.25 / def.hold, e, k.x, c, k.z, k.x, k.z, 0);
        p.hp = Math.min(p.maxHp, p.hp + Math.max(0, before - k.hp) * def.heal);
      }
      this.drawVine(e, k.x, c, k.z, hand[0], hand[1], hand[2], t.seed, z.t, fade * 0.8);
      if (bite) this.burst(FX.ORB, e, k.x, c, k.z, 0.12, 0.02, 0.3);
    }
    if (!alive) return false;
  };

  // ---- Wyrm: a serpent of fire, weaving, that finds its own way to a foe and leaves the ground alight. ----
  P.fly_wyrm = function (b, dx, dy, dz, sp, dt, sim) {
    const def = b.def;
    // Steer for the nearest foe ahead of it.
    const k = this.nearestFoe(sim, b.x, b.y, b.z, def.seek);
    if (k) {
      const tx = k.x - b.x, ty = chestOf(k) - b.y, tz = k.z - b.z, L = Math.hypot(tx, ty, tz) || 1;
      if ((tx * dx + ty * dy + tz * dz) / L > -0.2) {
        const t = Math.min(1, def.turn * dt);
        let nx = dx + (tx / L - dx) * t, ny = dy + (ty / L - dy) * t, nz = dz + (tz / L - dz) * t;
        const n = Math.hypot(nx, ny, nz) || 1;
        b.vx = nx / n * sp; b.vy = ny / n * sp; b.vz = nz / n * sp;
      }
    }
    // Its body: where its head has been, swaying side to side.
    (b.hist ||= []).unshift([b.x, b.y, b.z]);
    if (b.hist.length > 14) b.hist.pop();
    const sx = -dz, sz = dx;
    b.hist.forEach((h, i) => {
      const w = Math.sin(b.age * 14 - i * 0.7) * 0.18 * Math.min(1, i / 3), s = b.size * (1 - i / 16) * (0.35 + 0.65 * smooth(b.age / 0.35));
      this.fx(FX.ORB, b.elem, h[0] + sx * w, h[1] + Math.cos(b.age * 9 - i) * 0.06, h[2] + sz * w, s, 0, 1, 0, 0, 1, i === 0 ? 18 * smooth(b.age / 0.35) : 0, i === 0 ? 10 : 0, 0, b.seed + i * 0.07);
    });
    this.fx(FX.FLAME, b.elem, b.x + dx * 0.2, b.y, b.z + dz * 0.2, b.size * 1.4 * smooth(b.age / 0.35), dx, dy, dz, 0.6, 0.9, 0, 0, 0, b.seed);
  };
  P.hit_wyrm = function (b, sim) {
    const { x, y, z, def, elem } = b, g = sim.world.height(x, z);
    this.explode(sim, x, y, z, def.radius, def.dmg, elem, 6);
    this.burst(FX.FLAME, elem, x, g, z, 0.6, 2.2, 0.5, { light: 20, lightR: 9 });
    if (y - g < 2.5) this.zones.push({ kind: 'burning', x, y: g, z, r: def.radius * 0.7, t: 0, life: 2.5, seed: b.seed });
  };

  // ---- Phoenix: a firebird through everything in its way, that dies in a ring of flame and mends you. ----
  P.fly_phoenix = function (b, dx, dy, dz, sp) {
    // It dies a moment after it first goes through someone, among them, not far off past them.
    if (b.through?.size) { b.firstT ??= b.age; if (b.age - b.firstT > 0.18) b.maxAge = b.age; }
    const flap = Math.sin(b.age * 16), ux = -dz, uz = dx, s = b.size * (0.25 + 0.75 * smooth(b.age / 0.35));
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, s * 0.5, 0, 1, 0, 0, 1, 24, 12, 0, b.seed);
    for (const side of [-1, 1]) {
      const ax = ux * side, ay = 0.35 + flap * 0.5, az = uz * side, L = Math.hypot(ax, ay, az);
      this.fx(FX.FLAME, b.elem, b.x, b.y, b.z, s * 0.9, ax / L, ay / L, az / L, s * 2.2, 0.95, 0, 0, 0, b.seed + side);
    }
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, s * 0.45, -dx, -dy, -dz, Math.min(b.age * sp, 3.5), 0.9, 0, 0, 0, b.seed);
  };
  P.hit_phoenix = function (b, sim) {
    const { x, y, z, def, elem } = b, p = sim.player, g = sim.world.height(x, z);
    this.explode(sim, x, y, z, def.ring, def.ringDmg, elem, 8, 2);
    this.burst(FX.RING, elem, x, Math.max(g + 0.1, y - 0.6), z, 0.5, def.ring, 0.55, { light: 30, lightR: 14 });
    this.burst(FX.FLAME, elem, x, y, z, 0.8, 3, 0.5);
    p.hp = Math.min(p.maxHp, p.hp + def.heal);
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 2.4);
  };

  // ---- Tesla: a spark that sticks where it lands and lashes everyone near. ----
  P.fly_tesla = function (b, dx, dy, dz, sp) {
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size * (0.85 + 0.3 * hash(b.age * 40)), 0, 1, 0, 0, 1, 16, 9, 0, b.seed);
    for (let i = 0; i < 3; i++) {
      const a = hash(b.seed + i + Math.floor(b.age * 14)) * TAU, e = hash(i * 5.1 + Math.floor(b.age * 12)) * 2 - 1, r = (1 - e * e) ** 0.5;
      this.fx(FX.BOLT, b.elem, b.x, b.y, b.z, 0.25, Math.cos(a) * r, e, Math.sin(a) * r, 0.5 + hash(i + b.age) * 0.5, 0.8, 0, 0, 0, b.seed + i + Math.floor(b.age * 14) * 0.17, 0.5);
    }
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.5, -dx, -dy, -dz, Math.min(b.age * sp, 1.8), 0.7, 0, 0, 0, b.seed);
  };
  P.hit_tesla = function (b, sim, foe) {
    const { x, y, z, def, elem } = b;
    if (foe) this.hurt(sim, foe, def.dmg, elem, x, y, z, x, z, 8);
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.8);
    this.zones.push({ kind: 'tesla', def, x, y, z, t: 0, life: def.hold, tickT: 0, anchor: foe, seed: b.seed });
  };
  P.zone_tesla = function (z, dt, sim) {
    const def = z.def, e = def.elem;
    if (z.anchor && !z.anchor.dead) { z.x = z.anchor.x; z.z = z.anchor.z; z.y = chestOf(z.anchor); }
    this.fx(FX.ORB, e, z.x, z.y, z.z, 0.2 + 0.08 * hash(z.t * 30), 0, 1, 0, 0, 1, 14, 8, 0, z.seed);
    for (let i = 0; i < 3; i++) {
      const a = hash(z.seed + i + Math.floor(z.t * 12)) * TAU, el = hash(i * 3.1 + Math.floor(z.t * 10)) * 2 - 1;
      const ax = Math.cos(a) * (1 - el * el) ** 0.5, ay = el, az = Math.sin(a) * (1 - el * el) ** 0.5;
      this.fx(FX.BOLT, e, z.x, z.y, z.z, 0.3, ax, ay, az, 0.6 + hash(i + z.t) * 0.8, 0.8, 0, 0, 0, z.seed + i + Math.floor(z.t * 14) * 0.17, 0.5);
    }
    z.tickT -= dt;
    if (z.tickT > 0) return;
    z.tickT = def.every;
    for (const k of foes(sim)) {
      const c = chestOf(k), d = Math.hypot(k.x - z.x, c - z.y, k.z - z.z);
      if (d > def.reach) continue;
      this.hurt(sim, k, def.dmg, e, k.x, c, k.z, z.x, z.z, 6);
      this.burst(FX.BOLT, e, z.x, z.y, z.z, 0.7, 0.7, 0.18, { ax: (k.x - z.x) / d, ay: (c - z.y) / d, az: (k.z - z.z) / d, len: d, extra: 1 });
    }
  };

  // ---- Souls: five wailing souls, each after a foe of its own. ----
  P.loose_souls = function (def, sim, from) {
    const p = sim.player, f = this.forward(p, []), claimed = new Set();
    for (let i = 0; i < def.count; i++) {
      const a = (i - (def.count - 1) / 2) * 0.5, c = Math.cos(a), s = Math.sin(a);
      const vx = f[0] * c - f[2] * s, vz = f[0] * s + f[2] * c;
      const k = this.nearestFoe(sim, from[0], from[1], from[2], def.reach, claimed);
      if (k) claimed.add(k);
      this.zones.push({ kind: 'soul', def, x: from[0], y: from[1], z: from[2], vx: vx * def.speed * 0.6, vy: 3 + i % 2 * 2, vz: vz * def.speed * 0.6, k, t: 0, life: def.life, seed: Math.random() });
    }
    this.burst(FX.FLARE, def.elem, from[0], from[1], from[2], 0.08, 0.22, 0.14, { alpha: -0.55 });
  };
  P.zone_soul = function (z, dt, sim) {
    const def = z.def, e = def.elem;
    if (!z.k || z.k.dead) z.k = this.nearestFoe(sim, z.x, z.y, z.z, def.reach);
    if (z.k) {
      const k = z.k, tx = k.x - z.x, ty = chestOf(k) - z.y, tz = k.z - z.z, d = Math.hypot(tx, ty, tz) || 1;
      if (d < radiusOf(k) + 0.25) {
        this.hurt(sim, k, def.dmg, e, z.x, z.y, z.z, z.x - z.vx, z.z - z.vz, 12);
        this.burst(FX.PUFF, e, z.x, z.y, z.z, 0.2, 0.9, 0.35);
        sim.event(EV.SPELL_BOOM, e, z.x, z.y, z.z, 0.4);
        return false;
      }
      const t = Math.min(1, 4 * dt * (0.5 + z.t));
      z.vx += (tx / d * def.speed - z.vx) * t; z.vy += (ty / d * def.speed - z.vy) * t; z.vz += (tz / d * def.speed - z.vz) * t;
    } else { z.vy += (1.5 - z.vy) * dt; }
    z.x += z.vx * dt; z.y += z.vy * dt; z.z += z.vz * dt;
    const sp = Math.hypot(z.vx, z.vy, z.vz) || 1, w = Math.sin(z.t * 13 + z.seed * 20) * 0.08, g = smooth(z.t / 0.35);
    this.fx(FX.ORB, e, z.x, z.y + w, z.z, def.size * (0.3 + 0.7 * g), 0, 1, 0, 0, 0.4 + 0.6 * g, 4 * g, 3, 0, z.seed);
    this.fx(FX.TRAIL, e, z.x, z.y + w, z.z, def.size * 0.8 * g, -z.vx / sp, -z.vy / sp, -z.vz / sp, 0.9 * g, 0.6 * g, 0, 0, 0, z.seed);
  };

  // ---- Thorns: a fan of five that leave what they strike bleeding sap. ----
  P.fly_thorns = function (b, dx, dy, dz, sp) {
    this.fx(FX.LANCE, b.elem, b.x - dx * 0.6, b.y - dy * 0.6, b.z - dz * 0.6, 0.05, dx, dy, dz, 0.8, 1, 5, 3, 0, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, 0.09, -dx, -dy, -dz, Math.min(b.age * sp, 1.4), 0.5, 0, 0, 0, b.seed);
  };
  P.hit_thorns = function (b, sim, foe) {
    const { x, y, z, def, elem } = b;
    if (foe) {
      this.hurt(sim, foe, def.dmg, elem, x, y, z, x - b.vx * 0.01, z - b.vz * 0.01, 8, 'puncture');
      const a = this.affOf(foe);
      a.rot = Math.max(a.rot, def.bleed);
      if (def.snare) a.slow = Math.max(a.slow, def.snare);   // (the spell's Briar branch)
    }
    this.burst(FX.FLARE, elem, x, y, z, 0.12, 0.45, 0.14);
  };

  // ---- Judgement: a mark where you look, then a sword of light down on it. ----
  P.loose_judgement = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'judgement', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.delay + 0.6, struck: false, seed: Math.random() });
    sim.event(EV.SPELL_BOOM, def.elem, c[0], c[1], c[2], 0.3);
  };
  P.zone_judgement = function (z, dt, sim) {
    const def = z.def, e = def.elem, k = smooth(z.t / def.delay);
    if (!z.struck) {
      this.fx(FX.RUNE, e, z.x, z.y + 0.05, z.z, def.radius * (1.4 - 0.4 * k), 0, 1, 0, 0, 0.9 * k, 8 * k, 6, z.t * 2, z.seed);
      this.fx(FX.BEAM, e, z.x, z.y + 30, z.z, 0.05 + 0.2 * k, 0, -1, 0, 30, 0.35 * k, 0, 0, 0, z.seed, 0.05 + 0.2 * k);
      if (z.t < def.delay) return;
      z.struck = true;
      this.explode(sim, z.x, z.y + 1, z.z, def.radius, def.dmg, e, 7, 3);
      for (const f of foes(sim)) if (Math.hypot(f.x - z.x, f.z - z.z) < def.radius * 1.6) { const a = this.affOf(f); a.freeze = Math.max(a.freeze, def.daze); }
      sim.event(EV.SPELL_BOOM, e, z.x, z.y, z.z, 3);
      this.burst(FX.COLUMN, e, z.x, z.y, z.z, def.radius * 0.5, def.radius * 0.8, 0.6, { len: 12, light: 40, lightR: 16 });
      this.burst(FX.BLADE, e, z.x, z.y + 6, z.z, 0.4, 0.2, 0.5, { ax: 0, ay: -1, az: 0, len: 7, light: 20, lightR: 10 });
      this.burst(FX.SHOCK, e, z.x, z.y + 0.2, z.z, 0.3, def.radius * 1.8, 0.4, { alpha: 0.8 });
    }
  };

  // ---- Starfall: a mark on the ground, and a moment later the stars come down on it. ----
  P.loose_starfall = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'starfall', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.delay + def.count * 0.12 + 0.4, made: 0, seed: Math.random() });
    sim.event(EV.SPELL_BOOM, def.elem, c[0], c[1], c[2], 0.3);
  };
  P.zone_starfall = function (z, dt, sim) {
    const def = z.def, e = def.elem, k = smooth(z.t / 0.2) * smooth((z.life - z.t) / 0.3);
    this.fx(FX.RUNE, e, z.x, z.y + 0.05, z.z, def.spread + def.radius * 0.5, 0, 1, 0, 0, 0.8 * k, 4 * k, 4, z.t / z.life, z.seed);
    while (z.made < def.count && z.t > def.delay + z.made * 0.12) {
      const a = hash(z.seed + z.made) * TAU, r = Math.sqrt(hash(z.seed * 3 + z.made)) * def.spread;
      let tx = z.x + Math.cos(a) * r, tz = z.z + Math.sin(a) * r;
      const h = 22;
      // (The spell's branches. Guided Stars: onto whoever is in the mark. The Great Star: the last is three times the blow, twice as wide.)
      if (def.guided) { const marked = foes(sim).filter((f) => Math.hypot(f.x - z.x, f.z - z.z) < def.spread + def.radius); const f = marked[z.made % (marked.length || 1)]; if (f) { tx = f.x; tz = f.z; } }
      const great = def.nova && z.made === def.count - 1;
      this.bolts.push({ def: { ...def, key: 'star', ...(great ? { dmg: def.dmg * def.nova, radius: def.radius * 2 } : {}) }, elem: e, x: tx + 4, y: z.y + h, z: tz + 2, vx: -4 * 2.4, vy: -h * 2.4, vz: -2 * 2.4, age: 0, size: great ? 0.7 : 0.3, power: 1, grav: 0, through: null, seed: Math.random(), lashT: 0, maxAge: 2 });
      z.made++;
    }
  };
  P.fly_star = function (b, dx, dy, dz, sp) {
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size, 0, 1, 0, 0, 1, 14, 9, 0, b.seed);
    this.fx(FX.FLARE, b.elem, b.x, b.y, b.z, b.size * 2.5, 0, 1, 0, 0, 0.5, 0, 0, 0.5, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.6, -dx, -dy, -dz, Math.min(b.age * sp, 6), 0.9, 0, 0, 0, b.seed);
  };
  P.hit_star = function (b, sim) {
    const { x, y, z, def, elem } = b;
    this.explode(sim, x, y, z, def.radius, def.dmg, elem, 3, 1.5);
    this.burst(FX.SHOCK, elem, x, y, z, 0.2, def.radius * 1.2, 0.3, { light: 14, lightR: 7 });
    this.burst(FX.FLARE, elem, x, y + 0.3, z, 0.5, 1.4, 0.2);
  };
}
