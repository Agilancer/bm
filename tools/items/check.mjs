// Rolls what the game rolls, many times over, and holds it to the rules. No browser needed:
//
//     node tools/items/check.mjs
import assert from 'node:assert/strict';
import { BASES, GEMS, MAX_SOCKETS, RARITIES, SHIELDS, linesOf, makeRng, nameOf, rollGem, rollLoot, rollWeapon, statsOf, weaponIndex } from '../../src/items/items.js';
import { PACK_H, PACK_W, Pack, sizeOf } from '../../src/items/pack.js';
import { WEAPONS } from '../../src/core/layout.js';

const N = 200000;
const rng = makeRng(20261104);

// ---- the weapons -------------------------------------------------------------------------------
const byRarity = RARITIES.map(() => 0);
const sockets = RARITIES.map(() => [0, 0, 0, 0, 0]);
const bases = {};
const nameSet = new Set();
for (let i = 0; i < N; i++) {
  const w = rollWeapon(rng);
  byRarity[w.rarity]++;
  sockets[w.rarity][w.sockets]++;
  bases[w.base] = (bases[w.base] || 0) + 1;
  assert.ok(w.sockets >= 0 && w.sockets <= MAX_SOCKETS, 'sockets in range');
  if (w.sockets === 4) assert.equal(RARITIES[w.rarity].name, 'Peerless', 'four sockets only on the best of the best');
  assert.ok(w.dmg[0] > 0 && w.dmg[1] >= w.dmg[0], 'damage in order');
  assert.ok(weaponIndex(w.base) > 0, 'a base the threads can name');
  const seen = new Set(w.affixes.map((a) => a.stat));
  assert.equal(seen.size, w.affixes.length, 'no stat twice');
  if (BASES[w.base].grade === 'high') assert.ok(w.rarity >= 2, 'high swords only come rare or better');
  if (i < 2000) { nameSet.add(nameOf(w)); for (const l of linesOf(w)) assert.ok(!/undefined|NaN/.test(l.text), l.text); }
}
assert.ok(!bases.greatsword, 'the old greatsword is not a drop');
for (const r of RARITIES.keys()) console.log(`${RARITIES[r].name.padEnd(9)} ${(byRarity[r] / N * 100).toFixed(2).padStart(6)}%   sockets 0..4: ${sockets[r].join(' ')}`);
console.log(`four sockets: ${sockets[3][4]} of ${N} (${(sockets[3][4] / N * 100).toFixed(3)}%). ${Object.keys(bases).length} bases dropped, e.g. "${[...nameSet].slice(-3).join('", "')}"`);
assert.equal(Object.keys(bases).length, 16, 'all twelve new swords and the four staffs can drop');
assert.equal(WEAPONS.filter(Boolean).length, 17);

// ---- socketing ------------------------------------------------------------------------------------
const pack = new Pack();
const w = rollWeapon(rng, { base: 'frost_sword', rarity: 3, sockets: 4 });
const before = statsOf(w);
for (let i = 0; i < 4; i++) assert.ok(pack.socket(w, rollGem(rng, { kind: 'ruby', grade: 2 })), 'room for four');
assert.equal(pack.socket(w, rollGem(rng)), false, 'no fifth');
const after = statsOf(w);
assert.ok(after.min > before.min && after.max > before.max, 'rubies raise damage');
assert.equal(pack.socket(rollWeapon(rng, { base: 'ringed_sword', rarity: 0, sockets: 0 }), rollGem(rng)), false, 'none without a socket');
for (const kind of Object.keys(GEMS)) {
  const a = rollWeapon(rng, { base: 'ringed_sword', rarity: 0, sockets: 1 }), s0 = statsOf(a);
  pack.socket(a, rollGem(rng, { kind, grade: 1 }));
  assert.notDeepEqual(statsOf(a), s0, `${kind} does something`);
}

// ---- loot ------------------------------------------------------------------------------------------
for (let i = 0; i < 20000; i++) {
  const black = rollLoot(rng, 0);
  assert.equal(black.length, 3);
  assert.ok(black[0].rarity >= 2 && black[1].type === 'gem' && black[2].rarity >= 2, 'the black knight pays well');
  for (const k of [0, 1, 2, 7, 3]) for (const it of rollLoot(rng, k)) if (it.type === 'shield') assert.ok(!SHIELDS[it.base].side, 'nobody finds a V or T shield');
  assert.ok(rollLoot(rng, 1)[0].rarity >= 1, 'the silver knight pays fine or better');
  assert.equal(rollLoot(rng, 2).length, 1);
}

// ---- the pack ----------------------------------------------------------------------------------------
const p = new Pack();
p.startingKit();
assert.equal(p.entries.filter((e) => e.item.type === 'weapon').length, 17, 'the test kit holds all thirteen swords and four staffs');
for (const e of p.entries) {
  const { w: fw, h: fh } = sizeOf(e.item);
  assert.ok(e.x + fw <= PACK_W && e.y + fh <= PACK_H, 'inside the grid');
  assert.equal(p.under(e.item, e.x, e.y).length, 1, 'on nothing else');
}
assert.ok(p.entries.some((e) => e.item.sockets === 4), 'the kit shows a four-socket sword');
const q = new Pack();
const big = rollWeapon(rng, { base: 'ringed_sword', rarity: 0, sockets: 0 });
assert.equal(q.place(big, 0, 0), null);
assert.equal(q.place(rollWeapon(rng, { base: 'brass_sabre', rarity: 0, sockets: 0 }), PACK_W, 0), false, 'off the grid');
const lifted = q.place(rollWeapon(rng, { base: 'brass_sabre', rarity: 0, sockets: 0 }), 0, 1);
assert.equal(lifted, big, 'setting one on one swaps them');
q.place(rollWeapon(rng, { base: 'brass_sabre', rarity: 0, sockets: 0 }), 1, 0);
assert.equal(q.place(rollGem(rng), 0, 1) !== false, true);
console.log('all good');
