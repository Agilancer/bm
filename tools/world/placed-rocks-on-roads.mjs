// The boulders built into the places (src/core/places.js PIECES.rock: the sites, the roadsides, the lairs) that lie over a
// road, path or flight of steps. node tools/world/placed-rocks-on-roads.mjs
import { PIECES } from '../../src/core/places.js';
import { roadEdge } from '../../src/core/rocks.js';
import { nearFlight } from '../../src/core/roadbed.js';

const seen = [];
const rock = PIECES.rock;
PIECES.rock = function (layer, x, z, r, h, o = {}) { seen.push({ x, z, r: r * 1.05 * 1.25 * (o.sx ?? 1), h, layer, stack: new Error().stack.split('\n')[2].trim() }); return rock.call(this, layer, x, z, r, h, o); };
const { buildSites } = await import('../../src/core/sites.js');
buildSites(false);
let bad = 0;
for (const s of seen) {
  if (s.r < 0.6) continue;
  const e = roadEdge(s.x, s.z);
  const over = s.r - e.d, step = nearFlight(s.x, s.z, s.r);
  if (over > 0.3 || step) { bad++; if (bad < 40) console.log(s.x.toFixed(1), s.z.toFixed(1), 'r', s.r.toFixed(2), 'over', over.toFixed(2), step ? 'STEPS' : '', s.stack); }
}
console.log(seen.length, 'placed rocks,', bad, 'over a way');
