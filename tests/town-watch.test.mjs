// Tessariel's town guard (src/sim/town-watch.js): nothing of the player's harms them and they never turn on the player; the
// watch sends the nearest to whatever attacks near the town, lets Velscour's men stand their posts, and stands a fallen
// guard up again at his beat.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { ClipBank, Rig } from '../src/sim/anim.js';
import { Knight, ATTACKS } from '../src/sim/knight.js';
import { Casting } from '../src/sim/casting.js';
import { TownWatch, WATCH } from '../src/sim/town-watch.js';
import { World } from '../src/sim/world.js';

const bytes = (path) => { const b = fs.readFileSync(new URL(path, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const bank = new ClipBank(JSON.parse(fs.readFileSync(new URL('../assets/game/clips.json', import.meta.url))), bytes('../assets/game/clips.bin'));
const silver = bytes('../assets/game/silver_knight.glb'), black = bytes('../assets/game/velscour_knight.glb');

function guard(id, x, z) {
  return new Knight(id, 1, new Rig(parseGLB(silver), bank), bank, { spawn: [x, z], hp: 380, hostile: false, guard: true, swordScale: 0.96, shieldScale: 1.25,
    bladeLen: 1, route: [[x, z], [x + 10, z]], walk: 1.4, style: 'silver', suit: `g${id}` });
}
function velscour(id, x, z) {
  return new Knight(id, 0, new Rig(parseGLB(black), bank), bank, { spawn: [x, z], hp: 460, hostile: true, swordScale: 1.085, shieldScale: 1.6,
    bladeLen: 1, route: [[x, z]], walk: 1.5, style: 'black', leash: 22, suit: 'knight' });
}
function world() {
  return Object.assign(Object.create(World.prototype), { colliders: [], trunks: new Map(), siteBoxes: new Map(), height: () => 0, sees: () => true });
}
function simulation(knights, player = { x: 0, y: 0, z: 0, dead: false, hp: 100, damage() { this.hp -= 50; return true; } }) {
  return { time: 0, tick: 0, gameState: 0, world: world(), knights, heroes: [], player, casting: { bolts: [] }, event() {}, slowMo() {}, hitStop() {}, tacticWeights: [1, 1, 1, 1, 1, 1] };
}
const beast = (x, z, o = {}) => ({ x, y: 0, z, hp: 60, maxHp: 60, aggro: true, hostile: true, bodyRadius: 0.5, opts: { model: 'zombie' }, dead: false, ...o });

test('nothing of the player\'s harms a town guard, and a blow never turns him', () => {
  const g = guard(1, 0, 0), sim = simulation([g]);
  const c = new Casting([]);
  c.hurt(sim, g, 80, 0, 0, 1, 0, 3, 0);
  assert.equal(g.hp, 380);
  g.onHit(sim, 'gash', 3, 0, 40);
  assert.equal(g.hostile, false);
  assert.ok(g.keeper);
  // (Set against you on purpose, as the review scenes do, he can be hurt like any knight.)
  g.hostile = true;
  assert.ok(!g.keeper);
  c.hurt(sim, g, 80, 0, 0, 1, 0, 3, 0);
  assert.ok(g.hp < 380);
});

test('a town guard never picks the player, or lays a blade on them', () => {
  const g = guard(1, 0, 0), sim = simulation([g]);
  sim.player.x = 1.2;
  assert.equal(g.selectTarget(sim), null);
  g.bladeA = [0.6, 1.2, 0]; g.bladeB = [1.4, 1.2, 0];
  g.strike(sim, sim.player, ATTACKS.a);
  assert.equal(sim.player.hp, 100);
});

test('the nearest guard goes to something hunting at the town\'s edge, and back to his beat when it\'s dead', () => {
  const near = guard(1, -50, 0), far = guard(2, 40, 0), m = beast(-68, 0);
  const sim = simulation([near, far, m]);
  const w = new TownWatch(sim);
  w.step(1);
  assert.equal(near.duty, m);
  assert.equal(far.duty, null);
  assert.equal(near.selectTarget(sim), m);
  m.dead = true; m.hp = 0;
  w.step(1);
  assert.equal(near.duty, null);
});

test('something far out in the land, or not hunting, is left alone', () => {
  const g = guard(1, -50, 0), sim = simulation([g, beast(-90, 0), beast(-66, 0, { aggro: false, hostile: false })]);
  new TownWatch(sim).step(1);
  assert.equal(g.duty, null);
});

test('Velscour\'s man stands his post outside the town unbothered, until he\'s at someone near it', () => {
  const a = guard(1, -56, 0), b = guard(2, -40, 10), v = velscour(3, -74, 4);
  const sim = simulation([a, b, v]);
  const w = new TownWatch(sim);
  w.step(1);
  assert.equal(a.duty, null);
  // A guard walking his beat past the post isn't one he goes for.
  assert.equal(v.selectTarget(sim), null);
  v.target = sim.player; sim.player.x = -64;
  w.step(1);
  // One of Velscour's knights gets two.
  assert.equal(a.duty, v);
  assert.equal(b.duty, v);
  // And he fights a guard come for him, wherever his leash would have him.
  v.target = null; sim.player.x = 0;
  v.opts.spawn = [-200, 0];
  a.x = -70; a.z = 4;
  assert.equal(v.selectTarget(sim), a);
});

test('a guard cut down stands again at his beat', () => {
  const g = guard(1, 10, 0), sim = simulation([g]);
  sim.player.x = 0;
  const w = new TownWatch(sim);
  g.dead = true; g.hp = 0; g.deadT = WATCH.rise + 1;
  w.step(0.1);
  assert.equal(g.dead, false);
  assert.equal(g.hp, 380);
  // At the post of his beat furthest from the player.
  assert.equal(g.x, 20);
});

test('a guard\'s blow on a beast takes it down and turns it on him', () => {
  const g = guard(1, 0, 0), m = beast(1.2, 0), sim = simulation([g, m]);
  let died = false;
  m.die = () => { died = true; m.dead = true; };
  g.hitBeast(sim, m, ATTACKS.c);
  assert.equal(m.fixOn, g);
  assert.ok(m.hp < 60);
  for (let i = 0; i < 6 && !m.dead; i++) g.hitBeast(sim, m, ATTACKS.c);
  assert.ok(died);
});
