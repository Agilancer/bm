// Castle Velscour's dungeons, set B (src/core/delve-castle-b.js; docs/PHOBOS-CASTLE.md): the Clockworks, the Menagerie of
// Chains, the Ossuary Chapel and the Hall of Mirrors. Each is where the contract puts it and gated as it says; has rooms
// that are walked, a secret way to a chest, chests and a lookout; packs in its livery; bosses with a body, a fight and one
// thing of their own; a last fight the place changes; a key from its last boss; a way through for auto-play; and quests
// from the Librarian's household. (Their layouts are walked by tools/dungeon/check.mjs, their fights played by
// tools/dungeon/fight.mjs, and their quests walked with the rest of Phobos's by tests/phobos-quests.test.mjs.)
//   node --test tests/castle-b.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_PACKS, BOSSES, DELVES, WARN, caveRoom, delveByKey, roomOf, roomSpot, toWorld } from '../src/core/dungeon.js';
import { buildUnder } from '../src/core/sites.js';
import { CASTLE_DUNGEONS_B, VARIANTS_B } from '../src/core/delve-castle-b.js';
import { LOWER_WARD } from '../src/core/delve-castle.js';
import { PROPS_B } from '../src/core/delve-props-b.js';
import { PROP_KINDS } from '../src/core/delve-build.js';
import { STRIKER_PLATE, HAMMER_ROWS, PENDULUMS, WINDERS_AT } from '../src/core/delve-clockworks.js';
import { AVIARY_TREES, CHAIN_POSTS, GREAT_CAGE, PIT_CHAIN, PIT_STAKE } from '../src/core/delve-menagerie.js';
import { BONE_PIERS } from '../src/core/delve-ossuary.js';
import { GLASS_SPOTS, IMAGE_GLASSES } from '../src/core/delve-mirrors.js';
import { KEYS } from '../src/core/castle-keys.js';
import { castleChests, castleVistas } from '../src/core/castle-finds.js';
import { VARIANTS } from '../src/core/tripo-monsters.js';
import { FIGHTS } from '../src/sim/delve-fights.js';
import { FIGHTS_B, SHADOW } from '../src/sim/castle-fights-b.js';
import { RULES } from '../src/folk/quests.js';
import { RULES_B, LEVELS_B } from '../src/folk/phobos-quests-b.js';
import { QUESTS_B } from '../src/folk/lines/phobos-more-b.js';
import { KNOWN, WAYS } from '../src/ui/autowarrens.js';

const KEYS_B = ['clockworks', 'menagerie', 'ossuary', 'mirrors'];
const [CW, MC, OC, HM] = KEYS_B.map(delveByKey);
const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const inRoom = (r, x, z, pad = 0) => Math.abs(x - r.x) <= r.hx - pad && Math.abs(z - r.z) <= r.hz - pad;

test('four dungeons after the wards, where the contract puts them, a party welcome in each', () => {
  assert.deepEqual(CASTLE_DUNGEONS_B.map((d) => d.key), KEYS_B);
  const at = KEYS_B.map((k) => DELVES.findIndex((d) => d.key === k));
  assert.ok(at.every((i) => i > DELVES.findIndex((d) => d.key === 'ironbarracks')), 'after the Iron Barracks');
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'in their order');
  assert.deepEqual([CW, MC, OC, HM].map((d) => [d.x, d.z, d.y, d.level, d.tag]), [[14380, -5700, -60, 90, 'cw'], [14840, -5700, -60, 92, 'mc'], [15300, -5700, -60, 100, 'oc'], [15760, -5700, -60, 106, 'hm']]);
  for (const d of [CW, MC, OC, HM]) {
    assert.ok(d.castle && d.dungeon && d.party !== false && d.style === 'castle', d.key);
    assert.ok(d.rooms.length >= 8 && d.rooms.length <= 12, `${d.key}: ${d.rooms.length} rooms`);
    assert.ok(d.names && Object.keys(d.names).length >= 4 && d.pay.xp > 0 && d.words.enter && d.words.clear && d.words.wipe, d.key);
    for (const r of d.rooms) { const [x, , z] = roomSpot(r.id); assert.ok(caveRoom(x, z) > 1, `${r.id}: its middle is in the open`); assert.ok(r.id.startsWith(`${d.tag}_`), r.id); }
    // (Under the shaders' underground line, with room over a head.)
    for (const r of d.rooms) assert.ok(d.y + r.y + Math.abs(r.tz || 0) * r.hz + r.roof <= -22 && r.roof >= 4.5, `${r.id}: its roof`);
  }
});

test('each is built whole: every corner of it a real number, and no more of them than a phone will hold', () => {
  for (const d of [CW, MC, OC, HM]) {
    let verts = 0;
    for (const [layer, p] of buildUnder(d.key).parts) { verts += p.pos.length / 3; for (let i = 0; i < p.pos.length; i++) assert.ok(Number.isFinite(p.pos[i]), `${d.key}: a corner of its ${layer} is no number`); }
    assert.ok(verts > 20000 && verts < 400000, `${d.key}: ${verts} corners`);
    // (And no more faces than a phone draws easily: the Ossuary's walls of skulls were 143,000 of them.)
    let tris = 0; for (const [, p] of buildUnder(d.key).parts) tris += p.idx.length / 3;
    assert.ok(tris < 110000, `${d.key}: ${tris} triangles`);
  }
});

test('gated as the contract says: land doors that want a key, wards gone into only from the High Ward, links in their places', () => {
  assert.deepEqual([CW.shutBy, MC.shutBy], ['key:portraits', 'key:barracks']);
  for (const d of [CW, MC]) {
    assert.ok(!d.within && WARN[d.shutWord] !== undefined, `${d.key}: its locked door's word`);
    assert.ok(Math.hypot(d.portal.x - 11075, d.portal.z) < 340, `${d.key}: its door is on the castle's crag`);
  }
  for (const d of [OC, HM]) { assert.equal(d.within, 'highward'); assert.equal(d.portal, LOWER_WARD.portal); assert.equal(d.shutBy, undefined); }
  const L = (d) => d.links.map((l) => [l.to, l.n, l.shut || null]);
  assert.deepEqual(L(CW), [['middleward', 2, null], ['highward', 5, 'key:clockworks']]);
  assert.deepEqual(L(MC), [['middleward', 3, null]]);
  assert.deepEqual(L(OC), [['highward', 3, null]]);
  assert.deepEqual(L(HM), [['highward', 4, null]]);
  for (const d of [CW, MC, OC, HM]) for (const l of d.links) {
    const [x, z] = toWorld(l.x, l.z, d);
    assert.ok(caveRoom(x, z) > 1, `${d.key}: a gate to ${l.to} in the rock`);
    if (l.shut) assert.ok(WARN[l.word] !== undefined, `${d.key}: nothing said at its shut gate`);
    // (Its far side is the High Ward's or the Middle Ward's to write: where it's there, it comes back.)
    const back = delveByKey(l.to)?.links?.[l.n];
    if (back) assert.equal(back.to, d.key, `${d.key}: its gate to ${l.to} doesn't come back`);
  }
});

test('each has two or three bosses, the last of them last, keyed, shut in till the others are dead', () => {
  const mine = (d) => BOSSES.filter((b) => b.delve === d.key);
  assert.deepEqual(mine(CW).map((b) => b.key), ['striker', 'regulator', 'clockmaker']);
  assert.deepEqual(mine(MC).map((b) => b.key), ['oldhunger', 'matron', 'keeper']);
  assert.deepEqual(mine(OC).map((b) => b.key), ['cantor', 'boneprior']);
  assert.deepEqual(mine(HM).map((b) => b.key), ['glazier', 'duchess']);
  const gives = { clockworks: 'key:clockworks', menagerie: 'key:menagerie', ossuary: 'key:ossuary', mirrors: 'key:mirrors' };
  for (const d of [CW, MC, OC, HM]) {
    const bs = mine(d), last = bs.at(-1);
    assert.equal(last.key, d.last);
    assert.equal(last.gives, gives[d.key]);
    assert.ok(KEYS[last.gives]?.name && KEYS[last.gives].got, `${last.gives} is no key (src/core/castle-keys.js)`);
    assert.deepEqual(last.needs, bs.slice(0, -1).map((b) => b.key), `${last.key} waits on the others`);
    assert.ok(WARN[last.shut] !== undefined, `${last.key}: nothing said in its empty room`);
    for (const b of bs.slice(0, -1)) assert.ok(!b.gives && !b.needs, b.key);
    for (const b of bs) {
      const r = roomOf(b.room), [x, , z] = roomSpot(b.room, b.at?.[0] || 0, b.at?.[1] || 0);
      assert.equal(r.delve, d); assert.ok(Math.min(r.hx, r.hz) >= 12 && Math.max(r.hx, r.hz) <= 20, `${b.key}: room to fight in, and no bigger than what's in it`); assert.ok(caveRoom(x, z) >= 4, `${b.key} stands in the open`);
      assert.ok(d.auto.way.lastIndexOf(b.room) >= 0);
    }
  }
});

test('every boss has a body, a fight, calls that exist, and one thing of its own to do about', () => {
  const roster = json('../assets/monsters/tripo/roster.json');
  for (const [id, v] of Object.entries(VARIANTS_B)) { assert.equal(VARIANTS[id], v, `${id} isn't taken in`); assert.ok(roster[v.src] || roster[v.alt], `${id}: made on ${v.src}`); assert.ok(v.name && v.height > 0, id); }
  for (const d of [CW, MC, OC, HM]) for (const b of d.bosses) {
    for (const m of b.models) assert.ok(VARIANTS_B[m], `${b.key}: no body ${m}`);
    const spec = FIGHTS[b.key];
    assert.equal(spec, FIGHTS_B[b.key], `${b.key}: no fight`);
    assert.ok(typeof spec.step === 'function' && typeof spec.order === 'function', `${b.key}: nothing of its own`);
    const decks = spec.decks ? Object.values(spec.decks) : [typeof spec.deck === 'function' ? spec.deck({}) : spec.deck];
    if (spec.decks) assert.deepEqual(Object.keys(spec.decks).sort(), [...b.models].sort(), `${b.key}: a deck for each body`);
    for (const deck of decks) { assert.ok(deck.length >= 4, `${b.key}: a deck of ${deck.length}`); for (const n of deck) assert.ok(spec.moves[n], `${b.key}: no move ${n}`); }
    for (const mv of Object.values(spec.moves)) { assert.ok(mv.warn && WARN[mv.warn] !== undefined, `${b.key}: ${mv.warn}`); assert.ok(typeof mv.go === 'function'); }
    for (const w of [spec.open, spec.enrage[2], d.turnWarn[b.key], ...(spec.adds || []).map((a) => a.warn)]) assert.ok(WARN[w] !== undefined, `${b.key}: ${w}`);
    assert.ok(b.hp >= 90000 && b.damage >= 300 && b.reach >= 3, `${b.key}: its measure`);
  }
  // (Each fight's own places are in its own room.)
  const P = (id, pts, pad = 0) => { const r = roomOf(id); for (const [x, z] of pts) assert.ok(inRoom(r, x, z, pad), `${id}: ${x}, ${z} is outside it`); };
  P('cw_strike', [STRIKER_PLATE], 2.5); P('cw_strike', HAMMER_ROWS.map((z) => [roomOf('cw_strike').x, z]), 2); P('cw_pend', PENDULUMS.map((z) => [roomOf('cw_pend').x, z]), 3); P('cw_lift', WINDERS_AT, 2);
  P('mc_pit', [PIT_STAKE]); P('mc_aviary', AVIARY_TREES, 3); P('mc_ring', CHAIN_POSTS, 3); P('oc_sanct', BONE_PIERS, 3); P('hm_work', GLASS_SPOTS, 1.5); P('hm_hall', IMAGE_GLASSES, 2);
  // (What's hidden behind: the trees and the posts stop a body, so they stop a shriek and a chain.)
  for (const [list, kind, d] of [[AVIARY_TREES, 'deadtree', MC], [CHAIN_POSTS, 'chainpost', MC]]) for (const [x, z] of list) assert.ok(d.props.some((p) => p.kind === kind && p.solid && p.x === x && p.z === z), `no ${kind} at ${x}, ${z}`);
});

test('every warning they name is called, and every one called is named', () => {
  const code = src('../src/sim/castle-fights-b.js');
  for (const d of [CW, MC, OC, HM]) for (const w of Object.keys(d.warnings)) {
    const used = code.includes(`WARN.${w}`) || code.includes(`'${w}'`) || Object.values(d.turnWarn).includes(w) || d.bosses.some((b) => b.shut === w) || d.shutWord === w || d.links.some((l) => l.word === w);
    assert.ok(used, `${d.key}: ${w} is never called`);
  }
  for (const [, w] of code.matchAll(/WARN\.([a-z_]+)/g)) assert.ok(WARN[w] !== undefined, `WARN.${w} isn't a warning`);
  for (const [, w] of code.matchAll(/warn: '([a-z_]+)'/g)) assert.ok(WARN[w] !== undefined, `'${w}' isn't a warning`);
});

test('what you empty on the way changes the last fight', () => {
  const W = (cleared) => { const warned = []; return { warned, sim: { tripo: { lairs: cleared.map((key) => ({ key, state: 'cleared' })) }, perils: { mark: () => ({}) }, casting: { burst() {} }, world: { inside: () => false, height: () => 0 }, time: 0 }, delve: CW, adds: () => [], bodies: () => [], bossBodies: () => [], warn: (w) => warned.push(w), spawnAdds() {}, callAdds(f, m, a) { (this.called ||= []).push(a.warn); }, mark: () => null, tank: () => null }; };
  const boss = () => ({ hp: 1000, maxHp: 1000, state: 0, opts: { damage: 100, model: 'x' }, perform: () => true, x: 0, z: 0, y: 0 });
  // The Clockmaker: the Going Train stopped, fewer winders; the Escapement jammed, no hour turned back.
  { const spec = FIGHTS_B.clockmaker, run = (cleared, life = 0.5) => { const w = W(cleared), f = { boss: CW.bosses[2] }, m = boss(); m.hp = life * 1000; spec.step(w, f, [m], 0.1); return { w, f, n: spec.adds.map((a) => a.n(w, f)) }; };
    assert.deepEqual(run([]).n, [4, 4]); assert.ok(run([]).f.rewind, 'he turns back the hour');
    assert.deepEqual(run(['cw_train']).n, [2, 2]); assert.equal(run(['cw_train']).w.warned.includes(WARN.ckm_less_men), true);
    assert.equal(run(['cw_esc']).f.rewind, undefined); assert.equal(run(['cw_esc']).w.warned.includes(WARN.ckm_less_hour), true); }
  // The Keeper of Chains: a wing emptied is one he can't loose.
  { const spec = FIGHTS_B.keeper, run = (cleared) => { const w = W(cleared), f = { boss: MC.bosses[2] }, m = boss(); w.delve = MC; for (const life of [0.7, 0.45, 0.2]) { m.hp = life * 1000; spec.step(w, f, [m], 0.1); } return w; };
    assert.deepEqual(run([]).called, ['kpr_wolves', 'kpr_spiders', 'kpr_wyrms']);
    assert.deepEqual(run(['mc_runs', 'mc_tank']).called, ['kpr_spiders']);
    const none = run(['mc_runs', 'mc_rows_s', 'mc_tank']); assert.equal(none.called, undefined); assert.equal(none.warned.length, 3);
    for (const k of ['mc_runs', 'mc_rows_s', 'mc_tank']) assert.ok(MC.packs.some((p) => p.key === k), k); }
  // The Bone Prior: the Charnel Aisle emptied, no piers; the Under-Crypt, no old priors.
  { const spec = FIGHTS_B.boneprior, run = (cleared) => { const w = W(cleared), f = { boss: OC.bosses[1] }, m = boss(); w.delve = OC; m.hp = 400; spec.step(w, f, [m], 0.1); return { w, deck: spec.deck(f) }; };
    assert.ok(run([]).deck.includes('piers')); assert.deepEqual(run([]).w.called, ['pri_priors']);
    assert.equal(run(['oc_charnel']).deck.includes('piers'), false); assert.equal(run(['oc_crypt']).w.called, undefined);
    for (const k of ['oc_charnel', 'oc_crypt']) assert.ok(OC.packs.some((p) => p.key === k), k); }
  // The Duchess: an image for every great glass left uncovered; all three draped, none.
  { const spec = FIGHTS_B.duchess, run = (cleared) => { const w = W(cleared), f = { boss: HM.bosses[1] }, her = boss(), glass = boss(); her.opts.model = 'hm_duchess'; glass.opts.model = 'hm_glass'; w.delve = HM; w.bossBodies = () => [her, glass]; her.hp = 600; let n = 0; w.spawnAdds = () => { n++; }; spec.step(w, f, [her, glass], 0.1); return { w, f, n, her, glass }; };
    const all = run([]); assert.equal(all.n, 3); assert.equal(all.glass.shrug, 0, 'the Glass takes nothing'); assert.equal(all.glass.hp, all.her.hp, 'its life is hers'); assert.equal(spec.focus(all.w, all.f), all.her);
    assert.equal(run(['hm_east']).n, 2);
    const none = run(['hm_east', 'hm_west', 'hm_maze']); assert.equal(none.n, 0); assert.ok(none.w.warned.includes(WARN.dch_draped));
    for (const [, , k] of IMAGE_GLASSES) assert.ok(HM.packs.some((p) => p.key === k), k); }
});

test('the Striker is wound tighter till someone stands on the release plate', () => {
  const spec = FIGHTS_B.striker, warned = [], bodies = [], marks = [];
  const W = { delve: CW, sim: { perils: { mark: (o) => { marks.push(o); return o; } }, casting: { burst() {} } }, bodies: () => bodies, warn: (w) => warned.push(w), tank: () => null };
  const [sx, , sz] = roomSpot('cw_strike'), m = { hp: 1000, maxHp: 1000, state: 0, opts: { damage: 100 }, perform: () => true, x: sx, z: sz, y: 0 }, f = { boss: CW.bosses[0] };
  for (let t = 0; t < 41; t += 0.5) spec.step(W, f, [m], 0.5);
  assert.equal(f.wound, 2); assert.ok(m.opts.damage > 125 && warned.includes(WARN.stk_wound) && marks.length === 1, 'wound twice, and the plate shown');
  const [px, pz] = [CW.x + STRIKER_PLATE[0], CW.z + STRIKER_PLATE[1]], b = { x: px + 30, z: pz };
  bodies.push(b);
  assert.deepEqual(spec.order(W, f, b, [m]), { to: [px, pz], urgent: true }, 'the nearest of you is sent to it');
  b.x = px + 1;
  for (let t = 0; t < 2; t += 0.5) spec.step(W, f, [m], 0.5);
  assert.equal(f.wound, 0); assert.equal(m.opts.damage, 100); assert.ok(f.stun > 0 && m.shrug > 1 && warned.includes(WARN.stk_release), 'let down: stopped, and hurt the more');
  assert.equal(spec.order(W, f, b, [m]), null);
});

test('Old Hunger is on a chain: what dies inside its reach he eats, what dies out past it he cannot get to', () => {
  const spec = FIGHTS_B.oldhunger, warned = [], marks = [];
  const P = { marks, mark: (o) => { marks.push(o); return o; } };
  const W = { delve: MC, sim: { perils: P, casting: { burst() {} } }, bodies: () => [], warn: (w) => warned.push(w), tank: () => null };
  const [sx, sz] = [MC.x + PIT_STAKE[0], MC.z + PIT_STAKE[1]];
  const m = { hp: 500, maxHp: 1000, state: 0, opts: { damage: 100 }, x: sx + 30, z: sz, y: 0 }, f = { boss: MC.bosses[0] };
  spec.step(W, f, [m], 0.1);
  assert.ok(Math.abs(Math.hypot(m.x - sx, m.z - sz) - PIT_CHAIN) < 0.01, 'he goes no further than his chain');
  assert.equal(marks.filter((q) => q.shape === 'ring' && q.soak && !q.dmg).length, 1, "the chain's reach is shown, and hurts nobody");
  const pit = roomOf('mc_pit');
  assert.ok(PIT_CHAIN + 4 <= Math.min(pit.hx, pit.hz), 'room out past the ring to kill a hound in');
  const hound = (dx) => ({ x: sx + dx, z: sz, hp: 0, dead: true });
  f.hounds = [hound(PIT_CHAIN + 4)];
  spec.step(W, f, [m], 0.1);
  assert.equal(m.hp, 500); assert.ok(warned.includes(WARN.hun_denied), 'dead out of his reach: he goes hungry');
  f.hounds.push(hound(3));
  spec.step(W, f, [m], 0.1);
  assert.equal(m.hp, 550); assert.ok(m.opts.damage > 100 && warned.includes(WARN.hun_fed), 'dead inside it: he eats');
  spec.step(W, f, [m], 0.1);
  assert.equal(m.hp, 550, 'once each');
  // While a hound's up, whoever isn't holding him is sent out past the ring.
  f.hounds.push({ x: sx, z: sz, hp: 10, dead: false });
  const o = spec.order(W, f, { x: sx + 4, z: sz }, [m]);
  assert.ok(o && Math.hypot(o.to[0] - sx, o.to[1] - sz) > PIT_CHAIN + 2);
  assert.equal(spec.order(W, f, { x: sx + PIT_CHAIN + 5, z: sz }, [m]), null);
});

test("the Keeper's chain: hit him hard enough as he hauls and he lets it go", () => {
  const spec = FIGHTS_B.keeper, warned = [], b = { x: 0, z: 0, dead: false };
  const [rx, , rz] = roomSpot('mc_ring');
  b.x = rx + 12; b.z = rz;
  const W = { delve: MC, sim: { tripo: { lairs: ['mc_runs', 'mc_rows_s', 'mc_tank'].map((key) => ({ key, state: 'cleared' })) }, perils: { mark: (o) => o, hurt() {} }, casting: { burst() {} }, time: 0 }, bodies: () => [b], warn: (w) => warned.push(w), tank: () => null, mark: () => b, drag() {}, callAdds() {} };
  const m = { hp: 1000, maxHp: 1000, state: 0, opts: { damage: 100 }, perform: () => true, x: rx, z: rz, y: 0 }, f = { boss: MC.bosses[2] };
  for (let t = 0; t < 27 && !f.chain; t += 0.5) spec.step(W, f, [m], 0.5);
  assert.ok(f.chain && f.chain.on === b && warned.includes(WARN.kpr_chain), 'his chain takes one of you');
  m.hp -= 2;
  spec.step(W, f, [m], 0.1);
  assert.ok(f.chain, 'a scratch does not make him drop it');
  m.hp -= 10;
  spec.step(W, f, [m], 0.1);
  assert.equal(f.chain, null); assert.ok(f.stun > 0 && warned.includes(WARN.kpr_dropped), 'hit hard enough, he lets it go and staggers');
});

test('the lessons of the first round: sections that differ, light in pools, nothing hung on a hung fire, a hero piece each', () => {
  const HERO = { clockworks: ['clockface', 'cw_shaft'], menagerie: ['greatcage', 'mc_aviary'], ossuary: ['skullwall', 'oc_nave'], mirrors: ['bigmirror', 'hm_hall'] };
  for (const d of [CW, MC, OC, HM]) {
    const roofs = d.rooms.map((r) => r.roof);
    assert.ok(Math.min(...roofs) <= 5 && Math.max(...roofs) >= 3 * Math.min(...roofs), `${d.key}: every room the same height`);
    assert.ok(d.rooms.some((r) => r.roof >= 2 * Math.min(r.hx, r.hz)), `${d.key}: nothing tall and narrow`);
    assert.ok(d.rooms.filter((r) => r.roof <= 7).length >= 3, `${d.key}: nothing low`);
    // Pools of light: no fires stood round every wall, a torch every fifteen metres, a handful of fires to a room.
    assert.ok(d.look.every >= 14, `${d.key}: a torch every ${d.look.every} m`);
    for (const r of d.rooms) {
      assert.equal(r.fires, 0, `${r.id}: fires stood all round it`);
      const lit = d.props.filter((p) => ['brazier', 'basket'].includes(p.kind) && inRoom(r, p.x, p.z)).length;
      assert.ok(lit <= 7, `${r.id}: ${lit} fires`);
      // (A room that hangs its own fires down its middle has no ring of candles hung there too.)
      const own = Math.min(r.hx, r.hz) >= 12 && r.roof >= 8 && r.hang !== 0 && !r.tz;
      assert.ok(!own || !d.props.some((p) => p.kind === 'chandelier' && inRoom(r, p.x, p.z)), `${r.id}: a chandelier among its own hung fires`);
    }
    // A boss's room is lit: fire of its own, hung or stood.
    for (const b of d.bosses) { const r = roomOf(b.room); assert.ok(r.hang !== 0 || d.props.filter((p) => ['brazier', 'chandelier', 'daylight'].includes(p.kind) && inRoom(r, p.x, p.z)).length >= 5, `${b.key} fights in the dark`); }
    // One hero piece, bigger than anything else of its kind in the place, in the room it's named for.
    const [kind, room] = HERO[d.key], r = d.rooms.find((q) => q.id === room);
    const size = (p) => (p.r || p.w || 0) * (p.h || 1), all = d.props.filter((p) => p.kind === kind), hero = all.filter((p) => inRoom(r, p.x, p.z, -0.5)).sort((p, q) => size(q) - size(p))[0];
    assert.ok(hero && size(hero) >= Math.max(...all.map(size)) * 0.75, `${d.key}: no great ${kind} in ${room}`);
  }
  // Nothing that's a rail over posts or a bar over uprights among their own things: the builders say so.
  const code = src('../src/core/delve-props-b.js');
  for (const k of ['gong', 'beastcage', 'pane', 'bonetree']) assert.ok(Object.keys(PROPS_B).includes(k));
  assert.match(code, /No frame: a head across two posts is a bar over uprights/);
  assert.match(code, /a plate over a row of bars/);
  for (const d of [CW, MC, OC, HM]) assert.ok(!d.props.some((p) => p.kind === 'coatrail' || p.kind === 'dressform'), `${d.key}: a rail on posts, or the Playhouse's cloth`);
  // (The nave's runner stops either side of its ring of black glass.)
  const ring = OC.props.find((p) => p.kind === 'rings' && inRoom(roomOf('oc_nave'), p.x, p.z));
  for (const c of OC.props.filter((p) => p.kind === 'carpet' && inRoom(roomOf('oc_nave'), p.x, p.z))) assert.ok(Math.abs(c.z - ring.z) - c.hz >= ring.r, 'a runner through the ring');
});

test("each last boss's opening call says what you could have emptied first, and each dungeon's quests have one that isn't a walk or a kill", () => {
  const words = { clockmaker: [/Going Train/, /Escapement/], keeper: [/Wolf Runs/, /Cage Rows/, /Wyrm Tank/], boneprior: [/Under-Crypt/, /Charnel Aisle/], duchess: [/Cabinet of Faces/, /Dressing Rooms/, /Glass Maze/] };
  for (const d of [CW, MC, OC, HM]) for (const re of words[d.last]) assert.match(d.warnings[FIGHTS_B[d.last].open], re, d.last);
  const twist = (st) => (st.enter && st.night) || (st.talk && !st.back) || st.bring;
  const mine = (d) => Object.values(RULES_B).filter((r) => r.steps.some((s) => [s.enter, s.kill, ...(s.visit || [])].some((k) => k === d.key || d.rooms.some((q) => `room:${q.id}` === k)) || d.bosses.some((b) => b.key === s.boss)));
  for (const d of [CW, MC, OC, HM]) assert.ok(mine(d).some((r) => r.steps.some(twist)), `${d.key}: every step of its quests is a walk or a kill`);
  assert.deepEqual(RULES_B.the_clock_that_strikes.steps[0], { enter: 'ph:approach', night: true });
  assert.equal(RULES_B.the_wolf_runs.steps.at(-1).talk, 'ph_watch'); assert.ok(QUESTS_B.the_wolf_runs.others.ph_watch.length);
  assert.equal(RULES_B.the_old_priors.steps.at(-1).bring, 'bone');
  assert.equal(RULES_B.the_room_on_no_plan.steps[1].talk, 'ph_ondine'); assert.ok(QUESTS_B.the_room_on_no_plan.others.ph_ondine.length);
});

test('packs in their liveries, far enough apart, and none where you wake', () => {
  const pal = json('../assets/monsters/tripo/palettes.json'), roster = json('../assets/monsters/tripo/roster.json');
  const LIVERY = { clockworks: ['Greygold'], menagerie: ['Forest', 'Bloodred'], ossuary: ['Skullwhite'], mirrors: ['Greygold', 'Porcelain'] };
  const at = (p) => { const r = roomOf(p.room); return [r.x + (p.at?.[0] || 0), r.z + (p.at?.[1] || 0)]; };
  for (const d of [CW, MC, OC, HM]) {
    assert.ok(d.packs.length >= 5 && d.packs.length <= 8, `${d.key}: ${d.packs.length} packs`);
    assert.ok(d.packs.some((p) => p.elite) && d.packs.some((p) => p.walk || p.tough), `${d.key}: an elite, and a patrol or a tougher pack`);
    for (const p of d.packs) {
      assert.ok(ALL_PACKS.includes(p) && p.key.startsWith(`${d.tag}_`), p.key);
      assert.ok(p.room !== d.rooms[0].id, `${p.key} is where you wake`);
      assert.ok(p.pal.some((n) => LIVERY[d.key].includes(n)), `${p.key}: not in the wing's livery`);
      // (His blue is never beside grey with gold.)
      assert.ok(!p.pal.includes('Royal') && !p.pal.includes('Abyssal'), `${p.key}: blue in a wing that isn't blue`);
      for (const n of p.pal) assert.ok(pal[n], `${p.key}: no palette ${n}`);
      for (const id of [...p.pick, ...(p.elite || [])]) assert.ok(roster[id] || roster[VARIANTS[id]?.src] || roster[VARIANTS[id]?.alt], `${p.key}: nothing called ${id}`);
      assert.ok(p.n + (p.more?.n || 0) <= 7, p.key);
      for (const q of d.packs) if (q !== p) { const [ax, az] = at(p), [bx, bz] = at(q); assert.ok(Math.hypot(ax - bx, az - bz) >= 24, `${p.key} and ${q.key} stand ${Math.hypot(ax - bx, az - bz).toFixed(0)} m apart`); }
    }
    for (const b of d.bosses) assert.ok(b.pal.every((n) => pal[n]), b.key);
  }
});

test('a secret way to a chest, chests off the way, and a lookout, in each', () => {
  const chests = castleChests(), vistas = castleVistas();
  for (const d of [CW, MC, OC, HM]) {
    assert.ok(d.chests.length >= 2 && d.chests.length <= 3, `${d.key}: ${d.chests.length} chests`);
    for (const c of d.chests) {
      const r = d.rooms.find((q) => q.id === c.room);
      assert.ok(r && inRoom(r, c.x, c.z, 0.8), `${d.key}:${c.id} isn't in ${c.room}`);
      const [x, z] = toWorld(c.x, c.z, d);
      assert.ok(caveRoom(x, z) > 0.6, `${d.key}:${c.id} is in the rock`);
      assert.ok(chests.some((q) => q.id === `${d.key}:${c.id}` && q.x === x && q.z === z && q.y === d.y + r.y + (c.up || 0)), `${d.key}:${c.id} isn't among the castle's chests`);
      assert.ok(c.loot >= 2 && c.loot <= 4);
    }
    // The secret way: a man's width, unlit, to a small room with a chest in it that no other way reaches.
    const secret = d.tunnels.filter((t) => t.w <= 1.3 && !t.dead);
    assert.equal(secret.length, 1, `${d.key}: one secret way`);
    const end = secret[0].pts.at(-1), room = d.rooms.find((r) => inRoom(r, end[0], end[1]));
    assert.ok(room && Math.max(room.hx, room.hz) <= 6, `${d.key}: its secret way ends in a closet`);
    assert.ok(d.chests.some((c) => c.room === room.id && c.loot >= 3), `${d.key}: nothing in ${room.id}`);
    assert.equal(d.tunnels.filter((t) => !t.dead && t !== secret[0] && [t.pts[0], t.pts.at(-1)].some(([x, z]) => inRoom(room, x, z))).length, 0, `${room.id} has another way in`);
    assert.ok(!d.packs.some((p) => p.room === room.id) && !d.bosses.some((b) => b.room === room.id));
    assert.equal(d.vistas.length, 1);
    const v = d.vistas[0], vr = d.rooms.find((q) => q.id === v.room);
    assert.ok(vr && inRoom(vr, v.x, v.z, 1) && v.name, `${d.key}: its lookout`);
    assert.ok(vistas.some((q) => q.id === v.id && q.delve === d.key), `${v.id} isn't among the castle's lookouts`);
  }
});

test('a way round as well as a way through, and no two ways out of a room straight across it', () => {
  for (const d of [CW, MC, OC, HM]) {
    // Which rooms join which: by a tunnel between them, or by overlapping.
    const ends = (t) => [t.pts[0], t.pts.at(-1)].map(([x, z]) => d.rooms.find((r) => inRoom(r, x, z)));
    // (Where a way leaves a room, and by which wall: the first of its points, from its end in the room, that's outside it.
    // Its ends are carried on into the rooms they open in: src/core/dungeon.js carryEnds.)
    const doorOf = (r, pts) => {
      const n = pts.findIndex(([x, z]) => !inRoom(r, x, z)), q = pts[n < 0 ? pts.length - 1 : n], p = n > 0 ? pts[n - 1] : [r.x, r.z];
      // (How far along from p, inside, to q, outside, each wall is met: the first of them is the wall it leaves by.)
      const cuts = [['e', (r.x + r.hx - p[0]) / (q[0] - p[0])], ['w', (r.x - r.hx - p[0]) / (q[0] - p[0])], ['s', (r.z + r.hz - p[1]) / (q[1] - p[1])], ['n', (r.z - r.hz - p[1]) / (q[1] - p[1])]].filter(([, t]) => t >= 0 && t <= 1 && Number.isFinite(t)).sort((a, b) => a[1] - b[1]);
      const [side, t] = cuts[0] || ['n', 1];
      return [side, [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]];
    };
    const joins = new Map(d.rooms.map((r) => [r.id, new Set()]));
    const doors = new Map(d.rooms.map((r) => [r.id, []]));
    for (const t of d.tunnels.filter((q) => !q.dead)) {
      const [a, b] = ends(t);
      assert.ok(a && b && a !== b, `${d.key}: a way from ${t.pts[0]} that joins nothing`);
      joins.get(a.id).add(b.id); joins.get(b.id).add(a.id);
      doors.get(a.id).push(doorOf(a, t.pts)); doors.get(b.id).push(doorOf(b, [...t.pts].reverse()));
    }
    for (const a of d.rooms) for (const b of d.rooms) if (a !== b && Math.abs(a.x - b.x) < a.hx + b.hx - 1.5 && Math.abs(a.z - b.z) < a.hz + b.hz - 1.5) {
      joins.get(a.id).add(b.id);
      // (Two rooms run into each other: the doorway is where they share floor, in whichever of a's walls that's nearest.)
      const c = [(Math.max(a.x - a.hx, b.x - b.hx) + Math.min(a.x + a.hx, b.x + b.hx)) / 2, (Math.max(a.z - a.hz, b.z - b.hz) + Math.min(a.z + a.hz, b.z + b.hz)) / 2];
      const side = [['e', a.x + a.hx - c[0]], ['w', c[0] - a.x + a.hx], ['s', a.z + a.hz - c[1]], ['n', c[1] - a.z + a.hz]].sort((p, q) => p[1] - q[1])[0][0];
      doors.get(a.id).push([side, c]);
    }
    // A way round: some room is on a ring of rooms (take one of its joins away and it's still reached).
    const reach = (from, cut) => { const seen = new Set([from]), q = [from]; while (q.length) { const c = q.shift(); for (const n of joins.get(c)) { if ((c === cut[0] && n === cut[1]) || (c === cut[1] && n === cut[0]) || seen.has(n)) continue; seen.add(n); q.push(n); } } return seen; };
    let ring = false;
    for (const [a, set] of joins) for (const b of set) if (reach(a, [a, b]).has(b)) ring = true;
    assert.ok(ring, `${d.key}: only one way through`);
    assert.equal(reach(d.rooms[0].id, [null, null]).size, d.rooms.length, `${d.key}: a room nothing joins`);
    // No two doorways of a room face each other square across it (the corner map draws no cross of his rooms).
    // (But a stair or a passage, which is two ends and nothing else.)
    for (const r of d.rooms.filter((q) => Math.min(q.hx, q.hz) > 5)) {
      const ds = doors.get(r.id);
      for (const [sa, a] of ds) for (const [sb, b] of ds) {
        if ((sa === 'e' && sb === 'w') || (sa === 'n' && sb === 's')) {
          const off = sa === 'e' ? Math.abs(a[1] - b[1]) : Math.abs(a[0] - b[0]);
          assert.ok(off >= 5.5, `${r.id}: two ways out ${off.toFixed(1)} m off straight across it`);
        }
      }
    }
  }
});

test("nothing of Tessariel's, nothing that rings, and no cross on any floor or wall of them", () => {
  // (No bell; no crossed mark on a floor; no grate, whose bars are crossed; and no pew, whose planks carry ironwork that's a
  // row of small crosses down a pew's length: his chapel has stalls of plain boards.)
  for (const k of ['bell', 'stagemark', 'grate', 'pew']) assert.ok(![CW, MC, OC, HM].some((d) => d.props.some((p) => p.kind === k)), `a ${k} in his castle`);
  for (const d of [CW, MC, OC, HM]) for (const p of d.props) assert.ok(PROP_KINDS.includes(p.kind), `${d.key}: no builder for a ${p.kind}`);
  for (const k of Object.keys(PROPS_B)) assert.ok(PROP_KINDS.includes(k), k);
  // (A wheel has three spokes or five: four is a cross in a ring.)
  for (const p of CW.props.filter((q) => q.kind === 'gear')) assert.ok(p.spokes === undefined || p.spokes === 5 || p.spokes === 3, 'a wheel of four spokes');
  assert.match(src('../src/core/delve-props-b.js'), /p\.spokes === 3 \? 3 : 5/);
  // (No mark on the floor that's a cross, and none of the stock moves that are: the threads, the wheel of fire.)
  const code = src('../src/sim/castle-fights-b.js');
  assert.doesNotMatch(code, /shape: 'cross'|MOVES\.threads|MOVES\.fireWheel/);
  const T = /Tessariel|\bbells?\b|\boath\b|\bseals?\b|\bholy\b|blessed|\bcross(es|ed)?\b|sunburst/i;
  const each = (o, f, path = '') => { if (typeof o === 'string') f(o, path); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) each(v, f, `${path}.${k}`); };
  for (const d of [CW, MC, OC, HM]) { each(d.warnings, (l, p) => assert.doesNotMatch(l, T, `${d.key}${p}`)); each(d.words, (l, p) => assert.doesNotMatch(l, T, `${d.key}${p}`)); each(d.names, (l, p) => assert.doesNotMatch(l, T, `${d.key}${p}`)); for (const r of d.rooms) assert.doesNotMatch(r.name, T, r.id); }
  each(QUESTS_B, (l, p) => assert.doesNotMatch(l, T, p));
  each(VARIANTS_B, (l, p) => assert.doesNotMatch(l, T, p));
  // (His chapel is his: his mark over its altar, his red on its flames, and no letter anywhere.)
  assert.ok(OC.props.some((p) => p.kind === 'altar') && OC.props.filter((p) => p.kind === 'mark').length >= 2 && OC.look.flame === 'blood:flame');
  // (The clock's faces carry marks, and the works no numerals: nothing in the builders writes one.)
  assert.doesNotMatch(src('../src/core/delve-props-b.js'), /p2_signs|numeral\(/);
});

test('auto-play has a way through each, every room on it, and knows every pack and boss', () => {
  for (const d of [CW, MC, OC, HM]) {
    const way = WAYS[d.key];
    assert.equal(way, d.auto.way);
    assert.equal(way[0], d.rooms[0].id); assert.equal(way.at(-1), roomOf(d.bosses.at(-1).room).id, `${d.key}: its last boss's room last`);
    for (const r of d.rooms) assert.ok(way.includes(r.id), `${r.id} isn't on the way`);
    for (const id of way) assert.ok(d.rooms.some((r) => r.id === id), `${id} is no room of ${d.key}`);
    for (const p of d.packs) assert.ok(KNOWN.has(p.key), p.key);
    for (const b of d.bosses) { assert.ok(KNOWN.has(b.key), b.key); for (const n of b.needs || []) assert.ok(way.indexOf(d.bosses.find((q) => q.key === n).room) < way.lastIndexOf(b.room), `${b.key} is walked to before ${n}`); }
    // (Pictures of it: each from a room of its own, looking at something in it.)
    assert.ok(d.shots.length >= 3 && d.shots.length <= 4);
    for (const [name, room] of d.shots) assert.ok(name.startsWith(`${d.tag}_`) && d.rooms.some((r) => r.id === room), name);
  }
});

test('four to eight quests to each and through it, from the household, at the levels of its delve', () => {
  const lv = new Map(LEVELS_B);
  assert.equal(LEVELS_B.length, Object.keys(RULES_B).length);
  const of = (d) => Object.entries(RULES_B).filter(([, r]) => r.steps.some((s) => [s.enter, s.kill, ...(s.visit || [])].some((k) => k === d.key || d.rooms.some((q) => `room:${q.id}` === k)) || d.bosses.some((b) => b.key === s.boss)));
  const seen = new Set();
  for (const d of [CW, MC, OC, HM]) {
    const mine = of(d);
    assert.ok(mine.length >= 4 && mine.length <= 8, `${d.key}: ${mine.length} quests`);
    for (const [id, r] of mine) {
      seen.add(id);
      assert.equal(RULES[id], r, id);
      const q = QUESTS_B[id];
      assert.ok(q && /^ph_(librarian|wynn|jory|ondine|pip)$/.test(q.giver), `${id}: ${q?.giver}`);
      assert.equal(q.needs, r.needs, `${id}: needs`);
      assert.ok(RULES[r.needs], `${id} needs ${r.needs}`);
      assert.ok(lv.get(id) >= d.level && lv.get(id) <= d.level + 7, `${id}: level ${lv.get(id)}`);
      if (RULES_B[r.needs]) assert.ok(lv.get(r.needs) <= lv.get(id), `${id} comes before what it needs`);
      assert.ok(r.gold > 0 && r.xp >= 70000, id);
    }
    // Each boss has its quest; and the last one's is the last of them.
    for (const b of d.bosses) assert.ok(mine.some(([, r]) => r.steps.some((s) => s.boss === b.key)), `${b.key}: no quest`);
    const last = mine.find(([, r]) => r.steps.some((s) => s.boss === d.last));
    assert.equal(lv.get(last[0]), Math.max(...mine.map(([id]) => lv.get(id))), `${d.key}: its last boss's quest is its last`);
    assert.ok(last[1].item && last[1].named, `${last[0]}: a named thing for it`);
  }
  assert.equal(seen.size, Object.keys(RULES_B).length, 'a quest that goes to none of the four');
  const seeds = Object.values(RULES_B).filter((r) => r.seed).map((r) => r.seed);
  assert.equal(new Set(seeds).size, seeds.length, 'two named things from one seed');
});

test('nothing you can see through stands so close to a wall that the wall behind it is left out', () => {
  // (The walls leave alone what a solid thing covers, within 0.9 m of it: src/core/delve-build.js outline. Bars and panes cover nothing.)
  for (const d of [CW, MC, OC, HM]) for (const p of d.props.filter((q) => q.solid && ['beastcage', 'pane'].includes(q.kind))) for (const r of d.rooms) {
    if (!inRoom(r, p.x, p.z)) continue;
    const gap = Math.min(r.hx - Math.abs(p.x - r.x) - p.hx, r.hz - Math.abs(p.z - r.z) - p.hz);
    assert.ok(gap >= 1, `${d.key}: a ${p.kind} at ${p.x}, ${p.z} is ${gap.toFixed(2)} m off ${r.id}'s wall`);
  }
});

test('the third round: no star in a ring, no lens on a rod, no square hands; and three fights that are not a lesson told elsewhere', () => {
  // Nothing drawn inside a ring on any floor; what hangs over the Striking Floor is a weight over its block.
  for (const d of [CW, MC, OC, HM]) assert.ok(!d.props.some((p) => p.kind === 'circle'), `${d.key}: a star in a ring`);
  const strike = roomOf('cw_strike');
  assert.ok(!CW.props.some((p) => p.kind === 'pendulum' && inRoom(strike, p.x, p.z)), 'a lens on a rod over the Striking Floor');
  assert.equal(CW.props.filter((p) => p.kind === 'dropweight' && inRoom(strike, p.x, p.z)).length, HAMMER_ROWS.length * 3);
  const code = src('../src/core/delve-props-b.js');
  assert.match(code, /Never square to one another/); assert.doesNotMatch(code, /bar\(K, 'iron', F\(0, cy, 0\), F\(0, cy, o/);
  for (const d of [CW, MC, OC, HM]) for (const p of d.props.filter((q) => q.kind === 'gear')) assert.ok(p.spokes === undefined || p.spokes === 3 || p.spokes === 5, 'a wheel of four spokes');
  // Each dark room has fire hung in it on the thing it's for.
  for (const id of ['cw_shaft', 'cw_strike', 'cw_pend', 'mc_rows', 'mc_pit', 'mc_ring', 'oc_crypt', 'hm_maze', 'hm_work']) { const r = roomOf(id); assert.ok(r.delve.props.filter((p) => p.kind === 'basket' && inRoom(r, p.x, p.z)).length >= 2, `${id}: no light of its own`); }
  // The Regulator: the shadow goes across the hall and back; out of it you're cut, in it you aren't; you're sent along with it.
  {
    const hurt = [], marks = [], warned = [], [rx, , rz] = roomSpot('cw_pend');
    const P = { marks, mark: (o) => { marks.push(o); return o; }, hurt: (b) => hurt.push(b) };
    const inIt = { x: 0, z: 0, y: 0 }, out = { x: rx + 13, z: rz + 15, y: 0 };
    const W = { delve: CW, sim: { perils: P, casting: { burst() {} }, world: { inside: () => false } }, bodies: () => [inIt, out], warn: (w) => warned.push(w), tank: () => null, clearGround() {} };
    const m = { hp: 1000, maxHp: 1000, state: 0, opts: { damage: 100 }, perform: () => true, x: rx, z: rz, y: 0 }, f = { boss: CW.bosses[1], runT: 40, swingT: -3 };
    const spec = FIGHTS_B.regulator;
    spec.step(W, f, [m], 0.1);
    assert.ok(f.run && warned.includes(WARN.reg_run), 'he lets the clock run');
    const xs = [];
    for (let t = 0; t < 2.4 + SHADOW.secs + 0.5 && f.run; t += 0.1) { const o = spec.order(W, f, inIt, [m]); assert.ok(o?.urgent && o.to); inIt.x = f.run.mk.x; inIt.z = f.run.mk.z; xs.push(f.run.mk.x - CW.x); spec.step(W, f, [m], 0.1); }
    assert.equal(f.run, null); assert.ok(warned.includes(WARN.reg_go));
    assert.ok(Math.max(...xs) - Math.min(...xs) > SHADOW.reach * 1.8, 'the shadow crosses the hall and comes back');
    assert.ok(hurt.includes(out) && !hurt.includes(inIt), 'cut out of the shadow, not in it');
    const pend = roomOf('cw_pend');
    assert.ok(SHADOW.reach + SHADOW.r < pend.hx - 1, 'the shadow keeps to the hall');
    assert.ok(TAU_SPEED(SHADOW) < 6.2, 'no faster than you can run');
    assert.doesNotMatch(CW.warnings.reg_open, /STAND STILL/);
  }
  // The Matron: under the great cage is out of her shriek; behind a tree is not.
  {
    const hurt = [], warned = [], [cx, cz] = [MC.x + GREAT_CAGE[0], MC.z + GREAT_CAGE[1]];
    const under = { x: cx + 1, z: cz, y: 0 }, tree = { x: MC.x + AVIARY_TREES[0][0] - 3, z: MC.z + AVIARY_TREES[0][1], y: 0 };
    const W = { delve: MC, sim: { perils: { marks: [], mark: (o) => o, hurt: (b) => hurt.push(b) }, casting: { burst() {} }, world: { inside: () => false } }, bodies: () => [under, tree], warn: (w) => warned.push(w), tank: () => null, clearGround() {} };
    const m = { hp: 1000, maxHp: 1000, state: 0, opts: { damage: 100 }, perform: () => true, x: cx + 8, z: cz, y: 0 }, f = { boss: MC.bosses[1], shriekT: 40 };
    const spec = FIGHTS_B.matron;
    spec.step(W, f, [m], 0.1);
    assert.ok(f.shriek && warned.includes(WARN.mat_shriek));
    const o = spec.order(W, f, tree, [m]);
    assert.ok(o.urgent && Math.hypot(o.to[0] - cx, o.to[1] - cz) < GREAT_CAGE[2] - 0.5, 'sent under the cage');
    for (let t = 0; t < 4.2; t += 0.1) spec.step(W, f, [m], 0.1);
    assert.equal(f.shriek, null); assert.deepEqual(hurt, [tree]);
    assert.ok(MC.props.some((p) => p.kind === 'greatcage' && p.x === GREAT_CAGE[0] && p.z === GREAT_CAGE[1] && p.r === GREAT_CAGE[2]), 'the cage hangs where the rule says');
    assert.match(MC.warnings.mat_open, /GREAT CAGE/);
  }
  // The Bone Prior's named: sent running, and it's standing that costs them.
  {
    const spec = FIGHTS_B.boneprior, b = { x: OC.x + 18, z: OC.z - 110, y: 0, dead: false };
    const f = { kneel: { on: b, t: 2, tick: 0, at: [b.x, b.z], goal: 0 } };
    const o = spec.order({ delve: OC }, f, b);
    assert.ok(o.urgent && o.to && !o.still);
    assert.equal(spec.order({ delve: OC }, f, { x: 0, z: 0 }), null);
    assert.match(OC.warnings.pri_kneel, /RUN/); assert.doesNotMatch(OC.warnings.pri_open, /KNEELS/);
  }
});
const TAU_SPEED = (S) => Math.PI * 2 * S.reach / S.secs;
