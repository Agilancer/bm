// What can be found: the swords, the words a roll can add to them and the gems that go in their sockets. Tessariel fights with spells: the swords' rows stay here but are never rolled. Tables and dice only,
// so the node check in tools/items/check.mjs rolls exactly what the game rolls. Every stat a line here can show is one
// src/sim/player.js really applies.
import { SKINS, rollPattern, rollSkin } from './skins.js';
import { INPUT, WEAPONS } from '../core/layout.js';
import { SPELLS } from '../sim/spells.js';
import { SCROLLS } from '../sim/skills.js';
import { STAFFS2 } from './staffs2.js';
import { SHIELDS2 } from './shields2.js';
import { ROBE_SETS } from './robesets.js';

export { ROBE_SETS };

export const RARITIES = [
  { name: 'Common', color: '#a8a8a8', weight: 60, affixes: [0, 0], quality: [0.92, 1.0], sockets: { 0: 80, 1: 20 } },
  { name: 'Uncommon', color: '#3fd14a', weight: 26, affixes: [1, 1], quality: [0.98, 1.08], sockets: { 0: 55, 1: 33, 2: 12 } },
  { name: 'Rare', color: '#3f8cff', weight: 10, affixes: [2, 2], quality: [1.05, 1.16], sockets: { 0: 35, 1: 35, 2: 22, 3: 8 } },
  { name: 'Epic', color: '#b04df0', weight: 3.4, affixes: [3, 3], quality: [1.1, 1.2], sockets: { 1: 35, 2: 40, 3: 25 } },
  // Four sockets are here and nowhere else: the best of the best, and few even of them.
  { name: 'Legendary', color: '#ff8a1e', weight: 0.6, affixes: [3, 4], quality: [1.16, 1.3], sockets: { 2: 45, 3: 40, 4: 15 } },
  // Skulls alone come this rare: see rollSkull.
  { name: 'Mythical', color: '#ff2e88', weight: 0, affixes: [4, 4], quality: [1.25, 1.4], sockets: { 4: 100 } },
];
export const MAX_SOCKETS = 4;

// Damage is on a scale where 20 is what the swings' own numbers were balanced on. grade: which rarities it can come as (HIGH_CHANCE).
export const BASES = {
  greatsword: { name: 'Old Greatsword', dmg: [17, 23], grade: 'starter' },
  ringed_sword: { name: 'Ringed Sword', dmg: [14, 20], grade: 'retired' },
  bronze_broadsword: { name: 'Bronze Broadsword', dmg: [16, 22], grade: 'retired' },
  brass_sabre: { name: 'Brass Sabre', dmg: [13, 21], grade: 'retired', innate: { speed: 0.05 } },
  swept_rapier: { name: 'Swept Rapier', dmg: [11, 18], grade: 'retired', innate: { pierce: 0.2 } },
  wheel_greatsword: { name: 'Wheel Greatsword', dmg: [18, 24], grade: 'retired' },
  bluegrip_greatsword: { name: 'Bluegrip Greatsword', dmg: [18, 26], grade: 'retired' },
  fluked_greatsword: { name: 'Fluked Greatsword', dmg: [20, 28], grade: 'retired', innate: { poise: 0.15 } },
  greengrip_greatsword: { name: 'Greengrip Greatsword', dmg: [17, 25], grade: 'retired' },
  greenwood_staff: { name: 'Greenwood Staff', dmg: [14, 20], grade: 'common' },
  crystal_staff: { name: 'Crystal Staff', dmg: [14, 20], grade: 'common' },
  skullhorn_staff: { name: 'Skullhorn Staff', dmg: [14, 20], grade: 'common' },
  gnarled_crook: { name: 'Gnarled Crook', dmg: [14, 20], grade: 'common' },
  dark_staff: { name: 'Dark Staff', dmg: [14, 20], grade: 'common', note: 'A shade that hunts from foe to foe, and brings you back mana for each.' },
  death_staff: { name: 'Death Staff', dmg: [14, 20], grade: 'common', note: 'Marks a foe for death. If the mark kills, it leaps to two more.' },
  earth_staff: { name: 'Earth Staff', dmg: [14, 20], grade: 'common', note: 'A boulder that bounces on, throwing up all it lands among.' },
  fire_staff: { name: 'Fire Staff', dmg: [14, 20], grade: 'common', note: 'A comet that bursts into a spray of embers, and they burn.' },
  ice_staff: { name: 'Ice Staff', dmg: [14, 20], grade: 'common', note: 'Freezes what it strikes solid, and shards fly out from it.' },
  life_staff: { name: 'Life Staff', dmg: [14, 20], grade: 'common', note: 'A seed that bursts. Each foe it hurts sends a mote back to heal you.' },
  vine_staff: { name: 'Vine Staff', dmg: [14, 20], grade: 'common', note: 'Vines seize nearby foes and drag them in, to the spot or to the one it hit.' },
  wind_staff: { name: 'Wind Staff', dmg: [14, 20], grade: 'common', note: 'A tornado that leaves small and grows huge, sweeping up all it meets.' },
  gilded_sword: { name: 'Gilded Sword', dmg: [22, 30], grade: 'retired', innate: { life: 10 } },
  crimson_sword: { name: 'Crimson Sword', dmg: [24, 34], grade: 'retired', innate: { leech: 1 } },
  thornvine_sword: { name: 'Thornvine Sword', dmg: [20, 32], grade: 'retired', innate: { poise: 0.15 } },
  frost_sword: { name: 'Frost Sword', dmg: [21, 29], grade: 'retired', innate: { speed: 0.06 } },
};
// What each kind of shot does, in a line, for the staffs that fire it (src/sim/casting.js STAFF_SHOTS).
export const SHOT_NOTE = {
  sunburst: 'A mote of sun that bursts in a pillar of light, and rays leap from it to the foes nearest.',
  crescent: 'A spinning crescent moon that cuts through all in its path, then turns and comes back to your hand.',
  stasis: 'Opens a sphere where time stops: all inside hang frozen, and every hurt they took falls on them at once when it ends.',
  judgement: 'Marks the ground where you look, and a sword of light falls on it: all near are struck and left reeling.',
  singularity: 'A slow black star that drags all it passes into its wake, then collapses on them.',
  prism: 'A shard of crystal that splits on what it strikes into three beams that run on through.',
  leech: 'A drop of blood that bursts in threads, fastening on the foes about it and drinking their life into yours.',
  wyrm: 'A serpent of fire that weaves its way to the nearest foe and leaves the ground burning.',
  phoenix: 'A firebird that flies through all in its way and bursts in a ring of flame. It mends you as it dies.',
  tesla: 'A spark that sticks where it lands and lashes lightning into everyone near for three seconds.',
  souls: 'Five wailing souls that each go hunting a foe of their own.',
  thorns: 'A fan of five thorns that pierce, and leave what they hit bleeding sap.',
  starfall: 'Marks the ground: a moment later stars rain down on the mark.',
  vine: 'Vines seize nearby foes and drag them in.',
  rime: 'Freezes what it strikes solid, and shards fly out from it.',
  comet: 'A comet that bursts into a spray of embers, and they burn.',
  bloom: 'A seed that bursts. Each foe it hurts sends a mote back to heal you.',
  shade: 'A shade that hunts from foe to foe, and brings you back mana for each.',
  frost: 'Three splinters of ice that slow what they strike.',
};
// What the 83 staffs hit for, by their rarity: the finer the look, the harder.
const TIER_DMG = [[12, 18], [14, 20], [17, 24], [20, 28], [24, 33]];
for (const s of STAFFS2) BASES[s.id] = { name: s.name, dmg: TIER_DMG[s.tier], grade: 'staff', tier: s.tier, shot: s.shot, note: SHOT_NOTE[s.shot] };
// The first twelve fall in with them: the four plain ones as common, the elementals as uncommon. The plain four fire a spell's
// bolt (STAFF_BOLT in src/sim/casting.js), named here as their shot so a new game can pick its staff by what it fires.
for (const [id, shot] of Object.entries({ greenwood_staff: 'plague', crystal_staff: 'frost', skullhorn_staff: 'firebolt', gnarled_crook: 'lightning' })) Object.assign(BASES[id], { tier: 0, shot });
for (const id of ['dark_staff', 'death_staff', 'earth_staff', 'fire_staff', 'ice_staff', 'life_staff', 'vine_staff', 'wind_staff']) BASES[id].tier = 1;

// What a staff's roll comes to in a bolt, against a blade's: see STAFF_BITE in src/sim/casting.js.
const STAFF_SHOWN = 0.76;

// The kite shields, and with SHIELDS2 the 32 kites and 20 tower shields of the owner's second sheets. rarity: what it comes as. kind: kite (when it
// isn't said) or tower. side: whose it is. V is Velscour's knights' and T is Tessariel's and his followers', and neither is ever rolled or carried.
export const SHIELDS = {
  ...SHIELDS2,
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

// The skulls out of the catacombs, one of each model, in the left hand. Any of them can come at any rarity. tools/wizard/skulls_to_items.py.
export const SKULLS = {
  skull_01: { name: 'Yellowed Skull' }, skull_02: { name: 'Grave Skull' }, skull_03: { name: 'Hollow Skull' }, skull_04: { name: 'Pit Skull' },
  skull_05: { name: 'Ashen Skull' }, skull_06: { name: 'Crypt Skull' }, skull_07: { name: "Sexton's Skull" }, skull_08: { name: 'Ossuary Skull' },
};

// What a wizard wears. A piece's id is <palette>_<shape>_<slot>, built by tools/wizard/robes.py. floor: the lowest rarity it comes as.
export const ROBE_PALETTES = {
  ash: { name: 'Ashen', floor: 0, ward: 1 }, moss: { name: 'Mossgrown', floor: 0, ward: 1 }, night: { name: 'Midnight', floor: 1, ward: 1.2 },
  crimson: { name: 'Crimson', floor: 2, ward: 1.4 }, amethyst: { name: 'Amethyst', floor: 3, ward: 1.6 },
};
export const ROBE_SHAPES = {
  pointed: { name: 'Pointed Hat', slot: 'head' }, wide: { name: 'Wide-Brimmed Hat', slot: 'head' }, hood: { name: 'Hood', slot: 'head' },
  long: { name: 'Robe', slot: 'chest' }, jacket: { name: 'Jacket', slot: 'chest' }, coat: { name: 'Long Coat', slot: 'chest' },
  mantle: { name: 'Mantle', slot: 'shoulders' }, cowl: { name: 'Cowl Cape', slot: 'shoulders' },
  pants: { name: 'Pants', slot: 'legs' }, wraps: { name: 'Wrapped Trousers', slot: 'legs' },
  boots: { name: 'Boots', slot: 'feet' }, curled: { name: 'Curl-Toed Boots', slot: 'feet' },
};
const ROBE_SLOTS = { head: { ward: 3, size: { w: 2, h: 2 } }, chest: { ward: 8, size: { w: 2, h: 3 } }, shoulders: { ward: 3, size: { w: 2, h: 2 } }, legs: { ward: 5, size: { w: 2, h: 3 } }, feet: { ward: 3, size: { w: 2, h: 3 } } };
export const ROBES = {};
for (const p of Object.keys(ROBE_PALETTES)) for (const [sh, d] of Object.entries(ROBE_SHAPES)) ROBES[`${p}_${sh}_${d.slot}`] = { palette: p, shape: sh, slot: d.slot, name: `${ROBE_PALETTES[p].name} ${d.name}` };
export const robeSize = (base) => ROBE_SLOTS[ROBES[base].slot].size;

// The sets of gear (robesets.js): each has a look of its own on the body, and a rarity its pieces always come at. A piece
// is a robe of the set's palette that says its set: { type: 'robe', base, set }. Wearing two, three and all five of one
// set each add something, more the rarer the set: which three stats is the set's own, by its name.
export const SET_PARTS = ['head', 'shoulders', 'chest', 'legs', 'feet'];
const SET_WARD = [1, 1.1, 1.2, 1.4, 1.6, 1.8];   // a piece's ward by its set's rarity, where a plain robe has its palette's
const SET_UNIT = {                               // one measure of each stat, by rarity
  armor: [2, 3, 4, 6, 8, 10], life: [6, 9, 12, 16, 22, 30], power: [0.02, 0.03, 0.04, 0.05, 0.07, 0.09],
  regen: [0.04, 0.06, 0.08, 0.1, 0.13, 0.16], mana: [6, 9, 12, 16, 22, 30], thrift: [0.01, 0.015, 0.02, 0.03, 0.04, 0.05],
};
const SET_STEPS = [[2, 1], [3, 1.5], [5, 3]];    // pieces worn, and how many measures that's worth
const SET_INT = new Set(['armor', 'life', 'mana']);
const bonusCache = {};
// What a set gives: [{ need, stat, value }], for two, three and five of its pieces.
export function setBonuses(id) {
  const set = ROBE_SETS[id];
  if (!set) return [];
  if (bonusCache[id]) return bonusCache[id];
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  const left = Object.keys(SET_UNIT), out = [];
  for (const [need, k] of SET_STEPS) {
    const stat = left.splice(h % left.length, 1)[0];
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    const v = SET_UNIT[stat][set.rarity] * k;
    out.push({ need, stat, value: SET_INT.has(stat) ? Math.round(v) : Math.round(v * 1000) / 1000 });
  }
  return (bonusCache[id] = out);
}
// How many pieces of each set are on: { set id: count }.
export function setsWorn(slots) {
  const n = {};
  for (const p of SET_PARTS) { const it = slots?.[p]; if (it?.type === 'robe' && ROBE_SETS[it.set]) n[it.set] = (n[it.set] || 0) + 1; }
  return n;
}

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
// What a staff or a skull can roll, and what a robe can. Everything a caster wants; each is applied in src/sim/casting.js or player.js.
const WIZ_AFFIXES = [
  { stat: 'power', pos: 'pre', tiers: [['Kindled', 0.06, 0.1], ['Searing', 0.11, 0.17], ['Cataclysmic', 0.18, 0.28]] },
  { stat: 'thrift', pos: 'pre', tiers: [['Frugal', 0.04, 0.07], ['Spare', 0.08, 0.12], ['Ascetic', 0.13, 0.2]] },
  { stat: 'regen', pos: 'suf', tiers: [['of Trickling', 0.1, 0.18], ['of the Spring', 0.2, 0.32], ['of the Flood', 0.35, 0.55]] },
  { stat: 'mana', pos: 'suf', int: true, tiers: [['of the Well', 12, 20], ['of the Deep Well', 22, 36], ['of the Abyss', 40, 64]] },
  { stat: 'leech', pos: 'suf', int: true, tiers: [['of Thirst', 1, 2], ['of the Red Cup', 2, 3], ['of the Long Drink', 3, 5]] },
  { stat: 'life', pos: 'suf', int: true, tiers: [['of Broth', 10, 16], ['of the Old Oak', 18, 28], ['of the Old Blood', 30, 44]] },
];
const ROBE_AFFIXES = [
  { stat: 'power', pos: 'pre', tiers: [['Whispering', 0.02, 0.04], ['Chanting', 0.05, 0.07], ['Thundering', 0.08, 0.12]] },
  { stat: 'armor', pos: 'pre', int: true, tiers: [['Quilted', 2, 4], ['Warded', 5, 8], ['Hexproof', 9, 14]] },
  { stat: 'regen', pos: 'suf', tiers: [['of Trickling', 0.04, 0.07], ['of the Spring', 0.08, 0.12], ['of the Flood', 0.13, 0.2]] },
  { stat: 'mana', pos: 'suf', int: true, tiers: [['of the Well', 6, 10], ['of the Deep Well', 11, 18], ['of the Abyss', 19, 30]] },
  { stat: 'life', pos: 'suf', int: true, tiers: [['of Broth', 6, 10], ['of the Old Oak', 11, 18], ['of the Old Blood', 19, 30]] },
  { stat: 'thrift', pos: 'suf', tiers: [['of Ease', 0.02, 0.03], ['of the Long Road', 0.04, 0.05], ['of Scant Words', 0.06, 0.08]] },
];
// What a shield can roll. Its ward and these count only with no skull in hand: see gearTotals.
const SHIELD_AFFIXES = [
  { stat: 'armor', pos: 'pre', int: true, tiers: [['Studded', 3, 5], ['Bossed', 6, 10], ['Unyielding', 11, 16]] },
  { stat: 'power', pos: 'pre', tiers: [['Runed', 0.03, 0.05], ['Sigiled', 0.06, 0.09], ['Spellbound', 0.1, 0.15]] },
  { stat: 'life', pos: 'suf', int: true, tiers: [['of Broth', 8, 12], ['of the Old Oak', 14, 22], ['of the Old Blood', 24, 36]] },
  { stat: 'mana', pos: 'suf', int: true, tiers: [['of the Well', 8, 14], ['of the Deep Well', 15, 24], ['of the Abyss', 26, 40]] },
  { stat: 'regen', pos: 'suf', tiers: [['of Trickling', 0.06, 0.1], ['of the Spring', 0.11, 0.17], ['of the Flood', 0.18, 0.28]] },
];
const SHIELD_WARD = [6, 8, 11, 15, 20];   // by rarity, before its quality
const TOWER_WARD = 1.25;                  // a tower shield's ward, against a kite's of the same rarity
const SHIELD_POWER_CHANCE = [0.25, 0.4, 0.6, 1, 1];
// A shield's special ability, one at most. Its place in this list is what src/sim/player.js and surf.js are told. values: common, rare, epic.
export const SHIELD_POWERS = [null,
  { id: 'aegis', name: 'Aegis', values: [40, 30, 20], text: (v) => `Every ${v} seconds, stops one blow outright.` },
  { id: 'mending', name: 'Mending', values: [1, 2, 3], text: (v) => `Mends ${v} life a second, even in a fight.` },
  { id: 'manaward', name: 'Manaward', values: [0.15, 0.25, 0.35], text: (v) => `${pct(v)} of every wound is paid in mana instead.` },
  { id: 'bulwark', name: 'Bulwark', values: [0.25, 0.4, 0.6], text: (v) => `A guarded blow costs ${pct(v)} less.` },
  { id: 'windrider', name: 'Windrider', values: [0.2, 0.35, 0.5], text: (v) => `Rides ${pct(v)} farther: less drag on land and in the air.` },
];
const TIER_OF = [[], [0, 0, 1], [0, 1, 1, 2], [1, 1, 2], [1, 2, 2], [2, 2]];   // by rarity, the tiers it picks from

export const GEM_GRADES = [{ name: 'Rough', weight: 70 }, { name: 'Cut', weight: 25 }, { name: 'Flawless', weight: 5 }];
export const GEMS = {
  ruby: { name: 'Ruby', color: '#d8362c', stat: 'power', values: [0.06, 0.1, 0.15] },
  topaz: { name: 'Topaz', color: '#e2a63a', stat: 'regen', values: [0.1, 0.18, 0.28] },
  emerald: { name: 'Emerald', color: '#3fb56a', stat: 'leech', values: [1, 2, 3] },
  sapphire: { name: 'Sapphire', color: '#3f7fe0', stat: 'mana', values: [12, 20, 32] },
  amethyst: { name: 'Amethyst', color: '#a45ad6', stat: 'thrift', values: [0.04, 0.07, 0.11] },
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
  armor: (v) => `+${v} ward`,
  power: (v) => `+${pct(v)} spell damage`,
  regen: (v) => `+${pct(v)} mana regeneration`,
  mana: (v) => `+${v} mana`,
  thrift: (v) => `-${pct(v)} mana cost`,
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

// The staffs a roll can come up as, at one tier.
const staffsAt = (tier) => Object.keys(BASES).filter((b) => BASES[b].tier === tier && (BASES[b].grade === 'common' || BASES[b].grade === 'staff'));

function rollBase(rng, rarity) {
  // Tessariel carries no blade: only the staffs are ever rolled, and a staff comes as fine as its rarity: a legendary roll is one
  // of the legendary-looking staffs. (Mythical is for skulls; past legendary, the legendary ones.)
  return pick(rng, staffsAt(Math.min(rarity, 4)));
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
    affixes: rollAffixes(rng, rarity, WIZ_AFFIXES),
    sockets, gems: [],
  };
}

// What a new game puts in Tessariel's hand: a common staff of the lowest tier. What it fires is picked first, then a staff
// that fires it, so every kind of shot is as likely as any other, however many staffs share it.
export function rollStarterStaff(rng) {
  const commons = staffsAt(0);
  const shot = pick(rng, [...new Set(commons.map((b) => BASES[b].shot))]);
  return rollWeapon(rng, { base: pick(rng, commons.filter((b) => BASES[b].shot === shot)), rarity: 0 });
}

// The shields any roll can come up as, at one rarity: kites and towers alike, never V's or T's.
const shieldsAt = (rarity) => Object.keys(SHIELDS).filter((b) => !SHIELDS[b].side && SHIELDS[b].rarity === rarity);

// A shield of whatever rarity comes up, or opts.base. A rarity no shield is drawn at rolls as the nearest under it that has one.
export function rollShield(rng, opts = {}) {
  let rarity = rollRarity(rng, opts.minRarity || 0);
  while (rarity > 0 && !shieldsAt(rarity).length) rarity--;
  const base = opts.base || pick(rng, shieldsAt(rarity));
  const shown = SHIELDS[base].rarity;
  const power = rng() < SHIELD_POWER_CHANCE[shown] ? pick(rng, SHIELD_POWERS.slice(1)) : null;
  return {
    type: 'shield', base, rarity: shown,
    armor: Math.round(SHIELD_WARD[shown] * (SHIELDS[base].kind === 'tower' ? TOWER_WARD : 1) * between(rng, RARITIES[shown].quality[0], RARITIES[shown].quality[1])),
    affixes: rollAffixes(rng, shown, SHIELD_AFFIXES),
    power: power && { id: power.id, value: power.values[shown > 2 ? 2 : shown > 0 ? 1 : 0] },
    sockets: opts.sockets ?? +weighted(rng, RARITIES[shown].sockets), gems: [],
  };
}

// A skull for the left hand: the same rolls as a staff, a skin to show what it is, and from one to six places for gems, laid out in one of sixty patterns.
const SKULL_SOCKETS = [{ 1: 70, 2: 30 }, { 1: 40, 2: 40, 3: 20 }, { 2: 40, 3: 40, 4: 20 }, { 3: 40, 4: 40, 5: 20 }, { 4: 40, 5: 40, 6: 20 }, { 6: 1 }];
export function rollSkull(rng, opts = {}) {
  let rarity = opts.rarity ?? rollRarity(rng, opts.minRarity || 0);
  if (opts.rarity === undefined && rarity === 4 && rng() < 0.12) rarity = 5;     // One in eight of the legendary.
  const sockets = opts.sockets ?? +weighted(rng, SKULL_SOCKETS[rarity]);
  return { type: 'skull', base: opts.base || pick(rng, Object.keys(SKULLS)), rarity, skin: opts.skin || rollSkin(rng, rarity), pattern: opts.pattern ?? rollPattern(rng, sockets), affixes: rollAffixes(rng, rarity, WIZ_AFFIXES), sockets, gems: [] };
}

// A hat, a robe, a jacket, pants... a piece of one of the sets of gear, of whatever rarity comes up: the set is picked from
// those that come that rare, and the piece is a robe of the set's palette. opts: set (a piece of that one), slot, base (a
// set of its palette, at its palette's floor or finer), rarity, minRarity; plain: no set, a bare robe of a palette.
const setsAt = (rarity, palette) => Object.keys(ROBE_SETS).filter((id) => ROBE_SETS[id].rarity === rarity && (!palette || ROBE_SETS[id].palette === palette));
export function rollRobe(rng, opts = {}) {
  let set = ROBE_SETS[opts.set] ? opts.set : null, base = opts.base, rarity;
  if (set) rarity = ROBE_SETS[set].rarity;
  else {
    const floor = base ? ROBE_PALETTES[ROBES[base].palette].floor : 0;
    rarity = Math.max(opts.rarity ?? rollRarity(rng, opts.minRarity || 0), floor);
    if (opts.rarity === undefined && rarity === 4 && rng() < 0.12) rarity = 5;     // One in eight of the legendary, as the skulls.
    if (!opts.plain) {
      const from = setsAt(rarity, base && ROBES[base].palette);
      if (from.length) set = pick(rng, from);
    }
  }
  if (set && (!base || ROBES[base].palette !== ROBE_SETS[set].palette)) {
    const slot = opts.slot || (base ? ROBES[base].slot : pick(rng, SET_PARTS));
    base = pick(rng, Object.keys(ROBES).filter((b) => ROBES[b].palette === ROBE_SETS[set].palette && ROBES[b].slot === slot));
  }
  if (!base) base = pick(rng, Object.keys(ROBES).filter((b) => ROBE_PALETTES[ROBES[b].palette].floor <= rarity && (!opts.slot || ROBES[b].slot === opts.slot)));
  const { palette, slot } = ROBES[base];
  const q = between(rng, RARITIES[rarity].quality[0], RARITIES[rarity].quality[1]);
  const item = { type: 'robe', base, rarity, armor: Math.round(ROBE_SLOTS[slot].ward * (set ? SET_WARD[rarity] : ROBE_PALETTES[palette].ward) * q), affixes: rollAffixes(rng, rarity, ROBE_AFFIXES) };
  if (set) item.set = set;
  return item;
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

// What a fallen enemy leaves. kind: 0 the black knight, 1 the silver knight, 2 a crab, 5 a zombie, 7 a necromancer or a wizard, 8 a champion.
export function rollLoot(rng, kind) {
  const robe = (chance, opts) => (rng() < chance ? [rollRobe(rng, opts)] : []);
  const skull = (chance, opts) => (rng() < chance ? [rollSkull(rng, opts)] : []);
  const gold = (lo, hi) => ({ type: 'gold', amount: lo + Math.floor(rng() * (hi - lo + 1)) });
  const scroll = (chance) => (rng() < chance ? [rollSpell(rng)] : []);
  if (kind === 0) return [rollWeapon(rng, { minRarity: 2 }), rollSkull(rng, { minRarity: 2 }), rollGem(rng), rollShield(rng, { minRarity: 2 }), ...robe(0.6, { minRarity: 2 }), rollSpell(rng), gold(120, 240)];
  if (kind === 1) return [rng() < 0.5 ? rollWeapon(rng, { minRarity: 1 }) : rollSkull(rng, { minRarity: 1 }), rollShield(rng, { minRarity: 2 }), ...robe(0.4, { minRarity: 1 }), gold(40, 90)];
  // A boss of the Hollowfang Warrens (src/sim/dungeon.js): a hoard, on top of what its body leaves. Always a rare staff or
  // better (an epic one, one time in three), two more pieces as good, a gem, a scroll and a heap of gold.
  if (kind === 20) {
    const piece = [(m) => rollSkull(rng, m), (m) => rollShield(rng, m), (m) => rollRobe(rng, m)].sort(() => rng() - 0.5);
    return [rollWeapon(rng, { minRarity: rng() < 0.35 ? 3 : 2 }), piece[0]({ minRarity: rng() < 0.3 ? 3 : 2 }), piece[1]({ minRarity: 2 }), rollGem(rng), rollSpell(rng), gold(150, 260)];
  }
  // And the dragon's, at the bottom of them: an epic staff, skull and shield at the least, a robe, one thing more that's
  // legendary, two gems, two scrolls, and more gold than anything else in the game leaves.
  if (kind === 21) {
    const best = [(m) => rollWeapon(rng, m), (m) => rollSkull(rng, m), (m) => rollShield(rng, m), (m) => rollRobe(rng, m)][Math.floor(rng() * 4)];
    return [rollWeapon(rng, { minRarity: 3 }), rollSkull(rng, { minRarity: 3 }), rollShield(rng, { minRarity: 3 }), rollRobe(rng, { minRarity: 2 }), best({ minRarity: 4 }),
      rollGem(rng), rollGem(rng), rollSpell(rng), rollSpell(rng), gold(400, 700)];
  }
  // The rank and file: mostly a few coins, and every so often something to look at.
  if (kind === 5 || kind === 9) {
    const out = rng() < 0.55 ? [gold(2, 12)] : [];
    if (rng() < 0.11) { const r = rng(); out.push(r < 0.2 ? rollWeapon(rng) : r < 0.4 ? rollSkull(rng) : r < 0.55 ? rollShield(rng) : r < 0.75 ? rollGem(rng) : rollRobe(rng)); }
    return out;
  }
  // A champion always leaves something worth stopping for.
  if (kind === 8) { const m = { minRarity: rng() < 0.35 ? 2 : 1 }, r = rng(); return [gold(25, 70), r < 0.25 ? rollWeapon(rng, m) : r < 0.5 ? rollSkull(rng, m) : r < 0.75 ? rollShield(rng, m) : rollRobe(rng, m), ...(rng() < 0.4 ? [rollGem(rng)] : []), ...scroll(0.1)]; }
  if (kind === 7) return [gold(15, 45), ...(rng() < 0.35 ? [rollWeapon(rng, { minRarity: 1 })] : rng() < 0.5 ? [rollSkull(rng, { minRarity: 1 })] : rng() < 0.4 ? [rollShield(rng)] : [rollGem(rng)]), ...robe(0.2, { minRarity: 1 }), ...scroll(0.1)];
  return [gold(8, 30), ...(rng() < 0.3 ? [rollWeapon(rng)] : rng() < 0.4 ? [rollSkull(rng)] : [rng() < 0.3 ? rollShield(rng) : rollGem(rng)]), ...robe(0.15)];
}

// A spell, for good, once it's read. Spells are found, not known.
// (Of the trees' second and third tiers only: SCROLLS in src/sim/skills.js. Reading one gives the spell's first rank for nothing.)
export function rollSpell(rng) { return { type: 'spell', spell: SCROLLS[Math.floor(rng() * SCROLLS.length)], rarity: 2 }; }

const CHEST_ROBE = [0.25, 0.5, 0.7];

// What's in a chest: tier 0 a house's, 1 the priest's, 2 what the dead keep.
export function rollChest(rng, tier) {
  setFind(1 + tier * 0.6);
  const [lo, hi] = [[6, 24], [25, 60], [60, 140]][tier] || [6, 24];
  const out = [{ type: 'gold', amount: lo + Math.floor(rng() * (hi - lo + 1)) }];
  if (tier === 2) {
    out.push(rng() < 0.5 ? rollWeapon(rng, { minRarity: 2 }) : rollSkull(rng, { minRarity: 2 }), rollGem(rng));
    if (rng() < 0.5) out.push(rollShield(rng, { minRarity: 1 }));
  } else if (tier === 1) {
    const r = rng();
    out.push(r < 0.3 ? rollWeapon(rng, { minRarity: 1 }) : r < 0.6 ? rollSkull(rng, { minRarity: 1 }) : rollGem(rng));
    if (rng() < 0.25) out.push(rollShield(rng));
  } else if (rng() < 0.35) out.push(rollGem(rng));
  else if (rng() < 0.3) { const r = rng(); out.push(r < 0.35 ? rollWeapon(rng) : r < 0.7 ? rollSkull(rng) : rollShield(rng)); }
  if (rng() < CHEST_ROBE[tier]) out.push(rollRobe(rng, { minRarity: tier }));
  if (rng() < [0.15, 0.5, 1][tier]) out.push(rollSpell(rng));
  return out;
}

// What's brought up from the dead to be made into something: kept in a satchel by the count, not in the pack's grid. Who works
// each: src/folk/shops.js. Where each comes from: src/items/drops.js.
export const MATS = {
  bone: { name: 'Bone Shard', plural: 'Bone Shards', color: '#d8ccae', note: 'Old bone, nobody in particular. Silas Crane carves skulls from it.' },
  iron: { name: 'Grave Iron', plural: 'Grave Iron', color: '#7c766e', note: 'Coffin nails, hinges and fittings off the dead. Homunculus forges staffs and shields from it.' },
  silk: { name: 'Shroud Silk', plural: 'Shroud Silk', color: '#cdbf9f', note: "A length of Reed silk the dead went down in. Tamsin Reed sews robes from it." },
  wax: { name: 'Grave Wax', plural: 'Grave Wax', color: '#e2cf8e', note: 'Candle-ends off the crypt shelves. Elspeth Tallow makes grave candles from it.' },
  ember: { name: 'Soul Ember', plural: 'Soul Embers', color: '#ff6a2a', note: 'What was left burning in one of the strong dead. Worked into a piece, it makes it finer.' },
};
export const matName = (kind, n = 1) => (n === 1 ? MATS[kind].name : MATS[kind].plural);

export function nameOf(item) {
  if (item.type === 'spell') return `Scroll of ${SPELLS[item.spell].name}`;
  if (item.type === 'gold') return `${item.amount} gold`;
  if (item.type === 'mat') return `${item.n > 1 ? `${item.n} ` : ''}${matName(item.kind, item.n || 1)}`;
  if (item.type === 'gem') return `${GEM_GRADES[item.grade].name} ${GEMS[item.kind].name}`;
  if (item.type === 'shield') {
    const pre = item.affixes?.find((a) => a.pos === 'pre'), suf = item.affixes?.find((a) => a.pos === 'suf');
    return [pre?.name, SHIELDS[item.base].name, suf?.name].filter(Boolean).join(' ');
  }
  if (item.type === 'armor') {
    const pre = item.affixes.find((a) => a.pos === 'pre'), suf = item.affixes.find((a) => a.pos === 'suf');
    return [pre?.name, GEAR[item.base].name, suf?.name].filter(Boolean).join(' ');
  }
  const pre = item.affixes.find((a) => a.pos === 'pre'), suf = item.affixes.find((a) => a.pos === 'suf');
  const named = item.type === 'skull' ? (SKINS[item.skin] ? `${SKINS[item.skin].name} Skull` : SKULLS[item.base].name)
    : item.type === 'robe' ? (ROBE_SETS[item.set] ? `${ROBE_SETS[item.set].name} ${ROBE_SHAPES[ROBES[item.base].shape].name}` : ROBES[item.base].name) : BASES[item.base].name;
  return [pre?.name, named, suf?.name].filter(Boolean).join(' ');
}

export const colorOf = (item) => (item.type === 'gold' ? '#e8c15a' : item.type === 'mat' ? MATS[item.kind].color : item.type === 'gem' ? GEMS[item.kind].color : RARITIES[item.rarity].color);

export function gemLine(gem) {
  const g = GEMS[gem.kind];
  return STAT_TEXT[g.stat](g.values[gem.grade]);
}

const SOCKET_LINES = (item, out) => {
  for (let i = 0; i < (item.sockets || 0); i++) {
    const g = item.gems?.[i];
    out.push(g ? { text: `${nameOf(g)}: ${gemLine(g)}`, kind: 'gem', color: GEMS[g.kind].color } : { text: 'Empty socket', kind: 'open' });
  }
  return out;
};

// A staff's damage, with what's in its sockets and on its words counted by gearTotals.
export function statsOf(item) {
  return { min: item.dmg?.[0] ?? 0, max: item.dmg?.[1] ?? 0 };
}

// The lines of a tooltip, in order: { text, kind } with kind one of title, sub, stat, gem, open. slots: what's worn, for
// how much of a piece's set is on.
export function linesOf(item, slots) {
  if (item.type === 'gem') {
    return [{ text: nameOf(item), kind: 'title' }, { text: 'Gem', kind: 'sub' }, { text: gemLine(item), kind: 'stat' }, { text: GEM_LOOK[item.kind], kind: 'sub' }, { text: 'Goes in an open socket on a staff, a skull or a shield, and stays there.', kind: 'sub' }];
  }
  if (item.type === 'shield') {
    const out = [{ text: nameOf(item), kind: 'title' }, { text: `${RARITIES[item.rarity].name} ${SHIELDS[item.base]?.kind || 'kite'} shield`, kind: 'sub' }, { text: `Ward ${item.armor || 0}`, kind: 'stat' }];
    for (const a of item.affixes || []) out.push({ text: STAT_TEXT[a.stat](a.value), kind: 'stat' });
    const p = item.power && SHIELD_POWERS.find((s) => s?.id === item.power.id);
    if (p) out.push({ text: `${p.name}: ${p.text(item.power.value)}`, kind: 'gem', color: '#e8c15a' });
    SOCKET_LINES(item, out);
    out.push({ text: 'Hold Space as you jump to ride it.', kind: 'sub' }, { text: 'With a skull in hand it is only for riding: the skull counts, and nothing on the shield does.', kind: 'sub' });
    return out;
  }
  if (item.type === 'skull') {
    const out = [{ text: nameOf(item), kind: 'title' }, { text: `${RARITIES[item.rarity].name} skull`, kind: 'sub' }];
    for (const a of item.affixes) out.push({ text: STAT_TEXT[a.stat](a.value), kind: 'stat' });
    return SOCKET_LINES(item, out);
  }
  if (item.type === 'robe') {
    const out = [{ text: nameOf(item), kind: 'title' }, { text: `${RARITIES[item.rarity].name} ${ROBE_SHAPES[ROBES[item.base].shape].name.toLowerCase()}`, kind: 'sub' }, { text: `Ward ${item.armor}`, kind: 'stat' }];
    for (const a of item.affixes) out.push({ text: STAT_TEXT[a.stat](a.value), kind: 'stat' });
    const set = ROBE_SETS[item.set];
    if (set) {
      const on = setsWorn(slots)[item.set] || 0;
      out.push({ text: `${set.name}: ${on} of ${SET_PARTS.length} worn`, kind: 'gem', color: '#e8c15a' });
      for (const b of setBonuses(item.set)) out.push({ text: `${b.need} pieces: ${STAT_TEXT[b.stat](b.value)}`, kind: on >= b.need ? 'gem' : 'open', ...(on >= b.need ? { color: '#e8c15a' } : {}) });
    }
    return out;
  }
  const s = statsOf(item);
  const out = [{ text: nameOf(item), kind: 'title' }, { text: `${RARITIES[item.rarity].name} staff`, kind: 'sub' }, { text: `Bolt damage ${Math.round(s.min * STAFF_SHOWN)} to ${Math.round(s.max * STAFF_SHOWN)}`, kind: 'stat' }];
  if (BASES[item.base]?.note) out.push({ text: BASES[item.base].note, kind: 'sub' });
  for (const a of item.affixes) out.push({ text: STAT_TEXT[a.stat](a.value), kind: 'stat' });
  return SOCKET_LINES(item, out);
}

// What each gem looks like on what it's set in, for its tooltip. src/gfx/gemfx.js does it.
const GEM_LOOK = {
  ruby: 'Sheds rising embers and a warm, flickering light.', topaz: 'Crackles with sparks, and strobes like a storm far off.', emerald: 'Breathes out a slow green mist.',
  sapphire: 'Falls in snow, with a cold steady light.', amethyst: 'Draws dark motes in out of the air.', diamond: 'Throws prisms that turn through every colour.',
};

// All that what's worn and held comes to. With a skull in hand the skull counts and the shield doesn't: ward, words, gems, ability, nothing. It's only there to ride.
export function gearTotals(slots) {
  const add = { armor: 0, life: 0, power: 0, regen: 0, mana: 0, thrift: 0, leech: 0, shPower: 0, shValue: 0 };
  const skull = slots.skull;
  for (const [slot, it] of Object.entries(slots)) {
    if (!it || (slot === 'off' && skull)) continue;
    if (it.type === 'robe' || it.type === 'shield') add.armor += it.armor || 0;
    if (slot === 'off' && it.power) { add.shPower = SHIELD_POWERS.findIndex((s) => s?.id === it.power.id); add.shValue = it.power.value; }
    for (const a of it.affixes || []) if (a.stat in add) add[a.stat] += a.value;
    for (const g of it.gems || []) if (GEMS[g.kind].stat in add) add[GEMS[g.kind].stat] += GEMS[g.kind].values[g.grade];
  }
  // And what the sets give, for as many of their pieces as are on.
  for (const [id, n] of Object.entries(setsWorn(slots))) for (const b of setBonuses(id)) if (n >= b.need) add[b.stat] += b.value;
  return add;
}

// Puts the staff, or empty hands, what's worn and what the level comes to, in the shared block for the sim thread to take up.
export function writeWeapon(input, item, worn = gearTotals({}), lv = { power: 1, life: 0, mana: 0, regen: 1 }) {
  const s = item ? statsOf(item) : null;
  input[INPUT.WEAPON] = item ? weaponIndex(item.base) : 0;
  input[INPUT.W_MIN] = s ? s.min : 0; input[INPUT.W_MAX] = s ? s.max : 0;
  input[INPUT.W_PIERCE] = 0; input[INPUT.W_POISE] = 0; input[INPUT.W_STAM] = 0; input[INPUT.W_SPEED] = 0;
  input[INPUT.W_LEECH] = worn.leech; input[INPUT.W_LIFE] = worn.life + lv.life;
  input[INPUT.ARMOR] = worn.armor;
  input[INPUT.POWER] = (1 + worn.power) * lv.power;
  input[INPUT.MANA_MAX] = worn.mana + lv.mana;
  input[INPUT.REGEN] = (1 + worn.regen) * lv.regen;
  input[INPUT.THRIFT] = Math.min(worn.thrift, 0.5);
  input[INPUT.SH_POWER] = worn.shPower; input[INPUT.SH_VALUE] = worn.shValue;
}
