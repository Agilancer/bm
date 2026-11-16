// City State Phobos's street crowd (src/folk/people.js CROWD, src/folk/brain.js roam): parked while you're anywhere else;
// inside the wall, about the streets near you on the sidewalk lanes, clear of the haunts, walking and standing and
// talking; and with you as you go, the ones left behind set down again ahead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { FolkClips, FolkRig } from '../src/folk/rig.js';
import { Ground } from '../src/folk/ground.js';
import { Town } from '../src/folk/town.js';
import { Life, ACT } from '../src/folk/brain.js';
import { Talk } from '../src/folk/talk.js';
import { CROWD, FOLK, PEOPLE } from '../src/folk/people.js';
import { LINES } from '../src/folk/lines/phobos.js';
import { HAUNTS, cityIn } from '../src/core/east.js';
import { phobosLanes } from '../src/core/phobos-build.js';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const AB = (p) => { const b = R(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

test('the crowd: bodies, clips and lines for everyone; after everyone else in the buffer', () => {
  const clips = new FolkClips(J('assets/game/folk/clips.json'), AB('assets/game/folk/clips.bin')), folk = J('assets/game/folk/folk.json');
  assert.deepEqual(FOLK.slice(-CROWD.length).map((p) => p.id), CROWD.map((p) => p.id));
  for (const p of CROWD) {
    assert.ok(folk.models[p.body] || folk.swaps[p.body], `${p.id} has no body`);
    for (const c of [...p.idles, p.walk]) assert.ok(clips.clips[c], `${p.id}: no clip ${c}`);
    const L = LINES[p.id];
    assert.ok(L?.first?.length && L.greet?.day?.length && L.barks?.player?.length, `${p.id} has nothing to say`);
  }
  // (Nobody of the town's has a crowd's id; no two of the crowd share a body.)
  assert.equal(new Set(CROWD.map((p) => p.body)).size, CROWD.length);
  assert.ok(!PEOPLE.some((p) => p.id.startsWith('ph_')));
});

test('the lanes: in the city, clear of the haunts', () => {
  const L = phobosLanes();
  assert.ok(L.length > 10);
  for (const l of L) for (const [x, z] of l.pts) {
    assert.ok(cityIn(x, z) < 1, `${l.name} leaves the city at ${x | 0}, ${z | 0}`);
    for (const h of HAUNTS) assert.ok(Math.hypot(x - h.x, z - h.z) > h.clear, `${l.name} runs by ${h.key}`);
  }
});

test('in the street: parked out of the city, up and about inside it, and along with you as you go', () => {
  const clips = new FolkClips(J('assets/game/folk/clips.json'), AB('assets/game/folk/clips.bin'));
  const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), folk = J('assets/game/folk/folk.json');
  const town = new Town(village, interior, J('assets/game/folk/spots.json'));
  const said = [];
  const life = new Life({ ground: new Ground(village, interior, [-80, -75, 110, 80]), town, clips, emit: (e) => said.push(e), people: FOLK });
  const talk = new Talk(life, { lines: LINES, scenes: [], smalltalk: [] }, (e) => said.push(e));
  const rigs = new Map();
  for (const me of life.folk) {
    let m = me.p.body;
    if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
    if (!rigs.has(m)) rigs.set(m, new FolkRig(parseGLB(AB(`assets/game/folk/${folk.models[m].glb}`)), clips, {}));
    life.setRig(me.i, rigs.get(m));
  }
  const crowd = life.folk.filter((me) => me.crowd), dt = 1 / 20;
  assert.equal(crowd.length, CROWD.length);
  for (const me of crowd) assert.equal(me.bed, null);
  // In Bellmourn: nobody of the crowd's up.
  for (let k = 0; k < 40; k++) life.update(dt, { hour: 12, day: 0, player: [0, 0, 0], dangers: [] });
  assert.ok(crowd.every((me) => me.parked), 'the crowd is up in Bellmourn');
  // Into Phobos by the King's Mile, and up it a way, a minute at a time.
  // (On a lane, or crossing over between two: halfway over is at most 8 m from either.)
  const lanes = phobosLanes(), onLane = (me) => lanes.some((l) => l.pts.some(([x, z]) => Math.hypot(x - me.x, z - me.z) < 8.5));
  let moved = 0, stood = 0;
  const path = [[9520, 0, 1.6], [9620, 4, 1.6], [9720, 10, 1.6], [9800, 20, 1.6]];
  for (const [px, pz, yaw] of path) {
    const before = new Map(crowd.map((me) => [me, [me.x, me.z]]));
    for (let k = 0; k < 600; k++) {
      life.update(dt, { hour: 20, day: 0, player: [px, 0, pz], dangers: [], yaw });
      talk.update(dt, { player: [px, 0, pz], cast: 0 });
    }
    for (const me of crowd) {
      assert.ok(!me.parked, `${me.id} isn't up in the city`);
      assert.ok(Math.hypot(me.x - px, me.z - pz) < 105, `${me.id} is ${Math.hypot(me.x - px, me.z - pz) | 0} m off`);
      assert.ok(onLane(me), `${me.id} is off the streets at ${me.x | 0}, ${me.z | 0} (lane ${me.lane} k ${me.lk} act ${me.act} pair ${!!me.pairWith} at ${phobosLanes()[me.lane]?.pts[me.lk]})`);
      for (const h of HAUNTS) assert.ok(Math.hypot(me.x - h.x, me.z - h.z) > h.clear - 20, `${me.id} by ${h.key}`);
      assert.ok(Math.abs(me.y - life.ground.landHeight(me.x, me.z)) < 0.05, `${me.id} isn't on the ground`);
      assert.ok(me.pose.clip, `${me.id} has no pose`);
      const [x0, z0] = before.get(me);
      if (Math.hypot(me.x - x0, me.z - z0) > 5) moved++; else stood++;
    }
  }
  assert.ok(moved > crowd.length, `only ${moved} moves`);
  assert.ok(stood > 0, 'nobody ever stood about');
  // Some of them stopped to talk, and the player, near, heard some of it.
  assert.ok(said.some((e) => e.type === 'say' && e.kind === 'small'), 'no talk in the street');
  // Out of the city again: parked.
  for (let k = 0; k < 20; k++) life.update(dt, { hour: 12, day: 0, player: [0, 0, 0], dangers: [] });
  assert.ok(crowd.every((me) => me.parked), 'the crowd followed you home');
  // (Bellmourn's people never left Bellmourn.)
  for (const me of life.folk) if (!me.posted && !me.crowd) assert.ok(Math.hypot(me.x, me.z) < 400, `${me.id} is at ${me.x | 0}, ${me.z | 0}`);
  void ACT;
});
