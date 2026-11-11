// The six trees' rules (src/sim/skills.js) and the book that keeps what's learned (src/items/skillbook.js).
//   node --test tests/skills.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS } from '../src/sim/spells.js';
import { MAX_RANK, NODES, SCROLLS, STARTERS, TIER_LEVEL, TIER_OF, TIER_POINTS, TREES, TREE_OF, blocked, effective, pointsAt, spent, startFree, startRanks } from '../src/sim/skills.js';
import { SkillBook } from '../src/items/skillbook.js';

test('six schools of ten spells, two branches each and a mastery, and every spell in one of them', () => {
  assert.deepEqual(TREES.map((t) => t.name), ['Fire', 'Ice', 'Earth', 'Arcane', 'Lightning', 'Utility']);
  for (const t of TREES) {
    assert.ok(t.spells.length >= 10, `${t.name} has ten spells`);
    assert.equal(t.spells.filter((n) => n.tier === 0).length, 1, `${t.name} starts with one spell`);
    for (const n of t.spells) {
      assert.equal(n.augs.length, 2);
      for (const k of n.req) assert.ok(NODES[k].tree === n.tree && NODES[k].tier < n.tier, `${n.key} grows from an earlier spell of its own school`);
      if (n.tier > 0) assert.ok(n.req.length, `${n.key} grows from something`);
    }
  }
  assert.ok(SPELLS.every((_, i) => TREE_OF[i] >= 0));
  assert.deepEqual(STARTERS.map((i) => SPELLS[i].key), ['firebolt', 'frost', 'stone', 'missiles', 'spark', 'wisp']);
});

test('a new game knows the six first spells, for no points', () => {
  const ranks = startRanks(), free = startFree();
  assert.equal(spent(ranks, free), 0);
  assert.equal(pointsAt(1), 0);
  assert.equal(pointsAt(2), 1);
  assert.equal(pointsAt(5), 5);       // (four levels, and the fifth's own)
  assert.equal(pointsAt(50), 59);
});

test('a spell wants its level, a spell it grows from, and points already in its school', () => {
  const ranks = startRanks(), free = startFree();
  assert.match(blocked(ranks, free, 1, 'firebeam'), /level 2/);
  assert.equal(blocked(ranks, free, 2, 'firebeam'), null);
  assert.match(blocked(ranks, free, 6, 'wallfire'), /Fire Beam/);
  ranks.firebeam = 1;
  assert.match(blocked(ranks, free, 6, 'wallfire'), /3 points/);
  ranks.firebolt = 3;                  // (two points: the first rank was free)
  assert.equal(spent(ranks, free, NODES.firebolt.tree), 3);
  assert.equal(blocked(ranks, free, 6, 'wallfire'), null);
  assert.match(blocked(ranks, free, 5, 'wallfire'), /level 6/);
});

test('a spell goes one way or the other, and is raised before it is shaped', () => {
  const ranks = startRanks(), free = startFree();
  assert.match(blocked(ranks, free, 10, 'firebolt:searing'), /rank 2/);
  ranks.firebolt = 2;
  assert.equal(blocked(ranks, free, 10, 'firebolt:searing'), null);
  ranks['firebolt:searing'] = 1;
  assert.match(blocked(ranks, free, 10, 'firebolt:banked'), /Searing Core/);
  assert.match(blocked(ranks, free, 10, 'firebolt:searing'), /rank 3/);
  ranks.firebolt = MAX_RANK;
  assert.match(blocked(ranks, free, 10, 'firebolt'), /As far as it goes/);
});

test('ranks and branches change the numbers a spell is cast with', () => {
  const i = SPELLS.findIndex((d) => d.key === 'missiles'), one = effective(i, { missiles: 1 }), five = effective(i, { missiles: 5 });
  assert.ok(five.volley > one.volley && five.every < one.every && five.dmg > one.dmg && five.salvo === 3 && one.salvo === 1, 'Magic Missiles: more of them, gathered faster, three at a time');
  assert.ok(one.interval <= 0.14, 'and loosed much faster than the old half second');
  const f = SPELLS.findIndex((d) => d.key === 'firebolt');
  assert.equal(effective(f, null).dmg, SPELLS[f].dmg);
  assert.ok(effective(f, { firebolt: 3, 'firebolt:searing': 2 }).gather < SPELLS[f].gather);
  assert.ok(effective(f, { firebolt: 1, '@fire': 5 }).dmg > SPELLS[f].dmg && effective(f, { firebolt: 1, '@fire': 5 }).mana < SPELLS[f].mana);
  assert.equal(SPELLS[f].i, undefined, 'the rows themselves are left alone');
});

test('the book: points by level, spending, a scroll, unlearning, and the save', () => {
  let level = 1, told = 0;
  const S = new SkillBook(() => level);
  S.onChange = () => told++;
  assert.equal(S.points, 0);
  assert.equal(S.spend('mend'), false);
  level = 6;
  assert.equal(S.points, 6);
  assert.ok(S.spend('mend') && S.known(SPELLS.findIndex((d) => d.key === 'mend')));
  assert.equal(S.points, 5);
  // A scroll: the first rank for nothing, at the tier's level and not before; never a spell of the last two tiers.
  const cone = SPELLS.findIndex((d) => d.key === 'coldcone'), nova = SPELLS.findIndex((d) => d.key === 'nova');
  assert.ok(SCROLLS.includes(cone) && SCROLLS.includes(nova) && SCROLLS.every((i) => TIER_OF[i] >= 1 && TIER_OF[i] <= 2));
  assert.ok(S.teach(cone) && !S.teach(cone));
  assert.equal(S.points, 5, 'a scroll costs no point');
  level = 5;
  assert.equal(S.teach(nova), false, 'not below its tier\'s level');
  level = 6;
  assert.ok(told >= 2);
  // Kept, and read back.
  const kept = JSON.parse(JSON.stringify(S.save())), T = new SkillBook(() => level);
  T.load(kept);
  assert.deepEqual(T.ranks, S.ranks);
  assert.equal(T.points, S.points);
  // Unlearned: every point back; what the scroll taught stays.
  S.unlearn();
  assert.equal(S.spent, 0);
  assert.ok(!S.known(SPELLS.findIndex((d) => d.key === 'mend')) && S.known(cone));
  // A save from before the trees: the six first spells, and the level's points to spend.
  const old = new SkillBook(() => 12);
  old.load(null);
  assert.equal(old.points, pointsAt(12));
  assert.deepEqual(Object.keys(old.ranks).sort(), STARTERS.map((i) => SPELLS[i].key).sort());
  assert.deepEqual(TIER_LEVEL.length, TIER_POINTS.length);
});
