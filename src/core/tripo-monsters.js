// The Tripo monsters (tools/monsters, assets/monsters/tripo, the bestiary in monsters.html): what each kind is in a fight, and
// where they live. Both threads read this; the per-model facts (height, moves, breath, hover, weapons) are in roster.json.
//
// There are too many to keep them all built, so a few slots in the character list (TRIPO_SLOTS, after the town knights) take
// whoever lives at the lairs you're near. A slot's model is fetched when it's first wanted and kept for a while (src/sim/tripo.js
// on the sim thread, src/gfx/tripo-slots.js on the render thread). Each one wears a palette from palettes.json, baked into its
// colour map when it's built.

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
};
export function withVariants(roster) {
  for (const [id, v] of Object.entries(VARIANTS)) if (roster[v.src] && !roster[id]) roster[id] = { ...roster[v.src], ...v, id };
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
];
