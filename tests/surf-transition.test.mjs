import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ArmsRig } from '../src/sim/anim.js';
import { Player } from '../src/sim/player.js';
import { VM_PALETTE, WEAPONS } from '../src/core/layout.js';

function player() {
  const rigs = {};
  for (const [hands, name] of [[1, '1h'], [2, '2h'], [3, 'staff']]) {
    const b = fs.readFileSync(new URL(`../assets/fp/arms_${name}.glb`, import.meta.url));
    rigs[hands] = new ArmsRig(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  const p = new Player(rigs);
  p.setWeapon(WEAPONS.findIndex(w => w?.hands === 3));
  return p;
}
const sim = { casting: { busy: false, armDown: 0 } };
const tick = p => p.stepSwing(1 / 120, 1 / 120, sim);

test('boarding and dismounting keep the staff rig until the right arm is off screen', () => {
  const p = player();
  p.surfing = true;
  tick(p);
  assert.equal(p.arms, p.rigs[3]);
  assert.ok(p.surfRight > 0 && p.surfRight < 1);
  for (let i = 0; i < 30 && !p.staffSurf; i++) tick(p);
  assert.equal(p.staffSurf, true);
  assert.equal(p.surfRight, 1);
  assert.equal(p.arms, p.rigs[1]);
  for (let i = 0; i < 20; i++) tick(p);
  assert.equal(p.surfRight, 0);
  p.surfing = false;
  tick(p);
  assert.equal(p.arms, p.rigs[1]);
  for (let i = 0; i < 30 && p.staffSurf; i++) tick(p);
  assert.equal(p.arms, p.rigs[3]);
  assert.equal(p.surfRight, 1);
  for (let i = 0; i < 20; i++) tick(p);
  assert.equal(p.surfRight, 0);
});

test('an aborted boarding returns the original arm without swapping rigs', () => {
  const p = player();
  p.surfing = true;
  for (let i = 0; i < 4; i++) tick(p);
  p.surfing = false;
  for (let i = 0; i < 20; i++) tick(p);
  assert.equal(p.arms, p.rigs[3]);
  assert.equal(p.surfRight, 0);
});

test('boarding translates the right arm and staff down and right while preserving the left arm', () => {
  const p = player();
  const before = new Float32Array(VM_PALETTE + p.arms.count * 8);
  const after = new Float32Array(before.length);
  p.solveViewModel(before, sim);
  p.surfRight = 0.5;
  p.solveViewModel(after, sim);
  for (let j = 0; j < p.arms.count; j++) {
    const o = VM_PALETTE + j * 8;
    const name = p.arms.names[j];
    if (/_L$/.test(name)) assert.deepEqual(after.slice(o, o + 8), before.slice(o, o + 8));
    if (/_R$/.test(name) || name === 'weapon') {
      // Translation = 2 * dual * conjugate(real).
      const q = before.subarray(o, o + 4);
      const d = Array.from(after.subarray(o + 4, o + 8), (v, k) => v - before[o + 4 + k]);
      const x = 2 * (-d[3] * q[0] + d[0] * q[3] - d[1] * q[2] + d[2] * q[1]);
      const y = 2 * (-d[3] * q[1] + d[0] * q[2] + d[1] * q[3] - d[2] * q[0]);
      assert.ok(Math.abs(x - 0.6) < 1e-5, name);
      assert.ok(Math.abs(y + 0.8) < 1e-5, name);
    }
  }
});
