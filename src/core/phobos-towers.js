// City State Phobos's towers, every one gone into (the owner, 2026-11-16: "make sure you can go in all the towers and
// spires and they have decor and purpose"). A tower that stands on its own ground has a door at its foot (the city's doors,
// src/items/phobos-doors.js, as the houses have), a room on each floor up a stair round the inside of its wall, its keepers'
// things in the rooms, and a chest on its top floor (src/items/chests.js towerChests). The city wall's towers are gone into
// where the wall-walk passes through them, a doorway either way: the wall fills them below the walk, so each is a guard
// post at the walk's height.
//
// cityTowers(): all of them, laid out once: { key, kind, layer, x, z, r, h, roof, o (tower()'s), cell, door?, ways? }.
// towerFar(K, t): the land's view of one (phobos-build.js tower(), as it was) in its cell's group, which the near view folds
//   away (src/gfx/phobos-near.js); and what stops a body at it, which never changes: its ring of wall, its door, its floors
//   and its stair. (Nothing drawn here that wasn't before: the land's one buffer is full.)
// towerNear(K, t): from near: its walls with the doorways cut, inside and out; the floors, the stair, the furniture, the
//   lamps, its door shut. (Nothing here stops a body: phobosCell drops what it pushes.)
// No piece makes a cross or a T: no crossed beams, bars only upright, a cage's rings round it. (The V/T rule.)

import { terrainHeight } from './terrain.js';
import { hash2 } from './terrain-noise.js';
import { CITY, CITY_WALL } from './east.js';
import { PHOBOS } from './phobos-data.js';
import { DOOR, castleWallTowers, cellOf, doorLeaf, fire, houseDoor, moatLevel, onFloor, phobosHouses, spiral, streetNear, tower, walk } from './phobos-build.js';
import { Kit } from './sites.js';

const TAU = Math.PI * 2, Y = (x, z) => terrainHeight(x, z);
const FH = 4.6;        // floor to floor
const DH = 2.5;        // a doorway's height
const WAY = 2.2;       // half a wall-walk passage's width through a tower
const DAIS = 0.2;      // the step a tower's chest stands on
const segD = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
};
const wrap = (a) => ((a % TAU) + TAU + Math.PI) % TAU - Math.PI;
const inArc = (a, [a0, a1]) => wrap(a - a0) >= 0 && wrap(a - a0) <= wrap(a1 - a0 + 1e-9) + 1e-9 && a1 - a0 < TAU;

// How many floors over the ground floor each kind has (as its height allows), what's on its walls inside, its chest's tier.
const UPS = { study: 2, eye: 3, guard: 1, gaol: 1, ossuary: 2, gibbet: 1, counting: 2, sluice: 1, burnt: 1, hospice: 2 };
// (A guard room's and a wall tower's plastered: in the wall's own sooted basalt they were black a metre up, the critics.)
// (Not the PH2 sooty plaster: its stains run in bands a metre apart, a hard seam each, the critics.)
const INSIDE = { study: 'pale:ph_grey_plaster', eye: 'pale:ph_grey_plaster', ossuary: 'p2_bone_plaster', counting: 'p2_black_panelling', hospice: 'ph_grey_plaster', burnt: 'char:rubble', guard: 'ph_grey_plaster', wall: 'ph_grey_plaster', sluice: 'ph_grey_plaster' };
const TIER = { study: 2, eye: 2, counting: 2, guard: 1, gaol: 1, ossuary: 1, gibbet: 1, sluice: 1, burnt: 1, hospice: 0, wall: 1 };
// Each floor's room, from the ground up: its floor, what stands against its walls (a side each, in turn), what's in its
// middle. A mage's: books, then the stillroom, then the scrying pool. A guard tower's: the guardroom, then the bunks.
const ROOMS = {
  study: [{ floor: 'p2_worn_floorboards', walls: ['books', 'desk', 'books', 'candles'], mid: 'rug' }, { walls: ['jars', 'bench', 'jars', 'desk', 'bench'], mid: 'cauldron' }, { walls: ['books', 'candles', 'jars', 'books'], mid: 'pool' }],
  eye: [{ floor: 'p2_oxblood_marble', walls: ['books', 'books', 'desk', 'books', 'candles'], mid: 'table' }, { walls: ['jars', 'bench', 'jars', 'books'], mid: 'cauldron' }, { walls: ['books', 'candles', 'desk'], mid: 'pool' }, { walls: ['books', 'jars'], mid: 'rug' }],
  guard: [{ floor: 'flags', walls: ['spears', 'bunk', 'livery', 'strongbox', 'barrels', 'crates', 'spears', 'bunk'], mid: 'table' }, { walls: ['bunk', 'bunk', 'livery', 'barrels'], mid: 'brazier' }],
  gaol: [{ floor: 'flags', walls: ['cage', 'chains', 'desk', 'cage'], mid: 'brazier' }, { walls: ['cage', 'chains', 'cage'], mid: null }],
  ossuary: [{ floor: 'p2_bone_joint_flags', walls: ['bones', 'candles', 'bones'], mid: 'slab' }, { walls: ['bones', 'bones', 'candles'], mid: null }, { walls: ['bones', 'candles'], mid: null }],
  gibbet: [{ floor: 'flags', walls: ['chains', 'rope', 'barrels'], mid: 'cage' }, { walls: ['chains', 'bunk'], mid: 'brazier' }],
  counting: [{ floor: 'p2_oxblood_marble', walls: ['ledger', 'strongbox', 'tapestry', 'ledger'], mid: 'table' }, { walls: ['books', 'strongbox', 'books'], mid: 'rug' }, { walls: ['tapestry', 'ledger'], mid: null }],
  sluice: [{ floor: 'flags', walls: ['barrels', 'crates', 'rope', 'barrels'], mid: 'wheel' }, { walls: ['crates', 'bunk'], mid: 'brazier' }],
  burnt: [{ floor: 'p2_ash_street', walls: ['rubble', 'beam', 'rubble'], mid: 'rubble' }, { walls: ['beam', 'rubble'], mid: null }],
  hospice: [{ floor: 'flags', walls: ['cot', 'cot', 'jars', 'cot'], mid: 'basin' }, { walls: ['cot', 'cot', 'jars'], mid: 'brazier' }, { walls: ['cot', 'cot'], mid: null }],
  wall: [{ floor: 'flags', walls: ['spears', 'livery', 'bunk', 'brazier', 'barrels', 'livery', 'crates', 'table', 'brazier', 'bunk'], mid: 'brazier' }],
};

// ---------------------------------------------------------------- where they stand

// The wall-walk's height along each of the wall's twelve sides: level, at 50 m over the highest ground along it.
let TOPS = null;
export function wallTops() {
  if (TOPS) return TOPS;
  const W = CITY_WALL;
  TOPS = W.map((a, i) => {
    const b = W[(i + 1) % 12]; let hi = -Infinity;
    for (let k = 0; k <= 40; k++) hi = Math.max(hi, Y(a[0] + (b[0] - a[0]) * k / 40, a[1] + (b[1] - a[1]) * k / 40));
    return hi + 50 + 0.06;
  });
  return TOPS;
}

// The wall's: a great drum at each corner, two at each gate, a lesser one every 100 m or so between; and the barbican's
// two out past the moat, which stand on their own. ways: each doorway's angle and the walk's height there.
function wallTowers(out) {
  const W = CITY_WALL, TOP = wallTops(), gates = PHOBOS.gates.map((g) => [g.x, g.z]), L = 'soot:ph_basalt';
  for (let i = 0; i < 12; i++) {
    const a = W[i], b = W[(i + 1) % 12], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, top = TOP[i], along = Math.atan2(uz, ux);
    const g = gates.find((q) => segD(q[0], q[1], a, b) < 12);
    if (g) {
      const t = (g[0] - a[0]) * ux + (g[1] - a[1]) * uz, gx = a[0] + ux * t, gz = a[1] + uz * t;
      // (Not where a corner's great drum stands already: the north gate's west tower was in the corner's room.)
      for (const s of [-1, 1]) if (!W.some((c) => Math.hypot(c[0] - gx - ux * s * 24, c[1] - gz - uz * s * 24) < 29)) out.push({ key: `gate${i}_${s}`, kind: 'wall', layer: L, x: gx + ux * s * 24, z: gz + uz * s * 24, r: 16, h: 122, roof: 'soot:roof_2', o: { steep: 2.2, sides: 16, pass: top }, ways: [[along, top], [along + Math.PI, top]] });
    }
    const prev = TOP[(i + 11) % 12], lo = Math.min(prev, top), hi = Math.max(prev, top), pa = W[(i + 11) % 12], back = Math.atan2(pa[1] - a[1], pa[0] - a[0]);
    const c = { key: `corner${i}`, kind: 'wall', layer: L, x: a[0], z: a[1], r: 17, h: Math.max(92, hi - Y(a[0], a[1]) + 30), roof: 'soot:roof_2', o: { steep: 2, sides: 16, pass: lo }, ways: [[along, top], [back, prev]] };
    // (Inside a corner a stair winds from the lower of the two walks to the higher: src/core/phobos-build.js wall.)
    if (hi - lo > 0.6) {
      const from = top < prev ? along : back, to = top < prev ? back : along, n = Math.ceil((hi - lo) / 0.5), want = n * 0.95 / 6;
      let turn = ((to - from) % TAU + TAU) % TAU;
      turn += TAU * Math.max(0, Math.round((want - turn) / TAU));
      c.spiral = { from, turn, to };
    }
    out.push(c);
    const n = Math.round(len / 100);
    for (let k = 1; k < n; k++) {
      const x = a[0] + ux * len * k / n, z = a[1] + uz * len * k / n;
      if (g && Math.hypot(x - g[0], z - g[1]) < 60) continue;
      out.push({ key: `lesser${i}_${k}`, kind: 'wall', layer: L, x, z, r: 11, h: Math.max(74, top - Y(x, z) + 24), roof: k % 2 ? null : 'soot:roof_2', o: { pass: top }, ways: [[along, top], [along + Math.PI, top]] });
    }
  }
  const bx = CITY.x - CITY.a - 34;
  for (const s of [-1, 1]) out.push({ key: `barbican${s}`, kind: 'guard', layer: L, x: bx, z: s * 24 - 6, r: 10, h: 48, roof: 'soot:roof_2', o: {}, face: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
}

// The districts' landmarks' towers (src/core/phobos-build.js landmarks), each its kind. at: what its door looks toward;
// blocks: what it's built against ({ x, z, hx, hz, yaw }), which it's stood clear of so its room is its own, its door the
// other way.
function landmarkTowers(out) {
  const D = Object.fromEntries(PHOBOS.districts.map((d) => [d.key, d])), dun = (k) => PHOBOS.dungeons.find((q) => q.district === k);
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const add = (key, kind, layer, x, z, r, h, roof, o, at, blocks = []) => out.push({ key, kind, layer, x, z, r, h, roof, o, at, blocks });
  { const d = { x: D.bones.x + 14, z: D.bones.z - 62 }, nave = { x: d.x, z: d.z, hx: 64, hz: 21, yaw: 0.2 };
    for (const s of [-1, 1]) add(`ossuary${s}`, 'ossuary', 'dark:course', d.x - 62 + s * 4, d.z + s * 24 - 13, 10, 128, 'soot:roof_2', { steep: 4 }, d, [nave]); }
  { const d = { x: D.market.x + 4, z: D.market.z - 34 }; add('gibbet', 'gibbet', 'ph_basalt', d.x, d.z, 8, 72, null, {}, D.market); }
  { const d = D.barracks, drill = { x: d.x, z: d.z - 84, hx: 54, hz: 13, yaw: 0 };
    for (const [sx, sz] of C4) add(`parade${sx}${sz}`, 'guard', 'soot:block', d.x + sx * 60, d.z + sz * 60, 11, 46, null, {}, d, sz < 0 ? [drill] : []);
    // (The Marshal's square tower, a box before: a drum of four sides is the same box.)
    add('marshal', 'guard', 'block', d.x + 70, d.z - 84, 12 / Math.cos(Math.PI / 4), 82, null, { sides: 4, turn: Math.PI / 4, sink: 2, bare: true }, d); }
  { const g = dun('mages');
    add('eye', 'eye', 'frost:course', g.x, g.z, 15, 196, 'soot:roof_2', { steep: 3.6, sides: 16 }, Math.hypot(D.mages.x - g.x, D.mages.z - g.z) > 5 ? D.mages : CITY);
    add('eye_w', 'study', 'frost:course', g.x - 34, g.z + 20, 7, 104, 'soot:roof_2', { steep: 4 }, g);
    add('eye_e', 'study', 'frost:course', g.x + 26, g.z + 30, 6, 86, 'soot:roof_2', { steep: 4 }, g); }
  { const q = dun('dukes'), g = { x: q.x + 26, z: q.z + 30 }, vault = { x: g.x, z: g.z, hx: 34, hz: 34, yaw: 0.3 };
    for (const [sx, sz] of C4) add(`vault${sx}${sz}`, 'counting', 'pale:course', g.x + sx * 36, g.z + sz * 36, 5, 62, 'roof_1', { steep: 3 }, g, [vault]); }
  { const g = dun('wharf'); add('sluice', 'sluice', 'dark:course', g.x, g.z, 14, 64, 'roof_4', { steep: 1.4, sides: 16 }, D.wharf.x === g.x && D.wharf.z === g.z ? CITY : D.wharf); }
  { const d = { x: D.cinder.x + 30, z: D.cinder.z - 84 };
    add('minster', 'burnt', 'dark:rubble', d.x - 46, d.z - 22, 8, 98, null, {}, d, [{ x: d.x - 46, z: d.z, hx: 4, hz: 18, yaw: 0 }, { x: d.x, z: d.z - 16, hx: 44, hz: 1.5, yaw: 0 }]); }
  { const g = dun('barracks'), gaol = { x: g.x, z: g.z, hx: 34, hz: 26, yaw: 0.2 };
    for (const [sx, sz] of C4) add(`gaol${sx}${sz}`, 'gaol', 'dark:course', g.x + sx * 33, g.z + sz * 26, 7, 58, null, {}, g, [gaol]);
    add('gaolgate', 'gaol', 'dark:course', g.x - 36, g.z, 9, 88, 'soot:roof_2', { steep: 2.6 }, g, [gaol]); }
  PHOBOS.forts.forEach((q, i) => {
    const o = [[0, 0], [30, 24], [-30, 24], [30, -24], [-30, -24], [0, 44], [0, -44]].find(([dx, dz]) => streetNear(q.x + dx, q.z + dz).d > 36) || [0, 0], f = { x: q.x + o[0], z: q.z + o[1] };
    add(`fort${i}`, 'guard', 'dark:course', f.x + 15, f.z - 15, 8, 66, 'soot:roof_2', {}, f, [{ x: f.x, z: f.z, hx: 18, hz: 18, yaw: 0.4 }]);
  });
  // (The Rotting Hospice's square tower, a box before.)
  { const g = dun('rookeries'); add('hospice', 'hospice', 'rubble', g.x + 30, g.z + 30, 7 / Math.cos(Math.PI / 4), 75, null, { sides: 4, turn: -0.9 - Math.PI / 4, sink: 1, bare: true }, g, [{ x: g.x, z: g.z, hx: 40, hz: 16, yaw: 0.9 }]); }
}

// How far a point is from a block's footprint (0 inside it).
function rectD(x, z, b) {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw), dx = x - b.x, dz = z - b.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.hypot(Math.max(0, Math.abs(lx) - b.hx), Math.max(0, Math.abs(lz) - b.hz));
}

// (Stood clear of what it's built against: that comes no further in than its wall. Its door the other way.)
function settle(t) {
  if (t.blocks?.length) {
    const ri = t.r - wallOf(t.r), b0 = t.blocks[0];
    let dx = t.x - b0.x, dz = t.z - b0.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    for (let k = 0; k < 80 && t.blocks.some((b) => rectD(t.x, t.z, b) < ri); k++) { t.x += dx * 0.5; t.z += dz * 0.5; }
    if (t.face === undefined) t.face = Math.atan2(dz, dx);
  }
  if (t.face === undefined && t.at) { const dx = t.at.x - t.x, dz = t.at.z - t.z; t.face = Math.hypot(dx, dz) > 1 ? Math.atan2(dz, dx) : 0; }
  t.cell = cellOf(t.x, t.z);
  return t;
}
// The wall's and the landmarks': laid out before the houses are, which keep off them (towerYards).
let BASE = null;
function baseTowers() {
  if (BASE) return BASE;
  const out = [];
  wallTowers(out);
  landmarkTowers(out);
  // (None in another landmark's block: the parade ground's south-east tower stood in the middle of the gaol. One a block
  // comes into is stood clear of it too.)
  const all = [...new Set(out.flatMap((t) => t.blocks || []))];
  for (const t of out) t.blocks ||= [];
  BASE = out.filter((t) => t.kind === 'wall' || !all.some((b) => !t.blocks.includes(b) && rectD(t.x, t.z, b) === 0)).map((t) => {
    if (t.kind !== 'wall') for (const b of all) if (!t.blocks.includes(b) && rectD(t.x, t.z, b) < t.r) t.blocks.push(b);
    return settle(t);
  });
  return BASE;
}
let TOWERS = null;
export function cityTowers() {
  if (TOWERS) return TOWERS;
  const out = [...baseTowers()];
  // The mages' spires among their houses (phobosHouses): each door on the alley its block's houses' doors are on.
  phobosHouses().forEach((h, i) => {
    if (!h.spire) return;
    const f = h.front || 1, yaw = h.yaw || 0;
    out.push(settle({ key: `spire${i}`, kind: 'study', layer: h.wall, x: h.x, z: h.z, r: h.r, h: h.h, roof: 'p2_verdigris_roof', o: { steep: 2.2 }, face: Math.atan2(f * Math.cos(yaw), f * Math.sin(yaw)), spire: true }));
  });
  // And Castle Velscour's own wall towers (src/core/phobos-build.js castleWallTowers), last, so every door's and chest's
  // number before them stays what it was.
  for (const t of castleWallTowers()) if (!t.plain) out.push(settle({ ...t, castle: true }));
  let n = 0;
  for (const t of out) if (t.kind !== 'wall') t.door = 20000 + n++;
  TOWERS = out;
  return out;
}
// Where no house of the city's may stand (src/core/phobos-build.js phobosHouses): each landmark's tower, the ground before
// its door, and the blocks they're built against; and the Tanners' great stack's. As the houses' rects: { x, z, yaw, hx, hz }.
// (Houses were laid with no thought of them: some stood in the gaol, the Ninefold Eye had five through it.)
export function towerYards() {
  const out = [];
  for (const t of baseTowers()) {
    if (t.kind === 'wall') continue;
    const p = plan(t), f = p.face, d = p.apO + 2.2;
    out.push({ x: t.x, z: t.z, yaw: 0, hx: t.r + 1, hz: t.r + 1, yard: true });
    out.push({ x: t.x + Math.cos(f) * d, z: t.z + Math.sin(f) * d, yaw: Math.PI / 2 - f, hx: DOOR + 1.2, hz: 2.4, yard: true });
    for (const b of t.blocks || []) out.push({ ...b, yard: true });
  }
  const D = Object.fromEntries(PHOBOS.districts.map((q) => [q.key, q]));
  out.push({ x: D.tanners.x - 55, z: D.tanners.z + 50, hx: 20, hz: 16, yaw: 0.4, yard: true });
  // (And the burnt minster's nave, its two ruined walls and between: src/core/phobos-build.js landmarks.)
  out.push({ x: D.cinder.x + 28, z: D.cinder.z - 84, hx: 49, hz: 19, yaw: 0, yard: true });
  return out;
}
export const towerByKey = (key) => cityTowers().find((t) => t.key === key);
// (How far in from its middle its wall's inner face is, at a side's middle.)
export const towerInner = (t) => plan(t).apI;
// (Inside one of the wall's towers: the wall's merlons stop at them, and its walk runs into each one's room.)
export const wallTowerAt = (x, z, pad = 0) => cityTowers().find((t) => t.kind === 'wall' && Math.hypot(x - t.x, z - t.z) < t.r + pad);

// ---------------------------------------------------------------- inside

const wallOf = (r) => Math.min(2.2, Math.max(0.7, r * 0.13));
const PLANS = new Map();
function plan(t) {
  let p = PLANS.get(t);
  if (p) return p;
  const N = t.o.sides || 12, y = t.o.y ?? Y(t.x, t.z), wt = wallOf(t.r), ri = t.r - wt, k = Math.cos(Math.PI / N);
  p = { N, y, ri, apO: t.r * k, apI: ri * k };
  if (t.kind === 'wall') {
    p.a0 = 0;   // (turned as the land's is)
    p.lo = Math.min(...t.ways.map((w) => w[1])); p.hi = Math.max(...t.ways.map((w) => w[1]));
    p.gaps = t.ways.map(([a, wy]) => ({ a, w: WAY, y0: wy - 0.1, y1: wy + 3.4 }));
    p.ceil = p.hi + 5.2;
    PLANS.set(t, p);
    return p;
  }
  // Its door on the middle of a side; a square tower's on whichever of its four faces looks most the way it should.
  let face = t.face ?? 0;
  if (t.o.turn !== undefined) { const st = TAU / N; face = t.o.turn + st / 2 + Math.round(wrap(face - t.o.turn - st / 2) / st) * st; }
  p.face = face; p.a0 = face - Math.PI / N;
  // Its floor over the highest ground inside it, or out at its door.
  let g = Y(t.x, t.z);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g = Math.max(g, Y(t.x + Math.cos(a) * p.apI, t.z + Math.sin(a) * p.apI)); }
  for (const d of [0.4, 1.4]) g = Math.max(g, Y(t.x + Math.cos(face) * (p.apO + d), t.z + Math.sin(face) * (p.apO + d)));
  // (And over the moat's water where it stands on the bank: the barbican's ground floor was under the moat's sheet, its
  // room dark above head height, the critics' "no roof".)
  g = Math.max(g, moatLevel(t.x, t.z, t.r) + 0.25);
  p.fy = g + 0.12;
  p.gaps = [{ a: face, w: DOOR, y0: p.fy - 0.6, y1: p.fy + DH }];
  const ups = Math.max(0, Math.min(UPS[t.kind] ?? 1, Math.floor((y + t.h - p.fy - 7) / FH)));
  // The stair round the wall, from just past the door, a flight to each floor; the hole in each floor it comes up through.
  p.hw = Math.min(1.1, Math.max(0.6, p.apI * 0.17)); p.rs = p.apI - p.hw - 0.12; p.rIn = p.rs - p.hw - 0.15;
  const da = 0.95 / p.rs, steps = Math.ceil(FH / 0.5);
  let a = face + Math.asin(Math.min(1, (DOOR + 0.45) / p.rs));
  p.floors = [{ y: p.fy, hole: null }]; p.flights = [];
  for (let f = 1; f <= ups; f++) {
    const a1 = a + steps * da;
    p.flights.push({ y0: p.fy + (f - 1) * FH, y1: p.fy + f * FH, a0: a, a1 });
    p.floors.push({ y: p.fy + f * FH, hole: [a1 - 5.5 * da, a1 + 0.05] });
    a = a1;
  }
  p.ceil = p.fy + ups * FH + FH - 0.3;
  PLANS.set(t, p);
  return p;
}

// The angles round a floor's wall that are free for furniture: not the door, not under the stair or where it comes up.
function freeSides(t, p, fi) {
  const N = p.N, out = [], blocked = [];
  if (t.kind === 'wall') {
    // (Clear of its doorways, where the walk comes in.)
    for (const [a] of t.ways) { const w = Math.asin(Math.min(1, (WAY + 1.4) / (p.apI - 1))); blocked.push([a - w, a + w]); }
  } else {
    if (fi === 0) { const w = (DOOR + 0.7) / p.apI; blocked.push([p.face - w, p.face + w]); }
    const f = p.floors[fi];
    if (f.hole) blocked.push(f.hole);
    const up = p.flights[fi];
    if (up) blocked.push([up.a0 - 0.15, up.a1 + 0.1]);
  }
  for (let i = 0; i < N; i++) {
    const am = p.a0 + (i + 0.5) / N * TAU, half = Math.PI / N * 0.85;
    if (blocked.some((b) => inArc(am - half, b) || inArc(am + half, b) || inArc(am, b) || inArc(b[0], [am - half, am + half]))) continue;
    out.push(am);
  }
  return out;
}

// Where its chest stands: against a free side of its top floor (a wall tower's, one in three, in its room). null if none.
function chestSide(t, p) {
  if (t.kind === 'wall' && hash2(Math.round(t.x), Math.round(t.z)) > 0.34) return null;
  const fi = t.kind === 'wall' ? 0 : p.floors.length - 1, sides = freeSides(t, p, fi);
  return sides.length ? { fi, a: sides[0] } : null;
}

export function towerChests() {
  const out = [];
  for (const t of cityTowers()) {
    const p = plan(t), c = chestSide(t, p);
    if (!c) continue;
    // (On its dais, chestDais below: it's the room's reward, seen as your head comes up through the floor.)
    const y = (t.kind === 'wall' ? p.lo : p.floors[c.fi].y) + DAIS, r = p.apI - 0.5, x = t.x + Math.cos(c.a) * r, z = t.z + Math.sin(c.a) * r;
    // (Its front to the room: chests.js has a chest's front the way (sin yaw, cos yaw).)
    out.push({ type: 'chest', x, y, z, yaw: Math.atan2(-Math.cos(c.a), -Math.sin(c.a)), loot: TIER[t.kind] ?? 1, tower: t.key });
  }
  return out;
}

// A tower's door as the city's doors have them (phobos-build.js houseDoor): its frame's middle, turned so local +z is out
// through the doorway; the inner face the leaf hangs on.
export function towerDoor(t) {
  const p = plan(t);
  return { id: t.door, x: t.x, z: t.z, yaw: Math.PI / 2 - p.face, f: 1, iz: p.apI, hz: p.apO, fy: p.fy, kind: 'p2_door_iron' };
}
// Every door in the city that opens: the houses' and the towers'.
let DOORS = null;
export function cityDoors() {
  if (DOORS) return DOORS;
  DOORS = [];
  for (const h of phobosHouses()) if (h.door !== undefined) DOORS.push(houseDoor(h));
  for (const t of cityTowers()) if (t.door !== undefined) DOORS.push(towerDoor(t));
  return DOORS;
}
/** The city's doors as another thread worked them out (src/core/sites.worker.js): this thread's from here on. */
export function adoptCityDoors(list) { if (!DOORS && Array.isArray(list)) DOORS = list; }

// ---------------------------------------------------------------- faces

// A point on an n-sided ring of circumradius R (turned by a0) about (x, z), at angle th.
function onRing(x, z, R, N, a0, th) {
  const i = Math.floor(((th - a0) % TAU + TAU) % TAU / (TAU / N)), mid = a0 + (i + 0.5) * TAU / N, q = R * Math.cos(Math.PI / N) / Math.cos(th - mid);
  return [x + Math.cos(th) * q, z + Math.sin(th) * q];
}
// The doorways through a side, as angles along it: [[from, to, y0, y1]].
function gapCuts(gaps, mid, s0, s1, ap) {
  const out = [];
  for (const g of gaps) { const d = wrap(g.a - mid), c0 = mid + d - g.w / ap, c1 = mid + d + g.w / ap; if (c1 > s0 && c0 < s1) out.push([Math.max(s0, c0), Math.min(s1, c1), g.y0, g.y1]); }
  return out.sort((p, q) => p[0] - q[0]);
}
// The faces of a ring of wall from y0 to y1, looking out (dir 1) or in (-1), the doorways (gaps) cut through it.
function ringFaces(K, layer, x, z, R, N, a0, y0, y1, gaps, dir) {
  const ap = R * Math.cos(Math.PI / N);
  for (let i = 0; i < N; i++) {
    const s0 = a0 + i / N * TAU, s1 = s0 + TAU / N, mid = s0 + Math.PI / N, n = [Math.cos(mid) * dir, 0, Math.sin(mid) * dir];
    const at = (th) => { const q = ap / Math.cos(th - mid); return [x + Math.cos(th) * q, z + Math.sin(th) * q]; };
    const col = (ta, tb, ya, yb) => {
      if (tb - ta < 1e-4 || yb - ya < 1e-3) return;
      const [ax, az] = at(ta), [bx, bz] = at(tb);
      // (Wound to face the way it looks: wound the other way, Kit.quad turns it round and its painting runs up its height,
      // smeared, the critics' stretched cheek by the spire's door.)
      if (dir > 0) K.quad(layer, [bx, ya, bz], [ax, ya, az], [ax, yb, az], [bx, yb, bz], n);
      else K.quad(layer, [ax, ya, az], [bx, ya, bz], [bx, yb, bz], [ax, yb, az], n);
    };
    let t0 = s0;
    for (const [c0, c1, gy0, gy1] of gapCuts(gaps, mid, s0, s1, ap)) { col(t0, c0, y0, y1); col(c0, c1, y0, Math.max(y0, gy0)); col(c0, c1, Math.min(y1, gy1), y1); t0 = Math.max(t0, c1); }
    col(t0, s1, y0, y1);
  }
}
// A doorway's cheeks, head and sill, through the wall from its outer ring to its inner.
function reveals(K, layer, x, z, R, Ri, N, a0, gaps, sill = 'stone') {
  const apO = R * Math.cos(Math.PI / N), apI = Ri * Math.cos(Math.PI / N);
  for (const g of gaps) {
    const O = (s) => onRing(x, z, R, N, a0, g.a + s * g.w / apO), I = (s) => onRing(x, z, Ri, N, a0, g.a + s * g.w / apI);
    const [o0, o1, i0, i1] = [O(-1), O(1), I(-1), I(1)], P = (q, y) => [q[0], y, q[1]];
    K.quad(layer, P(o0, g.y0), P(i0, g.y0), P(i0, g.y1), P(o0, g.y1), [Math.sin(g.a), 0, -Math.cos(g.a)]);
    K.quad(layer, P(i1, g.y0), P(o1, g.y0), P(o1, g.y1), P(i1, g.y1), [-Math.sin(g.a), 0, Math.cos(g.a)]);
    K.quad(layer, P(o0, g.y1), P(o1, g.y1), P(i1, g.y1), P(i0, g.y1), [0, -1, 0]);
    K.quad(sill, P(o0, g.y0 + 0.6 * (g.w === DOOR)), P(o1, g.y0 + 0.6 * (g.w === DOOR)), P(i1, g.y0 + 0.6 * (g.w === DOOR)), P(i0, g.y0 + 0.6 * (g.w === DOOR)), [0, 1, 0]);
  }
}
// A floor (up) or a ceiling (down) filling the inner ring at y; hole: an arc of it open out from radius rIn (the stairwell).
function slab(K, layer, x, z, R, N, a0, y, hole, rIn, up) {
  const M = N * 3, C = [x, y, z];
  for (let j = 0; j < M; j++) {
    const t0 = a0 + j / M * TAU, t1 = a0 + (j + 1) / M * TAU, open = hole && inArc((t0 + t1) / 2, hole);
    const A = open ? [x + Math.cos(t0) * rIn, z + Math.sin(t0) * rIn] : onRing(x, z, R, N, a0, t0 + 1e-6), B = open ? [x + Math.cos(t1) * rIn, z + Math.sin(t1) * rIn] : onRing(x, z, R, N, a0, t1 - 1e-6);
    K.quad(layer, C, C, [B[0], y, B[1]], [A[0], y, A[1]], [0, up ? 1 : -1, 0]);
    // (The stairwell's edge: the floor's thickness round the hole.)
    if (open && up) K.quad('dark:wood', [A[0], y - 0.24, A[1]], [B[0], y - 0.24, B[1]], [B[0], y, B[1]], [A[0], y, A[1]], [-Math.cos((t0 + t1) / 2), 0, -Math.sin((t0 + t1) / 2)]);
  }
}
// The same floor to stand on: sixteen sectors, each out to the wall (or only to rIn over the stairwell).
function discRects(x, z, R, y, hole, rIn) {
  const out = [];
  for (let j = 0; j < 16; j++) {
    const a = (j + 0.5) / 16 * TAU, r1 = hole && inArc(a, hole) ? rIn : R;
    out.push([x + Math.cos(a) * r1 / 2, z + Math.sin(a) * r1 / 2, r1 / 2 + 0.2, Math.PI * r1 / 16 + 0.4, -a, y]);
  }
  return out;
}

// ---------------------------------------------------------------- what stops a body

export function towerFar(K, t) {
  const p = plan(t);
  let top;
  K.group('ph:' + t.cell, true, () => { top = tower(K, t.layer, t.x, t.z, t.r, t.h, t.roof, { ...t.o, collide: false, plain: t.spire, turn: p.a0 }); });
  const { x, z } = t;
  if (t.kind === 'wall') {
    // Its room at the walk's height: its ring of wall round it, open at each doorway, from a little under the floor to its
    // ceiling (below that it's the wall's, solid: tower()'s pass); its floor; and a corner's, its stair from the lower walk
    // to the upper and its gallery from the stair's head out to the upper walk's doorway.
    ringBoxes(K, x, z, p.apO, p.apI, p.N, p.a0, p.gaps, p.lo - 0.6, p.ceil);
    walk(K, discRects(x, z, p.apI, p.lo, null, 0));
    if (t.spiral) {
      spiral(K, null, x, z, 6, p.lo, p.hi, t.spiral.from, 1, { turn: t.spiral.turn, hw: 2.4 });
      // (From the stair's middle line out, not from the drum's middle: laid over the whole stair it covered the outer
      // half of the last three treads, and the top one left showing was 1.5 m under it, a step no one takes up or down:
      // tools/paths/map.mjs. The treads' inner halves are the way up onto it.)
      const a = t.spiral.to, g0 = 6, g1 = p.apI + 0.4; walk(K, [[x + Math.cos(a) * (g0 + g1) / 2, z + Math.sin(a) * (g0 + g1) / 2, (g1 - g0) / 2, WAY + 0.4, -a, p.hi]]);
    }
    towerFires(K, t, p);
    return top;
  }
  // Its wall, ground to top, open at its door; the door itself (shut till it's opened: src/items/phobos-doors.js, World).
  ringBoxes(K, x, z, p.apO, p.apI, p.N, p.a0, p.gaps, null, p.y + t.h);
  const f = p.face, c = Math.cos(f), s = Math.sin(f), dz = p.apI + 0.1;
  K.colliders.push({ x: x + c * dz, z: z + s * dz, hx: DOOR, hz: 0.07, yaw: -f - Math.PI / 2, h: p.fy + DH + 0.2 - Y(x + c * dz, z + s * dz), phDoor: t.door });
  // Its floors, its stair, the doorway's threshold, the steps up to it from the street.
  p.floors.forEach((fl) => walk(K, discRects(x, z, p.apI, fl.y, fl.hole, p.rIn)));
  for (const fl of p.flights) spiral(K, null, x, z, p.rs, fl.y0, fl.y1, fl.a0, 1, { hw: p.hw });
  walk(K, [[x + c * (p.apI + p.apO) / 2, z + s * (p.apI + p.apO) / 2, (p.apO - p.apI) / 2 + 0.4, DOOR - 0.05, -f, p.fy]]);
  const st = doorSteps(t, p);
  if (st.length) walk(K, st.map((q) => q.rect));
  towerFires(K, t, p);
  return top;
}

// Its fires, braziers' and the cauldron's: moving flames, the delves' (phobos-build.js fire), which are only drawn from the
// land's build (src/gfx/renderer.js delveFires), not a near cell's. So the rooms are furnished here too with nothing drawn,
// for where the fires are. (The critics: the cones had read as solid yellow paper.)
function towerFires(K, t, p) {
  const G = new Kit(false);
  G.fires = K.fires;
  const rooms = ROOMS[t.kind];
  if (t.kind === 'wall') { furnish(G, t, p, 0, p.lo, rooms[0]); lamp(G, t, p, p.lo); return; }
  p.floors.forEach((f, i) => { furnish(G, t, p, i, f.y, rooms[Math.min(i, rooms.length - 1)]); lamp(G, t, p, f.y); });
  doorFire(G, t, p);
}
// A brazier lit by its door outside, so a tower that opens is known from the street (the critics: nothing told which of
// ten thousand doors hid a chest). Not where the moat's water is.
function doorFire(K, t, p) {
  const f = p.face, c = Math.cos(f), s = Math.sin(f), d = p.apO + 0.75, u = DOOR + 1.05;
  const bx = t.x + c * d - s * u, bz = t.z + s * d + c * u, g = Y(bx, bz);
  if (moatLevel(bx, bz, 0.6) > g - 0.3) return;
  brazier(K, bx, g, bz);
}

// Steps down from its threshold to the street, where the street's lower: { rect, box: [x, y, z, hx, h, hz, yaw] } each.
function doorSteps(t, p) {
  const f = p.face, c = Math.cos(f), s = Math.sin(f), r0 = p.apO + 0.05, g = Y(t.x + c * (r0 + 1.2), t.z + s * (r0 + 1.2));
  if (p.fy - g < 0.3) return [];
  const n = Math.min(12, Math.ceil((p.fy - g) / 0.24)), rise = (p.fy - g) / n, tread = 0.38, out = [];
  for (let k = 1; k <= n; k++) {
    const d = r0 + (k - 0.5) * tread, x = t.x + c * d, z = t.z + s * d, top = p.fy - k * rise;
    out.push({ rect: [x, z, tread / 2 + 0.01, DOOR + 0.3, -f, top], box: [x, Math.min(top, g) - 0.4, z, tread / 2 + 0.01, top - Math.min(top, g) + 0.4, DOOR + 0.3, -f] });
  }
  return out;
}

// Its ring of wall as boxes, a box to each side's run between doorways, and over and under each doorway. b: from what
// height it stops a body (null: from the ground); top: to what height.
function ringBoxes(K, x, z, apO, apI, N, a0, gaps, b, top) {
  const am = (apO + apI) / 2, hz = (apO - apI) / 2 + 0.05;
  for (let i = 0; i < N; i++) {
    const s0 = a0 + i / N * TAU, s1 = s0 + TAU / N, mid = s0 + Math.PI / N, u = (th) => am * Math.tan(th - mid);
    const box = (ta, tb, yb, yt) => {
      if (tb - ta < 1e-4) return;
      const u0 = u(ta), u1 = u(tb), uc = (u0 + u1) / 2, cx = x + Math.cos(mid) * am - Math.sin(mid) * uc, cz = z + Math.sin(mid) * am + Math.cos(mid) * uc, ground = Y(cx, cz);
      if (yt - Math.max(yb ?? ground, ground) < 0.05) return;
      const o = { x: cx, z: cz, hx: (u1 - u0) / 2 + 0.05, hz, yaw: -mid - Math.PI / 2, h: yt - ground };
      if (yb !== null) { o.b = yb; o.t = yt; }
      K.colliders.push(o);
    };
    let t0 = s0;
    for (const [c0, c1, gy0, gy1] of gapCuts(gaps, mid, s0, s1, am)) { box(t0, c0, b, top); box(c0, c1, b, gy0); box(c0, c1, gy1, top); t0 = Math.max(t0, c1); }
    box(t0, s1, b, top);
  }
}

// ---------------------------------------------------------------- from near

export function towerNear(K, t) {
  const p = plan(t), { x, z } = t, N = p.N, a0 = p.a0, sink = t.o.sink ?? 3;
  tower(K, t.layer, x, z, t.r, t.h, t.roof, { ...t.o, turn: a0, gaps: p.gaps, shell: (y) => ringFaces(K, t.layer, x, z, t.r, N, a0, y - sink, y + t.h, p.gaps, 1) });
  const IN = INSIDE[t.kind] || t.layer, rooms = ROOMS[t.kind];
  if (t.kind === 'wall') {
    ringFaces(K, IN, x, z, p.ri, N, a0, p.lo - 0.3, p.ceil, p.gaps, -1);
    reveals(K, t.layer, x, z, t.r, p.ri, N, a0, p.gaps, 'flags');
    slab(K, 'flags', x, z, p.ri, N, a0, p.lo + 0.03, null, 0, true);
    ceiling(K, t, p);
    if (t.spiral) {
      // (Its steps slabs, not blocks: as blocks their undersides, each turned its own way, hung down in teeth.)
      spiral(K, IN, x, z, 6, p.lo, p.hi, t.spiral.from, 1, { turn: t.spiral.turn, hw: 2.4, thick: 0.7, wedge: true });
      const a = t.spiral.to; K.box(IN, x + Math.cos(a) * p.apI / 2, p.hi - 0.8, z + Math.sin(a) * p.apI / 2, p.apI / 2 + 0.3, 0.8, WAY + 0.4, -a, { collide: false });
    }
    furnish(K, t, p, 0, p.lo, rooms[0]);
    chestDais(K, t, p, p.lo);
    lamp(K, t, p, p.lo);
    return;
  }
  ringFaces(K, IN, x, z, p.ri, N, a0, p.fy - 0.4, p.ceil, p.gaps, -1);
  reveals(K, t.layer, x, z, t.r, p.ri, N, a0, p.gaps, 'flags');
  p.floors.forEach((f, i) => {
    slab(K, i === 0 ? rooms[0].floor : t.kind === 'burnt' ? 'char:wood' : 'p2_worn_floorboards', x, z, p.ri, N, a0, f.y, f.hole, p.rIn, true);
    if (i > 0) slab(K, 'dark:wood', x, z, p.ri, N, a0, f.y - 0.24, f.hole, p.rIn, false);
    furnish(K, t, p, i, f.y, rooms[Math.min(i, rooms.length - 1)]);
    if (i === p.floors.length - 1) chestDais(K, t, p, f.y);
    lamp(K, t, p, f.y);
  });
  // (The stair in the room's own plaster, built with its walls: the brown rubble had fought them.)
  // (Out to the wall, its corners too, so no flight stands free of it; reach: how far past its walk it's drawn.)
  for (const f of p.flights) spiral(K, IN, x, z, p.rs, f.y0, f.y1, f.a0, 1, { hw: p.hw, thick: 0.9, wedge: true, reach: p.ri - p.apI + 0.17 });
  ceiling(K, t, p);
  doorLeaf(K, towerDoor(t));
  doorFire(K, t, p);
  for (const q of doorSteps(t, p)) K.box('soot:stone', ...q.box, { collide: false });
}

function ceiling(K, t, p) {
  const { x, z } = t, y = p.ceil;
  slab(K, 'dark:wood', x, z, p.ri, p.N, p.a0, y, null, 0, false);
  // (Three beams under it, side by side: never two across each other.)
  const a = p.a0 + 0.3, c = Math.cos(a), s = Math.sin(a), L = p.apI - 0.1;
  for (const o of [-0.4, 0, 0.4]) { const ox = -s * o * L, oz = c * o * L, half = Math.sqrt(Math.max(0, L * L - (o * L) ** 2)); K.beam('dark:wood', [x + ox - c * half, y - 0.16, z + oz - s * half], [x + ox + c * half, y - 0.16, z + oz + s * half], 0.24, 0.3); }
}

// A floor's light, hung high in its middle so its ceiling and the tops of its walls are lit (the critics: the big rooms
// went black a metre up and read as roofless): a deep iron fire bowl on one chain from the ceiling, where the ceiling's
// near enough to hang it from. (Not a ring of candles on chains: seen from under it, a chain from its far side crossed its
// near rim, a cross in a ring, the V/T rule. The bowl's deep and shut under, so its one chain shows only above it.) A
// wall's tower has its fire on its floor instead (its brazier, MIDS), its gallery over its middle. The burnt minster's
// has none: its fire's the rubble's. (The light itself a metre and more under the bowl: within half a metre of it, it lit
// the iron pale as a paper shade, whichever way its faces looked.)
function lamp(K, t, p, y) {
  const top = t.kind === 'wall' ? p.ceil : Math.min(p.ceil, y + FH - 0.55), hang = Math.min(3.3, top - y - 0.6);
  const ly = t.kind === 'wall' ? y + Math.min(3.2, hang) : y + Math.max(1.6, Math.min(2.3, hang - 1.2));
  (K.lamps ||= []).push({ p: [t.x, ly, t.z], c: t.kind === 'burnt' ? [1, 0.45, 0.2] : [1, 0.6, 0.3], r: Math.max(8, p.apI * 1.7 + 4), i: (t.kind === 'burnt' ? 4 : t.kind === 'wall' ? 16 : 11) * Math.max(1, p.apI / 5.5), flicker: 0.45, indoor: true });
  if (t.kind === 'burnt' || t.kind === 'wall' || top - y > 9) return;
  const yr = y + hang;
  K.drum('char:iron', t.x, yr - 0.4, t.z, 0.2, 0.4, 10, { r2: 0.42, lid: 'char:rubble', collide: false });
  K.drum('char:iron', t.x, yr - 0.46, t.z, 0.12, 0.06, 8, { collide: false });
  K.beam('char:iron', [t.x, yr, t.z], [t.x, top, t.z], 0.03);
  fire(K, t.x, yr, t.z, 0.3, 0.7);
}
// The step a tower's chest stands on against its wall, a pricket each side of it and a little warm light: the room's
// reward, seen first. (towerChests puts the chest on it.)
function chestDais(K, t, p, y) {
  const c = chestSide(t, p);
  if (!c) return;
  const yaw = -c.a - Math.PI / 2, F = frame(t.x + Math.cos(c.a) * p.apI, y, t.z + Math.sin(c.a) * p.apI, yaw);
  const [dx, dz] = at(F, 0, 0.5);
  K.box('dark:stone', dx, y, dz, 0.85, DAIS, 0.62, yaw, { collide: false });
  for (const u of [-1.15, 1.15]) { const [qx, qz] = at(F, u, 0.5); pricket(K, qx, y, qz, 1.25); }
  const [lx, lz] = at(F, 0, 1.2);
  (K.lamps ||= []).push({ p: [lx, y + 1.3, lz], c: [1, 0.7, 0.4], r: 4.5, i: 4, flicker: 0.4, indoor: true });
}

// ---------------------------------------------------------------- the furniture

// A floor's room: a thing against each free side of its wall in turn, and one in its middle.
function furnish(K, t, p, fi, y, room) {
  const sides = freeSides(t, p, fi), chest = chestSide(t, p), list = room.walls;
  let k = 0;
  for (const am of sides) {
    if (chest && chest.fi === fi && Math.abs(wrap(chest.a - am)) < 1e-6) continue;
    const yaw = -am - Math.PI / 2, wx = t.x + Math.cos(am) * p.apI, wz = t.z + Math.sin(am) * p.apI, w = p.apI * Math.sin(Math.PI / p.N) - 0.2;
    // (A long side takes two or three things along it, not one lost in its middle: the critics, the hospice's one cot.)
    const n = Math.max(1, Math.floor((2 * w + 0.4) / 2.6)), F0 = frame(wx, y, wz, yaw);
    for (let j = 0; j < n; j++) {
      const q = F0(-w + (2 * j + 1) * w / n, 0, 0), F = frame(q[0], y, q[2], yaw);
      ITEMS[list[k++ % list.length]]?.(K, F, Math.max(0.5, w / n), y, yaw, t);
    }
  }
  const room0 = t.kind === 'wall' ? 0 : p.rIn;
  if (room.mid && (t.kind === 'wall' || room0 > 1.4)) MIDS[room.mid]?.(K, t.x, y, t.z, Math.min(room0 - 0.3, 2.4), t);
}

// A frame on a floor at (x, y, z): local x along the wall, local z in from it, y up.
function frame(x, y, z, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); const F = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c]; F.n = [s, 0, c]; F.yaw = yaw; return F; }
const at = (F, lx, lz) => { const q = F(lx, 0, lz); return [q[0], q[2]]; };
function facing(K, layer, F, x0, x1, y0, y1, lz, uvs) { K.quad(layer, F(x0, y0, lz), F(x1, y0, lz), F(x1, y1, lz), F(x0, y1, lz), F.n, uvs); }
function candle(K, x, y, z) { K.drum('pale:stone', x, y, z, 0.035, 0.2, 5, { collide: false }); K.cone('flame', x, y + 0.2, z, 0.03, 0.1, 4); }
function legs(K, F, hx, hz, h, lz) { for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [qx, qz] = at(F, u * (hx - 0.06), lz + v * (hz - 0.06)); K.box('dark:wood', qx, F(0, 0, 0)[1], qz, 0.04, h, 0.04, F.yaw, { collide: false }); } }

// What stands against a wall: (K, F, w: half the side's width, y, yaw, t).
const ITEMS = {
  // A case of shelves, its front the PH2 pack's painted books, jars or bones.
  books: (K, F, w) => shelf(K, F, w, 'p2_book_spines'),
  jars: (K, F, w) => shelf(K, F, w, 'p2_jar_shelves'),
  bones: (K, F, w) => shelf(K, F, w, 'p2_bone_wall'),
  desk: (K, F, w, y) => {
    const hx = Math.min(w, 0.85), [cx, cz] = at(F, 0, 0.5);
    K.box('dark:wood', cx, y + 0.72, cz, hx, 0.06, 0.38, F.yaw, { collide: false }); legs(K, F, hx, 0.38, 0.72, 0.5);
    const [bx, bz] = at(F, -hx * 0.3, 0.5); K.box('cloth_oat', bx, y + 0.78, bz, 0.22, 0.03, 0.16, F.yaw + 0.2, { collide: false });
    const [qx, qz] = at(F, hx * 0.6, 0.35); candle(K, qx, y + 0.78, qz);
  },
  ledger: (K, F, w, y) => {
    ITEMS.desk(K, F, w, y);
    for (let i = 0; i < 3; i++) { const [bx, bz] = at(F, -0.1 + i * 0.05, 0.3); K.box(['cloth_red', 'dark:wood', 'cloth_oat'][i], bx, y + 0.78 + i * 0.07, bz, 0.18, 0.07, 0.13, F.yaw + i * 0.15, { collide: false }); }
  },
  bench: (K, F, w, y) => {
    const hx = Math.min(w, 1.0), [cx, cz] = at(F, 0, 0.45);
    K.box('dark:wood', cx, y + 0.86, cz, hx, 0.07, 0.36, F.yaw, { collide: false }); legs(K, F, hx, 0.36, 0.86, 0.45);
    for (let i = 0; i < 4; i++) { const [qx, qz] = at(F, -hx + 0.25 + i * (2 * hx - 0.5) / 3, 0.4 + (i & 1) * 0.12); K.drum(i & 1 ? 'pale:stone' : 'dark:stone', qx, y + 0.93, qz, 0.08, 0.26, 6, { r2: 0.04, collide: false }); }
    const [lx, lz] = at(F, hx - 0.15, 0.25); candle(K, lx, y + 0.93, lz);
  },
  // Three prickets of three heights, a candle on each: no arm, no dish across a pole. (The critics: the old stand's flat
  // dish on its pole was a T side on. The V/T rule.)
  candles: (K, F, w, y) => { for (const [u, h] of [[-0.32, 1.15], [0, 1.5], [0.32, 0.95]]) { const [cx, cz] = at(F, u, 0.42); pricket(K, cx, y, cz, h); } },
  // Velscour's blood red hung on the wall, from two pegs, its foot cut in a swallowtail.
  livery: (K, F, w) => {
    const hw = Math.min(w - 0.15, 0.62), top = 3.3, foot = 1.0, mid = 1.35;
    K.quad('cloth_red', F(-hw, mid, 0.05), F(hw, mid, 0.05), F(hw, top, 0.05), F(-hw, top, 0.05), F.n);
    // (Wound as the quad is, so they face the room.)
    K.tri('cloth_red', F(-hw, mid, 0.05), F(-hw, foot, 0.05), F(0, mid + 0.02, 0.05));
    K.tri('cloth_red', F(0, mid + 0.02, 0.05), F(hw, foot, 0.05), F(hw, mid, 0.05));
    for (const u of [-hw + 0.08, hw - 0.08]) { const q = F(u, top - 0.06, 0.08); K.drum('char:iron', q[0], q[1], q[2], 0.03, 0.08, 5, { collide: false }); }
  },
  // Spears stood in a tub, leaning out a little, points up: none across another.
  spears: (K, F, w, y) => {
    const [cx, cz] = at(F, 0, 0.5);
    K.drum('dark:wood', cx, y, cz, 0.34, 0.5, 8, { collide: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, ox = Math.cos(a) * 0.18, oz = Math.sin(a) * 0.18, tx = cx + ox * 1.6, tz = cz + oz * 1.6; K.beam('dark:wood', [cx + ox, y + 0.3, cz + oz], [tx, y + 2.5, tz], 0.04); K.cone('iron', tx, y + 2.5, tz, 0.05, 0.28, 4); }
  },
  barrels: (K, F, w, y) => { for (const u of [-0.45, 0.45]) { const [bx, bz] = at(F, u * Math.min(1, w), 0.5); K.barrel(bx, bz, 0.36, 0.95, y); } },
  crates: (K, F, w, y) => { const [bx, bz] = at(F, 0, 0.55); K.crate(bx, bz, 0.45, F.yaw, y); K.crate(bx, bz, 0.32, F.yaw + 0.4, y + 0.82); },
  bunk: (K, F, w, y) => cot(K, F, w, y, 'cloth_red'),
  cot: (K, F, w, y) => cot(K, F, w, y, 'cloth_oat'),
  brazier: (K, F, w, y) => { const [cx, cz] = at(F, 0, 0.9); brazier(K, cx, y, cz); },
  table: (K, F, w, y) => { const [cx, cz] = at(F, 0, 1.1); table(K, cx, y, cz, 0.6); },
  // A cage stood against the wall: bars upright round it, a ring at its foot, its head, and its lid.
  cage: (K, F, w, y) => { const r = Math.min(0.8, w * 0.8), [cx, cz] = at(F, 0, r + 0.15); cage(K, cx, y, cz, r); },
  chains: (K, F, w, y) => {
    for (const u of [-0.6, 0, 0.6]) { const top = F(u * Math.min(1, w), 2.5, 0.07), low = F(u * Math.min(1, w), 1.2 + Math.abs(u) * 0.4, 0.07); K.beam('iron', top, low, 0.035); K.drum('iron', low[0], low[1] - 0.12, low[2], 0.09, 0.12, 6, { open: true, collide: false }); }
  },
  rope: (K, F, w, y) => { for (const u of [-0.4, 0.4]) { const [cx, cz] = at(F, u, 0.55); K.drum('cloth_oat', cx, y, cz, 0.42, 0.22, 10, { collide: false }); K.drum('cloth_oat', cx, y + 0.22, cz, 0.36, 0.18, 10, { lid: 'dark:wood', collide: false }); } },
  strongbox: (K, F, w, y) => { for (const u of [-0.35, 0.35]) { const [cx, cz] = at(F, u, 0.4); K.box('iron', cx, y, cz, 0.28, 0.42, 0.24, F.yaw + u * 0.3, { collide: false }); K.box('dark:wood', cx, y + 0.42, cz, 0.3, 0.06, 0.26, F.yaw + u * 0.3, { collide: false }); } },
  tapestry: (K, F, w) => { const hw = Math.min(w - 0.1, 1.5), h = Math.min(2.6, hw * 1.5); facing(K, 'p2_tapestry_hunt', F, -hw, hw, 3.3 - h, 3.3, 0.06, [[0, 1], [1, 1], [1, 0], [0, 0]]); },
  rubble: (K, F, w, y) => { for (const u of [-0.5, 0.4]) { const [rx, rz] = at(F, u * w, 0.8); onFloor(K, rx, rz, y, () => K.rock('dark:rubble', rx, rz, 0.6 + hash2(Math.round(rx * 9), 3) * 0.6, 0.45 + hash2(Math.round(rz * 9), 4) * 0.4, { collide: false })); } },
  beam: (K, F, w, y) => K.beam('char:wood', F(-w * 0.9, 0.12, 0.5), F(w * 0.7, 1.6, 0.18), 0.26, 0.3),
};
// (Its painted front set back in a case: sides, a top and a plinth stand out of it, so it isn't a flat panel.)
function shelf(K, F, w, paint) {
  const hw = Math.min(w, 1.6), [cx, cz] = at(F, 0, 0.22), y = F(0, 0, 0)[1];
  K.box('dark:wood', cx, y, cz, hw, 2.5, 0.22, F.yaw, { collide: false });
  facing(K, paint, F, -hw + 0.07, hw - 0.07, 0.1, 2.4, 0.445);
  for (const u of [-1, 1]) { const [sx, sz] = at(F, u * (hw - 0.05), 0.28); K.box('dark:wood', sx, y, sz, 0.06, 2.58, 0.28, F.yaw, { collide: false }); }
  const [tx, tz] = at(F, 0, 0.29);
  K.box('dark:wood', tx, y + 2.46, tz, hw + 0.04, 0.12, 0.29, F.yaw, { collide: false });
  K.box('dark:wood', tx, y, tz, hw, 0.1, 0.29, F.yaw, { collide: false });
}
// A pricket: a foot, an upright, a drip cup no wider than a hand, its candle.
function pricket(K, x, y, z, h) {
  K.drum('char:iron', x, y, z, 0.14, 0.05, 6, { r2: 0.07, collide: false });
  K.drum('char:iron', x, y + 0.05, z, 0.022, h - 0.05, 5, { collide: false });
  K.drum('char:iron', x, y + h - 0.04, z, 0.035, 0.05, 6, { r2: 0.05, collide: false });
  candle(K, x, y + h + 0.01, z);
}
// A bed: on legs, its frame, its blanket, its pillow, a board at its head. (The critics: as a block on the floor it read
// as a cushion.)
function cot(K, F, w, y, cloth) {
  const hx = Math.min(w, 1.0), [cx, cz] = at(F, 0, 0.5);
  legs(K, F, hx, 0.45, 0.4, 0.5);
  K.box('dark:wood', cx, y + 0.4, cz, hx, 0.1, 0.45, F.yaw, { collide: false });
  K.box(cloth, cx, y + 0.5, cz, hx - 0.06, 0.12, 0.42, F.yaw, { collide: false });
  const [px, pz] = at(F, hx - 0.3, 0.5); K.box('cloth_oat', px, y + 0.62, pz, 0.2, 0.09, 0.3, F.yaw, { collide: false });
  const [hx2, hz2] = at(F, hx + 0.03, 0.5); K.box('dark:wood', hx2, y, hz2, 0.04, 1.0, 0.47, F.yaw, { collide: false });
}
// (Its flame a moving one, fire(): drawn from the land's build, towerFires.)
// (Its light well over its bowl: hung close by, it lit the bowl pale as tin.)
function brazier(K, x, y, z) {
  K.drum('dark:stone', x, y, z, 0.3, 0.75, 6, { r2: 0.2, collide: false });
  K.drum('char:iron', x, y + 0.75, z, 0.32, 0.3, 8, { r2: 0.5, open: true, collide: false });
  fire(K, x, y + 0.88, z, 0.3, 0.95);
  (K.lamps ||= []).push({ p: [x, y + 2.1, z], c: [1, 0.5, 0.22], r: 7, i: 6, flicker: 0.5, indoor: true });
}
// (On three legs splayed from under its rim: on one post in its middle a round table was a T side on.)
function table(K, x, y, z, r) {
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.9; K.beam('dark:wood', [x + Math.cos(a) * r * 0.55, y + 0.72, z + Math.sin(a) * r * 0.55], [x + Math.cos(a) * r * 0.8, y, z + Math.sin(a) * r * 0.8], 0.045); }
  K.drum('dark:wood', x, y + 0.72, z, r, 0.06, 10, { collide: false });
  candle(K, x + r * 0.3, y + 0.78, z);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.4; K.drum('dark:wood', x + Math.cos(a) * (r + 0.45), y, z + Math.sin(a) * (r + 0.45), 0.2, 0.46, 6, { collide: false }); }
}
function cage(K, x, y, z, r) {
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; K.beam('iron', [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(a) * r, y + 2.2, z + Math.sin(a) * r], 0.04); }
  for (const yy of [y, y + 2.2]) K.drum('iron', x, yy, z, r + 0.03, 0.07, 12, { open: yy === y, collide: false });
}
// What stands in a room's middle: (K, x, y, z, room: how far it can reach, t).
const MIDS = {
  rug: (K, x, y, z, r) => { const a = Math.min(r, 1.8), b = a * 0.62; K.quad('p2_dyed_cloth', [x - a, y + 0.02, z - b], [x + a, y + 0.02, z - b], [x + a, y + 0.02, z + b], [x - a, y + 0.02, z + b], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]); table(K, x, y, z, Math.min(0.6, r * 0.35)); },
  table: (K, x, y, z, r) => table(K, x, y, z, Math.min(0.9, r * 0.4)),
  brazier: (K, x, y, z) => brazier(K, x, y, z),
  cage: (K, x, y, z, r) => cage(K, x, y, z, Math.min(1.1, r * 0.6)),
  // The stillroom's cauldron over its fire, on three legs.
  cauldron: (K, x, y, z) => {
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; K.beam('iron', [x + Math.cos(a) * 0.5, y, z + Math.sin(a) * 0.5], [x + Math.cos(a) * 0.4, y + 0.42, z + Math.sin(a) * 0.4], 0.05); }
    // (Old rusted iron, lit by the fire under it, not the brew: in the flat 'iron', then under a green light, it read as
    // a pale celadon tub, the critics.)
    K.drum('char:iron', x, y + 0.36, z, 0.42, 0.55, 12, { r2: 0.55, lid: 'mire:water', collide: false });
    fire(K, x, y + 0.02, z, 0.26, 0.5);
    (K.lamps ||= []).push({ p: [x, y + 1.6, z], c: [1, 0.5, 0.22], r: 5, i: 3, flicker: 0.5, indoor: true });
  },
  // The scrying pool: a black water in a ring of stone, candles round it.
  pool: (K, x, y, z, r) => { const R = Math.min(1.2, r * 0.5); K.drum('dark:stone', x, y, z, R, 0.5, 16, { lid: 'void:water', collide: false }); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; candle(K, x + Math.cos(a) * (R + 0.3), y, z + Math.sin(a) * (R + 0.3)); } },
  slab: (K, x, y, z) => { K.box('pale:stone', x, y, z, 1.1, 0.8, 0.5, 0.3, { collide: false }); for (const u of [-0.9, 0.9]) candle(K, x + Math.cos(0.3) * u, y + 0.8, z - Math.sin(0.3) * u); },
  // The sluice's great wheel, lying, on its axle up through the ceiling.
  wheel: (K, x, y, z, r) => { const R = Math.min(2.2, r * 0.8); K.drum('iron', x, y, z, 0.22, 9, 8, { collide: false }); K.drum('dark:wood', x, y + 0.9, z, R, 0.35, 20, { collide: false }); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; K.box('dark:wood', x + Math.cos(a) * (R + 0.12), y + 0.9, z + Math.sin(a) * (R + 0.12), 0.12, 0.35, 0.08, -a, { collide: false }); } },
  basin: (K, x, y, z) => K.drum('pale:stone', x, y, z, 0.38, 0.85, 10, { r2: 0.45, lid: 'water', collide: false }),
  rubble: (K, x, y, z) => { onFloor(K, x, z, y, () => K.rock('dark:rubble', x, z, 1.2, 0.8, { collide: false })); K.beam('char:wood', [x - 1.4, y + 0.1, z + 0.3], [x + 1.1, y + 0.9, z - 0.5], 0.3); },
};
