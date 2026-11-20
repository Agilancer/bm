// Castle Velscour's High Ward, and what lies behind the Ancient Library: the Deep Stacks and Pell's Holdout
// (docs/PHOBOS-CASTLE.md; src/core/dungeon.js DELVES takes them in after the Iron Barracks). Written as the wards are
// (src/core/delve-castle.js): each a delve gone into only from the Middle Ward, x east and z south of its way in.
//
// The Deep Stacks: behind a bookcase in the Librarian's Rooms, a stair down to the library the castle forgot it had. The
// Well of Books at its foot, six storeys of shelves round a shaft; off its west side, behind a hanging, Pell's Holdout:
// the people the Librarian has hidden for forty years, a town of thirty in a reading room (nothing of his comes here: a
// rest point, and where the Librarian's errands round the castle are given). East, the Chained Stacks and the Restricted
// Vault, where the Censor burns what's not to be read; south, the Scriptorium, the Scriveners' Lift up to the High Ward
// (barred from above: unbarred from the Gargoyles' Roost, it's the way home from the top of the castle), and the Sump,
// down which the Drowned Archive's water comes (barred from below).
//
// The High Ward: his own. The Sanctuaries, the black nave where his court prays to him; the Chapel Court off it, the
// Ossuary Chapel's door, the Reliquary behind its bone lock; the Generals' Crypt (the Crypt door up from the Oubliettes
// lets in here); the Mirror Gallery and the Hall of Mirrors' door; the Treasury; the Observatory, where the Star-Reader
// keeps his sky; the Gargoyles' Roost, a thieves' camp in the roofs behind the Treasury's hangings, on no map; and behind
// the silvered door the Throne Antechambers, where the Sexton of the High Ward keeps the way up to the Keep.
//
// His castle, so nothing of Tessariel's is in it (README "The two sides"): no bells, no seals of hers, no gilt sun, no
// crosses; no two ways off a room straight across from each other. The Holdout's people show nothing of whom they serve.
// Liveries: royal blue in the Stacks; white with skulls in the Sanctuaries, the Court and the Antechambers; grey with gold
// in the Crypt, the Mirror Gallery and the Treasury; his red in the Observatory. (Blue never beside grey with gold.)
import { R } from './delve-lay.js';
import { LOWER_WARD } from './delve-castle.js';

const PI = Math.PI;
const LOOK = { wall: 'ashlar', foot: 'dark:block', floor: 'flags', banner: 'p2_banner_skull', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.46, 0.2], fire: [1, 0.5, 0.22], every: 8, high: 3, glow: 2.5, lit: true, beam: 'dark:stone', bays: 'chains' };

// ======== the Deep Stacks and Pell's Holdout ===================================================================================
const BOOKS = { rock: 'p2_book_spines', foot: 'dark:block', ground: 'p2_worn_floorboards' };
const dRooms = [
  R('cd_door', 'the Bookcase Door', 0, -4, 4, 10, 0, 6, { ...BOOKS, banners: 0, fires: 12 }),
  R('cd_stair', 'the Hidden Stair', 0, -32, 2.4, 23, -6, 7, { tz: 12 / 46, fires: 11, rock: 'dark:course', foot: 'dark:block', banners: 0 }),
  R('cd_well', 'the Well of Books', 0, -72, 20, 20, -12, 34, { ...BOOKS, banners: 0, fires: 13 }),
  R('cd_hold', "Pell's Holdout", -52, -74, 20, 16, -12, 13, { rock: 'p2_sooty_plaster', foot: 'block', ground: 'p2_worn_floorboards', banners: 0, fires: 9 }),
  R('cd_dorm', 'the Sleeping Shelves', -52, -108, 14, 9, -12, 8, { ...BOOKS, banners: 0, fires: 14 }),
  R('cd_chained', 'the Chained Stacks', 52, -66, 18, 15, -12, 12, { ...BOOKS, banners: 12, cloth: 'royal:cloth_red', fires: 12 }),
  R('cd_vault', 'the Restricted Vault', 56, -108, 13, 13, -12, 14, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 13, cloth: 'royal:cloth_red', fires: 13 }),
  R('cd_scriv', 'the Scriptorium', 0, -118, 18, 12, -12, 10, { rock: 'p2_sooty_plaster', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 12, cloth: 'royal:cloth_red', fires: 12 }),
  R('cd_lift', "the Scriveners' Lift", -8, -152, 7, 9, -12, 24, { rock: 'p2_curtain_granite', foot: 'dark:block', ground: 'p2_walk_paving', banners: 0, fires: 9 }),
  R('cd_sump', 'the Sump', -40, -140, 9, 8, -12, 8, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 14 }),
  R('cd_index', 'the Index Room', 28, -100, 5, 4.5, -12, 5, { ...BOOKS, banners: 0, fires: 20 }),
];
const dTunnels = [
  // Behind a hanging in the Well's west wall: the Holdout's door. A man wide, and nothing says it's there.
  { pts: [[-18, -78], [-34, -78]], w: 2, h: 3.6 },
  { pts: [[-58, -88], [-58, -101]], w: 3, h: 4 },
  // East off the Well to the Chained Stacks, and on down to the Vault.
  { pts: [[18, -64], [36, -64]], w: 4, h: 5 },
  { pts: [[60, -79], [60, -97]], w: 3.5, h: 5 },
  // South off the Well to the Scriptorium; the Scriptorium's own ways to the Vault, the Lift and the Sump.
  { pts: [[-8, -90], [-8, -108]], w: 4, h: 5 },
  { pts: [[16, -120], [45, -114]], w: 3, h: 4.5 },
  { pts: [[8, -128], [8, -150], [-3, -152]], w: 3, h: 4.5 },
  { pts: [[-16, -124], [-28, -126], [-33, -137]], w: 3, h: 4.5 },
  // The Holdout's bolt-hole: from the back of the Sleeping Shelves down to the Sump. On no map.
  { pts: [[-46, -115], [-46, -134]], w: 1.3, h: 3 },
  // And behind a case in the Well's south-east corner, the Index Room.
  { pts: [[17, -89], [25, -97]], w: 1.3, h: 3 },
];
// The Censor's reading daises in the Restricted Vault: where the ink doesn't reach (src/sim/castle-fights-h.js censor).
export const VAULT_DAISES = [[48, -100], [64, -100], [48, -116], [64, -116]];
const dDaises = VAULT_DAISES.map(([x, z]) => ({ x, z, hx: 2.2, hz: 2.2, dy: 0.45 }));

const dProps = [];
{
  const add = (kind, x, z, o = {}) => dProps.push({ kind, x, z, ...o });
  // ---- the Bookcase Door: the back of the Librarian's bookcase, a lamp, coats: who goes down takes one.
  add('bookcase', -3.5, -2, { hx: 0.4, hz: 3, h: 3.2, one: 1 }); add('coatrail', 3.4, -6, { hx: 2, yaw: PI / 2 }); add('candles', 3, 1, { up: 0.1 });
  add('lintel', 0, -12, { hx: 2.6, stone: 'wood' });
  // ---- the Well of Books: cases out from the walls in bays, six storeys of spines over them; the shaft in its middle, a
  // kerb round it and black air under; reading tables; chandeliers hung low over the tables; the hanging on the west wall
  // that's a door, and a case out of line in the south-east corner that's another.
  add('pit', 0, -72, { r: 5 }); add('daylight', 0, -72, { r: 5, pool: false });
  for (const [x, z] of [[-13, -58], [13, -58], [-13, -86], [13, -86]]) add('bookcase', x, z, { hx: 4, hz: 0.45, h: 5 });
  add('bookcase', 17.6, -86.4, { hx: 0.45, hz: 2.2, h: 4.6, yaw: 0.5 });
  add('table', -9, -66, { hx: 0.7, hz: 3, cloth: 'royal:cloth_oat' }); add('candles', -9, -67, { up: 0.85 }); add('bench', -10.4, -66, { hx: 0.2, hz: 2.6 });
  add('table', 9, -78, { hx: 0.7, hz: 3, cloth: 'royal:cloth_oat' }); add('candles', 9, -77, { up: 0.85 }); add('bench', 10.4, -78, { hx: 0.2, hz: 2.6 });
  add('lectern', -6, -80); add('lectern', 6, -62);
  for (const [x, z] of [[-9, -66], [9, -78], [0, -58]]) add('chandelier', x, z, { up: 7, hang: true });
  add('carpet', -17, -78, { hx: 1.4, hz: 1.6, layer: 'royal:cloth_red' });
  add('decal', -19.95, -78, { layer: 'p2_hessian', w: 3.4, h: 3.4, up: 1.8, yaw: PI / 2 });
  add('decal', 19.95, -53.05, { layer: 'p2_cobweb', w: 2.4, up: 30, yaw: PI });
  // ---- Pell's Holdout: a reading room made a town. The cook's fire and her long tables at the north end; the smith's
  // cold forge by the east door (he lights it at night, when the Forge above covers its smoke); the fence's stall; the
  // well they dug; cots behind screens of bookcases; washing on a rail; lamps everywhere, and nothing of his on any wall.
  add('hearth', -52, -58.6, { yaw: 0, great: 1.2 }); add('spit', -52, -63); add('vat', -45, -62, { r: 0.9 });
  add('table', -60, -66, { hx: 5, hz: 0.7, cloth: 'cloth_oat' }); add('bench', -60, -64.7, { hx: 4.6, hz: 0.2 }); add('bench', -60, -67.3, { hx: 4.6, hz: 0.2 });
  add('table', -46, -68, { hx: 3, hz: 0.7 }); add('candles', -58, -66, { up: 0.85 }); add('candles', -46, -68, { up: 0.85 }); add('candles', -63, -66, { up: 0.85 });
  add('anvil', -37, -84); add('tools', -34.5, -86.5, { yaw: -PI / 2 }); add('castpit', -40, -87, { r: 1.2, solid: true }); add('heap', -34, -82, { r: 0.8, layer: 'dark:rubble' });
  add('counter', -66, -80, { hx: 0.5, hz: 3 }); add('crates', -69.5, -77); add('crates', -69.5, -83); add('barrels', -69, -86.5); add('rack', -71.6, -80, { yaw: PI / 2, h: 2, n: 5 });
  add('pool', -52, -78, { r: 1.5, up: 0.5, layer: 'dark:water' });
  for (const x of [-64, -58]) add('bookcase', x, -87, { hx: 0.4, hz: 2.6, h: 2.6 });
  for (const x of [-67, -61, -55]) add('bunk', x, -88.4, { hx: 0.55, hz: 1.1, cloth: 'cloth_oat' });
  add('coatrail', -44, -89, { hx: 3 }); add('barrels', -34, -60); add('barrels', -36.5, -60.4); add('crates', -33.5, -64); add('cart', -40, -72, { yaw: 1.2 });
  add('carpet', -52, -72, { hx: 6, hz: 3, layer: 'cloth_oat' });
  for (const [x, z] of [[-60, -72], [-44, -78], [-52, -84]]) add('chandelier', x, z, { up: 5.5, hang: true });
  add('brazier', -33.5, -75); add('brazier', -70, -62);
  // ---- the Sleeping Shelves: cots in the bays between the cases, a table for the children's lessons, the bolt-hole's case.
  for (const x of [-62, -56, -50, -44]) { add('bookcase', x - 3, -104, { hx: 0.4, hz: 2.4, h: 3 }); add('bunk', x, -102.5, { hx: 0.55, hz: 1.1, cloth: x % 4 ? 'cloth_oat' : 'cloth_red' }); }
  add('table', -54, -112, { hx: 2.4, hz: 0.7 }); add('bench', -54, -113.4, { hx: 2, hz: 0.2 }); add('candles', -54, -112, { up: 0.85 });
  add('bookcase', -44.2, -115.6, { hx: 1.6, hz: 0.4, h: 2.8, yaw: 0.45 }); add('carpet', -54, -108, { hx: 5, hz: 2, layer: 'cloth_oat' });
  // ---- the Chained Stacks: cases in ranks, every book on a chain; the chains hung in loops from the beams; lecterns the
  // readers were chained to as well.
  for (const x of [40, 46, 52, 58, 64]) add('bookcase', x, -70, { hx: 0.45, hz: 5.5, h: 4.6 });
  for (const [x, z] of [[43, -58], [55, -58], [61, -76], [49, -78]]) add('chain', x, z, { up: 5 });
  add('lectern', 37, -56); add('lectern', 67, -56); add('cage', 67, -78, { up: 0 }); add('bones', 66, -74, { r: 0.9 });
  add('chandelier', 52, -58, { up: 6, hang: true }); add('carpet', 52, -55, { hx: 14, hz: 1.4, layer: 'royal:cloth_red' });
  add('decal', 34.05, -80.95, { layer: 'p2_cobweb', w: 2, up: 9.8, yaw: PI / 2 });
  // ---- the Restricted Vault: the Censor's. Four reading daises; his brazier in the middle, where what's not to be read is
  // burnt; ash heaped against the walls; ink wells the height of a man in the corners; his mark over the far wall.
  for (const [x, z] of VAULT_DAISES) { add('lectern', x, z); add('candles', x + 1.2, z + 1.2, { up: 0.5 }); }
  add('castpit', 56, -108, { r: 2 }); add('chain', 56, -108, { up: 5 });
  for (const [x, z] of [[45, -97], [67, -97], [45, -119], [67, -119]]) add('vat', x, z, { r: 1.1 });
  add('heap', 60, -119, { r: 1.6, layer: 'p2_ash_street' }); add('heap', 50, -97, { r: 1.2, layer: 'p2_ash_street' });
  add('mark', 56, -120.6, { up: 8, r: 1.6, back: -1 }); add('decal', 55, -104, { layer: 'p2_scorch_mark', w: 3, flat: true });
  add('bookcase', 68.4, -108, { hx: 0.4, hz: 3, h: 4, one: -1 });
  // ---- the Scriptorium: desks in rows under hung lamps, the copyists' stools, the master's desk on the east side,
  // vellum stacked.
  for (const x of [-12, -6, 0, 12]) for (const z of [-113, -123]) { add('table', x, z, { hx: 1.1, hz: 0.6 }); add('candles', x + 0.5, z, { up: 0.85 }); }
  add('table', 14, -112, { hx: 0.8, hz: 2.4, cloth: 'royal:cloth_red' }); add('seat', 16.4, -112, { hx: 0.6, hz: 0.6, yaw: -PI / 2, stone: 'dark:wood' });
  add('crates', -15.5, -110); add('crates', -15, -127); add('bookcase', 2, -129.4, { hx: 3, hz: 0.4, h: 3.4 });
  for (const x of [-9, 6]) add('chandelier', x, -118, { up: 5.4, hang: true });
  // ---- the Scriveners' Lift: a shaft up through the castle, the platform at its foot, its chains, its winch and counterweights.
  add('pool', -8, -156, { r: 3, up: 0.25, layer: 'dark:wood' }); for (const [x, z] of [[-11, -159], [-5, -159], [-11, -153], [-5, -153]]) add('chain', x, z, { up: 9 });
  add('daylight', -8, -156, { r: 2.6, pool: false }); add('crates', -13, -146); add('barrels', -3, -147); add('brazier', -13.4, -158);
  add('mark', -8, -160.7, { up: 6, r: 0.7, back: -1 });
  // ---- the Sump: where the Archive's water comes up through the floor; a grate, rot, what the water brought.
  add('pool', -40, -140, { r: 4.5, up: 0.04, layer: 'mire:water' }); add('bones', -34, -145, { r: 1 }); add('roots', -47, -134, { r: 1.5 });
  add('sluicegate', -47.6, -140, { yaw: PI / 2, w: 2.4 }); add('barrels', -33, -134);
  // ---- the Index Room: the catalogue of everything the library ever held, and what Pell's master hid with it.
  add('bookcase', 28, -104, { hx: 4, hz: 0.4, h: 3.6 }); add('table', 30, -98, { hx: 1.4, hz: 0.6 }); add('candles', 30, -98, { up: 0.85 });
}

const ARCHIVISTS = ['necromancer_f1', 'necromancer_f2', 'necromancer_2', 'necromancer_3'];
const SCRIVENERS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const ROBES = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const DROWNED = ['zombie_boy_1', 'zombie_boy_2', 'zombie_girl_1', 'zombie_girl_2'];
// (None on the stair, in the Well, or in the Holdout and its Shelves: nothing of his knows they're there.)
const dPacks = [
  { key: 'cd_chained', room: 'cd_chained', pick: ARCHIVISTS, n: 4, elite: ['necromancer_lord'], pal: ['Royal'], ai: 'caster', at: [6, 2], r: 5 },
  { key: 'cd_chained2', room: 'cd_chained', pick: ['night_demon_blue', 'night_demon_black'], n: 3, pal: ['Royal'], at: [-8, -8], r: 3 },
  { key: 'cd_scriv', room: 'cd_scriv', pick: SCRIVENERS, n: 6, pal: ['Royal', 'Ashen'], at: [0, 0], r: 6 },
  { key: 'cd_scriv2', room: 'cd_scriv', pick: ARCHIVISTS, n: 2, pal: ['Royal'], ai: 'caster', at: [12, 4], r: 2 },
  { key: 'cd_lift', room: 'cd_lift', pick: ROBES, n: 4, elite: ['possessed_knight_3'], pal: ['Royal', 'Sable'], at: [0, 2], r: 3 },
  { key: 'cd_sump', room: 'cd_sump', pick: DROWNED, n: 5, pal: ['Drowned'], at: [2, 0], r: 4 },
  // (The Stacks' walk: two of his knights in blue, from the Chained Stacks to the Scriptorium by the Vault's door.)
  { key: 'cd_walk', room: 'cd_chained', pick: ['velscour_knight_3', 'velscour_knight_4'], n: 2, pal: ['Royal'], at: [8, -12], r: 1, walk: [[60, -84], [60, -94], [50, -110]] },
];
const dBosses = [
  { key: 'censor', room: 'cd_vault', name: 'The Censor', models: ['cd_censor'], pal: ['Royal'], hp: 82000, damage: 270, reach: 3.2, loot: 8 },
];
const dWarnings = {
  cen_open: 'The Censor. He burns what is not to be read, and drowns the rest: when he breaks the ink wells, the floor floods. Get up on a reading dais before it reaches you.',
  cen_brand: 'The Censor brands the air! Out of the fan.',
  cen_pyre: 'He throws his pyre! Out of the circles.',
  cen_strike: 'He sweeps his iron! Out of the arc.',
  cen_redact: 'He strikes you out! Keep moving: the black follows.',
  cen_rows: 'He fires the rows! Out of the lanes.',
  cen_ink: 'HE BREAKS THE INK WELLS! The floor floods: up on a reading dais, now!',
  cen_turn: 'The Censor turns on you! Out of his reach.',
  cen_enrage: 'The Censor is enraged!',
  cd_lift_shut: "The Scriveners' Lift is chained at the top. Somebody up in the High Ward would have to let it down.",
  cd_sump_shut: 'A grate over black water, barred from below. Whatever is down there bars it.',
};
export const DEEP_STACKS = {
  key: 'deepstacks', tag: 'cd', name: 'Castle Velscour: the Deep Stacks', short: 'the Deep Stacks', x: 12540, z: -5700, y: -60, level: 78, style: 'castle',
  party: false, castle: true, within: 'middleward',
  rooms: dRooms, tunnels: dTunnels, daises: dDaises, props: dProps, packs: dPacks, bosses: dBosses, warnings: dWarnings,
  turnWarn: { censor: 'cen_turn' },
  // (Its way out to the land is the Holdout's coal chute, up into the castle's yard by the gate: the Lower Ward's door.)
  entry: { x: 0, z: -1.5, yaw: PI }, exitIn: { x: -70.4, z: -70, yaw: PI / 2 }, exitOut: { x: 56, z: -119.4, yaw: 0 },
  portal: LOWER_WARD.portal,
  links: [
    { x: 0, z: 3.4, yaw: PI, to: 'middleward', n: 4 },
    { x: -8, z: -159, yaw: 0, to: 'highward', n: 2, shut: 'latch:scriveners', word: 'cd_lift_shut' },
    { x: -46.6, z: -140, yaw: PI / 2, to: 'drownedarchive', n: 0, shut: 'latch:sump', word: 'cd_sump_shut' },
  ],
  chests: [
    { id: 'index', room: 'cd_index', x: 31.6, z: -101.5, yaw: -PI / 2, loot: 3 },
    { id: 'vault', room: 'cd_vault', x: 66.5, z: -112, yaw: -PI / 2, loot: 4 },
    { id: 'sump', room: 'cd_sump', x: -34, z: -146, yaw: 0, loot: 2 },
  ],
  vistas: [{ id: 'well_of_books', name: 'the Well of Books', room: 'cd_well', x: 0, z: -57, r: 5 }],
  auto: { way: ['cd_door', 'cd_stair', 'cd_well', 'cd_hold', 'cd_dorm', 'cd_hold', 'cd_well', 'cd_chained', 'cd_well', 'cd_scriv', 'cd_sump', 'cd_scriv', 'cd_lift', 'cd_scriv', 'cd_vault'] },
  shots: [
    ['cd_well', 'cd_well', [-14, 3, -56], [8, 9, -84]],
    ['cd_hold', 'cd_hold', [-34, 3.4, -62], [-64, 1, -84]],
    ['cd_hold2', 'cd_hold', [-70, 3, -88], [-44, 1.5, -62]],
    ['cd_chained', 'cd_chained', [36, 3, -54], [64, 2, -78]],
    ['cd_vault', 'cd_vault', [45, 4, -97], [64, 2, -118]],
    ['cd_scriv', 'cd_scriv', [-16, 3.4, -108], [12, 1, -126]],
  ],
  last: 'censor', tough: { hp: 25, damage: 2.7 }, pay: { xp: 46000, gold: 6400 },
  names: { Necromancers: 'CHAIN-ARCHIVIST', 'Night Paralysis Demons': 'INKSHADE', 'The Possessed': 'SCRIVENER', 'Haunted Mannequins': 'EMPTY ROBE', 'Dead Children': 'THE INK-DROWNED', "Velscour's Knights": 'STACK WARDEN' },
  look: { ...LOOK, light: [1, 0.56, 0.3], fire: [1, 0.6, 0.32] },
  words: { enter: 'The Deep Stacks. The library the castle forgot it had.', clear: 'The Censor is dead! Nothing more will be burnt down here.', wipe: 'You fall... and wake behind the bookcase.' },
};

// ======== the High Ward =========================================================================================================
const hRooms = [
  R('ch_head', 'the Sanctuaries Stair', 0, -8, 5, 15, 0, 9, { rock: 'p2_keep_basalt', foot: 'dark:block', ground: 'p2_bone_joint_flags', fires: 14 }),
  R('ch_sanct', 'the Sanctuaries', 0, -56, 16, 36, 0, 26, { rock: 'p2_keep_basalt', foot: 'dark:course', ground: 'p2_oxblood_marble', banners: 18, cloth: 'p2_banner_skull', fires: 12 }),
  R('ch_court', 'the Chapel Court', -46, -58, 16, 16, 0, 22, { rock: 'p2_bone_plaster', foot: 'dark:block', ground: 'p2_bone_joint_flags', banners: 0, hang: 0, fires: 11 }),
  R('ch_reliq', 'the Reliquary', -46, -100, 7, 7, 0, 9, { rock: 'p2_bone_plaster', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 9 }),
  R('ch_crypt', "the Generals' Crypt", 50, -40, 14, 18, 0, 12, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving', banners: 14, cloth: 'pale:cloth_oat', fires: 13 }),
  R('ch_mirror', 'the Mirror Gallery', 50, -86, 12, 8, 0, 10, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 0, fires: 9 }),
  R('ch_treas', 'the Treasury', -8, -128, 14, 10, 0, 10, { rock: 'slate:ashlar', foot: 'dark:block', ground: 'p2_walk_paving', banners: 12, cloth: 'pale:cloth_oat', fires: 12 }),
  R('ch_observ', 'the Observatory', 40, -128, 13, 13, 0, 28, { rock: 'p2_keep_basalt', foot: 'dark:block', ground: 'p2_oxblood_marble', banners: 14, cloth: 'p2_banner_skull', fires: 12 }),
  R('ch_roost', "the Gargoyles' Roost", -52, -128, 12, 10, 0, 9, { rock: 'p2_sooty_plaster', foot: 'block', ground: 'p2_worn_floorboards', banners: 0, fires: 10 }),
  R('ch_ante', 'the Throne Antechambers', 0, -190, 20, 18, 0, 20, { rock: 'p2_keep_basalt', foot: 'dark:course', ground: 'p2_oxblood_marble', banners: 18, cloth: 'p2_banner_skull', fires: 12 }),
];
const hTunnels = [
  { pts: [[-14, -50], [-32, -50]], w: 5, h: 6 },
  { pts: [[14, -34], [38, -34]], w: 4, h: 5 },
  { pts: [[54, -56], [54, -80]], w: 4, h: 5 },
  { pts: [[-8, -90], [-8, -120]], w: 3.5, h: 5 },
  { pts: [[4, -130], [29, -130]], w: 3.5, h: 5 },
  // The way round: from the Mirror Gallery down to the Observatory.
  { pts: [[46, -92], [46, -117]], w: 3, h: 4.5 },
  // Behind a hanging in the Treasury's west wall: the roof-runners' way to their Roost. On no map.
  { pts: [[-20, -124], [-42, -124]], w: 1.3, h: 3 },
];
// The Sexton's graves in the Antechambers, where his dead come up, and where he sets his lantern down (castle-fights-h.js).
export const GRAVES = [[-13, -180], [13, -180], [-13, -200], [13, -200]];
export const LANTERN_AT = [[0, -203], [0, -177]];
const hDaises = [{ x: 0, z: -84, hx: 8, hz: 5, dy: 0.6 }];

const hProps = [];
{
  const add = (kind, x, z, o = {}) => hProps.push({ kind, x, z, ...o });
  // ---- the Sanctuaries Stair: his plate on stands, his mark over the arch into the nave.
  for (const z of [-4, -14]) { add('stand', -4, z); add('stand', 4, z - 4); }
  add('mark', 0, -22.4, { up: 7.2, r: 0.9, back: 1 }); add('brazier', -3.6, 2); add('brazier', 3.6, -20);
  // ---- the Sanctuaries: the black nave. Piers down both sides, his banners on them; benches in two blocks, an aisle of
  // his red between; at the far end his altar on its dais (a slab, his mark over it, a fire each side): to him, not to her.
  for (const z of [-32, -46, -60, -74]) { add('column', -11, z, { r: 1.5, solid: true }); add('column', 11, z + 4, { r: 1.5, solid: true }); }
  for (const z of [-30, -36, -42, -58, -64, -70]) { add('bench', -5.5, z, { hx: 3.4, hz: 0.25 }); add('bench', 5.5, z, { hx: 3.4, hz: 0.25 }); }
  add('carpet', 0, -52, { hx: 1.4, hz: 28, layer: 'blood:cloth_red' });
  add('table', 0, -84, { hx: 3, hz: 1, solid: true, cloth: 'blood:cloth_red' }); add('mark', 0, -91.6, { up: 9, r: 2.6, back: -1 });
  add('candles', -2, -84, { up: 0.95 }); add('candles', 2, -84, { up: 0.95 }); add('brazier', -6.5, -86); add('brazier', 6.5, -86);
  for (const z of [-38, -66]) add('chandelier', 0, z, { up: 11, hang: true });
  add('decal', -15.95, -78, { layer: 'p2_tapestry_hunt', w: 6, h: 4, up: 6, yaw: PI / 2 }); add('decal', 15.95, -62, { layer: 'p2_tapestry_hunt', w: 6, h: 4, up: 6, yaw: -PI / 2 });
  // ---- the Chapel Court: open to the sky, a dry basin, bone urns on plinths, the Ossuary Chapel's door west and the
  // Reliquary's bone lock south.
  add('daylight', -46, -58, { r: 8, pool: false }); add('pit', -46, -58, { r: 2.6 });
  for (const [x, z] of [[-56, -48], [-36, -48], [-56, -68], [-36, -68]]) add('bones', x, z, { r: 0.9 });
  add('brazier', -41, -45); add('brazier', -51, -71); add('mark', -46, -73.6, { up: 6, r: 0.8, back: -1 }); add('portcullis', -46, -73.2, { w: 2.6, h: 5.6, plain: true });
  add('deadtree', -58, -58, { h: 9, r: 1.6, solid: true });
  // ---- the Reliquary: what the chapel keeps for him. Bone shelves, a slab, candles; a chest that was never meant to be opened.
  add('bones', -50, -104, { r: 1.2 }); add('bones', -42, -96, { r: 1 }); add('table', -46, -103.6, { hx: 1.6, hz: 0.7 }); add('candles', -46, -103.6, { up: 0.9 });
  add('jarshelf', -52.6, -100, { yaw: PI / 2, w: 3 }); add('jarshelf', -39.4, -100, { yaw: -PI / 2, w: 3 });
  // ---- the Generals' Crypt: his generals' tombs in two ranks, their harness on stands at their feet, their standards.
  for (const z of [-30, -40, -50]) { add('table', 43, z, { hx: 2.4, hz: 1, solid: true }); add('table', 57, z + 4, { hx: 2.4, hz: 1, solid: true }); add('stand', 46.5, z); add('stand', 53.5, z + 4); }
  add('shields', 36.6, -44, { yaw: PI / 2 }); add('shields', 63.4, -52, { yaw: -PI / 2 }); add('brazier', 50, -26); add('brazier', 50, -54);
  add('decal', 63.95, -22.05, { layer: 'p2_cobweb', w: 2, up: 10, yaw: PI });
  // ---- the Mirror Gallery: tall dark glasses down both walls in iron frames (frames with no sitter: slate), a runner,
  // the Hall of Mirrors' door at its east end.
  for (let x = 40; x <= 58; x += 4.5) { add('portrait', x, -78.45, { yaw: 0, sitter: 'slate:iron', sz: 1.5 }); add('portrait', x - 2, -93.55, { yaw: PI, sitter: 'slate:iron', sz: 1.5 }); }
  add('carpet', 50, -86, { hx: 10, hz: 1.4, layer: 'pale:cloth_oat' }); add('chandelier', 50, -86, { up: 6, hang: true });
  add('mark', 61.7, -86, { up: 6.8, r: 0.7, yaw: PI / 2, back: 1 });
  // ---- the Treasury: strongboxes in rows, coin in heaps, plate on stands, the tally desk; the hanging on the west wall.
  for (const [x, z] of [[-16, -122], [-16, -134], [0, -134], [2, -122]]) add('crates', x, z);
  add('heap', -10, -134, { r: 1.4, layer: 'p2_bronze_plates' }); add('heap', -4, -121, { r: 1, layer: 'p2_bronze_plates' });
  add('table', -8, -128, { hx: 2.4, hz: 0.8 }); add('candles', -8, -128, { up: 0.85 }); add('stand', 3.6, -128); add('stand', -19, -130);
  add('decal', -21.95, -124, { layer: 'p2_hessian', w: 3, h: 3.2, up: 1.7, yaw: PI / 2 });
  add('portcullis', -14, -137.2, { w: 2.6, h: 6, plain: true }); add('mark', -14, -137.6, { up: 6.8, r: 0.7, back: -1 });
  // ---- the Observatory: under its dome, the great orrery (rings of iron on a pier), the sky let in over it; charts with
  // no letters; the Star-Reader's desk; the Clock Tower's lift in the east wall.
  // (South of the room's middle, where he stands.)
  add('column', 40, -133, { r: 1.6, solid: true }); add('circle', 40, -133, { r: 5 }); add('circle', 40, -133, { r: 7.4 }); add('daylight', 40, -133, { r: 4.5 });
  add('maptable', 31, -119, { hx: 2.4, hz: 1.6 }); add('lectern', 49, -119); add('bookcase', 29, -138.4, { hx: 2.4, hz: 0.4, h: 3.4 });
  for (const [x, z] of [[30, -138], [50, -118]]) add('brazier', x, z);
  add('decal', 40, -140.95, { layer: 'p2_hessian', w: 3.2, h: 2.2, up: 2.4, yaw: 0 });
  // ---- the Gargoyles' Roost: the roof-runners' camp. Bedrolls, a fire in a pot, what they've lifted in sacks and crates,
  // ropes and hooks on a rail, the lift's head in the back wall.
  for (const [x, z] of [[-58, -122], [-58, -126], [-46, -134]]) add('bunk', x, z, { hx: 1.1, hz: 0.5, cloth: 'cloth_oat' });
  add('vat', -50, -128, { r: 0.7 }); add('brazier', -50, -125.4); add('crates', -44, -121); add('crates', -46.5, -120.6); add('barrels', -42, -135);
  add('coatrail', -56, -136.6, { hx: 2.4 }); add('table', -46, -129, { hx: 0.7, hz: 1.8 }); add('candles', -46, -129, { up: 0.85 });
  add('chain', -61, -131, { up: 5 }); add('chain', -61, -125, { up: 5 });
  // ---- the Throne Antechambers: the last rooms before his stair. Graves cut in the marble floor (the Sexton's: he buries
  // who comes this far, and digs them up to serve); piers; his banners; the stair's door behind his mark at the south end.
  for (const [x, z] of GRAVES) { add('pit', x, z, { r: 1.8 }); add('heap', x + 2.6, z + 1, { r: 1, layer: 'dark:rubble' }); }
  for (const z of [-178, -202]) { add('column', -17, z, { r: 1.5, solid: true }); add('column', 17, z, { r: 1.5, solid: true }); }
  add('mark', 0, -207.6, { up: 10, r: 2.4, back: -1 }); add('portcullis', 0, -207.2, { w: 4.6, h: 9, plain: true });
  for (const [x, z] of [[-8, -206], [8, -206], [-18, -190], [18, -190]]) add('brazier', x, z);
  add('carpet', 0, -190, { hx: 1.6, hz: 15, layer: 'blood:cloth_red' });
}

const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const CANTORS = ['necromancer_f1', 'necromancer_f2', 'necromancer_3'];
const WARDENS = ['plague_knight_black', 'plague_knight_red'];
const GENERALS = ['possessed_knight_1', 'possessed_knight_2', 'possessed_knight_3'];
// (None on the stair, where you wake; none in the Roost; the Reliquary's and the Antechambers' own are behind their doors.)
const hPacks = [
  { key: 'ch_sanct', room: 'ch_sanct', pick: CANTORS, n: 4, elite: ['necromancer_lord'], pal: ['Skullwhite'], ai: 'caster', at: [0, 14], r: 5 },
  { key: 'ch_sanct2', room: 'ch_sanct', pick: WARDENS, n: 4, pal: ['Skullwhite'], at: [0, -16], r: 5 },
  { key: 'ch_court', room: 'ch_court', pick: ['harpy_undead_1', 'harpy_undead_2'], n: 4, elite: ['harpy_queen'], pal: ['Skullwhite', 'Bone-white'], at: [0, 0], r: 6 },
  { key: 'ch_reliq', room: 'ch_reliq', pick: ['skeleton_knight_giant'], n: 2, pal: ['Skullwhite'], tough: { hp: 1.5, damage: 1.3 }, at: [0, 2], r: 2 },
  { key: 'ch_crypt', room: 'ch_crypt', pick: GENERALS, n: 5, elite: ['skeleton_knight_giant'], pal: ['Greygold'], tough: { hp: 1.3, damage: 1.2 }, at: [0, -2], r: 6 },
  { key: 'ch_mirror', room: 'ch_mirror', pick: ['mannequin_1', 'mannequin_2', 'mannequin_3'], n: 4, pal: ['Greygold'], at: [-2, 0], r: 4 },
  { key: 'ch_treas', room: 'ch_treas', pick: KNIGHTS, n: 4, elite: ['plague_giant_armored'], pal: ['Greygold'], at: [2, 2], r: 5 },
  { key: 'ch_observ', room: 'ch_observ', pick: ['night_demon_red', 'night_demon_black'], n: 3, pal: ['Bloodred'], at: [-6, 6], r: 4 },
  // (His court's walk: two of his knights in white, from the nave down to the Treasury's door and back.)
  { key: 'ch_walk', room: 'ch_sanct', pick: KNIGHTS, n: 2, pal: ['Skullwhite'], at: [-8, -30], r: 1, walk: [[-8, -96], [-8, -108], [-8, -116]] },
];
const hBosses = [
  { key: 'starreader', room: 'ch_observ', name: 'The Star-Reader', models: ['ch_starreader'], pal: ['Bloodred'], hp: 118000, damage: 330, reach: 3.2, loot: 8, at: [0, 5] },
  { key: 'sexton', room: 'ch_ante', name: 'The Sexton of the High Ward', models: ['ch_sexton'], pal: ['Skullwhite'], hp: 150000, damage: 380, reach: 4, loot: 8, gives: 'key:sexton' },
];
const hWarnings = {
  str_open: 'The Star-Reader. He brings his sky down a quarter at a time: when he calls the eclipse, three quarters of the room burn and one is dark. Stand in the dark.',
  str_fan: 'He casts the lots! Out of the fan.',
  str_fall: 'Stars fall! Out of the circles.',
  str_seek: 'His wandering stars follow you! Keep moving.',
  str_wheel: 'The orrery turns! Jump the fire as it comes round.',
  str_eclipse: 'ECLIPSE! Three quarters of the room burn: into the dark quarter, now!',
  str_turn: 'The Star-Reader turns on you! Out of his reach.',
  str_enrage: 'The Star-Reader is enraged!',
  sex_open: 'The Sexton of the High Ward. He sets his grave-lantern down, and while it burns the graves give up their dead, two at a time, without end. Put the lantern out.',
  sex_spade: 'The Sexton swings his spade! Out of the arc.',
  sex_graves: 'He opens the floor! Out of the circles.',
  sex_dirge: 'He sings them up! Jump the ring as it reaches you.',
  sex_march: 'The dead march! Out of their line.',
  sex_bury: 'He means to bury you! Keep moving: the grave follows.',
  sex_lantern: 'THE GRAVE-LANTERN IS LIT! While it burns the graves give up their dead: to it, and put it out!',
  sex_risen: 'The graves give up two more!',
  sex_out: 'The grave-lantern is out. The graves are quiet.',
  sex_turn: 'The Sexton turns on you! Out of his reach.',
  sex_enrage: 'The Sexton is enraged!',
  ch_mirror_shut: "The Hall of Mirrors' door shows you your own face and nothing behind it. Its key is on the Keeper's ring, in the Menagerie of Chains.",
  ch_reliq_shut: "The Reliquary's lock is a hand of bone, one finger short. The Ossuary Chapel has the finger.",
  ch_ante_shut: 'The silvered door to the Throne Antechambers. Its key is somewhere in the Hall of Mirrors, and you can see it in the door.',
};
export const HIGH_WARD = {
  key: 'highward', tag: 'ch', name: 'Castle Velscour: the High Ward', short: 'the High Ward', x: 12080, z: -5700, y: -60, level: 95, style: 'castle',
  party: false, castle: true, within: 'middleward',
  rooms: hRooms, tunnels: hTunnels, daises: hDaises, props: hProps, packs: hPacks, bosses: hBosses, warnings: hWarnings,
  turnWarn: { starreader: 'str_turn', sexton: 'sex_turn' },
  // (Its way out to the land: the Roost's rope, down the outside of the Keep to the castle's gate.)
  entry: { x: 0, z: -1.5, yaw: PI }, exitIn: { x: -52, z: -136.4, yaw: 0 }, exitOut: { x: 0, z: -206.2, yaw: 0 },
  portal: LOWER_WARD.portal,
  links: [
    { x: 0, z: 3.4, yaw: PI, to: 'middleward', n: 1 },
    { x: 61.6, z: -30, yaw: -PI / 2, to: 'lowerward', n: 2 },
    { x: -61.6, z: -128, yaw: PI / 2, to: 'deepstacks', n: 1, opens: 'latch:scriveners' },
    { x: -59.6, z: -64, yaw: PI / 2, to: 'ossuary', n: 0 },
    { x: 59.6, z: -86, yaw: -PI / 2, to: 'mirrors', n: 0, shut: 'key:menagerie', word: 'ch_mirror_shut' },
    { x: 50.6, z: -136, yaw: -PI / 2, to: 'clockworks', n: 1 },
    { x: -46, z: -71.6, yaw: 0, to: 'highward', n: 7, shut: 'key:ossuary', word: 'ch_reliq_shut' },
    { x: -46, z: -95.4, yaw: PI, to: 'highward', n: 6 },
    { x: -14, z: -135.6, yaw: 0, to: 'highward', n: 9, shut: 'key:mirrors', word: 'ch_ante_shut' },
    { x: 0, z: -174.4, yaw: PI, to: 'highward', n: 8 },
  ],
  chests: [
    { id: 'reliquary', room: 'ch_reliq', x: -46, z: -105.6, yaw: 0, loot: 4 },
    { id: 'treasury_a', room: 'ch_treas', x: 4.4, z: -134, yaw: -PI / 2, loot: 4 },
    { id: 'treasury_b', room: 'ch_treas', x: -19.6, z: -120, yaw: PI / 2, loot: 3 },
    { id: 'crypt', room: 'ch_crypt', x: 62.4, z: -56, yaw: -PI / 2, loot: 3 },
    { id: 'roost', room: 'ch_roost', x: -41.6, z: -121, yaw: -PI / 2, loot: 3 },
  ],
  vistas: [
    { id: 'observatory', name: "the Observatory's Eye", room: 'ch_observ', x: 40, z: -120, r: 5 },
    { id: 'black_nave', name: 'the Black Nave', room: 'ch_sanct', x: 0, z: -26, r: 5 },
  ],
  auto: { way: ['ch_head', 'ch_sanct', 'ch_court', 'ch_sanct', 'ch_crypt', 'ch_mirror', 'ch_observ', 'ch_treas', 'ch_roost', 'ch_treas', 'ch_observ'] },
  shots: [
    ['ch_sanct', 'ch_head', [0, 4, -20], [0, 5, -90]],
    ['ch_court', 'ch_court', [-34, 3, -46], [-56, 3, -70]],
    ['ch_crypt', 'ch_crypt', [38, 3.4, -24], [60, 1.5, -54]],
    ['ch_mirror', 'ch_mirror', [39, 2.4, -86], [61, 3, -86]],
    ['ch_treas', 'ch_treas', [4, 3.4, -120], [-18, 1, -136]],
    ['ch_observ', 'ch_observ', [29, 4, -117], [46, 6, -136]],
    ['ch_roost', 'ch_roost', [-42, 3, -120], [-60, 1.4, -134]],
    ['ch_ante', 'ch_ante', [-16, 4, -174], [8, 3, -206]],
  ],
  last: 'sexton', tough: { hp: 32, damage: 3.3 }, pay: { xp: 80000, gold: 11000 },
  names: { Necromancers: 'CANTOR', 'Plague Knights': 'SANCTUARY WARDEN', Harpies: 'COURT HARPY', 'Possessed Knights': 'DEAD GENERAL', 'Haunted Mannequins': 'EMPTY GLASS', "Velscour's Knights": 'HIGH WARD KNIGHT', 'Night Paralysis Demons': 'STAR-WARDEN', 'Plague Giants': 'TALLYMAN', 'Giant Skeleton Knights': 'BONE SENTINEL' },
  look: LOOK,
  words: { enter: 'Castle Velscour: the High Ward. His own.', clear: 'The Sexton of the High Ward is dead! The way up to the Keep is open.', wipe: 'You fall... and wake at the head of the Sanctuaries Stair.' },
};

export const CASTLE_HIGH = [HIGH_WARD, DEEP_STACKS];
// Their bosses' bodies, and what the Sexton sets down (src/core/tripo-monsters.js VARIANTS takes them in).
export const VARIANTS_H = {
  cd_censor: { src: 'necromancer_lord', alt: 'necromancer_3', height: 3.2, name: 'THE CENSOR' },
  ch_starreader: { src: 'necromancer_lord_2', alt: 'necromancer_lord', height: 3.4, name: 'THE STAR-READER' },
  ch_sexton: { src: 'plague_giant_armored', alt: 'plague_giant_1', height: 4.6, name: 'THE SEXTON OF THE HIGH WARD' },
  ch_lantern: { src: 'mannequin_3', alt: 'mannequin_1', height: 2.6, name: 'THE GRAVE-LANTERN' },
};
