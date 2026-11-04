// The frame graph: compute (skinning, grass, particles) -> shadows -> forward HDR pass with MSAA ->
// AO, sun shafts, particles at full resolution -> bloom -> composite. WebGPU only, from the start.
import { accessor, imageBytes, parseGLB } from '../core/glb.js';
import { C, C_MASKS, C_GASH, C_PALETTE, C_PROPS, C_SIZE, CHARS_START, H, VM_PALETTE, WEAPONS } from '../core/layout.js';
import { lerp, mat4Invert, mat4LookTo, mat4Mul, mat4Ortho, mat4Perspective } from '../core/math.js';
import { MipGen, makeBuffer, mipCountFor, textureArrayFromBitmaps } from './gpu.js';
import { ARMOR, GRASS, GRASS_CULL, ITEM, PROP, SHADOW, SKY, SKY_BAKE, STATIC, TERRAIN, VIEWMODEL } from './materials.js';
import { AO, BLOOM, COMPOSITE, PARTICLE_DRAW, PARTICLE_SIM, SHAFTS, STAIN, TRAIL } from './post.js';
import { CRAB_SCALE } from '../sim/crab.js';
import { SKIN } from './shaders.js';

const WORLD_FOV = 64 * Math.PI / 180;
const FRAME_FLOATS = 316;
const O = { VP: 0, VIEW: 16, PROJ: 32, IVP: 48, VMP: 64, VMW: 80, CASC: 96, CAM: 144, SUN: 148, SUNC: 152, SKY: 156, GND: 160, FOG: 164, FOGP: 168, SPLIT: 172, SCREEN: 176, WIND: 180, GROUND: 184, BLOOD: 188, CHARS: 192, LIGHTS: 216, COUNTS: 312 };
const GROUND_SIZE = 1024, GROUND_HALF = 128, BLOOD_SIZE = 1536, BLOOD_HALF = 64;
const LINEAR_DEPTH = 'r16float';
const DEPTH = 'depth32float';
const FLAT = { iron: 100, flame: 101, water: 102, fruit: 103, fruit2: 104 };
const MAX_GROUND = 32;

const norm3 = (x, y, z) => { const l = 1 / Math.hypot(x, y, z); return [x * l, y * l, z * l]; };

export class Renderer {
  constructor(gpu, canvas, pool) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.tier = gpu.tier;
    this.canvas = canvas;
    this.pool = pool;
    this.context = canvas.getContext('webgpu');
    this.context.configure({ device: this.device, format: gpu.format, alphaMode: 'opaque' });
    this.frameData = new Float32Array(FRAME_FLOATS);
    this.time = 0;
    this.scale = 1;
    this.mip = new MipGen(this.device);
    this.gashVersions = new Int32Array(8).fill(-1);
    this.tmpV = new Float32Array(16); this.tmpP = new Float32Array(16); this.tmpVP = new Float32Array(16); this.tmpI = new Float32Array(16);
    this.emitted = [];
    this.emitHead = 0;
    this.prevTip = [];
    this.flash = 0;
    // Mid-afternoon going gold, over the shoulder as you come up the road, so plate and faces read.
    this.sunDir = norm3(-0.78, 0.5, 0.38);
    this.splits = [12, 38, 130];
    this.shadowFrame = 0;
    this.stats = { gpuMs: 0, draws: 0 };
  }

  // ---- loading -------------------------------------------------------------------------------------

  async load(base, progress) {
    const { device, tier, pool } = this;
    this.base = base;
    let done = 0, total = 1;
    const tick = () => { done++; progress(done / total); };
    const manifest = await fetch(`${base}assets/game/tex/manifest.json`).then((r) => r.json());
    const village = await fetch(`${base}assets/game/village.json`).then((r) => r.json());
    this.village = village;
    const layerNames = manifest.layers.map((l) => l.name);
    const tw = Math.round(manifest.size[0] * tier.texScale), th = Math.round(manifest.size[1] * tier.texScale);
    const dw = Math.round(manifest.detail[0] * tier.texScale), dh = Math.round(manifest.detail[1] * tier.texScale);
    const gs = Math.round(1024 * tier.texScale), gd = Math.round(512 * tier.texScale);
    total = manifest.layers.length * 2 + manifest.ground.length * 2 + 17;
    const shrink = tier.texScale !== 1;
    const decode = (name, width, height) => pool.run('decode', { url: `${base}assets/game/tex/${name}.webp`, ...(shrink ? { width, height } : {}) }).then((b) => { tick(); return b; });
    const [colorBmps, detailBmps, gColor, gDetail] = await Promise.all([
      Promise.all(manifest.layers.map((l) => decode(`${l.name}_c`, tw, th))),
      Promise.all(manifest.layers.map((l) => decode(`${l.name}_d`, dw, dh))),
      Promise.all(manifest.ground.map((n) => decode(`${n}_c`, gs, gs))),
      Promise.all(manifest.ground.map((n) => decode(`${n}_d`, gd, gd))),
    ]);
    this.colorArr = textureArrayFromBitmaps(device, this.mip, colorBmps, 'rgba8unorm-srgb');
    this.detailArr = textureArrayFromBitmaps(device, this.mip, detailBmps, 'rgba8unorm');
    this.groundColor = textureArrayFromBitmaps(device, this.mip, gColor, 'rgba8unorm-srgb');
    this.groundDetail = textureArrayFromBitmaps(device, this.mip, gDetail, 'rgba8unorm');
    tick();
    // Terrain and the ground map, split across the pool.
    const rowsEach = Math.ceil(GROUND_SIZE / Math.max(1, pool.size));
    const groundJobs = [];
    for (let r = 0; r < GROUND_SIZE; r += rowsEach) {
      groundJobs.push(pool.run('ground', { size: GROUND_SIZE, half: GROUND_HALF, colliders: village.colliders, rowStart: r, rowEnd: Math.min(GROUND_SIZE, r + rowsEach) }));
    }
    const [terrain, ...rows] = await Promise.all([pool.run('terrain', { n: tier.terrainN, extent: 2400 }), ...groundJobs]);
    tick();
    this.groundMap = device.createTexture({ size: [GROUND_SIZE, GROUND_SIZE], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.heightTex = device.createTexture({ size: [GROUND_SIZE, GROUND_SIZE], format: 'r32float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    for (const row of rows) {
      const h = row.data.length / 4 / GROUND_SIZE;
      device.queue.writeTexture({ texture: this.groundMap, origin: [0, row.rowStart] }, row.data, { bytesPerRow: GROUND_SIZE * 4 }, [GROUND_SIZE, h]);
      device.queue.writeTexture({ texture: this.heightTex, origin: [0, row.rowStart] }, row.heights, { bytesPerRow: GROUND_SIZE * 4 }, [GROUND_SIZE, h]);
    }
    this.terrainVB = makeBuffer(device, terrain.verts, GPUBufferUsage.VERTEX);
    this.terrainIB = makeBuffer(device, terrain.idx, GPUBufferUsage.INDEX);
    this.terrainCount = terrain.idx.length;

    // Tiling noise for clouds and macro variation: four channels of smooth noise.
    this.noiseTex = this.makeNoise();

    const buffers = await Promise.all(['assets/game/village.glb', 'assets/game/velscour_knight.glb', 'assets/game/silver_knight.glb', 'assets/fp/arms_2h.glb',
      'assets/game/items/reliquary_blade.glb', 'assets/game/items/thorned_kite.glb', 'assets/game/items/arming_sword.glb', 'assets/game/items/templar_kite.glb',
      'assets/monsters/crab_monster/crab_monster.glb', 'assets/fp/arms_1h.glb']
      .map((p) => fetch(base + p).then((r) => r.arrayBuffer()).then((b) => { tick(); return b; })));
    this.buildSamplers();
    this.buildBaseLayouts();
    this.buildStatics(parseGLB(buffers[0]), layerNames, manifest.layers);
    tick();
    this.chars = [
      await this.buildCharacter(parseGLB(buffers[1])),
      await this.buildCharacter(parseGLB(buffers[2])),
      ...(await this.buildCrabs(parseGLB(buffers[8]), 3, CRAB_SCALE)),
    ];
    tick();
    // The arms by how many hands they have on the sword. Which is on screen comes with each snapshot, along with its pose.
    this.vms = { 1: await this.buildViewModel(parseGLB(buffers[9])), 2: await this.buildViewModel(parseGLB(buffers[3])) };
    this.vm = this.vms[1];
    // Swords are fetched the first time one is wanted, in the hand or on the ground, and kept: there are too many maps to load them all up front.
    this.swords = new Map();
    this.gems = new Map();
    this.ground = [];
    this.itemInstances = device.createBuffer({ size: 64 * MAX_GROUND, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.itemData = new Float32Array(16 * MAX_GROUND);
    tick();
    this.props = await Promise.all([4, 5, 6, 7].map((i) => this.buildProp(parseGLB(buffers[i]))));
    this.propInstances = device.createBuffer({ size: 64 * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.propData = new Float32Array(64);
    tick();
    this.buildEnv();
    this.buildPipelines();
    this.buildParticles();
    this.buildGrass();
    this.lights = village.lights;
    this.smokeT = 0;
    this.moteT = 0;
    this.resize();
    tick();
  }

  makeNoise() {
    const S = 256;
    const data = new Uint8Array(S * S * 4);
    const rnd = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
    for (let ch = 0; ch < 4; ch++) {
      const r = rnd(ch * 977 + 13);
      const grids = [4, 8, 16, 32, 64].map((g) => { const a = new Float32Array(g * g); for (let i = 0; i < a.length; i++) a[i] = r(); return { g, a }; });
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          let v = 0, amp = 0.5, sum = 0;
          for (const { g, a } of grids) {
            const fx = x / S * g, fy = y / S * g;
            const ix = fx | 0, iy = fy | 0, u = fx - ix, w = fy - iy;
            const su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
            const at = (i, j) => a[((j + g) % g) * g + ((i + g) % g)];
            v += amp * (at(ix, iy) * (1 - su) * (1 - sw) + at(ix + 1, iy) * su * (1 - sw) + at(ix, iy + 1) * (1 - su) * sw + at(ix + 1, iy + 1) * su * sw);
            sum += amp; amp *= 0.5;
          }
          data[(y * S + x) * 4 + ch] = Math.max(0, Math.min(255, ((v / sum - 0.5) * 1.9 + 0.5) * 255));
        }
      }
    }
    const tex = this.device.createTexture({ size: [S, S], format: 'rgba8unorm', mipLevelCount: mipCountFor(S, S), usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    this.device.queue.writeTexture({ texture: tex }, data, { bytesPerRow: S * 4 }, [S, S]);
    const enc = this.device.createCommandEncoder();
    this.mip.generate(tex, 'rgba8unorm', 1, mipCountFor(S, S), enc);
    this.device.queue.submit([enc.finish()]);
    return tex;
  }

  buildSamplers() {
    const { device } = this;
    this.repeatSmp = device.createSampler({ addressModeU: 'repeat', addressModeV: 'repeat', minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 8 });
    this.clampSmp = device.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear' });
    this.shadowSmp = device.createSampler({ compare: 'less', minFilter: 'linear', magFilter: 'linear' });
    this.frameUBO = device.createBuffer({ size: FRAME_FLOATS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  }

  buildBaseLayouts() {
    const { device } = this;
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    this.bgl0 = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
      { binding: 1, visibility: VF, sampler: { type: 'filtering' } },
      { binding: 2, visibility: VF, sampler: { type: 'filtering' } },
      { binding: 3, visibility: VF, sampler: { type: 'comparison' } },
      { binding: 4, visibility: VF, texture: { sampleType: 'depth', viewDimension: '2d-array' } },
      { binding: 5, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 6, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 7, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 8, visibility: VF, texture: { sampleType: 'float' } },
    ] });
    this.bglArr2 = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 1, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
    ] });
    this.bglStatic = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 1, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 2, visibility: VF, buffer: { type: 'uniform' } },
    ] });
    this.bglArmor = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
      { binding: 1, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 2, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 3, visibility: VF, texture: { sampleType: 'float' } },
    ] });
    this.bglProp = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 1, visibility: VF, buffer: { type: 'uniform' } },
    ] });
    this.bglSkin = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ] });
    // Land textures, whose bind group is shared by terrain and grass.
    this.terrainBG = device.createBindGroup({ layout: this.bglArr2, entries: [
      { binding: 0, resource: this.groundColor.createView({ dimension: '2d-array' }) },
      { binding: 1, resource: this.groundDetail.createView({ dimension: '2d-array' }) },
    ] });
    this.skinModule = device.createShaderModule({ code: SKIN });
    this.skinPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [this.bglSkin] }), compute: { module: this.skinModule, entryPoint: 'main' } });
  }

  buildStatics(glb, layerNames, layers) {
    const { device } = this;
    // Merge every primitive into one buffer, opaque first so the cutouts are one range at the end.
    const prims = [];
    const nodes = glb.json.nodes.filter((n) => n.mesh !== undefined);
    for (const n of nodes) {
      for (const pr of glb.json.meshes[n.mesh].primitives) {
        const name = glb.json.materials[pr.material].name;
        let layer = layerNames.indexOf(name);
        if (layer < 0) layer = FLAT[name] ?? 100;
        const cutout = layer < 100 && layers[layer].cutout;
        prims.push({ layer, cutout, pos: accessor(glb, pr.attributes.POSITION), nrm: accessor(glb, pr.attributes.NORMAL), uv: accessor(glb, pr.attributes.TEXCOORD_0), idx: accessor(glb, pr.indices) });
      }
    }
    prims.sort((a, b) => a.cutout - b.cutout);
    let nv = 0, ni = 0;
    for (const p of prims) { nv += p.pos.length / 3; ni += p.idx.length; }
    const verts = new ArrayBuffer(nv * 36);
    const f = new Float32Array(verts), u = new Uint32Array(verts);
    const indices = new Uint32Array(ni);
    let vo = 0, io = 0, cutStart = -1;
    for (const p of prims) {
      if (p.cutout && cutStart < 0) cutStart = io;
      const base = vo;
      const n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const o = vo * 9;
        f[o] = p.pos[i * 3]; f[o + 1] = p.pos[i * 3 + 1]; f[o + 2] = p.pos[i * 3 + 2];
        f[o + 3] = p.nrm[i * 3]; f[o + 4] = p.nrm[i * 3 + 1]; f[o + 5] = p.nrm[i * 3 + 2];
        f[o + 6] = p.uv[i * 2]; f[o + 7] = p.uv[i * 2 + 1];
        u[o + 8] = p.layer;
        vo++;
      }
      for (let i = 0; i < p.idx.length; i++) indices[io++] = p.idx[i] + base;
    }
    this.staticVB = makeBuffer(device, new Float32Array(verts), GPUBufferUsage.VERTEX);
    this.staticIB = makeBuffer(device, indices, GPUBufferUsage.INDEX);
    this.staticOpaque = cutStart < 0 ? ni : cutStart;
    this.staticTotal = ni;
    // Per-layer parameters: cutout, parallax depth in uv, has windows, foliage.
    const params = new Float32Array(48 * 4);
    const pomDepth = this.tier.pom > 0 ? 1 : 0;
    layers.forEach((l, i) => {
      params[i * 4] = l.cutout ? 1 : 0;
      params[i * 4 + 1] = pomDepth * ({ wall: 0.011, roof: 0.022, stone: 0.02, door: 0.012 }[l.kind] || 0);
      params[i * 4 + 2] = l.kind === 'wall' ? 1 : 0;
      params[i * 4 + 3] = l.name === 'leaves' ? 1 : 0;
    });
    const layerUBO = makeBuffer(device, params, GPUBufferUsage.UNIFORM);
    this.staticBG = device.createBindGroup({ layout: this.bglStatic, entries: [
      { binding: 0, resource: this.colorArr.createView({ dimension: '2d-array' }) },
      { binding: 1, resource: this.detailArr.createView({ dimension: '2d-array' }) },
      { binding: 2, resource: { buffer: layerUBO } },
    ] });
    this.stats.staticTris = ni / 3;
  }

  async imageTexture(glb, imageIndex, format, scale = 1) {
    const blob = imageBytes(glb, imageIndex);
    let bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    if (scale !== 1) {
      const small = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', resizeWidth: Math.round(bmp.width * scale), resizeHeight: Math.round(bmp.height * scale), resizeQuality: 'high' });
      bmp.close();
      bmp = small;
    }
    const mips = mipCountFor(bmp.width, bmp.height);
    const tex = this.device.createTexture({ size: [bmp.width, bmp.height], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    this.device.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex, premultipliedAlpha: false }, [bmp.width, bmp.height]);
    bmp.close();
    const enc = this.device.createCommandEncoder();
    this.mip.generate(tex, format, 1, mips, enc);
    this.device.queue.submit([enc.finish()]);
    return tex;
  }

  // Compute-skinned mesh streams shared by the knights and the arms.
  makeSkinned(prims, jointCount) {
    const { device } = this;
    let nv = 0, ni = 0;
    for (const p of prims) { nv += p.pos.length / 3; ni += p.idx.length; }
    const src = new ArrayBuffer(nv * 48);
    const f = new Float32Array(src), u = new Uint32Array(src);
    const side = new ArrayBuffer(nv * 36);
    const sf = new Float32Array(side), su = new Uint32Array(side);
    const indices = new Uint32Array(ni);
    const ranges = [];
    let vo = 0, io = 0;
    for (const p of prims) {
      const base = vo;
      ranges.push({ first: io, count: p.idx.length });
      const n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const o = vo * 12, s = vo * 9;
        f[o] = p.pos[i * 3]; f[o + 1] = p.pos[i * 3 + 1]; f[o + 2] = p.pos[i * 3 + 2]; f[o + 3] = p.flex ? p.flex[i] : 0;
        f[o + 4] = p.nrm[i * 3]; f[o + 5] = p.nrm[i * 3 + 1]; f[o + 6] = p.nrm[i * 3 + 2];
        u[o + 7] = p.piece ? p.piece[i] : 0;
        let j0 = p.fixedJoint ?? 0, j1 = 0, j2 = 0, j3 = 0, w0 = 255, w1 = 0, w2 = 0, w3 = 0;
        if (p.joints) {
          j0 = p.joints[i * 4]; j1 = p.joints[i * 4 + 1]; j2 = p.joints[i * 4 + 2]; j3 = p.joints[i * 4 + 3];
          const W = p.weights, a = W[i * 4], b = W[i * 4 + 1], c = W[i * 4 + 2], d = W[i * 4 + 3];
          const k = 255 / ((a + b + c + d) || 1);
          w0 = Math.round(a * k); w1 = Math.round(b * k); w2 = Math.round(c * k); w3 = 255 - w0 - w1 - w2;
          if (w3 < 0) { w0 += w3; w3 = 0; }
        }
        u[o + 8] = j0 | (j1 << 8) | (j2 << 16) | (j3 << 24);
        u[o + 9] = w0 | (w1 << 8) | (w2 << 16) | (w3 << 24);
        f[o + 10] = p.uv[i * 2]; f[o + 11] = p.uv[i * 2 + 1];
        const sp = p.sidePos || p.pos;
        sf[s] = sp[i * 3]; sf[s + 1] = sp[i * 3 + 1]; sf[s + 2] = sp[i * 3 + 2];
        su[s + 3] = p.piece ? p.piece[i] : 0;
        sf[s + 4] = p.uv[i * 2]; sf[s + 5] = p.uv[i * 2 + 1];
        sf[s + 6] = p.nrm[i * 3]; sf[s + 7] = p.nrm[i * 3 + 1]; sf[s + 8] = p.nrm[i * 3 + 2];
        vo++;
      }
      for (let i = 0; i < p.idx.length; i++) indices[io++] = p.idx[i] + base;
    }
    const srcBuf = makeBuffer(device, new Float32Array(src), GPUBufferUsage.STORAGE);
    const sideVB = makeBuffer(device, new Float32Array(side), GPUBufferUsage.VERTEX);
    const IB = makeBuffer(device, indices, GPUBufferUsage.INDEX);
    const outBuf = device.createBuffer({ size: nv * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    const palette = device.createBuffer({ size: jointCount * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = device.createBindGroup({ layout: this.bglSkin, entries: [
      { binding: 0, resource: { buffer: params } }, { binding: 1, resource: { buffer: palette } },
      { binding: 2, resource: { buffer: srcBuf } }, { binding: 3, resource: { buffer: outBuf } },
    ] });
    return { count: nv, indices: ni, ranges, sideVB, IB, srcBuf, outBuf, palette, params, bg, jointCount };
  }

  // Another body on the same mesh: its own pose buffers, sharing the geometry.
  cloneSkinned(base) {
    const { device } = this;
    const outBuf = device.createBuffer({ size: base.count * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    const palette = device.createBuffer({ size: base.jointCount * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = device.createBindGroup({ layout: this.bglSkin, entries: [
      { binding: 0, resource: { buffer: params } }, { binding: 1, resource: { buffer: palette } },
      { binding: 2, resource: { buffer: base.srcBuf } }, { binding: 3, resource: { buffer: outBuf } },
    ] });
    return { ...base, outBuf, palette, params, bg };
  }

  async buildCrabs(glb, count, scale) {
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const pos = accessor(glb, a.POSITION).slice();
    for (let i = 0; i < pos.length; i++) pos[i] *= scale;
    const prim = { pos, nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices), joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0) };
    const base = this.makeSkinned([prim], glb.json.skins[0].joints.length);
    const mat = glb.json.materials[pr.material];
    const srcOf = (t) => glb.json.textures[t.index].source;
    const texScale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', texScale),
      this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', texScale),
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', texScale),
    ]);
    const out = [];
    for (let i = 0; i < count; i++) {
      const sk = i === 0 ? base : this.cloneSkinned(base);
      const ubo = this.device.createBuffer({ size: 24 * 64 + 256 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bg = this.device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      out.push({ ...sk, ubo, matBG: bg, gashData: new Float32Array((24 * 64 + 256 + 16) / 4) });
    }
    return out;
  }

  async buildCharacter(glb) {
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const prim = {
      pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices),
      joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0), flex: accessor(glb, a._FLEX), piece: accessor(glb, a._PIECE),
    };
    const jc = glb.json.skins[0].joints.length;
    const sk = this.makeSkinned([prim], jc);
    const scale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, 0, 'rgba8unorm-srgb', scale), this.imageTexture(glb, 1, 'rgba8unorm', scale), this.imageTexture(glb, 2, 'rgba8unorm', scale),
    ]);
    const ubo = this.device.createBuffer({ size: 24 * 64 + 256 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = this.device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    return { ...sk, ubo, matBG: bg, gashData: new Float32Array((24 * 64 + 256 + 16) / 4) };
  }

  async buildViewModel(glb) {
    const { device } = this;
    const skin = glb.json.skins[0];
    const weaponJoint = skin.joints.findIndex((j) => glb.json.nodes[j].name === 'weapon');
    const weaponBind = mat4Invert(new Float32Array(16), accessor(glb, skin.inverseBindMatrices).subarray(weaponJoint * 16, weaponJoint * 16 + 16));
    const prims = [];
    const texOf = [];
    for (const node of glb.json.nodes) {
      // (The one-handed rig's own sword and shield were for working out its swings. The swords come from the pack now.)
      if (node.mesh === undefined || node.name === 'arming_sword' || node.name === 'ironbound') continue;
      const pr = glb.json.meshes[node.mesh].primitives[0];
      const a = pr.attributes;
      const p = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
      if (a.JOINTS_0 !== undefined && node.skin !== undefined) { p.joints = accessor(glb, a.JOINTS_0); p.weights = accessor(glb, a.WEIGHTS_0); } else this.onWeaponJoint(p, weaponJoint, weaponBind);
      prims.push(p);
      texOf.push({ mat: glb.json.materials[pr.material], name: node.name });
    }
    const sk = this.makeSkinned(prims, skin.joints.length);
    const flatNormal = this.flatNormal || (this.flatNormal = this.pixel('rgba8unorm', [128, 128, 255, 255]));
    const flatMR = this.pixel('rgba8unorm', [255, 128, 128, 255]);
    const parts = [];
    for (let i = 0; i < prims.length; i++) {
      const { mat, name } = texOf[i];
      const srcOf = (t) => glb.json.textures[t.index].source;
      const alb = await this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb');
      const nrm = mat.normalTexture ? await this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm') : flatNormal;
      const mr = mat.pbrMetallicRoughness.metallicRoughnessTexture ? await this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm') : flatMR;
      const ubo = device.createBuffer({ size: 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bg = device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      parts.push({ range: sk.ranges[i], bg, ubo, isSword: name === 'greatsword' });
    }
    return { ...sk, parts, weaponJoint, weaponBind };
  }

  pixel(format, rgba) {
    const tex = this.device.createTexture({ size: [1, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.device.queue.writeTexture({ texture: tex }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1]);
    return tex;
  }

  // A rigid part modelled in the weapon joint's own frame: carries it to bind space for the skinning palette.
  onWeaponJoint(p, weaponJoint, bind) {
    p.fixedJoint = weaponJoint;
    const pos = new Float32Array(p.pos.length), nrm = new Float32Array(p.nrm.length);
    for (let v = 0; v < p.pos.length; v += 3) {
      const x = p.pos[v], y = p.pos[v + 1], z = p.pos[v + 2];
      pos[v] = bind[0] * x + bind[4] * y + bind[8] * z + bind[12];
      pos[v + 1] = bind[1] * x + bind[5] * y + bind[9] * z + bind[13];
      pos[v + 2] = bind[2] * x + bind[6] * y + bind[10] * z + bind[14];
      const nx = p.nrm[v], ny = p.nrm[v + 1], nz = p.nrm[v + 2];
      nrm[v] = bind[0] * nx + bind[4] * ny + bind[8] * nz;
      nrm[v + 1] = bind[1] * nx + bind[5] * ny + bind[9] * nz;
      nrm[v + 2] = bind[2] * nx + bind[6] * ny + bind[10] * nz;
    }
    p.sidePos = p.pos;
    p.pos = pos; p.nrm = nrm;
  }

  // A sword, by its id: { ready } until its file is in, and then what it takes in the hand and on the ground.
  sword(id) {
    let s = this.swords.get(id);
    if (!s) {
      s = { ready: false };
      this.swords.set(id, s);
      this.buildSword(id, s).catch((e) => console.error(`sword ${id}`, e));
    }
    return s;
  }

  async buildSword(id, s) {
    const { device } = this;
    const w = WEAPONS.find((x) => x && x.id === id);
    const buf = await fetch(`${this.base}assets/game/items/${id}.glb`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
    const glb = parseGLB(buf);
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const mat = glb.json.materials[pr.material];
    const srcOf = (t) => glb.json.textures[t.index].source;
    const scale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', scale),
      this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', scale),
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', scale),
    ]);
    const prim = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
    s.lying = this.lyingModel(prim, alb, nrm, mr, [0, 0, 0, 0]);
    s.tip = prim.pos.reduce((best, v, i) => (i % 3 === 1 ? Math.max(best, v) : best), 0);
    const vm = this.vms[w.hands];
    this.onWeaponJoint(prim, vm.weaponJoint, vm.weaponBind);
    s.hand = this.makeSkinned([prim], vm.jointCount);
    s.ubo = device.createBuffer({ size: 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    s.bg = device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: s.ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    s.ready = true;
  }

  // Something to lay on the ground: positions in the item's own frame, and its maps. glow is added to whatever light it gets.
  lyingModel(prim, alb, nrm, mr, glow) {
    const { device } = this;
    const n = prim.pos.length / 3;
    const v = new Float32Array(n * 8);
    const P = prim.sidePos || prim.pos;
    for (let i = 0; i < n; i++) {
      v.set(P.subarray(i * 3, i * 3 + 3), i * 8); v.set(prim.nrm.subarray(i * 3, i * 3 + 3), i * 8 + 3); v.set(prim.uv.subarray(i * 2, i * 2 + 2), i * 8 + 6);
    }
    const indices = new Uint32Array(prim.idx);
    const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(ubo, 0, new Float32Array(glow));
    const bg = device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    return { VB: makeBuffer(device, v, GPUBufferUsage.VERTEX), IB: makeBuffer(device, indices, GPUBufferUsage.INDEX), count: indices.length, bg };
  }

  // A gem on the ground: a long-pointed eight-sided stone, flat-shaded, in its one colour and giving off a little of it.
  gem(hex) {
    let m = this.gems.get(hex);
    if (m) return m;
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const lin = c.map((x) => (x / 255) ** 2.2);
    const R = 0.05, H_ = 0.075;
    const corners = [[R, 0, 0], [0, 0, R], [-R, 0, 0], [0, 0, -R]];
    const pos = [], nrm = [], uv = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      for (const [apex, flip] of [[[0, H_, 0], false], [[0, -H_, 0], true]]) {
        const t = flip ? [apex, b, a] : [apex, a, b];
        const u = t[1].map((x, k) => x - t[0][k]), v = t[2].map((x, k) => x - t[0][k]);
        const nr = norm3(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
        for (const q of t) { pos.push(...q); nrm.push(...nr); uv.push(0.5, 0.5); }
      }
    }
    const idx = new Uint32Array(pos.length / 3).map((_, i) => i);
    m = this.lyingModel({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx }, this.pixel('rgba8unorm-srgb', [...c, 255]), this.flatNormal, this.pixel('rgba8unorm', [255, 40, 60, 255]),
      [lin[0] * 1.6, lin[1] * 1.6, lin[2] * 1.6, 0]);
    this.gems.set(hex, m);
    return m;
  }

  async buildProp(glb) {
    const { device } = this;
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const pos = accessor(glb, a.POSITION), nrm = accessor(glb, a.NORMAL), uv = accessor(glb, a.TEXCOORD_0), idx = accessor(glb, pr.indices);
    const n = pos.length / 3;
    const v = new Float32Array(n * 8);
    for (let i = 0; i < n; i++) {
      v.set(pos.subarray(i * 3, i * 3 + 3), i * 8); v.set(nrm.subarray(i * 3, i * 3 + 3), i * 8 + 3); v.set(uv.subarray(i * 2, i * 2 + 2), i * 8 + 6);
    }
    const indices = new Uint32Array(idx);
    const mat = glb.json.materials[pr.material];
    const tex = await this.imageTexture(glb, glb.json.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source, 'rgba8unorm-srgb');
    const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = device.createBindGroup({ layout: this.bglProp, entries: [{ binding: 0, resource: tex.createView() }, { binding: 1, resource: { buffer: ubo } }] });
    return { VB: makeBuffer(device, v, GPUBufferUsage.VERTEX), IB: makeBuffer(device, indices, GPUBufferUsage.INDEX), count: indices.length, bg, ubo };
  }

  // Bake the sky panorama: every reflection in the game looks at this picture.
  buildEnv() {
    const { device, tier } = this;
    const W = tier.texScale < 1 ? 512 : 1024, H_ = W / 2;
    const mips = mipCountFor(W, H_);
    this.envTex = device.createTexture({ size: [W, H_], format: 'rgba16float', mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT });
    const mod = device.createShaderModule({ code: SKY_BAKE });
    const pipe = device.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] } });
    const ubo = makeBuffer(device, new Float32Array([...this.sunDir, 0, 0.1, 0.09, 0.06, 0]), GPUBufferUsage.UNIFORM);
    const bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: ubo } }] });
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.envTex.createView({ baseMipLevel: 0, mipLevelCount: 1 }), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
    pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.draw(3); pass.end();
    this.mip.generate(this.envTex, 'rgba16float', 1, mips, enc);
    device.queue.submit([enc.finish()]);
  }

  buildPipelines() {
    const { device, gpu, tier } = this;
    const hdr = gpu.hdrFormat;
    this.msaa = tier.msaa;
    const targets = [{ format: hdr }, { format: LINEAR_DEPTH }];
    const depth = (write = true, cmp = 'greater') => ({ format: DEPTH, depthWriteEnabled: write, depthCompare: cmp });
    const ms = { count: this.msaa };
    const layout = (...g) => device.createPipelineLayout({ bindGroupLayouts: g });
    const module = (code) => device.createShaderModule({ code });

    const terrainMod = module(TERRAIN);
    this.pTerrain = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArr2),
      vertex: { module: terrainMod, entryPoint: 'vs', buffers: [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }] },
      fragment: { module: terrainMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: depth(), multisample: ms,
    });
    const staticVB = [{ arrayStride: 36, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' },
      { shaderLocation: 2, offset: 24, format: 'float32x2' }, { shaderLocation: 3, offset: 32, format: 'uint32' }] }];
    const staticMod = module(STATIC);
    this.pStatic = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglStatic),
      vertex: { module: staticMod, entryPoint: 'vs', buffers: staticVB },
      fragment: { module: staticMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const armorMod = module(ARMOR);
    const skinnedVB = [
      { arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] },
      { arrayStride: 36, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }, { shaderLocation: 2, offset: 12, format: 'uint32' }, { shaderLocation: 3, offset: 16, format: 'float32x2' }, { shaderLocation: 4, offset: 24, format: 'float32x3' }] },
    ];
    this.pArmor = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: armorMod, entryPoint: 'vs', buffers: skinnedVB },
      fragment: { module: armorMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const vmMod = module(VIEWMODEL);
    const vmVB = [skinnedVB[0], { arrayStride: 36, attributes: skinnedVB[1].attributes.slice(0, 3) }];
    this.pVM = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: vmMod, entryPoint: 'vs', buffers: vmVB },
      fragment: { module: vmMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const itemMod = module(ITEM);
    const propMod = module(PROP);
    this.propVB = [
      { arrayStride: 32, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32x2' }] },
      { arrayStride: 64, stepMode: 'instance', attributes: [5, 6, 7, 8].map((l, i) => ({ shaderLocation: l, offset: i * 16, format: 'float32x4' })) },
    ];
    this.pProp = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglProp),
      vertex: { module: propMod, entryPoint: 'vs', buffers: this.propVB },
      fragment: { module: propMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    this.pItem = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: itemMod, entryPoint: 'vs', buffers: this.propVB },
      fragment: { module: itemMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const skyMod = module(SKY);
    this.pSky = device.createRenderPipeline({
      layout: layout(this.bgl0),
      vertex: { module: skyMod, entryPoint: 'vs' },
      fragment: { module: skyMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: DEPTH, depthWriteEnabled: false, depthCompare: 'equal' }, multisample: ms,
    });

    // Shadow pipelines.
    this.shadowU = device.createBuffer({ size: 256 * 3, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bglShadow = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 80 } }] });
    this.shadowBG = device.createBindGroup({ layout: this.bglShadow, entries: [{ binding: 0, resource: { buffer: this.shadowU, size: 80 } }] });
    const shMod = module(SHADOW);
    const shDepth = { format: DEPTH, depthWriteEnabled: true, depthCompare: 'less', depthBias: 2, depthBiasSlopeScale: 2.0, depthBiasClamp: 0.01 };
    const shLayout = layout(this.bglShadow);
    const posVB = (stride) => [{ arrayStride: stride, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }];
    this.pShTerrain = device.createRenderPipeline({ layout: shLayout, vertex: { module: shMod, entryPoint: 'vsPos', buffers: posVB(24) }, primitive: { cullMode: 'none' }, depthStencil: shDepth });
    this.pShStatic = device.createRenderPipeline({ layout: shLayout, vertex: { module: shMod, entryPoint: 'vsPos', buffers: posVB(36) }, primitive: { cullMode: 'none' }, depthStencil: shDepth });
    this.pShSkin = device.createRenderPipeline({ layout: shLayout, vertex: { module: shMod, entryPoint: 'vsSkin', buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }] }, primitive: { cullMode: 'none' }, depthStencil: shDepth });
    this.pShProp = device.createRenderPipeline({
      layout: shLayout,
      vertex: { module: shMod, entryPoint: 'vsProp', buffers: [posVB(32)[0], { arrayStride: 64, stepMode: 'instance', attributes: [1, 2, 3, 4].map((l, i) => ({ shaderLocation: l, offset: i * 16, format: 'float32x4' })) }] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
    this.bglShCut = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    ] });
    this.shCutBG = device.createBindGroup({ layout: this.bglShCut, entries: [{ binding: 0, resource: this.colorArr.createView({ dimension: '2d-array' }) }, { binding: 1, resource: this.repeatSmp }] });
    this.pShCut = device.createRenderPipeline({
      layout: layout(this.bglShadow, this.bglShCut),
      vertex: { module: shMod, entryPoint: 'vsCut', buffers: [{ arrayStride: 36, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32x2' }, { shaderLocation: 3, offset: 32, format: 'uint32' }] }] },
      fragment: { module: shMod, entryPoint: 'fsCut', targets: [] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
    this.shadowTex = device.createTexture({ size: [tier.shadowSize, tier.shadowSize, 3], format: DEPTH, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.shadowViews = [0, 1, 2].map((i) => this.shadowTex.createView({ dimension: '2d', baseArrayLayer: i, arrayLayerCount: 1 }));
    this.bloodMap = device.createTexture({ size: [BLOOD_SIZE, BLOOD_SIZE], format: 'rg8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    const enc = device.createCommandEncoder();
    enc.beginRenderPass({ colorAttachments: [{ view: this.bloodMap.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] }).end();
    device.queue.submit([enc.finish()]);
    this.frameBG = device.createBindGroup({ layout: this.bgl0, entries: [
      { binding: 0, resource: { buffer: this.frameUBO } }, { binding: 1, resource: this.repeatSmp }, { binding: 2, resource: this.clampSmp }, { binding: 3, resource: this.shadowSmp },
      { binding: 4, resource: this.shadowTex.createView({ dimension: '2d-array' }) }, { binding: 5, resource: this.envTex.createView() },
      { binding: 6, resource: this.groundMap.createView() }, { binding: 7, resource: this.bloodMap.createView() }, { binding: 8, resource: this.noiseTex.createView() },
    ] });

    // Post pipelines. Layouts come from the shaders.
    const bloomMod = module(BLOOM);
    this.bglBloom = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 16 } },
    ] });
    const bloomLayout = layout(this.bglBloom);
    this.pBloomDown = device.createRenderPipeline({ layout: bloomLayout, vertex: { module: bloomMod, entryPoint: 'vsTri' }, fragment: { module: bloomMod, entryPoint: 'down', targets: [{ format: hdr }] } });
    this.pBloomUp = device.createRenderPipeline({ layout: bloomLayout, vertex: { module: bloomMod, entryPoint: 'vsTri' }, fragment: { module: bloomMod, entryPoint: 'up', targets: [{ format: hdr, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] } });
    this.bloomU = device.createBuffer({ size: 256 * 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bglDepthOnly = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } }] });
    this.bglAOApply = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ] });
    if (tier.ao) {
      const aoMod = module(AO);
      this.pAO = device.createRenderPipeline({ layout: layout(this.bgl0, this.bglDepthOnly), vertex: { module: aoMod, entryPoint: 'vsTri' }, fragment: { module: aoMod, entryPoint: 'fsAO', targets: [{ format: 'r8unorm' }] } });
      this.pAOApply = device.createRenderPipeline({
        layout: layout(this.bgl0, this.bglAOApply), vertex: { module: aoMod, entryPoint: 'vsTri' },
        fragment: { module: aoMod, entryPoint: 'fsApply', targets: [{ format: hdr, blend: { color: { srcFactor: 'dst', dstFactor: 'zero' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } }] },
      });
    }
    if (tier.shafts) {
      const shMod2 = module(SHAFTS);
      this.pShafts = device.createRenderPipeline({ layout: layout(this.bgl0, this.bglDepthOnly), vertex: { module: shMod2, entryPoint: 'vsTri' }, fragment: { module: shMod2, entryPoint: 'fs', targets: [{ format: hdr }] } });
    }
    const compMod = module(COMPOSITE);
    this.bglComposite = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ] });
    this.pComposite = device.createRenderPipeline({ layout: layout(this.bglComposite), vertex: { module: compMod, entryPoint: 'vsTri' }, fragment: { module: compMod, entryPoint: 'fs', targets: [{ format: gpu.format }] } });
    this.compU = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.compData = new Float32Array(12);
    if (gpu.timestamps) {
      this.querySet = device.createQuerySet({ type: 'timestamp', count: 2 });
      this.queryResolve = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
      this.queryRead = [0, 1, 2].map(() => device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }));
      this.queryBusy = [false, false, false];
      this.queryI = 0;
    }
  }

  buildParticles() {
    const { device, tier } = this;
    const N = tier.particles;
    this.pCount = N;
    this.pBuffer = device.createBuffer({ size: N * 48, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.pAlive = device.createBuffer({ size: N * 4, usage: GPUBufferUsage.STORAGE });
    this.pArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    const stainCap = 8192;
    this.stainList = device.createBuffer({ size: stainCap * 16, usage: GPUBufferUsage.STORAGE });
    this.stainArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    this.pSimU = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.pSimData = new Float32Array(12);
    const sim = device.createShaderModule({ code: PARTICLE_SIM });
    this.pSim = device.createComputePipeline({ layout: 'auto', compute: { module: sim, entryPoint: 'main' } });
    this.pSimBG = device.createBindGroup({ layout: this.pSim.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.pSimU } }, { binding: 1, resource: { buffer: this.pBuffer } }, { binding: 2, resource: { buffer: this.pArgs } },
      { binding: 3, resource: { buffer: this.pAlive } }, { binding: 4, resource: { buffer: this.stainArgs } }, { binding: 5, resource: { buffer: this.stainList } },
      { binding: 6, resource: this.heightTex.createView() },
    ] });
    const draw = device.createShaderModule({ code: PARTICLE_DRAW });
    this.bglPDraw = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    ] });
    this.pDraw = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bglPDraw] }),
      vertex: { module: draw, entryPoint: 'vs' },
      fragment: { module: draw, entryPoint: 'fs', targets: [{ format: this.gpu.hdrFormat, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] },
    });
    const trail = device.createShaderModule({ code: TRAIL });
    this.pTrail = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bgl0] }),
      vertex: { module: trail, entryPoint: 'vs', buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }] },
      fragment: { module: trail, entryPoint: 'fs', targets: [{ format: this.gpu.hdrFormat, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
      primitive: { topology: 'triangle-strip' },
    });
    this.trailVB = device.createBuffer({ size: 128 * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.trailData = new Float32Array(128 * 4);
    this.trailCount = 0;
    const stain = device.createShaderModule({ code: STAIN });
    this.pStain = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: stain, entryPoint: 'vs' },
      fragment: { module: stain, entryPoint: 'fs', targets: [{ format: 'rg8unorm', blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
    });
    const stainU = makeBuffer(device, new Float32Array([-BLOOD_HALF, -BLOOD_HALF, 1 / (2 * BLOOD_HALF), 0]), GPUBufferUsage.UNIFORM);
    this.stainBG = device.createBindGroup({ layout: this.pStain.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: stainU } }, { binding: 1, resource: { buffer: this.stainList } }] });
    this.emitBuf = new ArrayBuffer(48 * 4096);
    this.emitF = new Float32Array(this.emitBuf);
    this.emitU = new Uint32Array(this.emitBuf);
    this.emitN = 0;
  }

  buildGrass() {
    const { device, tier } = this;
    this.grassSpacing = tier.grassSpacing; this.grassRadius = tier.grassRadius;
    this.useShafts = !!tier.shafts; this.useAO = !!tier.ao; this.farShadowEvery = 2;
    this.grassN = Math.ceil(2 * this.grassRadius / this.grassSpacing);
    const near = Math.floor(tier.grassCap * 0.62), far = Math.floor(tier.grassCap * 0.38);
    this.grassNear = device.createBuffer({ size: near * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    this.grassFar = device.createBuffer({ size: far * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    this.grassNearArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    this.grassFarArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    this.grassU = device.createBuffer({ size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.grassData = new Float32Array(48);
    const cull = device.createShaderModule({ code: GRASS_CULL });
    this.pGrassCull = device.createComputePipeline({ layout: 'auto', compute: { module: cull, entryPoint: 'main' } });
    this.grassBG = device.createBindGroup({ layout: this.pGrassCull.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.grassU } }, { binding: 1, resource: { buffer: this.grassNearArgs } }, { binding: 2, resource: { buffer: this.grassFarArgs } },
      { binding: 3, resource: { buffer: this.grassNear } }, { binding: 4, resource: { buffer: this.grassFar } }, { binding: 5, resource: this.groundMap.createView() }, { binding: 6, resource: this.heightTex.createView() },
    ] });
    const mod = device.createShaderModule({ code: GRASS });
    const vb = [{ arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'uint32' }] }];
    const layout = device.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bglArr2] });
    const targets = [{ format: this.gpu.hdrFormat }, { format: LINEAR_DEPTH }];
    const depth = { format: DEPTH, depthWriteEnabled: true, depthCompare: 'greater' };
    this.pGrassNear = device.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: 'vsNear', buffers: vb }, fragment: { module: mod, entryPoint: 'fs', targets }, primitive: { topology: 'triangle-strip', cullMode: 'none' }, depthStencil: depth, multisample: { count: this.msaa } });
    this.pGrassFar = device.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: 'vsFar', buffers: vb }, fragment: { module: mod, entryPoint: 'fs', targets }, primitive: { topology: 'triangle-list', cullMode: 'none' }, depthStencil: depth, multisample: { count: this.msaa } });
    this.grassNearRadius = tier.grassRadius * 0.42;
  }

  // ---- targets -------------------------------------------------------------------------------------

  resize() {
    const { gpu, canvas, tier } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, gpu.mobile ? 3 : 2);
    const cw = Math.max(2, Math.floor(canvas.clientWidth * dpr)), ch = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      this.dropTargetSets();
    }
    const W = Math.max(2, Math.floor(cw * this.scale * tier.scaleMax)), H_ = Math.max(2, Math.floor(ch * this.scale * tier.scaleMax));
    const key = `${W}x${H_}`;
    if (this.activeKey === key) return;
    if (!this.targetSets) this.targetSets = new Map();
    let set = this.targetSets.get(key);
    if (!set) {
      // Two sets at most: the one in use and the one before it.
      if (this.targetSets.size >= 2) {
        const oldest = [...this.targetSets.keys()].find((k) => k !== this.activeKey);
        for (const t of this.targetSets.get(oldest).textures) t.destroy();
        this.targetSets.delete(oldest);
      }
      set = this.buildTargetSet(W, H_);
      this.targetSets.set(key, set);
    }
    this.activeKey = key;
    Object.assign(this, set.fields);
    this.W = W; this.H = H_;
    this.device.queue.writeBuffer(this.bloomU, 0, set.bloomData);
  }

  dropTargetSets() {
    if (this.targetSets) for (const set of this.targetSets.values()) for (const t of set.textures) t.destroy();
    this.targetSets = new Map();
    this.activeKey = null;
  }

  buildTargetSet(W, H_) {
    const { device, gpu, tier } = this;
    const make = (w, h, format, usage, sampleCount = 1) => device.createTexture({ size: [w, h], format, usage, sampleCount });
    const RT = GPUTextureUsage.RENDER_ATTACHMENT, TB = GPUTextureUsage.TEXTURE_BINDING;
    const hdrMS = make(W, H_, gpu.hdrFormat, RT, this.msaa), hdr = make(W, H_, gpu.hdrFormat, RT | TB);
    const ldMS = make(W, H_, LINEAR_DEPTH, RT, this.msaa), ld = make(W, H_, LINEAR_DEPTH, RT | TB);
    const depthMS = make(W, H_, DEPTH, RT, this.msaa);
    const hw = Math.max(2, W >> 1), hh = Math.max(2, H_ >> 1);
    const aoTex = make(hw, hh, 'r8unorm', RT | TB), shaftTex = make(hw, hh, gpu.hdrFormat, RT | TB);
    const textures = [hdrMS, hdr, ldMS, ld, depthMS, aoTex, shaftTex];
    const bloomChain = [];
    let bw = hw, bh = hh;
    for (let i = 0; i < tier.bloom; i++) {
      const t = make(Math.max(2, bw), Math.max(2, bh), gpu.hdrFormat, RT | TB);
      bloomChain.push({ tex: t, view: t.createView(), w: Math.max(2, bw), h: Math.max(2, bh) });
      textures.push(t);
      bw >>= 1; bh >>= 1;
    }
    const hdrView = hdr.createView(), ldView = ld.createView();
    const bgFor = (view) => device.createBindGroup({ layout: this.bglBloom, entries: [
      { binding: 0, resource: view }, { binding: 1, resource: this.clampSmp }, { binding: 2, resource: { buffer: this.bloomU, size: 16 } }] });
    const bloomDownBG = [bgFor(hdrView)];
    for (let i = 0; i + 1 < bloomChain.length; i++) bloomDownBG.push(bgFor(bloomChain[i].view));
    const bloomUpBG = [];
    for (let i = bloomChain.length - 1; i > 0; i--) bloomUpBG.push(bgFor(bloomChain[i].view));
    const bd = new Float32Array(256 * 16 / 4);
    let slot = 0;
    const bloomSlots = { down: [], up: [] };
    let sw = W, sh = H_;
    for (let i = 0; i < bloomChain.length; i++) {
      const o = slot * 64;
      bd[o] = 0.5 / sw; bd[o + 1] = 0.5 / sh; bd[o + 2] = 1; bd[o + 3] = i === 0 ? 1 : 0;
      bloomSlots.down.push(slot * 256);
      slot++;
      sw = bloomChain[i].w; sh = bloomChain[i].h;
    }
    for (let i = bloomChain.length - 1; i > 0; i--) {
      const o = slot * 64;
      bd[o] = 1 / bloomChain[i].w; bd[o + 1] = 1 / bloomChain[i].h; bd[o + 2] = 0.72;
      bloomSlots.up.push(slot * 256);
      slot++;
    }
    const fields = {
      hdrMS, hdr, ldMS, ld, depthMS, aoTex, shaftTex, bloomChain, hdrView, ldView, bloomDownBG, bloomUpBG, bloomSlots,
      hdrMSView: hdrMS.createView(), ldMSView: ldMS.createView(), depthMSView: depthMS.createView(), aoView: aoTex.createView(), shaftView: shaftTex.createView(),
      compBG: device.createBindGroup({ layout: this.bglComposite, entries: [
        { binding: 0, resource: hdrView }, { binding: 1, resource: bloomChain[0].view }, { binding: 2, resource: shaftTex.createView() },
        { binding: 3, resource: this.clampSmp }, { binding: 4, resource: { buffer: this.compU } },
      ] }),
      depthBG: device.createBindGroup({ layout: this.bglDepthOnly, entries: [{ binding: 0, resource: ldView }] }),
      aoApplyBG: device.createBindGroup({ layout: this.bglAOApply, entries: [{ binding: 0, resource: ldView }, { binding: 1, resource: aoTex.createView() }] }),
      pDrawBG: device.createBindGroup({ layout: this.bglPDraw, entries: [
        { binding: 0, resource: { buffer: this.pBuffer } }, { binding: 1, resource: { buffer: this.pAlive } }, { binding: 2, resource: ldView },
      ] }),
    };
    return { fields, textures, bloomData: bd };
  }

  // Step quality down when even a lower resolution can't hold the frame rate. Returns false when nothing's left.
  demote() {
    this.demoted = (this.demoted || 0) + 1;
    switch (this.demoted) {
      case 1: if (this.useShafts) { this.useShafts = false; return true; } this.demoted = 2; // falls through
      case 2: if (this.useAO) { this.useAO = false; return true; } this.demoted = 3; // falls through
      case 3:
        this.grassSpacing *= 1.35; this.grassRadius *= 0.85; this.grassN = Math.ceil(2 * this.grassRadius / this.grassSpacing);
        return true;
      case 4: this.farShadowEvery = 4; return true;
      case 5:
        this.grassSpacing *= 1.35; this.grassRadius *= 0.8; this.grassN = Math.ceil(2 * this.grassRadius / this.grassSpacing);
        return true;
      default: return false;
    }
  }

  clearBlood() {
    const enc = this.device.createCommandEncoder();
    enc.beginRenderPass({ colorAttachments: [{ view: this.bloodMap.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] }).end();
    this.device.queue.submit([enc.finish()]);
  }

  // ---- particles from the CPU -------------------------------------------------------------------------

  // Emit a burst. kind: 0 droplet, 1 mist, 2 spark, 3 dust, 4 smoke, 5 mote, 6 ember.
  emit(kind, count, x, y, z, dx, dy, dz, spread, sp0, sp1, sz0, sz1, life0, life1) {
    const f = this.emitF, u = this.emitU, cap = this.emitF.length / 12;
    for (let i = 0; i < count; i++) {
      if (this.emitN >= cap) return;
      const o = this.emitN * 12;
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
      const rx = Math.cos(a) * r + (Math.random() - 0.5) * spread * 0.4, ry = Math.sin(a) * r, rz = (Math.random() - 0.5) * spread;
      let vx = dx + rx, vy = dy + ry, vz = dz + rz;
      const L = 1 / (Math.hypot(vx, vy, vz) || 1);
      const s = sp0 + (sp1 - sp0) * Math.random() ** 1.6;
      f[o] = x; f[o + 1] = y; f[o + 2] = z;
      f[o + 3] = life0 + (life1 - life0) * Math.random();
      f[o + 4] = vx * L * s; f[o + 5] = vy * L * s; f[o + 6] = vz * L * s;
      f[o + 7] = f[o + 3];
      // Mostly small with a few large: the way any spray of liquid breaks up.
      f[o + 8] = sz0 + (sz1 - sz0) * Math.random() ** 3;
      u[o + 9] = kind;
      f[o + 10] = Math.random(); f[o + 11] = 0;
      this.emitN++;
    }
  }

  flushEmits() {
    const n = this.emitN;
    if (!n) return;
    const N = this.pCount;
    let head = this.emitHead;
    const first = Math.min(n, N - head);
    this.device.queue.writeBuffer(this.pBuffer, head * 48, this.emitBuf, 0, first * 48);
    if (first < n) this.device.queue.writeBuffer(this.pBuffer, 0, this.emitBuf, first * 48, (n - first) * 48);
    this.emitHead = (head + n) % N;
    this.emitN = 0;
  }

  // ---- a frame ---------------------------------------------------------------------------------------

  writeFrame(cam, snap) {
    const d = this.frameData;
    const { W, H: Ht } = this;
    const aspect = W / Ht;
    mat4Perspective(this.tmpP, WORLD_FOV, aspect, 0.08);
    mat4LookTo(this.tmpV, cam.x, cam.y, cam.z, cam.fx, cam.fy, cam.fz, cam.ux, cam.uy, cam.uz);
    mat4Mul(this.tmpVP, this.tmpP, this.tmpV);
    mat4Invert(this.tmpI, this.tmpVP);
    d.set(this.tmpVP, O.VP); d.set(this.tmpV, O.VIEW); d.set(this.tmpP, O.PROJ); d.set(this.tmpI, O.IVP);
    const vmFov = (this.vmFov || 76) * Math.PI / 180;
    mat4Perspective(this.tmpP, vmFov, aspect, 0.05);
    d.set(this.tmpP, O.VMP);
    // View model space to world: the camera's own frame at the eye.
    const rx = cam.fy * cam.uz - cam.fz * cam.uy, ry = cam.fz * cam.ux - cam.fx * cam.uz, rz = cam.fx * cam.uy - cam.fy * cam.ux;
    d.set([rx, ry, rz, 0, cam.ux, cam.uy, cam.uz, 0, -cam.fx, -cam.fy, -cam.fz, 0, cam.x, cam.y, cam.z, 1], O.VMW);
    // Cascades.
    const n = this.tier.cascades;
    const tan = Math.tan(WORLD_FOV / 2);
    const sun = this.sunDir;
    let prev = 0.1;
    for (let c = 0; c < n; c++) {
      const far = this.splits[n === 2 && c === 1 ? 2 : c];
      const mid = (prev + far) / 2;
      const hf = far * tan, wf = hf * aspect, hn = prev * tan, wn = hn * aspect;
      const rad = Math.ceil(Math.max(Math.hypot(far - mid, wf, hf), Math.hypot(mid - prev, wn, hn)));
      const cx = cam.x + cam.fx * mid, cy = cam.y + cam.fy * mid, cz = cam.z + cam.fz * mid;
      mat4LookTo(this.tmpV, 0, 0, 0, -sun[0], -sun[1], -sun[2], 0, 1, 0);
      // Snap the centre to the shadow map's texels, so edges don't crawl as you move.
      const texel = 2 * rad / this.tier.shadowSize;
      const lx = this.tmpV[0] * cx + this.tmpV[4] * cy + this.tmpV[8] * cz;
      const ly = this.tmpV[1] * cx + this.tmpV[5] * cy + this.tmpV[9] * cz;
      const lz = this.tmpV[2] * cx + this.tmpV[6] * cy + this.tmpV[10] * cz;
      const sx = Math.round(lx / texel) * texel, sy = Math.round(ly / texel) * texel;
      mat4Ortho(this.tmpP, sx - rad, sx + rad, sy - rad, sy + rad, -lz - 260, -lz + 260);
      mat4Mul(this.tmpVP, this.tmpP, this.tmpV);
      d.set(this.tmpVP, O.CASC + c * 16);
      prev = far;
    }
    d[O.CAM] = cam.x; d[O.CAM + 1] = cam.y; d[O.CAM + 2] = cam.z; d[O.CAM + 3] = snap[H.TIME] + (this.renderTimeOffset || 0);
    d[O.SUN] = sun[0]; d[O.SUN + 1] = sun[1]; d[O.SUN + 2] = sun[2]; d[O.SUN + 3] = 2.4 / this.tier.shadowSize;
    d.set([5.0, 3.75, 2.55, 0], O.SUNC);
    d.set([0.34, 0.42, 0.58, 0], O.SKY);
    d.set([0.15, 0.13, 0.09, 0], O.GND);
    d.set([0.52, 0.5, 0.52, 0.0011], O.FOG);
    d.set([0.018, 0.8, 0, 0], O.FOGP);
    d.set(n === 2 ? [this.splits[2] * 0.3, this.splits[2], this.splits[2], 0] : [this.splits[0], this.splits[1], this.splits[2], 0], O.SPLIT);
    d.set([W, Ht, 1 / W, 1 / Ht], O.SCREEN);
    const t = d[O.CAM + 3];
    const gust = 0.42 + 0.3 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.67);
    d.set([0.82, gust, 0.57, t], O.WIND);
    d.set([-GROUND_HALF, -GROUND_HALF, 1 / (2 * GROUND_HALF), 0], O.GROUND);
    d.set([-BLOOD_HALF, -BLOOD_HALF, 1 / (2 * BLOOD_HALF), 0], O.BLOOD);
    // Bodies in the grass.
    let bi = 0;
    d.set([snap[H.PX], snap[H.PY], snap[H.PZ], 0.45], O.CHARS);
    bi = 1;
    for (let i = 0; i < 5; i++) {
      const co = CHARS_START + i * C_SIZE;
      if (snap[co + C.ACTIVE] > 0.5) { d.set([snap[co + C.X], snap[co + C.Y], snap[co + C.Z], i < 2 ? 0.6 : 1.5], O.CHARS + bi * 4); bi++; }
    }
    for (; bi < 6; bi++) d[O.CHARS + bi * 4 + 3] = 0;
    // Lanterns, the nearest to the camera first.
    const lights = this.lights;
    const take = Math.min(lights.length, 12);
    for (let i = 0; i < take; i++) {
      const L = lights[i];
      const fl = 1 + L.flicker * 0.25 * (Math.sin(t * 9.1 + i * 2.1) * 0.6 + Math.sin(t * 17.3 + i) * 0.4);
      d.set([L.p[0], L.p[1], L.p[2], L.r, L.c[0], L.c[1], L.c[2], L.i * fl], O.LIGHTS + i * 8);
    }
    d.set([take, this.tier.cascades, this.tier.pom, this.grassNearRadius * 1.9], O.COUNTS);
    this.device.queue.writeBuffer(this.frameUBO, 0, d);
  }

  frame(cam, snap, vmSway, dt) {
    const { device, tier } = this;
    this.resize();
    this.writeFrame(cam, snap);
    const time = this.frameData[O.CAM + 3];

    // Characters: palettes, wounds, weapons.
    const q = device.queue;
    const skinParams = this.skinParamData || (this.skinParamData = new Float32Array(8));
    const skinParamsU = this.skinParamU || (this.skinParamU = new Uint32Array(skinParams.buffer));
    for (let i = 0; i < this.chars.length; i++) {
      const c = this.chars[i];
      const co = CHARS_START + i * C_SIZE;
      if (snap[co + C.ACTIVE] < 0.5) continue;
      q.writeBuffer(c.palette, 0, snap.buffer, snap.byteOffset + (co + C_PALETTE) * 4, c.jointCount * 32);
      const ver = snap[co + C.GASH_VERSION];
      if (ver !== this.gashVersions[i]) {
        this.gashVersions[i] = ver;
        q.writeBuffer(c.ubo, 0, snap.buffer, snap.byteOffset + (co + C_GASH) * 4, 24 * 64);
        q.writeBuffer(c.ubo, 24 * 64, snap.buffer, snap.byteOffset + (co + C_MASKS) * 4, 256);
      }
      c.gashData[0] = snap[co + C.HEART];
      c.gashData[1] = i < 2 ? 1 : 0.62;
      c.gashData[2] = i === 1 ? 1 : 0; // polished steel: its dark paint is shadow, not blackening
      q.writeBuffer(c.ubo, 24 * 64 + 256, c.gashData, 0, 4);
      skinParamsU[0] = c.count;
      skinParams[1] = 1; skinParams[2] = time;
      skinParams[4] = 0.05; skinParams[5] = 0; skinParams[6] = 0.035;
      q.writeBuffer(c.params, 0, skinParams);
      if (i < 2) {
        this.propData.set(snap.subarray(co + C_PROPS, co + C_PROPS + 32), i * 32);
        this.glintData = this.glintData || new Float32Array(4);
        this.glintData[0] = snap[co + C.GLINT];
        q.writeBuffer(this.props[i * 2].ubo, 0, this.glintData);
      }
    }
    q.writeBuffer(this.propInstances, 0, this.propData);
    // View model: the arms the snapshot posed, and what's in them.
    const weapon = WEAPONS[snap[H.WEAPON] | 0] || null;
    this.vm = this.vms[weapon ? weapon.hands : 1];
    const held = weapon && weapon.id !== 'greatsword' ? this.sword(weapon.id) : null;
    this.held = held && held.ready ? held : null;
    this.holdingOld = !!weapon && weapon.id === 'greatsword';
    q.writeBuffer(this.vm.palette, 0, snap.buffer, snap.byteOffset + VM_PALETTE * 4, this.vm.jointCount * 32);
    skinParamsU[0] = this.vm.count;
    skinParams[1] = 0; skinParams[2] = time;
    q.writeBuffer(this.vm.params, 0, skinParams);
    const vmData = this.vmData || (this.vmData = new Float32Array(20));
    vmData.set(vmSway, 0);
    vmData[16] = snap[H.BLOOD_SWORD];
    for (const part of this.vm.parts) {
      vmData[17] = part.isSword ? 1 : 0; vmData[18] = part.isSword ? 1 : 0; vmData[19] = 1;
      q.writeBuffer(part.ubo, 0, vmData);
    }
    if (this.held) {
      const h = this.held;
      q.writeBuffer(h.hand.palette, 0, snap.buffer, snap.byteOffset + VM_PALETTE * 4, h.hand.jointCount * 32);
      skinParamsU[0] = h.hand.count;
      q.writeBuffer(h.hand.params, 0, skinParams);
      vmData[17] = 0; vmData[18] = 1; vmData[19] = h.tip;
      q.writeBuffer(h.ubo, 0, vmData);
    }
    // What's lying on the ground.
    let nGround = 0;
    for (const g of this.ground) {
      const model = g.gem ? this.gem(g.gem) : this.sword(g.sword).lying;
      g.model = model;
      if (!model || nGround >= MAX_GROUND) { g.slot = -1; continue; }
      g.slot = nGround;
      this.itemData.set(g.mat, nGround++ * 16);
    }
    if (nGround) q.writeBuffer(this.itemInstances, 0, this.itemData, 0, nGround * 16);

    // Grass culling input.
    const g = this.grassData;
    const m = this.frameData.subarray(O.VP, O.VP + 16);
    g.set(m, 0);
    g[16] = cam.x; g[17] = cam.y; g[18] = cam.z; g[19] = 0;
    g[20] = this.grassN; g[21] = this.grassSpacing; g[22] = this.grassRadius; g[23] = this.grassNearRadius;
    g[24] = -GROUND_HALF; g[25] = -GROUND_HALF; g[26] = 1 / (2 * GROUND_HALF); g[27] = 0;
    // Left, right, bottom, top, near from the combined matrix.
    for (let i = 0; i < 5; i++) {
      const axis = i >> 1, sign = i === 4 ? -1 : (i & 1 ? -1 : 1);
      const a = m[3] + sign * m[axis], b = m[7] + sign * m[axis + 4], c = m[11] + sign * m[axis + 8], e = m[15] + sign * m[axis + 12];
      const L = 1 / Math.hypot(a, b, c);
      g[28 + i * 4] = a * L; g[29 + i * 4] = b * L; g[30 + i * 4] = c * L; g[31 + i * 4] = e * L;
    }
    q.writeBuffer(this.grassU, 0, g);
    if (!this.args7) { this.args7 = new Uint32Array([7, 0, 0, 0]); this.args3 = new Uint32Array([3, 0, 0, 0]); this.args6 = new Uint32Array([6, 0, 0, 0]); }
    q.writeBuffer(this.grassNearArgs, 0, this.args7);
    q.writeBuffer(this.grassFarArgs, 0, this.args3);
    q.writeBuffer(this.pArgs, 0, this.args6);
    q.writeBuffer(this.stainArgs, 0, this.args6);
    this.flushEmits();
    const ps = this.pSimData;
    ps[0] = Math.min(dt, 0.05) * snap[H.TIME_SCALE]; ps[1] = time;
    this.pSimU32 = this.pSimU32 || new Uint32Array(ps.buffer);
    this.pSimU32[2] = this.pCount;
    ps[4] = 0.5; ps[5] = 0.02; ps[6] = 0.35; ps[8] = -GROUND_HALF; ps[9] = -GROUND_HALF; ps[10] = 1 / (2 * GROUND_HALF);
    q.writeBuffer(this.pSimU, 0, ps);

    const enc = device.createCommandEncoder();
    const useTime = this.querySet && !this.queryBusy[this.queryI];
    // ---- compute ----
    const cp = enc.beginComputePass(useTime ? { timestampWrites: { querySet: this.querySet, beginningOfPassWriteIndex: 0 } } : undefined);
    cp.setPipeline(this.skinPipeline);
    for (let i = 0; i < this.chars.length; i++) {
      const c = this.chars[i];
      cp.setBindGroup(0, c.bg);
      cp.dispatchWorkgroups(Math.ceil(c.count / 128));
    }
    cp.setBindGroup(0, this.vm.bg);
    cp.dispatchWorkgroups(Math.ceil(this.vm.count / 128));
    if (this.held) {
      cp.setBindGroup(0, this.held.hand.bg);
      cp.dispatchWorkgroups(Math.ceil(this.held.hand.count / 128));
    }
    cp.setPipeline(this.pGrassCull);
    cp.setBindGroup(0, this.grassBG);
    cp.dispatchWorkgroups(Math.ceil(this.grassN * this.grassN / 64));
    cp.setPipeline(this.pSim);
    cp.setBindGroup(0, this.pSimBG);
    cp.dispatchWorkgroups(Math.ceil(this.pCount / 256));
    cp.end();

    // ---- shadows, the far cascades on alternating frames ----
    this.shadowFrame++;
    const shadowData = this.shadowData || (this.shadowData = new Float32Array(64 * 3));
    for (let c = 0; c < tier.cascades; c++) shadowData.set(this.frameData.subarray(O.CASC + c * 16, O.CASC + c * 16 + 16), c * 64);
    q.writeBuffer(this.shadowU, 0, shadowData);
    for (let c = 0; c < tier.cascades; c++) {
      if (c === 2 && this.shadowFrame % this.farShadowEvery) continue;
      const sp = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.shadowViews[c], depthLoadOp: 'clear', depthClearValue: 1, depthStoreOp: 'store' } });
      sp.setBindGroup(0, this.shadowBG, [c * 256]);
      sp.setPipeline(this.pShTerrain);
      if (c === 2) {
        sp.setVertexBuffer(0, this.terrainVB);
        sp.setIndexBuffer(this.terrainIB, 'uint32');
        sp.drawIndexed(this.terrainCount);
      }
      sp.setPipeline(this.pShStatic);
      sp.setVertexBuffer(0, this.staticVB);
      sp.setIndexBuffer(this.staticIB, 'uint32');
      sp.drawIndexed(this.staticOpaque);
      sp.setPipeline(this.pShCut);
      sp.setBindGroup(1, this.shCutBG);
      sp.drawIndexed(this.staticTotal - this.staticOpaque, 1, this.staticOpaque);
      sp.setPipeline(this.pShSkin);
      for (let i = 0; i < this.chars.length; i++) {
        const ch = this.chars[i];
        sp.setVertexBuffer(0, ch.outBuf);
        sp.setIndexBuffer(ch.IB, 'uint32');
        sp.drawIndexed(ch.indices);
      }
      sp.setPipeline(this.pShProp);
      sp.setVertexBuffer(1, this.propInstances);
      this.props.forEach((pr, i) => {
        sp.setVertexBuffer(0, pr.VB);
        sp.setIndexBuffer(pr.IB, 'uint32');
        sp.drawIndexed(pr.count, 1, 0, 0, i);
      });
      if (nGround) {
        sp.setVertexBuffer(1, this.itemInstances);
        for (const g of this.ground) {
          if (g.slot < 0) continue;
          sp.setVertexBuffer(0, g.model.VB);
          sp.setIndexBuffer(g.model.IB, 'uint32');
          sp.drawIndexed(g.model.count, 1, 0, 0, g.slot);
        }
      }
      sp.end();
    }

    // ---- blood soaking into the ground ----
    this.bloodView = this.bloodView || this.bloodMap.createView();
    const stainPass = enc.beginRenderPass({ colorAttachments: [{ view: this.bloodView, loadOp: 'load', storeOp: 'store' }] });
    stainPass.setPipeline(this.pStain);
    stainPass.setBindGroup(0, this.stainBG);
    stainPass.drawIndirect(this.stainArgs, 0);
    stainPass.end();

    // ---- the world ----
    const mp = enc.beginRenderPass({
      colorAttachments: [
        { view: this.hdrMSView, resolveTarget: this.hdrView, loadOp: 'clear', storeOp: 'discard', clearValue: [0, 0, 0, 1] },
        { view: this.ldMSView, resolveTarget: this.ldView, loadOp: 'clear', storeOp: 'discard', clearValue: [4000, 0, 0, 1] },
      ],
      depthStencilAttachment: { view: this.depthMSView, depthLoadOp: 'clear', depthClearValue: 0, depthStoreOp: 'discard' },
    });
    mp.setViewport(0, 0, this.W, this.H, 0, 0.96);
    mp.setBindGroup(0, this.frameBG);
    // Knights first: they cover the most pixels they can occlude behind them when close.
    mp.setPipeline(this.pArmor);
    for (let i = 0; i < this.chars.length; i++) {
      const ch = this.chars[i];
      mp.setBindGroup(1, ch.matBG);
      mp.setVertexBuffer(0, ch.outBuf);
      mp.setVertexBuffer(1, ch.sideVB);
      mp.setIndexBuffer(ch.IB, 'uint32');
      mp.drawIndexed(ch.indices);
    }
    mp.setPipeline(this.pProp);
    mp.setVertexBuffer(1, this.propInstances);
    this.props.forEach((pr, i) => {
      mp.setBindGroup(1, pr.bg);
      mp.setVertexBuffer(0, pr.VB);
      mp.setIndexBuffer(pr.IB, 'uint32');
      mp.drawIndexed(pr.count, 1, 0, 0, i);
    });
    if (nGround) {
      mp.setPipeline(this.pItem);
      mp.setVertexBuffer(1, this.itemInstances);
      for (const g of this.ground) {
        if (g.slot < 0) continue;
        mp.setBindGroup(1, g.model.bg);
        mp.setVertexBuffer(0, g.model.VB);
        mp.setIndexBuffer(g.model.IB, 'uint32');
        mp.drawIndexed(g.model.count, 1, 0, 0, g.slot);
      }
    }
    mp.setPipeline(this.pStatic);
    mp.setBindGroup(1, this.staticBG);
    mp.setVertexBuffer(0, this.staticVB);
    mp.setIndexBuffer(this.staticIB, 'uint32');
    mp.drawIndexed(this.staticTotal);
    mp.setPipeline(this.pTerrain);
    mp.setBindGroup(1, this.terrainBG);
    mp.setVertexBuffer(0, this.terrainVB);
    mp.setIndexBuffer(this.terrainIB, 'uint32');
    mp.drawIndexed(this.terrainCount);
    mp.setPipeline(this.pGrassNear);
    mp.setVertexBuffer(0, this.grassNear);
    mp.drawIndirect(this.grassNearArgs, 0);
    mp.setPipeline(this.pGrassFar);
    mp.setVertexBuffer(0, this.grassFar);
    mp.drawIndirect(this.grassFarArgs, 0);
    mp.setPipeline(this.pSky);
    mp.draw(3);
    // The arms, in front of everything, with their own camera.
    if (!this.hideVM) {
      mp.setViewport(0, 0, this.W, this.H, 0.96, 1);
      mp.setPipeline(this.pVM);
      mp.setVertexBuffer(0, this.vm.outBuf);
      mp.setVertexBuffer(1, this.vm.sideVB);
      mp.setIndexBuffer(this.vm.IB, 'uint32');
      for (const part of this.vm.parts) {
        if (part.isSword && !this.holdingOld) continue;
        mp.setBindGroup(1, part.bg);
        mp.drawIndexed(part.range.count, 1, part.range.first);
      }
      if (this.held) {
        const h = this.held;
        mp.setVertexBuffer(0, h.hand.outBuf);
        mp.setVertexBuffer(1, h.hand.sideVB);
        mp.setIndexBuffer(h.hand.IB, 'uint32');
        mp.setBindGroup(1, h.bg);
        mp.drawIndexed(h.hand.indices);
      }
    }
    mp.end();

    // ---- screen-space passes ----
    if (this.useAO) {
      const ap = enc.beginRenderPass({ colorAttachments: [{ view: this.aoView, loadOp: 'clear', storeOp: 'store', clearValue: [1, 1, 1, 1] }] });
      ap.setPipeline(this.pAO); ap.setBindGroup(0, this.frameBG); ap.setBindGroup(1, this.depthBG); ap.draw(3); ap.end();
    }
    if (this.useShafts) {
      const sp = enc.beginRenderPass({ colorAttachments: [{ view: this.shaftView, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      sp.setPipeline(this.pShafts); sp.setBindGroup(0, this.frameBG); sp.setBindGroup(1, this.depthBG); sp.draw(3); sp.end();
    }
    const pp = enc.beginRenderPass({ colorAttachments: [{ view: this.hdrView, loadOp: 'load', storeOp: 'store' }] });
    pp.setBindGroup(0, this.frameBG);
    if (this.useAO) { pp.setPipeline(this.pAOApply); pp.setBindGroup(1, this.aoApplyBG); pp.draw(3); }
    pp.setPipeline(this.pDraw);
    pp.setBindGroup(1, this.pDrawBG);
    pp.drawIndirect(this.pArgs, 0);
    if (this.trailCount >= 4 && !this.hideVM) {
      q.writeBuffer(this.trailVB, 0, this.trailData, 0, this.trailCount * 4);
      pp.setPipeline(this.pTrail);
      pp.setVertexBuffer(0, this.trailVB);
      pp.draw(this.trailCount);
    }
    pp.end();

    // ---- bloom ----
    const chain = this.bloomChain;
    for (let i = 0; i < chain.length; i++) {
      const b = enc.beginRenderPass({ colorAttachments: [{ view: chain[i].view, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      b.setPipeline(this.pBloomDown); b.setBindGroup(0, this.bloomDownBG[i], [this.bloomSlots.down[i]]); b.draw(3); b.end();
    }
    for (let i = chain.length - 1, k = 0; i > 0; i--, k++) {
      const b = enc.beginRenderPass({ colorAttachments: [{ view: chain[i - 1].view, loadOp: 'load', storeOp: 'store' }] });
      b.setPipeline(this.pBloomUp); b.setBindGroup(0, this.bloomUpBG[k], [this.bloomSlots.up[k]]); b.draw(3); b.end();
    }

    // ---- to the screen ----
    const cd = this.compData;
    cd[0] = snap[H.DMG_FLASH]; cd[1] = snap[H.WEAK]; cd[2] = time;
    cd[3] = this.W < this.canvas.width * 0.92 ? 0.55 : 0.18;
    cd[4] = this.useShafts ? 1 : 0; cd[5] = 0.3; cd[6] = this.fade || 0;
    cd[7] = snap[H.HIT_DIR]; cd[8] = Math.max(0, 1 - snap[H.HIT_DIR_T] * 1.5);
    q.writeBuffer(this.compU, 0, cd);
    const fp = enc.beginRenderPass({
      colorAttachments: [{ view: this.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }],
      ...(useTime ? { timestampWrites: { querySet: this.querySet, endOfPassWriteIndex: 1 } } : {}),
    });
    fp.setPipeline(this.pComposite); fp.setBindGroup(0, this.compBG); fp.draw(3); fp.end();
    if (useTime) {
      const slot = this.queryI;
      enc.resolveQuerySet(this.querySet, 0, 2, this.queryResolve, 0);
      enc.copyBufferToBuffer(this.queryResolve, 0, this.queryRead[slot], 0, 16);
      this.queryBusy[slot] = true;
      q.submit([enc.finish()]);
      this.queryRead[slot].mapAsync(GPUMapMode.READ).then(() => {
        const t = new BigInt64Array(this.queryRead[slot].getMappedRange());
        const ms = Number(t[1] - t[0]) / 1e6;
        if (ms > 0 && ms < 200) this.stats.gpuMs = lerp(this.stats.gpuMs, ms, 0.1);
        this.queryRead[slot].unmap();
        this.queryBusy[slot] = false;
      }).catch(() => {});
      this.queryI = (slot + 1) % 3;
    } else {
      q.submit([enc.finish()]);
    }
  }
}
