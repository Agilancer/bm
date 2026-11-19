// The fights of the four great things in Phobos's sewers (src/core/delve-sewers.js): the Spider Queen, the Great Worm, the
// Drowned Abbot and the Lamplighter. In the manner of src/sim/delve-fights.js (which takes these in with its own): a deck of
// called-out moves, made of src/sim/moves.js's named moves and sim.perils' pieces, adds at so much of its life, a turn on
// you, an enrage. And each its own thing, as its opening call says, so a call is never a lie:
//   the Queen's webs hold whoever they catch while they burn, and her brood go for the cocoons in her larder: each that
//     reaches one feeds her;
//   the Worm goes under and comes up where you stand, and is stuck fast in its hole a moment after;
//   the Abbot's drowned brothers walk to him, and each that reaches him gives him its breath;
//   the Lamplighter's wick-men go for the ring of lamps in his hall: each lamp lit burns where it stands for the rest of
//     the fight and makes him hotter, and his rage lights every lamp that's left.
// The sewers are gone down alone (party: false), so its calls speak to one: you.
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';
import { WARN, toWorld } from '../core/dungeon.js';
import { COCOONS, LAMP_RING } from '../core/delve-sewers.js';
import { EV } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';

const { FIRE, DRAIN, BONE, VOID, POISON, STONE } = ELEM;
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// x of one of its blows (an enrage makes everything hit harder: m.opts.damage goes up with it).
const K = (m, x) => m.opts.damage * x * 1.3;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.15, dmg, knock: 4, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
// Something from the roof on you, and more wherever.
const fall = (W, P, m, dmg, elem, tag) => {
  for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.6, fuse: 2.1, dmg, knock: 2, elem, follow: b, lock: 0.45, tag });
  P.rain(m.x, m.z, 16, 6, 1.4, { r: 2.3, fuse: 1.8, dmg: dmg * 0.85, knock: 2, elem, tag });
};
const DROWNED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const WICKS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];

// (As src/sim/delve-fights.js's: the body walked to a place, as its script, true once there; stood still; a clock that's
// answered when the body's free to.)
function walkTo(k, x, z, dt, sim, speed) {
  const d = Math.hypot(x - k.x, z - k.z);
  if (d < 0.9) { k.vx = k.vz = 0; return true; }
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
const stand = (k, dt) => { k.vx = k.vz = 0; if (k.clip !== k.idleClip) k.setClip(k.idleClip); k.t = (k.t + dt) % k.rig.clips[k.clip].dur; return true; };
const due = (W, f, name, secs, free) => { const d = (f.due ||= {}); if (W.every(f, name, secs)) d[name] = true; if (!d[name] || !free) return false; d[name] = false; return true; };

// An add that fights nobody: it walks to `to` ([x, z], or what a function gives each tick) at `pace` (slowed while it's
// hurt), and does `there` when it gets there, and is gone. Bring it down first.
export function errand(W, k, m, to, pace, there) {
  k.opts.damage = 0; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80;
  k.script = (b, dt, sim) => {
    if (m.dead) { b.script = null; return false; }
    const [x, z] = typeof to === 'function' ? to() : to;
    if (!walkTo(b, x, z, dt, sim, b.flinch > 0 ? pace * 0.3 : pace) && gap(b, { x, z }) > 2.6) return true;
    there(b, sim);
    b.hp = 0; b.script = null;
    return false;
  };
}

// ---- the Spider Queen's brood: each to a cocoon (the far ones first), to feed her ----------------------------------------
function brood(W, k, m) {
  const d = W.delve, i = (m.broodN = (m.broodN || 0) + 1);
  const far = COCOONS.map(([x, z]) => toWorld(x, z, d)).sort((a, b) => Math.hypot(b[0] - k.x, b[1] - k.z) - Math.hypot(a[0] - k.x, a[1] - k.z));
  errand(W, k, m, far[i % 3], 2.2, (b, sim) => {
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.03);
    W.warn(WARN.spq_fed, 4);
    sim.casting.burst(FX.PUFF, POISON, b.x, b.y + 0.8, b.z, 0.7, 2.6, 0.5);
  });
}
// ---- the Abbot's brothers: to him, to give him their breath ------------------------------------------------------------
function brother(W, k, m) {
  // (To him where he is now, not where he stood when they rose.)
  errand(W, k, m, () => [m.x, m.z], 1.5, (b, sim) => {
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.02); m.opts.damage *= 1.05;
    W.warn(WARN.dab_fed, 4);
    sim.casting.burst(FX.SHOCK, DRAIN, m.x, m.y + 1.5, m.z, 0.8, 4, 0.5, { light: 6, lightR: 8 });
  });
}
// ---- the Lamplighter's wick-men: each to a lamp of his ring not yet lit, to light it --------------------------------------
function lightLamp(W, m, i, sim, hotter = true) {
  const L = (m.lamps ||= new Set());
  if (L.has(i)) return;
  L.add(i);
  const [x, z] = toWorld(LAMP_RING[i][0], LAMP_RING[i][1], W.delve);
  sim.perils.mark({ x, z, r: 2.4, fuse: 0, life: 600, dps: K(m, 0.35), elem: FIRE, quiet: true, tag: 'lamp' });
  sim.casting.burst(FX.SHOCK, FIRE, x, sim.world.height(x, z) + 1, z, 0.9, 4, 0.6, { light: 8, lightR: 10 });
  if (hotter) m.opts.damage *= 1.08;
}
function wick(W, k, m) {
  const d = W.delve, lit = m.lamps || new Set(), taken = (m.wickTo ||= new Set());
  const free = LAMP_RING.map((q, i) => i).filter((i) => !lit.has(i) && !taken.has(i));
  const i = (free.length ? free : LAMP_RING.map((q, n) => n)).reduce((a, b) => {
    const [ax, az] = toWorld(LAMP_RING[a][0], LAMP_RING[a][1], d), [bx, bz] = toWorld(LAMP_RING[b][0], LAMP_RING[b][1], d);
    return Math.hypot(bx - k.x, bz - k.z) < Math.hypot(ax - k.x, az - k.z) ? b : a;
  });
  taken.add(i);
  errand(W, k, m, toWorld(LAMP_RING[i][0], LAMP_RING[i][1], d), 1.9, (b, sim) => { taken.delete(i); lightLamp(W, m, i, sim); W.warn(WARN.lmp_lit, 4); });
}

export const SEWER_FIGHTS = {
  // ---- the Spider Queen: webs that hold, venom on the floor, and her brood out of the walls ------------------------------------
  spiderqueen: {
    open: 'spq_open', pace: [4.2, 3.2, 0.35], turn: [20, 4], enrage: [240, 2, 'spq_enrage'],
    deck: ['spit', 'venom', 'web', 'leap', 'bite'],
    adds: [
      { at: 0.7, warn: 'spq_brood', n: 3, pick: ['hd_spiderling'], from: 'doors', hp: 900, damage: 30, name: 'BROOD', pal: ['Nightshade'], setUp: brood },
      { at: 0.35, warn: 'spq_brood', n: 4, pick: ['hd_spiderling'], from: 'doors', hp: 900, damage: 30, name: 'BROOD', pal: ['Nightshade'], setUp: brood },
    ],
    moves: {
      spit: { clip: 'atk2', secs: 1.3, warn: 'spq_spit', go: (W, f, m, t, P) => MOVES.spitFan(P, m, t, K(m, 0.8), { n: 5 }) },
      venom: { clip: 'atk3', secs: 1.3, warn: 'spq_venom', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.7)) },
      // Her web over you: a circle that follows, then holds whoever's still in it, burning, for five seconds (step).
      web: { who: 'mark', clip: 'atk4', secs: 1.3, warn: 'spq_web', go: (W, f, m, t, P) => P.mark({ x: t.x, z: t.z, r: 3, fuse: 1.8, dmg: K(m, 1.0), life: 3, dps: K(m, 0.45), elem: POISON, follow: t, lock: 0.5, from: m, tag: 'web',
        then: (q) => (f.webs ||= []).push({ x: q.x, z: q.z, r: 3, t: 3 }) }) },
      leap: { who: 'far', clip: 'jump', secs: 1.4, warn: 'spq_leap', go: (W, f, m, t, P) => P.mark({ x: t.x, z: t.z, r: 5, fuse: 1.6, dmg: K(m, 1.3), knock: 6, elem: POISON, follow: t, lock: 0.5, from: m, tag: 'leap' }) },
      bite: { clip: 'atk1', secs: 1.2, go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.2), { r: 7, elem: POISON }) },
    },
    // (A web holds: whoever's in one is pulled back to its middle, hard enough that walking out takes two seconds, for three:
    // short of her next move, so a web never holds you under another.)
    step(W, f, live, dt) {
      if (!f.webs?.length) return;
      for (const w of f.webs) {
        w.t -= dt;
        if (w.t > 0) for (const b of W.bodies()) { const L = Math.hypot(b.x - w.x, b.z - w.z); if (L < w.r && L > 0.4) W.drag(b, w.x, w.z, 4.4, dt); }
      }
      f.webs = f.webs.filter((w) => w.t > 0);
    },
  },

  // ---- the Great Worm: it goes under and comes up where you stand; silt from the roof; its young ------------------------------
  greatworm: {
    open: 'gwm_open', pace: [4.6, 3.5, 0.3], turn: [24, 4], enrage: [280, 2, 'gwm_enrage'],
    deck: ['spew', 'slam', 'silt', 'bite'],
    adds: [
      { at: 0.65, warn: 'gwm_young', n: 3, pick: ['ps_mainworm'], from: 'doors', hp: 1400, damage: 34, name: 'WORMLING', pal: ['Cobalt'] },
      { at: 0.3, warn: 'gwm_young', n: 4, pick: ['ps_mainworm'], from: 'doors', hp: 1400, damage: 34, name: 'WORMLING', pal: ['Cobalt'] },
    ],
    moves: {
      spew: { clip: 'breath', secs: 1.6, warn: 'gwm_spew', go(W, f, m, t, P) { for (const turn of [-0.5, 0, 0.5]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 18, w: 1.1, fuse: 1.1, dmg: K(m, 1.0), life: 3, dps: K(m, 0.4), elem: POISON, from: m, tag: 'spew' }); } },
      slam: { who: 'none', clip: 'atk2', at: 0.5, secs: 1.5, warn: 'gwm_slam', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 26, speed: 10 }) },
      silt: { who: 'none', clip: 'roar', secs: 1.6, warn: 'gwm_silt', go: (W, f, m, t, P) => fall(W, P, m, K(m, 0.9), STONE, 'silt') },
      bite: { clip: 'atk1', secs: 1.3, go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.25), { r: 9 }) },
    },
    // Under: down into the silt and out of reach (sunk out of sight, and nothing hurts it), then up under you two times,
    // then three. Up the last time, it's stuck in its hole a while, and hurts the more for it.
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils;
      const u = f.dive;
      if (!u) {
        if (!due(W, f, 'dive', 30, m.state === 0 && !m.script && !f.turn)) return;
        f.dives = (f.dives || 0) + 1;
        f.dive = { n: 0, of: Math.min(3, 1 + f.dives), t: 1.6, spot: null, landed: false };
        f.hold = true; m.noTurn = true; m.shrug = 0; m.liftExtra = -m.meta.height * 1.15; m.script = stand;
        W.warn(WARN.gwm_dive);
        sim.casting.burst(FX.SHOCK, STONE, m.x, m.y + 0.5, m.z, 1, 6, 0.6, { light: 6, lightR: 10 });
        sim.event(EV.GROUND, m.x, m.y, m.z);
        return;
      }
      u.t -= dt;
      if (!u.spot && u.t <= 0) {
        const t = W.mark() || sim.player;
        u.spot = P.mark({ x: t.x, z: t.z, r: 3.8, fuse: 2.1, dmg: K(m, 1.3), knock: 6, elem: STONE, follow: t, lock: 0.55, from: m, tag: 'breach',
          then: (q) => { P.wave(q.x, q.z, { speed: 10, reach: 16, touch: K(m, 0.35), knock: 3, elem: STONE, r: 3.8, tag: 'breachWave' }); u.landed = true; } });
      }
      if (u.spot && u.landed) {
        m.x = u.spot.x; m.z = u.spot.z; m.y = sim.world.height(m.x, m.z);
        sim.casting.burst(FX.SHOCK, STONE, m.x, m.y + 0.5, m.z, 1, 5, 0.5);
        u.spot = null; u.landed = false; u.n++; u.t = 1.3;
        if (u.n >= u.of) {
          f.dive = null; f.hold = false;
          m.liftExtra = 0; m.noTurn = false; m.script = null; m.state = 0;
          m.perform({ clip: 'emerge', secs: 3 });
          m.shrug = 1.4; P.later(6, () => { if (!m.dead) m.shrug = 1; });
          W.warn(WARN.gwm_up, 10);
          sim.event(EV.ROAR, m.x, m.y + 3, m.z, 1.6);
        }
      }
    },
  },

  // ---- the Drowned Abbot: black water under you, bone, his eyes, a wall of drowned light, and his chapter --------------------------
  drownedabbot: {
    open: 'dab_open', pace: [4.2, 3.2, 0.4], turn: [24, 4], enrage: [260, 2, 'dab_enrage'],
    deck: ['circle', 'bones', 'eyes', 'wall'],
    adds: [
      { at: 0.75, warn: 'dab_chapter', n: 3, pick: DROWNED, from: 'edge', places: 3, hp: 1800, damage: 40, name: 'DROWNED BROTHER', pal: ['Drowned'], setUp: brother },
      { at: 0.4, warn: 'dab_chapter', n: 4, pick: DROWNED, from: 'edge', places: 4, hp: 1800, damage: 40, name: 'DROWNED BROTHER', pal: ['Drowned'], setUp: brother },
    ],
    moves: {
      // (Six seconds, not ten: so the floor can't fill.)
      circle: { clip: 'atk1', secs: 1.3, warn: 'dab_circle', go(W, f, m, t, P) { for (const b of new Set([t, W.farthest(m)])) P.mark({ x: b.x, z: b.z, r: 3.2, fuse: 1.6, dmg: K(m, 1.1), life: 6, dps: K(m, 0.9), elem: DRAIN, follow: b, lock: 0.5, from: m, tag: 'circle' }); } },
      bones: { clip: 'atk3', secs: 1.3, warn: 'dab_bones', go(W, f, m, t, P) { for (const turn of [-0.45, 0, 0.45]) P.march(m.x, m.z, yawTo(m, t) + turn, 10, 1.9, 0.14, { r: 1.25, fuse: 0.85, dmg: K(m, 1.4), knock: 2, elem: BONE, from: m, tag: 'bones' }); } },
      eyes: { clip: 'atk2', at: 0.45, secs: 1.3, warn: 'dab_eyes', go: (W, f, m, t, P) => MOVES.seekers(P, m, t, K(m, 0.42), { n: 3, elem: VOID }) },
      wall: { clip: 'atk5', at: 0.45, secs: 1.3, warn: 'dab_wall', go: (W, f, m, t, P) => MOVES.boltWall(P, m, t, K(m, 0.7), { width: 18, n: 11, speed: 7.5, elem: DRAIN }) },
    },
  },

  // ---- the Lamplighter: oil that burns where it lands, fire fanned and turning, his pole, and his wick-men ------------------------
  lamplighter: {
    open: 'lmp_open', pace: [4.0, 3.0, 0.4], turn: [22, 4], enrage: [260, 2, 'lmp_enrage'],
    deck: ['pots', 'fan', 'wheel', 'cleave'],
    adds: [
      { at: 0.7, warn: 'lmp_wicks', n: 3, pick: WICKS, from: 'doors', hp: 2000, damage: 42, name: 'WICK-MAN', pal: ['Sulphur'], setUp: wick },
      { at: 0.35, warn: 'lmp_wicks', n: 4, pick: WICKS, from: 'doors', hp: 2000, damage: 42, name: 'WICK-MAN', pal: ['Sulphur'], setUp: wick },
    ],
    moves: {
      pots: { clip: 'atk2', secs: 1.3, warn: 'lmp_pots', go: (W, f, m, t, P) => MOVES.firepots(P, m, t, K(m, 0.8)) },
      fan: { clip: 'atk3', secs: 1.3, warn: 'lmp_fan', go: (W, f, m, t, P) => MOVES.fireFan(P, m, t, K(m, 0.8), { n: 7, spread: 1.3 }) },
      wheel: { who: 'none', clip: 'roar', secs: 1.6, warn: 'lmp_wheel', go: (W, f, m, t, P) => MOVES.fireWheel(P, m, t, K(m, 0.4), { r: 11, arms: 3 }) },
      cleave: { clip: 'atk1', secs: 1.3, warn: 'lmp_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.25), { r: 8, elem: FIRE }) },
    },
    // His rage: the whole hall alight, every lamp of the ring that's left.
    step(W, f, [m]) {
      if (!m || !f.enraged || f.allLit) return;
      f.allLit = true;
      LAMP_RING.forEach((q, i) => lightLamp(W, m, i, W.sim, false));
    },
  },
};
