// The phone's copies of the models' big pictures (tools/lean_pictures/make.py, assets/lean/): each at 1024 on its longer
// side, where the original inside its model's file is 2048 or 4096. A tier that shrinks its pictures (one with a texScale
// under 1) decodes the copy instead, wherever what it makes is no bigger than the copy: a 4096 picture decoded whole was
// 64 MB of memory at once, to be shrunk to 1024 or less, and a load decoded some 2 GB of pixels so. What it makes is
// sized from the original's sides, so it's the size it was (src/gfx/renderer.js bitmapTexture).
//
// A copy is found by the original's own bytes (pictureKey), not by its file: the same picture in two files is one copy,
// and a copy whose original has changed is never found, so it's never shown over the new one.

const SAMPLE = 4096;
const keys = new WeakMap();

/** As tools/lean_pictures/make.py picture_key: the length, and FNV-1a over the first, middle and last 4 KB. */
export function pictureKey(u8) {
  const n = u8.length, mid = n >> 1;
  let h = 0x811c9dc5;
  const run = (a, b) => { for (let i = Math.max(0, a), e = Math.min(n, b); i < e; i++) h = Math.imul(h ^ u8[i], 0x01000193) >>> 0; };
  run(0, SAMPLE); run(mid - SAMPLE / 2, mid + SAMPLE / 2); run(n - SAMPLE, n);
  return `${n}-${h.toString(16).padStart(8, '0')}`;
}

/** A model's picture as a Blob (as src/core/glb.js imageBytes), marked with its key so a copy can be found for it. */
export function pictureOf(glb, imageIndex) {
  const img = glb.json.images[imageIndex];
  const bv = glb.json.bufferViews[img.bufferView];
  const bytes = new Uint8Array(glb.buffer, glb.binStart + (bv.byteOffset || 0), bv.byteLength);
  const blob = new Blob([bytes], { type: img.mimeType });
  keys.set(blob, pictureKey(bytes));
  return blob;
}

export class LeanPictures {
  // on: this tier shrinks its pictures. get: (url) => a Blob of that file (src/core/files.js getFile, which the loading
  // screen names).
  constructor(base, on, get) {
    this.base = base;
    this.get = get;
    this.list = null;
    this.used = 0;
    this.missed = 0;
    // (Without the list, every picture is decoded from its model, as before.)
    this.ready = on ? get(`${base}assets/lean/pictures.json`, 'json').then((m) => { this.list = m.pictures; }, (e) => console.warn('phone pictures off:', e)) : Promise.resolve();
  }

  /** The original's [width, height] and its copy, for a picture of a model's (pictureOf), or null where there's none. */
  find(blob) {
    const k = this.list && keys.get(blob);
    return (k && this.list[k]) || null;
  }

  /** The copy's Blob (null if it can't be had: the original is decoded instead). */
  async copy(entry) {
    try {
      const b = await this.get(`${this.base}assets/lean/${entry.file}`, 'blob');
      this.used++;
      return b;
    } catch (e) {
      this.missed++;
      console.warn('phone picture', entry.file, e);
      return null;
    }
  }

  /**
   * What to decode for a picture of a model's (pictureOf), to make of it what want([width, height]) says (the size it
   * comes out, from the original's sides): { blob: its copy, size: the original's [width, height] } where the copy is at
   * least that big (src/gfx/gpu.js decodeScaledBitmap's size); { blob: the picture itself, size: null } otherwise, or
   * where the copy can't be had.
   */
  async source(blob, want) {
    await this.ready;
    const e = this.find(blob);
    if (e) {
      const [w, h] = want(e.size);
      const small = w <= e.copy[0] && h <= e.copy[1] ? await this.copy(e) : null;
      if (small) return { blob: small, size: e.size, file: e.file };
    }
    return { blob, size: null };
  }

  /**
   * For the dyed skins' bake worker (src/gfx/bake.worker.js), which shrinks a picture by one scale on both sides: the copy
   * and the scale that makes it come out exactly the size the original would have; or the picture and scale as given.
   */
  async forScale(blob, scale) {
    await this.ready;
    const e = this.find(blob);
    if (e) {
      const [w, h] = e.size, [cw, ch] = e.copy, k = scale * w / cw, side = (n, s) => Math.max(1, Math.round(n * s));
      const small = k <= 1 && side(cw, k) === side(w, scale) && side(ch, k) === side(h, scale) ? await this.copy(e) : null;
      if (small) return { blob: small, scale: k };
    }
    return { blob, scale };
  }
}
