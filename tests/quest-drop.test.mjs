// Abandoning a quest from the quest log (src/folk/quests.js drop): it's as if it was never taken, its giver offers it again,
// what was handed over for it comes back, and the trail and the tracker let it go; auto-play leaves it a while. Then the
// tracker itself, the log's sorting and counting (src/ui/questlog.js), and the settings window's list (src/ui/settings-spec.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QuestBook, RULES, WATCH_MAX } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { DROP_REST } from '../src/ui/autobrain.js';
import { ZONES, levelTone, objectivesOf, rewardsOf, shortOf, standOf, zoneOf } from '../src/ui/questlog.js';
import { SPEC, TABS } from '../src/ui/settings-spec.js';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const book = (hooks = {}) => new QuestBook({ change() {}, toast() {}, done() {}, ...hooks });
const plain = Object.keys(RULES).filter((k) => !RULES[k].needs && !RULES[k].steps[0].start);

test('a quest dropped is as if it was never taken: its giver offers it again, and it starts over', () => {
  const Q = book(), id = 'pines', giver = QUESTS[id].giver;
  assert.ok(Q.offers(giver).includes(id));
  Q.begin(id);
  Q.q[id].n = 5;
  assert.ok(!Q.offers(giver).includes(id));
  assert.ok(Q.flags.has(`quest:${id}`));
  assert.ok(Q.canDrop(id));
  assert.equal(Q.drop(id, 1000), null);
  assert.equal(Q.state(id), null);
  assert.ok(!Q.flags.has(`quest:${id}`), 'the town still talks as if it was taken');
  assert.ok(Q.offers(giver).includes(id), 'its giver has it to give again');
  Q.begin(id);
  assert.equal(Q.q[id].n, 0, 'the count goes on from where it was');
});

test('only a quest under way can be dropped: one done stays done', () => {
  const Q = book();
  assert.equal(Q.drop('pines'), false);
  Q.begin('pines');
  Q.finish('pines');
  assert.equal(Q.canDrop('pines'), false);
  assert.equal(Q.drop('pines'), false);
  assert.ok(Q.done('pines'));
});

test('what was handed over to be made overnight comes back; the trail and the tracker let it go', () => {
  let got = null;
  const Q = book({ dropped: (id, back) => { got = { id, back }; } });
  const id = 'bones_for_carver', st = RULES[id].steps.at(-1);
  Q.q.dead_cant_wait = { stage: 'done' };
  Q.begin(id);
  assert.ok(Q.watching(id));
  assert.equal(Q.followed(), id);
  assert.equal(Q.handIn(id, 3), 'making');
  const back = Q.drop(id);
  assert.deepEqual(back, { mat: st.bring, n: st.n });
  assert.deepEqual(got, { id, back });
  assert.ok(!Q.watching(id), 'still tracked');
  assert.notEqual(Q.followed(), id, 'still followed');
  assert.ok(Q.offers(QUESTS[id].giver).includes(id));
});

test("a round of the town to take work on loses the tick of someone whose work is dropped", () => {
  const Q = book();
  const round = Object.keys(RULES).find((k) => RULES[k].steps[0].start);
  Q.begin(round);
  const start = RULES[round].steps[0].start;
  const g = start.find((p) => Object.keys(RULES).some((k) => QUESTS[k].giver === p && !RULES[k].needs && k !== round));
  const qid = Object.keys(RULES).find((k) => QUESTS[k].giver === g && !RULES[k].needs && k !== round);
  Q.begin(qid);
  assert.ok(Q.q[round].seen?.includes(g), 'taking it ticks them off');
  Q.drop(qid);
  assert.ok(!Q.q[round].seen?.includes(g), 'dropping it leaves the tick');
});

test('the tracker: quests taken are tracked while there is room, kept in a save, and so is when one was dropped', () => {
  const Q = book(), ids = plain.slice(0, WATCH_MAX + 2);
  for (const k of ids) Q.begin(k);
  assert.equal(Q.watch.length, WATCH_MAX);
  assert.equal(Q.track(ids.at(-1)), false, 'more than there is room for');
  assert.equal(Q.track(ids[0], false), true);
  assert.equal(Q.track(ids.at(-1)), true);
  assert.equal(Q.track('pines_not_a_quest'), false);
  Q.drop(ids[1], 5000);
  const R = book();
  R.load(JSON.parse(JSON.stringify(Q.save())));
  assert.deepEqual(R.watch, Q.watch);
  assert.ok(R.droppedLately(ids[1], 1000, 5500));
  assert.ok(!R.droppedLately(ids[1], 1000, 7000));
  assert.ok(!R.droppedLately(ids[2], 1000, 5500));
});

test('a save from before the tracker tracks the quest followed and the newest under way', () => {
  const Q = book();
  for (const k of plain.slice(0, 5)) Q.begin(k);
  const d = JSON.parse(JSON.stringify(Q.save()));
  delete d.watch; delete d.dropped;
  const R = book();
  R.load(d);
  assert.equal(R.watch.length, 3);
  assert.ok(R.watch.includes(R.followed()));
  assert.ok(R.watch.every((k) => R.active().includes(k)));
});

test('auto-play leaves a quest you dropped alone for a while, then may take it again', () => {
  assert.ok(DROP_REST >= 5 * 60 * 1000);
  const brain = read('../src/ui/autobrain.js');
  assert.match(brain, /droppedLately\?\.\(id, DROP_REST\)/);
  assert.match(brain, /droppedLately\?\.\(qid, DROP_REST\)/);
});

test('the log sorts by the part of the world a quest is in, and colours it by its level against yours', () => {
  for (const id of Object.keys(RULES)) assert.ok(ZONES.includes(zoneOf(id)), `${id}: ${zoneOf(id)}`);
  assert.equal(zoneOf('pines'), 'Bellmourn');
  assert.equal(zoneOf('cinder_floors'), 'City State Phobos');
  assert.equal(zoneOf('hedge_breakers'), 'The Green Downs');
  assert.deepEqual([12, 9, 6, 1].map((w) => levelTone(w, 6)), ['red', 'orange', 'yellow', 'green']);
  assert.equal(levelTone(1, 20), 'grey');
});

test("the objectives count what can be counted, and say when it's ready to hand in", () => {
  const Q = book();
  Q.begin('pines');
  Q.q.pines.n = 3;
  const o = objectivesOf('pines', Q).at(-1);
  assert.equal(o.have, 3);
  assert.equal(o.need, RULES.pines.steps[0].n);
  assert.doesNotMatch(o.text, /\(\d+ of \d+\)/, 'the count is in the words as well as the bar');
  assert.equal(shortOf('pines', Q), `3 / ${RULES.pines.steps[0].n}`);
  Q.begin('iron_from_dead');
  const n = RULES.iron_from_dead.steps[0].n;
  assert.equal(standOf('iron_from_dead', Q, { iron: n - 1 }), '');
  assert.equal(standOf('iron_from_dead', Q, { iron: n }), 'ready');
  assert.match(shortOf('iron_from_dead', Q, { iron: n }), /^Hand it in to /);
  for (const id of Object.keys(RULES)) assert.ok(rewardsOf(id).length, `${id} pays nothing`);
});

test('every setting in the window has a tab, its choices in words, a line on what it does, and a default', () => {
  const tabs = new Set(TABS.map(([k]) => k)), title = read('../src/title.js');
  const keys = SPEC.map((s) => s.k);
  assert.equal(new Set(keys).size, keys.length, 'a setting twice');
  for (const s of SPEC) {
    assert.ok(tabs.has(s.tab), `${s.k}: no tab ${s.tab}`);
    assert.ok(s.help?.length > 10, `${s.k}: nothing on what it does`);
    if (s.kind === 'seg' || s.kind === 'select') assert.ok(s.opts.length >= 2, s.k);
    if (s.kind === 'toggle') assert.ok(s.on && s.off, s.k);
    if (!s.k.startsWith('ai')) assert.ok(title.includes(`${s.k}: `), `${s.k} has no default`);
  }
  for (const [t] of TABS) assert.ok(SPEC.some((s) => s.tab === t), `${t} is empty`);
});
