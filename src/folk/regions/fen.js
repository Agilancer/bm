// The Weeping Fen: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/fen.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs fen` says what breaks it; `node tools/quests/sheet.mjs fen`
// lays the region out to be read.
//
// Five hubs, north of Bellmourn up the Fen Way: Sedgebank (6 to 8), Mile-End Camp by the Sunken Mile and the Drowned
// Vaults' door (8 to 11), Sallowmere (10 to 12), Eelpot Hythe far off the roads to the east (10 to 12, the end of its
// road) and the Drowned Chapel (12 to 14, Tessariel's, the end of its road).
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Sedgebank: the eel-catcher under the mast, and a reed-cutter across the fire.
  { id: 'odo', name: 'Odo Marsh', title: 'Eel-catcher, at Sedgebank', body: 'c_elder_1', sex: 'm', age: 66, ...at('sedgebank'), idles: ['scratch', 'look_around', 'idle'] },
  { id: 'ness', name: 'Ness Carr', title: 'Reed-cutter, at Sedgebank', body: 'c_young_4_1', sex: 'f', age: 27, ...by('sedgebank'), idles: ['fold_arms', 'wait', 'look_around'] },
  // Mile-End Camp: the salvager who keeps the board, and the man who works her crane.
  { id: 'tamar', name: 'Tamar Dyke', title: 'Salvager, at Mile-End Camp', body: 'c_worker_f_3', sex: 'f', age: 44, ...at('mileend'), idles: ['fold_arms_ual', 'look_around', 'wait'] },
  { id: 'corby', name: 'Corby Lunn', title: 'Crane-hand, at Mile-End Camp', body: 'c_smith_3', sex: 'm', age: 36, ...by('mileend'), idles: ['idle', 'scratch', 'look_around'] },
  // Sallowmere, an old place and no camp: both on the east shore at the landward end of the half-sunk jetty (src/core/sites.js
  // fen()), 150 m and more from the drowned in the huts on the south shore. Davy keeps the board, out of his pack.
  { id: 'grizel', name: 'Grizel Wade', title: 'Ferrywoman, of Sallowmere', body: 'c_crone_1', sex: 'f', age: 71, post: [-146, -3395], face: -1.571, idles: ['idle_ual', 'look_around', 'fold_arms'] },
  { id: 'davy', name: 'Davy Scrip', title: 'Chapman, waiting on the ferry at Sallowmere', body: 'c_wes_3', sex: 'm', age: 52, post: [-143, -3404], face: -1.571, trade: 'sutler', idles: ['wait', 'look_around', 'scratch'] },
  // Eelpot Hythe: the eel-trapper under the hull.
  { id: 'pike', name: 'Pike Hallam', title: 'Eel-trapper, at Eelpot Hythe', body: 'c_worker_2_3', sex: 'm', age: 43, ...at('eelpot'), idles: ['look_around', 'fold_arms', 'idle'] },
  // The Drowned Chapel, Tessariel's: the last sister, by the graves on its north side (the nave's own water has things in it).
  { id: 'oriel', name: 'Sister Oriel', title: 'Last sister of the Drowned Chapel', body: 'c_wife_big_2', sex: 'f', age: 58, post: [-890, -4338], face: 0, idles: ['idle_ual', 'wait', 'look_around'] },
];

export const RULES = {
  // ---- Sedgebank, on the Fen Way, levels 6 to 8 (Odo Marsh; Ness Carr): the three who stand at Odo's eel-stakes, the
  // reed-cutters' hooks from round the Reed Larder (three lying out, two close in), the Larder itself (his punt is hung
  // up in it), and Sinkfoot Stockade, which has dammed the lode, last. Then a word up the Fen Way, through what stands
  // beside it short of the Mile ----
  empty_traps: { steps: [{ kill: 'lair:fenway_children', n: 2 }, { back: true, say: 'Two are down at your stakes. Haul your traps.' }], gold: 13, xp: 130 },
  reed_hooks: { steps: [{ gather: 'outpost:den_reedlarder', n: 5, what: 'reed-hooks', spots: [[0, 42], [-41, 7], [27, -32], [14, 5], [12, -9]] }, { back: true, say: 'Five hooks, from round the Larder.' }], gold: 13, xp: 130 },
  punt_in_the_reeds: { steps: [{ clear: 'den_reedlarder' }, { back: true, say: 'The Reed Larder is empty. Your punt is down.' }], gold: 28, xp: 280 },
  a_hand_a_week: { steps: [{ clear: 'den_sinkfoot' }, { back: true, say: "Sinkfoot is empty. The dam's yours to pull." }], gold: 33, xp: 330, item: 'robe' },
  a_hand_of_water: { needs: 'a_hand_a_week', steps: [{ kill: 'lair:fenway_drowned', n: 2 }, { talk: 'tamar', say: "Odo Marsh has pulled Sinkfoot's dam. Your water will drop.", end: true }], gold: 4, xp: 35 },

  // ---- Mile-End Camp, where the Sunken Mile leaves the Fen Way, levels 8 to 11 (Tamar Dyke; Corby Lunn): the crane's
  // weights from round Leechwater Camp, the drowned on the Mile (four of the five: the fifth is still asking the toll),
  // Leechwater itself, the Sunk Plot, and the Drowned Vaults, whose door is by the broken arch. Then a word north to the
  // ferry (through the huts on the south shore) and a word east to Eelpot ----
  counterweight: { steps: [{ gather: 'outpost:den_leechwater', n: 5, what: 'crane weights', spots: [[36, 21], [42, -24], [-14, -39], [5, 14], [13, -7]] }, { back: true, say: 'Five weights. One has been sat on a good while.' }], gold: 18, xp: 180 },
  sunken_mile: { steps: [{ enter: 'causeway' }, { kill: 'lair:mile_drowned', n: 4 }, { back: true, say: 'Four are down on the Mile. The fifth has his hand out.' }], gold: 20, xp: 200 },
  thrown_back: { steps: [{ clear: 'den_leechwater' }, { back: true, say: 'Leechwater is empty. Your lead is in their pool.' }], gold: 36, xp: 360 },
  the_sunk_plot: { steps: [{ clear: 'den_sunkplot' }, { back: true, say: 'The Sunk Plot is lying down. All of it.' }], gold: 40, xp: 400 },
  under_the_mile: { needs: 'sunken_mile', steps: [{ enter: 'vaults' }, { boss: 'bloat' }, { back: true, say: 'What wallowed under the Mile is dead.' }], gold: 220, xp: 1700, item: 'robe' },
  what_sank_the_mile: { needs: 'under_the_mile', steps: [{ boss: 'sallow' }, { boss: 'leviathan' }, { back: true, say: 'The thing that sank the causeway is dead.' }], gold: 380, xp: 2800, item: 'staff' },
  the_crossing: { needs: 'the_sunk_plot', steps: [{ kill: 'lair:sallow_drowned', n: 4 }, { talk: 'grizel', say: "Tamar Dyke says the Mile's not coming up. The crossing is yours.", end: true }], gold: 4, xp: 35 },
  his_fathers_punt: { needs: 'the_sunk_plot', steps: [{ talk: 'pike', say: "Tamar Dyke has lifted a punt with your father's mark on it.", end: true }], gold: 4, xp: 35 },

  // ---- Sallowmere, the east shore, levels 10 to 12 (Grizel Wade; Davy Scrip): the jellies on her landing, the lights that
  // cross the mere (by night to the Drowned Yard, and the fares laid along the way in), the Yard, and the four on the west
  // shore with Davy's whistles (three of them). Then a word to the chapel, under the harpies' pool ----
  sallowmere: { steps: [{ kill: 'fen', n: 6, of: 9 }, { back: true, say: 'Six jellies. Your landing is clear.' }], gold: 22, xp: 220 },
  lights_on_the_mere: { steps: [{ enter: 'outpost:den_drownedyard', night: true }, { gather: 'outpost:den_drownedyard', n: 5, what: 'fare pennies', spots: [[-32, 58], [-27, 49], [-22, 40], [-16, 30], [-8, 15]] }, { back: true, say: 'They walk to the Yard. They left these on the path.' }], gold: 26, xp: 260 },
  the_drowned_yard: { needs: 'lights_on_the_mere', steps: [{ clear: 'den_drownedyard' }, { back: true, say: 'The Yard is lying down. The one who called them too.' }], gold: 44, xp: 440, item: 'skull' },
  four_whistles: { steps: [{ kill: 'lair:fen_children', n: 3 }, { back: true, say: "Three are down. I didn't look for the smallest." }], gold: 24, xp: 240 },
  forty_names: { needs: 'the_drowned_yard', steps: [{ kill: 'lair:fen_harpies', n: 2 }, { talk: 'oriel', say: 'Grizel Wade has forty names from the Yard to be read over.', end: true }], gold: 4, xp: 35 },

  // ---- Eelpot Hythe, far off the roads to the east, levels 10 to 12 (Pike Hallam): the wind the Mere Coven sells in
  // knotted cord (five from round its stakes, three lying out, two close in), the Coven, and the Reed Graves, where one
  // grave has been kept empty forty years, last. The end of its road ----
  five_knots: { steps: [{ gather: 'outpost:den_merecoven', n: 5, what: 'knotted cords', spots: [[-40, 13], [10, -43], [36, 25], [-13, 12], [11, -10]] }, { back: true, say: 'Five cords. I undid none of them.' }], gold: 22, xp: 220 },
  the_price_of_wind: { needs: 'five_knots', steps: [{ clear: 'den_merecoven' }, { back: true, say: "The Mere Coven is empty. Nobody's selling." }], gold: 44, xp: 440 },
  kept_empty: { steps: [{ clear: 'den_reedgraves' }, { back: true, say: 'The Reed Graves are quiet. I looked in the empty one.' }], gold: 48, xp: 480, item: 'staff' },

  // ---- the Drowned Chapel, levels 12 to 14 (Sister Oriel): the leaves of the office-book from round the walls, among
  // what lives in the nave's water; the way-lamps from round the Reed Stockade (three lying out, two close in); and the
  // Stockade, which has the chapel's bell and rings it at dinner, last. Tessariel's: nothing here names the other power.
  // The end of its road ----
  leaves_on_the_water: { steps: [{ gather: 'chapel', n: 5, what: 'leaves of the office', spots: [[-20, -9], [-21, 7], [0, 11], [17, 5], [3, -10.5]] }, { back: true, say: 'Five leaves, from round the walls.' }], gold: 26, xp: 265 },
  seven_lamps: { steps: [{ gather: 'outpost:den_reedstockade', n: 5, what: 'way-lamps', spots: [[-39, 15], [12, 42], [-34, -24], [-14, 10], [9, 13]] }, { back: true, say: 'Five lamps. One has oil in it yet.' }], gold: 26, xp: 265 },
  rung_wrong: { steps: [{ clear: 'den_reedstockade' }, { back: true, say: 'The Reed Stockade is empty. Your bell is quiet.' }], gold: 52, xp: 520, item: 'scroll' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up, and each errand
// on is at the first level of where it leads.
export const LEVELS = [
  ['empty_traps', 6], ['reed_hooks', 6], ['punt_in_the_reeds', 7], ['a_hand_a_week', 8], ['a_hand_of_water', 8],
  ['counterweight', 8], ['sunken_mile', 9], ['thrown_back', 9], ['the_sunk_plot', 10], ['under_the_mile', 10], ['what_sank_the_mile', 11], ['the_crossing', 10], ['his_fathers_punt', 10],
  ['sallowmere', 10], ['lights_on_the_mere', 10], ['four_whistles', 11], ['the_drowned_yard', 11], ['forty_names', 12],
  ['five_knots', 10], ['the_price_of_wind', 11], ['kept_empty', 12],
  ['leaves_on_the_water', 12], ['seven_lamps', 12], ['rung_wrong', 13],
];
