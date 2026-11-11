// The town's own thread: everyone's day (src/folk/brain.js), what they say (src/folk/talk.js), and their poses, written
// into the folk buffer (src/folk/layout.js) for the renderer to skin. It runs a frame for each of the screen's, when they ask
// (TownClient.pace), or else at 60 a second at its own pace; the fight's thread never waits on it, and it never waits on the fight.
//
// main -> here:  { type: 'boot', buffer, base, lean }   then the inbox (FIN) every frame, and
//                { type: 'talk', i }  the player's opened (or, i = -1, shut) a word with someone
//                { type: 'flags', flags: [...] }  what's happened that the town knows of (quests, the player's arrival)
//                { type: 'name', name }  what the player's called
// here -> main:  { type: 'ready', count }, { type: 'events', list: [...] } (say, scene, door, stall, trade),
//                and without shared memory { type: 'slot', slot, bodies } every tick.
import { parseGLB } from '../core/glb.js';
import { FolkClips, FolkRig, SKIRT_JOINTS } from './rig.js';
import { Ground } from './ground.js';
import { Town } from './town.js';
import { Life, ACT } from './brain.js';
import { Talk } from './talk.js';
import { PEOPLE } from './people.js';
import { LINES as LA } from './lines/town_a.js';
import { LINES as LB } from './lines/town_b.js';
import { LINES as LC } from './lines/town_c.js';
import { SCENES, SMALLTALK } from './lines/scenes.js';
import { F, F_PALETTE, FCTRL, FIN, FOLK_BYTES, FOLK_MAX, FOLK_STRIDE, SH, SLOT_HEAD, freeSlot, mapFolk, publish } from './layout.js';
import { carryFrame, carryPalette, carryPoint } from '../core/carry.js';
import { quatMul, quatRotate } from '../core/math.js';
import { forgeSpot } from './brain.js';
import { SMITH_CLIPS, gripOf, hammerAtRest, writeDQ } from './smithy.js';

const HZ = 60;
// Seconds between full poses: for someone drawn (body or shadow) within near metres of the eye (every frame), within mid, and past
// it; and for someone not drawn at all. Between poses the last one is carried along with them (src/core/carry.js), so nobody
// stands still and then jumps: only a far body's limbs are a beat behind. A phone poses less.
const POSE_GAP = { near: 40, mid: 80, midGap: 1 / 72, farGap: 1 / 40, hidden: 1 / 6 };
const POSE_GAP_LEAN = { near: 24, mid: 50, midGap: 1 / 36, farGap: 1 / 20, hidden: 1 / 4 };
// The world the town's laid out in: the village, the fields and woods round it, the old church ground.
const BOUNDS = [-80, -75, 110, 80];

let life = null, talk = null, map = null, shared = false, gaps = POSE_GAP;
const beds = [], bedIndex = new Map();
const events = [];
const emit = (e) => events.push(e);
const carry = new Float32Array(8), headAt = new Float32Array(3);

async function boot({ buffer, base, lean }) {
  shared = !!buffer;
  if (lean) gaps = POSE_GAP_LEAN;
  map = mapFolk(buffer || new ArrayBuffer(FOLK_BYTES));
  if (!shared) map.inbox[FIN.HOUR] = -1;
  const get = async (p) => { const r = await fetch(base + p); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r; };
  const json = (p) => get(p).then((r) => r.json());
  const [village, interior, spots, folk, meta, bin] = await Promise.all([
    json('assets/game/village.json'), json('assets/game/interior/interior.json'), json('assets/game/folk/spots.json'),
    json('assets/game/folk/folk.json'), json('assets/game/folk/clips.json'), get('assets/game/folk/clips.bin').then((r) => r.arrayBuffer()),
  ]);
  const clips = new FolkClips(meta, bin);
  const ground = new Ground(village, interior, BOUNDS);
  const town = new Town(village, interior, spots);
  life = new Life({ ground, town, clips, emit });
  talk = new Talk(life, { lines: { ...LA, ...LB, ...LC }, scenes: SCENES, smalltalk: SMALLTALK }, emit);
  // Each body's skeleton out of its model (the mesh is the renderer's), one fetch a model.
  const glbs = new Map();
  const glbOf = (m) => {
    if (!glbs.has(m)) glbs.set(m, get(`assets/game/folk/${folk.models[m].glb}`).then((r) => r.arrayBuffer()).then(parseGLB));
    return glbs.get(m);
  };
  await Promise.all(life.folk.map(async (me) => {
    const m = modelOf(folk, me.p.body);
    const rig = new FolkRig(await glbOf(m), clips, { armOut: me.p.armOut, skirt: folk.models[m].skirt || null });
    life.setRig(me.i, rig);
    me.joints = rig.count + (rig.skirt ? SKIRT_JOINTS : 0);
    me.pal = new Float32Array(me.joints * 8);
    me.posedAt = -1;
  }));
  glbs.clear();
  // The smith's hammer: one more joint after his own in the slot, for the renderer to hang it on (src/gfx/folktools.js).
  // In his hand as his rig holds one, or where it's left on the anvil.
  const smith = life.byId.homunculus, at = forgeSpot(town);
  if (smith && at && smith.joints === smith.rig.count) {
    const rest = hammerAtRest(at.x, at.y, at.z, at.yaw), laid = new Float32Array(8);
    writeDQ(laid, 0, rest.q, 0, rest.t, 0);
    hammer = { me: smith, grip: gripOf(smith.rig), laid, held: new Float32Array(8), q: [0, 0, 0, 1], t: [0, 0, 0] };
  }
  // Every bed in town and every bedroll laid on a floor, for the renderer to put a blanket over whoever's in one.
  for (const h of town.houses) {
    for (const b of h.beds) {
      const in_ = life.folk.filter((me) => me.bed?.bed === b);
      bedIndex.set(b, beds.length);
      beds.push({ x: b.x, y: b.y, z: b.z, foot: Math.atan2(b.dir[0], b.dir[1]), floor: 0, house: h.i, hid: h.key, width: b.width || 1.25,
        small: in_.length > 0 && in_.every((me) => me.child) ? 1 : 0 });
    }
  }
  for (const me of life.folk) {
    const p = me.bed?.pallet;
    if (!p || bedIndex.has(p)) continue;
    bedIndex.set(p, beds.length);
    beds.push({ x: p.x, y: ground.heightFor(p.x, p.z, p.level ? 9 : 0.5), z: p.z, foot: p.yaw, floor: 1, house: me.home.i });
  }
  // Each house's floor, for the main thread to tell who's indoors with whom.
  const houses = town.houses.map((h) => { const ih = interior.homes[h.i + 1]; return ih ? [ih.x0, ih.z0, ih.x1, ih.z1] : null; });
  self.postMessage({ type: 'ready', count: life.folk.length, beds, houses });
  run();
}

export const modelOf = (folk, body) => (folk.models[body] ? body : folk.swaps?.[body]?.base || 'worker');

// ---- the loop ----

let tick = 0, last = 0, clock = 0;
const head = [0, 0, 0];

// One frame of the town, timed for the Frame rate readout. A bug in one is told once and the town carries on.
function tickTown(dt) {
  const t0 = performance.now();
  try { frame(dt); } catch (err) {
    if (!run.told) { run.told = true; self.postMessage({ type: 'error', message: `${err.message}\n${err.stack}` }); }
  }
  if (shared) { Atomics.add(map.ctrl, FCTRL.COST_US, Math.round((performance.now() - t0) * 1000)); Atomics.add(map.ctrl, FCTRL.FRAMES, 1); }
}

function run() {
  last = performance.now();
  if (shared && Atomics.waitAsync) { paced(); return; }
  const step = () => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    tickTown(dt);
    setTimeout(step, Math.max(1, 1000 / HZ - (performance.now() - now)));
  };
  step();
}

// Paced by the screen, as the sim is (its loop in src/sim/sim.worker.js): a frame of the town for each of the screen's, by the time
// each asks for, so the people in the street move on the same amount every frame. (At its own 60 a second on a 144 Hz screen,
// three frames in five showed them where they'd been.) A frame shorter than SHORTEST waits for the next. When no frames come, its
// own 60. (Only where it can wait without blocking, for the talk, flags and routes it's sent.)
async function paced() {
  const c = map.ctrl, SHORTEST = 1000 / 170, FRAMELESS = 100;
  let seq = Atomics.load(c, FCTRL.PACE_SEQ), done = Atomics.load(c, FCTRL.PACE_US), frameAt = -1e9;
  for (;;) {
    const asked = Atomics.load(c, FCTRL.PACE_SEQ), now = performance.now();
    if (asked !== seq) {
      seq = asked;
      const want = Atomics.load(c, FCTRL.PACE_US);
      if (now - frameAt > FRAMELESS) done = want;
      else {
        const owed = ((want - done) | 0) / 1000;
        if (owed >= SHORTEST) { tickTown(Math.min(owed, 100) / 1000); done = want; }
      }
      frameAt = now; last = now;
    } else if (now - frameAt > FRAMELESS && now - last >= 1000 / HZ - 0.5) {
      tickTown(Math.min((now - last) / 1000, 0.1));
      last = now; done = Atomics.load(c, FCTRL.PACE_US);
    }
    // (On its own 60, a timer: a waitAsync's timeout only wakes on Windows's 15 ms tick, so 16 ms took 30.)
    const t = performance.now();
    if (t - frameAt > FRAMELESS) await new Promise((r) => setTimeout(r, Math.max(1, 1000 / HZ - (t - last))));
    else { const r = Atomics.waitAsync(c, FCTRL.PACE_SEQ, seq, FRAMELESS); if (r.async) await r.value; }
  }
}

function frame(dt) {
  const inb = map.inbox;
  // Nothing's moved while the game's paused, or before the player's in it.
  if (inb[FIN.PAUSED] > 0.5 || !(inb[FIN.HOUR] >= 0)) return;
  const dangers = [];
  for (let k = 0; k < Math.min(8, inb[FIN.DANGER_N] | 0); k++) dangers.push([inb[FIN.DANGER + k * 2], inb[FIN.DANGER + k * 2 + 1]]);
  const player = [inb[FIN.PX], inb[FIN.PY], inb[FIN.PZ]];
  life.update(dt, { hour: inb[FIN.HOUR], day: inb[FIN.DAY] | 0, player, dangers });
  talk.update(dt, { player, cast: inb[FIN.CAST] | 0 });
  blows(player);
  tick++; clock += dt;
  write(inb[FIN.CAMX], inb[FIN.CAMY], inb[FIN.CAMZ]);
  if (events.length) { self.postMessage({ type: 'events', list: events.splice(0) }); }
}

// The work you can hear: the axe at the woodpile and the smith's hammer, the moment each lands (seconds into its clip, read off
// the right hand stopping dead; the smith's is where his clip was made to land it, tools/folk/smith_clips.mjs), told to the main thread to sound (src/main.js townEvent). Only within earshot.
const BLOWS = { chop_wood: { at: 0.21, kind: 'chop' }, [SMITH_CLIPS.blow]: { at: SMITH_CLIPS.blowAt, kind: 'anvil' } };
let hammer = null;
function blows(player) {
  for (const me of life.folk) {
    const c = me.pose.clip, b = c && BLOWS[c.name];
    if (!b) { me.blowT = -1; continue; }
    const t = c.loop ? me.pose.time % c.dur : me.pose.time;
    if (me.blowT >= 0 && me.blowT < b.at && t >= b.at && Math.hypot(me.x - player[0], me.z - player[2]) < 45) {
      emit({ type: 'work', kind: b.kind, at: [me.x, me.y + 0.6, me.z] });
    }
    me.blowT = t;
  }
}

// Everyone into a slot: where they are, and their pose. Full poses are solved less often the further they are from the eye, and
// seldom for anyone not drawn (POSE_GAP); in the frames between, the last one is carried to where they are now. (By the clock, so a
// faster screen poses those near you more often and nobody else; spread over the frames by who's who.)
function write(cx, cy, cz) {
  const si = shared ? freeSlot(map) : 0, slot = map.slots[si], bodies = map.bodies;
  slot[SH.COUNT] = life.folk.length; slot[SH.TICK] = tick; slot[SH.HOUR] = map.inbox[FIN.HOUR];
  for (const me of life.folk) {
    const o = SLOT_HEAD + me.i * FOLK_STRIDE;
    const d = Math.hypot(me.x - cx, me.y - cy, me.z - cz);
    const seen = map.inbox[FIN.SEEN + me.i] > 0.5, sighted = seen && !me.seen;
    me.seen = seen;
    const every = !seen ? gaps.hidden : d < gaps.near ? 0 : d < gaps.mid ? gaps.midGap : gaps.farGap;
    // (Tucked in once they're down in a bed: the same moment the blanket's drawn over them, below.)
    const tuck = me.posture === 'lie' && me.pose.rest > 0.5 && me.bed?.bed && bedIndex.has(me.bed.bed) ? 1 : 0;
    if (tuck !== me.pose.tuck) { me.pose.tuck = tuck; me.posedAt = -1; }
    let posed = false;
    // (Posed at once when they come into view, so nobody's seen in a pose a sixth of a second old.)
    if (me.posedAt < 0 || !every || sighted || clock >= me.poseDue - 0.002) {
      me.pose.solve(me.x, me.y, me.z, me.yaw, me.pal, 0);
      me.pose.at(me.rig.head, head);
      me.hx = head[0]; me.hy = head[1]; me.hz = head[2];
      me.posedAt = tick;
      me.x0 = me.x; me.y0 = me.y; me.z0 = me.z; me.yaw0 = me.yaw;
      me.poseDue = clock + every * (me.poseDue === undefined ? ((me.i % 8) + 1) / 8 : 1);
      posed = true;
    }
    const moved = !posed && carryFrame(carry, me.yaw0, me.x0, me.y0, me.z0, me.yaw, me.x, me.y, me.z);
    slot[o + F.ACTIVE] = 1;
    slot[o + F.X] = me.x; slot[o + F.Y] = me.y; slot[o + F.Z] = me.z; slot[o + F.YAW] = me.yaw;
    if (moved) {
      headAt[0] = me.hx; headAt[1] = me.hy; headAt[2] = me.hz;
      carryPoint(headAt, 0, slot, o + F.HX, carry);
    } else { slot[o + F.HX] = me.hx; slot[o + F.HY] = me.hy; slot[o + F.HZ] = me.hz; }
    slot[o + F.BODY] = me.i;
    // (A new palette whenever it's been carried: the renderer uploads it when this changes.)
    slot[o + F.POSED] = moved ? tick : me.posedAt;
    slot[o + F.HOUSE] = me.house;
    slot[o + F.LEVEL] = me.level;
    slot[o + F.SLEEP] = me.act === ACT.SLEEP && (me.posture === 'lie' || me.posture === 'floor') && !me.woken ? 1 : 0;
    slot[o + F.TALK] = me.talking ? 1 : 0;
    slot[o + F.BUSY] = me.act;
    // Abed (and settled: the blanket's drawn up once they're down): which bed, and which side of it.
    let bed = -1;
    if (me.pose.rest > 0.5) {
      if (me.posture === 'lie' && me.bed?.bed && bedIndex.has(me.bed.bed)) bed = bedIndex.get(me.bed.bed) * 4 + 1 + (me.bed.side || 0);
      else if (me.posture === 'floor' && me.bed?.pallet && bedIndex.has(me.bed.pallet)) bed = bedIndex.get(me.bed.pallet) * 4 + 1;
    }
    slot[o + F.BED] = bed;
    if (!moved) slot.set(me.pal, o + F_PALETTE);
    else {
      const n = me.rig.count, p = o + F_PALETTE;
      carryPalette(me.pal, 0, slot, p, n, carry);
      if (me.joints > n) {
        // The skirt's six leg points (and their radii) after the joints, and the facing it hangs from.
        const s = n * 8;
        for (let k = s; k < me.joints * 8; k++) slot[p + k] = me.pal[k];
        for (let i = 0; i < 6; i++) carryPoint(me.pal, s + i * 4, slot, p + s + i * 4, carry);
        slot[p + s + 24] = me.yaw;
      }
    }
    if (hammer && hammer.me === me) {
      const h = me.rig.hands[1], at = o + F_PALETTE + me.rig.count * 8;
      if (posed) {
        quatMul(hammer.q, 0, me.pose.wq, h * 4, hammer.grip.q, 0);
        quatRotate(hammer.t, 0, me.pose.wq, h * 4, hammer.grip.t, 0);
        for (let k = 0; k < 3; k++) hammer.t[k] += me.pose.wt[h * 3 + k];
        writeDQ(hammer.held, 0, hammer.q, 0, hammer.t, 0);
      }
      if (!me.tool) slot.set(hammer.laid, at);
      else if (moved) carryPalette(hammer.held, 0, slot, at, 1, carry);
      else slot.set(hammer.held, at);
    }
    // For the player to bump into: not when they're lying down, or sat (the furniture's in the way already).
    const b = me.i * 4;
    const solid = me.posture === 'stand';
    bodies[b] = me.x; bodies[b + 1] = me.z; bodies[b + 2] = solid ? me.radius : 0; bodies[b + 3] = me.y;
  }
  for (let i = life.folk.length; i < FOLK_MAX; i++) slot[SLOT_HEAD + i * FOLK_STRIDE + F.ACTIVE] = 0;
  if (shared) publish(map, si);
  else self.postMessage({ type: 'slot', slot: slot.slice(), bodies: bodies.slice() });
}

self.addEventListener('message', (e) => {
  const m = e.data;
  if (m.type === 'boot') { boot(m).catch((err) => self.postMessage({ type: 'error', message: `${err.message}\n${err.stack}` })); return; }
  if (m.type === 'inbox' && map) { map.inbox.set(m.inbox); return; }
  // A way across the town on foot for the player, for the quest trail (src/ui/trail.js): the folk's own walking grid.
  if (m.type === 'route') { self.postMessage({ type: 'route', id: m.id, pts: life ? life.ground.find(0, m.ax, m.az, m.bx, m.bz, 60000) : null }); return; }
  if (!talk) return;
  if (m.type === 'talk') talk.talkTo(m.i);
  else if (m.type === 'flags') talk.flags = new Set(m.flags);
  else if (m.type === 'name') talk.name = m.name;
});
