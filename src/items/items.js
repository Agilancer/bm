// What can be found: the swords, the words a roll can add to them and the gems that go in their sockets. Tables and dice only,
// so the node check in tools/items/check.mjs rolls exactly what the game rolls. Every stat a line here can show is one
// src/sim/player.js really applies.
import { INPUT, WEAPONS } from '../core/layout.js';

export const RARITIES = [
  { name: 'Common', color: '#e9dfc9', weight: 70, affixes: [0, 0], quality: [0.92, 1.0], sockets: { 0: 80, 1: 20 } },
  { name: 'Fine', color: '#8fb7d9', weight: 23, affixes: [1, 1], quality: [0.98, 1.08], sockets: { 0: 55, 1: 33, 2: 12 } },
  { name: 'Rare', color: '#d9b45f', weight: 6.5, affixes: [2, 2], quality: [1.05, 1.16], sockets: { 0: 35, 1: 35, 2: 22, 3: 8 } },
  // Four sockets are here and nowhere else: the best of the best, and few even of them.
  { name: 'Peerless', color: '#e0573a', weight: 0.5, affixes: [3, 4], quality: [1.12, 1.25], sockets: { 2: 45, 3: 40, 4: 15 } },
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
const HIGH_CHANCE = [0, 0, 0.15, 0.7];     // by rarity, the chance a sword is one of the high ones

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
const TIER_OF = [[], [0, 0, 1], [0, 1, 1, 2], [1, 2, 2]];   // by rarity, the tiers it picks from

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

function rollRarity(rng, min) {
  const table = {};
  RARITIES.forEach((r, i) => { if (i >= min) table[i] = r.weight; });
  return +weighted(rng, table);
}

function rollBase(rng, rarity) {
  const high = rng() < HIGH_CHANCE[rarity];
  return pick(rng, Object.keys(BASES).filter((b) => BASES[b].grade === (high ? 'high' : 'common')));
}

function rollAffixes(rng, rarity) {
  const [lo, hi] = RARITIES[rarity].affixes;
  const count = lo + Math.floor(rng() * (hi - lo + 1));
  const pre = AFFIXES.filter((a) => a.pos === 'pre'), suf = AFFIXES.filter((a) => a.pos === 'suf');
  const out = [];
  for (let i = 0; i < count; i++) {
    // Turn about, so a rare has one of each, and never the same stat twice.
    const from = i % 2 === (rarity === 1 ? Math.floor(rng() * 2) : 0) ? pre : suf;
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

export function rollGem(rng, opts = {}) {
  const kinds = {};
  GEM_GRADES.forEach((g, i) => { kinds[i] = g.weight; });
  return { type: 'gem', kind: opts.kind || pick(rng, Object.keys(GEMS)), grade: opts.grade ?? +weighted(rng, kinds) };
}

// What a fallen enemy leaves. kind: 0 the black knight, 1 the silver knight, 2 a crab, 5 a zombie, 7 a necromancer or a wizard.
export function rollLoot(rng, kind) {
  if (kind === 0) return [rollWeapon(rng, { minRarity: 2 }), rollGem(rng)];
  if (kind === 1) return [rollWeapon(rng, { minRarity: 1 })];
  if (kind === 5) return rng() < 0.12 ? [rng() < 0.5 ? rollWeapon(rng) : rollGem(rng)] : [];
  if (kind === 7) return rng() < 0.75 ? [rollWeapon(rng, { minRarity: 1 })] : [rollGem(rng)];
  return rng() < 0.6 ? [rollWeapon(rng)] : [rollGem(rng)];
}

export function nameOf(item) {
  if (item.type === 'gem') return `${GEM_GRADES[item.grade].name} ${GEMS[item.kind].name}`;
  const pre = item.affixes.find((a) => a.pos === 'pre'), suf = item.affixes.find((a) => a.pos === 'suf');
  return [pre?.name, BASES[item.base].name, suf?.name].filter(Boolean).join(' ');
}

export const colorOf = (item) => (item.type === 'gem' ? GEMS[item.kind].color : RARITIES[item.rarity].color);

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
  const s = statsOf(item), b = BASES[item.base];
  const out = [
    { text: nameOf(item), kind: 'title' },
    { text: `${RARITIES[item.rarity].name} ${hands(item.base) === 3 ? 'staff' : `${hands(item.base) === 2 ? 'two-handed' : 'one-handed'} sword`}`, kind: 'sub' },
    { text: `Damage ${s.min} to ${s.max}`, kind: 'stat' },
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

// Puts a weapon, or empty hands, in the shared block for the sim thread to take up.
export function writeWeapon(input, item) {
  const s = item ? statsOf(item) : null;
  input[INPUT.WEAPON] = item ? weaponIndex(item.base) : 0;
  input[INPUT.W_MIN] = s ? s.min : 0; input[INPUT.W_MAX] = s ? s.max : 0;
  input[INPUT.W_PIERCE] = s ? s.pierce : 0; input[INPUT.W_POISE] = s ? s.poise : 0;
  input[INPUT.W_STAM] = s ? s.stam : 0; input[INPUT.W_SPEED] = s ? s.speed : 0;
  input[INPUT.W_LEECH] = s ? s.leech : 0; input[INPUT.W_LIFE] = s ? s.life : 0;
}
