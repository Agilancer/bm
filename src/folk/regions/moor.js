// The Barrow Moor: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/moor.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs moor` says what breaks it; `node tools/quests/sheet.mjs moor`
// lays the region out to be read.
//
// Five hubs, south-west of Bellmourn down the Barrow Track: the Drovers' Stance (7 to 8, sent to from the Forkstone), the
// Moor Wayhouse (9 to 10), Peatcutters' Rick (11 to 12, the end of its road), the Diggers' Camp by the Barrows (12 to 14,
// and the Kingsbarrow's door, 16 to 17) and the Nine Maidens (14 to 15, the end of its road). What was given for the moor
// in Bellmourn (Jory's lights, his wayhouse, and the Kingsbarrow's two) is given out here now, by whoever stands by it.
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // The Drovers' Stance: the drover who holds it, and his daughter across the fire.
  { id: 'amos', name: 'Amos Tye', title: "Drover, at Drovers' Stance", body: 'c_dude_1', sex: 'm', age: 38, ...at('trackside'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'rue', name: 'Rue Tye', title: "Amos's daughter, at Drovers' Stance", body: 'c_young_1_1', sex: 'f', age: 15, ...by('trackside'), idles: ['idle', 'look_around', 'wait'] },
  // The Moor Wayhouse, an old place and no camp (src/core/places.js lesser()): Alis in her yard, between the door and the
  // lamp-post on the lane; the tinker by the well, in front of the open wing. Both 150 m and more from the dead in the
  // peat-cuttings west of the house. Alis keeps the board.
  { id: 'alis', name: 'Alis Penn', title: 'Widow, of the Moor Wayhouse', body: 'c_wife_jolly_2', sex: 'f', age: 57, post: [-1715.5, 2386.1], face: 0.727, trade: 'sutler', idles: ['fold_arms_ual', 'look_around', 'wait'] },
  { id: 'cobb', name: 'Cobb Hollin', title: 'Tinker, laid up at the Moor Wayhouse', body: 'c_old_man_3', sex: 'm', age: 63, post: [-1710.2, 2379.3], face: 0.727, idles: ['scratch', 'idle_ual', 'look_around'] },
  // Peatcutters' Rick: the cutter, and his mother, who still cuts, by the cairn (497 m from Alis: inside auto-play's 500, so
  // the wayhouse's word to her is taken before a lower one a country off).
  { id: 'brom', name: 'Brom Tarn', title: "Peat-cutter, at Peatcutters' Rick", body: 'c_worker_3', sex: 'm', age: 45, ...at('peatrick'), idles: ['fold_arms', 'scratch', 'idle'] },
  { id: 'hulda', name: 'Hulda Tarn', title: "Brom's mother, at Peatcutters' Rick", body: 'c_crone_3', sex: 'f', age: 79, ...by('peatrick', 3), idles: ['idle_ual', 'look_around', 'wait'] },
  // The Diggers' Camp, under its crane: the antiquary who pays for the digging and keeps the board, and his foreman.
  { id: 'lucan', name: 'Master Lucan Dree', title: "Antiquary, at the Diggers' Camp", body: 'c_sage_2', sex: 'm', age: 58, ...at('diggers'), idles: ['look_around', 'fold_arms_ual', 'idle_ual'] },
  { id: 'sal', name: 'Sal Mattock', title: "Digger, at the Diggers' Camp", body: 'c_worker_f_1', sex: 'f', age: 42, ...by('diggers'), idles: ['fold_arms', 'scratch', 'look_around'] },
  // The Nine Maidens, an old place (src/core/sites.js barrow()): Morwen inside the ring, on its south-east side by the
  // burnt-out fire, facing it; the coven that comes to the fallen one is 160 m north-west.
  { id: 'morwen', name: 'Old Morwen', title: 'Who counts the stones, at the Nine Maidens', body: 'c_crone_2', sex: 'f', age: 81, post: [-1890, 4410], face: -2.467, idles: ['idle_ual', 'look_around', 'wait'] },
];

export const RULES = {
  // ---- the Drovers' Stance, where the Barrow Track goes out onto the moor, levels 7 to 8 (Amos Tye; Rue Tye). Come to
  // past the four little ones on the bank (the Forkstone's errand in: src/folk/regions/bellmourn.js down_the_track). The
  // halters off his rail from round the Hungry Plot, and the Plot itself, both in hand at once; Rue's Spoil Heaps on the
  // old drove-road; then on to the wayhouse, through the three who stand by the track ----
  led_by_nothing: { steps: [{ gather: 'outpost:den_hungryplot', n: 5, what: 'halters', spots: [[-39, 17], [10, 44], [41, 8], [-12, 12], [11, -10]] }, { back: true, say: 'Five halters, from round the Plot.' }], gold: 15, xp: 155 },
  the_spoil_heaps: { steps: [{ clear: 'den_spoilheaps' }, { back: true, say: 'The Spoil Heaps are empty. The foreman too.' }], gold: 28, xp: 280 },
  the_hungry_plot: { steps: [{ clear: 'den_hungryplot' }, { back: true, say: 'The Hungry Plot is lying down. No beasts in it.' }], gold: 32, xp: 320, item: 'robe' },
  rate_for_a_drove: { needs: 'the_hungry_plot', steps: [{ kill: 'lair:track_possessed', n: 2 }, { talk: 'alis', say: 'Amos Tye asks your rate for a drove of six, and a man.', end: true }], gold: 4, xp: 35 },

  // ---- the Moor Wayhouse, on the Barrow Track, levels 9 to 10 (Widow Alis Penn; Cobb Hollin): the other lamp, carried round
  // her windows by the two in the peat-cuttings west of the house; the tinker's irons from round Sexton's Rest, and Sexton's
  // Rest itself with a stone off Tom's cairn by its gate, both in hand at once. Then a word west to the Rick, and a word on
  // to the Diggers' Camp, past the carrion birds by the track ----
  moor_wayhouse: { steps: [{ kill: 'lair:wayhouse_dead', n: 4 }, { back: true, say: 'The other lamp is out. Its two are down, and two small ones.' }], gold: 20, xp: 200 },
  iron_on_the_graves: { steps: [{ gather: 'outpost:den_sextonsrest', n: 5, what: 'ox-cues', spots: [[42, -14], [-11, 41], [-38, -24], [14, 9], [-9, -13]] }, { back: true, say: 'Five cues, off the graves.' }], gold: 20, xp: 200 },
  // (Tom's cairn: inside the lych gate, which is on the trail's side, the south; on the left going in.)
  sextons_rest: { steps: [{ clear: 'den_sextonsrest' }, { gather: 'outpost:den_sextonsrest', n: 1, what: "Tom's cairn-stone", spots: [[-4, 9]] }, { back: true, say: "Sexton's Rest is lying down. Here's the top stone off Tom's cairn." }], gold: 40, xp: 400, item: 'staff' },
  the_kettle: { needs: 'sextons_rest', steps: [{ talk: 'hulda', say: "Cobb Hollin has your kettle mended. It's at the wayhouse." }, { talk: 'brom', say: 'Alis Penn has paid for forty turves, and had none.', end: true }], gold: 4, xp: 35 },
  board_owing: { needs: 'sextons_rest', steps: [{ kill: 'lair:moor_carrion', n: 2 }, { talk: 'lucan', say: "Alis Penn says your diggers' board is three weeks owing.", end: true }], gold: 4, xp: 35 },

  // ---- Peatcutters' Rick, on the Hollow Watch Lane, levels 11 to 12 (Brom Tarn; Hulda Tarn): the slanes the wolfkin
  // carried into Moonbite Hollow, what the peat gave up, stood up out of the cutting south, the Hollow, and Coldhowe, which
  // the cutting came too near, last. The end of its road ----
  slanes: { steps: [{ gather: 'outpost:den_moonbite', n: 5, what: 'slanes', spots: [[-40, -13], [16, 42], [38, -21], [-12, -11], [9, 13]] }, { back: true, say: 'Five slanes, from round the Hollow.' }], gold: 24, xp: 240 },
  what_the_peat_gives_up: { steps: [{ kill: 'lair:moor_golem', n: 2 }, { back: true, say: 'What stood up out of your cutting is down again.' }], gold: 26, xp: 265 },
  moonbite_hollow: { steps: [{ clear: 'den_moonbite' }, { back: true, say: 'Moonbite Hollow is empty. Nothing is on your ricks.' }], gold: 48, xp: 480 },
  coldhowe: { needs: 'moonbite_hollow', steps: [{ clear: 'den_coldhowe' }, { back: true, say: 'Coldhowe is empty. Its king is down in his own door.' }], gold: 52, xp: 520, item: 'skull' },

  // ---- the Diggers' Camp, by the Barrows, levels 12 to 14 and the Kingsbarrow's 16 to 17 (Master Lucan Dree; Sal Mattock):
  // the lights on the mounds by night; the singers at the great mound's back; the Sleepless Stones north-east, that keep the
  // diggers up; Ravenhowe, south-east; and the Kingsbarrow, sung awake, through the Barrow Door with a company. Then a word
  // to the Nine Maidens, past the tomb drakes on the path south-east ----
  // (Its hunt kept to the jellies' north-west, 290 m and more from the wyrm south-east of them, which wakes at 200.)
  barrow_lights: { steps: [{ enter: 'barrows', night: true }, { kill: 'barrows', n: 5, of: 9, spots: [[-2925, 3375], [-2950, 3405], [-2895, 3372]] }, { back: true, say: 'The lights were jellies. Full of bones.' }], gold: 24, xp: 240 },
  the_singers: { steps: [{ kill: 'lair:barrow_lords', n: 5 }, { back: true, say: 'Five of the singers are down. The door is still shut.' }], gold: 24, xp: 245 },
  the_sleepless_stones: { steps: [{ clear: 'den_sleepless' }, { back: true, say: 'The Sleepless Stones are empty. Sleep, then.' }], gold: 48, xp: 480 },
  ravenhowe: { steps: [{ clear: 'den_ravenhowe' }, { gather: 'outpost:den_ravenhowe', n: 1, what: "the king's crown", spots: [[0, 4]] }, { back: true, say: "Ravenhowe is empty. Here's its king's crown." }], gold: 52, xp: 520, item: 'scroll' },
  sung_open: { needs: 'the_singers', steps: [{ enter: 'kingsbarrow' }, { boss: 'gravewarden' }, { back: true, say: "The great mound's warden is down." }], gold: 400, xp: 4000, item: 'staff' },
  king_under_the_moor: { needs: 'sung_open', steps: [{ boss: 'golem' }, { boss: 'wyrm' }, { back: true, say: 'What the king rode is dead. Its mate still lies out south.' }], gold: 450, xp: 4500, item: 'skull', rarity: 4 },
  how_many_maidens: { needs: 'ravenhowe', steps: [{ kill: 'lair:moor_whelps', n: 2 }, { talk: 'morwen', say: 'Master Lucan Dree asks, for his survey, how many you make them.', end: true }], gold: 4, xp: 35 },

  // ---- the Nine Maidens, levels 14 (Old Morwen; the Ninth Circle, a hedge coven's, at its own 8): the three in robes who come to the fallen one at dusk, the stones of
  // her cairns from round the Ninth Circle west of the ring and the Ninth Circle itself, both in hand at once, and last,
  // Cold Hearth, her aunt's farm, the night's ruin south of the ring. The end of its road ----
  the_one_lying_down: { steps: [{ kill: 'lair:maiden_coven', n: 2 }, { back: true, say: 'Two of the three are down. Their rope too.' }], gold: 28, xp: 300 },
  cairn_stones: { steps: [{ gather: 'outpost:den_ninthstone', n: 5, what: 'cairn-stones', spots: [[39, 16], [-14, 42], [-41, -10], [13, -12], [-10, 9]] }, { back: true, say: "Five stones, from round their ring. They're yours." }], gold: 28, xp: 300 },
  the_ninth_circle: { steps: [{ clear: 'den_ninthstone' }, { back: true, say: 'The Ninth Circle is empty. Their gap is still there.' }], gold: 32, xp: 320 },
  cold_hearth: { needs: 'the_ninth_circle', steps: [{ clear: 'den_coldhearth' }, { back: true, say: 'Cold Hearth is empty. Nothing keeps it now.' }], gold: 56, xp: 560, item: 'robe' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up; each errand on is at
// the first level of where it leads; the Kingsbarrow's two are a company's, at its own level and over.
export const LEVELS = [
  ['led_by_nothing', 7], ['the_spoil_heaps', 7], ['the_hungry_plot', 8], ['rate_for_a_drove', 9],
  ['moor_wayhouse', 9], ['iron_on_the_graves', 9], ['sextons_rest', 10], ['the_kettle', 11], ['board_owing', 12],
  ['slanes', 11], ['what_the_peat_gives_up', 11], ['moonbite_hollow', 11], ['coldhowe', 12],
  ['barrow_lights', 12], ['the_singers', 12], ['the_sleepless_stones', 13], ['ravenhowe', 13], ['how_many_maidens', 14],
  ['sung_open', 16], ['king_under_the_moor', 17],
  ['the_ninth_circle', 8], ['the_one_lying_down', 14], ['cairn_stones', 14], ['cold_hearth', 14],
];
