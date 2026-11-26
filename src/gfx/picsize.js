// How big a model's picture is made, on every tier: one rule for the pictures decoded on the render thread
// (Renderer.bitmapTexture, src/gfx/tripo-slots.js) and the monsters' dyed skins, baked in a worker of their own
// (src/gfx/bake.worker.js). Nothing here needs the GPU or the page, so it runs in either, and in a test
// (tests/picsize.test.mjs).

// What a picture is held to on this tier: { scale, cap, step }, for picSize and decodeScaledBitmap.
// - scale: the tier's shrink, as asked (tier.texScale for a model's pictures).
// - On a lean tier (the phone's, and a PC's Low), a model's picture shrunk at all (scale under 1, and not full) is held to
//   tier.texCap a side; one seen close (near: Lisandra, your own body, a monster as tall as a house) to tier.texCapNear.
//   A picture that isn't a colour (format 'rgba8unorm': normals, metal and roughness) is held to tier.mapScale of that.
// - fill: on a lean tier, the cap's size whatever the picture's own, the scale aside (never grown past its own size):
//   a tall monster's skin comes out 512 whether Tripo made it 1024 across or 4096. On any other tier it does nothing.
// - blocks: each side a whole number of 4 pixels, as ASTC's blocks need (src/gfx/astc.js).
// On any other tier, or a picture not shrunk, there is no cap: { scale, cap: 0 }.
export function picRule(tier, scale, { format = 'rgba8unorm-srgb', full = false, near = false, fill = false, blocks = false } = {}) {
  const cap = (near && tier.texCapNear) || tier.texCap || 0;
  const lean = !!(tier.lean && scale < 1 && !full && cap);
  const k = lean && format === 'rgba8unorm' ? tier.mapScale || 1 : 1;
  return { scale: (lean && fill ? 1 : scale) * k, cap: lean ? cap * k : 0, step: blocks ? 4 : 1 };
}

// A Tripo monster this tall (its roster height, in metres) or taller is seen close: at the distance it fights from it
// fills most of a phone's screen. So is an outpost's chief, however tall (chief in its roster entry: CHIEFS in
// src/core/tripo-monsters.js), as the same body is a boss's elsewhere. Their colours are held to texCapNear and filled to
// it, their own or dyed alike; every other monster's to texCap (src/gfx/tripo-slots.js). Their normals and metal are
// everyone's, texCap's half (128 on a phone): at 256 they showed nothing (Ossivar, its colours the same either way: 0.9%
// of its pixels moved at 7 m) and cost a third more. That's the named bosses,
// the dragons, the giants, golems and worms, the night demons, the land's great kinds and the chiefs; not the rank and file
// (Velscour's knights and lancers and the possessed lords who lead them, 2.0 to 2.2 m; the goat-men and the necromancer
// lords in their packs, 2.2).
export const TALL = 2.5;
export const monsterRule = (tier, m = {}, opts = {}) => {
  const near = (m.height || 0) >= TALL || !!m.chief;
  return picRule(tier, tier.texScale, { ...opts, near: near && opts.format !== 'rgba8unorm', fill: near });
};

// (As picSize, by arguments: src/gfx/renderer.js and src/gfx/lean-pictures.js's callers.)
export const scaledSize = (width, height, scale, cap = 0, step = 1) => picSize(width, height, { scale, cap, step });

// The size a picture w x h comes out at under a rule: shrunk by scale, never grown, no side over cap (0: none), each side
// a whole number of step (rounded to the nearest, as a picture's UVs don't mind a pixel or two; never over the cap).
export function picSize(w, h, { scale = 1, cap = 0, step = 1 } = {}) {
  let s = Math.min(scale, 1);
  if (cap) s = Math.min(s, cap / Math.max(w, h));
  const most = cap ? Math.max(step, Math.floor(cap / step) * step) : Infinity;
  const side = (n) => Math.min(most, Math.max(step, Math.round(n * s / step) * step));
  return [side(w), side(h)];
}

// A picture decoded at the size picSize gives (cap: no side longer, whatever scale says; 0, no cap. step: each side a whole
// number of these). The compressed bytes are decoded once and the decoded pixels resized, the full-size bitmap closed.
// size: the [width, height] of the picture this is a smaller copy of (src/gfx/lean-pictures.js), which what comes back is
// sized from: the size it would have been, decoded from the original. A copy smaller than that is an error (one kept from
// before, say), so the original is decoded instead, not the copy blown up. A copy is shrunk the rest of the way in halves:
// Chrome's own shrink drops pixels unfiltered past a half (grain, and a checkered shimmer on a fine pattern), and a half at
// a time comes out near a proper filter (at a phone's 128 or 256, 4 to 7 dB nearer a Lanczos from the original), for some
// 3 to 5 ms a picture. (Not the originals: their halves would be 16 and 4 MB more beside the 64 of a 4096 picture.)
export async function decodeScaledBitmap(blob, scale, cap = 0, step = 1, size = null) {
  const opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
  const bmp = await createImageBitmap(blob, opts);
  const [w, h] = picSize(...(size || [bmp.width, bmp.height]), { scale, cap, step });
  if (w === bmp.width && h === bmp.height) return bmp;
  if (size && (bmp.width < w || bmp.height < h)) { bmp.close(); throw new Error(`a copy ${bmp.width}x${bmp.height}, for ${w}x${h}`); }
  let src = bmp;
  try {
    if (size) {
      while (src.width >= 2 * w && src.height >= 2 * h) {
        const half = await createImageBitmap(src, { ...opts, resizeWidth: Math.round(src.width / 2), resizeHeight: Math.round(src.height / 2), resizeQuality: 'high' });
        if (src !== bmp) src.close();
        src = half;
      }
      if (src.width === w && src.height === h) { const done = src; src = bmp; return done; }
    }
    // Resize the decoded pixels instead of decoding the compressed source twice.
    return await createImageBitmap(src, { ...opts, resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
  } finally { bmp.close(); if (src !== bmp) src.close(); }
}
