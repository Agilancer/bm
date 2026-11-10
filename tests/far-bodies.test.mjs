// Far bodies on a PC: the coarse mesh by distance, and poses made less often than frames (src/gfx/renderer.js
// bodyDetail, skinEvery, cullBodies). Run with node --test tests/far-bodies.test.mjs. No browser or GPU required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../src/gfx/renderer.js';
import { TIERS } from '../src/gfx/gpu.js';
import { C, C_SIZE, CHARS_START, SNAP_FLOATS } from '../src/core/layout.js';
import { MAX_LIT } from '../src/gfx/shaders.js';

function fixture(tier = TIERS.high, n = 1) {
  // (Every plane lets everything in: all of it's in view.)
  const planes = new Float32Array(20); for (let k = 0; k < 5; k++) planes[k * 4 + 3] = 1;
  return Object.assign(Object.create(Renderer.prototype), {
    tier, planes, hour: 12, folk: null, lodAt: 60, skinSteps: [2, 4],
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
  assert.equal(r.bodyDetail(400, 0), 1);
});

test('a body standing at a line keeps the mesh it has', () => {
  const r = fixture();
  // 60 m is the line: 4% inside it one that's coarse stays coarse, 4% past it one that's whole stays whole.
  assert.equal(r.bodyDetail(58, 1), 1);
  assert.equal(r.bodyDetail(62, 0), 0);
  assert.equal(r.bodyDetail(55, 1), 0);
  assert.equal(r.bodyDetail(65, 0), 1);
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
  assert.equal(r.chars[1].detail, 1);
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

// ---- who's near you: the grass they press, and the dark under them (writeFeet) ----
// (Where they are in the frame's uniforms: after the lights, src/gfx/renderer.js O.)
const O_CHARS = 192, O_FEET = 224 + MAX_LIT * 8, O_FEET_BOX = O_FEET + 48, O_FEET_Y = O_FEET + 52;
function feetFixture(tier, bodies) {
  const snap = new Float32Array(SNAP_FLOATS);
  bodies.forEach((b, i) => { const o = CHARS_START + i * C_SIZE; snap[o + C.ACTIVE] = 1; snap[o + C.X] = b.x; snap[o + C.Y] = b.y || 0; snap[o + C.Z] = b.z || 0; snap[o + C.STATE] = b.dead ? 10 : 0; });
  const r = Object.assign(Object.create(Renderer.prototype), { tier, folk: null, chars: bodies.map((b) => ({ casts: b.casts !== false, bindR: b.bindR })) });
  const d = new Float32Array(O_FEET + 56);
  r.writeFeet(d, snap, cam);
  return d;
}

test('the grass bends for whoever is nearest, not for the first five bodies in the world', () => {
  // (Seven bodies, the first five of them far off.)
  const d = feetFixture(TIERS.high, [{ x: 200 }, { x: 210 }, { x: 220 }, { x: 230 }, { x: 240 }, { x: 4 }, { x: 9 }]);
  assert.equal(d[O_CHARS + 4], 4); assert.ok(d[O_CHARS + 7] >= 0.6);
  assert.equal(d[O_CHARS + 8], 9);
  assert.equal(d[O_CHARS + 15], 0, 'and nobody in the slots left over');
});

test('the dark is under the nearest twelve that stand, where their soles are and as wide as they stand', () => {
  const d = feetFixture(TIERS.high, [{ x: 5, y: 2, z: 1 }, { x: 3, dead: true }, { x: 12, bindR: 8 }, { x: 80 }, { x: 6, casts: false }]);
  assert.equal(d[O_FEET_Y + 3], 2, 'two: not the dead one, nor the one too far off, nor the one not drawn');
  assert.deepEqual([...d.subarray(O_FEET, O_FEET + 3)].map((v) => +v.toFixed(2)), [5, 1, 2]);
  assert.ok(d[O_FEET + 3] > 0.4 && d[O_FEET + 3] < 0.6, 'a person stands about half a metre wide');
  assert.ok(d[O_FEET + 7] > 1.5, 'and something big, wider');
  // The square holds them both, and the heights the ground under them could be at.
  assert.ok(d[O_FEET_BOX] < 5 - 0.4 && d[O_FEET_BOX + 2] > 12 + 1.5);
  assert.ok(d[O_FEET_Y] <= -0.49 && d[O_FEET_Y + 1] >= 2.29);
});

test('with more than twelve near, the dark has faded out by the thirteenth', () => {
  const d = feetFixture(TIERS.high, Array.from({ length: 15 }, (_, i) => ({ x: 2 + i })));
  assert.equal(d[O_FEET_Y + 3], 12);
  assert.equal(d[O_FEET_Y + 2], 14, 'the thirteenth is 14 m off');
});

test('with nobody near there is no square to be in, and a phone has no dark at all', () => {
  const none = feetFixture(TIERS.high, [{ x: 500 }]);
  assert.equal(none[O_FEET_Y + 3], 0);
  assert.ok(none[O_FEET_BOX] > none[O_FEET_BOX + 2]);
  const phone = feetFixture(TIERS.mobile, [{ x: 3 }]);
  assert.equal(phone[O_FEET_Y + 3], 0);
  assert.equal(phone[O_CHARS + 4], 3, 'but its grass still bends');
});
