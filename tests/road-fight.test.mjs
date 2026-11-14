// Run with node --test tests/*.test.mjs. No browser required.
// The fight on the road down from Lisandra's cave (src/sim/opening.js fight, src/sim/undead.js openingRaise): twenty of
// the dead, five at a time; at eight left, twenty more and ten of their children; at ten left, a necromancer from each
// side; and on to town once they're all down. Stand-in bodies stand in for the dead: who comes up, when, and how many.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Opening } from '../src/sim/opening.js';
import { COLLAPSE_END, OPENING } from '../src/core/opening.js';
import { CUE_IDS } from '../src/core/opening-script.js';
import { ROUTE, routeAt, routeDir, routeNear } from '../src/core/escort.js';
import { BODIES, Caster, Zombie } from '../src/sim/undead.js';

// A body with a zombie's place in the world and none of its workings: in the ground until it's called up.
function standIn(proto, opts) {
  const k = Object.create(proto);
  Object.assign(k, { opts, scale: opts.scale || 1, x: 0, z: 0, y: 0, dead: true, dormant: true, deadT: 0, state: 0, stateT: 9, ups: 0, owner: null,
    reset(o) { Object.assign(this, { x: o.spawn[0], z: o.spawn[1], dead: false, dormant: false, deadT: 0, hp: o.hp, maxHp: o.hp }); this.ups++; },
    rise() {}, onHit() {} });
  return k;
}

function world() {
  const knights = [];
  for (const b of BODIES) for (let i = 0; i < b.count; i++) {
    const caster = !b.model.startsWith('zombie_') || b.model === 'zombie_necromancer', reserve = i >= b.count - (b.kept || 0);
    if (b.model === 'zombie_ogre' || (caster && !reserve)) continue;
    knights.push(standIn(caster ? Caster.prototype : Zombie.prototype, { model: b.model, scale: b.scale, reserve, child: !!b.child, grave: !reserve && i < 2 ? [0, 0] : null, role: caster ? 'necromancer' : undefined }));
  }
  return knights;
}

// Walks to the pines and stands there; `kill(up, t)` says how many of those up to put down each second.
function play(kill) {
  const height = { height: () => 0, groundFor: () => 0, groundBy: () => 0, setCaveSealed() {}, inside: () => false };
  const body = () => ({ x: 0, z: 0, y: 0, yaw: 0, act(dt, w, b) { this.b = b; if (b.to && b.speed > 0) { const dx = b.to[0] - this.x, dz = b.to[1] - this.z, d = Math.hypot(dx, dz); if (d > 0.02) { const s = Math.min(d, b.speed * dt); this.x += dx / d * s; this.z += dz / d * s; } } } });
  const player = { x: 0, z: 0, y: 0, vx: 0, vz: 0, surfing: false, maxHp: 100, hp: 100 };
  const sim = { player, world: height, villagers: [body(), body()], knights: world(), time: 0, event() {} };
  const op = new Opening(sim);
  op.setStage(OPENING.COLLAPSE); op.time = COLLAPSE_END - 0.01; op.update(1 / 60);
  const dt = 1 / 30, at = routeNear(-161.5, 134.3);
  let s = 0, t = 0, began = -1, sec = -1;
  const log = [], said = [];
  let last = 0;
  while (op.stage === OPENING.ESCORT && t < 900) {
    const fighting = op.fightS && !op.ambushDone;
    const v = fighting ? 0 : 5.6;
    s += v * dt;
    const [x, z] = routeAt(s), [dx, dz] = routeDir(s);
    Object.assign(player, { x, z, vx: dx * v, vz: dz * v });
    op.update(dt); t += dt; sim.time = t;
    for (const k of sim.knights) if (k.dead && !k.dormant) k.deadT += dt;
    if (op.cue !== last) { last = op.cue; said.push({ t, id: CUE_IDS[op.cue - 1] }); }
    if (fighting) {
      if (began < 0) began = t;
      let up = sim.knights.filter((k) => !k.dead);
      if (Math.floor(t - began) !== sec) {
        sec = Math.floor(t - began);
        for (const k of up.slice(0, kill(up, t - began, op.fightS.phase))) { k.dead = true; k.deadT = 0; }
        up = sim.knights.filter((k) => !k.dead);
      }
      // (As the next tick will find them.)
      log.push({ t: t - began, up: up.length, children: up.filter((k) => k.opts.child).length, casters: up.filter((k) => k instanceof Caster).length, phase: op.fightS.phase, bolts: op.bolts.length });
    }
  }
  return { op, log, said, at, s, sim };
}

test('twenty come up five at a time; then twenty more and ten children; then a necromancer from each side', () => {
  // Nothing dies for twelve seconds, then two a second.
  const { op, log, said, sim } = play((up, t) => (t < 12 ? 0 : 2));
  assert.equal(op.stage, OPENING.ARRIVED, 'on to town when it is over');
  // The first wave: fives, a couple of seconds apart, to twenty and no more.
  let before = 0;
  for (const e of log.filter((e) => e.t < 12)) { assert.ok(e.up - before <= 5 && e.up <= 20, `${e.up} up at ${e.t.toFixed(1)} s`); before = e.up; }
  assert.equal(log.filter((e) => e.t > 10 && e.t < 12).at(-1).up, 20);
  assert.ok(log.find((e) => e.up === 20).t > 6, 'not all at once');
  // The second comes only once eight or fewer of the first are left; and brings children.
  const second = log.find((e) => e.phase === 2);
  assert.ok(log[log.indexOf(second) - 1].up <= 8, 'the second wave waited for eight');
  assert.ok(Math.max(...log.map((e) => e.children)) >= 3, 'children among them');
  const raised = sim.knights.filter((k) => !(k instanceof Caster)).reduce((n, k) => n + k.ups, 0);
  assert.equal(raised, 50, 'fifty of the dead in all');
  assert.equal(sim.knights.filter((k) => k.opts.child).reduce((n, k) => n + k.ups, 0), 10, 'ten of them children');
  // The necromancers: two, once ten or fewer are left, and never before.
  const third = log.find((e) => e.phase === 3);
  assert.ok(log[log.indexOf(third) - 1].up <= 10, 'the necromancers waited for ten');
  assert.equal(Math.max(...log.map((e) => e.casters)), 2);
  assert.ok(log.filter((e) => e.phase < 3).every((e) => e.casters === 0));
  // What she says of it, in order; and her fire in the air.
  const ids = said.map((l) => l.id);
  for (const id of ['risen', 'wave2', 'necro', 'after', 'heal0', 'wed4']) assert.ok(ids.includes(id), `never said ${id}`);
  assert.ok(ids.indexOf('risen') < ids.indexOf('wave2') && ids.indexOf('wave2') < ids.indexOf('necro') && ids.indexOf('necro') < ids.indexOf('after'));
  assert.ok(log.some((e) => e.bolts > 0), 'she throws fire');
});

test('with fewer bodies than the waves want, the fallen go back into the ground and come up again', () => {
  const { op, sim } = play((up, t) => (t < 4 ? 0 : 3));
  assert.equal(op.stage, OPENING.ARRIVED);
  assert.equal(sim.knights.filter((k) => !(k instanceof Caster)).reduce((n, k) => n + k.ups, 0), 50);
});

test('the bodies kept for the road are enough for its children and its necromancers, and no model is listed twice but the children\'s', () => {
  assert.equal(BODIES.filter((b) => b.child).reduce((n, b) => n + b.kept, 0), 10);
  assert.equal(BODIES.filter((b) => b.model === 'necromancer').reduce((n, b) => n + (b.kept || 0), 0), 2);
  const seen = new Map();
  for (const b of BODIES) seen.set(b.model, (seen.get(b.model) || 0) + 1);
  assert.deepEqual([...seen].filter(([, n]) => n > 1).map(([m]) => m), [BODIES.find((b) => b.child).model]);
  assert.ok(ROUTE.len > 400);
});

test('a wizard or a necromancer with no pane of light up still takes a spell: its ward is a count of blows, not a share', async () => {
  // (Spells once took `k.ward ?? 1` as the share of a blow that lands, which is the Warrens' twins' (now `shrug`): on a
  // caster `ward` is how much its pane of light has left, nought with none up, so nothing of yours ever hurt one.)
  const fs = await import('node:fs');
  for (const f of ['../src/sim/casting.js', '../src/sim/hero.js']) {
    const src = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/\*=?\s*\(?\w+\.ward \?\? 1/.test(src), `${f} scales a blow by ward`);
  }
  const k = Object.assign(Object.create(Caster.prototype), { ward: 0, hp: 60, seenHp: 60, maxHp: 60, rayPiece: -1, easy: true, alive: [], limb: [], hitPart: [] });
  k.hp -= 10; k.takeBlow({ casting: { burst() {} } }, 10);
  assert.ok(k.hp < 60, `it took the blow (${k.hp})`);
});

test('the dead come up when you reach the place on the road, not when she does; the hint is then to kill them', async () => {
  const { hintOf } = await import('../src/ui/questlog.js');
  const height = { height: () => 0, groundFor: () => 0, groundBy: () => 0, setCaveSealed() {}, inside: () => false };
  const body = () => ({ x: 0, z: 0, y: 0, yaw: 0, act(dt, w, b) { if (b.to && b.speed > 0) { const dx = b.to[0] - this.x, dz = b.to[1] - this.z, d = Math.hypot(dx, dz); if (d > 0.02) { const s = Math.min(d, b.speed * dt); this.x += dx / d * s; this.z += dz / d * s; } } } });
  const player = { x: 0, z: 0, y: 0, vx: 0, vz: 0, surfing: false, maxHp: 100, hp: 100 };
  const sim = { player, world: height, villagers: [body(), body()], knights: world(), time: 0, event() {} };
  const op = new Opening(sim);
  op.setStage(OPENING.COLLAPSE); op.time = COLLAPSE_END - 0.01; op.update(1 / 60);
  const at = routeNear(-161.5, 134.3), dt = 1 / 30;
  const put = (s, v) => { const [x, z] = routeAt(s), [dx, dz] = routeDir(s); Object.assign(player, { x, z, vx: dx * v, vz: dz * v }); };
  const Q = { active: () => [] };
  // Walked down to a few steps short of it, and stood there a good while (her a little way on, waiting): nothing.
  let s = 0;
  for (; s < at - 3; s += 5.6 * dt) { put(s, 5.6); op.update(dt); }
  for (let t = 0; t < 30; t += dt) { put(s, 0); op.update(dt); }
  assert.equal(op.fightS, null, 'nothing comes up before you get there');
  const snap = [];
  op.write(snap, { OPENING: 0, OPENING_TIME: 1, OPENING_NEXT: 2, OPENING_CUE: 3, OPENING_CUE_T: 4, OPENING_FELL: 5, OPENING_RIDE: 6, OPENING_FIGHT: 7 });
  assert.equal(hintOf({ Q, stage: snap[0], fight: snap[7] }).title, 'The Long Road');
  // A few steps on, past it: they're up, and the work is to put them down.
  for (let t = 0; t < 1.5; t += dt) { s += 4 * dt; put(s, 4); op.update(dt); }
  assert.ok(op.fightS && !op.ambushDone, 'they come up once you reach it');
  op.write(snap, { OPENING: 0, OPENING_TIME: 1, OPENING_NEXT: 2, OPENING_CUE: 3, OPENING_CUE_T: 4, OPENING_FELL: 5, OPENING_RIDE: 6, OPENING_FIGHT: 7 });
  assert.ok(snap[7] > 0);
  assert.equal(hintOf({ Q, stage: snap[0], fight: snap[7] }).title, 'Kill the zombies and the necromancers');
  // Done with them: back to following her down.
  assert.equal(hintOf({ Q, stage: snap[0], fight: 0 }).title, 'The Long Road');
});
