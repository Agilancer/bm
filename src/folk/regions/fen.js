// The Weeping Fen: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/fen.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs fen` says what breaks it; `node tools/quests/sheet.mjs fen`
// lays the region out to be read.
//
// Five hubs, north of Bellmourn up the Fen Way: Sedgebank (6 to 8), Mile-End Camp by the Sunken Mile and the Drowned
// Vaults' door (9 to 11), Eelpot Hythe far off the roads to the east (10, the end of its road, done before the Vaults
// and the road north), Sallowmere (11 to 12) and the Drowned Chapel (12 to 13, Tessariel's, the end of its road). Each
// quest's level is its den's or a little over (the critics' third round); the Vaults' bosses pay far more than all of it.
// (The critics' second round: one burying ground in the region, Sallowmere's Yard; one left standing, the fifth on the
// Mile; gather-then-empty at Sedgebank only; every den's chief as the game makes it (src/core/wilds.js FACTIONS); the
// chapel's last quest the wyrm's bed; the errand to Eelpot through Lanefast; nothing on the road north waits on night.)
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

  // ---- Mile-End Camp, where the Sunken Mile leaves the Fen Way, levels 9 to 11 (Tamar Dyke; Corby Lunn): the drowned on
  // the Mile (four of the five: the fifth is still asking the toll), Leechwater Camp, whose goblins sit on the crane's
  // weights (Corby's), the Sunk Plot, the toll's fenced strong-ground (its takings buried in boxes under marker stones,
  // a stone strong-house by the gate: what a drowned den's plot is dressed as), and the Drowned Vaults,
  // whose door is by the broken arch. Then a word east to Eelpot, through Lanefast on the lane (first: auto-play goes down
  // LEVELS, and Eelpot's are below the road north's), and a word north to the ferry, through the huts on the south shore ----
  sunken_mile: { steps: [{ enter: 'causeway' }, { kill: 'lair:mile_drowned', n: 4 }, { back: true, say: 'Four are down on the Mile. The fifth has his hand out.' }], gold: 20, xp: 200 },
  counterweight: { steps: [{ clear: 'den_leechwater' }, { back: true, say: 'Leechwater is empty. Your weights are lying about it.' }], gold: 36, xp: 360 },
  the_sunk_plot: { steps: [{ clear: 'den_sunkplot' }, { back: true, say: 'The Sunk Plot is empty. Your boxes are still in the ground.' }], gold: 40, xp: 400 },
  under_the_mile: { needs: 'sunken_mile', steps: [{ enter: 'vaults' }, { boss: 'bloat' }, { back: true, say: 'What wallowed under the Mile is dead.' }], gold: 170, xp: 1700, item: 'robe' },
  what_sank_the_mile: { needs: 'under_the_mile', steps: [{ boss: 'sallow' }, { boss: 'leviathan' }, { back: true, say: 'The thing that sank the causeway is dead.' }], gold: 280, xp: 2800, item: 'staff' },
  his_fathers_punt: { needs: 'the_sunk_plot', steps: [{ kill: 'outpost:den_lanefast', n: 3 }, { talk: 'pike', say: "Tamar Dyke has lifted a punt with your father's mark on it.", end: true }], gold: 4, xp: 35 },
  the_crossing: { needs: 'the_sunk_plot', steps: [{ kill: 'lair:sallow_drowned', n: 4 }, { talk: 'davy', say: "I've word for the ferrywoman, from Mile-End." }, { talk: 'grizel', say: "Tamar Dyke says the Mile's not coming up. The crossing is yours.", end: true }], gold: 4, xp: 35 },

  // ---- Eelpot Hythe, far off the roads to the east, level 10 (Pike Hallam): the wind the Mere Coven sells in
  // knotted cord (five off its outer stakes, 42 to 46 m out: all outside its sight, so the Coven's own fight is the next
  // quest's, not this one's), and the Coven itself; come to through Lanefast, the goblins half way down the lane.
  // The end of its road, so the way out is back down the lane: the last of its work empties Lanefast on that walk and
  // carries Pike's word to Tamar (send the punt). (The Reed Graves, north-east, are left to the land: the fen's one
  // burying ground is Sallowmere's.) ----
  five_knots: { steps: [{ gather: 'outpost:den_merecoven', n: 5, what: 'knotted cords', spots: [[-40, 13], [10, -43], [36, 25], [-27, -36], [44, -14]] }, { back: true, say: 'Five cords. I undid none of them.' }], gold: 22, xp: 220 },
  the_price_of_wind: { needs: 'five_knots', steps: [{ clear: 'den_merecoven' }, { back: true, say: "The Mere Coven is empty. Nobody's selling." }], gold: 40, xp: 400, item: 'staff' },
  the_lane: { needs: 'the_price_of_wind', steps: [{ clear: 'den_lanefast' }, { talk: 'tamar', say: "Pike Hallam says the lane's open. Send the punt.", end: true }], gold: 43, xp: 430 },

  // ---- Sallowmere, the east shore, levels 11 to 12 (Grizel Wade; Davy Scrip): the jellies on her landing (hunted in the
  // shallows off it, its own spots, a kilometre from the worm's pool to the east), Davy's ribbons off the reeds round the
  // four children on the west shore, the Drowned Yard (the fen's one burying ground), and, after it and off the road on,
  // a look at it by night (stood up again, as a den does) and the fare pennies on its path. Then a word to the chapel, under the harpies' pool ----
  sallowmere: { steps: [{ kill: 'fen', n: 6, of: 9, spots: [[-165, -3335], [-185, -3315], [-150, -3305]] }, { back: true, say: 'Six jellies. Your landing is clear.' }], gold: 24, xp: 242 },
  ribbon_on_the_reeds: { steps: [{ gather: 'lair:fen_children', n: 5, what: 'ribbons', spots: [[0, -40], [24, -36], [-26, -32], [38, -14], [-38, -8]] }, { back: true, say: 'Five ribbons, off the reeds.' }], gold: 24, xp: 242 },
  the_drowned_yard: { steps: [{ clear: 'den_drownedyard' }, { back: true, say: 'The Yard is lying down, and what kept it.' }], gold: 44, xp: 440, item: 'skull' },
  lights_on_the_mere: { needs: 'the_drowned_yard', steps: [{ enter: 'outpost:den_drownedyard', night: true }, { gather: 'outpost:den_drownedyard', n: 5, what: 'fare pennies', spots: [[-32, 58], [-27, 49], [-22, 40], [-16, 30], [-8, 15]] }, { back: true, say: 'The Yard is stood up again. These were on the path.' }], gold: 24, xp: 242 },
  one_way_fare: { needs: 'the_drowned_yard', steps: [{ kill: 'lair:fen_harpies', n: 2 }, { talk: 'oriel', say: 'Grizel Wade says the ferry runs again, and you are owed a crossing.', end: true }], gold: 5, xp: 40 },

  // ---- the Drowned Chapel, levels 12 to 13 (Sister Oriel): the leaves of the office-book from round the walls, among
  // what lives in the nave's water; the hands on the bell-rope at the Reed Stockade (four of its five: she asks no more of
  // it); and the Drake's Scrape (den_wyrmbed), the marsh drake's, on the way in she has sent everyone by, last.
  // Tessariel's: nothing here names the other power. The end of its road ----
  leaves_on_the_water: { steps: [{ gather: 'chapel', n: 5, what: 'leaves of the office', spots: [[-20, -9], [-21, 7], [0, 11], [17, 5], [3, -10.5]] }, { back: true, say: 'Five leaves, from round the walls.' }], gold: 26, xp: 264 },
  rung_wrong: { steps: [{ kill: 'outpost:den_reedstockade', n: 4 }, { back: true, say: 'Four are down at the stockade. Nobody is at the rope.' }], gold: 26, xp: 264 },
  the_sunk_bed: { steps: [{ clear: 'den_wyrmbed' }, { back: true, say: "The Drake's Scrape is empty. The drake is dead." }], gold: 54, xp: 540, item: 'scroll' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up, and each errand
// on is at the first level of where it leads. (The order counts as well: auto-play takes the first in this list it's of a
// level for, so the errand to Eelpot and Eelpot's work come before the Vaults and the road north: the Hythe is done while it's near,
// and at its own level, before the Bloat's pay lifts it past the Coven.)
export const LEVELS = [
  ['empty_traps', 6], ['reed_hooks', 6], ['punt_in_the_reeds', 7], ['a_hand_a_week', 7], ['a_hand_of_water', 8],
  ['sunken_mile', 9], ['counterweight', 9], ['the_sunk_plot', 10], ['his_fathers_punt', 10],
  ['five_knots', 10], ['the_price_of_wind', 10], ['the_lane', 10],
  ['under_the_mile', 12], ['what_sank_the_mile', 13], ['the_crossing', 11],
  ['sallowmere', 11], ['ribbon_on_the_reeds', 11], ['the_drowned_yard', 11], ['lights_on_the_mere', 11], ['one_way_fare', 12],
  ['leaves_on_the_water', 12], ['rung_wrong', 12], ['the_sunk_bed', 13],
];
