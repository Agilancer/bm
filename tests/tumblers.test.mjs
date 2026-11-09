// The tumblers' ways, on flat ground with a stand-in player: each kind wakes, comes at you, and dies as it should.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Tumblers, TUMBLER_KINDS } from '../src/sim/tumblers.js';

function world() {
  const events = [];
  const player = { x: 0, y: 0, z: 0, vx: 0, vz: 0, dead: false, trauma: 0, hurt: 0, damage(sim, n) { this.hurt += n; } };
  const sim = {
    time: 0, tick: 0, player, events,
    world: { height: () => 0, inside: () => false, resolve: () => false },
    casting: { rate: () => 1 },
    event: (...a) => events.push(a),
  };
  sim.tumblers = new Tumblers();
  sim.tumblers.camps = [];
  return sim;
}
const kind = (key) => TUMBLER_KINDS.findIndex((k) => k.key === key);
function run(sim, secs, each) {
  for (let i = 0; i < secs * 60; i++) { sim.time += 1 / 60; sim.tick++; sim.tumblers.step(1 / 60, sim); if (each) each(); }
}

test('every roller wakes as you come near, shakes the ground, and comes at you', () => {
  for (const K of TUMBLER_KINDS) {
    if (K.burrow || K.fly) continue;
    const sim = world();
    sim.tumblers.debugSpawn(kind(K.key), 1, 0, 6, sim);
    const t = sim.tumblers.list[0];
    run(sim, 0.1);
    assert.notEqual(t.state, 'sleep', K.key);
    assert.ok(sim.player.trauma > 0, `${K.key}: no shake`);
    run(sim, 4);
    assert.ok(sim.player.hurt > 0, `${K.key}: never reached you`);
  }
});

test('the Barrow Cairn rises once, and the second time it stays down', () => {
  const sim = world();
  sim.tumblers.debugSpawn(kind('barrow'), 1, 0, 30, sim);
  const t = sim.tumblers.list[0];
  t.hp = 0; run(sim, 0.05);
  assert.equal(t.dead, false); assert.equal(t.state, 'grave'); assert.equal(t.hostile, false);
  run(sim, 3);
  assert.equal(t.hostile, true); assert.ok(t.hp > 0);
  t.hp = 0; run(sim, 0.05);
  assert.equal(t.dead, true);
});

test('Rust and Cinder burst on dying, and hurt you if you are close', () => {
  for (const key of ['rust', 'cinder']) {
    const sim = world();
    sim.tumblers.debugSpawn(kind(key), 2, 0, 2.5, sim);
    sim.tumblers.list[0].state = 'stun';
    sim.tumblers.list[0].hp = 0; run(sim, 0.05);
    assert.ok(sim.player.hurt > 0, key);
  }
});

test('the Rime Tumbler leaves you slowed; the Sorrow Crag brings stones down; the Mossback mends when still', () => {
  let sim = world();
  sim.tumblers.debugSpawn(kind('rime'), 1, 0, 6, sim);
  run(sim, 4);
  assert.ok(sim.player.miredUntil > 0);
  sim = world();
  sim.world.height = (x, z) => z * 0.3;
  sim.tumblers.debugSpawn(kind('sorrow'), 2, 0, 8, sim);
  run(sim, 0.1);
  assert.equal(sim.tumblers.list.length, 3);
  sim = world();
  sim.tumblers.debugSpawn(kind('moss'), 1, 0, 30, sim);
  const t = sim.tumblers.list[0];
  t.state = 'stun'; t.speed = 0; t.hp = 10; t.hpSeen = 10;
  run(sim, 1);
  assert.ok(t.hp > 10);
});

test('the Gallows Stone drags you toward it as it wakes', () => {
  const sim = world();
  sim.tumblers.debugSpawn(kind('gallows'), 1, 0, 9, sim);
  run(sim, 0.8);
  assert.ok(sim.player.z > 0.3, `pulled ${sim.player.z}`);
});

test('the Mire Mound lies out of reach, comes up near you, spits bog that slows you, and goes under again', () => {
  const sim = world();
  sim.tumblers.debugSpawn(kind('mire'), 1, 0, 10, sim);
  const t = sim.tumblers.list[0];
  const turn = [...t.m];
  assert.equal(t.hostile, false);
  assert.ok(t.y < -1);
  run(sim, 0.8);
  assert.equal(t.hostile, true);
  let thrown = 0;
  run(sim, 4.5, () => { thrown = Math.max(thrown, sim.tumblers.globs.length); });
  assert.ok(thrown > 0, 'no spit');
  assert.ok(sim.player.hurt > 0 && sim.player.miredUntil > 0, 'the bog never reached you');
  assert.ok(['down', 'burrow', 'up', 'spit'].includes(t.state));
  // It never rolls: its turn is as it was.
  assert.deepEqual(t.m, turn);
});

test('the Crowmother flock wheels over you, dives by threes, scatters when she is struck, and flies off when she dies', () => {
  const sim = world();
  sim.tumblers.debugSpawn(kind('crow'), 8, 0, 20, sim);
  const L = sim.tumblers.list, mother = L.find((s) => s.K.mother), crows = L.filter((s) => !s.K.mother);
  assert.equal(crows.length, 8);
  assert.ok(mother.cy > 8 && crows.every((c) => c.cy > 12), 'not up high');
  let dived = 0;
  run(sim, 7, () => { dived = Math.max(dived, crows.filter((c) => c.state === 'dive').length); });
  assert.ok(dived > 0 && dived <= 3, `dived ${dived}`);
  assert.ok(sim.player.hurt > 0, 'no crow reached you');
  // Every crow's turn stays a turn: square, unit rows.
  for (const c of crows) { const m = c.m; assert.ok(Math.abs(Math.hypot(m[0], m[3], m[6]) - 1) < 1e-3 && Math.abs(Math.hypot(m[2], m[5], m[8]) - 1) < 1e-3); }
  mother.hp -= 10; mother.onHit(sim, 0, 0, 0);
  run(sim, 0.1);
  assert.ok(crows.every((c) => c.state === 'scatter' || c.dead), 'no scatter');
  const hurt = sim.player.hurt;
  run(sim, 4);
  assert.equal(sim.player.hurt, hurt, 'hurt while scattered');
  mother.hp = 0; run(sim, 0.1);
  assert.ok(crows.every((c) => c.state === 'flee'));
  run(sim, 5);
  assert.equal(sim.tumblers.list.length, 0);
  assert.ok(!sim.events.some((e) => e[0] === undefined));
});
