// Getting the most out of whatever GPU is there: the high-performance adapter, every limit and useful
// feature it offers, and a quality tier picked from what it is.

const WANTED_FEATURES = [
  'rg11b10ufloat-renderable', 'float32-filterable', 'timestamp-query', 'indirect-first-instance',
  'texture-compression-bc', 'texture-compression-astc', 'texture-compression-etc2', 'shader-f16',
];

export const TIERS = {
  ultra: { name: 'Ultra', scaleMax: 1.0, shadowSize: 4096, cascades: 3, msaa: 4, grassSpacing: 0.062, grassRadius: 58, grassCap: 1400000, particles: 400000, ao: true, shafts: true, pom: 1, texScale: 1, terrainN: 512, bloom: 6, sim: 120 },
  high: { name: 'High', scaleMax: 1.0, shadowSize: 2048, cascades: 3, msaa: 4, grassSpacing: 0.1, grassRadius: 42, grassCap: 400000, particles: 150000, ao: true, shafts: true, pom: 0.5, texScale: 1, terrainN: 384, bloom: 5, sim: 120 },
  mobile: { name: 'Mobile', scaleMax: 0.8, shadowSize: 2048, cascades: 2, msaa: 4, grassSpacing: 0.16, grassRadius: 26, grassCap: 90000, particles: 40000, ao: false, shafts: false, pom: 0, texScale: 0.5, terrainN: 192, bloom: 4, sim: 90 },
};

export function isMobileDevice() {
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') return navigator.userAgentData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

export async function initGPU(tierOverride = 'auto') {
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
  // Browsers won't say whether a GPU is integrated. Start high on anything that might be a discrete card, and
  // let the renderer step down at runtime when the timings say so (Renderer.demote).
  const discrete = /nvidia|amd|ati/.test(vendor);
  // The Graphics setting can name a tier outright.
  const tierName = TIERS[tierOverride] ? tierOverride : mobile ? 'mobile' : discrete ? 'ultra' : 'high';
  return {
    adapter, device, info, mobile, tierName,
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

  generate(texture, format, layers, mipCount, encoder) {
    const pipe = this.pipeline(format);
    for (let layer = 0; layer < layers; layer++) {
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

export function makeBuffer(device, data, usage) {
  const buf = device.createBuffer({ size: (data.byteLength + 3) & ~3, usage: usage | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
  const Ctor = data.constructor;
  new Ctor(buf.getMappedRange()).set(data);
  buf.unmap();
  return buf;
}
