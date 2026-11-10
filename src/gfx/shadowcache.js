// The middle and far shadow cascades, kept from frame to frame (docs/RENDERING.md, "Kept shadows").
// What never moves (the ground, the buildings, the trees, the rocks) is drawn into a map of its own, and each frame only
// that map is copied into the cascade and what moves (bodies, folk, what they hold, what lies about) is drawn over it.
// For a map to keep, its box can't follow where you look: it sits on you instead, wide enough for any way you turn, and
// on a grid, so it only moves once you've walked a few metres. When it must move, or the sun has crept on, the next map is
// drawn over a few frames into a second one while the first is still used, and they swap when it's done. Only a teleport
// (or the first frame) draws a whole map in one go.
import { mat4LookTo, mat4Mul, mat4Ortho } from '../core/math.js';

const DEPTH = 'depth32float';
// How far the sun may creep before the maps are drawn again: a tenth of a degree, ten seconds of a day hour.
const SUN_STEP = Math.cos(0.12 * Math.PI / 180);
// A new map is drawn over this many frames.
const FRAMES = 10;

export class ShadowCache {
  constructor(r) {
    this.r = r;
    const { device, tier } = r;
    this.size = tier.shadowSize;
    this.tex = device.createTexture({ size: [this.size, this.size, 4], format: DEPTH, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    this.views = [0, 1, 2, 3].map((i) => this.tex.createView({ dimension: '2d', baseArrayLayer: i, arrayLayerCount: 1 }));
    // Per kept cascade: the grid its box sits on (metres), its two maps, the one in use and the one being drawn.
    const kept = (c, grid, layer) => ({ c, grid, layers: [layer, layer + 1], front: null, back: null, todo: 0, swapped: false, pines: {}, rocks: {} });
    this.cas = [null, kept(1, 4, 0), kept(2, 12, 2)];
    this.V = new Float32Array(16); this.P = new Float32Array(16);
    this.stats = { builds: 0, sync: 0 };
  }

  destroy() {
    this.tex.destroy();
    for (const k of this.cas) {
      if (!k) continue;
      k.pines.buf?.destroy();
      for (const L of k.rocks.lists || []) L.buf?.destroy();
    }
  }

  // The sun the near cascade should use: the one the middle map was drawn with, so the cascades agree where they meet.
  sunFor(live) { return this.cas[1].front ? this.cas[1].front.sun : live; }

  // A box for cascade k round the camera: the sun's view, the box's half-width, its centre on the grid (and on the map's
  // texels, so a box that moves draws its edges on the same texels as before).
  box(k, cam, sun, half) {
    const V = new Float32Array(16);
    mat4LookTo(V, 0, 0, 0, -sun[0], -sun[1], -sun[2], 0, 1, 0);
    const [lx, ly, lz] = this.light(V, cam);
    const g = k.grid, texel = 2 * half / this.size;
    const cx = Math.round(Math.round(lx / g) * g / texel) * texel;
    const cy = Math.round(Math.round(ly / g) * g / texel) * texel;
    const cz = Math.round(lz / g) * g;
    mat4Ortho(this.P, cx - half, cx + half, cy - half, cy + half, -cz - 260, -cz + 260);
    const vp = new Float32Array(16);
    mat4Mul(vp, this.P, V);
    return { V, vp, sun: [sun[0], sun[1], sun[2]], half, cx, cy, cz, at: [cam.x, cam.z] };
  }

  light(V, p) {
    return [V[0] * p.x + V[4] * p.y + V[8] * p.z, V[1] * p.x + V[5] * p.y + V[9] * p.z, V[2] * p.x + V[6] * p.y + V[10] * p.z];
  }

  // Whether box b still holds all that cascade's viewer could see from cam, whichever way they turn.
  covers(b, cam, need) {
    const [lx, ly, lz] = this.light(b.V, cam);
    const slack = b.half - need;
    return Math.abs(lx - b.cx) <= slack && Math.abs(ly - b.cy) <= slack && Math.abs(lz - b.cz) <= 60;
  }

  // Before the frame's data is written: which map cascade c uses this frame (its matrix goes in d at o), and what's to be
  // drawn into the next. far: the cascade's far split. key: what the map's casters depend on besides the box.
  plan(c, cam, far, tan, aspect, sun, key, d, o) {
    const k = this.cas[c];
    k.swapped = false; k.todo = 0;
    const need = Math.hypot(far, far * tan * aspect, far * tan);
    const half = Math.ceil((need + k.grid) / 2) * 2;
    const f = k.front;
    if (!f || !this.covers(f, cam, need)) {
      // Nothing to show that's right: finish the next map now if it does, else draw one here and now.
      if (!k.back || !this.covers(k.back, cam, need) || k.back.key !== key) this.start(k, cam, sun, half, key);
      if (f) this.stats.sync++;
      k.todo = k.back.jobs.length - k.back.next;
    } else if (!k.back) {
      const s = f.sun, dot = s[0] * sun[0] + s[1] * sun[1] + s[2] * sun[2];
      const [lx, ly, lz] = this.light(f.V, cam);
      const g = k.grid, step = g * 0.5 + 2 * f.half / this.size;
      const moved = Math.abs(lx - f.cx) > step || Math.abs(ly - f.cy) > step || Math.abs(lz - f.cz) > g;
      if (moved || dot < SUN_STEP || f.key !== key || f.half > half * 1.15 || f.half < half) this.start(k, cam, sun, half, key);
    }
    if (k.back && !k.todo) k.todo = Math.min(k.back.jobs.length - k.back.next, Math.ceil(k.back.jobs.length / FRAMES));
    if (k.back && k.back.next + k.todo >= k.back.jobs.length) {
      // (Done this frame: it's the one this frame uses, and its first copy can't wait for the far cascade's turn.)
      k.drawing = k.back;
      k.front = k.back; k.back = null; k.swapped = true;
    } else k.drawing = k.back;
    d.set(k.front.vp, o);
  }

  start(k, cam, sun, half, key) {
    const layer = k.front && k.front.layer === k.layers[0] ? k.layers[1] : k.layers[0];
    const b = this.box(k, cam, sun, half);
    b.layer = layer; b.key = key; b.next = 0;
    b.jobs = this.r.keptShadowJobs(k, b);
    k.back = b;
    this.stats.builds++;
  }

  // Slots 3 and 4 of the shadow uniforms: the boxes being drawn into this frame.
  slots(data) {
    for (const k of this.cas) if (k && k.drawing && k.todo) data.set(k.drawing.vp, (2 + k.c) * 64);
  }

  // The next few draws of each map being made.
  encode(enc, bg) {
    for (const k of this.cas) {
      if (!k || !k.drawing || !k.todo) continue;
      const b = k.drawing;
      const sp = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.views[b.layer], depthLoadOp: b.next === 0 ? 'clear' : 'load', depthClearValue: 1, depthStoreOp: 'store' } });
      sp.setBindGroup(0, bg, [(2 + k.c) * 256]);
      const end = Math.min(b.jobs.length, b.next + k.todo);
      for (; b.next < end; b.next++) b.jobs[b.next](sp);
      sp.end();
      k.drawing = null;
    }
  }

  // Whether cascade c is drawn this frame (the far one every other frame, as before, unless its map just changed), and if
  // so, its kept map copied in, ready for what moves.
  copy(enc, c, farNow, target) {
    const k = this.cas[c];
    if (c === 2 && !farNow && !k.swapped) return false;
    enc.copyTextureToTexture({ texture: this.tex, origin: { x: 0, y: 0, z: k.front.layer } }, { texture: target, origin: { x: 0, y: 0, z: c } }, { width: this.size, height: this.size, depthOrArrayLayers: 1 });
    return true;
  }
}
