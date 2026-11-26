// The land's scenery, built for the renderer on a thread of its own and handed over.
//   { lean, opening }  ->  the whole land as packSites makes it (src/core/sites.js buildSitesApart), once; the renderer ends
//                          the thread then.
//   { cell, opening }  ->  one cell of Phobos from near, as packCell makes it (src/gfx/phobos-near.js), as often as asked.
// Or { error }.
import { buildPhobosCell, buildSites, packCell, packSites } from './sites.js';
import { setOpeningTerrain } from './terrain.js';
import { CASTLE_CELLS, phobosHouses, towerCells, wallCells } from './phobos-build.js';
import { cityDoors, cityTowers } from './phobos-towers.js';
import { outCells } from './outskirts-build.js';

self.onmessage = (e) => {
  try {
    setOpeningTerrain(e.data.opening);
    const [what, transfer] = e.data.cell !== undefined ? packCell(e.data.cell, buildPhobosCell(e.data.cell, !!e.data.lean)) : packSites(buildSites(true, !!e.data.lean));
    // (With the land: Phobos's doors, and which of its cells have something to build from near, which the page wants as the
    // game begins and would else work out itself. src/core/phobos-towers.js adoptCityDoors, src/gfx/phobos-near.js.)
    if (e.data.cell === undefined) {
      what.phDoors = cityDoors();
      what.phCells = [...new Set([...phobosHouses().map((h) => h.cell), ...CASTLE_CELLS, ...towerCells(), ...wallCells(), ...cityTowers().map((t) => t.cell), ...outCells()])];
    }
    self.postMessage(what, transfer);
  } catch (err) {
    self.postMessage({ error: String(err?.stack || err) });
  }
};
