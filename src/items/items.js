// What can be found: the swords, the words a roll can add to them and the gems that go in their sockets. Tables and dice only,
// so the node check in tools/items/check.mjs rolls exactly what the game rolls. Every stat a line here can show is one
// src/sim/player.js really applies.
import { INPUT, WEAPONS } from '../core/layout.js';
import { SPELLS } from '../sim/spells.js';

export const RARITIES = [
  { name: 'Common', color: '#a8a8a8', weight: 60, affixes: [0, 0], quality: [0.92, 1.0], sockets: { 0: 80, 1: 20 } },
  { name: 'Uncommon', color: '#3fd14a', weight: 26, affixes: [1, 1], quality: [0.98, 1.08], sockets: { 0: 55, 1: 33, 2: 12 } },
  { name: 'Rare', color: '#3f8cff', weight: 10, affixes: [2, 2], quality: [1.05, 1.16], sockets: { 0: 35, 1: 35, 2: 22, 3: 8 } },
  { name: 'Epic', color: '#b04df0', weight: 3.4, affixes: [3, 3], quality: [1.1, 1.2], sockets: { 1: 35, 2: 40, 3: 25 } },
  // Four sockets are here and nowhere else: the best of the best, and few even of them.
  { name: 'Legendary', color: '#ff8a1e', weight: 0.6, affixes: [3, 4], quality: [1.16, 1.3], sockets: { 2: 45, 3: 40, 4: 15 } },
];
export const MAX_SOCKETS = 4;

// Damage is on a scale where 20 is what the swings' own numbers were balanced on. grade: which rarities it can come as (HIGH_CHANCE).
export const BASES = {
  greatsword: { name: 'Old Greatsword', dmg: [17, 23], grade: 'starter' },
  ringed_sword: { name: 'Ringed Sword', dmg: [14, 20], grade: 'common' },
  bronze_broadsword: { name: 'Bronze Broadsword', dmg: [16, 22], grade: 'common' },
  brass_sabre: { name: 'Brass Sabre', dmg: [13, 21], grade: 'common', innate: { speed: 0.05 } },
  swept_rapier: { name: 'Swept Rapier', dmg: [11, 18], grade: 'common', innate: { pierce: 0.2 } },
  wheel_greatsword: { name: 'Wheel Greatsword', dmg: [18, 24], grade: 'common' },
  bluegrip_greatsword: { name: 'Bluegrip Greatsword', dmg: [18, 26], grade: 'common' },
  fluked_greatsword: { name: 'Fluked Greatsword', dmg: [20, 28], grade: 'common', innate: { poise: 0.15 } },
  greengrip_greatsword: { name: 'Greengrip Greatsword', dmg: [17, 25], grade: 'common' },
  greenwood_staff: { name: 'Greenwood Staff', dmg: [14, 20], grade: 'common' },
  crystal_staff: { name: 'Crystal Staff', dmg: [14, 20], grade: 'common' },
  skullhorn_staff: { name: 'Skullhorn Staff', dmg: [14, 20], grade: 'common' },
  gnarled_crook: { name: 'Gnarled Crook', dmg: [14, 20], grade: 'common' },
  gilded_sword: { name: 'Gilded Sword', dmg: [22, 30], grade: 'high', innate: { life: 10 } },
  crimson_sword: { name: 'Crimson Sword', dmg: [24, 34], grade: 'high', innate: { leech: 1 } },
  thornvine_sword: { name: 'Thornvine Sword', dmg: [20, 32], grade: 'high', innate: { poise: 0.15 } },
  frost_sword: { name: 'Frost Sword', dmg: [21, 29], grade: 'high', innate: { speed: 0.06 } },
};
const HIGH_CHANCE = [0, 0, 0.15, 0.5, 0.8];     // by rarity, the chance a sword is one of the high ones
// What a staff's roll comes to in a bolt, against a blade's: see STAFF_BITE in src/sim/casting.js.
const STAFF_SHOWN = 0.76;

// The kite shields. rarity: what it comes as. side: whose it is. V is Velscour's knights' and T is Tessariel's and his followers', and neither is ever rolled or carried.
export const SHIELDS = {
  kite_cross: { name: 'Crossed Kite Shield', rarity: 0 }, kite_lion: { name: 'Lion Kite Shield', rarity: 0 },
  kite_fleur: { name: 'Fleur Kite Shield', rarity: 0 }, kite_eagle: { name: 'Eagle Kite Shield', rarity: 0 },
  kite_royal_lion: { name: 'Royal Lion Kite Shield', rarity: 2 }, kite_silver_cross: { name: 'Silver Cross Kite Shield', rarity: 2 },
  kite_dragon: { name: 'Dragon Kite Shield', rarity: 2 }, kite_tree: { name: 'Old Tree Kite Shield', rarity: 2 },
  kite_sun: { name: 'Sunwing Kite Shield', rarity: 3 }, kite_ember: { name: 'Emberwyrm Kite Shield', rarity: 3 },
  kite_elder: { name: 'Elderroot Kite Shield', rarity: 3 }, kite_frost: { name: 'Hoarfrost Kite Shield', rarity: 3 },
  kite_v_red: { name: 'Kite Shield of Velscour', rarity: 3, side: 'V' }, kite_v_violet: { name: 'Kite Shield of Velscour', rarity: 3, side: 'V' },
  kite_v_bone: { name: 'Kite Shield of Velscour', rarity: 3, side: 'V' }, kite_v_steel: { name: 'Kite Shield of Velscour', rarity: 3, side: 'V' },
  kite_t_white: { name: 'Kite Shield of Tessariel', rarity: 3, side: 'T' }, kite_t_black: { name: 'Kite Shield of Tessariel', rarity: 3, side: 'T' },
  kite_t_red: { name: 'Kite Shield of Tessariel', rarity: 3, side: 'T' }, kite_t_blue: { name: 'Kite Shield of Tessariel', rarity: 3, side: 'T' },
};

// The five suits, torn into pieces by tools/gear. A piece's id is <suit>_<slot>. floor: the lowest rarity it comes as. armor: what each of the suit's pieces is worth, against the plain knight's.
export const SUITS = {
  knight: { name: "Knight's", floor: 0, armor: 1 },
  t_pale: { name: "Tessariel's Pale", floor: 1, armor: 1.25 },
  t_silver: { name: "Tessariel's Silvered", floor: 1, armor: 1.4 },
  t_white: { name: "Tessariel's White", floor: 2, armor: 1.6 },
  t_purple: { name: "Tessariel's Amethyst", floor: 2, armor: 1.8 },
};
export const GEAR_SLOTS = {
  head: { name: 'Helm', armor: 6, size: { w: 2, h: 2 } }, chest: { name: 'Cuirass', armor: 12, size: { w: 2, h: 3 } },
  shoulders: { name: 'Pauldrons', armor: 5, size: { w: 2, h: 2 } }, hands: { name: 'Gauntlets', armor: 4, size: { w: 2, h: 2 } },
  legs: { name: 'Tassets', armor: 8, size: { w: 2, h: 3 } }, feet: { name: 'Greaves', armor: 5, size: { w: 2, h: 3 } },
};
export const GEAR = {};
for (const suit of Object.keys(SUITS)) for (const slot of Object.keys(GEAR_SLOTS)) GEAR[`${suit}_${slot}`] = { suit, slot, name: `${SUITS[suit].name} ${GEAR_SLOTS[slot].name}` };
// A blow is cut by armor / (armor + this), so the gain tails off and nothing is ever proof.
export const ARMOR_K = 100;

export const hands = (base) => WEAPONS[weaponIndex(base)].hands;
export const weaponIndex = (base) => WEAPONS.findIndex((w) => w && w.id === base);

// In a name they come as "<prefix> sword <suffix>". Each stat has three strengths, and the rarer the sword the stronger it can roll.
const AFFIXES = [
  { stat: 'dmg', pos: 'pre', tiers: [['Honed', 0.06, 0.1], ['Bitter', 0.11, 0.17], ['Sorrowing', 0.18, 0.28]] },
  { stat: 'pierce', pos: 'pre', tiers: [['Needled', 0.12, 0.2], ['Gouging', 0.22, 0.34], ['Heartseeking', 0.36, 0.5]] },
  { stat: 'poise', pos: 'pre', tiers: [['Weighted', 0.1, 0.18], ['Crushing', 0.2, 0.3], ['Bellstruck', 0.32, 0.45]] },
  { stat: 'leech', pos: 'suf', int: true, tiers: [['of Thirst', 1, 2], ['of the Red Cup', 2, 3], ['of the Long Drink', 3, 5]] },
  { stat: 'life', pos: 'suf', int: true, tiers: [['of Broth', 10, 16], ['of the Old Oak', 18, 28], ['of the Old Blood', 30, 44]] },
  { stat: 'stam', pos: 'suf', tiers: [['of Ease', 0.06, 0.1], ['of the Long Road', 0.11, 0.16], ['of Tireless Hands', 0.17, 0.24]] },
  { stat: 'speed', pos: 'suf', tiers: [['of Quick Wrists', 0.04, 0.06], ['of the Hornet', 0.07, 0.1], ['of the Swift Bell', 0.11, 0.15]] },
];
// What a piece of armour can roll, the same way a sword rolls its words. Each is applied in src/sim/player.js.
const GEAR_AFFIXES = [
  { stat: 'armor', pos: 'pre', int: true, tiers: [['Riveted', 2, 4], ['Tempered', 5, 8], ['Unbroken', 9, 14]] },
  { stat: 'life', pos: 'suf', int: true, tiers: [['of Broth', 6, 10], ['of the Old Oak', 11, 18], ['of the Old Blood', 19, 30]] },
  { stat: 'stam', pos: 'suf', tiers: [['of Ease', 0.02, 0.04], ['of the Long Road', 0.05, 0.07], ['of Tireless Hands', 0.08, 0.11]] },
  { stat: 'speed', pos: 'suf', tiers: [['of Quick Wrists', 0.01, 0.02], ['of the Hornet', 0.025, 0.04], ['of the Swift Bell', 0.045, 0.06]] },
  { stat: 'leech', pos: 'suf', int: true, tiers: [['of Thirst', 1, 1], ['of the Red Cup', 1, 2], ['of the Long Drink', 2, 3]] },
];
const TIER_OF = [[], [0, 0, 1], [0, 1, 1, 2], [1, 1, 2], [1, 2, 2]];   // by rarity, the tiers it picks from

export const GEM_GRADES = [{ name: 'Rough', weight: 70 }, { name: 'Cut', weight: 25 }, { name: 'Flawless', weight: 5 }];
export const GEMS = {
  ruby: { name: 'Ruby', color: '#d8362c', stat: 'dmg', values: [0.06, 0.1, 0.15] },
  topaz: { name: 'Topaz', color: '#e2a63a', stat: 'poise', values: [0.08, 0.14, 0.22] },
  emerald: { name: 'Emerald', color: '#3fb56a', stat: 'leech', values: [1, 2, 3] },
  sapphire: { name: 'Sapphire', color: '#3f7fe0', stat: 'stam', values: [0.06, 0.1, 0.15] },
  amethyst: { name: 'Amethyst', color: '#a45ad6', stat: 'pierce', values: [0.1, 0.18, 0.28] },
  diamond: { name: 'Diamond', color: '#cfe6ee', stat: 'life', values: [10, 18, 30] },
};

const pct = (v) => `${Math.round(v * 100)}%`;
const STAT_TEXT = {
  dmg: (v) => `+${pct(v)} damage`,
  pierce: (v) => `+${pct(v)} damage through an open cut`,
  poise: (v) => `+${pct(v)} force against a guard`,
  leech: (v) => `+${v} life on each hit`,
  life: (v) => `+${v} life`,
  stam: (v) => `-${pct(v)} stamina per swing`,
  speed: (v) => `+${pct(v)} swing speed`,
  armor: (v) => `+${v} armour`,
};

// A small seeded generator (mulberry32), so a roll can be replayed.
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, a, b) => a + (b - a) * rng();

function weighted(rng, table) {
  let total = 0;
  for (const w of Object.values(table)) total += w;
  let r = rng() * total;
  for (const [k, w] of Object.entries(table)) { r -= w; if (r <= 0) return k; }
  return Object.keys(table)[0];
}

// Danger pays: anything better than common comes this many times as often. Set by where the thing died or the chest stood.
let find = 1;
export function setFind(v) { find = v; }

function rollRarity(rng, min) {
  const table = {};
  RARITIES.forEach((r, i) => { if (i >= min) table[i] = r.weight * (i ? find : 1); });
  return +weighted(rng, table);
}

function rollBase(rng, rarity) {
  const high = rng() < HIGH_CHANCE[rarity];
  return pick(rng, Object.keys(BASES).filter((b) => BASES[b].grade === (high ? 'high' : 'common')));
}

function rollAffixes(rng, rarity, table = AFFIXES) {
  const [lo, hi] = RARITIES[rarity].affixes;
  const count = lo + Math.floor(rng() * (hi - lo + 1));
  const pre = table.filter((a) => a.pos === 'pre'), suf = table.filter((a) => a.pos === 'suf');
  const out = [];
  for (let i = 0; i < count; i++) {
    // Turn about, so a rare has one of each, and never the same stat twice.
    let from = i % 2 === (rarity === 1 ? Math.floor(rng() * 2) : 0) ? pre : suf;
    if (!from.length) from = from === pre ? suf : pre;
    const a = from.splice(Math.floor(rng() * from.length), 1)[0];
    const [name, v0, v1] = a.tiers[pick(rng, TIER_OF[rarity])];
    const v = between(rng, v0, v1);
    out.push({ stat: a.stat, pos: a.pos, name, value: a.int ? Math.round(v) : +v.toFixed(3) });
  }
  return out;
}

// opts: base, rarity and sockets to set rather than roll, minRarity for a floor under it.
export function rollWeapon(rng, opts = {}) {
  const rarity = opts.rarity ?? rollRarity(rng, opts.minRarity || 0);
  const r = RARITIES[rarity];
  const base = opts.base || rollBase(rng, rarity);
  const q = between(rng, r.quality[0], r.quality[1]);
  const sockets = opts.sockets ?? +weighted(rng, r.sockets);
  return {
    type: 'weapon', base, rarity,
    dmg: [Math.round(BASES[base].dmg[0] * q), Math.round(BASES[base].dmg[1] * q)],
    affixes: rollAffixes(rng, rarity),
    sockets, gems: [],
  };
}

// A shield of whatever rarity comes up, or opts.base. Uncommon rolls as common and legendary as epic: the sheets have nothing else.
export function rollShield(rng, opts = {}) {
  const rolled = rollRarity(rng, opts.minRarity || 0);
  const rarity = rolled === 1 ? 0 : Math.min(rolled, 3);
  const base = opts.base || pick(rng, Object.keys(SHIELDS).filter((b) => !SHIELDS[b].side && SHIELDS[b].rarity === rarity));
  return { type: 'shield', base, rarity: SHIELDS[base].rarity };
}

// A piece of armour of whatever rarity comes up, from the suits that come that rare. opts: base, rarity, minRarity, as for a sword.
export function rollArmor(rng, opts = {}) {
  const floor = opts.base ? SUITS[GEAR[opts.base].suit].floor : 0;
  const rarity = Math.max(opts.rarity ?? rollRarity(rng, opts.minRarity || 0), floor);
  // (plain: no T. Velscour's knights and whatever is under his church never carry anything of Tessariel's. See CLAUDE.md.)
  const base = opts.base || pick(rng, Object.keys(GEAR).filter((b) => SUITS[GEAR[b].suit].floor <= rarity && (!opts.plain || GEAR[b].suit === 'knight')));
  const { suit, slot } = GEAR[base];
  const q = between(rng, RARITIES[rarity].quality[0], RARITIES[rarity].quality[1]);
  return { type: 'armor', base, rarity, armor: Math.round(GEAR_SLOTS[slot].armor * SUITS[suit].armor * q), affixes: rollAffixes(rng, rarity, GEAR_AFFIXES) };
}

export function rollGem(rng, opts = {}) {
  const kinds = {};
  GEM_GRADES.forEach((g, i) => { kinds[i] = g.weight; });
  return { type: 'gem', kind: opts.kind || pick(rng, Object.keys(GEMS)), grade: opts.grade ?? +weighted(rng, kinds) };
}

// What a fallen enemy leaves. kind: 0 the black knight, 1 the silver knight, 2 a crab, 5 a zombie, 7 a necromancer or a wizard.
export function rollLoot(rng, kind) {
  const piece = (chance, opts) => (rng() < chance ? [rollArmor(rng, opts)] : []);
  const gold = (lo, hi) => ({ type: 'gold', amount: lo + Math.floor(rng() * (hi - lo + 1)) });
  const scroll = (chance) => (rng() < chance ? [rollSpell(rng)] : []);
  if (kind === 0) return [rollWeapon(rng, { minRarity: 2 }), rollGem(rng), rollShield(rng, { minRarity: 2 }), ...piece(0.5, { minRarity: 2, plain: true }), rollSpell(rng), gold(120, 240)];
  if (kind === 1) return [rollWeapon(rng, { minRarity: 1 }), rollShield(rng, { minRarity: 2 }), ...piece(0.35, { minRarity: 1 }), gold(40, 90)];
  // The rank and file: mostly a few coins, and every so often something to look at.
  if (kind === 5) {
    const out = rng() < 0.55 ? [gold(2, 12)] : [];
    if (rng() < 0.11) out.push(rng() < 0.45 ? rollWeapon(rng) : rng() < 0.45 ? rollGem(rng) : rollArmor(rng, { plain: true }));
    return out;
  }
  // A champion always leaves something worth stopping for.
  if (kind === 8) return [gold(25, 70), rng() < 0.65 ? rollWeapon(rng, { minRarity: rng() < 0.35 ? 2 : 1 }) : rollArmor(rng, { minRarity: rng() < 0.35 ? 2 : 1, plain: true }), ...(rng() < 0.4 ? [rollGem(rng)] : []), ...scroll(0.15)];
  if (kind === 7) return [gold(15, 45), ...(rng() < 0.5 ? [rollWeapon(rng, { minRarity: 1 })] : rng() < 0.4 ? [rollShield(rng)] : [rollGem(rng)]), ...piece(0.15, { minRarity: 1, plain: true }), ...scroll(0.3)];
  // (A crab's nobody's. Whatever else lands here, like the undead ogre, carries nothing of Tessariel's.)
  return [gold(8, 30), ...(rng() < 0.6 ? [rollWeapon(rng)] : [rng() < 0.3 ? rollShield(rng) : rollGem(rng)]), ...piece(0.12, { plain: kind !== 2 })];
}

// A spell, for good, once it's read. Spells are found, not known.
export function rollSpell(rng) { return { type: 'spell', spell: Math.floor(rng() * SPELLS.length), rarity: 2 }; }

const CHEST_ARMOR = [0.2, 0.5, 0.7];

// What's in a chest: tier 0 a house's, 1 the priest's, 2 what the dead keep.
export function rollChest(rng, tier) {
  setFind(1 + tier * 0.6);
  const [lo, hi] = [[6, 24], [25, 60], [60, 140]][tier] || [6, 24];
  const out = [{ type: 'gold', amount: lo + Math.floor(rng() * (hi - lo + 1)) }];
  if (tier === 2) {
    out.push(rollWeapon(rng, { minRarity: 2 }), rollGem(rng));
    if (rng() < 0.5) out.push(rollShield(rng, { minRarity: 1 }));
  } else if (tier === 1) {
    out.push(rng() < 0.5 ? rollWeapon(rng, { minRarity: 1 }) : rollGem(rng));
    if (rng() < 0.25) out.push(rollShield(rng));
  } else if (rng() < 0.35) out.push(rollGem(rng));
  else if (rng() < 0.3) out.push(rollWeapon(rng));
  // A piece of armour, now and then. (The priest's and the dead's are under Velscour's church: nothing of Tessariel's. See CLAUDE.md.)
  if (rng() < CHEST_ARMOR[tier]) out.push(rollArmor(rng, { minRarity: tier, plain: tier > 0 }));
  if (rng() < [0.15, 0.5, 1][tier]) out.push(rollSpell(rng));
  return out;
}

export function nameOf(item) {
  if (item.type === 'spell') return `Scroll of ${SPELLS[item.spell].name}`;
  if (item.type === 'gold') return `${item.amount} gold`;
  if (item.type === 'gem') return `${GEM_GRADES[item.grade].name} ${GEMS[item.kind].name}`;
  if (item.type === 'shield') return SHIELDS[item.base].name;
  if (item.type === 'armor') {
    const pre = item.affixes.find((a) => a.pos === 'pre'), suf = item.affixes.find((a) => a.pos === 'suf');
    return [pre?.name, GEAR[item.base].name, suf?.name].filter(Boolean).join(' ');
  }
  const pre = item.affixes.find((a) => a.pos === 'pre'), suf = item.affixes.find((a) => a.pos === 'suf');
  return [pre?.name, BASES[item.base].name, suf?.name].filter(Boolean).join(' ');
}

export const colorOf = (item) => (item.type === 'gold' ? '#e8c15a' : item.type === 'gem' ? GEMS[item.kind].color : RARITIES[item.rarity].color);

export function gemLine(gem) {
  const g = GEMS[gem.kind];
  return STAT_TEXT[g.stat](g.values[gem.grade]);
}

// All a weapon comes to, with its affixes and whatever is in its sockets.
export function statsOf(item) {
  const add = { dmg: 0, pierce: 0, poise: 0, stam: 0, speed: 0, leech: 0, life: 0 };
  for (const [k, v] of Object.entries(BASES[item.base].innate || {})) add[k] += v;
  for (const a of item.affixes) add[a.stat] += a.value;
  for (const g of item.gems) add[GEMS[g.kind].stat] += GEMS[g.kind].values[g.grade];
  return {
    min: Math.round(item.dmg[0] * (1 + add.dmg)), max: Math.round(item.dmg[1] * (1 + add.dmg)),
    pierce: add.pierce, poise: add.poise, stam: Math.min(add.stam, 0.5), speed: Math.min(add.speed, 0.25), leech: add.leech, life: add.life,
  };
}

// The lines of a tooltip, in order: { text, kind } with kind one of title, sub, stat, gem, open.
export function linesOf(item) {
  if (item.type === 'gem') {
    return [{ text: nameOf(item), kind: 'title' }, { text: 'Gem', kind: 'sub' }, { text: gemLine(item), kind: 'stat' }, { text: 'Goes in an open socket, and stays there.', kind: 'sub' }];
  }
  if (item.type === 'shield') return [{ text: nameOf(item), kind: 'title' }, { text: `${RARITIES[item.rarity].name} kite shield`, kind: 'sub' }, { text: 'Hold Space as you jump to ride it.', kind: 'sub' }];
  if (item.type === 'armor') {
    const out = [{ text: nameOf(item), kind: 'title' }, { text: `${RARITIES[item.rarity].name} ${GEAR_SLOTS[GEAR[item.base].slot].name.toLowerCase()}`, kind: 'sub' }, { text: `Armour ${item.armor}`, kind: 'stat' }];
    for (const a of item.affixes) out.push({ text: STAT_TEXT[a.stat](a.value), kind: 'stat' });
    return out;
  }
  const s = statsOf(item), b = BASES[item.base], staff = hands(item.base) === 3;
  const out = [
    { text: nameOf(item), kind: 'title' },
    { text: `${RARITIES[item.rarity].name} ${hands(item.base) === 3 ? 'staff' : `${hands(item.base) === 2 ? 'two-handed' : 'one-handed'} sword`}`, kind: 'sub' },
    { text: staff ? `Damage ${Math.round(s.min * STAFF_SHOWN)} to ${Math.round(s.max * STAFF_SHOWN)}` : `Damage ${s.min} to ${s.max}`, kind: 'stat' },
  ];
  // What it was made with and what it rolled, a line a stat. The gems speak for themselves below.
  const rolled = new Map(Object.entries(b.innate || {}));
  for (const a of item.affixes) rolled.set(a.stat, (rolled.get(a.stat) || 0) + a.value);
  for (const [k, v] of rolled) out.push({ text: STAT_TEXT[k](v), kind: 'stat' });
  for (let i = 0; i < item.sockets; i++) {
    const g = item.gems[i];
    out.push(g ? { text: `${nameOf(g)}: ${gemLine(g)}`, kind: 'gem', color: GEMS[g.kind].color } : { text: 'Empty socket', kind: 'open' });
  }
  return out;
}

// All that what's worn comes to.
export function gearTotals(slots) {
  const add = { armor: 0, life: 0, stam: 0, speed: 0, leech: 0 };
  for (const it of Object.values(slots)) {
    if (it?.type !== 'armor') continue;
    add.armor += it.armor;
    for (const a of it.affixes) add[a.stat] += a.value;
  }
  return add;
}

// Puts a weapon, or empty hands, and what's worn, in the shared block for the sim thread to take up.
export function writeWeapon(input, item, worn = gearTotals({})) {
  const s = item ? statsOf(item) : null;
  input[INPUT.WEAPON] = item ? weaponIndex(item.base) : 0;
  input[INPUT.W_MIN] = s ? s.min : 0; input[INPUT.W_MAX] = s ? s.max : 0;
  input[INPUT.W_PIERCE] = s ? s.pierce : 0; input[INPUT.W_POISE] = s ? s.poise : 0;
  input[INPUT.W_STAM] = Math.min((s ? s.stam : 0) + worn.stam, 0.5); input[INPUT.W_SPEED] = Math.min((s ? s.speed : 0) + worn.speed, 0.25);
  input[INPUT.W_LEECH] = (s ? s.leech : 0) + worn.leech; input[INPUT.W_LIFE] = (s ? s.life : 0) + worn.life;
  input[INPUT.ARMOR] = worn.armor;
}
