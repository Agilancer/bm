// Castle Velscour's wards (src/core/delve-castle.js): the Lower Ward, its two ways in (the world's portal and the Aqueduct's
// gate from the High Conduits), its rooms each a floor of the delve's own, the princess's quests into it and after its
// Gate Captain, and the Gate Captain himself weaker for each wing you've emptied first (src/sim/castle-fights.js). And the
// Middle Ward, up through the Lower's gate once the Captain's dead: no arch of its own, the Feast and his servers, the
// Librarian's household and their quests, and auto-play's way up to it.
//   node --test tests/castle.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, DELVES, caveRoom, delveByKey, roomSpot } from '../src/core/dungeon.js';
import { CASTLE, GATE_SLOTS, HALL_ROWS } from '../src/core/delve-castle.js';
import { CASTLE_FIGHTS } from '../src/sim/castle-fights.js';
import { RULES } from '../src/folk/quests.js';
import { PHOBOS_LEVELS } from '../src/folk/phobos-quests.js';

const LW = delveByKey('lowerward'), MW = delveByKey('middleward');

test('the Lower Ward: a castle ward gone into alone, its gate to the High Conduits going both ways', () => {
  assert.deepEqual(CASTLE.map((d) => d.key), ['lowerward', 'middleward']);
  assert.equal(DELVES.includes(LW), true);
  assert.equal(LW.castle, true);
  assert.equal(LW.party, false);
  assert.ok(LW.portal, 'a way in from the world');
  for (const [n, l] of LW.links.entries()) assert.equal(delveByKey(l.to).links[l.n].to, 'lowerward', `its gate ${n} comes back`);
  for (const r of LW.rooms) { const [x, , z] = roomSpot(r.id); assert.ok(caveRoom(x, z) > 1, `${r.id}: its middle is in the open`); }
});

test("the Gate Captain: in his yard, the gate's slots across it, worth a champion's loot", () => {
  const b = BOSSES.find((q) => q.key === 'gatecaptain');
  assert.equal(b.delve, 'lowerward');
  assert.equal(b.room, 'cl_yard');
  assert.equal(b.loot, 8);
  const yard = LW.rooms.find((r) => r.id === 'cl_yard');
  for (const z of GATE_SLOTS) assert.ok(Math.abs(z - yard.z) < yard.hz - 4, `slot ${z} inside the yard`);
});

test("each wing you've emptied first leaves him less", () => {
  const spec = CASTLE_FIGHTS.gatecaptain;
  const fight = (cleared) => {
    const f = {}, warned = [];
    const W = { sim: { tripo: { lairs: cleared.map((key) => ({ key, state: 'cleared' })) } }, adds: () => [], warn: (w) => warned.push(w) };
    spec.step(W, f, [{ shrug: 1 }]);
    return { f, W, deck: spec.deck(f), adds: spec.adds.map((a) => (typeof a.n === 'function' ? a.n(W, f) : a.n)), warned };
  };
  const all = fight([]);
  assert.deepEqual(all.deck, ['cleave', 'charge', 'bash', 'gate', 'volley']);
  assert.deepEqual(all.adds, [3, 4]);
  assert.equal(all.warned.length, 0);
  assert.deepEqual(fight(['cl_bunks']).adds, [2, 2]);
  assert.equal(fight(['cl_armoury']).deck.includes('volley'), false);
  assert.equal(fight(['cl_oub']).deck.includes('gate'), false);
  assert.equal(fight(['cl_oub']).warned.length, 1);
  assert.deepEqual(fight(['cl_bunks', 'cl_armoury', 'cl_oub']).deck, ['cleave', 'charge', 'bash']);
});

test("the princess's two quests: up the Aqueduct into the ward, then the Gate Captain", () => {
  assert.deepEqual(RULES.up_the_aqueduct.steps[0], { enter: 'lowerward' });
  assert.equal(RULES.the_gate_captain.needs, 'up_the_aqueduct');
  assert.equal(RULES.the_gate_captain.steps[0].boss, 'gatecaptain');
  const lv = new Map(PHOBOS_LEVELS);
  assert.ok(lv.get('up_the_aqueduct') >= LW.level && lv.get('the_gate_captain') > lv.get('up_the_aqueduct'));
});

test("the Middle Ward: up through the Lower Ward's gate, shut till the Gate Captain's dead, and no arch of its own", async () => {
  const { Warrens } = await import('../src/sim/dungeon.js');
  assert.equal(MW.castle, true);
  assert.equal(MW.party, false);
  assert.equal(MW.within, 'lowerward');
  assert.equal(MW.portal, LW.portal, "its portal is the Lower Ward's: where its Postern lets you out");
  const up = LW.links.find((l) => l.to === 'middleward'), down = MW.links.find((l) => l.to === 'lowerward');
  assert.equal(up.shut, 'gatecaptain');
  assert.equal(MW.links[up.n], down);
  assert.equal(LW.links[down.n], up);
  assert.equal(down.shut, undefined, 'the way back down is never shut');
  // (Shut till he's died, now or ever.)
  const W = Object.create(Warrens.prototype);
  W.down = new Set(); W.ever = new Set();
  assert.equal(W.open(up), false);
  W.ever.add('gatecaptain');
  assert.equal(W.open(up), true);
  W.ever.clear(); W.down.add('gatecaptain');
  assert.equal(W.open(up), true);
  assert.equal(W.open(down), true);
  for (const r of MW.rooms) { const [x, , z] = roomSpot(r.id); assert.ok(caveRoom(x, z) > 1, `${r.id}: its middle is in the open`); }
});

test("the Feast That Walks: in the Great Hall, his servers fed to him, and a lane of the hall always clear", () => {
  const b = BOSSES.find((q) => q.key === 'feast');
  assert.equal(b.delve, 'middleward');
  assert.equal(b.room, 'cm_hall');
  const hall = MW.rooms.find((r) => r.id === 'cm_hall');
  for (const z of HALL_ROWS) assert.ok(Math.abs(z - hall.z) < hall.hz - 3, `row ${z} inside the hall`);
  const spec = CASTLE_FIGHTS.feast;
  assert.ok(spec.adds.every((a) => a.setUp && a.from === 'doors'), 'his servers come through the doors by the screens');
  assert.ok(MW.tunnels.filter((t) => t.dead && t.door === 'cm_hall').length >= 2);
  // (The tables down their two rows, or the aisle between: never all three.)
  const marks = (move) => { const out = []; const P = { mark: (q) => out.push(q) }; spec.moves[move].go({}, { boss: b }, { x: 0, z: 0, opts: { damage: 100 } }, { x: 0, z: 0 }, P); return out; };
  const rows = (ms) => ms.map((q) => Math.round(q.z - (MW.z + hall.z) + hall.z));
  assert.deepEqual(rows(marks('tables')), [HALL_ROWS[0], HALL_ROWS[2]]);
  assert.deepEqual(rows(marks('aisle')), [HALL_ROWS[1]]);
});

test("the castle's own eight: in its wards, clear of the rock, each with his own two hundred lines and more", async () => {
  const { POSTED } = await import('../src/folk/people.js');
  const { LINES } = await import('../src/folk/lines/phobos.js');
  const own = POSTED.filter((p) => p.id.startsWith('cs_'));
  assert.equal(own.length, 8);
  for (const p of own) {
    assert.ok(p.late && (p.delve === 'lowerward' || p.delve === 'middleward'), p.id);
    assert.ok(caveRoom(p.post[0], p.post[1]) > 0.4, `${p.id} stands clear`);
    const n = (v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => k !== 'topics').reduce((s, [, x]) => s + n(x), 0) : 0);
    assert.ok(n(LINES[p.id]) >= 200, `${p.id}: ${n(LINES[p.id])} lines`);
  }
});

test("the Librarian's household: in his rooms down the Middle Ward, with work for you, none of it showing whose they are", async () => {
  const { POSTED } = await import('../src/folk/people.js');
  const { LINES } = await import('../src/folk/lines/phobos-hubs.js');
  // (The household: not the castle's own, cs_, who serve Him in its wards: below.)
  const house = POSTED.filter((p) => p.delve === 'middleward' && !p.id.startsWith('cs_'));
  assert.deepEqual(house.map((p) => p.id).sort(), ['ph_jory', 'ph_librarian', 'ph_ondine', 'ph_pip', 'ph_wynn']);
  const rooms = MW.rooms.find((r) => r.id === 'cm_rooms');
  for (const p of house) {
    assert.ok(p.late, `${p.id}: loaded late, as the crowd is`);
    const [x, z] = p.post;
    assert.ok(Math.abs(x - MW.x - rooms.x) < rooms.hx - 1 && Math.abs(z - MW.z - rooms.z) < rooms.hz - 1, `${p.id} stands in the Librarian's rooms`);
    assert.ok(caveRoom(x, z) > 0.4, `${p.id} stands clear`);
    assert.ok(LINES[p.id]?.first?.length, `${p.id} has words`);
  }
  // (No name of hers, no bells, no oath: the V and T rule.)
  const T = /Tessariel|\bbells?\b|\boath\b|\bseal\b|holy|blessed/i;
  const each = (o) => (typeof o === 'string' ? assert.doesNotMatch(o, T) : o && typeof o === 'object' && Object.values(o).forEach(each));
  for (const p of house) each(LINES[p.id]);
  const lv = new Map(PHOBOS_LEVELS);
  for (const id of ['the_librarians_letters', 'the_household', 'dust_in_the_stacks', 'wynns_map', 'the_quiet_watchs_steel', 'the_hornwings', 'the_feast_that_walks']) {
    assert.ok(RULES[id], id);
    assert.ok(lv.get(id) >= MW.level && lv.get(id) <= 95, `${id}: level ${lv.get(id)}`);
  }
  assert.deepEqual(RULES.the_librarians_letters.steps[0], { enter: 'middleward' });
  assert.equal(RULES.the_feast_that_walks.steps[0].boss, 'feast');
});

test("auto-play goes up to the Middle Ward through the Lower Ward's gate, and out again", async () => {
  const { delveWay, WAYS } = await import('../src/ui/autowarrens.js');
  const shut = () => false, open = () => true;
  assert.deepEqual(delveWay(null, MW), [MW.portal.x, MW.portal.z], 'in at the castle gate');
  const up = LW.links.find((l) => l.to === 'middleward');
  assert.deepEqual(delveWay(LW, MW, open), [LW.x + up.x, LW.z + up.z]);
  assert.equal(delveWay(LW, MW, shut), null, 'not while the gate is down');
  const hc = delveByKey('highconduits'), aq = hc.links.find((l) => l.to === 'lowerward');
  assert.deepEqual(delveWay(hc, MW, open), [hc.x + aq.x, hc.z + aq.z], 'from the Garden, up the Aqueduct first');
  const down = MW.links.find((l) => l.to === 'lowerward');
  assert.deepEqual(delveWay(MW, hc, open), [MW.x + down.x, MW.z + down.z], 'and back down by the Lower Ward');
  assert.equal(WAYS.middleward.at(-1), 'cm_hall', 'the Feast last');
});
