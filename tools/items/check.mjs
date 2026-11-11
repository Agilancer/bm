// Rolls what the game rolls, many times over, and holds it to the rules. No browser needed:
//
//     node tools/items/check.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BASES, GEMS, MAX_SOCKETS, RARITIES, ROBES, ROBE_PALETTES, ROBE_SETS, SET_PARTS, SHIELDS, SKULLS, gearTotals, hands, linesOf, makeRng, nameOf, rollChest, rollGem, rollLoot, rollRobe, rollShield, rollSkull, rollWeapon, setBonuses, setFind, setsWorn } from '../../src/items/items.js';
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
  for (const k of [0, 1, 2, 3, 4, 5, 6, 7, 8, 20, 21]) for (const it of rollLoot(rng, k)) {
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

// A boss's hoard is always worth the fight (src/sim/dungeon.js): a rare staff or better and two more pieces as good from
// any boss of the Warrens; from their dragon an epic staff, skull and shield, and one thing legendary.
for (let i = 0; i < 500; i++) {
  const h = rollLoot(rng, 20), gear = h.filter((it) => ['weapon', 'skull', 'shield', 'robe'].includes(it.type));
  assert.ok(gear.length >= 3 && gear.every((it) => it.rarity >= 2), 'a boss leaves three rare things or better');
  assert.ok(h.some((it) => it.type === 'weapon') && h.some((it) => it.type === 'gem') && h.some((it) => it.type === 'spell'));
  assert.ok(h.find((it) => it.type === 'gold').amount >= 150);
  const d = rollLoot(rng, 21), best = d.filter((it) => ['weapon', 'skull', 'shield', 'robe'].includes(it.type));
  assert.ok(best.length >= 5 && best.filter((it) => it.rarity >= 3).length >= 4, 'the dragon leaves four epic things or better');
  assert.ok(best.some((it) => it.rarity >= 4), 'and one of them legendary');
  assert.ok(d.find((it) => it.type === 'gold').amount >= 400 && d.filter((it) => it.type === 'spell').length === 2);
}

// Every shield anyone may carry turns up, kites and towers, at all five rarities, from every chest and the fallen of every
// kind that drops things, with its model and its icon on file. V's and T's never do. A tower wards more than a kite.
{
  const r2 = makeRng(11), bases = new Set(), rar = new Set(), chests = new Set(), fallen = new Set();
  for (let i = 0; i < 40000; i++) {
    const s = rollShield(r2);
    bases.add(s.base); rar.add(s.rarity);
    assert.ok(!SHIELDS[s.base].side && s.armor > 0 && linesOf(s)[1].text.endsWith(`${SHIELDS[s.base].kind || 'kite'} shield`));
  }
  const carried = Object.keys(SHIELDS).filter((b) => !SHIELDS[b].side);
  assert.deepEqual([...bases].sort(), carried.sort(), 'every shield rolls');
  assert.deepEqual([...rar].sort(), [0, 1, 2, 3, 4], 'shields at all five rarities');
  assert.equal(carried.filter((b) => SHIELDS[b].kind === 'tower').length, 20, 'the twenty towers');
  for (let i = 0; i < 20000; i++) {
    for (const t of [0, 1, 2]) for (const it of rollChest(r2, t)) if (it.type === 'shield') chests.add(t);
    for (const k of [0, 1, 5, 7, 8, 9]) for (const it of rollLoot(r2, k)) if (it.type === 'shield') fallen.add(k);
  }
  assert.deepEqual([...chests].sort(), [0, 1, 2], 'shields in every chest');
  assert.deepEqual([...fallen].sort(), [0, 1, 5, 7, 8, 9], 'shields from the fallen');
  const ward = (base) => { let t = 0; for (let i = 0; i < 2000; i++) t += rollShield(r2, { base }).armor; return t / 2000; };
  assert.ok(ward('tower_iron') > ward('kite_chevron') * 1.15, 'a tower wards more');
  for (const b of Object.keys(SHIELDS)) {
    assert.ok(existsSync(new URL(`../../assets/game/items/${b}.glb`, import.meta.url)), `${b}.glb`);
    assert.ok(existsSync(new URL(`../../assets/game/items/icons/${b}.webp`, import.meta.url)), `${b}.webp`);
  }
  console.log(`shields: ${carried.length} roll, ${Object.keys(SHIELDS).length - carried.length} never do`);
}

// A skull comes at all five rarities, a robe's rarity keeps its palette's floor.
setFind(1);
const rarities = new Set(), robeRarities = new Set();
for (let i = 0; i < 6000; i++) {
  const s = rollSkull(rng);
  rarities.add(s.rarity);
  assert.ok(SKULLS[s.base]);
  // A robe is a piece of one of the sets of gear: of the set's palette, and as rare as the set.
  const r = rollRobe(rng);
  assert.ok(ROBES[r.base] && r.armor > 0 && ROBE_SETS[r.set] && ROBE_SETS[r.set].rarity === r.rarity && ROBE_SETS[r.set].palette === ROBES[r.base].palette);
  robeRarities.add(r.rarity);
}
assert.equal(rarities.size, RARITIES.length);
assert.equal(robeRarities.size, RARITIES.length, 'robes come at every rarity');
// A plain robe keeps its palette's floor; one asked for by its base comes as a set of that palette, where there's one that rare.
for (const b of Object.keys(ROBES)) {
  const plain = rollRobe(rng, { base: b, plain: true });
  assert.ok(!plain.set && plain.rarity >= ROBE_PALETTES[ROBES[b].palette].floor);
  const r = rollRobe(rng, { base: b, rarity: 2 });
  assert.ok(r.base === b && (!r.set || ROBE_SETS[r.set].palette === ROBES[b].palette));
}
// Every set: five pieces to roll, three bonuses on three stats, and they count when worn.
for (const id of Object.keys(ROBE_SETS)) {
  const slots = {};
  for (const slot of SET_PARTS) { const it = rollRobe(rng, { set: id, slot }); assert.ok(it.set === id && ROBES[it.base].slot === slot && it.rarity === ROBE_SETS[id].rarity); slots[slot] = it; }
  const bonus = setBonuses(id);
  assert.deepEqual(bonus.map((b) => b.need), [2, 3, 5]);
  assert.equal(new Set(bonus.map((b) => b.stat)).size, 3);
  assert.equal(setsWorn(slots)[id], 5);
  const bare = gearTotals(Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { ...v, set: undefined }]))), full = gearTotals(slots);
  for (const b of bonus) assert.ok(Math.abs(full[b.stat] - bare[b.stat] - b.value) < 1e-9, `${id}: ${b.stat}`);
  const two = gearTotals({ head: slots.head, feet: slots.feet });
  assert.ok(Math.abs(two[bonus[0].stat] - gearTotals({ head: { ...slots.head, set: undefined }, feet: { ...slots.feet, set: undefined } })[bonus[0].stat] - bonus[0].value) < 1e-9);
  assert.ok(linesOf(slots.head, slots).some((l) => l.text.includes('5 of 5 worn')));
}

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
assert.equal(old.slots.main.rarity, 0);   // (a common one, as a new game's)
assert.equal(old.entries.length, 0);      // (and nothing put in the pack: no test kit)
assert.equal(old.slots.hands, undefined);

// Levels: each costs more than the last, and every perk goes up.
for (let l = 2; l < 50; l++) assert.ok(xpFor(l + 1) - xpFor(l) >= xpFor(l) - xpFor(l - 1));
const p = { xp: 0, level: 1 };
assert.ok(stepXp(p, XP_OF[0] * 3) && p.level > 1);
assert.ok(levelPerks(5).power > levelPerks(4).power && levelPerks(5).life > 0 && levelPerks(5).mana > 0);

assert.equal(SPELLS.length, 60, 'all sixty spells');
assert.deepEqual(SPELLS.slice(0, 20).map((s) => s.key), ['firebolt', 'frost', 'lightning', 'mend', 'wisp', 'wallfire', 'missiles', 'arcaneblast', 'firebeam', 'chain', 'nova', 'meteor', 'blizzard', 'drain', 'blink', 'lance', 'well', 'plague', 'blades', 'spikes'],
  "Bellmourn's twenty keep their places: a save's bar and a scroll name a spell by its place");
assert.ok(BASES.frost_sword, 'the swords are still on file');
assert.ok(SHIELDS.kite_cross);
console.log('items check passed. xp to level 5:', xpFor(5), ', 10:', xpFor(10), ', 20:', xpFor(20));
