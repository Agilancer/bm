// The Tripo monsters on the render thread. Their slots in this.chars (after the town knights) hold whichever monster the sim has
// stood there: the snapshot says which model (C.MODEL) and which palette (C.PAL), and when that changes the slot is rebuilt.
// Until its body is ready a slot is a placeholder that draws nothing. A model's mesh is made once and shared by every slot that
// wears it; its colour map is baked once per palette (palettes.json, the bestiary's own sums). What no slot is wearing is let go.
import { accessor, imageBytes, parseGLB } from '../core/glb.js';
import { C, C_HERO, C_SIZE, CHARS_START } from '../core/layout.js';
import { ARMS, TRIPO_BASE, armIds } from '../core/tripo-monsters.js';
import { makeBuffer, mipCountFor } from './gpu.js';

const KEEP_MODELS = 10;
const KEEP_SKINS = 12;
const placeholder = () => ({ pending: true, seen: false, casts: false, inCascade: false, far: false });
// How far down the shaft the fist closes, as a share of the weapon's length (the bestiary's GRIP).
const GRIP = { staff: 0.42, sword: 0.1, dagger: 0.14, axe: 0.18, mace: 0.18, spear: 0.42, lance: 0.3, great_axe: 0.3, great_mace: 0.3, bow: 0.5, boomerang: 0.5 };
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
const qrot = (q, v) => {
  const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];

// Each hand's frame at rest, in the hand bone's own units (the bestiary's arm(): fingers, across the knuckles, and the palm's normal).
function handFrames(glb) {
  const nodes = glb.json.nodes, world = new Array(nodes.length);
  const visit = (i, pq, pt) => {
    const n = nodes[i], q = qmul(pq, n.rotation || [0, 0, 0, 1]), t = v3.add(pt, qrot(pq, n.translation || [0, 0, 0]));
    world[i] = { q, t };
    for (const c of n.children || []) visit(c, q, t);
  };
  for (const r of glb.json.scenes[0].nodes) visit(r, [0, 0, 0, 1], [0, 0, 0]);
  const bones = {};
  glb.json.skins[0].joints.forEach((j) => { const k = (nodes[j].name || '').replace(/^.*?(Left|Right)/, '$1'); if (bones[k] === undefined) bones[k] = j; });
  const frame = (side) => {
    const hb = bones[side + 'Hand'], m = bones[side + 'HandMiddle1'], ix = bones[side + 'HandIndex1'], pk = bones[side + 'HandPinky1'];
    if ([hb, m, ix, pk].some((b) => b === undefined)) return null;
    const W = world[hb], inv = [-W.q[0], -W.q[1], -W.q[2], W.q[3]];
    const loc = (b) => qrot(inv, v3.sub(world[b].t, W.t));
    const mid = loc(m), f = v3.norm(mid);
    let a = v3.sub(loc(ix), loc(pk));
    a = v3.norm(v3.add(a, f, -v3.dot(a, f)));
    return { mid, f, a, n: v3.cross(f, a) };
  };
  return { Right: frame('Right'), Left: frame('Left') };
}

// The palette bake runs in a worker of its own: a 4096 map takes most of a second, which would be a hitch here.
let baker = null, bakeId = 0;
const bakes = new Map();
function bakeOff(blob, scale, pal) {
  if (!baker) {
    baker = new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' });
    baker.onmessage = (e) => { const b = bakes.get(e.data.id); bakes.delete(e.data.id); if (e.data.error) b.no(new Error(e.data.error)); else b.ok(e.data.bmp); };
  }
  return new Promise((ok, no) => { const id = ++bakeId; bakes.set(id, { ok, no }); baker.postMessage({ id, blob, scale, pal }); });
}

export class TripoSlots {
  constructor(r, base, roster, palettes, first, count) {
    this.r = r; this.base = base; this.roster = roster;
    this.ids = Object.keys(roster);
    this.palettes = Object.values(palettes);
    this.first = first; this.count = count;
    this.models = new Map();   // id -> Promise of { base, nrm, mr, glb, albSrc }, newest last
    this.skins = new Map();    // 'id:pal' -> Promise of an albedo texture, newest last
    this.want = new Array(count).fill(0);
    this.arms = armIds(roster);
    this.props = new Map();    // 'model:weapon:side' -> Promise of a prop, its grip baked in
    this.weapons = fetch(`${base}assets/game/weapons/weapons.json`).then((res) => res.json());
    for (let i = 0; i < count; i++) r.chars.push(placeholder());
  }

  // Two props a slot, after everyone else's (Renderer.load, before the prop instance buffer is made): the right hand's, the left's.
  reserveProps() {
    const r = this.r;
    this.propBase = r.props.length;
    for (let i = 0; i < this.count; i++) r.props.push({ empty: true, owner: this.first + i }, { empty: true, owner: this.first + i });
  }

  // Each frame, before the bodies are culled: any slot whose monster has changed starts on its new one.
  sync(snap) {
    const r = this.r;
    for (let i = 0; i < this.count; i++) {
      const co = CHARS_START + (this.first + i) * C_SIZE;
      if (snap[co + C.ACTIVE] < 0.5) continue;
      const model = snap[co + C.MODEL] | 0, pal = snap[co + C.PAL] | 0;
      if (!model) continue;
      const armR = snap[co + C_HERO + ARMS.RIGHT] | 0, armL = snap[co + C_HERO + ARMS.LEFT] | 0;
      const key = `${model}:${pal}:${armR}:${armL}`;
      if (this.want[i] === key) continue;
      this.want[i] = key;
      this.free(r.chars[this.first + i]);
      r.chars[this.first + i] = placeholder();
      const pb = this.propBase + i * 2;
      r.props[pb] = { empty: true, owner: this.first + i }; r.props[pb + 1] = { empty: true, owner: this.first + i };
      this.instance(this.ids[model - 1], pal, armR, armL).then(([ch, right, left]) => {
        if (this.want[i] !== key) { this.free(ch); return; }
        ch.propBase = pb; ch.propCount = 2;
        r.props[pb] = right ? { ...right, owner: this.first + i } : { empty: true, owner: this.first + i };
        r.props[pb + 1] = left ? { ...left, owner: this.first + i } : { empty: true, owner: this.first + i };
        r.chars[this.first + i] = ch;
        r.gashVersions[this.first + i] = -1;
      }).catch((e) => console.error('tripo slot', this.ids[model - 1], e));
    }
  }

  model(id) {
    let m = this.models.get(id);
    if (m) { this.models.delete(id); this.models.set(id, m); return m; }
    const r = this.r;
    m = fetch(`${this.base}${TRIPO_BASE}${id}.glb`).then((res) => {
      if (!res.ok) throw new Error(`${id}: ${res.status}`);
      return res.arrayBuffer();
    }).then(async (buf) => {
      const glb = parseGLB(buf), meta = this.roster[id];
      const pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
      const acc = glb.json.accessors[a.POSITION];
      const scale = meta.height / (meta.rigTop || (acc.max[1] - acc.min[1]));
      const pos = accessor(glb, a.POSITION).slice();
      for (let i = 0; i < pos.length; i++) pos[i] *= scale;
      const prim = { pos, nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices), joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0) };
      const base = r.makeSkinned([prim], glb.json.skins[0].joints.length);
      r.addLod(base, prim, 0.14);
      const mat = glb.json.materials[pr.material ?? 0];
      const srcOf = (t) => glb.json.textures[t.index].source;
      const ts = r.tier.texScale;
      const [nrm, mr] = await Promise.all([
        r.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', ts),
        r.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', ts),
      ]);
      return { id, glb, base, nrm, mr, scale, hands: handFrames(glb), albSrc: srcOf(mat.pbrMetallicRoughness.baseColorTexture) };
    });
    this.models.set(id, m);
    this.trim(this.models, KEEP_MODELS, (k) => this.inUse((key) => this.ids[key.split(':')[0] - 1] === k), (v) => {
      v.base.srcBuf.destroy(); v.base.IB.destroy(); v.base.sideVB.destroy(); v.nrm.destroy(); v.mr.destroy();
      if (v.base.lodIB !== v.base.IB) v.base.lodIB.destroy();
    });
    return m;
  }

  skin(m, id, pal) {
    const key = `${id}:${pal}`;
    let s = this.skins.get(key);
    if (s) { this.skins.delete(key); this.skins.set(key, s); return s; }
    const r = this.r, p = this.palettes[pal] || {};
    const plain = !p.hue && (p.sat ?? 1) === 1 && (p.val ?? 1) === 1 && !p.tamt;
    s = plain ? r.imageTexture(m.glb, m.albSrc, 'rgba8unorm-srgb', r.tier.texScale) : (async () => {
      const cv = await bakeOff(imageBytes(m.glb, m.albSrc), r.tier.texScale, p);
      const fmt = 'rgba8unorm-srgb', mips = mipCountFor(cv.width, cv.height);
      const tex = r.device.createTexture({ size: [cv.width, cv.height], format: fmt, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      r.device.queue.copyExternalImageToTexture({ source: cv }, { texture: tex, premultipliedAlpha: false }, [cv.width, cv.height]);
      cv.close();
      const enc = r.device.createCommandEncoder();
      r.mip.generate(tex, fmt, 1, mips, enc);
      r.device.queue.submit([enc.finish()]);
      return tex;
    })();
    this.skins.set(key, s);
    this.trim(this.skins, KEEP_SKINS, (k) => this.inUse((wk) => { const [mo, pa] = wk.split(':'); return `${this.ids[mo - 1]}:${pa}` === k; }), (t) => t.destroy());
    return s;
  }

  // A body's own buffers (the mesh and maps are shared, and kept).
  free(ch) {
    if (!ch?.tripo) return;
    for (const b of [ch.outBuf, ch.palette, ch.params, ch.ubo]) b.destroy();
  }

  // A weapon (right) or a shield (left) as the bestiary holds it, baked into the hand bone's frame: the sim moves it by the hand alone.
  prop(m, armIndex, left) {
    const id = this.arms[armIndex - 1], key = `${m.id}:${id}:${left ? 'L' : 'R'}`;
    let p = this.props.get(key);
    if (p) return p;
    const r = this.r, fr = m.hands[left ? 'Left' : 'Right'];
    if (!id || !fr) return Promise.resolve(null);
    p = this.weapons.then(async (W) => {
      const w = W[id];
      const glb = parseGLB(await fetch(this.base + (w ? w.file : `assets/game/items/${id}.glb`)).then((res) => res.arrayBuffer()));
      const pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
      const pos = accessor(glb, a.POSITION), nrm = accessor(glb, a.NORMAL), uv = accessor(glb, a.TEXCOORD_0), idx = accessor(glb, pr.indices);
      // A staff that isn't in the weapons list is stood 1.7 m tall with its foot at the origin, as the bestiary does.
      let kind = w?.kind || 'staff', size = w?.size, k0 = 1, y0 = 0;
      if (!w) {
        const acc = glb.json.accessors[a.POSITION];
        k0 = 1.7 / (acc.max[1] - acc.min[1]); y0 = -acc.min[1] * k0;
        size = [(acc.max[0] - acc.min[0]) * k0, 1.7, (acc.max[2] - acc.min[2]) * k0];
      }
      const meta = this.roster[m.id], S = m.scale, sw = meta.height / 1.8 / S;
      let X, Y, Z, P;
      if (!left) {
        X = v3.mul(fr.f, -1); Y = fr.a; Z = v3.cross(X, Y);
        P = v3.add(v3.add(v3.mul(fr.mid, 0.55), fr.n, -0.25 * Math.hypot(fr.mid[0], fr.mid[1], fr.mid[2])), Y, -(GRIP[kind] ?? 0.15) * size[1] * sw);
      } else {
        Z = v3.norm(v3.add(fr.n, fr.a, 0.55)); Y = v3.norm(v3.add(v3.mul(fr.f, -0.8), fr.a, 0.6)); X = v3.norm(v3.cross(Y, Z)); Y = v3.cross(Z, X);
        P = v3.add(v3.mul(fr.mid, 0.1), Z, 0.05 * sw);
      }
      const n = pos.length / 3, v = new Float32Array(n * 8);
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3] * k0 * sw, y = (pos[i * 3 + 1] * k0 + y0) * sw, z = pos[i * 3 + 2] * k0 * sw;
        v[i * 8] = (X[0] * x + Y[0] * y + Z[0] * z + P[0]) * S;
        v[i * 8 + 1] = (X[1] * x + Y[1] * y + Z[1] * z + P[1]) * S;
        v[i * 8 + 2] = (X[2] * x + Y[2] * y + Z[2] * z + P[2]) * S;
        const nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
        v[i * 8 + 3] = X[0] * nx + Y[0] * ny + Z[0] * nz; v[i * 8 + 4] = X[1] * nx + Y[1] * ny + Z[1] * nz; v[i * 8 + 5] = X[2] * nx + Y[2] * ny + Z[2] * nz;
        v[i * 8 + 6] = uv[i * 2]; v[i * 8 + 7] = uv[i * 2 + 1];
      }
      const indices = new Uint32Array(idx);
      const mat = glb.json.materials[pr.material ?? 0];
      const tex = await r.imageTexture(glb, glb.json.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source, 'rgba8unorm-srgb', r.tier.texScale);
      const ubo = r.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bg = r.device.createBindGroup({ layout: r.bglProp, entries: [{ binding: 0, resource: tex.createView() }, { binding: 1, resource: { buffer: ubo } }] });
      return { VB: makeBuffer(r.device, v, GPUBufferUsage.VERTEX), IB: makeBuffer(r.device, indices, GPUBufferUsage.INDEX), count: indices.length, bg, ubo };
    }).catch((e) => { console.error('tripo arm', id, e); return null; });
    this.props.set(key, p);
    return p;
  }

  inUse(match) { return this.want.some((k) => k && match(k)); }

  // Past the cap, the oldest that no slot wants goes.
  trim(map, keep, used, free) {
    for (const [k, v] of map) {
      if (map.size <= keep) break;
      if (used(k)) continue;
      map.delete(k);
      v.then(free).catch(() => {});
    }
  }

  async instance(id, pal, armR, armL) {
    const r = this.r;
    const m = await this.model(id);
    const [alb, right, left] = await Promise.all([this.skin(m, id, pal), armR ? this.prop(m, armR, false) : null, armL ? this.prop(m, armL, true) : null]);
    const sk = r.cloneSkinned(m.base);
    const size = 24 * 64 + 256 + 16;
    const ubo = r.device.createBuffer({ size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const matBG = r.device.createBindGroup({ layout: r.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: m.nrm.createView() }, { binding: 3, resource: m.mr.createView() },
    ] });
    return [{ ...sk, ubo, matBG, gashData: new Float32Array(size / 4), flesh: 1, tripo: id }, right, left];
  }
}
