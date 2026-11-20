// The land's scenery, built for the renderer on a thread of its own and handed over.
//   { lean, opening }  ->  the whole land as packSites makes it (src/core/sites.js buildSitesApart), once; the renderer ends
//                          the thread then.
//   { cell, opening }  ->  one cell of Phobos from near, as packCell makes it (src/gfx/phobos-near.js), as often as asked.
// Or { error }.
import { buildPhobosCell, buildSites, packCell, packSites } from './sites.js';
import { setOpeningTerrain } from './terrain.js';

self.onmessage = (e) => {
  try {
    setOpeningTerrain(e.data.opening);
    const [what, transfer] = e.data.cell !== undefined ? packCell(e.data.cell, buildPhobosCell(e.data.cell)) : packSites(buildSites(true, !!e.data.lean));
    self.postMessage(what, transfer);
  } catch (err) {
    self.postMessage({ error: String(err?.stack || err) });
  }
};
