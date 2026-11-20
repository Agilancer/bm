// More of City State Phobos's quests' workings, the town's (as src/folk/phobos-quests.js, which takes these in). Their words:
// src/folk/lines/phobos-more-town.js. Work that sprawls: over the districts and up onto the city's wall and into its towers
// (its lookouts, 'vista:<id>', src/core/phobos-finds.js), down each sector of the sewers under them (a delve's rooms,
// 'room:<id>', src/core/delve-sewers.js), and at the end of it up the Approach and in at the castle's gate (the Lower Ward,
// src/core/delve-castle.js). Every giver is someone who already walks their own quarter (src/folk/people.js), or keeps the
// drains, or the Sunk Garden. A kill wanted in a room is one fewer than the room holds: what's chased out of it doesn't count.
// No two neighbours in a chain ask the same thing of you (the critics, 2026-11-20): a climb, a night watch and a word, a hunt
// at a lair, a talk from one to the next, something brought back, a boss.
export const RULES_TOWN = {
  // ---- the Barbican: the gate's book, and the wall over it ----
  the_toll_book: { steps: [{ talk: 'ph_clerk', say: 'Fat Gorrim says your book and his purse disagree.' }, { talk: 'ph_bolt', say: "Who comes over the wall at night, where the book can't see?" }, { back: true, say: "It's not the clerk. It's the wall." }], gold: 320, xp: 2600 },
  eyes_on_the_wall: { needs: 'the_toll_book', steps: [{ visit: ['vista:barbican_loft', 'vista:drawbridge_head'] }, { back: true, say: "I've stood your post. I see what you see." }], gold: 340, xp: 2800 },
  the_long_watch: { needs: 'eyes_on_the_wall', steps: [{ enter: 'vista:ashwatch_post', night: true }, { enter: 'vista:rookery_post', night: true }, { talk: 'ph_garrow', say: 'Hob Quarrel asks who called the west posts up the hill.' }, { back: true, say: 'Called up to the castle, a post a night. Garrow counted.' }], gold: 620, xp: 5200, item: 'gem', seed: 0x70a11 },
  // ---- a round of the houses: the Gutted Lamb's landlord, and the city's other taverns ----
  a_round_of_the_houses: { steps: [{ visit: ['ph:market', 'ph:wharf', 'ph:tanners', 'ph:cinder'] }, { back: true, say: 'Four houses, four landlords, and not a penny sent back.' }], gold: 380, xp: 3000 },
  // ---- the Cinder Quarter, Chainmarket, the Wharf, the Rookeries, the Rise: up their towers ----
  the_sweeps_eye: { steps: [{ visit: ['vista:minster_tower'] }, { kill: 'lair:phobos_cinder', n: 3 }, { back: true, say: "Three fires out. Nobody you'd know was cooking on them." }], gold: 420, xp: 3400 },
  the_gibbet_loft: { steps: [{ enter: 'vista:gibbet_loft', night: true }, { back: true, say: 'I went up the gibbet tower after dark. The cages were empty.' }], gold: 420, xp: 3600 },
  the_toll_on_the_water: { steps: [{ visit: ['vista:toll_upper', 'vista:toll_lower'] }, { talk: 'ph_barge', say: 'Abelard asks who trims the lamps in the toll-houses.' }, { back: true, say: 'Lit, empty, and trimmed by one who walks on the water.' }], gold: 400, xp: 3400 },
  the_fever_house: { steps: [{ talk: 'ph_flop', say: 'The Beaked Doctor asks who was carried out of the Fever House.' }, { talk: 'ph_wren', say: 'Widow Crake says you saw who went in after.' }, { back: true, say: 'Nobody was carried out. They walked, and they went down.' }], gold: 380, xp: 3200 },
  the_scrying_room: { needs: 'what_the_stars_say', steps: [{ enter: 'vista:eye_room', night: true }, { kill: 'lair:phobos_mages', n: 2 }, { back: true, say: 'It turns against the sun. And the Rise is two lamps the fewer.' }], gold: 600, xp: 5200 },
  the_castle_from_the_wall: { steps: [{ visit: ['vista:dukes_wall_post', 'vista:castle_gate_drum'] }, { bring: 'iron', n: 6, at: 'lair:phobos_approach' }], gold: 640, xp: 5600 },
  // ---- down the West Drains (28 to 36) ----
  a_pie_for_the_drains: { steps: [{ enter: 'westdrains' }, { talk: 'martleboro', say: 'Rosie Crust sends a pie, and says you owe her for six.' }, { back: true, say: "He ate it standing up. He says he'll pay Thursday." }], gold: 420, xp: 5200 },
  under_the_rookery_well: { needs: 'down_the_drains', steps: [{ visit: ['room:pw_rook', 'room:pw_well'] }, { kill: 'room:pw_well', n: 4 }, { back: true, say: "The well's clear to its bottom. Mind what you draw up." }], gold: 560, xp: 7000 },
  the_soot_cistern: { needs: 'down_the_drains', steps: [{ visit: ['room:pw_cinder', 'room:pw_soot'] }, { bring: 'cap', n: 5, at: 'westdrains' }], gold: 520, xp: 6400 },
  the_turning_basin: { needs: 'the_main_runs_clear', steps: [{ kill: 'room:pw_basin', n: 4 }, { visit: ['room:pw_over'] }, { back: true, say: "The Basin turns again, and the Overflow's open." }], gold: 700, xp: 9000 },
  // ---- the Slough Mains (34 to 42) ----
  whats_in_the_dye: { needs: 'down_the_drains', steps: [{ visit: ['room:ps_dye'] }, { kill: 'sloughmains', n: 6 }, { back: true, say: "Something was nesting in your sump. It isn't now." }], gold: 900, xp: 12000 },
  the_market_cistern: { needs: 'caps_for_the_keepers', steps: [{ visit: ['room:ps_chain', 'room:ps_market'] }, { kill: 'room:ps_market', n: 4 }, { talk: 'ph_pie', say: "Hob Gristle says: burn your scraps, Rosie. I'll say why." }, { back: true, say: 'What you both pour down the drain was being eaten.' }], gold: 980, xp: 13000 },
  the_weir_hall: { needs: 'caps_of_the_slough', steps: [{ kill: 'room:ps_weir', n: 3 }, { visit: ['room:ps_silt'] }, { back: true, say: 'The Weir Hall is clear. The Silt Run moves when you watch it.' }], gold: 1100, xp: 15000, item: 'staff', named: "The Weir-Keeper's Pole", seed: 0x3e1a7 },
  // ---- the Charnel Runs (40 to 50) ----
  lamechs_missing_dead: { needs: 'lamechs_keys', steps: [{ enter: 'charnelruns' }, { visit: ['room:pc_cistern', 'room:pc_cata'] }, { back: true, say: 'They went down, Lamech. All eleven. Into the old catacomb.' }], gold: 1300, xp: 19000 },
  the_old_catacomb: { needs: 'lamechs_missing_dead', steps: [{ kill: 'room:pc_cata', n: 5 }, { back: true, say: 'Five of them are lying down again. Light your lamp.' }], gold: 1500, xp: 22000, item: 'skull', named: 'The Dead-Watch Lantern', seed: 0xdead7 },
  under_the_rise: { steps: [{ visit: ['room:pc_mages', 'room:pc_rise'] }, { boss: 'drownedabbot' }, { back: true, say: 'It found a dead abbot to be, Magister. It sings no more.' }], gold: 1900, xp: 28000 },
  // ---- the High Conduits (48 to 58) ----
  the_dukes_conduit: { steps: [{ visit: ['room:pa_dukes', 'room:pa_lamps'] }, { kill: 'room:pa_lamps', n: 4 }, { back: true, say: 'Your cellars are dry. The lamps down there are not yours.' }], gold: 2400, xp: 34000 },
  a_garden_under_the_street: { needs: 'the_dukes_conduit', steps: [{ visit: ['room:pa_garden'] }, { talk: 'apricot', say: 'Lady Morwenna Vasque asks if the garden is still kept.', end: true }], gold: 2600, xp: 38000, item: 'robe', named: 'The Vasque Mourning Silk', seed: 0x7a59e },
  // ---- up the Approach and in at his gate: the Lower Ward (58 to 66) ----
  the_pilgrims_road: { needs: 'the_castle_from_the_wall', steps: [{ enter: 'ph:approach', night: true }, { enter: 'lowerward' }, { back: true, say: "I went in at his gate, Brother. Don't follow me." }], gold: 2800, xp: 40000 },
  the_servants_ways: { needs: 'up_the_aqueduct', steps: [{ visit: ['room:cl_cellar', 'room:cl_hall', 'room:cl_wrange'] }, { back: true, say: "The servants' ways run behind six wings. I've walked three." }], gold: 3000, xp: 44000 },
  the_garrisons_pot: { needs: 'up_the_aqueduct', steps: [{ kill: 'room:cl_kitchen', n: 3 }, { visit: ['room:cl_cellar'] }, { back: true, say: 'His kitchens are short three hands, and I found your cask.' }], gold: 3000, xp: 44000 },
  rivets_for_the_watch: { needs: 'up_the_aqueduct', steps: [{ visit: ['room:cl_armoury'] }, { bring: 'iron', n: 10, at: 'room:cl_armoury' }], gold: 3400, xp: 50000, item: 'staff', named: "The Riveter's Rod", seed: 0x51be7 },
  the_oubliettes: { needs: 'the_servants_ways', steps: [{ visit: ['room:cl_pit', 'room:cl_oub'] }, { kill: 'room:cl_oub', n: 5 }, { back: true, say: 'The pits are quiet. Whoever went down them is past minding.' }], gold: 3600, xp: 54000, item: 'skull', named: "The Gaoler's Tally", seed: 0x0b11e },
};
// The level each wants (src/ui/autobrain.js PLAN): [id, level]. In step with where each sends you: the streets and the wall
// 20 to 28, the West Drains to 36, the Slough Mains to 42, the Charnel Runs to 50, the High Conduits to 58, the Lower Ward to 66.
export const LEVELS_TOWN = [
  ['the_toll_book', 20], ['eyes_on_the_wall', 21], ['a_round_of_the_houses', 21], ['the_sweeps_eye', 22], ['the_gibbet_loft', 23], ['the_long_watch', 24],
  ['the_toll_on_the_water', 24], ['the_fever_house', 25], ['the_scrying_room', 27], ['the_castle_from_the_wall', 28],
  ['a_pie_for_the_drains', 28], ['under_the_rookery_well', 31], ['the_soot_cistern', 32], ['the_turning_basin', 34],
  ['whats_in_the_dye', 37], ['the_market_cistern', 39], ['the_weir_hall', 41],
  ['lamechs_missing_dead', 44], ['the_old_catacomb', 46], ['under_the_rise', 48],
  ['the_dukes_conduit', 53], ['a_garden_under_the_street', 56],
  ['the_pilgrims_road', 58], ['the_servants_ways', 60], ['the_garrisons_pot', 61], ['rivets_for_the_watch', 63], ['the_oubliettes', 64],
];
