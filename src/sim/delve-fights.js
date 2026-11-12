// The boss fights of Blackvigil Keep and the Howling Deeps, as data (src/core/delve-blackvigil.js and delve-deeps.js say who
// and where; src/sim/dungeon.js run() and play() run them). Each is in the Warrens' manner: a deck of called-out moves made
// of the named MOVES and sim.perils' pieces, something to do about each, adds at so much of its life, a turn on you, an
// enrage; and a step of its own for what's particular to it (the Unmaking, the brothers' cover, the Castellan's hall, the
// Sleeper under the ice). Everything dangerous is a mark or a shot, so the hired party and auto-play read it as they read
// the Warrens'.
//
// A move: who ('mark' one of you, 'far' whoever's furthest off, 'none'), clip (what the body plays; null if the move
// moves the body itself), at (seconds into the clip that it goes off; left out, it goes off at once and the clip plays
// over its warning), secs, warn (its call: src/core/dungeon.js WARN), go(W, f, m, t, P): W the Warrens, f the fight, m the
// boss's body, t whom it's for, P sim.perils. K(m, x) is x of one of its blows, so an enrage makes everything hit harder.
import { WARN, roomOf, roomSpot, toWorld } from '../core/dungeon.js';
import { EV } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';

const { FIRE, FROST, ARCANE, DRAIN, BONE, VOID, POISON, SPIRIT } = ELEM;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const K = (m, x) => m.opts.damage * x;
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
        m.ward = 0.35;
        P.later(5, () => { m.ward = 1; });
        P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: m.yaw, r: 9, half: 1.05, fuse: 1.5, dmg: K(m, 0.9), knock: 5, life: 3.4, dps: K(m, 0.8), elem: DRAIN, from: m, tag: 'shield', spare: (b) => b === tank });
      } },
      charge: { who: 'far', clip: null, warn: 'mal_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.5), { r: 20, w: 1.5, elem: DRAIN }) },
      cleave: { clip: 'atk2', secs: 1.4, warn: 'mal_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.25)) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'mal_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 24, speed: 10, elem: DRAIN }) },
      lances: { clip: 'atk1', secs: 1.3, warn: 'mal_lances', go: (W, f, m, t, P) => lances(P, m, t, K(m, 1.0)) },
    },
    // Behind him while the shield's set, for those who aren't holding him.
    stance(W, f, h, m) {
      if (!(m.ward < 1) || h.role === 'tank') return null;
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
        m.ward = 1.6; sim.perils.later(4, () => { m.ward = 1; });
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
        g.ward = f.cover === g ? 1 : 0.15; l.ward = f.cover === l ? 1 : 0.15;
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
      last.ward = 1;
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
        m.ward = 0.25; m.noTurn = true;
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
        f.phase = 2; f.hold = false; m.ward = 1; m.noTurn = false; m.script = null; m.state = 0;
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
};
void rnd; void gap; void POISON;
