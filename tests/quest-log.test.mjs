// The quest log (src/ui/questlog.js, drawn by src/ui/folk.js): what each quest is, its steps so far, what it pays, where it
// takes place for the map, and the hint when nothing's asked of you.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestBook, RULES } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { OPENING } from '../src/core/opening.js';
import { LIS_START, START, describe, hintOf, placeOf, rewardOf, stepsOf } from '../src/ui/questlog.js';

const book = () => new QuestBook({ change() {}, toast() {}, done() {} });
// Everyone can be found, a step east of the well for each letter of their name.
const person = (id) => ({ x: id.length, z: 2 });
const finite = (s) => Number.isFinite(s.x) && Number.isFinite(s.z);

test('every quest says what it is, who gave it and what it pays', () => {
  for (const id of Object.keys(RULES)) {
    assert.ok(QUESTS[id].about?.length > 40, `${id}: no about`);
    assert.ok(rewardOf(id), `${id}: pays nothing`);
    assert.doesNotMatch(describe(QUESTS[id].giver), /_/, id);
  }
  assert.equal(describe('jory'), 'Jory Pell, the night watchman');
  assert.equal(describe('aldric'), 'Ser Aldric Halloway, the captain of the Watch');
  assert.equal(rewardOf('dead_cant_wait'), '60 gold, 200 experience');
  assert.equal(rewardOf('four_watches'), 'the Wingbell, 900 experience');
});

test('every step of every quest has a place on the map, and its steps so far', () => {
  for (const id of Object.keys(RULES)) {
    const Q = book();
    Q.begin(id);
    const steps = RULES[id].steps;
    for (let k = 0; k < steps.length; k++) {
      const p = placeOf(id, { Q, person, mats: {} });
      assert.ok(p?.spots.length, `${id} step ${k}: nowhere`);
      for (const s of p.spots) { assert.ok(finite(s), `${id} step ${k}: ${s.name} has no x, z`); assert.ok(s.name, `${id} step ${k}: unnamed`); }
      assert.ok(p.where, `${id} step ${k}: no words for where`);
      const done = stepsOf(id, Q);
      assert.equal(done.length, k + 1, id);
      assert.deepEqual(done.map((d) => d.done), [...Array(k).fill(true), false], id);
      // (Something to bring: from the catacombs till the satchel holds it, then to the giver.)
      if (steps[k].bring) {
        assert.ok(p.spots[0].below, `${id}: not from below`);
        const full = placeOf(id, { Q, person, mats: { [steps[k].bring]: steps[k].n } });
        assert.equal(full.spots[0].who, QUESTS[id].giver, id);
      }
      Q.advance(id);
    }
    // Made overnight: back to the giver.
    if (RULES[id].wait) {
      const R = book(); R.begin(id); R.handIn(id, 3);
      assert.equal(placeOf(id, { Q: R, person }).spots[0].who, QUESTS[id].giver, id);
      assert.equal(stepsOf(id, R).at(-1).done, false, id);
    }
  }
});

test("the places: the Sexton's Door the first time down, the dead below, a list of seals as they're left", () => {
  const Q = book();
  Q.begin('dead_cant_wait');
  assert.match(placeOf('dead_cant_wait', { Q, person }).where, /Sexton's Door/);
  Q.advance('dead_cant_wait');
  assert.equal(placeOf('dead_cant_wait', { Q, person }).spots[0].below, true);
  Q.begin('four_watches');
  assert.equal(placeOf('four_watches', { Q, person }).spots.length, 3);
  Q.state('four_watches').seen = ['abbey'];
  assert.equal(placeOf('four_watches', { Q, person }).spots.length, 2);
  // Someone who can't be found just now: named, with nowhere on the map.
  Q.begin('letter');
  const p = placeOf('letter', { Q, person: () => null });
  assert.equal(p.spots[0].who, 'elowen');
  assert.ok(!finite(p.spots[0]));
});

test('the hint: only while nothing is taken on, and it follows the game along', () => {
  const Q = book();
  assert.match(hintOf({ Q, stage: OPENING.WAKE }).title, /cave/);
  assert.match(hintOf({ Q, stage: OPENING.ESCORT }).text, /Follow Lisandra/);
  assert.equal(hintOf({ Q, lisHere: true, person }).text, LIS_START);
  assert.equal(hintOf({ Q, lisHere: true, person }).items[0].spot.who, 'lisandra');
  assert.equal(hintOf({ Q, person }).text, START);
  assert.equal(hintOf({ Q, person }).items[0].spot.who, 'bram');
  Q.begin('bed_and_bell');
  assert.equal(hintOf({ Q, person }), null);
  Q.finish('bed_and_bell');
  // Work to be had: everyone with some, each with a place on the map; what suits your level first.
  const h = hintOf({ Q, person, level: 1 });
  assert.match(h.text, /yellow !/);
  const who = h.items.map((i) => i.spot.who);
  for (const g of who) assert.ok(Q.offers(g).length, g);
  assert.ok(who.includes('silas') && who.includes('cedric'));
  assert.ok(who.indexOf('cedric') < who.indexOf('aldric'), 'what suits level 1 comes first');
  assert.match(h.items.find((i) => i.spot.who === 'aldric').text, /level 13/);
  assert.ok(who.indexOf('silas') < who.indexOf('aldric'), 'work beyond you, the nearest to your level first');
  // Someone with work who can't be found (Lisandra, before she's walked you down) isn't sent to.
  const away = hintOf({ Q, person: (id) => (id === 'lisandra' ? null : person(id)), level: 1 });
  assert.ok(!away.items.some((i) => i.spot.who === 'lisandra'));
  assert.ok(who.includes('lisandra'));
  // Only work beyond you left: the woods first, for a level or two.
  const R = book();
  for (const id of Object.keys(RULES)) if (!['black_road'].includes(id)) R.finish(id);
  const g = hintOf({ Q: R, person, level: 4 });
  assert.match(g.text, /beyond you yet/);
  assert.ok(g.items.some((i) => /woods/.test(i.text) && finite(i.spot)));
  // Everything done: what's left.
  R.finish('black_road');
  const all = hintOf({ Q: R, person, level: 20 });
  assert.match(all.title, /Every quest is done/);
  assert.ok(all.items.every((i) => finite(i.spot)));
});
