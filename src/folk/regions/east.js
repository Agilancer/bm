// The Marches and the road to Phobos: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/east.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs east` says what breaks it; `node tools/quests/sheet.mjs east`
// lays the region out to be read.
//
// Four hubs on the roads east, under the keeps that line them, levels 16 to 23: Marchfoot (16 to 17), the old fold at the foot of the
// March Road, where people come down off the March and are sent west, and where Last Hearth's word comes in; the Long Queue
// (18), carts waiting at Gatewatch's toll gate, where Roadsend's comes in; Widow's Lee (19 to 21), the hidden watch
// under the ridge, by Widow's Notch; and the Sill (22 to 23, Wenna Coyle's, who has met you there at three already), with
// three words down into the city, one to each of its hubs. Both camps send you on to the Lee, the Lee down to the Sill.
// The camps are plain folk's: nobody at one names either power ("the keep", "his riders", "the men in red"). Six of the
// lairs they send you to are theirs alone, stood off the roads round them (src/core/tripo-monsters.js march_*, queue_*,
// lee_roost); the rest are the Marches' own, at the keeps and on the way.
// (Ser Hale's word from the Bell Tower to the Quiet Watch, 7.7 km, and the two cut from Cinderford and Frostwatch, are given
// on the Sill now, by the woman who lights the way down: quiet_men, smoke_in_the_east, wardens_of_ash.)
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Marchfoot: the woman who kept the fold, and the toll-clerk who ran, across it.
  { id: 'hester', name: 'Hester Pyke', title: 'Keeper of the fire, at Marchfoot', body: 'c_wife_jolly_3', sex: 'f', age: 52, ...at('marchfoot'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'piers', name: 'Piers Lusk', title: 'Once a toll-clerk, at Marchfoot', body: 'c_sage_1', sex: 'm', age: 44, ...by('marchfoot'), idles: ['scratch', 'wait', 'idle'] },
  // The Long Queue: the carter at the front of it, and the carrier from two carts behind the draper's.
  { id: 'rollo', name: 'Rollo Bask', title: 'Carter, at the Long Queue', body: 'c_worker_3', sex: 'm', age: 49, ...at('tollqueue'), idles: ['fold_arms', 'idle', 'look_around'] },
  { id: 'bride', name: 'Bride Sayer', title: 'Carrier, at the Long Queue', body: 'c_wife_big_2', sex: 'f', age: 58, ...by('tollqueue'), idles: ['wait', 'fold_arms', 'scratch'] },
  // Widow's Lee: the sergeant of a watch that isn't, and her fletcher.
  { id: 'ines', name: 'Ines Mar', title: "Sergeant, at Widow's Lee", body: 'c_worker_f_2', sex: 'f', age: 41, ...at('widowslee'), idles: ['look_around', 'fold_arms', 'idle'] },
  { id: 'oswy', name: 'Oswy Holm', title: "Fletcher, at Widow's Lee", body: 'c_dude_3', sex: 'm', age: 20, ...by('widowslee'), idles: ['scratch', 'look_around', 'wait'] },
  // Phobos's Outwall (src/core/outskirts.js), the basin floor outside the moat: Ashfold, the ash-gatherers' yard under the
  // north gate, and Tanners' Hithe on the Leat under the south gate. Old places, so a post of their own, no camp.
  { id: 'out_reeve', name: 'Hode Callow', title: 'Ash-reeve of Ashfold', body: 'c_old_man_2', sex: 'm', age: 58, post: [9552.2, -871], face: 2.845, trade: 'sutler', idles: ['fold_arms', 'scratch', 'idle'] },
  { id: 'out_nell', name: 'Nell Sallow', title: 'Ash-carter, at Ashfold', body: 'c_worker_f_1', sex: 'f', age: 34, post: [9554, -887.5], face: -2.403, idles: ['look_around', 'wait', 'fold_arms'] },
  { id: 'out_tanner', name: 'Joss Harrow', title: "Master of Tanners' Hithe", body: 'c_smith_2', sex: 'm', age: 47, post: [9556, 849.1], face: 0.42, trade: 'sutler', idles: ['fold_arms', 'idle', 'look_around'] },
  { id: 'out_agna', name: 'Agna Ruddock', title: "Eel-wife, at Tanners' Hithe", body: 'c_crone_2', sex: 'f', age: 71, post: [9568.7, 851.9], face: -0.96, speed: 0.8, idles: ['idle', 'scratch', 'wait'] },
];

export const RULES = {
  // ---- Marchfoot, the old fold at the foot of the March Road, levels 16 to 17 (Hester Pyke; Piers Lusk): the wolves in
  // the gorse south, come down after the smell of sheep that aren't there; the toll-book's pages round the spiders in the
  // gully north-east (Piers's: he threw it at them); the keep's lancers on the slope north, there since he came in. Then
  // on to Widow's Lee: south-east to the Lantern, whose keepers stand under it, and over the hill south, round the gate ----
  back_of_the_line: { steps: [{ kill: 'lair:march_wolf', n: 2 }, { back: true, say: 'Two of the wolves in the gorse are dead.' }], gold: 34, xp: 340 },
  every_name: { steps: [{ gather: 'lair:march_webs', n: 5, what: 'pages of the toll-book' }, { back: true, say: 'Five pages, from round the webs.' }], gold: 34, xp: 340 },
  riders_on_the_slope: { needs: 'every_name', steps: [{ kill: 'lair:march_riders', n: 3 }, { back: true, say: 'The lancers on the slope are down.' }], gold: 70, xp: 700, item: 'robe' },
  under_the_lantern: { needs: 'riders_on_the_slope', steps: [{ kill: 'lair:lantern_keepers', n: 2 }, { talk: 'ines', say: 'Hester Pyke says the slope is clear. Send them down while it is.', end: true }], gold: 15, xp: 150 },

  // ---- the Long Queue, below Gatewatch's toll gate, level 18 (Rollo Bask; Bride Sayer): up the rise east after dark,
  // where the draper went after his dummies, and his cloth off the ground there (Bride's); the men on the toll gate where
  // the roads meet. Then over the hill to Widow's Lee, by way of the three who watch the Queue from the gorse south-east ----
  waiting_their_turn: { steps: [{ enter: 'lair:queue_dummies', night: true }, { kill: 'lair:queue_dummies', n: 3 }, { gather: 'lair:queue_dummies', n: 4, what: "bolts of Cobb's cloth" }, { back: true, say: "I went up the rise. I've brought his cloth down." }], gold: 46, xp: 460 },
  the_long_queue: { steps: [{ kill: 'lair:gatewatch_toll', n: 4 }, { back: true, say: 'The men on the gate are down.' }], gold: 76, xp: 760, item: 'skull' },
  over_the_hill: { needs: 'the_long_queue', steps: [{ kill: 'lair:queue_watchers', n: 2 }, { talk: 'ines', say: "Rollo Bask of the Queue says he'll carry anyone you need carried.", end: true }], gold: 15, xp: 150 },

  // ---- Widow's Lee, under the ridge by the Notch, levels 19 to 21 (Ines Mar; Oswy Holm): quills from round the harpies'
  // roost on the slope south-east (Oswy's), and the roost itself (Ines's: the birds go up off it for whoever walks the
  // hill, and the Needle reads that as well as she does). Given together, done in one trip: the gather first or not, the
  // roost's there for the killing. Then the Toll-Giant in the Notch, east, once both are done. Then down the Chasm to the
  // Sill, past what waits at the Broken Span: paid to bring you to the Sill at the city's level ----
  oswys_quills: { steps: [{ gather: 'lair:lee_roost', n: 5, what: 'long quills' }, { back: true, say: 'Five quills, from round the roost.' }], gold: 42, xp: 420 },
  the_birds_go_up: { steps: [{ kill: 'lair:lee_roost', n: 3 }, { back: true, say: 'The roost is dead. The queen first.' }], gold: 44, xp: 440 },
  the_toll_giant: { needs: ['oswys_quills', 'the_birds_go_up'], steps: [{ kill: 'lair:notch_giant', n: 2 }, { back: true, say: 'The Toll-Giant is dead. The Notch is open.' }], gold: 90, xp: 900, item: 'staff' },
  down_to_the_sill: { needs: 'the_toll_giant', steps: [{ kill: 'lair:span_ambush', n: 4 }, { talk: 'fv_wenna', say: 'Ines Mar says the Notch is open. Light a lamp for the dye works.', end: true }], gold: 130, xp: 1300 },

  // ---- the Sill, levels 22 to 23 (Wenna Coyle, once Ines's word has come down): three words into the city, one to each
  // of its hubs, each with a fight on the way in: Fennick Lowe's cold chimney in the Cinder Quarter, past the burnt houses;
  // Wenna's old apprentice, gone to the Ashwardens, past the Bone Yards' risen; and the oath of the watch that stayed, to
  // the dye works on the Tanners' Steps, past what's under the Drowned Wharf (Ser Hale's once, from the Bell Tower: its
  // old words, of Ines's watch now). The end of the land's road ----
  smoke_in_the_east: { needs: 'down_to_the_sill', steps: [{ kill: 'lair:phobos_cinder', n: 2 }, { talk: 'ph_penny', say: 'Wenna Coyle of the Sill sent me to see if you were still real.', end: true }], gold: 50, xp: 500 },
  wardens_of_ash: { needs: 'down_to_the_sill', steps: [{ kill: 'lair:phobos_boneyards', n: 2 }, { talk: 'ph_ash', say: 'Wenna Coyle of the Sill asks if her apprentice is any good.', end: true }], gold: 50, xp: 500 },
  quiet_men: { needs: 'down_to_the_sill', steps: [{ kill: 'lair:phobos_wharf', n: 2 }, { talk: 'ph_watch', say: "Ines Mar of Widow's Lee sends word: the oath still holds.", end: true }], gold: 55, xp: 550, item: 'scroll' },
  // A fourth word from Wenna, down off the causeway onto the Outwall (src/core/outskirts.js), past the Old Delf to Ashfold.
  the_ash_road: { needs: 'down_to_the_sill', steps: [{ kill: 'lair:out_delf', n: 4 }, { talk: 'out_reeve', say: "Wenna Coyle of the Sill asks after her ash.", end: true }], gold: 60, xp: 640 },

  // ---- Ashfold, the ash-gatherers' yard on the Outwall under the north gate, levels 23 to 24 (Hode Callow; Nell Sallow): the
  // ash-walkers on the Pyre Ground east of it, and the white ash sacked at the pyres' ends (Nell's), given together, done in
  // one trip; then the spiders on the Middens, past the gate under the north cliff. Then round the wall's west end to the
  // Hithe, past what's in the Sump ----
  the_pyre_ground: { steps: [{ kill: 'lair:out_pyre', n: 4 }, { back: true, say: 'Four of the ash-walkers are down.' }], gold: 52, xp: 520 },
  white_ash: { steps: [{ gather: 'lair:out_pyre', n: 5, what: 'sacks of white ash', spots: [[-6, -18], [3, -20], [11, -23], [16, -25], [1, -12]] }, { back: true, say: 'Five sacks. White.' }], gold: 50, xp: 500 },
  the_middens: { needs: 'the_pyre_ground', steps: [{ kill: 'lair:out_middens', n: 4 }, { back: true, say: 'The Middens are clear. The red one first.' }], gold: 100, xp: 1000, item: 'gem' },
  the_lazar_house: { needs: 'the_middens', steps: [{ kill: 'lair:out_lazar', n: 3 }, { back: true, say: 'Three of the lazars are down. They are back in the ground.' }], gold: 110, xp: 1100 },
  round_to_the_hithe: { needs: 'the_middens', steps: [{ kill: 'lair:out_sump', n: 2 }, { talk: 'out_tanner', say: "Hode Callow says the white ash is coming.", end: true }], gold: 75, xp: 760 },

  // ---- Tanners' Hithe, on the Leat under the south gate, levels 25 to 26 (Joss Harrow; Agna Ruddock): the drowned tanners
  // in the pits east of it, and Agna's eel-traps in the Sump's reeds; then the thing at the Limekilns, past the gate under
  // the south cliff. Then in at the Water Gate to the dye works, with a number ----
  the_far_row: { steps: [{ kill: 'lair:out_tanpits', n: 3 }, { back: true, say: 'Three of them are down. The far row is quiet.' }], gold: 56, xp: 560 },
  agnas_traps: { steps: [{ gather: 'lair:out_sump', n: 5, what: 'eel-traps', spots: [[23, 23], [37, 10], [34, -6], [33, -23], [17, -30]] }, { back: true, say: 'Five traps, out of the reeds.' }], gold: 55, xp: 550 },
  the_lime_burnt: { needs: 'the_far_row', steps: [{ kill: 'lair:out_kilns', n: 3 }, { back: true, say: 'The kilns are yours again.' }], gold: 130, xp: 1300, item: 'staff' },
  the_knackers: { needs: 'the_far_row', steps: [{ kill: 'lair:out_knackers', n: 3 }, { back: true, say: "Three are down at the knackers'. The wolf too." }], gold: 120, xp: 1200 },
  cured_hides: { needs: 'the_lime_burnt', steps: [{ talk: 'ph_watch', say: "Joss Harrow says the Hithe's hides are cured. Twelve.", end: true }], gold: 70, xp: 720 },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up; each errand on is
// at the top of its hub's band, so the hub's done before it's followed. The Sill's three are of the city's lairs they
// pass (24, and the Wharf's 25).
export const LEVELS = [
  ['back_of_the_line', 16], ['every_name', 16], ['riders_on_the_slope', 17], ['under_the_lantern', 17],
  ['waiting_their_turn', 18], ['the_long_queue', 18], ['over_the_hill', 18],
  ['oswys_quills', 19], ['the_birds_go_up', 19], ['the_toll_giant', 20], ['down_to_the_sill', 21],
  ['smoke_in_the_east', 22], ['wardens_of_ash', 22], ['quiet_men', 23],
  // (Phobos's Outwall: Wenna's word down to Ashfold, its work, round to the Hithe, its work, and in at the Water Gate.)
  ['the_ash_road', 23], ['the_pyre_ground', 23], ['white_ash', 23], ['the_middens', 24], ['the_lazar_house', 24], ['round_to_the_hithe', 25],
  ['the_far_row', 25], ['agnas_traps', 25], ['the_lime_burnt', 26], ['the_knackers', 26], ['cured_hides', 26],
];
