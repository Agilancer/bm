// The party dungeons made after the first three (the Drowned Vaults, the Sporehold, the Hollow Playhouse, the Kingsbarrow),
// and what they added to the engine: a boss that waits on others, marks to stand in and blows shared, a pack's own
// toughness, a fight's orders. (Their layouts are walked by tools/dungeon/check.mjs and their fights played by
// tools/dungeon/fight.mjs; their quests by tests/quests-beyond.test.mjs.)
//   node --test tests/delves.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_PACKS, BOSSES, DELVES, WARN, WARNINGS, delveByKey, roomOf } from '../src/core/dungeon.js';
import { markOut, wayOut } from '../src/core/perils.js';
import { VARIANTS } from '../src/core/tripo-monsters.js';
import { FIGHTS } from '../src/sim/delve-fights.js';
import { Perils } from '../src/sim/perils.js';
import { ELEM } from '../src/sim/spells.js';
import { KNOWN, WAYS } from '../src/ui/autowarrens.js';

const LATER = ['vaults', 'sporehold', 'playhouse', 'kingsbarrow'];
const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('there are seven delves, the first three where they were, and the later four each with three bosses', () => {
  assert.deepEqual(DELVES.map((d) => d.key), ['warrens', 'blackvigil', 'deeps', ...LATER]);
  // (A boss's number is sent from the sim and kept: the old ten keep theirs.)
  assert.deepEqual(BOSSES.slice(0, 10).map((b) => b.key), ['grubnash', 'twins', 'venomaw', 'maldrec', 'sorvane', 'brothers', 'castellan', 'hrymgar', 'broodmother', 'sleeper']);
  assert.equal(WARNINGS[32], 'Venomaw stamps! Step in behind each ring as it lands.');
  for (const k of LATER) {
    const d = delveByKey(k), mine = BOSSES.filter((b) => b.delve === k);
    assert.equal(mine.length, 3, k);
    assert.equal(mine[2].key, d.last, `${k}: its last boss is its third`);
    assert.ok(d.names && Object.keys(d.names).length >= 3, `${k}: its own names for what lives in it`);
    assert.ok(d.level >= 9 && d.pay.xp > 0 && d.words.enter && d.words.clear && d.words.wipe, k);
  }
});

test('a boss that waits waits on bosses of its own delve that come before it, and says why its room is empty', () => {
  for (const b of BOSSES) {
    if (!b.needs) continue;
    const mine = BOSSES.filter((q) => q.delve === b.delve).map((q) => q.key), at = mine.indexOf(b.key);
    for (const k of b.needs) assert.ok(mine.indexOf(k) >= 0 && mine.indexOf(k) < at, `${b.key} needs ${k}`);
    assert.ok(b.shut && WARN[b.shut] !== undefined, `${b.key}: nothing said in its empty room`);
  }
  // (The Vaults has none: its three are met in the order they lie.)
  assert.deepEqual(BOSSES.filter((b) => b.needs).map((b) => b.key), ['heart', 'leadingman', 'dollmaker', 'wyrm']);
});

test('every later boss has a body, a fight, calls that exist, and one thing of its own to do about', () => {
  for (const b of BOSSES.filter((q) => LATER.includes(q.delve))) {
    for (const m of b.models) assert.ok(VARIANTS[m], `${b.key}: no body ${m}`);
    const spec = FIGHTS[b.key];
    assert.ok(spec, `${b.key}: no fight`);
    assert.ok(typeof spec.step === 'function', `${b.key}: nothing of its own (step)`);
    // (Each but two says where to be or to stand still by its order; the Leviathan's and the Golem's are in what they do.)
    if (!['leviathan', 'golem', 'heart'].includes(b.key)) assert.ok(typeof spec.order === 'function', `${b.key}: no order`);
    const deck = typeof spec.deck === 'function' ? spec.deck({ phase: 0 }) : spec.deck;
    assert.ok(deck.length >= 3, `${b.key}: a deck of ${deck.length}`);
    for (const n of deck) assert.ok(spec.moves[n], `${b.key}: no move ${n}`);
    for (const mv of Object.values(spec.moves)) if (mv.warn) assert.ok(WARN[mv.warn] !== undefined, `${b.key}: ${mv.warn}`);
    assert.ok(WARN[spec.open] !== undefined && WARN[spec.enrage[2]] !== undefined, b.key);
  }
  // (No stock boulder left in the twelve: each has a move of its own in its place.)
  const src = readFileSync(new URL('../src/sim/delve-fights.js', import.meta.url), 'utf8');
  assert.ok(!src.slice(src.indexOf('==== The Drowned Vaults')).includes('MOVES.boulder'));
});

test('every warning a later delve names is used by its fights or its bosses, and every one used is named', () => {
  const src = readFileSync(new URL('../src/sim/delve-fights.js', import.meta.url), 'utf8');
  for (const k of LATER) {
    const d = delveByKey(k);
    for (const w of Object.keys(d.warnings)) {
      const used = src.includes(`WARN.${w}`) || src.includes(`'${w}'`) || Object.values(d.turnWarn).includes(w) || d.bosses.some((b) => b.shut === w || b.cue === w) || /_run_/.test(w);
      assert.ok(used, `${k}: ${w} is never called`);
    }
  }
  for (const [, w] of src.matchAll(/WARN\.([a-z_]+)/g)) assert.ok(WARN[w] !== undefined, `WARN.${w} isn't a warning`);
});

test('a pack may have its own toughness and way of fighting, and no two packs of a later delve stand within a sight of each other', () => {
  const tough = ALL_PACKS.filter((p) => p.tough);
  assert.ok(tough.length >= 8);
  for (const p of tough) assert.ok(p.tough.hp > 1 && p.tough.damage > 1, p.key);
  for (const p of ALL_PACKS.filter((q) => q.ai)) assert.ok(['melee', 'caster', 'stalker'].includes(p.ai), p.key);
  const at = (p) => { const r = roomOf(p.room); return [r.x + (p.at?.[0] || 0), r.z + (p.at?.[1] || 0)]; };
  for (const k of LATER) {
    const ps = delveByKey(k).packs;
    assert.ok(ps.length >= 6, `${k}: ${ps.length} packs`);
    for (const a of ps) for (const b of ps) {
      if (a === b) continue;
      const [ax, az] = at(a), [bx, bz] = at(b);
      assert.ok(Math.hypot(ax - bx, az - bz) >= 24, `${a.key} and ${b.key} stand ${Math.hypot(ax - bx, az - bz).toFixed(0)} m apart`);
    }
    for (const p of ps) assert.ok(p.n + (p.more?.n || 0) <= 7, p.key);
  }
});

test('auto-play has a way through each, every room on it, and knows every pack and boss', () => {
  for (const k of LATER) {
    const d = delveByKey(k), way = WAYS[k];
    assert.ok(way, k);
    for (const r of d.rooms) assert.ok(way.includes(r.id), `${r.id} isn't on the way`);
    for (const p of d.packs) assert.ok(KNOWN.has(p.key), p.key);
    for (const b of d.bosses) { assert.ok(KNOWN.has(b.key), b.key); for (const n of b.needs || []) assert.ok(way.indexOf(roomOf(d.bosses.find((q) => q.key === n).room).id) < way.lastIndexOf(b.room), `${b.key} is walked to before ${n}`); }
  }
});

test('the palettes and the variants the later delves wear are there', () => {
  const pal = json('../assets/monsters/tripo/palettes.json'), roster = json('../assets/monsters/tripo/roster.json');
  for (const n of ['Drowned', 'Sporebloom', 'Porcelain', 'Verdigris', 'Gravegilt']) assert.ok(pal[n], n);
  // (New ones go on the end: a palette is known by its place.)
  assert.deepEqual(Object.keys(pal).slice(0, 4), ['Base', 'Ashen', 'Blighted', 'Infernal']);
  for (const [id, v] of Object.entries(VARIANTS)) assert.ok(roster[v.src] || roster[v.alt], `${id}: made on ${v.src}, which isn't in the roster`);
  for (const k of LATER) for (const p of delveByKey(k).packs) for (const n of p.pal) assert.ok(pal[n], `${p.key}: no palette ${n}`);
});

// ---- marks to stand in, and blows shared (src/sim/perils.js) ----------------------------------------------------------------
function world() {
  const hurt = [];
  const body = (x, z) => ({ x, z, y: 0, hp: 100, dead: false, active: true, damage(sim, n) { this.hp -= n; hurt.push([this, n]); return true; } });
  const p = body(0, 0), h = body(1, 0), far = body(30, 0);
  const sim = { tick: 0, time: 0, player: p, heroes: [h, far], world: { height: () => 0, inside: () => false }, event() {}, casting: { burst() {}, fx() {}, n: 0 } };
  globalThis.self ||= { postMessage() {} };
  return { sim, P: new Perils(sim), p, h, far, hurt };
}
const run = (W, secs) => { for (let t = 0; t < secs; t += 0.05) { W.sim.tick++; W.sim.time += 0.05; W.P.step(0.05); } };

test('a mark to stand in steers nobody out of it, and says so to the page', () => {
  const W = world();
  const mk = W.P.mark({ x: 0, z: 0, r: 3, fuse: 2, soak: true, elem: ELEM.LIGHT });
  assert.equal(W.P.danger(0, 0), null, 'nobody is sent out of a soak');
  assert.ok(W.P.safe(0, 0));
  assert.equal(markOut(mk).soak, true);
  assert.equal(wayOut([markOut(mk)].filter((m) => !m.soak), 0, 0), null);
  W.P.mark({ x: 0, z: 0, r: 3, fuse: 2 });
  assert.ok(W.P.danger(0, 0), 'but out of an ordinary one');
});

test('a shared blow is split among those in it, and then() is told who they were', () => {
  const W = world();
  let seen = null;
  W.P.mark({ x: 0, z: 0, r: 3, fuse: 0.5, dmg: 80, share: true, then: (m, P, inside) => { seen = inside; } });
  run(W, 1);
  assert.equal(seen.length, 2);
  assert.equal(W.p.hp, 60); assert.equal(W.h.hp, 60); assert.equal(W.far.hp, 100);
  const A = world();
  A.h.x = 20;
  A.P.mark({ x: 0, z: 0, r: 3, fuse: 0.5, dmg: 80, share: true });
  run(A, 1);
  assert.equal(A.p.hp, 20, 'alone in it, all of it');
});

test('each later delve has a quartermaster of its own, standing on open ground by its portal', async () => {
  const { BROKER_SPOTS, POSTS } = await import('../src/core/dungeon.js');
  const { BROKERS } = await import('../src/core/heroes.js');
  const { MAX_CHARS } = await import('../src/core/layout.js');
  assert.deepEqual(POSTS.map((q) => q.broker), DELVES.slice(3).map((d) => d.key));
  const names = new Set();
  for (const q of POSTS) {
    const d = delveByKey(q.broker), [x, z, face] = BROKER_SPOTS[q.broker], b = BROKERS.find((k) => k.broker === q.broker);
    assert.ok(b && b.name === q.name && b.say === q.say && b.delve === d.name, q.broker);
    assert.ok(q.say.length > 40 && !names.has(q.name), q.name); names.add(q.name);
    // (On its terrace: a few strides from the portal, and not on it.)
    const far = Math.hypot(x - d.portal.x, z - d.portal.z);
    assert.ok(far > d.portal.r + 1 && far < 7, `${q.broker}: ${far.toFixed(1)} m from its portal`);
    assert.ok(Number.isFinite(face));
  }
  // (The town's, the Warrens', the Test Dungeon's keeper and these four; and room in the snapshot for them.)
  assert.equal(BROKERS.length, 7);
  assert.ok(MAX_CHARS >= 104);
});

test('the Warden\'s stones are scenery that goes, their rubble scenery that comes, and the fight spends them', async () => {
  const { buildSites } = await import('../src/core/sites.js');
  const { WARDEN_COLUMNS } = await import('../src/core/delve-kingsbarrow.js');
  const groups = buildSites().groups;
  WARDEN_COLUMNS.forEach((q, n) => {
    const stone = groups.get(`kb_stone_${n}`), rubble = groups.get(`kb_rubble_${n}`);
    assert.ok(stone?.on === true && stone.ranges.length, `kb_stone_${n}`);
    assert.ok(rubble?.on === false && rubble.ranges.length, `kb_rubble_${n}`);
    for (const r of [...stone.ranges, ...rubble.ranges]) assert.ok(r.v1 > r.v0 && (r.under ? buildSites().under : buildSites().parts).get(r.layer).pos.length / 3 >= r.v1, r.layer);
  });
  const src = readFileSync(new URL('../src/sim/delve-fights.js', import.meta.url), 'utf8');
  assert.match(src, /f\.spent\.add\(stone\); W\.flip\(`kb_stone_\$\{stone\}`\); W\.flip\(`kb_rubble_\$\{stone\}`\)/);
  // (And the sim's own switch: on, off, and cleared when the delve stands again.)
  const { Warrens } = await import('../src/sim/dungeon.js').catch(() => ({}));
  if (Warrens) { const W = Object.create(Warrens.prototype); W.flipped = new Set(); W.flip('a'); W.flip('b'); W.flip('a', false); assert.deepEqual([...W.flipped], ['b']); }
});

test('the Vaults\' drains are barred at both ends: seen down, never walked', async () => {
  const { CaveNav, toWorld } = await import('../src/core/dungeon.js');
  const d = delveByKey('vaults'), drains = d.tunnels.filter((t) => t.drain), nav = new CaveNav(d), [ex, ez] = toWorld(d.entry.x, d.entry.z, d);
  assert.equal(drains.length, 2);
  for (const t of drains) {
    const a = t.pts[0], b = t.pts[t.pts.length - 1], [mx, mz] = toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d);
    assert.ok(!Number.isFinite(nav.walkDist(ex, ez, mx, mz, 0)), 'a drain can be walked into');
    assert.ok(t.dark && t.niche);
  }
  assert.equal(d.props.filter((p) => p.kind === 'grate' && p.solid).length, 4);
  assert.equal(d.props.filter((p) => p.kind === 'culvert').length, 2);
});
