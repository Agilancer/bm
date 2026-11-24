// The lands' and the delves' scenery (src/core/sites.js). Built without its corners (the simulation's way, buildSites()),
// it's the same in everything that stops a body or is stood on. Its corners, where they're built, are typed arrays: the
// land's are let go once they're on the GPU, and the delves' are built a delve at a time, the same as all at once.
// (They were plain lists, all of them kept for good on two threads: 150 MB each, and a phone's browser closed the game
// for it.)   node --test tests/sites-lean.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Kit, UNDER_KEYS, buildSites, buildUnder, dropSiteGeometry } from '../src/core/sites.js';

const typed = (p) => p.pos instanceof Float32Array && p.nrm instanceof Float32Array && p.uv instanceof Float32Array && p.idx instanceof Uint32Array;
const whole = (p) => { let most = -1; for (const i of p.idx) if (i > most) most = i; return p.pos.length === p.nrm.length && p.pos.length / 3 === p.uv.length / 2 && most < p.pos.length / 3; };

test('built without corners, the scenery stops and holds a body just the same', () => {
  const lean = buildSites();
  assert.equal(lean.parts.size, 0, 'no corners unless asked for');
  const keep = JSON.stringify([lean.colliders, lean.floors, lean.fires, lean.spots, [...lean.groups.keys()]]);
  const full = buildSites(true);
  assert.notEqual(full, lean, 'asked for corners, it builds again');
  assert.equal(JSON.stringify([full.colliders, full.floors, full.fires, full.spots, [...full.groups.keys()]]), keep);
  assert.equal(buildSites(), full, 'and what has them does for those who don\'t want them');
});

test('the land\'s corners are typed arrays of just their length, and can be let go', () => {
  const full = buildSites(true);
  let verts = 0;
  for (const p of full.parts.values()) { assert.ok(typed(p) && whole(p)); verts += p.pos.length / 3; }
  // (A PC's land has the outposts' fences, tents and stones as well, src/core/wild-dress.js, and the roads' carts, stumps and
  // cold fires, src/core/roadside.js; a phone's, below, hasn't.)
  // (A PC's ceiling raised to 1.8 million, 2026-11-19, for the castle the owner asked for ("make this shit look amazing"):
  // its stairs walled, its spires' decks, his V on every battlement. A phone's, below, is where memory bites, and it's not.)
  // (And to 1.9 million, 2026-11-22, for the camps the quests are given at, src/core/camps.js: 85,000 more, tents and all.)
  assert.ok(verts > 150000 && verts < 1900000,   // (a million and a half with Phobos blocked out: src/core/phobos-build.js. It wants a build of its own, like the delves', before it's detailed.)
    `${verts} corners: the land's, and none of the delves'`);
  const phone = buildSites(true, true);
  let pv = 0;
  for (const p of phone.parts.values()) { assert.ok(typed(p) && whole(p)); pv += p.pos.length / 3; }
  // (975,000 since the camps, 2026-11-22: a phone has each camp's fire, one shelter, its cart and its landmark, 21,000
  // corners among the twenty-nine of them and the dens pinned by them: about 0.7 MB.)
  // (980,000 since the quest loop's camps were finished, 2026-11-23: Marchfoot's fold, Isla's mother's cairn on the Crown and
  // the dens pinned by the Fells' camps, 2,500 corners, under a tenth of a megabyte.)
  // (985,000 since the Gallowswood's lairs were dressed as their words say, 2026-11-23: the gibbets' irons and the forked-pole
  // roost, 6,000 corners, about 0.2 MB.)
  // (987,000 since three lairs were stood by the roads of the longest errands with nothing on them, 2026-11-23: the March
  // Road's demons, the Throne Road's werebat and the Frost Road's kobolds, src/core/tripo-monsters.js roadside: their camps'
  // dress, 2,100 corners, under a tenth of a megabyte. No lane of their own: that was 5,000 more.)
  // (989,000 since the footpaths by Lisandra's cave were taken up, 2026-11-23, tools/roads/lay.mjs: none of their own, but the
  // ways after them in the list moved up, and src/core/roadside.js throws each way's dice by its place in it, so the roads'
  // fences and signposts came out a little otherwise all over: 3,100 corners, about 0.1 MB, the dice's and no one's.)
  assert.ok(pv > 150000 && pv < 989000, `${pv} corners on a phone`);   // (as above: Phobos's block-out is 350,000 of them even with flat-lidded houses, and a phone holds them all; and its sewers' eight stairs down)
  assert.equal(phone.colliders.length, full.colliders.length, 'a phone is stopped by what a PC is');
  dropSiteGeometry();
  assert.equal(buildSites().parts.size, 0);
  assert.ok(buildSites().colliders.length > 1000, 'the rest stays');
  assert.ok(buildSites(true).parts.size > 0, 'and they can be built again');
});

test('a delve built on its own is what it is built with the rest, and its groups are in its own corners', () => {
  const all = buildUnder(), sum = new Map();
  let groups = 0, most = 0;
  for (const key of UNDER_KEYS) {
    const one = buildUnder(key);
    let verts = 0;
    for (const [layer, p] of one.parts) {
      assert.ok(typed(p) && whole(p), `${key} ${layer}`);
      verts += p.pos.length / 3;
      // (Each layer of them all is each delve's, one after another, in the order they're built in.)
      const at = sum.get(layer) || 0, a = all.parts.get(layer);
      for (let i = 0; i < p.pos.length; i += 997) assert.equal(p.pos[i], a.pos[at * 3 + i], `${key} ${layer} ${i}`);
      assert.equal(p.pos.at(-1), a.pos[at * 3 + p.pos.length - 1]);
      sum.set(layer, at + p.pos.length / 3);
    }
    assert.ok(verts > 100 && verts < 400000, `${key}: ${verts} corners`);
    most = Math.max(most, verts);
    for (const [k, g] of one.groups) for (const r of g.ranges) { groups++; assert.ok(r.under && r.v1 > r.v0 && one.parts.get(r.layer).pos.length / 3 >= r.v1, k); }
    assert.equal(buildSites().groups.size >= one.groups.size, true);
  }
  for (const [layer, p] of all.parts) assert.equal(sum.get(layer), p.pos.length / 3, layer);
  assert.ok(groups > 0, 'some delve has scenery that comes and goes');
  let total = 0; for (const p of all.parts.values()) total += p.pos.length / 3;
  assert.ok(most < total / 3, `the biggest delve is ${most} of ${total} corners`);
  assert.throws(() => buildUnder('nowhere'));
});

test('a kit that builds no corners takes every shape without complaint', () => {
  const K = new Kit(false);
  K.box('stone', 0, 0, 0, 1, 1, 1);
  K.quad('stone', [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]);
  K.tri('stone', [0, 0, 0], [1, 0, 0], [1, 1, 0]);
  K.group('g', true, () => K.box('wood', 4, 0, 4, 1, 1, 1));
  assert.equal(K.parts.size, 0);
  assert.equal(K.colliders.length, 2);
  assert.deepEqual(K.groups.get('g').ranges, []);
});
