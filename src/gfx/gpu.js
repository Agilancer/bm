// Getting the most out of whatever GPU is there: the high-performance adapter, every limit and useful
// feature it offers, and a quality tier picked from what it is.
import { lanes } from '../core/files.js';

const WANTED_FEATURES = [
  'rg11b10ufloat-renderable', 'float32-filterable', 'timestamp-query', 'indirect-first-instance',
  'texture-compression-bc', 'texture-compression-astc', 'texture-compression-etc2', 'shader-f16',
];

export const TIERS = {
  ultra: { name: 'Ultra', scaleMax: 1.0, shadowSize: 4096, cascades: 3, msaa: 4, grassSpacing: 0.062, grassRadius: 58, grassCap: 1400000, particles: 400000, ao: true, shafts: true, pom: 1, texScale: 1, terrainN: 512, bloom: 6, sim: 120, aniso: 8, lights: 12, bloodSize: 1536, emit: 1 },
  high: { name: 'High', scaleMax: 1.0, shadowSize: 2048, cascades: 3, msaa: 4, grassSpacing: 0.1, grassRadius: 42, grassCap: 400000, particles: 150000, ao: true, shafts: true, pom: 0.5, texScale: 1, terrainN: 384, bloom: 5, sim: 120, aniso: 8, lights: 12, bloodSize: 1536, emit: 1 },
  // A PC whose GPU is on the processor (most laptops, as the browser uses them) has no memory of its own: every picture the
  // game puts on it comes out of the computer's RAM. At Ultra and High that was some 6 GB on top of the page's 2 (an AMD
  // processor's GPU, November 2026), and a laptop's browser closed the game as it came in. So: High, with every picture half
  // a side, a quarter of the memory, and a little less grass. Also the Medium setting.
  medium: { name: 'Medium', scaleMax: 1.0, shadowSize: 2048, cascades: 3, msaa: 4, grassSpacing: 0.12, grassRadius: 38, grassCap: 260000, particles: 100000, ao: true, shafts: true, pom: 0.5, texScale: 0.5, terrainN: 384, bloom: 5, sim: 120, aniso: 8, lights: 12, bloodSize: 1536, emit: 1 },
  // A phone has a fraction of a PC's GPU, and loses more of it to heat within minutes. So: a set number of pixels whatever
  // the screen (the browser stretches them, which costs nothing), the shaders' LEAN paths, and few passes, which a tiled
  // GPU pays dearly for. Also the Low setting on a PC.
  // Start without MSAA: dropping it after warmup rebuilds pipelines, shadows,
  // particles and grass while the original GPU resources are still resident.
  mobile: { name: 'Mobile', lean: true, scaleMax: 1.0, maxPixels: 750000, shadowSize: 1024, cascades: 2, splits: [20, 80, 80], msaa: 1, grassSpacing: 0.2, grassRadius: 20, grassCap: 16000, particles: 18000, ao: false, shafts: false, pom: 0, texScale: 0.25, mapScale: 0.5, texCap: 256, texCapNear: 512, terrainN: 128, bloom: 3, sim: 90, aniso: 2, lights: 2, bloodSize: 1024, emit: 0.4 },
};

// (On a phone, a model's picture is at most texCap a side, 256: the crowds, the beasts, the townsfolk, the heroes. Those seen
// close, Lisandra and your own body, texCapNear: 512. At 512 the lot was 120 MB of an iPhone's memory, which counts the GPU's.)
// A phone's tier made lighter still, for one whose browser has closed the game for want of memory (src/core/lastrun.js):
// level 1 and up, no model's picture over 192 a side (256 close; their normals half that); level 2, 160 (192 close). (Never
// sharper close than the level before this pass had them all: 256, then 192.)
// Level 2, for one closed again after that: smaller still, and less of everything the GPU holds or draws that isn't the
// game itself: a quarter fewer pixels, shadows a quarter the size, half the grass and the sparks.
export function lighten(tier, level) {
  if (level <= 0) return tier;
  const near = (n) => Math.min(tier.texCapNear || tier.texCap || n, n);
  if (level === 1) return { ...tier, texCap: Math.min(tier.texCap || 192, 192), texCapNear: near(256) };
  return { ...tier, texCap: Math.min(tier.texCap || 160, 160), texCapNear: near(192), shadowSize: Math.min(tier.shadowSize, 512), maxPixels: Math.round((tier.maxPixels || 750000) * 0.75),
    grassCap: Math.round(tier.grassCap / 2), particles: Math.round(tier.particles / 2), bloodSize: Math.min(tier.bloodSize, 512) };
}

// The PC tiers by what they ask of memory: Ultra and High the same pictures, Medium a quarter of them, Low less again.
const BY_MEMORY = { ultra: 0, high: 0, medium: 1, mobile: 2 };

// A PC's tier made lighter for one whose browser closed the game, or lost its GPU, soon after it loaded
// (src/core/lastrun.js): a step a level, Ultra or High to Medium, Medium to Low.
export function lighterPC(name, level) {
  const was = BY_MEMORY[name] ?? 0, r = Math.min(2, was + Math.max(0, level || 0));
  return r === was ? name : r >= 2 ? 'mobile' : 'medium';
}

// The GPU's name, which WebGPU won't give but WebGL will: "ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 ...)".
// (On Windows the browser draws both with the same GPU.) '' if it can't be had.
export function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch { return ''; }
}

// Whether the GPU is on the processor and shares the computer's memory: Intel's (but its Arc cards, A770, B580), AMD's that
// aren't a Radeon RX or Pro card ("Radeon(TM) Graphics", "Radeon 780M", "Vega 8"), Apple's, a phone maker's, and the
// software ones. Without a name, by the vendor and architecture WebGPU gives, which can't tell AMD's apart: a card, then.
export function sharesMemory(name = '', info = {}) {
  const n = name.toLowerCase();
  if (n) {
    if (/nvidia|geforce|quadro|tesla/.test(n)) return false;
    if (/radeon.*\b(rx|pro|vii|r9|r7)\b|firepro/.test(n)) return false;
    if (/\barc\b.*\b[ab]\d{3}\b/.test(n)) return false;
    return /intel|radeon|vega|apple|adreno|qualcomm|mali|powervr|microsoft basic|swiftshader|llvmpipe/.test(n);
  }
  const v = (info.vendor || '').toLowerCase(), a = (info.architecture || '').toLowerCase();
  if (v.includes('intel')) return !a.includes('hpg');
  return /apple|qualcomm|arm|imagination|microsoft|google/.test(v);
}

// A laptop's own graphics card: "NVIDIA GeForce RTX 4060 Laptop GPU", a Max-Q, AMD's "Radeon RX 6800M". Most have 4 to 8 GB,
// and the game at Ultra filled 6 GB of a desktop card's.
export const laptopCard = (name = '') => /laptop gpu|max-q|\brx\s*\d{4}m\b/i.test(name);

// The tier Auto picks: Ultra on a card of NVIDIA's or AMD's, High on any other GPU with memory of its own; Medium on a
// laptop's card, on a computer with 8 GB of RAM or less, and on a GPU that shares the computer's memory, where 8 GB or less
// is Low. Low on any PC with 4 GB or less. mem: GB of RAM, as navigator.deviceMemory has it (0 when the browser won't say).
// light: how many steps lighter (lighterPC).
export function autoTier({ mobile = false, shared = false, discrete = false, laptop = false, mem = 0, light = 0 } = {}) {
  if (mobile) return 'mobile';
  if (mem && mem <= 4) return 'mobile';
  const small = mem && mem <= 8;
  return lighterPC(shared ? (small ? 'mobile' : 'medium') : laptop || small ? 'medium' : discrete ? 'ultra' : 'high', light);
}

export function isMobileDevice() {
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') return navigator.userAgentData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

// light: on a PC, how many steps lighter Auto loads, after the browser closed the game or lost its GPU just after it loaded
// (src/core/lastrun.js). A tier the Graphics setting names is kept as it is.
export async function initGPU(tierOverride = 'auto', { light = 0 } = {}) {
  if (!navigator.gpu) throw new Error('This browser has no WebGPU.');
  let adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter is available.');
  const requiredFeatures = WANTED_FEATURES.filter((f) => adapter.features.has(f));
  const requiredLimits = {};
  for (const key in adapter.limits) {
    const v = adapter.limits[key];
    if (typeof v === 'number') requiredLimits[key] = v;
  }
  let device;
  try {
    device = await adapter.requestDevice({ requiredFeatures, requiredLimits });
  } catch (e) {
    device = await adapter.requestDevice({ requiredFeatures });
  }
  const info = adapter.info || {};
  const vendor = (info.vendor || '').toLowerCase();
  const mobile = isMobileDevice();
  // WebGPU won't say whether a GPU is integrated, but its name does (gpuName). Start high on a card, and let the renderer
  // step down at runtime when the timings say so (Renderer.demote); on a GPU that shares the computer's memory, start where
  // its pictures fit in that memory (autoTier).
  const name = mobile ? '' : gpuName();
  const shared = !mobile && sharesMemory(name, info);
  const discrete = !shared && /nvidia|amd|ati/.test(vendor);
  const laptop = !shared && laptopCard(name);
  const mem = Number(navigator.deviceMemory) || 0;
  // The Graphics setting can name a tier outright.
  const picked = autoTier({ mobile, shared, discrete, laptop, mem });
  const tierName = TIERS[tierOverride] ? tierOverride : autoTier({ mobile, shared, discrete, laptop, mem, light: mobile ? 0 : light });
  return {
    adapter, device, info, mobile, tierName, name, shared, laptop, mem,
    // (Lighter than Auto would have picked, for the browser's closing the game last time: said on the title, src/main.js.)
    lightened: tierName !== picked && !TIERS[tierOverride],
    tier: { ...TIERS[tierName] },
    format: navigator.gpu.getPreferredCanvasFormat(),
    hdrFormat: device.features.has('rg11b10ufloat-renderable') ? 'rg11b10ufloat' : 'rgba16float',
    timestamps: device.features.has('timestamp-query'),
  };
}

// A compute pipeline that writes mips for a 2D array texture, one layer at a time, as render passes so it
// works for every 8-bit format including sRGB.
export class MipGen {
  constructor(device) {
    this.device = device;
    this.module = device.createShaderModule({ code: `
      @group(0) @binding(0) var src: texture_2d<f32>;
      @group(0) @binding(1) var smp: sampler;
      struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
      @vertex fn vs(@builtin(vertex_index) i: u32) -> V {
        var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
        var o: V; o.pos = vec4f(p[i], 0, 1); o.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5); return o;
      }
      @fragment fn fs(v: V) -> @location(0) vec4f { return textureSampleLevel(src, smp, v.uv, 0); }
    ` });
    this.sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear' });
    this.pipelines = new Map();
  }

  pipeline(format) {
    if (!this.pipelines.has(format)) {
      this.pipelines.set(format, this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: this.module, entryPoint: 'vs' },
        fragment: { module: this.module, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      }));
    }
    return this.pipelines.get(format);
  }

  generate(texture, format, layers, mipCount, encoder, firstLayer = 0) {
    const pipe = this.pipeline(format);
    for (let layer = firstLayer; layer < firstLayer + layers; layer++) {
      for (let mip = 1; mip < mipCount; mip++) {
        const src = texture.createView({ dimension: '2d', baseMipLevel: mip - 1, mipLevelCount: 1, baseArrayLayer: layer, arrayLayerCount: 1 });
        const dst = texture.createView({ dimension: '2d', baseMipLevel: mip, mipLevelCount: 1, baseArrayLayer: layer, arrayLayerCount: 1 });
        const bg = this.device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: src }, { binding: 1, resource: this.sampler }] });
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: dst, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
        pass.setPipeline(pipe);
        pass.setBindGroup(0, bg);
        pass.draw(3);
        pass.end();
      }
    }
  }
}

export const mipCountFor = (w, h) => Math.floor(Math.log2(Math.max(w, h))) + 1;

// Decode, upload and release each layer before its lane takes the next. Worker count does not bound asynchronous image
// decodes; queuing the whole manifest exhausts iOS memory. So `run` (src/core/files.js lanes) says how many layers are in
// hand at once, across however many arrays share it: one lane, the default, is one layer at a time, in order.
export async function loadTextureArray(device, mipgen, names, decode, format, run = lanes(1)) {
  let tex, w, h, mips, failed = false;
  const layerIn = async (layer) => {
    if (failed) return;
    const bmp = await decode(names[layer]);
    try {
      if (failed) return;   // (another layer failed while this one was decoding)
      if (!tex) {
        w = bmp.width; h = bmp.height; mips = mipCountFor(w, h);
        tex = device.createTexture({ size: [w, h, names.length], format, mipLevelCount: mips,
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      }
      if (bmp.width !== w || bmp.height !== h) throw new Error(`Texture layer size mismatch: ${names[layer]}`);
      device.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex, origin: [0, 0, layer], premultipliedAlpha: false }, [w, h]);
    } finally { bmp.close(); }
    const enc = device.createCommandEncoder();
    mipgen.generate(tex, format, 1, mips, enc, layer);
    device.queue.submit([enc.finish()]);
    // Bound GPU staging memory as well as decoded bitmaps.
    await device.queue.onSubmittedWorkDone();
  };
  // Every layer is seen through, or let go, before a failure is passed on: none is left writing to a texture that's gone.
  const ends = await Promise.allSettled(names.map((_, layer) => run(() => layerIn(layer)).catch((error) => { failed = true; throw error; })));
  const bad = ends.find((e) => e.status === 'rejected');
  if (bad) { tex?.destroy(); throw bad.reason; }
  return tex;
}

// (cap: no side of what comes back is longer than this, whatever scale says. 0: no cap.)
export async function decodeScaledBitmap(blob, scale, cap = 0) {
  const opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
  const bmp = await createImageBitmap(blob, opts);
  if (cap) scale = Math.min(scale, cap / Math.max(bmp.width, bmp.height));
  if (scale >= 1) return bmp;
  try {
    // Resize the decoded pixels instead of decoding the compressed source twice.
    return await createImageBitmap(bmp, { ...opts, resizeWidth: Math.max(1, Math.round(bmp.width * scale)),
      resizeHeight: Math.max(1, Math.round(bmp.height * scale)), resizeQuality: 'high' });
  } finally { bmp.close(); }
}

// Build a texture array from decoded bitmaps.
export function textureArrayFromBitmaps(device, mipgen, bitmaps, format) {
  const w = bitmaps[0].width, h = bitmaps[0].height;
  const mips = mipCountFor(w, h);
  const tex = device.createTexture({
    size: [w, h, bitmaps.length], format, mipLevelCount: mips,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  bitmaps.forEach((bmp, layer) => {
    device.queue.copyExternalImageToTexture({ source: bmp, flipY: false }, { texture: tex, origin: [0, 0, layer], premultipliedAlpha: false }, [w, h]);
    bmp.close();
  });
  const enc = device.createCommandEncoder();
  mipgen.generate(tex, format, bitmaps.length, mips, enc);
  device.queue.submit([enc.finish()]);
  return tex;
}

// A buffer holding `data`. Written with the queue, not mapped as it's made: the browser keeps the memory a mapped buffer was
// filled through for the next one, as big as the biggest ever made (a 64 MB buffer left 68 MB held in both the page and the
// GPU's process for good, measured in Chrome, November 2026; the same bytes through writeBuffer left 8).
const WRITE_AT_MOST = 4 << 20;
export function makeBuffer(device, data, usage) {
  const size = (data.byteLength + 3) & ~3;
  const buf = device.createBuffer({ size, usage: usage | GPUBufferUsage.COPY_DST });
  if (!data.byteLength) return buf;
  // (A few megabytes at a time: what a write is carried over in is kept by the browser too, as big as the biggest write.)
  const whole = data.byteLength === size ? size : size - 4;
  for (let at = 0; at < whole; at += WRITE_AT_MOST) device.queue.writeBuffer(buf, at, data.buffer, data.byteOffset + at, Math.min(WRITE_AT_MOST, whole - at));
  if (whole !== size) {
    // (A length that isn't a multiple of four bytes: its whole words above, then its last few in a word of their own.)
    const tail = new Uint8Array(4);
    tail.set(new Uint8Array(data.buffer, data.byteOffset + whole, data.byteLength - whole));
    device.queue.writeBuffer(buf, whole, tail);
  }
  return buf;
}

