// The beacon stone every pack carries (src/items/beacon.js), the room Wes Harrow lets a pack out by (src/items/pack.js
// slotPrice), and Lisandra's fee to unbind what's been learned (src/ui/folk.js unbindFee).
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_EXTRA, PACK_H, PACK_W, Pack, slotPrice } from '../src/items/pack.js';
import { CHANNEL, COOLDOWN, beaconLines, beaconStone, isBeacon, waitText } from '../src/items/beacon.js';
import { colorOf, linesOf, nameOf } from '../src/items/items.js';
import { TRADES, offerFor } from '../src/folk/shops.js';
import { unbindFee } from '../src/ui/folk.js';
import { HOME } from '../src/ui/beacon.js';
import { SEALS } from '../src/core/sites.js';

const gem = () => ({ type: 'gem', kind: 'ruby', grade: 0 });
const beacons = (p) => p.entries.filter((e) => isBeacon(e.item));

test('a new game starts with one beacon stone, a cell of the pack, top left', () => {
  const p = new Pack();
  p.startingKit?.();
  const b = beacons(p);
  assert.equal(b.length, 1);
  assert.deepEqual([b[0].x, b[0].y], [0, 0]);
  assert.equal(p.cells, PACK_W * PACK_H, 'no room bought yet');
  assert.equal(CHANNEL, 15);
  assert.equal(COOLDOWN, 600, 'ten minutes');
});

test('an old save is given a stone, and never two', () => {
  const p = new Pack();
  p.load({ kite: true, slots: {}, entries: [{ item: gem(), x: 0, y: 0 }] });
  assert.equal(beacons(p).length, 1, 'an old save without one');
  const twice = new Pack();
  twice.load({ kite: true, slots: {}, entries: [{ item: beaconStone(), x: 3, y: 2 }, { item: beaconStone(), x: 4, y: 2 }] });
  assert.equal(beacons(twice).length, 1, 'two in a save: one');
  assert.deepEqual([beacons(twice)[0].x, beacons(twice)[0].y], [3, 2], 'where it was');
  const worn = new Pack();
  worn.load({ kite: true, slots: { skull: beaconStone() }, entries: [] });
  assert.equal(worn.slots.skull ?? null, null, 'not in a gear slot');
  assert.equal(beacons(worn).length, 1);
});

test('a save with a full pack is owed one, and has it once there is room', () => {
  const entries = [];
  for (let y = 0; y < PACK_H; y++) for (let x = 0; x < PACK_W; x++) entries.push({ item: gem(), x, y });
  const p = new Pack();
  p.load({ kite: true, slots: {}, entries });
  assert.equal(beacons(p).length, 0);
  assert.ok(p.owesBeacon);
  p.entries.pop();
  assert.ok(p.giveBeacon());
  assert.equal(beacons(p).length, 1);
  assert.ok(!p.owesBeacon);
});

test('the stone is dark for the cooldown, and a save keeps it, and the room bought', () => {
  const p = new Pack();
  p.load({ kite: true, slots: {}, entries: [] });
  p.beaconCd = 431.5;
  p.extra = 7;
  const q = new Pack();
  q.load(JSON.parse(JSON.stringify(p.save())));
  assert.equal(q.beaconCd, 431.5);
  assert.equal(q.extra, 7);
  const odd = new Pack();
  odd.load({ kite: true, slots: {}, entries: [], extra: 9999, beaconCd: 1e9 });
  assert.equal(odd.extra, MAX_EXTRA, 'no more room than can be bought');
  assert.ok(odd.beaconCd <= COOLDOWN, 'dark for no longer than the cooldown');
});

test('nobody buys it, and its card says when it glows again', () => {
  const s = beaconStone();
  for (const t of Object.keys(TRADES)) assert.equal(offerFor(t, s), 0, t);
  assert.equal(nameOf(s), 'Beacon Stone');
  assert.ok(colorOf(s));
  assert.ok(linesOf(s).some((l) => /ready/.test(l.text)));
  assert.ok(beaconLines(125).some((l) => l.text.includes('2:05')), 'dark for 2:05');
  assert.equal(waitText(45), '45 s');
  assert.equal(waitText(600), '10:00');
});

test('it sets you down by Bellmourn\'s seal', () => {
  const seal = SEALS.find((s) => s.key === 'bellmourn');
  const d = Math.hypot(HOME.x - seal.x, HOME.z - seal.z);
  assert.ok(d > 4 && d < 7, `${d.toFixed(1)} m off the seal`);
  assert.ok(Math.hypot(HOME.x, HOME.z) < Math.hypot(seal.x, seal.z), 'on the town side of it');
});

test('pack room: a cell at a time, each dearer than the last', () => {
  assert.equal(slotPrice(0), 30);
  let total = 0;
  for (let n = 0; n < MAX_EXTRA; n++) {
    if (n) assert.ok(slotPrice(n) > slotPrice(n - 1), `the ${n + 1}th dearer than the one before`);
    total += slotPrice(n);
  }
  assert.ok(total > 10000 && total < 60000, `all of it: ${total} gold`);
});

test('the cells bought open the rows past the eighth, from the left', () => {
  const p = new Pack();
  p.load({ kite: true, slots: {}, entries: [] });
  assert.equal(p.rows, PACK_H);
  p.extra = 5;
  assert.equal(p.rows, PACK_H + 1);
  assert.equal(p.cells, PACK_W * PACK_H + 5);
  assert.ok(p.isOpen(4, PACK_H));
  assert.ok(!p.isOpen(5, PACK_H), 'the sixth of that row is not bought');
  assert.ok(p.under(gem(), 4, PACK_H), 'a gem fits a bought cell');
  assert.equal(p.under(gem(), 5, PACK_H), null, 'and not one that is not');
  // A two-tall thing can't hang down into the cells not bought.
  const tall = { type: 'weapon', base: 'oakroot_staff', rarity: 0, dmg: [1, 2], affixes: [], sockets: 0, gems: [] };
  assert.equal(p.under(tall, 6, PACK_H - 2), null);
  // Filled to the brim, the bought cells take what comes.
  const q = new Pack();
  q.load({ kite: true, slots: {}, entries: [] });
  q.extra = 3;
  let n = 0;
  while (q.add(gem())) n++;
  assert.equal(n, q.cells - 1, 'every cell but the stone\'s');
  for (const e of q.entries) assert.ok(q.isOpen(e.x, e.y));
});

test('Lisandra\'s fee is next to nothing, and rises a little with the level', () => {
  assert.equal(unbindFee(1), 7);
  assert.ok(unbindFee(50) > unbindFee(10));
  assert.ok(unbindFee(50) < 200, 'nominal, even late on');
});
