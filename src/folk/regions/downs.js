// The Green Downs: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/downs.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs downs` says what breaks it; `node tools/quests/sheet.mjs downs`
// lays the region out to be read.
//
// Five hubs, east of Bellmourn: Cairnwatch (5 to 6), Millhaven (5 to 7), the Bell Tower of the Four Watches (6 to 9, whose
// two stand in src/folk/lines/beyond.js BEYOND), Dunmow Fold (6 to 8) and Kestrel Hide (9 to 11, the end of its road:
// sent to from Thornwick). Ser Hale's eight older quests, down the dungeons far off, are still in src/folk/land-quests.js
// till the makers of those dungeons' regions move them to whoever stands by their doors.
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Cairnwatch: the keeper of the cairns and the beacon, and a woman up from Bellmourn with a stone to set.
  { id: 'cuddy', name: 'Cuddy Stone', title: 'Cairn-keeper, at Cairnwatch', body: 'c_sage_1', sex: 'm', age: 61, ...at('cairnwatch'), idles: ['look_around', 'fold_arms', 'idle'] },
  { id: 'ede', name: 'Ede Lowry', title: 'Up from Bellmourn, at Cairnwatch', body: 'c_young_2_1', sex: 'f', age: 34, ...by('cairnwatch'), idles: ['wait', 'idle', 'look_around'] },
  // Millhaven, an old place and no camp: both on the green north of the road (src/core/sites.js downs(): the stall the
  // spot `millhaven_green` is before, and between the well and the market pillar). Joan keeps the board.
  { id: 'abel', name: 'Abel Fenwick', title: 'Farmer, of Millhaven', body: 'c_worker_2_2', sex: 'm', age: 49, post: [2046, -17], face: 0, idles: ['fold_arms', 'scratch', 'look_around'] },
  { id: 'joan', name: 'Joan Millward', title: "The miller's daughter, of Millhaven", body: 'c_wife_jolly_1', sex: 'f', age: 38, post: [2041.35, -7.5], face: 0, trade: 'sutler', idles: ['fold_arms_ual', 'look_around', 'wait'] },
  // Dunmow Fold: the shepherd, and the hurdle-maker across the fire.
  { id: 'rafe', name: 'Rafe Dunmow', title: 'Shepherd, at Dunmow Fold', body: 'c_old_man_2', sex: 'm', age: 68, ...at('dunmow'), idles: ['idle_ual', 'look_around', 'scratch'] },
  { id: 'madge', name: 'Madge Wattle', title: 'Hurdle-maker, at Dunmow Fold', body: 'c_worker_f_2', sex: 'f', age: 52, ...by('dunmow'), idles: ['fold_arms', 'wait', 'look_around'] },
  // Kestrel Hide: the fowler, and her brother across the fire.
  { id: 'sib', name: 'Sib Kestrel', title: 'Fowler, at Kestrel Hide', body: 'c_redhead_1', sex: 'f', age: 33, ...at('kestrel'), idles: ['look_around', 'idle', 'wait'] },
  { id: 'joss', name: 'Joss Kestrel', title: "Sib's brother, at Kestrel Hide", body: 'c_dude_3', sex: 'm', age: 29, ...by('kestrel'), idles: ['idle', 'scratch', 'look_around'] },
  // (Jem Sledge, whom the Bell Tower's errand on is said to, is the Rustwood's: src/folk/regions/rustwood.js.)
];

export const RULES = {
  // ---- Cairnwatch, on the rise over the Cairnfield, levels 5 to 6 (the look-round ends at the Cairnfield, whose keepers are the hardest of the three) (Cuddy Stone; Ede Lowry): three things Cuddy can see
  // from the platform and can't account for (a look at each), who's opening the cairns, the name-boards pulled up round
  // Paupers' Field (three lying out, two close in: the one place the region says so), and the field of scarecrows that grows by one a morning, last ----
  from_the_platform: { steps: [{ visit: ['outpost:den_strawacre', 'outpost:den_paupers', 'cairnfield'] }, { back: true, say: "I've stood at all three. None of it is what you hoped." }], gold: 9, xp: 90 },
  cairnfield: { steps: [{ kill: 'lair:cairn_keepers', n: 3 }, { back: true, say: 'Three are down among the cairns. The stones are let alone.' }], gold: 13, xp: 130 },
  name_boards: { steps: [{ gather: 'outpost:den_paupers', n: 5, what: 'name-boards', spots: [[-41, 13], [11, -43], [35, 25], [-13, 12], [10, -11]] }, { back: true, say: 'Five boards, from round the wall.' }], gold: 11, xp: 110 },
  one_more_each_morning: { steps: [{ clear: 'den_strawacre' }, { back: true, say: "Strawman's Acre is empty. The wicker one too." }], gold: 24, xp: 240, item: 'robe' },
  sails_at_a_slant: { needs: 'one_more_each_morning', steps: [{ kill: 'lair:abbey_rd_goblins', n: 2 }, { talk: 'joan', say: 'Cuddy Stone asks why your sails have stood a month.' }, { talk: 'abel', say: "Tobin Wain's cart is coming up with Hob Fenwick's barley.", end: true }], gold: 4, xp: 35 },

  // ---- Millhaven, on the Hill Road, levels 5 to 7 (Abel Fenwick; Joan Millward): what came up out of Abel's pond, the
  // three stood in Joan's mill yard, her flour gone to Mudwall Stockade (the stockade, then her sacks from round it), and the Barley
  // Rows, last. Then a word up the knoll (the ploughman who isn't coming home for the barley) and a word to Dunmow ----
  millhaven_jelly: { steps: [{ kill: 'millhaven', n: 4, of: 9 }, { back: true, say: 'Four of them. Your pond is water again.' }], gold: 11, xp: 110 },
  three_under_the_sails: { steps: [{ kill: 'lair:mill_dolls', n: 2 }, { back: true, say: "Two are down. They weren't customers." }], gold: 11, xp: 110 },
  flour_and_water: { steps: [{ clear: 'den_mudwall' }, { gather: 'outpost:den_mudwall', n: 5, what: 'flour sacks' }, { back: true, say: 'Mudwall is empty. Five sacks.' }], gold: 27, xp: 270 },
  barley_rows: { steps: [{ clear: 'den_barleyrows' }, { back: true, say: 'The Barley Rows are empty. Your barley can be cut.' }], gold: 28, xp: 280, item: 'staff' },
  not_for_the_barley: { needs: 'barley_rows', steps: [{ talk: 'hale', say: 'Abel Fenwick asks if you mean to come home for the barley.' }, { talk: 'bellwright', say: 'Abel Fenwick asks why the dead walk wide of your hill.', end: true }], gold: 4, xp: 35 },
  bran_for_dunmow: { needs: 'barley_rows', steps: [{ kill: 'lair:downs_raiders', n: 3 }, { talk: 'rafe', say: 'Joan Millward has your bran weighed, and nobody to fetch it.', end: true }], gold: 4, xp: 35 },

  // ---- the Bell Tower of the Four Watches, on its knoll, levels 7 to 9 (Ser Anselm Toller; Ser Hale Orrowick):
  // the tower's four ropes, gone to lash Bramble Stockade; what the crabs have left on the shore of the falls (west bank
  // only: the cliff is the east); the drake on the cliff-top; and what answers the Bellwright's count at the third watch,
  // heard by night and then emptied, which pays the Wingbell (the road on waits for Hale's daylight work, not for the dark). All of it Tessariel's side's: nothing here names the other ----
  four_ropes: { steps: [{ clear: 'den_bramble' }, { back: true, say: 'Bramble Stockade is empty. I found your ropes.' }], gold: 16, xp: 160 },
  a_right_pauldron: { steps: [{ gather: 'falls', n: 5, what: 'pieces of harness', spots: [[-27, -37], [-9, -45], [-47, -13], [-21, 41], [-34, 43]] }, { back: true, say: 'Five pieces, off the shore. Look at them.' }], gold: 15, xp: 155 },
  two_of_three: { steps: [{ kill: 'lair:falls_drake', n: 2 }, { back: true, say: 'Two of the three on the cliff-top are dead.' }], gold: 18, xp: 175 },
  what_answers: { steps: [{ enter: 'outpost:den_hornedstones', night: true }, { clear: 'den_hornedstones' }, { back: true, say: 'It was the great ram, on the tall stone. They are all down.' }], charm: 'wingbell', charmName: 'the Wingbell', xp: 360 },
  block_for_the_frame: { needs: 'two_of_three', steps: [{ talk: 'jem', say: 'Ser Anselm Toller asks for a yard of stone up his knoll.', end: true }], gold: 3, xp: 30 },

  // ---- Dunmow Fold, off the roads south-west of Millhaven, levels 6 to 7 (Rafe Dunmow; Madge Wattle): wool from under
  // the Screaming Crag, Madge's hurdles from the goblins by the Gallows Road (one down first: the lair holds two), Bleatmoot, and the Crag, last ----
  plucked: { steps: [{ gather: 'outpost:den_screamcrag', n: 5, what: 'tufts of wool', spots: [[-39, -16], [8, 43], [-33, 27], [17, 1], [-10, 13]] }, { back: true, say: 'Five tufts, from under the Crag.' }], gold: 13, xp: 130 },
  six_bar_hurdles: { steps: [{ kill: 'lair:gallows_rd_goblins', n: 1 }, { gather: 'lair:gallows_rd_goblins', n: 4, what: 'hurdles', spots: [[-34, 12], [13, -36], [29, 21], [-8, -10]] }, { back: true, say: 'One goblin the fewer. Four hurdles.' }], gold: 13, xp: 130 },
  yan_tan_tethera: { steps: [{ clear: 'den_bleatmoot' }, { back: true, say: 'Bleatmoot is empty. The big one was not marked.' }], gold: 28, xp: 280 },
  the_screaming_crag: { needs: 'plucked', steps: [{ clear: 'den_screamcrag' }, { back: true, say: 'The Crag is quiet. The queen is dead.' }], gold: 32, xp: 320, item: 'robe' },
  strays: { needs: 'the_screaming_crag', steps: [{ kill: 'lair:downs_goats', n: 1 }, { talk: 'osric', say: 'Rafe Dunmow asks if tar-marked ewes came through your hedge.', end: true }], gold: 4, xp: 35 },

  // ---- Kestrel Hide, far off the roads by the ribs, levels 9 to 11 (Sib Kestrel; her brother Joss): her bird-calls from
  // round the Crooked Circle, two of what walked into the hide, the Circle, and the Gnawed Hollow, last. The end of its road ----
  bird_calls: { steps: [{ gather: 'outpost:den_crookedcircle', n: 5, what: 'bird-calls', spots: [[40, 12], [-15, 41], [-37, -19], [12, 11], [-9, -13]] }, { back: true, say: 'Five calls. One of them is not yours.' }], gold: 20, xp: 200 },
  off_the_spit: { steps: [{ kill: 'lair:den_gnawedhollow', n: 2 }, { back: true, say: 'Two of them have stopped looking.' }], gold: 20, xp: 200 },
  the_crooked_circle: { needs: 'bird_calls', steps: [{ clear: 'den_crookedcircle' }, { back: true, say: 'The Crooked Circle is empty. Nobody is whistling.' }], gold: 40, xp: 400 },
  the_gnawed_hollow: { needs: ['off_the_spit', 'the_crooked_circle'], steps: [{ clear: 'den_gnawedhollow' }, { back: true, say: 'The Hollow is empty. The red-eyed one is dead.' }], gold: 44, xp: 440, item: 'skull' },

  // ---- the Herald the Elder Dragon Gods sent this way (src/core/wilds.js WORLD_BOSSES, docs/ELDER-DRAGONS.md "On the land"): it
  // rises at its ground (src/core/boss-grounds.js) once you've taken this, and the other Tessariels come in to it ----
  the_empty_sky: { needs: 'the_gnawed_hollow', steps: [{ wboss: 'herald_gale', ground: 'bg_downs_1' }, { back: true, say: 'Veyrasz is down. The grass is getting up.' }], gold: 90, xp: 900, item: 'staff' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up, each errand on is
// a level above the work it waits for, and Dunmow (6 to 7) comes before the tower (7 to 9).
export const LEVELS = [
  ['from_the_platform', 5], ['cairnfield', 5], ['name_boards', 6], ['one_more_each_morning', 6], ['sails_at_a_slant', 6],
  ['millhaven_jelly', 5], ['three_under_the_sails', 5], ['flour_and_water', 6], ['barley_rows', 6], ['bran_for_dunmow', 6], ['not_for_the_barley', 7],
  ['plucked', 6], ['six_bar_hurdles', 6], ['yan_tan_tethera', 7], ['the_screaming_crag', 7], ['strays', 7],
  ['four_ropes', 7], ['a_right_pauldron', 7], ['two_of_three', 8], ['what_answers', 9], ['block_for_the_frame', 8],
  ['bird_calls', 9], ['off_the_spit', 9], ['the_crooked_circle', 10], ['the_gnawed_hollow', 11], ['the_empty_sky', 12],
];
