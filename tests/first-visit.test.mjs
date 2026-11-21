// Your first visit to City State Phobos (src/folk/first-visit.js, words in src/folk/lines/first-visit.js, the Redoubt in
// src/core/delve-redoubt.js; docs/FIRST-VISIT.md): it comes straight after Bram's first errand, at a level a new player has;
// Wenna stands on the Sill, clear of the city's lairs and in reach of Lisandra's door; every quest has its words and
// somewhere to go that's there; nothing of Tessariel's is said inside his walls or down his Redoubt; and each quest can
// be walked through to the end.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestBook, RULES, areaAt, hasArea, placeSpot } from '../src/folk/quests.js';
import { DOOR_DUE, DOOR_STEP, FIRST_VISIT, FIRST_VISIT_LEVELS, FIRST_VISIT_RULES, SILL_DOOR } from '../src/folk/first-visit.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { LINES, QUESTS as FV_QUESTS } from '../src/folk/lines/first-visit.js';
import { FOLK, POSTED } from '../src/folk/people.js';
import { BEYOND } from '../src/folk/lines/beyond.js';
import { LISANDRA } from '../src/folk/lines/lisandra.js';
import { FOLK_MAX } from '../src/folk/layout.js';
import { LAIRS } from '../src/core/tripo-monsters.js';
import { REDOUBT } from '../src/core/delve-redoubt.js';
import { WARNINGS, delveByKey, toWorld } from '../src/core/dungeon.js';
import { REDOUBT_FIGHTS } from '../src/sim/redoubt-fights.js';
import { FIGHTS } from '../src/sim/delve-fights.js';
import { questLevel } from '../src/ui/autobrain.js';
import { describe as describeWho } from '../src/ui/questlog.js';
import { terrainHeight } from '../src/core/terrain.js';

const IDS = Object.keys(FIRST_VISIT_RULES);
const WHO = new Set([...FOLK, ...BEYOND, LISANDRA].map((p) => p.id));
const WENNA = POSTED.find((p) => p.id === 'fv_wenna');
const spotIn = (k) => { const d = delveByKey(k); if (!d) return placeSpot(k); const r = d.rooms[1], [x, z] = toWorld(r.x, r.z, d); return { x, z }; };
const book = () => new QuestBook({ change() {}, toast() {}, done() {} });
const T = /Tessariel|Bell Tower|Four Watches|\bseals?\b|sunburst|abbey|chapel|shrine|Bellwright|Anselm|\bbells?\b|cross/i;
const each = (o, f, path = '') => { if (typeof o === 'string') f(o, path); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) each(v, f, `${path}.${k}`); };

test('the first visit follows Bram\'s first errand, and stays at a new player\'s levels', () => {
  assert.equal(FIRST_VISIT_RULES.the_door_east.needs, 'bed_and_bell');
  assert.equal(QUESTS.the_door_east.giver, 'lisandra');
  assert.equal(FIRST_VISIT_RULES.the_door_east.door, 'sill');
  assert.equal(FIRST_VISIT_RULES.fv_home.door, 'home');
  assert.deepEqual(FIRST_VISIT, FIRST_VISIT_LEVELS.map(([id]) => id));
  for (const id of IDS) { assert.equal(RULES[id], FIRST_VISIT_RULES[id], id); assert.ok(questLevel(id) <= 5, `${id}: level ${questLevel(id)}`); }
  // (The two lairs it sends you to are of its levels: the city's own are of twenty and more.)
  for (const k of ['sill_gibbets', 'sill_carrion']) { const l = LAIRS.find((q) => q.key === k); assert.ok(l && l.lvl <= 5, `${k}: level ${l?.lvl}`); }
  assert.ok(REDOUBT.level <= 6 && REDOUBT.party === false);
  assert.equal(DOOR_STEP.length > 0, true);
});

test("Lisandra's door is due at twelve minutes played, Bram's errand done or not", () => {
  assert.ok(DOOR_DUE <= 12 * 60);
  const b = book();
  b.begin('lisandra_work');
  assert.ok(!b.offers('lisandra').includes('the_door_east'), 'offered before its time');
  b.flags.add(FIRST_VISIT_RULES.the_door_east.due);
  assert.ok(b.offers('lisandra').includes('the_door_east'), 'not offered once due');
  b.follow = 'door';
  assert.equal(b.followed(), 'door');
});

test('Wenna stands on the Sill by the door, clear of the city\'s lairs, with all her words', () => {
  assert.ok(FOLK.length <= FOLK_MAX, `${FOLK.length} bodies for ${FOLK_MAX} places`);
  assert.ok(WENNA, 'no Wenna');
  assert.ok(Math.hypot(WENNA.post[0] - SILL_DOOR.x, WENNA.post[1] - SILL_DOOR.z) < 12, 'Wenna is far from the door');
  // (On the shelf, not down the drop.)
  assert.ok(Math.abs(terrainHeight(WENNA.post[0], WENNA.post[1]) - terrainHeight(SILL_DOOR.x, SILL_DOOR.z)) < 3);
  for (const l of LAIRS) if (l.lvl > 5) assert.ok(Math.hypot(l.x - WENNA.post[0], l.z - WENNA.post[1]) > 150, `Wenna is ${Math.hypot(l.x - WENNA.post[0], l.z - WENNA.post[1]) | 0} m from ${l.key} (level ${l.lvl})`);
  const L = LINES.fv_wenna;
  assert.ok(L.first?.length && L.about?.length && L.bye?.length);
  for (const part of ['morning', 'day', 'evening', 'night']) assert.ok(L.greet[part]?.length, part);
  for (const k of Object.keys(L.topics || {})) assert.ok(L.ask[k]?.length, `nothing to say about ${k}`);
  assert.doesNotMatch(describeWho('fv_wenna'), /_/);
});

test('every first-visit quest names someone, somewhere and something that is there', () => {
  const tooLong = (l, max, where) => assert.ok(String(l).length <= max, `${where}: ${String(l).length} letters: ${l}`);
  for (const id of IDS) {
    const R = FIRST_VISIT_RULES[id], q = QUESTS[id];
    assert.ok(q && q === FV_QUESTS[id], `${id} has no words`);
    assert.ok(WHO.has(q.giver), `${id}: no such giver ${q.giver}`);
    for (const k of ['title', 'accept', 'acceptLine', 'decline', 'declineLine']) assert.ok(q[k], `${id}.${k}`);
    assert.equal(q.journal.length, R.steps.length, `${id}: journal lines`);
    assert.ok(q.offer.length >= 2 && q.progress.length && q.done.length >= 1, id);
    for (const l of [...q.offer, q.acceptLine, q.declineLine, ...q.progress, ...q.done, ...(q.after || []), ...Object.values(q.others || {}).flat()]) tooLong(l, 280, id);
    for (const l of [q.accept, q.decline]) tooLong(l, 70, id);
    for (const st of R.steps) {
      for (const k of [st.enter, st.kill, ...(st.visit || [])].filter(Boolean)) {
        assert.ok(hasArea(k), `${id}: no such place ${k}`);
        const at = spotIn(k);
        assert.ok(at && areaAt(k, at.x, 30, at.z), `${id}: ${k} can't be stood in`);
      }
      if (st.kill?.startsWith('lair:')) { const l = LAIRS.find((q2) => q2.key === st.kill.slice(5)); assert.ok(l && st.n <= l.n + (l.boss ? 1 : 0), `${id}: ${st.kill} holds fewer than ${st.n}`); }
      if (st.talk) { assert.ok(WHO.has(st.talk), `${id}: nobody called ${st.talk}`); assert.ok(q.others?.[st.talk]?.length, `${id}: ${st.talk} has nothing to say`); }
      if (st.talk || st.back) assert.ok(st.say && st.say.length <= 70, `${id}: ${st.say}`);
    }
  }
});

test('the Redoubt is his: nothing of Tessariel\'s said down it or by the city\'s folk, and its bosses all have fights', () => {
  each(REDOUBT.names || {}, (l, p) => assert.doesNotMatch(l, T, `names${p}`));
  each(REDOUBT.words || {}, (l, p) => assert.doesNotMatch(l, T, `words${p}`));
  for (const k of Object.keys(WARNINGS)) if (/^(pen|car|rot)_/.test(k)) assert.doesNotMatch(String(WARNINGS[k]), T, k);
  each(FV_QUESTS.fv_the_way_down.others?.ph_penny, (l) => assert.doesNotMatch(l, T, 'ph_penny'));
  each(FV_QUESTS.fv_the_way_down.heard || {}, (l, p) => assert.doesNotMatch(l, T, `heard${p}`));
  for (const b of REDOUBT.bosses) { assert.ok(FIGHTS[b.key] && FIGHTS[b.key] === REDOUBT_FIGHTS[b.key], `${b.key} has no fight`); }
  assert.deepEqual(REDOUBT.bosses.find((b) => b.key === 'rothgar').needs, ['penwarden', 'carrow']);
});

test('each first-visit quest can be taken, walked through as the game reports it, and handed in', () => {
  const inside = (k) => { const p = spotIn(k); return [p.x, 30, p.z]; };
  for (const id of IDS) {
    const Q = book(), R = FIRST_VISIT_RULES[id], q = QUESTS[id];
    const owe = (need) => { for (const n of [need].flat()) if (n && !Q.q[n]) { Q.q[n] = { stage: 'done' }; owe(RULES[n].needs); } };
    owe(R.needs);
    assert.ok(Q.offers(q.giver).includes(id), `${id} isn't offered`);
    Q.begin(id);
    for (let k = 0; k < R.steps.length; k++) {
      const st = R.steps[k];
      assert.equal(Q.state(id).step, k, `${id} step ${k}`);
      if (st.enter) Q.where(...inside(st.enter), 12);
      else if (st.visit) for (const v of st.visit) Q.where(...inside(v), 12);
      else if (st.kill) {
        Q.kill(0, 20, 0, 5, 'Goblins');
        assert.equal(Q.state(id).n, 0, `${id}: a kill outside its lair counted`);
        for (let i = 0; i < st.n; i++) Q.kill(...inside(st.kill), 5, 'Goblins');
      } else if (st.boss) { Q.boss('nobody'); assert.equal(Q.state(id).step, k); Q.boss(st.boss); }
      else if (st.talk) {
        assert.equal(Q.mark(st.talk, {}, 0), 'ready', `${id}: no ? over ${st.talk}`);
        if (st.end) { Q.finish(id); assert.ok(Q.done(id)); continue; }
        Q.advance(id);
      } else if (st.back) assert.equal(Q.mark(q.giver, {}, 0), 'ready', `${id}: no ? over ${q.giver}`);
      if (!st.back) assert.equal(Q.state(id).step, k + 1, `${id}: step ${k} (${Object.keys(st)[0]}) didn't finish`);
    }
  }
});
