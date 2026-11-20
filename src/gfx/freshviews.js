// An iPhone's WebGPU (WebKit, until its fix of 4 November 2026: bugs.webkit.org 329399) keeps, in every texture view, the
// id of every command encoder that view was ever used in: as a pass's attachment, or in a bind group set in one of its passes.
// Nothing takes an id out again while the view lives. The game makes its views once and draws with them every frame, one
// encoder a frame, so each frame added an id to each of some hundreds of views, for as long as the game ran: hundreds of MB
// after twenty minutes, held by the GPU's process and counted by iOS against the page, until it closed the page (the crash
// the owner saw 21 minutes in, November 2026).
//
// So where that WebKit runs, the views are made again every so often, and the bind groups that hold them. The game keeps the
// view and the bind group it made and goes on handing them to passes; a pass is given the newest made from them instead
// (setBindGroup, beginRenderPass). The ones it was given before are let go, and WebKit's ids for them go with them. The first
// ones the game made stop gathering ids once they're stood in for. Nothing else changes: a view made again is the same
// texture seen the same way, and a bind group made again holds the same things.
//
// ?fresh=1 turns it on anywhere (Chrome, to test it), ?fresh=0 off. tools/memory/init.js models the bug (`__leak()`).

import { noteEvent } from '../core/lastrun.js';

const AGE = 5;         // s: a view or bind group younger than this is left as it is (one made for a frame or two needs nothing)
const SLICE = 48;       // bind groups made again a frame, so a round is spread over a few frames

export function wantFreshViews(params = new URLSearchParams(globalThis.location?.search || '')) {
  if (params.has('fresh')) return params.get('fresh') !== '0';
  const ua = globalThis.navigator?.userAgent || '';
  // WebKit's own WebGPU: Safari on a Mac, and every browser on an iPhone or iPad (CriOS, FxiOS and EdgiOS are WebKit there).
  return /AppleWebKit/.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox|SamsungBrowser)\//.test(ua);
}

export class FreshViews {
  /** every: seconds between rounds. now: a clock in seconds (the game's own, for tests). */
  constructor(device, { every = 20, now = () => performance.now() / 1000 } = {}) {
    this.device = device; this.every = every; this.clock = now;
    this.on = true;
    this.rounds = 0; this.made = { views: 0, groups: 0 };
    this.viewOf = new WeakMap();    // a view the game made: { tex, desc, at }
    this.viewNow = new WeakMap();   // a view the game made: the one a pass is given instead
    this.groupOf = new WeakMap();   // a bind group the game made: { desc, at }
    this.groupNow = new WeakMap();  // a bind group the game made: the one a pass is given instead
    this.groups = new Set();        // WeakRefs to the game's bind groups, to go round
    this.attached = new Set();      // WeakRefs to the game's views used as attachments
    this.attachedSeen = new WeakSet();
    this.dead = new WeakSet();      // textures and buffers destroyed, and the canvas's own textures
    this.queue = null; this.nextAt = now() + every;
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
      if (self.on && !self.dead.has(this)) self.viewOf.set(v, { tex: this, desc: desc && { ...desc }, at: self.clock() });
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
      const g = nativeGroup.call(this, desc);
      if (self.on && desc?.entries?.some((e) => self.viewOf.has(e.resource))) {
        self.groupOf.set(g, { desc: { ...desc, entries: desc.entries.map((e) => ({ ...e })) }, at: self.clock() });
        self.groups.add(new WeakRef(g));
      }
      return g;
    };
    for (const C of [GPURenderPassEncoder, GPUComputePassEncoder]) {
      const set = C.prototype.setBindGroup;
      C.prototype.setBindGroup = function (i, g, ...rest) { return set.call(this, i, (g && self.groupNow.get(g)) || g, ...rest); };
    }
    // A round goes on as encoders are made, before each: never with a pass open.
    const encoder = device.createCommandEncoder;
    device.createCommandEncoder = function (...a) { self.tick(); return encoder.apply(this, a); };
    const begin = CE.beginRenderPass;
    CE.beginRenderPass = function (desc) {
      if (!self.on) return begin.call(this, desc);
      const swap = (v) => {
        if (!v) return v;
        if (!self.attachedSeen.has(v) && self.viewOf.has(v)) { self.attachedSeen.add(v); self.attached.add(new WeakRef(v)); }
        return self.viewNow.get(v) || v;
      };
      const d = { ...desc, colorAttachments: (desc.colorAttachments || []).map((c) => c && { ...c, view: swap(c.view), ...(c.resolveTarget ? { resolveTarget: swap(c.resolveTarget) } : {}) }) };
      if (desc.depthStencilAttachment) d.depthStencilAttachment = { ...desc.depthStencilAttachment, view: swap(desc.depthStencilAttachment.view) };
      return begin.call(this, d);
    };
  }

  // A view made again from the one the game made, once a round (the round's number on it), unless its texture's gone.
  fresh(v, round) {
    const i = this.viewOf.get(v);
    if (!i || this.dead.has(i.tex)) return null;
    if (i.round !== round) {
      i.round = round;
      this.viewNow.set(v, this.nativeView.call(i.tex, i.desc));
      this.made.views++;
    }
    return this.viewNow.get(v);
  }

  // Before every command encoder (install). A round starts every `every` seconds: the attachments made again at once, then
  // the bind groups a slice an encoder.
  tick() {
    if (!this.on) return;
    const t = this.clock();
    if (!this.queue) {
      if (t < this.nextAt) return;
      this.nextAt = t + this.every;
      this.rounds++;
      this.queue = [];
      for (const r of this.groups) { const g = r.deref(); if (!g) this.groups.delete(r); else if (t - this.groupOf.get(g).at >= AGE) this.queue.push(r); }
      this.scoped(() => {
        for (const r of this.attached) {
          const v = r.deref();
          if (!v || this.dead.has(this.viewOf.get(v)?.tex)) { this.attached.delete(r); continue; }
          if (t - this.viewOf.get(v).at >= AGE) this.fresh(v, this.rounds);
        }
      });
    }
    const slice = this.queue.splice(0, SLICE);
    this.scoped(() => {
      for (const r of slice) {
        const g = r.deref(), info = g && this.groupOf.get(g);
        if (!info) continue;
        let ok = true;
        const entries = info.desc.entries.map((e) => {
          const res = e.resource;
          if (this.viewOf.has(res)) { const v = this.fresh(res, this.rounds); if (!v) ok = false; return { ...e, resource: v }; }
          if (res instanceof GPUBuffer && this.dead.has(res)) ok = false;
          else if (res?.buffer && this.dead.has(res.buffer)) ok = false;
          return e;
        });
        if (!ok) { this.groups.delete(r); this.groupNow.delete(g); continue; }
        this.groupNow.set(g, this.nativeGroup.call(this.device, { ...info.desc, entries }));
        this.made.groups++;
      }
    });
    if (!this.queue.length) this.queue = null;
  }

  // Its own calls, with the GPU's objections caught round them and nothing else's (pushed and popped with no await between).
  // Any objection and it stops for good: the passes are given what the game made, as without it.
  scoped(fn) {
    const d = this.device;
    d.pushErrorScope('validation'); d.pushErrorScope('out-of-memory');
    try { fn(); } finally {
      const caught = (e) => { if (e) this.off(e.message); };
      d.popErrorScope().then(caught, () => {}); d.popErrorScope().then(caught, () => {});
    }
  }

  off(why) {
    if (!this.on) return;
    this.on = false; this.why = why;
    this.groupNow = new WeakMap(); this.viewNow = new WeakMap();
    this.groups.clear(); this.attached.clear(); this.queue = null;
    console.warn(`graphics: views no longer made fresh: ${why}`);
    noteEvent('views no longer made fresh');
  }
}
