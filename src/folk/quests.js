// The starter quests' workings: who gives each, its steps, what finishes them, what it pays. Every word of them is in
// src/folk/lines/quests.js; the talk that carries them is src/ui/folk.js. Kept on the render thread and saved with the game.
//
// A step is one of:
//   talk   go and say something to someone (say: the player's words)
//   enter  get to a place (night: only at night)
//   kill   put down n of the dead in a place
//   warden put down the Bell Crypt's warden
//   back   go back to the giver
//   bring  bring the giver n of a material (items.js MATS); handed over at the giver
// wait: what's handed over is made overnight, and collected the next day.
import { churchAt, inChurch } from '../core/church.js';
import { inTown } from '../core/town.js';
import { QUESTS } from './lines/quests.js';

export const RULES = {
  bed_and_bell: { steps: [{ talk: 'silas', say: 'Bram Kettle sent me.' }, { back: true, say: "I've been to see Silas." }], xp: 40 },
  dead_cant_wait: { steps: [{ enter: 'catacombs' }, { kill: 'catacombs', n: 8 }, { back: true, say: 'Eight of them are at rest.' }], gold: 60, xp: 200 },
  bones_for_carver: { needs: 'dead_cant_wait', steps: [{ bring: 'bone', n: 10 }], wait: true, item: 'skull', xp: 150 },
  iron_from_dead: { steps: [{ bring: 'iron', n: 8 }], item: 'staff', xp: 150 },
  shroud_and_thread: { steps: [{ bring: 'silk', n: 8 }], wait: true, item: 'robe', xp: 150 },
  pines: { steps: [{ kill: 'woods', n: 12 }, { back: true, say: 'Twelve of them. Down.' }], gold: 80, xp: 300 },
  toll_of_bell: { steps: [{ enter: 'bellcrypt', night: true }, { warden: true }, { back: true, say: "The bell's warden is put down." }], item: 'scroll', xp: 400 },
  letter: { steps: [{ talk: 'elowen', say: 'A letter from Cedric Ashby. Into your hand.' }, { back: true, say: "Elowen's answer." }], xp: 120 },
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
  }

  state(id) { return this.q[id] || null; }
  step(id) { const s = this.q[id]; return s && s.stage === 'active' ? RULES[id].steps[s.step] : null; }
  active() { return Object.keys(this.q).filter((id) => this.q[id].stage !== 'done'); }
  done(id) { return this.q[id]?.stage === 'done'; }

  // The quests this person has to give, now.
  offers(who) {
    return Object.keys(RULES).filter((id) => QUESTS[id].giver === who && !this.q[id] && (!RULES[id].needs || this.done(RULES[id].needs)));
  }

  begin(id) {
    this.q[id] = { stage: 'active', step: 0, n: 0 };
    this.flags.add(`quest:${id}`);
    this.on.toast(`New quest: ${QUESTS[id].title}`, 'quest');
    this.on.change();
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
    return `${step.kill ? `${line} (${s.n} of ${step.n})` : line}${hint ? ` ${hint}` : ''}`;
  }

  // ---- what the world reports ----

  // Something died at (x, y, z). kind as in drops.js: 8 a champion.
  kill(x, y, z, kind) {
    for (const id of this.active()) {
      const st = this.step(id);
      if (!st) continue;
      if (st.warden && kind === 8 && inCrypt(x, y, z)) { this.on.toast('The warden is down. Somewhere above, a rope goes slack.', 'step'); this.advance(id); continue; }
      if (!st.kill || !AREAS[st.kill](x, y, z) || kind === 2) continue;
      const s = this.q[id];
      s.n++;
      if (s.n >= st.n) this.advance(id);
      else { this.on.toast(`${QUESTS[id].title}: ${s.n} of ${st.n}`, 'count'); this.on.change(); }
    }
  }

  // Where the player is, every so often.
  where(x, y, z, hour) {
    if (!this.flags.has('arrived') && inTown(x, z, 0)) {
      this.flags.add('arrived');
      if (!this.q.bed_and_bell) this.on.toast('Bellmourn. The inn, the Tolling Bell, is just north of the well. (J: your journal)', 'hint');
      this.on.change();
    }
    for (const id of this.active()) {
      const st = this.step(id);
      if (!st?.enter || !AREAS[st.enter](x, y, z)) continue;
      if (st.night && !isNight(hour)) {
        if (!this.toldDay) { this.toldDay = true; this.on.toast('The crypt is still. Whatever keeps the bell keeps its hours: come back at night.', 'hint'); }
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

  save() { return { q: structuredClone(this.q), told: structuredClone(this.told), flags: [...this.flags] }; }
  load(d) {
    this.q = structuredClone(d?.q || {});
    this.told = structuredClone(d?.told || {});
    this.flags = new Set(d?.flags || []);
    this.on.change();
  }
}
