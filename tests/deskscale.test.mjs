// The PC's dynamic resolution (src/gfx/deskscale.js): it holds the refresh rate, and it comes back up when it can.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, deskStep } from '../src/gfx/deskscale.js';

const HZ144 = 1000 / 144;

// Runs windows of frames through it. cost(scale) is the GPU's time per frame at that resolution.
function run(cost, windows, { step = 0, frameMs = HZ144, effects = 0 } = {}) {
  const st = {}, seen = [];
  let demoted = 0;
  const demote = () => (demoted < effects ? (demoted++, true) : false);
  for (let i = 0; i < windows; i++) {
    const c = typeof cost === 'function' ? cost(STEPS[step], i) : cost;
    step = deskStep(st, c, frameMs, step, demote);
    seen.push(STEPS[step]);
  }
  return { step, scale: STEPS[step], seen, demoted };
}

// A frame where part of the cost stays put (shadows, the sky) and part grows with the pixels.
const frame = (fixed, perPixel) => (s) => fixed + perPixel * s * s;

test('one slow window (a load, a teleport) does not lower the resolution', () => {
  const r = run((s, i) => (i === 3 ? 12 : 4), 12);
  assert.ok(r.seen.every((s) => s === 1), r.seen.join(' '));
});

test('a frame that stays too slow steps down, a step at a time, and stops at 0.76 on a fast screen', () => {
  const r = run(frame(1.5, 7), 20);
  assert.equal(r.seen[0], 1);
  assert.equal(r.seen[1], 0.88);
  assert.ok(r.scale >= 0.76, `fell to ${r.scale}`);
  assert.equal(r.demoted, 0);
});

test('started low (after the load), it climbs back to full resolution when the full frame fits', () => {
  // The opening cave: 3.9 ms at 0.76 used to be just over the old "roomy" line (55% of 6.94 ms), so it never came back.
  const r = run(frame(1.2, 4.2), 12, { step: 2 });
  assert.equal(r.scale, 1, r.seen.join(' '));
});

test('it never climbs into a size it then has to leave (no flapping)', () => {
  for (const [fixed, per] of [[1, 5.5], [2, 4.4], [0.5, 6.5], [3, 3.5], [1.5, 5]]) {
    const r = run(frame(fixed, per), 60, { step: 2 });
    let changes = 0;
    for (let i = 1; i < r.seen.length; i++) if (r.seen[i] !== r.seen[i - 1]) changes++;
    const ups = r.seen.filter((s, i) => i && s > r.seen[i - 1]).length, downs = changes - ups;
    assert.ok(!(ups && downs), `fixed ${fixed} per ${per}: ${r.seen.join(' ')}`);
    assert.ok(frame(fixed, per)(r.scale) <= HZ144 * 0.92, `fixed ${fixed} per ${per} settled too slow at ${r.scale}`);
  }
});

test('effects go only when even 60 fps is out of reach, and only after the resolution has gone down first', () => {
  const r = run(18, 12, { frameMs: 20, effects: 5 });
  assert.ok(r.demoted > 0);
  assert.ok(r.seen.indexOf(0.76) < r.seen.length - 1);
  const hi = run(frame(1.5, 7), 30, { effects: 5 });
  assert.equal(hi.demoted, 0, 'a 144 Hz screen it can only nearly hold costs resolution, never effects');
});

test('on a 60 Hz screen a frame well under 16.7 ms stays at full resolution', () => {
  const r = run(frame(2, 9), 20, { frameMs: 1000 / 60 });
  assert.ok(r.seen.every((s) => s === 1));
});
