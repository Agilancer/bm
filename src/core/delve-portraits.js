// The Gallery of a Thousand Portraits: one of Castle Velscour's eight dungeons (docs/PHOBOS-CASTLE.md, set A), behind the
// Portrait Gallery's wing in the Middle Ward. His house's faces, a thousand of them, and every one painted from the life:
// the Painter has been kept at his easel long past his time, and what he paints of a sitter stays in the frame, and can
// get down out of it. Three bosses, a party at your back if you'll pay for one (their fights: src/sim/castle-fights-a.js).
//   The Varnished Door, and the Long Gallery past it: two rows of them down both walls, a runner of his blue between. One
//     frame on its east wall stands a hand out from it: behind it, on no map, the Cabinet of Miniatures.
//   The Rotunda of the House, at the Gallery's end: the oldest faces round a drum of a room, daylight down its middle.
//   The Salon of the Dowagers, west: the Dowager in Oils (85), who steps into the paint and out of another frame, and can't
//     be touched while she's in it.
//   The Framers' Shop, east: the Framer (85), who gilds; when he sets his brush turning, walk round ahead of it.
//   The Restorers' Room, south of the Salon: the way round to the Gallery of Eyes; and a great empty frame against its
//     wall that's a way through to the Middle Ward's own gallery (barred from that side: come through it from here).
//   The Gallery of Eyes, south of the Rotunda: every face in it turned to the door.
//   The Unfinished Hall: the Painter (87) at work. He sets up a canvas and paints one of you: cut the canvas down before
//     the likeness is finished, or it gets down and fights. His doors are shut till his two are dead; every wing of
//     sitters you emptied on the way leaves him fewer to call down off the walls. He keeps the Painted Key.
//
// Where it really is: past the world's north edge in the castle's row; everything here local to it, x east, z south of
// the way in. Its door out on the land: in the east face of the Portrait Gallery's wing, in the Middle Ward.
// His livery here is royal blue (never beside grey with gold). Nothing of Tessariel's (README "The two sides"): no bells,
// no seals of hers, no crosses; no two ways out of a room straight across from each other.
import { R } from './delve-lay.js';

const PI = Math.PI;

// (Each room its own section: the Long Gallery fourteen metres high and ten wide; the Rotunda a drum twenty-two metres up
// with a ring of twelve piers in it; the Salon and the Shop low; the Cabinet a cupboard. No room lights itself (fires: 0,
// hang: 0): each has two or three lamps of its own, and the dark between them.)
const rooms = [
  R('tp_door', 'the Varnished Door', 0, -16, 4, 24, 0, 6, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('tp_long', 'the Long Gallery', 0, -62, 5, 36, 0, 14, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('tp_rotunda', 'the Rotunda of the House', 6, -110, 14, 14, 0, 22, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 0, hang: 0 }),
  R('tp_salon', 'the Salon of the Dowagers', -52, -104, 18, 14, 0, 9, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
  R('tp_shop', "the Framers' Shop", 62, -120, 18, 14, 0, 7.5, { rock: 'ph_grey_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
  R('tp_restore', "the Restorers' Room", -52, -146, 12, 10, 0, 6, { rock: 'ph_grey_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
  R('tp_eyes', 'the Gallery of Eyes', 14, -148, 5, 26, 0, 8, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('tp_cabinet', 'the Cabinet of Miniatures', 30, -52, 6, 6, 0, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('tp_hall', 'the Unfinished Hall', 14, -196, 19, 24, 0, 20, { rock: 'ph_grey_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0, hang: 0 }),
];

// (Each run a little into both rooms. The Rotunda's four ways: the Long Gallery in at its north, west of its middle; the
// Gallery of Eyes out at its south, east of it; the Salon north of its middle, the Shop south of it. None across from another.)
const tunnels = [
  { pts: [[-6, -104], [-36, -104]], w: 4, h: 4.5 },                 // the Rotunda to the Salon
  { pts: [[18, -118], [46, -118]], w: 4, h: 4.5 },                  // ... and to the Framers' Shop
  { pts: [[-58, -116], [-58, -138]], w: 3, h: 3.6 },                // the Salon down to the Restorers' Room
  { pts: [[-42, -150], [11, -150]], w: 3, h: 3.6 },                 // the Restorers' Room along to the Gallery of Eyes
  // The Cabinet of Miniatures: behind the frame that stands out from the Long Gallery's east wall. On no map.
  { pts: [[3, -50], [26, -50]], w: 1.3, h: 3 },
  // Where they come from: the Salon's dressing rooms, the Shop's stores, the Hall's wings.
  { pts: [[-68, -98], [-76, -98]], w: 2, h: 4, dead: true, door: 'tp_salon' },
  { pts: [[-46, -92], [-46, -84]], w: 2, h: 4, dead: true, door: 'tp_salon' },
  { pts: [[78, -114], [86, -114]], w: 2, h: 4, dead: true, door: 'tp_shop' },
  { pts: [[66, -108], [66, -100]], w: 2, h: 4, dead: true, door: 'tp_shop' },
  { pts: [[-3, -186], [-11, -186]], w: 2, h: 4, dead: true, door: 'tp_hall' },
  { pts: [[31, -208], [39, -208]], w: 2, h: 4, dead: true, door: 'tp_hall' },
];

// The Salon's four great frames, stood out from its walls: the Dowager goes into one and comes out of another
// (src/sim/castle-fights-a.js dowager). [x, z]
export const FRAMES = [[-66, -96], [-38, -96], [-66, -113], [-40, -114]];
// Where the Painter's canvas is set up in the Unfinished Hall, turn about. [x, z]
export const EASELS = [[2, -184], [26, -186], [4, -212], [26, -210]];
// The Framers' Shop's middle, where the Framer stands to turn his brush. [x, z]
export const SHOP_MID = [62, -120];
// The Rotunda's ring of twelve piers: its middle, and how far out they stand.
const RING = { x: 6, z: -110, r: 9.6 };

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // (A wall hung floor to ceiling, src/core/delve-props-a.js hangwall: a thousand of them, flat in their frames. A wall is
  // named by where it is and which way it faces into its room: yaw 0 north (+z), PI south, PI/2 east, -PI/2 west.)
  // ---- the Varnished Door: low and close; frames stacked against the wall with their faces to it; one lamp at each end.
  add('lintel', 0, -2, { hx: 4, stone: 'dark:ashlar' }); add('mark', 0, 7.6, { up: 4.6, r: 0.6, back: 1 });
  add('stand', -3, -8); add('crates', 2.8, -20); add('brazier', 2.6, 2); add('brazier', -2.6, -33);
  add('portrait', -3.75, -15, { yaw: PI / 2, sz: 0.9, up: -0.9 }); add('portrait', 3.75, -27, { yaw: -PI / 2, sz: 1.1, up: -0.9 });
  // ---- the Long Gallery: ten metres wide and fourteen high, and both its walls hung from the dado to the roof, row over
  // row, seventy metres of them; a runner between; two lamps, and the dark between and past them. One frame on the east
  // wall is real, and stands out from it on its hinge: the scoring of its swing in the boards.
  add('hangwall', -4.94, -62, { yaw: PI / 2, w: 35.4, h: 13.4, lo: 0.9 });
  add('hangwall', 4.94, -62, { yaw: -PI / 2, w: 35.4, h: 13.4, lo: 0.9, skip: [[10.4, 13.6]] });
  add('portrait', 3.8, -48.6, { yaw: -PI / 2 - 1.0, sitter: 'royal:cloth_red', sz: 1.3 });
  add('decal', 3.5, -50, { layer: 'p2_gouges', w: 1.8, h: 1.2, flat: true, yaw: -0.6 });
  add('carpet', 0, -62, { hx: 1.5, hz: 34, layer: 'royal:cloth_red' });
  add('stand', -3.9, -36); add('stand', 3.9, -68); add('stand', -3.9, -90);
  add('chandelier', 0, -44, { up: 7.5, hang: true }); add('chandelier', 0, -80, { up: 7.5, hang: true });
  // ---- the Cabinet of Miniatures: a cupboard of a room, three walls of faces the size of a hand; a table of them; one lamp.
  add('hangwall', 35.94, -52, { yaw: -PI / 2, w: 5.4, h: 4.4, lo: 0.5, s: 0.38 }); add('hangwall', 30, -57.94, { yaw: 0, w: 5.4, h: 4.4, lo: 0.5, s: 0.38 });
  add('hangwall', 30, -46.06, { yaw: PI, w: 5.4, h: 4.4, lo: 0.5, s: 0.38 });
  add('table', 30, -53, { hx: 1.6, hz: 0.9, cloth: 'royal:cloth_oat' }); add('candles', 30, -53, { up: 0.85 }); add('carpet', 30, -52, { hx: 4, hz: 4, layer: 'royal:cloth_red' });
  add('chandelier', 28, -50, { up: 3.2, hang: true });
  // ---- the Rotunda of the House: a drum twenty-two metres up; a ring of twelve piers, a ring of stone on their heads and
  // his blue hung under it; the oldest faces, great ones, up all four walls behind the piers to the roof; daylight down
  // its middle onto the marble, and the piers' shadows out from it.
  for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * 2 * PI; add('column', RING.x + Math.cos(a) * RING.r, RING.z + Math.sin(a) * RING.r, { r: 0.8, solid: true, shaft: 'p2_oxblood_marble' }); }
  add('ringbeam', RING.x, RING.z, { r: RING.r, up: 9.5, h: 1.5, t: 1.3, cloth: 'royal:cloth_red' });
  add('ringbeam', RING.x, RING.z, { r: RING.r, up: 19, h: 1.2, t: 1.2 });
  add('hangwall', 6, -96.06, { yaw: PI, w: 13.6, h: 21, lo: 1, s: 1.7, skip: [[0.4, 12.6]] }); add('hangwall', 6, -123.94, { yaw: 0, w: 13.6, h: 21, lo: 1, s: 1.7, skip: [[2.4, 13.6]] });
  add('hangwall', -7.94, -110, { yaw: PI / 2, w: 13.6, h: 21, lo: 1, s: 1.7, skip: [[-9, -3]] }); add('hangwall', 19.94, -110, { yaw: -PI / 2, w: 13.6, h: 21, lo: 1, s: 1.7, skip: [[-11, -5]] });
  add('daylight', 6, -110, { r: 3 }); add('carpet', 6, -110, { hx: 4.5, hz: 4.5, layer: 'royal:cloth_red' });
  add('bench', 6, -105, { hx: 2.2, hz: 0.25 }); add('bench', 6, -115, { hx: 2.2, hz: 0.25 });
  add('brazier', -4.6, -120.6); add('brazier', 16.6, -99.4); add('chandelier', 1, -112, { up: 8, hang: true }); add('chandelier', 11, -108, { up: 8, hang: true });
  // ---- the Salon of the Dowagers: low; four great frames stood out from the walls, each on its own carpet; her chair, a
  // table of cups; the north and south walls hung to the ceiling; a hearth; one lamp over her chair.
  for (const [x, z] of FRAMES) {
    const yaw = x < -52 ? PI / 2 : -PI / 2;
    add('portrait', x + (x < -52 ? -1.6 : 1.6), z, { yaw, sz: 1.9, up: 0.5 });
    add('carpet', x, z, { hx: 1.6, hz: 1.6, layer: 'royal:cloth_red' });
  }
  add('hangwall', -52, -90.06, { yaw: PI, w: 17.6, h: 8.4, lo: 0.9, skip: [[-7.6, -4.4]] }); add('hangwall', -52, -117.94, { yaw: 0, w: 17.6, h: 8.4, lo: 0.9, skip: [[-7.8, -4.2], [-2.4, 2.4]] });
  add('hangwall', -69.94, -104, { yaw: PI / 2, w: 13.6, h: 8.4, lo: 0.9, skip: [[-7.6, -4.4]] }); add('hangwall', -34.06, -104, { yaw: -PI / 2, w: 13.6, h: 8.4, lo: 0.9, skip: [[-2.6, 2.6]] });
  for (let i = 0; i < 7; i++) { const a = 0.5 + i * 0.36; add('seat', -52 + Math.cos(a) * 7.5, -107 + Math.sin(a) * 6, { hx: 0.45, hz: 0.45, stone: 'dark:wood', yaw: -a - PI / 2 }); }
  add('table', -46, -110, { hx: 1.2, hz: 0.7, cloth: 'royal:cloth_oat' }); add('table', -59, -110, { hx: 1.2, hz: 0.7, cloth: 'royal:cloth_oat' }); add('framestack', -69.6, -107, { yaw: PI / 2, n: 3 });
  add('seat', -52, -93.4, { hx: 0.9, hz: 0.7, stone: 'dark:wood' }); add('table', -52, -99, { hx: 1.4, hz: 0.8, cloth: 'royal:cloth_oat' }); add('candles', -52, -99, { up: 0.85 });
  add('hearth', -52, -117.4, { yaw: 0 });
  add('chandelier', -58, -101, { up: 5.4, hang: true }); add('chandelier', -44, -108, { up: 5.4, hang: true }); add('carpet', -52, -105, { hx: 8, hz: 4, layer: 'royal:cloth_red' });
  // ---- the Framers' Shop: low; benches of mouldings, frames stacked in fours against every wall, the gilders' pots, the
  // glue; the floor kept clear in its middle, a round of gilt trodden into the boards where he stands to turn his brush.
  add('table', 50, -110, { hx: 3.2, hz: 0.8 }); add('candles', 51, -110, { up: 0.85 }); add('table', 74, -130, { hx: 3.2, hz: 0.8 }); add('candles', 73, -130, { up: 0.85 });
  for (const [x, z, yaw] of [[79.75, -124, -PI / 2], [79.75, -120, -PI / 2], [79.75, -128, -PI / 2], [56, -133.75, 0], [52, -133.75, 0], [60, -133.75, 0], [72, -106.25, PI], [76, -106.25, PI], [44.25, -128, PI / 2], [44.25, -124, PI / 2]]) {
    add('portrait', x, z, { yaw, sz: 1.2, up: -0.9 }); add('portrait', x + Math.sin(yaw) * 0.14, z + Math.cos(yaw) * 0.14, { yaw, sz: 0.9, up: -0.9 });
  }
  for (const x of [48, 53, 58, 70, 75]) add('framestack', x, -106.3, { yaw: PI, n: 3 + (x % 3), h: 2 + (x % 4) * 0.4 });
  for (const x of [64, 68, 72]) add('framestack', x, -133.7, { yaw: 0, n: 4, h: 2.6 });
  for (const z of [-112, -116, -130]) add('framestack', 79.7, z, { yaw: -PI / 2, n: 4, h: 2.4 });
  for (const z of [-116, -120, -132]) add('framestack', 44.3, z, { yaw: PI / 2, n: 3, h: 2.8 });
  add('easel', 50, -128, { yaw: 0.8, sitter: 'royal:cloth_red' }); add('easel', 53.5, -131, { yaw: 0.4 }); add('easel', 75, -113, { yaw: -2.2, sitter: 'dark:cloth_oat' }); add('easel', 72, -110.5, { yaw: -2.6, sz: 1.3 });
  add('vat', 48, -131, { r: 0.9 }); add('vat', 77, -110, { r: 0.8 }); add('crates', 46.5, -113); add('barrels', 77.5, -132);
  add('chandelier', 55, -117, { up: 5, hang: true }); add('chandelier', 70, -124, { up: 5, hang: true }); add('brazier', 47, -108.4);
  add('pool', 62, -120, { r: 2.6, layer: 'p2_bronze_plates', up: 0.02 }); add('pool', 62, -120, { r: 2.1, layer: 'p2_worn_floorboards', up: 0.03 }); add('decal', 66, -124, { layer: 'p2_scorch_mark', w: 2, flat: true });
  // ---- the Restorers' Room: low; faces on easels, half cleaned; their bench; and the great empty frame against the west
  // wall, gilt, with the dark through it.
  add('easel', -48, -141, { yaw: 0.5, sitter: 'royal:cloth_red' }); add('easel', -44, -146, { yaw: -1.2, sitter: 'dark:cloth_oat' }); add('easel', -50, -152, { yaw: 2.4 });
  add('table', -56, -140, { hx: 2.4, hz: 0.8 }); add('candles', -56, -140, { up: 0.85 }); add('barrels', -62, -138);
  add('crates', -41.5, -154); add('chandelier', -52, -146, { up: 3.6, hang: true }); add('lintel', -62.4, -146, { hz: 2.2, stone: 'p2_bronze_plates' });
  // ---- the Gallery of Eyes: both walls hung to the ceiling, every face turned to the way in; a runner; one lamp at its
  // middle, and its two ends dark.
  add('hangwall', 18.94, -148, { yaw: -PI / 2, w: 25.4, h: 7.5, lo: 0.9 }); add('hangwall', 9.06, -148, { yaw: PI / 2, w: 25.4, h: 7.5, lo: 0.9, skip: [[0.4, 3.6]] });
  add('carpet', 14, -148, { hx: 1.4, hz: 24, layer: 'royal:cloth_red' }); add('chandelier', 14, -146, { up: 5.2, hang: true });
  // ---- the Unfinished Hall: twenty metres up, its walls primed and bare; his own likeness begun, as tall as three men, on
  // the west wall with a fire either side of it; canvases stood about on their easels; his table of colours and his high
  // stool at the far end under his mark; pots, dust sheets; two lamps.
  add('easel', -2, -199, { yaw: PI / 2, sz: 4, sitter: 'blood:cloth_red' }); add('brazier', -1.6, -192.4); add('brazier', -1.6, -205.6);
  for (const [x, z] of EASELS) add('easel', x + (x < 14 ? -1.6 : 1.6), z, { yaw: x < 14 ? PI / 2 : -PI / 2, sz: 1.2 });
  // (And what he's begun and left: canvases stood against the east wall, face out, each a sitter half there; more on easels about the floor.)
  add('canvaswall', 32.9, -193, { yaw: -PI / 2, w: 13, h: 15, lo: 1 });
  add('canvaswall', 14, -172.1, { yaw: PI, w: 4, h: 15, lo: 6 });
  // (His pupils' easels in two ranks down the north end, each a sitter at a different stage; frames stacked for what's done.)
  for (const z of [-177.5, -181.5]) for (const x of [4, 8, 20, 24, 28]) add('easel', x, z, { yaw: PI + (x % 3 - 1) * 0.3, sz: 1.1 + (x % 4) * 0.08, sitter: [null, 'royal:cloth_red', 'cloth_red', 'dark:cloth_oat'][(x + Math.round(z)) % 4 | 0] || undefined });
  for (const z of [-182, -190, -212]) add('framestack', -4.7, z, { yaw: PI / 2, n: 4, h: 2.6 });
  add('easel', 22, -198, { yaw: -2.4, sz: 1.6 }); add('easel', 8, -206, { yaw: 2.0, sz: 1.4, sitter: 'pale:cloth_oat' });
  add('table', 22, -216.6, { hx: 3, hz: 0.9 }); add('candles', 21, -216.6, { up: 0.85 }); add('candles', 24, -216.4, { up: 0.85 }); add('seat', 27, -217, { hx: 0.6, hz: 0.6, stone: 'dark:wood', flip: true });
  add('mark', 14, -219.6, { up: 10, r: 2, back: -1 });
  for (const [x, z] of [[3, -206], [27, -192]]) add('column', x, z, { r: 1.2, solid: true });
  add('vat', 31, -174.6, { r: 0.8 }); add('vat', 0, -217, { r: 0.8 }); add('barrels', 30, -217); add('crates', -2.4, -175); add('heap', 6, -217, { r: 1.1, layer: 'pale:cloth_oat' }); add('heap', 29.5, -200, { r: 0.9, layer: 'pale:cloth_oat' });
  add('chandelier', 16, -186, { up: 8, hang: true }); add('chandelier', 16, -208, { up: 8, hang: true }); add('chandelier', 4, -199, { up: 9, hang: true });
  add('decal', 20, -196, { layer: 'p2_blood_splashes', w: 2.4, flat: true, yaw: 0.5 });
}

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
export const SITTERS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const LAY = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
// (None in the Varnished Door: it's where you wake if you fall. The Long Gallery's sitters and the Gallery of Eyes' are
// the wings the Painter's call is weighed by.)
const packs = [
  { key: 'tp_sitters', room: 'tp_long', pick: SITTERS, n: 5, pal: ['Royal'], at: [0, 8], r: 2.5 },
  { key: 'tp_crawlers', room: 'tp_long', pick: ['spider_black', 'spider_red'], n: 4, pal: ['Royal'], at: [0, -22], r: 2.5 },
  { key: 'tp_court', room: 'tp_rotunda', pick: KNIGHTS, n: 4, elite: ['possessed_knight_3'], pal: ['Royal'], tough: { hp: 1.3, damage: 1.2 }, at: [0, 0], r: 6 },
  { key: 'tp_lay', room: 'tp_restore', pick: LAY, n: 4, pal: ['Royal', 'Sable'], at: [0, 0], r: 4 },
  { key: 'tp_eyes', room: 'tp_eyes', pick: ['night_demon_blue', 'night_demon_black'], n: 3, pal: ['Royal'], tough: { hp: 1.2, damage: 1.2 }, at: [0, -6], r: 2.5 },
];
const bosses = [
  { key: 'dowager', room: 'tp_salon', name: 'The Dowager in Oils', models: ['tp_dowager'], pal: ['Royal'], hp: 76000, damage: 262, reach: 3.0, loot: 8, at: [-2, 0] },
  { key: 'framer', room: 'tp_shop', name: 'The Framer', models: ['tp_framer'], pal: ['Royal'], hp: 82000, damage: 268, reach: 3.6, loot: 8, at: [0, 0] },
  { key: 'painter', room: 'tp_hall', name: 'The Painter', models: ['tp_painter'], pal: ['Royal'], hp: 98000, damage: 275, reach: 3.2, loot: 0, needs: ['dowager', 'framer'], shut: 'pnt_shut', gives: 'key:portraits', at: [0, -8] },
];
const warnings = {
  dow_open: "The Dowager in Oils. She steps into the paint and out of another frame: while she's in it nothing touches her, and the frame she'll come out of is the lit one. Be nowhere near it.",
  dow_fan: 'The Dowager snaps her fan! Between the blades.',
  dow_gaze: 'She looks down her nose at you! Out of the line.',
  dow_cups: 'The tea service! Out of the circles.',
  dow_wail: 'She shrieks! In close against her, or right out.',
  dow_paint: 'SHE STEPS INTO THE PAINT! Nothing touches her now. She comes out of the lit frame: stand clear of it!',
  dow_out: 'She steps down out of the frame.',
  dow_sitters: 'Her sitters get down off the walls! Bring them down.',
  dow_turn: 'The Dowager turns on you! Get behind the tank, or out of her reach, till she lets go.',
  dow_enrage: 'The Dowager in Oils is enraged!',
  frm_open: "The Framer. When he goes to the middle of his shop and sets his gilding brush turning, it sweeps the whole room: walk round ahead of it, the way it's going. The rest, be out of.",
  frm_cleave: 'The Framer swings his mitre saw! Out of the arc.',
  frm_mitre: 'He cuts a mitre! Out of both lines.',
  frm_nails: 'Brads! Between them.',
  frm_gild: 'Molten leaf! Out of the pools.',
  frm_brush: 'THE GILDING BRUSH IS TURNING! It sweeps the whole shop: walk round ahead of it!',
  frm_done: 'The brush runs dry.',
  frm_hands: 'His journeymen come in from the stores!',
  frm_turn: 'The Framer turns on you! Get behind the tank, or out of his reach, till he lets go.',
  frm_enrage: 'The Framer is enraged!',
  pnt_shut: "The Unfinished Hall is shut. Its doors open to the Painter's two: the Dowager in Oils and the Framer.",
  pnt_open: 'The Painter. He sets up a canvas and paints one of you on it: everyone but whoever holds him, to the canvas, and cut it down before the likeness is finished. What gets finished gets down. Each wing of sitters you emptied on the way leaves him fewer to call off the walls.',
  pnt_less: 'Wings of his gallery hang empty: fewer sitters answer him.',
  pnt_brush: 'The Painter sweeps his brush! Out of the arc.',
  pnt_spatter: 'Wet paint! Out of the pools, and keep out.',
  pnt_line: 'He rules three lines! Out of them.',
  pnt_turps: 'Burning turpentine! Between the bolts.',
  pnt_canvas: 'HE SETS UP A CANVAS! Everyone but his tank, to it: cut it down before the likeness is done!',
  pnt_cut: 'The canvas is cut down. Whoever it was, it never knew.',
  pnt_done: 'THE LIKENESS IS FINISHED. It gets down off the canvas.',
  pnt_sitters: 'His sitters get down off the walls!',
  pnt_turn: 'The Painter turns on you! Get behind the tank, or out of his reach, till he lets go.',
  pnt_enrage: 'The Painter is enraged!',
};

export const THOUSAND_PORTRAITS = {
  key: 'thousandportraits', tag: 'tp', name: 'Castle Velscour: the Gallery of a Thousand Portraits', short: 'the Gallery of a Thousand Portraits', x: 13460, z: -5700, y: -60, level: 83, style: 'castle',
  castle: true, dungeon: true,
  rooms, tunnels, props, packs, bosses, warnings,
  turnWarn: { dowager: 'dow_turn', framer: 'frm_turn', painter: 'pnt_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 14, z: -216.4 },
  // Before the east face of the Portrait Gallery's wing, in the Middle Ward: its back to the wing, facing east, between two
  // of the Grand Patio's piers and clear of the tower that stands by it (src/core/phobos-build.js). (Eight metres and more
  // from the wing's wall: tools/lands/check-sites.mjs keeps a portal's ground that clear.)
  portal: { x: 11005.6, z: -50, yaw: PI / 2, r: 2.2 },
  // The great empty frame in the Restorers' Room: through to the Middle Ward's Portrait Gallery (src/core/delve-castle.js),
  // which is barred from that side till it's been come through from here.
  links: [{ x: -62.6, z: -146, yaw: PI / 2, to: 'middleward', n: 5, opens: 'latch:frame' }],
  chests: [
    { id: 'cabinet', room: 'tp_cabinet', x: 33, z: -47.6, yaw: PI, loot: 3 },
    { id: 'eyes', room: 'tp_eyes', x: 17.4, z: -170.4, yaw: -PI / 2, loot: 2 },
    { id: 'restore', room: 'tp_restore', x: -60, z: -154.4, yaw: 0, loot: 2 },
  ],
  vistas: [{ id: 'tp_rotunda', name: 'the Rotunda of the House', room: 'tp_rotunda', x: 6, z: -110, r: 4 }],
  auto: { way: ['tp_door', 'tp_long', 'tp_cabinet', 'tp_long', 'tp_rotunda', 'tp_salon', 'tp_restore', 'tp_eyes', 'tp_rotunda', 'tp_shop', 'tp_rotunda', 'tp_eyes', 'tp_hall'] },
  shots: [
    ['tp_long', 'tp_door', [0, 1.8, -28], [0, 4.5, -96]],
    ['tp_rotunda', 'tp_door', [2.5, 2, -103.5], [10, 9, -118]],
    ['tp_salon', 'tp_door', [-36, 2.4, -112], [-66, 2, -98]],
    ['tp_shop', 'tp_door', [46, 2.4, -109], [74, 1, -130]],
    ['tp_eyes', 'tp_door', [14, 1.8, -124.5], [14, 2.6, -172]],
    ['tp_hall', 'tp_door', [22, 3, -174.5], [0, 5, -204]],
  ],
  last: 'painter', tough: { hp: 27, damage: 2.9 }, pay: { xp: 76000, gold: 10400 },
  names: { "Velscour's Knights": 'COURT KNIGHT', 'The Possessed': 'SITTER', 'Haunted Mannequins': 'LAY FIGURE', 'Giant Spiders': 'FRAME-CRAWLER', 'Night Paralysis Demons': 'THE WATCHER IN THE PAINT' },
  // (Its lamps burn candle-gold, and few: a torch every twenty-four metres of wall, and each room's own two or three.)
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_blue', roof: 'dark:stone', flame: 'flame', light: [1, 0.74, 0.42], fire: [1, 0.78, 0.48], every: 22, high: 3, glow: 3.2, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Gallery of a Thousand Portraits. Every face of his house, painted from the life. The frames are not all full.', clear: 'The Painter is dead! The Painted Key is yours.', wipe: 'You fall... and wake at the Varnished Door.' },
};

export const PORTRAITS_VARIANTS = {
  tp_dowager: { src: 'possessed_woman_2', alt: 'possessed_woman_1', height: 2.8, name: 'THE DOWAGER IN OILS' },
  tp_framer: { src: 'possessed_knight_3', alt: 'velscour_knight_2', height: 3.4, name: 'THE FRAMER' },
  tp_painter: { src: 'necromancer_lord', alt: 'necromancer_2', height: 3.1, name: 'THE PAINTER' },
  tp_canvas: { src: 'mannequin_1', alt: 'mannequin_2', height: 2.6, name: 'THE CANVAS' },
  tp_likeness: { src: 'possessed_knight_1', alt: 'velscour_knight_1', height: 2.1, name: 'YOUR LIKENESS' },
};
