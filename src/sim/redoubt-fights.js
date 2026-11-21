// The fights in the Redoubt under the Sill (src/core/delve-redoubt.js), the first you meet down in Phobos's country, at about
// level five, alone. In the manner of src/sim/castle-fights.js, but each only a few calls long, and each call a thing to
// learn that the later fights ask of you again: out of an arc, out of a line, jump a ring, cut down what's called.
//   the Pen-Warden, in his pens: his chain of keys swung round him (out of the ring), his club, a haul on his chain down a
//     line; and at so much of his life he opens the cages, and his debtors come at you.
//   Sir Oswin Carrow, Master of Harness: his charge and his sweep, a stamp to jump; and at his word the empty harness on
//     the stands down his hall gets up and walks, twice, two by two.
//   Knight-Commander Rothgar, the Red Hand: blade, charge, quake, his fire branded on the floor; his guard comes to him; and
//     at the turn of the fight his banner set up before his seat, which mends him while it stands: cut it down.
// Gone in alone (party: false), so their calls speak to one: you.
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';
import { WARN, roomOf, roomSpot } from '../core/dungeon.js';
import { BANNER_AT, HARNESS_ROWS, PEN_DOORS } from '../core/delve-redoubt.js';

const { DRAIN, STONE, FIRE } = ELEM;
const at = (W, [x, z]) => [W.delve.x + x, W.delve.z + z];
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const K = (m, x) => m.opts.damage * x * 1.3;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 7, half: o.half || 1.0, fuse: o.fuse || 1.3, dmg, knock: 3, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
const KNIGHTS = ['velscour_knight_1', 'velscour_knight_2', 'velscour_knight_3'];
const DEBTORS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const HARNESS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
// (Called-up men: they fight, and come straight for you.)
const keen = (W, k) => { k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; };
// (Carrow's harness, marked as his: his order sends you to it.)
const walks = (W, k) => { k.harness = true; };
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export const REDOUBT_FIGHTS = {
  // ---- the Pen-Warden: keys, club, chain, and the cages opened ---------------------------------------------------------------
  penwarden: {
    open: 'pen_open', pace: [5.2, 4.2, 0.3], turn: [24, 4], enrage: [240, 1.8, 'pen_enrage'],
    deck: ['swing', 'slam', 'drag', 'slam'],
    adds: [
      { at: 0.66, warn: 'pen_debtors', n: 2, pick: DEBTORS, from: 'cages', hp: 150, damage: 7, name: 'DEBTOR', pal: ['Ashen'] },
      { at: 0.33, warn: 'pen_debtors', n: 3, pick: DEBTORS, from: 'cages', hp: 150, damage: 7, name: 'DEBTOR', pal: ['Ashen', 'Bone-white'] },
    ],
    moves: {
      // His chain of keys swung round him: a ring, the middle of it under him safe for nobody.
      swing: { who: 'none', clip: 'atk2', at: 0.5, secs: 1.5, warn: 'pen_swing', go: (W, f, m, t, P) => P.mark({ x: m.x, z: m.z, r: 5.5, fuse: 1.6, dmg: K(m, 0.9), knock: 4, elem: STONE, from: m, tag: 'keys' }) },
      slam: { clip: 'atk1', secs: 1.3, warn: 'pen_slam', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.0), { r: 6, half: 0.9 }) },
      drag: { clip: 'atk3', secs: 1.3, warn: 'pen_drag', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 14, w: 1.2, fuse: 1.3, dmg: K(m, 0.8), knock: -3, elem: DRAIN, from: m, tag: 'chain' }) },
    },
    // (The cages down the pens' north wall: where his debtors are let out from. Each call, one cage's worth at each.)
    step(W, f, [m]) {
      if (!m || f.cagesSet) return;
      f.cagesSet = true;
      f.cages = PEN_DOORS.map((p) => at(W, p));
    },
    // Once the cages are open: off the cage wall, where the debtors come out at your back, into the open middle of the pens
    // (unless he's turned on you: out of his reach first).
    order(W, f, b, [m]) {
      if (!m || !f.cages || !(f.addN > 0)) return null;
      if (m.fixOn === b && W.sim.time < m.fixT) return null;
      if (!f.cages.some(([x, z]) => Math.hypot(x - b.x, z - b.z) < 6)) return null;
      const [rx, , rz] = roomSpot(roomOf(f.boss.room).id);
      return { to: [rx, rz] };
    },
  },

  // ---- Sir Oswin Carrow: charge, sweep, stamp, and the harness walking ------------------------------------------------------
  carrow: {
    open: 'car_open', pace: [4.8, 3.8, 0.3], turn: [22, 4], enrage: [240, 1.8, 'car_enrage'],
    deck: ['charge', 'cleave', 'stamp', 'cleave'],
    adds: [
      { at: 0.7, warn: 'car_harness', n: 2, pick: HARNESS, from: 'harness', hp: 220, damage: 8, name: 'EMPTY HARNESS', pal: ['Sable'], setUp: walks },
      { at: 0.35, warn: 'car_harness', n: 2, pick: HARNESS, from: 'harness', hp: 220, damage: 8, name: 'EMPTY HARNESS', pal: ['Sable', 'Oxblood'], setUp: walks },
    ],
    moves: {
      charge: { who: 'far', clip: null, warn: 'car_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.6), { r: 20, w: 1.6 }) },
      cleave: { clip: 'atk2', secs: 1.3, warn: 'car_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.05), { r: 7, half: 1.0 }) },
      stamp: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'car_stamp', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.4), { reach: 18, speed: 8 }) },
    },
    step(W, f, [m]) {
      if (!m || f.harnessSet) return;
      f.harnessSet = true;
      f.harness = HARNESS_ROWS.map((p) => at(W, p));
    },
    // While the harness walks: cut it down, the nearest first, before it pins you against him.
    order(W, f, b, [m]) {
      if (!m) return null;
      if (m.fixOn === b && W.sim.time < m.fixT) return null;
      const hs = W.adds().filter((a) => a.harness && !a.dead && a.hp > 0);
      if (!hs.length) return null;
      const near = hs.reduce((p, q) => (gap(q, b) < gap(p, b) ? q : p));
      return { to: [near.x, near.z] };
    },
  },

  // ---- Knight-Commander Rothgar, the Red Hand: blade, charge, quake, brand, his guard, his banner ------------------------------
  rothgar: {
    open: 'rot_open', pace: [4.4, 3.4, 0.3], turn: [22, 4], enrage: [300, 2, 'rot_enrage'],
    deck: (f) => (f.banner && !f.fallen ? ['brand', 'cleave', 'quake', 'charge'] : ['cleave', 'charge', 'brand', 'cleave', 'quake']),
    adds: [{ at: 0.75, warn: 'rot_guard', n: 1, pick: KNIGHTS, from: 'edge', places: 2, hp: 180, damage: 6, name: 'REDOUBT GUARD', pal: ['Oxblood'], setUp: keen }],
    moves: {
      cleave: { clip: 'atk2', secs: 1.3, warn: 'rot_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 8, half: 1.05 }) },
      charge: { who: 'far', clip: null, warn: 'rot_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.6), { r: 22, w: 1.8 }) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'rot_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 20, speed: 9 }) },
      // His fire on the floor: under you, and round the hall.
      brand: { who: 'none', clip: 'atk4', secs: 1.4, warn: 'rot_brand', go(W, f, m, t, P) {
        const [rx, , rz] = roomSpot(roomOf(f.boss.room).id);
        for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.2, fuse: 1.9, dmg: K(m, 0.7), knock: 1, elem: FIRE, follow: b, lock: 0.45, tag: 'brand' });
        P.rain(rx, rz, 14, 5, 1.2, { r: 2, fuse: 1.8, dmg: K(m, 0.6), knock: 1, elem: FIRE, tag: 'brand' });
      } },
    },
    // At half his life, his banner set up before his seat: while it stands he mends a little every second. Cut it down.
    step(W, f, [m], dt) {
      if (!m) return;
      const life = m.hp / m.maxHp;
      if (!f.banner && life < 0.5) {
        const [x, z] = at(W, BANNER_AT);
        f.banner = { asked: true };
        W.spawnAdds('rot_banner', ['rd_banner'], [x, z], 1, (k) => { k.hp = k.maxHp = 420; k.opts.damage = 0; k.opts.speed = 0; k.opts.name = 'THE RED HAND\'S BANNER'; k.standard = true; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; f.banner = k; }, ['Oxblood']);
        W.warn(WARN.rot_banner, 5);
        W.sim.casting.burst(FX.PUFF, FIRE, x, W.sim.world.height(x, z) + 2, z, 1.2, 8, 0.6);
      }
      const st = f.banner?.asked ? null : f.banner;
      if (st && !st.dead && st.hp > 0) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.004 * dt);
      else if (st && !f.fallen) { f.fallen = true; W.warn(WARN.rot_fallen, 4); }
    },
    // While the banner stands: to it (unless he's turned on you; getting out of his reach comes first).
    order(W, f, b, [m]) {
      const st = f.banner;
      if (!m || !st || st.asked || st.dead || st.hp <= 0) return null;
      if (m.fixOn === b && W.sim.time < m.fixT) return null;
      return { to: [st.x, st.z] };
    },
  },
};
