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
export const PEOPLE = [
  // The ring of camps a quarter of an hour out on each road: one person at each, who has the camp's work and keeps its board.
  { id: 'tobin', name: 'Tobin Wain', title: 'Carter, at Hillfoot Halt', body: 'c_worker_2_1', sex: 'm', age: 54, ...at('hillfoot'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'nan', name: 'Nan Dray', title: 'Drover, at the Forkstone', body: 'c_wife_big_1', sex: 'f', age: 47, ...at('forkstone'), idles: ['fold_arms_ual', 'look_around', 'wait'] },
  { id: 'perrin', name: 'Old Perrin Lowe', title: "Palmer, at Palmers' Rest", body: 'c_old_man_1', sex: 'm', age: 73, ...at('palmers'), idles: ['idle_ual', 'scratch', 'look_around'] },
  { id: 'maren', name: 'Maren Rush', title: 'Withy-cutter, at Withy Landing', body: 'c_young_3_1', sex: 'f', age: 31, ...at('withy'), idles: ['look_around', 'fold_arms', 'idle'] },
  // placeholders: moved to their own region's file when it's made (the six the ring's errands on are said to: each stands
  // at their camp so the errand can be walked and paid; their region's maker gives them their work and the rest of their words)
  { id: 'cuddy', name: 'Cuddy Stone', title: 'Cairn-keeper, at Cairnwatch', body: 'c_sage_1', sex: 'm', age: 61, ...at('cairnwatch'), idles: ['look_around', 'idle'] },
  { id: 'amos', name: 'Amos Tye', title: "Drover, at Drovers' Stance", body: 'c_dude_1', sex: 'm', age: 38, ...at('trackside'), idles: ['fold_arms', 'idle'] },
  { id: 'berin', name: 'Berin Stoat', title: 'Packman, at Fellfoot', body: 'c_wes_1', sex: 'm', age: 44, ...at('fellfoot'), idles: ['look_around', 'idle'] },
  { id: 'dag', name: 'Dag Colley', title: 'Carter, at Ashgate Halt', body: 'c_smith_1', sex: 'm', age: 50, ...at('ashgate'), idles: ['fold_arms', 'idle'] },
  { id: 'fenn', name: 'Fenn Hollis', title: 'Trapper, at Mossgate Hide', body: 'c_worker_1', sex: 'm', age: 35, ...at('mossgate'), idles: ['look_around', 'idle'] },
  { id: 'odo', name: 'Odo Marsh', title: 'Eel-catcher, at Sedgebank', body: 'c_elder_1', sex: 'm', age: 66, ...at('sedgebank'), idles: ['scratch', 'idle'] },
];

export const RULES = {
  // ---- Bellmourn: the Hollowfang Warrens, whose door is on the hill north-east, 240 m from the square ----
  // (Corran's first is what was two: through the arch, and twelve of what took Hob's barley while you're down there.)
  warrens_mouth: { needs: 'pines', steps: [{ enter: 'warrens' }, { kill: 'warrens', n: 12, foe: ['Goblins', 'Kobolds'] }, { back: true, say: "I've been down the hole on the hill. Twelve won't dig again." }], gold: 160, xp: 1000 },
  tunnel_king: { needs: 'warrens_mouth', steps: [{ boss: 'grubnash' }, { back: true, say: 'The big kobold is dead.' }], gold: 180, xp: 1200, item: 'staff' },
  mother_of_the_warren: { needs: 'tunnel_king', steps: [{ boss: 'twins' }, { boss: 'venomaw' }, { back: true, say: 'The thing at the bottom of the Warrens is dead.' }], gold: 400, xp: 2500, item: 'skull' },
  // ---- Bellmourn: a word down each of the four roads, to the camp a quarter of an hour out, paid there. None needs
  // anything first: each is one of the eleven Lisandra sends you round to (src/folk/lines/lisandra.js GIVERS), taken on her
  // round and walked when you're of a level for the camp ----
  carter_is_late: { steps: [{ talk: 'tobin', say: "Hob Fenwick's barley is sacked and waiting on your cart.", end: true }], gold: 15, xp: 130 },
  one_fire_at_the_fork: { steps: [{ talk: 'nan', say: 'Jory Pell counts one fire here where there were three.', end: true }], gold: 20, xp: 180 },
  palmers_tally: { steps: [{ talk: 'perrin', say: "Ser Aldric Halloway asks for this month's tally.", end: true }], gold: 20, xp: 180 },
  willow_bark: { steps: [{ talk: 'maren', say: "Sabine Moss is out of willow bark. She's sent the coin.", end: true }], gold: 20, xp: 180 },

  // ---- Hillfoot Halt, east on the Hill Road (Tobin Wain): kobolds at the lair by the halt, goblins up the road and in
  // Gnawbone Stockade, and the kobolds' diggings under the road, with their foreman, last ----
  linchpins: { steps: [{ kill: 'lair:hill_kobolds', n: 3 }, { back: true, say: "Three kobolds won't draw another pin." }], gold: 30, xp: 270 },
  pole_across_the_road: { steps: [{ kill: 'lair:hill_goblins', n: 3 }, { back: true, say: 'The toll on the hill is lifted.' }], gold: 40, xp: 360 },
  iron_on_the_fence: { steps: [{ gather: 'outpost:den_gnawbone', n: 5, what: 'tyre irons' }, { back: true, say: 'Five tyres, off their fence.' }], gold: 45, xp: 360 },
  candlewick: { needs: 'linchpins', steps: [{ clear: 'den_candlewick' }, { back: true, say: 'The diggings are empty. The foreman too.' }], gold: 60, xp: 650, item: 'staff' },
  beacon_for_the_bend: { needs: 'candlewick', steps: [{ talk: 'cuddy', say: 'Tobin Wain is bringing a cart up. He asks for the beacon.', end: true }], gold: 25, xp: 225 },

  // ---- the Forkstone, south where the Barrow Track leaves the Frost Road (Nan Dray): kobolds up the road, the spiders'
  // larder, goat men on the way to Lychfield, and Lychfield last ----
  salt_for_the_beasts: { steps: [{ kill: 'lair:frost_kobolds', n: 3 }, { back: true, say: 'Three kobolds are off your salt.' }], gold: 40, xp: 360 },
  bring_me_the_bells: { steps: [{ gather: 'outpost:den_hanginglarder', n: 5, what: 'herd bells' }, { back: true, say: 'Five bells. And one more.' }], gold: 50, xp: 450 },
  they_drive_them: { steps: [{ kill: 'lair:dark_goats_e', n: 3 }, { back: true, say: 'Your three drovers on two legs are dead.' }], gold: 55, xp: 450 },
  whistled_up: { needs: 'they_drive_them', steps: [{ clear: 'den_lychfield' }, { back: true, say: "Lychfield is quiet. All of it's lying down." }], gold: 70, xp: 780, item: 'robe' },
  down_the_track: { needs: 'salt_for_the_beasts', steps: [{ talk: 'amos', say: "Nan Dray has salt at the Fork again, and nine of yours.", end: true }], gold: 25, xp: 225 },
  ponies_for_the_winter: { needs: 'whistled_up', steps: [{ talk: 'berin', say: "Nan Dray will winter your ponies. The road's fit as far as her.", end: true }], gold: 40, xp: 360 },

  // ---- Palmers' Rest, west where the Pilgrims' Road leaves the Vigil Road (Old Perrin Lowe): kobolds back along the
  // road, the goblins' pit north, the two that stand by the Pilgrims' Road, and a listen at Mumblefast ----
  left_boots: { steps: [{ kill: 'lair:vigil_kobolds', n: 3 }, { back: true, say: 'Three kobolds. I found no boots.' }], gold: 40, xp: 360 },
  how_far_they_got: { needs: 'left_boots', steps: [{ clear: 'den_thornpit' }, { gather: 'outpost:den_thornpit', n: 6, what: "palmers' tokens" }, { back: true, say: 'The pit is empty. Six tokens.' }], gold: 60, xp: 650, item: 'scroll' },
  two_who_stand: { steps: [{ kill: 'lair:pilgrim_dolls', n: 2 }, { back: true, say: "They weren't palmers. They're down." }], gold: 60, xp: 540 },
  what_mumblefast_says: { steps: [{ enter: 'outpost:den_mumblefast' }, { back: true, say: "I listened. It's your road they're saying." }], gold: 40, xp: 400 },
  two_tallies: { needs: 'left_boots', steps: [{ talk: 'dag', say: 'Old Perrin Lowe sends his tally, and asks after yours.', end: true }], gold: 30, xp: 270 },
  first_station: { needs: 'two_who_stand', steps: [{ talk: 'fenn', say: "Perrin Lowe says the Pilgrims' Road is walked again.", end: true }], gold: 40, xp: 360 },

  // ---- Withy Landing, north on the Fen Way (Maren Rush): goblins by the road back to town, her baskets in Muddle Camp,
  // the web over the path north, and the Silk Dell last ----
  cut_loose: { steps: [{ kill: 'lair:fenway_goblins', n: 3 }, { back: true, say: 'Three goblins have cut their last bundle.' }], gold: 40, xp: 360 },
  hats: { steps: [{ gather: 'outpost:den_muddle', n: 6, what: 'eel baskets' }, { back: true, say: 'Six baskets. Some of them had been worn.' }], gold: 45, xp: 360 },
  path_to_the_water: { steps: [{ kill: 'lair:fenway_spiders', n: 2 }, { back: true, say: 'Both spiders. The path north is open.' }], gold: 50, xp: 450 },
  silk_dell: { needs: 'cut_loose', steps: [{ clear: 'den_silkdell' }, { back: true, say: 'The Silk Dell is empty. The big one is dead.' }], gold: 70, xp: 780, item: 'skull' },
  rods_for_sedgebank: { needs: 'path_to_the_water', steps: [{ talk: 'odo', say: 'Maren Rush has your rods cut. The path is open.', end: true }], gold: 30, xp: 270 },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same).
export const LEVELS = [
  ['carter_is_late', 3], ['one_fire_at_the_fork', 4], ['palmers_tally', 4], ['willow_bark', 4],
  ['warrens_mouth', 7], ['tunnel_king', 8], ['mother_of_the_warren', 9],
  ['linchpins', 3], ['pole_across_the_road', 4], ['iron_on_the_fence', 4], ['candlewick', 5], ['beacon_for_the_bend', 5],
  ['salt_for_the_beasts', 4], ['bring_me_the_bells', 5], ['they_drive_them', 5], ['down_the_track', 5], ['whistled_up', 6], ['ponies_for_the_winter', 8],
  ['left_boots', 4], ['how_far_they_got', 5], ['two_who_stand', 6], ['what_mumblefast_says', 6], ['two_tallies', 6], ['first_station', 8],
  ['cut_loose', 4], ['hats', 4], ['path_to_the_water', 5], ['silk_dell', 6], ['rods_for_sedgebank', 6],
];
