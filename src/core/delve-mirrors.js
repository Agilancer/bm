// The Hall of Mirrors: one of Castle Velscour's dungeons (docs/PHOBOS-CASTLE.md, set B), along the High Ward's south
// terrace: where his court came to look at itself, and what looked back stayed. Gone into only from the High Ward (within),
// by a door that wants the Keeper's Key (the Menagerie's). Grey with gold, and whatever colour the glass throws back.
//   The Silvered Door, and the Long Glass behind it: a gallery of mirrors down both walls. Behind one that's draped, the
//     Covered Room (on no map).
//   The Cabinet of Faces, east, and the Dressing Rooms, west: each with one great glass uncovered.
//   The Glazier's Shop, east of the Long Glass's foot: the Glazier (108), who pulls reflections out of the glass to throw
//     his glare back at you.
//   The Glass Maze, west: walls of standing panes, a way round them and a way into the heart of them.
//   The Hall of Mirrors: the Duchess and her Glass (110), shut in till her Glazier's dead. Two of her: one is her, and
//     takes what she's dealt; the other is only in the glass, across the hall from her, and takes nothing. They change
//     places. Every great glass you left uncovered on the way (the Cabinet's, the Dressing Rooms', the Maze's) gives up an
//     image to her; empty its room, and its glass is draped.
// Local to its own way in: x east, z south of the door (the way on is toward -z), y over its floor.
// No two ways out of a room straight across from each other: the corner map draws no cross of his rooms.
import { R } from './delve-lay.js';
import { LOWER_WARD } from './delve-castle.js';

const PI = Math.PI;

// (Each room its own section: a low door, a long tall gallery of glass, low cabinets off it, a low maze of panes, and the
// hall. Lit by candles in rings and a fire at each great glass, dark between: the glasses give the light back.)
const rooms = [
  R('hm_door', 'the Silvered Door', 0, -15, 4.5, 23, 0, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 0 }),
  R('hm_long', 'the Long Glass', 0, -62, 7, 32, 0, 14, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 0 }),
  R('hm_dark', 'the Covered Room', -24, -36, 4.5, 4.5, 0, 4.5, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('hm_east', 'the Cabinet of Faces', 28, -48, 8, 8, 0, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('hm_west', 'the Dressing Rooms', -30, -68, 9, 10, 0, 6, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('hm_work', "the Glazier's Shop", 36, -88, 14, 12, 0, 10, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 0 }),
  R('hm_maze', 'the Glass Maze', -34, -112, 12, 12, 0, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 0 }),
  R('hm_hall', 'the Hall of Mirrors', 0, -146, 18, 15, 0, 16, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_mausoleum_marble', banners: 0, hang: 0, fires: 0 }),
];

const tunnels = [
  { pts: [[5, -46], [22, -46]], w: 2.4, h: 4.2 },                        // the Long Glass to the Cabinet of Faces
  { pts: [[-5, -68], [-23, -68]], w: 2.4, h: 4.4 },                      // the Long Glass to the Dressing Rooms
  { pts: [[32, -54], [32, -78]], w: 2.4, h: 4.2 },                       // the Cabinet to the Glazier's Shop
  { pts: [[5, -80], [24, -84]], w: 2.6, h: 4.6 },                        // the Long Glass to the Glazier's Shop
  { pts: [[-30, -76], [-30, -102]], w: 2.4, h: 4.2 },                    // the Dressing Rooms to the Glass Maze
  { pts: [[-5, -90], [-14, -90], [-14, -133]], w: 3, h: 5.5 },           // the Narrowing, from the Long Glass's foot round to the Hall
  { pts: [[-24, -118], [-24, -138], [-16, -138]], w: 2.4, h: 4.2 },      // the Maze to the Hall
  { pts: [[44, -98], [44, -140], [16, -150]], w: 2.4, h: 4.4 },          // the Glazier's way, from his shop round to the Hall
  // The Covered Room: behind a draped glass in the Long Glass's west wall. On no map.
  { pts: [[-5, -36], [-21, -36]], w: 1.3, h: 3, dark: true },
  // Where the images come out of the walls.
  { pts: [[48, -82], [55, -82]], w: 2, h: 4, dead: true, door: 'hm_work' },
  { pts: [[-16, -143], [-23, -143]], w: 2, h: 4, dead: true, door: 'hm_hall' },
  { pts: [[16, -142], [23, -142]], w: 2, h: 4, dead: true, door: 'hm_hall' },
  { pts: [[11, -159], [11, -166]], w: 2, h: 4, dead: true, door: 'hm_hall' },
];

// Where the Glazier's reflections stand in his shop, each before a glass (src/sim/castle-fights-b.js glazier).
export const GLASS_SPOTS = [[25, -79], [47, -78.6], [47, -95], [25, -96], [37, -97]];
// The Hall of Mirrors' middle line (x): the Glass stands across it from the Duchess, as far the other side.
export const HALL_AXIS = 0;
// Where each uncovered great glass's image steps out into the Hall: [x, z, the pack whose room its glass is in].
export const IMAGE_GLASSES = [[-14.6, -149.5, 'hm_east'], [14.6, -156.5, 'hm_west'], [0, -157, 'hm_maze']];
// The maze's walls of panes: [x, z, half along x, half along z]. A way round (east and south), a way in (west, then north).
const MAZE = [[-36.2, -105, 8.2, 0.3], [-28, -111.5, 0.3, 6.5], [-34, -118, 6, 0.3], [-40, -114, 0.3, 4]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Silvered Door: low. A glass each side of the way in (one broken), the door back out to the High Ward's
  // terrace in the east wall. A fire at the way in, one where it opens into the Long Glass.
  add('lintel', 0, -2, { hx: 4.5, stone: 'dark:ashlar' });
  add('bigmirror', -4.4, -10, { yaw: PI / 2, w: 1.4, h: 3.4 }); add('bigmirror', -4.4, -25, { yaw: PI / 2, w: 1.4, h: 3.4, broken: true }); add('bigmirror', 4.4, -26, { yaw: -PI / 2, w: 1.4, h: 3.4 });
  add('carpet', 0, -15, { hx: 1.2, hz: 18, layer: 'dark:cloth_oat' }); add('brazier', 3.9, -5); add('brazier', -3.2, -34);
  add('mark', 4.25, -12, { up: 3.2, r: 0.5, yaw: -PI / 2, back: -1 });
  // ---- the Long Glass: the hall of glass. Great mirrors down both walls, never two facing each other square, and one
  // the height of the room closing its far end: what you walk toward from the door. One draped, with a way behind it.
  // Three rings of candles down it; nothing else lit: the glass gives them back.
  add('bigmirror', 0, -93.9, { yaw: 0, w: 4, h: 11.4 });
  [-36, -54, -62, -70, -90].forEach((z) => add('bigmirror', 6.9, z, { yaw: -PI / 2, w: 2, h: 6.4 }));
  [-44, -52, -60, -76].forEach((z) => add('bigmirror', -6.9, z, { yaw: PI / 2, w: 2, h: 6.4 }));
  add('bigmirror', -6.4, -36.4, { yaw: PI / 2 + 0.3, w: 1.5, h: 4.6, draped: true });
  add('bigmirror', -6.9, -83, { yaw: PI / 2, w: 2, h: 6.4, broken: true }); add('shards', -4.6, -84, { r: 1.3 });
  for (const z of [-42, -62, -82]) add('chandelier', 0, z, { up: 7, hang: true });
  add('carpet', 0, -62, { hx: 1.4, hz: 30, layer: 'dark:cloth_oat' });
  add('stand', 5.6, -31.6);
  // ---- the Covered Room: every glass in it draped; a chair turned to the wall; what was hidden with them.
  add('bigmirror', -28.4, -36, { yaw: PI / 2, w: 1.3, h: 3, draped: true }); add('bigmirror', -24, -40.4, { yaw: 0, w: 1.3, h: 3, draped: true });
  add('seat', -26.6, -33.2, { hx: 0.5, hz: 0.5, stone: 'dark:wood', yaw: PI }); add('candles', -21, -39.4, { up: 0.1 }); add('crates', -21, -32.8);
  // ---- the Cabinet of Faces: low. One great glass uncovered on the east wall; portraits with no faces in them; small
  // glasses; a table of masks. A fire before the great glass.
  add('bigmirror', 35.9, -48, { yaw: -PI / 2, w: 2.2, h: 4 });
  [23, 28, 33].forEach((x, i) => add('portrait', x, -40.45, { yaw: PI, sz: 0.85 + 0.12 * (i % 2), up: 0.2 }));
  [23.4, 26.6].forEach((x) => add('mirror', x, -55.5, { yaw: 0 }));
  add('table', 26, -49, { hx: 2, hz: 0.8 }); add('candles', 25.4, -49, { up: 0.85 }); add('carpet', 27, -48, { hx: 4.5, hz: 4, layer: 'dark:cloth_oat' });
  add('brazier', 33.4, -44.6);
  // ---- the Dressing Rooms: one great glass uncovered on the west wall; gowns on their forms in the court's grey and
  // gold; glasses on stands. A fire before the great glass.
  add('bigmirror', -38.9, -68, { yaw: PI / 2, w: 2.2, h: 4.6 });
  add('gownform', -35, -62); add('gownform', -25, -61, { skirt: 'pale:cloth_oat', bodice: 'dark:cloth_oat' }); add('gownform', -36, -75.4, { skirt: 'pale:cloth_oat', bodice: 'dark:cloth_oat' }); add('gownform', -24.6, -74.6);
  add('pane', -30.6, -73, { yaw: 0.5, w: 0.8, h: 2 }); add('pane', -27, -64.6, { yaw: -0.9, w: 0.8, h: 2 });
  add('table', -22.4, -61.4, { hx: 0.7, hz: 1.6 }); add('candles', -22.4, -61, { up: 0.85 });
  add('brazier', -36.4, -64.4);
  // ---- the Glazier's Shop: a glass before each place a reflection stands; the silvering table, the vat of quicksilver,
  // panes leant on the wall, shards swept into heaps. Fire at the way in and at the table; a hung fire over the middle.
  add('bigmirror', 22.1, -79, { yaw: PI / 2, w: 1.5, h: 4.2 }); add('bigmirror', 49.9, -78.2, { yaw: -PI / 2, w: 1.4, h: 4.2 }); add('bigmirror', 49.9, -95, { yaw: -PI / 2, w: 1.5, h: 4.2 });
  add('bigmirror', 22.1, -96, { yaw: PI / 2, w: 1.5, h: 4.2 }); add('bigmirror', 37, -99.9, { yaw: 0, w: 1.8, h: 4.8 });
  add('table', 30, -92, { hx: 2.6, hz: 1.1, solid: true });
  // (Benches of glass and frames; two fires hung over them.)
  add('glassbench', 41, -84, { hx: 2.4, yaw: 0.2 }); add('glassbench', 43, -93, { hx: 2.2, yaw: -1.2 }); add('glassbench', 27, -97.4, { hx: 2.2, yaw: 0 }); add('glassbench', 31, -82, { hx: 2, yaw: PI });
  add('basket', 33, -88, { up: 6 }); add('basket', 41.5, -89, { up: 6 }); add('vat', 40, -78.4, { r: 0.9 }); add('tools', 23, -89.6, { yaw: PI / 2 });
  add('pane', 42.4, -98.6, { yaw: 0.15, w: 1, h: 2.2 }); add('shards', 45, -90, { r: 1.5 }); add('shards', 28.4, -86.4, { r: 1.1 }); add('crates', 48.2, -88.4);
  add('brazier', 28.6, -78.4); add('brazier', 35.4, -78.4); add('brazier', 33.8, -95.6);
  // ---- the Glass Maze: low. Its walls of panes (they stop a body), a great glass uncovered at its heart. A fire at two
  // corners; the heart is dark but for what the glass gives back.
  for (const [x, z, hx, hz] of MAZE) add('pane', x, z, { yaw: hx > hz ? 0 : PI / 2, w: Math.max(hx, hz), h: 3.2, hx, hz, solid: true });
  add('bigmirror', -36, -105.7, { yaw: PI, w: 2, h: 3.6 }); add('rings', -34, -112, { r: 2 });
  add('shards', -43.6, -121.4, { r: 1.2 }); add('shards', -24.6, -107, { r: 1 });
  add('brazier', -43.8, -102.4); add('brazier', -43.8, -121.8);
  // (Fire hung low in its ways: the panes take it and give it back.)
  add('basket', -32, -108.4, { up: 3.4 }); add('basket', -36.4, -114.6, { up: 3.4 }); add('basket', -25, -118, { up: 3.4 });
  // ---- the Hall of Mirrors: one glass the height of the hall in its far wall, what you see from each way in; great
  // glasses down both long walls, none square to another; her chair turned to face the great glass. Two rings of candles,
  // a fire each side of the great glass.
  add('bigmirror', 0, -160.9, { yaw: 0, w: 5, h: 12.6 }); add('bigmirror', -10.5, -160.9, { yaw: 0, w: 2.2, h: 9 });
  [-146, -153.6].forEach((z) => add('bigmirror', -17.9, z, { yaw: PI / 2, w: 2.4, h: 9 }));
  [-135, -156.5].forEach((z) => add('bigmirror', 17.9, z, { yaw: -PI / 2, w: 2.4, h: 9 }));
  add('seat', 7, -153, { hx: 1, hz: 0.9, stone: 'dark:stone', yaw: 0 }); add('mark', 6, -131.4, { up: 8, r: 1.3, back: 1 });
  add('chandelier', -7, -141, { up: 9, hang: true }); add('chandelier', 7, -150, { up: 9, hang: true });
  add('carpet', 0, -146, { hx: 2.4, hz: 13, layer: 'dark:cloth_oat' }); add('shards', 14, -160, { r: 1.4 });
  add('brazier', -6.6, -159.2); add('brazier', 6.6, -159.2); add('brazier', -10, -132.6);
}

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const GOWNS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const FACES = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
// (None in the Silvered Door: it's where you wake if you fall.)
const packs = [
  { key: 'hm_long_n', room: 'hm_long', pick: KNIGHTS, n: 4, pal: ['Greygold'], at: [0, 16], r: 2.5 },
  { key: 'hm_long_s', room: 'hm_long', pick: GOWNS.concat(KNIGHTS), n: 5, elite: ['possessed_knight_3'], pal: ['Greygold'], tough: { hp: 1.2, damage: 1.2 }, at: [0, -16], r: 2.5 },
  { key: 'hm_east', room: 'hm_east', pick: FACES, n: 6, pal: ['Porcelain', 'Greygold'], at: [-1, 0], r: 3 },
  { key: 'hm_west', room: 'hm_west', pick: GOWNS, n: 6, elite: ['necromancer_f2'], pal: ['Porcelain', 'Greygold'], tough: { hp: 1.3, damage: 1.2 }, at: [1, 0], r: 3 },
  { key: 'hm_maze', room: 'hm_maze', pick: ['night_demon_black', 'night_demon_blue'], n: 3, pal: ['Greygold', 'Ashen'], ai: 'stalker', tough: { hp: 1.5, damage: 1.3 }, at: [0, -9.2], r: 1.6 },
  // The court's guard, up and down the Narrowing.
  { key: 'hm_narrow', room: 'hm_long', pick: KNIGHTS, n: 3, pal: ['Greygold'], at: [-14, -42], r: 1, walk: [[-14, -98], [-14, -112], [-14, -126]] },
];
const bosses = [
  { key: 'glazier', room: 'hm_work', name: 'The Glazier', models: ['hm_glazier'], pal: ['Greygold'], hp: 94000, damage: 395, reach: 3.0, loot: 8, at: [0, 3] },
  { key: 'duchess', room: 'hm_hall', name: 'The Duchess and Her Glass', models: ['hm_duchess', 'hm_glass'], names: ['The Duchess', 'The Duchess'], pal: ['Greygold'], hp: 128000, damage: 405, reach: 3.0, loot: 0, at: [0, -2], needs: ['glazier'], shut: 'dch_shut', gives: 'key:mirrors' },
];
const warnings = {
  gla_open: 'The Glazier. He pulls reflections out of the glass and stands them round his shop: every one standing throws his glare back at you, and takes a share of what he is dealt. Break them.',
  gla_glare: 'The Glazier throws his glare! Out of the line. And out of the lines the reflections throw back.',
  gla_shards: 'Glass comes down! Out of the circles.',
  gla_slash: 'He cuts with a pane! Out of the arc.',
  gla_splinters: 'Splinters, flung all round! Stand between two.',
  gla_quake: 'He breaks a glass on the floor! Jump the ring as it reaches you.',
  gla_pane: 'He pulls a reflection out of the glass! Break it.',
  gla_break: 'A reflection breaks: he feels it.',
  gla_turn: 'The Glazier turns on you! Get behind the tank, or out of his reach, till he lets go.',
  gla_enrage: 'The Glazier is enraged!',
  dch_shut: "The Hall of Mirrors is shut. Its doors open when her Glazier's dead.",
  dch_open: 'The Duchess and her Glass. There are two of her. One is her: she bleeds. The other is only in the glass, across the hall from her: nothing touches it, and what it throws is pale. Strike the one that bleeds. When they change places, find her again. (And every great glass you left uncovered on the way gives up an image to her: there is one in the Cabinet of Faces, one in the Dressing Rooms, one in the Glass Maze. Empty a room and its glass is draped.)',
  dch_draped: 'Every great glass on your way here is draped: no image comes to her.',
  dch_images: 'The glasses you left uncovered give up their images!',
  dch_fan: 'Shards from her hand! Out of their way.',
  dch_sweep: 'She cuts! Out of the arc.',
  dch_lance: 'A lance of light! Out of the line.',
  dch_rain: 'The chandeliers shed their glass! Out of the circles.',
  dch_wave: 'The floor rings like a glass! Jump the ring as it reaches you.',
  dch_swap: 'THEY CHANGE PLACES! The one that bled is glass now: find her again.',
  dch_turn: 'The Duchess turns on you! Get behind the tank, or out of her reach, till she lets go.',
  dch_enrage: 'The Duchess is enraged!',
};

export const MIRRORS = {
  key: 'mirrors', tag: 'hm', name: 'Castle Velscour: the Hall of Mirrors', short: 'the Hall of Mirrors', x: 15760, z: -5700, y: -60, level: 106, style: 'castle',
  castle: true, dungeon: true,
  // (Gone into only from the High Ward: no door of its own out on the land. Its portal is the castle's gate, as the wards' is.)
  within: 'highward',
  rooms, tunnels, props, packs, bosses, warnings,
  turnWarn: { glazier: 'gla_turn', duchess: 'dch_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: -15.4, z: -158 },
  portal: LOWER_WARD.portal,
  // Its door back out onto the High Ward's south terrace.
  links: [{ x: 3, z: -12, yaw: -PI / 2, to: 'highward', n: 4 }],
  chests: [
    { id: 'covered', room: 'hm_dark', x: -26.6, z: -38.6, yaw: 0.8, loot: 3 },
    { id: 'heart', room: 'hm_maze', x: -34, z: -115.6, yaw: 0, loot: 3 },
    { id: 'cabinet', room: 'hm_east', x: 34.4, z: -41.6, yaw: -2.4, loot: 2 },
  ],
  vistas: [{ id: 'maze_heart', name: 'the Heart of the Glass Maze', room: 'hm_maze', x: -34, z: -111.4, r: 3.4 }],
  auto: { way: ['hm_door', 'hm_long', 'hm_dark', 'hm_long', 'hm_east', 'hm_long', 'hm_west', 'hm_maze', 'hm_west', 'hm_long', 'hm_work', 'hm_long', 'hm_hall'] },
  shots: [
    ['hm_long', 'hm_door', [0, 2.4, -31], [0, 4.4, -94]],
    ['hm_maze', 'hm_west', [-30, 3.4, -100.8], [-36, 1, -116]],
    ['hm_work', 'hm_east', [32, 3, -77.2], [40, 2.4, -99]],
    ['hm_hall', 'hm_long', [-14, 3, -131.8], [2, 6.5, -161]],
  ],
  last: 'duchess', tough: { hp: 40, damage: 4.2 }, pay: { xp: 128000, gold: 15000 },
  names: { "Velscour's Knights": 'COURT GUARD', 'Haunted Mannequins': 'EMPTY GOWN', 'The Possessed': 'THE FACELESS', 'Night Paralysis Demons': 'GLASS-SHADE', Necromancers: 'LADY OF THE GLASS' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_greygold', roof: 'dark:stone', flame: 'flame', light: [1, 0.84, 0.62], fire: [1, 0.86, 0.66], every: 15, high: 3, glow: 3.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Hall of Mirrors. His court came here to look at itself. What looked back is still here.', clear: 'The Duchess is dead, and her Glass is only glass.', wipe: 'You fall... and wake inside the Silvered Door.' },
};
export const MIRRORS_VARIANTS = {
  hm_glazier: { src: 'possessed_man_2', alt: 'possessed_man_1', height: 3.4, name: 'THE GLAZIER' },
  hm_reflection: { src: 'mannequin_2', alt: 'mannequin_1', height: 1.9, name: 'REFLECTION' },
  hm_duchess: { src: 'necromancer_f1', alt: 'necromancer_f2', height: 3.4, name: 'THE DUCHESS' },
  hm_glass: { src: 'necromancer_f1', alt: 'necromancer_f2', height: 3.4, name: 'THE DUCHESS' },
  hm_image: { src: 'mannequin_3', alt: 'mannequin_1', height: 2.0, name: 'IMAGE' },
};
