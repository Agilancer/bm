// Castle Velscour, grown (docs/PHOBOS-CASTLE.md): the gates between its delves go both ways and every lock has a key
// somebody keeps; every way barred from one side is unbarred from the other; its chests and lookouts stand on floors of
// their own rooms; the High Ward and the Deep Stacks are what they say; the Holdout's and the Roost's people stand in
// their rooms with words and work; and the castle's later quests name places, people and bosses that are there.
//   node --test tests/castle-high.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, DELVES, LATCHES, WARN, caveFloorY, caveRoom, delveByKey } from '../src/core/dungeon.js';
import { DEEP_STACKS, GRAVES, HIGH_WARD, LANTERN_AT, VAULT_DAISES } from '../src/core/delve-highward.js';
import { KEYS } from '../src/core/castle-keys.js';
import { castleChests, castleVistas } from '../src/core/castle-finds.js';
import { FIGHTS_H } from '../src/sim/castle-fights-h.js';
import { GIVERS_CASTLE, LEVELS_CASTLE, RULES_CASTLE } from '../src/folk/phobos-quests-castle.js';
import { delveWay } from '../src/ui/autowarrens.js';

const castle = DELVES.filter((d) => d.castle);
const inRoom = (d, id, x, z, pad = 0) => { const r = d.rooms.find((q) => q.id === id); return !!r && Math.abs(x - r.x) <= r.hx - pad && Math.abs(z - r.z) <= r.hz - pad; };

test('every gate between the castle\'s delves has a gate back, and stands clear in a room', () => {
  for (const d of castle) (d.links || []).forEach((l, i) => {
    const o = delveByKey(l.to);
    assert.ok(o, `${d.key} link ${i}: no delve ${l.to}`);
    const back = o.links?.[l.n];
    assert.ok(back && back.to === d.key && back.n === i, `${d.key} link ${i} -> ${l.to} ${l.n}: its gate back isn't the one back here`);
    assert.ok(caveRoom(d.x + l.x, d.z + l.z) > 0.8, `${d.key} link ${i} stands in the rock`);
    const fx = d.x + l.x + Math.sin(l.yaw) * 4, fz = d.z + l.z + Math.cos(l.yaw) * 4;
    assert.ok(caveRoom(fx, fz) > 1, `${d.key} link ${i}: whoever comes through it is set down in the rock`);
    if (l.shut) assert.ok(WARN[l.word] !== undefined, `${d.key} link ${i}: a shut gate with nothing said of why`);
  });
});

test('every lock has a key, and every key a keeper', () => {
  const asked = new Set();
  for (const d of castle) { for (const l of d.links || []) if (l.shut?.startsWith('key:')) asked.add(l.shut); if (d.shutBy) { asked.add(d.shutBy); assert.ok(WARN[d.shutWord] !== undefined, `${d.key}: its locked door says nothing`); } }
  const given = new Map(BOSSES.filter((b) => b.gives).map((b) => [b.gives, b]));
  for (const k of asked) { assert.ok(KEYS[k], `${k}: a lock with no key named`); assert.ok(given.has(k), `${k}: nobody keeps it`); }
  for (const [k, b] of given) assert.ok(KEYS[k]?.name && KEYS[k]?.got, `${b.key} gives ${k}, which has no words`);
  // (No key is behind its own lock: its keeper's delve isn't one only that key lets you into.)
  for (const [k, b] of given) { const d = delveByKey(b.delve); assert.notEqual(d.shutBy, k, `${k} is kept behind its own door`); }
  assert.ok(asked.size >= 8, `${asked.size} locks`);
});

test('a way barred from one side is unbarred from the other', () => {
  const opens = new Set(castle.flatMap((d) => (d.links || []).map((l) => l.opens).filter(Boolean)));
  const shut = castle.flatMap((d) => (d.links || []).filter((l) => l.shut?.startsWith('latch:')).map((l) => [d, l]));
  assert.ok(shut.length >= 4, `${shut.length} barred ways`);
  for (const [d, l] of shut) {
    assert.ok(opens.has(l.shut), `${d.key}: ${l.shut} is never unbarred`);
    assert.equal(delveByKey(l.to).links[l.n].opens, l.shut, `${d.key}: ${l.shut} isn't unbarred by coming through from its far side`);
  }
  assert.deepEqual([...opens].sort(), [...LATCHES].sort());
});

test('auto-play finds its way through the gates, and is stopped by a lock', () => {
  const lower = delveByKey('lowerward'), stacks = delveByKey('deepstacks'), high = delveByKey('highward');
  const none = () => false, all = () => true;
  assert.equal(delveWay(lower, high, none), null, 'no way up with nothing open');
  assert.ok(delveWay(lower, stacks, (k) => k === 'gatecaptain'), 'the Stacks by the Middle Ward, once the Gate Captain is dead');
  assert.ok(delveWay(lower, high, all));
  const mw = delveByKey('middleward'), w = delveWay(mw, high, (k) => k === 'key:archive');
  assert.ok(w && Math.hypot(w[0] - mw.x - 12, w[1] - mw.z + 191.2) < 0.1, 'by the Sanctuaries Stair with the Drowned Key');
  for (const d of castle.filter((q) => q.shutBy)) assert.equal(delveWay(null, d, none), null, `${d.key}: its locked door isn't walked up to`);
});

test('chests and lookouts stand on the floors of their own rooms', () => {
  let chests = 0, vistas = 0;
  for (const d of castle) {
    for (const c of d.chests || []) {
      chests++;
      assert.ok(inRoom(d, c.room, c.x, c.z, 0.4), `${d.key} chest ${c.id} isn't in ${c.room}`);
      assert.ok(caveRoom(d.x + c.x, d.z + c.z) > 0.5, `${d.key} chest ${c.id} is in the rock`);
      const got = castleChests().find((q) => q.id === `${d.key}:${c.id}`);
      assert.ok(Math.abs(got.y - caveFloorY(d.x + c.x, d.z + c.z)) < 0.7, `${d.key} chest ${c.id} at ${got.y.toFixed(1)}, its floor at ${caveFloorY(d.x + c.x, d.z + c.z).toFixed(1)}`);
    }
    for (const v of d.vistas || []) {
      vistas++;
      assert.ok(inRoom(d, v.room, v.x, v.z, 1), `${d.key} lookout ${v.id} isn't in ${v.room}`);
      assert.ok(caveRoom(d.x + v.x, d.z + v.z) > 1.5, `${d.key} lookout ${v.id} is against the rock`);
    }
  }
  assert.ok(chests >= 20 && vistas >= 8, `${chests} chests, ${vistas} lookouts down the castle`);
  assert.equal(new Set(castleChests().map((c) => c.id)).size, castleChests().length);
  assert.equal(new Set(castleVistas().map((v) => v.id)).size, castleVistas().length);
});

test('the High Ward and the Deep Stacks: gone into from the Middle Ward, their rooms, their own things', () => {
  for (const d of [HIGH_WARD, DEEP_STACKS]) { assert.equal(d.within, 'middleward'); assert.equal(d.party, false); assert.ok(d.auto.way.every((id) => d.rooms.some((r) => r.id === id))); }
  assert.ok(HIGH_WARD.rooms.length >= 10 && DEEP_STACKS.rooms.length >= 10);
  // (Nothing of his in the Holdout, its Shelves, the Well or the Roost: no pack's room, no banner.)
  for (const [d, quiet] of [[DEEP_STACKS, ['cd_door', 'cd_stair', 'cd_well', 'cd_hold', 'cd_dorm', 'cd_index']], [HIGH_WARD, ['ch_head', 'ch_roost']]]) for (const id of quiet) {
    assert.ok(!d.packs.some((p) => p.room === id) && !d.bosses.some((b) => b.room === id), `${id} is kept quiet`);
    if (id !== 'ch_head') assert.equal(d.rooms.find((r) => r.id === id).banners, 0, `${id}: none of his banners`);
  }
  // (Liveries: royal blue never in a delve with grey and gold beside it; the High Ward has none of the blue.)
  assert.ok(!HIGH_WARD.packs.some((p) => p.pal.includes('Royal') || p.pal.includes('Abyssal')));
  assert.ok(!DEEP_STACKS.packs.some((p) => p.pal.includes('Greygold')));
  for (const [x, z] of VAULT_DAISES) assert.ok(inRoom(DEEP_STACKS, 'cd_vault', x, z, 2));
  for (const [x, z] of [...GRAVES, ...LANTERN_AT]) { assert.ok(inRoom(HIGH_WARD, 'ch_ante', x, z, 1)); assert.ok(caveRoom(HIGH_WARD.x + x, HIGH_WARD.z + z) > 0.8); }
  for (const k of ['censor', 'starreader', 'sexton']) { const s = FIGHTS_H[k]; assert.ok(s && s.step && s.order && WARN[s.open] !== undefined, k); for (const m of Object.values(s.moves)) assert.ok(WARN[m.warn] !== undefined, `${k}: ${m.warn}`); }
  assert.equal(BOSSES.find((b) => b.key === 'sexton').gives, 'key:sexton');
});

test("the Holdout's and the Roost's people: in their rooms, clear of the rock, with words, nothing showing whose they are", async () => {
  const { POSTED } = await import('../src/folk/people.js');
  const { LINES } = await import('../src/folk/lines/phobos-hubs.js');
  const own = POSTED.filter((p) => p.id.startsWith('ho_'));
  assert.equal(own.length, 8);
  for (const p of own) {
    const d = delveByKey(p.delve), [x, z, y] = p.post;
    assert.ok(p.late, `${p.id}: loaded late`);
    assert.ok(inRoom(d, d === DEEP_STACKS ? (p.id === 'ho_bet' ? 'cd_dorm' : 'cd_hold') : 'ch_roost', x - d.x, z - d.z, 0.6), `${p.id} isn't in its room`);
    assert.ok(caveRoom(x, z) > 0.8, `${p.id} stands in something`);
    assert.ok(Math.abs(y - caveFloorY(x, z)) < 0.3, `${p.id} stands at ${y}, the floor at ${caveFloorY(x, z).toFixed(1)}`);
    const L = LINES[p.id];
    assert.ok(L?.first?.length && L.about?.length && L.bye?.length, `${p.id} has words`);
    assert.ok(!/tessariel|\bbells?\b|\bpray|bless|holy|saint/i.test(JSON.stringify(L)), `${p.id}: something shows`);
  }
});

test('the castle\'s later quests: given by someone who is there, to places, people and bosses that are', async () => {
  const { RULES, hasArea } = await import('../src/folk/quests.js');
  const { BY_ID } = await import('../src/folk/people.js');
  const { QUESTS } = await import('../src/folk/lines/phobos-hubs.js');
  const ids = Object.keys(RULES_CASTLE);
  assert.ok(ids.length >= 20, `${ids.length} quests`);
  assert.deepEqual(LEVELS_CASTLE.map(([id]) => id).sort(), [...ids].sort(), 'every one with a level');
  for (const id of ids) {
    const r = RULES_CASTLE[id], q = QUESTS[id];
    assert.equal(RULES[id], r);
    assert.ok(q && q.giver === GIVERS_CASTLE[id] && BY_ID[q.giver], `${id}: its giver`);
    if (r.needs) assert.ok(RULES[r.needs], `${id} needs ${r.needs}`);
    assert.equal(q.journal.length, r.steps.length, `${id}: journal lines`);
    for (const st of r.steps) {
      for (const k of [st.enter, st.kill, ...(st.visit || [])].filter((v) => typeof v === 'string')) assert.ok(hasArea(k), `${id}: no place ${k}`);
      if (st.talk) assert.ok(BY_ID[st.talk], `${id}: nobody called ${st.talk}`);
      if (st.boss) assert.ok(BOSSES.some((b) => b.key === st.boss), `${id}: no boss ${st.boss}`);
    }
  }
});
