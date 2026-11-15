// Gear for your party: the hired Tessariels of the Free Company (src/ui/party.js). What the dead drop for them, beside what
// they drop for you, and what an old companion comes by on their own while you're away (catchUp). Tables and dice only, as
// items.js is, so the node checks roll exactly what the game rolls.
//
// A piece is { type: 'hgear', slot, rarity, ilvl, stats, name, ... }:
//   weapon and off: a weapon or a shield out of the heroes' own kit (assets/game/heroes/kit), by its kind, in a palette
//     of its own (pal, PROP_PALS): it is that model in that hero's hand. A weapon fits whoever fights with its kind; a
//     shield whoever carries one of its kind, in the hand or on the back.
//   helm, shoulders, chest, arms, legs, boots: a piece of armour by weight (plate, mail or light: WEIGHT_OF), cut from one
//     hero's body (shape, a body id: assets/game/heroes/<shape>.glb) and dyed in one of your own gear sets' colours (look,
//     a set id of assets/game/heroes/looks.json, tools/heroes/looks.py). On anyone of the same class and sex as the body it
//     was cut from, its shape shows as well as its colours (src/gfx/herolook.js); on anyone else of its weight, its colours.
// stats: what it adds to its wearer (src/sim/hero.js applies them, with their skill tree's: src/core/partytree.js).
import { RARITIES } from './items.js';
import { harmonize, hsvOf, plainRamp, richer } from '../gfx/recolour.js';

export const HG_SLOTS = ['weapon', 'off', 'helm', 'shoulders', 'chest', 'arms', 'legs', 'boots'];
export const HG_ARMOUR = ['helm', 'shoulders', 'chest', 'arms', 'legs', 'boots'];
export const HG_SLOT_NAME = { weapon: 'Weapon', off: 'Shield', helm: 'Head', shoulders: 'Shoulders', chest: 'Chest', arms: 'Arms', legs: 'Legs', boots: 'Feet' };
export const WEIGHT_OF = { lancer: 'plate', paladin: 'plate', dragoon: 'mail', boomerang: 'mail', archer: 'light', rogue: 'light', ninja: 'light', bard: 'light' };
const PIECE = {
  plate: { helm: 'Helm', shoulders: 'Pauldrons', chest: 'Cuirass', arms: 'Vambraces', legs: 'Cuisses', boots: 'Sabatons' },
  mail: { helm: 'Helm', shoulders: 'Spaulders', chest: 'Hauberk', arms: 'Bracers', legs: 'Chausses', boots: 'Greaves' },
  light: { helm: 'Helm', shoulders: 'Mantle', chest: 'Jerkin', arms: 'Wraps', legs: 'Breeches', boots: 'Boots' },
};
// Which part of your own gear set dyes each piece (the sets have no arms of their own: a sleeve is the coat's).
// (A helm takes the shoulders': the head's ramp is half face, and dyed steel the colour of skin.)
export const SKIN_PART = { helm: 'shoulders', shoulders: 'shoulders', chest: 'chest', arms: 'chest', legs: 'legs', boots: 'feet' };
const KIND_NAME = { dagger: 'Dagger', sword: 'Sword', mace: 'Mace', great_mace: 'Great Mace', lance: 'Lance', spear: 'Spear', bow: 'Bow', boomerang: 'Boomerang', kite: 'Kite Shield', tower: 'Tower Shield', lute: 'Lute' };
export const SHIELD_KINDS = new Set(['kite', 'tower']);

// A weapon's or shield's colours: what's painted turned to a hue of its own (hue, in degrees; null keeps each its own),
// its colour and brightness scaled. Bare steel and wood are hardly touched: src/gfx/herolook.js recolourProp.
export const PROP_PALS = {
  own: { name: '', hue: null, sat: 1, val: 1 },
  crimson: { name: 'Crimson', hue: 356, sat: 1, val: 0.92, metal: 0.1 }, ember: { name: 'Ember', hue: 22, sat: 1, val: 1, metal: 0.1 },
  gilded: { name: 'Gilded', hue: 44, sat: 1.1, val: 1.06, metal: 0.22 }, verdant: { name: 'Verdant', hue: 128, sat: 0.72, val: 0.9, metal: 0.06 },
  sea: { name: 'Sea-Green', hue: 172, sat: 0.72, val: 0.92, metal: 0.06 }, azure: { name: 'Azure', hue: 208, sat: 0.95, val: 1, metal: 0.1 },
  royal: { name: 'Royal', hue: 232, sat: 1, val: 0.9, metal: 0.1 }, violet: { name: 'Violet', hue: 276, sat: 0.9, val: 0.95, metal: 0.08 },
  rose: { name: 'Rose', hue: 330, sat: 0.85, val: 1.02, metal: 0.08 }, blackened: { name: 'Blackened', hue: null, sat: 0.55, val: 0.55 },
  bleached: { name: 'Bleached', hue: null, sat: 0.3, val: 1.18 },
};
const PAL_KEYS = Object.keys(PROP_PALS).filter((k) => k !== 'own');

// What each stat is worth for a point of a piece's budget, and what each slot's main one is. A piece's budget is by its
// slot, its item level and its rarity (points); the main stat takes most, the rest (one a rarity step past common, to
// three) share what's left.
export const HG_STATS = ['dmg', 'hp', 'ward', 'tempo', 'grace', 'thirst'];
const PER_POINT = { dmg: 0.01, hp: 0.012, ward: 0.005, tempo: 0.004, grace: 0.012, thirst: 0.0015 };
const MAIN = { weapon: 'dmg', off: 'ward', helm: 'hp', shoulders: 'ward', chest: 'hp', arms: 'tempo', legs: 'hp', boots: 'ward' };
const SLOT_W = { weapon: 1.6, off: 0.9, helm: 0.6, shoulders: 0.6, chest: 1, arms: 0.5, legs: 0.8, boots: 0.5 };
const RQ = [1, 1.25, 1.55, 1.9, 2.4, 3];
const EXTRA = [0, 1, 2, 2, 3, 3];
export const STAT_LINE = {
  dmg: (v) => `+${pc(v)} damage`, hp: (v) => `+${pc(v)} life`, ward: (v) => `Takes ${pc(v)} less from blows`,
  tempo: (v) => `Moves come round ${pc(v)} sooner`, grace: (v) => `+${pc(v)} to healing`, thirst: (v) => `Heals ${pc(v, 1)} of the hurt of each blow`,
};
function pc(v, dp = 0) { return `${(v * 100).toFixed(dp)}%`; }
// (Whole totals, as a wearer's gear and tree come to: the same caps as the tree's own, partytree.js treeMods.)
export const CAPS = { ward: 0.6, tempo: 0.4, thirst: 0.08 };

// ---- what there is to roll from ------------------------------------------------------------------------------------------

let PROPS = {}, BY_KIND = {}, LOOKS = [], BODIES = [], GROUPS = {};
// kit: assets/game/heroes/kit.json. looks: assets/game/heroes/looks.json. roster: assets/game/heroes/roster.json, every
// hero body there is and which of the owner's suits each of its six groups came from (tools/heroes/build.py).
export function useKit(kit, looks, roster) {
  PROPS = kit?.props || {};
  BY_KIND = {};
  for (const [id, p] of Object.entries(PROPS)) (BY_KIND[p.kind] ||= []).push(id);
  for (const k of Object.keys(BY_KIND)) BY_KIND[k].sort();
  if (looks) LOOKS = looks.sets || [];
  if (roster) { BODIES = roster.map((r) => r.id).sort(); GROUPS = Object.fromEntries(roster.map((r) => [r.id, r.groups || {}])); }
}
export const propKind = (id) => PROPS[id]?.kind || null;
export const lookOf = (id) => LOOKS.find((s) => s.id === id) || null;
export const bodiesOf = (cls, sex) => BODIES.filter((b) => b.startsWith(`${cls}_${sex}`));
export const bodyClass = (body) => { const m = /^([a-z]+)_([fm])\d+$/.exec(body || ''); return m ? { cls: m[1], sex: m[2] } : null; };

// What a hero carries, by kind: the weapon of their right hand, and their shield (in the left hand for a lancer and a
// paladin with a mace, else on the back to ride). kit: the hero's own (kit.json heroes), with any gear's in its place.
export const SHIELD_PLACE = (kit) => (kit?.style === 'lance' || kit?.style === 'sword_board' ? 'off' : 'back');
export function kindsOf(kit) {
  return { weapon: propKind(kit?.main), off: propKind(kit?.[SHIELD_PLACE(kit)]) };
}

// Who can wear a piece. who: { cls, sex, kit } (a party member or an old companion).
export function fits(item, who) {
  if (item?.type !== 'hgear' || !who) return false;
  if (item.slot === 'weapon' || item.slot === 'off') return !!item.kind && kindsOf(who.kit)[item.slot] === item.kind;
  return item.weight === WEIGHT_OF[who.cls];
}
// Whether its shape shows on them, as well as its colours.
export const shapeShows = (item, who) => { const b = bodyClass(item?.shape); return !!b && b.cls === who?.cls && b.sex === who?.sex; };

// ---- rolling -------------------------------------------------------------------------------------------------------------

const pick = (rng, a) => a[Math.floor(rng() * a.length) % a.length];
// A rarity by RARITIES' weights, the luck of the find (items.js setFind) lifting the rarer, never under floor.
function rollRarity(rng, luck = 1, floor = 0) {
  const w = RARITIES.slice(0, 5).map((r, i) => (i < floor ? 0 : r.weight * (i ? luck ** i : 1)));
  let t = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((t -= w[i]) < 0) return i;
  return floor;
}

export function rollStats(rng, slot, ilvl, rarity) {
  const points = SLOT_W[slot] * (4 + ilvl * 0.18) * RQ[rarity] * (0.9 + rng() * 0.2);
  const main = MAIN[slot], extra = EXTRA[rarity], pool = HG_STATS.filter((k) => k !== main);
  const stats = { [main]: 0 };
  const picked = [];
  for (let i = 0; i < extra && pool.length; i++) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const mainShare = 1 - 0.15 * picked.length;
  stats[main] = points * mainShare * PER_POINT[main];
  for (const k of picked) stats[k] = points * 0.15 * (0.8 + rng() * 0.4) * PER_POINT[k];
  for (const k of Object.keys(stats)) stats[k] = Math.round(stats[k] * 10000) / 10000;
  return stats;
}

const lookWord = (set) => {
  const n = set.name.replace(/\s+(Common|Uncommon|Rare|Epic|Legendary|Mythical)?\s*Gear$/, '').replace(/\s+Regalia$/, '');
  return n;
};
// (A head with no helm of its own is no helm to hand anyone; a rogue's second suit's is a hood, and called one.)
const BARE = (b, slot) => slot === 'helm' && /NO HELM/i.test(GROUPS[b]?.helm || '');
const HOODS = new Set(['MALE - ROGUE - 2']);
export const bareHead = (body) => BARE(body, 'helm');
function armourName(set, weight, slot, shape) {
  const piece = slot === 'helm' && HOODS.has(GROUPS[shape]?.helm) ? 'Hood' : PIECE[weight][slot];
  if (!set) return piece;
  const n = lookWord(set), of = n.indexOf(' of ');
  if (of >= 0) return `${piece} of ${n.slice(of + 4)}`;
  return `${n.split(' ')[0]} ${piece}`;
}
const words = (s) => s.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
// (A shield's id starts with its kind: kite_gilded_drake is the Gilded Drake Kite Shield.)
const propWords = (id) => { const m = /^(kite|tower)_(.+)$/.exec(id); return m ? `${words(m[2])} ${KIND_NAME[m[1]]}` : words(id); };
// (Dyed, its name has the dye's colour and no other: the Blue Tourney Lance, blackened, is the Blackened Tourney Lance.)
const COLOUR_WORDS = new Set(['Blue', 'Green', 'Red', 'Gold', 'Golden', 'White', 'Black', 'Azure', 'Crimson', 'Violet', 'Purple', 'Scarlet', 'Yellow', 'Orange', 'Pink', 'Grey', 'Gray', 'Teal', 'Cyan', 'Silver', 'Rose', 'Royal']);
function propName(id, pal) {
  const p = PROP_PALS[pal]?.name;
  if (!p) return propWords(id);
  const w = propWords(id).split(' '), kept = w.filter((x, i) => !COLOUR_WORDS.has(x) || i === w.length - 1);
  return `${p} ${kept.join(' ')}`;
}

// A gear set's colours for a piece of this rarity: the sets that are gear of a rarity (sets.json rarity) at about it, else
// any of the wizard's plain ones.
// Each class leans to colours of its own (hue in degrees, colourfulness, brightness of a set's coat at its middle), so a
// party reads at a glance: a paladin's pale and gold, a lancer's steel blue, an archer's woods, a rogue's dark red...
const TONE = { paladin: [45, 0.25, 0.72], lancer: [220, 0.4, 0.42], archer: [95, 0.38, 0.4], rogue: [355, 0.45, 0.3], ninja: [270, 0.3, 0.24], dragoon: [355, 0.55, 0.42], boomerang: [180, 0.4, 0.45], bard: [295, 0.45, 0.5] };
export function toneWeight(set, cls) {
  const t = TONE[cls], mid = set?.ramps?.chest?.[2];
  if (!t || !mid) return 1;
  const [h, s, v] = hsvOf(mid);
  let dh = Math.abs(h * 360 - t[0]) % 360; dh = Math.min(dh, 360 - dh);
  if (s < 0.12) dh = 80;   // (a grey's hue is no hue)
  return 0.05 + Math.exp(-((dh / 45) ** 2 + ((s - t[1]) / 0.3) ** 2 + ((v - t[2]) / 0.25) ** 2) / 2);
}
// worn: the sets they wear already. Now and then one of those again, to finish a set; otherwise one their class leans to,
// a coat (the colour all they wear is dyed toward: outfitRamps) the more so.
function pickLook(rng, rarity, cls, worn = [], slot) {
  const again = worn.map(lookOf).filter((s) => s && (s.rarity == null || Math.abs(s.rarity - rarity) <= 2));
  if (again.length && rng() < 0.4) return pick(rng, again);
  const near = LOOKS.filter((s) => s.rarity != null && Math.abs(s.rarity - rarity) <= 1);
  const pool = near.length ? near : LOOKS;
  if (!pool.length) return null;
  const w = pool.map((s) => toneWeight(s, cls) ** (slot === 'chest' ? 3 : 1));
  let t = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((t -= w[i]) < 0) return pool[i];
  return pool[pool.length - 1];
}

// The ramp that dyes a piece: its set's for the part of you it covers (SKIN_PART), as rich as its rarity (recolour.js
// richer) when that's given. A helm's lightest stop is held down a little: a visor's shine is light enough of itself.
export function rampFor(set, slot, rarity) {
  let ramp = set?.ramps?.[SKIN_PART[slot]] || set?.ramps?.chest || null;
  if (!ramp) return null;
  if (slot === 'helm') ramp = ramp.map((c, i) => (i === ramp.length - 1 ? ramp[i - 1].map((x, j) => (x + c[j]) / 2) : c));
  return rarity == null ? ramp : richer(ramp, rarity);
}
// What a wearer's armour is dyed, piece by piece, on them: each its own set's light and dark in their coat's colour (or,
// with no coat, their rarest piece's), so what they wear goes together, each as rich as its own rarity. A piece of the
// coat's own set is the set's own.
export function outfitRamps(gear) {
  const worn = HG_ARMOUR.filter((s) => gear?.[s]?.look && lookOf(gear[s].look));
  if (!worn.length) return {};
  const first = gear.chest?.look && lookOf(gear.chest.look) ? 'chest' : [...worn].sort((a, b) => (gear[b].rarity | 0) - (gear[a].rarity | 0))[0];
  const anchor = gear[first].look, aRamp = rampFor(lookOf(anchor), 'chest');
  const out = {};
  for (const s of worn) {
    const own = rampFor(lookOf(gear[s].look), s);
    out[s] = richer(gear[s].look === anchor || !aRamp ? own : harmonize(own, aRamp), gear[s].rarity | 0);
  }
  return out;
}
// The sets they wear two pieces or more of, most first: [{ set, n, of }] (of: the armour pieces a set could be, six).
export function setsWorn(gear) {
  const n = {};
  for (const s of HG_ARMOUR) { const l = gear?.[s]?.look; if (l && lookOf(l)) n[l] = (n[l] || 0) + 1; }
  return Object.entries(n).filter(([, k]) => k >= 2).sort((a, b) => b[1] - a[1]).map(([id, k]) => ({ set: lookOf(id), name: lookWord(lookOf(id)), n: k, of: HG_ARMOUR.length }));
}
// The palette nearest a coat's colour, of the painted ones: for a weapon or shield that goes with what they wear.
function palNear(gear) {
  const ramp = gear?.chest?.look && rampFor(lookOf(gear.chest.look), 'chest');
  if (!ramp) return null;
  if (plainRamp(ramp)) return hsvOf(ramp[2])[2] < 0.3 ? 'blackened' : 'bleached';
  const h = hsvOf(ramp[2])[0] * 360;
  let best = null, bd = 1e9;
  for (const k of PAL_KEYS) {
    const hue = PROP_PALS[k].hue;
    if (hue == null) continue;
    let d = Math.abs(hue - h) % 360; d = Math.min(d, 360 - d);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// One piece of party gear. o: { who: the wearer it's rolled for ({ cls, sex, kit }), slot, ilvl, rarity, luck, floor }.
export function rollPartyGear(rng, o) {
  const who = o.who;
  const kinds = kindsOf(who.kit);
  const slots = HG_SLOTS.filter((s) => (s === 'weapon' || s === 'off' ? !!kinds[s] && BY_KIND[kinds[s]]?.length : true));
  const slot = o.slot && slots.includes(o.slot) ? o.slot : pick(rng, slots);
  const rarity = o.rarity ?? rollRarity(rng, o.luck, o.floor || 0);
  const ilvl = Math.max(1, Math.round(o.ilvl || 1));
  const item = { type: 'hgear', slot, rarity, ilvl, stats: rollStats(rng, slot, ilvl, rarity) };
  if (slot === 'weapon' || slot === 'off') {
    item.kind = kinds[slot];
    item.prop = pick(rng, BY_KIND[item.kind]);
    // (A common one is as it was made; the rarer, the likelier a colour of its own, and that more often than not one that
    // goes with their coat.)
    const near = palNear(who.gear);
    item.pal = rng() < 0.25 + rarity * 0.15 ? (near && rng() < 0.6 ? near : pick(rng, PAL_KEYS)) : 'own';
    item.name = propName(item.prop, item.pal);
  } else {
    item.weight = WEIGHT_OF[who.cls];
    const set = pickLook(rng, rarity, who.cls, HG_ARMOUR.map((s) => who.gear?.[s]?.look).filter(Boolean).concat(who.gear?.chest?.look || []), slot);
    item.look = set?.id || null;
    // (Cut from one of the wearer's class and sex: a body like theirs, and most often one whose piece there came from
    // another of the owner's suits than theirs did, so it looks it.)
    const like = bodiesOf(who.cls, who.sex).filter((b) => !BARE(b, slot)), own = GROUPS[who.body]?.[slot];
    const other = like.filter((b) => GROUPS[b]?.[slot] && GROUPS[b][slot] !== own);
    item.shape = other.length && rng() < 0.8 ? pick(rng, other) : like.length ? pick(rng, like) : null;
    item.name = armourName(set, item.weight, slot, item.shape);
  }
  return item;
}

// Party gear in a death's worth, for whoever's in your party (members: [{ cls, sex, kit, level }]). kind as rollLoot has
// it: a boss's hoard (20 and 21) always has some, a champion (8) often, anything else now and then.
export function partyDrops(rng, kind, members, luck = 1) {
  if (!members?.length) return [];
  const k = kind | 0;
  const n = k >= 21 ? 3 : k >= 20 ? 2 : k === 8 ? (rng() < 0.45 ? 1 : 0) : k >= 5 ? (rng() < 0.07 ? 1 : 0) : (rng() < 0.04 ? 1 : 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const who = pick(rng, members);
    out.push(rollPartyGear(rng, { who, ilvl: who.level - Math.floor(rng() * 3), luck: k >= 20 ? luck * 1.6 : luck, floor: k >= 21 ? 2 : k >= 20 ? 1 : 0 }));
  }
  return out;
}

// What an old companion comes by while you're away: one piece for every four levels you've gone past where you last had
// them along. Moderate: common to rare, a few levels under theirs, put on where it's better than what they have. Hands
// back the pieces they put on.
export function catchUp(rng, who, gear, steps) {
  const got = [];
  for (let i = 0; i < steps; i++) {
    const r = rng() < 0.55 ? 0 : rng() < 0.75 ? 1 : 2;
    const it = rollPartyGear(rng, { who, ilvl: Math.max(1, who.level - 2 - Math.floor(rng() * 3)), rarity: r });
    if (score(it) > score(gear[it.slot])) { gear[it.slot] = it; got.push(it); }
  }
  return got;
}

// How good a piece is, all its stats weighed as a point of budget each: for which of two is better.
export function score(item) {
  if (!item?.stats) return 0;
  let s = 0;
  for (const [k, v] of Object.entries(item.stats)) s += v / PER_POINT[k];
  return s;
}
// The best a wearer could have on of what's given, slot by slot: { slot: item } of those that beat what's on.
export function bestOf(items, who, gear) {
  const out = {};
  for (const it of items) {
    if (!fits(it, who)) continue;
    const cur = out[it.slot] || gear?.[it.slot];
    if (score(it) > score(cur)) out[it.slot] = it;
  }
  return out;
}

// All a wearer's gear comes to: { stat: total }.
export function gearStats(gear) {
  const t = Object.fromEntries(HG_STATS.map((k) => [k, 0]));
  for (const it of Object.values(gear || {})) for (const [k, v] of Object.entries(it?.stats || {})) t[k] += v;
  return t;
}

// ---- telling it ----------------------------------------------------------------------------------------------------------

export const sizeOfHG = (item) => {
  if (item.slot === 'weapon') { const k = item.kind; return { w: 1, h: k === 'dagger' || k === 'boomerang' ? 2 : k === 'sword' || k === 'mace' ? 3 : 4 }; }
  return item.slot === 'off' || item.slot === 'chest' || item.slot === 'legs' ? { w: 2, h: 3 } : { w: 2, h: 2 };
};

export function hgLines(item, who) {
  const out = [{ text: item.name, kind: 'title' }];
  const what = item.slot === 'weapon' || item.slot === 'off' ? KIND_NAME[item.kind] || item.kind : `${item.weight} armour, ${HG_SLOT_NAME[item.slot].toLowerCase()}`;
  out.push({ text: `${RARITIES[item.rarity].name} ${what.toLowerCase()}, item level ${item.ilvl}`, kind: 'sub' });
  for (const k of HG_STATS) if (item.stats?.[k]) out.push({ text: STAT_LINE[k](item.stats[k]), kind: 'stat' });
  out.push({ text: `For your party: ${forWhom(item)}.`, kind: 'sub' });
  if (item.look) { const s = lookOf(item.look); if (s) out.push({ text: `Dyed in the colours of the ${s.name}.`, kind: 'sub' }); }
  const b = bodyClass(item.shape);
  if (b) out.push({ text: `Cut for a ${b.sex === 'f' ? 'woman' : 'man'} of the ${b.cls === 'boomerang' ? 'boomerang knights' : `${b.cls}s`}: on any other, only its colours show.`, kind: 'sub' });
  if (who) out.push(fits(item, who) ? { text: `${who.name} can wear it.`, kind: 'gem', color: '#7fd67f' } : { text: `Not for ${who.name}.`, kind: 'open' });
  out.push({ text: "Picked up, it goes in the bag of whoever of your party it's for. Their book: K.", kind: 'sub' });
  return out;
}

const WHO = { plate: 'lancers and paladins', mail: 'dragoons and boomerang knights', light: 'archers, rogues, ninjas and bards' };
const KIND_WHO = { dagger: 'rogues and ninjas', sword: 'bards', mace: 'paladins with a shield', great_mace: 'paladins who fight two-handed', lance: 'lancers', spear: 'dragoons', bow: 'archers', boomerang: 'boomerang knights', tower: 'lancers', kite: 'anyone who rides a kite shield, or a paladin who carries one' };
export const forWhom = (item) => (item.slot === 'weapon' || item.slot === 'off' ? KIND_WHO[item.kind] || 'some' : WHO[item.weight]);

// Its price at a shop, in gold before the shop's share (src/folk/shops.js worth).
export const hgWorth = (item) => Math.round(((12 + item.ilvl * 1.5) * RQ[item.rarity] ** 2 * (SLOT_W[item.slot] || 1)) / 5) * 5;

// How a piece looks lying on the ground (src/items/drops.js): a weapon or shield as the very model, in its colours
// (src/gfx/renderer.js buildSword reads kit/<prop>|<palette>); a piece of armour as one of the old suits' pieces, or a
// robe's for light armour: tools/gear, tools/wizard/robes.py. sword: the model's id; scale; center: how far its middle is
// over its origin, once scaled.
// (How strongly a piece on the ground glows its rarity's colour: faint for a common one, plain to see for a rare one and up.)
const GLOW_K = [0.1, 0.12, 0.2, 0.28, 0.36, 0.42];
const SUIT_SLOT = { helm: 'head', shoulders: 'shoulders', chest: 'chest', arms: 'hands', legs: 'legs', boots: 'feet' };
// (Never one of Tessariel's suits on the ground: plate and mail lie as the plain knight's. CLAUDE.md, the V and T rule.)
const LIGHT_GROUND = { helm: 'moss_hood_head', shoulders: 'moss_mantle_shoulders', chest: 'moss_jacket_chest', arms: 'knight_hands', legs: 'moss_pants_legs', boots: 'moss_boots_feet' };
export function groundModelOf(item) {
  if (item.slot === 'weapon' || item.slot === 'off') {
    const p = PROPS[item.prop] || { length: 1, reach: 0.5, butt: 0.5 };
    const scale = Math.min(0.8, 1.05 / Math.max(0.3, p.length));
    return { sword: `kit/${item.prop}|${item.pal || 'own'}`, scale, center: ((p.reach - p.butt) / 2) * scale, glowK: GLOW_K[item.rarity | 0] };
  }
  // (In its own dye: src/gfx/herolook.js lyingDyed. glowK: its rarity's glow, faint, so the dye shows under it.)
  const base = item.weight === 'light' ? LIGHT_GROUND[item.slot] : `knight_${SUIT_SLOT[item.slot]}`;
  return { sword: item.look ? `dye/${base}|${item.look}|${item.slot}|${item.rarity | 0}` : base, plain: base, scale: item.weight === 'light' && item.slot !== 'arms' ? 0.8 : 0.72, center: 0, glowK: GLOW_K[item.rarity | 0] };
}
