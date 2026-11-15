// The four Elder Dragon Gods (src/core/delve-elder.js says who and where; src/sim/dungeon.js runs them as it runs every
// fight in src/sim/delve-fights.js, which takes these in). Each is made for its island, and borrows from the raid fights
// players have liked best of late (docs/ELDER-DRAGONS.md has where each idea came from):
//   Thyrraxis, the Gale Eternal, on the Galeward: a gale that throws whoever stands in the open off the disc (into a
//     pylon's lee), squall lines with a gap in them, charged pylons to soak, a spark to carry away; then Storm Nova throws
//     everyone down onto the islets and he hunts them from islet to islet; then up the updrafts for the last of it on a disc
//     whose middle has broken.
//   Kaldurra, the Hearth of the World, in the Cinderwell: lava waves to jump, a wildfire that walks round the ring, a living
//     meteor that hunts one of you; twice the caldera floods and the basalt pillars are the only ground; twice the
//     Apocalypse Roar, and only the ember flowers save you.
//   Morvekh, Who Remembers the Cold, on the Rimespire: a climb. He hangs off the spire beside the shelf you're on, and as
//     he goes up the freezing mist takes the shelves below; the Grasp of the Grave drags you to the edge unless you hold to
//     the rime; at the summit, Absolute Zero, and his three claws in the islets to be broken by standing in each grip.
//   Nihvaroth, the Hollow Star, on the Lip of the Maw: Devour pulls everything over the edge but those in a star well;
//     whoever floats is pulled down by friends under them; then the Swallow throws you out onto the Maw's two hands to
//     break the echoes of the three gods it ate; back on the Lip, the stars go out one by one and the ring closes in.
// The gods speak (their LINES, as subtitles: `<god>_say_<when>_<n>` in WARN).
import { WARN, caveFloorY, caveRoom, roomOf, toWorld } from '../core/dungeon.js';
import { BASALT, BASALT_UP, CINDER, GALE, GALE_ISLES, LINES, MAW, MAW_ISLES, PYLONS, RIME, RIME_ISLES, RIME_LEDGES, STARS } from '../core/delve-elder.js';
import { EV } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { tipBody } from './moves.js';
import { ELEM, FX } from './spells.js';
import { blowOff, islandOf, landing, leap } from './voidland.js';

const { FIRE, FROST, STORM, VOID, DRAIN, ARCANE, LIGHT } = ELEM;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (a) => a[(Math.random() * a.length) | 0];
// (What a god's marks land for: this much of its blow. Its blows are meant for a party of the hundredth winter.)
const K = (m, x) => m.opts.damage * x * 1.3;
// Under the hundredth winter (the delve's level), for each year short the gods hit a twentieth harder and have a
// twenty-fifth more life: at ninety, half again as hard and two fifths more. Set as each fight begins, from what each
// was made with (a fight let go puts its damage back: src/sim/dungeon.js endFight).
function underHundred(W, f, live) {
  const lv = W.sim.level || 0, gap = lv > 0 ? Math.max(0, (W.delve.level || 100) - lv) : 0;
  f.gap = gap;
  for (const m of live) {
    m.baseMax ??= m.maxHp;
    m.maxHp = m.hp = Math.round(m.baseMax * (1 + 0.04 * gap));
    if (gap) m.opts.damage = (m.opts.base?.damage ?? m.opts.damage) * (1 + 0.05 * gap);
  }
  if (gap) W.warn(WARN.ed_under);
}
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);
// A local place of the delve, in the world.
const W2 = (W, x, z) => [W.delve.x + x, W.delve.z + z];
const busy = (m) => m.script || m.breathing || m.state !== 0;
const loose = (W) => W.bodies().filter((b) => b.role !== 'tank');

// ---- what the gods say ------------------------------------------------------------------------------------------------------
// The next of its lines for `when`, as a subtitle under the fight's calls; never two of a god's within `gap` seconds.
function say(W, f, when, gap = 7) {
  const god = f.boss.key, list = LINES[god]?.[when];
  if (!list) return;
  const t = W.sim.time;
  if (t - (f.saidT ?? -1e9) < gap && when !== 'death' && when !== 'wipe') return;
  f.said ||= {};
  const n = (f.said[when] = (f.said[when] ?? -1) + 1) % list.length;
  f.saidT = t;
  const id = WARN[`${god}_say_${when}_${n}`];
  if (id !== undefined) W.warn(id);
}
// Each tick of every god: its first words, a word over each of yours who falls, and a word as it weakens.
function talk(W, f, m) {
  if (!f.spoke) { f.spoke = true; say(W, f, 'intro', 0); }
  if (!f.pulled && f.t > 6) { f.pulled = true; say(W, f, 'pull', 0); }
  const down = [W.sim.player, ...W.party()].filter((b) => b.dead).length;
  if (down > (f.downSeen || 0)) say(W, f, 'kill', 4);
  f.downSeen = down;
  if (!f.lowSaid && m.hp < m.maxHp * 0.12) { f.lowSaid = true; say(W, f, 'low', 0); }
}
const lastWords = (W, f) => say(W, f, 'death', 0);
const wipeWords = (W, f) => { if (W.sim.player.dead) say(W, f, 'wipe', 0); };

// ---- flight ----------------------------------------------------------------------------------------------------------------
// A god on the wing, as its script: up off the ground by its takeoff if it's down; across to (x, z), `h` metres over the
// ground under it (over the void, the ground its island would have); held there `hold` seconds (Infinity: until the fight
// sends it on), turned to `face` (a body, a point, or a function giving either); `each(k, dt, a)` every tick of the way
// and the hold. Then down if `land` (its landing timed to touch as it gets there: `landClip`, else its land), and
// `then(k)`. a.clip: what it plays while it holds (its hover, unless a move's said otherwise); a.go: set it to end a hold at
// once; deck: its fight's moves go on while it holds (those that need no clip of their own: src/sim/dungeon.js deck).
function flight(W, m, o) {
  const sim = W.sim, a = { stage: m.aloft ? 'go' : 'rise', t: 0, pitch: 0, roll: 0, yawWas: m.yaw, speed: 18, hold: 0, ...o };
  m.flying = true; m.free = true; m.noTurn = true; m.state = 0; m.act = null; m.breathing = false;
  m.rig.poseModifier = (rot) => tipBody(m.rig, rot, a.pitch, a.roll);
  const faceYaw = (k) => {
    const t = typeof a.face === 'function' ? a.face() : a.face;
    if (!t) return k.yaw;
    const fx = Array.isArray(t) ? t[0] : t.x, fz = Array.isArray(t) ? t[1] : t.z;
    return Math.hypot(fx - k.x, fz - k.z) < 0.5 ? k.yaw : Math.atan2(fx - k.x, fz - k.z);
  };
  m.script = (k, dt) => {
    a.t += dt;
    if (k.dead) { k.script = null; k.free = false; k.airDeck = false; k.rig.poseModifier = null; return false; }
    const clips = k.rig.clips, pace = k.pace || 1;
    const set = (n, loop = true) => { const c = clips[n] ? n : 'fly'; if (k.clip !== c) { k.setClip(c); k.t = 0; } k.t = loop ? (k.t + dt * pace) % clips[c].dur : Math.min(clips[c].dur, k.t + dt * pace); };
    const lift = (to, rate) => { k.liftExtra = (k.liftExtra || 0) + clamp(to - (k.liftExtra || 0), -dt * rate, dt * rate); };
    const turnTo = (yaw, rate) => { k.yaw += clamp(wrapAngle(yaw - k.yaw), -dt * rate, dt * rate); };
    const next = (s) => { a.stage = s; a.t = 0; };
    let pitch = 0;
    if (a.stage === 'rise') {
      k.vx = k.vz = 0;
      const up = clips.takeoff.dur / pace;
      set('takeoff', false);
      if (a.t > up * 0.35) lift(a.h, 5);
      turnTo(faceYaw(k), 1.5);
      if (a.t >= up) { k.aloft = true; next('go'); }
    } else if (a.stage === 'go') {
      set(a.glide && clips.fly_glide ? 'fly_glide' : 'fly');
      lift(a.h, a.climb || 4);
      const dx = a.x - k.x, dz = a.z - k.z, d = Math.hypot(dx, dz), v = Math.min(a.speed, d * 1.4 + 2);
      k.vx = d > 0.4 ? dx / d * v : 0; k.vz = d > 0.4 ? dz / d * v : 0;
      turnTo(d > 3 ? Math.atan2(dx, dz) : faceYaw(k), 3);
      pitch = clamp(v / 50, 0, 0.32);
      a.each?.(k, dt, a);
      if (d < 0.8 && Math.abs((k.liftExtra || 0) - a.h) < 0.8) next('hold');
    } else if (a.stage === 'hold') {
      k.vx = k.vz = 0;
      k.airDeck = !!a.deck;
      lift(a.h, 3);
      set(a.clip || 'fly_hover', !a.once);
      // (While it breathes, its head comes round after you slowly: a walk sideways takes you out of the cone.)
      turnTo(faceYaw(k), (k.aimLock || 0) > sim.time ? 0.16 : a.turn || 2.2);
      a.each?.(k, dt, a);
      if (a.go || a.t >= a.hold) {
        if (a.land) next('down');
        else { const then = a.then; a.then = null; if (then) then(k); }
      }
    } else if (a.stage === 'down') {
      k.airDeck = false;
      const lc = clips[a.landClip] ? a.landClip : 'land', c = clips[lc], touch = (c.touch ?? c.dur * 0.12) / pace;
      set(lc, false);
      lift(0, (a.h + 0.5) / Math.max(touch, 0.3));
      turnTo(faceYaw(k), 2);
      if (a.t >= touch) {
        k.flying = false; k.free = false; k.liftExtra = 0; k.script = null; k.rig.poseModifier = null; k.vx = k.vz = 0; k.state = 0; k.noTurn = false; k.aloft = false;
        if (k.flightA === a) k.flightA = null;
        // (The rest of its landing as a move, where it came down: a crash's whole sprawl and getting up again.)
        if (lc === 'land') { if (!k.landed()) k.setClip(k.idleClip); }
        else k.perform({ clip: lc, from: k.t, secs: Math.max(0.05, (c.dur - k.t) / pace), rate: pace, at: 1e9 });
        sim.event(EV.GROUND, k.x, k.y, k.z); sim.event(EV.ROAR, k.x, k.y + 4, k.z, 1.6);
        const then = a.then; a.then = null;
        then?.(k);
        return true;
      }
    }
    const turned = wrapAngle(k.yaw - a.yawWas) / Math.max(dt, 1e-4);
    a.yawWas = k.yaw;
    a.pitch += (pitch - a.pitch) * Math.min(1, dt * 4);
    a.roll += (clamp(-turned * 0.22, -0.5, 0.5) - a.roll) * Math.min(1, dt * 3);
    return true;
  };
  return a;
}
// A move played while a god hangs in the air: its clip for its length (hover breath, a turn), then its hover again.
function airMove(m, clip, secs) {
  const a = m.flightA;
  if (!a || !m.rig.clips[clip]) return false;
  a.clip = clip; a.once = true; m.t = 0;
  m.airT = (m.airT || 0) + 1;
  const n = m.airT;
  setTimeoutSim(m, secs, () => { if (m.airT === n && m.flightA === a) { a.clip = null; a.once = false; } });
  return true;
}
// (The sim's own clock, kept on the body: perils.later would be cleared with the ground.)
function setTimeoutSim(m, secs, fn) { (m.timers ||= []).push({ at: secs, fn }); }
function stepTimers(m, dt) {
  if (!m.timers?.length) return;
  for (const q of m.timers) q.at -= dt;
  const due = m.timers.filter((q) => q.at <= 0);
  m.timers = m.timers.filter((q) => q.at > 0);
  for (const q of due) q.fn();
}
// Fly, keeping the flight's state on the body (airMove reads it).
const fly = (W, m, o) => { m.flightA = flight(W, m, o); return m.flightA; };
// Down to the ground at once, wherever it is, as a fight ends.
function ground(m) {
  m.flying = false; m.free = false; m.aloft = false; m.liftExtra = 0; m.script = null; m.rig.poseModifier = null; m.noTurn = false; m.flightA = null; m.timers = []; m.airDeck = false;
}
// A move made at once, whatever the body was at (a landing's last moments, a held breath).
function force(m, a) { m.script = null; m.state = 0; m.act = null; m.breathing = false; m.breathHeld = false; return m.perform(a); }

// ---- pieces they share ------------------------------------------------------------------------------------------------------
// Its breath: a cone before it, aimed as it draws it and held there, from the ground (breath) or the air (hover_breath).
// The tank, square in front of it, is spared on the ground: it's the rest of you it's turned on.
function breath(W, m, elem, k, o = {}) {
  const air = m.flying, clip = air ? 'hover_breath' : m.rig.clips.breath2 && Math.random() < 0.4 ? 'breath2' : 'breath';
  const c = m.rig.clips[clip];
  if (!c) return false;
  const w = c.info?.breathWin || m.meta.breathWin || [0.25, 0.8], dur = c.dur / (m.pace || 1), tank = W.tank(m);
  if (air) { if (!airMove(m, clip, dur)) return false; m.aimLock = W.sim.time + dur; }
  else { m.breathing = true; m.breathHeld = true; m.state = 4; m.setClip(clip); m.t = 0; }
  // (From the air, the cone is laid on the ground under its mouth: ahead of it by its height.)
  W.sim.perils.mark({ shape: 'cone', ride: m, ahead: air ? m.meta.height * 0.15 : 0, r: o.r || 20, half: o.half || 0.55, fuse: w[0] * dur, life: (w[1] - w[0]) * dur, dps: K(m, k), elem, from: m, tag: 'breath', spare: air ? null : (b) => b === tank });
  // (What it leaves burning on the ground after.)
  if (o.leave) W.sim.perils.later(w[1] * dur, () => { if (!m.dead) W.sim.perils.mark({ shape: 'cone', x: m.x, z: m.z, yaw: m.yaw, r: (o.r || 20) * 0.85, half: (o.half || 0.55) * 0.8, fuse: 0.2, life: o.leave, dps: K(m, k * 0.45), elem, tag: 'frozen' }); });
  return true;
}
// Three rakes of its claws, fanned toward whoever it's for.
const rake = (P, m, t, k, elem) => { const yaw = yawTo(m, t); for (const a of [-0.38, 0, 0.38]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yaw + a, r: 16, w: 1.2, fuse: 1.05, dmg: K(m, k), knock: 4, elem, from: m, tag: 'rake' }); };
// Its tail round behind it.
const tail = (P, m, k, elem) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: m.yaw + Math.PI, r: m.meta.height * 1.2, half: 1.1, fuse: 1.1, dmg: K(m, k), knock: 8, elem, from: m, tag: 'tail' });
// Waves that roll out along the ground from (x, z), a lip of each to be jumped: n of them, `gap` seconds apart.
function rings(W, x, z, k, m, elem, n = 3, gap = 1.6, speed = 8, reach = 44) {
  for (let i = 0; i < n; i++) W.sim.perils.later(i * gap, () => { if (!m.dead) W.sim.perils.wave(x, z, { speed, reach, band: 1.1, r: 1.6, touch: K(m, k), knock: 3, elem, jump: true, tag: 'rings' }); });
}
// Whose line it is to soak a mark: the nearest of those free to, never the tank. (taken: those given something already.)
function soaker(W, x, z, taken = new Set()) {
  let best = null, bd = Infinity;
  for (const b of loose(W)) { if (taken.has(b)) continue; const d = dist(b, x, z); if (d < bd) { bd = d; best = b; } }
  return best;
}
// The island under a body's feet, and the islets among `list` ([{ at: [lx, lz] }]) nearest it.
const nearestOf = (W, list, b) => list.reduce((a, s) => { const [x, z] = W2(W, s.at[0], s.at[1]); const d = dist(b, x, z); return d < a.d ? { s, d, x, z } : a; }, { s: null, d: Infinity });
// Thrown through the air onto (x, z): a body (hurt `k` of the god's blow on landing).
const throwTo = (W, m, b, x, z, k, apex = 7) => { const [lx, lz] = landing(W, x, z, 2.2); leap(W, b, lx, lz, { apex, secs: 1.8 + Math.random() * 0.4, hurt: K(m, k) }); };

export const ELDER_FIGHTS = {
  // ---- Thyrraxis, the Gale Eternal -----------------------------------------------------------------------------------------
  thyrraxis: {
    open: 'thy_open', pace: [5.2, 4.2, 0.4], turn: [24, 4], enrage: [540, 2.5, 'thy_enrage'],
    deck: (f) => (f.phase === 0 ? ['breath', 'rake', 'squall', 'gale', 'spark', 'conduit'] : f.phase === 2 ? ['breath', 'rake', 'rings', 'clouds', 'tail'] : ['breath', 'rake', 'squall', 'gale', 'spark', 'rings', 'conduit']),
    setUp(W, m) { Object.assign(m.opts, { ground: true, radius: 3.2, breathRange: 20, speed: 5.5 }); },
    moves: {
      breath: { who: 'none', clip: null, warn: 'thy_breath', gap: 20, when: (W, f, m) => !f.turn?.on, go(W, f, m) { breath(W, m, STORM, 0.55); say(W, f, 'breath'); } },
      rake: { clip: 'claw_rake', face: true, at: 0.85, secs: 1.6, go: (W, f, m, t, P) => rake(P, m, t, 0.5, STORM) },
      tail: { who: 'none', clip: 'tail_whip', at: 0.7, secs: 1.4, go: (W, f, m, t, P) => tail(P, m, 0.6, STORM) },
      // A squall line across the disc, sweeping from one side to the other: a gap in it somewhere to stand in.
      squall: { who: 'none', clip: 'roar', secs: 1.4, warn: 'thy_squall', go(W, f, m, t, P) {
        const [cx, cz] = W2(W, GALE.x, GALE.z), ang = Math.random() * TAU, ux = Math.sin(ang), uz = Math.cos(ang), px = Math.cos(ang), pz = -Math.sin(ang);
        const gap = rnd(-18, 18), half = 34, speed = 9, from = -34;
        // (Two lengths of it either side of the gap, walking on together.)
        for (const [a, b] of [[-half, gap - 2.6], [gap + 2.6, half]]) {
          if (b - a < 1) continue;
          P.mark({ shape: 'line', x: cx + ux * from + px * a, z: cz + uz * from + pz * a, yaw: Math.atan2(px, pz), r: b - a, w: 2.2, fuse: 2.2, life: 68 / speed, vx: ux * speed, vz: uz * speed, touch: K(m, 0.55), again: 1.5, knock: 9, elem: STORM, from: null, tag: 'squall' });
        }
        say(W, f, 'squall');
      } },
      // The gale: his wings beat, and for as long as they do everyone out in the open is driven away from him across the
      // disc, and off its edge (src/sim/voidland.js blowOff), but those in a pylon's lee.
      gale: { who: 'none', clip: null, warn: 'thy_gale', gap: 10, when: (W, f, m) => !f.gale && !f.spark, go(W, f, m) {
        const c = m.rig.clips.wing_buffet, secs = c ? c.dur / (m.pace || 1) : 2.4;
        if (!m.perform({ clip: 'wing_buffet', secs: secs * 2 + 0.4, at: 0 })) return false;
        f.gale = { from: m, at: W.sim.time + 1.4, until: W.sim.time + secs * 2 + 0.4 };
        say(W, f, 'gale');
      } },
      // A spark on one of you: a circle on them that bursts on everyone in it. Carry it out to the rim, away from the rest.
      spark: { who: 'none', clip: 'roar', secs: 1.2, when: (W, f) => !f.gale, go(W, f, m, t, P) {
        const who = loose(W);
        if (!who.length) return;
        const b = W.sim.player.dead || Math.random() < 0.6 ? pickOne(who) : W.sim.player;
        // (Whoever carries it takes a part of it; one caught beside them, all of it.)
        f.spark = { b, mk: P.mark({ x: b.x, z: b.z, r: 4.2, fuse: 7, follow: b, lock: 0.97, dmg: K(m, 1.5), knock: 4, elem: STORM, tag: 'spark', spare: (o) => o === b, then: () => { P.hurt(b, K(m, 0.6), b.x, b.z, 0, false, 'spark'); } }) };
        W.warn(WARN[b === W.sim.player ? 'thy_spark' : 'thy_spark_other']);
        say(W, f, 'spark');
      } },
      // A pylon charges: someone into its ring to drain it, or that quarter of the disc is live from then on.
      conduit: { who: 'none', clip: 'roar', secs: 1.3, warn: 'thy_conduit', when: (W, f) => (f.over || []).length < 3 && !f.conduit, go(W, f, m, t, P) {
        const [cx, cz] = W2(W, GALE.x, GALE.z), free = PYLONS.map((q, i) => i).filter((i) => !(f.over || []).some((o) => o.i === i));
        const i = pickOne(free), [px, pz] = W2(W, PYLONS[i][0], PYLONS[i][1]), L = Math.hypot(cx - px, cz - pz) || 1;
        const x = px + (cx - px) / L * 4.2, z = pz + (cz - pz) / L * 4.2;
        f.conduit = { i, by: soaker(W, x, z), mk: P.mark({ x, z, r: 3.2, fuse: 8, soak: true, elem: STORM, tag: 'conduit', then: (q, P2, inside) => {
          f.conduit = null;
          if (inside.length) { for (const b of inside) P.hurt(b, K(m, 0.25), q.x, q.z, 0, false, 'conduit'); return; }
          // (Overloaded: its quarter of the disc burns while the disc does.)
          W.warn(WARN.thy_overload);
          (f.over ||= []).push({ i, mk: P.mark({ shape: 'cone', x: cx, z: cz, yaw: Math.atan2(px - cx, pz - cz), r: GALE.r + 1, half: 0.55, fuse: 1.5, life: 9999, dps: K(m, 0.4), elem: STORM, tag: 'overload' }) });
        } }) };
        say(W, f, 'conduit');
      } },
      // Tempest Wing (on the islets and after): rings of wind rolling out from where he stands, to be jumped.
      rings: { who: 'none', clip: 'wing_buffet', secs: 1.6, warn: 'thy_rings', gap: 16, go(W, f, m) { rings(W, m.x, m.z, 0.5, m, STORM, 3, 1.7, 7.5, 40); say(W, f, 'rings'); } },
      // A thundercloud over the islet with the most of you on it: go across to another.
      clouds: { who: 'none', clip: 'roar', secs: 1.3, warn: 'thy_clouds', go(W, f, m, t, P) {
        const by = GALE_ISLES.map((s) => { const [x, z] = W2(W, s.at[0], s.at[1]); return { s, x, z, n: W.bodies().filter((b) => dist(b, x, z) < s.r + 1).length }; }).sort((a, b) => b.n - a.n)[0];
        f.cloud = { s: by.s, mk: P.mark({ x: by.x, z: by.z, r: by.s.r + 1.5, fuse: 5, life: 7, dps: K(m, 0.55), dmg: K(m, 0.4), elem: STORM, tag: 'cloud', then: () => { P.later(7, () => { f.cloud = null; }); } }) };
        say(W, f, 'clouds');
      } },
    },
    begin(W, f, live) { underHundred(W, f, live); f.phase = 0; f.over = []; },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, now = sim.time;
      stepTimers(m, dt);
      talk(W, f, m);
      if (m.breathing && m.state !== 4) { m.breathing = false; m.breathHeld = false; }
      // The gale, while his wings beat.
      const g = f.gale;
      if (g) {
        if (now > g.until || m.dead) f.gale = null;
        else if (now > g.at) {
          const lee = PYLONS.map(([x, z]) => W2(W, x, z));
          for (const b of W.bodies()) {
            if (b.leaping) continue;
            const dx = b.x - m.x, dz = b.z - m.z, L = Math.hypot(dx, dz) || 1;
            // (In the lee: a pylon between him and you, near enough to you to break the wind.)
            const hid = lee.some(([px, pz]) => { const ax = px - m.x, az = pz - m.z, la = Math.hypot(ax, az) || 1; if (la > L || L - la > 7.5) return false; const cross = Math.abs(ax * dz - az * dx) / L; return cross < 2.2; });
            if (hid) continue;
            const push = 4.6 * dt, nx = b.x + dx / L * push, nz = b.z + dz / L * push;
            if (caveRoom(nx, nz) < 1.1) { blowOff(W, b, dx, dz, 11); continue; }
            b.x = nx; b.z = nz;
          }
          if ((sim.tick & 7) === 0) for (let i = 0; i < 3; i++) { const a = m.yaw + rnd(-0.9, 0.9), r = rnd(4, 26); sim.casting.burst(FX.PUFF, STORM, m.x + Math.sin(a) * r, m.y + rnd(0.5, 3), m.z + Math.cos(a) * r, 0.4, 2.5, 0.6, { alpha: 0.5, len: 3 }); }
        }
      }
      if (f.spark && (f.spark.mk.dead || f.spark.mk.landed)) f.spark = null;
      // On the islets: a while on each, then over to the next with a strafe down it first.
      if (f.phase === 2 && f.isle && now > f.hopAt && !busy(m) && m.hp > m.maxHp * 0.4) { isletHop(W, f, m, false); return; }
      // Storm Nova at seventy hundredths: everyone thrown down onto the islets, and he comes down onto one of them.
      if (f.phase === 0 && m.hp < m.maxHp * 0.7 && !busy(m) && !f.gale) {
        f.phase = 1; f.hold = true;
        for (const o of f.over) o.mk.life = 0; f.over = [];
        if (f.conduit) { f.conduit.mk.dead = true; f.conduit = null; }
        if (f.spark) { f.spark.mk.dead = true; f.spark = null; }
        m.perform({ clip: 'enrage', secs: 2.2, at: 1.6, fn: () => {
          W.warn(WARN.thy_nova); say(W, f, 'nova', 0);
          sim.casting.burst(FX.SHOCK, STORM, m.x, m.y + 2, m.z, 4, 30, 0.8, { light: 30, lightR: 40 });
          W.bodies().forEach((b, i) => { const s = GALE_ISLES[i % 3], [x, z] = W2(W, s.at[0] + rnd(-3, 3), s.at[1] + rnd(-3, 3)); throwTo(W, m, b, x, z, 0.45, 9); });
          // (Storm elementals down onto the islets after you.)
          P.later(5, () => { if (m.dead) return; W.warn(WARN.thy_elementals); GALE_ISLES.forEach((s, i) => W.spawnAdds(`thy_storm_${i}`, ['dragonling_black'], W2(W, s.at[0], s.at[1]), 1, (k) => { k.hp = k.maxHp = 4500; k.opts.damage = 100; k.opts.name = 'STORM WHELP'; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; }, ['Stormhide'], true)); });
          fly(W, m, { x: m.x, z: m.z, h: 16, hold: 2.5, face: () => sim.player, then: () => isletHop(W, f, m, true) });
        } });
        return;
      }
      // Below forty: the updrafts, back up; he goes back to the disc, and its middle breaks.
      if (f.phase === 2 && m.hp < m.maxHp * 0.4 && !busy(m)) {
        f.phase = 3; f.hold = true;
        if (f.cloud) { f.cloud.mk.life = 0; f.cloud = null; }
        W.warn(WARN.thy_updraft); say(W, f, 'updraft', 0);
        const [cx, cz] = W2(W, GALE.x, GALE.z);
        // (Whelps still down on the islets ride the updrafts up with you, onto the disc's rim: nothing left below to chase.)
        for (const k of W.adds()) {
          if (k.opts.name !== 'STORM WHELP') continue;
          const a = rnd(0, TAU), [x, z] = landing(W, cx + Math.sin(a) * (GALE.r - 8), cz + Math.cos(a) * (GALE.r - 8), 2);
          sim.casting.burst(FX.PUFF, STORM, k.x, k.y + 1, k.z, 1.2, 4, 0.6, { alpha: 0.7 });
          k.x = x; k.z = z; k.y = caveFloorY(x, z); k.vx = 0; k.vz = 0;
          sim.casting.burst(FX.SHOCK, STORM, x, k.y + 1, z, 1, 6, 0.5, { light: 8, lightR: 10 });
        }
        fly(W, m, { x: cx, z: cz - 17, h: 14, hold: 6, face: () => sim.player, land: true, then: () => {
          f.hold = false;
          W.warn(WARN.thy_break); say(W, f, 'break', 0);
          f.broken = P.mark({ x: cx, z: cz, r: 7, fuse: 3, life: 9999, dps: K(m, 0.8), elem: STORM, tag: 'broken' });
          m.opts.damage *= 1.12;
        } });
        return;
      }
    },
    // Where a fall off the disc comes down: the islet below, nearest to where you went over.
    fallTo(W, f, b) { const n = nearestOf(W, GALE_ISLES, b); return [n.x, n.z]; },
    // (The updrafts carry you back up while he's on the disc, not while he's down among the islets: Storm Nova to the updraft.)
    gust: (W, f, l) => !l.one || f.phase === 0 || f.phase === 3,
    order(W, f, b, [m]) {
      if (!m) return null;
      // A spark on you: out to the rim, away from everyone. Near someone with a spark: away from them.
      const sp = f.spark;
      if (sp && !sp.mk.landed && !sp.mk.dead) {
        if (sp.b === b) {
          if (f.phase === 1 || f.phase === 2) return null;
          const [cx, cz] = W2(W, GALE.x, GALE.z), others = W.bodies().filter((o) => o !== b), R = GALE.r - 5;
          // (Round the rim a step at a time: the place furthest from everyone that isn't a burning quarter, the nearer the better.)
          const burns = (f.over || []).map((o) => { const [px, pz] = W2(W, PYLONS[o.i][0], PYLONS[o.i][1]); return Math.atan2(px - cx, pz - cz); });
          let best = null, bs = -Infinity;
          for (let k = 0; k < 32; k++) {
            const a = k / 32 * TAU, tx = cx + Math.sin(a) * R, tz = cz + Math.cos(a) * R;
            if (burns.some((y) => Math.abs(wrapAngle(a - y)) < 0.72)) continue;
            const s2 = Math.min(30, ...others.map((o) => dist(o, tx, tz))) - dist(b, tx, tz) * 0.25;
            if (s2 > bs) { bs = s2; best = [tx, tz]; }
          }
          if (!best) return null;
          return dist(b, best[0], best[1]) < 2 ? { still: true } : { to: best, urgent: true };
        }
      }
      // The gale: into the lee of the nearest pylon, behind it from him.
      if (f.gale) {
        // (Behind the nearest pylon from him, on the disc. W.shelter wants rock between, and a pylon isn't the delve's rock.)
        let lee = null, ld = Infinity;
        for (const [i, [px, pz]] of PYLONS.map(([x, z]) => W2(W, x, z)).entries()) {
          // (Not one whose quarter burns: its lee is in the fire.)
          if ((f.over || []).some((o) => o.i === i)) continue;
          const ax = px - m.x, az = pz - m.z, L = Math.hypot(ax, az) || 1, hx = px + ax / L * 3, hz = pz + az / L * 3;
          if (caveRoom(hx, hz) < 1.2) continue;
          const dd = dist(b, hx, hz);
          if (dd < ld) { ld = dd; lee = [hx, hz]; }
        }
        if (lee) return ld < 1.2 ? { still: true } : { to: lee, urgent: true };
      }
      // A charging pylon: whoever's been given it, into its ring.
      const c = f.conduit;
      if (c && c.by === b && !c.mk.landed) return dist(b, c.mk.x, c.mk.z) < 1.6 ? { still: true } : { to: [c.mk.x, c.mk.z], urgent: true };
      // On the islets: off the one with the cloud over it, onto the one he's on (or the nearest other).
      if (f.phase === 1 || f.phase === 2) {
        const here = nearestOf(W, GALE_ISLES, b);
        if (f.cloud && f.cloud.s === here.s && !f.cloud.mk.dead) {
          const other = GALE_ISLES.filter((s) => s !== here.s).map((s) => ({ s, at: W2(W, s.at[0], s.at[1]) })).sort((a, z) => dist(m, ...a.at) - dist(m, ...z.at))[0];
          return { to: other.at, urgent: true };
        }
        const clouded = f.cloud && !f.cloud.mk.dead && f.cloud.s === f.isle;
        if (!m.flying && f.isle && here.s !== f.isle && !clouded) { const [x, z] = W2(W, f.isle.at[0], f.isle.at[1]); return { to: [x, z] }; }
      }
      // The updrafts: back up onto the disc.
      if (f.phase === 3 && caveFloorY(b.x, b.z) < W.delve.y + GALE.y - 3) { const [cx, cz] = W2(W, GALE.x, GALE.z); return { to: [cx, cz + 14] }; }
      // (Down among the islets with nowhere else to be: onto his, or kept in from the edge of your own.)
      if (f.phase === 1 || f.phase === 2) {
        const here = nearestOf(W, GALE_ISLES, b);
        if (here.d < here.s.r + 2 && here.d > here.s.r - 3.5) return { to: [here.x + (b.x - here.x) * 0.5, here.z + (b.z - here.z) * 0.5] };
      }
      return null;
    },
    died: (W, f) => lastWords(W, f),
    end(W, f, live) { for (const m of live) ground(m); wipeWords(W, f); },
  },

  // ---- Kaldurra, the Hearth of the World -----------------------------------------------------------------------------------
  kaldurra: {
    open: 'kal_open', pace: [5, 4, 0.4], turn: [22, 4], enrage: [560, 2.5, 'kal_enrage'],
    deck: (f) => (f.phase < 2 ? ['smash', 'wildfire', 'meteor', 'breath', 'rake', 'run'] : ['smash', 'wildfire', 'meteor', 'breath', 'rake', 'run', 'tail']),
    setUp(W, m) { Object.assign(m.opts, { ground: true, radius: 3.4, breathRange: 20, speed: 5 }); },
    moves: {
      breath: { who: 'none', clip: null, warn: null, when: (W, f) => !f.turn?.on, go(W, f, m) { breath(W, m, FIRE, 0.6, { leave: 5 }); } },
      rake: { clip: 'claw_rake', face: true, at: 0.85, secs: 1.6, go: (W, f, m, t, P) => rake(P, m, t, 0.5, FIRE) },
      tail: { who: 'none', clip: 'tail_spin', at: 0.8, secs: 1.8, go(W, f, m, t, P) { P.mark({ x: m.x, z: m.z, r: m.meta.height * 1.1, fuse: 1.2, dmg: K(m, 0.6), knock: 9, elem: FIRE, from: m, tag: 'tail' }); } },
      // Claw Smash: a blow in front of her, and three lava waves rolling out from it along the ground, to be jumped.
      smash: { clip: 'claw_slam', face: true, at: 1.0, secs: 1.9, warn: 'kal_smash', gap: 14, go(W, f, m, t, P) {
        const yaw = m.yaw, cx = m.x + Math.sin(yaw) * 6, cz = m.z + Math.cos(yaw) * 6;
        P.mark({ x: cx, z: cz, r: 6, fuse: 0.3, dmg: K(m, 0.9), knock: 6, elem: FIRE, tag: 'smash' });
        for (const a of [-0.55, 0, 0.55]) {
          const ty = yaw + a, ux = Math.sin(ty), uz = Math.cos(ty), px = Math.cos(ty), pz = -Math.sin(ty);
          P.mark({ shape: 'line', x: cx - px * 4.5, z: cz - pz * 4.5, yaw: Math.atan2(px, pz), r: 9, w: 1.6, fuse: 0.9, life: 4, vx: ux * 9, vz: uz * 9, touch: K(m, 0.6), again: 2, knock: 3, jump: true, elem: FIRE, tag: 'lavawave' });
        }
        say(W, f, 'smash');
      } },
      // Wildfire: a front of it round the ring from one side, walking on round it. Keep ahead of it.
      wildfire: { who: 'none', clip: 'roar', secs: 1.5, warn: 'kal_wildfire', gap: 20, when: (W, f) => !f.flooding, go(W, f, m, t, P) {
        const [cx, cz] = W2(W, CINDER.x, CINDER.z), b = W.mark() || W.sim.player, at = Math.atan2(b.x - cx, b.z - cz) + (Math.random() < 0.5 ? 1 : -1) * 1.2;
        // (Round the ring slower than you walk even at its rim: 4.6 m a second there, 1.6 by the vent.)
        P.mark({ shape: 'cone', x: cx, z: cz, yaw: at, r: CINDER.r + 1, half: 0.22, fuse: 2.4, life: 15, spin: (Math.random() < 0.5 ? 1 : -1) * 0.11, dps: K(m, 0.55), elem: FIRE, tag: 'wildfire' });
        say(W, f, 'wildfire');
      } },
      // A living meteor: rolls after one of you, and bursts on whoever it reaches. Lead it round.
      meteor: { who: 'far', clip: 'spit', at: 0.6, secs: 1.4, warn: 'kal_meteor', gap: 18, when: (W, f) => !(f.meteors || []).length, go(W, f, m, t, P) {
        const x = m.x + Math.sin(m.yaw) * 5, z = m.z + Math.cos(m.yaw) * 5;
        (f.meteors ||= []).push({ t: 0, on: t, mk: P.mark({ x, z, r: 2.6, fuse: 0.6, life: 16, touch: 0, elem: FIRE, tag: 'meteor' }) });
        say(W, f, 'meteor');
      } },
      // She runs the length of the ring, breathing: up and across the vent and down the far side, a line of fire behind her.
      run: { who: 'none', clip: null, warn: 'kal_run', gap: 20, when: (W, f, m) => !f.flooding && !m.flying, go(W, f, m) {
        const [cx, cz] = W2(W, CINDER.x, CINDER.z), a = Math.atan2(m.x - cx, m.z - cz), R = CINDER.r - 6;
        const bx = cx - Math.sin(a + rnd(-0.5, 0.5)) * R, bz = cz - Math.cos(a + rnd(-0.5, 0.5)) * R;
        const P = W.sim.perils, yaw = Math.atan2(bx - m.x, bz - m.z), len = Math.hypot(bx - m.x, bz - m.z);
        P.mark({ shape: 'line', x: m.x, z: m.z, yaw, r: len, w: 4, fuse: 2.2, life: 4, dmg: K(m, 0.9), dps: K(m, 0.3), elem: FIRE, tag: 'run' });
        say(W, f, 'run');
        fly(W, m, { x: m.x, z: m.z, h: 4, hold: 0.9, face: [bx, bz], then: () => fly(W, m, { x: bx, z: bz, h: 4, speed: 26, glide: true, face: () => W.sim.player, land: true, each: (k) => { if ((W.sim.tick & 7) === 0) W.sim.casting.burst(FX.FLAME, FIRE, k.x, W.sim.world.height(k.x, k.z) + 0.3, k.z, 1.4, 3.4, 0.7, { alpha: 0.8, len: 2, light: 6, lightR: 9 }); } }) });
      } },
    },
    begin(W, f, live) { underHundred(W, f, live); f.phase = 0; f.meteors = []; },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, now = sim.time, [cx, cz] = W2(W, CINDER.x, CINDER.z), floor = W.delve.y + CINDER.y;
      stepTimers(m, dt);
      talk(W, f, m);
      if (m.breathing && m.state !== 4) { m.breathing = false; m.breathHeld = false; }
      // The meteors after whoever they're for, a little slower than a run; a burst on reaching them, or at the end.
      for (const q of f.meteors) {
        q.t += dt;
        const mk = q.mk, t = q.on;
        if (mk.dead || q.gone) continue;
        if (t.dead || q.t > 15) { q.gone = true; P.mark({ x: mk.x, z: mk.z, r: 5, fuse: 0.5, dmg: K(m, 1.1), knock: 6, elem: FIRE, tag: 'meteor' }); mk.life = 0; continue; }
        const dx = t.x - mk.x, dz = t.z - mk.z, L = Math.hypot(dx, dz) || 1, v = 4.6 + q.t * 0.05;
        const nx = mk.x + dx / L * v * dt, nz = mk.z + dz / L * v * dt;
        if (caveRoom(nx, nz) > -0.5) { mk.x = nx; mk.z = nz; mk.y = sim.world.height(nx, nz); }
        if (L < 2.4) { q.gone = true; P.mark({ x: mk.x, z: mk.z, r: 5.5, fuse: 0.25, dmg: K(m, 1.3), knock: 8, elem: FIRE, tag: 'meteor' }); mk.life = 0; }
        if ((sim.tick & 3) === 0) sim.casting.burst(FX.FLAME, FIRE, mk.x, mk.y + 0.8, mk.z, 1, 2.4, 0.5, { alpha: 0.9, len: 1.5, light: 7, lightR: 8 });
      }
      f.meteors = f.meteors.filter((q) => !q.gone);
      // The floods: at two thirds and a third of her life, up over the vent while the caldera fills; the pillars the only ground.
      for (const [at, n] of [[0.66, 1], [0.33, 2]]) {
        // (Never while the flowers are open: the roar comes first, then the flood.)
        if (f.floods >= n || m.hp > m.maxHp * at || busy(m) || f.flowers) continue;
        f.floods = n; f.flooding = true; f.hold = true; f.phase = n;
        W.warn(WARN.kal_flood); say(W, f, 'flood', 0);
        const spare = (b) => b.y > floor + BASALT_UP * 0.6;
        fly(W, m, { x: cx, z: cz, h: 10, hold: 15, face: () => sim.player, each(k, dt2, a) {
          if (a.stage !== 'hold') return;
          if (!a.lava) a.lava = P.mark({ shape: 'ring', x: cx, z: cz, r: CINDER.r + 2, r0: CINDER.vent + 0.4, fuse: 3.5, life: 11, dps: K(m, 1.0), elem: FIRE, tag: 'flood', spare });
          // (And her breath down onto a pillar now and then.)
          if (a.t > 4 && (a.next = (a.next ?? 4) - dt2) <= 0) { a.next = 4.2; const t = pickOne(W.bodies()); if (t) { k.yaw = yawTo(k, t); breath(W, k, FIRE, 0.5, { r: 26, half: 0.3 }); } }
        }, then: () => {
          f.flooding = false;
          W.warn(WARN.kal_ebb); say(W, f, 'rings', 0);
          rings(W, cx, cz, 0.55, m, FIRE, n === 1 ? 3 : 4, 1.9, 7, CINDER.r + 2);
          // (After the second, she comes down hard: winded, and everything hits her twice as hard for a while.)
          const a = rnd(0, TAU), R = rnd(CINDER.vent + 9, CINDER.r - 10);
          fly(W, m, { x: cx + Math.sin(a) * R, z: cz + Math.cos(a) * R, h: 8, hold: 1, face: () => sim.player, land: true, landClip: n === 2 ? 'crash_land' : null, then: () => {
            f.hold = false;
            if (n === 2) {
              // (Down hard, sprawled and heaving: everything hits her twice as hard till she's up.)
              W.warn(WARN.kal_crash); say(W, f, 'crash', 0);
              m.shrug = 2; f.hold = true;
              P.later(7, () => { m.shrug = 1; f.hold = false; m.opts.damage *= 1.1; });
            }
          } });
        } });
        return;
      }
      // The Apocalypse Roar, at forty and at fifteen: ember flowers open about the ring, and when she roars only those in
      // a flower live through it.
      for (const [at, n] of [[0.4, 1], [0.15, 2]]) {
        if (f.roars >= n || m.hp > m.maxHp * at || busy(m) || f.flooding) continue;
        f.roars = n; f.hold = true;
        W.warn(WARN.kal_seeds); say(W, f, 'seeds', 0);
        const spots = [];
        for (let i = 0; i < 4; i++) {
          let x = cx, z = cz;
          for (let k = 0; k < 30; k++) { const a = rnd(0, TAU), r = rnd(CINDER.vent + 6, CINDER.r - 5); x = cx + Math.sin(a) * r; z = cz + Math.cos(a) * r; if (!spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 12) && caveRoom(x, z) > 3) break; }
          spots.push([x, z]);
        }
        f.flowers = spots.map(([x, z]) => P.mark({ x, z, r: 3, fuse: 11, life: 1.5, soak: true, elem: LIGHT, tag: 'flower' }));
        m.perform({ clip: 'breath_in', secs: 2, at: 0 });
        P.later(9, () => { if (!m.dead) { W.warn(WARN.kal_roar); say(W, f, 'roar', 0); m.perform({ clip: 'enrage', secs: 2.4, at: 0 }); } });
        P.later(11, () => {
          if (m.dead) return;
          const safe = (b) => (f.flowers || []).some((q) => dist(b, q.x, q.z) < q.r + 0.3);
          for (const b of W.bodies()) if (!safe(b)) P.hurt(b, K(m, 3.2), m.x, m.z, 4, false, 'roar');
          sim.casting.burst(FX.SHOCK, FIRE, m.x, m.y + 3, m.z, 6, 46, 1, { light: 40, lightR: 50 });
          f.flowers = null; f.hold = false;
        });
        return;
      }
    },
    order(W, f, b, [m]) {
      if (!m) return null;
      const [cx, cz] = W2(W, CINDER.x, CINDER.z), D = W.delve;
      // The flood: up onto the nearest pillar no one else has.
      if (f.flooding) {
        const taken = W.bodies().filter((o) => o !== b).map((o) => [o.x, o.z]);
        let best = null, bd = Infinity;
        for (const [x, z, r] of BASALT) {
          const wx = D.x + x, wz = D.z + z;
          if (taken.some(([ox, oz]) => Math.hypot(ox - wx, oz - wz) < r - 0.3) && dist(b, wx, wz) > r) continue;
          const dd = dist(b, wx, wz);
          if (dd < bd) { bd = dd; best = [wx, wz, r]; }
        }
        if (best) return bd < best[2] - 0.7 ? { still: true } : { to: [best[0], best[1]], urgent: true };
      }
      // The roar: into the nearest flower with room in it (two to a flower).
      if (f.flowers) {
        const fl = f.flowers.slice().sort((a, z) => dist(b, a.x, a.z) - dist(b, z.x, z.z));
        for (const q of fl) {
          const n = W.bodies().filter((o) => o !== b && dist(o, q.x, q.z) < q.r).length;
          if (n >= 2) continue;
          return dist(b, q.x, q.z) < q.r - 1 ? { still: true } : { to: [q.x, q.z], urgent: true };
        }
      }
      // The wildfire: behind its front if you're in its trailing edge, else on ahead of it round the ring, faster than it walks.
      for (const w of W.sim.perils.marks) {
        if (w.tag !== 'wildfire' || w.dead) continue;
        const a = Math.atan2(b.x - cx, b.z - cz), s = Math.sign(w.spin) || 1, d = wrapAngle(a - w.yaw) * s, R = clamp(dist(b, cx, cz), CINDER.vent + 3, CINDER.r - 3);
        if (d > -(w.half + 0.25) && d < 0) return { to: [cx + Math.sin(w.yaw - s * (w.half + 0.4)) * R, cz + Math.cos(w.yaw - s * (w.half + 0.4)) * R], urgent: true };
        if (d >= 0 && d < 0.8) return { to: [cx + Math.sin(a + s * 0.7) * R, cz + Math.cos(a + s * 0.7) * R], urgent: true };
      }
      // A meteor after you: keep moving round the ring, away from it.
      const q = (f.meteors || []).find((o) => o.on === b && !o.gone);
      if (q) {
        const a = Math.atan2(b.x - cx, b.z - cz), side = Math.sign(wrapAngle(Math.atan2(q.mk.x - cx, q.mk.z - cz) - a)) || 1, R = clamp(dist(b, cx, cz), CINDER.vent + 4, CINDER.r - 4);
        return { to: [cx + Math.sin(a - side * 0.5) * R, cz + Math.cos(a - side * 0.5) * R], urgent: true };
      }
      void m;
      return null;
    },
    died: (W, f) => lastWords(W, f),
    end(W, f, live) { for (const m of live) { ground(m); m.shrug = 1; } wipeWords(W, f); },
  },

  // ---- Morvekh, Who Remembers the Cold ---------------------------------------------------------------------------------------
  morvekh: {
    open: 'mor_open', pace: [5, 4, 0.3], turn: [24, 4], enrage: [600, 2.5, 'mor_enrage'],
    deck: (f) => (f.stage < 3 ? ['breath', 'grasp', 'bombs', 'breath'] : f.stage === 3 ? ['breath', 'rake', 'grasp', 'bombs', 'tail', 'deep'] : ['breath', 'rake', 'bombs', 'tail', 'deep']),
    setUp(W, m) { Object.assign(m.opts, { ground: true, radius: 3, breathRange: 22, speed: 4.5 }); },
    moves: {
      // (Never while the grave has you held to a crystal: you couldn't step out of it.)
      breath: { who: 'mark', clip: null, warn: 'mor_breath', gap: 16, when: (W, f) => !f.turn?.on && !f.zero && !f.grasp && W.sim.time > (f.calm || 0), go(W, f, m, t) {
        if (m.flying && t) m.yaw = yawTo(m, t);
        // (From his perch, a narrow cone onto the shelf, aimed at one of you: the rest of the shelf to step to.)
        breath(W, m, FROST, 0.7, m.flying ? { leave: 4, r: 24, half: 0.3 } : { leave: 6, r: 20 }); say(W, f, 'breath');
      } },
      rake: { clip: 'claw_rake', face: true, at: 0.85, secs: 1.6, when: (W, f, m) => !m.flying, go: (W, f, m, t, P) => rake(P, m, t, 0.5, FROST) },
      tail: { who: 'none', clip: 'tail_slam', at: 0.9, secs: 1.8, when: (W, f, m) => !m.flying, go: (W, f, m, t, P) => tail(P, m, 0.65, FROST) },
      // The Grasp of the Grave: for a few seconds chains drag everyone toward the nearest edge, but those holding to rime.
      grasp: { who: 'none', clip: null, warn: 'mor_grasp', gap: 12, when: (W, f, m) => !f.grasp && !f.zero && !m.breathing && !((m.aimLock || 0) > W.sim.time) && !W.sim.perils.marks.some((q) => q.tag === 'breath' || q.tag === 'frozen') && W.sim.time > (f.calm || 0), go(W, f, m) {
        if (m.flying) airMove(m, 'roar', 2); else if (!m.perform({ clip: 'roar', secs: 1.6 })) return false;
        f.grasp = { at: W.sim.time + 2.2, until: W.sim.time + 7 };
        say(W, f, 'grasp');
      } },
      // Frost bombs: one after another onto where you stand, each a moment's shadow first.
      bombs: { who: 'none', clip: null, warn: 'mor_bombs', gap: 14, when: (W, f) => W.sim.time > (f.calm || 0), go(W, f, m, t, P) {
        if (m.flying) airMove(m, 'spit', 1.4); else if (!m.perform({ clip: 'spit', secs: 1.4 })) return false;
        W.bodies().forEach((b, i) => P.later(i * 0.7, () => { if (!m.dead && !b.dead) P.mark({ x: b.x, z: b.z, r: 3, fuse: 2.3, follow: b, lock: 0.4, dmg: K(m, 0.65), knock: 3, elem: FROST, tag: 'bomb' }); }));
        say(W, f, 'bombs');
      } },
      // Deep breath (on the summit): a white line drawn across the whole of it.
      deep: { who: 'mark', clip: 'breath_sweep', at: 0.4, secs: 2.4, warn: 'mor_deep', gap: 18, go(W, f, m, t, P) {
        const [cx, cz] = W2(W, RIME.x, RIME.z), yaw = Math.atan2(t.x - cx, t.z - cz) + Math.PI / 2;
        P.mark({ shape: 'line', x: cx - Math.sin(yaw) * 16, z: cz - Math.cos(yaw) * 16, yaw, r: 32, w: 4.5, fuse: 2.4, life: 5, dmg: K(m, 1.4), dps: K(m, 0.4), elem: FROST, from: m, tag: 'deep' });
        say(W, f, 'deep');
      } },
    },
    // Stages: 0..2 he hangs off the spire beside the First, Second and Last Shelf, the mist on the shelves below; 3 he's
    // down on the summit; 4 Absolute Zero; 5 fallen, to the end.
    begin(W, f, live) { underHundred(W, f, live); const [m] = live; f.stage = 0; f.mists = []; if (m) perch(W, f, m, 1); },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, now = sim.time;
      stepTimers(m, dt);
      talk(W, f, m);
      if (m.breathing && m.state !== 4) { m.breathing = false; m.breathHeld = false; }
      // The Grasp: drag toward the nearest edge, but those within reach of a rime crystal.
      const g = f.grasp;
      if (g) {
        if (now > g.until) f.grasp = null;
        else if (now > g.at) {
          const rime = W.delve.props.filter((q) => q.kind === 'rime').map((q) => W2(W, q.x, q.z));
          for (const b of W.bodies()) {
            if (b.leaping || rime.some(([x, z]) => dist(b, x, z) < 3.4)) continue;
            // (Toward the edge: down the field's slope, the way out of the island.)
            const e = 0.4, gx = caveRoom(b.x + e, b.z) - caveRoom(b.x - e, b.z), gz = caveRoom(b.x, b.z + e) - caveRoom(b.x, b.z - e), L = Math.hypot(gx, gz) || 1;
            const nx = b.x - gx / L * 2.6 * dt, nz = b.z - gz / L * 2.6 * dt;
            if (caveRoom(nx, nz) < 0.9) { blowOff(W, b, -gx, -gz, 6); continue; }
            b.x = nx; b.z = nz;
            if ((sim.tick & 15) === 0) sim.casting.burst(FX.PUFF, FROST, b.x, b.y + 0.4, b.z, 0.4, 1.6, 0.5, { alpha: 0.6 });
          }
        }
      }
      // Up the spire: at eighty, sixty; down onto the summit at forty.
      const climb = [[0.8, 1, 2], [0.6, 2, 3], [0.4, 3, 'summit']];
      for (const [at, st, to] of climb) {
        if (f.stage >= st || m.hp > m.maxHp * at || (busy(m) && !m.flightA)) continue;
        if (m.flightA && m.flightA.stage !== 'hold') continue;
        f.stage = st; f.calm = sim.time + 10;
        W.warn(WARN.mor_climb); say(W, f, 'climb', 0);
        // (The mist takes the shelf he's leaving, and the ramp up to it.)
        P.later(12, () => { if (!m.dead) { W.warn(WARN.mor_mist); mist(W, f, m, st); } });
        if (to === 'summit') {
          const [cx, cz] = W2(W, RIME.x, RIME.z);
          fly(W, m, { x: cx, z: cz + 2, h: 12, hold: 1.5, face: () => sim.player, land: true, then: () => { f.hold = false; } });
          f.hold = true;
        } else perch(W, f, m, to);
        if (st === 1 || st === 3) { W.warn(WARN.mor_whelps); spawnWhelps(W, f, m, st); }
        return;
      }
      // Absolute Zero at a quarter: up off the summit to hang from the spire; a grip in each claw islet to break.
      if (f.stage === 3 && m.hp < m.maxHp * 0.25 && !busy(m)) {
        f.stage = 4; f.hold = true;
        W.warn(WARN.mor_zero); say(W, f, 'zero', 0);
        const [cx, cz] = W2(W, RIME.x, RIME.z);
        mist(W, f, m, 4);
        f.zero = { until: now + 45, grips: RIME_ISLES.map((s) => { const [x, z] = W2(W, s.at[0], s.at[1]); return { s, x, z, held: 0, done: false, mk: P.mark({ x, z, r: 3.2, fuse: 46, soak: true, elem: FROST, tag: 'grip' }) }; }) };
        m.shrug = 0.15;
        fly(W, m, { x: cx + 6, z: cz, h: 18, hold: Infinity, face: () => sim.player });
        return;
      }
      const z = f.zero;
      if (z) {
        for (const q of z.grips) {
          if (q.done) continue;
          const on = W.bodies().some((b) => dist(b, q.x, q.z) < 3.4 && !b.leaping);
          q.held = on ? q.held + dt : Math.max(0, q.held - dt * 0.5);
          if (q.held > 4) {
            q.done = true; q.mk.life = 0; q.mk.dead = true;
            W.warn(WARN.mor_grip); say(W, f, 'grip', 3);
            m.hp -= m.maxHp * 0.03;
            sim.casting.burst(FX.SHOCK, FROST, q.x, sim.world.height(q.x, q.z) + 1, q.z, 2, 8, 0.6, { light: 10, lightR: 12 });
          }
        }
        const left = z.grips.filter((q) => !q.done).length;
        if (!left || now > z.until) {
          // (Not broken in time: the cold reaches nothing, and everyone with it.)
          if (left) for (const b of W.bodies()) P.hurt(b, K(m, 2.4 + left), m.x, m.z, 0, false, 'zero');
          f.zero = null; f.stage = 5; m.shrug = left ? 1 : 2.2;
          for (const q of f.mists) if (q.stage === 4) q.mk.life = 0;
          W.warn(WARN.mor_fall); say(W, f, 'death', 99);
          const [cx, cz] = W2(W, RIME.x, RIME.z);
          fly(W, m, { x: cx, z: cz, h: 8, hold: 0.2, speed: 30, face: () => sim.player, land: true, landClip: 'crash_land', then: () => {
            P.later(9, () => { m.shrug = 1; f.hold = false; m.opts.damage *= 1.1; });
          } });
        }
      }
    },
    // A fall comes down where he's fighting: the shelf he's beside, or the summit.
    fallTo(W, f, b) {
      void b;
      if (f.stage >= 3) { const [x, z] = W2(W, RIME.x, RIME.z); return [x - 4, z + 4]; }
      const l = RIME_LEDGES[Math.min(3, f.stage + 1)];
      return W2(W, l.at[0], l.at[1]);
    },
    order(W, f, b, [m]) {
      if (!m) return null;
      // The grasp: to the nearest rime crystal, and hold to it.
      if (f.grasp) {
        const rime = W.delve.props.filter((q) => q.kind === 'rime' && !q.claw).map((q) => W2(W, q.x, q.z)).sort((a, z) => dist(b, ...a) - dist(b, ...z))[0];
        if (rime && dist(b, ...rime) < 22) return dist(b, ...rime) < 2.6 ? { still: true } : { to: rime, urgent: true };
      }
      // Absolute Zero: one or two to each grip still holding.
      if (f.zero) {
        const open = f.zero.grips.filter((q) => !q.done);
        if (open.length) {
          const all = W.bodies(), i = all.indexOf(b), q = open[i % open.length];
          return dist(b, q.x, q.z) < 2.2 ? { still: true } : { to: [q.x, q.z], urgent: true };
        }
      }
      // The climb: up to the shelf he's beside (or the summit), ahead of the mist, by way of the ramp.
      if (f.stage < 3) {
        const k = Math.min(3, f.stage + 1), l = RIME_LEDGES[k], [x, z] = W2(W, l.at[0], l.at[1]);
        if (dist(b, x, z) > 6) return { to: climbTo(W, b, k), urgent: f.stage > 0 };
      } else {
        const [x, z] = W2(W, RIME.x, RIME.z);
        if (dist(b, x, z) > 11) return { to: climbTo(W, b, 4), urgent: true };
      }
      return null;
    },
    died: (W, f) => lastWords(W, f),
    end(W, f, live) { for (const m of live) { ground(m); m.shrug = 1; } wipeWords(W, f); },
  },

  // ---- Nihvaroth, the Hollow Star ---------------------------------------------------------------------------------------------
  nihvaroth: {
    open: 'nih_open', pace: [5, 4, 0.3], turn: [24, 4], enrage: [660, 2.5, 'nih_enrage'],
    deck: (f) => (f.phase === 0 ? ['devour', 'float', 'spheres', 'breath', 'rake', 'tail'] : ['devour', 'float', 'spheres', 'breath', 'rake', 'tail', 'devour']),
    setUp(W, m) { Object.assign(m.opts, { ground: true, radius: 3.8, breathRange: 22, speed: 4.5 }); },
    moves: {
      breath: { who: 'none', clip: null, when: (W, f) => !f.turn?.on && !f.devour, go(W, f, m) { breath(W, m, VOID, 0.6, { leave: 4 }); } },
      rake: { clip: 'claw_rake', face: true, at: 0.85, secs: 1.6, go: (W, f, m, t, P) => rake(P, m, t, 0.55, VOID) },
      tail: { who: 'none', clip: 'tail_whip', at: 0.7, secs: 1.4, go: (W, f, m, t, P) => tail(P, m, 0.65, VOID) },
      // Devour: everything pulled toward the Maw over the Lip's north edge, but those in a star well.
      devour: { who: 'none', clip: null, warn: 'nih_devour', gap: 10, when: (W, f) => !f.devour && !f.swallow && !f.spheres?.length, go(W, f, m) {
        if (!m.perform({ clip: 'breath_in', secs: 1.6, at: 0 })) return false;
        devour(W, f, m, f.last ? 9999 : 7);
        say(W, f, 'devour');
      } },
      // One of you floats up toward the Maw: whoever stands under them pulls them down. Nobody under them, and they're taken.
      float: { who: 'none', clip: 'roar', secs: 1.4, warn: 'nih_float', gap: 14, when: (W, f) => !f.floater && !f.devour, go(W, f, m, t, P) {
        const who = loose(W);
        if (!who.length) return;
        const b = pickOne(who);
        f.floater = { b, mk: P.mark({ x: b.x, z: b.z, r: 3.2, fuse: 6.5, follow: b, lock: 0.25, soak: true, elem: VOID, tag: 'float', then: (q, P2, inside) => {
          f.floater = null;
          const helpers = inside.filter((o) => o !== b).length;
          if (helpers) { for (const o of inside) P.hurt(o, K(m, 0.3), q.x, q.z, 0, false, 'float'); return; }
          P.hurt(b, K(m, 1.6), q.x, q.z, 0, false, 'float');
          if (!b.dead) blowOff(W, b, MAW_X(W) - b.x, MAW_Z(W) - b.z, 8);
        } }) };
        say(W, f, 'float');
      } },
      // Void spheres: where they land, stand in them to drain them, the more of you the less each takes. Unsoaked, they burst on everyone.
      spheres: { who: 'none', clip: 'spit', at: 0.5, secs: 1.4, warn: 'nih_spheres', gap: 14, when: (W, f) => !f.spheres?.length && !f.devour, go(W, f, m, t, P) {
        const [cx, cz] = W2(W, MAW.x, MAW.z), n = f.phase === 0 ? 2 : 3;
        f.spheres = [];
        for (let i = 0; i < n; i++) {
          let x = cx, z = cz;
          // (A few strides off one of you, so there's time to reach it: not on top of the other, nor under it.)
          const near = loose(W), o = near.length ? near[(i * 2 + (Math.random() * near.length | 0)) % near.length] : W.sim.player;
          for (let k = 0; k < 40; k++) {
            const a = rnd(0, TAU), r = k < 30 ? rnd(5, 11) : rnd(6, MAW.r - 8), ox = k < 30 ? o.x : cx, oz = k < 30 ? o.z : cz;
            x = ox + Math.sin(a) * r; z = oz + Math.cos(a) * r;
            if (caveRoom(x, z) > 3 && Math.hypot(x - cx, z - cz) < MAW.r - 5 && !f.spheres.some((q) => Math.hypot(q.x - x, q.z - z) < 9) && Math.hypot(m.x - x, m.z - z) > 8) break;
          }
          f.spheres.push(P.mark({ x, z, r: 2.8, fuse: 7.5, soak: true, elem: VOID, tag: 'sphere', then: (q, P2, inside) => {
            f.spheres = (f.spheres || []).filter((o) => o !== q);
            if (inside.length) { for (const o of inside) P.hurt(o, K(m, 1.2) / inside.length, q.x, q.z, 0, false, 'sphere'); return; }
            for (const o of W.bodies()) P.hurt(o, K(m, 0.6), q.x, q.z, 0, false, 'sphere');
          } }));
        }
        say(W, f, 'spheres');
      } },
    },
    begin(W, f, live) { underHundred(W, f, live); f.phase = 0; f.stars = STARS.n; f.spheres = []; },
    step(W, f, [m], dt) {
      if (!m) return;
      const sim = W.sim, P = sim.perils, now = sim.time, [cx, cz] = W2(W, MAW.x, MAW.z);
      stepTimers(m, dt);
      talk(W, f, m);
      if (m.breathing && m.state !== 4) { m.breathing = false; m.breathHeld = false; }
      // The stars go round over the Lip; while a Devour's on, a well under each that's still burning.
      f.spin = (f.spin || 0) + STARS.spin * dt;
      const d = f.devour;
      // (Each star a light hung high over the Lip, a beam down from it to its well while a Devour's on: what to run under.)
      if ((sim.tick % 6) === 0) for (let i = 0; i < f.stars; i++) {
        const a = f.spin + i / f.stars * TAU, x = cx + Math.sin(a) * starR(f), z = cz + Math.cos(a) * starR(f), y = sim.world.height(x, z);
        sim.casting.burst(FX.ORB, LIGHT, x, y + 16, z, 1.3, 1.5, 0.09, { light: i % 2 ? 0 : 7, lightR: 16 });
        if (d && sim.time > d.at - 1.6) sim.casting.burst(FX.BEAM, LIGHT, x, y + 16, z, 0.25, 0.3, 0.09, { ax: 0, ay: -1, az: 0, len: 16, alpha: 0.55 });
      }
      if (d) {
        for (let i = 0; i < d.wells.length; i++) { const mk = d.wells[i], a = f.spin + i / f.stars * TAU; mk.x = cx + Math.sin(a) * starR(f); mk.z = cz + Math.cos(a) * starR(f); mk.y = sim.world.height(mk.x, mk.z); }
        if (now > d.until) { f.devour = null; for (const mk of d.wells) mk.life = 0; }
        else if (now > d.at) {
          const dir = [MAW_X(W) - cx, MAW_Z(W) - cz], L = Math.hypot(dir[0], dir[1]) || 1;
          for (const b of W.bodies()) {
            if (b.leaping || d.wells.some((mk) => dist(b, mk.x, mk.z) < mk.r)) continue;
            const pull = (3.1 + (f.last ? 0.6 : 0)) * dt, nx = b.x + dir[0] / L * pull, nz = b.z + dir[1] / L * pull;
            if (caveRoom(nx, nz) < 1.0) { blowOff(W, b, dir[0], dir[1], 9); continue; }
            b.x = nx; b.z = nz;
            if ((sim.tick & 15) === 0) sim.casting.burst(FX.PUFF, VOID, b.x, b.y + 0.6, b.z, 0.4, 2, 0.5, { alpha: 0.6 });
          }
        }
      }
      // The Swallow at sixty: the Lip goes dark, you're thrown out onto its two hands, an echo of a god on each.
      if (f.phase === 0 && m.hp < m.maxHp * 0.6 && !busy(m) && !f.devour) {
        f.phase = 1; f.hold = true;
        swallow(W, f, m);
        return;
      }
      if (f.swallow) { stepSwallow(W, f, m, dt); return; }
      // Below thirty: the stars go out one at a time, and the ring closes in; at the last, a Devour that doesn't end.
      if (f.phase === 2) {
        if (m.hp < m.maxHp * 0.3 && !f.ringOn) {
          f.ringOn = true; W.warn(WARN.nih_ring); say(W, f, 'ring', 0);
          f.ring = P.mark({ shape: 'ring', x: cx, z: cz, r: MAW.r + 2, r0: MAW.r - 4, fuse: 3, life: 9999, dps: K(m, 0.7), elem: VOID, tag: 'ring' });
        }
        if (f.ringOn && f.ring && f.ring.r0 > 21) { f.ring.r0 = Math.max(21, f.ring.r0 - 0.16 * dt); if ((sim.tick & 127) === 0) W.warn(WARN.nih_ring, 25); }
        if (f.ringOn && W.every(f, 'nova', 26) && f.stars > 3) { f.stars--; W.warn(WARN.nih_nova); say(W, f, 'nova'); sim.casting.burst(FX.SHOCK, LIGHT, cx, m.y + 12, cz, 6, 30, 1, { light: 30, lightR: 60 }); for (const b of W.bodies()) P.hurt(b, K(m, 0.35), cx, cz, 0, false, 'nova'); }
        if (m.hp < m.maxHp * 0.08 && !f.last) { f.last = true; f.hold = true; W.warn(WARN.nih_last); devour(W, f, m, 9999); }
      }
    },
    fallTo(W, f, b) {
      if (f.swallow) { const h = f.swallow.hands[f.swallow.at]; return W2(W, h.s.at[0], h.s.at[1]); }
      const [cx, cz] = W2(W, MAW.x, MAW.z);
      return [cx, cz + MAW.r * 0.5];
    },
    // While the Swallow's on, the echo on each hand's the one to hit.
    focus(W, f) { return f.swallow ? null : null; },
    // (While the Lip is dark, the gust stones between it and its hands are still: the Swallow throws you; you don't walk back.)
    gust: (W, f) => !f.swallow || f.swallow.back,
    order(W, f, b, [m]) {
      if (!m) return null;
      const [cx, cz] = W2(W, MAW.x, MAW.z);
      // A devour: into the nearest star well.
      if (f.devour) {
        const w = f.devour.wells.slice().sort((a, z) => dist(b, a.x, a.z) - dist(b, z.x, z.z))[0];
        if (w) return dist(b, w.x, w.z) < w.r - 0.8 ? { to: [w.x, w.z] } : { to: [w.x, w.z], urgent: true };
      }
      // Floating: stay put. Under someone floating: in under them (one or two of you).
      const fl = f.floater;
      if (fl && !fl.mk.landed) {
        if (fl.b === b) return { still: true };
        const near = loose(W).filter((o) => o !== fl.b).sort((a, z) => dist(a, fl.mk.x, fl.mk.z) - dist(z, fl.mk.x, fl.mk.z)).slice(0, 2);
        if (near.includes(b)) return dist(b, fl.mk.x, fl.mk.z) < 2 ? { still: true } : { to: [fl.mk.x, fl.mk.z], urgent: true };
      }
      // The spheres: one or two of you into each, those who can bear it. (Low, you're let off, if there are enough without you.)
      if (f.spheres?.length) {
        const free = loose(W), able = free.filter((o) => o.hp > o.maxHp * 0.45), all = able.length >= f.spheres.length ? able : free, i = all.indexOf(b);
        if (i >= 0) { const q = f.spheres[i % f.spheres.length]; if (q && !q.landed) return dist(b, q.x, q.z) < 1.8 ? { still: true } : { to: [q.x, q.z], urgent: true }; }
      }
      // The Swallow: onto the hand's star core when there is one, ahead of what's eating it, and in from its edges. (Never back
      // to the Lip by its gust stone: gust below.)
      const s = f.swallow;
      if (s) {
        if (s.back || s.moving) return null;
        const hand = s.hands[s.at], [hx, hz] = W2(W, hand.s.at[0], hand.s.at[1]);
        if (hand.core && !hand.core.landed && !hand.core.dead && b.role !== 'tank') return dist(b, hand.core.x, hand.core.z) < 1.6 ? { still: true } : { to: [hand.core.x, hand.core.z], urgent: true };
        if (hand.cosmos && !hand.cosmos.dead) return { to: [hx - Math.sin(hand.cosmosYaw) * 5, hz - Math.cos(hand.cosmosYaw) * 5], urgent: true };
        if (dist(b, hx, hz) > hand.s.r - 2.5) return { to: [hx + (b.x - hx) * 0.4, hz + (b.z - hz) * 0.4] };
      }
      void cx; void cz;
      return null;
    },
    died: (W, f) => lastWords(W, f),
    end(W, f, live) { for (const m of live) { ground(m); m.shrug = 1; } for (const a of W.adds()) a.hp = 0; wipeWords(W, f); },
  },
};

// ---- Thyrraxis's pieces ---------------------------------------------------------------------------------------------------
// Down onto an islet: the one with the most of you on it the first time, after that another (with a strafe of lightning
// down its length before he lands). He fights there till it's time to move on (f.hopAt).
function isletHop(W, f, m, first) {
  const sim = W.sim, P = sim.perils, [cx, cz] = W2(W, GALE.x, GALE.z);
  const isles = GALE_ISLES.map((s) => { const [x, z] = W2(W, s.at[0], s.at[1]); return { s, x, z, n: W.bodies().filter((b) => dist(b, x, z) < s.r + 2).length }; });
  const to = (first ? isles : isles.filter((q) => q.s !== f.isle)).sort((a, b) => b.n - a.n || Math.random() - 0.5)[0];
  if (!first) {
    W.warn(WARN.thy_strafe);
    const yaw = Math.atan2(to.x - m.x, to.z - m.z), L = to.s.r + 3;
    P.mark({ shape: 'line', x: to.x - Math.sin(yaw) * L, z: to.z - Math.cos(yaw) * L, yaw, r: L * 2, w: 2.4, fuse: 2.8, dmg: K(m, 0.9), knock: 5, elem: STORM, tag: 'strafe' });
  }
  f.isle = null; f.hold = true;
  // (Down on its disc side, a little in from its middle: room round him for the party.)
  const L = Math.hypot(cx - to.x, cz - to.z) || 1, lx = to.x + (cx - to.x) / L * 2.5, lz = to.z + (cz - to.z) / L * 2.5;
  fly(W, m, { x: lx, z: lz, h: 9, speed: 24, glide: true, hold: first ? 0.4 : 1.4, face: () => sim.player, land: true, then: () => {
    f.isle = to.s; f.phase = 2; f.hold = false; f.hopAt = sim.time + rnd(21, 25);
    W.warn(WARN.thy_lands, 12);
  } });
}

// ---- Morvekh's pieces ---------------------------------------------------------------------------------------------------------
// Hung off the spire beside shelf n: out past its edge, at its height, turned to whoever's on it.
function perch(W, f, m, n) {
  const l = RIME_LEDGES[n], [cx, cz] = W2(W, RIME.x, RIME.z), [lx, lz] = W2(W, l.at[0], l.at[1]);
  // (Close in off the shelf's edge and low, his chest over it: what has a blade can reach him from the shelf.)
  const dx = lx - cx, dz = lz - cz, L = Math.hypot(dx, dz) || 1, x = lx + dx / L * 8.5, z = lz + dz / L * 8.5;
  f.hold = true;
  fly(W, m, { x, z, h: 2.2, hold: 1.2, face: () => [lx, lz], then: () => { f.hold = false; fly(W, m, { x, z, h: 2.2, hold: Infinity, deck: true, face: () => W.sim.player }); } });
}
// Up (or down) the Rimespire's ramp toward shelf k (4: the summit), a stride of the ramp at a time: straight at it would
// walk into the spire. For the summit, round to the Last Shelf and then in over its bridge. (On the summit, a claw islet or
// anywhere off the ramp: straight there, the gust stones doing the rest.)
function climbTo(W, b, k) {
  const [cx, cz] = W2(W, RIME.x, RIME.z), r = Math.hypot(b.x - cx, b.z - cz);
  const end = k >= 4 ? [cx, cz] : W2(W, RIME_LEDGES[k].at[0], RIME_LEDGES[k].at[1]);
  if (r < 13 || r > 34) return end;
  let ab = Math.atan2(b.x - cx, -(b.z - cz)) * 180 / Math.PI;
  if (ab < 0) ab += 360;
  if (ab < 110 || ab > 340) return end;
  const dA = RIME_LEDGES[Math.min(3, k)].a - ab;
  if (Math.abs(dA) < 9) return end;
  const g = (ab + Math.sign(dA) * Math.min(Math.abs(dA), 16)) * Math.PI / 180;
  return [cx + Math.sin(g) * RIME.ring, cz - Math.cos(g) * RIME.ring];
}
// The freezing mist over the shelves he's left (stage n: the shelves below shelf n, and the ramps between them; 4: the summit).
function mist(W, f, m, n) {
  const P = W.sim.perils, D = W.delve;
  const spots = [];
  if (n === 4) spots.push([RIME.x, RIME.z, 12.5]);
  else {
    // (Each shelf once: the Foot and the First the first time, then the one he's just left.)
    for (let i = f.mistTop ?? 0; i <= n; i++) spots.push([RIME_LEDGES[i].at[0], RIME_LEDGES[i].at[1], 8]);
    f.mistTop = n + 1;
    // (The ramp up to it from the shelf below: circles along its arc.)
    const a0 = RIME_LEDGES[n - 1].a, a1 = RIME_LEDGES[n].a;
    for (let g = a0 + 12; g < a1 - 10; g += 9) spots.push([RIME.x + Math.sin(g * Math.PI / 180) * RIME.ring, RIME.z - Math.cos(g * Math.PI / 180) * RIME.ring, 3.6]);
  }
  for (const [x, z, r] of spots) f.mists.push({ stage: n, mk: P.mark({ x: D.x + x, z: D.z + z, r, fuse: 4, life: n === 4 ? 9999 : 9999, dps: K(m, 0.55), elem: FROST, tag: 'mist' }) });
}
function spawnWhelps(W, f, m, st) {
  const l = st >= 3 ? { at: [RIME.x, RIME.z] } : RIME_LEDGES[Math.min(3, st + 1)];
  const at = W2(W, l.at[0], l.at[1]);
  W.spawnAdds(`mor_whelps_${st}`, ['dragonling_undead'], at, 3, (k) => { k.hp = k.maxHp = 7000; k.opts.damage = 90; k.opts.name = 'RIME WHELP'; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; }, ['Bone-white'], true);
  void f; void m;
}

// ---- Nihvaroth's pieces --------------------------------------------------------------------------------------------------------
// Where the Maw is from the Lip: far out past its north edge.
const MAW_X = (W) => W.delve.x + MAW.x + 0.12 * 200;
const MAW_Z = (W) => W.delve.z + MAW.z - 200;
// How far out the stars go round: drawn in ahead of the accretion ring as it closes, their wells never in its fire.
const starR = (f) => (f.ring ? Math.min(STARS.r, f.ring.r0 - 5) : STARS.r);
function devour(W, f, m, secs) {
  const sim = W.sim, P = sim.perils, [cx, cz] = W2(W, MAW.x, MAW.z);
  const wells = [];
  for (let i = 0; i < f.stars; i++) { const a = (f.spin || 0) + i / f.stars * TAU; wells.push(P.mark({ x: cx + Math.sin(a) * starR(f), z: cz + Math.cos(a) * starR(f), r: 3.4, fuse: 1.6, life: secs + 1, soak: true, elem: LIGHT, tag: 'well' })); }
  f.devour = { at: sim.time + 1.6, until: sim.time + 1.6 + secs, wells };
}
// The Swallow: the Lip dark, and all of you thrown out onto its left hand, where an echo of a god it ate stands, shielded
// but while someone stands on the hand's star core. Some while after you came down, what eats the hand comes in from its
// outer side. The echo down (or the time gone), you're flung across to the right hand and its echo; after that one, back to
// the Lip, and if you broke both in time, it's stunned by the cores you carried.
function swallow(W, f, m) {
  const sim = W.sim, P = sim.perils, [cx, cz] = W2(W, MAW.x, MAW.z);
  W.warn(WARN.nih_swallow); say(W, f, 'swallow', 0);
  // (What was on the Lip goes with it: nobody's left there to soak a sphere or pull down a floater.)
  for (const q of f.spheres || []) q.dead = true;
  f.spheres = [];
  if (f.floater) { f.floater.mk.dead = true; f.floater = null; }
  if (f.devour) { for (const mk of f.devour.wells) mk.life = 0; f.devour = null; }
  m.perform({ clip: 'enrage', secs: 2.4, at: 1.8, fn: () => {
    sim.casting.burst(FX.SHOCK, VOID, cx, m.y + 2, cz, 6, 46, 1, { light: 30, lightR: 60 });
    const s = f.swallow = { t: 0, at: 0, handT: 0, moving: true, back: false, failed: false, dark: P.mark({ x: cx, z: cz, r: MAW.r + 2, fuse: 3.5, life: 9999, dps: K(m, 0.7), elem: VOID, tag: 'dark' }), hands: MAW_ISLES.map((q) => ({ s: q, echo: null, core: null, cosmos: null, cosmosYaw: 0 })) };
    fling(W, f, m, 0, 0.3);
    // (It hangs out over the Maw meanwhile, out of reach.)
    m.shrug = 0.05;
    fly(W, m, { x: cx + 6, z: cz - MAW.r - 10, h: 12, hold: Infinity, face: () => sim.player });
    void s;
  } });
}
// Everyone thrown onto hand n, and its echo up as they land.
function fling(W, f, m, n, k) {
  const s = f.swallow, P = W.sim.perils, h = s.hands[n], [x, z] = W2(W, h.s.at[0], h.s.at[1]);
  s.moving = true;
  W.bodies().forEach((b) => throwTo(W, m, b, x + rnd(-3.5, 3.5), z + rnd(-3.5, 3.5), k, n ? 14 : 10));
  P.later(3, () => {
    s.at = n; s.handT = 0; s.moving = false;
    if (m.dead) return;
    W.warn(WARN.nih_echo); say(W, f, 'echoes', 0);
    echo(W, f, m, h, n === 0 ? 'ed_echo_green' : 'ed_echo_red');
  });
}
function echo(W, f, m, h, model) {
  const [x, z] = W2(W, h.s.at[0], h.s.at[1]);
  h.model = model;
  W.spawnAdds(`nih_echo_${model}`, [model], [x, z], 1, (k) => { k.hp = k.maxHp = 11000; k.opts.damage = 160; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; k.opts.ground = true; k.shrug = 0.08; k.echoOf = h; h.echo = k; }, ['Base'], false);
}
function stepSwallow(W, f, m, dt) {
  const sim = W.sim, P = sim.perils, s = f.swallow;
  s.t += dt;
  if (s.moving || s.back) return;
  s.handT += dt;
  const h = s.hands[s.at], k = h.echo, [x, z] = W2(W, h.s.at[0], h.s.at[1]);
  if (!k) return;
  // A star core on the hand every so often: while it's being stood on, the echo has no shield.
  if (!k.dead && (!h.core || h.core.dead) && (h.coreT = (h.coreT ?? 4) - dt) <= 0) {
    h.coreT = 16;
    const a = rnd(0, TAU);
    h.core = P.mark({ x: x + Math.sin(a) * 4, z: z + Math.cos(a) * 4, r: 2.2, fuse: 5, life: 0.5, soak: true, elem: LIGHT, tag: 'core', then: (q, P2, inside) => {
      if (!inside.length || k.dead) return;
      k.shrug = 1; h.broke = (h.broke || 0) + 1;
      sim.casting.burst(FX.SHOCK, LIGHT, k.x, k.y + 2, k.z, 2, 8, 0.6, { light: 12, lightR: 14 });
      P.later(11, () => { if (!k.dead) k.shrug = 0.08; });
    } });
  }
  // Devouring Cosmos: from the hand's outer side, eating in across it.
  if (!h.cosmos && s.handT > 24) {
    W.warn(WARN.nih_cosmos, 20); say(W, f, 'cosmos', 10);
    const [cx, cz] = W2(W, MAW.x, MAW.z), out = Math.atan2(x - cx, z - cz);
    h.cosmosYaw = out;
    const sx = x + Math.sin(out) * (h.s.r + 2), sz = z + Math.cos(out) * (h.s.r + 2), py = out + Math.PI / 2;
    h.cosmos = P.mark({ shape: 'line', x: sx - Math.sin(py) * 12, z: sz - Math.cos(py) * 12, yaw: py, r: 24, w: 6, fuse: 2.5, life: 26, vx: -Math.sin(out) * 0.55, vz: -Math.cos(out) * 0.55, dps: K(m, 0.8), elem: VOID, tag: 'cosmos' });
  }
  // This echo down, or the hand all but eaten: on to the other hand, or back to the Lip.
  if (!k.dead && s.handT < 46) return;
  if (!k.dead) { s.failed = true; k.hp = 0; }
  if (h.cosmos) h.cosmos.life = 0;
  if (h.core && !h.core.landed) h.core.dead = true;
  if (s.at === 0) { W.warn(WARN.nih_fling); fling(W, f, m, 1, 0.15); return; }
  s.back = true;
  W.warn(WARN.nih_back);
  s.dark.life = 0;
  const [cx, cz] = W2(W, MAW.x, MAW.z);
  // (Thrown back onto the Lip, and it comes down: stunned by the cores you carried, if both echoes broke in time.)
  W.bodies().forEach((b) => throwTo(W, m, b, cx + rnd(-8, 8), cz + MAW.r * 0.45 + rnd(-4, 4), 0, 14));
  fly(W, m, { x: cx, z: cz - 14, h: 10, hold: 0.5, face: () => sim.player, land: true, then: () => {
    f.swallow = null; f.phase = 2; m.shrug = 1;
    if (!s.failed) {
      W.warn(WARN.nih_stunned); say(W, f, 'stunned', 0);
      m.shrug = 1.8; force(m, { clip: 'stagger_loop', secs: 10, at: 0 });
      P.later(10, () => { m.shrug = 1; f.hold = false; });
    } else f.hold = false;
  } });
}
void islandOf; void roomOf; void toWorld; void ARCANE; void DRAIN;
