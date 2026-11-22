// The quest log's workings, kept apart from its drawing (src/ui/folk.js drawBook) so they can be tested without a page: what
// each quest you've taken on is, its steps so far, what it pays, where it takes place (for the map: src/ui/map.js showPlace),
// and, when nothing's asked of you, what you should be doing. The words of the quests are src/folk/lines/; their workings
// src/folk/quests.js.
//
// A spot is a place on the map: { x, z, name }, with r (metres) when anywhere round it counts, below when it's down in the
// catacombs (the map shows the church's own chart if you're in it), and who when it's someone, who walks about (the map
// follows them: src/ui/folk.js gives it where they are).
import { churchAt } from '../core/church.js';
import { COUNTRIES, SITES, countryAt } from '../core/lands.js';
import { PHOBOS_RULES } from '../folk/phobos-quests.js';
import { OPENING } from '../core/opening.js';
import { BOSSES, DELVES, PORTAL } from '../core/dungeon.js';
import { RULES, gatherSpots, outpostOf, placeSpot } from '../folk/quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { CROWD, PEOPLE, POSTED } from '../folk/people.js';
import { BEYOND } from '../folk/lines/beyond.js';
import { LISANDRA } from '../folk/lines/lisandra.js';
import { CAMPS } from '../sim/slimes.js';
import { questLevel } from './autobrain.js';
import { MATS } from '../items/items.js';

export { questLevel };

// The first page of the log, till Bram's given you his errand.
export const START = 'You came down into Bellmourn with nothing: no coin, no bed. North of the well is the inn, the Tolling Bell. Bram Kettle keeps it, and counts every stranger through his door. Start with him.';
// Or, before that, till Lisandra's said her piece.
export const LIS_START = 'You came down into Bellmourn with nothing: no coin, no bed. Lisandra is waiting where the Long Road comes into town, with something to say. She always has something to say.';

// (And Phobos's people of the districts, who give work of their own: src/folk/lines/phobos-streets.js.)
const WHO = Object.fromEntries([...PEOPLE, ...POSTED, ...BEYOND, LISANDRA, ...CROWD.filter((p) => p.area && !p.swapOf)].map((p) => [p.id, p]));
// Someone by name and what they are: "Silas Crane, the undertaker"; "Jory Pell, the night watchman"; "Ser Anselm Toller, the
// Bellwright, at the Tower ...". (A title's own names keep their capitals: the reeve of Bellmourn, the cook at the Bell.)
const PROPER = new Set(['Bellmourn', 'Bell', 'Watch', 'Ashby', 'Halloway']);
export function describe(id) {
  const p = WHO[id];
  if (!p) return id;
  if (!p.title) return p.name;
  if (/^(the|late|lady|lord) /i.test(p.title)) return `${p.name}, ${p.title}`;
  // (Those posted out in the land have titles written as they're said, with their places' names: only the first word's lowered.)
  if (POSTED.includes(p)) { const t = `${p.title.charAt(0).toLowerCase()}${p.title.slice(1)}`; return `${p.name}, ${/^(out of|of|from) /.test(t) ? '' : 'the '}${t}`; }
  return `${p.name}, the ${p.title.split(' ').map((w) => (PROPER.has(w) ? w : w.toLowerCase())).join(' ')}`;
}
export const nameOf = (id) => WHO[id]?.name || id;

// ---- where -----------------------------------------------------------------------------------------------------------------

const CRYPT = churchAt(186, 0);           // the Bell Crypt, where the long stair lets out (src/ui/trail.js)
const SEXTON_DOOR = churchAt(126.9, 9.5);  // the Sexton's Door, in the back wing's wall (src/core/church.js SEXTON)
const PINES = [-214, 180];                 // the pines either side of the Long Road, west of the town (src/ui/trail.js)
export const TOWN = { x: 2, z: 3, name: 'Bellmourn' };
const camp = (k) => CAMPS.find((c) => c.key === k);

// Where a place in a quest's steps is (src/folk/quests.js AREAS), as a spot.
export function areaSpot(k) {
  if (k === 'catacombs') return { x: CRYPT[0], z: CRYPT[1], below: true, name: 'The catacombs, under the cathedral' };
  if (k === 'bellcrypt') return { x: CRYPT[0], z: CRYPT[1], below: true, name: 'The Bell Crypt, under the cathedral' };
  if (k === 'woods') return { x: PINES[0], z: PINES[1], r: 70, name: 'The woods outside Bellmourn' };
  // (The jellies keep the millpond and the east shore: src/sim/slimes.js CAMPS.)
  if (k === 'millhaven') { const c = camp('millpond'); return c ? { x: c.x, z: c.z, r: c.r, name: "Abel's millpond, Millhaven" } : areaSpot('farm'); }
  if (k === 'fen') { const c = camp('sallow'); return c ? { x: c.x, z: c.z, r: c.r, name: "Sallowmere's east shore" } : areaSpot('sallow'); }
  const s = SITES[k];
  if (s) return { x: s.x, z: s.z, r: s.r, name: s.name };
  // A party dungeon: its portal, out in the land. The Waste, where Velscour's knights ride: the Vigil Road through it.
  const d = DELVES.find((q) => q.key === k);
  if (d) return { x: d.portal.x, z: d.portal.z, name: `${d.name}: its portal` };
  // A room down one ('room:<id>'): its delve's portal, named for the room.
  const rd = k.startsWith('room:') ? DELVES.find((q) => q.rooms.some((r) => r.id === k.slice(5))) : null;
  if (rd) { const n = rd.rooms.find((r) => r.id === k.slice(5)).name; return { x: rd.portal.x, z: rd.portal.z, name: `${n[0].toUpperCase()}${n.slice(1)}, in ${rd.name}` }; }
  if (k === 'waste') return { x: -4250, z: -200, r: 700, name: 'The Ashen Waste, along the Vigil Road' };
  // One of the land's outposts ('outpost:<key>', src/core/wilds-data.js): by its own name.
  if (k.startsWith('outpost:')) { const o = outpostOf(k.slice(8)); return o ? { x: o.x, z: o.z, r: o.r + 12, name: o.name.replace(/^(an?|the) /, (m) => m[0].toUpperCase() + m.slice(1)) } : null; }
  // A lair (src/core/tripo-monsters.js LAIRS): its glade, named by the nearest place.
  const at = placeSpot(k);
  if (!at) return null;
  let near = null, nd = 700;
  for (const q of Object.values(SITES)) { const dd = Math.hypot(q.x - at.x, q.z - at.z); if (dd < nd) { nd = dd; near = q; } }
  return { x: at.x, z: at.z, r: at.near, name: near ? (nd < near.r * 1.3 ? near.name : `Near ${near.name}`) : 'Out in the wilds' };
}
// A boss of a party dungeon (src/core/dungeon.js BOSSES): down its dungeon, so its portal.
function bossSpot(key) {
  const b = BOSSES.find((q) => q.key === key), d = b && DELVES.find((q) => q.key === b.delve);
  return d ? { x: d.portal.x, z: d.portal.z, name: `${b.name}, in ${d.name}` } : null;
}

// Someone, where they are now (person(id): { x, z } or null when they can't be found).
function personSpot(id, person) {
  const at = person?.(id);
  return { who: id, name: nameOf(id), ...(at ? { x: at.x, z: at.z } : {}) };
}

// Where a quest you've taken on takes place now: { spots, where } (where: the same in words), or null.
// ctx: { Q (a QuestBook), mats (the satchel), person(id) }
export function placeOf(id, ctx) {
  const { Q, mats = {}, person } = ctx;
  const s = Q.state(id), q = QUESTS[id];
  if (!s || s.stage === 'done') return null;
  const one = (spot) => (spot ? { spots: [spot], where: spot.who ? describe(spot.who) : spot.name } : null);
  const giver = () => one(personSpot(q.giver, person));
  if (s.stage === 'making') return giver();
  const st = RULES[id].steps[s.step];
  if (!st) return null;
  if (st.talk) return one(personSpot(st.talk, person));
  if (st.back) return giver();
  // Everyone still to take work from.
  if (st.start) {
    const left = st.start.filter((p) => !(s.seen || []).includes(p));
    return left.length ? { spots: left.map((p) => personSpot(p, person)), where: left.map(nameOf).join(', ') } : null;
  }
  // Something to bring: from the catacombs, then to the giver once you've all of it.
  if (st.bring) return (mats[st.bring] || 0) >= (st.n || 1) ? giver() : one(areaSpot(st.at || 'catacombs'));
  if (st.clear) return one(areaSpot(`outpost:${st.clear}`));
  // Things to gather: each still lying there, under the place's name.
  if (st.gather) {
    const got = s.got || [], at = areaSpot(st.gather), left = gatherSpots(id, st).map(([x, z], i) => ({ x, z, name: at?.name || 'Out in the wilds', i })).filter((m) => !got.includes(m.i));
    return left.length ? { spots: left, where: at?.name || 'Out in the wilds' } : null;
  }
  if (st.warden) return one(areaSpot('bellcrypt'));
  if (st.boss) return one(bossSpot(st.boss));
  // (The way down to the dead, the first time: the Sexton's Door, which Silas's key opens.)
  if (st.enter === 'catacombs') return one({ x: SEXTON_DOOR[0], z: SEXTON_DOOR[1], name: "The Sexton's Door, the way down" });
  if (st.enter) return one(areaSpot(st.enter));
  if (st.kill) return one(areaSpot(st.kill));
  if (st.visit) {
    const left = st.visit.filter((k) => !(s.seen || []).includes(k)).map(areaSpot).filter(Boolean);
    return left.length ? { spots: left, where: left.map((a) => a.name).join(', ') } : null;
  }
  return null;
}

// ---- what it is ------------------------------------------------------------------------------------------------------------

// Its steps so far: those done, then the one you're on (with its count, as the journal has it). [{ text, done }]
export function stepsOf(id, Q) {
  const s = Q.state(id), text = QUESTS[id].journal;
  if (!s || s.stage === 'done') return [];
  const n = s.stage === 'making' ? RULES[id].steps.length : s.step;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ text: text[Math.min(i, text.length - 1)], done: true });
  out.push({ text: Q.journalLine(id), done: false });
  return out;
}

// What it pays, in words: "60 gold, 200 experience"; "a skull, 150 experience".
export function rewardOf(id) {
  const R = RULES[id], out = [];
  if (R.item === 'skull') out.push(R.rarity === 0 ? 'a plain skull' : 'a carved skull');
  else if (R.item === 'staff') out.push('a forged staff');
  else if (R.item === 'robe') out.push('a new robe');
  else if (R.item === 'scroll') out.push('a spell scroll');
  if (R.charm) out.push(R.charmName || 'a charm');
  if (R.gold) out.push(`${R.gold} gold`);
  if (R.xp) out.push(`${R.xp} experience`);
  return out.join(', ');
}

// Who gave it: "Silas Crane, the undertaker".
export const giverOf = (id) => describe(QUESTS[id].giver);

// ---- how the log sorts and shows them ------------------------------------------------------------------------------------

// The part of the world a quest belongs to, for the log's headings (as the old games sort theirs by zone): Bellmourn for the
// town's own and Lisandra's; City State Phobos for the city's; out in the land, the country its giver keeps to (or, for one
// who isn't posted anywhere, the country of the quest's first place).
export const ZONES = ['Bellmourn', ...Object.values(COUNTRIES).map((c) => c.name), 'City State Phobos', 'Out in the land'];
const zoneAt = (x, z) => COUNTRIES[countryAt(x, z)]?.name || 'Out in the land';
export function zoneOf(id) {
  const q = QUESTS[id], p = WHO[q.giver];
  if (PHOBOS_RULES[id] || p?.area) return 'City State Phobos';
  const at = p?.post || p?.at;
  if (Array.isArray(at)) return zoneAt(at[0], at[1]);
  if (BEYOND.includes(p)) {
    const st = RULES[id].steps.find((s) => s.enter || s.kill || s.visit), k = st && (st.enter || st.kill || st.visit[0]), sp = k && areaSpot(k);
    return sp && Number.isFinite(sp.x) ? zoneAt(sp.x, sp.z) : 'Out in the land';
  }
  return 'Bellmourn';
}
export const zoneRank = (z) => { const i = ZONES.indexOf(z); return i < 0 ? ZONES.length : i; };

// A quest's level against yours, coloured as the old games did: far over you red, over orange, about right yellow, under
// green, long past grey.
export function levelTone(want, lvl) {
  const d = want - lvl;
  return d >= 5 ? 'red' : d >= 3 ? 'orange' : d >= -2 ? 'yellow' : d >= -8 ? 'green' : 'grey';
}

// What it asks of you, as the log lists it: the steps done (struck through), then the one under way, with how far along it
// is where that can be counted. [{ text, done, have, need, ready }]. mats: the satchel; day: today.
export function objectivesOf(id, Q, mats = {}, day = 0) {
  const s = Q.state(id);
  if (!s || s.stage === 'done') return [];
  const out = stepsOf(id, Q).map((t) => ({ ...t }));
  const cur = out[out.length - 1];
  if (s.stage === 'making') { cur.ready = day >= s.ready; return out; }
  const st = RULES[id].steps[s.step];
  if (!st) return out;
  if (st.kill || st.gather) { cur.have = s.n || 0; cur.need = st.n; }
  else if (st.visit || st.start) { cur.have = (s.seen || []).length; cur.need = (st.visit || st.start).length; }
  else if (st.bring) { cur.need = st.n || 1; cur.have = Math.min(mats[st.bring] || 0, cur.need); cur.ready = cur.have >= cur.need; }
  else if (st.back) cur.ready = true;
  // (The count is shown on its own, as a bar: not in the words as well.)
  if (cur.need > 1) cur.text = cur.text.replace(/\s*\(\d+ of \d+\)\s*$/, '');
  return out;
}

// Where a quest stands, for its row and the tracker: 'ready' (to hand in, or what's being made is ready to collect), 'wait'
// (made overnight, ready tomorrow), or ''.
export function standOf(id, Q, mats = {}, day = 0) {
  const s = Q.state(id);
  if (!s || s.stage === 'done') return '';
  if (s.stage === 'making') return day >= s.ready ? 'ready' : 'wait';
  const st = RULES[id].steps[s.step];
  return st?.back || (st?.bring && (mats[st.bring] || 0) >= (st.n || 1)) ? 'ready' : '';
}

// The line under its name in the list and the tracker: how far along it is, or who to go back to.
export function shortOf(id, Q, mats = {}, day = 0) {
  const s = Q.state(id);
  if (!s || s.stage === 'done') return '';
  const stand = standOf(id, Q, mats, day), giver = nameOf(QUESTS[id].giver);
  if (stand === 'wait') return `Ready tomorrow, from ${giver}`;
  if (stand === 'ready') return s.stage === 'making' ? `Ready: collect it from ${giver}` : `Hand it in to ${giver}`;
  const o = objectivesOf(id, Q, mats, day).at(-1);
  const st = RULES[id].steps[s.step];
  if (st?.talk) return `Speak to ${nameOf(st.talk)}`;
  return o?.need ? `${o.have} / ${o.need}` : '';
}

// The tracker's few words for what's being counted, as the big games keep them ("Goat Men slain 0/3", "Grave Iron 2/8"):
// never the step's whole sentence, which a narrow tracker would cut. '' only for a step with nothing counted.
export function tallyOf(id, Q) {
  const st = Q.step(id);
  if (st?.bring) return MATS[st.bring]?.plural || 'Gathered';
  if (st?.kill) {
    if (st.foe?.length === 1) return `${st.foe[0]} slain`;
    if (st.of === 9) return 'Jellies slain';
    // (The dead of Bellmourn's own ground: the catacombs under the cathedral, and the woods round it.)
    if (st.kill === 'catacombs') return 'Dead in the catacombs';
    if (st.kill === 'woods') return 'Dead in the woods';
    return 'Foes slain';
  }
  if (st?.gather) return st.what ? `${st.what.charAt(0).toUpperCase()}${st.what.slice(1)}` : 'Gathered';
  if (st?.clear) return 'Cleared';
  if (st?.visit) return 'Places seen';
  if (st?.start) return 'People seen';
  return '';
}

// What it pays, as the log shows it: a picture (a kit icon) and the words for each. [{ ic, text, gold, xp }]
export function rewardsOf(id) {
  const R = RULES[id], out = [], cap = (t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  // (pic: a picture of one like it, from the pack's own (assets/game/items/icons/); tall: a staff, laid across its square.)
  const item = { skull: ['slot_skull', R.rarity === 0 ? 'A plain skull' : 'A carved skull', 'skull_01'], staff: ['slot_main', 'A forged staff', 'driftwood_staff', true], robe: ['slot_chest', 'A new robe', 'ash_coat_chest'], scroll: ['book', 'A spell scroll'] }[R.item];
  if (item) out.push({ ic: item[0], text: R.named || item[1], pic: item[2], tall: item[3] });
  if (R.charm) out.push({ ic: 'slot_neck', text: cap(R.charmName || 'a charm') });
  if (R.gold) out.push({ ic: 'gold', text: `${R.gold} gold`, gold: true });
  if (R.xp) out.push({ xp: true, text: `${R.xp.toLocaleString('en-GB')} experience` });
  return out;
}

// ---- what to do, when nothing's asked of you ---------------------------------------------------------------------------------

// The hint under the log while you've no quest taken on: { title, text, items: [{ text, spot }] }, or null while you have one.
// ctx: { Q, stage (the opening's, src/core/opening.js OPENING), fight (how many of the road's dead are left, while they're up), lisHere (she's at the town's edge), level, person(id), px, pz }
export function hintOf(ctx) {
  const { Q, stage = OPENING.ARRIVED, fight = 0, lisHere = false, level = 1, person, px = 0, pz = 0 } = ctx;
  if (Q.active().length) return null;
  // On the way down.
  if (stage > 0 && stage < OPENING.ESCORT) {
    return { title: "Lisandra's cave", text: "You've woken in Lisandra's cave. Hear her out and do as she says: she'll see you out of it, and down to the town.", items: [] };
  }
  // The dead up on the road: that's the work now, until every one of them is down.
  if (stage === OPENING.ESCORT && fight > 0) {
    return { title: 'Kill the zombies and the necromancers', text: "The dead have come up out of the ground either side of the Long Road. Kill the zombies and the necromancers who raise them: Lisandra stands with you, and nobody goes on down to Bellmourn until every one of them is down.", items: [] };
  }
  if (stage === OPENING.ESCORT) {
    return { title: 'The Long Road', text: "Follow Lisandra down the Long Road to Bellmourn: the gold dots on the ground go after her. When the dead come up out of the pines, she'll stand with you, and on the way down you can't die.", items: [{ text: 'Bellmourn, at the foot of the hill', spot: TOWN }] };
  }
  // Before any work: Lisandra at the edge of town, or Bram at the inn.
  if (!Q.started()) {
    const who = lisHere ? LISANDRA.id : 'bram';
    return { title: 'Bellmourn', text: lisHere ? LIS_START : START, items: [{ text: describe(who), spot: personSpot(who, person) }] };
  }
  const all = Object.keys(RULES);
  if (all.every((id) => Q.done(id))) {
    return {
      title: 'Every quest is done',
      text: "Everyone with work to give has had it done. What's left is the fight: the knight on the cathedral steps, the Hollowfang Warrens (the Free Company's quartermasters, by the square and at the portal, will hire you a party for them), and the dead, who keep coming. Get stronger.",
      items: [
        { text: 'The Hollowfang Warrens: its portal, in the woods', spot: { x: PORTAL.x, z: PORTAL.z, name: 'The Hollowfang Warrens' } },
        { text: 'The cathedral steps', spot: (() => { const [x, z] = churchAt(60, 0); return { x, z, name: 'The cathedral steps' }; })() },
      ],
    };
  }
  // Work to be had: whoever has some for you, the work that suits you first, then the nearest.
  // (Not anyone who can't be found, like Lisandra before she's walked you down; unless that leaves nobody.)
  const offering = [...new Set(all.map((id) => QUESTS[id].giver))].filter((g) => Q.offers(g).length);
  const found = offering.filter((g) => !person || person(g));
  const givers = found.length ? found : offering;
  const suits = (g) => Math.min(...Q.offers(g).map(questLevel));
  const far = (g) => { const at = person?.(g); return at ? Math.hypot(at.x - px, at.z - pz) : 1e9; };
  // (What's beyond you yet, the nearest to your level first.)
  const over = (g) => Math.max(0, suits(g) - level);
  givers.sort((a, b) => over(a) - over(b) || far(a) - far(b));
  const items = givers.map((g) => ({ text: `${describe(g)}${suits(g) > level ? ` (their work suits level ${suits(g)} and up)` : ''}`, spot: personSpot(g, person) }));
  const green = givers.length && givers.every((g) => suits(g) > level);
  if (green) items.push({ text: 'The dead in the woods outside the town, for a level or two', spot: areaSpot('woods') });
  return {
    title: 'What to do now',
    text: givers.length
      ? `You've no work in hand. ${givers.length > 1 ? `${givers.length} people have` : 'Someone has'} work to give you: a yellow ! over the head marks them. Walk up and talk to them (E) to take it on.${green ? " What's on offer is a little beyond you yet: put down the dead in the woods round the town first. The town itself is safe ground if it goes badly." : ''}`
      : "Nobody has work for you just now. Get stronger in the meantime: the woods round Bellmourn are full of the dead.",
    items,
  };
}
