// Every line Lisandra says aloud, read from the game's own data, written out as JSON for the recorder (anchor.py) and the
// picker (pick.py): the opening (src/core/opening-script.js) and her lines in Bellmourn (folk.mjs, in both voices).
//   node tools/voice/script.mjs lines.json
// Each line: { voice, text (the words she says), key (voiceKey(text), the file the game looks for), say (the same words as
// the voice model reads them), type (its kind of delivery: one fixed note per kind, anchors.json), group (the order they're
// recorded in: the old voice's opening, the young voice's, then the town) }.
import { writeFileSync } from 'node:fs';
import { OPENING } from '../../src/core/opening.js';
import { CUES, SCRIPT, spoken, voiceOf } from '../../src/core/opening-script.js';
import { voiceKey } from '../../src/core/voicekey.js';
import { folkTakes } from './folk.mjs';

// The kind of delivery, from the line's own marks (opening-script.js), or named here.
const TYPE = {
  'Not that way, dear. Back down the tunnel with you.': 'order',
  'I said out. Back down that tunnel before I lose my temper.': 'raised',
};
const typeOf = (l, text) => TYPE[text] || (l.big ? 'shout' : l.off ? 'off' : l.vo ? 'vo' : l.mutter ? 'quiet' : l.call ? 'call' : 'calm');

// The words as the voice model reads them: plain quotes, a dash as a trailing-off, no capitals for shouting and no "!"
// (the voice critics: a "!" makes the model bark, and the bark isn't her voice; the line's kind carries the force).
export const plain = (t) => {
  let s = t.replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/\s*—\s*$/, '...').replace(/\s*—\s*/g, '... ');
  if (s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s.replace(/\?!/g, '?').replace(/!/g, '.');
};

const lines = [];
const seen = new Set();
const add = (voice, text, type, group) => {
  if (!text || seen.has(voice + '|' + text)) return;
  seen.add(voice + '|' + text);
  lines.push({ voice, text, key: voiceKey(text), say: plain(text), type, group });
};
const opening = [];
for (const [stage, ls] of Object.entries(SCRIPT)) for (const l of ls) opening.push([Number(stage), l]);
for (const l of Object.values(CUES)) opening.push([OPENING.ESCORT, l]);
for (const [stage, l] of opening) {
  const voice = voiceOf(stage, l), text = spoken(l);
  add(voice, text, typeOf(l, text), voice === 'LisandraWitch' ? 0 : 1);
}
for (const t of folkTakes()) for (const l of t.lines) add(t.voice, l.spoken, 'calm', 2);
lines.sort((a, b) => a.group - b.group);
writeFileSync(process.argv[2] || 'lines.json', JSON.stringify(lines, null, 1));
const by = {};
for (const l of lines) by[`${l.voice} ${l.type}`] = (by[`${l.voice} ${l.type}`] || 0) + 1;
console.log(lines.length, 'lines:', Object.entries(by).map(([v, n]) => `${v} ${n}`).join(', '));
