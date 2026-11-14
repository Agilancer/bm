// The hill east of the cathedral lies over the Bell Crypt and its passages. With your feet on the land you stand on the
// land there (you used to drop through it into the crypt, on the way to the Hill Road); down the stair you stand on the
// crypt's floor; and everything that isn't the player is where it was (src/sim/world.js heightFor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { navFor } from '../src/sim/nav.worker.js';
import { floorAt } from '../src/core/interior.js';
import { ROUTES } from '../src/core/lands.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const world = new World(read('assets/game/village.json'), interior);
const nav = navFor(world, interior);

test('over the catacombs the land holds you, and under it the floor does', () => {
  let over = 0;
  for (const f of interior.floors) {
    if (f.pit) continue;
    const x = (f.x0 + f.x1) / 2, z = (f.z0 + f.z1) / 2, floor = floorAt(x, z), land = world.landAt(x, z);
    if (floor === null || land - floor < 6) continue;
    over++;
    assert.equal(world.heightFor(x, z, land), land, `on the land at ${x}, ${z}`);
    assert.equal(world.heightFor(x, z, land + 3), land, `in the air over ${x}, ${z}`);
    assert.equal(world.heightFor(x, z, floor), floor, `on the floor under ${x}, ${z}`);
    assert.equal(world.heightFor(x, z, floor + 2), floor, `jumping on the floor under ${x}, ${z}`);
    assert.equal(world.height(x, z), floor);
  }
  assert.ok(over > 10, `${over} floors under the land`);
});

test('the nave, the houses and the open land are as they were', () => {
  for (const [x, z] of [[170, 0], [200, 5], [0, 0], [38, -37], [-45, 150], [600, 40]]) {
    const h = world.height(x, z);
    for (const y of [h, h + 1, h + 4]) assert.equal(world.heightFor(x, z, h), h, `${x}, ${z} at ${y}`);
  }
});

test('the way from the town to the Hill Road crosses ground that used to drop you', () => {
  const start = ROUTES.find((r) => r.name === 'the Hill Road').pts[0];
  let under = 0;
  for (let x = 150; x <= start[0]; x += 2) { const z = start[1] * (x - 150) / (start[0] - 150), f = floorAt(x, z), land = world.landAt(x, z); if (f !== null && land - f > 6) { under++; assert.equal(world.heightFor(x, z, land), land); } }
  assert.ok(under > 0);
});

// The catacombs' walls are forty metres tall, so they stood up through the hill east of the cathedral where nobody could
// see them: walking over it you ran into the Reliquary's walls, and auto-play, on its way east to the Bell Tower, paced
// to and fro on the hill for as long as it was watched (its paths across country found no way, its probe turned it aside).
test('on the hill over the catacombs nothing buried under it is in the way', () => {
  const under = world.colliders.filter((c) => c.under);
  assert.ok(under.length > 100, `${under.length} boxes marked as under the land`);
  let crossed = 0;
  // (The pines and boulders on the hill are in the way, as they should be: left out, to ask only about what's buried.)
  const trunkCell = world.trunkCell;
  world.trunkCell = () => null;
  for (const [ax, az, bx, bz] of [[244, -14, 300, 10], [250, 20, 330, -60], [262, -90, 345, -90], [300, 30, 270, -160]]) {
    const L = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s <= L; s += 0.5) {
      const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L, land = world.landAt(x, z), f = floorAt(x, z);
      if (f === null || land - f < 6) continue;
      const out = new Float32Array([x, 0, z]);
      world.resolve(out, 0.4, land);
      assert.ok(Math.hypot(out[0] - x, out[2] - z) < 1e-3, `pushed ${Math.hypot(out[0] - x, out[2] - z).toFixed(2)} m at ${x.toFixed(1)}, ${z.toFixed(1)} on the land`);
      assert.ok(!nav.solidAt(x, z, 0.42, land + 0.25), `the nav thread calls ${x.toFixed(1)}, ${z.toFixed(1)} solid on the land`);
      crossed++;
    }
  }
  world.trunkCell = trunkCell;
  assert.ok(crossed > 100, `${crossed} places over the catacombs crossed`);
  const way = nav.local([268.9, -11.6], [300, 10]);
  assert.ok(way?.length, 'a way across country over the Reliquary');
  assert.ok(world.sees(250, world.landAt(250, -10) + 1.6, -10, 262, world.landAt(262, -10) + 1.6, -10), 'a clean line along the hillside');
});

test('down in the catacombs their walls are walls still', () => {
  let held = 0;
  for (const c of world.colliders) {
    if (!c.under || c.h < 30 || c.b || c.t !== undefined) continue;
    const f = floorAt(c.x, c.z);
    if (f === null || world.landAt(c.x, c.z) - f < 6) continue;
    const out = new Float32Array([c.x, 0, c.z]);
    assert.ok(world.resolve(out, 0.4, f), `nothing stops you in the wall at ${c.x}, ${c.z}`);
    assert.ok(nav.solidAt(c.x, c.z, 0.42, f + 0.25));
    held++;
  }
  assert.ok(held > 30, `${held} walls tried`);
});
