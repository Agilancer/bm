// Far bodies on a PC: the coarser meshes by distance, and poses made less often than frames (src/gfx/renderer.js
// bodyDetail, skinEvery, cullBodies). Run with node --test tests/far-bodies.test.mjs. No browser or GPU required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../src/gfx/renderer.js';
import { TIERS } from '../src/gfx/gpu.js';
import { C, C_SIZE, CHARS_START, SNAP_FLOATS } from '../src/core/layout.js';

function fixture(tier = TIERS.high, n = 1) {
  // (Every plane lets everything in: all of it's in view.)
  const planes = new Float32Array(20); for (let k = 0; k < 5; k++) planes[k * 4 + 3] = 1;
  return Object.assign(Object.create(Renderer.prototype), {
    tier, planes, hour: 12, folk: null, lodAt: [60, 150], skinSteps: [2, 4],
    chars: Array.from({ length: n }, () => ({})),
  });
}
function snapWith(...xs) {
  const snap = new Float32Array(SNAP_FLOATS);
  xs.forEach((x, i) => { const o = CHARS_START + i * C_SIZE; snap[o + C.ACTIVE] = x === null ? 0 : 1; snap[o + C.X] = x || 0; });
  return snap;
}
const cam = { x: 0, y: 1.6, z: 0 };

test('a PC draws a far body with a coarser mesh, and a nearer one whole', () => {
  const r = fixture();
  assert.equal(r.bodyDetail(10, 0), 0);
  assert.equal(r.bodyDetail(100, 0), 1);
  assert.equal(r.bodyDetail(400, 0), 2);
});

test('a body standing at a line keeps the mesh it has', () => {
  const r = fixture();
  // 60 m is the line: 4% inside it one that's coarse stays coarse, 4% past it one that's whole stays whole.
  assert.equal(r.bodyDetail(58, 1), 1);
  assert.equal(r.bodyDetail(62, 0), 0);
  assert.equal(r.bodyDetail(55, 1), 0);
  assert.equal(r.bodyDetail(65, 0), 1);
  assert.equal(r.bodyDetail(146, 2), 2);
  assert.equal(r.bodyDetail(154, 1), 1);
});

test("a phone keeps its own rule, and the switch for comparing turns the PC's off", () => {
  assert.equal(fixture(TIERS.mobile).bodyDetail(400, 0), 0);
  const r = fixture(); r.fullDetail = true;
  assert.equal(r.bodyDetail(400, 0), 0);
  assert.equal(r.skinEvery(400), 1);
});

test('poses are made every frame close by, and less often far off', () => {
  const r = fixture();
  assert.equal(r.skinEvery(10), 1);
  assert.equal(r.skinEvery(60), 2);
  assert.equal(r.skinEvery(200), 4);
});

test('a far body is posed the frame it comes into view, then every few frames, and a near one every frame', () => {
  const r = fixture(TIERS.high, 2), snap = snapWith(5, 200);
  const posed = [[], []];
  for (let f = 0; f < 12; f++) { r.cullBodies(cam, snap); r.chars.forEach((c, i) => posed[i].push(c.skin ? 1 : 0)); }
  assert.deepEqual(posed[0], Array(12).fill(1));
  assert.equal(posed[1][0], 1, 'posed the first frame it casts');
  assert.equal(posed[1].slice(1).reduce((a, b) => a + b), 3, 'then one frame in four');
  assert.ok(r.chars[1].casts && r.chars[1].seen, 'drawn every frame all the same');
  assert.equal(r.chars[1].detail, 2);
  assert.equal(r.chars[0].detail, 0);
});

test('a body that left is posed again the frame it is back', () => {
  const r = fixture(TIERS.high, 1);
  r.cullBodies(cam, snapWith(200));
  for (let f = 0; f < 3; f++) r.cullBodies(cam, snapWith(null));
  assert.equal(r.chars[0].skin, false);
  // (Whatever frame it comes back on.)
  for (let f = 0; f < 4; f++) {
    const q = fixture(TIERS.high, 1); q.skinFrame = f;
    q.cullBodies(cam, snapWith(200)); q.cullBodies(cam, snapWith(null)); q.cullBodies(cam, snapWith(200));
    assert.equal(q.chars[0].skin, true);
  }
});

test('bodies the same distance off are posed on different frames, so no frame takes them all', () => {
  const r = fixture(TIERS.high, 8), snap = snapWith(...Array(8).fill(200));
  r.cullBodies(cam, snap);                       // (the first frame poses everyone: they've all just come into view)
  const perFrame = [];
  for (let f = 0; f < 8; f++) { r.cullBodies(cam, snap); perFrame.push(r.chars.filter((c) => c.skin).length); }
  assert.deepEqual(perFrame, Array(8).fill(2));
});
