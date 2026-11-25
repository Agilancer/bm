// City State Phobos's street crowd (src/folk/people.js CROWD, src/folk/brain.js roam): parked while you're anywhere else;
// inside the wall, about the streets near you on the sidewalk lanes, clear of the haunts, walking and standing and
// talking; and with you as you go, the ones left behind set down again ahead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHOBOS } from '../src/core/phobos-data.js';
const DISTRICTS = Object.fromEntries(PHOBOS.districts.map((d) => [d.key, d]));
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
import { phobosHouses, phobosLanes, phobosStalls } from '../src/core/phobos-build.js';
import { bedOf, phobosHomes } from '../src/folk/phobos-homes.js';
import { abedNow } from '../src/folk/brain.js';
import { BAKED, bakedText } from '../tools/homes/bake-beds.mjs';

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
    // (Each lives in a district of their own and is about only while you're near it, on its streets: src/folk/brain.js
    // AREA_REACH. Those with none go along with you.)
    for (const me of crowd) {
      // (A baker abed already, early in the evening: src/folk/brain.js abedNow. Below.)
      if (me.abed) continue;
      // (Keeping one of the stalls near: behind its counter. Below.)
      if (me.stall) { assert.ok(!me.parked && Math.hypot(me.x - me.stall.kx, me.z - me.stall.kz) < 0.3, `${me.id} isn't at their stall`); continue; }
      const D = me.p.area && DISTRICTS[me.p.area];
      if (D && Math.hypot(px - D.x, pz - D.z) > D.r + 120) { assert.ok(me.parked, `${me.id} is up away from ${me.p.area}`); continue; }
      assert.ok(!me.parked, `${me.id} isn't up in the city`);
      if (D) assert.ok(Math.hypot(me.x - D.x, me.z - D.z) < D.r + 40, `${me.id} has wandered out of ${me.p.area}`);
      else assert.ok(Math.hypot(me.x - px, me.z - pz) < 105, `${me.id} is ${Math.hypot(me.x - px, me.z - pz) | 0} m off`);
      assert.ok(onLane(me), `${me.id} is off the streets at ${me.x | 0}, ${me.z | 0} (lane ${me.lane} k ${me.lk} act ${me.act} pair ${!!me.pairWith} at ${phobosLanes()[me.lane]?.pts[me.lk]})`);
      for (const h of HAUNTS) assert.ok(Math.hypot(me.x - h.x, me.z - h.z) > h.clear - 20, `${me.id} by ${h.key}`);
      assert.ok(Math.abs(me.y - life.ground.landHeight(me.x, me.z)) < 0.05, `${me.id} isn't on the ground`);
      assert.ok(me.pose.clip, `${me.id} has no pose`);
      const [x0, z0] = before.get(me);
      if (Math.hypot(me.x - x0, me.z - z0) > 5) moved++; else stood++;
    }
  }
  assert.ok(moved > 20, `only ${moved} moves`);
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

// The crowd's nights (src/folk/phobos-homes.js, brain.js phSleep): everyone a bed in a house of their district, nobody's
// the same place in it; abed at their hours, in it when you come by, sat up when you wake them and back down after; up in
// the morning and out on the street. The owner, 2026-11-20: "Make sure everyone has beds too in phobos".
test('abed at night: a bed each, in it when you come by, woken and back down, up in the morning', () => {
  // (The beds the townsfolk's thread knows are baked: tools/homes/bake-beds.mjs. Still what the houses' plans say.)
  assert.equal(readFileSync(BAKED, 'utf8').replace(/\r/g, ''), bakedText(), 'src/folk/phobos-beds.js is stale: run node tools/homes/bake-beds.mjs');
  const H = phobosHouses(), homes = phobosHomes(), spots = new Set();
  for (const p of CROWD) {
    const hm = homes.get(p.id), b = bedOf(p.id);
    assert.ok(hm && b, `${p.id} has no bed`);
    const k = `${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)}`;
    assert.ok(!spots.has(k), `${p.id} is in someone else's place`); spots.add(k);
    const h = H[b.house], c = Math.cos(h.yaw), s = Math.sin(h.yaw), dx = b.x - h.x, dz = b.z - h.z;
    assert.ok(Math.abs(dx * c - dz * s) < h.hx && Math.abs(dx * s + dz * c) < h.hz, `${p.id}'s bed is out of the house`);
  }
  const clips = new FolkClips(J('assets/game/folk/clips.json'), AB('assets/game/folk/clips.bin'));
  const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), folk = J('assets/game/folk/folk.json');
  const town = new Town(village, interior, J('assets/game/folk/spots.json'));
  const life = new Life({ ground: new Ground(village, interior, [-80, -75, 110, 80]), town, clips, emit: () => {}, people: FOLK });
  const talk = new Talk(life, { lines: LINES, scenes: [], smalltalk: [] }, () => {});
  const rigs = new Map();
  for (const me of life.folk) {
    let m = me.p.body;
    if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
    if (!rigs.has(m)) rigs.set(m, new FolkRig(parseGLB(AB(`assets/game/folk/${folk.models[m].glb}`)), clips, {}));
    life.setRig(me.i, rigs.get(m));
  }
  const dt = 1 / 20, run = (n, hour, player, yaw = 0) => { for (let k = 0; k < n; k++) { life.update(dt, { hour, day: 0, player, dangers: [], yaw }); talk.update(dt, { player, cast: 0 }); } };
  // Suds, at two in the morning, the player stood in the street by her door.
  const suds = life.folk.find((me) => me.p.id === 'ph_suds'), b = bedOf('ph_suds'), h = H[b.house];
  assert.ok(abedNow(suds, 2) && !abedNow(suds, 12), 'Suds keeps day hours');
  const door = [h.x + h.front * (h.hz + 1.6) * Math.sin(h.yaw), 0, h.z + h.front * (h.hz + 1.6) * Math.cos(h.yaw)];
  run(200, 2, door);
  assert.ok(suds.abed && !suds.parked && suds.posture === 'lie' && suds.asleep, `Suds isn't abed (parked ${suds.parked}, ${suds.posture})`);
  assert.ok(Math.hypot(suds.x - b.x, suds.z - b.z) < 0.01 && Math.abs(suds.y - b.y) < 0.01, 'Suds is not in her own bed');
  assert.equal(suds.act, ACT.SLEEP);
  // Woken: sat up on the bed's edge; let be, back down.
  talk.talkTo(suds.i);
  run(120, 2, door);
  assert.equal(suds.posture, 'sit', 'woken, Suds sits up');
  talk.talkTo(-1);
  run(200, 2, door);
  assert.ok(suds.posture === 'lie' && suds.asleep, 'Suds lay down again');
  // Gone from the house: not drawn there.
  const away = [h.x + 200, 0, h.z];
  run(40, 2, away);
  assert.ok(suds.parked, 'Suds is drawn with nobody by');
  // Morning, with nobody in her room: up, and about the street again.
  run(400, 9.5, door);
  assert.ok(!suds.abed && suds.posture === 'stand', `Suds is still abed in the morning (${suds.posture})`);
  // A watchman's the other way round: abed by day.
  const watch = CROWD.find((p) => p.id === 'ph_wake');
  assert.ok(abedNow({ p: watch }, 11) && !abedNow({ p: watch }, 23), 'the watch sleeps by day');
  // Those quests want are never abed.
  assert.ok(!abedNow({ p: { id: 'ph_garrow', kind: 'merchant' } }, 2));
});

// The stalls (src/core/phobos-build.js phobosStalls, src/folk/brain.js manStalls): every one near you has a keeper behind its
// counter, facing out over it, and let go back to the streets when you've gone. The owner: "make sure the vendor stalls have
// vendors in them, and that they are turned 90 degrees so the stalls are actually facing the street".
test('the stalls: a keeper behind every counter near you, facing out; the King\'s Mile\'s face the street', () => {
  const S = phobosStalls();
  assert.ok(S.length > 40, `only ${S.length} stalls`);
  // (The King's Mile's: faced across the street, square to it, not down it.)
  const kerb = S.filter((q) => !q.market);
  assert.ok(kerb.length > 5);
  const spine = PHOBOS.streets.filter((st) => st.w > 5);
  for (const q of kerb) {
    let best = null, bd = 1e9;
    for (const st of spine) for (let i = 0; i + 1 < st.pts.length; i++) {
      const [ax, az] = st.pts[i], [bx, bz] = st.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      const t = Math.max(0, Math.min(L, (q.x - ax) * ux + (q.z - az) * uz)), d = Math.hypot(ax + ux * t - q.x, az + uz * t - q.z);
      if (d < bd) { bd = d; best = { ux, uz, cx: ax + ux * t, cz: az + uz * t }; }
    }
    const fx = Math.sin(q.yaw), fz = Math.cos(q.yaw);
    assert.ok(Math.abs(fx * best.ux + fz * best.uz) < 0.2, `the stall at ${q.x | 0}, ${q.z | 0} faces down the street`);
    assert.ok(fx * (best.cx - q.x) + fz * (best.cz - q.z) > 0, `the stall at ${q.x | 0}, ${q.z | 0} turns its back on the street`);
  }
  const clips = new FolkClips(J('assets/game/folk/clips.json'), AB('assets/game/folk/clips.bin'));
  const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), folk = J('assets/game/folk/folk.json');
  const town = new Town(village, interior, J('assets/game/folk/spots.json'));
  const life = new Life({ ground: new Ground(village, interior, [-80, -75, 110, 80]), town, clips, emit: () => {}, people: FOLK });
  const rigs = new Map();
  for (const me of life.folk) {
    let m = me.p.body;
    if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
    if (!rigs.has(m)) rigs.set(m, new FolkRig(parseGLB(AB(`assets/game/folk/${folk.models[m].glb}`)), clips, {}));
    life.setRig(me.i, rigs.get(m));
  }
  const dt = 1 / 20, run = (n, hour, player) => { for (let k = 0; k < n; k++) life.update(dt, { hour, day: 0, player, dangers: [], yaw: 0 }); };
  // In the middle of Chainmarket at eight in the morning, as you first come down to it.
  const M = PHOBOS.districts.find((d) => d.key === 'market'), at = [M.x + 4, 0, M.z - 34];
  run(400, 8, at);
  const near = S.filter((q) => Math.hypot(q.x - at[0], q.z - at[2]) < 45);
  assert.ok(near.length > 10, `only ${near.length} stalls near`);
  const kept = life.stalls.filter((q) => q.keeper && Math.hypot(q.x - at[0], q.z - at[2]) < 45);
  assert.equal(kept.length, near.length, `${kept.length} of ${near.length} stalls kept`);
  const who = new Set();
  for (const q of kept) {
    const me = q.keeper;
    assert.ok(!who.has(me), `${me.id} keeps two`); who.add(me);
    assert.equal(me.stall, q);
    assert.ok(!me.parked && !me.child, `${me.id} keeps a stall parked or a child`);
    assert.ok(Math.hypot(me.x - q.kx, me.z - q.kz) < 0.3, `${me.id} isn't behind their stall`);
    assert.ok(Math.abs(Math.atan2(Math.sin(me.yaw - q.yaw), Math.cos(me.yaw - q.yaw))) < 0.1, `${me.id} doesn't face out over their stall`);
  }
  // Gone home: every keeper let go, and parked.
  run(40, 8, [0, 0, 0]);
  assert.ok(life.stalls.every((q) => !q.keeper), 'a stall is kept with you gone');
  assert.ok(life.folk.filter((me) => me.crowd).every((me) => me.parked && !me.stall), 'a keeper stayed up');
});
