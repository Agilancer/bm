// The tier Auto picks on a PC (src/gfx/gpu.js): a GPU that shares the computer's memory, a laptop's card and a small
// computer start lighter, so the game's pictures fit; and a PC the browser closed the game on soon after it loaded steps down.
//   node --test tests/gpu-tier.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, autoTier, laptopCard, lighterPC, sharesMemory } from '../src/gfx/gpu.js';

const angle = (vendor, name) => `ANGLE (${vendor}, ${name} Direct3D11 vs_5_0 ps_5_0, D3D11)`;

test('GPUs on the processor share the computer\'s memory; cards don\'t', () => {
  for (const n of [
    angle('AMD', 'AMD Radeon(TM) Graphics (0x0000164E)'), angle('AMD', 'AMD Radeon 780M Graphics (0x000015BF)'),
    angle('AMD', 'AMD Radeon(TM) Vega 8 Graphics (0x000015D8)'), angle('Intel', 'Intel(R) UHD Graphics 620 (0x00005917)'),
    angle('Intel', 'Intel(R) Iris(R) Xe Graphics (0x00009A49)'), angle('Intel', 'Intel(R) Arc(TM) Graphics (0x00007D55)'),
    angle('Intel', 'Intel(R) Arc(TM) 140V GPU (16GB) (0x000064A0)'), 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
    angle('Qualcomm', 'Qualcomm(R) Adreno(TM) X1-85 GPU'), angle('Microsoft', 'Microsoft Basic Render Driver (0x0000008C)'),
  ]) assert.equal(sharesMemory(n), true, n);
  for (const n of [
    angle('AMD', 'AMD Radeon RX 9070 XT (0x00007550)'), angle('AMD', 'AMD Radeon RX 6800M (0x000073DF)'),
    angle('AMD', 'AMD Radeon Pro W6800 (0x000073A3)'), angle('NVIDIA', 'NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0)'),
    angle('NVIDIA', 'NVIDIA GeForce GTX 1650 (0x00001F82)'), angle('Intel', 'Intel(R) Arc(TM) A770 Graphics (0x000056A0)'),
    angle('Intel', 'Intel(R) Arc(TM) B580 Graphics (0x0000E20B)'),
  ]) assert.equal(sharesMemory(n), false, n);
  // Without a name, from what WebGPU says: Intel's on the processor but its HPG cards, Apple's; AMD's can't be told: a card.
  assert.equal(sharesMemory('', { vendor: 'intel', architecture: 'gen-12lp' }), true);
  assert.equal(sharesMemory('', { vendor: 'intel', architecture: 'xe-hpg' }), false);
  assert.equal(sharesMemory('', { vendor: 'apple', architecture: 'metal-3' }), true);
  assert.equal(sharesMemory('', { vendor: 'amd', architecture: 'rdna-2' }), false);
  assert.equal(sharesMemory('', { vendor: 'nvidia', architecture: 'ada' }), false);
});

test('a laptop\'s own card is told by its name', () => {
  assert.equal(laptopCard(angle('NVIDIA', 'NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0)')), true);
  assert.equal(laptopCard(angle('NVIDIA', 'NVIDIA GeForce RTX 2080 with Max-Q Design (0x00001E90)')), true);
  assert.equal(laptopCard(angle('AMD', 'AMD Radeon RX 7600M XT (0x00007480)')), true);
  assert.equal(laptopCard(angle('AMD', 'AMD Radeon RX 9070 XT (0x00007550)')), false);
  assert.equal(laptopCard(angle('NVIDIA', 'NVIDIA GeForce RTX 4090 (0x00002684)')), false);
});

test('Auto: Ultra on a desktop card, Medium on shared memory or a laptop\'s card or 8 GB, Low with less', () => {
  assert.equal(autoTier({ discrete: true, mem: 32 }), 'ultra');
  assert.equal(autoTier({ discrete: true }), 'ultra', 'a browser that won\'t say how much RAM');
  assert.equal(autoTier({ mem: 16 }), 'high');
  assert.equal(autoTier({ shared: true, mem: 32 }), 'medium');
  assert.equal(autoTier({ shared: true, mem: 16 }), 'medium');
  assert.equal(autoTier({ shared: true }), 'medium');
  assert.equal(autoTier({ shared: true, mem: 8 }), 'mobile');
  assert.equal(autoTier({ discrete: true, laptop: true, mem: 32 }), 'medium');
  assert.equal(autoTier({ discrete: true, mem: 8 }), 'medium');
  assert.equal(autoTier({ discrete: true, mem: 4 }), 'mobile');
  assert.equal(autoTier({ mobile: true, discrete: true, mem: 32 }), 'mobile');
  for (const t of ['ultra', 'high', 'medium', 'mobile']) assert.ok(TIERS[t], t);
});

test('after the browser closed the game soon after it loaded, a step lighter a time, never past Low', () => {
  assert.equal(lighterPC('ultra', 0), 'ultra');
  assert.equal(lighterPC('ultra', 1), 'medium');
  assert.equal(lighterPC('high', 1), 'medium');
  assert.equal(lighterPC('medium', 1), 'mobile');
  assert.equal(lighterPC('ultra', 2), 'mobile');
  assert.equal(lighterPC('mobile', 2), 'mobile');
  assert.equal(autoTier({ discrete: true, mem: 32, light: 1 }), 'medium');
  assert.equal(autoTier({ shared: true, mem: 16, light: 1 }), 'mobile');
});

test('Medium is High with a quarter of the pictures\' memory', () => {
  const { medium, high } = TIERS;
  assert.equal(medium.texScale, 0.5);
  assert.ok(!medium.lean, 'the PC\'s shaders, not the phone\'s');
  assert.equal(medium.msaa, high.msaa);
  assert.ok(medium.grassCap <= high.grassCap && medium.particles <= high.particles);
});
