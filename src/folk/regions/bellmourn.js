// Bellmourn and the four roads out: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/bellmourn.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs bellmourn` says what breaks it; `node tools/quests/sheet.mjs bellmourn`
// lays the region out to be read.
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // The ring of camps a quarter of an hour out on each road: one person at each, who has the camp's work and keeps its board.
  { id: 'tobin', name: 'Tobin Wain', title: 'Carter, at Hillfoot Halt', body: 'c_worker_2_1', sex: 'm', age: 54, ...at('hillfoot'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'nan', name: 'Nan Dray', title: 'Drover, at the Forkstone', body: 'c_wife_big_1', sex: 'f', age: 47, ...at('forkstone'), idles: ['fold_arms_ual', 'look_around', 'wait'] },
  { id: 'perrin', name: 'Old Perrin Lowe', title: "Palmer, at Palmers' Rest", body: 'c_old_man_1', sex: 'm', age: 73, ...at('palmers'), idles: ['idle_ual', 'scratch', 'look_around'] },
  { id: 'maren', name: 'Maren Rush', title: 'Withy-cutter, at Withy Landing', body: 'c_young_3_1', sex: 'f', age: 31, ...at('withy'), idles: ['look_around', 'fold_arms', 'idle'] },
  // And a second at each, across the fire, with a quest of their own and nothing to sell.
  { id: 'bet', name: 'Bet Carrow', title: 'Carter, stuck at Hillfoot Halt', body: 'c_worker_f_1', sex: 'f', age: 41, ...by('hillfoot'), idles: ['fold_arms', 'wait', 'look_around'] },
  { id: 'tully', name: 'Tully Rush', title: "Maren's cousin, at Withy Landing", body: 'c_dude_2', sex: 'm', age: 24, ...by('withy'), idles: ['idle', 'scratch', 'look_around'] },
  { id: 'dickon', name: 'Dickon', title: "Nan Dray's herd-lad, at the Forkstone", body: 'c_wes_2', sex: 'm', age: 16, ...by('forkstone'), idles: ['look_around', 'idle', 'wait'] },
  { id: 'hild', name: 'Hild Ames', title: "Palmer, at Palmers' Rest", body: 'c_young_5_1', sex: 'f', age: 17, ...by('palmers'), idles: ['idle', 'look_around', 'wait'] },
  // placeholders: moved to their own region's file when it's made (four the ring's errands on are said to: each stands
  // at their camp so the errand can be walked and paid; their region's maker gives them their work and the rest of their words).
  // (Odo Marsh, whom Maren's errand is said to, is the Weeping Fen's now: src/folk/regions/fen.js; Dag Colley, whom Perrin's
  // is, the Ashen Waste's: src/folk/regions/waste.js; Amos Tye, whom Nan's is, the Barrow Moor's: src/folk/regions/moor.js; Berin Stoat, whom Nan's other is,
  // the Rimeholt Fells': src/folk/regions/fells.js; Fenn Hollis, whom Perrin's other is, the Deepwood's: src/folk/regions/deepwood.js.)
];

export const RULES = {
  // ---- Bellmourn: the Hollowfang Warrens, whose door is on the hill north-east, 240 m from the square ----
  // (Corran's first is what was two: through the arch, and twelve of what took Hob's barley while you're down there.)
  warrens_mouth: { needs: 'pines', steps: [{ enter: 'warrens' }, { kill: 'warrens', n: 12, foe: ['Goblins', 'Kobolds'] }, { back: true, say: "I've been down the hole on the hill. Twelve won't dig again." }], gold: 160, xp: 1000 },
  tunnel_king: { needs: 'warrens_mouth', steps: [{ boss: 'grubnash' }, { back: true, say: 'The big kobold is dead.' }], gold: 180, xp: 1200, item: 'staff' },
  mother_of_the_warren: { needs: 'tunnel_king', steps: [{ boss: 'twins' }, { boss: 'venomaw' }, { back: true, say: 'The thing at the bottom of the Warrens is dead.' }], gold: 400, xp: 2500, item: 'skull' },
  // ---- Bellmourn: a word down each of the four roads, to the camp a quarter of an hour out, paid there. None needs
  // anything first: each is one of the eleven Lisandra sends you round to (src/folk/lines/lisandra.js GIVERS), taken on her
  // round and walked when you're of a level for the camp. Three have a fight in the walk: what dens beside the road in ----
  carter_is_late: { steps: [{ enter: 'hillfoot' }, { talk: 'tobin', say: "Hob Fenwick's barley is sacked and waiting on your cart.", end: true }], gold: 3, xp: 30 },
  willow_bark: { steps: [{ kill: 'lair:fenway_goblins', n: 2 }, { talk: 'maren', say: "Sabine Moss sends coin for bark. Your road's clear.", end: true }], gold: 4, xp: 35 },
  one_fire_at_the_fork: { steps: [{ kill: 'lair:frost_kobolds', n: 2 }, { talk: 'nan', say: 'Jory Pell counts one fire here where there were three.', end: true }], gold: 4, xp: 35 },
  palmers_tally: { steps: [{ kill: 'lair:vigil_kobolds', n: 2 }, { talk: 'perrin', say: "Ser Aldric Halloway asks for this month's tally.", end: true }], gold: 4, xp: 35 },

  // ---- Hillfoot Halt, east on the Hill Road, levels 3 to 5 (Tobin Wain; Bet Carrow): kobolds in the rocks by the halt,
  // goblins up the road and in Gnawbone Stockade, and the kobolds' diggings under the road, with their foreman, last ----
  linchpins: { steps: [{ kill: 'lair:hill_kobolds', n: 2 }, { back: true, say: "Two kobolds won't draw another pin." }], gold: 6, xp: 65 },
  pole_across_the_road: { steps: [{ kill: 'lair:hill_goblins', n: 2 }, { back: true, say: 'The toll on the hill is lifted.' }], gold: 9, xp: 90 },
  iron_on_the_fence: { needs: 'linchpins', steps: [{ gather: 'outpost:den_gnawbone', n: 5, what: 'tyre irons', spots: [[40, -14], [-12, 43], [-38, -22], [13, 9], [-8, -13]] }, { back: true, say: 'Five tyres, from round their fence.' }], gold: 9, xp: 90 },
  candlewick: { needs: 'linchpins', steps: [{ clear: 'den_candlewick' }, { back: true, say: 'The diggings are empty. The foreman too.' }], gold: 20, xp: 200, item: 'staff' },
  beacon_for_the_bend: { needs: 'candlewick', steps: [{ talk: 'cuddy', say: 'Tobin Wain is bringing a cart up. He asks for the beacon.', end: true }], gold: 3, xp: 30 },

  // ---- Withy Landing, north on the Fen Way, levels 4 to 6 (Maren Rush; her cousin Tully): the baskets in Muddle Camp and
  // then the camp, the web over the path north, and the Silk Dell last ----
  hats: { steps: [{ gather: 'outpost:den_muddle', n: 6, what: 'eel baskets' }, { back: true, say: 'Six baskets. Some of them had been worn.' }], gold: 9, xp: 90 },
  path_to_the_water: { steps: [{ kill: 'lair:fenway_spiders', n: 2 }, { back: true, say: 'Two spiders. The web is down.' }], gold: 11, xp: 110 },
  muddle: { needs: 'hats', steps: [{ clear: 'den_muddle' }, { back: true, say: 'Muddle Camp is empty.' }], gold: 20, xp: 200 },
  silk_dell: { steps: [{ clear: 'den_silkdell' }, { back: true, say: 'The Silk Dell is empty. The big one is dead.' }], gold: 24, xp: 240, item: 'skull' },
  rods_for_sedgebank: { needs: ['silk_dell', 'path_to_the_water'], steps: [{ talk: 'odo', say: 'Maren Rush has your rods cut. The path is open.', end: true }], gold: 3, xp: 30 },

  // ---- the Forkstone, south where the Barrow Track leaves the Frost Road, levels 5 to 7 (Nan Dray; Dickon, her lad): what
  // walks round the herd, the bells under the spiders' larder (three lying out, two close in), the goat men on the way
  // to Lychfield, and Lychfield last. The word down the track has the four little ones on its bank in the way ----
  what_walks_round: { steps: [{ kill: 'lair:frost_spiders', n: 2 }, { back: true, say: 'Two of what walked round you are dead.' }], gold: 11, xp: 110 },
  bring_me_the_bells: { steps: [{ gather: 'outpost:den_hanginglarder', n: 5, what: 'herd bells', spots: [[-41, 12], [9, -44], [37, 26], [-13, 11], [12, -9]] }, { back: true, say: 'Five bells. And one more.' }], gold: 11, xp: 110 },
  they_drive_them: { steps: [{ kill: 'lair:dark_goats_e', n: 2 }, { back: true, say: 'Two of your drovers on two legs are dead.' }], gold: 13, xp: 130 },
  whistled_up: { steps: [{ clear: 'den_lychfield' }, { back: true, say: "Lychfield is quiet. All of it's lying down." }], gold: 28, xp: 280, item: 'robe' },
  down_the_track: { needs: 'whistled_up', steps: [{ kill: 'lair:track_children', n: 3 }, { talk: 'amos', say: 'Nan Dray has six of your blacks, safe, on her grass.', end: true }], gold: 4, xp: 35 },
  ponies_for_the_winter: { needs: 'whistled_up', steps: [{ kill: 'lair:frost_wolf', n: 1 }, { talk: 'berin', say: "Nan Dray will winter your ponies. The road's fit as far as her.", end: true }], gold: 4, xp: 35 },

  // ---- Palmers' Rest, west where the Pilgrims' Road leaves the Vigil Road, levels 6 to 8 (Old Perrin Lowe; Hild Ames):
  // the goblins' pit north, what stands by the Pilgrims' Road, the goat men at the halfway stone, and Mumblefast last (past that stone:
  // near enough to hear what it says, then emptied) ----
  how_far_they_got: { steps: [{ clear: 'den_thornpit' }, { gather: 'outpost:den_thornpit', n: 6, what: "palmers' tokens" }, { back: true, say: 'The pit is empty. Six tokens.' }], gold: 27, xp: 270 },
  two_who_stand: { steps: [{ kill: 'lair:pilgrim_dolls', n: 2 }, { back: true, say: "They weren't palmers. They're down." }], gold: 13, xp: 130 },
  halfway_stone: { steps: [{ kill: 'lair:vigil_goats', n: 2 }, { back: true, say: 'Two goat men down. This was on the stone.' }], gold: 13, xp: 130 },
  seven_down: { steps: [{ enter: 'outpost:den_mumblefast' }, { clear: 'den_mumblefast' }, { back: true, say: 'They said your stations backwards. They have stopped.' }], gold: 34, xp: 340, item: 'scroll' },
  two_tallies: { needs: ['halfway_stone', 'how_far_they_got'], steps: [{ talk: 'dag', say: 'Old Perrin Lowe sends his tally. He found yours on the stone.', end: true }], gold: 3, xp: 30 },
  first_station: { needs: 'seven_down', steps: [{ kill: 'lair:pilgrim_spiders', n: 2 }, { talk: 'fenn', say: "Perrin Lowe says they're coming back down the Pilgrims' Road.", end: true }], gold: 4, xp: 35 },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). The ring steps up: Hillfoot 3 to 5,
// Withy 4 to 6, the Forkstone 5 to 7, Palmers' Rest 6 to 8; each errand on at the first level of where it leads.
export const LEVELS = [
  ['carter_is_late', 3], ['willow_bark', 4], ['one_fire_at_the_fork', 5], ['palmers_tally', 6],
  ['warrens_mouth', 7], ['tunnel_king', 8], ['mother_of_the_warren', 9],
  ['linchpins', 3], ['pole_across_the_road', 4], ['iron_on_the_fence', 4], ['candlewick', 5], ['beacon_for_the_bend', 5],
  ['hats', 4], ['path_to_the_water', 5], ['muddle', 5], ['silk_dell', 6], ['rods_for_sedgebank', 6],
  ['what_walks_round', 5], ['bring_me_the_bells', 5], ['they_drive_them', 6], ['whistled_up', 7], ['down_the_track', 6], ['ponies_for_the_winter', 8],
  ['how_far_they_got', 6], ['two_who_stand', 6], ['halfway_stone', 6], ['two_tallies', 6], ['seven_down', 8], ['first_station', 8],
];
