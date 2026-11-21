// City State Phobos's three hubs and its first quests (src/core/phobos-hubs.js, src/folk/phobos-quests.js, words in
// src/folk/lines/phobos-hubs.js): the givers stand in their own yards, clear of the city's lairs; every quest has all its
// words and somewhere to go; the two letters keep apart; and each quest can be walked through to the end.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestBook, RULES, areaAt, hasArea, placeSpot } from '../src/folk/quests.js';
import { PHOBOS_RULES, PHOBOS_LEVELS } from '../src/folk/phobos-quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { LINES, QUESTS as HUB_QUESTS } from '../src/folk/lines/phobos-hubs.js';
import { FOLK, POSTED } from '../src/folk/people.js';
import { BEYOND } from '../src/folk/lines/beyond.js';
import { FOLK_MAX } from '../src/folk/layout.js';
import { LAIRS } from '../src/core/tripo-monsters.js';
import { MATS } from '../src/items/items.js';
import { HUB, inHub, hubPost } from '../src/core/phobos-hubs.js';
import { phobosHouses } from '../src/core/phobos-build.js';
import { questLevel } from '../src/ui/autobrain.js';
import { describe as describeWho } from '../src/ui/questlog.js';
import { delveByKey, roomOf, toWorld } from '../src/core/dungeon.js';

const IDS = Object.keys(PHOBOS_RULES);
const WHO = new Set([...FOLK, ...BEYOND].map((p) => p.id));
const HUBFOLK = POSTED.filter((p) => p.hub);
// Where to stand for a place: a delve's (the sewers') is down in its first hall past the way in, not at its mouth on the land.
const spotIn = (k) => {
  // (A room down a delve, 'room:<id>': its middle.)
  if (k.startsWith('room:')) { const r = roomOf(k.slice(5)), [x, z] = toWorld(r.x, r.z, r.delve); return { x, z }; }
  const d = delveByKey(k); if (!d) return placeSpot(k); const r = d.rooms[1], [x, z] = toWorld(r.x, r.z, d); return { x, z }; };
const book = () => new QuestBook({ change() {}, toast() {}, done() {} });

test('three hubs, each with its giver in its own yard, clear of the lairs and of the houses', () => {
  assert.ok(FOLK.length <= FOLK_MAX, `${FOLK.length} bodies for ${FOLK_MAX} places`);
  assert.equal(HUBFOLK.length, 3);
  for (const p of HUBFOLK) {
    assert.equal(inHub(...p.post)?.key, p.hub, `${p.id} stands outside the ${p.hub} yard`);
    assert.deepEqual(p.post, hubPost(p.hub).post, `${p.id}: post moved (src/core/phobos-hubs.js hubPost)`);
    assert.ok(LINES[p.id], `${p.id} has nothing to say`);
    // (A hundred metres and more from the city's lairs, whose own come no further than seventy.)
    for (const l of LAIRS) assert.ok(Math.hypot(l.x - p.post[0], l.z - p.post[1]) > 100, `${p.id} is ${Math.hypot(l.x - p.post[0], l.z - p.post[1]) | 0} m from ${l.key}`);
    assert.ok(IDS.some((id) => QUESTS[id].giver === p.id), `${p.id} gives nothing`);
    assert.doesNotMatch(describeWho(p.id), /_/);
  }
  // Nothing of the city's built in a yard but the hub's own halls.
  for (const h of phobosHouses()) if (!h.hub && !h.spire) assert.equal(inHub(h.x, h.z), null, `a house at ${h.x | 0}, ${h.z | 0} in a hub's yard`);
  assert.equal(phobosHouses().filter((h) => h.hub).length, 4);
  assert.ok(HUB.pennyless && HUB.watch && HUB.ash);
});

test('every Phobos quest names someone, somewhere and something that is there, at a level from twenty up', () => {
  for (const id of IDS) {
    const R = PHOBOS_RULES[id], q = QUESTS[id];
    assert.equal(RULES[id], R, id);
    assert.ok(q && q === HUB_QUESTS[id], `${id} has no words`);
    assert.ok(WHO.has(q.giver), `${id}: no such giver ${q.giver}`);
    if (R.needs) assert.ok(PHOBOS_RULES[R.needs], `${id} needs ${R.needs}`);
    const end = R.steps.at(-1);
    assert.ok(end.back || end.bring || (end.talk && end.end), `${id} ends with nobody`);
    for (const st of R.steps) {
      for (const k of [st.enter, st.kill, ...(st.visit || [])].filter(Boolean)) {
        assert.ok(hasArea(k), `${id}: no such place ${k}`);
        const at = spotIn(k);
        assert.ok(at && areaAt(k, at.x, at.y ?? 30, at.z), `${id}: ${k} can't be stood in`);   // (a lookout has a height of its own)
      }
      if (st.kill?.startsWith('lair:')) {
        const l = LAIRS.find((q2) => q2.key === st.kill.slice(5));
        assert.ok(l && st.n <= (l.boss ? 1 : 0) + l.n, `${id}: ${st.kill} holds fewer than ${st.n}`);
      }
      if (st.talk) { assert.ok(WHO.has(st.talk), `${id}: nobody called ${st.talk}`); assert.ok(q.others?.[st.talk]?.length, `${id}: ${st.talk} has nothing to say`); }
      if (st.bring) assert.ok(MATS[st.bring], `${id}: no such thing as ${st.bring}`);
      if (st.talk || st.back) assert.ok(st.say && st.say.length <= 70, `${id}: ${st.say}`);
    }
    assert.ok(questLevel(id) >= 20, `${id}: level ${questLevel(id)}`);
  }
  assert.equal(PHOBOS_LEVELS.length, IDS.length);
});

test('every Phobos quest and giver has all their words, none too long for the panel', () => {
  const tooLong = (l, max, where) => assert.ok(String(l).length <= max, `${where}: ${String(l).length} letters: ${l}`);
  for (const id of IDS) {
    const q = QUESTS[id];
    for (const k of ['title', 'accept', 'acceptLine', 'decline', 'declineLine']) assert.ok(q[k], `${id}.${k}`);
    assert.equal(q.journal.length, PHOBOS_RULES[id].steps.length, `${id}: journal lines`);
    assert.ok(q.offer.length >= 2 && q.progress.length && q.done.length >= 2 && q.after.length, id);
    for (const l of [...q.offer, q.acceptLine, q.declineLine, ...q.progress, ...q.done, ...q.after, ...Object.values(q.others || {}).flat()]) tooLong(l, 280, id);
    for (const l of q.journal) tooLong(l, 320, id);
    for (const l of [q.accept, q.decline]) tooLong(l, 70, id);
  }
  for (const [who, L] of Object.entries(LINES)) {
    assert.ok(L.first?.length && L.about?.length && L.bye?.length, who);
    for (const part of ['morning', 'day', 'evening', 'night']) assert.ok(L.greet[part]?.length, `${who} ${part}`);
    for (const l of [...L.first, ...Object.values(L.greet).flat(), ...L.about, ...Object.values(L.ask || {}).flat()]) tooLong(l, 280, who);
    for (const l of [...L.bye, ...Object.values(L.barks || {}).flat()]) tooLong(l, 90, who);
    for (const k of Object.keys(L.topics || {})) assert.ok(L.ask[k]?.length, `${who}: nothing to say about ${k}`);
  }
});

test('the two letters keep apart: nothing of the other side in the city, and the Quiet Watch name nobody', () => {
  const T = /Tessariel|Bell Tower|Four Watches|\bseal\b|\bseals\b|sunburst|abbey|chapel|shrine|Bellwright|Anselm|the tower\b/i;
  const each = (o, f, path = '') => { if (typeof o === 'string') f(o, path); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) each(v, f, `${path}.${k}`); };
  each(LINES, (line, path) => assert.doesNotMatch(line, T, path));
  each(HUB_QUESTS, (line, path) => assert.doesNotMatch(line, T, path));
  for (const id of IDS) for (const st of PHOBOS_RULES[id].steps) if (st.say) assert.doesNotMatch(st.say, T, id);
});

test('each Phobos quest can be taken, walked through as the game reports it, and handed in', () => {
  const inside = (k) => { const p = spotIn(k); return [p.x, p.y ?? 30, p.z]; };
  for (const id of IDS) {
    const Q = book(), R = PHOBOS_RULES[id], q = QUESTS[id];
    for (let need = R.needs; need; need = RULES[need].needs) Q.q[need] = { stage: 'done' };
    assert.ok(Q.offers(q.giver).includes(id), `${id} isn't offered`);
    Q.begin(id);
    for (let k = 0; k < R.steps.length; k++) {
      const st = R.steps[k];
      assert.equal(Q.state(id).step, k, `${id} step ${k}`);
      if (st.enter) {
        // (Outside the city first, or by day for a night's step: it doesn't count; then there.)
        Q.where(9000, 20, 0, st.night ? 23 : 12); assert.equal(Q.state(id).step, k, `${id}: ${st.enter} counted outside`);
        if (st.night) { Q.where(...inside(st.enter), 12); assert.equal(Q.state(id).step, k, `${id}: counted by day`); }
        Q.where(...inside(st.enter), st.night ? 23 : 12);
      } else if (st.visit) {
        for (const v of st.visit) Q.where(...inside(v), 12);
      } else if (st.kill) {
        Q.kill(9000, 20, 0, 5, 'Goblins');
        assert.equal(Q.state(id).n, 0, `${id}: a kill outside its lair counted`);
        for (let i = 0; i < st.n; i++) Q.kill(...inside(st.kill), 5, 'Goblins');
      } else if (st.boss) {
        Q.boss('nobody'); assert.equal(Q.state(id).step, k, `${id}: another's death counted`);
        Q.boss(st.boss);
      } else if (st.talk) {
        assert.equal(Q.mark(st.talk, {}, 0), 'ready', `${id}: no ? over ${st.talk}`);
        if (st.end) { Q.finish(id); assert.ok(Q.done(id)); continue; }
        Q.advance(id);
      } else if (st.bring) {
        assert.equal(Q.mark(q.giver, { [st.bring]: st.n }, 0), 'ready', id);
      } else if (st.back) {
        assert.equal(Q.mark(q.giver, {}, 0), 'ready', `${id}: no ? over ${q.giver}`);
      }
      if (!st.back && !st.bring) assert.equal(Q.state(id).step, k + 1, `${id}: step ${k} (${Object.keys(st)[0]}) didn't finish`);
    }
    if (R.steps.at(-1).end) continue;
    assert.equal(Q.handIn(id, 3), 'done', id);
    assert.ok(Q.done(id), id);
  }
});
