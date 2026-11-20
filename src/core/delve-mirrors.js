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

const rooms = [
  R('hm_door', 'the Silvered Door', 0, -12, 5, 20, 0, 9, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', fires: 14 }),
  R('hm_long', 'the Long Glass', 0, -62, 8, 34, 0, 12, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 11 }),
  R('hm_dark', 'the Covered Room', -27, -34, 5, 5, 0, 5, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('hm_east', 'the Cabinet of Faces', 36, -50, 12, 12, 0, 9, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 9, cloth: 'p2_banner_greygold', fires: 13 }),
  R('hm_west', 'the Dressing Rooms', -38, -70, 12, 14, 0, 9, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 13 }),
  R('hm_work', "the Glazier's Shop", 44, -92, 16, 14, 0, 12, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 12 }),
  R('hm_maze', 'the Glass Maze', -44, -118, 16, 16, 0, 9, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 16 }),
  R('hm_hall', 'the Hall of Mirrors', 0, -150, 26, 22, 0, 20, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_mausoleum_marble', banners: 0, fires: 10 }),
];

const tunnels = [
  { pts: [[6, -46], [26, -46]], w: 2.6, h: 4.6 },                        // the Long Glass to the Cabinet of Faces
  { pts: [[-6, -70], [-28, -70]], w: 2.6, h: 4.6 },                      // the Long Glass to the Dressing Rooms
  { pts: [[40, -60], [40, -80]], w: 2.6, h: 4.6 },                       // the Cabinet to the Glazier's Shop
  { pts: [[6, -82], [30, -88]], w: 3, h: 4.6 },                          // the Long Glass to the Glazier's Shop
  { pts: [[-40, -82], [-40, -104]], w: 2.6, h: 4.6 },                    // the Dressing Rooms to the Glass Maze
  { pts: [[-6, -92], [-16, -92], [-16, -130]], w: 3.5, h: 6 },           // the Narrowing, from the Long Glass's foot round to the Hall
  { pts: [[-30, -126], [-24, -140]], w: 2.6, h: 4.6 },                   // the Maze to the Hall
  { pts: [[52, -104], [52, -150], [24, -160]], w: 2.6, h: 4.6 },         // the Glazier's way, from his shop round to the Hall
  // The Covered Room: behind a draped glass in the Long Glass's west wall. On no map.
  { pts: [[-6, -34], [-24, -34]], w: 1.3, h: 3, dark: true },
  // Where the images come out of the walls.
  { pts: [[58, -84], [65, -84]], w: 2, h: 4, dead: true, door: 'hm_work' },
  { pts: [[-24, -134], [-31, -134]], w: 2, h: 4, dead: true, door: 'hm_hall' },
  { pts: [[24, -138], [31, -138]], w: 2, h: 4, dead: true, door: 'hm_hall' },
  { pts: [[-6, -170], [-6, -177]], w: 2, h: 4, dead: true, door: 'hm_hall' },
];

// Where the Glazier's reflections stand in his shop, each before a glass (src/sim/castle-fights-b.js glazier).
export const GLASS_SPOTS = [[32, -82], [56, -82], [57, -98], [32, -100], [44, -103]];
// The Hall of Mirrors' middle line (x): the Glass stands across it from the Duchess, as far the other side.
export const HALL_AXIS = 0;
// Where each uncovered great glass's image steps out into the Hall: [x, z, the pack whose room its glass is in].
export const IMAGE_GLASSES = [[-22, -136, 'hm_east'], [22, -140, 'hm_west'], [-4, -168, 'hm_maze']];
// The maze's walls of panes: [x, z, half along x, half along z]. A way round (east and south), a way in (west, then north).
const MAZE = [[-48, -108, 12, 0.3], [-36, -117, 0.3, 9], [-44, -126, 8, 0.3], [-52, -120, 0.3, 6]];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Silvered Door: a glass each side of the way in (one broken), his mark, the door back out to the High Ward's
  // terrace in the east wall.
  add('lintel', 0, -2, { hx: 5, stone: 'dark:ashlar' });
  add('bigmirror', -4.9, -8, { yaw: PI / 2, w: 1.5, h: 4 }); add('bigmirror', -4.9, -22, { yaw: PI / 2, w: 1.5, h: 4, broken: true }); add('bigmirror', 4.9, -24, { yaw: -PI / 2, w: 1.5, h: 4 });
  add('carpet', 0, -12, { hx: 1.4, hz: 16, layer: 'dark:cloth_oat' }); add('brazier', 3.6, 2); add('brazier', -3.6, -29);
  add('mark', 4.75, -12, { up: 5.6, r: 0.6, yaw: -PI / 2, back: -1 });
  // ---- the Long Glass: great mirrors down both walls, never two facing each other square; one draped, with a way
  // behind it; chandeliers; a runner; what the court left.
  [-38, -54, -64, -74, -92].forEach((z) => add('bigmirror', 7.9, z, { yaw: -PI / 2, w: 2, h: 6 }));
  [-44, -57, -80].forEach((z) => add('bigmirror', -7.9, z, { yaw: PI / 2, w: 2, h: 6 }));
  add('bigmirror', -7.4, -34.6, { yaw: PI / 2 + 0.3, w: 1.6, h: 5, draped: true });
  add('bigmirror', 2, -95.9, { yaw: 0, w: 2, h: 6, broken: true });
  for (const z of [-40, -62, -84]) add('chandelier', 0, z, { up: 7, hang: true });
  add('carpet', 0, -62, { hx: 1.6, hz: 32, layer: 'dark:cloth_oat' });
  add('stand', -6.4, -50); add('stand', 6.4, -70); add('shards', 2, -93.4, { r: 1.5 }); add('bench', 5.6, -30, { hx: 0.25, hz: 2 });
  // ---- the Covered Room: every glass in it draped; a chair turned to the wall; what was hidden with them.
  add('bigmirror', -31.9, -34, { yaw: PI / 2, w: 1.4, h: 3.4, draped: true }); add('bigmirror', -27, -38.9, { yaw: 0, w: 1.4, h: 3.4, draped: true });
  add('seat', -29.4, -31, { hx: 0.5, hz: 0.5, stone: 'dark:wood', yaw: PI }); add('candles', -24, -37.6, { up: 0.1 }); add('crates', -24, -30.6);
  // ---- the Cabinet of Faces: portraits with no faces in them, small glasses between them, one great glass uncovered on
  // the east wall, a table of masks.
  add('bigmirror', 47.9, -50, { yaw: -PI / 2, w: 2.4, h: 5.4 });
  [-42, -58].forEach((z) => add('portrait', 47.5, z, { yaw: -PI / 2, sz: 1.1, up: 0.4 }));
  [28, 36, 44].forEach((x, i) => add('portrait', x, -38.45, { yaw: PI, sz: 0.9 + 0.15 * (i % 2), up: 0.3 }));
  [30, 42].forEach((x) => add('mirror', x, -61.5, { yaw: 0 }));
  add('table', 36, -50, { hx: 2.4, hz: 0.9 }); add('candles', 35, -50, { up: 0.85 }); add('carpet', 36, -50, { hx: 6, hz: 5, layer: 'dark:cloth_oat' });
  add('stand', 26, -40); add('brazier', 27, -58); add('brazier', 45, -42);
  // ---- the Dressing Rooms: gowns on forms, glasses on stands, one great glass uncovered on the west wall.
  add('bigmirror', -49.9, -70, { yaw: PI / 2, w: 2.4, h: 5.4 });
  for (const [x, z, yaw] of [[-44, -60, 0.4], [-32, -62, -0.6], [-46, -80, 1.2], [-30, -78, 2.4]]) add('dressform', x, z, { r: 0.6, yaw });
  add('pane', -38, -76, { yaw: 0.5, w: 0.8, h: 2 }); add('pane', -34, -66, { yaw: -0.9, w: 0.8, h: 2 });
  add('coatrail', -38, -57.2, { hx: 3 }); add('table', -27.4, -74, { hx: 0.7, hz: 2 }); add('candles', -27.4, -73, { up: 0.85 });
  add('brazier', -30, -82); add('brazier', -46, -66);
  // ---- the Glazier's Shop: the silvering table, the vat of quicksilver, glass leant on the walls, shards swept into
  // heaps; a glass before each place a reflection stands.
  add('table', 38, -96, { hx: 3, hz: 1.2, solid: true }); add('vat', 52, -80.6, { r: 1 }); add('tools', 30, -90, { yaw: PI / 2 });
  add('bigmirror', 28.1, -82, { yaw: PI / 2, w: 1.6, h: 4.4 }); add('bigmirror', 59.9, -80, { yaw: -PI / 2, w: 1.6, h: 4.4 }); add('bigmirror', 59.9, -98, { yaw: -PI / 2, w: 1.6, h: 4.4 });
  add('bigmirror', 28.1, -100, { yaw: PI / 2, w: 1.6, h: 4.4 }); add('bigmirror', 44, -105.9, { yaw: 0, w: 1.8, h: 4.8 });
  add('pane', 38, -79.6, { yaw: 0.1, w: 1.2, h: 2.4 }); add('pane', 54, -104.4, { yaw: 0.2, w: 1, h: 2.2 });
  add('shards', 50, -100, { r: 1.6 }); add('shards', 33, -89, { r: 1.2 }); add('crates', 58, -90);
  add('brazier', 38, -86); add('brazier', 52, -96);
  // ---- the Glass Maze: its walls of panes (they stop a body), a great glass uncovered at its heart, shards.
  for (const [x, z, hx, hz] of MAZE) add('pane', x, z, { yaw: hx > hz ? 0 : PI / 2, w: Math.max(hx, hz), h: 3.2, hx, hz, solid: true });
  add('bigmirror', -44, -109, { yaw: PI, w: 2.2, h: 4.6 }); add('circle', -44, -118, { r: 2.2 });
  add('shards', -57, -131, { r: 1.4 }); add('shards', -32, -112, { r: 1.2 });
  add('brazier', -57, -105); add('brazier', -31, -131);
  // ---- the Hall of Mirrors: great glasses all down both long walls, set a little off from each other across the hall;
  // three of them the glasses the images come out of; her chair at the far end, turned to face its own glass; chandeliers.
  [-136, -148, -160].forEach((z) => add('bigmirror', -25.9, z, { yaw: PI / 2, w: 2.6, h: 9 }));
  [-142, -154, -166].forEach((z) => add('bigmirror', 25.9, z, { yaw: -PI / 2, w: 2.6, h: 9 }));
  add('bigmirror', -4, -171.9, { yaw: 0, w: 3, h: 10 }); add('bigmirror', 12, -171.9, { yaw: 0, w: 2, h: 8, broken: true });
  add('seat', 6, -166, { hx: 1, hz: 0.9, stone: 'dark:stone', yaw: 0 }); add('mark', 8, -128.4, { up: 9, r: 1.4, back: -1 });
  for (const [x, z] of [[-12, -142], [12, -158], [-10, -160], [10, -140]]) add('chandelier', x, z, { up: 10, hang: true });
  add('carpet', 0, -150, { hx: 3, hz: 18, layer: 'dark:cloth_oat' }); add('shards', 16, -168, { r: 1.6 });
  for (const [x, z] of [[-22, -130], [22, -130], [-22, -170], [22, -170]]) add('brazier', x, z);
}

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const GOWNS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const FACES = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
// (None in the Silvered Door: it's where you wake if you fall.)
const packs = [
  { key: 'hm_long_n', room: 'hm_long', pick: KNIGHTS, n: 4, pal: ['Greygold'], at: [0, 16], r: 3 },
  { key: 'hm_long_s', room: 'hm_long', pick: GOWNS.concat(KNIGHTS), n: 5, elite: ['possessed_knight_3'], pal: ['Greygold'], tough: { hp: 1.2, damage: 1.2 }, at: [0, -18], r: 3 },
  { key: 'hm_east', room: 'hm_east', pick: FACES, n: 6, pal: ['Porcelain', 'Greygold'], at: [-2, 0], r: 4 },
  { key: 'hm_west', room: 'hm_west', pick: GOWNS, n: 6, elite: ['necromancer_f2'], pal: ['Porcelain', 'Greygold'], tough: { hp: 1.3, damage: 1.2 }, at: [2, 0], r: 4 },
  { key: 'hm_maze', room: 'hm_maze', pick: ['night_demon_black', 'night_demon_blue'], n: 3, pal: ['Greygold', 'Ashen'], ai: 'stalker', tough: { hp: 1.5, damage: 1.3 }, at: [0, -13], r: 2 },
  // The court's guard, up and down the Narrowing.
  { key: 'hm_narrow', room: 'hm_long', pick: KNIGHTS, n: 3, pal: ['Greygold'], at: [-16, -48], r: 1, walk: [[-16, -100], [-16, -112], [-16, -124]] },
];
const bosses = [
  { key: 'glazier', room: 'hm_work', name: 'The Glazier', models: ['hm_glazier'], pal: ['Greygold'], hp: 94000, damage: 395, reach: 3.0, loot: 8, at: [0, 7] },
  { key: 'duchess', room: 'hm_hall', name: 'The Duchess and Her Glass', models: ['hm_duchess', 'hm_glass'], names: ['The Duchess', 'The Duchess'], pal: ['Greygold'], hp: 128000, damage: 405, reach: 3.0, loot: 0, at: [0, -6], needs: ['glazier'], shut: 'dch_shut', gives: 'key:mirrors' },
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
  dch_open: 'The Duchess and her Glass. There are two of her. One is her: she bleeds. The other is only in the glass, across the hall from her: nothing touches it, and what it throws is pale. Strike the one that bleeds. When they change places, find her again.',
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
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 18, z: -168.4 },
  portal: LOWER_WARD.portal,
  // Its door back out onto the High Ward's south terrace.
  links: [{ x: 3.4, z: -12, yaw: -PI / 2, to: 'highward', n: 4 }],
  chests: [
    { id: 'covered', room: 'hm_dark', x: -29, z: -36.6, yaw: 0.8, loot: 3 },
    { id: 'heart', room: 'hm_maze', x: -44, z: -122.6, yaw: 0, loot: 3 },
    { id: 'cabinet', room: 'hm_east', x: 46, z: -60, yaw: -2.4, loot: 2 },
  ],
  vistas: [{ id: 'maze_heart', name: 'the Heart of the Glass Maze', room: 'hm_maze', x: -44, z: -117, r: 4 }],
  auto: { way: ['hm_door', 'hm_long', 'hm_dark', 'hm_long', 'hm_east', 'hm_long', 'hm_west', 'hm_maze', 'hm_west', 'hm_long', 'hm_work', 'hm_long', 'hm_hall'] },
  shots: [
    ['hm_long', 'hm_door', [0, 2.4, -30], [0, 3.4, -96]],
    ['hm_maze', 'hm_west', [-40, 4.5, -103], [-46, 1, -124]],
    ['hm_work', 'hm_east', [40, 3, -79], [48, 2, -104]],
    ['hm_hall', 'hm_long', [-14, 3, -129.5], [2, 5, -172]],
  ],
  last: 'duchess', tough: { hp: 40, damage: 4.2 }, pay: { xp: 128000, gold: 15000 },
  names: { "Velscour's Knights": 'COURT GUARD', 'Haunted Mannequins': 'EMPTY GOWN', 'The Possessed': 'THE FACELESS', 'Night Paralysis Demons': 'GLASS-SHADE', Necromancers: 'LADY OF THE GLASS' },
  look: { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_greygold', roof: 'dark:stone', flame: 'flame', light: [1, 0.84, 0.62], fire: [1, 0.86, 0.66], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Hall of Mirrors. His court came here to look at itself. What looked back is still here.', clear: 'The Duchess is dead, and her Glass is only glass.', wipe: 'You fall... and wake inside the Silvered Door.' },
};
export const MIRRORS_VARIANTS = {
  hm_glazier: { src: 'possessed_man_2', alt: 'possessed_man_1', height: 2.8, name: 'THE GLAZIER' },
  hm_reflection: { src: 'mannequin_2', alt: 'mannequin_1', height: 1.9, name: 'REFLECTION' },
  hm_duchess: { src: 'necromancer_f1', alt: 'necromancer_f2', height: 2.9, name: 'THE DUCHESS' },
  hm_glass: { src: 'necromancer_f1', alt: 'necromancer_f2', height: 2.9, name: 'THE DUCHESS' },
  hm_image: { src: 'mannequin_3', alt: 'mannequin_1', height: 2.0, name: 'IMAGE' },
};
