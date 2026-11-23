// Auto-play's way, met where it stands now (src/ui/autobrain.js onWay): a way asked for from where it was, answered after it
// had walked on, used to send it back to the way's first points, a turn about and back every few seconds (the owner,
// 2026-11-21: "swing back and forth motions ... especially in phobos"). What's behind it is dropped; well off the line, it
// makes for a point a stride on along it; and never on past a doorway's point it hasn't stood on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onWay, planWay } from '../src/ui/autobrain.js';

test('the points behind it are dropped', () => {
  const P = [[0, 0], [10, 0], [20, 0]];
  assert.deepEqual(onWay({ x: 3, z: 0.2 }, P), [[10, 0], [20, 0]]);
});
test('well off the line, a point a stride on along it first', () => {
  const P = onWay({ x: 3, z: 1.5 }, [[0, 0], [10, 0], [20, 0]]);
  assert.equal(P.length, 3);
  assert.ok(Math.abs(P[0][0] - 4.5) < 1e-9 && P[0][1] === 0);
});
test('behind the way, or far from it, the way is left as it is', () => {
  assert.equal(onWay({ x: -2, z: 0 }, [[0, 0], [10, 0]]).length, 2);
  assert.equal(onWay({ x: 5, z: 8 }, [[0, 0], [10, 0], [20, 0]]).length, 3);
});
test('never on past a doorway it has not stood in', () => {
  // [x, z, kind, door]: the second point is a doorway's; standing past it, beside the line, it still walks to the door first.
  const P = onWay({ x: 12, z: 0.3 }, [[0, 0, 0, -1], [10, 0, 0, 4], [20, 0, 0, -1]]);
  assert.deepEqual(P[0].slice(0, 2), [10, 0]);
});
test('a stretch on another floor is not taken for the one it is on', () => {
  const P = [[0, 0, 0, -1, 0], [10, 0, 0, -1, 0], [10, 0, 0, -1, 6], [0, 0.1, 0, -1, 6], [-10, 0.1, 0, -1, 6]];
  const out = onWay({ x: 3, y: 0, z: 0.05 }, P.map((p) => p.slice()), (p) => p[4]);
  assert.equal(out[0][4], 0);
  assert.equal(out.length, 4);
});

// From the Gibbet Field back to Wenna on the Sill it went down to the Drawbridge Gate's road and back up the Throne Road,
// twice as far (planWay took every way in or out of the east's box by the gate road). Out on the plain before the wall, the
// land's own way; into the city, still by the gate.
test('between the Sill and the plain before the wall: not by the gate road', () => {
  const near = (w, x, z, r) => w.some((p) => Math.hypot(p.x - x, p.z - z) < r);
  assert.ok(!near(planWay({ x: 9146, z: 193 }, { x: 8948, z: 6 }), 9240, 0, 15));
  assert.ok(near(planWay({ x: 8948, z: 6 }, { x: 9800, z: -90 }), 9240, 0, 1));
});
