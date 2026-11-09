// Lisandra's lines in Bellmourn (src/folk/lines/lisandra.js: what she says when you talk to her where the Long Road comes
// in, and her quest), each in both her voices, because which of her you see, and so hear, is the hour's (src/ui/folk.js
// speak: lovely by day, the crone by night). tools/voice/script.mjs lists them for the recorder with the opening's lines.
import { LINES, QUESTS } from '../../src/folk/lines/lisandra.js';
import { unnamed, voiceKey } from '../../src/core/voicekey.js';

const L = LINES.lisandra, Q = QUESTS.lisandra_work;
const said = (list) => (list || []).map((l) => (typeof l === 'string' ? l : Array.isArray(l) ? (l[0] === 'lisandra' ? l[1] : null) : l.say)).filter(Boolean);

// Her lines, in runs that sit together.
export const RUNS = [
  ['first', [...said(L.first), ...said(L.about)]],
  ['greet_light', [...said(L.greet.morning), ...said(L.greet.day)]],
  ['greet_dark', [...said(L.greet.evening), ...said(L.greet.night)]],
  ['ask_a', [...said(L.ask.lis), ...said(L.ask.tessariels)]],
  ['ask_b', [...said(L.ask.town), ...said(L.ask.dead), ...said(L.ask.knight)]],
  ['offer', said(Q.offer)],
  ['answer', [Q.acceptLine, Q.declineLine, ...said(Q.progress)]],
  ['done', [...said(Q.done), ...said(Q.after)]],
];

// Every run in each voice: { id, voice, lines: [{ text, spoken (what's said: the name left out), key }] }.
export const folkTakes = () => ['Lisandra', 'LisandraWitch'].flatMap((voice) => RUNS.map(([id, lines]) => ({
  id: `town_${id}_${voice === 'Lisandra' ? 'y' : 'o'}`, voice,
  lines: lines.map((text) => { const spoken = unnamed(text); return { text, spoken, key: voiceKey(spoken) }; }),
})));
