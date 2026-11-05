// Where the ground is, indoors. The cathedral and the catacombs stand where nothing above ground can walk, so one height per
// x and z is still enough: anyone inside one of these rectangles is on its floor, and outside them, on the land.
import { terrainHeight } from './terrain.js';

let floors = [];
export const setFloors = (f) => { floors = f; };

export function floorAt(x, z) {
  if (x < 60) return null;
  for (const f of floors) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    if (f.y === f.y2) return f.y;
    const t = f.axis === 'x' ? (x - f.x0) / (f.x1 - f.x0) : (z - f.z0) / (f.z1 - f.z0);
    return f.y + (f.y2 - f.y) * t;
  }
  return null;
}

export const groundAt = (x, z) => floorAt(x, z) ?? terrainHeight(x, z);
