// The Elder Dragon Gods' recordings (tools/voice/gods): what the game says it has is there, and is a line a god says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { LINES } from '../src/core/delve-elder.js';
import { GOD_VOICED } from '../src/core/god-voiced.js';
import { WARN } from '../src/core/dungeon.js';

const dir = new URL('../assets/game/audio/gods/', import.meta.url);
const keys = [];
for (const god in LINES) for (const when in LINES[god]) LINES[god][when].forEach((_, n) => keys.push(`${god}_say_${when}_${n}`));

test('every recording the game lists is a god\'s line, is on disk, and has a length', () => {
  for (const [k, secs] of Object.entries(GOD_VOICED)) {
    assert.ok(keys.includes(k), `${k} isn't a line`);
    assert.ok(WARN[k] !== undefined, `${k} isn't a warning the fight can call`);
    assert.ok(existsSync(new URL(`${k}.mp3`, dir)), `${k}.mp3 is missing`);
    assert.ok(secs > 0.5 && secs < 20, `${k} runs ${secs} s`);
  }
});

test('no recording is left over from a line no god says any more', () => {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) assert.ok(GOD_VOICED[f.replace(/\.mp3$/, '')] !== undefined, `${f} isn't listed`);
});
