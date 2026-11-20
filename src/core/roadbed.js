// The roads' bed: every way out in the land (src/core/lands.js ROUTES) laid level from one edge to the other, as a road is
// built, and eased along its length into a grade a body or a cart could take, cut into the rises and banked up over the dips.
// Its banks run back to the land's own lie either side, steeper where the cut or the fill is deeper. Where a way still has to
// climb harder than a road can, it goes up in steps (STAIRS, drawn by src/gfx/stairs-near.js): the ground under them is the
// even slope of the flight, so a body walks it as the cave's steps are walked (src/core/opening.js wayDip).
//
// The heights along each way are worked out once by tools/roads/bed.mjs into src/core/roadbed-data.js (never by hand: run it
// again whenever the ways or the land change; tests/roadbed.test.mjs says when it's due). terrainHeight asks bedHeight.
import { ROUTES } from './lands.js';
import { BED, BED_COUNT, KEEP } from './roadbed-data.js';

const fade = (m) => 3 * Math.min(m, 2) + 0.08 * Math.max(0, m - 2);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Metres between the heights kept along a way.
export const BED_STEP = 4;
// Past its edge, how far a way's own level runs on before its bank starts; and the narrowest and widest a bank can be.
export const SHOULDER = 0.6, BANK_MIN = 4, BANK_MAX = 16;
// A riser's height.
export const RISE = 0.16;
// (The most a riser's let grow to where a flight climbs hard, so its treads keep a boot's length, TREAD_MIN.)
export const RISE_MAX = 0.21, TREAD_MIN = 0.3;
// What isn't laid: the town's own ground (its paths are on its green), and inside Phobos's wall (its streets are its own).
export const NO_BED = -32768;

// Each way's middle, a point every `step` metres along it and its last: [[x, z, s], ...] (s: metres along it).
export function routeSamples(pts, step) {
  const out = [];
  let s = 0, carry = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-6) continue;
    let u = carry;
    for (; u < L - 1e-6; u += step) out.push([ax + (bx - ax) * u / L, az + (bz - az) * u / L, s + u]);
    carry = u - L; s += L;
  }
  const last = pts[pts.length - 1];
  if (!out.length || Math.hypot(out.at(-1)[0] - last[0], out.at(-1)[1] - last[1]) > 1e-3) out.push([last[0], last[1], s]);
  return out;
}

// ---------------------------------------------------------------- the heights, decoded

// BED: for each route in ROUTES order, its heights at routeSamples(pts, BED_STEP) (Int16, 1/32 m; NO_BED where it isn't laid),
// as base64; then its flights of steps, [s0, s1, ...] metres along it.
function decode(b64) {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Int16Array(u8.buffer);
}

// Every stretch of every laid way between two kept heights, in 32 m squares (each in every square its bank can reach):
// [ax, az, bx, bz, ya, yb, half-width, flight] eight to a stretch.
const CELL = 32, REACH = SHOULDER + BANK_MAX;
const key = (i, j) => (i + 4096) * 8192 + (j + 4096);
let GRID = null, STRETCH = null;
const KEEP_R = 2.5, KEEPS = new Map();
for (const [x, z] of KEEP || []) for (let i = Math.floor((x - 7) / CELL); i <= Math.floor((x + 7) / CELL); i++) for (let j = Math.floor((z - 7) / CELL); j <= Math.floor((z + 7) / CELL); j++) {
  const k = key(i, j);
  if (!KEEPS.has(k)) KEEPS.set(k, []);
  KEEPS.get(k).push(x, z);
}
export const STAIRS = [];   // { route, name, w, cls, s0, s1, point(s) -> [x, z, y, ux, uz] }
export let bedStale = false;

function build() {
  GRID = new Map();
  const list = [];
  if (globalThis.__bmNoBed || globalThis.__bmNoWays || !BED || BED_COUNT !== ROUTES.length) {
    if (!globalThis.__bmNoBed && !globalThis.__bmNoWays && BED_COUNT !== ROUTES.length) { bedStale = true; console.warn('roadbed: the ways have changed since tools/roads/bed.mjs was run; roads are laid on the land as it lies'); }
    STRETCH = new Float32Array(0);
    return;
  }
  ROUTES.forEach((r, n) => {
    const e = BED[n];
    if (!e) return;
    const ys = decode(e[0]), at = routeSamples(r.pts, BED_STEP);
    if (ys.length !== at.length) { bedStale = true; return; }
    const flights = e[1] || [];
    const inFlight = (s) => { for (let k = 0; k < flights.length; k += 2) if (s >= flights[k] - 0.01 && s <= flights[k + 1] + 0.01) return 1; return 0; };
    for (let i = 0; i + 1 < at.length; i++) {
      if (ys[i] === NO_BED || ys[i + 1] === NO_BED) continue;
      list.push(at[i][0], at[i][1], at[i + 1][0], at[i + 1][1], ys[i] / 32, ys[i + 1] / 32, r.w, inFlight((at[i][2] + at[i + 1][2]) / 2));
    }
    // (Each flight: where along it it starts and ends, and how to find a point on it: its middle and its slope's height there,
    // and which way it runs.)
    for (let k = 0; k < flights.length; k += 2) {
      const at4 = at, ys4 = ys;
      const point = (s) => {
        let i = Math.max(0, Math.min(at4.length - 2, Math.floor(s / BED_STEP)));
        while (i > 0 && at4[i][2] > s) i--;
        while (i < at4.length - 2 && at4[i + 1][2] < s) i++;
        const a = at4[i], b = at4[i + 1], L = b[2] - a[2] || 1, t = Math.max(0, Math.min(1, (s - a[2]) / L));
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (ys4[i] + (ys4[i + 1] - ys4[i]) * t) / 32, (b[0] - a[0]) / L, (b[1] - a[1]) / L];
      };
      // (Its riser: RISE, or more where it climbs hard, so no tread's shorter than a boot: TREAD_MIN at its steepest.)
      let g = 0;
      for (let i = 0; i + 1 < at.length; i++) if (at[i + 1][2] > flights[k] + 0.01 && at[i][2] < flights[k + 1] - 0.01) g = Math.max(g, Math.abs(ys[i + 1] - ys[i]) / 32 / (at[i + 1][2] - at[i][2] || 1));
      STAIRS.push({ route: n, name: r.name, w: r.w, cls: r.cls, s0: flights[k], s1: flights[k + 1], point, rise: Math.max(RISE, Math.min(RISE_MAX, g * TREAD_MIN)) });
    }
  });
  STRETCH = Float32Array.from(list);
  // (Let go by hand: each flight's `point` above is a function made in here, and holds on to everything this one named,
  // this list of 6.5 MB among it, in every thread that asks the land's height: eight of them.)
  list.length = 0;
  for (let o = 0; o < STRETCH.length; o += 8) {
    const ax = STRETCH[o], az = STRETCH[o + 1], bx = STRETCH[o + 2], bz = STRETCH[o + 3], m = STRETCH[o + 6] + REACH;
    for (let i = Math.floor((Math.min(ax, bx) - m) / CELL); i <= Math.floor((Math.max(ax, bx) + m) / CELL); i++)
      for (let j = Math.floor((Math.min(az, bz) - m) / CELL); j <= Math.floor((Math.max(az, bz) + m) / CELL); j++) {
        const k = key(i, j);
        let l = GRID.get(k);
        if (!l) GRID.set(k, (l = []));
        l.push(o);
      }
  }
  for (const [k, l] of GRID) GRID.set(k, Int32Array.from(l));
}

// The land at (x, z), h as it lies, with the ways' beds laid into it.
export function bedHeight(x, z, h) {
  if (!GRID) build();
  const l = GRID.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!l) return h;
  const S = STRETCH;
  // (Each stretch near asks for its own level, as much as it's near: the one you're on has all the say, so a switchback's turn
  // below or above it never drags it, and where two ways cross, both full on, they share it; they were laid to agree.
  // A stretch speaks for what's alongside it: past its ends its say fades fast, so the next one along has it (on a steep way
  // the two ends' heights would pull the level about); round the outside of a bend, alongside neither, the two share the corner.
  // Every say goes up and down smoothly, so the land never steps.)
  let sw = 0, sy = 0, most = 0, top = -Infinity;
  for (let n = 0; n < l.length; n++) {
    const o = l[n], ax = S[o], az = S[o + 1], dx = S[o + 2] - ax, dz = S[o + 3] - az, L2 = dx * dx + dz * dz;
    const u = L2 > 0 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0, t = Math.max(0, Math.min(1, u));
    const ex = ax + dx * t - x, ez = az + dz * t - z, d2 = ex * ex + ez * ez, w = S[o + 6] + SHOULDER;
    if (d2 > (w + BANK_MAX) * (w + BANK_MAX)) continue;
    const y = S[o + 4] + (S[o + 5] - S[o + 4]) * t, d = Math.sqrt(d2);
    // (A bank twice as wide as the cut or the fill is deep, and no narrower than 4 m: a slope that grows over.)
    const bank = Math.max(BANK_MIN, Math.min(BANK_MAX, Math.abs(y - h) * 2.2));
    const m = 1 - sstep(w, w + bank, d), say = 1 - sstep(w, w + BANK_MAX, d);
    if (say <= 0) continue;
    most = Math.max(most, m);
    // (Its say: whole on it, and falling away past its edge, over the most a bank can reach whatever its own is (were it to end
    // with its bank, one that had the say could lose it within a hand's width: a step in the land, 2026-11-19) (so a way that comes in from the side never tips the one it's
    // joined to) and past either end (so the next stretch along has it): fast for two metres, then slowly, so where two ways'
    // banks meet, one high and one low, the land between goes from the one to the other over metres, not at a cliff.)
    // (Kept as logarithms, the sums scaled to the greatest so far: far off every way they'd all be too small for a number.)
    const over = Math.abs(u - t) * Math.sqrt(L2), e = Math.log(say) - fade(Math.max(0, d - w)) - fade(over);
    if (e > top) { const f = Math.exp(top - e); sw *= f; sy *= f; top = e; }
    const k = Math.exp(e - top);
    sw += k; sy += k * y;
  }
  if (!(sw > 0)) return h;
  // (Round where people stand by a road, its banks let back to the land: KEEP, from tools/roads/bed.mjs.)
  const kl = KEEPS.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (kl) for (let n = 0; n < kl.length; n += 2) { const d = Math.hypot(x - kl[n], z - kl[n + 1]); if (d < KEEP_R + 4) most *= sstep(KEEP_R, KEEP_R + 4, d); }
  return h + (sy / sw - h) * most;
}

// How far the ground's drawn below a flight's slope there (src/sim/job.worker.js): the steps stand over it, and it mustn't
// show through their treads. 0 off every flight.
export function stairDip(x, z) {
  if (!GRID) build();
  const l = GRID.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!l) return 0;
  const S = STRETCH;
  let dip = 0;
  for (let n = 0; n < l.length; n++) {
    const o = l[n];
    if (!S[o + 7]) continue;
    const ax = S[o], az = S[o + 1], dx = S[o + 2] - ax, dz = S[o + 3] - az, L2 = dx * dx + dz * dz;
    // (Only alongside it, not round past its ends: the ground at a flight's foot and head is the way's own.)
    let t = L2 > 0 ? ((x - ax) * dx + (z - az) * dz) / L2 : -1;
    if (t < -0.01 || t > 1.01) continue;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z), w = S[o + 6];
    // (Sunk to just under the cheeks' outer face, src/core/stairs.js (all a quarter metre wide and more), and no further: no ditch beside them.)
    dip = Math.max(dip, 0.32 * (1 - sstep(w + 0.3, w + 0.5, d)));
  }
  return dip;
}

// Whether (x, z) is within m of a flight's edge (src/core/rocks.js keeps its stones off them, and their banks).
export function nearFlight(x, z, m) {
  if (!GRID) build();
  const l = GRID.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!l) return false;
  const S = STRETCH;
  for (let n = 0; n < l.length; n++) {
    const o = l[n];
    if (!S[o + 7]) continue;
    const ax = S[o], az = S[o + 1], dx = S[o + 2] - ax, dz = S[o + 3] - az, L2 = dx * dx + dz * dz;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
    if (Math.hypot(ax + dx * t - x, az + dz * t - z) < S[o + 6] + m) return true;
  }
  return false;
}

// The flights, worked out (once) from the kept heights.
export function stairFlights() { if (!GRID) build(); return STAIRS; }
