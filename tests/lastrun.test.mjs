// The note the game leaves of what it's doing (src/core/lastrun.js), by which a start tells a page the browser killed
// from one that was closed or put away: a phone's browser gives a page no word before it kills it for want of memory.
//   node --test tests/lastrun.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map(), heard = { win: {}, doc: {} };
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
globalThis.addEventListener = (n, f) => { heard.win[n] = f; };
globalThis.document = { hidden: false, addEventListener: (n, f) => { heard.doc[n] = f; } };
const { beginRun, noteRun, deathWords, noteEvent, trailWords } = await import('../src/core/lastrun.js');
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

test('on a PC only a run that went soon after it loaded counts, and a GPU lost then counts too', () => {
  const pc = { pc: true };
  heard.win.pagehide();
  assert.deepEqual(beginRun(new URLSearchParams('light=0')), { died: null, light: 0 });
  // Killed forty minutes into play: said, but no lighter (that's not the game not fitting).
  noteRun({ stage: 'playing', mins: 40 });
  const a = beginRun(undefined, pc);
  assert.equal(a.died.mins, 40);
  assert.equal(a.light, 0);
  // Killed a minute into play: lighter.
  noteRun({ stage: 'playing', mins: 1 });
  assert.equal(beginRun(undefined, pc).light, 1);
  // The GPU lost while it loaded (the game's own reload): not a death, but lighter again.
  noteRun({ stage: 'loading', ended: 'gpu' });
  const c = beginRun(undefined, pc);
  assert.equal(c.died, null);
  assert.equal(c.light, 2);
  // Left in the ordinary way: as it was.
  heard.win.pagehide();
  assert.equal(beginRun(undefined, pc).light, 2);
  heard.win.pagehide();
  beginRun(new URLSearchParams('light=0'));
});

test('the GPU out of memory: the next start is lighter, on a phone or a PC, however the page went', () => {
  beginRun(new URLSearchParams('light=0'));
  noteRun({ stage: 'playing', mins: 40, oom: true });
  heard.win.pagehide();   // (left in the ordinary way, long into play: neither would count on its own)
  assert.deepEqual(beginRun(undefined, { pc: true }), { died: null, light: 1 });
  heard.win.pagehide();
  assert.equal(beginRun(undefined, { pc: true }).light, 1, 'and no lighter again for the one time');
  noteRun({ stage: 'playing', mins: 2, oom: true });
  heard.win.pagehide();
  assert.equal(beginRun().light, 2, 'a phone too');
  heard.win.pagehide();
  beginRun(new URLSearchParams('light=0'));
});

test('a phone that lost its GPU loads lighter next time; a start out of sight is no death', () => {
  beginRun(new URLSearchParams('light=0'));
  noteRun({ stage: 'playing', mins: 30, ended: 'gpu' });
  const a = beginRun();
  assert.equal(a.died, null, "the game's own reload, not a death");
  assert.equal(a.light, 1, 'but lighter, long into play as it was');
  heard.win.pagehide();
  // Begun while the page is put away (a reload for a lost GPU can be): marked put away from the first, so let go there
  // it isn't taken for one that died.
  document.hidden = true;
  beginRun();
  assert.equal(last().ended, 'hidden');
  assert.equal(beginRun().died, null);
  document.hidden = false;
  heard.win.pagehide();
  beginRun(new URLSearchParams('light=0'));
});

test('the last few things before a death are kept and said: the same again counted, the oldest let go', () => {
  beginRun(new URLSearchParams('light=0'));
  noteRun({ stage: 'playing', mins: 4 });
  noteEvent('touched'); noteEvent('touched'); noteEvent('touched');
  for (let i = 0; i < 9; i++) noteEvent(`size ${800 + i}x390`);
  noteEvent('turned upright');
  const a = beginRun();
  assert.equal(a.died.trail.length, 8, 'eight at most');
  assert.equal(a.died.trail.at(-1).e, 'turned upright');
  assert.ok(!a.died.trail.some((x) => x.e === 'touched'), 'the oldest gone');
  assert.match(trailWords(a.died), /^size 806x390, then size 807x390, then size 808x390, then turned upright$/);
  beginRun();
  noteRun({ stage: 'playing', mins: 4 });
  noteEvent('touched'); noteEvent('touched');
  const b = beginRun();
  assert.equal(trailWords(b.died), 'touched (x2)');
  assert.equal(trailWords({ trail: [{ s: 40, e: 'touched', n: 3 }, { s: 44, e: 'turned upright' }, { s: 44, e: 'size 390x806' }] }),
    'touched (x3), then 4 s later turned upright, then size 390x806', 'the time from one to the next, none when it was the same second');
  heard.win.pagehide();
  assert.equal(beginRun().died, null);
  assert.equal(trailWords(null), '');
  heard.win.pagehide();
  beginRun(new URLSearchParams('light=0'));
});
