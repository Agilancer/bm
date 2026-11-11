// The marks over quest givers' heads, and Lisandra's quest that sends you round to start every giver's work.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestBook, RULES } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { GIVERS } from '../src/folk/lines/lisandra.js';
import { BEYOND } from '../src/folk/lines/beyond.js';
import { POSTED } from '../src/folk/people.js';

const book = () => new QuestBook({ change() {}, toast() {}, done() {} });

test('every quest has its words, and Lisandra sends you to everyone in town who gives one', () => {
  for (const id of Object.keys(RULES)) assert.ok(QUESTS[id]?.title, id);
  const givers = new Set(Object.keys(RULES).map((id) => QUESTS[id].giver));
  for (const g of GIVERS) assert.ok(givers.has(g), g);
  // (Everyone else who gives work is out in the land: posted in the small towns, or at the Bell Tower.)
  const far = new Set([...POSTED, ...BEYOND].map((p) => p.id));
  for (const g of givers) assert.ok(GIVERS.includes(g) || g === 'lisandra' || far.has(g), g);
});

test('a giver shows !, then a grey ? while the work is under way, then a yellow ? to hand it in', () => {
  const Q = book();
  assert.equal(Q.mark('corran', {}, 0), 'offer');
  Q.begin('pines');
  Q.begin('long_way_round');
  assert.equal(Q.mark('corran', {}, 0), 'busy');
  for (let i = 0; i < 12; i++) Q.kill(-150, 2, 150, 0);   // out in the pines
  assert.equal(Q.step('pines').back, true);
  assert.equal(Q.mark('corran', {}, 0), 'ready');
});

test('bring: a yellow ? once the satchel holds enough; made overnight: grey till the next day', () => {
  const Q = book();
  Q.begin('shroud_and_thread');
  assert.equal(Q.mark('tamsin', { silk: 3 }, 0), 'busy');
  assert.equal(Q.mark('tamsin', { silk: 8 }, 0), 'ready');
  Q.handIn('shroud_and_thread', 4);
  assert.equal(Q.mark('tamsin', {}, 4), 'busy');
  assert.equal(Q.mark('tamsin', {}, 5), 'ready');
});

test('someone you are sent to talk to shows a yellow ?', () => {
  const Q = book();
  Q.begin('bed_and_bell');
  assert.equal(Q.mark('silas', {}, 0), 'ready');
  assert.equal(Q.mark('bram', {}, 0), 'busy');
});

test("Lisandra's quest ticks off each giver as you take their work, counting any taken already", () => {
  const Q = book();
  Q.begin('bed_and_bell');
  assert.equal(Q.mark('lisandra', {}, 0), 'offer');
  Q.begin('lisandra_work');
  assert.deepEqual(Q.state('lisandra_work').seen, ['bram']);
  assert.equal(Q.mark('lisandra', {}, 0), 'busy');
  assert.match(Q.journalLine('lisandra_work'), /\(1 of 11\).*Still to see: Silas/);
  const first = { silas: 'dead_cant_wait', homunculus: 'iron_from_dead', tamsin: 'shroud_and_thread', corran: 'pines', orrin: 'toll_of_bell',
    cedric: 'letter', hob: 'millhaven_jelly', sabine: 'sallowmere', aldric: 'black_road', jory: 'barrow_lights' };
  for (const id of Object.values(first)) Q.begin(id);
  assert.equal(Q.step('lisandra_work').back, true);
  assert.equal(Q.mark('lisandra', {}, 0), 'ready');
  // Saved and loaded, it holds.
  const R = book(); R.load(Q.save());
  assert.equal(R.mark('lisandra', {}, 0), 'ready');
});
