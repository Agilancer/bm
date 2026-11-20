// WebKit's views made again now and then (src/gfx/freshviews.js), on a stand-in WebGPU: a pass is handed a bind group made
// again from the game's, holding views made again of the same textures seen the same way; the game's own are left as they
// are; what's young, destroyed or the canvas's own is left alone; and any objection from the GPU puts everything back.
import test from 'node:test';
import assert from 'node:assert/strict';

// The stand-in: just enough of WebGPU's classes for the wrappers to hook into, recording what the passes were given.
class GPUTexture { constructor(n) { this.n = n; } createView(desc) { return new GPUTextureView(this, desc); } destroy() { this.gone = true; } }
class GPUTextureView { constructor(tex, desc) { this.tex = tex; this.desc = desc; } }
class GPUBuffer { destroy() { this.gone = true; } }
class GPUBindGroup { constructor(desc) { this.desc = desc; } }
let given = [];
class GPURenderPassEncoder { setBindGroup(i, g) { given.push(g); } }
class GPUComputePassEncoder { setBindGroup(i, g) { given.push(g); } }
class GPUCommandEncoder { beginRenderPass(d) { this.pass = d; return new GPURenderPassEncoder(); } beginComputePass() { return new GPUComputePassEncoder(); } }
class GPUCanvasContext { getCurrentTexture() { return new GPUTexture('canvas'); } }
Object.assign(globalThis, { GPUTexture, GPUTextureView, GPUBuffer, GPUBindGroup, GPURenderPassEncoder, GPUComputePassEncoder, GPUCommandEncoder, GPUCanvasContext });

const { FreshViews, wantFreshViews } = await import('../src/gfx/freshviews.js');

const device = () => {
  const errors = [];
  return {
    errors, scopes: 0,
    createBindGroup(desc) { return new GPUBindGroup(desc); },
    createCommandEncoder() { return new GPUCommandEncoder(); },
    pushErrorScope() { this.scopes++; },
    popErrorScope() { this.scopes--; return Promise.resolve(errors.shift() || null); },
  };
};
// Seconds on a clock the test turns.
const clock = () => { const c = { t: 0, now: () => c.t }; return c; };
const frame = (d, g) => { given = []; const enc = d.createCommandEncoder(); enc.beginComputePass().setBindGroup(0, g); return { enc, got: given[0] }; };

test('a pass is given a bind group made again, with views made again of the same texture, seen the same way', () => {
  const d = device(), c = clock(), fv = new FreshViews(d, { every: 20, now: c.now });
  const tex = new GPUTexture('stone'), buf = new GPUBuffer();
  const view = tex.createView({ dimension: '2d-array' });
  const layout = {};
  const g = d.createBindGroup({ layout, entries: [{ binding: 0, resource: view }, { binding: 1, resource: { buffer: buf } }] });
  assert.equal(frame(d, g).got, g, 'before the first round, the game\'s own');
  c.t = 25;
  frame(d, g);                                     // the round starts as this encoder is made
  const { got } = frame(d, g);
  assert.notEqual(got, g);
  assert.ok(got instanceof GPUBindGroup);
  assert.equal(got.desc.layout, layout);
  const v2 = got.desc.entries[0].resource;
  assert.notEqual(v2, view);
  assert.equal(v2.tex, tex);
  assert.deepEqual(v2.desc, { dimension: '2d-array' });
  assert.equal(got.desc.entries[1].resource.buffer, buf);
  assert.equal(g.desc.entries[0].resource, view, 'the game\'s own bind group is left as it was');
  // The next round: made again again, so the last ones can go.
  c.t = 50; frame(d, g);
  const third = frame(d, g).got;
  assert.notEqual(third, got);
  assert.notEqual(third.desc.entries[0].resource, v2);
  assert.equal(fv.rounds, 2);
  assert.equal(d.scopes, 0, 'every error scope pushed is popped');
});

test('attachments are handed the view made again', () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const tex = new GPUTexture('hdr'), view = tex.createView();
  const desc = { colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store' }], depthStencilAttachment: { view: new GPUTexture('depth').createView() } };
  let enc = d.createCommandEncoder(); enc.beginRenderPass(desc);
  assert.equal(enc.pass.colorAttachments[0].view, view);
  c.t = 30;
  enc = d.createCommandEncoder(); enc.beginRenderPass(desc);
  const v2 = enc.pass.colorAttachments[0].view;
  assert.notEqual(v2, view); assert.equal(v2.tex, tex);
  assert.notEqual(enc.pass.depthStencilAttachment.view, desc.depthStencilAttachment.view);
  assert.equal(desc.colorAttachments[0].view, view, 'the game\'s descriptor is left as it was');
});

test('what\'s young, destroyed or the canvas\'s own is left alone', () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const old = new GPUTexture('old').createView();
  const gOld = d.createBindGroup({ entries: [{ binding: 0, resource: old }] });
  const doomedTex = new GPUTexture('doomed');
  const gDoomed = d.createBindGroup({ entries: [{ binding: 0, resource: doomedTex.createView() }] });
  const deadBuf = new GPUBuffer();
  const gDeadBuf = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('x').createView() }, { binding: 1, resource: { buffer: deadBuf } }] });
  const canvasView = new GPUCanvasContext().getCurrentTexture().createView();
  const gCanvas = d.createBindGroup({ entries: [{ binding: 0, resource: canvasView }] });
  c.t = 18;
  const young = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('young').createView() }] });
  doomedTex.destroy(); deadBuf.destroy();
  c.t = 21; frame(d, gOld);
  assert.notEqual(frame(d, gOld).got, gOld);
  assert.equal(frame(d, young).got, young, 'made 3 s before the round');
  assert.equal(frame(d, gDoomed).got, gDoomed, 'its texture destroyed');
  assert.equal(frame(d, gDeadBuf).got, gDeadBuf, 'its buffer destroyed');
  assert.equal(frame(d, gCanvas).got, gCanvas, 'the canvas\'s texture of the moment');
});

test('a round is spread over encoders, a slice at a time', () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const gs = Array.from({ length: 100 }, (_, i) => d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture(i).createView() }] }));
  c.t = 21;
  d.createCommandEncoder();
  const swapped = () => gs.filter((g) => frame(d, g).got !== g).length;
  // (Each frame() makes an encoder too, so count without making more: one encoder, then look.)
  given = [];
  const pass = new GPUComputePassEncoder();
  for (const g of gs) pass.setBindGroup(0, g);
  assert.equal(given.filter((x, i) => x !== gs[i]).length, 48, 'one slice on the first encoder of the round');
  assert.equal(swapped(), 100, 'and the rest on the encoders after');
});

test('an objection from the GPU puts everything back as the game made it', async () => {
  const d = device(), c = clock(), fv = new FreshViews(d, { every: 20, now: c.now });
  const g = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('t').createView() }] });
  d.errors.push({ message: 'Invalid BindGroupLayout' });
  c.t = 21; frame(d, g);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(fv.on, false);
  assert.match(fv.why, /Invalid/);
  assert.equal(frame(d, g).got, g);
  c.t = 60; assert.equal(frame(d, g).got, g, 'and stays off');
});

test('on where WebKit\'s own WebGPU is, and by ?fresh', () => {
  const ua = (s) => { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: s }, configurable: true }); };
  const none = new URLSearchParams('');
  ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1');
  assert.equal(wantFreshViews(none), true);
  ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1');
  assert.equal(wantFreshViews(none), true, 'Chrome on an iPhone is WebKit');
  ua('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15');
  assert.equal(wantFreshViews(none), true, 'Safari on a Mac');
  ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
  assert.equal(wantFreshViews(none), false);
  ua('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36');
  assert.equal(wantFreshViews(none), false);
  assert.equal(wantFreshViews(new URLSearchParams('fresh=1')), true);
  ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1');
  assert.equal(wantFreshViews(new URLSearchParams('fresh=0')), false);
});
