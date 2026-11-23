// The quest loop's rules (docs/QUEST-LOOP.md), as something that can be asked: what breaks them, by hub and by region.
// tests/quest-loop.test.mjs holds the whole game to them; `node tools/quests/check.mjs [region]` lists them for one part.
import { RULES, outpostOf } from '../../src/folk/quests.js';
import { QUESTS } from '../../src/folk/lines/quests.js';
import { POSTED } from '../../src/folk/people.js';
import { TRADES } from '../../src/folk/shops.js';
import { CAMPS, DENS } from '../../src/core/camps-data.js';
import { SITES } from '../../src/core/lands.js';
import { FACTIONS } from '../../src/core/wilds.js';
import { DELVES, BOSSES } from '../../src/core/dungeon.js';
import { questLevel, lairLevelOf } from '../../src/ui/autobrain.js';
import { walk, whereIs } from './geo.mjs';
import { REGIONS, regionOf } from './regions.mjs';

// How far a quest's work may be from whoever gave it, when you have to come back to them (m, as the crow flies).
export const LOCAL = 650;
// How far a one-way errand may take you: to the next hub along, never across a country.
export const LEAD = 1850;
// How many quests Bellmourn may give (its own, Lisandra's two and her door east among them).
export const TOWN_MAX = 17;
// How many each camp has, at the least; and how many kinds of work a hub with four or more must have.
export const CAMP_MIN = 3, KINDS_MIN = 3;
// One-way errands that go further than LEAD, and why each may.
export const LONG_LEADS = {
  the_door_east: "through Lisandra's door of candles: no walk at all",
  fv_home: "back through Lisandra's door",
};
// Hubs that send you nowhere on: the ends of their roads.
export const ROADS_END = new Set(['kestrel', 'eelpot', 'chapel', 'crown', 'fungus', 'scavengers', 'hollowwatch', 'peatrick', 'stones', 'hoarhide', 'climbers', 'shrine', 'candlecamp', 'wagon', 'phobos']);

const delveKey = (k) => (typeof k === 'string' && (DELVES.some((d) => d.key === k) || k.startsWith('room:')));
// What kind of work a step is.
export function kindOf(st) {
  if (st.boss || delveKey(st.enter) || delveKey(st.kill) || (st.visit || []).some(delveKey) || (st.bring && delveKey(st.at))) return 'delve';
  if (st.clear) return 'clear';
  if (st.gather) return 'gather';
  if (st.kill || st.warden) return 'kill';
  if (st.bring) return 'bring';
  if (st.visit || st.enter) return st.night ? 'night' : 'visit';
  if (st.talk) return 'word';
  return null;
}
export const kindsOf = (id) => [...new Set(RULES[id].steps.map(kindOf).filter(Boolean))];

// Where a quest is given: 'bellmourn', a camp's or a place's key, or 'phobos' (the city's, the castle's and their delves').
export const hubOf = (id) => personHub(QUESTS[id].giver);
export function personHub(pid) { const w = whereIs(pid); return !w ? null : w.down || w.where === 'phobos' || w.x > 9300 ? 'phobos' : w.where; }

// Every quest, walked: { id, hub, level, kinds, far, total, oneWay, to (the hub it ends at) }.
export function table() {
  return Object.keys(RULES).map((id) => {
    const w = walk(id), last = RULES[id].steps.at(-1);
    return { id, hub: hubOf(id), level: questLevel(id), kinds: kindsOf(id), far: w?.far ?? 0, total: w?.total ?? 0, oneWay: !!w?.oneWay, to: w?.oneWay ? personHub(last.talk) : null, legs: w?.legs || [] };
  });
}

// What breaks the rules: [{ hub, quest, rule, say }]. region: only that region's hubs.
export function violations(region = null) {
  const T = table(), out = [], bad = (hub, quest, rule, say) => out.push({ hub, quest, rule, say });
  const byHub = {};
  for (const q of T) (byHub[q.hub] ||= []).push(q);
  const inside = (hub) => hub === 'phobos';

  for (const q of T) {
    const R = RULES[q.id];
    // 1. Work is local: a quest you hand in where you took it never sends you far from there.
    if (!q.oneWay && !inside(q.hub) && q.far > LOCAL) bad(q.hub, q.id, 'local', `sends you ${Math.round(q.far)} m from ${QUESTS[q.id].giver} and back (${LOCAL} m at most): give it to someone there, or end it there (a talk with end: true)`);
    // 2. A one-way errand goes to the next hub, not across the land.
    if (q.oneWay && !inside(q.hub) && q.far > LEAD && !LONG_LEADS[q.id]) bad(q.hub, q.id, 'lead', `a one-way errand of ${Math.round(q.far)} m (${LEAD} m at most): send it to a nearer hub, and let that one send you on`);
    for (const st of R.steps) {
      // 8. A den to empty is one pinned for the camps, within reach, and of a level with the quest.
      if (st.clear) {
        const o = outpostOf(st.clear), d = DENS.find((k) => k.key === st.clear);
        if (!o) bad(q.hub, q.id, 'den', `clear: no outpost "${st.clear}"`);
        else if (!d) bad(q.hub, q.id, 'den', `clear: "${st.clear}" isn't pinned (src/core/camps-data.js DENS), so the next run of tools/wilds/place.mjs may move it`);
        else if (q.level < FACTIONS[o.faction].lvl - 2) bad(q.hub, q.id, 'level', `wanted at level ${q.level}, and ${o.name} is ${o.faction}'s, level ${FACTIONS[o.faction].lvl}: auto-play keeps clear of it till ${FACTIONS[o.faction].lvl}`);
      }
      for (const k of [st.kill, st.gather, st.enter, ...(st.visit || [])].filter((v) => typeof v === 'string')) {
        if (k.startsWith('outpost:') && !DENS.some((d) => d.key === k.slice(8))) bad(q.hub, q.id, 'den', `"${k}" isn't pinned (src/core/camps-data.js DENS)`);
        // 9. A lair to hunt at is one auto-play is fit for at the quest's level.
        const lv = k.startsWith('lair:') ? lairLevelOf(k.slice(5)) : k.startsWith('outpost:') && outpostOf(k.slice(8)) ? FACTIONS[outpostOf(k.slice(8)).faction].lvl : null;
        if ((st.kill || st.gather) && lv != null && q.level < lv - 2) bad(q.hub, q.id, 'level', `wanted at level ${q.level}, and "${k}" is level ${lv}`);
      }
      if (st.boss && !BOSSES.some((b) => b.key === st.boss)) bad(q.hub, q.id, 'boss', `no boss "${st.boss}"`);
    }
    // (What it needs first is given at the same hub, or is the errand that brought you.)
    for (const n of [].concat(R.needs || [])) { const p = T.find((k) => k.id === n); if (p && p.hub !== q.hub && p.to !== q.hub && !inside(q.hub)) bad(q.hub, q.id, 'needs', `needs ${n}, which is ${p.hub}'s and doesn't end here: nobody at ${q.hub} would know it's done`); }
  }

  // 3. Bellmourn is the first hub, not the only one.
  if ((byHub.bellmourn || []).length > TOWN_MAX) bad('bellmourn', null, 'town', `${byHub.bellmourn.length} quests are given in Bellmourn (${TOWN_MAX} at most)`);

  // 4. Every camp has somebody at it, somebody to sell to, and work.
  for (const c of CAMPS) {
    const folk = POSTED.filter((p) => p.camp === c.key);
    if (!folk.length) { bad(c.key, null, 'camp', 'nobody is posted here (src/folk/people.js POSTED, camp)'); continue; }
    if (!folk.some((p) => TRADES[p.trade]?.buys)) bad(c.key, null, 'camp', "nobody here buys what you carry (give one of them trade: 'sutler')");
    if ((byHub[c.key] || []).length < CAMP_MIN) bad(c.key, null, 'camp', `${(byHub[c.key] || []).length} quests given here (${CAMP_MIN} at the least)`);
  }

  for (const [hub, list] of Object.entries(byHub)) {
    if (inside(hub) || hub === null) continue;
    // 6. A hub's work is of several kinds.
    const kinds = new Set(list.flatMap((q) => q.kinds));
    if (list.length >= 4 && kinds.size < KINDS_MIN) bad(hub, null, 'kinds', `${list.length} quests of ${kinds.size} kind${kinds.size > 1 ? 's' : ''} (${[...kinds].join(', ')}): ${KINDS_MIN} at the least`);
    // 7. Each hub sends you on.
    if (list.length >= CAMP_MIN && !ROADS_END.has(hub) && !list.some((q) => q.oneWay && q.to && q.to !== hub)) bad(hub, null, 'on', 'nothing here sends you on to the next hub (a talk with end: true, with someone there)');
  }

  // 5. Every hub is come to by an errand from another, back to Bellmourn.
  const reached = new Set(['bellmourn']);
  for (let grew = true; grew;) { grew = false; for (const q of T) if (q.oneWay && q.to && reached.has(q.hub) && !reached.has(q.to)) { reached.add(q.to); grew = true; } }
  for (const hub of Object.keys(byHub)) if (hub !== 'null' && !reached.has(hub) && !inside(hub)) bad(hub, null, 'reach', "no chain of errands from Bellmourn ends here: nobody's sent to it");

  // (Every giver exists; every quest has a hub.)
  for (const q of T) if (!q.hub) bad(null, q.id, 'giver', `its giver, ${QUESTS[q.id].giver}, stands nowhere`);

  if (!region) return out;
  const R = REGIONS.find((r) => r.key === region);
  return out.filter((v) => R.hubs.includes(v.hub));
}
export { REGIONS, regionOf };
