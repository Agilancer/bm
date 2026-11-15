// The party's skill trees (src/core/partytree.js): every class's three branches, the moves it starts with the same as the
// sim's (src/sim/hero.js SKILLS), points as levels give them, and the spending done for them never past what's allowed.
//   node --test tests/party-tree.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS } from '../src/sim/hero.js';
import { FIRST_MOVES, TREES, NODES, freshTree, rank, spend, spentIn, pointsAt, pointsLeft, autoSpend, treeMods, why, respecCost, CAP_LEVEL, PASSIVE_MAX } from '../src/core/partytree.js';

const CLASSES = Object.keys(SKILLS);

test('the moves each class starts with are the sim\'s, in its order', () => {
  for (const cls of CLASSES) {
    assert.deepEqual((FIRST_MOVES[cls] || []).map((m) => m[0]), SKILLS[cls].map((s) => s.key), cls);
  }
});

test('every class has three branches, each with three moves or more, two passives and a capstone; no node twice', () => {
  for (const cls of CLASSES) {
    const tree = TREES[cls];
    assert.equal(tree.length, 3, cls);
    const ids = new Set();
    for (const br of tree) {
      assert.ok(br.name, `${cls}: a branch with a name`);
      assert.ok(br.nodes.filter((n) => n.kind === 'move').length >= 3, `${cls} ${br.name}: three moves at least`);
      assert.equal(br.nodes.filter((n) => n.kind === 'passive').length, 2, `${cls} ${br.name}: two passives`);
      assert.equal(br.nodes.filter((n) => n.kind === 'cap').length, 1, `${cls} ${br.name}: one capstone`);
      for (const n of br.nodes) { assert.ok(!ids.has(n.id), `${cls}: ${n.id} once`); ids.add(n.id); }
    }
  }
});

test('a fresh tree knows the starting moves at rank one, and nothing else', () => {
  for (const cls of CLASSES) {
    const t = freshTree(), m = treeMods(cls, t);
    assert.deepEqual([...m.known].sort(), SKILLS[cls].map((s) => s.key).sort(), cls);
    for (const k of m.known) assert.equal(m.moves[k].power, 1);
    assert.equal(m.dmg + m.hp + m.ward + m.tempo + m.grace + m.thirst, 0);
  }
});

test('a point a level, gates kept: not before its level, not past its top, not with none left', () => {
  const cls = 'lancer', t = freshTree();
  assert.equal(pointsAt(1), 0);
  assert.equal(pointsAt(10), 9);
  assert.equal(pointsLeft(cls, t, 1), 0);
  assert.match(why(cls, t, 1, 'hit_dmg'), /No points left/);
  const cap = Object.values(NODES[cls]).find((n) => n.kind === 'cap');
  assert.match(why(cls, t, 40, cap.id), /Wants \d+ points/);
  assert.match(why(cls, t, 5, cap.id), /Opens at level/);
  const passive = Object.values(NODES[cls]).find((n) => n.kind === 'passive');
  let n = 0;
  while (spend(cls, t, 200, passive.id)) n++;
  assert.equal(n, PASSIVE_MAX);
  assert.equal(rank(cls, t, passive.id), PASSIVE_MAX);
  assert.match(why(cls, t, 200, passive.id), /As high as it goes/);
});

test('spent for them: every point at every level, never more, the role leaned on, the caps on the sums held', () => {
  for (const cls of CLASSES) {
    for (const [level, role] of [[2, 'dps'], [9, 'tank'], [CAP_LEVEL, 'heal'], [60, 'dps'], [200, 'tank']]) {
      const t = freshTree();
      autoSpend(cls, t, level, role);
      assert.equal(spentIn(cls, t), Math.min(pointsAt(level), Object.values(NODES[cls]).reduce((s, n) => s + n.max - (n.first ? 1 : 0), 0)), `${cls} at ${level}: all spent`);
      for (const [id, r] of Object.entries(t.ranks)) assert.ok(rank(cls, t, id) <= NODES[cls][id].max, `${cls} ${id} within its top`);
      const m = treeMods(cls, t);
      assert.ok(m.ward <= 0.6 && m.tempo <= 0.4, `${cls} at ${level}: capped`);
    }
    // (A level up later spends only what it brought.)
    const t = freshTree();
    autoSpend(cls, t, 10, 'dps');
    const before = spentIn(cls, t);
    autoSpend(cls, t, 11, 'dps');
    assert.equal(spentIn(cls, t) - before, 1, `${cls}: one more point at the next level`);
  }
});

test('every point back costs gold, and nothing if none were spent', () => {
  assert.equal(respecCost(30, 0), 0);
  assert.ok(respecCost(30, 10) > respecCost(10, 10));
});
