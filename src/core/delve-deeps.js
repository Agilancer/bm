// The Howling Deeps: the third party dungeon, a frozen cavern under the Rimeholt Fells, for a party of level 10 and up. The
// wind goes in at the Howling Mouth (portal, below: the path from Frostwatch ends at it) and never comes out. Goat men
// hold the upper galleries, wolves den among a herd of things frozen where they stood, spiders have webbed the gallery
// past the Goat-King's hall, and below the frozen falls nothing is awake that should be. Three bosses: Hrymgar the
// Goat-King, the Brood Mother, and the Sleeper Under the Ice, on its lake at the bottom.
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it (a cave, as the Warrens are),
// src/core/delve-build.js builds what's seen (rime, ice, cold lights), src/sim/delve-fights.js has the fights. Everything
// is local: x east, z south of the way in, y over the delve's own height.

const rooms = [
  { id: 'hd_mouth', x: 0, z: 0, r: 9, y: 0, roof: 7, name: 'the Howling Mouth' },
  { id: 'hd_galleries', x: -34, z: -42, r: 14, y: -2, roof: 10, name: 'the Wind Galleries', seam: 'frost:course' },
  { id: 'hd_herd', x: -78, z: -92, r: 15, y: -5, roof: 10, name: 'the Frozen Herd', rock: 'frost:stone', seam: 'frost:rubble' },
  { id: 'hd_ramshall', x: -62, z: -152, r: 21, y: -7, roof: 16, name: "the Goat-King's Hall", rock: 'frost:course', seam: 'frost:block', ground: 'frost:flags' },
  { id: 'hd_webs', x: 4, z: -180, r: 16, y: -9, roof: 11, name: 'the Webbed Gallery', seam: 'pale:rubble' },
  { id: 'hd_falls', x: 62, z: -160, r: 14, y: -11, roof: 16, name: 'the Frozen Falls', rock: 'frost:stone', ground: 'ice' },
  { id: 'hd_brood', x: 96, z: -218, r: 21, y: -13, roof: 15, name: 'the Brood Pit', rock: 'dark:rubble', seam: 'frost:rubble', ground: 'frost:course' },
  { id: 'hd_dark', x: 52, z: -268, r: 13, y: -18, roof: 10, name: 'the Lightless Stair', fires: 0, rock: 'dark:stone', seam: 'frost:stone' },
  { id: 'hd_lake', x: 40, z: -340, r: 31, y: -21, roof: 25, name: "the Sleeper's Lake", flat: true },
];
const tunnels = [
  { pts: [[-6, -7], [-16, -20], [-25, -31]], w: 3.2 },
  { pts: [[-43, -53], [-56, -62], [-68, -80]], w: 3 },
  { pts: [[-76, -107], [-74, -120], [-70, -132]], w: 3.4 },
  { pts: [[-42, -160], [-28, -170], [-12, -176]], w: 3.2 },
  { pts: [[19, -174], [34, -166], [48, -162]], w: 3 },
  { pts: [[70, -172], [78, -186], [84, -200]], w: 3.2 },
  { pts: [[80, -232], [70, -246], [62, -258]], w: 3 },
  { pts: [[50, -281], [47, -294], [44, -308]], w: 4.2 },
  // The galleries Hrymgar's herd comes down (dead ends off his hall).
  { pts: [[-82, -146], [-91, -141]], w: 1.9, dead: true },
  { pts: [[-52, -171], [-48, -180]], w: 1.9, dead: true },
  // Wind-cut niches and blind galleries off the rooms (nothing in them but the look of them).
  { pts: [[-46, -36], [-56, -30]], w: 1.6, niche: true, rise: 1.2 },
  { pts: [[-30, -55], [-26, -64]], w: 1.5, niche: true, rise: 0.8 },
  { pts: [[-92, -88], [-101, -84]], w: 1.7, niche: true, rise: 0.6 },
  { pts: [[8, -195], [11, -204]], w: 1.8, niche: true },
  { pts: [[-10, -188], [-17, -196]], w: 1.5, niche: true },
  { pts: [[75, -154], [84, -150]], w: 1.6, niche: true, rise: 1.5 },
  { pts: [[115, -212], [123, -208]], w: 1.7, niche: true },
  { pts: [[40, -262], [32, -258]], w: 1.5, niche: true, rise: -0.8 },
];
// Rock left standing in the Goat-King's hall, to break a charge on.
const pillars = [[-70, -146, 1.5], [-54, -158, 1.4]];

// ---- what stands in the rooms (src/core/delve-build.js draws each kind) ----------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
// The mouth: drifted snow, the first icicles.
add('drift', -5, -2, { r: 3 }); add('drift', 5.5, 1, { r: 2.4 });
// The wind galleries: ribs of ice the wind has cut, a sheet of it across the low side.
add('icepillar', -40, -36, { r: 1.1, solid: true }); add('icepillar', -27, -47, { r: 0.9, solid: true });
add('sheet', -38, -50, { r: 5 });
add('bones', -24, -36, { r: 2 });
// The frozen herd: beasts caught in the ice where they stood, their ribs and horns standing out of it.
for (const [x, z, s] of [[-84, -86, 1.2], [-74, -84, 0.9], [-88, -97, 1], [-70, -99, 1.3], [-80, -103, 0.8]]) add('frozen', x, z, { s });
add('sheet', -79, -93, { r: 8 });
// The Goat-King's hall: his seat of horn and ice, skulls on stakes, the herd's fires gone cold.
add('hornseat', -62, -170, { r: 1.6, solid: true });
for (const [x, z] of [[-76, -164], [-48, -166], [-80, -140], [-44, -140]]) add('stake', x, z);
add('bones', -58, -134, { r: 2.5 }); add('bones', -72, -160, { r: 2 });
// The webbed gallery: webs from roof to floor between the pillars, the wrapped dead.
add('icepillar', -2, -174, { r: 1, solid: true }); add('icepillar', 10, -186, { r: 1.1, solid: true });
for (const [x, z, x1, z1] of [[-2, -174, -9, -167], [10, -186, 16, -193], [-2, -174, 10, -186], [10, -186, 17, -178], [-2, -174, -8, -186]]) add('web', x, z, { x1, z1 });
for (const [x, z] of [[-6, -190], [14, -170], [1, -192], [-9, -176]]) add('cocoon', x, z);
// The frozen falls: a river caught as it fell, the pool under it solid.
add('falls', 71, -168, { yaw: -2.2, w: 9, h: 13 });
add('sheet', 66, -163, { r: 7 });
add('icepillar', 55, -152, { r: 1.2, solid: true });
// The brood pit: her eggs, webs across the ways, the bones of what she's eaten.
for (const [x, z] of [[84, -208], [108, -210], [110, -226], [88, -232], [100, -200]]) add('eggs', x, z);
for (const [x, z, x1, z1] of [[82, -214], [112, -220], [96, -236]].map(([x, z]) => [x, z, x + (96 - x) * 0.3, z + (-218 - z) * 0.3])) add('web', x, z, { x1, z1 });
add('bones', 104, -232, { r: 2.5 }); add('bones', 86, -224, { r: 1.8 });
// The lightless stair: nothing burns here; the ice itself has a little light in it.
add('icepillar', 56, -262, { r: 1, solid: true });
add('bones', 48, -272, { r: 2 });
// The Sleeper's lake: the ice, pillars of it standing out of the water it froze, the shapes under it.
add('lake', 40, -340, { r: 29 });
for (const [x, z, r] of [[22, -330, 1.7], [58, -330, 1.7], [28, -354, 1.6], [52, -354, 1.6]]) add('icepillar', x, z, { r, solid: true });
for (const [x, z, s] of [[30, -338, 1.6], [50, -346, 1.3], [40, -322, 1.1]]) add('shape', x, z, { s });

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const GOATS = ['goatman_bw', 'goatman_white', 'goatman_black', 'goatman_gold_bad'];
const WOLVES = ['werewolf_brown'];
const SPIDERS = ['spider_black', 'spider_red'];
const DEMONS = ['night_demon_black', 'night_demon_blue', 'night_demon_red'];
const COLD = ['Base', 'Bone-white', 'Ashen'];
const packs = [
  { key: 'hd_galleries', room: 'hd_galleries', pick: GOATS, n: 4, pal: COLD },
  { key: 'hd_herd', room: 'hd_herd', pick: WOLVES, n: 3, pal: ['Base', 'Bone-white', 'Abyssal'], more: { n: 2, pick: WOLVES, from: [-99, -85], when: 0.6 } },
  { key: 'hd_webs', room: 'hd_webs', pick: SPIDERS, n: 6, elite: ['flesh_spider_demon'], pal: ['Base', 'Bone-white'] },
  { key: 'hd_falls', room: 'hd_falls', pick: GOATS.concat(WOLVES), n: 4, pal: COLD },
  { key: 'hd_dark', room: 'hd_dark', pick: DEMONS, n: 3, pal: ['Base', 'Abyssal'] },
];
const bosses = [
  { key: 'hrymgar', room: 'hd_ramshall', name: 'Hrymgar the Goat-King', models: ['hd_hrymgar'], pal: ['Bone-white'], hp: 5400, damage: 62, reach: 3.2, loot: 8 },
  { key: 'broodmother', room: 'hd_brood', name: 'The Brood Mother', models: ['hd_broodmother'], pal: ['Bone-white'], hp: 6000, damage: 52, reach: 3.6, loot: 8 },
  { key: 'sleeper', room: 'hd_lake', name: 'The Sleeper Under the Ice', models: ['hd_sleeper'], pal: ['Abyssal'], hp: 9000, damage: 70, reach: 4.2, loot: 0 },
];
const warnings = {
  hry_charge: 'Hrymgar lowers his horns: he is coming down the line!',
  hry_three: 'Hrymgar charges again and again! Out of each line as it is marked.',
  hry_stamp: 'Hrymgar stamps! Step in behind each ring as it lands.',
  hry_quake: 'Hrymgar strikes the ice! Jump the ring as it reaches you.',
  hry_ice: 'Ice falls from the roof! Out of the circles.',
  hry_boulder: 'Hrymgar hurls a block of ice! Away from where it lands: it bursts.',
  hry_herd: 'Hrymgar bellows for his herd! Goat men come down the galleries: kill them.',
  hry_turn: 'Hrymgar turns on you! Get behind the tank, or out of his reach, till he lets go.',
  hry_enrage: 'Hrymgar is enraged!',
  brd_open: 'The Brood Mother. Keep out of her webs, and kill her broods before they swarm the healer.',
  brd_web: 'She spins a web under you! Out of it, and stay out: it bites while it holds.',
  brd_threads: 'Threads run out from her! Out of the lines.',
  brd_spit: 'She spits! Step between the gobs, and off the puddles.',
  brd_cone: 'Venom! Out from in front of her.',
  brd_rain: 'Venom rains down! Keep moving.',
  brd_brood: 'A brood hatches! Kill the spiderlings.',
  brd_turn: 'The Brood Mother turns on you! Get behind the tank till she lets go.',
  brd_enrage: 'The Brood Mother is enraged!',
  slp_open: 'The Sleeper wakes under the ice.',
  slp_crack: 'The lake cracks! Out of the lines: the cracks stay open.',
  slp_dark: 'The dark comes after you! Keep moving: it tires.',
  slp_rings: 'Cold rings! Out of them, then step in behind.',
  slp_fall: 'Ice falls from the roof! Out of the circles.',
  slp_wail: 'The Sleeper wails! Close in against it, or get right away.',
  slp_under: 'The Sleeper goes under the ice! It comes up beneath you: out of the circle, then jump the ring.',
  slp_up: 'The Sleeper is up, and the lake breaks with it!',
  slp_demons: 'Its dreams walk! Night demons come out of the dark.',
  slp_turn: 'The Sleeper turns on you! Get behind the tank, out of its reach, till it looks away.',
  slp_enrage: 'The Sleeper is enraged: it will kill you all!',
};

export const DEEPS = {
  key: 'deeps', tag: 'hd', name: 'The Howling Deeps', short: 'the Deeps', x: 900, z: 6200, y: -50, level: 10, style: 'cave',
  rooms, tunnels, pillars, props, packs, bosses, warnings,
  turnWarn: { hrymgar: 'hry_turn', broodmother: 'brd_turn', sleeper: 'slp_turn' },
  entry: { x: 0, z: 3, yaw: Math.PI }, exitIn: { x: 0, z: 6.5 }, exitOut: { x: 40, z: -365 },
  // The Howling Mouth (SITES.deepsmouth), facing west to the path from Frostwatch.
  portal: { x: 880, z: 3990, yaw: -Math.PI / 2, r: 2.2 },
  last: 'sleeper', tough: { hp: 5.5, damage: 1.3 }, pay: { xp: 2600, gold: 420 },
  look: { wall: 'frost:rubble', floor: 'frost:rubble', roof: 'frost:stone', spike: 'ice', flame: 'frost:flame', cold: true, light: [0.5, 0.74, 1], fire: [0.56, 0.8, 1], every: 8 },
  words: { enter: 'The Howling Deeps. The wind goes in and does not come out.', clear: 'The Howling Deeps are cleared. The Sleeper is dead!', wipe: 'Your party falls... and wakes at the Howling Mouth.' },
};
