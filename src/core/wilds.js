// The living land: who holds what out in the countries, the new kinds of monster made from the old (a palette, a size, a
// name, tricks and spells of their own), the outposts they keep, the tears that open in the world, and what you can meet
// on the way. Shared by every thread; nothing here reads src/core/tripo-monsters.js (which reads this).
//
// Where everything stands is src/core/wilds-data.js, written by `node tools/wilds/place.mjs` (never by hand): the outposts
// with their trails, the tears' spots, the standing battles and the small things to find. README, "The living land".
//
// The two letters (README, "The two sides"): Velscour's own (side 'velscour': his forts and towers, his knights, lancers
// and sorcerers) are placed only in the Ashen Waste, half a kilometre from any seal and 1.5 km from Tessariel's places.
// Nothing here carries a letter or either side's mark; his forts fly plain red, which is his cloth already.

const FIRE = 0, FROST = 1, ARCANE = 2, STORM = 3, DRAIN = 6, BONE = 7, VOID = 8, POISON = 9, STONE = 11;

// ---- new kinds of monster ----------------------------------------------------------------------------------------------
// id: [the model it's made from, its height (m), its name, its palette (assets/monsters/tripo/palettes.json), and what's
// its own: stat (over its group's: hp, damage, speed, reach, loot), ai, bolt (a caster's element), tricks (src/sim/moves.js
// TRICKS' shape: these replace its group's where its lair has tricks on)].
const T = (move, cd, near, far, o, clip) => ({ move, cd, near, far, ...(o ? { o } : {}), ...(clip ? { clip } : {}) });
const ROWS = {
  // Goblins: moss (the Darkwood, the Downs), mire (the fen), ember (the Rustwood), rime (the fells), ash (the Waste).
  w_moss_goblin: ['goblin_green_1', 1.15, 'MOSSBACK GOBLIN', 'Mossback'],
  w_moss_stabber: ['goblin_green_3', 1.3, 'MOSSBACK STABBER', 'Mossback', { stat: { speed: 5.4 } }],
  w_moss_brute: ['goblin_green_armored_1', 1.6, 'MOSSBACK BRUTE', 'Mossback', { stat: { hp: 120, damage: 13, speed: 4.2, reach: 1.8 } }],
  w_bramble_chief: ['goblin_green_armored_2', 1.95, 'BRAMBLE CHIEF', 'Jade', { stat: { hp: 260, damage: 17, reach: 2.1, loot: 8 }, tricks: [T('knifeFan', [5, 8], 3, 18, null, 'atk2'), T('stompRings', [9, 13], 0, 8, null, 'jump')] }],
  w_mire_goblin: ['goblin_green_2', 1.2, 'MIRE GOBLIN', 'Bogblack'],
  w_mire_spitter: ['goblin_green_1', 1.1, 'MIRE SPITTER', 'Drowned', { tricks: [T('spitFan', [5, 8], 3, 16), T('venomCone', [9, 13], 0, 6)] }],
  w_mire_king: ['goblin_green_armored_1', 2.0, 'THE MIRE KING', 'Bogblack', { stat: { hp: 300, damage: 18, reach: 2.2, loot: 8 }, tricks: [T('spitRain', [7, 10], 4, 18, { elem: POISON }), T('venomCone', [8, 12], 0, 7)] }],
  w_ember_goblin: ['goblin_red_1', 1.25, 'EMBERFANG GOBLIN', 'Emberhide'],
  w_ember_bomber: ['goblin_red_3', 1.15, 'EMBERFANG BOMBER', 'Sulphur', { tricks: [T('firepot', [4, 7], 4, 20, null, 'atk1'), T('firepots', [10, 14], 5, 20, null, 'atk1')] }],
  w_ember_brute: ['goblin_red_armored_1', 1.65, 'EMBERFANG BRUTE', 'Emberhide', { stat: { hp: 130, damage: 14, speed: 4.2, reach: 1.8 } }],
  w_ember_warlord: ['goblin_red_armored_2', 2.05, 'EMBERFANG WARLORD', 'Infernal', { stat: { hp: 320, damage: 19, reach: 2.2, loot: 8 }, tricks: [T('fireWheel', [8, 12], 0, 10), T('fireFan', [6, 9], 3, 18, null, 'atk2')] }],
  w_rime_goblin: ['goblin_green_3', 1.2, 'FROST GOBLIN', 'Rimefrost'],
  w_rime_brute: ['goblin_green_armored_2', 1.6, 'FROST GOBLIN BRUTE', 'Rimefrost', { stat: { hp: 130, damage: 14, speed: 4.2, reach: 1.8 } }],
  w_rime_jarl: ['goblin_red_armored_2', 2.0, 'THE ICE-TOOTH', 'Rimefrost', { stat: { hp: 320, damage: 19, reach: 2.2, loot: 8 }, tricks: [T('frostRings', [7, 11], 3, 18), T('knifeFan', [6, 9], 3, 18, { elem: FROST }, 'atk2')] }],
  w_ash_goblin: ['goblin_red_2', 1.2, 'CINDER GOBLIN', 'Ashen'],
  // Kobolds: diggers everywhere, each country its own.
  w_dig_kobold: ['kobold_1', 1.25, 'DELVER KOBOLD', 'Dunehide'],
  w_dig_sapper: ['kobold_3', 1.3, 'KOBOLD SAPPER', 'Sulphur', { tricks: [T('rockLob', [4, 7], 3, 20, null, 'atk1'), T('fissure', [7, 10], 0, 10, null, 'atk3')] }],
  w_dig_guard: ['kobold_armored_1', 1.55, 'KOBOLD PICK-GUARD', 'Ironrust', { stat: { hp: 105, damage: 12, reach: 1.7 } }],
  w_dig_foreman: ['kobold_armored_3', 2.0, 'THE FOREMAN', 'Ironrust', { stat: { hp: 280, damage: 17, reach: 2.1, loot: 8 }, tricks: [T('rockRain', [8, 12], 4, 20), T('fissures', [9, 13], 0, 12, null, 'atk3')] }],
  w_snow_kobold: ['kobold_1', 1.3, 'SNOW KOBOLD', 'Albino'],
  w_snow_trapper: ['kobold_armored_2', 1.5, 'SNOW KOBOLD TRAPPER', 'Rimefrost', { stat: { hp: 95, damage: 11 }, tricks: [T('frostRings', [8, 12], 3, 16), T('rockLob', [6, 9], 3, 18, null, 'atk1')] }],
  w_rust_kobold: ['kobold_3', 1.3, 'RUSTPICK KOBOLD', 'Rust'],
  w_ash_kobold: ['kobold_armored_1', 1.45, 'ASH KOBOLD', 'Ashen', { stat: { hp: 90, damage: 11 } }],
  w_cobalt_shaman: ['kobold_armored_2', 1.5, 'KOBOLD STORM-SHAMAN', 'Cobalt', { ai: 'caster', bolt: STORM, stat: { hp: 110, damage: 10, loot: 7 }, tricks: [T('boltWall', [9, 13], 5, 16, { elem: STORM, width: 9, n: 6 }), T('seekers', [10, 14], 4, 20, { n: 2, elem: STORM })] }],
  // The dead: the barrows', the fen's drowned, the graveyards'.
  w_grave_waif: ['zombie_girl_1', 1.15, 'GRAVE WAIF', 'Wraith'],
  w_grave_urchin: ['zombie_boy_2', 1.2, 'GRAVE URCHIN', 'Gloam'],
  w_barrow_thrall: ['possessed_man_1', 1.85, 'BARROW THRALL', 'Bone-white', { stat: { hp: 110, damage: 13 } }],
  w_barrow_widow: ['possessed_woman_1', 1.75, 'BARROW WIDOW', 'Wraith', { stat: { hp: 95, damage: 12, speed: 5 }, tricks: [T('wailRing', [6, 9], 0, 8)] }],
  w_bone_sentinel: ['skeleton_knight_giant', 2.3, 'BONE SENTINEL', 'Bone-white', { stat: { hp: 230, damage: 20, speed: 3.4, reach: 2.5, loot: 6 } }],
  w_charnel_golem: ['bone_golem', 2.6, 'CHARNEL GOLEM', 'Gravegilt', { stat: { hp: 300, damage: 22, speed: 3, reach: 2.8, loot: 6 } }],
  w_barrow_king: ['skeleton_knight_giant', 4.1, 'THE BARROW KING', 'Gravegilt', { stat: { hp: 640, damage: 34, loot: 8 } }],
  w_bone_drake: ['dragonling_undead', 2.1, 'BONE DRAKE', 'Bone-white', { stat: { hp: 190, damage: 16 } }],
  w_grave_caller: ['necromancer_3', 1.9, 'GRAVE-CALLER', 'Gloam', { bolt: BONE }],
  w_tomb_lord: ['necromancer_lord', 2.45, 'THE TOMB-LORD', 'Gravegilt', { bolt: VOID, stat: { hp: 300, damage: 16, loot: 8 }, tricks: [T('boneMarch', [6, 9], 4, 18, null, 'atk1'), T('seekers', [9, 13], 5, 20, { n: 3, elem: BONE })] }],
  w_drowned: ['possessed_man_2', 1.85, 'DROWNED ONE', 'Drowned'],
  w_drowned_bride: ['possessed_woman_2', 1.75, 'DROWNED BRIDE', 'Drowned', { stat: { speed: 5 }, tricks: [T('venomCone', [6, 9], 0, 6), T('wailRing', [9, 13], 0, 7)] }],
  w_drowned_child: ['zombie_boy_1', 1.15, 'DROWNED CHILD', 'Drowned'],
  w_carrion_harpy: ['harpy_undead_1', 1.9, 'CARRION HARPY', 'Bogblack'],
  w_fen_hag: ['necromancer_f2', 1.85, 'BOG WITCH', 'Bogblack', { bolt: POISON, tricks: [T('spitRain', [7, 10], 4, 18, { elem: POISON }), T('seekers', [10, 14], 5, 20, { n: 2, elem: POISON })] }],
  w_mere_mother: ['harpy_undead_2', 2.7, 'THE MERE-MOTHER', 'Drowned', { stat: { hp: 340, damage: 20, loot: 8 }, tricks: [T('bladeNova', [6, 9], 0, 12), T('wailRing', [8, 12], 0, 9)] }],
  // Spiders.
  w_wood_weaver: ['spider_black', 1.25, 'WOOD WEAVER', 'Mossback'],
  w_spiderling: ['spider_red', 0.6, 'SPIDERLING', 'Base', { stat: { hp: 22, damage: 5, speed: 6.6, reach: 1.1 } }],
  w_frost_weaver: ['spider_black', 1.4, 'FROST WEAVER', 'Rimefrost', { tricks: [T('spitFan', [6, 9], 3, 16, { elem: FROST }), T('frostRings', [10, 14], 0, 9)] }],
  w_ash_widow: ['spider_red', 1.5, 'ASH WIDOW', 'Ashen', { stat: { hp: 100, damage: 14 } }],
  w_rust_stalker: ['spider_red', 1.35, 'RUSTWEB STALKER', 'Rust'],
  w_brood_tyrant: ['flesh_spider_demon', 2.5, 'BROOD TYRANT', 'Nightshade', { stat: { hp: 420, damage: 26, reach: 3, loot: 8 } }],
  w_silk_matron: ['spider_black', 2.4, 'THE SILK MATRON', 'Amethyst', { stat: { hp: 330, damage: 20, reach: 2.6, loot: 8 }, tricks: [T('spitFan', [5, 8], 3, 16), T('threads', [8, 12], 0, 10)] }],
  // Goat men, wolves, bats, harpies.
  w_hill_ram: ['goatman_bw', 2.1, 'HILL RAM', 'Dunehide'],
  w_rime_ram: ['goatman_white', 2.3, 'RIME RAM', 'Rimefrost', { tricks: [T('ram', [7, 10], 4, 14, { elem: FROST }), T('frostRings', [10, 14], 0, 9)] }],
  w_cinder_ram: ['goatman_black', 2.3, 'CINDER RAM', 'Emberhide', { tricks: [T('ram', [7, 10], 4, 14, { elem: FIRE }), T('fireWheel', [11, 15], 0, 9)] }],
  w_gilt_horn: ['goatman_gold_bad', 2.9, 'THE GILT-HORN', 'Gravegilt', { stat: { hp: 380, damage: 24, reach: 2.7, loot: 8 } }],
  w_thunder_ram: ['goatman_gold_good', 2.7, 'THUNDERHOOF', 'Stormhide', { stat: { hp: 340, damage: 22, reach: 2.6, loot: 8 }, tricks: [T('quakeWave', [7, 10], 0, 14, { elem: STORM }, 'jump'), T('ram', [8, 12], 5, 14, { elem: STORM })] }],
  w_dire_wolfkin: ['werewolf_brown', 2.0, 'WOLFKIN', 'Sable', { stat: { hp: 120, damage: 14, speed: 5.8 } }],
  w_white_howler: ['werewolf_brown', 2.6, 'WHITE HOWLER', 'Albino', { stat: { hp: 260, damage: 21, loot: 8 }, tricks: [T('howlWave', [6, 9], 0, 14, { elem: FROST }), T('ram', [8, 11], 5, 14)] }],
  w_blood_moon: ['werewolf_brown', 3.0, 'THE BLOOD-MOON', 'Bloodsoaked', { stat: { hp: 420, damage: 26, reach: 2.9, loot: 8 } }],
  w_dusk_bat: ['werebat', 2.0, 'DUSK BAT', 'Nightshade'],
  w_gallows_bat: ['werebat', 2.8, 'THE GALLOWS-WING', 'Oxblood', { stat: { hp: 330, damage: 22, loot: 8 }, tricks: [T('bladeNova', [6, 9], 0, 12), T('howlWave', [9, 13], 0, 12)] }],
  w_storm_harpy: ['harpy_warrior', 1.9, 'STORM HARPY', 'Stormhide', { tricks: [T('knifeFan', [5, 8], 4, 18, { elem: STORM }), T('bladeNova', [9, 13], 0, 12, { elem: STORM })] }],
  w_cliff_harpy: ['harpy_warrior', 1.75, 'CLIFF HARPY', 'Dunehide'],
  w_gale_queen: ['harpy_queen', 2.6, 'THE GALE-QUEEN', 'Cobalt', { stat: { hp: 330, damage: 21, loot: 8 }, tricks: [T('spiral', [9, 13], 0, 20, { elem: STORM }), T('bladeNova', [6, 9], 0, 12, { elem: STORM })] }],
  // Drakes and worms: the dragons' own young, at half their size, and worms that are not the great ones.
  w_cinder_whelp: ['dragonling_black', 1.4, 'CINDER WHELP', 'Emberhide'],
  w_marsh_drake: ['dragon_green', 2.6, 'MARSH DRAKE', 'Bogblack', { stat: { hp: 420, damage: 24, speed: 4.6, reach: 3, loot: 8 } }],
  w_frost_drake: ['dragon_black', 2.8, 'FROST DRAKE', 'Rimefrost', { stat: { hp: 460, damage: 25, speed: 4.6, reach: 3.1, loot: 8 }, tricks: [T('tailWhip', [8, 12], 0, 7), T('spitRain', [8, 12], 6, 26, { n: 6, R: 7, elem: FROST })] }],
  w_ash_drake: ['dragon_red', 2.8, 'ASH DRAKE', 'Ashen', { stat: { hp: 460, damage: 25, speed: 4.6, reach: 3.1, loot: 8 } }],
  w_sand_worm: ['worm_1', 2.6, 'SAND WORM', 'Dunehide', { stat: { hp: 260, damage: 18, reach: 2.8, loot: 6 } }],
  w_ice_worm: ['worm_2', 2.8, 'ICE WORM', 'Rimefrost', { stat: { hp: 280, damage: 19, reach: 2.9, loot: 6 }, tricks: [T('spitRain', [7, 10], 4, 22, { n: 6, R: 7, elem: FROST })] }],
  w_bog_worm: ['worm_1', 2.4, 'BOG WORM', 'Bogblack', { stat: { hp: 240, damage: 17, reach: 2.7, loot: 6 } }],
  // What walks at night: demons, effigies, scarecrows.
  w_dream_eater: ['night_demon_blue', 2.3, 'DREAM-EATER', 'Nightshade', { stat: { hp: 200, damage: 19 } }],
  w_ember_fiend: ['night_demon_red', 2.5, 'EMBER FIEND', 'Infernal', { tricks: [T('fireWheel', [8, 12], 0, 10), T('seekers', [8, 12], 3, 20, { elem: FIRE })] }],
  w_pale_stalker: ['night_demon_black', 2.4, 'PALE STALKER', 'Albino', { stat: { hp: 210, damage: 20, speed: 5.8 } }],
  w_nightmare: ['night_demon_black', 3.6, 'THE LONG NIGHTMARE', 'Gloam', { stat: { hp: 520, damage: 30, reach: 3.3, loot: 8 } }],
  w_scarecrow: ['mannequin_3', 1.9, 'SCARECROW', 'Ironrust'],
  w_effigy: ['mannequin_1', 1.85, 'HOLLOW EFFIGY', 'Porcelain'],
  w_wicker_man: ['mannequin_2', 3.0, 'THE WICKER MAN', 'Dunehide', { stat: { hp: 380, damage: 24, reach: 2.8, loot: 8 }, tricks: [T('threads', [6, 9], 0, 12), T('fireWheel', [10, 14], 0, 9)] }],
  // The plague's.
  w_plague_taken: ['possessed_man_2', 1.8, 'PLAGUE-TAKEN', 'Blighted'],
  w_plague_nurse: ['possessed_woman_2', 1.7, 'PLAGUE NURSE', 'Sulphur', { ai: 'caster', bolt: POISON, stat: { loot: 7 } }],
  w_pox_knight: ['plague_knight_red', 2.0, 'POX KNIGHT', 'Blighted'],
  w_rot_ogre: ['plague_giant_2', 2.7, 'ROT OGRE', 'Mossback', { stat: { hp: 250, damage: 22, speed: 3.2, reach: 2.9, loot: 6 } }],
  w_pest_lord: ['plague_giant_armored', 4.0, 'THE PESTILENT', 'Blighted', { stat: { hp: 560, damage: 32, loot: 8 } }],
  // Cults: people who chose it. Each one's bolt is its element.
  w_ash_cultist: ['possessed_man_1', 1.8, 'ASH CULTIST', 'Sable', { stat: { hp: 80, damage: 11 } }],
  w_ash_zealot: ['possessed_woman_1', 1.72, 'ASH ZEALOT', 'Oxblood', { ai: 'caster', bolt: FIRE, stat: { hp: 80, loot: 7 } }],
  w_pyromancer: ['necromancer_3', 1.9, 'PYROMANCER', 'Emberhide', { bolt: FIRE, tricks: [T('firepots', [7, 10], 4, 20, null, 'atk1'), T('fireFan', [6, 9], 3, 18, null, 'atk2')] }],
  w_rime_witch: ['necromancer_f1', 1.8, 'RIME WITCH', 'Rimefrost', { bolt: FROST, tricks: [T('frostRings', [6, 9], 4, 20, null, 'atk2'), T('seekers', [10, 14], 5, 20, { n: 2, elem: FROST })] }],
  w_storm_caller: ['necromancer_2', 1.9, 'STORM-CALLER', 'Cobalt', { bolt: STORM, tricks: [T('boltWall', [8, 12], 5, 16, { elem: STORM, width: 10, n: 7 }), T('spiral', [12, 16], 0, 18, { elem: STORM })] }],
  w_hedge_warlock: ['necromancer_2', 1.85, 'HEDGE WARLOCK', 'Amethyst', { bolt: ARCANE }],
  w_stone_seer: ['necromancer_f1', 1.85, 'STONE-SEER', 'Dunehide', { bolt: STONE, tricks: [T('rockRain', [7, 10], 4, 20), T('fissures', [9, 13], 0, 14, null, 'atk3')] }],
  w_hierophant: ['necromancer_lord_2', 2.5, 'THE HIEROPHANT OF ASH', 'Oxblood', { bolt: FIRE, stat: { hp: 320, damage: 17, loot: 8 }, tricks: [T('spiral', [8, 12], 0, 22, { elem: FIRE }), T('firepots', [6, 9], 4, 20, null, 'atk1'), T('seekers', [10, 14], 5, 20, { n: 3, elem: FIRE })] }],
  // Velscour's own, in the Waste only: a sergeant over his patrols, his sorcerers, his tower captains.
  w_vigil_sergeant: ['velscour_knight_3', 2.3, 'SERGEANT OF THE VIGIL', 'Sable', { stat: { hp: 320, damage: 24, loot: 8 } }],
  w_vigil_sorcerer: ['necromancer_2', 1.95, 'SORCERER OF THE VIGIL', 'Sable', { bolt: DRAIN, tricks: [T('bloodLance', [6, 9], 3, 18, null, 'atk1'), T('seekers', [9, 13], 5, 20, { n: 2, elem: DRAIN })] }],
  w_vigil_magister: ['necromancer_lord', 2.4, 'MAGISTER OF THE VIGIL', 'Oxblood', { bolt: VOID, stat: { hp: 300, damage: 17, loot: 8 }, tricks: [T('boltWall', [8, 12], 5, 16, { elem: DRAIN, width: 12, n: 8 }), T('seekers', [8, 12], 5, 20, { n: 3, elem: VOID })] }],
  w_tower_captain: ['velscour_lancer_2', 2.5, 'CAPTAIN OF THE VIGIL', 'Oxblood', { stat: { hp: 380, damage: 26, reach: 3.4, loot: 8 } }],
  // What comes through a tear: one lord for each kind of tear, and the colossi.
  w_tear_ember: ['night_demon_red', 3.4, 'CINDERMAW, THROUGH THE TEAR', 'Infernal', { stat: { hp: 560, damage: 28, reach: 3.2, loot: 8 }, tricks: [T('fireWheel', [7, 10], 0, 11), T('spiral', [10, 14], 0, 22, { elem: FIRE }), T('seekers', [8, 12], 3, 20, { elem: FIRE })] }],
  w_tear_rime: ['goatman_white', 3.4, 'HOARFROST, THROUGH THE TEAR', 'Rimefrost', { stat: { hp: 560, damage: 28, reach: 3.2, loot: 8 }, tricks: [T('frostRings', [6, 9], 0, 14), T('quakeWave', [9, 13], 0, 16, { elem: FROST }, 'jump'), T('ram', [8, 12], 5, 14, { elem: FROST })] }],
  w_tear_grave: ['bone_golem', 4.2, 'THE UNBURIED, THROUGH THE TEAR', 'Wraith', { stat: { hp: 620, damage: 30, loot: 8 } }],
  w_tear_rot: ['plague_giant_1', 4.0, 'MOTHER OF FLIES, THROUGH THE TEAR', 'Sulphur', { stat: { hp: 600, damage: 30, loot: 8 } }],
  w_tear_brood: ['flesh_spider_demon', 2.9, 'THE THOUSAND-LEGGED, THROUGH THE TEAR', 'Corrupted', { stat: { hp: 560, damage: 28, reach: 3.2, loot: 8 } }],
  w_tear_storm: ['harpy_queen', 3.2, 'SKYRENDER, THROUGH THE TEAR', 'Cobalt', { stat: { hp: 520, damage: 26, reach: 3, loot: 8 }, tricks: [T('spiral', [8, 12], 0, 22, { elem: STORM }), T('boltWall', [9, 13], 5, 16, { elem: STORM, width: 12, n: 8 }), T('bladeNova', [6, 9], 0, 12, { elem: STORM })] }],
  w_colossus_bone: ['skeleton_knight_giant', 6.2, 'THE COLOSSUS OF BONE', 'Wraith', { stat: { hp: 1500, damage: 40, speed: 2.4, reach: 5, loot: 0 } }],
  w_colossus_rot: ['plague_giant_armored', 6.4, 'THE COLOSSUS OF ROT', 'Corrupted', { stat: { hp: 1500, damage: 40, speed: 2.4, reach: 5, loot: 0 } }],
  w_colossus_ember: ['dragon_red', 6.6, 'THE COLOSSUS OF EMBER', 'Infernal', { stat: { hp: 1700, damage: 42, loot: 0 } }],
};
export const WILD_VARIANTS = Object.fromEntries(Object.entries(ROWS).map(([id, [src, height, name, pal, more]]) => [id, { src, height, name, pal, wild: true, ...(more || {}) }]));

// ---- who holds what ----------------------------------------------------------------------------------------------------
// A faction: side (who it'll fight on sight: anyone of another side, where two of them meet), kind (how its outposts are
// built, src/core/wild-dress.js), places (names for them), rank (the many), elite (one or two among them), chief (who
// leads an outpost), lvl (how hard, for auto-play and the rewards), pal (for the plain models among its rank).
const GREEN = ['goblin_green_1', 'goblin_green_2', 'goblin_green_3'], RED = ['goblin_red_1', 'goblin_red_2', 'goblin_red_3'];
export const FACTIONS = {
  moss: { side: 'goblin', kind: 'camp', lvl: 5, places: ['Mossback Camp', 'Bramble Stockade', 'the Thornpit', 'Muddle Camp', 'Gnawbone Camp'], rank: ['w_moss_goblin', 'w_moss_stabber', ...GREEN], elite: ['w_moss_brute'], chief: ['w_bramble_chief'], pal: ['Mossback', 'Base'] },
  mire: { side: 'goblin', kind: 'camp', lvl: 9, places: ['Mire Camp', 'the Reed Stockade', 'Sinkfoot Camp', 'Leechwater Camp'], rank: ['w_mire_goblin', 'w_mire_spitter', 'goblin_green_2'], elite: ['w_mire_spitter'], chief: ['w_mire_king'], pal: ['Bogblack', 'Drowned'] },
  ember: { side: 'goblin', kind: 'camp', lvl: 10, places: ['Emberfang Camp', 'the Cinder Stockade', 'Charcoal Camp', 'Redtooth Camp', 'Sootpit Camp'], rank: ['w_ember_goblin', 'w_ember_bomber', ...RED], elite: ['w_ember_brute'], chief: ['w_ember_warlord'], pal: ['Emberhide', 'Base'] },
  rime: { side: 'goblin', kind: 'camp', lvl: 12, places: ['Frost-goblin Camp', 'the Ice Stockade', 'Chilblain Camp', 'Whitefang Camp'], rank: ['w_rime_goblin', 'w_snow_kobold', 'w_rime_goblin'], elite: ['w_rime_brute', 'w_snow_trapper'], chief: ['w_rime_jarl'], pal: ['Rimefrost'] },
  dig: { side: 'kobold', kind: 'dig', lvl: 5, places: ['Kobold Diggings', 'the Spoil Heaps', 'Pickfall Delve', 'Candlewick Diggings', 'Ratline Delve'], rank: ['w_dig_kobold', 'w_dig_sapper', 'kobold_1', 'kobold_3'], elite: ['w_dig_guard'], chief: ['w_dig_foreman'], pal: ['Dunehide', 'Base'] },
  rustdig: { side: 'kobold', kind: 'dig', lvl: 10, places: ['Rustpick Diggings', 'the Red Cut', 'Orefall Delve', 'Slagheap Diggings'], rank: ['w_rust_kobold', 'w_dig_sapper', 'kobold_armored_1'], elite: ['w_dig_guard', 'w_cobalt_shaman'], chief: ['w_dig_foreman'], pal: ['Rust', 'Ironrust'] },
  ashdig: { side: 'kobold', kind: 'dig', lvl: 15, places: ['Ash Diggings', 'the Grey Cut', 'Cinderpick Delve'], rank: ['w_ash_kobold', 'w_ash_goblin', 'w_dig_sapper'], elite: ['w_cobalt_shaman'], chief: ['w_dig_foreman'], pal: ['Ashen'] },
  grave: { side: 'dead', kind: 'graveyard', lvl: 7, places: ['a Forgotten Graveyard', "Paupers' Field", 'the Old Burying Ground', 'Lychfield', 'the Hungry Plot', "Sexton's Rest"], rank: ['w_grave_waif', 'w_grave_urchin', 'w_barrow_thrall', 'zombie_boy_3', 'zombie_girl_2'], elite: ['w_barrow_widow', 'w_grave_caller'], chief: ['w_grave_caller', 'w_bone_sentinel'], pal: ['Wraith', 'Gloam', 'Bone-white'] },
  barrow: { side: 'dead', kind: 'tomb', lvl: 14, places: ['a Lesser Barrow', "the Thane's Howe", 'Coldhowe', 'the Sleeping Mound', 'Ravenhowe', 'the Hollow Howe'], rank: ['w_barrow_thrall', 'w_barrow_widow', 'w_grave_urchin'], elite: ['w_bone_sentinel', 'w_charnel_golem', 'w_bone_drake'], chief: ['w_barrow_king', 'w_tomb_lord'], pal: ['Bone-white', 'Gravegilt'] },
  drowned: { side: 'dead', kind: 'graveyard', lvl: 10, places: ['a Drowned Graveyard', 'the Sunk Plot', 'Weepers\' Field', 'the Reed Graves'], rank: ['w_drowned', 'w_drowned_child', 'w_drowned_bride'], elite: ['w_carrion_harpy', 'w_fen_hag'], chief: ['w_mere_mother', 'w_fen_hag'], pal: ['Drowned', 'Bogblack'] },
  brood: { side: 'brood', kind: 'nest', lvl: 6, places: ['a Weavers\' Hollow', 'the Silk Dell', 'Webwood', 'the Hanging Larder'], rank: ['w_wood_weaver', 'w_spiderling', 'w_spiderling', 'spider_black'], elite: ['w_wood_weaver'], chief: ['w_silk_matron'], pal: ['Mossback', 'Base'] },
  rustbrood: { side: 'brood', kind: 'nest', lvl: 11, places: ['a Rustweb Hollow', 'the Red Larder', 'Shroudwood'], rank: ['w_rust_stalker', 'w_spiderling', 'spider_red'], elite: ['w_rust_stalker'], chief: ['w_silk_matron', 'w_brood_tyrant'], pal: ['Rust', 'Bloodsoaked'] },
  frostbrood: { side: 'brood', kind: 'nest', lvl: 13, places: ['a Frostweb Hollow', 'the White Larder', 'Rimeweb Dell'], rank: ['w_frost_weaver', 'w_spiderling'], elite: ['w_frost_weaver'], chief: ['w_silk_matron'], pal: ['Rimefrost', 'Albino'] },
  ashbrood: { side: 'brood', kind: 'nest', lvl: 16, places: ['a Widows\' Hollow', 'the Grey Larder'], rank: ['w_ash_widow', 'w_spiderling'], elite: ['w_ash_widow'], chief: ['w_brood_tyrant'], pal: ['Ashen'] },
  herd: { side: 'herd', kind: 'ring', lvl: 8, places: ['a Ram-stone Ring', 'the Horned Stones', 'Bleatmoot', 'the Butting Ground'], rank: ['w_hill_ram', 'goatman_bw'], elite: ['w_hill_ram'], chief: ['w_gilt_horn', 'w_thunder_ram'], pal: ['Dunehide', 'Base'] },
  rimeherd: { side: 'herd', kind: 'ring', lvl: 13, places: ['a Rime-ram Ring', 'the Frozen Moot', 'Hornfrost Stones'], rank: ['w_rime_ram', 'goatman_white'], elite: ['w_rime_ram'], chief: ['w_thunder_ram', 'w_gilt_horn'], pal: ['Rimefrost', 'Bone-white'] },
  cinderherd: { side: 'herd', kind: 'ring', lvl: 12, places: ['a Cinder-ram Ring', 'the Scorched Moot', 'Emberhorn Stones'], rank: ['w_cinder_ram', 'goatman_black'], elite: ['w_cinder_ram'], chief: ['w_gilt_horn'], pal: ['Emberhide', 'Infernal'] },
  pack: { side: 'pack', kind: 'den', lvl: 9, places: ['a Wolfkin Den', 'the Gnawed Hollow', 'Howlers\' Scrape'], rank: ['w_dire_wolfkin'], elite: ['w_dire_wolfkin'], chief: ['w_blood_moon'], pal: ['Sable'] },
  howlers: { side: 'pack', kind: 'den', lvl: 14, places: ['a White Howlers\' Den', 'the Frozen Scrape', 'Moonbite Hollow'], rank: ['w_dire_wolfkin'], elite: ['w_white_howler'], chief: ['w_white_howler', 'w_blood_moon'], pal: ['Albino', 'Bone-white'] },
  dusk: { side: 'pack', kind: 'roost', lvl: 13, places: ['a Dusk Roost', 'the Hanging Tree', 'Leatherwing Roost'], rank: ['w_dusk_bat'], elite: ['w_dusk_bat'], chief: ['w_gallows_bat'], pal: ['Nightshade'] },
  flock: { side: 'flock', kind: 'roost', lvl: 8, places: ['a Harpy Roost', 'the Screaming Crag', 'Featherfall Roost'], rank: ['w_cliff_harpy', 'harpy_warrior'], elite: ['w_cliff_harpy'], chief: ['w_gale_queen'], pal: ['Dunehide', 'Base'] },
  storm: { side: 'flock', kind: 'roost', lvl: 14, places: ['a Storm Roost', 'the Thunder Crag', 'Galewing Roost'], rank: ['w_storm_harpy', 'harpy_warrior'], elite: ['w_storm_harpy'], chief: ['w_gale_queen'], pal: ['Stormhide', 'Cobalt'] },
  whelps: { side: 'wyrm', kind: 'bed', lvl: 12, places: ['a Whelps\' Scorch', 'the Burnt Hollow', 'Cinderbed'], rank: ['w_cinder_whelp', 'dragonling_black'], elite: ['w_cinder_whelp'], chief: ['w_ash_drake'], pal: ['Emberhide', 'Base'] },
  marshwyrm: { side: 'wyrm', kind: 'bed', lvl: 15, places: ['a Drake\'s Wallow', 'the Sunk Bed', 'Wormwallow'], rank: ['w_bog_worm'], elite: ['w_bog_worm'], chief: ['w_marsh_drake'], pal: ['Bogblack'] },
  icewyrm: { side: 'wyrm', kind: 'bed', lvl: 17, places: ['a Frost Drake\'s Bed', 'the Rimed Hollow', 'Wormfrost'], rank: ['w_ice_worm'], elite: ['w_ice_worm'], chief: ['w_frost_drake'], pal: ['Rimefrost'] },
  sand: { side: 'wyrm', kind: 'bed', lvl: 17, places: ['a Sand-worm Bed', 'the Churned Ground', 'Wormash'], rank: ['w_sand_worm'], elite: ['w_sand_worm'], chief: ['w_ash_drake'], pal: ['Dunehide', 'Ashen'] },
  night: { side: 'night', kind: 'ruin', lvl: 14, places: ['a Haunted Ruin', 'the Sleepless Stones', 'Nightfall Ruin', 'the Broken Vigil'], rank: ['w_dream_eater', 'w_effigy', 'w_pale_stalker'], elite: ['w_ember_fiend'], chief: ['w_nightmare'], pal: ['Nightshade', 'Gloam'] },
  effigy: { side: 'night', kind: 'field', lvl: 7, places: ['a Scarecrow Field', 'the Watching Acre', 'Strawman\'s Acre', 'the Stitched Field'], rank: ['w_scarecrow', 'w_effigy', 'mannequin_3'], elite: ['w_effigy'], chief: ['w_wicker_man'], pal: ['Ironrust', 'Porcelain'] },
  plague: { side: 'plague', kind: 'pesthouse', lvl: 14, places: ['a Pest Camp', 'the Lazar Field', 'Poxhollow', 'the Burning Ground'], rank: ['w_plague_taken', 'w_pox_knight', 'plague_knight_black'], elite: ['w_plague_nurse', 'w_rot_ogre'], chief: ['w_pest_lord', 'w_rot_ogre'], pal: ['Blighted', 'Sulphur'] },
  ashcult: { side: 'cult', kind: 'coven', lvl: 16, places: ['an Ash Cult\'s Circle', 'the Cinder Pulpit', 'Smokefast'], rank: ['w_ash_cultist', 'w_ash_zealot', 'w_ash_cultist'], elite: ['w_pyromancer'], chief: ['w_hierophant'], pal: ['Sable', 'Oxblood'] },
  pyre: { side: 'cult', kind: 'coven', lvl: 11, places: ['a Pyromancers\' Circle', 'the Kiln Coven', 'Brandfast'], rank: ['w_ash_cultist', 'w_pyromancer'], elite: ['w_pyromancer'], chief: ['w_hierophant', 'w_pyromancer'], pal: ['Emberhide'] },
  rimecoven: { side: 'cult', kind: 'coven', lvl: 14, places: ['a Rime Coven', 'the Hoar Circle', 'Winterfast'], rank: ['w_rime_witch', 'w_snow_kobold'], elite: ['w_rime_witch', 'w_storm_caller'], chief: ['w_storm_caller'], pal: ['Rimefrost'] },
  hedge: { side: 'cult', kind: 'coven', lvl: 8, places: ['a Hedge Coven', 'the Warlocks\' Stones', 'Mumblefast', 'the Crooked Circle'], rank: ['w_hedge_warlock', 'w_ash_cultist'], elite: ['w_stone_seer', 'w_hedge_warlock'], chief: ['w_stone_seer', 'w_storm_caller'], pal: ['Amethyst', 'Sable'] },
  vigil: { side: 'velscour', kind: 'fort', lvl: 18, v: true, places: ['a Vigil Fort', 'the Black Stockade', 'Ashwatch Fort', 'Gallowgate Fort'], rank: ['velscour_knight_1', 'velscour_knight_2', 'velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'], elite: ['w_vigil_sorcerer', 'velscour_lancer', 'velscour_lancer_2', 'velscour_lancer_3'], chief: ['w_vigil_sergeant', 'w_tower_captain'], pal: ['Base', 'Sable'] },
  vigiltower: { side: 'velscour', kind: 'tower', lvl: 17, v: true, places: ['a Vigil Tower', 'the Ash Spire', 'Cinderwatch', 'the Black Finger', 'Sootwatch'], rank: ['velscour_knight_1', 'velscour_knight_4', 'velscour_knight_6'], elite: ['w_vigil_sorcerer'], chief: ['w_vigil_magister', 'w_tower_captain'], pal: ['Base', 'Oxblood'] },
};
export const FACTION_KEYS = Object.keys(FACTIONS);

// Who's found in each country (the first few the most often). The Sorrowhorn's slopes take the fells' and the night's.
export const COUNTRY_FACTIONS = {
  darkwood: ['moss', 'dig', 'brood', 'grave', 'herd', 'pack', 'hedge', 'effigy'],
  downs: ['moss', 'effigy', 'herd', 'flock', 'dig', 'hedge', 'grave'],
  fen: ['mire', 'drowned', 'marshwyrm', 'brood', 'hedge', 'drowned', 'mire'],
  rustwood: ['ember', 'rustdig', 'rustbrood', 'cinderherd', 'pyre', 'whelps', 'dusk'],
  ashen: ['vigiltower', 'vigil', 'ashcult', 'ashdig', 'sand', 'ashbrood', 'plague', 'vigiltower'],
  barrow: ['barrow', 'grave', 'barrow', 'hedge', 'pack', 'night'],
  rimeholt: ['rime', 'rimeherd', 'howlers', 'frostbrood', 'storm', 'icewyrm', 'rimecoven'],
  gallows: ['plague', 'night', 'effigy', 'dusk', 'grave', 'hedge', 'pack'],
  deepwood: ['brood', 'night', 'moss', 'effigy', 'dig', 'pack'],
};
// Sides that leave each other be when they meet (everyone else fights): the dead and the cults raise each other's.
export const TRUCES = [['dead', 'cult'], ['goblin', 'kobold']];
export const atWar = (a, b) => !!a && !!b && a !== b && !TRUCES.some(([p, q]) => (p === a && q === b) || (p === b && q === a));

// ---- tears -------------------------------------------------------------------------------------------------------------
// A tear is a wound in the world that something comes through, a kind for each of six elsewheres. elem: its light
// (src/sim/spells.js ELEM). waves: who comes first and second; elite: who leads the second; lord: who comes last.
export const TEARS_KINDS = [
  { key: 'ember', name: 'A TEAR OF EMBER', elem: FIRE, side: 'ember', waves: ['w_ember_goblin', 'w_cinder_whelp', 'w_ember_bomber'], elite: ['w_ember_fiend', 'w_cinder_ram'], lord: 'w_tear_ember', colossus: 'w_colossus_ember', pal: ['Infernal', 'Emberhide'] },
  { key: 'rime', name: 'A TEAR OF RIME', elem: FROST, side: 'rime', waves: ['w_rime_goblin', 'w_snow_kobold', 'w_frost_weaver'], elite: ['w_rime_ram', 'w_white_howler'], lord: 'w_tear_rime', colossus: 'w_colossus_bone', pal: ['Rimefrost'] },
  { key: 'grave', name: 'A TEAR OF THE GRAVE', elem: BONE, side: 'dead', waves: ['w_grave_waif', 'w_barrow_thrall', 'w_grave_urchin'], elite: ['w_bone_sentinel', 'w_grave_caller'], lord: 'w_tear_grave', colossus: 'w_colossus_bone', pal: ['Wraith', 'Bone-white'] },
  { key: 'rot', name: 'A TEAR OF ROT', elem: POISON, side: 'plague', waves: ['w_plague_taken', 'w_mire_spitter', 'w_pox_knight'], elite: ['w_rot_ogre', 'w_plague_nurse'], lord: 'w_tear_rot', colossus: 'w_colossus_rot', pal: ['Blighted', 'Sulphur'] },
  { key: 'brood', name: 'A TEAR OF THE BROOD', elem: VOID, side: 'brood', waves: ['w_spiderling', 'w_wood_weaver', 'w_rust_stalker'], elite: ['w_ash_widow', 'w_dream_eater'], lord: 'w_tear_brood', colossus: 'w_colossus_rot', pal: ['Nightshade', 'Corrupted'] },
  { key: 'storm', name: 'A TEAR OF STORM', elem: STORM, side: 'flock', waves: ['w_storm_harpy', 'w_cliff_harpy', 'w_dire_wolfkin'], elite: ['w_storm_caller', 'w_thunder_ram'], lord: 'w_tear_storm', colossus: 'w_colossus_ember', pal: ['Stormhide', 'Cobalt'] },
];
// Which tears a country gets (two each, as it should be).
export const COUNTRY_TEARS = { darkwood: [2, 4], downs: [5, 2], fen: [3, 4], rustwood: [0, 4], ashen: [0, 2], barrow: [2, 1], rimeholt: [1, 5], gallows: [3, 2], deepwood: [4, 3] };
export const TEAR = {
  see: 170,        // metres off that an open tear is drawn and told of
  start: 13,       // metres off that walking up to it starts it
  leave: 90,       // further than this from it for `lost` seconds and it's given up
  lost: 14,
  bonus: 80,       // seconds for the first two waves that earn the bonus wave
  bonusFor: 45,    // seconds the bonus wave has to be killed in
  turn: 780,       // seconds a tear stays as it is (open or shut) before the land's tears turn over
  open: 0.42,      // the share of them open at any time
  colossusEvery: 3,// each this many sealed, the next one's lord is a colossus
};

// ---- what you can meet -------------------------------------------------------------------------------------------------
// The kinds of meeting the land rolls for when you've been walking with nothing about (src/sim/wilds.js): w, how often.
export const MEETINGS = [
  { key: 'pack', w: 5, name: 'ON THE PROWL' },          // a few of the country's own, wandering
  { key: 'skirmish', w: 4, name: 'A SKIRMISH' },        // two sides at each other's throats
  { key: 'warband', w: 3, name: 'A WARBAND ON THE ROAD', road: true },   // a chief and his own marching the road at you
  { key: 'bounty', w: 2, name: 'A NAMED ONE' },         // somebody's chief out alone with two of his
  { key: 'ritual', w: 2, name: 'A RITUAL' },            // casters raising something: stop them before it's up
  { key: 'duel', w: 1, name: 'A DUEL OF SORCERERS' },   // two casters, one of whom will win
  { key: 'drake', w: 1, name: 'A SHADOW OVERHEAD' },    // a drake comes down on you
];
export const MEET = {
  every: [38, 75],  // seconds between meetings, once the last is done with
  ahead: [70, 95],  // metres ahead of you it's stood
  quiet: 150,       // nothing alive and awake within this of you, or none is rolled
  gone: 230,        // further than this from one and it's taken away
  ritual: 50,       // seconds a ritual takes
};

// What the sim tells the page (EV.WILD's first number), and what goes with it.
export const WILD = {
  TEAR_NEAR: 1,     // (kind, x, z): an open tear is in sight
  TEAR_STAGE: 2,    // (kind, stage 1-4, how many to kill, seconds or 0, colossus 0/1)
  TEAR_COUNT: 3,    // (killed, of)
  TEAR_SEALED: 4,   // (kind, x, y, z, level, bonus won 0/1, colossus 0/1)
  TEAR_LOST: 5,     // (kind)
  CLEARED: 6,       // (outpost's place in OUTPOSTS, x, y, z)
  FOUND: 7,         // (outpost's place): you've come on it for the first time
  MEET: 8,          // (meeting's place in MEETINGS, faction a, faction b or -1, seconds or 0)
  MEET_DONE: 9,     // (meeting, x, y, z, level, won 0/1)
  CACHE: 10,        // (find's place in FINDS, x, y, z)
  TEAR_GONE: 11,    // out of sight of it again
};

// How each kind of outpost's own ground is dressed (src/core/lair-dress.js lairKind), under what's built there.
const DRESS = { camp: 'camp', dig: 'camp', graveyard: 'plot', tomb: 'plot', fort: 'picket', tower: 'picket', ring: 'ring', coven: 'ring', nest: 'webs', roost: 'roost', den: 'den', bed: 'bed', ruin: 'ring', field: 'plot', pesthouse: 'picket' };
// What an outpost stands up: its garrison (one lair, with its chief), by its faction. n: how many beside the chief.
export function outpostLair(o) {
  const f = FACTIONS[o.faction];
  const n = f.kind === 'fort' ? 5 : f.kind === 'tower' || f.kind === 'bed' || f.kind === 'den' ? 2 : f.kind === 'tomb' || f.kind === 'roost' ? 3 : 4;
  return { key: o.key, x: o.x, z: o.z, r: o.r, boss: f.chief, pick: f.rank.concat(f.rank, f.elite), n, pal: f.pal, tricks: f.lvl >= 9, side: f.side, lvl: f.lvl, wild: true, respawn: 480, dress: DRESS[f.kind], thin: !['nest', 'roost', 'den', 'bed'].includes(f.kind) };
}
// A standing battle's two lairs.
export function battleLairs(b) {
  const one = (fk, x, z, n, tag) => { const f = FACTIONS[fk]; return { key: `${b.key}_${tag}`, x, z, r: 5, pick: f.rank.concat(f.elite), n, pal: f.pal, tricks: f.lvl >= 12, side: f.side, lvl: Math.max(FACTIONS[b.a].lvl, FACTIONS[b.b].lvl), wild: true, battle: b.key, respawn: 300, rivalTake: 0.3, dress: 'picket' }; };
  return [one(b.a, b.x, b.z, 4, 'a'), one(b.b, b.x2, b.z2, 4, 'b')];
}
