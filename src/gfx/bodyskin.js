// The gear you wear, on the body you see in third person. A set of gear is one picture: your whole colour map with the hat,
// mantle, tunic, legs and boots painted new (made from a recipe by the skin kit, tools/player/skins, and brought in by
// import_set.py). assets/game/player/parts.png says which of those five each texel of the map is, so pieces of different
// sets mix: the hat of one, the boots of another. What you wear in each slot picks the set for that part (pickSets); a part
// with nothing worn, or nothing made for what's worn, is as the sculpt came. Skin, hair and eyes never change.
import { ROBES } from '../items/items.js';
import { mipCountFor } from './gpu.js';

export const SKIN_PARTS = ['head', 'shoulders', 'chest', 'legs', 'feet'];   // by their number in parts.png, from 1
const BASE = 'assets/game/player/';

// Which set dresses each part, for what's in the pack's slots. A piece of a set of gear (item.set) wears that set. For a
// plain robe, a set says what it's worn for (wears): robes of a palette,
// and of only some shapes if it says so, or named items. The closer the fit the better, and of two alike the later made.
export function pickSets(sets, slots) {
  const out = {};
  for (const part of SKIN_PARTS) {
    const item = slots[part], robe = item && ROBES[item.base];
    if (!robe) continue;
    // A piece of a set wears its own set's look. A plain robe wears what was made for its palette or for itself (a set with
    // a rarity is gear of its own, and dresses only its own pieces).
    const own = item.set && sets.find((s) => s.id === item.set && s.pieces.includes(part));
    if (own) { out[part] = own.id; continue; }
    let best = null, fit = 0;
    for (const s of sets) {
      if (!s.pieces.includes(part) || s.rarity != null) continue;
      const w = s.wears || {}, shapes = w.shapes?.[part];
      const f = w.items?.includes(item.base) ? 3 : w.palette === robe.palette ? (shapes ? (shapes.includes(robe.shape) ? 2 : 0) : 1) : 0;
      if (f && f >= fit) { best = s; fit = f; }
    }
    if (best) out[part] = best.id;
  }
  return out;
}

export class BodySkin {
  // body: your body as the renderer built it (its maps kept: buildCrabs). colour: its own colour picture, as a Blob.
  constructor(renderer, base, body, colour) {
    this.r = renderer; this.base = base; this.body = body; this.colour = colour;
    this.sets = []; this.worn = {}; this.key = ''; this.turn = 0;
    this.ready = this.load().catch((e) => { console.warn('body skins', e); this.sets = []; });
  }

  async load() {
    const list = await fetch(`${this.base}${BASE}skins/sets.json`).then((r) => (r.ok ? r.json() : { sets: [] }));
    this.sets = list.sets || [];
  }

  // The pictures the mixing needs, made the first time anything's worn: your own colours and the parts, at the size the body's map is.
  async ground() {
    if (this.pixels) return;
    const alb = this.body.maps[0], w = alb.width, h = alb.height;
    const canvas = new OffscreenCanvas(w, h), ctx = canvas.getContext('2d', { willReadFrequently: true });
    const draw = async (blob, smooth) => {
      const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      ctx.imageSmoothingEnabled = smooth; ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h); bmp.close();
      return ctx.getImageData(0, 0, w, h).data;
    };
    this.read = draw; this.canvas = canvas; this.ctx = ctx; this.w = w; this.h = h;
    const parts = await draw(await fetch(`${this.base}${BASE}parts.png`).then((r) => { if (!r.ok) throw new Error(`parts.png: ${r.status}`); return r.blob(); }), false);
    // (A grey for each part: 40 a step.)
    this.part = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) this.part[i] = Math.round(parts[i * 4] / 40);
    this.pixels = new Uint8ClampedArray(await draw(this.colour, true));
  }

  // What's worn: { head: set id, ... }. The body's colour map is made again if it's changed.
  async wear(worn) {
    await this.ready;
    const known = new Set(this.sets.map((s) => s.id)), want = {};
    for (const p of SKIN_PARTS) if (worn[p] && known.has(worn[p])) want[p] = worn[p];
    const key = SKIN_PARTS.map((p) => want[p] || '').join('|');
    if (key === this.key) return;
    this.key = key; this.worn = want;
    const turn = ++this.turn, { device } = this.r, body = this.body;
    let tex = null;
    if (key.replace(/\|/g, '')) {
      await this.ground();
      const out = new Uint8ClampedArray(this.pixels), part = this.part;
      for (const id of new Set(Object.values(want))) {
        const blob = await fetch(`${this.base}${BASE}skins/${id}.webp`).then((r) => { if (!r.ok) throw new Error(`skin ${id}: ${r.status}`); return r.blob(); });
        const px = await this.read(blob, true);
        if (turn !== this.turn) return;      // (changed again while this was coming: the later one has it)
        const mine = SKIN_PARTS.map((p) => want[p] === id);
        for (let i = 0, n = part.length; i < n; i++) {
          const p = part[i];
          if (p && mine[p - 1]) { const k = i * 4; out[k] = px[k]; out[k + 1] = px[k + 1]; out[k + 2] = px[k + 2]; }
        }
      }
      if (turn !== this.turn) return;
      this.ctx.putImageData(new ImageData(out, this.w, this.h), 0, 0);
      const format = 'rgba8unorm-srgb', mips = mipCountFor(this.w, this.h);
      tex = device.createTexture({ size: [this.w, this.h], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      device.queue.copyExternalImageToTexture({ source: this.canvas }, { texture: tex, premultipliedAlpha: false }, [this.w, this.h]);
      const enc = device.createCommandEncoder();
      this.r.mip.generate(tex, format, 1, mips, enc);
      device.queue.submit([enc.finish()]);
    }
    // The body's own maps, with this colour in place of its first (or its first back, with nothing worn).
    const [alb, nrm, mr] = body.maps;
    body.matBG = device.createBindGroup({ layout: this.r.bglArmor, entries: [
      { binding: 0, resource: { buffer: body.ubo } }, { binding: 1, resource: (tex || alb).createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    const old = this.tex;
    this.tex = tex;
    // (The last one may still be in a frame on its way to the screen.)
    if (old) setTimeout(() => old.destroy(), 1500);
  }
}
