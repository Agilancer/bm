// Run with node --test tests/*.test.mjs. No browser required.
// On a phone the thumbs are the only way to move, so they must be there whenever the opening lets you walk, bars or not.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HERD_CONTROL, HERD_END, OPENING, storyHolds } from '../src/core/opening.js';

// (The page's own rules, and the interface's sheet that comes after them: src/ui/hud.css.)
const css = (fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/ui/hud.css', import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
// Every selector list that hides something, split into its selectors.
const hiding = [...css.matchAll(/([^{}]+)\{[^}]*visibility:\s*hidden[^}]*\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));

test('the story holds you only in its scenes, not on the walk out', () => {
  for (const t of [0, 5, 20, 40]) assert.ok(storyHolds(OPENING.WAKE, t));
  assert.ok(storyHolds(OPENING.NAME, 30));
  assert.ok(storyHolds(OPENING.HERD, HERD_CONTROL - 0.01));
  assert.ok(storyHolds(OPENING.COLLAPSE, 10));
  for (const t of [HERD_CONTROL, HERD_END - 0.01]) assert.ok(!storyHolds(OPENING.HERD, t));
  for (const t of [0, 3, 60]) assert.ok(!storyHolds(OPENING.LEAVE, t));
  for (const s of [OPENING.ESCORT, OPENING.ARRIVED]) assert.ok(!storyHolds(s, 1));
});

test('the bars alone never put the thumbs away', () => {
  // (body.cinematic is on from waking to the cave-in, the walk out included.)
  assert.ok(!hiding.includes('body.cinematic #touch'), 'body.cinematic must not hide #touch: a phone could not walk out of the cave');
  assert.ok(hiding.includes('body.op-held #touch'), '#touch is put away while the story holds you');
});

test('walking out under the bars, the stick and the look are there', () => {
  // Under the bars the buttons that aren't for walking go, but the layer the thumbs land on stays.
  for (const sel of hiding.filter((s) => s.startsWith('body.cinematic'))) {
    assert.ok(!/#touch$/.test(sel) && !/#(stick|nub)\b/.test(sel), `${sel} hides what walks you out`);
  }
});
