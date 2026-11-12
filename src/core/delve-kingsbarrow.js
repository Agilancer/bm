// The Kingsbarrow: the seventh party dungeon, inside the great mound of the Barrows on the Barrow Moor, for a party of level
// 16 and up. The mound was raised over a king, long before either letter was cut on anything. He was buried with his
// guard standing, his hounds, his queens, and the wyrm he rode, and the door was shut on all of them alive. The moor's
// lights are theirs. Lately the grave-singers have been in at the door, and what was shut in has been sung awake.
//
// Its shape is a ring: the dromos in from the door comes out on the South Walk at the head of the king's stair, and the
// seal on it, with its singers stood round it, is the first thing seen. Round it, either way, go four wide walks with a
// chamber at each corner; and out of the back of the two north chambers, at the far corners of the mound, are the two
// halls that hold the seal shut: the Warden's (a ring of standing stones) and the Ossuary (long, and in bays), with
// the Crossing on the North Walk between them. So the way to both is right round
// to the back of the mound, by the east walk or the west, and home by the other: the ring is walked once, whichever
// way, and ends where it began, at the stair, and down it to the vault.
// Three bosses: the Gravewarden (blows glance off his plate: when he lowers his head at you, get a standing stone in his
// way), the Ossuary Golem (it falls apart and its bones walk back to it from the ends of the hall: put them down on the
// way), and Ossivar, the Barrow Wyrm (the grave: stand together to share it; the pyre: stand apart; and it flies).
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it (a castle's shell: straight walls,
// level floors), src/core/delve-build.js builds what's seen (drystone bleached pale, lintels, a pale grave-light),
// src/sim/delve-fights.js has the fights. Everything is local: x east, z south of the way in. Rooms and passages keep
// to even metres.
//
// Nobody's letter is on any of it (README "The two sides"): it's older than both. No red, no black glass, no gilt sun.
import { R } from './delve-lay.js';

const rooms = [
  R('kb_door', 'the Barrow Door', 0, -2, 8, 12, 0, 8),
  R('kb_dromos', 'the Long Dromos', 0, -46, 5, 22, 0, 7, { fires: 12 }),
  R('kb_south', 'the South Walk', 0, -82, 50, 6, 0, 8, { fires: 16 }),
  R('kb_cups', "the Cup-Bearers' Rest", 44, -84, 10, 10, 0, 9),
  R('kb_east', 'the East Walk', 44, -131, 6, 53, 0, 8, { fires: 16 }),
  R('kb_queens', "the Queens' Chamber", 44, -176, 10, 10, 0, 9),
  R('kb_north', 'the North Walk', 0, -178, 50, 6, 0, 8, { fires: 16 }),
  R('kb_cross', 'the Crossing', 0, -178, 12, 10, 0, 10),
  R('kb_warden', "the Warden's Hall", 40, -212, 16, 18, 0, 14),
  R('kb_ossuary', 'the Ossuary', -40, -224, 14, 28, 0, 12),
  R('kb_hounds', 'the Hound-Grave', -44, -176, 10, 10, 0, 9),
  R('kb_west', 'the West Walk', -44, -131, 6, 53, 0, 8, { fires: 16 }),
  R('kb_shields', 'the Shield-Hall', -44, -84, 10, 10, 0, 9),
  // (The king's stair goes down eight metres going north, from the South Walk into the vault. Nothing stands on it.)
  R('kb_stair', "the King's Stair", 0, -98, 5, 12, -4, 9, { tz: 8 / 24, fires: 0 }),
  R('kb_vault', "the King's Vault", 0, -136, 24, 28, -8, 20),
];

// Passages: w is half the width, h the height.
const tunnels = [
  { pts: [[0, -14], [0, -24]], w: 3, h: 5 },
  { pts: [[0, -68], [0, -76]], w: 3, h: 5 },
  // Out of the back of the two north corner chambers: the doors of the two halls.
  { pts: [[40, -186], [40, -194]], w: 4, h: 7 },
  { pts: [[-40, -186], [-40, -196]], w: 4, h: 7 },
  // Where the barrow guard come through in the Warden's hall, and the tomb drakes in the vault (dead ends).
  { pts: [[56, -204], [61, -204]], w: 2, h: 4, dead: true, door: 'kb_warden' },
  { pts: [[56, -220], [61, -220]], w: 2, h: 4, dead: true, door: 'kb_warden' },
  { pts: [[24, -128], [29, -128]], w: 2, h: 4, dead: true, door: 'kb_vault' },
  { pts: [[-24, -144], [-29, -144]], w: 2, h: 4, dead: true, door: 'kb_vault' },
];

// The standing stones of the Warden's hall, in a ring about its middle, none of them on the way in: what there is to make
// him run into.
export const WARDEN_COLUMNS = [0, 1, 2, 3, 4, 5].map((i) => [40 + Math.round(Math.sin((i + 0.5) * Math.PI / 3) * 11), -212 - Math.round(Math.cos((i + 0.5) * Math.PI / 3) * 11)]);
// The Ossuary's bays, at its two ends, by turns: where the Golem's bones get up from, to walk back to where it fell.
export const OSSUARY_BAYS = [[-47, -201], [-47, -247], [-33, -201], [-33, -247], [-40, -249]];
// The king's bier, on its step, against the vault's far wall; the way out is behind it.
const daises = [{ x: 0, z: -152, hx: 7, hz: 3, dy: 0.4 }];
// The seal's singers, stood round the head of the king's stair.
const SINGERS_AT = [[-4, -79], [4, -79], [-4, -85], [4, -85]];

// ---- what stands in the rooms (src/core/delve-build.js draws each kind) ----------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
// The door: the slab that shut them in, split; the first of the standing dead's shields on the walls.
add('doorslab', 0, -13.4, { w: 3, h: 4.6 }); add('shields', -7.8, -4, { yaw: Math.PI / 2 }); add('shields', 7.8, -4, { yaw: -Math.PI / 2 });
// The dromos: lintelled bays the whole length of it, offerings left at their feet.
for (let z = -62; z <= -30; z += 8) { add('lintel', 0, z, { hx: 5 }); add('urn', z % 16 ? -4 : 4, z + 4); }
// The South Walk: the head of the king's stair, a ringstone either side of it, the seal's two lamps.
add('ringstone', -9, -87, { r: 0.7 }); add('ringstone', 9, -87, { r: 0.7 }); add('brazier', -8, -78.5); add('brazier', 8, -78.5);
// The walks: lintels across them, urns along them. The east walk is the guard's: his dead stood in their mail down both
// walls of it. The west is the bone-walk: stacked to head height the length of it. (Told apart at a glance, coming back.)
for (const x of [-30, -18, 18, 30]) { add('lintel', x, -82, { hz: 6 }); add('lintel', x, -178, { hz: 6 }); }
for (const z of [-158, -146, -116, -104]) { add('lintel', 44, z, { hx: 6 }); add('lintel', -44, z, { hx: 6 }); }
for (const [x, z] of [[-24, -86.5], [24, -77.5], [-28, -182.5], [30, -173.5]]) add('urn', x, z);
for (const z of [-154, -144, -118, -108]) { add('deadguard', 49.3, z, { yaw: -Math.PI / 2 }); add('deadguard', 38.7, z, { yaw: Math.PI / 2 }); }
for (const z of [-154, -108]) { add('bonestack', -49.6, z, { yaw: Math.PI / 2 }); add('bonestack', -38.4, z, { yaw: -Math.PI / 2 }); }
// The four corner chambers, each round its ringstone: the cup-bearers' benches and cups; the queens' three biers; the
// king's hounds on their sides; the shields of the guard who stood.
for (const [x, z] of [[44, -84], [44, -176], [-44, -176], [-44, -84]]) add('ringstone', x + (x > 0 ? 6 : -6), z + (z > -100 ? 6 : -6), { r: 0.6 });
add('table', 51, -90, { hx: 1, hz: 3, solid: true, rough: true }); add('gravegoods', 47, -78, { r: 1.6 }); add('urn', 37, -91);
for (const x of [47, 50, 53]) add('bier', x, -172, { hx: 0.9, hz: 2.2, solid: true });
add('gravegoods', 37, -170, { r: 1.3 });
for (let i = 0; i < 5; i++) { const a = 2.2 + i * 0.8; add('houndbones', -44 + Math.round(Math.sin(a) * 6), -176 - Math.round(Math.cos(a) * 6), { yaw: a }); }
add('shields', -53.8, -84, { yaw: Math.PI / 2 }); add('shields', -44, -93.8, { yaw: 0 }); add('urn', -50, -77);
// The Crossing: where the North Walk widens, half way between the two halls; a ringstone at each corner of it.
for (const [x, z] of [[-10, -186], [10, -186], [-10, -170], [10, -170]]) add('ringstone', x, z, { r: 0.7 });
// The Warden's hall: six standing stones in a ring, his shield-wall of the dead along the east side.
WARDEN_COLUMNS.forEach(([x, z]) => add('column', x, z, { r: 1.2, solid: true, pale: true, stone: true }));
for (const x of [30, 40, 50]) add('shields', x, -229.8, { yaw: 0 });
// The Ossuary: long, and in bays: piers of stacked bone down both walls, bones heaped in the end bays.
for (const z of [-240, -229, -218, -207]) { add('bonepier', -52, z, { hx: 2, hz: 1.2, solid: true }); add('bonepier', -28, z, { hx: 2, hz: 1.2, solid: true }); }
for (const [x, z] of OSSUARY_BAYS) add('bones', x, z, { r: 1.8 });
// The king's stair: a lintel at its head and its foot.
add('lintel', 0, -87, { hx: 5 }); add('lintel', 0, -109, { hx: 5 });
// The vault: the bier on its step against the far wall, gold at its foot, four great stones well out from the middle,
// the chains that held the wyrm lying slack.
add('bier', 0, -151.5, { hx: 2.6, hz: 1, solid: true, king: true });
add('gold', -10, -151, { r: 1.6 }); add('gold', 10, -151, { r: 1.4 }); add('gravegoods', 0, -148.6, { r: 1.2 });
for (const [x, z] of [[-15, -124], [15, -124], [-15, -146], [15, -146]]) add('column', x, z, { r: 1.3, solid: true, pale: true });
for (const [x, z] of [[-21, -116], [21, -116], [-21, -138], [21, -138]]) add('chain', x, z, { up: 9 });

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const GUARD = ['plague_knight_black', 'plague_knight_red'];
const SINGERS = ['necromancer_2', 'necromancer_3', 'necromancer_f1', 'necromancer_f2'];
const UNQUIET = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
const DRAKES = ['dragonling_undead'];
const GIANTS = ['bone_golem', 'skeleton_knight_giant'];
const OLD = ['Bone-white', 'Verdigris', 'Verdigris'];
// (The corner packs and the Crossing's stand in chambers: room to fight in. tough: a pack's own.)
const packs = [
  { key: 'kb_dromos', room: 'kb_dromos', pick: GUARD, n: 4, pal: OLD, r: 2.5, at: [0, 6], walk: [[0, -30], [0, -50]] },
  // (The seal's singers: round the head of the stair, the first thing seen out of the dromos, and fought there.)
  { key: 'kb_seal', room: 'kb_south', pick: SINGERS, n: 4, pal: ['Bone-white', 'Ashen'], tough: { hp: 11, damage: 2 }, spots: SINGERS_AT, wake: 30 },
  { key: 'kb_cups', room: 'kb_cups', pick: GUARD.concat(DRAKES), n: 5, pal: OLD, at: [0, 0], r: 4 },
  { key: 'kb_queens', room: 'kb_queens', pick: UNQUIET, n: 5, elite: SINGERS, pal: ['Bone-white', 'Ashen'], tough: { hp: 20, damage: 3.2 }, at: [0, 3], r: 4 },
  { key: 'kb_cross', room: 'kb_cross', pick: DRAKES.concat(GUARD), n: 5, elite: ['necromancer_lord', 'necromancer_lord_2'], pal: OLD, at: [0, 0], r: 4 },
  { key: 'kb_hounds', room: 'kb_hounds', pick: ['kb_hound'], n: 4, elite: GIANTS, pal: ['Bone-white'], at: [0, 2], r: 4 },
  { key: 'kb_shields', room: 'kb_shields', pick: GUARD, n: 5, pal: OLD, at: [0, 0], r: 4 },
  // (And one posted half way down each long walk, so neither is ninety metres of nothing: the guard's dead stepped out
  // of their niches in the east walk; in the west, bones that have got up off the stacks.)
  { key: 'kb_east', room: 'kb_east', pick: GUARD, n: 4, pal: ['Verdigris'], spots: [[41, -128], [47, -130], [41, -133], [47, -135]] },
  { key: 'kb_west', room: 'kb_west', pick: ['kb_thrall'], n: 3, pal: ['Bone-white'], tough: { hp: 3.2, damage: 1.4 }, spots: [[-47, -128], [-41, -131], [-47, -134]] },
];
const bosses = [
  { key: 'gravewarden', room: 'kb_warden', name: 'The Gravewarden', models: ['kb_warden'], pal: ['Verdigris'], hp: 12000, damage: 84, reach: 4.0, loot: 8 },
  { key: 'golem', room: 'kb_ossuary', name: 'The Ossuary Golem', models: ['kb_golem'], pal: ['Bone-white'], hp: 9500, damage: 78, reach: 4.2, loot: 8 },
  { key: 'wyrm', room: 'kb_vault', name: 'Ossivar, the Barrow Wyrm', models: ['kb_wyrm'], pal: ['Bone-white'], hp: 19000, damage: 94, reach: 5.4, loot: 0, needs: ['gravewarden', 'golem'], shut: 'wyr_shut' },
];
const warnings = {
  grv_open: 'The Gravewarden. Blows glance off his plate, and it knits. When he lowers his head at you, get a standing stone in his way.',
  grv_charge: 'The Gravewarden lowers his head: he is coming down the line! Whoever it follows: put a standing stone in it.',
  grv_crash: 'He strikes the stone! His plate is cracked: strike him now!',
  grv_knit: 'His plate knits. Crack it again.',
  grv_cleave: 'The Gravewarden sweeps his blade! Out of the arc.',
  grv_bash: 'He sets his shield and shoves! Out from in front of him.',
  grv_quake: 'He strikes the floor! Jump the ring as it reaches you.',
  grv_bones: 'Bone comes up through the floor! Out of its way.',
  grv_guard: 'The barrow guard! They come through the side doors: bring them down.',
  grv_turn: 'The Gravewarden turns on you! Get behind the tank, or out of his reach, till he lets go.',
  grv_enrage: 'The Gravewarden is enraged!',
  gol_open: 'The Ossuary Golem. When it falls it is not dead: its bones get up at the ends of the hall and walk back. Put them down on the way.',
  gol_slam: 'The Golem slams! Step in behind each ring as it lands.',
  gol_cage: 'A cage of ribs comes up round you! Stand in the middle of it; then get out, before the floor inside follows.',
  gol_spikes: 'Bone splits the floor! Out of the lines.',
  gol_grind: 'Bars of bone turn about it! Keep ahead of them, or get out past their ends.',
  gol_fall: 'THE GOLEM FALLS APART! Its bones get up in the end bays and walk back to it: kill them before they reach it!',
  gol_back: 'A thrall reaches the heap: the Golem will be the stronger for it.',
  gol_whole: 'The bones are together again. Every one that walked back has made it stronger.',
  gol_broken: 'Every bone is down! The Golem drags itself up with nothing left: finish it!',
  gol_turn: 'The Golem turns on you! Get behind the tank, or out of its reach, till it lets go.',
  gol_enrage: 'The Golem is enraged!',
  wyr_shut: "The king's seal holds, and the vault is empty. The two halls at the back of the mound are keeping it: round the ring, and back.",
  wyr_open: 'Ossivar, the Barrow Wyrm. Only the tank before its jaws. The grave: stand together. The pyre: stand apart.',
  wyr_breath: 'Ossivar draws breath! Only the tank in front of it!',
  wyr_rake: 'Ossivar rakes the floor! Out of the lines.',
  wyr_fall: 'The vault shakes! Out of the circles.',
  wyr_sweep: 'Ossivar swings its head round, burning! Keep ahead of the fire, or let it pass and get in behind.',
  wyr_grave: 'ONE OF YOU IS MARKED FOR THE GRAVE! It falls on all of you: stand together in the circle, and it is shared.',
  wyr_pyre: 'THE PYRE is lit on each of you! Stand apart: where two fires touch, both burn twice.',
  wyr_both: 'THE GRAVE AND THE PYRE! One of you burns: keep away from the rest. Everyone else: into the grave.',
  wyr_air: 'Ossivar is in the air! Out of each strip as it is marked: it burns the length of it.',
  wyr_whelps: 'Tomb drakes crawl out of the walls! Kill them.',
  wyr_dive: 'Ossivar dives! Out of the circle, then jump the ring.',
  wyr_land: 'Ossivar is down, and the grave-fire is in it now. End it!',
  wyr_turn: 'Ossivar turns its head to you! Get behind the tank, out of its reach, till it looks away.',
  wyr_enrage: 'Ossivar is enraged: it will bury you all!',
};

export const KINGSBARROW = {
  key: 'kingsbarrow', tag: 'kb', name: 'The Kingsbarrow', short: 'the Kingsbarrow', x: -2900, z: 6160, y: -64, level: 16, style: 'castle',
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { gravewarden: 'grv_turn', golem: 'gol_turn', wyrm: 'wyr_turn' },
  entry: { x: 0, z: 2.5, yaw: Math.PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 0, z: -159.4 },
  // At the foot of the great mound of the Barrows (SITES.barrows), on its south side, its back to the mound.
  portal: { x: -2910, z: 3439, yaw: 0, r: 2.2 },
  last: 'wyrm', tough: { hp: 8, damage: 1.7 }, pay: { xp: 5200, gold: 860 },
  names: { 'Plague Knights': 'BARROW GUARD', Necromancers: 'GRAVE-SINGER', 'Dead Children': 'THE UNQUIET', Dragonlings: 'TOMB DRAKE', 'Bone Giants': 'BONE WARDEN', Werewolf: 'BARROW HOUND' },
  look: { wall: 'pale:rubble', foot: 'rubble', floor: 'pale:stone', roof: 'rubble', flame: 'pale:flame', banner: false, lamp: 'bowl', still: true, light: [0.82, 0.95, 0.78], fire: [0.86, 1, 0.82], every: 9, high: 2.4, glow: 1.5, lit: 0.5 },
  words: { enter: 'The Kingsbarrow. They shut the door on all of them alive, and it has been sung open.', clear: 'The Kingsbarrow is cleared. Ossivar is dead!', wipe: 'Your party falls... and wakes inside the Barrow Door.' },
};
