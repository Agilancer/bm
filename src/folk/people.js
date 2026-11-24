// Who lives in Bellmourn: their bodies, their homes and beds, their work, their ways. (Who they are: tools/folk/cast.md.
// What they say: src/folk/lines/.)
//
// body: a model in assets/game/folk/folk.json (or a recoloured copy of one). home: the house they sleep in (src/folk/town.js
// HOUSES), bed: which of its beds, side: 0/1 where two share. job: the shape of their day (src/folk/brain.js DAYS). work: where.
// walk: their gait (a clip). idles: what they do standing about. trade: what they sell (src/folk/shops.js).

import { REGION_PEOPLE } from './regions/index.js';
import { ROAD } from './road-folk.js';

export const PEOPLE = [
  // The Tolling Bell
  { id: 'bram', name: 'Bram Kettle', title: 'Innkeeper', body: 'bram', sex: 'm', age: 50, home: 'inn', bed: 0, side: 0, job: 'innkeep', work: 'inn_bar', trade: 'inn', walk: 'walk', idles: ['fold_arms', 'idle', 'wait'] },
  { id: 'maudie', name: 'Maudie Kettle', title: 'Cook at the Bell', body: 'wife_jolly', sex: 'f', age: 48, home: 'inn', bed: 0, side: 1, job: 'cook', work: 'inn_hearth', walk: 'walk_ual', idles: ['idle_ual', 'relax', 'talk'] },
  { id: 'nell', name: 'Nell Kettle', title: 'Barmaid', body: 'young_2', sex: 'f', age: 19, home: 'inn', bed: 1, job: 'barmaid', work: 'inn_floor', walk: 'walk', idles: ['fold_arms', 'look_around', 'wait'] },
  { id: 'pip', name: 'Pip Kettle', title: '', body: 'boy_1', sex: 'm', age: 10, home: 'inn', bed: 2, side: 0, job: 'child', walk: 'walk', idles: ['look_around', 'scratch', 'idle'] },
  { id: 'kit', name: 'Kit Kettle', title: '', body: 'kit', sex: 'm', age: 7, home: 'inn', bed: 2, side: 1, job: 'child', walk: 'walk', idles: ['idle', 'look_around'] },
  { id: 'orrin', name: 'Orrin Vey', title: 'Scholar', body: 'sage', sex: 'm', age: 70, home: 'inn', bed: 3, job: 'scholar', work: 'inn_corner', trade: 'scrolls', walk: 'walk_ual', speed: 0.8, idles: ['idle_ual', 'scratch', 'look_around'] },
  // The chandler's
  { id: 'elspeth', name: 'Elspeth Tallow', title: 'Chandler', body: 'crone', sex: 'f', age: 74, home: 'chandler', bed: 0, side: 0, job: 'chandler', work: 'chandler_vats', trade: 'candles', walk: 'walk_ual', speed: 0.75, idles: ['fold_arms_ual', 'idle_ual', 'wait'] },
  { id: 'magda', name: 'Magda Tallow', title: 'Curio Seller', body: 'magda', sex: 'f', age: 74, home: 'chandler', bed: 0, side: 1, job: 'stallkeep', stall: 'curios', trade: 'curios', walk: 'walk_ual', speed: 0.75, idles: ['idle_ual', 'talk', 'relax'] },
  { id: 'wren', name: 'Wren Tallow', title: '', body: 'girl_3', sex: 'f', age: 12, home: 'chandler', bed: 1, job: 'child', work: 'forge', walk: 'walk', idles: ['fold_arms', 'look_around', 'idle'] },
  // The reeve's
  { id: 'corwin', name: 'Corwin Ashby', title: 'Reeve of Bellmourn', body: 'lord_red', sex: 'm', age: 55, home: 'reeve', bed: 1, side: 0, job: 'reeve', work: 'reeve_desk', walk: 'walk_formal', idles: ['fold_arms_ual', 'idle_ual', 'wait'] },
  { id: 'isolde', name: 'Isolde Ashby', title: 'Lady Ashby', body: 'lady_red_busty', sex: 'f', age: 50, home: 'reeve', bed: 1, side: 1, job: 'lady', walk: 'walk_proud', armOut: 0.12, idles: ['idle_ual', 'fold_arms_ual'] },
  { id: 'cedric', name: 'Cedric Ashby', title: '', body: 'youth_red', sex: 'm', age: 22, home: 'reeve', bed: 2, job: 'noble', walk: 'swagger', idles: ['fold_arms', 'look_around', 'idle'] },
  { id: 'rosalind', name: 'Rosalind Ashby', title: '', body: 'lady_red_1', sex: 'f', age: 20, home: 'reeve', bed: 0, side: 0, job: 'lady', walk: 'walk_formal', armOut: 0.08, idles: ['idle', 'relax', 'look_around'] },
  { id: 'seraphine', name: 'Seraphine Ashby', title: '', body: 'lady_red_3', sex: 'f', age: 18, home: 'reeve', bed: 0, side: 1, job: 'lady', walk: 'walk_formal', armOut: 0.08, idles: ['idle_ual', 'wait'] },
  { id: 'juliana', name: 'Juliana Ashby', title: '', body: 'lady_red_2', sex: 'f', age: 16, home: 'reeve', bed: 3, job: 'lady', walk: 'walk', armOut: 0.08, idles: ['fold_arms', 'look_around', 'scratch'] },
  // Halloway House
  { id: 'edric', name: 'Edric Halloway', title: 'Lord Halloway', body: 'lord_blue', sex: 'm', age: 58, home: 'halloway', bed: 0, side: 0, job: 'lord', walk: 'walk_formal', idles: ['idle_ual', 'fold_arms_ual'] },
  { id: 'margery', name: 'Margery Halloway', title: 'Lady Halloway', body: 'dame_blue', sex: 'f', age: 55, home: 'halloway', bed: 0, side: 1, job: 'lady', walk: 'walk_formal', armOut: 0.1, speed: 0.85, idles: ['idle_ual', 'relax'] },
  { id: 'elowen', name: 'Elowen Halloway', title: '', body: 'lady_blue', sex: 'f', age: 21, home: 'halloway', bed: 1, job: 'teacher', walk: 'walk', armOut: 0.1, idles: ['idle', 'relax', 'look_around'] },
  { id: 'tobias', name: 'Tobias Halloway', title: '', body: 'youth_blue', sex: 'm', age: 17, home: 'halloway', bed: 2, job: 'squire', walk: 'walk', idles: ['idle', 'look_around', 'warm_up'] },
  // The watch
  { id: 'aldric', name: 'Ser Aldric Halloway', title: 'Captain of the Watch', body: 'knight_blue', sex: 'm', age: 52, home: 'tower', bed: 0, job: 'captain', walk: 'walk_formal', idles: ['fold_arms_ual', 'idle_ual', 'look_around'] },
  { id: 'jory', name: 'Jory Pell', title: 'Night Watchman', body: 'jory', sex: 'm', age: 66, home: 'tower', bed: 1, job: 'watchman', walk: 'walk_ual', speed: 0.8, idles: ['lantern', 'look_around', 'scratch'] },
  // The south cottage
  { id: 'hob', name: 'Hob Fenwick', title: 'Farmer', body: 'dude', sex: 'm', age: 30, home: 'cottage', bed: 0, side: 0, job: 'farmer', work: 'fields', walk: 'walk', idles: ['idle', 'scratch', 'fold_arms'] },
  { id: 'bess', name: 'Bess Fenwick', title: 'Farmer', body: 'young_3', sex: 'f', age: 28, home: 'cottage', bed: 0, side: 1, job: 'farmwife', work: 'fields', walk: 'walk', idles: ['idle', 'fold_arms', 'look_around'] },
  { id: 'tilly', name: 'Tilly Fenwick', title: '', body: 'girl_1', sex: 'f', age: 9, home: 'cottage', bed: 1, side: 0, job: 'child', walk: 'walk', idles: ['idle', 'look_around'] },
  { id: 'tam', name: 'Tam Fenwick', title: '', body: 'boy_2', sex: 'm', age: 6, home: 'cottage', bed: 1, side: 1, job: 'child', walk: 'walk', idles: ['idle', 'scratch'] },
  { id: 'dob', name: 'Dob Fenwick', title: 'Farmer', body: 'dob', sex: 'm', age: 30, home: 'barn', bed: 1, job: 'farmer', work: 'fields', walk: 'walk', idles: ['look_around', 'idle', 'scratch'] },
  // The smithy
  { id: 'homunculus', name: 'Homunculus the Proud', title: 'Blacksmith', body: 'smith', sex: 'm', age: 45, home: 'smith', bed: 0, job: 'smith', work: 'forge', trade: 'staffs', walk: 'walk_proud', armOut: 0.06, idles: ['fold_arms_ual', 'idle_ual'] },
  { id: 'dusty', name: 'Dunstan Bray', title: 'Apprentice Smith', body: 'boy_3', sex: 'm', age: 14, home: 'smith', bed: 1, job: 'apprentice', work: 'forge', walk: 'walk', idles: ['fold_arms', 'idle', 'scratch'] },
  // The alehouse
  { id: 'hilde', name: 'Hilde Brewer', title: 'Alewife', body: 'wife_big', sex: 'f', age: 45, home: 'alewife', bed: 0, side: 0, job: 'stallkeep', stall: 'ale', trade: 'ale', walk: 'walk_ual', armOut: 0.1, idles: ['relax', 'idle_ual', 'talk'] },
  { id: 'lily', name: 'Lily Brewer', title: '', body: 'girl_lily', sex: 'f', age: 7, home: 'alewife', bed: 0, side: 1, job: 'child', walk: 'walk', idles: ['idle', 'look_around'] },
  { id: 'ivy', name: 'Ivy Thatch', title: 'Alewife', body: 'young_5', sex: 'f', age: 24, home: 'alewife', bed: 1, job: 'brewer', work: 'alewife_vats', trade: 'ale', walk: 'walk', idles: ['fold_arms', 'idle', 'wait'] },
  // The tithe barn
  { id: 'garth', name: 'Garth Underhill', title: 'Tithe-man', body: 'worker_2', sex: 'm', age: 40, home: 'barn', bed: 0, job: 'labourer', work: 'barn', walk: 'walk_ual', idles: ['idle_ual', 'scratch', 'wait'] },
  // The tannery
  { id: 'wes', name: 'Wes Harrow', title: 'Tanner', body: 'wes', sex: 'm', age: 50, home: 'tannery', bed: 0, job: 'tanner', work: 'tannery_vats', walk: 'walk_ual', idles: ['fold_arms_ual', 'idle_ual'] },
  // The weaver's
  { id: 'tamsin', name: 'Tamsin Reed', title: 'Tailor', body: 'redhead', sex: 'f', age: 32, home: 'weaver', bed: 0, job: 'tailor', work: 'loom', stall: 'cloth', trade: 'robes', walk: 'walk', idles: ['fold_arms', 'idle', 'look_around'] },
  { id: 'wenna', name: 'Wenna Reed', title: 'Dyer', body: 'young_4', sex: 'f', age: 26, home: 'weaver', bed: 1, job: 'dyer', work: 'dye_vats', walk: 'walk', idles: ['relax', 'idle', 'look_around'] },
  // The hunter's lodge
  { id: 'corran', name: 'Corran Thrale', title: 'Hunter', body: 'worker', sex: 'm', age: 40, home: 'hunter', bed: 0, job: 'hunter', work: 'woodpile', walk: 'walk', idles: ['look_around', 'fold_arms', 'idle'] },
  // The coffin maker's
  { id: 'silas', name: 'Silas Crane', title: 'Undertaker', body: 'silas', sex: 'm', age: 68, home: 'coffins', bed: 0, job: 'undertaker', work: 'coffin_yard', trade: 'skulls', walk: 'walk_ual', speed: 0.8, idles: ['idle_ual', 'fold_arms_ual', 'scratch'] },
  // The bakehouse
  { id: 'agnes', name: 'Agnes Bramble', title: 'Baker', body: 'worker_f', sex: 'f', age: 38, home: 'bakery', bed: 0, job: 'baker', work: 'oven', stall: 'bread', trade: 'bread', walk: 'walk', idles: ['idle', 'fold_arms', 'relax'] },
  { id: 'hal', name: 'Hal Bramble', title: '', body: 'hal', sex: 'm', age: 10, home: 'bakery', bed: 1, job: 'child', walk: 'walk', idles: ['idle', 'look_around', 'warm_up'] },
  // The herbalist's
  { id: 'sabine', name: 'Sabine Moss', title: 'Herbalist', body: 'young_1', sex: 'f', age: 34, home: 'herbalist', bed: 0, job: 'herbalist', work: 'herb_garden', trade: 'healing', walk: 'walk', idles: ['idle', 'fold_arms', 'look_around'] },
  { id: 'bryony', name: 'Bryony Moss', title: '', body: 'bryony', sex: 'f', age: 8, home: 'herbalist', bed: 1, job: 'child', walk: 'walk', idles: ['crouch', 'idle', 'look_around'] },
];

// Posted out in the land: villagers of the small towns and the forts (src/core/lands.js SITES), in the townsfolk's own bodies
// and on the town's own thread, but with no house, bed or day: each stands at their post, at the land's own height, day and
// night, and turns to whoever comes up (job 'posted': src/folk/brain.js). post: [x, z] (and y, if they stand on something
// built); face: which way they look when nobody's by. They come after the town's people in the folk buffer, so there's room
// for FOLK_MAX - PEOPLE.length of them (src/folk/layout.js). Who they are: tools/folk/cast.md, "The small towns".
// What they say and the work they give: src/folk/lines/land.js.
const posted = (p) => ({ job: 'posted', walk: 'walk', ...p });
export const POSTED = [
  // Thornwick, on the Gallows Road where the downs run out.
  posted({ id: 'dorcas', name: 'Dorcas Pym', title: 'Keeper of the Hare and Harrow, Thornwick', body: 'dorcas', sex: 'f', age: 57, post: [2393.7, 1806.3], face: 2.356, idles: ['fold_arms_ual', 'idle_ual', 'wait'] }),
  posted({ id: 'osric', name: 'Osric Thorne', title: 'Hedge-reeve of Thornwick', body: 'osric', sex: 'm', age: 44, post: [2369.6, 1776.6], face: 0.785, idles: ['look_around', 'fold_arms', 'idle'] }),
  posted({ id: 'wymond', name: 'Wymond Ebb', title: 'Hedge-priest', body: 'wymond', sex: 'm', age: 63, post: [2408, 1791], face: -0.785, speed: 0.8, idles: ['idle_ual', 'scratch', 'look_around'] }),
  // Cinderford, on the Vigil Road: the last free hearths before the Ashen Waste.
  posted({ id: 'hasket', name: 'Brenna Hasket', title: 'Sergeant of the Cinderford Watch', body: 'hasket', sex: 'f', age: 39, post: [-2129, -201.5], face: 1.571, idles: ['fold_arms', 'look_around', 'wait'] }),
  posted({ id: 'colm', name: 'Colm Burrage', title: 'Charcoal Burner', body: 'colm', sex: 'm', age: 52, post: [-2098, -229], face: 0, idles: ['idle_ual', 'scratch', 'fold_arms_ual'] }),
  posted({ id: 'ysolt', name: 'Ysolt Marrow', title: 'Out of Khel', body: 'ysolt', sex: 'f', age: 27, post: [-2067, -180], face: 3.142, idles: ['idle', 'look_around', 'wait'] }),
  // Frostwatch, the old watch-fort in the Rimeholt Fells.
  posted({ id: 'garrick', name: 'Hew Garrick', title: 'Warden of Frostwatch', body: 'garrick', sex: 'm', age: 48, post: [690, 3899], face: 1.571, idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  // City State Phobos's three hubs (src/core/phobos-hubs.js): in each yard, a few steps in from the gate (hubPost), whoever
  // has work for you there. Their quests: src/folk/phobos-quests.js; their words: src/folk/lines/phobos-hubs.js.
  posted({ id: 'ph_penny', hub: 'pennyless', name: 'Fennick Lowe', title: "the Pennyless' Purse", body: 'ph_penny', sex: 'm', age: 46, post: [9613.8, -288.9], face: -2.415, idles: ['fold_arms', 'look_around', 'idle'] }),
  posted({ id: 'ph_watch', hub: 'watch', name: 'Maud Treller', title: 'Captain of the Quiet Watch', body: 'ph_watch', sex: 'f', age: 41, post: [10005.9, 631.2], face: -2.406, idles: ['fold_arms', 'wait', 'look_around'] }),
  // Down Phobos's sewers (src/core/delve-sewers.js): the two keepers in their office off the Great Grate in the West Drains,
  // and Princess Apricot in her Sunk Garden at the far end of the High Conduits. Stood on the delves' own floors (post's y),
  // seen only from down there (src/gfx/folk.js). Their words: src/folk/lines/phobos-sewers.js.
  posted({ id: 'martleboro', sewer: 'westdrains', name: 'Martleboro', title: 'Keeper of the Drains', body: 'martleboro', sex: 'm', age: 44, post: [9291.6, -5843, -73], face: -1.571, idles: ['fold_arms', 'look_around', 'idle'] }),
  posted({ id: 'louis_g', sewer: 'westdrains', name: 'Louis G', title: 'Keeper of the Far Drains', body: 'louis_g', sex: 'm', age: 41, post: [9286.5, -5849, -73], face: -0.983, idles: ['look_around', 'scratch', 'idle'] }),
  posted({ id: 'apricot', sewer: 'highconduits', name: 'Princess Apricot', title: 'of the Sunk Garden', body: 'apricot', sex: 'f', age: 26, post: [10406, -6044.5, -63], face: 0, idles: ['idle', 'look_around', 'fold_arms'] }),
  // Castle Velscour's Middle Ward (src/core/delve-castle.js): the Librarian and his household in his rooms off the Ancient
  // Library. All five loyal to Tessariel, and nothing of it shows: they wear what his castle's own people wear (the V and T
  // rule). Seen only from down there, like the keepers; their bodies loaded only once you're on your way to Phobos (late,
  // as the crowd's: src/gfx/folk.js). Their words: src/folk/lines/phobos-castle.js.
  posted({ id: 'ph_librarian', delve: 'middleward', late: true, name: 'Master Aldric Pell', title: 'Librarian of the Castle', body: 'ph_librarian', sex: 'm', age: 71, post: [11223.4, -5858.8, -60], face: -2.36, speed: 0.75, idles: ['idle', 'look_around', 'fold_arms'] }),
  posted({ id: 'ph_wynn', delve: 'middleward', late: true, name: 'Wynn Pell', title: "the Librarian's ward, map-maker", body: 'ph_wynn', sex: 'f', age: 19, post: [11226, -5861, -60], face: -2.0, idles: ['look_around', 'idle', 'fold_arms'] }),
  posted({ id: 'ph_ondine', delve: 'middleward', late: true, name: 'Ondine', title: 'once a sister of his Sanctuaries', body: 'ph_ondine', sex: 'f', age: 58, post: [11229.5, -5858, -60], face: -2.4, idles: ['fold_arms', 'idle', 'wait'] }),
  posted({ id: 'ph_jory', delve: 'middleward', late: true, name: 'Jory Tallis', title: 'once quartermaster of the Armoury', body: 'ph_jory', sex: 'm', age: 66, post: [11218.5, -5863.6, -60], face: 1.29, speed: 0.8, idles: ['fold_arms', 'scratch', 'idle'] }),
  posted({ id: 'ph_pip', delve: 'middleward', late: true, name: 'Pip Carrow', title: 'horn-blower of the Galleries', body: 'ph_pip', sex: 'm', age: 12, post: [11227.5, -5865.5, -60], face: -0.79, idles: ['look_around', 'idle', 'wait'] }),
  // Pell's Holdout, down the Deep Stacks behind the Librarian's bookcase (src/core/delve-highward.js): the people he's hidden
  // for forty years, and the roof-runners in the Gargoyles' Roost up in the High Ward. Loyal to Tessariel, the Holdout's, and
  // nothing of it shows or is said (the V and T rule); the roof-runners are loyal to their own pockets. Late, as the
  // household is. Their words: src/folk/lines/phobos-more-castle.js.
  posted({ id: 'ho_vane', delve: 'deepstacks', late: true, name: 'Hesper Vane', title: "once a knight of his garrison, the Holdout's door", body: 'veteran', sex: 'f', age: 41, post: [12499.8, -5779.4, -72], face: 1.3, idles: ['fold_arms', 'idle', 'look_around'] }),
  posted({ id: 'ho_coyle', delve: 'deepstacks', late: true, name: 'Mother Coyle', title: "the Holdout's cook", body: 'taverncook', sex: 'f', age: 63, post: [12490.4, -5766.6, -72], face: 2.8, idles: ['idle', 'scratch', 'fold_arms'] }),
  posted({ id: 'ho_thole', delve: 'deepstacks', late: true, name: 'Garrick Thole', title: 'an armourer who walked out of the Forge', body: 'armourer', sex: 'm', age: 52, post: [12498, -5782, -72], face: -0.9, idles: ['fold_arms', 'idle', 'scratch'] }),
  posted({ id: 'ho_marrow', delve: 'deepstacks', late: true, name: 'Ivo Marrow', title: 'a copyist', body: 'bookbinder', sex: 'm', age: 34, post: [12493.6, -5768.1, -72], face: 3.0, idles: ['idle', 'look_around', 'scratch'] }),
  posted({ id: 'ho_nettle', delve: 'deepstacks', late: true, name: 'Old Nettle', title: 'buys and sells what the castle loses', body: 'pawnbroker', sex: 'f', age: 77, post: [12475.3, -5779.6, -72], face: 1.57, speed: 0.7, idles: ['idle', 'fold_arms', 'wait'] }),
  posted({ id: 'ho_bet', delve: 'deepstacks', late: true, name: 'Little Bet', title: 'born down here', body: 'girl_1', sex: 'f', age: 9, post: [12486, -5810.4, -72], face: 0, idles: ['look_around', 'idle', 'wait'] }),
  posted({ id: 'ho_dace', delve: 'deepstacks', late: true, name: 'Old Dace', title: 'a ferryman, once', body: 'ferryman', sex: 'm', age: 70, post: [12497.4, -5767.6, -72], face: -2.2, speed: 0.7, idles: ['idle', 'scratch', 'wait'] }),
  posted({ id: 'ho_ilse', delve: 'deepstacks', late: true, name: 'Ilse Brand', title: 'out of the Rookeries', body: 'washerwoman', sex: 'f', age: 36, post: [12483.4, -5781.6, -72], face: 0.3, idles: ['idle', 'look_around', 'fold_arms'] }),
  posted({ id: 'ho_quill', delve: 'deepstacks', late: true, name: 'Master Ferris Quill', title: "once tutor to his court's children", body: 'tutor', sex: 'm', age: 55, post: [12477.6, -5771.4, -72], face: 1.9, idles: ['fold_arms', 'idle', 'look_around'] }),
  posted({ id: 'ho_corry', delve: 'deepstacks', late: true, name: 'Corry', title: 'not at his lessons', body: 'boy_2', sex: 'm', age: 11, post: [12485.6, -5775.6, -72], face: 1.0, idles: ['look_around', 'scratch', 'idle'] }),
  posted({ id: 'ho_wren', delve: 'highward', late: true, name: 'Sable Wren', title: 'a roof-runner', body: 'cutpurse', sex: 'f', age: 27, post: [12031.6, -5830.6, -60], face: 1.2, idles: ['look_around', 'fold_arms', 'idle'] }),
  posted({ id: 'ho_rook', delve: 'highward', late: true, name: 'Dunmore Rook', title: "keeps the roof-runners' ledger", body: 'graverobber', sex: 'm', age: 58, post: [12025, -5823.4, -60], face: 2.0, speed: 0.8, idles: ['scratch', 'idle', 'fold_arms'] }),
  // The castle's own (the owner, 2026-11-19: "creatures that might inhabit Velscour's keep/castle"), his servants in his
  // wards, late as the household is: the steward in the West Range, the torturer in the Oubliettes, the ghoul scullion in
  // the Kitchens; the bone butler in the Great Hall, the imp page in the Gallery, the archive's blind ghost in the Stacks,
  // a hellguard and a priestess of the Keep in the Middle Court. Their words: src/folk/lines/crowd/part6.js.
  posted({ id: 'cs_steward', delve: 'lowerward', late: true, name: 'Steward Malgrave', title: "the castle's steward", body: 'demonsteward', sex: 'm', age: 300, post: [10700, -5741, -60], face: 1.57, walk: 'walk_proud', idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  posted({ id: 'cs_torturer', delve: 'lowerward', late: true, name: 'the Quiet Man', title: 'the torturer of the Oubliettes', body: 'torturer', sex: 'm', age: 45, post: [10775, -5828, -70], face: -1.57, idles: ['fold_arms', 'idle', 'scratch'] }),
  posted({ id: 'cs_ghoul', delve: 'lowerward', late: true, name: 'Grue', title: 'a ghoul scullion', body: 'ghoulscullion', sex: 'f', age: 90, post: [10654, -5758, -60], face: 0, idles: ['scratch', 'idle', 'look_around'] }),
  posted({ id: 'cs_butler', delve: 'middleward', late: true, name: 'Hollowell', title: 'the bone butler', body: 'bonebutler', sex: 'm', age: 200, post: [11090, -5750, -60], face: 1.57, walk: 'walk_formal', idles: ['idle', 'wait', 'bow'] }),
  posted({ id: 'cs_imp', delve: 'middleward', late: true, name: 'Snick', title: 'an imp page', body: 'imppage', sex: 'm', age: 60, post: [11192, -5786, -60], face: 3.14, idles: ['look_around', 'scratch', 'laugh'] }),
  posted({ id: 'cs_archivist', delve: 'middleward', late: true, name: 'Archivist Thorne', title: "the archive's blind ghost", body: 'archivistghost', sex: 'm', age: 400, post: [11174, -5888, -60], face: 0, speed: 0.5, idles: ['idle_ual', 'depressed', 'look_around'] }),
  posted({ id: 'cs_hellguard', delve: 'middleward', late: true, name: 'Vargoth', title: 'a hellguard of the Keep', body: 'hellguard', sex: 'm', age: 500, post: [11162, -5736, -60], face: 1.57, walk: 'walk_proud', idles: ['fold_arms', 'idle', 'look_around'] }),
  posted({ id: 'cs_priestess', delve: 'middleward', late: true, name: 'Mother Severine', title: 'a priestess of the Keep', body: 'keeppriestess', sex: 'f', age: 41, post: [11198, -5766, -60], face: -1.57, walk: 'walk_proud', idles: ['idle_ual', 'fold_arms_ual', 'look_around'] }),
  posted({ id: 'ph_ash', hub: 'ash', name: 'Edda Grail', title: 'Warden of the Ashwardens', body: 'ph_ash', sex: 'f', age: 52, post: [10059.7, -551.4], face: -3.11, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  // On the Sill, by its seal, where Lisandra's door sets you down on your first visit to Phobos's country (src/folk/first-visit.js):
  // Wenna Coyle, who keeps the lamps on the way down to the city, and was Lisandra's apprentice once. Late, as the castle's
  // people are: her body's loaded once you're on your way there. Her words: src/folk/lines/first-visit.js.
  posted({ id: 'fv_wenna', firstVisit: true, late: true, name: 'Wenna Coyle', title: "keeper of the Sill's lamps", body: 'fv_wenna', sex: 'f', age: 61, post: [8946.5, 7.5], face: -1.75, speed: 0.8, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
];
// City State Phobos's street crowd: ruffians, riff-raff and adventurer folk, on the town's own thread with no house, bed or
// day (job 'roam': src/folk/brain.js). They're only up while you're inside the city's wall, and then they're about the
// streets near you, wherever the dead and Velscour's Loyal don't keep (src/core/east.js HAUNTS): walking, standing about,
// stopping two together to talk; anyone left far behind you turns up again somewhere ahead. kind: their lines
// (src/folk/lines/phobos.js). Bodies: the townsfolk's, recoloured (tools/phobos/crowd_swaps.py), and a few of the posted
// people's. The first CROWD_LEAN of them are all a phone has.
const roam = (p) => ({ job: 'roam', crowd: true, walk: 'walk', ...p });
export const CROWD = [
  roam({ id: 'ph_nib', area: 'rookeries', name: 'Nib Scarrow', title: 'a cutpurse', kind: 'cutpurse', body: 'ph_cut', sex: 'm', age: 24, speed: 1.05, idles: ['look_around', 'wait', 'scratch'] }),
  roam({ id: 'ph_brannick', area: 'barracks', name: 'Brannick of Nowhere', title: 'a sellsword', kind: 'sellsword', body: 'ph_sword', sex: 'm', age: 38, walk: 'swagger', idles: ['fold_arms', 'idle', 'look_around'] }),
  roam({ id: 'ph_tolly', area: 'rookeries', name: 'Old Tolly', title: 'a drunk', kind: 'drunk', body: 'ph_drunk', sex: 'm', age: 55, walk: 'walk_ual', speed: 0.6, idles: ['depressed', 'laugh', 'idle_ual'] }),
  roam({ id: 'ph_mason', area: 'market', name: 'Grey Aldo', title: 'a beggar', kind: 'beggar', body: 'ph_beggar', sex: 'm', age: 71, walk: 'walk_ual', speed: 0.55, still: 0.8, idles: ['depressed', 'wait', 'idle_ual'] }),
  roam({ id: 'ph_jask', area: 'rookeries', name: 'Jask Two-Bones', title: 'a dicer', kind: 'dicer', body: 'ph_dicer', sex: 'm', age: 31, idles: ['laugh', 'complain', 'idle'] }),
  roam({ id: 'ph_quill', area: 'rookeries', name: 'Mother Quill', title: 'a fence', kind: 'fence', body: 'ph_fence', sex: 'm', age: 60, walk: 'walk_ual', speed: 0.8, still: 0.6, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_rook', area: 'approach', name: 'Rook Bastable', title: 'a delver', kind: 'delver', body: 'ph_delver', sex: 'm', age: 29, idles: ['look_around', 'fold_arms', 'warm_up'] }),
  roam({ id: 'ph_vane', area: 'bones', name: 'Ser Nobody Vane', title: 'a demon hunter', kind: 'hunter', body: 'ph_hunter', sex: 'm', age: 44, walk: 'walk_proud', idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  roam({ id: 'ph_mag', area: 'market', name: 'Mag Ninefingers', title: 'a fortune-teller', kind: 'fortune', body: 'ph_crone', sex: 'f', age: 69, walk: 'walk_ual', speed: 0.7, still: 0.7, idles: ['idle_ual', 'talk', 'wait'] }),
  roam({ id: 'ph_bess', area: 'rookeries', name: 'Red Bess', title: 'of the Gutted Lamb', kind: 'tavern', body: 'ph_doxy', sex: 'f', age: 23, idles: ['relax', 'laugh', 'wave'] }),
  roam({ id: 'ph_hettie', area: 'wharf', name: 'Hettie Drain', title: 'a rat-catcher', kind: 'ratcatcher', body: 'ph_rat', sex: 'f', age: 37, idles: ['scratch', 'idle', 'look_around'] }),
  roam({ id: 'ph_pim', area: 'market', name: 'Pim', title: 'a street urchin', kind: 'urchin', body: 'ph_urchin', sex: 'm', age: 11, speed: 1.15, idles: ['look_around', 'scratch', 'idle'] }),
  roam({ id: 'ph_corve', area: 'approach', name: 'Corve Ashlock', title: 'a delver', kind: 'delver', body: 'corve_b', sex: 'm', age: 47, idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  roam({ id: 'ph_wulf', area: 'barbican', name: 'Wulfram the Bent', title: 'a sellsword', kind: 'sellsword', body: 'wulf_b', sex: 'm', age: 50, walk: 'swagger', idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_sorrel', area: 'market', name: 'Sorrel Vey', title: 'a cutpurse', kind: 'cutpurse', body: 'sorrel_b', sex: 'f', age: 22, speed: 1.05, idles: ['look_around', 'wait', 'idle'] }),
  roam({ id: 'ph_abel', area: 'bones', name: 'Brother Abel', title: 'a defrocked priest', kind: 'drunk', body: 'abel_b', sex: 'm', age: 64, walk: 'walk_ual', speed: 0.65, idles: ['depressed', 'idle_ual', 'scratch'] }),
  roam({ id: 'ph_greta', area: 'bones', name: 'Greta Hask', title: 'a demon hunter', kind: 'hunter', body: 'greta_b', sex: 'f', age: 41, idles: ['fold_arms', 'look_around', 'wait'] }),
  roam({ id: 'ph_osk', area: 'market', name: 'Osk the Tout', title: 'a dicer', kind: 'dicer', body: 'osk_b', sex: 'm', age: 35, idles: ['talk', 'laugh', 'look_around'] }),
  roam({ id: 'ph_cob', area: 'tanners', name: 'Cob Mallet', title: 'a bravo', kind: 'ruffian', body: 'ph_bravo', sex: 'm', age: 33, walk: 'swagger', idles: ['fold_arms', 'look_around', 'angry'] }),
  roam({ id: 'ph_merrin', area: 'cinder', name: 'Knuckles Merrin', title: 'a ruffian', kind: 'ruffian', body: 'ph_knuckle', sex: 'm', age: 26, walk: 'swagger', idles: ['fold_arms', 'laugh', 'look_around'] }),
  roam({ id: 'ph_lark', area: 'barbican', name: 'Lark Tamsey', title: 'a delver', kind: 'delver', body: 'ph_lark', sex: 'f', age: 27, idles: ['look_around', 'fold_arms', 'warm_up'] }),
  roam({ id: 'ph_harl', area: 'dukes', name: 'Big Harl', title: 'a hired brute', kind: 'sellsword', body: 'ph_brute', sex: 'm', age: 36, walk: 'walk_proud', speed: 0.9, idles: ['fold_arms', 'idle', 'scratch'] }),
  roam({ id: 'ph_wenna', area: 'rookeries', name: 'Wenna Glass', title: 'of the Gutted Lamb', kind: 'tavern', body: 'ph_glass', sex: 'f', age: 25, idles: ['relax', 'laugh', 'wait'] }),
  roam({ id: 'ph_tib', area: 'wharf', name: 'Tib', title: 'a street girl', kind: 'urchin', body: 'ph_tib', sex: 'f', age: 10, speed: 1.15, idles: ['look_around', 'idle', 'scratch'] }),
  // (The people who live here, made on Meshy, 2026-11-19: tools/phobos/residents.json, their bodies their own.)
  roam({ id: 'ph_soot', area: 'cinder', name: 'Wick Hollis', title: 'a chimney sweep', kind: 'sweep', body: 'sweep', sex: 'm', age: 15, speed: 1.1, idles: ['scratch', 'look_around', 'idle'] }),
  roam({ id: 'ph_mog', area: 'wharf', name: 'Mog Sallow', title: 'a fishwife', kind: 'fishwife', body: 'fishwife', sex: 'f', age: 51, walk: 'walk_ual', speed: 0.85, idles: ['fold_arms_ual', 'complain', 'idle_ual'] }),
  roam({ id: 'ph_osric_bone', area: 'bones', name: 'Old Fenwick', title: 'a bone-carver', kind: 'bonecarver', body: 'bonecarver', sex: 'm', age: 72, walk: 'walk_ual', speed: 0.6, still: 0.6, idles: ['idle_ual', 'depressed', 'look_around'] }),
  roam({ id: 'ph_hesk', area: 'tanners', name: 'Hesk Marrow', title: 'a tanner', kind: 'tanner', body: 'tanner', sex: 'f', age: 35, idles: ['fold_arms', 'idle', 'look_around'] }),
  roam({ id: 'ph_garrow', area: 'approach', name: 'Garrow Teague', title: 'of the night watch', kind: 'watchman', body: 'watchman', sex: 'm', age: 41, walk: 'walk_proud', speed: 0.85, idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  roam({ id: 'ph_nan', area: 'tanners', name: 'Nan Tatters', title: 'a rag-and-bone woman', kind: 'ragwoman', body: 'ragwoman', sex: 'f', age: 76, walk: 'walk_ual', speed: 0.5, still: 0.7, idles: ['depressed', 'idle_ual', 'scratch'] }),
  roam({ id: 'ph_quick', area: 'market', name: 'Quick Dell', title: 'a cutpurse', kind: 'cutpurse', body: 'cutpurse', sex: 'm', age: 20, speed: 1.1, idles: ['look_around', 'wait', 'idle'] }),
  roam({ id: 'ph_brann', area: 'cinder', name: 'Brann Cinder', title: 'a smelter', kind: 'smelter', body: 'smelter', sex: 'm', age: 45, walk: 'swagger', speed: 0.9, idles: ['fold_arms', 'warm_up', 'idle'] }),
  roam({ id: 'ph_gall', area: 'mages', name: 'Mother Gall', title: 'an apothecary', kind: 'apothecary', body: 'apothecary', sex: 'f', age: 50, walk: 'walk_ual', speed: 0.8, idles: ['idle_ual', 'look_around', 'fold_arms_ual'] }),
  roam({ id: 'ph_orme', area: 'dukes', name: 'Master Orme', title: 'a merchant of Dukes\' Row', kind: 'merchant', body: 'merchant', sex: 'm', age: 56, walk: 'walk_proud', speed: 0.7, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  // (And thirty more, 2026-11-19: the people who keep the city going.)
  roam({ id: 'ph_bun', area: 'market', name: 'Dora Kettlewick', title: 'a baker', kind: 'baker', body: 'baker', sex: 'f', age: 46, walk: 'walk_ual', speed: 0.85, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_cleaver', area: 'market', name: 'Hob Gristle', title: 'a butcher', kind: 'butcher', body: 'butcher', sex: 'm', age: 51, walk: 'swagger', speed: 0.85, idles: ['fold_arms', 'idle', 'scratch'] }),
  roam({ id: 'ph_spade', area: 'bones', name: 'Old Mallow', title: 'a gravedigger', kind: 'gravedigger', body: 'gravedigger', sex: 'm', age: 62, walk: 'walk_ual', speed: 0.6, idles: ['depressed', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_wick', area: 'approach', name: 'Tamsin Lowe', title: 'the lamplighter', kind: 'lamplighter', body: 'lamplighter', sex: 'm', age: 35, walk: 'walk', speed: 1.0, idles: ['look_around', 'idle', 'wait'] }),
  roam({ id: 'ph_suds', area: 'wharf', name: 'Bet Rinsewater', title: 'a washerwoman', kind: 'washer', body: 'washerwoman', sex: 'f', age: 41, walk: 'walk_ual', speed: 0.8, idles: ['complain', 'idle_ual', 'fold_arms_ual'] }),
  roam({ id: 'ph_oar', area: 'wharf', name: 'Grey Abelard', title: 'the ferryman', kind: 'ferryman', body: 'ferryman', sex: 'm', age: 66, walk: 'walk_ual', speed: 0.6, idles: ['idle_ual', 'look_around', 'depressed'] }),
  roam({ id: 'ph_beak', area: 'rookeries', name: 'the Beaked Doctor', title: 'a plague doctor', kind: 'plaguedoctor', body: 'plaguedoctor', sex: 'm', age: 44, walk: 'walk_proud', speed: 0.8, idles: ['look_around', 'fold_arms_ual', 'idle_ual'] }),
  roam({ id: 'ph_whet', area: 'cinder', name: 'Sparky Nell', title: 'a knife-grinder', kind: 'grinder', body: 'grinder', sex: 'm', age: 40, walk: 'walk', speed: 1.0, idles: ['scratch', 'look_around', 'idle'] }),
  roam({ id: 'ph_tallow', area: 'cinder', name: 'Widow Sorrow', title: 'a candle-maker', kind: 'chandler', body: 'chandler', sex: 'f', age: 52, walk: 'walk_ual', speed: 0.75, idles: ['idle_ual', 'fold_arms_ual', 'look_around'] }),
  roam({ id: 'ph_chisel', area: 'barracks', name: 'Aldous Flint', title: 'a stonemason', kind: 'mason', body: 'mason', sex: 'm', age: 46, walk: 'walk', speed: 0.9, idles: ['fold_arms', 'idle', 'warm_up'] }),
  roam({ id: 'ph_rope', area: 'wharf', name: 'Big Ysa', title: 'a dockhand', kind: 'dockhand', body: 'dockhand', sex: 'f', age: 30, walk: 'swagger', speed: 0.95, idles: ['fold_arms', 'laugh', 'idle'] }),
  roam({ id: 'ph_yoke', area: 'wharf', name: 'Coll Bentback', title: 'a porter', kind: 'dockhand', body: 'porter', sex: 'm', age: 36, walk: 'walk_ual', speed: 0.85, idles: ['idle_ual', 'scratch', 'depressed'] }),
  roam({ id: 'ph_ledger', area: 'dukes', name: 'Master Quist', title: 'a moneylender', kind: 'moneylender', body: 'moneylender', sex: 'm', age: 61, walk: 'walk_ual', speed: 0.65, idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  roam({ id: 'ph_vey', area: 'approach', name: 'Sister Vey', title: 'an acolyte of the Keep', kind: 'acolyte', body: 'acolyte', sex: 'f', age: 22, walk: 'walk_proud', speed: 0.8, idles: ['idle_ual', 'look_around', 'wait'] }),
  roam({ id: 'ph_veil', area: 'bones', name: 'Mother Hollow', title: 'a hired mourner', kind: 'mourner', body: 'mourner', sex: 'f', age: 42, walk: 'walk_ual', speed: 0.6, idles: ['depressed', 'idle_ual', 'wait'] }),
  roam({ id: 'ph_patch', area: 'barracks', name: 'One-Eye Garrett', title: 'an old soldier', kind: 'veteran', body: 'veteran', sex: 'm', age: 61, walk: 'walk_ual', speed: 0.7, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_woad', area: 'tanners', name: 'Indra Vatt', title: 'a dyer', kind: 'dyer', body: 'dyer', sex: 'f', age: 36, walk: 'walk', speed: 0.9, idles: ['scratch', 'idle', 'fold_arms'] }),
  roam({ id: 'ph_loom', area: 'tanners', name: 'Pell Threadwell', title: 'a weaver', kind: 'weaver', body: 'weaver', sex: 'f', age: 31, walk: 'walk', speed: 0.85, idles: ['idle', 'look_around', 'wait'] }),
  roam({ id: 'ph_tap', area: 'rookeries', name: 'Fat Jory Crane', title: 'of the Gutted Lamb', kind: 'tavern', body: 'innkeeper', sex: 'm', age: 50, walk: 'walk_ual', speed: 0.8, idles: ['laugh', 'fold_arms_ual', 'idle_ual'] }),
  roam({ id: 'ph_lady', area: 'dukes', name: 'Lady Morwenna Vasque', title: 'of Dukes\' Row', kind: 'merchant', body: 'noblewoman', sex: 'f', age: 41, walk: 'walk_proud', speed: 0.7, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_fiddle', area: 'market', name: 'Tuneless Tom', title: 'a street fiddler', kind: 'busker', body: 'fiddler', sex: 'm', age: 30, walk: 'swagger', speed: 1.0, idles: ['laugh', 'wave', 'idle'] }),
  roam({ id: 'ph_quill2', area: 'mages', name: 'Ambrose Inkle', title: 'a scribe', kind: 'scribe', body: 'scribe', sex: 'm', age: 51, walk: 'walk_ual', speed: 0.7, idles: ['idle_ual', 'look_around', 'scratch'] }),
  roam({ id: 'ph_razor', area: 'barbican', name: 'Doctor Snipe', title: 'a barber-surgeon', kind: 'barber', body: 'barber', sex: 'm', age: 46, walk: 'walk', speed: 0.9, idles: ['fold_arms', 'look_around', 'idle'] }),
  roam({ id: 'ph_alms', area: 'barbican', name: 'Hungry Meg', title: 'a beggar', kind: 'beggar', body: 'beggarwoman', sex: 'f', age: 50, walk: 'walk_ual', speed: 0.55, idles: ['depressed', 'wait', 'idle_ual'] }),
  roam({ id: 'ph_wren', area: 'rookeries', name: 'Wren', title: 'a street girl', kind: 'urchin', body: 'urchingirl', sex: 'f', age: 12, walk: 'walk', speed: 1.15, idles: ['look_around', 'idle', 'scratch'] }),
  roam({ id: 'ph_herb', area: 'bones', name: 'Granny Thistle', title: 'a hedge-witch', kind: 'fortune', body: 'hedgewitch', sex: 'f', age: 62, walk: 'walk_ual', speed: 0.65, idles: ['idle_ual', 'talk', 'look_around'] }),
  roam({ id: 'ph_plane', area: 'barracks', name: 'Nat Joinery', title: 'a carpenter', kind: 'joiner', body: 'joiner', sex: 'm', age: 35, walk: 'walk', speed: 1.0, idles: ['fold_arms', 'idle', 'warm_up'] }),
  roam({ id: 'ph_pie', area: 'market', name: 'Rosie Crust', title: 'a pie-seller', kind: 'baker', body: 'pieseller', sex: 'f', age: 30, walk: 'walk', speed: 1.0, idles: ['wave', 'laugh', 'idle'] }),
  roam({ id: 'ph_keys', area: 'barracks', name: 'Brute Hallam', title: 'a gaoler', kind: 'gaoler', body: 'gaoler', sex: 'm', age: 46, walk: 'swagger', speed: 0.85, idles: ['fold_arms', 'angry', 'look_around'] }),
  roam({ id: 'ph_livery', area: 'dukes', name: 'Simeon Prim', title: 'a servant of a great house', kind: 'servant', body: 'dukeservant', sex: 'm', age: 30, walk: 'walk_proud', speed: 0.95, idles: ['idle', 'wait', 'look_around'] }),
  // (And twelve more for the districts that wanted a face of their own, 2026-11-19.)
  roam({ id: 'ph_char', area: 'cinder', name: 'Ember Coll', title: 'a charcoal-burner', kind: 'chandler', body: 'charcoalburner', sex: 'm', age: 50, walk: 'walk_ual', speed: 0.8, idles: ['scratch', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_net', area: 'wharf', name: 'Old Salt Bramm', title: 'a net-mender', kind: 'ferryman', body: 'netmender', sex: 'm', age: 70, walk: 'walk_ual', speed: 0.55, still: 0.7, idles: ['idle_ual', 'depressed', 'look_around'] }),
  roam({ id: 'ph_barge', area: 'wharf', name: 'Hild Pole', title: 'a bargewoman', kind: 'dockhand', body: 'bargewoman', sex: 'f', age: 40, walk: 'swagger', speed: 0.95, idles: ['fold_arms', 'laugh', 'idle'] }),
  roam({ id: 'ph_redcoat', area: 'barracks', name: 'Dace Ferrow', title: 'a soldier off duty', kind: 'ruffian', body: 'offduty', sex: 'm', age: 25, walk: 'swagger', speed: 1.0, idles: ['laugh', 'fold_arms', 'look_around'] }),
  roam({ id: 'ph_sable', area: 'mages', name: 'Isolde Marrow', title: 'an apprentice of the Rise', kind: 'scribe', body: 'magestudent', sex: 'f', age: 19, walk: 'walk', speed: 1.0, idles: ['look_around', 'idle', 'scratch'] }),
  roam({ id: 'ph_lordling', area: 'dukes', name: 'Lord Cassian Vell', title: "a young lord of Dukes' Row", kind: 'merchant', body: 'younglord', sex: 'm', age: 22, walk: 'walk_proud', speed: 0.8, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_maid', area: 'dukes', name: 'Pansy Wether', title: "a lady's maid", kind: 'servant', body: 'ladysmaid', sex: 'f', age: 20, walk: 'walk', speed: 1.05, idles: ['wait', 'idle', 'look_around'] }),
  roam({ id: 'ph_pilgrim', area: 'approach', name: 'Brother Ashe', title: 'a pilgrim to the Keep', kind: 'acolyte', body: 'pilgrim', sex: 'm', age: 40, walk: 'walk_ual', speed: 0.6, still: 0.6, idles: ['idle_ual', 'depressed', 'look_around'] }),
  roam({ id: 'ph_toll', area: 'barbican', name: 'Fat Gorrim', title: 'the toll-keeper', kind: 'moneylender', body: 'tollkeeper', sex: 'm', age: 50, walk: 'walk_ual', speed: 0.6, still: 0.7, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_spice', area: 'market', name: 'Saffi Rend', title: 'a spice-seller', kind: 'baker', body: 'spiceseller', sex: 'f', age: 35, walk: 'walk', speed: 0.95, idles: ['wave', 'idle', 'laugh'] }),
  roam({ id: 'ph_peddle', area: 'market', name: 'Tinker Wim', title: 'a peddler', kind: 'grinder', body: 'peddler', sex: 'm', age: 50, walk: 'walk_ual', speed: 0.8, idles: ['wave', 'scratch', 'look_around'] }),
  roam({ id: 'ph_digger', area: 'bones', name: 'Sly Corbin', title: 'a grave-robber', kind: 'gravedigger', body: 'graverobber', sex: 'm', age: 30, walk: 'walk', speed: 1.05, idles: ['look_around', 'scratch', 'wait'] }),
  // The forty-nine more (the owner, 2026-11-19: 'Generate another 60 people in Meshy to spread across all the different areas of
  // Phobos, to replace repeated characters'): each in a district, taking a palette swap's place (SWAPS_PER). tools/phobos/crowd_roster2.json.
  roam({ id: 'ph_orrery', area: 'mages', name: 'Master Thibault Vane', title: 'an astrologer', kind: 'scribe', body: 'astrologer', sex: 'm', age: 71, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_flask', area: 'mages', name: 'Wenna Crale', title: 'an alchemist\'s assistant', kind: 'apothecary', body: 'alchemistgirl', sex: 'f', age: 24, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_binder', area: 'mages', name: 'Ansel Thorpe', title: 'a bookbinder', kind: 'scribe', body: 'bookbinder', sex: 'm', age: 52, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_gall2', area: 'mages', name: 'Sabine Hollow', title: 'an ink-maker', kind: 'scribe', body: 'inkmaker', sex: 'f', age: 38, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_nettle', area: 'mages', name: 'Old Nettle', title: 'a herbalist', kind: 'apothecary', body: 'herbalist', sex: 'f', age: 66, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_tutor', area: 'mages', name: 'Magister Odo Pell', title: 'a tutor of the Rise', kind: 'scribe', body: 'tutor', sex: 'm', age: 58, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_bolt', area: 'barbican', name: 'Hob Quarrel', title: 'a crossbowman of the wall', kind: 'sellsword', body: 'crossbowman', sex: 'm', age: 29, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_clerk', area: 'barbican', name: 'Eustace Wim', title: 'a clerk of the gate', kind: 'scribe', body: 'gateclerk', sex: 'm', age: 45, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_ostler', area: 'barbican', name: 'Dunk Harrow', title: 'an ostler', kind: 'dockhand', body: 'ostler', sex: 'm', age: 37, walk: 'walk', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_shoe', area: 'barbican', name: 'Brida Nail', title: 'a farrier', kind: 'smelter', body: 'farrier', sex: 'f', age: 40, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_cart', area: 'barbican', name: 'Gil Wainwright', title: 'a carter', kind: 'dockhand', body: 'carter', sex: 'm', age: 48, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_drill', area: 'barracks', name: 'Sergeant Brask', title: 'a drill sergeant', kind: 'veteran', body: 'drillsergeant', sex: 'm', age: 46, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_mail', area: 'barracks', name: 'Hanne Riveter', title: 'an armourer', kind: 'smelter', body: 'armourer', sex: 'f', age: 39, walk: 'walk', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_fletch', area: 'barracks', name: 'Linnet Shaft', title: 'a fletcher', kind: 'joiner', body: 'fletcher', sex: 'f', age: 27, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_stew', area: 'barracks', name: 'Mother Gruel', title: 'a garrison cook', kind: 'baker', body: 'campcook', sex: 'f', age: 55, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_banner', area: 'approach', name: 'Ser Corvin Dask', title: 'a banner-bearer of the Loyal', kind: 'acolyte', body: 'bannerbearer', sex: 'm', age: 34, walk: 'walk_proud', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_lash', area: 'approach', name: 'Brother Scour', title: 'a penitent', kind: 'acolyte', body: 'flagellant', sex: 'm', age: 42, walk: 'walk_proud', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_relic', area: 'approach', name: 'Gammer Pyx', title: 'a seller of relics', kind: 'fortune', body: 'relicseller', sex: 'f', age: 60, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_tithe', area: 'approach', name: 'Master Aumbry', title: 'a tithe-collector of the Keep', kind: 'moneylender', body: 'tithecollector', sex: 'm', age: 50, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_taper', area: 'approach', name: 'Sister Morrow', title: 'a devotee of the Keep', kind: 'acolyte', body: 'devotee', sex: 'f', age: 29, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_puff', area: 'cinder', name: 'Tam Puffer', title: 'a bellows-boy', kind: 'urchin', body: 'bellowsboy', sex: 'm', age: 13, walk: 'walk', speed: 1.1, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_cinder', area: 'cinder', name: 'Ma Clinker', title: 'a furnace tender', kind: 'smelter', body: 'furnacewoman', sex: 'f', age: 45, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_heave', area: 'cinder', name: 'Big Ottar', title: 'a coal-heaver', kind: 'smelter', body: 'coalheaver', sex: 'm', age: 33, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_glassb', area: 'cinder', name: 'Renaud Fyre', title: 'a glassblower', kind: 'chandler', body: 'glassblower', sex: 'm', age: 41, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_sift', area: 'cinder', name: 'Granny Ash', title: 'an ash-sifter', kind: 'ragwoman', body: 'ashsifter', sex: 'f', age: 74, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_major', area: 'dukes', name: 'Ambrose Quillfeather', title: 'a majordomo of a great house', kind: 'servant', body: 'majordomo', sex: 'm', age: 56, walk: 'walk_proud', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_silk', area: 'dukes', name: 'Madame Isaure', title: 'a courtesan of Dukes\' Row', kind: 'merchant', body: 'courtesan', sex: 'f', age: 32, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_fop', area: 'dukes', name: 'Lord Peregrine Asche', title: 'a duelling fop', kind: 'sellsword', body: 'duelist', sex: 'm', age: 26, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_dowager', area: 'dukes', name: 'the Dowager Cressida', title: 'a dowager of Dukes\' Row', kind: 'merchant', body: 'dowager', sex: 'f', age: 78, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_sexton', area: 'bones', name: 'Old Lamech', title: 'a sexton', kind: 'gravedigger', body: 'sexton', sex: 'm', age: 69, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_myrrh', area: 'bones', name: 'Ottilie Shroud', title: 'an embalmer', kind: 'mourner', body: 'embalmer', sex: 'f', age: 47, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_wash', area: 'bones', name: 'Hild the Washer', title: 'a washer of the dead', kind: 'washer', body: 'corpsewasher', sex: 'f', age: 52, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_wake', area: 'bones', name: 'Corwin Lamp', title: 'a lantern-man of the dead-watch', kind: 'watchman', body: 'deadwatch', sex: 'm', age: 38, walk: 'walk', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_eel', area: 'wharf', name: 'Peg Slither', title: 'an eel-seller', kind: 'fishwife', body: 'eelseller', sex: 'f', age: 44, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_adze', area: 'wharf', name: 'Ulf Keelson', title: 'a shipwright', kind: 'joiner', body: 'shipwright', sex: 'm', age: 50, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_tide', area: 'wharf', name: 'Nan Brackwater', title: 'a smuggler', kind: 'fence', body: 'smuggler', sex: 'f', age: 34, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_salt', area: 'wharf', name: 'Jack Brine', title: 'a sailor', kind: 'dockhand', body: 'sailor', sex: 'm', age: 28, walk: 'walk', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_pawn', area: 'rookeries', name: 'Silas Mote', title: 'a pawnbroker', kind: 'moneylender', body: 'pawnbroker', sex: 'm', age: 61, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_ladle', area: 'rookeries', name: 'Bessie Tallow', title: 'the cook of the Gutted Lamb', kind: 'tavern', body: 'taverncook', sex: 'f', age: 49, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_knave', area: 'rookeries', name: 'Lucky Ferris', title: 'a card-sharp', kind: 'dicer', body: 'cardsharp', sex: 'm', age: 30, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_flop', area: 'rookeries', name: 'Widow Crake', title: 'a lodging-house keeper', kind: 'tavern', body: 'lodginglady', sex: 'f', age: 57, walk: 'walk', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
  roam({ id: 'ph_rind', area: 'market', name: 'Matilde Curd', title: 'a cheesemonger', kind: 'baker', body: 'cheesemonger', sex: 'f', age: 42, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_awl', area: 'market', name: 'Ned Sole', title: 'a cobbler', kind: 'tanner', body: 'cobbler', sex: 'm', age: 54, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_clay', area: 'market', name: 'Hamund Crock', title: 'a potter', kind: 'joiner', body: 'potter', sex: 'm', age: 36, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_sage', area: 'market', name: 'Goody Rue', title: 'a herb-seller', kind: 'apothecary', body: 'herbwoman', sex: 'f', age: 63, walk: 'walk_ual', speed: 0.65, still: 0.6, idles: ['fold_arms_ual',  'idle_ual',  'look_around'] }),
  roam({ id: 'ph_curry', area: 'tanners', name: 'Abner Hyde', title: 'a currier', kind: 'tanner', body: 'currier', sex: 'm', age: 45, walk: 'walk', speed: 0.95, idles: ['idle',  'scratch',  'wave'] }),
  roam({ id: 'ph_flay', area: 'tanners', name: 'Rook Flaye', title: 'a skinner', kind: 'tanner', body: 'skinner', sex: 'm', age: 39, walk: 'walk', speed: 1.0, idles: ['wait',  'idle',  'look_around'] }),
  roam({ id: 'ph_glove', area: 'tanners', name: 'Clemence Fyne', title: 'a glover', kind: 'tanner', body: 'glover', sex: 'f', age: 35, walk: 'walk', speed: 1.05, idles: ['talk',  'idle',  'laugh'] }),
  roam({ id: 'ph_lye', area: 'tanners', name: 'Gert Lather', title: 'a soap-boiler', kind: 'washer', body: 'soapmaker', sex: 'f', age: 51, walk: 'walk', speed: 0.9, idles: ['fold_arms',  'look_around',  'idle'] }),
];
// The broad of the crowd: their upper arms held a little out from them (radians), or they pass through their own coats and
// bellies (FolkRig armOut). Measured in Blender on each body's fitted skeleton (tools/folk/rig_fit.py: the least that keeps the
// arms out of the trunk on the walk and the upright run; tools/folk/rig_fit_armout.json); and no more, the walking hand passing
// a thigh or coat about 3.5 cm off, not held out like a gunslinger's (a little in, below 0, where the clips carry it wide).
const ARM_OUT = {'abel_b': 0.05, 'alchemistgirl': 0.06, 'archivistghost': 0.12, 'bannerbearer': 0.12, 'beggarwoman': 0.06, 'campcook': 0.06, 'cardsharp': 0.06, 'carter': 0.06, 'chandler': 0.06, 'charcoalburner': 0.06, 'cheesemonger': 0.05, 'coalheaver': 0.06, 'cobbler': 0.06, 'crossbowman': 0.18, 'devotee': 0.18, 'dukeservant': -0.06, 'fiddler': 0.12, 'fletcher': 0.06, 'gateclerk': 0.06, 'ghoulscullion': 0.12, 'glassblower': 0.07, 'grinder': 0.07, 'hedgewitch': 0.18, 'hellguard': 0.06, 'herbalist': 0.06, 'herbwoman': 0.06, 'keeppriestess': 0.12, 'ladysmaid': 0.06, 'lodginglady': 0.06, 'louis_g': 0.18, 'magestudent': 0.12, 'mason': 0.07, 'netmender': 0.06, 'osk_b': 0.06, 'pieseller': 0.06, 'pilgrim': -0.02, 'porter': 0.03, 'potter': -0.02, 'ragwoman': 0.06, 'scribe': 0.12, 'sexton': 0.03, 'shipwright': 0.12, 'skinner': 0.06, 'sweep': 0.12, 'urchingirl': 0.18, 'veteran': 0.06, 'washerwoman': 0.06, 'watchman': 0.06, 'weaver': 0.18, 'younglord': 0.06};
for (const p of CROWD) if (p.armOut === undefined && ARM_OUT[p.body]) p.armOut = ARM_OUT[p.body];
export const CROWD_LEAN = 8;

// Palette swaps (the owner, 2026-11-19: "create 5 palette swapped versions of each of the models"): five more of each of
// the city's Meshy-made people, the same body in other clothes (recoloured in the shader: src/gfx/folk.js swapCode,
// assets/game/folk/folk.json swaps, tools/phobos/crowd_tints.py), each with a name of their own, in the same district as
// the one they're made on, speaking as their kind (their own two hundred lines are the named one's alone). After the
// named crowd, so a phone, which has only the first CROWD_LEAN, never loads one.
const SWAP_FIRST = { m: ['Aldo', 'Bram', 'Cuthbert', 'Dunstan', 'Edric', 'Fenn', 'Godric', 'Hob', 'Ivo', 'Jory', 'Kit', 'Lew', 'Mott', 'Ned', 'Osric', 'Piers', 'Quint', 'Rafe', 'Sim', 'Tam', 'Ulf', 'Wat', 'Yorick', 'Bertram', 'Colm', 'Dickon', 'Ebb', 'Gil', 'Harrow', 'Jem'],
  f: ['Agnes', 'Bet', 'Cass', 'Dot', 'Edith', 'Fen', 'Gilly', 'Hester', 'Isa', 'Jinny', 'Kate', 'Lettice', 'Maud', 'Nell', 'Orla', 'Peg', 'Rose', 'Sal', 'Tess', 'Ursa', 'Win', 'Ysolde', 'Bryony', 'Clem', 'Dulcie', 'Elsbeth', 'Grizel', 'Hattie', 'Joan', 'Mabyn'] };
const SWAP_LAST = ['Ashby', 'Blackwater', 'Cole', 'Dunn', 'Ember', 'Flint', 'Gall', 'Hatch', 'Inkle', 'Jessop', 'Kell', 'Lumb', 'Mire', 'Nettle', 'Orme', 'Pike', 'Quarry', 'Rook', 'Slade', 'Thorne', 'Underhill', 'Vane', 'Wick', 'Yarrow', 'Crane', 'Dross', 'Grimm', 'Holt', 'Marl', 'Sallow', 'Tallis', 'Wrack'];
const MESHY = new Set(['sweep', 'fishwife', 'bonecarver', 'tanner', 'watchman', 'ragwoman', 'cutpurse', 'smelter', 'apothecary', 'merchant', 'baker', 'butcher', 'gravedigger', 'lamplighter', 'washerwoman', 'ferryman', 'plaguedoctor', 'grinder', 'chandler', 'mason', 'dockhand', 'porter', 'moneylender', 'acolyte', 'mourner', 'veteran', 'dyer', 'weaver', 'innkeeper', 'noblewoman', 'fiddler', 'scribe', 'barber', 'beggarwoman', 'urchingirl', 'hedgewitch', 'joiner', 'pieseller', 'gaoler', 'dukeservant', 'charcoalburner', 'netmender', 'bargewoman', 'offduty', 'magestudent', 'younglord', 'ladysmaid', 'pilgrim', 'tollkeeper', 'spiceseller', 'peddler', 'graverobber']);
// (Four of each since the forty-nine more came: they're in the fifth's place.)
export const SWAPS_PER = 4;
// (Each of a body's swaps in a district of its own, never the one it's made on's nor another of them's: four of one body
// walking a street together looked like what it is. The owner, 2026-11-20.)
const DISTRICTS = ['barbican', 'cinder', 'rookeries', 'market', 'wharf', 'tanners', 'bones', 'barracks', 'mages', 'dukes', 'approach'];
const areaOf = (p, n, k) => { const i = DISTRICTS.indexOf(p.area); return i < 0 ? p.area : DISTRICTS[(i + 1 + ((n + 3 * k) % 10)) % DISTRICTS.length]; };
const swapsOf = (p, n) => {
  const out = [];
  for (let k = 1; k <= SWAPS_PER; k++) {
    const h = (n * 7 + k * 13) % 997, first = SWAP_FIRST[p.sex === 'f' ? 'f' : 'm'][h % 30], last = SWAP_LAST[(h * 3 + k) % SWAP_LAST.length];
    out.push(roam({ ...p, id: `${p.id}_${k}`, name: p.age < 15 ? first : `${first} ${last}`, title: p.title.replace(/^the /, 'a '), body: `${p.body}_s${k}`, area: areaOf(p, n, k), age: Math.max(9, p.age + ((h % 21) - 10)), speed: (p.speed || 1) * (0.9 + (h % 5) * 0.05), swapOf: p.id }));
  }
  return out;
};
CROWD.push(...CROWD.filter((p) => MESHY.has(p.body)).flatMap((p, n) => swapsOf(p, n)));
// Everyone with a body on the town's thread: the town's people, then the posted, the road's, then Phobos's crowd (the folk buffer's order).
// And those posted at the camps and the land's other hubs, region by region (src/folk/regions/, docs/QUEST-LOOP.md).
for (const p of REGION_PEOPLE) POSTED.push(posted(p));
// (And between the posted and the crowd, the folk you pass on the roads, parked till they're set down on one:
// src/folk/road-folk.js. The crowd's kept last.)
export { ROAD };
export const FOLK = PEOPLE.concat(POSTED, ROAD, CROWD);

export const BY_ID = Object.fromEntries(FOLK.map((p) => [p.id, p]));
export const first = (p) => (p.id === 'homunculus' ? 'Homunculus' : p.id === 'aldric' ? 'Ser Aldric' : p.id === 'dusty' ? 'Dusty' : p.name.split(' ').slice(0, p.name.startsWith('Ser ') ? 2 : 1).join(' '));
export const isChild = (p) => p.age < 15;
