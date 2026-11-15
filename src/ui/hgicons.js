// The pictures of the party's gear, in the pack and in their book: each piece as it was drawn in Blender
// (assets/game/heroes/icons, tools/heroes/icons.py: a weapon or shield by its model, a piece of armour by the body it was
// cut from and its group), in its own colours: the same sums as on the hero (src/gfx/recolour.js), done once a picture and
// kept. Until a picture's made, the plain one; whoever asked is told when it's ready, to draw it again. A piece someone
// wears can be drawn in the colours it has on them (worn: its ramp in their outfit, partygear.js outfitRamps), so the
// book shows what the body shows. A dark piece is given a rim of light, so it doesn't sink into a dark cell.
import { PROP_PALS, groundModelOf, lookOf, rampFor, sizeOfHG } from '../items/partygear.js';
import { lumRange, paintProp, rampMap } from '../gfx/recolour.js';

const made = new Map();      // key -> data URL, or null while it's being made
const waiting = new Map();   // key -> Set of callbacks
const missing = new Set();   // pictures that aren't there: their fallback's used
// (Whoever's waiting is told once a frame, each once, however many pictures came in: a redraw asks for the pictures still
// coming, and if each that came in told each redraw that asked, the redraws would multiply till the page hung.)
const due = new Set();
let dueFrame = 0;
function tell(key) {
  for (const f of waiting.get(key) || []) due.add(f);
  waiting.delete(key);
  if (dueFrame || !due.size) return;
  dueFrame = requestAnimationFrame(() => { dueFrame = 0; const fs = [...due]; due.clear(); for (const f of fs) f(); });
}

const srcOf = (item, base) => {
  const own = item.slot === 'weapon' || item.slot === 'off' ? `${base}assets/game/heroes/icons/${item.prop}.webp` : `${base}assets/game/heroes/icons/${item.shape}_${item.slot}.webp`;
  if (!missing.has(own)) return own;
  // (No picture of its own: armour as the piece it lies on the ground as, a weapon or shield as nothing.)
  return item.slot === 'weapon' || item.slot === 'off' ? null : `${base}assets/game/items/icons/${groundModelOf(item).plain}.webp`;
};
const keyOf = (item, src, worn) => `${src}|${item.pal || ''}|${item.look || ''}|${item.rarity | 0}|${worn ? worn.flat().map((x) => Math.round(x)).join(',') : ''}`;

// A dark picture's rim: the texels at its edge lit, and the whole lifted a little. px: RGBA bytes, changed in place.
function rimIfDark(px, W, H) {
  let sum = 0, n = 0;
  for (let k = 0; k < px.length; k += 4) if (px[k + 3] > 128) { sum += 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]; n++; }
  if (!n || sum / n / 255 > 0.2) return;
  const edge = (i) => px[i * 4 + 3] > 128 && [i - 1, i + 1, i - W, i + W, i - 2, i + 2, i - 2 * W, i + 2 * W].some((q) => q < 0 || q >= W * H || px[q * 4 + 3] < 64);
  const rim = [];
  for (let i = 0; i < W * H; i++) if (edge(i)) rim.push(i);
  for (let k = 0; k < px.length; k += 4) if (px[k + 3]) { px[k] = 14 + px[k] * 0.95; px[k + 1] = 14 + px[k + 1] * 0.95; px[k + 2] = 16 + px[k + 2] * 0.95; }
  for (const i of rim) { const k = i * 4; px[k] += (170 - px[k]) * 0.45; px[k + 1] += (160 - px[k + 1]) * 0.45; px[k + 2] += (150 - px[k + 2]) * 0.45; }
}

function make(item, src, key, worn) {
  made.set(key, null);
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    try {
      const W = img.naturalWidth, H = img.naturalHeight, cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, W, H), px = d.data;
      if (item.slot === 'weapon' || item.slot === 'off') { if (item.pal && item.pal !== 'own') paintProp(px, PROP_PALS[item.pal]); } else {
        const ramp = worn || rampFor(lookOf(item.look), item.slot, item.rarity | 0);
        if (ramp) rampMap(px, ramp, lumRange(px, (i) => px[i * 4 + 3] > 128), (i) => (px[i * 4 + 3] > 8 ? 0.85 : 0));
      }
      rimIfDark(px, W, H);
      ctx.putImageData(d, 0, 0);
      made.set(key, cv.toDataURL('image/webp', 0.9));
    } catch { made.set(key, src); }
    tell(key);
  };
  img.onerror = () => {
    missing.add(src);
    made.delete(key);
    tell(key);
  };
  img.src = src;
}

// A piece's picture as markup. ready: called once if the picture comes in after this, to draw again. worn: its ramp on
// whoever wears it, to draw it as it is on them.
export function hgIcon(item, base, ready, worn) {
  const src = srcOf(item, base);
  if (!src) return `<div class="ico hg-none" style="display:flex;align-items:center;justify-content:center;font-size:1.6em;opacity:.75">${item.slot === 'off' ? '⛨' : '⚔'}</div>`;
  const key = keyOf(item, src, worn);
  if (!made.has(key)) make(item, src, key, worn);
  const url = made.get(key);
  if (!url && ready) { const w = waiting.get(key) || new Set(); w.add(ready); waiting.set(key, w); }
  // (Its own shape, as the pack's other things have: the picture is drawn to its cells' size.)
  const z = sizeOfHG(item);
  return `<div class="ico" style="aspect-ratio:${z.w}/${z.h};background-image:url(${url || src})"></div>`;
}
