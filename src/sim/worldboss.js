// The world bosses on the sim thread (src/core/wilds.js WORLD_BOSSES says who; src/core/boss-grounds.js where). Two ways
// to meet one:
//
// - Called: now and then, out in the land, one rises at a boss ground some way off and is called across it (the page puts
//   it on the emergency ticker, the map and the tracker). It waits there a while; come within sight of its ground and it's
//   stood, and the other Tessariels come in from the far side of the clearing to fight it with you.
// - A clearing: in place of a meeting on the way (src/sim/wilds.js lookMeet), a boss ground near you with some of the
//   others already at one, its life a little down.
//
// The fight is the raid bosses' manner (as the delves' are, src/sim/delve-fights.js, but on open ground and its own clock):
// a deck of called moves made of sim.perils' marks and shots (MOVES_WB below), so the party and auto-play read them as
// they read every other; at 70% its own come in (adds) and it has more moves; at 35% again, and its last; and at the end
// of its time it loses its temper. Its adds near it mend it, a little a second, while they live: kill them.
// Everything here is a temp lair of TripoWorld's (src/sim/tripo.js), through Wilds.stand: the twelve slots are all there are.
import { EV } from '../core/layout.js';
import { townDist } from '../core/town.js';
import { countryAt } from '../core/lands.js';
import { SEALS } from '../core/sites.js';
import { BOSS, BOSS_MOVE_KEYS, WORLD_BOSSES, WILD } from '../core/wilds.js';
import { BOSS_GROUNDS } from '../core/boss-grounds.js';
import { levelTough } from '../core/tripo-monsters.js';
import { MOVES } from './moves.js';
import { ELEM } from './spells.js';
import { foeOf } from './foes.js';
import { TripoMonster } from './tripo.js';

const { FIRE, FROST, STORM, DRAIN, BONE, VOID, POISON, STONE, ARCANE, LIGHT } = ELEM;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const tall = (m) => m.opts?.height || 6;
const wildLevel = (x, z) => clamp(Math.round(3 + Math.hypot(x, z) / 270), 4, 22);

// ---- the moves ------------------------------------------------------------------------------------------------------------
// Each: (P sim.perils, F the fight, m the boss, t whom it's for, k one of its blows). clip: what it plays; at: how far into
// its secs the move goes off (0: at once, its warning over the clip). Everything that hurts is a mark or a shot.
const ring = (P, m, r0, r, fuse, dmg, elem, tag, o = {}) => P.mark({ shape: 'ring', x: m.x, z: m.z, r, r0, fuse, dmg, knock: 3, elem, from: m, tag, ...o });
export const MOVES_WB = {
  // A great blow before it, the width of its reach and then some: whoever it's facing, and anyone beside them.
  cleave: { clip: 'atk1', at: 0, secs: 1.9, go: (P, F, m, t, k) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: tall(m) * 1.5 + 3, half: 0.75, fuse: 1.6, dmg: k * 2.6, knock: 6, elem: F.elem, from: m, aim: t, lock: 0.5, tag: 'wb_cleave' }) },
  // Its tail (or its hind end), right round behind it.
  tailsweep: { clip: 'tail_whip', at: 0, secs: 1.8, go: (P, F, m, t, k) => P.mark({ shape: 'cone', ride: m, turn: Math.PI, r: tall(m) * 1.6 + 2, half: 1.4, fuse: 1.4, dmg: k * 2, knock: 7, elem: F.elem, from: m, tag: 'wb_tail', then: (q) => { q.ride = null; } }) },
  // Lines of wind out from it, four of them turning: be between them.
  gale: { clip: 'wing_buffet', at: 0, secs: 3, go: (P, F, m, t, k) => P.mark({ shape: 'cross', x: m.x, z: m.z, yaw: Math.random() * TAU, arms: 4, r: 26, w: 2.2, fuse: 1.6, dmg: k * 1.6, life: 4, spin: 0.35, touch: k * 1.1, again: 0.8, knock: 6, elem: STORM, from: m, tag: 'wb_gale' }) },
  squall: { clip: 'roar', at: 0.6, secs: 2.2, go: (P, F, m, t, k) => P.wall({ x: m.x, y: m.y + 1.2, z: m.z, from: m, yaw: yawTo(m, t), speed: 7, dmg: k * 1.4, elem: F.elem, look: 'orb', size: 0.34, life: 5, tag: 'wb_squall' }, { width: 30, n: 15, gap: 3 }) },
  skyfall: { clip: 'roar', at: 0.5, secs: 2.4, go: (P, F, m, t, k) => { for (const b of F.bodies()) P.mark({ x: b.x, z: b.z, r: 2.6, fuse: 1.6, dmg: k * 1.8, knock: 2, elem: F.elem, follow: b, lock: 0.4, tag: 'wb_skyfall' }); P.rain(m.x, m.z, 22, 10, 2.2, { r: 2.6, fuse: 1.5, dmg: k * 1.6, knock: 2, elem: F.elem, tag: 'wb_skyfall' }); } },
  flamewave: { clip: 'claw_slam', at: 0, secs: 2, go: (P, F, m, t, k) => P.wave(m.x, m.z, { speed: 9, reach: 28, touch: k * 1.8, knock: 3, elem: FIRE, from: m, r: tall(m) * 0.5, band: 1.6, tag: 'wb_flamewave' }) },
  meteors: { clip: 'roar', at: 0.4, secs: 2.4, go: (P, F, m, t, k) => P.rain(t.x, t.z, 14, 9, 2.2, { r: 3.2, fuse: 1.7, dmg: k * 2, knock: 3, life: 3, dps: k * 0.5, elem: FIRE, tag: 'wb_meteors' }) },
  // The ground opens round it: only close in under it is sound.
  magma: { clip: 'enrage', at: 0, secs: 3, go: (P, F, m, t, k) => ring(P, m, tall(m) * 0.75, 30, 2.4, k * 3, FIRE, 'wb_magma', { life: 3, dps: k * 0.9 }) },
  rimerings: { clip: 'roar', at: 0, secs: 2.4, go: (P, F, m, t, k) => P.rings(m.x, m.z, [tall(m) * 0.8, tall(m) * 1.6, tall(m) * 2.4, tall(m) * 3.2], 0.7, { fuse: 1.2, dmg: k * 1.6, knock: 3, elem: FROST, from: m, tag: 'wb_rimerings' }) },
  // The furthest of you is reached for: a line to them that pulls. (Come in to the others.)
  grasp: { clip: 'claw_rake', at: 0, secs: 2, go: (P, F, m, t, k) => { const far = F.furthest() || t; P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, far), r: gap(m, far) + 4, w: 2.4, fuse: 1.5, dmg: k * 2.4, knock: -6, elem: FROST, from: m, aim: far, lock: 0.6, tag: 'wb_grasp' }); } },
  // Cold everywhere but in the light: a pool of it set down by the boss, the one sound place.
  deepfreeze: { clip: 'roar', at: 0, secs: 3.2, go: (P, F, m, t, k) => F.lightOnly(P, m, k * 2.6, FROST, 'wb_deepfreeze') },
  voidorbs: { clip: 'roar', at: 0.5, secs: 2, go: (P, F, m, t, k) => MOVES.seekers(P, m, t, k, { n: 5, elem: VOID, speed: 6 }) },
  // It breathes in: the near ground is death; get far off.
  devour: { clip: 'enrage', at: 0, secs: 3.4, go: (P, F, m, t, k) => P.mark({ x: m.x, z: m.z, r: 17, fuse: 3, dmg: k * 3.6, knock: -8, elem: VOID, from: m, tag: 'wb_devour' }) },
  starfall: { clip: 'roar', at: 0.4, secs: 2.6, go: (P, F, m, t, k) => { for (const b of F.bodies()) P.mark({ x: b.x, z: b.z, r: 3, fuse: 1.8, dmg: k * 2, knock: 2, elem: VOID, follow: b, lock: 0.5, tag: 'wb_starfall' }); P.rain(m.x, m.z, 24, 12, 2.6, { r: 2.4, fuse: 1.6, dmg: k * 1.5, elem: VOID, tag: 'wb_starfall' }); } },
  stomp: { clip: 'jump', at: 0, secs: 2, go: (P, F, m, t, k) => MOVES.stompRings(P, m, t, k * 1.3, { r: tall(m) * 0.7, elem: F.elem }) },
  charge: { clip: 'run', at: 0, secs: 1.6, go: (P, F, m, t, k) => MOVES.ram(P, m, t, k * 1.4, { r: 24, w: 2.4, fuse: 1.3, elem: F.elem }) },
  quake: { clip: 'jump', at: 0, secs: 2, go: (P, F, m, t, k) => MOVES.quakeWave(P, m, t, k * 1.3, { reach: 26, speed: 9, elem: F.elem }) },
  avalanche: { clip: 'roar', at: 0.4, secs: 2.8, go: (P, F, m, t, k) => { P.rain(m.x, m.z, 24, 14, 3, { r: 2.8, fuse: 1.6, dmg: k * 1.8, knock: 3, elem: STONE, tag: 'wb_avalanche' }); MOVES.boulder(P, m, t, k * 1.2); } },
  blight: { clip: 'roar', at: 0, secs: 2.2, go: (P, F, m, t, k) => P.mark({ x: m.x, z: m.z, r: 4, fuse: 1.4, grow: 2.6, life: 5, band: 2, dps: k * 0.9, dmg: k * 1.2, elem: POISON, from: m, tag: 'wb_blight' }) },
  boulders: { clip: 'atk1', at: 0.5, secs: 1.8, go: (P, F, m, t, k) => { MOVES.boulder(P, m, t, k * 1.3); const o = F.furthest(); if (o && o !== t) P.later(0.4, () => { if (!m.dead) MOVES.boulder(P, m, o, k * 1.3); }); } },
  plaguetide: { clip: 'enrage', at: 0, secs: 3, go: (P, F, m, t, k) => F.lightOnly(P, m, k * 2.4, POISON, 'wb_plaguetide') },
  fissures: { clip: 'atk3', at: 0, secs: 2, go: (P, F, m, t, k) => { for (const turn of [-0.6, -0.2, 0.2, 0.6]) MOVES.fissure(P, m, t, k * 1.3, { r: 22, w: 1.6, turn: turn || 1e-6 }); } },
  bonemarch: { clip: 'atk1', at: 0.3, secs: 1.8, go: (P, F, m, t, k) => { MOVES.boneMarch(P, m, t, k); const o = F.furthest(); if (o && o !== t) MOVES.boneMarch(P, m, o, k); } },
  gravecall: { clip: 'roar', at: 0.5, secs: 2.4, go: (P, F, m, t, k) => F.callAdds(4, true) },
  spitfan: { clip: 'atk2', at: 0.3, secs: 1.6, go: (P, F, m, t, k) => MOVES.spitFan(P, m, t, k * 1.2, { n: 7 }) },
  webs: { clip: 'atk1', at: 0.3, secs: 1.6, go: (P, F, m, t, k) => { for (const b of F.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.4, dmg: k * 1, life: 6, dps: k * 0.6, elem: ARCANE, follow: b, lock: 0.3, tag: 'wb_webs' }); } },
  venompool: { clip: 'atk2', at: 0.3, secs: 1.8, go: (P, F, m, t, k) => MOVES.spitRain(P, m, t, k * 1.2, { n: 9, R: 11 }) },
  broodburst: { clip: 'roar', at: 0.5, secs: 2.4, go: (P, F, m, t, k) => F.callAdds(5, true) },
  howl: { clip: 'roar', at: 0.2, secs: 2, go: (P, F, m, t, k) => P.wave(m.x, m.z, { speed: 10, reach: 26, touch: k * 1.6, knock: 3, elem: DRAIN, from: m, r: tall(m) * 0.4, tag: 'wb_howl' }) },
  pounce: { clip: 'atk3', at: 0, secs: 1.8, go: (P, F, m, t, k) => { const far = F.furthest() || t; P.mark({ x: far.x, z: far.z, r: 4.5, fuse: 1.5, dmg: k * 3, share: true, knock: 4, elem: DRAIN, follow: far, lock: 0.5, tag: 'wb_pounce', soak: true }); } },
  bloodmoon: { clip: 'roar', at: 0, secs: 2.4, go: (P, F, m, t, k) => { F.mad = Math.max(F.mad, 1.3); P.rain(m.x, m.z, 20, 10, 2.4, { r: 2.6, fuse: 1.5, dmg: k * 1.5, elem: DRAIN, tag: 'wb_bloodmoon' }); } },
  seekers: { clip: 'roar', at: 0.5, secs: 2, go: (P, F, m, t, k) => { MOVES.seekers(P, m, t, k, { n: 3, elem: F.elem }); const o = F.furthest(); if (o && o !== t) MOVES.seekers(P, m, o, k, { n: 2, elem: F.elem }); } },
  threads: { clip: 'atk2', at: 0, secs: 1.8, go: (P, F, m, t, k) => P.mark({ shape: 'cross', x: m.x, z: m.z, yaw: yawTo(m, t), arms: 6, r: 22, w: 1, fuse: 1.4, dmg: k * 1.8, elem: ARCANE, from: m, tag: 'wb_threads' }) },
  nightmare: { clip: 'enrage', at: 0, secs: 3, go: (P, F, m, t, k) => F.lightOnly(P, m, k * 2.4, ARCANE, 'wb_nightmare') },
  bladenova: { clip: 'roar', at: 0.4, secs: 2, go: (P, F, m, t, k) => { P.nova({ x: m.x, y: m.y + 1.4, z: m.z, from: m, speed: 11, dmg: k * 1.3, elem: F.elem, look: 'blade', size: 0.3, life: 2.4, tag: 'wb_nova' }, 20); P.later(0.6, () => { if (!m.dead) P.nova({ x: m.x, y: m.y + 1.4, z: m.z, from: m, speed: 11, dmg: k * 1.3, elem: F.elem, look: 'blade', size: 0.3, life: 2.4, tag: 'wb_nova' }, 20, Math.PI / 20); }); } },
  boltwall: { clip: 'atk1', at: 0.4, secs: 1.8, go: (P, F, m, t, k) => MOVES.boltWall(P, m, t, k * 1.2, { elem: F.elem, width: 24, n: 13 }) },
  spitrain: { clip: 'roar', at: 0.4, secs: 2, go: (P, F, m, t, k) => MOVES.spitRain(P, m, t, k * 1.3, { n: 10, R: 12, elem: F.elem === STONE ? POISON : F.elem }) },
  // It goes under, and the ground heaves where each of you stands, then all round it.
  swallow: { clip: 'roar', at: 0, secs: 3, go: (P, F, m, t, k) => { for (const b of F.bodies()) P.mark({ x: b.x, z: b.z, r: 3.6, fuse: 2, dmg: k * 2.4, knock: 5, elem: STONE, follow: b, lock: 0.55, tag: 'wb_swallow' }); P.later(1.2, () => { if (!m.dead) ring(P, m, 0, tall(m) * 0.9, 1.4, k * 2, STONE, 'wb_swallow'); }); } },
  // A great blow marked on one of you, to be shared: everyone in it takes a part, one alone takes it all.
  // (Two thirds of a life of your level alone, not all of it: at nine blows' worth it killed you from full the one time the
  // others were at its far side. And four seconds, still for the last two: time for them to come across. A live run, five
  // in it: a fifth of a life each.)
  soak: { clip: 'roar', at: 0, secs: 2.6, go: (P, F, m, t, k) => { const who = F.pickSoak() || t; P.mark({ x: who.x, z: who.z, r: 4.2, fuse: 4, dmg: k * 6, share: true, soak: true, knock: 2, elem: F.elem, follow: who, lock: 0.45, tag: 'wb_soak' }); } },
  // Every one of you marked: spread out, or the marks land on each other.
  spread: { clip: 'roar', at: 0, secs: 2.6, go: (P, F, m, t, k) => { for (const b of F.bodies()) P.mark({ x: b.x, z: b.z, r: 3.4, fuse: 2.6, dmg: k * 1.6, knock: 2, elem: F.elem, follow: b, lock: 0.85, tag: 'wb_spread' }); } },
};
// (Every move named in WORLD_BOSSES has its working here, and its call in BOSS_MOVES: tests/worldboss.test.mjs.)

export class WorldBosses {
  constructor(sim, wilds) {
    this.sim = sim; this.w = wilds;
    this.reset();
  }

  reset() {
    this.fight = null;           // the fight on now, or a called one waiting at its ground
    this.nextCall = (this.sim.time || 0) + rnd(...BOSS.first);
    this.lastClearing = -1e9;
    this.lastKey = '';
    this.want = this.want || [];   // the Heralds your quests are waiting on: [{ key, at }] (setWant)
    this.wantT = 0;
  }

  // From the render thread (src/folk/quests.js wantedBosses, by src/main.js): the world bosses a quest of yours is waiting
  // on, each with the ground it's to rise at. One newly wanted rises there soon.
  setWant(list) {
    const was = this.want.map((w) => w.key).join();
    this.want = (list || []).filter((w) => WORLD_BOSSES.some((b) => b.key === w.key) && BOSS_GROUNDS.some((g) => g.key === w.at));
    // (Its level: the quest's, less nothing; or yours less two, if that's more. Not the land's: src/folk/quests.js wantedBosses.)
    if (this.want.map((w) => w.key).join() !== was && this.wantT !== Infinity) this.wantT = Math.min(this.wantT, (this.sim.time || 0) + BOSS.wantFirst);
  }

  get busy() { return !!this.fight?.on; }

  note(s) { this.w.note(`boss: ${s}`); }

  // Once a tick.
  step(dt) {
    const sim = this.sim, F = this.fight;
    if (F) { if (F.on) this.stepFight(F, dt); else if ((this.waitT = (this.waitT || 0) - dt) <= 0) { this.waitT = 1; this.stepWaiting(F); } return; }
    if ((this.callT = (this.callT || 0) - dt) > 0) return;
    this.callT = 2;
    const p = sim.player;
    // A Herald a quest of yours is waiting on: risen at the quest's own ground soon after it's asked, once you're within a
    // walk of it (not before: the land's other world bosses aren't held up by a quest you've left for later), and risen
    // again a while after it's gone back unfought (done). It waits longer than the others, and goes back if you go off.
    if (this.want.length && sim.time >= this.wantT && !p.dead && townDist(p.x, p.z) >= 300 && !this.w.tear && !this.w.raid) {
      for (const W of this.want) {
        const i = WORLD_BOSSES.findIndex((b) => b.key === W.key), g = BOSS_GROUNDS.find((q) => q.key === W.at);
        if (i < 0 || !g || Math.hypot(g.x - p.x, g.z - p.z) > BOSS.wantNear) continue;
        this.wantT = Infinity; this.call(i, g, BOSS.wantWait, W.lvl); this.fight.wanted = true; this.note(`${W.key} wanted at ${W.at}`);
        return;
      }
    }
    if (sim.time < this.nextCall || this.w.tear || this.w.raid || this.w.meet) return;
    if (p.dead || townDist(p.x, p.z) < 300) { this.nextCall = sim.time + 30; return; }
    this.call();
  }

  // ---- who and where -----------------------------------------------------------------------------------------------------
  // A boss for a ground: one whose countries take it in (not the last one called), its level the land's, or the boss's own
  // least, or yours less two, whichever's highest.
  bossFor(g) {
    const c = g.country || countryAt(g.x, g.z), list = WORLD_BOSSES.filter((b) => b.countries.includes(c) && b.key !== this.lastKey);
    const B = pick(list.length ? list : WORLD_BOSSES.filter((b) => b.key !== this.lastKey));
    return B;
  }
  levelAt(B, x, z) { return clamp(Math.max(B.lvl, wildLevel(x, z), (this.sim.level | 0) - 2), 4, 200); }

  // Called across the land: a ground some way off, and a boss for it.
  call(force = -1, at = null, wait = BOSS.wait, want = 0) {
    const sim = this.sim, p = sim.player;
    const near = BOSS_GROUNDS.filter((g) => { const d = Math.hypot(g.x - p.x, g.z - p.z); return d > BOSS.reach[0] && d < BOSS.reach[1]; });
    const g = at || (near.length ? pick(near) : null);
    if (!g) { this.nextCall = sim.time + 120; return false; }
    const B = force >= 0 ? WORLD_BOSSES[force] : this.bossFor(g), i = WORLD_BOSSES.indexOf(B);
    const lvl = want ? clamp(Math.max(B.lvl, want, (sim.level | 0) - 2), 4, 200) : this.levelAt(B, g.x, g.z);
    this.fight = { B, i, g, x: g.x, z: g.z, lvl, called: true, on: false, until: sim.time + wait };
    this.lastKey = B.key;
    sim.event(EV.WILD, WILD.BOSS_RISE, i, g.x, g.z, wait, 1, lvl);
    this.note(`${B.key} called at ${g.key} (level ${lvl})`);
    return true;
  }

  // In place of a meeting: the nearest ground within reach, and the others already at its boss. True if it was.
  clearing(force = false) {
    const sim = this.sim, p = sim.player;
    if (this.fight || (!force && (sim.time - this.lastClearing < BOSS.clearingGap || Math.random() > BOSS.clearing))) return false;
    if (this.w.room() < 8 || !sim.heroWorld?.free?.(3)) return false;
    let g = null, bd = 480;
    for (const q of BOSS_GROUNDS) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d > 110 && d < bd) { bd = d; g = q; } }
    if (!g) return false;
    const B = this.bossFor(g), i = WORLD_BOSSES.indexOf(B), lvl = this.levelAt(B, g.x, g.z);
    this.lastClearing = sim.time; this.lastKey = B.key;
    this.fight = { B, i, g, x: g.x, z: g.z, lvl, called: false, on: false, until: sim.time + 300 };
    sim.event(EV.WILD, WILD.BOSS_RISE, i, g.x, g.z, 0, 0, lvl);
    this.note(`${B.key} in a clearing at ${g.key} (level ${lvl})`);
    this.begin(this.fight, BOSS.start);
    return true;
  }

  // Waiting at its ground: stood up as you come within sight; gone back into the ground if nobody comes.
  stepWaiting(F) {
    const sim = this.sim, p = sim.player;
    const far = F.wanted && Math.hypot(p.x - F.x, p.z - F.z) > BOSS.wantNear + 400;
    if (sim.time > F.until || far) { sim.event(EV.WILD, WILD.BOSS_GONE, F.i, 0); this.note(`${F.B.key} went unfought${far ? ' (you went off)' : ''}`); this.done(); return; }
    if (!p.dead && Math.hypot(p.x - F.x, p.z - F.z) < BOSS.see && !this.w.tear && !this.w.raid) {
      // (Whatever meeting's on is let go: this is bigger.)
      if (this.w.meet) { for (const l of this.w.meet.lairs) this.w.drop(l); this.w.meet = null; }
      if (this.w.room() < 6) return;
      this.begin(F, 1);
    }
  }

  // Stood up: the boss on its ground, the others coming in from the far side of it.
  begin(F, life) {
    const sim = this.sim, p = sim.player, B = F.B, lt = levelTough(F.lvl);
    F.on = true; F.t0 = sim.time; F.phase = 1; F.moveT = 4; F.deck = []; F.mad = 1; F.enraged = false; F.hit = false; F.lostT = 0; F.adds = []; F.addT = 0;
    F.elem = B.elem; F.life = life; F.m = null;
    const n = Math.round(rnd(...(F.called ? BOSS.help : BOSS.clearHelp)));
    // (Their life by how many are at it: more of the others, more of it to get through. src/core/wilds.js BOSS.hp.)
    F.tough = { hp: lt.hp * BOSS.hp * (1 + 0.15 * n), damage: lt.damage };
    F.lair = this.w.stand({ tag: 'wboss', x: F.x, z: F.z, r: 1, boss: [B.id], n: 0, side: 'boss', tricks: false, tough: F.tough, set: (m) => {
      m.opts.sight = 34; m.opts.leash = 40; m.opts.roam = 1; m.worldBoss = F; F.m = m;
      m.hp = m.maxHp * F.life;
      if (!F.called) m.aggro = true;
      // (The page's bar over the screen is on its body: src/ui/party.js showWorldBoss.)
      sim.event(EV.WILD, WILD.BOSS_FIGHT, F.i, m.id, F.phase, F.help?.length || 0);
    } });
    // The others: from the far side of the ground (called), or in it already (a clearing).
    const a = Math.atan2(F.x - p.x, F.z - p.z), from = F.called ? [F.x + Math.sin(a) * 34, F.z + Math.cos(a) * 34] : [F.x + Math.sin(a) * 9, F.z + Math.cos(a) * 9];
    F.help = sim.heroWorld?.answer?.(F.x, F.z, n, from, B.key, 60) || [];
    sim.event(EV.WILD, WILD.BOSS_FIGHT, F.i, -1, 1, F.help.length);
    this.note(`${B.key} stood (life ${Math.round(life * 100)}%), ${F.help.length} came`);
  }

  // Where the fight wants a body now, as a delve fight's order (src/sim/dungeon.js order): into a mark that's to be shared
  // (soak) or the pool of light (lightOnly), the nearest down within 30 m of them, before it lands, if they're not in one
  // already. { to: [x, z], urgent } or null. The party (src/sim/hero.js companion) and the others at it (think) go; auto-play
  // reads the same marks as posted (src/ui/autowarrens.js tactics). Without it the one a share was marked on took it all.
  order(b) {
    const F = this.fight;
    if (!F?.on || !F.m || F.m.dead || Math.hypot(b.x - F.x, b.z - F.z) > 46) return null;
    let best = null, bd = 30;
    for (const k of this.sim.perils.marks) {
      if (!k.soak || k.dead || k.t >= k.fuse || !k.tag.startsWith('wb_')) continue;
      const d = Math.hypot(k.x - b.x, k.z - b.z);
      if (d < k.r - 1.2) return null;
      if (d < bd) { bd = d; best = k; }
    }
    return best ? { to: [best.x, best.z], urgent: true } : null;
  }

  // Everyone who can be hurt here: you, and the others, within the fight's ground.
  bodies() { const F = this.fight; return this.sim.perils.victims().filter((v) => Math.hypot(v.x - F.x, v.z - F.z) < 46); }
  furthest() { const m = this.fight?.m; let best = null, bd = 6; for (const b of this.bodies()) { const d = gap(b, m); if (d > bd) { bd = d; best = b; } } return best; }
  // (Not the one it's on: someone else, for the share. You, half the time you're in it.)
  pickSoak() { const F = this.fight, list = this.bodies(), on = F.m ? foeOf(F.m, this.sim) : null, p = this.sim.player; if (!p.dead && list.includes(p) && Math.random() < 0.5) return p; const rest = list.filter((b) => b !== on); return rest.length ? pick(rest) : list[0]; }
  // Everything but a pool of light by it: the pool a soak (stand in it), the rest a mark that lands late.
  lightOnly(P, m, dmg, elem, tag) {
    const F = this.fight, a = Math.random() * TAU, lx = m.x + Math.sin(a) * (tall(m) * 0.9 + 6), lz = m.z + Math.cos(a) * (tall(m) * 0.9 + 6);
    P.mark({ x: lx, z: lz, r: 4.5, fuse: 3.4, dmg: 0, soak: true, elem: LIGHT, tag: `${tag}_light` });
    P.mark({ x: F.x, z: F.z, r: 46, fuse: 3.4, dmg, knock: 2, elem, from: m, tag, spare: (v) => Math.hypot(v.x - lx, v.z - lz) < 4.7 });
  }

  // Its own, called in round it.
  callAdds(n, near = false) {
    const F = this.fight, m = F.m;
    if (!m || this.w.room() < 2) return;
    const lt = levelTough(F.lvl), a = Math.random() * TAU, r = near ? tall(m) * 0.8 + 3 : 14;
    const lair = this.w.stand({ tag: 'wadds', x: m.x + Math.sin(a) * r, z: m.z + Math.cos(a) * r, r: 5, pick: F.B.adds, n: Math.min(n, this.w.room() - 1), side: 'boss', tricks: F.lvl >= 9,
      tough: { hp: lt.hp * 1.2, damage: lt.damage * 0.9 }, set: (q) => { q.opts.sight = 50; q.opts.leash = 80; q.aggro = true; q.idleT = 0; } });
    F.adds.push(lair);
    this.sim.event(EV.WILD, WILD.BOSS_CALL, F.i, BOSS_MOVE_KEYS.indexOf('adds'));
  }

  stepFight(F, dt) {
    const sim = this.sim, p = sim.player, m = F.m, P = sim.perils;
    if (!m) {
      // (Still being stood: its body loading. If it never comes, let it go.)
      if (sim.time - F.t0 > 20) { this.w.drop(F.lair); sim.event(EV.WILD, WILD.BOSS_GONE, F.i, 1); this.done(); }
      return;
    }
    const d = Math.hypot(p.x - F.x, p.z - F.z);
    if (sim.time - (m.playerHitT ?? -1e9) < 3) F.hit = true;
    if (m.dead) {
      sim.event(EV.WILD, WILD.BOSS_DOWN, F.i, m.x, sim.world.height(m.x, m.z), m.z, F.lvl, F.hit ? 1 : 0);
      this.note(`${F.B.key} down (${F.hit ? 'yours too' : 'theirs'})`);
      for (const l of F.adds) this.w.drop(l);
      const help = F.help;
      sim.heroWorld?.later?.(rnd(8, 14), () => sim.heroWorld?.sendBack?.(help));
      sim.heroWorld?.cheer?.(help);
      this.done(true);
      return;
    }
    // Left, or beaten: gone back where it came from, whole.
    F.lostT = p.dead || d > BOSS.leave ? F.lostT + dt : 0;
    if (F.lostT > (p.dead ? 8 : 25)) {
      this.w.drop(F.lair); for (const l of F.adds) this.w.drop(l);
      sim.heroWorld?.sendBack?.(F.help);
      sim.event(EV.WILD, WILD.BOSS_GONE, F.i, p.dead ? 2 : 1);
      this.note(`${F.B.key} left (${p.dead ? 'beat you' : 'you went'})`);
      this.done();
      return;
    }
    // Kept to its ground: pulled out of it, it goes back.
    if (Math.hypot(m.x - F.x, m.z - F.z) > 30) { m.home[0] = F.x; m.home[1] = F.z; }
    // Not before it's woken: by you, or by the others at it.
    if (!m.aggro) { if (d < 30 || m.heroFoe) m.notice(sim); else return; }
    const f = m.hp / m.maxHp;
    // The turns: at 70% its own, and more to its deck; at 35%, again, and its last.
    if (F.phase === 1 && f < 0.7) { F.phase = 2; F.deck = []; this.turn(F, 3); }
    else if (F.phase === 2 && f < 0.35) { F.phase = 3; F.deck = []; this.turn(F, 4); }
    // Its temper, at the end of its time.
    if (!F.enraged && sim.time - F.t0 > BOSS.enrage) {
      F.enraged = true; F.mad = Math.max(F.mad, 1.6); m.opts.damage *= 1.5;
      sim.event(EV.WILD, WILD.BOSS_CALL, F.i, BOSS_MOVE_KEYS.indexOf('enrage'));
      sim.event(EV.ROAR, m.x, m.y + tall(m), m.z, 2);
    }
    // Its adds mend it while they live near it.
    if ((F.addT -= dt) <= 0) {
      F.addT = 1;
      let near = 0;
      for (const k of sim.tripo.slots()) if (k instanceof TripoMonster && !k.dead && F.adds.includes(k.lair) && gap(k, m) < 30) near++;
      if (near) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.0025 * near);
      F.nearAdds = near;
    }
    // The deck: a move every few seconds, sooner as it goes on.
    if ((F.moveT -= dt * F.mad) > 0) return;
    const deck = F.phase === 1 ? F.B.deck : F.phase === 2 ? F.B.deck.concat(F.B.more) : F.B.deck.concat(F.B.more, F.B.last, F.B.last);
    if (!F.deck.length) F.deck = deck.slice().sort(() => Math.random() - 0.5);
    const key = F.deck.shift(), mv = MOVES_WB[key];
    const t = foeOf(m, sim);
    if (!mv || !t || t.dead || gap(m, t) > 40) { F.moveT = 1; return; }
    const clip = m.rig.clips[mv.clip] ? mv.clip : m.rig.clips.roar ? 'roar' : null;
    const k = m.opts.damage;
    if (!m.perform({ clip, face: t, at: mv.at ?? 0, secs: mv.secs ?? 2, fn: mv.at ? () => { if (!m.dead) mv.go(P, this, m, t, k); } : null })) { F.moveT = 0.5; F.deck.unshift(key); return; }
    if (!mv.at) mv.go(P, this, m, t, k);
    sim.event(EV.WILD, WILD.BOSS_CALL, F.i, BOSS_MOVE_KEYS.indexOf(key));
    F.moveT = (F.phase === 1 ? rnd(6.5, 9) : F.phase === 2 ? rnd(5.5, 8) : rnd(4.5, 6.5)) + (mv.secs ?? 2) * 0.5;
  }

  turn(F, n) {
    const sim = this.sim, m = F.m;
    sim.event(EV.WILD, WILD.BOSS_CALL, F.i, BOSS_MOVE_KEYS.indexOf('turn'));
    sim.event(EV.WILD, WILD.BOSS_FIGHT, F.i, m.id ?? -1, F.phase, F.help.length);
    sim.event(EV.ROAR, m.x, m.y + tall(m), m.z, 2);
    m.perform({ clip: m.rig.clips.enrage ? 'enrage' : 'roar', secs: 2.4, at: 1e9 });
    this.callAdds(n);
    F.moveT = 3;
  }

  done(won = false) {
    const sim = this.sim;
    this.fight = null;
    this.nextCall = sim.time + rnd(...BOSS.every) * (won ? 1 : 0.6);
    // (A Herald still wanted, gone back or not yet beaten: up again after a while. One beaten's no longer wanted, the quest
    // having moved on, by the time it'd be called.)
    if (this.wantT === Infinity) this.wantT = sim.time + BOSS.wantAgain;
    this.w.nextMeet = sim.time + rnd(40, 70);
  }

  // For looking at it (bm.wild(7, n) / bm.wild(8, n): src/sim/wilds.js debug): call boss n now at the nearest ground; or the
  // others at boss n in the nearest clearing.
  debug(a, b) {
    const sim = this.sim, p = sim.player;
    // (9: the fight's next move is the bth of BOSS_MOVE_KEYS, now.)
    if (a === 9) { const F = this.fight; if (F?.on) { F.deck.unshift(BOSS_MOVE_KEYS[b | 0]); F.moveT = 0; } return; }
    if (this.fight) { if (this.fight.lair) this.w.drop(this.fight.lair); for (const l of this.fight.adds || []) this.w.drop(l); sim.heroWorld?.sendBack?.(this.fight.help || []); this.fight = null; }
    const i = (b | 0) % WORLD_BOSSES.length;
    if (a === 7) {
      let g = null, bd = 1e9;
      for (const q of BOSS_GROUNDS) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; g = q; } }
      if (g) this.call(i, g);
    } else if (a === 8) {
      this.lastKey = ''; const was = this.bossFor; this.bossFor = () => WORLD_BOSSES[i];
      this.clearing(true); this.bossFor = was;
    }
  }
}
