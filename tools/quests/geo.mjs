// Where every quest's giver stands and where each of its steps takes you, as points on the land: shared by
// tools/quests/report.mjs and tests/quest-loop.test.mjs. Nothing here needs a page.
import { RULES, placeSpot } from '../../src/folk/quests.js';
import { QUESTS } from '../../src/folk/lines/quests.js';
import { PEOPLE, POSTED, CROWD } from '../../src/folk/people.js';
import { BEYOND } from '../../src/folk/lines/beyond.js';
import { SITES, KNOLL } from '../../src/core/lands.js';
import { PHOBOS } from '../../src/core/phobos-data.js';
import { DELVES, BOSSES } from '../../src/core/dungeon.js';

const TOWN = { x: 10, z: 0 };
// The few named areas that aren't a place's key (src/folk/quests.js AREAS; src/ui/autobrain.js area()).
const NAMED = {
  catacombs: { x: 190, z: 0 }, bellcrypt: { x: 190, z: 0 }, woods: { x: -45, z: 150 }, millhaven: { x: 1840, z: 360 }, fen: { x: -250, z: -3400 }, waste: { x: -3200, z: -430 },
};
const delveOf = (key) => DELVES.find((d) => d.key === key);
// A delve's way in, out on the land: its own portal, or (a ward gone into from another) the portal of the first delve up
// its chain of links that has one out there.
function portalOf(key, seen = new Set()) {
  const d = delveOf(key);
  if (!d || seen.has(key)) return null;
  seen.add(key);
  const p = d.portal;
  if (p && Number.isFinite(p.x) && Math.abs(p.z) < 5600) return { x: p.x, z: p.z };
  for (const o of DELVES) if ((o.links || []).some((l) => l.to === key)) { const q = portalOf(o.key, seen); if (q) return q; }
  return null;
}

// Where someone stands: { x, z, where } (where: 'bellmourn', a place's key, 'phobos', or a delve's key).
export function whereIs(id) {
  if (id === 'lisandra') return { ...TOWN, where: 'bellmourn' };
  const p = PEOPLE.find((q) => q.id === id);
  if (p) return { ...TOWN, where: 'bellmourn' };
  const b = BEYOND.find((q) => q.id === id);
  if (b) return { x: b.at?.[0] ?? KNOLL.x, z: b.at?.[1] ?? KNOLL.z - 10, where: 'belltower' };
  const q = POSTED.find((o) => o.id === id);
  if (q) {
    const d = q.sewer || q.delve;
    if (d) { const at = portalOf(d) || { x: PHOBOS.x ?? 10000, z: 0 }; return { ...at, where: d, down: d }; }
    return { x: q.post[0], z: q.post[1], where: q.hub ? 'phobos' : q.camp || nearestSite(q.post[0], q.post[1]) };
  }
  const c = CROWD.find((o) => o.id === id);
  if (c) { const d = PHOBOS.districts.find((k) => k.key === c.area) || PHOBOS.districts[0]; return { x: d.x, z: d.z, where: 'phobos' }; }
  return null;
}
export function nearestSite(x, z) {
  let best = null, bd = 1e9;
  for (const [k, s] of Object.entries(SITES)) { const d = Math.hypot(x - s.x, z - s.z) - s.r; if (d < bd) { bd = d; best = k; } }
  return bd < 200 ? best : null;
}

// Where a step's work is: a list of points (a visit has several), each { x, z, what }. A boss or anything down a delve is
// that delve's way in. Null for work that's wherever you are (a bring with nowhere named, a start).
export function stepSpots(id, st) {
  const giver = whereIs(QUESTS[id].giver);
  const spot = (k) => {
    if (NAMED[k]) return { ...NAMED[k], what: k };
    const d = delveOf(k) || (k.startsWith('room:') ? DELVES.find((q) => q.rooms.some((r) => r.id === k.slice(5))) : null);
    if (d) { const p = portalOf(d.key); return p ? { ...p, what: k, delve: d.key } : null; }
    const p = placeSpot(k);
    return p ? { x: p.x, z: p.z, what: k } : null;
  };
  if (st.talk) { const w = whereIs(st.talk); return w ? [{ x: w.x, z: w.z, what: `talk:${st.talk}`, down: w.down }] : []; }
  if (st.back) return giver ? [{ x: giver.x, z: giver.z, what: 'back', down: giver.down }] : [];
  if (st.boss) { const b = BOSSES.find((q) => q.key === st.boss), p = b && portalOf(b.delve); return p ? [{ ...p, what: `boss:${st.boss}`, delve: b.delve }] : []; }
  if (st.visit) return st.visit.map(spot).filter(Boolean);
  if (st.clear) { const p = placeSpot(`outpost:${st.clear}`); return p ? [{ x: p.x, z: p.z, what: `clear:${st.clear}` }] : []; }
  const k = st.enter || st.kill || st.gather || st.at;
  if (typeof k === 'string') { const p = spot(k); return p ? [p] : []; }
  if (st.bring) return giver ? [{ x: giver.x, z: giver.z, what: `bring:${st.bring}` }] : [];
  return [];
}

// A quest walked from its giver: each leg's straight-line length, the furthest its work takes you from the giver, and
// whether it ends where it began (a `back`, or a hand-in at the giver) or somewhere else (`end: true`).
export function walk(id) {
  const R = RULES[id], g = whereIs(QUESTS[id].giver);
  if (!g) return null;
  let at = g, far = 0, total = 0;
  const legs = [];
  for (const st of R.steps) {
    const spots = stepSpots(id, st);
    for (const s of spots) {
      // (Down the same delve as the giver stands in: no walk at all.)
      const d = s.down && s.down === at.down ? 0 : Math.hypot(s.x - at.x, s.z - at.z);
      legs.push({ what: s.what, d });
      total += d; far = Math.max(far, Math.hypot(s.x - g.x, s.z - g.z));
      at = s;
    }
  }
  const last = R.steps[R.steps.length - 1];
  const oneWay = !!last.end && !!last.talk && last.talk !== QUESTS[id].giver;
  // (A bring is handed in at the giver: home again.)
  const home = oneWay ? 0 : Math.hypot(at.x - g.x, at.z - g.z);
  if (!oneWay && home > 1 && !last.back) { legs.push({ what: 'hand in', d: home }); total += home; }
  return { id, giver: QUESTS[id].giver, from: g, legs, far, total, oneWay, ends: oneWay ? whereIs(last.talk) : g };
}
