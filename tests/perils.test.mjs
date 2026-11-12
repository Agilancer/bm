// What monsters mark on the ground (src/core/perils.js): each shape covers what it's drawn over and nothing else, and the
// way out of one leads out of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPE, SHAPES, covers, edge, markOut, reachOf, wayOut } from '../src/core/perils.js';
import { MOVES, TRICKS } from '../src/sim/moves.js';
import { GROUPS } from '../src/core/tripo-monsters.js';
import { FX } from '../src/sim/spells.js';

test('a circle, a ring, a cone, a strip and a cross each cover their own ground', () => {
  const c = { shape: 'circle', x: 10, z: 5, r: 3 };
  assert.ok(covers(c, 12, 5) && !covers(c, 13.5, 5));
  const r = { shape: 'ring', x: 0, z: 0, r: 6, r0: 2 };
  assert.ok(covers(r, 4, 0) && !covers(r, 1, 0) && !covers(r, 7, 0), 'the middle of a ring is safe');
  // yaw 0 looks down +z.
  const k = { shape: 'cone', x: 0, z: 0, r: 10, yaw: 0, half: 0.5 };
  assert.ok(covers(k, 0, 8) && covers(k, 2, 6) && !covers(k, 6, 2) && !covers(k, 0, -3) && !covers(k, 0, 11));
  const l = { shape: 'line', x: 0, z: 0, r: 12, yaw: Math.PI / 2, w: 1 };
  assert.ok(covers(l, 8, 0.5) && !covers(l, 8, 1.5) && !covers(l, -1, 0) && !covers(l, 13, 0), 'a strip runs out along +x at a quarter turn');
  const x = { shape: 'cross', x: 0, z: 0, r: 8, yaw: 0, w: 0.6, arms: 4 };
  assert.ok(covers(x, 0, 5) && covers(x, 5, 0) && covers(x, 0, -5) && covers(x, -5, 0) && !covers(x, 4, 4));
  const y = { ...x, arms: 3 };
  assert.ok(covers(y, 0, 5) && !covers(y, 0, -5), 'three arms leave the far side clear');
});

test('the edge is measured in metres, under nothing inside', () => {
  const c = { shape: 'circle', x: 0, z: 0, r: 3 };
  assert.ok(Math.abs(edge(c, 0, 0) + 3) < 1e-9 && Math.abs(edge(c, 5, 0) - 2) < 1e-9);
  assert.ok(covers(c, 3.4, 0, 0.5) && !covers(c, 3.6, 0, 0.5), 'pad widens it');
  assert.equal(reachOf({ shape: 'line', r: 10, w: 2 }), 12);
});

test('the way out of every shape leads out of it', () => {
  const marks = [
    { shape: 'circle', x: 0, z: 0, r: 3 }, { shape: 'ring', x: 30, z: 0, r: 6, r0: 2 }, { shape: 'cone', x: 60, z: 0, r: 10, yaw: 1, half: 0.6 },
    { shape: 'line', x: 90, z: 0, r: 12, yaw: 2, w: 1.5 }, { shape: 'cross', x: 120, z: 0, r: 9, yaw: 0.3, w: 0.8, arms: 4 },
  ];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const m of marks) {
    let tried = 0;
    for (let i = 0; i < 400; i++) {
      let x = m.x + (rnd() - 0.5) * 22, z = m.z + (rnd() - 0.5) * 22;
      if (!covers(m, x, z)) { assert.equal(wayOut([m], x + 40, z + 40, 0.5), null); continue; }
      tried++;
      // (A body walks toward where it's told, a stride at a time, and is told again.)
      for (let s = 0; s < 40 && covers(m, x, z, 0.3); s++) { const to = wayOut([m], x, z, 0.8); assert.ok(to, 'told where to go while it is in it'); const L = Math.hypot(to[0] - x, to[1] - z) || 1; x += (to[0] - x) / L * 0.5; z += (to[1] - z) / L * 0.5; }
      assert.ok(!covers(m, x, z, 0.3), `${m.shape}: out of it`);
    }
    assert.ok(tried > 5, `${m.shape}: some of the tries were in it`);
  }
  // With rock one way, it goes another.
  const to = wayOut([marks[0]], 1, 0, 0.8, (x) => x < 2);
  assert.ok(to && to[0] < 2);
});

test('what the page is told of a mark has its whole shape', () => {
  const o = markOut({ shape: 'cone', x: 1, z: 2, r: 9, yaw: 0.4, half: 0.7, t: 2, fuse: 1 });
  assert.deepEqual([o.shape, o.r, o.yaw, o.half, o.live], ['cone', 9, 0.4, 0.7, true]);
  assert.ok(covers(o, 1 + Math.sin(0.4) * 5, 2 + Math.cos(0.4) * 5));
  assert.deepEqual(SHAPES, Object.keys(SHAPE));
  assert.equal(FX.MARK, 14, 'the shaders draw a mark as shape 14 (src/gfx/spellfx.js)');
});

test('every kind of monster has tricks, and every trick is a move there is', () => {
  for (const g of Object.keys(GROUPS)) assert.ok(TRICKS[g]?.length, `${g} has a trick`);
  for (const [g, list] of Object.entries(TRICKS)) {
    assert.ok(GROUPS[g], `${g} is a group`);
    for (const q of list) { assert.equal(typeof MOVES[q.move], 'function', `${g}: ${q.move}`); assert.ok(q.cd[0] > 0 && q.cd[1] >= q.cd[0] && q.far > q.near); }
  }
});

test('the ground burning under you hurts from where it burns, and doesn\'t push you out of it', async () => {
  const { Perils } = await import('../src/sim/perils.js');
  const { Player } = await import('../src/sim/player.js');
  // A pool thrown from 20 m off, burning under someone standing in it.
  const struck = [];
  const v = { x: 0.3, z: 0, y: 0, hp: 100, dead: false, damage: (sim, dmg, x, z, knock) => { struck.push({ x, z, knock }); return true; } };
  const sim = { tick: 0, time: 0, player: v, heroes: [], world: { height: () => 0 }, event() {}, casting: { burst() {} } };
  const P = new Perils(sim);
  P.mark({ x: 0, z: 0, r: 2.5, fuse: 0, life: 6, dps: 40, from: { x: 20, z: 0 }, quiet: true });
  for (let i = 0; i < 240; i++) { sim.tick++; sim.time += 1 / 120; P.stepMarks(1 / 120); }
  assert.ok(struck.length >= 3, `bitten ${struck.length} times in two seconds`);
  for (const s of struck) assert.deepEqual([s.x, s.z, s.knock], [0, 0, null], 'each bite from the pool, with no knock');
  // And the player, bitten so, isn't put back a step: blows are (2.2 m/s and more, from where they came).
  const p = Object.assign(Object.create(Player.prototype), { x: 0.3, z: 0, y: 0, yaw: 0, hp: 100, maxHp: 100, armor: 0, flash: 0, trauma: 0, knockX: 0, knockZ: 0, dead: false, clip: 'idle', stance: { idle: 'idle' } });
  const psim = { casting: { absorb: (a) => a }, event() {} };
  p.applyHurt(psim, 10, 0, 0, null);
  assert.deepEqual([p.knockX, p.knockZ, p.hp], [0, 0, 90]);
  p.applyHurt(psim, 10, -5, 0, 0);
  assert.ok(p.knockX > 2, 'a blow still puts you back');
});
