// The cathedral and the catacombs: their own geometry and their own texture arrays, since their tiles are small and square where
import { inDungeon } from '../core/dungeon.js';
import { inHall } from '../core/testhall.js';
// the village's are big and painted. Drawn only from where they can be seen, and the world outside isn't drawn from below.
import { inSexton, toChurch } from '../core/church.js';
import { accessor, parseGLB } from '../core/glb.js';
import { getFile, watched } from '../core/files.js';
import { setFloors } from '../core/interior.js';
import { makeBuffer, loadTextureArray } from './gpu.js';
import { COMMON } from './shaders.js';

const FLAT = { iron: 100, flame: 101, gold: 105 };
const POM = { stone: 0.018, wood: 0.004 };

// Window light on the floor, dust in its shafts, firelight on the walls: added to what's there, drawn after it.
const GLOW = COMMON + /* wgsl */ `
@group(1) @binding(0) var colorArr: texture_2d_array<f32>;
struct G { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) tint: vec3f, @location(2) @interpolate(flat) layer: f32, @location(3) viewZ: f32 };
@vertex fn vs(@location(0) p0: vec3f, @location(1) uv0: vec2f, @location(2) tint: vec3f, @location(3) layer: f32) -> G {
  var o: G;
  var p = p0; var uv = uv0;
  if (layer > 103.5) {
    // A delve's fires (src/core/delve-build.js fire(), src/gfx/renderer.js): all four corners at the one point, and uv says
    // how far out each goes. A flame turns about its own upright to face you; a glow faces you whole. A wisp bobs.
    let toC = F.camPos.xyz - p;
    let right = normalize(vec3f(toC.z, 0.0, -toC.x) + vec3f(1e-5, 0.0, 0.0));
    let seed = fract(layer) * 2.0;
    if (layer > 105.5) { p.y += sin(F.camPos.w * 1.1 + seed * 40.0) * 0.09; p += right * sin(F.camPos.w * 0.7 + seed * 23.0) * 0.05; }
    if (layer > 104.5 && layer < 105.5) {
      let up = normalize(cross(right, toC));
      p += right * uv.x + up * uv.y;
      uv = vec2f(sign(uv.x), sign(uv.y)) * 0.5 + 0.5;
    } else {
      // (Leaning with the draught, more at the tip.)
      let lean = (1.0 - uv.y) * abs(uv.x) * 0.5 * sin(F.camPos.w * 2.3 + seed * 31.0);
      p += right * (uv.x + lean);
      uv = vec2f(sign(uv.x) * 0.5 + 0.5, uv.y);
    }
  }
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.uv = uv; o.tint = tint; o.layer = layer; o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  return o;
}
struct GO { @location(0) color: vec4f, @location(1) depth: f32 };
@fragment fn fs(in: G) -> GO {
  var c: vec3f;
  let t = textureSample(colorArr, repeatSmp, in.uv, i32(clamp(in.layer, 0.0, 13.0)));
  if (in.layer < 99.5) {
    c = t.rgb * t.rgb * t.a * in.tint * F.sunColor.a;   // (The day behind the window.)
  } else if (in.layer < 100.5) {
    let e = 1.0 - abs(in.uv.x * 2.0 - 1.0);
    c = in.tint * smoothstep(0.0, 0.4, e) * (0.25 + 0.75 * in.uv.y);
  } else if (in.layer > 104.5 && in.layer < 105.5) {
    // The air round a fire, lit: soft, round, gone by its edge.
    let d = length(in.uv * 2.0 - 1.0);
    let f = max(1.0 - d, 0.0);
    let fl = 0.9 + 0.1 * sin(F.camPos.w * 9.0 + in.pos.x * 0.01);
    c = in.tint * f * f * f * f * 0.34 * fl * smoothstep(0.4, 1.6, in.viewZ);
  } else if (in.layer > 103.5) {
    // A delve's flame, in its own colour (tint): the tongue of fire below, with a white heart, its edges the fire's colour
    // gone deep. A wisp (over 105.5) is rounder, and slower.
    let T = F.camPos.w;
    let wisp = in.layer > 105.5;
    let rate = select(1.0, 0.45, wisp);
    let u = in.uv.x * 2.0 - 1.0;
    let v = 1.0 - in.uv.y;
    let seed = fract(in.layer) * 14.0;
    let n1 = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.uv.x * 0.3 + seed, v * 0.4 - T * 0.55 * rate), 0.0).r;
    let n2 = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.uv.x * 0.85 - seed, v * 1.1 - T * 1.25 * rate), 0.0).r;
    let n = n1 * 0.65 + n2 * 0.35;
    let sway = (n1 - 0.5) * 0.6 * v * v;
    // (Fat at the foot, drawn in to a tip; a wisp is widest a third of the way up.)
    let shape = select((1.0 - v) * (1.0 - 0.3 * v) * (0.5 + 0.2 * smoothstep(0.0, 0.12, v)), sqrt(max(v * (1.0 - v), 0.0)) * (1.25 - 0.7 * v), wisp);
    let width = shape * (0.62 + 0.7 * n);
    let edge = width - abs(u - sway);
    let tear = smoothstep(0.95, 0.5, v + (0.5 - n2) * 0.6);
    let body = smoothstep(0.0, 0.2, edge) * tear;
    let core = smoothstep(0.1, 0.42, edge) * smoothstep(0.8, 0.05, v);
    let deep = in.tint * in.tint * vec3f(0.9, 0.6, 0.6);
    // (Deep in its colour at the foot and the edges; the white heart stands a little off the root.)
    let col = mix(deep, in.tint, smoothstep(0.0, 0.28, edge)) * 1.5 * mix(0.55, 1.0, smoothstep(0.0, 0.3, v)) + mix(vec3f(1.0, 0.9, 0.7), in.tint, 0.55) * core * 2.0 * smoothstep(0.03, 0.22, v);
    c = col * body * (0.88 + 0.12 * sin(T * 13.0 + seed * 9.0));
  } else if (in.layer > 102.5) {
    // A tongue of fire on a card: noise climbing it, pinched in toward the tip and torn off at the top, white-gold at the root
    // and deep red at the edges. Three of them, crossed, make a fire (hearth() in tools/interior/build_interior.py). tint.b also
    // seeds it, so no two burn alike.
    let T = F.camPos.w;
    let u = in.uv.x * 2.0 - 1.0;
    let v = 1.0 - in.uv.y;
    let seed = fract(in.tint.b * 97.0) * 7.0;
    let n1 = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.uv.x * 0.32 + seed, v * 0.42 - T * 0.5), 0.0).r;
    let n2 = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.uv.x * 0.9 - seed, v * 1.2 - T * 1.15), 0.0).r;
    let n = n1 * 0.65 + n2 * 0.35;
    let sway = (n1 - 0.5) * 0.55 * v * v;
    let width = (1.0 - v) * (1.0 - 0.35 * v) * (0.55 + 0.75 * n);
    let edge = width - abs(u - sway);
    let tear = smoothstep(0.92, 0.45, v + (0.5 - n2) * 0.65);
    let body = smoothstep(0.0, 0.18, edge) * tear;
    let core = smoothstep(0.12, 0.45, edge) * smoothstep(0.75, 0.1, v);
    let col = mix(vec3f(0.85, 0.16, 0.02), vec3f(1.0, 0.55, 0.12), smoothstep(0.0, 0.3, edge)) + vec3f(1.0, 0.82, 0.45) * core;
    c = in.tint.r * col * body;
  } else if (in.layer > 101.5) {
    // A light well: dust drifting in a soft beam, and nothing at all when you stand in it.
    let e = 1.0 - abs(in.uv.x * 2.0 - 1.0);
    let T = F.camPos.w;
    let dust = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.uv.x * 0.5 + T * 0.006, in.uv.y * 0.9 - T * 0.012), 0.0).r;
    c = in.tint * e * e * (0.3 + 0.7 * in.uv.y) * (0.25 + 1.5 * dust) * smoothstep(1.5, 8.0, in.viewZ);
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

// pictures: the lanes its pictures share with the world's (src/core/files.js lanes); steps: the loading bar's count, to add to and tick.
export async function loadInterior(r, base, pool, tier, pictures, steps) {
  const dir = `${base}assets/game/interior/`;
  steps.add(2);   // (the model, and the pieces built from it)
  const glbFile = getFile(`${dir}interior.glb`).then((b) => { steps.tick(); return b; });
  glbFile.catch(() => {});
  const [man, data] = await Promise.all([getFile(`${dir}manifest.json`, 'json'), getFile(`${dir}interior.json`, 'json')]);
  setFloors(data.floors, data.homes);
  const scale = tier.texScale;
  const tileNames = man.layers.map((l) => l.name), atlasNames = man.atlases.map((l) => l.name);
  steps.add((tileNames.length + atlasNames.length) * 2);
  const px = (s) => Math.max(64, Math.round(s * scale));
  const decode = (n, s) => {
    const url = `${dir}${n}.webp`;
    return watched(url, pool.run('decode', { url, ...(scale !== 1 ? { width: px(s), height: px(s) } : {}) })).then((b) => { steps.tick(); return b; });
  };
  const array = (names, size, kind, format) => loadTextureArray(r.device, r.mip, names, (n) => decode(`${n}_${kind}`, size), format, pictures);
  const [tc, td, ac, ad, glbBuf] = await Promise.all([
    array(tileNames, man.tile[0], 'c', 'rgba8unorm-srgb'), array(tileNames, man.tile[1], 'd', 'rgba8unorm'),
    array(atlasNames, man.atlas[0], 'c', 'rgba8unorm-srgb'), array(atlasNames, man.atlas[1], 'd', 'rgba8unorm'), glbFile,
  ]);

  const glb = parseGLB(glbBuf);
  const nodes = glb.json.nodes.filter((n) => n.mesh !== undefined && n.name.includes('|'));
  const uniform = (fill) => { const p = new Float32Array(64 * 4); fill(p); return makeBuffer(r.device, p, GPUBufferUsage.UNIFORM); };
  const bindGroup = (c, d, ubo) => r.device.createBindGroup({ layout: r.bglStatic, entries: [
    { binding: 0, resource: c.createView({ dimension: '2d-array' }) }, { binding: 1, resource: d.createView({ dimension: '2d-array' }) }, { binding: 2, resource: { buffer: ubo } }] });
  const pom = tier.pom > 0 ? 1 : 0;
  const tiles = makeSet(r, glb, nodes, tileNames);
  tiles.bg = bindGroup(tc, td, uniform((p) => man.layers.forEach((l, i) => { p[i * 4 + 1] = pom * (l.pom || POM[l.kind] || 0); p[i * 4 + 2] = -(l.deep || 0); })));
  const atlas = makeSet(r, glb, nodes, atlasNames);
  atlas.bg = bindGroup(ac, ad, uniform((p) => man.atlases.forEach((l, i) => { p[i * 4] = 1; p[i * 4 + 2] = l.kind === 'glass' ? (l.rose ? 4 : 2) : 0; })));
  // The glow quads, the townsfolk's houses' first (their hearths, candles and windows: drawn wherever you are, since a house is
  // never far) and then the church's (drawn only from inside it: visibility()).
  const G = data.glow, homes = data.homes.filter((h) => h.route), town = [], church = [];
  for (let i = 0; i < G.length; i += 27) {
    const x = G[i], z = G[i + 2];
    (homes.some((h) => x > h.x0 - 1 && x < h.x1 + 1 && z > h.z0 - 1 && z < h.z1 + 1) ? town : church).push(...G.slice(i, i + 27));
  }
  const glowCPU = new Float32Array([...town, ...church]);
  steps.tick();
  return { data, tiles, atlas, glowVB: makeBuffer(r.device, glowCPU, GPUBufferUsage.VERTEX), glowCPU, glowN: G.length / 9, glowTown: town.length / 9 };
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
  // (Down the Hollowfang Warrens, out past the world's edge: only their own rock, which is drawn with the world's places.)
  if (inDungeon(cam.x, cam.z)) return { deep: false, hall: false, world: true, cath: false, below: false, warrens: true };
  // (The Test Dungeon's hall, past the other edge: the same. Its walls are drawn with the world's places too: src/core/testhall.js.)
  if (inHall(cam.x, cam.z)) return { deep: false, hall: false, world: true, cath: false, below: false, warrens: true, testHall: true };
  // (Below is the stair's own passage, or under the land. Behind the church, out in the open, is neither. In the church's own frame: src/core/church.js.)
  const [x, z] = toChurch(cam.x, cam.z);
  // The Sexton's passage, and the ground outside its door, see down into the stair; and from the head of the stair, through the
  // passage and the door, the day outside can be seen. (src/core/church.js SEXTON.)
  const passage = inSexton(x, cam.y, z) || (x > 122 && x < 132 && z > 8.9 && z < 16 && cam.y < f0 + 4);
  const deep = !passage && x >= 124.5 && ((x < 176 && Math.abs(z) < 3 && cam.y < f0 + 6.5) || cam.y < -6);
  const hall = x > 66 && x < 124.5 && Math.abs(z) < 14;
  const world = !deep || (x < 131 && z > -1 && cam.y > f0 - 4.5);
  return { deep, hall, world, cath: !deep || x < 160, below: deep || passage || (hall && x > 100) };
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

// The delves' fires as glow quads (src/core/delve-build.js fire()): one buffer, each delve's a run of it. { VB, runs: { key: [first, count] } }.
const HUES = { 'flame': [1, 0.5, 0.13], 'dark:flame': [1, 0.2, 0.045], 'frost:flame': [0.42, 0.72, 1], 'pale:flame': [0.5, 1, 0.6], 'mire:flame': [0.3, 1, 0.45], 'spore:flame': [0.72, 0.4, 1.25] };
const KINDS = { flame: 104, glow: 105, wisp: 106 };
export function buildDelveFires(r, fires) {
  const by = new Map();
  for (const f of fires) { if (!by.has(f.delve)) by.set(f.delve, []); by.get(f.delve).push(f); }
  const out = new Float32Array(fires.length * 54), runs = {};
  let o = 0;
  for (const [key, list] of by) {
    runs[key] = [o / 9, list.length * 6];
    // (The glows first, so a flame is drawn over its own.)
    list.sort((a, b) => (b.kind === 'glow') - (a.kind === 'glow'));
    for (const f of list) {
      const c = HUES[f.hue] || HUES.flame, layer = KINDS[f.kind] + 0.02 + f.seed * 0.45, g = f.kind === 'glow';
      // (uv: how far out the corner goes, and for a flame 0 at its tip, 1 at its root.)
      const corner = g ? [[-f.w, -f.h, 0], [f.w, -f.h, 0], [f.w, f.h, 0], [-f.w, f.h, 0]] : [[-f.w, 1, 0], [f.w, 1, 0], [f.w, 0, f.h], [-f.w, 0, f.h]];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [u, v, up] = corner[k];
        out[o++] = f.x; out[o++] = f.y + up; out[o++] = f.z; out[o++] = u; out[o++] = v; out[o++] = c[0]; out[o++] = c[1]; out[o++] = c[2]; out[o++] = layer;
      }
    }
  }
  return { VB: makeBuffer(r.device, out, GPUBufferUsage.VERTEX), runs };
}
export function drawDelveFires(r, mp, it, set, key) {
  const run = set?.runs[key];
  if (!run || !it) return;
  mp.setPipeline(r.pGlow);
  mp.setBindGroup(1, it.atlas.bg);
  mp.setVertexBuffer(0, set.VB);
  mp.draw(run[1], 1, run[0]);
}

// all: the church's too; or only the houses'.
export function drawGlow(r, mp, it, all) {
  const n = all ? it.glowN : it.glowTown;
  if (!n) return;
  mp.setPipeline(r.pGlow);
  mp.setBindGroup(1, it.atlas.bg);
  mp.setVertexBuffer(0, it.glowVB);
  mp.draw(n);
}

