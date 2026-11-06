// The forest. A pine in three meshes, all in units of its own height and stretched to each tree as it's drawn, with whichever
// mesh suits how far off the tree is. Trees go by the 32 m chunk; the lists of what's near only change as the camera moves.
import { makeBuffer } from './gpu.js';
import { SHADOW, STATIC } from './materials.js';

const CHUNK = 32, FLOATS = 8;
const NEAR = 84, MID = 232;       // Metres to a chunk's middle: the full tree, then the whorls of big cards, then the painted tree.
const SKIRT_FROM = 0.2;           // The bare trunk, up to the lowest boughs.

const reach = (y) => 0.2 * Math.pow(Math.max(0, 1 - (y - SKIRT_FROM) / (1 - SKIRT_FROM)), 0.9) + 0.03;
// (The same random run every time, so all the forest's one tree, turned and stretched.)
function rng(seed) { let s = seed; return () => { s = Math.imul(s ^ (s >>> 15), 2246822519) + 1 | 0; return ((s ^ (s >>> 13)) >>> 0) / 4294967296; }; }

class Mesh {
  constructor() { this.v = []; this.i = []; this.n = 0; }

  vert(x, y, z, nx, ny, nz, u, v, layer) {
    const l = Math.hypot(nx, ny, nz) || 1;
    this.v.push(x, y, z, nx / l, ny / l, nz / l, u, v, layer);
    return this.n++;
  }

  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }

  trunk(sides, rows, layer) {
    const base = this.n;
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, y = -0.03 + 1.03 * t, r = 0.018 * (1 - t) ** 1.1 + 0.0025 * t + 0.009 * Math.exp(-Math.max(0, y) * 40);
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        this.vert(c * r, y, s * r, c, 0.05, s, i / sides * 2, t * 14, layer);
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < sides; i++) {
        const a = base + j * (sides + 1) + i;
        this.quad(a, a + 1, a + sides + 2, a + sides + 1);
      }
    }
  }

  // One bough: a long card from the trunk out, the stem down its middle, bending as it goes. It's lit as if it faced up and outward.
  bough(y, ang, len, wide, droop, segs, layer) {
    const cx = Math.cos(ang), cz = Math.sin(ang), sx = -cz, sz = cx;
    const nx = cx * 0.55, ny = 0.85, nz = cz * 0.55;
    const base = this.n;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs, r = len * t, h = y + droop * (t * t * 1.15 - 0.15 * t);
      for (const s of [-1, 1]) this.vert(cx * r + sx * s * wide, h, cz * r + sz * s * wide, nx, ny, nz, t, s * 0.5 + 0.5, layer);
    }
    for (let k = 0; k < segs; k++) {
      const a = base + k * 2;
      this.quad(a, a + 1, a + 3, a + 2);
    }
  }

  // And the same bough stood on edge, for what the flat one doesn't show from beside it.
  blade(y, ang, len, wide, droop, layer) {
    const cx = Math.cos(ang), cz = Math.sin(ang);
    const nx = cx * 0.55, ny = 0.85, nz = cz * 0.55;
    const a = this.vert(0, y + wide, 0, nx, ny, nz, 0, 0, layer), b = this.vert(0, y - wide, 0, nx, ny, nz, 0, 1, layer);
    const c = this.vert(cx * len, y + droop - wide, cz * len, nx, ny, nz, 1, 1, layer), d = this.vert(cx * len, y + droop + wide, cz * len, nx, ny, nz, 1, 0, layer);
    this.quad(a, b, c, d);
  }

  // A tree on three crossed cards, painted whole.
  crossed(layer) {
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * Math.PI, cx = Math.cos(a) * 0.25, cz = Math.sin(a) * 0.25;
      const u0 = 0.357, u1 = 0.643;
      const nx = 0, ny = 1, nz = 0;
      const p = this.vert(-cx, 1, -cz, nx, ny, nz, u0, 0, layer), q = this.vert(cx, 1, cz, nx, ny, nz, u1, 0, layer);
      const r = this.vert(cx, 0, cz, nx, ny, nz, u1, 1, layer), s = this.vert(-cx, 0, -cz, nx, ny, nz, u0, 1, layer);
      this.quad(p, q, r, s);
    }
  }
}

function pineMeshes(pine, far, bark) {
  const m = new Mesh();
  const lods = [];
  const mark = () => m.i.length;
  let from = mark();
  // Close: a dozen and more whorls of boughs, each flat and on edge.
  m.trunk(10, 4, bark);
  {
    const R = rng(11);
    const whorls = 15;
    for (let w = 0; w < whorls; w++) {
      const t = w / (whorls - 1), y = SKIRT_FROM + (0.985 - SKIRT_FROM) * t;
      const n = Math.round(6 - 2 * t);
      const turn = R() * 6.28;
      for (let b = 0; b < n; b++) {
        const ang = turn + (b + (R() - 0.5) * 0.5) / n * Math.PI * 2;
        const len = reach(y + (R() - 0.5) * 0.03) * (0.82 + 0.3 * R());
        const wide = Math.max(0.012, len * 0.4);
        const droop = -len * (0.62 - 0.5 * t + (R() - 0.5) * 0.18);
        m.bough(y, ang, len, wide, droop, 2, pine);
        m.blade(y + droop * 0.32, ang, len, wide * 0.72, droop * 0.65, pine);
      }
    }
  }
  lods.push({ first: from, count: mark() - from });
  from = mark();
  // Further: fewer and bigger, tilted right down, so that from the side they make a tier of skirts.
  m.trunk(5, 1, bark);
  {
    const R = rng(23);
    const whorls = 11;
    for (let w = 0; w < whorls; w++) {
      const t = w / (whorls - 1), y = SKIRT_FROM + 0.05 + (0.97 - SKIRT_FROM - 0.05) * t;
      const n = 4;
      const turn = R() * 6.28;
      for (let b = 0; b < n; b++) {
        const ang = turn + b / n * Math.PI * 2;
        const len = reach(y) * 1.12;
        m.bough(y, ang, len, len * 0.72, -len * 0.82, 1, pine);
      }
    }
  }
  lods.push({ first: from, count: mark() - from });
  from = mark();
  m.crossed(far);
  lods.push({ first: from, count: mark() - from });
  const buf = new ArrayBuffer(m.n * 36);
  const f = new Float32Array(buf), u = new Uint32Array(buf);
  for (let i = 0; i < m.n; i++) {
    for (let k = 0; k < 8; k++) f[i * 9 + k] = m.v[i * 9 + k];
    u[i * 9 + 8] = m.v[i * 9 + 8];
  }
  return { verts: f, idx: new Uint32Array(m.i), lods };
}

// The static shader, with the tree's height, place and turn on every vertex, and each tree its own darkness, darker toward the trunk and the ground.
const PINE = STATIC
  .replace('@location(4) viewZ: f32,', '@location(4) viewZ: f32, @location(5) tone: f32,')
  .replace(`@location(3) layer: u32) -> V {
  var o: V;
  var p = pIn;`, `@location(3) layer: u32, @location(5) at: vec4f, @location(6) spin: vec4f) -> V {
  var o: V;
  let w = pIn.xz * spin.z * at.w;
  var p = vec3f(w.x * spin.x - w.y * spin.y, pIn.y * at.w, w.x * spin.y + w.y * spin.x) + at.xyz;
  let nw = vec3f(n.x * spin.x - n.z * spin.y, n.y, n.x * spin.y + n.z * spin.x);
  o.tone = spin.w * 1.8 * mix(0.5, 1.05, clamp(pIn.y * 1.5, 0.0, 1.0)) * mix(0.62, 1.1, clamp(length(pIn.xz) / max(0.012, 0.22 * (1.0 - pIn.y)), 0.0, 1.0));`)
  // Each tree its own bark and needles, of the five, from where it stands.
  .replace('o.p = p; o.n = n; o.uv = uv; o.layer = layer;', `o.p = p; o.n = nw; o.uv = uv; o.layer = layer;
  let which = u32(fract(sin(dot(at.xz, vec2f(12.9898, 78.233))) * 43758.5453) * 5.0);
  if (which > 0u && layer == PINE_LAYERu) { o.layer = PINE_2u + which - 1u; }
  if (which > 0u && layer == BARK_LAYERu) { o.layer = BARK_2u + which - 1u; }`)
  .replace('albedo = tex.rgb;\n    rough = det.b;', 'albedo = tex.rgb * in.tone;\n    rough = det.b;')
  // (The smaller a painting's copy, the more its needles have faded into the gaps between them. Kept, the trees stay as thick from far off.)
  .replace('if (params.x > 0.0 && tex.a < 0.5) { discard; }', 'if (tex.a < mix(0.5, 0.14, smoothstep(14.0, 90.0, dist))) { discard; }');

const SHADOW_PINE = SHADOW + /* wgsl */ `
@vertex fn vsPine(@location(0) pIn: vec3f, @location(2) uv: vec2f, @location(3) layer: u32, @location(5) at: vec4f, @location(6) spin: vec4f) -> VC {
  var o: VC;
  let w = pIn.xz * spin.z * at.w;
  o.pos = U_.m * vec4f(vec3f(w.x * spin.x - w.y * spin.y, pIn.y * at.w, w.x * spin.y + w.y * spin.x) + at.xyz, 1.0);
  o.uv = uv; o.layer = layer;
  return o;
}
`;

const INSTANCE = { arrayStride: FLOATS * 4, stepMode: 'instance', attributes: [{ shaderLocation: 5, offset: 0, format: 'float32x4' }, { shaderLocation: 6, offset: 16, format: 'float32x4' }] };

export class Pines {
  constructor(r, trees, layerNames) {
    this.r = r;
    const { device, tier } = r;
    this.lean = !!tier.lean;
    this.names = layerNames;
    const { verts, idx, lods } = pineMeshes(layerNames.indexOf('pine'), layerNames.indexOf('pine_far'), layerNames.indexOf('pine_bark'));
    this.VB = makeBuffer(device, verts, GPUBufferUsage.VERTEX);
    this.IB = makeBuffer(device, idx, GPUBufferUsage.INDEX);
    this.lods = lods;
    r.stats.pineTris = [lods[0].count / 3, lods[1].count / 3, lods[2].count / 3];
    // Sorted into chunks, so a chunk's trees are one run to copy.
    const n = trees.length / FLOATS;
    const byChunk = new Map();
    for (let i = 0; i < n; i++) {
      const k = `${Math.floor(trees[i * FLOATS] / CHUNK)},${Math.floor(trees[i * FLOATS + 2] / CHUNK)}`;
      if (!byChunk.has(k)) byChunk.set(k, []);
      byChunk.get(k).push(i);
    }
    this.data = new Float32Array(trees.length);
    this.chunks = [];
    let o = 0;
    for (const [k, list] of byChunk) {
      const [cx, cz] = k.split(',').map(Number);
      const start = o;
      for (const i of list) { this.data.set(trees.subarray(i * FLOATS, (i + 1) * FLOATS), o * FLOATS); o++; }
      this.chunks.push({ x: (cx + 0.5) * CHUNK, z: (cz + 0.5) * CHUNK, a: start * FLOATS, b: o * FLOATS, n: list.length });
    }
    // On a phone the near mesh goes, and the far ones stop at where the haze has them anyway.
    this.near = NEAR; this.mid = MID; this.far = tier.lean ? 420 : 1e9;
    this.lists = [64, 2048, n].map((max, i) => {
      const cap = Math.min(max * 4, n);
      return { buf: device.createBuffer({ size: Math.max(1, cap) * FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST }), cpu: new Float32Array(cap * FLOATS), cap, count: 0, lod: i };
    });
    this.lastX = 1e9; this.lastZ = 1e9; this.lastFx = 0; this.lastFz = 0;
  }

  buildPipelines(layout, targets, depth, ms, staticVB, shDepth, bglShadow, bglShCut) {
    const { r } = this;
    const { device } = r;
    const at = (n) => `${this.names.indexOf(n)}u`;
    const mod = r.shader(PINE.replace('PINE_LAYERu', at('pine')).replace('PINE_2u', at('pine_2')).replace('BARK_LAYERu', at('pine_bark')).replace('BARK_2u', at('pine_bark_2')));
    const buffers = [...staticVB, INSTANCE];
    this.pMain = device.createRenderPipeline({
      layout: layout(r.bgl0, r.bglStatic),
      vertex: { module: mod, entryPoint: 'vs', buffers },
      fragment: { module: mod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const sh = device.createShaderModule({ code: SHADOW_PINE });
    this.pShadow = device.createRenderPipeline({
      layout: layout(bglShadow, bglShCut),
      vertex: { module: sh, entryPoint: 'vsPine', buffers },
      fragment: { module: sh, entryPoint: 'fsCut', targets: [] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
  }

  // What's near what, again, if the camera's gone anywhere or turned far enough.
  update(cam, aspect, tanHalf) {
    const moved = Math.hypot(cam.x - this.lastX, cam.z - this.lastZ) > 2;
    const fl = Math.hypot(cam.fx, cam.fz) || 1, fx = cam.fx / fl, fz = cam.fz / fl;
    if (!moved && fx * this.lastFx + fz * this.lastFz > 0.992) return;
    this.lastX = cam.x; this.lastZ = cam.z; this.lastFx = fx; this.lastFz = fz;
    const [L0, L1, L2] = this.lists;
    L0.count = L1.count = L2.count = 0;
    const halfAngle = Math.atan(tanHalf * aspect) + 0.2;
    const steep = Math.abs(cam.fy) > 0.5;
    const put = (L, c) => {
      if (L.count + c.n > L.cap) return;
      L.cpu.set(this.data.subarray(c.a, c.b), L.count * FLOATS);
      L.count += c.n;
    };
    for (const c of this.chunks) {
      const dx = c.x - cam.x, dz = c.z - cam.z, d = Math.hypot(dx, dz);
      if (d > this.far) continue;
      if (d < this.near && !this.lean) { put(L0, c); continue; }
      if (d < this.mid) { put(L1, c); continue; }
      // (The near two throw shadows behind you. These throw none, so only what's in view goes.)
      if (!steep) {
        const off = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
        if (off > halfAngle + Math.asin(Math.min(1, 24 / d))) continue;
      }
      put(L2, c);
    }
    const q = this.r.device.queue;
    for (const L of this.lists) if (L.count) q.writeBuffer(L.buf, 0, L.cpu, 0, L.count * FLOATS);
  }

  draw(mp) {
    mp.setPipeline(this.pMain);
    mp.setVertexBuffer(0, this.VB);
    mp.setIndexBuffer(this.IB, 'uint32');
    for (const L of this.lists) {
      if (!L.count) continue;
      mp.setVertexBuffer(1, L.buf);
      mp.drawIndexed(this.lods[L.lod].count, L.count, this.lods[L.lod].first);
    }
  }

  // The near cascades take the full trees that fall in them; the last takes the next ring as well. (On a phone, only that ring, in the last.)
  drawShadow(sp, c, last, cutBG) {
    if (this.lean && !last) return;
    sp.setPipeline(this.pShadow);
    sp.setBindGroup(1, cutBG);
    sp.setVertexBuffer(0, this.VB);
    sp.setIndexBuffer(this.IB, 'uint32');
    const lists = last ? this.lists.slice(0, 2) : this.lists.slice(0, 1);
    for (const L of lists) {
      if (!L.count) continue;
      sp.setVertexBuffer(1, L.buf);
      sp.drawIndexed(this.lods[L.lod].count, L.count, this.lods[L.lod].first);
    }
  }
}
