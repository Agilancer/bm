// The smith at his anvil: his hammer comes down on the anvil's face, it's in his hand only while he works, and nobody in
// town is asked for a clip that's been taken out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { quatMul, quatRotate } from '../src/core/math.js';
import { FolkClips, FolkRig } from '../src/folk/rig.js';
import { Ground } from '../src/folk/ground.js';
import { Town, PLACES } from '../src/folk/town.js';
import { Life, ACT, forgeSpot } from '../src/folk/brain.js';
import { WORK } from '../src/folk/days.js';
import { PEOPLE } from '../src/folk/people.js';
import { FORGE, HAMMER, SMITH_CLIPS, gripOf, hammerAtRest, hammerMesh } from '../src/folk/smithy.js';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const AB = (p) => { const b = R(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const meta = J('assets/game/folk/clips.json');
const clips = new FolkClips(meta, AB('assets/game/folk/clips.bin'));

test('every clip the townsfolk are given is one they have, and none of them pushes', () => {
  const asked = new Set();
  for (const w of Object.values(WORK)) for (const c of w.clips || []) asked.add(c);
  for (const p of PLACES) for (const c of p.clips || []) asked.add(c);
  for (const p of PEOPLE) { for (const c of p.idles || []) asked.add(c); asked.add(p.walk); }
  for (const c of Object.values(SMITH_CLIPS)) if (typeof c === 'string') asked.add(c);
  for (const c of asked) assert.ok(clips.clips[c], `no clip ${c}`);
  assert.ok(!asked.has('push') && !clips.clips.push, 'push is gone');
});

test('the hammer is a closed-looking thing, every side facing out', () => {
  const m = hammerMesh();
  assert.ok(m.idx.length % 3 === 0 && m.idx.length > 60);
  for (let t = 0; t < m.idx.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [0, 1, 2].map((i) => m.pos[m.idx[t + k] * 3 + i]));
    const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const want = [0, 1, 2].map((i) => m.nrm[m.idx[t] * 3 + i]);
    assert.ok(n[0] * want[0] + n[1] * want[1] + n[2] * want[2] > 0, `triangle ${t / 3} is wound inside out`);
  }
});

test('the anvil in the smithy stands where the blows were made to land', () => {
  const town = new Town(J('assets/game/village.json'), J('assets/game/interior/interior.json'), J('assets/game/folk/spots.json'));
  const spot = forgeSpot(town);
  assert.ok(spot, 'the anvil says which side the smith stands');
  const src = R('tools/interior/build_interior.py').toString();
  assert.equal(+src.match(/ANVIL_FACE, ANVIL_OFF = ([\d.]+), ([\d.]+)/)[1], FORGE.face);
  assert.equal(+src.match(/ANVIL_FACE, ANVIL_OFF = ([\d.]+), ([\d.]+)/)[2], FORGE.off);
  // Its collider is in the built interior, and leaves him room to stand.
  const c = J('assets/game/interior/interior.json').colliders.find((k) => Math.hypot(k.x - spot.anvil.x, k.z - spot.anvil.z) < 0.1 && k.h < 2);
  assert.ok(c && Math.abs(c.h - FORGE.face) < 0.05, 'the anvil is as tall as its face');
  assert.ok(Math.abs(spot.z - c.z) - c.hz > 0.3 * 0.8, 'he can stand where he works');
  // The hammer's left on its face.
  const rest = hammerAtRest(spot.x, spot.y, spot.z, spot.yaw), face = [0, 0, 0];
  quatRotate(face, 0, rest.q, 0, [0, HAMMER.head, HAMMER.face], 0);
  assert.ok(Math.abs(face[1] + rest.t[1] - (spot.y + FORGE.face)) < 0.005);
});

test('a morning at the forge: every blow lands on the anvil, and the hammer stays behind when he goes', () => {
  const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), folk = J('assets/game/folk/folk.json');
  const town = new Town(village, interior, J('assets/game/folk/spots.json'));
  const life = new Life({ ground: new Ground(village, interior, [-80, -75, 110, 80]), town, clips, emit: () => {} });
  const rigs = new Map();
  for (const me of life.folk) {
    let m = me.p.body;
    if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
    const key = `${m}|${me.p.armOut || 0}`;
    if (!rigs.has(key)) rigs.set(key, new FolkRig(parseGLB(AB(`assets/game/folk/${folk.models[m].glb}`)), clips, { armOut: me.p.armOut }));
    life.setRig(me.i, rigs.get(key));
  }
  const me = life.byId.homunculus, spot = forgeSpot(town), grip = gripOf(me.rig), pal = new Float32Array(80 * 8);
  const c = Math.cos(spot.yaw), s = Math.sin(spot.yaw), [sx, sy, sz] = FORGE.strike;
  const strike = [spot.x + sx * c + sz * s, spot.y + sy, spot.z - sx * s + sz * c];
  const dt = 1 / 30;
  let hour = 6.9, blows = 0, worst = 0, last = -1, took = 0, laid = 0, was = false, carried = 0;
  while (hour < 12.6) {
    hour += dt / 240;
    life.update(dt, { hour, day: 0, player: [-200, 0, -200], dangers: [] });
    const clip = me.pose.clip, t = clip ? me.pose.time % clip.dur : 0;
    if (me.tool !== was) { if (me.tool) took++; else laid++; was = me.tool; }
    const off = Math.hypot(me.x - spot.x, me.z - spot.z);
    if (me.tool && off > 0.3) carried++;
    if (clip?.name === SMITH_CLIPS.blow) {
      assert.ok(me.tool, 'he swings with the hammer in his hand');
      if (last >= 0 && last < SMITH_CLIPS.blowAt && t >= SMITH_CLIPS.blowAt && me.pose.w >= 1) {
        me.pose.solve(me.x, me.y, me.z, me.yaw, pal, 0);
        const h = me.rig.hands[1], q = [0, 0, 0, 1], g = [0, 0, 0], f = [0, 0, 0];
        quatMul(q, 0, me.pose.wq, h * 4, grip.q, 0);
        quatRotate(g, 0, me.pose.wq, h * 4, grip.t, 0);
        quatRotate(f, 0, q, 0, [0, HAMMER.head, HAMMER.face], 0);
        const face = [0, 1, 2].map((k) => me.pose.wt[h * 3 + k] + g[k] + f[k]);
        worst = Math.max(worst, Math.hypot(face[0] - strike[0], face[1] - strike[1], face[2] - strike[2]));
        blows++;
      }
      last = t;
    } else last = -1;
  }
  assert.ok(blows > 100, `he hammers all morning (${blows} blows)`);
  // (A frame of the sim either side of the moment it lands, at the speed the head's coming down.)
  assert.ok(worst < 0.06, `the face lands on the anvil's (${(worst * 1000).toFixed(0)} mm off at worst)`);
  assert.ok(took >= 2 && laid >= 2, `he takes it up and lays it down (${took}, ${laid})`);
  assert.equal(carried, 0, 'the hammer never leaves the anvil in his hand');
  assert.ok(!me.tool && me.act !== ACT.WORK, 'at dinner it lies on the anvil');
});
