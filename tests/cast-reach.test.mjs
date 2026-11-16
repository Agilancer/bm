// How far what you cast reaches (REACH, src/sim/spells.js): nothing of yours, staff or spell, goes further than that from
// your eyes, so a boss's wheel of fire (11 paces from its middle) turns over anywhere you could strike it from.
//   node --test tests/cast-reach.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Casting } from '../src/sim/casting.js';
import { EYE } from '../src/sim/player.js';
import { REACH, SPELLS } from '../src/sim/spells.js';
import { MASTERY, MAX_RANK, TREES, effectiveAll } from '../src/sim/skills.js';
import { STAFF_GRAND, STAFF_SHOTS } from '../src/sim/staffshots.js';

// You at the middle of flat open ground, looking along +z; a zombie `at` paces ahead (or nobody). What lands on it is counted.
function scene(at) {
  const player = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, trauma: 0 };
  const foe = at === null ? null : { id: 1, kind: 5, x: 0, y: 0, z: at, hostile: true, dead: false };
  const world = { height: () => 0, rayBoxes: () => -1, sees: () => true, resolve() {} };
  const sim = { player, world, foes: foe ? [foe] : [], time: 0, event() {} };
  const c = new Casting(null), hits = [];
  c.hurt = (s, k, dmg) => { hits.push(dmg); return false; };
  return { c, sim, hits };
}
const def = (key) => effectiveAll(null).find((d) => d.key === key);
const HEAD = [0, EYE, 0.85];
function run(c, sim, secs) { for (let t = 0; t < secs; t += 1 / 60) { sim.time = t; c.stepBolts(1 / 60, sim); c.stepZones?.(1 / 60, sim); } }

test('a bolt reaches what stands within its reach, and goes out short of what stands past it', () => {
  for (const key of ['frost', 'lance', 'firebolt', 'rime', 'thorns']) {
    const near = scene(REACH - 2);
    near.c.cast_bolt(def(key), near.sim, [...HEAD]);
    run(near.c, near.sim, 3);
    assert.ok(near.hits.length > 0, `${key} strikes what's ${REACH - 2} paces off`);
    const far = scene(REACH + 3);
    far.c.cast_bolt(def(key), far.sim, [...HEAD]);
    run(far.c, far.sim, 3);
    assert.equal(far.hits.length, 0, `${key} never reaches what's ${REACH + 3} paces off`);
    assert.equal(far.c.bolts.length, 0, `${key} is gone`);
    // (And it's the reach that stops it: let off its leash, the same bolt gets there.)
    const loose = scene(REACH + 3);
    loose.c.cast_bolt(def(key), loose.sim, [...HEAD]);
    for (const b of loose.c.bolts) b.leash = null;
    run(loose.c, loose.sim, 3);
    assert.ok(loose.hits.length > 0, `${key} unleashed strikes what's ${REACH + 3} paces off`);
  }
});

test("a staff's bolt goes no further than a spell's", () => {
  const far = scene(REACH + 3), staff = { ...def('frost'), staff: true, dmg: 10 };
  far.c.cast_bolt(staff, far.sim, [...HEAD]);
  run(far.c, far.sim, 3);
  assert.equal(far.hits.length, 0);
});

test('what hangs in the air stops at the end of its reach and hangs out its time there', () => {
  const { c, sim } = scene(null);
  c.cast_bolt(def('lightning'), sim, [...HEAD]);
  run(c, sim, 2);
  assert.equal(c.bolts.length, 1, 'Ball Lightning is still lashing');
  const b = c.bolts[0];
  assert.ok(b.hung, 'and hanging');
  assert.ok(Math.hypot(b.x, b.y - EYE, b.z) <= REACH + 0.5, `at ${Math.hypot(b.x, b.z).toFixed(1)} paces`);
  run(c, sim, 5);
  assert.equal(c.bolts.length, 0, 'till its time is up');
});

test('a thrown flask that runs out of reach drops where it is, and breaks there', () => {
  const { c, sim } = scene(null);
  const flask = def('plague');
  // (Thrown a little up, as you throw one far: it would come down well past the reach.)
  sim.player.pitch = 0.25;
  c.cast_bolt(flask, sim, [0, EYE + 0.2, 0.85]);
  run(c, sim, 3);
  const cloud = c.zones.find((z) => z.kind === 'cloud');
  assert.ok(cloud, 'it broke');
  assert.ok(Math.hypot(cloud.x, cloud.z) <= REACH + 0.2, `within reach: ${Math.hypot(cloud.x, cloud.z).toFixed(1)}`);
});

test('no spell lays, pours, seeks or cuts out past the reach, whatever is spent on it', () => {
  // Every spell, every branch, every mastery, as far as they go.
  const all = {};
  for (const t of TREES) {
    for (const n of t.spells) { all[n.key] = MAX_RANK; for (const a of n.augs) all[a.id] = a.max; }
    all[`@${t.key}`] = MASTERY.max;
  }
  for (const ranks of [null, all]) {
    for (const d of effectiveAll(ranks)) {
      if (d.cast !== 'blink') assert.ok(!(d.range > REACH), `${d.key} range ${d.range}`);
      assert.ok(!(d.out > REACH), `${d.key} flies out ${d.out}`);
      assert.ok(!(d.seek > REACH), `${d.key} seeks ${d.seek}`);
    }
  }
  // (Blink and Stormstep move you: theirs is how far you go.)
  assert.ok(SPELLS.filter((d) => d.cast === 'blink').every((d) => d.range > REACH));
});

test("nor does a staff's shot", () => {
  for (const [key, d] of Object.entries(STAFF_SHOTS)) {
    const g = { ...d };
    assert.ok(!(g.range > REACH), `${key} range ${g.range}`);
    assert.ok(!(g.out > REACH), `${key} flies out ${g.out}`);
    assert.ok(!(g.seek > REACH), `${key} seeks ${g.seek}`);
  }
  assert.ok(STAFF_SHOTS.souls.reach <= REACH, 'the souls look for their marks no further off');
  for (const [id, o] of Object.entries(STAFF_GRAND)) assert.ok(!(o.range > REACH) && !(o.out > REACH) && !(o.seek > REACH), id);
});

test("the reach is inside a boss's wheel of fire", () => {
  // A dungeon boss's wheel turns 11 paces about its middle (src/sim/dungeon.js sWheel; the delves' are 11 to 19), and the
  // biggest of them are 1.8 across the middle (src/sim/tripo.js): a bolt that just reaches one is cast from inside the wheel.
  assert.ok(REACH + 1.8 < 11);
});
