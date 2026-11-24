// More of City State Phobos's quests' workings, set B (as src/folk/phobos-quests.js, which takes these in): the Librarian's
// household's work in four of Castle Velscour's dungeons (src/core/delve-castle-b.js): the Clockworks, the Menagerie of
// Chains, the Ossuary and the Hall of Mirrors. Their words: src/folk/lines/phobos-more-b.js.
// Places: a dungeon by its key (down inside it), one of its rooms ('room:<id>'), its bosses by theirs. Each dungeon's
// run of them has one that isn't a walk or a kill: a night out on the Approach to hear the clock, word carried down to the
// Quiet Watch in the city, bones brought back to be weighed, a question taken from one of the household to another.
export const RULES_B = {
  // ---- the Clockworks (90 to 96): through the Clock Tower's door at the end of the Horn Galleries, once the Painted Key's had ----
  the_clock_that_strikes: { needs: 'the_hornwings', steps: [{ enter: 'ph:approach', night: true }, { enter: 'clockworks' }, { back: true, say: "I've been inside the clock. It beats iron, Pip. Gongs." }], gold: 5200, xp: 78000 },
  stopping_the_train: { needs: 'the_clock_that_strikes', steps: [{ kill: 'room:cw_train', n: 5 }, { back: true, say: 'The Going Train is stopped. Count your gates again.' }], gold: 5600, xp: 84000 },
  behind_the_dial: { needs: 'the_clock_that_strikes', steps: [{ visit: ['room:cw_face', 'room:cw_esc'] }, { back: true, say: "I've stood behind the Great Dial, and in the Escapement." }], gold: 5600, xp: 86000, item: 'scroll' },
  the_striker: { needs: 'the_clock_that_strikes', steps: [{ boss: 'striker' }, { back: true, say: 'The Striker is scrap. Nothing beats the hours now.' }], gold: 6000, xp: 92000, item: 'skull', named: "The Striker's Hour", seed: 0xc10c1 },
  the_regulator: { needs: 'the_clock_that_strikes', steps: [{ boss: 'regulator' }, { back: true, say: 'The Regulator is stopped, and the pendulums with him.' }], gold: 6200, xp: 96000, item: 'robe', named: 'The Stopped Hour', seed: 0xc10c2 },
  the_clockmaker: { needs: 'the_striker', steps: [{ boss: 'clockmaker' }, { back: true, say: 'The Clockmaker is dead. I have his Winding Key.' }], gold: 7400, xp: 112000, item: 'staff', named: 'The Long Hand', seed: 0xc10c3 },
  // ---- the Menagerie of Chains (92 to 97): through the Menagerie's door in the Conservatory, once the Marshal's Key is had ----
  what_is_fed: { needs: 'the_household', steps: [{ enter: 'menagerie' }, { visit: ['room:mc_rows', 'room:mc_larder'] }, { back: true, say: "I've seen the Cage Rows, and the Larder. You were right." }], gold: 5400, xp: 82000 },
  the_wolf_runs: { needs: 'what_is_fed', steps: [{ kill: 'room:mc_runs', n: 5 }, { talk: 'ph_watch', say: 'Jory Tallis says the wall has five hounds fewer tonight.', end: true }], gold: 5800, xp: 88000 },
  under_the_great_cage: { needs: 'what_is_fed', steps: [{ visit: ['room:mc_aviary', 'room:mc_tank'] }, { back: true, say: "The Aviary's as tall as its roof. The Tank's half water." }], gold: 5800, xp: 90000, item: 'gem', seed: 0x3e9a1 },
  old_hunger: { needs: 'what_is_fed', steps: [{ boss: 'oldhunger' }, { back: true, say: 'Old Hunger is dead in his pit.' }], gold: 6200, xp: 96000, item: 'skull', named: "Old Hunger's Tooth", seed: 0x3e9a2 },
  the_matron_of_wings: { needs: 'what_is_fed', steps: [{ boss: 'matron' }, { back: true, say: 'The Matron of Wings is down. Your horns are yours.' }], gold: 6400, xp: 100000, item: 'staff', named: 'The Shriek', seed: 0x3e9a3 },
  the_keeper_of_chains: { needs: 'old_hunger', steps: [{ boss: 'keeper' }, { back: true, say: 'The Keeper of Chains is dead. The cages stand open.' }], gold: 7600, xp: 116000, item: 'robe', named: "The Keeper's Coat", seed: 0x3e9a4 },
  // ---- the Ossuary (100 to 104): on the High Ward's east terrace ----
  where_she_sang: { needs: 'the_feast_that_walks', steps: [{ enter: 'ossuary' }, { back: true, say: "I've stood in the Bone Porch. The walls are as you said." }], gold: 6600, xp: 104000 },
  names_in_the_wall: { needs: 'where_she_sang', steps: [{ visit: ['room:oc_nave', 'room:oc_charnel', 'room:oc_crypt'] }, { back: true, say: 'The nave, the Charnel Aisle, the Under-Crypt. No names.' }], gold: 7000, xp: 110000, item: 'scroll' },
  the_cantor_of_jaws: { needs: 'where_she_sang', steps: [{ boss: 'cantor' }, { back: true, say: 'The Cantor of Jaws sings no more.' }], gold: 7600, xp: 120000, item: 'skull', named: "The Cantor's Jaw", seed: 0x055a1 },
  the_old_priors: { needs: 'where_she_sang', steps: [{ kill: 'room:oc_crypt', n: 6 }, { bring: 'bone', n: 8, at: 'room:oc_crypt' }], gold: 7200, xp: 114000 },
  the_bone_prior: { needs: 'the_cantor_of_jaws', steps: [{ boss: 'boneprior' }, { back: true, say: 'The Bone Prior is dead. I have the Bone Key.' }], gold: 8800, xp: 136000, item: 'robe', named: "The Prior's Pall", seed: 0x055a2 },
  // ---- the Hall of Mirrors (106 to 110): on the High Ward's south terrace, once the Keeper's Key is had ----
  the_silvered_door: { needs: 'the_household', steps: [{ enter: 'mirrors' }, { back: true, say: "I've been through the Silvered Door. Don't ask what I saw." }], gold: 7200, xp: 116000 },
  cover_the_glasses: { needs: 'the_silvered_door', steps: [{ kill: 'room:hm_east', n: 5 }, { kill: 'room:hm_west', n: 5 }, { kill: 'room:hm_maze', n: 3 }, { back: true, say: 'All three rooms are empty. Their glasses are draped.' }], gold: 8000, xp: 128000, item: 'gem', seed: 0x51b01 },
  the_room_on_no_plan: { needs: 'the_silvered_door', steps: [{ visit: ['room:hm_dark', 'room:hm_maze'] }, { talk: 'ph_ondine', say: 'Wynn asks who sat in the Covered Room.' }, { back: true, say: 'Your room is there, behind a draped glass. And the maze.' }], gold: 7800, xp: 124000, item: 'scroll' },
  the_glazier: { needs: 'the_silvered_door', steps: [{ boss: 'glazier' }, { back: true, say: 'The Glazier is dead among his glass.' }], gold: 8400, xp: 132000, item: 'skull', named: "The Glazier's Eye", seed: 0x51b02 },
  the_duchess_and_her_glass: { needs: 'the_glazier', steps: [{ boss: 'duchess' }, { back: true, say: 'The Duchess is dead. Her Glass is only glass.' }], gold: 9800, xp: 152000, item: 'staff', named: 'The True Glass', seed: 0x51b03 },
};
// The level each wants (src/ui/autobrain.js PLAN): [id, level].
export const LEVELS_B = [
  ['the_clock_that_strikes', 90], ['stopping_the_train', 91], ['behind_the_dial', 92], ['the_striker', 93], ['the_regulator', 94], ['the_clockmaker', 96],
  ['what_is_fed', 92], ['the_wolf_runs', 93], ['under_the_great_cage', 94], ['old_hunger', 94], ['the_matron_of_wings', 95], ['the_keeper_of_chains', 97],
  ['where_she_sang', 100], ['names_in_the_wall', 101], ['the_old_priors', 102], ['the_cantor_of_jaws', 102], ['the_bone_prior', 104],
  ['the_silvered_door', 106], ['the_room_on_no_plan', 107], ['cover_the_glasses', 107], ['the_glazier', 108], ['the_duchess_and_her_glass', 110],
];
