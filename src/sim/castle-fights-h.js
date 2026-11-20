// The fights in Castle Velscour's High Ward and the Deep Stacks (src/core/delve-highward.js), in the manner of
// src/sim/castle-fights.js: a deck of called-out moves, a turn on you, an enrage, and one thing of its own:
//   the Censor, in the Restricted Vault: he reads the Index out, and whoever he can see when he shuts it is struck: the
//     four ranks of cases are what to stand behind;
//   the Star-Reader, in the Observatory: his eclipse burns three quarters of the room, and one quarter is dark;
//   the Sexton of the High Ward, in the Throne Antechambers: while his grave-lantern burns the graves give up their dead,
//     two at a time, without end; he lights it twice.
// Both delves are gone into alone or not, so their calls speak to one: you. Taken into src/sim/delve-fights.js FIGHTS.
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';
import { WARN, caveClear, roomOf, roomSpot } from '../core/dungeon.js';
import { GRAVES, LANTERN_AT, VAULT_RANKS } from '../core/delve-highward.js';

const { DRAIN, STONE, FIRE, BONE, VOID } = ELEM;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// (A spot in the delve, from its own x and z.)
const at = (W, [x, z]) => [W.delve.x + x, W.delve.z + z];
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const K = (m, x) => m.opts.damage * x * 1.3;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.15, dmg, knock: 4, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
const follow = (W, P, m, dmg, elem, tag) => { for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.9, dmg, knock: 1, elem, follow: b, lock: 0.45, tag }); };
const EXHUMED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];

export const FIGHTS_H = {
  // ---- the Censor: his brand, his pyre, his iron, the black that follows, the rows fired; and the Index ---------------------
  censor: {
    open: 'cen_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [300, 2, 'cen_enrage'],
    deck: ['brand', 'pyre', 'strike', 'redact', 'rows', 'strike'],
    adds: [],
    moves: {
      brand: { clip: 'atk1', secs: 1.3, warn: 'cen_brand', go: (W, f, m, t, P) => MOVES.fireFan(P, m, t, K(m, 0.7)) },
      pyre: { clip: 'atk2', secs: 1.3, warn: 'cen_pyre', go: (W, f, m, t, P) => MOVES.firepots(P, m, t, K(m, 0.45)) },
      strike: { clip: 'atk2', secs: 1.3, warn: 'cen_strike', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 8, half: 1.0 }) },
      redact: { who: 'none', clip: 'atk3', secs: 1.3, warn: 'cen_redact', go: (W, f, m, t, P) => follow(W, P, m, K(m, 0.55), VOID, 'redact') },
      // The rows of cases fired: three lanes across the vault, a lane between each clear.
      rows: { who: 'none', clip: 'atk3', secs: 1.6, warn: 'cen_rows', go(W, f, m, t, P) {
        const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id), off = (f.rowOff = ((f.rowOff || 0) + 1) % 2) * 4;
        for (const dz of [-8 + off, 0 + off, 8 + off]) P.mark({ shape: 'line', x: rx - r.hx, z: rz + dz - 2, yaw: Math.PI / 2, r: r.hx * 2, w: 1.5, fuse: 1.9, dmg: K(m, 1.2), knock: 3, elem: FIRE, from: m, tag: 'rows' });
      } },
    },
    // The Index read out: every thirty-two seconds he opens it and reads for three and a half, and every one of you he can
    // see when he shuts it is struck out. A rank of cases between you and him, and your name isn't read.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.read;
      if (u) {
        u.t += dt;
        if (u.t < 3.5) return;
        let hit = 0;
        for (const b of W.bodies()) if (caveClear(m.x, m.z, b.x, b.z, 0.05)) { P.hurt(b, K(m, 1.7), m.x, m.z, 5, false, 'index'); hit++; }
        sim.casting.burst(FX.SHOCK, VOID, m.x, m.y + 2.4, m.z, 2, 14, 0.9, { light: 9, lightR: 14 });
        if (!hit) W.warn(WARN.cen_unread, 5);
        f.read = null; f.hold = false; m.noTurn = false;
        return;
      }
      if ((f.readT = (f.readT ?? 14) + dt) > 32 && m.state === 0 && !m.script && !f.turn && m.perform({ clip: 'roar', secs: 3.5 })) {
        f.readT = 0; f.read = { t: 0 }; f.hold = true; m.noTurn = true;
        W.warn(WARN.cen_read, 4);
      }
    },
    // While he reads: round behind the nearest rank from him.
    order(W, f, b, [m]) {
      if (!m || !f.read) return null;
      const to = W.shelter(b, m.x, m.z, VAULT_RANKS.map(([x, z, r]) => [W.delve.x + x, W.delve.z + z, r]), 60);
      return to ? { to, urgent: true } : null;
    },
  },

  // ---- the Star-Reader: his lots, his falling stars, his wanderers, the orrery's wheel; and the eclipse --------------------
  starreader: {
    open: 'str_open', pace: [4.0, 3.0, 0.35], turn: [22, 4], enrage: [320, 2, 'str_enrage'],
    deck: ['fan', 'fall', 'seek', 'wheel', 'fan', 'fall'],
    adds: [],
    moves: {
      fan: { clip: 'atk1', secs: 1.3, warn: 'str_fan', go: (W, f, m, t, P) => MOVES.fireFan(P, m, t, K(m, 0.7)) },
      fall: { who: 'none', clip: 'atk2', secs: 1.4, warn: 'str_fall', go: (W, f, m, t, P) => P.rain(m.x, m.z, 15, 8, 1.3, { r: 2.2, fuse: 1.9, dmg: K(m, 0.6), knock: 1, elem: FIRE, tag: 'fall' }) },
      seek: { clip: 'atk3', secs: 1.2, warn: 'str_seek', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.3), { n: 3, speed: 4.6 }) },
      wheel: { who: 'none', clip: 'roar', secs: 1.5, warn: 'str_wheel', go: (W, f, m, t, P) => MOVES.fireWheel(P, m, t, K(m, 0.35)) },
    },
    // The eclipse: every thirty seconds, three quarters of the room under fire and one left dark, never the same one twice
    // running. The dark quarter's middle is where to stand.
    step(W, f, [m], dt) {
      if (!m) return;
      if ((f.ecl = (f.ecl ?? 8) + dt) < 30) return;
      f.ecl = 0; f.eclT = W.sim.time + 4.4; W.warn(WARN.str_eclipse, 5);
      const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id), P = W.sim.perils;
      f.dark = ((f.dark ?? 3) + 1 + ((W.sim.time * 7) | 0) % 3) % 4;
      const Q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [rx + sx * r.hx / 2, rz + sz * r.hz / 2]);
      f.darkAt = Q[f.dark];
      Q.forEach(([qx, qz], i) => { if (i !== f.dark) P.mark({ x: qx, z: qz, r: Math.min(r.hx, r.hz) * 0.57, fuse: 4.2, dmg: K(m, 1.7), knock: 1, elem: FIRE, from: m, tag: 'eclipse' }); });
    },
    order(W, f) { return f.eclT > W.sim.time && f.darkAt ? { to: f.darkAt, urgent: true } : null; },
  },

  // ---- the Sexton of the High Ward: his spade, the floor opened, his dirge, the march, the grave that follows; the lantern ----
  sexton: {
    open: 'sex_open', pace: [4.0, 3.0, 0.35], turn: [20, 4], enrage: [380, 2.2, 'sex_enrage'],
    deck: ['spade', 'graves', 'dirge', 'march', 'bury', 'spade'],
    adds: [],
    moves: {
      spade: { clip: 'atk2', secs: 1.3, warn: 'sex_spade', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 0.9), { r: 9, half: 1.0 }) },
      graves: { who: 'none', clip: 'atk3', secs: 1.4, warn: 'sex_graves', go: (W, f, m, t, P) => P.rain(m.x, m.z, 17, 9, 1.3, { r: 2.4, fuse: 1.7, dmg: K(m, 0.75), knock: 1, elem: BONE, tag: 'graves' }) },
      dirge: { who: 'none', clip: 'roar', at: 0.5, secs: 1.5, warn: 'sex_dirge', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 26, speed: 10 }) },
      march: { clip: 'atk1', secs: 1.3, warn: 'sex_march', go: (W, f, m, t, P) => { for (const turn of [-0.4, 0, 0.4]) P.march(m.x, m.z, yawTo(m, t) + turn, 9, 1.9, 0.14, { r: 1.25, fuse: 1.1, dmg: K(m, 0.55), knock: 2, elem: BONE, from: m, tag: 'march' }); } },
      bury: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'sex_bury', go: (W, f, m, t, P) => follow(W, P, m, K(m, 0.55), DRAIN, 'bury') },
    },
    // His grave-lantern: set down at four fifths of his life, and again at two fifths, each in its own place. While one
    // burns, two of the dead come up out of the graves every sixteen seconds (never more than six standing).
    step(W, f, [m], dt) {
      if (!m) return;
      const life = m.hp / m.maxHp, n = (f.lit || 0);
      if (n < 2 && life < (n ? 0.4 : 0.8) && !(f.lantern && !f.lantern.asked && !f.lantern.dead && f.lantern.hp > 0)) {
        const [x, z] = at(W, LANTERN_AT[n]);
        f.lit = n + 1; f.lantern = { asked: true }; f.raise = 8;
        W.spawnAdds(`sex_lantern_${n}`, ['ch_lantern'], [x, z], 1, (k) => { k.hp = k.maxHp = 10000; k.opts.damage = 0; k.opts.speed = 0; k.opts.name = 'THE GRAVE-LANTERN'; k.lantern = true; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; f.lantern = k; f.out = false; }, ['Bloodred']);
        W.warn(WARN.sex_lantern, 5);
      }
      const lt = f.lantern?.asked ? null : f.lantern;
      if (lt && !lt.dead && lt.hp > 0) {
        if ((f.raise = (f.raise || 0) + dt) > 16 && W.adds().filter((a) => a.exhumed && !a.dead && a.hp > 0).length < 5) {
          f.raise = 0; W.warn(WARN.sex_risen, 4);
          for (let i = 0; i < 2; i++) {
            const g = at(W, GRAVES[(f.graveN = (f.graveN || 0) + 1) % GRAVES.length]);
            W.spawnAdds(`sex_dead_${f.graveN}`, EXHUMED, g, 1, (k) => { k.hp = k.maxHp = 2800; k.opts.damage = 40; k.opts.name = 'THE EXHUMED'; k.exhumed = true; k.aggro = true; k.opts.leash = 300; k.opts.sight = 70; }, ['Skullwhite']);
          }
        }
      } else if (lt && !f.out) { f.out = true; W.warn(WARN.sex_out, 4); }
    },
    // While the lantern burns: everyone but whoever holds him, to it.
    order(W, f, b, [m]) {
      const lt = f.lantern;
      if (!m || !lt || lt.asked || lt.dead || lt.hp <= 0 || (W.tank(m) === b && W.bodies().length > 1)) return null;
      if (m.fixOn === b && W.sim.time < m.fixT) return null;
      return { to: [lt.x, lt.z] };
    },
  },
};
