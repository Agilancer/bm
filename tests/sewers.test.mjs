// Phobos's sewers (src/core/delve-sewers.js): four sectors end to end, two ways down into each from the city's streets and a
// gate at each end into the next; the keepers in their office and the princess in her garden, stood on the delves' own
// floors; their quests going into every sector and after every great thing down there; and the caps they want, which grow
// on what dies there and nowhere else.   node --test tests/sewers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, DELVES, caveFloorY, caveRoom, delveAt, delveByKey, toWorld } from '../src/core/dungeon.js';
import { SEWERS } from '../src/core/delve-sewers.js';
import { SEWER_MOUTHS, inSealSquare } from '../src/core/phobos-seals.js';
import { cityIn } from '../src/core/east.js';
import { phobosHouses } from '../src/core/phobos-build.js';
import { POSTED } from '../src/folk/people.js';
import { RULES } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { LINES } from '../src/folk/lines/phobos-hubs.js';
import { PHOBOS_LEVELS } from '../src/folk/phobos-quests.js';
import { MATS, makeRng } from '../src/items/items.js';
import { capsOf } from '../src/items/drops.js';

const DOWN = POSTED.filter((p) => p.sewer);

test('four sectors, each with two mouths in the city and gates that go both ways', () => {
  assert.deepEqual(SEWERS.map((d) => d.key), ['westdrains', 'sloughmains', 'charnelruns', 'highconduits']);
  for (const d of SEWERS) {
    assert.equal(DELVES.includes(d), true);
    for (const p of [d.portal, ...d.ways]) {
      assert.ok(cityIn(p.x, p.z) < 1, `${d.key}: a mouth outside the city's wall at ${p.x}, ${p.z}`);
      assert.equal(delveAt(p.x, p.z), null);
    }
    for (const w of d.ways) { const [x, z] = toWorld(w.in.x + Math.sin(w.in.yaw) * 4, w.in.z + Math.cos(w.in.yaw) * 4, d); assert.ok(caveRoom(x, z) > 1.2, `${d.key}: you come down its second mouth into the rock`); }
    for (const l of d.links) {
      const o = delveByKey(l.to), back = o.links[l.n], [x, z] = toWorld(back.x + Math.sin(back.yaw) * 4, back.z + Math.cos(back.yaw) * 4, o);
      assert.equal(back.to, d.key, `${d.key} -> ${l.to}: no gate back`);
      assert.ok(caveRoom(x, z) > 1.2, `${d.key} -> ${l.to}: you come through into the rock`);
    }
  }
  // (Each next to the one after it, west to east.)
  for (let i = 0; i + 1 < SEWERS.length; i++) assert.ok(SEWERS[i].links.some((l) => l.to === SEWERS[i + 1].key), `${SEWERS[i].key} has no gate east`);
  // No house of the city on a mouth's stair.
  assert.equal(SEWER_MOUTHS.length, 8);
  for (const h of phobosHouses()) if (!h.yard) assert.equal(SEWER_MOUTHS.includes(inSealSquare(h.x, h.z)), false, `a house at ${h.x | 0}, ${h.z | 0} on a sewer's mouth`);
});

test('the keepers and the princess stand on the floor of their own sector, with things to say', () => {
  assert.deepEqual(DOWN.map((p) => p.id).sort(), ['apricot', 'louis_g', 'martleboro']);
  for (const p of DOWN) {
    const [x, z, y] = p.post;
    assert.equal(delveAt(x, z), p.sewer, p.id);
    assert.ok(caveRoom(x, z) > 0.8, `${p.id} stands in the wall`);
    assert.ok(Math.abs(caveFloorY(x, z) - y) < 0.3, `${p.id}: post's y ${y}, floor ${caveFloorY(x, z).toFixed(2)}`);
    assert.ok(LINES[p.id]?.first && LINES[p.id].about && LINES[p.id].bye, `${p.id} has nothing to say`);
    // (Clear of every pack down there: a hundred metres and more from where any of them stands.)
    const d = delveByKey(p.sewer);
    for (const k of d.packs) { const r = d.rooms.find((q) => q.id === k.room), [px, pz] = toWorld(r.x + (k.at?.[0] || 0), r.z + (k.at?.[1] || 0), d); assert.ok(Math.hypot(px - x, pz - z) > 45, `${p.id} is ${Math.hypot(px - x, pz - z) | 0} m from ${k.key}`); }
  }
});

test('their quests go into every sector and after every great thing down there, in order of level', () => {
  const ids = Object.keys(RULES).filter((id) => ['martleboro', 'louis_g', 'apricot'].includes(QUESTS[id]?.giver) || id === 'down_the_drains');
  assert.ok(ids.length >= 9, ids.join());
  const steps = ids.flatMap((id) => RULES[id].steps);
  for (const d of SEWERS) {
    assert.ok(steps.some((s) => s.enter === d.key || s.kill === d.key || s.at === d.key || BOSSES.find((b) => b.key === s.boss)?.delve === d.key), `nothing sends you into ${d.key}`);
    assert.ok(steps.some((s) => s.boss === d.last), `no quest for ${d.last}`);
  }
  for (const who of ['martleboro', 'louis_g', 'apricot']) assert.ok(steps.some((s) => s.talk === who) || ids.some((id) => QUESTS[id].giver === who), who);
  const lv = new Map(PHOBOS_LEVELS);
  for (const id of ids) {
    assert.ok(lv.has(id), `${id}: no level`);
    const q = QUESTS[id];
    assert.equal(q.journal.length, RULES[id].steps.length, `${id}: a journal line for each step`);
    if (RULES[id].needs) assert.ok(lv.get(RULES[id].needs) <= lv.get(id), `${id} comes before what it needs`);
  }
});

test('drain caps grow on the dead down there, and nowhere else', () => {
  assert.ok(MATS.cap && MATS.cap.name === 'Drain Cap');
  const rng = makeRng(7);
  let n = 0;
  for (let i = 0; i < 200; i++) n += capsOf(rng, 5).reduce((s, m) => s + m.n, 0);
  assert.ok(n > 100, `${n} caps off two hundred of the rank and file`);
  assert.equal(capsOf(rng, 99).length, 0);
});
