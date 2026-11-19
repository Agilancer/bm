// Run with node --test tests/*.test.mjs. No browser required.
// The opening's words (src/core/opening-cave.js, src/core/opening-script.js; docs/OPENING-SCRIPT.md): every line stays up
// long enough to read and isn't cut off by the next; the cave gets to your first cast and to the name prompt in good time;
// and no line names both sides.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST_AT, NAME_AT, OPENING, SWAP_AT } from '../src/core/opening.js';
import { FALL, HERD, READ_CPS, readSecs } from '../src/core/opening-cave.js';
import { CUES, SCRIPT } from '../src/core/opening-script.js';

test('every line in the cave, at the name and on the ledge is up long enough to read, and the next waits for it', () => {
  for (const stage of [OPENING.WAKE, OPENING.HERD, OPENING.COLLAPSE]) {
    const lines = SCRIPT[stage];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], read = l.text.length / READ_CPS;
      if (l.text === '{name}.') continue;
      assert.ok(l.dur >= read, `"${l.text}" is up ${l.dur.toFixed(1)} s, takes ${read.toFixed(1)} to read`);
      const next = lines[i + 1];
      if (next) assert.ok(next.at - l.at >= read + 0.3, `"${next.text}" comes ${(next.at - l.at).toFixed(1)} s after "${l.text}", which takes ${read.toFixed(1)} to read`);
    }
  }
});

test('every line on the way down stays up long enough to read', () => {
  for (const [id, l] of Object.entries(CUES)) if (!l.caption) assert.ok(l.dur >= l.text.length / READ_CPS, `${id}: ${l.dur} s for "${l.text}"`);
  assert.ok(readSecs('x'.repeat(30)) > 2);
});

test('the cave gives you something to do within a minute of waking, and the name within three', () => {
  assert.ok(CAST_AT < 65, `the cast comes at ${CAST_AT.toFixed(0)} s`);
  assert.ok(NAME_AT < 180, `the name prompt comes at ${NAME_AT.toFixed(0)} s`);
  assert.ok(SWAP_AT < 25);
  // (Her piece once she has the name, and the ledge.)
  assert.ok(HERD.control < 20, `you can move ${HERD.control.toFixed(0)} s after the name`);
  assert.ok(FALL.end < 65, `the ledge is ${FALL.end.toFixed(0)} s`);
});

test('no line names both sides (the V and T rule, in words)', () => {
  const all = [...Object.values(SCRIPT).flat(), ...Object.values(CUES)];
  for (const l of all) assert.ok(!(/Velscour/.test(l.text) && /Tessariel/.test(l.text)), l.text);
});

test('no line in the cave is said twice', () => {
  const seen = new Set();
  for (const l of Object.values(SCRIPT).flat()) { assert.ok(!seen.has(l.text), l.text); seen.add(l.text); }
});
