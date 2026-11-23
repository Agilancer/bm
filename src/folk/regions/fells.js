// The Rimeholt Fells: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/fells.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs fells` says what breaks it; `node tools/quests/sheet.mjs fells`
// lays the region out to be read.
//
// Five hubs up the Frost Road, south of the Forkstone: Fellfoot (8 to 11), the packman's camp where the fells begin;
// Frostwatch (11 to 13, and the Howling Deeps' door, 17 to 18, last), the warden and his quartermaster; then two roads out of the
// fort: west to Hoarfrost Hide (13 to 14) and on north-west to the Frozen Shrine (15 to 16, the end of its road), and
// south-east to Climbers' Rest under Ravens' Tor (15 to 16, the end of its road). What was given for the fells in
// Bellmourn (Bram's purse) and at the Bell Tower (Ser Hale's Sleeper) is given up here now, by whoever stands by
// the work; Garrick's Tor is the climbers', and his word to Phobos is cut (the Marches give the road to the city).
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // Fellfoot: the packman whose ponies have gone down to Nan Dray's, and the woman who keeps the beacon, across the fire.
  { id: 'berin', name: 'Berin Stoat', title: 'Packman, at Fellfoot', body: 'c_dude_3', sex: 'm', age: 51, ...at('fellfoot'), idles: ['look_around', 'scratch', 'idle'] },
  { id: 'corrie', name: 'Corrie Blane', title: 'Beacon-keeper, at Fellfoot', body: 'c_crone_1', sex: 'f', age: 69, ...by('fellfoot'), idles: ['idle_ual', 'look_around', 'wait'] },
  // Frostwatch (Garrick is posted in src/folk/people.js, in the yard by the smithy): his quartermaster by the stores against
  // the south wall, facing up the yard to him. She keeps the fort's stores, and buys what's carried in.
  { id: 'signy', name: 'Signy Arn', title: 'Quartermaster of Frostwatch', body: 'c_worker_f_2', sex: 'f', age: 55, post: [697.5, 3915.5], face: -2.71, trade: 'sutler', idles: ['fold_arms_ual', 'look_around', 'wait'] },
  // Hoarfrost Hide: the trapper who keeps it, and her husband, the skinner, across the fire.
  { id: 'ulla', name: 'Ulla Thorsby', title: 'Trapper, at Hoarfrost Hide', body: 'c_redhead_2', sex: 'f', age: 44, ...at('hoarhide'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'arne', name: 'Arne Thorsby', title: 'Skinner, at Hoarfrost Hide', body: 'c_elder_3', sex: 'm', age: 52, ...by('hoarhide'), idles: ['scratch', 'idle_ual', 'fold_arms_ual'] },
  // The Frozen Shrine, an old place and no camp (src/core/sites.js rimeholt()): Brynn east of the steps, by the nearer of
  // the two fires, facing in; the Hoar Circle is 380 m west.
  { id: 'brynn', name: 'Sister Brynn', title: 'Keeper of the Frozen Shrine', body: 'c_young_3_2', sex: 'f', age: 36, post: [-687.3, 3302.6], face: -1.77, idles: ['idle_ual', 'look_around', 'wait'] },
  // Climbers' Rest, under its mast: the climber who keeps it, and the woman who cuts the holds on the Tor, across the fire.
  { id: 'dain', name: 'Dain Scree', title: "Climber, at Climbers' Rest", body: 'c_wes_2', sex: 'm', age: 40, ...at('climbers'), idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'wynn', name: 'Wynn Halse', title: "Holds-cutter, at Climbers' Rest", body: 'c_young_2_2', sex: 'f', age: 24, ...by('climbers'), idles: ['scratch', 'look_around', 'wait'] },
];

export const RULES = {
  // ---- Fellfoot, where the Frost Road starts to climb, levels 8 to 11 (Berin Stoat; Corrie Blane). Come to with word that
  // Nan Dray will winter his ponies (src/folk/regions/bellmourn.js ponies_for_the_winter). The goat men in the hollow south,
  // who come up at night to the beacon (Corrie's); Berin's salt, carried off to the Frozen Moot south-west, whose hill rams
  // came down for it (three lying out, two close in); Chilblain Camp west, whose fire stands as high as the beacon on the
  // nights hers isn't lit (Corrie's). Then up the road to Frostwatch with Bram Kettle's purse, past the rams of the Rime
  // Ring, halfway ----
  rams_at_the_beacon: { steps: [{ kill: 'lair:rime_goats', n: 2 }, { back: true, say: "Two of the goat men are down. They'd been rubbing on it." }], gold: 30, xp: 300 },
  salt_at_the_moot: { steps: [{ gather: 'outpost:den_frozenmoot', n: 5, what: 'cakes of salt', spots: [[-38, 18], [16, -40], [42, 9], [-12, -11], [10, 13]] }, { back: true, say: 'Five cakes of your salt, from round the Moot.' }], gold: 33, xp: 330 },
  the_other_light: { steps: [{ clear: 'den_chilblain' }, { back: true, say: 'Chilblain Camp is empty. Its fire is out.' }], gold: 66, xp: 660, item: 'staff' },
  kettles_slate: { needs: 'salt_at_the_moot', steps: [{ kill: 'outpost:den_rimering', n: 2 }, { talk: 'garrick', say: "Bram Kettle's purse. Berin Stoat says keep it this time.", end: true }], gold: 8, xp: 68 },

  // ---- Frostwatch, the old watch-fort at the Frost Road's end, levels 12 to 13 (Signy Arn; Hew Garrick), and the Howling
  // Deeps, down the Mouth east round the fell, 17 to 18, last of the fells (Garrick's). Signy's: Whitefang Camp south of the
  // wall; then two words out, west to the Hide past the goat men on the lane, and south-east to Climbers' Rest past the
  // goblins of the Ice Stockade. Garrick's: the night things at the Mouth, then down to the Goat-King, and the bottom ----
  whitefang_camp: { steps: [{ clear: 'den_whitefang' }, { back: true, say: 'Whitefang Camp is empty. They were wearing your cloaks.' }], gold: 48, xp: 480, item: 'staff' },
  mouth_guard: { steps: [{ kill: 'lair:mouth_demons', n: 1, foe: ['Night Paralysis Demons'] }, { back: true, say: 'One of the two at the Mouth is dead.' }], charm: 'glimmerstone', charmName: 'the Glimmerstone', xp: 290 },
  furs_for_the_fort: { needs: 'whitefang_camp', steps: [{ kill: 'lair:fells_goats', n: 2 }, { talk: 'ulla', say: 'Signy Arn at Frostwatch wants sixteen pelts for the winter.', end: true }], gold: 5, xp: 45 },
  the_beacon_out: { needs: 'mouth_guard', steps: [{ kill: 'outpost:den_icestockade', n: 3 }, { talk: 'dain', say: "Signy Arn says the fort's tower fire was out. Nobody's dead.", end: true }], gold: 5, xp: 50 },
  into_the_deeps: { needs: 'mouth_guard', steps: [{ enter: 'deeps' }, { boss: 'hrymgar' }, { back: true, say: "Hrymgar's dead, in the Goat-King's Hall." }], gold: 120, xp: 1400, item: 'staff' },
  // (One run down kills all three, and the delve pays its own 2600 on top: so the brood and the bottom are one quest, and the
  // two quests pay about three levels' worth between them at 17, not three bosses' worth each.)
  the_sleeper: { needs: 'into_the_deeps', steps: [{ boss: 'broodmother' }, { boss: 'sleeper' }, { back: true, say: 'The Brood Mother is dead, and what slept under the fells.' }], gold: 180, xp: 1800, item: 'scroll' },

  // ---- Hoarfrost Hide, at the Hoarfrost Hide Lane's west end, levels 13 to 14 (Ulla Thorsby; Arne Thorsby): the wolf that
  // stands up and walks her line before her, north; her traps, found set round the White Larder, west (three lying out, two
  // close in); the Frozen Scrape south-east, whose white ones Arne wants (Arne's). Then on north-west to the Frozen Shrine,
  // past the goblins of Snowgate Camp under it ----
  the_round: { steps: [{ kill: 'lair:fells_wolves', n: 1 }, { back: true, say: 'The one that walked your round is down.' }], gold: 29, xp: 290 },
  the_white_larder: { steps: [{ gather: 'outpost:den_whitelarder', n: 5, what: 'traps', spots: [[-42, 10], [13, -41], [38, 22], [-11, -13], [14, 9]] }, { back: true, say: 'Five of your traps, from round the Larder. They were set.' }], gold: 29, xp: 290 },
  white_at_the_root: { steps: [{ clear: 'den_frozenscrape' }, { back: true, say: 'The Frozen Scrape is empty. The big one too.' }], gold: 56, xp: 560, item: 'skull' },
  fat_for_the_lamps: { needs: 'white_at_the_root', steps: [{ kill: 'outpost:den_snowgate', n: 2 }, { talk: 'brynn', say: "Ulla Thorsby has the winter's fat put by for your lamps.", end: true }], gold: 4, xp: 40 },

  // ---- the Frozen Shrine, the third watch's, levels 15 to 16 (Sister Brynn): what comes up by night from the Rime Coven,
  // south-west, to put the fires out; the pilgrims' strips, tied on at Hornfrost Stones, south-east by the lane (three lying
  // out, two close in); and the Hoar Circle, west up the hill, the sisters' first ring, kept now by things that never sleep: last, once both are done. The end of its road ----
  the_fires: { steps: [{ enter: 'outpost:den_rimecoven', night: true }, { kill: 'outpost:den_rimecoven', n: 3 }, { back: true, say: 'Three of them are down. They were carrying snow.' }], gold: 33, xp: 330 },
  names_on_the_wind: { steps: [{ gather: 'outpost:den_hornfrost', n: 5, what: "pilgrims' strips", spots: [[-41, 12], [14, 39], [37, -20], [-10, -13], [13, 10]] }, { back: true, say: 'Five of the strips, from Hornfrost Stones.' }], gold: 33, xp: 330 },
  the_hoar_circle: { needs: ['names_on_the_wind', 'the_fires'], steps: [{ clear: 'den_hoarcircle' }, { back: true, say: 'The Hoar Circle is empty. The big one too.' }], gold: 64, xp: 640, item: 'scroll' },

  // ---- Climbers' Rest, under Ravens' Tor, levels 15 to 16 (Dain Scree; Wynn Halse): the harpies on the Tor, east, that cut
  // the ropes; Wynn's chisels, carried off to the Thunder Crag west-south-west (three lying out, two close in; Wynn's);
  // Winterfast, south, that has his pennon pointing at it whatever the wind. The end of its road ----
  ravens_tor: { steps: [{ enter: 'tor' }, { kill: 'lair:tor_roost', n: 2, foe: ['Harpies'] }, { back: true, say: "Two of the Tor's three are dead." }], gold: 33, xp: 330 },
  by_my_holds: { steps: [{ gather: 'outpost:den_thundercrag', n: 5, what: 'chisels', spots: [[39, 16], [-14, 41], [-40, -13], [12, -12], [-11, 12]] }, { back: true, say: 'Five of your chisels, from round the Thunder Crag.' }], gold: 33, xp: 330 },
  winterfast: { needs: 'ravens_tor', steps: [{ clear: 'den_winterfast' }, { back: true, say: 'Winterfast is empty. Its caller is down.' }], gold: 64, xp: 640, item: 'staff' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up a level at a time;
// each errand on is at the first level of where it leads; the Deeps come last, after the Hide, the shrine and the Rest.
export const LEVELS = [
  ['rams_at_the_beacon', 8], ['salt_at_the_moot', 9], ['the_other_light', 10], ['kettles_slate', 11],
  ['whitefang_camp', 11], ['mouth_guard', 12], ['furs_for_the_fort', 13], ['the_beacon_out', 15],
  ['the_round', 13], ['the_white_larder', 13], ['white_at_the_root', 14], ['fat_for_the_lamps', 15],
  ['the_fires', 15], ['names_on_the_wind', 15], ['the_hoar_circle', 16],
  ['ravens_tor', 15], ['by_my_holds', 15], ['winterfast', 16],
  ['into_the_deeps', 17], ['the_sleeper', 18],
];
