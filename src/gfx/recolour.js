// The party's colours, on pixels: the same sums for a hero's colour map (src/gfx/herolook.js) and for the pictures of their
// gear in the pack and their book (src/ui/hgicons.js), so a piece looks in the hand as it does on them.
//
// rampMap: a piece of armour dyed in one of your own gear sets' colours (assets/game/heroes/looks.json). Each texel keeps
// its own light and dark against the rest of the piece, so folds, grime, rivets and edges stay as they were; the piece as a
// whole is made about as light as the set is (an ivory set comes out pale, a black one dark), and its colour is the set's,
// taken off the set's ramp by how light the texel is and held to the ramp's middle, so a few lighter flecks don't come out
// another colour. Gold trim stays gold and skin stays skin.
// harmonize: a set's ramp turned to another's colour, so the pieces someone wears go together (partygear.js outfitRamps).
// paintProp: a weapon or shield in a palette (src/items/partygear.js PROP_PALS): what's painted turned to the palette's hue,
// wood and leather left their own, bare steel only touched with it.

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Whether a texel is someone's skin (the same test as the heroes' shading, src/gfx/materials.js heroLook).
export function isSkin(r, g, b) {
  const hi = Math.max(r, g, b) / 255, lo = Math.min(r, g, b) / 255, sat = (hi - lo) / Math.max(hi, 1e-3);
  return sat > 0.12 && sat < 0.62 && hi > 0.24 && b <= g && g <= r && (r - b) / 255 > 0.06;
}

export const lumOf = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// Skin, as a dye sees it, 0 to 1: the same test, held to skin's own reds and oranges and to skin's light, so khaki and tan
// leather are dyed (a rogue's tan hip flap left as it was is a stain on a navy coat).
const skinOf = (r, g, b) => (isSkin(r, g, b) && (g - b) < 0.5 * (r - b) ? smooth(0.4, 0.56, Math.max(r, g, b) / 255) : 0);

// A colour ([r, g, b], 0 to 255) as [hue 0-1, colourfulness 0-1, brightness 0-1], and back.
export function hsvOf(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 1e-6) h = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  return [h, max > 1e-6 ? d / max : 0, max];
}
export function fromHsv(h, s, v) {
  const f = (n) => { const x = (n + h * 6) % 6; return (v - v * s * Math.max(0, Math.min(x, 4 - x, 1))) * 255; };
  return [f(5), f(3), f(1)];
}

// The darkest and lightest of the texels where keep(i) says, as the 4th and 96th of every hundred: what a ramp is laid over.
// (Of what the dye moves: its gold trim, kept gold (goldOf), isn't counted, or a suit that's half gilt measures light, and its
// plate between, laid over the ramp's dark end, comes out dark: a paladin's purple under an ivory set is bronze. All of it,
// if it's nearly all gold.)
export function lumRange(px, keep) {
  const hist = new Uint32Array(256), all = new Uint32Array(256);
  let n = 0, na = 0;
  for (let i = 0, k = 0; k < px.length; i++, k += 4) {
    if (keep && !keep(i)) continue;
    const v = Math.round(lumOf(px[k], px[k + 1], px[k + 2]) * 255);
    all[v]++; na++;
    if (goldOf(px[k], px[k + 1], px[k + 2]) > 0.5) continue;
    hist[v]++; n++;
  }
  if (n < 0.2 * na) { hist.set(all); n = na; }
  if (!n) return [0, 1];
  const at = (q) => { let c = 0; for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= q * n) return v / 255; } return 1; };
  const lo = at(0.04), hi = at(0.96);
  return hi - lo < 0.08 ? [Math.max(0, lo - 0.1), Math.min(1, hi + 0.1)] : [lo, hi];
}

// Where a mask (1s and 0s, W x H) is wide: what's left of it after it's worn back by r texels all round and grown out again
// by as much (an opening, by running sums). A line narrower than 2r + 1 is gone; a field is kept, to its edges.
export function wideOf(m, W, H, r) {
  const pass = (src, keep) => {
    const a = new Uint8Array(src.length), b = new Uint8Array(src.length);
    for (let y = 0; y < H; y++) {
      const o = y * W;
      let s = 0;
      for (let x = -r; x < W; x++) {
        if (x + r < W) s += src[o + x + r];
        if (x - r - 1 >= 0) s -= src[o + x - r - 1];
        if (x >= 0) a[o + x] = keep(s, Math.min(W - 1, x + r) - Math.max(0, x - r) + 1) ? 1 : 0;
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -r; y < H; y++) {
        if (y + r < H) s += a[(y + r) * W + x];
        if (y - r - 1 >= 0) s -= a[(y - r - 1) * W + x];
        if (y >= 0) b[y * W + x] = keep(s, Math.min(H - 1, y + r) - Math.max(0, y - r) + 1) ? 1 : 0;
      }
    }
    return b;
  };
  return pass(pass(m, (s, n) => s === n), (s) => s > 0);
}

// Where a mask (1s and 0s, W x H) runs long: its pieces (joined side to side, not corner to corner) at least L texels long
// one way or the other, grown out by a texel. A trim band is long; a fleck, a curl of embroidery, a lit knuckle of brass
// relief isn't.
export function linesOf(m, W, H, L) {
  const keep = new Uint8Array(m.length), seen = new Uint8Array(m.length), stack = new Int32Array(m.length), part = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || seen[s]) continue;
    let top = 0, x0 = W, x1 = -1, y0 = H, y1 = -1;
    part.length = 0; stack[top++] = s; seen[s] = 1;
    while (top) {
      const i = stack[--top], x = i % W, y = (i / W) | 0;
      part.push(i);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && m[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[top++] = i - 1; }
      if (x < W - 1 && m[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[top++] = i + 1; }
      if (y > 0 && m[i - W] && !seen[i - W]) { seen[i - W] = 1; stack[top++] = i - W; }
      if (y < H - 1 && m[i + W] && !seen[i + W]) { seen[i + W] = 1; stack[top++] = i + W; }
    }
    if (Math.max(x1 - x0, y1 - y0) + 1 >= L) for (const i of part) keep[i] = 1;
  }
  const out = new Uint8Array(m.length);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    out[i] = keep[i] || (x > 0 && keep[i - 1]) || (x < W - 1 && keep[i + 1]) || (y > 0 && keep[i - W]) || (y < H - 1 && keep[i + W]) ? 1 : 0;
  }
  return out;
}

// The texels of px (RGBA) that are a(i) made as light as the ones that are b(i): their middle on b's middle, their spread
// on b's (a little more at most), their colour as it was. Fewer than 50 of either and nothing is done.
export function matchLum(px, a, b) {
  const la = [], lb = [];
  for (let i = 0, k = 0; k < px.length; i++, k += 4) { if (a(i)) la.push(lumOf(px[k], px[k + 1], px[k + 2])); else if (b(i)) lb.push(lumOf(px[k], px[k + 1], px[k + 2])); }
  if (la.length < 50 || lb.length < 50) return;
  la.sort((x, y) => x - y); lb.sort((x, y) => x - y);
  const q = (L, p) => L[Math.floor(p * (L.length - 1))];
  const mA = q(la, 0.5), mB = q(lb, 0.5), k2 = Math.min(1.2, Math.max(0.02, q(lb, 0.8) - q(lb, 0.2)) / Math.max(0.02, q(la, 0.8) - q(la, 0.2)));
  for (let i = 0, k = 0; k < px.length; i++, k += 4) {
    if (!a(i)) continue;
    const l = lumOf(px[k], px[k + 1], px[k + 2]), f = Math.max(0.01, mB + (l - mA) * k2) / Math.max(0.004, l);
    px[k] *= f; px[k + 1] *= f; px[k + 2] *= f;
  }
}

// Each texel of px (RGBA, W x H) that's bad(i) made the mean of the good(i) ones within r of it (a square), if there are
// any: a fleck painted out with what's round it.
export function fillFrom(px, W, H, bad, good, r) {
  const src = px.slice();
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    if (!bad(i)) continue;
    let R = 0, G = 0, B = 0, n = 0;
    for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) {
      const j = yy * W + xx;
      if (!good(j)) continue;
      R += src[j * 4]; G += src[j * 4 + 1]; B += src[j * 4 + 2]; n++;
    }
    if (n) { px[i * 4] = R / n; px[i * 4 + 1] = G / n; px[i * 4 + 2] = B / n; }
  }
}

// keep (0 or 1 a texel, W x H) grown a texel at a time, steps times, into the texels that can(i) be: a line grown over
// its own edge.
export function growInto(keep, W, H, can, steps) {
  for (let s = 0; s < steps; s++) {
    const add = [];
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      if (keep[i] || !can(i)) continue;
      if ((x > 0 && keep[i - 1]) || (x < W - 1 && keep[i + 1]) || (y > 0 && keep[i - W]) || (y < H - 1 && keep[i + W])) add.push(i);
    }
    if (!add.length) break;
    for (const i of add) keep[i] = 1;
  }
  return keep;
}

// The texels of px (RGBA) that are sel(i) made a polished gold, each as light in it as it was among them: a weathered
// brass's trim, kept as it was on an ivory outfit, was a dull ochre as light as the plate and its shading brown, a rust.
export function polishGold(px, sel) {
  const L = [];
  for (let i = 0, k = 0; k < px.length; i++, k += 4) if (sel(i)) L.push(lumOf(px[k], px[k + 1], px[k + 2]));
  if (!L.length) return;
  L.sort((a, b) => a - b);
  const lo = L[Math.floor(0.05 * (L.length - 1))], span = Math.max(0.02, L[Math.floor(0.95 * (L.length - 1))] - lo);
  for (let i = 0, k = 0; k < px.length; i++, k += 4) {
    if (!sel(i)) continue;
    const t = Math.min(1, Math.max(0, (lumOf(px[k], px[k + 1], px[k + 2]) - lo) / span));
    const c = fromHsv(Math.min(0.125, Math.max(0.105, hsvOf([px[k], px[k + 1], px[k + 2]])[0])), 0.7 - 0.2 * t, 0.55 + 0.4 * t);
    px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
  }
}

// How metal a prop's texel is, 0 to 255, as renderer.js's prop shader (materials.js PROP) guesses it from its colour, in
// linear light: a grey steel is, a coloured paint or a dark one isn't. For a painted prop, guessed from its own picture
// before it's painted and carried in the alpha: a bleached board, all white and pale grey, is all steel by its paint, and
// mirrored the ground in every facet of it, a brown stain.
const LIN = Float32Array.from({ length: 256 }, (_, c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4));
export function propMetal(px) {
  const out = new Uint8Array(px.length / 4);
  for (let i = 0, k = 0; k < px.length; i++, k += 4) {
    const r = LIN[px[k]], g = LIN[px[k + 1]], b = LIN[px[k + 2]], mx = Math.max(r, g, b), sat = (mx - Math.min(r, g, b)) / Math.max(mx, 0.001);
    out[i] = Math.round(255 * (1 - smooth(0.15, 0.4, sat)) * smooth(0.1, 0.26, mx));
  }
  return out;
}

// One colour off a ramp of stops ([[r, g, b], ...], darkest first), at t from 0 to 1.
export function rampAt(ramp, t, out) {
  const n = ramp.length - 1, x = Math.min(n, Math.max(0, t * n)), i = Math.min(n - 1, Math.floor(x)), f = x - i;
  const a = ramp[i], b = ramp[i + 1];
  out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f;
  return out;
}

// How much of a texel's light the ramp's own may move it (the rest is the piece's), how far its colour may wander from the
// ramp's middle with its light, the most colourful a dyed texel comes out, and how far a piece is made lighter or darker
// as a whole to be as light as its set.
const VALUE_PULL = 0.2, CHROMA_FOLLOW = 0.3, MAX_SAT = 0.5, GAIN = [0.65, 2.2];
// On a pale outfit, the light its darks are drawn halfway up to.
const PALE_TOE = 0.48;
// (And all its light drawn this far toward its ramp's middle: its own painted shading and the trim's old gold, at their full
// spread, were a grey mottle over ivory plate, a camouflage. Its relief is in its normals.)
const PALE_SQUEEZE = 0.6;

// How much a texel is gold trim (a yellow, bright enough and coloured enough, not a leather's red-brown): 0 to 1. Gold
// keeps its own colour under any dye, as the owner's suits' trim does on the body it was made for.
export function goldOf(r, g, b) {
  const [h, s, v] = hsvOf([r, g, b]);
  return smooth(0.085, 0.11, h) * (1 - smooth(0.16, 0.19, h)) * smooth(0.3, 0.45, s) * smooth(0.2, 0.38, v);
}
// How much a texel is gold on metal, 0 to 1: a trim, kept whole even where it's a weak gold. (An archer's thin trim, a
// dull gold, took the dye in part by goldOf alone and came out an olive line on her green, lost. Only on metal: a tan
// leather strap isn't trim, and left tan it's a stain on a navy coat.) m: the texel's metalness, 0 to 1.
export const trimOf = (r, g, b, m) => smooth(0.15, 0.4, goldOf(r, g, b)) * smooth(0.3, 0.5, m);

// px: RGBA bytes, changed in place. ramp: the set's stops. range: [lo, hi] (lumRange). amount(i, k): how much of the dye
// goes on texel i (k = i * 4), 0 to 1, or 0 to leave it. most: the most a piece is made lighter as a whole. Past the usual
// most (a paladin's pale outfit: partygear.js paleLift), it's lifted by a curve instead, its dark more than its light, so a
// deep purple cape under bright plate comes out light, and the plate's highs aren't driven to white.
export function rampMap(px, ramp, range, amount, most = GAIN[1]) {
  const [lo, hi] = range, span = Math.max(0.02, hi - lo), c = [0, 0, 0];
  // (The ramp's colour at its middle, at a brightness of one: what every texel's colour leans to.)
  rampAt(ramp, 0.5, c);
  const ml = Math.max(0.03, lumOf(c[0], c[1], c[2])), mid = [c[0] / 255 / ml, c[1] / 255 / ml, c[2] / 255 / ml];
  const ml0 = Math.min(0.9, Math.max(0.05, (lo + hi) / 2)), gain = Math.min(most, Math.max(GAIN[0], ml / ml0));
  const curve = most > GAIN[1], gam = Math.min(1, Math.max(1 / most, Math.log(ml) / Math.log(ml0)));
  for (let i = 0, k = 0; k < px.length; i++, k += 4) {
    let a = amount(i, k);
    if (a <= 0) continue;
    const r = px[k], g = px[k + 1], b = px[k + 2];
    // (Skin is left as it is; but not on a pale outfit, a paladin's plate from head to foot, where what passes for skin is
    // rust, and was left brown in ivory.)
    a *= (curve ? 1 : 1 - skinOf(r, g, b)) * (1 - 0.9 * goldOf(r, g, b));
    if (a <= 0) continue;
    const l = lumOf(r, g, b), t = Math.min(1, Math.max(0, (l - lo) / span));
    rampAt(ramp, t, c);
    const lc = Math.max(0.03, lumOf(c[0], c[1], c[2]));
    // Its light: its own, the piece made as light as the set, a little the ramp's here. Its colour: the ramp's here, at a
    // brightness of one, held near the ramp's middle.
    // (A pale outfit's own light is pulled further to the ramp's: its grime and the shadows in its torn hem, lifted, were
    // freckles and holes in ivory.)
    let L0 = Math.min(0.95, curve ? Math.pow(l, gam) : l * gain), L = L0 + (lc - L0) * (curve ? 0.4 : VALUE_PULL);
    // (And its darkest half as far under the plate: a paladin's black gloves, lifted only by the curve, were still near
    // black under silver vambraces.)
    if (curve && L < PALE_TOE) L = PALE_TOE - (PALE_TOE - L) * 0.4;
    if (curve) L = ml + (L - ml) * PALE_SQUEEZE;
    let R = (mid[0] + (c[0] / 255 / lc - mid[0]) * CHROMA_FOLLOW) * L - L;
    let G = (mid[1] + (c[1] / 255 / lc - mid[1]) * CHROMA_FOLLOW) * L - L;
    let B = (mid[2] + (c[2] / 255 / lc - mid[2]) * CHROMA_FOLLOW) * L - L;
    // (R, G, B: how far from a grey of that light. Never garish: past MAX_SAT, drawn back toward the grey; and never past
    // white or black, which would turn its colour: drawn back too, so a light texel of a dark set is a pale one of it.)
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx + L > 1e-4 ? (mx - mn) / (mx + L) : 0;
    let q = sat > MAX_SAT ? MAX_SAT / sat : 1;
    if (mx * q > 1 - L) q = (1 - L) / mx;
    if (mn * q < -L) q = L / -mn;
    R = (L + R * q) * 255; G = (L + G * q) * 255; B = (L + B * q) * 255;
    px[k] = r + (R - r) * a; px[k + 1] = g + (G - g) * a; px[k + 2] = b + (B - b) * a;
  }
}

// Whether a ramp is gold: its middle a yellow to an orange, coloured and light enough. A set's gold piece goes with any coat.
export function goldRamp(ramp) {
  const [h, s, v] = hsvOf(ramp[Math.floor(ramp.length / 2)]);
  return h > 0.07 && h < 0.17 && s > 0.3 && v > 0.35;
}

// Whether a ramp is a grey, white or black: hardly any colour at its middle stops.
export function plainRamp(ramp) {
  let s = 0;
  for (const i of [1, 2, 3]) s += hsvOf(ramp[Math.min(i, ramp.length - 1)])[1];
  return s / 3 < 0.1;
}

// A ramp turned to an outfit's colour: its hue the anchor's middle one (with a breath of its own lean, and its stops'
// own spread, both held small), its colourfulness most of the way to the anchor's, its own light and dark kept. A grey, white or
// black ramp goes with anything and is left; against a plain outfit, a colourful one is muted.
export function harmonize(ramp, anchor) {
  if (plainRamp(ramp)) return ramp;
  const wrap = (x) => x - Math.round(x);
  const am = hsvOf(anchor[Math.floor(anchor.length / 2)]), om = hsvOf(ramp[Math.floor(ramp.length / 2)]);
  if (plainRamp(anchor)) return ramp.map((c) => { const [h, s, v] = hsvOf(c); return fromHsv(h, s * 0.4, v); });
  const lean = Math.max(-0.03, Math.min(0.03, wrap(om[0] - am[0]) * 0.15));
  return ramp.map((c, i) => {
    const [h, s, v] = hsvOf(c);
    const spread = Math.max(-0.02, Math.min(0.02, wrap(h - om[0]) * 0.3));
    const sa = hsvOf(anchor[i] || anchor[anchor.length - 1])[1];
    return fromHsv((am[0] + lean + spread + 2) % 1, s + (sa - s) * 0.65, v);
  });
}

// A ramp as rich as a piece's rarity: a common one worn and dull, the rarer the fuller its colour (0 common to 5 mythical).
const RICH = [0.55, 0.68, 0.8, 0.9, 1, 1.08];
export function richer(ramp, rarity) {
  const q = RICH[Math.max(0, Math.min(5, rarity | 0))];
  return ramp.map((c) => { const [h, s, v] = hsvOf(c); return fromHsv(h, Math.min(1, s * q), v); });
}

// px: RGBA bytes, changed in place. pal: { hue (degrees, or null to keep each texel's own), sat, val, metal }.
export function paintProp(px, pal) {
  if (!pal || (pal.hue == null && (pal.sat ?? 1) === 1 && (pal.val ?? 1) === 1)) return;
  const H = pal.hue == null ? null : (((pal.hue % 360) + 360) % 360) / 360, S = pal.sat ?? 1, V = pal.val ?? 1, M = pal.metal ?? 0.08;
  for (let k = 0; k < px.length; k += 4) {
    if (px[k + 3] === 0) continue;
    let [h, s, v] = hsvOf([px[k], px[k + 1], px[k + 2]]);
    if (H != null) {
      // (Painted: turned to the palette's hue, the more the more it's coloured. Wood and leather, browns: their own.
      // Bare steel, grey: only a breath of it.)
      // (Its painted colour and its steel's tint are made whole and mixed in by how much it is each, as colours, not by
      // turning its hue part way: a tan wrap half turned to azure would pass through green.)
      const brown = smooth(0.02, 0.05, h) * (1 - smooth(0.14, 0.17, h)) * smooth(0.06, 0.14, s) * (1 - smooth(0.8, 0.9, v));
      const w = smooth(0.14, 0.34, s) * smooth(0.08, 0.2, v) * (1 - brown);
      const steel = (1 - smooth(0.1, 0.18, s)) * smooth(0.25, 0.4, v) * (1 - brown);
      const painted = fromHsv(H, Math.min(0.65, s * S), Math.min(1, v * V));
      const tinted = fromHsv(H, Math.min(MAX_SAT, s + M), Math.min(1, v * (1 + (V - 1) * 0.4)));
      const r0 = px[k], g0 = px[k + 1], b0 = px[k + 2], ws = steel * (1 - w);
      px[k] = r0 + (painted[0] - r0) * w + (tinted[0] - r0) * ws;
      px[k + 1] = g0 + (painted[1] - g0) * w + (tinted[1] - g0) * ws;
      px[k + 2] = b0 + (painted[2] - b0) * w + (tinted[2] - b0) * ws;
      continue;
    }
    // (Bleached is faded: its darks lifted toward its lights, so black art on a white board is a grey relief, not a
    // camouflage.)
    if (pal.floor) v = pal.floor + (1 - pal.floor) * v;
    s = Math.min(1, s * S); v = Math.min(1, v * V);
    const c = fromHsv(h, s, v);
    px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2];
  }
}
