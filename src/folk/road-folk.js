// The folk you pass on the roads (docs/ROAD-LIFE.md): carters, pedlars, pilgrims, drovers, a tinker, a charcoal-burner, a
// cheese-wife on her way to market. On the town's thread with no house, bed or day of their own (job 'road': src/folk/brain.js
// onRoad); parked, not drawn, posed or moved, till the main thread (src/ui/roadfolk.js) sets a few of them down on the road
// ahead of you to walk it past you, or stops by it, or puts them in a fix on it (travellers under attack: src/sim/wilds.js
// rescue), and parked again once you've left them behind.
// Bodies: the townsfolk's and the posted people's, dyed (assets/game/folk/folk.json swaps rd_*): bodies every device has
// loaded already, so the road's people cost a phone no more than a skinned copy of each (src/gfx/folk.js), and nobody of the
// town or the posts is ever taken off where they belong to walk a road. (Ten: FOLK_MAX in src/folk/layout.js is 512. Between the posted and the crowd in the buffer: people.js FOLK.)
const road = (p) => ({ job: 'road', road: true, walk: 'walk', ...p });
export const ROAD = [
  road({ id: 'rd_carter', name: 'Abner Coyle', title: 'a carter', kind: 'carter', body: 'rd_carter', sex: 'm', age: 46, idles: ['look_around', 'scratch', 'idle'] }),
  road({ id: 'rd_pedlar', name: 'Hessie Marrow', title: 'a pedlar', kind: 'pedlar', body: 'rd_pedlar', sex: 'f', age: 52, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
  road({ id: 'rd_pilgrim', name: 'Brother Anselm', title: 'a pilgrim', kind: 'pilgrim', body: 'rd_pilgrim', sex: 'm', age: 64, speed: 0.8, idles: ['idle_ual', 'look_around', 'wait'] }),
  road({ id: 'rd_drover', name: 'Jacob Hurst', title: 'a drover', kind: 'drover', body: 'rd_drover', sex: 'm', age: 31, idles: ['look_around', 'fold_arms', 'idle'] }),
  road({ id: 'rd_lettie', name: 'Lettie Shaw', title: 'going to market', kind: 'market', body: 'rd_lettie', sex: 'f', age: 22, idles: ['look_around', 'idle', 'wait'] }),
  road({ id: 'rd_tinker', name: 'Wat Ploughwright', title: 'a tinker', kind: 'tinker', body: 'rd_tinker', sex: 'm', age: 50, idles: ['scratch', 'look_around', 'idle'] }),
  road({ id: 'rd_harrow', name: 'Old Harrow', title: 'a pilgrim', kind: 'pilgrim', body: 'rd_harrow', sex: 'm', age: 70, speed: 0.75, idles: ['idle_ual', 'wait', 'look_around'] }),
  road({ id: 'rd_ysolde', name: 'Ysolde Wray', title: 'a pilgrim', kind: 'pilgrim', body: 'rd_ysolde', sex: 'f', age: 27, idles: ['look_around', 'idle', 'wait'] }),
  road({ id: 'rd_cobb', name: 'Cobb Ashdown', title: 'a charcoal-burner', kind: 'burner', body: 'rd_cobb', sex: 'm', age: 42, idles: ['scratch', 'fold_arms', 'idle'] }),
  road({ id: 'rd_pell', name: 'Goody Pell', title: 'a cheese-wife', kind: 'market', body: 'rd_pell', sex: 'f', age: 49, idles: ['fold_arms_ual', 'idle_ual', 'look_around'] }),
];
// Whose body each is dyed from (for the body's armOut, people.js ARM_OUT, and tools that list who wears what).
export const ROAD_BASE = { rd_carter: 'worker', rd_pedlar: 'worker_f', rd_pilgrim: 'old_man', rd_drover: 'dude', rd_lettie: 'young_3', rd_tinker: 'wes', rd_harrow: 'elder', rd_ysolde: 'young_4', rd_cobb: 'worker_2', rd_pell: 'wife_jolly' };
