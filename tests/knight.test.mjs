import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { ClipBank, Rig } from '../src/sim/anim.js';
import { Knight, ATTACKS, S } from '../src/sim/knight.js';
import { NAV_H, NAV_W, NAV_X0, NAV_Z0, World } from '../src/sim/world.js';
const bytes = path => { const b = fs.readFileSync(new URL(path, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const bank = new ClipBank(JSON.parse(fs.readFileSync(new URL('../assets/game/clips.json', import.meta.url))), bytes('../assets/game/clips.bin'));
function knight(kind = 0) {
  return new Knight(kind, kind, new Rig(parseGLB(bytes(`../assets/game/${kind ? 'silver' : 'velscour'}_knight.glb`)), bank), bank,
    { spawn: [0, 0], hp: 500, hostile: !kind, swordScale: kind ? 0.96 : 1.085, shieldScale: kind ? 1.25 : 1.6, bladeLen: 1, route: [[0, 0]], walk: 1.5, style: kind ? 'silver' : 'black' });
}
function world() {
  // A bare world: no boxes, no pines, no land sites (World's own constructor builds the whole land).
  return Object.assign(Object.create(World.prototype), { colliders: [], trunks: new Map(), siteBoxes: new Map(), height: () => 0 });
}
function simulation(knights = []) {
  return { time: 0, tick: 0, gameState: 0, world: world(), knights, player: { x: 10, y: 0, z: 0, dead: false }, casting: { bolts: [] }, event() {}, slowMo() {}, tacticWeights: [1,1,1,1,1,1] };
}
test('the clips carry the arms: props stay finite and steady, and the guard holds the shield off the body', () => {
  for (const kind of [0, 1]) {
    const k = knight(kind), sim = simulation();
    for (const clip of Object.values(bank.clips)) {
      k.play(clip.name); k.holdW = 0;
      // (The roll and the flinches hold the shield arm in its guard, on purpose: see HOLD_CLIPS.)
      const held = ['Roll', 'L_HitHead', 'L_HitBody', 'L_HitGut', 'Hit_Head', 'Hit_Chest'].includes(clip.name);
      const want = new Float32Array(k.rig.count * 4);
      for (let frame = 0; frame <= 20; frame++) {
        k.actT = clip.dur * frame / 20; k.actRate = 0; k.fromW = 0;
        k.combat = frame / 20; k.shieldUp = 1 - frame / 20;
        k.animate(1 / 120, sim);
        assert.ok([...k.propMatrices].every(Number.isFinite), `${kind}: ${clip.name} frame ${frame}`);
        // Nothing searches the arms about any more: shoulders and elbows are exactly where the clip puts them
        // (a hanging shield arm only turned about its own length, palm to thigh, to carry the board).
        want.set(k.rig.restR); bank.sample(clip, k.actT, want, null); k.carryArm(want, k.carryW);
        for (const n of held ? ['upperarm_r', 'lowerarm_r'] : ['upperarm_r', 'lowerarm_r', 'upperarm_l', 'lowerarm_l']) {
          const j = k.rig.index.get(n) * 4, r = k.pose.rot;
          assert.ok(Math.abs(Math.abs(r[j] * want[j] + r[j + 1] * want[j + 1] + r[j + 2] * want[j + 2] + r[j + 3] * want[j + 3]) - 1) < 1e-4, `${kind}: ${clip.name} ${n}`);
        }
      }
    }
    for (const name of ['Sword_Idle', 'Idle_Shield_Loop']) {
      k.play(name); k.actT = 0.3; k.actRate = 0; k.combat = 1; k.shieldUp = 1; k.fromW = 0;
      k.animate(1 / 120, sim);
      assert.ok(k.equipmentPenalty('l') < 0.2 && k.equipmentPenalty('r') < 0.2, `${kind}: ${name} guard`);
    }
  }
});
test('every new move is in the bank, and the gaits carry the body', () => {
  for (const a of Object.values(ATTACKS)) assert.ok(bank.clips[a.clip], a.clip);
  for (const n of ['L_Stalk', 'L_Run', 'L_Point', 'L_Angry', 'L_HitHead', 'L_HitBody', 'L_HitGut', 'Hit_Knockback', 'LayToIdle']) assert.ok(bank.clips[n], n);
  assert.ok(bank.travel(bank.clips.L_Run, bank.clips.L_Run.dur) > 1);
  assert.ok(knight().gaits.walk && knight().gaits.jog, 'black stalks and runs');
});
test('a blow from a clip with an empty left hand keeps the shield arm in its guard, and turns down his facing', () => {
  const k = knight(), sim = simulation();
  sim.player = { x: 0, y: 0, z: 2, dead: false };
  k.startAttack(sim, ATTACKS.slash);
  for (let i = 0; i < 40; i++) { k.actRate = 0; k.actT = k.action.dur * 0.6; k.animate(1 / 60, sim); }
  const guard = new Float32Array(k.rig.count * 4);
  guard.set(k.rig.restR); bank.sample(bank.clips.Idle_Shield_Loop, sim.time, guard, null);
  for (const n of ['upperarm_l', 'lowerarm_l']) {
    const j = k.rig.index.get(n) * 4, r = k.pose.rot;
    assert.ok(Math.abs(r[j] * guard[j] + r[j + 1] * guard[j + 1] + r[j + 2] * guard[j + 2] + r[j + 3] * guard[j + 3]) > 0.999, n);
  }
  assert.ok(Math.abs(k.bodyTurn - ATTACKS.slash.turn) < 0.05, `turn ${k.bodyTurn}`);
});
// The board in the knight's own frame (facing +z, left +x): which way its face looks, which way its top points,
// and how high its top and point stand.
function board(k) {
  const M = k.propMatrices.subarray(16, 32), s = Math.hypot(M[0], M[1], M[2]);
  const [top, low] = k.kind ? [0.386, -0.533] : [0.294, -0.405];
  return { face: [-M[8] / s, -M[9] / s, -M[10] / s], up: [M[4] / s, M[5] / s, M[6] / s], top: M[5] * top + M[13], point: M[5] * low + M[13] };
}
test('a knight carries his shield as it was carried: at his side at ease, upright before him on guard and in a shield blow', () => {
  for (const kind of [0, 1]) {
    const k = knight(kind), sim = simulation();
    const run = (frames, set) => { for (let i = 0; i < frames; i++) { set(); sim.time += 1 / 60; k.animate(1 / 60, sim); } };
    const shoulder = () => k.pose.wt[k.rig.index.get('upperarm_l') * 3 + 1];
    for (const walk of [0, 1.4]) {
      // At ease, standing or walking: hanging against his left side, face out, top below the shoulder, point off the ground.
      run(90, () => { k.combat = k.combatTarget = 0; k.shieldUp = k.shieldTarget = 0; k.speed = walk; });
      const b = board(k);
      assert.ok(b.face[0] > 0.85 && b.up[1] > 0.95, `${kind} ${walk}: at his side, face ${b.face.map((v) => v.toFixed(2))} up ${b.up.map((v) => v.toFixed(2))}`);
      assert.ok(b.top < shoulder() && b.top > shoulder() - 0.3 && b.point > 0.15, `${kind} ${walk}: top ${b.top.toFixed(2)} point ${b.point.toFixed(2)}`);
      assert.ok(k.equipmentPenalty('l') < 0.01, `${kind} ${walk}: clear of the leg`);
    }
    // On guard: upright before him, face to the front, the top over his shoulder.
    run(90, () => { k.combat = k.combatTarget = 1; k.shieldUp = k.shieldTarget = 1; k.speed = 0; });
    let b = board(k);
    assert.ok(b.face[2] > 0.95 && b.up[1] > 0.95 && b.top > shoulder(), `${kind} guard: face ${b.face.map((v) => v.toFixed(2))} up ${b.up.map((v) => v.toFixed(2))}`);
    // Punched with the board: it stays upright and square to the front, not laid flat over his head.
    k.startAttack(sim, ATTACKS.jab);
    run(30, () => { k.actRate = 0; k.actT = k.action.dur * 0.5; });
    b = board(k);
    assert.ok(b.face[2] > 0.8 && b.up[1] > 0.85, `${kind} jab: face ${b.face.map((v) => v.toFixed(2))} up ${b.up.map((v) => v.toFixed(2))}`);
  }
});
test('a blow into a raised shield is followed by a boot, and a broken guard by the big one', () => {
  const a = knight(), b = knight(1), sim = simulation([a, b]);
  b.x = 1.6; b.shieldUp = 1; b.state = S.BLOCK;
  a.attack = ATTACKS.slash; a.outcome = 'blocked';
  for (let i = 0; i < 20; i++) assert.ok(a.chainNext(sim, b, 1.6).breaker);
  b.state = S.BREAK; b.shieldUp = 0; a.attack = ATTACKS.kick; a.outcome = 'broke';
  let heavy = 0;
  for (let i = 0; i < 40; i++) heavy += ['over', 'chop', 'c'].includes(a.chainNext(sim, b, 1.6)?.key) ? 1 : 0;
  assert.ok(heavy >= 34, `heavy ${heavy}`);
});
test('a kick into a raised shield breaks the guard', () => {
  const a = knight(), b = knight(1), sim = simulation([a, b]);
  b.x = 0; b.z = 1.2; b.faceYaw = Math.PI; b.shieldUp = 1; a.x = 0; a.z = 0;
  a.animate(1 / 60, sim);
  a.pose.wt[a.J.ball_r * 3] = 0; a.pose.wt[a.J.ball_r * 3 + 1] = 1; a.pose.wt[a.J.ball_r * 3 + 2] = 1.0;
  a.strike(sim, b, ATTACKS.kick);
  assert.equal(b.state, S.BREAK); assert.equal(a.outcome, 'broke');
});
test('a raised shield takes most of a spell from the front and none from behind', () => {
  const k = knight(), sim = simulation();
  k.shieldUp = 1; k.faceYaw = 0; k.stam = 100;
  assert.ok(k.spellGuard(sim, 0, 5, 20) < 0.3);
  assert.equal(k.spellGuard(sim, 0, -5, 20), 1);
  assert.equal(k.spellGuard(sim, k.x, k.z, 20), 1);
});
test('the guard on the church door lets you go past his leash', () => {
  const k = new Knight(0, 0, knight().rig, bank, { spawn: [0, 0], hp: 500, hostile: true, swordScale: 1, shieldScale: 1, bladeLen: 1, route: [[0, 0]], walk: 1.5, style: 'black', leash: 20 });
  const sim = simulation();
  sim.player.x = 10; assert.equal(k.selectTarget(sim), sim.player);
  sim.player.x = 25; assert.equal(k.selectTarget(sim), null);
  k.x = 21; assert.equal(k.selectTarget(sim), sim.player);   // (but not one at arm's length)
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
  w.grid = new Uint8Array(NAV_W * NAV_H); w.slots = new Map();
  const field = new Float32Array(NAV_W * NAV_H).fill(1e9), cell = -NAV_Z0 * NAV_W - NAV_X0;   // (the cell at 0, 0)
  field[cell] = 5; field[cell + NAV_W] = 4;
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
