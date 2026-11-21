// The Menagerie of Chains: one of Castle Velscour's dungeons (docs/PHOBOS-CASTLE.md, set B), where what he's had caught is
// kept, baited and bred. Gone into by the Menagerie's door in the far wall of the Middle Ward's Conservatory, or by its own
// door on the Beast Court, both locked till the Marshal's Key is had (the Iron Barracks'). Forest green and his red.
//   The Feeding Gate, and the Cage Rows behind it: two rows of cages down a long hall, most of them full.
//   The Baiting Pit, west, sunk in the floor: Old Hunger (94) on his chain, and the pit hounds let in to him. What dies
//     inside his chain's reach he eats: the hounds are drawn out past it to be killed.
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

// (Each room its own section: a low gate, a long low hall of cages, a pit sunk in its floor under galleries, low runs, a
// drum as tall as the tower over it for what flies. And lit in pools, dark between.)
const rooms = [
  R('mc_gate', 'the Feeding Gate', 0, -15, 4.5, 23, 0, 5, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', banners: 0, fires: 0 }),
  R('mc_rows', 'the Cage Rows', 0, -58, 13, 26, 0, 8, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_ward_paving', banners: 18, cloth: 'forest:cloth_red', fires: 0 }),
  R('mc_pit', 'the Baiting Pit', -60, -50, 17, 17, -3, 12, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_ash_clay_ground', banners: 0, fires: 0 }),
  R('mc_runs', 'the Wolf Runs', 52, -44, 15, 9, 0, 6, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_straw_ground', banners: 0, fires: 0 }),
  R('mc_tank', 'the Wyrm Tank', 56, -88, 14, 13, -2, 9, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'slate:flags', banners: 0, hang: 0, fires: 0 }),
  R('mc_aviary', 'the Aviary', -52, -112, 17, 17, 0, 34, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ash_clay_ground', banners: 16, cloth: 'forest:cloth_red', hang: 0, fires: 0 }),
  R('mc_larder', 'the Larder', 4, -106, 9, 10, 0, 5, { rock: 'p2_sooty_plaster', foot: 'soot:block', ground: 'flags', banners: 0, fires: 0 }),
  R('mc_cache', "the Keeper's Cache", -22, -102, 4.5, 4.5, 0, 4.5, { rock: 'course', foot: 'block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('mc_lodge', "the Keeper's Lodge", 40, -130, 10, 9, 0, 6, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('mc_ring', 'the Ring of Chains', 0, -162, 18, 16, 0, 14, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', banners: 16, cloth: 'p2_banner_blood', fires: 0 }),
];

const tunnels = [
  { pts: [[-11, -46], [-45, -46]], w: 3, h: 4.5 },                      // the Cage Rows down to the Baiting Pit
  { pts: [[11, -38], [25, -38], [39, -48]], w: 2.6, h: 4.2 },           // the Cage Rows to the Wolf Runs
  { pts: [[60, -51], [60, -77]], w: 2.6, h: 4.2 },                      // the Wolf Runs to the Wyrm Tank
  { pts: [[11, -68], [44, -84]], w: 2.6, h: 4.2 },                      // the Cage Rows to the Wyrm Tank
  { pts: [[-11, -80], [-37, -98]], w: 3, h: 4.5 },                      // the Cage Rows to the Aviary
  { pts: [[-66, -65], [-66, -97]], w: 2.6, h: 4.2 },                    // the Baiting Pit up to the Aviary
  { pts: [[8, -82], [8, -98]], w: 2.6, h: 4 },                          // the Cage Rows to the Larder
  { pts: [[11, -112], [32, -126]], w: 2.6, h: 4 },                      // the Larder to the Keeper's Lodge
  { pts: [[50, -99], [46, -123]], w: 2.6, h: 4.2 },                     // the Wyrm Tank to the Keeper's Lodge
  { pts: [[32, -137], [16, -150]], w: 3.5, h: 5 },                      // the Lodge to the Ring of Chains
  { pts: [[-48, -127], [-48, -152], [-16, -158]], w: 2.4, h: 4.2 },     // the Keeper's Walk, from the Aviary round to the Ring
  // The Keeper's Cache: behind the furthest carcasses in the Larder's west wall. On no map.
  { pts: [[-3, -102], [-19, -102]], w: 1.3, h: 3, dark: true },
  // The gates the pit hounds are let in by, and the Ring's.
  { pts: [[-75, -40], [-82, -40]], w: 2, h: 4, dead: true, door: 'mc_pit' },
  { pts: [[-75, -60], [-82, -60]], w: 2, h: 4, dead: true, door: 'mc_pit' },
  { pts: [[-54, -35], [-54, -28]], w: 2, h: 4, dead: true, door: 'mc_pit' },
  { pts: [[-16, -172], [-23, -172]], w: 2, h: 4, dead: true, door: 'mc_ring' },
  { pts: [[16, -168], [23, -168]], w: 2, h: 4, dead: true, door: 'mc_ring' },
  { pts: [[4, -176], [4, -183]], w: 2, h: 4, dead: true, door: 'mc_ring' },
];

// Old Hunger's stake, in the middle of the Baiting Pit, and how far his chain lets him from it (src/sim/castle-fights-b.js
// oldhunger): what dies inside its reach, he eats.
export const PIT_STAKE = [-60, -50];
export const PIT_CHAIN = 10.5;
// The great cage hung in the Aviary: where it hangs, and how far round its floor is. Under it is out of her shriek.
export const GREAT_CAGE = [-52, -112, 4];
// The Aviary's dead trees: what the Matron's shriek doesn't reach behind. [x, z, how far round]
export const AVIARY_TREES = [[-64, -102, 1.8], [-41, -104, 1.8], [-61, -123, 1.8], [-43, -121, 1.8], [-52, -98.4, 1.6]];
// The chain posts of the Ring of Chains: what the Keeper's chain snags on. [x, z, how far round]
export const CHAIN_POSTS = [[-10, -154, 0.9], [9, -152.6, 0.9], [-11, -170, 0.9], [11, -171, 0.9], [-3, -174.6, 0.9]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Feeding Gate: low. The feed barrow and barrels, joints on hooks, the Menagerie's own door (back to the
  // Conservatory) in the east wall. A fire at the way in, one where it opens into the rows.
  add('lintel', 0, -2, { hx: 4.5, stone: 'dark:ashlar' });
  add('hooks', -3.6, -16, { n: 4, alongZ: true, up: 1.9 }); add('barrels', -3.2, 3); add('cart', -2.6, -27, { yaw: 0.2 }); add('barrels', 3.2, -30);
  add('brazier', 3.9, -5); add('brazier', -3.2, -34);
  add('mark', 4.25, -12, { up: 3.2, r: 0.5, yaw: -PI / 2, back: -1 });
  add('decal', -2, -8, { layer: 'p2_blood_splashes', w: 1.8, flat: true });
  // ---- the Cage Rows: a long low hall, cages down both walls with a way between, some standing open; cages hung over the
  // way; what's been thrown out of them. Its light is hung down its middle.
  // (turn: a cage's own length lies along z; hx and hz are what it takes up of the floor. None before a doorway.)
  // (Out in the room, a way behind them along each wall: something lying in three, bones in the rest, one forced open.)
  [-39, -56, -65, -74].forEach((z, i) => add('beastcage', -6.4, z, { hx: 2.6, hz: 3.4, h: 3.4, gap: 0.3, yaw: PI / 2, turn: true, solid: true, open: i === 1, bones: i % 2 === 0, beast: i === 0 || i === 3, bent: i === 2 }));
  [-48, -57, -76].forEach((z, i) => add('beastcage', 6.4, z, { hx: 2.6, hz: 3.4, h: 3.4, gap: 0.3, yaw: -PI / 2, turn: true, solid: true, open: i === 1, bones: i !== 1, beast: i === 2 }));
  for (const [x, z, up] of [[-2.4, -44, 3.4], [2, -52, 4.2], [-1, -66, 3], [2.6, -78, 3.8], [-2, -57, 4.4], [1.6, -71, 3.2], [-10.6, -50, 2.6], [10.8, -70, 3]]) add('hungchain', x, z, { up });
  // (Its fire over the cages with something in them, so what lies there is seen from the way between.)
  add('basket', -5, -41, { up: 5.4 }); add('basket', 5, -59, { up: 5.4 }); add('basket', -5, -72, { up: 5.4 }); add('basket', 5, -76, { up: 5.4 });
  add('cage', -2, -62, { up: 4.6 }); add('cage', 3, -40, { up: 5 }); add('chain', 4, -70, { up: 4 });
  add('bones', 1, -50, { r: 1.2 }); add('heap', -3, -71, { r: 1.2, layer: 'p2_straw_ground' }); add('barrels', 10.4, -75); add('crates', 10.6, -65);
  add('decal', 2, -60, { layer: 'p2_blood_splashes', w: 2.4, flat: true, yaw: 0.8 }); add('decal', -12.95, -62, { layer: 'p2_gouges', w: 2.6, up: 0.8, yaw: PI / 2 });
  add('brazier', -4, -35.4); add('brazier', 4, -35.4);
  // ---- the Baiting Pit: sunk in its floor. His stake in the middle and the chain off it, the bait's cage hung over it,
  // the watchers' walk round two walls over the pit, the drain, old kills. Fire at the way down, fire on the walk.
  add('chainpost', PIT_STAKE[0], PIT_STAKE[1], { r: 1.3, h: 3.6, run: [PIT_CHAIN - 1, 3.4, 0.36] });
  add('rings', PIT_STAKE[0], PIT_STAKE[1], { r: 2.6, n: 1 });
  add('basket', PIT_STAKE[0] + 3, PIT_STAKE[1] + 2.4, { up: 6 }); add('basket', PIT_STAKE[0] - 3, PIT_STAKE[1] - 2.4, { up: 6 }); add('daylight', PIT_STAKE[0] + 2, PIT_STAKE[1] + 0.6, { r: 1.6, pool: false, shaft: false });
  add('cage', PIT_STAKE[0] - 2, PIT_STAKE[1] - 1, { up: 5.4 });
  add('walk', -60, -34.25, { hx: 16, hz: 1.25, up: 6.5, side: -1 }); add('walk', -75.75, -50, { hx: 1.25, hz: 16, up: 6.5, side: 1 });
  add('pool', -70, -42, { r: 2, up: 0.03, layer: 'mire:water' }); add('bones', -50, -60, { r: 1.5 }); add('bones', -70, -62, { r: 1.2 }); add('bones', -58, -38, { r: 1 });
  add('decal', -62, -54, { layer: 'p2_blood_splashes', w: 3, flat: true }); add('decal', -56, -46, { layer: 'p2_blood_splashes', w: 2.2, flat: true, yaw: 2 });
  for (const x of [-72, -60, -48]) add('basket', x, -35.2, { up: 7.5 });
  add('mark', -76.6, -50, { up: 8.4, r: 1.3, yaw: PI / 2, back: 1 });
  add('brazier', -45, -41.4); add('brazier', -45, -50.6);
  // ---- the Wolf Runs: low. Three long pens against the north wall, straw, the trough. One fire.
  for (const x of [43, 52.5, 61.5]) add('beastcage', x, -39.2, { hx: 4, hz: 2.2, h: 2.4, yaw: PI, solid: true, open: x === 52.5 });
  add('heap', 41, -50.6, { r: 1.4, layer: 'p2_straw_ground' }); add('heap', 65, -50.4, { r: 1.2, layer: 'p2_straw_ground' });
  add('pool', 50, -51.4, { r: 1, up: 0.3, layer: 'mire:water' }); add('bones', 46, -47, { r: 1 }); add('rack', 66.4, -46.6, { yaw: -PI / 2, h: 2.2, n: 5 });
  add('brazier', 54.4, -50.4);
  // ---- the Wyrm Tank: the pool, most of the room; an islet in it, the sluice, the feeding table. Fire at each way in.
  add('pool', 60, -90, { r: 8, up: 0.25, layer: 'mire:water' }); add('sluicegate', 69.4, -90, { yaw: PI / 2, w: 2.2 });
  add('heap', 61, -92, { r: 2.4, layer: 'dark:rubble' }); add('bones', 61, -91, { r: 1.2 }); add('eggs', 62.6, -93.6, { s: 0.8 });
  add('table', 45, -80, { hx: 0.7, hz: 2 }); add('barrels', 44, -99); add('chain', 55, -80, { up: 4 });
  add('brazier', 45, -92.6); add('brazier', 54, -77.2);
  add('decal', 69.95, -97, { layer: 'p2_damp_rise', w: 4, h: 3, up: 0.2, yaw: -PI / 2 });
  // ---- the Aviary: a drum as tall as the tower over it, open to the sky far up. The great cage hung in the middle of it;
  // dead trees (they stop a body, and a shriek); lesser cages; nests. Fire round the walls, so she's seen against it.
  add('greatcage', GREAT_CAGE[0], GREAT_CAGE[1], { r: GREAT_CAGE[2], h: 7, up: 7.5 }); add('rings', GREAT_CAGE[0], GREAT_CAGE[1], { r: GREAT_CAGE[2], n: 1 }); add('daylight', -52, -112, { r: 5, shaft: false });
  for (const [x, z, r] of AVIARY_TREES) add('deadtree', x, z, { h: r > 1.7 ? 14 : 11, r, solid: true });
  for (const [x, z, up] of [[-60, -108, 7], [-45, -116, 13], [-58, -126, 9]]) add('cage', x, z, { up });
  add('nest', -66, -126, { r: 1.4 }); add('nest', -38, -126, { r: 1.2 }); add('eggs', -66, -125, { s: 0.7 }); add('bones', -54, -118, { r: 1.4 });
  add('roots', -67.4, -112, { r: 2 }); add('roots', -37, -110, { r: 1.6 });
  for (const [x, z] of [[-58, -97.2], [-45, -97.2], [-67, -106], [-67, -119], [-37, -116], [-55, -127], [-41, -127]]) add('brazier', x, z);
  // ---- the Larder: low. Rows of joints on hooks, the block, the brine; behind the west wall's row, a way. One fire.
  for (const z of [-101, -107, -113]) add('hooks', 3, z, { n: 5, up: 1.9 });
  add('hooks', -4.4, -102, { n: 3, alongZ: true, up: 1.8 });
  add('table', 10.8, -106, { hx: 0.8, hz: 2, solid: true }); add('vat', -2, -113.4, { r: 0.9 }); add('barrels', -3.4, -98);
  add('decal', 2, -104, { layer: 'p2_blood_splashes', w: 2.6, flat: true }); add('decal', 5, -110, { layer: 'p2_blood_splashes', w: 1.8, flat: true, yaw: 1.4 });
  add('brazier', -3, -108);
  // ---- the Keeper's Cache.
  add('crates', -24.6, -104.6); add('barrels', -24.8, -99.4); add('candles', -20, -105, { up: 0.1 });
  // ---- the Keeper's Lodge: low. His fire, his bed, his table, the goads on the wall, his strongbox. The hearth is its light.
  add('hearth', 49.4, -131, { yaw: -PI / 2 }); add('bunk', 45, -137.4, { hx: 1.2, hz: 0.6, cloth: 'cloth_red' });
  add('table', 40, -129, { hx: 2, hz: 0.8 }); add('candles', 39, -129, { up: 0.85 }); add('seat', 40, -126.6, { hx: 0.5, hz: 0.5, stone: 'dark:wood', flip: true });
  add('rack', 38, -121.6, { yaw: 0, h: 2.2, n: 6, board: true }); add('shields', 30.6, -131, { yaw: PI / 2 });
  add('carpet', 40, -132, { hx: 4, hz: 2.4, layer: 'forest:cloth_red' });
  // ---- the Ring of Chains: the chain posts, cages hung over it, his mark on the far wall. Fire under his mark, fire at
  // the two ways in; the hung fires over the middle.
  CHAIN_POSTS.forEach(([x, z, r], i) => add('chainpost', x, z, { r, h: 3.4, solid: true, run: [(i % 2 ? -1 : 1) * 3.4, 2.6 - i, 0.22] }));
  add('basket', -6, -160, { up: 7.5 }); add('basket', 6, -164, { up: 7.5 }); add('basket', 0, -171, { up: 7.5 }); add('daylight', 0, -163, { r: 1.8, pool: false, shaft: false });
  for (const [x, z, up] of [[-14, -164, 7], [14, -160, 9], [7, -172, 10]]) add('cage', x, z, { up });
  add('mark', 0, -177.6, { up: 8, r: 2, back: 1 });
  for (const [x, z] of [[-6, -176], [10, -176], [15.4, -153], [-15.4, -152]]) add('brazier', x, z);
  add('decal', -4, -164, { layer: 'p2_blood_splashes', w: 3, flat: true, yaw: 0.5 });
}
const daises = [{ x: 61, z: -92, r: 2.6, dy: 0.5 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const SPIDERS = ['spider_black', 'spider_red'];
const HANDS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
// (None in the Feeding Gate: it's where you wake if you fall.)
const packs = [
  { key: 'mc_rows_n', room: 'mc_rows', pick: ['goatman_black', 'goatman_bw'], n: 4, pal: ['Forest'], at: [-1, 12], r: 3 },
  { key: 'mc_rows_s', room: 'mc_rows', pick: SPIDERS, n: 6, elite: ['flesh_spider_demon'], pal: ['Forest', 'Bloodred'], tough: { hp: 1.2, damage: 1.2 }, at: [1, -16], r: 3 },
  { key: 'mc_runs', room: 'mc_runs', pick: ['mc_hound'], n: 6, pal: ['Forest', 'Rust'], at: [0, -3], r: 3 },
  { key: 'mc_tank', room: 'mc_tank', pick: ['mc_wyrmling'], n: 5, pal: ['Forest'], tough: { hp: 1.3, damage: 1.3 }, at: [-7, 2], r: 3 },
  { key: 'mc_larder', room: 'mc_larder', pick: HANDS, n: 5, pal: ['Bloodred'], at: [0, -2], r: 3 },
  { key: 'mc_lodge', room: 'mc_lodge', pick: KNIGHTS, n: 4, elite: ['plague_giant_armored'], pal: ['Bloodred'], tough: { hp: 1.3, damage: 1.2 }, at: [-2, -3], r: 3 },
];
const bosses = [
  { key: 'oldhunger', room: 'mc_pit', name: 'Old Hunger', models: ['mc_hunger'], pal: ['Rust'], hp: 116000, damage: 335, reach: 3.8, loot: 8, at: [4, 0] },
  { key: 'matron', room: 'mc_aviary', name: 'The Matron of Wings', models: ['mc_matron'], pal: ['Forest'], hp: 104000, damage: 335, reach: 3.2, loot: 8, at: [0, 2] },
  { key: 'keeper', room: 'mc_ring', name: 'The Keeper of Chains', models: ['mc_keeper'], pal: ['Bloodred'], hp: 172000, damage: 350, reach: 3.6, loot: 0, needs: ['oldhunger', 'matron'], shut: 'kpr_shut', gives: 'key:menagerie' },
];
const warnings = {
  mc_shut: "The Menagerie's door is locked. The Iron Marshal keeps its key, down in the Iron Barracks under the castle yard.",
  hun_open: "Old Hunger. He is on a chain: the ring on the floor is as far as it lets him. The pit hounds are let in to him, and whatever dies inside his chain's reach, he eats, and mends, and hits the harder. Draw the hounds out past the ring before you kill them.",
  hun_maul: 'Old Hunger mauls! Out of the arc.',
  hun_pounce: 'He springs! Out of the line.',
  hun_roar: 'He roars! Jump the ring as it reaches you.',
  hun_rake: 'He rakes the floor! Out of the lines.',
  hun_bones: 'He throws what he has eaten! Out of the circles.',
  hun_hounds: 'The gates go up: pit hounds!',
  hun_denied: 'A hound dead out of his reach. He goes hungry.',
  hun_fed: 'A HOUND DEAD INSIDE HIS CHAIN: he eats! He is mended, and the stronger for it. Kill them out past the ring!',
  hun_turn: 'Old Hunger turns on you! Get behind the tank, or out of his reach, till he lets go.',
  hun_enrage: 'Old Hunger is enraged!',
  mat_open: 'The Matron of Wings. When she draws breath to shriek, get UNDER THE GREAT CAGE, inside the ring on the floor: its iron takes the shriek. The trees are no help: she is above them.',
  mat_talons: 'The Matron strikes! Out of the arc.',
  mat_feathers: 'Feathers, flung all round! Stand between two.',
  mat_dive: 'She stoops! Out of the line.',
  mat_gust: 'She beats her wings! Through the gap.',
  mat_brood: 'Her brood comes down out of the cages!',
  mat_shriek: 'SHE DRAWS BREATH TO SHRIEK! Under the great cage, inside its ring!',
  mat_shrieked: 'The shriek breaks on the iron of the cage.',
  mat_turn: 'The Matron turns on you! Get behind the tank, or out of her reach, till she lets go.',
  mat_enrage: 'The Matron of Wings is enraged!',
  kpr_shut: "The Ring of Chains is shut. Its gate opens to the Keeper's two: Old Hunger and the Matron of Wings.",
  kpr_open: 'The Keeper of Chains. When his chain takes one of you, everyone on him: hit him hard enough as he hauls and he lets it go. (Or get a chain post between you and him: it snags.) Reeled in, you are his. And he looses the beasts of every wing you left full: the Wolf Runs, the south Cage Rows, the Wyrm Tank.',
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
  kpr_chain: 'HIS CHAIN TAKES ONE OF YOU! Everyone on him, make him drop it! (Or round behind a chain post.)',
  kpr_snag: 'The chain snags on the post! He is pulled off his feet: hit him.',
  kpr_dropped: 'He lets the chain go! He staggers: hit him.',
  kpr_reeled: 'Reeled in!',
  kpr_turn: 'The Keeper of Chains turns on you! Get behind the tank, or out of his reach, till he lets go.',
  kpr_enrage: 'The Keeper of Chains is enraged!',
};

export const MENAGERIE = {
  key: 'menagerie', tag: 'mc', name: 'Castle Velscour: the Menagerie of Chains', short: 'the Menagerie', x: 14840, z: -5700, y: -60, level: 92, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { oldhunger: 'hun_turn', matron: 'mat_turn', keeper: 'kpr_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: -8, z: -175.4 },
  // On the Beast Court in the Middle Ward, before the Menagerie's hall, facing south across the court; locked till the
  // Marshal's Key is had.
  portal: { x: 11000, z: 172, yaw: PI, r: 2.2 },
  shutBy: 'key:barracks', shutWord: 'mc_shut',
  // The Menagerie's own door, back to the Conservatory in the Middle Ward.
  links: [{ x: 3, z: -12, yaw: -PI / 2, to: 'middleward', n: 3 }],
  chests: [
    { id: 'cache', room: 'mc_cache', x: -21.4, z: -99.2, yaw: PI, loot: 3 },
    { id: 'islet', room: 'mc_tank', x: 62, z: -91, yaw: -PI / 2, loot: 2, up: 0.5 },
    { id: 'lodge', room: 'mc_lodge', x: 48.4, z: -123.2, yaw: PI, loot: 2 },
  ],
  vistas: [{ id: 'great_cage', name: 'Under the Great Cage', room: 'mc_aviary', x: -52, z: -113, r: 5 }],
  auto: { way: ['mc_gate', 'mc_rows', 'mc_runs', 'mc_tank', 'mc_rows', 'mc_pit', 'mc_aviary', 'mc_rows', 'mc_larder', 'mc_cache', 'mc_larder', 'mc_lodge', 'mc_ring'] },
  shots: [
    ['mc_rows', 'mc_rows', [0, 2.2, -33], [1, 2, -84]],
    ['mc_pit', 'mc_rows', [-41, -0.4, -46], [-66, -2.4, -52]],
    ['mc_aviary', 'mc_aviary', [-46.5, 2.2, -99.5], [-54, 12, -118]],
    ['mc_ring', 'mc_lodge', [16, 2.6, -149.6], [-6, 3, -172]],
  ],
  last: 'keeper', tough: { hp: 34, damage: 3.6 }, pay: { xp: 88000, gold: 11000 },
  names: { 'Goat Men': 'YARD RAM', 'Giant Spiders': 'CAGE SPIDER', Werewolf: 'PIT HOUND', Dragonlings: 'TANK WYRMLING', 'The Possessed': 'FLENSER', "Velscour's Knights": "KEEPER'S HAND", 'Plague Giants': 'THE FEEDER', Harpies: 'FLEDGLING' },
  look: { fill: [0.17, 0.125, 0.095], wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_blood', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.42, 0.18], fire: [1, 0.46, 0.2], every: 15, high: 3, glow: 3.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Menagerie of Chains. Everything he has had caught is kept here, and fed.', clear: 'The Keeper of Chains is dead! The cages stand open.', wipe: 'You fall... and wake inside the Feeding Gate.' },
};
export const MENAGERIE_VARIANTS = {
  mc_hunger: { src: 'werewolf_brown', height: 4.4, name: 'OLD HUNGER' },
  mc_hound: { src: 'werewolf_brown', height: 1.7, name: 'PIT HOUND' },
  mc_matron: { src: 'harpy_queen', alt: 'harpy_warrior', height: 4.4, name: 'THE MATRON OF WINGS' },
  mc_keeper: { src: 'possessed_knight_2', alt: 'velscour_knight_2', height: 4.2, name: 'THE KEEPER OF CHAINS' },
  mc_wyrmling: { src: 'dragonling_black', alt: 'dragonling_undead', height: 1.8, name: 'TANK WYRMLING' },
};
