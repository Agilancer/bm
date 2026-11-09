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

export const BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const first = (p) => (p.id === 'homunculus' ? 'Homunculus' : p.id === 'aldric' ? 'Ser Aldric' : p.id === 'dusty' ? 'Dusty' : p.name.split(' ')[0]);
export const isChild = (p) => p.age < 15;
