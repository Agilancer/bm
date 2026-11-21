// The coarse graph's own flood from the gate road (east.bin alone, no world): how many pieces, and the nearest ones it
// misses to a point, with what's next to them.
import fs from 'node:fs';
import { EAST_DOOR, EastNav } from '../../src/sim/east-nav.js';
const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), { resolve() {}, heightFor() { return 0; }, topUnder() { return 0; } });
const s = nav.nodesNear(EAST_DOOR[0], EAST_DOOR[1], null, 6)[0];
const seen = new Uint8Array(nav.N), q = [s]; seen[s] = 1;
for (let h = 0; h < q.length; h++) { const n = q[h]; for (let e = nav.eStart[n]; e < nav.eStart[n + 1]; e++) { const m = nav.eTo[e]; if (!seen[m]) { seen[m] = 1; q.push(m); } } }
console.log('graph flood', q.length, 'of', nav.N);
fs.writeFileSync(new URL('../build/paths/gseen.bin', import.meta.url), seen);
const [x, z, y] = process.argv.slice(2).map(Number);
if (x) {
  const near = nav.nodesNear(x, z, y, 30, 6).slice(0, 12);
  for (const n of near) console.log(seen[n] ? 'IN ' : 'OUT', nav.x[n].toFixed(1), nav.y[n].toFixed(1), nav.z[n].toFixed(1), 'edges', nav.eStart[n + 1] - nav.eStart[n]);
}
