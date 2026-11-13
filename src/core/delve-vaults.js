// The Drowned Vaults: the fourth party dungeon, under the Sunken Mile in the Weeping Fen, for a party of level 9 and up. The
// old causeway had a toll, and the toll had a strongroom cut into the one hard rock in all that mire; when the causeway
// sank the fen came in after it. What the Mile dragged down is still down there, standing in the water: the drowned, the
// mudlarks that pick them over, the drakes that came up the drains. And under all of it, in the sump the whole place
// drains to, the thing whose burrowing sank the causeway in the first place.
//
// Its shape is a coil: the rooms wind once round the Sump, close in against it, down and inward, and the last way into it
// is the sluice's own race, short and wide, so the water you've been circling is seen from the gate. One long gallery
// (the mudlarks work the length of it) and the rest short. Three of the rooms on the way round have a crack cut toward
// the Sump: blind, but its light comes up them. And all the way round there are signs of what's in it before it's met:
// its bores, round and smooth and falling away, and the holes it has left in the floors.
// Three bosses, each with something of the water in it: the Bloat (he swells, and bursts: be behind rock), Mother Sallow
// the Tidecaller (the tide comes in: be on the high rock), and the Leviathan of the Mile (it goes under the mud and comes
// up beneath you, and where it has come up the floor is gone).
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it (a cave), src/core/delve-build.js
// builds what's seen (wet green-black rock, standing water, corpse-lights), src/sim/delve-fights.js has the fights.
// Everything is local: x east, z south of the way in, y over the delve's own height.
//
// Nobody's letter is on any of it (README "The two sides"): a toll and its strongroom, plain folk's.
import { C, at, link, niche } from './delve-lay.js';

const rooms = [
  C('dv_stair', 'the Sunken Stair', 2, 18, 9, 0, 7, { rock: 'mire:course', seam: 'mire:block', ground: 'mire:flags' }),
  C('dv_toll', 'the Drowned Toll', -18, -22, 14, -2, 10, { rock: 'mire:course', seam: 'mire:rubble', ground: 'mire:flags' }),
  C('dv_reeds', 'the Reed Galleries', -34, -112, 13, -5, 9, { seam: 'pale:rubble' }),
  C('dv_wallow', "the Bloat's Wallow", -36, -170, 21, -8, 15, { rock: 'mire:stone', seam: 'mire:rubble' }),
  C('dv_cistern', 'the Great Cistern', 14, -192, 16, -11, 13, { rock: 'mire:block', seam: 'mire:course', ground: 'mire:flags' }),
  C('dv_strong', 'the Strongroom', 14, -226, 10, -11, 8, { rock: 'mire:ashlar', seam: 'mire:block', ground: 'mire:flags' }),
  C('dv_tide', 'the Tidehall', 72, -166, 23, -14, 17, { flat: true, rock: 'mire:block', seam: 'mire:ashlar' }),
  C('dv_sluice', 'the Sluice', 64, -108, 12, -18, 10, { rock: 'mire:course', seam: 'mire:block', ground: 'mire:course' }),
  C('dv_sump', 'the Sump', 14, -132, 25, -22, 24, { flat: true, rock: 'mire:stone', seam: 'pale:rubble' }),
];
// The Sump's other half: it lies along the line the causeway fell through, longer than it's wide.
const nooks = [C('dv_sump_south', 'the Sump', 12, -106, 18, -22, 20, { flat: true })];
const tunnels = [
  // (Down off the stair the toll is the first thing there is: no walk before the first of them.)
  link(rooms, 'dv_stair', 'dv_toll', 2, 3.4),
  // The long gallery: the one real walk in the place, bored round and smooth by something that wasn't a mason, and the
  // mudlarks work the far half of it.
  link(rooms, 'dv_toll', 'dv_reeds', -10, 4),
  link(rooms, 'dv_reeds', 'dv_wallow', 4, 3.2),
  link(rooms, 'dv_wallow', 'dv_cistern', -4, 3.2),
  link(rooms, 'dv_cistern', 'dv_strong', 0, 2.4),
  link(rooms, 'dv_cistern', 'dv_tide', -5, 3.2),
  link(rooms, 'dv_tide', 'dv_sluice', 4, 3),
  // The sluice's own race: short and wide, so the Sump is seen from its gate.
  link(rooms, 'dv_sluice', 'dv_sump', 0, 5.5),
  // The drains Mother Sallow's drowned climb out of (dead ends off her hall, either side of where she stands for the tide).
  { pts: [at(rooms, 'dv_tide', 0.9, 0.9), at(rooms, 'dv_tide', 1.4, 0.9)], w: 1.9, dead: true },
  { pts: [at(rooms, 'dv_tide', 0.9, 5.6), at(rooms, 'dv_tide', 1.4, 5.6)], w: 1.9, dead: true },
  // The drains: the Reed Galleries and the Great Cistern each have one cut right through to the Sump, falling steeply to
  // its water, with the toll's old iron across its head and its foot (the grates, below): nothing goes down it or up it, but what's down there is
  // seen from here, long before the sluice. Unlit, so the Sump's own light is what shows at the bottom.
  // (Written from the Sump up, as blind cuts are, so each one's head comes out level with its room's floor and all of
  // the fall is beyond the bars: rise is the room's floor over the Sump's.)
  { pts: [[-4, -112], at(rooms, 'dv_reeds', 0.9, 1.57)], w: 2.1, niche: true, rise: 17, dark: true, drain: true },
  { pts: [[14, -158], at(rooms, 'dv_cistern', 0.9, 3.14)], w: 2.1, niche: true, rise: 11, dark: true, drain: true },
  // And the Wallow's crack toward it, which is blind: as far as the rock would let the water go.
  niche(rooms, 'dv_wallow', 2.22, 10, 1.8, { rise: -3 }),
  // And its bores: round, wide and falling steeply away, where the thing in the Sump came up to look and went back.
  { pts: [[-16.5, -62], [-6, -66], [2, -72]], w: 2.8, niche: true, rise: -5 },
  niche(rooms, 'dv_toll', 1.2, 9, 3.4, { rise: -4 }),
  // Blind cuts and washed-out pockets off the rooms (nothing in them but the look of them).
  niche(rooms, 'dv_toll', 5.0, 7, 1.6, { rise: 0.6 }),
  niche(rooms, 'dv_reeds', 4.6, 8, 1.5),
  niche(rooms, 'dv_wallow', 5.2, 8, 1.7, { rise: 0.8 }),
  niche(rooms, 'dv_tide', 2.4, 7, 1.6),
  niche(rooms, 'dv_sluice', 1.2, 7, 1.5, { rise: 1 }),
];
// Rock left standing. In the Wallow: four stacks to be behind when the Bloat bursts. In the Sump: the causeway's piers, in
// the line it fell through, north to south down the length of the water.
const pillars = [
  [-46, -163, 1.5], [-27, -161, 1.4], [-45, -180, 1.4], [-26, -179, 1.5],
  [22, -150, 1.8], [22, -138, 1.7], [6, -124, 1.9], [20, -112, 1.8], [6, -100, 1.7],
];
// The high rock of the Tidehall, a step up out of the water, off to the south-west of the hall's middle: what's dry when
// the tide's in.
export const TIDE_ROCK = { x: 65, z: -159, r: 8 };
const daises = [{ x: TIDE_ROCK.x, z: TIDE_ROCK.z, r: TIDE_ROCK.r, dy: 0.6 }];
// Where Mother Sallow stands to call it: against the hall's north wall, between her two drains.
export const TIDE_STAND = at(rooms, 'dv_tide', 0.72, 0);

// ---- what stands in the rooms (src/core/delve-build.js draws each kind) ----------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
const near = (id, far, a) => at(rooms, id, far, a);
// The stair: the causeway's own slabs, tipped down into the dark; the first water.
for (const [x, z, yaw, tip] of [[-2, 15, 0.3, 0.5], [6.5, 19, 1.2, 0.8], [3, 12, 2.2, 0.3]]) add('slab', x, z, { yaw, tip });
add('pool', -3.5, 21, { r: 2.2 });
// The Drowned Toll: the toll's own gear where the water left it: the bar, the scales' table, strongboxes, a boat's ribs.
// (Its water lies to the north-east, the Sump's side, as every room's does; and the first of the holes: a ring of floor
// gone soft and dark, as wide as a cart. There are more of them the further round you go.)
add('tollbar', -18, -13, { yaw: 0.3, w: 5 });
add('table', -26, -26, { hx: 2.6, hz: 1, solid: true, rough: true });
add('crates', -22, -32); add('barrels', -27, -17);
add('wreck', -12, -16, { yaw: 2.2, s: 1 });
add('pool', -12, -27, { r: 5 }); add('reeds', -8, -14, { r: 2 }); add('reeds', -25, -29, { r: 1.5 });
add('sinkhole', -21, -30, { r: 3 });
// The long gallery: reeds in the wet, the mudlarks' heaps along it, another hole at the blind end of the bore.
add('reeds', -19.5, -50, { r: 1.3 }); add('heap', -18.4, -74, { r: 1 }); add('reeds', -27.5, -91, { r: 1.2 });
add('sinkhole', 0, -71, { r: 2.2 });
// The Reed Galleries: reeds standing out of a hand of water all across it, what the mudlarks have picked.
add('pool', -30, -113, { r: 8.5 }); add('sinkhole', -41, -106, { r: 3.2 });
for (const [fa, a, r] of [[0.5, 0.6, 2.2], [0.45, 2.6, 2], [0.6, 4, 1.8], [0.7, 5.3, 1.6], [0.3, 3.3, 1.5]]) { const [x, z] = near('dv_reeds', fa, a); add('reeds', x, z, { r }); }
add('heap', -27, -121, { r: 1.3 }); add('heap', -43, -105, { r: 1.1 }); add('bones', -30, -103, { r: 1.8 });
// The Bloat's Wallow: his pool, skinned over; what he's eaten and hasn't finished.
add('pool', -31, -167, { r: 7 });
add('bones', -22, -170, { r: 2.6 }); add('bones', -49, -172, { r: 2.2 }); add('bones', -36, -186, { r: 2 });
add('barrels', -50, -157); add('wreck', -23, -184, { yaw: 0.6, s: 1.3 });
// The Great Cistern: the fen's water held in a bowl of rock, a walk of slabs round it, the toll's bell fallen in.
add('pool', 14, -188, { r: 9 });
add('bell', 9, -192, { s: 1.5 });
for (let i = 0; i < 6; i++) { const [x, z] = near('dv_cistern', 0.74, 0.5 + i * 1.0); add('slab', x, z, { yaw: 0.5 + i, tip: (i % 3) * 0.2 }); }
add('reeds', 23, -184, { r: 1.8 }); add('reeds', 5, -201, { r: 1.5 });
// The Strongroom: what the toll took, a hundred years of it, and the door that kept the fen out till it didn't.
add('gold', 10, -231, { r: 1.5 }); add('gold', 19, -231, { r: 1.2 }); add('crates', 9, -222); add('crates', 20, -223);
add('strongdoor', 14, -217.5, { yaw: 0, w: 2.2 });
// The grates across the two drains' heads (solid: bodies, shots and sight along the floor stop at them; the eye doesn't).
add('grate', -20.4, -112, { hx: 0.3, hz: 2.2, solid: true }); add('grate', 14, -175.2, { hx: 2.2, hz: 0.3, solid: true });
// (And across their feet, where they come out over the Sump's water: nothing climbs them from below either.)
add('grate', -8.6, -112, { hx: 0.3, hz: 2.2, solid: true }); add('grate', 14, -160.6, { hx: 2.2, hz: 0.3, solid: true });
// (Each drain's own stone: a square culvert from one grate to the other, a headwall round each mouth.)
add('culvert', -20.4, -112, { to: [-8.6, -112], layer: 'mire:course', head: 'mire:block', cap: 'mire:ashlar' }); add('culvert', 14, -175.2, { to: [14, -160.6], layer: 'mire:course', head: 'mire:block', cap: 'mire:ashlar' });
// (A light at each foot, on the Sump's side of the bars and in line with the culvert: what's seen at the bottom from above.)
add('brazier', -5.4, -112); add('brazier', 14, -157.4);
// The Tidehall: the high rock, the wrack the last tide left, the water over everything else.
add('rock', TIDE_ROCK.x, TIDE_ROCK.z, { r: TIDE_ROCK.r + 0.2 });
add('pool', 72, -166, { r: 21, up: 0.02 });
for (const [fa, a, r] of [[0.7, 1.5, 1.8], [0.75, 3.3, 2], [0.6, 5, 1.5], [0.8, 2.5, 1.7]]) { const [x, z] = near('dv_tide', fa, a); add('reeds', x, z, { r }); }
add('wreck', 86, -160, { yaw: 1.1, s: 1.2 }); add('bones', 84, -176, { r: 2 });
// The Sluice: the gates that drained the vaults into the Sump, one fallen, the water still going down.
add('sluicegate', 55, -112, { yaw: 1.1, w: 4.6 });
add('pool', 68, -106, { r: 4.5 }); add('heap', 70, -100, { r: 1.2 }); add('reeds', 60, -99, { r: 1.5 });
// The Sump: mud from wall to wall under a skin of water, down both its halves; the causeway's slabs where they fell through.
add('pool', 14, -132, { r: 23.5, up: 0.03 }); add('pool', 12, -106, { r: 16.5, up: 0.03 });
for (const [x, z, yaw, tip] of [[30, -128, 0.4, 0.9], [-2, -140, 1.9, 0.7], [24, -100, 2.6, 0.5], [2, -112, 1.1, 0.6]]) add('slab', x, z, { yaw, tip });
add('bones', 28, -144, { r: 3 }); add('bones', 2, -98, { r: 2.6 }); add('wreck', 0, -150, { yaw: 2.8, s: 1.6 });

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const DROWNED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const CHILDREN = ['zombie_boy_1', 'zombie_boy_2', 'zombie_girl_1', 'zombie_girl_2'];
const MUDLARKS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
const DRAKES = ['dragonling_undead'];
const WET = ['Drowned', 'Drowned', 'Blighted'];
// A pack: tough: what it is to its cousins in the woods, where the delve's own doesn't suit (a pack of children against a
// pack of drakes). ai: how it fights, if not as its kind does.
const packs = [
  { key: 'dv_toll', room: 'dv_toll', pick: DROWNED, n: 5, pal: WET, at: [0, 5], r: 5 },
  { key: 'dv_gallery', room: 'dv_reeds', pick: MUDLARKS, n: 4, pal: ['Drowned', 'Abyssal'], tough: { hp: 15, damage: 2.4 }, r: 2, at: [17.8, 42.8], walk: [[-16.6, -66], [-24.9, -86.8]] },
  { key: 'dv_reeds', room: 'dv_reeds', pick: MUDLARKS, n: 4, elite: DRAKES, pal: ['Drowned', 'Abyssal'], tough: { hp: 13, damage: 2.4 }, at: [0, -3], r: 4 },
  { key: 'dv_cistern', room: 'dv_cistern', pick: CHILDREN.concat(DROWNED), n: 5, pal: WET, tough: { hp: 14, damage: 2.6 }, at: [6, 6], more: { n: 2, pick: DROWNED, from: [14, -192], when: 0.6 } },
  { key: 'dv_strong', room: 'dv_strong', pick: DROWNED, n: 4, elite: ['flesh_spider_demon'], pal: ['Drowned'] },
  { key: 'dv_sluice', room: 'dv_sluice', pick: DRAKES.concat(MUDLARKS), n: 5, pal: ['Drowned', 'Blighted'], tough: { hp: 9, damage: 2.2 } },
];
const bosses = [
  { key: 'bloat', room: 'dv_wallow', name: 'The Bloat', models: ['dv_bloat'], pal: ['Drowned'], hp: 10500, damage: 56, reach: 3.6, loot: 8 },
  { key: 'sallow', room: 'dv_tide', name: 'Mother Sallow, the Tidecaller', models: ['dv_sallow'], pal: ['Drowned'], hp: 6400, damage: 48, reach: 2.8, loot: 8 },
  { key: 'leviathan', room: 'dv_sump', name: 'The Leviathan of the Mile', models: ['dv_leviathan'], pal: ['Abyssal'], hp: 12000, damage: 64, reach: 4.6, loot: 0 },
];
const warnings = {
  blo_open: 'The Bloat. When he swells, put rock between you and him before he bursts.',
  blo_bile: 'The Bloat heaves up bile! Off the pools.',
  blo_retch: 'The Bloat retches! Out from in front of him.',
  blo_stamp: 'The Bloat stamps! Step in behind each ring as it lands.',
  blo_gout: 'The Bloat heaves a gout along the floor! Out of its way: the pools stay.',
  blo_slam: 'The Bloat swings! Out of the arc.',
  blo_swell: 'The Bloat SWELLS! Behind a rock, all of you, the same one: he is going to burst! Not one he has fouled.',
  blo_burst: 'The Bloat bursts! He is spent: strike him now.',
  blo_turn: 'The Bloat turns on you! Get behind the tank, or out of his reach, till he lets go.',
  blo_enrage: 'The Bloat is enraged!',
  sal_open: 'Mother Sallow calls the fen in. When the tide comes, get up onto the high rock.',
  sal_grasp: 'Hands come up out of the water! Out of the circle: it holds.',
  sal_undertow: 'The undertow! Out of the lines.',
  sal_wave: 'A wave comes on! Find the gap.',
  sal_eddy: 'Eddies come across the floor! Out of their way: they keep going.',
  sal_wail: 'Mother Sallow wails! Close in against her, or get right away.',
  sal_tide: 'THE TIDE COMES IN! Up onto the high rock, all of you! She cuts it in two: watch the line.',
  sal_ebb: 'The tide goes out. Down off the rock: she is yours again.',
  sal_drowned: 'The drowned climb out of the drains! Kill them before the next tide.',
  sal_turn: 'Mother Sallow turns on you! Get behind the tank till she looks away.',
  sal_enrage: 'Mother Sallow is enraged!',
  lev_open: 'The Leviathan of the Mile. When it goes under, keep moving: it comes up beneath you, and takes the floor with it.',
  lev_spew: 'The Leviathan spews! Off the pools.',
  lev_maw: 'The Leviathan draws breath: it is pulling you in! Run from it, clear of its head, before it bites.',
  lev_thrash: 'The Leviathan thrashes! Jump the ring as it reaches you.',
  lev_bore: 'The mud splits! Out of the lines.',
  lev_fall: 'The roof comes down! Out of the circles.',
  lev_dive: 'The Leviathan goes under! Out of each circle, then jump the ring: and keep off the holes it leaves.',
  lev_up: 'The Leviathan is up, and stuck fast: strike it now!',
  lev_spawn: 'Its spawn come up out of the mud! Kill them.',
  lev_turn: 'The Leviathan turns on you! Get behind the tank, out of its reach, till it lets go.',
  lev_enrage: 'The Leviathan is enraged: it will kill you all!',
};

export const VAULTS = {
  key: 'vaults', tag: 'dv', name: 'The Drowned Vaults', short: 'the Vaults', x: 600, z: -5760, y: -60, level: 9, style: 'cave',
  rooms, nooks, tunnels, pillars, daises, props, packs, bosses, warnings,
  turnWarn: { bloat: 'blo_turn', sallow: 'sal_turn', leviathan: 'lev_turn' },
  entry: { x: 2, z: 21, yaw: Math.PI }, exitIn: { x: 2, z: 24.5 }, exitOut: { x: 14, z: -152, yaw: 0 },
  // By the Sunken Mile (SITES.causeway), facing the last of the causeway.
  portal: { x: -430, z: -2717, yaw: 0.53, r: 2.2 },
  // (The Free Company's post on its terrace: src/core/dungeon.js POSTS.)
  post: { body: 'bard_m1', name: 'Sergeant Hobb Marlow', say: "The Mile went under in a night and took the toll-house with it. What's down there now won't be met alone: four at your back, or you'll not see the Reeds." },
  last: 'leviathan', tough: { hp: 10, damage: 2.2 }, pay: { xp: 2300, gold: 380 },
  // What its rank and file are called down here, by their kind (src/sim/tripo.js optsFor).
  names: { 'The Possessed': 'THE DROWNED', 'Dead Children': 'DROWNED CHILD', Kobolds: 'MUDLARK', Dragonlings: 'BOG DRAKE', 'Giant Spiders': 'VAULT-KEEPER' },
  look: { wall: 'mire:rubble', floor: 'mire:rubble', roof: 'mire:stone', spike: 'mire:rubble', stone: 'mire:rubble', flame: 'mire:flame', lamp: 'wisp', still: true, light: [0.5, 1, 0.62], fire: [0.56, 1, 0.7], every: 8, lit: 0.5, span: 'pier', litter: 'mire' },
  words: { enter: 'The Drowned Vaults. The fen came in after the causeway, and never went out again.', clear: 'The Drowned Vaults are cleared. The Leviathan of the Mile is dead!', wipe: 'Your party falls... and wakes on the Sunken Stair.' },
};
