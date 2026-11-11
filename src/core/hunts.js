// The hunting grounds: where the woods' monsters stand, and the paths in to them. Round each the pines open into a glade, the
// wood thins, and what's left has its low boughs off (src/core/forest.js, src/gfx/pines.js), so you can see what you're
// fighting. The paths are worn ways like any other (src/core/terrain.js PATHS): nothing grows on them, the trail follows them,
// the map draws them.
//
// Round Bellmourn each ground is named here, by where its monsters are put: the lairs (src/core/tripo-monsters.js), the
// burial grounds, the casters' posts and the ogre's (src/sim/undead.js GRAVEYARDS, addUndead), the Gravehart (GRAVEHART in
// src/sim/sim.worker.js) and the Abyssal Mouth (src/core/field-creatures.js). Move one of those and move it here.
// tests/hunts.test.mjs keeps the lairs and the field creatures in step. Out in the countries, every lair has its glade.
import { PORTAL } from './dungeon.js';
import { FIELD_CREATURES } from './field-creatures.js';
import { LAIRS } from './tripo-monsters.js';

// How far out a lair counts as one of the town's own woods'.
const NEAR = 330;
const lair = (key, more = 5) => { const l = LAIRS.find((q) => q.key === key); return { key, x: l.x, z: l.z, r: l.r + more }; };
// x, z, and how far the open ground goes round it.
export const HUNT_GROUNDS = [
  lair('werewolf', 9), lair('nest'), lair('goblin_camp'), lair('kobold_den'), lair('lost_children'), lair('goat_ring'),
  { key: 'graves_nw', x: -128, z: -90, r: 10 }, { key: 'graves_ne', x: 100, z: -128, r: 10 },
  { key: 'graves_w', x: -170, z: 70, r: 10 }, { key: 'graves_s', x: -62, z: 160, r: 10 },
  { key: 'necromancer', x: -150, z: -75, r: 8 }, { key: 'fire_wizard', x: -160, z: 60, r: 8 }, { key: 'wizard', x: 50, z: -128, r: 8 },
  { key: 'ogre', x: -72, z: -78, r: 9 },
  { key: 'gravehart', x: -40, z: -150, r: 12 }, { key: 'gravehart_lair', x: -62, z: -168, r: 8 },
  ...FIELD_CREATURES.filter((f) => Math.hypot(...f.spawn) < NEAR).map((f) => ({ key: f.model, x: f.spawn[0], z: f.spawn[1], r: 10 })),
];
const FAR_GROUNDS = LAIRS.filter((l) => Math.hypot(l.x, l.z) >= NEAR).map((l) => ({ key: l.key, x: l.x, z: l.z, r: l.r + 5 }));

// Where the path up to the Warrens' portal ends: the foot of the steps down its front (src/core/sites.js portalWall).
const STEPS_FOOT = [Math.round(PORTAL.x + Math.sin(PORTAL.yaw) * 13), Math.round(PORTAL.z + Math.cos(PORTAL.yaw) * 13)];
const way = (...pts) => ({ pts, w: 1.3, hunt: true });
// Each leaves a road or a path that was there already (the south track, the north-east track, the Long Road, the Fall, the
// sexton's way), or another of these. The two roads up the hill run on ridges with steep sides, so the ways west go up the
// hollows either side of the Fall from the town's end of them, not down off the roads.
export const HUNT_PATHS = [
  // South: off the south track to the werewolf's and on to the goat men's ring; and the other way to the graves. The spiders'
  // nest is a few steps off the Long Road.
  way([0, 130], [20, 146], [40, 160]), way([40, 160], [72, 176], [112, 194], [150, 205]),
  way([0, 130], [-30, 148], [-62, 160]),
  way([-158, 131], [-155, 141], [-150, 150]),
  // West: from the foot of the Long Road up the hollow between the two roads, to the graves and the fire wizard's, and on
  // out to the lost children.
  way([-34, 26], [-60, 25], [-92, 27], [-124, 36], [-150, 54], [-170, 70]), way([-170, 70], [-193, 84], [-215, 95]),
  // North-west: from the foot of the Fall up the hollow north of it, to the graves, the necromancer's and the goblins' camp;
  // the ogre's; the Gravehart's.
  way([-43, 2], [-62, -13], [-90, -24], [-114, -38], [-124, -64], [-128, -90]), way([-128, -90], [-150, -75]), way([-128, -90], [-156, -100], [-185, -105]),
  way([-90, -24], [-84, -52], [-72, -78]), way([-72, -78], [-58, -116], [-40, -150]), way([-40, -150], [-62, -168]),
  // North-east: off the north-east track to the graves, the wizard's, the kobolds' den, and up the hill to the Warrens' portal.
  way([95, -50], [99, -90], [100, -128]), way([100, -128], [76, -131], [50, -128]),
  way([100, -128], [110, -166], STEPS_FOOT), way([110, -166], [142, -168], [175, -160]),
  // East: off the sexton's way to the Abyssal Mouth, and on to the goat men's ring.
  way([150, 34], [156, 72], [150, 110]), way([150, 110], [160, 158], [150, 205]),
];

const box = (list, m) => list.reduce((b, g) => [Math.min(b[0], g.x - g.r - m), Math.max(b[1], g.x + g.r + m), Math.min(b[2], g.z - g.r - m), Math.max(b[3], g.z + g.r + m)], [1e9, -1e9, 1e9, -1e9]);
// How far past a glade's edge anyone asks after it: the wood's thinned and trimmed out to here and no further.
export const HUNT_REACH = 64;
const NEAR_BOX = box(HUNT_GROUNDS, HUNT_REACH), FAR_FROM = Math.min(...FAR_GROUNDS.map((g) => Math.hypot(g.x, g.z))) - 120;
// The far grounds, sorted into squares (there are a hundred of them over the land, and every pine asks): each square holds
// the grounds whose reach touches it.
const FAR_CELL = 256, FAR_GRID = new Map();
const farKey = (i, j) => (i + 512) * 1024 + (j + 512);
for (const g of FAR_GROUNDS) {
  const m = g.r + HUNT_REACH;
  for (let i = Math.floor((g.x - m) / FAR_CELL); i <= Math.floor((g.x + m) / FAR_CELL); i++) {
    for (let j = Math.floor((g.z - m) / FAR_CELL); j <= Math.floor((g.z + m) / FAR_CELL); j++) {
      const k = farKey(i, j);
      if (!FAR_GRID.has(k)) FAR_GRID.set(k, []);
      FAR_GRID.get(k).push(g);
    }
  }
}

// How far (x, z) is outside the nearest ground's open middle, in metres (under 0: in it). Past HUNT_REACH, 1e9.
export function huntEdge(x, z) {
  let list;
  if (x > NEAR_BOX[0] && x < NEAR_BOX[1] && z > NEAR_BOX[2] && z < NEAR_BOX[3]) list = HUNT_GROUNDS;
  else if (x * x + z * z > FAR_FROM * FAR_FROM) list = FAR_GRID.get(farKey(Math.floor(x / FAR_CELL), Math.floor(z / FAR_CELL)));
  else return 1e9;
  if (!list) return 1e9;
  let best = 1e9;
  for (let i = 0; i < list.length; i++) {
    const g = list[i], dx = x - g.x, dz = z - g.z, m = g.r + HUNT_REACH;
    if (dx > m || dx < -m || dz > m || dz < -m) continue;
    const d = Math.sqrt(dx * dx + dz * dz) - g.r;
    if (d < best) best = d;
  }
  return best < HUNT_REACH ? best : 1e9;
}

// Every stretch of the paths, with the box past which it's too far off to matter.
const PATH_REACH = 22;
const STRETCHES = HUNT_PATHS.flatMap((p) => p.pts.slice(1).map(([bx, bz], i) => {
  const [ax, az] = p.pts[i], m = p.w + PATH_REACH;
  return { ax, az, bx, bz, w: p.w, x0: Math.min(ax, bx) - m, x1: Math.max(ax, bx) + m, z0: Math.min(az, bz) - m, z1: Math.max(az, bz) + m };
}));
const PATH_BOX = STRETCHES.reduce((b, s) => [Math.min(b[0], s.x0), Math.max(b[1], s.x1), Math.min(b[2], s.z0), Math.max(b[3], s.z1)], [1e9, -1e9, 1e9, -1e9]);

// How far (x, z) is outside the nearest hunting path's edge, in metres (under 0: on it). Past 22 m, 1e9.
export function huntPathEdge(x, z) {
  if (x < PATH_BOX[0] || x > PATH_BOX[1] || z < PATH_BOX[2] || z > PATH_BOX[3]) return 1e9;
  let best = 1e9;
  for (let i = 0; i < STRETCHES.length; i++) {
    const s = STRETCHES[i];
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    const dx = s.bx - s.ax, dz = s.bz - s.az;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(s.ax + dx * t - x, s.az + dz * t - z) - s.w;
    if (d < best) best = d;
  }
  return best < PATH_REACH ? best : 1e9;
}

// Whether a pine standing at (x, z) has had its low boughs taken off: the ones about a ground, and along the paths to them.
// u: the tree's own number, 0 to 1, so the trimmed wood ends raggedly.
export function huntTrimmed(x, z, u) {
  return huntEdge(x, z) < 44 + 18 * u || huntPathEdge(x, z) < 11 + 8 * u;
}
