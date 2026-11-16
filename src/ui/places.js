// Where a body is, for the ears: what's underfoot (the steps' sound: src/main.js STEP) and what's round it (the beds:
// src/ui/lands.js sounds). Read on the main thread, off the same floors and houses the sim walks on.
import { floorAt } from '../core/interior.js';
import { CHURCH_BOUNDS, inChurch } from '../core/church.js';
import { groundCover, waterAt } from '../core/lands.js';
import { SURFACE, wayAt } from '../core/roads.js';
import { terrainHeight } from '../core/terrain.js';
import { inDungeon } from '../core/dungeon.js';
import { inHall } from '../core/testhall.js';

// The houses' boxes (src/core/interior.js homes; the first of them is the Rift's pit, not a house). setHomes once the interior's in.
let houses = [];
export const setHomes = (homes) => { houses = (homes || []).slice(1).map((h) => [h.x0, h.z0, h.x1, h.z1, h.y + 12]); };

const inHouse = (x, y, z) => {
  for (const h of houses) if (x > h[0] && x < h[2] && z > h[1] && z < h[3] && y < h[4]) return true;
  return false;
};

// 'out', 'house', 'cathedral' (the church above ground), 'catacombs', 'rift' (the deep under them), or 'hall' (the Test Dungeon).
export function roomAt(x, y, z) {
  // (The Test Dungeon's white hall: src/core/testhall.js.)
  if (inHall(x, z)) return 'hall';
  if (inChurch(x, y, z)) return y > 1 ? 'cathedral' : y > -20 ? 'catacombs' : 'rift';
  return inHouse(x, y, z) ? 'house' : 'out';
}

// 'dirt', 'stone', 'wood' or 'water': the footsteps the pack has. y is the feet.
export function groundAt(x, y, z) {
  if (inHall(x, z)) return 'stone';
  const w = waterAt(x, z);
  if (w !== null && y < w + 0.1) return 'water';
  if (x > CHURCH_BOUNDS.x0 && x < CHURCH_BOUNDS.x1 && z > CHURCH_BOUNDS.z0 && z < CHURCH_BOUNDS.z1 && (floorAt(x, z) !== null || inChurch(x, y + 0.5, z))) return 'stone';
  if (inHouse(x, y, z)) return 'wood';
  // (High on the Sorrowhorn it's all rock and ice.)
  return y > 520 ? 'stone' : 'dirt';
}

// What a shield ridden on the ground is scraping over (src/gfx/boardmarks.js): 'snow' and 'dirt' take its track, 'stone' throws
// sparks and rings under it, 'wood' and 'water' do neither. Snow and bare rock as the ground's shader paints them
// (src/gfx/materials.js TERRAIN: the far map's snow on the level, its rock and anything steep), and a way by what it's laid
// with. ways: roadSegments' lists, as the renderer keeps them (null before the land's in).
const PAVED = new Set([SURFACE.OLD, SURFACE.FLAG, SURFACE.SETT, SURFACE.GRAVEL, SURFACE.STONES]);
export function boardGround(x, y, z, ways) {
  if (inHall(x, z) || inDungeon(x, z)) return 'stone';
  const w = waterAt(x, z);
  if (w !== null && y < w + 0.1) return 'water';
  if (inHouse(x, y, z)) return 'wood';
  // The church and the catacombs, the Rift's bridge and the portals' platforms: laid stone, all of it.
  if (floorAt(x, z) !== null || inChurch(x, y + 0.5, z)) return 'stone';
  const h = terrainHeight(x, z);
  if (y > h + 0.3) return 'stone';
  const way = ways ? wayAt(ways, x, z) : null;
  if (way && way.e < -0.15) return PAVED.has(way.kind) ? 'stone' : way.kind === SURFACE.PLANK ? 'wood' : 'dirt';
  const g = 2, dx = (terrainHeight(x + g, z) - terrainHeight(x - g, z)) / (2 * g), dz = (terrainHeight(x, z + g) - terrainHeight(x, z - g)) / (2 * g);
  const ny = 1 / Math.hypot(dx, 1, dz);
  // (The far map is only worked out past a kilometre out: nearer, the land has neither snow nor bare rock but where it's steep.)
  const [snow, rock] = Math.hypot(x, z) > 1000 ? groundCover(x, z, h, (1 - ny) * 3) : [0, 0];
  if (snow > 0.42 && ny > 0.68) return 'snow';
  if (Math.max(rock, Math.min(1, Math.max(0, (1 - ny - 0.2) / 0.22))) > 0.55) return 'stone';
  return 'dirt';
}
