// Castle Velscour's wards (src/core/delve-castle.js): the Lower Ward, its two ways in (the world's portal and the Aqueduct's
// gate from the High Conduits), its rooms each a floor of the delve's own, the princess's quests into it and after its
// Gate Captain, and the Gate Captain himself weaker for each wing you've emptied first (src/sim/castle-fights.js).
//   node --test tests/castle.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, DELVES, caveRoom, delveByKey, roomSpot } from '../src/core/dungeon.js';
import { CASTLE, GATE_SLOTS } from '../src/core/delve-castle.js';
import { CASTLE_FIGHTS } from '../src/sim/castle-fights.js';
import { RULES } from '../src/folk/quests.js';
import { PHOBOS_LEVELS } from '../src/folk/phobos-quests.js';

const LW = delveByKey('lowerward');

test('the Lower Ward: a castle ward gone into alone, its gate to the High Conduits going both ways', () => {
  assert.deepEqual(CASTLE.map((d) => d.key), ['lowerward']);
  assert.equal(DELVES.includes(LW), true);
  assert.equal(LW.castle, true);
  assert.equal(LW.party, false);
  assert.ok(LW.portal, 'a way in from the world');
  for (const [n, l] of LW.links.entries()) assert.equal(delveByKey(l.to).links[l.n].to, 'lowerward', `its gate ${n} comes back`);
  for (const r of LW.rooms) { const [x, , z] = roomSpot(r.id); assert.ok(caveRoom(x, z) > 1, `${r.id}: its middle is in the open`); }
});

test("the Gate Captain: in his yard, the gate's slots across it, worth a champion's loot", () => {
  const b = BOSSES.find((q) => q.key === 'gatecaptain');
  assert.equal(b.delve, 'lowerward');
  assert.equal(b.room, 'cl_yard');
  assert.equal(b.loot, 8);
  const yard = LW.rooms.find((r) => r.id === 'cl_yard');
  for (const z of GATE_SLOTS) assert.ok(Math.abs(z - yard.z) < yard.hz - 4, `slot ${z} inside the yard`);
});

test("each wing you've emptied first leaves him less", () => {
  const spec = CASTLE_FIGHTS.gatecaptain;
  const fight = (cleared) => {
    const f = {}, warned = [];
    const W = { sim: { tripo: { lairs: cleared.map((key) => ({ key, state: 'cleared' })) } }, adds: () => [], warn: (w) => warned.push(w) };
    spec.step(W, f, [{ shrug: 1 }]);
    return { f, W, deck: spec.deck(f), adds: spec.adds.map((a) => (typeof a.n === 'function' ? a.n(W, f) : a.n)), warned };
  };
  const all = fight([]);
  assert.deepEqual(all.deck, ['cleave', 'charge', 'bash', 'gate', 'volley']);
  assert.deepEqual(all.adds, [3, 4]);
  assert.equal(all.warned.length, 0);
  assert.deepEqual(fight(['cl_bunks']).adds, [2, 2]);
  assert.equal(fight(['cl_armoury']).deck.includes('volley'), false);
  assert.equal(fight(['cl_oub']).deck.includes('gate'), false);
  assert.equal(fight(['cl_oub']).warned.length, 1);
  assert.deepEqual(fight(['cl_bunks', 'cl_armoury', 'cl_oub']).deck, ['cleave', 'charge', 'bash']);
});

test("the princess's two quests: up the Aqueduct into the ward, then the Gate Captain", () => {
  assert.deepEqual(RULES.up_the_aqueduct.steps[0], { enter: 'lowerward' });
  assert.equal(RULES.the_gate_captain.needs, 'up_the_aqueduct');
  assert.equal(RULES.the_gate_captain.steps[0].boss, 'gatecaptain');
  const lv = new Map(PHOBOS_LEVELS);
  assert.ok(lv.get('up_the_aqueduct') >= LW.level && lv.get('the_gate_captain') > lv.get('up_the_aqueduct'));
});
