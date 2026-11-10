// Slimes: living jelly in the wet places out past the town, after the first Bellmourn's (Agilancer/Bellmourn src/fps/slimes.js):
// the same kinds, sizes and ways of getting about, made again small for this sim.
//
//   hop   the mire, crimson, blight and ossuary slimes, and the azure jellies: crouch, spring, land in a heap and shiver; close to
//         you they pounce
//   ooze  the bog, amber, gloom and pitch slimes: pour along the ground in surges, and close over you
//
// Some of the big ones come apart into a few small ones of the same colour when they die. Spells find them as they find the
// knights: sim.foes is both (src/sim/sim.worker.js). Each lives in a camp (CAMPS) and is only about while you're near it; a camp
// wiped out fills again after a long while. The body's drawn by src/gfx/slimes.js from the snapshot's slime slots.

import { EV, MAX_SLIMES, SLIME_FLOATS, SLIMES_START } from '../core/layout.js';
import { SITES, WATERS } from '../core/lands.js';
import { ELEM } from './spells.js';

export const SLIME_KIND = 9;   // (what a slime counts as for loot, experience and the quests: items.js rollLoot, levels.js XP_OF)

export const SIZES = {
  XS: { R: 0.2, hp: 10, dmg: 3, mass: 0.35, hop: 1.3 },
  S: { R: 0.32, hp: 22, dmg: 5, mass: 0.5, hop: 1.7, ooze: 2.2 },
  M: { R: 0.5, hp: 45, dmg: 8, mass: 0.8, hop: 2.3, ooze: 2.0 },
  L: { R: 0.8, hp: 95, dmg: 12, mass: 1.3, hop: 2.9, ooze: 1.65, split: ['S', 3] },
  XL: { R: 1.25, hp: 190, dmg: 18, mass: 2.0, hop: 3.5, ooze: 1.3, split: ['M', 3] },
};
const SIZE_KEYS = Object.keys(SIZES);

// Each kind: how it moves, its body's height for its radius, which sizes split, what it shrugs off, the colour it bursts in.
// (Their colours are the renderer's: src/gfx/materials.js SLIME_LOOK, in this order.)
export const SPECIES = [
  { key: 'mire', name: 'Mire Slime', move: 'hop', h: 1.5, splits: ['L'], elem: ELEM.POISON },
  { key: 'bog', name: 'Bog Ooze', move: 'ooze', h: 0.68, splits: ['L', 'XL'], elem: ELEM.STONE },
  { key: 'azure', name: 'Azure Jelly', move: 'hop', h: 1.0, resist: { [ELEM.FROST]: 0.4 }, elem: ELEM.FROST },
  { key: 'crimson', name: 'Crimson Slime', move: 'hop', h: 1.5, splits: ['L', 'XL'], elem: ELEM.DRAIN },
  { key: 'amber', name: 'Amber Ooze', move: 'ooze', h: 0.68, resist: { [ELEM.FIRE]: 0 }, elem: ELEM.FIRE },
  { key: 'violet', name: 'Gloom Slime', move: 'ooze', h: 1.0, elem: ELEM.VOID },
  { key: 'toxic', name: 'Blight Slime', move: 'hop', h: 1.5, resist: { [ELEM.POISON]: 0 }, elem: ELEM.POISON },
  { key: 'pitch', name: 'Pitch Slime', move: 'ooze', h: 0.68, splits: ['L', 'XL'], resist: { [ELEM.FIRE]: 1.6 }, elem: ELEM.VOID },
  { key: 'ossuary', name: 'Ossuary Slime', move: 'hop', h: 1.0, splits: ['L', 'XL'], elem: ELEM.BONE },
];
const SP = Object.fromEntries(SPECIES.map((s, i) => [s.key, i]));

const lake = (k) => WATERS.find((w) => w.key === k);
// Where they live: a middle, how far round it, how many, which kinds, and how big they run (weights for XS..XL).
export const CAMPS = [
  { key: 'sallow', x: lake('sallow').x + 70, z: lake('sallow').z + 80, r: 50, n: 7, kinds: ['mire', 'bog'], sizes: [2, 3, 3, 2, 1] },
  { key: 'fen1', x: lake('fenpool1').x, z: lake('fenpool1').z, r: lake('fenpool1').r + 25, n: 5, kinds: ['bog', 'pitch'], sizes: [1, 2, 3, 2, 1] },
  { key: 'fen2', x: lake('fenpool2').x, z: lake('fenpool2').z, r: lake('fenpool2').r + 25, n: 5, kinds: ['mire', 'pitch'], sizes: [1, 2, 3, 2, 1] },
  { key: 'chapel', x: SITES.chapel.x, z: SITES.chapel.z, r: 30, n: 5, kinds: ['pitch', 'ossuary'], sizes: [0, 2, 3, 2, 1] },
  { key: 'falls', x: SITES.falls.x - 20, z: SITES.falls.z + 30, r: 35, n: 4, kinds: ['azure'], sizes: [2, 3, 2, 1, 0] },
  { key: 'millpond', x: SITES.farm.x - 60, z: SITES.farm.z - 50, r: 25, n: 5, kinds: ['mire', 'crimson'], sizes: [3, 3, 2, 1, 0] },
  { key: 'fungus', x: SITES.fungus.x, z: SITES.fungus.z, r: 30, n: 6, kinds: ['toxic', 'violet'], sizes: [1, 2, 3, 2, 1] },
  { key: 'barrows', x: SITES.barrows.x, z: SITES.barrows.z, r: 60, n: 6, kinds: ['ossuary'], sizes: [0, 2, 3, 2, 1] },
  { key: 'khel', x: SITES.khel.x, z: SITES.khel.z + 60, r: 30, n: 4, kinds: ['amber'], sizes: [1, 2, 3, 1, 0] },
  { key: 'crown', x: SITES.crown.x + 110, z: SITES.crown.z, r: 40, n: 5, kinds: ['azure', 'violet'], sizes: [0, 1, 2, 3, 2] },
];
const NEAR = 260, FAR = 380, REFILL = 600;   // (metres: a camp wakes, sleeps; seconds before a wiped camp fills again)

let nextId = 2000;

class Slime {
  constructor(camp, species, size, x, z, y) {
    const S = SIZES[size], sp = SPECIES[species];
    this.id = nextId++; this.kind = SLIME_KIND; this.camp = camp;
    this.species = species; this.size = size; this.S = S; this.sp = sp;
    this.R = S.R * (0.92 + Math.random() * 0.16);
    this.x = x; this.z = z; this.y = y; this.vx = 0; this.vz = 0; this.vy = 0;
    this.hp = S.hp; this.dead = false; this.hostile = true; this.looted = false;
    this.opts = { radius: this.R, height: this.R * sp.h, lootKind: SLIME_KIND };
    this.onGround = true; this.hopT = 1 + Math.random() * 2; this.crouch = 0;
    this.s = 1; this.sv = 0; this.flash = 0; this.aggro = false; this.biteT = 0; this.yaw = Math.random() * 6.28; this.phase = Math.random() * 6.28;
  }

  onHit(sim, kind, fromX, fromZ, poise = 20) {
    if (this.dead) return;
    this.flash = 1; this.aggro = true;
    const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1, k = Math.min(6, poise * 0.06 / this.S.mass);
    this.vx += dx / L * k; this.vz += dz / L * k;
    this.sv -= 2.5;
    if (this.hp <= 0) this.die(sim);
  }

  die(sim) {
    this.dead = true;
    sim.event(EV.SPELL_HIT, this.sp.elem, this.x, this.y + this.R * 0.5, this.z, 40 + this.R * 60);
    const sp = this.sp, split = this.S.split;
    if (split && sp.splits?.includes(this.size)) {
      for (let i = 0; i < split[1]; i++) {
        const a = i / split[1] * 6.28 + Math.random(), r = this.R * 0.8;
        const c = new Slime(this.camp, this.species, split[0], this.x + Math.cos(a) * r, this.z + Math.sin(a) * r, this.y + 0.2);
        c.vx = Math.cos(a) * 2.5; c.vz = Math.sin(a) * 2.5; c.vy = 4; c.onGround = false; c.aggro = true;
        sim.slimes.born.push(c);
      }
    }
  }

  update(sim, dt) {
    const p = sim.player, dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
    if (!p.dead && d < 15 + this.R * 4 && Math.abs(p.y - this.y) < 8) this.aggro = true;
    if (d > 45 || p.dead) this.aggro = false;
    const W = sim.world;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.biteT -= dt;
    if (this.aggro) this.yaw = Math.atan2(dx, dz);
    if (this.sp.move === 'ooze') {
      // Surges: a pour forward, a gather, another pour.
      const surge = 0.35 + 0.65 * Math.max(0, Math.sin(sim.time * 2.4 + this.phase));
      const want = (this.aggro ? 1.7 : 0.35) * (this.S.ooze || 1.5) * surge;
      const tx = this.aggro ? dx / d : Math.sin(this.yaw), tz = this.aggro ? dz / d : Math.cos(this.yaw);
      this.vx += (tx * want - this.vx) * Math.min(1, dt * 4); this.vz += (tz * want - this.vz) * Math.min(1, dt * 4);
      if (!this.aggro && Math.random() < dt * 0.3) this.yaw += (Math.random() - 0.5) * 2;
      this.s += ((0.9 + 0.2 * surge) - this.s) * Math.min(1, dt * 6);
    } else if (this.onGround) {
      this.vx *= Math.exp(-10 * dt); this.vz *= Math.exp(-10 * dt);
      this.hopT -= dt;
      if (this.hopT < 0.2 && this.hopT > 0) this.crouch = 1;
      if (this.hopT <= 0) {
        // The spring: a pounce if you're close, a wander if not.
        const pounce = this.aggro && d < 4 + this.R * 3;
        const sp = this.aggro ? (pounce ? d * 1.1 : 3.4) : 1.3;
        const a = this.aggro ? Math.atan2(dx, dz) : this.yaw + (Math.random() - 0.5) * 1.6;
        this.yaw = a;
        this.vx = Math.sin(a) * Math.min(sp, 6) * (1 + this.R * 0.4); this.vz = Math.cos(a) * Math.min(sp, 6) * (1 + this.R * 0.4);
        this.vy = 3.6 + this.S.hop * (pounce ? 1.5 : 1.1);
        this.onGround = false; this.crouch = 0; this.sv += 3;
        this.hopT = this.aggro ? 0.7 + Math.random() * 0.7 : 2 + Math.random() * 3;
      }
    }
    // (Spring of the body: it stretches as it rises and heaps as it lands.)
    const target = this.crouch ? 0.72 : !this.onGround ? 1 + Math.min(0.3, Math.max(-0.2, this.vy * 0.05)) : 1;
    this.sv += ((target - this.s) * 110 - this.sv * 9) * dt;
    this.s = Math.max(0.45, Math.min(1.6, this.s + this.sv * dt));
    // Moving, and stopped by what's solid.
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    const tmp = sim.slimes.tmp; tmp[0] = nx; tmp[2] = nz;
    W.resolve(tmp, this.R, this.y + 0.1);
    this.x = tmp[0]; this.z = tmp[2];
    const g = W.height(this.x, this.z);
    if (!this.onGround || this.sp.move === 'ooze') {
      this.vy -= 16 * dt;
      this.y += this.vy * dt;
      if (this.y <= g) {
        if (!this.onGround && this.vy < -2) { this.sv -= Math.min(6, -this.vy * 0.7); this.vx *= 0.3; this.vz *= 0.3; }
        this.y = g; this.vy = 0; this.onGround = true;
      }
    } else this.y = g;
    // Its weight on you.
    if (!p.dead && this.biteT <= 0 && d < this.R + 0.5 && p.y - this.y < this.R * this.sp.h + 0.6 && this.y - p.y < 1.4) {
      this.biteT = 1.1;
      p.damage(sim, this.S.dmg, this.x, this.z, 2.5 + this.R * 2);
      this.sv -= 2;
    }
  }
}

export class Slimes {
  constructor() {
    this.list = []; this.born = []; this.tmp = new Float32Array(3);
    this.camps = CAMPS.map((c) => ({ ...c, awake: false, cleared: -1e9 }));
    this.t = 0;
  }

  // The camps near you wake and fill; far ones sleep, taking their slimes with them. Then everyone moves.
  step(dt, sim) {
    this.t += dt;
    if ((sim.tick & 15) === 0) {
      const p = sim.player;
      for (const c of this.camps) {
        const d = Math.hypot(p.x - c.x, p.z - c.z);
        if (c.keep) continue;
        if (!c.awake && d < NEAR && this.t - c.cleared > REFILL) this.wake(c, sim);
        else if (c.awake && d > FAR) { c.awake = false; this.list = this.list.filter((s) => s.camp !== c); }
      }
    }
    for (const s of this.list) { if (!s.dead) s.update(sim, dt * sim.casting.rate(s)); if (!s.dead && s.hp <= 0) s.die(sim); }
    for (const s of this.list) {
      if (s.dead && !s.looted) { s.looted = true; sim.event(EV.LOOT, s.x, s.y, s.z, SLIME_KIND); }
    }
    if (this.born.length) { this.list.push(...this.born); this.born.length = 0; }
    if (this.list.some((s) => s.dead)) {
      this.list = this.list.filter((s) => !s.dead);
      for (const c of this.camps) if (c.awake && !c.keep && !this.list.some((s) => s.camp === c)) { c.cleared = this.t; c.awake = false; }
    }
    if (this.list.length > MAX_SLIMES) this.list.length = MAX_SLIMES;
  }

  wake(c, sim) {
    c.awake = true;
    const total = c.sizes.reduce((a, b) => a + b, 0);
    for (let i = 0; i < c.n; i++) {
      let r = Math.random() * total, k = 0;
      while (r > c.sizes[k]) { r -= c.sizes[k]; k++; }
      const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * c.r, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      this.list.push(new Slime(c, SP[c.kinds[i % c.kinds.length]], SIZE_KEYS[Math.min(4, k)], x, z, sim.world.height(x, z)));
    }
  }

  // For the Test Dungeon (src/sim/testhall.js): a camp of its own that never fills by itself, and one slime of a kind and a
  // size stood in it.
  speciesIndex(key) { return SP[key] ?? -1; }
  addCamp(o) { const c = { n: 0, kinds: [], sizes: [0, 0, 0, 0, 0], ...o, awake: true, cleared: -1e9, keep: true }; this.camps.push(c); return c; }
  spawn(camp, species, size, x, z, sim) {
    if (this.list.length >= MAX_SLIMES) return null;
    const s = new Slime(camp, species, SIZES[size] ? size : 'M', x, z, sim.world.height(x, z));
    this.list.push(s);
    return s;
  }

  // Into the snapshot: [here, x, y, z, radius, kind, stretch, lean x, lean z, flash, yaw, height for radius] each.
  write(snap) {
    for (let i = 0; i < MAX_SLIMES; i++) {
      const o = SLIMES_START + i * SLIME_FLOATS, s = this.list[i];
      if (!s) { snap[o] = 0; continue; }
      snap[o] = 1; snap[o + 1] = s.x; snap[o + 2] = s.y; snap[o + 3] = s.z; snap[o + 4] = s.R; snap[o + 5] = s.species;
      snap[o + 6] = s.s; snap[o + 7] = Math.max(-0.4, Math.min(0.4, s.vx * 0.06)); snap[o + 8] = Math.max(-0.4, Math.min(0.4, s.vz * 0.06));
      snap[o + 9] = s.flash; snap[o + 10] = s.yaw; snap[o + 11] = s.sp.h;
    }
  }
}
