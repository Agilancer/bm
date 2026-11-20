// No boulder lies over a road, path, lane or flight of steps (owner, 2026-11-19): every one is turned along the way and rolled
// off its side (src/core/rocks.js clearOfWays, offWay), none taken away. The sweeps: tools/world/rocks-on-roads.mjs and
// tools/world/placed-rocks-on-roads.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const run = (f) => execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 26 });

test('no scattered boulder lies over a way', () => {
  const out = run('tools/world/rocks-on-roads.mjs');
  const m = out.match(/(\d+) boulders by the ways, \d+ big enough to walk into; (\d+) over a way/);
  assert.ok(m, out);
  assert.equal(+m[2], 0, out);
});

test('no rock a place puts down lies over a way', () => {
  const out = run('tools/world/placed-rocks-on-roads.mjs');
  assert.match(out, / 0 over a way/, out);
});
