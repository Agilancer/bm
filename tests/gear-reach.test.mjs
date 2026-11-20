// Gear and gems that stretch how far you cast (the 'reach' stat: src/items/items.js; Casting.setFar in src/sim/casting.js).
//   node --test tests/gear-reach.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Casting } from '../src/sim/casting.js';
import { EYE } from '../src/sim/player.js';
import { REACH, REACH_CAP } from '../src/sim/spells.js';
import { INPUT } from '../src/core/layout.js';
import { GEMS, gearTotals, linesOf, makeRng, rollSkull, rollWeapon, writeWeapon } from '../src/items/items.js';

function scene(at) {
  const player = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, trauma: 0 };
  const foe = { id: 1, kind: 5, x: 0, y: 0, z: at, hostile: true, dead: false };
  const world = { height: () => 0, rayBoxes: () => -1, sees: () => true, resolve() {} };
  const sim = { player, world, foes: [foe], time: 0, event() {} };
  const c = new Casting(null), hits = [];
  c.hurt = (s, k, dmg) => { hits.push(dmg); return false; };
  return { c, sim, hits };
}
function run(c, sim, secs) { for (let t = 0; t < secs; t += 1 / 60) { sim.time = t; c.stepBolts(1 / 60, sim); } }
const HEAD = [0, EYE, 0.85];

test('the aquamarine and the reach words count toward what you wear, and say what they do', () => {
  assert.equal(GEMS.aquamarine.stat, 'reach');
  const staff = { type: 'weapon', base: 'x', rarity: 1, affixes: [{ stat: 'reach', value: 0.1 }], gems: [{ kind: 'aquamarine', grade: 2 }] };
  assert.ok(Math.abs(gearTotals({ main: staff }).reach - (0.1 + GEMS.aquamarine.values[2])) < 1e-9);
  // Something of every rarity can roll it, on a staff and on a skull.
  const rng = makeRng(7);
  let seen = 0;
  for (let i = 0; i < 4000 && seen < 2; i++) {
    const it = i % 2 ? rollWeapon(rng, { rarity: 4 }) : rollSkull(rng, { rarity: 4 });
    if (it?.affixes?.some((a) => a.stat === 'reach')) seen++;
  }
  assert.equal(seen, 2, 'reach rolls on staffs and skulls');
  const lines = linesOf({ type: 'gem', kind: 'aquamarine', grade: 0 }).map((l) => l.text).join(' | ');
  assert.match(lines, /range/);
});

test('what you wear is handed to the sim with its most', () => {
  const input = new Float32Array(INPUT.SIZE);
  writeWeapon(input, null, { ...gearTotals({}), reach: 0.12 });
  assert.ok(Math.abs(input[INPUT.FAR] - 1.12) < 1e-6);
  writeWeapon(input, null, { ...gearTotals({}), reach: 5 });
  assert.ok(Math.abs(input[INPUT.FAR] - (1 + REACH_CAP)) < 1e-6, 'capped');
  writeWeapon(input, null);
  assert.equal(input[INPUT.FAR], 1);
});

test('a bolt goes as much further as your reach is stretched, and spells\' own ranges with it, but not Blink', () => {
  const at = REACH + 2;          // past the bare reach, inside the stretched one
  const bare = scene(at);
  bare.c.cast_bolt(bare.c.defs.find((d) => d.key === 'frost'), bare.sim, [...HEAD]);
  run(bare.c, bare.sim, 3);
  assert.equal(bare.hits.length, 0, 'out of reach with nothing worn');
  const far = scene(at);
  far.c.setFar(1 + REACH_CAP);
  assert.ok(Math.abs(far.c.reach - REACH * (1 + REACH_CAP)) < 1e-9);
  far.c.cast_bolt(far.c.defs.find((d) => d.key === 'frost'), far.sim, [...HEAD]);
  run(far.c, far.sim, 3);
  assert.ok(far.hits.length > 0, 'stretched, it gets there');
  const by = (c, key) => c.defs.find((d) => d.key === key);
  const plain = new Casting(null);
  assert.ok(Math.abs(by(far.c, 'meteor').range - by(plain, 'meteor').range * (1 + REACH_CAP)) < 1e-9);
  assert.equal(by(far.c, 'blink').range, by(plain, 'blink').range);
  // More than the most is held to it, and the spells bought since still stretch.
  far.c.setFar(9);
  assert.equal(far.c.far, 1 + REACH_CAP);
  far.c.setSkills(null);
  assert.ok(by(far.c, 'meteor').range > REACH);
  far.c.setFar(1);
  assert.equal(by(far.c, 'meteor').range, REACH);
});
