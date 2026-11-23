// Cinderford and the Ashen Waste: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/waste.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs waste` says what breaks it; `node tools/quests/sheet.mjs waste`
// lays the region out to be read.
//
// Five hubs along the Vigil Road, west of Palmers' Rest: Ashgate Halt (6 to 8), where the trees stop; Cinderford (8 to 11),
// the last free hearths, whose three are posted in src/folk/people.js; the Caravanserai of Khel (11 to 12), where its porter
// and its cook stayed on when everyone else stood still, with the Charred Mill in reach of its gate; then the two ends of the
// road: the Hollow Watch (13 to 16), hidden in sight of the keep, Blackvigil's door, and Scavengers' Pit (17 to 19), north
// among the bones. Blackvigil's quests are Captain Renn's at the Watch now, not Ser Hale's at the Bell Tower; the Vigil Road's
// patrols are the Watch's; the burnt mill and the yard at Khel are Khel's own, not Cinderford's.
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Ashgate Halt: the carter who keeps it (sent to from Palmers' Rest), and his sister across the fire.
  { id: 'dag', name: 'Dag Colley', title: 'Carter, at Ashgate Halt', body: 'c_smith_1', sex: 'm', age: 50, ...at('ashgate'), idles: ['fold_arms', 'idle', 'look_around'] },
  { id: 'hedda', name: 'Hedda Colley', title: "Dag's sister, at Ashgate Halt", body: 'c_worker_f_3', sex: 'f', age: 46, ...by('ashgate'), idles: ['fold_arms_ual', 'wait', 'scratch'] },
  // The Caravanserai of Khel, an old place and no camp: both outside its walls by the south-east corner, at the late
  // caravan's camp by the gate (src/core/sites.js ashen()), out of sight of what stands under the north wall (khel_ghouls,
  // 150 m off) and in reach of the Charred Mill. Ama keeps the cookhouse's pot, and buys and sells.
  { id: 'sarn', name: 'Old Sarn', title: 'The last porter of Khel', body: 'c_elder_2', sex: 'm', age: 72, post: [-3660, -668], face: -2.4, idles: ['idle_ual', 'look_around', 'wait'] },
  { id: 'ama', name: 'Ama Tull', title: 'Cook, of the Caravanserai of Khel', body: 'c_wife_big_1', sex: 'f', age: 44, post: [-3649, -664], face: -2.0, trade: 'sutler', idles: ['fold_arms', 'scratch', 'idle'] },
  // The Hollow Watch: the captain who rode west from Cinderford to parley and never rode back, and his scout.
  { id: 'renn', name: 'Captain Tolan Renn', title: 'Of the Hollow Watch', body: 'c_worker_3', sex: 'm', age: 47, ...at('hollowwatch'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'vesna', name: 'Vesna Kell', title: 'Scout, of the Hollow Watch', body: 'c_young_4_2', sex: 'f', age: 26, ...by('hollowwatch'), idles: ['look_around', 'wait', 'idle'] },
  // Scavengers' Pit: the woman who runs it, and her nephew across the fire.
  { id: 'mab', name: 'Mab Crowe', title: "Scavenger, at Scavengers' Pit", body: 'c_crone_3', sex: 'f', age: 58, ...at('scavengers'), idles: ['scratch', 'fold_arms', 'look_around'] },
  { id: 'tad', name: 'Tad Crowe', title: "Mab's nephew, at Scavengers' Pit", body: 'c_wes_3', sex: 'm', age: 19, ...by('scavengers'), idles: ['idle', 'look_around', 'scratch'] },
];

export const RULES = {
  // ---- Ashgate Halt, where the trees stop on the Vigil Road, levels 6 to 8 (Dag Colley; Hedda Colley): the iron plates off
  // the mileposts, picked up round the kobolds' diggings north-west, and the diggings and their foreman; the withy bundles
  // somebody's been cutting and leaving by the Watching Acre west (Hedda's: cut the way only one other weaver cuts them).
  // Then on west, past the dead children who walk in a ring by the old stones, to the sergeant at Cinderford with Dag's stick ----
  mile_plates: { steps: [{ gather: 'outpost:den_pickfall', n: 5, what: 'mile-plates', spots: [[41, 13], [-12, 44], [-38, -21], [13, 12], [-11, -12]] }, { back: true, say: 'Five plates, from round their diggings. All five say Cinderford.' }], gold: 13, xp: 130 },
  pickfall: { steps: [{ clear: 'den_pickfall' }, { back: true, say: 'Pickfall Delve is empty. The foreman too.' }], gold: 24, xp: 240, item: 'robe' },
  withy_bundles: { steps: [{ gather: 'outpost:den_watchingacre', n: 5, what: 'withy bundles', spots: [[44, 12], [-15, 41], [36, -27], [-42, -14], [9, -44]] }, { back: true, say: 'Five bundles of withy, from round the Acre. Cut short, and tied.' }], gold: 15, xp: 155 },
  nineteen_going_west: { needs: 'pickfall', steps: [{ kill: 'lair:vigil_children', n: 2 }, { talk: 'hasket', say: 'Dag Colley sends his stick. Nineteen, going west.', end: true }], gold: 4, xp: 35 },

  // ---- Cinderford, the stockade on the ford, levels 8 to 11 (Sergeant Brenna Hasket; Colm Burrage; Ysolt Marrow): the four
  // of the wall's own who came back from the west (three of them: the fourth is let be), the shoes of Colm's mule round the
  // Ash Den north and then the den, the brass tags off the scarecrows in the Rows (one is Ysolt's own), and the two knights
  // on the ridge west (one: the other carries the count home). Then Ysolt's cloak west to Khel's porter, past the knights who
  // sit by the road short of Khel ----
  ash_on_the_wind: { steps: [{ kill: 'lair:cinder_refugees', n: 3 }, { back: true, say: 'Three of the four are down. The fourth is on the rise.' }], gold: 16, xp: 155 },
  mule_shoes: { steps: [{ gather: 'outpost:den_ashden', n: 4, what: 'mule shoes', spots: [[43, -10], [-14, 42], [-40, -19], [12, 13]] }, { back: true, say: 'Four shoes, from round the Ash Den.' }], gold: 18, xp: 175 },
  tally_tags: { steps: [{ gather: 'outpost:den_scarecrowrows', n: 5, what: 'tally-tags', spots: [[-42, 11], [10, -44], [37, 24], [-13, -12], [12, 10]] }, { back: true, say: 'Five tags, off the scarecrows in the Rows.' }], gold: 16, xp: 155 },
  the_ash_den: { steps: [{ clear: 'den_ashden' }, { back: true, say: 'The Ash Den is empty. The big one too.' }], gold: 51, xp: 510, item: 'staff' },
  red_scouts: { needs: 'ash_on_the_wind', steps: [{ kill: 'lair:cinder_scouts', n: 1 }, { back: true, say: 'One of your two watchers is dead.' }], gold: 37, xp: 370 },
  word_to_the_porter: { needs: ['tally_tags', 'red_scouts'], steps: [{ kill: 'lair:vigil_patrol_1', n: 2 }, { talk: 'sarn', say: "Ysolt Marrow sends her cloak. Edmer's at the mill.", end: true }], gold: 4, xp: 35 },

  // ---- the Caravanserai of Khel, at the bend in the Vigil Road, levels 11 to 13 (Old Sarn; Ama Tull): the brass weights of
  // Khel's weighing table, dropped round the north wall where Khel's own stand (Sarn's: all but the one Ama keeps), the salt
  // the carts were carrying when they stopped, off the Mill Track by the burnt mill (Ama's), and Edmer Marrow at the mill's
  // door and all four with him, which pays Ysolt's cloak. Then two words on: west to the hidden watch (past the lancers by the road), and, once
  // the Watch is done with you, north to the Pit with Ama's pans (through the Widows' Hollow, and past the Black Finger,
  // whose men come down on anyone carrying a load past their rock) ----
  weights_for_the_table: { steps: [{ gather: 'lair:khel_ghouls', n: 5, what: 'brass weights', spots: [[-44, 18], [40, 22], [-18, 46], [46, -12], [-40, -24]] }, { back: true, say: 'Five weights, off the ground by the north wall.' }], gold: 34, xp: 340 },
  salt_on_the_track: { steps: [{ gather: 'lair:charmill_possessed', n: 5, what: 'salt-loaves', spots: [[38, 21], [-6, 46], [44, -16], [-40, 26], [13, -11]] }, { back: true, say: 'Five loaves of salt, off the Mill Track.' }], gold: 34, xp: 340 },
  charred_mill: { needs: 'word_to_the_porter', steps: [{ enter: 'charmill' }, { kill: 'lair:charmill_possessed', n: 5 }, { back: true, say: 'Edmer is at rest, and all four with him.' }], gold: 56, xp: 560, item: 'robe' },
  the_lost_captain: { needs: ['charred_mill', 'weights_for_the_table'], steps: [{ kill: 'lair:vigil_patrol_2', n: 3 }, { talk: 'renn', say: 'Old Sarn of Khel says the porter still keeps the gate.', end: true }], gold: 4, xp: 35 },
  copper_for_the_pit: { needs: ['the_lost_captain', 'salt_on_the_track'], steps: [{ kill: 'outpost:den_widowshollow', n: 3 }, { kill: 'outpost:den_blackfinger', n: 2 }, { talk: 'mab', say: "Ama Tull sends Khel's copper pans. She wants flour.", end: true }], gold: 6, xp: 60 },

  // ---- the Hollow Watch, hidden under its dead tree in sight of the keep, levels 13 to 16 (Captain Tolan Renn; Vesna Kell):
  // a look at the keep's gate from closer than the Watch dares, the big patrol on the Vigil Road north, and Smokefast, whose
  // smoke is what the Watch hides in (Vesna's); then the keep itself, through the arch: Maldrec at its inner gate, and
  // its other lords and the Castellan at the top; last Gallowgate Fort west, where what's left of its garrison went (Renn's). The end of its
  // road. Nothing here names anything of the other side ----
  black_road: { steps: [{ visit: ['keep'] }, { back: true, say: "I've stood at the arch. The gate behind it is shut." }], gold: 31, xp: 310 },
  vigil_patrols: { steps: [{ kill: 'lair:vigil_patrol_3', n: 5 }, { back: true, say: 'Five of the big patrol are dead on the road.' }], gold: 34, xp: 340 },
  the_smoke_we_hide_in: { steps: [{ clear: 'den_smokefast' }, { back: true, say: 'Smokefast is empty. Its fires are out.' }], gold: 60, xp: 600, item: 'robe' },
  gallowgate: { needs: 'the_castellan', steps: [{ clear: 'den_gallowgate' }, { back: true, say: 'Gallowgate Fort is empty. The last of the garrison too.' }], gold: 66, xp: 660, item: 'robe' },
  // (Both given together once you've looked at the gate, so one going through the keep, every boss in it, does the two.)
  the_warden_of_the_gate: { needs: 'black_road', steps: [{ enter: 'blackvigil' }, { boss: 'maldrec' }, { back: true, say: "I've been through the arch. Maldrec is dead." }], gold: 200, xp: 2000, item: 'staff' },
  the_castellan: { needs: 'black_road', steps: [{ enter: 'blackvigil' }, { boss: 'sorvane' }, { boss: 'brothers' }, { boss: 'castellan' }, { back: true, say: 'The Castellan of Blackvigil is dead, and his lords.' }], gold: 500, xp: 5000, item: 'skull', rarity: 4 },

  // ---- Scavengers' Pit, among the bones north of Khel, levels 17 to 19 (Mab Crowe; Tad Crowe): the sick ones in iron who
  // come down to the Pit at dusk, the rings the worms turn up on the Churned Ground (Tad's), the Pit's flour store in the
  // Grey Larder that the widows have spun shut, the Black Finger, the spire whose men take a tithe of everything the Pit
  // digs up, and last and biggest the thing that walks the Bone Field. The end of its road ----
  sick_in_iron: { steps: [{ kill: 'lair:waste_plague', n: 2 }, { back: true, say: "Two of the sick ones are down. They'd nothing worth having." }], gold: 37, xp: 370 },
  turned_up: { steps: [{ gather: 'outpost:den_churned', n: 5, what: 'rings', spots: [[-44, 9], [11, 43], [40, -20], [-12, 13], [10, -12]] }, { back: true, say: 'Five rings, off the Churned Ground.' }], gold: 37, xp: 370 },
  the_grey_larder: { needs: 'sick_in_iron', steps: [{ clear: 'den_greylarder' }, { back: true, say: 'The Grey Larder is empty. Your flour is still in it.' }], gold: 72, xp: 720, item: 'robe' },
  the_black_finger: { needs: 'sick_in_iron', steps: [{ clear: 'den_blackfinger' }, { back: true, say: 'The Black Finger is empty. Nobody up it takes a tithe now.' }], gold: 72, xp: 720, item: 'staff' },
  the_bone_field: { needs: ['the_grey_larder', 'the_black_finger'], steps: [{ kill: 'lair:bone_field', n: 1, foe: ['Bone Giants'] }, { back: true, say: 'The big one that walks the Bone Field is down.' }], gold: 95, xp: 950, item: 'skull' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up, each errand on is a
// level or two above the work it waits for: Ashgate 6 to 8, Cinderford 8 to 11, Khel 11 to 12, the Watch 13 to 16, and the
// Pit 17 to 19, sent to from Khel once the Watch is done with you (Ama's pans, at 17).
export const LEVELS = [
  ['mile_plates', 6], ['pickfall', 6], ['withy_bundles', 7], ['nineteen_going_west', 7],
  ['ash_on_the_wind', 8], ['tally_tags', 7], ['mule_shoes', 8], ['the_ash_den', 9], ['red_scouts', 10], ['word_to_the_porter', 11],
  ['weights_for_the_table', 11], ['salt_on_the_track', 11], ['charred_mill', 11], ['the_lost_captain', 12],
  ['black_road', 12], ['vigil_patrols', 13], ['the_smoke_we_hide_in', 14], ['the_warden_of_the_gate', 14], ['the_castellan', 14], ['gallowgate', 16],
  ['copper_for_the_pit', 17], ['sick_in_iron', 17], ['turned_up', 16], ['the_grey_larder', 18], ['the_black_finger', 18], ['the_bone_field', 19],
];
