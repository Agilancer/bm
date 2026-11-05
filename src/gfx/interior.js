// The cathedral and the catacombs: their own geometry and their own texture arrays, since their tiles are small and square where
// the village's are big and painted. Drawn only from where they can be seen, and the world outside isn't drawn from below.
import { accessor, parseGLB } from '../core/glb.js';
import { setFloors } from '../core/interior.js';
import { makeBuffer, textureArrayFromBitmaps } from './gpu.js';
import { COMMON } from './shaders.js';

const FLAT = { iron: 100, flame: 101, gold: 105 };
const POM = { stone: 0.018, wood: 0.004 };

// Window light on the floor, dust in its shafts, firelight on the walls: added to what's there, drawn after it.
const GLOW = COMMON + /* wgsl */ `
@group(1) @binding(0) var colorArr: texture_2d_array<f32>;
struct G { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) tint: vec3f, @location(2) @interpolate(flat) layer: f32, @location(3) viewZ: f32 };
@vertex fn vs(@location(0) p: vec3f, @location(1) uv: vec2f, @location(2) tint: vec3f, @location(3) layer: f32) -> G {
  var o: G;
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.uv = uv; o.tint = tint; o.layer = layer; o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  return o;
}
struct GO { @location(0) color: vec4f, @location(1) depth: f32 };
@fragment fn fs(in: G) -> GO {
  var c: vec3f;
  let t = textureSample(colorArr, repeatSmp, in.uv, i32(min(in.layer, 13.0)));
  if (in.layer < 99.5) {
    c = t.rgb * t.rgb * t.a * in.tint;
  } else if (in.layer < 100.5) {
    let e = 1.0 - abs(in.uv.x * 2.0 - 1.0);
    c = in.tint * smoothstep(0.0, 0.4, e) * (0.25 + 0.75 * in.uv.y);
  } else {
    let d = length(in.uv * 2.0 - 1.0);
    let f = max(1.0 - d, 0.0);
    c = in.tint * f * f;
  }
  var o: GO;
  o.color = vec4f(c, 0.0);
  o.depth = in.viewZ;
  return o;
}`;

function makeSet(r, glb, nodes, layerNames) {
  const prims = [];
  for (const n of nodes) {
    const [zone, name] = n.name.split('|');
    if (!(name in FLAT) && !layerNames.includes(name)) continue;
    for (const pr of glb.json.meshes[n.mesh].primitives) {
      prims.push({ zone, layer: FLAT[name] ?? layerNames.indexOf(name), pos: accessor(glb, pr.attributes.POSITION), nrm: accessor(glb, pr.attributes.NORMAL), uv: accessor(glb, pr.attributes.TEXCOORD_0), idx: accessor(glb, pr.indices) });
    }
  }
  prims.sort((a, b) => (a.zone > b.zone ? 1 : a.zone < b.zone ? -1 : 0));   // cath, then deep
  let nv = 0, ni = 0;
  for (const p of prims) { nv += p.pos.length / 3; ni += p.idx.length; }
  const verts = new ArrayBuffer(nv * 36);
  const f = new Float32Array(verts), u = new Uint32Array(verts);
  const indices = new Uint32Array(ni);
  let vo = 0, io = 0, deepAt = -1;
  for (const p of prims) {
    if (p.zone === 'deep' && deepAt < 0) deepAt = io;
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
  if (deepAt < 0) deepAt = ni;
  return { VB: makeBuffer(r.device, new Float32Array(verts), GPUBufferUsage.VERTEX), IB: makeBuffer(r.device, indices, GPUBufferUsage.INDEX), cath: deepAt, deep: ni - deepAt };
}

export async function loadInterior(r, base, pool, tier) {
  const dir = `${base}assets/game/interior/`;
  const [man, data, glbBuf] = await Promise.all([
    fetch(`${dir}manifest.json`).then((x) => x.json()), fetch(`${dir}interior.json`).then((x) => x.json()), fetch(`${dir}interior.glb`).then((x) => x.arrayBuffer()),
  ]);
  setFloors(data.floors);
  const scale = tier.texScale;
  const load = async (names, cs, ds) => {
    const px = (s) => Math.max(64, Math.round(s * scale));
    const decode = (n, s) => pool.run('decode', { url: `${dir}${n}.webp`, ...(scale !== 1 ? { width: px(s), height: px(s) } : {}) });
    const [c, d] = await Promise.all([Promise.all(names.map((n) => decode(`${n}_c`, cs))), Promise.all(names.map((n) => decode(`${n}_d`, ds)))]);
    return [textureArrayFromBitmaps(r.device, r.mip, c, 'rgba8unorm-srgb'), textureArrayFromBitmaps(r.device, r.mip, d, 'rgba8unorm')];
  };
  const tileNames = man.layers.map((l) => l.name), atlasNames = man.atlases.map((l) => l.name);
  const [[tc, td], [ac, ad]] = await Promise.all([load(tileNames, man.tile[0], man.tile[1]), load(atlasNames, man.atlas[0], man.atlas[1])]);

  const glb = parseGLB(glbBuf);
  const nodes = glb.json.nodes.filter((n) => n.mesh !== undefined && n.name.includes('|'));
  const uniform = (fill) => { const p = new Float32Array(48 * 4); fill(p); return makeBuffer(r.device, p, GPUBufferUsage.UNIFORM); };
  const bindGroup = (c, d, ubo) => r.device.createBindGroup({ layout: r.bglStatic, entries: [
    { binding: 0, resource: c.createView({ dimension: '2d-array' }) }, { binding: 1, resource: d.createView({ dimension: '2d-array' }) }, { binding: 2, resource: { buffer: ubo } }] });
  const pom = tier.pom > 0 ? 1 : 0;
  const tiles = makeSet(r, glb, nodes, tileNames);
  tiles.bg = bindGroup(tc, td, uniform((p) => man.layers.forEach((l, i) => { p[i * 4 + 1] = pom * (POM[l.kind] || 0); })));
  const atlas = makeSet(r, glb, nodes, atlasNames);
  atlas.bg = bindGroup(ac, ad, uniform((p) => man.atlases.forEach((l, i) => { p[i * 4] = 1; p[i * 4 + 2] = l.kind === 'glass' ? (l.rose ? 4 : 2) : 0; })));
  return { data, tiles, atlas, glowVB: makeBuffer(r.device, new Float32Array(data.glow), GPUBufferUsage.VERTEX), glowN: data.glow.length / 9 };
}

export function buildGlowPipeline(r, module, layout, depthFormat, multisample) {
  const mod = module(GLOW);
  const blend = { color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' } };
  const targets = r.worldTargets.map((t, i) => (i === 0 ? { format: t.format, blend } : { format: t.format, writeMask: 0 }));
  return r.device.createRenderPipeline({
    layout: layout(r.bgl0, r.bglStatic),
    vertex: { module: mod, entryPoint: 'vs', buffers: [{ arrayStride: 36, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x2' },
      { shaderLocation: 2, offset: 20, format: 'float32x3' }, { shaderLocation: 3, offset: 32, format: 'float32' }] }] },
    fragment: { module: mod, entryPoint: 'fs', targets },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare: 'greater' }, multisample,
  });
}

// Where the camera is decides what's worth drawing. A wall can't be seen through, so it's simple.
export function visibility(f0, cam) {
  const deep = cam.x >= 124.5 && cam.y < f0 + 6.5;
  const hall = cam.x > 66 && cam.x < 124.5 && Math.abs(cam.z) < 14;
  return { deep, hall, cath: !deep || cam.x < 160, below: deep || (hall && cam.x > 100) };
}

export function drawOpaque(r, mp, it, vis) {
  mp.setPipeline(r.pStatic);
  mp.setBindGroup(1, it.tiles.bg);
  mp.setVertexBuffer(0, it.tiles.VB);
  mp.setIndexBuffer(it.tiles.IB, 'uint32');
  if (vis.cath) mp.drawIndexed(it.tiles.cath);
  if (vis.below) mp.drawIndexed(it.tiles.deep, 1, it.tiles.cath);
  mp.setPipeline(r.pStaticCut);
  mp.setBindGroup(1, it.atlas.bg);
  mp.setVertexBuffer(0, it.atlas.VB);
  mp.setIndexBuffer(it.atlas.IB, 'uint32');
  if (vis.cath) mp.drawIndexed(it.atlas.cath);
  if (vis.below) mp.drawIndexed(it.atlas.deep, 1, it.atlas.cath);
}

export function drawGlow(r, mp, it) {
  mp.setPipeline(r.pGlow);
  mp.setBindGroup(1, it.atlas.bg);
  mp.setVertexBuffer(0, it.glowVB);
  mp.draw(it.glowN);
}
