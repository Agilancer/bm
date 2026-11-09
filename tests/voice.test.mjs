import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OPENING } from '../src/core/opening.js';
import { CUES, SCRIPT, VOICE, spoken, voiceOf } from '../src/core/opening-script.js';
import { VOICED } from '../src/core/voiced.js';
import { voiceKey } from '../src/core/voicekey.js';

// Every line Lisandra says aloud has its recording, in the voice of whichever of her you see (docs/VOICES.md). Change a
// line's words and this fails until it's recorded again.
const lines = [
  ...Object.entries(SCRIPT).flatMap(([stage, ls]) => ls.map((l) => [Number(stage), l])),
  ...Object.values(CUES).map((l) => [OPENING.ESCORT, l]),
].filter(([, l]) => spoken(l));

test('every line she says aloud is recorded, and its file is there', () => {
  const missing = [];
  for (const [stage, l] of lines) {
    const voice = voiceOf(stage, l), key = voiceKey(spoken(l));
    const listed = (VOICED[voice] || '').split(' ').includes(key);
    if (!listed || !fs.existsSync(new URL(`../assets/voice/${voice}/${key}.mp3`, import.meta.url))) missing.push(`${voice}: ${spoken(l)}`);
  }
  assert.deepEqual(missing, []);
});

test('the glamour breaks in her voice too: young before the flash and from the dust on, old between', () => {
  const at = (stage, text) => voiceOf(stage, SCRIPT[stage].find((l) => l.text === text));
  assert.equal(at(OPENING.WAKE, 'Shh. Everyone’s frightened at first.'), VOICE.pretty);
  assert.equal(at(OPENING.WAKE, '…Oh.'), VOICE.witch);
  assert.equal(at(OPENING.COLLAPSE, 'No— no, no, no—'), VOICE.witch);
  assert.equal(at(OPENING.COLLAPSE, 'WHAT HAVE YOU DONE?!'), VOICE.pretty);
  assert.equal(voiceOf(OPENING.LEAVE, CUES.tunnel), VOICE.witch);
  assert.equal(voiceOf(OPENING.ESCORT, CUES.woods), VOICE.pretty);
});

test('no line asks a recording to say the name you type', () => {
  for (const [, l] of lines) assert.ok(!spoken(l).includes('{name}'), spoken(l));
});
