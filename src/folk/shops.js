// What Bellmourn sells, buys and makes, trade by trade (src/folk/people.js gives each trader theirs). What they say over the
// counter is in src/folk/lines/; the counter itself is src/ui/folk.js.
//
// A price is in copper, the town's own coin: ten to the gold (src/items/pack.js). Small things are priced in copper, gear in
// gold. A trader's stock is rolled fresh each morning, and what you buy of it is gone till then. A crafter makes a thing from
// what's brought up from the dead (items.js MATS), and only once their own quest has shown them the stuff is good.
import { MATS, RARITIES, ROBES, makeRng, rollGem, rollRobe, rollShield, rollSkull, rollWeapon } from '../items/items.js';
import { SPELLS } from '../sim/spells.js';

// What a thing's worth, in gold, by its rarity, before its sockets and gems.
const WORTH = [24, 60, 150, 400, 950, 2500];
const GEM_WORTH = [15, 50, 150];
const ROBE_PART = { head: 0.7, chest: 1.2, shoulders: 0.7, legs: 0.9, feet: 0.7 };
export const SCROLL_PRICE = 120;

export function worth(item) {
  if (item.type === 'gem') return GEM_WORTH[item.grade] || 15;
  if (item.type === 'spell') return SCROLL_PRICE;
  let g = WORTH[item.rarity] || 24;
  if (item.type === 'robe') g *= ROBE_PART[ROBES[item.base]?.slot] || 1;
  if (item.type === 'skull') g *= 1.1;
  g *= 1 + 0.12 * (item.sockets || 0);
  for (const gem of item.gems || []) g += GEM_WORTH[gem.grade] || 15;
  return Math.round(g / 5) * 5;
}

// Goods: things used up, there and then. effect: what it does (src/ui/folk.js carries it out).
export const GOODS = {
  bed: { name: 'A bed till morning', price: 4, effect: { sleep: true }, note: 'Clean straw, a door that bolts, and Maudie\'s porridge after. You wake at dawn, mended.' },
  ale: { name: "A mug of Hilde's brown", price: 2, effect: { heal: 30 }, note: 'Puts a little life back in you.' },
  roll: { name: 'A warm roll', price: 1, effect: { heal: 14 }, note: 'Eaten on the spot.' },
  loaf: { name: "A loaf, this morning's", price: 3, effect: { heal: 45 }, note: 'Eaten on the spot. Most of it.' },
  dressing: { name: 'Dressed and mended', price: 12, effect: { heal: 9999 }, note: 'Linen, honey and yarrow. Every wound seen to.' },
  candle: { name: 'A tallow candle', price: 1, effect: { light: { secs: 240, r: 7, i: 2.6, c: [1, 0.6, 0.28] } }, note: 'Lit and carried: about four minutes of light in the dark.' },
  oil: { name: 'A flask of lamp oil', price: 3, effect: { light: { secs: 900, r: 10, i: 3.6, c: [1, 0.66, 0.34] } }, note: 'Your lamp filled: about fifteen minutes of light.' },
};

// Things made to order. mats: what it takes from the satchel; gold, besides. Each Soul Ember worked in (up to three) makes it
// a grade finer; with none it's at least uncommon.
// A crafted piece comes as fine as asked for, and now and then a grade finer.
const grade = (rng, r) => Math.min(4, r + (rng() < 0.12 ? 1 : 0));
export const CRAFTS = {
  staff: { name: 'Forge a staff', mats: { iron: 6 }, gold: 40, make: (rng, r) => rollWeapon(rng, { rarity: grade(rng, r) }) },
  shield: { name: 'Forge a kite shield', mats: { iron: 5 }, gold: 30, make: (rng, r) => rollShield(rng, { minRarity: Math.min(3, r) }) },
  skull: { name: 'Carve a skull', mats: { bone: 8 }, gold: 30, make: (rng, r) => rollSkull(rng, { rarity: grade(rng, r) }) },
  hat: { name: 'Sew a hat or a hood', mats: { silk: 3 }, gold: 15, make: (rng, r) => sewn(rng, r, 'head') },
  robe: { name: 'Sew a robe or a coat', mats: { silk: 6 }, gold: 30, make: (rng, r) => sewn(rng, r, 'chest') },
  mantle: { name: 'Sew a mantle or a cape', mats: { silk: 3 }, gold: 15, make: (rng, r) => sewn(rng, r, 'shoulders') },
  trousers: { name: 'Sew trousers', mats: { silk: 4 }, gold: 20, make: (rng, r) => sewn(rng, r, 'legs') },
  boots: { name: 'Make boots', mats: { silk: 3 }, gold: 15, make: (rng, r) => sewn(rng, r, 'feet') },
  grave_candle: { name: 'A grave candle', mats: { wax: 3 }, gold: 0, use: { light: { secs: 1800, r: 12, i: 4.2, c: [1, 0.82, 0.55] } }, note: 'Burns half an hour, and bright: for the deep places.' },
};
export const MAX_EMBERS = 3;

function sewn(rng, rarity, slot) {
  const bases = Object.keys(ROBES).filter((b) => ROBES[b].slot === slot);
  const r = Math.min(grade(rng, rarity), RARITIES.length - 2);
  const fit = bases.filter((b) => ({ ash: 0, moss: 0, night: 1, crimson: 2, amethyst: 3 })[ROBES[b].palette] <= r);
  return rollRobe(rng, { base: fit[Math.floor(rng() * fit.length)], rarity: r });
}

// Each trade: goods it always has; stock, rolled each morning; what it buys back, and at what share of its worth; what it
// makes, once `unlock` (a quest) is done. hours: when it's open, besides its keeper being at their work.
export const TRADES = {
  inn: { label: 'I need a bed.', goods: ['bed'] },
  scrolls: { label: 'Show me your scrolls.', stock: 'scrolls', hours: [7, 20] },
  candles: { label: 'I need light.', goods: ['candle', 'oil'], crafts: ['grave_candle'] },
  curios: { label: "Let's see the stall.", stock: 'curios', buys: 'any', share: 0.25 },
  staffs: { label: 'Show me your staffs.', stock: 'staffs', buys: ['weapon', 'shield'], share: 0.35, crafts: ['staff', 'shield'], unlock: 'iron_from_dead' },
  ale: { label: 'A mug of ale.', goods: ['ale'] },
  robes: { label: 'Show me your robes.', stock: 'robes', buys: ['robe'], share: 0.35, crafts: ['robe', 'hat', 'mantle', 'trousers', 'boots'], unlock: 'shroud_and_thread' },
  skulls: { label: 'Show me your skulls.', stock: 'skulls', buys: ['skull'], buysMats: { bone: 3 }, share: 0.35, crafts: ['skull'], unlock: 'bones_for_carver' },
  bread: { label: 'Some bread.', goods: ['roll', 'loaf'] },
  healing: { label: "I'm hurt.", goods: ['dressing'] },
};

const hashOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// The morning's stock. known: the spells the player has already (no use selling them those).
export function rollStock(trade, day, known = new Set()) {
  const rng = makeRng(hashOf(`${trade}:${day}`));
  // A town's wares: common and uncommon mostly, a rare now and then. The finest things are down among the dead.
  const low = () => ({ rarity: rng() < 0.62 ? 0 : 1 }), good = () => ({ rarity: rng() < 0.7 ? 1 : 2 });
  switch (TRADES[trade]?.stock) {
    case 'staffs': return [rollWeapon(rng, low()), rollWeapon(rng, low()), rollWeapon(rng, good()), rollWeapon(rng, good()), rollShield(rng, {})];
    case 'robes': return [rollRobe(rng, low()), rollRobe(rng, low()), rollRobe(rng, good()), rollRobe(rng, good())];
    case 'skulls': return [rollSkull(rng, low()), rollSkull(rng, good()), rollSkull(rng, good())];
    case 'curios': {
      const r = rng(), odd = r < 0.34 ? rollWeapon(rng, low()) : r < 0.67 ? rollSkull(rng, low()) : rollRobe(rng, low());
      return [rollGem(rng), rollGem(rng), rollGem(rng), rollGem(rng), odd];
    }
    case 'scrolls': {
      const left = SPELLS.map((_, i) => i).filter((i) => !known.has(i));
      const out = [];
      while (out.length < 2 && left.length) out.push({ type: 'spell', spell: left.splice(Math.floor(rng() * left.length), 1)[0], rarity: 2 });
      return out;
    }
    default: return [];
  }
}

// Whether a trade will buy this, and for how much (copper).
export function offerFor(trade, item) {
  const t = TRADES[trade];
  if (!t?.buys) return 0;
  if (t.buys !== 'any' && !t.buys.includes(item.type)) return 0;
  return Math.max(10, Math.round(worth(item) * (t.share || 0.25)) * 10);
}

export const priceText = (copper) => {
  const g = Math.floor(copper / 10), c = copper % 10;
  return g && c ? `${g} gold ${c} copper` : g ? `${g} gold` : `${c} copper`;
};
export const matsText = (mats) => Object.entries(mats).map(([k, n]) => `${n} ${n === 1 ? MATS[k].name : MATS[k].plural}`).join(', ');
