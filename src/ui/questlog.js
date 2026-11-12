// The quest log's workings, kept apart from its drawing (src/ui/folk.js drawBook) so they can be tested without a page: what
// each quest you've taken on is, its steps so far, what it pays, where it takes place (for the map: src/ui/map.js showPlace),
// and, when nothing's asked of you, what you should be doing. The words of the quests are src/folk/lines/; their workings
// src/folk/quests.js.
//
// A spot is a place on the map: { x, z, name }, with r (metres) when anywhere round it counts, below when it's down in the
// catacombs (the map shows the church's own chart if you're in it), and who when it's someone, who walks about (the map
// follows them: src/ui/folk.js gives it where they are).
import { churchAt } from '../core/church.js';
import { SITES } from '../core/lands.js';
import { OPENING } from '../core/opening.js';
import { PORTAL } from '../core/dungeon.js';
import { RULES } from '../folk/quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { PEOPLE } from '../folk/people.js';
import { BEYOND } from '../folk/lines/beyond.js';
import { LISANDRA } from '../folk/lines/lisandra.js';
import { CAMPS } from '../sim/slimes.js';
import { questLevel } from './autobrain.js';

export { questLevel };

// The first page of the log, till Bram's given you his errand.
export const START = 'You came down into Bellmourn with nothing: no coin, no bed. North of the well is the inn, the Tolling Bell. Bram Kettle keeps it, and counts every stranger through his door. Start with him.';
// Or, before that, till Lisandra's said her piece.
export const LIS_START = 'You came down into Bellmourn with nothing: no coin, no bed. Lisandra is waiting where the Long Road comes into town, with something to say. She always has something to say.';

const WHO = Object.fromEntries([...PEOPLE, ...BEYOND, LISANDRA].map((p) => [p.id, p]));
// Someone by name and what they are: "Silas Crane, the undertaker"; "Jory Pell, the night watchman"; "Ser Anselm Toller, the
// Bellwright, at the Tower ...". (A title's own names keep their capitals: the reeve of Bellmourn, the cook at the Bell.)
const PROPER = new Set(['Bellmourn', 'Bell', 'Watch', 'Ashby', 'Halloway']);
export function describe(id) {
  const p = WHO[id];
  if (!p) return id;
  if (!p.title) return p.name;
  if (/^(the|late|lady|lord) /i.test(p.title)) return `${p.name}, ${p.title}`;
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
  return s ? { x: s.x, z: s.z, r: s.r, name: s.name } : null;
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
  if (st.bring) return (mats[st.bring] || 0) >= (st.n || 1) ? giver() : one(areaSpot('catacombs'));
  if (st.warden) return one(areaSpot('bellcrypt'));
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

// ---- what to do, when nothing's asked of you ---------------------------------------------------------------------------------

// The hint under the log while you've no quest taken on: { title, text, items: [{ text, spot }] }, or null while you have one.
// ctx: { Q, stage (the opening's, src/core/opening.js OPENING), lisHere (she's at the town's edge), level, person(id), px, pz }
export function hintOf(ctx) {
  const { Q, stage = OPENING.ARRIVED, lisHere = false, level = 1, person, px = 0, pz = 0 } = ctx;
  if (Q.active().length) return null;
  // On the way down.
  if (stage > 0 && stage < OPENING.ESCORT) {
    return { title: "Lisandra's cave", text: "You've woken in Lisandra's cave. Hear her out and do as she says: she'll see you out of it, and down to the town.", items: [] };
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
