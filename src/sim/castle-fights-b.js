// The fights in Castle Velscour's dungeons, set B (src/core/delve-castle-b.js), written as src/sim/castle-fights.js's are: a
// deck of called-out moves, adds at so much of its life, a turn on you, an enrage, and one thing of its own to learn.
// Taken into src/sim/delve-fights.js FIGHTS.
//   The Clockworks (src/core/delve-clockworks.js)
//     the Striker: wound a turn tighter every twenty seconds, and the harder for it, till someone stands on the release
//       plate and lets his spring down; his hammers fall along their rows, a lane between each.
//     the Regulator: the three pendulums swing across his hall in turn; and when he stops the clock, whatever moves is cut.
//     the Clockmaker: the long hand that sweeps round him; and twice he starts to turn back the hour, his winders at the
//       winding posts: cut them down in time, or he's mended. The Going Train stopped, fewer winders come to him; the
//       Escapement jammed, he can't turn the hour back at all.
//   The Menagerie of Chains (src/core/delve-menagerie.js)
//     Old Hunger: on a chain; what dies inside its reach he eats, and mends: the hounds are drawn out past it to be killed.
//     the Matron of Wings: her shriek takes everything she can see; get a dead tree between you.
//     the Keeper of Chains: his chain takes one of you and reels them in, unless he's hit hard enough to drop it (or a
//       chain post is put between); and he looses the beasts of every wing you didn't empty.
//   The Ossuary Chapel (src/core/delve-ossuary.js)
//     the Cantor of Jaws: her tithe of bone stays where it comes up, till she gathers it in and every thicket bursts.
//     the Bone Prior: he names one of you to kneel (not a step), bone coming up round them at everyone else; his old
//       priors rise unless the Under-Crypt's empty, his piers come down unless the Charnel Aisle is.
//   The Hall of Mirrors (src/core/delve-mirrors.js)
//     the Glazier: reflections pulled out of the glass, each of which throws his glare back and takes a share of his hurt.
//     the Duchess and her Glass: two of her, one that bleeds and one that's only glass, changing places; and an image out
//       of every great glass you left uncovered.
// A party's welcome in all four, so their calls speak to all of you.
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';
import { WARN, caveClear, roomOf, roomSpot } from '../core/dungeon.js';
import { HAMMER_ROWS, PENDULUMS, STRIKER_PLATE, WINDERS_AT } from '../core/delve-clockworks.js';
import { AVIARY_TREES, CHAIN_POSTS, PIT_CHAIN, PIT_STAKE } from '../core/delve-menagerie.js';
import { ALTAR, BONE_PIERS } from '../core/delve-ossuary.js';
import { GLASS_SPOTS, HALL_AXIS, IMAGE_GLASSES } from '../core/delve-mirrors.js';

const { DRAIN, STONE, BONE, SPIRIT, LIGHT, ARCANE, STORM } = ELEM;
const TAU = Math.PI * 2;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// (A spot in the delve, from its own x and z.)
const at = (W, [x, z]) => [W.delve.x + x, W.delve.z + z];
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const K = (m, x) => m.opts.damage * x * 1.3;
const up = (k) => !!k && !k.dead && k.hp > 0;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.3, dmg, knock: 4, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
// (Something thrown at each of you, and more of it round about.)
const hail = (W, P, m, dmg, elem, tag, R = 16, n = 7) => {
  for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.9, dmg, knock: 1, elem, follow: b, lock: 0.45, from: m, tag });
  P.rain(m.x, m.z, R, n, 1.2, { r: 2.1, fuse: 1.7, dmg: dmg * 0.8, knock: 1, elem, tag });
};
// (A line right across the boss's room at the delve's own z, from its west wall to its east.)
const lane = (W, f, m, P, z, w, dmg, tag, o = {}) => {
  const r = roomOf(f.boss.room), [rx] = roomSpot(r.id);
  return P.mark({ shape: 'line', x: rx - r.hx, z: W.delve.z + z, yaw: Math.PI / 2, r: r.hx * 2, w, fuse: 1.9, dmg, knock: 4, elem: STONE, from: m, tag, ...o });
};
// (A wing of the place you've emptied: its pack's lair cleared, now or before.)
const emptied = (W, key) => !!W.sim.tripo?.lairs.some((l) => l.key === key && (l.state === 'cleared' || l.clearedOnce));
// (Whoever isn't holding him; and the nearest of a list to a body.)
const free = (W, m, b) => W.tank(m) !== b;
const nearest = (list, b) => list.reduce((p, q) => (gap(q, b) < gap(p, b) ? q : p));
// (A body stood where it is, as its script: idle, and nothing else.)
const stand = (k, dt) => { k.vx = k.vz = 0; if (k.clip !== k.idleClip) k.setClip(k.idleClip); k.t = (k.t + dt) % k.rig.clips[k.clip].dur; return true; };
// (A mark shown on the floor that hurts nobody: somewhere to be. Taken away by lift.)
const show = (P, x, z, r, elem, tag) => P.mark({ x, z, r, fuse: 900, dmg: 0, soak: true, quiet: true, elem, tag });
const lift = (mk) => { if (mk) { mk.quiet = true; mk.then = null; mk.dmg = 0; mk.life = 0; mk.dps = 0; mk.touch = 0; mk.t = mk.fuse + 1; } };
// (Stopped where he stands for so long, and hurt the more for it: f.stun counts it down.)
const stun = (f, m, secs, share = 1.4) => { m.state = 0; m.act = null; m.perform({ clip: 'hit', secs }); m.shrug = share; f.stun = secs; f.hold = true; };
const unstun = (f, m, dt) => { if (!(f.stun > 0)) return false; if ((f.stun -= dt) <= 0) { m.shrug = 1; f.hold = false; } return true; };
// (Kept in its own room: a boss that follows whoever's holding it out through a doorway takes the fight where nothing of
// it is laid out, and the room it left lets the fight go.)
const pen = (W, f, m, pad = 2.5) => {
  const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id);
  m.x = Math.max(rx - r.hx + pad, Math.min(rx + r.hx - pad, m.x)); m.z = Math.max(rz - r.hz + pad, Math.min(rz + r.hz - pad, m.z));
};
// (One of Old Hunger's pit hounds, counted as it stands up: what it leaves when it dies is his to eat.)
const houndIn = (W, k) => { if (W.fight) (W.fight.hounds ||= []).push(k); };
// (An add that stands where it's put and does nothing: something to be broken.)
const still = (k, hp, name) => { k.hp = k.maxHp = hp; k.opts.damage = 0; k.opts.speed = 0; k.opts.name = name; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; k.script = stand; };
// (One that fights: its life, its blows, its name.)
const fighter = (k, hp, damage, name) => { k.hp = k.maxHp = hp; k.opts.damage = damage; k.opts.name = name; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; };

export const FIGHTS_B = {
  // ==== the Clockworks ========================================================================================================

  // ---- the Striker: his hammer, the hammers' rows, the hour, the cogs; wound tighter and tighter, and the release plate ----
  striker: {
    open: 'stk_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [330, 2, 'stk_enrage'],
    deck: ['hammer', 'rows', 'cogs', 'hour', 'throw', 'hammer'],
    adds: [],
    moves: {
      hammer: { clip: 'atk2', secs: 1.3, warn: 'stk_hammer', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 9, half: 1.1 }) },
      // The hammers down along their rows, every other one: a lane between each to stand in, and not the same lanes twice running.
      rows: { who: 'none', clip: 'atk3', secs: 1.6, warn: 'stk_rows', go(W, f, m, t, P) {
        f.rowOff = ((f.rowOff || 0) + 1) % 2;
        HAMMER_ROWS.forEach((z, i) => { if (i % 2 === f.rowOff) lane(W, f, m, P, z, 2.2, K(m, 1.4), 'rows'); });
      } },
      cogs: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'stk_cogs', go: (W, f, m, t, P) => hail(W, P, m, K(m, 0.8), STONE, 'cogs') },
      // The hour struck: a ring along the floor for each stroke, two of them.
      hour: { who: 'none', clip: 'jump', at: 0.5, secs: 1.5, warn: 'stk_hour', go(W, f, m, t, P) {
        MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 24, speed: 10 });
        P.later(1.3, () => { if (!m.dead) P.wave(m.x, m.z, { speed: 10, reach: 24, touch: K(m, 0.6), knock: 2, elem: STONE, from: m, r: 2, tag: 'hour' }); });
      } },
      throw: { who: 'far', clip: 'atk1', secs: 1.3, warn: 'stk_throw', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 24, w: 1.5, fuse: 1.3, dmg: K(m, 1.5), knock: 4, elem: STONE, from: m, aim: t, lock: 0.5, tag: 'throw' }) },
    },
    // His spring: a turn tighter every twenty seconds (five at most), each a seventh on his blows. Stood on for a second
    // and a half, the release plate lets it all down: he stands stopped five seconds, and is hurt the more.
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const P = W.sim.perils, [px, pz] = at(W, STRIKER_PLATE);
      f.base ??= m.opts.damage; f.wound ??= 0;
      if (unstun(f, m, dt)) return;
      if ((f.windT = (f.windT || 0) + dt) > 20 && f.wound < 5) {
        f.windT = 0; f.wound++; m.opts.damage = f.base * (1 + 0.15 * f.wound) * (f.enraged ? 2 : 1);
        if (f.wound >= 2) { W.warn(WARN.stk_wound, 18); f.plate ||= show(P, px, pz, 2.4, LIGHT, 'plate'); }
      }
      const on = f.wound >= 1 && W.bodies().some((b) => Math.hypot(b.x - px, b.z - pz) < 2.4);
      f.onPlate = on ? (f.onPlate || 0) + dt : 0;
      if (f.onPlate >= 1.5) {
        f.onPlate = 0; f.wound = 0; f.windT = 0; m.opts.damage = f.base * (f.enraged ? 2 : 1);
        lift(f.plate); f.plate = null;
        W.warn(WARN.stk_release, 4);
        W.sim.casting.burst(FX.SHOCK, STONE, m.x, m.y + 2, m.z, 1.2, 8, 0.6, { light: 8, lightR: 9 });
        stun(f, m, 5);
      }
    },
    // Wound twice or more: whoever of you is nearest the plate (and isn't holding him) goes and stands on it.
    order(W, f, b, [m]) {
      if (!m || !(f.wound >= 2) || f.stun > 0 || !free(W, m, b)) return null;
      const [px, pz] = at(W, STRIKER_PLATE), spot = { x: px, z: pz }, rest = W.bodies().filter((q) => free(W, m, q));
      return rest.length && nearest(rest, spot) === b ? { to: [px, pz], urgent: true } : null;
    },
    end(W, f) { lift(f.plate); },
  },

  // ---- the Regulator: the three pendulums, his blade, the springs, the seconds; and the clock stopped --------------------
  regulator: {
    open: 'reg_open', pace: [4.4, 3.4, 0.35], turn: [24, 4], enrage: [330, 2, 'reg_enrage'],
    deck: ['cut', 'springs', 'tick', 'weights', 'gears'],
    adds: [],
    moves: {
      cut: { clip: 'atk2', secs: 1.3, warn: 'reg_cut', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 9, half: 1.0, elem: SPIRIT }) },
      springs: { clip: 'atk3', secs: 1.3, warn: 'reg_springs', go: (W, f, m, t, P) => { for (const turn of [-0.5, 0, 0.5]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 20, w: 1, fuse: 1.1, dmg: K(m, 0.9), knock: 2, elem: SPIRIT, from: m, tag: 'springs' }); } },
      // The seconds counted out: a row of circles coming across the floor at each of you.
      tick: { who: 'none', clip: 'atk4', secs: 1.4, warn: 'reg_tick', go: (W, f, m, t, P) => { for (const b of W.bodies().slice(0, 3)) P.march(m.x, m.z, yawTo(m, b), 9, 2.4, 0.3, { r: 1.5, fuse: 1.0, dmg: K(m, 0.95), knock: 2, elem: ARCANE, from: m, tag: 'tick' }); } },
      gears: { who: 'none', clip: 'atk1', secs: 1.3, warn: 'reg_gears', go: (W, f, m, t, P) => hail(W, P, m, K(m, 0.85), STONE, 'gears') },
      weights: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'reg_weights', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 26, speed: 10 }) },
    },
    // The pendulums: every five seconds and a bit the next of the three comes across the hall along its sill. And every
    // thirty-four seconds he stops the clock: two seconds' warning with the floor cleared, then three when nothing may
    // move a step (he stands as stopped as the rest).
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const sim = W.sim, P = sim.perils, u = f.stop;
      if (u) {
        u.t += dt;
        if (u.stage === 'call' && u.t >= 2.2) { u.stage = 'stop'; u.t = 0; u.tick = 0; u.at = new Map(W.bodies().map((b) => [b, [b.x, b.z]])); }
        else if (u.stage === 'stop') {
          if ((u.tick -= dt) <= 0) {
            u.tick = 0.4;
            for (const b of W.bodies()) {
              const was = u.at.get(b);
              if (was && Math.hypot(b.x - was[0], b.z - was[1]) > 0.75) { P.hurt(b, K(m, 0.85), b.x, b.z, null, false, 'moved'); sim.casting.burst(FX.SHOCK, ARCANE, b.x, b.y + 1, b.z, 0.5, 2, 0.4, { light: 6, lightR: 5 }); }
              u.at.set(b, [b.x, b.z]);
            }
          }
          if (u.t >= 3.2) { f.stop = null; f.hold = false; m.script = null; m.state = 0; m.noTurn = false; W.warn(WARN.reg_go, 4); }
        }
        return;
      }
      if ((f.swingT = (f.swingT ?? -3) + dt) > 5.4) {
        f.swingT = 0;
        const z = PENDULUMS[(f.swingN = (f.swingN || 0) + 1) % PENDULUMS.length];
        lane(W, f, m, P, z, 1.7, K(m, 1.5), 'pendulum', { fuse: 2.1, knock: 6 });
        W.warn(WARN.reg_swing, 20);
      }
      if ((f.stopT = (f.stopT ?? 12) + dt) > 34 && m.state === 0 && !m.script && !f.turn) {
        f.stopT = 0; f.swingT = -4;
        f.stop = { stage: 'call', t: 0 }; f.hold = true; m.noTurn = true;
        W.clearGround();
        m.script = stand;
        W.warn(WARN.reg_stop, 4);
        sim.casting.burst(FX.SHOCK, ARCANE, m.x, m.y + 2, m.z, 1.4, 10, 0.7, { light: 10, lightR: 12 });
      }
    },
    order: (W, f) => (f.stop ? { still: true } : null),
    end(W, f, live) { for (const m of live) m.script = null; },
  },

  // ---- the Clockmaker: the long hand, the cogs, the springs, the gong; his winders; and the hour turned back --------------
  clockmaker: {
    open: 'ckm_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [390, 2.2, 'ckm_enrage'],
    deck: ['hand', 'cogs', 'springs', 'cut', 'chime', 'cogs'],
    adds: [
      { at: 0.8, warn: 'ckm_winders', n: (W, f) => (f.fewer ? 2 : 4), pick: ['cw_winder'], from: 'doors', hp: 5200, damage: 70, name: 'WINDER', pal: ['Greygold'] },
      { at: 0.45, warn: 'ckm_winders', n: (W, f) => (f.fewer ? 2 : 4), pick: ['cw_winder'], from: 'doors', hp: 5200, damage: 70, name: 'WINDER', pal: ['Greygold'] },
    ],
    moves: {
      // The long hand: a line out from where he stands that sweeps round for six seconds. Keep ahead of it, or get out past its end.
      hand: { who: 'none', clip: 'roar', secs: 1.5, warn: 'ckm_hand', go(W, f, m, t, P) {
        f.handDir = -(f.handDir || 1);
        P.mark({ shape: 'line', x: m.x, z: m.z, yaw: Math.random() * TAU, r: 18, w: 1.2, fuse: 1.6, dmg: K(m, 1.2), life: 6, spin: 0.5 * f.handDir, touch: K(m, 0.9), again: 1.2, knock: 2, elem: ARCANE, from: m, tag: 'hand' });
      } },
      cogs: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'ckm_cogs', go: (W, f, m, t, P) => hail(W, P, m, K(m, 0.8), STONE, 'cogs') },
      springs: { clip: 'atk3', secs: 1.3, warn: 'ckm_springs', go: (W, f, m, t, P) => MOVES.knifeFan(P, m, t, K(m, 0.5), { n: 5 }) },
      cut: { clip: 'atk2', secs: 1.3, warn: 'ckm_cut', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.2), { r: 9, half: 1.0, elem: SPIRIT }) },
      chime: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'ckm_chime', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 26, speed: 10 }) },
    },
    // Weighed once: what you stopped below. Then, at three fifths of his life and at three tenths, he starts to turn back
    // the hour: two winders at the winding posts, fourteen seconds; any of them still winding at the end of it, he's
    // mended a seventh of his life. Both down first, the hour stands.
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      if (!f.weighed) {
        f.weighed = true; f.fewer = emptied(W, 'cw_train'); f.noHour = emptied(W, 'cw_esc');
        if (f.fewer) W.warn(WARN.ckm_less_men, 30);
        if (f.noHour) W.warn(WARN.ckm_less_hour, 30);
      }
      const life = m.hp / m.maxHp, u = f.rewind;
      if (u) {
        u.t += dt;
        const winding = u.winders.filter(up);
        if (u.t > 2.5 && u.winders.length && !winding.length) { f.rewind = null; W.warn(WARN.ckm_stopped, 4); }
        else if (u.t > 14) {
          f.rewind = null;
          if (winding.length) {
            m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.14); W.warn(WARN.ckm_rewound, 4);
            W.sim.casting.burst(FX.PUFF, ARCANE, m.x, m.y + 2.4, m.z, 1.4, 8, 0.7);
            for (const k of winding) k.hp = 0;
          }
        }
        return;
      }
      if (!f.noHour && (f.hours || 0) < 2 && life < (f.hours ? 0.3 : 0.6) && m.state === 0) {
        f.hours = (f.hours || 0) + 1;
        const u2 = f.rewind = { t: 0, winders: [] };
        WINDERS_AT.forEach((q, i) => W.spawnAdds(`ckm_hour_${f.hours}_${i}`, ['cw_winder'], at(W, q), 1, (k) => { still(k, 8200, 'WINDER AT THE POST'); u2.winders.push(k); }, ['Greygold']));
        W.warn(WARN.ckm_rewind, 5);
      }
    },
    // While the hour's being turned back: everyone but his tank, to the nearest winder still winding.
    order(W, f, b, [m]) {
      const ws = f.rewind?.winders.filter(up) || [];
      if (!m || !ws.length || !free(W, m, b) || (m.fixOn === b && W.sim.time < m.fixT)) return null;
      const k = nearest(ws, b);
      return { to: [k.x, k.z] };
    },
  },

  // ==== the Menagerie of Chains ===============================================================================================

  // ---- Old Hunger: his jaws, his spring, his roar; the pit hounds; and what dies in his pit ------------------------------
  oldhunger: {
    open: 'hun_open', pace: [4.0, 3.1, 0.35], turn: [22, 4], enrage: [330, 2, 'hun_enrage'],
    deck: ['maul', 'lunge', 'roar', 'rake', 'maul', 'bones'],
    adds: [
      { at: 0.82, warn: 'hun_hounds', n: 2, pick: ['mc_hound'], from: 'doors', hp: 4200, damage: 64, name: 'PIT HOUND', pal: ['Rust'], setUp: houndIn },
      { at: 0.58, warn: 'hun_hounds', n: 3, pick: ['mc_hound'], from: 'doors', hp: 4200, damage: 64, name: 'PIT HOUND', pal: ['Rust'], setUp: houndIn },
      { at: 0.32, warn: 'hun_hounds', n: 3, pick: ['mc_hound'], from: 'doors', hp: 4200, damage: 64, name: 'PIT HOUND', pal: ['Rust'], setUp: houndIn },
    ],
    moves: {
      maul: { clip: 'atk2', secs: 1.3, warn: 'hun_maul', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 9, half: 1.1, elem: DRAIN }) },
      // To the end of his chain, all round: everything inside the ring and a little past it. Out to the pit's walls.
      lunge: { who: 'none', clip: 'atk1', secs: 1.6, warn: 'hun_pounce', go(W, f, m, t, P) { const [sx, sz] = at(W, PIT_STAKE); P.mark({ x: sx, z: sz, r: PIT_CHAIN + 2.4, fuse: 2.3, dmg: K(m, 1.3), knock: 4, elem: DRAIN, from: m, tag: 'lunge' }); } },
      roar: { who: 'none', clip: 'roar', secs: 1.5, warn: 'hun_roar', go: (W, f, m, t, P) => MOVES.howlWave(P, m, null, K(m, 0.62)) },
      rake: { clip: 'atk3', secs: 1.3, warn: 'hun_rake', go: (W, f, m, t, P) => { for (const turn of [-0.4, 0, 0.4]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 14, w: 0.9, fuse: 1.1, dmg: K(m, 0.9), knock: 2, elem: DRAIN, from: m, tag: 'rake' }); } },
      bones: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'hun_bones', go: (W, f, m, t, P) => hail(W, P, m, K(m, 1.3), BONE, 'bones', 14, 6) },
    },
    // His chain: he goes no further from his stake than it lets him (the ring on the floor). A hound that dies inside its
    // reach, he eats: a twentieth of his life back, and his blows the heavier for good. One that dies out past it, he can't
    // get to.
    step(W, f, [m], dt) {
      if (!m) return;
      const P = W.sim.perils, [sx, sz] = at(W, PIT_STAKE), d = Math.hypot(m.x - sx, m.z - sz);
      if (d > PIT_CHAIN) { m.x = sx + (m.x - sx) / d * PIT_CHAIN; m.z = sz + (m.z - sz) / d * PIT_CHAIN; }
      if (!f.ring || !P.marks.includes(f.ring)) f.ring = P.mark({ shape: 'ring', x: sx, z: sz, r: PIT_CHAIN + 0.35, r0: PIT_CHAIN - 0.35, fuse: 900, dmg: 0, soak: true, quiet: true, elem: DRAIN, tag: 'chain' });
      for (const k of f.hounds || []) {
        if (k.meat || up(k)) continue;
        k.meat = true;
        if (Math.hypot(k.x - sx, k.z - sz) > PIT_CHAIN + 1) { W.warn(WARN.hun_denied, 8); continue; }
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.05); m.opts.damage *= 1.06; W.warn(WARN.hun_fed, 4);
        W.sim.casting.burst(FX.PUFF, DRAIN, k.x, m.y + 1, k.z, 1, 6, 0.5);
      }
    },
    // While a hound's up: whoever isn't holding him, out past the ring, so the hounds come out to them and die there.
    order(W, f, b, [m]) {
      if (!m || !free(W, m, b) || !(f.hounds || []).some(up)) return null;
      const [sx, sz] = at(W, PIT_STAKE), dx = b.x - sx, dz = b.z - sz, d = Math.hypot(dx, dz) || 1;
      return d < PIT_CHAIN + 2 ? { to: [sx + dx / d * (PIT_CHAIN + 3.6), sz + dz / d * (PIT_CHAIN + 3.6)], urgent: true } : null;
    },
    end(W, f) { lift(f.ring); },
  },

  // ---- the Matron of Wings: her talons, her feathers, her stoop, her wings' gust; her brood; and the shriek ------------------
  matron: {
    open: 'mat_open', pace: [4.2, 3.2, 0.35], turn: [24, 4], enrage: [330, 2, 'mat_enrage'],
    deck: ['talons', 'feathers', 'dive', 'gust', 'feathers'],
    adds: [
      { at: 0.62, warn: 'mat_brood', n: 3, pick: ['harpy_warrior', 'harpy_undead_1', 'harpy_undead_2'], from: 'edge', hp: 4600, damage: 66, name: 'FLEDGLING', pal: ['Forest'] },
      { at: 0.3, warn: 'mat_brood', n: 4, pick: ['harpy_warrior', 'harpy_undead_1', 'harpy_undead_2'], from: 'edge', hp: 4600, damage: 66, name: 'FLEDGLING', pal: ['Forest'] },
    ],
    moves: {
      talons: { clip: 'atk2', secs: 1.3, warn: 'mat_talons', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 8, half: 1.0, elem: SPIRIT }) },
      feathers: { who: 'none', clip: 'atk4', at: 0.45, secs: 1.4, warn: 'mat_feathers', go(W, f, m, t, P) {
        const a = Math.random() * TAU;
        MOVES.bladeNova(P, m, null, K(m, 0.36), { n: 12, speed: 10, turn: a });
        P.later(0.6, () => { if (!m.dead) MOVES.bladeNova(P, m, null, K(m, 0.36), { n: 12, speed: 10, turn: a + 0.26 }); });
      } },
      dive: { who: 'far', clip: null, warn: 'mat_dive', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.55), { r: 24, w: 1.8 }) },
      gust: { clip: 'atk3', secs: 1.3, warn: 'mat_gust', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.5), { elem: STORM, look: 'blade' }) },
    },
    // The shriek: every thirty seconds she draws breath for four, and what she can see at the end of it takes the whole
    // of it. A dead tree between you and her, and it breaks on the tree.
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const sim = W.sim, P = sim.perils, u = f.shriek;
      if (u) {
        u.t += dt;
        if (u.t < 4) return;
        let hit = 0;
        for (const b of W.bodies()) if (caveClear(m.x, m.z, b.x, b.z, 0.05)) { P.hurt(b, K(m, 1.7), m.x, m.z, 6, false, 'shriek'); hit++; }
        sim.casting.burst(FX.SHOCK, STORM, m.x, m.y + 2.4, m.z, 2, 14, 0.9, { light: 10, lightR: 14 });
        if (!hit) W.warn(WARN.mat_shrieked, 6);
        f.shriek = null; f.hold = false; m.noTurn = false;
        return;
      }
      if ((f.shriekT = (f.shriekT ?? 12) + dt) > 30 && m.state === 0 && !m.script && !f.turn && m.perform({ clip: 'roar', secs: 4 })) {
        f.shriekT = 0; f.shriek = { t: 0 }; f.hold = true; m.noTurn = true;
        W.warn(WARN.mat_shriek, 4);
      }
    },
    // While she draws breath: round behind the nearest tree from her.
    order(W, f, b, [m]) {
      if (!m || !f.shriek) return null;
      const to = W.shelter(b, m.x, m.z, AVIARY_TREES.map(([x, z, r]) => [W.delve.x + x, W.delve.z + z, r]), 70);
      return to ? { to, urgent: true } : null;
    },
  },

  // ---- the Keeper of Chains: his lash, his flail, the cages, the hooks, the beasts driven; his chain; what he looses ---------
  keeper: {
    open: 'kpr_open', pace: [4.0, 3.0, 0.35], turn: [22, 4], enrage: [390, 2.2, 'kpr_enrage'],
    deck: ['lash', 'flail', 'cages', 'hooks', 'lash', 'drive'],
    adds: [],
    moves: {
      lash: { clip: 'atk2', secs: 1.3, warn: 'kpr_lash', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 10, half: 1.0, elem: DRAIN }) },
      flail: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'kpr_flail', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 26, speed: 10 }) },
      cages: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'kpr_cages', go: (W, f, m, t, P) => hail(W, P, m, K(m, 0.8), STONE, 'cages') },
      hooks: { clip: 'atk3', secs: 1.3, warn: 'kpr_hooks', go: (W, f, m, t, P) => MOVES.knifeFan(P, m, t, K(m, 0.5), { n: 5 }) },
      // The beasts driven across the Ring: lines of them marching its width, a lane between each.
      drive: { who: 'none', clip: 'roar', secs: 1.6, warn: 'kpr_drive', go(W, f, m, t, P) {
        const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id), off = (f.driveOff = ((f.driveOff || 0) + 1) % 2) * 7;
        for (let dz = -14 + off; dz <= 14; dz += 14) P.march(rx - r.hx, rz + dz, Math.PI / 2, r.hx, 2.2, 0.2, { r: 1.6, fuse: 1.0, dmg: K(m, 0.85), knock: 3, elem: STONE, tag: 'drive' });
      } },
    },
    // What he looses, at three quarters, a half and a quarter of his life: the wolves, the spiders, the wyrmlings; each
    // only if its wing still had beasts in it when you came to him. And his chain, every twenty-six seconds: on one of
    // you, who is reeled in to him unless he's hit hard enough as he hauls to make him drop it, or a chain post is put
    // between (it snags; he's pulled off his feet).
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const sim = W.sim, P = sim.perils, life = m.hp / m.maxHp;
      const LOOSE = [[0.75, 'mc_runs', 'kpr_less_wolves', 'kpr_wolves', ['mc_hound'], 4, 4400, 66, 'RING WOLF'], [0.5, 'mc_rows_s', 'kpr_less_spiders', 'kpr_spiders', ['spider_black', 'spider_red'], 5, 3600, 60, 'RING SPIDER'], [0.25, 'mc_tank', 'kpr_less_wyrms', 'kpr_wyrms', ['mc_wyrmling'], 3, 5200, 72, 'RING WYRMLING']];
      f.loosed ??= 0;
      if (f.loosed < LOOSE.length && life < LOOSE[f.loosed][0]) {
        const [, wing, less, warn, pick, n, hp, damage, name] = LOOSE[f.loosed++];
        if (emptied(W, wing)) W.warn(WARN[less], 6);
        else W.callAdds(f, m, { warn, n, pick, from: 'doors', hp, damage, name, pal: ['Forest'] });
      }
      if (unstun(f, m, dt)) return;
      const c = f.chain;
      if (c) {
        const b = c.on;
        c.t += dt;
        if (b.dead || m.dead || c.t > 9) { lift(c.mk); f.chain = null; return; }
        c.mk.r = gap(m, b);
        // (Hit hard enough as he hauls, he lets it go: so much of his life for each of you there is.)
        if (c.from - m.hp > m.maxHp * 0.003 * Math.max(1, W.bodies().length)) {
          lift(c.mk); f.chain = null; W.warn(WARN.kpr_dropped, 4);
          sim.casting.burst(FX.SHOCK, DRAIN, m.x, m.y + 2, m.z, 1, 6, 0.5, { light: 7, lightR: 8 });
          stun(f, m, 3, 1.3);
          return;
        }
        if (c.t < 1.2) return;
        if (!caveClear(m.x, m.z, b.x, b.z, 0.05)) {
          lift(c.mk); f.chain = null; W.warn(WARN.kpr_snag, 4);
          sim.casting.burst(FX.SHOCK, STONE, m.x, m.y + 2, m.z, 1.2, 8, 0.6, { light: 8, lightR: 9 });
          stun(f, m, 4);
          return;
        }
        W.drag(b, m.x, m.z, 3.4, dt);
        if (gap(m, b) < 3.4) { P.hurt(b, K(m, 1.5), m.x, m.z, 3, false, 'reeled'); W.warn(WARN.kpr_reeled, 6); lift(c.mk); f.chain = null; }
        return;
      }
      if ((f.chainT = (f.chainT ?? 8) + dt) > 26 && m.state === 0 && !f.turn) {
        const b = W.mark();
        if (!b || b.dead || gap(m, b) < 6) return;
        f.chainT = 0;
        f.chain = { on: b, t: 0, from: m.hp, mk: P.mark({ shape: 'line', ride: m, aim: b, lock: 1, r: gap(m, b), w: 0.35, fuse: 30, dmg: 0, soak: true, quiet: true, elem: DRAIN, tag: 'chain' }) };
        W.warn(WARN.kpr_chain, 4);
      }
    },
    // The one his chain's on: round behind the nearest chain post from him.
    order(W, f, b, [m]) {
      if (!m || f.chain?.on !== b) return null;
      const to = W.shelter(b, m.x, m.z, CHAIN_POSTS.map(([x, z, r]) => [W.delve.x + x, W.delve.z + z, r]), 70);
      return to ? { to, urgent: true } : null;
    },
    end(W, f) { lift(f.chain?.mk); },
  },

  // ==== the Ossuary Chapel ====================================================================================================

  // ---- the Cantor of Jaws: her verse, the bone that marches, her wail, the lance; her choir; and the tithe -------------------
  cantor: {
    open: 'can_open', pace: [4.2, 3.2, 0.35], turn: [24, 4], enrage: [350, 2, 'can_enrage'],
    deck: ['verse', 'march', 'wail', 'verse', 'lance'],
    adds: [
      { at: 0.5, warn: 'can_choir', n: 4, pick: ['oc_chorister'], from: 'doors', hp: 5200, damage: 74, name: 'CHORISTER', pal: ['Skullwhite'] },
    ],
    moves: {
      verse: { clip: 'atk2', secs: 1.3, warn: 'can_verse', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 9, half: 0.8, fuse: 1.4, elem: SPIRIT }) },
      march: { clip: 'atk3', secs: 1.3, warn: 'can_march', go: (W, f, m, t, P) => { for (const turn of [-0.45, 0, 0.45]) P.march(m.x, m.z, yawTo(m, t) + turn, 9, 1.9, 0.14, { r: 1.25, fuse: 1.0, dmg: K(m, 0.9), knock: 2, elem: BONE, from: m, tag: 'march' }); } },
      wail: { who: 'none', clip: 'roar', secs: 1.4, warn: 'can_wail', go: (W, f, m, t, P) => P.mark({ shape: 'ring', x: m.x, z: m.z, r: 12, r0: 5, fuse: 1.6, dmg: K(m, 0.9), elem: SPIRIT, from: m, tag: 'wail' }) },
      lance: { clip: 'atk1', secs: 1.2, warn: 'can_lance', go: (W, f, m, t, P) => MOVES.bloodLance(P, m, t, K(m, 0.6)) },
    },
    // The tithe: every twelve seconds a thicket of bone comes up under two of you and stays (it bites whoever stands in
    // it). The fourth time she gathers them all in: each bursts in a ring along the floor, and is gone.
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const P = W.sim.perils;
      if ((f.titheT = (f.titheT ?? 4) + dt) < 12 || m.state !== 0) return;
      f.titheT = 0;
      f.thickets = (f.thickets || []).filter((q) => !q.dead);
      if (((f.tithes = (f.tithes || 0) + 1) % 4) === 0) {
        W.warn(WARN.can_collect, 4);
        // (One after another, so each can be jumped.)
        f.thickets.forEach((q, i) => { const { x, z, r } = q; lift(q); P.later(0.5 + i * 0.45, () => { if (!m.dead) P.wave(x, z, { speed: 8, reach: 14, touch: K(m, 0.28), knock: 2, elem: BONE, from: m, r, tag: 'tithe' }); }); });
        f.thickets = [];
        return;
      }
      W.warn(WARN.can_tithe, 20);
      // (Never on whoever's holding her: a thicket under her own feet is one nobody can take to a wall.)
      const who = W.others().sort(() => Math.random() - 0.5).slice(0, 2);
      for (const b of who) f.thickets.push(P.mark({ x: b.x, z: b.z, r: 2.7, fuse: 2.4, dmg: K(m, 0.7), life: 40, dps: K(m, 0.3), elem: BONE, follow: b, lock: 0.6, from: m, tag: 'tithe' }));
    },
    // With a tithe still following you: out to the wall you're nearest, so it comes up there.
    order(W, f, b, [m]) {
      if (!m || !free(W, m, b)) return null;
      const q = (f.thickets || []).find((t) => !t.dead && !t.landed && t.follow === b && t.t < t.fuse * t.lock);
      if (!q) return null;
      const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id), dx = b.x - rx, dz = b.z - rz;
      const toX = Math.abs(dx) / r.hx > Math.abs(dz) / r.hz;
      return { to: toX ? [rx + Math.sign(dx || 1) * (r.hx - 2.5), b.z] : [b.x, rz + Math.sign(dz || 1) * (r.hz - 2.5)], urgent: true };
    },
  },

  // ---- the Bone Prior: his crozier, the piers, his litany, the ash; his old priors; and the one he names --------------------
  boneprior: {
    open: 'pri_open', pace: [4.0, 3.0, 0.35], turn: [22, 4], enrage: [400, 2.2, 'pri_enrage'],
    deck: (f) => (f.noPiers ? ['crozier', 'litany', 'ash', 'crozier', 'quake'] : ['crozier', 'piers', 'litany', 'ash', 'crozier', 'quake']),
    adds: [],
    moves: {
      crozier: { clip: 'atk2', secs: 1.3, warn: 'pri_crozier', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.15), { r: 9, half: 1.0, fuse: 1.4, elem: BONE }) },
      // The piers of bone pulled down: each along its own line, across the Sanctuary from where it stands; two of the four.
      piers: { who: 'none', clip: 'atk3', secs: 1.6, warn: 'pri_piers', go(W, f, m, t, P) {
        f.pierOff = ((f.pierOff || 0) + 1) % 2;
        BONE_PIERS.forEach(([x, z], i) => { if (i % 2 === f.pierOff) { const [wx, wz] = at(W, [x, z]); P.mark({ shape: 'line', x: wx, z: wz, yaw: x < ALTAR[0] ? Math.PI / 2 : -Math.PI / 2, r: 30, w: 2.4, fuse: 1.9, dmg: K(m, 1.4), knock: 4, elem: BONE, from: m, tag: 'piers' }); } });
      } },
      litany: { clip: 'atk1', secs: 1.3, warn: 'pri_litany', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.36), { elem: DRAIN }) },
      ash: { clip: 'atk4', secs: 1.4, warn: 'pri_ash', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.55), { elem: DRAIN }) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'pri_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 28, speed: 10, elem: BONE }) },
    },
    // Weighed once: what you emptied below. At half his life his old priors rise, unless the Under-Crypt's empty. And
    // every twenty-four seconds he names one of you: a second to stop in, then three and a half when the named may not
    // take a step (it costs them, and mends him), and bone comes up in a ring round them at everyone else.
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const sim = W.sim, P = sim.perils;
      if (!f.weighed) {
        f.weighed = true; f.noPiers = emptied(W, 'oc_charnel'); f.noPriors = emptied(W, 'oc_crypt');
        if (f.noPiers) W.warn(WARN.pri_less_piers, 30);
        if (f.noPriors) W.warn(WARN.pri_less_priors, 30);
      }
      if (!f.rose && m.hp < m.maxHp * 0.5) {
        f.rose = true;
        if (!f.noPriors) W.callAdds(f, m, { warn: 'pri_priors', n: 3, pick: ['oc_oldprior'], from: 'doors', hp: 9000, damage: 90, name: 'OLD PRIOR', pal: ['Skullwhite'] });
      }
      const u = f.kneel;
      if (u) {
        const b = u.on;
        u.t += dt;
        if (b.dead || u.t > 4.6) { f.kneel = null; return; }
        if (u.t < 1.1) { u.at = [b.x, b.z]; return; }
        if ((u.tick -= dt) > 0) return;
        u.tick = 0.4;
        if (Math.hypot(b.x - u.at[0], b.z - u.at[1]) > 0.75) {
          P.hurt(b, K(m, 0.9), b.x, b.z, null, false, 'stood'); m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.01);
          sim.casting.burst(FX.SHOCK, DRAIN, b.x, b.y + 1, b.z, 0.5, 2, 0.4, { light: 6, lightR: 5 });
          W.warn(WARN.pri_stood, 8);
        }
        u.at = [b.x, b.z];
        return;
      }
      if ((f.kneelT = (f.kneelT ?? 10) + dt) > 24 && m.state === 0 && !f.turn) {
        const b = W.mark();
        if (!b || b.dead) return;
        f.kneelT = 0; f.kneel = { on: b, t: 0, tick: 0, at: [b.x, b.z] };
        P.mark({ shape: 'ring', x: b.x, z: b.z, r: 7.5, r0: 1.8, fuse: 4.6, dmg: K(m, 1.5), knock: 3, elem: BONE, follow: b, lock: 0.24, from: m, spare: (v) => v === b, tag: 'kneel' });
        W.warn(WARN.pri_kneel, 4);
      }
    },
    // The named: not a step, once they've had their moment to stop in.
    order: (W, f, b) => (f.kneel?.on === b && f.kneel.t > 0.6 ? { still: true } : null),
  },

  // ==== the Hall of Mirrors ===================================================================================================

  // ---- the Glazier: his glare, the glass that comes down, his pane, the splinters; and the reflections ----------------------
  glazier: {
    open: 'gla_open', pace: [4.2, 3.2, 0.35], turn: [24, 4], enrage: [350, 2, 'gla_enrage'],
    deck: ['glare', 'shards', 'slash', 'glare', 'splinters', 'quake'],
    adds: [],
    moves: {
      // His glare, down a line at one of you; and a moment after, the same from every reflection standing.
      glare: { clip: 'atk1', secs: 1.3, warn: 'gla_glare', go(W, f, m, t, P) {
        const beam = (from, fuse) => P.mark({ shape: 'line', x: from.x, z: from.z, yaw: yawTo(from, t), r: 28, w: 0.9, fuse, dmg: K(m, 1.1), knock: 2, elem: LIGHT, from, aim: t, lock: 0.5, tag: 'glare' });
        beam(m, 1.1);
        P.later(0.8, () => { if (!m.dead && !t.dead) for (const k of (f.glass || []).filter(up)) beam(k, 1.2); });
      } },
      shards: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'gla_shards', go: (W, f, m, t, P) => hail(W, P, m, K(m, 0.8), LIGHT, 'shards') },
      slash: { clip: 'atk2', secs: 1.3, warn: 'gla_slash', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 9, half: 1.0, elem: SPIRIT }) },
      splinters: { who: 'none', clip: 'atk3', at: 0.45, secs: 1.4, warn: 'gla_splinters', go: (W, f, m, t, P) => MOVES.bladeNova(P, m, null, K(m, 0.32), { n: 12, speed: 10, elem: LIGHT }) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'gla_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 24, speed: 10 }) },
    },
    // A reflection pulled out of the glass every twenty-two seconds, five at most standing, each before its own glass.
    // Each one standing takes a seventh off what he's dealt (down to two fifths); each one broken, he feels: a fiftieth
    // of his life.
    step(W, f, [m], dt) {
      if (!m) return;
      pen(W, f, m);
      const glass = f.glass ||= [];
      for (const k of glass) if (!k.broke && !up(k)) { k.broke = true; m.hp = Math.max(1, m.hp - m.maxHp * 0.02); W.warn(WARN.gla_break, 6); }
      const standing = glass.filter(up);
      m.shrug = Math.max(0.4, 1 - 0.15 * standing.length);
      if ((f.glassT = (f.glassT ?? 12) + dt) > 22 && standing.length < GLASS_SPOTS.length) {
        f.glassT = 0;
        const taken = standing.map((k) => k.spot), n = GLASS_SPOTS.findIndex((q, j) => !taken.includes(j) && j !== f.lastSpot);
        if (n < 0) return;
        f.lastSpot = n;
        W.spawnAdds(`gla_glass_${(f.glassK = (f.glassK || 0) + 1)}`, ['hm_reflection'], at(W, GLASS_SPOTS[n]), 1, (k) => { still(k, 7600, 'REFLECTION'); k.spot = n; glass.push(k); }, ['Porcelain']);
        W.warn(WARN.gla_pane, 10);
      }
    },
    // Two or more standing: everyone but his tank, to the nearest reflection.
    order(W, f, b, [m]) {
      const ks = (f.glass || []).filter(up);
      if (!m || ks.length < 2 || !free(W, m, b) || (m.fixOn === b && W.sim.time < m.fixT)) return null;
      const k = nearest(ks, b);
      return { to: [k.x, k.z] };
    },
  },

  // ---- the Duchess and her Glass: two of her, one that bleeds; the images out of the uncovered glasses ----------------------
  duchess: {
    open: 'dch_open', pace: [4.6, 3.6, 0.35], turn: [24, 4], enrage: [420, 2.2, 'dch_enrage'],
    decks: { hm_duchess: ['fan', 'sweep', 'lance', 'rain', 'wave'], hm_glass: ['lance', 'fan', 'rain', 'lance', 'fan'] },
    adds: [],
    moves: {
      // (What she throws is red; what the glass throws is pale. That, and which of them bleeds, is how she's told.)
      fan: { clip: 'atk3', secs: 1.3, warn: 'dch_fan', go: (W, f, m, t, P) => MOVES.fireFan(P, m, t, K(m, 0.42), { elem: m === f.her ? DRAIN : LIGHT, n: 5 }) },
      sweep: { clip: 'atk2', secs: 1.3, warn: 'dch_sweep', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 9, half: 1.0, elem: m === f.her ? DRAIN : LIGHT }) },
      lance: { clip: 'atk1', secs: 1.2, warn: 'dch_lance', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 26, w: 0.9, fuse: 1.1, dmg: K(m, 1.0), knock: 2, elem: m === f.her ? DRAIN : LIGHT, from: m, aim: t, lock: 0.55, tag: 'lance' }) },
      rain: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'dch_rain', go: (W, f, m, t, P) => hail(W, P, m, K(m, 0.6), m === f.her ? DRAIN : LIGHT, 'rain', 16, 5) },
      wave: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'dch_wave', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.36), { reach: 26, speed: 10, elem: m === f.her ? DRAIN : LIGHT }) },
    },
    // One of the two is her: she takes what she's dealt. The other is her Glass: it takes nothing, its life is hers, and
    // it stands where she'd be seen in a glass down the hall's middle, as far the other side. Every twenty-eight seconds
    // they change places: the one that bled is glass. And at seven tenths and four tenths of her life every great glass
    // you left uncovered gives up an image.
    step(W, f, live, dt) {
      if (!live.length) return;
      const sim = W.sim, all = W.bossBodies(f.boss.key);
      f.her ||= all.find((m) => m.opts.model === 'hm_duchess') || live[0];
      if (!up(f.her)) { for (const m of live) m.hp = 0; return; }
      const her = f.her, glass = all.find((m) => m !== her && !m.dead), blow = f.boss.damage * (f.enraged ? 2.2 : 1);
      her.shrug = 1; her.opts.damage = blow; pen(W, f, her);
      if (glass) {
        // (What the glass throws cuts half as deep as what she does.)
        glass.shrug = 0; glass.hp = Math.max(1, her.hp); glass.opts.damage = blow * 0.5;
        const ax = W.delve.x + HALL_AXIS, gx = 2 * ax - her.x;
        if (!sim.world.inside(gx, her.z, 0.5)) { glass.x = gx; glass.z = her.z; glass.y = sim.world.height(gx, her.z); glass.vx = glass.vz = 0; }
      }
      if (!f.weighed) {
        f.weighed = true; f.open = IMAGE_GLASSES.filter(([, , wing]) => !emptied(W, wing));
        if (!f.open.length) W.warn(WARN.dch_draped, 30);
      }
      const life = her.hp / her.maxHp;
      if ((f.imaged || 0) < 2 && life < (f.imaged ? 0.4 : 0.7)) {
        f.imaged = (f.imaged || 0) + 1;
        if (f.open.length) {
          W.warn(WARN.dch_images, 5);
          f.open.forEach(([x, z], i) => W.spawnAdds(`dch_image_${f.imaged}_${i}`, ['hm_image'], at(W, [x, z]), 1, (k) => fighter(k, 9800, 96, 'IMAGE'), ['Porcelain']));
        }
      }
      if (glass && (f.swapT = (f.swapT ?? 6) + dt) > 28 && her.state === 0 && glass.state === 0 && !f.turn) {
        f.swapT = 0; f.her = glass; glass.hp = her.hp;
        W.warn(WARN.dch_swap, 4);
        for (const m of [her, glass]) sim.casting.burst(FX.SHOCK, LIGHT, m.x, m.y + 1.6, m.z, 1.2, 8, 0.6, { light: 9, lightR: 9 });
      }
    },
    // The one to strike: her, not her Glass.
    focus: (W, f) => (up(f.her) ? f.her : null),
    // (Whoever isn't holding her keeps to her side of the hall's middle: not stood before the Glass for nothing.)
    order(W, f, b) {
      const her = f.her;
      if (!up(her) || W.tank(her) === b) return null;
      const ax = W.delve.x + HALL_AXIS, side = Math.sign(her.x - ax) || 1;
      return (b.x - ax) * side < -2 && gap(b, her) > 12 ? { to: [her.x - side * 4, her.z] } : null;
    },
  },
};
