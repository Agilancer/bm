// The Drowned Archive: one of Castle Velscour's eight dungeons (docs/PHOBOS-CASTLE.md, set A), the Ancient Library's lower
// stacks. He had the cistern over them broken, to drown the books his archivists couldn't be made to unwrite; the
// archivists who wouldn't leave them are down there still, and the water has never gone out. Three bosses, a party at your
// back if you'll pay for one (their fights: src/sim/castle-fights-a.js).
//   The Sunk Door, down from the foot of the Library's south wall, and the Drowned Reading Room past it: the tables stood
//     in a hand of water, the lamps still lit over them.
//   The Catalogue, west: every book he owns on a card, and the Indexer (82) who keeps them; when she reads out a name,
//     whoever's named mustn't move till she's closed the book.
//   The Bindery, east: the presses, the glue, and the Binder (83), whose great press comes down on one of you and is
//     shared by everyone who stands under it with them. Behind its last case, on no map, the Sealed Stack.
//   The Scriptorium, south of the Catalogue: the way round, by the West Sluice, to the Long Flood.
//   The Long Flood, south of the Reading Room: the old nave of the stacks, knee deep. Off it the two sluices, west and
//     east: empty either of its wardens and that sluice can be run, and the Lector's tide goes out the sooner for it.
//   The Sump, past the West Sluice: the drain down into the Deep Stacks (barred from below: come through it from here).
//   The Lectorium, at the Flood's end: the Drowned Lector (85), who calls the water up over everything but one dry stack,
//     and not the same one twice. His doors are shut till the Indexer and the Binder are dead. He keeps the Drowned Key.
//
// Where it really is: past the world's north edge in the castle's row; everything here local to it, x east, z south of
// the way in. Its door out on the land: at the foot of the Ancient Library's south wall, in the Middle Ward.
// His livery down here is royal blue, and what the water's had is the drowned's green. Nothing of Tessariel's (README "The
// two sides"): no bells, no seals of hers, no crosses; no two ways out of a room straight across from each other.
import { R } from './delve-lay.js';

const PI = Math.PI;

const rooms = [
  R('da_door', 'the Sunk Door', 0, -12, 5, 20, 0, 9, { rock: 'p2_waterline_wall', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 12 }),
  R('da_reading', 'the Drowned Reading Room', 8, -54, 20, 24, 0, 14, { rock: 'p2_book_spines', foot: 'mire:block', ground: 'p2_worn_floorboards', banners: 14, cloth: 'royal:cloth_red', fires: 16 }),
  R('da_catalogue', 'the Catalogue', -56, -42, 16, 14, 0, 10, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 12 }),
  R('da_bindery', 'the Bindery', 58, -66, 18, 14, 0, 11, { rock: 'p2_sooty_plaster', foot: 'mire:block', ground: 'flags', banners: 0, fires: 12 }),
  R('da_script', 'the Scriptorium', -56, -82, 12, 12, 0, 8, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_worn_floorboards', banners: 9, cloth: 'royal:cloth_red', fires: 12 }),
  R('da_flood', 'the Long Flood', 18, -108, 8, 34, 0, 16, { rock: 'p2_book_spines', foot: 'mire:block', ground: 'slate:flags', banners: 0, fires: 14 }),
  R('da_sluice_w', 'the West Sluice', -40, -114, 12, 12, 0, 10, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0, fires: 12 }),
  R('da_sluice_e', 'the East Sluice', 56, -126, 12, 12, 0, 10, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0, fires: 12 }),
  R('da_sump', 'the Sump', -84, -114, 8, 8, 0, 8, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 14 }),
  R('da_sealed', 'the Sealed Stack', 90, -68, 6, 6, 0, 7, { rock: 'p2_book_spines', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 20 }),
  R('da_lectorium', 'the Lectorium', 18, -168, 24, 30, 0, 20, { rock: 'p2_book_spines', foot: 'mire:block', ground: 'slate:flags', banners: 18, cloth: 'royal:cloth_red', fires: 14 }),
];

// (Each run a little into both rooms, so it opens a doorway in each wall. None across a room from another: the Reading
// Room's door is west of its middle, its way on to the Flood east of it; its west way north of its middle, its east south.)
const tunnels = [
  { pts: [[-10, -42], [-42, -42]], w: 5, h: 5 },                    // the Reading Room to the Catalogue
  { pts: [[26, -66], [42, -66]], w: 5, h: 5 },                      // ... and to the Bindery
  { pts: [[-60, -54], [-60, -72]], w: 3, h: 4 },                    // the Catalogue down to the Scriptorium
  { pts: [[-48, -92], [-48, -104]], w: 3, h: 4 },                   // the Scriptorium down to the West Sluice
  { pts: [[-30, -112], [12, -112]], w: 4, h: 4.5 },                 // the West Sluice's race to the Flood
  { pts: [[24, -126], [46, -126]], w: 4, h: 4.5 },                  // the Flood to the East Sluice
  { pts: [[-50, -118], [-78, -118]], w: 3, h: 4 },                  // the West Sluice to the Sump
  // The Sealed Stack: behind the Bindery's last case, a way a man goes through sideways. On no map.
  { pts: [[74, -70], [86, -70]], w: 1.3, h: 3 },
  // Where they come in from: the Catalogue's back stacks, the Bindery's stores, the Lectorium's side aisles.
  { pts: [[-70, -36], [-78, -36]], w: 2, h: 4, dead: true, door: 'da_catalogue' },
  { pts: [[-52, -30], [-52, -22]], w: 2, h: 4, dead: true, door: 'da_catalogue' },
  { pts: [[52, -54], [52, -46]], w: 2, h: 4, dead: true, door: 'da_bindery' },
  { pts: [[74, -60], [82, -60]], w: 2, h: 4, dead: true, door: 'da_bindery' },
  { pts: [[-4, -158], [-12, -158]], w: 2, h: 4, dead: true, door: 'da_lectorium' },
  { pts: [[40, -180], [48, -180]], w: 2, h: 4, dead: true, door: 'da_lectorium' },
];

// The three dry stacks in the Lectorium, each a reading floor a step out of the water: when the Drowned Lector calls the
// tide, one of them stays dry (src/sim/castle-fights-a.js lector). [x, z], each 4.5 m about.
export const ISLES = [[8, -158], [30, -164], [14, -182]];
export const ISLE_R = 4.5;
const daises = ISLES.map(([x, z]) => ({ x, z, hx: 3.6, hz: 3.6, dy: 0.5 }));

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  const water = (x, z, r, up = 0.05) => add('pool', x, z, { r, up, layer: 'mire:water' });
  // ---- the Sunk Door: the last dry steps, a rack of the archivists' poles, the tide-line up the wall.
  add('lintel', 0, -2, { hx: 5, stone: 'dark:ashlar' }); add('mark', 0, 7.6, { up: 6.6, r: 0.8, back: 1 });
  add('rack', -4.2, -8, { yaw: PI / 2 }); add('barrels', 3.6, -20); add('brazier', -3.4, -24); add('brazier', 3.4, 2);
  add('decal', 4.95, -12, { layer: 'p2_damp_rise', w: 6, h: 2.4, up: 0, yaw: -PI / 2 });
  // ---- the Drowned Reading Room: four long tables stood in the water, benches, lecterns; lamps hung low over each table;
  // cases out from the walls; a runner of his blue from the door, gone under at its far end; the oculus, its light on the water.
  water(8, -56, 13); water(-2, -70, 6.5); water(20, -42, 6);
  for (const [x, z] of [[0, -46], [16, -46], [0, -64], [16, -64]]) {
    add('table', x, z, { hx: 3.2, hz: 0.8, cloth: 'royal:cloth_oat' }); add('bench', x, z + 1.4, { hx: 2.8, hz: 0.2 });
    add('candles', x - 1.4, z, { up: 0.85 }); add('chandelier', x, z, { up: 5, hang: true });
  }
  add('daylight', 8, -55, { r: 3, pool: false });
  for (const z of [-38, -50, -62, -72]) add('bookcase', 25.5, z, { hx: 2.2, hz: 0.45, h: 5 });
  for (const z of [-52, -62, -72]) add('bookcase', -9.6, z, { hx: 2.2, hz: 0.45, h: 5 });
  add('carpet', 0, -38, { hx: 1.4, hz: 7, layer: 'royal:cloth_red' });
  add('lectern', 8, -34); add('lectern', 22, -74); add('heap', -8, -76, { r: 1.2, layer: 'p2_book_spines' });
  add('decal', -11.95, -34, { layer: 'p2_cobweb', w: 2, up: 11.9, yaw: PI / 2 });
  // ---- the Catalogue: the card-cases in rows, shoulder high, a lane between each; her desk at the far end, the great
  // book on its lectern; drawers pulled and cards over the floor.
  for (const z of [-34, -42, -50]) { add('bookcase', -50, z, { hx: 5, hz: 0.5, h: 1.7 }); add('bookcase', -64, z, { hx: 3.5, hz: 0.5, h: 1.7 }); }
  add('table', -68, -44, { hx: 0.8, hz: 2.4, cloth: 'royal:cloth_oat' }); add('lectern', -66, -38); add('candles', -68, -43, { up: 0.85 }); add('candles', -68, -46, { up: 0.85 });
  add('chandelier', -56, -42, { up: 5.4, hang: true }); add('carpet', -56, -42, { hx: 12, hz: 1.4, layer: 'royal:cloth_red' });
  add('heap', -44, -52, { r: 0.9, layer: 'pale:cloth_oat' }); add('heap', -60, -31, { r: 0.7, layer: 'pale:cloth_oat' });
  // ---- the Bindery: the presses in a row (each a bed of oak and a block over it on two screws), the glue vats, hides on
  // rails, the sewing frames; the cases along the east wall, the last of them stood a hand out from it.
  for (const x of [48, 58, 68]) { add('table', x, -74, { hx: 1.6, hz: 1.1, solid: true }); add('crates', x, -76.4); }
  add('vat', 46, -58, { r: 1.1 }); add('vat', 50.5, -56.5, { r: 0.8 }); add('coatrail', 62, -54.4, { hx: 3 }); add('coatrail', 70, -54.4, { hx: 2 });
  add('table', 58, -64, { hx: 3, hz: 0.8 }); add('candles', 57, -64, { up: 0.85 }); add('candles', 60, -64.2, { up: 0.85 });
  add('bookcase', 75.4, -60, { hx: 0.45, hz: 3, h: 4.4, one: -1 }); add('bookcase', 74.6, -72.4, { hx: 0.45, hz: 2.2, h: 4.4, one: -1 });
  add('chandelier', 58, -66, { up: 6, hang: true }); add('brazier', 44, -76); water(66, -62, 4.5, 0.04);
  add('decal', 60, -70, { layer: 'p2_blood_splashes', w: 2, flat: true, yaw: 0.8 });
  // ---- the Sealed Stack: what the old Librarians wouldn't let him have, shelved to the roof; a reading chair; a lamp.
  add('bookcase', 95.4, -68, { hx: 0.45, hz: 4.6, h: 5, one: -1 }); add('bookcase', 90, -73.4, { hx: 4, hz: 0.45, h: 5, one: 1 });
  add('seat', 88, -64, { hx: 0.5, hz: 0.5, stone: 'dark:wood' }); add('candles', 89.4, -64, { up: 0.1 }); add('carpet', 90, -67, { hx: 3, hz: 3, layer: 'royal:cloth_red' });
  // ---- the Scriptorium: the copyists' desks in two rows, each its candle; what they were copying when the water came.
  for (const x of [-62, -56, -50]) for (const z of [-78, -86]) { add('lectern', x, z); add('candles', x + 0.9, z, { up: 0.1 }); }
  add('bookcase', -67.4, -82, { hx: 0.45, hz: 5, h: 3.6, one: 1 }); water(-54, -90, 4, 0.04); add('chandelier', -56, -82, { up: 4.4, hang: true });
  add('decal', -44.05, -76, { layer: 'p2_damp_rise', w: 5, h: 2, up: 0, yaw: -PI / 2 });
  // ---- the Long Flood: the nave of the stacks, knee deep end to end; cases fallen across it, their tops out of the water;
  // piers down both sides; lamps on chains; the light on the water.
  for (const z of [-84, -100, -116, -132]) water(18, z, 8.6, 0.07);
  for (const z of [-86, -104, -122, -138]) { add('column', 11.4, z, { r: 0.9, solid: true }); add('column', 24.6, z + 8, { r: 0.9, solid: true }); }
  add('bookcase', 15, -94, { hx: 3, hz: 0.5, h: 1.1 }); add('bookcase', 21.5, -110, { hx: 0.5, hz: 3, h: 1.1 }); add('bookcase', 16, -130, { hx: 2.4, hz: 0.5, h: 1.1 });
  for (const z of [-90, -112, -134]) add('chandelier', 18, z, { up: 7, hang: true });
  add('heap', 22, -98, { r: 1, layer: 'p2_book_spines' }); add('bones', 14, -120, { r: 1.1 });
  // ---- the sluices: each its gate in the far wall, its wheel, the race down its middle; the wardens' brazier.
  add('sluicegate', -51.4, -114, { yaw: PI / 2, w: 3 }); add('wheel', -46, -124.6, { up: 1.9, r: 1.5 }); add('channel', -50, -114, { to: [-30, -112], w: 1.6 });
  add('brazier', -32, -122); add('barrels', -31, -104.5); add('crates', -49, -104.5);
  add('sluicegate', 67.4, -126, { yaw: -PI / 2, w: 3 }); add('wheel', 62, -136.6, { up: 1.9, r: 1.5 }); add('channel', 66, -126, { to: [46, -126], w: 1.6 });
  add('brazier', 48, -134); add('barrels', 47, -116.5); add('heap', 64, -117, { r: 1, layer: 'dark:rubble' });
  // ---- the Sump: the drain down, black water round it, what's washed up against its grating.
  water(-84, -114, 5, 0.04); add('pit', -84, -112, { r: 1.8 }); add('bones', -79, -119, { r: 1 }); add('heap', -89, -108.5, { r: 0.9, layer: 'p2_book_spines' });
  add('chain', -84, -112, { up: 3 });
  // ---- the Lectorium: the water over all of it but the three dry stacks, a lectern and candles on each; cases up the
  // walls to the roof; piers; his own lectern at the far end under his mark, the great book chained to it.
  water(18, -152, 13, 0.07); water(4, -178, 11, 0.07); water(32, -184, 11, 0.07); water(36, -150, 7, 0.07); water(18, -170, 9, 0.07);
  for (const [x, z] of ISLES) { add('lectern', x + 2.4, z - 2.4); add('candles', x - 2.6, z + 2.6, { up: 0.5 }); add('candles', x + 2.6, z + 2.6, { up: 0.5 }); }
  for (const [x, z] of [[-2, -170], [38, -152], [26, -190]]) add('column', x, z, { r: 1.3, solid: true });
  add('mark', 18, -197.6, { up: 11, r: 2.2, back: -1 });
  add('chandelier', 18, -150, { up: 9, hang: true }); for (const [x, z] of ISLES) add('chandelier', x, z, { up: 6, hang: true });
  add('brazier', -3, -142); add('brazier', 39, -194);
  add('decal', 41.95, -160, { layer: 'p2_damp_rise', w: 8, h: 3, up: 0, yaw: -PI / 2 }); add('decal', -5.95, -186, { layer: 'p2_damp_rise', w: 8, h: 3, up: 0, yaw: PI / 2 });
}

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const READERS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const ARCHIVISTS = ['necromancer_f1', 'necromancer_f2', 'necromancer_2', 'necromancer_3'];
const WARDENS = ['plague_knight_black', 'plague_knight_red'];
const RATS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
// (None in the Sunk Door: it's where you wake if you fall. The sluices' two are the wardens the Lector's tide is weighed by.)
const packs = [
  { key: 'da_readers', room: 'da_reading', pick: READERS, n: 5, pal: ['Drowned'], at: [0, 2], r: 6 },
  { key: 'da_scribes', room: 'da_script', pick: ARCHIVISTS, n: 4, elite: ['necromancer_lord'], pal: ['Royal'], ai: 'caster', at: [0, 0], r: 4 },
  { key: 'da_eels', room: 'da_flood', pick: ['da_eel'], n: 4, pal: ['Drowned'], tough: { hp: 1.2, damage: 1.1 }, at: [0, 16], r: 3 },
  { key: 'da_sodden', room: 'da_flood', pick: KNIGHTS, n: 4, elite: ['possessed_knight_2'], pal: ['Royal'], at: [0, -18], r: 3 },
  { key: 'da_sluice_w', room: 'da_sluice_w', pick: WARDENS, n: 4, elite: ['plague_giant_1'], pal: ['Drowned'], tough: { hp: 1.3, damage: 1.2 }, at: [2, 0], r: 4 },
  { key: 'da_sluice_e', room: 'da_sluice_e', pick: WARDENS.concat(RATS), n: 5, elite: ['plague_giant_armored'], pal: ['Drowned'], tough: { hp: 1.3, damage: 1.2 }, at: [-2, 0], r: 4 },
  { key: 'da_leaves', room: 'da_sump', pick: ['da_leaf'], n: 4, pal: ['Bone-white'], at: [0, 0], r: 3 },
];
const bosses = [
  { key: 'indexer', room: 'da_catalogue', name: 'The Indexer', models: ['da_indexer'], pal: ['Royal'], hp: 70000, damage: 245, reach: 3.0, loot: 8, at: [-6, 0] },
  { key: 'binder', room: 'da_bindery', name: 'The Binder', models: ['da_binder'], pal: ['Drowned'], hp: 78000, damage: 255, reach: 4.0, loot: 8, at: [4, 2] },
  { key: 'lector', room: 'da_lectorium', name: 'The Drowned Lector', models: ['da_lector'], pal: ['Drowned'], hp: 96000, damage: 260, reach: 3.4, loot: 0, needs: ['indexer', 'binder'], shut: 'lec_shut', gives: 'key:archive', at: [0, -8] },
];
const warnings = {
  idx_open: "The Indexer. She keeps every name there is on a card. When she reads one out, whoever's named: don't take a step till she closes the book. Everything else she throws, be out of.",
  idx_cards: 'The Indexer deals her cards! Between them.',
  idx_drawers: 'The drawers fly open down their rows! Into a lane between: not the lane it was last time.',
  idx_ink: 'Ink! Out of the circles.',
  idx_strike: 'She strikes a line through the floor! Out of it.',
  idx_slips: 'Slips out of the drawers, one for each of you! Out of the circles.',
  idx_name: "SHE OPENS THE BOOK AND READS A NAME. Whoever's named: stand where you are till it's shut!",
  idx_closed: 'The book is shut. Move.',
  idx_moved: 'The named one moved: the ink takes its due.',
  idx_leaves: 'Loose leaves off the high shelves! Bring them down.',
  idx_turn: 'The Indexer turns on you! Get behind the tank, or out of her reach, till she lets go.',
  idx_enrage: 'The Indexer is enraged!',
  bnd_open: "The Binder. His great press comes down on one of you, and it's the weight of the house: stand under it together, and share it. The rest, be out of.",
  bnd_cleave: 'The Binder swings his paring knife! Out of the arc.',
  bnd_stitch: 'He stitches the floor! Out of the line.',
  bnd_glue: 'Hot glue! Out of the pools.',
  bnd_quake: 'He drops a press-block! Jump the ring as it reaches you.',
  bnd_press: 'THE GREAT PRESS IS COMING DOWN! Everyone under it, together: what lands is shared by all who stand there.',
  bnd_pressed: 'The press lands.',
  bnd_turn: 'The Binder turns on you! Get behind the tank, or out of his reach, till he lets go.',
  bnd_enrage: 'The Binder is enraged!',
  lec_shut: "The Lectorium is shut. Its doors open to the Lector's two: the Indexer and the Binder.",
  lec_open: 'The Drowned Lector. Three times he calls the tide up over his hall: only one of the three dry stacks stays out of it, the one he lights, and never the same twice running. Get onto it. Every sluice you emptied first lets the water out the sooner.',
  lec_less_one: "One of his sluices is yours: the tide won't stay as long.",
  lec_less_two: 'Both his sluices are yours: the tide barely stays at all.',
  lec_grasp: 'Cold hands out of the water! Out of the circles, and keep out.',
  lec_undertow: 'The undertow down three lines! Out of them.',
  lec_wave: 'A wall of water! Through the gap.',
  lec_wail: 'The Lector wails! In close against him, or right out.',
  lec_eddy: 'Eddies across the floor! Out of their way.',
  lec_tide: 'THE TIDE! Everything goes under but the lit stack: onto it, now!',
  lec_ebb: 'The water goes down.',
  lec_drowned: 'The drowned come up out of the aisles!',
  lec_turn: 'The Drowned Lector turns on you! Get behind the tank, or out of his reach, till he lets go.',
  lec_enrage: 'The Drowned Lector is enraged!',
};

export const DROWNED_ARCHIVE = {
  key: 'drownedarchive', tag: 'da', name: 'Castle Velscour: the Drowned Archive', short: 'the Drowned Archive', x: 13000, z: -5700, y: -60, level: 80, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { indexer: 'idx_turn', binder: 'bnd_turn', lector: 'lec_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 18, z: -194.4 },
  // At the foot of the Ancient Library's south wall, in the Middle Ward: its back to the wall, facing out toward the
  // curtain (src/core/phobos-build.js phobosCastle: the Library's hall at 11050, -150).
  portal: { x: 11030, z: -191, yaw: PI, r: 2.2 },
  // The Sump's drain: down into the Deep Stacks (src/core/delve-highward.js), which is barred from below till it's been
  // come down from here.
  links: [{ x: -90.6, z: -112, yaw: PI / 2, to: 'deepstacks', n: 2, opens: 'latch:sump' }],
  // What's off the way: the Sealed Stack behind the Bindery's last case; the copyists' strongbox; the East Sluice's.
  chests: [
    { id: 'sealed', room: 'da_sealed', x: 92, z: -64.4, yaw: PI, loot: 3 },
    { id: 'script', room: 'da_script', x: -46, z: -73, yaw: -PI / 2, loot: 2 },
    { id: 'sluice', room: 'da_sluice_e', x: 65, z: -116.5, yaw: PI, loot: 2 },
  ],
  vistas: [{ id: 'da_flood', name: 'the Long Flood', room: 'da_flood', x: 18, z: -80, r: 5 }],
  auto: { way: ['da_door', 'da_reading', 'da_catalogue', 'da_script', 'da_sluice_w', 'da_sump', 'da_sluice_w', 'da_flood', 'da_sluice_e', 'da_flood', 'da_reading', 'da_bindery', 'da_sealed', 'da_bindery', 'da_reading', 'da_flood', 'da_lectorium'] },
  shots: [
    ['da_reading', 'da_reading', [-6, 3.2, -34], [18, 1.2, -66]],
    ['da_catalogue', 'da_door', [-42, 2.6, -36], [-68, 1.2, -46]],
    ['da_flood', 'da_door', [18, 2.4, -86], [18, 2.2, -138]],
    ['da_lectorium', 'da_door', [18, 4.5, -141], [18, 2.5, -196]],
  ],
  last: 'lector', tough: { hp: 26, damage: 2.8 }, pay: { xp: 70000, gold: 9600 },
  names: { "Velscour's Knights": 'SODDEN KNIGHT', 'The Possessed': 'DROWNED READER', Necromancers: 'ARCHIVIST', 'Plague Knights': 'SLUICE WARDEN', Kobolds: 'BILGE-RAT', 'Plague Giants': 'SLUICE-KEEPER', 'Giant Worms': 'INK-EEL', Harpies: 'LOOSE LEAF' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_blue', roof: 'dark:stone', flame: 'dark:flame', light: [0.78, 0.6, 0.42], fire: [0.9, 0.6, 0.36], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "Castle Velscour: the Drowned Archive. He had the cistern broken over the books he couldn't have unwritten. The archivists stayed.", clear: 'The Drowned Lector is dead! The Drowned Key is yours.', wipe: 'You fall... and wake at the Sunk Door.' },
};

// Their bodies (src/core/tripo-monsters.js VARIANTS): the three, and the Archive's own kinds.
export const ARCHIVE_VARIANTS = {
  da_indexer: { src: 'necromancer_f2', alt: 'necromancer_f1', height: 3.0, name: 'THE INDEXER' },
  da_binder: { src: 'plague_giant_2', alt: 'plague_giant_1', height: 4.4, name: 'THE BINDER' },
  da_lector: { src: 'necromancer_lord_2', alt: 'necromancer_lord', height: 3.4, name: 'THE DROWNED LECTOR' },
  da_eel: { src: 'worm_1', height: 1.7, name: 'INK-EEL' },
  da_leaf: { src: 'werebat', alt: 'harpy_undead_1', height: 1.1, name: 'LOOSE LEAF' },
};
