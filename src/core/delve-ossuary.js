// The Ossuary Chapel: one of Castle Velscour's dungeons (docs/PHOBOS-CASTLE.md, set B), on the High Ward's east terrace:
// his own chapel, built of the people who built his castle. Gone into only from the High Ward (within: it has no door of
// its own on the land). White with skulls, the livery of this wing. It is Velscour's: his ring and horns over the altar,
// his red flame, bone; nothing of Tessariel's, no bell, and no part of its plan crosses another (a nave, and rooms off it
// at different places down its length, never two across from each other).
//   The Bone Porch, and the Nave of Skulls behind it: bone piers down both sides, a red light falling in the middle of it.
//   The Charnel Aisle, west, by two arches: what hasn't been built into the walls yet.
//   The Choir of Jaws, east: the Cantor of Jaws (102), whose tithe of bone stays where it falls until she gathers it in.
//     Behind a wall of skulls in the Choir, the Vestry (on no map).
//   The Crypt Stair down from the Charnel Aisle to the Under-Crypt, where his old priors lie; and the Priors' Stair up
//     from it into the Sanctuary's back: the way round.
//   The Sanctuary, at the nave's head and set to one side of it: the altar, and the Bone Prior (104), shut in till his Cantor's dead. He names one of you to kneel.
//     What you emptied below leaves him less: the Under-Crypt, and his old priors lie still when he calls them; the
//     Charnel Aisle, and he has no piers of bone to pull down.
// Local to its own way in: x east, z south of the door (the way on is toward -z), y over its floor.
import { R } from './delve-lay.js';
import { LOWER_WARD } from './delve-castle.js';

const PI = Math.PI;

const rooms = [
  R('oc_porch', 'the Bone Porch', 0, -12, 5, 20, 0, 9, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_bone_joint_flags', fires: 14 }),
  R('oc_nave', 'the Nave of Skulls', 0, -66, 14, 39, 0, 22, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_mausoleum_marble', banners: 20, cloth: 'p2_banner_white', hang: 0, fires: 13 }),
  R('oc_charnel', 'the Charnel Aisle', -40, -62, 10, 26, 0, 10, { rock: 'p2_bone_plaster', foot: 'pale:block', ground: 'p2_bones_ground', banners: 0, fires: 12 }),
  R('oc_choir', 'the Choir of Jaws', 44, -64, 16, 18, 0, 14, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_mausoleum_marble', banners: 14, cloth: 'p2_banner_white', fires: 12 }),
  R('oc_stair', 'the Crypt Stair', -40, -105, 3.5, 19, -4, 8, { tz: 8 / 38, fires: 10, rock: 'p2_bone_plaster', foot: 'pale:block' }),
  R('oc_crypt', 'the Under-Crypt', -40, -140, 16, 20, -8, 8, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 13 }),
  R('oc_vestry', 'the Vestry', 49, -98, 5, 5, 0, 6, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('oc_sanct', 'the Sanctuary', 18, -128, 20, 27, 0, 20, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_oxblood_marble', banners: 18, cloth: 'p2_banner_white', hang: 0, fires: 12 }),
];

const tunnels = [
  { pts: [[-12, -46], [-32, -46]], w: 3, h: 6 },                         // the nave's two arches to the Charnel Aisle
  { pts: [[-12, -78], [-32, -78]], w: 3, h: 6 },
  { pts: [[12, -58], [30, -58]], w: 3.5, h: 6 },                         // the nave to the Choir
  { pts: [[-30, -158], [-30, -172], [14, -172], [14, -153]], w: 2.4, h: 4.4 },   // the Priors' Stair, from the crypt up to the Sanctuary's back
  // The Vestry: behind a wall of skulls in the Choir's south wall. On no map.
  { pts: [[46, -80], [46, -96]], w: 1.3, h: 3, dark: true },
  // Where her choir and his old priors come in.
  { pts: [[58, -52], [65, -52]], w: 2, h: 4, dead: true, door: 'oc_choir' },
  { pts: [[58, -76], [65, -76]], w: 2, h: 4, dead: true, door: 'oc_choir' },
  { pts: [[0, -112], [-7, -112]], w: 2, h: 4, dead: true, door: 'oc_sanct' },
  { pts: [[36, -140], [43, -140]], w: 2, h: 4, dead: true, door: 'oc_sanct' },
];

// The Sanctuary's four piers of bone: what the Bone Prior pulls down, each along its own line (src/sim/castle-fights-b.js).
export const BONE_PIERS = [[7, -114], [29, -120], [7, -134], [29, -140]];
// His altar, at the Sanctuary's far end.
export const ALTAR = [18, -150];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Bone Porch: skulls built into both walls, bone candle-trees, his font, the way back out to the High Ward's
  // terrace in the east wall.
  add('lintel', 0, -2, { hx: 5, stone: 'pale:stone' });
  add('skullwall', -4.86, -10, { yaw: PI / 2, w: 4, h: 3.4 }); add('skullwall', -4.86, -22, { yaw: PI / 2, w: 3, h: 3.4 }); add('skullwall', 4.86, -24, { yaw: -PI / 2, w: 3, h: 3.4 });
  add('bonefont', -2.6, -28.5, { r: 0.8 }); add('bonetree', 3.4, 2); add('bonetree', -3.4, -3);
  add('brazier', 3.4, -29);
  add('mark', 4.75, -12, { up: 5.6, r: 0.6, yaw: -PI / 2, back: -1 });
  // ---- the Nave of Skulls: bone piers down both sides (never two across from each other), stalls in two blocks either side of the way down its middle, a red
  // light down from the roof at its middle, candle-trees.
  [-36, -52, -68, -84, -98].forEach((z, i) => add('bonepier', i % 2 ? 9.5 : -9.5, z, { hx: 1.6, hz: 0.7, solid: true }));
  for (const z of [-40, -44, -48, -58, -62]) add('stall', 5, z, { hx: 2.6, flip: true });
  for (const z of [-74, -78, -88, -92]) add('stall', -5, z, { hx: 2.6, flip: true });
  add('daylight', 0, -66, { r: 3.4 }); add('circle', 0, -66, { r: 4.4 });
  add('bonetree', -11, -62, { h: 3.6 }); add('bonetree', 11, -72, { h: 3.6 }); add('bonetree', 10.5, -34); add('bonetree', -10.5, -100);
  add('chandelier', 0, -46, { up: 9, hang: true }); add('chandelier', 0, -88, { up: 9, hang: true });
  add('skullwall', -13.86, -62, { yaw: PI / 2, w: 5, h: 5 }); add('skullwall', 13.86, -76, { yaw: -PI / 2, w: 5, h: 5 }); add('skullwall', 13.86, -40, { yaw: -PI / 2, w: 3, h: 4 });
  add('carpet', 0, -66, { hx: 1.4, hz: 34, layer: 'blood:cloth_red' });
  add('decal', -13.95, -90, { layer: 'p2_wax_drips', w: 2, h: 2, up: 1, yaw: PI / 2 });
  // ---- the Charnel Aisle: bones in stacks down both walls, biers, heaps not yet sorted, the sorters' table.
  for (const z of [-44, -60, -76]) add('bonestack', -49.3, z, { yaw: PI / 2 });
  for (const z of [-54, -70, -84]) add('bonestack', -30.7, z, { yaw: -PI / 2 });
  add('bier', -40, -52, { hx: 1, hz: 2.2 }); add('bier', -42, -72, { hx: 1, hz: 2.2 });
  add('bones', -38, -62, { r: 1.6 }); add('bones', -44, -82, { r: 1.3 }); add('heap', -36, -40, { r: 1.4, layer: 'pale:rubble' });
  add('table', -45, -40, { hx: 2, hz: 0.7 }); add('candles', -45, -40, { up: 0.85 }); add('urn', -33, -66); add('urn', -47, -64);
  add('brazier', -40, -44); add('brazier', -38, -80);
  // ---- the Choir of Jaws: the stalls in rows facing each other across the floor (benches, jawbones along their backs),
  // her lectern, skulls in the walls, his mark; a wall of skulls stood a little out from the south wall.
  for (const x of [34, 38]) add('bench', x, -64, { hx: 0.25, hz: 9 });
  for (const x of [50, 54]) add('bench', x, -62, { hx: 0.25, hz: 9 });
  add('lectern', 44, -50); add('carpet', 44, -64, { hx: 3, hz: 13, layer: 'blood:cloth_red' });
  add('skullwall', 59.86, -64, { yaw: -PI / 2, w: 6, h: 5 }); add('skullwall', 44, -46.14, { yaw: PI, w: 5, h: 5 });
  add('skullwall', 46.6, -80.6, { yaw: 0.22, w: 2.4, h: 3.4 });
  add('mark', 59.6, -52, { up: 8, r: 1.2, yaw: -PI / 2, back: -1 });
  add('bonetree', 31, -49); add('bonetree', 57, -79); add('chandelier', 44, -64, { up: 8, hang: true });
  add('brazier', 31, -79); add('brazier', 57, -49);
  // ---- the Crypt Stair, and the Under-Crypt: his old priors on their biers in two rows, their urns, their dead guard
  // against the walls, standing water.
  add('urn', -42.6, -96); add('urn', -37.4, -112);
  [[-50, -128], [-50, -140], [-50, -152], [-30, -134], [-30, -146]].forEach(([x, z]) => { add('bier', x, z, { hx: 2.2, hz: 1 }); add('urn', x + (x < -40 ? 3 : -3), z + 1.4); });
  add('deadguard', -55.6, -134, { yaw: PI / 2 }); add('deadguard', -55.6, -146, { yaw: PI / 2 }); add('deadguard', -24.4, -128, { yaw: -PI / 2 }); add('deadguard', -24.4, -152, { yaw: -PI / 2 });
  add('pool', -40, -140, { r: 3.4, up: 0.03, layer: 'mire:water' }); add('bones', -44, -156, { r: 1.2 }); add('gravegoods', -36, -124, { r: 1.4 });
  add('brazier', -40, -128); add('brazier', -42, -152);
  add('decal', -55.95, -140, { layer: 'p2_damp_rise', w: 4, h: 3, up: 0.1, yaw: PI / 2 });
  // ---- the Vestry: his vestments on a rail, the tithe box, the plate.
  add('coatrail', 53.2, -98, { hx: 2, yaw: -PI / 2 }); add('table', 49, -102.2, { hx: 2.4, hz: 0.6 }); add('candles', 48, -102.2, { up: 0.85 }); add('gold', 50.6, -102, { r: 0.5 });
  // ---- the Sanctuary: the altar on its steps at the far end, his mark over it; the four piers of bone; the fonts; the
  // candle-trees; skulls up the east and west walls.
  add('altar', ALTAR[0], ALTAR[1], { hx: 2.6, hz: 1 }); add('mark', 18, -154.6, { up: 9, r: 2.4, back: 1 });
  for (const [x, z] of BONE_PIERS) add('bonepier', x, z, { hx: 1.6, hz: 0.7, solid: true });
  add('bonefont', 11, -146, { r: 1 }); add('bonefont', 25, -146, { r: 1 });
  for (const [x, z] of [[2, -150], [34, -150], [1.5, -118], [35, -126]]) add('bonetree', x, z, { h: 4 });
  add('skullwall', -1.86, -130, { yaw: PI / 2, w: 7, h: 6 }); add('skullwall', 37.86, -122, { yaw: -PI / 2, w: 7, h: 6 });
  add('carpet', 18, -128, { hx: 1.6, hz: 18, layer: 'blood:cloth_red' }); add('chandelier', 18, -122, { up: 10, hang: true });
  for (const [x, z] of [[4, -144], [32, -146], [22, -106], [30, -110]]) add('brazier', x, z);
}
const daises = [{ x: 18, z: -150, hx: 9, hz: 5, dy: 0.5 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const PRIESTS = ['necromancer_f1', 'necromancer_f2', 'necromancer_2', 'necromancer_3'];
const DEAD = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
// (None in the Bone Porch: it's where you wake if you fall.)
const packs = [
  { key: 'oc_nave_n', room: 'oc_nave', pick: KNIGHTS, n: 4, pal: ['Skullwhite'], at: [0, 22], r: 4 },
  { key: 'oc_nave_s', room: 'oc_nave', pick: PRIESTS.concat(KNIGHTS), n: 5, elite: ['necromancer_lord'], pal: ['Skullwhite'], ai: 'caster', tough: { hp: 1.2, damage: 1.2 }, at: [0, -18], r: 4 },
  { key: 'oc_charnel', room: 'oc_charnel', pick: ['bone_golem', 'skeleton_knight_giant'], n: 3, pal: ['Skullwhite', 'Bone-white'], tough: { hp: 1.3, damage: 1.2 }, at: [0, 0], r: 4 },
  { key: 'oc_stair', room: 'oc_stair', pick: KNIGHTS, n: 3, pal: ['Skullwhite'], at: [0, 0], r: 2 },
  { key: 'oc_crypt', room: 'oc_crypt', pick: DEAD.concat(['possessed_knight_1', 'possessed_knight_2']), n: 6, elite: ['skeleton_knight_giant'], pal: ['Skullwhite', 'Bone-white'], tough: { hp: 1.3, damage: 1.3 }, at: [0, 0], r: 6 },
  // The sacrists' round, up and down the Priors' Stair.
  { key: 'oc_sacrists', room: 'oc_crypt', pick: PRIESTS, n: 2, pal: ['Skullwhite'], ai: 'caster', at: [10, -32], r: 1, walk: [[-30, -168], [-14, -172], [6, -172]] },
];
const bosses = [
  { key: 'cantor', room: 'oc_choir', name: 'The Cantor of Jaws', models: ['oc_cantor'], pal: ['Skullwhite'], hp: 106000, damage: 385, reach: 3.0, loot: 8 },
  { key: 'boneprior', room: 'oc_sanct', name: 'The Bone Prior', models: ['oc_prior'], pal: ['Skullwhite'], hp: 132000, damage: 400, reach: 3.6, loot: 0, at: [0, -6], needs: ['cantor'], shut: 'pri_shut', gives: 'key:ossuary' },
];
const warnings = {
  can_open: 'The Cantor of Jaws. Her tithe of bone comes up under you and STAYS: take it to the walls, and keep the middle of the floor. When she gathers the tithe in, every thicket bursts in a ring: jump them.',
  can_verse: 'The Cantor sings a verse! Out of the arc.',
  can_march: 'Bone comes up across the floor at you! Out of its way.',
  can_wail: 'She wails! In close against her, or out past the ring.',
  can_lance: 'A lance of red! Out of the line.',
  can_tithe: 'THE TITHE! Bone comes up under you and stays: take it to the walls.',
  can_collect: 'She gathers the tithe in! Every thicket bursts: jump the rings.',
  can_choir: 'Her choir comes in!',
  can_turn: 'The Cantor of Jaws turns on you! Get behind the tank, or out of her reach, till she lets go.',
  can_enrage: 'The Cantor of Jaws is enraged!',
  pri_shut: "The Sanctuary is shut. Its doors open when his Cantor's voice is stopped.",
  pri_open: 'The Bone Prior. When he names one of you, the named KNEELS: not a step till the bone has come up round them. Everyone else gets clear of the one kneeling.',
  pri_less_priors: 'The Under-Crypt is empty: his old priors lie still when he calls them.',
  pri_less_piers: 'The Charnel Aisle is empty: he has no bone to build his piers up again, and cannot pull them down.',
  pri_crozier: 'The Prior swings his crozier! Out of the arc.',
  pri_piers: 'He pulls the piers of bone down! Out of their lines.',
  pri_litany: 'His litany comes after you! Keep moving.',
  pri_ash: 'Ash of the dead! Out of the pools.',
  pri_quake: 'He strikes the floor! Jump the ring as it reaches you.',
  pri_kneel: 'HE NAMES ONE OF YOU: KNEEL! The named stands still; everyone else, clear of them!',
  pri_stood: 'The named moved: he drinks what it cost them.',
  pri_priors: 'His old priors rise from the Under-Crypt!',
  pri_turn: 'The Bone Prior turns on you! Get behind the tank, or out of his reach, till he lets go.',
  pri_enrage: 'The Bone Prior is enraged!',
};

export const OSSUARY = {
  key: 'ossuary', tag: 'oc', name: 'Castle Velscour: the Ossuary Chapel', short: 'the Ossuary Chapel', x: 15300, z: -5700, y: -60, level: 100, style: 'castle',
  castle: true, dungeon: true,
  // (Gone into only from the High Ward: no door of its own out on the land. Its portal is the castle's gate, as the
  // wards' is: where its way out lets you out, and where the map points.)
  within: 'highward',
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { cantor: 'can_turn', boneprior: 'pri_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 30, z: -151.4 },
  portal: LOWER_WARD.portal,
  // Its door back out onto the High Ward's east terrace.
  links: [{ x: 3.4, z: -12, yaw: -PI / 2, to: 'highward', n: 3 }],
  chests: [
    { id: 'vestry', room: 'oc_vestry', x: 51.6, z: -94.6, yaw: PI, loot: 3 },
    { id: 'crypt', room: 'oc_crypt', x: -54, z: -158, yaw: 0.8, loot: 3 },
    { id: 'charnel', room: 'oc_charnel', x: -48, z: -86, yaw: 0.6, loot: 2 },
  ],
  vistas: [{ id: 'red_light', name: 'the Red Light in the Nave of Skulls', room: 'oc_nave', x: 0, z: -66, r: 4 }],
  auto: { way: ['oc_porch', 'oc_nave', 'oc_charnel', 'oc_stair', 'oc_crypt', 'oc_stair', 'oc_charnel', 'oc_nave', 'oc_choir', 'oc_vestry', 'oc_choir', 'oc_nave', 'oc_sanct'] },
  shots: [
    ['oc_nave', 'oc_porch', [0, 2.6, -30], [0, 5, -100]],
    ['oc_choir', 'oc_nave', [30, 3, -58], [58, 2.5, -70]],
    ['oc_crypt', 'oc_stair', [-40, -5, -122], [-42, -7, -158]],
    ['oc_sanct', 'oc_nave', [4, 3, -100], [18, 5, -154]],
  ],
  last: 'boneprior', tough: { hp: 37, damage: 3.95 }, pay: { xp: 110000, gold: 13000 },
  names: { "Velscour's Knights": 'OSSUARY KNIGHT', Necromancers: 'SACRIST', 'Bone Giants': 'CHARNEL-BUILT', 'Dead Children': 'CHORISTER' },
  look: { wall: 'pale:ashlar', foot: 'pale:block', floor: 'pale:flags', banner: 'p2_banner_white', roof: 'pale:stone', flame: 'blood:flame', light: [1, 0.3, 0.16], fire: [1, 0.34, 0.18], every: 8, high: 3, glow: 2.5, lit: true, beam: 'pale:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Ossuary Chapel. His chapel. Everyone who built his castle is in its walls.', clear: 'The Bone Prior is dead! Nobody kneels in his chapel now.', wipe: 'You fall... and wake in the Bone Porch.' },
};
export const OSSUARY_VARIANTS = {
  oc_cantor: { src: 'necromancer_f2', alt: 'necromancer_f1', height: 3.0, name: 'THE CANTOR OF JAWS' },
  oc_prior: { src: 'necromancer_lord', alt: 'necromancer_lord_2', height: 3.8, name: 'THE BONE PRIOR' },
  oc_chorister: { src: 'zombie_girl_1', alt: 'zombie_boy_1', height: 1.3, name: 'CHORISTER' },
  oc_oldprior: { src: 'skeleton_knight_giant', alt: 'bone_golem', height: 3.2, name: 'OLD PRIOR' },
};
