// The Alchemists' Undercroft: one of Castle Velscour's eight dungeons (docs/PHOBOS-CASTLE.md, set A), under the
// Alchemists' Wing in the Middle Ward. Up in the wing they distil; down here they grow: what's steeped in the jars, what's
// fed from the vats, and at the bottom of it the thing all of it is for. Three bosses, a party at your back if you'll pay
// for one (their fights: src/sim/castle-fights-a.js).
//   The Undercroft Stair, and the Great Stillroom past it: the big stills, the vats on their fires, the retort-boys.
//   The Hall of Jars, west: the Jar-Mother (88), who cracks her jars for her brood. Where one of them dies it leaves its
//     brine, and only stood in brine does she take a blow as she should. Behind her west shelves, on no map, the Poison
//     Cupboard.
//   The Retort Room, east: the Distiller (88), whose vents open one after another and fill the room; each has a wheel
//     that shuts it, for whoever gets to it and holds it.
//   The Green Cellar, south of the Hall of Jars: the beds, and the way round to the Vault's west door.
//   The Feeding Gallery, south of the Stillroom: the pipes down to the Vault, and the Feeders at the two pumps. The Cold
//     Store off it, and past that the Hatch Stair: up through a trapdoor into the Alchemists' Wing (barred from above:
//     come through it from here).
//   The Growing Vault: the Great Work (90). Its fume comes two ways, heavy and light: the heavy lies on the floor and the
//     gallery at the far end is over it; the light rises and the gallery's in it. Shut till its two are dead; each pump
//     you emptied on the way starves it of what it would have called up. It keeps the Glass Key.
//
// Where it really is: past the world's north edge in the castle's row; everything here local to it, x east, z south of
// the way in. Its door out on the land: at the foot of the Alchemists' Wing's north wall, in the Middle Ward.
// His livery down here is forest green. Nothing of Tessariel's (README "The two sides"): no bells, no seals of hers, no
// crosses; no two ways out of a room straight across from each other.
import { R } from './delve-lay.js';

const PI = Math.PI;

// (Each room its own section: the stair low and close; the Stillroom twelve metres under its pipes; the Hall of Jars and
// the Retort Room nine; the Green Cellar and the Cold Store low enough to touch; the Feeding Gallery a passage ten wide
// and seventy long; the Vault twenty-two metres up. No room lights itself (fires: 0, hang: 0): each has two or three
// lamps of its own, and the dark between them.)
const rooms = [
  R('au_door', 'the Undercroft Stair', 0, -16, 4, 24, 0, 6, { rock: 'ph_grey_plaster', foot: 'soot:block', ground: 'flags', banners: 0, fires: 0 }),
  R('au_still', 'the Great Stillroom', 8, -54, 15, 18, 0, 12, { rock: 'ph_grey_plaster', foot: 'soot:block', ground: 'flags', banners: 0, fires: 0, hang: 0 }),
  R('au_jars', 'the Hall of Jars', -56, -48, 16, 16, 0, 9, { rock: 'p2_jar_shelves', foot: 'soot:block', ground: 'slate:flags', banners: 0, fires: 0, hang: 0 }),
  R('au_retort', 'the Retort Room', 64, -66, 13, 11, 0, 9, { rock: 'p2_fireback', foot: 'soot:block', ground: 'flags', banners: 0, fires: 0 }),
  R('au_green', 'the Green Cellar', -56, -98, 14, 14, 0, 5, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_ash_clay_ground', banners: 0, fires: 0, hang: 0 }),
  R('au_feed', 'the Feeding Gallery', 16, -104, 5, 34, 0, 10, { rock: 'slate:ashlar', foot: 'soot:block', ground: 'p2_walk_paving', banners: 12, cloth: 'forest:cloth_red', fires: 0 }),
  R('au_cold', 'the Cold Store', 58, -112, 12, 10, 0, 5, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0, fires: 0 }),
  R('au_hatch', 'the Hatch Stair', 62, -92, 6, 6, 0, 7, { rock: 'ph_grey_plaster', foot: 'soot:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('au_cupboard', 'the Poison Cupboard', -86, -48, 6, 6, 0, 5, { rock: 'p2_jar_shelves', foot: 'soot:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('au_vault', 'the Growing Vault', 16, -160, 20, 24, 0, 22, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_ash_clay_ground', banners: 20, cloth: 'forest:cloth_red', fires: 0, hang: 0 }),
];

// (Each run a little into both rooms. The Stillroom's ways: the stair in at its north, west of its middle; the Feeding
// Gallery out at its south, east of it; the Hall of Jars north of its middle, the Retort Room south of it.)
const tunnels = [
  { pts: [[-5, -46], [-42, -46]], w: 4, h: 4.5 },                   // the Stillroom to the Hall of Jars
  { pts: [[21, -66], [53, -66]], w: 4, h: 4.5 },                    // ... and to the Retort Room
  { pts: [[-60, -62], [-60, -86]], w: 3, h: 3.6 },                  // the Hall of Jars down to the Green Cellar
  { pts: [[-44, -108], [-30, -108], [-30, -150], [-2, -150]], w: 3, h: 3.6 },   // the Green Cellar round to the Vault's west door
  { pts: [[19, -114], [48, -114]], w: 3.6, h: 4 },                  // the Feeding Gallery to the Cold Store
  { pts: [[62, -96], [62, -104]], w: 3, h: 3.6 },                   // the Cold Store up to the Hatch Stair
  // The Poison Cupboard: behind the Hall of Jars' west shelves, where one stands a hand out from the wall. On no map.
  { pts: [[-70, -52], [-82, -52]], w: 1.3, h: 3 },
  // Where they come in from: the jar stores, the Retort Room's flues, the Vault's sumps.
  { pts: [[-70, -40], [-78, -40]], w: 2, h: 4, dead: true, door: 'au_jars' },
  { pts: [[-50, -34], [-50, -26]], w: 2, h: 4, dead: true, door: 'au_jars' },
  { pts: [[75, -62], [83, -62]], w: 2, h: 4, dead: true, door: 'au_retort' },
  { pts: [[60, -57], [60, -49]], w: 2, h: 4, dead: true, door: 'au_retort' },
  { pts: [[34, -158], [42, -158]], w: 2, h: 4, dead: true, door: 'au_vault' },
  { pts: [[-2, -168], [-10, -168]], w: 2, h: 4, dead: true, door: 'au_vault' },
];

// The Hall of Jars' four great jars, one in each corner: where the Jar-Mother's brood come out (src/sim/castle-fights-a.js).
export const JARS = [[-68, -36], [-44, -36], [-68, -60], [-46, -60]];
// The Retort Room's three vents, and by each the wheel that shuts it. [x, z]
export const VENTS = [[55, -59], [73, -60], [64, -74]];
export const WHEELS = [[61, -63.5], [67.4, -65], [59.6, -68.6]];
// The Growing Vault's gallery, across its far end: a step up, its lip at this z (local), from x0 to x1.
export const GALLERY = { z: -174, z1: -184, x0: -2, x1: 34 };
const daises = [{ x: 16, z: -179, hx: 20, hz: 5, dy: 0.5 }];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  const pipe = (...pts) => add('pipe', pts[0][0], pts[0][1], { pts });
  // ---- the Undercroft Stair: low and close; a pipe along its wall the whole way down; carboys and crates; a lamp each end.
  add('lintel', 0, -2, { hx: 4, stone: 'dark:ashlar' }); add('mark', 0, 7.6, { up: 4.6, r: 0.6, back: 1 });
  add('barrels', -2.8, -10); add('crates', 2.8, -22); add('brazier', 2.6, 2); add('brazier', 2.6, -33);
  pipe([-3.6, 6, 4.8], [-3.6, -38, 4.8]); pipe([-3.6, 6, 4.2], [-3.6, -38, 4.2]);
  add('decal', 3.95, -14, { layer: 'p2_soot_streaks', w: 4, h: 4, up: 2, yaw: -PI / 2 });
  // ---- the Great Stillroom: four copper stills as tall as two men, a pair against each long wall, each on its firebox;
  // from each one's neck a pipe up to the roof and away across it, the four of them side by side and none crossing,
  // two down the south wall into the floor and two on over the Feeding Gallery to the Vault; the small work clustered
  // on benches between; two lamps. (What's seen from the stair: copper and fire to left and right, pipes overhead.)
  add('copper', -1.4, -58, { yaw: PI / 2, r: 3.1, h: 5.6, solid: true }); add('copper', -4.4, -67.4, { yaw: PI / 2, r: 1.7, h: 3 });
  add('copper', 17.4, -45.6, { yaw: -PI / 2, r: 3.1, h: 5.6, solid: true }); add('copper', 20.4, -56, { yaw: -PI / 2, r: 1.7, h: 3 });
  add('channel', 2.2, -58, { to: [9, -71], w: 0.45 }); add('channel', 13.8, -46, { to: [11, -71], w: 0.45 });
  pipe([-1.4, -58, 7.7], [-1.4, -58, 10.6], [5, -58, 10.6], [5, -71.5, 10.6], [5, -71.5, 0.3]);
  pipe([-4.4, -67.4, 5.2], [-4.4, -67.4, 8.2], [0.5, -67.4, 8.2], [0.5, -71.5, 8.2], [0.5, -71.5, 0.3]);
  pipe([17.4, -45.6, 7.7], [17.4, -45.6, 9.3], [13, -45.6, 9.3], [13, -137, 9.3]);
  pipe([20.4, -56, 5.2], [20.4, -56, 8.4], [15.4, -56, 8.4], [15.4, -137, 8.4]);
  add('benchstills', 6, -44, { yaw: 0.2, w: 2 }); add('benchstills', 9, -63, { yaw: -0.15, w: 2 });
  add('vat', 13, -62, { r: 1.1 }); add('barrels', -5, -38.5); add('crates', 21, -70); add('barrels', -5, -44); add('heap', -5, -70, { r: 1.1, layer: 'dark:rubble' });
  add('jarshelf', 8, -36.3, { yaw: PI, w: 4 }); add('jarshelf', 22.7, -62, { yaw: -PI / 2, w: 3 });
  add('chandelier', 8, -46, { up: 6.2, hang: true }); add('chandelier', 9, -63, { up: 6.2, hang: true });
  add('decal', -6.95, -56, { layer: 'p2_soot_streaks', w: 3, h: 5, up: 5, yaw: PI / 2 }); add('decal', 22.95, -42, { layer: 'p2_soot_streaks', w: 3, h: 5, up: 5, yaw: -PI / 2 });
  add('decal', 2, -52, { layer: 'p2_scorch_mark', w: 2.2, flat: true });
  // ---- the Hall of Jars: a great vessel of banded green glass in each corner, a lamp behind it and what's in it against
  // the light; lesser ones in rows along the walls between; a slab with what was last taken out; brine on the flags.
  JARS.forEach(([x, z]) => add('glassjar', x, z, { r: 1.1, h: 3.2, yaw: Math.atan2(-56 - x, -48 - z), solid: true }));
  for (const x of [-64, -60, -56]) add('glassjar', x, -33.4, { r: 0.6, h: 1.9, yaw: 0 });
  for (const x of [-56, -52]) add('glassjar', x, -62.6, { r: 0.6, h: 1.9, yaw: PI });
  for (const z of [-38, -53]) add('glassjar', -41.4, z, { r: 0.6, h: 1.9, yaw: -PI / 2 });
  add('jarshelf', -71.7, -46, { yaw: PI / 2, w: 3 }); add('table', -56, -40, { hx: 2.6, hz: 1 }); add('bones', -53, -42, { r: 0.6 }); add('candles', -58, -40, { up: 0.85 });
  add('chandelier', -60, -50, { up: 5.4, hang: true }); add('chandelier', -50, -44, { up: 5.4, hang: true }); add('brazier', -42.6, -58);
  add('flood', -50, -54, { hx: 3, hz: 2.4, lvl: 0.03, float: 0 }); add('flood', -62, -44, { hx: 2.2, hz: 2.8, lvl: 0.03, float: 0 });
  // (The shelf that stands out from the west wall, and the dark behind it.)
  add('bookcase', -70.6, -54.6, { hx: 0.45, hz: 2, h: 3.4, one: 1 });
  // ---- the Poison Cupboard: a wall of little drawers, a locked press, one lamp.
  add('jarshelf', -91.7, -48, { yaw: PI / 2, w: 4 }); add('jarshelf', -86, -42.3, { yaw: PI, w: 3 }); add('table', -84, -52, { hx: 1.2, hz: 0.7 }); add('candles', -84, -52, { up: 0.85 });
  add('chandelier', -86, -47, { up: 3.2, hang: true });
  // ---- the Retort Room: the great retort against its east wall, copper, twice a man's height, its pipe up and away across
  // the roof and down the west wall; the three vents in the floor, a post and a hand-wheel by each; coal; a bench.
  add('copper', 73, -68, { yaw: -PI / 2, r: 3.4, h: 5.2 });
  pipe([73, -68, 7.4], [73, -68, 8.4], [51.6, -68, 8.4], [51.6, -68, 0.3]); add('channel', 69.4, -70, { to: [53, -73.4], w: 0.45 });
  add('copper', 54.6, -57.6, { yaw: 0.8, r: 1.5, h: 2.8 }); pipe([54.6, -57.6, 5], [54.6, -57.6, 7.6], [51.6, -57.6, 7.6], [51.6, -64, 7.6]); pipe([76.4, -56, 3.4], [76.4, -76.4, 3.4]);
  VENTS.forEach(([x, z], i) => {
    add('pool', x, z, { r: 1.5, up: 0.04, layer: 'iron' }); add('pool', x, z, { r: 1.0, up: 0.05, layer: 'obsidian' });
    add('column', WHEELS[i][0], WHEELS[i][1], { r: 0.34, wood: true, solid: true }); add('gear', WHEELS[i][0], WHEELS[i][1], { flat: true, r: 0.55, up: 1.2, h: 0.12, layer: 'iron' });
  });
  add('heap', 53.4, -75, { r: 1.3, layer: 'dark:rubble' }); add('crates', 70, -57); add('benchstills', 58, -75.4, { yaw: 0, w: 1.8 });
  add('chandelier', 63, -62, { up: 5.6, hang: true }); add('brazier', 70.6, -74.6);
  add('decal', 76.95, -68, { layer: 'p2_soot_streaks', w: 6, h: 4, up: 4.5, yaw: -PI / 2 }); add('decal', 62, -70, { layer: 'p2_scorch_mark', w: 2.4, flat: true, yaw: 1 });
  // ---- the Green Cellar: low enough to touch; the beds in rows, what grows in them, roots down from above, black water.
  for (const [x, z] of [[-64, -92], [-52, -92], [-64, -104], [-50, -104]]) add('podbed', x, z, { r: 2 });
  add('caps', -46, -88, { n: 4, s: 0.9 }); add('caps', -66, -110, { n: 3, s: 0.7 }); add('roots', -58, -98, { r: 2.4 }); add('roots', -44, -100, { r: 1.6 });
  add('flood', -57, -98, { hx: 3, hz: 2.4, lvl: 0.03, float: 0 }); add('brazier', -67.4, -87); add('brazier', -45, -109.6); add('chandelier', -60, -98, { up: 3, hang: true }); add('chandelier', -50, -96, { up: 3, hang: true }); add('copper', -68, -98, { yaw: PI / 2, r: 1.2, h: 1.6 });
  // ---- the Feeding Gallery: a passage, the two pipes from the Stillroom along under its roof the whole way to the Vault;
  // a pump at each end (a copper cylinder, its fire, its hand-post), their own pipe along the west wall between them; the
  // channel down its middle; his green on the walls; a fire at each pump and the dark between.
  add('channel', 16, -76, { to: [16, -134], w: 0.8 });
  add('copper', 19.4, -86, { yaw: -PI / 2, r: 0.9, h: 1.7 }); add('column', 13, -84, { r: 0.4, wood: true });
  add('copper', 12.6, -122, { yaw: PI / 2, r: 0.9, h: 1.7 }); add('column', 19, -124, { r: 0.4, wood: true });
  pipe([11.5, -74, 3.2], [11.5, -136, 3.2]); pipe([20.5, -86, 3.6], [20.5, -110, 3.6]);
  add('brazier', 12.6, -90); add('brazier', 19.4, -118); add('chandelier', 16, -78, { up: 6, hang: true }); add('chandelier', 16, -104, { up: 6, hang: true }); add('chandelier', 16, -130, { up: 6, hang: true }); add('barrels', 19.6, -73.4); add('crates', 12.4, -135);
  // ---- the Cold Store: low; what they've kept, hung from the roof in its sacking, slabs along the walls, ice in the corners.
  for (const [x, z] of [[52, -108], [58, -116], [64, -108], [66, -117]]) add('cocoon', x, z);
  add('table', 50, -119.6, { hx: 2.6, hz: 0.8 }); add('bones', 50, -117.6, { r: 0.5 }); add('heap', 68, -104, { r: 1, layer: 'pale:stone' }); add('heap', 47.5, -104, { r: 0.8, layer: 'pale:stone' });
  add('barrels', 68.4, -120); add('brazier', 48, -110.6);
  // ---- the Hatch Stair: sacks and crates; up through the trapdoor is the Alchemists' Wing.
  add('crates', 57.6, -96.4); add('barrels', 66.6, -96); add('brazier', 58, -88.4);
  // ---- the Growing Vault: twenty-two metres up; the great vat it came out of, copper, as tall as a house, at the room's
  // north-east corner with the two pipes down into its head; beds either side; the gallery across the far end, a row of fires
  // along its lip and his mark over it; pipes along both walls; two piers; roots through the roof.
  // (Off the line from the way in to where it stands: nothing between you and it.)
  add('copper', 28, -146, { yaw: 0, r: 3, h: 4.6, solid: true });
  pipe([13, -137, 9.3], [13, -140, 9.3], [26.6, -146, 7.5]); pipe([15.4, -137, 8.4], [15.4, -139, 8.4], [28.4, -144.8, 7.5]);
  pipe([-3.6, -138, 4], [-3.6, -172, 4]); pipe([35.6, -140, 5], [35.6, -172, 5]);
  for (const [x, z] of [[2, -146], [31, -156], [1, -164], [31, -166]]) add('podbed', x, z, { r: 2.2 });
  for (const [x, z] of [[4, -170], [28, -170]]) add('column', x, z, { r: 1.2, solid: true });
  add('roots', 6, -156, { r: 2.4 }); add('roots', 28, -158, { r: 2 }); add('roots', 16, -181, { r: 2.6 });
  add('mark', 16, -183.6, { up: 10, r: 2.2, back: -1 });
  for (const x of [2, 11, 21, 30]) add('brazier', x, -175.2);
  add('chandelier', 6, -156, { up: 8, hang: true }); add('chandelier', 26, -160, { up: 8, hang: true }); add('chandelier', 16, -170, { up: 9, hang: true });
  add('caps', 33, -181, { n: 3, s: 0.8 }); add('caps', -1, -182, { n: 3, s: 0.8 });
  add('decal', 35.95, -160, { layer: 'p2_damp_rise', w: 8, h: 3, up: 0, yaw: -PI / 2 });
}

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const BOYS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
const FEEDERS = ['plague_knight_black', 'plague_knight_red'];
const KEPT = ['zombie_boy_1', 'zombie_boy_2', 'zombie_girl_1', 'possessed_man_2', 'possessed_woman_1'];
// (None on the stair: it's where you wake if you fall. The Feeding Gallery's two are the pumps the Great Work is weighed by.)
const packs = [
  { key: 'au_boys', room: 'au_still', pick: BOYS, n: 6, pal: ['Forest'], at: [0, 0], r: 6 },
  { key: 'au_feed_n', room: 'au_feed', pick: FEEDERS, n: 4, elite: ['plague_giant_1'], pal: ['Forest'], tough: { hp: 1.3, damage: 1.2 }, at: [0, 18], r: 2.5 },
  { key: 'au_feed_s', room: 'au_feed', pick: FEEDERS, n: 4, elite: ['plague_giant_armored'], pal: ['Forest'], tough: { hp: 1.3, damage: 1.2 }, at: [0, -18], r: 2.5 },
  { key: 'au_green', room: 'au_green', pick: ['spider_black', 'spider_red'], n: 5, elite: ['flesh_spider_demon'], pal: ['Forest'], at: [0, 0], r: 5 },
  { key: 'au_cold', room: 'au_cold', pick: KEPT, n: 6, pal: ['Verdigris', 'Forest'], at: [0, 0], r: 4 },
];
const bosses = [
  { key: 'jarmother', room: 'au_jars', name: 'The Jar-Mother', models: ['au_jarmother'], pal: ['Forest'], hp: 84000, damage: 280, reach: 3.6, loot: 8, at: [0, 0] },
  { key: 'distiller', room: 'au_retort', name: 'The Distiller', models: ['au_distiller'], pal: ['Forest'], hp: 88000, damage: 285, reach: 3.2, loot: 8, at: [0, 6] },
  { key: 'greatwork', room: 'au_vault', name: 'The Great Work', models: ['au_greatwork'], pal: ['Forest'], hp: 114000, damage: 292, reach: 4.6, loot: 0, needs: ['jarmother', 'distiller'], shut: 'gwk_shut', gives: 'key:undercroft', at: [0, -2] },
];
const warnings = {
  jar_open: "The Jar-Mother. She cracks her jars for her brood. Where one of them dies it leaves its brine on the flags, and only stood in brine does she take a blow as she should: kill them where you want her, and bring her into it.",
  jar_spit: 'The Jar-Mother spits! Between the gobs, and out of what they leave.',
  jar_breath: 'She breathes it out! Out of the cone.',
  jar_pounce: 'She gathers herself! Out of the line.',
  jar_rain: 'Brine from the roof! Out of the circles.',
  jar_brood: 'She cracks a jar: her brood come out! Kill them where you want the brine.',
  jar_brine: 'Brine on the flags. Bring her into it.',
  jar_dry: 'The brine dries. She shrugs your blows off again.',
  jar_turn: 'The Jar-Mother turns on you! Get behind the tank, or out of her reach, till she lets go.',
  jar_enrage: 'The Jar-Mother is enraged!',
  dst_open: "The Distiller. His vents open one after another, and each one's fume spreads till the room's full of it. By every vent is a wheel: whoever's nearest, get to it and hold it till it's shut.",
  dst_cleave: 'The Distiller swings his ladle! Out of the arc.',
  dst_flask: 'Flasks! Out of the pools.',
  dst_spray: 'He opens a tap on you! Out of the cone.',
  dst_quake: 'He stamps the flags! Jump the ring as it reaches you.',
  dst_vent: "A VENT OPENS! Its fume spreads till it's shut: whoever's nearest, to its wheel, and hold it!",
  dst_shut: 'The vent is shut.',
  dst_turn: 'The Distiller turns on you! Get behind the tank, or out of his reach, till he lets go.',
  dst_enrage: 'The Distiller is enraged!',
  gwk_shut: "The Growing Vault is shut. Its doors open to the Great Work's two: the Jar-Mother and the Distiller.",
  gwk_open: "The Great Work. Its fume comes two ways. The heavy lies along the floor: get up onto the gallery at the far end. The light rises: get down off it. It says which. Each pump you emptied on the way leaves it less to call up.",
  gwk_less_one: 'One of its pumps is stopped: less comes up out of the sumps for it.',
  gwk_less_two: 'Both its pumps are stopped: almost nothing comes up out of the sumps for it.',
  gwk_slam: 'The Great Work brings both fists down! Out of the arc.',
  gwk_shards: 'It throws what it stands in! Out of the circles.',
  gwk_quake: 'It stamps! Jump the ring as it reaches you.',
  gwk_lines: 'It drags its hands through the floor! Out of the three lines.',
  gwk_heavy: 'THE HEAVY FUME! It lies along the floor: up onto the gallery at the far end, now!',
  gwk_light: 'THE LIGHT FUME! It rises to the gallery: down off it, now!',
  gwk_clear: 'The fume thins.',
  gwk_grown: 'The grown come up out of the sumps!',
  gwk_turn: 'The Great Work turns on you! Get behind the tank, or out of its reach, till it lets go.',
  gwk_enrage: 'The Great Work is enraged!',
};

export const UNDERCROFT = {
  key: 'undercroft', tag: 'au', name: "Castle Velscour: the Alchemists' Undercroft", short: "the Alchemists' Undercroft", x: 13920, z: -5700, y: -60, level: 86, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { jarmother: 'jar_turn', distiller: 'dst_turn', greatwork: 'gwk_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 16, z: -180.4 },
  // At the foot of the Alchemists' Wing's north wall, in the Middle Ward: its back to the wall, facing north across the
  // court to the Menagerie (src/core/phobos-build.js phobosCastle: the wing's hall at 11030, 120).
  portal: { x: 11030, z: 145.6, yaw: 0, r: 2.2 },
  // The Hatch Stair's trapdoor: up into the Middle Ward's Alchemists' Wing (src/core/delve-castle.js), which is barred from
  // above till it's been come up from here.
  links: [{ x: 62, z: -87.4, yaw: PI, to: 'middleward', n: 6, opens: 'latch:trapdoor' }],
  chests: [
    { id: 'cupboard', room: 'au_cupboard', x: -88, z: -52.4, yaw: 0, loot: 3 },
    { id: 'cold', room: 'au_cold', x: 68.4, z: -113, yaw: -PI / 2, loot: 2 },
    { id: 'green', room: 'au_green', x: -68.4, z: -98, yaw: PI / 2, loot: 2 },
  ],
  vistas: [{ id: 'au_gallery', name: "the Growing Vault's gallery", room: 'au_vault', x: 6, z: -179, up: 0.5, r: 4 }],
  auto: { way: ['au_door', 'au_still', 'au_jars', 'au_cupboard', 'au_jars', 'au_green', 'au_jars', 'au_still', 'au_retort', 'au_still', 'au_feed', 'au_cold', 'au_hatch', 'au_cold', 'au_feed', 'au_vault'] },
  shots: [
    ['au_still', 'au_door', [1, 2.6, -38], [11, 3.6, -68]],
    ['au_jars', 'au_door', [-42.5, 2.4, -46], [-66, 2, -57]],
    ['au_retort', 'au_door', [52.5, 2.4, -66], [75, 2.6, -68]],
    ['au_feed', 'au_door', [16, 2, -71.5], [16, 4.5, -136]],
    ['au_green', 'au_door', [-60, 1.8, -85.6], [-52, 1, -108]],
    ['au_vault', 'au_door', [-1.5, 3, -150], [26, 5, -168]],
  ],
  last: 'greatwork', tough: { hp: 28, damage: 3.0 }, pay: { xp: 82000, gold: 11200 },
  names: { Kobolds: 'RETORT-BOY', 'Plague Knights': 'FEEDER', 'Plague Giants': 'PUMP-HAND', 'Giant Spiders': 'ROOT-CRAWLER', 'Dead Children': 'THE KEPT', 'The Possessed': 'THE STEEPED' },
  // (Its wall lights are green, what they burn down here, one every sixteen metres; each room's own two or three lamps are
  // fire, as the stills' are.)
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_green', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.5, 0.22], fire: [1, 0.66, 0.34], fog: [0.02, 0.026, 0.016, 0.012], every: 16, high: 3, glow: 3.2, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "Castle Velscour: the Alchemists' Undercroft. Up in the wing they distil. Down here they grow.", clear: 'The Great Work is dead! The Glass Key is yours.', wipe: 'You fall... and wake on the Undercroft Stair.' },
};

export const UNDERCROFT_VARIANTS = {
  au_jarmother: { src: 'flesh_spider_demon', alt: 'spider_black', height: 3.4, name: 'THE JAR-MOTHER' },
  au_jarborn: { src: 'zombie_boy_1', alt: 'zombie_girl_1', height: 1.0, name: 'JAR-BORN' },
  au_distiller: { src: 'plague_knight_black', alt: 'plague_knight_red', height: 3.2, name: 'THE DISTILLER' },
  au_greatwork: { src: 'bone_golem', alt: 'skeleton_knight_giant', height: 5.2, name: 'THE GREAT WORK' },
};
