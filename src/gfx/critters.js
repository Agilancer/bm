// The gilded critters, drawn: what they do is src/core/critters.js, their bodies src/core/critter-models.js. Each frame
// every one is posed (a scarab's six legs in their tripod gait, a moth's wings fanning as it crawls and beating as it
// flutters off, a wisp's crystal turning and its rings going round), and drawn as VELSCOUR draws them: a soft glow about it,
// motes going round it, and a wisp's flame of a tail. The three that are ripe (worth catching) have the rest of VELSCOUR's
// marks: a ring on the ground under it that beats, quicker in its last seconds as it flashes; glitter rising off it; and a
// small red arrow bobbing over it, pointing down at it (gold over a prismatic wisp, and lit gold-white once you're near enough
// to catch it). The nearest few light the ground round them, the ripe first. Caught, it swells and bursts in a flash.
//
// The bodies are drawn with the things lying on the ground (src/gfx/renderer.js, its ITEM pipeline): every part of every
// kind one batch, instanced, and glowing where its paint says (the ITEM shader's painted glow, a 6). A wisp's crystal is
// light over the world (src/gfx/critterglass.js). The glows are the spells' (src/gfx/spellfx.js HALO and BEACON, in its
// extraAir and extraGround); the glitter the particles' kind 14.
import { groundUp, REACH } from '../core/critters.js';
import * as CM from '../core/critter-models.js';
import { FX_FLOATS } from '../core/layout.js';
import { HALO, BEACON } from './spellfx.js';
import { GHOST } from './critterglass.js';
import { mipCountFor } from './gpu.js';

const TAU = Math.PI * 2;
const { M } = CM;
const lin = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255) ** 2.2);
const packed = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) * 256 + parseInt(h.slice(5, 7), 16) * 65536;
const smooth = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

const CAP = 48;        // instances a batch can hold
// How strongly each part's painted glow shines (times its paint's own, src/core/critter-models.js MATS), and how much more as
// it flashes.
const GLOW = { scarab: 2.5, leg: 1, mothBody: 2.4, wing: 2.6, core: 1.6, ring: 1.8, arrow: 1 };
const FLASH = 2.4;
// Its glow's size round it (metres across, half), how bright, and how hot its white heart. One not ripe glows less.
const HALO_OF = { wisp: [0.42, 0.45, 0.25], moth: [0.4, 0.38, 0.12], scarab: [0.36, 0.38, 0.1], prism: [0.4, 0.4, 0.35] };
const UNRIPE_GLOW = 0.6;
// One not ripe catches the sun now and then, a wink of light: every 1.5 to 3.5 s (its own), for 0.2 s. So the twenty show across
// a hillside by day, without an arrow among them.
const WINK = { every: [1.5, 3.5], for: 0.2 };
const GHOST_K = 0.5;     // how much of an arrow shows where something's in front of it
const BEACON_R = 0.42;
const LIT = { pc: 6, lean: 2 };
const FAR = 70;          // no further off than this is one drawn at all
const ARROW_FAR = 40;    // nor a ripe one's arrow
const SPARK_FAR = 38;    // nor its glitter
const STRIDE = { scarab: 0.11, moth: 0.05 };
const RAIN = ['#ff80e0', '#80e0ff', '#ffe060', '#90ff90'];
const ARROW = 0.2;       // the arrow's height
const PINK = lin('#ff80e0');
const TAIL = Array.from({ length: 9 }, (_, i) => { const a = lin(CM.TAIL_FROM), b = lin(CM.TAIL_TO), k = i / 8; return a.map((v, q) => v + (b[q] - v) * k); });

// The basis of a body standing on ground whose up is n, facing a.
function frameOn(n, a, P, s, out) {
  const fx = Math.cos(a), fz = Math.sin(a), d = fx * n[0] + fz * n[2];
  let X0 = fx - n[0] * d, X1 = -n[1] * d, X2 = fz - n[2] * d;
  const l = 1 / (Math.hypot(X0, X1, X2) || 1); X0 *= l; X1 *= l; X2 *= l;
  // Z = X x Y
  const Z0 = X1 * n[2] - X2 * n[1], Z1 = X2 * n[0] - X0 * n[2], Z2 = X0 * n[1] - X1 * n[0];
  out[0] = X0 * s; out[1] = X1 * s; out[2] = X2 * s; out[3] = 0;
  out[4] = n[0] * s; out[5] = n[1] * s; out[6] = n[2] * s; out[7] = 0;
  out[8] = Z0 * s; out[9] = Z1 * s; out[10] = Z2 * s; out[11] = 0;
  out[12] = P[0]; out[13] = P[1]; out[14] = P[2]; out[15] = 1;
  return out;
}
const UP = [0, 1, 0];
const MIRROR = M.S(1, 1, -1);
// A point of a model's frame W, in the world.
const at = (W, p) => [W[0] * p[0] + W[4] * p[1] + W[8] * p[2] + W[12], W[1] * p[0] + W[5] * p[1] + W[9] * p[2] + W[13], W[2] * p[0] + W[6] * p[1] + W[10] * p[2] + W[14]];

export class CritterLook {
  constructor(r) {
    this.r = r;
    this.t = 0;
    r.critterItems = this.items = [];
    r.critterLights = this.lights = [];
    this.ground = { data: new Float32Array(48 * FX_FLOATS), n: 0 };
    this.air = { data: new Float32Array(320 * FX_FLOATS), n: 0 };
    this.pool = Array.from({ length: 10 }, () => ({ p: [0, 0, 0], c: [1, 1, 1], r: 3, i: 0 }));
    this.bursts = [];
    this.W = new Array(16).fill(0);
    this.n = [0, 1, 0];
    this.cell = 2;
    this.hover = null;       // the one under the pointer, in reach (src/main.js hoverCritter): lit up
    try { this.build(); } catch (e) { console.warn('critters', e); this.models = null; }
  }

  build() {
    const r = this.r, { device } = r;
    const tex = (format, bytes, w, h) => {
      const t = device.createTexture({ size: [w, h], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      device.queue.writeTexture({ texture: t }, bytes, { bytesPerRow: w * 4 }, [w, h]);
      return t;
    };
    const { col, mr } = CM.paletteBytes();
    const pal = [tex('rgba8unorm-srgb', col, CM.PALETTE_W, CM.PALETTE_H), r.flatNormal || (r.flatNormal = r.pixel('rgba8unorm', [128, 128, 255, 255])), tex('rgba8unorm', mr, CM.PALETTE_W, CM.PALETTE_H)];
    const wing = this.paintWings(pal[1]);
    const mk = (geo, k, maps = pal) => {
      const m = r.lyingModel(geo.prim(), maps[0], maps[1], maps[2], [k, k, k, 6]);
      return { m, hot: this.variant(m, [k * FLASH, k * FLASH, k * FLASH, 6]) };
    };
    const md = this.models = {
      sBody: mk(CM.scarabBody(), GLOW.scarab), sLeg: [0, 1, 2].map((i) => mk(CM.scarabLeg(i), GLOW.leg)),
      mBody: mk(CM.mothBody(), GLOW.mothBody), fore: mk(CM.wing('fore'), GLOW.wing, wing), hind: mk(CM.wing('hind'), GLOW.wing, wing),
      mLeg: [0, 1, 2].map((i) => mk(CM.mothLeg(i), GLOW.leg)),
      wCore: mk(CM.wispCore(), GLOW.core), wRing: [0, 1].map((i) => mk(CM.wispRing(false, i), GLOW.ring)),
      pCore: mk(CM.prismCore(), GLOW.core), pRing: [0, 1, 2].map((i) => mk(CM.wispRing(true, i), GLOW.ring)),
      arrow: mk(CM.arrow(), GLOW.arrow), arrowGold: mk(CM.arrow('amberFace', 'amberDark'), GLOW.arrow), arrowLit: mk(CM.arrow('litFace', 'red'), GLOW.arrow),
    };
    // A batch each, and one for it flashing. (Shadows from the bodies and wings; the rest are too fine to cast one worth its draw.)
    const B = (x, shadow) => ({ n: this.batch(x.m, shadow), h: this.batch(x.hot, shadow) });
    this.b = {
      sBody: B(md.sBody, true), sLeg: md.sLeg.map((x) => B(x, false)),
      mBody: B(md.mBody, true), fore: B(md.fore, true), hind: B(md.hind, true), mLeg: md.mLeg.map((x) => B(x, false)),
      wCore: B(md.wCore, false), wRing: md.wRing.map((x) => B(x, false)),
      pCore: B(md.pCore, false), pRing: md.pRing.map((x) => B(x, false)),
      arrow: B(md.arrow, false), arrowGold: B(md.arrowGold, false), arrowLit: B(md.arrowLit, false),
    };
  }

  // The same model glowing another strength: its own uniform, the same maps and buffers.
  variant(m, glow) {
    const { device } = this.r;
    const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(ubo, 0, new Float32Array(glow));
    const bg = device.createBindGroup({ layout: this.r.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: m.maps[0].createView() }, { binding: 2, resource: m.maps[1].createView() }, { binding: 3, resource: m.maps[2].createView() },
    ] });
    return { ...m, bg, tints: new Map() };
  }

  batch(model, shadow) {
    const g = { batch: true, n: 0, mats: new Float32Array(16 * CAP), ball: [0, 0, 0, 0], mesh: model, noShadow: !shadow || !!this.r.tier.lean, lo: [0, 0, 0], hi: [0, 0, 0] };
    this.items.push(g);
    return g;
  }

  put(g, m) {
    if (g.n >= CAP) return;
    g.mats.set(m, g.n * 16);
    const x = m[12], y = m[13], z = m[14];
    if (!g.n) { g.lo[0] = g.hi[0] = x; g.lo[1] = g.hi[1] = y; g.lo[2] = g.hi[2] = z; }
    else {
      if (x < g.lo[0]) g.lo[0] = x; else if (x > g.hi[0]) g.hi[0] = x;
      if (y < g.lo[1]) g.lo[1] = y; else if (y > g.hi[1]) g.hi[1] = y;
      if (z < g.lo[2]) g.lo[2] = z; else if (z > g.hi[2]) g.hi[2] = z;
    }
    g.n++;
  }

  // The moth's wings' picture (VELSCOUR's): deep indigo at the root going out to pale silver-blue at the edge, dark veins,
  // a gold eye on each, stars, and a rim of light. Its metal map: what glows (the stars, the eyes, the rim; the rest a little).
  paintWings(flat) {
    const { device } = this.r, S = 256, B = CM.WING_BOX, k = S / (B.x1 - B.x0);
    const canvas = () => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S }));
    const ca = canvas(), cm = canvas(), a = ca.getContext('2d'), m = cm.getContext('2d');
    const tx = (x) => (x - B.x0) * k, ty = (y) => (y - B.y0) * k;
    const path = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(tx(pts[0][0]), ty(pts[0][1])); for (const c of pts.slice(1)) ctx.bezierCurveTo(tx(c[0]), ty(c[1]), tx(c[2]), ty(c[3]), tx(c[4]), ty(c[5])); ctx.closePath(); };
    a.fillStyle = '#90b0ff'; a.fillRect(0, 0, S, S);
    m.fillStyle = 'rgb(150,150,0)'; m.fillRect(0, 0, S, S);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const kind of ['fore', 'hind']) {
      const pts = CM.WING_SHAPES[kind], outline = CM.wingOutline(pts, 14);
      let cx = 0, cy = 0;
      for (const [x, y] of outline) { cx += x; cy += y; }
      cx /= outline.length; cy /= outline.length;
      a.save(); path(a, pts); a.clip();
      m.save(); path(m, pts); m.clip();
      const gr = a.createRadialGradient(tx(0), ty(0), 0, tx(0), ty(0), 27 * k);
      // (Paler than VELSCOUR's canvas had it: its moths were lit pale lavender, and dark wings went to nothing in the grass.)
      gr.addColorStop(0, '#1a1050'); gr.addColorStop(0.22, '#3a36a0'); gr.addColorStop(0.5, '#7a8ae6'); gr.addColorStop(0.8, '#b4c2fa'); gr.addColorStop(1, '#d8e2ff');
      a.fillStyle = gr; a.fillRect(0, 0, S, S);
      m.fillStyle = 'rgb(26,150,0)'; m.fillRect(0, 0, S, S);
      // Veins, out from the root.
      a.strokeStyle = 'rgba(10,6,40,0.6)'; a.lineWidth = 0.35 * k;
      for (let i = 5; i < outline.length - 3; i += 8) {
        const [x, y] = outline[i];
        a.beginPath(); a.moveTo(tx(0), ty(0.4)); a.quadraticCurveTo(tx(x * 0.4 + 1), ty(y * 0.55), tx(x * 0.94), ty(y * 0.94)); a.stroke();
      }
      // Stars.
      for (let n = 0; n < 34; n++) {
        const x = B.x0 + rnd() * (B.x1 - B.x0), y = B.y0 + rnd() * (B.y1 - B.y0);
        path(a, pts);
        if (!a.isPointInPath(tx(x), ty(y))) continue;
        const rr = (0.22 + rnd() * 0.4) * k;
        a.fillStyle = rnd() < 0.5 ? '#fff6d8' : '#d8e6ff'; a.beginPath(); a.arc(tx(x), ty(y), rr, 0, TAU); a.fill();
        m.fillStyle = 'rgb(255,120,0)'; m.beginPath(); m.arc(tx(x), ty(y), rr * 1.2, 0, TAU); m.fill();
      }
      // The eye.
      const ex = cx + (kind === 'fore' ? 0.5 : -1), ey = cy * (kind === 'fore' ? 1.12 : 1.05), er = kind === 'fore' ? 2.6 : 1.9;
      for (const [rad, c, g] of [[er, '#ffd040', 230], [er * 0.62, '#120a30', 10], [er * 0.26, '#bcd4ff', 255]]) {
        a.fillStyle = c; a.beginPath(); a.arc(tx(ex), ty(ey), rad * k, 0, TAU); a.fill();
        m.fillStyle = `rgb(${g},120,0)`; m.beginPath(); m.arc(tx(ex), ty(ey), rad * k, 0, TAU); m.fill();
      }
      // The rim, and a soft band of light in from it.
      path(a, pts); a.strokeStyle = 'rgba(168,196,255,0.4)'; a.lineWidth = 3 * k; a.stroke();
      a.strokeStyle = '#d8e6ff'; a.lineWidth = 1.1 * k; a.stroke();
      path(m, pts); m.strokeStyle = 'rgb(110,140,0)'; m.lineWidth = 3 * k; m.stroke();
      m.strokeStyle = 'rgb(235,140,0)'; m.lineWidth = 1.1 * k; m.stroke();
      a.restore(); m.restore();
    }
    const up = (src, format) => {
      const mips = mipCountFor(S, S);
      const t = device.createTexture({ size: [S, S], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      device.queue.copyExternalImageToTexture({ source: src }, { texture: t }, [S, S]);
      const enc = device.createCommandEncoder();
      this.r.mip.generate(t, format, 1, mips, enc);
      device.queue.submit([enc.finish()]);
      return t;
    };
    return [up(ca, 'rgba8unorm-srgb'), flat, up(cm, 'rgba8unorm')];
  }

  /** Each frame, before the renderer's. on: they're out (not in the opening, a delve, under the ground). cell: the drawn
   *  ground's grid (src/gfx/renderer.js terrainCell). (youX, youZ): you, for what's in reach of you. */
  step(dt, field, cam, on, cell = 2, youX = cam.x, youZ = cam.z) {
    this.youX = youX; this.youZ = youZ;
    this.t += dt;
    const r = this.r;
    if (r.spellfx && r.spellfx.extraGround !== this.ground) { r.spellfx.extraGround = this.ground; r.spellfx.extraAir = this.air; }
    for (const g of this.items) g.n = 0;
    this.ground.n = 0; this.air.n = 0; this.lights.length = 0;
    r.critterGlass?.begin();
    if (!on || !this.models || !field) { this.bursts.length = 0; return; }
    this.cell = cell;
    // (The view's own right and up, for the arrows to face you square: src/gfx/renderer.js frameData's view.)
    const v = r.frameData;
    this.right = v ? [v[16], v[20], v[24]] : [1, 0, 0]; this.upV = v ? [v[17], v[21], v[25]] : [0, 1, 0]; this.back = v ? [v[18], v[22], v[26]] : [0, 0, 1];
    this.sun = v ? Math.max(0, Math.min(1, v[159])) : 0.5;
    this.phone = typeof document !== 'undefined' && document.body.classList.contains('touch');
    const lean = !!r.tier.lean, near = [];
    for (const c of field.list) {
      const d = Math.hypot(c.x - cam.x, c.z - cam.z);
      if (d > FAR) continue;
      this.pose(c, dt, cam, d, lean);
      if (c.alive || c.state === 'away') near.push([d + (c.ripe ? 0 : 1000), c]);
    }
    // Their lights: the nearest few (the ripe first), the very nearest two with a second that breathes in its other colour.
    // (Less by day: in the sun they lit the grass round them to straw.)
    near.sort((p, q) => p[0] - q[0]);
    const most = lean ? LIT.lean : LIT.pc, day = 1 - 0.65 * this.sun;
    let L = 0;
    for (let i = 0; i < near.length && L < this.pool.length && i < most; i++) {
      const c = near[i][1], m = c.middle(), fade = this.fade(c), K = c.K;
      const a = this.pool[L++];
      a.p[0] = m[0]; a.p[1] = m[1] + 0.25; a.p[2] = m[2]; a.r = 2.2; a.c = c.key === 'prism' ? PINK : (c.lc ||= lin(K.color));
      a.i = (c.ripe ? 0.85 : 0.4) * fade * day * (c.late ? 1.4 : 1);
      this.lights.push(a);
      if (i < 2 && c.ripe && !lean && L < this.pool.length) {
        const b = this.pool[L++];
        b.p[0] = m[0]; b.p[1] = m[1] + 0.6; b.p[2] = m[2]; b.r = 1.8; b.c = (c.l2 ||= lin(K.light2));
        b.i = (0.35 + 0.25 * Math.sin(this.t * 4 + c.ph)) * fade * day;
        this.lights.push(b);
      }
    }
    // A catch's burst: a flash, a ring going out over the ground, and its glow going.
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += dt;
      const k = b.t / 0.5;
      if (k >= 1) { this.bursts.splice(i, 1); continue; }
      if (b.t < 0.14) this.glow(this.air, HALO, b.x, b.y, b.z, 0.8 + b.t * 5, [2.6, 2.4, 2.1], 3, 1 - b.t / 0.14, b.seed);
      this.glow(this.ground, BEACON, b.x, b.gy, b.z, 0.2 + k * 1.6, b.c, 0, 1 - k, b.seed, b.gx, b.gz);
      this.glow(this.air, HALO, b.x, b.y, b.z, 0.5 + k * 0.9, b.c, 2 * (1 - k), (1 - k) * 1.2, b.seed);
    }
    for (const g of this.items) {
      if (!g.n) continue;
      g.ball[0] = (g.lo[0] + g.hi[0]) / 2; g.ball[1] = (g.lo[1] + g.hi[1]) / 2; g.ball[2] = (g.lo[2] + g.hi[2]) / 2;
      g.ball[3] = Math.hypot(g.hi[0] - g.lo[0], g.hi[1] - g.lo[1], g.hi[2] - g.lo[2]) / 2 + 0.6;
    }
  }

  // How much of it there is: coming into being, and going.
  fade(c) {
    const come = smooth(c.born);
    if (c.state === 'caught' || c.state === 'fade') return come * (1 - c.out);
    if (c.state === 'away') return come * (1 - smooth((c.out - 0.45) / 0.55));
    return come;
  }

  // gx, gz: the ground's slope under a ring on it (its height goes up gx a metre east, gz north), so it lies on the ground.
  glow(list, shape, x, y, z, size, col, hot, alpha, seed, gx = 0, gz = 0) {
    if (list.n * FX_FLOATS >= list.data.length) return;
    const o = list.n++ * FX_FLOATS, f = list.data;
    f[o] = x; f[o + 1] = y; f[o + 2] = z; f[o + 3] = size;
    f[o + 4] = col[0]; f[o + 5] = col[1]; f[o + 6] = col[2]; f[o + 7] = hot;
    f[o + 8] = shape; f[o + 9] = 0; f[o + 10] = seed; f[o + 11] = 0;
    f[o + 12] = alpha; f[o + 13] = gx; f[o + 14] = gz; f[o + 15] = 0;
  }

  // An arrow over a ripe one: square to the view, its point down at it, bobbing.
  arrowOver(c, dist) {
    const b = this.b, t = this.t, K = c.K;
    // (Further off it's bigger, so it's the same on the screen from 4.5 m out to its farthest, as VELSCOUR's is: about 4% of the
    // screen's height, 6.4% on a phone. Only the ripe three have one, so three marks that stay findable, not twenty that clutter.)
    const g = Math.min(ARROW_FAR / 4.5, Math.max(1, dist / 4.5)) * (this.phone ? 1.6 : 1);
    // (In reach of you, to be caught: its face turns gold-white, it beats, and it bobs twice as fast.)
    const near = Math.hypot(c.x - this.youX, c.z - this.youZ) <= REACH, bob = Math.abs(Math.sin(t * (near ? 10 : 5) + c.ph));
    const beat = near ? 1 + 0.15 * Math.max(0, Math.sin(t * TAU * 3)) : 1;
    // (Its point stays just over it however big it is, not up in the boughs: within 0.35 m.)
    const m = c.middle(), top = m[1] + K.size * 0.9 + 0.1 + bob * Math.min(0.2, 0.06 * g), a = smooth(c.born) * ARROW * g * beat;
    const R = this.right, U = this.upV, Z = this.back;
    const W = [R[0] * a, R[1] * a, R[2] * a, 0, U[0] * a, U[1] * a, U[2] * a, 0, Z[0] * a, Z[1] * a, Z[2] * a, 0, m[0], top, m[2], 1];
    const prism = c.key === 'prism', kind = prism ? b.arrowGold : near ? b.arrowLit : b.arrow;
    this.put(near ? kind.h : kind.n, W);
    // (And where something's in front of it, its ghost.)
    this.r.critterGlass?.ghost(prism ? GHOST.gold : near ? GHOST.lit : GHOST.red, W, GHOST_K * smooth(c.born));
  }

  pose(c, dt, cam, dist, lean) {
    const K = c.K, t = this.t, key = c.key, fade = this.fade(c), ripe = c.ripe;
    const hot = c.state === 'caught' || (c.late && Math.sin(t * TAU * 3.2) > 0) || c === this.hover;
    // (Popping in a little past its size, and swelling as it's caught. One coming in, down or up, comes as it is.)
    let s = smooth(c.born) * (c.arriving ? 1 : 1 + 0.22 * Math.sin(Math.PI * c.born));
    if (c.state === 'caught') s *= (1 + c.out * 0.9) * (1 - smooth(c.out));
    else if (c.state === 'away' && K.fly) s *= 1 - smooth((c.out - 0.5) / 0.5);
    else if (c.state === 'fade') s *= 1 - smooth(c.out);
    const col = key === 'prism' ? PINK : (c.lc ||= lin(K.color)), b = this.b;
    const W = this.W;
    if (s > 0.01) {
      if (key === 'scarab') {
        groundUp(c.x, c.z, this.cell, this.n);
        c.walk += (c.speedNow * dt) / STRIDE.scarab;
        const p = c.walk * TAU, bob = c.speedNow > 0 ? 0.004 * Math.abs(Math.sin(p * 2)) : 0;
        // (Digging in, nose first; digging up out of the ground, nose first the other way.)
        const n = this.n, dig = c.sink;
        frameOn(n, c.a, [c.x, c.groundY - dig * 0.24 + bob - n[1] * 0.004, c.z], s, W);
        const Wd = dig > 0 ? M.mul(W, M.Z((c.arriving ? 0.45 : -0.45) * dig)) : W;
        this.put(hot ? b.sBody.h : b.sBody.n, Wd);
        if (dist < 40) for (let i = 0; i < 3; i++) for (const side of [1, -1]) {
          const lp = p + ((i + (side > 0 ? 0 : 1)) % 2) * Math.PI;
          const local = M.mul(M.T(...CM.scarabHip(i, 1)), M.X(-0.28 * Math.max(0, Math.cos(lp))), M.Y(0.38 * Math.sin(lp)));
          this.put(b.sLeg[i].n, side > 0 ? M.mul(Wd, local) : M.mul(Wd, MIRROR, local));
        }
      } else if (key === 'moth') {
        groundUp(c.x, c.z, this.cell, this.n);
        const flying = c.lift > 0.02;
        if (!flying) c.walk += (c.speedNow * dt) / STRIDE.moth;
        const n = flying ? UP : this.n, h = CM.MOTH_UP * CM.MOTH;
        frameOn(n, c.a, [c.x + n[0] * h, c.groundY + n[1] * h + c.lift, c.z + n[2] * h], s, W);
        const Wb = flying ? M.mul(W, M.Z(0.18 * c.wings)) : W;
        this.put(hot ? b.mBody.h : b.mBody.n, Wb);
        // Wings: spread on the ground, fanning slowly; beating as it flies.
        const rest = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.3 + c.ph)), ph = t * 23 + c.ph;
        const up = rest + (0.25 + 0.95 * Math.sin(ph) - rest) * c.wings;
        for (const side of [1, -1]) {
          const Ws = side > 0 ? Wb : M.mul(Wb, MIRROR);
          this.put(hot ? b.fore.h : b.fore.n, M.mul(Ws, M.T(...CM.WING_PIVOT.fore.map((v) => v * CM.MOTH)), M.X(-up), M.Y(-0.12 * Math.cos(ph) * c.wings)));
          this.put(hot ? b.hind.h : b.hind.n, M.mul(Ws, M.T(...CM.WING_PIVOT.hind.map((v) => v * CM.MOTH)), M.X(-(up * 0.85 - 0.1 * c.wings)), M.Y(0.08 * c.wings)));
          if (dist < 30) for (let i = 0; i < 3; i++) {
            const lp = c.walk * TAU + ((i + (side > 0 ? 0 : 1)) % 2) * Math.PI;
            // (In the air they trail behind.)
            this.put(b.mLeg[i].n, flying ? M.mul(Ws, M.T(...CM.mothHip(i, 1)), M.Z(-0.6))
              : M.mul(Ws, M.T(...CM.mothHip(i, 1)), M.X(-0.22 * Math.max(0, Math.cos(lp))), M.Y(0.3 * Math.sin(lp))));
          }
        }
      } else {
        // A wisp: upright, its heart beating, its crystal turning round it, its rings going round.
        const prism = key === 'prism', P = [c.x, c.y, c.z];
        frameOn(UP, c.a, P, s, W);
        const k = t * 0.9 + c.ph;
        this.put(hot ? (prism ? b.pCore.h : b.wCore.h) : (prism ? b.pCore.n : b.wCore.n), M.mul(W, M.S(1 + 0.12 * Math.sin(t * 4 + c.ph * 2))));
        this.r.critterGlass?.put(prism, M.mul(W, M.Y(k * Math.PI / 2), M.X(0.3), M.Z(0.15)), prism ? [1, 0.82, 0.96] : [1, 1, 1], (prism ? 1.15 : 0.9) * fade * (hot ? 1.8 : 1) * (ripe ? 1 : 0.8));
        const tilts = CM.WISP_RINGS[prism ? 'prism' : 'wisp'], rings = prism ? b.pRing : b.wRing;
        tilts.forEach(([rx, rz], i) => this.put(hot ? rings[i].h : rings[i].n, M.mul(W, M.X(rx), M.Z(rz), M.Z((i % 2 ? -1 : 1) * k * TAU / 3))));
        // Its tail: VELSCOUR's nine beads of flame under it, swaying, trailing back the faster it goes.
        if (fade > 0.01) {
          const Wt = M.mul(W, M.Z(-Math.min(0.5, 0.15 + c.speedNow * 0.4)));
          for (let i = 0; i < 9; i++) {
            const q = CM.tailBead(i, t * 3 + c.ph), p = at(Wt, q), cc = prism ? (c[`m${i % 4}`] ||= lin(RAIN[i % 4])) : TAIL[i], e = 1.3 * (1 - i / 12) * (ripe ? 1 : 0.7);
            this.glow(this.air, HALO, p[0], p[1], p[2], q[3] * s * 2.6, [cc[0] * e, cc[1] * e, cc[2] * e], i < 2 ? 0.35 : 0, fade * (0.9 - i * 0.06), c.ph + i);
          }
        }
      }
      if (ripe && dist < ARROW_FAR && c.alive) this.arrowOver(c, dist);
    }
    if (fade <= 0.01) return;
    // Its glow, and its motes. (A ripe one's glow and its ring grow with distance, so one far off is a spark you can see.)
    const m = c.middle(), [hs0, hb0, hh] = HALO_OF[key], grow = ripe ? Math.min(3, Math.max(1, dist / 10)) : Math.min(2.5, Math.max(1, dist / 12.5)), hs = hs0 * grow * (ripe ? 1 : 0.8);
    const hb = hb0 * (ripe ? 1 : UNRIPE_GLOW) * (c === this.hover ? 1.8 : 1);
    c.seenR = hs * 0.55;
    const hotK = hot ? 1.6 : 1;
    // (A crawler's glow, grown with distance, rises with it, so it isn't half in the ground, a smear on a slope.)
    const lift = K.fly === 'hover' ? 0 : Math.max(0, hs - hs0) * 0.7;
    this.glow(this.air, HALO, m[0], m[1] + lift, m[2], hs * (1 + 0.08 * Math.sin(t * 9 + c.ph)), [col[0] * hb * hotK, col[1] * hb * hotK, col[2] * hb * hotK], hh * (ripe ? 1 : 0.5), fade, c.ph);
    const wisp = K.fly === 'hover', motes = wisp ? 6 : 3, mr = wisp ? 0.24 : 0.2;
    const mc = c.l2 ||= lin(K.light2), me = ripe ? 1.6 : 0.9;
    for (let i = 0; i < motes; i++) {
      const a = t * (wisp ? 1.6 : 1.1) + c.ph + (i * TAU) / motes, rr = mr + 0.03 * Math.sin(t * 2 + i);
      const mcol = key === 'prism' ? (c[`m${i % 4}`] ||= lin(RAIN[i % 4])) : i % 2 ? mc : col;
      this.glow(this.air, HALO, m[0] + Math.cos(a) * rr, m[1] + (wisp ? Math.sin(a * 2 + i) * 0.06 : 0.04 + 0.03 * Math.sin(a * 2 + i)), m[2] + Math.sin(a) * rr, 0.045, [mcol[0] * me, mcol[1] * me, mcol[2] * me], 1.2, fade, c.ph + i);
    }
    if (!ripe) {
      // Its wink of sunlight, now and then (dimmer by night, but there).
      if (c.alive && !c.arriving) {
        const every = WINK.every[0] + ((c.id * 0.618034) % 1) * (WINK.every[1] - WINK.every[0]), w = (t + c.ph * 3) % every;
        if (w < WINK.for) {
          const k = Math.sin((Math.PI * w) / WINK.for) * (0.45 + 0.55 * this.sun) * fade;
          this.glow(this.air, HALO, m[0], m[1] + K.size * 0.35, m[2], 0.1 * Math.min(5, Math.max(1, dist / 8)), [2.1 * k, 2.05 * k, 1.9 * k], 3, 1, c.ph + 7);
        }
      }
      if (key === 'scarab' && c.sink > 0) this.dust(c, dt);
      return;
    }
    // The ring on the ground under it (not under one going up and away), lying on the slope.
    if (c.state !== 'away' || !K.fly) {
      groundUp(c.x, c.z, this.cell, this.n);
      const n = this.n;
      this.glow(this.ground, BEACON, c.x, c.groundY, c.z, BEACON_R * Math.min(2.2, grow), [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9], c.late ? 14 : 5, fade, c.ph, -n[0] / n[1], -n[2] / n[1]);
    }
    // Glitter rising off it.
    if (dist < SPARK_FAR) {
      const rate = (lean ? 7 : 12) * (dist < 15 ? 1 : 0.6) * fade, nn = Math.floor(rate * dt + Math.random());
      for (let i = 0; i < nn; i++) {
        const a = Math.random() * TAU, rr = Math.random() * K.size * 0.45;
        const ck = Math.random() < 0.5 ? '#ffffff' : key === 'prism' ? RAIN[(Math.random() * 4) | 0] : K.color;
        this.r.emit(14, 1, m[0] + Math.cos(a) * rr, m[1] - 0.05 + Math.random() * 0.12, m[2] + Math.sin(a) * rr, 0, 1, 0, 0.25, 0.25, 0.45, 0.006, 0.014, 0.7, 1.3, packed(ck));
      }
    }
    if (key === 'scarab' && c.sink > 0) this.dust(c, dt);
  }

  // A scarab digging in or up: the earth thrown up round it.
  dust(c, dt) {
    if (Math.hypot(c.x - this.youX, c.z - this.youZ) < SPARK_FAR) this.r.emit(3, Math.floor(90 * dt + Math.random()), c.x, c.groundY + 0.02, c.z, 0, 0.5, 0, 1, 0.2, 0.6, 0.03, 0.07, 0.5, 1.1);
  }

  /** Caught: its burst. */
  caught(c) {
    const m = c.middle(), col = c.key === 'prism' ? PINK : (c.lc ||= lin(c.K.color));
    groundUp(c.x, c.z, this.cell, this.n);
    const n = this.n;
    this.bursts.push({ x: m[0], y: m[1], z: m[2], gy: c.groundY, c: col, t: 0, seed: c.ph, gx: -n[0] / n[1], gz: -n[2] / n[1] });
    const r = this.r;
    for (let i = 0; i < 26; i++) r.emit(14, 1, m[0], m[1], m[2], 0, 0.6, 0, 1.4, 0.8, 2.4, 0.014, 0.03, 0.6, 1.3, packed(c.key === 'prism' ? RAIN[i % 4] : c.K.color));
    for (let i = 0; i < 9; i++) r.emit(14, 1, m[0], m[1], m[2], 0, 0.8, 0, 1.2, 0.5, 1.6, 0.012, 0.022, 0.4, 0.9, packed('#ffffff'));
  }
}
