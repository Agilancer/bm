// Where Velscour's church stands: the cathedral, its office and stair, and the catacombs and the rift under them, all of it together.
// tools/interior/build_interior.py lays it out where it was first drawn, in its own frame (the great door at x = 66 on the line z = 0,
// the nave running east, the Tomb out at x = 258), and moves every piece of it, wall, floor, lamp, door, chest and spawn, by CHURCH_X
// and CHURCH_Z as it writes assets/game/interior. The houses' insides, built by the same script, stay where they are. It stood at
// the edge of the town; it was moved out east, a field away, so the town can grow onto its old ground (src/core/town.js).
// (The build reads these two numbers out of this file, so keep them plain numbers.)
export const CHURCH_X = 90;
export const CHURCH_Z = 0;

// A point of the church as it was drawn, where it stands now, and back.
export const churchAt = (x, z) => [x + CHURCH_X, z + CHURCH_Z];
export const toChurch = (x, z) => [x - CHURCH_X, z - CHURCH_Z];

// The great door, in the middle of the west front, and the foot of its steps, where Velscour's knight keeps it.
export const CHURCH_DOOR = churchAt(66, 0);
export const CHURCH_GUARD = churchAt(60, 0);

// The ground it stands on, levelled a little under its floor (2.7, the floor 3.0), out past its walls and over the head of the stair, and
// how far the land takes to come back to its own lie round it. The land rises into hills to the east, so its back is cut into them.
export const CHURCH_SITE = { x0: 58 + CHURCH_X, x1: 148 + CHURCH_X, z: CHURCH_Z, hz: 26, y: 2.7, blend: 30 };
export const churchSite = (x, z) => Math.max(CHURCH_SITE.x0 - x, x - CHURCH_SITE.x1, Math.abs(z - CHURCH_SITE.z) - CHURCH_SITE.hz);

// Its yard, worn to bare dirt: a footprint for footprintDirt in src/core/terrain.js, on the ground map and the far one both.
export const CHURCH_FOOTPRINT = { x: 90 + CHURCH_X, z: CHURCH_Z, hx: 34, hz: 22, yaw: 0, h: 9 };
// And the wing over the head of the long stair, behind it (stair_cover in tools/interior/build_interior.py).
export const CHURCH_WING = { x: 135.5 + CHURCH_X, z: CHURCH_Z, hx: 10.5, hz: 9, yaw: 0, h: 9 };

// The land's left out inside the wing: the long stair stands up through where it would be, its vault over the land's height, and
// from the stair you'd see the grass cutting through it. (src/sim/job.worker.js leaves it out of the terrain's mesh, on the grid of a
// finer patch round the church.)
export const LAND_HOLE = { x0: 126 + CHURCH_X, x1: 144 + CHURCH_X, z0: -8 + CHURCH_Z, z1: 8 + CHURCH_Z };
export const CHURCH_PATCH = { x0: 90 + CHURCH_X, x1: 182 + CHURCH_X, z0: -46 + CHURCH_Z, z1: 46 + CHURCH_Z };

// The Sexton's Door and the passage in from it, in the church's frame: from the wing's south wall to the first flight of the stair.
export const SEXTON = { x0: 125.9, x1: 127.9, z0: 2.0, z1: 8.98, y: 6.0 };
export const inSexton = (x, y, z) => x > SEXTON.x0 && x < SEXTON.x1 && z > SEXTON.z0 && z < SEXTON.z1 && y < SEXTON.y;

// As far as any of it goes, under the ground as well: the nav grid in src/sim/world.js has to reach it.
export const CHURCH_BOUNDS = { x0: 58 + CHURCH_X, x1: 262 + CHURCH_X, z0: -176 + CHURCH_Z, z1: 45 + CHURCH_Z };

// Inside it, in its own frame (x, z from toChurch): the nave, the office and the passage to it, the stair down under its falling roof, and
// anywhere under the land. The same boxes as indoorAt in src/gfx/shaders.js, which are the inside of the build's walls.
export function inChurchFrame(x, y, z) {
  if (x < 65.9) return false;
  if (x < 113) return Math.abs(z) < 13.9 && y < 24;
  if (x < 125) return (Math.abs(z) < 6.5 && y < 9.5) || (x < 115.75 && z < 0 && z > -12.45 && y < 7.5);
  if (inSexton(x, y, z)) return true;
  if (x < 176 && Math.abs(z) < 3 && y < 9 - (x - 125) * 0.33) return true;
  return x < 262 && z > -176 && z < 45 && y < -6;
}
export const inChurch = (x, y, z) => inChurchFrame(x - CHURCH_X, y, z - CHURCH_Z);
