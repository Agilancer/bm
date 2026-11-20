// WebKit's views made again now and then (src/gfx/freshviews.js), on a stand-in WebGPU: a pass is handed a bind group made
// again from the game's, holding views made again of the same textures seen the same way, once the GPU has said nothing
// against them; the game's own are left as they are; only what was used since the last round is made again; what's young,
// destroyed or the canvas's own is left alone; a round is worked through a little before each encoder; and any objection
// from the GPU puts everything back, an out-of-memory noted for the next start.
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
// (The run's note, for the out-of-memory one.)
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

const { FreshViews, wantFreshViews } = await import('../src/gfx/freshviews.js');
const { beginRun } = await import('../src/core/lastrun.js');

// errors: what each scope pair says, in turn: [out-of-memory, validation].
const device = () => ({
  errors: [], scopes: 0, groupsMade: 0,
  createBindGroup(desc) { this.groupsMade++; return new GPUBindGroup(desc); },
  createCommandEncoder() { return new GPUCommandEncoder(); },
  pushErrorScope() { this.scopes++; },
  popErrorScope() { this.scopes--; const pair = this.errors[0]; const e = pair ? pair[this.scopes % 2 ? 0 : 1] : null; if (pair && this.scopes % 2 === 0) this.errors.shift(); return Promise.resolve(e || null); },
});
// Seconds on a clock the test turns (and, with `step`, that moves on a little each time it's read, for the budget).
const clock = () => { const c = { t: 0, step: 0, now: () => { const t = c.t; c.t += c.step; return t; } }; return c; };
// A frame: an encoder made, and the bind groups set in a pass of it. What the pass was given.
const frame = (d, ...gs) => { given = []; const pass = d.createCommandEncoder().beginComputePass(); for (const g of gs) pass.setBindGroup(0, g); return gs.length === 1 ? given[0] : given; };
// The GPU's answer to the scopes, which comes later (on WebKit, frames later).
const answered = () => new Promise((r) => setTimeout(r, 0));

test('a pass is given a bind group made again, with views made again of the same texture, seen the same way', async () => {
  const d = device(), c = clock(), fv = new FreshViews(d, { every: 20, now: c.now });
  const tex = new GPUTexture('stone'), buf = new GPUBuffer();
  const view = tex.createView({ dimension: '2d-array' });
  const layout = {};
  const binding = { buffer: buf, offset: 256 };
  const g = d.createBindGroup({ layout, entries: [{ binding: 0, resource: view }, { binding: 1, resource: binding }] });
  assert.equal(frame(d, g), g, 'before the first round, the game\'s own');
  binding.offset = 512;                            // (changed after: what's made again binds what the game's did)
  c.t = 25;
  assert.equal(frame(d, g), g, 'the round has made its stand-ins, but the GPU hasn\'t answered yet');
  await answered();
  const got = frame(d, g);
  assert.notEqual(got, g);
  assert.ok(got instanceof GPUBindGroup);
  assert.equal(got.desc.layout, layout);
  const v2 = got.desc.entries[0].resource;
  assert.notEqual(v2, view);
  assert.equal(v2.tex, tex);
  assert.deepEqual(v2.desc, { dimension: '2d-array' });
  assert.equal(got.desc.entries[1].resource.buffer, buf);
  assert.equal(got.desc.entries[1].resource.offset, 256);
  assert.equal(g.desc.entries[0].resource, view, 'the game\'s own bind group is left as it was');
  assert.equal(frame(d, g), got, 'and the same stand-in till the next round');
  // The next round: made again again, so the last ones can go.
  c.t = 50; frame(d, g); await answered();
  const third = frame(d, g);
  assert.notEqual(third, got);
  assert.notEqual(third.desc.entries[0].resource, v2);
  assert.equal(fv.rounds, 2);
  assert.equal(d.scopes, 0, 'every error scope pushed is popped');
});

test('attachments are handed the view made again', async () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const tex = new GPUTexture('hdr'), view = tex.createView();
  const desc = { colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store' }], depthStencilAttachment: { view: new GPUTexture('depth').createView() } };
  let enc = d.createCommandEncoder(); enc.beginRenderPass(desc);
  assert.equal(enc.pass.colorAttachments[0].view, view);
  c.t = 30; d.createCommandEncoder(); await answered();
  enc = d.createCommandEncoder(); enc.beginRenderPass(desc);
  const v2 = enc.pass.colorAttachments[0].view;
  assert.notEqual(v2, view); assert.equal(v2.tex, tex);
  assert.notEqual(enc.pass.depthStencilAttachment.view, desc.depthStencilAttachment.view);
  assert.equal(desc.colorAttachments[0].view, view, 'the game\'s descriptor is left as it was');
});

test('only what was used since the last round is made again', async () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const inUse = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('a').createView() }] });
  const once = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('mip').createView() }] });
  frame(d, inUse, once);                           // the load: one used for good, one for a pass and never again
  c.t = 21; frame(d, inUse); await answered();
  const made = d.groupsMade;
  c.t = 42; frame(d, inUse); await answered();
  assert.equal(d.groupsMade - made, 1, 'the second round made only the one still in use');
});

test('a bind group the game makes after a round is made with the views standing in then', async () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const view = new GPUTexture('rune').createView();
  const g = d.createBindGroup({ entries: [{ binding: 0, resource: view }] });
  frame(d, g);
  c.t = 21; frame(d, g); await answered();
  const standIn = frame(d, g).desc.entries[0].resource;
  // A spell's, say, made for a cast and let go: it doesn't feed the game's own view.
  const cast = d.createBindGroup({ entries: [{ binding: 0, resource: view }] });
  assert.equal(cast.desc.entries[0].resource, standIn);
});

test('what\'s young, destroyed or the canvas\'s own is left alone', async () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const old = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('old').createView() }] });
  const doomedTex = new GPUTexture('doomed');
  const doomed = d.createBindGroup({ entries: [{ binding: 0, resource: doomedTex.createView() }] });
  const deadBuf = new GPUBuffer();
  const gDeadBuf = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('x').createView() }, { binding: 1, resource: { buffer: deadBuf } }] });
  const canvas = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUCanvasContext().getCurrentTexture().createView() }] });
  c.t = 18;
  const young = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('young').createView() }] });
  frame(d, old, doomed, gDeadBuf, canvas, young);
  doomedTex.destroy(); deadBuf.destroy();
  c.t = 21; frame(d, old, doomed, gDeadBuf, canvas, young); await answered();
  const [o, dd, db, cv, y] = frame(d, old, doomed, gDeadBuf, canvas, young);
  assert.notEqual(o, old);
  assert.equal(dd, doomed, 'its texture destroyed');
  assert.equal(db, gDeadBuf, 'its buffer destroyed');
  assert.equal(cv, canvas, 'the canvas\'s texture of the moment');
  assert.equal(y, young, 'made 3 s before the round');
  c.t = 41; frame(d, young); await answered();
  assert.notEqual(frame(d, young), young, 'and made again the round after');
});

test('a round is worked through a millisecond at a time, before each encoder', async () => {
  const d = device(), c = clock(); new FreshViews(d, { every: 20, now: c.now });
  const gs = Array.from({ length: 100 }, (_, i) => d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture(i).createView() }] }));
  frame(d, ...gs);
  c.t = 21; c.step = 0.0001;                       // each thing made again takes a tenth of a millisecond
  const made = d.groupsMade;
  d.createCommandEncoder();
  assert.ok(d.groupsMade - made >= 8 && d.groupsMade - made <= 11, `about ten on the first encoder (${d.groupsMade - made})`);
  for (let i = 0; i < 12; i++) d.createCommandEncoder();
  assert.equal(d.groupsMade - made, 100, 'and the rest on the encoders after');
  c.step = 0; await answered();
  assert.equal(frame(d, ...gs).filter((x, i) => x !== gs[i]).length, 100);
});

test('an objection from the GPU puts everything back as the game made it, and nothing it objected to is handed out', async () => {
  const d = device(), c = clock(), fv = new FreshViews(d, { every: 20, now: c.now });
  const g = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('t').createView() }] });
  frame(d, g);
  d.errors.push([null, { message: 'Invalid BindGroupLayout' }]);
  c.t = 21;
  assert.equal(frame(d, g), g);
  await answered();
  assert.equal(fv.on, false);
  assert.match(fv.why, /Invalid/);
  assert.equal(frame(d, g), g);
  c.t = 60; assert.equal(frame(d, g), g, 'and stays off');
});

test('out of memory: off, and the next start loads lighter as for any out-of-memory', async () => {
  beginRun(new URLSearchParams('light=0'));
  const d = device(), c = clock(), fv = new FreshViews(d, { every: 20, now: c.now });
  const g = d.createBindGroup({ entries: [{ binding: 0, resource: new GPUTexture('t').createView() }] });
  frame(d, g);
  d.errors.push([{ message: 'Not enough memory left' }, null]);
  c.t = 21; frame(d, g); await answered();
  assert.equal(fv.on, false);
  assert.match(fv.why, /out of memory/);
  assert.equal(JSON.parse(store.get('velscour.lastRun')).oom, true);
  assert.equal(beginRun().light, 1);
});

test('on where WebKit\'s own WebGPU is, and by ?fresh', () => {
  const ua = (s) => { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: s }, configurable: true }); };
  const none = new URLSearchParams('');
  ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1');
  assert.equal(wantFreshViews(none), true);
  ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148');
  assert.equal(wantFreshViews(none), true, 'an app on the home screen (no Version/ or Safari/)');
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
