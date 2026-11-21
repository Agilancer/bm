// The houses pass's numbers (docs/HOMES.md): every Phobos house's rooms laid out (src/core/phobos-rooms.js) and counted:
// its household, its beds and who's left without one, what didn't fit. And a sample of near cells built, their corners
// counted against the old build's.   node tools/homes/audit.mjs [cells=40]
import { footing, phobosHouses, upstairs, cellOf } from '../../src/core/phobos-build.js';
import { roomPlan } from '../../src/core/phobos-rooms.js';
import { buildPhobosCell } from '../../src/core/sites.js';
const H = phobosHouses(), kinds = {}, miss = {};
let beds = 0, sleepers = 0, want = 0, noBed = 0, t0 = Date.now();
for (const h of H) {
  const F = footing(h), up = upstairs(h, F), p = roomPlan(h, F, up), k = p.hold.kind;
  kinds[k] = (kinds[k] || 0) + 1;
  const w = p.hold.beds.reduce((a, b) => a + b.n, 0) + (p.hold.lodgers || 0), got = p.beds.reduce((a, b) => a + b.n, 0);
  want += w; sleepers += got; beds += p.beds.length;
  if (got < w) { noBed++; miss[k] = (miss[k] || 0) + 1; }
}
console.log('houses', H.length, 'plan ms', Date.now() - t0, kinds);
console.log({ beds, sleepers, want, housesShort: noBed, miss });
const N = +(process.argv[2] || 40), cells = [...new Set(H.map((h) => h.cell))];
let corners = 0, lamps = 0, t1 = Date.now();
for (let i = 0; i < N; i++) { const c = cells[Math.floor(i * cells.length / N)]; const b = buildPhobosCell(c); for (const p of b.parts.values()) corners += p.pos.length / 3; lamps += b.lamps.length; }
console.log('cells', N, 'corners/cell', Math.round(corners / N), 'lamps/cell', (lamps / N).toFixed(1), 'ms/cell', Math.round((Date.now() - t1) / N));
