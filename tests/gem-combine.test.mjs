// Gems: five cuts, the last two only ever made, three of a kind and a cut into one of the next (src/items/pack.js combine).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { Pack } from '../src/items/pack.js';
import { GEMS, GEM_GRADES, gearTotals, linesOf, makeRng, nameOf, rollGem, rollLoot, rollSkull, setFind } from '../src/items/items.js';
import { worth } from '../src/folk/shops.js';

const LAST = GEM_GRADES.length - 1;
const gem = (kind, grade) => ({ type: 'gem', kind, grade });
// A pack with nothing in it but what a test puts there.
const empty = () => { const p = new Pack(); p.load({ kite: true, slots: {}, entries: [] }); p.entries = []; return p; };
const gems = (p) => p.entries.filter((e) => e.item.type === 'gem').map((e) => `${e.item.kind}${e.item.grade}`).sort();

test('five cuts, each worth more than the last, and the last two never roll', () => {
  assert.deepEqual(GEM_GRADES.map((g) => g.name), ['Rough', 'Cut', 'Flawless', 'Brilliant', 'Perfect']);
  assert.deepEqual(GEM_GRADES.map((g) => g.weight), [70, 25, 5, 0, 0]);
  for (const [kind, g] of Object.entries(GEMS)) {
    assert.equal(g.values.length, GEM_GRADES.length, kind);
    for (let i = 1; i < g.values.length; i++) assert.ok(g.values[i] > g.values[i - 1], `${kind}: cut ${i} is no better than cut ${i - 1}`);
    for (let i = 0; i < g.values.length; i++) {
      assert.ok(nameOf(gem(kind, i)).startsWith(GEM_GRADES[i].name));
      const said = linesOf(gem(kind, i)).some((l) => l.text === 'Three of the same cut combine into the next.');
      assert.equal(said, i < LAST, `${kind} ${i}: the tooltip's line about combining`);
      if (i) assert.ok(worth(gem(kind, i)) >= 3 * worth(gem(kind, i - 1)), 'a finer gem sells for less than the three it took');
    }
  }
  const rng = makeRng(77);
  try {
    for (const find of [1, 4, 40]) {
      setFind(find);
      for (let i = 0; i < 4000; i++) { const g = rollGem(rng); assert.ok(Number.isInteger(g.grade) && g.grade >= 0 && g.grade <= 2, `rolled a cut ${g.grade} gem at find ${find}`); }
      for (let kind = 0; kind < 13; kind++) for (let i = 0; i < 300; i++) for (const it of rollLoot(rng, kind)) if (it.type === 'gem') assert.ok(it.grade <= 2);
    }
  } finally { setFind(1); }
  // Asked for by its cut, it's given; a cut there isn't is the nearest there is.
  assert.equal(rollGem(rng, { kind: 'ruby', grade: 4 }).grade, 4);
  assert.equal(rollGem(rng, { kind: 'ruby', grade: 9 }).grade, LAST);
  assert.equal(rollGem(rng, { kind: 'ruby', grade: -3 }).grade, 0);
});

test('danger pays in gems too: the find multiplier brings finer cuts', () => {
  const fine = (find) => { setFind(find); const rng = makeRng(5); let n = 0; for (let i = 0; i < 6000; i++) if (rollGem(rng).grade > 0) n++; return n / 6000; };
  try {
    const plain = fine(1), deep = fine(3);
    assert.ok(Math.abs(plain - 0.3) < 0.03, `at find 1, ${plain} of gems are finer than Rough`);
    assert.ok(deep > plain + 0.2, `at find 3 only ${deep} are`);
  } finally { setFind(1); }
});

test('three of a kind and a cut become one of the next, where the first lay', () => {
  const p = empty();
  p.entries.push({ item: gem('ruby', 0), x: 5, y: 2 }, { item: gem('ruby', 0), x: 3, y: 1 }, { item: gem('ruby', 0), x: 9, y: 1 }, { item: gem('topaz', 0), x: 0, y: 0 }, { item: gem('ruby', 1), x: 1, y: 0 });
  assert.deepEqual(p.combinable(), [{ kind: 'ruby', grade: 0, count: 3 }]);
  const made = p.combine('ruby', 0);
  assert.deepEqual(made, gem('ruby', 1));
  // (The first as the pack is read: top row first, left to right.)
  const at = p.entries.find((e) => e.item === made);
  assert.deepEqual([at.x, at.y], [3, 1]);
  assert.deepEqual(gems(p), ['ruby1', 'ruby1', 'topaz0']);
  assert.deepEqual(p.combinable(), []);
  // Two aren't three; nor are three of a kind in different cuts, or three of a cut in different kinds.
  assert.equal(p.combine('ruby', 1), null);
  assert.equal(p.combine('topaz', 0), null);
  assert.deepEqual(gems(p), ['ruby1', 'ruby1', 'topaz0']);
  // Nothing is finer than Perfect, and there's no such gem as a pearl.
  for (let i = 0; i < 3; i++) p.add(gem('diamond', LAST));
  assert.equal(p.combine('diamond', LAST), null);
  assert.equal(p.combine('pearl', 0), null);
  assert.equal(p.combine('ruby', 1.5), null);
  assert.ok(!p.combinable().some((c) => c.grade >= LAST));
  assert.equal(p.entries.filter((e) => e.item.kind === 'diamond').length, 3);
});

test('a gem in the hand counts as one of the three, and the new one lies where it was set down', () => {
  const p = empty();
  const a = { item: gem('emerald', 1), x: 0, y: 0 }, b = { item: gem('emerald', 1), x: 7, y: 3 };
  p.entries.push(a, b);
  const held = gem('emerald', 1);
  assert.equal(p.combine('emerald', 1), null, 'two in the pack combined by themselves');
  assert.equal(p.combine('emerald', 1, { held: gem('ruby', 1) }), null, 'a ruby stood in for an emerald');
  const made = p.combine('emerald', 1, { held, at: b });
  assert.deepEqual(made, gem('emerald', 2));
  assert.equal(p.entries.length, 1);
  assert.deepEqual([p.entries[0].x, p.entries[0].y, p.entries[0].item], [7, 3, made]);
});

test('socketed gems are there for good: only loose ones combine', () => {
  const p = empty();
  const skull = rollSkull(makeRng(3), { rarity: 4, sockets: 3 });
  for (let i = 0; i < 2; i++) assert.ok(p.socket(skull, gem('sapphire', 0)));
  p.slots.skull = skull;
  p.add(rollSkull(makeRng(4), { rarity: 4, sockets: 2 }));
  assert.ok(p.socket(p.entries[0].item, gem('sapphire', 0)));
  p.add(gem('sapphire', 0)); p.add(gem('sapphire', 0));
  assert.deepEqual(p.combinable(), []);
  assert.equal(p.combine('sapphire', 0), null);
  assert.deepEqual(p.combineAll(), []);
  assert.equal(skull.gems.length, 2);
  // And what a socketed gem gives is its own cut's.
  skull.gems = [gem('sapphire', 4)];
  const with4 = gearTotals(p.slots).mana;
  skull.gems = [gem('sapphire', 2)];
  assert.equal(with4 - gearTotals(p.slots).mana, GEMS.sapphire.values[4] - GEMS.sapphire.values[2]);
});

test('combineAll carries on till nothing is left to combine', () => {
  const p = empty();
  // 27 Rough rubies are one Flawless; 81 are a Perfect... here: 9 Rough and 2 Cut topazes make a Flawless and two Cut over.
  for (let i = 0; i < 27; i++) p.add(gem('ruby', 0));
  for (let i = 0; i < 9; i++) p.add(gem('topaz', 0));
  for (let i = 0; i < 2; i++) p.add(gem('topaz', 1));
  p.add(gem('diamond', 0)); p.add(gem('diamond', 0));
  const made = p.combineAll();
  assert.deepEqual(gems(p), ['diamond0', 'diamond0', 'ruby3', 'topaz1', 'topaz1', 'topaz2']);
  assert.equal(made.length, 9 + 3 + 1 + 3 + 1);
  assert.ok(made.every((g) => g.type === 'gem' && g.grade >= 1));
  assert.deepEqual(p.combinable(), []);
  assert.deepEqual(p.combineAll(), []);
  // All the way up: 81 of a kind are one Perfect, and it stops there.
  const q = empty();
  for (let i = 0; i < 81; i++) q.add(gem('amethyst', 0));
  q.combineAll();
  assert.deepEqual(gems(q), [`amethyst${LAST}`]);
  // Nothing lies on anything else afterwards.
  const seen = new Set();
  for (const e of p.entries) { assert.ok(!seen.has(`${e.x},${e.y}`)); seen.add(`${e.x},${e.y}`); }
});

test('a save with a gem of no cut or kind there is loads, and can be named', () => {
  const p = new Pack();
  const skull = { ...rollSkull(makeRng(9), { rarity: 3, sockets: 3 }), gems: [gem('ruby', 7), gem('pearl', 1), gem('topaz', '1'), null] };
  p.load({ kite: true, slots: { skull }, entries: [
    { item: gem('ruby', 9), x: 0, y: 0 }, { item: gem('emerald', -2), x: 1, y: 0 }, { item: gem('topaz', 'x'), x: 2, y: 0 }, { item: gem('sapphire', 1.6), x: 3, y: 0 },
    { item: { type: 'gem', kind: 'diamond' }, x: 4, y: 0 }, { item: gem('pearl', 1), x: 5, y: 0 }, { item: gem('amethyst', 3), x: 6, y: 0 },
  ] });
  const loose = p.entries.filter((e) => e.item.type === 'gem').map((e) => e.item);
  assert.deepEqual(loose.map((g) => `${g.kind}${g.grade}`), [`ruby${LAST}`, 'emerald0', 'topaz0', 'sapphire2', 'diamond0', 'amethyst3']);
  assert.deepEqual(p.slots.skull.gems.map((g) => `${g.kind}${g.grade}`), [`ruby${LAST}`, 'topaz1']);
  for (const g of [...loose, ...p.slots.skull.gems]) { assert.ok(nameOf(g)); assert.ok(linesOf(g).length); assert.ok(worth(g) > 0); }
  assert.ok(linesOf(p.slots.skull, p.slots).length);
  assert.ok(Number.isFinite(gearTotals(p.slots).power));
  // And it goes round a save whole.
  const again = new Pack();
  again.load(JSON.parse(JSON.stringify(p.save())));
  assert.deepEqual(again.entries.filter((e) => e.item.type === 'gem').map((e) => e.item), loose);
});

test('every cut has its picture, its drawing, its light and its price', () => {
  const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
  const kit = JSON.parse(read('../assets/ui/kit/manifest.json'));
  for (const kind of Object.keys(GEMS)) for (let g = 0; g < GEM_GRADES.length; g++) {
    const f = kit.goods[`gem_${kind}_${g}`];
    assert.ok(f && fs.existsSync(new URL(`../assets/ui/kit/${f}`, import.meta.url)), `no painted gem_${kind}_${g}`);
  }
  const inv = read('../src/ui/inventory.js');
  const drawn = inv.slice(inv.indexOf('const GEM_SVG = ['), inv.indexOf('const SOCKETED')).split('\n').filter((l) => l.trim().startsWith("'<")).length;
  assert.equal(drawn, GEM_GRADES.length, 'a drawn gem for every cut (GEM_SVG in inventory.js)');
  const fx = read('../src/gfx/gemfx.js');
  for (const name of ['GRADE', 'FLOURISH']) assert.equal(JSON.parse(fx.match(new RegExp(`const ${name} = (\\[[^\\]]*\\])`))[1]).length, GEM_GRADES.length, `gemfx.js ${name}`);
  assert.match(read('../index.html'), /id="invCombine"/);
});

test('auto-play combines before it sockets, and keeps gems that are on their way to a finer cut', async () => {
  const src = fs.readFileSync(new URL('../src/ui/autobrain.js', import.meta.url), 'utf8');
  const dress = src.slice(src.indexOf('  dress() {'), src.indexOf('  gemWorth(gem)'));
  assert.ok(dress.indexOf('combineAll') > 0 && dress.indexOf('combineAll') < dress.indexOf('pack.socket('), 'dress() sockets before it combines');
  assert.match(dress, /allow\('aiGems'\)[^\n]*\n[^\n]*combineAll/, 'combining isn\'t under the aiGems setting');
  const junk = src.slice(src.indexOf('  junk() {'), src.indexOf('  junk() {') + 1600);
  assert.match(junk, /GEM_GRADES\.length - 1/);
  assert.match(junk, /\.length < 2/);
});
