// The note the game leaves of what it's doing (src/core/lastrun.js), by which a start tells a page the browser killed
// from one that was closed or put away: a phone's browser gives a page no word before it kills it for want of memory.
//   node --test tests/lastrun.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map(), heard = { win: {}, doc: {} };
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
globalThis.addEventListener = (n, f) => { heard.win[n] = f; };
globalThis.document = { hidden: false, addEventListener: (n, f) => { heard.doc[n] = f; } };
const { beginRun, noteRun, deathWords } = await import('../src/core/lastrun.js');
const last = () => JSON.parse(store.get('velscour.lastRun'));

test('a first start: nothing died, and it loads as the tier says', () => {
  assert.deepEqual(beginRun(), { died: null, light: 0 });
  assert.equal(last().ended, false);
});

test('a page left or put away in the ordinary way did not die', () => {
  noteRun({ stage: 'playing', mins: 3 });
  heard.win.pagehide();
  assert.equal(last().ended, 'left');
  assert.deepEqual(beginRun(), { died: null, light: 0 });
  document.hidden = true; heard.doc.visibilitychange();
  assert.equal(last().ended, 'hidden');
  assert.equal(beginRun().died, null, 'a hidden page the phone let go of');
  document.hidden = true; heard.doc.visibilitychange();
  document.hidden = false; heard.doc.visibilitychange();
  assert.equal(last().ended, false, 'and back in front it\'s running again');
  heard.win.pagehide();
});

test('a page that was playing and never said goodbye was killed: said, and the next loads lighter, and the next', () => {
  beginRun();
  noteRun({ stage: 'playing', mins: 12.4, where: 'at (-40, 212)' });
  const a = beginRun();
  assert.deepEqual(a.died, { stage: 'playing', mins: 12.4, where: 'at (-40, 212)', gpu: '' });
  assert.equal(a.light, 1);
  assert.equal(deathWords(a.died), '12 minutes into play, at (-40, 212)');
  noteRun({ stage: 'loading' });
  const b = beginRun();
  assert.equal(b.light, 2);
  assert.equal(deathWords(b.died), 'while it was loading');
  noteRun({ stage: 'title' });
  const c = beginRun();
  assert.equal(c.light, 2, 'no lighter than the lightest');
  assert.equal(deathWords(c.died), 'at the main menu');
  assert.equal(last().deaths, 3);
});

test('the game\'s own reload for a lost GPU is not a death; ?light sets the level and keeps it; an old note is no news', () => {
  noteRun({ ended: 'gpu' });
  assert.equal(beginRun().died, null);
  heard.win.pagehide();
  assert.deepEqual(beginRun(new URLSearchParams('light=0')), { died: null, light: 0 });
  heard.win.pagehide();
  assert.equal(beginRun().light, 0);
  store.set('velscour.lastRun', JSON.stringify({ at: Date.now() - 9 * 86400e3, stage: 'playing', ended: false }));
  assert.equal(beginRun().died, null);
});
