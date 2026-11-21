// City State Phobos, the town's share of its growing (docs/PHOBOS-CASTLE.md, the Town set): every house has a style of its
// own by its district, and the one-off houses are there (src/core/phobos-houses.js); nothing of it moves a house, a door, a
// wall or a floor; the land's corners are held (a PC's city no more than forty thousand over what it was, a phone's not one);
// the city's lookouts each stand on a floor that's walked (src/core/phobos-finds.js); the sewers' chests are in their spurs;
// and the town's quests (src/folk/phobos-quests-town.js) go where they say, in step with their levels.
//   node --test tests/phobos-town.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { Kit, buildPhobosCell } from '../src/core/sites.js';
import { phobosCity, phobosHouses } from '../src/core/phobos-build.js';
import { LANDMARKS, landmarks, roofTop } from '../src/core/phobos-houses.js';
import { cityFinds } from '../src/core/phobos-finds.js';
import { castleChests, castleVistas } from '../src/core/castle-finds.js';
import { cityDoors, cityTowers } from '../src/core/phobos-towers.js';
import { PHOBOS } from '../src/core/phobos-data.js';
import { RULES_TOWN, LEVELS_TOWN } from '../src/folk/phobos-quests-town.js';
import { QUESTS_TOWN, LINES_TOWN } from '../src/folk/lines/phobos-more-town.js';
import { RULES, hasArea } from '../src/folk/quests.js';
import { CROWD, FOLK } from '../src/folk/people.js';
import { DELVES, caveRoom, delveByKey } from '../src/core/dungeon.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
// (What the city's far build was before the houses were styled: the city alone, 2026-11-19.)
// (A PC's baseline is 486,802 and 9,968 that only moved: Castle Velscour's sixteen wall towers are built with the city's
// towers now, src/core/phobos-towers.js, not with the castle; a phone's 4,200 likewise.)
const CITY_PC = 486802 + 9968, CITY_PHONE = 306630 + 4200, MORE = 40000;

test('every house has a style by its district, and the roofs are of many shapes', () => {
  const H = phobosHouses().filter((h) => !h.spire), kinds = {}, by = {};
  for (const h of H) {
    assert.ok(h.st, `a house at ${h.x | 0}, ${h.z | 0} has no style`);
    assert.equal(h.st.roof === 'none', !h.roof, 'a ruin has no roof, and only a ruin');
    kinds[h.st.roof] = (kinds[h.st.roof] || 0) + 1;
    if (h.dk && h.roof) (by[h.dk] ||= new Set()).add(h.st.roof);
    if (h.roof) assert.ok(roofTop(h.st.roof, { sx: h.hx + 0.4, sz: h.hz + 0.4, rh: 4 }) > 0.5);
    assert.doesNotMatch(h.wall, /wall_\d/, "never the village's half-timber on Phobos's houses");
  }
  for (const k of ['gable', 'hip', 'pent', 'mansard', 'gambrel', 'crow', 'flat', 'ribs']) assert.ok(kinds[k] > 100, `${k}: ${kinds[k] || 0} houses`);
  assert.ok(kinds.gable < H.length * 0.5, 'fewer than half are plain gables');
  for (const d of PHOBOS.districts) assert.ok((by[d.key]?.size || 0) >= 3, `${d.key}: ${by[d.key]?.size || 0} shapes of roof`);
  // (No two of these roofed alike: what each has most of, with the next, isn't the other's pair.)
  const top = (k) => { const n = {}; for (const h of H) if (h.dk === k && h.roof) n[h.st.roof] = (n[h.st.roof] || 0) + 1; return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]).join('+'); };
  assert.notEqual(top('dukes'), top('rookeries')); assert.notEqual(top('cinder'), top('market')); assert.notEqual(top('wharf'), top('barracks'));
  // (And from over the roofs each district is its own: the stuff most of its houses are roofed in is no other district's,
  // and the tall quarters stand over the low ones. The critics, 2026-11-20.)
  const most = (k, f) => { const n = {}; for (const h of H) if (h.dk === k && h.roof && !h.shop) n[f(h)] = (n[f(h)] || 0) + 1; return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0]; };
  const tiles = PHOBOS.districts.map((d) => most(d.key, (h) => h.roof));
  assert.equal(new Set(tiles).size, tiles.length, `each district's commonest roof its own: ${tiles}`);
  const mean = (k) => { const hs = H.filter((h) => h.dk === k && h.roof && !h.shop && !h.mark).map((h) => h.h); return hs.reduce((a, b) => a + b, 0) / hs.length; };
  assert.ok(mean('rookeries') > mean('wharf') + 5 && mean('mages') > mean('bones') + 6 && mean('cinder') < mean('market') - 3, 'heights by district');
});

test('the one-off houses are houses that stood there already, one to a kind and district', () => {
  const L = landmarks();
  assert.equal(L.length, LANDMARKS.length, 'every landmark found a house');
  assert.equal(new Set(L.map((m) => m.h)).size, L.length, 'no house is two landmarks');
  for (const m of L) {
    assert.equal(m.h.dk, m.key); assert.ok(m.h.roof && m.h.door !== undefined, `${m.name} has a door`);
    assert.doesNotMatch(m.name, /bell|cross|saint|chapel|abbey/i, m.name);
    if (m.kind === 'towerhouse') assert.ok(m.h.h >= 19, `${m.name} is ${m.h.h.toFixed(1)} m tall`);
  }
});

test('nothing of it moves a door or adds to what stops a body, and the corners are held', () => {
  const H = phobosHouses();
  assert.equal(cityDoors().length, H.filter((h) => h.roof && !h.spire).length + cityTowers().filter((t) => t.kind !== 'wall').length);
  H.forEach((h, i) => { if (h.roof && !h.spire) assert.equal(h.door, i); });
  const count = (lean) => { const K = new Kit(true); K.lean = lean; phobosCity(K); K.finish(); let v = 0; for (const p of K.parts.values()) v += p.pos.length / 3; return [v, K.colliders.length, K.floors.length]; };
  const pc = count(false), phone = count(true);
  assert.ok(pc[0] <= CITY_PC + MORE, `a PC's city: ${pc[0]} corners, ${pc[0] - CITY_PC} more than it was (at most ${MORE})`);
  assert.ok(phone[0] <= CITY_PHONE, `a phone's city: ${phone[0]} corners, ${phone[0] - CITY_PHONE} more than it was (none)`);
  assert.deepEqual(pc.slice(1), phone.slice(1), 'a phone is stopped and held by what a PC is');
  // (61,773 and 10,423 of the city's own, and the castle's sixteen wall towers' 212 and 60: their walls, doors, floors, stairs.
  // Less 45: the curtain's runs end at its corner towers' rooms, so each is laid in fewer, longer pieces: docs/PHOBOS-PATHS.md.)
  assert.equal(pc[1], 61773 + 212 - 45, 'the city stops a body where it did'); assert.equal(pc[2], 10423 + 60, 'and holds one where it did');
  // (A near cell with a landmark and a street in it builds.)
  const cell = landmarks()[3].h.cell, built = buildPhobosCell(cell);
  let v = 0; for (const p of built.parts.values()) v += p.pos.length / 3;
  assert.ok(v > 20000 && v < 700000, `${cell}: ${v} corners from near`);
});

test("the city's lookouts each stand on a floor that's walked, and the sewers' chests in their spurs", () => {
  const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
  const V = cityFinds().vistas;
  assert.ok(V.length >= 10 && V.length <= 16, `${V.length} lookouts in the city`);
  assert.equal(new Set(V.map((v) => v.id)).size, V.length);
  for (const v of V) {
    assert.ok(v.name && !/_/.test(v.name) && v.xp > 0, v.id);
    // (Stood on its middle or a pace off it, where a room's centrepiece isn't: what's under the feet is its floor.)
    const hs = [[0, 0], [1.2, 0], [0, 1.2], [-1.2, 0], [0, -1.2]].map(([dx, dz]) => world.height(v.x + dx, v.z + dz, v.y + 0.4));
    assert.ok(hs.some((h) => Math.abs(h - v.y) < 0.45), `${v.id}: floor at ${hs.map((h) => h.toFixed(1))}, the lookout at ${v.y.toFixed(1)}`);
    assert.ok(castleVistas().some((q) => q.id === v.id) && hasArea(`vista:${v.id}`));
  }
  // (Up on the wall they are fifty metres over the streets.)
  assert.ok(V.filter((v) => v.y - world.height(v.x, v.z, 0) > 30).length >= 5, 'five and more from the wall-walk');
  for (const key of ['westdrains', 'sloughmains', 'charnelruns', 'highconduits']) {
    const d = delveByKey(key);
    assert.ok(d.chests?.length >= 2 && d.vistas?.length >= 1, key);
    for (const c of d.chests) {
      assert.ok(caveRoom(d.x + c.x, d.z + c.z) > 0.6, `${key} ${c.id}: in the rock`);
      assert.ok(d.rooms.every((r) => Math.abs(c.x - r.x) > r.hx - 0.5 || Math.abs(c.z - r.z) > r.hz - 0.5), `${key} ${c.id}: off the beaten way, in no room`);
      assert.ok(castleChests().some((q) => q.id === `${key}:${c.id}`));
    }
  }
});

test("the town's quests: given by people of the city, to places that are there, in step with their levels", () => {
  const ids = Object.keys(RULES_TOWN), who = new Map(FOLK.map((p) => [p.id, p])), roam = new Set(CROWD.filter((p) => p.area).map((p) => p.id));
  assert.ok(ids.length >= 20 && ids.length <= 28, `${ids.length} quests`);
  assert.deepEqual(LEVELS_TOWN.map((l) => l[0]).sort(), [...ids].sort());
  assert.deepEqual(Object.keys(QUESTS_TOWN).sort(), [...ids].sort());
  assert.deepEqual(LINES_TOWN, {}, 'nobody new: the city is full');
  const level = Object.fromEntries(LEVELS_TOWN), delveOfRoom = (k) => DELVES.find((d) => d.rooms.some((r) => r.id === k.slice(5)));
  const kinds = { vista: 0, room: 0, district: 0, castle: 0 }, givers = new Set(), down = new Set();
  for (const id of ids) {
    const R = RULES_TOWN[id], q = QUESTS_TOWN[id];
    assert.equal(RULES[id], R, id);
    assert.ok(who.has(q.giver) && (roam.has(q.giver) || who.get(q.giver).sewer), `${id}: ${q.giver} walks no quarter and keeps no drain`);
    givers.add(q.giver);
    assert.ok(level[id] >= 20 && level[id] <= 66, `${id}: level ${level[id]}`);
    if (R.needs) assert.ok(RULES[R.needs], `${id} needs ${R.needs}`);
    assert.equal(q.needs, R.needs, `${id}: its words and its workings agree on what comes first`);
    for (const st of R.steps) for (const k of [st.enter, st.kill, ...(st.visit || [])].filter(Boolean)) {
      assert.ok(hasArea(k), `${id}: no such place ${k}`);
      if (k.startsWith('vista:')) { kinds.vista++; assert.ok(cityFinds().vistas.some((v) => v.id === k.slice(6)), `${id}: ${k} is the city's`); }
      else if (k.startsWith('ph:')) kinds.district++;
      const d = k.startsWith('room:') ? delveOfRoom(k) : delveByKey(k);
      if (d) {
        if (d.key === 'lowerward') kinds.castle++; else kinds.room++;
        down.add(d.key);
        // (Not sent down a place before it's a fair fight: within eight levels under the delve's own, and not long past it.)
        assert.ok(level[id] >= d.level - 8 && level[id] <= d.level + 12, `${id} at ${level[id]} sends you down ${d.key} (${d.level})`);
        if (st.kill?.startsWith('room:')) { const n = d.packs.filter((p) => p.room === k.slice(5) && !p.walk).reduce((s, p) => s + p.n, 0); assert.ok(st.n < n, `${id}: ${st.n} wanted of the ${n} in ${k}`); }
      }
    }
  }
  assert.ok(givers.size >= 20, `${givers.size} givers`);
  assert.ok(kinds.vista >= 10 && kinds.room >= 12 && kinds.district >= 4 && kinds.castle >= 8, JSON.stringify(kinds));
  assert.deepEqual([...down].sort(), ['charnelruns', 'highconduits', 'lowerward', 'sloughmains', 'westdrains'], 'down every sector, and up into the castle');
  // (No two neighbours ask the same thing of you: what each has you do, in order, isn't what the one before it had. The critics.)
  const verbs = (id) => RULES_TOWN[id].steps.map((st) => (st.night ? 'night-' : '') + Object.keys(st).find((k) => ['talk', 'enter', 'kill', 'visit', 'bring', 'boss', 'back'].includes(k)) + (st.kill?.startsWith('lair:') ? '-lair' : st.visit?.[0]?.startsWith('vista:') ? '-lookout' : st.visit?.[0]?.startsWith('ph:') ? '-streets' : '')).join(' ');
  LEVELS_TOWN.forEach(([id], i) => { if (i) assert.notEqual(verbs(id), verbs(LEVELS_TOWN[i - 1][0]), `${LEVELS_TOWN[i - 1][0]} and ${id} are the same errand`); });
  // (They climb: the first of them are the street's, and the last the castle's.)
  const order = LEVELS_TOWN.map((l) => l[1]), streets = LEVELS_TOWN.slice(0, 10).map((l) => l[1]);
  assert.ok(Math.max(...streets) <= 28 && order.at(-1) >= 60 && order.slice(10).every((v, i, a) => !i || v >= a[i - 1]), 'in order of level, once they go down');
});
