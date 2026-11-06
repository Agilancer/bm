// Rolls what the game rolls, many times over, and holds it to the rules. No browser needed:
//
//     node tools/items/check.mjs
import assert from 'node:assert/strict';
import { BASES, GEMS, MAX_SOCKETS, RARITIES, ROBES, ROBE_PALETTES, SHIELDS, SKULLS, gearTotals, hands, linesOf, makeRng, nameOf, rollChest, rollGem, rollLoot, rollRobe, rollShield, rollSkull, rollWeapon, setFind } from '../../src/items/items.js';
import { Pack, sizeOf } from '../../src/items/pack.js';
import { levelPerks, stepXp, xpFor, XP_OF } from '../../src/items/levels.js';
import { SPELLS } from '../../src/sim/spells.js';

const rng = makeRng(7);
const seen = new Set();

// Nothing with an edge, and no plate, is ever rolled.
for (let i = 0; i < 4000; i++) {
  const w = rollWeapon(rng);
  assert.equal(hands(w.base), 3, `${w.base} is a staff`);
  assert.ok(w.sockets <= MAX_SOCKETS);
  for (const k of [0, 1, 2, 3, 4, 5, 6, 7, 8]) for (const it of rollLoot(rng, k)) {
    seen.add(it.type);
    assert.notEqual(it.type, 'armor');
    if (it.type === 'weapon') assert.equal(hands(it.base), 3);
    if (it.type === 'gold' || it.type === 'spell') continue;
    assert.ok(nameOf(it) && linesOf(it).length, `${it.type} reads`);
    if (it.type !== 'gem') assert.ok(sizeOf(it).w > 0);
  }
  for (const t of [0, 1, 2]) for (const it of rollChest(rng, t)) assert.notEqual(it.type, 'armor');
}
for (const t of ['weapon', 'skull', 'robe', 'gem', 'shield', 'spell', 'gold']) assert.ok(seen.has(t), `${t} drops`);

// A skull comes at all five rarities, a robe's rarity keeps its palette's floor.
setFind(1);
const rarities = new Set();
for (let i = 0; i < 6000; i++) {
  const s = rollSkull(rng);
  rarities.add(s.rarity);
  assert.ok(SKULLS[s.base]);
  const r = rollRobe(rng);
  assert.ok(ROBES[r.base] && r.rarity >= ROBE_PALETTES[ROBES[r.base].palette].floor && r.armor > 0);
}
assert.equal(rarities.size, RARITIES.length);

// Gems do something, on all three things they go in; with a skull in hand the shield's count for nothing.
const pack = new Pack();
pack.load(null);
assert.equal(hands(pack.slots.main.base), 3);
assert.ok(pack.slots.off);
for (const kind of Object.keys(GEMS)) {
  const g = rollGem(rng, { kind, grade: 2 });
  const t = rollWeapon(rng, { base: 'crystal_staff', rarity: 0, sockets: 1 }); t.affixes = [];
  const before = gearTotals({ main: t });
  assert.ok(pack.socket(t, g));
  assert.notDeepEqual(gearTotals({ main: t }), before, `${kind} does something`);
  assert.ok(pack.socket(rollSkull(rng, { rarity: 0, sockets: 1 }), g));
  const sh = rollShield(rng, { base: 'kite_cross', sockets: 1 });
  assert.ok(pack.socket(sh, g));
  assert.notDeepEqual(gearTotals({ off: sh }), gearTotals({}), 'a shield alone counts');
  const bare = rollSkull(rng, { rarity: 0, sockets: 0 }); bare.affixes = [];
  assert.deepEqual(gearTotals({ off: sh, skull: bare }), gearTotals({ skull: bare }), 'a shield under a skull is only for riding');
}

// An old save's swords and plate don't come back, and he's left with a staff.
const old = new Pack();
old.load({ gold: 5, kite: true, slots: { main: { type: 'weapon', base: 'ringed_sword', rarity: 0, dmg: [1, 2], affixes: [], sockets: 0, gems: [] }, hands: { type: 'armor', base: 'knight_hands', rarity: 0, armor: 1, affixes: [] } }, entries: [{ item: { type: 'armor', base: 'knight_head', rarity: 0, armor: 1, affixes: [] }, x: 0, y: 0 }] });
assert.equal(hands(old.slots.main.base), 3);
assert.equal(old.entries.length, 0);
assert.equal(old.slots.hands, undefined);

// Levels: each costs more than the last, and every perk goes up.
for (let l = 2; l < 50; l++) assert.ok(xpFor(l + 1) - xpFor(l) >= xpFor(l) - xpFor(l - 1));
const p = { xp: 0, level: 1 };
assert.ok(stepXp(p, XP_OF[0] * 3) && p.level > 1);
assert.ok(levelPerks(5).power > levelPerks(4).power && levelPerks(5).life > 0 && levelPerks(5).mana > 0);

assert.equal(SPELLS.length, 20, 'all twenty spells');
assert.ok(BASES.frost_sword, 'the swords are still on file');
assert.ok(SHIELDS.kite_cross);
console.log('items check passed. xp to level 5:', xpFor(5), ', 10:', xpFor(10), ', 20:', xpFor(20));
