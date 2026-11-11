// The spells the six trees added to Bellmourn's twenty (src/sim/spells.js, src/sim/skills.js), and what the trees' branches
// do to them. Like the staffs' shots (src/sim/staffshots.js) they ride Casting's bolts and zones and are drawn with the same
// shapes (FX): a bolt's flight is fly_<key>, its landing hit_<key>; a spell laid on the ground is field_<name> and the
// zone_<kind> it leaves; what's on you for a while is a buff, stepped in stepBuffs.
import { EV } from '../core/layout.js';
import { ELEM, FX } from './spells.js';

const { FIRE, STORM, LIGHT } = ELEM;
const TAU = Math.PI * 2;

/** What can be on you, in the order the snapshot lists what's left of each (H.BUFFS; the bar draws them: src/ui/spellbar.js). */
export const BUFFS = ['haste', 'stone', 'aegis', 'renew', 'might', 'inferno', 'static', 'still', 'guard'];

// helpers: chestOf, radiusOf, heightOf, hash, smooth, clamp from casting.js.
export function installTreeSpells(Casting, { chestOf, radiusOf, hash, smooth, clamp, EYE }) {
  const P = Casting.prototype;
  const foes = (sim) => sim.foes.filter((k) => !k.dead && k.hostile);
  const within = (sim, x, z, r) => foes(sim).filter((k) => Math.hypot(k.x - x, k.z - z) < r + radiusOf(k) * 0.5);
  // The risen dead and their kin: what light turns.
  const risen = (k) => k.kind === 5 || k.kind === 6 || /dead|bone|necro|plague|possess/i.test(k.meta?.group || k.meta?.id || '');

  // A stroke of lightning from one place to another, there and gone.
  P.stroke = function (e, x0, y0, z0, x1, y1, z1, w = 0.5, life = 0.22, light = 0) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz) || 1;
    this.burst(FX.BOLT, e, x0, y0, z0, w, w * 0.8, life, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 1.05, light, lightR: 9 });
    this.burst(FX.BOLT, e, x0, y0, z0, w * 0.6, w * 0.5, life * 0.8, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 0.8, alpha: 0.65 });
  };

  // ================================================================ what's on you

  // How much faster you go, with the wind at your back.
  P.haste = function () {
    const B = this.buffs;
    return (B.haste?.def.haste || 0) + (B.inferno?.def.firewalk || 0) + (B.static?.def.haste || 0);
  };

  // A blow that's landed on you, after your armour (src/sim/player.js applyHurt): what's left of it once stone, rime and
  // hallowed ground have turned their shares (together never more than three quarters), and the Aegis has taken what it can.
  P.absorb = function (amount, sim) {
    const B = this.buffs, p = sim.player;
    let keep = 1;
    if (B.stone) keep *= 1 - B.stone.def.ward;
    if (B.guard) keep *= 1 - B.guard.def.ward;
    if (this.shelterNow) keep *= 1 - this.shelterNow;
    amount *= Math.max(0.25, keep);
    const a = B.aegis;
    if (a && amount > 0) {
      const took = Math.min(a.pool, amount);
      a.pool -= took; a.taken += took; amount -= took;
      this.burst(FX.SHOCK, LIGHT, p.x, p.y + 1, p.z, 0.4, 1.7, 0.25, { alpha: 0.8, light: 10, lightR: 5 });
      sim.event(EV.SPELL_BOOM, LIGHT, p.x, p.y + 1, p.z, 0.8);
    }
    return amount;
  };

  P.cast_buff = function (def, sim) {
    const p = sim.player;
    const b = this.buffs[def.buff] = { t: 0, life: def.duration, def, x: p.x, z: p.z, tickT: 0.3 };
    if (def.buff === 'aegis') { b.pool = def.pool; b.taken = 0; }
    if (def.buff === 'might') b.charges = def.charges;
    if (def.buff === 'still') sim.slowMo(def.duration);
    sim.event(EV.SPELL_BOOM, def.elem, p.x, p.y + 0.6, p.z, def.buff === 'still' || def.buff === 'inferno' ? 4 : 1.5);
    this.burst(FX.RING, def.elem, p.x, p.y + 0.06, p.z, 0.3, 2.4, 0.5, { light: 12, lightR: 7 });
    this.burst(FX.COLUMN, def.elem, p.x, p.y, p.z, 1.4, 2, 0.5, { len: 0.7, alpha: 0.6 });
  };

  // Each tick: what each one does while it lasts, how it looks (at your feet, where it doesn't fill the eye), and its end.
  P.stepBuffs = function (dt, tdt, sim) {
    const p = sim.player, B = this.buffs;
    this.shelterNow = this.shelter || 0; this.shelter = 0;
    this.font = (this.wisp?.def?.font || 0) + (this.fontZone || 0);
    this.fontZone = 0;
    for (const name of BUFFS) {
      const b = B[name];
      if (!b) continue;
      b.t += dt;
      const def = b.def, e = def.elem, k = smooth(b.t / 0.4) * smooth((b.life - b.t) / 0.8), g = p.y + 0.06;
      let over = b.t >= b.life || p.dead;
      b.tickT -= dt;
      switch (name) {
        case 'haste': {
          const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
          for (const side of [-1, 1]) this.fx(FX.TRAIL, e, p.x - c * side * 0.22, p.y + 0.2, p.z + s * side * 0.22, 0.1, -s, 0.15, -c, 1.1, 0.5 * k, 0, 0, 0, side);
          this.fx(FX.RING, e, p.x, g, p.z, 0.6, 0, 1, 0, 0, 0.35 * k, 0, 0, b.t * 2 % 1, 0.3);
          break;
        }
        case 'stone':
          this.fx(FX.RING, e, p.x, g, p.z, 0.8, 0, 1, 0, 0, 0.7 * k, 0, 0, 0.4, 0.5);
          this.fx(FX.RUNE, e, p.x, g, p.z, 0.95, 0, 1, 0, 0, 0.5 * k, 2 * k, 3, b.t * 0.2 % 1, 0.5);
          if (def.mendRate) p.hp = Math.min(p.maxHp, p.hp + def.mendRate * dt);
          // Stoneshock: the ground jumps round you, and throws back whatever is close.
          if (def.pulse && (b.pulseT = (b.pulseT ?? 3) - dt) <= 0) {
            b.pulseT = 3;
            for (const f of within(sim, p.x, p.z, 4)) { const L = Math.hypot(f.x - p.x, f.z - p.z) || 1; this.hurt(sim, f, def.pulse, e, f.x, chestOf(f), f.z, p.x, p.z, 50); this.shove(f, (f.x - p.x) / L * 6, (f.z - p.z) / L * 6, 2); }
            this.burst(FX.RING, e, p.x, g, p.z, 0.5, 4.2, 0.4, { light: 6, lightR: 5 });
            this.burst(FX.SHOCK, e, p.x, p.y + 0.3, p.z, 0.4, 3.6, 0.35, { alpha: 0.6 });
            sim.event(EV.SPELL_BOOM, e, p.x, p.y + 0.3, p.z, 2);
          }
          break;
        case 'guard':
          this.fx(FX.RING, e, p.x, g, p.z, 0.75, 0, 1, 0, 0, 0.6 * k, 0, 0, 0.3, 0.2);
          for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.4; this.fx(FX.ICE, e, p.x + Math.cos(a) * 0.7, p.y - 0.05, p.z + Math.sin(a) * 0.7, 0.05 * k, Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4, 0.4 * k, 1, 0, 0, 0, i * 0.3); }
          break;
        case 'aegis':
          this.fx(FX.RING, e, p.x, g, p.z, 0.9, 0, 1, 0, 0, 0.8 * k, 3 * k, 4, 0.2, 0.1);
          for (let i = 0; i < 4; i++) { const a = b.t * 2.2 + i * 1.571; this.fx(FX.FLARE, e, p.x + Math.cos(a) * 0.9, p.y + 0.45 + 0.2 * Math.sin(b.t * 3 + i), p.z + Math.sin(a) * 0.9, 0.08, 0, 1, 0, 0, 0.8 * k * clamp(b.pool / def.pool + 0.3, 0, 1), 0, 0, 0.5, i * 0.2); }
          if (b.pool <= 0) over = true;
          // Shattering Light: breaking or running out, it gives back what it took.
          if (over && def.burstOnEnd && !p.dead) { this.explode(sim, p.x, p.y + 1, p.z, 5, def.burstOnEnd + b.taken, e, 7, 1); }
          break;
        case 'renew': {
          const rate = def.amount / def.duration;
          if (!p.dead) p.hp = Math.min(p.maxHp, p.hp + rate * dt);
          if (def.well) this.mana = Math.min(this.maxMana, this.mana + def.well / def.duration * dt);
          for (let i = 0; i < 4; i++) { const u = (b.t * 0.6 + i / 4) % 1, a = i * 2.4 + b.t * 2; this.fx(FX.FLARE, e, p.x + Math.cos(a) * 0.8, p.y + 0.1 + u * 1.2, p.z + Math.sin(a) * 0.8, 0.08, 0, 1, 0, 0, k * (1 - u) * 0.8, 0, 0, 0.5, i * 0.1); }
          break;
        }
        case 'might':
          this.fx(FX.RUNE, e, p.x, g, p.z, 0.85, 0, 1, 0, 0, 0.7 * k, 4 * k, 4, b.t * 0.3 % 1, 0.9);
          for (let i = 0; i < b.charges; i++) { const a = b.t * 1.6 + i * TAU / Math.max(1, b.charges); this.fx(FX.ORB, e, p.x + Math.cos(a) * 0.75, p.y + 0.6, p.z + Math.sin(a) * 0.75, 0.07, 0, 1, 0, 0, k, 0, 0, 0, i * 0.2); }
          // (Its casts spent, it's over as soon as the last of them is thrown.)
          if (b.charges <= 0 && !this.amped) over = true;
          break;
        case 'inferno': {
          const R = def.radius;
          this.fx(FX.DISC, e, p.x, g, p.z, R, 0, 1, 0, 0, 0.45 * k, 14 * k, R * 2.5, b.t / b.life, 0.3);
          for (let i = 0; i < 9; i++) { const a = i * 0.698 + b.t * 0.9, r = R * 0.85 + 0.15 * Math.sin(b.t * 3 + i); this.fx(FX.FLAME, e, p.x + Math.cos(a) * r, p.y - 0.05, p.z + Math.sin(a) * r, (0.7 + 0.25 * hash(i)) * k, 0, 1, 0, 0.7, 0.85, 0, 0, 0, i * 0.37); }
          if (b.tickT <= 0) {
            b.tickT = 0.5;
            for (const f of within(sim, p.x, p.z, R)) { this.hurt(sim, f, def.dps * 0.5, e, f.x, chestOf(f), f.z, p.x, p.z, 4); const a = this.affOf(f); a.burn = Math.max(a.burn, def.burn); }
          }
          // The ground burns where you've walked.
          if (Math.hypot(p.x - b.x, p.z - b.z) > 1.6) { this.zones.push({ kind: 'burning', x: b.x, y: sim.world.height(b.x, b.z), z: b.z, r: 1.3, t: 0, life: 3, seed: Math.random() }); b.x = p.x; b.z = p.z; }
          // Conflagration: as it gutters out, it bursts.
          if (over && def.finale && !p.dead) this.explode(sim, p.x, p.y + 1, p.z, 6, def.finale, e, 8, 2);
          break;
        }
        case 'static': {
          for (let i = 0; i < 3; i++) { const a = hash(i + Math.floor(b.t * 10)) * TAU; this.fx(FX.BOLT, e, p.x, p.y + 0.1, p.z, 0.22, Math.cos(a), 0.25, Math.sin(a), 0.9 + hash(i * 3 + Math.floor(b.t * 8)) * 0.6, 0.7 * k, 0, 0, 0, Math.floor(b.t * 12) * 0.17 + i, 0.6); }
          this.fx(FX.RING, e, p.x, g, p.z, def.radius, 0, 1, 0, 0, 0.16 * k, 0, 0, 0.5, 0.4);
          if (b.tickT <= 0) {
            b.tickT = def.every;
            const near = within(sim, p.x, p.z, def.radius).sort((u, v) => Math.hypot(u.x - p.x, u.z - p.z) - Math.hypot(v.x - p.x, v.z - p.z)).slice(0, def.arcs);
            for (const f of near) { this.hurt(sim, f, def.dmg, e, f.x, chestOf(f), f.z, p.x, p.z, 6); this.stroke(e, p.x, p.y + 0.15, p.z, f.x, chestOf(f), f.z, 0.45, 0.2, 8); }
            // (Stormrunner: a pulse that found someone gives a little back.)
            if (near.length && def.dynamo) this.mana = Math.min(this.maxMana, this.mana + def.dynamo);
          }
          break;
        }
        case 'still':
          this.fx(FX.RING, e, p.x, g, p.z, 1 + (b.t * 0.5 % 1) * 5, 0, 1, 0, 0, 0.5 * k * (1 - b.t * 0.5 % 1), 0, 0, b.t * 0.5 % 1, 0.6);
          this.fx(FX.RUNE, e, p.x, g, p.z, 1.6, 0, 1, 0, 0, 0.6 * k, 5 * k, 6, -b.t * 0.15, 0.6);
          break;
        default:
      }
      if (over) delete B[name];
    }
  };

  // ================================================================ spells that leave the hand in a way of their own

  // What a staff looses with loose_<key>, a spell may too (Moonblade, Starfall). twin: a second, thrown wide of the first.
  P.cast_loose = function (def, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]), n0 = this.zones.length;
    this[`loose_${def.key}`](def, sim, from);
    if (!def.twin) return;
    this[`loose_${def.key}`](def, sim, [from[0], from[1], from[2]]);
    this.zones.slice(n0).forEach((z, i) => {
      if (z.dx === undefined) return;
      const a = i ? 0.24 : -0.24, c = Math.cos(a), s = Math.sin(a), x = z.dx * c - z.dz * s;
      z.dz = z.dx * s + z.dz * c; z.dx = x;
    });
  };

  // ---- A ring out from where you stand: Ring of Fire (and the moat it leaves), Thunderclap, Turn the Dead. ----
  P.cast_ring = function (def, sim) {
    const p = sim.player, seed = Math.random(), out = def.radius / 22;
    this.zones.push({ kind: 'ringwave', def, x: p.x, y: p.y, z: p.z, t: 0, life: out + 0.35, hit: new Set(), kindled: 0, seed });
    if (def.moat) this.zones.push({ kind: 'moat', def, x: p.x, y: p.y, z: p.z, t: -out, life: def.moat, tickT: 0, seed });
    p.trauma = Math.min(1, p.trauma + 0.4);
    sim.event(EV.SPELL_BOOM, def.elem, p.x, p.y + 0.6, p.z, 4);
    if (def.moat) sim.event(EV.SPELL_ZONE, def.elem, def.i, p.x, p.y + 0.6, p.z, def.moat);
    if (def.elem === LIGHT) this.burst(FX.COLUMN, def.elem, p.x, p.y, p.z, 1.2, 2.2, 0.6, { len: 3, light: 30, lightR: 16 });
  };
  P.zone_ringwave = function (z, dt, sim) {
    const def = z.def, e = def.elem, R = def.radius, wave = Math.min(R, z.t * 22), k = 1 - smooth((z.t - R / 22) / 0.35);
    this.fx(FX.RING, e, z.x, z.y + 0.1, z.z, wave, 0, 1, 0, 0, k, 22 * k, 14, wave / R * 0.7, z.seed);
    this.fx(FX.SHOCK, e, z.x, z.y + 0.5, z.z, wave, 0, 1, 0, 0, 0.5 * k, 0, 0, wave / R, z.seed);
    const N = e === FIRE ? 14 : e === STORM ? 10 : 8;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + z.seed * 6, x = z.x + Math.cos(a) * wave, c = z.z + Math.sin(a) * wave, g = sim.world.height(x, c);
      if (e === FIRE) this.fx(FX.FLAME, e, x, g - 0.05, c, 1.5 * k, 0, 1, 0, 1, 0.9, 0, 0, 0, i * 0.37 + z.seed);
      else if (e === STORM) this.fx(FX.BOLT, e, x, g + 0.2, c, 0.4, -Math.sin(a) * 0.5, 0.85, Math.cos(a) * 0.5, 1.6 + hash(i + Math.floor(z.t * 20)), k, 0, 0, 0, i + Math.floor(z.t * 20) * 0.13, 0.9);
      else this.fx(FX.FLARE, e, x, g + 0.8, c, 0.5 * k, 0, 1, 0, 0, k, 0, 0, 0.5, i * 0.2);
    }
    for (const f of foes(sim)) {
      if (z.hit.has(f) || Math.hypot(f.x - z.x, f.z - z.z) > wave + radiusOf(f)) continue;
      z.hit.add(f);
      const L = Math.hypot(f.x - z.x, f.z - z.z) || 1, a = this.affOf(f), c = chestOf(f);
      // Light turns the dead (driven back, burning, helpless a while) and only dazes the living.
      if (def.rout !== undefined && !risen(f)) { this.stunFor(sim, f, def.daze); this.burst(FX.FLARE, e, f.x, c, f.z, 0.3, 0.9, 0.25); continue; }
      this.hurt(sim, f, def.dmg, e, f.x, c, f.z, z.x, z.z, 50);
      if (def.force) this.shove(f, (f.x - z.x) / L * def.force, (f.z - z.z) / L * def.force, 1.5);
      if (def.burn) a.burn = Math.max(a.burn, def.burn);
      if (def.stun) this.stunFor(sim, f, def.stun, true);
      if (def.rout) this.stunFor(sim, f, def.rout);
      if (def.kindle && z.kindled < def.kindleMax) { z.kindled++; this.mana = Math.min(this.maxMana, this.mana + def.kindle); }
      sim.event(EV.SPELL_BOOM, e, f.x, c, f.z, 1.2);
    }
  };
  // The ring of fire, standing where the wave stopped: what crosses it burns.
  P.zone_moat = function (z, dt, sim) {
    if (z.t < 0) return;
    const def = z.def, e = def.elem, R = def.radius, k = smooth(z.t / 0.3) * smooth((z.life - z.t) / 0.8), N = Math.ceil(TAU * R / 1.25);
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + z.seed * 6, x = z.x + Math.cos(a) * R, c = z.z + Math.sin(a) * R;
      // (Low, seen from inside through your own eyes: a ring of flame as high as a wall would hide everything beyond it.)
      this.fx(FX.FLAME, e, x, sim.world.height(x, c) - 0.1, c, (sim.third ? 1.7 + 0.9 * hash(i + z.seed) : 0.65 + 0.25 * hash(i + z.seed)) * k, 0, 1, 0, 1.02, 0.95, i % 4 === 0 ? 14 * k : 0, 9, 0, i * 0.37 + z.seed);
    }
    z.tickT -= dt;
    if (z.tickT > 0 || k < 0.2) return;
    z.tickT = 0.25;
    for (const f of foes(sim)) {
      if (Math.abs(Math.hypot(f.x - z.x, f.z - z.z) - R) > 0.9 + radiusOf(f) * 0.5) continue;
      this.hurt(sim, f, def.dps * 0.25, e, f.x, chestOf(f), f.z, f.x, f.z, 3);
      const a = this.affOf(f);
      a.burn = Math.max(a.burn, def.burn);
    }
  };

  // ---- Spark: a crack of lightning straight to what you look at. ----
  P.cast_zap = function (def, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]), to = [0, 0, 0], p = sim.player, e = def.elem;
    let k = this.aim(sim, def.range, to);
    if (!k) {
      const f = this.forward(p, []), o = this.eye(sim, []), hit = this.foeOn(sim, o[0], o[1], o[2], f[0], f[1], f[2], def.range, 0.25);
      if (hit) { k = hit.k; to[0] = k.x; to[1] = chestOf(k); to[2] = k.z; }
    }
    // Heavy Stroke: every few casts, a thunderous one.
    const heavy = !!def.surge && ++this.sparkN % (6 - def.surge) === 0;
    this.stroke(e, from[0], from[1], from[2], to[0], to[1], to[2], heavy ? 0.9 : 0.5, heavy ? 0.3 : 0.2, heavy ? 30 : 14);
    this.burst(FX.FLARE, e, to[0], to[1], to[2], 0.3, heavy ? 1.8 : 0.9, 0.2, { light: 12, lightR: 7 });
    if (heavy) this.burst(FX.SHOCK, e, to[0], to[1], to[2], 0.3, 2.4, 0.3);
    sim.event(EV.SPELL_BOOM, e, to[0], to[1], to[2], heavy ? 2 : 0.7);
    if (!k) return;
    this.hurt(sim, k, def.dmg * (heavy ? 2 : 1), e, to[0], to[1], to[2], p.x, p.z, heavy ? 60 : 16);
    if (heavy) this.stunFor(sim, k, 0.6);
    if (def.shock) this.affOf(k).shock = Math.max(this.affOf(k).shock, def.shock);
    // At its third and fifth ranks it leaps on, for half.
    const seen = new Set([k]);
    let at = k;
    for (let i = 0; i < (def.jumps || 0); i++) {
      const n = this.nearestFoe(sim, at.x, chestOf(at), at.z, 8, seen);
      if (!n) break;
      seen.add(n);
      this.hurt(sim, n, def.dmg * def.leap, e, n.x, chestOf(n), n.z, at.x, at.z, 8);
      if (def.shock) this.affOf(n).shock = Math.max(this.affOf(n).shock, def.shock);
      this.stroke(e, at.x, chestOf(at), at.z, n.x, chestOf(n), n.z, 0.4, 0.2);
      at = n;
    }
  };

  // ---- Forked Lightning: it splits as it leaves the hand, each fork to a foe of its own. ----
  P.cast_fork = function (def, sim) {
    const from = this.palm(this.side, 0.85, sim, [0, 0, 0]), p = sim.player, e = def.elem, f = this.forward(p, []), ey = p.y + EYE;
    const marks = [];
    for (const k of foes(sim)) {
      const dx = k.x - p.x, dy = chestOf(k) - ey, dz = k.z - p.z, d = Math.hypot(dx, dy, dz);
      if (d > def.range + radiusOf(k) || d < 0.01) continue;
      const a = Math.acos(clamp((dx * f[0] + dy * f[1] + dz * f[2]) / d, -1, 1));
      if (a <= def.angle + 0.1 && sim.world.sees(p.x, ey, p.z, k.x, chestOf(k), k.z)) marks.push({ k, a });
    }
    marks.sort((u, v) => u.a - v.a);
    const seen = new Set(marks.slice(0, def.forks).map((m) => m.k));
    for (let i = 0; i < def.forks; i++) {
      const m = marks[i] || (marks.length ? marks[i % marks.length] : null);
      if (!m) {
        // Nobody there: it forks into the air.
        const t = (i - (def.forks - 1) / 2) * def.angle * 0.6, c = Math.cos(t), s = Math.sin(t), ax = f[0] * c - f[2] * s, az = f[0] * s + f[2] * c;
        const reach = this.trace(sim, from[0], from[1], from[2], ax, f[1], az, def.range * 0.7);
        this.stroke(e, from[0], from[1], from[2], from[0] + ax * reach, from[1] + f[1] * reach, from[2] + az * reach, 0.45, 0.2, i ? 0 : 14);
        continue;
      }
      // (A fork with no foe of its own goes into one already struck, for a quarter.)
      const k = m.k, c = chestOf(k), share = i < marks.length ? 1 : 0.25;
      this.hurt(sim, k, def.dmg * share, e, k.x, c, k.z, p.x, p.z, 14);
      this.stroke(e, from[0], from[1], from[2], k.x, c, k.z, 0.5, 0.22, i ? 0 : 16);
      this.burst(FX.FLARE, e, k.x, c, k.z, 0.3, 0.9, 0.2);
      // Branching: on once more from each, for half.
      const n = def.branch && i < marks.length ? this.nearestFoe(sim, k.x, c, k.z, 7, seen) : null;
      if (n) { seen.add(n); this.hurt(sim, n, def.dmg * def.branch, e, n.x, chestOf(n), n.z, k.x, k.z, 8); this.stroke(e, k.x, c, k.z, n.x, chestOf(n), n.z, 0.35, 0.2); }
    }
    sim.event(EV.SPELL_BOOM, e, from[0] + f[0] * 4, from[1] + f[1] * 4, from[2] + f[2] * 4, 1.4);
  };

  // ---- Shatter: what's slowed cracks; what's frozen breaks out of its ice, and the shards cut those beside it. ----
  P.cast_shatter = function (def, sim) {
    const p = sim.player, e = def.elem, ey = p.y + EYE;
    const shards = (f, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, u = Math.random(); this.burst(FX.ICE, e, f.x, chestOf(f), f.z, 0.1, 0.01, 0.45, { ax: Math.cos(a), ay: u * 0.8, az: Math.sin(a), len: 0.6 + u * 0.9 }); } };
    const splash = (f, dmg) => { for (const o of within(sim, f.x, f.z, def.radius)) if (o !== f) this.hurt(sim, o, dmg, e, o.x, chestOf(o), o.z, f.x, f.z, 20); };
    let any = false;
    for (const f of foes(sim)) {
      if (Math.hypot(f.x - p.x, f.z - p.z) > def.range + radiusOf(f) || !sim.world.sees(p.x, ey, p.z, f.x, chestOf(f), f.z)) continue;
      const a = this.affOf(f), c = chestOf(f);
      if (a.freeze > 0) {
        // (Out of its ice first: the double is instead of the half again a frozen thing takes, not on top of it.)
        a.freeze = 0; a.thawAt = sim.time;
        const died = this.hurt(sim, f, def.dmg * 2, e, f.x, c, f.z, p.x, p.z, 70, 'puncture');
        splash(f, def.dmg * def.splash);
        if (died && def.chainShatter) { splash(f, def.dmg * def.chainShatter); this.burst(FX.SHOCK, e, f.x, c, f.z, 0.4, def.radius * 1.2, 0.35, { alpha: 0.8 }); }
        shards(f, 9);
        this.burst(FX.SHOCK, e, f.x, c, f.z, 0.3, def.radius, 0.3, { light: 12, lightR: 7 });
        sim.event(EV.SPELL_BOOM, e, f.x, c, f.z, 1.8);
        any = true;
      } else if (a.slow > 0) {
        this.hurt(sim, f, def.dmg, e, f.x, c, f.z, p.x, p.z, 30);
        shards(f, 4);
        any = true;
      } else if (def.frostbite) { a.slow = Math.max(a.slow, def.frostbite); this.burst(FX.RING, e, f.x, f.y + 0.05, f.z, 0.3, 1.2, 0.4); }
    }
    this.burst(FX.RING, e, p.x, p.y + 0.1, p.z, 0.5, def.range, 0.45, { alpha: any ? 0.8 : 0.35 });
    sim.event(EV.SPELL_BOOM, e, p.x, p.y + 0.6, p.z, any ? 2.5 : 0.8);
  };

  // ================================================================ spells laid on the ground

  P.cast_field = function (def, sim) { this[`field_${def.field}`](def, sim); };

  // ---- Deadwinter: a mark, and a breath later all warmth leaves it. ----
  P.field_zero = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'zero', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.delay + 2.6 + (def.linger || 0), struck: false, seed: Math.random() });
    sim.event(EV.SPELL_ZONE, def.elem, def.i, c[0], c[1] + 1, c[2], def.delay + 1);
  };
  P.zone_zero = function (z, dt, sim) {
    const def = z.def, e = def.elem, R = def.radius, u = clamp(z.t / def.delay, 0, 1), after = z.t - def.delay, fade = smooth((z.life - z.t) / 0.8);
    this.fx(FX.RUNE, e, z.x, z.y + 0.05, z.z, R * (z.struck ? 1 : smooth(u)), 0, 1, 0, 0, 0.8 * fade, 6 * u * fade, R * 2, z.t * 0.3, z.seed);
    if (!z.struck) {
      // The air is drawn in over it.
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + z.t * 2, r = R * (1 - u * 0.8); this.fx(FX.PUFF, e, z.x + Math.cos(a) * r, z.y + 0.8 + i * 0.12, z.z + Math.sin(a) * r, 1.1, 0, 1, 0, 0, 0.4 * u, 0, 0, 0, i * 0.23); }
      if (z.t < def.delay) return;
      z.struck = true;
      for (const f of within(sim, z.x, z.z, R)) {
        this.hurt(sim, f, def.dmg, e, f.x, chestOf(f), f.z, z.x, z.z, 30);
        this.freezeFor(sim, f, def.freeze, true);
        // Killing Frost: the lesser ones it leaves all but dead are broken outright.
        if (def.execute && !f.dead && f.maxHp < 400 && f.hp <= f.maxHp * def.execute) { this.hurt(sim, f, f.maxHp * 4, e, f.x, chestOf(f), f.z, z.x, z.z, 80, 'puncture'); this.burst(FX.SHOCK, e, f.x, chestOf(f), f.z, 0.3, 2, 0.3); }
      }
      sim.player.trauma = Math.min(1, sim.player.trauma + 0.45);
      sim.event(EV.SPELL_BOOM, e, z.x, z.y + 1, z.z, 6);
      this.burst(FX.COLUMN, e, z.x, z.y, z.z, R * 0.6, R * 0.8, 0.7, { len: 5, alpha: 0.8, light: 40, lightR: R * 3 });
      this.burst(FX.SHOCK, e, z.x, z.y + 0.6, z.z, 1, R * 1.1, 0.5, { alpha: 1.1 });
      return;
    }
    // A field of ice stands where it struck, and the cold lies on the ground after (Long Winter).
    const grow = smooth(after / 0.18) * fade;
    for (let i = 0; i < 30; i++) {
      const a = i * 2.399 + z.seed * 6, rr = R * Math.sqrt((i + 0.5) / 30), ox = Math.cos(a), oz = Math.sin(a), x = z.x + ox * rr, c = z.z + oz * rr, L = 0.7 + hash(i * 3) * 1.3;
      this.fx(FX.ICE, e, x, sim.world.height(x, c) - 0.14, c, 0.18 * L * grow, ox * 0.3, 0.94, oz * 0.3, L * 1.4 * grow, 1, 0, 0, 0, i * 0.17);
    }
    this.fx(FX.DISC, e, z.x, z.y, z.z, R * 1.03, 0, 1, 0, 0, fade, 8 * fade, R * 2.5, z.t / z.life, z.seed);
    if (def.linger) for (const f of within(sim, z.x, z.z, R)) { const a = this.affOf(f); a.slow = Math.max(a.slow, 0.6); }
  };

  // ---- Earthquake: the ground heaves, and every jolt throws them off their feet. ----
  P.field_quake = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'quake', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.duration, joltT: 0.35, seed: Math.random() });
    sim.event(EV.SPELL_ZONE, def.elem, def.i, c[0], c[1] + 0.5, c[2], def.duration);
  };
  P.zone_quake = function (z, dt, sim) {
    const def = z.def, e = def.elem, R = def.radius, k = smooth(z.t / 0.3) * smooth((z.life - z.t) / 0.6), p = sim.player;
    this.fx(FX.DISC, e, z.x, z.y, z.z, R * 1.04, 0, 1, 0, 0, 0.7 * k, 0, 0, z.t / z.life, z.seed);
    this.fx(FX.RUNE, e, z.x, z.y + 0.04, z.z, R, 0, 1, 0, 0, 0.5 * k, 0, 0, 0.6, z.seed);
    for (let i = 0; i < 6; i++) { const a = i * 2.399 + Math.floor(z.t * 2) * 1.7, r = R * Math.sqrt(hash(i + Math.floor(z.t * 2))), x = z.x + Math.cos(a) * r, c = z.z + Math.sin(a) * r; this.fx(FX.PUFF, e, x, sim.world.height(x, c) + 0.3, c, 1.2, 0, 1, 0, 0, 0.35 * k, 0, 0, 0, i * 0.3); }
    const on = within(sim, z.x, z.z, R);
    for (const f of on) { const a = this.affOf(f); a.slow = Math.max(a.slow, 0.5); }
    const last = z.t + dt >= z.life;
    z.joltT -= dt;
    if (z.joltT <= 0 && !last) {
      z.joltT = def.jolt;
      for (const f of on) {
        this.hurt(sim, f, def.dmg, e, f.x, f.y + 0.4, f.z, f.x, f.z, 60, 'puncture');
        this.shove(f, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 5);
        this.stunFor(sim, f, 0.4);
      }
      this.burst(FX.RING, e, z.x, z.y + 0.05, z.z, R * 0.2, R * 1.05, 0.45, { alpha: 0.9 });
      for (let i = 0; i < 7; i++) { const a = Math.random() * TAU, r = R * Math.sqrt(Math.random()), x = z.x + Math.cos(a) * r, c = z.z + Math.sin(a) * r; this.burst(FX.SPIKE, e, x, sim.world.height(x, c) - 0.4, c, 0.22, 0.26, 0.7, { ax: (Math.random() - 0.5) * 0.4, ay: 1, az: (Math.random() - 0.5) * 0.4, len: 1 + Math.random() * 0.8, ease: 6 }); }
      sim.event(EV.SPELL_BOOM, e, z.x, z.y + 0.3, z.z, 3.5);
      if (Math.hypot(p.x - z.x, p.z - z.z) < R + 3) p.trauma = Math.min(1, p.trauma + 0.15);
    }
    // Chasm: with its last heave, a spike under everyone still on it.
    if (last && def.chasm) for (const f of on) this.spikes.push({ def: { ...def, dmg: def.chasm, stun: 0 }, x: f.x, y: sim.world.height(f.x, f.z), z: f.z, t: 0, h: 1.9, s: 0, c: 1, hit: new Set(), up: false, i: 0, seed: Math.random() });
  };

  // ---- Rune of Force: written on the ground, it waits for the first foe to step on it. ----
  P.field_rune = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]), lying = this.zones.filter((z) => z.kind === 'rune');
    // (One more than may lie at once: the oldest goes out.)
    if (lying.length >= def.max) lying[0].t = lying[0].life;
    this.zones.push({ kind: 'rune', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.duration, seed: Math.random() });
    sim.event(EV.SPELL_BOOM, def.elem, c[0], c[1] + 0.2, c[2], 0.8);
  };
  P.zone_rune = function (z, dt, sim) {
    const def = z.def, e = def.elem, armed = z.t >= def.arm, k = smooth(z.t / def.arm) * smooth((z.life - z.t) / 1), pulse = 0.75 + 0.25 * Math.sin(z.t * 4);
    this.fx(FX.RUNE, e, z.x, z.y + 0.05, z.z, def.radius * 0.6 * smooth(z.t / def.arm), 0, 1, 0, 0, k * pulse, armed ? 5 * k : 0, 4, z.t * 0.12, z.seed);
    if (armed) this.fx(FX.FLARE, e, z.x, z.y + 0.25, z.z, 0.16 * pulse, 0, 1, 0, 0, 0.8 * k, 0, 0, 0.5, z.seed);
    if (!armed || !foes(sim).some((f) => Math.hypot(f.x - z.x, f.z - z.z) < def.radius * 0.55 + radiusOf(f) && Math.abs(f.y - z.y) < 2.5)) return;
    const caught = within(sim, z.x, z.z, def.radius);
    this.explode(sim, z.x, z.y + 0.6, z.z, def.radius, def.dmg, e, 8, 6);
    // Binding Rune: what it caught hangs held after.
    if (def.bind) for (const f of caught) this.stunFor(sim, f, def.bind, true);
    this.burst(FX.COLUMN, e, z.x, z.y, z.z, def.radius * 0.5, def.radius * 0.7, 0.5, { len: 3, light: 24, lightR: 10 });
    return false;
  };

  // ---- Thunderbolt: out of the sky, onto where you look. ----
  P.field_thunder = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'thunder', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.delay + (def.twice ? 0.5 : 0) + 0.15, strikes: 0, seed: Math.random() });
  };
  P.zone_thunder = function (z, dt, sim) {
    const def = z.def, e = def.elem, u = clamp(z.t / def.delay, 0, 1);
    this.fx(FX.RUNE, e, z.x, z.y + 0.05, z.z, def.radius * (1.3 - 0.3 * u), 0, 1, 0, 0, 0.9 * u, 6 * u, 5, z.t * 2, z.seed);
    this.fx(FX.BEAM, e, z.x, z.y + 28, z.z, 0.04 + 0.1 * u, 0, -1, 0, 28, 0.3 * u, 0, 0, 0, z.seed, 0.04 + 0.1 * u);
    const due = z.strikes === 0 ? def.delay : def.twice ? def.delay + 0.5 : Infinity;
    if (z.t < due) return;
    const share = z.strikes++ ? def.twice : 1, caught = within(sim, z.x, z.z, def.radius);
    this.explode(sim, z.x, z.y + 1, z.z, def.radius, def.dmg * share, e, 6, 2);
    for (const f of caught) this.stunFor(sim, f, def.stun);
    for (let i = 0; i < 3; i++) this.burst(FX.BOLT, e, z.x + (hash(z.seed + i) - 0.5) * 3 * i, z.y + 27, z.z + (hash(z.seed * 3 + i) - 0.5) * 3 * i, 1.5 - i * 0.3, 1.1, 0.26 + i * 0.05, { ax: 0, ay: -1, az: 0, len: 27, extra: 1.3, light: i ? 0 : 46, lightR: 20 });
    this.burst(FX.COLUMN, e, z.x, z.y, z.z, def.radius * 0.5, def.radius * 0.8, 0.4, { len: 8, alpha: 0.9 });
    sim.player.trauma = Math.min(1, sim.player.trauma + 0.35);
    // Ground Current: along the ground to others near.
    const seen = new Set(caught);
    for (let i = 0; i < (def.arcs || 0) && share === 1; i++) {
      const n = this.nearestFoe(sim, z.x, z.y + 1, z.z, 11, seen);
      if (!n) break;
      seen.add(n);
      this.hurt(sim, n, def.dmg * 0.4, e, n.x, chestOf(n), n.z, z.x, z.z, 12);
      this.stroke(e, z.x, z.y + 0.3, z.z, n.x, n.y + 0.4, n.z, 0.5, 0.3);
    }
  };

  // ---- Thunderstorm: a storm over the ground you mark, and bolt after bolt out of it. ----
  P.field_tempest = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]);
    this.zones.push({ kind: 'tempest', def, x: c[0], y: c[1], z: c[2], t: 0, life: def.duration, boltT: 0.6, stunned: new Set(), seed: Math.random() });
    sim.event(EV.SPELL_ZONE, def.elem, def.i, c[0], c[1] + 1, c[2], def.duration);
  };
  P.zone_tempest = function (z, dt, sim) {
    const def = z.def, e = def.elem, R = def.radius, k = smooth(z.t / 0.6) * smooth((z.life - z.t) / 0.9), top = z.y + 11;
    // Stormfront: it drifts after whoever is nearest it.
    if (def.drift) {
      const n = this.nearestFoe(sim, z.x, z.y + 1, z.z, R + 14);
      if (n) { const L = Math.hypot(n.x - z.x, n.z - z.z); if (L > 0.5) { z.x += (n.x - z.x) / L * def.drift * dt; z.z += (n.z - z.z) / L * def.drift * dt; z.y = sim.world.height(z.x, z.z); } }
    }
    this.fx(FX.DISC, e, z.x, z.y, z.z, R * 1.03, 0, 1, 0, 0, 0.5 * k, 6 * k, R * 2.5, z.t / z.life, z.seed);
    for (let i = 0; i < 10; i++) {
      const a = i * 2.399 + z.t * 0.25, r = R * Math.sqrt((i + 0.5) / 10) * 0.95;
      this.fx(FX.PUFF, e, z.x + Math.cos(a) * r, top + hash(i) * 1.6, z.z + Math.sin(a) * r, 4 + hash(i * 2) * 1.5, 0, 1, 0, 0, 0.6 * k, i === 0 ? 5 * k : 0, 14, 0, i * 0.23 + z.seed);
    }
    z.boltT -= dt;
    if (z.boltT > 0 || k < 0.4) return;
    z.boltT = def.every;
    const under = within(sim, z.x, z.z, R), f = under[Math.floor(Math.random() * under.length)];
    const a = Math.random() * TAU, r = R * Math.sqrt(Math.random());
    const tx = f ? f.x : z.x + Math.cos(a) * r, tz = f ? f.z : z.z + Math.sin(a) * r, ty = sim.world.height(tx, tz);
    // (Every third stroke lights the ground: one every bolt is a flicker nobody can look at for eight seconds.)
    this.stroke(e, tx + (Math.random() - 0.5) * 3, top, tz + (Math.random() - 0.5) * 3, tx, ty, tz, 1, 0.24, (z.bolts = (z.bolts || 0) + 1) % 3 === 1 ? 30 : 0);
    this.burst(FX.FLARE, e, tx, ty + 0.5, tz, 0.5, 1.8, 0.2);
    this.explode(sim, tx, ty + 0.8, tz, def.blast, def.dmg, e, 3, 1);
    // (It stuns each of them once: a storm slows a fight, it doesn't hold one still.)
    if (f && !z.stunned.has(f) && this.stunFor(sim, f, def.stun)) z.stunned.add(f);
  };

  // ---- Sanctuary: hallowed ground where you stand. ----
  P.field_sanctuary = function (def, sim) {
    const p = sim.player;
    this.zones.push({ kind: 'sanctuary', def, x: p.x, y: p.y, z: p.z, t: 0, life: def.duration, tickT: 0, seed: Math.random() });
    sim.event(EV.SPELL_BOOM, def.elem, p.x, p.y + 0.6, p.z, 2.5);
  };
  P.zone_sanctuary = function (z, dt, sim) {
    const def = z.def, e = def.elem, R = def.radius, k = smooth(z.t / 0.4) * smooth((z.life - z.t) / 1), p = sim.player;
    this.fx(FX.RUNE, e, z.x, z.y + 0.05, z.z, R, 0, 1, 0, 0, 0.85 * k, 8 * k, R * 2.2, z.t * 0.05, z.seed);
    this.fx(FX.RING, e, z.x, z.y + 0.06, z.z, R, 0, 1, 0, 0, 0.7 * k, 0, 0, 0.3, z.seed);
    for (let i = 0; i < 10; i++) { const u = (z.t * 0.4 + i / 10) % 1, a = i * 0.628 + z.seed * 6; this.fx(FX.FLARE, e, z.x + Math.cos(a) * R, z.y + 0.1 + u * 2.4, z.z + Math.sin(a) * R, 0.1, 0, 1, 0, 0, k * (1 - u) * 0.8, 0, 0, 0.5, i * 0.1); }
    if (!p.dead && Math.hypot(p.x - z.x, p.z - z.z) < R) {
      p.hp = Math.min(p.maxHp, p.hp + def.heal * dt);
      this.fontZone = def.regen;
      this.shelter = def.shelter || 0;
    }
    const inside = within(sim, z.x, z.z, R);
    for (const f of inside) {
      const a = this.affOf(f);
      a.slow = Math.max(a.slow, 0.5);
      // Hallowed Ground: the dead are pushed back out of it.
      if (def.hallow && risen(f)) { const L = Math.hypot(f.x - z.x, f.z - z.z) || 1; this.shove(f, (f.x - z.x) / L * 26 * dt, (f.z - z.z) / L * 26 * dt); }
    }
    z.tickT -= dt;
    if (z.tickT > 0 || k < 0.3) return;
    z.tickT = 0.5;
    for (const f of inside) this.hurt(sim, f, def.dps * 0.5 * (def.hallow || 1), ELEM.LIGHT, f.x, chestOf(f), f.z, f.x, f.z, 2);
  };

  // ---- Monolith: a slab of stone up under one of them. ----
  P.field_monolith = function (def, sim) {
    const c = this.groundAim(sim, def.range, [0, 0, 0]), p = sim.player, L = Math.hypot(c[0] - p.x, c[2] - p.z) || 1;
    this.zones.push({ kind: 'monolith', def, x: c[0], y: c[1], z: c[2], dx: (c[0] - p.x) / L, dz: (c[2] - p.z) / L, t: 0, life: 1.3 + (def.rubble || 0) + (def.topple ? 0.5 : 0), struck: false, fell: false, seed: Math.random() });
  };
  P.zone_monolith = function (z, dt, sim) {
    const def = z.def, e = def.elem, rise = smooth(z.t / 0.1), stands = 1.3 + (def.topple ? 0.5 : 0), sink = smooth((z.t - stands + 0.5) / 0.5), H = 4.2;
    // Toppling: after it has stood a moment it falls away from you, onto whatever is along its length.
    const lean = def.topple ? smooth((z.t - 0.55) / 0.35) : 0, ang = lean * 1.5, ay = Math.cos(ang), ah = Math.sin(ang);
    this.fx(FX.SPIKE, e, z.x, z.y - H * (1 - rise + sink) - 0.1, z.z, 0.95, z.dx * ah, ay, z.dz * ah, H + 0.1, 1, z.t < 0.25 ? 8 : 0, 7, clamp(z.t / 0.7, 0, 1), z.seed);
    for (const side of [-1, 1]) this.fx(FX.SPIKE, e, z.x - z.dz * side * 0.8, z.y - H * 0.5 * (1 - rise + sink) - 0.1, z.z + z.dx * side * 0.8, 0.5, z.dx * ah - z.dz * side * 0.2, ay, z.dz * ah + z.dx * side * 0.2, H * 0.5, 1, 0, 0, clamp(z.t / 0.7, 0, 1), z.seed + side);
    if (z.t >= stands && !def.rubble) return false;
    if (!z.struck && z.t >= 0.08) {
      z.struck = true;
      const caught = within(sim, z.x, z.z, def.radius).sort((u, v) => Math.hypot(u.x - z.x, u.z - z.z) - Math.hypot(v.x - z.x, v.z - z.z));
      caught.forEach((f, i) => {
        // The one it came up under takes all of it; those beside it, a share.
        this.hurt(sim, f, def.dmg * (i ? def.splash : 1), e, f.x, f.y + 0.5, f.z, z.x, z.z, i ? 40 : 120, 'puncture');
        this.shove(f, (f.x - z.x) * 1.5, (f.z - z.z) * 1.5, i ? 4 : def.launch);
        if (!i) this.stunFor(sim, f, def.stun);
      });
      sim.event(EV.SPELL_BOOM, e, z.x, z.y + 0.5, z.z, 3.5);
      this.burst(FX.RING, e, z.x, z.y + 0.05, z.z, 0.5, 3.4, 0.45);
      for (let i = 0; i < 5; i++) { const a = Math.random() * TAU; this.burst(FX.PUFF, e, z.x + Math.cos(a), z.y + 0.4, z.z + Math.sin(a), 0.6, 1.8, 1, { alpha: 0.5, ease: 2 }); }
      sim.player.trauma = Math.min(1, sim.player.trauma + 0.4);
    }
    if (def.topple && !z.fell && lean >= 1) {
      z.fell = true;
      for (const f of foes(sim)) {
        const fx = f.x - z.x, fz = f.z - z.z, along = fx * z.dx + fz * z.dz, off = Math.abs(fx * z.dz - fz * z.dx);
        if (along < -0.5 || along > 7 || off > 1.3 + radiusOf(f) * 0.5) continue;
        this.hurt(sim, f, def.dmg * def.topple, e, f.x, chestOf(f), f.z, z.x, z.z, 90, 'puncture');
        this.stunFor(sim, f, 0.6);
      }
      for (let i = 1; i <= 4; i++) this.burst(FX.RING, e, z.x + z.dx * i * 1.6, z.y + 0.05, z.z + z.dz * i * 1.6, 0.4, 2, 0.4);
      sim.event(EV.SPELL_BOOM, e, z.x + z.dx * 3.5, z.y + 0.3, z.z + z.dz * 3.5, 3);
      sim.player.trauma = Math.min(1, sim.player.trauma + 0.3);
    }
    // Broken Ground: the slab goes back down and leaves the ground it broke, low enough to see over, slowing what crosses it.
    if (def.rubble && z.t > stands - 0.5) {
      const k = smooth((z.t - stands + 0.5) / 0.4) * smooth((z.life - z.t) / 0.8), R = 4;
      this.fx(FX.DISC, e, z.x, z.y, z.z, R, 0, 1, 0, 0, 0.8 * k, 0, 0, z.t / z.life, z.seed);
      for (let i = 0; i < 9; i++) { const a = i * 2.399 + z.seed * 6, r = R * Math.sqrt((i + 0.5) / 9), x = z.x + Math.cos(a) * r, c = z.z + Math.sin(a) * r; this.fx(FX.SPIKE, e, x, sim.world.height(x, c) - 0.25, c, 0.2, Math.cos(a) * 0.5, 0.8, Math.sin(a) * 0.5, (0.45 + 0.3 * hash(i)) * k, 1, 0, 0, 1, z.seed + i); }
      for (const f of within(sim, z.x, z.z, R)) { const a = this.affOf(f); a.slow = Math.max(a.slow, 0.5); }
    }
  };

  // ================================================================ bolts

  // ---- Cinder Brand: a coal that brands what it strikes, burns down and bursts (Casting.zone_doom, fire's colours). ----
  P.fly_bomb = function (b, dx, dy, dz, sp) {
    this.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size * (0.9 + 0.2 * Math.sin(b.age * 30)), 0, 1, 0, 0, 1, 12, 8, 0, b.seed);
    this.fx(FX.FLARE, b.elem, b.x, b.y, b.z, b.size * 2, 0, 1, 0, 0, 0.5, 0, 0, 0.5, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.6, -dx, -dy, -dz, Math.min(b.age * sp, 1.6), 0.8, 0, 0, 0, b.seed);
  };
  P.hit_bomb = function (b, sim, foe) {
    sim.event(EV.SPELL_BOOM, b.elem, b.x, b.y, b.z, 0.7);
    this.burst(FX.FLARE, b.elem, b.x, b.y, b.z, 0.2, 0.8, 0.2, { light: 8, lightR: 5 });
    if (!foe) return;
    this.affOf(foe).burn = Math.max(this.affOf(foe).burn, b.def.fuse);
    this.markDoom(foe, b.def, 0);
  };

  // ---- Stone Shard: a fist of rock that staggers what it strikes. ----
  P.fly_stone = function (b, dx, dy, dz) {
    this.fx(FX.ROCK, b.elem, b.x - dx * b.size, b.y - dy * b.size, b.z - dz * b.size, b.size, dx, dy, dz, b.size * 2, 1, 3, 4, 0.5, b.seed);
  };
  P.hit_stone = function (b, sim, foe, dx, dy, dz) {
    const { x, y, z, def, elem } = b;
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.9);
    this.burst(FX.SHOCK, elem, x, y, z, 0.15, 0.9, 0.2);
    for (let i = 0; i < 3; i++) this.burst(FX.PUFF, elem, x, y, z, 0.2, 0.7, 0.5, { alpha: 0.5 });
    if (!foe) return;
    this.hurt(sim, foe, def.dmg, elem, x, y, z, x - dx, z - dz, 80, 'puncture');
    this.shove(foe, dx * def.knock, dz * def.knock, 0.8);
    if (def.stun) this.stunFor(sim, foe, def.stun);
    // Fragmentation: it breaks, and the pieces fly on into those near.
    const seen = new Set([foe]);
    for (let i = 0; i < (def.frag || 0); i++) {
      const n = this.nearestFoe(sim, x, y, z, 4.5, seen);
      if (!n) break;
      seen.add(n);
      const c = chestOf(n), L = Math.hypot(n.x - x, c - y, n.z - z) || 1;
      this.hurt(sim, n, def.dmg * 0.4, elem, n.x, c, n.z, x, z, 30);
      this.burst(FX.BEAM, elem, x, y, z, 0.06, 0.02, 0.16, { ax: (n.x - x) / L, ay: (c - y) / L, az: (n.z - z) / L, len: L, extra: 0.05 });
      this.burst(FX.SHOCK, elem, n.x, c, n.z, 0.1, 0.6, 0.18);
    }
  };

  // ---- Frozen Orb: a slow globe of ice through the fight, throwing shards all round, that bursts at the end. ----
  P.fly_orb = function (b, dx, dy, dz, sp, dt, sim) {
    const def = b.def, e = b.elem, g = smooth(b.age / 0.3);
    this.fx(FX.ORB, e, b.x, b.y, b.z, b.size * g, 0, 1, 0, 0, 1, 20, 12, 0, b.seed);
    this.fx(FX.RING, e, b.x, b.y, b.z, b.size * 1.7 * g, 0, 1, 0, 0, 0.6, 0, 0, b.age * 2 % 1, b.seed);
    for (let i = 0; i < 4; i++) { const a = b.age * 7 + i * 1.571; this.fx(FX.ICE, e, b.x + Math.cos(a) * b.size * 1.1, b.y, b.z + Math.sin(a) * b.size * 1.1, 0.06, Math.cos(a), 0.2, Math.sin(a), 0.5, 1, 0, 0, 0, i * 0.3); }
    for (const f of within(sim, b.x, b.z, b.size + 0.8)) { const a = this.affOf(f); a.slow = Math.max(a.slow, def.chill); }
    b.sprayT = (b.sprayT ?? 0.15) - dt;
    while (b.sprayT <= 0) {
      b.sprayT += def.every;
      b.ang = (b.ang || b.seed * TAU) + 2.399;
      // (Every fourth shard goes for someone in reach, turn about; the rest fly out all round.)
      const near = (b.shot = (b.shot || 0) + 1) % 4 === 1 ? within(sim, b.x, b.z, 9) : [], f = near[(b.shot >> 2) % (near.length || 1)];
      if (f) b.ang = Math.atan2(f.z - b.z, f.x - b.x);
      const cx = Math.cos(b.ang), cz = Math.sin(b.ang);
      this.bolts.push({ def: { ...def, key: 'frost', dmg: def.shard, shards: 1, pierce: false, ghost: false, snap: 0 }, elem: e, x: b.x + cx * b.size, y: b.y, z: b.z + cz * b.size, vx: cx * 24, vy: 0.4, vz: cz * 24, age: 0, size: 0.2, power: 1, grav: 0, through: null, seed: Math.random(), lashT: 0, maxAge: 0.42 });
    }
  };
  P.hit_orb = function (b, sim) {
    const { x, y, z, def, elem } = b;
    const caught = within(sim, x, z, def.radius);
    this.explode(sim, x, y, z, def.radius, def.dmg, elem, 4);
    for (const f of caught) { const a = this.affOf(f); a.slow = Math.max(a.slow, def.chill); if (def.burstFreeze) this.freezeFor(sim, f, def.burstFreeze); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, u = hash(i + b.seed); this.burst(FX.ICE, elem, x, y, z, 0.12, 0.01, 0.5, { ax: Math.cos(a), ay: u * 0.6, az: Math.sin(a), len: def.radius * (0.4 + u * 0.4) }); }
  };

  // ---- Storm Seed: a spark that sticks, and sends on any lightning that strikes there. ----
  P.fly_seed = function (b, dx, dy, dz, sp, dt, sim) { this.fly_tesla(b, dx, dy, dz, sp, dt, sim); };
  P.hit_seed = function (b, sim, foe) {
    const { x, y, z, def, elem } = b, set = this.zones.filter((q) => q.kind === 'seed');
    if (foe) this.hurt(sim, foe, def.dmg, elem, x, y, z, x, z, 8);
    sim.event(EV.SPELL_BOOM, elem, x, y, z, 0.8);
    if (set.length >= def.max) set[0].t = set[0].life;
    this.zones.push({ kind: 'seed', def, x, y: foe ? chestOf(foe) : y + 0.3, z, t: 0, life: def.hold, anchor: foe, relayAt: 0, seed: b.seed });
  };
  P.zone_seed = function (z, dt, sim) {
    const def = z.def, e = def.elem, k = smooth((z.life - z.t) / 0.5);
    if (z.anchor && !z.anchor.dead) { z.x = z.anchor.x; z.z = z.anchor.z; z.y = chestOf(z.anchor); }
    this.fx(FX.ORB, e, z.x, z.y, z.z, (0.16 + 0.06 * hash(z.t * 30)) * k, 0, 1, 0, 0, 1, 10 * k, 7, 0, z.seed);
    for (let i = 0; i < 2; i++) {
      const a = hash(z.seed + i + Math.floor(z.t * 12)) * TAU, el = hash(i * 3.1 + Math.floor(z.t * 10)) * 2 - 1, r = (1 - el * el) ** 0.5;
      this.fx(FX.BOLT, e, z.x, z.y, z.z, 0.22, Math.cos(a) * r, el, Math.sin(a) * r, 0.5 + hash(i + z.t) * 0.5, 0.7 * k, 0, 0, 0, z.seed + i + Math.floor(z.t * 14) * 0.17, 0.5);
    }
    this.fx(FX.RING, e, z.x, sim.world.height(z.x, z.z) + 0.05, z.z, def.reach, 0, 1, 0, 0, 0.18 * k, 0, 0, 0.5, z.seed);
  };
  // Lightning has struck k for this much (Casting.hurt): from any seed it bears or stands by, it leaps on to everyone in reach.
  P.relay = function (sim, k, dmg) {
    for (const z of this.zones) {
      if (z.kind !== 'seed' || z.relayAt > sim.time) continue;
      const borne = z.anchor === k, by = (!z.anchor || z.anchor.dead) && Math.hypot(k.x - z.x, k.z - z.z) < 1.8 + radiusOf(k);
      if (!borne && !by) continue;
      z.relayAt = sim.time + 0.25;
      const def = z.def, e = def.elem;
      this.relaying = true;
      for (const f of within(sim, z.x, z.z, def.reach)) {
        if (f === k && !def.live) continue;
        this.hurt(sim, f, dmg * def.relay, e, f.x, chestOf(f), f.z, z.x, z.z, 6);
        if (f !== k) this.stroke(e, z.x, z.y, z.z, f.x, chestOf(f), f.z, 0.4, 0.18);
      }
      // (Live Wire: the bearer is left charged.)
      if (def.live && !k.dead) this.affOf(k).shock = Math.max(this.affOf(k).shock, 4);
      this.relaying = false;
      this.burst(FX.SHOCK, e, z.x, z.y, z.z, 0.2, 1.6, 0.2, { light: 10, lightR: 6 });
    }
  };

  // ---- A Spirit Blade let fly at the end of its time (Blade Volley). ----
  P.fly_bladeshot = function (b, dx, dy, dz, sp) {
    this.fx(FX.BLADE, b.elem, b.x - dx * 0.6, b.y - dy * 0.6, b.z - dz * 0.6, 0.07, dx, dy, dz, 1.3, 1, 5, 5, 0, b.seed);
    this.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, 0.1, -dx, -dy, -dz, Math.min(b.age * sp, 1.8), 0.6, 0, 0, 0, b.seed);
  };
  P.hit_bladeshot = function (b, sim, foe, dx, dy, dz) {
    if (foe) { this.hurt(sim, foe, b.def.dmg, b.elem, b.x, b.y, b.z, b.x - dx, b.z - dz, 30, 'puncture'); this.shove(foe, dx * 3, dz * 3); }
    this.burst(FX.FLARE, b.elem, b.x, b.y, b.z, 0.2, 0.7, 0.16, { light: 6, lightR: 4 });
    sim.event(EV.SPELL_BOOM, b.elem, b.x, b.y, b.z, 0.6);
  };

  // ---- What Blink's and Stormstep's branches leave behind (Casting.cast_blink). ----
  P.zone_rift = function (z, dt, sim) {
    const def = z.def, e = def.elem, u = z.t / z.life;
    this.fx(FX.VORTEX, e, z.x, z.y, z.z, 0.4 + 1.1 * u, 0, 1, 0, 0, 1, 8 + 10 * u, 7, 0, z.seed);
    this.fx(FX.RING, e, z.x, z.y, z.z, 1.6 * (1 - u) + 0.3, 0, 1, 0, 0, 0.7, 0, 0, u, z.seed);
    if (z.t + dt < z.life) return;
    this.explode(sim, z.x, z.y, z.z, 4, def.dmg * def.rift, e, 6, 2);
    return false;
  };
  P.zone_wake = function (z, dt, sim) {
    const def = z.def, e = def.elem, k = smooth((z.life - z.t) / 0.6), N = Math.max(1, Math.round(z.len / 2.5));
    for (let i = 0; i < N; i++) {
      const at = z.len * i / N, x = z.x + z.dx * at, c = z.z + z.dz * at, seg = z.len / N;
      this.fx(FX.BOLT, e, x, sim.world.height(x, c) + 0.35, c, 0.35, z.dx, 0.05, z.dz, seg, 0.8 * k, i === 0 ? 8 * k : 0, 6, 0, z.seed + i + Math.floor(z.t * 14) * 0.17, 0.9);
    }
    z.tickT -= dt;
    if (z.tickT > 0) return;
    z.tickT = 0.4;
    for (const f of foes(sim)) {
      const fx = f.x - z.x, fz = f.z - z.z, along = fx * z.dx + fz * z.dz, off = Math.abs(fx * z.dz - fz * z.dx);
      if (along < 0 || along > z.len || off > 1 + radiusOf(f) * 0.5) continue;
      this.hurt(sim, f, def.dmg * 0.35, e, f.x, chestOf(f), f.z, f.x, f.z, 6);
    }
  };

  // ================================================================ what the branches add to the staffs' shots, as spells

  // Scorched Trail: the wyrm leaves the ground burning all along its way.
  const flyWyrm = P.fly_wyrm;
  P.fly_wyrm = function (b, dx, dy, dz, sp, dt, sim) {
    flyWyrm.call(this, b, dx, dy, dz, sp, dt, sim);
    if (!b.def.trail || (b.laid = (b.laid || 0) + sp * dt) < 1.5) return;
    b.laid = 0;
    const g = sim.world.height(b.x, b.z);
    if (b.y - g < 3) this.zones.push({ kind: 'burning', x: b.x, y: g, z: b.z, r: 1.2, t: 0, life: 2.5, seed: Math.random() });
  };

  // Rebirth: out of its ring of flame the phoenix rises once more and flies on.
  const hitPhoenix = P.hit_phoenix;
  P.hit_phoenix = function (b, sim, ...rest) {
    hitPhoenix.call(this, b, sim, ...rest);
    const def = b.def;
    if (!def.rebirth || b.reborn) return;
    this.bolts.push({ ...b, def: { ...def, dmg: def.dmg * def.rebirth, ringDmg: def.ringDmg * def.rebirth, heal: def.heal * def.rebirth }, y: b.y + 0.4, through: new Set(), age: 0, maxAge: def.life, firstT: undefined, reborn: true, seed: Math.random() });
  };
}
