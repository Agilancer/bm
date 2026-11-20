// The fights in Castle Velscour's dungeons, set A (src/core/delve-castle-a.js): the Drowned Archive's three, the Gallery of
// a Thousand Portraits' three, the Alchemists' Undercroft's three. Written as src/sim/castle-fights.js's are: a deck of
// called-out moves, adds at so much of its life, a turn on you, an enrage, and one thing of its own to learn, said by its
// `order` where it's somewhere to be or not a step to take:
//   the Indexer reads out a name, and whoever's named mustn't move till she's shut the book;
//   the Binder's great press comes down on one of you and is shared by all who stand under it;
//   the Drowned Lector's tide covers his hall but for one dry stack, never the same twice (and goes out the sooner for
//     each sluice whose wardens you'd emptied);
//   the Dowager in Oils steps into the paint, where nothing touches her, and out of another frame;
//   the Framer goes to the middle of his shop and sets his gilding brush turning across the whole of it;
//   the Painter sets up a canvas and paints one of you: cut it down before the likeness is done, or it gets down (and
//     fewer sitters answer him for each wing of his gallery you'd emptied);
//   the Jar-Mother shrugs off most of a blow unless she stands in the brine her brood leave where they die;
//   the Distiller's vents open one after another, each with a wheel that shuts it for whoever holds it;
//   the Great Work's fume is heavy (the gallery's clear of it) or light (the floor is), turn about (and less comes up
//     out of its sumps for each pump whose Feeders you'd emptied).
// Taken into src/sim/delve-fights.js FIGHTS. A party's welcome in all three: their calls speak to all of you.
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';
import { WARN, roomOf, roomSpot } from '../core/dungeon.js';
import { EV } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { ISLES, ISLE_R } from '../core/delve-archive.js';
import { EASELS, FRAMES, SHOP_MID, SITTERS } from '../core/delve-portraits.js';
import { GALLERY, JARS, VENTS, WHEELS } from '../core/delve-undercroft.js';

const { DRAIN, STONE, POISON, FIRE, FROST, ARCANE, SPIRIT, LIGHT } = ELEM;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// (A spot in the delve, from its own x and z.)
const at = (W, [x, z]) => [W.delve.x + x, W.delve.z + z];
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const K = (m, x) => m.opts.damage * x * 1.3;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.15, dmg, knock: 4, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
const lines3 = (P, m, t, dmg, o = {}) => { for (const turn of [-0.45, 0, 0.45]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: o.r || 18, w: o.w || 1, fuse: 1.1, dmg, knock: 2, elem: o.elem ?? DRAIN, from: m, tag: o.tag || 'lines' }); };
// (Something thrown at each of you, and more wherever.)
const volley = (W, P, m, dmg, elem, tag) => {
  for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.8, dmg, knock: 1, elem, follow: b, lock: 0.45, from: m, tag });
  P.rain(m.x, m.z, 14, 6, 1.2, { r: 2, fuse: 1.6, dmg: dmg * 0.75, knock: 1, elem, tag });
};
// (A wing of the place you've emptied: its pack's lair cleared, now or before.)
const emptied = (W, key) => !!W.sim.tripo?.lairs.some((l) => l.key === key && (l.state === 'cleared' || l.clearedOnce));
// (A clock that runs whatever the body's doing, and is answered when it's free to: as src/sim/delve-fights.js due.)
const due = (W, f, name, secs, free) => { const d = (f.due ||= {}); if (W.every(f, name, secs)) d[name] = true; if (!d[name] || !free) return false; d[name] = false; return true; };
const free = (f, m) => m.state === 0 && !m.script && !f.turn && !f.hold;
const alive = (k) => k && !k.asked && !k.dead && k.hp > 0;
// The body walked to a place, as its script: true once it's there (as src/sim/delve-fights.js walkTo).
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
// (One of a fight's own, come to fight: it's after you from the first.)
const hot = (k) => { k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; };
const KEPT = ['zombie_boy_1', 'zombie_boy_2', 'zombie_girl_1', 'possessed_man_2', 'possessed_woman_1'];
const DROWNED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];

export const FIGHTS_A = {
  // ==== The Drowned Archive ====================================================================================================

  // ---- the Indexer: her cards, the drawers, her ink; and the name she reads out ----------------------------------------------
  indexer: {
    open: 'idx_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [340, 2, 'idx_enrage'],
    deck: ['cards', 'drawers', 'ink', 'strike', 'slips'],
    adds: [
      { at: 0.6, warn: 'idx_leaves', n: 3, pick: ['da_leaf'], from: 'doors', hp: 2200, damage: 40, name: 'LOOSE LEAF', pal: ['Bone-white'] },
      { at: 0.3, warn: 'idx_leaves', n: 4, pick: ['da_leaf'], from: 'doors', hp: 2200, damage: 40, name: 'LOOSE LEAF', pal: ['Bone-white'] },
    ],
    moves: {
      cards: { clip: 'atk1', at: 0.45, secs: 1.3, warn: 'idx_cards', go: (W, f, m, t, P) => MOVES.knifeFan(P, m, t, K(m, 0.36), { n: 5 }) },
      // The card-cases' drawers thrown open down their three rows: the lanes between are clear.
      drawers: { who: 'none', clip: 'atk3', secs: 1.6, warn: 'idx_drawers', go(W, f, m, t, P) {
        const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id);
        // (Turn about, the rows and the rows between them: a lane that was clear the last time isn't this.)
        const rows = (f.rows = ((f.rows || 0) + 1) % 2) ? [-8, 0, 8] : [-12, -4, 4, 12];
        for (const dz of rows) P.mark({ shape: 'line', x: rx - r.hx, z: rz + dz, yaw: Math.PI / 2, r: r.hx * 2, w: 1.7, fuse: 1.9, dmg: K(m, 1.3), knock: 3, elem: STONE, from: m, tag: 'drawers' });
      } },
      ink: { clip: 'atk2', secs: 1.3, warn: 'idx_ink', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.5), { elem: ARCANE }) },
      strike: { clip: 'atk4', secs: 1.3, warn: 'idx_strike', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 24, w: 1.3, fuse: 1.3, dmg: K(m, 1.5), knock: 3, elem: ARCANE, from: m, aim: t, lock: 0.5, tag: 'strike' }) },
      slips: { who: 'none', clip: 'atk2', secs: 1.3, warn: 'idx_slips', go: (W, f, m, t, P) => volley(W, P, m, K(m, 0.8), ARCANE, 'slips') },
    },
    // The name: every twenty-six seconds she opens the book. Two seconds' warning and a little (a ring of ink round the named;
    // what she'd thrown lands and is gone, and nothing of hers lies on the floor after it), then for three and a half seconds
    // a step by the named is the ink's: it bites, and bites again for every stride more. She throws nothing else while she reads.
    step(W, f, [m], dt) {
      if (!m) return;
      const P = W.sim.perils, u = f.name;
      if (!u) {
        if (!due(W, f, 'name', 26, free(f, m))) return;
        const t = W.mark();
        if (!t || t.dead) return;
        f.name = { who: t, t: 0, x: 0, z: 0, set: false }; f.hold = true;
        m.perform({ clip: 'roar', face: t, secs: 5.7 });
        W.warn(WARN.idx_name);
        // (What's hers on the floor dries as the book opens: nobody named is left standing in a pool they must stay in.)
        for (const q of P.marks) if (q.from === m || q.tag === 'slips' || q.tag === 'spitRain') { q.life = 0; q.dps = 0; }
        P.mark({ x: t.x, z: t.z, r: 1.7, fuse: 2.3, dmg: 0, life: 3.5, follow: t, lock: 1, soak: true, quiet: true, elem: ARCANE, tag: 'named' });
        return;
      }
      u.t += dt;
      const b = u.who;
      if (u.t >= 2.3 && !u.set) { u.set = true; u.x = b.x; u.z = b.z; }
      if (u.set && !b.dead && Math.hypot(b.x - u.x, b.z - u.z) > 1.1) {
        P.hurt(b, K(m, 1.5), m.x, m.z, 0, false, 'named');
        W.sim.casting.burst(FX.SHOCK, ARCANE, b.x, b.y + 1, b.z, 0.5, 2.2, 0.4, { light: 5, lightR: 5 });
        W.warn(WARN.idx_moved, 6);
        u.x = b.x; u.z = b.z;
      }
      if (u.t > 5.8 || b.dead || m.dead) { f.name = null; f.hold = false; if (!m.dead) W.warn(WARN.idx_closed, 8); }
    },
    end(W, f) { f.name = null; },
    // The named: not a step, from the moment the book's open to the moment it's shut.
    order(W, f, b) { return f.name && f.name.who === b && f.name.t > 2.0 ? { still: true } : null; },
  },

  // ---- the Binder: his knife, his needle, his glue; and the great press ------------------------------------------------------
  binder: {
    open: 'bnd_open', pace: [4.3, 3.3, 0.35], turn: [22, 4], enrage: [300, 2, 'bnd_enrage'],
    deck: ['cleave', 'stitch', 'glue', 'quake', 'cleave'],
    adds: [],
    moves: {
      cleave: { clip: 'atk2', secs: 1.4, warn: 'bnd_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 9, half: 1.0 }) },
      // His needle down a line at whoever's furthest, a stitch at a time.
      stitch: { who: 'far', clip: 'atk3', secs: 1.4, warn: 'bnd_stitch', go: (W, f, m, t, P) => P.march(m.x, m.z, yawTo(m, t), clamp(Math.round(gap(m, t) / 2.2) + 3, 5, 12), 2.2, 0.14, { r: 1.5, fuse: 0.9, dmg: K(m, 0.9), knock: 2, elem: STONE, from: m, tag: 'stitch' }) },
      glue: { clip: 'atk1', secs: 1.3, warn: 'bnd_glue', go: (W, f, m, t, P) => MOVES.firepots(P, m, t, K(m, 0.6), { life: 8 }) },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'bnd_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 24, speed: 9 }) },
    },
    // The great press: every twenty-eight seconds, over one of you. It lands on every one of you wherever you are: what
    // each takes is the whole of it shared by however many stood under it (his tank, braced, half a share).
    step(W, f, [m]) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      if (f.press && (f.press.dead || f.press.landed)) f.press = null;
      if (f.press || !due(W, f, 'press', 28, free(f, m))) return;
      const t = W.mark();
      if (!t || t.dead) return;
      W.warn(WARN.bnd_press);
      f.press = P.mark({ x: t.x, z: t.z, r: 4.8, fuse: 5.2, follow: t, lock: 0.15, soak: true, elem: STONE, from: m, tag: 'press', then: (q, P2, inside) => {
        const share = K(m, 3.0) / Math.max(1, inside.length);
        for (const b of W.bodies()) { P2.hurt(b, share * (b.role === 'tank' ? 0.5 : 1), q.x, q.z, 0, false, 'press'); sim.casting.burst(FX.SHOCK, STONE, b.x, b.y + 1, b.z, 0.5, 2, 0.4, { light: 4, lightR: 5 }); }
        sim.event(EV.GROUND, q.x, q.y, q.z);
        W.warn(WARN.bnd_pressed, 10);
      } });
    },
    end(W, f) { f.press = null; },
    // Under the press, all of you but whoever holds him.
    order(W, f, b, [m]) {
      const q = f.press;
      if (!q || q.landed || !m || W.tank(m) === b) return null;
      return Math.hypot(b.x - q.x, b.z - q.z) > 2.6 ? { to: [q.x, q.z], urgent: true } : null;
    },
  },

  // ---- the Drowned Lector: cold hands, the undertow, the wave; and the tide over everything but one dry stack ----------------
  lector: {
    open: 'lec_open', pace: [4.3, 3.3, 0.35], turn: [22, 4], enrage: [330, 2, 'lec_enrage'],
    deck: ['grasp', 'undertow', 'wave', 'eddy', 'wail'],
    adds: [
      { at: 0.62, warn: 'lec_drowned', n: 3, pick: DROWNED, from: 'doors', hp: 2400, damage: 44, name: 'THE DROWNED', pal: ['Drowned'] },
      { at: 0.32, warn: 'lec_drowned', n: (W, f) => (f.sluices > 1 ? 2 : 4), pick: DROWNED, from: 'doors', hp: 2400, damage: 44, name: 'THE DROWNED', pal: ['Drowned'] },
    ],
    moves: {
      grasp: { clip: 'atk1', secs: 1.3, warn: 'lec_grasp', go(W, f, m, t, P) { for (const b of new Set([t, W.farthest(m)])) P.mark({ x: b.x, z: b.z, r: 3, fuse: 1.5, dmg: K(m, 0.9), life: 7, dps: K(m, 0.7), elem: FROST, follow: b, lock: 0.5, from: m, tag: 'grasp' }); } },
      undertow: { clip: 'atk3', secs: 1.3, warn: 'lec_undertow', go: (W, f, m, t, P) => lines3(P, m, t, K(m, 0.85), { elem: FROST, r: 20, tag: 'undertow' }) },
      wave: { clip: 'atk2', at: 0.45, secs: 1.3, warn: 'lec_wave', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.36), { width: 18, n: 11, speed: 7.5, elem: FROST }) },
      eddy: { clip: 'atk4', secs: 1.3, warn: 'lec_eddy', go(W, f, m, t, P) { for (const b of new Set([t, W.farthest(m)])) { const a = yawTo(m, b); P.mark({ x: m.x + Math.sin(a) * 3, z: m.z + Math.cos(a) * 3, r: 2.8, fuse: 1.2, dmg: K(m, 0.7), life: 7, dps: K(m, 0.8), vx: Math.sin(a) * 3.2, vz: Math.cos(a) * 3.2, elem: FROST, from: m, tag: 'eddy' }); } } },
      wail: { who: 'none', clip: 'roar', secs: 1.5, warn: 'lec_wail', go: (W, f, m, t, P) => P.mark({ shape: 'ring', x: m.x, z: m.z, r: 13, r0: 3.6, fuse: 1.5, dmg: K(m, 0.9), elem: SPIRIT, from: m, tag: 'wail' }) },
    },
    // The tide, three times as his life goes (at three quarters of it, a half and a quarter): everything in the hall goes
    // under but one of its three dry stacks, the one he lights; the next time, another. It stays seven seconds; five with
    // one of his sluices emptied behind him, three with both.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      if (f.sluices === undefined) {
        f.sluices = (emptied(W, 'da_sluice_w') ? 1 : 0) + (emptied(W, 'da_sluice_e') ? 1 : 0);
        if (f.sluices) W.warn(f.sluices > 1 ? WARN.lec_less_two : WARN.lec_less_one, 30);
      }
      if (!f.tide) {
        const n = [0.75, 0.5, 0.25].findIndex((a, i) => m.hp < m.maxHp * a && !(f.tides & (1 << i)));
        if (n < 0 || !free(f, m)) return;
        f.tides |= 1 << n;
        const i = (f.isle = ((f.isle ?? Math.floor(Math.random() * 3)) + 1 + Math.floor(Math.random() * 2)) % 3), [x, z] = at(W, ISLES[i]), stay = [7, 5, 3][f.sluices];
        f.tide = { t: 0, x, z, until: 6.5 + stay + 0.4 }; f.hold = true;
        m.perform({ clip: 'roar', secs: 6 });
        W.warn(WARN.lec_tide);
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.3);
        P.mark({ shape: 'ring', x, z, r: 80, r0: ISLE_R, fuse: 6.5, dmg: K(m, 1.0), life: stay, dps: K(m, 1.1), elem: FROST, quiet: true, tag: 'tide' });
        // (The stack he lights: a round of light on it, to be stood in.)
        P.mark({ x, z, r: ISLE_R - 0.3, fuse: 6.5, dmg: 0, life: stay, soak: true, quiet: true, elem: LIGHT, tag: 'dry' });
        return;
      }
      f.tide.t += dt;
      if (f.tide.t > f.tide.until || m.dead) { f.tide = null; f.hold = false; if (!m.dead) W.warn(WARN.lec_ebb, 10); }
    },
    end(W, f) { f.tide = null; },
    // Onto the dry stack while the tide's in: the nearest of it, a stride in from its edge.
    order(W, f, b) {
      const u = f.tide;
      if (!u) return null;
      const dx = b.x - u.x, dz = b.z - u.z, L = Math.hypot(dx, dz) || 1;
      if (L < ISLE_R - 1.2) return null;
      const r = ISLE_R - 2.2;
      return { to: [u.x + dx / L * r, u.z + dz / L * r], urgent: true };
    },
  },

  // ==== The Gallery of a Thousand Portraits ====================================================================================

  // ---- the Dowager in Oils: her fan, her look, the tea service; and the paint she steps into --------------------------------
  dowager: {
    open: 'dow_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [300, 2, 'dow_enrage'],
    deck: ['fan', 'gaze', 'cups', 'wail', 'fan'],
    adds: [
      { at: 0.7, warn: 'dow_sitters', n: 3, pick: SITTERS, from: 'doors', hp: 2400, damage: 42, name: 'SITTER', pal: ['Royal'] },
      { at: 0.35, warn: 'dow_sitters', n: 4, pick: SITTERS, from: 'doors', hp: 2400, damage: 42, name: 'SITTER', pal: ['Royal'] },
    ],
    moves: {
      fan: { clip: 'atk1', at: 0.45, secs: 1.3, warn: 'dow_fan', go: (W, f, m, t, P) => MOVES.knifeFan(P, m, t, K(m, 0.36), { n: 5 }) },
      gaze: { who: 'far', clip: 'atk3', secs: 1.3, warn: 'dow_gaze', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 26, w: 1.4, fuse: 1.3, dmg: K(m, 1.5), knock: 3, elem: ARCANE, from: m, aim: t, lock: 0.5, tag: 'gaze' }) },
      cups: { who: 'none', clip: 'atk2', secs: 1.3, warn: 'dow_cups', go: (W, f, m, t, P) => volley(W, P, m, K(m, 0.75), STONE, 'cups') },
      wail: { who: 'none', clip: 'roar', secs: 1.5, warn: 'dow_wail', go: (W, f, m, t, P) => P.mark({ shape: 'ring', x: m.x, z: m.z, r: 12, r0: 3.4, fuse: 1.5, dmg: K(m, 0.9), elem: SPIRIT, from: m, tag: 'wail' }) },
    },
    // The paint: every twenty-four seconds she steps into it. For three seconds and a little nothing touches her, and the
    // frame she'll come out of is lit (the one furthest from where she went in): she steps down out of it with a blow all
    // round it.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.paint;
      if (!u) {
        if (!due(W, f, 'paint', 24, free(f, m))) return;
        const spots = FRAMES.map((q) => at(W, q)), to = spots.reduce((p, q) => (Math.hypot(q[0] - m.x, q[1] - m.z) > Math.hypot(p[0] - m.x, p[1] - m.z) ? q : p));
        f.paint = { t: 0, x: to[0], z: to[1] }; f.hold = true; m.shrug = 0.04; m.noTurn = true;
        m.perform({ clip: 'roar', secs: 3.2 });
        W.warn(WARN.dow_paint);
        sim.casting.burst(FX.PUFF, ARCANE, m.x, m.y + 1.6, m.z, 1.2, 4, 0.7);
        P.mark({ x: to[0], z: to[1], r: 5.6, fuse: 3.3, dmg: K(m, 1.7), knock: 4, elem: ARCANE, tag: 'frame' });
        return;
      }
      u.t += dt;
      if (u.t < 3.3 && !m.dead) return;
      f.paint = null; f.hold = false; m.shrug = 1; m.noTurn = false;
      if (m.dead) return;
      // (Down out of the frame, a stride into the room from it.)
      const [rx, , rz] = roomSpot(roomOf(f.boss.room).id), L = Math.hypot(rx - u.x, rz - u.z) || 1;
      m.x = u.x + (rx - u.x) / L * 1.6; m.z = u.z + (rz - u.z) / L * 1.6; m.y = sim.world.height(m.x, m.z); m.vx = m.vz = 0;
      sim.casting.burst(FX.SHOCK, ARCANE, m.x, m.y + 1.4, m.z, 0.8, 5, 0.6, { light: 8, lightR: 9 });
      W.warn(WARN.dow_out, 10);
    },
    end(W, f, live) { f.paint = null; for (const m of live) { m.shrug = 1; m.noTurn = false; } },
    // (Nothing to be done about the paint but be clear of the lit frame, which is a mark like any other; and to know
    // not to waste what you have on her while she's in it.)
    order() { return null; },
  },

  // ---- the Framer: his saw, his mitres, his brads, his leaf; and the gilding brush -------------------------------------------
  framer: {
    open: 'frm_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [300, 2, 'frm_enrage'],
    deck: ['cleave', 'mitre', 'nails', 'gild', 'cleave'],
    adds: [{ at: 0.5, warn: 'frm_hands', n: 3, pick: SITTERS, from: 'doors', hp: 2400, damage: 42, name: 'JOURNEYMAN', pal: ['Royal'] }],
    moves: {
      cleave: { clip: 'atk2', secs: 1.3, warn: 'frm_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 9, half: 1.0 }) },
      // A mitre: two cuts from his feet, a V with you in the angle of it.
      mitre: { clip: 'atk3', secs: 1.4, warn: 'frm_mitre', go: (W, f, m, t, P) => { for (const turn of [-0.42, 0.42]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 20, w: 1.3, fuse: 1.3, dmg: K(m, 1.2), knock: 3, elem: STONE, from: m, tag: 'mitre' }); } },
      nails: { clip: 'atk1', at: 0.45, secs: 1.3, warn: 'frm_nails', go: (W, f, m, t, P) => MOVES.knifeFan(P, m, t, K(m, 0.36), { n: 5 }) },
      gild: { clip: 'atk4', secs: 1.3, warn: 'frm_gild', go: (W, f, m, t, P) => MOVES.firepots(P, m, t, K(m, 0.6)) },
    },
    // The gilding brush, three times as his life goes: he walks to the middle of his shop and sets it turning, a bar of
    // molten leaf right across the room through where he stands, round once and a little more. He throws nothing else
    // while it turns.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, u = f.brush;
      if (!u) {
        const n = [0.75, 0.45, 0.18].findIndex((a, i) => m.hp < m.maxHp * a && !(f.brushes & (1 << i)));
        if (n < 0 || !free(f, m)) return;
        f.brushes |= 1 << n;
        const [cx, cz] = at(W, SHOP_MID);
        f.brush = { t: 0, lit: -1, cx, cz }; f.hold = true; m.noTurn = true;
        m.script = (k, dt2, s2) => { walkTo(k, cx, cz, dt2, s2, 6); return true; };
        W.warn(WARN.frm_brush);
        return;
      }
      u.t += dt;
      if (u.lit < 0 && (Math.hypot(m.x - u.cx, m.z - u.cz) < 1.2 || u.t > 5)) {
        u.lit = u.t;
        const yaw = Math.random() * Math.PI * 2, spin = (Math.random() < 0.5 ? 1 : -1) * 0.52;
        for (const turn of [0, Math.PI]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yaw + turn, r: 27, w: 1.3, fuse: 2.2, dmg: K(m, 1.2), life: 13, spin, touch: K(m, 0.5), again: 0.8, knock: 2, elem: FIRE, from: m, tag: 'brush' });
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.2);
      }
      if ((u.lit >= 0 && u.t > u.lit + 15.6) || m.dead) { f.brush = null; f.hold = false; m.noTurn = false; m.script = null; m.state = 0; if (!m.dead) W.warn(WARN.frm_done, 10); }
    },
    end(W, f, live) { f.brush = null; for (const m of live) { m.script = null; m.noTurn = false; } },
    // (The brush is a mark that turns: everyone walks round ahead of it, or steps over to behind it, as with any that moves.)
    order() { return null; },
  },

  // ---- the Painter: his brush, his colours, his turpentine; and the canvas ---------------------------------------------------
  painter: {
    open: 'pnt_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [400, 2, 'pnt_enrage'],
    deck: ['brush', 'spatter', 'line', 'turps', 'brush'],
    adds: [{ at: 0.55, warn: 'pnt_sitters', n: (W, f) => Math.max(1, 5 - 2 * (f.wings || 0)), pick: SITTERS, from: 'doors', hp: 2500, damage: 44, name: 'SITTER', pal: ['Royal'] }],
    moves: {
      brush: { clip: 'atk2', secs: 1.3, warn: 'pnt_brush', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 10, half: 1.0, elem: ARCANE }) },
      // Wet paint: it stays where it lands a long while.
      spatter: { clip: 'atk1', secs: 1.3, warn: 'pnt_spatter', go: (W, f, m, t, P) => P.rain(t.x, t.z, 8, 6, 1.2, { r: 2.4, fuse: 1.4, dmg: K(m, 0.7), life: 14, dps: K(m, 0.6), elem: ARCANE, from: m, tag: 'paint' }) },
      line: { clip: 'atk3', secs: 1.3, warn: 'pnt_line', go: (W, f, m, t, P) => lines3(P, m, t, K(m, 0.85), { elem: ARCANE, r: 20, tag: 'ruled' }) },
      turps: { clip: 'atk4', at: 0.45, secs: 1.3, warn: 'pnt_turps', go: (W, f, m, t, P) => MOVES.fireFan(P, m, t, K(m, 0.36)) },
    },
    // The canvas, twice as his life goes (at three quarters of it and at two fifths): set up on one of his easels, and one
    // of you painted on it. Twenty seconds and the likeness is done, and gets down. Cut down first, it never is.
    step(W, f, [m], dt) {
      if (!m) return;
      if (f.wings === undefined) { f.wings = (emptied(W, 'tp_sitters') ? 1 : 0) + (emptied(W, 'tp_eyes') ? 1 : 0); if (f.wings) W.warn(WARN.pnt_less, 30); }
      const c = f.canvas;
      if (!c) {
        const n = [0.75, 0.4].findIndex((a, i) => m.hp < m.maxHp * a && !(f.canvases & (1 << i)));
        if (n < 0 || !free(f, m)) return;
        f.canvases |= 1 << n;
        const [x, z] = at(W, EASELS[(f.easel = ((f.easel ?? Math.floor(Math.random() * 4)) + 1) % 4)]);
        f.canvas = { asked: true }; f.paintT = 0;
        W.spawnAdds(`pnt_canvas_${n}`, ['tp_canvas'], [x, z], 1, (k) => { k.hp = k.maxHp = 9000; k.opts.damage = 0; k.opts.speed = 0; k.opts.name = 'THE CANVAS'; k.canvas = true; hot(k); f.canvas = k; }, ['Bone-white']);
        W.warn(WARN.pnt_canvas, 5);
        return;
      }
      if (c.asked) return;
      if (c.dead || c.hp <= 0) { f.canvas = null; W.warn(WARN.pnt_cut, 5); return; }
      if ((f.paintT += dt) < 20) return;
      // (Finished: the canvas is only a canvas now, and what was on it is in the room.)
      const x = c.x, z = c.z;
      c.hp = 0; f.canvas = null;
      W.spawnAdds(`pnt_like_${(f.likes = (f.likes || 0) + 1)}`, ['tp_likeness'], [x, z], 1, (k) => { k.hp = k.maxHp = 9000; k.opts.damage = 80; k.opts.name = 'YOUR LIKENESS'; hot(k); }, ['Royal']);
      W.warn(WARN.pnt_done, 5);
    },
    // While a canvas stands: everyone but his tank, to it.
    order(W, f, b, [m]) {
      const c = f.canvas;
      if (!m || !alive(c) || W.tank(m) === b) return null;
      if (m.fixOn === b && W.sim.time < m.fixT) return null;
      return { to: [c.x, c.z] };
    },
  },

  // ==== The Alchemists' Undercroft =============================================================================================

  // ---- the Jar-Mother: her spit and her breath; her brood, and the brine they leave ------------------------------------------
  jarmother: {
    open: 'jar_open', pace: [4.2, 3.2, 0.35], turn: [24, 4], enrage: [320, 2, 'jar_enrage'],
    deck: ['spit', 'breath', 'pounce', 'rain', 'spit'],
    adds: [],
    setUp(W, m) { m.opts.radius = 1.4; },
    moves: {
      spit: { clip: 'atk2', at: 0.45, secs: 1.3, warn: 'jar_spit', go: (W, f, m, t, P) => MOVES.spitFan(P, m, t, K(m, 0.42), { n: 5 }) },
      breath: { clip: 'atk4', secs: 1.3, warn: 'jar_breath', go: (W, f, m, t, P) => MOVES.venomCone(P, m, t, K(m, 0.6), { r: 12 }) },
      pounce: { who: 'far', clip: null, warn: 'jar_pounce', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.5), { r: 22, w: 1.8, elem: POISON }) },
      rain: { clip: 'atk1', secs: 1.3, warn: 'jar_rain', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.5), { n: 7, R: 8 }) },
    },
    // Her brood: three out of one of the four great jars every twenty-two seconds. Where each dies it leaves its brine,
    // sixteen seconds on the flags. Out of brine she takes two fifths of a blow; stood in it, a quarter more than all of it.
    begin(W, f, [m]) { f.brood = []; f.pools = []; f.clockT = 0; if (m) m.shrug = 0.4; },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      f.brood ||= []; f.pools ||= []; f.clockT = (f.clockT || 0) + dt;
      if (due(W, f, 'brood', 22, free(f, m))) {
        const n = (f.jar = (f.jar ?? Math.floor(Math.random() * 4)) + 1), [x, z] = at(W, JARS[n % 4]);
        // (A stride out from its jar toward the room's middle, so nothing stands in the jar.)
        const [rx, , rz] = roomSpot(roomOf(f.boss.room).id), L = Math.hypot(rx - x, rz - z) || 1;
        W.spawnAdds(`jar_brood_${n}`, ['au_jarborn'], [x + (rx - x) / L * 3, z + (rz - z) / L * 3], 3, (k) => { k.hp = k.maxHp = 1500; k.opts.damage = 34; k.opts.name = 'JAR-BORN'; hot(k); f.brood.push(k); }, ['Forest']);
        W.warn(WARN.jar_brood, 6);
      }
      for (const k of f.brood) {
        if (k.pooled) continue;
        if (!k.dead && k.hp > 0) { k.lx = k.x; k.lz = k.z; continue; }
        k.pooled = true;
        const x = k.lx ?? k.x, z = k.lz ?? k.z;
        f.pools.push({ x, z, until: f.clockT + 16 });
        P.mark({ x, z, r: 3.8, fuse: 0.3, dmg: 0, life: 15.7, soak: true, quiet: true, elem: FROST, tag: 'brine' });
        W.warn(WARN.jar_brine, 20);
      }
      f.brood = f.brood.filter((k) => !k.pooled);
      f.pools = f.pools.filter((q) => q.until > f.clockT);
      const wet = f.pools.some((q) => Math.hypot(q.x - m.x, q.z - m.z) < 4.8);
      if (f.wet && !wet && !f.pools.length) W.warn(WARN.jar_dry, 30);
      f.wet = wet; m.shrug = wet ? 1.25 : 0.4;
      if (wet && ((f.fizz = (f.fizz || 0) - dt) <= 0)) { f.fizz = 0.6; sim.casting.burst(FX.PUFF, FROST, m.x, m.y + 1.2, m.z, 0.8, 3, 0.4); }
    },
    end(W, f, live) { for (const m of live) m.shrug = 1; },
    // Whoever holds her: into the nearest brine, so she comes into it after them.
    order(W, f, b, [m]) {
      if (!m || f.wet || !f.pools?.length || W.tank(m) !== b) return null;
      const q = f.pools.reduce((p, c) => (Math.hypot(c.x - b.x, c.z - b.z) < Math.hypot(p.x - b.x, p.z - b.z) ? c : p));
      return { to: [q.x, q.z] };
    },
  },

  // ---- the Distiller: his ladle, his flasks, his taps; and the vents -----------------------------------------------------------
  distiller: {
    open: 'dst_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [300, 2, 'dst_enrage'],
    deck: ['cleave', 'flask', 'spray', 'quake', 'cleave'],
    adds: [],
    moves: {
      cleave: { clip: 'atk2', secs: 1.3, warn: 'dst_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 9, half: 1.0, elem: POISON }) },
      flask: { clip: 'atk1', secs: 1.3, warn: 'dst_flask', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.5), { n: 6, R: 7 }) },
      spray: { clip: 'atk3', secs: 1.3, warn: 'dst_spray', go: (W, f, m, t, P) => MOVES.venomCone(P, m, t, K(m, 0.6), { r: 11 }) },
      quake: { who: 'none', clip: 'bash', at: 0.5, secs: 1.4, warn: 'dst_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 22, speed: 9, elem: POISON }) },
    },
    // The vents: every twenty-four seconds one of the three opens (never the one before), and its fume spreads from it
    // without end. Its wheel's a few strides off: three seconds held by anyone and it's shut.
    step(W, f, [m], dt) {
      if (!m) return;
      const P = W.sim.perils, v = f.vent;
      if (!v) {
        if (!due(W, f, 'vent', 24, m.state === 0 && !f.turn)) return;
        const i = (f.ventI = ((f.ventI ?? Math.floor(Math.random() * 3)) + 1 + Math.floor(Math.random() * 2)) % 3), [x, z] = at(W, VENTS[i]), [wx, wz] = at(W, WHEELS[i]);
        // (Where its wheel's held from: a stride off the post, away from the vent.)
        const L = Math.hypot(wx - x, wz - z) || 1, hold = [wx + (wx - x) / L * 1.1, wz + (wz - z) / L * 1.1];
        f.vent = { i, held: 0, hold, mk: P.mark({ x, z, r: 3, fuse: 2.5, dmg: K(m, 0.8), life: 90, dps: K(m, 0.7), grow: 0.4, elem: POISON, quiet: true, tag: 'fume' }) };
        W.warn(WARN.dst_vent);
        return;
      }
      const near = W.bodies().some((b) => Math.hypot(b.x - v.hold[0], b.z - v.hold[1]) < 2.4);
      v.held = near ? v.held + dt : Math.max(0, v.held - dt);
      if (v.held >= 3 || m.dead) {
        const q = v.mk;
        q.dmg = 0; q.dps = 0; q.grow = 0; q.life = 0; q.t = Math.max(q.t, q.fuse);
        f.vent = null;
        if (!m.dead) W.warn(WARN.dst_shut, 6);
      }
    },
    end(W, f) { const q = f.vent?.mk; if (q) { q.dmg = 0; q.dps = 0; q.grow = 0; q.life = 0; q.t = Math.max(q.t, q.fuse); } f.vent = null; },
    // Whoever's nearest the open vent's wheel, but his tank: to it, and stay on it.
    order(W, f, b, [m]) {
      const v = f.vent;
      if (!v || !m) return null;
      const tank = W.tank(m), all = W.bodies().filter((q) => q !== tank);
      if (!all.length) return null;
      const who = all.reduce((p, q) => (Math.hypot(q.x - v.hold[0], q.z - v.hold[1]) < Math.hypot(p.x - v.hold[0], p.z - v.hold[1]) ? q : p));
      return who === b ? { to: v.hold, urgent: true } : null;
    },
  },

  // ---- the Great Work: its fists, what it throws; and the two fumes ------------------------------------------------------------
  greatwork: {
    open: 'gwk_open', pace: [4.4, 3.4, 0.35], turn: [24, 4], enrage: [340, 2, 'gwk_enrage'],
    deck: ['slam', 'shards', 'quake', 'lines', 'slam'],
    adds: [
      { at: 0.65, warn: 'gwk_grown', n: (W, f) => Math.max(1, 4 - 1.5 * (f.pumps || 0)) | 0, pick: KEPT, from: 'doors', hp: 2500, damage: 44, name: 'THE GROWN', pal: ['Forest'] },
      { at: 0.3, warn: 'gwk_grown', n: (W, f) => Math.max(1, 4 - 1.5 * (f.pumps || 0)) | 0, pick: KEPT, from: 'doors', hp: 2500, damage: 44, name: 'THE GROWN', pal: ['Forest'] },
    ],
    setUp(W, m) { m.opts.radius = 1.8; },
    moves: {
      slam: { clip: 'atk2', secs: 1.4, warn: 'gwk_slam', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.1), { r: 11, half: 0.9 }) },
      shards: { who: 'none', clip: 'atk1', secs: 1.3, warn: 'gwk_shards', go: (W, f, m, t, P) => volley(W, P, m, K(m, 0.75), POISON, 'shards') },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'gwk_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.42), { reach: 26, speed: 9 }) },
      lines: { clip: 'atk3', secs: 1.3, warn: 'gwk_lines', go: (W, f, m, t, P) => lines3(P, m, t, K(m, 0.85), { elem: STONE, r: 22, w: 1.2, tag: 'furrows' }) },
    },
    // The fume: every twenty-six seconds, heavy and light turn about. The heavy lies over the whole floor short of the
    // gallery; the light over the gallery and nowhere else. Four and a half seconds' warning; five seconds it stays.
    step(W, f, [m], dt) {
      if (!m) return;
      const P = W.sim.perils;
      if (f.pumps === undefined) {
        f.pumps = (emptied(W, 'au_feed_n') ? 1 : 0) + (emptied(W, 'au_feed_s') ? 1 : 0);
        if (f.pumps) W.warn(f.pumps > 1 ? WARN.gwk_less_two : WARN.gwk_less_one, 30);
      }
      if (f.fume) {
        f.fume.t += dt;
        if (f.fume.t > 9.9 || m.dead) { f.fume = null; if (!m.dead) W.warn(WARN.gwk_clear, 10); }
        return;
      }
      if (!due(W, f, 'fume', 26, m.state === 0 && !f.turn)) return;
      const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id), top = rz + r.hz, lip = W.delve.z + GALLERY.z;
      const heavy = (f.fumes = (f.fumes || 0) + 1) % 2 === 1;
      f.fume = { t: 0, heavy };
      W.warn(heavy ? WARN.gwk_heavy : WARN.gwk_light);
      // (A strip the room's whole width: down from its north wall to the gallery's lip, or from the lip to its south wall.)
      const o = { shape: 'line', x: rx, yaw: Math.PI, w: r.hx + 1, fuse: 4.5, dmg: K(m, 1.4), life: 5, dps: K(m, 1.3), elem: POISON, quiet: true };
      // (And a way back up the Feeding Gallery with it: it's no refuge.)
      if (heavy) P.mark({ ...o, z: top + 14, r: top + 14 - lip - 0.6, tag: 'heavy' });
      else P.mark({ ...o, z: lip + 0.2, r: lip - (rz - r.hz) + 1, tag: 'light' });
    },
    end(W, f) { f.fume = null; },
    // The heavy: up onto the gallery. The light: down off it.
    order(W, f, b) {
      const u = f.fume;
      if (!u) return null;
      const d = W.delve, lip = d.z + GALLERY.z, on = b.z < lip - 0.6, x = clamp(b.x, d.x + GALLERY.x0 + 2, d.x + GALLERY.x1 - 2);
      if (u.heavy) return on && b.z < lip - 2 ? null : { to: [x, lip - 3.5], urgent: true };
      return on || b.z < lip + 2.5 ? { to: [x, lip + 5.5], urgent: true } : null;
    },
  },
};
