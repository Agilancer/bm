// What a new game starts with: a common staff of a random kind and a kite shield, nothing else. The first skull is the reward
// for Bram Kettle's errand, the first quest in town.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BASES, SHIELDS, hands } from '../src/items/items.js';
import { Pack } from '../src/items/pack.js';
import { QuestBook, RULES } from '../src/folk/quests.js';
import { TownUI } from '../src/ui/folk.js';

const fresh = () => { const p = new Pack(); p.load(null); return p; };

test('a new game holds one common staff and a kite shield, and no skull, gems or anything in the pack', () => {
  for (let i = 0; i < 200; i++) {
    const p = fresh();
    const staff = p.slots.main, shield = p.slots.off;
    assert.equal(staff.type, 'weapon');
    assert.equal(hands(staff.base), 3, `${staff.base} is a staff`);
    assert.equal(staff.rarity, 0, 'common');
    assert.equal(BASES[staff.base].tier, 0, 'of the lowest tier');
    assert.deepEqual(staff.gems, []);
    assert.equal(shield.type, 'shield');
    assert.ok(SHIELDS[shield.base] && (SHIELDS[shield.base].kind || 'kite') === 'kite' && !SHIELDS[shield.base].side, 'a plain kite shield');
    assert.deepEqual(shield.gems, []);
    assert.equal(p.slots.skull, null, 'no skull in hand');
    assert.deepEqual(p.entries, [], 'nothing in the pack');
    for (const [slot, it] of Object.entries(p.slots)) if (slot !== 'main' && slot !== 'off') assert.equal(it, null, slot);
  }
});

test('the staff is a different kind from game to game, every kind about as often as any other', () => {
  const kinds = new Set(Object.keys(BASES).filter((b) => BASES[b].tier === 0 && BASES[b].shot).map((b) => BASES[b].shot));
  const n = {};
  let same = 0, last = null;
  const games = 3000;
  for (let i = 0; i < games; i++) {
    const shot = BASES[fresh().slots.main.base].shot;
    n[shot] = (n[shot] || 0) + 1;
    if (shot === last) same++;
    last = shot;
  }
  assert.deepEqual(Object.keys(n).sort(), [...kinds].sort(), 'every kind of common staff turns up');
  const counts = Object.values(n), even = games / kinds.size;
  assert.ok(Math.min(...counts) > even * 0.6 && Math.max(...counts) < even * 1.4, `evenly: ${JSON.stringify(n)}`);
  assert.ok(same < games * 0.15, `two games in a row match only now and then (${same} of ${games})`);
});

test('a save keeps what it has, and is given no test skull, gems or staffs', () => {
  const p = new Pack();
  p.load({ kite: true, slots: { main: { type: 'weapon', base: 'oakroot_staff', rarity: 0, dmg: [11, 17], affixes: [], sockets: 0, gems: [] } }, entries: [] });
  assert.deepEqual(p.entries, []);
  assert.equal(p.slots.skull, null);
  const kept = new Pack();
  const aurora = { type: 'skull', base: 'skull_03', rarity: 5, skin: 'aurora', pattern: 50, affixes: [], sockets: 6, gems: [] };
  kept.load({ kite: true, aurora: true, elementals: true, slots: { main: p.slots.main }, entries: [{ item: aurora, x: 0, y: 0 }, { item: { type: 'gem', kind: 'ruby', grade: 2 }, x: 2, y: 0 }] });
  assert.equal(kept.entries.length, 2, 'what it had stays');
  // A save with no staff at all is handed a common one.
  const bare = new Pack();
  bare.load({ kite: true, slots: {}, entries: [] });
  assert.equal(bare.slots.main.rarity, 0);
  assert.equal(hands(bare.slots.main.base), 3);
});

test("Bram's errand, the first quest in town, pays a common skull", () => {
  const book = new QuestBook({ change() {}, toast() {}, done() {} });
  assert.ok(book.offers('bram').includes('bed_and_bell'), 'Bram has it to give from the start');
  assert.equal(RULES.bed_and_bell.needs, undefined);
  const pack = fresh();
  book.begin('bed_and_bell');
  book.advance('bed_and_bell');
  const ui = { quests: book, pack, spellbar: { known: new Set() }, note() {}, act: { give: (it) => assert.ok(pack.add(it)), xp() {}, saved() {}, charm() {} } };
  TownUI.prototype.reward.call(ui, 'bed_and_bell');
  assert.ok(book.done('bed_and_bell'));
  const skulls = pack.entries.filter((e) => e.item.type === 'skull');
  assert.equal(skulls.length, 1, 'one skull in the pack');
  assert.equal(skulls[0].item.rarity, 0, 'common');
  assert.ok(skulls[0].item.sockets >= 1 && skulls[0].item.skin, 'a whole skull, with its skin and sockets');
});
