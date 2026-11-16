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
  lamps_on_the_rise: { needs: 'still_the_rows', steps: [{ kill: 'lair:phobos_mages', n: 3 }, { back: true, say: 'The lord on the Mages\' Rise is put out, and his two lamps with him.' }], gold: 600, xp: 5200, item: 'staff' },
};
// The level each wants (src/ui/autobrain.js PLAN): you come to Phobos at about twenty.
export const PHOBOS_LEVELS = [
  ['smoke_in_the_east', 20], ['loaves_for_the_rookeries', 20], ['the_pennyless_word', 21], ['quiet_men', 22], ['asking_around', 22], ['cinder_floors', 22],
  ['wardens_of_ash', 23], ['the_watchs_word', 23], ['still_the_rows', 24], ['bone_tithe', 25], ['the_wharf_web', 25], ['red_purses', 26],
  ['lamps_on_the_rise', 27], ['the_approach_by_night', 28],
];
