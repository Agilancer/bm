// Blackvigil Keep: the second party dungeon, Velscour's castle at the end of the Vigil Road, for a party of level 14 and
// up. Its gate is shut to you; the way in is the portal standing before it (portal, below), and what the portal opens on is
// the inside of the keep: the gate passage, the guardroom and the lower ward, the Warden's gate, the barracks and the
// armoury, the sorcerers' gallery and their library, the Magister's sanctum, the chapel, the great stair up to the great
// hall, the Hollow Court, the banner walk, and the throne room at the top. Four bosses: the Warden of the Gate, the
// Magister, the Hollow Brothers and the Castellan.
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it (a castle: rooms with four straight
// walls, level floors, straight passages), src/core/delve-build.js builds what's seen, src/sim/delve-fights.js has the
// fights. Everything is local: x east, z south of the way in, y over the delve's own height. Rooms and passages keep to even
// metres, so the walls fall on the builder's cells.
//
// Velscour's house: his black stone, his red, his fire. Nothing of Tessariel's is down here (README "The two sides").

// A room with four walls: its middle, half its width (x) and length (z), its floor, how high its roof is over that.
// (rock, foot, ground: a room's own masonry where it isn't the keep's: its walls, the course at their foot, its floor.
// castleShell in src/core/delve-build.js. Black, 'dark:', where his sorcerers and his chapel are, and round his throne.)
const R = (id, name, x, z, hx, hz, y, roof, o = {}) => ({ id, name, x, z, hx, hz, y, roof, ...o });

const rooms = [
  R('bv_gate', 'the Gate Passage', 0, -2, 8, 12, 0, 9, { rock: 'course' }),
  R('bv_guard', 'the Guardroom', 0, -38, 12, 12, 0, 8, { rock: 'course', ground: 'stone' }),
  R('bv_ward', 'the Lower Ward', 0, -88, 16, 28, 0, 14, { rock: 'block', ground: 'stone' }),
  R('bv_innergate', "the Warden's Gate", 0, -148, 20, 20, 0, 16, { rock: 'ashlar', foot: 'dark:ashlar' }),
  R('bv_barracks', 'the Barracks', 48, -148, 14, 20, 0, 8, { rock: 'course', foot: 'dark:course' }),
  R('bv_armoury', 'the Armoury', 48, -106, 12, 12, 0, 7, { rock: 'block', foot: 'dark:block' }),
  R('bv_gallery', "the Sorcerers' Gallery", 48, -212, 6, 32, 0, 11, { rock: 'dark:ashlar' }),
  R('bv_library', 'the Black Library', 48, -274, 16, 18, 0, 12, { rock: 'dark:block', foot: 'dark:course' }),
  R('bv_sanctum', "the Magister's Sanctum", 0, -274, 20, 20, 0, 18, { rock: 'dark:ashlar', ground: 'dark:flags' }),
  R('bv_chapel', 'the Chapel of Velscour', -48, -262, 14, 24, 0, 16, { rock: 'dark:block', foot: 'dark:course', ground: 'dark:flags' }),
  // (The stair climbs twelve metres going south: its floor is a slope, the steps are laid on it.)
  R('bv_stair', 'the Great Stair', -48, -200, 7, 24, 6, 12, { tz: 0.25, fires: 12, rock: 'course' }),
  R('bv_hall', 'the Great Hall', -48, -136, 16, 30, 12, 15, { rock: 'ashlar' }),
  R('bv_court', 'the Hollow Court', -48, -74, 20, 20, 12, 16, { rock: 'block', ground: 'stone' }),
  R('bv_walk', 'the Banner Walk', -92, -108, 8, 42, 12, 12, { foot: 'dark:course' }),
  R('bv_ante', 'the Antechamber', -92, -176, 12, 14, 12, 10, { rock: 'dark:block' }),
  R('bv_throne', 'the Throne Room', -92, -232, 22, 30, 12, 22, { rock: 'dark:ashlar', foot: 'dark:block', ground: 'dark:flags' }),
];

// Passages: w is half the width, h the height.
const tunnels = [
  { pts: [[0, -14], [0, -26]], w: 3, h: 6 },
  { pts: [[0, -50], [0, -60]], w: 3, h: 6 },
  { pts: [[0, -116], [0, -128]], w: 4, h: 8 },
  { pts: [[20, -148], [34, -148]], w: 3, h: 6 },
  { pts: [[48, -128], [48, -118]], w: 3, h: 5 },
  { pts: [[48, -168], [48, -180]], w: 3, h: 6 },
  { pts: [[48, -244], [48, -256]], w: 3, h: 6 },
  { pts: [[32, -274], [20, -274]], w: 3, h: 7 },
  { pts: [[-20, -274], [-34, -274]], w: 3, h: 7 },
  { pts: [[-48, -238], [-48, -224]], w: 5, h: 9 },
  { pts: [[-48, -176], [-48, -166]], w: 5, h: 9 },
  { pts: [[-48, -106], [-48, -94]], w: 4, h: 8 },
  { pts: [[-68, -74], [-84, -74]], w: 3, h: 6 },
  { pts: [[-92, -150], [-92, -162]], w: 3, h: 6 },
  { pts: [[-92, -190], [-92, -202]], w: 4, h: 9 },
  // Doors that only open from the other side: where the guard comes through in a fight (dead ends).
  { pts: [[62, -140], [68, -140]], w: 2, h: 4, dead: true, door: 'bv_barracks' },
  { pts: [[-20, -138], [-24, -138]], w: 2, h: 4, dead: true, door: 'bv_innergate' },
  { pts: [[-20, -158], [-24, -158]], w: 2, h: 4, dead: true, door: 'bv_innergate' },
  { pts: [[-114, -212], [-119, -212]], w: 2, h: 4, dead: true, door: 'bv_throne' },
  { pts: [[-114, -228], [-119, -228]], w: 2, h: 4, dead: true, door: 'bv_throne' },
  { pts: [[-114, -244], [-119, -244]], w: 2, h: 4, dead: true, door: 'bv_throne' },
  { pts: [[-70, -212], [-66, -212]], w: 2, h: 4, dead: true, door: 'bv_throne' },
  { pts: [[-70, -226], [-66, -226]], w: 2, h: 4, dead: true, door: 'bv_throne' },
];

// The gallery's alcoves, a step up from its floor, where the sorcerers stand: east and west by turns.
const ALCOVES = [[57, -192], [39, -204], [57, -216], [39, -228], [57, -238]];
const nooks = ALCOVES.map(([x, z], i) => R(`bv_alcove_${i}`, 'an alcove', x, z, 3, 3, 0.6, 6));
// Floor raised a step: the chapel's sanctuary, the hall's high table, the throne's dais.
const daises = [
  { x: -48, z: -281, hx: 9, hz: 5, dy: 0.5 },
  { x: -48, z: -111, hx: 10, hz: 4, dy: 0.4 },
  { x: -92, z: -252, hx: 10, hz: 9, dy: 0.7 },
];

// ---- what stands in the rooms (src/core/delve-build.js draws each kind) ----------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
// Two rows of columns down a hall, an arch of stone sprung across between each pair.
function nave(cx, half, z0, z1, step, r, spring, rise) {
  for (let z = z0; z <= z1 + 0.01; z += step) {
    add('column', cx - half, z, { r, solid: true }); add('column', cx + half, z, { r, solid: true });
    add('arch', cx - half, z, { x1: cx + half, z1: z, spring, rise });
  }
}
// The gate passage: the portcullis the portal stands in front of, and the murder holes' grates.
add('portcullis', 0, -13.6, { w: 3, h: 6 });
add('rack', -7.5, -6, { yaw: Math.PI / 2 }); add('rack', 7.5, -6, { yaw: -Math.PI / 2 });
// The guardroom: a table, their racks, barrels.
add('table', -5, -40, { hx: 1, hz: 3.5, solid: true });
add('rack', -11.5, -32, { yaw: Math.PI / 2 }); add('rack', -11.5, -44, { yaw: Math.PI / 2 }); add('rack', 11.5, -38, { yaw: -Math.PI / 2 });
add('barrels', 8.5, -46.5); add('barrels', 9, -29.5);
// The lower ward: a pillared hall.
nave(0, 8, -108, -68, 10, 1, 8.5, 3.5);
add('cage', -12, -76, { up: 7 }); add('cage', 12, -100, { up: 8 }); add('cage', 12, -70, { up: 6.5 });
add('carpet', 0, -88, { hx: 2, hz: 27 });
// The Warden's gate: four great piers, the inner portcullis behind him, his braziers.
for (const [x, z] of [[-11, -139], [11, -139], [-11, -157], [11, -157]]) add('column', x, z, { r: 1.4, solid: true });
add('portcullis', 0, -167.6, { w: 4, h: 9 });
add('carpet', 0, -148, { hx: 2.5, hz: 19 });
// The barracks: bunks in two rows, an aisle between; arms at the ends.
for (let z = -164; z <= -132; z += 8) { add('bunk', 39, z, { hx: 2.2, hz: 1.1, solid: true }); add('bunk', 57, z, { hx: 2.2, hz: 1.1, solid: true }); }
add('rack', 61.5, -152, { yaw: -Math.PI / 2 }); add('rack', 34.5, -136, { yaw: Math.PI / 2 }); add('barrels', 59, -130.5);
// The armoury: racks on every wall, the forge's anvil, crates of bolts.
for (const z of [-114, -106, -98]) { add('rack', 36.5, z, { yaw: Math.PI / 2 }); add('rack', 59.5, z, { yaw: -Math.PI / 2 }); }
add('stand', 42, -100); add('stand', 54, -100); add('stand', 42, -112); add('stand', 54, -112);
add('anvil', 53, -111, { r: 0.9, solid: true });
add('barrels', 57.5, -96.5); add('crates', 38.5, -96);
// The sorcerers' gallery: a rail before each alcove, a red runner the length of it.
add('carpet', 48, -212, { hx: 1.5, hz: 31 });
ALCOVES.forEach(([x, z]) => add('candles', x + (x > 48 ? 1.8 : -1.8), z));
// The library: shelves in ranks, reading desks, the chained books.
for (const x of [38, 44, 52, 58]) for (const z of [-284, -264]) add('shelf', x, z, { hx: 0.6, hz: 5, h: 5.5, solid: true });
add('table', 48, -289, { hx: 3.5, hz: 1, solid: true }); add('candles', 48, -289, { up: 1 });
// The Magister's sanctum: a ring of columns, his lectern north of the middle, the circle cut in the floor.
for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; add('column', Math.round(Math.sin(a) * 14), -274 + Math.round(Math.cos(a) * 14), { r: 1, solid: true }); }
add('lectern', 0, -286, { r: 0.9, solid: true });
add('circle', 0, -274, { r: 8 });
// The chapel: pews either side of the aisle, the altar on its sanctuary at the north end under his red, columns down both sides.
nave(-48, 9, -272, -244, 14, 0.9, 9.5, 4);
for (let z = -268; z <= -246; z += 5.5) { add('pew', -53, z, { hx: 2.8, hz: 0.6, solid: true }); add('pew', -43, z, { hx: 2.8, hz: 0.6, solid: true }); }
add('altar', -48, -282, { hx: 2.6, hz: 1.1, solid: true });
add('brazier', -55, -280); add('brazier', -41, -280);
add('carpet', -48, -260, { hx: 1.5, hz: 21 });
// The great stair: its steps, and his red down the middle of them.
add('carpet', -48, -200, { hx: 2, hz: 24 });
// The great hall: long tables down both sides, the high table across the far end on its dais, the hearth, chandeliers.
for (const z of [-152, -138, -124]) { add('table', -55, z, { hx: 1.1, hz: 5.5, solid: true }); add('table', -41, z, { hx: 1.1, hz: 5.5, solid: true }); }
add('table', -48, -110.5, { hx: 7, hz: 1.1, solid: true });
for (const z of [-154, -136, -118]) add('chandelier', -48, z, { up: 9 });
add('hearth', -63.4, -136, { yaw: Math.PI / 2 }); add('hearth', -32.6, -136, { yaw: -Math.PI / 2 });
for (let z = -160; z <= -112; z += 12) add('beam', -48, z, { hx: 16, up: 12.5 });
// The Hollow Court: four piers, a ring of his braziers, the brothers' two stone seats against the south wall.
for (const [x, z] of [[-60, -86], [-36, -86], [-60, -62], [-36, -62]]) add('column', x, z, { r: 1.3, solid: true });
add('seat', -53, -56.5, { hx: 1.2, hz: 1, solid: true }); add('seat', -43, -56.5, { hx: 1.2, hz: 1, solid: true });
add('circle', -48, -74, { r: 10 });
// The banner walk: his red hung the length of it, stands of arms between.
for (let z = -142; z <= -76; z += 11) { add('stand', -98.6, z); add('stand', -85.4, z + 5.5); }
add('carpet', -92, -108, { hx: 1.5, hz: 41 });
// The antechamber: his guards' braziers, two great doors of iron shut behind you.
add('brazier', -100, -186); add('brazier', -84, -186);
add('carpet', -92, -176, { hx: 2, hz: 13 });
// The throne room: columns down both sides, the throne on its dais at the north end, the way out behind it.
nave(-92, 13, -244, -212, 8, 1.2, 13, 5.5);
add('throne', -92, -249, { hx: 1.6, hz: 1.2, solid: true });
add('brazier', -99, -246); add('brazier', -85, -246);
add('carpet', -92, -226, { hx: 2.5, hz: 20 });
for (const z of [-236, -220]) add('chandelier', -92, z, { up: 13 });

// ---- who's in it ----------------------------------------------------------------------------------------------------------
// (Whichever of these the roster has: the knights' look-alikes are added as they're made. src/sim/tripo.js keeps the ones
// it knows.)
const KNIGHTS = ['velscour_knight_1', 'velscour_knight_2', 'velscour_lancer', 'velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6', 'velscour_knight_7', 'velscour_knight_8', 'velscour_lancer_2', 'velscour_lancer_3'];
const NECROS = ['necromancer_2', 'necromancer_3', 'necromancer_f1', 'necromancer_f2'];
const LORDS = ['necromancer_lord', 'necromancer_lord_2'];
const PLAGUE = ['plague_knight_black', 'plague_knight_red'];
const POSSESSED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const RED = ['Base', 'Base', 'Bloodsoaked'];

// A pack: at: where in its room it stands (from the room's middle). spots: each one's own place (local), stood still there.
// elite: one of these leads it. walk: a beat it walks, there and back (local points), till it sees you. more: others who
// come through a door part way through the fight (n of pick, from a local point, when so much of the pack is dead).
const packs = [
  { key: 'bv_guard', room: 'bv_guard', pick: KNIGHTS, n: 5, pal: RED, at: [2, 0] },
  { key: 'bv_ward_south', room: 'bv_ward', pick: KNIGHTS, n: 5, pal: RED, at: [0, 17], r: 5 },
  { key: 'bv_ward_north', room: 'bv_ward', pick: KNIGHTS.concat(PLAGUE), n: 5, pal: RED, at: [0, -17], r: 5 },
  { key: 'bv_barracks', room: 'bv_barracks', pick: KNIGHTS, n: 5, pal: RED, at: [0, -4], r: 4, more: { n: 2, pick: KNIGHTS, from: [64, -140], when: 0.6 } },
  { key: 'bv_armoury', room: 'bv_armoury', pick: PLAGUE.concat(KNIGHTS.slice(0, 2)), n: 4, pal: ['Base', 'Ashen'] },
  { key: 'bv_gauntlet', room: 'bv_gallery', pick: NECROS, n: 5, pal: ['Base', 'Infernal'], spots: ALCOVES.map(([x, z]) => [x, z]), wake: 44 },
  { key: 'bv_gallery_watch', room: 'bv_gallery', pick: KNIGHTS, n: 3, pal: RED, at: [0, 20], r: 2, walk: [[48, -186], [48, -238]] },
  { key: 'bv_library', room: 'bv_library', pick: NECROS.concat(KNIGHTS.slice(0, 3)), n: 5, elite: LORDS, pal: ['Base', 'Abyssal'] },
  { key: 'bv_chapel', room: 'bv_chapel', pick: PLAGUE.concat(NECROS), n: 6, pal: ['Base', 'Bloodsoaked'], at: [0, 6], r: 5 },
  { key: 'bv_stair', room: 'bv_stair', pick: KNIGHTS, n: 4, pal: RED, r: 3, walk: [[-48, -216], [-48, -184]] },
  { key: 'bv_hall_low', room: 'bv_hall', pick: KNIGHTS, n: 6, pal: RED, at: [0, -16], r: 4 },
  { key: 'bv_hall_high', room: 'bv_hall', pick: KNIGHTS.concat(NECROS), n: 5, elite: LORDS, pal: RED, at: [0, 18], r: 4, more: { n: 2, pick: PLAGUE, from: [-48, -100], when: 0.6 } },
  { key: 'bv_walk', room: 'bv_walk', pick: KNIGHTS.concat(NECROS), n: 5, pal: RED, r: 3, walk: [[-92, -80], [-92, -140]] },
  { key: 'bv_ante', room: 'bv_ante', pick: KNIGHTS.concat(PLAGUE), n: 6, elite: LORDS, pal: ['Base', 'Bloodsoaked'] },
];

// The bosses. models: src/core/tripo-monsters.js VARIANTS (the possessed knights' bodies as they're made, the plain knights'
// till then). names: each body's own, where there are two.
const bosses = [
  { key: 'maldrec', room: 'bv_innergate', name: 'Ser Maldrec the Hollow, Warden of the Gate', models: ['bv_maldrec'], pal: ['Base'], hp: 7400, damage: 88, reach: 3.2, loot: 8 },
  { key: 'sorvane', room: 'bv_sanctum', name: 'Magister Sorvane', models: ['bv_sorvane'], pal: ['Abyssal'], hp: 6400, damage: 46, reach: 2.4, loot: 8 },
  { key: 'brothers', room: 'bv_court', name: 'The Hollow Brothers', names: ['Ser Garrow', 'Ser Gault'], models: ['bv_garrow', 'bv_gault'], pal: ['Base'], hp: 4700, damage: 66, reach: 3.0, loot: 8 },
  { key: 'castellan', room: 'bv_throne', name: 'The Castellan of Blackvigil', models: ['bv_castellan'], pal: ['Infernal'], hp: 12500, damage: 92, reach: 3.8, loot: 0 },
];

// What the fights call out (src/core/dungeon.js numbers them after the Warrens'; WARN there finds one by its name here).
const warnings = {
  mal_open: 'Ser Maldrec holds the gate behind his shield. Only the tank stands before it: get round behind him.',
  mal_shield: 'Maldrec sets his shield! Out from in front of it, round behind him: blows glance off him till he lifts it.',
  mal_charge: 'Maldrec lowers his lance: he is coming down the line!',
  mal_cleave: 'Maldrec sweeps his blade! Out of the arc.',
  mal_quake: 'Maldrec strikes the flags! Jump the ring as it reaches you.',
  mal_lances: 'Lances of blood! Out of the lines.',
  mal_guard: 'The portcullis guard! Knights come through the side doors: bring them down.',
  mal_turn: 'Maldrec turns on you! Get behind the tank, or out of his reach, till he lets go.',
  mal_enrage: 'Maldrec is enraged!',
  sor_open: 'Magister Sorvane reads from the black book. Keep off his circles, and when he begins the Unmaking, strike him till it breaks.',
  sor_circle: 'Sorvane draws a circle under you! Out of it, and stay out: it burns on.',
  sor_unmake: 'Sorvane begins the Unmaking! Strike him, all of you: break it before he finishes!',
  sor_broken: 'The Unmaking is broken! Sorvane reels.',
  sor_done: 'The Unmaking is spoken!',
  sor_raise: 'Sorvane raises the fallen! Knights climb out of the floor: kill them again.',
  sor_bones: 'Bone comes up through the floor! Out of its way.',
  sor_eyes: 'Lights come after you! Keep moving: they tire.',
  sor_rings: 'Cold rings! Out of them, then step in behind.',
  sor_wall: 'A wall of bolts! Find the gap.',
  sor_turn: 'Sorvane turns his eye on you! Get behind the tank till he looks away.',
  sor_enrage: 'Sorvane is enraged!',
  bro_open: 'The Hollow Brothers fight back to back: the one who covers takes the blows for both. Strike the one who covers.',
  bro_cover_sword: 'Garrow covers his brother! Strike Garrow, the swordsman: blows on Gault are turned.',
  bro_cover_lance: 'Gault covers his brother! Strike Gault, the lancer: blows on Garrow are turned.',
  bro_whirl: 'Garrow spins his blade! Get away from him until he stops.',
  bro_cleave: 'Garrow sweeps! Out of the arc.',
  bro_blades: 'Blades fly from Garrow! Stand between two.',
  bro_charge: 'Gault lowers his lance: he is coming down the line!',
  bro_lances: 'Gault throws lances of blood! Out of the lines.',
  bro_back: 'Back to back! A wheel of fire turns round them: keep ahead of its arms, or get out past their ends.',
  bro_last_sword: 'Gault is down! Garrow takes up his brother\'s lance, and fights for two.',
  bro_last_lance: 'Garrow is down! Gault goes berserk: finish him fast.',
  bro_turn: 'A brother turns on you! Get behind the tank, or out of his reach, till he lets go.',
  cas_open: 'The Castellan of Blackvigil comes down from the throne.',
  cas_cleave: 'The Castellan sweeps his greatsword! Out of the arc.',
  cas_charge: 'The Castellan charges! Out of the line.',
  cas_stamp: 'The Castellan stamps! Step in behind each ring as it lands.',
  cas_lances: 'Lances of blood! Out of the lines.',
  cas_hall: 'The Castellan calls on the hall! The banners burn and fall: keep out of the fire.',
  cas_possessed: 'The possessed come down from the galleries! Kill them before they reach the healer.',
  cas_dark: 'The braziers gutter. Red eyes open in the dark: keep moving, they follow.',
  cas_rain: 'Embers rain from the rafters! Keep moving.',
  cas_wall: 'A wall of bolts! Find the gap.',
  cas_turn: 'The Castellan turns on you! Get behind the tank, or out of his reach, till he lets go.',
  cas_enrage: 'The Castellan is enraged: he will kill you all!',
};

export const BLACKVIGIL = {
  key: 'blackvigil', tag: 'bv', name: 'Blackvigil Keep', short: 'the keep', x: -4900, z: -5720, y: -70, level: 14, style: 'castle',
  rooms, tunnels, nooks, daises, props, packs, bosses, warnings,
  turnWarn: { maldrec: 'mal_turn', sorvane: 'sor_turn', brothers: 'bro_turn', castellan: 'cas_turn' },
  entry: { x: 0, z: 2.5, yaw: Math.PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: -92, z: -257.4 },
  // Before the keep's gate on the Vigil Road, facing east down it (SITES.keep is at -5000, 200; its gate 70 m east of that).
  portal: { x: -4914, z: 200, yaw: Math.PI / 2, r: 2.2 },
  last: 'castellan', tough: { hp: 5, damage: 1.35 }, pay: { xp: 4200, gold: 700 },
  look: { wall: 'stone', foot: 'dark:stone', floor: 'flags', roof: 'dark:stone', flame: 'dark:flame', light: [1, 0.5, 0.2], fire: [1, 0.54, 0.22], every: 9, high: 3, glow: 2.1, lit: true },
  words: { enter: 'Blackvigil Keep. His knights hold every hall of it, and his sorcerers the galleries.', clear: 'Blackvigil Keep is cleared. The Castellan is dead!', wipe: 'Your party falls... and wakes inside the gate.' },
};
