// The boss fights of Blackvigil Keep, the Howling Deeps and the four delves made after them (the Drowned Vaults, the
// Sporehold, the Hollow Playhouse, the Kingsbarrow), as data (src/core/delve-*.js say who and where; src/sim/dungeon.js
// run() and play() run them). Each is in the Warrens' manner: a deck of called-out moves made
// of the named MOVES and sim.perils' pieces, something to do about each, adds at so much of its life, a turn on you, an
// enrage; and a step of its own for what's particular to it (the Unmaking, the brothers' cover, the Castellan's hall, the
// Sleeper under the ice). Everything dangerous is a mark or a shot, so the hired party and auto-play read it as they read
// the Warrens'.
//
// A move: who ('mark' one of you, 'far' whoever's furthest off, 'none'), clip (what the body plays; null if the move
// moves the body itself), at (seconds into the clip that it goes off; left out, it goes off at once and the clip plays
// over its warning), secs, warn (its call: src/core/dungeon.js WARN), go(W, f, m, t, P): W the Warrens, f the fight, m the
// boss's body, t whom it's for, P sim.perils. K(m, x) is x of one of its blows, so an enrage makes everything hit harder.
//
// The later twelve each have one thing more that isn't a mark to be out of, and say so by `order(W, f, body, live)`: where
// a body should be ({ to: [x, z], urgent }) or that it mustn't move ({ still: true }). The hired party obeys it
// (src/sim/hero.js companion), auto-play reads it from the fight as posted (src/ui/autowarrens.js tactics), and
// tools/dungeon/fight.mjs's player does as it says. A mark that's to be stood IN is `soak` (src/sim/perils.js): nobody
// is steered out of it.
import { WARN, caveClear, caveRay, caveRoom, roomOf, roomSpot, toWorld } from '../core/dungeon.js';
import { TIDE_ROCK, TIDE_STAND } from '../core/delve-vaults.js';
import { DEN_RUNS, HEART_NODES } from '../core/delve-sporehold.js';
import { DRESS_FORMS, STAGE_MARKS } from '../core/delve-playhouse.js';
import { OSSUARY_BAYS, WARDEN_COLUMNS } from '../core/delve-kingsbarrow.js';
import { EV } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { MOVES, tipBody } from './moves.js';
import { ELEM, FX } from './spells.js';

const { FIRE, FROST, ARCANE, STORM, DRAIN, BONE, VOID, POISON, SPIRIT, STONE, LIGHT } = ELEM;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
// (BITE: what's marked and thrown lands this much harder than the boss's own blow would have it. At 1 a player who never
// stepped out of anything outlived five of the seven; the Warrens kills one who stands still.)
// (Not the same for all: Sorvane and the Sleeper killed him as they were, and at 1.45 the Sleeper killed a player who
// dodged everything two times in three; the Brood Mother's venom comes too thick for that much.)
const BITE = { sorvane: 1, sleeper: 1, broodmother: 1.25 };
const K = (m, x) => m.opts.damage * x * (BITE[m.bossKey] ?? 1.45);
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const KNIGHTS = ['velscour_knight_1', 'velscour_knight_2', 'velscour_lancer', 'velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6', 'velscour_lancer_2', 'velscour_lancer_3'];
const POSSESSED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const GOATS = ['goatman_bw', 'goatman_white', 'goatman_gold_bad'];
const DEMONS = ['night_demon_black', 'night_demon_red'];

// ---- pieces more than one of them uses ------------------------------------------------------------------------------------

// A sweep of a blade: an arc in front of it, toward whoever it's for.
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.15, dmg, knock: 4, elem: o.elem ?? SPIRIT, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
// Lances down three lines, fanned.
const lances = (P, m, t, dmg, o = {}) => { for (const turn of [-0.5, 0, 0.5]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: o.r || 17, w: 0.9, fuse: 1.05, dmg, knock: 2, elem: o.elem ?? DRAIN, from: m, tag: o.tag || 'lances' }); };
// Something from the roof on each of you, and more wherever: a circle under each that follows a moment.
const fall = (W, P, m, dmg, elem, tag) => {
  for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.6, fuse: 2.1, dmg, knock: 2, elem, follow: b, lock: 0.45, tag });
  P.rain(m.x, m.z, 17, 6, 1.4, { r: 2.3, fuse: 1.8, dmg: dmg * 0.85, knock: 2, elem, tag });
};
// The body walked to a place, as its script: true once it's there. (src/sim/tripo.js runs a script in place of its own mind.)
function walkTo(k, x, z, dt, sim, speed) {
  const d = Math.hypot(x - k.x, z - k.z);
  if (d < 0.8) { k.vx = k.vz = 0; if (k.clip !== k.idleClip) k.setClip(k.idleClip); k.t = (k.t + dt) % k.rig.clips[k.clip].dur; return true; }
  const flow = k.flow;
  sim.world.updateField(x, z, sim.time, `t${k.id}`);
  sim.world.flow(flow, k.x, k.z, x, z, `t${k.id}`);
  k.vx = flow[0] * speed; k.vz = flow[1] * speed;
  k.yaw += clamp(wrapAngle(Math.atan2(flow[0], flow[1]) - k.yaw), -dt * 5, dt * 5);
  const clip = k.rig.clips.walk ? 'walk' : 'run';
  if (k.clip !== clip) k.setClip(clip);
  k.t += dt * clamp(speed / (k.rig.clips[clip].speed || 1), 0.4, 1.8);
  return false;
}

// ---- pieces the later delves' fights use ------------------------------------------------------------------------------------

// Stood where it is, doing nothing, for as long as this is its script.
const stand = (k, dt) => { k.vx = k.vz = 0; if (k.clip !== k.idleClip) k.setClip(k.idleClip); k.t = (k.t + dt) % k.rig.clips[k.clip].dur; return true; };
// Whoever isn't holding the boss, you among them.
const loose = (W) => W.bodies().filter((b) => b.role !== 'tank');
// A point of a room, in the world: its middle and so far toward (x, z), no nearer its walls than `inset`.
function within(room, x, z, inset) {
  const d = room.delve, cx = d.x + room.x, cz = d.z + room.z;
  if (room.hx !== undefined) return [clamp(x, cx - room.hx + inset, cx + room.hx - inset), clamp(z, cz - room.hz + inset, cz + room.hz - inset)];
  const dx = x - cx, dz = z - cz, L = Math.hypot(dx, dz) || 1, r = Math.min(L, room.r - inset);
  return [cx + dx / L * r, cz + dz / L * r];
}
// Somewhere open in a room, at random, no nearer its walls than `inset` (and no nearer than `off` to any of `from`).
function somewhere(room, inset, from = [], off = 0) {
  const d = room.delve, cx = d.x + room.x, cz = d.z + room.z;
  for (let t = 0; t < 30; t++) {
    let x, z;
    if (room.hx !== undefined) { x = cx + rnd(-1, 1) * (room.hx - inset); z = cz + rnd(-1, 1) * (room.hz - inset); }
    else { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * (room.r - inset); x = cx + Math.sin(a) * r; z = cz + Math.cos(a) * r; }
    if (caveRoom(x, z) < 1.6 || from.some((q) => Math.hypot(q[0] - x, q[1] - z) < off)) continue;
    return [x, z];
  }
  return [cx, cz];
}
// A mark put out at once, whatever it was doing: it's gone by the next tick.
const snuff = (mk) => { if (mk && !mk.dead) { mk.dmg = 0; mk.dps = 0; mk.touch = 0; mk.then = null; mk.quiet = true; mk.fuse = Math.min(mk.fuse, mk.t); mk.life = 0; mk.landed = true; } };
// Down a line after a wait, its yaw read as the wait ends (so a line that's still being aimed is followed): the body is
// carried `far()` metres along it in `secs`, and `done` is called as it stops.
function run(m, yawOf, far, wait, secs, done) {
  let t = 0, yaw = m.yaw, go = 0;
  const clip = m.rig.clips.run ? 'run' : 'walk';
  m.script = (k, dt) => {
    t += dt;
    if (k.dead) { k.script = null; return false; }
    if (t < wait) { yaw = yawOf(); k.vx = k.vz = 0; k.yaw += clamp(wrapAngle(yaw - k.yaw), -dt * 8, dt * 8); if (k.clip !== k.idleClip) k.setClip(k.idleClip); k.t = (k.t + dt) % k.rig.clips[k.clip].dur; return true; }
    if (!go) go = Math.max(0.5, far());
    if (t > wait + secs) { k.vx = k.vz = 0; k.script = null; k.setClip(k.idleClip); done?.(); return false; }
    k.yaw = yaw; k.vx = Math.sin(yaw) * go / secs; k.vz = Math.cos(yaw) * go / secs;
    if (k.clip !== clip) k.setClip(clip);
    k.t += dt * 1.8;
    return true;
  };
}
// A boss in the air over its room: up; so many passes, each down a strip marked first through one of you and left burning;
// then a dive onto one of you, a ring along the floor as it lands, and `land()`. (Venomaw's flight without her perch:
// src/sim/dungeon.js fly.) o: passes, elem, k (how hard), warn (its call for a strip), dive (for the dive), land.
function soar(W, f, m, o) {
  const sim = W.sim, P = sim.perils, room = roomOf(f.boss.room);
  const a = { stage: 'rise', t: 0, n: 0, pitch: 0, roll: 0, yawWas: m.yaw, line: null, spot: null };
  m.flying = true; m.state = 0; m.noTurn = true;
  m.rig.poseModifier = (rot) => tipBody(m.rig, rot, a.pitch, a.roll);
  m.script = (k, dt) => {
    a.t += dt;
    const clips = k.rig.clips, set = (n, loop = true) => { const c = clips[n] ? n : clips.fly ? 'fly' : k.idleClip; if (k.clip !== c) k.setClip(c); k.t = loop ? (k.t + dt) % clips[c].dur : Math.min(clips[c].dur, k.t + dt); };
    const turnTo = (yaw, rate) => { k.yaw += clamp(wrapAngle(yaw - k.yaw), -dt * rate, dt * rate); };
    const goTo = (x, z, left, top = 30) => { const dx = x - k.x, dz = z - k.z, d = Math.hypot(dx, dz), v = Math.min(top, d / Math.max(left, dt)); k.vx = d > 0.05 ? dx / d * v : 0; k.vz = d > 0.05 ? dz / d * v : 0; return d; };
    const lift = (to, rate) => { k.liftExtra = (k.liftExtra || 0) + clamp(to - (k.liftExtra || 0), -dt * rate, dt * rate); };
    const next = (stage) => { a.stage = stage; a.t = 0; };
    let pitch = 0;
    if (a.stage === 'rise') {
      k.vx = k.vz = 0; set(a.t < 0.9 && clips.jump ? 'jump' : 'fly', a.t >= 0.9); lift(5, 3.5);
      if (a.t > 1.8) next('aim');
    } else if (a.stage === 'aim') {
      if (!a.line) {
        // The strip: through one of you, as far each way as the room goes.
        const t = W.mark() || sim.player, ang = Math.random() * Math.PI, dx = Math.sin(ang), dz = Math.cos(ang);
        const reach = (sgn) => { let s = 0; while (s < 60 && caveRoom(t.x + dx * sgn * (s + 1), t.z + dz * sgn * (s + 1)) > 1.2) s++; return s; };
        const ends = [[t.x - dx * reach(-1), t.z - dz * reach(-1)], [t.x + dx * reach(1), t.z + dz * reach(1)]];
        if (Math.hypot(ends[1][0] - k.x, ends[1][1] - k.z) < Math.hypot(ends[0][0] - k.x, ends[0][1] - k.z)) ends.reverse();
        const len = Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]);
        a.line = { from: ends[0], to: ends[1], yaw: Math.atan2(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]) };
        P.mark({ shape: 'line', x: ends[0][0], z: ends[0][1], yaw: a.line.yaw, r: len, w: 3, fuse: 2, dmg: K(m, o.k), life: 5, dps: K(m, o.k * 0.5), elem: o.elem, from: k, tag: 'strafe' });
        W.warn(WARN[o.warn], 12);
      }
      set('fly'); lift(5, 3);
      const d = goTo(a.line.from[0], a.line.from[1], 1.7 - a.t, 26);
      turnTo(d > 2 ? Math.atan2(k.vx, k.vz) : a.line.yaw, 5);
      if (a.t >= 2) { next('swoop'); sim.event(EV.ROAR, k.x, k.y + 4, k.z, 1.4); }
    } else if (a.stage === 'swoop') {
      const secs = 1.4;
      set(clips.fly2 ? 'fly2' : 'fly'); lift(2.6, 6); pitch = 0.3;
      goTo(a.line.to[0], a.line.to[1], secs - a.t, 40); turnTo(a.line.yaw, 8);
      if ((sim.tick & 3) === 0) sim.casting.burst(FX.FLAME, o.elem, k.x, sim.world.height(k.x, k.z) + 0.2, k.z, 1.4, 3, 0.7, { alpha: 0.8, len: 2, light: 5, lightR: 8 });
      if (a.t >= secs) { a.line = null; a.n++; next(a.n < o.passes ? 'aim' : 'dive'); }
    } else {
      const fuse = 2.2;
      if (!a.spot) {
        const t = W.mark() || sim.player;
        a.spot = P.mark({ x: t.x, z: t.z, r: 7, fuse, dmg: K(m, o.k * 1.35), knock: 8, elem: o.elem, follow: t, lock: 0.5, from: k, tag: 'dive',
          then: (q) => P.wave(q.x, q.z, { speed: 11, reach: 26, touch: K(m, o.k * 0.55), knock: 3, elem: o.elem, r: 7, tag: 'diveWave' }) });
        W.warn(WARN[o.dive]);
      }
      const left = fuse - a.t;
      set(left < 0.7 && clips.land ? 'land' : 'fly', !(left < 0.7 && clips.land));
      goTo(a.spot.x, a.spot.z, Math.max(left - 0.25, 0.05), 30);
      turnTo(Math.hypot(k.vx, k.vz) > 2 ? Math.atan2(k.vx, k.vz) : k.yaw, 5);
      lift(left < 0.6 ? 0 : 6, left < 0.6 ? 14 : 3);
      pitch = left < 0.9 ? 0.45 : 0.15;
      if (left <= 0) {
        k.flying = false; k.liftExtra = 0; k.script = null; k.rig.poseModifier = null; k.vx = k.vz = 0; k.state = 0; k.noTurn = false; k.setClip(k.idleClip);
        sim.event(EV.GROUND, k.x, k.y, k.z); sim.event(EV.ROAR, k.x, k.y + 3, k.z, 1.6);
        o.land?.();
        return true;
      }
    }
    void room;
    const turned = wrapAngle(k.yaw - a.yawWas) / Math.max(dt, 1e-4);
    a.yawWas = k.yaw;
    a.pitch += (pitch - a.pitch) * Math.min(1, dt * 4);
    a.roll += (clamp(-turned * 0.22, -0.6, 0.6) - a.roll) * Math.min(1, dt * 3);
    return true;
  };
}
const DROWNED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const COMPANY = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const GUARD = ['plague_knight_black', 'plague_knight_red'];
const melee = (W, k) => { k.opts.ai = 'melee'; };

export const FIGHTS = {
  // ---- Ser Maldrec the Hollow, Warden of the Gate: the set shield, the lance down a line, and the portcullis guard ----------
  maldrec: {
    open: 'mal_open', pace: [4.6, 3.6, 0.35], turn: [19, 5], enrage: [190, 2, 'mal_enrage'],
    deck: ['shield', 'charge', 'cleave', 'quake', 'lances'],
    adds: [
      { at: 0.7, warn: 'mal_guard', n: 2, pick: KNIGHTS, from: 'doors', hp: 850, damage: 30, name: 'PORTCULLIS GUARD', tricks: true },
      { at: 0.35, warn: 'mal_guard', n: 3, pick: KNIGHTS, from: 'doors', hp: 850, damage: 30, name: 'PORTCULLIS GUARD', tricks: true },
    ],
    moves: {
      // He plants his shield and stands behind it: what's in front of it burns, and blows glance off him till he lifts it.
      shield: { who: 'none', clip: 'block', secs: 5, warn: 'mal_shield', go(W, f, m, t, P) {
        const tank = W.tank(m);
        // (shrug: the share of a blow the body takes. src/sim/casting.js, src/sim/hero.js hit.)
        m.shrug = 0.35;
        P.later(5, () => { m.shrug = 1; });
        P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: m.yaw, r: 9, half: 1.05, fuse: 1.5, dmg: K(m, 0.9), knock: 5, life: 3.4, dps: K(m, 0.8), elem: DRAIN, from: m, tag: 'shield', spare: (b) => b === tank });
      } },
      charge: { who: 'far', clip: null, warn: 'mal_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.5), { r: 20, w: 1.5, elem: DRAIN }) },
      cleave: { clip: 'atk2', secs: 1.4, warn: 'mal_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.25)) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'mal_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 24, speed: 10, elem: DRAIN }) },
      lances: { clip: 'atk1', secs: 1.3, warn: 'mal_lances', go: (W, f, m, t, P) => lances(P, m, t, K(m, 1.0)) },
    },
    // Behind him while the shield's set, for those who aren't holding him.
    stance(W, f, h, m) {
      if (!(m.shrug < 1) || h.role === 'tank') return null;
      const r = h.cls?.ranged || h.role === 'heal' ? 9 : 2.4 + m.opts.radius;
      return [m.x - Math.sin(m.yaw) * r, m.z - Math.cos(m.yaw) * r];
    },
  },

  // ---- Magister Sorvane: circles that burn on, the Unmaking that has to be broken, and the knights he raises ----------------
  sorvane: {
    open: 'sor_open', pace: [4.2, 3.2, 0.4], turn: [24, 4], enrage: [210, 2, 'sor_enrage'],
    deck: ['circle', 'bones', 'eyes', 'rings', 'wall'],
    adds: [
      { at: 0.75, warn: 'sor_raise', n: 2, pick: KNIGHTS, from: 'edge', places: 2, hp: 750, damage: 28, name: 'RISEN KNIGHT', pal: ['Ashen'], tricks: true },
      { at: 0.4, warn: 'sor_raise', n: 3, pick: KNIGHTS, from: 'edge', places: 3, hp: 750, damage: 28, name: 'RISEN KNIGHT', pal: ['Ashen'], tricks: true },
    ],
    moves: {
      circle: { clip: 'atk1', secs: 1.3, warn: 'sor_circle', go(W, f, m, t, P) {
        const two = [...new Set([t, W.farthest(m)])];
        for (const b of two) P.mark({ x: b.x, z: b.z, r: 3.2, fuse: 1.6, dmg: K(m, 1.2), life: 14, dps: K(m, 1.1), elem: VOID, follow: b, lock: 0.5, from: m, tag: 'circle' });
      } },
      bones: { clip: 'atk3', secs: 1.3, warn: 'sor_bones', go: (W, f, m, t, P) => { for (const turn of [-0.45, 0, 0.45]) P.march(m.x, m.z, yawTo(m, t) + turn, 10, 1.9, 0.14, { r: 1.25, fuse: 0.85, dmg: K(m, 1.5), knock: 2, elem: BONE, from: m, tag: 'bones' }); } },
      eyes: { clip: 'atk2', at: 0.45, secs: 1.3, warn: 'sor_eyes', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.8), { n: 4, elem: DRAIN }) },
      rings: { clip: 'atk4', secs: 1.3, warn: 'sor_rings', go: (W, f, m, t, P) => { for (const b of new Set([t, W.farthest(m)])) MOVES.frostRings(P, m, b, K(m, 0.95)); } },
      wall: { clip: 'atk5', at: 0.45, secs: 1.3, warn: 'sor_wall', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.75), { width: 18, n: 11, speed: 7.5, elem: DRAIN }) },
    },
    // The Unmaking: he stands and speaks it for six seconds. Hurt enough before the last word, it breaks and he reels;
    // else it lands on all of you. (Nothing on the floor to run from: the answer is to strike him.)
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, u = f.un;
      if (!u) {
        if (m.state !== 0 || m.script || f.turn?.m === m || !W.every(f, 'unmake', 34)) return;
        if (!m.perform({ clip: 'roar', secs: 6 })) return;
        f.un = { t: 0, hp: m.hp, ring: 0 };
        m.noTurn = true;
        W.warn(WARN.sor_unmake);
        return;
      }
      u.t += dt;
      if ((u.ring -= dt) <= 0) { u.ring = 0.5; const r = 16 * (1 - u.t / 6) + 2; sim.casting.burst(FX.RING, VOID, m.x, m.y + 0.15, m.z, r, r * 0.6, 0.5, { alpha: 0.8, light: 6, lightR: 8 }); }
      const broken = m.hp <= u.hp - m.maxHp * 0.045;
      if (!broken && u.t < 6 && !m.dead) return;
      f.un = null; m.noTurn = false;
      if (broken) {
        W.warn(WARN.sor_broken);
        // (Reeling: a few seconds when everything bites deeper.)
        m.state = 0; m.act = null; m.perform({ clip: 'hit', secs: 2.6 });
        m.shrug = 1.6; sim.perils.later(4, () => { m.shrug = 1; });
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 0.8);
      } else if (!m.dead) {
        W.warn(WARN.sor_done);
        for (const b of W.bodies()) { sim.perils.hurt(b, K(m, 3.2), m.x, m.z, 3, false, 'unmaking'); sim.casting.burst(FX.SHOCK, VOID, b.x, b.y + 1, b.z, 0.6, 2.4, 0.5, { light: 6, lightR: 6 }); }
        sim.casting.burst(FX.RING, VOID, m.x, m.y + 0.2, m.z, 2, 22, 0.7, { light: 10, lightR: 14 });
        sim.event(EV.GROUND, m.x, m.y, m.z);
      }
    },
  },

  // ---- The Hollow Brothers: one covers the other, turn about; kill order matters -----------------------------------------------
  // Ser Garrow has the sword, Ser Gault the lance. Whichever is covering takes the blows for both: the other shrugs them
  // off. Garrow left alone takes up the lance and fights on with both; Gault left alone goes berserk.
  brothers: {
    open: 'bro_open', pace: [5, 3.8, 0.3], turn: [21, 5], enrage: [230, 2, null],
    decks: {
      bv_garrow: (f) => (f.last === 'sword' ? ['whirl', 'cleave', 'blades', 'charge', 'lances'] : ['whirl', 'cleave', 'blades']),
      bv_gault: () => ['charge', 'lances', 'wall'],
    },
    moves: {
      whirl: { who: 'none', clip: null, go: (W, f, m) => W.kWhirl(f, m, WARN.bro_whirl, K(m, 0.5), K(m, 0.33)) },
      cleave: { clip: 'atk2', secs: 1.4, warn: 'bro_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.2)) },
      blades: { who: 'none', clip: 'roar', at: 0.45, secs: 1.5, warn: 'bro_blades', go(W, f, m, t, P) {
        const a = Math.random() * TAU;
        MOVES.bladeNova(P, m, null, K(m, 0.36), { n: 12, speed: 10, turn: a });
        P.later(0.55, () => { if (!m.dead) MOVES.bladeNova(P, m, null, K(m, 0.36), { n: 12, speed: 10, turn: a + 0.26 }); });
      } },
      charge: { who: 'far', clip: null, warn: 'bro_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.6), { r: 19, w: 1.4, elem: DRAIN }) },
      lances: { clip: 'atk1', secs: 1.3, warn: 'bro_lances', go: (W, f, m, t, P) => lances(P, m, t, K(m, 1.05)) },
      wall: { clip: 'bash', at: 0.45, secs: 1.3, warn: 'sor_wall', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.5), { width: 16, n: 10, speed: 7.5, elem: DRAIN }) },
    },
    step(W, f, live, dt) {
      const sim = W.sim, g = live.find((m) => m.opts.model === 'bv_garrow'), l = live.find((m) => m.opts.model === 'bv_gault');
      if (g && l) {
        // The cover changes hands every eighteen seconds, called out.
        if ((f.coverT = (f.coverT ?? 0) - dt) <= 0) {
          f.coverT = 18;
          f.cover = f.cover ? (f.cover === g ? l : g) : Math.random() < 0.5 ? g : l;
          W.warn(f.cover === g ? WARN.bro_cover_sword : WARN.bro_cover_lance);
          sim.event(EV.ROAR, f.cover.x, f.cover.y + 2, f.cover.z, 0.9);
        }
        g.shrug = f.cover === g ? 1 : 0.15; l.shrug = f.cover === l ? 1 : 0.15;
        if ((sim.tick & 7) === 0) sim.casting.burst(FX.RING, DRAIN, f.cover.x, f.cover.y + 0.15, f.cover.z, 1.6, 2.4, 0.3, { alpha: 0.6 });
        // Back to back, twice: a wheel of fire round them, and blades through it.
        const frac = (g.hp + l.hp) / (g.maxHp + l.maxHp);
        for (const [at, k] of [[0.7, 'b1'], [0.38, 'b2']]) {
          if (frac >= at || f[k] || g.state !== 0 || g.script || l.state !== 0 || l.script) continue;
          f[k] = true;
          W.warn(WARN.bro_back);
          g.perform({ clip: 'roar', secs: 1.6 }); l.perform({ clip: 'roar', secs: 1.6 });
          MOVES.fireWheel(sim.perils, g, null, K(g, 0.5), { r: 13, life: 7, spin: Math.random() < 0.5 ? 0.7 : -0.7, elem: DRAIN });
          sim.perils.later(2.2, () => { if (!l.dead) MOVES.bladeNova(sim.perils, l, null, K(l, 0.36), { n: 10, speed: 8 }); });
          sim.perils.later(4.4, () => { if (!l.dead) MOVES.bladeNova(sim.perils, l, null, K(l, 0.36), { n: 10, speed: 8 }); });
        }
        return;
      }
      const last = g || l;
      if (!last || f.last) return;
      f.last = g ? 'sword' : 'lance'; f.cover = null;
      last.shrug = 1;
      if (g) { g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.25); g.opts.damage *= 1.15; W.warn(WARN.bro_last_sword); }
      else { l.opts.damage *= 1.6; l.opts.pause = 0.5; f.wild = true; W.warn(WARN.bro_last_lance); }
      sim.event(EV.ROAR, last.x, last.y + 2, last.z, 1.3);
    },
    focus: (W, f) => (f.cover && !f.cover.dead ? f.cover : null),
  },

  // ---- The Castellan of Blackvigil: on foot; then the hall itself; then the dark --------------------------------------------
  // At six tenths of his life he goes back up to his throne and the hall fights for him: the banners burn and fall across
  // the floor, row after row, and the possessed come down from the galleries. Then he comes down again, into the dark.
  castellan: {
    open: 'cas_open', pace: [4.4, 3.3, 0.3], turn: [22, 5], enrage: [330, 3, 'cas_enrage'],
    deck: (f) => (f.phase >= 2 ? ['cleave', 'charge', 'stamp', 'lances', 'eyes', 'rain', 'wall'] : ['cleave', 'charge', 'stamp', 'lances', 'wall']),
    moves: {
      cleave: { clip: 'atk2', secs: 1.4, warn: 'cas_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.4), { r: 10, half: 1.1 }) },
      charge: { who: 'far', clip: null, warn: 'cas_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.5), { r: 24, w: 1.8, elem: DRAIN }) },
      stamp: { who: 'none', clip: 'jump', secs: 1.6, warn: 'cas_stamp', go: (W, f, m, t, P) => MOVES.stompRings(P, m, null, K(m, 0.75), { r: 5.5, elem: DRAIN }) },
      lances: { clip: 'atk1', secs: 1.3, warn: 'cas_lances', go: (W, f, m, t, P) => lances(P, m, t, K(m, 1.1), { r: 22 }) },
      wall: { clip: 'bash', at: 0.45, secs: 1.3, warn: 'cas_wall', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.38), { width: 20, n: 12, speed: 7.5, elem: DRAIN }) },
      eyes: { who: 'none', clip: 'roar', at: 0.5, secs: 1.5, warn: 'cas_dark', go(W, f, m, t, P) {
        // Red eyes out of the dark at the room's edge: pairs of slow lights that come after you.
        const room = roomOf(f.boss.room), [rx, , rz] = roomSpot(room.id);
        for (const b of W.others().slice(0, 3)) {
          const a = Math.random() * TAU, x = rx + Math.sin(a) * room.r * 0.85, z = rz + Math.cos(a) * room.r * 0.85, y = W.sim.world.height(x, z) + 2.2;
          for (const o of [-0.25, 0.25]) P.shot({ x: x + Math.cos(a) * o, y, z: z - Math.sin(a) * o, at: b, speed: 5.2, dmg: K(m, 0.7), elem: DRAIN, size: 0.2, life: 7, home: 2.4, homeFor: 5.5, from: m, tag: 'eyes' });
        }
      } },
      rain: { clip: 'roar', secs: 1.4, warn: 'cas_rain', go: (W, f, m, t, P) => P.rain(t.x, t.z, 12, 11, 3, { r: 2.5, fuse: 1.4, dmg: K(m, 0.85), elem: FIRE, tag: 'embers' }) },
    },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, room = roomOf(f.boss.room), d = room.delve;
      if (f.phase === 0 && m.hp < m.maxHp * 0.6 && m.state === 0 && !m.script && !f.turn) {
        f.phase = 1; f.hold = true; f.hallT = 0; f.row = 0; f.rowT = 2.5;
        m.shrug = 0.25; m.noTurn = true;
        W.warn(WARN.cas_hall);
        sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.5);
        // Up to his throne, and stood there.
        const [tx, tz] = toWorld(room.x, room.z - room.hz + 9, d);
        m.script = (k, dt2, s2) => { if (walkTo(k, tx, tz, dt2, s2, 4.2)) k.yaw += clamp(wrapAngle(Math.PI * 0 - k.yaw), -dt2 * 4, dt2 * 4); return true; };
        W.callAdds(f, m, { warn: 'cas_possessed', n: 4, pick: POSSESSED, from: 'doors', hp: 380, damage: 16, name: 'THE POSSESSED', pal: ['Base', 'Bloodsoaked'], tricks: true });
      }
      if (f.phase !== 1) return;
      f.hallT += dt;
      // The banners, row by row: every other one from both walls, then the ones between, each a strip of fire right across.
      if ((f.rowT -= dt) <= 0 && f.hallT < 17) {
        f.rowT = 3.3;
        const n = 7, x0 = d.x + room.x - room.hx, x1 = d.x + room.x + room.hx;
        for (let i = f.row % 2; i < n; i += 2) {
          const z = d.z + room.z + ((i + 0.5) / n * 2 - 1) * (room.hz - 2.5), left = (i + f.row) % 4 < 2;
          P.mark({ shape: 'line', x: left ? x0 : x1, z, yaw: left ? Math.PI / 2 : -Math.PI / 2, r: room.hx * 2, w: 1.5, fuse: 2, dmg: K(m, 1.3), life: 4.6, dps: K(m, 0.8), elem: FIRE, tag: 'banner' });
        }
        f.row++;
      }
      if (f.hallT > 9 && !f.wave2) { f.wave2 = true; W.callAdds(f, m, { warn: 'cas_possessed', n: 4, pick: POSSESSED, from: 'doors', hp: 380, damage: 16, name: 'THE POSSESSED', pal: ['Base', 'Bloodsoaked'], tricks: true }); }
      if (f.hallT > 21) {
        f.phase = 2; f.hold = false; m.shrug = 1; m.noTurn = false; m.script = null; m.state = 0;
        m.opts.damage *= 1.2;
        W.warn(WARN.cas_dark);
        sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.6);
      }
    },
  },

  // ---- Hrymgar the Goat-King: the charges, the stamps, the roof's ice, and his herd ------------------------------------------
  hrymgar: {
    pace: [4.4, 3.4, 0.35], turn: [18, 5], enrage: [185, 2, 'hry_enrage'],
    deck: ['charge', 'three', 'stamp', 'quake', 'ice', 'boulder'],
    adds: [
      { at: 0.65, warn: 'hry_herd', n: 2, pick: GOATS, from: 'doors', hp: 620, damage: 22, name: 'HERD GOAT', pal: ['Bone-white'], tricks: true },
      { at: 0.3, warn: 'hry_herd', n: 3, pick: GOATS, from: 'doors', hp: 620, damage: 22, name: 'HERD GOAT', pal: ['Bone-white'], tricks: true },
    ],
    moves: {
      charge: { who: 'far', clip: null, warn: 'hry_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.55), { r: 22, w: 1.6, elem: FROST }) },
      // Three, one after another, each at another of you.
      three: { who: 'mark', clip: null, warn: 'hry_three', go(W, f, m, t, P) {
        MOVES.ram(P, m, t, K(m, 0.5), { r: 18, w: 1.5, elem: FROST });
        for (const wait of [1.8, 3.6]) P.later(wait, () => { const q = W.mark(); if (q && !m.dead && W.fight === f && !m.script) MOVES.ram(P, m, q, K(m, 0.5), { r: 18, w: 1.5, elem: FROST }); });
      } },
      stamp: { who: 'none', clip: 'jump', secs: 1.6, warn: 'hry_stamp', go: (W, f, m, t, P) => MOVES.stompRings(P, m, null, K(m, 0.6), { r: 5, elem: FROST }) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'hry_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.5), { reach: 26, speed: 10, elem: FROST }) },
      ice: { who: 'none', clip: 'roar', secs: 1.3, warn: 'hry_ice', go: (W, f, m, t, P) => fall(W, P, m, K(m, 1.05), FROST, 'icefall') },
      boulder: { who: 'far', clip: 'atk1', at: 0.4, secs: 1.2, warn: 'hry_boulder', go: (W, f, m, t, P) => MOVES.boulder(P, m, t, K(m, 0.45)) },
    },
  },

  // ---- The Brood Mother: webs that hold the floor, venom, and brood after brood ----------------------------------------------
  broodmother: {
    open: 'brd_open', pace: [4.2, 3.2, 0.35], turn: [20, 4], enrage: [215, 2, 'brd_enrage'],
    deck: ['web', 'threads', 'spit', 'cone', 'rain'],
    adds: [0.8, 0.55, 0.3].map((at, i) => ({ at, warn: 'brd_brood', n: 4 + i, pick: ['hd_spiderling'], from: 'edge', places: 2, hp: 230, damage: 11, speed: 6.5, name: 'SPIDERLING', pal: ['Base', 'Bone-white'] })),
    setUp(W, m) { m.opts.radius = 1.3; },
    moves: {
      web: { clip: 'atk2', at: 0.4, secs: 1.3, warn: 'brd_web', go(W, f, m, t, P) {
        const from = [m.x, m.y + m.meta.height * 0.6, m.z];
        for (const b of new Set([t, W.farthest(m)])) P.lob(from, { x: b.x, z: b.z, r: 3.4, dmg: K(m, 0.6), life: 13, dps: K(m, 0.75), elem: SPIRIT, follow: b, lock: 0.5, from: m, tag: 'web' }, { time: 1.2, look: 'orb', size: 0.4 });
      } },
      threads: { who: 'none', clip: 'roar', secs: 1.4, warn: 'brd_threads', go(W, f, m, t, P) {
        const a = Math.random() * TAU, o = { shape: 'cross', x: m.x, z: m.z, arms: 5, r: 17, w: 0.6, fuse: 1.15, dmg: K(m, 1.1), elem: ARCANE, from: m, tag: 'threads' };
        P.mark({ ...o, yaw: a });
        P.later(0.8, () => { if (!m.dead) P.mark({ ...o, x: m.x, z: m.z, yaw: a + TAU / 10 }); });
      } },
      spit: { clip: 'atk1', at: 0.4, secs: 1.4, warn: 'brd_spit', go(W, f, m, t, P) {
        MOVES.spitFan(P, m, t, K(m, 0.55), { n: 5 });
        P.later(0.6, () => { if (!m.dead && !t.dead) MOVES.spitFan(P, m, t, K(m, 0.55), { n: 4 }); });
      } },
      cone: { clip: 'atk3', secs: 1.3, warn: 'brd_cone', go: (W, f, m, t, P) => MOVES.venomCone(P, m, t, K(m, 0.7), { r: 13, half: 0.6 }) },
      rain: { clip: 'roar', secs: 1.3, warn: 'brd_rain', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.7), { n: 9, R: 10 }) },
    },
  },

  // ---- The Sleeper Under the Ice: the lake cracks, the dark comes after you; then it goes under, and comes up beneath you -----
  sleeper: {
    open: 'slp_open', pace: [4.4, 3.2, 0.3], turn: [22, 4], enrage: [320, 3, 'slp_enrage'],
    deck: (f) => (f.phase >= 2 ? ['crack', 'cracks', 'dark', 'rings', 'fall', 'wail'] : ['crack', 'dark', 'rings', 'fall', 'wail']),
    adds: [{ at: 0.3, warn: 'slp_demons', n: 2, pick: DEMONS, from: 'edge', places: 2, hp: 800, damage: 28, name: 'A DREAM OF THE SLEEPER', pal: ['Abyssal'], setUp: (W, k) => { k.opts.ai = 'melee'; } }],
    setUp(W, m) { m.opts.radius = 1.2; },
    moves: {
      // A crack right across the lake, through one of you; it stays open and bites what crosses it.
      crack: { clip: 'atk3', secs: 1.3, warn: 'slp_crack', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 30, w: 1.2, fuse: 1.15, dmg: K(m, 0.95), knock: 3, life: 9, touch: K(m, 0.4), again: 1, elem: FROST, from: m, aim: t, lock: 0.5, tag: 'crack' }) },
      cracks: { who: 'none', clip: 'jump', secs: 1.5, warn: 'slp_crack', go(W, f, m, t, P) { const a = Math.random() * TAU; for (let i = 0; i < 5; i++) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: a + i * TAU / 5, r: 28, w: 1.1, fuse: 1.4, dmg: K(m, 1.0), knock: 3, life: 7, touch: K(m, 0.45), again: 1, elem: FROST, from: m, tag: 'crack' }); } },
      dark: { clip: 'atk2', at: 0.45, secs: 1.3, warn: 'slp_dark', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.45), { n: 4, elem: VOID }) },
      rings: { clip: 'atk4', secs: 1.3, warn: 'slp_rings', go: (W, f, m, t, P) => { for (const b of new Set([t, W.farthest(m)])) MOVES.frostRings(P, m, b, K(m, 0.6)); } },
      fall: { who: 'none', clip: 'roar', secs: 1.3, warn: 'slp_fall', go: (W, f, m, t, P) => fall(W, P, m, K(m, 0.8), FROST, 'icefall') },
      // A wail: a wide ring round it, with a still place close in against it.
      wail: { who: 'none', clip: 'roar', secs: 1.5, warn: 'slp_wail', go: (W, f, m, t, P) => P.mark({ shape: 'ring', x: m.x, z: m.z, r: 13, r0: 3.6, fuse: 1.5, dmg: K(m, 1.1), elem: SPIRIT, from: m, tag: 'wail' }) },
    },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      if (f.phase === 0 && m.hp < m.maxHp * 0.6 && m.state === 0 && !m.script && !f.turn) {
        // Under the ice: gone from sight and from reach, and three times up under one of you.
        f.phase = 1; f.hold = true; f.under = { n: 0, t: 1.2, spot: null };
        m.buried = true; m.noTurn = true;
        W.warn(WARN.slp_under);
        sim.casting.burst(FX.SHOCK, FROST, m.x, m.y + 0.5, m.z, 1, 5, 0.6, { light: 8, lightR: 10 });
        sim.event(EV.GROUND, m.x, m.y, m.z);
        m.script = (k) => { k.vx = k.vz = 0; return true; };
      }
      if (f.phase !== 1) return;
      const u = f.under;
      u.t -= dt;
      if (!u.spot && u.t <= 0) {
        const t = W.mark() || sim.player;
        u.spot = P.mark({ x: t.x, z: t.z, r: 6.5, fuse: 2.4, dmg: K(m, 1.2), knock: 6, elem: FROST, follow: t, lock: 0.5, from: m, tag: 'breach',
          then: (q) => { P.wave(q.x, q.z, { speed: 11, reach: 24, touch: K(m, 0.55), knock: 3, elem: FROST, r: 6.5, tag: 'breachWave' }); u.landed = true; } });
      }
      if (u.spot && u.landed) {
        m.x = u.spot.x; m.z = u.spot.z; m.y = sim.world.height(m.x, m.z);
        u.spot = null; u.landed = false; u.n++; u.t = 1.6;
        if (u.n >= 3) {
          // Up, and the lake breaks with it.
          f.phase = 2; f.hold = false; f.under = null;
          m.buried = false; m.noTurn = false; m.script = null; m.state = 0;
          m.opts.damage *= 1.2;
          W.warn(WARN.slp_up);
          sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.6);
          const a = Math.random() * TAU;
          for (let i = 0; i < 6; i++) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: a + i * TAU / 6, r: 26, w: 1.1, fuse: 1.6, dmg: K(m, 0.9), knock: 3, life: 8, touch: K(m, 0.45), again: 1, elem: FROST, from: m, tag: 'crack' });
        }
      }
    },
  },

  // ==== The Drowned Vaults ===================================================================================================

  // ---- The Bloat: he swells, and bursts: be behind rock when he does ---------------------------------------------------------
  bloat: {
    open: 'blo_open', pace: [4.6, 3.6, 0.35], turn: [20, 5], enrage: [210, 2, 'blo_enrage'],
    deck: ['bile', 'retch', 'stamp', 'gobbet', 'slam'],
    setUp(W, m) { m.opts.radius = 1.3; },
    moves: {
      bile: { clip: 'atk3', secs: 1.3, warn: 'blo_bile', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.5), { n: 7, R: 8 }) },
      retch: { clip: 'roar', secs: 1.3, warn: 'blo_retch', go: (W, f, m, t, P) => MOVES.venomCone(P, m, t, K(m, 0.55), { r: 14, half: 0.55 }) },
      stamp: { who: 'none', clip: 'jump', secs: 1.6, warn: 'blo_stamp', go: (W, f, m, t, P) => MOVES.stompRings(P, m, null, K(m, 0.5), { r: 5, elem: POISON }) },
      gobbet: { who: 'far', clip: 'atk1', at: 0.4, secs: 1.2, warn: 'blo_gobbet', go: (W, f, m, t, P) => MOVES.boulder(P, m, t, K(m, 0.4)) },
      slam: { clip: 'atk2', secs: 1.4, warn: 'blo_slam', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 9, elem: POISON }) },
    },
    // He swells for five seconds, and bursts: it lands on everyone he can see (his tank, braced against him, takes a
    // third of it). Then he's spent a while, and everything bites deeper.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.swell;
      if (!u) {
        if (m.state !== 0 || m.script || f.turn || !W.every(f, 'swell', 36)) return;
        if (!m.perform({ clip: 'roar', secs: 5.2 })) return;
        f.swell = { t: 0, ring: 0 }; f.hold = true; m.noTurn = true;
        W.warn(WARN.blo_swell);
        sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.4);
        return;
      }
      u.t += dt;
      if ((u.ring -= dt) <= 0) { u.ring = 0.45; const r = 2 + 14 * (u.t / 5); sim.casting.burst(FX.RING, POISON, m.x, m.y + 0.2, m.z, r * 0.7, r, 0.45, { alpha: 0.7, light: 5, lightR: 8 }); }
      if (u.t < 5 && !m.dead) return;
      f.swell = null; f.hold = false; m.noTurn = false;
      if (m.dead) return;
      const tank = W.tank(m), d = roomOf(f.boss.room).delve, fouled = new Set();
      for (const b of W.bodies()) {
        if (!caveClear(m.x, m.z, b.x, b.z, 0.05)) {
          // Sheltered: but what ran down the back of that rock stays there half a minute. The next burst wants another.
          const q = d.pillars.map(([x, z]) => [d.x + x, d.z + z]).sort((a, c) => Math.hypot(a[0] - b.x, a[1] - b.z) - Math.hypot(c[0] - b.x, c[1] - b.z))[0];
          if (q && Math.hypot(q[0] - b.x, q[1] - b.z) < 7 && !fouled.has(q[0])) {
            fouled.add(q[0]);
            const L = Math.hypot(q[0] - m.x, q[1] - m.z) || 1;
            P.mark({ x: q[0] + (q[0] - m.x) / L * 3, z: q[1] + (q[1] - m.z) / L * 3, r: 4, fuse: 1.2, life: 30, dps: K(m, 0.7), elem: POISON, quiet: true, tag: 'foul' });
          }
          continue;
        }
        P.hurt(b, K(m, 2.3) * (b === tank ? 0.33 : 1), m.x, m.z, 8, false, 'burst');
        sim.casting.burst(FX.SHOCK, POISON, b.x, b.y + 1, b.z, 0.6, 2.4, 0.5, { light: 6, lightR: 6 });
      }
      sim.casting.burst(FX.RING, POISON, m.x, m.y + 0.3, m.z, 2, 26, 0.7, { light: 10, lightR: 14 });
      sim.event(EV.GROUND, m.x, m.y, m.z);
      P.rain(m.x, m.z, 11, 7, 1, { r: 2.4, fuse: 1.1, dmg: K(m, 0.5), life: 7, dps: K(m, 0.5), elem: POISON, tag: 'bile' });
      W.warn(WARN.blo_burst);
      m.state = 0; m.act = null; m.perform({ clip: 'hit', secs: 2.4 });
      m.shrug = 1.5; P.later(7, () => { m.shrug = 1; });
    },
    order(W, f, b, [m]) {
      if (!f.swell || !m || b.role === 'tank') return null;
      if (!caveClear(m.x, m.z, b.x, b.z, 0.05) && W.sim.perils.safe(b.x, b.z)) return null;
      // (Behind a rock that isn't fouled: the nearest whose far side is clear.)
      const d = roomOf(f.boss.room).delve, P = W.sim.perils;
      const clean = d.pillars.map(([x, z, r]) => [d.x + x, d.z + z, r]).filter(([x, z, r]) => { const L = Math.hypot(x - m.x, z - m.z) || 1; return P.safe(x + (x - m.x) / L * (r + 1.4), z + (z - m.z) / L * (r + 1.4)); });
      const to = W.shelter(b, m.x, m.z, clean) || W.shelter(b, m.x, m.z);
      return to ? { to, urgent: true } : null;
    },
  },

  // ---- Mother Sallow, the Tidecaller: the tide comes in, and only the high rock is dry ---------------------------------------
  sallow: {
    open: 'sal_open', pace: [4.4, 3.4, 0.35], turn: [22, 4], enrage: [220, 2, 'sal_enrage'],
    deck: ['grasp', 'undertow', 'wave', 'drip', 'wail'],
    adds: [
      { at: 0.7, warn: 'sal_drowned', n: 3, pick: DROWNED, from: 'doors', hp: 480, damage: 18, name: 'THE DROWNED', pal: ['Drowned'], tricks: true },
      { at: 0.35, warn: 'sal_drowned', n: 4, pick: DROWNED, from: 'doors', hp: 480, damage: 18, name: 'THE DROWNED', pal: ['Drowned'], tricks: true },
    ],
    moves: {
      grasp: { clip: 'atk1', secs: 1.3, warn: 'sal_grasp', go(W, f, m, t, P) { for (const b of new Set([t, W.farthest(m)])) P.mark({ x: b.x, z: b.z, r: 3, fuse: 1.5, dmg: K(m, 1.0), life: 8, dps: K(m, 0.9), elem: FROST, follow: b, lock: 0.5, from: m, tag: 'grasp' }); } },
      undertow: { clip: 'atk3', secs: 1.3, warn: 'sal_undertow', go: (W, f, m, t, P) => lances(P, m, t, K(m, 0.9), { elem: FROST, r: 20, tag: 'undertow' }) },
      wave: { clip: 'atk5', at: 0.45, secs: 1.3, warn: 'sal_wave', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.42), { width: 18, n: 11, speed: 7.5, elem: FROST }) },
      drip: { who: 'none', clip: 'roar', secs: 1.3, warn: 'sal_drip', go: (W, f, m, t, P) => fall(W, P, m, K(m, 0.8), FROST, 'drip') },
      wail: { who: 'none', clip: 'roar', secs: 1.5, warn: 'sal_wail', go: (W, f, m, t, P) => P.mark({ shape: 'ring', x: m.x, z: m.z, r: 13, r0: 3.6, fuse: 1.5, dmg: K(m, 1.0), elem: SPIRIT, from: m, tag: 'wail' }) },
    },
    // The tide: she goes to the north wall of her hall to call it, and everything but the high rock is under for seven
    // seconds. From where she stands she cuts the rock in two, and then again to one side: one line at a time.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, d = roomOf(f.boss.room).delve, rx = d.x + TIDE_ROCK.x, rz = d.z + TIDE_ROCK.z;
      if (!f.tide) {
        if (m.state !== 0 || m.script || f.turn || !W.every(f, 'tide', 34)) return;
        const [sx, sz] = toWorld(TIDE_STAND[0], TIDE_STAND[1], d);
        f.tide = { t: 0 }; f.hold = true; m.noTurn = true;
        m.script = (k, dt2, s2) => { if (walkTo(k, sx, sz, dt2, s2, 6)) k.yaw += clamp(wrapAngle(Math.atan2(rx - k.x, rz - k.z) - k.yaw), -dt2 * 5, dt2 * 5); return true; };
        W.warn(WARN.sal_tide);
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.3);
        P.mark({ shape: 'ring', x: rx, z: rz, r: 36, r0: TIDE_ROCK.r, fuse: 4.5, dmg: K(m, 1.4), life: 7, dps: K(m, 1.5), elem: FROST, quiet: true, tag: 'tide' });
        const side = Math.random() < 0.5 ? 1 : -1;
        for (const [wait, off] of [[5.6, 0], [8.4, 3.4 * side]]) {
          P.later(wait, () => {
            if (m.dead || W.fight !== f) return;
            const a = Math.atan2(rx - m.x, rz - m.z), tx = rx + Math.cos(a) * off, tz = rz - Math.sin(a) * off;
            P.mark({ shape: 'line', x: m.x, z: m.z, yaw: Math.atan2(tx - m.x, tz - m.z), r: Math.hypot(tx - m.x, tz - m.z) + TIDE_ROCK.r + 2, w: 1.3, fuse: 1.7, dmg: K(m, 1.0), knock: 2, elem: FROST, from: m, tag: 'undertow' });
          });
        }
        return;
      }
      f.tide.t += dt;
      if (f.tide.t > 11.6 || m.dead) { f.tide = null; f.hold = false; m.noTurn = false; m.script = null; m.state = 0; if (!m.dead) W.warn(WARN.sal_ebb, 10); }
    },
    end(W, f, live) { for (const m of live) m.script = null; },
    // Up onto the rock while the tide's in: the nearest of it to where they are, a stride in from its edge.
    order(W, f, b) {
      if (!f.tide) return null;
      const d = roomOf(f.boss.room).delve, rx = d.x + TIDE_ROCK.x, rz = d.z + TIDE_ROCK.z, dx = b.x - rx, dz = b.z - rz, L = Math.hypot(dx, dz) || 1;
      if (L < TIDE_ROCK.r - 1) return null;
      const r = TIDE_ROCK.r - 2.4;
      return { to: [rx + dx / L * r, rz + dz / L * r], urgent: true };
    },
  },

  // ---- The Leviathan of the Mile: under the mud and up beneath you, and where it's come up the floor is gone ----------------
  leviathan: {
    open: 'lev_open', pace: [4.6, 3.5, 0.3], turn: [24, 4], enrage: [320, 3, 'lev_enrage'],
    deck: ['spew', 'maw', 'thrash', 'bore', 'fall'],
    adds: [{ at: 0.45, warn: 'lev_spawn', n: 3, pick: ['dv_spawn'], from: 'edge', places: 3, hp: 420, damage: 15, name: 'MIRE-SPAWN', pal: ['Abyssal'], setUp: melee }],
    setUp(W, m) { m.opts.radius = 1.6; },
    moves: {
      spew: { clip: 'atk2', at: 0.45, secs: 1.4, warn: 'lev_spew', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.5), { n: 8, R: 9 }) },
      // It draws breath: everyone it isn't fighting is dragged toward it, into a cone that bites when the breath's drawn.
      maw: { who: 'far', clip: 'roar', secs: 3, warn: 'lev_maw', go(W, f, m, t, P) {
        f.maw = { t: 0 };
        P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: 11, half: 0.62, fuse: 2.8, dmg: K(m, 1.5), knock: 3, elem: POISON, from: m, tag: 'maw' });
      } },
      thrash: { who: 'none', clip: 'atk3', at: 0.5, secs: 1.4, warn: 'lev_thrash', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 28, speed: 10, elem: POISON }) },
      bore: { clip: 'atk1', secs: 1.3, warn: 'lev_bore', go: (W, f, m, t, P) => { for (const turn of [-0.42, 0, 0.42]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 24, w: 1.2, fuse: 1.15, dmg: K(m, 0.9), knock: 3, elem: STONE, from: m, tag: 'bore' }); } },
      fall: { who: 'none', clip: 'roar', secs: 1.3, warn: 'lev_fall', go: (W, f, m, t, P) => fall(W, P, m, K(m, 0.75), STONE, 'rockfall') },
    },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      if (f.maw) {
        f.maw.t += dt;
        if (f.maw.t > 2.7 || m.dead) f.maw = null;
        else for (const b of loose(W)) { const L = gap(b, m); if (L < 26 && L > 3 && P.safe(b.x + (m.x - b.x) / L * 1.2, b.z + (m.z - b.z) / L * 1.2, 0.2)) W.drag(b, m.x, m.z, 3, dt); }
      }
      const u = f.dive;
      if (!u) {
        if (m.state !== 0 || m.script || f.turn || f.maw || m.buried || !W.every(f, 'dive', 38)) return;
        // Under: gone from sight and reach, and up under one of you three times, four, five: more each time it goes.
        f.dives = (f.dives || 0) + 1;
        f.dive = { n: 0, of: Math.min(5, 2 + f.dives), t: 1.3, spot: null, landed: false };
        f.hold = true; m.buried = true; m.noTurn = true; m.script = stand;
        W.warn(WARN.lev_dive);
        sim.casting.burst(FX.SHOCK, POISON, m.x, m.y + 0.5, m.z, 1, 6, 0.6, { light: 8, lightR: 10 });
        sim.event(EV.GROUND, m.x, m.y, m.z);
        return;
      }
      u.t -= dt;
      if (!u.spot && u.t <= 0) {
        const t = W.mark() || sim.player;
        u.spot = P.mark({ x: t.x, z: t.z, r: 5.5, fuse: 2.1, dmg: K(m, 1.1), knock: 6, elem: POISON, follow: t, lock: 0.55, from: m, tag: 'breach',
          then: (q) => {
            P.wave(q.x, q.z, { speed: 11, reach: 22, touch: K(m, 0.5), knock: 3, elem: POISON, r: 5.5, tag: 'breachWave' });
            // (The hole it leaves: the mud runs back into it, slowly. Not the last, where it sticks: that one it fills. And six
            // at the most: the oldest closes for the newest.)
            if (u.n + 1 < u.of) {
              const holes = (f.holes ||= []);
              holes.push(P.mark({ x: q.x, z: q.z, r: 3.8, fuse: 0, life: 40, dps: K(m, 0.85), elem: POISON, quiet: true, tag: 'sinkhole' }));
              while (holes.length > 6) snuff(holes.shift());
            }
            u.landed = true;
          } });
      }
      if (u.spot && u.landed) {
        m.x = u.spot.x; m.z = u.spot.z; m.y = sim.world.height(m.x, m.z);
        u.spot = null; u.landed = false; u.n++; u.t = 1.1;
        if (u.n >= u.of) {
          // Up, and stuck in its own hole a while.
          f.dive = null; f.hold = false;
          m.buried = false; m.noTurn = false; m.script = null; m.state = 0;
          m.perform({ clip: 'emerge', secs: 3.6 });
          m.shrug = 1.4; P.later(7, () => { m.shrug = 1; });
          W.warn(WARN.lev_up, 10);
          sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.6);
        }
      }
    },
  },

  // ==== The Sporehold ========================================================================================================

  // ---- Mouldfang: the pounces, the howl, and the bloom he puts on one of you -------------------------------------------------
  mouldfang: {
    open: 'mou_open', pace: [4.2, 3.2, 0.35], turn: [18, 5], enrage: [215, 2, 'mou_enrage'],
    deck: ['pounce', 'rake', 'shake', 'snap'],
    moves: {
      pounce: { who: 'far', clip: null, warn: 'mou_pounce', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.5), { r: 22, w: 1.6, elem: POISON }) },
      rake: { clip: 'atk2', secs: 1.4, warn: 'mou_rake', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.15), { elem: POISON }) },
      shake: { who: 'none', clip: 'roar', at: 0.45, secs: 1.5, warn: 'mou_shake', go(W, f, m, t, P) {
        const a = Math.random() * TAU;
        MOVES.bladeNova(P, m, null, K(m, 0.32), { n: 12, speed: 9, turn: a, elem: POISON });
        P.later(0.55, () => { if (!m.dead) MOVES.bladeNova(P, m, null, K(m, 0.32), { n: 12, speed: 9, turn: a + 0.26, elem: POISON }); });
      } },
      snap: { clip: 'atk1', secs: 1.3, warn: 'mou_snap', go: (W, f, m, t, P) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: 12, half: 0.42, fuse: 1.1, dmg: K(m, 1.2), knock: 3, elem: POISON, from: m, aim: t, lock: 0.5, tag: 'snap' }) },
    },
    // He howls his pack down one of his two runs, by name, and puts the bloom on one of you: a circle that rides them five
    // seconds, then bursts, and what it leaves spreads. Burst in the mouth of that run, the pack comes through it and half
    // of them never get out. Burst anywhere else, it's only more of the floor gone, and the whole pack comes.
    step(W, f, [m]) {
      if (!m || f.bloom) return;
      if (m.state !== 0 || m.script || f.turn || !W.every(f, 'bloom', 25)) return;
      const t = W.mark();
      if (!t || t.dead || !m.perform({ clip: 'roar', face: t, secs: 1.4 })) return;
      const sim = W.sim, P = sim.perils, d = roomOf(f.boss.room).delve;
      const run = DEN_RUNS[(f.runN = (f.runN ?? Math.floor(Math.random() * 2)) + 1) % DEN_RUNS.length], mouth = toWorld(run.mouth[0], run.mouth[1], d), from = toWorld(run.from[0], run.from[1], d);
      f.bloom = { on: t, mouth };
      W.warn(WARN[run.warn]);
      sim.event(EV.ROAR, m.x, m.y + 2.5, m.z, 1.4);
      P.mark({ x: t.x, z: t.z, r: 4.6, fuse: 5.5, lock: 1, follow: t, dmg: K(m, 0.6), elem: POISON, tag: 'bloom', then: (q) => {
        f.bloom = null;
        P.mark({ x: q.x, z: q.z, r: 3.4, fuse: 0, life: 18, grow: 0.24, dps: K(m, 0.9), elem: POISON, quiet: true, tag: 'bloomcloud' });
        const choked = Math.hypot(q.x - mouth[0], q.z - mouth[1]) < 6;
        P.later(2.2, () => {
          if (m.dead || W.fight !== f) return;
          const n = Math.min(choked ? 2 : 4, 6 - W.adds().length);
          W.warn(choked ? WARN.mou_choked : WARN.mou_pack, 5);
          if (n > 0) W.spawnAdds(`mould_pack_${(f.packN = (f.packN || 0) + 1)}`, 'sh_hound', from, n, (k) => { k.hp = k.maxHp = 520; k.opts.damage = 19; k.opts.name = 'MOULD HOUND'; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; }, ['Sporebloom'], true);
          sim.event(EV.ROAR, from[0], sim.world.height(from[0], from[1]) + 1.5, from[1], 0.9);
        });
      } });
    },
    // Whoever has it: into the mouth of the run he called.
    order: (W, f, b) => (f.bloom?.on === b ? { to: f.bloom.mouth, urgent: true } : null),
  },

  // ---- Mother Morel: rot that spreads, and pods that have to be trodden flat before they burst --------------------------------
  morel: {
    open: 'mor_open', pace: [4.4, 3.4, 0.35], turn: [22, 4], enrage: [220, 2, 'mor_enrage'],
    deck: ['spores', 'rot', 'roots', 'ring', 'spit'],
    moves: {
      spores: { clip: 'atk2', at: 0.45, secs: 1.3, warn: 'mor_spores', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.6), { n: 4, elem: POISON }) },
      rot: { clip: 'atk1', secs: 1.3, warn: 'mor_rot', go(W, f, m, t, P) { for (const b of new Set([t, W.farthest(m)])) P.mark({ x: b.x, z: b.z, r: 2.6, fuse: 1.5, dmg: K(m, 0.9), life: 10, grow: 0.22, dps: K(m, 0.8), elem: POISON, follow: b, lock: 0.5, from: m, tag: 'rot' }); } },
      roots: { clip: 'atk3', secs: 1.3, warn: 'mor_roots', go: (W, f, m, t, P) => { for (const turn of [-0.45, 0, 0.45]) P.march(m.x, m.z, yawTo(m, t) + turn, 10, 1.9, 0.14, { r: 1.25, fuse: 0.85, dmg: K(m, 1.3), knock: 2, elem: POISON, from: m, tag: 'roots' }); } },
      ring: { clip: 'atk4', secs: 1.3, warn: 'mor_ring', go: (W, f, m, t, P) => { for (const b of new Set([t, W.farthest(m)])) P.rings(b.x, b.z, [3, 6], 0.7, { fuse: 1.1, dmg: K(m, 0.9), elem: POISON, from: m, tag: 'sporeRings' }); } },
      spit: { clip: 'atk5', at: 0.4, secs: 1.4, warn: 'mor_spit', go(W, f, m, t, P) {
        MOVES.spitFan(P, m, t, K(m, 0.5), { n: 5 });
        P.later(0.6, () => { if (!m.dead && !t.dead) MOVES.spitFan(P, m, t, K(m, 0.5), { n: 4 }); });
      } },
    },
    // Her pods: three at a time (four once she's hurt), each ripening for seven seconds. One with somebody stood on it as
    // it ripens is trodden flat. One left alone bursts: spores all round, a cloud that stays, and sporelings out of it.
    step(W, f, [m]) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      if (f.pods && f.pods.every((q) => q.done)) { f.pods = null; f.hold = false; }
      if (f.pods || m.state !== 0 || m.script || f.turn || !W.every(f, 'pods', 29)) return;
      if (!m.perform({ clip: 'roar', secs: 1.4 })) return;
      const room = roomOf(f.boss.room), n = m.hp < m.maxHp * 0.5 ? 4 : 3, at = [[m.x, m.z]];
      W.warn(WARN.mor_pods);
      f.podN = (f.podN || 0) + 1;
      f.pods = [];
      // (Nothing new thrown while they ripen: whoever's treading one is left to it.)
      f.hold = true;
      // (You first: the pod nearest you is yours to tread. Then the party, one each.)
      const p = sim.player, free = loose(W).sort((a, c) => (c === p) - (a === p));
      for (let i = 0; i < n; i++) {
        const [x, z] = somewhere(room, 4, at, 7);
        at.push([x, z]);
        const pod = { x, z, by: null, done: false };
        f.pods.push(pod);
        pod.mk = P.mark({ x, z, r: 2.4, fuse: 7.5, soak: true, quiet: true, elem: LIGHT, tag: 'pod', then: (q, P2, inside) => {
          pod.done = true;
          if (inside.length) { sim.casting.burst(FX.PUFF, POISON, q.x, q.y + 0.3, q.z, 0.8, 2.2, 0.6, { alpha: 0.6 }); return; }
          W.warn(WARN.mor_burst, 6);
          P.nova({ x: q.x, y: q.y + 0.7, z: q.z, speed: 9, dmg: K(m, 0.7), elem: POISON, size: 0.26, life: 2.2, from: m, tag: 'podburst' }, 10, Math.random() * TAU);
          P.mark({ x: q.x, z: q.z, r: 4.5, fuse: 0, life: 14, dps: K(m, 0.85), elem: POISON, quiet: true, tag: 'podcloud' });
          sim.casting.burst(FX.SHOCK, POISON, q.x, q.y + 0.5, q.z, 1, 5, 0.5, { light: 8, lightR: 8 });
          if (W.adds().length < 6) W.spawnAdds(`morel_pod_${f.podN}_${i}`, 'sh_sporeling', [q.x, q.z], 2, (k) => { k.hp = k.maxHp = 220; k.opts.damage = 11; k.opts.name = 'SPORELING'; k.opts.speed = 5.6; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; }, ['Sporebloom']);
        } });
      }
      // (Each of you, you first, the nearest pod nobody has: one each, while there are bodies to go round.)
      for (const b of free) { let best = null, bd = Infinity; for (const q of f.pods) if (!q.by) { const dd = Math.hypot(b.x - q.x, b.z - q.z); if (dd < bd) { bd = dd; best = q; } } if (best) best.by = b; }
    },
    order(W, f, b) {
      const pod = f.pods?.find((q) => !q.done && (q.by === b || (q.by?.dead && b.role !== 'tank')));
      return pod ? { to: [pod.x, pod.z] } : null;
    },
  },

  // ---- The Heart of the Ring: it stands where it grew, and can't be hurt while its rooted husks feed it ----------------------
  heart: {
    open: 'hrt_open', pace: [4.8, 3.8, 0.3], turn: [1e9, 0], enrage: [340, 3, 'hrt_enrage'],
    deck: ['slam', 'spray', 'pod', 'creep'],
    setUp(W, m) { m.opts.speed = 0; m.opts.base.speed = 0; m.opts.radius = 1.7; m.noTurn = true; },
    begin(W, f, [m]) { f.husks = { n: 3, wave: 0, bare: 0, wait: 0, seen: 0 }; m.shrug = 0.1; },
    moves: {
      slam: { who: 'none', clip: 'jump', secs: 1.6, warn: 'hrt_slam', go: (W, f, m, t, P) => MOVES.stompRings(P, m, null, K(m, 0.55), { r: 6, elem: POISON }) },
      spray: { who: 'none', clip: 'roar', at: 0.5, secs: 3, warn: 'hrt_spray', go: (W, f, m, t, P) => MOVES.spiral(P, m, null, K(m, 0.26), { arms: 3, secs: 2.4, turn: Math.random() < 0.5 ? 1.3 : -1.3 }) },
      pod: { who: 'far', clip: 'atk1', at: 0.4, secs: 1.2, warn: 'hrt_pod', go: (W, f, m, t, P) => MOVES.boulder(P, m, t, K(m, 0.4)) },
      creep: { who: 'far', clip: 'atk3', secs: 1.3, warn: 'hrt_creep', go: (W, f, m, t, P) => P.mark({ x: t.x, z: t.z, r: 2.6, fuse: 1.5, dmg: K(m, 0.8), life: 12, grow: 0.3, dps: K(m, 0.8), elem: POISON, follow: t, lock: 0.5, from: m, tag: 'creep' }) },
    },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, d = roomOf(f.boss.room).delve, u = f.husks;
      m.noTurn = true;
      // Threads that sweep the room, now and then, all through.
      if (m.state === 0 && !m.script && W.every(f, 'beams', 27) && m.perform({ clip: 'roar', secs: 1.3 })) {
        W.warn(WARN.hrt_beams, 20);
        // (Short of the husks' places: nobody's cut off from one by a thread.)
        MOVES.fireWheel(P, m, null, K(m, 0.42), { arms: 3, r: 19, life: 9, spin: Math.random() < 0.5 ? 0.45 : -0.45, elem: ARCANE });
      }
      const husks = W.adds().filter((a) => a.husk);
      if (u.bare > 0) {
        // Bare: sixteen seconds when everything bites twice as deep, then they grow back, and one more.
        if ((u.bare -= dt) > 0) return;
        u.n = Math.min(HEART_NODES.length, u.n + 1); u.wait = 0; u.seen = 0;
        m.shrug = 0.1;
        W.warn(WARN.hrt_regrow);
      }
      if (u.wait <= 0) {
        // The husks stand up out of their rings: so many of the five places, each rooted where it stands.
        u.wave++; u.wait = 0.01;
        const nodes = HEART_NODES.slice().sort(() => Math.random() - 0.5).slice(0, u.n);
        nodes.forEach((q, i) => W.spawnAdds(`heart_husk_${u.wave}_${i}`, 'sh_husk', toWorld(q[0], q[1], d), 1, (k) => {
          k.husk = true; k.hp = k.maxHp = 300 + 25 * u.wave; k.opts.name = 'ROOTED HUSK'; k.opts.damage = 0; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; k.script = stand;
        }, ['Sporebloom']));
        return;
      }
      u.wait += dt; u.seen = Math.max(u.seen, husks.length);
      // (A thread from each to the Heart, so it's seen what feeds it.)
      if ((sim.tick & 15) === 0) for (const k of husks) sim.casting.burst(FX.RING, ARCANE, k.x, k.y + 0.2, k.z, 0.6, 1.8, 0.4, { alpha: 0.6 });
      if (husks.length || (u.wait < 6 && !u.seen) || u.wait < 1.5) return;
      u.bare = 16; m.shrug = 2;
      W.warn(WARN.hrt_bare);
      sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.4);
    },
  },

  // ==== The Hollow Playhouse =================================================================================================

  // ---- The Seamstress: needles, and the threads she ties to two of you -------------------------------------------------------
  seamstress: {
    open: 'sea_open', pace: [4.3, 3.3, 0.35], turn: [20, 5], enrage: [220, 2, 'sea_enrage'],
    deck: ['needles', 'stitch', 'shears', 'pins', 'hem'],
    adds: [
      { at: 0.65, warn: 'sea_forms', n: 2, pick: COMPANY, from: 'edge', places: 2, hp: 680, damage: 24, name: 'DRESS FORM', pal: ['Porcelain'], setUp: melee },
      { at: 0.3, warn: 'sea_forms', n: 3, pick: COMPANY, from: 'edge', places: 3, hp: 680, damage: 24, name: 'DRESS FORM', pal: ['Porcelain'], setUp: melee },
    ],
    moves: {
      needles: { who: 'none', clip: 'roar', at: 0.45, secs: 1.5, warn: 'sea_needles', go(W, f, m, t, P) {
        const a = Math.random() * TAU;
        MOVES.bladeNova(P, m, null, K(m, 0.33), { n: 12, speed: 10, turn: a });
        P.later(0.55, () => { if (!m.dead) MOVES.bladeNova(P, m, null, K(m, 0.33), { n: 12, speed: 10, turn: a + 0.26 }); });
      } },
      stitch: { clip: 'atk3', secs: 1.4, warn: 'sea_stitch', go(W, f, m, t, P) {
        const o = { shape: 'cross', x: m.x, z: m.z, arms: 4, r: 16, w: 0.6, fuse: 1.15, dmg: K(m, 1.0), elem: ARCANE, from: m, tag: 'stitch' }, a = yawTo(m, t);
        P.mark({ ...o, yaw: a });
        P.later(0.8, () => { if (!m.dead) P.mark({ ...o, x: m.x, z: m.z, yaw: a + Math.PI / 4 }); });
      } },
      shears: { clip: 'atk2', secs: 1.4, warn: 'sea_shears', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.2)) },
      pins: { clip: 'atk1', secs: 1.3, warn: 'sea_pins', go: (W, f, m, t, P) => P.rain(t.x, t.z, 9, 9, 2, { r: 1.9, fuse: 1.25, dmg: K(m, 0.8), elem: SPIRIT, tag: 'pins' }) },
      hem: { clip: 'atk4', at: 0.45, secs: 1.3, warn: 'sea_hem', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.45), { width: 16, n: 10, speed: 7.5, elem: SPIRIT, look: 'blade' }) },
    },
    // Her threads: she goes to the middle of her ring of dress forms and ties one to each of two of you, for seven
    // seconds. A thread burns and pulls; it's cut the moment a dress form stands in its line (within a stride and a half
    // of it). One not cut by the end is reeled in.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.threads, room = roomOf(f.boss.room), d = room.delve;
      if (!u) {
        if (m.state !== 0 || m.script || f.turn || !W.every(f, 'threads', 27)) return;
        const who = [...new Set([W.mark(), W.farthest(m)])].filter((b) => b && !b.dead && b.role !== 'tank');
        if (!who.length) return;
        const cx = d.x + room.x, cz = d.z + room.z;
        f.hold = true; m.noTurn = true;
        m.script = (k, dt2, s2) => { walkTo(k, cx, cz, dt2, s2, 6.5); return true; };
        W.warn(WARN.sea_threads);
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.1);
        f.threads = { t: 0, tick: 0, on: who.map((b) => ({ b, mk: P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, b), r: gap(m, b), w: 0.22, fuse: 8, soak: true, quiet: true, elem: ARCANE, tag: 'thread' }) })) };
        return;
      }
      u.t += dt; u.tick -= dt;
      const bite = u.tick <= 0, forms = (f.forms ||= DRESS_FORMS.map(([x, z]) => [d.x + x, d.z + z]));
      if (bite) u.tick = 0.5;
      const crossed = (b) => forms.some(([fx, fz]) => { const ax = b.x - m.x, az = b.z - m.z, L2 = ax * ax + az * az || 1, k = ((fx - m.x) * ax + (fz - m.z) * az) / L2; return k > 0.08 && k < 0.97 && Math.hypot(m.x + ax * k - fx, m.z + az * k - fz) < 1.5; });
      for (const th of u.on) {
        const b = th.b;
        if (th.cut) continue;
        if (b.dead || m.dead) { th.cut = true; snuff(th.mk); continue; }
        if (u.t > 1 && (crossed(b) || !caveClear(m.x, m.z, b.x, b.z, 0.05))) {
          th.cut = true; snuff(th.mk);
          W.warn(WARN.sea_cut, 4);
          sim.casting.burst(FX.SHOCK, ARCANE, b.x, b.y + 1, b.z, 0.4, 1.8, 0.35, { light: 5, lightR: 5 });
          continue;
        }
        th.mk.x = m.x; th.mk.z = m.z; th.mk.yaw = yawTo(m, b); th.mk.r = gap(m, b);
        if (u.t > 1) W.drag(b, m.x, m.z, 2.2, dt);
        if (bite && u.t > 1) P.hurt(b, K(m, 0.26), b.x, b.z, null, false, 'thread');
      }
      if (u.t < 8 && u.on.some((th) => !th.cut)) return;
      for (const th of u.on) {
        if (th.cut) continue;
        // Reeled in: to her feet, and her shears.
        const b = th.b, L = gap(m, b) || 1, x = m.x + (b.x - m.x) / L * 2.6, z = m.z + (b.z - m.z) / L * 2.6;
        if (!sim.world.inside(x, z, 0.5)) { b.x = x; b.z = z; }
        P.hurt(b, K(m, 2.1), m.x, m.z, 4, false, 'reel');
        W.warn(WARN.sea_reel, 4);
        snuff(th.mk);
      }
      f.threads = null; f.hold = false; m.noTurn = false; m.script = null; m.state = 0;
    },
    end(W, f, live) { for (const m of live) m.script = null; },
    order(W, f, b, [m]) {
      const th = f.threads?.on.find((q) => q.b === b && !q.cut);
      if (!th || !m) return null;
      const to = W.shelter(b, m.x, m.z, f.forms?.map(([x, z]) => [x, z, 0.75]));
      return to ? { to, urgent: true } : null;
    },
  },

  // ---- The Leading Man: the house lights go down, and only the spotlight is safe ----------------------------------------------
  leadingman: {
    open: 'led_open', pace: [4.3, 3.3, 0.35], turn: [20, 5], enrage: [225, 2, 'led_enrage'],
    deck: ['bow', 'speech', 'flourish', 'exit', 'roses'],
    adds: [
      { at: 0.7, warn: 'led_under', n: 2, pick: ['ph_understudy'], from: 'doors', hp: 540, damage: 20, name: 'UNDERSTUDY', pal: ['Ashen'], setUp: melee },
      { at: 0.35, warn: 'led_under', n: 3, pick: ['ph_understudy'], from: 'doors', hp: 540, damage: 20, name: 'UNDERSTUDY', pal: ['Ashen'], setUp: melee },
    ],
    moves: {
      bow: { clip: 'atk2', secs: 1.4, warn: 'led_bow', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.2), { r: 9, half: 1.2 }) },
      speech: { clip: 'atk1', at: 0.45, secs: 1.3, warn: 'led_speech', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.55), { n: 4, elem: ARCANE }) },
      flourish: { who: 'none', clip: 'roar', at: 0.45, secs: 1.5, warn: 'led_flourish', go(W, f, m, t, P) {
        const a = Math.random() * TAU;
        MOVES.bladeNova(P, m, null, K(m, 0.33), { n: 10, speed: 9.5, turn: a });
        P.later(0.55, () => { if (!m.dead) MOVES.bladeNova(P, m, null, K(m, 0.33), { n: 10, speed: 9.5, turn: a + 0.31 }); });
      } },
      exit: { who: 'far', clip: null, warn: 'led_exit', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.5), { r: 22, w: 1.5, elem: SPIRIT }) },
      roses: { clip: 'atk3', secs: 1.3, warn: 'led_roses', go: (W, f, m, t, P) => P.rain(t.x, t.z, 10, 8, 2, { r: 2.2, fuse: 1.4, dmg: K(m, 0.8), life: 3, dps: K(m, 0.6), elem: FIRE, tag: 'roses' }) },
    },
    // The dark, three times, as his life goes (an act each): everything but a circle of light, and the light is his: he
    // walks his marks on the boards in it for twelve seconds, and roses come down inside it to be stepped round.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, d = roomOf(f.boss.room).delve, u = f.dark;
      if (!u) {
        const act = [0.75, 0.5, 0.25].findIndex((at, i) => m.hp < m.maxHp * at && !(f.acts & (1 << i)));
        if (act < 0 || m.state !== 0 || m.script || f.turn) return;
        f.acts |= 1 << act;
        f.hold = true; m.noTurn = true;
        const marks = STAGE_MARKS.map(([x, z]) => toWorld(x, z, d));
        let k = act % marks.length, wait = 3.2;
        m.script = (b, dt2, s2) => { if ((wait -= dt2) > 0) return stand(b, dt2); if (walkTo(b, marks[k][0], marks[k][1], dt2, s2, 2.4)) k = (k + 1) % marks.length; return true; };
        f.dark = { t: 0, rose: 4.5, mk: P.mark({ shape: 'ring', ride: m, r: 60, r0: 5.6, fuse: 3.2, dmg: K(m, 1.1), life: 12, dps: K(m, 1.4), elem: VOID, quiet: true, tag: 'dark' }) };
        W.warn(WARN.led_dark);
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.2);
        return;
      }
      u.t += dt;
      if (u.t > 15.2 || m.dead || u.mk.dead) { snuff(u.mk); f.dark = null; f.hold = false; m.noTurn = false; m.script = null; m.state = 0; if (!m.dead) W.warn(WARN.led_lights, 10); return; }
      if ((sim.tick & 7) === 0) sim.casting.burst(FX.RING, LIGHT, m.x, m.y + 0.12, m.z, 5.2, 5.6, 0.3, { alpha: 0.8, light: 9, lightR: 9 });
      if (u.t > 3.2 && (u.rose -= dt) <= 0) {
        u.rose = 2.6;
        W.warn(WARN.led_roses, 12);
        for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, r = 1.5 + Math.random() * 3; P.mark({ x: m.x + Math.sin(a) * r, z: m.z + Math.cos(a) * r, r: 1.7, fuse: 1.4, dmg: K(m, 0.7), elem: FIRE, tag: 'roses' }); }
      }
    },
    end(W, f, live) { for (const m of live) m.script = null; },
    // In his light: within a few strides of him, wherever he's got to.
    order(W, f, b, [m]) {
      if (!f.dark || !m) return null;
      const dx = b.x - m.x, dz = b.z - m.z, L = Math.hypot(dx, dz) || 1;
      if (L < 4) return null;
      return { to: [m.x + dx / L * 2.8, m.z + dz / L * 2.8], urgent: true };
    },
  },

  // ---- The Dollmaker: when the music stops, nothing moves, or she takes it ----------------------------------------------------
  dollmaker: {
    open: 'dol_open', pace: [4.4, 3.3, 0.3], turn: [22, 4], enrage: [330, 3, 'dol_enrage'],
    deck: ['strings', 'china', 'march', 'gaze', 'rings'],
    adds: [0.75, 0.5, 0.25].map((at, i) => ({ at, warn: 'dol_dolls', n: 3 + i, pick: ['ph_doll'], from: 'doors', hp: 280, damage: 13, speed: 5.4, name: 'DOLL', pal: ['Porcelain'] })),
    moves: {
      strings: { who: 'none', clip: 'roar', secs: 1.3, warn: 'dol_strings', go: (W, f, m, t, P) => MOVES.fireWheel(P, m, null, K(m, 0.4), { arms: 5, r: 15, life: 5, spin: Math.random() < 0.5 ? 0.6 : -0.6, elem: ARCANE }) },
      china: { who: 'far', clip: 'atk1', at: 0.4, secs: 1.2, warn: 'dol_china', go: (W, f, m, t, P) => MOVES.boulder(P, m, t, K(m, 0.4)) },
      march: { clip: 'atk3', secs: 1.3, warn: 'dol_march', go: (W, f, m, t, P) => { for (const turn of [-0.45, 0, 0.45]) P.march(m.x, m.z, yawTo(m, t) + turn, 10, 1.9, 0.14, { r: 1.25, fuse: 0.85, dmg: K(m, 1.2), knock: 2, elem: SPIRIT, from: m, tag: 'soldiers' }); } },
      gaze: { clip: 'atk2', secs: 1.3, warn: 'dol_gaze', go: (W, f, m, t, P) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: 15, half: 0.55, fuse: 1.2, dmg: K(m, 1.1), elem: VOID, from: m, aim: t, lock: 0.5, tag: 'gaze' }) },
      rings: { clip: 'atk4', secs: 1.3, warn: 'dol_rings', go: (W, f, m, t, P) => { for (const b of new Set([t, W.farthest(m)])) P.rings(b.x, b.z, [3, 6], 0.7, { fuse: 1.1, dmg: K(m, 0.8), elem: ARCANE, from: m, tag: 'chimes' }); } },
    },
    // The music box: it slows (three seconds to get clear of everything), and stops. While it's stopped the whole room is
    // still: she, her dolls, whatever was on the floor. Whoever takes a step is hurt for it, and again for the next.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.still;
      const free = (k) => { if (k.script === stand) { k.script = null; k.state = 0; } };
      if (!u) {
        if (m.state !== 0 || m.script || f.turn || !W.every(f, 'still', m.hp < m.maxHp * 0.4 ? 23 : 31)) return;
        if (!m.perform({ clip: 'roar', secs: 3 })) return;
        f.still = { stage: 'wind', t: 0, at: new Map(), tick: 0 };
        f.hold = true; m.noTurn = true;
        W.warn(WARN.dol_wind);
        return;
      }
      u.t += dt;
      if (m.dead) { for (const a of W.adds()) free(a); f.still = null; f.hold = false; return; }
      if (u.stage === 'wind') {
        if (u.t < 3) return;
        // (Under four tenths of her life the box sometimes only slows, and picks up: whoever stopped for it is caught.)
        if (m.hp < m.maxHp * 0.4 && !f.feinted && Math.random() < 0.45) {
          f.feinted = true; f.still = null; f.hold = false; m.noTurn = false;
          W.warn(WARN.dol_feint);
          for (const b of loose(W)) P.rings(b.x, b.z, [3, 6], 0.7, { fuse: 1.3, dmg: K(m, 0.8), elem: ARCANE, from: m, tag: 'chimes' });
          return;
        }
        f.feinted = false;
        u.stage = 'stop'; u.t = 0;
        // Everything stops with it.
        P.clear();
        m.state = 0; m.act = null; m.script = stand;
        for (const a of W.adds()) if (!a.script) a.script = stand;
        W.warn(WARN.dol_still);
        sim.casting.burst(FX.RING, VOID, m.x, m.y + 0.2, m.z, 2, 30, 0.8, { light: 8, lightR: 16 });
        return;
      }
      for (const a of W.adds()) if (!a.script) a.script = stand;
      // (A moment to stop in; then where each stands is where it has to stay.)
      if (u.t > 0.7) {
        if ((u.tick -= dt) <= 0) {
          u.tick = 0.4;
          for (const b of W.bodies()) {
            const was = u.at.get(b);
            if (was && Math.hypot(b.x - was[0], b.z - was[1]) > 0.75) {
              P.hurt(b, K(m, 0.85), b.x, b.z, null, false, 'moved');
              sim.casting.burst(FX.SHOCK, VOID, b.x, b.y + 1, b.z, 0.5, 2, 0.4, { light: 6, lightR: 5 });
            }
            u.at.set(b, [b.x, b.z]);
          }
        }
      }
      if (u.t < 4.4) return;
      m.script = null; m.state = 0; m.noTurn = false;
      for (const a of W.adds()) free(a);
      f.still = null; f.hold = false;
      W.warn(WARN.dol_play, 5);
    },
    end(W, f) { for (const a of W.adds()) if (a.script === stand) a.script = null; },
    order: (W, f) => (f.still?.stage === 'stop' ? { still: true } : null),
  },

  // ==== The Kingsbarrow ======================================================================================================

  // ---- The Gravewarden: blows glance off his plate, till he's made to charge a column ------------------------------------------
  gravewarden: {
    open: 'grv_open', pace: [4.2, 3.3, 0.35], turn: [21, 5], enrage: [290, 2.5, 'grv_enrage'],
    deck: ['charge', 'cleave', 'bash', 'charge', 'quake', 'bones'],
    adds: [{ at: 0.5, warn: 'grv_guard', n: 3, pick: GUARD, from: 'doors', hp: 880, damage: 28, name: 'BARROW GUARD', pal: ['Verdigris'], tricks: true }],
    begin(W, f, [m]) { f.plate = 0.4; m.shrug = 0.4; },
    moves: {
      // His head down along a line at one of you, the line following them two and a half seconds; then he comes down it.
      // If a standing stone is in it, that's where he stops: stunned, and his plate cracked a step.
      charge: { who: 'mark', clip: null, warn: 'grv_charge', gap: 10, go(W, f, m, t, P) {
        const sim = W.sim, d = roomOf(f.boss.room).delve, far = 30, fuse = 3.2, lock = 0.78;
        const mk = P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: far, w: 1.6, fuse, lock, aim: t, dmg: K(m, 0.8), knock: 6, elem: BONE, from: m, tag: 'charge' });
        f.charge = { on: t, mk };
        let crash = false, cut = false;
        // (Where the line ends: the first rock down it, read as it stops following.)
        const reach = () => {
          if (!cut) {
            cut = true;
            const hit = caveRay(m.x, m.z, Math.sin(mk.yaw), Math.cos(mk.yaw), far);
            const len = hit > 0 ? hit : far, ex = m.x + Math.sin(mk.yaw) * len, ez = m.z + Math.cos(mk.yaw) * len;
            crash = hit > 0 && WARDEN_COLUMNS.some(([cx, cz]) => Math.hypot(d.x + cx - ex, d.z + cz - ez) < 2.6);
            mk.r = len;
          }
          return mk.r - 1.5;
        };
        run(m, () => { if (mk.t >= fuse * lock) reach(); return mk.yaw; }, reach, fuse, 0.45, () => {
          f.charge = null;
          if (!crash || m.dead) return;
          f.plate = Math.min(1, f.plate + 0.15); f.knit = 0;
          W.warn(WARN.grv_crash, 4);
          sim.event(EV.GROUND, m.x, m.y, m.z); sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.2);
          sim.casting.burst(FX.SHOCK, STONE, m.x, m.y + 1.5, m.z, 1, 6, 0.5, { light: 9, lightR: 10 });
          m.state = 0; m.act = null; m.perform({ clip: 'hit', secs: 5 });
          m.shrug = 1.4; f.stun = 5.5;
        });
      } },
      cleave: { clip: 'atk2', secs: 1.4, warn: 'grv_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.2), { r: 10, half: 1.1, elem: BONE }) },
      bash: { clip: 'bash', secs: 1.3, warn: 'grv_bash', go: (W, f, m, t, P) => MOVES.shieldWall(P, m, t, K(m, 0.6), { r: 7, w: 3 }) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'grv_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.4), { reach: 26, speed: 10, elem: BONE }) },
      bones: { clip: 'atk3', secs: 1.3, warn: 'grv_bones', go: (W, f, m, t, P) => { for (const turn of [-0.45, 0, 0.45]) P.march(m.x, m.z, yawTo(m, t) + turn, 10, 1.9, 0.14, { r: 1.25, fuse: 0.85, dmg: K(m, 1.2), knock: 2, elem: BONE, from: m, tag: 'bones' }); } },
    },
    // His plate: what it turns is what's left of it, but for the seconds he's stunned. It knits a step every forty
    // seconds he isn't made to strike a stone.
    step(W, f, [m], dt) {
      if (!m) return;
      if (f.stun > 0) { if ((f.stun -= dt) <= 0) m.shrug = f.plate; return; }
      m.shrug = f.plate;
      if (f.plate > 0.4 && (f.knit = (f.knit || 0) + dt) > 40) { f.knit = 0; f.plate = Math.max(0.4, f.plate - 0.15); W.warn(WARN.grv_knit, 20); }
    },
    // The one his line is on: round behind the nearest standing stone from him, while it's still following.
    order(W, f, b, [m]) {
      const c = f.charge;
      if (!c || c.on !== b || !m || c.mk.t >= c.mk.fuse * c.mk.lock) return null;
      const to = W.shelter(b, m.x, m.z);
      return to ? { to, urgent: true } : null;
    },
  },

  // ---- The Ossuary Golem: it falls apart instead of dying, twice, and its bones get up -----------------------------------------
  golem: {
    open: 'gol_open', pace: [4.6, 3.6, 0.35], turn: [20, 5], enrage: [330, 2.5, 'gol_enrage'],
    deck: ['slam', 'skull', 'spikes', 'grind', 'rain'],
    begin(W, f, [m]) {
      f.lives = 2;
      // (Its end, twice refused: src/sim/tripo.js lastStand.)
      m.lastStand = (k) => {
        if (W.fight !== f) return false;
        if (f.fallen) { k.hp = 1; return true; }
        if (f.lives <= 0) return false;
        f.lives--;
        const sim = W.sim, d = roomOf(f.boss.room).delve, n = f.lives ? 3 : 4;
        k.hp = 1; k.shrug = 0; k.buried = true; k.noTurn = true; k.state = 0; k.act = null; k.script = stand;
        f.hold = true; f.fallen = { t: 0, seen: 0, back: 0 };
        W.warn(WARN.gol_fall);
        sim.event(EV.GROUND, k.x, k.y, k.z);
        sim.casting.burst(FX.SHOCK, BONE, k.x, k.y + 1.5, k.z, 1, 8, 0.6, { light: 9, lightR: 12 });
        // Its bones, in the bays at the two ends of the hall, the farthest first: each walks back to where it fell, and
        // fights nobody. One that gets there is part of it again.
        const bays = OSSUARY_BAYS.map(([x, z]) => toWorld(x, z, d)).sort((a, c) => Math.hypot(c[0] - k.x, c[1] - k.z) - Math.hypot(a[0] - k.x, a[1] - k.z)).slice(0, n);
        bays.forEach((at, i) => W.spawnAdds(`golem_thrall_${f.lives}_${i}`, 'kb_thrall', at, 1, (q) => {
          q.thrall = true; q.hp = q.maxHp = 620; q.opts.damage = 0; q.opts.name = 'BONE THRALL'; q.aggro = true; q.opts.leash = 400; q.opts.sight = 80;
          q.script = (b, dt2, s2) => {
            if (!f.fallen || k.dead) { b.script = null; return false; }
            if (walkTo(b, k.x, k.z, dt2, s2, b.flinch > 0 ? 0.4 : 1.25) || Math.hypot(b.x - k.x, b.z - k.z) < 2.4) { f.fallen.back++; b.hp = 0; b.script = null; W.warn(WARN.gol_back, 3); s2.casting.burst(FX.PUFF, BONE, b.x, b.y + 1, b.z, 0.6, 2.4, 0.5); s2.event(EV.ROAR, k.x, k.y + 2, k.z, 0.8); }
            return true;
          };
        }, ['Bone-white']));
        return true;
      };
    },
    moves: {
      slam: { who: 'none', clip: 'jump', secs: 1.6, warn: 'gol_slam', go: (W, f, m, t, P) => MOVES.stompRings(P, m, null, K(m, 0.6), { r: 5.5, elem: BONE }) },
      skull: { who: 'far', clip: 'atk1', at: 0.4, secs: 1.2, warn: 'gol_skull', go: (W, f, m, t, P) => MOVES.boulder(P, m, t, K(m, 0.42)) },
      spikes: { clip: 'atk3', secs: 1.3, warn: 'gol_spikes', go: (W, f, m, t, P) => { for (const turn of [-0.42, 0, 0.42]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 20, w: 1.2, fuse: 1.1, dmg: K(m, 1.0), knock: 3, elem: BONE, from: m, tag: 'spikes' }); } },
      grind: { who: 'none', clip: 'roar', secs: 1.3, warn: 'gol_grind', go: (W, f, m, t, P) => MOVES.fireWheel(P, m, null, K(m, 0.42), { r: 11, life: 6, spin: Math.random() < 0.5 ? 0.7 : -0.7, elem: BONE }) },
      rain: { who: 'none', clip: 'roar', secs: 1.3, warn: 'gol_rain', go: (W, f, m, t, P) => fall(W, P, m, K(m, 0.8), BONE, 'bonefall') },
    },
    step(W, f, [m], dt) {
      const u = f.fallen;
      if (!m || !u) return;
      const sim = W.sim, P = sim.perils, th = W.adds().filter((a) => a.thrall);
      u.t += dt; u.seen = Math.max(u.seen, th.length);
      if (th.length || (u.seen ? u.t < 1.5 : u.t < 6)) { if (u.t < 45) return; for (const a of th) a.hp = 0; }
      // Together again: with whatever walked back, or with nothing.
      const back = u.back;
      f.fallen = null; f.hold = false;
      m.buried = false; m.noTurn = false; m.script = null; m.state = 0;
      m.hp = m.maxHp * (0.14 + 0.13 * back);
      sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.4);
      if (back) { m.opts.damage *= 1 + 0.1 * back; m.shrug = 1; W.warn(WARN.gol_whole); }
      else { W.warn(WARN.gol_broken); m.perform({ clip: 'hit', secs: 3 }); m.shrug = 1.5; P.later(6, () => { m.shrug = 1; }); }
    },
  },

  // ---- Ossivar, the Barrow Wyrm: the breath, the grave shared out among you, and the flight over the vault --------------------
  wyrm: {
    open: 'wyr_open', pace: [4.6, 3.6, 0.3], turn: [22, 4], enrage: [350, 3, 'wyr_enrage'],
    deck: ['breath', 'rake', 'fall'],
    setUp(W, m) { m.opts.breathRange = 14; m.opts.breathDps = 30; m.opts.radius = 2.2; },
    moves: {
      // Its breath: a cone before it, aimed as it draws it and held there. Only its tank stands in that.
      breath: { who: 'none', clip: null, warn: 'wyr_breath', gap: 20, when: (W, f, m) => !!m.rig.clips.breath && !f.turn?.on, go(W, f, m, t, P) {
        const clip = m.rig.clips.breath2 && Math.random() < 0.4 ? 'breath2' : 'breath';
        m.breathing = true; m.breathHeld = true; m.state = 4; m.setClip(clip); m.t = 0;
        const w = m.meta.breathWin || [0.25, 0.8], dur = m.rig.clips[clip].dur, tank = W.tank(m);
        P.mark({ shape: 'cone', ride: m, r: 16, half: 0.6, fuse: w[0] * dur, life: (w[1] - w[0]) * dur, dps: K(m, 0.5), elem: DRAIN, from: m, tag: 'breath', spare: (b) => b === tank });
      } },
      rake: { clip: 'atk1', face: false, at: 0.9, secs: 1.5, warn: 'wyr_rake', go(W, f, m, t, P) { const yaw = yawTo(m, t); for (const a of [-0.4, 0, 0.4]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yaw + a, r: 16, w: 1, fuse: 1.1, dmg: K(m, 0.45), knock: 3, elem: BONE, from: m, tag: 'rake' }); } },
      fall: { who: 'none', clip: 'roar', secs: 1.3, warn: 'wyr_fall', go: (W, f, m, t, P) => fall(W, P, m, K(m, 0.36), BONE, 'vaultfall') },
    },
    // The grave: a circle on one of you, and what lands in it is shared out among whoever's stood in it: stand together.
    // The pyre: a fire on each of you that burns whoever's in it as it goes out: stand apart. Turn about; and once it's
    // been in the air, both at once: the grave for those with no fire on them.
    step(W, f, [m]) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.rite;
      // (Its breath over: its head's its own again.)
      if (m.breathing && m.state !== 4) { m.breathing = false; m.breathHeld = false; m.breathCd = 1e9; }
      if (u && (!u.grave || u.grave.dead || u.grave.landed) && u.pyres.every((q) => q.mk.dead || q.mk.landed)) f.rite = null;
      // Into the air at fifty-five hundredths of its life: three passes, tomb drakes out of the walls, and a dive.
      if (f.phase === 0 && m.hp < m.maxHp * 0.55 && m.state === 0 && !m.script && !m.breathing && !f.turn && !f.rite) {
        f.phase = 1; f.hold = true;
        W.callAdds(f, m, { warn: 'wyr_whelps', n: 3, pick: ['dragonling_undead'], from: 'doors', hp: 600, damage: 20, name: 'TOMB DRAKE', pal: ['Bone-white'], tricks: true });
        soar(W, f, m, { passes: 3, elem: DRAIN, k: 0.6, warn: 'wyr_air', dive: 'wyr_dive', land: () => { f.phase = 2; f.hold = false; m.opts.damage *= 1.15; W.warn(WARN.wyr_land); } });
        return;
      }
      if (f.phase === 1 || f.rite || m.state !== 0 || m.script || m.breathing || f.turn || !W.every(f, 'rite', f.phase === 2 ? 21 : 19)) return;
      const who = loose(W).sort(() => Math.random() - 0.5), kind = f.phase === 2 ? 'both' : (f.rites = (f.rites || 0) + 1) % 2 ? 'grave' : 'pyre';
      if (!who.length || !m.perform({ clip: 'roar', secs: 1.4 })) return;
      const rite = f.rite = { grave: null, on: null, pyres: [] };
      W.warn(WARN[kind === 'both' ? 'wyr_both' : kind === 'grave' ? 'wyr_grave' : 'wyr_pyre']);
      if (kind !== 'pyre') {
        const t = sim.player.dead || Math.random() < 0.5 ? who[0] : sim.player;
        rite.on = t;
        rite.grave = P.mark({ x: t.x, z: t.z, r: 4.6, fuse: 5.2, follow: t, lock: 0.15, soak: true, share: true, dmg: K(m, 3.2), elem: LIGHT, from: m, tag: 'grave' });
      }
      if (kind !== 'grave') {
        const burn = who.filter((b) => b !== rite.on).slice(0, kind === 'both' ? 2 : 4);
        for (const b of burn) rite.pyres.push({ b, mk: P.mark({ x: b.x, z: b.z, r: 3.6, fuse: 5.2, follow: b, lock: 1, dmg: K(m, 0.5), elem: FIRE, tag: 'pyre' }) });
      }
    },
    // A fire on you: away from everyone, and then not a step. No fire: into the grave's circle, if there is one.
    order(W, f, b) {
      const u = f.rite;
      if (!u) return null;
      if (u.pyres.some((q) => q.b === b && !q.mk.landed && !q.mk.dead)) {
        let near = null, nd = Infinity;
        for (const o of W.bodies()) if (o !== b) { const dd = Math.hypot(o.x - b.x, o.z - b.z); if (dd < nd) { nd = dd; near = o; } }
        const g = u.grave && !u.grave.landed ? Math.hypot(u.grave.x - b.x, u.grave.z - b.z) : Infinity;
        if (g < nd) { nd = g; near = u.grave; }
        if (!near || nd > 8.6) return { still: true };
        const L = nd || 1, room = roomOf(f.boss.room);
        return { to: within(room, b.x + (b.x - near.x) / L * 6, b.z + (b.z - near.z) / L * 6, 2.5), urgent: true };
      }
      const mk = u.grave;
      if (!mk || mk.landed || mk.dead || b.role === 'tank') return null;
      if (Math.hypot(b.x - mk.x, b.z - mk.z) < 2.4) return { still: true };
      return { to: [mk.x, mk.z], urgent: true };
    },
  },
};
void rnd; void gap; void POISON; void DEMONS; void STORM;
