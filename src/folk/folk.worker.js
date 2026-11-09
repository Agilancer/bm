// The town's own thread: everyone's day (src/folk/brain.js), what they say (src/folk/talk.js), and their poses, written
// into the folk buffer (src/folk/layout.js) for the renderer to skin. It runs at 60 a second at its own pace; the fight's
// thread never waits on it, and it never waits on the fight.
//
// main -> here:  { type: 'boot', buffer, base }   then the inbox (FIN) every frame, and
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
import { F, F_PALETTE, FIN, FOLK_BYTES, FOLK_MAX, FOLK_STRIDE, SH, SLOT_HEAD, freeSlot, mapFolk, publish } from './layout.js';

const HZ = 60;
// The world the town's laid out in: the village, the fields and woods round it, the old church ground.
const BOUNDS = [-80, -75, 110, 80];

let life = null, talk = null, map = null, shared = false;
const beds = [], bedIndex = new Map();
const events = [];
const emit = (e) => events.push(e);

async function boot({ buffer, base }) {
  shared = !!buffer;
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

let tick = 0, last = 0;
const head = [0, 0, 0];

function run() {
  last = performance.now();
  const step = () => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    try { frame(dt); } catch (err) {
      if (!run.told) { run.told = true; self.postMessage({ type: 'error', message: `${err.message}\n${err.stack}` }); }
    }
    setTimeout(step, Math.max(1, 1000 / HZ - (performance.now() - now)));
  };
  step();
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
  tick++;
  write(inb[FIN.CAMX], inb[FIN.CAMY], inb[FIN.CAMZ]);
  if (events.length) { self.postMessage({ type: 'events', list: events.splice(0) }); }
}

// The work you can hear: the axe at the woodpile and the smith's hammer, the moment each lands (seconds into its clip, read off
// the right hand stopping dead), told to the main thread to sound (src/main.js townEvent). Only within earshot.
const BLOWS = { chop_wood: { at: 0.21, kind: 'chop' }, cleave: { at: 0.78, kind: 'anvil' } };
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

// Everyone into a slot: where they are, and their pose. Poses are solved less often the further they are from the eye
// (a person 60 m off moving at 15 a second can't be told from 60), and the last one kept for the ticks between.
function write(cx, cy, cz) {
  const si = shared ? freeSlot(map) : 0, slot = map.slots[si], bodies = map.bodies;
  slot[SH.COUNT] = life.folk.length; slot[SH.TICK] = tick; slot[SH.HOUR] = map.inbox[FIN.HOUR];
  for (const me of life.folk) {
    const o = SLOT_HEAD + me.i * FOLK_STRIDE;
    const d = Math.hypot(me.x - cx, me.y - cy, me.z - cz);
    const every = d < 22 ? 1 : d < 45 ? 2 : d < 90 ? 4 : 8;
    // (Tucked in once they're down in a bed: the same moment the blanket's drawn over them, below.)
    const tuck = me.posture === 'lie' && me.pose.rest > 0.5 && me.bed?.bed && bedIndex.has(me.bed.bed) ? 1 : 0;
    if (tuck !== me.pose.tuck) { me.pose.tuck = tuck; me.posedAt = -1; }
    if (me.posedAt < 0 || (tick + me.i) % every === 0) {
      me.pose.solve(me.x, me.y, me.z, me.yaw, me.pal, 0);
      me.pose.at(me.rig.head, head);
      me.hx = head[0]; me.hy = head[1]; me.hz = head[2];
      me.posedAt = tick;
    }
    slot[o + F.ACTIVE] = 1;
    slot[o + F.X] = me.x; slot[o + F.Y] = me.y; slot[o + F.Z] = me.z; slot[o + F.YAW] = me.yaw;
    slot[o + F.HX] = me.hx; slot[o + F.HY] = me.hy; slot[o + F.HZ] = me.hz;
    slot[o + F.BODY] = me.i;
    slot[o + F.POSED] = me.posedAt;
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
    slot.set(me.pal, o + F_PALETTE);
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
