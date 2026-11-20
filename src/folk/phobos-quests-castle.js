// Castle Velscour's later quests' workings (as src/folk/phobos-quests.js, which takes these in): the way down behind the
// Librarian's bookcase and the work of the people in Pell's Holdout; the Librarian's own errands, which send you after
// every key in the castle; the household's, up its towers; and the roof-runners' in the Gargoyles' Roost, over the
// Needles and the bridges. Their words: src/folk/lines/phobos-more-castle.js. Places: a delve by its key, a room of one
// ('room:<id>'), a lookout ('vista:<id>': src/core/castle-finds.js). Keys and what they open: src/core/castle-keys.js.
export const RULES_CASTLE = {
  // ---- the way down, and the Holdout's own (src/core/delve-highward.js DEEP_STACKS) ----
  the_bookcase: { needs: 'the_household', steps: [{ enter: 'deepstacks' }, { talk: 'ho_vane', say: 'Master Pell sent me down. He said to say: the third shelf.' }, { talk: 'ho_coyle', say: "Hesper Vane says you'll want to look at me.", end: true }], gold: 2400, xp: 46000 },
  mouths_to_feed: { needs: 'the_bookcase', steps: [{ visit: ['room:cl_kitchen', 'room:cl_cellar'] }, { back: true, say: 'His larder is lighter, and nobody counted.' }], gold: 2800, xp: 48000 },
  the_way_they_came: { needs: 'the_bookcase', steps: [{ kill: 'deepstacks', n: 10 }, { back: true, say: 'Ten of them. The Stacks are thinner.' }], gold: 3200, xp: 52000 },
  cold_iron: { needs: 'the_bookcase', steps: [{ kill: 'room:cl_forge', n: 4 }, { back: true, say: 'The Forge is quiet. Your tongs are where you left them.' }], gold: 3400, xp: 54000, item: 'staff', named: "Thole's Cold Iron", seed: 0x7401e },
  the_long_count: { needs: 'the_bookcase', steps: [{ visit: ['room:cd_index', 'room:cd_sump', 'room:cl_oub'] }, { back: true, say: "I've been in all three. Your marks are still on the walls." }], gold: 3600, xp: 56000, item: 'gem', seed: 0x9e771 },
  what_the_censor_burns: { needs: 'the_way_they_came', steps: [{ boss: 'censor' }, { back: true, say: 'The Censor is dead. His fire is out.' }], gold: 5200, xp: 78000, item: 'skull', named: 'The Unburnt Page', seed: 0xce450 },
  bets_lesson: { needs: 'the_bookcase', steps: [{ visit: ['vista:well_of_books'] }, { back: true, say: 'Six storeys. I counted them twice.' }], gold: 600, xp: 30000 },
  // ---- the household's, up the castle's towers (src/core/phobos-build.js castleTowers) ----
  a_view_for_a_princess: { needs: 'the_gate_captain', steps: [{ visit: ['vista:small14', 'vista:small16'] }, { back: true, say: "I've stood on both turrets over his yard." }], gold: 2600, xp: 44000 },
  wynns_towers: { needs: 'wynns_map', steps: [{ visit: ['vista:sat0', 'vista:sat8', 'vista:sat9', 'vista:sat10', 'vista:sat11'] }, { back: true, say: 'Five towers, and every stair in them.' }], gold: 4200, xp: 62000, item: 'scroll' },
  pips_dare: { needs: 'the_hornwings', steps: [{ visit: ['vista:horns'] }, { back: true, say: "I stood on the Horn Tower's head. You can see the whole city." }], gold: 1800, xp: 50000 },
  jorys_strongboxes: { needs: 'the_household', steps: [{ visit: ['room:cm_maps', 'room:cm_horns', 'room:cm_conserv'] }, { back: true, say: 'All three are where you put them. Two are still locked.' }], gold: 3800, xp: 56000 },
  the_black_nave: { needs: 'the_feast_that_walks', steps: [{ enter: 'highward' }, { visit: ['vista:black_nave'] }, { kill: 'room:ch_sanct', n: 6 }, { back: true, say: 'The Sanctuaries are quiet. Nobody is singing in them.' }], gold: 7200, xp: 110000, item: 'robe', named: "The Cantor's White", seed: 0x5a9c7 },
  // ---- the Librarian's: the High Ward, its two great things, and the lift home ----
  up_the_sanctuaries_stair: { needs: 'the_bookcase', steps: [{ enter: 'highward' }, { back: true, say: "I've been up the Sanctuaries Stair. It lets out in his nave." }], gold: 6000, xp: 96000 },
  the_star_reader: { needs: 'up_the_sanctuaries_stair', steps: [{ boss: 'starreader' }, { back: true, say: 'The Star-Reader is dead, and his sky has stopped.' }], gold: 8200, xp: 130000, item: 'staff', named: 'The Orrery Arm', seed: 0x57a44 },
  the_scriveners_lift: { needs: 'up_the_sanctuaries_stair', steps: [{ visit: ['room:ch_roost'] }, { talk: 'ho_wren', say: 'Master Pell says the lift behind you goes down to people he trusts.' }, { enter: 'deepstacks' }, { back: true, say: 'The lift runs. The Roost and the Holdout are one stair apart now.' }], gold: 6400, xp: 100000 },
  the_sexton: { needs: 'the_star_reader', steps: [{ boss: 'sexton' }, { back: true, say: 'The Sexton of the High Ward is dead. I have his ring.' }], gold: 12000, xp: 190000, item: 'skull', named: "The Sexton's Last Lantern", seed: 0x5e870 },
  // ---- the roof-runners', in the Gargoyles' Roost: the Needles, the bridges, the high places ----
  the_high_round: { needs: 'the_scriveners_lift', steps: [{ visit: ['vista:widow', 'vista:gallows', 'vista:thorn', 'vista:red'] }, { back: true, say: 'Four Needles, and the three bridges between them. Nobody saw me.' }], gold: 7600, xp: 120000, item: 'robe', named: "The Roof-Runner's Greys", seed: 0x40f17 },
  every_needle: { needs: 'the_high_round', steps: [{ visit: ['vista:cinder', 'vista:ash', 'vista:keep_crown'] }, { back: true, say: "Both ends of the rim, and the Keep's own crown. That's all of it." }], gold: 9800, xp: 150000, item: 'skull', named: "The Gargoyle's Eye", seed: 0x6a961 },
  rooks_ledger: { needs: 'the_scriveners_lift', steps: [{ visit: ['vista:clock', 'vista:patio-1', 'vista:patio1', 'vista:keep_patio'] }, { back: true, say: 'The Clock Tower, both belvederes and the Crown Court.' }], gold: 6800, xp: 104000 },
  the_reliquary: { needs: 'rooks_ledger', steps: [{ visit: ['room:ch_reliq'] }, { back: true, say: "I've been in the Reliquary. It was guarded." }], gold: 9000, xp: 140000, item: 'gem', seed: 0x2e11c },
};
// Who gives each (their words say so too: src/folk/lines/phobos-more-castle.js).
export const GIVERS_CASTLE = {
  the_bookcase: 'ph_librarian', mouths_to_feed: 'ho_coyle', the_way_they_came: 'ho_vane', cold_iron: 'ho_thole', the_long_count: 'ho_nettle', what_the_censor_burns: 'ho_marrow', bets_lesson: 'ho_bet',
  a_view_for_a_princess: 'apricot', wynns_towers: 'ph_wynn', pips_dare: 'ph_pip', jorys_strongboxes: 'ph_jory', the_black_nave: 'ph_ondine',
  up_the_sanctuaries_stair: 'ph_librarian', the_star_reader: 'ph_librarian', the_scriveners_lift: 'ph_librarian', the_sexton: 'ph_librarian',
  the_high_round: 'ho_wren', every_needle: 'ho_wren', rooks_ledger: 'ho_rook', the_reliquary: 'ho_rook',
};
// The level each wants (src/ui/autobrain.js PLAN): [id, level].
export const LEVELS_CASTLE = [
  ['a_view_for_a_princess', 68], ['the_bookcase', 78], ['bets_lesson', 78], ['mouths_to_feed', 78], ['the_way_they_came', 79], ['cold_iron', 80], ['the_long_count', 80],
  ['jorys_strongboxes', 80], ['what_the_censor_burns', 82], ['wynns_towers', 84], ['pips_dare', 86],
  ['up_the_sanctuaries_stair', 95], ['the_black_nave', 96], ['the_scriveners_lift', 97], ['rooks_ledger', 98], ['the_high_round', 99], ['the_star_reader', 100],
  ['every_needle', 102], ['the_reliquary', 103], ['the_sexton', 106],
];
