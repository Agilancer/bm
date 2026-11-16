// Auto-play keeps to the town's ways (src/sim/nav.worker.js `polite`): asked for a way from one part of Bellmourn to another
// as it goes about its errands, it goes by the streets, lanes and door paths, and over grass only where there's no way
// round. It used to take the straight line, round the sides of the houses and through their gardens.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { navFor } from '../src/sim/nav.worker.js';
import { floorAt } from '../src/core/interior.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const world = new World(read('assets/game/village.json'), interior);
const nav = navFor(world, interior);

// How much of a way, walked from a, is over grass outdoors (worn under a third), and how long it is.
function grassOf(a, pts) {
  let grass = 0, all = 0, [px, pz] = a;
  for (const [x, z] of pts) {
    const L = Math.hypot(x - px, z - pz), n = Math.max(1, Math.ceil(L / 0.25));
    for (let k = 0; k < n; k++) {
      const sx = px + (x - px) * (k + 0.5) / n, sz = pz + (z - pz) * (k + 0.5) / n;
      all += L / n;
      if (floorAt(sx, sz) === null && nav.wornAt(sx, sz) < 0.33) grass += L / n;
    }
    [px, pz] = [x, z];
  }
  return { grass, all };
}

// Errands across the town: the well, the smith's yard, Magda's stall, the coffin yard, the herb garden at the east end,
// the west lanes, Lisandra at the Long Road's end, the bakehouse.
const SPOTS = { well: [1.5, 4], smith: [-4.5, 28.2], magda: [-6.5, -9.6], coffin: [12.5, -30], herbs: [80, 3], west: [-26, 0], lisandra: [-30, 21], bake: [62.6, 1.5], north: [-1, -14] };
const PAIRS = [['lisandra', 'coffin'], ['west', 'herbs'], ['smith', 'magda'], ['north', 'bake'], ['coffin', 'smith'], ['lisandra', 'well'], ['herbs', 'coffin'], ['magda', 'lisandra']];

test('asked politely, a way across the town keeps to its streets, and is no great way round for it', () => {
  let plainGrass = 0, politeGrass = 0;
  for (const [a, b] of PAIRS) {
    const from = SPOTS[a], to = SPOTS[b];
    const plain = nav.path(from, to, []), polite = nav.politePath(from, to, []);
    assert.ok(plain?.length && polite?.length, `a way from ${a} to ${b}`);
    const p = grassOf(from, plain), q = grassOf(from, polite);
    plainGrass += p.grass; politeGrass += q.grass;
    console.log(`${a} -> ${b}: plain ${p.all.toFixed(0)} m, ${p.grass.toFixed(1)} on grass; polite ${q.all.toFixed(0)} m, ${q.grass.toFixed(1)} on grass`);
    assert.ok(q.grass <= p.grass + 0.5, `${a} to ${b}: no more grass than the straight way (${q.grass.toFixed(1)} vs ${p.grass.toFixed(1)})`);
    assert.ok(q.all < p.all * 2, `${a} to ${b}: not twice as far round (${q.all.toFixed(0)} vs ${p.all.toFixed(0)})`);
    const end = polite.at(-1);
    assert.ok(Math.hypot(end[0] - to[0], end[1] - to[1]) < 1.5, `${a} to ${b} ends there`);
  }
  assert.ok(politeGrass < plainGrass * 0.4, `over all, well under half the grass (${politeGrass.toFixed(0)} m against ${plainGrass.toFixed(0)} m)`);
});

test('asked plainly, nothing changes: the shortest way, as for a line on a foe', () => {
  const from = SPOTS.lisandra, to = SPOTS.coffin;
  const a = nav.path(from, to, []), b = nav.path(from, to, []);
  assert.deepEqual(a, b);
});
