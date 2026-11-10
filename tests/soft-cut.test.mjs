// Leaves and needles in a multisampled frame: their cut-out by the sample (src/gfx/materials.js cutMaskWGSL,
// staticSoftCut; src/gfx/pines.js softDepth). Run with node --test tests/soft-cut.test.mjs. No browser or GPU required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIC, cutMaskWGSL, staticSoftCut } from '../src/gfx/materials.js';
import { PINE, softDepth } from '../src/gfx/pines.js';

// cutMask, as the shader has it.
function cutMask(a, cut, slope, samples) {
  const cov = Math.min(1, Math.max(0, (a - cut) / Math.max(slope, 0.0005) + 0.5));
  const n = Math.floor(cov * samples + 0.5);
  return (1 << n) - 1;
}
const bits = (m) => m.toString(2).split('').filter((b) => b === '1').length;

test('the shader text is the function tested here', () => {
  const w = cutMaskWGSL(4);
  assert.match(w, /clamp\(\(a - cut\) \/ max\(slope, 0\.0005\) \+ 0\.5, 0\.0, 1\.0\)/);
  assert.match(w, /u32\(cov \* 4\.0 \+ 0\.5\)/);
  assert.match(w, /\(1u << n\) - 1u/);
});

test('with one sample it is the old test: in at the cut and over, out under it', () => {
  for (const slope of [0, 0.01, 0.2, 1]) {
    for (let a = 0; a <= 1.0001; a += 0.01) assert.equal(cutMask(a, 0.5, slope, 1), a >= 0.5 - 1e-9 ? 1 : 0, `a ${a} slope ${slope}`);
  }
});

test('with four, an edge takes a share of the pixel: none well under the cut, all well over, half at it', () => {
  assert.equal(bits(cutMask(0.2, 0.5, 0.2, 4)), 0);
  assert.equal(bits(cutMask(0.8, 0.5, 0.2, 4)), 4);
  assert.equal(bits(cutMask(0.5, 0.5, 0.2, 4)), 2);
  // (And more of it the further past the cut, never less.)
  let last = 0;
  for (let a = 0; a <= 1; a += 0.005) { const n = bits(cutMask(a, 0.5, 0.2, 4)); assert.ok(n >= last); last = n; }
  // (Where the alpha doesn't change across the pixel there's no edge in it: all or nothing, as before.)
  assert.equal(bits(cutMask(0.51, 0.5, 0, 4)), 4);
  assert.equal(bits(cutMask(0.49, 0.5, 0, 4)), 0);
});

test('the samples covered are the lowest, so a mask is never one the frame has no samples for', () => {
  for (let a = 0; a <= 1; a += 0.01) assert.ok(cutMask(a, 0.5, 0.3, 4) <= 0b1111);
});

test("the town's leaves: STATIC with three swaps and nothing else", () => {
  const soft = staticSoftCut(4);
  assert.ok(!soft.includes('if (params.x > 0.0 && tex.a < 0.5) { discard; }'));
  assert.ok(soft.includes('o.mask = cutMask(tex.a, 0.5,'));
  assert.ok(soft.includes('@builtin(sample_mask) mask: u32'));
  // Every other line is STATIC's own.
  const mine = new Set(STATIC.split('\n'));
  const added = soft.split('\n').filter((l) => !mine.has(l));
  assert.ok(added.length < 22, `${added.length} lines differ`);
  assert.ok(STATIC.includes('if (params.x > 0.0 && tex.a < 0.5) { discard; }'), 'STATIC itself keeps the hard cut');
});

test("the pines' depth pass: only fsDepth changes", () => {
  const soft = softDepth(PINE, 4);
  assert.ok(soft.includes('fn fsDepth(in: V) -> @builtin(sample_mask) u32'));
  assert.ok(soft.includes('fwidth(a)'));
  const mine = new Set(PINE.split('\n'));
  const added = soft.split('\n').filter((l) => !mine.has(l));
  assert.ok(added.length < 12, `${added.length} lines differ`);
  assert.ok(PINE.includes('@fragment fn fsDepth(in: V) {'), 'PINE itself keeps the hard cut');
});
