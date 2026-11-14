// The Tripo monsters (tools/monsters, assets/monsters/tripo, the bestiary in monsters.html): what each kind is in a fight, and
// where they live. Both threads read this; the per-model facts (height, moves, breath, hover, weapons) are in roster.json.
//
// There are too many to keep them all built, so a few slots in the character list (TRIPO_SLOTS, after the town knights) take
// whoever lives at the lairs you're near. A slot's model is fetched when it's first wanted and kept for a while (src/sim/tripo.js
// on the sim thread, src/gfx/tripo-slots.js on the render thread). Each one wears a palette from palettes.json, baked into its
// colour map when it's built.

import { WILD_VARIANTS, battleLairs, outpostLair } from './wilds.js';
import { BATTLES, OUTPOSTS } from './wilds-data.js';

export const TRIPO_BASE = 'assets/monsters/tripo/';
export const TRIPO_SLOTS = 12;
// C.KIND of the first group; the rest follow in GROUPS' order (the HUD's FOE_NAMES in src/main.js).
export const TRIPO_KIND = 11;

// By the bestiary's group. hp, damage, speed (m/s at a run), reach (m from the middle). ai: how it fights (src/sim/tripo.js).
// loot: what it leaves (rollLoot in src/items/items.js: 5 the rank and file, 6 something better, 7 a caster's, 8 a champion's).
export const GROUPS = {
  Goblins: { name: 'GOBLIN', hp: 55, damage: 8, speed: 4.8, reach: 1.5, ai: 'melee', loot: 5 },
  Kobolds: { name: 'KOBOLD', hp: 48, damage: 7, speed: 5.0, reach: 1.4, ai: 'melee', loot: 5 },
  'Dead Children': { name: 'DEAD CHILD', hp: 38, damage: 6, speed: 4.2, reach: 1.2, ai: 'melee', loot: 5 },
  'The Possessed': { name: 'THE POSSESSED', hp: 75, damage: 11, speed: 4.4, reach: 1.6, ai: 'melee', loot: 5 },
  'Haunted Mannequins': { name: 'HAUNTED MANNEQUIN', hp: 90, damage: 13, speed: 5.6, reach: 1.6, ai: 'stalker', loot: 5 },
  'Giant Spiders': { name: 'GIANT SPIDER', hp: 70, damage: 10, speed: 6.0, reach: 1.7, ai: 'melee', loot: 5 },
  'Goat Men': { name: 'GOAT MAN', hp: 150, damage: 17, speed: 4.4, reach: 2.2, ai: 'melee', loot: 6 },
  Werewolf: { name: 'WEREWOLF', hp: 170, damage: 17, speed: 5.4, reach: 2.3, ai: 'melee', loot: 6 },
  Harpies: { name: 'HARPY', hp: 85, damage: 12, speed: 6.5, reach: 1.9, ai: 'flyer', loot: 6 },
  Dragonlings: { name: 'DRAGONLING', hp: 120, damage: 13, speed: 5.0, reach: 1.9, ai: 'breather', loot: 6, breathRange: 7, breathDps: 14 },
  'Plague Knights': { name: 'PLAGUE KNIGHT', hp: 170, damage: 18, speed: 3.8, reach: 2.3, ai: 'melee', loot: 6 },
  "Velscour's Knights": { name: 'KNIGHT OF VELSCOUR', hp: 200, damage: 20, speed: 3.8, reach: 2.5, ai: 'melee', loot: 6 },
  'Night Paralysis Demons': { name: 'NIGHT DEMON', hp: 240, damage: 22, speed: 5.2, reach: 2.7, ai: 'stalker', loot: 6 },
  Necromancers: { name: 'NECROMANCER', hp: 95, damage: 9, speed: 3.4, reach: 1.6, ai: 'caster', loot: 7 },
  'Plague Giants': { name: 'PLAGUE GIANT', hp: 340, damage: 28, speed: 2.8, reach: 3.4, ai: 'melee', loot: 8 },
  'Bone Giants': { name: 'BONE GIANT', hp: 420, damage: 32, speed: 2.6, reach: 3.8, ai: 'melee', loot: 1 },
  'Giant Worms': { name: 'GIANT WORM', hp: 520, damage: 26, speed: 3.0, reach: 4.0, ai: 'breather', loot: 1, breathRange: 12, breathDps: 18 },
  Dragons: { name: 'DRAGON', hp: 1100, damage: 38, speed: 5.5, reach: 4.6, ai: 'breather', loot: 0, breathRange: 16, breathDps: 26 },
};
export const GROUP_KEYS = Object.keys(GROUPS);
export const kindOfGroup = (g) => TRIPO_KIND + GROUP_KEYS.indexOf(g);
// One model's own changes from its group's.
// (loot: what it drops and the experience it's worth, by drops.js and src/items/levels.js XP_OF: 5 the rank and file, 6 and 7
// more, 8 a champion's, 1 a great beast's, 0 a dragon's hoard, as Velscour's black knight leaves.)
export const MODEL_STATS = {
  flesh_spider_demon: { name: 'FLESH DEMON', hp: 260, damage: 22, speed: 4.6, reach: 2.4, loot: 8 },
  harpy_queen: { name: 'HARPY QUEEN', hp: 150, damage: 16 },
  necromancer_lord: { name: 'NECROMANCER LORD', hp: 170, damage: 13, loot: 8 },
  necromancer_lord_2: { name: 'NECROMANCER LORD', hp: 170, damage: 13, loot: 8 },
  skeleton_knight_giant: { name: 'BONE KNIGHT', hp: 460 },
  velscour_lancer: { name: 'LANCER OF VELSCOUR', reach: 3.2 },
  // (his look-alikes, tools/monsters/knight_variants.py, and the possessed knights, tools/monsters/possessed_knights.py:
  // a villager's head on a knight's shoulders, a champion's life and loot even at a man's height)
  velscour_lancer_2: { name: 'LANCER OF VELSCOUR', reach: 3.2 },
  velscour_lancer_3: { name: 'LANCER OF VELSCOUR', reach: 3.2 },
  possessed_knight_1: { name: 'POSSESSED KNIGHT', hp: 320, damage: 24, loot: 8 },
  possessed_knight_2: { name: 'POSSESSED KNIGHT', hp: 320, damage: 24, loot: 8 },
  possessed_knight_3: { name: 'POSSESSED LANCER', hp: 320, damage: 24, reach: 3.2, loot: 8 },
  werebat: { name: 'WEREBAT', hp: 130, damage: 15 },
};
// The Hollowfang Warrens' bosses (src/core/dungeon.js), and the dragon's whelps: bigger copies of the rank and file, each
// with a palette of its own. Added to roster.json's models as each thread loads it (withVariants), after them, so both threads
// count them the same. src: the model they're made from; height: theirs; the rest from the model's own entry.
export const VARIANTS = {
  hf_grubnash: { src: 'kobold_armored_3', height: 2.7, name: 'GRUBNASH THE TUNNEL-KING' },
  hf_skrit: { src: 'goblin_red_armored_1', height: 2.1, name: 'SKRIT' },
  hf_skrat: { src: 'goblin_green_armored_2', height: 2.1, name: 'SKRAT' },
  hf_venomaw: { src: 'dragon_green', height: 6.2, name: 'VENOMAW' },
  hf_whelp: { src: 'dragonling_black', height: 1.25, name: 'VENOMAW WHELP' },
  // Blackvigil Keep's (src/core/delve-blackvigil.js): the Warden, the Hollow Brothers and the Castellan are the possessed
  // knights, a villager's head on a knight's body, grown to half as tall again (alt: the plain knight each is made on,
  // for a roster that hasn't them); the Magister is a necromancer lord.
  bv_maldrec: { src: 'possessed_knight_1', alt: 'velscour_knight_1', height: 2.9, name: 'SER MALDREC THE HOLLOW' },
  bv_sorvane: { src: 'necromancer_lord', height: 2.5, name: 'MAGISTER SORVANE' },
  bv_garrow: { src: 'possessed_knight_2', alt: 'velscour_knight_2', height: 2.7, name: 'SER GARROW' },
  bv_gault: { src: 'possessed_knight_3', alt: 'velscour_lancer', height: 2.7, name: 'SER GAULT' },
  bv_castellan: { src: 'possessed_knight_1', alt: 'velscour_knight_1', height: 3.4, name: 'THE CASTELLAN OF BLACKVIGIL' },
  // The Howling Deeps' (src/core/delve-deeps.js): the Goat-King, the Brood Mother and her spiderlings, the Sleeper.
  hd_hrymgar: { src: 'goatman_black', height: 3.1, name: 'HRYMGAR THE GOAT-KING' },
  hd_broodmother: { src: 'spider_black', height: 2.9, name: 'THE BROOD MOTHER' },
  hd_spiderling: { src: 'spider_red', height: 0.7, name: 'SPIDERLING' },
  hd_sleeper: { src: 'night_demon_blue', height: 3.7, name: 'THE SLEEPER UNDER THE ICE' },
  // The Drowned Vaults' (src/core/delve-vaults.js): the Bloat, Mother Sallow, the Leviathan and its spawn.
  dv_bloat: { src: 'plague_giant_1', height: 4.4, name: 'THE BLOAT' },
  dv_sallow: { src: 'possessed_woman_2', height: 2.8, name: 'MOTHER SALLOW' },
  dv_leviathan: { src: 'worm_2', height: 6.4, name: 'THE LEVIATHAN OF THE MILE' },
  dv_spawn: { src: 'worm_1', height: 1.7, name: 'MIRE-SPAWN' },
  // The Sporehold's (src/core/delve-sporehold.js): Mouldfang and his hounds, Mother Morel and her sporelings, the Heart
  // and the husks rooted round it.
  sh_mouldfang: { src: 'werewolf_brown', height: 3.3, name: 'MOULDFANG' },
  sh_hound: { src: 'werewolf_brown', height: 1.7, name: 'MOULD HOUND' },
  sh_morel: { src: 'necromancer_f2', height: 2.5, name: 'MOTHER MOREL' },
  sh_sporeling: { src: 'kobold_1', height: 0.85, name: 'SPORELING' },
  sh_heart: { src: 'plague_giant_armored', height: 5, name: 'THE HEART OF THE RING' },
  sh_husk: { src: 'mannequin_3', height: 2.3, name: 'ROOTED HUSK' },
  // The Hollow Playhouse's (src/core/delve-playhouse.js): the Seamstress, the Leading Man and his understudies, the
  // Dollmaker and her dolls.
  ph_seamstress: { src: 'mannequin_2', height: 2.9, name: 'THE SEAMSTRESS' },
  ph_lead: { src: 'mannequin_1', height: 3.1, name: 'THE LEADING MAN' },
  ph_understudy: { src: 'mannequin_1', height: 1.9, name: 'UNDERSTUDY' },
  ph_dollmaker: { src: 'necromancer_lord_2', height: 2.8, name: 'THE DOLLMAKER' },
  ph_doll: { src: 'zombie_girl_1', height: 0.9, name: 'DOLL' },
  // The Kingsbarrow's (src/core/delve-kingsbarrow.js): the Gravewarden, the Ossuary Golem and what it falls into, the
  // king's hounds, and Ossivar.
  kb_warden: { src: 'skeleton_knight_giant', height: 4.3, name: 'THE GRAVEWARDEN' },
  kb_golem: { src: 'bone_golem', height: 4.7, name: 'THE OSSUARY GOLEM' },
  kb_thrall: { src: 'bone_golem', height: 2, name: 'BONE THRALL' },
  kb_hound: { src: 'werewolf_brown', height: 1.9, name: 'BARROW HOUND' },
  kb_wyrm: { src: 'dragon_undead', height: 6.4, name: 'OSSIVAR' },
};
// And the land's new kinds (src/core/wilds.js): a palette, a size, a name and tricks of their own on the old bodies.
Object.assign(VARIANTS, WILD_VARIANTS);
export function withVariants(roster) {
  for (const [id, v] of Object.entries(VARIANTS)) {
    const src = roster[v.src] ? v.src : v.alt;
    if (roster[src] && !roster[id]) roster[id] = { ...roster[src], ...v, src, id };
  }
  return roster;
}

// What's in a monster's hands crosses to the render thread in its C_HERO block (a Tripo slot is no hero): 1 + the weapon's place
// in armIds(roster), 0 for an empty hand.
export const ARMS = { RIGHT: 14, LEFT: 15 };
export const armIds = (roster) => [...new Set(Object.values(roster).flatMap((m) => [...(m.arms?.right || []), ...(m.arms?.left || [])]))];
// Each breath's element (src/sim/spells.js ELEM).
export const BREATH_ELEM = { fire: 0, poison: 9, rot: 6, acid: 9 };

// Where they live: x, z, how far they stand apart (r), who (pick: each one drawn from these; boss: one of these first), how many,
// and which palettes (palettes.json) they may wear. wake: how close you come before they're stood there.
// Velscour's knights keep to his own country, the Ashen Waste, a long way from Tessariel's places (the two-letter rule).
const GOBLINS = ['goblin_green_1', 'goblin_green_2', 'goblin_green_3', 'goblin_green_armored_1', 'goblin_green_armored_2'];
const RED_GOBLINS = ['goblin_red_1', 'goblin_red_2', 'goblin_red_3', 'goblin_red_armored_1', 'goblin_red_armored_2'];
const KOBOLDS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2', 'kobold_armored_3'];
const CHILDREN = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
const POSSESSED = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const MANNEQUINS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const GOATS = ['goatman_bw', 'goatman_gold_bad', 'goatman_white', 'goatman_black'];
const SPIDERS = ['spider_black', 'spider_red'];
const NECROS = ['necromancer_2', 'necromancer_3', 'necromancer_f1', 'necromancer_f2'];
const DEMONS = ['night_demon_black', 'night_demon_blue', 'night_demon_red'];
// Velscour's knights, and the possessed lords who lead them: every body there may be of each (tools/monsters adds to them).
// A lair's lists are thinned to what the roster holds when it's stood up (lairFor), so naming one that isn't made yet is safe.
const VKNIGHTS = ['velscour_knight_1', 'velscour_knight_2', 'velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
const VLANCERS = ['velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'];
const VLORDS = ['possessed_knight_1', 'possessed_knight_2', 'possessed_knight_3'].concat(VLANCERS);

export const LAIRS = [
  // The Darkwood, round Bellmourn.
  { key: 'werewolf', x: 40, z: 160, r: 2, boss: ['werewolf_brown'], n: 0, pal: ['Base'] },
  { key: 'nest', x: -150, z: 150, r: 6, boss: ['flesh_spider_demon'], pick: SPIDERS, n: 3, pal: ['Base', 'Base', 'Bloodsoaked', 'Ashen'] },
  { key: 'goblin_camp', x: -185, z: -105, r: 7, pick: GOBLINS, n: 4, pal: ['Base', 'Base', 'Blighted', 'Ashen'] },
  { key: 'kobold_den', x: 175, z: -160, r: 6, pick: KOBOLDS, n: 4, pal: ['Base', 'Base', 'Infernal', 'Abyssal'] },
  { key: 'lost_children', x: -215, z: 95, r: 6, pick: CHILDREN, n: 4, pal: ['Base', 'Ashen', 'Bone-white'] },
  { key: 'goat_ring', x: 150, z: 205, r: 6, pick: GOATS, n: 3, pal: ['Base', 'Base', 'Ashen'] },
  // The Green Downs.
  { key: 'mill_dolls', x: 1835, z: 380, r: 5, pick: MANNEQUINS, n: 3, pal: ['Base', 'Bone-white'] },
  { key: 'falls_drake', x: 2700, z: -300, r: 4, boss: ['dragonling_black'], pick: GOBLINS, n: 2, pal: ['Base', 'Infernal'] },
  // The Weeping Fen.
  { key: 'sallow_drowned', x: -253, z: -3281, r: 8, pick: POSSESSED.concat(CHILDREN), n: 5, pal: ['Base', 'Blighted', 'Abyssal'] },
  { key: 'fen_worm', x: 309, z: -2951, r: 4, boss: ['worm_1'], n: 0, pal: ['Base', 'Blighted'], wake: 140 },
  { key: 'fen_harpies', x: -560, z: -3830, r: 9, pick: ['harpy_undead_1', 'harpy_undead_2'], n: 3, pal: ['Base', 'Blighted', 'Ashen'] },
  { key: 'fen_dragon', x: -980, z: -4080, r: 4, boss: ['dragon_green'], n: 0, pal: ['Base'], wake: 200 },
  // The Rustwood.
  { key: 'cutter_raiders', x: 4640, z: -1360, r: 8, pick: RED_GOBLINS, n: 5, pal: ['Base', 'Base', 'Infernal'] },
  { key: 'fungal_brood', x: 2900, z: -4300, r: 8, boss: ['flesh_spider_demon'], pick: SPIDERS.concat(KOBOLDS), n: 4, pal: ['Base', 'Blighted', 'Corrupted'] },
  { key: 'abbey_road_goats', x: 3300, z: -2000, r: 6, pick: GOATS.concat(['goatman_gold_good']), n: 3, pal: ['Base', 'Infernal'] },
  // The Ashen Waste: Velscour's own.
  { key: 'vigil_guard', x: -4620, z: 40, r: 9, boss: ['velscour_lancer'], pick: ['velscour_knight_1', 'velscour_knight_2'], n: 3, pal: ['Base'] },
  { key: 'obelisk_guard', x: -4640, z: -2540, r: 8, pick: ['velscour_knight_1', 'velscour_knight_2', 'velscour_lancer'], n: 3, pal: ['Base'] },
  { key: 'bone_field', x: -4460, z: -1960, r: 10, boss: ['skeleton_knight_giant', 'bone_golem'], pick: ['plague_knight_black', 'plague_knight_red'], n: 2, pal: ['Base', 'Ashen', 'Bone-white'] },
  { key: 'ash_dragon', x: -4260, z: -420, r: 4, boss: ['dragon_black'], n: 0, pal: ['Base'], wake: 200 },
  { key: 'ash_worm', x: -3980, z: -1250, r: 4, boss: ['worm_2'], n: 0, pal: ['Base', 'Ashen'], wake: 140 },
  // The Sorrowhorn.
  { key: 'crown_dragon', x: -2560, z: -2960, r: 4, boss: ['dragon_red'], n: 0, pal: ['Base'], wake: 220 },
  { key: 'stair_demons', x: -1600, z: -1840, r: 7, pick: DEMONS, n: 2, pal: ['Base', 'Abyssal'] },
  // The Deepwood.
  { key: 'hollow_dolls', x: -1330, z: -1460, r: 6, pick: MANNEQUINS.concat(POSSESSED), n: 4, pal: ['Base', 'Ashen'] },
  // The Barrow Moor.
  { key: 'barrow_lords', x: -2900, z: 3260, r: 9, boss: ['necromancer_lord', 'necromancer_lord_2'], pick: NECROS.concat(CHILDREN), n: 4, pal: ['Base', 'Ashen', 'Corrupted'] },
  { key: 'barrow_wyrm', x: -2740, z: 3600, r: 5, boss: ['dragon_undead'], pick: ['dragonling_undead'], n: 1, pal: ['Base'], wake: 200 },
  { key: 'maiden_coven', x: -1960, z: 4340, r: 7, pick: NECROS, n: 3, pal: ['Base', 'Abyssal', 'Infernal'] },
  // The Rimeholt Fells.
  { key: 'fell_harpies', x: 920, z: 4120, r: 9, boss: ['harpy_queen'], pick: ['harpy_warrior'], n: 3, pal: ['Base', 'Bone-white', 'Abyssal'] },
  // The Gallowswood.
  { key: 'gallows_plague', x: 4020, z: 3080, r: 9, boss: ['plague_giant_armored'], pick: ['plague_knight_black', 'plague_knight_red', 'plague_giant_1', 'plague_giant_2'], n: 3, pal: ['Base', 'Blighted', 'Bloodsoaked'] },
  { key: 'grawl_bats', x: 4740, z: 1680, r: 6, boss: ['werebat'], pick: ['dragonling_black'], n: 1, pal: ['Base', 'Bloodsoaked'] },
  { key: 'grove_demons', x: 3140, z: 4440, r: 8, pick: DEMONS.concat(MANNEQUINS), n: 4, pal: ['Base', 'Abyssal', 'Corrupted'] },
  // ---- The land filled in: something living at or near every place that isn't a safe town, and beside every road every
  // few hundred metres to a kilometre, off to one side where a traveller sees it (never on the road). Each country has its
  // own; they're fewer and weaker near Bellmourn, more and worse far out, and the far ones have their kinds' tricks.
  // Stood with tools/monsters/place-lairs.mjs, which keeps them off the roads, the places, the water and the steep ground,
  // Velscour's knights half a kilometre from any seal, and no spot's neighbours more than the twelve slots can stand up.
  // The Darkwood's edges: past the town's own woods, toward the countries.
  { key: 'dark_goblins_nw', x: -582, z: -451, r: 7, boss: ['goblin_green_armored_2'], pick: GOBLINS, n: 4, pal: ['Base', 'Base', 'Blighted'] },
  { key: 'dark_spiders_ne', x: 472, z: -509, r: 6, pick: SPIDERS, n: 3, pal: ['Base', 'Ashen'] },
  { key: 'dark_goats_e', x: 461, z: 732, r: 6, pick: GOATS, n: 3, pal: ['Base', 'Ashen'] },
  { key: 'dark_children_s', x: -367, z: 574, r: 6, pick: CHILDREN, n: 3, pal: ['Base', 'Bone-white'] },
  { key: 'dark_wolf_w', x: -792, z: 559, r: 3, boss: ['werewolf_brown'], n: 0, pal: ['Ashen'] },
  // Beside the roads out of Bellmourn, while they're still under the pines: a few of something, off to one side.
  { key: 'hill_kobolds', x: 741, z: 86, r: 5, pick: KOBOLDS, n: 3, pal: ['Base'] },
  { key: 'hill_goblins', x: 1047, z: -6, r: 5, pick: GOBLINS, n: 3, pal: ['Base', 'Blighted'] },
  { key: 'frost_kobolds', x: 75, z: 491, r: 5, pick: KOBOLDS, n: 3, pal: ['Base', 'Abyssal'] },
  { key: 'frost_spiders', x: 38, z: 1109, r: 6, pick: SPIDERS, n: 3, pal: ['Base', 'Bone-white'] },
  { key: 'frost_wolf', x: 301, z: 1860, r: 3, boss: ['werewolf_brown'], n: 0, pal: ['Bone-white'] },
  { key: 'fenway_goblins', x: 70, z: -480, r: 5, pick: GOBLINS, n: 3, pal: ['Base'] },
  { key: 'fenway_spiders', x: -78, z: -1109, r: 6, pick: SPIDERS, n: 2, pal: ['Blighted'] },
  { key: 'vigil_kobolds', x: -550, z: -159, r: 5, pick: KOBOLDS, n: 3, pal: ['Base', 'Infernal'] },
  { key: 'vigil_goats', x: -1169, z: -5, r: 5, pick: ['goatman_bw', 'goatman_black'], n: 2, pal: ['Base'] },
  { key: 'vigil_children', x: -1713, z: -174, r: 6, pick: CHILDREN, n: 3, pal: ['Ashen'] },
  { key: 'track_children', x: -448, z: 1355, r: 6, pick: CHILDREN, n: 4, pal: ['Base', 'Ashen'] },
  // The Green Downs: raiders by the roads, the keepers at the Cairnfield, harpies under the cliff; and round Thornwick, goat men
  // on the downs (the Black Ram their champion) and the plague's stragglers come up out of the Gallowswood.
  { key: 'cairn_keepers', x: 1276, z: -358, r: 6, boss: ['necromancer_2'], pick: CHILDREN, n: 3, pal: ['Base', 'Bone-white'] },
  { key: 'downs_raiders', x: 1453, z: 181, r: 7, pick: ['goblin_green_armored_1', 'goblin_green_armored_2', 'goblin_green_2'], n: 4, pal: ['Base', 'Blighted'] },
  { key: 'abbey_rd_goblins', x: 1693, z: -275, r: 5, pick: GOBLINS, n: 3, pal: ['Base'] },
  { key: 'gallows_rd_goblins', x: 1264, z: 478, r: 4, pick: GOBLINS, n: 2, pal: ['Base', 'Ashen'] },
  { key: 'cliff_harpies', x: 2563, z: 424, r: 8, pick: ['harpy_warrior'], n: 3, pal: ['Base', 'Bone-white'] },
  { key: 'downs_goats', x: 1784, z: 1321, r: 5, pick: ['goatman_white', 'goatman_bw'], n: 2, pal: ['Base'] },
  { key: 'thorn_goats', x: 2183, z: 1514, r: 7, pick: GOATS, n: 3, pal: ['Base'] },
  { key: 'thorn_ram', x: 2067, z: 2064, r: 6, boss: ['goatman_black'], pick: ['goatman_bw', 'goatman_gold_bad'], n: 2, pal: ['Base', 'Abyssal'], tricks: true },
  { key: 'thorn_stragglers', x: 2655, z: 2103, r: 7, pick: ['plague_knight_black', 'plague_knight_red', 'possessed_man_1', 'possessed_woman_1'], n: 4, pal: ['Base', 'Blighted'] },
  // The Weeping Fen: the drowned, along the Fen Way and on the Sunken Mile.
  { key: 'fenway_children', x: 17, z: -1807, r: 6, pick: CHILDREN, n: 3, pal: ['Blighted'] },
  { key: 'fenway_drowned', x: -190, z: -2450, r: 6, pick: POSSESSED, n: 3, pal: ['Blighted', 'Abyssal'] },
  { key: 'mile_drowned', x: -420, z: -2610, r: 8, pick: POSSESSED.concat(CHILDREN), n: 5, pal: ['Blighted', 'Abyssal'] },
  { key: 'fen_east_harpies', x: 720, z: -3120, r: 8, pick: ['harpy_undead_1', 'harpy_undead_2'], n: 3, pal: ['Base', 'Blighted'] },
  { key: 'fen_children', x: -700, z: -3560, r: 7, pick: CHILDREN, n: 4, pal: ['Blighted', 'Bone-white'] },
  // The Rustwood: red goblins (a warband of seven under a champion), kobolds in the quarry, spiders, a werebat.
  { key: 'abbey_rd_raiders', x: 2347, z: -1169, r: 7, pick: RED_GOBLINS, n: 4, pal: ['Base', 'Infernal'] },
  { key: 'quarry_kobolds', x: 2924, z: -1600, r: 7, boss: ['kobold_armored_3'], pick: KOBOLDS, n: 4, pal: ['Base', 'Infernal'] },
  { key: 'rust_bat', x: 3687, z: -2120, r: 4, boss: ['werebat'], n: 0, pal: ['Base'] },
  { key: 'abbey_webs', x: 3637, z: -3083, r: 6, pick: SPIDERS, n: 3, pal: ['Base', 'Bloodsoaked'] },
  { key: 'rust_spiders', x: 4300, z: -2008, r: 7, boss: ['flesh_spider_demon'], pick: SPIDERS, n: 2, pal: ['Corrupted'], tricks: true },
  { key: 'rust_kobolds', x: 4064, z: -1179, r: 6, pick: KOBOLDS, n: 4, pal: ['Infernal', 'Abyssal'] },
  { key: 'rust_warband', x: 3302, z: -3516, r: 9, boss: ['goblin_red_armored_2'], pick: RED_GOBLINS, n: 6, pal: ['Base', 'Infernal', 'Bloodsoaked'], tricks: true },
  // The Deepwood and the Sorrowhorn's foot.
  { key: 'pilgrim_dolls', x: -1083, z: -516, r: 5, pick: MANNEQUINS, n: 2, pal: ['Base'] },
  { key: 'pilgrim_spiders', x: -1123, z: -856, r: 6, pick: SPIDERS, n: 3, pal: ['Base', 'Corrupted'] },
  { key: 'deep_spiders', x: -1877, z: -1343, r: 7, pick: SPIDERS.concat(POSSESSED), n: 4, pal: ['Base', 'Ashen'] },
  { key: 'deep_worm', x: -1751, z: -913, r: 4, boss: ['worm_1'], n: 0, pal: ['Blighted', 'Corrupted'], wake: 140 },
  { key: 'horn_whelps', x: -1969, z: -2304, r: 7, pick: ['dragonling_black'], n: 3, pal: ['Base', 'Infernal'] },
  { key: 'horn_demons', x: -1996, z: -2397, r: 7, pick: DEMONS, n: 3, pal: ['Base', 'Abyssal'], tricks: true },
  // Round Cinderford: its own, come back possessed; the keep's scouts on the ridge (no nearer the village's seal than half a
  // kilometre: the two-letter rule); and the Charred Mill and Khel, where the yard of Khel stopped walking.
  { key: 'cinder_refugees', x: -2341, z: -39, r: 7, pick: POSSESSED, n: 4, pal: ['Ashen'] },
  { key: 'cinder_scouts', x: -2660, z: -440, r: 6, pick: VKNIGHTS, n: 2, pal: ['Base'] },
  { key: 'charmill_possessed', x: -3157, z: -924, r: 7, boss: ['possessed_man_2'], pick: POSSESSED, n: 4, pal: ['Ashen', 'Bloodsoaked'] },
  { key: 'khel_ghouls', x: -3705, z: -812, r: 7, pick: POSSESSED.concat(CHILDREN), n: 4, pal: ['Ashen'] },
  // The Ashen Waste: Velscour's patrols on the Vigil Road, thicker toward Blackvigil, and his own out on the grey ground.
  { key: 'vigil_patrol_1', x: -3200, z: -430, r: 7, pick: VKNIGHTS, n: 3, pal: ['Base'] },
  { key: 'vigil_patrol_2', x: -4246, z: -202, r: 8, boss: VLANCERS, pick: VKNIGHTS, n: 4, pal: ['Base'], tricks: true },
  { key: 'vigil_patrol_3', x: -4457, z: -90, r: 8, boss: VLORDS, pick: VKNIGHTS, n: 5, pal: ['Base'], tricks: true },
  { key: 'keep_necros', x: -4700, z: 368, r: 8, pick: NECROS.concat(['plague_knight_black', 'plague_knight_red']), n: 4, pal: ['Base', 'Infernal'], tricks: true },
  { key: 'waste_lancers', x: -4326, z: -1282, r: 7, pick: VLANCERS, n: 3, pal: ['Base'], tricks: true },
  { key: 'waste_plague', x: -3586, z: -1729, r: 7, pick: ['plague_knight_black', 'plague_knight_red'], n: 3, pal: ['Base', 'Ashen'] },
  { key: 'waste_golem', x: -4889, z: -1170, r: 7, boss: ['bone_golem'], pick: ['skeleton_knight_giant'], n: 1, pal: ['Ashen', 'Bone-white'], tricks: true },
  { key: 'waste_necros', x: -4057, z: -2304, r: 7, boss: ['necromancer_lord', 'necromancer_lord_2'], pick: NECROS, n: 3, pal: ['Base', 'Infernal'], tricks: true },
  // The Barrow Moor.
  { key: 'track_possessed', x: -1080, z: 1900, r: 6, pick: POSSESSED, n: 3, pal: ['Ashen'] },
  { key: 'wayhouse_dead', x: -1820, z: 2330, r: 7, boss: ['necromancer_f1', 'necromancer_3'], pick: CHILDREN, n: 3, pal: ['Base', 'Ashen'] },
  { key: 'moor_golem', x: -2162, z: 2893, r: 7, boss: ['bone_golem'], pick: CHILDREN, n: 2, pal: ['Bone-white', 'Ashen'] },
  { key: 'moor_whelps', x: -2450, z: 3712, r: 7, pick: ['dragonling_undead'], n: 3, pal: ['Base', 'Ashen'] },
  { key: 'moor_knight', x: -1475, z: 3359, r: 7, boss: ['skeleton_knight_giant'], pick: NECROS, n: 1, pal: ['Base', 'Corrupted'], tricks: true },
  // The Rimeholt Fells: white goat men, wolves that stand up, the things at the Howling Mouth, the queen on Ravens' Tor.
  { key: 'rime_goats', x: 382, z: 2771, r: 6, pick: ['goatman_white'], n: 3, pal: ['Base', 'Bone-white'] },
  { key: 'fells_goats', x: 428, z: 3776, r: 7, pick: ['goatman_white', 'goatman_bw'], n: 3, pal: ['Bone-white'] },
  { key: 'fells_wolves', x: -56, z: 3561, r: 5, boss: ['werewolf_brown'], pick: ['werewolf_brown'], n: 1, pal: ['Bone-white', 'Ashen'], tricks: true },
  { key: 'mouth_demons', x: 1025, z: 3867, r: 6, pick: ['night_demon_blue', 'night_demon_black'], n: 2, pal: ['Base', 'Abyssal'], tricks: true },
  { key: 'tor_roost', x: 1493, z: 4516, r: 8, boss: ['harpy_queen'], pick: ['harpy_warrior'], n: 2, pal: ['Base', 'Abyssal'], tricks: true },
  { key: 'tor_demons', x: 1640, z: 4700, r: 6, pick: DEMONS, n: 2, pal: ['Base', 'Bone-white'], tricks: true },
  // The Gallowswood.
  { key: 'toll_ambush', x: 3314, z: 2500, r: 7, pick: POSSESSED.concat(MANNEQUINS), n: 5, pal: ['Base', 'Blighted', 'Bloodsoaked'] },
  { key: 'gallows_bat', x: 2967, z: 2384, r: 4, boss: ['werebat'], n: 0, pal: ['Base', 'Bloodsoaked'] },
  { key: 'gallows_demons', x: 3680, z: 2960, r: 6, pick: DEMONS, n: 2, pal: ['Base', 'Corrupted'], tricks: true },
  { key: 'gibbet_possessed', x: 4393, z: 2504, r: 7, pick: POSSESSED, n: 4, pal: ['Blighted', 'Ashen'] },
  { key: 'gallows_giant', x: 3707, z: 3796, r: 8, boss: ['plague_giant_1', 'plague_giant_2'], pick: ['plague_knight_black', 'plague_knight_red'], n: 2, pal: ['Base', 'Blighted'], tricks: true },
];

// The outposts out in the land and the standing battles (src/core/wilds.js, laid by tools/wilds/place.mjs): lairs like any
// other, with a side (who they'll fight where two sides meet), a level, and a quicker return.
for (const o of OUTPOSTS) LAIRS.push(outpostLair(o));
for (const b of BATTLES) LAIRS.push(...battleLairs(b));

// A lair as it can be stood up from this roster: its lists thinned to the models there are (a boss list left empty is no
// boss; a pick list left empty, nobody).
export function lairFor(l, roster) {
  const have = (ids) => (ids || []).filter((id) => roster[id]);
  const boss = have(l.boss), pick = have(l.pick);
  return { ...l, boss: boss.length ? boss : undefined, pick, n: pick.length ? l.n : 0 };
}
