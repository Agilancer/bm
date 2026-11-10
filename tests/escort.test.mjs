// Run with node --test tests/*.test.mjs. No browser required.
// The walk down from the cave (src/sim/opening.js escort): Lisandra leads, at your pace, on a shield when you're on yours,
// and talks the whole way without two lines at once. A stand-in player walks, stands about and rides down the road.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Opening } from '../src/sim/opening.js';
import { COLLAPSE_END, OPENING } from '../src/core/opening.js';
import { CUES, CUE_IDS } from '../src/core/opening-script.js';
import { ROUTE, routeAt, routeDir } from '../src/core/escort.js';

// Plays the walk with the player going `speed(t)` m/s down the road (surfing while `surf(t)`, `side(t)` m off it to the
// left), from just behind her.
function play(speed, surf = () => false, limit = 240, side = () => 0) {
  const world = { height: () => 0, setCaveSealed() {}, inside: () => false };
  const body = () => ({ x: 0, z: 0, y: 0, yaw: 0, act(dt, w, b) {
    this.b = b;
    if (b.to && b.speed > 0) {
      const dx = b.to[0] - this.x, dz = b.to[1] - this.z, d = Math.hypot(dx, dz);
      if (d > 0.02) { const s = Math.min(d, b.speed * dt); this.x += dx / d * s; this.z += dz / d * s; }
    }
    this.y = b.lift || 0;
  } });
  const player = { x: 0, z: 0, y: 0, vx: 0, vz: 0, surfing: false, maxHp: 100, hp: 100 };
  const sim = { player, world, villagers: [body(), body()], knights: [], event() {} };
  const op = new Opening(sim);
  op.setStage(OPENING.COLLAPSE);
  op.time = COLLAPSE_END - 0.01;
  const dt = 1 / 60;
  op.update(dt);
  assert.equal(op.stage, OPENING.ESCORT);
  let s = -4, t = 0, lastCueT = Infinity;
  const said = [], log = [];
  while (op.stage === OPENING.ESCORT && t < limit) {
    const v = speed(t);
    player.surfing = surf(t);
    s += v * dt;
    const [x, z] = routeAt(s), [dx, dz] = routeDir(s), off = side(t);
    Object.assign(player, { x: x - dz * off, z: z + dx * off, vx: dx * v, vz: dz * v });
    op.update(dt);
    t += dt;
    if (op.cue && op.cueT < lastCueT) said.push({ t, id: CUE_IDS[op.cue - 1] });
    lastCueT = op.cueT;
    if (op.stage === OPENING.ESCORT) log.push({ t, you: Math.max(0, s), far: Math.hypot(player.x - sim.villagers[1].x, player.z - sim.villagers[1].z), her: op.prog, riding: op.riding, lift: sim.villagers[1].y, clip: sim.villagers[1].b?.clip });
  }
  return { op, said, log, t };
}

test('walking after her, she leads the whole way, a few steps ahead, and gets you to town', () => {
  const { op, log } = play(() => 5.6);
  assert.equal(op.stage, OPENING.ARRIVED);
  const road = log.filter((e) => e.t > 3 && e.her < ROUTE.len - 1);
  assert.ok(road.length > 100);
  for (const e of road) assert.ok(e.her - e.you > 3.5 && e.her - e.you < 8, `${(e.her - e.you).toFixed(1)} m ahead at ${e.t.toFixed(1)} s`);
});

test('at a sprint she still keeps in front', () => {
  const { log } = play(() => 8.6);
  for (const e of log.filter((e) => e.t > 3 && e.her < ROUTE.len - 1)) assert.ok(e.her > e.you + 2, `behind you at ${e.t.toFixed(1)} s`);
});

test('stand still and she goes on a little, waits, and calls you on', () => {
  const { said, log } = play((t) => (t < 30 ? 0 : 5.6));
  const stood = log.filter((e) => e.t > 20 && e.t < 30);
  for (const e of stood) assert.ok(e.her - e.you > 6.5 && e.her - e.you < 9.5, `${(e.her - e.you).toFixed(1)} m off while you stand`);
  assert.ok(Math.max(...stood.map((e) => e.her)) - Math.min(...stood.map((e) => e.her)) < 0.5, 'she waits rather than wandering off');
  assert.ok(said.some((l) => l.id.startsWith('keep') && l.t < 30), 'she calls you on');
});

test('go off the road and she stops where she is and waits for you', () => {
  // Down the road a way, then off into the trees beside it, and back.
  const { log, op } = play((t) => (t < 10 ? 5.6 : t < 30 ? 0 : 5.6), () => false, 240, (t) => (t < 10 ? 0 : t < 30 ? Math.min(30, (t - 10) * 5) : Math.max(0, 30 - (t - 30) * 5)));
  const off = log.filter((e) => e.t > 17 && e.t < 30);
  assert.ok(Math.max(...off.map((e) => e.her)) - Math.min(...off.map((e) => e.her)) < 0.3, 'she waits rather than going on without you');
  assert.ok(off.every((e) => e.clip === 'idle' || e.clip === 'wait'), 'stood, turned to you');
  assert.equal(op.stage, OPENING.ARRIVED, 'and leads on once you are back');
});

test('run on far ahead of her and she comes after you, gets in front again, and on to town', () => {
  const { log, op } = play((t) => (t < 5 ? 20 : 5.6));
  assert.ok(log.some((e) => e.you - e.her > 40), 'you got well ahead');
  assert.ok(log.some((e) => e.t > 20 && e.her > e.you + 3), 'she caught up and leads again');
  assert.equal(op.stage, OPENING.ARRIVED);
});

test('ride your shield and she rides hers, ahead of you, and steps off after', () => {
  const { said, log } = play((t) => (t < 4 ? 5.6 : t < 22 ? 16 : 5.6), (t) => t >= 4 && t < 22);
  const riding = log.filter((e) => e.t > 6 && e.t < 22);
  for (const e of riding) {
    assert.ok(e.riding, `on foot at ${e.t.toFixed(1)} s while you ride`);
    assert.equal(e.clip, 'Crouch_Idle_Loop');
    assert.ok(e.lift > 0.1, 'stood on the board, off the ground');
    assert.ok(e.her > e.you + 3, `behind you at ${e.t.toFixed(1)} s`);
  }
  assert.ok(log.filter((e) => e.t > 30 && e.her < ROUTE.len - 1).every((e) => !e.riding), 'off it once you are');
  assert.ok(said.some((l) => l.id === 'board'), 'she says so when she gets on');
});

test('she talks the whole way down, one line at a time', () => {
  for (const speed of [() => 5.6, () => 8.6, (t) => (t < 30 ? 0 : 5.6)]) {
    const { said, t } = play(speed);
    let quiet = 0, end = 0;
    for (let i = 0; i < said.length; i++) {
      const l = said[i], dur = CUES[l.id].dur;
      if (i) assert.ok(l.t >= said[i - 1].t + CUES[said[i - 1].id].dur - 1e-6, `${l.id} over ${said[i - 1].id}`);
      quiet += Math.max(0, l.t - end);
      end = Math.max(end, l.t + dur);
    }
    // (Only the breath between lines: about a second each.)
    assert.ok(quiet / t < 0.35, `quiet ${(quiet / t * 100).toFixed(0)}% of the way`);
    for (const id of ['lead', 'sight', 'scream', 'walk']) assert.ok(said.some((l) => l.id === id), `never said ${id}`);
    assert.equal(new Set(said.filter((l) => !l.id.startsWith('keep')).map((l) => l.id)).size, said.filter((l) => !l.id.startsWith('keep')).length, 'a line said twice');
  }
});
