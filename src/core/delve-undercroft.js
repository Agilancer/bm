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

const rooms = [
  R('au_door', 'the Undercroft Stair', 0, -12, 5, 20, 0, 9, { rock: 'p2_sooty_plaster', foot: 'soot:block', ground: 'flags', banners: 0, fires: 12 }),
  R('au_still', 'the Great Stillroom', 8, -56, 22, 26, 0, 14, { rock: 'p2_jar_shelves', foot: 'soot:block', ground: 'flags', banners: 14, cloth: 'forest:cloth_red', fires: 15 }),
  R('au_jars', 'the Hall of Jars', -56, -48, 16, 16, 0, 10, { rock: 'p2_jar_shelves', foot: 'soot:block', ground: 'slate:flags', banners: 0, fires: 13 }),
  R('au_retort', 'the Retort Room', 64, -66, 18, 14, 0, 11, { rock: 'p2_fireback', foot: 'soot:block', ground: 'flags', banners: 0, fires: 12 }),
  R('au_green', 'the Green Cellar', -56, -98, 14, 14, 0, 8, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_ash_clay_ground', banners: 0, fires: 14 }),
  R('au_feed', 'the Feeding Gallery', 18, -108, 6, 30, 0, 12, { rock: 'slate:ashlar', foot: 'soot:block', ground: 'p2_walk_paving', banners: 11, cloth: 'forest:cloth_red', fires: 12 }),
  R('au_cold', 'the Cold Store', 58, -112, 12, 10, 0, 8, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0, fires: 16 }),
  R('au_hatch', 'the Hatch Stair', 62, -92, 6, 6, 0, 7, { rock: 'p2_sooty_plaster', foot: 'soot:block', ground: 'p2_worn_floorboards', banners: 0, fires: 20 }),
  R('au_cupboard', 'the Poison Cupboard', -86, -48, 6, 6, 0, 7, { rock: 'p2_jar_shelves', foot: 'soot:block', ground: 'p2_worn_floorboards', banners: 0, fires: 20 }),
  R('au_vault', 'the Growing Vault', 18, -166, 26, 32, 0, 20, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_ash_clay_ground', banners: 18, cloth: 'forest:cloth_red', fires: 14 }),
];

// (Each run a little into both rooms. The Stillroom's ways: the stair in at its north, west of its middle; the Feeding
// Gallery out at its south, east of it; the Hall of Jars north of its middle, the Retort Room south of it.)
const tunnels = [
  { pts: [[-12, -46], [-42, -46]], w: 5, h: 5 },                    // the Stillroom to the Hall of Jars
  { pts: [[28, -66], [48, -66]], w: 5, h: 5 },                      // ... and to the Retort Room
  { pts: [[-60, -62], [-60, -86]], w: 3, h: 4 },                    // the Hall of Jars down to the Green Cellar
  { pts: [[-44, -108], [-30, -108], [-30, -150], [-6, -150]], w: 3, h: 4 },   // the Green Cellar round to the Vault's west door
  { pts: [[22, -114], [48, -114]], w: 4, h: 4.5 },                  // the Feeding Gallery to the Cold Store
  { pts: [[62, -96], [62, -104]], w: 3, h: 4 },                     // the Cold Store up to the Hatch Stair
  // The Poison Cupboard: behind the Hall of Jars' west shelves, where one stands a hand out from the wall. On no map.
  { pts: [[-70, -52], [-82, -52]], w: 1.3, h: 3 },
  // Where they come in from: the jar stores, the Retort Room's flues, the Vault's sumps.
  { pts: [[-70, -40], [-78, -40]], w: 2, h: 4, dead: true, door: 'au_jars' },
  { pts: [[-50, -34], [-50, -26]], w: 2, h: 4, dead: true, door: 'au_jars' },
  { pts: [[80, -60], [88, -60]], w: 2, h: 4, dead: true, door: 'au_retort' },
  { pts: [[60, -54], [60, -46]], w: 2, h: 4, dead: true, door: 'au_retort' },
  { pts: [[42, -160], [50, -160]], w: 2, h: 4, dead: true, door: 'au_vault' },
  { pts: [[-6, -176], [-14, -176]], w: 2, h: 4, dead: true, door: 'au_vault' },
];

// The Hall of Jars' four great jars, one in each corner: where the Jar-Mother's brood come out (src/sim/castle-fights-a.js).
export const JARS = [[-68, -36], [-44, -36], [-68, -60], [-46, -60]];
// The Retort Room's three vents, and by each the wheel that shuts it. [x, z]
export const VENTS = [[52, -58], [76, -60], [64, -76]];
export const WHEELS = [[57.6, -64], [70.4, -66], [64, -68.4]];
// The Growing Vault's gallery, across its far end: a step up, its lip at this z (local), from x0 to x1.
export const GALLERY = { z: -184, z1: -197, x0: -6, x1: 42 };
const daises = [{ x: 18, z: -191, hx: 24, hz: 7, dy: 0.5 }];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Undercroft Stair: carboys and crates come down for the stills, a brazier, his mark over the way down.
  add('lintel', 0, -2, { hx: 5, stone: 'dark:ashlar' }); add('mark', 0, 7.6, { up: 6.6, r: 0.8, back: 1 });
  add('barrels', -3.6, -8); add('crates', 3.6, -18); add('barrels', 3.4, -26); add('brazier', -3.4, -24); add('brazier', 3.4, 2);
  add('decal', -4.95, -14, { layer: 'p2_soot_streaks', w: 4, h: 5, up: 3.5, yaw: PI / 2 });
  // ---- the Great Stillroom: six stills in two rows, their necks to the middle; the vats on their fires down the middle;
  // benches of glass; jars up every wall; green hangings; soot up the walls over each still.
  for (const z of [-42, -56, -70]) { add('alembic', -8, z, { yaw: PI / 2 }); add('alembic', 24, z + 4, { yaw: -PI / 2 }); }
  for (const z of [-44, -58, -72]) add('vat', 8, z, { r: 1.3 });
  add('table', -4, -78, { hx: 3, hz: 0.8 }); add('candles', -5, -78, { up: 0.85 }); add('jarshelf', 8, -30.3, { yaw: PI, w: 5 });
  add('jarshelf', -13.7, -62, { yaw: PI / 2, w: 4 }); add('jarshelf', 29.7, -44, { yaw: -PI / 2, w: 4 });
  add('chandelier', 8, -50, { up: 7, hang: true }); add('chandelier', 8, -66, { up: 7, hang: true });
  add('barrels', -10, -34); add('crates', 26, -78); add('heap', 26, -34, { r: 1.1, layer: 'dark:rubble' });
  add('decal', -13.95, -42, { layer: 'p2_soot_streaks', w: 3, h: 5, up: 4, yaw: PI / 2 }); add('decal', 29.95, -66, { layer: 'p2_soot_streaks', w: 3, h: 5, up: 4, yaw: -PI / 2 });
  add('decal', 2, -64, { layer: 'p2_scorch_mark', w: 2.2, flat: true });
  // ---- the Hall of Jars: a great vessel of green glass in each corner, floor to roof; rows of lesser jars on the shelves
  // between; a slab in the middle with what was last taken out; the brine on the flags.
  for (const [x, z] of JARS) { add('column', x, z, { r: 1.1, solid: true, shaft: 'forest:stone' }); add('pool', x, z, { r: 2.2, up: 0.03, layer: 'mire:water' }); }
  add('jarshelf', -56, -32.3, { yaw: PI, w: 5 }); add('jarshelf', -56, -63.7, { yaw: 0, w: 3 }); add('jarshelf', -71.7, -44, { yaw: PI / 2, w: 3 });
  add('table', -56, -38, { hx: 2.6, hz: 1 }); add('bones', -53, -40.4, { r: 0.6 }); add('candles', -58, -38, { up: 0.85 });
  add('chandelier', -56, -48, { up: 6, hang: true }); add('pool', -50, -54, { r: 3, up: 0.03, layer: 'mire:water' });
  // (The shelf that stands out from the west wall, and the dark behind it.)
  add('bookcase', -70.6, -54.6, { hx: 0.45, hz: 2, h: 3.4, one: 1 });
  // ---- the Poison Cupboard: a wall of little drawers, a locked press, one candle.
  add('jarshelf', -91.7, -48, { yaw: PI / 2, w: 4 }); add('jarshelf', -86, -42.3, { yaw: PI, w: 3 }); add('table', -84, -52, { hx: 1.2, hz: 0.7 }); add('candles', -84, -52, { up: 0.85 });
  // ---- the Retort Room: the great retort in the east wall on its hearth, the three vents in the floor, a wheel by each;
  // the coal, the flasks.
  add('hearth', 81.4, -68, { yaw: -PI / 2, great: 1.3 }); add('alembic', 74, -74, { yaw: PI });
  VENTS.forEach(([x, z], i) => { add('pool', x, z, { r: 1.5, up: 0.04, layer: 'iron' }); add('pool', x, z, { r: 1.0, up: 0.05, layer: 'obsidian' }); add('column', WHEELS[i][0], WHEELS[i][1], { r: 0.34, wood: true, solid: true }); });
  add('heap', 50, -76, { r: 1.3, layer: 'dark:rubble' }); add('barrels', 48, -54.5); add('crates', 78, -54.5); add('table', 58, -54.6, { hx: 2.6, hz: 0.7 });
  add('chandelier', 64, -66, { up: 6.4, hang: true }); add('decal', 81.95, -68, { layer: 'p2_soot_streaks', w: 6, h: 5, up: 6.5, yaw: -PI / 2 });
  add('decal', 62, -62, { layer: 'p2_scorch_mark', w: 2.4, flat: true, yaw: 1 });
  // ---- the Green Cellar: the beds in rows, what grows in them, roots down from above, black water standing.
  for (const [x, z] of [[-64, -92], [-52, -92], [-64, -104], [-50, -104]]) add('podbed', x, z, { r: 2 });
  add('caps', -46, -88, { n: 4, s: 0.9 }); add('caps', -66, -110, { n: 3, s: 0.7 }); add('roots', -58, -98, { r: 2.4 }); add('roots', -44, -100, { r: 1.6 });
  add('pool', -57, -98, { r: 2.6, up: 0.03, layer: 'mire:water' }); add('brazier', -68, -86); add('brazier', -44, -110);
  // ---- the Feeding Gallery: the two pumps (a vat and its wheel-post each), the pipes' channel down the middle to the
  // Vault; hangings of his green; the Feeders' braziers.
  add('channel', 18, -84, { to: [18, -134], w: 0.9 });
  add('vat', 14, -90, { r: 1.1 }); add('column', 22, -90, { r: 0.5, wood: true, solid: true }); add('vat', 22, -126, { r: 1.1 }); add('column', 14, -126, { r: 0.5, wood: true, solid: true });
  add('brazier', 13.4, -102); add('brazier', 22.6, -116); add('barrels', 22.4, -82); add('crates', 13.6, -134);
  // ---- the Cold Store: what they've kept, hung from the roof in its sacking, slabs along the walls, ice in the corners.
  for (const [x, z] of [[52, -108], [58, -116], [64, -108], [66, -117]]) add('cocoon', x, z);
  add('table', 50, -119.6, { hx: 2.6, hz: 0.8, solid: true }); add('bones', 50, -119.6, { r: 0.5, up: 0.9 }); add('heap', 68, -104, { r: 1, layer: 'pale:stone' }); add('heap', 47.5, -104, { r: 0.8, layer: 'pale:stone' });
  add('barrels', 68.4, -120);
  // ---- the Hatch Stair: a ladder's foot, sacks; up through the trapdoor is the Alchemists' Wing.
  add('crates', 57.6, -96.4); add('barrels', 66.6, -96); add('candles', 58, -88.4, { up: 0.1 });
  // ---- the Growing Vault: the great vat it came out of, split, at the room's middle; the pipes' channel into it; beds
  // either side; the gallery across the far end with his mark over it; piers; roots through the roof.
  add('channel', 18, -136, { to: [18, -158], w: 0.9 });
  add('pit', 18, -164, { r: 4.2 }); add('heap', 24.5, -166, { r: 1.6, layer: 'dark:rubble' }); add('heap', 12, -161, { r: 1.2, layer: 'dark:rubble' });
  for (const [x, z] of [[-2, -146], [38, -146], [-2, -172], [38, -172]]) add('podbed', x, z, { r: 2.4 });
  for (const [x, z] of [[4, -180], [32, -180]]) add('column', x, z, { r: 1.3, solid: true });
  add('roots', 6, -156, { r: 2.6 }); add('roots', 34, -160, { r: 2.2 }); add('roots', 18, -190, { r: 3 });
  add('mark', 18, -197.6, { up: 11, r: 2.2, back: -1 });
  for (const x of [0, 12, 24, 36]) add('brazier', x, -185.2);
  add('chandelier', 18, -150, { up: 9, hang: true }); add('chandelier', 18, -176, { up: 9, hang: true });
  add('caps', 40, -190, { n: 3, s: 0.8 }); add('caps', -4, -192, { n: 3, s: 0.8 });
  add('decal', 43.95, -164, { layer: 'p2_damp_rise', w: 8, h: 3, up: 0, yaw: -PI / 2 });
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
  { key: 'greatwork', room: 'au_vault', name: 'The Great Work', models: ['au_greatwork'], pal: ['Forest'], hp: 114000, damage: 292, reach: 4.6, loot: 0, needs: ['jarmother', 'distiller'], shut: 'gwk_shut', gives: 'key:undercroft', at: [0, -6] },
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
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 18, z: -194.4 },
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
  vistas: [{ id: 'au_gallery', name: "the Growing Vault's gallery", room: 'au_vault', x: 18, z: -190, up: 0.5, r: 5 }],
  auto: { way: ['au_door', 'au_still', 'au_jars', 'au_cupboard', 'au_jars', 'au_green', 'au_jars', 'au_still', 'au_retort', 'au_still', 'au_feed', 'au_cold', 'au_hatch', 'au_cold', 'au_feed', 'au_vault'] },
  shots: [
    ['au_still', 'au_door', [-10, 3.2, -34], [20, 1.2, -72]],
    ['au_jars', 'au_door', [-42, 2.6, -40], [-68, 1.4, -58]],
    ['au_retort', 'au_door', [48, 2.8, -58], [80, 1.6, -70]],
    ['au_vault', 'au_door', [18, 4.5, -137], [18, 2.5, -196]],
  ],
  last: 'greatwork', tough: { hp: 28, damage: 3.0 }, pay: { xp: 82000, gold: 11200 },
  names: { Kobolds: 'RETORT-BOY', 'Plague Knights': 'FEEDER', 'Plague Giants': 'PUMP-HAND', 'Giant Spiders': 'ROOT-CRAWLER', 'Dead Children': 'THE KEPT', 'The Possessed': 'THE STEEPED' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_green', roof: 'dark:stone', flame: 'dark:flame', light: [0.9, 0.62, 0.3], fire: [0.95, 0.62, 0.3], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "Castle Velscour: the Alchemists' Undercroft. Up in the wing they distil. Down here they grow.", clear: 'The Great Work is dead! The Glass Key is yours.', wipe: 'You fall... and wake on the Undercroft Stair.' },
};

export const UNDERCROFT_VARIANTS = {
  au_jarmother: { src: 'flesh_spider_demon', alt: 'spider_black', height: 3.4, name: 'THE JAR-MOTHER' },
  au_jarborn: { src: 'zombie_boy_1', alt: 'zombie_girl_1', height: 1.0, name: 'JAR-BORN' },
  au_distiller: { src: 'plague_knight_black', alt: 'plague_knight_red', height: 3.2, name: 'THE DISTILLER' },
  au_greatwork: { src: 'bone_golem', alt: 'skeleton_knight_giant', height: 5.2, name: 'THE GREAT WORK' },
};
