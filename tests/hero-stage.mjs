// A stage for the other Tessariels with no page (tests/hero-skills.test.mjs): one hero on the real body and clips, a bare
// land, a sim that counts what's drawn and what's heard, and foes that only stand and take it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { makeCast } from '../src/core/heroes.js';
import { ClipBank, Rig } from '../src/sim/anim.js';
import { Hero, HeroWorld } from '../src/sim/hero.js';
import { World } from '../src/sim/world.js';

const bytes = (path) => { const b = fs.readFileSync(new URL(path, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const json = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const bank = new ClipBank(json('../assets/game/heroes/clips.json'), bytes('../assets/game/heroes/clips.bin'));
const roster = json('../assets/game/heroes/roster.json'), kit = json('../assets/game/heroes/kit.json'), names = json('../assets/game/heroes/names.json');
const rigs = new Map();
const rigOf = (id) => { if (!rigs.has(id)) rigs.set(id, new Rig(parseGLB(bytes(`../assets/game/heroes/${id}.glb`)), bank)); return rigs.get(id); };

// A bare land (no boxes, no pines), a sim that counts what's drawn and what's heard, and foes that only stand and take it.
export function stage(cls, level = 30, nFoes = 6) {
  const world = Object.assign(Object.create(World.prototype), { colliders: [], trunks: new Map(), siteBoxes: new Map(), height: () => 0,
    clearance: (x, z, dx, dz, dist) => dist, rayBoxes: () => -1, sees: () => true, inside: () => false, resolve: () => {}, updateField() {}, flow(out) { out[0] = 0; out[1] = 1; } });
  const fx = { n: 0, bursts: 0, kinds: new Set(), events: [] };
  const sim = { time: 0, tick: 0, gameState: 0, world, knights: [], heroes: [], player: { x: -8, y: 0, z: -6, yaw: 0, hp: 100, maxHp: 100, dead: false },
    casting: { fx(shape, ...a) { fx.n++; fx.kinds.add(shape); assert.ok(a.slice(0, 13).every((v) => v === undefined || Number.isFinite(v)), `a shape ${shape} with a number that isn't one: ${a.slice(0, 13)}`); },
      burst(shape, elem, x, y, z, s0, s1, life, o = {}) { fx.bursts++; fx.kinds.add(shape); assert.ok([x, y, z, s0, s1, life, ...Object.values(o)].every(Number.isFinite), `a burst ${shape} with a number that isn't one`); },
      shove() {}, aff: new Map(), affOf(k) { if (!this.aff.has(k)) this.aff.set(k, { stun: 0, slow: 0 }); return this.aff.get(k); } },
    event(type, ...a) { fx.events.push(type); assert.ok(a.every(Number.isFinite), `an event ${type} with a number that isn't one: ${a}`); }, poseGap: null };
  const cast = makeCast(roster, kit, names, 16, 7);
  const person = { ...cast.find((p) => p.cls === cls), slot: 0, level };
  const props = kit.props;
  const hero = new Hero(0, rigOf(person.body), bank, person, props);
  const foes = [];
  for (let i = 0; i < nFoes; i++) {
    const a = i / nFoes * Math.PI * 2, r = i === 0 ? 0 : 2.2;
    foes.push({ id: i, x: 6 + Math.sin(a) * r, y: 0, z: Math.cos(a) * r, yaw: Math.PI, hp: 1e6, maxHp: 1e6, dead: false, dormant: false, aggro: true, hits: 0, onHit() { this.hits++; } });
  }
  sim.knights = foes; sim.heroes = [hero];
  const w = new HeroWorld(sim, [hero]);
  sim.heroWorld = w;
  hero.x = hero.lastX = 0; hero.z = hero.lastZ = 0; hero.y = 0; hero.yaw = hero.faceYaw = Math.PI / 2;
  hero.task = { kind: 'hunt', peace: false, there: false };
  hero.simRef = sim;
  const ctx = { now: '' };
  const step = (secs, each) => {
    for (let t = 0; t < secs; t += 1 / 120) {
      sim.time += 1 / 120; sim.tick++;
      for (const f of foes) f.hp = 1e6;
      w.step(1 / 120);
      w.drawFx();
      assert.ok([hero.x, hero.y, hero.z, hero.yaw].every(Number.isFinite), 'the hero is somewhere');
      assert.ok([...hero.propMatrices].every(Number.isFinite), `what the hero holds is somewhere (${ctx.now || ''})`);
      assert.ok([...hero.pose.wt].every(Number.isFinite), 'the body holds together');
      each?.();
    }
  };
  return { sim, w, hero, foes, fx, step, ctx };
}

