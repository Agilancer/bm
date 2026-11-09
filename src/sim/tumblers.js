// Tumblers: stone that's alive. Each lies among the land's boulders (src/core/rocks.js) looking much like one of them, till you
// come close: then its cracks light, the ground shakes, it heaves itself up out of the earth, and it rolls at you. It can't turn
// quickly, so you can step aside and let it go by; it overshoots, skids round, and comes again. One that rolls hard into a wall
// or a tree is stunned a moment, and takes hurt worse. Killed, it bursts, and a big one breaks into smaller ones that roll on.
//
// How to tell one asleep: it's bare. No moss on it in the woods, no snow on it in the fells, never lying on a road; and now and
// then, close to, a slow pulse of light goes through its cracks.
//
// Every country has its own, of its own stone and its own fire, and each has a way of its own (TUMBLER_KINDS). The Weeping Fen's
// is no roller at all: the Mire Mound lies under the mud, comes up near you, spits bog that drags at your legs, and goes under
// again to come up somewhere else. And over the Green Downs, where nothing stands to hide behind, they come from the sky: a
// Crowmother and her flock circle high over you, and by threes the crows caw, bunch, and dive at you in a line. Strike the
// Crowmother and the flock scatters a while; kill her and they're gone. The renderer draws them all with the rocks' meshes and paints (src/gfx/rocks.js), turning as
// they roll. Spells find them with the knights: sim.foes (src/sim/sim.worker.js).
import { EV, MAX_TUMBLERS, TUMBLER_FLOATS, TUMBLERS_START } from '../core/layout.js';
import { routeDist } from '../core/lands.js';
import { ELEM } from './spells.js';

// What each counts as for loot and experience: items.js rollLoot, levels.js XP_OF. (Small ones as slimes; big ones as ogres.)
const LOOT_SMALL = 9, LOOT_BIG = 6;

export const TUMBLER_SIZES = {
  S: { R: 0.42, hp: 30, dmg: 7, speed: 7.2, turn: 2.6 },
  M: { R: 0.72, hp: 75, dmg: 12, speed: 6.6, turn: 2.0 },
  L: { R: 1.05, hp: 150, dmg: 18, speed: 5.8, turn: 1.6, split: ['S', 3] },
  XL: { R: 1.6, hp: 320, dmg: 28, speed: 5.0, turn: 1.2, split: ['M', 3] },
};
const SIZE_KEYS = Object.keys(TUMBLER_SIZES);

// The kinds, in the renderer's order (src/gfx/rocks.js LOOK): what it's called, the burst it dies in, and its way.
//   moss: knits itself back together whenever it's stopped.       chalk: skids round and comes again twice as fast.
//   rust: bursts into shards of iron when it dies.                cinder: rolls faster, and blows up when it dies.
//   rime: its blow chills you, slowing you a while.               barrow: rises again, once, from its grave.
//   gallows: drags you to it as it wakes.                         sorrow: brings the slope down with it, small stones rolling.
//   mire: a burrower, not a roller (see above).
export const TUMBLER_KINDS = [
  { key: 'moss', name: 'Mossback Tumbler', elem: ELEM.POISON, mend: 7 },
  { key: 'chalk', name: 'Chalk Roller', elem: ELEM.STONE, quick: true },
  { key: 'rust', name: 'Rust Tumbler', elem: ELEM.FIRE, burst: [4.5, 11] },
  { key: 'cinder', name: 'Cinder Tumbler', elem: ELEM.FIRE, speed: 1.1, burst: [3.8, 17] },
  { key: 'rime', name: 'Rime Tumbler', elem: ELEM.FROST, chill: 2.5 },
  { key: 'barrow', name: 'Barrow Cairn', elem: ELEM.BONE, hp: 1.2, rises: true },
  { key: 'gallows', name: 'Gallows Stone', elem: ELEM.VOID, speed: 1.08, drag: 2.4 },
  { key: 'sorrow', name: 'Sorrow Crag', elem: ELEM.FROST, hp: 1.3, slide: true },
  { key: 'mire', name: 'Mire Mound', elem: ELEM.POISON, hp: 1.2, burrow: true },
  { key: 'crow', name: 'Downs Crow', elem: ELEM.VOID, fly: true },
  { key: 'crowmother', name: 'Crowmother', elem: ELEM.VOID, fly: true, mother: true },
];
const KIND = Object.fromEntries(TUMBLER_KINDS.map((k, i) => [k.key, i]));

// Where they lie: by the roads through each country, where you'll come on them. (Sizes: weights for S, M, L, XL.)
export const TUMBLER_CAMPS = [
  { x: -680, z: 470, r: 40, n: 3, kind: 'moss', sizes: [1, 3, 2, 0] },
  { x: 640, z: 560, r: 40, n: 3, kind: 'moss', sizes: [1, 3, 2, 0] },
  { x: -1250, z: -1250, r: 50, n: 4, kind: 'moss', sizes: [1, 2, 3, 1] },
  { x: 1950, z: 260, r: 50, n: 4, kind: 'chalk', sizes: [2, 3, 2, 0] },
  { x: 2250, z: -300, r: 45, n: 3, kind: 'chalk', sizes: [1, 2, 2, 1] },
  { x: 3250, z: -1950, r: 50, n: 4, kind: 'rust', sizes: [1, 3, 2, 1] },
  { x: 4400, z: -1650, r: 45, n: 3, kind: 'rust', sizes: [1, 2, 2, 1] },
  { x: -3300, z: -520, r: 55, n: 5, kind: 'cinder', sizes: [2, 3, 2, 1] },
  { x: -4300, z: -1450, r: 55, n: 4, kind: 'cinder', sizes: [1, 2, 3, 1] },
  { x: 860, z: 3560, r: 55, n: 4, kind: 'rime', sizes: [1, 3, 2, 1] },
  { x: -300, z: 3450, r: 45, n: 3, kind: 'rime', sizes: [2, 2, 2, 0] },
  { x: -2480, z: 2980, r: 55, n: 4, kind: 'barrow', sizes: [1, 3, 2, 1] },
  { x: -2100, z: 4120, r: 45, n: 3, kind: 'barrow', sizes: [2, 2, 1, 0] },
  { x: 3580, z: 2800, r: 50, n: 4, kind: 'gallows', sizes: [1, 3, 2, 1] },
  { x: 4500, z: 2150, r: 45, n: 3, kind: 'gallows', sizes: [2, 2, 2, 0] },
  { x: -2330, z: -2470, r: 60, n: 3, kind: 'sorrow', sizes: [0, 1, 2, 2] },
  { x: -60, z: -3180, r: 40, n: 3, kind: 'mire', sizes: [0, 3, 1, 0] },
  { x: 420, z: -3120, r: 35, n: 2, kind: 'mire', sizes: [0, 2, 1, 0] },
  { x: -420, z: -3700, r: 45, n: 3, kind: 'mire', sizes: [0, 3, 1, 0] },
  { x: 1700, z: -150, r: 0, n: 8, kind: 'crow', flock: true },
  { x: 2500, z: 150, r: 0, n: 7, kind: 'crow', flock: true },
  { x: 1450, z: 420, r: 0, n: 6, kind: 'crow', flock: true },
];
// The flock: how big a crow, a Crowmother; how high they wheel; how fast; how often three dive, and how hard.
const CROW = { R: 0.3, hp: 14, motherR: 0.75, motherHp: 140, high: 15, motherHigh: 10, speed: 9, dive: 17, every: [3.4, 5.4], dmg: 5, scatter: 6 };
const NEAR = 240, FAR = 340, REFILL = 540;   // (metres: a camp wakes, sleeps; seconds before a cleared camp fills again)
// The Mire Mound: how far under it lies, how near you must come, how often it spits, how many before it goes down again.
const MIRE = { deep: 2.4, wake: 18, every: 1.15, spits: 3, glob: 0.22, g: 14 };

let nextId = 6000;

// (Not on a road: you'd see one lying there for what it is.)
function offRoad(x, z) {
  const rd = routeDist(x, z);
  return !rd.road || rd.d > rd.road.w + 3;
}

class Tumbler {
  constructor(camp, kind, size, x, z, y) {
    const S = TUMBLER_SIZES[size], K = TUMBLER_KINDS[kind];
    this.id = nextId++; this.camp = camp; this.kindIdx = kind; this.K = K; this.size = size; this.S = S;
    this.R = S.R * (0.92 + Math.random() * 0.16);
    const lootKind = size === 'L' || size === 'XL' ? LOOT_BIG : LOOT_SMALL;
    this.kind = lootKind;
    this.x = x; this.z = z; this.y = y; this.homeX = x; this.homeZ = z;
    this.vx = 0; this.vz = 0; this.speed = 0; this.heading = Math.random() * 6.28;
    this.hp = this.hpMax = Math.round(S.hp * (K.hp || 1)); this.dead = false; this.hostile = true; this.looted = false;
    this.opts = { radius: this.R, height: this.R * 1.5, lootKind };
    this.state = 'sleep'; this.t = 0; this.glow = 0; this.flash = 0; this.hitT = 0; this.lift = 0;
    // Its turn, as a matrix (rows), rolled as it goes.
    const a = Math.random() * 6.28, c = Math.cos(a), s = Math.sin(a);
    this.m = [c, 0, s, 0, 1, 0, -s, 0, c];
    this.variant = this.id % 4;
    // A Mire Mound starts under the mud, out of reach.
    if (K.fly) {
      this.R = K.mother ? CROW.motherR : CROW.R * (0.9 + Math.random() * 0.2);
      this.hp = this.hpMax = K.mother ? CROW.motherHp : CROW.hp;
      this.opts = { radius: this.R * 1.4, height: this.R * 1.6, lootKind };
      this.kind = LOOT_BIG; this.looted = !K.mother;
      this.state = 'circle'; this.ang = Math.random() * 6.28; this.ph = Math.random() * 6.28;
      this.cy = y + (K.mother ? CROW.motherHigh : CROW.high) + Math.random() * 3;
      this.vel = [0, 0, 0]; this.variant = 4; this.glow = 0.8;
      this.y = this.cy - this.opts.height * 0.6;
    }
    if (K.burrow) { this.state = 'under'; this.lift = -this.R * MIRE.deep; this.y += this.lift; this.hostile = false; this.spits = 0; this.dirtT = 0; }
  }

  // (Spells: casting.js hurt.)
  onHit(sim, kind, fromX, fromZ, poise = 20) {
    if (this.dead) return;
    this.flash = 1;
    if (this.state === 'sleep') this.wake(sim);
    if (this.K.mother && this.camp.flock) this.camp.flock.scatterT = CROW.scatter;
    // A hard hit checks it; it won't be pushed far.
    if (!this.K.burrow) {
      const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1, k = Math.min(3, poise * 0.03 / this.R);
      this.vx += dx / L * k; this.vz += dz / L * k;
    }
    if (this.hp <= 0) this.die(sim);
  }

  wake(sim) {
    if (this.state !== 'sleep') return;
    this.state = 'rise'; this.t = 0;
    sim.event(EV.GROUND, this.x, this.y, this.z);
    sim.event(EV.DIRT, this.x, this.y, this.z, 0.6 + this.R * 0.6);
    sim.event(EV.ALERT, this.x, this.y + this.R, this.z);
    // The ground shakes under you as it tears free.
    const p = sim.player, d = Math.hypot(p.x - this.x, p.z - this.z);
    if (d < 16) p.trauma = Math.min(1, p.trauma + 0.35 * (1 - d / 16) + 0.1 * this.R);
    // The Sorrow Crag brings stones down the slope with it.
    if (this.K.slide) this.slide(sim);
  }

  slide(sim) {
    const W = sim.world, g = 3;
    const dhx = W.height(this.x + g, this.z) - W.height(this.x - g, this.z), dhz = W.height(this.x, this.z + g) - W.height(this.x, this.z - g);
    const l = Math.hypot(dhx, dhz) || 1, ux = dhx / l, uz = dhz / l;
    for (let i = 0; i < 2; i++) {
      const side = (i - 0.5) * 6, x = this.x + ux * 9 - uz * side, z = this.z + uz * 9 + ux * side;
      if (sim.world.inside(x, z, 0.5)) continue;
      const c = new Tumbler(this.camp, this.kindIdx, 'S', x, z, W.height(x, z));
      c.state = 'roll'; c.glow = 1; c.heading = Math.atan2(-ux, -uz); c.speed = 3; c.slid = true;
      sim.tumblers.born.push(c);
    }
  }

  die(sim) {
    // The Crowmother dead, her flock flies off for good.
    if (this.K.mother && this.camp.flock) { this.camp.flock.motherDead = true; for (const c of sim.tumblers.list) if (c.camp === this.camp && !c.K.mother) { c.state = 'flee'; c.t = 0; } }
    // The Barrow Cairn goes down, and gets up again, once.
    if (this.K.rises && !this.risen) {
      this.risen = true; this.hp = Math.round(this.hpMax * 0.5); this.state = 'grave'; this.t = 0; this.speed = 0; this.glow = 0.1; this.hostile = false;
      sim.event(EV.SPELL_HIT, this.K.elem, this.x, this.y + this.R, this.z, 30 + this.R * 40);
      sim.event(EV.GROAN, this.x, this.y + this.R, this.z, this.R);
      return;
    }
    this.dead = true;
    sim.event(EV.SPELL_HIT, this.K.elem, this.x, this.y + this.R, this.z, 60 + this.R * 80);
    sim.event(EV.GROUND, this.x, this.y, this.z);
    // Rust and Cinder burst: iron shards, or a blast of embers, hurting you if you're close.
    const burst = this.K.burst;
    if (burst) {
      const [reach, dmg] = burst, p = sim.player, d = Math.hypot(p.x - this.x, p.z - this.z);
      sim.event(EV.SPELL_BOOM, this.K.elem, this.x, this.y + this.R, this.z, reach * 0.5);
      if (!p.dead && d < reach + this.R && Math.abs(p.y - this.y) < 3) p.damage(sim, Math.round(dmg * (0.5 + 0.5 * this.R)), this.x, this.z, 5);
    }
    const split = this.S.split;
    if (split && !this.K.burrow && !this.K.fly) {
      for (let i = 0; i < split[1]; i++) {
        const a = i / split[1] * 6.28 + Math.random(), r = this.R * 0.7;
        const c = new Tumbler(this.camp, this.kindIdx, split[0], this.x + Math.cos(a) * r, this.z + Math.sin(a) * r, this.y);
        c.state = 'roll'; c.glow = 1; c.heading = a; c.speed = 4; c.risen = true;
        sim.tumblers.born.push(c);
      }
    }
  }

  // Rolled through this far: the matrix turned about the axis across its way.
  roll(dist, hx, hz) {
    const ang = dist / this.R;
    if (Math.abs(ang) < 1e-5) return;
    // Axis: up x heading = (hz, 0, -hx).
    const ax = hz, az = -hx, c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    const r = [t * ax * ax + c, -s * az, t * ax * az, s * az, c, -s * ax, t * ax * az, s * ax, t * az * az + c];
    const m = this.m, o = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = r[i * 3] * m[j] + r[i * 3 + 1] * m[3 + j] + r[i * 3 + 2] * m[6 + j];
    // (Kept square, so it never drifts out of shape.)
    const n0 = Math.hypot(o[0], o[3], o[6]); o[0] /= n0; o[3] /= n0; o[6] /= n0;
    let d = o[0] * o[1] + o[3] * o[4] + o[6] * o[7];
    o[1] -= d * o[0]; o[4] -= d * o[3]; o[7] -= d * o[6];
    const n1 = Math.hypot(o[1], o[4], o[7]); o[1] /= n1; o[4] /= n1; o[7] /= n1;
    o[2] = o[3] * o[7] - o[6] * o[4]; o[5] = o[6] * o[1] - o[0] * o[7]; o[8] = o[0] * o[4] - o[3] * o[1];
    this.m = o;
  }

  update(sim, dt) {
    if (this.K.burrow) { this.updateMire(sim, dt); return; }
    if (this.K.fly) { this.updateCrow(sim, dt); return; }
    const p = sim.player, W = sim.world, K = this.K;
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.hitT -= dt;
    const wakeAt = 7 + this.R * 4;
    switch (this.state) {
      case 'sleep':
        this.glow = Math.max(0, this.glow - dt * 0.5);
        this.lift = Math.max(0, this.lift - dt);
        if (!p.dead && d < wakeAt && Math.abs(p.y - this.y) < 6) this.wake(sim);
        break;
      case 'grave':
        // (The Barrow Cairn, down: dark, sunk, then up again with its fire back.)
        this.lift = -this.R * 0.5 * Math.min(1, this.t / 0.5);
        if (this.t > 2.6) { this.state = 'rise'; this.t = 0; this.hostile = true; sim.event(EV.DIRT, this.x, this.y, this.z, 1); }
        break;
      case 'rise': {
        // Up out of the earth, shaking, its cracks catching fire.
        const f = Math.min(1, this.t / 0.9);
        this.glow = f; this.lift = Math.sin(f * Math.PI) * this.R * 0.35;
        this.roll(Math.sin(this.t * 40) * 0.02 * this.R, 1, 0);
        if (f >= 1) { this.state = 'roll'; this.t = 0; this.heading = Math.atan2(dx, dz); this.speed = 1; }
        break;
      }
      case 'roll': {
        // At where you'll be, a little ahead; it can only turn so fast.
        const lead = Math.min(0.6, d / Math.max(1, this.speed)) * 0.6;
        const want = Math.atan2(dx + (p.vx || 0) * lead, dz + (p.vz || 0) * lead);
        let da = want - this.heading;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const turn = this.S.turn * (K.quick ? 1.3 : 1) * dt * (this.speed > 4 ? 1 : 2);
        this.heading += Math.max(-turn, Math.min(turn, da));
        const top = this.S.speed * (K.speed || 1);
        this.speed = Math.min(top, this.speed + dt * 5.5);
        // Past you, it skids and comes round again.
        if (Math.abs(da) > 2.0 && d > this.R + 1.5 && this.speed > 3) { this.state = 'skid'; this.t = 0; }
        if (p.dead || d > 48) { this.state = 'home'; this.t = 0; }
        break;
      }
      case 'skid':
        this.speed = Math.max(0, this.speed - dt * (K.quick ? 15 : 9));
        if (this.speed < 0.8 || this.t > (K.quick ? 0.7 : 1.4)) { this.state = 'roll'; this.t = 0; this.heading = Math.atan2(dx, dz); this.speed = K.quick ? 2.5 : 0.5; }
        break;
      case 'stun':
        this.speed = Math.max(0, this.speed - dt * 12);
        this.glow = 0.35 + 0.25 * Math.sin(this.t * 18);
        if (this.t > 1.6) { this.state = 'roll'; this.t = 0; this.glow = 1; this.heading = Math.atan2(dx, dz); this.speed = 0.5; }
        break;
      case 'home': {
        const hx = this.homeX - this.x, hz = this.homeZ - this.z, hd = Math.hypot(hx, hz);
        this.heading = Math.atan2(hx, hz); this.speed = Math.min(3, hd);
        this.glow = Math.max(0.2, this.glow - dt * 0.3);
        if (!p.dead && d < wakeAt) { this.state = 'roll'; this.t = 0; }
        else if (hd < 1) { this.state = 'sleep'; this.speed = 0; }
        break;
      }
    }
    if (this.state === 'roll') this.glow = Math.min(1, this.glow + dt * 2);
    // The Mossback knits itself whole whenever it's still.
    if (K.mend && this.speed < 1 && this.state !== 'sleep' && this.hp < this.hpMax) this.hp = Math.min(this.hpMax, this.hp + K.mend * dt);
    // The Gallows Stone pulls you to it as it wakes, and a moment after.
    if (K.drag && !p.dead && d < 16 && (this.state === 'rise' || (this.state === 'roll' && this.t < 1.2))) {
      const k = K.drag * dt * (1 - d / 16);
      p.x -= dx / d * k; p.z -= dz / d * k;
    }
    // Moving, and stopped by what's solid.
    const hx = Math.sin(this.heading), hz = Math.cos(this.heading);
    const moving = this.state === 'roll' || this.state === 'skid' || this.state === 'home' || this.state === 'stun';
    const vx = (moving ? hx * this.speed : 0) + this.vx, vz = (moving ? hz * this.speed : 0) + this.vz;
    this.vx *= Math.exp(-6 * dt); this.vz *= Math.exp(-6 * dt);
    const tmp = sim.tumblers.tmp; tmp[0] = this.x + vx * dt; tmp[2] = this.z + vz * dt;
    const bumped = W.resolve(tmp, this.R * 0.85, this.y + 0.2);
    const moved = Math.hypot(tmp[0] - this.x, tmp[2] - this.z);
    if (moved > 1e-4) this.roll(moved, (tmp[0] - this.x) / moved, (tmp[2] - this.z) / moved);
    this.x = tmp[0]; this.z = tmp[2];
    // Rolled hard into something: stunned, and dust off it.
    if (bumped && this.state === 'roll' && this.speed > 4.5) {
      this.state = 'stun'; this.t = 0;
      sim.event(EV.GROUND, this.x + hx * this.R, this.y + this.R * 0.5, this.z + hz * this.R);
    }
    this.y = W.height(this.x, this.z) + this.lift;
    // Over you.
    if (!p.dead && this.hitT <= 0 && (this.state === 'roll' || this.state === 'skid') && this.speed > 2.5 && d < this.R + 0.55 && Math.abs(p.y - this.y) < this.R + 1.2) {
      this.hitT = 1.0;
      p.damage(sim, Math.round(this.S.dmg * Math.min(1.3, this.speed / this.S.speed)), this.x, this.z, 4 + this.R * 3);
      sim.event(EV.GROUND, p.x, p.y, p.z);
      // The Rime Tumbler's blow leaves frost in your legs.
      if (K.chill) p.miredUntil = Math.max(p.miredUntil || 0, sim.time + K.chill);
      this.speed *= 0.55;
    }
  }

  // The Mire Mound: under, up, spit, down, and away under the mud to come up somewhere else round you.
  updateMire(sim, dt) {
    const p = sim.player, W = sim.world;
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz) || 1;
    const deep = -this.R * MIRE.deep;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.hitT -= dt;
    switch (this.state) {
      case 'under':
        this.glow = 0; this.lift = deep; this.hostile = false;
        // Bubbles coming up through the mud over it, now and then, if you're near enough to see.
        this.dirtT -= dt;
        if (this.dirtT <= 0) { this.dirtT = 1.0 + Math.random() * 0.8; if (d < 40) sim.event(EV.DIRT, this.x, W.height(this.x, this.z), this.z, 0.12); }
        if (!p.dead && d < MIRE.wake && Math.abs(p.y - this.y) < 6) this.surface(sim);
        break;
      case 'up': {
        const f = Math.min(1, this.t / 0.7);
        this.lift = deep * (1 - f); this.glow = f;
        if (f >= 1) { this.state = 'spit'; this.t = 0; this.spits = 0; }
        break;
      }
      case 'spit': {
        this.glow = 0.75 + 0.25 * Math.sin(this.t * 9);
        // A wobble as it gathers, and a heave as it spits.
        this.lift = Math.sin(this.t * 7) * 0.04 * this.R;
        if (this.spits < MIRE.spits && this.t > 0.4 + this.spits * MIRE.every) { this.spit(sim); this.spits++; }
        // Too close: it slams down on you.
        if (!p.dead && this.hitT <= 0 && d < this.R + 0.9) { this.hitT = 1.2; p.damage(sim, Math.round(this.S.dmg * 0.8), this.x, this.z, 5); sim.event(EV.DIRT, this.x, this.y, this.z, 0.8); }
        if (this.t > 0.6 + MIRE.spits * MIRE.every || p.dead) { this.state = 'down'; this.t = 0; }
        break;
      }
      case 'down': {
        const f = Math.min(1, this.t / 0.6);
        this.lift = deep * f; this.glow = 1 - f;
        if (f >= 1) {
          this.hostile = false; this.state = 'burrow'; this.t = 0; this.dirtT = 0;
          // Somewhere else round you, not too near, and not far from its own ground.
          const a = Math.random() * 6.28, r = 7 + Math.random() * 5;
          let tx = p.x + Math.cos(a) * r, tz = p.z + Math.sin(a) * r;
          const hx = tx - this.homeX, hz = tz - this.homeZ, hd = Math.hypot(hx, hz);
          if (hd > 45) { tx = this.homeX + hx / hd * 45; tz = this.homeZ + hz / hd * 45; }
          this.tx = tx; this.tz = tz;
          if (p.dead || d > 45) { this.tx = this.homeX; this.tz = this.homeZ; this.homing = true; } else this.homing = false;
        }
        break;
      }
      case 'burrow': {
        // Moving under the mud: you see the ground heave where it goes.
        const hx = this.tx - this.x, hz = this.tz - this.z, hd = Math.hypot(hx, hz);
        const step = Math.min(hd, 6.5 * dt);
        if (hd > 0.01) { this.x += hx / hd * step; this.z += hz / hd * step; }
        this.dirtT -= dt;
        if (this.dirtT <= 0) { this.dirtT = 0.28; sim.event(EV.DIRT, this.x, W.height(this.x, this.z), this.z, 0.35 + this.R * 0.25); }
        if (hd < 0.3 || this.t > 3) {
          if (this.homing) { this.state = 'under'; this.t = 0; } else this.surface(sim);
        }
        break;
      }
    }
    this.y = W.height(this.x, this.z) + this.lift;
  }

  // A crow: wheeling over the flock's middle; by turns bunching, diving at you, climbing away; scattering, or fleeing for good.
  updateCrow(sim, dt) {
    const p = sim.player, W = sim.world, F = this.camp.flock, K = this.K;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    const chest = [p.x, p.y + 1.25, p.z];
    let tx = this.x, ty = this.cy, tz = this.z, speed = CROW.speed, grip = 2.2;
    const ground = W.height(this.x, this.z);
    switch (this.state) {
      case 'circle': {
        this.ang += (K.mother ? 0.32 : 0.55) * dt;
        const rad = K.mother ? 7 : 10 + 3 * Math.sin(this.ph);
        tx = F.cx + Math.cos(this.ang + this.ph) * rad; tz = F.cz + Math.sin(this.ang + this.ph) * rad;
        ty = W.height(F.cx, F.cz) + (K.mother ? CROW.motherHigh : CROW.high + 2 * Math.sin(this.ph * 3)) + Math.sin(this.t * 1.3 + this.ph) * 0.8;
        if (K.mother) speed = 7;
        this.glow = 0.8;
        break;
      }
      case 'gather':
        // It checks, rears up, and calls: you have this long to see it coming.
        speed = 4; ty = this.cy + 1.5; tx = this.x + this.vel[0]; tz = this.z + this.vel[2];
        this.glow = 1;
        if (this.t > 0.75 + this.delay) { this.state = 'dive'; this.t = 0; sim.event(EV.WHOOSH, this.x, this.cy, this.z); const d = Math.hypot(chest[0] - this.x, chest[1] - this.cy, chest[2] - this.z) || 1; this.vel = [(chest[0] - this.x) / d * 8, (chest[1] - this.cy) / d * 8, (chest[2] - this.z) / d * 8]; }
        break;
      case 'dive': {
        [tx, ty, tz] = chest; speed = CROW.dive; grip = 1.6; this.glow = 0.12;
        const d = Math.hypot(chest[0] - this.x, chest[1] - this.cy, chest[2] - this.z);
        if (!p.dead && d < 0.9 + this.R) { p.damage(sim, CROW.dmg, this.x, this.z, 1.5); this.state = 'flare'; this.t = 0; sim.event(EV.GROUND, p.x, p.y + 1.2, p.z); }
        else if (this.cy < ground + 0.7 || this.t > 2.2 || p.dead) { this.state = 'flare'; this.t = 0; }
        break;
      }
      case 'flare':
        // At the bottom of its dive it checks, wings spread, a moment within reach.
        tx = this.x + this.vel[0] * 0.1; tz = this.z + this.vel[2] * 0.1; ty = this.cy + 0.4; speed = 1.5; grip = 6; this.glow = 1;
        if (this.t > 0.35) { this.state = 'climb'; this.t = 0; }
        break;
      case 'climb':
        tx = this.x + this.vel[0] * 2; tz = this.z + this.vel[2] * 2; ty = ground + CROW.high; speed = 11; this.glow = 1;
        if (this.t > 1.8) { this.state = 'circle'; this.ang = Math.atan2(this.z - F.cz, this.x - F.cx) - this.ph; }
        break;
      case 'scatter': {
        const dx = this.x - F.cx, dz = this.z - F.cz, l = Math.hypot(dx, dz) || 1;
        tx = this.x + dx / l * 10; tz = this.z + dz / l * 10; ty = ground + CROW.high + 6; speed = 12; this.glow = 1;
        if (F.scatterT <= 0) { this.state = 'circle'; this.ang = Math.atan2(this.z - F.cz, this.x - F.cx) - this.ph; }
        break;
      }
      case 'flee': {
        const dx = this.x - p.x, dz = this.z - p.z, l = Math.hypot(dx, dz) || 1;
        tx = this.x + dx / l * 10; tz = this.z + dz / l * 10; ty = this.cy + 6; speed = 13; this.glow = 1;
        if (this.t > 4) { this.dead = true; this.looted = true; }
        break;
      }
    }
    // Steering: toward where it wants to be, at its speed, turning as a bird turns.
    const wx = tx - this.x, wy = ty - this.cy, wz = tz - this.z, wl = Math.hypot(wx, wy, wz) || 1;
    const k = Math.min(1, dt * grip);
    this.vel[0] += (wx / wl * speed - this.vel[0]) * k; this.vel[1] += (wy / wl * speed - this.vel[1]) * k; this.vel[2] += (wz / wl * speed - this.vel[2]) * k;
    this.x += this.vel[0] * dt; this.cy += this.vel[1] * dt; this.z += this.vel[2] * dt;
    this.cy = Math.max(this.cy, W.height(this.x, this.z) + 0.5);
    this.y = this.cy - this.opts.height * 0.6;
    // Facing the way it flies, banked into its turns.
    const vl = Math.hypot(...this.vel) || 1, fx = this.vel[0] / vl, fy = this.vel[1] / vl, fz = this.vel[2] / vl;
    const hl = Math.hypot(fx, fz) || 1;
    let rx = fz / hl, ry = 0, rz = -fx / hl;
    const turn = this.lastFx === undefined ? 0 : Math.max(-1, Math.min(1, (this.lastFx * fz - this.lastFz * fx) / Math.max(dt, 1e-3) * 0.35));
    this.lastFx = fx; this.lastFz = fz;
    this.bank = (this.bank || 0) + (turn - (this.bank || 0)) * Math.min(1, dt * 3);
    let ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    const cb = Math.cos(this.bank), sb = Math.sin(this.bank);
    [rx, ry, rz, ux, uy, uz] = [rx * cb + ux * sb, ry * cb + uy * sb, rz * cb + uz * sb, ux * cb - rx * sb, uy * cb - ry * sb, uz * cb - rz * sb];
    this.m = [rx, ux, fx, ry, uy, fy, rz, uz, fz];
  }

  surface(sim) {
    this.state = 'up'; this.t = 0; this.hostile = true;
    sim.event(EV.DIRT, this.x, sim.world.height(this.x, this.z), this.z, 1.0);
    sim.event(EV.ALERT, this.x, this.y + this.R, this.z);
  }

  // A glob of bog, thrown high at where you'll be.
  spit(sim) {
    const p = sim.player;
    const sx = this.x, sy = this.y + this.R * 1.3, sz = this.z;
    const d = Math.hypot(p.x - sx, p.z - sz), T = Math.max(0.55, Math.min(1.4, d / 12));
    const tx = p.x + (p.vx || 0) * T * 0.7, tz = p.z + (p.vz || 0) * T * 0.7, ty = p.y + 1.0;
    sim.tumblers.globs.push({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * MIRE.g * T * T) / T, vz: (tz - sz) / T, age: 0, from: this });
    sim.event(EV.DIRT, sx, sy - this.R * 0.5, sz, 0.4);
  }
}

export class Tumblers {
  constructor() {
    this.list = []; this.born = []; this.globs = []; this.tmp = new Float32Array(3);
    this.camps = TUMBLER_CAMPS.map((c) => ({ ...c, awake: false, cleared: -1e9 }));
    this.t = 0;
  }

  step(dt, sim) {
    this.t += dt;
    if ((sim.tick & 15) === 3) {
      const p = sim.player;
      for (const c of this.camps) {
        const d = Math.hypot(p.x - c.x, p.z - c.z);
        if (!c.awake && d < NEAR && this.t - c.cleared > REFILL) this.fill(c, sim);
        else if (c.awake && d > FAR) { c.awake = false; this.list = this.list.filter((s) => s.camp !== c); }
      }
    }
    for (const c of this.camps) if (c.flock && c.awake) this.stepFlock(c, dt, sim);
    for (const s of this.list) {
      if (s.dead) continue;
      // (Stunned, it's open: what it lost this tick, half again.)
      if (s.state === 'stun' && s.hpSeen !== undefined && s.hp < s.hpSeen) s.hp -= (s.hpSeen - s.hp) * 0.5;
      s.update(sim, dt * sim.casting.rate(s));
      if (!s.dead && s.hp <= 0) s.die(sim);
      s.hpSeen = s.hp;
    }
    this.stepGlobs(dt, sim);
    for (const s of this.list) if (s.dead && !s.looted) { s.looted = true; sim.event(EV.LOOT, s.x, s.y, s.z, s.kind); }
    if (this.born.length) { this.list.push(...this.born); this.born.length = 0; }
    if (this.list.some((s) => s.dead)) {
      this.list = this.list.filter((s) => !s.dead);
      for (const c of this.camps) if (c.awake && !this.list.some((s) => s.camp === c)) { c.cleared = this.t; c.awake = false; }
    }
    if (this.list.length > MAX_TUMBLERS) this.list.length = MAX_TUMBLERS;
  }

  // A flock's middle follows you while you're near its ground; every few seconds three of its crows dive.
  stepFlock(c, dt, sim) {
    const F = c.flock, p = sim.player;
    F.scatterT -= dt;
    const near = !p.dead && Math.hypot(p.x - c.x, p.z - c.z) < 90 && !F.motherDead;
    const gx = near ? p.x : c.x, gz = near ? p.z : c.z, gd = Math.hypot(gx - F.cx, gz - F.cz);
    if (gd > 0.1) { const s = Math.min(gd, 5 * dt); F.cx += (gx - F.cx) / gd * s; F.cz += (gz - F.cz) / gd * s; }
    for (const s of this.list) if (s.camp === c && s.state !== 'scatter' && s.state !== 'flee' && !s.K.mother && F.scatterT > 0) { s.state = 'scatter'; s.t = 0; }
    F.diveT -= dt;
    if (F.diveT <= 0) {
      F.diveT = CROW.every[0] + Math.random() * (CROW.every[1] - CROW.every[0]);
      if (!near || F.scatterT > 0 || Math.hypot(p.x - F.cx, p.z - F.cz) > 40) return;
      const free = this.list.filter((s) => s.camp === c && !s.K.mother && s.state === 'circle' && !s.dead)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 3);
      free.forEach((s, i) => { s.state = 'gather'; s.t = 0; s.delay = i * 0.22; sim.event(EV.ALERT, s.x, s.cy + 0.3, s.z); });
    }
  }

  // The Mire Mound's bog: it flies, and where it lands on you, or near, it hurts and drags at your legs.
  stepGlobs(dt, sim) {
    if (!this.globs.length) return;
    const p = sim.player, W = sim.world;
    for (const g of this.globs) {
      g.age += dt;
      g.vy -= MIRE.g * dt;
      g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
      const pd = Math.hypot(p.x - g.x, p.y + 1.0 - g.y, p.z - g.z);
      if (!p.dead && pd < 0.85) {
        p.damage(sim, 9, g.x, g.z, 2);
        p.miredUntil = Math.max(p.miredUntil || 0, sim.time + 2.5);
        sim.event(EV.DIRT, g.x, g.y, g.z, 0.7);
        g.age = 99;
        continue;
      }
      const h = W.height(g.x, g.z);
      if (g.y < h) {
        sim.event(EV.DIRT, g.x, h, g.z, 0.5);
        if (!p.dead && Math.hypot(p.x - g.x, p.z - g.z) < 1.9 && Math.abs(p.y - h) < 1.5) {
          p.damage(sim, 4, g.x, g.z, 1);
          p.miredUntil = Math.max(p.miredUntil || 0, sim.time + 1.6);
        }
        g.age = 99;
      }
    }
    this.globs = this.globs.filter((g) => g.age < 3);
  }

  fill(c, sim) {
    c.awake = true;
    if (c.flock) {
      c.flock = { cx: c.x, cz: c.z, diveT: 2, scatterT: 0, motherDead: false };
      const h = sim.world.height(c.x, c.z);
      this.list.push(new Tumbler(c, KIND.crowmother, 'M', c.x, c.z, h));
      for (let i = 0; i < c.n; i++) this.list.push(new Tumbler(c, KIND.crow, 'S', c.x + (Math.random() - 0.5) * 8, c.z + (Math.random() - 0.5) * 8, h));
      return;
    }
    const total = c.sizes.reduce((a, b) => a + b, 0);
    for (let i = 0; i < c.n; i++) {
      let r = Math.random() * total, k = 0;
      while (r > c.sizes[k]) { r -= c.sizes[k]; k++; }
      // (Somewhere it would fit: not in a wall or a tree, and not on the road.)
      let x = c.x, z = c.z;
      for (let tries = 0; tries < 12; tries++) {
        const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * c.r;
        x = c.x + Math.cos(a) * d; z = c.z + Math.sin(a) * d;
        if (!sim.world.inside(x, z, TUMBLER_SIZES[SIZE_KEYS[Math.min(3, k)]].R) && offRoad(x, z)) break;
      }
      this.list.push(new Tumbler(c, KIND[c.kind], SIZE_KEYS[Math.min(3, k)], x, z, sim.world.height(x, z)));
    }
  }

  // Wake the camp nearest (x, z) now, for review: bm.cmd (src/sim/sim.worker.js).
  debugFill(x, z, sim) {
    let best = null, bd = 1e18;
    for (const c of this.camps) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
    if (best && !best.awake) { best.cleared = -1e9; this.fill(best, sim); }
    return best;
  }

  // One tumbler of kind k and size (0 S .. 3 XL) at (x, z), asleep, for review: bm.cmd(42, k * 10 + size, x, z).
  debugSpawn(k, size, x, z, sim) {
    const c = { x, z, r: 4, n: 1, kind: TUMBLER_KINDS[k].key, sizes: [1, 1, 1, 1], awake: true, cleared: -1e9 };
    this.camps.push(c);
    // (A flock: bm.cmd(42, 90 + how many crows, x, z).)
    if (TUMBLER_KINDS[k].fly) { c.flock = true; c.n = size || 6; this.fill(c, sim); return; }
    this.list.push(new Tumbler(c, k, SIZE_KEYS[Math.min(3, size)], x, z, sim.world.height(x, z)));
  }

  // Into the snapshot: [here, x, y, z, radius, kind, glow, flash, the turn's nine, which rock] each; then the bog in flight, as
  // little Mire stones, glowing.
  write(snap) {
    let i = 0;
    for (; i < MAX_TUMBLERS; i++) {
      const o = TUMBLERS_START + i * TUMBLER_FLOATS, s = this.list[i];
      if (!s) break;
      snap[o] = 1; snap[o + 1] = s.x; snap[o + 2] = s.K.fly ? s.cy - s.R * 0.72 : s.y; snap[o + 3] = s.z; snap[o + 4] = s.R; snap[o + 5] = s.kindIdx;
      snap[o + 6] = s.glow; snap[o + 7] = s.flash;
      for (let k = 0; k < 9; k++) snap[o + 8 + k] = s.m[k];
      snap[o + 17] = s.variant;
    }
    for (const g of this.globs) {
      if (i >= MAX_TUMBLERS) break;
      const o = TUMBLERS_START + i * TUMBLER_FLOATS, a = g.age * 9, c = Math.cos(a), s = Math.sin(a);
      // (The renderer lifts each by 0.72 of its radius, to stand it on the ground: taken off again.)
      snap[o] = 1; snap[o + 1] = g.x; snap[o + 2] = g.y - MIRE.glob * 0.72; snap[o + 3] = g.z; snap[o + 4] = MIRE.glob; snap[o + 5] = KIND.mire;
      snap[o + 6] = 0.04; snap[o + 7] = 0;
      snap[o + 8] = c; snap[o + 9] = -s; snap[o + 10] = 0; snap[o + 11] = s; snap[o + 12] = c; snap[o + 13] = 0; snap[o + 14] = 0; snap[o + 15] = 0; snap[o + 16] = 1;
      snap[o + 17] = 0;
      i++;
    }
    for (; i < MAX_TUMBLERS; i++) snap[TUMBLERS_START + i * TUMBLER_FLOATS] = 0;
  }
}
