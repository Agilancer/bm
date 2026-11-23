// The Rustwood: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/rustwood.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs rustwood` says what breaks it; `node tools/quests/sheet.mjs rustwood`
// lays the region out to be read.
//
// Seven hubs, north-east of the Bell Tower up the Abbey Road: Stonecarters' Halt (8 to 9), Ossery Quarry (9 to 11), the
// Abbey of Saint Ossery (11 to 13, Tessariel's), and there the road forks: north to Emberwatch (12 to 13) and the
// Fungal Ring (13 to 14, the Sporehold's door, the end of its road), done first; south-east to the Woodcutters' Camp
// (13 to 14) and Last Hearth (14 to 15), which sends you on east to Marchfoot. What Orrin Vey used to send people out here
// for from Bellmourn (the quarry's marks, the ring and what's under it) is given out here now, by whoever stands by it.
// (Three lairs stood where someone now stands, and were moved off for it: the quarry's kobolds behind the face, the
// cutters' raiders up the hill to the south, the ring's brood down its west cheek; and two were made for it: the goat men
// beside the lane north, and what keeps the Shroudwood past its nest. src/core/tripo-monsters.js, LAIR_LEVEL.)
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Stonecarters' Halt: the stone-carter by his father's block, and Marta Rudd's lad across the fire.
  { id: 'jem', name: 'Jem Sledge', title: "Stone-carter, at Stonecarters' Halt", body: 'c_smith_2', sex: 'm', age: 46, ...at('stonecarters'), idles: ['fold_arms', 'idle', 'look_around'] },
  { id: 'lew', name: 'Lew Rudd', title: "The quarry-mistress's son, at Stonecarters' Halt", body: 'c_dude_2', sex: 'm', age: 17, ...by('stonecarters'), idles: ['wait', 'scratch', 'look_around'] },
  // Ossery Quarry, an old place and no camp: at the cutters' hut door (src/core/places.js, K.spots.quarry_hut), the face
  // at her back and its kobolds behind that.
  { id: 'marta', name: 'Marta Rudd', title: 'Quarry-mistress, of Ossery Quarry', body: 'c_wife_big_3', sex: 'f', age: 49, post: [2924.1, -1666.5], face: -1.956, trade: 'sutler', idles: ['fold_arms_ual', 'look_around', 'idle'] },
  // The Abbey of Saint Ossery, Tessariel's: the almoner, outside the precinct's gate, where the dole was given.
  { id: 'caddoc', name: 'Brother Caddoc', title: 'Almoner, of the Abbey of Saint Ossery', body: 'c_sage_3', sex: 'm', age: 63, post: [3945, -2841], face: 0, trade: 'sutler', idles: ['idle_ual', 'wait', 'look_around'] },
  // Emberwatch: the fire-watcher under her beacon, and a charcoal-burner across the fire.
  { id: 'rowan', name: 'Rowan Slate', title: 'Fire-watcher, at Emberwatch', body: 'c_redhead_2', sex: 'f', age: 39, ...at('emberwatch'), idles: ['look_around', 'fold_arms', 'idle'] },
  { id: 'hollis', name: 'Hollis Wick', title: 'Charcoal-burner, at Emberwatch', body: 'c_elder_3', sex: 'm', age: 55, ...by('emberwatch'), idles: ['scratch', 'idle', 'wait'] },
  // The Fungal Ring, an old place and no camp: by the tent somebody left there (src/core/sites.js, K.spots.fungus_camp).
  { id: 'dilly', name: 'Dilly Roe', title: 'Mushroomer, at the Fungal Ring', body: 'c_young_3_2', sex: 'f', age: 31, post: [2893, -4304], face: 0.8, trade: 'sutler', idles: ['look_around', 'wait', 'scratch'] },
  // The Woodcutters' Camp, an old place: the foreman at the fire (K.spots.cutters_fire), the sawyer by his pit.
  { id: 'huw', name: 'Huw Axton', title: "Foreman, at the Woodcutters' Camp", body: 'c_worker_2', sex: 'm', age: 51, post: [4699.5, -1303.4], face: -0.9, trade: 'sutler', idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'bryn', name: 'Bryn Pitt', title: "Sawyer, at the Woodcutters' Camp", body: 'c_wes_2', sex: 'm', age: 34, post: [4705, -1287], face: -2.4, idles: ['scratch', 'idle', 'fold_arms'] },
  // Last Hearth: the woman who keeps its fire, and the outrider across it.
  { id: 'tibb', name: 'Mother Tibb', title: 'Keeper of the fire, at Last Hearth', body: 'c_crone_2', sex: 'f', age: 74, ...at('lasthearth'), idles: ['idle_ual', 'look_around', 'wait'] },
  { id: 'corin', name: 'Corin Vale', title: 'Outrider, at Last Hearth', body: 'c_young_5_2', sex: 'f', age: 28, ...by('lasthearth'), idles: ['fold_arms', 'look_around', 'idle'] },
  // (Hester Pyke at Marchfoot, whom Corin's word over the March is said to, is the Marches': src/folk/regions/east.js.)
];

export const RULES = {
  // ---- Stonecarters' Halt, on the Abbey Road where it leaves the downs, levels 8 to 9 (Jem Sledge; Lew Rudd): the squared
  // stone in the middle of the Butting Ground, which Jem would sooner take up the knoll than go to the quarry for (and the
  // rams that keep it), and the red goblins at the bend of the road on (Lew's: he ran from them). Then up the road the
  // bend's opened, to the quarry, for a yard of freestone after all ----
  the_butting_ground: { steps: [{ clear: 'den_buttingground' }, { back: true, say: 'The Butting Ground is empty. The stone in it is yours.' }], gold: 24, xp: 235, item: 'staff' },
  the_bend: { steps: [{ kill: 'lair:abbey_rd_raiders', n: 3 }, { back: true, say: 'Three are down at the bend. The road is open.' }], gold: 9, xp: 90 },
  a_yard_of_freestone: { needs: ['the_butting_ground', 'the_bend'], steps: [{ talk: 'marta', say: 'Jem Sledge wants a yard of freestone. And Lew is at the Halt.', end: true }], gold: 3, xp: 25 },

  // ---- Ossery Quarry, on the Abbey Road, levels 9 to 11 (Marta Rudd): the kobolds behind the face, where the masons cut
  // their marks (Orrin Vey's, from Bellmourn, once), and Orefall Delve, west, where the rust-coloured ones take her
  // iron. Then a word to the abbey, under what hangs over the road half way ----
  ossery_quarry: { steps: [{ kill: 'lair:quarry_kobolds', n: 4 }, { back: true, say: 'Four are down behind the face. The marks stand.' }], gold: 16, xp: 155 },
  orefall: { steps: [{ clear: 'den_orefall' }, { back: true, say: 'Orefall is empty. Your iron is lying about it.' }], gold: 30, xp: 300, item: 'robe' },
  stone_for_the_nave: { needs: 'orefall', steps: [{ kill: 'lair:rust_bat', n: 2 }, { talk: 'caddoc', say: 'Marta Rudd says the quarry is working. She asks what you need.', end: true }], gold: 3, xp: 25 },

  // ---- the Abbey of Saint Ossery, levels 11 to 13 (Brother Caddoc): the pilgrims' lead badges from round the web-wood on
  // the pilgrims' path, the Kiln Coven (the brothers' own lime-kiln, where robed ones burn the abbey's fallen stone), and
  // the Red Larder (the infirmarer's drying-hollow), last. Then a word north to the fire-watch, past the goat men by the
  // lane; and, once the ring's word has come back down to him, one south-east to the woodcutters, past what keeps the
  // wood between. Tessariel's: nothing here names the other ----
  pilgrims_lead: { steps: [{ gather: 'lair:abbey_webs', n: 5, what: "pilgrims' badges" }, { back: true, say: 'Five badges, from round the web-wood.' }], gold: 12, xp: 125 },
  the_kiln: { steps: [{ clear: 'den_kilncoven' }, { back: true, say: 'The Kiln Coven is empty. The kiln is cold.' }], gold: 19, xp: 190 },
  the_red_larder: { needs: 'pilgrims_lead', steps: [{ clear: 'den_redlarder' }, { back: true, say: 'The Red Larder is empty. The hollow is yours again.' }], gold: 21, xp: 205, item: 'scroll' },
  the_first_watch: { needs: 'the_red_larder', steps: [{ kill: 'lair:stile_goats', n: 2 }, { talk: 'rowan', say: 'Brother Caddoc asks if you still see his lamp at dusk.', end: true }], gold: 3, xp: 25 },
  timber_for_a_roof: { needs: 'white_inside', steps: [{ kill: 'lair:rust_spiders', n: 2 }, { talk: 'huw', say: 'Brother Caddoc wants timber for a roof, and has no money.', end: true }], gold: 3, xp: 30 },

  // ---- Emberwatch, off the roads north of the abbey, levels 12 to 13 (Rowan Slate; Hollis Wick): the warband at its
  // seven fires, and Cinderbed, where the wood's fires start, last (Rowan's, out of her book). Then Hollis's word on to
  // the ring, emptying Brandfast on the way: its fire-callers sit on the path there, where his supper used to come by ----
  seven_fires: { steps: [{ kill: 'lair:rust_warband', n: 5 }, { back: true, say: 'Five are down at the fires. The big one too.' }], gold: 13, xp: 130 },
  cinderbed: { steps: [{ clear: 'den_cinderbed' }, { back: true, say: 'Cinderbed is empty. The drake is dead.' }], gold: 20, xp: 195, item: 'skull' },
  through_brandfast: { needs: 'cinderbed', steps: [{ clear: 'den_brandfast' }, { talk: 'dilly', say: 'Hollis Wick asks after his basket. Brandfast is empty.', end: true }], gold: 15, xp: 150 },

  // ---- the Fungal Ring, levels 13 to 14 (Dilly Roe): morels off the burnt ground round the Burnt Hollow (the whelps' bed,
  // north), the brood on the ring's west cheek, and the Sporehold under it, its door beside her: the wolf first, then the
  // gardener and what she gardens for. Then back down to the abbey with the first clean caps off the west side, past the
  // warband's fires (the ring is the end of its road; the abbey is the way on, south-east).
  // The Sporehold's two quests pay only a nominal sum on purpose: the delve pays 3000 itself (src/core/delve-sporehold.js
  // pay), and its packs more, so the south-east past the abbey is levelled two above where it would be without it ----
  morels_on_the_burn: { steps: [{ gather: 'outpost:den_burnthollow', n: 5, what: 'morels' }, { back: true, say: 'Five morels, off the burnt ground.' }], gold: 19, xp: 190 },
  cap_and_leg: { steps: [{ kill: 'lair:fungal_brood', n: 4 }, { back: true, say: 'Four are down on the west side.' }], gold: 19, xp: 190 },
  the_ring_below: { needs: 'morels_on_the_burn', steps: [{ enter: 'sporehold' }, { boss: 'mouldfang' }, { back: true, say: 'I went down under the ring. The wolf is dead.' }], gold: 30, xp: 300, item: 'scroll' },
  what_it_fruits_from: { needs: 'the_ring_below', steps: [{ boss: 'morel' }, { boss: 'heart' }, { back: true, say: 'The thing the ring fruits from is dead.' }], gold: 40, xp: 400, item: 'staff' },
  white_inside: { needs: ['morels_on_the_burn', 'cap_and_leg'], steps: [{ kill: 'lair:rust_warband', n: 2 }, { talk: 'caddoc', say: 'Dilly Roe sends you these, from the west side of the ring.', end: true }], gold: 3, xp: 30 },

  // ---- the Woodcutters' Camp, levels 13 to 14 (Huw Axton; Bryn Pitt): the eight axes the lads left in the felling up the
  // hill to the south, with the red goblins sat among them, and the Hanging Tree, east, which Huw's been told all his
  // life not to fell, last. Then Bryn's boards east to Last Hearth, past where it stood ----
  on_the_felling: { steps: [{ gather: 'lair:cutter_raiders', n: 4, what: 'axes', spots: [[9, -5], [-7, 10], [-12, -9], [40, 16]] }, { back: true, say: 'Four axes, out of the cuts.' }], gold: 16, xp: 155 },
  the_hanging_tree: { steps: [{ clear: 'den_hangingtree' }, { back: true, say: 'The Hanging Tree is empty. Nothing hangs in it now.' }], gold: 26, xp: 255, item: 'robe' },
  a_load_for_last_hearth: { needs: 'the_hanging_tree', steps: [{ talk: 'tibb', say: 'Bryn Pitt has a cart of boards for you. The cracked ones.', end: true }], gold: 3, xp: 30 },

  // ---- Last Hearth, by the trail to Sootpit, levels 14 to 15 (Mother Tibb; Corin Vale): what the people who came in
  // dropped on the way, round the Shroudwood's edge, north (the region's one gather and then empty of the same den), and
  // the Shroudwood itself, its nest and what keeps it further in (Corin's: she went in once). Then Corin's word east over
  // the March, to Marchfoot ----
  dropped_on_the_way: { steps: [{ gather: 'outpost:den_shroudwood', n: 5, what: 'dropped things' }, { back: true, say: "Five things, from the Shroudwood's edge." }], gold: 17, xp: 165 },
  the_shroudwood: { needs: 'dropped_on_the_way', steps: [{ clear: 'den_shroudwood' }, { kill: 'lair:shroud_matron', n: 3 }, { back: true, say: 'The Shroudwood is empty. I looked at what was hung.' }], gold: 30, xp: 300, item: 'staff' },
  over_the_march: { needs: 'the_shroudwood', steps: [{ kill: 'lair:greywarden_guard', n: 2 }, { talk: 'hester', say: 'Corin Vale says Last Hearth will take eleven more, and no more.', end: true }], gold: 4, xp: 35 },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up, and each errand
// on is at the first level of where it leads. (The order counts as well: auto-play takes the first in this list it's of a
// level for, so the road north to Emberwatch and the ring is done before the road south-east, which the ring's word back
// down to the abbey opens.)
export const LEVELS = [
  ['the_butting_ground', 8], ['the_bend', 8], ['a_yard_of_freestone', 9],
  ['ossery_quarry', 9], ['orefall', 10], ['stone_for_the_nave', 11],
  ['pilgrims_lead', 11], ['the_kiln', 11], ['the_red_larder', 12], ['the_first_watch', 12],
  ['seven_fires', 12], ['cinderbed', 13], ['through_brandfast', 13],
  ['morels_on_the_burn', 13], ['cap_and_leg', 13], ['the_ring_below', 13], ['what_it_fruits_from', 14], ['white_inside', 14],
  // (The south-east is two above the north: the Sporehold's own pay has the player there a level or two over.)
  ['timber_for_a_roof', 15],
  ['on_the_felling', 15], ['the_hanging_tree', 16], ['a_load_for_last_hearth', 16],
  ['dropped_on_the_way', 16], ['the_shroudwood', 17], ['over_the_march', 16],
];
