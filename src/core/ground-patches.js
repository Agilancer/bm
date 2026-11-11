// Where the land's mesh is drawn finer than its one great grid (buildTerrain in src/sim/job.worker.js), whose cells are three
// to twelve metres across by the time they're out in the woods. You walk on the land's own height (src/sim/world.js), so
// wherever the ground has a shape smaller than a cell, the grid draws it somewhere you aren't standing.
// cell: 2 m on a PC, 4 on a phone.
//
// A patch is a box of square cells. hole: cells left out for something under the ground. skip: boxes whose cells are left to
// another grid; an open one is left to the great grid, which is finer still in the town.
import { CHURCH_PATCH, LAND_HOLE } from './church.js';
import { PORTAL } from './dungeon.js';

// The hill and its roads. (First: Lisandra's cave is cut out of this one.)
const HILL = { x0: -614, x1: -90, z0: -44, z1: 344 };
// The Warrens' portal's hillside: its cut, its banks and the ground under its steps, a quarter of the cell.
const even = (v) => Math.round((v - 2) / 4) * 4 + 2, four = (v) => Math.round(v / 4) * 4;
const GATE = { x0: even(PORTAL.x - 26), x1: even(PORTAL.x + 26), z0: four(PORTAL.z - 24), z1: four(PORTAL.z + 24) };
const shrunk = (r, m) => ({ x0: r.x0 + m, x1: r.x1 - m, z0: r.z0 + m, z1: r.z1 - m });
// The woods round the town, out past every hunting ground (src/core/hunts.js; tests/ground-mesh.test.mjs holds it to that).
// On the hill's own lines, so the two meet corner to corner; it laps over the church's and the portal's by a cell.
const WOODS = { x0: -254, x1: 254, z0: -256, z1: 256, skip: [{ x0: -62, x1: 62, z0: -64, z1: 64, open: true }, HILL, shrunk(CHURCH_PATCH, 4), shrunk(GATE, 4)] };

export function groundPatches(cell) {
  return [{ ...HILL, cell }, { ...CHURCH_PATCH, cell, hole: LAND_HOLE }, { ...WOODS, cell }, { ...GATE, cell: cell / 4 }];
}
