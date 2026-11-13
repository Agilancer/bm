// Where the land's mesh is drawn finer than its one great grid (buildTerrain in src/core/ground-mesh.js), whose cells are three
// to twelve metres across by the time they're out in the woods. You walk on the land's own height (src/sim/world.js), so
// wherever the ground has a shape smaller than a cell, the grid draws it somewhere you aren't standing.
// cell: 2 m on a PC, 4 on a phone.
//
// A patch is a box of square cells. hole: cells left out for something under the ground. skip: boxes whose cells are left to
// another grid; an open one is left to the great grid. cut: the near ground (below) may take its cells under its finest ring,
// where it's the finer of the two; a patch without it (the church's, with its hole; the portal's; the town's) is left whole.
import { CHURCH_PATCH, LAND_HOLE } from './church.js';
import { PORTAL } from './dungeon.js';

// The hill and its roads. (First: Lisandra's cave is cut out of this one.)
const HILL = { x0: -614, x1: -90, z0: -44, z1: 344 };
// The Warrens' portal's hillside: its cut, its banks and the ground under its steps, a quarter of the cell.
const even = (v) => Math.round((v - 2) / 4) * 4 + 2, four = (v) => Math.round(v / 4) * 4;
const GATE = { x0: even(PORTAL.x - 26), x1: even(PORTAL.x + 26), z0: four(PORTAL.z - 24), z1: four(PORTAL.z + 24) };
const shrunk = (r, m) => ({ x0: r.x0 + m, x1: r.x1 - m, z0: r.z0 + m, z1: r.z1 - m });
// The town, half the cell. (It was the great grid's middle, which is under you only while you're in it: src/gfx/renderer.js
// followLand lays the great grid again round you out in the countries, and the near ground takes its middle from it.)
const TOWN = { x0: -62, x1: 62, z0: -64, z1: 64 };
// The woods round the town, out past every hunting ground (src/core/hunts.js; tests/ground-mesh.test.mjs holds it to that).
// On the hill's own lines, so the two meet corner to corner; it laps over the church's, the portal's and the town's by a cell.
const WOODS = { x0: -254, x1: 254, z0: -256, z1: 256, skip: [shrunk(TOWN, 4), HILL, shrunk(CHURCH_PATCH, 4), shrunk(GATE, 4)] };

export function groundPatches(cell) {
  return [{ ...HILL, cell, cut: true }, { ...CHURCH_PATCH, cell, hole: LAND_HOLE }, { ...WOODS, cell, cut: true }, { ...GATE, cell: cell / 4 }, { ...TOWN, cell: cell / 2 }];
}

// The near ground (src/core/ground-mesh.js buildNear): wherever you are in the world, rings of the land's own height round
// you, each ring's cells twice the last's, out to radii, stitched to the great grid's own corners. It's laid again in the pool's
// threads once you're `step` from its middle (src/gfx/renderer.js followNear), which is on the last ring's cells. Each radius
// is on the next ring's cells, so a ring's edge meets the next corner to corner.
export function nearGround(lean) {
  return lean ? { cells: [2, 4, 8, 16], radii: [96, 160, 288, 544], step: 32 } : { cells: [1.5, 3, 6, 12], radii: [120, 216, 408, 600], step: 36 };
}
export const nearCentre = (near, x, z) => { const s = near.cells[near.cells.length - 1]; return [Math.round(x / s) * s, Math.round(z / s) * s]; };
