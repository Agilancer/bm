// The smith in his yard: what's built there stands where his work was made for, the village's files have it, his hammer
// comes down on the iron on the anvil's face, each tool's in his hand only while he's using it and back where it lives
// when he goes, and nobody in town is asked for a clip that's been taken out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { quatRotate } from '../src/core/math.js';
import { FolkClips, FolkRig } from '../src/folk/rig.js';
import { Ground } from '../src/folk/ground.js';
import { Town, PLACES } from '../src/folk/town.js';
import { Life, ACT } from '../src/folk/brain.js';
import { WORK } from '../src/folk/days.js';
import { PEOPLE } from '../src/folk/people.js';
import { BLADE, FIRE, FORGE, HAMMER, KD, KIT, KJ, REST, SMITH_CLIPS, STATIONS, SmithKit, TONGS, WHEEL, YARD_Y, dqOrigin, inYard } from '../src/folk/smithy.js';
import { PAINT, RUNES, barMesh, coalMesh, hammerMesh, kitMesh } from '../src/folk/smithkit.js';
import { YARD_COLLIDERS, YARD_LIGHTS } from '../src/core/smithyard.js';
import { terrainHeight } from '../src/core/terrain.js';
import { Kit } from '../src/core/sites.js';
import { smithYard } from '../src/core/smithyard.js';

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

test('the kit is three sound meshes, every corner on a joint of it, every colour one of its paints', () => {
  const names = Object.keys(PAINT);
  for (const [what, m] of [['kit', kitMesh()], ['bar', barMesh()], ['coals', coalMesh()], ['hammer', hammerMesh()]]) {
    const n = m.pos.length / 3;
    assert.ok(n > 20 && m.idx.length % 3 === 0, `${what} has corners`);
    assert.ok(m.pos.every(Number.isFinite) && m.nrm.every(Number.isFinite), `${what}: every number is one`);
    assert.ok(m.idx.every((i) => i < n), `${what}: every triangle's corners are there`);
    for (let i = 0; i < n; i++) {
      assert.ok(m.joints[i * 4] < KIT.length, `${what}: a corner on a joint the kit hasn't got`);
      const u = m.uv[i * 2] * names.length;
      assert.ok(u > 0 && u < names.length, `${what}: a colour off the strip`);
    }
    // Wound the way its normals say.
    for (let t = 0; t < m.idx.length; t += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => [0, 1, 2].map((i) => m.pos[m.idx[t + k] * 3 + i]));
      const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
      const nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const want = [0, 1, 2].map((i) => m.nrm[m.idx[t] * 3 + i]);
      if (Math.hypot(...nn) > 1e-9 && m.joints[m.idx[t] * 4] === m.joints[m.idx[t + 1] * 4] && m.joints[m.idx[t] * 4] === m.joints[m.idx[t + 2] * 4]) assert.ok(nn[0] * want[0] + nn[1] * want[1] + nn[2] * want[2] > 0, `${what}: triangle ${t / 3} is wound inside out`);
    }
  }
  // Every piece of the kit has something of it to draw.
  const k = kitMesh(), on = new Set();
  for (let i = 0; i < k.joints.length; i += 4) on.add(k.joints[i]);
  for (const name of KIT) if (name !== 'yard') assert.ok(on.has(KJ[name]), `nothing's drawn of the ${name}`);
});

test("the axe's runes are no V and no T", () => {
  // (The owner's rule. A V: two strokes meeting at the foot and nothing else. A T: an upright under a bar across its head.)
  for (const [n, g] of RUNES.entries()) {
    assert.ok(g.length >= 3, `rune ${n} is more than two strokes`);
    const upright = g.some(([x0, y0, x1, y1]) => x0 === x1 && Math.abs(y1 - y0) >= 3.5);
    const bar = g.some(([x0, y0, x1, y1]) => y0 === y1 && Math.max(y0, y1) >= 3.9 && Math.abs(x1 - x0) >= 1.9);
    assert.ok(!(upright && bar && g.length <= 3), `rune ${n} could be read as a T`);
  }
});

test('the yard stands on the smith\'s plot, where his work was made for, and the village\'s files have it', () => {
  for (const [name, s] of Object.entries(STATIONS)) assert.ok(Math.abs(terrainHeight(s.x, s.z) - YARD_Y) < 0.005, `the ground at the ${name} is the plot's`);
  const v = J('assets/game/village.json');
  const round = (o) => JSON.parse(JSON.stringify(o, (k, x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x)));
  assert.deepEqual(v.colliders.filter((c) => c.yard), round(YARD_COLLIDERS), 'village.json has the yard\'s colliders: node tools/village/smithyard.mjs');
  assert.deepEqual(v.lights.filter((c) => c.yard), round(YARD_LIGHTS), 'village.json has the yard\'s lights: node tools/village/smithyard.mjs');
  assert.ok(YARD_LIGHTS.length >= 5, 'there are lights posted round him');
  // He can stand at every station: nothing solid within a foot of where his feet are.
  for (const [name, s] of Object.entries(STATIONS)) {
    for (const c of v.colliders) {
      const co = Math.cos(c.yaw || 0), si = Math.sin(c.yaw || 0), dx = s.x - c.x, dz = s.z - c.z;
      const out = Math.max(Math.abs(dx * co - dz * si) - c.hx, Math.abs(dx * si + dz * co) - c.hz);
      assert.ok(out > 0.18, `at the ${name} he'd be standing in something (${c.x}, ${c.z})`);
    }
  }
  // What's built there: something of everything, and nothing with a number that isn't one.
  const K = new Kit(true);
  smithYard(K);
  K.finish();
  let n = 0;
  for (const [layer, p] of K.parts) { assert.ok(p.pos.every(Number.isFinite), `${layer}: every number is one`); n += p.pos.length / 3; }
  assert.ok(n > 4000 && K.parts.has('flame') && K.parts.has('frost:stone') && K.parts.has('water'));
  // Where things lie: the hammer on the anvil's face, the tongs' iron in the coals.
  const face = [0, 0, 0];
  quatRotate(face, 0, REST.hammer.q, 0, [0, HAMMER.head, HAMMER.face], 0);
  assert.ok(Math.abs(face[1] + REST.hammer.t[1] - (YARD_Y + FORGE.face)) < 0.005, 'the hammer stands on the anvil\'s face');
  const tip = [0, 0, 0], coals = inYard(STATIONS.fire, FIRE.coals);
  quatRotate(tip, 0, REST.tongs.q, 0, [0, TONGS.tip, 0], 0);
  assert.ok(Math.hypot(tip[0] + REST.tongs.t[0] - coals[0], tip[2] + REST.tongs.t[2] - coals[2]) < 0.2, 'the iron lies in the coals');
});

test('a morning in the yard: the axe first, every blow on the iron, each tool where it should be, and all of it put back', () => {
  const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), folk = J('assets/game/folk/folk.json');
  const town = new Town(village, interior, J('assets/game/folk/spots.json'));
  const heard = [];
  const life = new Life({ ground: new Ground(village, interior, [-80, -75, 110, 80]), town, clips, emit: (e) => heard.push(e) });
  const rigs = new Map();
  for (const me of life.folk) {
    let m = me.p.body;
    if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
    const key = `${m}|${me.p.armOut || 0}`;
    if (!rigs.has(key)) rigs.set(key, new FolkRig(parseGLB(AB(`assets/game/folk/${folk.models[m].glb}`)), clips, { armOut: me.p.armOut }));
    life.setRig(me.i, rigs.get(key));
  }
  const me = life.byId.homunculus, kit = new SmithKit(me.rig), pal = new Float32Array(80 * 8), C = SMITH_CLIPS;
  const A = STATIONS.anvil, strike = inYard(A, [FORGE.strike[0], FORGE.strike[1] + TONGS.bar * 2, FORGE.strike[2]]);
  const coals = inYard(STATIONS.fire, FIRE.coals), stone = inYard(STATIONS.wheel, [0, WHEEL.axle + WHEEL.r, WHEEL.off]);
  // A point of a piece of the kit, in the world.
  const at = (name, p) => { const o = (KJ[name] - 1) * 8, t = dqOrigin(kit.pal, o), r = [0, 0, 0]; quatRotate(r, 0, kit.pal, o, p, 0); return [t[0] + r[0], t[1] + r[1], t[2] + r[2]]; };
  const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const dt = 1 / 30, seen = new Set();
  let hour = 6.9, blows = 0, worst = 0, last = -1, fireOff = 0, stoneOff = 0, away = 0, hottest = 0, first = null;
  // (The player stands by, to be spoken in front of.)
  while (hour < 12.6) {
    hour += dt / 240;
    life.update(dt, { hour, day: 0, player: [-6, 0.1, 26], dangers: [] });
    const k = me.kit, clip = me.pose.clip, t = clip ? me.pose.time % clip.dur : 0;
    if (!k) continue;
    if (clip && Object.values(C).includes(clip.name)) { seen.add(clip.name); first = first || clip.name; }
    me.pose.solve(me.x, me.y, me.z, me.yaw, pal, 0);
    kit.step(dt, k, true);
    kit.write(me.pose, k, me.yaw, null, null);
    hottest = Math.max(hottest, kit.heat);
    if ((k.tool || k.tongs) && Math.hypot(me.x - A.x, me.z - A.z) > 6) away++;
    if (clip?.name === C.blow) {
      assert.ok(k.tool === 'hammer' && k.tongs, 'he swings with the hammer in his hand and the iron in the tongs');
      if (last >= 0 && last < C.blowAt && t >= C.blowAt && me.pose.w >= 1) { worst = Math.max(worst, far(at('hammer', [0, HAMMER.head, HAMMER.face]), strike)); blows++; }
      last = t;
    } else last = -1;
    if (clip?.name === C.pump && me.pose.w >= 1) fireOff = Math.max(fireOff, far(at('tongs', [0, TONGS.tip, 0]), coals));
    if (clip?.name === C.grind && me.pose.w >= 1 && k.grind) stoneOff = Math.max(stoneOff, Math.abs(at('blade', [0, 0.25, BLADE.edge])[1] - stone[1]));
  }
  assert.ok([C.ragTake, C.polish].includes(first), `the axe comes first in his day (${first})`);
  for (const c of [C.blow, C.take, C.set, C.tongs, C.pump, C.draw, C.quench, C.fileTake, C.file, C.bladeTake, C.grind, C.ragTake, C.polish]) assert.ok(seen.has(c), `in a morning he does everything: no ${c}`);
  assert.ok(blows > 60, `he hammers through the morning (${blows} blows)`);
  // (A frame of the sim either side of the moment it lands, at the speed the head's coming down.)
  assert.ok(worst < 0.07, `the hammer's face lands on the iron (${(worst * 1000).toFixed(0)} mm off at worst)`);
  assert.ok(fireOff < 0.25, `the iron's in the coals while he blows them (${(fireOff * 1000).toFixed(0)} mm off)`);
  assert.ok(stoneOff < 0.08, `the blade's on the stone while it's ground (${(stoneOff * 1000).toFixed(0)} mm off)`);
  assert.ok(hottest > 0.75, `the bellows bring the iron up (${hottest.toFixed(2)})`);
  assert.equal(away, 0, 'nothing leaves the yard in his hands');
  const k = me.kit;
  assert.ok(!k.tool && !k.tongs && !k.grind && !k.polish && me.act !== ACT.WORK, 'at dinner everything lies where it lives');
  assert.ok(heard.some((e) => e.type === 'work' && e.kind === 'quench'), 'the tub hisses');
  assert.ok(heard.some((e) => e.type === 'say' && e.i === me.i && /Varrow/.test(e.text)), 'he wishes the axe good morning');
  assert.ok(heard.some((e) => e.type === 'say' && e.i === -1 && e.who === 'The axe' && e.at), 'and it answers');
  void KD;
});
