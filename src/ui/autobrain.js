// Auto-play's head (src/ui/autoplay.js has its button, its line on the HUD and its menu). It plays the game the way a player
// does, from the render thread: it reads the snapshot, the pack, the quests and the town, and works the same controls the keys
// and the mouse do (Input.auto: the feet, the run, the cast held; Input.yaw and pitch: the look; the press counters: staff,
// cast, jump, dodge; GameView.takeNearest: E). Nothing is moved or given by hand.
//
// What it does, most pressing first:
//   the opening   waits out the cave, answers to a name, walks out, and follows Lisandra down the Long Road to Bellmourn
//   a fight       anything that means it harm, or what it's hunting: Firebolt and the staff from range, Chain Lightning and
//                 a Meteor into a crowd, Frost Nova when they're on it, Mend when it's hurt; it backs off and keeps its distance
//   running       from what it can't yet beat (the knights of Velscour, the Gravehart, the Hydra, a dragon), and home when it's low
//   loot          gold, orbs and stuff underfoot, gear with E, chests it passes; the best gear on, gems in their sockets
//   the town      every quest taken, steps talked through and handed in; sells what it won't wear, buys a mending, sleeps at the
//                 Tolling Bell when there's something to wait a night for
//   the quests    in an order that suits its level: errands, the woods, the catacombs (past the black knight's post, in at the
//                 Sexton's door), the countries out past the town by the roads and the seals, the night's work by night
//   grinding      for levels, and once every quest is done, where the menu says
//
// Where it walks: in the town, the woods round it and the catacombs, by paths from src/sim/nav.worker.js; out in the countries,
// by the roads (src/core/lands.js ROUTES) and across country, the pines stepped round by the same worker, and the woken seals.
import { C, C_SIZE, CHARS_START, H, INPUT, MAX_SLIMES, SLIME_FLOATS, SLIMES_START } from '../core/layout.js';
import { CAVE_MOUTH, CAVE_OUT, ESCORT_TO, OPENING, RUN_OUT } from '../core/opening.js';
import { CAVE_PATH, ROADS } from '../core/terrain.js';
import { ROUTES, SITES } from '../core/lands.js';
import { SEALS } from '../core/sites.js';
import { inTown, townDist } from '../core/town.js';
import { churchAt, inChurch } from '../core/church.js';
import { floorAt } from '../core/interior.js';
import { GROUP_KEYS, GROUPS, LAIRS, TRIPO_KIND } from '../core/tripo-monsters.js';
import { CAMPS } from '../sim/slimes.js';
import { SPELLS } from '../sim/spells.js';
import { RULES, isNight } from '../folk/quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { PEOPLE } from '../folk/people.js';
import { TRADES, offerFor, worth } from '../folk/shops.js';
import { GEMS, ROBES, gearTotals, matName } from '../items/items.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };
const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
const SP = Object.fromEntries(SPELLS.map((s, i) => [s.key, i]));
const NAME = 'Jamie';   // what it answers Lisandra with, if nobody has yet
const MAX_SIGHT = 26;   // how far off it'll take on what it's hunting

// ---------------------------------------------------------------- the world as it judges it

// Posts it keeps clear of until it's strong enough: [x, z, how wide, from what level]. (Velscour's man on the west road and the
// black knight on the cathedral's steps keep a post and a leash: src/core/knights.js, src/sim/sim.worker.js BLACK.)
const CATHEDRAL_GUARD = { x: 150, z: 0 };
const HYDRA_AT = churchAt(208, -128);
const POSTS = [
  [-78, -3, 30, 18], [CATHEDRAL_GUARD.x, CATHEDRAL_GUARD.z, 28, 99], [-40, -150, 44, 14], [150, 110, 26, 8],
  [-72, -78, 22, 4], [118, -64, 22, 4], [HYDRA_AT[0], HYDRA_AT[1], 46, 99],
];
// The lairs out in the land (src/core/tripo-monsters.js), by the level it wants before it goes near one.
const LAIR_LEVEL = {
  werewolf: 6, nest: 4, goblin_camp: 2, kobold_den: 2, lost_children: 1, goat_ring: 6, mill_dolls: 5, falls_drake: 8, sallow_drowned: 5,
  fen_worm: 16, fen_harpies: 8, fen_dragon: 24, cutter_raiders: 6, fungal_brood: 7, abbey_road_goats: 7, vigil_guard: 16, obelisk_guard: 16,
  bone_field: 18, ash_dragon: 24, ash_worm: 16, crown_dragon: 24, stair_demons: 12, hollow_dolls: 8, barrow_lords: 10, barrow_wyrm: 20,
  maiden_coven: 9, fell_harpies: 9, gallows_plague: 14, grawl_bats: 10, grove_demons: 12,
};
// What it'll stand and fight, by kind (FOE_NAMES in src/main.js) and its level.
function fightable(kind, lvl) {
  if (kind === 5 || kind === 9 || kind === 7 || kind === 8) return true;   // the risen, the jellies
  if (kind === 2) return lvl >= 2;                     // the falls' crabs
  if (kind === 6) return lvl >= 4;                     // an ogre
  if (kind === 10) return lvl >= 8;                    // the Abyssal Mouth
  if (kind === 3) return lvl >= 14;                    // the Gravehart
  if (kind === 0) return lvl >= 18;                    // a knight of Velscour
  if (kind >= TRIPO_KIND) {
    const hp = GROUPS[GROUP_KEYS[kind - TRIPO_KIND]]?.hp || 999;
    return lvl >= (hp <= 60 ? 1 : hp <= 90 ? 3 : hp <= 170 ? 6 : hp <= 240 ? 10 : hp <= 520 ? 15 : 24);
  }
  return false;                                        // the Hydra; Tessariel's knights; the other Tessariels
}

// The quests, in the order it takes them on, and the level it wants for each.
const PLAN = [
  ['bed_and_bell', 1], ['letter', 1], ['pines', 1], ['iron_from_dead', 2], ['dead_cant_wait', 3], ['shroud_and_thread', 3], ['bones_for_carver', 3],
  ['long_way_round', 4], ['toll_of_bell', 5], ['millhaven_jelly', 5], ['barrow_lights', 8], ['sallowmere', 8], ['four_watches', 9],
  ['crown_of_teeth', 11], ['black_road', 13],
];
const LEVEL_OF = Object.fromEntries(PLAN);

// Where each place in a quest's steps is, for walking to: a point, and how near counts.
const area = (k) => {
  if (k === 'catacombs' || k === 'bellcrypt') return { x: churchAt(186, 0)[0], z: 0, r: 6, below: true };
  if (k === 'woods') return { x: -45, z: 150, r: 40 };
  if (k === 'millhaven') { const c = CAMPS.find((q) => q.key === 'millpond'); return { x: c.x, z: c.z, r: 20 }; }
  if (k === 'fen') { const c = CAMPS.find((q) => q.key === 'sallow'); return { x: c.x, z: c.z, r: 30 }; }
  const s = SITES[k];
  return s ? { x: s.x, z: s.z, r: s.r * (k === 'keep' ? 1.4 : 0.9) } : null;
};
// Where to hunt for what a kill step wants.
const HUNTS = {
  woods: [[-45, 150], [20, -125], [-160, 60], [-62, 160], [100, -128], [-170, 70], [60, 120], [-110, 110], [170, 40], [-120, -60]],
  millhaven: CAMPS.filter((c) => c.key === 'millpond').map((c) => [c.x, c.z]),
  fen: CAMPS.filter((c) => ['sallow', 'fen1', 'fen2'].includes(c.key)).map((c) => [c.x, c.z]),
  barrows: CAMPS.filter((c) => c.key === 'barrows').map((c) => [c.x, c.z]),
  bellcrypt: [churchAt(186, 0), churchAt(190, 6), churchAt(182, -6)],
};

// The menu's grinding grounds (src/ui/autoplay.js GRINDS).
export const GRINDS = {
  woods: { name: 'The woods round Bellmourn', line: 'The risen in packs, the graveyards, the chests among the pines.' },
  catacombs: { name: 'The catacombs', line: 'Room after room of the dead below the cathedral, and the best loot there is near town.' },
  lairs: { name: 'The monster lairs', line: 'Every lair it can take at its level, near and far, cleared as they fill again.' },
  jellies: { name: 'The jelly camps', line: 'Out to the millpond and the Weeping Fen: easy work, a long way from home.' },
  roam: { name: 'Roam the land', line: 'Every country and every seal, chests and fights wherever the road goes.' },
};

const SLOT_OF = (it) => (it.type === 'weapon' ? 'main' : it.type === 'shield' ? 'off' : it.type === 'skull' ? 'skull' : it.type === 'robe' ? ROBES[it.base]?.slot : null);
// What a set of gear is worth to a wizard: spell power first.
const WORTH = { power: 260, thrift: 180, regen: 45, mana: 0.7, life: 0.9, armor: 1.2, leech: 5 };
function gearScore(slots) {
  const t = gearTotals(slots);
  let s = 0;
  for (const k in WORTH) s += (t[k] || 0) * WORTH[k];
  const w = slots.main;
  if (w?.dmg) s += (w.dmg[0] + w.dmg[1]) * 0.25;
  if (slots.off?.power && !slots.skull) s += 5;
  return s;
}

// The road it walks from Lisandra's ledge to the town, as she does (src/sim/opening.js ROUTE).
function escortRoute() {
  const road = ROADS[0].line, end = CAVE_PATH.pts.at(-1);
  let k = 0, best = 1e9;
  road.forEach((p, i) => { const d = dist(p[0], p[1], end[0], end[1]); if (d < best) { best = d; k = i; } });
  const pts = CAVE_PATH.pts.slice(1).map((p) => [p[0], p[1]]);
  for (let i = k - 1; i >= 0; i--) pts.push([road[i][0], road[i][1]]);
  pts.push([...ESCORT_TO]);
  return pts;
}

// ---------------------------------------------------------------- the nav thread

class Nav {
  constructor(base, opening) {
    this.ready = false; this.calls = new Map(); this.id = 0; this.spawns = [];
    this.w = new Worker(new URL('../sim/nav.worker.js', import.meta.url), { type: 'module' });
    this.w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') { this.ready = true; this.spawns = m.spawns; this.bounds = m.bounds; return; }
      const c = this.calls.get(m.id);
      if (c) { this.calls.delete(m.id); c(m.result); }
    };
    this.w.onerror = (e) => console.warn('auto-play nav', e.message);
    this.w.postMessage({ type: 'boot', base, opening });
  }

  ask(type, o) {
    return new Promise((resolve) => {
      if (!this.ready) { resolve(null); return; }
      const id = ++this.id;
      this.calls.set(id, resolve);
      this.w.postMessage({ type, id, ...o });
    });
  }

  // On the worker's grid: the town and the woods round it, and (below: down there, not on the land over them) the cathedral's
  // floors under the land.
  inGrid(x, z, below = false) {
    if (Math.abs(x) < 246 && Math.abs(z) < 246) return true;
    const b = this.bounds;
    return below && !!b && x > b[0] + 2 && z > b[1] + 2 && x < b[2] - 2 && z < b[3] - 2 && floorAt(x, z) !== null;
  }
}

// ---------------------------------------------------------------- the long way: roads, country, seals

let ROAD_NODES = null;
function roadNodes() {
  if (ROAD_NODES) return ROAD_NODES;
  const nodes = [], edges = [];
  const add = (x, z) => { nodes.push({ x, z }); edges.push([]); return nodes.length - 1; };
  const link = (a, b, k = 1) => { const d = dist(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z) * k; edges[a].push([b, d]); edges[b].push([a, d]); };
  for (const r of ROUTES) {
    let prev = -1;
    for (const [x, z] of r.pts) { const i = add(x, z); if (prev >= 0) link(prev, i); prev = i; }
  }
  for (const r of ROADS) {
    let prev = -1;
    r.line.forEach(([x, z], j) => { if (j % 6 && j !== r.line.length - 1) return; const i = add(x, z); if (prev >= 0) link(prev, i); prev = i; });
  }
  // (Where one road leaves another, and the town's own ways between them: across country, a little dearer than a road.)
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    const d = dist(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z);
    if (d < 700) link(a, b, 1.3);
  }
  ROAD_NODES = { nodes, edges };
  return ROAD_NODES;
}
const segNear = (ax, az, bx, bz, cx, cz) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L));
  return dist(ax + dx * t, az + dz * t, cx, cz);
};

// ---------------------------------------------------------------- the head

export class Brain {
  // o: { game, shared, input, pack, inventory, townUI, lands, spellbar, renderer, town, heroCount, base, opening, say(text), menu(), done() }
  constructor(o) {
    this.o = o;
    this.nav = new Nav(o.base, o.opening);
    this.auto = { mx: 0, mz: 0, run: false, jumpHeld: false, cast: false };
    this.t = 0;
    this.grind = 'woods';
    this.reset();
  }

  reset() {
    Object.assign(this.auto, { mx: 0, mz: 0, run: false, jumpHeld: false, cast: false });
    this.want = null; this.face = null; this.pitch = 0; this.run = false;
    this.goal = null; this.macro = null; this.sub = null; this.subFor = null; this.probeDir = null; this.probeT = 0;
    this.job = null; this.jobKey = ''; this.thinkT = 0; this.planT = 0;
    this.castT = 0; this.castCool = 0; this.staffCool = 0;
    this.stuck = { t: 0, x: 0, z: 0, n: 0, act: 0, actT: 0, side: 1 };
    this.talk = null; this.waitT = 0; this.hold = 0;
    this.track = new Map();
    this.engage = new Map();   // what it's been fighting, and since when it last hurt it
    this.skip = new Map();     // things it's given up on for a while: key -> until
    this.patrol = null; this.wispT = 0; this.gearT = 0; this.strafe = 1; this.strafeT = 0;
    this.lastPos = null; this.lastHpf = 1;
    this.bump = this.bump || {};
  }

  start() { this.reset(); this.o.input.auto = this.auto; }
  stop() {
    this.o.input.auto = null;
    this.auto.cast = false;
    if (this.o.townUI.open) this.o.townUI.close(false);
    if (this.o.lands.isOpen) this.o.lands.close();
  }

  // ---- what it sees

  me(snap) {
    const p = this.o.pack;
    return {
      x: snap[H.PX], y: snap[H.PY], z: snap[H.PZ], hp: snap[H.HP], maxHp: snap[H.MAX_HP] || 1, mana: snap[H.MANA], maxMana: snap[H.MAX_MANA] || 1,
      hpf: snap[H.HP] / (snap[H.MAX_HP] || 1), lvl: p.level, stam: snap[H.STAMINA], opening: snap[H.OPENING], openT: snap[H.OPENING_TIME],
      town: inTown(snap[H.PX], snap[H.PZ], 0), below: snap[H.PY] < -6, hour: this.o.renderer.hour,
    };
  }

  // Everything alive that's about: the snapshot's bodies (not the other Tessariels, nor Lisandra), and the jellies.
  foes(snap, m) {
    const out = [], n = snap[H.NCHARS] | 0, last = n - (this.o.heroCount() || 0) - 2;
    for (let i = 0; i < Math.max(0, last); i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || snap[o + C.STATE] === 10 || snap[o + C.HP] <= 0) continue;
      const kind = snap[o + C.KIND] | 0, x = snap[o + C.X], y = snap[o + C.Y], z = snap[o + C.Z];
      const d = dist(m.x, m.z, x, z);
      if (d > 70 || Math.abs(y - m.y) > 8) continue;
      out.push({ id: i, kind, x, y, z, d, hp: snap[o + C.HP], maxHp: snap[o + C.MAX_HP], hostile: snap[o + C.HOSTILE] > 0.5, h: kind >= TRIPO_KIND ? 1.1 : i < 2 ? 1.3 : 0.95, glint: snap[o + C.GLINT] });
    }
    for (let i = 0; i < MAX_SLIMES; i++) {
      const o = SLIMES_START + i * SLIME_FLOATS;
      if (snap[o] < 0.5) continue;
      const x = snap[o + 1], y = snap[o + 2], z = snap[o + 3], d = dist(m.x, m.z, x, z);
      if (d > 60 || Math.abs(y - m.y) > 8) continue;
      out.push({ id: 1000 + i, kind: 9, x, y, z, d, hp: 1, maxHp: 1, hostile: d < 14, h: Math.max(0.25, snap[o + 4] * 0.6), slime: true });
    }
    // Where each was a moment ago: how it's moving, to lead it.
    const now = this.t;
    for (const f of out) {
      const k = this.track.get(f.id);
      if (k && now - k.t > 0.05) { const a = Math.min(1, (now - k.t) * 4); f.vx = (k.vx || 0) * (1 - a) + (f.x - k.x) / (now - k.t) * a; f.vz = (k.vz || 0) * (1 - a) + (f.z - k.z) / (now - k.t) * a; } else { f.vx = k?.vx || 0; f.vz = k?.vz || 0; }
      if (!k || now - k.t > 0.05) this.track.set(f.id, { x: f.x, z: f.z, t: now, vx: f.vx, vz: f.vz });
    }
    return out;
  }

  // The posts and lairs it should keep clear of at this level, as circles.
  avoid(m) {
    const out = [];
    for (const [x, z, r, lvl] of POSTS) if (m.lvl < lvl) out.push([x, z, r]);
    for (const l of LAIRS) if (m.lvl < (LAIR_LEVEL[l.key] || 10)) out.push([l.x, l.z, (l.wake || 110) + 15]);
    return out;
  }

  // Inside ground it's keeping clear of (a knight's post, a lair it isn't ready for).
  kept(m, x, z) {
    if (!this.avoidFor || this.t - this.avoidFor.t > 2) this.avoidFor = { t: this.t, list: this.avoid(m) };
    return this.avoidFor.list.some(([ax, az, r]) => dist(x, z, ax, az) < r);
  }

  skipping(k) { const u = this.skip.get(k); return u !== undefined && u > this.t; }
  giveUp(k, secs) { this.skip.set(k, this.t + secs); }

  say(text) { if (text !== this.said) { this.said = text; this.o.say(text); } }

  // ---- each frame

  step(dt, snap) {
    this.t += dt;
    const m = this.me(snap);
    const g = this.o.game;
    // Fallen, with no opening to catch it (?noopening): up again, as R does.
    if (snap[H.GAME] === 2) {
      this.halt();
      this.say('Fallen.');
      if ((this.fallenT = (this.fallenT || 0) + dt) > 3) { this.fallenT = 0; this.o.shared.input[INPUT.RESTART] += 1; }
      return;
    }
    // Something came between, a long way at once: a fall caught (back at the town's edge), a seal, a sleep. Plan afresh.
    if (this.lastPos && dist(this.lastPos[0], this.lastPos[1], m.x, m.z) > 25) {
      // Caught falling, and set down by the town: whatever it was at was too much for it yet. Two levels more first.
      if (this.lastHpf < 0.35 && townDist(m.x, m.z) < 40 && this.job) {
        const why = this.job.why;
        this.bump[why] = (this.bump[why] || 0) + 2;
        this.giveUp(why, 300);
        this.o.note?.(`Auto-play: beaten back. ${this.job.say ? 'It will come back to that stronger.' : ''}`);
      }
      this.goal = null; this.macro = null; this.sub = null; this.job = null; this.patrol = null;
    }
    this.lastPos = [m.x, m.z]; this.lastHpf = m.hpf;
    if (this.hold > 0) { this.hold -= dt; this.halt(); this.motor(dt, m); return; }
    // A panel up: the talk is its own, the rest it shuts.
    if (this.o.townUI.open) { this.halt(); this.converse(dt, m); this.motor(dt, m); return; }
    if (this.talk && !this.o.townUI.open) this.talk = null;
    if (this.o.lands.isOpen) { this.halt(); if (this.sealTo || this.t - (this.sealT ?? -99) < 4) this.travelling(); return; }
    if (this.o.inventory.open || this.o.townUI.book) { this.halt(); return; }
    this.castT -= dt; this.castCool -= dt; this.staffCool -= dt;
    if (this.castT <= 0) this.auto.cast = false;
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 0.12; this.think(snap, m); }
    this.walk(dt, m);
    this.motor(dt, m);
    if ((this.gearT -= dt) <= 0 && !this.fighting) { this.gearT = 4; this.dress(); }
    // A light underfoot down among the dead, for whoever's watching.
    if (m.below && !this.fighting && (this.wispT -= dt) <= 0 && m.mana > 40) { this.wispT = 85; this.cast(SP.wisp, 0.3); }
    void g;
  }

  // Stand still. (A cast under way is let go when its time is up, not here.)
  halt() { this.want = null; this.auto.mx = 0; this.auto.mz = 0; this.auto.run = false; }

  // ---- thinking

  think(snap, m) {
    const g = this.o.game;
    this.fighting = false;
    this.useGoal = false;
    // The opening has its own way to go.
    if (m.opening > 0 && m.opening < OPENING.ARRIVED) { this.opening(snap, m); return; }
    const foes = this.foes(snap, m);
    // A fight, or getting away from one.
    if (!m.town && this.combat(snap, m, foes)) { this.fighting = true; return; }
    // Hurt and out of it: mend, or rest a little.
    if (m.hpf < 0.6 && m.mana >= 30 && this.known(SP.mend) && this.castCool <= 0 && !m.town) { this.face = null; this.halt(); this.cast(SP.mend, 0.35); this.castCool = 1.6; this.say('Mending.'); return; }
    // What's underfoot, and the chests it passes.
    if (!m.town && this.loot(m, foes)) return;
    // The job in hand, or a new one.
    if ((this.planT -= 0.12) <= 0 || !this.job) { this.planT = 1.2; this.plan(m); }
    this.doJob(snap, m, foes);
    void g;
  }

  known(i) { return this.o.spellbar.known.has(i); }

  cast(i, hold) {
    if (!this.known(i) || this.auto.cast) return false;
    const sp = SPELLS[i], m = this.o.game.currentSnap();
    if (m && m[H.MANA] < sp.mana) return false;
    this.o.spellbar.pick(i);
    this.o.input.fire(INPUT.CAST_N);
    this.auto.cast = true;
    this.castT = hold;
    return true;
  }

  // ---- the opening

  opening(snap, m) {
    const st = m.opening, t = m.openT;
    this.halt();
    if (st === OPENING.WAKE) { this.say("Waking in Lisandra's cave."); return; }
    if (st === OPENING.COLLAPSE) { this.say('The cave comes down.'); return; }
    if (st === OPENING.NAME) {
      this.say('Answering to a name.');
      const f = document.getElementById('opening-name');
      if (f && !f.closest('[hidden]') && f.offsetParent !== null && (this.nameT = (this.nameT || 0) + 0.12) > 1.5) {
        this.nameT = 0;
        if (!f.value) f.value = NAME;
        f.form?.requestSubmit();
      }
      return;
    }
    if (st === OPENING.HERD && t < 10) { this.say('Lisandra says your name.'); return; }
    if (st === OPENING.HERD || st === OPENING.LEAVE) {
      // Out of the cave the way she points, by the marks down its middle (never back in: she won't have it).
      this.say('Out of the cave.');
      const pts = RUN_OUT.concat([[CAVE_MOUTH[0] + CAVE_OUT[0] * 6, CAVE_MOUTH[1] + CAVE_OUT[1] * 6]]);
      let k = 0, best = 1e9;
      pts.forEach((p, i) => { const d = dist(p[0], p[1], m.x, m.z); if (d < best) { best = d; k = i; } });
      const to = pts[Math.min(pts.length - 1, best < 3 || k === 0 ? k + 1 : k)];
      this.steer(to[0] - m.x, to[1] - m.z, false);
      return;
    }
    if (st === OPENING.ESCORT) {
      const foes = this.foes(snap, m).filter((f) => f.hostile && f.d < 30);
      if (foes.length && this.combat(snap, m, foes)) { this.fighting = true; this.say(`Fighting the dead on the road (${foes.length}).`); return; }
      const route = this.escort || (this.escort = escortRoute());
      // Lisandra: the last body in the snapshot.
      const n = snap[H.NCHARS] | 0, o = CHARS_START + (n - 1) * C_SIZE, lx = snap[o + C.X], lz = snap[o + C.Z];
      const her = dist(m.x, m.z, lx, lz);
      const end = route.at(-1);
      if (dist(m.x, m.z, end[0], end[1]) < 7) { this.face = Math.atan2(lx - m.x, lz - m.z); this.say('Bellmourn. Waiting on Lisandra.'); return; }
      if (her > 8) { this.face = Math.atan2(lx - m.x, lz - m.z); this.say('Waiting for Lisandra to catch up.'); return; }
      // The point on the road a few metres on from where it stands.
      let k = 0, best = 1e9;
      route.forEach((p, i) => { const d = dist(p[0], p[1], m.x, m.z); if (d < best) { best = d; k = i; } });
      let j = k;
      while (j < route.length - 1 && dist(route[j][0], route[j][1], m.x, m.z) < 4) j++;
      this.face = null;
      this.steer(route[j][0] - m.x, route[j][1] - m.z, false);
      this.say('Following Lisandra down to Bellmourn.');
    }
  }

  // ---- fighting

  combat(snap, m, foes) {
    const lvl = m.lvl;
    // What it can't beat yet, coming for it: away, toward the town.
    const scary = foes.filter((f) => !fightable(f.kind, lvl) && f.kind !== 1 && f.hostile && f.d < 26);
    if (scary.length) {
      const f = scary.reduce((a, b) => (a.d < b.d ? a : b));
      let ax = m.x - f.x, az = m.z - f.z;
      const L = Math.hypot(ax, az) || 1;
      const tx = -m.x, tz = -m.z, T = Math.hypot(tx, tz) || 1;
      ax = ax / L + (T > 30 ? tx / T * 0.6 : 0); az = az / L + (T > 30 ? tz / T * 0.6 : 0);
      this.face = null;
      this.steer(ax, az, true);
      this.say(`Running from ${f.kind === 0 ? 'a knight of Velscour' : f.kind === 3 ? 'the Gravehart' : f.kind === 4 ? 'the Hydra' : 'something too strong'}.`);
      return true;
    }
    const hunting = this.job?.kind === 'hunt' || this.job?.kind === 'grind';
    // On the way somewhere, only what's on it; hunting, whatever's about. (Once it's in a fight, it finishes it.)
    const reach = hunting || this.target ? 30 : 14;
    const live = foes.filter((f) => fightable(f.kind, lvl) && !this.skipping(`foe:${f.id}`) && (f.hostile ? f.d < reach : hunting && f.d < MAX_SIGHT && !inTown(f.x, f.z, 4) && !this.kept(m, f.x, f.z)));
    if (!live.length) { this.target = null; return false; }
    // Low, and still in it: get out toward the town, mending when there's room.
    if (m.hpf < 0.28 && live.some((f) => f.d < 10)) {
      const f = live.reduce((a, b) => (a.d < b.d ? a : b));
      if (m.mana >= 25 && this.known(SP.mend) && f.d > 7 && this.castCool <= 0) { this.cast(SP.mend, 0.35); this.castCool = 1.2; }
      const tx = -m.x, tz = -m.z, T = Math.hypot(tx, tz) || 1, ax = (m.x - f.x) / f.d, az = (m.z - f.z) / f.d;
      this.face = null;
      this.steer(ax + (T > 20 ? tx / T * 0.7 : 0), az + (T > 20 ? tz / T * 0.7 : 0), true);
      this.say('Hurt: falling back.');
      return true;
    }
    // Its mark: near and coming first, then the nearest.
    const pick = live.reduce((a, b) => ((a.d - (a.hostile ? 6 : 0)) <= (b.d - (b.hostile ? 6 : 0)) ? a : b));
    if (this.target?.id !== pick.id) this.target = pick; else Object.assign(this.target, pick);
    const T = this.target, d = T.d;
    // Nothing it throws is landing (behind a wall, across a gap): leave that one be for a while.
    const tk = this.engage.get(T.id) || { since: this.t, best: T.hp };
    if (T.hp < tk.best - 0.5) { tk.best = T.hp; tk.since = this.t; }
    this.engage.set(T.id, tk);
    if (this.t - tk.since > (T.slime ? 20 : 12)) { this.giveUp(`foe:${T.id}`, 45); this.engage.delete(T.id); this.target = null; }
    const close = live.filter((f) => f.d < 5.5).length, around = live.filter((f) => dist(f.x, f.z, T.x, T.z) < 5.5).length;
    // Lead what it throws: the bolt's speed, the time to get there.
    const speed = 34, tt = d / speed;
    const ax = T.x + (T.vx || 0) * tt, az = T.z + (T.vz || 0) * tt;
    const yaw = Math.atan2(ax - m.x, az - m.z);
    this.face = yaw;
    this.pitch = Math.atan2(T.y + T.h - (m.y + 1.62), Math.max(1, d));
    const aimed = Math.abs(wrap(yaw - this.o.input.yaw)) < 0.12;
    // Keep its distance: back off from what's close, close in on what's far, sidestep in between.
    let mx = 0, mz = 0;
    const fx = (T.x - m.x) / (d || 1), fz = (T.z - m.z) / (d || 1);
    if (close >= 1 && d < 7) { mx = -fx; mz = -fz; }
    else if (d > 20) { mx = fx; mz = fz; }
    if ((this.strafeT -= 0.12) <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafe = -this.strafe; }
    mx += -fz * this.strafe * 0.55; mz += fx * this.strafe * 0.55;
    this.steer(mx, mz, false, true);
    if (close >= 1 && d < 2.6 && Math.random() < 0.08) this.o.shared.input[INPUT.DODGE] += 1;
    const sw = snap[H.SWINGING] > 0.5, busy = this.auto.cast || snap[H.CAST_HELD] > 0.5 || sw;
    if (!busy && this.castCool <= 0) {
      const mana = m.mana;
      if (close >= 3 && mana >= 32 && this.cast(SP.nova, 0.3)) this.castCool = 0.9;
      else if (m.hpf < 0.45 && mana >= 25 && d > 6 && this.cast(SP.mend, 0.35)) this.castCool = 1.2;
      else if (!aimed) { /* turning onto it */ }
      else if (around >= 3 && d > 11 && d < 55 && mana >= 45 && this.cast(SP.meteor, 0.3)) { this.pitch = Math.atan2(T.y - (m.y + 1.62), Math.max(1, d)); this.castCool = 1.4; }
      else if (around >= 2 && d < 22 && mana >= 30 && this.cast(SP.chain, 1.6)) this.castCool = 0.4;
      else if (d < 42 && mana >= 12 && this.cast(SP.firebolt, d > 14 ? 0.9 : 0.5)) this.castCool = 0.35;
      else if (d < 40 && this.staffCool <= 0 && mana >= 5) { this.o.shared.input[INPUT.ATTACK] += 1; this.staffCool = 0.75; }
    }
    this.say(`Fighting ${live.length > 1 ? `${live.length} foes` : this.foeName(T)}.`);
    return true;
  }

  foeName(f) {
    if (f.slime) return 'a jelly';
    if (f.kind === 5) return f.maxHp > 150 ? 'a champion of the dead' : 'one of the risen';
    if (f.kind >= TRIPO_KIND) return `a ${GROUPS[GROUP_KEYS[f.kind - TRIPO_KIND]]?.name.toLowerCase() || 'monster'}`;
    return ['a knight of Velscour', 'a knight', 'a great crab', 'the Gravehart', 'the Bone Hydra', 'one of the risen', 'an ogre'][f.kind] || 'the Abyssal Mouth';
  }

  // ---- loot and chests

  loot(m, foes) {
    if (foes.some((f) => f.hostile && f.d < 18)) return false;
    const g = this.o.game, pack = this.o.pack;
    // (On the way somewhere: only what's close by.)
    const hunting = this.job?.kind === 'hunt';
    let best = null, bd = hunting ? 22 : 10;
    for (const d of g.drops.list) {
      if (Math.abs(d.y - m.y) > 3 || this.skipping(d) || inTown(d.x, d.z, 2) || this.kept(m, d.x, d.z)) continue;
      if (!d.auto && !d.coins && !this.roomFor(d.item)) continue;
      const k = dist(m.x, m.z, d.x, d.z);
      if (k < bd) { bd = k; best = d; }
    }
    if (best) {
      if (!this.lootT || this.lootFor !== best) { this.lootFor = best; this.lootT = this.t; }
      if (this.t - this.lootT > 9) { this.giveUp(best, 120); return false; }
      this.say(best.auto || best.coins ? 'Picking up what fell.' : 'Taking up something worth having.');
      if (!best.auto && !best.coins && bd < 1.7) {
        // E, as you'd press it; or, a step off from it, the same thing E does: a scroll read, the rest into the pack.
        if (g.nearDrop === best) g.takeNearest();
        else if (best.item.type === 'spell') {
          if (!this.o.spellbar.learn(best.item.spell)) pack.gold += 40;
          g.drops.take(best); g.onTaken?.();
        } else if (pack.add(best.item)) { g.drops.take(best); g.onTaken?.(); } else this.giveUp(best, 600);
        return true;
      }
      // (Coin, orbs and stuff come to hand within two metres; gear wants E within that.)
      this.goTo(best.x, best.z, best.auto || best.coins ? 1.1 : 1.2, false, false, m.below);
      return true;
    }
    // A chest it's near and hasn't opened.
    let ch = null, cd = hunting ? 40 : 14;
    for (const c of g.chests.list) {
      // (Not the houses' chests in the town: those are the townsfolk's.)
      if (c.open || Math.abs(c.y - m.y) > 2.5 || this.skipping(c) || inTown(c.x, c.z, 4) || this.kept(m, c.x, c.z)) continue;
      const k = dist(m.x, m.z, c.x, c.z);
      if (k < cd) { cd = k; ch = c; }
    }
    if (ch) {
      if (!this.chestT || this.chestFor !== ch) { this.chestFor = ch; this.chestT = this.t; }
      if (this.t - this.chestT > 25) { this.giveUp(ch, 600); return false; }
      this.say('Opening a chest.');
      if (cd < 2) {
        this.face = Math.atan2(ch.x - m.x, ch.z - m.z);
        this.halt();
        if (g.nearChest === ch) g.takeNearest();
        else if (cd < 1.6 && Math.abs(wrap(this.face - this.o.input.yaw)) < 0.3) { g.chests.open(ch); }
        return true;
      }
      this.goTo(ch.x, ch.z, 1.2, false, false, m.below);
      return true;
    }
    return false;
  }

  roomFor(item) {
    if (item.type === 'spell') return true;
    const p = this.o.pack, at = p.entries.length;
    if (!p.add(item)) return false;
    p.entries.splice(at, 1);
    return true;
  }

  // ---- gear

  // The best of what it carries on, gems in what has room, every few seconds.
  dress() {
    const { pack, inventory } = this.o;
    let changed = false;
    for (let pass = 0; pass < 3; pass++) {
      const base = gearScore(pack.slots);
      let best = null, gain = 0.5;
      for (const e of pack.entries) {
        const slot = SLOT_OF(e.item);
        if (!slot) continue;
        const s = gearScore({ ...pack.slots, [slot]: e.item }) - base;
        if (s > gain) { gain = s; best = e; }
      }
      if (!best) break;
      inventory.quick({ kind: 'pack', item: best.item, entry: best });
      changed = true;
    }
    // Gems: the best into whatever's worn with an open socket.
    for (const e of [...pack.entries].filter((q) => q.item.type === 'gem').sort((a, b) => this.gemWorth(b.item) - this.gemWorth(a.item))) {
      const into = ['skull', 'main', 'off'].map((s) => pack.slots[s]).find((it) => it && !(it.type === 'shield' && pack.slots.skull) && (it.gems || []).length < Math.min(it.sockets || 0, it.type === 'skull' ? 6 : 4));
      if (!into || !pack.socket(into, e.item)) continue;
      pack.remove(e);
      changed = true;
    }
    if (changed) { inventory.on.change(); inventory.render?.(); }
  }

  gemWorth(gem) { const G = GEMS[gem.kind]; return G ? G.values[gem.grade] * (WORTH[G.stat] || 0) : 0; }

  // What it won't wear: for selling.
  junk() {
    const { pack } = this.o, base = gearScore(pack.slots), sockets = ['skull', 'main', 'off'].some((s) => { const it = pack.slots[s]; return it && (it.gems || []).length < Math.min(it.sockets || 0, it.type === 'skull' ? 6 : 4); });
    return pack.entries.filter((e) => {
      const slot = SLOT_OF(e.item);
      if (slot) return gearScore({ ...pack.slots, [slot]: e.item }) <= base + 0.5;
      return e.item.type === 'gem' && !sockets;
    });
  }

  // ---- what to do next

  plan(m) {
    const prev = this.jobKey;
    const job = this.choose(m);
    const key = job ? `${job.kind}:${job.why}:${job.who ?? ''}:${job.x ?? ''}` : '';
    if (key !== prev) { this.job = job; this.jobKey = key; this.patrol = null; this.jobT = this.t; }
    else if (job && this.job) Object.assign(this.job, job);
  }

  choose(m) {
    const { townUI, pack } = this.o, Q = townUI.quests;
    const near = (x, z) => dist(m.x, m.z, x, z);
    // A seal near the way that hasn't woken: a step onto it, for the way back.
    const lands = this.o.lands;
    for (const sl of SEALS) {
      if (lands.awake.has(sl.key) || this.skipping(`seal:${sl.key}`)) continue;
      if (dist(m.x, m.z, sl.x, sl.z) < 90) { if (!this.job || this.job.why !== `seal:${sl.key}`) this.sealSince = this.t; if (this.t - (this.sealSince || this.t) > 40) { this.giveUp(`seal:${sl.key}`, 900); break; } return { kind: 'go', why: `seal:${sl.key}`, x: sl.x, z: sl.z, r: 1.6, say: `Waking the seal of ${sl.name}.` }; }
    }
    // A full pack, or a deal of things to sell: to the town.
    const junk = this.junk();
    const room = this.freeCells();
    // (Only while there's someone open to buy it: at night the town's counters are shut, and it keeps at its work.)
    const buyer = junk.length > 0 && PEOPLE.some((p, i) => TRADES[p.trade]?.buys && this.o.townUI.isOpen(i));
    const wantsTown = ((room < 10 || junk.length >= 6) && buyer) || (m.hpf < 0.45 && !this.known(SP.mend));
    // In the town, its errands: the quest talk first, then the shops.
    const errand = this.errand(m, m.town || wantsTown || townDist(m.x, m.z) < 60);
    if (errand) return errand;
    if (wantsTown && !m.town && !this.skipping('town')) return { kind: 'go', why: 'town', x: 2, z: 3, r: 6, say: room < 10 ? 'Back to Bellmourn: the pack is full.' : 'Back to Bellmourn to sell.' };
    // By night, what can only be done by night.
    if (isNight(m.hour) || m.hour >= 19.5) {
      for (const [id, lvl] of PLAN) {
        const st = Q.step(id);
        if (!st || this.skipping(`q:${id}`) || !(st.night || st.warden)) continue;
        const job = this.questJob(id, m, lvl);
        if (job) return job;
      }
    }
    // What's ready to hand in, or a word that moves a quest on: before more work.
    for (const [id, lvl] of PLAN) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
      const ready = st?.talk || st?.back || (st?.bring && (pack.mats[st.bring] || 0) >= st.n) || (s.stage === 'making' && this.o.town.day >= s.ready);
      if (!ready) continue;
      const job = this.questJob(id, m, lvl);
      if (job) return job;
    }
    // The quests, in order.
    for (const [id, lvl] of PLAN) {
      const s = Q.state(id);
      if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
      const job = this.questJob(id, m, lvl);
      if (job) return job;
    }
    // Quests not yet taken: to their givers.
    const offer = this.offerJob(m);
    if (offer) return offer;
    const all = Object.keys(RULES).every((id) => Q.done(id));
    if (all) {
      if (!this.allDone) { this.allDone = true; this.o.allDone(); }
      return this.grindJob(m, this.grind, 'grind');
    }
    // Nothing it can do yet: levels.
    void pack; void near;
    return this.grindJob(m, m.lvl >= 6 && Q.state('dead_cant_wait') ? 'catacombs' : 'woods', 'level');
  }

  freeCells() {
    const p = this.o.pack;
    let used = 0;
    for (const e of p.entries) { const s = e.item.type === 'weapon' ? 4 : e.item.type === 'shield' ? 6 : e.item.type === 'skull' ? 4 : e.item.type === 'robe' ? 4 : 1; used += s; }
    return 96 - used;
  }

  // The giver of a quest, or whoever a step's to be said to: their place in the town's list.
  personIndex(id) { return this.o.townUI.people.findIndex((p) => p.id === id); }

  questJob(id, m, lvl) {
    const Q = this.o.townUI.quests, s = Q.state(id), st = Q.step(id), q = QUESTS[id], title = q.title;
    const giver = this.personIndex(q.giver);
    if (s.stage === 'making') {
      if (this.o.town.day < s.ready) return null;
      return this.talkJob(giver, 'quest', `${title}: to collect it.`);
    }
    if (!st) return null;
    if (st.talk) {
      const who = this.personIndex(st.talk);
      if (who >= PEOPLE.length && m.lvl < lvl + (this.bump[`q:${id}`] || 0)) return null;
      return this.talkJob(who, 'quest', `${title}: a word with ${this.o.townUI.people[who]?.name}.`);
    }
    if (st.back) return this.talkJob(giver, 'quest', `${title}: back to ${this.o.townUI.people[giver]?.name}.`);
    if (st.bring) {
      if ((this.o.pack.mats[st.bring] || 0) >= st.n) return this.talkJob(giver, 'quest', `${title}: ${st.n} ${matName(st.bring, st.n)} to hand over.`);
      // Bone the woods' dead give up; iron and silk come from those buried down in the catacombs.
      const deep = st.bring !== 'bone' || (this.o.pack.mats.bone || 0) < 2;
      if (deep && Q.state('dead_cant_wait') && m.lvl >= 3) return this.grindJob(m, 'catacombs', `farm:${id}`, `${title}: ${matName(st.bring, 2).toLowerCase()} from the catacombs (${this.o.pack.mats[st.bring] || 0} of ${st.n}).`);
      // (Out of the catacombs, bone and a little iron come off the woods' dead as it grinds for levels anyway.)
      return null;
    }
    if (m.lvl < lvl + (this.bump[`q:${id}`] || 0)) return null;
    if (st.enter) {
      if (st.night && !isNight(m.hour) && !(m.hour >= 19.5)) return null;
      const a = area(st.enter);
      return { kind: 'go', why: `q:${id}`, x: a.x, z: a.z, r: a.r, below: a.below, say: `${title}: to ${st.enter === 'catacombs' ? 'the catacombs' : st.enter === 'bellcrypt' ? 'the Bell Crypt' : SITES[st.enter]?.name || st.enter}${st.night ? ', by night' : ''}.` };
    }
    if (st.visit) {
      const seen = s.seen || [];
      const left = st.visit.filter((v) => !seen.includes(v)).map((v) => ({ v, a: area(v) })).sort((a, b) => dist(m.x, m.z, a.a.x, a.a.z) - dist(m.x, m.z, b.a.x, b.a.z));
      if (!left.length) return null;
      const { v, a } = left[0];
      return { kind: 'go', why: `q:${id}`, x: a.x, z: a.z, r: Math.min(a.r, 25), say: `${title}: to ${SITES[v].name} (${seen.length} of ${st.visit.length}).` };
    }
    if (st.kill) {
      if (st.kill === 'catacombs') return this.grindJob(m, 'catacombs', `q:${id}`, `${title}: the dead below (${s.n} of ${st.n}).`);
      return { kind: 'hunt', why: `q:${id}`, spots: HUNTS[st.kill] || HUNTS.woods, say: `${title}: ${st.n - s.n} more to put down.` };
    }
    if (st.warden) {
      if (!isNight(m.hour)) return null;
      return { kind: 'hunt', why: `q:${id}`, spots: HUNTS.bellcrypt, below: true, say: `${title}: the bell's warden.` };
    }
    return null;
  }

  talkJob(i, why, say) {
    if (i < 0 || this.skipping(`p:${i}`) || !this.reachable(i)) return null;
    return { kind: 'talk', why, who: i, say };
  }

  // Someone it can walk up to now: on the ground floor (it doesn't take stairs), awake or easily woken, and not running from something.
  reachable(i) {
    const w = this.o.townUI.whereOf(i);
    if (!w) return false;
    if (w.beyond) return true;
    return !(w.busy === 12 || w.busy === 13) && (w.level | 0) <= 0 && w.y < 2.2;
  }

  offerJob(m) {
    const { townUI } = this.o, Q = townUI.quests;
    let best = null, bd = Infinity;
    for (const [id, lvl] of PLAN) {
      if (Q.state(id) || (RULES[id].needs && !Q.done(RULES[id].needs))) continue;
      const giver = this.personIndex(QUESTS[id].giver);
      if (giver < 0 || giver >= PEOPLE.length || this.skipping(`p:${giver}`) || !this.reachable(giver)) continue;
      // (Far-off work can wait till it's nearly ready for it.)
      if (m.lvl + 3 < lvl) continue;
      const w = townUI.whereOf(giver);
      if (!w) continue;
      const d = dist(m.x, m.z, w.x, w.z);
      if (d < bd) { bd = d; best = this.talkJob(giver, 'offer', `To ${townUI.people[giver].name}: there's work.`); }
    }
    return best;
  }

  // What the town's for, if it's there or near: quest talk, then selling, mending, a bed.
  errand(m, here) {
    if (!here) return null;
    const { townUI, pack } = this.o, Q = townUI.quests;
    // (The quests' own talk in the town comes through questJob and offerJob: those first, wherever it is.)
    for (const [id] of PLAN) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done') continue;
      const q = QUESTS[id], giver = this.personIndex(q.giver);
      const talkTo = st?.talk ? this.personIndex(st.talk) : (st?.back || (st?.bring && (pack.mats[st.bring] || 0) >= st.n) || (s.stage === 'making' && this.o.town.day >= s.ready)) ? giver : -1;
      if (talkTo >= 0 && talkTo < PEOPLE.length && !this.skipping(`p:${talkTo}`) && this.reachable(talkTo)) return this.talkJob(talkTo, 'quest', `${q.title}: to ${townUI.people[talkTo].name}.`);
    }
    const offer = this.offerJob(m);
    if (offer && dist(m.x, m.z, 0, 0) < 140) return offer;
    // Selling: to whoever gives most for the most of it, while they're open.
    const junk = this.junk();
    if (junk.length >= 2 || (this.freeCells() < 16 && junk.length)) {
      let best = null, most = 0;
      for (let i = 0; i < PEOPLE.length; i++) {
        const t = PEOPLE[i].trade;
        if (!TRADES[t]?.buys || this.skipping(`p:${i}`) || !townUI.isOpen(i) || !this.reachable(i)) continue;
        const sum = junk.reduce((n, e) => n + offerFor(t, e.item), 0);
        if (sum > most) { most = sum; best = i; }
      }
      if (best !== null) return { kind: 'talk', why: 'sell', who: best, say: `Selling to ${PEOPLE[best].name}.` };
    }
    // Buying: whatever an open counter has that's better than what it wears, or a spell it doesn't know, with coin to spare.
    const buy = this.shopping(m);
    if (buy) return buy;
    // Mended at the herbalist's, if it's hurt and has the coin.
    if (m.hpf < 0.7 && pack.purse() >= 12) {
      const i = PEOPLE.findIndex((p) => p.trade === 'healing');
      if (i >= 0 && townUI.isOpen(i) && !this.skipping(`p:${i}`) && this.reachable(i)) return { kind: 'talk', why: 'mend', who: i, say: `To ${PEOPLE[i].name}, to be mended.` };
    }
    // A night at the Tolling Bell: when a quest waits on tomorrow, or it's late and it's tired.
    const h = m.hour;
    const making = Object.keys(RULES).some((id) => Q.state(id)?.stage === 'making' && this.o.town.day >= 0 && this.o.town.day < Q.state(id).ready);
    const nightWork = PLAN.some(([id, lvl]) => { const st = Q.step(id); return st && (st.night || st.warden || (st.kill === 'barrows')) && m.lvl >= lvl; });
    if (h >= 18.3 && h < 23.5 && (making || (m.hpf < 0.5)) && !nightWork && pack.purse() >= 4) {
      const i = PEOPLE.findIndex((p) => p.trade === 'inn');
      if (i >= 0 && !this.skipping(`p:${i}`) && this.reachable(i)) return { kind: 'talk', why: 'bed', who: i, say: `A bed at the Tolling Bell${making ? ': a quest waits on the morning' : ''}.` };
    }
    return null;
  }

  // The best buy in the town's stock today: { kind: 'talk', why: 'buy', who, item }, or null.
  shopping(m) {
    const { townUI, pack } = this.o, purse = pack.purse(), base = gearScore(pack.slots);
    let best = null, most = 0;
    for (let i = 0; i < PEOPLE.length; i++) {
      const t = PEOPLE[i].trade;
      if (!TRADES[t]?.stock || this.skipping(`buy:${i}`) || !townUI.isOpen(i) || !this.reachable(i)) continue;
      for (const it of townUI.stockOf(t)) {
        const price = (it.type === 'spell' ? 120 : worth(it)) * 10;
        // (Never more than two thirds of what's in the purse.)
        if (price > purse * 0.66) continue;
        let gain = 0;
        if (it.type === 'spell') gain = this.known(it.spell) ? 0 : 40;
        else if (SLOT_OF(it)) gain = gearScore({ ...pack.slots, [SLOT_OF(it)]: it }) - base;
        if (gain > 3 && gain / Math.sqrt(price) > most) { most = gain / Math.sqrt(price); best = { kind: 'talk', why: 'buy', who: i, item: it, say: `Buying from ${PEOPLE[i].name}.` }; }
      }
    }
    return best;
  }

  grindJob(m, where, why, say) {
    if (where === 'catacombs') {
      if (!this.o.townUI.quests.state('dead_cant_wait')) where = 'woods';
      else {
        const sp = this.catacombSpots(m);
        if (sp.length) return { kind: 'hunt', why, spots: sp, below: true, say: say || 'Grinding in the catacombs.' };
        where = 'woods';
      }
    }
    if (where === 'lairs') {
      const ok = LAIRS.filter((l) => m.lvl >= (LAIR_LEVEL[l.key] || 10)).map((l) => [l.x, l.z]).sort((a, b) => dist(m.x, m.z, a[0], a[1]) - dist(m.x, m.z, b[0], b[1])).slice(0, 4);
      if (ok.length) return { kind: 'hunt', why, spots: ok, say: say || 'Grinding the monster lairs.' };
      where = 'woods';
    }
    if (where === 'jellies') return { kind: 'hunt', why, spots: [...HUNTS.millhaven, ...HUNTS.fen], say: say || 'Grinding the jelly camps.' };
    if (where === 'roam') {
      const sites = Object.keys(SITES).filter((k) => !this.avoid(m).some(([x, z, r]) => dist(SITES[k].x, SITES[k].z, x, z) < r)).map((k) => [SITES[k].x, SITES[k].z]);
      return { kind: 'hunt', why, spots: sites, roam: true, say: say || 'Roaming the land.' };
    }
    const lvl = m.lvl, avoid = this.avoid(m);
    const spots = HUNTS.woods.filter(([x, z]) => !avoid.some(([ax, az, r]) => dist(x, z, ax, az) < r));
    void lvl;
    return { kind: 'hunt', why, spots, say: say || 'Grinding in the woods round Bellmourn.' };
  }

  // The catacombs' spawn points it'll walk, deeper as it grows: never near the rift's Hydra.
  catacombSpots(m) {
    const from = churchAt(172, 0), n = 6 + m.lvl * 2;
    return this.nav.spawns.filter(([x, z]) => dist(x, z, HYDRA_AT[0], HYDRA_AT[1]) > 60).sort((a, b) => dist(a[0], a[1], from[0], from[1]) - dist(b[0], b[1], from[0], from[1])).slice(0, n);
  }

  // ---- doing it

  doJob(snap, m, foes) {
    const j = this.job;
    if (!j) { this.halt(); this.say('Thinking.'); return; }
    if (j.kind === 'go') {
      this.say(j.say);
      if (j.why === 'town' && m.town) { this.giveUp('town', 60); this.job = null; this.halt(); return; }
      if (dist(m.x, m.z, j.x, j.z) < j.r && (!j.below || m.below)) {
        // There: the quest moves on as the town sees it (QuestBook.where, twice a second).
        this.halt();
        if (j.why === 'town') { this.giveUp('town', 30); this.job = null; }
        else if (this.t - (this.arriveT || 0) > 6) { this.arriveT = this.t; this.giveUp(j.why, 4); this.job = null; }
        return;
      }
      this.arriveT = this.t;
      this.goTo(j.x, j.z, Math.min(j.r * 0.6, 4), true, false, !!j.below);
      return;
    }
    if (j.kind === 'talk') { this.approach(m, j); return; }
    if (j.kind === 'hunt') { this.hunt(m, j, foes); return; }
    this.halt();
  }

  hunt(m, j, foes) {
    this.say(j.say);
    const spots = j.spots.filter(([x, z]) => !this.skipping(`s:${x},${z}`));
    if (!spots.length) { for (const [x, z] of j.spots) this.skip.delete(`s:${x},${z}`); this.halt(); return; }
    if (!this.patrol || !spots.some(([x, z]) => x === this.patrol[0] && z === this.patrol[1])) {
      // The nearest first, then round the rest.
      const fresh = spots.filter((p) => !(this.lastSpots || []).includes(`${p[0]},${p[1]}`));
      const from = fresh.length ? fresh : spots;
      this.patrol = j.roam ? from[Math.floor(Math.random() * from.length)] : from.reduce((a, b) => (dist(m.x, m.z, a[0], a[1]) <= dist(m.x, m.z, b[0], b[1]) ? a : b));
      this.patrolT = 0;
    }
    const [px, pz] = this.patrol;
    if (dist(m.x, m.z, px, pz) < 4) {
      // A look round, and on to the next.
      this.halt();
      this.face = this.o.input.yaw + 0.9;
      if ((this.patrolT += 0.12) > 4) {
        (this.lastSpots ||= []).push(`${px},${pz}`);
        if (this.lastSpots.length > Math.max(1, j.spots.length - 1)) this.lastSpots.shift();
        this.patrol = null;
      }
      return;
    }
    this.goTo(px, pz, 2.5, true, false, !!j.below);
    void foes;
  }

  // Up to someone in the town, face to face, and a word.
  approach(m, j) {
    const { townUI, game } = this.o;
    const w = townUI.whereOf(j.who);
    this.say(j.say);
    if (!w || !this.reachable(j.who)) { this.giveUp(`p:${j.who}`, 60); this.job = null; return; }
    const d = dist(m.x, m.z, w.x, w.z), dy = Math.abs((w.y ?? m.y) - m.y);
    if (!j.since) j.since = this.t;
    // (Upstairs, or somewhere it can't get to: later.)
    if (this.t - j.since > 75) { this.giveUp(`p:${j.who}`, 240); this.job = null; return; }
    if (d < 2.1 && (dy < 1.3 || w.beyond)) {
      this.halt();
      this.face = Math.atan2(w.x - m.x, w.z - m.z);
      if (w.busy === 12 || w.busy === 13) { this.giveUp(`p:${j.who}`, 30); this.job = null; return; }
      if (Math.abs(wrap(this.face - this.o.input.yaw)) < 0.35 && (this.talkWait = (this.talkWait || 0) + 0.12) > 0.5) {
        this.talkWait = 0;
        if (game.nearFolk?.i === j.who) game.takeNearest(); else townUI.talk(j.who);
        if (townUI.open) this.talk = { who: j.who, why: j.why, n: 0, t: 0, shopped: false, sold: 0 };
      }
      return;
    }
    this.goTo(w.x, w.z, 1.4, d > 12, true);
  }

  // The talk panel: through the quest's lines, its offers taken, then the counter if that's what it came for.
  converse(dt, m) {
    const { townUI, pack } = this.o, T = this.talk;
    if (!T) { if ((this.loneT = (this.loneT || 0) + dt) > 4) { this.loneT = 0; townUI.close(true); } return; }
    T.t -= dt;
    if (T.t > 0) return;
    T.t = 0.75 + Math.random() * 0.4;
    if (++T.n > 40) { townUI.close(true); this.giveUp(`p:${T.who}`, 120); return; }
    const opts = townUI.view?.opts || [];
    const label = (o) => o.label;
    const at = (f) => opts.findIndex((o) => o.cls !== 'dim' && f(o));
    const id = townUI.people[T.who]?.id;
    // On through what's being said.
    let k = at((o) => ['Go on.', '...', 'To bed.'].includes(label(o)));
    // Yes to an offer.
    if (k < 0) k = at((o) => Object.values(QUESTS).some((q) => q.accept === label(o)));
    // The quest talk it came for, or anything else this person has for it.
    if (k < 0) {
      const want = this.wanted(id);
      k = at((o) => want.has(label(o)) || o.cls === 'offer');
    }
    if (k >= 0) { townUI.choose(k); return; }
    // The counter.
    if (T.why === 'sell' || T.why === 'mend' || T.why === 'bed' || T.why === 'buy') {
      const p = townUI.people[T.who], trade = TRADES[p.trade];
      if (townUI.mode !== 'shop') {
        if (T.shopped) { townUI.close(true); return; }
        const s = at((o) => label(o) === trade?.label);
        if (s < 0) { townUI.close(true); this.giveUp(`p:${T.who}`, 120); return; }
        T.shopped = true;
        townUI.choose(s);
        if (townUI.mode !== 'shop') this.giveUp(`p:${T.who}`, 300);
        return;
      }
      if (T.why === 'sell') {
        const e = this.junk().find((q) => offerFor(p.trade, q.item) > 0);
        if (e && T.sold < 30) { T.sold++; townUI.sell(e, offerFor(p.trade, e.item)); return; }
        // The satchel's bone, what no quest still wants.
        const keep = Object.keys(RULES).some((qid) => townUI.quests.state(qid)?.stage !== 'done' && RULES[qid].steps.some((s) => s.bring === 'bone'));
        if (trade.buysMats?.bone && !keep && (pack.mats.bone || 0) > 0) { townUI.sellMat('bone', trade.buysMats.bone); return; }
      } else if (T.why === 'mend' && !T.done) { T.done = true; townUI.buyGood('dressing'); return; }
      else if (T.why === 'buy' && !T.done) {
        T.done = true;
        const items = townUI.stockOf(p.trade), k = items.indexOf(this.job?.item);
        if (k >= 0) townUI.buyItem(k, (items[k].type === 'spell' ? 120 : worth(items[k])) * 10);
        this.giveUp(`buy:${T.who}`, 120);
        return;
      }
      else if (T.why === 'bed' && !T.done) {
        T.done = true;
        townUI.buyGood('bed');
        if (!townUI.open) { this.hold = 5; this.giveUp('bed', 600); }
        return;
      }
      townUI.close(true);
      if (T.why === 'sell') this.giveUp(`sell:${T.who}`, 60);
      return;
    }
    townUI.close(true);
    // (Nothing more for it here for a while.)
    if (T.why === 'offer') this.giveUp(`p:${T.who}`, 20);
    void m;
  }

  // The lines it wants to say to this person now: steps, hand-ins, what's ready, offers.
  wanted(id) {
    const { townUI, pack } = this.o, Q = townUI.quests, out = new Set();
    for (const qid of Object.keys(RULES)) {
      const s = Q.state(qid), st = Q.step(qid), q = QUESTS[qid];
      if (!s) { if (q.giver === id) out.add(q.title); continue; }
      if (s.stage === 'done') continue;
      if (st?.talk === id) out.add(st.say);
      if (q.giver !== id) continue;
      if (s.stage === 'making' && this.o.town.day >= s.ready) out.add(`${q.title}: is it ready?`);
      if (st?.back) out.add(st.say || `${q.title}: it's done.`);
      if (st?.bring && (pack.mats[st.bring] || 0) >= st.n) out.add(`Here: ${st.n} ${matName(st.bring, st.n)}.`);
    }
    return out;
  }

  // ---- getting about

  // Walks to (x, z): by the nav worker's paths on its ground, by the roads and the seals beyond it.
  goTo(x, z, near = 1, run = true, person = false, below = false) {
    this.useGoal = true;
    const g = this.goal;
    if (!g || dist(g.x, g.z, x, z) > (person ? 2.5 : 3) || !!g.below !== below) {
      this.goal = { x, z, near, run, t: this.t, below };
      this.macro = null; this.sub = null; this.subFor = null;
    } else { g.near = near; g.run = run; if (person) { g.x = x; g.z = z; } }
  }

  walk(dt, m) {
    const g = this.goal;
    if (!g || !this.useGoal || this.fighting) return;
    const d = dist(m.x, m.z, g.x, g.z);
    if (d < g.near) { this.halt(); return; }
    // The way: on the grid both ends, a path; otherwise the long way round by the roads. (Used up short of it, as when someone it's
    // walking up to has moved on: worked out again.)
    if (!this.macro || !this.macro.length) { this.macro = this.longWay(m, g); this.sub = null; this.subFor = null; }
    let W = this.macro[0];
    while (W && dist(m.x, m.z, W.x, W.z) < (W.seal ? 2.2 : W === this.macro.at(-1) ? g.near : 3.5) && !W.seal) { this.macro.shift(); this.sub = null; W = this.macro[0]; }
    if (!W) { this.halt(); return; }
    if (W.seal) {
      if (dist(m.x, m.z, W.x, W.z) < 2.2) { this.useSeal(W); return; }
    }
    let tx = W.x, tz = W.z;
    // Leaving the nav ground for somewhere past it: a path to its edge on the way, then on across country.
    let edge = null;
    if (this.nav.inGrid(m.x, m.z, m.below) && !this.nav.inGrid(W.x, W.z, !!W.below)) {
      const L = dist(m.x, m.z, W.x, W.z);
      for (let s = 0; s <= L; s += 4) {
        const x = m.x + (W.x - m.x) * s / L, z = m.z + (W.z - m.z) * s / L;
        if (!this.nav.inGrid(x, z, m.below) || Math.abs(x) > 236 || Math.abs(z) > 236) break;
        edge = { x, z };
      }
      if (edge && dist(m.x, m.z, edge.x, edge.z) < 6) edge = null;
      if (edge && this.subFor && this.subFor.edgeOf === W && dist(this.subFor.x, this.subFor.z, edge.x, edge.z) < 30) edge = this.subFor;
      else if (edge) edge.edgeOf = W;
    }
    const leg = edge || W;
    if (this.nav.inGrid(m.x, m.z, m.below) && this.nav.inGrid(leg.x, leg.z, edge ? m.below : !!W.below)) {
      // (A fresh path when the leg changes, when what it's walking to has moved, and now and then anyway.)
      if (this.subFor !== leg || (this.sub && this.t - this.subT > 12) || (this.subTo && dist(this.subTo[0], this.subTo[1], leg.x, leg.z) > 2.5)) {
        this.subFor = leg; this.sub = null; this.subT = this.t; this.subTo = [leg.x, leg.z];
        const want = leg, avoid = this.avoid(this.me(this.o.game.currentSnap()));
        this.nav.ask('path', { from: [m.x, m.z], to: [leg.x, leg.z], avoid }).then((pts) => { if (this.subFor === want) { this.sub = pts || [[want.x, want.z]]; this.subT = this.t; } });
      }
      tx = leg.x; tz = leg.z;
      if (this.sub) {
        while (this.sub.length > 1 && dist(m.x, m.z, this.sub[0][0], this.sub[0][1]) < 0.9) this.sub.shift();
        [tx, tz] = this.sub[0];
      }
      this.steer(tx - m.x, tz - m.z, g.run && d > 8);
    } else {
      // Across country: straight on, round the pines as the worker sees them.
      let hx = tx - m.x, hz = tz - m.z;
      const L = Math.hypot(hx, hz) || 1;
      hx /= L; hz /= L;
      if ((this.probeT -= dt) <= 0) {
        this.probeT = 0.25;
        this.nav.ask('probe', { x: m.x, z: m.z, y: m.y + 0.2, hx, hz, look: 5 }).then((r) => { this.probeDir = r; });
      }
      if (this.probeDir && this.probeDir[2] > 0.5) { hx = this.probeDir[0]; hz = this.probeDir[1]; }
      this.steer(hx, hz, g.run && d > 8);
    }
  }

  // The long way: straight there on the nav ground; past it, a route over the roads and across country, by the seals when
  // that's shorter, kept off the lairs and posts it isn't ready for.
  longWay(m, g) {
    const end = g;
    if (this.nav.inGrid(m.x, m.z, m.below) && this.nav.inGrid(g.x, g.z, !!g.below)) return [end];
    const direct = dist(m.x, m.z, g.x, g.z);
    const { nodes, edges } = roadNodes();
    const avoid = this.avoid(m);
    const lands = this.o.lands;
    const seals = SEALS.filter((s) => lands.awake.has(s.key));
    // The graph: the roads, here, there, and the woken seals, all on one list.
    const P = nodes.map((n) => ({ x: n.x, z: n.z })).concat([{ x: m.x, z: m.z }, end], seals.map((s) => ({ x: s.x, z: s.z, seal: s })));
    const me = nodes.length, to = me + 1, s0 = to + 1;
    const E = edges.map((l) => l.slice());
    for (let i = nodes.length; i < P.length; i++) E.push([]);
    const cost = (a, b, k) => {
      const A = P[a], B = P[b];
      let c = dist(A.x, A.z, B.x, B.z) * k;
      for (const [x, z, r] of avoid) if (dist(A.x, A.z, x, z) > r && dist(B.x, B.z, x, z) > r && segNear(A.x, A.z, B.x, B.z, x, z) < r) c += 5000;
      return c;
    };
    const join = (a, b, k) => { const c = cost(a, b, k); E[a].push([b, c]); E[b].push([a, c]); };
    for (const i of [me, to, ...seals.map((_, k) => s0 + k)]) {
      for (let j = 0; j < P.length; j++) {
        if (j === i) continue;
        const d = dist(P[i].x, P[i].z, P[j].x, P[j].z);
        if (d < 900 || (i === me && j === to)) join(i, j, 1.3);
      }
    }
    // Seal to seal: a step through.
    for (let a = 0; a < seals.length; a++) for (let b = 0; b < seals.length; b++) if (a !== b) E[s0 + a].push([s0 + b, 30]);
    // Avoided ground on the roads themselves.
    const D = new Float64Array(P.length).fill(Infinity), prev = new Int32Array(P.length).fill(-1), done = new Uint8Array(P.length);
    D[me] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < P.length; i++) if (!done[i] && D[i] < best) { best = D[i]; u = i; }
      if (u < 0 || u === to) break;
      done[u] = 1;
      for (const [v, c0] of E[u]) {
        let c = c0;
        if (u < nodes.length && v < nodes.length) for (const [x, z, r] of avoid) if (segNear(P[u].x, P[u].z, P[v].x, P[v].z, x, z) < r) c += 5000;
        if (D[u] + c < D[v]) { D[v] = D[u] + c; prev[v] = u; }
      }
    }
    if (!Number.isFinite(D[to])) return [end];
    const chain = [];
    for (let k = to; k >= 0 && k !== me; k = prev[k]) chain.push(k);
    chain.reverse();
    const out = [];
    for (let k = 0; k < chain.length; k++) {
      const i = chain[k], p = P[i];
      // A seal stepped through: stand on it, and the next point is where it lets out.
      if (p.seal && k + 1 < chain.length && P[chain[k + 1]].seal) { out.push({ x: p.x, z: p.z, seal: p.seal, to: P[chain[k + 1]].seal }); continue; }
      out.push({ x: p.x, z: p.z });
    }
    void direct;
    return out.length ? out : [end];
  }

  useSeal(W) {
    const { lands } = this.o;
    this.halt();
    this.say(`Through the seal to ${W.to.name}.`);
    if (!lands.isOpen && lands.nearSeal) { lands.use(); this.sealT = this.t; this.sealTo = W.to; return; }
    if (!lands.nearSeal) {
      // (On it but not quite: a step closer.)
      const m = this.me(this.o.game.currentSnap());
      this.steer(W.x - m.x, W.z - m.z, false);
    }
  }

  // The seal's list is up: the one it came for.
  travelling() {
    const { lands } = this.o;
    if (this.t - this.sealT < 1.2) return;
    if (this.sealTo) { const s = this.sealTo; this.sealTo = null; lands.go(s); this.macro = null; this.sub = null; return; }
    lands.close();
  }

  // ---- the hands and feet

  // Move along (ux, uz) in the world. run: break into a run (forward only). strafe: keep facing where `face` says.
  steer(ux, uz, run, strafe = false) {
    const L = Math.hypot(ux, uz);
    if (L < 1e-4) { this.want = null; return; }
    this.want = { x: ux / L, z: uz / L, run, strafe };
  }

  motor(dt, m) {
    const inp = this.o.input, a = this.auto;
    const w = this.want && this.want !== 'manual' ? this.want : null;
    // Where to look: where it's facing for a fight or a word, or where it's going.
    let yaw = this.face;
    if (yaw === null || yaw === undefined) yaw = w ? Math.atan2(w.x, w.z) : inp.yaw;
    const rate = this.fighting ? 9 : 5;
    const dy = wrap(yaw - inp.yaw);
    inp.yaw += Math.max(-rate * dt, Math.min(rate * dt, dy));
    const pitch = this.fighting || this.talk ? this.pitch : -0.06;
    inp.pitch += (Math.max(-1.2, Math.min(1.2, pitch)) - inp.pitch) * Math.min(1, dt * 6);
    if (!this.fighting && !this.talk) this.pitch = -0.06;
    if (!this.fighting && this.job?.kind !== 'talk') this.face = null;
    if (!w) { a.mx = 0; a.mz = 0; a.run = false; this.unstick(dt, m, false); return; }
    // Into the keys' frame: strafe and forward.
    const c = Math.cos(inp.yaw), s = Math.sin(inp.yaw);
    let mx = -c * w.x + s * w.z, mz = s * w.x + c * w.z;
    // Not facing the way yet (and not fighting): turn first, then go.
    if (!w.strafe && Math.abs(dy) > 1.2) { mx *= 0.25; mz *= 0.25; }
    const L = Math.max(1, Math.hypot(mx, mz));
    a.mx = mx / L; a.mz = mz / L;
    a.run = w.run && a.mz > 0.6 && m.stam > 22;
    this.unstick(dt, m, true);
    if (this.stuck.act > 0) {
      this.stuck.actT -= dt;
      const sd = this.stuck.side;
      if (this.stuck.act === 2) { a.mx = sd; a.mz = 0.3; }
      if (this.stuck.act === 3) { a.mx = sd * 0.4; a.mz = -1; }
      if (this.stuck.actT <= 0) this.stuck.act = 0;
    }
  }

  // Not getting anywhere: a door to open, a hop, a step aside, a step back, a new path; at length, something else to do.
  unstick(dt, m, moving) {
    const S = this.stuck, g = this.o.game;
    if (!moving || this.fighting) { S.t = 0; S.x = m.x; S.z = m.z; return; }
    S.t += dt;
    if (S.t < 1.4) return;
    const moved = dist(S.x, S.z, m.x, m.z);
    S.t = 0; S.x = m.x; S.z = m.z;
    if (moved > 1.2) { S.n = Math.max(0, S.n - 1); return; }
    S.n++;
    const door = g.nearDoor;
    if (door && !door.open && !g.locked(door)) { g.doors.toggle(door); return; }
    if (S.n === 1 || S.n === 4) { this.o.shared.input[INPUT.JUMP] += 1; return; }
    if (S.n === 2 || S.n === 5) { S.act = 2; S.actT = 0.8; S.side = Math.random() < 0.5 ? -1 : 1; return; }
    if (S.n === 3 || S.n === 6) { S.act = 3; S.actT = 0.6; this.sub = null; this.subFor = null; return; }
    if (S.n >= 8) {
      S.n = 0;
      // Give it up for a while: whatever it was going for.
      const j = this.job;
      if (j?.kind === 'talk') this.giveUp(`p:${j.who}`, 120);
      else if (j?.kind === 'hunt' && this.patrol) this.giveUp(`s:${this.patrol[0]},${this.patrol[1]}`, 240);
      else if (j) this.giveUp(j.why, 90);
      this.job = null; this.goal = null; this.macro = null; this.sub = null; this.patrol = null;
    }
  }

  // ---- what the menu's for

  allQuestsDone() { const Q = this.o.townUI.quests; return Object.keys(RULES).every((id) => Q.done(id)); }
}

export { inChurch };
