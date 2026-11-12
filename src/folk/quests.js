// The starter quests' workings: who gives each, its steps, what finishes them, what it pays. Every word of them is in
// src/folk/lines/quests.js; the talk that carries them is src/ui/folk.js. Kept on the render thread and saved with the game.
//
// A step is one of:
//   talk   go and say something to someone (say: the player's words; end: the quest ends with them, and is paid there)
//   enter  get to a place (night: only at night)
//   kill   put down n of the dead in a place
//   warden put down the Bell Crypt's warden
//   back   go back to the giver
//   bring  bring the giver n of a material (items.js MATS); handed over at the giver
//   start  take on a quest from each of a list of people, in any order (Lisandra's: src/folk/lines/lisandra.js)
//   visit  get to every one of a list of places, in any order
//   boss   put down one of the party dungeons' bosses, by its key (src/core/dungeon.js BOSSES); one already dead counts
// A place (enter, kill, visit) is an area named below (AREAS), any of the land's places by its key (src/core/lands.js SITES),
// a party dungeon by its key ('warrens', 'blackvigil', 'deeps': down inside it), or 'lair:<key>', the ground round one of the
// monsters' lairs (src/core/tripo-monsters.js LAIRS). kill takes of: the one kind that counts (9 a jelly), or foe: the
// monsters' groups that count (GROUPS' keys); at a lair only its own sort of monster counts.
// bring takes at: where what's wanted is found, for the trail (a place as above).
// wait: what's handed over is made overnight, and collected the next day.
// item: a skull, staff or robe it pays, rare (src/ui/folk.js reward); rarity: exactly how fine, for a skull.
import { churchAt, inChurch } from '../core/church.js';
import { inTown } from '../core/town.js';
import { QUESTS } from './lines/quests.js';
import { SITES, countryAt } from '../core/lands.js';
import { BY_ID, first } from './people.js';
import { GIVERS } from './lines/lisandra.js';
import * as DELVE from '../core/dungeon.js';
import { LAIRS } from '../core/tripo-monsters.js';
import { LAND_RULES } from './land-quests.js';

export const RULES = {
  // Lisandra's, at the edge of town once she's walked you down: go round everyone with work and start each of their quests.
  lisandra_work: { steps: [{ start: GIVERS }, { back: true, say: "They've all given me something to do." }], gold: 40, xp: 250 },
  // The first errand in town pays the first skull, a common one of Silas's: a new game starts with none (src/items/pack.js).
  bed_and_bell: { steps: [{ talk: 'silas', say: 'Bram Kettle sent me.' }, { back: true, say: "I've been to see Silas." }], item: 'skull', rarity: 0, xp: 40 },
  dead_cant_wait: { steps: [{ enter: 'catacombs' }, { kill: 'catacombs', n: 8 }, { back: true, say: 'Eight of them are at rest.' }], gold: 60, xp: 200 },
  bones_for_carver: { needs: 'dead_cant_wait', steps: [{ bring: 'bone', n: 10 }], wait: true, item: 'skull', xp: 150 },
  iron_from_dead: { steps: [{ bring: 'iron', n: 8 }], item: 'staff', xp: 150 },
  shroud_and_thread: { steps: [{ bring: 'silk', n: 8 }], wait: true, item: 'robe', xp: 150 },
  pines: { steps: [{ kill: 'woods', n: 12 }, { back: true, say: 'Twelve of them. Down.' }], gold: 80, xp: 300 },
  toll_of_bell: { steps: [{ enter: 'bellcrypt', night: true }, { warden: true }, { back: true, say: "The bell's warden is put down." }], item: 'scroll', xp: 400 },
  letter: { steps: [{ talk: 'elowen', say: 'A letter from Cedric Ashby. Into your hand.' }, { back: true, say: "Elowen's answer." }], xp: 120 },
  // Out past the town (src/folk/lines/beyond.js; the places are src/core/lands.js SITES). of: what must die (9 a jelly).
  long_way_round: { steps: [{ enter: 'belltower' }, { talk: 'bellwright', say: 'Corran Thrale asks why the dead walk wide of your hill.' }, { back: true, say: 'The Bellwright says it is the bells.' }], gold: 90, xp: 400 },
  millhaven_jelly: { steps: [{ kill: 'millhaven', n: 8, of: 9 }, { back: true, say: "Abel's millpond is clear." }], gold: 60, xp: 450 },
  four_watches: { steps: [{ visit: ['abbey', 'chapel', 'shrine'] }, { back: true, say: 'All three seals woke.' }], charm: 'wingbell', charmName: 'the Wingbell', xp: 900 },
  sallowmere: { steps: [{ kill: 'fen', n: 10, of: 9 }, { back: true, say: 'The east shore is clear.' }], gold: 90, xp: 600 },
  black_road: { steps: [{ enter: 'keep' }, { back: true, say: 'I saw the keep at the end of the west road.' }], gold: 200, xp: 900 },
  crown_of_teeth: { needs: 'toll_of_bell', steps: [{ enter: 'crown' }, { back: true, say: "I've been to the top of the Sorrowhorn." }], item: 'scroll', gold: 150, xp: 1200 },
  barrow_lights: { steps: [{ enter: 'barrows', night: true }, { kill: 'barrows', n: 6, of: 9 }, { back: true, say: 'The lights were jellies. Full of bones.' }], gold: 140, xp: 700 },
  // The small towns, the land's monsters and the party dungeons (src/folk/land-quests.js; words in src/folk/lines/land.js).
  ...LAND_RULES,
};

// The Bell Crypt: the octagon where the stair down lets out (tools/interior/build_interior.py, Stage I), in the world.
const CRYPT = { x0: churchAt(174, 0)[0], x1: churchAt(198, 0)[0], z: churchAt(0, 0)[1], hz: 12.5, y: -12 };
export const inCrypt = (x, y, z) => x > CRYPT.x0 && x < CRYPT.x1 && Math.abs(z - CRYPT.z) < CRYPT.hz && y < CRYPT.y;
export const isNight = (h) => h >= 21 || h < 4.5;

const AREAS = {
  catacombs: (x, y, z) => y < -6 && inChurch(x, y + 1, z),
  woods: (x, y, z) => y > -3 && !inTown(x, z, 10) && !inChurch(x, y + 1, z),
  bellcrypt: inCrypt,
};
// Out past the town: within reach of a named place (src/core/lands.js SITES), its radius stretched by s.
const near = (k, s = 1) => (x, y, z) => Math.hypot(x - SITES[k].x, z - SITES[k].z) < SITES[k].r * s;
for (const k of ['belltower', 'abbey', 'chapel', 'shrine', 'keep', 'crown', 'barrows']) AREAS[k] = near(k, k === 'keep' ? 1.6 : 1.2);
AREAS.millhaven = (x, y, z) => ['farm', 'mill', 'hamlet'].some((k) => near(k, 3)(x, y, z));
AREAS.fen = (x, y, z) => Math.hypot(x - SITES.sallow.x, z - SITES.sallow.z) < 1500;
// The Ashen Waste, all of it: the grey country the Vigil Road runs through.
AREAS.waste = (x, y, z) => Math.hypot(x, z) > 1700 && y > -20 && countryAt(x, z) === 'ashen';
// Any other of the land's places, by its key; down in a party dungeon, by its; and the ground round a lair.
for (const k of Object.keys(SITES)) AREAS[k] ??= near(k, 1.2);
for (const d of DELVE.DELVES || []) AREAS[d.key] = (x, y, z) => DELVE.delveAt?.(x, z) === d.key;
export const LAIR_REACH = 70;
for (const l of LAIRS) AREAS[`lair:${l.key}`] = (x, y, z) => Math.hypot(x - l.x, z - l.z) < l.r + LAIR_REACH;
export const areaAt = (k, x, y, z) => !!AREAS[k]?.(x, y, z);
export const hasArea = (k) => !!AREAS[k];

// Where a party dungeon's portal stands, out in the land (for the trail and the map): { x, z }.
export function delvePortal(key) {
  const d = (DELVE.DELVES || []).find((q) => q.key === key);
  if (d?.portal) return Array.isArray(d.portal) ? { x: d.portal[0], z: d.portal[1] } : d.portal;
  if (key === 'warrens') return DELVE.PORTAL;
  if (key === 'blackvigil') return { x: -4792, z: 128 };   // before the keep's gate, where the Vigil Road ends
  if (key === 'deeps') return { x: SITES.deepsmouth.x, z: SITES.deepsmouth.z };
  return null;
}
// Where a step's place is, to be led to: { x, z, near }, or null (the town's own, which src/ui/trail.js knows its ways to).
export function placeSpot(k) {
  if (k.startsWith('lair:')) { const l = LAIRS.find((q) => q.key === k.slice(5)); return l ? { x: l.x, z: l.z, near: l.r + 12 } : null; }
  const p = delvePortal(k);
  if (p) return { x: p.x, z: p.z, near: 3, delve: k };
  return SITES[k] ? { x: SITES[k].x, z: SITES[k].z, near: SITES[k].r * 0.8 } : null;
}

// What of a list of lines can be said now. A line is a string (said any time), or a line kept for before or after something:
//   { before: 'toll_of_bell', say }   until that quest is done (the bell still ringing)
//   { after: 'toll_of_bell', say }    once it is
//   { met: 'bram', say }              once the player has had a word with that person (the talk panel only: src/ui/folk.js)
// before and after take a quest's id (meaning done) or a flag as it stands ('quest:dead_cant_wait': that quest taken; 'arrived').
// say is what the plain line would have been: a string, or [speaker, text] in a quest's lines.
export function sayable(list, flags, met = null) {
  const has = (k) => flags.has(k.includes(':') || k === 'arrived' ? k : `quest:${k}:done`);
  const out = [];
  for (const l of list || []) {
    if (!l || typeof l !== 'object' || Array.isArray(l)) { out.push(l); continue; }
    if (l.before && has(l.before)) continue;
    if (l.after && !has(l.after)) continue;
    if (l.met && !met?.has(l.met)) continue;
    out.push(l.say);
  }
  return out;
}

export class QuestBook {
  // on: { change(), toast(text, kind), done(id) }
  constructor(on) {
    this.on = on;
    this.q = {};            // id -> { stage: 'active' | 'making' | 'done', step, n, ready }
    this.told = {};         // quest -> person -> how many of their lines on it they've said
    this.flags = new Set(); // what the town knows (src/folk/talk.js): 'arrived', 'quest:<id>', 'quest:<id>:done'
    this.follow = null;     // the quest the trail leads you to (src/ui/trail.js): an id, 'off', or null for the newest
  }

  state(id) { return this.q[id] || null; }
  step(id) { const s = this.q[id]; return s && s.stage === 'active' ? RULES[id].steps[s.step] : null; }
  active() { return Object.keys(this.q).filter((id) => this.q[id].stage !== 'done'); }
  done(id) { return this.q[id]?.stage === 'done'; }

  // The quest you're following: the one picked in the journal while it's under way, else the newest under way; before
  // anything's asked of you, 'start' (go and see Bram Kettle). Null when you've put the trail away.
  followed() {
    if (this.follow === 'off') return null;
    if (this.follow === 'start' && !this.started()) return 'start';
    const live = this.active();
    if (live.includes(this.follow)) return this.follow;
    if (live.length) return live[live.length - 1];
    return this.started() ? null : 'start';
  }

  // Whether you've taken up your first work in town: Bram's bed, or Lisandra's round of the town.
  started() { return !!(this.q.bed_and_bell || this.q.lisandra_work); }

  // Picked in the journal: follow it, or (picked again) put the trail away.
  pick(id) {
    this.follow = this.followed() === id ? 'off' : id;
    this.on.change();
  }

  // The quests this person has to give, now.
  offers(who) {
    return Object.keys(RULES).filter((id) => QUESTS[id].giver === who && !this.q[id] && (!RULES[id].needs || this.done(RULES[id].needs)));
  }

  begin(id) {
    // (Taken on, it's the one followed; but not over a round of the town still under way, which this is part of.)
    const was = this.followed();
    this.q[id] = { stage: 'active', step: 0, n: 0 };
    if (!(was && this.step(was)?.start)) this.follow = id;
    this.flags.add(`quest:${id}`);
    this.on.toast(`New quest: ${QUESTS[id].title}`, 'quest');
    this.on.begun?.(id);
    this.took(id);
    this.on.change();
  }

  // Someone's given you work: a tick on any list of people to take work from (a `start` step). Taking on the list itself
  // counts whoever's given you work already.
  took(id) {
    for (const k of this.active()) {
      const st = this.step(k);
      if (!st?.start) continue;
      const s = this.q[k], seen = (s.seen = s.seen || []);
      const who = k === id ? st.start.filter((p) => Object.keys(RULES).some((q) => q !== k && QUESTS[q].giver === p && this.q[q])) : [QUESTS[id].giver];
      const fresh = who.filter((p) => st.start.includes(p) && !seen.includes(p));
      if (!fresh.length) continue;
      seen.push(...fresh);
      if (seen.length >= st.start.length) this.advance(k);
      else if (k !== id) this.on.toast(`${QUESTS[k].title}: ${seen.length} of ${st.start.length}`, 'count');
    }
  }

  // What hangs over someone's head (src/ui/folk.js marks): 'ready' (a yellow ?) when there's a quest to hand in to them or
  // a step that's theirs to hear; 'offer' (a yellow !) when they've work to give; 'busy' (a grey ?) when work of theirs is
  // under way; else null. mats: what's in the satchel. day: today.
  mark(who, mats, day) {
    let busy = false;
    for (const id of Object.keys(RULES)) {
      const s = this.q[id];
      if (!s || s.stage === 'done') continue;
      const st = this.step(id), giver = QUESTS[id].giver === who;
      if (st?.talk === who) return 'ready';
      if (!giver) continue;
      if (s.stage === 'making' ? day >= s.ready : st?.back || (st?.bring && (mats[st.bring] || 0) >= st.n)) return 'ready';
      busy = true;
    }
    return this.offers(who).length ? 'offer' : busy ? 'busy' : null;
  }

  // On to the next step (or to the end of the last).
  advance(id) {
    const s = this.q[id];
    s.step++; s.n = 0;
    if (s.step < RULES[id].steps.length) this.on.toast(this.journalLine(id), 'step');
    this.on.change();
  }

  // Handed in at the giver: made overnight, or finished now.
  handIn(id, day) {
    const s = this.q[id];
    if (RULES[id].wait) { s.stage = 'making'; s.ready = day + 1; this.on.change(); return 'making'; }
    this.finish(id);
    return 'done';
  }

  finish(id) {
    this.q[id] = { stage: 'done' };
    this.flags.add(`quest:${id}:done`);
    this.on.toast(`Quest done: ${QUESTS[id].title}`, 'done');
    this.on.done(id);
    this.on.change();
  }

  // What the journal says to do now.
  journalLine(id) {
    const s = this.q[id], text = QUESTS[id];
    if (!s) return '';
    if (s.stage === 'making') return text.making || `Come back to ${text.giverName || 'them'} tomorrow.`;
    if (s.stage === 'done') return '';
    const step = RULES[id].steps[s.step];
    const line = text.journal[Math.min(s.step, text.journal.length - 1)];
    // (The way in, for work that's down among the dead and given before Silas has handed over his key.)
    const hint = s.step === 0 ? sayable([text.hint], this.flags)[0] : null;
    const list = step.visit || step.start;
    const count = step.kill ? ` (${s.n} of ${step.n})` : list ? ` (${(s.seen || []).length} of ${list.length})` : '';
    // Who's still to give you work, by name.
    const left = step.start ? step.start.filter((p) => !(s.seen || []).includes(p)).map((p) => first(BY_ID[p])) : [];
    return `${line}${count}${hint ? ` ${hint}` : ''}${left.length ? ` Still to see: ${left.join(', ')}.` : ''}`;
  }

  // ---- what the world reports ----

  // Something died at (x, y, z). kind as in drops.js: 8 a champion. group: which of the land's monsters it was (a key of
  // GROUPS in src/core/tripo-monsters.js), or null for anything else.
  kill(x, y, z, kind, group = null) {
    for (const id of this.active()) {
      const st = this.step(id);
      if (!st) continue;
      if (st.warden && kind === 8 && AREAS.catacombs(x, y, z)) { this.on.toast('The warden is down. Somewhere above, a rope goes slack.', 'step'); this.advance(id); continue; }
      if (!st.kill || !AREAS[st.kill](x, y, z) || kind === 2 || (st.of != null && kind !== st.of)) continue;
      if (st.foe ? !st.foe.includes(group) : st.kill.startsWith('lair:') && !group) continue;
      const s = this.q[id];
      s.n++;
      if (s.n >= st.n) this.advance(id);
      else { this.on.toast(`${QUESTS[id].title}: ${s.n} of ${st.n}`, 'count'); this.on.change(); }
    }
  }

  // One of the party dungeons' bosses is dead (EV.DELVE BOSS_DOWN, through src/main.js): remembered, so a quest taken after
  // the kill is as good as done, and told to any quest waiting on it.
  boss(key) {
    if (!key) return;
    this.flags.add(`boss:${key}`);
    for (const id of this.active()) if (this.step(id)?.boss === key) this.advance(id);
    this.on.change();
  }

  // Where the player is, every so often.
  where(x, y, z, hour) {
    if (!this.flags.has('arrived') && inTown(x, z, 0)) {
      this.flags.add('arrived');
      if (!this.q.bed_and_bell && !this.q.lisandra_work && this.lisHere) this.on.toast('Bellmourn. Lisandra has a word for you before you go in. (J: your journal)', 'hint');
      else if (!this.q.bed_and_bell) this.on.toast('Bellmourn. The inn, the Tolling Bell, is just north of the well. (J: your journal)', 'hint');
      this.on.change();
    }
    for (const id of this.active()) {
      const st = this.step(id);
      // (A boss that was dead before this was asked.)
      if (st?.boss && this.flags.has(`boss:${st.boss}`)) { this.advance(id); continue; }
      // visit: every one of a list of places, in any order.
      if (st?.visit) {
        const s = this.q[id], k = st.visit.find((v) => !(s.seen || []).includes(v) && AREAS[v](x, y, z));
        if (!k) continue;
        (s.seen = s.seen || []).push(k);
        if (s.seen.length >= st.visit.length) this.advance(id);
        else { this.on.toast(`${QUESTS[id].title}: ${s.seen.length} of ${st.visit.length}`, 'count'); this.on.change(); }
        continue;
      }
      if (!st?.enter || !AREAS[st.enter](x, y, z)) continue;
      if (st.night && !isNight(hour)) {
        if (!this.toldDay) { this.toldDay = true; this.on.toast(QUESTS[id].dayHint || 'The crypt is still. Whatever keeps the bell keeps its hours: come back at night.', 'hint'); }
        continue;
      }
      this.toldDay = false;
      this.advance(id);
    }
  }

  // Whether the warden should be stood up in the crypt tonight.
  wantsWarden(hour) {
    const st = this.step('toll_of_bell');
    return !!st && (st.warden || st.enter) && isNight(hour);
  }

  // ---- saving ----

  save() { return { q: structuredClone(this.q), told: structuredClone(this.told), flags: [...this.flags], follow: this.follow }; }
  load(d) {
    this.q = structuredClone(d?.q || {});
    this.told = structuredClone(d?.told || {});
    this.flags = new Set(d?.flags || []);
    this.follow = d?.follow ?? null;
    this.on.change();
  }
}
