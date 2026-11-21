// The Redoubt under the Sill: the first dungeon you go down in City State Phobos's country, on your first visit there, at
// about level five (docs/FIRST-VISIT.md). Lisandra's door sets you down on the Sill; Wenna Coyle, who keeps its lamps, sends
// you down its north cliff to the gate Velscour's knights cut into the rock, where they keep the only way down to his city
// and take its toll. His knights in their blood red, all through it, and the first look at what's behind his wall:
//   The Cliff Gate, its teeth raised, his mark over the inner arch.
//   The Toll Hall: where whoever comes down off the Sill is weighed and what they carry counted, the toll-bar across it,
//     the clerks' counter, his coin in heaps. Off it:
//   the Debtors' Pens, west: those who couldn't pay, in cages, and the Pen-Warden (5) who keeps them;
//   the Hall of Harness, east: the harness of every lord of the Marches who knelt to him, stood up in rows, and Sir Oswin
//     Carrow (5), Master of Harness, who can make it stand up and fight;
//   the Cut Court, south: a yard cut down into the cliff, open to the sky, the light coming down its shafts; the lancers'
//     posts in it. Off it the Red Forge (west), molten iron run in its pit, and the Red Chapel (east), his altar and his
//     priests; and down its south side the Watch Stair, up to
//   the Commander's Hall: his war table with the castle carved on it, his seat, his banners, the cliff cut through for a
//     window on the light; and Knight-Commander Rothgar, the Red Hand (6), who holds the Redoubt. Its doors open only to the
//     other two's deaths.
//
// Where it really is: past the world's north edge, in the delves' row between the Warrens and the sewers, everything here
// local to it, x east, z south of the way in. Its arch out on the land: at the foot of the Sill's north cliff, its back to
// the rock, facing east across the plain to the city's wall.
//
// His, so nothing of Tessariel's in it (README "The two sides"): no bells, no seals of hers, no crosses, no letters. No two
// ways out of a room straight across from each other: the corner map draws no cross of his rooms.
import { R } from './delve-lay.js';

const PI = Math.PI;

const rooms = [
  R('rd_gate', 'the Cliff Gate', 0, -10, 5, 18, 0, 9, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 9 }),
  R('rd_toll', 'the Toll Hall', 0, -52, 20, 20, 0, 13, { rock: 'p2_curtain_granite', foot: 'dark:course', ground: 'p2_ward_paving', banners: 14, cloth: 'p2_banner_skull', fires: 12 }),
  R('rd_pens', "the Debtors' Pens", -52, -46, 16, 14, 0, 12, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 11 }),
  R('rd_harness', 'the Hall of Harness', 54, -60, 16, 16, 0, 12, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving', banners: 12, cloth: 'p2_banner_skull', fires: 12 }),
  R('rd_court', 'the Cut Court', 0, -110, 22, 20, 0, 34, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_ward_paving', banners: 0, fires: 16 }),
  R('rd_forge', 'the Red Forge', -54, -104, 14, 14, 0, 11, { rock: 'p2_fireback', foot: 'soot:block', ground: 'p2_ash_street', banners: 0, fires: 14 }),
  R('rd_chapel', 'the Red Chapel', 54, -116, 12, 16, 0, 14, { rock: 'p2_keep_basalt', foot: 'dark:course', ground: 'p2_bone_joint_flags', banners: 10, cloth: 'p2_banner_skull', fires: 10 }),
  // (Up the cliff inside: its floor 0 at the court's end, 6 at the hall's.)
  R('rd_stair', 'the Watch Stair', -6, -150, 4, 14, 3, 9, { tz: -6 / 28, fires: 9, rock: 'p2_curtain_granite', foot: 'dark:block' }),
  R('rd_hall', "the Commander's Hall", 0, -196, 22, 18, 6, 16, { rock: 'p2_keep_basalt', foot: 'dark:course', ground: 'p2_bone_joint_flags', banners: 18, cloth: 'p2_banner_skull', fires: 13 }),
];

// The ways between them, wide enough for his men in pairs. (The Toll Hall's west way north of its middle, its east way south
// of it, its south way east of its middle: none across from another, nor from the way in. The court's the same.)
const tunnels = [
  { pts: [[0, -25], [0, -35]], w: 4.4, h: 5 },
  { pts: [[-17.5, -44], [-38.5, -44]], w: 5, h: 5 },
  { pts: [[17.5, -62], [40.5, -62]], w: 5, h: 5 },
  { pts: [[8, -69.5], [8, -92.5]], w: 5, h: 5.5 },
  { pts: [[-19.5, -102], [-42.5, -102]], w: 4.4, h: 5 },
  { pts: [[19.5, -118], [44.5, -118]], w: 4.4, h: 5 },
  { pts: [[-6, -127.5], [-6, -138.5]], w: 4.2, h: 5 },
  { pts: [[-6, -161.5], [-6, -180.5]], w: 4.4, h: 5.5 },
];

// Where the Pen-Warden's debtors are let out from (src/sim/redoubt-fights.js): the doors of the cells down the pens' north wall.
export const PEN_CELLS = [-62, -52, -42];
export const PEN_DOORS = PEN_CELLS.map((x) => [x, -36.4]);
// The harness stood up in the Hall of Harness, two rows down its length: what Sir Oswin wakes.
export const HARNESS_ROWS = [[44, -50], [44, -60], [44, -70], [64, -50], [64, -60], [64, -70]];
// The Commander's banner, set in its socket before his seat (redoubt-fights.js rothgar).
export const BANNER_AT = [0, -206];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Cliff Gate: the teeth up in their slot at the way in, his plate on stands each side, his mark over the inner arch.
  add('portcullis', 0, 1.0, { w: 4.6, h: 6, raised: true });
  for (const z of [-8, -18]) { add('stand', -3.4, z, { yaw: PI / 2 }); add('stand', 3.4, z - 4, { yaw: -PI / 2 }); }
  add('skullmark', 0, -27.6, { up: 5.4, r: 1.2, back: -1 });
  add('brazier', -3, -24); add('brazier', 3, -24);
  // ---- the Toll Hall: the bar across it, the clerks' counter behind, his coin in heaps on the tables, the ledgers on their
  // shelves, columns down both sides; the weighing-place in the middle, a ring in the floor.
  add('tollbar', 0, -38, { w: 14, yaw: 0 });
  add('counter', 0, -46, { hx: 7, hz: 0.6 });
  for (const x of [-5, 0, 5]) add('candles', x, -46, { up: 1.05 });
  for (const [x, z] of [[-12, -62], [12, -62]]) { add('table', x, z, { hx: 2.4, hz: 1.2, solid: true }); add('gold', x, z, { r: 0.9 }); add('candles', x + 1.6, z, { up: 0.85 }); }
  for (const z of [-40, -64]) { add('bookcase', -19.4, z, { hx: 0.4, hz: 3, h: 3.6, one: 1 }); add('bookcase', 19.4, z + 4, { hx: 0.4, hz: 3, h: 3.6, one: -1 }); }
  for (const [x, z] of [[-13, -48], [13, -48], [-13, -60], [13, -60]]) add('column', x, z, { r: 1.2, solid: true });
  add('circle', 0, -55, { r: 2.6 });
  add('skullmark', 0, -71.6, { up: 7, r: 1.6, back: -1 });
  add('decal', -6, -52, { layer: 'p2_cracks', w: 3, flat: true });
  // ---- the Debtors' Pens: cells of iron down both long walls, as tall as a man and more, their doors open; in some of them
  // whoever couldn't pay, sat down against the bars and not got up. Chains from the roof, a pit of black water, bones, straw.
  PEN_CELLS.forEach((x, k) => { add('cell', x, -34, { yaw: PI, held: k === 1 ? 0 : k + 1 }); add('cell', x, -58, { yaw: 0, held: k + 4 }); add('chain', x, -46, { up: 7 }); });
  add('pit', -60, -46, { r: 1.6 });
  add('bones', -46, -50, { r: 1.2 }); add('bones', -56, -40, { r: 0.9 }); add('heap', -64, -52, { r: 1.1, layer: 'p2_straw_ground' });
  add('decal', -50, -46, { layer: 'p2_blood_splashes', w: 2.4, flat: true });
  add('decal', -67.95, -46, { layer: 'p2_gouges', w: 2.6, up: 0.5, yaw: PI / 2 });
  // ---- the Hall of Harness: the knelt lords' harness on its stands, two rows; a carpet of his red up the middle to the
  // Master's seat; racks of their swords and shields along the walls.
  for (const [x, z] of HARNESS_ROWS) add('stand', x, z, { yaw: x < 54 ? PI / 2 : -PI / 2 });
  add('carpet', 54, -60, { hx: 2.2, hz: 13, layer: 'cloth_red' });
  add('seat', 54, -74.4, { hx: 1.1, hz: 0.8, stone: 'dark:ashlar', cloth: 'cloth_red' });
  for (const z of [-50, -66]) { add('rack', 39.4, z, { yaw: PI / 2, h: 2.4, n: 6 }); add('rack', 68.6, z + 4, { yaw: -PI / 2, h: 2.4, n: 6 }); }
  add('shields', 48, -75.4, { yaw: PI }); add('shields', 60, -75.4, { yaw: PI });
  add('skullmark', 54, -75.6, { up: 6, r: 1.3, back: -1 });
  // ---- the Cut Court: open to the sky through its shafts, the light down on the flags; a dead tree in the middle, the lancers'
  // posts in two lines, sand round them; his banner hung on the cliff.
  for (const [x, z, r] of [[-11, -102, 4.5], [11, -118, 4.5], [0, -110, 3.4], [-12, -122, 3]]) add('daylight', x, z, { r, shaft: true });
  // (A wall-walk round its two long sides, high up, fire baskets along it; racks of the lancers' arms at its feet, their
  // barrels and crates by the ways in.)
  add('walk', -21, -110, { hx: 1, hz: 17, up: 9, side: 1 }); add('walk', 21, -110, { hx: 1, hz: 17, up: 9, side: -1 });
  for (const z of [-96, -110, -124]) { add('basket', -21.3, z, { up: 9 }); add('basket', 21.3, z, { up: 9 }); }
  add('rack', -21.2, -116, { yaw: PI / 2, h: 2.4, n: 6 }); add('rack', 21.2, -100, { yaw: -PI / 2, h: 2.4, n: 6 });
  add('barrels', 15, -94); add('crates', -15, -127); add('barrels', 17, -127);
  add('deadtree', 0, -110, { h: 7, r: 1.8 });
  for (const z of [-98, -122]) for (const x of [-15, 15]) add('stand', x, z);
  add('pool', -12, -110, { r: 4.5, layer: 'rubble', up: 0.02 }); add('pool', 12, -110, { r: 4.5, layer: 'rubble', up: 0.02 });
  add('skullmark', 0, -129.6, { up: 10, r: 2, back: -1 });
  add('decal', 6, -96, { layer: 'p2_cracks', w: 3.4, flat: true });
  // ---- the Red Forge: the casting pit, molten; anvils, tools, quenching barrels, crates of his blanks.
  add('castpit', -54, -106, { r: 2.4 });
  add('anvil', -46, -98); add('anvil', -62, -98);
  add('tools', -67.4, -104, { yaw: PI / 2 });
  for (const [x, z] of [[-44, -114], [-48, -116]]) add('barrels', x, z);
  for (const [x, z] of [[-64, -114], [-60, -116]]) add('crates', x, z);
  add('decal', -54, -96, { layer: 'p2_scorch_mark', w: 3, flat: true });
  // (The quench, and his plate hung up half made along the north wall, not yet blacked.)
  add('trough', -54, -97, { hx: 1.8, hz: 0.5 });
  add('platerack', -50, -91, { yaw: PI, n: 4 }); add('platerack', -61, -91, { yaw: PI, n: 3 });
  // ---- the Red Chapel: his altar at the far end under his great mark, pews either side of a red carpet, candles, a ring of
  // his priests' drawn in the floor before the altar.
  add('altar', 54, -128.6, { hx: 2.2, hz: 0.9 });
  add('candles', 52.4, -128.6, { up: 1.1 }); add('candles', 55.6, -128.6, { up: 1.1 });
  add('skullmark', 54, -131.6, { up: 4.4, r: 1.8, back: -1 });
  add('carpet', 54, -116, { hx: 1.6, hz: 11, layer: 'cloth_red' });
  for (const z of [-106, -111, -116]) { add('pew', 48, z, { hx: 3.2, hz: 0.5 }); add('pew', 60, z, { hx: 3.2, hz: 0.5 }); }
  add('circle', 54, -123, { r: 2 });
  add('chandelier', 54, -114, { up: 9 });
  // ---- the Watch Stair: braziers at the foot and the head.
  add('brazier', -9, -138); add('brazier', -3, -162);
  // ---- the Commander's Hall: his war table with Castle Velscour carved on it, his seat on its dais, his banners on the
  // columns, the cliff cut through high in the south wall (the light down from it), chandeliers.
  add('maptable', -11, -191, { hx: 4.2, hz: 2.2 });
  add('stonethrone', 0, -211, { yaw: 0, cloth: 'cloth_red' });
  for (const z of [-184, -198]) { add('column', -14, z, { r: 1.4, solid: true }); add('column', 14, z, { r: 1.4, solid: true }); }
  add('daylight', 0, -203, { r: 3.2, shaft: true });
  add('chandelier', -8, -192, { up: 11 }); add('chandelier', 8, -192, { up: 11 });
  add('skullmark', 0, -213.6, { up: 8, r: 2.4, back: -1 });
  add('shields', -21.4, -196, { yaw: PI / 2 }); add('shields', 21.4, -196, { yaw: -PI / 2 });
  add('decal', 0, -182, { layer: 'p2_blood_splashes', w: 2, flat: true });
}
const daises = [{ x: 0, z: -210, hx: 7, hz: 3, dy: 0.5 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
// His knights in blood red: Oxblood, and a few in his darker Sable among them.
const KNIGHTS = ['velscour_knight_1', 'velscour_knight_2', 'velscour_knight_3', 'velscour_knight_4'];
const LANCERS = ['velscour_lancer', 'velscour_lancer_2'];
const CLERKS = ['necromancer_2', 'necromancer_3'];
const PRIESTS = ['necromancer_f1', 'necromancer_f2', 'necromancer_2'];
const BELLOWS = ['kobold_armored_1', 'kobold_armored_2', 'kobold_1'];
const packs = [
  { key: 'rd_gateguard', room: 'rd_gate', pick: KNIGHTS, n: 2, pal: ['Oxblood'], at: [0, -6], r: 2 },
  { key: 'rd_tollmen', room: 'rd_toll', pick: KNIGHTS, n: 2, pal: ['Oxblood'], at: [-6, 10], r: 3 },
  { key: 'rd_clerks', room: 'rd_toll', pick: CLERKS, n: 2, elite: ['necromancer_lord'], pal: ['Oxblood', 'Sable'], ai: 'caster', at: [6, -12], r: 3 },
  { key: 'rd_lancers', room: 'rd_court', pick: LANCERS.concat(KNIGHTS), n: 3, elite: ['velscour_lancer_3'], pal: ['Oxblood'], at: [-6, -10], r: 6 },
  // (The bellows-imps' overseers come out of the back of the forge to them.)
  { key: 'rd_bellows', room: 'rd_forge', pick: BELLOWS, n: 4, pal: ['Emberhide'], at: [0, 0], r: 4, more: { n: 2, pick: KNIGHTS, from: [-64, -114], when: 0.6 } },
  { key: 'rd_priests', room: 'rd_chapel', pick: PRIESTS, n: 3, pal: ['Oxblood', 'Sable'], ai: 'caster', at: [0, -2], r: 3 },
  // (The pair on the Commander's door, at the stair's head, come down to them when they're hard pressed.)
  { key: 'rd_stairguard', room: 'rd_stair', pick: KNIGHTS, n: 2, pal: ['Sable'], at: [0, 4], r: 1.5, more: { n: 2, pick: KNIGHTS, from: [-6, -163], when: 0.6 } },
  // (His gaolers, by the pens' way in.)
  { key: 'rd_gaolers', room: 'rd_pens', pick: KNIGHTS, n: 2, pal: ['Oxblood'], at: [9, 4], r: 1.5 },
  // (And a pair walking the way from the Toll Hall down to the court and back.)
  { key: 'rd_round', room: 'rd_court', pick: KNIGHTS, n: 2, pal: ['Oxblood'], at: [8, 12], r: 1, walk: [[8, -76], [8, -88], [8, -96]] },
];
const bosses = [
  { key: 'penwarden', room: 'rd_pens', name: 'The Pen-Warden', models: ['rd_penwarden'], pal: ['Rust'], hp: 1500, damage: 15, reach: 3.0, loot: 8 },
  { key: 'carrow', room: 'rd_harness', name: 'Sir Oswin Carrow, Master of Harness', models: ['rd_carrow'], pal: ['Oxblood'], hp: 1700, damage: 16, reach: 3.2, loot: 8 },
  { key: 'rothgar', room: 'rd_hall', name: 'Knight-Commander Rothgar, the Red Hand', models: ['rd_rothgar'], pal: ['Oxblood'], hp: 2200, damage: 17, reach: 3.6, loot: 0, needs: ['penwarden', 'carrow'], shut: 'rot_shut' },
];
const warnings = {
  pen_open: 'The Pen-Warden. He lets his debtors out of their cages to stand between you: cut them down, or they drag at you. When he swings his keys, get out of the ring.',
  pen_swing: 'The Pen-Warden swings his chain of keys! Out of the ring.',
  pen_slam: 'He brings his club down! Out of the arc.',
  pen_debtors: 'He opens the cages! His debtors come at you.',
  pen_drag: 'He hauls on his chain! Out of its line.',
  pen_turn: 'The Pen-Warden turns on you! Keep moving.',
  pen_enrage: 'The Pen-Warden is enraged!',
  car_open: 'Sir Oswin Carrow, Master of Harness. At his word the harness on the stands gets up and fights: put it down before he calls the next. When he charges, step out of his line.',
  car_harness: 'He calls the harness down off its stands! Empty plate, walking.',
  car_charge: 'Sir Oswin charges! Out of his line.',
  car_cleave: 'He sweeps his blade! Out of the arc.',
  car_stamp: 'He stamps, and the hall shakes! Jump the ring as it reaches you.',
  car_turn: 'Sir Oswin turns on you! Keep out of his reach.',
  car_enrage: 'Sir Oswin is enraged!',
  rot_shut: "The Commander's Hall is shut. Its doors open only to the deaths of his two: the Pen-Warden and Sir Oswin Carrow.",
  rot_open: 'Knight-Commander Rothgar, the Red Hand. He calls his guard to him; at the turn of the fight an empty harness plants his banner before his seat, and while it stands, he mends. Cut it down.',
  rot_cleave: 'The Red Hand sweeps his blade! Out of the arc.',
  rot_charge: 'He charges! Out of the line.',
  rot_quake: 'He drives his blade into the floor! Jump the ring.',
  rot_brand: 'He brands the floor with his fire! Out of the circles.',
  rot_guard: 'His guard comes to him!',
  rot_banner: 'HIS BANNER IS PLANTED! While its bearer stands, he mends: cut it down!',
  rot_fallen: 'His banner falls! He mends no more.',
  rot_turn: 'The Red Hand turns on you! Keep moving.',
  rot_enrage: 'Knight-Commander Rothgar is enraged!',
};

export const REDOUBT = {
  key: 'redoubt', tag: 'rd', name: 'The Redoubt under the Sill', short: 'the Redoubt', x: 8700, z: -5700, y: -60, level: 5, style: 'castle',
  party: false, castle: true, dungeon: true,
  // (Its portal out on the Sill burns his red, not the cold blue of the rest: src/gfx/renderer.js EMBER.)
  portalHue: 'ember',
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { penwarden: 'pen_turn', carrow: 'car_turn', rothgar: 'rot_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 16, z: -206 },
  // At the foot of the Sill's north cliff, its back to the rock, facing east across the plain to the city's wall.
  portal: { x: 9038, z: 262, yaw: PI / 2, r: 2.2 },
  links: [],
  last: 'rothgar', tough: { hp: 0.9, damage: 0.45 }, pay: { xp: 100, gold: 180 },
  // (A kill down here worth a tenth of its kind's: they're the castle's knights, and this is met at five. src/main.js gainXp.)
  xpScale: 0.1,
  names: { "Velscour's Knights": 'REDOUBT KNIGHT', Necromancers: 'TOLL-CLERK', Kobolds: 'BELLOWS-IMP', 'Haunted Mannequins': 'EMPTY HARNESS', 'The Possessed': 'DEBTOR' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_skull', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.42, 0.18], fire: [1, 0.46, 0.2], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "The Redoubt under the Sill. Velscour's knights keep the only way down to his city here, and take its toll.", clear: 'Knight-Commander Rothgar is dead! The Redoubt is broken.', wipe: 'You fall... and wake inside the Cliff Gate.' },
};
