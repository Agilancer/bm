// An iPhone's WebGPU (WebKit, until its fix of 4 November 2026: bugs.webkit.org 329399) keeps, in every texture view, the
// id of every command encoder that view was ever used in: as a pass's attachment, or in a bind group set in one of its passes.
// Nothing takes an id out again while the view lives. The game makes its views once and draws with them every frame, one
// encoder a frame, so each frame added an id to each of some hundreds of views, for as long as the game ran: hundreds of MB
// after twenty minutes, held by the GPU's process and counted by iOS against the page, which is the likeliest reading of
// the crash the owner saw 21 minutes in (November 2026).
//
// So where that WebKit runs, the views are made again every so often, and the bind groups that hold them. The game keeps the
// view and the bind group it made and goes on handing them to passes; a pass is given the newest made from them instead
// (setBindGroup, beginRenderPass). The ones it was given before are let go, and WebKit's ids for them go with them. The first
// ones the game made stop gathering ids once they're stood in for. Nothing else changes: a view made again is the same
// texture seen the same way, and a bind group made again holds the same things.
//
// A round makes again only what was used since the last began (a bind group made for one pass at the load, and not yet
// collected, is left be), a millisecond's worth before each encoder, so a round of some hundreds of bind groups is spread
// over a dozen frames or so.
//
// ?fresh=1 turns it on anywhere (Chrome, to test it), ?fresh=0 off. tools/memory/init.js models the bug (`__leak()`).

import { noteEvent, noteRun } from '../core/lastrun.js';

const AGE = 5;          // s: a view or bind group younger than this is left as it is till the next round
const BUDGET = 0.001;   // s: of making again before each encoder (at least one thing each time)

export function wantFreshViews(params = new URLSearchParams(globalThis.location?.search || '')) {
  if (params.has('fresh')) return params.get('fresh') !== '0';
  const ua = globalThis.navigator?.userAgent || '';
  // WebKit's own WebGPU: Safari on a Mac, an app on an iPhone's home screen, and every browser on an iPhone or iPad
  // (CriOS, FxiOS and EdgiOS are WebKit there).
  return /AppleWebKit/.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox|SamsungBrowser)\//.test(ua);
}

export class FreshViews {
  /** every: seconds between rounds. now: a clock in seconds (for tests; it also times the budget). */
  constructor(device, { every = 20, now = () => performance.now() / 1000 } = {}) {
    this.device = device; this.every = every; this.clock = now;
    this.on = true;
    this.rounds = 0; this.made = { views: 0, groups: 0 };
    // What the game made, each with what's handed out in its place (now), the round it was last used in, and when it was made.
    this.viewOf = new WeakMap();    // a view: { tex, desc, at, used, round, now }
    this.groupOf = new WeakMap();   // a bind group: { desc, at, used, now }
    this.used = [];                 // WeakRefs to what's been used since the last round began: the next round's work
    this.queue = null;              // this round's, as it goes
    this.dead = new WeakSet();      // textures and buffers destroyed, and the canvas's own textures
    this.nextAt = now() + every;
    this.install();
  }

  install() {
    const self = this, device = this.device;
    const TP = GPUTexture.prototype, BP = GPUBuffer.prototype, CE = GPUCommandEncoder.prototype;
    this.nativeView = TP.createView;
    this.nativeGroup = device.createBindGroup;
    const nativeView = this.nativeView, nativeGroup = this.nativeGroup;
    TP.createView = function (desc) {
      const v = nativeView.call(this, desc);
      if (self.on && !self.dead.has(this)) self.viewOf.set(v, { tex: this, desc: desc && { ...desc }, at: self.clock(), used: -1, round: -1, now: null, next: null });
      return v;
    };
    for (const P of [TP, BP]) {
      const destroy = P.destroy;
      P.destroy = function () { self.dead.add(this); return destroy.call(this); };
    }
    if (globalThis.GPUCanvasContext) {
      const get = GPUCanvasContext.prototype.getCurrentTexture;
      GPUCanvasContext.prototype.getCurrentTexture = function () { const t = get.call(this); self.dead.add(t); return t; };
    }
    device.createBindGroup = function (desc) {
      if (!self.on || !desc?.entries?.some((e) => self.viewOf.has(e.resource))) return nativeGroup.call(this, desc);
      // Made with the views standing in for the game's now, so one made and let go often (younger than a round) doesn't
      // feed the game's own views ids. What it was asked for is kept, the entries copied, and a buffer's binding with them,
      // so what's made again binds what this did.
      const entries = desc.entries.map((e) => ({ ...e, resource: e.resource?.buffer ? { ...e.resource } : e.resource }));
      const g = nativeGroup.call(this, { ...desc, entries: entries.map((e) => ({ ...e, resource: self.viewOf.get(e.resource)?.now || e.resource })) });
      self.groupOf.set(g, { desc: { ...desc, entries }, at: self.clock(), used: -1, now: null, next: null });
      return g;
    };
    // A round goes on as encoders are made, before each: never with a pass open.
    const encoder = device.createCommandEncoder;
    device.createCommandEncoder = function (...a) { self.tick(); return encoder.apply(this, a); };
    for (const C of [GPURenderPassEncoder, GPUComputePassEncoder]) {
      const set = C.prototype.setBindGroup;
      C.prototype.setBindGroup = function (i, g, ...rest) { return set.call(this, i, (g && self.use(self.groupOf, g)) || g, ...rest); };
    }
    const begin = CE.beginRenderPass;
    CE.beginRenderPass = function (desc) {
      if (!self.on) return begin.call(this, desc);
      const swap = (v) => (v && self.use(self.viewOf, v)) || v;
      const d = { ...desc, colorAttachments: (desc.colorAttachments || []).map((c) => c && { ...c, view: swap(c.view), ...(c.resolveTarget ? { resolveTarget: swap(c.resolveTarget) } : {}) }) };
      if (desc.depthStencilAttachment) d.depthStencilAttachment = { ...desc.depthStencilAttachment, view: swap(desc.depthStencilAttachment.view) };
      return begin.call(this, d);
    };
  }

  // A view or bind group the game made, handed to a pass: what stands in for it (null: itself), and it's down for the next round.
  use(map, x) {
    const i = map.get(x);
    if (!i) return null;
    if (i.used !== this.rounds) { i.used = this.rounds; this.used.push(new WeakRef(x)); }
    return i.now;
  }

  // A view made again from the one the game made, once a round, unless its texture's gone. It's `next` till the GPU has
  // said nothing against it (scoped), and only then handed out.
  fresh(v, staged) {
    const i = this.viewOf.get(v);
    if (!i || this.dead.has(i.tex)) return null;
    if (i.round !== this.rounds) {
      i.round = this.rounds;
      i.next = this.nativeView.call(i.tex, i.desc);
      staged.push([i, i.next]);
      this.made.views++;
    }
    return i.next;
  }

  // A bind group made again, its views made again; or, if what it holds is gone, it's handed out as the game made it.
  regroup(i, t, staged) {
    if (t - i.at < AGE) return;
    let ok = true;
    const entries = i.desc.entries.map((e) => {
      const res = e.resource;
      if (this.viewOf.has(res)) { const v = t - this.viewOf.get(res).at >= AGE ? this.fresh(res, staged) : this.viewOf.get(res).now || res; if (!v) ok = false; return { ...e, resource: v }; }
      if ((res instanceof GPUBuffer && this.dead.has(res)) || (res?.buffer && this.dead.has(res.buffer))) ok = false;
      return e;
    });
    if (!ok) { i.now = null; return; }
    i.next = this.nativeGroup.call(this.device, { ...i.desc, entries });
    staged.push([i, i.next]);
    this.made.groups++;
  }

  // Before every command encoder (install). A round starts every `every` seconds, with what was used since the last; it's
  // worked through BUDGET at a time.
  tick() {
    if (!this.on) return;
    const t = this.clock();
    if (!this.queue) {
      if (t < this.nextAt) return;
      this.nextAt = t + this.every;
      this.rounds++;
      this.queue = this.used; this.used = [];
    }
    this.scoped((staged) => {
      do {
        const x = this.queue.pop()?.deref();
        if (!x) continue;
        const g = this.groupOf.get(x);
        if (g) this.regroup(g, t, staged);
        else if (t - (this.viewOf.get(x)?.at ?? t) >= AGE) this.fresh(x, staged);
      } while (this.queue.length && this.clock() - t < BUDGET);
    });
    if (!this.queue.length) this.queue = null;
  }

  // Its own calls, with the GPU's objections caught round them and nothing else's (pushed and popped with no await between).
  // What they made is handed out only once both scopes come back empty (on WebKit, a trip to the GPU's process and back:
  // till then the last round's stand-ins go on). Any objection and it stops for good, and the passes are given what the game
  // made, as without it. Out of memory is noted for the next start as the game's own handler would have (src/main.js), which
  // never hears of an error a scope caught.
  scoped(fn) {
    const d = this.device, staged = [];
    d.pushErrorScope('validation'); d.pushErrorScope('out-of-memory');
    try { fn(staged); } finally {
      Promise.all([d.popErrorScope(), d.popErrorScope()]).then(([oom, invalid]) => {
        if (oom) { noteRun({ oom: true }); this.off(`out of memory: ${oom.message}`); } else if (invalid) this.off(invalid.message);
        else if (this.on) for (const [i, x] of staged) if (i.next === x) i.now = x;
      }, (e) => this.off(String(e?.message || e)));
    }
  }

  off(why) {
    if (!this.on) return;
    this.on = false; this.why = why;
    // (Each stand-in let go: use() hands out what the game made once `now` is null, and the maps go with this.)
    this.viewOf = new WeakMap(); this.groupOf = new WeakMap();
    this.used = []; this.queue = null;
    console.warn(`graphics: views no longer made fresh: ${why}`);
    noteEvent('views no longer made fresh');
  }
}
