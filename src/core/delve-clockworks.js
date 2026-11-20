// The Clockworks: one of Castle Velscour's dungeons (docs/PHOBOS-CASTLE.md, set B), the works of the Clock Tower, gone into
// by the Clock Tower's door at the end of the Middle Ward's Horn Galleries or by its own door at the tower's foot, both
// locked till the Painted Key's had (the Gallery of a Thousand Portraits'). His clock strikes no bell: the hours are beaten
// on gongs of iron. Its faces have marks and no numerals. Grey with gold, the livery of this wing (never beside his blue).
//   The Winders' Door, and the Weight Shaft behind it: the tower's hollow, the weights hung down it on their chains.
//   The Going Train, west: the great wheels. The Winding Stair up from it, the winders' way, to the Escapement.
//   The Striking Floor, east: the gongs, the hammers, and the Striker (93), who beats the hours. The Hammer Stair up from it
//     to the room behind the Great Dial.
//   The Pendulum Stair up out of the shaft to the Pendulum Hall, where three pendulums swing the width of the floor, and
//     the Regulator (94) keeps their time.
//   The Escapement, west of the hall, and behind one of its wheels the Clockmaker's Closet (on no map).
//   Behind the Great Dial, east: the back of the tower's face, the whole castle seen through it.
//   The Lift Head, at the top: the Clockmaker (96), and behind him the lift up to the High Ward, which wants the Winding
//     Key he carries. Its doors are shut till his two are dead. What you stopped below leaves him less: the Going Train's
//     wheels stopped, fewer of his winders come to him; the Escapement jammed, he can't turn back the hour.
// Local to its own way in: x east, z south of the door (the way on is toward -z), y over its floor.
// No two ways out of a room straight across from each other: the corner map draws no cross of his rooms.
import { R } from './delve-lay.js';

const PI = Math.PI;

const rooms = [
  R('cw_door', "the Winders' Door", 0, -12, 5, 20, 0, 9, { rock: 'p2_riveted_plate', foot: 'dark:block', ground: 'p2_walk_paving', fires: 14 }),
  R('cw_shaft', 'the Weight Shaft', 0, -46, 16, 20, 0, 30, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ward_paving', banners: 18, cloth: 'p2_banner_greygold', hang: 0, fires: 12 }),
  R('cw_train', 'the Going Train', -52, -52, 18, 16, 0, 16, { rock: 'p2_riveted_plate', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 12 }),
  R('cw_strike', 'the Striking Floor', 56, -40, 20, 16, 0, 14, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ward_paving', banners: 14, cloth: 'p2_banner_greygold', fires: 13 }),
  R('cw_pstair', 'the Pendulum Stair', -10, -89, 4, 27, 6, 12, { tz: -12 / 54, fires: 11, rock: 'slate:ashlar', foot: 'dark:block' }),
  R('cw_pend', 'the Pendulum Hall', -10, -134, 22, 24, 12, 24, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ward_paving', banners: 16, cloth: 'p2_banner_greygold', fires: 9 }),
  R('cw_esc', 'the Escapement', -60, -142, 16, 14, 12, 12, { rock: 'p2_riveted_plate', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 12 }),
  R('cw_face', 'Behind the Great Dial', 46, -126, 14, 12, 12, 16, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 16 }),
  R('cw_closet', "the Clockmaker's Closet", -70, -176, 5, 5, 12, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('cw_lift', 'the Lift Head', 4, -194, 20, 16, 16, 16, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_bone_joint_flags', banners: 16, cloth: 'p2_banner_greygold', fires: 12 }),
];

// (Each run a little into both the rooms it joins, so it opens a doorway in each wall.)
const tunnels = [
  { pts: [[-14, -52], [-36, -52]], w: 3.5, h: 5 },                       // the shaft to the Going Train
  { pts: [[14, -38], [38, -38]], w: 3.5, h: 5 },                         // the shaft to the Striking Floor
  { pts: [[60, -54], [60, -100], [50, -116]], w: 2.6, h: 4.5 },        // the Hammer Stair, up to behind the Dial
  { pts: [[10, -124], [34, -124]], w: 3, h: 5 },                       // the Pendulum Hall to behind the Dial
  { pts: [[-30, -142], [-46, -142]], w: 3, h: 5 },                     // the Pendulum Hall to the Escapement
  { pts: [[4, -156], [4, -180]], w: 4, h: 6 },                         // up to the Lift Head
  { pts: [[-62, -66], [-62, -100], [-62, -130]], w: 2.4, h: 4.5 },       // the Winding Stair, from the Going Train up to the Escapement
  // The Clockmaker's Closet: behind the Escapement's great wheel in its south wall. On no map.
  { pts: [[-72, -154], [-72, -173]], w: 1.3, h: 3, dark: true },
  // The doors his winders come through: into the Striking Floor, the Pendulum Hall and the Lift Head.
  { pts: [[74, -30], [80, -30]], w: 2, h: 4, dead: true, door: 'cw_strike' },
  { pts: [[-30, -120], [-37, -120]], w: 2, h: 4, dead: true, door: 'cw_pend' },
  { pts: [[-14, -190], [-21, -190]], w: 2, h: 4, dead: true, door: 'cw_lift' },
  { pts: [[22, -200], [29, -200]], w: 2, h: 4, dead: true, door: 'cw_lift' },
];

// The Striker's release plate, on the Striking Floor: stood on, it lets his spring down (src/sim/castle-fights-b.js striker).
export const STRIKER_PLATE = [42, -50];
// The rows his hammers come down along, across the Striking Floor (z of each).
export const HAMMER_ROWS = [-50, -42, -34, -28];
// The three pendulums of the Pendulum Hall: the z each swings across the floor at (castle-fights-b.js regulator).
export const PENDULUMS = [-120, -134, -148];
// Where the Clockmaker's winders stand to wind the hour back, either side of the Lift Head (castle-fights-b.js clockmaker).
export const WINDERS_AT = [[-10, -184], [18, -202]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Winders' Door: the winders' coats and tools, a small dial over the inner door, the Clock Tower's own door
  // (back to the Horn Galleries) in the east wall.
  add('lintel', 0, -2, { hx: 5, stone: 'dark:ashlar' });
  add('coatrail', -4.4, -10, { hx: 2, yaw: PI / 2 }); add('tools', -4.2, -20, { yaw: PI / 2 }); add('crates', 3.6, -24);
  add('clockface', 0, -31.7, { yaw: 0, r: 1.3, up: 6.2, hands: [0.7, 2.3] });
  add('brazier', -3.6, -27); add('brazier', 3.6, 2);
  add('mark', 4.75, -12, { up: 5.6, r: 0.6, yaw: -PI / 2, back: -1 });
  // ---- the Weight Shaft: the weights hung down it over their pits, wheels on its walls as big as houses, the chains.
  add('weights', -7, -42, { n: 3, r: 1.5, up: 3 }); add('pit', -7, -42, { r: 2.6 });
  add('weights', 8, -56, { n: 3, r: 1.5, up: 6, turn: 1 }); add('pit', 8, -56, { r: 2.6 });
  add('gear', -15.7, -40, { yaw: PI / 2, r: 4.2, up: 8 }); add('gear', -15.7, -47.4, { yaw: PI / 2, r: 2.4, up: 13.2, spokes: 5, turn: 0.2 });
  add('gear', 15.7, -54, { yaw: -PI / 2, r: 5.2, up: 11, spokes: 5 }); add('gear', 15.7, -45, { yaw: -PI / 2, r: 2.2, up: 5.4, turn: 0.4 });
  add('gear', 6, -65.7, { yaw: 0, r: 3.4, up: 17, spokes: 5 });
  for (const [x, z] of [[-12, -30], [12, -30], [-12, -62], [12, -62]]) add('column', x, z, { r: 1.2, solid: true });
  add('chain', -2, -34, { up: 5 }); add('chain', 3, -60, { up: 4 });
  add('brazier', -3, -30); add('brazier', 0, -62);
  add('decal', -15.95, -58, { layer: 'p2_rust_streaks', w: 3, h: 6, up: 5, yaw: PI / 2 });
  // ---- the Going Train: the great wheel lying in the floor, its fellows meshed with it; wheels up the west wall; the
  // winders' bench.
  add('gear', -52, -52, { flat: true, r: 6, h: 0.3 }); add('gear', -43.2, -46.2, { flat: true, r: 3, h: 0.5, turn: 0.3 }); add('gear', -60, -58.5, { flat: true, r: 3.4, h: 0.7, turn: 0.1 });
  add('gear', -69.7, -46, { yaw: PI / 2, r: 5.4, up: 8, spokes: 5 }); add('gear', -69.7, -57, { yaw: PI / 2, r: 3, up: 4.2 });
  add('gear', -46, -36.3, { yaw: PI, r: 3.6, up: 6.5 });
  add('table', -40, -64, { hx: 2.4, hz: 0.7 }); add('tools', -44.5, -66.4, { yaw: 0 }); add('barrels', -37, -38.5); add('crates', -67, -39);
  add('brazier', -38, -58); add('brazier', -64, -40);
  // ---- the Striking Floor: two gongs of iron in their frames, the hammers hung over the rows they fall along, the release
  // plate in the floor (two rings of black glass), armour on stands.
  add('gong', 46, -29, { yaw: 0.3, r: 1.5, solid: true }); add('gong', 68, -52, { yaw: -2.6, r: 1.5, solid: true });
  for (const z of HAMMER_ROWS) for (const x of [44, 56, 68]) add('pendulum', x, z, { up: 6.4, r: 0.6, lean: (x + z) % 3 - 1 });
  add('circle', STRIKER_PLATE[0], STRIKER_PLATE[1], { r: 2.4 });
  add('stand', 75.4, -40); add('stand', 37.4, -46); add('rack', 56, -55.4, { yaw: PI, h: 2.4, n: 6, board: true });
  add('mark', 56, -24.4, { up: 8, r: 1.4, back: 1 });
  add('brazier', 40, -27); add('brazier', 72, -27); add('brazier', 72, -53);
  // ---- the Pendulum Stair: his plate on stands up it.
  add('stand', -12.8, -74); add('stand', -7.2, -92); add('stand', -12.8, -106);
  // ---- the Pendulum Hall: the three pendulums, each hung part way through its swing; the escape wheel on the far wall;
  // a sill of iron in the floor under each swing.
  PENDULUMS.forEach((z, i) => { add('pendulum', -10, z, { up: 2.4, r: 1.5, lean: [-9, 4, 11][i] }); add('sill', -10, z, { hx: 21.6, hz: 0.18 }); });
  add('gear', -10, -157.7, { yaw: 0, r: 5, up: 13, spokes: 5 }); add('clockface', -31.7, -130, { yaw: PI / 2, r: 2.6, up: 9, hands: [1.9, 0.2] });
  add('mark', 11.7, -140, { up: 9, r: 1.2, yaw: -PI / 2, back: -1 });
  for (const [x, z] of [[-28, -112], [8, -112], [-28, -156], [8, -150], [-22, -127], [2, -127], [-22, -141], [2, -141]]) add('brazier', x, z);
  // ---- the Escapement: the escape wheel and its anchor up the west wall, lesser wheels, the oil, the files; and a wheel
  // stood against the south wall, a man's width of dark behind it.
  add('gear', -75.7, -142, { yaw: PI / 2, r: 5, up: 6.2, spokes: 5 }); add('gear', -75.7, -132, { yaw: PI / 2, r: 2, up: 9.4 });
  add('gear', -70.6, -155.4, { yaw: 0.25, r: 2.6, up: 2.9, out: 0.5 });
  add('gear', -52, -148, { flat: true, r: 2.4, h: 0.4 }); add('table', -50, -132, { hx: 2.6, hz: 0.7 }); add('tools', -56, -129.6, { yaw: 0 });
  add('vat', -66, -131, { r: 0.8 }); add('barrels', -46, -153); add('brazier', -64, -150); add('brazier', -48, -138);
  add('decal', -75.95, -150, { layer: 'p2_rust_streaks', w: 2.4, h: 5, up: 3, yaw: PI / 2 });
  // ---- the Clockmaker's Closet: his own bench, his own small clock, what he kept.
  add('table', -70, -179.8, { hx: 1.6, hz: 0.6 }); add('candles', -70.6, -179.6, { up: 0.85 }); add('clockface', -74.7, -176, { yaw: PI / 2, r: 0.7, up: 2.4, hands: [2.4, 0.9] });
  add('shelf', -66.4, -176, { hx: 0.3, hz: 2, h: 3 });
  // ---- Behind the Great Dial: the back of the tower's face, lit from outside; the hands' arbor through it; a walk before it.
  add('clockface', 59.7, -126, { yaw: -PI / 2, r: 5.6, up: 8, hands: [2.0, 0.5], lit: true });
  add('daylight', 54, -126, { r: 3, pool: false });
  add('gear', 46, -114.3, { yaw: PI, r: 3, up: 9 }); add('gear', 40, -137.7, { yaw: 0, r: 2.2, up: 5 });
  add('carpet', 50, -126, { hx: 5, hz: 3, layer: 'dark:cloth_oat' }); add('bench', 44, -126, { hx: 0.2, hz: 2.6 });
  add('brazier', 36, -130); add('crates', 34.5, -135.5);
  // ---- the Lift Head: the lift in its cage against the far wall, the winding posts, his mark over it, his bench of
  // half-made clocks, wheels on the walls.
  add('lift', -6, -206.4, { r: 2.3, face: PI / 2 });
  add('mark', -6, -209.7, { up: 8.4, r: 1.3, back: 1 });
  for (const [x, z] of WINDERS_AT) { add('column', x, z + 2.4, { r: 0.7, solid: true }); add('gear', x, z + 2.4, { flat: true, r: 1.5, h: 0.2, up: 2.2 }); }
  add('gear', -15.7, -198, { yaw: PI / 2, r: 4, up: 8, spokes: 5 }); add('gear', 23.7, -186, { yaw: -PI / 2, r: 4.6, up: 9 });
  add('clockface', 12, -209.7, { yaw: 0, r: 2.2, up: 9, hands: [1.2, 2.9] });
  add('table', 22.6, -192, { hx: 0.8, hz: 3 }); add('candles', 22.6, -191, { up: 0.85 }); add('tools', 22.8, -196.6, { yaw: -PI / 2 });
  for (const [x, z] of [[-13, -196], [21, -184], [6, -207], [-4, -182]]) add('brazier', x, z);
}
const daises = [{ x: -6, z: -205, hx: 5, hz: 4, dy: 0.4 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const LANCERS = ['velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'];
const AUTOMATA = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const WRIGHTS = ['kobold_armored_1', 'kobold_armored_2', 'kobold_armored_3', 'kobold_3'];
const WARDENS = ['plague_knight_black', 'plague_knight_red'];
const WINGS = ['harpy_warrior', 'harpy_undead_1', 'harpy_undead_2'];
// (None in the Winders' Door: it's where you wake if you fall.)
const packs = [
  { key: 'cw_shaft', room: 'cw_shaft', pick: AUTOMATA, n: 5, pal: ['Greygold'], at: [0, -4], r: 5 },
  { key: 'cw_train', room: 'cw_train', pick: WRIGHTS, n: 6, elite: ['possessed_knight_3'], pal: ['Greygold', 'Rust'], tough: { hp: 1.2, damage: 1.2 }, at: [4, 6], r: 5 },
  { key: 'cw_pstair', room: 'cw_pstair', pick: KNIGHTS.concat(LANCERS), n: 3, pal: ['Greygold'], at: [0, 0], r: 2 },
  { key: 'cw_esc', room: 'cw_esc', pick: WARDENS.concat(AUTOMATA), n: 5, elite: ['plague_giant_armored'], pal: ['Greygold'], tough: { hp: 1.3, damage: 1.2 }, at: [4, 2], r: 5 },
  { key: 'cw_face', room: 'cw_face', pick: WINGS, n: 4, pal: ['Greygold', 'Ashen'], at: [-2, 0], r: 4 },
  // The winders' round, up and down the Winding Stair.
  { key: 'cw_wstair', room: 'cw_train', pick: AUTOMATA, n: 3, pal: ['Greygold'], at: [-10, -32], r: 1, walk: [[-62, -76], [-62, -100], [-62, -122]] },
];
const bosses = [
  { key: 'striker', room: 'cw_strike', name: 'The Striker', models: ['cw_striker'], pal: ['Greygold'], hp: 128000, damage: 330, reach: 3.8, loot: 8 },
  { key: 'regulator', room: 'cw_pend', name: 'The Regulator', models: ['cw_regulator'], pal: ['Greygold'], hp: 120000, damage: 335, reach: 3.2, loot: 8, at: [4, -4] },
  { key: 'clockmaker', room: 'cw_lift', name: 'The Clockmaker', models: ['cw_clockmaker'], pal: ['Greygold'], hp: 142000, damage: 345, reach: 3.2, loot: 0, needs: ['striker', 'regulator'], shut: 'ckm_shut', gives: 'key:clockworks' },
];
const warnings = {
  cw_shut: "The Clock Tower's door is locked. Its key is painted into the last frame of the Gallery of a Thousand Portraits.",
  cw_lift_shut: 'The lift wants winding, and the Winding Key is on the Clockmaker.',
  stk_open: "The Striker. He's wound a turn tighter every twenty seconds, and hits the harder for each. Stand on the release plate, the black rings in the floor, to let his spring down: he stops dead while it runs out. When his hammers fall, stand between the rows.",
  stk_hammer: 'The Striker swings! Out of the arc.',
  stk_rows: 'The hammers fall along their rows! Stand between them.',
  stk_hour: 'He strikes the hour! Jump each ring as it reaches you.',
  stk_cogs: 'Cogs off the wheels! Out of the circles.',
  stk_throw: 'He throws his hammer! Out of the line.',
  stk_wound: "HE'S WOUND TIGHT! Someone onto the release plate, the black rings in the floor!",
  stk_release: 'His spring runs down! He stands stopped: hit him.',
  stk_turn: 'The Striker turns on you! Get behind the tank, or out of his reach, till he lets go.',
  stk_enrage: 'The Striker is enraged!',
  reg_open: 'The Regulator. The three pendulums swing across the hall in turn: keep off the iron sill of the one that is coming. And when he stops the clock, STAND STILL: whatever moves while it is stopped is cut.',
  reg_swing: 'A pendulum comes across! Off its sill.',
  reg_cut: 'The Regulator cuts! Out of the arc.',
  reg_springs: 'Springs fly! Out of their lines.',
  reg_tick: 'He counts the seconds out across the floor! Out of the circles.',
  reg_gears: 'Wheels come off the wall at you! Out of the circles.',
  reg_weights: 'He lets a weight go! Jump the ring as it reaches you.',
  reg_stop: 'HE STOPS THE CLOCK! STAND STILL!',
  reg_go: 'The clock goes again. Move.',
  reg_turn: 'The Regulator turns on you! Get behind the tank, or out of his reach, till he lets go.',
  reg_enrage: 'The Regulator is enraged!',
  ckm_shut: "The Lift Head is shut. Its doors open to the Clockmaker's two: the Striker and the Regulator.",
  ckm_open: "The Clockmaker. When he starts to turn back the hour, his winders go to the winding posts: cut them down before the hour's turned, or he's mended. Keep ahead of the long hand as it sweeps.",
  ckm_less_men: 'The Going Train is stopped: fewer of his winders come to him.',
  ckm_less_hour: "The Escapement is jammed: he can't turn back the hour.",
  ckm_hand: 'The long hand sweeps round him! Keep ahead of it.',
  ckm_cogs: 'Cogs off the walls! Out of the circles.',
  ckm_springs: 'Springs fly! Out of their lines.',
  ckm_cut: 'The Clockmaker cuts! Out of the arc.',
  ckm_chime: 'He strikes the gong! Jump the ring as it reaches you.',
  ckm_winders: 'His winders come to him!',
  ckm_rewind: 'HE TURNS BACK THE HOUR! His winders are at the posts: everyone but his tank, cut them down!',
  ckm_rewound: 'The hour is turned back: he is mended.',
  ckm_stopped: 'The winders are down: the hour stands.',
  ckm_turn: 'The Clockmaker turns on you! Get behind the tank, or out of his reach, till he lets go.',
  ckm_enrage: 'The Clockmaker is enraged!',
};

export const CLOCKWORKS = {
  key: 'clockworks', tag: 'cw', name: 'Castle Velscour: the Clockworks', short: 'the Clockworks', x: 14380, z: -5700, y: -60, level: 90, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { striker: 'stk_turn', regulator: 'reg_turn', clockmaker: 'ckm_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 16, z: -206.4 },
  // At the Clock Tower's foot in the Middle Ward, on its west side, facing west down the ward; locked till the Painted Key's had.
  portal: { x: 11084, z: 75, yaw: -PI / 2, r: 2.2 },
  shutBy: 'key:portraits', shutWord: 'cw_shut',
  // The Clock Tower's own door, back to the Horn Galleries in the Middle Ward; and the lift at the top, up to the High Ward,
  // which wants the Winding Key.
  links: [{ x: 3.4, z: -12, yaw: -PI / 2, to: 'middleward', n: 2 }, { x: -6, z: -206.4, yaw: 0, to: 'highward', n: 5, shut: 'key:clockworks', word: 'cw_lift_shut' }],
  chests: [
    { id: 'closet', room: 'cw_closet', x: -73.6, z: -177, yaw: PI / 2, loot: 3 },
    { id: 'dial', room: 'cw_face', x: 34, z: -116.4, yaw: PI / 2, loot: 2 },
    { id: 'train', room: 'cw_train', x: -68, z: -66, yaw: 0.8, loot: 2 },
  ],
  vistas: [{ id: 'great_dial', name: 'Behind the Great Dial', room: 'cw_face', x: 54, z: -126, r: 5 }],
  auto: { way: ['cw_door', 'cw_shaft', 'cw_train', 'cw_shaft', 'cw_strike', 'cw_shaft', 'cw_pstair', 'cw_pend', 'cw_face', 'cw_pend', 'cw_esc', 'cw_closet', 'cw_esc', 'cw_pend', 'cw_lift'] },
  shots: [
    ['cw_shaft', 'cw_door', [0, 2.2, -24], [4, 12, -66]],
    ['cw_strike', 'cw_shaft', [38, 3, -38], [70, 2, -46]],
    ['cw_pend', 'cw_pstair', [-10, 15, -112], [-10, 15, -158]],
    ['cw_face', 'cw_face', [34, 14.5, -134], [59, 20, -124]],
  ],
  last: 'clockmaker', tough: { hp: 30, damage: 3.3 }, pay: { xp: 82000, gold: 10400 },
  names: { "Velscour's Knights": 'HOUR GUARD', 'Haunted Mannequins': 'WINDER', Kobolds: 'GEARWRIGHT', 'Plague Knights': 'ESCAPEMENT WARDEN', Harpies: 'DIAL-WING', 'Plague Giants': 'THE OILER' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_greygold', roof: 'dark:stone', flame: 'flame', light: [1, 0.6, 0.28], fire: [1, 0.64, 0.3], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Clockworks. His clock counts every hour he has left to anyone. Its works go up through the tower.', clear: 'The Clockmaker is dead! His clock has stopped.', wipe: "You fall... and wake inside the Winders' Door." },
};
export const CLOCKWORKS_VARIANTS = {
  cw_striker: { src: 'plague_giant_armored', alt: 'plague_giant_1', height: 4.6, name: 'THE STRIKER' },
  cw_regulator: { src: 'mannequin_3', alt: 'mannequin_1', height: 3.6, name: 'THE REGULATOR' },
  cw_clockmaker: { src: 'necromancer_lord_2', alt: 'necromancer_lord', height: 3.1, name: 'THE CLOCKMAKER' },
  cw_winder: { src: 'mannequin_1', alt: 'mannequin_2', height: 2.0, name: 'WINDER' },
};
