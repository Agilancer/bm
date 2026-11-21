// The sewers of City State Phobos (docs/PHOBOS-LAYOUT.md "The Sewers"): four sectors, each a delve of its own, end to end
// under the city from the Barbican in the west to the castle crag in the east. The West Drains (under the Barbican, the
// Cinder Quarter and the Rookeries), the Slough Mains (the Chainmarket, the Wharf, the Tanners' Steps), the Charnel Runs
// (the Bone Yards, the Mages' Rise) and the High Conduits (the Barracks Ward, Dukes' Row, the Approach).
//
// They aren't party dungeons as the others are: anyone goes down, alone or not (party: false), there are two ways down
// into each from the streets (portal, and ways: a second mouth with its own ladder-head inside), and a gate at each end
// of a sector goes through into the next (links). Each has one great hall with something living in it that the city
// sends people down to kill: the Spider Queen, the Great Worm, the Drowned Abbot, the Lamplighter.
//
// The sewer-keepers, Martleboro and Louis G, keep their office off the Great Grate in the West Drains; Princess Apricot
// keeps her court in the Sunk Garden at the far end of the High Conduits (src/folk/people.js, src/folk/phobos-quests.js).
//
// Where they really are: past the world's north edge, in a row, as the other delves are (src/core/dungeon.js), each about
// under its own districts' x. Everything here is local to its own: x east, z south of the way in, y over its height.
// Castles' shells (straight walls, level floors, vaulted passages): what a city's masons cut, not what water wore.
//
// Velscour's city, so nothing of Tessariel's is on any of it (README "The two sides"): no bells, no seals of hers, no
// gilt sun. The church in Phobos is his.
import { R } from './delve-lay.js';

const PI = Math.PI;
// A sewer's run: water down the middle of a passage from one point to another, a kerb either side (src/core/delve-build.js
// channel). Nothing is swum: it's a hand deep.
const channel = (add, a, b, w = 1.3) => add('channel', a[0], a[1], { to: b, w });

// ---- the West Drains ------------------------------------------------------------------------------------------------------
// In by the Barbican outfall, up the Barbican Main to the Great Grate (a street fell in: the keepers' office is off its east
// side), then round: west down the Cinder Run to the Soot Cistern, north up the Rookery Drain to under the Rookery well, east
// to the Queen's Larder, on to the Turning Basin, and back down the Overflow to the Grate. The Slough Gate is off the basin.
const westRooms = [
  R('pw_out', 'the Barbican Outfall', 0, -2, 7, 12, 0, 8, { rock: 'mire:course', foot: 'mire:block', ground: 'mire:flags' }),
  R('pw_main', 'the Barbican Main', 0, -72, 4, 64, -1.5, 8, { tz: 0.025, fires: 14 }),
  R('pw_grate', 'the Great Grate', 0, -150, 18, 18, -3, 16, { rock: 'mire:block', foot: 'mire:ashlar', ground: 'mire:flags' }),
  R('pw_office', "the Keepers' Office", 30, -146, 8, 7, -3, 6, { rock: 'course', foot: 'block', ground: 'flags' }),
  R('pw_cinder', 'the Cinder Run', -66, -150, 52, 4, -3, 7, { fires: 12 }),
  R('pw_soot', 'the Soot Cistern', -128, -150, 14, 14, -3.5, 12, { rock: 'dark:course', foot: 'mire:block' }),
  R('pw_rook', 'the Rookery Drain', -128, -222, 4, 62, -4.5, 8, { tz: 0.017, fires: 14 }),
  R('pw_well', 'Under the Rookery Well', -128, -292, 12, 12, -5.5, 20, { rock: 'mire:ashlar', foot: 'mire:block' }),
  R('pw_larder', "the Queen's Larder", -62, -298, 22, 20, -6, 14, { rock: 'mire:stone', foot: 'mire:course', ground: 'mire:rubble' }),
  R('pw_basin', 'the Turning Basin', 0, -292, 12, 12, -5, 12, { rock: 'mire:block', ground: 'mire:flags' }),
  R('pw_over', 'the Overflow', 0, -229, 4, 65, -4, 8, { tz: 0.016, fires: 14 }),
  R('pw_gate', 'the Slough Gate', 36, -292, 8, 8, -5, 8, { rock: 'mire:ashlar', foot: 'mire:block' }),
];
const westTunnels = [
  { pts: [[16, -146], [24, -146]], w: 2, h: 3.4 },
  { pts: [[-115, -292], [-85, -292]], w: 2.6, h: 5 },
  { pts: [[-39, -294], [-11, -294]], w: 2.6, h: 5 },
  { pts: [[11, -292], [29, -292]], w: 2, h: 4 },
  // Spurs: drains coming in from under the streets, too small to go up.
  { pts: [[-66, -155], [-66, -196]], w: 1.4, h: 3 },
  { pts: [[-133, -222], [-170, -222]], w: 1.4, h: 3 },
  { pts: [[5, -214], [44, -214]], w: 1.4, h: 3 },
  // Where the Queen's brood come from in her larder (dead ends off its north wall).
  { pts: [[-78, -317], [-78, -324]], w: 2, h: 4, dead: true, door: 'pw_larder' },
  { pts: [[-46, -317], [-46, -324]], w: 2, h: 4, dead: true, door: 'pw_larder' },
];
// The wrapped dead hung up in the Queen's Larder: what her brood go for when she calls them (src/sim/sewer-fights.js).
export const COCOONS = [[-74, -288], [-52, -290], [-58, -308], [-70, -306], [-48, -302], [-78, -298]];
const westProps = [];
{
  const add = (kind, x, z, o = {}) => westProps.push({ kind, x, z, ...o });
  channel(add, [0, -12], [0, -132]); channel(add, [-18, -150], [-114, -150]); channel(add, [-128, -164], [-128, -280]);
  channel(add, [0, -168], [0, -280]); channel(add, [-84, -296], [-40, -296], 1.1);
  add('grate', -6, 9, { hx: 0.3, hz: 2.2 }); add('heap', 5, 6, { r: 1.2, layer: 'mire:rubble' });
  // The Great Grate: the street that fell in, its paving tipped every way, a cart that came down with it, and the grate
  // that was meant to keep it out lying in the middle. Four piers hold up what's left.
  for (const [x, z, yaw, tip] of [[-6, -146, 0.4, 0.9], [7, -153, 1.6, 0.6], [-2, -160, 2.5, 0.4], [9, -141, 3.1, 0.7], [-10, -157, 0.9, 0.5]]) add('slab', x, z, { yaw, tip });
  add('cart', 4, -147, { yaw: 0.7 }); add('heap', -4, -151, { r: 2.4, layer: 'mire:rubble' }); add('pool', 0, -150, { r: 6, up: 0.03 });
  for (const [x, z] of [[-11, -139], [11, -139], [-11, -161], [11, -161]]) add('column', x, z, { r: 1.3, solid: true, pale: true });
  add('sluicegate', -15, -150, { yaw: PI / 2, w: 3.6 });
  // The keepers' office: their desk, the shelf of ledgers, two bunks, crates of what they've picked, the tools of the trade.
  add('table', 34, -143, { hx: 1, hz: 2, solid: true });
  add('shelf', 37, -146, { hx: 0.4, hz: 2.4, h: 2.6 });
  add('bunk', 24, -151.5, { hx: 1.1, hz: 0.5, cloth: 'cloth_red' }); add('bunk', 36, -151.5, { hx: 1.1, hz: 0.5, cloth: 'cloth_oat' });
  add('crates', 24, -141); add('caps', 27, -140.5, { n: 3, s: 0.4 }); add('barrels', 34, -140.5);
  add('tools', 37, -142, { yaw: PI / 2 }); add('candles', 34.1, -142.4, { up: 0.78 });
  // The Cinder Run and the Soot Cistern: soot down every wall, coals that washed down from the forges, slag heaps.
  add('heap', -40, -147, { r: 1.2, layer: 'dark:rubble' }); add('heap', -95, -153, { r: 1.3, layer: 'dark:rubble' });
  add('pool', -128, -150, { r: 8, up: 0.03 }); add('heap', -137, -141, { r: 2, layer: 'dark:rubble' }); add('heap', -119, -160, { r: 1.6, layer: 'dark:rubble' });
  add('caps', -138, -159, { n: 4, s: 0.6 }); add('wreck', -121, -143, { yaw: 1.1, s: 0.8 });
  // The Rookery Drain: what the Rookeries throw down it.
  add('heap', -130, -200, { r: 1.1 }); add('bones', -126, -245, { r: 1.2 }); add('caps', -131, -262, { n: 3, s: 0.5 });
  // Under the Rookery well: its shaft's light, the rope's end, buckets, everything ever dropped down it.
  add('pool', -128, -290, { r: 4, up: 0.04 }); add('chain', -128, -289, { up: 12 }); add('barrels', -138, -285); add('heap', -121, -286, { r: 1.4 });
  add('greatcap', -137, -284, { h: 4, r: 0.5 }); add('caps', -119, -300, { n: 4, s: 0.7 });
  // The Queen's Larder: webs from wall to wall, the wrapped dead hung up, her eggs.
  add('web', -84, -282, { x1: -72, z1: -279 }); add('web', -40, -287, { x1: -46, z1: -279 }); add('web', -82, -316, { x1: -70, z1: -318 });
  for (const [x, z] of COCOONS) add('cocoon', x, z);
  add('eggs', -50, -312, { s: 1.2 }); add('eggs', -76, -311, { s: 1 }); add('bones', -66, -287, { r: 2 }); add('bones', -55, -300, { r: 1.6 });
  // The Turning Basin and the Overflow.
  add('pool', 0, -292, { r: 7, up: 0.03 }); add('wreck', 6, -298, { yaw: 2.4, s: 0.9 }); add('caps', -8, -284, { n: 3, s: 0.5 });
  add('heap', 2, -190, { r: 1 }); add('caps', -2, -246, { n: 3, s: 0.45 });
  // Halfway up the Barbican Main and the Overflow: a bay that's come down, its stones across the kerb.
  add('heap', -2.4, -72, { r: 1.6, layer: 'mire:rubble' }); add('slab', 2.2, -75, { yaw: 0.3, tip: 0.5 }); add('bones', 1.8, -68, { r: 0.9 });
  add('heap', 2.4, -232, { r: 1.5, layer: 'mire:rubble' }); add('slab', -2, -228, { yaw: 2.8, tip: 0.6 });
  // The keepers' brazier by their door, where they warm their hands coming in off their rounds.
  add('brazier', 22, -150.5);
  // The Slough Gate: the sluice that shuts the West Drains off from the Slough Mains, lifted.
  add('sluicegate', 30, -292, { yaw: PI / 2, w: 2.6 });
}
const SPIDERS = ['spider_black', 'spider_red'];
const RAKERS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
const SUNK = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const westPacks = [
  { key: 'pw_main', room: 'pw_main', pick: RAKERS, n: 4, pal: ['Bogblack', 'Mossback'], at: [0, -20], r: 2.5 },
  { key: 'pw_main2', room: 'pw_main', pick: SPIDERS, n: 3, pal: ['Mossback'], at: [0, 24], r: 2.5 },
  { key: 'pw_cinder', room: 'pw_cinder', pick: SUNK, n: 4, pal: ['Ashen', 'Drowned'], at: [-10, 0], r: 2.5 },
  { key: 'pw_soot', room: 'pw_soot', pick: SPIDERS.concat(RAKERS), n: 5, pal: ['Ashen', 'Bogblack'], at: [0, 0], r: 5 },
  { key: 'pw_rook', room: 'pw_rook', pick: SPIDERS, n: 4, pal: ['Mossback', 'Base'], at: [0, 10], r: 2.5 },
  { key: 'pw_well', room: 'pw_well', pick: SUNK, n: 5, elite: ['flesh_spider_demon'], pal: ['Drowned'], at: [0, 4], r: 5 },
  { key: 'pw_basin', room: 'pw_basin', pick: SPIDERS.concat(SUNK), n: 5, pal: ['Mossback', 'Drowned'], at: [0, 0], r: 5 },
  { key: 'pw_over', room: 'pw_over', pick: RAKERS, n: 4, elite: SPIDERS, pal: ['Bogblack'], at: [0, 12], r: 2.5 },
];
const westBosses = [
  { key: 'spiderqueen', room: 'pw_larder', name: 'The Spider Queen', models: ['pw_queen'], pal: ['Nightshade'], hp: 24000, damage: 120, reach: 3.6, loot: 0 },
];
const westWarnings = {
  spq_open: 'The Spider Queen. Out of her webs: they hold you a while, and burn. Kill her brood before they reach the cocoons.',
  spq_spit: 'The Queen spits! Out of the lines.',
  spq_venom: 'Venom over the floor! Off it.',
  spq_web: 'The Queen throws her web over you! Out of the circle before it closes: it holds what it catches.',
  spq_leap: 'The Queen leaps at you! Out of the circle.',
  spq_brood: 'Her brood come out of the walls for the cocoons! Kill them before they feed her.',
  spq_fed: 'A brood-spider reaches a cocoon: the Queen feeds!',
  spq_turn: 'The Spider Queen turns on you! Out of her reach.',
  spq_enrage: 'The Spider Queen is enraged!',
};
export const WEST_DRAINS = {
  key: 'westdrains', tag: 'pw', name: 'The West Drains', short: 'the West Drains', x: 9260, z: -5700, y: -70, level: 30, style: 'castle',
  party: false, sewer: true,
  // (Off the beaten way, src/core/castle-finds.js: a chest at the end of a spur too small to be anybody's road, and the sector's
  // great room named for whoever stands in it.)
  chests: [{ id: 'cinder_spur', room: 'pw_cinder', x: -66, z: -193.5, yaw: 0, loot: 1 }, { id: 'rook_spur', room: 'pw_rook', x: -167.5, z: -222, yaw: PI / 2, loot: 2 }],
  vistas: [{ id: 'great_grate', name: 'Under the Great Grate', room: 'pw_grate', x: 0, z: -150, r: 6 }],
  rooms: westRooms, tunnels: westTunnels, props: westProps, packs: westPacks, bosses: westBosses, warnings: westWarnings,
  turnWarn: { spiderqueen: 'spq_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: -62, z: -313.4 },
  // Its two mouths in the streets, each a stair down in a wall beside a street (src/core/phobos-build.js keeps the houses off
  // them): the Barbican's, by the King's Mile; the Rookeries', by the Low Road, down to under the Rookery well.
  portal: { x: 9371.7, z: -9.8, yaw: -0.153, r: 2.2 },
  ways: [{ x: 9626.3, z: 337.2, yaw: 2.09, in: { x: -128, z: -299.4, yaw: 0 } }],
  links: [{ x: 39.4, z: -292, yaw: -PI / 2, to: 'sloughmains', n: 0 }],
  last: 'spiderqueen', tough: { hp: 12, damage: 2.0 }, pay: { xp: 9000, gold: 1400 },
  names: { 'Giant Spiders': 'DRAIN SPIDER', Kobolds: 'SEWER-RAKER', 'The Possessed': 'THE SUNK' },
  look: { wall: 'mire:course', foot: 'mire:block', floor: 'mire:flags', roof: 'mire:stone', flame: 'mire:flame', banner: false, lamp: 'wisp', still: true, light: [0.5, 1, 0.62], fire: [0.56, 1, 0.7], every: 9, high: 2.4, glow: 1.6, lit: 0.5, beam: 'mire:block' },
  words: { enter: "The West Drains. The keepers' office is up the Main, off the Great Grate.", clear: 'The Spider Queen is dead! The West Drains are quiet, for a while.', wipe: 'You fall... and wake in the Barbican Outfall.' },
};

// ---- the Slough Mains -----------------------------------------------------------------------------------------------------
// In by the Wharf outfall, up the Wharf Main to the Weir Hall, the great hall of the sewers, where the Wharf's sluice wheel
// turns in the roof. West through the Chain Culvert to the Grate Gate (the West Drains). East down the Tanners' Main to the
// Dye Sump; north up the Silt Run to the Silt Bed, where the Great Worm lies. Or north from the Weir Hall up the
// Chainmarket Main to the Market Cistern and through the Long Siphon to the Silt Bed. The Charnel Gate is past the Bed.
const sloughRooms = [
  R('ps_out', 'the Wharf Outfall', 0, -2, 7, 12, 0, 8, { rock: 'dark:course', foot: 'dark:block', ground: 'dark:flags' }),
  R('ps_main', 'the Wharf Main', 0, -67, 4, 58, -1.5, 8, { tz: 0.027, fires: 12 }),
  R('ps_weir', 'the Weir Hall', 0, -140, 22, 18, -3, 18, { rock: 'dark:ashlar', foot: 'dark:block', ground: 'dark:flags' }),
  R('ps_gate', 'the Grate Gate', -58, -140, 8, 8, -3, 8, { rock: 'dark:ashlar', foot: 'dark:block' }),
  R('ps_tanmain', "the Tanners' Main", 60, -140, 41, 4, -3, 7, { fires: 10 }),
  R('ps_dye', 'the Dye Sump', 112, -140, 14, 14, -3.5, 12, { rock: 'dark:stone', foot: 'dark:course' }),
  R('ps_silt', 'the Silt Run', 112, -212, 4, 61, -4.5, 8, { tz: 0.017, fires: 12 }),
  R('ps_bed', 'the Silt Bed', 112, -292, 24, 22, -5.5, 16, { rock: 'dark:rubble', foot: 'dark:stone', ground: 'dark:rubble' }),
  R('ps_chain', 'the Chainmarket Main', 0, -185, 4, 34, -3.5, 7, { fires: 6 }),
  R('ps_market', 'the Market Cistern', 0, -230, 14, 14, -4, 12, { rock: 'dark:block', ground: 'dark:flags' }),
  R('ps_east', 'the Charnel Gate', 164, -292, 8, 8, -5.5, 8, { rock: 'dark:ashlar', foot: 'dark:block' }),
];
const sloughTunnels = [
  { pts: [[-21, -140], [-51, -140]], w: 2.2, h: 4.5 },
  { pts: [[14, -236], [30, -236], [30, -282], [89, -282]], w: 2.4, h: 5 },
  { pts: [[135, -292], [157, -292]], w: 2, h: 4 },
  // The Silt Bypass: the keepers' way round the Worm's bed, from the Silt Run to the Charnel Gate, so the gate's no fight.
  { pts: [[113, -246], [160, -246], [160, -286]], w: 2, h: 4 },
  { pts: [[4, -60], [40, -60]], w: 1.4, h: 3 },
  { pts: [[108, -190], [70, -190]], w: 1.4, h: 3 },
  { pts: [[100, -313], [100, -320]], w: 2, h: 4, dead: true, door: 'ps_bed' },
  { pts: [[124, -313], [124, -320]], w: 2, h: 4, dead: true, door: 'ps_bed' },
];
const sloughProps = [];
{
  const add = (kind, x, z, o = {}) => sloughProps.push({ kind, x, z, ...o });
  channel(add, [0, -12], [0, -122]); channel(add, [22, -140], [98, -140]); channel(add, [112, -154], [112, -270]); channel(add, [0, -158], [0, -216]);
  add('grate', 6, 9, { hx: 0.3, hz: 2.2 });
  // The Weir Hall: the weir across it, the Wharf's sluice wheel high in its north wall, piers holding the vault.
  add('wheel', 0, -156.5, { r: 6, up: 6.5 });
  add('sluicegate', -8, -150, { yaw: 0, w: 3 }); add('sluicegate', 8, -150, { yaw: 0, w: 3 });
  add('pool', 0, -146, { r: 10, up: 0.03 }); add('pool', -12, -132, { r: 4 }); add('pool', 13, -130, { r: 3.5 });
  for (const [x, z] of [[-14, -128], [14, -128], [-14, -150], [14, -150]]) add('column', x, z, { r: 1.4, solid: true });
  add('wreck', -16, -140, { yaw: 1.4, s: 1.1 }); add('barrels', 17, -136); add('crates', -18, -126);
  // The Dye Sump: the tanners' vats' run-off, red and blue and black, in pools that never mix.
  add('pool', 106, -134, { r: 4, layer: 'cloth_red' }); add('pool', 108, -148, { r: 3.4, layer: 'dark:cloth_red' }); add('pool', 116, -132, { r: 3, layer: 'lake' });
  add('heap', 104, -148, { r: 1.6 }); add('barrels', 122, -130); add('caps', 102, -130, { n: 3, s: 0.5 });
  // The Silt Bed: the Worm's: silt from wall to wall, the holes it has left, what it's swallowed and brought up.
  add('pool', 112, -292, { r: 20, up: 0.03 });
  for (const [x, z, r] of [[98, -282, 3], [126, -300, 2.6], [104, -304, 2.2], [122, -280, 2.4]]) add('sinkhole', x, z, { r });
  add('bones', 128, -286, { r: 2.4 }); add('bones', 96, -296, { r: 2 }); add('wreck', 110, -278, { yaw: 0.5, s: 1.3 });
  add('caps', 132, -306, { n: 4, s: 0.6 }); add('caps', 92, -276, { n: 3, s: 0.5 });
  // The Market Cistern: what the market sweeps down its gutters: crates, a stall's awning poles, coins in the silt.
  add('pool', 0, -230, { r: 8, up: 0.03 }); add('crates', -8, -238); add('crates', 9, -222); add('gold', 6, -238, { r: 0.8 }); add('caps', -9, -222, { n: 3, s: 0.5 });
  add('heap', 2, -178, { r: 1 }); add('caps', 112, -230, { n: 3, s: 0.45 });
  add('heap', -2.2, -70, { r: 1.5, layer: 'dark:rubble' }); add('wreck', 2, -66, { yaw: 0.2, s: 0.7 }); add('caps', 161.2, -262, { n: 3, s: 0.4 });
  add('sluicegate', 160, -280, { yaw: 0, w: 2.2 });
  add('sluicegate', 158, -292, { yaw: PI / 2, w: 2.6 }); add('sluicegate', -52, -140, { yaw: PI / 2, w: 2.6 });
}
const DROWNED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const WORMS = ['ps_mainworm'];
const sloughPacks = [
  { key: 'ps_main', room: 'ps_main', pick: DROWNED, n: 4, pal: ['Drowned', 'Cobalt'], at: [0, -16], r: 2.5 },
  { key: 'ps_main2', room: 'ps_main', pick: WORMS, n: 3, pal: ['Cobalt'], at: [0, 26], r: 2.5 },
  { key: 'ps_tanmain', room: 'ps_tanmain', pick: WORMS.concat(DROWNED), n: 4, pal: ['Cobalt', 'Drowned'], at: [6, 0], r: 2.5 },
  { key: 'ps_dye', room: 'ps_dye', pick: ['zombie_boy_1', 'zombie_boy_2', 'zombie_girl_1', 'zombie_girl_2'], n: 5, elite: ['plague_giant_1'], pal: ['Oxblood', 'Cobalt'], at: [0, 0], r: 5 },
  { key: 'ps_silt', room: 'ps_silt', pick: WORMS, n: 4, pal: ['Cobalt'], at: [0, 8], r: 2.5 },
  { key: 'ps_chain', room: 'ps_chain', pick: DROWNED, n: 4, elite: ['plague_giant_2'], pal: ['Drowned'], at: [0, -6], r: 2.5 },
  { key: 'ps_market', room: 'ps_market', pick: DROWNED.concat(WORMS), n: 5, pal: ['Drowned', 'Cobalt'], at: [0, 0], r: 5 },
  { key: 'ps_weir', room: 'ps_weir', pick: DROWNED, n: 4, pal: ['Drowned'], at: [-6, 10], r: 4 },
];
const sloughBosses = [
  { key: 'greatworm', room: 'ps_bed', name: 'The Great Worm', models: ['ps_worm'], pal: ['Cobalt'], hp: 31000, damage: 140, reach: 5, loot: 0 },
];
const sloughWarnings = {
  gwm_open: 'The Great Worm. When it goes under, keep moving: it comes up where you stood.',
  gwm_spew: 'The Worm spews! Out of the lines.',
  gwm_slam: 'The Worm slams down! Jump the ring as it reaches you.',
  gwm_dive: 'The Worm goes under! Keep moving: it comes up where you stand. Jump the ring it throws.',
  gwm_up: 'The Worm is up, and stuck fast in its hole a moment! Hit it now.',
  gwm_silt: 'Silt comes down from the roof! Out of the circles.',
  gwm_young: 'Its young come up out of the silt! Kill them.',
  gwm_turn: 'The Great Worm turns on you! Out of its reach.',
  gwm_enrage: 'The Great Worm is enraged!',
};
export const SLOUGH_MAINS = {
  key: 'sloughmains', tag: 'ps', name: 'The Slough Mains', short: 'the Slough Mains', x: 9560, z: -5700, y: -74, level: 38, style: 'castle',
  party: false, sewer: true,
  chests: [{ id: 'wharf_spur', room: 'ps_main', x: 37.5, z: -60, yaw: -PI / 2, loot: 1, up: 0.18 }, { id: 'silt_spur', room: 'ps_silt', x: 72.5, z: -190, yaw: PI / 2, loot: 2, up: 0.37 }],
  vistas: [{ id: 'weir_step', name: "the Weir Hall's Step", room: 'ps_weir', x: 0, z: -140, r: 6 }],
  rooms: sloughRooms, tunnels: sloughTunnels, props: sloughProps, packs: sloughPacks, bosses: sloughBosses, warnings: sloughWarnings,
  turnWarn: { greatworm: 'gwm_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 112, z: -309.4 },
  // The Wharf's mouth, by the Low Road; the Tanners' Steps', by the High Loop, down to the Dye Sump.
  portal: { x: 9861.7, z: 379.9, yaw: 0.153, r: 2.2 },
  ways: [{ x: 10062.7, z: 589.1, yaw: 0.284, in: { x: 121.4, z: -140, yaw: -PI / 2 } }],
  links: [{ x: -61.4, z: -140, yaw: PI / 2, to: 'westdrains', n: 0 }, { x: 167.4, z: -292, yaw: -PI / 2, to: 'charnelruns', n: 0 }],
  last: 'greatworm', tough: { hp: 14, damage: 2.1 }, pay: { xp: 14000, gold: 2100 },
  names: { 'The Possessed': 'THE DROWNED', 'Dead Children': 'GUTTER CHILD', 'Plague Giants': 'BLOATED THING', 'Giant Worms': 'MAIN-WORM' },
  look: { wall: 'dark:course', foot: 'dark:block', floor: 'dark:flags', roof: 'dark:stone', flame: 'frost:flame', banner: false, lamp: 'wisp', still: true, light: [0.45, 0.72, 1], fire: [0.5, 0.78, 1], every: 9, high: 2.4, glow: 1.6, lit: 0.5, beam: 'dark:block' },
  words: { enter: 'The Slough Mains. Everything the Wharf and the market throw away comes down here.', clear: 'The Great Worm is dead! The Slough Mains run clear.', wipe: 'You fall... and wake in the Wharf Outfall.' },
};

// ---- the Charnel Runs -----------------------------------------------------------------------------------------------------
// In by the Bone Yards outfall, up the Ossuary Main to the Charnel Cistern; the Slough Gate is west of it. North down the
// Bone Stair into the Old Catacomb, older than the city; east along the Mages' Culvert (Under the Mages' Rise off it) to the
// Drowned Chapter, where the Abbot keeps his hours. The Conduit Gate is north of the chapter.
const charnelRooms = [
  R('pc_out', 'the Bone Yards Outfall', 0, -2, 7, 12, 0, 8, { rock: 'pale:course', foot: 'pale:block', ground: 'pale:flags' }),
  R('pc_main', 'the Ossuary Main', 0, -60, 4, 52, -1, 8, { tz: 0.02, fires: 12 }),
  R('pc_cistern', 'the Charnel Cistern', 0, -124, 16, 16, -2, 14, { rock: 'pale:block', foot: 'pale:ashlar', ground: 'pale:flags' }),
  R('pc_gate', 'the Slough Gate', -52, -124, 8, 8, -2, 8, { rock: 'pale:ashlar', foot: 'pale:block' }),
  R('pc_stair', 'the Bone Stair', 0, -160, 5, 23, -6, 11, { tz: 0.174, fires: 0, rock: 'pale:course', foot: 'course' }),
  R('pc_cata', 'the Old Catacomb', 0, -206, 20, 26, -10, 10, { rock: 'pale:stone', foot: 'pale:block', ground: 'pale:rubble' }),
  R('pc_mages', "the Mages' Culvert", 64, -206, 47, 4, -10, 7, { fires: 12 }),
  R('pc_rise', "Under the Mages' Rise", 64, -230, 9, 8, -10, 8, { rock: 'pale:ashlar', foot: 'pale:block' }),
  R('pc_chapter', 'the Drowned Chapter', 130, -206, 22, 22, -11, 16, { rock: 'pale:ashlar', foot: 'pale:block', ground: 'pale:flags' }),
  R('pc_gate2', 'the Conduit Gate', 130, -262, 8, 8, -11, 8, { rock: 'pale:ashlar', foot: 'pale:block' }),
];
const charnelTunnels = [
  { pts: [[-15, -124], [-45, -124]], w: 2.2, h: 4.5 },
  { pts: [[64, -209], [64, -223]], w: 2, h: 4 },
  // The Gate Cut: off the Mages' Culvert to the Conduit Gate, so the Abbot's chapter is the culvert's end and nobody's way.
  { pts: [[96, -207], [96, -258], [123, -258]], w: 2, h: 4 },
  { pts: [[-19, -196], [-40, -196]], w: 1.4, h: 3 },
  { pts: [[-19, -218], [-40, -218]], w: 1.4, h: 3 },
  { pts: [[4, -80], [36, -80]], w: 1.4, h: 3 },
  { pts: [[118, -185], [118, -178]], w: 2, h: 4, dead: true, door: 'pc_chapter' },
  { pts: [[142, -185], [142, -178]], w: 2, h: 4, dead: true, door: 'pc_chapter' },
];
const charnelProps = [];
{
  const add = (kind, x, z, o = {}) => charnelProps.push({ kind, x, z, ...o });
  channel(add, [0, -12], [0, -108]); channel(add, [20, -206], [108, -206], 1.1);
  add('grate', -6, 9, { hx: 0.3, hz: 2.2 }); add('bonestack', 6.6, -4, { yaw: -PI / 2 });
  // The Ossuary Main: the Bone Yards' overflow, stacked along both walls where the water left it.
  for (const z of [-30, -58, -86]) { add('bonestack', 3.6, z, { yaw: -PI / 2 }); add('bonestack', -3.6, z - 12, { yaw: PI / 2 }); }
  // The Charnel Cistern: its pool, the urns washed down into it, the head of the Bone Stair.
  add('pool', 0, -124, { r: 8, up: 0.03 }); add('urn', -11, -114); add('urn', 12, -133); add('bones', 9, -116, { r: 1.8 }); add('caps', -12, -134, { n: 3, s: 0.5 });
  add('lintel', 0, -140, { hx: 5 }); add('lintel', 0, -180, { hx: 5 });
  // The Old Catacomb: loculi down both walls, piers of stacked bone, the older dead.
  for (const z of [-190, -206, -222]) { add('bonepier', -12, z, { hx: 1.6, hz: 1.2, solid: true }); add('bonepier', 12, z, { hx: 1.6, hz: 1.2, solid: true }); }
  add('bones', -4, -196, { r: 2 }); add('bones', 6, -224, { r: 2.2 }); add('urn', -16, -230); add('urn', 16, -184); add('caps', 15, -228, { n: 4, s: 0.6 });
  // Under the Mages' Rise: what the mages pour down their drains, glowing in the cracks.
  add('pool', 59, -225, { r: 1.8, layer: 'spore:flame' }); add('crates', 68, -225); add('heap', 71, -229, { r: 1 });
  // The Drowned Chapter: the Abbot's: his chapter's benches, his lectern, the black water round them. (Velscour's: no sign
  // of Tessariel's on any of it.)
  add('pool', 130, -206, { r: 16, up: 0.03 });
  for (const z of [-196, -202, -210, -216]) { add('pew', 122, z, { hx: 3, hz: 0.6 }); add('pew', 138, z, { hx: 3, hz: 0.6 }); }
  add('lectern', 130, -225); add('candles', 125, -224); add('candles', 135, -224);
  for (const [x, z] of [[114, -190], [146, -190], [114, -222], [146, -222]]) add('column', x, z, { r: 1.3, solid: true, pale: true });
  add('sluicegate', 118, -258, { yaw: PI / 2, w: 2.2 }); add('sluicegate', -46, -124, { yaw: PI / 2, w: 2.6 });
  add('bonestack', 3.6, -60, { yaw: -PI / 2 }); add('heap', -2, -62, { r: 1.4, layer: 'pale:rubble' }); add('urn', 97.4, -236);
}
const SINGERS = ['necromancer_2', 'necromancer_3', 'necromancer_f1', 'necromancer_f2'];
const UNQUIET = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
const charnelPacks = [
  { key: 'pc_main', room: 'pc_main', pick: UNQUIET, n: 5, pal: ['Bone-white', 'Wraith'], at: [0, -10], r: 2.5 },
  { key: 'pc_main2', room: 'pc_main', pick: SINGERS, n: 2, pal: ['Wraith'], at: [0, 28], r: 2 },
  { key: 'pc_cistern', room: 'pc_cistern', pick: UNQUIET, n: 5, elite: SINGERS, pal: ['Bone-white', 'Amethyst'], at: [0, -4], r: 5 },
  { key: 'pc_cata', room: 'pc_cata', pick: ['bone_golem', 'skeleton_knight_giant'], n: 2, elite: SINGERS, pal: ['Bone-white'], at: [0, -6], r: 5 },
  { key: 'pc_cata2', room: 'pc_cata', pick: UNQUIET, n: 5, pal: ['Wraith'], at: [0, 12], r: 5 },
  { key: 'pc_mages', room: 'pc_mages', pick: SINGERS, n: 4, pal: ['Amethyst', 'Gloam'], at: [-8, 0], r: 2.5 },
  { key: 'pc_rise', room: 'pc_rise', pick: SINGERS.concat(UNQUIET), n: 4, pal: ['Amethyst'], at: [0, 0], r: 3 },
];
const charnelBosses = [
  { key: 'drownedabbot', room: 'pc_chapter', name: 'The Drowned Abbot', models: ['pc_abbot'], pal: ['Drowned'], hp: 38000, damage: 160, reach: 3, loot: 0 },
];
const charnelWarnings = {
  dab_open: 'The Drowned Abbot. He keeps his hours: when he calls his chapter up out of the water, put them down before they reach him and give him their breath.',
  dab_circle: 'Black water rises under you! Out of the circles.',
  dab_bones: 'Bone comes up through the floor! Out of the lines.',
  dab_eyes: 'His eyes come after you! Keep moving.',
  dab_wall: 'A wall of drowned light comes on! Find the gap.',
  dab_chapter: 'His chapter rises out of the water and goes to him! Kill them first.',
  dab_fed: 'A brother reaches the Abbot and gives up his breath: the Abbot is stronger!',
  dab_turn: 'The Drowned Abbot turns on you! Out of his reach.',
  dab_enrage: 'The Drowned Abbot is enraged!',
};
export const CHARNEL_RUNS = {
  key: 'charnelruns', tag: 'pc', name: 'The Charnel Runs', short: 'the Charnel Runs', x: 9900, z: -5700, y: -80, level: 45, style: 'castle',
  party: false, sewer: true,
  chests: [{ id: 'catacomb_spur', room: 'pc_cata', x: -37.5, z: -218, yaw: PI / 2, loot: 2 }, { id: 'ossuary_spur', room: 'pc_main', x: 33.5, z: -80, yaw: -PI / 2, loot: 2, up: -0.39 }],
  vistas: [{ id: 'charnel_brink', name: "the Charnel Cistern's Brink", room: 'pc_cistern', x: 0, z: -124, r: 6 }],
  rooms: charnelRooms, tunnels: charnelTunnels, props: charnelProps, packs: charnelPacks, bosses: charnelBosses, warnings: charnelWarnings,
  turnWarn: { drownedabbot: 'dab_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 147.4, z: -206, yaw: -PI / 2 },
  // The Bone Yards' mouth, by Ash Lane; the Mages' Rise's, by the High Loop, down to under the Rise.
  portal: { x: 9933.9, z: -559.1, yaw: -2.723, r: 2.2 },
  ways: [{ x: 10322.1, z: -415.7, yaw: -0.675, in: { x: 64, z: -233.4, yaw: 0 } }],
  links: [{ x: -55.4, z: -124, yaw: PI / 2, to: 'sloughmains', n: 1 }, { x: 130, z: -265.4, yaw: 0, to: 'highconduits', n: 0 }],
  last: 'drownedabbot', tough: { hp: 17, damage: 2.2 }, pay: { xp: 20000, gold: 3000 },
  names: { Necromancers: 'CHARNEL-SINGER', 'Dead Children': 'THE UNBURIED', 'Bone Giants': 'OSSUARY HULK' },
  look: { wall: 'pale:course', foot: 'pale:block', floor: 'pale:flags', roof: 'pale:stone', flame: 'spore:flame', banner: false, lamp: 'bowl', still: true, light: [0.66, 0.42, 1], fire: [0.7, 0.46, 1], every: 9, high: 2.4, glow: 1.6, lit: 0.5, beam: 'pale:block' },
  words: { enter: 'The Charnel Runs. The Bone Yards drain down here, and so do their dead.', clear: 'The Drowned Abbot is dead! His chapter lies still.', wipe: 'You fall... and wake in the Bone Yards Outfall.' },
};

// ---- the High Conduits ----------------------------------------------------------------------------------------------------
// In by the Barracks outfall, up the Barracks Main to the Aqueduct Fall, where the castle's water comes down a spout as
// tall as a house; the Charnel Gate is west of it. North up the Dukes' Conduit to the Lamp Store, east along the Long
// Conduit to the Lamplighter's Hall, north up the Approach Culvert to the Sunk Garden: Princess Apricot's court.
const highRooms = [
  R('pa_out', 'the Barracks Outfall', 0, -2, 7, 12, 0, 8, { rock: 'course', foot: 'block', ground: 'flags' }),
  R('pa_main', 'the Barracks Main', 0, -56, 4, 48, 0.5, 7, { tz: -0.011, fires: 10 }),
  R('pa_fall', 'the Aqueduct Fall', 0, -120, 18, 20, 1, 20, { rock: 'ashlar', foot: 'block', ground: 'flags' }),
  R('pa_gate', 'the Charnel Gate', -52, -120, 8, 8, 1, 8, { rock: 'ashlar', foot: 'block' }),
  R('pa_dukes', "the Dukes' Conduit", 0, -181, 4, 45, 1.5, 7, { fires: 10 }),
  R('pa_lamps', 'the Lamp Store', 0, -236, 14, 14, 2, 10, { rock: 'block', ground: 'flags' }),
  R('pa_long', 'the Long Conduit', 70, -236, 60, 4, 2, 7, { fires: 12 }),
  R('pa_lamp', "the Lamplighter's Hall", 146, -236, 20, 20, 2, 16, { rock: 'ashlar', foot: 'block', ground: 'flags' }),
  R('pa_approach', 'the Approach Culvert', 146, -294, 4, 28, 2.5, 7, { fires: 7 }),
  R('pa_garden', 'the Sunk Garden', 146, -336, 18, 18, 3, 14, { rock: 'pale:ashlar', foot: 'pale:block', ground: 'flags' }),
  // The Aqueduct Foot, off the garden's east side: the gate up into Castle Velscour's Lower Ward (src/core/delve-castle.js).
  R('pa_aqfoot', 'the Aqueduct Foot', 186, -341, 8, 6, 3, 9, { rock: 'slate:ashlar', foot: 'slate:block', ground: 'flags' }),
];
const highTunnels = [
  { pts: [[-17, -120], [-45, -120]], w: 2.2, h: 4.5 },
  { pts: [[4, -170], [40, -170]], w: 1.4, h: 3 },
  { pts: [[70, -240], [70, -270]], w: 1.4, h: 3 },
  // The Lamp Cut: off the Long Conduit down to the Approach, round the Lamplighter's Hall: the princess's people's way.
  { pts: [[100, -237], [100, -280], [143, -280]], w: 2, h: 4 },
  { pts: [[134, -217], [134, -210]], w: 2, h: 4, dead: true, door: 'pa_lamp' },
  { pts: [[158, -217], [158, -210]], w: 2, h: 4, dead: true, door: 'pa_lamp' },
  { pts: [[160, -341], [180, -341]], w: 2, h: 4 },
];
// The Lamplighter's ring of lamps in his hall: what his wick-men go to light (src/sim/sewer-fights.js).
export const LAMP_RING = Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4 + 0.39; return [146 + Math.sin(a) * 10, -236 - Math.cos(a) * 10]; });
const highProps = [];
{
  const add = (kind, x, z, o = {}) => highProps.push({ kind, x, z, ...o });
  channel(add, [0, -12], [0, -100]); channel(add, [0, -140], [0, -222]); channel(add, [14, -236], [126, -236]); channel(add, [146, -268], [146, -318], 1.1);
  add('grate', 6, 9, { hx: 0.3, hz: 2.2 });
  // The Aqueduct Fall: the spout high in the north wall, the water down it into the basin, the piers.
  add('spout', 0, -137.5, { up: 14, w: 2.6 }); add('pool', 0, -128, { r: 9, up: 0.03 });
  for (const [x, z] of [[-12, -108], [12, -108], [-12, -132], [12, -132]]) add('column', x, z, { r: 1.4, solid: true });
  add('crates', 14, -104); add('barrels', -15, -104);
  // The Lamp Store: the city's street lamps, waiting to be mended: racks of them, oil, wick.
  for (const [x, z] of [[-10, -228], [-10, -244], [10, -244]]) add('shelf', x, z, { hx: 2.4, hz: 0.4, h: 2.4 });
  add('barrels', 8, -226); add('barrels', -4, -246); add('crates', 4, -230); add('table', 6, -240, { hx: 1, hz: 2.2, solid: true }); add('candles', 6, -240.4, { up: 0.83 });
  // The Lamplighter's Hall: his lamps, a ring of them, burning; his ladder; his oil.
  for (const [x, z] of LAMP_RING) add('candles', x, z);
  for (const [x, z] of [[134, -224], [158, -224], [134, -248], [158, -248]]) add('column', x, z, { r: 1.3, solid: true });
  add('barrels', 161, -251); add('barrels', 131, -251); add('vat', 160, -222, { r: 1 });
  // The Sunk Garden: the princess's court. Light down a shaft from a dukes' garden over it, and everything growing that
  // likes the damp: caps as tall as a man, reeds, a pool, her chair and her table, her people's bunks.
  // The light down the shaft, on her chair: the dukes' garden's sky, and its roots hung down the shaft's sides.
  add('daylight', 146, -346, { r: 2.6, up: 9 }); add('roots', 142, -349, { r: 2.4 }); add('roots', 150, -349, { r: 2.2 });
  add('pool', 156, -328, { r: 3.6, up: 0.04 });
  for (const [x, z, h, r] of [[134, -324, 5, 0.55], [159, -322, 4.2, 0.5], [132, -346, 3.6, 0.45], [161, -348, 4.6, 0.5], [134, -336, 3, 0.4], [152, -350, 2.8, 0.35], [139, -352, 3.4, 0.4], [162, -337, 3.2, 0.4]]) add('greatcap', x, z, { h, r });
  for (const [x, z, n, s] of [[140, -346, 5, 0.7], [157, -344, 4, 0.6], [150, -322, 3, 0.5], [138, -330, 4, 0.6], [153, -333, 3, 0.5], [131, -340, 5, 0.6], [160, -330, 4, 0.55], [143, -352, 3, 0.45], [149, -352, 3, 0.45], [136, -320, 3, 0.5]]) add('caps', x, z, { n, s });
  add('seat', 146, -347, { hx: 0.8, hz: 0.7, stone: 'pale:stone', cloth: 'cloth_red' }); add('table', 141, -341, { hx: 1, hz: 1.6, solid: true });
  add('carpet', 146, -340, { hx: 1.2, hz: 4, layer: 'cloth_red' }); add('bunk', 161, -334, { hx: 0.5, hz: 1.1, cloth: 'cloth_red' });
  add('sluicegate', -46, -120, { yaw: PI / 2, w: 2.6 });
}
const GUARD = ['plague_knight_black', 'plague_knight_red'];
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const WICKS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const highPacks = [
  { key: 'pa_main', room: 'pa_main', pick: GUARD, n: 4, pal: ['Rust', 'Sulphur'], at: [0, -10], r: 2.5 },
  { key: 'pa_fall', room: 'pa_fall', pick: KNIGHTS, n: 4, pal: ['Oxblood'], at: [0, 6], r: 5 },
  { key: 'pa_dukes', room: 'pa_dukes', pick: WICKS, n: 4, pal: ['Sulphur', 'Emberhide'], at: [0, 0], r: 2.5 },
  { key: 'pa_lamps', room: 'pa_lamps', pick: WICKS, n: 5, elite: ['night_demon_black'], pal: ['Sulphur'], at: [0, 6], r: 5 },
  { key: 'pa_long', room: 'pa_long', pick: GUARD.concat(KNIGHTS), n: 5, pal: ['Rust', 'Oxblood'], at: [-12, 0], r: 2.5 },
  { key: 'pa_main2', room: 'pa_main', pick: WICKS, n: 3, pal: ['Sulphur'], at: [0, 22], r: 2.5 },
  { key: 'pa_approach', room: 'pa_approach', pick: KNIGHTS, n: 4, pal: ['Oxblood'], at: [0, 10], r: 2.5 },
];
const highBosses = [
  { key: 'lamplighter', room: 'pa_lamp', name: 'The Lamplighter', models: ['pa_lamplighter'], pal: ['Emberhide'], hp: 46000, damage: 190, reach: 3.2, loot: 0 },
];
const highWarnings = {
  lmp_open: 'The Lamplighter. He lights the dark: every fire he sets keeps burning. Keep off them, and put his wicks out before they reach a lamp.',
  lmp_pots: 'He throws his oil! Off the pools before they catch.',
  lmp_fan: 'Fire fans out from him! Find the gap.',
  lmp_wheel: 'A wheel of fire turns about him! Keep ahead of it.',
  lmp_wicks: 'His wick-men go for the lamps! Bring them down before they light one.',
  lmp_lit: 'A wick-man lights a lamp: it burns where it stands, and the Lamplighter burns hotter!',
  lmp_cleave: 'The Lamplighter swings his pole! Out of the arc.',
  lmp_turn: 'The Lamplighter turns on you! Out of his reach.',
  lmp_enrage: 'The Lamplighter is enraged: the whole hall is alight!',
};
export const HIGH_CONDUITS = {
  key: 'highconduits', tag: 'pa', name: 'The High Conduits', short: 'the High Conduits', x: 10260, z: -5700, y: -66, level: 53, style: 'castle',
  party: false, sewer: true,
  chests: [{ id: 'dukes_spur', room: 'pa_dukes', x: 37.5, z: -170, yaw: -PI / 2, loot: 2 }, { id: 'long_spur', room: 'pa_long', x: 70, z: -267.5, yaw: 0, loot: 3 }],
  vistas: [{ id: 'aqueduct_fall', name: 'the Foot of the Aqueduct Fall', room: 'pa_fall', x: 0, z: -120, r: 6 }],
  rooms: highRooms, tunnels: highTunnels, props: highProps, packs: highPacks, bosses: highBosses, warnings: highWarnings,
  turnWarn: { lamplighter: 'lmp_turn' },
  entry: { x: 0, z: 2.5, yaw: PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: 146, z: -220.6, yaw: PI },
  // The Barracks Ward's mouth, by the King's Mile; the Approach's, by the High Loop: straight down to the Sunk Garden.
  portal: { x: 10152.9, z: 79.7, yaw: -0.496, r: 2.2 },
  ways: [{ x: 10591.1, z: 53.6, yaw: 1.249, in: { x: 132.6, z: -336, yaw: PI / 2 } }],
  links: [{ x: -55.4, z: -120, yaw: PI / 2, to: 'charnelruns', n: 1 }, { x: 189.4, z: -341, yaw: -PI / 2, to: 'lowerward', n: 0 }],
  last: 'lamplighter', tough: { hp: 20, damage: 2.35 }, pay: { xp: 28000, gold: 4200 },
  names: { 'Plague Knights': 'CONDUIT WARDEN', 'Haunted Mannequins': 'WICK-MAN', "Velscour's Knights": 'KNIGHT OF THE CONDUITS', 'Night Paralysis Demons': 'SOOT-DEMON' },
  look: { wall: 'course', foot: 'block', floor: 'flags', roof: 'stone', flame: 'flame', banner: false, lamp: 'bowl', still: true, light: [1, 0.66, 0.3], fire: [1, 0.7, 0.34], every: 9, high: 2.4, glow: 1.6, lit: 0.5, beam: 'block' },
  words: { enter: 'The High Conduits. The castle\'s water comes down through here, and the old lamps still burn.', clear: 'The Lamplighter is out! The High Conduits go dark and quiet.', wipe: 'You fall... and wake in the Barracks Outfall.' },
};

export const SEWERS = [WEST_DRAINS, SLOUGH_MAINS, CHARNEL_RUNS, HIGH_CONDUITS];

// ---- how they're lit (the dungeon once-over, 2026-11-20) ------------------------------------------------------------------
// The owner: "why are there glowing green things all over the sewer dungeon? Make sure light sources make sense!" A sewer has
// two lights and no more: the day, down through the street's grates over its mains and its halls, and the keepers' own
// lanterns, on brackets at their rounds' corners and on poles where they work, many of them gone out. No corpse-lights, no
// coloured lamps: each sector's mood is its stone (the West Drains' fen-green muck, the Slough's black, the Charnel Runs'
// bone, the High Conduits' clean ashlar) and how much of the day gets down to it. The pipes the streets drain by come in
// through the walls and run, a trickle each, down to the channel.
const LANTERN_LOOK = { flame: 'flame', lamp: 'lantern', still: true, light: [1, 0.64, 0.32], fire: [1, 0.68, 0.36], every: 15, high: 2.6, glow: 1.3, lit: 0.5, out: 0.3, cask: false };
function lightSewer(d, o = {}) {
  Object.assign(d.look, LANTERN_LOOK, o.look || {});
  const near = (x, z, r) => d.props.some((p) => Math.hypot(p.x - x, p.z - z) < r);
  const add = (kind, x, z, q = {}) => d.props.push({ kind, x, z, ...q });
  for (const r of d.rooms) {
    if (r.hx === undefined) continue;
    const along = r.hz >= r.hx, len = along ? r.hz : r.hx, half = along ? r.hx : r.hz;
    if (half <= 4.5 && len > 20) {
      // A main or a run: a street's grate over it, one (two, if it's a long one), off to a side of the walk and not where
      // its middle is, so the day falls somewhere of its own; a pipe out of a wall between, side to side; and no standing
      // lanterns in its walk, only the ones on its walls. (A grate every 24 m down the middle made every run one picture.)
      r.fires = 0;
      const n = len * 2 > (o.grateEvery || 70) ? 2 : 1, seed = Math.abs(Math.round(r.x * 7 + r.z * 3)) % 7;
      for (let i = 0; i < n; i++) {
        const t = (n === 1 ? (seed / 7 - 0.5) * 0.9 : i ? 0.55 : -0.4) * (len - 8), sd = (seed + i) % 2 ? 1 : -1;
        const x = r.x + (along ? sd * half * 0.35 : t), z = r.z + (along ? t : sd * half * 0.35);
        if (!near(x, z, 3)) add('streetgrate', x, z, { yaw: along ? 0 : Math.PI / 2 });
      }
      const m = Math.max(1, Math.round((len * 2 - 10) / 17));
      for (let i = 0; i < m; i++) {
        const t = ((i + 0.5) / m * 2 - 1) * (len - 5) + 5, side = i % 2 ? 1 : -1;
        if (Math.abs(t) > len - 3) continue;
        const x = r.x + (along ? side * (half - 0.4) : t), z = r.z + (along ? t : side * (half - 0.4));
        if (!near(x, z, 2.5)) add('outfall', x, z, { yaw: along ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : (side > 0 ? Math.PI : 0), up: 0.9 + 0.4 * ((i * 7) % 3) / 2, dry: !o.running && i % 3 === 2 });
        // (Each sector's own along its runs: the Slough's silt banked up the walls; the Charnel Runs' bones, washed down
        // from the charnel and heaped where the water left them.)
        const bx = r.x + (along ? -side * (half - 1.1) : t + 4), bz = r.z + (along ? t + 4 : -side * (half - 1.1));
        if (o.silt && i % 2 === 0 && !near(bx, bz, 2.5)) add('heap', bx, bz, { r: 1.1 + 0.3 * (i % 3) });
        if (o.bones && i % 2 === 1 && !near(bx, bz, 2.5)) add('bones', bx, bz, { r: 1.2 });
      }
    } else if (Math.min(r.hx, r.hz) >= 7) {
      // A hall: its fires along the walls fewer (pole-lanterns, a long way apart), and a grate or two over it.
      r.fires = r.fires ?? 18;
      if (!d.props.some((p) => p.kind === 'daylight' && Math.abs(p.x - r.x) < r.hx && Math.abs(p.z - r.z) < r.hz)) {
        for (const [fx, fz] of Math.max(r.hx, r.hz) >= 14 ? [[-0.4, -0.35], [0.35, 0.4]] : [[0.25, -0.2]]) {
          const x = r.x + fx * r.hx, z = r.z + fz * r.hz;
          if (!near(x, z, 3)) add('streetgrate', x, z, { yaw: 0.3 });
        }
      }
    }
  }
}
// (Each its own: the West Drains fen-green and murky; the Slough brown-black and silted, its lamps the fewest; the Charnel
// Runs bone-pale and dry; the High Conduits clean and loud with water, every pipe running. fill: the light off its stone.)
lightSewer(WEST_DRAINS, { look: { light: [1, 0.6, 0.3], fog: [0.026, 0.03, 0.018, 0.022], fill: [0.07, 0.075, 0.058] } });
lightSewer(SLOUGH_MAINS, { look: { light: [1, 0.62, 0.32], out: 0.25, fog: [0.032, 0.028, 0.02, 0.018], fill: [0.13, 0.11, 0.085] }, silt: true });
lightSewer(CHARNEL_RUNS, { look: { flame: 'flame', light: [1, 0.58, 0.3], out: 0.4, fog: [0.03, 0.026, 0.024, 0.016], fill: [0.085, 0.078, 0.07] }, grateEvery: 90, bones: true });
lightSewer(HIGH_CONDUITS, { look: { out: 0.2, fog: [0.03, 0.022, 0.014, 0.012], fill: [0.09, 0.08, 0.066] }, running: true });
// (Where the street fell in, the Great Grate: the day comes down the hole it left, wide.)
WEST_DRAINS.props.push({ kind: 'daylight', x: 2, z: -152, r: 4.2, pool: false, lean: [0.14, 0.05] });
