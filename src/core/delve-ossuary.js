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

// (Each room its own section: a low porch, a nave more than twice as tall as it's wide, a low aisle of bone, a crypt a man
// and a half high. Lit in pools of his red, dark between; and one wall of skulls to each great room, seen as you come in.)
const rooms = [
  R('oc_porch', 'the Bone Porch', 0, -15, 4.5, 23, 0, 5, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_bone_joint_flags', banners: 0, fires: 0 }),
  R('oc_nave', 'the Nave of Skulls', 0, -60, 10, 33, 0, 24, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_mausoleum_marble', banners: 22, cloth: 'p2_banner_white', hang: 0, fires: 0 }),
  R('oc_charnel', 'the Charnel Aisle', -30, -59, 7, 21, 0, 6, { rock: 'p2_bone_plaster', foot: 'pale:block', ground: 'p2_bones_ground', banners: 0, fires: 0 }),
  R('oc_choir', 'the Choir of Jaws', 36, -60, 14, 15, 0, 12, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_mausoleum_marble', banners: 14, cloth: 'p2_banner_white', hang: 0, fires: 0 }),
  R('oc_stair', 'the Crypt Stair', -30, -96, 3.5, 20, -4, 6, { tz: 8 / 40, fires: 0, banners: 0, rock: 'p2_bone_plaster', foot: 'pale:block' }),
  R('oc_crypt', 'the Under-Crypt', -30, -128, 13, 15, -8, 5.5, { rock: 'p2_waterline_wall', foot: 'mire:block', ground: 'p2_bones_ground', banners: 0, fires: 0 }),
  R('oc_vestry', 'the Vestry', 43, -91, 4.5, 4.5, 0, 5, { rock: 'p2_black_panelling', foot: 'dark:block', ground: 'p2_worn_floorboards', banners: 0, fires: 0 }),
  R('oc_sanct', 'the Sanctuary', 18, -110, 16, 20, 0, 18, { rock: 'p2_bone_wall', foot: 'pale:block', ground: 'p2_oxblood_marble', banners: 18, cloth: 'p2_banner_white', hang: 0, fires: 0 }),
];

const tunnels = [
  { pts: [[-8, -46], [-25, -46]], w: 2.6, h: 5 },                        // the nave's two arches to the Charnel Aisle
  { pts: [[-8, -70], [-25, -70]], w: 2.6, h: 5 },
  { pts: [[8, -56], [24, -56]], w: 3, h: 5.5 },                          // the nave to the Choir
  { pts: [[-22, -141], [-22, -152], [14, -152], [14, -128]], w: 2.4, h: 4.4 },   // the Priors' Stair, from the crypt up to the Sanctuary's back
  // The Vestry: behind a wall of skulls in the Choir's south wall. On no map.
  { pts: [[41, -73], [41, -88]], w: 1.3, h: 3, dark: true },
  // Where her choir and his old priors come in.
  { pts: [[48, -50], [55, -50]], w: 2, h: 4, dead: true, door: 'oc_choir' },
  { pts: [[48, -70], [55, -70]], w: 2, h: 4, dead: true, door: 'oc_choir' },
  { pts: [[4, -100], [-3, -100]], w: 2, h: 4, dead: true, door: 'oc_sanct' },
  { pts: [[32, -116], [39, -116]], w: 2, h: 4, dead: true, door: 'oc_sanct' },
];

// The Sanctuary's four piers of bone: what the Bone Prior pulls down, each along its own line (src/sim/castle-fights-b.js).
export const BONE_PIERS = [[8, -98], [28, -104], [8, -114], [28, -120]];
// His altar, at the Sanctuary's far end.
export const ALTAR = [18, -126];

const props = [];
{
  const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
  // ---- the Bone Porch: low. Skulls built into its west wall, a bone candle-tree at each end, his font, the way back out
  // to the High Ward's terrace in the east wall.
  add('lintel', 0, -2, { hx: 4.5, stone: 'pale:stone' });
  add('skullwall', -4.36, -16, { yaw: PI / 2, w: 6, h: 3.4 });
  add('bonefont', -2.4, -34, { r: 0.7 }); add('bonetree', 3.2, 2.4, { h: 2.8 }); add('bonetree', 3.2, -33, { h: 2.8 });
  add('mark', 4.25, -12, { up: 3.2, r: 0.5, yaw: -PI / 2, back: -1 });
  // ---- the Nave of Skulls: more than twice as tall as it's wide. A wall of skulls up each long side to the roof, the
  // red light falling in the middle of the floor, bone piers down both sides (never two across from each other), stalls
  // at each end. Its light is the red in the middle, and a fire at each end.
  add('skullwall', -9.86, -58, { yaw: PI / 2, w: 8, h: 17, s: 0.36 }); add('skullwall', 9.86, -76, { yaw: -PI / 2, w: 7, h: 17, s: 0.36 });
  [-36, -48, -62, -74, -86].forEach((z, i) => add('bonepier', i % 2 ? 7 : -7, z, { hx: 1.4, hz: 0.7, solid: true }));
  for (const z of [-38, -42]) add('stall', 3.6, z, { hx: 2.2, yaw: PI });
  for (const z of [-80, -84]) add('stall', -3.6, z, { hx: 2.2, yaw: PI });
  add('daylight', 0, -60, { r: 3 }); add('rings', 0, -60, { r: 4 });
  // (The runner stops either side of the ring of black glass: a strip through a ring is a bar across it.)
  add('carpet', 0, -43, { hx: 1.2, hz: 11.4, layer: 'blood:cloth_red' }); add('carpet', 0, -78, { hx: 1.2, hz: 12.4, layer: 'blood:cloth_red' });
  add('bonetree', -8, -41, { h: 3.6 }); add('bonetree', 8, -66, { h: 3.6 }); add('bonetree', -8, -80, { h: 3.6 });
  add('brazier', -3.4, -30.6); add('brazier', 3.4, -30.6); add('brazier', -5, -90.4);
  add('decal', -9.95, -88, { layer: 'p2_wax_drips', w: 2, h: 2, up: 1, yaw: PI / 2 });
  // ---- the Charnel Aisle: low. Bones in stacks down both walls, biers, a heap not yet sorted, the sorters' table. One fire.
  for (const z of [-44, -58, -72]) add('charnel', -36.3, z, { yaw: PI / 2 });
  add('charnel', -23.7, -58, { yaw: -PI / 2 });
  add('bier', -30, -50, { hx: 1, hz: 2.2 }); add('bier', -31, -66, { hx: 1, hz: 2.2 });
  add('bones', -28, -58, { r: 1.4 }); add('bones', -33, -75, { r: 1.2 }); add('heap', -27, -40.6, { r: 1.3, layer: 'pale:rubble' });
  add('table', -33.4, -40.2, { hx: 2, hz: 0.7 }); add('candles', -33.4, -40.2, { up: 0.85 }); add('urn', -25, -64); add('urn', -35.6, -65);
  add('brazier', -29, -44.4);
  // ---- the Choir of Jaws: the stalls in two ranks facing each other across the floor, her lectern at their head, a wall
  // of skulls up the east wall; and another stood a little out from the south wall. A ring of candles over the floor.
  for (const x of [28, 30.8]) add('stall', x, -60, { hx: 7, yaw: PI / 2 });
  for (const x of [44, 41.2]) add('stall', x, -60, { hx: 7, yaw: -PI / 2 });
  add('lectern', 36, -49); add('carpet', 36, -60, { hx: 2, hz: 11, layer: 'blood:cloth_red' });
  add('skullwall', 49.86, -60, { yaw: -PI / 2, w: 6, h: 9.4, s: 0.32 });
  add('skullwall', 41.6, -73.8, { yaw: 0.22, w: 2.2, h: 3.2 });
  add('mark', 36, -45.4, { up: 6.6, r: 1.2, back: 1 });
  add('chandelier', 36, -60, { up: 7, hang: true });
  add('bonetree', 24, -48.4); add('bonetree', 48, -72.6); add('brazier', 24.4, -72.6); add('brazier', 47.6, -47.6); add('brazier', 31, -46.4); add('brazier', 41, -73.6);
  // ---- the Crypt Stair, and the Under-Crypt: a man and a half high. His old priors on their biers in two rows, their
  // urns, their dead guard against the walls, standing water. One fire at the stair's foot.
  add('urn', -32.4, -86); add('urn', -27.6, -104);
  [[-39, -120], [-39, -130], [-39, -140], [-21.6, -124], [-21.6, -134]].forEach(([x, z]) => { add('bier', x, z, { hx: 2, hz: 0.9 }); add('urn', x + (x < -30 ? 2.8 : -2.8), z + 1.3); });
  add('deadguard', -42.6, -125, { yaw: PI / 2 }); add('deadguard', -42.6, -135, { yaw: PI / 2 }); add('deadguard', -17.4, -129, { yaw: -PI / 2 });
  add('pool', -30, -130, { r: 3, up: 0.03, layer: 'mire:water' }); add('bones', -35, -141, { r: 1.2 }); add('gravegoods', -26, -116.4, { r: 1.2 });
  add('brazier', -33.4, -117); add('brazier', -27, -140.6);
  // (Stacked to the vault along its walls, as a charnel house stacks them; two fires hung low over the water.)
  for (const z of [-118, -127.5, -137]) { add('charnel', -42.9, z, { yaw: PI / 2, w: 2.6, h: 4.4 }); add('charnel', -17.1, z, { yaw: -PI / 2, w: 2.6, h: 4.4 }); }
  add('charnel', -36, -142.9, { yaw: 0, w: 3.4, h: 4.4 }); add('charnel', -24, -142.9, { yaw: 0, w: 3.4, h: 3 });
  add('basket', -33, -127, { up: 3.6 }); add('basket', -27, -135, { up: 3.6 });
  add('decal', -42.95, -130, { layer: 'p2_damp_rise', w: 4, h: 3, up: 0.1, yaw: PI / 2 });
  // ---- the Vestry: the tithe box, the plate.
  add('table', 43, -94.4, { hx: 2, hz: 0.6 }); add('candles', 42, -94.4, { up: 0.85 }); add('gold', 44.6, -94.2, { r: 0.5 });
  // ---- the Sanctuary: the altar on its step at the far end, and behind it a wall of skulls to the roof with his mark on
  // it; the four piers of bone; the fonts; skulls up the west wall. Fire at the altar, and at the way in; a ring of candles.
  add('skullwall', ALTAR[0], -129.86, { yaw: 0, w: 12, h: 14, s: 0.36 });
  add('candles', ALTAR[0] - 3.6, ALTAR[1] + 1.4, { s: 1.2 }); add('candles', ALTAR[0] + 3.6, ALTAR[1] + 1.4, { s: 1.2 });
  add('altar', ALTAR[0], ALTAR[1], { hx: 2.6, hz: 1 }); add('mark', ALTAR[0], -129.2, { up: 9.6, r: 2.2, back: -1 });
  for (const [x, z] of BONE_PIERS) add('bonepier', x, z, { hx: 1.4, hz: 0.7, solid: true });
  add('bonefont', 12, -123.4, { r: 0.9 }); add('bonefont', 24, -123.4, { r: 0.9 });
  add('bonetree', 6, -128, { h: 4 }); add('bonetree', 30.6, -124, { h: 4 });
  add('skullwall', 2.14, -112, { yaw: PI / 2, w: 5, h: 8, s: 0.3 });
  add('carpet', 18, -108, { hx: 1.4, hz: 13, layer: 'blood:cloth_red' }); add('chandelier', 18, -106, { up: 9, hang: true });
  for (const [x, z] of [[10, -127.4], [26, -127.4], [13, -92.6], [5, -98]]) add('brazier', x, z);
}
const daises = [{ x: 18, z: -126, hx: 8, hz: 3.4, dy: 0.5 }];

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const PRIESTS = ['necromancer_f1', 'necromancer_f2', 'necromancer_2', 'necromancer_3'];
const DEAD = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
// (None in the Bone Porch: it's where you wake if you fall.)
const packs = [
  { key: 'oc_nave_n', room: 'oc_nave', pick: KNIGHTS, n: 4, pal: ['Skullwhite'], at: [0, 20], r: 3 },
  { key: 'oc_nave_s', room: 'oc_nave', pick: PRIESTS.concat(KNIGHTS), n: 5, elite: ['necromancer_lord'], pal: ['Skullwhite'], ai: 'caster', tough: { hp: 1.2, damage: 1.2 }, at: [0, -22], r: 3 },
  { key: 'oc_charnel', room: 'oc_charnel', pick: ['bone_golem', 'skeleton_knight_giant'], n: 3, pal: ['Skullwhite', 'Bone-white'], tough: { hp: 1.3, damage: 1.2 }, at: [0, 0], r: 3 },
  { key: 'oc_stair', room: 'oc_stair', pick: KNIGHTS, n: 3, pal: ['Skullwhite'], at: [0, 0], r: 2 },
  { key: 'oc_crypt', room: 'oc_crypt', pick: DEAD.concat(['possessed_knight_1', 'possessed_knight_2']), n: 6, elite: ['skeleton_knight_giant'], pal: ['Skullwhite', 'Bone-white'], tough: { hp: 1.3, damage: 1.3 }, at: [0, 0], r: 5 },
  // The sacrists' round, up and down the Priors' Stair.
  { key: 'oc_sacrists', room: 'oc_crypt', pick: PRIESTS, n: 2, pal: ['Skullwhite'], ai: 'caster', at: [26, -24], r: 1, walk: [[-22, -150], [-4, -152], [14, -147]] },
];
const bosses = [
  { key: 'cantor', room: 'oc_choir', name: 'The Cantor of Jaws', models: ['oc_cantor'], pal: ['Skullwhite'], hp: 106000, damage: 385, reach: 3.0, loot: 8 },
  { key: 'boneprior', room: 'oc_sanct', name: 'The Bone Prior', models: ['oc_prior'], pal: ['Skullwhite'], hp: 132000, damage: 400, reach: 3.6, loot: 0, at: [0, -2], needs: ['cantor'], shut: 'pri_shut', gives: 'key:ossuary' },
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
  pri_open: 'The Bone Prior. When he names one of you, the named RUNS, round the walls and away from the rest: bone comes up wherever the named has just stood. (What you emptied below tells here: the Under-Crypt empty, his old priors lie still when he calls; the Charnel Aisle empty, he has no piers of bone to pull down.)',
  pri_less_priors: 'The Under-Crypt is empty: his old priors lie still when he calls them.',
  pri_less_piers: 'The Charnel Aisle is empty: he has no bone to build his piers up again, and cannot pull them down.',
  pri_crozier: 'The Prior swings his crozier! Out of the arc.',
  pri_piers: 'He pulls the piers of bone down! Out of their lines.',
  pri_litany: 'His litany comes after you! Keep moving.',
  pri_ash: 'Ash of the dead! Out of the pools.',
  pri_quake: 'He strikes the floor! Jump the ring as it reaches you.',
  pri_kneel: 'HE NAMES ONE OF YOU: RUN! Round the walls, away from the rest; everyone else, out of the circles behind them!',
  pri_stood: 'The named stood: he drinks what it cost them.',
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
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 29, z: -127.4 },
  portal: LOWER_WARD.portal,
  // Its door back out onto the High Ward's east terrace.
  links: [{ x: 3, z: -12, yaw: -PI / 2, to: 'highward', n: 3 }],
  chests: [
    { id: 'vestry', room: 'oc_vestry', x: 46, z: -87.8, yaw: PI, loot: 3 },
    { id: 'crypt', room: 'oc_crypt', x: -41, z: -141.4, yaw: 0.8, loot: 3 },
    { id: 'charnel', room: 'oc_charnel', x: -35.6, z: -78.6, yaw: 0.6, loot: 2 },
  ],
  vistas: [{ id: 'red_light', name: 'the Red Light in the Nave of Skulls', room: 'oc_nave', x: 0, z: -60, r: 3.6 }],
  auto: { way: ['oc_porch', 'oc_nave', 'oc_charnel', 'oc_stair', 'oc_crypt', 'oc_stair', 'oc_charnel', 'oc_nave', 'oc_choir', 'oc_vestry', 'oc_choir', 'oc_nave', 'oc_sanct'] },
  shots: [
    ['oc_nave', 'oc_porch', [0, 2.4, -30], [0, 7.5, -92]],
    ['oc_choir', 'oc_nave', [23.6, 2.6, -56], [47, 3.4, -63]],
    ['oc_crypt', 'oc_stair', [-30, -5.6, -115], [-31, -7.2, -142]],
    ['oc_sanct', 'oc_nave', [6, 2.6, -91.6], [19, 6.5, -130]],
  ],
  last: 'boneprior', tough: { hp: 37, damage: 3.95 }, pay: { xp: 110000, gold: 13000 },
  names: { "Velscour's Knights": 'OSSUARY KNIGHT', Necromancers: 'SACRIST', 'Bone Giants': 'CHARNEL-BUILT', 'Dead Children': 'CHORISTER' },
  look: { wall: 'pale:ashlar', foot: 'pale:block', floor: 'pale:flags', banner: 'p2_banner_white', roof: 'pale:stone', flame: 'blood:flame', light: [1, 0.3, 0.16], fire: [1, 0.34, 0.18], fog: [0.03, 0.012, 0.01, 0.01], every: 15, high: 3, glow: 3.5, lit: true, beam: 'pale:stone', bays: 'chains' },
  words: { enter: 'Castle Velscour: the Ossuary Chapel. His chapel. Everyone who built his castle is in its walls.', clear: 'The Bone Prior is dead! Nobody kneels in his chapel now.', wipe: 'You fall... and wake in the Bone Porch.' },
};
export const OSSUARY_VARIANTS = {
  oc_cantor: { src: 'necromancer_f2', alt: 'necromancer_f1', height: 3.6, name: 'THE CANTOR OF JAWS' },
  oc_prior: { src: 'necromancer_lord', alt: 'necromancer_lord_2', height: 4.3, name: 'THE BONE PRIOR' },
  oc_chorister: { src: 'zombie_girl_1', alt: 'zombie_boy_1', height: 1.3, name: 'CHORISTER' },
  oc_oldprior: { src: 'skeleton_knight_giant', alt: 'bone_golem', height: 3.2, name: 'OLD PRIOR' },
};
