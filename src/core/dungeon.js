// The Hollowfang Warrens: the first party dungeon. A cave system under the hills north-east of Bellmourn, dug out by kobolds
// and taken over by goblins, with Venomaw, the green dragon, asleep on her hoard at the bottom. It's entered by a portal at
// the cave mouth near the kobolds' den (PORTAL), and the Free Company's quartermaster stands beside it to hire a party from.
// It can't be done alone: the portal lets in a full party, a tank, a healer and two to do the damage, with you.
//
// Where it really is: out past the world's edge (WORLD_EDGE in src/core/lands.js), deep under the land, so nothing walking
// the surface ever comes near it and nothing in it is near anything else. The portals carry you there and back.
//
// It's shared by every thread. Its shape is a set of rooms and tunnels (ROOMS, TUNNELS, PILLARS) made into one field, worked
// out once a thread first asks: how far each point is inside the rock-free space (sdf), and the floor's height there. The
// sim's World walks against it (src/sim/world.js), the render thread builds its walls, floor and roof from it
// (src/core/sites.js caveKit), and the shaders call everything in its box underground (indoorAt, src/gfx/shaders.js).
//
// To change it: move the rooms and tunnels below; the encounters (PACKS, BOSSES) name rooms by id, so they move with them.
// Then node tools/dungeon/check.mjs walks it: every room joined, every pack and boss on the floor, the portals clear.

//
// There are three of them now, and this file is the engine for all of them: the Warrens here, Blackvigil Keep
// (src/core/delve-blackvigil.js) and the Howling Deeps (src/core/delve-deeps.js). Each is a delve: its own place out past
// the edge, its own field, box, rooms, packs, bosses and portals (DELVES). Whatever takes a world point (caveRoom,
// caveFloorY, caveKeep, roomAt...) finds the delve by where the point is, so the sim and the renderer never ask which.
// The names without a delve in them (ROOMS, PACKS, ENTRY, PORTAL, DUNGEON_BOX...) are the Warrens' own, as they always were.

import { hash2, vnoise } from './terrain-noise.js';
import { STATIONS, hallAt } from './testhall.js';
import { BLACKVIGIL } from './delve-blackvigil.js';
import { DEEPS } from './delve-deeps.js';
import { WARRENS_PROPS, WARRENS_NICHES } from './delve-warrens.js';

// Where it lies: its entrance, in the world, and the height its rooms are measured from.
export const DUNGEON = { name: 'The Hollowfang Warrens', x: 5760, z: -40, y: -50 };
// The cave mouth near the kobolds' den where its portal stands, and where the quartermaster waits. It's built into a wall
// across the hillside (src/core/sites.js portalWall), facing down the hill, the wall holding the hill back behind it: yaw is
// straight down the slope there.
export const PORTAL = { x: 128, z: -212, yaw: -0.71, r: 2.2 };
// Its terrace: half its width and depth, and where the portal stands on it, along its depth from its middle (+ is out the
// front). The hill's cut away under it and behind it (src/core/terrain.js portalCut), down to its floor, which is the hill's
// own height a little in front of the wall: so it's dug in at the back and stands out a step or two at the front.
export const PORTAL_PAD = { hu: 6.6, hw: 4.4, at: 0.2, level: 1.5 };
// (And the Test Dungeon's keeper, at the summoning counter in its hall: src/core/testhall.js.)
// (The portal's quartermaster: on its terrace, at the front to its left, clear of the dais. See src/core/sites.js portalWall.)
const BROKER_AT_PORTAL = (() => { const c = Math.cos(PORTAL.yaw), s = Math.sin(PORTAL.yaw), u = -4.6, w = 2.2; return [PORTAL.x + u * c + w * s, PORTAL.z - u * s + w * c]; })();
export const BROKER_SPOTS = { portal: BROKER_AT_PORTAL, town: [5, -2], hall: (() => { const q = STATIONS.find((t) => t.who === 'hall'); return [...hallAt(q.x, q.z), q.yaw]; })() };

// Rooms: id, middle (local: x east, z south of the entrance), radius, floor height over DUNGEON.y, how high the roof can rise.
// (rock, seam: a room's own wall, where it isn't the delve's, and a band of another colour through it.)
export const ROOMS = [
  { id: 'mouth', x: 0, z: 0, r: 9, y: 0, roof: 7, name: 'the Mouth' },
  { id: 'diggings', x: 0, z: -46, r: 14, y: -2, roof: 9, name: 'the Diggings' },
  { id: 'tallow', x: 52, z: -63, r: 13, y: -3, roof: 9, name: 'the Tallow Pit', rock: 'dark:rubble', seam: 'pale:rubble' },
  { id: 'dig', x: 52, z: -120, r: 20, y: -6, roof: 15, name: "Grubnash's Dig" },
  { id: 'warren', x: -15, z: -147, r: 14, y: -6, roof: 9, name: 'the Warren', seam: 'dark:rubble' },
  { id: 'feast', x: -62, z: -180, r: 15, y: -6, roof: 11, name: 'the Feasting Hall' },
  { id: 'throne', x: -62, z: -232, r: 19, y: -7, roof: 14, name: 'the Twin Thrones', rock: 'stone', seam: 'rubble' },
  { id: 'descent', x: 0, z: -272, r: 12, y: -14, roof: 12, name: 'the Bone Stair', rock: 'pale:rubble', seam: 'rubble' },
  { id: 'lair', x: 0, z: -334, r: 30, y: -16, roof: 24, name: "Venomaw's Hoard", rock: 'dark:rubble', seam: 'rubble' },
];
// Tunnels: a line of points (local x, z) and how wide it is either side. Their floors run between the rooms' they join.
export const TUNNELS = [
  { pts: [[0, -7], [1.5, -22], [0, -34]], w: 3.2 },
  { pts: [[11, -51], [26, -55], [41, -60]], w: 3 },
  { pts: [[52, -75], [50, -88], [52, -101]], w: 3.4 },
  { pts: [[36, -130], [18, -137], [0, -143]], w: 3 },
  { pts: [[-27, -153], [-40, -160], [-51, -170]], w: 3 },
  { pts: [[-62, -194], [-60, -204], [-62, -214]], w: 3.4 },
  { pts: [[-46, -243], [-30, -252], [-14, -262], [-5, -268]], w: 3.2 },
  { pts: [[0, -283], [1, -293], [0, -305]], w: 4.4 },
  // Grubnash's diggers' holes: dead ends off his dig, where they come out.
  { pts: [[70, -112], [80, -106]], w: 1.8, dead: true },
  { pts: [[38, -106], [30, -98]], w: 1.8, dead: true },
  { pts: [[60, -138], [66, -147]], w: 1.8, dead: true },
];
// (And the side niches of the visual pass: short blind cuts off the rooms, src/core/delve-warrens.js.)
TUNNELS.push(...WARRENS_NICHES);
// (Each tunnel's ends are carried on into the room it opens on, so a narrow place in a room's edge can't close it.)
// (The Warrens' far ends are carried on from the point before the last, as they were first dug: `old`. They're left so.)
function carryEnds(rooms, tunnels, old = false) {
  for (const t of tunnels) {
    for (const end of [0, t.pts.length - 1]) {
      const p = t.pts[end && !old ? t.pts.length - 1 : end];
      let best = null, bd = Infinity;
      for (const r of rooms) { const d = roomOut(r, p[0] - r.x, p[1] - r.z); if (d < bd) { bd = d; best = r; } }
      if (!best || bd > 5 || (t.niche && end)) continue;
      const L = Math.hypot(best.x - p[0], best.z - p[1]) || 1, go = Math.min(6, L - 2);
      const q = [p[0] + (best.x - p[0]) / L * go, p[1] + (best.z - p[1]) / L * go];
      if (end === 0) t.pts.unshift(q); else t.pts.push(q);
    }
  }
}

// Rock left standing: pillars a body can hide behind (local x, z, radius). Venomaw's hoard has a ring of them.
export const PILLARS = [
  [-5, -44, 1.3], [6, -50, 0.9], [57, -60, 1.1],
  [44, -118, 1.4], [61, -126, 1.2],
  [-70, -226, 1.3], [-56, -222, 1.3],
  [-13, -332, 2.0], [13, -332, 2.0], [-8, -320, 1.8], [8, -320, 1.8], [-17, -345, 1.9], [17, -345, 1.9],
];

// The trash, room by room: who (roster.json models), how many. They wake as you come into their room.
const KOBOLDS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
const GOBLINS = ['goblin_green_1', 'goblin_green_2', 'goblin_green_3', 'goblin_green_armored_1', 'goblin_green_armored_2'];
export const PACKS = [
  { key: 'hf_diggings', room: 'diggings', pick: KOBOLDS, n: 4, pal: ['Base', 'Base', 'Infernal'] },
  { key: 'hf_tallow', room: 'tallow', pick: KOBOLDS, n: 4, pal: ['Base', 'Abyssal'] },
  { key: 'hf_warren', room: 'warren', pick: GOBLINS, n: 4, pal: ['Base', 'Blighted'] },
  { key: 'hf_feast', room: 'feast', pick: GOBLINS.concat(KOBOLDS), n: 5, pal: ['Base', 'Ashen', 'Blighted'] },
  { key: 'hf_descent', room: 'descent', pick: ['goblin_green_armored_1', 'goblin_green_armored_2', 'kobold_armored_3'], n: 4, pal: ['Blighted', 'Corrupted'] },
];
// What a pack's monsters are to their cousins in the woods (src/sim/tripo.js optsFor): this many times the life, this many
// times the blow. They're a party's work: a pack of four takes the five of you the best part of half a minute.
export const PACK_TOUGH = { hp: 16, damage: 2.5 };
// The bosses, in the order they're met. model: roster.json (the bosses are bigger, recoloured copies of the rank and file:
// see the hf_ entries there). The fights themselves are src/sim/dungeon.js.
export const BOSSES = [
  { key: 'grubnash', room: 'dig', name: 'Grubnash the Tunnel-King', delve: 'warrens', models: ['hf_grubnash'], pal: ['Infernal'], hp: 4600, damage: 55, reach: 3.0, loot: 8 },
  { key: 'twins', room: 'throne', name: 'Skrit and Skrat', delve: 'warrens', models: ['hf_skrit', 'hf_skrat'], pal: ['Base'], hp: 3600, damage: 36, reach: 2.6, loot: 8 },
  { key: 'venomaw', room: 'lair', name: 'Venomaw, Mother of the Warren', delve: 'warrens', models: ['hf_venomaw'], pal: ['Base'], hp: 7200, damage: 70, reach: 5.2, loot: 0 },
];
// (Every boss of every delve: the others' are added below, after the Warrens', so these numbers hold.)
export const BOSS_KEYS = BOSSES.map((b) => b.key);
// What the fights call out, by number (src/sim/dungeon.js sends the number, src/ui/party.js shows the words): the mechanics,
// and what to do about each. A boss's own lines are its name and then the words.
export const WARNINGS = [
  /* 0 */ 'Grubnash brings the roof down! Get out of the circles!',
  /* 1 */ 'Grubnash calls his diggers! Kill them before they reach him: each one he eats makes him stronger.',
  /* 2 */ 'Grubnash eats a digger and grows stronger!',
  /* 3 */ 'Skrit and Skrat share their pain: keep their health even, or the weaker one shrugs your blows off.',
  /* 4 */ 'Skrit hurls firepots! Move out of the fire.',
  /* 5 */ 'Skrat spins his blades! Get away from him until he stops.',
  /* 6 */ 'One twin is down: the other goes wild! Finish him fast.',
  /* 7 */ 'Venomaw: stand at her shoulders. Her breath burns what is in front of her, her tail sweeps all behind her. Only the tank faces her.',
  /* 8 */ 'Venomaw draws breath! Only the tank in front of her!',
  /* 9 */ 'Venomaw spits acid! Move out of the green.',
  /* 10 */ 'Venomaw is in the air! When she makes for her perch, hide behind a stone pillar!',
  /* 11 */ 'Venomaw breathes across the hoard! Behind a pillar, now!',
  /* 12 */ 'Whelps hatch from the hoard! Kill them before they swarm the healer.',
  /* 13 */ 'Venomaw lands, frenzied! Burn her down!',
  /* 14 */ 'The tank is down! Healer, get them up, everyone else back off!',
  /* 15 */ 'Grubnash is enraged!',
  /* 16 */ 'Venomaw is enraged: she will kill you all!',
  /* 17 */ 'Grubnash turns on you! Get behind the tank, or out of his reach, till he lets go.',
  /* 18 */ 'A twin turns on you! Get behind the tank, or out of his reach, till he lets go.',
  /* 19 */ 'Venomaw turns her head to you! Get behind the tank, out of her reach, till she looks away.',
  /* 20 */ 'Grubnash splits the floor! Out of the lines.',
  /* 21 */ 'Grubnash hurls a boulder! Away from where it lands: it bursts.',
  /* 22 */ 'Grubnash stamps! Jump the ring as it reaches you.',
  /* 23 */ 'Skrit lights a wheel of fire! Keep ahead of its arms, or get out past their ends.',
  /* 24 */ 'Skrat marks a line: he is coming down it!',
  /* 25 */ 'Blades fly from Skrat! Stand between two.',
  /* 26 */ 'Venomaw coils her tail! Out from behind her, then jump the ring.',
  /* 27 */ 'Venomaw rakes the ground! Out of the lines.',
  /* 28 */ 'Venomaw beats her wings! Step between the gobs.',
  /* 29 */ 'Venomaw swoops! Out of the strip: she burns the length of it.',
  /* 30 */ 'Venomaw dives! Out of the circle, then jump the ring.',
  /* 31 */ 'Venom rains from the roof! Keep moving.',
  /* 32 */ 'Venomaw stamps! Step in behind each ring as it lands.',
];
// Which of those a boss calls when it turns on you (src/sim/dungeon.js turnOn).
export const TURN_WARN = { grubnash: 17, twins: 18, venomaw: 19 };

// The digger who runs from his hole to Grubnash, and the dragon's whelps.
export const ADDS = { digger: 'kobold_1', whelp: 'hf_whelp' };
// The diggers' holes (the dead-end tunnels' far ends) and Venomaw's perch when she flies (local).
export const HOLES = TUNNELS.filter((t) => t.dead).map((t) => t.pts[t.pts.length - 1]);
export const PERCH = { x: 0, z: -348, up: 3 };
// What the party needs to go in: four with you, one to take the blows, one to heal (src/sim/dungeon.js, src/ui/party.js).
export const PARTY = { size: 4, tanks: ['lancer'], healers: ['paladin'] };
export const roleOf = (cls) => (PARTY.tanks.includes(cls) ? 'tank' : PARTY.healers.includes(cls) ? 'heal' : 'dps');
// The Delve's codes, sent from the sim as EV.DELVE (code, a, b, c).
export const DELVE = { NEED: 0, ENTER: 1, LEAVE: 2, WARN: 3, BOSS: 4, BOSS_DOWN: 5, WIPE: 6, CLEAR: 7, RESET: 8 };

// Where you come in, and where the portals inside stand (local).
export const ENTRY = { x: 0, z: 3, yaw: Math.PI };
export const EXIT_IN = { x: 0, z: 6.5 };          // back out, by the way in
export const EXIT_OUT = { x: 0, z: -358 };        // out, behind Venomaw's hoard, once she's dead

// ---- the delves --------------------------------------------------------------------------------------------------------
// One per dungeon. key: what the quests and the debug call it. tag: before its portals' spots (hf_portal, hf_in, hf_out).
// x, z, y: where its entrance lies in the world, and the height its floors are measured from. level: who it's for. style:
// 'cave' (round, lumpy rooms; winding tunnels; a roof that rises to each room's middle) or 'castle' (rooms with four straight
// walls, level floors, flat roofs, straight passages). rooms, tunnels, pillars, packs: as the Warrens' above. nooks: more
// floor joined to the rooms that isn't a room of its own (an alcove, a gallery). daises: floor raised a step. props: what
// stands in the rooms (src/core/delve-build.js draws them); the solid ones are rock to the field. last: the boss whose death
// opens the way out and clears it. tough: what its packs are to their cousins in the woods. pay: what clearing it is worth.
// look: its paintings and its lights (src/core/delve-build.js, src/gfx/renderer.js).

const WARRENS = {
  key: 'warrens', tag: 'hf', name: DUNGEON.name, short: 'the Warrens', x: DUNGEON.x, z: DUNGEON.z, y: DUNGEON.y, level: 7, style: 'cave',
  rooms: ROOMS, tunnels: TUNNELS, pillars: PILLARS, packs: PACKS, props: WARRENS_PROPS,
  entry: ENTRY, exitIn: EXIT_IN, exitOut: EXIT_OUT, portal: PORTAL, last: 'venomaw', tough: PACK_TOUGH, pay: { xp: 1500, gold: 250 },
  look: { wall: 'rubble', floor: 'rubble', roof: 'dark:rubble', spike: 'dark:rubble', flame: 'flame', light: [1, 0.56, 0.24], fire: [1, 0.6, 0.28], lit: 0.5 },
  words: { enter: 'The Hollowfang Warrens. Kobolds dug it; goblins took it; something old sleeps at the bottom.', clear: 'The Hollowfang Warrens are cleared. Venomaw is dead!', wipe: "Your party falls... and wakes at the Warrens' mouth." },
};
export const DELVES = [WARRENS, BLACKVIGIL, DEEPS];
for (const d of DELVES) {
  d.nooks ||= []; d.daises ||= []; d.props ||= []; d.pillars ||= [];
  for (const r of d.rooms.concat(d.nooks)) { r.delve = d; if (r.hx !== undefined) r.r = Math.min(r.hx, r.hz); }
  for (const p of d.packs) p.delve = d.key;
  if (d !== WARRENS) carryEnds(d.rooms, d.tunnels);
}
carryEnds(ROOMS, TUNNELS, true);
// (The new delves' bosses after the Warrens', so a boss's number in BOSSES never changes; and their calls after its calls.)
export const WARN = {};
for (const d of DELVES.slice(1)) {
  for (const b of d.bosses) BOSSES.push({ ...b, delve: d.key });
  for (const [k, text] of Object.entries(d.warnings || {})) { WARN[k] = WARNINGS.length; WARNINGS.push(text); }
  for (const [k, name] of Object.entries(d.turnWarn || {})) TURN_WARN[k] = WARN[name];
}
BOSS_KEYS.push(...BOSSES.slice(BOSS_KEYS.length).map((b) => b.key));
export const ALL_PACKS = DELVES.flatMap((d) => d.packs);
export const delveByKey = (key) => DELVES.find((d) => d.key === key) || null;
// Every portal's spot (src/core/sites.js portalWall names them; src/gfx/renderer.js stands the models on them).
export const PORTAL_SPOTS = DELVES.flatMap((d) => [`${d.tag}_portal`, `${d.tag}_in`, `${d.tag}_out`]);

// ---- the field ---------------------------------------------------------------------------------------------------------

const CELL = 0.5;
const PAD = 6;
// What one count of the field's numbers is, in metres (its sdf and its floor are kept as Int16).
const UNIT = 1 / 256;
export const GRID_UNIT = UNIT;
const allRooms = DELVES.flatMap((d) => d.rooms);
const room = (id) => allRooms.find((r) => r.id === id);
export const roomOf = room;

// A room's edge isn't round: a few waves round it, the same every time.
function roomR(r, a) {
  const s = (r.seed ??= hash2(Math.round(r.x * 7), Math.round(r.z * 3)) * 6.28);
  return r.r * (1 + 0.11 * Math.sin(a * 3 + s) + 0.07 * Math.sin(a * 5 + s * 2.1) + 0.035 * Math.sin(a * 11 + s * 0.7));
}
// How far outside a room a point is (below zero inside it), by its plain shape: a circle, or four straight walls.
function roomOut(r, dx, dz) {
  if (r.hx === undefined) return Math.hypot(dx, dz) - r.r;
  const ax = Math.abs(dx) - r.hx, az = Math.abs(dz) - r.hz;
  return ax > 0 && az > 0 ? Math.hypot(ax, az) : Math.max(ax, az);
}
// The floor of a room at a point of it: level, or a stair's slope (tz: metres up for each metre south).
const roomY = (r, dz) => r.y + (r.tz || 0) * dz;
// How far a thing standing in a room reaches (a pillar [x, z, r], or a box [x, z, hx, hz]): below zero inside it.
const blockOut = (b, x, z) => (b.length > 3 ? Math.max(Math.abs(x - b[0]) - b[2], Math.abs(z - b[1]) - b[3]) : Math.hypot(x - b[0], z - b[1]) - b[2]);
const solids = (d) => d.solid || (d.solid = d.props.filter((p) => p.solid).map((p) => (p.hx !== undefined ? [p.x, p.z, p.hx, p.hz] : [p.x, p.z, p.r])));
// How far inside the open a local point is by the rock alone: the rooms, the tunnels and the pillars, without what stands
// in the rooms. (The field's own sum, a point at a time: only the roof asks, near a prop.)
function rockOut(d, x, z) {
  let f = -PAD;
  for (const r of d.rooms.concat(d.nooks)) { const v = r.hx !== undefined ? -roomOut(r, x - r.x, z - r.z) : roomR(r, Math.atan2(z - r.z, x - r.x)) - Math.hypot(x - r.x, z - r.z); if (v > f) f = v; }
  d.tunnels.forEach((t, k) => {
    let s = 0;
    const L = t.pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - t.pts[i - 1][0], p[1] - t.pts[i - 1][1]) : 0), 0);
    for (let q = 1; q < t.pts.length; q++) {
      const a = t.pts[q - 1], b = t.pts[q], sx = b[0] - a[0], sz = b[1] - a[1], len = Math.hypot(sx, sz);
      const u = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / (sx * sx + sz * sz || 1)));
      const along = (s + len * u) / L, v = t.w * (1 + 0.18 * Math.sin(along * L * 0.35 + k * 1.7) + 0.08 * Math.sin(along * L * 0.9 + k)) - Math.hypot(x - a[0] - sx * u, z - a[1] - sz * u);
      if (v > f) f = v;
      s += len;
    }
  });
  for (const b of d.pillars) { const v = Math.hypot(x - b[0], z - b[1]) - b[2] * (1 + 0.12 * Math.sin(Math.atan2(z - b[1], x - b[0]) * 4 + b[0])); if (v < f) f = v; }
  return f;
}

function extent(d) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const grow = (x, z, rx, rz) => { x0 = Math.min(x0, x - rx); x1 = Math.max(x1, x + rx); z0 = Math.min(z0, z - rz); z1 = Math.max(z1, z + rz); };
  for (const r of d.rooms.concat(d.nooks)) { if (r.hx !== undefined) grow(r.x, r.z, r.hx + 2, r.hz + 2); else grow(r.x, r.z, r.r * 1.3, r.r * 1.3); }
  for (const t of d.tunnels) for (const [x, z] of t.pts) grow(x, z, t.w * 1.4 + 2, t.w * 1.4 + 2);
  // (A castle's walls fall on the builder's two-metre cells: its field starts on an even metre.)
  const snap = d.style === 'castle' ? 2 : 1;
  return { x0: Math.floor((x0 - PAD) / snap) * snap, z0: Math.floor((z0 - PAD) / snap) * snap, x1: Math.ceil((x1 + PAD) / snap) * snap, z1: Math.ceil((z1 + PAD) / snap) * snap };
}

function build(d) {
  const { x0, z0, x1, z1 } = extent(d), cave = d.style !== 'castle';
  const ROOMS = d.rooms.concat(d.nooks), TUNNELS = d.tunnels, PILLARS = d.pillars.concat(solids(d));
  const W = Math.round((x1 - x0) / CELL) + 1, H = Math.round((z1 - z0) / CELL) + 1;
  const sdf = new Float32Array(W * H).fill(-PAD), floor = new Float32Array(W * H);
  // The tunnels' ends take their floors from the rooms they open into (or the nearest point of another tunnel).
  const tunnelY = TUNNELS.map((t) => {
    const end = (p) => {
      let best = null, bd = Infinity;
      for (const r of ROOMS) { const dd = roomOut(r, p[0] - r.x, p[1] - r.z); if (dd < bd) { bd = dd; best = roomY(r, p[1] - r.z); } }
      return best;
    };
    const a = end(t.pts[0]), b = end(t.pts[t.pts.length - 1]);
    return [a, t.niche ? a + (t.rise || 0) : b];
  });
  // Each tunnel's length along its points, for its floor's slope.
  const lens = TUNNELS.map((t) => { const s = [0]; for (let i = 1; i < t.pts.length; i++) s.push(s[i - 1] + Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])); return s; });
  // (Worked out a four-metre block at a time, each with only the rooms, passages and pillars that reach it: most of the box
  // is solid rock that nothing reaches, and three delves are built on every thread.)
  const BL = 8, span = BL * CELL;
  const segs = [];
  TUNNELS.forEach((t, k) => { for (let q = 1; q < t.pts.length; q++) segs.push([k, q, t.w * 2 + 3]); });
  for (let bj = 0; bj < H; bj += BL) for (let bi = 0; bi < W; bi += BL) {
    const ax = x0 + bi * CELL, az = z0 + bj * CELL, bx = ax + span, bz = az + span;
    const rs = ROOMS.filter((r) => { const rx = r.hx !== undefined ? r.hx + 8 : r.r * 1.3 + 6, rz = r.hx !== undefined ? r.hz + 8 : rx; return r.x + rx >= ax && r.x - rx <= bx && r.z + rz >= az && r.z - rz <= bz; });
    const ts = segs.filter(([k, q, pad]) => { const a = TUNNELS[k].pts[q - 1], b = TUNNELS[k].pts[q]; return Math.max(a[0], b[0]) + pad >= ax && Math.min(a[0], b[0]) - pad <= bx && Math.max(a[1], b[1]) + pad >= az && Math.min(a[1], b[1]) - pad <= bz; });
    if (!rs.length && !ts.length) continue;
    const ps = [];
    PILLARS.forEach((b, q) => { const reach = (b.length > 3 ? Math.max(b[2], b[3]) : b[2]) + 7; if (b[0] + reach >= ax && b[0] - reach <= bx && b[1] + reach >= az && b[1] - reach <= bz) ps.push(q); });
    for (let j = bj; j < Math.min(H, bj + BL); j++) {
      const z = z0 + j * CELL;
      for (let i = bi; i < Math.min(W, bi + BL); i++) {
        const x = x0 + i * CELL;
        let f = -PAD, wsum = 0, ysum = 0, level = 0;
        for (let q = 0; q < rs.length; q++) {
          const r = rs[q], dx = x - r.x, dz = z - r.z;
          let v;
          if (r.hx !== undefined) {
            if (Math.abs(dx) > r.hx + 8 || Math.abs(dz) > r.hz + 8) continue;
            v = -roomOut(r, dx, dz);
          } else {
            if (Math.abs(dx) > r.r * 1.3 + 6 || Math.abs(dz) > r.r * 1.3 + 6) continue;
            v = (cave ? roomR(r, Math.atan2(dz, dx)) : r.r) - Math.hypot(dx, dz);
          }
          if (v > f) f = v;
          const w = Math.exp(Math.min(v, 8) * 0.9);
          wsum += w; ysum += w * roomY(r, dz);
          if (r.flat) level += w;
        }
        for (let n = 0; n < ts.length; n++) {
          const k = ts[n][0], q = ts[n][1], pad = ts[n][2], t = TUNNELS[k], s = lens[k], L = s[s.length - 1];
          const a = t.pts[q - 1], b = t.pts[q];
          if (x < Math.min(a[0], b[0]) - pad || x > Math.max(a[0], b[0]) + pad || z < Math.min(a[1], b[1]) - pad || z > Math.max(a[1], b[1]) + pad) continue;
          const sx = b[0] - a[0], sz = b[1] - a[1];
          const u = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / (sx * sx + sz * sz || 1)));
          const dd = Math.hypot(x - a[0] - sx * u, z - a[1] - sz * u);
          const along = (s[q - 1] + (s[q] - s[q - 1]) * u) / L;
          const w0 = cave ? t.w * (1 + 0.18 * Math.sin(along * L * 0.35 + k * 1.7) + 0.08 * Math.sin(along * L * 0.9 + k)) : t.w;
          const v = w0 - dd;
          if (v > f) f = v;
          const w = Math.exp(Math.min(v, 8) * 0.9) * 0.7;
          wsum += w; ysum += w * (tunnelY[k][0] + (tunnelY[k][1] - tunnelY[k][0]) * along);
        }
        for (let n = 0; n < ps.length; n++) {
          const q = ps[n], b = PILLARS[q], px = b[0], pz = b[1];
          const v = b.length > 3 || !cave || q >= d.pillars.length ? blockOut(b, x, z) : Math.hypot(x - px, z - pz) - b[2] * (1 + 0.12 * Math.sin(Math.atan2(z - pz, x - px) * 4 + px));
          if (v < f) f = v;
        }
        const k = j * W + i;
        sdf[k] = Math.max(-PAD, f);
        // A little give in the floor, lumps and hollows, worn smooth near the middle of a way. (None where it's laid in
        // flags, or is a lake's ice.)
        const rough = cave ? 0.35 * (1 - (wsum > 0 ? level / wsum : 0)) : 0;
        floor[k] = (wsum > 0 ? ysum / wsum : 0) + (rough ? (vnoise(x * 0.31, z * 0.31) - 0.5) * rough * Math.min(1, Math.max(0, 1.5 - f * 0.25)) : 0);
      }
    }
  }
  // Floor raised a step or two: a dais, a gallery's alcove.
  for (const s of d.daises) {
    const i0 = Math.max(0, Math.ceil((s.x - s.hx - x0) / CELL)), i1 = Math.min(W - 1, Math.floor((s.x + s.hx - x0) / CELL));
    const j0 = Math.max(0, Math.ceil((s.z - s.hz - z0) / CELL)), j1 = Math.min(H - 1, Math.floor((s.z + s.hz - z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) floor[j * W + i] += s.dy;
  }
  // Smooth the floor a few times, so the slopes between levels are walked, not stepped.
  const tmp = new Float32Array(W * H);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const k = j * W + i;
      tmp[k] = (floor[k] * 4 + floor[k - 1] + floor[k + 1] + floor[k - W] + floor[k + W]) / 8;
    }
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) floor[j * W + i] = tmp[j * W + i];
  }
  // (Kept as whole numbers of UNIT, 4 mm: half the memory, on every thread that walks or draws it.)
  const pack = (a) => { const o = new Int16Array(a.length); for (let k = 0; k < a.length; k++) o[k] = Math.round(Math.max(-120, Math.min(120, a[k])) / UNIT); return o; };
  const G = { x0: d.x + x0, z0: d.z + z0, W, H, sdf: pack(sdf), floor: pack(floor) };
  G.x1 = G.x0 + (W - 1) * CELL; G.z1 = G.z0 + (H - 1) * CELL;
  return (d.G = G);
}

export const grid = (d = WARRENS) => d.G || build(d);
export const DUNGEON_CELL = CELL;

// The box each lies in, in the world (from the layout alone, without building the field): for the shaders, the map, a
// quick test. Kept generous.
for (const d of DELVES) {
  const e = extent(d);
  d.box = { x0: d.x + e.x0 - 4, z0: d.z + e.z0 - 4, x1: d.x + e.x1 + 4, z1: d.z + e.z1 + 4, y0: d.y - 40, y1: d.y + 50 };
}
export const DUNGEON_BOX = WARRENS.box;

// Which delve a world point is inside: the delve itself, or its key; null out under the sky.
export function delveOf(x, z) {
  for (let i = 0; i < DELVES.length; i++) { const b = DELVES[i].box; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return DELVES[i]; }
  return null;
}
export const delveAt = (x, z) => delveOf(x, z)?.key ?? null;
export const inDungeon = (x, z) => delveOf(x, z) !== null;

function sample(d, arr, x, z) {
  const g = d.G || build(d);
  const u = Math.max(0, Math.min(g.W - 1.001, (x - g.x0) / CELL)), v = Math.max(0, Math.min(g.H - 1.001, (z - g.z0) / CELL));
  const i = u | 0, j = v | 0, a = u - i, b = v - j, k = j * g.W + i;
  return ((arr[k] * (1 - a) + arr[k + 1] * a) * (1 - b) + (arr[k + g.W] * (1 - a) + arr[k + g.W + 1] * a) * b) * UNIT;
}

// How far inside the open cave a point is (metres; below zero is in the rock).
export const caveRoom = (x, z) => { const d = delveOf(x, z) || WARRENS; return sample(d, (d.G || build(d)).sdf, x, z); };
// The floor under a point, in the world.
export const caveFloorY = (x, z) => { const d = delveOf(x, z) || WARRENS; return d.y + sample(d, (d.G || build(d)).floor, x, z); };
// The roof over a point. In a cave: low at the walls, rising to the room's own height toward its middle. In a castle: each
// room's own, level from wall to wall, and a passage's (h, or five metres) between them.
export function caveRoofY(x, z) {
  const d = delveOf(x, z) || WARRENS, lx = x - d.x, lz = z - d.z;
  if (d.style === 'castle') {
    let top = 0;
    for (const r of d.rooms.concat(d.nooks)) if (roomOut(r, lx - r.x, lz - r.z) < 0.3) top = Math.max(top, r.roof);
    if (!top) {
      let bd = Infinity;
      for (const t of d.tunnels) for (let q = 1; q < t.pts.length; q++) {
        const a = t.pts[q - 1], b = t.pts[q], sx = b[0] - a[0], sz = b[1] - a[1];
        const u = Math.max(0, Math.min(1, ((lx - a[0]) * sx + (lz - a[1]) * sz) / (sx * sx + sz * sz || 1)));
        const dd = Math.hypot(lx - a[0] - sx * u, lz - a[1] - sz * u) - t.w;
        if (dd < bd) { bd = dd; top = t.h || 5; }
      }
    }
    return caveFloorY(x, z) + top;
  }
  // (Near something that stands in a room the field is that thing's, so the rock's own distance is worked out again:
  // a vat or a table doesn't pull the roof down onto itself. A pillar of ice does: it's left to.)
  const near = solids(d).some((b) => !b.pulls && blockOut(b, lx, lz) < 4);
  const dist = Math.max(0, near ? rockOut(d, lx, lz) : caveRoom(x, z));
  let top = 6;
  for (const r of d.rooms) { const dd = Math.hypot(lx - r.x, lz - r.z); if (dd < r.r * 1.3) top = Math.max(top, r.roof * (1 - Math.max(0, dd - r.r * 0.3) / (r.r * 1.0)) + 3); }
  return caveFloorY(x, z) + Math.min(top, 3.2 + dist * 0.9 + (vnoise(x * 0.17, z * 0.17) - 0.5) * 1.2);
}

// Push a body of radius r out of the rock, along the way out. True if it was pushed.
export function caveKeep(out, r) {
  let hit = false;
  for (let pass = 0; pass < 3; pass++) {
    const x = out[0], z = out[2], d = caveRoom(x, z);
    if (d >= r) break;
    const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e);
    const L = Math.hypot(gx, gz);
    if (L < 1e-5) break;
    const push = Math.min(2, r - d + 0.01);
    out[0] = x + gx / L * push; out[2] = z + gz / L * push;
    hit = true;
  }
  return hit;
}

// Whether a straight line along the ground stays in the open (sight, a shot, a breath): stepped along the field.
export function caveClear(ax, az, bx, bz, pad = 0.05) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.35);
  for (let i = 1; i < n; i++) { const t = i / n; if (caveRoom(ax + (bx - ax) * t, az + (bz - az) * t) < pad) return false; }
  return true;
}
// How far a ray goes along the ground before the rock, or -1 if it doesn't meet it within maxT.
export function caveRay(ox, oz, dx, dz, maxT) {
  const flat = Math.hypot(dx, dz);
  if (flat < 1e-5) return -1;
  for (let s = 0.3; s <= maxT; s += 0.3) if (caveRoom(ox + dx * s, oz + dz * s) < 0.02) return s;
  return -1;
}

// A local point in the world (the Warrens', unless another delve is named).
export const toWorld = (x, z, d = WARRENS) => [d.x + x, d.z + z];
export const roomAt = (x, z) => {
  const d = delveOf(x, z);
  if (!d) return null;
  let best = null, bd = Infinity;
  for (const r of d.rooms) { const dd = roomOut(r, x - d.x - r.x, z - d.z - r.z); if (dd < bd) { bd = dd; best = r; } }
  return bd < 2 ? best : null;
};
// The middle of a room, in the world, on its floor. (And a point of it, so far east and south of its middle.)
export function roomSpot(id, dx = 0, dz = 0) { const r = room(id), x = r.delve.x + r.x + dx, z = r.delve.z + r.z + dz; return [x, caveFloorY(x, z), z]; }
// The points round a room's wall, every `step` metres, a little in from it (local).
function roomEdge(r, step, inset) {
  const out = [];
  if (r.hx === undefined) {
    const n = Math.max(5, Math.round(r.r * 6.28 / step));
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * 6.28; out.push([r.x + Math.cos(a) * r.r * inset, r.z + Math.sin(a) * r.r * inset]); }
    return out;
  }
  const hx = r.hx - (inset > 1 ? inset : 1.5), hz = r.hz - (inset > 1 ? inset : 1.5);
  for (const [ax, az, bx, bz] of [[-hx, -hz, hx, -hz], [hx, -hz, hx, hz], [hx, hz, -hx, hz], [-hx, hz, -hx, -hz]]) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; out.push([r.x + ax + (bx - ax) * u, r.z + az + (bz - az) * u]); }
  }
  return out;
}

// Torches on the walls: every so far along each room's edge and down each tunnel, a little in from the rock. [x, y, z, nx, nz]
// (nx, nz: the way out from the wall). The same on every thread, so what's drawn is what's lit. (In the Deeps they're
// shards of ice with a cold light in them: the delve's look says.)
export function torches(d = WARRENS) {
  if (d.torches) return d.torches;
  const TORCHES = d.torches = [], every = d.look.every || 7, high = d.look.high || 2.3;
  const place = (x, z) => {
    // Find the wall: step out from (x, z) toward the rock along the field's fall.
    for (let k = 0; k < 20; k++) {
      const dd = caveRoom(x, z);
      if (dd < 0.6) break;
      const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
      x -= gx / L * (dd - 0.45); z -= gz / L * (dd - 0.45);
    }
    const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
    if (caveRoom(x, z) < 0.2 || caveRoom(x, z) > 1.2) return;
    // (Not on a table or a pew: on the wall.)
    if (solids(d).some((b) => blockOut(b, x - d.x, z - d.z) < 0.9)) return;
    if (TORCHES.some((t) => Math.hypot(t[0] - x, t[2] - z) < every * 0.6)) return;
    TORCHES.push([x, caveFloorY(x, z) + high, z, gx / L, gz / L]);
  };
  // (A torch every seven metres or so round each room's wall, and every six down the tunnels.)
  for (const r of d.rooms) for (const [lx, lz] of roomEdge(r, every, 0.6)) place(d.x + lx, d.z + lz);
  for (const t of d.tunnels) {
    if (t.dead || t.niche) continue;
    for (let q = 1; q < t.pts.length; q++) {
      const a = t.pts[q - 1], b = t.pts[q], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      for (let s = 3; s < L; s += 6) {
        const side = (Math.round(s) + q) % 2 ? 1 : -1;
        place(d.x + a[0] + (b[0] - a[0]) * s / L + nx * side, d.z + a[1] + (b[1] - a[1]) * s / L + nz * side);
      }
    }
  }
  return TORCHES;
}

// The things in a room that burn (props, by kind), and how high over the floor each one's light is (a chandelier's is its own).
const LIT = { brazier: 1.9, chandelier: null, hearth: 1.2, spit: 1 };
// Braziers standing round the bigger rooms, a couple of strides out from the wall between its torches: fires on posts
// that light the floor where the fighting is (src/core/delve-build.js builds them, src/gfx/renderer.js lights them). Clear
// of the portals and the way in. And the ones a room's own things ask for (a prop of kind 'brazier'). [x, floor y, z]
export function braziers(d = WARRENS) {
  if (d.braziers) return d.braziers;
  const BRAZIERS = d.braziers = [];
  const keep = [d.entry, d.exitIn, d.exitOut].map((q) => [d.x + q.x, d.z + q.z]);
  // (A brazier as any other; the rest build their own fires, and say how high over the floor their light is.)
  for (const p of d.props) if (p.kind in LIT) BRAZIERS.push(p.kind === 'brazier' ? [d.x + p.x, caveFloorY(d.x + p.x, d.z + p.z), d.z + p.z] : [d.x + p.x, caveFloorY(d.x + p.x, d.z + p.z), d.z + p.z, LIT[p.kind] ?? p.up]);
  for (const r of d.rooms) {
    if (r.fires === 0) continue;
    if (r.hx !== undefined) {
      // A room with straight walls: one every ten metres or so along them, two strides in, and none before a door.
      for (const [lx, lz] of roomEdge(r, r.fires || 10, 2.2)) {
        const x = d.x + lx, z = d.z + lz, ox = Math.abs(lx - r.x) > r.hx - 2.3 ? Math.sign(lx - r.x) : 0, oz = ox ? 0 : Math.sign(lz - r.z);
        if (caveRoom(x + ox * 5, z + oz * 5) > -0.5 || caveRoom(x, z) < 1.6) continue;
        if (keep.some(([kx, kz]) => Math.hypot(kx - x, kz - z) < 6) || BRAZIERS.some((b) => Math.hypot(b[0] - x, b[2] - z) < 5)) continue;
        BRAZIERS.push([x, caveFloorY(x, z), z]);
      }
      continue;
    }
    if (r.r < 9) continue;
    const n = r.r >= 25 ? 6 : r.r >= 14 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.25) / n * 6.28;
      let x = d.x + r.x + Math.cos(a) * r.r * 0.5, z = d.z + r.z + Math.sin(a) * r.r * 0.5;
      // Out toward the rock till it's two metres off it.
      for (let k = 0; k < 60 && caveRoom(x, z) > 2.2; k++) {
        const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
        x -= gx / L * 0.5; z -= gz / L * 0.5;
      }
      const dd = caveRoom(x, z);
      if (dd < 1.6 || dd > 2.8) continue;
      if (keep.some(([kx, kz]) => Math.hypot(kx - x, kz - z) < 6)) continue;
      if (BRAZIERS.some((b) => Math.hypot(b[0] - x, b[2] - z) < 5)) continue;
      BRAZIERS.push([x, caveFloorY(x, z), z]);
    }
  }
  return BRAZIERS;
}

// ---- the dungeon's flow field, for whatever chases or follows inside it ---------------------------------------------------
// A metre grid over a delve's box, the cells too near the rock for a body shut. Fields are made to a goal, shared by everyone
// going to the same place (a goal is rounded to two metres), a few kept at a time. One for each delve (the Warrens', unless
// another is named): src/sim/world.js keeps the one for wherever it's asked about.

export class CaveNav {
  constructor(d = WARRENS) {
    const g = grid(d);
    this.delve = d;
    this.cell = 1; this.x0 = g.x0; this.z0 = g.z0;
    this.W = Math.floor((g.x1 - g.x0) / this.cell); this.H = Math.floor((g.z1 - g.z0) / this.cell);
    this.block = new Uint8Array(this.W * this.H);
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) this.block[j * this.W + i] = caveRoom(this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell) < 0.55 ? 1 : 0;
    this.fields = new Map();
    this.queue = new Int32Array(this.W * this.H);
  }

  cellOf(x, z) {
    const i = Math.max(0, Math.min(this.W - 1, Math.floor((x - this.x0) / this.cell))), j = Math.max(0, Math.min(this.H - 1, Math.floor((z - this.z0) / this.cell)));
    return j * this.W + i;
  }

  field(tx, tz, now) {
    const key = Math.round(tx / 2) * 100003 + Math.round(tz / 2);
    let f = this.fields.get(key);
    if (f && now - f.t < 3) { this.fields.delete(key); this.fields.set(key, f); return f.d; }
    const d = f?.d || new Float32Array(this.W * this.H);
    d.fill(1e9);
    let start = this.cellOf(tx, tz);
    // (A goal against the rock: the nearest open cell to it.)
    if (this.block[start]) {
      let best = -1, bd = 1e9;
      const si = start % this.W, sj = (start / this.W) | 0;
      for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
        const i = si + di, j = sj + dj;
        if (i < 0 || j < 0 || i >= this.W || j >= this.H || this.block[j * this.W + i]) continue;
        if (di * di + dj * dj < bd) { bd = di * di + dj * dj; best = j * this.W + i; }
      }
      if (best >= 0) start = best;
    }
    const q = this.queue, W = this.W, H = this.H, B = this.block;
    // (The queue goes round: a cell in a wide room is put on it more than once, and a great cavern would run off its end.)
    const N = q.length;
    let head = 0, tail = 0;
    q[tail++] = start; d[start] = 0;
    while (head !== tail) {
      const k = q[head], i = k % W, j = (k / W) | 0, dk = d[k];
      head = (head + 1) % N;
      if (dk > 1600) continue;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nk = nj * W + ni;
        if (B[nk] || (di && dj && (B[j * W + ni] || B[nj * W + i]))) continue;
        const nd = dk + (di && dj ? 1.414 : 1);
        if (nd < d[nk] - 1e-3) { d[nk] = nd; q[tail] = nk; tail = (tail + 1) % N; }
      }
    }
    if (f) this.fields.delete(key);
    this.fields.set(key, { d, t: now });
    while (this.fields.size > 10) this.fields.delete(this.fields.keys().next().value);
    return d;
  }

  // The way to go from (x, z) toward (tx, tz): straight when the way's open, else down the field.
  flow(out, x, z, tx, tz, now) {
    const L = Math.hypot(tx - x, tz - z) || 1;
    if (L < 1.2 || caveClear(x, z, tx, tz, 0.5)) { out[0] = (tx - x) / L; out[1] = (tz - z) / L; return out; }
    const d = this.field(tx, tz, now), W = this.W;
    const k = this.cellOf(x, z), i = k % W, j = (k / W) | 0;
    let best = d[k], bx = (tx - x) / L, bz = (tz - z) / L;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= this.H) continue;
      const v = d[nj * W + ni] + (di && dj ? 0.414 : 0);
      if (v < best - 0.01) { best = v; bx = di; bz = dj; }
    }
    // (Out of the grid's reach, or on a shut cell: back out from the rock first.)
    if (best >= 1e8 || this.block[k]) {
      const e = 0.3, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e);
      if (Math.hypot(gx, gz) > 1e-4) { bx = gx; bz = gz; }
    }
    const l = Math.hypot(bx, bz) || 1;
    out[0] = bx / l; out[1] = bz / l;
    return out;
  }

  // How far, walking, from one point to another (metres), or Infinity.
  walkDist(x, z, tx, tz, now) {
    const d = this.field(tx, tz, now)[this.cellOf(x, z)];
    return d >= 1e8 ? Infinity : d;
  }
}
