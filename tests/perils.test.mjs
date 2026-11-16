// What monsters mark on the ground (src/core/perils.js): each shape covers what it's drawn over and nothing else, and the
// way out of one leads out of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPE, SHAPES, covers, edge, markOut, reachOf, wayOut, wheelSpot } from '../src/core/perils.js';
import { REACH } from '../src/sim/spells.js';
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

// A boss's fire wheel (src/sim/moves.js fireWheel) as auto-play meets it now that nothing it casts goes past REACH: it stands
// where the wheel turns. Walking round with the gap between two arms (wheelSpot, src/ui/autowarrens.js perilStep), told of the
// wheel a tenth of a second late and thinking each eighth of one, at a walk slowed by casting, it's never caught, and it stays
// near enough the boss in the middle to cast at it. (Only stepping out of an arm once it was on one, it was caught one to two
// times a wheel.)
test('round with a fire wheel: never caught by an arm, and never out of reach of the boss in its middle', () => {
  const wheels = [{ r: 11, arms: 4, spin: 0.7, life: 6 }, { r: 11, arms: 5, spin: 0.6, life: 5 }, { r: 13, arms: 4, spin: 0.7, life: 7 },
    { r: 19, arms: 3, spin: 0.36, life: 9 }, { r: 11, arms: 4, spin: -0.75, life: 6 }];
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const W of wheels) for (let n = 0; n < 60; n++) {
    const h = { shape: 'cross', x: 0, z: 0, r: W.r, w: 0.75, arms: W.arms, yaw: rnd() * 6.28, spin: W.spin, live: false };
    const a0 = rnd() * 6.28, r0 = 4 + rnd() * 4.5;
    let x = Math.sin(a0) * r0, z = Math.cos(a0) * r0, t = 0, think = 0, goal = null, caught = 0, far = 0;
    for (; t < 1.2 + W.life; t += 0.02) {
      h.live = t >= 1.2;
      if (h.live) h.yaw += h.spin * 0.02;
      if ((think -= 0.02) <= 0) { think = 0.12; goal = wheelSpot({ ...h, yaw: h.yaw - (h.live ? h.spin * 0.1 : 0) }, x, z, 0.1, { want: REACH - 2.5 }); }
      if (goal) { const dx = goal[0] - x, dz = goal[1] - z, L = Math.hypot(dx, dz); if (L > 0.6) { const v = Math.min(L, 4.6 * 0.02); x += dx / L * v; z += dz / L * v; } }
      if (h.live && covers(h, x, z)) caught++;
      if (h.live && t > 2.4) far = Math.max(far, Math.hypot(x, z));
    }
    assert.equal(caught, 0, `caught by a wheel ${JSON.stringify(W)}`);
    assert.ok(far < REACH - 1, `${far.toFixed(1)} m from the middle of ${JSON.stringify(W)}`);
  }
  // (Nowhere near it: nothing to do with it.)
  assert.equal(wheelSpot({ shape: 'cross', x: 0, z: 0, r: 11, w: 0.75, arms: 4, spin: 0.7, live: true, yaw: 0 }, 20, 0), null);
});
