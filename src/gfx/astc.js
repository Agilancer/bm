// A phone's pictures packed small on the GPU itself, as they come in: ASTC, 4x4 texels to 16 bytes, a quarter of what the
// same picture holds as plain 8-bit colour. An iPhone counts every byte its GPU holds against the page (it closed the game
// with a white flash at about 1.4 GB), and the models' and the land's pictures were 200 MB of the 244 its textures were.
//
// Every iPhone with WebGPU reads ASTC ('texture-compression-astc'; Apple's GPUs all have it), and so do most Android
// phones'. A PC's GPU doesn't: it keeps its pictures as they are. Nothing about the files changes: each picture is made as
// before (decoded, shrunk, its mips drawn), then packed by a compute pass into a buffer and copied into the packed texture,
// and the plain one let go.
//
// The packing (one thread a 4x4 block): the block's colours fitted to a line through them (their principal axis), its two
// ends the block's two colours, every texel a step between them. Two kinds of block, chosen block by block:
//   - opaque (every alpha 255): RGB ends (ASTC colour endpoint mode 8, "LDR RGB direct") at 8 bits a channel, a texel one
//     of 8 steps between them (3-bit weights);
//   - with alpha: RGBA ends (mode 12) at 8 bits, one of 4 steps (2-bit weights).
// Both leave the ends at 8 bits with no trit or quint packing: ASTC picks the ends' precision from the bits left over, and
// in these two layouts the most it can pick is plain 8 bits (tools/astc/README.md works it through). One partition, one
// plane, a 4x4 grid of weights on a 4x4 block (so each weight is its texel's own).
//
// Before it packs anything, it packs a little picture of its own and reads it back through the GPU (check): if this GPU
// and browser don't read it back as it was, or the shader won't build, it packs nothing and the game runs on plain
// pictures, as a PC does. Nothing here has run on an Apple GPU yet; that's what the check is for.
//
// Checked against a decoder that isn't this one: Chrome's software GPU (SwiftShader) reads the packed pictures back, and
// tools/astc/check.html compares them with the plain ones, picture by picture (PSNR).

export const ASTC_BLOCK = 16;   // bytes a 4x4 block

// The two kinds of block: the 11-bit block mode (a 4x4 weight grid, one plane, at weightBits a weight), the colour endpoint
// mode, and how many 8-bit end values follow the 17 bits of header. tests/astc-layout.test.mjs decodes them as the spec does.
export const LAYOUTS = {
  rgb: { mode: 0x53, cem: 8, weightBits: 3, values: 6 },
  rgba: { mode: 0x42, cem: 12, weightBits: 2, values: 8 },
};
const { rgb: L3, rgba: L2 } = LAYOUTS;

const WGSL = /* wgsl */`
struct P { bw: u32, bh: u32, w: u32, h: u32, stride: u32, base: u32, srgb: u32, pad: u32 };
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> outBlocks: array<u32>;
@group(0) @binding(2) var<uniform> p: P;
// Set if any block had an alpha under 255 (pack: a map whose alpha is a mask stays plain).
@group(0) @binding(3) var<storage, read_write> seen: array<atomic<u32>>;

// A weight's step as the decoder reads it, out of 64 (ASTC's unquantised weights for 2 and 3 bits).
var<private> TWO: array<f32, 4> = array<f32, 4>(0.0, 21.0, 43.0, 64.0);
var<private> THREE: array<f32, 8> = array<f32, 8>(0.0, 9.0, 18.0, 27.0, 37.0, 46.0, 55.0, 64.0);
fn stepOf(k: u32, rgba: bool) -> f32 {
  if (rgba) { return TWO[k] / 64.0; }
  return THREE[k] / 64.0;
}

fn toSrgb(l: f32) -> f32 {
  if (l <= 0.0031308) { return l * 12.92; }
  return 1.055 * pow(l, 1.0 / 2.4) - 0.055;
}

// n bits of v (v < 2^n) at bit pos of a 128-bit block, little-endian words.
fn put(b: ptr<function, array<u32, 4>>, pos: u32, n: u32, v: u32) {
  let w = pos >> 5u;
  let s = pos & 31u;
  (*b)[w] = (*b)[w] | (v << s);
  if (s + n > 32u) { (*b)[w + 1u] = (*b)[w + 1u] | (v >> (32u - s)); }
}

// The covariance's principal axis, by power iteration from start (zero if start has nothing of it).
fn principal(cov: mat4x4f, start: vec4f) -> vec4f {
  var axis = start;
  for (var it = 0u; it < 8u; it++) {
    let a = cov * axis;
    let l = length(a);
    if (l < 1e-6) { break; }
    axis = a / l;
  }
  return axis;
}
// How much of the spread lies along it.
fn strength(cov: mat4x4f, v: vec4f) -> f32 {
  let n = dot(v, v);
  if (n < 1e-12) { return -1.0; }
  return dot(v, cov * v) / n;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= p.bw || id.y >= p.bh) { return; }
  var px: array<vec4f, 16>;
  var loA = 255.0;
  for (var i = 0u; i < 16u; i++) {
    let x = min(id.x * 4u + (i & 3u), p.w - 1u);
    let y = min(id.y * 4u + (i >> 2u), p.h - 1u);
    var c = clamp(textureLoad(src, vec2u(x, y), 0), vec4f(0.0), vec4f(1.0));
    // (An sRGB picture is read as light; packed as the bytes it's kept in.)
    if (p.srgb != 0u) { c = vec4f(toSrgb(c.r), toSrgb(c.g), toSrgb(c.b), c.a); }
    c = round(c * 255.0);
    px[i] = c; loA = min(loA, c.a);
  }
  let rgba = loA < 255.0;
  if (rgba) {
    atomicOr(&seen[0], 1u);
    // A texel with no alpha is never seen, only its colour bled a little into its neighbours' by the filter: it takes the
    // seen ones' mean, so it doesn't pull the line away from them (a leaf's edge against whatever was painted round it).
    var sum = vec3f(0.0);
    var n = 0.0;
    for (var i = 0u; i < 16u; i++) { if (px[i].a > 0.0) { sum += px[i].rgb; n += 1.0; } }
    if (n > 0.0 && n < 16.0) {
      let m = round(sum / n);
      for (var i = 0u; i < 16u; i++) { if (px[i].a == 0.0) { px[i] = vec4f(m, 0.0); } }
    }
  }
  var mean = vec4f(0.0);
  var lo = vec4f(255.0);
  var hi = vec4f(0.0);
  for (var i = 0u; i < 16u; i++) { mean += px[i]; lo = min(lo, px[i]); hi = max(hi, px[i]); }
  mean = mean / 16.0;
  let mask = select(vec4f(1.0, 1.0, 1.0, 0.0), vec4f(1.0), rgba);
  let levels = select(8u, 4u, rgba);

  // The line: the covariance's principal axis. Found from two starts, the box's diagonal and the covariance's widest
  // column, and the stronger kept: where one channel rises as another falls (a bevel in a normal map, metal against rough),
  // the diagonal is square to the line and finds nothing.
  var cov = mat4x4f(vec4f(0.0), vec4f(0.0), vec4f(0.0), vec4f(0.0));
  for (var i = 0u; i < 16u; i++) {
    let d = (px[i] - mean) * mask;
    cov += mat4x4f(d * d.x, d * d.y, d * d.z, d * d.w);
  }
  var wide = cov[0];
  var wv = cov[0][0];
  for (var k = 1u; k < 4u; k++) { if (cov[k][k] > wv) { wv = cov[k][k]; wide = cov[k]; } }
  let a1 = principal(cov, (hi - lo) * mask);
  let a2 = principal(cov, wide * mask);
  var axis = select(a1, a2, strength(cov, a2) > strength(cov, a1));
  if (dot(axis, axis) < 1e-12) { axis = vec4f(1.0, 1.0, 1.0, 1.0) * mask; }
  axis = normalize(axis);
  var t0 = 1e9;
  var t1 = -1e9;
  for (var i = 0u; i < 16u; i++) {
    let t = dot((px[i] - mean) * mask, axis);
    t0 = min(t0, t); t1 = max(t1, t);
  }
  let alpha1 = vec4f(0.0, 0.0, 0.0, 255.0) * (vec4f(1.0) - mask);
  var e0 = round(clamp(mean * mask + axis * t0, vec4f(0.0), vec4f(255.0))) + alpha1;
  var e1 = round(clamp(mean * mask + axis * t1, vec4f(0.0), vec4f(255.0))) + alpha1;

  // Each texel its nearest step; the ends fitted again to those steps (least squares), and the steps taken again.
  var wq: array<u32, 16>;
  for (var rep = 0u; rep < 2u; rep++) {
    let d = (e1 - e0) * mask;
    let dd = dot(d, d);
    var a = 0.0; var b = 0.0; var c = 0.0;
    var x0 = vec4f(0.0); var x1 = vec4f(0.0);
    for (var i = 0u; i < 16u; i++) {
      var t = 0.0;
      if (dd > 0.0) { t = dot((px[i] - e0) * mask, d) / dd; }
      var best = 0u;
      var err = 1e9;
      for (var k = 0u; k < levels; k++) {
        let e = abs(stepOf(k, rgba) - t);
        if (e < err) { err = e; best = k; }
      }
      wq[i] = best;
      let f = stepOf(best, rgba);
      a += (1.0 - f) * (1.0 - f); b += (1.0 - f) * f; c += f * f;
      x0 += (1.0 - f) * px[i]; x1 += f * px[i];
    }
    let det = a * c - b * b;
    if (rep == 0u && det > 1e-3) {
      e0 = round(clamp((c * x0 - b * x1) / det, vec4f(0.0), vec4f(255.0))) * mask + alpha1;
      e1 = round(clamp((a * x1 - b * x0) / det, vec4f(0.0), vec4f(255.0))) * mask + alpha1;
    }
  }

  // The decoder takes the ends in this order only if the second is the brighter (by r + g + b); else it reads them as
  // "blue contracted". So the brighter second, and the steps turned round if they're swapped.
  if (e1.r + e1.g + e1.b < e0.r + e0.g + e0.b) {
    let e = e0; e0 = e1; e1 = e;
    for (var i = 0u; i < 16u; i++) { wq[i] = levels - 1u - wq[i]; }
  }

  var blk = array<u32, 4>(0u, 0u, 0u, 0u);
  // Block mode (11 bits): a 4x4 weight grid, one plane; 0x53 3-bit weights, 0x42 2-bit. One partition (bits 11-12: 0).
  // Colour endpoint mode at bits 13-16: 8 (RGB direct) or 12 (RGBA direct). Then the ends, 8 bits each: r0 r1 g0 g1 b0 b1
  // (a0 a1).
  let bits = select(${L3.weightBits}u, ${L2.weightBits}u, rgba);
  put(&blk, 0u, 11u, select(${L3.mode}u, ${L2.mode}u, rgba));
  put(&blk, 13u, 4u, select(${L3.cem}u, ${L2.cem}u, rgba));
  var v = array<u32, 8>(u32(e0.r), u32(e1.r), u32(e0.g), u32(e1.g), u32(e0.b), u32(e1.b), u32(e0.a), u32(e1.a));
  let nv = select(${L3.values}u, ${L2.values}u, rgba);
  for (var j = 0u; j < nv; j++) { put(&blk, 17u + 8u * j, 8u, v[j]); }
  // The weights, texel by texel in rows, from the block's top bit down: written forward, then the whole run reversed.
  var fw = array<u32, 4>(0u, 0u, 0u, 0u);
  for (var i = 0u; i < 16u; i++) { put(&fw, bits * i, bits, wq[i]); }
  blk[3] = blk[3] | reverseBits(fw[0]);
  blk[2] = blk[2] | reverseBits(fw[1]);

  let o = p.base + id.y * p.stride + id.x * 4u;
  outBlocks[o] = blk[0]; outBlocks[o + 1u] = blk[1]; outBlocks[o + 2u] = blk[2]; outBlocks[o + 3u] = blk[3];
}
`;

// A level of a texture read back as the game reads its pictures, in a draw (check). (Not a compute pass: Chrome's software
// GPU reads a packed texture there as all zeros, though it draws it right, and the game only ever draws them.)
const READ = /* wgsl */`
@group(0) @binding(0) var t: texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}
@fragment fn fs(@builtin(position) p: vec4f) -> @location(0) vec4f { return textureLoad(t, vec2u(p.xy), 0); }
`;

const PLAIN = { 'rgba8unorm': 'astc-4x4-unorm', 'rgba8unorm-srgb': 'astc-4x4-unorm-srgb' };
const align = (n, a) => Math.ceil(n / a) * a;
const CHECK_MS = 8000;
const SCOPES = ['validation', 'internal', 'out-of-memory'];

export class AstcPacker {
  // on: whether to pack (a phone's tier); the device must have 'texture-compression-astc' as well, and pass the check.
  // ready: settled once the check is done (on may have turned false); nothing is packed before.
  constructor(device, on) {
    this.device = device;
    this.on = !!on && device.features.has('texture-compression-astc');
    this.why = '';   // (why it turned itself off, if it did)
    this.stats = { packed: 0, plainMB: 0, packedMB: 0, kept: 0, masks: 0 };
    this.ready = this.on ? Promise.race([this.check(), this.watchdog()]) : Promise.resolve();
  }

  off(why) { if (this.on) { this.on = false; this.why = why; } }

  // Gives up on the check after CHECK_MS of the page being seen: an app put away mid-boot has its timers and its GPU stopped
  // alike, and a timer that counted the time away would turn the packing off on its return. (A gap between ticks counts
  // half a second at most, for a page frozen without saying it's hidden.)
  watchdog() {
    let left = CHECK_MS, last = performance.now();
    return new Promise((done) => {
      const tick = setInterval(() => {
        const now = performance.now(), dt = Math.min(now - last, 500);
        last = now;
        if (globalThis.document?.visibilityState !== 'hidden') left -= dt;
        if (!this.checking) { clearInterval(tick); done(); } else if (left <= 0) {
          clearInterval(tick); this.off(`its check took over ${CHECK_MS / 1000} s`); done();
        }
      }, 250);
    });
  }

  // The packer built, then a little picture of each kind packed and read back through this GPU; any fault, it's off.
  async check() {
    const { device } = this;
    this.checking = true;
    let fault = '';
    // The GPU's own objections, caught only round the calls the check makes in one go: each run of them is pushed into
    // error scopes and popped straight after, the answers awaited at the end. (Scopes held open across an await would catch
    // the game's own errors made meanwhile, blaming the packing and hiding them from the game's handler.)
    const answers = [];
    const scoped = (make) => {
      for (const s of SCOPES) device.pushErrorScope(s);
      try { return make(); } finally { for (const _ of SCOPES) answers.push(device.popErrorScope().catch(() => null)); }
    };
    try {
      const [pack, read] = scoped(() => [device.createShaderModule({ code: WGSL }), device.createShaderModule({ code: READ })]);
      for (const [module, what] of [[pack, 'the packing'], [read, 'the reading']]) {
        const info = module.getCompilationInfo ? await module.getCompilationInfo() : { messages: [] };
        const bad = info.messages.find((m) => m.type === 'error');
        if (bad) throw new Error(`${what} shader: ${bad.message}`);
      }
      // (These say what's wrong by failing; no scope needed.)
      [this.pipe, this.readPipe] = await Promise.all([
        device.createComputePipelineAsync({ layout: 'auto', compute: { module: pack, entryPoint: 'main' } }),
        device.createRenderPipelineAsync({ layout: 'auto', vertex: { module: read, entryPoint: 'vs' },
          fragment: { module: read, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] }, primitive: { topology: 'triangle-list' } }),
      ]);
      for (const format of Object.keys(PLAIN)) await this.trial(format, scoped);
    } catch (e) { fault = e?.message || String(e); }
    // (What the GPU itself objected to comes first: it's the cause of whatever then read back wrong.)
    const said = (await Promise.all(answers)).filter(Boolean).map((e) => e.message);
    if (said.length) fault = `the GPU said: ${said.join('; ').slice(0, 300)}${fault ? `; then ${fault}` : ''}`;
    this.checking = false;
    this.stats = { packed: 0, plainMB: 0, packedMB: 0, kept: 0, masks: 0 };
    if (fault) this.off(fault);
  }

  // A 12x8 picture of six blocks, each one the packing should give back near exactly: a line of colours on 3-bit steps; a
  // line where one channel rises as another falls; colours and alpha on 2-bit steps; one flat colour; the first two again.
  // Its mips, 6x4, 3x2 and 1x1, are packed as well, as a picture's small ends are (the last two smaller than a block, so
  // copied as whole blocks rounded up), and it all goes into the second layer of a two-layer array, as the land's do.
  // Packed, then the plain and the packed read back alike, through a draw.
  async trial(format, scoped) {
    const { device } = this, W = 12, H = 8, mips = 4, LAYER = 1;
    const T3 = [0, 9, 18, 27, 37, 46, 55, 64], T2 = [0, 21, 43, 64];
    const lerp = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
    const top = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y & 3) * 4 + (x & 3), kind = ((y >> 2) * 3 + (x >> 2)) % 4;
      top.set(kind === 0 ? lerp([40, 20, 10, 255], [220, 180, 90, 255], T3[i % 8] / 64)
        : kind === 1 ? lerp([200, 50, 128, 255], [50, 200, 128, 255], T3[(i * 3) % 8] / 64)
          : kind === 2 ? lerp([30, 60, 200, 64], [230, 200, 40, 255], T2[i % 4] / 64)
            : [100, 150, 200, 255], (y * W + x) * 4);
    }
    // (Each mip the mean of up to four texels of the one above; whatever it holds, the plain picture is the measure.)
    const sizes = [[W, H]], levels = [top];
    while (levels.length < mips) {
      const [w, h] = sizes[sizes.length - 1], s = levels[levels.length - 1], nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1);
      const d = new Uint8Array(nw * nh * 4);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let c = 0; c < 4; c++) {
        let sum = 0, n = 0;
        for (const [yy, xx] of [[2 * y, 2 * x], [2 * y, 2 * x + 1], [2 * y + 1, 2 * x], [2 * y + 1, 2 * x + 1]]) if (yy < h && xx < w) { sum += s[(yy * w + xx) * 4 + c]; n++; }
        d[(y * nw + x) * 4 + c] = Math.round(sum / n);
      }
      sizes.push([nw, nh]); levels.push(d);
    }
    const ROW = 256, SLOT = ROW * H;
    let plain, packed, read, spent = [];
    const targets = [];
    try {
      scoped(() => {
        plain = device.createTexture({ size: [W, H], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        levels.forEach((d, m) => { const [w, h] = sizes[m]; device.queue.writeTexture({ texture: plain, mipLevel: m }, d, { bytesPerRow: w * 4 }, [w, h]); });
        packed = this.target(W, H, 2, mips, format);
        const enc = device.createCommandEncoder();
        const done = this.encode(enc, plain, packed, 0, LAYER, 1);
        spent = done.spent;
        // Each level of each drawn into a target of its size and copied into its own slot of one buffer to map, a row to
        // 256 bytes; the 'seen' flag after them.
        read = device.createBuffer({ size: SLOT * mips * 2 + 256, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        for (let m = 0; m < mips; m++) {
          const [w, h] = sizes[m];
          for (const [tex, layer] of [[plain, 0], [packed, LAYER]]) {
            const target = device.createTexture({ size: [w, h], format: 'rgba8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
            const pass = enc.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
            pass.setPipeline(this.readPipe);
            pass.setBindGroup(0, device.createBindGroup({ layout: this.readPipe.getBindGroupLayout(0), entries: [
              { binding: 0, resource: tex.createView({ dimension: '2d', baseMipLevel: m, mipLevelCount: 1, baseArrayLayer: layer, arrayLayerCount: 1 }) },
            ] }));
            pass.draw(3);
            pass.end();
            enc.copyTextureToBuffer({ texture: target }, { buffer: read, offset: targets.length * SLOT, bytesPerRow: ROW, rowsPerImage: h }, [w, h]);
            targets.push(target);
          }
        }
        enc.copyBufferToBuffer(done.seen, 0, read, targets.length * SLOT, 4);
        device.queue.submit([enc.finish()]);
      });
      await read.mapAsync(GPUMapMode.READ);
      const all = new Uint8Array(read.getMappedRange());
      // (Level m's texel x, y, channel c of the plain (k 0) or the packed (k 1).)
      const at = (m, k, x, y, c) => all[(m * 2 + k) * SLOT + y * ROW + x * 4 + c];
      for (let m = 0; m < mips; m++) {
        const [w, h] = sizes[m];
        let worst = 0, sum = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
          const d = Math.abs(at(m, 0, x, y, c) - at(m, 1, x, y, c)); worst = Math.max(worst, d); sum += d;
        }
        const mean = sum / (w * h * 4);
        // (The top level near exact; the small ones, averages of four kinds, only near: a misread is off by far more.)
        if (m === 0 ? worst > 8 : mean > 24) throw new Error(`${format} level ${m} read back off by up to ${worst} (mean ${mean.toFixed(1)})`);
      }
      // (And the reading itself works: the plain picture's top level as it was written, or for sRGB at least not black.)
      let plainOk = true, lit = false;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 4; c++) {
        const v = at(0, 0, x, y, c);
        if (v > 0) lit = true;
        if (format === 'rgba8unorm' && Math.abs(v - top[(y * W + x) * 4 + c]) > 1) plainOk = false;
      }
      if (!plainOk || !lit) throw new Error(`${format}: the plain picture didn't read back`);
      if (!new Uint32Array(all.buffer, targets.length * SLOT, 1)[0]) throw new Error('a block with alpha went unseen');
    } finally {
      read?.destroy(); targets.forEach((t) => t.destroy()); spent.forEach((b) => b.destroy()); plain?.destroy(); packed?.destroy();
    }
  }

  // Whether a picture of this format and size can be packed: plain 8-bit colour, each side a whole number of blocks.
  fits(format, w, h) { return this.on && !!PLAIN[format] && w % 4 === 0 && h % 4 === 0; }
  can(tex) { return tex.dimension === '2d' && this.fits(tex.format, tex.width, tex.height); }

  // The packed texture for a picture of this size and format (all its layers and mips), to fill with encode.
  target(w, h, layers, mips, format) {
    return this.device.createTexture({ size: [w, h, layers], format: PLAIN[format], mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
  }

  // What n layers of tex came to, plain and packed (the log at the end of the load).
  count(tex, n) {
    const plain = tex.width * tex.height * n * 4 * (tex.mipLevelCount > 1 ? 4 / 3 : 1) / 1048576;
    this.stats.packed += n; this.stats.plainMB += plain; this.stats.packedMB += plain / 4;
  }

  // Layers from..from+n of src, every mip, packed into dst's layers to..to+n, on enc. Gives back spent, the buffers to let
  // go once enc's work is done, and seen, a 4-byte buffer that's non-zero if any block had alpha under 255.
  encode(enc, src, dst, from = 0, to = 0, n = src.depthOrArrayLayers) {
    const { device } = this, mips = src.mipLevelCount, srgb = src.format.endsWith('srgb') ? 1 : 0;
    const jobs = [];
    let words = 0;
    for (let m = 0; m < mips; m++) {
      const w = Math.max(1, src.width >> m), h = Math.max(1, src.height >> m);
      const bw = Math.ceil(w / 4), bh = Math.ceil(h / 4), stride = align(bw * ASTC_BLOCK, 256);
      for (let l = 0; l < n; l++) { jobs.push({ m, l, w, h, bw, bh, stride, base: words }); words += (stride / 4) * bh; }
    }
    const out = device.createBuffer({ size: words * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const ubo = device.createBuffer({ size: jobs.length * 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const seen = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const params = new Uint32Array(jobs.length * 64);
    jobs.forEach((j, i) => params.set([j.bw, j.bh, j.w, j.h, j.stride / 4, j.base, srgb, 0], i * 64));
    device.queue.writeBuffer(ubo, 0, params);
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipe);
    jobs.forEach((j, i) => {
      const view = src.createView({ dimension: '2d', baseMipLevel: j.m, mipLevelCount: 1, baseArrayLayer: from + j.l, arrayLayerCount: 1 });
      pass.setBindGroup(0, device.createBindGroup({ layout: this.pipe.getBindGroupLayout(0), entries: [
        { binding: 0, resource: view }, { binding: 1, resource: { buffer: out } }, { binding: 2, resource: { buffer: ubo, offset: i * 256, size: 32 } },
        { binding: 3, resource: { buffer: seen } },
      ] }));
      pass.dispatchWorkgroups(Math.ceil(j.bw / 8), Math.ceil(j.bh / 8));
    });
    pass.end();
    for (const j of jobs) {
      enc.copyBufferToTexture({ buffer: out, offset: j.base * 4, bytesPerRow: j.stride, rowsPerImage: j.bh },
        { texture: dst, mipLevel: j.m, origin: [0, 0, to + j.l] }, [j.bw * 4, j.bh * 4, 1]);
    }
    return { spent: [out, ubo, seen], seen };
  }

  // A whole texture packed: the packed one back, the plain one let go once the GPU's done with it. One that can't be is
  // given back as it was; so is a map whose numbers aren't colours (a normal, a metal-roughness: not sRGB) with any alpha
  // under 255, as a shader may read its alpha as a mask (the possessed knights' eyes, materials.js ARMOR) and the packing
  // would share its few steps with the other three.
  // On a phone it waits for the GPU either way, packed or not, as the load's pictures always did (that wait paces how much
  // is in hand at once); off, it gives the picture straight back.
  async pack(src) {
    await this.ready;
    const { device } = this;
    if (!this.can(src)) {
      if (this.on) { this.stats.kept++; await device.queue.onSubmittedWorkDone(); }
      return src;
    }
    const dst = this.target(src.width, src.height, src.depthOrArrayLayers, src.mipLevelCount, src.format);
    const enc = device.createCommandEncoder();
    const { spent, seen } = this.encode(enc, src, dst);
    const read = src.format.endsWith('srgb') ? null : device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    if (read) enc.copyBufferToBuffer(seen, 0, read, 0, 4);
    device.queue.submit([enc.finish()]);
    // (A map that isn't a colour waits for its flag, which comes once the GPU's done; a colour for the GPU itself.)
    let keep = false;
    if (read) {
      try { await read.mapAsync(GPUMapMode.READ); keep = new Uint32Array(read.getMappedRange())[0] !== 0; } catch { keep = true; }
      read.destroy();
    } else await device.queue.onSubmittedWorkDone();
    for (const b of spent) b.destroy();
    if (keep) { dst.destroy(); this.stats.kept++; this.stats.masks++; return src; }
    this.count(src, src.depthOrArrayLayers);
    src.destroy();
    return dst;
  }
}
