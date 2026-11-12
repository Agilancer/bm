// What stands in the Hollowfang Warrens' rooms, and the blind niches cut off them: the look of the place, as plain data
// (src/core/dungeon.js has the rooms themselves; src/core/delve-build.js draws each kind). Local: x east, z south of the
// way in. Each room gets what its name promises. The solid ones are rock to the field, so they're kept to the rooms'
// edges, off the floors the fights use and the ways auto-play walks; nothing solid stands in a boss's room but what did.
const P = [];
const add = (kind, x, z, o = {}) => P.push({ kind, x, z, ...o });
// Shoring across a tunnel that runs (dx, dz): two props and a beam.
const shore = (x, z, dx, dz, w = 2.6, h = 3) => add('timber', x, z, { yaw: Math.atan2(dx, dz), w, h });

// The way down from the Mouth, and the Diggings: the kobolds' shoring, a cart on its rails, picks, spoil heaps.
shore(1, -14, 0, -1); shore(0.6, -26, 0, -1);
shore(18, -53, 1, -0.2, 2.5); shore(33, -57.5, 1, -0.3, 2.5);
add('cart', -8.5, -51, { yaw: 0.5 }); add('cart', 5, -37.5, { yaw: 1.9 });
add('heap', -10, -41, { r: 1.7 }); add('heap', 8, -57, { r: 1.4 }); add('heap', -4, -57.5, { r: 1.2 });
add('tools', -11.5, -46, { yaw: 1.2 }); add('tools', 10.5, -42, { yaw: -1.4 });
add('crates', 9.5, -39);
// The Tallow Pit: vats on the boil, the pit itself with a skin on it, candles on every ledge.
add('vat', 47.5, -54.5, { r: 1.1, solid: true }); add('vat', 57, -53.5, { r: 1.2, solid: true }); add('vat', 62, -67, { r: 1, solid: true });
add('pool', 54, -70, { r: 3.2, layer: 'pale:stone', up: 0.12 });
for (const [x, z] of [[43.5, -58], [52.5, -52], [63, -61], [45, -70], [58.5, -73.5], [50, -74]]) add('candles', x, z);
add('barrels', 42.5, -66);
shore(51.5, -82, 0, -1, 2.7); shore(51, -94, 0, -1, 2.7);
// Grubnash's Dig: props at his diggers' holes, the spoil they've thrown out, their carts.
shore(72, -110.8, 10, 6, 1.6, 2.2); shore(36.5, -104.5, -8, 8, 1.6, 2.2); shore(61, -139.5, 6, -9, 1.6, 2.2);
add('heap', 66, -124, { r: 2 }); add('heap', 39, -128, { r: 1.7 }); add('heap', 47, -137, { r: 1.5 }); add('heap', 63, -105, { r: 1.5 });
add('cart', 68, -118, { yaw: 2.6 }); add('tools', 38.5, -113, { yaw: 1.5 }); add('tools', 55, -138, { yaw: 3 });
// The Warren: where the goblins sleep. Hide tents round the walls, a seep of water in the low middle.
for (const [x, z, r] of [[-14, -137, 1.4], [-8, -157.5, 1.2], [-21, -158, 1.3], [-25.5, -142, 1.2], [-5.5, -139.5, 1.1]]) add('tent', x, z, { r });
add('pool', -16, -149, { r: 2.6 }); add('bones', -23, -147, { r: 1.2 });
// The Feasting Hall: their tables, a carcass on the spit, barrels of whatever they drink, what's left of the last feast.
add('table', -70, -176.5, { hx: 1, hz: 3.4, solid: true, rough: true }); add('table', -51.5, -185, { hx: 1, hz: 3, solid: true, rough: true });
add('spit', -63.5, -170.5); add('barrels', -73.5, -183); add('barrels', -55, -192);
add('bones', -49.5, -177, { r: 1.5 }); add('bones', -68, -190, { r: 1.3 });
// The Twin Thrones: two of them, side by side against the far wall, each brother's own colour on his seat; their takings.
add('stonethrone', -73.5, -242, { yaw: 0.83, r: 1.3, solid: true, cloth: 'cloth_red' });
add('stonethrone', -67, -246.5, { yaw: 0.34, r: 1.3, solid: true, cloth: 'cloth_oat' });
add('gold', -70.8, -245.6, { r: 0.8 }); add('bones', -77, -232, { r: 1.5 }); add('crates', -50, -246);
// The Bone Stair: the way down is laid with the long bones of something, and what else it was is heaped in the room below.
add('bonesteps', -30, -252, { yaw: 2.13, n: 9, w: 2.3 }); add('bonesteps', -13, -262.5, { yaw: 2.16, n: 5, w: 2.3 });
add('bones', 6, -266, { r: 2.4 }); add('bones', -6, -279, { r: 2.6 }); add('bones', 8, -278, { r: 1.8 }); add('bones', -8, -266, { r: 1.6 });
// Venomaw's Hoard: gold heaped either side of her perch and along the back wall, her eggs, the bones of who came before.
for (const [x, z, r] of [[-7.5, -351.5, 3.1], [7.5, -351.5, 3.1], [-16, -355, 2.4], [15, -356, 2.2], [-23, -344, 2], [23, -341, 2.1], [0, -361.5, 1.6]]) add('gold', x, z, { r });
add('eggs', -25, -329, { s: 1.5, layer: 'dark:stone' }); add('eggs', 24.5, -325, { s: 1.4, layer: 'dark:stone' }); add('eggs', 19, -351, { s: 1.2, layer: 'dark:stone' });
add('bones', -25, -318, { r: 2.4 }); add('bones', 21, -313, { r: 2 });
add('pool', -3, -309, { r: 3 });
export const WARRENS_PROPS = P;

// Blind cuts off the rooms: a body's length or three of side passage that goes nowhere, for the look of a place that was dug.
export const WARRENS_NICHES = [
  { pts: [[-13, -48], [-21, -52]], w: 1.6, niche: true, rise: 0.6 },
  { pts: [[63, -70], [71, -74]], w: 1.6, niche: true },
  { pts: [[-18, -134], [-20, -125]], w: 1.5, niche: true, rise: 0.8 },
  { pts: [[-76, -184], [-85, -188]], w: 1.7, niche: true },
  { pts: [[-80, -228], [-89, -226]], w: 1.6, niche: true, rise: 0.5 },
  { pts: [[11, -276], [19, -280]], w: 1.6, niche: true, rise: -0.6 },
  { pts: [[-29, -338], [-38, -342]], w: 2, niche: true, rise: 1 },
  { pts: [[29, -330], [38, -326]], w: 2, niche: true, rise: 1 },
];
