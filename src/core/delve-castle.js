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
// And up the Middle Ward Stair off the East Range, the Middle Ward Gate: shut, for now.
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
  R('cl_gate', 'the Gate Passage', 0, -12, 5, 20, 0, 11, { rock: 'ashlar', foot: 'dark:block', ground: 'dark:flags', fires: 16 }),
  R('cl_yard', "the Captain's Yard", 0, -50, 22, 22, 0, 22, { rock: 'ashlar', foot: 'dark:block', ground: 'ashlar', banners: 11, hang: 0, fires: 14 }),
  R('cl_wrange', 'the West Range', -48, -40, 30, 4, 0, 8, { rock: 'ashlar', foot: 'dark:block' }),
  R('cl_erange', 'the East Range', 49, -62, 31, 4, 0, 8, { rock: 'ashlar', foot: 'dark:block' }),
  // The Kitchens, and their cellars.
  R('cl_kitchen', 'the Kitchens', -96, -50, 22, 18, 0, 14, { rock: 'soot:course', foot: 'soot:block', ground: 'flags' }),
  R('cl_cellar', 'the Cellars', -96, -21, 14, 15, 0, 6, { rock: 'course', foot: 'block', ground: 'flags', banners: 0 }),
  // The Barracks.
  R('cl_drill', 'the Drill Floor', 106, -50, 30, 22, 0, 16, { rock: 'block', foot: 'dark:course', ground: 'ashlar' }),
  R('cl_bunks', 'the Bunk Rooms', 106, -15, 22, 17, 0, 6, { rock: 'block', foot: 'course', ground: 'wood', banners: 0 }),
  // The Armoury, and the Coal Way to the Forge.
  R('cl_armstair', 'the Armoury Stair', 106, -82, 3, 16, 0, 7, { rock: 'dark:block' }),
  R('cl_armoury', 'the Armoury', 106, -114, 18, 20, 0, 12, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'dark:flags' }),
  R('cl_coal', 'the Coal Way', 137, -114, 17, 3, 0, 7, { rock: 'soot:block', foot: 'dark:rubble', ground: 'dark:rubble' }),
  R('cl_forge', 'the Forge', 166, -114, 16, 14, 0, 12, { rock: 'soot:ashlar', foot: 'soot:block', ground: 'flags', banners: 0, fires: 18 }),
  // The Oubliettes.
  R('cl_pit', 'the Pit Stair', -8, -94, 4, 26, -5, 9, { tz: 10 / 52, fires: 10, rock: 'dark:course' }),
  R('cl_oub', 'the Oubliettes', 0, -140, 20, 24, -10, 9, { rock: 'mire:course', foot: 'mire:block', ground: 'mire:flags', banners: 0, fires: 28 }),
  // The Aqueduct.
  R('cl_aq', 'the Aqueduct', -100, -108, 4, 44, -3, 9, { tz: 3 / 44, fires: 12, rock: 'slate:course', foot: 'slate:block' }),
  R('cl_aqhead', 'the Aqueduct Head', -100, -170, 14, 22, -6, 14, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'slate:flags', banners: 0 }),
  // The Servants' Warren's one great room.
  R('cl_hall', "the Servants' Hall", -48, -104, 14, 12, -2, 7, { rock: 'course', foot: 'block', ground: 'wood', banners: 0, fires: 18 }),
  // Up to the Middle Ward.
  R('cl_mstair', 'the Middle Ward Stair', 49, -96, 5, 35, 6, 12, { tz: -12 / 70, fires: 12, rock: 'ashlar', foot: 'dark:block' }),
  R('cl_mgate', 'the Middle Ward Gate', 49, -141, 8, 14, 12, 12, { rock: 'soot:ashlar', foot: 'dark:block', ground: 'dark:flags' }),
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
  // ---- the Cellars: casks in rows, posts holding the yard up.
  for (const [x, z] of [[-106, -10], [-100, -10], [-94, -10], [-88, -10], [-106, -30], [-88, -30]]) add('barrels', x, z);
  add('crates', -108, -20); add('crates', -100, -33);
  add('column', -96, -15, { r: 0.5, wood: true, solid: true }); add('column', -96, -27, { r: 0.5, wood: true, solid: true });
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
  // ---- the Pit Stair and the Oubliettes: cages hung over the pits, the pits themselves, what's left of who was put down
  // them; the gaolers' cots and their table.
  for (const [x, z] of [[-10, -128], [10, -128], [-10, -148], [10, -148]]) { add('pit', x, z, { r: 2 }); add('cage', x, z, { up: 2.2 }); }
  add('bones', 0, -138, { r: 1.6 }); add('bones', -15, -158, { r: 1.2 }); add('chain', 0, -152, { up: 3 });
  add('cot', 16, -156); add('cot', 16, -122); add('table', 15, -139, { hx: 0.7, hz: 2 }); add('candles', 15, -139.6, { up: 0.85 });
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
  // ---- the Middle Ward Gate: shut, its portcullis down, his mark over it; two stands of his plate either side.
  add('portcullis', 49, -153.4, { w: 4.6, h: 9 }); add('mark', 49, -154.6, { up: 9.2, r: 0.7, back: -1 });
  add('stand', 42.6, -147); add('stand', 55.4, -147);
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
  links: [{ x: -100, z: -187.4, yaw: 0, to: 'highconduits', n: 1 }],
  last: 'gatecaptain', tough: { hp: 22, damage: 2.5 }, pay: { xp: 36000, gold: 5200 },
  names: { "Velscour's Knights": 'GARRISON KNIGHT', 'Plague Knights': 'GATE WARDEN', 'The Possessed': 'SCULLION', Kobolds: 'TURNSPIT', 'Haunted Mannequins': 'EMPTY HARNESS', 'Night Paralysis Demons': 'FORGE-WRAITH', 'Dead Children': 'THE FORGOTTEN', 'Plague Giants': 'GAOLER' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.4, 0.16], fire: [1, 0.44, 0.18], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: "Castle Velscour: the Lower Ward. His garrison holds the gate; the servants' ways run behind the walls.", clear: 'The Gate Captain is dead! The gate is yours.', wipe: 'You fall... and wake in the Gate Passage.' },
};

export const CASTLE = [LOWER_WARD];
