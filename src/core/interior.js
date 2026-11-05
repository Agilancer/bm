// Where the ground is, indoors. The cathedral and the catacombs stand where nothing above ground can walk, so one height per
// x and z is still enough: anyone inside one of these rectangles is on its floor, and outside them, on the land. Houses are the
// exception, having an upstairs: see homeFloor.
import { terrainHeight } from './terrain.js';

let floors = [], homes = [];
export const setFloors = (f, h = []) => { floors = f; homes = h; };

const levelOf = (f, x, z) => {
  if (f.y === f.y2) return f.y;
  const t = f.axis === 'x' ? (x - f.x0) / (f.x1 - f.x0) : (z - f.z0) / (f.z1 - f.z0);
  return f.y + (f.y2 - f.y) * t;
};

export function floorAt(x, z) {
  if (x < 60) {
    // (Only the player goes upstairs. Everyone and everything else is on the ground floor.)
    for (const h of homes) if (x >= h.ground[0] && x <= h.ground[2] && z >= h.ground[1] && z <= h.ground[3]) return h.y;
    return null;
  }
  for (const f of floors) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    return levelOf(f, x, z);
  }
  return null;
}

// The floor of a house under someone at height y: the highest they could have stepped up to. Null if it's no house.
export function homeFloor(x, z, y) {
  for (const h of homes) {
    if (x < h.x0 || x > h.x1 || z < h.z0 || z > h.z1) continue;
    let best = null;
    for (const f of h.floors) {
      if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
      const v = levelOf(f, x, z);
      if (v <= y + 0.7 && (best === null || v > best)) best = v;
    }
    return best;
  }
  return null;
}

export const groundAt = (x, z, y) => (y !== undefined ? homeFloor(x, z, y) : null) ?? floorAt(x, z) ?? terrainHeight(x, z);

// Over a drop nobody steps off into. (The first floor under them, as ever: a bridge across it comes first.)
export function inPit(x, z) {
  for (const f of floors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) return f.pit === true;
  return false;
}
