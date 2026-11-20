// The Menagerie of Chains: one of Castle Velscour's dungeons (docs/PHOBOS-CASTLE.md, set B), where what he's had caught is
// kept, baited and bred. Gone into by the Menagerie's door in the far wall of the Middle Ward's Conservatory, or by its own
// door on the Beast Court, both locked till the Marshal's Key is had (the Iron Barracks'). Forest green and his red.
//   The Feeding Gate, and the Cage Rows behind it: two rows of cages down a long hall, most of them full.
//   The Baiting Pit, west, sunk in the floor: Old Hunger (94) on his chain, and the pit hounds let in to him. What he
//     kills he eats, unless the carcass is kicked into the drain first.
//   The Wolf Runs, east; and the Wyrm Tank past them, half of it water.
//   The Aviary, south-west, as tall as the tower over it: dead trees, hung cages, and the Matron of Wings (95), whose
//     shriek takes everything that isn't behind a tree.
//   The Larder, south of the rows: hooks. Behind the furthest carcasses, the Keeper's Cache (on no map).
//   The Keeper's Lodge, and past it the Ring of Chains: the Keeper of Chains (97), shut in till his two are dead. Every
//     wing of beasts you emptied on the way is one he can't loose at you: the Wolf Runs, the south Cage Rows, the Wyrm Tank.
// Local to its own way in: x east, z south of the door (the way on is toward -z), y over its floor.
// No two ways out of a room straight across from each other: the corner map draws no cross of his rooms.
import { R } from './delve-lay.js';

const PI = Math.PI;

const rooms = [
  R('mc_gate', 'the Feeding Gate', 0, -12, 5, 20, 0, 9, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 14 }),
  R('mc_rows', 'the Cage Rows', 0, -56, 24, 28, 0, 14, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_ward_paving', banners: 18, cloth: 'forest:cloth_red', fires: 12 }),
  R('mc_pit', 'the Baiting Pit', -64, -52, 20, 20, -3, 17, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_ash_clay_ground', banners: 0, fires: 9 }),
  R('mc_runs', 'the Wolf Runs', 60, -44, 20, 12, 0, 9, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_straw_ground', banners: 0, fires: 12 }),
  R('mc_tank', 'the Wyrm Tank', 62, -92, 18, 16, -2, 12, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'slate:flags', banners: 0, fires: 13 }),
  R('mc_aviary', 'the Aviary', -58, -114, 22, 22, 0, 30, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ash_clay_ground', banners: 16, cloth: 'forest:cloth_red', hang: 0, fires: 12 }),
  R('mc_larder', 'the Larder', 0, -112, 12, 14, 0, 8, { rock: 'p2_sooty_plaster', foot: 'soot:block', ground: 'flags', banners: 0, fires: 14 }),
  R('mc_cache', "the Keeper's Cache", -27, -106, 4.5, 4.5, 0, 5, { rock: 'course', foot: 'block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('mc_lodge', "the Keeper's Lodge", 44, -136, 14, 12, 0, 9, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 9, cloth: 'p2_banner_blood', fires: 14 }),
  R('mc_ring', 'the Ring of Chains', 0, -168, 24, 22, 0, 18, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', banners: 16, cloth: 'p2_banner_blood', fires: 10 }),
];

const tunnels = [
  { pts: [[-22, -48], [-46, -48]], w: 3.5, h: 5 },                      // the Cage Rows down to the Baiting Pit
  { pts: [[22, -40], [42, -40]], w: 3, h: 4.6 },                        // the Cage Rows to the Wolf Runs
  { pts: [[70, -54], [70, -78]], w: 3, h: 4.6 },                        // the Wolf Runs to the Wyrm Tank
  { pts: [[22, -66], [46, -86]], w: 3, h: 4.6 },                        // the Cage Rows to the Wyrm Tank
  { pts: [[-20, -78], [-38, -96]], w: 3.5, h: 5 },                      // the Cage Rows to the Aviary
  { pts: [[-70, -70], [-70, -94]], w: 3, h: 4.6 },                      // the Baiting Pit up to the Aviary
  { pts: [[10, -82], [10, -100]], w: 3, h: 4.6 },                       // the Cage Rows to the Larder
  { pts: [[10, -118], [32, -130]], w: 3, h: 4.6 },                      // the Larder to the Keeper's Lodge
  { pts: [[56, -106], [52, -126]], w: 3, h: 4.6 },                      // the Wyrm Tank to the Keeper's Lodge
  { pts: [[32, -142], [22, -156]], w: 4, h: 5.4 },                      // the Lodge to the Ring of Chains
  { pts: [[-52, -134], [-52, -160], [-22, -166]], w: 2.6, h: 4.4 },     // the Keeper's Walk, from the Aviary round to the Ring
  // The Keeper's Cache: behind the furthest carcasses in the Larder's west wall. On no map.
  { pts: [[-10, -106], [-24, -106]], w: 1.3, h: 3, dark: true },
  // The gates the pit hounds are let in by, and the Ring's.
  { pts: [[-82, -40], [-89, -40]], w: 2, h: 4, dead: true, door: 'mc_pit' },
  { pts: [[-82, -64], [-89, -64]], w: 2, h: 4, dead: true, door: 'mc_pit' },
  { pts: [[-58, -34], [-58, -27]], w: 2, h: 4, dead: true, door: 'mc_pit' },
  { pts: [[-22, -182], [-29, -182]], w: 2, h: 4, dead: true, door: 'mc_ring' },
  { pts: [[22, -178], [29, -178]], w: 2, h: 4, dead: true, door: 'mc_ring' },
  { pts: [[4, -188], [4, -195]], w: 2, h: 4, dead: true, door: 'mc_ring' },
];

// Old Hunger's stake, in the middle of the Baiting Pit (src/sim/castle-fights-b.js oldhunger).
export const PIT_STAKE = [-64, -52];
// The Aviary's dead trees: what the Matron's shriek doesn't reach behind. [x, z, how far round]
export const AVIARY_TREES = [[-73, -101, 1.8], [-43, -104, 1.8], [-67, -126, 1.8], [-47, -127, 1.8], [-58, -97, 1.6]];
// The chain posts of the Ring of Chains: what the Keeper's chain snags on. [x, z, how far round]
export const CHAIN_POSTS = [[-13, -158, 0.9], [11, -156, 0.9], [-15, -176, 0.9], [14, -177, 0.9], [0, -184, 0.9]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Feeding Gate: the feed barrows and barrels, joints on hooks, the inner gate wound up, the Menagerie's own door
  // (back to the Conservatory) in the east wall.
  add('portcullis', 0, -27, { w: 4.6, h: 9, raised: 6.2, plain: true }); add('lintel', 0, -2, { hx: 5, stone: 'dark:ashlar' });
  add('hooks', -3.2, -14, { n: 4, alongZ: true, up: 2.3 }); add('barrels', -3.6, 3); add('cart', -2.6, -22, { yaw: 0.2 }); add('barrels', 3.4, -24);
  add('brazier', 3.6, 2); add('brazier', -3.6, -28);
  add('mark', 4.75, -12, { up: 5.6, r: 0.6, yaw: -PI / 2, back: -1 });
  add('decal', -2, -8, { layer: 'p2_blood_splashes', w: 1.8, flat: true });
  // ---- the Cage Rows: two rows of cages down the hall, a way between; some stand open; chains from the roof; what's
  // been thrown out of them.
  for (const [i, z] of [-36, -46, -56, -66, -76].entries()) {
    // (turn: its own length lies along z; hx and hz are what it takes up of the floor.)
    add('beastcage', -16, z, { hx: 2.6, hz: 3.4, h: 3, yaw: PI / 2, turn: true, solid: true, open: i === 1 || i === 4, bones: i % 2 === 0 });
    add('beastcage', 16, z + 3, { hx: 2.6, hz: 3.4, h: 3, yaw: -PI / 2, turn: true, solid: true, open: i === 2, bones: i % 2 === 1 });
  }
  add('chain', -4, -44, { up: 5 }); add('chain', 5, -66, { up: 4 }); add('cage', -3, -60, { up: 6 }); add('cage', 4, -38, { up: 7 });
  add('bones', 2, -52, { r: 1.2 }); add('heap', -6, -72, { r: 1.2, layer: 'p2_straw_ground' }); add('barrels', 22, -31); add('crates', -22, -81);
  add('decal', 3, -62, { layer: 'p2_blood_splashes', w: 2.4, flat: true, yaw: 0.8 }); add('decal', -23.95, -60, { layer: 'p2_gouges', w: 2.6, up: 0.8, yaw: PI / 2 });
  for (const [x, z] of [[-6, -32], [6, -80], [-8, -56], [8, -48]]) add('brazier', x, z);
  // ---- the Baiting Pit: his stake in the middle and the chain off it, the watchers' walk round the walls over the pit, a
  // cage hung for the bait, the drain, old kills.
  add('chainpost', PIT_STAKE[0], PIT_STAKE[1], { r: 0.7, h: 1.6 });
  add('walk', -64, -33.25, { hx: 19, hz: 1.25, up: 7, side: -1 }); add('walk', -82.75, -52, { hx: 1.25, hz: 19, up: 7, side: 1 });
  add('cage', -56, -44, { up: 6.5 }); add('cage', -72, -60, { up: 8 });
  add('pool', -74, -42, { r: 2.2, up: 0.03, layer: 'mire:water' }); add('bones', -52, -62, { r: 1.6 }); add('bones', -74, -64, { r: 1.2 }); add('bones', -60, -38, { r: 1 });
  add('decal', -66, -56, { layer: 'p2_blood_splashes', w: 3, flat: true }); add('decal', -58, -46, { layer: 'p2_blood_splashes', w: 2.2, flat: true, yaw: 2 });
  for (const x of [-78, -64, -50]) add('basket', x, -34.4, { up: 8 });
  add('mark', -83.6, -52, { up: 9, r: 1.3, yaw: PI / 2, back: 1 });
  // ---- the Wolf Runs: three long pens, straw, the troughs.
  for (const x of [48, 60, 72]) add('beastcage', x, -36.5, { hx: 4.6, hz: 3, h: 2.4, yaw: PI, solid: true, open: x === 60 });
  add('heap', 46, -52, { r: 1.6, layer: 'p2_straw_ground' }); add('heap', 76, -50, { r: 1.2, layer: 'p2_straw_ground' });
  add('pool', 60, -53, { r: 1.2, up: 0.3, layer: 'mire:water' }); add('bones', 54, -48, { r: 1 }); add('rack', 79, -44, { yaw: -PI / 2, h: 2.2, n: 5 });
  add('brazier', 44, -46); add('brazier', 76, -42);
  // ---- the Wyrm Tank: the pool, half the room; an islet in it, the sluice, the feeding plank.
  add('pool', 66, -94, { r: 10, up: 0.25, layer: 'mire:water' }); add('sluicegate', 79.4, -92, { yaw: PI / 2, w: 2.4 });
  add('heap', 68, -96, { r: 2.6, layer: 'dark:rubble' }); add('bones', 68, -95, { r: 1.2 }); add('eggs', 70, -98, { s: 0.8 });
  add('table', 48, -84, { hx: 0.7, hz: 2.4 }); add('barrels', 47, -105); add('chain', 62, -86, { up: 4 });
  add('brazier', 48, -96); add('brazier', 58, -79);
  add('decal', 79.95, -100, { layer: 'p2_damp_rise', w: 4, h: 3, up: 0.2, yaw: -PI / 2 });
  // ---- the Aviary: dead trees (they stop a body, and a shriek), cages hung at every height, nests, the open sky far up.
  for (const [x, z, r] of AVIARY_TREES) add('deadtree', x, z, { h: r > 1.7 ? 14 : 11, r, solid: true });
  add('daylight', -58, -114, { r: 5, pool: false });
  for (const [x, z, up] of [[-64, -108, 9], [-50, -118, 13], [-70, -116, 16], [-52, -100, 7], [-62, -130, 11]]) add('cage', x, z, { up });
  add('nest', -76, -132, { r: 1.4 }); add('nest', -40, -96, { r: 1.2 }); add('eggs', -76, -131, { s: 0.7 }); add('bones', -60, -120, { r: 1.4 });
  add('roots', -78, -112, { r: 2 }); add('roots', -38, -132, { r: 1.8 });
  for (const [x, z] of [[-78, -96], [-38, -116], [-76, -122], [-58, -134]]) add('brazier', x, z);
  // ---- the Larder: rows of joints on hooks, the block, the knives, the brine; behind the west wall's row, a way.
  for (const z of [-104, -112, -120]) add('hooks', -2, z, { n: 5, up: 2.2 });
  add('hooks', -10.6, -106, { n: 3, alongZ: true, up: 2 });
  add('table', 8, -108, { hx: 0.8, hz: 2.4, solid: true }); add('tools', 11.2, -104, { yaw: -PI / 2 }); add('vat', 8, -121, { r: 1 }); add('barrels', -9, -123);
  add('decal', 2, -110, { layer: 'p2_blood_splashes', w: 2.6, flat: true }); add('decal', -4, -118, { layer: 'p2_blood_splashes', w: 1.8, flat: true, yaw: 1.4 });
  add('brazier', -8, -108); add('brazier', 4, -124);
  // ---- the Keeper's Cache.
  add('crates', -29.4, -103.4); add('barrels', -29.2, -108.6); add('candles', -26, -109.4, { up: 0.1 });
  // ---- the Keeper's Lodge: his bed, his table, the goads and collars on the walls, his fire, his strongbox.
  add('hearth', 57.4, -136, { yaw: -PI / 2 }); add('bunk', 52, -146, { hx: 1.2, hz: 0.6, cloth: 'cloth_red' });
  add('table', 42, -134, { hx: 2.2, hz: 0.8 }); add('candles', 41, -134, { up: 0.85 }); add('seat', 42, -131.4, { hx: 0.5, hz: 0.5, stone: 'dark:wood', flip: true });
  add('rack', 44, -124.6, { yaw: 0, h: 2.4, n: 6, board: true }); add('coatrail', 34, -146.6, { hx: 2 }); add('shields', 30.6, -132, { yaw: PI / 2 });
  add('carpet', 44, -138, { hx: 5, hz: 3, layer: 'forest:cloth_red' }); add('brazier', 34, -128);
  // ---- the Ring of Chains: the chain posts, cages hung over it, his mark on the far wall, fires.
  for (const [x, z, r] of CHAIN_POSTS) add('chainpost', x, z, { r, h: 3, solid: true });
  for (const [x, z, up] of [[-18, -166, 8], [18, -168, 10], [-6, -186, 12], [8, -152, 9]]) add('cage', x, z, { up });
  add('mark', 0, -189.6, { up: 10, r: 2.2, back: 1 });
  for (const [x, z] of [[-20, -150], [20, -150], [-20, -186], [20, -186]]) add('brazier', x, z);
  add('decal', -4, -170, { layer: 'p2_blood_splashes', w: 3, flat: true, yaw: 0.5 });
}
const daises = [{ x: 68, z: -96, r: 3, dy: 0.5 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const SPIDERS = ['spider_black', 'spider_red'];
const HANDS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
// (None in the Feeding Gate: it's where you wake if you fall.)
const packs = [
  { key: 'mc_rows_n', room: 'mc_rows', pick: ['goatman_black', 'goatman_bw'], n: 4, pal: ['Forest'], at: [-2, 14], r: 4 },
  { key: 'mc_rows_s', room: 'mc_rows', pick: SPIDERS, n: 6, elite: ['flesh_spider_demon'], pal: ['Forest', 'Bloodred'], tough: { hp: 1.2, damage: 1.2 }, at: [2, -18], r: 5 },
  { key: 'mc_runs', room: 'mc_runs', pick: ['mc_hound'], n: 6, pal: ['Forest', 'Rust'], at: [0, -4], r: 5 },
  { key: 'mc_tank', room: 'mc_tank', pick: ['mc_wyrmling'], n: 5, pal: ['Forest'], tough: { hp: 1.3, damage: 1.3 }, at: [-8, 2], r: 4 },
  { key: 'mc_larder', room: 'mc_larder', pick: HANDS, n: 5, pal: ['Bloodred'], at: [2, -4], r: 4 },
  { key: 'mc_lodge', room: 'mc_lodge', pick: KNIGHTS, n: 4, elite: ['plague_giant_armored'], pal: ['Bloodred'], tough: { hp: 1.3, damage: 1.2 }, at: [-2, -2], r: 4 },
];
const bosses = [
  { key: 'oldhunger', room: 'mc_pit', name: 'Old Hunger', models: ['mc_hunger'], pal: ['Rust'], hp: 132000, damage: 335, reach: 3.8, loot: 8, at: [5, 0] },
  { key: 'matron', room: 'mc_aviary', name: 'The Matron of Wings', models: ['mc_matron'], pal: ['Forest'], hp: 104000, damage: 335, reach: 3.2, loot: 8, at: [0, 2] },
  { key: 'keeper', room: 'mc_ring', name: 'The Keeper of Chains', models: ['mc_keeper'], pal: ['Bloodred'], hp: 172000, damage: 350, reach: 3.6, loot: 0, needs: ['oldhunger', 'matron'], shut: 'kpr_shut', gives: 'key:menagerie' },
];
const warnings = {
  mc_shut: "The Menagerie's door is locked. The Iron Marshal keeps its key, down in the Iron Barracks under the castle yard.",
  hun_open: "Old Hunger. The pit hounds are let in to him: whatever dies in his pit, he eats, and mends, and hits the harder. Stand on a carcass to kick it into the drain before he gets to it.",
  hun_maul: 'Old Hunger mauls! Out of the arc.',
  hun_pounce: 'He springs! Out of the line.',
  hun_roar: 'He roars! Jump the ring as it reaches you.',
  hun_rake: 'He rakes the floor! Out of the lines.',
  hun_bones: 'He throws what he has eaten! Out of the circles.',
  hun_hounds: 'The gates go up: pit hounds!',
  hun_carcass: 'A CARCASS IN THE PIT! Stand on it and kick it into the drain before he eats!',
  hun_denied: 'Into the drain with it. He goes hungry.',
  hun_fed: 'He eats! He is mended, and the stronger for it.',
  hun_turn: 'Old Hunger turns on you! Get behind the tank, or out of his reach, till he lets go.',
  hun_enrage: 'Old Hunger is enraged!',
  mat_open: 'The Matron of Wings. When she draws breath to shriek, get a dead tree between you and her: the shriek takes everything she can see.',
  mat_talons: 'The Matron strikes! Out of the arc.',
  mat_feathers: 'Feathers, flung all round! Stand between two.',
  mat_dive: 'She stoops! Out of the line.',
  mat_gust: 'She beats her wings! Through the gap.',
  mat_brood: 'Her brood comes down out of the cages!',
  mat_shriek: 'SHE DRAWS BREATH TO SHRIEK! Behind a tree, out of her sight!',
  mat_shrieked: 'The shriek breaks on the trees.',
  mat_turn: 'The Matron turns on you! Get behind the tank, or out of her reach, till she lets go.',
  mat_enrage: 'The Matron of Wings is enraged!',
  kpr_shut: "The Ring of Chains is shut. Its gate opens to the Keeper's two: Old Hunger and the Matron of Wings.",
  kpr_open: 'The Keeper of Chains. When his chain takes one of you, get a chain post between you and him: it snags, and he is pulled off his feet. Reeled in, you are his.',
  kpr_less_wolves: 'The Wolf Runs are empty: he has no wolves to loose.',
  kpr_less_spiders: 'The south Cage Rows are empty: he has no spiders to loose.',
  kpr_less_wyrms: 'The Wyrm Tank is empty: he has no wyrmlings to loose.',
  kpr_lash: 'The Keeper lashes! Out of the arc.',
  kpr_flail: 'He brings his flail down! Jump the ring as it reaches you.',
  kpr_cages: 'Cages off the roof! Out of the circles.',
  kpr_hooks: 'Hooks! Out of their way.',
  kpr_drive: 'He drives the beasts across the Ring! Out of their lines.',
  kpr_wolves: 'He looses the wolves!',
  kpr_spiders: 'He looses the spiders!',
  kpr_wyrms: 'He looses the wyrmlings!',
  kpr_chain: 'HIS CHAIN TAKES ONE OF YOU! Round behind a chain post!',
  kpr_snag: 'The chain snags on the post! He is pulled off his feet: hit him.',
  kpr_reeled: 'Reeled in!',
  kpr_turn: 'The Keeper of Chains turns on you! Get behind the tank, or out of his reach, till he lets go.',
  kpr_enrage: 'The Keeper of Chains is enraged!',
};

export const MENAGERIE = {
  key: 'menagerie', tag: 'mc', name: 'Castle Velscour: the Menagerie of Chains', short: 'the Menagerie', x: 14840, z: -5700, y: -60, level: 92, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { oldhunger: 'hun_turn', matron: 'mat_turn', keeper: 'kpr_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: -10, z: -186.4 },
  // On the Beast Court in the Middle Ward, before the Menagerie's hall, facing south across the court; locked till the
  // Marshal's Key is had.
  portal: { x: 11000, z: 172, yaw: PI, r: 2.2 },
  shutBy: 'key:barracks', shutWord: 'mc_shut',
  // The Menagerie's own door, back to the Conservatory in the Middle Ward.
  links: [{ x: 3.4, z: -12, yaw: -PI / 2, to: 'middleward', n: 3 }],
  chests: [
    { id: 'cache', room: 'mc_cache', x: -26, z: -103.2, yaw: PI, loot: 3 },
    { id: 'islet', room: 'mc_tank', x: 69, z: -95, yaw: -PI / 2, loot: 2, up: 0.5 },
    { id: 'lodge', room: 'mc_lodge', x: 56, z: -127, yaw: -PI / 2, loot: 2 },
  ],
  vistas: [{ id: 'great_cage', name: 'Under the Great Cage', room: 'mc_aviary', x: -58, z: -112, r: 6 }],
  auto: { way: ['mc_gate', 'mc_rows', 'mc_runs', 'mc_tank', 'mc_rows', 'mc_pit', 'mc_aviary', 'mc_rows', 'mc_larder', 'mc_cache', 'mc_larder', 'mc_lodge', 'mc_ring'] },
  shots: [
    ['mc_rows', 'mc_gate', [0, 2.4, -30], [2, 2, -84]],
    ['mc_pit', 'mc_rows', [-46, 2.6, -46], [-74, -2.5, -58]],
    ['mc_aviary', 'mc_larder', [-40, 3, -98], [-64, 12, -124]],
    ['mc_ring', 'mc_lodge', [20, 3, -152], [-6, 3, -182]],
  ],
  last: 'keeper', tough: { hp: 34, damage: 3.6 }, pay: { xp: 88000, gold: 11000 },
  names: { 'Goat Men': 'YARD RAM', 'Giant Spiders': 'CAGE SPIDER', Werewolf: 'PIT HOUND', Dragonlings: 'TANK WYRMLING', 'The Possessed': 'FLENSER', "Velscour's Knights": "KEEPER'S HAND", 'Plague Giants': 'THE FEEDER', Harpies: 'FLEDGLING' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_blood', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.42, 0.18], fire: [1, 0.46, 0.2], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Menagerie of Chains. Everything he has had caught is kept here, and fed.', clear: 'The Keeper of Chains is dead! The cages stand open.', wipe: 'You fall... and wake inside the Feeding Gate.' },
};
export const MENAGERIE_VARIANTS = {
  mc_hunger: { src: 'werewolf_brown', height: 4.4, name: 'OLD HUNGER' },
  mc_hound: { src: 'werewolf_brown', height: 1.7, name: 'PIT HOUND' },
  mc_matron: { src: 'harpy_queen', alt: 'harpy_warrior', height: 3.8, name: 'THE MATRON OF WINGS' },
  mc_keeper: { src: 'possessed_knight_2', alt: 'velscour_knight_2', height: 3.7, name: 'THE KEEPER OF CHAINS' },
  mc_wyrmling: { src: 'dragonling_black', alt: 'dragonling_undead', height: 1.8, name: 'TANK WYRMLING' },
};
