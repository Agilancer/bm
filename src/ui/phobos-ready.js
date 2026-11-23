// The skull's "Ready for Phobos" (src/ui/lands.js, behind 6669): straight to the road outside City State Phobos's Drawbridge
// Gate, at a level for one stretch of what's there, with that stretch's first quests in your log, everything before it done,
// and a set of clothes and kit to match it on you. Four stretches, as the quests run (src/folk/phobos-quests.js
// PHOBOS_LEVELS): the city, the sewers under it, Castle Velscour's Lower Ward, its Middle Ward.
import { PHOBOS_LEVELS, PHOBOS_RULES } from '../folk/phobos-quests.js';
import { PHOBOS } from '../core/phobos-data.js';
import { MAX_EXTRA } from '../items/pack.js';
import { ROBES, rollGem, rollRobe, rollShield, rollSkull, rollWeapon, GEMS } from '../items/items.js';
import { rollPartyGear } from '../items/partygear.js';
import { roleOf } from '../core/dungeon.js';

const ALL = PHOBOS_LEVELS.map(([id]) => id);
const upTo = (last) => ALL.slice(0, ALL.indexOf(last) + 1);
// (The road out from the Drawbridge Gate, a little way west of it: you walk in.)
const GATE = PHOBOS.gates.find((g) => g.name === 'The Drawbridge Gate');
export const OUTSIDE = [GATE.x - 70, GATE.z];

// Each: what it's called, the level you're put at, the quests done before it, the ones it begins, and the rarities of the
// kit (RARITIES in src/items/items.js: 2 rare, 3 epic, 4 legendary, 5 mythical; the skull takes the higher).
// (The way in: Wenna Coyle's word from the Sill to each of the city's three hubs, src/folk/regions/east.js. Out in the land
// they wait on Ines Mar's word coming down to her; begun here, you're past the land already.)
export const WAY_IN = ['smoke_in_the_east', 'wardens_of_ash', 'quiet_men'];
export const READY = [
  { key: 'city', name: 'The City', what: "Its three hubs, and the way in: Wenna Coyle's three words from the Sill", level: 22,
    done: [], begin: WAY_IN, rarity: [3, 3] },
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

// ---- PHOBOS SUMMONS ME (the owner, 2026-11-20): everything at once, ready to take down Velscour. -----------------------
// Outside the Drawbridge Gate; every quest that leads into the city or the castle from a hub out in the land begun (the
// three that do: Wenna Coyle's from the Sill, WAY_IN); you and your party at a level for every
// encounter and every dungeon in Phobos and Castle Velscour (the Feast That Walks, the last of them, wants 88: SUMMON_LEVEL
// is past it); legendary gear on you in every slot there's gear for (staff, shield, robes), a mythical skull, every socket
// filled with the finest gems, a second set and more gems in the pack, and every cell of the pack let out; and a full
// party, each of them in legendary gear in all eight of their slots and a spare set in their bag.

export const SUMMON_LEVEL = 100;
export const SUMMON_QUESTS = WAY_IN;
const ROBE_SLOTS = ['head', 'chest', 'shoulders', 'legs', 'feet'];
const TOP_GEM = 4;   // Perfect (items.js GEM_GRADES)

// What you'd wear: a legendary staff and shield, a mythical skull, legendary robes, their sockets full of perfect gems.
function kitOf(rng) {
  const gemOf = (i) => rollGem(rng, { kind: Object.keys(GEMS)[i % Object.keys(GEMS).length], grade: TOP_GEM });
  const kit = { main: rollWeapon(rng, { rarity: 4, sockets: 4 }), off: rollShield(rng, { rarity: 4 }), skull: rollSkull(rng, { rarity: 5, sockets: 4 }) };
  if (Object.keys(ROBES).length) for (const slot of ROBE_SLOTS) kit[slot] = rollRobe(rng, { rarity: 4, slot });
  let g = 0;
  for (const it of [kit.main, kit.skull, kit.off]) for (let k = 0; k < (it.sockets || 0); k++) (it.gems ||= []).push(gemOf(g++));
  return kit;
}

// pack, party (src/ui/party.js), the quest book, an rng, and keep(item) for what won't fit the pack. Says what it did.
export function summon({ pack, party, book, rng, keep }) {
  pack.level = SUMMON_LEVEL;
  pack.extra = MAX_EXTRA;
  // On you: the old into the pack, the new on.
  const kit = kitOf(rng);
  for (const [slot, it] of Object.entries(kit)) { const was = pack.slots[slot]; pack.slots[slot] = it; if (was && !pack.add(was)) keep(was); }
  // And a second set, and a pouch of perfect gems, in the pack.
  for (const it of Object.values(kitOf(rng))) if (!pack.add(it)) keep(it);
  for (let i = 0; i < 12; i++) { const gem = rollGem(rng, { kind: Object.keys(GEMS)[i % Object.keys(GEMS).length], grade: TOP_GEM }); if (!pack.add(gem)) keep(gem); }
  pack.gold += 100000;
  const begun = readyQuests(book, { done: [], begin: SUMMON_QUESTS });
  // A full party: a tank and a healer first, the rest to do the damage, from those the Company has free; hired free.
  let hired = 0;
  if (party && !party.full()) {
    party.makeOffers();
    const want = ['tank', 'heal', 'dps', 'dps'];
    const have = party.members.map((m) => roleOf(m.cls));
    for (const r of have) { const i = want.indexOf(r); if (i >= 0) want.splice(i, 1); }
    for (const r of want) {
      if (party.full()) break;
      const o = (party.offers || []).find((x) => roleOf(x.cls) === r) || (party.offers || [])[0];
      if (o && party.hire(o, true)) hired++;
    }
  }
  // Each of them: legendary in every slot they can wear, a spare set in their bag.
  let dressed = 0;
  for (const m of party?.members || []) {
    const e = party.entryOf(m), who = party.whoOf(m);
    if (!e) continue;
    for (const slot of ['weapon', 'off', 'helm', 'shoulders', 'chest', 'arms', 'legs', 'boots']) {
      const it = rollPartyGear(rng, { who, slot, ilvl: SUMMON_LEVEL, rarity: 4 });
      if (it.slot !== slot) continue;
      e.gear[slot] = it;
      (e.bag ||= []).push(rollPartyGear(rng, { who, slot, ilvl: SUMMON_LEVEL, rarity: 4 }));
    }
    party.dress(m); dressed++;
  }
  return { begun, hired, dressed };
}
