// Auto-play's sense of the ground out in the land (src/sim/nav.worker.js): the pines and boulders it steps round. The world
// keeps them four numbers each ([x, z, radius, top]: World.trunkCell); read three at a time, every second "trunk" was made of
// the wrong numbers, and wherever z ran high the whole wood came out solid: no way to back off, no room to ride, no path
// across country. Checked here against the trunks themselves.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { navFor } from '../src/sim/nav.worker.js';
import { terrainHeight } from '../src/core/terrain.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const nav = navFor(world);
const CELL = 16;
// Every trunk and boulder within a cell of a point, as the world has them.
function trunksNear(x, z) {
  const out = [], ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
    const l = world.trunkCell(i, j);
    if (l) for (let k = 0; k < l.length; k += 4) out.push([l[k], l[k + 1], l[k + 2], l[k + 3]]);
  }
  return out;
}

// The woods north and south of the town, east and west: all four quarters, since the old fault showed only where z ran high.
const SPOTS = [[-45, 150], [60, 120], [-110, 110], [20, -125], [100, -128], [-160, 60], [170, 40], [-120, -60]];

test('open ground among the pines is open, and a trunk is solid', () => {
  let open = 0, solid = 0;
  for (const [sx, sz] of SPOTS) {
    for (let k = 0; k < 60; k++) {
      const x = sx + ((k * 37) % 23) - 11, z = sz + ((k * 53) % 19) - 9, y = terrainHeight(x, z) + 0.2;
      const near = trunksNear(x, z);
      const gap = Math.min(...near.map(([tx, tz, r, top]) => (y <= top ? Math.hypot(x - tx, z - tz) - r : Infinity)), Infinity);
      if (world.inside(x, z, 1.5) && gap > 1.5) continue;   // (a wall or a place's box: not this test's)
      if (gap > 0.6) { assert.equal(nav.solidAt(x, z, 0.45, y), false, `open ground at ${x}, ${z} (${gap.toFixed(1)} m from the nearest trunk) read as solid`); open++; }
    }
    for (const [tx, tz, r, top] of trunksNear(sx, sz).slice(0, 12)) {
      if (terrainHeight(tx, tz) + 0.2 > top) continue;
      assert.equal(nav.solidAt(tx, tz, 0.45, terrainHeight(tx, tz) + 0.2), true, `the trunk at ${tx.toFixed(1)}, ${tz.toFixed(1)} read as open`);
      solid++;
    }
  }
  assert.ok(open > 150, `only ${open} open spots tried`);
  assert.ok(solid > 30, `only ${solid} trunks tried`);
});

test('there is a way to step, wherever it stands in the woods', () => {
  let ways = 0, tried = 0;
  for (const [sx, sz] of SPOTS) {
    for (let k = 0; k < 12; k++) {
      const x = sx + k * 1.7 - 9, z = sz + ((k * 5) % 7) - 3, y = terrainHeight(x, z) + 0.2;
      if (nav.solidAt(x, z, 0.45, y)) continue;
      tried++;
      const r = nav.probe(x, z, y, 1, 0, 6);
      assert.ok(r, 'a way is named');
      if (r[2] >= 6) ways++;
    }
  }
  assert.ok(tried > 40, `only ${tried} places tried`);
  assert.ok(ways >= tried * 0.9, `a clear six metres from only ${ways} of ${tried} places`);
});
