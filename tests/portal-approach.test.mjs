// A dungeon's portal out in the land stands on a low terrace with a step up to it. The nav thread's short paths across
// country (src/sim/nav.worker.js local) and its probe have to end on that terrace and go up its step: they took the
// terrace's base for a wall (their own sum of a box's top, where topOf knows a base is stood on), so auto-play came to
// Blackvigil's portal and the Howling Mouth's and paced before them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { navFor } from '../src/sim/nav.worker.js';
import { DELVES } from '../src/core/dungeon.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const world = new World(read('assets/game/village.json'), interior);
const nav = navFor(world, interior);

for (const d of DELVES) {
  const p = d.portal;
  if (Math.abs(p.x) < 240 && Math.abs(p.z) < 240) continue;   // (the Warrens' is on the town's own grid)
  test(`a path across country ends before ${d.name}'s portal, from in front of it`, () => {
    // Twenty metres out the way it faces, and a little to each side.
    for (const side of [-6, 0, 6]) {
      const from = [p.x + Math.sin(p.yaw) * 20 + Math.cos(p.yaw) * side, p.z + Math.cos(p.yaw) * 20 - Math.sin(p.yaw) * side];
      const pts = nav.local(from, [p.x, p.z]);
      assert.ok(pts?.length, `no way from ${from.map((v) => v.toFixed(0))}`);
      const e = pts.at(-1);
      assert.ok(Math.hypot(e[0] - p.x, e[1] - p.z) < 1.5, `ends ${Math.hypot(e[0] - p.x, e[1] - p.z).toFixed(1)} m short`);
    }
    assert.ok(world.platformAt(p.x, p.z) !== null, 'the portal stands on its terrace');
  });
  test(`the probe sees the way up to ${d.name}'s portal as clear`, () => {
    const x = p.x + Math.sin(p.yaw) * 6, z = p.z + Math.cos(p.yaw) * 6;
    const c = nav.probe(x, z, world.height(x, z) + 0.2, -Math.sin(p.yaw), -Math.cos(p.yaw), 5);
    assert.ok(c && Math.hypot(c[0] + Math.sin(p.yaw), c[1] + Math.cos(p.yaw)) < 0.3, `it turns aside: ${c}`);
  });
}

test('a terrace is still not walked up where it has no step', () => {
  // Round the back of Blackvigil's portal: the wall behind it stays a wall.
  const p = DELVES.find((d) => d.key === 'blackvigil').portal;
  const bx = p.x - Math.sin(p.yaw) * 3.5, bz = p.z - Math.cos(p.yaw) * 3.5;
  assert.ok(nav.solidAt(bx, bz, 0.42, world.height(bx, bz) + 0.25));
});
