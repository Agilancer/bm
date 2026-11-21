// What's inside each of Phobos's houses, and who sleeps where (the owner, 2026-11-20: "go from house to house throughout
// the entire game ... add some small details here and there that make it stand out and make each house a little different.
// Make sure all the layouts make sense, that the stairs make sense ... Make sure everyone has beds too in phobos").
//
// src/core/phobos-build.js builds a house's shell, its stair and its upstairs floor (houseNear, upstairsNear). This lays out
// its rooms: roomPlan(h, F, up) says, the same on every thread, what kind of household lives there and what stands on each
// floor, kept clear of the stair, the way in and the hearth; furnish(K, ...) draws it from near. Its beds are where the
// city's people lie down at night (src/core/phobos-homes.js, src/folk/brain.js phSleep).
//
// How a town house of the time was laid out (Pantin's and Schofield's plans of English town houses; Tackley's Inn, Oxford):
// the shop or the hall on the street, its board under the front window where the street was served through it; the hall's
// hearth on the party wall behind, the table by it; the chambers over, the best at the back over the hall, by the stack's
// warmth, a lesser one over the street; the stair straight up a side wall from the door. The poorest had one room and slept
// by the fire on straw; a lodging house was beds and pallets end to end.
//
// Frame: as phobos-build.js: local x across the house (the stair up its -x wall), w out through its front (local z times
// h.front). Every piece is a record { k, x, w, F: [fx, fw] (the way its front faces), hu, hv (half its width and depth, in
// its own frame), y, ... } placed on a grid of the floor so nothing stands in anything else, nor on the stair, in the way in
// or before the fire. No piece makes a cross or a T (the V/T rule): no bar across a post, no rail on a centre post.
import { hash2 } from './terrain-noise.js';

export const WALL = 0.45, DOOR = 0.8, SW = 1.25;
const CELL = 0.1;
const idOf = (h) => Math.round(h.x * 7 + h.z * 13);

// ---------------------------------------------------------------- the floor's grid

// The floor of a storey as a grid of 10 cm cells, 1 where something is (or must be kept clear).
class Grid {
  constructor(ix, iz) { this.ix = ix; this.iz = iz; this.nx = Math.ceil(2 * ix / CELL); this.nw = Math.ceil(2 * iz / CELL); this.a = new Uint8Array(this.nx * this.nw); this.S = null; }
  span(x0, x1, w0, w1) {
    return [Math.max(0, Math.floor((x0 + this.ix) / CELL + 1e-6)), Math.min(this.nx - 1, Math.ceil((x1 + this.ix) / CELL - 1e-6) - 1), Math.max(0, Math.floor((w0 + this.iz) / CELL + 1e-6)), Math.min(this.nw - 1, Math.ceil((w1 + this.iz) / CELL - 1e-6) - 1)];
  }
  // (The pieces' share of a band of the floor's rows, not counting what's kept clear: the stair, the ways, the hearth.)
  used(w0 = -this.iz, w1 = this.iz) { const c = Math.max(0, Math.floor((w0 + this.iz) / CELL)), d = Math.min(this.nw, Math.ceil((w1 + this.iz) / CELL)); let n = 0, k = 0; for (let i = c * this.nx; i < d * this.nx; i++) { n += this.a[i] === 1; k += this.a[i] === 2; } return n / Math.max(1, (d - c) * this.nx - k); }
  block(x0, x1, w0, w1, v = 1) { const [a, b, c, d] = this.span(x0, x1, w0, w1); for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) if (this.a[j * this.nx + i] !== 2) this.a[j * this.nx + i] = v; this.S = null; }
  keep(x0, x1, w0, w1) { this.block(x0, x1, w0, w1, 2); }
  // (Whether a rect's clear, from a table of the sums of the grid's corners: a piece is tried at a thousand places and
  // more, and each try was a count over its cells.)
  free(x0, x1, w0, w1) {
    if (x0 < -this.ix - 1e-6 || x1 > this.ix + 1e-6 || w0 < -this.iz - 1e-6 || w1 > this.iz + 1e-6) return false;
    const nx = this.nx, W = nx + 1;
    if (!this.S) { const S = this.S = new Int32Array(W * (this.nw + 1)); for (let j = 0; j < this.nw; j++) { let row = 0; for (let i = 0; i < nx; i++) { row += this.a[j * nx + i] ? 1 : 0; S[(j + 1) * W + i + 1] = S[j * W + i + 1] + row; } } }
    const a = Math.max(0, Math.floor((x0 + this.ix) / CELL + 1e-6)), b = Math.min(nx - 1, Math.ceil((x1 + this.ix) / CELL - 1e-6) - 1);
    const c = Math.max(0, Math.floor((w0 + this.iz) / CELL + 1e-6)), d = Math.min(this.nw - 1, Math.ceil((w1 + this.iz) / CELL - 1e-6) - 1);
    if (b < a || d < c) return true;
    const S = this.S;
    return S[(d + 1) * W + b + 1] - S[c * W + b + 1] - S[(d + 1) * W + a] + S[c * W + a] === 0;
  }
}
// What fn places, placed with a rect of g kept clear as well (and the rect given back after).
function clearOf(g, x0, x1, w0, w1, fn) {
  const [a, b, c, d] = g.span(x0, x1, w0, w1), was = [];
  for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) { const k = j * g.nx + i; was.push(g.a[k]); if (!g.a[k]) g.a[k] = 3; }
  g.S = null;
  const p = fn();
  let n = 0;
  for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) { const k = j * g.nx + i; if (g.a[k] === 3) g.a[k] = was[n]; n++; }
  g.S = null;
  return p;
}
// A piece's footprint in the house's x and w: its half width hu across its front, half depth hv toward it.
const foot = (F, hu, hv) => (F[0] === 0 ? [hu, hv] : [hv, hu]);

// Place a piece of half size hu, hv (in its own frame) on grid g. at: 'wall' (its back to one of walls, facing in), or
// 'free' (anywhere, facing face or along the room). pad: room kept clear before its front (to sit, to stand at it) and
// round it. score(x, w): lower is better. Returns { x, w, F } or null. Marks its footprint and its pad.
function place(g, rng, { hu, hv, at = 'wall', walls = ['L', 'R', 'B', 'Fr'], pad = 0.3, side = 0.05, score = null, step = 0.2, F: face = null, wspan = null, xspan = null }) {
  const cands = [];
  const ix = g.ix, iz = g.iz;
  if (at === 'wall') {
    for (const wl of walls) {
      const F = wl === 'L' ? [1, 0] : wl === 'R' ? [-1, 0] : wl === 'B' ? [0, 1] : [0, -1];
      const [ax, aw] = foot(F, hu, hv);
      if (wl === 'L' || wl === 'R') {
        const x = wl === 'L' ? -ix + ax + 0.02 : ix - ax - 0.02;
        for (let w = -iz + aw; w <= iz - aw + 1e-6; w += step) cands.push({ x, w, F });
      } else {
        const w = wl === 'B' ? -iz + aw + 0.02 : iz - aw - 0.02;
        for (let x = -ix + ax; x <= ix - ax + 1e-6; x += step) cands.push({ x, w, F });
      }
    }
  } else {
    for (const F of face ? [face] : [[0, 1], [1, 0]]) {
      const [ax, aw] = foot(F, hu, hv);
      const st = Math.max(step, 0.25);
      for (let w = -iz + aw + 0.3; w <= iz - aw - 0.3; w += st) for (let x = -ix + ax + 0.3; x <= ix - ax - 0.3; x += st) cands.push({ x, w, F });
    }
  }
  let best = null, bs = Infinity;
  for (const c of cands) {
    if (wspan && (c.w < wspan[0] || c.w > wspan[1])) continue;
    if (xspan && (c.x < xspan[0] || c.x > xspan[1])) continue;
    const [ax, aw] = foot(c.F, hu, hv);
    // (Its pad: before its front, and a little all round.)
    const px0 = c.x - ax - side + Math.min(0, c.F[0]) * pad, px1 = c.x + ax + side + Math.max(0, c.F[0]) * pad;
    const pw0 = c.w - aw - side + Math.min(0, c.F[1]) * pad, pw1 = c.w + aw + side + Math.max(0, c.F[1]) * pad;
    if (!g.free(c.x - ax, c.x + ax, c.w - aw, c.w + aw)) continue;
    if (!g.free(Math.max(-ix, px0), Math.min(ix, px1), Math.max(-iz, pw0), Math.min(iz, pw1))) continue;
    const s = (score ? score(c.x, c.w, c.F) : 0) + rng() * 0.6;
    if (s < bs) { bs = s; best = c; }
  }
  if (!best) return null;
  const [ax, aw] = foot(best.F, hu, hv);
  g.block(best.x - ax - side, best.x + ax + side, best.w - aw - side, best.w + aw + side);
  return best;
}

// ---------------------------------------------------------------- who lives here

// A house's household: what's done in it and how well off they are. kind: home, shop, tavern, guildhall, towerhouse, shell,
// doss (a lodging house of pallets), lodge (a tavern's lodgers), great (a great house's). trade: the shop's (its sign's
// picture, phobos-build.js shopSign). wealth: 0 poor, 1 middling, 2 rich. folk: how many sleep there, by bed: [{ n: 1 or 2,
// kind: 'bed'|'pallet'|'tester'|'cot'|'bunk' }].
const SIGN_TRADE = ['tavern', 'chandler', 'fish', 'pies', 'tavern', 'coffins', 'bone', 'hooks', 'pawn', 'cobbler', 'apothecary', 'tavern', 'smith', 'rags', 'chandler', 'cooper', 'tavern', 'poultry', 'baker', 'ferry'];
export const SIGNS = 20;
export const signOf = (h) => { const id = idOf(h); return hash2(id, 23) < 0.9 ? Math.floor(hash2(id, 24) * SIGNS) : -1; };
const WEALTH = { dukes: 2, mages: 2, approach: 1.6, market: 1.2, bones: 1, barracks: 1, barbican: 1, other: 0.9, wharf: 0.6, tanners: 0.6, cinder: 0.4, rookeries: 0.3 };
// What a house without a named household is used for, by its quarter: [trade, weight]. (A smith's in the Cinders, a
// tanner's by the Tanners' Steps, a scrivener's among the mages.)
const HOME_TRADES = {
  cinder: [['smith', 2], ['charcoal', 2], ['', 4]], tanners: [['tanner', 3], ['dyer', 2], ['', 3]], wharf: [['nets', 3], ['cooper', 1], ['', 3]],
  mages: [['scholar', 3], ['apothecary', 1], ['', 3]], dukes: [['', 1]], bones: [['bone', 2], ['coffins', 1], ['', 3]], barracks: [['arms', 3], ['', 3]],
  market: [['goods', 2], ['weaver', 1], ['', 3]], rookeries: [['', 1]], approach: [['', 2], ['scholar', 1]], barbican: [['arms', 2], ['', 3]], other: [['weaver', 1], ['joiner', 1], ['', 5]],
};
const pickW = (list, v) => { let s = 0; for (const [, w] of list) s += w; let t = v * s; for (const [k, w] of list) { t -= w; if (t <= 0) return k; } return list.at(-1)[0]; };

// The household of a house with nobody named in it, made up from its number: a widow alone, a couple, a family with
// children, three generations; fewer and poorer in the Rookeries, more servants in Dukes' Row.
function anyHousehold(h, r, up) {
  const wealth = Math.min(2, Math.max(0, Math.round((WEALTH[h.dk] ?? 0.9) - 0.5 + r(501))));
  const v = r(502), beds = [];
  if (v < 0.18) beds.push({ n: 1, kind: 'bed' });
  else if (v < 0.42) beds.push({ n: 2, kind: 'bed' });
  else if (v < 0.8) { beds.push({ n: 2, kind: 'bed' }); const kids = 1 + Math.floor(r(503) * 3); for (let k = 0; k < kids; k++) beds.push({ n: 1, kind: k === 0 && r(504) < 0.35 ? 'cot' : wealth === 0 ? 'pallet' : 'bed' }); }
  else { beds.push({ n: 2, kind: 'bed' }, { n: 1, kind: 'bed' }); if (r(505) < 0.6) beds.push({ n: 1, kind: 'pallet' }); }
  if (wealth === 2) { beds[0].kind = 'tester'; if (r(506) < 0.7) beds.push({ n: 1, kind: 'pallet', servant: true }); }
  if (wealth === 0) for (const b of beds) if (b.kind === 'bed' && r(507 + beds.indexOf(b)) < 0.5) b.kind = 'pallet';
  const trade = h.shop ? SIGN_TRADE[signOf(h)] || 'goods' : pickW(HOME_TRADES[h.dk] || HOME_TRADES.other, r(508));
  // (An alehouse's sign, The Drowned Rat or The Hanged Man: an alehouse inside, its casks and benches, a lodger or two upstairs.)
  if (trade === 'tavern') return { kind: 'lodge', trade, wealth: Math.max(1, wealth), beds, lodgers: up ? 2 : 0, named: null, up: !!up };
  return { kind: h.shop ? 'shop' : 'home', trade, wealth, beds, named: null, up: !!up };
}

// A house's household (who sleeps there, by bed; what's done there; how well off), without the rest of its plan: what
// src/folk/phobos-homes.js houses the city's people by.
export function holdOf(h, up, named = null) {
  const id = idOf(h), r = (k) => hash2(id, k);
  const mk = h.mark?.kind;
  let hold = named || anyHousehold(h, r, up);
  if (!named && mk === 'tavern') hold = { kind: 'tavern', trade: 'tavern', wealth: 1, beds: [{ n: 2, kind: 'bed' }, { n: 1, kind: 'bed' }, { n: 1, kind: 'pallet' }], lodgers: 3, named: null };
  if (!named && mk === 'guildhall') hold = { kind: 'guildhall', trade: 'guild', wealth: 2, beds: [{ n: 1, kind: 'bed' }, { n: 1, kind: 'pallet' }], named: null };
  if (!named && mk === 'towerhouse') hold = { kind: 'towerhouse', trade: 'count', wealth: 2, beds: [{ n: 2, kind: 'tester' }, { n: 1, kind: 'bed' }], named: null };
  if (mk === 'shell') hold = { kind: 'shell', trade: '', wealth: 0, beds: [], named: null };
  if (!h.roof) hold = { kind: 'ruin', trade: '', wealth: 0, beds: [], named: null };
  return hold;
}

// ---------------------------------------------------------------- the plan

// The rooms of house h (its footing F, its upstairs up from phobos-build.js upstairs()): { hold, floors: [{ level, y, items }],
// beds: [{ level, x, w, y, F, hu, hv, n, kind, top (the height a sleeper lies at) }], part: its cross walls (partition),
// hearthW }. hold: the household (src/core/phobos-homes.js names some; the rest are made up here).
export function roomPlan(h, F, up, named = null, cramped = false) {
  const id = idOf(h), r = (k) => hash2(id, k);
  let s = (((id * 9301 + 49297) % 233280) + 233280) % 233280; const rng = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const ix = h.hx - WALL, iz = h.hz - WALL, fy = F.hi + 0.1, hearthW = -iz * 0.28;
  const mk = h.mark?.kind; let hold = holdOf(h, up, named);
  const plan = { hold, floors: [], beds: [], part: null, hearthW, ix, iz };
  if (hold.kind === 'ruin' || ix < 1.6 || iz < 1.6) return plan;
  const hasHearth = ix > 1.4;

  // ---- downstairs
  const g = new Grid(ix, iz), items = [];
  // (The stair up the left wall and its foot by the door; the way in from the door to the stair's foot and into the room;
  // the fire and the floor before it.)
  if (up) {
    const [z1, z0] = up.hole;
    g.keep(-ix, -ix + SW + 0.08, z1 - 0.05, iz);
    g.keep(-ix, -ix + SW + 0.45, z0 - 0.2, iz);
    // (And under the landing at its head, boarded in as a closet (phobos-build.js upstairsNear): it had stood open, a black
    // hole by the dresser, the critics.)
    g.keep(-ix, -ix + SW + 0.08, -iz, z1);
  }
  g.keep(-DOOR - 0.35, DOOR + 0.35, iz - 1.55, iz);
  g.keep(-0.55, 0.55, iz - 2.4, iz);
  if (hasHearth) { g.keep(ix - 0.62, ix, hearthW - 1.08, hearthW + 1.08); g.keep(ix - 1.55, ix - 0.6, hearthW - 0.85, hearthW + 0.85); }
  // (The cross wall, if it has one: its boards, its doorway kept clear through and the way to it from the door.)
  const pt = partition(h, F, up), pd = pt.down, wd = pd ? pd.w : null;
  plan.part = pt;
  if (pd) {
    g.keep(pd.x0, pd.g0, wd - 0.3, wd + 0.3); g.keep(pd.g1, pd.x1, wd - 0.3, wd + 0.3);
    g.keep(pd.g0, pd.g1, wd - 0.95, wd + 0.95);
    g.keep(Math.min(pd.g0, -0.55), Math.max(pd.g1, 0.55), wd, iz - 1.5);
  }
  const front = pd ? [wd + 0.35, iz] : null, hall = pd ? [-iz, wd - 0.35] : null;
  const near = (x0, w0) => (x, w) => Math.hypot(x - x0, w - w0) * 0.5;
  const put = (k, o, extra = {}) => { const p = place(g, rng, o); if (p) items.push({ k, x: p.x, w: p.w, F: p.F, hu: o.hu, hv: o.hv, ...extra }); return p; };
  const wealth = hold.wealth ?? 1, trade = hold.trade || '';
  // (A piece hung on a face of the cross wall (side 1 the street room's, -1 the hall's), in the longer of its runs either
  // side of the doorway, where the floor before it's clear.)
  const dressPart = (side, k, v) => {
    const hv = k === 'shelf' ? 0.16 : k === 'pegs' ? 0.06 : 0.04, hu = k === 'hanging' ? 0.7 : 0.55, w = wd + side * (0.07 + hv), F = [0, side];
    const runs = [[pd.x0 + 0.15, pd.g0 - 0.15], [pd.g1 + 0.15, pd.x1 - 0.15]].filter(([a, b]) => b - a >= hu * 2).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    for (const [a, b] of runs) {
      const n = Math.max(1, Math.round((b - a - 2 * hu) / 0.1));
      for (let t = 0; t <= n; t++) {
        const x = a + hu + (b - a - 2 * hu) * (((t + Math.floor(v * n)) % (n + 1)) / n);
        // (The wall's own band of the floor is kept clear already; it's the floor before it that's wanted free, to reach it.)
        const fa = wd + side * 0.42, fb = wd + side * 0.85;
        if (!g.free(x - hu, x + hu, Math.min(fa, fb), Math.max(fa, fb))) continue;
        g.block(x - hu, x + hu, Math.min(fa, wd + side * 0.5), Math.max(fa, wd + side * 0.5));
        items.push({ k, x, w, F, hu, hv, cloth: 'p2_tapestry_hunt', stock: wealth >= 1 ? 'goods' : 'pots' });
        return;
      }
    }
  };
  // (Downstairs, too, where there's no upstairs: the household's beds, in the back half and the corners away from the door;
  // a box bed with its curtains in a poor one.)
  // (Cramped, the children's beds are pallets and the four-poster a plain bed: less floor, the same sleepers.)
  if (cramped) hold = { ...hold, beds: hold.beds.map((b) => (b.kind === 'tester' ? { ...b, kind: 'bed' } : b.n === 1 && b.kind === 'bed' ? { ...b, kind: 'pallet' } : b)) };
  const bedsDown = !up ? hold.beds : hold.kind === 'doss' ? hold.beds.slice(0, Math.ceil(hold.beds.length / 2)) : [];
  const putBed = (gg, b, level, y, list) => {
    // (A pallet two share is wider: two on one a body wide lie on each other's arms.)
    const kind = b.kind, dbl = b.n > 1 && kind !== 'pallet', hu = kind === 'cot' ? 0.32 : dbl ? 0.72 : kind === 'pallet' && b.n > 1 ? 0.65 : 0.48, hv = kind === 'cot' ? 0.5 : 1.0;
    let ph = b.n > 1 ? 0.65 : 0.45;
    const o = { hu, hv, walls: ['B', 'R', 'L'], pad: kind === 'pallet' ? 0.25 : 0.45, side: kind === 'pallet' ? 0.1 : 0.12, score: (x, w) => w * 0.8 + (level ? 0 : Math.abs(x) * 0.1) };
    // (Not hard by the fire: 0.6 m kept between a bed and the hearth's stones where the room has the floor for it, the
    // critics: "beds jammed against the hearth".)
    let p = hasHearth ? clearOf(gg, ix - 1.25, ix, hearthW - 1.7, hearthW + 1.7, () => place(gg, rng, o)) : null;
    if (!p) p = place(gg, rng, o);
    if (!p && kind !== 'pallet') { b = { ...b, kind: 'pallet' }; p = place(gg, rng, { hu: ph, hv: 0.95, at: 'free', pad: 0.2, side: 0.08 }); }
    if (!p) p = place(gg, rng, { hu: ph, hv: 0.95, at: 'free', pad: 0.1, side: 0.04 });
    if (!p && ph > 0.45) { ph = 0.45; p = place(gg, rng, { hu: ph, hv: 0.95, at: 'free', pad: 0.1, side: 0.04 }); }
    if (!p) { (left[level] ||= []).push(b); return false; }
    const it = { k: b.kind === 'pallet' ? 'pallet' : b.kind === 'cot' ? 'cot' : 'bed', x: p.x, w: p.w, F: p.F, hu: b.kind === 'pallet' ? ph : hu, hv: b.kind === 'pallet' ? 0.95 : hv, n: b.n, tester: b.kind === 'tester', box: !level && wealth === 0 && b.kind === 'bed' && r(530) < 0.6, wool: WOOLS[Math.floor(r(531 + list.length) * WOOLS.length)] };
    list.push(it);
    const top = y + (it.k === 'pallet' ? 0.14 : it.k === 'cot' ? 0.5 : 0.44);
    plan.beds.push({ level, x: p.x, w: p.w, y, F: p.F, hu: it.hu, hv: it.hv, n: b.n, kind: it.k, top, servant: !!b.servant, wool: it.wool });
    // (A chest at its foot where there's room; a stool or a little table by its head with a candle.)
    if (it.k === 'bed' && r(532 + list.length) < 0.7) { const q = place(gg, rng, { hu: 0.4, hv: 0.24, at: 'free', pad: 0, side: 0.02, score: (x, w) => Math.hypot(x - (p.x + p.F[0] * (hv + 0.3)), w - (p.w + p.F[1] * (hv + 0.3))) * 3 }); if (q) list.push({ k: 'chest', x: q.x, w: q.w, F: q.F, hu: 0.4, hv: 0.24, small: true }); }
    if (it.k === 'bed' && r(540 + list.length) < 0.65) { const q = place(gg, rng, { hu: 0.2, hv: 0.2, at: 'free', pad: 0, side: 0.02, score: (x, w) => Math.hypot(x - (p.x - p.F[0] * (hv - 0.25) + p.F[1] * (hu + 0.3)), w - (p.w - p.F[1] * (hv - 0.25) - p.F[0] * (hu + 0.3))) * 3 }); if (q) list.push({ k: 'nightstand', x: q.x, w: q.w, F: q.F, hu: 0.2, hv: 0.2, lit: r(541) < 0.6 }); }
    return true;
  };
  const left = [];
  // (In a house too small for all of it, the beds first, before anything that can wait.)
  if (cramped) for (const b of bedsDown) putBed(g, b, 0, fy, items);
  // The ground floor by what's done there.
  const K = hold.kind;
  // (What can go anywhere waits till the beds are in: in a house of one room, the dresser and the tub had taken the floor
  // the household was to sleep on.)
  let rest = null;
  if (K === 'tavern' || K === 'lodge') {
    // An alehouse: its casks on a stillage along the back, a board before them to draw at; tables down the room with benches,
    // and one by the fire; tankards out; a settle by the hearth.
    const len = Math.min(ix * 2 - 2.2, 3.4);
    if (len > 1.2) {
      put('casks', { hu: len / 2, hv: 0.42, walls: ['B'], pad: 1.0, score: (x) => Math.abs(x + 0.2) });
      put('bar', { hu: len / 2, hv: 0.3, at: 'free', F: [0, 1], pad: 0.6, wspan: [-iz + 1.3, -iz + 1.9], score: (x) => Math.abs(x + 0.2) });
    }
    for (let k = 0; k < 4; k++) put('trestle', { hu: 0.85, hv: 0.4, at: 'free', F: [0, 1], pad: 0.55, side: 0.5, score: near(0.6, 0.6) }, { tank: 2 + (k % 3), benches: true });
    put('settle', { hu: 0.75, hv: 0.28, walls: ['R'], pad: 0.4, score: near(ix, hearthW + 1.6) });
    put('barrel', { hu: 0.36, hv: 0.36, walls: ['Fr', 'R', 'L'], pad: 0.1 });
    put('barrel', { hu: 0.36, hv: 0.36, walls: ['Fr', 'R', 'L'], pad: 0.1 });
  } else if (K === 'guildhall') {
    // A hall for the guild's meetings: the long table down the middle of the room, its benches, the master's chair at its
    // head under the guild's hanging; its chest of rolls and the press of its books.
    const len = Math.min(iz * 2 - 3, 4.2);
    put('longtable', { hu: 0.5, hv: len / 2, at: 'free', F: [0, 1], pad: 0.7, side: 0.55, score: near(0.4, -0.3) }, { benches: true });
    put('hanging', { hu: 0.8, hv: 0.04, walls: ['B'], pad: 0, score: (x) => Math.abs(x - 0.4) }, { cloth: 'p2_tapestry_hunt' });
    put('bigchair', { hu: 0.36, hv: 0.32, walls: ['B'], pad: 0.4, score: (x) => Math.abs(x - 0.4) });
    put('books', { hu: 0.75, hv: 0.22, walls: ['R', 'L', 'B'], pad: 0.5 });
    put('chest', { hu: 0.5, hv: 0.3, walls: ['R', 'B', 'L'], pad: 0.3 });
    put('candlestand', { hu: 0.15, hv: 0.15, walls: ['B', 'R'], pad: 0.1 });
  } else if (K === 'doss') {
    // A lodging house: pallets end to end down the floor, a bucket, the keeper's stool by the door.
    put('stool', { hu: 0.18, hv: 0.18, walls: ['Fr'], pad: 0.1, score: (x) => Math.abs(x - 1.2) });
    put('bucket', { hu: 0.15, hv: 0.15, walls: ['R', 'B'], pad: 0.05 });
  } else if (K === 'shell') {
    // Burnt out: the floor black, a joist come down from the ceiling (its high end on the wall it fell from, the low on the
    // boards: it had floated across the room at waist height, the critics), a bed's charred frame, the rubble and the ash
    // where the ceiling came through (phobos-build.js: the hole over it), charred boards, the cold hearth. No light.
    put('fallen', { hu: 0.2, hv: Math.min(iz - 0.4, 1.9), walls: ['L', 'B', 'R'], pad: 0, side: 0.05 });
    put('fallen', { hu: 0.2, hv: Math.min(ix - 0.4, 1.5), walls: ['B', 'L'], pad: 0, side: 0.05 }, { low: true });
    put('charbed', { hu: 0.5, hv: 1.0, walls: ['B', 'R'], pad: 0.1 });
    put('rubble', { hu: 0.75, hv: 0.6, at: 'free', pad: 0, side: 0, score: near(0.3, 0.4) });
    for (let k = 0; k < 3; k++) put('ash', { hu: 0.45, hv: 0.45, at: 'free', pad: 0, side: 0 });
    for (let k = 0; k < 2; k++) put('boards', { hu: 0.35, hv: 0.8, at: 'free', pad: 0, side: 0 }, { tw: k });
  } else {
    // A shop (or a trade worked at home): its counter under the front window, where the street's served through it; the
    // stock on the walls; the work at its bench in the light. Then the hall: the table by the fire, its benches or stools,
    // the dresser with the pots and plate, the chest; and whatever this house does.
    if (K === 'shop' || (K === 'home' && trade && TRADE_GOODS[trade])) {
      const sellsFront = K === 'shop' && ix > DOOR + 1.6;
      if (sellsFront) put('counter', { hu: Math.min(ix - DOOR - 0.6, 1.4) / 2 + 0.2, hv: 0.3, walls: ['Fr'], pad: 0.8, xspan: [DOOR + 0.3, ix], score: (x) => -x });
      // (Every piece of the trade in the street room, where it's seen from the door and the window, the critics: "the smith,
      // the baker, the coffin-maker read as ordinary front rooms"; only where it won't go there, in the hall.)
      for (const it of (TRADE_GOODS[trade] || TRADE_GOODS.goods)) {
        const o = { ...it, score: it.front ? (x, w) => -w : it.back ? (x, w) => w : it.at === 'free' ? (x, w) => -w * 0.6 + Math.abs(x) * 0.2 : null }, ex = { trade, hero: true, ...(it.extra || {}) };
        if (!(front && put(it.k, { ...o, wspan: it.wspan || front }, ex))) put(it.k, o, ex);
      }
    } else if (front) {
      // (A house that doesn't work at a trade: its front room the household's own, a settle and a chest, the stores.)
      put('settle', { hu: 0.75, hv: 0.28, walls: ['Fr', 'R', 'L'], pad: 0.5, wspan: front });
      if (r(512) < 0.7) put('chest', { hu: 0.45, hv: 0.28, walls: ['R', 'L', 'Fr'], pad: 0.4, wspan: front });
      if (r(513) < 0.6) put('sacks', { hu: 0.5, hv: 0.3, walls: ['R', 'L', 'Fr'], pad: 0.1, wspan: front });
      if (r(514) < 0.4) put('loom', { hu: 0.7, hv: 0.45, walls: ['R', 'L', 'Fr'], pad: 0.6, wspan: front });
    }
    // (Something on the cross wall, each face: it had stood bare, a plain board across the house, the critics.)
    if (pd) {
      dressPart(1, wealth >= 2 ? 'hanging' : r(560) < 0.5 ? 'pegs' : 'shelf', r(561));
      dressPart(-1, wealth >= 1 && r(562) < 0.5 ? 'hanging' : r(563) < 0.6 ? 'shelf' : 'pegs', r(564));
    }
    // The hall's table by the fire, and seats at it.
    const tOf = (hu, sd) => put('table', { hu, hv: 0.42, at: 'free', pad: 0.55, side: sd, F: [0, 1], wspan: hall, score: near(hasHearth ? ix - 2.2 : 0, hasHearth ? hearthW : -iz * 0.4) }, { lit: r(9) < 0.8, set: r(520) });
    // (A smaller one, the seats closer, where the big one won't go: the hall's never without its table.)
    const T = tOf(ix > 2.6 ? 0.85 : 0.65, 0.45) || tOf(0.6, 0.3) || tOf(0.5, 0.15);
    if (wealth >= 2) put('bigchair', { hu: 0.34, hv: 0.3, at: 'free', pad: 0.2, score: near(ix - 1.8, hearthW + 1.3) });
    else if (hasHearth) put('stool', { hu: 0.18, hv: 0.18, at: 'free', pad: 0, side: 0.05, score: near(ix - 1.7, hearthW - 0.9) });
    put('pots', { hu: 0.3, hv: 0.22, at: 'free', pad: 0, side: 0.02, score: near(ix - 1.3, hearthW + 1.05) });
    rest = () => {
    put('dresser', { hu: 0.62, hv: 0.24, walls: ['B', 'L', 'R'], pad: 0.6, wspan: hall, score: (x, w) => (w < 0 ? 0 : 1) }, { rich: wealth });
    if (wealth >= 2 && r(521) < 0.8) put('hanging', { hu: 0.9, hv: 0.04, walls: ['B', 'R'], pad: 0 }, { cloth: 'p2_tapestry_hunt' });
    if (r(523) < 0.75) put('chest', { hu: 0.45, hv: 0.28, walls: ['B', 'L', 'R'], pad: 0.4 });
    if (r(524) < 0.55) put('tub', { hu: 0.36, hv: 0.36, walls: ['B', 'R', 'L'], pad: 0.2 });
    if (r(525) < 0.6) put('barrel', { hu: 0.34, hv: 0.34, walls: ['Fr', 'B', 'R'], pad: 0.1 });
    if (r(526) < 0.5) put('logs', { hu: 0.5, hv: 0.25, walls: ['R'], pad: 0.1, score: near(ix, hearthW - 1.6) });
    if (r(527) < 0.45) put('broom', { hu: 0.12, hv: 0.08, walls: ['Fr', 'L', 'B'], pad: 0 });
    if (wealth >= 1 && r(528) < 0.5) put('rug', { hu: 0.9, hv: 0.6, at: 'free', pad: 0, side: 0, score: near(ix - 2.2, hearthW) }, { floor: true });
    };
  }
  if (!cramped) for (const b of bedsDown) putBed(g, b, 0, fy, items);
  rest?.();
  // (A lantern hung from the joists in the street room (or the room, in a house of one): a front room had been lit by no more
  // than the window, dark and bare at the door, the critics. Not in a ruin or a shell; first of the floor's pieces, so it's
  // one of the house's lights.)
  // (In a smith's or a baker's the fire of the trade's the street room's light, and the lantern's after it: the house has two or
  // three lights to give.)
  if (K !== 'shell' && K !== 'doss' && K !== 'tavern' && K !== 'guildhall') items[trade === 'smith' || trade === 'baker' ? 'push' : 'unshift']({ k: 'lantern', x: Math.min(0.9, ix - 1.2), w: front ? (front[0] + iz) / 2 - 0.3 : iz * 0.3, F: [0, 1], hu: 0.12, hv: 0.12, ch: up ? up.uy - fy - 0.4 : 2.9 });
  // (And then a room's furnished to its size: a big room's floor isn't left bare.)
  if (!cramped && K !== 'shell' && K !== 'doss') { if (front) fill(put, g, front, 0.3, FRONT_FILL[wealth], FREE_FRONT[wealth]); fill(put, g, hall || [-iz, iz], 0.3, HALL_FILL[wealth], FREE_HALL[wealth]); }
  plan.floors.push({ level: 0, y: fy, items });
  // (A bed that won't go in at all, on the floor it was for, goes on the other, a pallet if need be; or a pallet anywhere
  // there's floor for one. Every household has its beds, the owner: "make sure everyone has beds".)
  const squeeze = (gg, b, level, y, list) => putBed(gg, b, level, y, list) || putBed(gg, { ...b, kind: 'pallet' }, level, y, list);

  // ---- upstairs: the chambers.
  if (up) {
    const [z1, z0] = up.hole, xs = -ix + SW, uy = up.uy, gu = new Grid(ix, iz), its = [];
    // (The stair's hole and its railing; the landing at its head and the way from it along the rail to the front.)
    gu.keep(-ix, xs + 0.12, z1 - 0.05, z0 + 0.05);
    gu.keep(-ix, xs + 0.75, -iz, z1 + 0.1);
    gu.keep(xs, xs + 0.95, z1 - 0.2, iz);
    if (hasHearth) { gu.keep(ix - 0.62, ix, hearthW - 1.08, hearthW + 1.08); gu.keep(ix - 1.4, ix - 0.6, hearthW - 0.8, hearthW + 0.8); }
    // A partition across the floor between the back chamber (over the hall, by the stack) and the front one (over the street),
    // where the house is deep enough for two rooms: boards on a sill, a way through by the stairwell's rail.
    if (pt.up) gu.keep(pt.up.x0, ix, pt.up.w - 0.32, pt.up.w + 0.32);
    const ug = gu;
    const lodgers = K === 'tavern' || K === 'lodge' || K === 'doss';
    for (const b of (K === 'doss' ? hold.beds.slice(bedsDown.length) : hold.beds)) putBed(ug, b, 1, uy, its);
    if (lodgers && hold.lodgers) for (let k = 0; k < hold.lodgers; k++) putBed(ug, { n: 1, kind: k % 2 ? 'pallet' : 'bed' }, 1, uy, its);
    // (What's kept in a chamber: a press or a chest for the clothes, pegs, a washstand with its basin and jug; a chair in
    // the better houses, a rug, a hanging; the stair-head's crates.)
    if (r(550) < 0.7) put2('press', { hu: 0.55, hv: 0.3, walls: ['B', 'R', 'L'], pad: 0.6 });
    if (r(551) < 0.75) put2('washstand', { hu: 0.3, hv: 0.24, walls: ['B', 'R', 'Fr', 'L'], pad: 0.4 });
    if (wealth >= 1 && r(552) < 0.6) put2('chair', { hu: 0.24, hv: 0.24, walls: ['Fr', 'R', 'B'], pad: 0.3 });
    if (r(553) < 0.6) put2('pegs', { hu: 0.55, hv: 0.06, walls: ['L', 'B', 'Fr'], pad: 0 });
    if (wealth >= 2 && r(554) < 0.7) put2('hanging', { hu: 0.85, hv: 0.04, walls: ['B', 'R'], pad: 0 }, { cloth: 'p2_tapestry_hunt' });
    if (wealth >= 1 && r(556) < 0.55) put2('rug', { hu: 0.8, hv: 0.55, at: 'free', pad: 0, side: 0 }, { floor: true });
    if (trade === 'scholar' || hold.kind === 'towerhouse') put2('desk', { hu: 0.55, hv: 0.3, walls: ['Fr', 'R', 'B'], pad: 0.5 }, { books: true });
    if (trade === 'weaver' || trade === 'tailor') put2('loom', { hu: 0.7, hv: 0.45, walls: ['Fr', 'R', 'B'], pad: 0.6 });
    if (r(557) < 0.5) put2('crates', { hu: 0.35, hv: 0.35, walls: ['L', 'B', 'R'], pad: 0.1 });
    if (!cramped && K !== 'shell') { const pu = pt.up; if (pu) { fill(put2, ug, [-iz, pu.w], 0.26, CHAMBER_FILL[wealth], FREE_CHAMBER); fill(put2, ug, [pu.w, iz], 0.26, CHAMBER_FILL[wealth], FREE_CHAMBER); } else fill(put2, ug, [-iz, iz], 0.26, CHAMBER_FILL[wealth], FREE_CHAMBER); }
    for (const b of left[0] || []) squeeze(ug, b, 1, uy, its);
    const up1 = left[1] || []; left[1] = [];
    for (const b of up1) squeeze(g, b, 0, fy, items);
    plan.floors.push({ level: 1, y: uy, items: its });
    function put2(k, o, extra = {}) { const p = place(ug, rng, o); if (p) its.push({ k, x: p.x, w: p.w, F: p.F, hu: o.hu, hv: o.hv, ...extra }); return p; }
  }
  // (Somebody without a bed: laid out again, the beds first.)
  const want = hold.beds.reduce((a, b) => a + b.n, 0) + (hold.lodgers || 0), got = plan.beds.reduce((a, b) => a + b.n, 0);
  if (got < want && !cramped) return roomPlan(h, F, up, named, true);
  return plan;
}
// A room furnished to its size: pieces from a list, each against a wall in the room (span: its w's), till that much of its
// floor's taken (the stair, the way in and the hearth's floor counted) or nothing more will go.
function fill(put, g, span, share, list, free = []) {
  const ws = [span[0] + 0.3, span[1] - 0.3];
  // (A big room's taken further, and its middle before its walls are all lined: the rich houses' rooms were furniture strung
  // along the walls round a bare floor, the critics. Over 25 m² of floor, a group out in it first.)
  const area = (span[1] - span[0]) * g.ix * 2, big = area > 25, want = big ? share + 0.08 : share;
  const walls = (upTo) => { for (let k = 0, miss = 0; k < 24 && miss < 4 && g.used(span[0], span[1]) < upTo; k++) {
    const it = list[k % list.length];
    if (!put(it.k, { walls: ['L', 'R', 'B', 'Fr'], pad: 0.35, ...it, wspan: ws }, it.extra || {})) miss++;
  } };
  const middle = (n) => { for (let k = 0, miss = 0; k < n && miss < 2 && g.used(span[0], span[1]) < want; k++) {
    const it = free[k % Math.max(1, free.length)]; if (!it) break;
    if (!put(it.k, { at: 'free', pad: 0.5, side: 0.45, ...it, wspan: ws }, it.extra || {})) miss++;
  } };
  if (big) { middle(free.length * 2); put('candlestand', { hu: 0.15, hv: 0.15, at: 'free', pad: 0.1, side: 0.3, wspan: ws }); }
  walls(want);
  // (Then out in the floor, where a big room's middle is bare: a table and its benches, a loom, a rug.)
  middle(8);
}
// What a room's furnished with past its own pieces, by how well off the household is. Its street room (a parlour, a
// workroom, the stores), its hall, its chambers.
const P_ = (k, hu, hv, o = {}) => ({ k, hu, hv, ...o });
const FRONT_FILL = [
  [P_('sacks', 0.5, 0.3, { pad: 0.1 }), P_('barrel', 0.34, 0.34, { pad: 0.1 }), P_('wallbench', 0.7, 0.2), P_('crates', 0.35, 0.35, { pad: 0.1 }), P_('heap', 0.45, 0.45, { pad: 0.1, extra: { rags: true } }), P_('tub', 0.36, 0.36)],
  [P_('wallbench', 0.8, 0.2), P_('chest', 0.45, 0.28), P_('barrel', 0.34, 0.34, { pad: 0.1 }), P_('shelves', 0.7, 0.22, { pad: 0.6 }), P_('crates', 0.35, 0.35, { pad: 0.1 }), P_('sacks', 0.5, 0.3, { pad: 0.1 })],
  [P_('settle', 0.75, 0.28, { pad: 0.5 }), P_('chest', 0.5, 0.3, { extra: { strong: true } }), P_('books', 0.75, 0.22, { pad: 0.5 }), P_('bigchair', 0.34, 0.3), P_('candlestand', 0.15, 0.15, { pad: 0.1 }), P_('wallbench', 0.8, 0.2)],
];
const HALL_FILL = [
  [P_('wallbench', 0.7, 0.2), P_('barrel', 0.34, 0.34, { pad: 0.1 }), P_('sacks', 0.5, 0.3, { pad: 0.1 }), P_('bucket', 0.15, 0.15, { pad: 0.05 }), P_('tub', 0.36, 0.36), P_('logs', 0.5, 0.25, { pad: 0.1 })],
  [P_('wallbench', 0.8, 0.2), P_('chest', 0.45, 0.28), P_('barrel', 0.34, 0.34, { pad: 0.1 }), P_('shelves', 0.7, 0.22, { pad: 0.6, extra: { stock: 'goods' } }), P_('settle', 0.75, 0.28, { pad: 0.5 }), P_('tub', 0.36, 0.36)],
  [P_('settle', 0.75, 0.28, { pad: 0.5 }), P_('dresser', 0.62, 0.24, { pad: 0.6, extra: { rich: 2 } }), P_('chest', 0.5, 0.3, { extra: { strong: true } }), P_('candlestand', 0.15, 0.15, { pad: 0.1 }), P_('bigchair', 0.34, 0.3), P_('hanging', 0.9, 0.04, { pad: 0, extra: { cloth: 'p2_tapestry_hunt' } })],
];
const CHAMBER_FILL = [
  [P_('crates', 0.35, 0.35, { pad: 0.1 }), P_('sacks', 0.5, 0.3, { pad: 0.1 }), P_('heap', 0.45, 0.45, { pad: 0.1, extra: { rags: true } }), P_('bucket', 0.15, 0.15, { pad: 0.05 })],
  [P_('chest', 0.45, 0.28), P_('press', 0.55, 0.3, { pad: 0.6 }), P_('wallbench', 0.7, 0.2), P_('crates', 0.35, 0.35, { pad: 0.1 }), P_('washstand', 0.3, 0.24, { pad: 0.4 })],
  [P_('chest', 0.5, 0.3, { extra: { strong: true } }), P_('press', 0.55, 0.3, { pad: 0.6 }), P_('chair', 0.24, 0.24), P_('hanging', 0.85, 0.04, { pad: 0, extra: { cloth: 'p2_tapestry_hunt' } }), P_('candlestand', 0.15, 0.15, { pad: 0.1 }), P_('desk', 0.55, 0.3, { pad: 0.5, extra: { books: true } })],
];
const T_ = (k, hu, extra) => P_(k, hu, 0.42, { F: [0, 1], pad: 0.55, side: 0.5, extra });
const FREE_FRONT = [[T_('trestle', 0.8, { benches: true }), P_('heap', 0.45, 0.45, { pad: 0.1, extra: { rags: true } })], [T_('table', 0.75, { lit: false, set: 0.3 }), P_('loom', 0.7, 0.45, { pad: 0.6 })], [P_('rug', 0.9, 0.6, { pad: 0, side: 0, extra: { floor: true, wool: 'dark:cloth_red' } }), T_('table', 0.8, { lit: false, set: 0.8 })]];
const FREE_HALL = [[T_('trestle', 0.8, { benches: true })], [T_('table', 0.8, { lit: false, set: 0.5 }), P_('rug', 0.9, 0.6, { pad: 0, side: 0, extra: { floor: true } })], [P_('longtable', 0.5, 1.6, { F: [0, 1], pad: 0.7, side: 0.55, extra: { benches: true } }), P_('rug', 1.1, 0.7, { pad: 0, side: 0, extra: { floor: true, wool: 'dark:cloth_red' } })]];
const FREE_CHAMBER = [P_('rug', 0.8, 0.55, { pad: 0, side: 0, extra: { floor: true } }), T_('table', 0.6, { lit: false, set: 0.2 })];
// Blankets: madder, undyed brown, moss, oatmeal, rust (src/gfx/blankets.js's, as layers). Never blue with gold.
// (No plain oatmeal: undyed, flat on a bed by day, it reads as the bare tick.)
const WOOLS = ['p2_wool_blanket', 'cloth_red', 'umber:cloth_oat', 'p2_wool_blanket', 'dark:cloth_red', 'moss:cloth_oat'];
// What each trade keeps about its shop or its workroom (downstairs): [{ k, hu, hv, walls|at, pad, front|back }].
const W3 = ['L', 'R', 'B'];
const TRADE_GOODS = {
  goods: [{ k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true }, { k: 'crates', hu: 0.35, hv: 0.35, walls: W3, pad: 0.1 }, { k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1 }],
  chandler: [{ k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'candles' } }, { k: 'dipframe', hu: 0.6, hv: 0.35, at: 'free', pad: 0.5 }, { k: 'vat', hu: 0.4, hv: 0.4, at: 'free', pad: 0.3 }],
  fish: [{ k: 'slab', hu: 0.75, hv: 0.35, walls: W3, pad: 0.6, front: true }, { k: 'barrel', hu: 0.34, hv: 0.34, walls: W3, pad: 0.1, extra: { fish: true } }, { k: 'barrel', hu: 0.34, hv: 0.34, walls: W3, pad: 0.1, extra: { fish: true } }],
  pies: [{ k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'pies' } }, { k: 'trough', hu: 0.75, hv: 0.3, at: 'free', pad: 0.5 }, { k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1 }],
  baker: [{ k: 'oven', hu: 0.7, hv: 0.6, walls: W3, pad: 0.8 }, { k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'bread' } }, { k: 'trough', hu: 0.75, hv: 0.3, at: 'free', pad: 0.5 }, { k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1 }],
  coffins: [{ k: 'trestle', hu: 0.45, hv: 1.05, at: 'free', pad: 0.5, extra: { coffin: true } }, { k: 'coffins', hu: 0.6, hv: 0.3, walls: W3, pad: 0.2 }, { k: 'planks', hu: 0.9, hv: 0.12, walls: W3, pad: 0.1 }],
  bone: [{ k: 'bench', hu: 0.75, hv: 0.3, walls: W3, pad: 0.6, extra: { bones: true } }, { k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'bone' } }, { k: 'bones', hu: 0.4, hv: 0.4, walls: W3, pad: 0.1 }],
  hooks: [{ k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'iron' } }, { k: 'rope', hu: 0.35, hv: 0.35, walls: W3, pad: 0.1 }, { k: 'rope', hu: 0.3, hv: 0.3, walls: W3, pad: 0.1 }, { k: 'crates', hu: 0.35, hv: 0.35, walls: W3, pad: 0.1 }],
  pawn: [{ k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'pawn' } }, { k: 'shelves', hu: 0.6, hv: 0.22, walls: W3, pad: 0.6, extra: { stock: 'pawn' } }, { k: 'chest', hu: 0.5, hv: 0.3, walls: W3, pad: 0.4, extra: { strong: true } }],
  cobbler: [{ k: 'bench', hu: 0.6, hv: 0.3, walls: W3, pad: 0.6, extra: { lasts: true } }, { k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'boots' } }, { k: 'hide', hu: 0.6, hv: 0.08, walls: W3, pad: 0.1 }],
  apothecary: [{ k: 'jars', hu: 0.75, hv: 0.22, walls: W3, pad: 0.6, front: true }, { k: 'jars', hu: 0.6, hv: 0.22, walls: W3, pad: 0.6 }, { k: 'bench', hu: 0.6, hv: 0.3, walls: W3, pad: 0.6, extra: { mortar: true } }],
  smith: [{ k: 'forge', hu: 0.75, hv: 0.55, walls: W3, pad: 0.9, extra: {} }, { k: 'anvil', hu: 0.35, hv: 0.25, at: 'free', pad: 0.6 }, { k: 'bench', hu: 0.6, hv: 0.3, walls: W3, pad: 0.6, extra: { tools: true } }, { k: 'tub', hu: 0.38, hv: 0.38, walls: W3, pad: 0.2, extra: { quench: true } }],
  charcoal: [{ k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1, extra: { coal: true } }, { k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1, extra: { coal: true } }, { k: 'heap', hu: 0.45, hv: 0.45, walls: W3, pad: 0.1 }],
  rags: [{ k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1 }, { k: 'heap', hu: 0.5, hv: 0.5, walls: W3, pad: 0.1, extra: { rags: true } }, { k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, front: true, extra: { stock: 'pawn' } }],
  cooper: [{ k: 'barrel', hu: 0.36, hv: 0.36, walls: W3, pad: 0.1 }, { k: 'barrel', hu: 0.36, hv: 0.36, walls: W3, pad: 0.1 }, { k: 'staves', hu: 0.5, hv: 0.2, walls: W3, pad: 0.1 }, { k: 'barrel', hu: 0.36, hv: 0.36, at: 'free', pad: 0.4 }],
  poultry: [{ k: 'coops', hu: 0.7, hv: 0.3, walls: W3, pad: 0.4 }, { k: 'slab', hu: 0.6, hv: 0.3, walls: W3, pad: 0.6, front: true }, { k: 'sacks', hu: 0.5, hv: 0.3, walls: W3, pad: 0.1 }],
  ferry: [{ k: 'oars', hu: 0.6, hv: 0.12, walls: W3, pad: 0.1 }, { k: 'rope', hu: 0.35, hv: 0.35, walls: W3, pad: 0.1 }, { k: 'crates', hu: 0.35, hv: 0.35, walls: W3, pad: 0.1 }],
  tanner: [{ k: 'hide', hu: 0.6, hv: 0.08, walls: W3, pad: 0.1 }, { k: 'hide', hu: 0.6, hv: 0.08, walls: W3, pad: 0.1 }, { k: 'vat', hu: 0.45, hv: 0.45, walls: W3, pad: 0.3 }],
  dyer: [{ k: 'vat', hu: 0.45, hv: 0.45, walls: W3, pad: 0.3, extra: { dye: 'cloth_red' } }, { k: 'vat', hu: 0.45, hv: 0.45, walls: W3, pad: 0.3, extra: { dye: 'umber:cloth_oat' } }, { k: 'hide', hu: 0.6, hv: 0.08, walls: W3, pad: 0.1, extra: { cloth: true } }],
  nets: [{ k: 'nets', hu: 0.7, hv: 0.08, walls: W3, pad: 0.1 }, { k: 'oars', hu: 0.6, hv: 0.12, walls: W3, pad: 0.1 }, { k: 'rope', hu: 0.35, hv: 0.35, walls: W3, pad: 0.1 }],
  scholar: [{ k: 'books', hu: 0.75, hv: 0.22, walls: W3, pad: 0.5 }, { k: 'desk', hu: 0.55, hv: 0.3, walls: W3, pad: 0.5, extra: { books: true } }],
  arms: [{ k: 'armsrack', hu: 0.7, hv: 0.18, walls: W3, pad: 0.4 }, { k: 'armour', hu: 0.25, hv: 0.2, walls: W3, pad: 0.3 }],
  weaver: [{ k: 'loom', hu: 0.7, hv: 0.45, walls: W3, pad: 0.6 }, { k: 'shelves', hu: 0.7, hv: 0.22, walls: W3, pad: 0.6, extra: { stock: 'cloth' } }],
  joiner: [{ k: 'bench', hu: 0.75, hv: 0.3, walls: W3, pad: 0.6, extra: { tools: true } }, { k: 'planks', hu: 0.9, hv: 0.12, walls: W3, pad: 0.1 }],
  count: [{ k: 'desk', hu: 0.6, hv: 0.32, walls: W3, pad: 0.5, extra: { ledger: true } }, { k: 'chest', hu: 0.5, hv: 0.3, walls: W3, pad: 0.4, extra: { strong: true } }, { k: 'books', hu: 0.7, hv: 0.22, walls: W3, pad: 0.5 }],
};
// The walls inside a house (src/core/phobos-build.js houseWalls stops a body at them, houseNear draws them): in a house
// deep enough for two rooms a floor, a cross wall of boards on a sill, the street's room before it and the hall with its
// hearth behind, upstairs a chamber over each; the two in line, the upstairs one over the one below, as a framed house's
// cross wall stood. Downstairs its doorway by the foot of the stair (or straight back from the door in a house without
// one), upstairs its way through beside the stairwell's rail. In the house's x and w: { up: { w, x0, x1 } | null, down:
// { w, x0, x1, g0, g1 } | null }, the gap g0 to g1 downstairs. (Not in a tavern, a guildhall or a burnt shell: one room.)
const deep = (ix, iz) => 2 * iz >= 6.2 && ix > 2.4;
export function partition(h, F, up) {
  const ix = h.hx - WALL, iz = h.hz - WALL, mk = h.mark?.kind, out = { up: null, down: null };
  if (!h.roof || mk === 'tavern' || mk === 'guildhall' || mk === 'shell') return out;
  const w = -iz * 0.28 + 1.3;
  if (up && deep(ix, iz)) out.up = { w, x0: -ix + SW + 0.95, x1: ix };
  if (2 * iz >= 7.2 && ix >= 2.8) {
    const x0 = up ? -ix + SW + 0.04 : -ix, g0 = up ? -ix + SW + 0.12 : -0.55, g1 = g0 + 1.1;
    out.down = { w, x0, x1: ix, g0, g1 };
  }
  return out;
}

// ---------------------------------------------------------------- drawing it

// Draw a plan's pieces. P(lx, y, lz): the house's frame (phobos-build.js houseNear's), lz = f * w. lean: a phone's: the beds,
// the tables and the hearth's things, and no more. lamp(p, r, i): an indoor light.
export function furnish(K, h, plan, P, lean, lamp) {
  const f = h.front, c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  const L = (x, y, w) => P(x, y, f * w);
  // (Every piece's corners count: a cell of Phobos is twenty houses and more, all of them drawn inside. A box is 20 corners,
  // one with no lid 16, a quad 4; a drum of n sides 4n and its lid 3n. So: solid cases with their fronts painted, end boards
  // for legs, few-sided drums, nothing under a top that a top hides.)
  const B = (layer, x, y, w, ax, hh, aw, o) => { const [X, , Z] = L(x, 0, w); K.box(layer, X, y, Z, ax, hh, aw, h.yaw, o ? { collide: false, ...o } : NC); };
  const Q = (layer, a, b, cc, d, n, uv) => K.quad(layer, a, b, cc, d, n, uv);
  for (const fl of plan.floors) {
    const y0 = fl.y;
    for (const it of fl.items) {
      if (lean && !LEAN_KEEP.has(it.k)) continue;
      // The piece's own frame: u across its front (to its right as you face it), v out of its front.
      const Fx = it.F[0], Fw = it.F[1], Rx = Fw, Rw = -Fx;
      const at = (u, v) => [it.x + u * Rx + v * Fx, it.w + u * Rw + v * Fw];
      // (A point of the piece's frame, u across it, v out of its front, y up: L takes (x, y, w). Lights and solids had been put
      // at L(x, w, y), metres off the house, the round 2 trade lights and coffins with them.)
      const Lat = (u, v, y) => { const [x, w] = at(u, v); return L(x, y, w); };
      const pb = (layer, u, y, v, hu, hh, hv, o) => { const [x, w] = at(u, v); const [ax, aw] = Fx === 0 ? [hu, hv] : [hv, hu]; B(layer, x, y, w, ax, hh, aw, o); };
      const leg = (layer, u, y, v, hu, hh, hv) => pb(layer, u, y, v, hu, hh, hv, OPEN);
      const pd = (layer, u, y, v, rr, hh, sides = 6, o = {}) => { const [x, w] = at(u, v), [X, , Z] = L(x, 0, w); K.drum(layer, X, y, Z, rr, hh, sides, { collide: false, ...o }); };
      const pc = (layer, u, y, v, rr, hh, sides = 4) => { const [x, w] = at(u, v), [X, , Z] = L(x, 0, w); K.cone(layer, X, y, Z, rr, hh, sides); };
      const NF = [Fx * c + f * Fw * s, 0, -Fx * s + f * Fw * c];
      const face = (layer, u0, u1, ya, yb, v, uv) => { const [ax, aw] = at(u0, v), [bx, bw] = at(u1, v); Q(layer, L(ax, ya, aw), L(bx, ya, bw), L(bx, yb, bw), L(ax, yb, aw), NF, uv); };
      // (A solid of an outline drawn out: W3(point, 0|1) where each corner of the outline is at either end; its faces' normals
      // out from its middle. A coffin's six sides: narrow at the head, broad at the shoulders, narrowing to the foot.)
      const prism = (layer, pts, W3, caps = [1]) => {
        const all = pts.flatMap((q) => [W3(q, 0), W3(q, 1)]), C = [0, 1, 2].map((i) => all.reduce((a, q) => a + q[i], 0) / all.length);
        const quad = (a, b, cc, d) => {
          const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
          let g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          const m = [0, 1, 2].map((i) => (a[i] + b[i] + cc[i] + d[i]) / 4 - C[i]), l = Math.hypot(...g) || 1;
          if (g[0] * m[0] + g[1] * m[1] + g[2] * m[2] < 0) g = g.map((x) => -x);
          Q(layer, a, b, cc, d, g.map((x) => x / l));
        };
        for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; quad(W3(pts[i], 0), W3(pts[j], 0), W3(pts[j], 1), W3(pts[i], 1)); }
        for (const t of caps) for (let i = 1; i + 1 < pts.length; i += 2) quad(W3(pts[0], t), W3(pts[i], t), W3(pts[i + 1], t), W3(pts[Math.min(i + 2, pts.length - 1)], t));
      };
      const coffinPts = (W, Lc) => [[-0.6 * W, -Lc], [0.6 * W, -Lc], [W, -Lc + 0.5], [0.5 * W, Lc], [-0.5 * W, Lc], [-W, -Lc + 0.5]];
      const candle = (u, y, v) => { pd('pale:stone', u, y, v, 0.028, 0.13, 4); pc('flame', u, y + 0.13, v, 0.026, 0.08, 3); };
      const { hu, hv } = it, n0 = K.stat ? vcount(K) : 0;
      switch (it.k) {
        case 'bed': case 'cot': case 'pallet': case 'charbed': bed(it, pb, leg, face, y0, lean); break;
        case 'table': case 'trestle': case 'longtable': {
          const th = 0.76, longU = hu >= hv, L2 = longU ? hu : hv, S2 = longU ? hv : hu;
          pb('wood', 0, y0 + th - 0.06, 0, hu, 0.06, hv);
          // (Its legs: a board at each end under the top, the top's whole depth. A post under the middle of the top's end
          // would be a T end on.)
          for (const e of [-1, 1]) { if (longU) leg('dark:wood', e * (hu - 0.14), y0, 0, 0.04, th - 0.06, hv - 0.06); else leg('dark:wood', 0, y0, e * (hv - 0.14), hu - 0.06, th - 0.06, 0.04); }
          if (lean) break;
          // (Its seats: benches along both long sides, or two stools at the near side and a bench against the far.)
          const off = S2 + 0.3, bench = (sd, len) => { const [u, v] = longU ? [0, sd * off] : [sd * off, 0], [bu, bv] = longU ? [len, 0.15] : [0.15, len]; pb('wood', u, y0 + 0.4, v, bu, 0.05, bv); for (const e of [-1, 1]) { if (longU) leg('dark:wood', e * (len - 0.12), y0, sd * off, 0.035, 0.4, 0.13); else leg('dark:wood', sd * off, y0, e * (len - 0.12), 0.13, 0.4, 0.035); } };
          if (it.coffin) { /* (a coffin maker's trestle: nothing to sit at) */ } else if (it.benches || it.k !== 'table' || it.set < 0.5) { bench(-1, L2 - 0.1); bench(1, L2 - 0.1); }
          else { bench(-1, L2 - 0.1); for (const e of [-0.5, 0.5]) { const [u, v] = longU ? [e * L2, off] : [off, e * L2]; pd('wood', u, y0, v, 0.17, 0.46, 5); } }
          // What's on it: a candle, bread on a board, a jug and cups; tankards in a tavern; papers at a guild's.
          const ty = y0 + th;
          if (it.lit !== false && it.k !== 'trestle') { candle(0, ty, 0); lamp(Lat(0, 0, y0 + 1.25), 8, 6); }
          if (it.tank) for (let k = 0; k < it.tank; k++) pd('dark:wood', (k - (it.tank - 1) / 2) * 0.45, ty, (k % 2 ? 0.15 : -0.12), 0.055, 0.15, 5);
          else if (it.k === 'longtable') { for (let k = -1; k <= 1; k++) pb('pale:stone', 0.12 * k, ty, k * L2 * 0.5, 0.16, 0.01, 0.12); pb('dark:cloth_red', 0, ty, -L2 * 0.8, 0.2, 0.06, 0.14); }
          else if (it.coffin) {
            // (A coffin on it, its lid set on askew a hand: the shape of one, not a box.)
            prism('wood', coffinPts(0.3, 0.92), (q, t) => Lat(q[0], q[1], ty + t * 0.32), [0, 1]);
            prism('dark:wood', coffinPts(0.34, 0.97), (q, t) => Lat(q[0] + 0.07, q[1] + 0.06, ty + 0.32 + t * 0.045), [0, 1]);
            prism('soot:wood', coffinPts(0.24, 0.8), (q, t) => Lat(q[0] + 0.07, q[1] + 0.06, ty + 0.365 + t * 0.02), [1]);
            if (!lean) for (let k = 0; k < 7; k++) pb('pale:wood', ((k * 37) % 9 - 4) * 0.12, y0, ((k * 53) % 11 - 5) * 0.16, 0.06, 0.012, 0.03);
          }
          else if (it.set !== undefined) { const v = it.set; if (v < 0.4) { pb('wood', -0.35, ty, 0.05, 0.2, 0.012, 0.14); pd('umber:cloth_oat', -0.35, ty + 0.012, 0.05, 0.12, 0.08, 5, { r2: 0.08 }); } else if (v < 0.7) { pd('dark:stone', 0.3, ty, 0.08, 0.07, 0.2, 5); pd('dark:wood', 0.05, ty, 0.15, 0.045, 0.09, 4); } else { pd('iron', 0.25, ty, 0, 0.14, 0.12, 6, { lid: 'dark:water' }); pb('pale:stone', -0.3, ty, 0.1, 0.12, 0.012, 0.12); } }
          break;
        }
        case 'bar': {
          // The board they draw at: planks to the floor on the room's side, a top a hand over, tankards on it.
          pb('dark:wood', 0, y0, 0, hu, 1.02, hv, { top: false });
          pb('wood', 0, y0 + 1.02, 0.03, hu + 0.04, 0.05, hv + 0.06);
          if (!lean) for (let k = 0; k < 3; k++) pd('dark:wood', -hu + 0.4 + k * 0.6, y0 + 1.07, 0.05, 0.055, 0.15, 5);
          break;
        }
        case 'casks': {
          // A stillage along the back: a low timber cradle, the casks on it on their ends, a tap out of each.
          pb('dark:wood', 0, y0, 0, hu, 0.22, hv);
          const n = Math.max(2, Math.floor(hu * 2 / 0.75));
          for (let k = 0; k < n; k++) { const u = -hu + 0.37 + k * (2 * hu - 0.74) / Math.max(1, n - 1); pd('soot:wood', u, y0 + 0.22, 0, 0.34, 0.85, 7); pd('iron', u, y0 + 0.77, 0, 0.345, 0.06, 7, { open: true }); pb('iron', u, y0 + 0.4, 0.36, 0.025, 0.04, 0.05); if (k % 2 === 0) pd('soot:wood', u, y0 + 1.07, 0, 0.27, 0.62, 7); }
          break;
        }
        case 'settle': {
          // A high-backed bench by the fire: its seat, its back boarded to the shoulders, ends.
          pb('wood', 0, y0 + 0.42, 0, hu, 0.06, hv);
          pb('dark:wood', 0, y0, -hv + 0.04, hu, 1.25, 0.04);
          for (const e of [-1, 1]) pb('dark:wood', e * hu, y0, 0, 0.04, 0.7, hv);
          break;
        }
        case 'bigchair': case 'chair': {
          const big = it.k === 'bigchair';
          pb('wood', 0, y0 + 0.44, 0, hu - 0.02, 0.05, hv - 0.02);
          // (Its sides boards to the floor, its back a board up from the seat, whole: no rail across a post.)
          for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.04), y0, 0, 0.03, 0.44, hv - 0.04);
          pb('dark:wood', 0, y0 + 0.49, -hv + 0.04, hu - 0.03, big ? 0.85 : 0.5, 0.03);
          if (big) { for (const e of [-1, 1]) pb('dark:wood', e * (hu - 0.03), y0 + 0.49, -0.02, 0.03, 0.22, hv - 0.06); pb('cloth_red', 0, y0 + 0.49, 0, hu - 0.06, 0.04, hv - 0.06); }
          break;
        }
        case 'stool': pd('wood', 0, y0, 0, 0.17, 0.46, 5); break;
        case 'wallbench': pb('wood', 0, y0 + 0.42, 0, hu, 0.05, hv); for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.1), y0, 0, 0.035, 0.42, hv - 0.03); break;
        case 'dresser': {
          // The dresser: a cupboard to the waist, its doors dark; its rack of shelves over with the household's crocks.
          pb('wood', 0, y0, 0, hu, 0.86, hv);
          face('dark:wood', -hu + 0.05, -0.02, y0 + 0.08, y0 + 0.78, hv + 0.005); face('dark:wood', 0.02, hu - 0.05, y0 + 0.08, y0 + 0.78, hv + 0.005);
          pb('wood', 0, y0 + 0.86, -hv + 0.06, hu, 1.0, 0.06);
          // (Its rack the shelves themselves, with crocks, jugs, bowls and plates stood on them: the painted face had sheared
          // into stripes, the critics.)
          for (const [k, yy] of [[0, 1.22], [1, 1.56]]) {
            pb('dark:wood', 0, y0 + yy, -hv + 0.2, hu - 0.04, 0.025, 0.09);
            if (!lean) for (let u = -hu + 0.16, j = 0; u < hu - 0.12; u += 0.24, j++) {
              const q = (j + k * 2 + (it.rich || 0)) % 4;
              if (q === 0) pd('pale:stone', u, y0 + yy + 0.025, -hv + 0.2, 0.065, 0.14, 10, { r2: 0.07 });
              else if (q === 1) { pd('umber:rubble', u, y0 + yy + 0.025, -hv + 0.2, 0.06, 0.14, 10, { r2: 0.065 }); pd('umber:rubble', u, y0 + yy + 0.165, -hv + 0.2, 0.065, 0.05, 10, { r2: 0.03 }); }
              else if (q === 2) pb('pale:stone', u, y0 + yy + 0.025, -hv + 0.15, 0.1, 0.2, 0.012);
              else pd('pale:stone', u, y0 + yy + 0.025, -hv + 0.2, 0.09, 0.06, 7, { r2: 0.06, open: true });
            }
          }
          pb('wood', 0, y0 + 1.86, -hv + 0.14, hu, 0.04, 0.14);
          break;
        }
        case 'books': case 'jars': {
          // A case to the wall, solid, its front the PH2 pack's painting of what's on it.
          const tall = 2.0;
          pb('dark:wood', 0, y0, 0, hu, tall, hv);
          face(it.k === 'books' ? 'p2_book_spines' : 'p2_jar_shelves', -hu + 0.05, hu - 0.05, y0 + 0.08, y0 + tall - 0.08, hv + 0.006);
          break;
        }
        case 'shelves': {
          // Open shelving with the trade's stock on its boards: the back and its ends, three boards, and the stock.
          const tall = 1.7;
          pb('dark:wood', 0, y0, -hv + 0.03, hu, tall, 0.03, { top: false });
          for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.02), y0, 0, 0.02, tall, hv);
          const rows = [0.05, 0.6, 1.15];
          for (const yy of rows) pb('wood', 0, y0 + yy, 0, hu - 0.02, 0.03, hv - 0.02);
          stock(it.stock || 'goods', rows.map((yy) => y0 + yy + 0.03), hu, pb, pd);
          break;
        }
        case 'counter': case 'slab': {
          pb(it.k === 'slab' ? 'pale:stone' : 'wood', 0, y0 + 0.86, 0, hu, 0.06, hv);
          pb('dark:wood', 0, y0, 0, hu - 0.03, 0.86, hv - 0.03, { top: false });
          if (lean) break;
          if (it.k === 'counter') { pb('iron', hu - 0.35, y0 + 0.92, 0, 0.12, 0.02, 0.08); pd('dark:wood', -hu + 0.3, y0 + 0.92, 0.05, 0.12, 0.18, 6); pb('wood', 0.1, y0 + 0.92, -0.05, 0.25, 0.06, 0.07); }
          else {
            // (The catch laid out on the stone, silver, each the length of a forearm and more, a knife by them: three chips of
            // grey had read as nothing, the critics.)
            // (Laid along the stone in two loose rows, each at its own slant, silver with a dark back: laid across it side by
            // side, white and dark in turn, they'd read as a keyboard, round 3.)
            const n = Math.max(3, Math.floor((hu * 2 - 0.3) / 0.22));
            for (let k = 0; k < n; k++) {
              const row = k % 2, cu = -hu + 0.28 + (k + 0.5 * row) * (hu * 2 - 0.62) / Math.max(1, n - 0.5), cv = (row ? 0.1 : -0.12) * Math.min(1, hv / 0.3);
              const Lf = 0.19 + ((k * 7) % 3) * 0.025, Wf = 0.055 + (k % 2) * 0.01, a = (row ? 0.45 : -0.35) + ((k * 5) % 4 - 1.5) * 0.12, ca = Math.cos(a), sa = Math.sin(a);
              const body = [[-Lf, 0], [-0.5 * Lf, Wf], [0.35 * Lf, 0.8 * Wf], [0.62 * Lf, 0], [0.35 * Lf, -0.8 * Wf], [-0.5 * Lf, -Wf]], tail = [[0.55 * Lf, 0], [Lf, 0.75 * Wf], [Lf, -0.75 * Wf]];
              const back = [[-0.85 * Lf, 0], [-0.45 * Lf, 0.35 * Wf], [0.4 * Lf, 0.3 * Wf], [0.55 * Lf, 0], [0.4 * Lf, -0.3 * Wf], [-0.45 * Lf, -0.35 * Wf]];
              const W = (q, t, y, th) => Lat(cu + q[0] * ca - q[1] * sa, cv + q[0] * sa + q[1] * ca, y0 + 0.92 + y + t * th);
              prism('pale:stone', body, (q, t) => W(q, t, 0, 0.045), [1]);
              prism('slate:iron', back, (q, t) => W(q, t, 0.045, 0.008), [1]);
              prism('pale:stone', tail, (q, t) => W(q, t, 0, 0.015), [1]);
            }
            pb('iron', hu - 0.12, y0 + 0.92, -0.18, 0.015, 0.006, 0.13); pb('dark:wood', hu - 0.12, y0 + 0.92, -0.04, 0.02, 0.015, 0.05);
          }
          break;
        }
        case 'chest': {
          pb(it.strong ? 'dark:wood' : 'wood', 0, y0, 0, hu, 0.48, hv);
          for (const e of [-0.6, 0.6]) face('iron', e * hu - 0.03, e * hu + 0.03, y0, y0 + 0.48, hv + 0.006);
          face('iron', -0.05, 0.05, y0 + 0.3, y0 + 0.42, hv + 0.008);
          break;
        }
        case 'nightstand': {
          pb('wood', 0, y0 + 0.55, 0, hu, 0.03, hv); pd('dark:wood', 0, y0, 0, 0.05, 0.55, 4, { open: true });
          if (it.lit) { candle(0, y0 + 0.58, 0); lamp(Lat(0, 0, y0 + 1.1), 6, 5); }
          break;
        }
        case 'press': {
          // A press for the clothes: a tall cupboard, its two doors, an iron hasp.
          pb('wood', 0, y0, 0, hu, 1.85, hv);
          face('dark:wood', -hu + 0.05, -0.02, y0 + 0.1, y0 + 1.75, hv + 0.005); face('dark:wood', 0.02, hu - 0.05, y0 + 0.1, y0 + 1.75, hv + 0.005);
          face('iron', 0.04, 0.08, y0 + 0.85, y0 + 1.05, hv + 0.008);
          break;
        }
        case 'washstand': {
          pb('wood', 0, y0 + 0.78, 0, hu, 0.04, hv); for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.04), y0, 0, 0.03, 0.78, hv - 0.03);
          pd('pale:stone', -0.06, y0 + 0.82, 0, 0.17, 0.08, 6, { lid: 'dark:water', r2: 0.15 });
          pd('pale:stone', 0.18, y0 + 0.82, 0.02, 0.06, 0.2, 5, { r2: 0.04 });
          break;
        }
        case 'pegs': {
          // A peg rail on the wall: its board, two pegs, a cloak and a hood hung straight down from them.
          pb('dark:wood', 0, y0 + 1.55, -hv + 0.02, hu, 0.08, 0.02);
          for (const u of [-hu + 0.22, hu - 0.3]) pb('wood', u, y0 + 1.57, -hv + 0.08, 0.02, 0.02, 0.05, OPEN);
          // (Hung with some body to them, the cloak gathered at the peg and falling wider to its hem, a fold down it; the hood a
          // bag of cloth off the other: as two cards they'd read as paper pinned up, the critics.)
          { const cu = -hu + 0.22, cl = [[-0.07, 0], [0.07, 0], [0.19, -0.78], [0.02, -0.82], [-0.19, -0.76]];
            prism('dark:cloth_red', cl, (q, t) => Lat(cu + q[0], -hv + 0.05 + t * (0.07 + 0.06 * Math.min(1, -q[1])), y0 + 1.57 + q[1]), [1]);
            prism('dark:cloth_red', [[-0.03, -0.1], [0.03, -0.1], [0.06, -0.8], [-0.04, -0.8]], (q, t) => Lat(cu + 0.05 + q[0], -hv + 0.12 + t * 0.06 * Math.min(1, -q[1]), y0 + 1.57 + q[1]), [1]); }
          pd('umber:cloth_oat', hu - 0.3, y0 + 1.22, -hv + 0.13, 0.08, 0.34, 7, { r2: 0.13 });
          pd('umber:cloth_oat', hu - 0.3, y0 + 1.56, -hv + 0.13, 0.13, 0.04, 7, { r2: 0.03 });
          break;
        }
        case 'hanging': face(it.cloth, -hu, hu, y0 + 0.9, y0 + 0.9 + (it.cloth === 'p2_tapestry_hunt' ? hu * 1.2 : 1.6), -hv + 0.02, it.cloth === 'p2_tapestry_hunt' ? [[0, 1], [1, 1], [1, 0], [0, 0]] : null); break;
        case 'rug': { const [ax, aw] = Fx === 0 ? [hu, hv] : [hv, hu]; Q(it.wool || 'p2_wool_blanket', L(it.x - ax, y0 + 0.012, it.w - aw), L(it.x - ax, y0 + 0.012, it.w + aw), L(it.x + ax, y0 + 0.012, it.w + aw), L(it.x + ax, y0 + 0.012, it.w - aw), [0, 1, 0]); break; }
        case 'pots': {
          // By the fire: a pot on its trivet, a pan.
          // (Round-bellied, wider than it's tall, a lip at its mouth: a six-sided can of black iron read as a block, the critics.)
          pd('iron', 0.05, y0, 0, 0.12, 0.1, 3, { open: true });
          pd('iron', 0.05, y0 + 0.1, 0, 0.13, 0.1, 10, { r2: 0.2, open: true }); pd('iron', 0.05, y0 + 0.2, 0, 0.2, 0.1, 10, { r2: 0.15, lid: 'dark:water' });
          pd('slate:iron', 0.05, y0 + 0.3, 0, 0.165, 0.025, 10, { open: true });
          pd('iron', -0.24, y0, 0.1, 0.1, 0.14, 9, { r2: 0.12, lid: 'soot:iron' }); pd('dark:wood', -0.24, y0 + 0.14, 0.1, 0.012, 0.18, 4);
          break;
        }
        case 'tub': pd('soot:wood', 0, y0, 0, 0.36, it.quench ? 0.55 : 0.38, 7, { r2: 0.4, lid: it.quench ? 'dark:water' : 'dark:wood' }); break;
        case 'barrel': pd('soot:wood', 0, y0, 0, 0.32, 0.88, 7, { r2: 0.3, lid: it.fish ? 'dark:water' : 'soot:wood' }); if (it.fish && !lean) for (let k = 0; k < 5; k++) pc(k % 2 ? 'pale:iron' : 'slate:iron', Math.cos(k * 1.3) * 0.15, y0 + 0.86, Math.sin(k * 1.3) * 0.15, 0.04, 0.16, 4); pd('iron', 0, y0 + 0.55, 0, 0.325, 0.06, 7, { open: true }); break;
        case 'logs': pb('bark', 0, y0, 0, hu, 0.42, hv); face('wood', -hu, hu, y0, y0 + 0.42, hv + 0.005); break;
        case 'broom': { const [bx, bw] = at(0, 0); K.beam('wood', L(bx, y0 + 0.25, bw), Lat(0, -0.06, y0 + 1.45), 0.035); pc('umber:cloth_oat', 0, y0, 0.02, 0.1, 0.32, 5); break; }
        case 'crates': pb('soot:wood', 0, y0, 0, 0.33, 0.62, 0.33); pb('wood', 0.05, y0 + 0.62, 0.02, 0.24, 0.42, 0.24); break;
        case 'sacks': for (let k = 0; k < 3; k++) pd(it.coal ? 'char:rubble' : 'umber:cloth_oat', -hu + 0.2 + k * (hu - 0.2), y0, (k % 2) * 0.1 - 0.05, 0.22, 0.5, 5, { r2: 0.12 }); break;
        case 'bucket': pd('wood', 0, y0, 0, 0.14, 0.28, 6, { r2: 0.16, lid: 'dark:water' }); break;
        case 'heap': pd(it.rags ? 'umber:cloth_oat' : 'char:rubble', 0, y0, 0, hu, 0.3, 7, { r2: hu * 0.4 }); break;
        case 'ash': pd('char:rubble', 0, y0, 0, hu, 0.12, 7, { r2: hu * 0.5 }); break;
        case 'fallen': { const [ax, aw] = at(0, -hv + 0.12), [bx, bw] = at(0, hv); K.beam('char:wood', L(ax, y0 + (it.low ? 0.9 : 1.75), aw), L(bx, y0 + 0.13, bw), 0.26, 0.24); break; }
        case 'rubble':
          // (Plaster and lath, brick and the ceiling's boards, heaped where it came down.)
          pd('char:rubble', 0, y0, 0, hu * 0.85, 0.26, 7, { r2: hu * 0.3 }); pd('dark:rubble', -0.3, y0, 0.2, 0.35, 0.2, 6, { r2: 0.12 });
          // (Broken stone and brick out of it, each its own size, and the plaster's pale lumps: not a smooth heap.)
          if (!lean) for (let k = 0; k < 9; k++) { const a = k * 2.39, d = 0.25 + (k % 4) * 0.17, s3 = 0.05 + ((k * 7) % 5) * 0.025; pb(k % 3 ? 'char:stone' : 'pale:rubble', Math.cos(a) * d * hu / 0.75, y0 + (k % 3 === 2 ? 0.12 : 0), Math.sin(a) * d * hv / 0.6, s3 * 1.3, s3, s3 * 0.8); }
          if (!lean) for (let k = 0; k < 4; k++) { const a = k * 1.7 + 0.4, [qx, qw] = at(Math.cos(a) * hu * 0.7, Math.sin(a) * hv * 0.6), [rx, rw] = at(Math.cos(a) * hu * 0.7 + Math.sin(a) * 0.6, Math.sin(a) * hv * 0.6 - Math.cos(a) * 0.5); K.beam('char:wood', L(qx, y0 + 0.28 - k * 0.04, qw), L(rx, y0 + 0.03, rw), 0.1, 0.03); }
          break;
        case 'boards': { const [ax, aw] = at(-0.2, -hv), [bx, bw] = at(0.2, hv); K.beam('char:wood', L(ax, y0 + 0.03 + it.tw * 0.04, aw), L(bx, y0 + 0.08, bw), 0.22, 0.035); break; }
        case 'lantern': {
          // An iron lantern on a chain from the joists: a cap, four corner straps down to its base (no bar across them), a candle
          // inside it, its glow.
          const ly = y0 + it.ch - 0.8;
          pb('iron', 0, ly + 0.45, 0, 0.012, 0.35, 0.012, OPEN);
          pd('iron', 0, ly + 0.36, 0, 0.11, 0.05, 4, { r2: 0.05 }); pd('iron', 0, ly + 0.41, 0, 0.05, 0.04, 4, { r2: 0.012 });
          for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pb('iron', u * 0.085, ly + 0.03, v * 0.085, 0.01, 0.34, 0.01, OPEN);
          pd('iron', 0, ly, 0, 0.11, 0.035, 4);
          pd('pale:stone', 0, ly + 0.035, 0, 0.03, 0.12, 4); pc('flame', 0, ly + 0.155, 0, 0.032, 0.1, 3);
          lamp(Lat(0, 0, ly + 0.2), 10, 10);
          break;
        }
        case 'shelf': {
          // A shelf on the cross wall on two brackets from below (a bracket under each end: nothing across them), a row on it.
          pb('dark:wood', 0, y0 + 1.42, 0, hu, 0.035, hv);
          for (const e of [-1, 1]) pb('dark:wood', e * (hu - 0.08), y0 + 1.18, -hv + 0.04, 0.02, 0.24, 0.04, OPEN);
          if (!lean) for (let u = -hu + 0.12, j = 0; u < hu - 0.08; u += 0.2, j++) {
            if (j % 3 === 0) { pd('umber:rubble', u, y0 + 1.455, 0, 0.06, 0.13, 10, { r2: 0.065 }); pd('umber:rubble', u, y0 + 1.585, 0, 0.065, 0.05, 10, { r2: 0.03 }); }
            else if (j % 3 === 1) pd('pale:stone', u, y0 + 1.455, 0, 0.065, 0.12, 10, { r2: 0.07 });
            else pb(it.stock === 'pots' ? 'soot:wood' : 'dark:cloth_red', u, y0 + 1.455, 0, 0.07, 0.09, 0.09);
          }
          break;
        }
        case 'candlestand': pd('iron', 0, y0, 0, 0.05, 1.3, 4, { open: true }); pd('iron', 0, y0 + 1.3, 0, 0.12, 0.03, 5); candle(0, y0 + 1.33, 0); lamp(Lat(0, 0, y0 + 1.6), 7, 6); break;
        case 'desk': {
          pb('wood', 0, y0 + 0.74, 0, hu, 0.05, hv); for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.05), y0, 0, 0.04, 0.74, hv - 0.03);
          pb('pale:stone', -0.1, y0 + 0.79, 0.02, 0.2, 0.004, 0.14); pb('dark:wood', 0.3, y0 + 0.79, -0.05, 0.12, 0.08, 0.09); pd('dark:stone', 0.12, y0 + 0.79, -0.12, 0.03, 0.06, 4);
          if (it.books || it.ledger) { pb('dark:cloth_red', -0.35, y0 + 0.79, -0.1, 0.11, 0.06, 0.08); pb('umber:cloth_oat', -0.35, y0 + 0.85, -0.1, 0.1, 0.05, 0.075); }
          candle(-hu + 0.12, y0 + 0.79, -hv + 0.1); lamp(Lat(0, 0, y0 + 1.2), 6, 5);
          pd('wood', 0, y0, hv + 0.3, 0.17, 0.46, 5);
          break;
        }
        case 'loom': {
          // A loom: two uprights, its beams at the top, the breast and the foot between them (each ends at the uprights: no
          // beam crosses a post), the warp down between, the cloth on the breast beam.
          for (const e of [-1, 1]) pb('dark:wood', e * hu, y0, 0, 0.04, 1.5, hv);
          for (const [yy, vv] of [[1.4, -hv + 0.05], [0.75, hv - 0.05], [0.2, -hv + 0.05]]) pb('wood', 0, y0 + yy, vv, hu - 0.04, 0.06, 0.05);
          face('cloth_oat', -hu + 0.06, hu - 0.06, y0 + 0.8, y0 + 1.4, 0);
          pd('wood', 0, y0, hv + 0.35, 0.17, 0.46, 5);
          break;
        }
        case 'oven': {
          // A baker's oven: a domed clay oven on a stone base against the wall, its mouth dark, the peel stood by it.
          // (Its dome daubed clay, round, stepped in to its crown; the mouth's embers aglow. It had read as a rock, the critics.)
          pb('stone', 0, y0, 0, hu, 0.8, hv);
          pd('umber:ph_grey_plaster', 0, y0 + 0.8, -0.05, hv * 0.98, 0.22, 12, { r2: hv * 0.86 }); pd('umber:ph_grey_plaster', 0, y0 + 1.02, -0.05, hv * 0.86, 0.2, 12, { r2: hv * 0.58 }); pd('umber:ph_grey_plaster', 0, y0 + 1.22, -0.05, hv * 0.58, 0.12, 12, { r2: 0.1 });
          face('char:stone', -0.22, 0.22, y0 + 0.81, y0 + 1.06, hv + 0.01);
          face('eve:flame', -0.16, 0.16, y0 + 0.81, y0 + 0.88, hv + 0.015);
          if (!lean) { for (let k = 0; k < 3; k++) pd('umber:cloth_oat', -hu + 0.2 + k * 0.17, y0 + 0.8, hv - 0.12, 0.07, 0.07, 6, { r2: 0.05 }); lamp(Lat(0, hv + 0.4, y0 + 1.0), 6, 6); }
          { const [ax, aw] = at(hu + 0.12, hv - 0.1); K.beam('wood', L(ax, y0, aw), L(ax, y0 + 1.75, aw), 0.04); }
          break;
        }
        case 'trough': pb('wood', 0, y0 + 0.62, 0, hu, 0.22, hv); for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.08), y0, 0, 0.04, 0.62, hv - 0.04); pb('cloth_oat', 0, y0 + 0.84, 0, hu - 0.04, 0.012, hv - 0.04); break;
        case 'dipframe': {
          // The chandler's dipping frame: two posts, a board along their tops ending at them, wicks of tallow hung straight
          // down along it (never one from its middle alone). A pot of tallow under it.
          for (const e of [-1, 1]) pb('dark:wood', e * hu, y0, 0, 0.04, 1.4, 0.04);
          pb('wood', 0, y0 + 1.4, 0, hu + 0.04, 0.05, 0.06);
          for (let k = 0; k < 6; k++) { const u = -hu + 0.15 + k * (2 * hu - 0.3) / 5; pd('pale:stone', u, y0 + 0.95, 0, 0.02, 0.42, 3, { open: true }); }
          pd('iron', 0, y0, hv, 0.2, 0.3, 6, { lid: 'pale:stone' });
          break;
        }
        case 'vat': pd('soot:wood', 0, y0, 0, hu, 0.75, 8, { lid: it.dye || 'mire:water' }); break;
        case 'hide': face(it.cloth ? 'cloth_red' : 'umber:cloth_oat', -hu, hu, y0 + 0.6, y0 + 1.75, -hv + 0.03); pb('wood', 0, y0 + 1.75, -hv + 0.04, hu + 0.03, 0.03, 0.03); break;
        case 'bench': {
          pb('wood', 0, y0 + 0.78, 0, hu, 0.06, hv); for (const e of [-1, 1]) leg('dark:wood', e * (hu - 0.06), y0, 0, 0.05, 0.78, hv - 0.04);
          if (it.bones) for (let k = 0; k < 3; k++) pb('pale:stone', -hu + 0.25 + k * 0.35, y0 + 0.84, (k % 2) * 0.1, 0.1, 0.03, 0.03);
          if (it.lasts) for (let k = 0; k < 3; k++) pb('dark:wood', -hu + 0.3 + k * 0.3, y0 + 0.84, 0, 0.05, 0.08, 0.11);
          if (it.mortar) { pd('pale:stone', 0.2, y0 + 0.84, 0, 0.1, 0.1, 6, { lid: 'dark:stone' }); pd('dark:stone', -0.25, y0 + 0.84, 0, 0.05, 0.14, 4); }
          if (it.tools) { pb('iron', -0.3, y0 + 0.84, 0, 0.18, 0.02, 0.03); pb('iron', 0.2, y0 + 0.84, 0.08, 0.04, 0.12, 0.04); }
          pd('wood', 0, y0, hv + 0.3, 0.17, 0.46, 5);
          break;
        }
        case 'forge': {
          // A smith's hearth: a waist-high block of stone, its bed of coals aglow, a back of dark stone, the bellows by it.
          pb('stone', 0, y0, 0, hu, 0.78, hv); pb('dark:stone', 0, y0 + 0.78, -hv + 0.1, hu, 0.7, 0.1);
          const [ax, aw] = at(0, 0.05), FX = Fx === 0 ? [hu - 0.12, hv - 0.2] : [hv - 0.2, hu - 0.12]; Q('eve:flame', L(ax - FX[0], y0 + 0.79, aw - FX[1]), L(ax - FX[0], y0 + 0.79, aw + FX[1]), L(ax + FX[0], y0 + 0.79, aw + FX[1]), L(ax + FX[0], y0 + 0.79, aw - FX[1]), [0, 1, 0]);
          pb('dark:wood', hu + 0.25, y0 + 0.5, 0, 0.2, 0.12, 0.35); pb('umber:cloth_oat', hu + 0.25, y0 + 0.62, 0, 0.17, 0.12, 0.3);
          // (Its hood over the coals, tapering to the flue: the smith's from across the street.)
          pd('soot:stone', 0, y0 + 1.55, -hv * 0.3, Math.min(hu, hv) * 0.95, 0.55, 6, { r2: 0.22 }); pd('soot:stone', 0, y0 + 2.1, -hv * 0.3, 0.22, 1.05, 6);
          if (!lean) for (let k = 0; k < 4; k++) { pd('char:rubble', (k - 1.5) * 0.18, y0 + 0.78, 0.05 + (k % 2) * 0.1, 0.08, 0.06, 5, { r2: 0.04 }); pc('flame', (k - 1.5) * 0.18 + 0.06, y0 + 0.79, 0.12 - (k % 2) * 0.08, 0.05, 0.1 + (k % 3) * 0.04, 3); }
          if (!lean) lamp(Lat(0, 0.3, y0 + 1.1), 7, 9);
          break;
        }
        case 'anvil': pd('dark:wood', 0, y0, 0, 0.26, 0.5, 6); pb('iron', 0, y0 + 0.5, 0, 0.3, 0.22, 0.12); pb('iron', 0.38, y0 + 0.62, 0, 0.1, 0.08, 0.06); break;
        case 'coffins':
          // (Made and stood against the wall, head up, waiting for whoever's next.)
          for (let k = 0; k < 2; k++) {
            prism('wood', coffinPts(0.25, 0.9), (q, t) => Lat(-0.27 + k * 0.54 + q[0], -hv + 0.03 + t * 0.24, y0 + 0.02 + (0.9 - q[1])), [0, 1]);
            prism('dark:wood', coffinPts(0.265, 0.92), (q, t) => Lat(-0.27 + k * 0.54 + q[0], -hv + 0.27 + t * 0.035, y0 + 0.02 + (0.9 - q[1])), [0, 1]);
          }
          break;
        case 'planks': for (let k = 0; k < 3; k++) pb('wood', 0, y0, -hv + 0.03 + k * 0.06, hu, 1.9 - k * 0.2, 0.025); break;
        case 'bones': for (let k = 0; k < 5; k++) pd('pale:stone', (k % 3 - 1) * 0.18, y0 + Math.floor(k / 3) * 0.1, ((k * 7) % 3 - 1) * 0.12, 0.05, 0.1, 4); break;
        case 'rope': pd('umber:cloth_oat', 0, y0, 0, hu * 0.9, 0.22, 8, { r2: hu * 0.85, lid: 'dark:wood' }); break;
        case 'oars': for (let k = 0; k < 3; k++) { const [ax, aw] = at(-hu + 0.2 + k * 0.45, 0.25), [bx, bw] = at(-hu + 0.3 + k * 0.45, -0.05); K.beam('wood', L(ax, y0, aw), L(bx, y0 + 2.4, bw), 0.05); } break;
        case 'nets': face('dark:cloth_oat', -hu, hu, y0 + 0.4, y0 + 1.9, -hv + 0.04); pb('wood', 0, y0 + 1.9, -hv + 0.05, hu, 0.04, 0.03); break;
        case 'staves': for (let k = 0; k < 5; k++) { const [ax, aw] = at(-hu + 0.1 + k * 0.2, 0.12), [bx, bw] = at(-hu + 0.12 + k * 0.2, -0.1); K.beam('wood', L(ax, y0, aw), L(bx, y0 + 0.95, bw), 0.03, 0.08); } break;
        case 'coops': for (let k = 0; k < 2; k++) { pb('wood', -0.35 + k * 0.7, y0, 0, 0.32, 0.5, hv); face('dark:wood', -0.6 + k * 0.7, -0.1 + k * 0.7, y0 + 0.1, y0 + 0.45, hv + 0.005); } break;
        case 'armsrack': {
          // Spears leant on a rail against the wall, each by itself, none across another.
          pb('dark:wood', 0, y0 + 1.25, -hv + 0.04, hu, 0.06, 0.04);
          for (let k = 0; k < 4; k++) { const u = -hu + 0.2 + k * (2 * hu - 0.4) / 3, [ax, aw] = at(u, 0.15), [bx, bw] = at(u, -hv + 0.06); K.beam('wood', L(ax, y0, aw), L(bx, y0 + 2.1, bw), 0.03); pc('iron', u, y0 + 2.08, -hv + 0.06, 0.03, 0.22, 3); }
          break;
        }
        case 'armour': pd('dark:wood', 0, y0, 0, 0.04, 1.2, 4, { open: true }); pd('iron', 0, y0 + 1.0, 0, 0.2, 0.45, 6, { r2: 0.16 }); pd('iron', 0, y0 + 1.48, 0, 0.11, 0.16, 5); break;
      }
      if (K.stat) K.stat[it.k] = (K.stat[it.k] || 0) + vcount(K) - n0;
    }
  }
}
const NC = { collide: false }, OPEN = { collide: false, top: false };
const vcount = (K) => { let n = 0; for (const q of K.parts.values()) n += q.pos.length / 3; return n; };
// What a phone draws of a house's insides: who sleeps there, and where they eat and are served.
const LEAN_KEEP = new Set(['bed', 'cot', 'pallet', 'table', 'trestle', 'longtable', 'bar', 'counter']);
// A bed: its frame, the straw tick, the blanket, a pillow or two, its headboard and a low footboard; a four-poster's posts,
// tester and curtains; a box bed's sides and roof with its curtain; a cot on rockers; a pallet on the floor. (Its head to
// the wall: it faces out of the wall, its foot at +v.) On a phone: the frame, the blanket and the pillow.
function bed(it, pb, leg, face, y0, lean) {
  const { hu, hv } = it, wool = it.wool || 'p2_wool_blanket';
  if (it.k === 'charbed') { pb('char:wood', 0, y0, 0, hu, 0.25, hv); pb('char:wood', 0, y0, -hv, hu, 0.8, 0.04); return; }
  if (it.k === 'pallet') {
    pb('p2_hessian', 0, y0, 0, hu, 0.12, hv);
    pb(wool, 0, y0 + 0.12, 0.22, hu - 0.02, 0.04, hv - 0.24);
    if (!lean) pb('cloth_oat', 0, y0 + 0.12, -hv + 0.2, hu * 0.6, 0.07, 0.13);
    return;
  }
  if (it.k === 'cot') {
    pb('wood', 0, y0 + 0.1, 0, hu, 0.4, hv); pb(wool, 0, y0 + 0.5, 0.05, hu - 0.03, 0.03, hv - 0.08);
    if (!lean) for (const e of [-1, 1]) leg('dark:wood', 0, y0, e * (hv - 0.1), hu + 0.05, 0.1, 0.03);
    return;
  }
  const top = 0.38;
  // (The frame boxed to the floor, the tick and the blanket on it.)
  pb('dark:wood', 0, y0, 0, hu, top - 0.06, hv);
  pb(wool, 0, y0 + top - 0.06, 0.16, hu + 0.01, 0.12, hv - 0.15);
  // (The linen turned down over the cover's head; a pillow each, plump, a smaller lift on it: a bed made, not stripped.)
  pb('pale:cloth_oat', 0, y0 + top - 0.06, -hv + 0.4, hu + 0.015, 0.125, 0.09);
  // (Two pale bands woven across the cover near its foot, as the blanket over a sleeper has (src/gfx/blankets.js).)
  if (!lean) for (const v of [hv - 0.42, hv - 0.3]) pb('pale:cloth_oat', 0, y0 + top - 0.06, v, hu + 0.012, 0.122, 0.025);
  for (let k = 0; k < it.n; k++) { const u = it.n > 1 ? (k ? 0.34 : -0.34) : 0; pb('pale:cloth_oat', u, y0 + top - 0.06, -hv + 0.19, it.n > 1 ? 0.28 : 0.33, 0.13, 0.14); pb('pale:cloth_oat', u, y0 + top + 0.07, -hv + 0.19, it.n > 1 ? 0.24 : 0.29, 0.04, 0.11); }
  if (lean) return;
  pb('p2_hessian', 0, y0 + top - 0.06, -hv + 0.2, hu - 0.02, 0.07, 0.17, { top: false });
  // (Its headboard boarded whole up from the floor; a low footboard.)
  pb('dark:wood', 0, y0, -hv - 0.02, hu + 0.03, it.tester ? 1.1 : 0.95, 0.035);
  pb('dark:wood', 0, y0, hv + 0.02, hu + 0.03, 0.5, 0.03);
  if (it.tester) {
    // A four-poster: its posts to the tester, the tester a boarded canopy, a valance round it, curtains down at the head and
    // drawn back to the foot's posts. (Posts and boards meet at their corners; no rail crosses a post.)
    const H = 2.15;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) leg('dark:wood', su * (hu + 0.02), y0, sv * (hv + 0.02), 0.045, H, 0.045);
    pb('dark:wood', 0, y0 + H, 0, hu + 0.08, 0.08, hv + 0.08);
    pb('dark:cloth_red', 0, y0 + H - 0.25, 0, hu + 0.07, 0.25, hv + 0.07, { top: false });
    for (const su of [-1, 1]) face('dark:cloth_red', su * hu - 0.18, su * hu + 0.18, y0 + 0.35, y0 + H - 0.25, hv + 0.08);
    face('dark:cloth_red', -hu, hu, y0 + 1.1, y0 + H - 0.25, -hv + 0.01);
  } else if (it.box) {
    // A box bed: boarded in on its sides and over, its curtain half drawn on the room side.
    for (const su of [-1, 1]) leg('dark:wood', su * (hu + 0.04), y0, 0, 0.025, 1.7, hv + 0.04);
    pb('dark:wood', 0, y0 + 1.7, 0, hu + 0.07, 0.04, hv + 0.05);
    face('umber:cloth_oat', hu * 0.15, hu + 0.04, y0 + 0.3, y0 + 1.68, hv + 0.06);
  }
}
// The stock on a shop's shelves, three boards of it: candles in bundles, loaves, pies, bones carved, boots, iron, cloth,
// pawned odds and ends, or goods (crocks, boxes, bundles). A piece every third of a metre, boxes the most of them.
function stock(kind, ys, hu, pb, pd) {
  ys.forEach((y, j) => {
    for (let u = -hu + 0.16, k = 0; u < hu - 0.14; u += 0.33, k++) {
      const v = 0.02 * ((k + j) % 3), q = (k + j) % 3;
      if (kind === 'candles') pb('pale:stone', u, y, v, 0.09, 0.22, 0.04);
      else if (kind === 'bread') pd('umber:cloth_oat', u, y, v, 0.1, 0.09, 5, { r2: 0.07 });
      else if (kind === 'pies') pd('umber:rubble', u, y, v, 0.1, 0.05, 5);
      else if (kind === 'bone') pb('pale:stone', u, y, v, 0.07, 0.04 + 0.03 * (k % 2), 0.05);
      else if (kind === 'boots') pb('dark:wood', u, y, v, 0.05, 0.16, 0.11);
      else if (kind === 'iron') pb('iron', u, y, v, 0.07, 0.03 + 0.06 * (k % 2), 0.05);
      else if (kind === 'cloth') pb(k % 2 ? 'cloth_red' : 'cloth_oat', u, y, v, 0.12, 0.12, 0.14);
      else if (kind === 'pawn') { if (q === 0) pd('iron', u, y, v, 0.06, 0.18, 5); else if (q === 1) pb('dark:wood', u, y, v, 0.08, 0.1, 0.07); else pd('pale:stone', u, y, v, 0.05, 0.12, 4); }
      else if (q === 0) pd('umber:rubble', u, y, v, 0.07, 0.17, 5, { r2: 0.05 }); else if (q === 1) pb('wood', u, y, v, 0.08, 0.12, 0.1); else pb('umber:cloth_oat', u, y, v, 0.09, 0.14, 0.08);
    }
  });
}
