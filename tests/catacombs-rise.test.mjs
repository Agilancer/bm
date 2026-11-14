// Run with node --test tests/*.test.mjs. No browser required.
// The catacombs' dead (src/sim/undead.js stepCatacombs): each place is filled once while you're down there, so what you've
// cleared stays clear; and once you've been up out of them long enough, the places whose dead you put down are filled
// again. Stand-in bodies stand in for the dead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Zombie, resetCatacombs, stepCatacombs } from '../src/sim/undead.js';
import { churchAt } from '../src/core/church.js';

function standIn() {
  const k = Object.create(Zombie.prototype);
  Object.assign(k, { opts: { model: 'zombie_a' }, scale: 1, x: 0, z: 0, y: 0, dead: true, dormant: true, deadT: 9, ups: 0, stoodAt: -1,
    reset(o) { Object.assign(this, { x: o.spawn[0], z: o.spawn[1], dead: false, dormant: false, deadT: 0, stoodAt: -1 }); this.ups++; } });
  return k;
}

// Three places in the Reliquary, twenty metres off where the player stands, round a corner (nothing sees anything).
function make() {
  const at = churchAt(186, -30);
  const spawns = [0, 1, 2].map((i) => ({ x: at[0] + i * 2, z: at[1] - 20, yaw: 0 }));
  const sim = { time: 0, player: { x: at[0], z: at[1], y: -16 }, knights: Array.from({ length: 8 }, standIn),
    world: { spawns, height: () => -16, sees: () => false } };
  const run = (secs) => { for (let t = 0; t < secs; t += 0.5) { sim.time += 0.5; stepCatacombs(sim); } };
  const up = () => sim.knights.filter((k) => !k.dead && !k.dormant).length;
  const killAll = () => { for (const k of sim.knights) if (!k.dead) { k.dead = true; k.deadT = 9; } };
  const leave = () => { sim.player.x = 0; sim.player.z = 0; sim.player.y = 0; };
  const back = () => { sim.player.x = at[0]; sim.player.z = at[1]; sim.player.y = -16; };
  resetCatacombs();
  return { sim, run, up, killAll, leave, back };
}

test('each place is filled once, and stays clear while you are down there', () => {
  const { run, up, killAll } = make();
  run(5);
  assert.equal(up(), 3, 'a body at each place');
  killAll();
  run(600);
  assert.equal(up(), 0, 'cleared, and nobody new for as long as you stay down');
});

test('a short while up out of them brings nobody back', () => {
  const { run, up, killAll, leave, back } = make();
  run(5); killAll();
  leave(); run(60); back(); run(5);
  assert.equal(up(), 0);
});

test('up out of them four minutes and more, the dead you put down have risen again', () => {
  const { run, up, killAll, leave, back } = make();
  run(5); killAll();
  leave(); run(260); back(); run(5);
  assert.equal(up(), 3);
});

test('a place whose body still stands there is not filled twice', () => {
  const { sim, run, up, leave, back } = make();
  run(5);
  const first = sim.knights.filter((k) => !k.dead);
  first[0].dead = true; first[0].deadT = 9;
  leave(); run(260); back(); run(5);
  assert.equal(up(), 3, 'the one put down is back; the two left standing were not doubled');
  assert.equal(sim.knights.reduce((n, k) => n + k.ups, 0), 4);
});
