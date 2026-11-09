// How many of each thing src/core/rocks.js lays round a few places, and how long it takes: node tools/world/count.mjs
import { rocksAround, ROCK_FLOATS, ROCK_VARIANTS, LOG, STUMP, REED, FERN, TUFT, PUDDLE } from '../../src/core/rocks.js';

const PLACES = { hill_road: [420, 30], darkwood: [-140, 170], rimeholt: [860, 3600], ashen: [-3500, -620], sorrowhorn: [-2300, -2180], fen: [-100, -3050], downs: [1600, 120], barrow: [-2400, 2900], deepwood: [-1300, -1100] };
const name = (v) => (v < ROCK_VARIANTS ? 'rock' : LOG.includes(v) ? 'log' : STUMP.includes(v) ? 'stump' : REED.includes(v) ? 'reed' : v === FERN ? 'fern' : v === TUFT ? 'tuft' : v === PUDDLE ? 'puddle' : '?');
for (const [k, [x, z]] of Object.entries(PLACES)) {
  const t = performance.now();
  const { stones, boulders } = rocksAround(x, z);
  const ms = performance.now() - t;
  const n = {};
  for (let o = 0; o < stones.length; o += ROCK_FLOATS) { const w = stones[o + 3] < 0.13 && stones[o + 8] < ROCK_VARIANTS ? 'gravel' : name(stones[o + 8]); n[w] = (n[w] || 0) + 1; }
  let great = 0;
  for (let o = 0; o < boulders.length; o += ROCK_FLOATS) if (boulders[o + 3] > 2.9) great++;
  console.log(k.padEnd(11), `${ms.toFixed(0)} ms`, `boulders ${boulders.length / ROCK_FLOATS} (great ${great})`, JSON.stringify(n));
}
