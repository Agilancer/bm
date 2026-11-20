// Castle Velscour, inside (docs/PHOBOS-LAYOUT.md "Castle Velscour"): twenty-four wings in three wards, each ward a delve of
// its own, as the sewers' sectors are (src/core/delve-sewers.js). The Lower Ward first, the working castle: eight wings.
//   The Gatehouse: the Gate Passage, and the Captain's Yard behind it, where the Gate Captain holds the gate (68: too much
//     for anyone come up to the castle at 58, who goes round him by the servants' ways, or comes up the Aqueduct).
//   The Kitchens: the Great Hearth, and the Cellars under the yard's west side.
//   The Servants' Warren: the Servants' Hall, and the narrow ways from it behind six wings (the Gatehouse, the Kitchens,
//     the Barracks, the Armoury, the Forge and the Oubliettes): how the household goes about the castle unseen.
//   The Barracks: the Drill Floor, the Bunk Rooms.
//   The Armoury, up its stair off the Drill Floor.
//   The Forge, along the Coal Way from the Armoury: where the idol is cast, at the end.
//   The Oubliettes, down the Pit Stair from the yard.
//   The Aqueduct, down from the Kitchens to its Head: the back way in from the Sunk Garden, the princess's court at the
//     far end of the High Conduits (its gate's other side: src/core/delve-sewers.js HIGH_CONDUITS links).
// And up the Middle Ward Stair off the East Range, the Middle Ward Gate: up into the Middle Ward, once the Gate Captain's
// dead (his yard holds the gate's winch: links' shut, src/sim/dungeon.js open).
//
// Gone in alone or not (party: false), as the sewers are. Where it really is: past the world's north edge in the sewers'
// row, east of them; everything here is local to it: x east, z south of the way in, y over its height.
//
// His castle, so nothing of Tessariel's is in it (README "The two sides"): no bells, no seals of hers, no gilt sun, no
// crosses. His red on the walls.
import { R } from './delve-lay.js';

const PI = Math.PI;
const channel = (add, a, b, w = 1.3) => add('channel', a[0], a[1], { to: b, w });

// (Every way off the yard and the Gate Passage comes off it at a different place, none across from another: the corner map
// draws no cross of his rooms. The West Range north of the yard's middle, the East Range south of it, the Pit Stair west of
// the gate's line; the Gate Passage's two servants' doors far apart along it.)
const rooms = [
  // The Gatehouse.
  R('cl_gate', 'the Gate Passage', 0, -12, 5, 20, 0, 11, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 16 }),
  R('cl_yard', "the Captain's Yard", 0, -50, 22, 22, 0, 22, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_ward_paving', banners: 22, cloth: 'p2_banner_skull', hang: 0, fires: 14 }),
  R('cl_wrange', 'the West Range', -48, -40, 30, 4, 0, 8, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_walk_paving' }),
  R('cl_erange', 'the East Range', 49, -62, 31, 4, 0, 8, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_walk_paving' }),
  // The Kitchens, and their cellars.
  R('cl_kitchen', 'the Kitchens', -96, -50, 22, 18, 0, 14, { rock: 'p2_sooty_plaster', foot: 'soot:block', ground: 'flags' }),
  R('cl_cellar', 'the Cellars', -96, -21, 14, 15, 0, 6, { rock: 'course', foot: 'block', ground: 'flags', banners: 0 }),
  // The Barracks.
  R('cl_drill', 'the Drill Floor', 106, -50, 30, 22, 0, 16, { rock: 'p2_curtain_granite', foot: 'dark:course', ground: 'p2_ward_paving' }),
  R('cl_bunks', 'the Bunk Rooms', 106, -15, 22, 17, 0, 6, { rock: 'p2_sooty_plaster', foot: 'course', ground: 'p2_worn_floorboards', banners: 0 }),
  // The Armoury, and the Coal Way to the Forge.
  R('cl_armstair', 'the Armoury Stair', 106, -82, 3, 16, 0, 7, { rock: 'dark:block' }),
  R('cl_armoury', 'the Armoury', 106, -114, 18, 20, 0, 12, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving' }),
  R('cl_coal', 'the Coal Way', 137, -114, 17, 3, 0, 7, { rock: 'soot:block', foot: 'dark:rubble', ground: 'p2_ash_street' }),
  R('cl_forge', 'the Forge', 166, -114, 16, 14, 0, 12, { rock: 'p2_fireback', foot: 'soot:block', ground: 'p2_ash_street', banners: 0, fires: 18 }),
  // The Oubliettes.
  R('cl_pit', 'the Pit Stair', -8, -94, 4, 26, -5, 9, { tz: 10 / 52, fires: 10, rock: 'dark:course' }),
  R('cl_oub', 'the Oubliettes', 0, -140, 20, 24, -10, 9, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 28 }),
  // The Aqueduct.
  R('cl_aq', 'the Aqueduct', -100, -108, 4, 44, -3, 9, { tz: 3 / 44, fires: 12, rock: 'slate:course', foot: 'slate:block' }),
  R('cl_aqhead', 'the Aqueduct Head', -100, -170, 14, 22, -6, 14, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0 }),
  // The Servants' Warren's one great room.
  R('cl_hall', "the Servants' Hall", -48, -104, 14, 12, -2, 7, { rock: 'p2_sooty_plaster', foot: 'block', ground: 'p2_worn_floorboards', banners: 0, fires: 18 }),
  // Up to the Middle Ward.
  R('cl_mstair', 'the Middle Ward Stair', 49, -96, 5, 35, 6, 12, { tz: -12 / 70, fires: 12, rock: 'p2_curtain_granite', foot: 'dark:block' }),
  R('cl_mgate', 'the Middle Ward Gate', 49, -141, 8, 14, 12, 12, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags' }),
];

// (fires: how many metres apart a room's wall torches stand; 10 if not said.)
// The Servants' Warren: its ways are a man's width and a little over his height, behind the walls of six wings. (The two
// off the Gate Passage a little wider: the household's patrols walk them.)
const W = 1.7, H = 3.2;
const tunnels = [
  // From a door far up the Gate Passage's west wall round under the yard's south side to the Cellars.
  { pts: [[-4, -18], [-70, -18], [-70, -14], [-86, -14]], w: 2.3, h: H },
  // From a door by the way in, in the Gate Passage's east wall, to the Bunk Rooms.
  { pts: [[4, 4], [60, 4], [60, -4], [88, -4]], w: 2.3, h: H },
  // From the Kitchens' back door up behind the Aqueduct to the Servants' Hall.
  { pts: [[-80, -64], [-80, -104], [-58, -104]], w: W, h: H },
  // The gaolers' way, from the hall down behind the Pit Stair to the Oubliettes.
  { pts: [[-38, -112], [-26, -112], [-26, -150], [-16, -150]], w: W, h: H },
  // From the hall to a door in the West Range: a servant's door the garrison walks past.
  { pts: [[-48, -94], [-48, -42]], w: W, h: H },
  // Behind the Armoury and the Forge.
  { pts: [[100, -130], [100, -146], [172, -146], [172, -124]], w: W, h: H },
  // The doors in the yard's south wall, either side of the gate: where the garrison comes down off the walls.
  { pts: [[-14, -30], [-14, -25]], w: 2, h: 4, dead: true, door: 'cl_yard' },
  { pts: [[14, -30], [14, -25]], w: 2, h: 4, dead: true, door: 'cl_yard' },
];

// The three slots in the yard's roof the gate's teeth hang in, right across it (the Gate Captain drops them: src/sim/castle-fights.js).
export const GATE_SLOTS = [-38, -50, -62];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Gate Passage: the inner portcullis wound up, racks of spears, the watch's barrels, a fire at each servants' door.
  add('portcullis', 0, -27, { w: 4.6, h: 9, raised: 6.2 });
  add('rack', -4.2, -8, { yaw: PI / 2 }); add('rack', 4.2, -16, { yaw: -PI / 2 });
  add('barrels', -3.4, 6.4); add('crates', 3.6, -22);
  add('lintel', 0, -2, { hx: 5, stone: 'ashlar' });
  add('brazier', -3.6, -15.4); add('brazier', 3.6, 1.4);
  // ---- the Captain's Yard: a wall-walk round three sides for the crossbows, fire baskets on its merlons, its piers in the
  // corners; the gate's teeth hung in their slots over it, an iron sill on the flags under each; his mark over the gate;
  // his chair and table at the north end; armour on stands along the walls, a cart of the gate's stores. (Nothing hung
  // from its roof: the dark up there is the sky's. No runner down its middle: it's a yard, and the sills would cross it.)
  add('walk', -20.75, -50, { hx: 1.25, hz: 22, up: 9.5, side: 1 }); add('walk', 20.75, -50, { hx: 1.25, hz: 22, up: 9.5, side: -1 });
  add('walk', 0, -70.75, { hx: 22, hz: 1.25, up: 9.5, side: 1 });
  for (const [x, z] of [[-18, -32], [18, -32], [-18, -69], [18, -69]]) add('column', x, z, { r: 1.4, solid: true });
  for (let u = -18; u <= 18; u += 9) { add('basket', -19.5, -50 + u, { up: 10.6 }); add('basket', 19.5, -50 + u, { up: 10.6 }); }
  for (const x of [-13, 0, 13]) add('basket', x, -69.5, { up: 10.6 });
  for (const z of GATE_SLOTS) { add('portcullis', 0, z, { w: 21.4, h: 21, raised: 14 }); add('sill', 0, z, { hx: 21.6 }); }
  add('mark', 0, -28.4, { up: 12, r: 2.2, back: 1 });
  // (Off to the east of the way out, which opens behind them once he's dead.)
  add('seat', 6, -66.4, { hx: 1.1, hz: 0.9, stone: 'dark:stone', flip: true }); add('table', 6, -62.4, { hx: 2.4, hz: 0.9, solid: true });
  add('mark', 6, -66.65, { up: 2, r: 0.55, back: -1 });
  add('candles', 4.6, -62.6, { up: 0.85 }); add('candles', 7.6, -62.3, { up: 0.85 });
  add('stand', -20.6, -52); add('stand', -20.6, -64); add('rack', -20.8, -58, { yaw: PI / 2 });
  add('stand', 20.6, -34); add('stand', 20.6, -46); add('rack', 20.8, -40, { yaw: -PI / 2 });
  add('cart', 15, -50, { yaw: 0.4 }); add('crates', 17.5, -54); add('barrels', 8, -31);
  add('pool', -8, -58, { r: 1.6, up: 0.04 }); add('heap', 12.5, -68, { r: 1, layer: 'dark:rubble' });
  // (Old blood on the flags, where men have been put down before you. The PH2 pack's decals: src/core/delve-build.js decal.)
  add('decal', -6, -44, { layer: 'p2_blood_splashes', w: 2, flat: true }); add('decal', 10, -61, { layer: 'p2_blood_splashes', w: 1.5, flat: true, yaw: 1.2 });
  // ---- the ranges: armour along them, a bench, the odd crate; a fire at the servants' door in the West Range.
  add('stand', -30, -36.6); add('stand', -62, -36.6); add('crates', -40, -43); add('barrels', -70, -43); add('brazier', -45.4, -42.4);
  add('stand', 32, -58.6); add('stand', 64, -58.6); add('crates', 68, -65.2); add('rack', 40, -58.4, { yaw: PI });
  // ---- the Kitchens: the Great Hearth in the west wall, spits before it, the long tables, the vat of tallow, the stores.
  add('hearth', -117.4, -50, { yaw: PI / 2, great: 1.5 });
  add('spit', -110, -44); add('spit', -110, -56);
  add('table', -96, -42, { hx: 0.7, hz: 6 }); add('table', -86, -42, { hx: 0.7, hz: 6 }); add('table', -96, -58, { hx: 0.7, hz: 6 });
  add('vat', -84, -62, { r: 1.1 }); add('barrels', -116, -34); add('barrels', -78, -35); add('crates', -114, -66);
  add('counter', -78, -50, { hx: 0.5, hz: 3 }); add('chain', -102, -50, { up: 4 });
  add('chandelier', -96, -50, { up: 8 }); add('brazier', -76.6, -66);
  // (The Great Hearth's soot up the wall over it.)
  add('decal', -117.95, -50, { layer: 'p2_soot_streaks', w: 6, h: 5, up: 8.8, yaw: PI / 2 });
  // ---- the Cellars: casks in rows, posts holding the yard up.
  for (const [x, z] of [[-106, -10], [-100, -10], [-94, -10], [-88, -10], [-106, -30], [-88, -30]]) add('barrels', x, z);
  add('crates', -108, -20); add('crates', -100, -33);
  add('column', -96, -15, { r: 0.5, wood: true, solid: true }); add('column', -96, -27, { r: 0.5, wood: true, solid: true });
  // (Webs in the top corners: each painting's web is in its top right, so each sits with that end in a corner.)
  add('decal', -83.05, -35.95, { layer: 'p2_cobweb', w: 2, up: 3.95 }); add('decal', -108.95, -6.05, { layer: 'p2_cobweb', w: 2, up: 3.95, yaw: PI });
  // ---- the Drill Floor: the floor kept clear, armour on stands for the drill, racks and shields round the walls.
  for (const x of [88, 100, 112, 124]) { add('stand', x, -36); add('stand', x, -64); }
  add('rack', 76.8, -40, { yaw: PI / 2 }); add('rack', 76.8, -60, { yaw: PI / 2 }); add('rack', 135.2, -50, { yaw: -PI / 2 });
  add('shields', 106, -71.6, { yaw: PI }); add('shields', 106, -28.6, { yaw: 0 });
  // (The drill ring, sanded: a plain ring of grit on the flags.)
  add('pool', 106, -50, { r: 8, layer: 'rubble', up: 0.02 }); add('pool', 106, -50, { r: 6.6, layer: 'flags', up: 0.03 });
  for (const [x, z] of [[84, -50], [128, -50]]) add('column', x, z, { r: 1.3, solid: true });
  // ---- the Bunk Rooms.
  for (const x of [92, 100, 108, 116, 124]) { add('bunk', x, -8, { hx: 1.1, hz: 0.5, cloth: 'cloth_red' }); add('bunk', x, -24, { hx: 1.1, hz: 0.5, cloth: x % 16 ? 'cloth_oat' : 'cloth_red' }); }
  add('table', 108, -15, { hx: 4, hz: 0.7 }); add('crates', 126, -14); add('barrels', 86, -26);
  // ---- the Armoury: tall racks full of spears in rows, his plate on stands between them, shields along the walls, the
  // armourer's anvil and bench, braziers down the middle.
  for (const z of [-102, -114, -126]) { add('rack', 96, z, { yaw: 0, h: 2.6, n: 8, board: true }); add('rack', 116, z, { yaw: 0, h: 2.6, n: 8, board: true }); add('stand', 106, z); }
  for (const z of [-108, -120, -131]) add('brazier', 106, z);
  add('shields', 88.6, -110, { yaw: PI / 2 }); add('shields', 123.4, -118, { yaw: -PI / 2 });
  add('anvil', 92, -130); add('tools', 95, -131.5, { yaw: 0 }); add('table', 118, -130, { hx: 2, hz: 0.7 }); add('crates', 90, -97);
  // ---- the Coal Way: coal heaped along it, a barrow.
  add('heap', 130, -116, { r: 1.3, layer: 'dark:rubble' }); add('heap', 144, -112, { r: 1.1, layer: 'dark:rubble' }); add('cart', 138, -115, { yaw: PI / 2 });
  // ---- the Forge: two great hearths in the east wall, the anvils before them; the casting pit in the floor's middle, a
  // chain over it for the crucible; the slag vats, the quenching barrels, coal.
  add('hearth', 181.4, -106, { yaw: -PI / 2, great: 1.4 }); add('hearth', 181.4, -122, { yaw: -PI / 2, great: 1.4 });
  add('anvil', 172, -106); add('anvil', 172, -122);
  add('castpit', 160, -114, { r: 2.2, solid: true }); add('chain', 160, -114, { up: 4 });
  add('vat', 156, -103, { r: 1.2 }); add('vat', 156, -125, { r: 1.2 });
  add('barrels', 166, -102); add('barrels', 166, -126.5); add('tools', 175, -110.5, { yaw: PI }); add('tools', 175, -118, { yaw: PI });
  add('heap', 153.5, -104, { r: 1.4, layer: 'dark:rubble' }); add('heap', 153.5, -124, { r: 1.2, layer: 'dark:rubble' });
  add('brazier', 156, -109); add('brazier', 156, -119);
  add('decal', 167, -108.5, { layer: 'p2_scorch_mark', w: 2.4, flat: true }); add('decal', 168, -120, { layer: 'p2_scorch_mark', w: 1.8, flat: true, yaw: 2 });
  // ---- the Pit Stair and the Oubliettes: cages hung over the pits, the pits themselves, what's left of who was put down
  // them; the gaolers' cots and their table.
  for (const [x, z] of [[-10, -128], [10, -128], [-10, -148], [10, -148]]) { add('pit', x, z, { r: 2 }); add('cage', x, z, { up: 2.2 }); }
  add('bones', 0, -138, { r: 1.6 }); add('bones', -15, -158, { r: 1.2 }); add('chain', 0, -152, { up: 3 });
  // (And in the far wall, between the last two pits, the Crypt door: black glass in a frame of dark stone, his mark over it.)
  add('lintel', 4, -163, { hx: 2.6, stone: 'dark:ashlar' }); add('mark', 4, -163.6, { up: 6, r: 0.7, back: -1 }); add('brazier', 8.6, -161.6);
  add('cot', 16, -156); add('cot', 16, -122); add('table', 15, -139, { hx: 0.7, hz: 2 }); add('candles', 15, -139.6, { up: 0.85 });
  // (The days they counted, scratched in the wall; and blood.)
  add('decal', -19.95, -131, { layer: 'p2_gouges', w: 2.4, up: 0.6, yaw: PI / 2 }); add('decal', -19.95, -151, { layer: 'p2_gouges', w: 2.4, up: 0.6, yaw: PI / 2 });
  add('decal', 5, -136, { layer: 'p2_blood_splashes', w: 2, flat: true }); add('decal', -6, -156, { layer: 'p2_blood_splashes', w: 1.6, flat: true, yaw: 0.7 });
  add('decal', -35.05, -115.95, { layer: 'p2_cobweb', w: 1.8, up: 5.1 });
  // ---- the Aqueduct: the water down its middle, from its head to the Kitchens' cistern.
  channel(add, [-100, -150], [-100, -68]);
  // ---- the Aqueduct Head: where the castle's water comes in, its sluices, its piers.
  // (The spout off to the east of the gate, its water into the pool and away down the Aqueduct: not on the gate.)
  add('spout', -90, -191, { up: 9, w: 2, layer: 'lake' }); add('pool', -90, -182, { r: 4.5, up: 0.03, layer: 'pale:lake' }); channel(add, [-90, -177], [-100, -152], 1.1);
  for (const [x, z] of [[-110, -160], [-90, -160], [-110, -178]]) add('column', x, z, { r: 1.3, solid: true });
  add('sluicegate', -100, -153, { yaw: 0, w: 2.6 });
  add('crates', -111, -150); add('barrels', -91, -150);
  // ---- the Servants' Hall: their table, their bunks, their coats, their candles.
  add('table', -48, -104, { hx: 0.7, hz: 6 });
  for (const z of [-96, -102, -108, -114]) add('bunk', -60, z, { hx: 1.1, hz: 0.5, cloth: z % 12 ? 'cloth_oat' : 'cloth_red' });
  add('coatrail', -36, -100, { hx: 2, yaw: PI / 2 }); add('barrels', -38, -113); add('crates', -60, -93.5);
  add('candles', -48, -100, { up: 0.85 }); add('candles', -48, -108, { up: 0.85 });
  // ---- the Middle Ward Gate: its arch up to the Middle Ward (shut till the Gate Captain's dead: his winch), his mark over
  // it, its portcullis wound up into the head; two stands of his plate either side.
  add('portcullis', 49, -153.4, { w: 4.6, h: 12, raised: 9.2, plain: true }); add('mark', 49, -154.6, { up: 9.2, r: 0.7, back: -1 });
  add('stand', 41.6, -146); add('stand', 56.4, -146);
}

const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const LANCERS = ['velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'];
const WARDENS = ['plague_knight_black', 'plague_knight_red'];
const SCULLIONS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const TURNSPITS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
const HARNESS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const FORGOTTEN = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
// (None in the Gate Passage: it's where you wake if you fall, and nobody wakes into a fight.)
const packs = [
  { key: 'cl_wrange', room: 'cl_wrange', pick: WARDENS, n: 3, pal: ['Rust', 'Oxblood'], at: [-6, 0], r: 2.5 },
  { key: 'cl_kitchen', room: 'cl_kitchen', pick: SCULLIONS.concat(TURNSPITS), n: 4, pal: ['Ashen', 'Oxblood'], at: [6, 0], r: 5 },
  { key: 'cl_cellar', room: 'cl_cellar', pick: TURNSPITS, n: 4, pal: ['Ashen'], at: [0, 2], r: 3 },
  { key: 'cl_erange', room: 'cl_erange', pick: KNIGHTS, n: 3, pal: ['Oxblood'], at: [10, 0], r: 2.5 },
  { key: 'cl_drill', room: 'cl_drill', pick: KNIGHTS.concat(LANCERS), n: 4, elite: ['velscour_lancer_3'], pal: ['Oxblood'], at: [6, 0], r: 6 },
  { key: 'cl_bunks', room: 'cl_bunks', pick: KNIGHTS, n: 4, pal: ['Oxblood', 'Sable'], at: [0, 0], r: 4 },
  { key: 'cl_armoury', room: 'cl_armoury', pick: HARNESS, n: 5, elite: ['possessed_knight_3'], pal: ['Sable', 'Oxblood'], at: [0, -2], r: 5 },
  { key: 'cl_forge', room: 'cl_forge', pick: ['night_demon_red', 'night_demon_black'], n: 4, elite: ['plague_giant_armored'], pal: ['Emberhide'], at: [4, 6], r: 4 },
  { key: 'cl_pit', room: 'cl_pit', pick: WARDENS, n: 3, pal: ['Rust'], at: [0, 6], r: 2.5 },
  { key: 'cl_oub', room: 'cl_oub', pick: FORGOTTEN, n: 6, elite: ['plague_giant_1'], pal: ['Bone-white', 'Ashen'], at: [0, -6], r: 6 },
  { key: 'cl_hall', room: 'cl_hall', pick: SCULLIONS, n: 4, pal: ['Ashen'], at: [4, 0], r: 4 },
  { key: 'cl_aq', room: 'cl_aq', pick: WARDENS.concat(KNIGHTS), n: 4, pal: ['Rust', 'Oxblood'], at: [0, -6], r: 2.5 },
  { key: 'cl_aqhead', room: 'cl_aqhead', pick: KNIGHTS, n: 4, elite: ['velscour_lancer_2'], pal: ['Oxblood'], at: [0, 2], r: 5 },
  { key: 'cl_mstair', room: 'cl_mstair', pick: KNIGHTS.concat(LANCERS), n: 3, pal: ['Oxblood'], at: [0, -10], r: 2.5 },
  // The household's patrols, up and down the servants' ways off the Gate Passage: two scullions west, two of the garrison east.
  { key: 'cl_wway', room: 'cl_cellar', pick: SCULLIONS, n: 2, pal: ['Ashen'], at: [10, 7], r: 1, walk: [[-70, -16], [-40, -18], [-12, -18]] },
  { key: 'cl_eway', room: 'cl_bunks', pick: KNIGHTS, n: 2, pal: ['Oxblood'], at: [-18, 11], r: 1, walk: [[60, 0], [34, 4], [12, 4]] },
];
const bosses = [
  { key: 'gatecaptain', room: 'cl_yard', name: 'The Gate Captain', models: ['cl_captain'], pal: ['Oxblood'], hp: 62000, damage: 230, reach: 3.4, loot: 8 },
];
const warnings = {
  gcp_open: "The Gate Captain. While his garrison stands with him, their shields cover him: bring them down first. When he drops the gate's teeth, don't be under their slots. (Not ready for him? The servants' doors in the Gate Passage go round.)",
  gcp_less_men: 'His Bunk Rooms are empty: fewer of his garrison come down to him.',
  gcp_less_bows: 'His Armoury is empty: no crossbows on his walls.',
  gcp_less_gate: 'His Gaoler is dead: nobody winds the gate.',
  gcp_cleave: 'The Captain sweeps his blade! Out of the arc.',
  gcp_charge: 'The Captain charges! Out of the line.',
  gcp_bash: 'He drives his shield into the flags! Jump the ring as it reaches you.',
  gcp_gate: "The gate's teeth come down across the yard! Out from under their slots.",
  gcp_volley: 'Crossbows on the walls! Out of the circles.',
  gcp_garrison: 'The garrison comes down off the walls! While they stand, their shields cover him.',
  gcp_bare: 'The garrison is down: the Captain stands alone!',
  gcp_turn: 'The Gate Captain turns on you! Out of his reach.',
  gcp_enrage: 'The Gate Captain is enraged!',
  cl_mgate_shut: "The Middle Ward Gate is down. Its winch is in the Gate Captain's yard, and nobody turns it while he holds his yard.",
  cl_crypt_shut: "A door of black glass at the bottom of the pits, with no handle. The alchemists made its key, and keep it under their wing.",
};
export const LOWER_WARD = {
  key: 'lowerward', tag: 'cl', name: 'Castle Velscour: the Lower Ward', short: 'the Lower Ward', x: 10760, z: -5700, y: -60, level: 58, style: 'castle',
  party: false, castle: true,
  rooms, tunnels, props, packs, bosses, warnings,
  turnWarn: { gatecaptain: 'gcp_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 0, z: -70.4 },
  // In the castle's yard, just inside the gate: the Gatehouse's inner door, its back to the north drum's yard face, facing
  // east up the yard (src/core/phobos-build.js phobosCastle: the drum's at the gate's x, 22 north, 13 round).
  portal: { x: 10805, z: 22, yaw: PI / 2, r: 2.2 },
  // The Aqueduct Head's gate: down to the Sunk Garden in the High Conduits (and the Aqueduct Foot off it, its other side).
  // And the Middle Ward Gate's arch, up into the Middle Ward: shut till the Gate Captain has died, now or ever.
  // And the Crypt door at the bottom of the Oubliettes: up the dead generals' stair into the High Ward's Crypt, once the
  // Alchemists' Undercroft's Glass Key is had (src/core/castle-keys.js; src/core/delve-highward.js).
  links: [{ x: -100, z: -187.4, yaw: 0, to: 'highconduits', n: 1 }, { x: 49, z: -150.4, yaw: 0, to: 'middleward', n: 0, shut: 'gatecaptain', word: 'cl_mgate_shut' },
    { x: 4, z: -161.4, yaw: 0, to: 'highward', n: 1, shut: 'key:undercroft', word: 'cl_crypt_shut' }],
  chests: [
    { id: 'cellar', room: 'cl_cellar', x: -108.4, z: -27, yaw: PI / 2, loot: 2 },
    { id: 'armoury', room: 'cl_armoury', x: 121.6, z: -131, yaw: -PI / 2, loot: 3 },
    { id: 'oubliette', room: 'cl_oub', x: -17.6, z: -124, yaw: PI / 2, loot: 3 },
    { id: 'aqhead', room: 'cl_aqhead', x: -111.6, z: -186, yaw: PI / 2, loot: 2 },
  ],
  vistas: [{ id: 'aqueduct_head', name: 'the Aqueduct Head', room: 'cl_aqhead', x: -100, z: -176, r: 5 }],
  last: 'gatecaptain', tough: { hp: 22, damage: 2.5 }, pay: { xp: 36000, gold: 5200 },
  names: { "Velscour's Knights": 'GARRISON KNIGHT', 'Plague Knights': 'GATE WARDEN', 'The Possessed': 'SCULLION', Kobolds: 'TURNSPIT', 'Haunted Mannequins': 'EMPTY HARNESS', 'Night Paralysis Demons': 'FORGE-WRAITH', 'Dead Children': 'THE FORGOTTEN', 'Plague Giants': 'GAOLER' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_skull', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.4, 0.16], fire: [1, 0.44, 0.18], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "Castle Velscour: the Lower Ward. His garrison holds the gate; the servants' ways run behind the walls.", clear: 'The Gate Captain is dead! The gate is yours.', wipe: 'You fall... and wake in the Gate Passage.' },
};

// ======== the Middle Ward ====================================================================================================
// Up the Middle Ward Stair from the Lower Ward and through its gate, once the Gate Captain's dead: the castle where his court
// lives (docs/PHOBOS-LAYOUT.md, 75 to 95). Its own delve, gone into only from the Lower Ward (within: it has no arch of its own
// out on the land; its portal is the Lower Ward's, the castle's gate, where its Postern lets you out).
//   The Middle Gate, the arch back down to the Lower Ward at its foot, and the Postern in its east wall: out to the castle's gate.
//   The Middle Court: his court's yard, a wall-walk round two sides, a dead tree in the middle of it.
//   The Great Hall, through the Screens Passage off the court's west side: the long tables, the high table on its dais at the
//     far end, and the Feast That Walks at it (88). Its north door, behind the high table, lets you out once he's dead.
//   The Portrait Gallery, north off the court: his house's faces down both walls, and a painting that's a door (on no map:
//     to the Alchemists' Wing). The Map Room off it, east; the Horn Galleries up from that, and at their far end the Clock
//     Tower's door: shut (the Gallery of a Thousand Portraits' key, chunk 9).
//   The Ancient Library at the Gallery's head: the Librarian's home, his rooms off its east side (a rest point: nothing of his
//     comes in here), the Long Stacks past it, and in the Stacks' far wall the Sanctuaries Stair: shut (the Drowned Archive's
//     key: up to the High Ward). The Horn Walk from it east to the Horn Galleries.
//   The Alchemists' Wing, down the Reading Walk west of the Library: the still room. The Conservatory past it, glass over it
//     and nothing alive under it, and in its far wall the Menagerie's door: shut (the Iron Barracks' key).
// Liveries (docs/PHOBOS-LAYOUT.md): royal blue (Abyssal) in the Gallery, the Library's Stacks and the Map Room; forest green
// (Mossback) in the Alchemists' Wing and the Conservatory; his red elsewhere; the Great Hall mixed, red and white. Never blue
// beside grey with gold.
// (No two ways off a room straight across it from each other: the corner map draws no cross of his rooms.)
const mRooms = [
  R('cm_gate', 'the Middle Gate', 0, -12, 8, 20, 0, 11, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 16 }),
  R('cm_court', 'the Middle Court', 0, -50, 24, 22, 0, 24, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_ward_paving', banners: 0, hang: 0, fires: 11 }),
  R('cm_screens', 'the Screens Passage', -37, -58, 17, 3, 0, 8, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0 }),
  R('cm_hall', 'the Great Hall', -76, -58, 26, 14, 0, 18, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 13, cloth: 'p2_banner_skull', fires: 13 }),
  R('cm_gallery', 'the Portrait Gallery', 12, -101, 4.5, 33, 0, 10, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 9 }),
  R('cm_maps', 'the Map Room', 54, -96, 11, 9, 0, 9, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 8, cloth: 'royal:cloth_red' }),
  R('cm_horns', 'the Horn Galleries', 64, -142, 6, 28, 0, 18, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 10 }),
  R('cm_library', 'the Ancient Library', 6, -154, 22, 24, 0, 16, { rock: 'p2_book_spines', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 14, cloth: 'royal:cloth_red', fires: 20 }),
  R('cm_stacks', 'the Long Stacks', 6, -184, 18, 10, 0, 9, { rock: 'p2_book_spines', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 11, cloth: 'royal:cloth_red' }),
  R('cm_rooms', "the Librarian's Rooms", 44, -162, 9, 8, 0, 6.5, { rock: 'p2_sooty_plaster', foot: 'block', ground: 'p2_worn_floorboards', banners: 0, fires: 14 }),
  R('cm_still', "the Alchemists' Wing", -44, -120, 12, 10, 0, 9, { rock: 'p2_jar_shelves', foot: 'soot:block', ground: 'flags', banners: 10, cloth: 'forest:cloth_red' }),
  R('cm_conserv', 'the Conservatory', -58, -168, 14, 14, 0, 14, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_ash_clay_ground', banners: 12, cloth: 'forest:cloth_red' }),
];
const mTunnels = [
  // The Map Room's door off the Gallery, and the way on up from it to the Horn Galleries.
  { pts: [[15, -92], [45, -92]], w: 2.2, h: 5 },
  { pts: [[60, -103], [60, -116]], w: 2.2, h: 5 },
  // The Horn Walk: from the Library's east side to the Horn Galleries, the household's way round.
  { pts: [[26, -144], [60, -144]], w: 2, h: 4.5 },
  // The Librarian's own door, off the Library's east side.
  { pts: [[26, -166], [37, -166]], w: 1.5, h: 3.4 },
  // The Reading Walk, from the Library's west side round to the Alchemists' Wing; and on from that to the Conservatory.
  { pts: [[-14, -138], [-36, -138], [-36, -128]], w: 2, h: 4.5 },
  { pts: [[-50, -128], [-50, -156]], w: 2.2, h: 5 },
  // The painting door: behind a portrait in the Gallery's west wall, a servant's way through to the Alchemists' Wing. On no map.
  { pts: [[9, -116], [-34, -116]], w: 1.3, h: 3 },
  // The doors his servers come through into the Great Hall: either side of the screens, in its east wall.
  { pts: [[-52, -48], [-46, -48]], w: 1.6, h: 3.4, dead: true, door: 'cm_hall' },
  { pts: [[-52, -68], [-46, -68]], w: 1.6, h: 3.4, dead: true, door: 'cm_hall' },
];
// The high table's dais, at the Great Hall's far end.
const mDaises = [{ x: -93, z: -56, hx: 6, hz: 9, dy: 0.5 }];
// The two long tables down the Great Hall, and the aisle between: the Feast heaves the tables down their rows, or sweeps the
// aisle (src/sim/castle-fights.js). [z of the north row, of the aisle, of the south row]
export const HALL_ROWS = [-65, -58, -51];

const mProps = [];
{
  const add = (kind, x, z, o = {}) => mProps.push({ kind, x, z, ...o });
  // ---- the Middle Gate: his mark over the arch down, the inner portcullis wound up at the court's end, racks, a fire.
  add('mark', 0, 7.6, { up: 7.4, r: 0.8, back: 1 });
  add('portcullis', 0, -30, { w: 7.6, h: 10.5, raised: 7.4, plain: true });
  add('rack', -7.2, -10, { yaw: PI / 2 }); add('rack', -7.2, -20, { yaw: PI / 2 }); add('barrels', -6, -26);
  add('brazier', -5.4, -4); add('brazier', 2, -25.4);
  add('decal', 7.95, -4, { layer: 'p2_rust_streaks', w: 2.4, h: 4, up: 4, yaw: -PI / 2 });
  // ---- the Middle Court: a wall-walk up its east and north walls, fire baskets on them, piers in the corners; a dead tree
  // in a planter in its middle; his plate on stands, a cart of the hall's stores by the screens.
  add('walk', 22.75, -50, { hx: 1.25, hz: 22, up: 10.5, side: -1 }); add('walk', 0, -70.75, { hx: 24, hz: 1.25, up: 10.5, side: 1 });
  for (let u = -18; u <= 18; u += 9) add('basket', 21.5, -50 + u, { up: 11.6 });
  for (const x of [-16, -2, 22]) add('basket', x, -69.5, { up: 11.6 });
  for (const [x, z] of [[-20, -32], [20, -32], [-20, -68], [20, -68]]) add('column', x, z, { r: 1.4, solid: true, shaft: 'p2_curtain_granite', square: true });
  // (The tree twice a man's reach across, four fires round its planter so it stands black against them.)
  add('deadtree', -6, -48, { h: 12, r: 2.8, solid: true });
  for (const [x, z] of [[-6, -42.4], [-6, -53.6], [-11.6, -48], [-0.4, -48]]) add('brazier', x, z);
  // (Open to the sky over its middle, the noon coming down into the yard: daylight.)
  add('daylight', 4, -54, { r: 9, pool: false });
  add('mark', 12, -71.6, { up: 10.6, r: 0.9, back: -1 });
  add('stand', 22.6, -36); add('stand', 22.6, -64); add('rack', 22.8, -50, { yaw: -PI / 2 });
  add('cart', -16, -44, { yaw: 0.6 }); add('crates', -19, -38); add('barrels', 14, -34);
  add('brazier', 10, -44); add('brazier', 8, -62);
  add('decal', 8, -58, { layer: 'p2_blood_splashes', w: 2, flat: true, yaw: 0.4 });
  // ---- the Screens Passage: the buttery hatch, the hall's stores, the screen's posts at the hall end.
  add('counter', -34, -60.3, { hx: 2.4, hz: 0.4 }); add('barrels', -26, -56.8); add('crates', -44, -56.4); add('barrels', -40, -57);
  add('lintel', -51, -58, { hz: 3, stone: 'wood' });
  // ---- the Great Hall: the high table on its dais, his chair behind it facing down the hall, his mark on the wall over it;
  // two long tables and their benches, what's left of the feast on them; a great hearth in each long wall; chandeliers; the
  // hunt in tapestry. (The north door, behind the high table, opens once he's dead: exitOut.)
  add('table', -90, -56, { hx: 0.7, hz: 5, cloth: 'blood:cloth_red' }); add('seat', -94, -56, { hx: 1.1, hz: 0.9, yaw: PI / 2, stone: 'dark:stone' });
  // (The far end lit: a chandelier over the high table, a brazier either side of his chair, so the dais is the room's end.)
  add('chandelier', -90, -56, { up: 6.5, hang: true }); add('brazier', -95.5, -50.5); add('brazier', -95.5, -61.5);
  // (The aisle between the long tables, a runner of his red down it: where the tables' heave doesn't come.)
  add('carpet', -70, HALL_ROWS[1], { hx: 17, hz: 1.2, layer: 'blood:cloth_red' });
  add('candles', -89.8, -59.5, { up: 0.85 }); add('candles', -90.2, -52.5, { up: 0.85 });
  add('mark', -101.5, -56, { up: 6.4, r: 1.6, yaw: PI / 2, back: -1 });
  for (const z of [HALL_ROWS[0], HALL_ROWS[2]]) {
    add('table', -70, z, { hx: 11, hz: 0.7, cloth: 'blood:cloth_red' });
    add('bench', -70, z - 1.3, { hx: 10, hz: 0.2 }); add('bench', -70, z + 1.3, { hx: 10, hz: 0.2 });
    add('bones', -76, z, { r: 0.7 }); add('candles', -64, z, { up: 0.85 }); add('candles', -78, z + 0.2, { up: 0.85 });
  }
  add('hearth', -76, -44.6, { yaw: PI, great: 1.2, bed: false }); add('hearth', -62, -71.4, { yaw: 0, great: 1.2, bed: false });
  add('chandelier', -78, -58, { up: 9, hang: true }); add('chandelier', -62, -58, { up: 9, hang: true });
  add('decal', -92, -44.05, { layer: 'p2_tapestry_hunt', w: 6, h: 4, up: 5.5, yaw: PI }); add('decal', -86, -71.95, { layer: 'p2_tapestry_hunt', w: 6, h: 4, up: 5.5, yaw: 0 });
  add('spit', -56, -62); add('barrels', -56, -50.5); add('heap', -98, -66, { r: 1, layer: 'dark:rubble' });
  add('decal', -70, -58, { layer: 'p2_blood_splashes', w: 2.6, flat: true, yaw: 1.1 });
  // ---- the Portrait Gallery: his house's faces down both walls, two rows; a runner; his plate between; and the painting
  // that's a door, swung open from the wall.
  // (Each sitter in a livery of his: his red, the wing's royal blue, black, the white with skulls; frames of dark iron.)
  const SITS = ['cloth_red', 'royal:cloth_red', 'dark:cloth_oat', 'pale:cloth_oat', 'blood:cloth_red'];
  let n = 0;
  for (let z = -74; z >= -128; z -= 4.5) {
    const sz = 0.85 + 0.35 * ((n * 7) % 3) / 2;
    if (Math.abs(z - -92) > 3) add('portrait', 16.45, z, { yaw: -PI / 2, sitter: SITS[n % 5], sz, turn: n % 3 - 1 });
    if (Math.abs(z - -116) > 3) add('portrait', 7.55, z, { yaw: PI / 2, sitter: SITS[(n + 2) % 5], sz: 1.85 - sz, turn: (n + 1) % 3 - 1 });
    if (n % 2 === 0) { add('portrait', 16.45, z - 2.2, { yaw: -PI / 2, up: 3.2, sitter: SITS[(n + 1) % 5], sz: 0.8 }); add('portrait', 7.55, z - 2.2, { yaw: PI / 2, up: 3.2, sitter: SITS[(n + 3) % 5], sz: 0.8 }); }
    n++;
  }
  // The painting that's a door: bigger than its neighbours, swung out from the wall on its hinge, its swing scored in the boards.
  add('portrait', 8.9, -114.5, { yaw: PI / 2 + 1.0, sitter: 'blood:cloth_red', sz: 1.3 });
  add('decal', 8.6, -116, { layer: 'p2_gouges', w: 1.8, h: 1.2, flat: true, yaw: 0.6 });
  add('carpet', 12, -101, { hx: 1.3, hz: 30, layer: 'royal:cloth_red' });
  // (The empty frame in the east wall, taller than a door: the Thousand Portraits' way out.)
  add('portrait', 16.45, -124.2, { yaw: -PI / 2, sitter: 'char:stone', sz: 1.7 });
  add('stand', 8.6, -80); add('stand', 15.4, -104); add('stand', 8.6, -126);
  add('decal', 16.4, -69.05, { layer: 'p2_cobweb', w: 1.6, up: 8.3 });
  // ---- the Map Room: the great table, the castle on it; chests of maps against the walls; a lectern; two of the charts
  // pinned up (no letters).
  add('maptable', 54, -96, { hx: 4.2, hz: 2.6 });
  add('bookcase', 64.5, -96, { hx: 0.4, hz: 3, h: 3.2, one: -1 }); add('bookcase', 43.5, -101, { hx: 0.4, hz: 2.4, h: 3.2, one: 1 });
  add('carpet', 54, -96, { hx: 7, hz: 5, layer: 'royal:cloth_red' });
  add('lectern', 48, -88.6); add('chandelier', 54, -96, { up: 5.4, hang: true });
  add('decal', 54, -104.95, { layer: 'p2_hessian', w: 3.2, h: 2.2, up: 2, yaw: 0 }); add('decal', 62, -87.05, { layer: 'p2_hessian', w: 2.4, h: 1.8, up: 2.2, yaw: PI });
  // ---- the Horn Galleries: great horns on their brackets down both walls at two heights; a wall-walk up the east side; at the
  // far end, the Clock Tower's door, shut.
  for (let z = -120; z >= -162; z -= 7) {
    const hi = ((-z / 7) | 0) % 2 ? 9 : 5;
    add('horn', 58.1, z, { yaw: PI / 2, up: hi, s: 0.85 }); add('horn', 69.9, z - 3.5, { yaw: -PI / 2, up: 14 - hi, s: 0.85 });
  }
  add('walk', 68.75, -142, { hx: 1.25, hz: 26, up: 8, side: -1 });
  add('portcullis', 64, -169.4, { w: 2.6, h: 6.4, plain: true }); add('lintel', 64, -168.6, { hx: 3.6, stone: 'dark:ashlar' });
  add('mark', 64, -169.7, { up: 7.2, r: 0.7, back: -1 });
  add('brazier', 60, -124); add('brazier', 67, -160);
  // ---- the Ancient Library: his books up every wall to the roof; cases standing out from the walls; reading tables and
  // lecterns down the middle; light from an oculus high over it. (No packs in here: the household's.)
  // (Bays: cases out from the west wall and the east, a way down the middle from the Gallery to the Stacks.)
  for (const z of [-146, -154, -162, -170]) add('bookcase', -9.5, z, { hx: 5.5, hz: 0.45, h: 5 });
  for (const z of [-150, -158]) add('bookcase', 24.6, z, { hx: 3.4, hz: 0.45, h: 5 });
  add('table', 12, -146, { hx: 0.7, hz: 3, cloth: 'royal:cloth_oat' }); add('candles', 12, -147, { up: 0.85 }); add('candles', 12, -144.6, { up: 0.85 });
  add('table', 12, -170, { hx: 0.7, hz: 3, cloth: 'royal:cloth_oat' }); add('candles', 12, -169, { up: 0.85 }); add('candles', 12, -171.4, { up: 0.85 });
  // (The oculus high over the middle of it, its cold daylight down onto the reading tables: the room's landmark.)
  add('daylight', 12, -158, { r: 2.4 });
  add('bench', 10.6, -146, { hx: 0.2, hz: 2.6 }); add('bench', 13.4, -170, { hx: 0.2, hz: 2.6 });
  add('lectern', 5, -158); add('lectern', 19, -158);
  for (const z of [-146, -170]) add('chandelier', 12, z, { up: 6, hang: true });
  add('decal', 27.95, -133.05, { layer: 'p2_cobweb', w: 2, up: 13.9, yaw: PI });
  // ---- the Long Stacks: cases in rows, a way down the middle to the Sanctuaries Stair's door in the far wall, shut.
  for (const x of [-8, -3, 2, 21]) add('bookcase', x, -185, { hx: 0.45, hz: 4.5, h: 4.5 });
  add('chandelier', 12, -184, { up: 5, hang: true });
  add('portcullis', 12, -193.4, { w: 2.4, h: 6, plain: true }); add('lintel', 12, -192.6, { hx: 3.4, stone: 'dark:ashlar' });
  add('mark', 12, -193.7, { up: 6.8, r: 0.6, back: -1 });
  add('decal', -11.95, -193.95, { layer: 'p2_cobweb', w: 1.8, up: 6.9, yaw: PI / 2 }); add('decal', 23.95, -174.05, { layer: 'p2_cobweb', w: 1.8, up: 6.9, yaw: PI });
  // ---- the Librarian's Rooms: his desk, five beds (his, and his four's), a hearth, their coats, their stores; books.
  add('table', 40, -159, { hx: 2.2, hz: 0.8 }); add('candles', 39, -159, { up: 0.85 }); add('bench', 40, -157.4, { hx: 1.4, hz: 0.2 });
  for (const x of [37, 40, 43, 46, 49]) add('bunk', x, -168.3, { hx: 0.55, hz: 1.1, cloth: x === 43 ? 'cloth_red' : 'cloth_oat' });
  add('hearth', 52.4, -160, { yaw: -PI / 2 });
  // (The barrels moved along: the case in the east wall's south corner swings, and behind it is the way down.)
  add('coatrail', 48, -155.2, { hx: 2 }); add('barrels', 50.5, -156.4); add('crates', 36.5, -155.5);
  add('bookcase', 52.5, -165.6, { hx: 0.4, hz: 1.6, h: 3, one: -1, yaw: 0.5 });
  add('bookcase', 35.5, -162, { hx: 0.4, hz: 2.2, h: 3, one: 1 });
  add('carpet', 44, -162, { hx: 3.5, hz: 2.5, layer: 'cloth_oat' });
  // ---- the Alchemists' Wing: two stills, a working circle in the floor, the bench of their glass, a vat; their shelves of jars
  // up every wall.
  add('alembic', -50, -114, { yaw: PI / 2 }); add('alembic', -38, -126, { yaw: -PI / 2 });
  add('circle', -44, -120, { r: 3 }); add('carpet', -44, -120, { hx: 6, hz: 5, layer: 'forest:cloth_red' }); add('table', -54, -124, { hx: 0.7, hz: 3 }); add('candles', -54, -123, { up: 0.85 });
  add('barrels', -36, -112); add('barrels', -55, -111); add('crates', -33.5, -128);
  add('jarshelf', -44, -110.3, { yaw: PI, w: 4 }); add('jarshelf', -55.7, -118, { yaw: PI / 2, w: 3 }); add('jarshelf', -32.3, -120, { yaw: -PI / 2, w: 3 });
  add('decal', -45, -117, { layer: 'p2_scorch_mark', w: 1.6, flat: true });
  // ---- the Conservatory: glass over it, dead trees in planters, roots down the walls, black water in a basin; and in its far
  // wall the Menagerie's door, shut.
  add('daylight', -58, -168, { r: 4.5, pool: false }); add('pool', -58, -161, { r: 3, up: 0.03, layer: 'pale:stone' });
  for (const [x, z, h] of [[-66, -160, 8], [-50, -160, 7], [-66, -176, 7.5], [-50, -177, 9]]) add('deadtree', x, z, { h, r: 1.8, solid: true });
  add('carpet', -58, -175, { hx: 5, hz: 1.6, layer: 'forest:cloth_red' });
  add('pit', -58, -168, { r: 2 }); add('brazier', -58, -158); add('brazier', -58, -178);
  add('roots', -70, -158, { r: 2 }); add('roots', -46, -180, { r: 1.8 });
  add('heap', -70, -180, { r: 1.2, layer: 'dark:rubble' }); add('heap', -45, -157, { r: 0.9, layer: 'dark:rubble' });
  add('portcullis', -62, -181.4, { w: 2.6, h: 6.2, plain: true }); add('lintel', -62, -180.6, { hx: 3.6, stone: 'dark:ashlar' });
  add('mark', -62, -181.7, { up: 7, r: 0.7, back: -1 });
}

const SITTERS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const ARCHIVISTS = ['necromancer_f1', 'necromancer_f2', 'necromancer_2', 'necromancer_3'];
const HORNWINGS = ['harpy_warrior', 'harpy_undead_1', 'harpy_undead_2'];
const LIVERY = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
// (None in the Middle Gate, where you wake if you fall; none in the Library or the Librarian's Rooms, the household's; and
// the Great Hall is the Feast's.)
const mPacks = [
  { key: 'cm_court', room: 'cm_court', pick: KNIGHTS.concat(LANCERS), n: 4, elite: ['possessed_knight_3'], pal: ['Oxblood'], at: [8, -6], r: 6 },
  { key: 'cm_screens', room: 'cm_screens', pick: LIVERY, n: 3, pal: ['Oxblood', 'Sable'], at: [4, 0], r: 2.5 },
  { key: 'cm_gallery', room: 'cm_gallery', pick: SITTERS, n: 4, pal: ['Abyssal'], at: [0, 8], r: 2.5 },
  { key: 'cm_maps', room: 'cm_maps', pick: ['night_demon_blue', 'night_demon_black'], n: 2, pal: ['Abyssal'], at: [-4, 4], r: 3 },
  { key: 'cm_horns', room: 'cm_horns', pick: HORNWINGS, n: 4, pal: ['Oxblood'], at: [0, 4], r: 3 },
  { key: 'cm_stacks', room: 'cm_stacks', pick: ARCHIVISTS, n: 4, elite: ['necromancer_lord'], pal: ['Abyssal'], at: [6, 0], r: 5 },
  { key: 'cm_still', room: 'cm_still', pick: WARDENS, n: 3, pal: ['Mossback'], at: [4, 0], r: 4 },
  { key: 'cm_conserv', room: 'cm_conserv', pick: ['spider_black', 'spider_red'], n: 5, elite: ['flesh_spider_demon'], pal: ['Mossback'], at: [0, 4], r: 6 },
  // The household's way round, the Horn Walk, walked by two of his knights in blue.
  { key: 'cm_hway', room: 'cm_horns', pick: KNIGHTS, n: 2, pal: ['Abyssal'], at: [-2, 2], r: 1, walk: [[56, -144], [40, -144], [28, -144]] },
];
const mBosses = [
  { key: 'feast', room: 'cm_hall', name: 'The Feast That Walks', models: ['cm_feast'], pal: ['Oxblood'], hp: 96000, damage: 300, reach: 4.2, loot: 8 },
];
const mWarnings = {
  fea_open: 'The Feast That Walks. His servers bring him his courses through the doors by the screens: every one that reaches him feeds him. Cut them down on the way. When he heaves the tables, get into the aisle; when he sweeps the aisle, get in among the benches.',
  fea_courses: 'The servers come in with the courses! Down them before they reach him.',
  fea_fed: 'A course reaches him: he eats, and grows.',
  fea_tables: 'He heaves the long tables down the hall! Into the aisle.',
  fea_aisle: 'He sweeps the aisle with the high table! In among the benches.',
  fea_gorge: 'He gapes! Out of the arc.',
  fea_belly: 'He drops his belly on the flags! Jump the ring as it reaches you.',
  fea_plates: 'He throws the plate! Out of the circles.',
  fea_bile: 'He brings it back up! Out of the pools.',
  fea_turn: 'The Feast That Walks turns on you! Out of his reach.',
  fea_enrage: 'The Feast That Walks is enraged!',
  cm_sanct_shut: 'The Sanctuaries Stair is locked: green bronze, and wet. Its key went down with the Drowned Archive.',
  cm_clock_shut: "The Clock Tower's door is locked. Its key is painted into a picture somewhere in the Gallery of a Thousand Portraits.",
  cm_menag_shut: "The Menagerie's door is barred with black iron. The Iron Marshal carries its key.",
  cm_frame_shut: 'An empty frame taller than a door, and nothing behind its canvas but wall. From this side.',
  cm_trap_shut: 'A trapdoor in the boards, bolted from below.',
};
export const MIDDLE_WARD = {
  key: 'middleward', tag: 'cm', name: 'Castle Velscour: the Middle Ward', short: 'the Middle Ward', x: 11180, z: -5700, y: -60, level: 75, style: 'castle',
  party: false, castle: true,
  // (Gone into only from the Lower Ward, by the Middle Ward Gate: no arch of its own out on the land. Its portal is the
  // Lower Ward's, the castle's gate: where its Postern and its north door let you out, and where the map points.)
  within: 'lowerward',
  rooms: mRooms, tunnels: mTunnels, daises: mDaises, props: mProps, packs: mPacks, bosses: mBosses, warnings: mWarnings,
  turnWarn: { feast: 'fea_turn' },
  entry: { x: 0, z: -1.5, yaw: PI }, exitIn: { x: 5.4, z: -14, yaw: -PI / 2 }, exitOut: { x: -88, z: -67.4, yaw: 0 },
  portal: LOWER_WARD.portal,
  // The arch at the Middle Gate's foot: back down to the Lower Ward's Middle Ward Gate.
  // And its keyed doors, each a gate (docs/PHOBOS-CASTLE.md; the keys: src/core/castle-keys.js): the Sanctuaries Stair in the
  // Long Stacks, up to the High Ward; the Clock Tower's door at the end of the Horn Galleries; the Menagerie's in the
  // Conservatory. The bookcase in the Librarian's Rooms that's the way down to the Deep Stacks and his Holdout. And two
  // ways barred from their far sides: a frame in the Portrait Gallery the Thousand Portraits let out by, and a trapdoor
  // in the Alchemists' Wing up from their Undercroft.
  links: [{ x: 0, z: 3.4, yaw: PI, to: 'lowerward', n: 1 },
    { x: 12, z: -191.2, yaw: 0, to: 'highward', n: 0, shut: 'key:archive', word: 'cm_sanct_shut' },
    { x: 64, z: -167.2, yaw: 0, to: 'clockworks', n: 0, shut: 'key:portraits', word: 'cm_clock_shut' },
    { x: -62, z: -179.2, yaw: 0, to: 'menagerie', n: 0, shut: 'key:barracks', word: 'cm_menag_shut' },
    { x: 51.4, z: -165.6, yaw: -PI / 2, to: 'deepstacks', n: 0 },
    { x: 15.3, z: -124.2, yaw: -PI / 2, to: 'thousandportraits', n: 0, shut: 'latch:frame', word: 'cm_frame_shut' },
    { x: -48, z: -128.4, yaw: 0, to: 'undercroft', n: 0, shut: 'latch:trapdoor', word: 'cm_trap_shut' }],
  chests: [
    { id: 'maps', room: 'cm_maps', x: 63.4, z: -103, yaw: -PI / 2, loot: 3 },
    { id: 'horns', room: 'cm_horns', x: 59.4, z: -166, yaw: PI / 2, loot: 3 },
    { id: 'conservatory', room: 'cm_conserv', x: -70.4, z: -170, yaw: PI / 2, loot: 3 },
    { id: 'stacks', room: 'cm_stacks', x: -10.4, z: -191, yaw: PI / 2, loot: 2 },
  ],
  vistas: [{ id: 'ancient_library', name: 'the Ancient Library', room: 'cm_library', x: 12, z: -158, r: 5 }, { id: 'horn_walk', name: 'the Horn Galleries', room: 'cm_horns', x: 64, z: -150, r: 5 }],
  last: 'feast', tough: { hp: 27, damage: 2.9 }, pay: { xp: 54000, gold: 7400 },
  names: { "Velscour's Knights": 'COURT KNIGHT', 'Haunted Mannequins': 'EMPTY LIVERY', 'The Possessed': 'SITTER', 'Night Paralysis Demons': 'INKSHADE', Harpies: 'HORNWING', Necromancers: 'ARCHIVIST', 'Plague Knights': 'STILLWARDEN', 'Giant Spiders': 'THORN SPIDER' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_skull', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.46, 0.2], fire: [1, 0.5, 0.22], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "Castle Velscour: the Middle Ward. His court's: the Great Hall, the Gallery, the Library.", clear: 'The Feast That Walks is dead! His hall is quiet.', wipe: 'You fall... and wake in the Middle Gate.' },
};

export const CASTLE = [LOWER_WARD, MIDDLE_WARD];
