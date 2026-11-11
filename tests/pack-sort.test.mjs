// The pack's Sort keeps every item, never overlaps two, and leaves a pack it can't tidy as it was; and the comparison shown on
// a tooltip says what wearing it would change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Pack, PACK_H, PACK_W, sizeOf } from '../src/items/pack.js';
import { compareLines, makeRng, rollGem, rollRobe, rollShield, rollSkull, rollStarterStaff } from '../src/items/items.js';

const ROLLS = [rollGem, rollStarterStaff, (r) => rollRobe(r, {}), rollSkull, (r) => rollShield(r, {})];

const sound = (pack) => {
  const cells = new Set();
  for (const e of pack.entries) {
    const { w, h } = sizeOf(e.item);
    assert.ok(e.x >= 0 && e.y >= 0 && e.x + w <= PACK_W && e.y + h <= PACK_H, 'inside the grid');
    for (let x = e.x; x < e.x + w; x++) for (let y = e.y; y < e.y + h; y++) { assert.ok(!cells.has(`${x},${y}`), 'no overlap'); cells.add(`${x},${y}`); }
  }
};

test('sort keeps every item and overlaps none, however full the pack', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = makeRng(seed), pack = new Pack();
    const n = 3 + (seed % 40);
    for (let i = 0; i < n; i++) pack.add(ROLLS[Math.floor(r() * ROLLS.length)](r));
    const before = new Set(pack.entries.map((e) => e.item));
    const was = pack.entries.map((e) => ({ ...e }));
    const ok = pack.sort();
    sound(pack);
    assert.deepEqual(new Set(pack.entries.map((e) => e.item)), before);
    if (!ok) assert.deepEqual(pack.entries, was, 'left as it was');
  }
});

test('sort puts staffs first, then the rest, gems last', () => {
  const r = makeRng(7), pack = new Pack();
  pack.add(rollGem(r)); pack.add(rollRobe(r, { slot: 'head' })); pack.add(rollStarterStaff(r));
  assert.ok(pack.sort());
  const order = [...pack.entries].sort((a, b) => a.y - b.y || a.x - b.x).map((e) => e.item.type);
  assert.deepEqual(order, ['weapon', 'robe', 'gem']);
});

test('the comparison shows what changes, and nothing for what is worn or not wearable', () => {
  const r = makeRng(3), pack = new Pack();
  pack.load(null);
  const worn = pack.slots.main, staff = rollStarterStaff(r);
  assert.deepEqual(compareLines(worn, pack.slots), []);
  assert.deepEqual(compareLines(rollGem(r), pack.slots), []);
  const lines = compareLines(staff, pack.slots);
  assert.match(lines[0].text, /^Against /);
  const hat = rollRobe(r, { slot: 'head' });
  assert.equal(compareLines(hat, pack.slots)[0].text, 'Nothing worn there now:');
  assert.ok(compareLines(hat, pack.slots).some((l) => /ward/.test(l.text)), 'a hat on a bare head adds ward');
});
