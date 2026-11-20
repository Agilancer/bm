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

const rooms = [
  R('tp_door', 'the Varnished Door', 0, -12, 5, 20, 0, 9, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 12 }),
  R('tp_long', 'the Long Gallery', 0, -60, 7, 32, 0, 12, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 9 }),
  R('tp_rotunda', 'the Rotunda of the House', 6, -112, 20, 22, 0, 18, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 11 }),
  R('tp_salon', 'the Salon of the Dowagers', -52, -104, 18, 14, 0, 11, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 12, cloth: 'royal:cloth_red', fires: 12 }),
  R('tp_shop', "the Framers' Shop", 62, -120, 18, 14, 0, 11, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 12 }),
  R('tp_restore', "the Restorers' Room", -52, -146, 12, 10, 0, 8, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 12 }),
  R('tp_eyes', 'the Gallery of Eyes', 14, -150, 5, 22, 0, 10, { rock: 'royal:p2_thorn_brocade', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 11 }),
  R('tp_cabinet', 'the Cabinet of Miniatures', 30, -52, 6, 6, 0, 7, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 20 }),
  R('tp_hall', 'the Unfinished Hall', 14, -198, 24, 30, 0, 20, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 14 }),
];

// (Each run a little into both rooms. The Rotunda's four ways: the Long Gallery in at its north, west of its middle; the
// Gallery of Eyes out at its south, east of it; the Salon north of its middle, the Shop south of it. None across from another.)
const tunnels = [
  { pts: [[-12, -104], [-36, -104]], w: 5, h: 5 },                  // the Rotunda to the Salon
  { pts: [[24, -120], [46, -120]], w: 5, h: 5 },                    // ... and to the Framers' Shop
  { pts: [[-58, -116], [-58, -138]], w: 3, h: 4 },                  // the Salon down to the Restorers' Room
  { pts: [[-42, -150], [11, -150]], w: 3, h: 4 },                   // the Restorers' Room along to the Gallery of Eyes
  // The Cabinet of Miniatures: behind the frame that stands out from the Long Gallery's east wall. On no map.
  { pts: [[5, -50], [26, -50]], w: 1.3, h: 3 },
  // Where they come from: the Salon's dressing rooms, the Shop's stores, the Hall's wings.
  { pts: [[-68, -98], [-76, -98]], w: 2, h: 4, dead: true, door: 'tp_salon' },
  { pts: [[-46, -92], [-46, -84]], w: 2, h: 4, dead: true, door: 'tp_salon' },
  { pts: [[78, -114], [86, -114]], w: 2, h: 4, dead: true, door: 'tp_shop' },
  { pts: [[66, -108], [66, -100]], w: 2, h: 4, dead: true, door: 'tp_shop' },
  { pts: [[-8, -186], [-16, -186]], w: 2, h: 4, dead: true, door: 'tp_hall' },
  { pts: [[36, -212], [44, -212]], w: 2, h: 4, dead: true, door: 'tp_hall' },
];

// The Salon's four great frames, stood out from its walls: the Dowager goes into one and comes out of another
// (src/sim/castle-fights-a.js dowager). [x, z]
export const FRAMES = [[-66, -96], [-38, -96], [-66, -113], [-40, -114]];
// Where the Painter's canvas is set up in the Unfinished Hall, turn about. [x, z]
export const EASELS = [[0, -184], [30, -186], [2, -216], [28, -214]];
// The Framers' Shop's middle, where the Framer stands to turn his brush. [x, z]
export const SHOP_MID = [62, -120];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // (Each sitter in a livery of his: his red, royal blue, black, the white with skulls, blood; frames of dark wood.)
  const SITS = ['royal:cloth_red', 'cloth_red', 'dark:cloth_oat', 'pale:cloth_oat', 'blood:cloth_red'];
  let n = 0;
  const sitter = () => SITS[n++ % 5];
  // ---- the Varnished Door: stands of his plate, a rack; frames stacked against the wall, their faces to it.
  add('lintel', 0, -2, { hx: 5, stone: 'dark:ashlar' }); add('mark', 0, 7.6, { up: 6.6, r: 0.8, back: 1 });
  add('stand', -4, -8); add('stand', 4, -18); add('crates', -3.6, -24); add('brazier', 3.4, 2); add('brazier', -3.4, -27);
  add('portrait', -4.75, -14, { yaw: PI / 2, sz: 0.9 }); add('portrait', 4.75, -6, { yaw: -PI / 2, sz: 1.1 });
  // ---- the Long Gallery: two rows down both walls, a runner between, his plate on stands; and the frame that's a door,
  // swung out from the east wall, its swing scored in the boards.
  for (let z = -32; z >= -88; z -= 4.6) {
    const k = (n * 7) % 3, sz = 0.9 + 0.3 * k / 2;
    if (Math.abs(z + 50) > 3) add('portrait', 6.8, z, { yaw: -PI / 2, sitter: sitter(), sz, turn: n % 3 - 1 });
    add('portrait', -6.8, z - 2.3, { yaw: PI / 2, sitter: sitter(), sz: 1.95 - sz, turn: (n + 1) % 3 - 1 });
    if (k !== 1) { add('portrait', 6.8, z - 2.3, { yaw: -PI / 2, up: 3.3, sitter: sitter(), sz: 0.8 }); add('portrait', -6.8, z, { yaw: PI / 2, up: 3.3, sitter: sitter(), sz: 0.8 }); }
  }
  add('portrait', 5.6, -48.6, { yaw: -PI / 2 - 1.0, sitter: 'royal:cloth_red', sz: 1.3 });
  add('decal', 5.4, -50, { layer: 'p2_gouges', w: 1.8, h: 1.2, flat: true, yaw: -0.6 });
  add('carpet', 0, -60, { hx: 1.6, hz: 30, layer: 'royal:cloth_red' });
  add('stand', -5.6, -40); add('stand', 5.6, -64); add('stand', -5.6, -84);
  for (const z of [-44, -60, -76]) add('chandelier', 0, z, { up: 6.4, hang: true });
  add('decal', -6.95, -29.05, { layer: 'p2_cobweb', w: 1.8, up: 10.2, yaw: PI / 2 });
  // ---- the Cabinet of Miniatures: a hundred faces the size of a hand, a table of them under glass, one lamp.
  for (const [x, z, yaw] of [[35.75, -54, -PI / 2], [35.75, -50, -PI / 2], [30, -57.75, 0], [27, -57.75, 0], [33, -57.75, 0]]) { add('portrait', x, z, { yaw, sitter: sitter(), sz: 0.45, up: 0.4 }); add('portrait', x, z, { yaw, sitter: sitter(), sz: 0.45, up: 1.6 }); }
  add('table', 30, -52, { hx: 1.6, hz: 0.9, cloth: 'royal:cloth_oat' }); add('candles', 30, -52, { up: 0.85 }); add('carpet', 30, -52, { hx: 4, hz: 4, layer: 'royal:cloth_red' });
  // ---- the Rotunda of the House: the oldest faces round it, great ones, in two tiers; a ring of piers; the daylight down
  // its middle onto the marble; his mark in the floor's middle is only the light.
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * 2 * PI + 0.26, x = 6 + Math.sin(a) * 19.4, z = -112 + Math.cos(a) * 21.4;
    // (Hung on whichever wall is nearest, facing in. Not over a way out.)
    const onX = Math.abs(Math.sin(a)) * 22 > Math.abs(Math.cos(a)) * 20, px = onX ? 6 + Math.sign(Math.sin(a)) * 19.8 : x, pz = onX ? z : -112 + Math.sign(Math.cos(a)) * 21.8;
    const yaw = onX ? (Math.sin(a) > 0 ? -PI / 2 : PI / 2) : (Math.cos(a) > 0 ? PI : 0);
    if ((onX && (Math.abs(pz + 104) < 4 || Math.abs(pz + 120) < 4)) || (!onX && (Math.abs(px) < 8 || Math.abs(px - 14) < 6))) continue;
    add('portrait', px, pz, { yaw, sitter: sitter(), sz: 1.7, up: 0.6, turn: k % 3 - 1 });
  }
  for (const [x, z] of [[-6, -100], [18, -100], [-6, -124], [18, -124]]) add('column', x, z, { r: 1.2, solid: true, shaft: 'p2_oxblood_marble' });
  add('daylight', 6, -112, { r: 3.4 }); add('carpet', 6, -112, { hx: 5, hz: 5, layer: 'royal:cloth_red' });
  add('bench', 6, -106, { hx: 2.4, hz: 0.25 }); add('bench', 6, -118, { hx: 2.4, hz: 0.25 });
  add('brazier', -10, -112); add('brazier', 22, -110);
  // ---- the Salon of the Dowagers: four great frames stood out from the walls, each on a low step; her chair, a table of
  // cups; hangings of his blue; a hearth.
  for (const [x, z] of FRAMES) {
    const yaw = x < -52 ? PI / 2 : -PI / 2;
    add('portrait', x + (x < -52 ? -1.6 : 1.6), z, { yaw, sz: 1.9, up: 0.5 });
    add('carpet', x, z, { hx: 1.6, hz: 1.6, layer: 'royal:cloth_red' }); add('candles', x, z - 2.2, { up: 0.1 });
  }
  add('seat', -52, -93.4, { hx: 0.9, hz: 0.7, stone: 'dark:wood' }); add('table', -52, -100, { hx: 1.4, hz: 0.8, cloth: 'royal:cloth_oat' }); add('candles', -52, -100, { up: 0.85 });
  add('hearth', -52, -117.4, { yaw: 0 });
  add('chandelier', -52, -104, { up: 6.5, hang: true }); add('carpet', -52, -105, { hx: 8, hz: 4, layer: 'royal:cloth_red' });
  add('decal', -52, -90.05, { layer: 'p2_tapestry_war', w: 5, h: 3.4, up: 5.4, yaw: PI });
  // ---- the Framers' Shop: benches of mouldings, frames stacked in fours against the walls, the gilders' pots, the
  // glue; the floor kept clear in its middle.
  add('table', 50, -110, { hx: 3.2, hz: 0.8 }); add('candles', 51, -110, { up: 0.85 }); add('table', 74, -130, { hx: 3.2, hz: 0.8 }); add('candles', 73, -130, { up: 0.85 });
  for (const [x, z, yaw] of [[79.75, -124, -PI / 2], [79.75, -120, -PI / 2], [56, -133.75, 0], [52, -133.75, 0], [72, -106.25, PI]]) add('portrait', x, z, { yaw, sz: 1.2, up: -0.9 });
  add('vat', 48, -130, { r: 0.9 }); add('vat', 76, -109, { r: 0.8 }); add('crates', 46.5, -122); add('barrels', 77.5, -132);
  add('chandelier', 62, -120, { up: 6.4, hang: true });
  // (Where he stands to turn his brush: a round of gilt spilt and trodden into the boards.)
  add('pool', 62, -120, { r: 2.6, layer: 'p2_bronze_plates', up: 0.02 }); add('pool', 62, -120, { r: 2.1, layer: 'p2_worn_floorboards', up: 0.03 }); add('decal', 66, -124, { layer: 'p2_scorch_mark', w: 2, flat: true });
  // ---- the Restorers' Room: faces on easels, half cleaned; their benches; and the great empty frame against the west wall.
  add('table', -46, -140, { hx: 2.4, hz: 0.8 }); add('candles', -46, -140, { up: 0.85 }); add('barrels', -62, -138);
  add('portrait', -50, -155.75, { yaw: 0, sitter: sitter(), sz: 1.1, up: -0.4 }); add('portrait', -44, -155.75, { yaw: 0, sz: 1.1, up: -0.4 });
  add('crates', -41.5, -154); add('chandelier', -52, -146, { up: 4.6, hang: true }); add('lintel', -62.4, -146, { hz: 2.2, stone: 'dark:wood' });
  // ---- the Gallery of Eyes: one row down each wall, every face turned to the way in; nothing else in it.
  for (let z = -134; z >= -166; z -= 4) { add('portrait', 18.8, z, { yaw: -PI / 2, sitter: sitter(), sz: 1.1, turn: 1 }); add('portrait', 9.2, z - 2, { yaw: PI / 2, sitter: sitter(), sz: 1.1, turn: -1 }); }
  add('carpet', 14, -150, { hx: 1.4, hz: 20, layer: 'royal:cloth_red' }); add('chandelier', 14, -142, { up: 6, hang: true }); add('chandelier', 14, -160, { up: 6, hang: true });
  // ---- the Unfinished Hall: the walls primed and bare but for the charcoal of what's to come; canvases stood about
  // on their easels, his high stool and his table of colours at the far end, pots, rags; the dust sheets.
  for (const [x, z] of EASELS) { add('portrait', x, z, { yaw: z > -200 ? PI : 0, sz: 1.5, up: -0.2 }); add('candles', x + 1.8, z, { up: 0.1 }); }
  add('table', 14, -222, { hx: 3.4, hz: 0.9 }); add('candles', 12, -222, { up: 0.85 }); add('candles', 16.4, -221.8, { up: 0.85 }); add('seat', 14, -225.4, { hx: 0.6, hz: 0.6, stone: 'dark:wood', flip: true });
  add('mark', 14, -227.6, { up: 10, r: 2, back: -1 });
  for (const [x, z] of [[-4, -200], [32, -198]]) add('column', x, z, { r: 1.3, solid: true });
  add('vat', -6, -222, { r: 0.8 }); add('vat', 34, -224, { r: 0.8 }); add('barrels', 36, -174); add('crates', -8, -174); add('heap', 30, -224, { r: 1, layer: 'pale:cloth_oat' });
  for (const [x, z] of [[14, -186], [14, -210]]) add('chandelier', x, z, { up: 9, hang: true });
  add('portrait', -9.75, -198, { yaw: PI / 2, sz: 2.4, up: 1.4 }); add('portrait', 37.75, -206, { yaw: -PI / 2, sz: 2.4, up: 1.4 });
  add('decal', 20, -196, { layer: 'p2_blood_splashes', w: 2.4, flat: true, yaw: 0.5 }); add('brazier', -6, -190); add('brazier', 34, -206);
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
  pnt_open: 'The Painter. He sets up a canvas and paints one of you on it: everyone but whoever holds him, to the canvas, and cut it down before the likeness is finished. What gets finished gets down.',
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
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 14, z: -224.4 },
  // Before the east face of the Portrait Gallery's wing, in the Middle Ward: its back to the wing, facing east, between two
  // of the Grand Patio's piers and clear of the tower that stands by it (src/core/phobos-build.js). (Eight metres and more
  // from the wing's wall: tools/lands/check-sites.mjs keeps a portal's ground that clear.)
  portal: { x: 11005.6, z: -50, yaw: PI / 2, r: 2.2 },
  // The great empty frame in the Restorers' Room: through to the Middle Ward's Portrait Gallery (src/core/delve-castle.js),
  // which is barred from that side till it's been come through from here.
  links: [{ x: -62.6, z: -146, yaw: PI / 2, to: 'middleward', n: 5, opens: 'latch:frame' }],
  chests: [
    { id: 'cabinet', room: 'tp_cabinet', x: 33, z: -47.6, yaw: PI, loot: 3 },
    { id: 'eyes', room: 'tp_eyes', x: 17.6, z: -129.4, yaw: PI, loot: 2 },
    { id: 'restore', room: 'tp_restore', x: -60, z: -154.4, yaw: 0, loot: 2 },
  ],
  vistas: [{ id: 'tp_rotunda', name: 'the Rotunda of the House', room: 'tp_rotunda', x: 6, z: -112, r: 4 }],
  auto: { way: ['tp_door', 'tp_long', 'tp_cabinet', 'tp_long', 'tp_rotunda', 'tp_salon', 'tp_restore', 'tp_eyes', 'tp_rotunda', 'tp_shop', 'tp_rotunda', 'tp_eyes', 'tp_hall'] },
  shots: [
    ['tp_long', 'tp_door', [0, 2, -30], [0, 2.6, -90]],
    ['tp_rotunda', 'tp_door', [3, 3, -93], [10, 3, -130]],
    ['tp_salon', 'tp_door', [-37, 2.6, -112], [-66, 2, -98]],
    ['tp_hall', 'tp_door', [14, 4.5, -171], [14, 2.5, -226]],
  ],
  last: 'painter', tough: { hp: 27, damage: 2.9 }, pay: { xp: 76000, gold: 10400 },
  names: { "Velscour's Knights": 'COURT KNIGHT', 'The Possessed': 'SITTER', 'Haunted Mannequins': 'LAY FIGURE', 'Giant Spiders': 'FRAME-CRAWLER', 'Night Paralysis Demons': 'THE WATCHER IN THE PAINT' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_blue', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.5, 0.24], fire: [1, 0.54, 0.26], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Gallery of a Thousand Portraits. Every face of his house, painted from the life. The frames are not all full.', clear: 'The Painter is dead! The Painted Key is yours.', wipe: 'You fall... and wake at the Varnished Door.' },
};

export const PORTRAITS_VARIANTS = {
  tp_dowager: { src: 'possessed_woman_2', alt: 'possessed_woman_1', height: 2.8, name: 'THE DOWAGER IN OILS' },
  tp_framer: { src: 'possessed_knight_3', alt: 'velscour_knight_2', height: 3.4, name: 'THE FRAMER' },
  tp_painter: { src: 'necromancer_lord', alt: 'necromancer_2', height: 3.1, name: 'THE PAINTER' },
  tp_canvas: { src: 'mannequin_1', alt: 'mannequin_2', height: 2.6, name: 'THE CANVAS' },
  tp_likeness: { src: 'possessed_knight_1', alt: 'velscour_knight_1', height: 2.1, name: 'YOUR LIKENESS' },
};
