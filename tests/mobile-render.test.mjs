// Run with node --test tests/*.test.mjs. No browser or GPU required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../src/gfx/renderer.js';
import { TIERS } from '../src/gfx/gpu.js';
import { C, C_PALETTE, CHARS_START, SNAP_FLOATS } from '../src/core/layout.js';

// Exercise the real frame entry and first character upload. Stop there so this
// regression can run without a GPU, shaders or the rest of the world assets.
function rendererFixture() {
  const stop = new Error('first upload complete');
  const uploads = [];
  const renderer = Object.assign(Object.create(Renderer.prototype), {
    tier: TIERS.mobile,
    device: { queue: { writeBuffer(target, offset, source, dataOffset, size) {
      // Models a browser binding that refuses worker-owned shared memory.
      if (source instanceof SharedArrayBuffer || source.buffer instanceof SharedArrayBuffer) {
        throw new TypeError('SharedArrayBuffer is not allowed');
      }
      uploads.push({ source, values: Array.from(new Float32Array(source, dataOffset, size / 4)) });
      throw stop;
    } } },
    chars: [{ casts: true, jointCount: 1, palette: {} }],
    resize() {}, writeFrame() {}, cullBodies() {}, frameData: new Float32Array(444),
  });
  return { renderer, uploads, stop };
}
function draw(f, snap) {
  assert.throws(() => f.renderer.frame({}, snap, null, 1 / 60), e => e === f.stop);
}
function snapshot(shared) {
  // Shared snapshots are views into a larger allocation, not zero-offset buffers.
  const buffer = shared ? new SharedArrayBuffer((SNAP_FLOATS + 16) * 4) : new ArrayBuffer((SNAP_FLOATS + 16) * 4);
  const snap = new Float32Array(buffer, 64, SNAP_FLOATS);
  snap[CHARS_START + C.ACTIVE] = 1;
  snap.set([0, 0, 0, 1, 2, 3, 4, 5], CHARS_START + C_PALETTE);
  return snap;
}

test('shared worker snapshot reaches GPU upload through ordinary local memory', () => {
  const f = rendererFixture(), snap = snapshot(true);
  draw(f, snap);
  assert.ok(f.uploads[0].source instanceof ArrayBuffer);
  assert.notEqual(f.uploads[0].source, snap.buffer);
  assert.deepEqual(f.uploads[0].values, [0, 0, 0, 1, 2, 3, 4, 5]);
  // Later simulation writes cannot mutate a frame's staged pose.
  snap[CHARS_START + C_PALETTE] = 42;
  assert.equal(f.renderer.uploadSnap[CHARS_START + C_PALETTE], 0);
});

test('next frame refreshes the pose and reuses its upload allocation', () => {
  const f = rendererFixture(), snap = snapshot(true);
  draw(f, snap);
  const staging = f.renderer.uploadSnap;
  snap[CHARS_START + C_PALETTE] = 42;
  draw(f, snap);
  assert.equal(f.renderer.uploadSnap, staging);
  assert.equal(f.uploads[1].values[0], 42);
});

test('non-shared fallback keeps its original buffer and view offset', () => {
  const f = rendererFixture(), snap = snapshot(false);
  draw(f, snap);
  assert.equal(f.uploads[0].source, snap.buffer);
  assert.equal(f.renderer.uploadSnap, undefined);
  assert.deepEqual(f.uploads[0].values, [0, 0, 0, 1, 2, 3, 4, 5]);
});

test('mobile starts with one sample, avoiding the warmup GPU-resource rebuild', () => {
  assert.equal(TIERS.mobile.msaa, 1);
  assert.equal(TIERS.high.msaa, 4);
  assert.equal(TIERS.ultra.msaa, 4);
});
