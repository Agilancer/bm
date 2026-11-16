// What playing as one of your party puts on the bar (src/sim/heroplay.js plays it, src/ui/heroplay.js draws it): which
// moves, in what order, what chains into what, and the few moves only a hand plays. Data only, for both threads.
import { MORE_SKILLS, SKILLS } from './heroskills.js';

// What the bar shows for each class: its own moves in order, by key, with what the player-only ones are. The bar is the
// first ten of these the hero has come by (level, and for one of yours their book: mods.known).
// The lancer's is TERA's: block and Shield Counter on the board, Onslaught, Leash, Challenging Shout, Backstep.
export const PLAYER_MOVES = {
  lancer: { leash: { name: 'Leash', cd: 16, range: 18 }, challenging_shout: { name: 'Challenging Shout', cd: 10 }, shield_counter: { name: 'Shield Counter', cd: 3, chainOnly: true } },
  paladin: { shield_counter: { name: 'Shield Counter', cd: 3, chainOnly: true } },
};
// Names the first moves have on the bar (MORE_SKILLS carry their own).
export const FIRST_NAMES = {
  hammer_throw: 'Hammer Throw', blessed_hammers: 'Blessed Hammers', consecration: 'Consecration', holy_light: 'Holy Light', smite: 'Smite',
  charge: 'Onslaught', shield_wall: 'Shield Wall', shield_bash: 'Shield Bash',
  rain_of_arrows: 'Rain of Arrows', volley: 'Volley', strafe: 'Strafe', vanish: 'Vanish', flurry: 'Flurry',
  shadow_step: 'Shadow Step', leaping_kick: 'Leaping Kick', throwing_stars: 'Throwing Stars', ninja_flurry: 'Ninja Flurry',
  spear_barrage: 'Spear Barrage', jump: 'Jump', double_throw: 'Double Throw', war_song: 'War Song', marching_song: 'Marching Song', mending_song: 'Mending Song',
};
// The bar's order for each class: the TERA lancer's first, then the rest as the class reaches for them.
const ORDER = {
  lancer: ['charge', 'shield_bash', 'leash', 'challenging_shout', 'lance_barrage', 'shield_wall', 'sweeping_cleave', 'shield_throw', 'valiant_leap', 'sunspear', 'phalanx_rush', 'tower_shields', 'bulwark_nova', 'lance_of_light', 'spear_wall', 'charge_of_the_order'],
};
// Chains (TERA's Space prompt): after the first, the second may follow at once, for a moment, if it's come by. Its wait is
// cut by CHAIN_CUT. A block that turns a blow offers the board's counter.
export const CHAINS = {
  // (A list: the first of them the hero has on the bar, so a fresh level-1 hero's few moves chain too.)
  lancer: { shield_bash: ['lance_barrage', 'charge'], lance_barrage: 'valiant_leap', charge: ['sweeping_cleave', 'shield_bash'], leash: 'shield_bash', block: 'shield_counter', valiant_leap: 'bulwark_nova', challenging_shout: 'shield_bash' },
  paladin: { zeal: 'smite', smite: ['holy_nova', 'hammer_throw'], crusaders_charge: 'zeal', hammer_throw: ['blessed_shield', 'blessed_hammers'], block: 'shield_counter', consecration: 'smite' },
  archer: { piercing_arrow: 'split_shot', volley: ['rain_of_arrows', 'strafe'], disengage: 'sniper_shot', strafe: ['guided_arrow', 'volley'] },
  rogue: { flurry: ['rupture', 'vanish'], flip_strike: 'eviscerate', backflip: 'fan_of_knives', vanish: ['flip_strike', 'flurry'] },
  ninja: { shadow_step: ['twin_fangs', 'ninja_flurry'], leaping_kick: 'spin_kick', throwing_stars: ['fire_star', 'shadow_step'], twin_fangs: 'rising_dragon' },
  dragoon: { jump: ['spear_barrage'], dragon_dive: 'sweeping_lance', lance_flurry: 'spearstep', spearstep: 'lance_flurry', spear_barrage: ['lance_flurry', 'jump'] },
  boomerang: { double_throw: ['cross_cut', 'energy_rang'], energy_rang: 'chakram', cross_cut: 'wind_slash' },
  bard: { power_chord: 'echo', fan_of_notes: 'shockwave_riff', war_song: ['power_chord', 'marching_song'] },
};
// The move a chain offers after this one, if the hero has it (on the bar, or one of the player's own).
export function chainOf(cls, key, bar) {
  const n = CHAINS[cls]?.[key];
  for (const k of n == null ? [] : Array.isArray(n) ? n : [n]) if (k !== key && (bar.includes(k) || PLAYER_MOVES[cls]?.[k])) return k;
  return null;
}
export const BAR_SLOTS = 10;
// The party's calls: how long each holds (Wait and To me till another is given; Go and Help for a while).
export const CALLS = ['go', 'come', 'wait', 'help'];

export function barOf(h) {
  const cls = h.person.cls, lvl = h.person.level, known = h.mods?.known;
  const extra = PLAYER_MOVES[cls] || {};
  const firsts = (SKILLS[cls] || []).map((s) => s.key);
  const more = (MORE_SKILLS[cls] || []).filter((s) => s.lvl <= lvl && (!known || (known.has ? known.has(s.key) : known.includes(s.key)))).map((s) => s.key);
  const own = Object.keys(extra).filter((k) => !extra[k].chainOnly);
  const all = [...firsts, ...own, ...more];
  const order = ORDER[cls];
  const keys = order ? [...order.filter((k) => all.includes(k)), ...all.filter((k) => !order.includes(k))] : all;
  return [...new Set(keys)].slice(0, BAR_SLOTS);
}

export function cdOf(cls, key) {
  const own = PLAYER_MOVES[cls]?.[key];
  if (own) return own.cd;
  const s = (SKILLS[cls] || []).find((q) => q.key === key) || (MORE_SKILLS[cls] || []).find((q) => q.key === key);
  // (The AI's waits are long for an AI that never misses one; a hand on the keys gets them a little sooner.)
  return s ? Math.max(1.5, s.cd * 0.75) : 6;
}
