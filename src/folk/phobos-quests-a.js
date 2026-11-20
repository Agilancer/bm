// More of City State Phobos's quests' workings, set A (as src/folk/phobos-quests.js, which takes these in): to and through
// three of Castle Velscour's dungeons (src/core/delve-castle-a.js): the Drowned Archive, the Gallery of a Thousand
// Portraits, the Alchemists' Undercroft. Their words: src/folk/lines/phobos-more-a.js. Their givers already stand
// somewhere: the Librarian's household in his rooms off the Ancient Library, Princess Apricot in her Sunk Garden, Maud
// Treller of the Quiet Watch and Edda Grail of the Ashwardens in their yards in the city.
// Places: a dungeon by its key (down in it), and its rooms ('room:<id>').
export const RULES_A = {
  // ---- the Drowned Archive (80 to 85): the Library's own drowned stacks, and the key to the Sanctuaries Stair ----
  the_drowned_archive: { needs: 'dust_in_the_stacks', steps: [{ enter: 'drownedarchive' }, { back: true, say: 'I went down the Sunk Door. The lamps are still lit.' }], gold: 3400, xp: 54000 },
  what_the_water_kept: { needs: 'the_drowned_archive', steps: [{ visit: ['room:da_script', 'room:da_sealed'] }, { back: true, say: 'The Sealed Stack is dry. Every book of it.' }], gold: 3800, xp: 60000, item: 'scroll' },
  the_sluice_wardens: { needs: 'the_drowned_archive', steps: [{ kill: 'room:da_sluice_w', n: 4 }, { kill: 'room:da_sluice_e', n: 4 }, { back: true, say: 'Both sluices are ours. The wheels still turn.' }], gold: 4000, xp: 62000 },
  // (Pip's bet with Wynn: he can't bring himself to tell her he's lost it, so you do. It ends with her.)
  where_the_flood_goes: { needs: 'the_drowned_archive', steps: [{ visit: ['room:da_flood', 'room:da_sump'] }, { talk: 'ph_wynn', say: 'Pip says to tell you: it drains. He owes you a horn.', end: true }], gold: 3600, xp: 56000 },
  struck_from_the_index: { needs: 'the_drowned_archive', steps: [{ boss: 'indexer' }, { back: true, say: 'The Indexer is dead. Nobody reads the names now.' }], gold: 4600, xp: 68000, item: 'robe', named: "The Reader's Blue", seed: 0xda1dc },
  bound_in_calf: { needs: 'the_drowned_archive', steps: [{ boss: 'binder' }, { back: true, say: 'The Binder is dead, and his press with him.' }], gold: 4600, xp: 70000, item: 'staff', named: "The Binder's Bodkin", seed: 0xdab1d },
  the_drowned_lector: { needs: 'struck_from_the_index', steps: [{ boss: 'lector' }, { back: true, say: 'The Drowned Lector is dead. I have his key.' }], gold: 6000, xp: 88000, item: 'skull', named: "The Lector's Last Word", seed: 0xda1ec },
  // ---- the Gallery of a Thousand Portraits (83 to 87): his house's faces, and the key to the Clock Tower ----
  a_thousand_faces: { needs: 'wynns_map', steps: [{ enter: 'thousandportraits' }, { visit: ['room:tp_rotunda'] }, { back: true, say: "I've stood in the Rotunda. They do look at you." }], gold: 3800, xp: 60000 },
  the_frame_that_isnt: { needs: 'a_thousand_faces', steps: [{ visit: ['room:tp_cabinet'] }, { back: true, say: 'Behind the one that stands out. A room of little ones.' }], gold: 3800, xp: 60000, item: 'gem', seed: 0x7fca6 },
  sitters_down: { needs: 'a_thousand_faces', steps: [{ kill: 'thousandportraits', n: 12 }, { back: true, say: 'Twelve of them are back to being paint.' }], gold: 4400, xp: 66000 },
  through_the_frame: { needs: 'a_thousand_faces', steps: [{ visit: ['room:tp_restore'] }, { enter: 'middleward' }, { back: true, say: 'It comes out in the Portrait Gallery. Mark it.' }], gold: 4200, xp: 64000 },
  // (First from outside, after dark: her salon's the one lit window in the Gallery wing, seen from the Approach.)
  the_dowager_in_oils: { needs: 'a_thousand_faces', steps: [{ enter: 'ph:approach', night: true }, { boss: 'dowager' }, { back: true, say: 'The Dowager in Oils is scraped down to the canvas.' }], gold: 5000, xp: 74000, item: 'robe', named: "The Dowager's Mourning", seed: 0x7fd09 },
  the_framer: { needs: 'a_thousand_faces', steps: [{ boss: 'framer' }, { back: true, say: 'The Framer is dead. Your count can stop.' }], gold: 5000, xp: 76000, item: 'staff', named: 'The Mitre Rod', seed: 0x7ff4a },
  the_unfinished_sitting: { needs: 'the_dowager_in_oils', steps: [{ boss: 'painter' }, { back: true, say: 'The Painter is dead. Your portrait was never finished.' }], gold: 6400, xp: 94000, item: 'skull', named: 'The Unfinished Sitting', seed: 0x7f9a1 },
  // ---- the Alchemists' Undercroft (86 to 90): what they grow under the stills, and the key to the Crypt door ----
  under_the_stills: { needs: 'the_quiet_watchs_steel', steps: [{ enter: 'undercroft' }, { back: true, say: 'There is a floor under the stills. They grow things.' }], gold: 4000, xp: 64000 },
  // (The labels say which wells; drain caps, out of the sewers, are what the dyers test a well with.)
  the_poison_cupboard: { needs: 'under_the_stills', steps: [{ visit: ['room:au_cupboard'] }, { bring: 'cap', n: 8, at: 'westdrains' }], gold: 4400, xp: 68000, item: 'scroll' },
  stop_the_pumps: { needs: 'under_the_stills', steps: [{ kill: 'room:au_feed', n: 8 }, { back: true, say: 'Both pumps are stopped. Nothing goes down the pipes.' }], gold: 4600, xp: 70000 },
  up_the_hatch: { needs: 'under_the_stills', steps: [{ visit: ['room:au_hatch'] }, { enter: 'middleward' }, { back: true, say: "It comes up under the Alchemists' Wing. I left it open." }], gold: 4400, xp: 68000 },
  the_jar_mother: { needs: 'under_the_stills', steps: [{ boss: 'jarmother' }, { back: true, say: 'The Jar-Mother is dead. The jars are quiet.' }], gold: 5200, xp: 80000, item: 'robe', named: 'The Brine-Stiff Apron', seed: 0xa07a2 },
  the_distiller: { needs: 'under_the_stills', steps: [{ boss: 'distiller' }, { back: true, say: 'The Distiller is dead, and his vents are shut.' }], gold: 5200, xp: 80000, item: 'staff', named: 'The Long Ladle', seed: 0xa0d15 },
  the_great_work: { needs: 'the_jar_mother', steps: [{ boss: 'greatwork' }, { back: true, say: 'The Great Work is dead. I have the Glass Key.' }], gold: 6600, xp: 98000, item: 'skull', named: 'The Glass-Eyed Skull', seed: 0xa09a4 },
};
// The level each wants (src/ui/autobrain.js PLAN): [id, level].
export const LEVELS_A = [
  ['the_drowned_archive', 80], ['what_the_water_kept', 81], ['where_the_flood_goes', 81], ['the_sluice_wardens', 82], ['struck_from_the_index', 82], ['bound_in_calf', 83], ['the_drowned_lector', 85],
  ['a_thousand_faces', 83], ['the_frame_that_isnt', 84], ['sitters_down', 84], ['through_the_frame', 85], ['the_dowager_in_oils', 85], ['the_framer', 85], ['the_unfinished_sitting', 87],
  ['under_the_stills', 86], ['the_poison_cupboard', 87], ['stop_the_pumps', 87], ['up_the_hatch', 87], ['the_jar_mother', 88], ['the_distiller', 88], ['the_great_work', 90],
];
