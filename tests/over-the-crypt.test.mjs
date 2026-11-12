// The hill east of the cathedral lies over the Bell Crypt and its passages. With your feet on the land you stand on the
// land there (you used to drop through it into the crypt, on the way to the Hill Road); down the stair you stand on the
// crypt's floor; and everything that isn't the player is where it was (src/sim/world.js heightFor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { floorAt } from '../src/core/interior.js';
import { ROUTES } from '../src/core/lands.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const world = new World(read('assets/game/village.json'), interior);

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
