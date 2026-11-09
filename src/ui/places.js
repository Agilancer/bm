// Where a body is, for the ears: what's underfoot (the steps' sound: src/main.js STEP) and what's round it (the beds:
// src/ui/lands.js sounds). Read on the main thread, off the same floors and houses the sim walks on.
import { floorAt } from '../core/interior.js';
import { CHURCH_BOUNDS, inChurch } from '../core/church.js';
import { waterAt } from '../core/lands.js';

// The houses' boxes (src/core/interior.js homes; the first of them is the Rift's pit, not a house). setHomes once the interior's in.
let houses = [];
export const setHomes = (homes) => { houses = (homes || []).slice(1).map((h) => [h.x0, h.z0, h.x1, h.z1, h.y + 12]); };

const inHouse = (x, y, z) => {
  for (const h of houses) if (x > h[0] && x < h[2] && z > h[1] && z < h[3] && y < h[4]) return true;
  return false;
};

// 'out', 'house', 'cathedral' (the church above ground), 'catacombs', or 'rift' (the deep under them).
export function roomAt(x, y, z) {
  if (inChurch(x, y, z)) return y > 1 ? 'cathedral' : y > -20 ? 'catacombs' : 'rift';
  return inHouse(x, y, z) ? 'house' : 'out';
}

// 'dirt', 'stone', 'wood' or 'water': the footsteps the pack has. y is the feet.
export function groundAt(x, y, z) {
  const w = waterAt(x, z);
  if (w !== null && y < w + 0.1) return 'water';
  if (x > CHURCH_BOUNDS.x0 && x < CHURCH_BOUNDS.x1 && z > CHURCH_BOUNDS.z0 && z < CHURCH_BOUNDS.z1 && (floorAt(x, z) !== null || inChurch(x, y + 0.5, z))) return 'stone';
  if (inHouse(x, y, z)) return 'wood';
  // (High on the Sorrowhorn it's all rock and ice.)
  return y > 520 ? 'stone' : 'dirt';
}
