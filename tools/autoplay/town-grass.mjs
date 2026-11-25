// How much of auto-play's walking in Bellmourn, as tools/autoplay/trace.mjs recorded it, was over the grass rather than on the
// town's streets, lanes, door paths and square (src/sim/nav.worker.js wornAt), and where, and at what.
//   node tools/autoplay/town-grass.mjs <samples.json> ...
import { readFileSync } from 'node:fs';
import { World } from '../../src/sim/world.js';
import { navFor } from '../../src/sim/nav.worker.js';
import { floorAt } from '../../src/core/interior.js';
import { TOWN } from '../../src/core/town.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const nav = navFor(new World(read('assets/game/village.json'), interior), interior);
const inTownish = (x, z) => x > TOWN.x0 - 10 && x < TOWN.x1 + 10 && z > TOWN.z0 - 10 && z < TOWN.z1 + 10;
const FIGHT = /foe|Fight|Backing|shield|risen|champion|the dead|Taking|line to|tank|Riding|Running|Kiting|Picking|knight/i;
export function townGrass(S) {
  let way = 0, grass = 0;
  const at = new Map();
  for (let i = 1; i < S.length; i++) {
    const a = S[i - 1], b = S[i], L = Math.hypot(b[1] - a[1], b[3] - a[3]);
    if (L < 0.05 || L > 4 || !inTownish(b[1], b[3]) || b[2] < -3 || FIGHT.test(b[5])) continue;
    const x = (a[1] + b[1]) / 2, z = (a[3] + b[3]) / 2;
    if (floorAt(x, z) !== null) continue;
    if (nav.wornAt(x, z) < 0.33) { grass += L; const k = `${Math.round(x / 5) * 5},${Math.round(z / 5) * 5} ${b[4]}`; at.set(k, (at.get(k) || 0) + L); } else way += L;
  }
  return { way, grass, at };
}
if (process.argv[1]?.endsWith('town-grass.mjs')) {
  for (const f of process.argv.slice(2)) {
    const { way, grass, at } = townGrass(JSON.parse(readFileSync(f, 'utf8')));
    console.log(`${f.split('/').pop()}: ${Math.round(way)} m on the town's ways, ${Math.round(grass)} m on grass (${(100 * grass / (way + grass || 1)).toFixed(0)}%)`);
    for (const [k, v] of [...at].sort((p, q) => q[1] - p[1]).slice(0, 10)) console.log(`  ${v.toFixed(0)} m  ${k}`);
  }
}
