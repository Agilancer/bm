// The seals in City State Phobos: one in a square of its own beside a street in five of its districts, in among the city's
// houses (src/core/sites.js SEALS takes them with the land's; src/core/phobos-build.js keeps houses and lamps off the
// squares and paves them). Each name ends "- Phobos", as the Sill's does, so the travel list says where it goes.
// Spots found flat (under 0.1 m across the dais), beside a street, clear of the hubs, the lairs, the dungeons and the forts.
// { key, x, z, yaw (the square's turn, along its street), name }
import { SEWERS } from './delve-sewers.js';

export const PHOBOS_SEALS = [
  { key: 'ph_barbican', x: 9463.8, z: 27.7, along: [0.5145, 0.8575], name: 'The Barbican - Phobos' },
  { key: 'ph_market', x: 9819.9, z: -86.1, along: [0.9615, -0.2747], name: 'Chainmarket - Phobos' },
  { key: 'ph_tanners', x: 9979.4, z: 618, along: [-0.96, 0.28], name: "The Tanners' Steps - Phobos" },
  { key: 'ph_bones', x: 9982, z: -598.7, along: [0.9138, -0.4061], name: 'The Bone Yards - Phobos' },
  { key: 'ph_mages', x: 10368.2, z: -369.6, along: [0.6866, 0.727], name: "The Mages' Rise - Phobos" },
].map((s) => ({ key: s.key, x: s.x, z: s.z, yaw: Math.atan2(s.along[0], s.along[1]), name: s.name }));

// A seal's square: 11 m by 11 m, turned with its street.
export const SEAL_SQUARE = 5.5;
// And the sewers' mouths in its streets (src/core/delve-sewers.js: each sector's portal and its second way down), each a
// delve's stair-and-wall (src/core/sites.js portalWall) in a square of its own, turned with it, kept as the seals' are.
export const SEWER_MOUTHS = SEWERS.flatMap((d) => [d.portal, ...(d.ways || [])]).map((p) => ({ x: p.x, z: p.z, yaw: p.yaw }));
export const MOUTH_SQUARE = 9.5;
// The seal (or sewer mouth) whose square (x, z) is in, pad metres round it allowed for; or null.
export function inSealSquare(x, z, pad = 0) {
  for (const [list, half] of [[PHOBOS_SEALS, SEAL_SQUARE], [SEWER_MOUTHS, MOUTH_SQUARE]]) for (const s of list) {
    const dx = x - s.x, dz = z - s.z, c = Math.cos(s.yaw), n = Math.sin(s.yaw);
    if (Math.abs(dx * c - dz * n) < half + pad && Math.abs(dx * n + dz * c) < half + pad) return s;
  }
  return null;
}
