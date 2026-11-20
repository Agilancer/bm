// The skull's "Ready for Phobos" (src/ui/lands.js, behind 6669): straight to the road outside City State Phobos's Drawbridge
// Gate, at a level for one stretch of what's there, with that stretch's first quests in your log, everything before it done,
// and a set of clothes and kit to match it on you. Four stretches, as the quests run (src/folk/phobos-quests.js
// PHOBOS_LEVELS): the city, the sewers under it, Castle Velscour's Lower Ward, its Middle Ward.
import { PHOBOS_LEVELS, PHOBOS_RULES } from '../folk/phobos-quests.js';
import { PHOBOS } from '../core/phobos-data.js';

const ALL = PHOBOS_LEVELS.map(([id]) => id);
const upTo = (last) => ALL.slice(0, ALL.indexOf(last) + 1);
// (The road out from the Drawbridge Gate, a little way west of it: you walk in.)
const GATE = PHOBOS.gates.find((g) => g.name === 'The Drawbridge Gate');
export const OUTSIDE = [GATE.x - 70, GATE.z];

// Each: what it's called, the level you're put at, the quests done before it, the ones it begins, and the rarities of the
// kit (RARITIES in src/items/items.js: 2 rare, 3 epic, 4 legendary, 5 mythical; the skull takes the higher).
export const READY = [
  { key: 'city', name: 'The City', what: "Its three hubs, and the way in: Hasket's, Ser Hale's and Garrick's quests", level: 21,
    done: [], begin: ['smoke_in_the_east', 'quiet_men', 'wardens_of_ash'], rarity: [3, 3] },
  { key: 'sewers', name: 'The Sewers', what: "Under the city: the keepers' Great Grate, down to the High Conduits", level: 31,
    done: upTo('the_approach_by_night'), begin: ['down_the_drains'], rarity: [3, 4] },
  { key: 'lowerward', name: 'The Lower Ward', what: "Up the Aqueduct into Castle Velscour: the Gate Captain and the Iron Barracks", level: 61,
    done: upTo('lamps_out_in_the_conduits'), begin: ['up_the_aqueduct'], rarity: [4, 4] },
  { key: 'middleward', name: 'The Middle Ward', what: "The Librarian's household, his servants, the Feast That Walks", level: 78,
    done: upTo('the_iron_muster'), begin: ['the_librarians_letters'], rarity: [4, 5] },
];

// The quests a stretch leaves done and begun, as a quest book (src/folk/quests.js QuestBook) holds them. Quiet: no toasts for
// each, one change at the end. Only what isn't done already is touched.
export function readyQuests(book, r) {
  for (const id of r.done) if (!book.done(id)) { book.q[id] = { stage: 'done' }; book.flags.add(`quest:${id}`); book.flags.add(`quest:${id}:done`); }
  const begun = [];
  for (const id of r.begin) {
    const needs = PHOBOS_RULES[id]?.needs;
    if (book.q[id] || (needs && !book.done(needs))) continue;
    book.q[id] = { stage: 'active', step: 0, n: 0 };
    book.flags.add(`quest:${id}`);
    begun.push(id);
  }
  if (begun.length) book.follow = begun[0];
  book.on.change();
  return begun;
}
