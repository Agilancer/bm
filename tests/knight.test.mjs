import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { ClipBank, Rig } from '../src/sim/anim.js';
import { Knight, ATTACKS, S } from '../src/sim/knight.js';
import { World } from '../src/sim/world.js';
const bytes = path => { const b = fs.readFileSync(new URL(path, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const bank = new ClipBank(JSON.parse(fs.readFileSync(new URL('../assets/game/clips.json', import.meta.url))), bytes('../assets/game/clips.bin'));
function knight(kind = 0) {
  return new Knight(kind, kind, new Rig(parseGLB(bytes(`../assets/game/${kind ? 'silver' : 'velscour'}_knight.glb`)), bank), bank,
    { spawn: [0, 0], hp: 500, hostile: !kind, swordScale: kind ? 0.96 : 1.085, shieldScale: kind ? 1.25 : 1.6, bladeLen: 1, route: [[0, 0]], walk: 1.5 });
}
function world() {
  return Object.assign(Object.create(World.prototype), { colliders: [], trunks: new Map(), height: () => 0 });
}
function simulation(knights = []) {
  return { time: 0, tick: 0, gameState: 0, world: world(), knights, player: { x: 10, y: 0, z: 0, dead: false }, casting: { bolts: [] }, event() {}, slowMo() {}, tacticWeights: [1,1,1,1,1,1] };
}
test('both shipped rigs keep sampled equipment outside the body through every clip and pose transition', () => {
  for (const kind of [0, 1]) {
    const k = knight(kind), sim = simulation();
    for (const clip of Object.values(bank.clips)) {
      k.play(clip.name);
      for (let frame = 0; frame <= 20; frame++) {
        k.actT = clip.dur * frame / 20; k.actRate = 0;
        k.combat = frame / 20; k.shieldUp = 1 - frame / 20;
        k.animate(1 / 120, sim);
        for (const side of ['r', 'l']) assert.ok(k.equipmentPenalty(side) < 1e-7, `${kind}: ${clip.name} frame ${frame}, ${side}`);
        assert.ok([...k.propMatrices].every(Number.isFinite));
      }
    }
  }
});
test('a charge cannot tunnel through a thin wall and reports actual movement after collision', () => {
  const k = knight(), sim = simulation();
  sim.world.colliders.push({ x: 1, z: 0, hx: 0.05, hz: 4, h: 3, b: 0, s: 0, co: 1 });
  k.vx = 20; k.vz = 0; k.move(0.2, sim);
  assert.ok(k.x <= 1 - 0.05 - k.bodyRadius + 1e-6);
  k.vx = 20; k.move(0.1, sim);
  assert.ok(Math.abs(k.speed) < 1e-5);
});
test('navigation rejects a centerline shortcut that leaves no shoulder clearance', () => {
  const w = world();
  w.grid = new Uint8Array(512 * 512); w.slots = new Map();
  const field = new Float32Array(512 * 512).fill(1e9), cell = 256 * 512 + 256;
  field[cell] = 5; field[cell + 512] = 4;
  w.slots.set(0, { field });
  w.colliders.push({ x: 2, z: 0.7, hx: 0.6, hz: 0.1, h: 3, b: 0, s: 0, co: 1 });
  const out = new Float32Array(2); w.flow(out, 0, 0, 5, 0);
  assert.ok(out[1] > 0.9);
});
test('silver defends against the rival without making the caster an enemy', () => {
  const a = knight(), b = knight(1), sim = simulation([a, b]);
  b.x = 2; sim.player.x = 30;
  assert.equal(a.selectTarget(sim), b); assert.equal(b.selectTarget(sim), a);
  a.bladeA = [2, 0.3, 0]; a.bladeB = [2, 1.6, 0];
  a.strike(sim, b, ATTACKS.a);
  assert.ok(b.hp < b.maxHp); assert.equal(b.hostile, false);
  a.dead = true; assert.equal(b.selectTarget(sim), null);
});
test('caster defense waits for visible projectiles, ignores misses and respects roll cooldown', () => {
  const k = knight(), sim = simulation();
  k.state = S.APPROACH; k.toPlayer = Math.PI / 2;
  const b = { x: 6, y: 1, z: 0, vx: -10, vy: 0, vz: 0, size: 0.1 };
  sim.casting.bolts.push(b);
  assert.equal(k.reactToSpell(0.01, sim, sim.player), false);
  sim.time = 0.2;
  assert.equal(k.reactToSpell(0.01, sim, sim.player), true);
  assert.equal(k.state, S.ROLL);
  assert.equal(k.reactToSpell(0.01, sim, sim.player), false);
  k.rollCd = 0; b.z = 4; k.state = S.APPROACH;
  assert.equal(k.reactToSpell(0.01, sim, sim.player), false);
});
