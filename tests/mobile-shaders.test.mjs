// Normal suite: node --test tests/*.test.mjs
// Native WGSL compiler (Dawn, no physical GPU required): install the official
// `webgpu` npm package, then set BM_WEBGPU_MODULE to its index.js absolute path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Renderer } from '../src/gfx/renderer.js';
import * as materials from '../src/gfx/materials.js';
import * as post from '../src/gfx/post.js';

function source(code, lean) {
  return Renderer.prototype.shader.call({ tier: { lean }, device: { createShaderModule: ({ code }) => code } }, code);
}

test('mobile item shader removes depth writes from its early and final returns', () => {
  const item = source(materials.ITEM, true);
  assert.match(item, /out\.color =/); // The early-return effect still renders.
  assert.match(item, /return out;/);
  assert.doesNotMatch(item, /\b(?:out|o)\.depth\s*=/);
  assert.doesNotMatch(item, /@location\(1\)\s+depth:/);
});

test('desktop item shader retains depth on both return paths', () => {
  const item = source(materials.ITEM, false);
  assert.match(item, /out\.depth = in\.viewZ;/);
  assert.match(item, /o\.depth = in\.viewZ;/);
  assert.match(item, /@location\(1\) depth: f32/);
});

test('Dawn compiles every material and post shader for mobile and desktop', {
  skip: !process.env.BM_WEBGPU_MODULE && 'Set BM_WEBGPU_MODULE to the installed webgpu/index.js to run the native compiler',
}, async () => {
  const { create } = await import(pathToFileURL(process.env.BM_WEBGPU_MODULE).href);
  let gpu = create(['backend=null']);
  const adapter = await gpu.requestAdapter();
  assert.ok(adapter);
  const device = await adapter.requestDevice();
  try {
    for (const lean of [true, false]) {
      for (const [name, code] of Object.entries({ ...materials, ...post })) {
        device.pushErrorScope('validation');
        const module = device.createShaderModule({ label: `${name} lean=${lean}`, code: source(code, lean) });
        const info = await module.getCompilationInfo();
        const validation = await device.popErrorScope();
        const errors = info.messages.filter(message => message.type === 'error');
        assert.deepEqual(errors.map(error => error.message), [], `${name} lean=${lean}`);
        assert.equal(validation, null, validation?.message);
      }
    }
  } finally { device.destroy(); gpu = null; }
});
