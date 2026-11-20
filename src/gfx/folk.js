// Drawing the townsfolk: each one's body (assets/game/folk/folk.json, a model or a recoloured copy of one) skinned on the
// GPU from the pose the town's thread wrote (src/folk/folk.worker.js), lit and shadowed as the knights are. Bodies load in
// the background once the village is up; anyone not loaded yet just isn't drawn.
import { accessor, parseGLB } from '../core/glb.js';
import { delveAt } from '../core/dungeon.js';
import { inHall } from '../core/testhall.js';
import { F, F_PALETTE, FIN, FOLK_STRIDE, SLOT_HEAD, readFolk } from '../folk/layout.js';
import { SKIRT_JOINTS } from '../folk/rig.js';
import { CROWD_LEAN, FOLK as PEOPLE } from '../folk/people.js';
import { CITY } from '../core/east.js';   // (the town's people and those posted out in the land)
import { HEAD_BIT, headFit, hatPrim, headPieces } from '../folk/hats.js';
import { cutHead, headOf, wornHead } from '../folk/headswap.js';
import { Blankets } from './blankets.js';
import { FolkTools } from './folktools.js';
import { bodyRadius, inCascade } from './shadowcull.js';

const UBO_BYTES = 24 * 64 + 256 + 16;

// A palette swap's recolour as the folk shader reads it from info.x (src/gfx/materials.js ARMOR): 10 + hue shift (as a turn,
// 0 to 1: a little back is near 1) + 2 * saturation in tenths + 32 * value in tenths. tint: [hue shift, saturation, value].
export const swapCode = ([dh, sat, val]) => 10 + ((dh % 1) + 1) % 1 + 2 * Math.round(Math.min(15, sat * 10)) + 32 * Math.round(Math.min(15, val * 10));
// A dyed swap (src/gfx/materials.js, info.x of a thousand and over): dye [dark cloth's dye, light cloth's (each of the sixteen
// in the shader's DYES), how strongly (0 to 3), how dark it's worn (0 to 15: 0.55 to 1.3)].
// And a fifth: its hair (0 as it grew; 1 to 7 black, dark brown, chestnut, auburn, flaxen, grey, white).
export const dyeCode = ([d, l, a, v, hair = 0]) => 1000 + (d & 15) + 16 * (l & 15) + 256 * (a & 3) + 1024 * (v & 15) + 131072 * (hair & 7);
const infoOf = (swap) => (swap.dye ? dyeCode(swap.dye) : swapCode(swap.tint));

export class FolkBodies {
  constructor(renderer, map) {
    this.r = renderer; this.map = map;
    this.bodies = new Array(PEOPLE.length).fill(null);
    this.slot = null;
    this.scratch = new Float32Array(80 * 8);
    this.info = new Float32Array([0, 1, 0, 1]);    // no heartbeat, its own paint, not steel, flesh
    this.blankets = new Blankets(renderer, PEOPLE.length);
    this.tools = new FolkTools(renderer);
  }

  setBeds(beds) { this.blankets.setBeds(beds); }

  // Everyone's body, the nearest to you first, so the square fills before the edges of town.
  async load(base) {
    const r = this.r;
    const folk = await (await fetch(`${base}assets/game/folk/folk.json`)).json();
    const geo = new Map(), tex = new Map();
    const file = (f) => fetch(`${base}assets/game/folk/${f}`).then((res) => { if (!res.ok) throw new Error(`${f}: ${res.status}`); return res; });
    const texture = (f, format) => {
      if (!tex.has(f)) tex.set(f, file(f).then((res) => res.blob()).then((b) => r.bitmapTexture(b, format, r.tier.texScale)));
      return tex.get(f);
    };
    // (Whose heads the swaps wear: theirs are cut out and kept as they're built, src/folk/headswap.js.)
    const donors = new Set(Object.values(folk.swaps || {}).map((w) => w.head).filter(Boolean));
    const model = (m) => {
      if (!geo.has(m)) geo.set(m, file(folk.models[m].glb).then((res) => res.arrayBuffer()).then((buf) => this.mesh(parseGLB(buf), folk.models[m], donors.has(m))));
      return geo.get(m);
    };
    // (Whoever's nearest you next, each time: the town's, when you start in it; a small town's own people when you've come
    // to it by a seal before the last of Bellmourn's are in. Someone the town's thread hasn't placed yet waits their turn.)
    // (The swaps' headwear, tools/folk/hats.py: made round a head of radius 1, fitted to each body's own: src/folk/hats.js.
    // Loaded only once there's a swap to wear one.)
    let hats = null;
    const hatsFor = () => hats || (hats = Promise.all([file('hats.glb').then((res) => res.arrayBuffer()), texture('hats_c.webp', 'rgba8unorm-srgb')]).then(([buf, alb]) => {
      const g = parseGLB(buf), T = {};
      for (const m of g.json.meshes) { const pr = m.primitives[0], a = pr.attributes; T[m.name] = { pos: accessor(g, a.POSITION), nrm: accessor(g, a.NORMAL), uv: accessor(g, a.TEXCOORD_0), idx: accessor(g, pr.indices) }; }
      return { T, alb, flatN: r.pixel('rgba8unorm', [128, 128, 255, 255]), flatM: r.pixel('rgba8unorm', [255, 235, 0, 255]) };
    }));
    const left = new Set(PEOPLE.map((_, k) => k));
    const next = () => {
      const px = this.map.inbox[FIN.PX], pz = this.map.inbox[FIN.PZ];
      let best = -1, bd = Infinity;
      for (const k of left) { const w = this.where(k), d = w ? Math.hypot(w.x - px, w.z - pz) : 1e9 + k; if (d < bd) { bd = d; best = k; } }
      left.delete(best);
      return best;
    };
    while (left.size) {
      const i = next();
      // (Phobos's street crowd last of all, and not till you're on your way there: a phone has only the first of them. And the
      // people who stand in Castle Velscour's wards, late: not till then either.)
      if (PEOPLE[i].crowd || PEOPLE[i].late) {
        this.loaded = true;
        if (PEOPLE[i].crowd && r.tier.lean && PEOPLE.filter((p) => p.crowd).indexOf(PEOPLE[i]) >= CROWD_LEAN) continue;
        while (this.map.inbox[FIN.PX] < CITY.x - CITY.a - 1600) await new Promise((res) => setTimeout(res, 4000));
      }
      try {
        const p = PEOPLE[i], swap = folk.models[p.body] ? null : folk.swaps?.[p.body];
        const mk = swap ? swap.base : folk.models[p.body] ? p.body : 'worker';
        const m = folk.models[mk];
        const g = await model(mk);
        const sk = g.used++ ? r.cloneSkinned(g.base) : g.base;
        const [alb, nrm, mr] = await Promise.all([texture(swap?.c || m.c, 'rgba8unorm-srgb'), texture(m.n, 'rgba8unorm'), texture(m.m, 'rgba8unorm')]);
        const ubo = r.device.createBuffer({ size: UBO_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        // (A palette swap with no paint of its own: its base's paint, recoloured in the shader by info.x, swapCode.)
        r.device.queue.writeBuffer(ubo, UBO_BYTES - 16, swap?.tint || swap?.dye ? new Float32Array([infoOf(swap), 1, 0, 1]) : this.info);
        const matBG = r.device.createBindGroup({ layout: r.bglArmor, entries: [
          { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
        ] });
        this.bodies[i] = { ...sk, ubo, matBG, floats: sk.jointCount * 8, posed: -1, seen: false, casts: false, far: false };
        // (What a swap wears that its body hasn't: another's head, and a hat. Each skinned from the body's own palette and
        // drawn with it: part().)
        const part = (prim, alb, nrmT, mrT) => {
          const hs = r.makeSkinned([prim], sk.jointCount);
          const bg = r.device.createBindGroup({ layout: r.bglSkin, entries: [
            { binding: 0, resource: { buffer: hs.params } }, { binding: 1, resource: { buffer: sk.palette } },
            { binding: 2, resource: { buffer: hs.srcBuf } }, { binding: 3, resource: { buffer: hs.outBuf } },
          ] });
          const pubo = r.device.createBuffer({ size: UBO_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
          r.device.queue.writeBuffer(pubo, UBO_BYTES - 16, new Float32Array([infoOf(swap), 1, 0, 1]));
          const pmat = r.device.createBindGroup({ layout: r.bglArmor, entries: [
            { binding: 0, resource: { buffer: pubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrmT.createView() }, { binding: 3, resource: mrT.createView() },
          ] });
          this.bodies[i].parts.push({ ...hs, bg, ubo: pubo, matBG: pmat });
        };
        this.bodies[i].parts = [];
        let fit = g.fit;
        // Another's head (src/folk/headswap.js): its own folded away in the skinning pass (the parameters' last four
        // numbers: its Head joint, and 1), the donor's worn on its neck in the donor's own paint.
        if (swap?.head && g.head && folk.models[swap.head]) {
          const dm = folk.models[swap.head], dg = await model(swap.head);
          if (dg.cut) {
            const worn = wornHead(dg.cut, g.head, HEAD_BIT);
            const [da, dn, dr] = await Promise.all([texture(dm.c, 'rgba8unorm-srgb'), texture(dm.n, 'rgba8unorm'), texture(dm.m, 'rgba8unorm')]);
            part(worn.prim, da, dn, dr);
            r.device.queue.writeBuffer(sk.params, 32, new Float32Array([...g.head.J, 1]));
            fit = worn.fit || fit;
          }
        }
        if (swap?.hat && fit) {
          const H = await hatsFor(), tmpl = H.T[swap.hat];
          if (tmpl) part(hatPrim(tmpl, fit, swap.hat), H.alb, H.flatN, H.flatM);
        }
      } catch (e) { console.warn('folk body', PEOPLE[i].id, e); }
    }
    this.loaded = true;
  }

  // The mesh, as the skinning pass takes it. A skirt's hem is pushed clear of the legs (SKIN in src/gfx/shaders.js): each
  // vertex keeps which way round the body it faces, and how much of it is skirt.
  mesh(glb, m, donor = false) {
    const pr = glb.json.meshes[0].primitives[0], a = pr.attributes;
    const prim = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices), joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0) };
    let joints = glb.json.skins[0].joints.length;
    if (m.skirt && a._SKIRT !== undefined) {
      const w = accessor(glb, a._SKIRT), c = m.skirt.center, dir = new Uint16Array(w.length);
      for (let v = 0; v < w.length; v++) {
        const ang = Math.atan2(prim.pos[v * 3] - c[0], prim.pos[v * 3 + 2] - c[1]);
        dir[v] = Math.round((ang / (2 * Math.PI) + 0.5) * 65535);
      }
      prim.flex = Float32Array.from(w, (x) => -x);
      prim.skirtDirection = dir;
      joints += SKIRT_JOINTS;
    }
    // (Where a hat would sit on this body's head, should a swap of it wear one: src/folk/hats.js. And its head marked, in
    // the piece number's top bit (HEAD_BIT), so a swap's dye leaves the hair the colour it grew.)
    const names = glb.json.skins[0].joints.map((j) => glb.json.nodes[j].name || '');
    const fit = headFit(names, prim);
    if (fit) prim.piece = headPieces(names, prim);
    // (And its own head marked for folding away, should a swap of it wear another's; and if a swap wears its head, that cut
    // out and kept: src/folk/headswap.js.)
    const head = fit ? headOf(glb, prim) : null;
    if (head) prim.srcFlag = head.srcFlag;
    const cut = head && donor ? cutHead(glb, prim, head) : null;
    if (head) head.srcFlag = null;
    const base = this.r.makeSkinned([prim], joints);
    this.r.addLod(base, prim, 0.06);
    return { base, used: 0, fit, head, cut };
  }

  // Who's on screen, and whose shadow could be. The slot is held for the frame.
  cull(cam, planes) {
    const s = this.slot = readFolk(this.map);
    // Down in the Warrens or the Test Dungeon nobody in town can be seen, or throw a shadow there: without this the view's
    // sides, which have no far end, took in whoever stood that way, and they were posed, skinned and drawn every frame.
    // (But whoever stands down a delve themselves, Phobos's sewer-keepers and their princess, src/folk/people.js, is seen from
    // down that delve, and from nowhere else.)
    const down = delveAt(cam.x, cam.z), shut = !!down || inHall(cam.x, cam.z);
    this.blankets.update(s, cam);
    this.tools.cull(s, this.bodies[this.tools.owner]?.jointCount, cam, planes);
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (!b) continue;
      const o = SLOT_HEAD + i * FOLK_STRIDE;
      const there = s ? delveAt(s[o + F.X], s[o + F.Z]) : null;
      if (!s || (shut ? !down || there !== down : there) || s[o + F.ACTIVE] < 0.5) { b.seen = b.casts = b.skin = b.wasCast = false; this.map.inbox[FIN.SEEN + i] = 0; continue; }
      const x = s[o + F.X], y = s[o + F.Y] + 0.9, z = s[o + F.Z];
      b.bx = x; b.by = y; b.bz = z; b.br = bodyRadius(1.4, b.bindR);
      let inside = 1e9;
      for (let k = 0; k < 5; k++) inside = Math.min(inside, planes[k * 4] * x + planes[k * 4 + 1] * y + planes[k * 4 + 2] * z + planes[k * 4 + 3]);
      b.seen = inside > -1.4;
      b.casts = inside > -6;
      const d = Math.hypot(x - cam.x, z - cam.z);
      b.far = d > (b.far ? 14 : 16);
      // (Shadows from far off are lost in the cascade's texels anyway.)
      if (d > 70) b.casts = b.seen;
      // A PC's far bodies: a coarser mesh, and a pose made less often than the screen's drawn (renderer.js bodyDetail, skinEvery).
      b.detail = this.r.bodyDetail(d, b.detail);
      const every = this.r.skinEvery(d);
      b.skin = b.casts && (!b.wasCast || every < 2 || (this.r.skinFrame + i) % every === 0);
      b.wasCast = b.casts;
      // (For the town's thread: whoever's drawn, body or shadow, is posed often; whoever isn't, seldom.)
      this.map.inbox[FIN.SEEN + i] = b.casts ? 1 : 0;
    }
  }

  // Whoever of them is drawn, to add(x, y, z, width): where each stands, for the dark under them (renderer.js writeFeet).
  feet(s, add) {
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (!b || !b.casts || b.posed < 0) continue;
      const o = SLOT_HEAD + i * FOLK_STRIDE;
      if (s[o + F.ACTIVE] < 0.5) continue;
      add(s[o + F.X], s[o + F.Y], s[o + F.Z], 0.42);
    }
  }

  upload(q, time, params, paramsU) {
    const s = this.slot;
    if (!s) return;
    this.tools.upload(q);
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (!b || !b.skin) continue;
      const o = SLOT_HEAD + i * FOLK_STRIDE;
      const posed = s[o + F.POSED];
      if (posed !== b.posed) {
        b.posed = posed;
        // (Copied out of the shared buffer first: not every browser will upload straight from one.)
        const sc = this.scratch.subarray(0, b.floats);
        sc.set(s.subarray(o + F_PALETTE, o + F_PALETTE + b.floats));
        q.writeBuffer(b.palette, 0, sc);
      }
      paramsU[0] = b.count;
      params[1] = 1; params[2] = time; paramsU[3] = 0;
      params[4] = 0.05; params[5] = 0; params[6] = 0.035;
      q.writeBuffer(b.params, 0, params);
      for (const h of b.parts || []) { paramsU[0] = h.count; q.writeBuffer(h.params, 0, params); }
    }
  }

  compute(cp) {
    this.blankets.compute(cp);
    this.tools.compute(cp);
    for (const b of this.bodies) {
      if (!b || !b.skin || b.posed < 0) continue;
      cp.setBindGroup(0, b.bg);
      cp.dispatchWorkgroups(Math.ceil(b.count / 128));
      for (const h of b.parts || []) { cp.setBindGroup(0, h.bg); cp.dispatchWorkgroups(Math.ceil(h.count / 128)); }
    }
  }

  // m, o: the cascade's matrix (renderer frameData at o), to leave out anyone wholly outside its square (shadowcull.js).
  // coarse: with the coarse mesh (every shadow on a phone, the far cascade's on a PC).
  shadow(sp, m, o, coarse = true) {
    this.blankets.shadow(sp);
    this.tools.shadow(sp);
    for (const b of this.bodies) {
      if (!b || !b.casts || b.posed < 0) continue;
      if (m && !inCascade(m, o, b.bx, b.by, b.bz, b.br)) continue;
      sp.setVertexBuffer(0, b.outBuf);
      if (coarse) { sp.setIndexBuffer(b.lodIB, 'uint32'); sp.drawIndexed(b.lodCount); } else { sp.setIndexBuffer(b.IB, 'uint32'); sp.drawIndexed(b.indices); }
      for (const h of b.parts || []) { sp.setVertexBuffer(0, h.outBuf); sp.setIndexBuffer(h.IB, 'uint32'); sp.drawIndexed(h.indices); }
    }
  }

  draw(mp, lean) {
    this.blankets.draw(mp);
    this.tools.draw(mp);
    for (const b of this.bodies) {
      if (!b || !b.seen || b.posed < 0) continue;
      mp.setBindGroup(1, b.matBG);
      mp.setVertexBuffer(0, b.outBuf);
      mp.setVertexBuffer(1, b.sideVB);
      if (lean ? b.far : b.detail) { mp.setIndexBuffer(b.lodIB, 'uint32'); mp.drawIndexed(b.lodCount); } else { mp.setIndexBuffer(b.IB, 'uint32'); mp.drawIndexed(b.indices); }
      for (const h of b.parts || []) { mp.setBindGroup(1, h.matBG); mp.setVertexBuffer(0, h.outBuf); mp.setVertexBuffer(1, h.sideVB); mp.setIndexBuffer(h.IB, 'uint32'); mp.drawIndexed(h.indices); }
    }
  }

  // Where someone is in the latest slot: { x, y, z, yaw, hx, hy, hz, house, level, sleep, busy }, or null.
  where(i) {
    const s = this.slot;
    if (!s) return null;
    const o = SLOT_HEAD + i * FOLK_STRIDE;
    if (s[o + F.ACTIVE] < 0.5) return null;
    return { x: s[o + F.X], y: s[o + F.Y], z: s[o + F.Z], yaw: s[o + F.YAW], hx: s[o + F.HX], hy: s[o + F.HY], hz: s[o + F.HZ], house: s[o + F.HOUSE], level: s[o + F.LEVEL], sleep: s[o + F.SLEEP] > 0.5, busy: s[o + F.BUSY] };
  }
}
