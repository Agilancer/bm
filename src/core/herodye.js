// The other Tessariels' armour, dyed piece by piece: the colours chosen for a hero in assets/game/heroes/people.json (set in
// heroes.html, the hero viewer), laid over the albedo their body was built with (tools/heroes/build.py recolour, whose rules
// this follows: dyed cloth and enamel turn to the chosen hue, steel can take a tint, skin, leather and gold stay as they are).
//
// Shared by the game (src/gfx/renderer.js, as a hero's body is loaded) and the viewer, so a colour looks the same in both.
// Nothing here touches the DOM or the GPU: pixels in, pixels out.
//
// Each piece of a body (the GLB scene's extras.pieces, tools/heroes/build.py) is named for its slot ("chest_..."), and the
// slots never share texels, so a slot's triangles drawn in UV space are its part of the picture.

export const DYE_SLOTS = ['helm', 'chest', 'shoulders', 'arms', 'legs', 'boots'];
export const DYE_TITLES = { helm: 'Helm', chest: 'Chest', shoulders: 'Shoulders', arms: 'Arms', legs: 'Legs', boots: 'Boots' };

/** The slot a piece belongs to, by its name ("chest_E - ARCHER 2_0#1" -> 'chest'), or null (the mail under it, which has no texels). */
export const slotOfPiece = (name) => { const s = String(name || '').split('_')[0]; return DYE_SLOTS.includes(s) ? s : null; };

/** Whether a slot's dye changes anything. dye: { hue: 0-360 | null, sat: x, val: x, steel: '#rrggbb' | null, cover: 'all' | undefined }. */
export function dyeActive(d) {
  return !!d && ((d.hue != null && d.hue !== '') || (d.sat ?? 1) !== 1 || (d.val ?? 1) !== 1 || !!d.steel);
}

/** Whether any of a hero's slots are dyed. */
export const anyDye = (colours) => !!colours && DYE_SLOTS.some((s) => dyeActive(colours[s]));

/**
 * Which slot each texel is in: 0 for none, else 1 + its index in DYE_SLOTS. A couple of texels are added round each slot's
 * edge, so the mips and the filtering don't bring the old colour back along the seams.
 * pieces: [{ name, tstart, tcount }] (tstart, tcount in triangles). uv: Float32Array, 2 a vertex. idx: the triangles.
 */
export function slotMask(pieces, uv, idx, w, h, grow = 2) {
  const mask = new Uint8Array(w * h);
  for (const p of pieces) {
    const slot = slotOfPiece(p.name);
    if (!slot) continue;
    const v = DYE_SLOTS.indexOf(slot) + 1;
    const end = Math.min(idx.length / 3, p.tstart + p.tcount);
    for (let t = p.tstart; t < end; t++) {
      const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
      fillTri(mask, w, h, v, uv[a * 2] * w, uv[a * 2 + 1] * h, uv[b * 2] * w, uv[b * 2 + 1] * h, uv[c * 2] * w, uv[c * 2 + 1] * h);
    }
  }
  for (let g = 0; g < grow; g++) {
    const prev = mask.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (prev[i]) continue;
        const n = (x > 0 && prev[i - 1]) || (x < w - 1 && prev[i + 1]) || (y > 0 && prev[i - w]) || (y < h - 1 && prev[i + w]);
        if (n) mask[i] = n;
      }
    }
  }
  return mask;
}

// One triangle in texel space, by texel centres. (UVs a little past 0-1 wrap, as the sampler repeats.)
function fillTri(mask, w, h, v, x0, y0, x1, y1, x2, y2) {
  const ox = Math.floor(Math.min(x0, x1, x2) / w) * w, oy = Math.floor(Math.min(y0, y1, y2) / h) * h;
  x0 -= ox; x1 -= ox; x2 -= ox; y0 -= oy; y1 -= oy; y2 -= oy;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 1e-9) {
    // (A sliver: its corners at least.)
    for (const [x, y] of [[x0, y0], [x1, y1], [x2, y2]]) { const xi = Math.min(w - 1, Math.max(0, x | 0)), yi = Math.min(h - 1, Math.max(0, y | 0)); mask[yi * w + xi] = v; }
    return;
  }
  const s = area > 0 ? 1 : -1, e = -1e-6;
  for (let y = minY; y <= maxY; y++) {
    const py = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * s;
      const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * s;
      const w2 = ((x0 - px) * (y1 - py) - (x1 - px) * (y0 - py)) * s;
      if (w0 >= e && w1 >= e && w2 >= e) mask[y * w + x] = v;
    }
  }
}

const hexRGB = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};

// What counts as dyed, as build.py has it: coloured enough and not dark, and not the warm band skin and leather sit in
// (about 12-55 degrees) unless it's a strong bright colour there. Steel: grey and not black.
function isDyed(h, s, v) {
  const warm = h > 12 && h < 55;
  return (s > 0.28 && v > 0.12 && !warm) || (warm && s > 0.45 && v > 0.45);
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = Math.max(mx - mn, 1e-5);
  const s = mx > 1e-4 ? (mx - mn) / Math.max(mx, 1e-4) : 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, mx];
}

/**
 * Dyes the pixels in place. rgba: Uint8ClampedArray (or Uint8Array), 4 a texel, the same size as the mask. colours:
 * { [slot]: { hue, sat, val, steel, cover } }. hue: the colour the slot's dyed cloth turns to (its own main hue is turned
 * there, so a pattern's other colours keep their places round the wheel); sat, val: multiplied; steel: a tint for its bare
 * metal. cover 'all': the whole piece takes the hue, leather and gilt too (all but the bare steel), for armour that has
 * little dyed cloth in it (an archer's leathers, a ranger's greens).
 */
export function applyDye(rgba, mask, colours) {
  const plans = [null];
  for (const slot of DYE_SLOTS) {
    const d = colours?.[slot];
    plans.push(dyeActive(d) ? { hue: d.hue == null || d.hue === '' ? null : +d.hue, sat: d.sat ?? 1, val: d.val ?? 1, steel: hexRGB(d.steel), all: d.cover === 'all', sx: 0, sy: 0, n: 0, shift: 0 } : null);
  }
  if (!plans.some(Boolean)) return rgba;
  const n = mask.length;
  // Each slot's own main hue, the way build.py finds a source's: the mean angle of its dyed texels.
  for (let i = 0; i < n; i++) {
    const p = plans[mask[i]];
    if (!p || p.hue == null || p.all) continue;
    const o = i * 4, [h, s, v] = hsv(rgba[o] / 255, rgba[o + 1] / 255, rgba[o + 2] / 255);
    if (!isDyed(h, s, v)) continue;
    const a = h * Math.PI / 180;
    p.sx += Math.sin(a); p.sy += Math.cos(a); p.n++;
  }
  for (const p of plans) if (p && p.hue != null) p.shift = p.n > 20 ? p.hue - ((Math.atan2(p.sx, p.sy) * 180 / Math.PI + 360) % 360) : 0;
  for (let i = 0; i < n; i++) {
    const p = plans[mask[i]];
    if (!p) continue;
    const o = i * 4;
    let r = rgba[o] / 255, g = rgba[o + 1] / 255, b = rgba[o + 2] / 255;
    let [h, s, v] = hsv(r, g, b);
    const steel = s < 0.2 && v > 0.15;
    // (Covered whole: anything with colour in it, at the chosen hue, given colour enough to show it.)
    const all = p.all && s >= 0.1 && v > 0.06;
    if (all || isDyed(h, s, v)) {
      if (all && p.hue != null) { h = p.hue; s = Math.max(s, 0.3 + 0.3 * Math.min(1, (s - 0.1) * 4)); } else h = (((h + p.shift) % 360) + 360) % 360;
      s = Math.min(1, s * p.sat); v = Math.min(1, v * p.val);
      const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c, k = Math.floor(h / 60) % 6;
      [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
      r += m; g += m; b += m;
    }
    if (p.steel && steel) { r *= p.steel[0]; g *= p.steel[1]; b *= p.steel[2]; }
    rgba[o] = r * 255 + 0.5; rgba[o + 1] = g * 255 + 0.5; rgba[o + 2] = b * 255 + 0.5;
  }
  return rgba;
}

/** A hero's colours from people.json, cleaned: only the slots that change anything, the numbers as numbers. */
export function cleanColours(colours) {
  if (!colours || typeof colours !== 'object') return null;
  const out = {};
  for (const slot of DYE_SLOTS) {
    const d = colours[slot];
    if (!dyeActive(d)) continue;
    const e = {};
    if (d.hue != null && d.hue !== '') e.hue = Math.round(((+d.hue % 360) + 360) % 360);
    if ((d.sat ?? 1) !== 1) e.sat = Math.round(+d.sat * 100) / 100;
    if ((d.val ?? 1) !== 1) e.val = Math.round(+d.val * 100) / 100;
    if (hexRGB(d.steel)) e.steel = '#' + String(d.steel).replace('#', '').toLowerCase();
    if (d.cover === 'all') e.cover = 'all';
    out[slot] = e;
  }
  return Object.keys(out).length ? out : null;
}
