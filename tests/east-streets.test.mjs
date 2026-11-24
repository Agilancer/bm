// Auto-play keeps to City State Phobos's streets (src/sim/east-nav.js WAY_COST): its ways between the city's places go down
// the King's Mile and its loops, not through the alleys between the blocks, people's houses or the wall-walk. It used to
// take whatever was shortest: from Chainmarket to the Pennyless' Purse, 360 m of back alleys and not a metre of street.
// The owner: "actually uses streets properly in Phobos". (tools/paths/streets.mjs prints the same, trip by trip.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRIPS, at, share, walk } from '../tools/paths/streets.mjs';

test('the ways about the city keep to its streets', () => {
  let ON = 0, OFF = 0;
  for (const [a, b] of TRIPS) {
    const w = walk(at(a), [b[0], b[1], null]);
    assert.ok(w, `no way from ${a} to ${b}`);
    const { on, off } = share(w.pts);
    ON += on; OFF += off;
    assert.ok(on / (on + off) > 0.8, `${a} to ${b}: only ${(100 * on / (on + off)).toFixed(0)}% of ${Math.round(on + off)} m on the streets`);
  }
  assert.ok(ON / (ON + OFF) > 0.9, `${(100 * ON / (ON + OFF)).toFixed(0)}% on the streets in all`);
});
