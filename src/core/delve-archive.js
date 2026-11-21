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

// (Each room its own section: the stair low and close, the Reading Room's stacks eighteen metres to their roof, the
// Catalogue and the Scriptorium low cellars, the Long Flood a nave twice as high as it's wide, the sluices shafts. No
// room lights itself (fires: 0, hang: 0): each has two or three lamps of its own, and the dark between them.)
const rooms = [
  R('da_door', 'the Sunk Door', 0, -16, 4, 24, 0, 6, { rock: 'p2_waterline_wall', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 0 }),
  R('da_reading', 'the Drowned Reading Room', 8, -54, 16, 18, 0, 18, { rock: 'p2_book_spines', foot: 'mire:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
  R('da_catalogue', 'the Catalogue', -56, -42, 16, 14, 0, 7, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
  R('da_bindery', 'the Bindery', 58, -66, 16, 14, 0, 10, { rock: 'ph_grey_plaster', foot: 'mire:block', ground: 'flags', banners: 0, fires: 0, hang: 0 }),
  R('da_script', 'the Scriptorium', -56, -82, 12, 12, 0, 5.5, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
  R('da_flood', 'the Long Flood', 18, -106, 6, 38, 0, 20, { rock: 'p2_book_spines', foot: 'mire:block', ground: 'slate:flags', banners: 0, fires: 0 }),
  R('da_sluice_w', 'the West Sluice', -40, -114, 10, 10, 0, 16, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0, fires: 0, hang: 0 }),
  R('da_sluice_e', 'the East Sluice', 56, -126, 10, 10, 0, 16, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0, fires: 0, hang: 0 }),
  R('da_sump', 'the Sump', -84, -116, 7, 7, 0, 6, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 0 }),
  R('da_sealed', 'the Sealed Stack', 90, -68, 6, 6, 0, 9, { rock: 'p2_book_spines', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('da_lectorium', 'the Lectorium', 18, -166, 20, 26, 0, 24, { rock: 'p2_book_spines', foot: 'mire:block', ground: 'slate:flags', banners: 20, cloth: 'royal:cloth_red', fires: 0, hang: 0 }),
];

// (Each run a little into both rooms, so it opens a doorway in each wall. None across a room from another: the Reading
// Room's door is west of its middle, its way on to the Flood east of it; its west way north of its middle, its east south.)
const tunnels = [
  { pts: [[-6, -42], [-42, -42]], w: 4, h: 4.5 },                   // the Reading Room to the Catalogue
  { pts: [[22, -66], [44, -66]], w: 4, h: 4.5 },                    // ... and to the Bindery
  { pts: [[-60, -54], [-60, -72]], w: 3, h: 3.6 },                  // the Catalogue down to the Scriptorium
  { pts: [[-48, -92], [-48, -106]], w: 3, h: 3.6 },                 // the Scriptorium down to the West Sluice
  { pts: [[-32, -112], [14, -112]], w: 3.6, h: 4 },                 // the West Sluice's race to the Flood
  { pts: [[22, -126], [48, -126]], w: 3.6, h: 4 },                  // the Flood to the East Sluice
  { pts: [[-48, -118], [-80, -118]], w: 3, h: 3.6 },                // the West Sluice to the Sump
  // The Sealed Stack: behind the Bindery's last case, a way a man goes through sideways. On no map.
  { pts: [[72, -70], [86, -70]], w: 1.3, h: 3 },
  // Where they come in from: the Catalogue's back stacks, the Bindery's stores, the Lectorium's side aisles.
  { pts: [[-70, -36], [-78, -36]], w: 2, h: 4, dead: true, door: 'da_catalogue' },
  { pts: [[-52, -30], [-52, -22]], w: 2, h: 4, dead: true, door: 'da_catalogue' },
  { pts: [[52, -54], [52, -46]], w: 2, h: 4, dead: true, door: 'da_bindery' },
  { pts: [[72, -60], [80, -60]], w: 2, h: 4, dead: true, door: 'da_bindery' },
  { pts: [[0, -158], [-8, -158]], w: 2, h: 4, dead: true, door: 'da_lectorium' },
  { pts: [[36, -180], [44, -180]], w: 2, h: 4, dead: true, door: 'da_lectorium' },
];

// The three dry stacks in the Lectorium, each a reading floor a step out of the water: when the Drowned Lector calls the
// tide, one of them stays dry (src/sim/castle-fights-a.js lector). [x, z], each 4.5 m about.
export const ISLES = [[8, -158], [30, -164], [14, -182]];
export const ISLE_R = 4.5;
// The floor's levels: the Reading Room's south and east gone down a step and a half under the water, and the Long Flood's
// whole nave with it (waded, knee deep); two tables' worth of floor left standing in the Reading Room; the Lectorium's
// three dry stacks a step up out of its shallows.
const SUNK = 0.55;
const daises = [
  { x: 13, z: -57, hx: 11, hz: 13, dy: -SUNK },
  { x: 11, z: -50, hx: 2.4, hz: 1.5, dy: SUNK }, { x: 17, z: -62, hx: 2.4, hz: 1.5, dy: SUNK },
  { x: 18, z: -106.2, hx: 5, hz: 35.8, dy: -SUNK },
  ...ISLES.map(([x, z]) => ({ x, z, hx: 3.6, hz: 3.6, dy: 0.5 })),
];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Sunk Door: the last dry steps, low and close; the tide-line up both walls; one lamp at each end.
  add('lintel', 0, -2, { hx: 4, stone: 'dark:ashlar' }); add('mark', 0, 7.6, { up: 4.6, r: 0.6, back: 1 });
  add('rack', -3.3, -10, { yaw: PI / 2 }); add('barrels', 2.8, -22); add('brazier', 2.6, 2); add('brazier', -2.6, -33);
  add('decal', 3.95, -14, { layer: 'p2_damp_rise', w: 6, h: 2.4, up: 0, yaw: -PI / 2 }); add('decal', -3.95, -26, { layer: 'p2_damp_rise', w: 6, h: 2.4, up: 0, yaw: PI / 2 });
  // ---- the Drowned Reading Room: the stacks up every wall to a roof eighteen metres over; its south and east floor gone
  // down under black water, the great cases gone over in it and lying half sunk; two tables still standing on their own
  // floor, islands; the dry end by the door, a table and its lamp. (What's seen from the door: the fallen cases in the water.)
  add('flood', 13, -57, { hx: 11.4, hz: 13.4, lvl: -0.08, float: 16, glints: [[14, -57], [11.5, -60]] });
  add('leanshelf', 8, -49, { yaw: 1.3, w: 2.4, h: 7, lean: 0.55, sink: 1.2 });
  add('leanshelf', 20, -55, { yaw: -0.7, w: 2.2, h: 6.4, lean: 0.8, sink: 1.2, roll: 0.12 });
  add('leanshelf', 6, -65, { yaw: 2.3, w: 2.4, h: 7.4, lean: 0.38, sink: 1.2 });
  add('leanshelf', 20, -68, { yaw: 3.0, w: 2.2, h: 6, lean: 1.05, sink: 1.0, roll: -0.1 });
  for (const [x, z] of [[11, -50], [17, -62]]) { add('table', x, z, { hx: 1.9, hz: 0.8, cloth: 'royal:cloth_oat' }); add('candles', x - 0.8, z, { up: 0.85 }); }
  for (const z of [-42, -50, -58, -66]) add('bookcase', -7.4, z, { hx: 0.45, hz: 3.2, h: 8, one: 1 });
  add('table', -2, -40, { hx: 2.6, hz: 0.8, cloth: 'royal:cloth_oat' }); add('bench', -2, -38.6, { hx: 2.2, hz: 0.2 }); add('candles', -3, -40, { up: 0.85 });
  add('carpet', 0, -42, { hx: 1.4, hz: 5, layer: 'royal:cloth_red' }); add('lectern', -4, -56); add('heap', -5, -68, { r: 1.2, layer: 'p2_book_spines' });
  add('chandelier', -1, -44, { up: 5.5, hang: true }); add('chandelier', 14, -58, { up: 7, hang: true }); add('chandelier', -2, -62, { up: 8, hang: true });
  add('decal', -7.95, -37, { layer: 'p2_cobweb', w: 2, up: 15.9, yaw: PI / 2 });
  // ---- the Catalogue: low, and all card-cases: three rows of them shoulder high, a lane between each; her desk at the
  // far end, the great book on its lectern; drawers pulled and cards over the floor.
  for (const z of [-34, -42, -50]) { add('cardcase', -49, z, { hx: 5 }); add('cardcase', -64.5, z, { hx: 3 }); }
  add('cardcase', -71.5, -45, { hz: 5 }); add('cardcase', -40.5, -33, { hz: 3 });
  add('table', -69, -37, { hx: 0.8, hz: 2, cloth: 'royal:cloth_oat' }); add('lectern', -66, -31); add('candles', -69, -36.4, { up: 0.85 }); add('candles', -69, -38, { up: 0.85 });
  add('chandelier', -57, -38, { up: 4.2, hang: true }); add('brazier', -43, -53); add('carpet', -56, -38, { hx: 12, hz: 1.2, layer: 'royal:cloth_red' });
  add('heap', -44, -46, { r: 0.8, layer: 'pale:cloth_oat' }); add('heap', -60, -31, { r: 0.6, layer: 'pale:cloth_oat' });
  // ---- the Bindery: the presses in a row along its south wall, each wound down on a book; the glue vats on their fires;
  // hides on rails; the sewing table; the cases along the east wall, the last of them stood a hand out from it.
  for (const x of [47, 55, 63]) { add('press', x, -77, { yaw: 0, down: 0.3 + (x % 3) * 0.2 }); add('crates', x + 3.4, -78); }
  add('vat', 46, -57, { r: 1.1 }); add('vat', 50.5, -55.5, { r: 0.8 });
  add('table', 58, -65, { hx: 3, hz: 0.8 }); add('candles', 57, -65, { up: 0.85 }); add('candles', 60, -65.2, { up: 0.85 });
  // (Hides on rails in rows across its north end, a way between them; books stacked for the presses.)
  for (const z of [-56.5, -59.5]) { add('coatrail', 57, z, { hx: 2.6 }); add('coatrail', 65, z, { hx: 2.6 }); }
  // (The printed sheets hung to dry on lines down the room, a way between; two more presses against the west wall.)
  add('sheets', 50, -62.5, { yaw: 0, w: 3.4 }); add('sheets', 50, -68, { yaw: 0, w: 3.4 }); add('sheets', 66, -68.5, { yaw: 0, w: 3 });
  add('press', 43.2, -64, { yaw: PI / 2, h: 2.8, w: 1.1, down: 0.6 }); add('press', 43.2, -70, { yaw: PI / 2, h: 2.8, w: 1.1, down: 0.3 });
  add('heap', 51, -70, { r: 1.1, layer: 'p2_book_spines' }); add('heap', 67, -72, { r: 0.9, layer: 'p2_book_spines' }); add('press', 69.5, -76.6, { yaw: 0, down: 0.7 });
  add('bookcase', 73.4, -60, { hx: 0.45, hz: 2.4, h: 4.4, one: -1 }); add('bookcase', 72.6, -72.4, { hx: 0.45, hz: 2.2, h: 4.4, one: -1 });
  add('chandelier', 57, -68, { up: 5.4, hang: true }); add('brazier', 44, -76);
  add('flood', 66, -61, { hx: 4.2, hz: 3.2, lvl: 0.03, float: 3 }); add('decal', 60, -71, { layer: 'p2_blood_splashes', w: 2, flat: true, yaw: 0.8 });
  // ---- the Sealed Stack: what the old Librarians wouldn't let him have, shelved to the roof; a reading chair; a lamp.
  add('bookcase', 95.4, -68, { hx: 0.45, hz: 4.6, h: 7.5, one: -1 }); add('bookcase', 90, -73.4, { hx: 4, hz: 0.45, h: 7.5, one: 1 });
  add('seat', 88, -64, { hx: 0.5, hz: 0.5, stone: 'dark:wood' }); add('carpet', 90, -67, { hx: 3, hz: 3, layer: 'royal:cloth_red' }); add('chandelier', 90, -68, { up: 4, hang: true });
  // ---- the Scriptorium: low; the copyists' desks in two rows, each its candle; what they were copying when the water came.
  for (const x of [-62, -56, -50]) for (const z of [-78, -86]) { add('lectern', x, z); add('candles', x + 0.9, z, { up: 0.1 }); }
  add('bookcase', -67.4, -82, { hx: 0.45, hz: 5, h: 3.6, one: 1 }); add('flood', -54, -90, { hx: 5, hz: 3, lvl: 0.03, float: 5 }); add('chandelier', -56, -80, { up: 3.2, hang: true });
  add('decal', -44.05, -76, { layer: 'p2_damp_rise', w: 5, h: 2, up: 0, yaw: -PI / 2 });
  // ---- the Long Flood: the nave of the stacks, twenty metres high and twelve wide, knee deep end to end; the great cases
  // gone over across it, leaning on each other out of the water; piers up both walls; three lamps hung low over the
  // water, each with its glint, and the dark between them.
  add('flood', 18, -106.2, { hx: 5.9, hz: 36.4, lvl: -0.08, float: 30, glints: [[18, -82], [17, -106], [19, -130]] });
  for (const z of [-76, -88, -100, -120, -134]) { add('column', 12.7, z, { r: 0.7 }); add('column', 23.3, z, { r: 0.7 }); }
  add('leanshelf', 15.5, -80, { yaw: 1.2, w: 2.2, h: 8, lean: 0.62, sink: 1.2 });
  add('leanshelf', 21, -92, { yaw: -1.9, w: 2.2, h: 7.4, lean: 0.5, sink: 1.2, roll: 0.1 });
  add('leanshelf', 15, -102, { yaw: 0.9, w: 2.4, h: 8.4, lean: 0.75, sink: 1.2 });
  add('leanshelf', 20.5, -119, { yaw: -2.2, w: 2.2, h: 7, lean: 0.95, sink: 1.0, roll: -0.12 });
  add('leanshelf', 16, -136, { yaw: 1.6, w: 2.4, h: 8, lean: 0.55, sink: 1.2 });
  for (const z of [-82, -106, -130]) add('chandelier', 18, z, { up: 6.5, hang: true });
  add('bones', 14.5, -124, { r: 1.1 });
  // ---- the sluices: shafts, sixteen metres up; each its gate in the far wall, its wheel on the wall beside (five spokes),
  // the water coming down from the old cistern's pipe into a pool, and its race out to the Flood; the wardens' fire.
  add('sluicegate', -49.4, -114, { yaw: PI / 2, w: 2.6 }); add('gear', -37.5, -123.7, { yaw: 0, r: 3, up: 4.2, spokes: 5, layer: 'wood' }); add('gear', -32.6, -123.7, { yaw: 0, r: 1.2, up: 7.8, spokes: 5, layer: 'iron' }); add('chain', -36, -110, { up: 5 }); add('chandelier', -41, -112, { up: 7, hang: true });
  add('spout', -46, -123.4, { up: 11, w: 1.6, layer: 'lake' }); add('flood', -45, -120, { hx: 3.4, hz: 3, lvl: 0.04, float: 2 }); add('channel', -42, -119, { to: [-32, -112], w: 1.1 });
  add('brazier', -33, -121); add('barrels', -31.5, -106); add('crates', -47.5, -106);
  add('sluicegate', 65.4, -126, { yaw: -PI / 2, w: 2.6 }); add('gear', 53.5, -135.7, { yaw: 0, r: 3, up: 4.2, spokes: 5, layer: 'wood' }); add('gear', 48.6, -135.7, { yaw: 0, r: 1.2, up: 7.8, spokes: 5, layer: 'iron' }); add('chain', 52, -122, { up: 5 }); add('chandelier', 55, -124, { up: 7, hang: true });
  add('spout', 62, -135.4, { up: 11, w: 1.6, layer: 'lake' }); add('flood', 61, -132, { hx: 3.4, hz: 3, lvl: 0.04, float: 2 }); add('channel', 58, -130, { to: [48, -126], w: 1.1 });
  add('brazier', 49, -133); add('barrels', 47.5, -118); add('heap', 63, -118.5, { r: 1, layer: 'dark:rubble' });
  // ---- the Sump: the drain down, black water round it, what's washed up against its grating; one fire.
  add('flood', -84, -116, { hx: 5.4, hz: 5.4, lvl: 0.04, float: 6 }); add('pit', -84, -114, { r: 1.6 }); add('bones', -80, -121, { r: 1 }); add('heap', -89, -111, { r: 0.9, layer: 'p2_book_spines' });
  add('chain', -84, -114, { up: 3 }); add('brazier', -79.4, -111);
  // ---- the Lectorium: the stacks up its walls twenty-four metres into the dark; black water over all its floor but the
  // three dry stacks, a lamp hung low over each and nothing else lit but his own lectern at the far end, under his mark;
  // cases gone over in the shallows round the walls; three piers.
  add('flood', 18, -166, { hx: 19.6, hz: 25.6, lvl: 0.1, float: 34, glints: ISLES.map(([x, z]) => [x + 5.4, z + 2]) });
  for (const [x, z] of ISLES) { add('carpet', x, z, { hx: 3, hz: 3, layer: 'royal:cloth_red' }); add('lectern', x + 2.4, z - 2.4); add('chandelier', x, z, { up: 5.5, hang: true }); }
  for (const [x, z] of [[2.5, -172], [33.5, -150], [26, -187]]) add('column', x, z, { r: 1.2, solid: true });
  add('leanshelf', 2, -148, { yaw: 1.0, w: 2.4, h: 8, lean: 0.6, sink: 0.5 }); add('leanshelf', 35, -178, { yaw: -1.9, w: 2.4, h: 8.5, lean: 0.5, sink: 0.5 }); add('leanshelf', 3, -186, { yaw: 2.2, w: 2.2, h: 7, lean: 0.9, sink: 0.4 });
  add('mark', 18, -191.6, { up: 9, r: 2.2, back: -1 }); add('lectern', 11.5, -187); add('brazier', 8, -189.4); add('brazier', 28, -189.4);
  add('chandelier', 20, -150, { up: 10, hang: true }); add('chandelier', 22, -178, { up: 10, hang: true });
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
  { key: 'indexer', room: 'da_catalogue', name: 'The Indexer', models: ['da_indexer'], pal: ['Royal'], hp: 70000, damage: 245, reach: 3.0, loot: 8, at: [-6, 4] },
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
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 18, z: -188.4 },
  // At the foot of the Ancient Library's south wall, in the Middle Ward: its back to the wall, facing out toward the
  // curtain (src/core/phobos-build.js phobosCastle: the Library's hall at 11050, -150).
  portal: { x: 11030, z: -191, yaw: PI, r: 2.2 },
  // The Sump's drain: down into the Deep Stacks (src/core/delve-highward.js), which is barred from below till it's been
  // come down from here.
  links: [{ x: -89.6, z: -116, yaw: PI / 2, to: 'deepstacks', n: 2, opens: 'latch:sump' }],
  // What's off the way: the Sealed Stack behind the Bindery's last case; the copyists' strongbox; the East Sluice's.
  chests: [
    { id: 'sealed', room: 'da_sealed', x: 92, z: -64.4, yaw: PI, loot: 3 },
    { id: 'script', room: 'da_script', x: -46, z: -73, yaw: -PI / 2, loot: 2 },
    { id: 'sluice', room: 'da_sluice_e', x: 51, z: -117.2, yaw: PI, loot: 2 },
  ],
  vistas: [{ id: 'da_flood', name: 'the Long Flood', room: 'da_flood', x: 18, z: -74, r: 5 }],
  auto: { way: ['da_door', 'da_reading', 'da_catalogue', 'da_script', 'da_sluice_w', 'da_sump', 'da_sluice_w', 'da_flood', 'da_sluice_e', 'da_flood', 'da_reading', 'da_bindery', 'da_sealed', 'da_bindery', 'da_reading', 'da_flood', 'da_lectorium'] },
  shots: [
    ['da_reading', 'da_door', [-3, 3.2, -38], [17, 1, -66]],
    ['da_catalogue', 'da_door', [-41.5, 2.4, -38], [-70, 1.2, -44]],
    ['da_bindery', 'da_door', [45, 2.6, -57], [64, 1, -77]],
    ['da_flood', 'da_door', [19.5, 2.2, -70.5], [17, 4, -140]],
    ['da_sluice', 'da_door', [-32.5, 2.4, -106.5], [-47, 5, -121]],
    ['da_lectorium', 'da_door', [18, 3, -142.5], [18, 3, -192]],
  ],
  last: 'lector', tough: { hp: 26, damage: 2.8 }, pay: { xp: 70000, gold: 9600 },
  names: { "Velscour's Knights": 'SODDEN KNIGHT', 'The Possessed': 'DROWNED READER', Necromancers: 'ARCHIVIST', 'Plague Knights': 'SLUICE WARDEN', Kobolds: 'BILGE-RAT', 'Plague Giants': 'SLUICE-KEEPER', 'Giant Worms': 'INK-EEL', Harpies: 'LOOSE LEAF' },
  // (Its lamps burn cold, the drowned's blue-white, and few: a torch every twenty metres of wall, and each room's own two or three.)
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_blue', roof: 'dark:stone', flame: 'flame', light: [1, 0.72, 0.44], fire: [1, 0.76, 0.48], fog: [0.016, 0.02, 0.024, 0.014], every: 18, high: 3, glow: 3.6, lit: true, beam: 'dark:stone', bays: 'chains' },
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
