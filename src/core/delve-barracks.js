// The Iron Barracks: the first of Castle Velscour's eight dungeons (docs/PHOBOS.md "Castle Velscour"), dug under the castle
// yard, where his garrison musters, drills and is kept. Three bosses, in the manner of the later delves (their fights:
// src/sim/castle-fights.js), a party at your back if you'll pay for one.
//   The Muster Stair down from the yard, and the Muster Hall at its foot, where the garrison forms its ranks.
//   The Kennels, west: his war-hounds, and the Kennelmaster (66) with them. The trough along the west wall is where a man
//     with the hounds' blood-scent on him washes it off.
//   The Practice Yard, east: the lancers' runs, the harness they drill on, which drills back.
//   The War Room, south, his officers over their maps; and off it the Defaulters' Cells (west), the Quartermaster's Stores
//     (east), where the Quartermaster (67) keeps the powder, and down its south way the Iron Hall.
//   The Iron Hall: the Iron Marshal (70), who drills them all, behind his two (the hall's doors are shut till both are dead).
//
// Where it really is: past the world's north edge in the castle's row, east of the Middle Ward; everything here local to it,
// x east, z south of the way in. Its arch out on the land: in the castle's yard, the barracks' own door on its south side.
//
// His castle, so nothing of Tessariel's in it (README "The two sides"): no bells, no seals of hers, no crosses. No two ways
// out of a room straight across from each other: the corner map draws no cross of his rooms.
import { R } from './delve-lay.js';

const PI = Math.PI;

const rooms = [
  // (From 7 m behind the way in: its door, and where you wake, stood in the rock north of a stair that began at 0.)
  R('ib_stair', 'the Muster Stair', 0, -14, 3.5, 21, 0, 9,   // (its foot 3 m into the Muster Hall: rooms that only touch have a wall between)
    { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 10 }),
  R('ib_muster', 'the Muster Hall', 0, -55, 24, 23, 0, 14, { rock: 'p2_curtain_granite', foot: 'dark:course', ground: 'p2_ward_paving', banners: 16, cloth: 'p2_banner_skull', fires: 14 }),
  R('ib_kennels', 'the Kennels', -62, -50, 18, 16, 0, 9, { rock: 'soot:block', foot: 'dark:rubble', ground: 'p2_straw_ground', banners: 0, fires: 12 }),
  R('ib_yard', 'the Practice Yard', 62, -64, 20, 18, 0, 16, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_ward_paving', fires: 14 }),
  R('ib_war', 'the War Room', 0, -110, 14, 14, 0, 10, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving', banners: 10, cloth: 'p2_banner_skull' }),
  R('ib_cells', "the Defaulters' Cells", -56, -106, 16, 18, 0, 8, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 12 }),
  R('ib_stores', "the Quartermaster's Stores", 56, -114, 20, 18, 0, 12, { rock: 'p2_sooty_plaster', foot: 'course', ground: 'p2_worn_floorboards', banners: 0, fires: 14 }),
  R('ib_iron', 'the Iron Hall', 0, -170, 30, 26, 0, 20, { rock: 'p2_keep_basalt', foot: 'dark:course', ground: 'p2_bone_joint_flags', banners: 20, cloth: 'p2_banner_skull', fires: 14 }),
];

// The ways between them, a man and more wide. (The Muster Hall's west way north of its middle, its east way south of it,
// its south way east of its middle: none across from another. The War Room's the same.)
const tunnels = [
  // (Each run a little into both rooms, so it opens a doorway in each wall.)
  // (Wide: a barracks moves its men through in ranks, and the way to each boss's room is wide enough to be found.)
  { pts: [[-21.5, -47], [-46.5, -47]], w: 6, h: 5 },
  { pts: [[21.5, -64], [44.5, -64]], w: 6, h: 5 },
  { pts: [[8, -75.5], [8, -98.5]], w: 5, h: 5 },
  { pts: [[-11.5, -102], [-42.5, -102]], w: 4, h: 4.4 },
  { pts: [[11.5, -117], [38.5, -117]], w: 6, h: 5 },
  { pts: [[-6, -121.5], [-6, -146.5]], w: 7, h: 6 },
];

// The trough in the Kennels: the Kennelmaster's blood-scent comes off in it (src/sim/castle-fights.js kennelmaster).
export const TROUGH = [-77, -50];
// Where the Iron Standard is set up in the Iron Hall, at the far end from the way in (castle-fights.js ironmarshal).
export const STANDARD_AT = [0, -188];
// The kegs' runs in the Stores: the racks the powder-runners come out from, along the east wall.
export const POWDER_RACKS = [[73, -102], [73, -114], [73, -126]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Muster Stair: his plate on stands each side, fire in baskets.
  for (const z of [-8, -20]) { add('stand', -2.8, z); add('stand', 2.8, z - 4); }
  add('lintel', 0, -1, { hx: 3.5, stone: 'ashlar' });
  // ---- the Muster Hall: the ranks' places marked out on the flags, racks round the walls, his banner over the far end;
  // a dais for whoever's calling the muster.
  for (let x = -16; x <= 16; x += 8) for (const z of [-44, -66]) add('pool', x, z, { r: 0.5, layer: 'dark:rubble', up: 0.02 });
  for (const z of [-40, -56, -70]) { add('rack', -23, z, { yaw: PI / 2, h: 2.4, n: 6 }); add('rack', 23, z + 4, { yaw: -PI / 2, h: 2.4, n: 6 }); }
  add('shields', -12, -77.4, { yaw: PI }); add('shields', 16, -77.4, { yaw: PI });
  for (const [x, z] of [[-14, -55], [14, -55]]) add('column', x, z, { r: 1.3, solid: true });
  add('mark', 0, -77.6, { up: 9, r: 1.8, back: -1 });
  add('brazier', -8, -36); add('brazier', 8, -74);
  // ---- the Kennels: pens down both long walls (cages), straw, bones gnawed, the trough along the west wall, the
  // master's chains hung from the beams.
  for (const z of [-40, -50, -60]) { add('cage', -52, z, { up: 0 }); add('cage', -72, z + 5, { up: 0 }); }
  add('pool', TROUGH[0], TROUGH[1], { r: 1.4, up: 0.35, layer: 'mire:water' }); add('vat', TROUGH[0], TROUGH[1] - 2.6, { r: 0.6 });
  add('bones', -62, -46, { r: 1.2 }); add('bones', -58, -58, { r: 1 }); add('heap', -66, -38, { r: 1.2, layer: 'p2_straw_ground' });
  for (const [x, z] of [[-62, -42], [-62, -58]]) add('chain', x, z, { up: 6 });
  add('decal', -60, -52, { layer: 'p2_blood_splashes', w: 2.2, flat: true });
  // ---- the Practice Yard: the lancers' runs (posts down them), harness stood up to be struck, sand underfoot.
  for (const x of [50, 62, 74]) { add('stand', x, -52); add('stand', x, -76); }
  add('pool', 62, -64, { r: 9, layer: 'rubble', up: 0.02 }); add('pool', 62, -64, { r: 7.4, layer: 'flags', up: 0.03 });
  add('rack', 81, -58, { yaw: -PI / 2 }); add('rack', 81, -70, { yaw: -PI / 2 }); add('shields', 62, -81.4, { yaw: PI });
  // ---- the War Room: the table of the castle's maps, candles on it, his officers' chairs, a brazier each end.
  // (East of the room's middle: the middle is where what's sent in to the room stands.)
  add('table', 6.5, -110, { hx: 4, hz: 1.6, solid: true }); add('candles', 4.5, -110, { up: 0.85 }); add('candles', 8.9, -109.6, { up: 0.85 });
  for (const x of [3.5, 6.5, 9.5]) { add('seat', x, -106.6, { hx: 0.5, hz: 0.5, stone: 'dark:wood' }); add('seat', x, -113.4, { hx: 0.5, hz: 0.5, stone: 'dark:wood', flip: true }); }
  add('brazier', -10, -110); add('brazier', 12.6, -106); add('mark', 0, -123.6, { up: 5, r: 1.1, back: -1 });
  // ---- the Defaulters' Cells: cages, chains, the punishment post, straw and what's left in it.
  for (const [x, z] of [[-66, -94], [-66, -106], [-66, -118], [-46, -118]]) { add('cage', x, z, { up: 0 }); add('chain', x, z, { up: 4 }); }
  add('bones', -54, -112, { r: 1.3 }); add('decal', -50, -100, { layer: 'p2_blood_splashes', w: 1.8, flat: true });
  add('decal', -71.95, -110, { layer: 'p2_gouges', w: 2.4, up: 0.6, yaw: PI / 2 });
  // ---- the Quartermaster's Stores: racks of powder kegs along the east wall, the counter, crates and barrels in rows.
  for (const [x, z] of POWDER_RACKS) { add('barrels', x, z); add('barrels', x - 2, z + 2); }
  add('counter', 44, -114, { hx: 0.5, hz: 4 });
  for (const [x, z] of [[50, -100], [62, -100], [50, -128], [62, -128]]) add('crates', x, z);
  add('cart', 56, -120, { yaw: 0.3 }); add('decal', 60, -112, { layer: 'p2_scorch_mark', w: 2.4, flat: true });
  // ---- the Iron Hall: columns down both sides, his banners on them; the Marshal's dais at the far end, his standard's
  // socket in it; braziers on tall stands.
  for (const z of [-152, -170, -188]) { add('column', -20, z, { r: 1.6, solid: true }); add('column', 20, z, { r: 1.6, solid: true }); }
  for (const [x, z] of [[-12, -150], [12, -150], [-12, -190], [12, -190]]) add('brazier', x, z);
  add('mark', 0, -195.6, { up: 12, r: 2.6, back: -1 });
  add('shields', -29.4, -160, { yaw: PI / 2 }); add('shields', 29.4, -180, { yaw: -PI / 2 });
}
const daises = [{ x: 0, z: -190, hx: 9, hz: 4, dy: 0.5 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const LANCERS = ['velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'];
const HARNESS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const OFFICERS = ['necromancer_2', 'necromancer_3'];
const DEFAULTERS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const packs = [
  { key: 'ib_stairguard', room: 'ib_stair', pick: KNIGHTS, n: 3, pal: ['Oxblood'], at: [0, -4], r: 2 },
  { key: 'ib_rank_w', room: 'ib_muster', pick: KNIGHTS, n: 5, pal: ['Oxblood'], tough: { hp: 1.3, damage: 1.2 }, at: [-10, 6], r: 4 },
  { key: 'ib_rank_e', room: 'ib_muster', pick: KNIGHTS.concat(LANCERS), n: 5, pal: ['Oxblood', 'Sable'], at: [12, -10], r: 4 },
  { key: 'ib_drill', room: 'ib_yard', pick: LANCERS.concat(HARNESS), n: 6, elite: ['velscour_lancer_3'], pal: ['Oxblood'], tough: { hp: 1.4, damage: 1.3 }, at: [0, 0], r: 6 },
  { key: 'ib_officers', room: 'ib_war', pick: OFFICERS.concat(KNIGHTS), n: 4, elite: ['necromancer_lord'], pal: ['Oxblood', 'Sable'], ai: 'caster', at: [0, 4], r: 4 },
  { key: 'ib_defaulters', room: 'ib_cells', pick: DEFAULTERS, n: 6, pal: ['Ashen', 'Bone-white'], at: [0, 0], r: 5 },
];
const bosses = [
  { key: 'kennelmaster', room: 'ib_kennels', name: 'The Kennelmaster', models: ['ib_kennelmaster'], pal: ['Rust'], hp: 52000, damage: 200, reach: 3.2, loot: 8 },
  { key: 'quartermaster', room: 'ib_stores', name: 'The Quartermaster', models: ['ib_quartermaster'], pal: ['Rust'], hp: 58000, damage: 210, reach: 3.8, loot: 8 },
  { key: 'ironmarshal', room: 'ib_iron', name: 'The Iron Marshal', models: ['ib_marshal'], pal: ['Oxblood'], hp: 74000, damage: 215, reach: 3.8, loot: 0, needs: ['kennelmaster', 'quartermaster'], shut: 'irm_shut' },
];
const warnings = {
  ken_open: 'The Kennelmaster. He lets his hounds go in packs, and his whip sends them mad: bring them down fast. When he marks you with blood-scent, the hounds want only you: wash it off in the trough by the west wall.',
  ken_lash: 'The Kennelmaster cracks his lash! Out of the arc.',
  ken_chain: 'He swings his chain down the line! Out of it.',
  ken_net: 'He throws a net! Out of the circle before it lands.',
  ken_howl: 'He howls with them! Jump the rings.',
  ken_scent: 'YOU ARE MARKED WITH BLOOD-SCENT! The hounds want only you: get to the trough by the west wall and wash it off!',
  ken_washed: 'The scent is washed off. The hounds lose you.',
  ken_hounds: 'He lets the hounds go! Bring them down.',
  ken_whip: 'He cracks the whip over his hounds: every one still standing goes mad! Kill them before the next crack.',
  ken_turn: 'The Kennelmaster turns on you! Get behind the tank, or out of his reach, till he lets go.',
  ken_enrage: 'The Kennelmaster is enraged!',
  qm_open: 'The Quartermaster. His powder-runners bring him kegs out of the racks on the east wall: every one that reaches him, he throws. Cut them down on the way.',
  qm_cleave: 'The Quartermaster swings! Out of the arc.',
  qm_racks: 'He pulls the racks down! Out of the lanes.',
  qm_shot: 'Grapeshot! Out of the circles.',
  qm_quake: 'He brings his maul down! Jump the ring as it reaches you.',
  qm_fuse: 'He lights a fuse and rolls it! Out of its line.',
  qm_runners: 'Powder-runners out of the racks! Cut them down before they reach him.',
  qm_keg: 'A runner got through: he hurls the keg! Jump the blast as it reaches you.',
  qm_turn: 'The Quartermaster turns on you! Get behind the tank, or out of his reach, till he lets go.',
  qm_enrage: 'The Quartermaster is enraged!',
  irm_shut: "The Iron Hall is shut. Its doors open to the Marshal's two: the Kennelmaster and the Quartermaster.",
  irm_open: 'The Iron Marshal. He drills his ranks across the hall: keep out of their lines. At the turn of the fight he sets up the Iron Standard: while it stands he mends, and calls men to it. Everyone but whoever holds him: to the standard, and cut it down.',
  irm_ranks: 'His ranks march across the hall! Out of their lines.',
  irm_cleave: 'The Marshal sweeps his blade! Out of the arc.',
  irm_charge: 'The Marshal charges! Out of the line.',
  irm_lances: 'Lances down three lines! Out of them.',
  irm_quake: 'He drives his blade into the floor! Jump the ring.',
  irm_standard: 'THE IRON STANDARD IS SET UP! While it stands he mends and calls men: everyone but his tank, to it, and cut it down!',
  irm_called: 'Men come to the standard!',
  irm_fallen: 'The Iron Standard falls! He mends no more.',
  irm_last: 'THE IRON MARSHAL MAKES HIS LAST STAND! Everything he has, at once.',
  irm_turn: 'The Iron Marshal turns on you! Get behind the tank, or out of his reach, till he lets go.',
  irm_enrage: 'The Iron Marshal is enraged!',
};

export const IRON_BARRACKS = {
  key: 'ironbarracks', tag: 'ib', name: 'Castle Velscour: the Iron Barracks', short: 'the Iron Barracks', x: 11620, z: -5700, y: -60, level: 64, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { kennelmaster: 'ken_turn', quartermaster: 'qm_turn', ironmarshal: 'irm_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 0, z: -192.4 },
  // In the castle's yard, on its south side: the barracks' own door, its back to the yard's south wall, facing north
  // (src/core/phobos-build.js phobosCastle YARD).
  portal: { x: 10872, z: -56, yaw: 0, r: 2.2 },
  links: [],
  last: 'ironmarshal', tough: { hp: 20, damage: 2.4 }, pay: { xp: 52000, gold: 7400 },
  names: { "Velscour's Knights": 'BARRACKS KNIGHT', 'Haunted Mannequins': 'DRILL HARNESS', Necromancers: 'STAFF OFFICER', 'The Possessed': 'DEFAULTER', Werewolf: 'WAR-HOUND' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_skull', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.4, 0.16], fire: [1, 0.44, 0.18], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Iron Barracks. His garrison musters down here, and is kept.', clear: 'The Iron Marshal is dead! The Iron Barracks are broken.', wipe: 'You fall... and wake at the foot of the Muster Stair.' },
};
