// The Deepwood and the Sorrowhorn: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/deepwood.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs deepwood` says what breaks it; `node tools/quests/sheet.mjs deepwood`
// lays the region out to be read.
//
// Four hubs up the Pilgrims' Road, north-west of Palmers' Rest: Mossgate Hide (8 to 9), the trappers' hide at the first
// station, where the wood closes in; the Hermit's Hollow (10 to 11), his one room and his silent hives up a lane; the
// Broken Stair (12 to 13), the seventh station at the foot of the Sorrowhorn, where the guide waits for someone to take up;
// and the Crown of Teeth on its top (14 to 15), the end of its road: a woman who went up to watch the door in the caldera
// and stayed, and who sends you down off the mountain west to Scavengers' Pit when you've done what you can up there.
// The Elder Dragon Gods' two are hers now (Sergeant Hasket's at Cinderford before), and so is the climb to the Crown
// (Orrin Vey's, from Bellmourn four kilometres off: Isla Crag's now, from the foot of it).
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Mossgate Hide: the trapper who keeps the first station's peg (sent to from Palmers' Rest), and a palmer laid up across
  // his fire, whose company went on without her.
  { id: 'fenn', name: 'Fenn Hollis', title: 'Trapper, at Mossgate Hide', body: 'c_worker_1', sex: 'm', age: 35, ...at('mossgate'), idles: ['look_around', 'idle', 'fold_arms'] },
  { id: 'merry', name: 'Merry Cotter', title: 'Palmer, laid up at Mossgate Hide', body: 'c_wife_jolly_2', sex: 'f', age: 38, ...by('mossgate'), idles: ['wait', 'idle_ual', 'look_around'] },
  // The Hermit's Hollow, an old place and no camp: by his fire (src/core/sites.js deepwood(), hermit_fire), 180 m above
  // the dolls in the lane. He keeps no board: he takes nothing for anything.
  { id: 'bede', name: 'Old Bede', title: "Of the Hermit's Hollow", body: 'c_old_man_1', sex: 'm', age: 78, post: [-1302.8, -1496.4], face: -0.6, idles: ['idle_ual', 'wait', 'scratch'] },
  // The Broken Stair, the seventh station: the guide by the gate (sorrowhorn(), stair_gate), who sells what a climb wants;
  // and a palmer on the stones by the pilgrims' shelter, facing the mountain.
  { id: 'isla', name: 'Isla Crag', title: 'Guide, at the Broken Stair', body: 'c_worker_f_1', sex: 'f', age: 46, post: [-1639.7, -1895.7], face: 0.712, trade: 'sutler', idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'ebba', name: 'Ebba Dunn', title: 'Palmer, at the seventh station', body: 'c_crone_2', sex: 'f', age: 66, post: [-1631.8, -1897.2], face: -2.43, idles: ['wait', 'idle_ual', 'look_around'] },
  // The Crown of Teeth: on the shelf in the caldera, west of the door on the frozen lake's south shore, looking along the
  // shore at it and at the red dragon asleep by it (156 m off; it stands up for whoever comes within 100 m: src/core/
  // tripo-monsters.js crown_dragon). The straight way to her up from the whelps' rib keeps 134 m wide of it, and so does
  // the way round her pillars. (Nowhere on the shelf is past 220 m of it: the caldera's wall is a cliff beyond.)
  { id: 'yrsa', name: 'Yrsa', title: 'Who watches the door, on the Crown of Teeth', body: 'c_redhead_2', sex: 'f', age: 51, post: [-2704, -2898], face: 1.69, idles: ['look_around', 'fold_arms', 'wait'] },
];

export const RULES = {
  // ---- Mossgate Hide, at the first station, where the wood closes over the Pilgrims' Road, levels 8 to 9 (Fenn Hollis; Merry
  // Cotter): the palmers who come down by night off the road into the webs west (three of what's in there, spider or walker:
  // the webs had been holding them), the straw company resting in the Stitched Field east (Merry's), and the wolfkin of
  // Howlers' Scrape south, who walk on two legs, so Fenn never set for them, and have started setting for him. Then salt up
  // the lane to the hermit, through the dolls standing in it ----
  coming_down: { steps: [{ kill: 'lair:deep_spiders', n: 3, spots: [[-1862, -1333]] }, { back: true, say: 'Three of what was in the webs are down. The walkers were palmers.' }], gold: 18, xp: 176 },
  the_resting_company: { steps: [{ clear: 'den_stitched' }, { back: true, say: "The Stitched Field is down. Straw, every one." }], gold: 32, xp: 320 },
  snares_on_the_runs: { steps: [{ clear: 'den_howlscrape' }, { back: true, say: "Howlers' Scrape is empty. The big one too." }], gold: 36, xp: 360, item: 'robe' },
  salt_for_the_hermit: { needs: 'snares_on_the_runs', steps: [{ kill: 'lair:hollow_dolls', n: 2 }, { talk: 'bede', say: 'Fenn Hollis sends salt, and asks are you living.', end: true }], gold: 4, xp: 35 },

  // ---- the Hermit's Hollow, up its lane off the Pilgrims' Road, levels 10 to 11 (Old Bede): the bait-skeps he hung in the
  // limes round the Weavers' Hollow north-east, where his bees worked (one has been lived in since midsummer, and cut out);
  // and, given with it (both in hand, the hollow walked to once), the hollow itself, webbed tree to tree, where they went; then the candle-ends the dead in his lane still carry, his
  // own wax, that every palmer who knocked had off him for the night before the seventh stone; and the block he makes of
  // them up to the Broken Stair, past the demons who sit by the road below it ----
  bait_skeps: { steps: [{ gather: 'outpost:den_weavershollow', n: 5, what: 'bait-skeps', spots: [[-34, 30], [-44, 12], [-26, 40], [-30, -34], [0, -44]] }, { back: true, say: 'Five skeps, out of the limes. One has comb in it.' }], gold: 22, xp: 220 },
  telling_the_bees: { steps: [{ clear: 'den_weavershollow' }, { back: true, say: "The Weavers' Hollow is empty. Your bees are in the webs." }], gold: 40, xp: 400, item: 'staff' },
  candle_ends: { needs: 'telling_the_bees', steps: [{ kill: 'lair:hollow_dolls', n: 3 }, { gather: 'lair:hollow_dolls', n: 5, what: 'candle-ends', spots: [[-20, -40], [24, -38], [44, -12], [-46, 4], [-30, 34]] }, { back: true, say: 'Five candle-ends, off the lane where they stood. Your wax.' }], gold: 24, xp: 242 },
  the_last_of_the_wax: { needs: 'candle_ends', steps: [{ kill: 'lair:stair_demons', n: 1 }, { talk: 'isla', say: 'Old Bede sends the last of his wax, for the light.', end: true }], gold: 4, xp: 35 },

  // ---- the Broken Stair, the seventh station at the foot of the Sorrowhorn, levels 12 to 13 (Isla Crag; Ebba Dunn): the
  // black whelps put out onto the shoulder, the way up, sat on something bright in their stones (Yrsa's ink-horn); the pages
  // of her book blown about the frozen camp at Greywatch, the ruined tower on the shoulder below them (the last one Isla
  // took up, who wouldn't come down); and the Wakehouse south, where palmers kept the night before the seventh stone, full
  // of what eats what you carry in your head (Ebba's: the words for the stone). Then up to the Crown by the shoulder, past
  // the demons above the whelps and Isla's mother's cairn below the rim, to the one who went up ----
  the_shoulder: { steps: [{ kill: 'lair:horn_whelps', n: 2 }, { gather: 'lair:horn_whelps', n: 1, what: 'an ink-horn', spots: [[-12, 6]] }, { back: true, say: 'Two of the whelps are dead. They were sat on this.' }], gold: 26, xp: 264 },
  the_night_book: { steps: [{ gather: 'stair', n: 4, what: 'pages', spots: [[-127, -353], [-120, -352], [-116, -350], [-121, -345]] }, { back: true, say: 'Four pages, from the camp at Greywatch. Nobody was in it.' }], gold: 26, xp: 264 },
  the_broken_vigil: { steps: [{ clear: 'den_brokenvigil' }, { back: true, say: 'The Wakehouse is empty. What fed in it is dead.' }], gold: 52, xp: 520, item: 'skull' },
  crown_of_teeth: { needs: ['the_shoulder', 'the_night_book'], steps: [{ kill: 'lair:horn_demons', n: 2 }, { gather: 'crown', n: 1, what: 'the cairn-tin', spots: [[73, 227]] }, { talk: 'yrsa', say: 'Isla Crag sends me up, with your ink-horn. She has your pages.', end: true }], item: 'scroll', gold: 4, xp: 35 },

  // ---- the Crown of Teeth, the top of the Sorrowhorn, 14 to 15, then 24 and 100 and up (Yrsa): rubbings of the marks at
  // the feet of the four pillars on her side of the lake; the three demons that sit by the broken one on the north shelf
  // (src/core/tripo-monsters.js crown_sitters, 165 m from the dragon and 245 m from her); then her silver down off the mountain south-west, to
  // Scavengers' Pit, by way of the necromancers a little past it north-west, for ink for the ink-horn Isla sent up, empty and cracked (Mab Crowe, who buys and sells anything: the Waste's, src/folk/regions/waste.js; its own work is 17 and up). And for
  // whoever comes back up the size for it: the red dragon asleep on the south shore by the door (no use going through with
  // it at your back); then the door, the Elder Dragon Gods: the first god, then the other three. The end of its road ----
  the_pillars: { steps: [{ gather: 'crown', n: 4, what: 'rubbings', spots: [[-99, -5], [-88, -45], [-45, -88], [-5, -99]] }, { back: true, say: 'Four rubbings, off the feet of the pillars on this side.' }], gold: 31, xp: 308 },
  the_sitters: { steps: [{ kill: 'lair:crown_sitters', n: 2 }, { back: true, say: 'Two of the three by the broken pillar are dead.' }], gold: 31, xp: 308 },
  ink_for_the_crown: { needs: 'the_pillars', steps: [{ kill: 'lair:waste_necros', n: 2 }, { talk: 'mab', say: 'Yrsa, on the Crown of Teeth, sends silver for ink. All you have.', end: true }], gold: 4, xp: 35 },
  red_on_the_shore: { steps: [{ kill: 'lair:crown_dragon', n: 1 }, { back: true, say: 'The red one on the south shore is dead.' }], gold: 53, xp: 528, item: 'skull' },
  storm_over_the_horn: { needs: 'red_on_the_shore', steps: [{ enter: 'elder' }, { boss: 'thyrraxis' }, { back: true, say: 'There is a storm god on an island over nothing. It is dead.' }], gold: 2400, xp: 42000, item: 'staff', rarity: 4 },
  the_hollow_star: { needs: 'storm_over_the_horn', steps: [{ boss: 'kaldurra' }, { boss: 'morvekh' }, { boss: 'nihvaroth' }, { back: true, say: 'The Hollow Star went into its own Maw. The door is dark.' }], gold: 5200, xp: 96000, item: 'skull', rarity: 4 },

  // ---- the Herald the Elder Dragon Gods sent this way (src/core/wilds.js WORLD_BOSSES, docs/ELDER-DRAGONS.md "On the land"): it
  // rises at its ground (src/core/boss-grounds.js) once you've taken this, and the other Tessariels come in to it ----
  a_tooth_of_the_star: { needs: 'the_shoulder', steps: [{ wboss: 'herald_hollow', ground: 'bg_herald_hollow' }, { back: true, say: 'Umbraxes is down. The snow shines round where it lay.' }], gold: 100, xp: 1000, item: 'staff' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up and each errand on is a
// level above the work it waits for: Mossgate 8 to 9, the hermit 10 to 11, the Stair 12 to 13, the climb to the Crown 14,
// the Crown's own 14 and the errand down to the Pit 15 (Mab's own work is 16 and 17). The Crown keeps two for whoever comes back up: the red one at 24,
// the Gods at a hundred.
export const LEVELS = [
  ['coming_down', 8], ['the_resting_company', 8], ['snares_on_the_runs', 9], ['salt_for_the_hermit', 10],
  ['bait_skeps', 10], ['telling_the_bees', 10], ['candle_ends', 11], ['the_last_of_the_wax', 11],
  ['the_shoulder', 12], ['the_night_book', 12], ['the_broken_vigil', 13], ['crown_of_teeth', 14], ['a_tooth_of_the_star', 13],
  ['the_pillars', 14], ['the_sitters', 14], ['ink_for_the_crown', 15],
  ['red_on_the_shore', 24], ['storm_over_the_horn', 100], ['the_hollow_star', 102],
];
