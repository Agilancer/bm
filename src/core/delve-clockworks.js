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
//   The Escapement, west of the hall, and behind a wheel stood against its wall the Clockmaker's Closet (on no map).
//   Behind the Great Dial, east: the back of the tower's face, the whole castle seen through it.
//   The Lift Head, at the top: the Clockmaker (96), and behind him the lift up to the High Ward, which wants the Winding
//     Key he carries. Its doors are shut till his two are dead. What you stopped below leaves him less: the Going Train's
//     wheels stopped, fewer of his winders come to him; the Escapement jammed, he can't turn back the hour.
// Local to its own way in: x east, z south of the door (the way on is toward -z), y over its floor.
// No two ways out of a room straight across from each other: the corner map draws no cross of his rooms.
import { R } from './delve-lay.js';

const PI = Math.PI;

// (Each room its own section: a low door, a shaft three times as tall as it's wide, a low wide floor of wheels, a tall
// narrow hall for the pendulums. And lit in pools: a fire or two where something's to be seen, dark between.)
const rooms = [
  R('cw_door', "the Winders' Door", 0, -15, 4.5, 23, 0, 5, { rock: 'p2_riveted_plate', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 0 }),
  R('cw_shaft', 'the Weight Shaft', 0, -46, 11, 13, 0, 34, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ward_paving', banners: 0, hang: 0, fires: 0 }),
  R('cw_train', 'the Going Train', -48, -50, 13, 11, 0, 7, { rock: 'p2_riveted_plate', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 0 }),
  R('cw_strike', 'the Striking Floor', 54, -40, 15, 13, 0, 11, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ward_paving', banners: 14, cloth: 'p2_banner_greygold', fires: 0 }),
  R('cw_pstair', 'the Pendulum Stair', -6, -84, 4, 29, 6, 9, { tz: -12 / 58, fires: 0, banners: 0, rock: 'slate:ashlar', foot: 'dark:block' }),
  R('cw_pend', 'the Pendulum Hall', -5, -128, 15, 18, 12, 22, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ward_paving', banners: 16, cloth: 'p2_banner_greygold', fires: 0 }),
  R('cw_esc', 'the Escapement', -50, -136, 11, 10, 12, 8, { rock: 'p2_riveted_plate', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 0 }),
  R('cw_face', 'Behind the Great Dial', 42, -122, 10, 9, 12, 14, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('cw_closet', "the Clockmaker's Closet", -78, -130, 4.5, 4.5, 12, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('cw_lift', 'the Lift Head', 4, -178, 16, 13, 16, 14, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_bone_joint_flags', banners: 16, cloth: 'p2_banner_greygold', fires: 0 }),
];

// (Each run a little into both the rooms it joins, so it opens a doorway in each wall.)
const tunnels = [
  { pts: [[-9, -50], [-37, -50]], w: 3, h: 4.5 },                       // the shaft to the Going Train
  { pts: [[9, -40], [41, -40]], w: 3, h: 4.5 },                         // the shaft to the Striking Floor
  { pts: [[60, -51], [60, -98], [48, -115]], w: 2.4, h: 4.5 },          // the Hammer Stair, up to behind the Dial
  { pts: [[8, -120], [34, -120]], w: 2.6, h: 4.5 },                     // the Pendulum Hall to behind the Dial
  { pts: [[-18, -136], [-41, -136]], w: 2.6, h: 4.5 },                  // the Pendulum Hall to the Escapement
  { pts: [[4, -144], [4, -167]], w: 3.5, h: 5.5 },                      // up to the Lift Head
  { pts: [[-56, -59], [-56, -100], [-56, -128]], w: 2.2, h: 4.2 },      // the Winding Stair, from the Going Train up to the Escapement
  // The Clockmaker's Closet: behind a wheel stood against the Escapement's west wall. On no map.
  { pts: [[-59, -130], [-75, -130]], w: 1.3, h: 3, dark: true },
  // The doors his winders come through: into the Striking Floor, the Pendulum Hall and the Lift Head.
  { pts: [[67, -32], [74, -32]], w: 2, h: 4, dead: true, door: 'cw_strike' },
  { pts: [[-18, -116], [-25, -116]], w: 2, h: 4, dead: true, door: 'cw_pend' },
  { pts: [[-10, -176], [-17, -176]], w: 2, h: 4, dead: true, door: 'cw_lift' },
  { pts: [[18, -180], [25, -180]], w: 2, h: 4, dead: true, door: 'cw_lift' },
];

// The Striker's release plate, on the Striking Floor: stood on, it lets his spring down (src/sim/castle-fights-b.js striker).
export const STRIKER_PLATE = [43, -46];
// The rows his hammers come down along, across the Striking Floor (z of each).
export const HAMMER_ROWS = [-49, -43, -37, -31];
// The three pendulums of the Pendulum Hall: the z each swings across the floor at (castle-fights-b.js regulator).
export const PENDULUMS = [-118, -128, -138];
// Where the Clockmaker's winders stand to wind the hour back, either side of the Lift Head (castle-fights-b.js clockmaker);
// and the winding post each stands at.
export const WINDERS_AT = [[-8, -170], [16, -186]];
const WINDING_POSTS = [[-10, -170], [18, -186]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Winders' Door: low, plated; the winders' tools, his plate on a stand, the Clock Tower's own door (back to the
  // Horn Galleries) in the east wall. One fire at the way in, one where it opens into the shaft.
  add('lintel', 0, -2, { hx: 4.5, stone: 'dark:ashlar' });
  add('tools', -4, -20, { yaw: PI / 2 }); add('crates', 3.2, -30); add('stand', -3.4, -8); add('barrels', -3.2, -28);
  add('brazier', 3.9, -5); add('brazier', -3.2, -32.4);
  add('mark', 4.25, -12, { up: 3.2, r: 0.5, yaw: -PI / 2, back: -1 });
  // ---- the Weight Shaft: three times as tall as it's wide. The great dial of the works high on its far wall, seen as you
  // come in under it; the weights hung down the shaft over their pits; wheels up both walls as big as houses.
  add('clockface', 3, -58.7, { yaw: 0, r: 4.4, up: 21, hands: [0.7, 2.3] });
  // (One way across, down the shaft's middle: the weights hang clear of it either side, and no line of theirs crosses it.)
  add('catwalk', 0.5, -46, { hx: 0.7, hz: 12.6, up: 12 }); add('daylight', 0.5, -40, { r: 1.6, pool: false, shaft: false });
  add('basket', -7, -47, { up: 8 }); add('basket', 7.4, -46, { up: 15 }); add('basket', -6, -52, { up: 22 });
  add('weights', -5, -42, { n: 3, r: 1.3, up: 3 }); add('pit', -5, -42, { r: 2.3 });
  add('weights', 6, -53, { n: 3, r: 1.3, up: 7, turn: 1 }); add('pit', 6, -53, { r: 2.3 });
  add('gear', -10.7, -42, { yaw: PI / 2, r: 4.2, up: 9.4 }); add('gear', -10.7, -49, { yaw: PI / 2, r: 2.6, up: 16.6, spokes: 5, turn: 0.2 });
  add('gear', 10.7, -52, { yaw: -PI / 2, r: 5, up: 13.4, spokes: 5 }); add('gear', 10.7, -48, { yaw: -PI / 2, r: 2.2, up: 6.2, turn: 0.4 });
  add('gear', 10.7, -41, { yaw: -PI / 2, r: 3, up: 24 }); add('gear', -10.7, -54, { yaw: PI / 2, r: 3.4, up: 26, spokes: 5 });
  add('chain', -7, -36, { up: 5 }); add('chain', 7.6, -57, { up: 4 });
  add('brazier', -4, -35.4); add('brazier', 4, -35.4); add('brazier', 4, -56.6);
  add('decal', -10.95, -56, { layer: 'p2_rust_streaks', w: 3, h: 6, up: 5, yaw: PI / 2 });
  // ---- the Going Train: a low, wide floor; the great wheel lying in it, its fellows meshed with it; wheels on the walls;
  // the winders' bench. One fire over the great wheel.
  add('gear', -48, -50, { flat: true, r: 4.6, h: 0.3 }); add('gear', -41.4, -45.6, { flat: true, r: 2.4, h: 0.5, turn: 0.3 }); add('gear', -54, -55.6, { flat: true, r: 2.6, h: 0.7, turn: 0.1 });
  add('gear', -60.7, -46, { yaw: PI / 2, r: 2.8, up: 3.5, spokes: 5 }); add('gear', -46, -39.3, { yaw: PI, r: 2.6, up: 3.5 });
  add('table', -39.4, -58, { hx: 2, hz: 0.7 }); add('tools', -43, -60.4, { yaw: 0 }); add('barrels', -37, -41); add('crates', -59, -41);
  add('brazier', -42, -53); add('brazier', -53, -46);
  // ---- the Striking Floor: two gongs of iron hung from the roof, the hammers hung over the rows they fall along, the
  // release plate in the floor (two rings of black glass), armour on stands. Fire by his mark, and by the plate.
  add('gong', 46, -30, { yaw: 0.3, r: 1.5, solid: true }); add('gong', 64, -50, { yaw: -2.6, r: 1.5, solid: true });
  for (const z of HAMMER_ROWS) for (const x of [45, 54, 63]) add('dropweight', x, z, { up: 3.6 + ((x + z * 2) % 4) * 0.9, r: 0.36, len: 3 });
  // (Its own light: two fires hung low over the rows, on the weights and the blocks they come down on.)
  add('basket', 49.5, -40, { up: 7.4 }); add('basket', 58.5, -40, { up: 7.4 }); add('daylight', 54, -40, { r: 1.5, pool: false, shaft: false });
  add('rings', STRIKER_PLATE[0], STRIKER_PLATE[1], { r: 2.4 });
  add('stand', 68.4, -40); add('stand', 40.4, -34); add('rack', 54, -52.4, { yaw: PI, h: 2.4, n: 6, board: true });
  add('mark', 54, -27.4, { up: 6.2, r: 1.3, back: 1 });
  add('brazier', 50, -29); add('brazier', 58, -29); add('brazier', 40.6, -50.4);
  // ---- the Pendulum Stair: his plate on stands up it.
  add('stand', -8.8, -70); add('stand', -3.2, -90); add('stand', -8.8, -104);
  // ---- the Pendulum Hall: tall and narrow. The three pendulums, each hung part way through its swing, an iron sill in
  // the floor under each; the escape wheel on the far wall. Fire at the way in and at the far end; the middle is the
  // pendulums' and the hung fires'.
  PENDULUMS.forEach((z, i) => { add('pendulum', -5, z, { up: 2.8, r: 1.8, lean: [-8, 3, 9][i] }); add('sill', -5, z, { hx: 14.6, hz: 0.18 }); });
  add('gear', -12, -145.7, { yaw: 0, r: 4.2, up: 12, spokes: 5 }); add('clockface', -19.7, -124, { yaw: PI / 2, r: 2.4, up: 10, hands: [1.9, 0.2] });
  add('mark', 9.7, -134, { up: 9, r: 1.2, yaw: -PI / 2, back: -1 });
  add('basket', -5, -123, { up: 7 }); add('basket', -5, -133, { up: 7 }); add('daylight', -5, -128, { r: 1.6, pool: false, shaft: false });
  for (const [x, z] of [[-17, -113], [6, -113], [-18, -143.4], [8.4, -143.4]]) add('brazier', x, z);
  // ---- the Escapement: low. The escape wheel and its anchor up the west wall, a lesser wheel lying, the oil, the files;
  // and a wheel stood against the west wall with a man's width of dark behind it.
  add('gear', -60.7, -140, { yaw: PI / 2, r: 3.4, up: 4, spokes: 5 });
  add('gear', -60.3, -130, { yaw: PI / 2 + 0.25, r: 2.2, up: 2.5, out: 0.5 });
  add('gear', -46, -142, { flat: true, r: 2, h: 0.4 }); add('table', -44, -129, { hx: 2.2, hz: 0.7 }); add('tools', -49, -127, { yaw: 0 });
  add('vat', -42.4, -143.6, { r: 0.8 }); add('barrels', -58.4, -144.2); add('brazier', -47, -133.4);
  add('decal', -60.95, -144, { layer: 'p2_rust_streaks', w: 2, h: 4, up: 2.6, yaw: PI / 2 });
  // ---- the Clockmaker's Closet: his own bench, his own small clock, what he kept.
  add('table', -78, -133.6, { hx: 1.6, hz: 0.6 }); add('candles', -78.6, -133.4, { up: 0.85 }); add('clockface', -82.2, -131, { yaw: PI / 2, r: 0.7, up: 2.4, hands: [2.4, 0.9] });
  add('shelf', -74.2, -126.9, { hx: 0.3, hz: 1.2, h: 3 });
  // ---- Behind the Great Dial: the back of the tower's face, lit from outside, the whole of the east wall; a stall to
  // sit and look through it from. No fire but one by the stair: the dial is the light.
  add('clockface', 51.7, -122, { yaw: -PI / 2, r: 5.4, up: 7.4, hands: [2.0, 0.5], lit: true });
  add('daylight', 46, -122, { r: 2.6, pool: false, shaft: false });
  add('gear', 38, -113.3, { yaw: PI, r: 2.6, up: 8 }); add('gear', 40, -130.7, { yaw: 0, r: 2, up: 5 });
  add('carpet', 45, -122, { hx: 4, hz: 2.6, layer: 'dark:cloth_oat' }); add('stall', 40.4, -122, { hx: 2.2, yaw: PI / 2 });
  add('brazier', 38, -128.6); add('crates', 34, -115.5);
  // ---- the Lift Head: the lift in its cage against the far wall on its step, his mark over it, the two winding posts,
  // his bench of half-made clocks, wheels on the walls. Fire by the lift, and at the way in.
  add('lift', -4, -188.6, { r: 2.2, face: PI / 2 });
  add('mark', -4, -190.7, { up: 7.4, r: 1.2, back: 1 });
  for (const [x, z] of WINDING_POSTS) { add('column', x, z, { r: 0.7, solid: true }); add('gear', x, z, { flat: true, r: 1.4, h: 0.2, up: 2.2 }); }
  add('gear', -11.7, -183, { yaw: PI / 2, r: 3.4, up: 7.4, spokes: 5 }); add('gear', 19.7, -172, { yaw: -PI / 2, r: 4, up: 8 });
  add('clockface', 10, -190.7, { yaw: 0, r: 2, up: 8, hands: [1.2, 2.9] });
  add('table', 15, -167, { hx: 2.6, hz: 0.7 }); add('candles', 14, -167, { up: 0.85 }); add('tools', 10.4, -166.2, { yaw: PI });
  for (const [x, z] of [[-9, -187], [1.4, -189], [-3, -167.4], [11, -169.6]]) add('brazier', x, z);
}
const daises = [{ x: -4, z: -187.8, hx: 4, hz: 3, dy: 0.4 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const LANCERS = ['velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'];
const AUTOMATA = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const WRIGHTS = ['kobold_armored_1', 'kobold_armored_2', 'kobold_armored_3', 'kobold_3'];
const WARDENS = ['plague_knight_black', 'plague_knight_red'];
const WINGS = ['harpy_warrior', 'harpy_undead_1', 'harpy_undead_2'];
// (None in the Winders' Door: it's where you wake if you fall.)
const packs = [
  { key: 'cw_shaft', room: 'cw_shaft', pick: AUTOMATA, n: 5, pal: ['Greygold'], at: [0, -2], r: 4 },
  { key: 'cw_train', room: 'cw_train', pick: WRIGHTS, n: 6, elite: ['possessed_knight_3'], pal: ['Greygold', 'Rust'], tough: { hp: 1.2, damage: 1.2 }, at: [3, 3], r: 4 },
  { key: 'cw_pstair', room: 'cw_pstair', pick: KNIGHTS.concat(LANCERS), n: 3, pal: ['Greygold'], at: [0, 0], r: 2 },
  { key: 'cw_esc', room: 'cw_esc', pick: WARDENS.concat(AUTOMATA), n: 5, elite: ['plague_giant_armored'], pal: ['Greygold'], tough: { hp: 1.3, damage: 1.2 }, at: [3, 1], r: 4 },
  { key: 'cw_face', room: 'cw_face', pick: WINGS, n: 4, pal: ['Greygold', 'Ashen'], at: [-3, 0], r: 3 },
  // The winders' round, up and down the Winding Stair.
  { key: 'cw_wstair', room: 'cw_train', pick: AUTOMATA, n: 3, pal: ['Greygold'], at: [-8, -30], r: 1, walk: [[-56, -72], [-56, -96], [-56, -120]] },
];
const bosses = [
  { key: 'striker', room: 'cw_strike', name: 'The Striker', models: ['cw_striker'], pal: ['Greygold'], hp: 128000, damage: 330, reach: 3.8, loot: 8 },
  { key: 'regulator', room: 'cw_pend', name: 'The Regulator', models: ['cw_regulator'], pal: ['Greygold'], hp: 120000, damage: 335, reach: 3.2, loot: 8, at: [3, -2] },
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
  reg_open: 'The Regulator. The three pendulums swing across the hall in turn: keep off the iron sill of the one that is coming. And when he lets the clock run, get into the shadow of the middle pendulum and KEEP PACE with it across the hall and back: the seconds cut whatever is out of it.',
  reg_swing: 'A pendulum comes across! Off its sill.',
  reg_cut: 'The Regulator cuts! Out of the arc.',
  reg_springs: 'Springs fly! Out of their lines.',
  reg_tick: 'He counts the seconds out across the floor! Out of the circles.',
  reg_gears: 'Wheels come off the wall at you! Out of the circles.',
  reg_weights: 'He lets a weight go! Jump the ring as it reaches you.',
  reg_run: "HE LETS THE CLOCK RUN! Into the pendulum's shadow, and keep pace with it!",
  reg_go: 'The clock keeps its own time again.',
  reg_turn: 'The Regulator turns on you! Get behind the tank, or out of his reach, till he lets go.',
  reg_enrage: 'The Regulator is enraged!',
  ckm_shut: "The Lift Head is shut. Its doors open to the Clockmaker's two: the Striker and the Regulator.",
  ckm_open: "The Clockmaker. When he starts to turn back the hour, his winders go to the winding posts: cut them down before the hour's turned, or he's mended. Keep ahead of the long hand as it sweeps. (What you stopped below tells here: the Going Train's wheels stopped, fewer winders come to him; the Escapement jammed, he can't turn the hour back at all.)",
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
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 14, z: -187.6 },
  // At the Clock Tower's foot in the Middle Ward, on its west side, facing west down the ward; locked till the Painted Key's had.
  portal: { x: 11084, z: 75, yaw: -PI / 2, r: 2.2 },
  shutBy: 'key:portraits', shutWord: 'cw_shut',
  // The Clock Tower's own door, back to the Horn Galleries in the Middle Ward; and the lift at the top, up to the High Ward,
  // which wants the Winding Key.
  links: [{ x: 3, z: -12, yaw: -PI / 2, to: 'middleward', n: 2 }, { x: -4, z: -188.6, yaw: 0, to: 'highward', n: 5, shut: 'key:clockworks', word: 'cw_lift_shut' }],
  chests: [
    { id: 'closet', room: 'cw_closet', x: -80.6, z: -127, yaw: PI / 2, loot: 3 },
    { id: 'dial', room: 'cw_face', x: 33.6, z: -129.4, yaw: 0.8, loot: 2 },
    { id: 'train', room: 'cw_train', x: -59.4, z: -52.6, yaw: PI / 2, loot: 2 },
  ],
  vistas: [{ id: 'great_dial', name: 'Behind the Great Dial', room: 'cw_face', x: 46, z: -122, r: 4 }],
  auto: { way: ['cw_door', 'cw_shaft', 'cw_train', 'cw_shaft', 'cw_strike', 'cw_shaft', 'cw_pstair', 'cw_pend', 'cw_face', 'cw_pend', 'cw_esc', 'cw_closet', 'cw_esc', 'cw_pend', 'cw_lift'] },
  shots: [
    ['cw_shaft', 'cw_door', [0, 2, -31], [2, 19, -59]],
    ['cw_strike', 'cw_shaft', [36, 2.4, -40], [62, 3, -44]],
    ['cw_pend', 'cw_pstair', [-6, 14.2, -111], [-4, 15.5, -146]],
    ['cw_face', 'cw_face', [33.5, 14.2, -128.5], [51, 19, -121]],
  ],
  last: 'clockmaker', tough: { hp: 30, damage: 3.3 }, pay: { xp: 82000, gold: 10400 },
  names: { "Velscour's Knights": 'HOUR GUARD', 'Haunted Mannequins': 'WINDER', Kobolds: 'GEARWRIGHT', 'Plague Knights': 'ESCAPEMENT WARDEN', Harpies: 'DIAL-WING', 'Plague Giants': 'THE OILER' },
  look: { fill: [0.16, 0.13, 0.1], wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_greygold', roof: 'dark:stone', flame: 'flame', light: [1, 0.6, 0.28], fire: [1, 0.64, 0.3], every: 15, high: 3, glow: 3.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Clockworks. His clock counts every hour he has left to anyone. Its works go up through the tower.', clear: 'The Clockmaker is dead! His clock has stopped.', wipe: "You fall... and wake inside the Winders' Door." },
};
export const CLOCKWORKS_VARIANTS = {
  cw_striker: { src: 'plague_giant_armored', alt: 'plague_giant_1', height: 4.6, name: 'THE STRIKER' },
  cw_regulator: { src: 'mannequin_3', alt: 'mannequin_1', height: 4.2, name: 'THE REGULATOR' },
  cw_clockmaker: { src: 'necromancer_lord_2', alt: 'necromancer_lord', height: 3.7, name: 'THE CLOCKMAKER' },
  cw_winder: { src: 'mannequin_1', alt: 'mannequin_2', height: 2.0, name: 'WINDER' },
};
