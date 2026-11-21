// How long Phobos's near cells take to build, and how many corners each is (src/core/sites.js buildPhobosCell): the
// worst, the mean, and a spread of named ones.   node tools/phobos/cell_times.mjs [cell ...]
import { buildPhobosCell } from '../../src/core/sites.js';
import { phobosHouses } from '../../src/core/phobos-build.js';
const cells = process.argv.length > 2 ? process.argv.slice(2) : [...new Set(phobosHouses().map((h) => h.cell))];
buildPhobosCell(cells[0]);
let worst = 0, sum = 0, wc = '', most = 0;
const rows = [];
for (const c of cells) {
  const t0 = performance.now(), b = buildPhobosCell(c), ms = performance.now() - t0;
  let v = 0; for (const p of b.parts.values()) v += p.pos.length / 3;
  rows.push([c, ms, v]); sum += ms; if (ms > worst) { worst = ms; wc = c; } most = Math.max(most, v);
}
if (process.argv.length > 2) for (const [c, ms, v] of rows) console.log(c, ms.toFixed(1) + ' ms', v, 'corners');
console.log(JSON.stringify({ cells: cells.length, mean: +(sum / cells.length).toFixed(1), worst: +worst.toFixed(1), worstCell: wc, mostCorners: most }));
