// The quest loop (docs/QUEST-LOOP.md, README "The quest loop"): work is given at a hub, done near it and paid there, and
// each hub's last errand sends you on to the next. No quest sends you a country away and back. The rules are
// tools/quests/rules.mjs; `node tools/quests/check.mjs <region>` lists what breaks them in one part of the land.
import test from 'node:test';
import assert from 'node:assert/strict';
import { violations, table, LOCAL, LEAD, TOWN_MAX } from '../tools/quests/rules.mjs';
import { CAMPS, DENS, campPost } from '../src/core/camps-data.js';
import { OUTPOSTS } from '../src/core/wilds-data.js';
import { SITES } from '../src/core/lands.js';
import { POSTED } from '../src/folk/people.js';
import { QuestBook, RULES, gatherSpots, GATHER_REACH } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';

const say = (list) => list.map((v) => `${v.hub || '?'}${v.quest ? ` / ${v.quest}` : ''}: ${v.say}`).join('\n');

test(`no quest sends you more than ${LOCAL} m from its giver and back, and no errand goes further than ${LEAD} m`, () => {
  const v = violations().filter((q) => q.rule === 'local' || q.rule === 'lead');
  assert.equal(v.length, 0, say(v));
});

test(`Bellmourn gives ${TOWN_MAX} quests at most; the rest of the work is out in the land`, () => {
  const v = violations().filter((q) => q.rule === 'town');
  assert.equal(v.length, 0, say(v));
  const T = table(), out = T.filter((q) => q.hub !== 'bellmourn' && q.hub !== 'phobos').length;
  assert.ok(out >= 90, `${out} quests are given out in the land`);
});

test('every camp has somebody posted, somebody to sell to, and work of its own', () => {
  const v = violations().filter((q) => q.rule === 'camp');
  assert.equal(v.length, 0, say(v));
  // (And whoever's posted at a camp stands where the camp keeps clear for them.)
  for (const p of POSTED.filter((q) => q.camp)) {
    const c = CAMPS.find((k) => k.key === p.camp);
    assert.ok(c, `${p.id}: no camp ${p.camp}`);
    assert.ok([0, 1, 2, 3].some((i) => { const [x, z] = campPost(c.key, i); return Math.hypot(x - p.post[0], z - p.post[1]) < 0.2; }), `${p.id} isn't on one of ${c.key}'s posts`);
  }
});

test('every hub is come to by an errand from another, all the way back to Bellmourn, and sends you on', () => {
  const v = violations().filter((q) => q.rule === 'reach' || q.rule === 'on' || q.rule === 'needs' || q.rule === 'giver');
  assert.equal(v.length, 0, say(v));
});

test("a hub's work is of several kinds, at lairs and dens of a level with it", () => {
  const v = violations().filter((q) => ['kinds', 'den', 'level', 'boss'].includes(q.rule));
  assert.equal(v.length, 0, say(v));
});

test('the dens pinned for the camps stand within reach of them', () => {
  for (const d of DENS) {
    const o = OUTPOSTS.find((q) => q.key === d.key), s = SITES[d.camp];
    assert.ok(o, `${d.key} was never stood (run node tools/wilds/place.mjs)`);
    assert.ok(s, `${d.key}: no place ${d.camp}`);
    assert.equal(o.name, d.name);
    assert.ok(Math.hypot(o.x - s.x, o.z - s.z) < LOCAL - 40, `${d.key} is ${Math.round(Math.hypot(o.x - s.x, o.z - s.z))} m from ${d.camp}`);
  }
});

test('a den emptied and things gathered move their quests on', () => {
  const notes = [], Q = new QuestBook({ change() {}, toast: (t) => notes.push(t), done() {} });
  const clear = Object.keys(RULES).find((id) => RULES[id].steps.some((s) => s.clear)), gather = Object.keys(RULES).find((id) => RULES[id].steps.some((s) => s.gather));
  assert.ok(clear, 'some quest has a den to empty');
  assert.ok(gather, 'some quest has something to gather');
  // Emptying the den, with the quest in hand: on to its next step.
  { const i = RULES[clear].steps.findIndex((s) => s.clear);
    Q.q[clear] = { stage: 'active', step: i, n: 0 };
    Q.cleared(RULES[clear].steps[i].clear);
    assert.equal(Q.state(clear).step, i + 1, `${clear} moved on`); }
  // Walking up to each thing: counted, and on at the last.
  { const i = RULES[gather].steps.findIndex((s) => s.gather), st = RULES[gather].steps[i], spots = gatherSpots(gather, st);
    assert.equal(spots.length, st.n, `${gather}: ${st.n} to gather, ${spots.length} lying there`);
    for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) assert.ok(Math.hypot(spots[a][0] - spots[b][0], spots[a][1] - spots[b][1]) > GATHER_REACH * 2, `${gather}: two of them lie on top of each other`);
    Q.q[gather] = { stage: 'active', step: i, n: 0 };
    assert.equal(Q.marks().filter((m) => m.id === gather).length, st.n);
    spots.forEach(([x, z], k) => { Q.where(x + 1, 0, z, 12); if (k < spots.length - 1) assert.equal(Q.state(gather).n, k + 1); });
    assert.equal(Q.state(gather).step, i + 1, `${gather} moved on`);
    assert.equal(Q.marks().filter((m) => m.id === gather).length, 0); }
  void QUESTS;
});
