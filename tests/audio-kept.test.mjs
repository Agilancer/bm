// Decoded sound is let go (src/audio.js): a loop that's fallen silent is stopped and dropped, and a phone keeps only so
// much of what it's decoded for one-off sounds. (Every bed played on in silence for good, 17 MB apiece decoded: the woods
// by day and night, in rain and storm, the houses, the caves. An hour's walking held 300 MB.)
//   node --test tests/audio-kept.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

// (A phone, for src/gfx/gpu.js isMobileDevice, before src/audio.js asks.)
Object.defineProperty(globalThis, 'navigator', { value: { userAgentData: { mobile: true }, userAgent: 'phone' }, configurable: true });
const made = [];
globalThis.fetch = async (url) => ({ ok: true, arrayBuffer: async () => ({ url }) });
const { Audio } = await import('../src/audio.js');

function audio() {
  const a = Object.create(Audio.prototype);
  const node = () => ({ gain: { value: 0, setTargetAtTime() {} }, connect() {}, disconnect() { this.cut = true; } });
  a.ctx = {
    currentTime: 0,
    createGain: node,
    createPanner: () => ({ ...node(), setPosition() {} }),
    createBufferSource: () => { const s = { ...node(), start() { this.on = true; }, stop() { this.on = false; } }; made.push(s); return s; },
    // (A loop: 45 s of stereo at 48 kHz, 17 MB. Anything else: a second of mono.)
    decodeAudioData: async (f) => (/forest|cave|inside/.test(f.url) ? { length: 45 * 48000, numberOfChannels: 2, duration: 45 } : { length: 48000 * 30, numberOfChannels: 1, duration: 30 }),
  };
  a.base = ''; a.buffers = {}; a.ready = true; a.amb = node();
  return a;
}
const settle = () => new Promise((r) => setTimeout(r, 5));

test('a bed that falls silent is stopped and its sound let go, and comes back when it\'s wanted', async () => {
  const a = audio();
  a.bed('forest_day', 0.5);
  await settle();
  assert.ok(a.buffers.forest_day && a.beds.forest_day.src.on);
  assert.equal(a.pending.forest_day, undefined, 'the answered promise isn\'t kept: it would hold the sound');
  a.bed('forest_night', 0);
  assert.equal(a.beds.forest_night, undefined, 'one never heard is never made');
  a.ctx.currentTime = 100; a.bed('forest_day', 0);
  a.ctx.currentTime = 105; a.bed('forest_day', 0);
  assert.ok(a.beds.forest_day, 'silent five seconds: still there');
  a.ctx.currentTime = 108; a.bed('forest_day', 0.3);
  a.ctx.currentTime = 117; a.bed('forest_day', 0);
  assert.ok(a.beds.forest_day, 'heard again in between: the count starts over');
  const src = a.beds.forest_day.src;
  a.ctx.currentTime = 128; a.bed('forest_day', 0);
  assert.equal(a.beds.forest_day, undefined);
  assert.equal(a.buffers.forest_day, undefined);
  assert.ok(!src.on && src.cut, 'its source stopped and unhooked');
  a.bed('forest_day', 0.5);
  await settle();
  assert.ok(a.buffers.forest_day && a.beds.forest_day.src.on);
});

test('a bed let go while its sound was still coming never starts', async () => {
  const a = audio(), before = made.length;
  a.bed('cave', 0.5);
  a.bed('cave', 0); a.ctx.currentTime = 11; a.bed('cave', 0);
  await settle();
  assert.equal(made.length, before);
  assert.equal(a.beds.cave, undefined);
});

test('a spot\'s loop goes the same way', async () => {
  const a = audio();
  a.spot('torch', 'inside_fire', 0, 0, 0, 0.5);
  await settle();
  assert.ok(a.spots.torch.src.on);
  a.spot('torch', 'inside_fire', 0, 0, 0, 0); a.ctx.currentTime = 11; a.spot('torch', 'inside_fire', 0, 0, 0, 0);
  assert.equal(a.spots.torch, undefined);
  assert.equal(a.buffers.inside_fire, undefined);
});

test('a phone keeps 24 MB of one-off sounds, the longest unheard let go first; loops playing and what was decoded at load stay', async () => {
  const a = audio();
  a.buffers.sword_attack_1 = { length: 48000 * 400, numberOfChannels: 1 };   // (decoded at load, and far over the lot: never counted)
  a.bed('forest_day', 0.5);
  const size = () => Object.keys(a.buffers).filter((k) => /^spell/.test(k)).length;
  for (let i = 0; i < 8; i++) { await a.fetchBuffer(`spell_${i}`); await settle(); }   // 5.76 MB apiece: four fit
  assert.equal(size(), 4);
  assert.ok(a.buffers.spell_7 && a.buffers.spell_4 && !a.buffers.spell_3 && !a.buffers.spell_0);
  assert.ok(a.buffers.sword_attack_1 && a.buffers.forest_day);
  await a.fetchBuffer('spell_4'); await settle();   // heard again: now the newest
  await a.fetchBuffer('spell_8'); await settle();
  assert.ok(a.buffers.spell_4 && a.buffers.spell_8 && !a.buffers.spell_5);
});
