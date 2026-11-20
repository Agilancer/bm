// The ways' flights of steps (src/core/roadbed.js stairFlights), built into a Kit (src/core/sites.js), a 64 m square at a
// time: src/gfx/stairs-near.js builds the squares near the eye and lets the far ones go, as Phobos's houses are.
//
// A flight is cut into treads where its slope crosses each riser (its rise, src/core/roadbed.js): every tread a block whose
// top stands within half a riser of the slope the body walks (so a foot's never more than that off a step). A long flight has
// landings (tools/roads/bed.mjs): a level stretch, one long tread.
// How it's built goes with the way (src/core/roads.js surfaceOf), so a footpath's isn't a cathedral's (the critics):
//   a road's: pale dressed stone, two or three across, the nose a little proud, between cheek walls whose coping runs down
//     with the flight;
//   a lane's: rough fieldstone, two across, edged low in the same;
//   a footpath's: packed earth held by a log at each step's lip, a weathered timber stringer down either side;
//   a road's and a lane's landings paved, and a threshold slab out onto the way at either end;
//   timber in the fen; Velscour's black stone in the Ashen Waste. Where the snow lies, their tops rimed.
import { stairFlights } from './roadbed.js';
import { SURFACE, surfaceOf } from './roads.js';
import { groundCover } from './lands.js';
import { hash2 } from './terrain-noise.js';

export const STAIR_CELL = 64;
const ckey = (x, z) => `${Math.floor(x / STAIR_CELL)}_${Math.floor(z / STAIR_CELL)}`;
const LANDING = 1.5;   // (a tread longer than this is a landing)
const APRON = 1.4;     // (how far a road's or a lane's threshold runs out onto it)

// Each flight's treads, worked out the first time they're wanted: { sa, sb, top } (metres along the way, and the top's height),
// and its cheeks' coping over each: ca, cb, its height at sa and at sb.
function treads(f) {
  if (f.treads) return f.treads;
  const out = [], ds = 0.04, y0 = f.point(f.s0)[2], R = f.rise;
  let q = 0, start = f.s0;
  for (let s = f.s0 + ds; s < f.s1 + ds * 0.5; s += ds) {
    const k = Math.round((f.point(Math.min(s, f.s1))[2] - y0) / R);
    if (k !== q) { out.push({ sa: start, sb: s, top: y0 + q * R }); start = s; q = k; }
  }
  out.push({ sa: start, sb: f.s1, top: y0 + q * R });
  // (A sliver at either end, under a tenth of a metre, is the ground's: it goes to the tread beside it.)
  if (out.length > 1 && out[0].sb - out[0].sa < 0.1) { out[1].sa = out[0].sa; out.shift(); }
  if (out.length > 1 && out.at(-1).sb - out.at(-1).sa < 0.1) { out.at(-2).sb = out.at(-1).sb; out.pop(); }
  // The coping: through every step's nose, a hand over it (where two treads meet, over the higher), straight between, so it
  // runs down with the flight like a stair's string and is never more than a riser over a tread; along a landing, level.
  // (A straight line down a whole run stood metres over a long path's bowed one: the critics' walls.)
  for (let i = 0; i < out.length; i++) {
    const t = out[i], a = Math.max(t.top, out[i - 1]?.top ?? t.top), b = Math.max(t.top, out[i + 1]?.top ?? t.top);
    if (t.sb - t.sa > LANDING) { t.ca = t.cb = t.top + 0.1; continue; }
    t.ca = a + 0.1; t.cb = b + 0.1;
  }
  return (f.treads = out);
}

// Every square that has steps in it: key -> [[flight, first tread, last tread], ...]. (A flight's cut where it crosses from
// one square to the next, by where each tread's middle is.)
let CELLS = null;
export function stairCells() {
  if (CELLS) return CELLS;
  CELLS = new Map();
  for (const f of stairFlights()) {
    // (Its treads aren't worked out yet: cut it every 4 m by its middle, and each square works out the treads of its own.)
    let prev = null;
    for (let s = f.s0; s < f.s1; s += 4) {
      const p = f.point(Math.min(f.s1, s + 2)), k = ckey(p[0], p[1]);
      if (prev && prev.key === k) { prev.s1 = Math.min(f.s1, s + 4); continue; }
      const piece = { f, s0: s, s1: Math.min(f.s1, s + 4), key: k };
      if (!CELLS.has(k)) CELLS.set(k, []);
      CELLS.get(k).push(piece);
      prev = piece;
    }
  }
  return CELLS;
}
export function stairCellCentre(key) { const [i, j] = key.split('_').map(Number); return [(i + 0.5) * STAIR_CELL, (j + 0.5) * STAIR_CELL]; }

// How a flight's built, by what its way's laid with there, and whether the snow lies on it.
function stuff(f, x, z, y) {
  const kind = surfaceOf(f.cls, x, z), snow = groundCover(x, z, y, 0)[0] > 0.45;
  const rime = (l) => (snow ? 'frost:' + l.replace(/^\w+:/, '') : l);
  // (cheek: its edging's sides and cap, how wide and how far over the treads' highest corners its coping runs.)
  if (kind === SURFACE.ASH) return { top: 'dark:ashlar', side: 'dark:ashlar', cheek: 'dark:ashlar', cap: 'dark:ashlar', cw: 0.32, over: 0.1, across: 3 };
  if (kind === SURFACE.PLANK) return { top: 'wood', side: 'wood', cheek: 'wood', cap: 'wood', cw: 0.26, over: 0.04, across: 1 };
  // (A riser's what you see most of, looking up a flight: as pale as the tread, or the flight reads as a black trench (the
  // critics). land: a landing's paving, so a break in the climb shows; apron: a threshold out onto the way at the foot and head.)
  if (kind === SURFACE.DIRT) return { top: rime('ph_daub'), side: 'ph_daub', log: 'bark', cheek: 'pale:wood', cap: rime('pale:wood'), cw: 0.26, over: 0.03, across: 1 };
  if (kind === SURFACE.STONES) return { top: rime('pale:rubble'), side: rime('pale:rubble'), cheek: rime('rubble'), cap: rime('pale:rubble'), land: rime('pale:stone'), apron: true, cw: 0.3, over: 0.05, across: 2 };
  return { top: rime('pale:ashlar'), side: rime('pale:ashlar'), cheek: rime('ashlar'), cap: rime('pale:ashlar'), land: rime('pale:flags'), apron: true, cw: 0.32, over: 0.1, across: 3 };
}

// The steps of one square into K. lean: a phone's, one stone a tread and plainer cheeks.
export function buildStairCell(K, key, lean = false) {
  const pieces = stairCells().get(key);
  if (!pieces) return 0;
  let n = 0;
  for (const pc of pieces) {
    const f = pc.f, T = treads(f), R = f.rise, mid = f.point((pc.s0 + pc.s1) / 2), S = stuff(f, mid[0], mid[1], mid[2]);
    const hw = f.w + 0.04;
    // (A point across the flight at s: m out from its middle, at height y.)
    const at = (s, m, y) => { const [x, z, , ux, uz] = f.point(s); return [x + uz * m, y, z - ux * m]; };
    for (let i = 0; i < T.length; i++) {
      const t = T[i], sm = (t.sa + t.sb) / 2;
      if (sm < pc.s0 || sm >= pc.s1 && !(pc.s1 === f.s1 && sm <= f.s1)) continue;
      const [x, z, , ux, uz] = f.point(sm), yaw = Math.atan2(ux, uz);
      // (Which way's up: the next tread along higher, or the last one.)
      const up = (T[i + 1] ? T[i + 1].top > t.top : T[i - 1] ? T[i - 1].top < t.top : true) ? 1 : -1;
      const len = t.sb - t.sa, nose = S.log ? 0 : 0.035, hz = len / 2 + nose / 2 + 0.01, off = -up * nose / 2;
      const cx = x + ux * off, cz = z + uz * off;
      const low = Math.min(t.top, T[i - 1]?.top ?? t.top, T[i + 1]?.top ?? t.top) - R - 0.42;
      const h = hash2(Math.floor(sm * 7.3) + f.route * 131, f.route);
      // The tread: stones across, each a little off true (a phone's, one).
      const k = lean ? 1 : S.across === 3 ? (h < 0.5 ? 2 : 3) : S.across, cuts = [-hw];
      for (let j = 1; j < k; j++) cuts.push(-hw + 2 * hw * (j / k) + (hash2(i * 3 + j, f.route + 7) - 0.5) * 0.5);
      cuts.push(hw);
      const sink = S.log ? 0.02 : 0;
      for (let j = 0; j < k; j++) {
        const gap = k > 1 ? 0.004 : 0, a = cuts[j] + gap, b = cuts[j + 1] - gap, m = (a + b) / 2;
        const lift = k > 1 ? (hash2(i, j + f.route * 3) - 0.5) * 0.018 : 0, turn = k > 1 ? (hash2(j + 11, i) - 0.5) * 0.02 : 0;
        const px = cx + uz * m, pz = cz - ux * m;   // (across: (uz, -ux), as the Kit's box turns it)
        K.box(len > LANDING && S.land || S.top, px, low, pz, (b - a) / 2, t.top + lift - sink - low, hz, yaw + turn, { side: S.side, collide: false });
      }
      // At the flight's foot and head, a threshold: a slab out onto the way, from the end tread down (or up) to the way's own
      // level a metre and more on, so the way runs into the steps and doesn't stop at a kerb.
      if (S.apron && !lean) for (const [e, d] of [[f.s0, -1], [f.s1, 1]]) {
        if (!(i === 0 && d < 0 || i === T.length - 1 && d > 0)) continue;
        const o = e + d * APRON, yo = f.point(o)[2] + 0.03;
        if (!(Math.abs(yo - t.top) < 1)) continue;
        const bot = Math.min(yo, t.top) - 0.35, [s0, s1, y0, y1] = d < 0 ? [o, e, yo, t.top] : [e, o, t.top, yo];
        const P = [at(s0, -hw, y0), at(s1, -hw, y1), at(s1, hw, y1), at(s0, hw, y0)], Q = P.map((p) => [p[0], bot, p[2]]);
        K.quad(S.top, P[0], P[1], P[2], P[3]);
        for (let q = 0; q < 4; q++) K.quad(S.side, Q[q], Q[(q + 1) % 4], P[(q + 1) % 4], P[q]);
      }
      // A footpath's: a log at each step's lip, a little proud of the earth, its ends out past the path's edge.
      if (S.log && (up > 0 ? i > 0 : i + 1 < T.length)) {
        const lip = up > 0 ? t.sa : t.sb, q = f.point(lip + up * 0.055), lw = hw + 0.15 + (h - 0.5) * 0.1;
        K.box(S.log, q[0], t.top - R - 0.1, q[1], lw, R + 0.12, 0.055, yaw + (h - 0.5) * 0.06, { collide: false });
      }
      // Its cheeks, either side: an edging whose coping runs down with the flight, from under the treads up to it (a road's a
      // wall a hand over the steps; a lane's fieldstone and a footpath's a timber stringer, near flush), so the steps' sides
      // never show as a saw's teeth over the ground.
      if (S.cheek) {
        for (const sd of [-1, 1]) {
          const m0 = sd * hw, m1 = sd * (hw + S.cw), lo = low - 0.1, ca = t.ca - 0.1 + S.over, cb = t.cb - 0.1 + S.over;
          const A0 = at(t.sa, m0, lo), B0 = at(t.sb, m0, lo), A1 = at(t.sa, m1, lo), B1 = at(t.sb, m1, lo);
          const a0 = at(t.sa, m0, ca), b0 = at(t.sb, m0, cb), a1 = at(t.sa, m1, ca), b1 = at(t.sb, m1, cb);
          K.quad(S.cheek, A0, B0, b0, a0); K.quad(S.cheek, B1, A1, a1, b1);
          if (!lean) { K.quad(S.cheek, A1, A0, a0, a1); K.quad(S.cheek, B0, B1, b1, b0); }
          K.quad(S.cap, a0, b0, b1, a1, [0, 1, 0]);
        }
      }
      n++;
    }
  }
  return n;
}
