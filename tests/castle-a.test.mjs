// Castle Velscour's dungeons, set A (src/core/delve-castle-a.js; docs/PHOBOS-CASTLE.md): the Drowned Archive, the Gallery of
// a Thousand Portraits and the Alchemists' Undercroft. Where they stand and what opens what, their rooms, packs, bosses and
// fights (src/sim/castle-fights-a.js), what's off the way in each (a secret way, chests, a lookout), auto-play's way
// through, and their quests (src/folk/phobos-quests-a.js). Their layouts are walked by tools/dungeon/check.mjs and their
// fights played by tools/dungeon/fight.mjs.
//   node --test tests/castle-a.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOSSES, DELVES, LATCHES, WARN, caveRoom, delveAt, delveByKey, roomOf, roomSpot } from '../src/core/dungeon.js';
import { CASTLE_DUNGEONS_A, VARIANTS_A } from '../src/core/delve-castle-a.js';
import { ISLES, ISLE_R } from '../src/core/delve-archive.js';
import { EASELS, FRAMES, SHOP_MID } from '../src/core/delve-portraits.js';
import { GALLERY, JARS, VENTS, WHEELS } from '../src/core/delve-undercroft.js';
import { KEYS } from '../src/core/castle-keys.js';
import { castleChests, castleVistas } from '../src/core/castle-finds.js';
import { VARIANTS } from '../src/core/tripo-monsters.js';
import { FIGHTS } from '../src/sim/delve-fights.js';
import { FIGHTS_A } from '../src/sim/castle-fights-a.js';
import { KNOWN, WAYS, delveWay } from '../src/ui/autowarrens.js';
import { RULES } from '../src/folk/quests.js';
import { LEVELS_A, RULES_A } from '../src/folk/phobos-quests-a.js';
import { QUESTS_A } from '../src/folk/lines/phobos-more-a.js';
import { FOLK } from '../src/folk/people.js';
import { buildSites } from '../src/core/sites.js';
import { terrainHeight } from '../src/core/terrain.js';
import { CRAG } from '../src/core/east.js';

const KEYS_OF = ['drownedarchive', 'thousandportraits', 'undercroft'];
const [DA, TP, AU] = KEYS_OF.map(delveByKey);
const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const inRoom = (r, x, z, pad = 0) => Math.abs(x - r.x) <= r.hx - pad && Math.abs(z - r.z) <= r.hz - pad;

test('three dungeons in the castle\'s row, where the plan puts them, each with three bosses and a key from its last', () => {
  assert.deepEqual(CASTLE_DUNGEONS_A.map((d) => d.key), KEYS_OF);
  // (After the wards, the Iron Barracks and the High Ward's own: a delve's place in the list is kept in a save.)
  const at = KEYS_OF.map((k) => DELVES.findIndex((d) => d.key === k));
  assert.ok(at[0] > DELVES.findIndex((d) => d.key === 'ironbarracks') && at[1] === at[0] + 1 && at[2] === at[0] + 2);
  for (const [d, x, level, key] of [[DA, 13000, 80, 'key:archive'], [TP, 13460, 83, 'key:portraits'], [AU, 13920, 86, 'key:undercroft']]) {
    assert.ok(d.castle && d.dungeon && d.party !== false && !d.within, d.key);
    assert.deepEqual([d.x, d.z, d.y, d.level], [x, -5700, -60, level], d.key);
    const mine = BOSSES.filter((b) => b.delve === d.key);
    assert.equal(mine.length, 3, d.key);
    assert.equal(mine[2].key, d.last);
    assert.equal(mine[2].gives, key, `${d.key}: its last boss keeps ${key}`);
    assert.ok(KEYS[key]?.name && KEYS[key].got, key);
    assert.deepEqual(mine[2].needs, [mine[0].key, mine[1].key], `${d.last} waits on its two`);
    assert.ok(mine[2].shut && WARN[mine[2].shut] !== undefined);
    assert.ok(d.names && Object.keys(d.names).length >= 5 && d.pay.xp > 0 && d.words.enter && d.words.clear && d.words.wipe, d.key);
    assert.ok(d.tough.hp > 20 && d.tough.damage > 2.4, d.key);
  }
});

test('their gates are the plan\'s: each a way out into a ward, unbarred by coming through it from here', () => {
  for (const [d, to, n, latch] of [[DA, 'deepstacks', 2, 'latch:sump'], [TP, 'middleward', 5, 'latch:frame'], [AU, 'middleward', 6, 'latch:trapdoor']]) {
    assert.equal(d.links.length, 1, d.key);
    const l = d.links[0];
    assert.deepEqual([l.to, l.n, l.opens], [to, n, latch], d.key);
    assert.ok(!l.shut, `${d.key}: its own side is open`);
    assert.ok(LATCHES.includes(latch));
    // (Stood in a room of its own, a stride or two from a wall.)
    const r = d.rooms.find((q) => inRoom(q, l.x, l.z));
    assert.ok(r && !inRoom(r, l.x, l.z, 3), `${d.key}: its gate is against a wall of one of its rooms`);
    // (The far side is the High Ward's and the Middle Ward's to write: when it's there, it comes back here, barred by the same latch.)
    const far = delveByKey(to)?.links?.[n];
    if (far) { assert.equal(far.to, d.key); assert.equal(far.shut, latch); }
  }
});

test('each stands on the land in the Middle Ward, its door clear of everything that stops a body', () => {
  const S = buildSites();
  const boxIn = (px, pz, c, pad) => { const dx = px - c.x, dz = pz - c.z, co = Math.cos(c.yaw || 0), si = Math.sin(c.yaw || 0), lx = dx * co - dz * si, lz = dx * si + dz * co; return Math.abs(lx) < (c.hx ?? c.r) + pad && Math.abs(lz) < (c.hz ?? c.r) + pad; };
  for (const d of [DA, TP, AU]) {
    const p = d.portal;
    assert.ok(((p.x - CRAG.x) / (CRAG.a * 0.86)) ** 2 + ((p.z - CRAG.z) / (CRAG.b * 0.86)) ** 2 < 1, `${d.key}: inside the castle's curtain`);
    assert.equal(delveAt(p.x, p.z), null);
    // (On the Middle Ward's level ground: the terrace and a few strides out the front of it.)
    const hs = [];
    for (let u = -6; u <= 6; u += 3) for (let w = -4; w <= 9; w += 3) hs.push(terrainHeight(p.x + u * Math.cos(p.yaw) + w * Math.sin(p.yaw), p.z - u * Math.sin(p.yaw) + w * Math.cos(p.yaw)));
    assert.ok(Math.max(...hs) - Math.min(...hs) < 0.5, `${d.key}: level ground`);
    // (Out in front of it, where you're set down and where you walk up to it: nothing stands. Its own terrace is stood on, not walked into: t.)
    for (const out of [2, 4, 7]) {
      const x = p.x + Math.sin(p.yaw) * out, z = p.z + Math.cos(p.yaw) * out;
      const hit = S.colliders.find((c) => c.t === undefined && boxIn(x, z, c, 0.6));
      assert.equal(hit, undefined, `${d.key}: ${out} m out of its door stands ${JSON.stringify(hit)}`);
    }
  }
  for (const a of [DA, TP, AU]) for (const b of DELVES) if (a !== b && !b.within) assert.ok(Math.hypot(a.portal.x - b.portal.x, a.portal.z - b.portal.z) > 20, `${a.key} and ${b.key}: two doors together`);
});

test('every room is in the open, no two of a dungeon are called the same, and each has a way round', () => {
  for (const d of [DA, TP, AU]) {
    assert.ok(d.rooms.length >= 9 && d.rooms.length <= 12, `${d.key}: ${d.rooms.length} rooms`);
    for (const r of d.rooms) { const [x, , z] = roomSpot(r.id); assert.ok(caveRoom(x, z) > 1, `${r.id}: its middle is in the open`); assert.ok(r.id.startsWith(d.tag + '_')); }
    // (Its roof under the shaders' underground line.)
    for (const r of d.rooms) assert.ok(d.y + r.y + r.roof < -22, r.id);
    // (A secret way: narrow, low, into a room with a chest and nothing else.)
    const secret = d.tunnels.filter((t) => !t.dead && t.w <= 1.4);
    assert.equal(secret.length, 1, `${d.key}: one way on no map`);
    const end = secret[0].pts.at(-1), room = d.rooms.find((r) => inRoom(r, end[0], end[1]));
    assert.ok(room && d.chests.some((c) => c.room === room.id && c.loot >= 3), `${d.key}: its secret way goes to a chest`);
    assert.ok(!d.packs.some((p) => p.room === room.id) && !d.bosses.some((b) => b.room === room.id));
    // (Each boss's room has doors for what it calls in.)
    for (const b of d.bosses) assert.ok(d.tunnels.filter((t) => t.dead && t.door === b.room).length >= 2, `${b.key}: doors for its adds`);
  }
});

test('five packs and more in each, in its livery, with names of their own, none within a sight of another', () => {
  const pal = json('../assets/monsters/tripo/palettes.json'), roster = json('../assets/monsters/tripo/roster.json');
  const at = (p) => { const r = roomOf(p.room); return [r.x + (p.at?.[0] || 0), r.z + (p.at?.[1] || 0)]; };
  for (const [d, livery] of [[DA, ['Royal', 'Drowned']], [TP, ['Royal']], [AU, ['Forest']]]) {
    assert.ok(d.packs.length >= 5 && d.packs.length <= 8, `${d.key}: ${d.packs.length} packs`);
    assert.ok(d.packs.some((p) => p.elite), `${d.key}: an elite among them`);
    for (const p of d.packs) {
      assert.ok(p.n + (p.more?.n || 0) <= 7 && p.key.startsWith(d.tag + '_'), p.key);
      for (const n of p.pal) assert.ok(pal[n], `${p.key}: no palette ${n}`);
      for (const m of p.pick.concat(p.elite || [])) assert.ok(roster[m] || VARIANTS[m], `${p.key}: no body ${m}`);
      assert.ok(!p.pal.includes('Greygold'), `${p.key}: grey and gold beside the blue`);
      assert.notEqual(p.room, d.rooms[0].id, `${p.key}: nobody wakes into a fight`);
      for (const q of d.packs) if (q !== p) { const [ax, az] = at(p), [bx, bz] = at(q); assert.ok(Math.hypot(ax - bx, az - bz) >= 24, `${p.key} and ${q.key} stand ${Math.hypot(ax - bx, az - bz).toFixed(0)} m apart`); }
      const [x, z] = at(p); assert.ok(caveRoom(d.x + x, d.z + z) > 1, `${p.key} stands in the rock`);
    }
    assert.ok(d.packs.filter((p) => p.pal.some((n) => livery.includes(n))).length >= d.packs.length - 2, `${d.key}: its livery`);
    for (const b of d.bosses) assert.ok(b.pal.every((n) => livery.includes(n)), b.key);
  }
});

test('every boss has a body, a fight, calls that exist, and one thing of its own', () => {
  const src = readFileSync(new URL('../src/sim/castle-fights-a.js', import.meta.url), 'utf8');
  for (const d of [DA, TP, AU]) {
    for (const b of d.bosses) {
      for (const m of b.models) { assert.ok(VARIANTS_A[m] && VARIANTS[m] === VARIANTS_A[m], `${b.key}: no body ${m}`); }
      const spec = FIGHTS[b.key];
      assert.equal(spec, FIGHTS_A[b.key], `${b.key}: no fight`);
      assert.equal(typeof spec.step, 'function', `${b.key}: nothing of its own (step)`);
      assert.equal(typeof spec.order, 'function', `${b.key}: no order`);
      const deck = typeof spec.deck === 'function' ? spec.deck({ phase: 0 }) : spec.deck;
      assert.ok(deck.length >= 4, `${b.key}: a deck of ${deck.length}`);
      for (const n of deck) assert.ok(spec.moves[n], `${b.key}: no move ${n}`);
      for (const mv of Object.values(spec.moves)) assert.ok(mv.warn && WARN[mv.warn] !== undefined, `${b.key}: ${mv.warn}`);
      for (const a of spec.adds) { assert.ok(WARN[a.warn] !== undefined, `${b.key}: ${a.warn}`); for (const m of a.pick) assert.ok(VARIANTS[m] || json('../assets/monsters/tripo/roster.json')[m], `${b.key}: adds of ${m}`); }
      assert.ok(WARN[spec.open] !== undefined && WARN[spec.enrage[2]] !== undefined && WARN[d.turnWarn[b.key]] !== undefined, b.key);
      const [x, , z] = roomSpot(b.room, b.at?.[0] || 0, b.at?.[1] || 0);
      assert.ok(caveRoom(x, z) > 2.5, `${b.key} stands ${caveRoom(x, z).toFixed(1)} m from the rock`);
    }
    // (Every call it names is made somewhere, and every call made is named. No crossed shapes on his floors: the V and T rule.)
    for (const w of Object.keys(d.warnings)) {
      const used = src.includes(`WARN.${w}`) || src.includes(`'${w}'`) || Object.values(d.turnWarn).includes(w) || d.bosses.some((b) => b.shut === w) || d.links.some((l) => l.word === w);
      assert.ok(used, `${d.key}: ${w} is never called`);
    }
  }
  for (const [, w] of src.matchAll(/WARN\.([a-z_]+)/g)) assert.ok(WARN[w] !== undefined, `WARN.${w} isn't a warning`);
  assert.doesNotMatch(src, /shape: 'cross'|fireWheel|MOVES\.threads/, 'no crossed marks in his castle');
});

test('the places their fights stand on are in their rooms', () => {
  const hall = roomOf('da_lectorium');
  for (const [x, z] of ISLES) assert.ok(inRoom(hall, x, z, ISLE_R + 1), `a dry stack at ${x}, ${z}`);
  for (const a of ISLES) for (const b of ISLES) if (a !== b) assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > ISLE_R * 2 + 4);
  assert.equal(DA.daises.length, ISLES.length);
  const salon = roomOf('tp_salon'), shop = roomOf('tp_shop'), unf = roomOf('tp_hall');
  for (const [x, z] of FRAMES) assert.ok(inRoom(salon, x, z, 1.5), `a frame at ${x}, ${z}`);
  assert.ok(inRoom(shop, SHOP_MID[0], SHOP_MID[1], 8));
  for (const [x, z] of EASELS) assert.ok(inRoom(unf, x, z, 3), `an easel at ${x}, ${z}`);
  const jars = roomOf('au_jars'), retort = roomOf('au_retort'), vault = roomOf('au_vault');
  for (const [x, z] of JARS) assert.ok(inRoom(jars, x, z, 2), `a jar at ${x}, ${z}`);
  VENTS.forEach(([x, z], i) => {
    assert.ok(inRoom(retort, x, z, 3));
    const d = Math.hypot(WHEELS[i][0] - x, WHEELS[i][1] - z);
    // (A wheel's far enough from its vent to be held a while before the fume reaches it, and near enough to be got to.)
    assert.ok(d > 6 && d < 10 && inRoom(retort, WHEELS[i][0], WHEELS[i][1], 3), `vent ${i}'s wheel, ${d.toFixed(1)} m off`);
  });
  assert.ok(GALLERY.z < vault.z && GALLERY.z > vault.z - vault.hz && AU.daises.some((s) => Math.abs(s.z + s.hz - GALLERY.z) < 0.01), 'the gallery is the vault\'s far end');
});

test('what a fight orders: the named stand still, the press is shared, the dry stack, the canvas, the wheel, the gallery', () => {
  const body = (x, z, role) => ({ x, z, role, dead: false });
  const W = (d, bodies, tank = null) => ({ delve: d, bodies: () => bodies, tank: () => tank, sim: { time: 0 } });
  const m = { x: 0, z: 0, fixOn: null, fixT: 0 };
  { // The Indexer's name.
    const a = body(1, 1), b = body(2, 2), f = { name: { who: a, t: 3 } };
    assert.deepEqual(FIGHTS_A.indexer.order(W(DA, [a, b]), f, a), { still: true });
    assert.equal(FIGHTS_A.indexer.order(W(DA, [a, b]), f, b), null);
    assert.equal(FIGHTS_A.indexer.order(W(DA, [a, b]), { name: null }, a), null);
  }
  { // The Binder's press: everyone under it but his tank.
    const t = body(0, 1, 'tank'), a = body(20, 0), f = { press: { x: 5, z: 5 } };
    assert.deepEqual(FIGHTS_A.binder.order(W(DA, [t, a], t), f, a, [m]), { to: [5, 5], urgent: true });
    assert.equal(FIGHTS_A.binder.order(W(DA, [t, a], t), f, t, [m]), null);
    assert.equal(FIGHTS_A.binder.order(W(DA, [t, a], t), f, body(5.5, 5.5), [m]), null);
  }
  { // The Lector's tide: onto the lit stack.
    const f = { tide: { x: 100, z: 100 } }, o = FIGHTS_A.lector.order(W(DA, []), f, body(120, 100));
    assert.ok(o.urgent && Math.hypot(o.to[0] - 100, o.to[1] - 100) < ISLE_R - 1);
    assert.equal(FIGHTS_A.lector.order(W(DA, []), f, body(101, 100)), null);
  }
  { // The Painter's canvas: everyone but his tank.
    const t = body(0, 1, 'tank'), a = body(9, 9), c = { x: 30, z: 30, hp: 10, dead: false };
    assert.deepEqual(FIGHTS_A.painter.order(W(TP, [t, a], t), { canvas: c }, a, [m]), { to: [30, 30] });
    assert.equal(FIGHTS_A.painter.order(W(TP, [t, a], t), { canvas: c }, t, [m]), null);
    assert.equal(FIGHTS_A.painter.order(W(TP, [t, a], t), { canvas: { asked: true } }, a, [m]), null);
  }
  { // The Distiller's vent: whoever's nearest its wheel, never his tank.
    const t = body(1, 0, 'tank'), a = body(10, 0), b = body(40, 0), f = { vent: { hold: [2, 0] } };
    assert.deepEqual(FIGHTS_A.distiller.order(W(AU, [t, a, b], t), f, a, [m]), { to: [2, 0], urgent: true });
    assert.equal(FIGHTS_A.distiller.order(W(AU, [t, a, b], t), f, b, [m]), null);
    assert.equal(FIGHTS_A.distiller.order(W(AU, [t, a, b], t), f, t, [m]), null);
  }
  { // The Great Work's fume: up for the heavy, down for the light.
    const lip = AU.z + GALLERY.z, on = body(AU.x + 18, lip - 4), off = body(AU.x + 18, lip + 20);
    const up = FIGHTS_A.greatwork.order(W(AU, []), { fume: { heavy: true } }, off), down = FIGHTS_A.greatwork.order(W(AU, []), { fume: { heavy: false } }, on);
    assert.ok(up.urgent && up.to[1] < lip - 2 && down.urgent && down.to[1] > lip + 3);
    assert.equal(FIGHTS_A.greatwork.order(W(AU, []), { fume: { heavy: true } }, on), null);
    assert.equal(FIGHTS_A.greatwork.order(W(AU, []), { fume: { heavy: false } }, off), null);
  }
  { // The Jar-Mother's brine: whoever holds her walks her into it.
    const t = body(0, 0, 'tank'), a = body(3, 3), f = { wet: false, pools: [{ x: 8, z: 0 }, { x: -30, z: 0 }] };
    assert.deepEqual(FIGHTS_A.jarmother.order(W(AU, [t, a], t), f, t, [m]), { to: [8, 0] });
    assert.equal(FIGHTS_A.jarmother.order(W(AU, [t, a], t), f, a, [m]), null);
    assert.equal(FIGHTS_A.jarmother.order(W(AU, [t, a], t), { ...f, wet: true }, t, [m]), null);
  }
});

test('off the way in each: chests kept by their ids, on their rooms\' floors; a lookout', () => {
  const chests = castleChests(), vistas = castleVistas();
  for (const d of [DA, TP, AU]) {
    assert.ok(d.chests.length >= 2 && d.chests.length <= 3, d.key);
    for (const c of d.chests) {
      const r = d.rooms.find((q) => q.id === c.room), got = chests.find((q) => q.id === `${d.key}:${c.id}`);
      assert.ok(r && inRoom(r, c.x, c.z, 0.8) && !inRoom(r, c.x, c.z, 4), `${d.key}:${c.id} against a wall of ${c.room}`);
      assert.ok(got && got.y === d.y + r.y && got.loot === c.loot && c.loot >= 2 && c.loot <= 3, `${d.key}:${c.id}`);
      assert.ok(caveRoom(got.x, got.z) > 0.4, `${d.key}:${c.id} is in the rock`);
      // (Not in a boss's room: a chest is found, not won. The bosses leave their own.)
      assert.ok(!d.bosses.some((b) => b.room === c.room), `${d.key}:${c.id}`);
    }
    assert.equal(d.vistas.length, 1);
    const v = d.vistas[0], r = d.rooms.find((q) => q.id === v.room);
    assert.ok(r && inRoom(r, v.x, v.z, 1) && vistas.some((q) => q.id === v.id && q.delve === d.key && q.name === v.name), v.id);
  }
});

test('auto-play has a way through each, every room on it and each boss after its two, and comes to its door', () => {
  for (const d of [DA, TP, AU]) {
    const way = WAYS[d.key];
    assert.equal(way, d.auto.way);
    for (const r of d.rooms) assert.ok(way.includes(r.id), `${r.id} isn't on the way`);
    for (const id of way) assert.ok(d.rooms.some((r) => r.id === id), `${id} isn't a room of ${d.key}`);
    assert.equal(way[0], d.rooms[0].id);
    assert.equal(way.at(-1), d.bosses.at(-1).room, 'its last boss last');
    for (const p of d.packs) assert.ok(KNOWN.has(p.key), p.key);
    for (const b of d.bosses) { assert.ok(KNOWN.has(b.key), b.key); for (const n of b.needs || []) assert.ok(way.indexOf(d.bosses.find((q) => q.key === n).room) < way.lastIndexOf(b.room), `${b.key} is walked to before ${n}`); }
    assert.deepEqual(delveWay(null, d), [d.portal.x, d.portal.z], 'in by its own door on the land');
    assert.ok(d.shots.length >= 3 && d.shots.every(([name, room]) => name.startsWith(d.tag + '_') && d.rooms.some((r) => r.id === room)));
  }
});

test('their quests: seven to each, by people who stand somewhere, in step with its level, the last for its key', () => {
  const who = new Set(FOLK.map((p) => p.id)), levels = new Map(LEVELS_A);
  assert.deepEqual(Object.keys(RULES_A).sort(), [...levels.keys()].sort());
  assert.deepEqual(Object.keys(QUESTS_A).sort(), Object.keys(RULES_A).sort());
  for (const [d, lastQuest] of [[DA, 'the_drowned_lector'], [TP, 'the_unfinished_sitting'], [AU, 'the_great_work']]) {
    const rooms = new Set(d.rooms.map((r) => `room:${r.id}`)), bosses = new Set(d.bosses.map((b) => b.key));
    const mine = Object.keys(RULES_A).filter((id) => RULES_A[id].steps.some((st) => st.enter === d.key || st.kill === d.key || rooms.has(st.kill) || (st.visit || []).some((v) => rooms.has(v)) || bosses.has(st.boss)));
    assert.ok(mine.length >= 4 && mine.length <= 8, `${d.key}: ${mine.length} quests`);
    for (const id of mine) {
      assert.equal(RULES[id], RULES_A[id]);
      assert.ok(who.has(QUESTS_A[id].giver), `${id}: ${QUESTS_A[id].giver}`);
      assert.ok(levels.get(id) >= d.level && levels.get(id) <= d.level + 5, `${id}: level ${levels.get(id)}`);
      assert.equal(QUESTS_A[id].needs, RULES_A[id].needs, `${id}: its words and its workings want the same`);
    }
    // (Each boss is somebody's quest; the last is the last, by level, and pays a named thing.)
    for (const b of bosses) assert.ok(mine.some((id) => RULES_A[id].steps.some((st) => st.boss === b)), `nobody wants ${b} dead`);
    assert.equal(RULES_A[lastQuest].steps[0].boss, d.last);
    assert.ok(RULES_A[lastQuest].named && mine.every((id) => levels.get(id) <= levels.get(lastQuest)));
    // (Its secret room is somebody's errand: found by being sent to it.)
    const secret = d.chests.find((c) => c.loot === 3).room;
    assert.ok(mine.some((id) => RULES_A[id].steps.some((st) => (st.visit || []).includes(`room:${secret}`))), `nobody sends you to ${secret}`);
  }
});
