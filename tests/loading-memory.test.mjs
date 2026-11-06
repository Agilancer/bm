// Run with: node --test tests/loading-memory.test.mjs (no dependencies or GPU).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTextureArray, decodeScaledBitmap, MipGen, TIERS } from '../src/gfx/gpu.js';

globalThis.GPUTextureUsage = { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 };

function fixture() {
  const events = [], texture = { destroyed: false, destroy() { this.destroyed = true; } };
  const device = {
    createTexture(desc) { texture.desc = desc; return texture; },
    createCommandEncoder: () => ({ finish: () => ({}) }),
    queue: {
      copyExternalImageToTexture({ source }, { origin }) { events.push(['upload', source.id, origin[2]]); },
      submit() { events.push(['submit']); },
      async onSubmittedWorkDone() { await Promise.resolve(); events.push(['drain']); },
    },
  };
  const mip = { generate(t, format, layers, mips, enc, first) { events.push(['mips', layers, first]); } };
  const decode = async (id) => {
    events.push(['decode', id]);
    return { id, width: 4, height: 4, close() { events.push(['close', id]); } };
  };
  return { device, mip, decode, events, texture };
}

test('108 layers are closed and GPU work drains before the next decode', async () => {
  const f = fixture(), names = Array.from({ length: 108 }, (_, i) => i);
  const tex = await loadTextureArray(f.device, f.mip, names, f.decode, 'rgba8unorm');
  assert.deepEqual(tex.desc.size, [4, 4, 108]);
  assert.equal(tex.desc.mipLevelCount, 3);
  assert.deepEqual(f.events, names.flatMap(i => [
    ['decode', i], ['upload', i, i], ['close', i], ['mips', 1, i], ['submit'], ['drain'],
  ]));
});

test('failed decode stops loading and destroys the partial texture', async () => {
  const f = fixture();
  await assert.rejects(loadTextureArray(f.device, f.mip, [0, 1, 2], async i => {
    if (i === 1) throw new Error('decode failed');
    return f.decode(i);
  }, 'rgba8unorm'), /decode failed/);
  assert.equal(f.texture.destroyed, true);
  assert.equal(f.events.filter(e => e[0] === 'close').length, 1);
  assert.equal(f.events.some(e => e[0] === 'decode' && e[1] === 2), false);
});

test('mismatched layers are closed and the partial texture is destroyed', async () => {
  const f = fixture();
  await assert.rejects(loadTextureArray(f.device, f.mip, [0, 1], async i => {
    const bmp = await f.decode(i);
    if (i === 1) bmp.width = 8;
    return bmp;
  }, 'rgba8unorm'), /size mismatch/);
  assert.equal(f.texture.destroyed, true);
  assert.equal(f.events.filter(e => e[0] === 'close').length, 2);
});

test('mips target only the requested array layer', () => {
  const views = [], tex = { createView: d => { views.push(d); return d; } };
  const gen = Object.create(MipGen.prototype);
  gen.pipeline = () => ({ getBindGroupLayout: () => ({}) });
  gen.device = { createBindGroup: () => ({}) };
  const enc = { beginRenderPass: () => ({ setPipeline() {}, setBindGroup() {}, draw() {}, end() {} }) };
  gen.generate(tex, 'rgba8unorm', 1, 3, enc, 7);
  assert.deepEqual(views.map(v => [v.baseArrayLayer, v.baseMipLevel]), [[7, 0], [7, 1], [7, 1], [7, 2]]);
});

test('resizing decodes compressed bytes once and closes the full-size bitmap', async () => {
  const blob = {}, calls = [];
  let closed = 0;
  const full = { width: 4096, height: 2048, close() { closed++; } }, small = {};
  globalThis.createImageBitmap = async (src, opts) => { calls.push([src, opts]); return src === blob ? full : small; };
  assert.equal(await decodeScaledBitmap(blob, TIERS.mobile.texScale), small);
  assert.equal(calls[1][0], full);
  assert.equal(calls[1][1].resizeWidth, 1024);
  assert.equal(closed, 1);
  globalThis.createImageBitmap = async src => { if (src === blob) return full; throw new Error('resize failed'); };
  await assert.rejects(decodeScaledBitmap(blob, 0.25), /resize failed/);
  assert.equal(closed, 2);
});
