// The folk on the roads (src/folk/road-folk.js, src/folk/brain.js onRoad, src/ui/roadfolk.js): bodies, clips and lines for
// each; parked till they're set down; walking a road's points side by side; in a fix, cowering, flinching, then thankful and
// away, or running for it; and parked once they're done or left behind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { FolkClips, FolkRig } from '../src/folk/rig.js';
import { Ground } from '../src/folk/ground.js';
import { Town } from '../src/folk/town.js';
import { Life } from '../src/folk/brain.js';
import { Talk } from '../src/folk/talk.js';
import { CROWD, FOLK, POSTED, PEOPLE, ROAD } from '../src/folk/people.js';
import { ROAD_BASE } from '../src/folk/road-folk.js';
import { LINES } from '../src/folk/lines/road.js';
import { FOLK_MAX } from '../src/folk/layout.js';
import { nearestRoad } from '../src/core/roads.js';
import { roadWay } from '../src/ui/roadfolk.js';
import { RULES } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const AB = (p) => { const b = R(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

test('the road folk: dyed bodies every device has, clips, lines; between the posted and the crowd; no quest of theirs', () => {
  const clips = new FolkClips(J('assets/game/folk/clips.json'), AB('assets/game/folk/clips.bin')), folk = J('assets/game/folk/folk.json');
  assert.ok(FOLK.length <= FOLK_MAX, `${FOLK.length} folk, room for ${FOLK_MAX}`);
  assert.deepEqual(FOLK.slice(PEOPLE.length + POSTED.length, PEOPLE.length + POSTED.length + ROAD.length).map((p) => p.id), ROAD.map((p) => p.id));
  assert.deepEqual(FOLK.slice(-CROWD.length).map((p) => p.id), CROWD.map((p) => p.id));
  // (A dye of a body worn by someone of the town's or the posts', so nothing's loaded for them but a skinned copy.)
  const worn = new Set([...PEOPLE, ...POSTED].map((p) => (folk.models[p.body] ? p.body : folk.swaps[p.body]?.base)));
  const quested = JSON.stringify(RULES) + JSON.stringify(QUESTS);
  for (const p of ROAD) {
    const sw = folk.swaps[p.body];
    assert.ok(sw?.dye && !sw.c, `${p.id}: not a dye`);
    assert.equal(sw.base, ROAD_BASE[p.id]);
    assert.ok(worn.has(sw.base), `${p.id}: ${sw.base} isn't worn by anyone loaded`);
    for (const c of [...p.idles, p.walk, 'afraid', 'scared', 'hit', 'cheer', 'bow', 'flee']) assert.ok(clips.clips[c], `${p.id}: no clip ${c}`);
    const L = LINES[p.id];
    assert.ok(L?.first?.length && L.greet?.day?.length && L.greet?.night?.length && L.bye?.length && L.ask?.omens?.length, `${p.id} has too little to say`);
    for (const k of ['player', 'scared', 'saved', 'fled']) assert.ok(L.barks?.[k]?.length, `${p.id}: no ${k} bark`);
    assert.ok(!quested.includes(`"${p.id}"`), `${p.id} is in a quest`);
  }
});

test('on the road: parked, set down, walking it, in a fix, and parked again', () => {
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
  const road = life.folk.filter((me) => me.road), dt = 1 / 10;
  assert.equal(road.length, ROAD.length);
  const run = (s, player) => { for (let t = 0; t < s; t += dt) { life.update(dt, { hour: 12, day: 0, player, dangers: [] }); talk.update(dt, { player, cast: 0 }); } };
  run(2, [0, 0, 0]);
  assert.ok(road.every((me) => me.parked && !me.home && !me.bed), 'a road folk is up, or has a house');
  // The Gallows Road out on the downs: 350 m of it, by the road graph.
  const a = nearestRoad(1600, 1000, 30), b = nearestRoad(1850, 1250, 30);
  assert.ok(a.i >= 0 && b.i >= 0);
  const pts = [];
  let lx = Infinity, lz = Infinity;
  for (const [x, z] of roadWay(a.x, a.z, b.x, b.z)) pts.push([x, z]);
  assert.ok(pts.length > 15);
  const player = [a.x + 40, 0, a.z + 40];
  const who = life.roadJob({ op: 'walk', id: 'w1', n: 2, pts, rest: 0 });
  assert.equal(who.length, 2);
  assert.ok(said.some((e) => e.type === 'road' && e.id === 'w1' && e.who.length === 2));
  run(1, player);
  for (const me of who) { assert.ok(!me.parked); assert.ok(Math.hypot(me.x - a.x, me.z - a.z) < 6, `${me.id} wasn't set down at the road`); }
  run(40, player);
  // (Walking it: on along the way, a pace or so apart, never off the road's line by more than a stride.)
  const seg = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
  const onWay = (me) => Math.min(...pts.slice(1).map((p, k) => seg(me.x, me.z, pts[k], p)));
  for (const me of who) {
    assert.ok(Math.hypot(me.x - a.x, me.z - a.z) > 25, `${me.id} hasn't got on (${Math.hypot(me.x - a.x, me.z - a.z) | 0} m)`);
    assert.ok(onWay(me) < 3, `${me.id} is ${onWay(me).toFixed(1)} m off the road`);
    assert.ok(Math.abs(me.y - life.ground.landHeight(me.x, me.z)) < 0.05);
  }
  assert.ok(Math.hypot(who[0].x - who[1].x, who[0].z - who[1].z) < 4, 'not walking together');
  // Left far behind: parked, and the main thread told.
  run(1, [a.x + 2000, 0, a.z]);
  assert.ok(who.every((me) => me.parked && !me.trip));
  assert.ok(said.some((e) => e.type === 'roadDone' && e.id === 'w1'));

  // In a fix at a spot on the road: huddled there, cowering; a flinch for a blow; then saved: a cheer or a bow and on their way.
  const [fx, fz] = pts[8];
  const fixed = life.roadJob({ op: 'fix', id: 'f1', n: 3, x: fx, z: fz });
  assert.equal(fixed.length, 3);
  life.roadJob({ op: 'foe', id: 'f1', x: fx + 6, z: fz });
  run(3, [fx - 30, 0, fz]);
  for (const me of fixed) {
    assert.ok(Math.hypot(me.x - fx, me.z - fz) < 2.5, `${me.id} isn't huddled at the spot`);
    assert.ok(['afraid', 'scared', 'scared_2', 'frightened', 'idle'].includes(me.pose.clip?.name), `${me.id} is ${me.pose.clip?.name}, not cowering`);
  }
  life.roadJob({ op: 'state', id: 'f1', state: 'hurt' });
  run(0.2, [fx - 30, 0, fz]);
  assert.ok(fixed.some((me) => me.pose.clip?.name === 'hit'), 'nobody flinched');
  const away = pts.slice(8, 20);
  life.roadJob({ op: 'state', id: 'f1', state: 'saved', away });
  run(3, [fx - 6, 0, fz]);
  assert.ok(fixed.some((me) => ['cheer', 'bow'].includes(me.pose.clip?.name)), 'no thanks');
  run(40, [fx - 6, 0, fz]);
  for (const me of fixed) assert.ok(Math.hypot(me.x - fx, me.z - fz) > 15, `${me.id} hasn't gone on its way`);
  // And another fix, fled: away from what was at them, at a run.
  run(1, [a.x + 2000, 0, a.z]);
  const f2 = life.roadJob({ op: 'fix', id: 'f2', n: 2, x: fx, z: fz });
  run(1, [fx - 30, 0, fz]);
  life.roadJob({ op: 'state', id: 'f2', state: 'fled', dir: Math.PI / 2 });
  run(6, [fx - 30, 0, fz]);
  for (const me of f2) assert.ok(me.x - fx > 7, `${me.id} didn't run east (${(me.x - fx).toFixed(1)})`);
  // Ended: parked once nobody sees them (none's seen here: there's no renderer).
  // (Those running finish their run first.)
  life.roadJob({ op: 'end', id: 'f2' });
  run(40, [fx - 30, 0, fz]);
  assert.ok(f2.every((me) => me.parked));
  // (Never more set down than there are.)
  assert.equal(life.roadJob({ op: 'walk', id: 'all', n: 50, pts, rest: 0 }).length, ROAD.length);
});
