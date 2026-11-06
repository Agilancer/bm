// The eyes in the skull in the left hand: glowing particles down in its sockets, alive, looking at you. An ember eye and a spirit eye, each with
// particles of its own. They stare, glance about, blink, follow the turn of your head, and feel things: what happens to you shows in them.
// All of it is on the render thread and owes the sim nothing. bm.renderer.skullEyes.feel('angry') to try a mood.
import { H } from '../core/layout.js';
import { COMMON } from './shaders.js';

const WGSL = COMMON + /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) col: vec4f, @location(2) k: f32 };
@vertex fn vs(@builtin(vertex_index) i: u32, @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f) -> VO {
  var o: VO;
  let uv = vec2f(f32(i & 1u), f32(i >> 1u)) * 2.0 - 1.0;
  let l = uv * vec2f(a.w, b.x);
  let cs = vec2f(cos(b.y), sin(b.y));
  o.pos = F.vmProj * vec4f(a.xy + vec2f(l.x * cs.x - l.y * cs.y, l.x * cs.y + l.y * cs.x), a.z, 1.0);
  o.uv = uv; o.col = c; o.k = b.z;
  return o;
}
@fragment fn fs(in: VO) -> @location(0) vec4f {
  return vec4f(in.col.rgb * in.col.a * pow(max(1.0 - length(in.uv), 0.0), in.k), 0.0);
}`;

// Where the eyes sit, in the view's own space: a little in front of each socket's back wall. Goes with AT and FACING in tools/wizard/skull_arm.py.
const SEATS = [[-0.5093, -0.1755, -0.7334], [-0.4188, -0.1836, -0.7867]];
const LOOKS = [
  { iris: [1, 0.4, 0.07], core: [1, 0.86, 0.55], speck: [1, 0.5, 0.12] },   // the ember eye, on your left: sparks that rise
  { iris: [0.16, 0.72, 1], core: [0.8, 0.97, 1], speck: [0.55, 0.6, 1] },   // the spirit eye: motes that circle it
];
const RAGE = [1, 0.08, 0.03], PALE = [0.85, 0.9, 1];

// open: how far the lid; size: the iris; tilt: + brows down at the middle, - up; glow; hue: + to rage, - to pale; shake; roam: how often it looks away from you;
// hold: seconds between glances; blink: seconds between blinks; rate: how fast it sheds; droop: down in the socket.
const MOODS = {
  stare: { open: 1, size: 1, tilt: 0, glow: 1, hue: 0, shake: 0, roam: 0.12, hold: [2.5, 6], blink: [3, 7], rate: 1, droop: 0 },
  curious: { open: 1.05, size: 1.08, tilt: -0.12, glow: 1.15, hue: 0, shake: 0, roam: 0.85, hold: [0.5, 1.3], blink: [3, 6], rate: 1.3, droop: 0 },
  angry: { open: 0.48, size: 1.12, tilt: 0.6, glow: 2, hue: 1, shake: 0.001, roam: 0.04, hold: [1, 2], blink: [6, 10], rate: 3, droop: 0 },
  afraid: { open: 1.35, size: 0.68, tilt: -0.4, glow: 0.9, hue: -1, shake: 0.0022, roam: 1, hold: [0.12, 0.4], blink: [0.8, 2], rate: 0.5, droop: 0 },
  glee: { open: 0.42, size: 1.15, tilt: -0.5, glow: 1.75, hue: 0, shake: 0, roam: 0.2, hold: [0.6, 1.2], blink: [4, 8], rate: 3, droop: -0.002 },
  sleepy: { open: 0.2, size: 0.9, tilt: -0.1, glow: 0.45, hue: 0, shake: 0, roam: 0.1, hold: [3, 6], blink: [2, 4], rate: 0.25, droop: 0.007 },
};
const KEYS = ['open', 'size', 'tilt', 'glow', 'hue', 'shake', 'rate', 'droop'];
const MAX = 170, SPECKS = 22, STRIDE = 12, AURA = 64;
const CENTRE = [-0.483, -0.159, -0.783];     // the skull's middle: SKULL_AT
const GEM_LIGHT = { ruby: [1, 0.15, 0.12], topaz: [1, 0.62, 0.15], emerald: [0.15, 1, 0.45], sapphire: [0.2, 0.45, 1], amethyst: [0.75, 0.3, 1], diamond: [0.9, 0.97, 1] };
const between = (a, b) => a + (b - a) * Math.random();

export class SkullEyes {
  constructor(device, bgl0, targets, depthFormat, msaa, compile) {
    this.device = device;
    const module = compile(WGSL);
    this.pipe = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
      vertex: { module, entryPoint: 'vs', buffers: [{ arrayStride: STRIDE * 4, stepMode: 'instance', attributes: [0, 1, 2].map((l) => ({ shaderLocation: l, offset: l * 16, format: 'float32x4' })) }] },
      fragment: { module, entryPoint: 'fs', targets: targets.map((t, i) => (i ? { format: t.format, writeMask: 0 } : { format: t.format, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } })) },
      primitive: { topology: 'triangle-strip' },
      // Tested against the skull, so its rim hides them, and never written: they're light.
      depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare: 'greater' }, multisample: { count: msaa },
    });
    this.buf = device.createBuffer({ size: MAX * STRIDE * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.data = new Float32Array(MAX * STRIDE);
    this.n = 0;
    this.t = 0;
    this.now = { ...MOODS.stare };
    this.mood = 'stare'; this.moodT = 0; this.idleT = between(6, 14); this.stillT = 0;
    this.gaze = [0, 0]; this.gazeV = [0, 0]; this.aim = [0, 0]; this.aimT = 2; this.lag = 0;
    this.blinkT = between(2, 5); this.blinking = -1;
    this.flash = 0; this.casting = false; this.lastF = null;
    this.specks = [0, 1].map(() => Array.from({ length: SPECKS }, () => ({ age: 1, life: 0 })));
    this.emit = [0, 0];
    this.sparks = Array.from({ length: 16 }, () => ({ age: 1, life: 0 }));
    this.looks = LOOKS; this.skin = null; this.spots = null;
    this.auraBuf = device.createBuffer({ size: AURA * STRIDE * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.auraData = new Float32Array(AURA * STRIDE);
    this.auraN = 0;
    this.motes = Array.from({ length: 36 }, () => ({ age: 1, life: 0 }));
  }

  // What the skull is: its eyes, from epic up, and the gems to set glinting.
  setSkin(skin, spots) {
    this.spots = spots;
    if (skin === this.skin) return;
    this.skin = skin;
    this.looks = skin.eyes ? skin.eyes.map((c) => ({ iris: c, core: c.map((v) => v + (1 - v) * 0.75), speck: c })) : LOOKS;
  }

  // Past the world's own pass, so what rises off a legendary or goes round a mythical can leave the skull's edge.
  makeAura(compile, bgl0, format, inWorld) {
    const module = compile(WGSL);
    this.pAura = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
      vertex: { module, entryPoint: 'vs', buffers: [{ arrayStride: STRIDE * 4, stepMode: 'instance', attributes: [0, 1, 2].map((l) => ({ shaderLocation: l, offset: l * 16, format: 'float32x4' })) }] },
      fragment: { module, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } }] },
      primitive: { topology: 'triangle-strip' }, ...inWorld,
    });
  }

  drawAura(pass) {
    if (!this.auraN || !this.pAura) return;
    pass.setPipeline(this.pAura);
    pass.setVertexBuffer(0, this.auraBuf);
    pass.draw(4, this.auraN);
  }

  // The skull's glow colour, turning through the spectrum if it's the kind to.
  tone(u) {
    const s = this.skin, c = s.eyes?.[0] || s.glow;
    if (!s.cycle) return c;
    return [0.55 + 0.45 * Math.cos(u), 0.55 + 0.45 * Math.cos(u + 2.09), 0.55 + 0.45 * Math.cos(u + 4.19)];
  }

  // Sparkle off the gems, and what rises or turns around a legendary or a mythical.
  extras(dt, sway, ox, oy) {
    const d = this.data, t = this.t;
    const raw = (D, n, x, y, z, sx, sy, rot, k, c, a) => {
      const o = n * STRIDE;
      D[o] = sway[0] * x + sway[4] * y + sway[8] * z + sway[12]; D[o + 1] = sway[1] * x + sway[5] * y + sway[9] * z + sway[13]; D[o + 2] = sway[2] * x + sway[6] * y + sway[10] * z + sway[14];
      D[o + 3] = sx; D[o + 4] = sy; D[o + 5] = rot; D[o + 6] = k; D[o + 7] = 0; D[o + 8] = c[0]; D[o + 9] = c[1]; D[o + 10] = c[2]; D[o + 11] = a;
    };
    for (const g of this.spots || []) {
      if (this.n + 3 > MAX) break;
      const c = GEM_LIGHT[g.kind] || GEM_LIGHT.diamond, x = g.x + ox, y = g.y + oy;
      raw(d, this.n++, x, y, g.z, g.size * 1.5, g.size * 1.5, 0, 1.6, c, 0.5 + 0.12 * Math.sin(t * 2 + g.phase));
      // A star, every so often, turning a little as it goes.
      const star = Math.pow(Math.max(Math.sin(t * 1.3 + g.phase * 2.3), 0), 26) * 9;
      if (star > 0.05) {
        raw(d, this.n++, x, y, g.z, 0.024, 0.0014, 0.5 + t * 0.2, 1, [1, 1, 1], star);
        raw(d, this.n++, x, y, g.z, 0.0014, 0.024, 0.5 + t * 0.2, 1, [1, 1, 1], star);
      }
    }
    this.auraN = 0;
    const aura = this.skin?.aura;
    if (!aura) return;
    const [cx, cy, cz] = CENTRE;
    for (const m of this.motes) {
      if (m.age >= m.life) {
        const a = Math.random() * Math.PI * 2;
        Object.assign(m, { age: 0, life: between(0.9, 2.2), x: Math.cos(a) * between(0.1, 0.15), y: Math.sin(a) * between(0.05, 0.15), v: between(0.05, 0.13), size: between(0.0018, 0.0048), ph: Math.random() * 7 });
      }
      m.age += dt; m.y += m.v * dt; m.x += Math.sin(t * 2 + m.ph) * 0.012 * dt;
      raw(this.auraData, this.auraN++, cx + ox + m.x, cy + oy + m.y, cz, m.size, m.size, 0, 1.3, this.tone(t + m.ph), 3.2 * Math.sin(Math.min(m.age / m.life, 1) * Math.PI));
    }
    if (aura === 2) {
      // A crown of light, turning above the brow, and a hazy ring under it.
      for (let i = 0; i < 18; i++) {
        const a = t * 0.9 + i / 18 * Math.PI * 2, s = Math.sin(a), near = Math.cos(a);
        const x = cx + ox + s * 0.135, y = cy + oy + 0.125 + near * 0.018 + Math.sin(t * 2 + i) * 0.002, z = cz + near * 0.05;
        raw(this.auraData, this.auraN++, x, y, z, 0.0048, 0.0048, 0, 1.2, this.tone(a * 2 + t * 0.5), 3.4 + near * 1.6);
      }
      raw(this.auraData, this.auraN++, cx + ox, cy + oy + 0.125, cz, 0.17, 0.035, 0, 2.2, this.tone(t * 0.5), 0.42);
    }
  }

  // Something happened: this mood, for this long.
  feel(mood, secs = 3) {
    if (!MOODS[mood]) return;
    if (mood !== this.mood) { this.aimT = 0; if (mood === 'angry' || mood === 'glee') this.burst(); }
    this.mood = mood; this.moodT = secs;
  }

  burst() {
    this.sparks.forEach((s, i) => {
      const a = Math.random() * Math.PI * 2, v = between(0.05, 0.14);
      Object.assign(s, { eye: i & 1, age: 0, life: between(0.25, 0.6), x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    });
  }

  // What's happening to you, and what that does to them.
  read(dt, cam, snap) {
    const flash = snap[H.DMG_FLASH], weak = snap[H.WEAK] > 0.5;
    if (flash > this.flash + 0.05) this.feel(weak ? 'afraid' : 'angry', 4);
    this.flash = flash;
    const casting = snap[H.CAST_HELD] > 0 || snap[H.SWINGING] > 0;
    if (casting && !this.casting && this.mood !== 'angry' && this.mood !== 'afraid') this.feel('glee', 1.6);
    this.casting = casting;
    this.stillT = snap[H.GROUND_SPEED] > 0.3 || casting ? 0 : this.stillT + dt;
    if (this.mood === 'sleepy' && this.stillT === 0) this.feel('curious', 1.8);   // Woken.
    // Your head turning: they stay on what they were on a moment longer, and a quick turn gets their attention.
    const L = this.lastF, rate = L && dt > 0 ? (L[0] * cam.fz - L[1] * cam.fx) / dt * -1 : 0;
    this.lastF = [cam.fx, cam.fz];
    this.lag += (Math.max(-1, Math.min(1, -rate * 0.3)) - this.lag) * Math.min(1, dt * 7);
    if (Math.abs(rate) > 3.5 && this.mood === 'stare') this.feel('curious', 1.4);
    this.moodT -= dt;
    if (this.moodT <= 0) {
      if (weak) this.feel('afraid', 2);
      else if (this.stillT > 25) this.feel('sleepy', 2);
      else {
        this.idleT -= Math.max(dt, -this.moodT);
        if (this.idleT <= 0) { this.idleT = between(6, 14); this.feel('curious', between(1.8, 3)); } else { this.mood = 'stare'; this.moodT = 0.5; }
      }
    }
  }

  // The frame's: sway, the view model's matrix; breath, the arm's own little move, which they go with. Fills the instances.
  update(dt, cam, snap, sway, breath) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    this.read(dt, cam, snap);
    const m = MOODS[this.mood], now = this.now, ease = Math.min(1, dt * (this.mood === 'angry' || this.mood === 'afraid' ? 14 : 5));
    for (const k of KEYS) now[k] += (m[k] - now[k]) * ease;
    // Where they look: straight at you, unless something else has caught them. They jump there, and settle.
    this.aimT -= dt;
    if (this.aimT <= 0) {
      this.aimT = between(...m.hold);
      if (Math.random() < m.roam) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()); this.aim = [Math.cos(a) * r, Math.sin(a) * r * 0.7]; } else this.aim = [0, 0];
    }
    for (let c = 0; c < 2; c++) {
      const to = this.aim[c] + (c ? 0 : this.lag);
      this.gazeV[c] += ((to - this.gaze[c]) * 420 - this.gazeV[c] * 38) * dt;
      this.gaze[c] += this.gazeV[c] * dt;
    }
    // The lid.
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkT = between(...m.blink); this.blinking = 0; }
    let lid = 1;
    if (this.blinking >= 0) {
      this.blinking += dt / 0.15;
      if (this.blinking >= 1) this.blinking = -1; else lid = Math.max(0.03, 1 - Math.sin(this.blinking * Math.PI));
    }
    const breathe = 0.92 + 0.08 * Math.sin(this.t * 1.7), ox = breath[4] * 2, oy = breath[5] * 2;
    this.n = 0;
    SEATS.forEach((seat, e) => {
      const look = this.looks[e], side = e ? 1 : -1;
      // Mix the mood's colour in; a curious one raises a brow.
      const hue = now.hue > 0 ? RAGE : PALE, h = Math.min(1, Math.abs(now.hue));
      const iris = look.iris.map((v, i) => v + (hue[i] - v) * h);
      const brow = this.mood === 'curious' ? (e ? 0.86 : 1.14) : 1;
      const open = now.open * lid * brow, R = 0.0135 * now.size * breathe;
      const shake = now.shake, jx = shake * (Math.random() - 0.5) * 2, jy = shake * (Math.random() - 0.5) * 2;
      const gx = this.gaze[0] * 0.011 + jx, gy = this.gaze[1] * 0.009 - now.droop + jy;
      const x0 = seat[0] + ox, y0 = seat[1] + oy, z = seat[2];
      const put = (x, y, sx, sy, rot, k, c, a) => {
        if (this.n >= MAX) return;
        const px = x0 + x, py = y0 + y, d = this.data, o = this.n++ * STRIDE;
        d[o] = sway[0] * px + sway[4] * py + sway[8] * z + sway[12];
        d[o + 1] = sway[1] * px + sway[5] * py + sway[9] * z + sway[13];
        d[o + 2] = sway[2] * px + sway[6] * py + sway[10] * z + sway[14];
        d[o + 3] = sx; d[o + 4] = sy; d[o + 5] = rot; d[o + 6] = k; d[o + 7] = 0;
        d[o + 8] = c[0]; d[o + 9] = c[1]; d[o + 10] = c[2]; d[o + 11] = a;
      };
      const rot = side * now.tilt * -1;
      // The socket's own glow, then the iris, then the hot point that does the looking.
      put(gx * 0.4, gy * 0.4, 0.04, 0.036, 0, 1.6, iris, 0.12 * now.glow * (0.4 + 0.6 * Math.min(open, 1)));
      put(gx, gy, R * 1.25, R * 1.25 * open, rot, 1.6, iris, 1.1 * now.glow);
      put(gx, gy, R * 0.7, R * 0.7 * open, rot, 1.1, iris, 2.6 * now.glow);
      if (lid > 0.2) put(gx, gy, 0.0055 * (2 - now.size), 0.0055 * (2 - now.size) * Math.min(open, 1), rot, 1, look.core, 6 * now.glow);
      // What each sheds. The ember eye's rise and curl away; the spirit eye's go round it.
      this.emit[e] += dt * 14 * now.rate;
      for (const s of this.specks[e]) {
        if (s.age >= s.life) {
          if (this.emit[e] < 1) continue;
          this.emit[e] -= 1;
          const a = Math.random() * Math.PI * 2, r = R * (e ? between(1, 1.8) : between(0.1, 0.8));
          Object.assign(s, { age: 0, life: e ? between(0.8, 2.2) : between(0.5, 1.2), a, r, x: gx + Math.cos(a) * r, y: gy + Math.sin(a) * r * Math.min(open, 1), v: between(0.012, 0.035), phase: Math.random() * 7, spin: side * between(1.5, 3.5), size: between(0.0011, 0.0024) });
        }
        s.age += dt;
        const u = s.age / s.life, fade = Math.sin(Math.min(u, 1) * Math.PI);
        let x, y;
        if (e) {
          s.a += s.spin * dt * (0.6 + now.rate * 0.4);
          x = gx + Math.cos(s.a) * s.r; y = gy + Math.sin(s.a) * s.r * Math.max(0.45, Math.min(open, 1));
        } else {
          s.y += s.v * dt * (0.7 + now.rate * 0.5); s.x += Math.sin(this.t * 5 + s.phase) * 0.01 * dt;
          x = s.x; y = s.y;
        }
        const tw = e ? 0.65 + 0.35 * Math.sin(this.t * 13 + s.phase) : 1;
        put(x, y, s.size, s.size, 0, 1, look.speck.map((v, i) => v + (hue[i] - v) * h), 4 * fade * tw * now.glow);
      }
    });
    // A flare off the moment, when a feeling comes on hard.
    for (const s of this.sparks) {
      if (s.age >= s.life) continue;
      s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const seat = SEATS[s.eye], hue = now.hue > 0 ? RAGE : this.looks[s.eye].core, px = seat[0] + ox + s.x, py = seat[1] + oy + s.y, d = this.data;
      if (this.n >= MAX) break;
      const o = this.n++ * STRIDE;
      d[o] = sway[0] * px + sway[4] * py + sway[8] * seat[2] + sway[12];
      d[o + 1] = sway[1] * px + sway[5] * py + sway[9] * seat[2] + sway[13];
      d[o + 2] = sway[2] * px + sway[6] * py + sway[10] * seat[2] + sway[14];
      d[o + 3] = 0.0016; d[o + 4] = 0.0016; d[o + 5] = 0; d[o + 6] = 1; d[o + 7] = 0;
      d[o + 8] = hue[0]; d[o + 9] = hue[1]; d[o + 10] = hue[2]; d[o + 11] = 7 * (1 - s.age / s.life);
    }
    this.extras(dt, sway, ox, oy);
    if (this.auraN) this.device.queue.writeBuffer(this.auraBuf, 0, this.auraData, 0, this.auraN * STRIDE);
    this.device.queue.writeBuffer(this.buf, 0, this.data, 0, this.n * STRIDE);
  }

  draw(pass) {
    if (!this.n) return;
    pass.setPipeline(this.pipe);
    pass.setVertexBuffer(0, this.buf);
    pass.draw(4, this.n);
  }
}
