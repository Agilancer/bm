// The mouse wheel and the view (src/ui/view.js, src/core/third.js), with no page: a notch out of first person stands the
// camera just behind you, notches out take it further back up to three times V's, notches in bring it back, and one more
// once it's as near as it goes is first person again; a fast turn in stops at your back, a trackpad's brush flips nothing,
// and none of it in Lisandra's cave, with a panel up, or in the pause.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THIRD, thirdZoom, zoomBy } from '../src/core/third.js';
import { H, INPUT } from '../src/core/layout.js';
import { OPENING } from '../src/core/opening.js';

// Just enough of a page for the switch to stand in.
const el = () => ({ style: {}, dataset: {}, classList: { toggle() {} }, addEventListener() {}, appendChild() {}, innerHTML: '' });
globalThis.document = { createElement: el, getElementById: el, body: el() };
globalThis.window = { addEventListener() {} };
let clock = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock * 1000 }, configurable: true });
const { ViewSwitch } = await import('../src/ui/view.js');

function make(settings = {}) {
  const tips = [], o = { input: { enabled: true, menu: false }, shared: { input: new Float32Array(INPUT.SIZE) }, settings, saved: 0,
    save() { o.saved++; }, tip: (t) => tips.push(t), busy: () => false };
  const v = new ViewSwitch(o);
  const snap = new Float32Array(H.SIZE);
  snap[H.OPENING] = OPENING.OFF;
  v.frame(snap);
  return { v, o, tips, snap };
}
// Notches one at a time, a while apart (as a hand turns a wheel).
const turn = (v, n, each = 1, gap = 0.3) => { for (let i = 0; i < n; i++) { clock += gap; v.wheel(each); } };

test('the reach: from just behind you to three times V\'s, a notch at a time', () => {
  assert.ok(THIRD.close > THIRD.hide, 'nearest still shows the body');
  assert.equal(THIRD.far, 3 * THIRD.dist);
  assert.equal(zoomBy(THIRD.far, 3), THIRD.far);
  assert.equal(zoomBy(THIRD.close, -3), THIRD.close);
  assert.ok(Math.abs(zoomBy(THIRD.dist, 1) - THIRD.dist * THIRD.notch) < 1e-9);
  const notches = Math.log(THIRD.far / THIRD.close) / Math.log(THIRD.notch);
  assert.ok(notches > 8 && notches < 14, `${notches.toFixed(1)} notches from nearest to furthest`);
  for (const bad of [undefined, null, 'x', 0, 0.5, 99, NaN]) assert.equal(thirdZoom(bad), THIRD.dist);
  assert.equal(thirdZoom(7), 7);
});

test('a notch out of first person, out to the furthest, back in, and into first person again', () => {
  const { v, o, snap } = make();
  assert.equal(v.third, false);
  turn(v, 1, -1);
  assert.equal(v.third, false, 'in from first person: nothing');
  turn(v, 1);
  assert.equal(v.third, true);
  assert.equal(v.zoom, THIRD.close, 'just behind you');
  v.frame(snap);
  assert.equal(o.shared.input[INPUT.THIRD], 1, 'the sim is told');
  let last = v.zoom;
  for (let i = 0; i < 20; i++) { turn(v, 1); assert.ok(v.zoom >= last); last = v.zoom; }
  assert.equal(v.zoom, THIRD.far, 'out as far as it goes');
  assert.ok(THIRD.far > THIRD.dist * 2.5, 'well past V\'s');
  for (let i = 0; i < 20 && v.zoom > THIRD.close; i++) { turn(v, 1, -1); assert.equal(v.third, true); }
  assert.equal(v.zoom, THIRD.close);
  turn(v, 1, -1);
  assert.equal(v.third, false, 'one more in: first person');
  assert.equal(o.settings.view, 'first');
  assert.equal(v.zoom, THIRD.dist, 'V then gives its own');
});

test('V goes back to how far back you left it, and it is kept with the settings', async () => {
  const { v, o } = make();
  turn(v, 1); turn(v, 6);
  const left = v.zoom;
  assert.ok(left > THIRD.dist);
  v.toggle(); assert.equal(v.third, false);
  v.toggle(); assert.equal(v.third, true); assert.equal(v.zoom, left);
  assert.equal(o.settings.zoom, left);
  const again = make({ view: 'third', zoom: left });
  assert.equal(again.v.third, true); assert.equal(again.v.zoom, left);
});

test('a fast turn in stops at your back; a trackpad\'s brush flips nothing', () => {
  const { v } = make();
  turn(v, 1); turn(v, 8);
  // A spin of the wheel toward you, a notch every 30 ms: it stops at the nearest and stays in third person.
  turn(v, 30, -1, 0.03);
  assert.equal(v.third, true);
  assert.equal(v.zoom, THIRD.close);
  // A pause, and a deliberate notch: first person.
  clock += 0.5; v.wheel(-1);
  assert.equal(v.third, false);
  // A trackpad's brush out: a few hundredths of a notch don't make third person, but half a notch's worth does.
  turn(v, 5, 0.05, 0.02);
  assert.equal(v.third, false);
  turn(v, 10, 0.05, 0.02);
  assert.equal(v.third, true);
});

test('not in the cave, with a panel up or in the pause', () => {
  const { v, o, tips, snap } = make();
  snap[H.OPENING] = OPENING.HERD; v.frame(snap);
  turn(v, 3);
  assert.equal(v.third, false);
  assert.ok(tips.some((t) => /cave/.test(t)), 'it says why');
  snap[H.OPENING] = OPENING.OFF; v.frame(snap);
  o.input.menu = true; turn(v, 3); assert.equal(v.third, false);
  o.input.menu = false; o.busy = () => true; turn(v, 3); assert.equal(v.third, false);
  o.busy = () => false; turn(v, 1); assert.equal(v.third, true);
});

test('with auto-play holding the camera, the wheel picks between its two views', () => {
  const { v, o } = make({ autocam: 'director' });
  v.auto = 'first'; o.settings.autocam = 'first'; v.autoBack = 'director';
  turn(v, 1);
  assert.equal(v.auto, 'third');
  assert.equal(o.settings.autocam, 'director');
  assert.equal(v.on, false, 'your own view is left as it was');
  clock += 1; turn(v, 1, -1);
  assert.equal(v.auto, 'first');
});
