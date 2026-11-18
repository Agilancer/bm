// Who lives in Bellmourn: their bodies, their homes and beds, their work, their ways. (Who they are: tools/folk/cast.md.
// What they say: src/folk/lines/.)
//
// body: a model in assets/game/folk/folk.json (or a recoloured copy of one). home: the house they sleep in (src/folk/town.js
// HOUSES), bed: which of its beds, side: 0/1 where two share. job: the shape of their day (src/folk/brain.js DAYS). work: where.
// walk: their gait (a clip). idles: what they do standing about. trade: what they sell (src/folk/shops.js).

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
  posted({ id: 'ph_ash', hub: 'ash', name: 'Edda Grail', title: 'Warden of the Ashwardens', body: 'ph_ash', sex: 'f', age: 52, post: [10059.7, -551.4], face: -3.11, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
];
// City State Phobos's street crowd: ruffians, riff-raff and adventurer folk, on the town's own thread with no house, bed or
// day (job 'roam': src/folk/brain.js). They're only up while you're inside the city's wall, and then they're about the
// streets near you, wherever the dead and Velscour's Loyal don't keep (src/core/east.js HAUNTS): walking, standing about,
// stopping two together to talk; anyone left far behind you turns up again somewhere ahead. kind: their lines
// (src/folk/lines/phobos.js). Bodies: the townsfolk's, recoloured (tools/phobos/crowd_swaps.py), and a few of the posted
// people's. The first CROWD_LEAN of them are all a phone has.
const roam = (p) => ({ job: 'roam', crowd: true, walk: 'walk', ...p });
export const CROWD = [
  roam({ id: 'ph_nib', name: 'Nib Scarrow', title: 'a cutpurse', kind: 'cutpurse', body: 'ph_cut', sex: 'm', age: 24, speed: 1.05, idles: ['look_around', 'wait', 'scratch'] }),
  roam({ id: 'ph_brannick', name: 'Brannick of Nowhere', title: 'a sellsword', kind: 'sellsword', body: 'ph_sword', sex: 'm', age: 38, walk: 'swagger', idles: ['fold_arms', 'idle', 'look_around'] }),
  roam({ id: 'ph_tolly', name: 'Old Tolly', title: 'a drunk', kind: 'drunk', body: 'ph_drunk', sex: 'm', age: 55, walk: 'walk_ual', speed: 0.6, idles: ['depressed', 'laugh', 'idle_ual'] }),
  roam({ id: 'ph_mason', name: 'Grey Aldo', title: 'a beggar', kind: 'beggar', body: 'ph_beggar', sex: 'm', age: 71, walk: 'walk_ual', speed: 0.55, still: 0.8, idles: ['depressed', 'wait', 'idle_ual'] }),
  roam({ id: 'ph_jask', name: 'Jask Two-Bones', title: 'a dicer', kind: 'dicer', body: 'ph_dicer', sex: 'm', age: 31, idles: ['laugh', 'complain', 'idle'] }),
  roam({ id: 'ph_quill', name: 'Mother Quill', title: 'a fence', kind: 'fence', body: 'ph_fence', sex: 'm', age: 60, walk: 'walk_ual', speed: 0.8, still: 0.6, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_rook', name: 'Rook Bastable', title: 'a delver', kind: 'delver', body: 'ph_delver', sex: 'm', age: 29, idles: ['look_around', 'fold_arms', 'warm_up'] }),
  roam({ id: 'ph_vane', name: 'Ser Nobody Vane', title: 'a demon hunter', kind: 'hunter', body: 'ph_hunter', sex: 'm', age: 44, walk: 'walk_proud', idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  roam({ id: 'ph_mag', name: 'Mag Ninefingers', title: 'a fortune-teller', kind: 'fortune', body: 'ph_crone', sex: 'f', age: 69, walk: 'walk_ual', speed: 0.7, still: 0.7, idles: ['idle_ual', 'talk', 'wait'] }),
  roam({ id: 'ph_bess', name: 'Red Bess', title: 'of the Gutted Lamb', kind: 'tavern', body: 'ph_doxy', sex: 'f', age: 23, idles: ['relax', 'laugh', 'wave'] }),
  roam({ id: 'ph_hettie', name: 'Hettie Drain', title: 'a rat-catcher', kind: 'ratcatcher', body: 'ph_rat', sex: 'f', age: 37, idles: ['scratch', 'idle', 'look_around'] }),
  roam({ id: 'ph_pim', name: 'Pim', title: 'a street urchin', kind: 'urchin', body: 'ph_urchin', sex: 'm', age: 11, speed: 1.15, idles: ['look_around', 'scratch', 'idle'] }),
  roam({ id: 'ph_corve', name: 'Corve Ashlock', title: 'a delver', kind: 'delver', body: 'colm', sex: 'm', age: 47, idles: ['fold_arms_ual', 'look_around', 'idle_ual'] }),
  roam({ id: 'ph_wulf', name: 'Wulfram the Bent', title: 'a sellsword', kind: 'sellsword', body: 'garrick', sex: 'm', age: 50, walk: 'swagger', idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  roam({ id: 'ph_sorrel', name: 'Sorrel Vey', title: 'a cutpurse', kind: 'cutpurse', body: 'ysolt', sex: 'f', age: 22, speed: 1.05, idles: ['look_around', 'wait', 'idle'] }),
  roam({ id: 'ph_abel', name: 'Brother Abel', title: 'a defrocked priest', kind: 'drunk', body: 'wymond', sex: 'm', age: 64, walk: 'walk_ual', speed: 0.65, idles: ['depressed', 'idle_ual', 'scratch'] }),
  roam({ id: 'ph_greta', name: 'Greta Hask', title: 'a demon hunter', kind: 'hunter', body: 'hasket', sex: 'f', age: 41, idles: ['fold_arms', 'look_around', 'wait'] }),
  roam({ id: 'ph_osk', name: 'Osk the Tout', title: 'a dicer', kind: 'dicer', body: 'osric', sex: 'm', age: 35, idles: ['talk', 'laugh', 'look_around'] }),
  roam({ id: 'ph_cob', name: 'Cob Mallet', title: 'a bravo', kind: 'ruffian', body: 'ph_bravo', sex: 'm', age: 33, walk: 'swagger', idles: ['fold_arms', 'look_around', 'angry'] }),
  roam({ id: 'ph_merrin', name: 'Knuckles Merrin', title: 'a ruffian', kind: 'ruffian', body: 'ph_knuckle', sex: 'm', age: 26, walk: 'swagger', idles: ['fold_arms', 'laugh', 'look_around'] }),
  roam({ id: 'ph_lark', name: 'Lark Tamsey', title: 'a delver', kind: 'delver', body: 'ph_lark', sex: 'f', age: 27, idles: ['look_around', 'fold_arms', 'warm_up'] }),
  roam({ id: 'ph_harl', name: 'Big Harl', title: 'a hired brute', kind: 'sellsword', body: 'ph_brute', sex: 'm', age: 36, walk: 'walk_proud', speed: 0.9, idles: ['fold_arms', 'idle', 'scratch'] }),
  roam({ id: 'ph_wenna', name: 'Wenna Glass', title: 'of the Gutted Lamb', kind: 'tavern', body: 'ph_glass', sex: 'f', age: 25, idles: ['relax', 'laugh', 'wait'] }),
  roam({ id: 'ph_tib', name: 'Tib', title: 'a street girl', kind: 'urchin', body: 'ph_tib', sex: 'f', age: 10, speed: 1.15, idles: ['look_around', 'idle', 'scratch'] }),
];
export const CROWD_LEAN = 8;
// Everyone with a body on the town's thread: the town's people, then the posted, then Phobos's crowd (the folk buffer's order).
export const FOLK = PEOPLE.concat(POSTED, CROWD);

export const BY_ID = Object.fromEntries(FOLK.map((p) => [p.id, p]));
export const first = (p) => (p.id === 'homunculus' ? 'Homunculus' : p.id === 'aldric' ? 'Ser Aldric' : p.id === 'dusty' ? 'Dusty' : p.name.split(' ').slice(0, p.name.startsWith('Ser ') ? 2 : 1).join(' '));
export const isChild = (p) => p.age < 15;
