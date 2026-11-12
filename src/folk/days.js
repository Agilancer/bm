// The shape of everyone's day, by their job: from what hour they do what (src/folk/brain.js lives it out). Hours run
// 0-24; each start but midnight shifts a little per person and per day, so a town doesn't all stand up at once.
//
// sleep    abed at home                     cook   at their hearth             eat     at their table
// home     about the house                  work   at their trade (WORK)       stall   keeping their stall in the square
// errand   to a stall or the well and back  gather talking in the square       stroll  about the streets
// inn      an evening at the Tolling Bell   play   (children)                  lesson  Elowen's school
// patrol   Jory's round with the lantern    post   the watch's posts           train   the squires' yard
// tryst    the oak, at night                hunt   the woods' edge             tithe   Garth's round of the doors
// perform  songs and dancing at the inn
// watch    Edric, looking up the east road  shop   their own counter at home   leisure (one of inn/gather/stroll/home)

const ADULT = ({ wake = 5.9, eat = 6.4, out = 7.2, lunch = 12, back = 13, done = 17.5, supper = 18, evening = 'leisure', bed = 21.8 } = {}) => [
  [0, 'sleep'], [wake, 'home'], [eat, 'eat'], [out, 'work'], [lunch, 'eat'], [back, 'work'], [done, 'home'], [supper, 'eat'], [supper + 0.8, evening], [bed, 'sleep'],
];

export const DAYS = {
  innkeep: [[0, 'inn'], [0.4, 'sleep'], [6.2, 'home'], [6.7, 'eat'], [7.3, 'work'], [12.4, 'eat'], [13.1, 'work']],
  cook: [[0, 'sleep'], [5.4, 'cook'], [7, 'eat'], [7.7, 'errand'], [9.5, 'home'], [10.6, 'cook'], [12.6, 'eat'], [13.3, 'work'], [16.4, 'cook'], [19.6, 'inn'], [22.4, 'sleep']],
  barmaid: [[0, 'work'], [0.5, 'sleep'], [7.8, 'home'], [8.2, 'eat'], [8.8, 'errand'], [10, 'gather'], [12, 'work'], [15, 'stroll'], [16.4, 'gather'], [17.4, 'work'], [19.6, 'perform'], [21, 'work']],
  scholar: [[0, 'work'], [1.3, 'sleep'], [8.3, 'eat'], [9, 'work'], [12.3, 'eat'], [13, 'stroll'], [14.6, 'work'], [18, 'eat'], [18.8, 'work']],
  chandler: ADULT({ evening: 'home', bed: 21.4 }),
  stallkeep: [[0, 'sleep'], [6, 'home'], [6.5, 'eat'], [7.3, 'stall'], [17.6, 'home'], [18, 'eat'], [18.8, 'leisure'], [21.6, 'sleep']],
  reeve: [[0, 'sleep'], [6.3, 'home'], [6.8, 'eat'], [7.8, 'work'], [12, 'eat'], [13, 'stroll'], [14.6, 'work'], [17.5, 'home'], [18, 'eat'], [19, 'home'], [22, 'sleep']],
  lady: [[0, 'sleep'], [7, 'home'], [7.5, 'eat'], [8.4, 'home'], [9.6, 'gather'], [11.4, 'stroll'], [12.3, 'eat'], [13, 'home'], [14.4, 'errand'], [15.6, 'gather'], [17.5, 'home'], [18, 'eat'], [19, 'leisure'], [21.8, 'sleep']],
  noble: [[0, 'sleep'], [8.8, 'home'], [9.2, 'eat'], [10, 'gather'], [12, 'eat'], [13, 'train'], [15, 'stroll'], [16.5, 'gather'], [18, 'eat'], [18.8, 'inn'], [21.7, 'tryst'], [23, 'sleep']],
  lord: [[0, 'sleep'], [6.5, 'home'], [7, 'eat'], [8, 'home'], [10, 'gather'], [11.2, 'home'], [12, 'eat'], [13, 'home'], [15, 'watch'], [16.4, 'home'], [18, 'eat'], [19, 'home'], [22.5, 'sleep']],
  teacher: [[0, 'sleep'], [6.5, 'home'], [7, 'eat'], [8.2, 'home'], [8.9, 'lesson'], [11, 'home'], [12, 'eat'], [13, 'errand'], [14.4, 'stroll'], [16, 'home'], [18, 'eat'], [19, 'home'], [21.5, 'tryst'], [22.9, 'sleep']],
  squire: [[0, 'sleep'], [6.2, 'home'], [6.6, 'eat'], [7.2, 'train'], [10.5, 'post'], [12, 'eat'], [13, 'post'], [16.5, 'train'], [18, 'eat'], [18.8, 'inn'], [22, 'sleep']],
  captain: [[0, 'sleep'], [5.5, 'home'], [6, 'eat'], [6.6, 'post'], [12, 'eat'], [13, 'post'], [18, 'eat'], [18.8, 'inn'], [21.4, 'sleep']],
  watchman: [[0, 'patrol'], [5.5, 'home'], [6.1, 'eat'], [7, 'sleep'], [15, 'home'], [15.6, 'gather'], [17, 'eat'], [17.8, 'inn'], [19.8, 'patrol']],
  farmer: ADULT({ evening: 'leisure' }),
  farmwife: [[0, 'sleep'], [5.5, 'cook'], [6.5, 'eat'], [7.2, 'work'], [11.3, 'cook'], [12.2, 'eat'], [13, 'work'], [16.8, 'cook'], [18, 'eat'], [18.8, 'home'], [21.5, 'sleep']],
  smith: ADULT({ out: 7, done: 18, supper: 18.3, evening: 'inn', bed: 22.4 }),
  apprentice: ADULT({ out: 6.9, done: 18, supper: 18.3, evening: 'gather', bed: 22 }),
  brewer: ADULT({ evening: 'inn', bed: 22.6 }),
  labourer: [[0, 'sleep'], [5.8, 'home'], [6.3, 'eat'], [7, 'work'], [12, 'eat'], [13, 'tithe'], [15, 'work'], [17.5, 'home'], [18, 'eat'], [18.8, 'inn'], [22, 'sleep']],
  tanner: ADULT({ evening: 'home', bed: 21 }),
  tailor: [[0, 'sleep'], [6.2, 'home'], [6.7, 'eat'], [7.4, 'stall'], [13, 'eat'], [13.8, 'work'], [17.6, 'home'], [18, 'eat'], [18.8, 'leisure'], [22, 'sleep']],
  dyer: ADULT({ evening: 'gather', bed: 22 }),
  hunter: [[0, 'sleep'], [5, 'home'], [5.4, 'eat'], [6, 'hunt'], [10.8, 'work'], [12, 'eat'], [13, 'work'], [17.5, 'home'], [18, 'eat'], [18.8, 'inn'], [21.5, 'sleep']],
  undertaker: ADULT({ evening: 'home', bed: 21.6 }),
  baker: [[0, 'sleep'], [4.5, 'work'], [7.2, 'stall'], [13, 'eat'], [13.6, 'work'], [15.4, 'stall'], [17.6, 'home'], [18, 'eat'], [19, 'home'], [21, 'sleep']],
  herbalist: [[0, 'sleep'], [6, 'home'], [6.5, 'eat'], [7.2, 'work'], [11, 'shop'], [12.3, 'eat'], [13, 'shop'], [17.5, 'home'], [18, 'eat'], [19, 'home'], [21.8, 'sleep']],
  // Out in the land, at their post, all day and all night (src/folk/people.js POSTED).
  posted: [[0, 'posted']],
  child: [[0, 'sleep'], [7, 'home'], [7.3, 'eat'], [7.9, 'play'], [9, 'lesson'], [11, 'play'], [12, 'eat'], [12.8, 'play'], [15, 'help'], [16.2, 'play'], [17.6, 'home'], [18, 'eat'], [18.6, 'play'], [19.7, 'home'], [20.2, 'sleep']],
};

// Where each trade is plied, and how. house: whose house it's in (src/folk/town.js HOUSES); near: the piece of furniture they
// stand at (off: how far off it; faceRoom: facing into the room rather than at it); hearth: at the house's hearth; oven: at
// the bread oven's mouth; forge: the smith's own work at his anvil (forge in src/folk/brain.js); seat:
// sitting at the table nearest that furniture; place: somewhere outdoors (town.js PLACES). clips: what they do there, in turn.
export const WORK = {
  inn_bar: { house: 'inn', near: 'barrel', off: 1.0, faceRoom: true, clips: ['interact', 'idle', 'fold_arms', 'wait', 'interact'], serve: 0.25 },
  inn_hearth: { house: 'inn', hearth: true, clips: ['interact', 'idle_ual', 'interact', 'pick_up', 'interact'], serve: 0.15 },
  inn_floor: { house: 'inn', near: 'barrel', off: 1.3, faceRoom: true, clips: ['wait', 'look_around', 'fold_arms'], serve: 0.6 },
  inn_corner: { house: 'inn', seat: 'corner', read: true },
  chandler_vats: { house: 'chandler', near: 'vat', off: 0.5, clips: ['interact', 'pick_up', 'idle_ual', 'interact'] },
  reeve_desk: { house: 'reeve', seat: 'table', read: true },
  forge: { house: 'smith', forge: true },
  bellows: { house: 'smith', hearth: true, clips: ['interact', 'crouch', 'interact', 'pick_up', 'idle'] },
  forge_watch: { house: 'smith', near: 'anvil', off: 2.0, watch: 'homunculus', clips: ['idle', 'fold_arms', 'crouch', 'look_around'] },
  alewife_vats: { house: 'alewife', near: 'barrel', off: 0.9, clips: ['interact', 'pick_up', 'idle', 'interact'] },
  barn: { house: 'barn', near: 'sacks', off: 0.8, clips: ['pick_up', 'interact', 'idle_ual', 'interact'], carry: 'barn' },
  tannery_vats: { house: 'tannery', near: 'vat', off: 0.5, clips: ['interact', 'pick_up', 'interact', 'idle_ual'] },
  loom: { house: 'weaver', near: 'loom', level: 0, clips: ['interact', 'pick_up', 'interact', 'idle'] },
  loom_up: { house: 'weaver', near: 'loom', level: 1, clips: ['interact', 'pick_up', 'interact', 'idle'] },
  fields: { place: 'fields', clips: ['harvest', 'plant', 'water', 'dig', 'harvest'] },
  woodpile: { place: 'woodpile', clips: ['chop_wood', 'chop_wood', 'pick_up', 'idle'] },
  coffin_yard: { house: 'coffins', near: 'trestle', off: 0.75, clips: ['interact', 'pick_up', 'interact', 'idle_ual', 'scratch'] },
  oven: { house: 'bakery', oven: true, clips: ['interact', 'idle_ual', 'pick_up', 'interact', 'look_around', 'interact', 'pick_up'] },
  herb_garden: { place: 'herb_garden', clips: ['harvest', 'plant', 'water', 'harvest'] },
};

// Whose work is which, where the cast's own `work` doesn't say it all.
export const WORK_OF = { dusty: 'bellows', wren: 'forge_watch', wenna: 'loom_up' };

// Evenings, when the day says 'leisure'.
export const LEISURE = {
  default: ['inn', 'inn', 'gather', 'stroll', 'home'],
  parent: ['home', 'home', 'gather', 'inn'],
  gentry: ['home', 'home', 'gather'],
};

// The time of day as the town's lines know it.
export const partOfDay = (h) => (h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night');
