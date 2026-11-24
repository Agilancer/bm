// Thornwick and the Gallowswood: who's posted at its hubs, and the workings of the quests given there (as src/folk/quests.js RULES,
// which takes these in through src/folk/regions/index.js). Every word of them: src/folk/lines/regions/gallows.js.
// The loop they keep to: docs/QUEST-LOOP.md (work given at a hub, done within reach of it, paid there; the last of a
// hub's work sends you on to the next). `node tools/quests/check.mjs gallows` says what breaks it; `node tools/quests/sheet.mjs gallows`
// lays the region out to be read.
//
// Seven hubs down the Gallows Road and off it, levels 8 to 18. Thornwick (8 to 11: Osric, Dorcas and Wymond, posted in
// src/folk/people.js), come to from Dunmow Fold; it sends you north-east to Kestrel Hide (the Downs', the end of its road)
// and on down the road to the Old Toll (11 to 13), whose keeper's daughter sends you to Hangman's Cross (13 to 15). From
// the Cross two ways: south-west to Corpse-Candle Camp (14 to 15) and on to the Players' Wagon by the Twisted Grove, the
// Hollow Playhouse's door (15 to 16, the end of its road); and north-east to Mother Grawl's Hut (15 to 17) and Roadsend (17
// to 18), on the Marshal's Road, which sends you on to the Long Queue in the East. What Bellmourn used to send people down
// here for (Ser Aldric's word to Thornwick) is cut: the chain comes in through the Downs. What Thornwick gave for the Toll,
// the Cross and the Playhouse, a country off, is given now by whoever stands by the work.
// Every camp and place here is plain folk's: nobody names either power.
import { campPost, campFace } from '../../core/camps-data.js';

// Who stands where (taken into src/folk/people.js POSTED). camp: the camp they're at, on one of its posts (campPost(key, 0-3):
// by the fire, at the sutler's board, across the fire, by the landmark). body: one of the camps' own, c_<body>_<1-3>
// (tools/folk/camp_swaps.mjs), or any other in assets/game/folk/folk.json that Bellmourn has loaded already.
const at = (camp, i = 0) => ({ camp, post: campPost(camp, i), face: campFace(camp, i), trade: 'sutler' });
const by = (camp, i = 2) => ({ camp, post: campPost(camp, i), face: campFace(camp, i) });
export const PEOPLE = [
  // The Old Toll, an old place and no camp (src/core/places.js): on the spot `oldtoll_bar`, by the broken bar. The two
  // graves by the well are the ones she dug.
  { id: 'ann', name: 'Ann Arden', title: "The toll-keeper's daughter, at the Old Toll", body: 'c_young_4_1', sex: 'f', age: 31, post: [3300.4, 2594.0], face: -0.64, idles: ['fold_arms', 'look_around', 'wait'] },
  // Hangman's Cross, an old place and no camp (src/core/sites.js gallows()): by the stocks, south-east of the fingerpost,
  // where he can see both roads come in (and more than 150 m from what stands at the lime-pit).
  { id: 'crowle', name: 'Master Crowle', title: "The hangman, at Hangman's Cross", body: 'c_old_man_1', sex: 'm', age: 66, post: [4104, 3214], face: 1.2, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] },
  // Corpse-Candle Camp: the woman who reads the lights, and a hunter across the fire.
  { id: 'tansy', name: 'Tansy Wight', title: 'Who reads the lights, at Corpse-Candle Camp', body: 'c_worker_f_3', sex: 'f', age: 58, ...at('candlecamp'), idles: ['look_around', 'idle_ual', 'wait'] },
  { id: 'gil', name: 'Gil Mosse', title: 'Hunter, at Corpse-Candle Camp', body: 'c_wes_1', sex: 'm', age: 38, ...by('candlecamp'), idles: ['scratch', 'look_around', 'idle'] },
  // The Players' Wagon, by the Twisted Grove: the company's master, who sells off its stock, and the girl who sold its
  // tickets, across the fire.
  { id: 'fabian', name: 'Master Fabian Larke', title: "Last of the Winter Company, at the Players' Wagon", body: 'c_elder_2', sex: 'm', age: 58, ...at('wagon'), idles: ['fold_arms', 'idle_ual', 'look_around'] },
  { id: 'peg', name: 'Peg Hollin', title: "Who sold the Winter Company's tickets", body: 'c_young_5_2', sex: 'f', age: 24, ...by('wagon'), idles: ['wait', 'scratch', 'look_around'] },
  // Mother Grawl's Hut, an old place and no camp (src/core/sites.js gallows()): just out from her door (the spot
  // `witch_door`), by the cauldron, facing down her garden.
  { id: 'grawl', name: 'Mother Grawl', title: 'At her hut, in the Gallowswood', body: 'c_crone_3', sex: 'f', age: 77, post: [4801.6, 1607.3], face: 0.5, idles: ['idle_ual', 'look_around', 'scratch'] },
  // Roadsend, where the Gallowswood's lanes come out on the Marshal's Road: the wool-factor, its sutler.
  { id: 'wilf', name: 'Wilf Carder', title: 'Wool-factor, at Roadsend', body: 'c_smith_2', sex: 'm', age: 47, ...at('roadsend'), idles: ['fold_arms', 'look_around', 'idle'] },
  // (Sib Kestrel, whom Thornwick's word north-east is said to, is the Downs': src/folk/regions/downs.js. Rollo Bask, at the
  // Long Queue, whom Roadsend's word is said to, is the East's: src/folk/regions/east.js.)
];

export const RULES = {
  // ---- Thornwick, where the downs run out on the Gallows Road, levels 8 to 11 (Osric Thorne; Dorcas Pym; Wymond Ebb).
  // Come to with Rafe Dunmow's strays (src/folk/regions/downs.js). Osric's: the goat men north-west who lean on his hedge,
  // and the Black Ram south-west the third runs to. Dorcas's: the plague stragglers stopped by the road south-east, then two
  // words out: north-east to Kestrel Hide past Featherfall's harpies (the fowler's birds have stopped coming), and down the
  // road to the Old Toll past the werebat (Wat Arden has missed five Thursdays). Wymond's: the lead tags off the same
  // stragglers, one with a name he's already buried, and the Warlocks' Stones south, where somebody says his list a night
  // behind him ----
  hedge_breakers: { steps: [{ kill: 'lair:thorn_goats', n: 2 }, { back: true, say: 'Two of the goat men are down. The third ran south-west.' }], gold: 18, xp: 180 },
  up_from_the_gallowswood: { steps: [{ kill: 'lair:thorn_stragglers', n: 3 }, { back: true, say: "Three of them are down. Burn what's left." }], gold: 18, xp: 180 },
  names_in_lead: { steps: [{ gather: 'lair:thorn_stragglers', n: 4, what: 'lead tags', spots: [[-41, 12], [16, -40], [37, 24], [-9, 11]] }, { back: true, say: 'Four tags, from where they stood by the road.' }], gold: 20, xp: 200 },
  nothing_for_the_pot: { needs: 'up_from_the_gallowswood', steps: [{ kill: 'outpost:den_featherfall', n: 2 }, { talk: 'sib', say: 'Dorcas Pym asks where her birds are.', end: true }], gold: 4, xp: 35 },
  black_ram: { needs: 'hedge_breakers', steps: [{ kill: 'lair:thorn_ram', n: 2 }, { back: true, say: 'Two of the three on the high down are dead.' }], charm: 'goatfoot', charmName: 'the Goatfoot', xp: 240 },
  the_warlocks_stones: { needs: 'names_in_lead', steps: [{ clear: 'den_warlockstones' }, { back: true, say: "The Warlocks' Stones are empty. Nobody's saying names." }], gold: 40, xp: 400, item: 'staff' },
  old_toll: { needs: ['black_ram', 'the_warlocks_stones'], steps: [{ kill: 'lair:gallows_bat', n: 1 }, { talk: 'ann', say: "Dorcas Pym sent Wat Arden's pie down. It's Thursday.", end: true }], gold: 5, xp: 40 },

  // ---- the Old Toll, halfway down the Gallows Road, levels 11 to 13 (Ann Arden). Come to with Wat's pie. Its work: what
  // stands on the rise north each dusk, facing south down at the broken bar (the possessed, and a man-high doll or more
  // among them); the pieces of her father's rate-board, carried up there; and the Toll Roost south-west, whose bats cross
  // the road he walked home by every Thursday. Then on down the road to the Cross, past the two night things off it ----
  what_waits_at_the_bar: { steps: [{ kill: 'lair:toll_ambush', n: 4 }, { back: true, say: 'Four of what stands on the rise are down.' }], gold: 24, xp: 240 },
  corpses_nothing: { steps: [{ gather: 'lair:toll_ambush', n: 4, what: 'pieces of the rate-board', spots: [[-38, 18], [22, 41], [44, -14], [10, -9]] }, { back: true, say: 'Four pieces of the board. One has fresher paint.' }], gold: 24, xp: 240 },
  the_toll_roost: { steps: [{ clear: 'den_duskroost' }, { back: true, say: 'The Toll Roost is empty, the Gallows-Wing with it.' }], gold: 38, xp: 380, item: 'robe' },
  not_coming_back: { needs: 'the_toll_roost', steps: [{ kill: 'lair:gallows_demons', n: 1 }, { talk: 'crowle', say: "Ann Arden says she isn't coming back. The toll's kept.", end: true }], gold: 5, xp: 45 },

  // ---- Hangman's Cross, where the Gallows Road meets the lanes, levels 13 to 15 (Master Crowle). Come to with Ann's word
  // that he's to cook for himself. The priest's salt, put down at last where his hanged went (the lime-pit north-west, where
  // the big man stands, and the Burning Ground past it); the big man himself, whom Crowle knows; the Burning Ground, its
  // fires lit again with his own wood. Then two words out: south-west to Corpse-Candle Camp past the giants on the lane,
  // to ask if there's a light over the Cross yet; and north-east to Mother Grawl past the old gibbet, for his jar ----
  salt_for_the_hanged: { steps: [{ visit: ['lair:gallows_plague', 'outpost:den_burningground'] }, { back: true, say: 'The salt is down at the pit and on the Burning Ground.' }], gold: 28, xp: 285 },
  the_big_man: { steps: [{ kill: 'lair:gallows_plague', n: 3 }, { back: true, say: 'Three of the four at the pit are down.' }], gold: 29, xp: 290 },
  the_burning_ground: { steps: [{ clear: 'den_burningground' }, { back: true, say: 'The Burning Ground is empty. Its fires are out.' }], gold: 42, xp: 420, item: 'skull' },
  a_light_over_the_cross: { needs: 'the_big_man', steps: [{ kill: 'lair:gallows_giant', n: 2 }, { talk: 'tansy', say: "Master Crowle asks if there's a light over the Cross yet.", end: true }], gold: 5, xp: 45 },
  crowles_jar: { needs: 'the_burning_ground', steps: [{ kill: 'lair:gibbet_possessed', n: 3 }, { talk: 'grawl', say: "Master Crowle's jar wants filling. He says you'll know.", end: true }], gold: 5, xp: 50 },

  // ---- Corpse-Candle Camp, off the lanes south-west of the Cross, levels 14 to 15 (Tansy Wight; Gil Mosse). A light has
  // gone the same road every night, from the Lazar Field to Nightfall Ruin, which is the road somebody will be carried:
  // walk it to the ruin before the light does and put down three; then empty the ruin. Gil's: the lepers' clappers, thrown
  // away round the Lazar Field, so he can't hear the plague-taken coming. Then on south-west to the players' wagon, by
  // the Lazar Field's edge ----
  the_candle_road: { steps: [{ enter: 'outpost:den_nightfall' }, { kill: 'outpost:den_nightfall', n: 3 }, { back: true, say: 'I walked the candle road to the ruin. Three there are down.' }], gold: 25, xp: 250 },
  clappers: { steps: [{ gather: 'outpost:den_lazarfield', n: 5, what: 'clappers', spots: [[42, 11], [-14, 43], [-40, -17], [38, -34], [-36, 32]] }, { back: true, say: 'Five clappers, from round the Lazar Field.' }], gold: 25, xp: 250 },
  nightfall_ruin: { steps: [{ clear: 'den_nightfall' }, { back: true, say: 'Nightfall Ruin is empty, the long one with it.' }], gold: 30, xp: 300, item: 'scroll' },
  the_players_bill: { needs: ['the_candle_road', 'nightfall_ruin'], steps: [{ kill: 'outpost:den_lazarfield', n: 2 }, { talk: 'fabian', say: 'Tansy Wight sends back your playbill. She went.', end: true }], gold: 4, xp: 40 },

  // ---- the Players' Wagon, by the Twisted Grove, levels 15 to 16 (Master Fabian Larke; Peg Hollin), and the Hollow
  // Playhouse under the grove (Fabian's). The audience that sits in the grove at dusk, facing the door; Poxhollow, north-west,
  // where the company played for nothing on the way in and Fabian caught the cough that kept him out of the play (Peg's);
  // then the house itself: the seamstress, and the last night of the run. The end of its road ----
  the_audience: { steps: [{ kill: 'lair:grove_demons', n: 3 }, { back: true, say: 'Three of your audience are down.' }], gold: 26, xp: 265 },
  poxhollow: { steps: [{ clear: 'den_poxhollow' }, { back: true, say: 'Poxhollow is empty, its master with it.' }], gold: 30, xp: 300 },
  the_winter_company: { needs: 'the_audience', steps: [{ enter: 'playhouse' }, { boss: 'seamstress' }, { back: true, say: 'I found your company. Their seamstress is dead.' }], gold: 50, xp: 500, item: 'robe' },
  last_night_of_the_run: { needs: 'the_winter_company', steps: [{ boss: 'leadingman' }, { boss: 'dollmaker' }, { back: true, say: 'The play is over. The Dollmaker is dead.' }], gold: 60, xp: 600, item: 'skull' },
  // (Its pay is small for a delve's: the Playhouse pays its own, in what its bosses and packs give, and a quest's worth on
  // top of that took a player out of the Wagon at 23 or 24, past the region's top; at 500 and 600 still about three over.)
  // And back up the lane to the Cross with word the house is shut, past Nightfall Ruin, filling again: Crowle's jar waits there.
  the_closing_notice: { needs: 'last_night_of_the_run', steps: [{ kill: 'outpost:den_nightfall', n: 2 }, { talk: 'crowle', say: 'Master Fabian Larke says the Winter Company has closed.', end: true }], gold: 5, xp: 45 },

  // ---- Mother Grawl's Hut, up her lane off the Marshal's Road, levels 15 to 17 (Mother Grawl). Come to with Crowle's jar.
  // Her henbane, from the ground round Grawl's Kennel north-east (where her six dogs lie up, that the wood gave back
  // upright); the Kennel; and what beds down on the burnt ground south-west and watches her pot. Then east to Roadsend
  // with the fleece Wilf sent her, the wrong colour, past Thornwick's carters stood by the road where they stopped ----
  henbane: { steps: [{ gather: 'outpost:den_grawlden', n: 5, what: 'henbane', spots: [[46, 16], [-19, 46], [-47, -14], [40, -30], [-38, 30]] }, { back: true, say: 'Five of henbane, with the dirt on.' }], gold: 26, xp: 265 },
  grawls_kennel: { needs: 'henbane', steps: [{ clear: 'den_grawlden' }, { back: true, say: 'The Kennel is empty. The big one came when I called.' }], gold: 33, xp: 330, item: 'staff' },
  under_the_eaves: { steps: [{ kill: 'lair:grawl_bats', n: 1 }, { back: true, say: 'One of the two on the burnt ground is down.' }], gold: 28, xp: 280 },
  the_wrong_fleece: { needs: ['grawls_kennel', 'under_the_eaves'], steps: [{ kill: 'lair:carters_halt', n: 3 }, { talk: 'wilf', say: "Mother Grawl sends your fleece back. It's the wrong colour.", end: true }], gold: 5, xp: 45 },

  // ---- Roadsend, where the Gallowswood's lanes come out on the Marshal's Road, levels 17 to 18 (Wilf Carder). Come to
  // with Grawl's fleece. Thornwick's spring clip, lying about where its carters stopped by the road west; his old stock on
  // the rise north, laid out flat of a night, and the three tall things that lie on it (taken together); then, with both,
  // on up the road to the Long Queue in the East, past the plague giant halfway ----
  last_clip: { steps: [{ gather: 'lair:carters_halt', n: 4, what: 'fleeces', spots: [[-40, -12], [44, 18], [-14, 45], [30, -38]] }, { back: true, say: "Four of Thornwick's fleeces, from round the carters." }], gold: 37, xp: 375 },
  what_lies_on_it: { steps: [{ kill: 'lair:roadsend_demons', n: 2 }, { back: true, say: 'Two of the three on your rise are down.' }], gold: 38, xp: 380, item: 'scroll' },
  wool_for_the_gate: { needs: ['last_clip', 'what_lies_on_it'], steps: [{ kill: 'lair:marshal_rd_plague', n: 2 }, { talk: 'rollo', say: "Wilf Carder asks if they'll take wool at the gate.", end: true }], gold: 6, xp: 60 },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same). Each hub steps up; each errand on is a
// level above the work it waits for. Kestrel Hide (9 to 11) comes between Thornwick's first work and its last; the
// Players' Wagon (the end of its road) before Mother Grawl's, so the road east is taken last.
export const LEVELS = [
  ['hedge_breakers', 8], ['up_from_the_gallowswood', 8], ['names_in_lead', 8], ['nothing_for_the_pot', 9], ['black_ram', 10], ['the_warlocks_stones', 10], ['old_toll', 11],
  ['what_waits_at_the_bar', 11], ['corpses_nothing', 11], ['the_toll_roost', 12], ['not_coming_back', 13],
  ['salt_for_the_hanged', 13], ['the_big_man', 13], ['the_burning_ground', 14], ['a_light_over_the_cross', 14], ['crowles_jar', 16],
  ['the_candle_road', 14], ['clappers', 14], ['nightfall_ruin', 15], ['the_players_bill', 15],
  ['the_audience', 15], ['poxhollow', 15], ['the_winter_company', 15], ['last_night_of_the_run', 16], ['the_closing_notice', 16],
  ['henbane', 15], ['grawls_kennel', 15], ['under_the_eaves', 16], ['the_wrong_fleece', 17],
  ['last_clip', 17], ['what_lies_on_it', 17], ['wool_for_the_gate', 18],
];
