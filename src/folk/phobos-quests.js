// City State Phobos's first quests: their workings (as src/folk/quests.js RULES; spread into it). Every word of them is in
// src/folk/lines/phobos-hubs.js. Three hubs, each with its giver in the yard (src/folk/people.js POSTED, hub), and three
// quests out in the land that send you to them, one from each of the people who'd know (docs/PHOBOS-TODO.md, "Quests").
// Places: 'phobos' (inside the city's wall), 'ph:<district>' (src/core/phobos-data.js districts), and the city's lairs
// ('lair:phobos_*', src/core/tripo-monsters.js). Levels: src/ui/autobrain.js PLAN (the quest log suggests the same).
export const PHOBOS_RULES = {
  // ---- the way in: from the people who'd know ----
  smoke_in_the_east: { steps: [{ enter: 'phobos' }, { talk: 'ph_penny', say: 'Brenna Hasket of Cinderford sent me to see if you were real.', end: true }], gold: 300, xp: 2400 },
  quiet_men: { steps: [{ enter: 'ph:tanners' }, { talk: 'ph_watch', say: 'Ser Hale Orrowick sends word: the oath still holds.', end: true }], gold: 300, xp: 2600 },
  wardens_of_ash: { steps: [{ enter: 'ph:bones' }, { talk: 'ph_ash', say: "Hew Garrick of Frostwatch says he's still holding.", end: true }], gold: 320, xp: 2800 },
  // ---- the Pennyless, behind the burnt chandlery in the Cinder Quarter ----
  cinder_floors: { steps: [{ kill: 'lair:phobos_cinder', n: 4 }, { back: true, say: "The burnt houses on Ash Lane are empty. Of them, anyway." }], gold: 380, xp: 3000 },
  loaves_for_the_rookeries: { steps: [{ visit: ['ph:rookeries', 'ph:barbican'] }, { back: true, say: 'The loaves are given out, and nobody followed me back.' }], gold: 360, xp: 2600 },
  red_purses: { needs: 'cinder_floors', steps: [{ kill: 'lair:phobos_barracks', n: 4 }, { back: true, say: "Four of his lancers won't be collecting this month." }], gold: 520, xp: 4200 },
  the_pennyless_word: { steps: [{ talk: 'ph_watch', say: 'Fennick Lowe says the Pennyless pay their debts. What do you need?', end: true }], gold: 200, xp: 1800 },
  // ---- the Quiet Watch, behind the dye works on the Tanners' Steps ----
  asking_around: { steps: [{ visit: ['ph:wharf', 'ph:market', 'ph:rookeries'] }, { back: true, say: "I've walked the Wharf, the Chainmarket and the Rookeries." }], gold: 400, xp: 3200 },
  the_wharf_web: { needs: 'asking_around', steps: [{ kill: 'lair:phobos_wharf', n: 3 }, { back: true, say: 'The thing under the Drowned Wharf is dead, and the two with it.' }], gold: 460, xp: 3800 },
  the_approach_by_night: { needs: 'the_wharf_web', steps: [{ enter: 'ph:approach', night: true }, { back: true, say: "I've been up the Castle Approach after dark, and come down again." }], gold: 560, xp: 4600 },
  the_watchs_word: { steps: [{ talk: 'ph_ash', say: 'Captain Treller of the dye works asks what the Ashwardens need.', end: true }], gold: 220, xp: 2000 },
  // ---- the Ashwardens, in the charnel yard at the Bone Yards' north end ----
  still_the_rows: { steps: [{ kill: 'lair:phobos_boneyards', n: 5 }, { back: true, say: "The rows by the north wall are still. The big ones too." }], gold: 440, xp: 3600 },
  bone_tithe: { needs: 'still_the_rows', steps: [{ bring: 'bone', n: 12, at: 'lair:phobos_boneyards' }], gold: 380, xp: 2800 },
  lamps_on_the_rise: { needs: 'still_the_rows', steps: [{ kill: 'lair:phobos_mages', n: 3 }, { back: true, say: 'The lord on the Mages\' Rise is put out, and his two lamps with him.' }], gold: 600, xp: 5200, item: 'staff', named: "The Warden's Ember", seed: 0x51a7e },
  // ---- down the sewers (src/core/delve-sewers.js; words in src/folk/lines/phobos-sewers.js) ----
  // The way down, from the Pennyless: to the keepers' office off the Great Grate.
  down_the_drains: { steps: [{ enter: 'westdrains' }, { talk: 'louis_g', say: 'Fennick Lowe sent me down.' }, { talk: 'martleboro', say: "Lowe says you two know every drain in the city.", end: true }], gold: 400, xp: 5000 },
  // Martleboro's: caps, the West Drains cleared, the Spider Queen; then the Great Worm, for his brother.
  caps_for_the_keepers: { needs: 'down_the_drains', steps: [{ bring: 'cap', n: 10, at: 'westdrains' }], gold: 500, xp: 6000 },
  the_main_runs_clear: { needs: 'down_the_drains', steps: [{ kill: 'westdrains', n: 12 }, { back: true, say: 'Twelve of them. The Main runs clear.' }], gold: 600, xp: 7500 },
  the_queens_larder: { needs: 'the_main_runs_clear', steps: [{ boss: 'spiderqueen' }, { back: true, say: 'The Spider Queen is dead.' }], gold: 900, xp: 12000, item: 'staff', named: 'The Larder Rake', seed: 0x5e3a1 },
  the_great_worm: { needs: 'the_queens_larder', steps: [{ boss: 'greatworm' }, { back: true, say: 'The Great Worm is dead.' }], gold: 1300, xp: 18000, item: 'skull', named: "Louis G's Lucky Skull", seed: 0x10a15 },
  // Louis G's: the Slough's blue caps, and the princess's letters, all the way across.
  caps_of_the_slough: { needs: 'caps_for_the_keepers', steps: [{ bring: 'cap', n: 15, at: 'sloughmains' }], gold: 800, xp: 11000 },
  letters_for_the_princess: { needs: 'the_great_worm', steps: [{ enter: 'sloughmains' }, { enter: 'charnelruns' }, { enter: 'highconduits' }, { talk: 'apricot', say: 'Letters for you, from Louis G.', end: true }], gold: 1200, xp: 20000, item: 'robe', named: 'The Garden-Grown Robe', seed: 0xa9c03 },
  // Princess Apricot's: the Drowned Abbot's singing stopped, and the Lamplighter put out.
  the_drowned_abbot: { needs: 'letters_for_the_princess', steps: [{ boss: 'drownedabbot' }, { back: true, say: 'The Drowned Abbot sings no more.' }], gold: 1800, xp: 26000, item: 'skull', named: "The Abbot's Last Hour", seed: 0xab07 },
  lamps_out_in_the_conduits: { needs: 'the_drowned_abbot', steps: [{ boss: 'lamplighter' }, { back: true, say: "The Lamplighter's out, and every lamp of his." }], gold: 2600, xp: 36000, item: 'robe', named: 'The Sunk Garden Silk', seed: 0xa9c07 },
  // ---- up into the castle (src/core/delve-castle.js): the princess's, by the gate off her Garden ----
  up_the_aqueduct: { needs: 'lamps_out_in_the_conduits', steps: [{ enter: 'lowerward' }, { back: true, say: "I went up the Aqueduct. At the top of it are his kitchens." }], gold: 2800, xp: 40000 },
  // (The Iron Barracks, the castle's first dungeon, under its yard: Maud Treller of the Quiet Watch's, once the Gate
  // Captain's dead and the yard's door to it can be reached. src/core/delve-barracks.js.)
  the_iron_muster: { needs: 'the_gate_captain', steps: [{ enter: 'ironbarracks' }, { boss: 'ironmarshal' }, { back: true, say: 'The Iron Marshal is dead, and his muster broken.' }], gold: 4400, xp: 64000, item: 'skull', named: "The Marshal's Muster-Roll", seed: 0x1b4c5 },
  the_gate_captain: { needs: 'up_the_aqueduct', steps: [{ boss: 'gatecaptain' }, { back: true, say: 'The Gate Captain is dead, and his gate with him.' }], gold: 3600, xp: 52000, item: 'staff', named: 'The Portcullis Rod', seed: 0xc1a72 },
  // ---- the Middle Ward (words in src/folk/lines/phobos-castle.js): a bottle down the princess's Aqueduct, and the Librarian's
  // household in his rooms off the Ancient Library. Places: the ward ('middleward') and its rooms ('room:<id>'). ----
  the_librarians_letters: { needs: 'the_gate_captain', steps: [{ enter: 'middleward' }, { talk: 'ph_librarian', say: 'Princess Apricot had your letter. She sent me up.', end: true }], gold: 3000, xp: 44000 },
  the_household: { needs: 'the_librarians_letters', steps: [{ talk: 'ph_wynn', say: 'Master Pell said to come and find you.' }, { talk: 'ph_jory', say: 'Master Pell said you keep the keys.' }, { talk: 'ph_ondine', say: 'Master Pell said to say good evening.' }, { talk: 'ph_pip', say: "Master Pell said you'd be at your horns." }, { back: true, say: "I've met all four." }], gold: 1400, xp: 22000 },
  dust_in_the_stacks: { needs: 'the_librarians_letters', steps: [{ kill: 'middleward', n: 10 }, { back: true, say: 'Ten of them. The ward will notice.' }], gold: 3200, xp: 48000 },
  // (Know your enemy: his servants in his wards, the castle's own eight. src/folk/people.js cs_; their words, crowd/part6.js.)
  his_servants: { needs: 'the_household', steps: [{ talk: 'cs_steward', say: 'I was told the steward keeps this castle.' }, { talk: 'cs_ghoul', say: 'What do you cook down here?' }, { talk: 'cs_torturer', say: '...Who are you?' }, { talk: 'cs_hellguard', say: 'Who do you guard?' }, { talk: 'cs_priestess', say: 'Who do you pray to?' }, { talk: 'cs_imp', say: 'What are you?' }, { talk: 'cs_butler', say: 'Who do you serve?' }, { talk: 'cs_archivist', say: 'Can you hear me?' }, { back: true, say: "I've met all eight of his servants." }], gold: 2600, xp: 46000 },
  wynns_map: { needs: 'the_household', steps: [{ visit: ['room:cm_gallery', 'room:cm_horns', 'room:cm_still', 'room:cm_conserv'] }, { back: true, say: "I've walked all four. The Conservatory's longer than it looks." }], gold: 3200, xp: 50000, item: 'scroll' },
  the_quiet_watchs_steel: { needs: 'the_household', steps: [{ visit: ['room:cl_armoury', 'room:cl_forge'] }, { talk: 'ph_watch', say: 'Jory Tallis says the third rack on the left is yours.', end: true }], gold: 3400, xp: 52000 },
  the_hornwings: { needs: 'the_household', steps: [{ kill: 'room:cm_horns', n: 4 }, { back: true, say: 'Your horns are clear, Pip.' }], gold: 3400, xp: 54000, item: 'skull', named: "The Horn-Blower's Skull", seed: 0xc4a11 },
  the_feast_that_walks: { needs: 'dust_in_the_stacks', steps: [{ boss: 'feast' }, { back: true, say: 'The Feast That Walks is dead.' }], gold: 5200, xp: 76000, item: 'robe', named: "The Sister's Grey", seed: 0xc4fea },
};
// The level each wants (src/ui/autobrain.js PLAN): you come to Phobos at about twenty.
export const PHOBOS_LEVELS = [
  ['smoke_in_the_east', 20], ['loaves_for_the_rookeries', 20], ['the_pennyless_word', 21], ['quiet_men', 22], ['asking_around', 22], ['cinder_floors', 22],
  ['wardens_of_ash', 23], ['the_watchs_word', 23], ['still_the_rows', 24], ['bone_tithe', 25], ['the_wharf_web', 25], ['red_purses', 26],
  ['lamps_on_the_rise', 27], ['the_approach_by_night', 28],
  // (The sewers: the West Drains 28-36, the Slough Mains 34-42, the Charnel Runs 40-50, the High Conduits 48-58.)
  ['down_the_drains', 28], ['caps_for_the_keepers', 29], ['the_main_runs_clear', 30], ['the_queens_larder', 33], ['caps_of_the_slough', 36],
  ['the_great_worm', 40], ['letters_for_the_princess', 43], ['the_drowned_abbot', 47], ['lamps_out_in_the_conduits', 54],
  // (Castle Velscour's Lower Ward, 58-75: up the Aqueduct at 58, the Gate Captain at 66.)
  ['up_the_aqueduct', 58], ['the_gate_captain', 66], ['the_iron_muster', 68],
  // (The Middle Ward, 75-95: up through its gate at 75, the household's work 76 to 82, the Feast That Walks at 88.)
  ['the_librarians_letters', 75], ['the_household', 75], ['his_servants', 76], ['dust_in_the_stacks', 76], ['wynns_map', 78], ['the_quiet_watchs_steel', 80], ['the_hornwings', 82], ['the_feast_that_walks', 88],
];
