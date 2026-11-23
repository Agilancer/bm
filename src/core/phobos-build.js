// City State Phobos, Castle Velscour and Velscour's Keep: the block-out. Every mass in its place and at its size, in plain
// boxes, drums and cones, so the whole can be walked round, looked at and argued with before any of it is detailed
// (docs/PHOBOS.md, docs/PHOBOS-LAYOUT.md; the ground is src/core/east.js; the numbers tools/phobos/layout.json by way of
// src/core/phobos-data.js). Built with src/core/sites.js's Kit, in the game's own stones for now: the Phobos texture sets
// (assets/game/phobos/tex) aren't wired in yet.
//
// Three parts, each a function: city(K) the wall, gates and districts; castle(K) the three wards' buildings; keep(K) the
// trunk, the five spires, the satellites and the bridges between. Heights are over the moat plain (PLAIN) unless a thing
// stands on the ground, when it's the ground's. No piece makes a cross or a T (the T is Tessariel's; this is all his).

import { terrainHeight } from './terrain.js';
import { hash2 } from './terrain-noise.js';
import { APPROACH_WALL, CITY, CITY_WALL, CRAG, HAUNTS, KEEP, PLAIN, SLOUGH, WARDS, cityIn } from './east.js';
import { PHOBOS } from './phobos-data.js';
import { HUBS, hubHouses, hubFar, hubNear, inHub } from './phobos-hubs.js';
import { MOUTH_SQUARE, PHOBOS_SEALS, SEAL_SQUARE, SEWER_MOUTHS, inSealSquare } from './phobos-seals.js';
import { cityTowers, towerFar, towerInner, towerNear, towerYards, wallTops, wallTowerAt } from './phobos-towers.js';
import { furnish, partition, roomPlan } from './phobos-rooms.js';
import { bridgeHouse, dressHouse, eavesOf, houseFarMore, jutOf, roofTop, roofs, streetLife, styleHouses } from './phobos-houses.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);
const segD = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
};

// ---------------------------------------------------------------- pieces

// A ridged roof over a box's top: its ridge along the box's length (local x). Its two gable ends in the wall's own stone
// (wall), set in by over (the eaves' overhang) to stand on the wall's face, up under the ridge.
function gable(K, layer, x, y, z, hx, hz, rh, yaw, wall = layer, over = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  K.quad(layer, P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, rh, 0), P(-hx, rh, 0));
  K.quad(layer, P(hx, 0, hz), P(-hx, 0, hz), P(-hx, rh, 0), P(hx, rh, 0));
  const ex = hx - over, ez = hz - over;
  K.tri(wall, P(ex, 0, -ez), P(ex, 0, ez), P(ex, rh, 0));
  K.tri(wall, P(-ex, 0, ez), P(-ex, 0, -ez), P(-ex, rh, 0));
}
// How a house's roof sits, the same from far and near: its ridge along the house or, one in three (nearly one in two on
// the named streets, where it puts a gable to the street), across it; and a pitch of its own, low to steep. { yaw, rh,
// sx, sz, turn }: sx and sz the half-spans along and across the ridge, the eaves out 0.4.
function roofOf(h) {
  const id = Math.round(h.x * 7 + h.z * 13), turn = hash2(id, 91) < (h.shop ? 0.45 : 0.33), pitch = 0.55 + 0.65 * hash2(id, 92);
  const sx = turn ? h.hz : h.hx, sz = turn ? h.hx : h.hz;
  // (A guildhall's steep, to stand over its row.)
  const hall = h.mark?.kind === 'guildhall';
  return { turn, yaw: h.yaw + (turn ? Math.PI / 2 : 0), rh: Math.min(sz * (hall ? Math.max(pitch, 1.25) : pitch), hall ? 9.5 : 8), sx: sx + 0.4, sz: sz + 0.4 };
}
// Where a house stands on its ground: the lowest and highest of its corners' ground, and its floor (the highest).
export function footing(h) {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  let lo = Infinity, hi = -Infinity;
  for (const [lx, lz] of [[-h.hx, -h.hz], [h.hx, -h.hz], [h.hx, h.hz], [-h.hx, h.hz]]) { const y = Y(h.x + lx * c + lz * s, h.z - lx * s + lz * c); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  // (And the ground inside: on a hump between the corners, a hand of hill came up through the boards of 133 houses, the
  // houses pass, 2026-11-20. The floor's over the highest of it.)
  for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0, 0.5]) { const lx = u * h.hx, lz = v * h.hz; hi = Math.max(hi, Y(h.x + lx * c + lz * s, h.z - lx * s + lz * c) - 0.04); }
  return { lo, hi, c, s };
}
export const DOOR = 0.8, WALL = 0.45;   // half a doorway's width; a house wall's thickness
// The steps down from a house's threshold to the street, where the street's more than a step under it. (The floor's at the
// house's highest corner's ground: on a hill 2,128 doors stood a metre to six over the street, and those houses weren't gone
// into, tools/paths/map.mjs.) Straight out from the threshold, none more than 0.42 m; where that would end in another house,
// across a narrow street or the next one down the hill, along the front from the threshold's end, whichever way is clear.
// [{ rect, x, z, top }], or null where none's wanted or none fits.
const FLIGHT_TREAD = 0.42, FLIGHT_RISE = 0.42;
let FLIGHTS = null;
export function doorFlight(h, F) {
  if (h.door === undefined) return null;
  if (!FLIGHTS) FLIGHTS = new Map();
  if (!FLIGHTS.has(h)) FLIGHTS.set(h, flightFor(h, F));
  return FLIGHTS.get(h);
}
function flightFor(h, F) {
  const fy = F.hi + 0.1, f = h.front, L = (lx, lz) => [h.x + lx * F.c + f * lz * F.s, h.z - lx * F.s + f * lz * F.c];
  if (fy - Y(...L(0, h.hz + 1.1)) < 0.85) return null;
  // (Its way down: where the k-th tread's middle is, how far from the threshold's edge; its half sizes across and along.)
  // (Along the front a tread's 1.2 m out from the wall, room for a body against it with an alley's far side close by.)
  const ways = [
    { at: (d, e = 0) => L(0, h.hz + 0.9 + d + e), hu: DOOR + 0.3, hw: FLIGHT_TREAD / 2 + 0.01, e: FLIGHT_TREAD / 2 },
    { at: (d, e = 0) => L(DOOR + 0.3 + d, h.hz + 0.6 + e), hu: FLIGHT_TREAD / 2 + 0.01, hw: 0.61, e: 0.6 },
    { at: (d, e = 0) => L(-DOOR - 0.3 - d, h.hz + 0.6 + e), hu: FLIGHT_TREAD / 2 + 0.01, hw: 0.61, e: 0.6 },
  ];
  const H = houseGrid(), inHouse = (x, z) => {
    for (const o of H.get(`${Math.floor(x / 30)}_${Math.floor(z / 30)}`) || []) {
      if (o === h) continue;
      const dx = x - o.x, dz = z - o.z, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
      if (Math.abs(dx * c - dz * s) < o.hx + 0.35 && Math.abs(dx * s + dz * c) < o.hz + 0.35) return true;
    }
    return false;
  };
  // (First a way that leaves 1.5 m of the street clear past it, so an alley isn't shut by its doors' steps; only if none
  // does, one that only just fits.)
  for (const pass of [1.5, 0.1]) for (const w of ways) {
    // (Down to the lowest of the ground under it: a dip at the threshold with the street higher past it is a step down too.)
    const y1 = Y(...w.at(0.2));
    let y0 = y1, n = 0;
    for (let it = 0; it < 3; it++) { n = Math.max(1, Math.ceil((fy - y0) / FLIGHT_RISE) - 1); y0 = Math.min(y1, Y(...w.at(n * FLIGHT_TREAD + 0.2))); }
    n = Math.max(1, Math.ceil((fy - y0) / FLIGHT_RISE) - 1);
    const rise = (fy - y0) / (n + 1), out = [];
    let ok = !inHouse(...w.at(n * FLIGHT_TREAD + 0.4)) && (pass < 1 || !inHouse(...w.at(n * FLIGHT_TREAD + 0.4 + pass)));
    for (let k = 1; k <= n && ok; k++) {
      const [x, z] = w.at((k - 0.5) * FLIGHT_TREAD), top = fy - k * rise;
      if (inHouse(x, z) || inHouse(...w.at((k - 0.5) * FLIGHT_TREAD, w.e + pass))) ok = false;
      out.push({ x, z, top, hu: w.hu, hw: w.hw, rect: [x, z, w.hu, w.hw, h.yaw, top] });
    }
    if (ok) return out;
  }
  return null;
}
let HGRID = null;
const houseGrid = () => {
  if (HGRID) return HGRID;
  HGRID = new Map();
  for (const o of phobosHouses()) {
    const R = Math.hypot(o.hx, o.hz) + 1;
    for (let i = Math.floor((o.x - R) / 30); i <= Math.floor((o.x + R) / 30); i++) for (let j = Math.floor((o.z - R) / 30); j <= Math.floor((o.z + R) / 30); j++) (HGRID.get(`${i}_${j}`) || HGRID.set(`${i}_${j}`, []).get(`${i}_${j}`)).push(o);
  }
  return HGRID;
};
// A house's door by its walls: carved panels in dressed stone and fine brick, iron-bound in a house of stone, planks else.
// (Iron-bound for a house of stone or a rich one, planks for the rest. Never the pack's carved door_rich: its four panels
// are a cross with the knocker at the crossing. The V/T rule.)
export const doorOf = (h) => (/dressed|rich_brick|basalt|granite|block|course/.test(h.wall) ? 'p2_door_iron' : 'p2_door_poor');
// A house's upstairs, if it has one: two storeys or more, and room inside for a stair up its left wall (local x -) from by
// the door to the back, with floor beside it and beyond it. (Its floors, with the ground floor's: houseWalls.) { ix, iz, fy, uy, uc, sw, steps: [[lx, lz, y]], hole: [z0, z1],
// rects } (rects: the floor and the treads, as K.deck takes them). RISE a step, TREAD its depth, SW the stair's width.
// (Room to walk up it, the owner, 2026-11-17: the stair a good stride wide, a landing of a metre and more at its head
// before the back wall, and its treads as deep as the house's depth lets them be, up to a comfortable 0.36. A house too
// shallow for that has no upstairs.)
// (The houses pass, 2026-11-20: seventeen risers of 0.194 to the storey on treads of up to 0.27, two rises and a going of
// 0.66, inside the 0.55 to 0.70 a stair's comfortable at, as a building rule has it. Eleven of 0.3 on 0.36 had been 0.96:
// a ladder's stride, every riser a block a third of a metre high. Every house that had an upstairs still has room for it.)
// (Its foot a pace and more in from the front wall, STEP_IN: 0.45 had left no floor to step on to it from, the wall before it
// and its newel and rail beside it. "HOW IS SOMEONE SUPPOSED TO GO UP THOSE STAIRS?!", the owner, 2026-11-20.)
const RISE = 3.3 / 17, SW = 1.25, STOREY = 3.3, LANDING = 1.1, STEP_IN = 1.05;
const treadOf = (iz) => Math.min(0.27, (2 * iz - STEP_IN - LANDING) / Math.round(STOREY / RISE));
export function upstairs(h, F) {
  const ix = h.hx - WALL, iz = h.hz - WALL, TREAD = treadOf(iz);
  if (!h.roof || h.h < 6 || ix < 2.4 || TREAD < 0.24) return null;
  const { hi, c, s } = F, f = h.front, fy = hi + 0.1, uy = fy + STOREY, uc = Math.min(hi + h.h - 0.3, uy + 2.9), n = Math.round(STOREY / RISE);
  const W = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c], yaw = h.yaw, sx = -ix + SW / 2, z0 = iz - STEP_IN, z1 = z0 - n * TREAD;
  const steps = [], rects = [];
  for (let k = 1; k <= n; k++) {
    const lz = f * (z0 - (k - 0.5) * TREAD), y = fy + k * RISE;
    steps.push([sx, lz, y]);
    // (Across the stair, local x, its width; along it, z, its depth. They were the other way about: each tread a strip a
    // hand wide down the middle of the flight, the treads over each other along it, a tightrope up: tools/paths/map.mjs.)
    rects.push([...W(sx, lz), SW / 2, TREAD / 2 + 0.02, yaw, y]);
  }
  // (The floor: all of it beside the stair; and past its head, and over its foot, on its own side.)
  rects.push([...W(SW / 2, 0), ix - SW / 2, iz, yaw, uy]);
  rects.push([...W(sx, f * (z1 - iz) / 2), SW / 2, (z1 + iz) / 2, yaw, uy]);
  rects.push([...W(sx, f * (z0 + iz) / 2), SW / 2, (iz - z0) / 2, yaw, uy]);
  // (The rects' half-sizes are along the house's local x and z, the way world.js reads a rect turned by yaw.)
  return { ix, iz, fy, uy, uc, steps, hole: [z1, z0], rects, tread: TREAD, rise: RISE };
}
// Every house's door opens and shuts (the owner, 2026-11-16: "make sure all the doors on all the houses open and close"):
// shut till you open it, E (src/items/phobos-doors.js). A door as the city's doors take it: { id, x, z, yaw (the house's,
// local +z out through it times f), f, iz (the inner face of its wall, the leaf hung there), hz (the outer), fy (its sill),
// kind (the leaf's painting) }. The towers' are the same (src/core/phobos-towers.js towerDoor).
export function houseDoor(h) {
  return { id: h.door, x: h.x, z: h.z, yaw: h.yaw, f: h.front, iz: h.hz - WALL, hz: h.hz, fy: footing(h).hi + 0.1, kind: doorOf(h) };
}
// A door's leaf hung on its right-hand post, swung in by th (0: shut); planks, two iron straps, the PH2 pack's painting on
// both its faces, its edges plain dark wood. From near, in a group of its own, which the near view folds away while the
// door's open (it's swung then as a thing of its own: src/gfx/phobos-near.js hideDoor).
export const LEAF = { L: 2 * DOOR - 0.08, H: 2.3, T: 0.035 };
// (Where a leaf's painting starts across: the plank door's is cut in past its hinge plates, which stood up from the hinge
// edge with the straps out of them, a T on its side on every poor door. The V/T rule, the critics, 2026-11-16.)
export const leafU0 = (kind) => (kind === 'p2_door_poor' ? 0.085 : 0);
export function doorLeaf(K, d, th = 0) {
  const c = Math.cos(d.yaw), s = Math.sin(d.yaw), P = (lx, lz) => [d.x + lx * c + lz * s, d.z - lx * s + lz * c];
  const hx0 = DOOR - 0.04, hz0 = d.f * (d.iz - 0.02), L = LEAF.L, dx = -Math.cos(th), dz = -d.f * Math.sin(th);
  const [wx, wz] = P(hx0 + dx * L / 2, hz0 + dz * L / 2), [ex, ez] = P(hx0 + dx, hz0 + dz), [ox, oz] = P(hx0, hz0), yawL = Math.atan2(-(ez - oz), ex - ox);
  K.group('door:' + d.id, true, () => {
    K.box('dark:wood', wx, d.fy, wz, L / 2, LEAF.H, LEAF.T, yawL, { collide: false });
    const cy = Math.cos(yawL), sy = Math.sin(yawL), u0 = leafU0(d.kind);
    for (const e of [1, -1]) { const Q = (u, yy) => [wx + u * cy + 0.04 * e * sy, yy, wz - u * sy + 0.04 * e * cy]; K.quad(d.kind, Q(-L / 2 * e, d.fy + LEAF.H), Q(L / 2 * e, d.fy + LEAF.H), Q(L / 2 * e, d.fy), Q(-L / 2 * e, d.fy), [e * sy, 0, e * cy], [[u0, 0], [1, 0], [1, 1], [u0, 1]]); }
  });
}
// What stops a body at a house: its four walls, the front one in two with the doorway between, and the door in it while
// it's shut. (Every house in Phobos is gone into: the owner's word. Its inside is drawn only near you, houseNear.) front:
// +1 or -1, which of its long sides the door is in (local z).
function houseWalls(K, h, F) {
  const { lo, hi, c, s } = F, t = WALL / 2, P = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
  // (Pushed as they are, their height from the house's own lowest ground: fifty thousand walls don't each ask the land.)
  const put = (px, pz, hx, hz) => K.colliders.push({ x: px, z: pz, hx, hz, yaw: h.yaw, h: hi + h.h - lo });
  put(...P(0, -h.front * (h.hz - t)), h.hx, t);
  for (const sd of [-1, 1]) put(...P(sd * (h.hx - t), 0), t, h.hz);
  const half = (h.hx - DOOR) / 2;
  for (const sd of [-1, 1]) put(...P(sd * (DOOR + half), h.front * (h.hz - t)), half, t);
  // (The door: a box in its doorway, out of the way while it's open, src/sim/world.js setPhobosDoor. t, its top: not in the
  // walking grid, which doesn't change, as Bellmourn's doors aren't.)
  if (h.door !== undefined) { const [dx, dz] = P(0, h.front * (h.hz - WALL - 0.05)); K.colliders.push({ x: dx, z: dz, hx: DOOR, hz: 0.06, yaw: h.yaw, h: hi + 2.6 - lo, t: hi + 2.6, phDoor: h.door }); }
  // What's stood on inside: the ground floor (at the house's highest corner, as drawn, wherever the hill under it is
  // lower) and its threshold out to the step; and upstairs, the stair's treads and the floor over. One stack (src/sim/world.js
  // platformAt): the highest of them within a step of the feet, else the ground floor, so downstairs is walked under the
  // upstairs floor and anyone without feet to go by (a monster come in after you) is on the ground floor.
  const fy = F.hi + 0.1, W = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c], ix = h.hx - WALL, iz = h.hz - WALL;
  const rects = [[...W(0, 0), ix, iz, h.yaw, fy]];
  rects.push([...W(0, h.front * (iz + h.hz + 0.9) / 2), DOOR + 0.3, (h.hz + 0.9 - iz) / 2, h.yaw, fy]);
  const up = upstairs(h, F);
  if (up) rects.push(...up.rects);
  K.deck(rects); K.floors.at(-1).stack = true;
  { const fl = doorFlight(h, F); if (fl) K.deck(fl.map((q) => q.rect)); }
  // (Upstairs, the boards between its two chambers, src/core/phobos-rooms.js: they stop only feet up there.)
  // (And downstairs the cross wall either side of its doorway; they stop only feet down there.)
  const pt = partition(h, F, up), seg = (x0, x1, w, y0, y1) => { if (x1 - x0 < 0.05) return; const [px, pz] = W((x0 + x1) / 2, h.front * w); K.colliders.push({ x: px, z: pz, hx: (x1 - x0) / 2, hz: 0.05, yaw: h.yaw, h: y1 - lo, t: y1, b: y0 - 0.4 }); };
  if (pt.up) seg(pt.up.x0, pt.up.x1, pt.up.w, up.uy, up.uc);
  if (pt.down) { seg(pt.down.x0, pt.down.g0, pt.down.w, fy, fy + 2.6); seg(pt.down.g1, pt.down.x1, pt.down.w, fy, fy + 2.6); }
}
// A house from far off: a box on the ground (its foot sunk to the lowest of its corners) with a ridged roof, or none if
// it's a ruin.
function houseFar(K, h) {
  const F = footing(h), { lo, hi } = F;
  // (On a phone a flat lid in the roof's own tiles: ten thousand ridged roofs are more corners than it should hold.)
  // (Its roof by its style, src/core/phobos-houses.js: a gable, a hip, a pent, a mansard, a gambrel, a stepped gable, a flat
  // lid behind a parapet, or the rafters of one burnt out.)
  // (ev: its eaves; a tower-house's main block stops short of its height, a narrower stage and a cap over it: houseFarMore.
  // On a phone, the whole of it one box.)
  const kind = h.st?.roof || 'gable', ev = K.lean ? h.h : eavesOf(h);
  K.box(h.wall, h.x, lo - 0.5, h.z, h.hx, hi - lo + ev + 0.5, h.hz, h.yaw, { top: h.roof ? (K.lean || kind === 'flat' ? h.roof : kind === 'ribs' ? h.wall : false) : h.wall, collide: false });
  if (h.roof && !K.lean) { roofs(K, kind, h.roof, h.wall, h.x, hi + ev, h.z, roofOf(h), -h.front); houseFarMore(K, h, F, hi + ev); }
  // (One in three has a lit window in its front, big enough to be seen from the castle: the city's alight from far off.)
  const id = Math.round(h.x * 7 + h.z * 13);
  // (Not a one-off house's on a phone: its land holds not a corner more than it did.)
  if (h.roof && hash2(id, 61) < 0.55 && !(K.lean && h.mark)) {
    const { c, s } = F, f = h.front, wy = hi + 1.3 + Math.floor(hash2(id, 62) * Math.max(1, Math.round(h.h / 3.3))) * 3.3, wx = (hash2(id, 63) - 0.5) * h.hx, wz = f * (h.hz + 0.06);
    const P = (lx, ly, lz) => [h.x + lx * c + lz * s, ly, h.z - lx * s + lz * c];
    if (wy + 1.6 < hi + h.h) K.quad('eve:flame', P(wx + f * 0.65, wy, wz), P(wx - f * 0.65, wy, wz), P(wx - f * 0.65, wy + 1.4, wz), P(wx + f * 0.65, wy + 1.4, wz), [f * s, 0, f * c]);
  }
  houseWalls(K, h, F);
}
// Things that stand on the land (the kit's furniture: a table, a barrel) stood on a floor instead: whatever fn builds at
// (x, z) is lifted from the ground there to y. (A house's floor is at its highest corner's ground; the ground under it
// may be lower.)
export function onFloor(K, x, z, y, fn) {
  const before = new Map([...K.parts].map(([l, q]) => [l, q.pos.length]));
  fn();
  const dy = y - Y(x, z);
  if (Math.abs(dy) < 0.01) return;
  for (const [l, q] of K.parts) { const a = q.pos.a || q.pos; for (let i = (before.get(l) || 0) + 1; i < q.pos.length; i += 3) a[i] += dy; }
}
// What a near cell's things put in a body's way (a crate in an alley, a cart at the kerb, a stall in the market) kept
// aside in K.props, when there is one, and taken out of K.colliders: the near cells are drawn only round the eye, so
// nothing they build stops a body (that's the far build's), but these are baked for the whole city by
// tools/paths/props.mjs into src/core/phobos-props-data.js, which buildSites() stands in the way. (The owner,
// 2026-11-21: auto-play walked through what fills the alleys.)
export function keepProps(K, n0) {
  if (K.props) for (let i = n0; i < K.colliders.length; i++) K.props.push(K.colliders[i]);
  K.colliders.length = n0;
}
// The same house from near: a shell you walk into. Outside: its walls with the doorway cut, windows (most of them lit),
// a lamp by the door of one in three, its roof with a chimney and now and then a dormer. Inside: plastered walls, a board
// floor, a ceiling, and a little of somebody's life. A ruin has no roof or ceiling, and rubble for furniture.
// His banner: the pack's skull field dyed oxblood, the horned skull on it (tools/phobos/textures/wire_ph2.py
// banner_skull). Not banner_blood or war_banner: both have a crown of thorns on the skull. The V/T rule.)
export const BANNER = 'p2_banner_skull';
// His banner at the head of one of his long red hangings (the gates', the Keep's): the painting over its top, the plain
// cloth on down to its point. (K.hanging: src/core/places.js.)
function hangBanner(K, x, y, z, face, w, len, rep) {
  const [nx, nz] = face, rx = nz, rz = -nx, h = w * 1.5, P = (u, v) => [x + rx * u + nx * 0.16, y + v, z + rz * u + nz * 0.16];
  K.quad(BANNER, P(-w / 2, 0), P(w / 2, 0), P(w / 2, -h), P(-w / 2, -h), [nx, 0, nz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  K.hanging('cloth_red', x, y - h * 0.8, z, face, w, len - h * 0.8, rep);
}
// A shop's sign: a board hung out from the wall on an iron bracket by the door, edge on to the street so it's read from
// down it, painted both sides with the shop's name and a picture of its trade, one of twenty (p2_signs, painted by
// tools/phobos/textures/signs.py, a cell of four across and five down). (The owner, 2026-11-19: "put words on the signs".)
const SIGNS = 20;
function shopSign(K, h, P, fy, fz, i, at = null) {
  // (Its chains from the bracket's two ends, by the wall and at its tip, never from along it: a cord hung from the middle of
  // a bar is a T. The V/T rule.)
  // (Half again as big as it was: its name read from across the street, the critics.)
  // (at: where along the front it hangs, past the end of an awning; else by the door.)
  const f = h.front, lx = at ?? -DOOR - 0.9, hw = 0.56, zc = fz + f * (0.08 + hw), y0 = fy + 2.35, y1 = fy + 3.23, t = 0.05, tip = fz + f * (0.1 + 2 * hw);
  K.beam('iron', P(lx, fy + 3.3, fz), P(lx, fy + 3.3, tip), 0.05);
  for (const zz of [fz + f * 0.1, tip]) K.beam('iron', P(lx, fy + 3.3, zz), P(lx, y1, zz), 0.012);
  const [bx, , bz] = P(lx, 0, zc); K.box('dark:wood', bx, y0 - 0.03, bz, t + 0.01, y1 - y0 + 0.06, hw + 0.03, h.yaw, { collide: false });
  const u0 = (i % 4) / 4, u1 = u0 + 0.25, v0 = Math.floor(i / 4) / 5, v1 = v0 + 0.2, X = [Math.cos(h.yaw), 0, -Math.sin(h.yaw)];
  for (const e of [1, -1]) {
    // (Read from the side it faces: the viewer's right is the house's -z on the +x face, +z on the other.)
    const x = lx + e * (t + 0.012), za = zc + e * hw, zb = zc - e * hw;
    K.quad('p2_signs', P(x, y1, za), P(x, y1, zb), P(x, y0, zb), P(x, y0, za), X.map((v) => e * v), [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
  }
}
// The back of a house, on its yard or the alley behind: a back door with a step (a lamp over some), and along the wall what
// a household leaves out: a rain butt under the eaves with its puddle, firewood stacked to dry, crates and sacks, a
// heap of refuse, a bucket, now and then a handcart. (The owner, 2026-11-19: "there should be more than just walls in
// alley ways. This is a city full of people.") What stands up is in the way (keepProps); no ladders (their rungs are bars across).
function backyard(K, h, P, fy, r) {
  const f = h.front, bz = -f * (h.hz + 0.5), N = [-f * Math.sin(h.yaw), -f * Math.cos(h.yaw)], n0 = K.colliders.length;
  const at = (lx, lz = bz) => { const q = P(lx, 0, lz); return [q[0], q[2]]; };
  let door = null;
  if (r(60) < 0.55 && h.hx > 2.2) {
    const xd = (r(61) - 0.5) * (h.hx - 1.4), zo = -f * (h.hz + 0.03);
    door = xd;
    K.quad('p2_door_poor', P(xd - f * 0.5, fy, zo), P(xd + f * 0.5, fy, zo), P(xd + f * 0.5, fy + 2.05, zo), P(xd - f * 0.5, fy + 2.05, zo), [N[0], 0, N[1]], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    K.quad('dark:wood', P(xd - f * 0.6, fy + 2.05, zo), P(xd + f * 0.6, fy + 2.05, zo), P(xd + f * 0.6, fy + 2.17, zo), P(xd - f * 0.6, fy + 2.17, zo), [N[0], 0, N[1]]);
    const [sx, sz] = at(xd, -f * (h.hz + 0.35)); K.box('stone', sx, Math.min(Y(sx, sz), fy) - 0.3, sz, 0.6, fy - Math.min(Y(sx, sz), fy) + 0.3, 0.35, h.yaw, { collide: false });
    if (r(62) < 0.4) { const q = P(xd + 0.85, fy + 2.3, -f * h.hz); K.wallLamp(q[0], q[1], q[2], N); if (r(63) < 0.5) (K.lamps ||= []).push({ p: [q[0] + N[0] * 0.5, q[1] - 0.4, q[2] + N[1] * 0.5], c: [1, 0.62, 0.3], r: 12, i: 8, flicker: 0.4 }); }
  }
  for (let x = -h.hx + 0.7, k = 0; x < h.hx - 0.6; x += 1.5 + r(70 + k) * 0.9, k++) {
    if (door !== null && Math.abs(x - door) < 1.1) continue;
    const v = r(80 + k), [px, pz] = at(x), y = Y(px, pz);
    if (v < 0.16) { K.barrel(px, pz, 0.42, 1.0); K.disc('dark:water', px + N[0] * 0.7, y + 0.03, pz + N[1] * 0.7, 0.5 + r(90 + k) * 0.5, 9); }
    else if (v < 0.32) { const [wx, wz] = at(x, -f * (h.hz + 0.35)); K.woodpile(wx, wz, h.yaw, 0.65, 0.7 + r(91 + k) * 0.5, 0.3); }
    else if (v < 0.46) { K.crate(px, pz, 0.4, h.yaw + r(92 + k)); if (r(93 + k) < 0.6) K.crate(px + 0.1, pz, 0.32, h.yaw + 0.4, y + 0.73); if (r(94 + k) < 0.5) { const [qx, qz] = at(x + 0.75); K.sack(qx, qz); } }
    else if (v < 0.58) { K.rock('soot:rubble', px, pz, 0.6 + r(95 + k) * 0.4, 0.35, { collide: false }); K.disc('char:rubble', px, y + 0.04, pz, 1.1, 8); K.crate(px + 0.6, pz + 0.3, 0.26, r(96 + k) * 3, y - 0.12); }
    else if (v < 0.68) { K.drum('soot:wood', px, y, pz, 0.19, 0.32, 8, { r2: 0.22, open: true, collide: false }); if (r(97 + k) < 0.5) K.disc('dark:water', px + N[0] * 0.5, y + 0.03, pz + N[1] * 0.5, 0.45, 8); }
    else if (v < 0.73 && h.hx > 3) { const [cx, cz] = at(x, -f * (h.hz + 1.4)); K.cart(cx, cz, h.yaw + Math.PI / 2 + (r(98 + k) - 0.5) * 0.6); x += 1.2; }
    else if (v < 0.86) { K.sack(px, pz); if (r(99 + k) < 0.6) { const [qx, qz] = at(x + 0.55); K.sack(qx, qz, 0.3); } }
  }
  keepProps(K, n0);
}
function houseNear(K, h) {
  const F = footing(h), { lo, hi, c, s } = F, f = h.front, top = hi + eavesOf(h), fy = hi + 0.1, ceil = Math.min(top - 0.3, fy + 3.1);
  const P = (lx, ly, lz) => [h.x + lx * c + lz * s, ly, h.z - lx * s + lz * c];
  const id = Math.round(h.x * 7 + h.z * 13), r = (k) => hash2(id, k), ruin = !h.roof;
  // The windows first, so the walls can be built round them. A pair to a storey front and back where there's room (the
  // back's fewer, onto the yard); none in the sides, which are party walls, as a town's are. (On the named streets, the
  // street front's half again as wide and twice as tall, and a third in the middle of each storey over the door, unless
  // his red hangs there.) Where there's a floor behind to stand on, the ground's and the one upstairs, a window is open
  // through the wall: unglazed, as a poor town's were, one mullion up the middle, its shutters hung back outside, the room
  // and its fire seen through it. (The owner, 2026-11-19: "aren't windows typically see through?") Over those, where no
  // room's been built behind, shut: the shutters closed, or a pane, a lamp behind some at night.
  const fz = f * h.hz, ix = h.hx - WALL, iz = h.hz - WALL, dh = fy + 2.35;
  const up = upstairs(h, F), gz = f * iz, roofY = ruin ? top : up ? up.uc : ceil;
  const storeys = Math.max(1, Math.round(h.h / 3.3)), big = !!h.shop, flag = h.spine && !ruin && r(31) < 0.3, wins = [];
  for (let st = 0; st < storeys; st++) for (const side of [1, -1]) for (const sd of [-1, 0, 1]) {
    if (sd === 0 && (!big || side < 0 || st === 0 || flag || h.hx < 3.2)) continue;
    const wx = sd * Math.min(h.hx - (big ? 1.05 : 1.1), DOOR + 1.6), wy = fy + (big ? 0.9 : 1.2) + st * 3.3;
    if (wy + (big ? 1.6 : 1) > top || h.hx < 2.4) continue;
    if (side < 0 && hash2(id + st, 77) > 0.3) continue;
    const lit = !ruin && h.mark?.kind !== 'shell' && r(9) < 0.8 && hash2(id + st * 3 + sd, side + 9) < (st === 0 ? 0.42 : 0.3);
    const ww = big && side > 0 ? 0.4 + 0.06 * r(14) : 0.26 + 0.08 * r(14), wh = big && side > 0 ? 1.15 + 0.25 * r(15) : 0.6 + 0.2 * r(15);
    const open = !ruin && st <= (up ? 1 : 0) && wy + wh < roofY - 0.15 && Math.abs(wx) + ww < ix - 0.1;
    wins.push({ st, side, sd, q: side * f, wx, wy, ww, wh, lit, open });
  }
  // A wall across the house at local z (zw), facing out (out 1) or in (-1), from y0 to y1, with holes cut in it [x0, x1,
  // ya, yb]: cut into upright strips at every hole's edges, each strip whole but where a hole is.
  const wallZ = (layer, zw, out, y0, y1, holes) => {
    const sz = Math.sign(zw) * out, xa = out > 0 ? -h.hx : -ix, xb = -xa;
    const xs = [xa, xb, ...holes.flatMap((o) => [o[0], o[1]])].map((x) => Math.max(xa, Math.min(xb, x))).sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k++) {
      const u = xs[k], v = xs[k + 1];
      if (v - u < 1e-3) continue;
      const m = (u + v) / 2, cut = holes.filter((o) => o[0] < m && o[1] > m).sort((a, b) => a[2] - b[2]);
      let y = y0;
      for (const o of [...cut, [0, 0, y1, y1]]) {
        const ya = Math.max(y, Math.min(o[2], y1));
        if (ya - y > 1e-3) { if (sz > 0) K.quad(layer, P(v, y, zw), P(u, y, zw), P(u, ya, zw), P(v, ya, zw)); else K.quad(layer, P(u, y, zw), P(v, y, zw), P(v, ya, zw), P(u, ya, zw)); }
        y = Math.max(y, o[3]);
      }
    }
  };
  // Outside: the sides whole; the front and the back round their doorway and their open windows.
  // (The doorway's hole stops at its sill outside: cut on down to the ground, a house on a slope showed the street the
  // underside of its floor, pale voids under every door. The critics.)
  const holes = (sgn, inner) => [...(sgn === f ? [[-DOOR, DOOR, inner ? fy - 1 : fy - 0.22, dh]] : []), ...wins.filter((w) => w.open && w.q === sgn).map((w) => [w.wx - w.ww, w.wx + w.ww, w.wy, w.wy + w.wh])];
  wallZ(h.wall, h.hz, 1, lo - 0.5, top, holes(1, false)); wallZ(h.wall, -h.hz, 1, lo - 0.5, top, holes(-1, false));
  const out = (ax, az, bx, bz, y0, y1) => K.quad(h.wall, P(ax, y0, az), P(bx, y0, bz), P(bx, y1, bz), P(ax, y1, az));
  out(h.hx, -h.hz, h.hx, h.hz, lo - 0.5, top); out(-h.hx, h.hz, -h.hx, -h.hz, lo - 0.5, top);
  // Inside: the same four the other way round, a hand's breadth in; the doorway's cheeks and head; floor and ceiling.
  // (A house burnt out inside (its mark a shell, phobos-houses.js): its plaster, its boards and its ceiling charred, no fire, no light in its windows.)
  const burnt = h.mark?.kind === 'shell';
  const IN = burnt ? 'char:p2_sooty_plaster' : /poor|daub|soot|burnt|char/.test(h.wall) ? 'p2_sooty_plaster' : 'pale:ph_grey_plaster', inn = (ax, az, bx, bz, y0, y1) => K.quad(IN, P(ax, y0, az), P(bx, y0, bz), P(bx, y1, bz), P(ax, y1, az));
  wallZ(IN, iz, -1, fy, roofY, holes(1, true)); wallZ(IN, -iz, -1, fy, roofY, holes(-1, true));
  inn(ix, iz, ix, -iz, fy, roofY); inn(-ix, -iz, -ix, iz, fy, roofY);
  // (Downstairs: the lime's lower part dirtied by feet, brooms and the damp, and a dark skirting board along its foot; the
  // pale plaster had read flat, a texture missing, the critics.)
  if (!ruin && !K.leanNear) {
    const band = (layer, d, y1) => { for (const sg of [1, -1]) wallZ(layer, sg * (iz - d), -1, fy, y1, holes(sg, true)); K.quad(layer, P(ix - d, fy, iz), P(ix - d, fy, -iz), P(ix - d, y1, -iz), P(ix - d, y1, iz)); K.quad(layer, P(-ix + d, fy, -iz), P(-ix + d, fy, iz), P(-ix + d, y1, iz), P(-ix + d, y1, -iz)); };
    if (!burnt) band(IN === 'pale:ph_grey_plaster' ? 'umber:ph_grey_plaster' : 'soot:p2_sooty_plaster', 0.008, fy + 0.85);
    band('dark:wood', 0.018, fy + 0.13);
  }
  // The open windows' reveals, through the wall's thickness: their cheeks and head in the wall's stone, a stone sill.
  for (const w of wins) if (w.open) {
    const zo = w.q * h.hz, zi = w.q * iz, X = [c, 0, -s];
    for (const e of [-1, 1]) { const x = w.wx + e * w.ww; K.quad(h.wall, P(x, w.wy, zo), P(x, w.wy, zi), P(x, w.wy + w.wh, zi), P(x, w.wy + w.wh, zo), X.map((v) => -e * v)); }
    K.quad('stone', P(w.wx - w.ww, w.wy, zo), P(w.wx + w.ww, w.wy, zo), P(w.wx + w.ww, w.wy, zi), P(w.wx - w.ww, w.wy, zi), [0, 1, 0]);
    K.quad(h.wall, P(w.wx - w.ww, w.wy + w.wh, zo), P(w.wx + w.ww, w.wy + w.wh, zo), P(w.wx + w.ww, w.wy + w.wh, zi), P(w.wx - w.ww, w.wy + w.wh, zi), [0, -1, 0]);
  }
  for (const sd of [-1, 1]) K.quad('wood', P(sd * DOOR, fy - 0.2, fz), P(sd * DOOR, fy - 0.2, gz), P(sd * DOOR, dh, gz), P(sd * DOOR, dh, fz));
  K.quad('wood', P(-DOOR, dh, fz), P(DOOR, dh, fz), P(DOOR, dh, gz), P(-DOOR, dh, gz), [0, -1, 0]);
  K.quad(burnt ? 'char:p2_worn_floorboards' : 'p2_worn_floorboards', P(-ix, fy, -iz), P(-ix, fy, iz), P(ix, fy, iz), P(ix, fy, -iz), [0, 1, 0]);
  // (A step at the door where the street's lower than the floor; and the flight down from it, doorFlight.)
  K.quad('stone', P(-DOOR - 0.3, fy, fz), P(-DOOR - 0.3, fy, fz + f * 0.9), P(DOOR + 0.3, fy, fz + f * 0.9), P(DOOR + 0.3, fy, fz), [0, 1, 0]);
  { const fl = doorFlight(h, F); if (fl) { const [tx, tz] = [h.x + f * (h.hz + 0.45) * s, h.z + f * (h.hz + 0.45) * c], tb = Math.min(Y(tx, tz), fl.at(-1).top) - 0.3; K.box('stone', tx, tb, tz, DOOR + 0.3, fy - tb, 0.46, h.yaw, { collide: false });
    for (const q of fl) { const b = Math.min(Y(q.x, q.z), q.top) - 0.3; K.box('stone', q.x, b, q.z, q.hu, q.top - b, q.hw, h.yaw, { collide: false }); } } }
  if (!ruin && !up && !burnt) K.quad('wood', P(-ix, ceil, -iz), P(ix, ceil, -iz), P(ix, ceil, iz), P(-ix, ceil, iz), [0, -1, 0]);
  else if (!ruin && !up) {
    // (Burnt: the ceiling charred and come through over the rubble (phobos-rooms.js), the hole ragged with its joists' stubs.)
    const hx0 = -0.45, hx1 = Math.min(1.05, ix - 0.3), hw0 = -0.25, hw1 = Math.min(1.15, iz - 0.3), cq = (x0, x1, w0, w1) => { if (x1 - x0 > 0.01 && w1 - w0 > 0.01) { const z0 = Math.min(f * w0, f * w1), z1 = Math.max(f * w0, f * w1); K.quad('char:wood', P(x0, ceil, z0), P(x1, ceil, z0), P(x1, ceil, z1), P(x0, ceil, z1), [0, -1, 0]); } };
    cq(-ix, ix, -iz, hw0); cq(-ix, ix, hw1, iz); cq(-ix, hx0, hw0, hw1); cq(hx1, ix, hw0, hw1);
    // (The day, or the moon, down through it: cold and dim, the only light in the place.)
    (K.lamps ||= []).push({ p: P((hx0 + hx1) / 2, ceil - 0.4, f * (hw0 + hw1) / 2), c: [0.6, 0.66, 0.8], r: Math.max(9, ix + iz), i: 7, flicker: 0, indoor: true });
    for (let k = 0; k < 3; k++) { const x = hx0 + (hx1 - hx0) * (k + 0.5) / 3, [ax, , az] = P(x, ceil, f * (hw0 - 0.3)), [bx2, , bz2] = P(x + 0.1, ceil - 0.25 - k * 0.12, f * (hw0 + 0.35 + k * 0.15)); K.beam('char:wood', [ax, ceil - 0.08, az], [bx2, ceil - 0.25 - k * 0.12, bz2], 0.14, 0.18); }
  }
  if (up) upstairsNear(K, h, up, P, r);
  { const pd = !ruin && partition(h, F, up).down; if (pd) crossWall(K, h, P, pd.w, pd.x0, pd.x1, [pd.g0, pd.g1], fy, up ? up.uy - 0.2 : ceil); }
  // The door, shut (opened, it's swung as a thing of its own: src/items/phobos-doors.js).
  if (h.door !== undefined) doorLeaf(K, houseDoor(h));
  // The roof: ridged, a chimney on most, a dormer on some of the bigger.
  if (!ruin) {
    const R = roofOf(h), kind = h.st?.roof || 'gable', rh = roofTop(kind, R);
    roofs(K, kind, h.roof, h.wall, h.x, top, h.z, R, -f, true);
    // (A chimney stack on most, a dark pot or two on it.)
    // (Its stack straight over the hearth, on the side wall across from the stair, up through the roof and a metre and more
    // clear of its ridge, as a stack must draw; a dark pot or two on it, smoke out of most.)
    if (ix > 1.4) { const [cx, , cz] = P(h.hx - 0.45, 0, -f * iz * 0.28), ct = top + rh + 1.3; K.box('soot:stone', cx, top - 0.4, cz, 0.45, ct - top + 0.4, 1.05, h.yaw, { collide: false }); K.box('dark:stone', cx, ct, cz, 0.52, 0.18, 1.12, h.yaw, { collide: false }); { const [p1, , q1] = P(h.hx - 0.45, 0, -f * iz * 0.28 - 0.35), [p2, , q2] = P(h.hx - 0.45, 0, -f * iz * 0.28 + 0.35); K.drum('dark:stone', p1, ct + 0.18, q1, 0.15, 0.45, 6, { collide: false }); if (r(4) < 0.5) K.drum('dark:stone', p2, ct + 0.18, q2, 0.13, 0.32, 6, { collide: false }); } if (r(8) < 0.75) (K.smokes ||= []).push([cx, ct + 0.7, cz]); }
    if (kind === 'gable' && !h.st?.dormer && !R.turn && h.hx > 4.2 && r(5) < 0.3) { const [dx, , dz] = P((r(6) - 0.5) * h.hx, 0, f * h.hz * 0.55); K.box(h.wall, dx, top + rh * 0.1, dz, 0.9, 1.5, 0.9, h.yaw, { collide: false, top: false }); gable(K, h.roof, dx, top + rh * 0.1 + 1.5, dz, 1.1, 1.1, 0.8, h.yaw + Math.PI / 2, h.wall, 0.2); }
  } else for (let k = 0; k < 3; k++) { const [qx, , qz] = P((r(20 + k) - 0.5) * ix * 1.5, 0, (r(30 + k) - 0.5) * iz * 1.5); K.rock('dark:rubble', qx, qz, 0.5 + r(40 + k) * 0.7, 0.4 + r(50 + k) * 0.5, { collide: false }); }
  // The windows drawn (wins, above). Each in a wooden surround a hand proud of the wall, a sill under it.
  for (const w of wins) {
    // (On a deep jetty, src/core/phobos-houses.js, the street front's windows from the third storey up stand out with it.)
    const { st, sd, q, wx, wy, ww, wh, lit } = w, wz = q * (h.hz + 0.05 + (q === f && st >= 2 ? jutOf(h) : 0)), d = q > 0 ? 1 : -1, N = [q * s, 0, q * c], fw = ww + 0.1;
    const frame = (zz, nn, rev, jambs = false) => {
      const Q = (x0, y0, x1, y1) => (rev ? K.quad('dark:wood', P(x0, y0, zz), P(x1, y0, zz), P(x1, y1, zz), P(x0, y1, zz), nn) : K.quad('dark:wood', P(x1, y0, zz), P(x0, y0, zz), P(x0, y1, zz), P(x1, y1, zz), nn));   // (dark: in plain wood, lit by the lamps, the frames glowed orange, the critics)
      if (!jambs) { Q(wx - d * fw, wy - 0.12, wx + d * fw, wy); Q(wx - d * fw, wy + wh, wx + d * fw, wy + wh + 0.1); }
      Q(wx - d * fw, wy, wx - d * ww, wy + wh); Q(wx + d * ww, wy, wx + d * fw, wy + wh);
    };
    if (w.open) {
      // Open: its surround inside and out, one mullion up the middle (never a bar across, which would make a cross of it,
      // and the cross is hers), and the light of the room, if anyone's in, falling out of it at night.
      // (Inside, its two jambs only: its head and sill, seen from the street below through the opening, lay across the
      // mullion a little under the outer head, a transom: four panes, a cross. The critics, 2026-11-20.)
      frame(wz, N, false); frame(q * (iz - 0.02), [-q * s, 0, -q * c], true, true);
      const [mx, , mz] = P(wx, 0, q * (h.hz - WALL / 2));
      K.box('dark:wood', mx, wy, mz, 0.045, wh, WALL / 2, h.yaw, { collide: false });
      if (lit) (K.lamps ||= []).push({ p: P(wx, wy + wh * 0.6, q * (iz - 0.6)), c: [1, 0.6, 0.3], r: 7, i: 5, flicker: 0.35, indoor: true });
    } else {
      // Shut: the pane, a lamp behind it after dark in some; two bars down the lit ones.
      frame(wz, N, false);
      // (A dark pane is black glass: the slate-tinted iron threw the sky back, a blank grey card on a pale house. A lit one
      // is one of two warm lights, or dim: only a slit of it between drawn cloths; a mullion dark down every one. The critics.)
      const lv = hash2(id + st * 5 + sd, 88 + d), pane = (layer, x0, x1, o2) => K.quad(layer, P(wx + d * x1, wy, wz + q * o2), P(wx + d * x0, wy, wz + q * o2), P(wx + d * x0, wy + wh, wz + q * o2), P(wx + d * x1, wy + wh, wz + q * o2), N);
      pane(lit ? (lv < 0.5 ? 'eve:flame' : 'eve:wood') : 'obsidian', -ww, ww, 0.07);
      if (lit && lv > 0.3 && lv < 0.62) { pane('dark:cloth_oat', -ww, -ww * 0.25, 0.085); pane('dark:cloth_oat', ww * 0.35, ww, 0.085); }
      if (lit) pane('dark:wood', -0.035, 0.035, 0.1);
      if (false) for (const bu of [-ww / 3, ww / 3]) K.quad('wood', P(wx + bu + d * 0.025, wy, wz + q * 0.1), P(wx + bu - d * 0.025, wy, wz + q * 0.1), P(wx + bu - d * 0.025, wy + wh, wz + q * 0.1), P(wx + bu + d * 0.025, wy + wh, wz + q * 0.1), N);
    }
    // (A stone sill out under it, and one leaf of a painted pair hung back at its side, the PH2 pack's.)
    K.quad('stone', P(wx - d * fw, wy - 0.12, wz), P(wx + d * fw, wy - 0.12, wz), P(wx + d * fw, wy - 0.12, wz + q * 0.16), P(wx - d * fw, wy - 0.12, wz + q * 0.16), [0, 1, 0]);
    if (sd !== 0 && (w.open || st === 0 || r(16 + st) < 0.5)) K.quad(/^(pale|frost):/.test(h.wall) ? 'dark:p2_shutters' : 'p2_shutters', P(wx - d * fw, wy, wz + q * 0.03), P(wx - d * (fw + 0.34), wy, wz + q * 0.03), P(wx - d * (fw + 0.34), wy + wh, wz + q * 0.03), P(wx - d * fw, wy + wh, wz + q * 0.03), N, [[0.5, 1], [0, 1], [0, 0], [0.5, 0]]);
  }
  if (big && !ruin) {
    const NF = [f * s, 0, f * c], band = (y, t, o) => { K.quad('dark:stone', P(-h.hx, y, fz + f * o), P(h.hx, y, fz + f * o), P(h.hx, y + t, fz + f * o), P(-h.hx, y + t, fz + f * o), NF); K.quad('dark:stone', P(-h.hx, y + t, fz), P(h.hx, y + t, fz), P(h.hx, y + t, fz + f * o), P(-h.hx, y + t, fz + f * o), [0, 1, 0]); };
    for (let st = 1; st < storeys; st++) if (fy + st * 3.3 < top - 1) band(fy + st * 3.3 - 0.32, 0.24, 0.12);
    band(top - 0.42, 0.42, 0.24);
    // (His banner, the PH2 pack's: blood red, his horned skull on it.)
    if (flag) { const by = top - 0.9, len = Math.min(7, by - fy - 3.4); if (len > 2.5) { const bh = Math.min(len, 2.7), bw = bh / 3; K.quad(BANNER, P(-bw * f, by, fz + f * 0.06), P(bw * f, by, fz + f * 0.06), P(bw * f, by - bh, fz + f * 0.06), P(-bw * f, by - bh, fz + f * 0.06), NF, [[0, 0], [1, 0], [1, 1], [0, 1]]); K.beam('iron', P(-bw - 0.08, by + 0.04, fz + f * 0.1), P(bw + 0.08, by + 0.04, fz + f * 0.1), 0.045); } }
  }
  // A jettied front on some along the named streets: the first floor's beam carried out over the street on brackets; and
  // where there's no shop's awning under it, a pent roof of the house's tiles along the ground floor.
  if (!ruin && storeys >= 2 && (h.st ? h.st.jetty > 0 || (h.spine && r(33) < 0.5) : h.spine && r(33) < 0.5) && h.mark?.kind !== 'guildhall') {
    const jy = fy + 3.3 - 0.4, [bx, , bz] = P(0, 0, fz + f * 0.26);
    K.box('dark:wood', bx, jy, bz, h.hx + 0.1, 0.34, 0.26, h.yaw, { collide: false });
    for (let k = 0, n = Math.max(2, Math.round(h.hx / 1.3)); k <= n; k++) { const [kx, , kz] = P(-h.hx + 0.2 + (2 * h.hx - 0.4) * k / n, 0, fz + f * 0.2); K.box('dark:wood', kx, jy - 0.55, kz, 0.08, 0.55, 0.2, h.yaw, { collide: false }); }
    if (!h.shop) { const py = jy - 0.05; K.quad(h.roof, P(-h.hx, py + 0.5, fz + f * 0.02), P(h.hx, py + 0.5, fz + f * 0.02), P(h.hx, py - 0.15, fz + f * 0.85), P(-h.hx, py - 0.15, fz + f * 0.85), [f * s * 0.6, 0.8, f * c * 0.6]); }
  }
  // A lean-to against the back of one house in five off the named streets: a woodstore, a pen, somewhere out of the rain.
  const nProps = K.colliders.length;
  if (!h.spine && !ruin && h.hx > 2.6 && r(34) < 0.2) { const [lx, , lz] = P((r(35) - 0.5) * (h.hx - 1.2), 0, -f * (h.hz + 0.65)); K.leanTo(lx, lz, h.yaw + (f > 0 ? Math.PI : 0), 0.9 + 0.4 * r(36), 0.65, 2.3, h.roof || 'roof_4', 'dark:wood'); }
  if (h.mark?.kind !== 'shell' && r(8) < (h.shop ? 0.9 : 0.5)) { const q = P(DOOR + 0.5, fy + 2.5, fz); K.wallLamp(...q, [f * s, f * c]); if (r(8) < 0.3) (K.lamps ||= []).push({ p: [q[0] + f * s * 0.5, q[1] - 0.4, q[2] + f * c * 0.5], c: [1, 0.62, 0.3], r: 18, i: 11, flicker: 0.4 }); }
  // A shop's front, on the named streets: an awning over the door, a board hung out on an iron bracket, goods by the step.
  if (h.shop && !ruin) {
    // (The red, or oat sooted to hessian: the plain oat cloth was butter yellow down the streets, the critics.)
    // (The awning stops short of the sign, and the sign hangs just past its end: they met before, the board through the
    // cloth. The owner, 2026-11-20.)
    const sign = r(23) < 0.9, cloth = r(21) < 0.5 ? 'cloth_red' : 'umber:cloth_oat', ay = fy + 2.75;
    let aw = Math.min(h.hx - (sign ? 0.85 : 0.3), 2.2);
    if (r(22) < 0.75 && aw > DOOR + 0.35) { K.quad(cloth, P(aw * f, ay, fz + f * 0.02), P(-aw * f, ay, fz + f * 0.02), P(-aw * f, ay - 0.5, fz + f * 1.5), P(aw * f, ay - 0.5, fz + f * 1.5)); K.quad(cloth, P(-aw * f, ay, fz + f * 0.02), P(aw * f, ay, fz + f * 0.02), P(aw * f, ay - 0.5, fz + f * 1.5), P(-aw * f, ay - 0.5, fz + f * 1.5)); } else aw = 0;
    if (sign && h.mark?.kind !== 'tavern') shopSign(K, h, P, fy, fz, Math.floor(r(24) * SIGNS), aw ? -(aw + 0.45) : null);   // (a tavern has a bigger board of its own: phobos-houses.js)
    if (r(24) < 0.45) { const g = P(DOOR + 1.6, 0, fz + f * 0.8); K.goods(g[0], g[2], 4, 0.7); }
  }
  keepProps(K, nProps);
  if (!ruin) backyard(K, h, P, fy, r);
  // What's its own: its style's and its district's dress (src/core/phobos-houses.js).
  if (!ruin) { const nd = K.colliders.length; dressHouse(K, h, { P, F, fy, top, f, storeys, wins, R: roofOf(h), flag, BANNER, lamp: (p, rr, i) => (K.lamps ||= []).push({ p, c: [1, 0.62, 0.3], r: rr, i, flicker: 0.35 }) }); K.colliders.length = nd; }
  const n1 = K.colliders.length;
  // (No washing on tall posts out from the fronts any more: end on, two posts and a line of red and buff cloths were a pole
  // with a yard across its head and two flags, a T down every poor street. The critics, 2026-11-20; the V and T rule. The
  // washing's over the sills and the galleries now: src/core/phobos-houses.js.)
  if (r(19) < 0.14) { const q = P(-DOOR - 1.1, 0, fz + f * 0.5); K.barrel(q[0], q[2]); }
  else if (r(19) < 0.2) { const q = P(h.hx - 1.2, 0, fz + f * 0.45); K.woodpile(q[0], q[2], h.yaw, 0.9, 0.8, 0.3); }
  keepProps(K, n1);
  // The hearth: on the side wall across from the stair, in the house's back half, as a town house had its stack on a party
  // wall behind the hall (Pantin's and Quiney's plans); a chimney breast up through every floor to the stack over it, a
  // black firebox in it, a mantel beam, logs and a fire if anyone's home; and upstairs another in the same breast, on the
  // same flue. (The owner, 2026-11-19: put the fireplaces where they'd be in a house that's lived in. The stack had stood
  // anywhere on the roof, the hearth in the middle of the back wall.)
  const zH = -f * iz * 0.28;
  if (!ruin && ix > 1.4) hearths(K, h, P, fy, up, roofY, zH, r);
  // What's in it, room by room, and where its people sleep (src/core/phobos-rooms.js): kept off the stair, out of the way in
  // and the floor before the fire. (Nothing in it stops you. On a phone, only the beds, the tables and the counters.)
  if (!ruin) {
    // (Its strongest lights kept, not its first ones: a rich hall's table had lost its light to a candle by the door. The
    // biggest houses keep a fourth, round 3: their halls fell off into black.)
    const want = [], cap = h.hx * h.hz > 45 ? 4 : h.hx * h.hz > 30 ? 3 : 2;
    const lamp = (p, rr, i) => want.push({ p, c: [1, 0.78, 0.5], r: Math.max(rr, Math.min(10, h.hx + h.hz)), i, flicker: 0.25, indoor: true });
    furnish(K, h, roomPlan(h, F, up), P, !!K.leanNear, lamp);
    // (And one of them upstairs where there's a light up there, so the chambers aren't black round their sleepers, round 3.)
    if (want.length) {
      const order = want.map((l, k) => [l, k]).sort((a, b) => b[0].i - a[0].i || a[1] - b[1]).map((q) => q[0]), keep = order.slice(0, cap);
      const upper = (l) => up && l.p[1] > up.uy - 0.3, best = order.find(upper);
      if (best && !keep.some(upper) && keep.length === cap) keep[cap - 1] = best;
      (K.lamps ||= []).push(...keep);
    }
  }
}
// A house's fireplaces: a chimney breast out of the side wall across from the stair, up through every floor to the stack,
// and in it on each floor a fireplace you can see into: its two stone cheeks, a dark lintel over the opening, the iron
// fireback at its back, sooted inside; a hearthstone out before it; firedogs with the logs across them; a mantel shelf
// with a household's odds and ends on it; and the fire, if anyone's in. (The critics, 2026-11-20: the fire had been a
// glowing cone against a flat dark board on the face of the stone.)
function hearths(K, h, P, fy, up, roofY, zH, r) {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), ix = h.hx - WALL, X = [-c, 0, s];
  const bx = (layer, lx, y, lz, ax, hh, az) => { const [qx, , qz] = P(lx, 0, lz); K.box(layer, qx, y, qz, ax, hh, az, h.yaw, { collide: false }); };
  const D = 0.6, HW = 1.05, fb = ix - D, ST = h.mark?.kind === 'shell' ? 'char:stone' : 'stone';   // (a burnt house's sooted black)
  const one = (y, yTop, lit, small) => {
    const OW = small ? 0.45 : 0.62, OH = small ? 0.85 : 1.05, back = ix - 0.16;
    // (The cheeks either side of the opening, the breast over it to the floor above.)
    for (const e of [-1, 1]) bx(ST, ix - D / 2, y, zH + e * (OW + HW) / 2, D / 2, OH, (HW - OW) / 2);
    bx(ST, ix - D / 2, y + OH, zH, D / 2, yTop - y - OH, HW);
    bx('dark:stone', ix - D / 2 - 0.03, y + OH, zH, D / 2 + 0.03, 0.2, OW + 0.12);
    // (Inside it: the fireback, the sooted cheeks and the black of its throat.)
    K.quad('p2_fireback', P(back, y, zH + OW), P(back, y, zH - OW), P(back, y + OH, zH - OW), P(back, y + OH, zH + OW), X);
    const lean = !!K.leanNear;
    if (!lean) for (const e of [-1, 1]) K.quad('char:stone', P(fb, y, zH + e * OW), P(back, y, zH + e * OW), P(back, y + OH, zH + e * OW), P(fb, y + OH, zH + e * OW), [-e * s, 0, -e * c]);
    K.quad('char:stone', P(fb, y + OH - 0.01, zH - OW), P(back, y + OH - 0.01, zH - OW), P(back, y + OH - 0.01, zH + OW), P(fb, y + OH - 0.01, zH + OW), [0, -1, 0]);
    K.quad('char:stone', P(fb, y + 0.025, zH - OW), P(fb, y + 0.025, zH + OW), P(back, y + 0.025, zH + OW), P(back, y + 0.025, zH - OW), [0, 1, 0]);
    // (The hearthstone, a step proud of the boards; the mantel shelf on the breast.)
    bx(ST, fb - 0.3, y, zH, 0.3, 0.045, OW + 0.32);
    bx('dark:wood', fb - 0.09, y + OH + 0.2, zH, 0.11, 0.07, HW + 0.08);
    // (Firedogs, the logs on them, ash under.)
    const lx = (fb + back) / 2;
    if (!lean) for (const e of [-0.6, 0.6]) { bx('iron', lx, y, zH + e * OW, 0.12, 0.05, 0.025); bx('iron', fb + 0.06, y, zH + e * OW, 0.025, 0.28, 0.025); }
    for (const [u, v] of [[-0.12, 0.04], [0.1, -0.03]]) K.beam('bark', P(lx + v, y + 0.13, zH + u - OW * 0.75), P(lx - v, y + 0.16, zH + u + OW * 0.75), 0.11);
    if (lit) {
      const [gx, , gz] = P(lx, 0, zH);
      K.cone('flame', gx, y + 0.16, gz, OW * 0.45, OH * 0.62, 6); K.cone('flame', gx + s * OW * 0.35, y + 0.14, gz + c * OW * 0.35, OW * 0.28, OH * 0.4, 5); K.cone('flame', gx - s * OW * 0.32, y + 0.14, gz - c * OW * 0.32, OW * 0.25, OH * 0.34, 5);
      K.quad('eve:flame', P(fb, y + 0.03, zH - OW * 0.8), P(fb, y + 0.03, zH + OW * 0.8), P(back, y + 0.03, zH + OW * 0.8), P(back, y + 0.03, zH - OW * 0.8), [0, 1, 0]);
      (K.lamps ||= []).push({ p: P(fb - 0.8, y + 0.9, zH), c: [1, 0.6, 0.3], r: Math.max(11, h.hx + h.hz + 4), i: small ? 11 : 16, flicker: 0.6, indoor: true });
    }
    // (On the mantel: a candlestick, a jug, a dish or a little box, a different few in every house.)
    const my = y + OH + 0.27, mx = fb - 0.09;
    for (let k = 0; k < (lean ? 0 : 3); k++) {
      const v = r(70 + k + (small ? 9 : 0)); if (v < 0.25) continue;
      const [qx, , qz] = P(mx, 0, zH + (k - 1) * HW * 0.6 + (v - 0.5) * 0.2);
      if (v < 0.45) { K.drum('iron', qx, my, qz, 0.03, 0.2, 4, { collide: false, open: true }); K.drum('pale:stone', qx, my + 0.2, qz, 0.02, 0.1, 4, { collide: false }); }
      else if (v < 0.65) K.drum('umber:rubble', qx, my, qz, 0.06, 0.16, 5, { collide: false, r2: 0.045 });
      else if (v < 0.85) K.box('pale:stone', qx, my, qz, 0.03, 0.18, 0.11, h.yaw, { collide: false });
      else K.box('dark:wood', qx, my, qz, 0.06, 0.08, 0.09, h.yaw + v, { collide: false });
    }
  };
  const lit = r(9) < 0.8 && h.mark?.kind !== 'shell';
  one(fy, up ? up.uy : roofY, lit, false);
  if (up) one(up.uy, roofY, lit && r(10) < 0.5, true);
}
// A house's upstairs from near (upstairs, above): the ground floor's ceiling on its joists and the floor over it, both cut
// round the stair; the stair, boarded in under (a cupboard door in it), its treads proud of dark risers, a handrail on
// newels; a railing round the hole; and a bedroom: a bed with a headboard, a chest at its foot, a stool, a rug, a pallet
// in the bigger ones, a candle in most.
function upstairsNear(K, h, up, P, r) {
  const { ix, iz, fy, uy, uc, steps, hole: [z1, z0], tread: TREAD } = up, f = h.front, xs = -ix + SW, n = steps.length;
  const at = (lx, lz) => { const q = P(lx, 0, lz); return [q[0], q[2]]; };
  const bx = (layer, lx, y0, lz, hx, hh, hz, yaw = h.yaw) => { const [x, z] = at(lx, lz); K.box(layer, x, y0, z, hx, hh, hz, yaw, { collide: false }); };
  // (Each piece of floor a rect in the house's x and z: the board top at uy, the ceiling under it a hand lower.)
  const flat = (x0, x1, za, zb) => {
    const [a, b] = [Math.min(za, zb), Math.max(za, zb)];
    K.quad('wood', P(x0, uy, f * a), P(x0, uy, f * b), P(x1, uy, f * b), P(x1, uy, f * a), [0, 1, 0]);
    K.quad('wood', P(x0, uy - 0.2, f * a), P(x1, uy - 0.2, f * a), P(x1, uy - 0.2, f * b), P(x0, uy - 0.2, f * b), [0, -1, 0]);
  };
  flat(xs, ix, -iz, iz); flat(-ix, xs, -iz, z1); flat(-ix, xs, z0, iz);
  // The hole's edges: the board's thickness all round it.
  const e = (ax, az, bx2, bz) => K.quad('wood', P(ax, uy - 0.2, f * az), P(bx2, uy - 0.2, f * bz), P(bx2, uy, f * bz), P(ax, uy, f * az));
  e(xs, z1, xs, z0); e(xs, z0, xs, z1); e(-ix, z1, xs, z1); e(xs, z1, -ix, z1); e(-ix, z0, xs, z0); e(xs, z0, -ix, z0);
  // Joists under it, across the house every 1.2 m (short of the stair where they'd cross its hole); the upstairs ceiling, on
  // its own, and a tie-beam across under it at each end and the middle.
  if (!K.leanNear) for (let zz = -iz + 0.5; zz < iz - 0.3; zz += 1.2) {
    const inHole = zz > z1 - 0.1 && zz < z0 + 0.1, x0 = inHole ? xs : -ix;
    bx('dark:wood', (x0 + ix) / 2, uy - 0.38, f * zz, (ix - x0) / 2, 0.18, 0.07);
  }
  K.quad('wood', P(-ix, uc, -iz), P(ix, uc, -iz), P(ix, uc, iz), P(-ix, uc, iz), [0, -1, 0]);
  for (const zz of [-iz + 0.4, 0, iz - 0.4]) bx('dark:wood', 0, uc - 0.24, f * zz, ix, 0.24, 0.1);
  // The stair: under each tread a dark block down to the floor (its riser the face of it), the tread a board on top, a
  // little proud. Its open side boarded in up to a stringer under the nosings, a cupboard door in the tall end.
  for (const [lx, lz, y] of steps) {
    bx('dark:wood', lx, fy, lz, SW / 2, y - fy - 0.04, TREAD / 2);
    bx('wood', lx, y - 0.045, lz - f * 0.02, SW / 2 + 0.02, 0.045, TREAD / 2 + 0.03);
  }
  const so = xs + 0.012, NX = [Math.cos(h.yaw), 0, -Math.sin(h.yaw)], nose = (z) => fy + RISE + (z0 - z) / TREAD * RISE;
  K.quad('dark:wood', P(so, fy, f * z0), P(so, fy, f * z1), P(so, nose(z1) - 0.3, f * z1), P(so, Math.max(fy + 0.02, nose(z0) - 0.3), f * z0), NX);
  K.quad('soot:wood', P(so + 0.01, nose(z0) - 0.32, f * z0), P(so + 0.01, nose(z1) - 0.32, f * z1), P(so + 0.01, nose(z1) + 0.02, f * z1), P(so + 0.01, nose(z0) + 0.02, f * z0), NX);
  { const zc = z1 + 0.75, dw = 0.32, dh = Math.min(1.5, nose(zc + dw) - 0.45 - fy);
    if (dh > 0.9) { K.quad('soot:wood', P(so + 0.015, fy + 0.04, f * (zc + dw)), P(so + 0.015, fy + 0.04, f * (zc - dw)), P(so + 0.015, fy + dh, f * (zc - dw)), P(so + 0.015, fy + dh, f * (zc + dw)), NX);
      bx('iron', so + 0.03, fy + dh * 0.55, f * (zc + dw - 0.08), 0.02, 0.1, 0.02); } }
  // (Under the landing at its head, boarded in to the floor over it: a closet, its door. It had stood open, a black hole.)
  if (z1 + iz > 0.3) {
    K.quad('dark:wood', P(so, fy, f * z1), P(so, fy, -f * iz), P(so, uy - 0.2, -f * iz), P(so, uy - 0.2, f * z1), NX);
    const zc = (z1 - iz) / 2, dw = Math.min(0.32, (z1 + iz) / 2 - 0.12);
    if (dw > 0.2) { K.quad('soot:wood', P(so + 0.015, fy + 0.04, f * (zc + dw)), P(so + 0.015, fy + 0.04, f * (zc - dw)), P(so + 0.015, fy + 1.85, f * (zc - dw)), P(so + 0.015, fy + 1.85, f * (zc + dw)), NX); bx('iron', so + 0.03, fy + 1.0, f * (zc + dw - 0.08), 0.02, 0.1, 0.02); }
  }
  // (A handrail up it on two newels; the foot one by the bottom step, the head one at the hole.)
  const hr = xs + 0.06, ha = P(hr, nose(z0) + 0.85, f * (z0 + 0.05)), hb = P(hr, nose(z1) + 0.85, f * (z1 - 0.05));
  K.beam('wood', ha, hb, 0.035);
  bx('dark:wood', hr, fy, f * (z0 + 0.05), 0.06, nose(z0) + 1.0 - fy, 0.06);
  // A railing round the hole's open sides (the room's side and its foot), posts every 0.8 m or so, a rail and a mid-rail.
  const rail = (ax, az, bx2, bz) => {
    const L = Math.hypot(bx2 - ax, bz - az), m = Math.max(2, Math.round(L / 0.8));
    for (const hy of [0.95, 0.5]) K.beam('wood', P(ax, uy + hy, f * az), P(bx2, uy + hy, f * bz), hy > 0.9 ? 0.04 : 0.025);
    for (let k = 0; k <= m; k += K.leanNear ? m : 1) { const u = k / m; bx('dark:wood', ax + (bx2 - ax) * u, uy, f * (az + (bz - az) * u), 0.045, 1.0, 0.045); }
  };
  rail(xs + 0.05, z1, xs + 0.05, z0 + 0.05); rail(-ix + 0.05, z0 + 0.05, xs + 0.05, z0 + 0.05);
  // Skirting along the upstairs walls, dark timber; a post up each corner.
  const sk = (ax, az, bx2, bz, N) => K.quad('dark:wood', P(ax, uy, az), P(bx2, uy, bz), P(bx2, uy + 0.14, bz), P(ax, uy + 0.14, az), N);
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), d = 0.012;
  sk(ix - d, -iz, ix - d, iz, [-c, 0, s]); sk(-ix + d, -iz, -ix + d, iz, [c, 0, -s]); sk(-ix, iz - d, ix, iz - d, [-s, 0, -c]); sk(-ix, -iz + d, ix, -iz + d, [s, 0, c]);
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx('dark:wood', u * (ix - 0.08), uy, v * (iz - 0.08), 0.08, uc - uy, 0.08);
  // (The chambers' beds and the rest are the house's plan's: src/core/phobos-rooms.js, furnish. A bed of its own had stood
  // here as well, in the back corner, and lay through whatever the plan put there: two beds in one, the critics.)
  // The boards between the two chambers, where the house is deep enough for two (src/core/phobos-rooms.js partition): from
  // the floor to the ceiling, both faces, a sill and a dark post at the way through by the stairwell's rail.
  const pt = partition(h, { hi: fy - 0.1, c, s }, up).up;
  if (pt) crossWall(K, h, P, pt.w, pt.x0, pt.x1, null, uy, uc);
}
// A cross wall inside a house (src/core/phobos-rooms.js partition): plastered both faces as the house's walls are, on a dark sill, floor to ceiling, a
// post at each side of its doorway (gap: [g0, g1], or none) or at its open end. (No head over the doorway: a post with a
// beam across its top, end on, is a T.)
function crossWall(K, h, P, w, x0, x1, gap, y0, y1) {
  const IN = /poor|daub|soot|burnt|char/.test(h.wall) ? 'p2_sooty_plaster' : 'pale:ph_grey_plaster';
  const f = h.front, c = Math.cos(h.yaw), s = Math.sin(h.yaw), N = [f * s, 0, f * c];
  const bx = (layer, lx, yb, lw, hx, hh, hw) => { const [qx, , qz] = P(lx, 0, f * lw); K.box(layer, qx, yb, qz, hx, hh, hw, h.yaw, { collide: false }); };
  const runs = gap ? [[x0, gap[0]], [gap[1], x1]] : [[x0, x1]];
  for (const [a, b] of runs) {
    if (b - a < 0.05) continue;
    for (const e of [1, -1]) K.quad(IN, P(a, y0, f * (w + e * 0.05)), P(b, y0, f * (w + e * 0.05)), P(b, y1, f * (w + e * 0.05)), P(a, y1, f * (w + e * 0.05)), N.map((q) => q * e));
    bx('dark:wood', (a + b) / 2, y0, w, (b - a) / 2, 0.12, 0.08);
  }
  const posts = gap ? [gap[0] - 0.05, gap[1] + 0.05] : [x0 + 0.05];
  for (const x of posts) bx('dark:wood', x, y0, w, 0.06, y1 - y0, 0.08);
}
// A curtain wall with relief: a heavy course along its foot, a pilaster every eighteen metres a step lighter than the
// wall, and an arrow slit both faces between each pair. (Forty metres of blank wall read as a cliff, not a wall built.)
// The castle's lesser gates. SALLY: the stretch of the outer curtain (the ring of 44 round the crag, phobosCastle) the
// Sally Gate stands in, east, where the crag runs out level to the shelf behind the Keep; POSTERNS: the stretches with a
// postern each, on the cliffs north and south, too sheer for a way down: shut, iron-bound, a hoist's arm over the drop.
export const SALLY = 0, POSTERNS = [11, 33];
function ringAt(ring, i) {
  const p = ring[i], q = ring[(i + 1) % ring.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
  const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, ox = mx - CRAG.x, oz = mz - CRAG.z, ol = Math.hypot(ox, oz);
  return { mx, mz, ux, uz, nx: ox / ol, nz: oz / ol, yaw: Math.atan2(q[0] - p[0], q[1] - p[1]) - Math.PI / 2 };
}
// The Sally Gate: two drums with his V round their heads, a passage 5 m wide under a machicolated head, its portcullis
// wound up but for its teeth, a brazier each side and fires in baskets down its walls; out of it a flagged road east over
// the shelf to the Ash Terrace at the world's edge, round, walled, his V on its parapet: where the castle meets the sky.
export const ASH_TERRACE = { x: 11590, z: 30, r: 26 };
function sallyGate(K, ring, S, C, BL) {
  const { mx, mz, ux, uz, nx, nz, yaw } = ringAt(ring, SALLY), y = Y(mx, mz), P = (a, h, b) => [mx + ux * a + nx * b, y + h, mz + uz * a + nz * b];
  for (const e of [-1, 1]) { const [tx, , tz] = P(e * 8.5, 0, 0.5); tower(K, C, tx, tz, 6, 38, null, { lit: 0.6 }); }
  // (The head over the passage, the passage's cheeks and vault dark, its teeth, the fires.)
  { const [hx, , hz] = P(0, 0, 0); K.box(S, hx, y + 7, hz, 3.6, 22, 3.4, yaw, { collide: false });
    for (const e of [-1, 1]) { const [cx, , cz] = P(e * 2.6, 0, 0); K.box('dark:stone', cx, y - 0.5, cz, 0.25, 7.6, 3.2, yaw, { collide: false }); }
    const [vx, , vz] = P(0, 0, 0); K.box('dark:stone', vx, y + 6.9, vz, 2.6, 0.12, 3.2, yaw, { collide: false });
    for (let b = -2.2; b <= 2.21; b += 0.55) { const [px, , pz] = P(b, 0, 2.9); K.box('iron', px, y + 5.4, pz, 0.06, 1.5, 0.06, yaw, { collide: false }); K.cone('iron', px, y + 5.4, pz, 0.07, -0.35, 4); }
    for (const e of [-1, 1]) for (const d of [-1.6, 1.6]) { const [fx, , fz] = P(e * 2.15, 0, d); K.drum('iron', fx, y + 3.3, fz, 0.2, 0.45, 6, { r2: 0.38, open: true, collide: false }); fire(K, fx, y + 3.55, fz, 0.28, 1.0); }
    (K.lamps ||= []).push({ p: P(0, 3.5, 0), c: [1, 0.45, 0.2], r: 22, i: 50, flicker: 0.35, prio: 20 });
    for (const e of [-1, 1]) { const [bx, , bz] = P(e * 6, 0, 8); const by = Y(bx, bz); K.drum('dark:stone', bx, by - 0.3, bz, 0.75, 3.4, 4, { r2: 0.5, turn: Math.PI / 4 }); K.drum('iron', bx, by + 3.1, bz, 0.45, 0.7, 8, { r2: 1.0, open: true, collide: false }); fire(K, bx, by + 3.4, bz, 0.62, 2.1); }
    (K.lamps ||= []).push({ p: P(0, 3, 9), c: [1, 0.4, 0.16], r: 34, i: 120, flicker: 0.25, prio: 30 });
    // (His banner down the head, outside.)
    const [bx2, , bz2] = P(0, 0, 3.5); hangBanner(K, bx2, y + 26, bz2, [nx, nz], 3.4, 12, 3); }
  // The road out to the Ash Terrace, and the terrace.
  { const [ax, , az] = P(0, 0, 4), T = ASH_TERRACE, L = Math.hypot(T.x - ax, T.z - az), dx = (T.x - ax) / L, dz = (T.z - az) / L, ry = Math.atan2(-dz, dx);
    for (let d = 0; d < L - T.r + 1; d += 8) K.paving('p2_ward_paving', ax + dx * (d + 4), az + dz * (d + 4), 4.05, 3.2, ry, 0.08);
    K.ringPaving('p2_ward_paving', T.x, T.z, 0, T.r, 24, 0.09);
    const segs = 30;
    for (let k = 0; k < segs; k++) {
      const t = (k + 0.5) / segs * TAU, ex = T.x + Math.cos(t) * (T.r - 0.4), ez = T.z + Math.sin(t) * (T.r - 0.4), half = Math.PI * T.r / segs + 0.05;
      if (Math.abs(Math.atan2(Math.sin(t - Math.atan2(-dz, -dx)), Math.cos(t - Math.atan2(-dz, -dx)))) < 0.2) continue;   // (open where the road comes in)
      const ey = Y(ex, ez); K.box(S, ex, ey - 0.5, ez, 0.4, 1.6, half, -t); if (!K.lean) K.vee(S, ex, ey + 1.1, ez, 0.4, 1.4, half * 0.55, -t);
    }
    for (let k = 0; k < 4; k++) { const t = k / 4 * TAU + 0.78, bx = T.x + Math.cos(t) * (T.r - 3), bz = T.z + Math.sin(t) * (T.r - 3), by = Y(bx, bz);
      K.drum('dark:stone', bx, by - 0.3, bz, 0.75, 3.0, 4, { r2: 0.5, turn: Math.PI / 4 }); K.drum('iron', bx, by + 2.7, bz, 0.45, 0.7, 8, { r2: 1.0, open: true, collide: false }); fire(K, bx, by + 3.0, bz, 0.62, 2.1);
      if (k % 2 === 0) (K.lamps ||= []).push({ p: [bx, by + 4.5, bz], c: [1, 0.42, 0.18], r: 30, i: 70, flicker: 0.3 }); } }
}
// A postern: a squat tower in the curtain on the cliff, its door out onto a ledge over the drop, shut and iron-bound, a
// lamp over it; a timber hoist's arm out from the ledge's lip, its chain hung from the arm's end, nothing across it.
function postern(K, ring, i, C) {
  const { mx, mz, ux, uz, nx, nz, yaw } = ringAt(ring, i), y = Y(mx, mz), P = (a, h, b) => [mx + ux * a + nx * b, y + h, mz + uz * a + nz * b];
  tower(K, C, mx + nx * 2, mz + nz * 2, 6.5, 34, null, { lit: 0.5 });
  const [lx, , lz] = P(0, 0, 9.5); K.box('dark:p2_bridge_ashlar', lx, y - 6, lz, 4.2, 6.1, 3.2, yaw, { collide: false });
  const [dx2, , dz2] = P(0, 0, 8.55), N = [nx, 0, nz];
  K.quad('p2_studded_oak', P(-1.1, 0.05, 8.56), P(1.1, 0.05, 8.56), P(1.1, 2.9, 8.56), P(-1.1, 2.9, 8.56), N, [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.quad('dark:stone', P(-1.3, 2.9, 8.57), P(1.3, 2.9, 8.57), P(1.3, 3.25, 8.57), P(-1.3, 3.25, 8.57), N);
  { const q = P(1.9, 3.4, 8.5); K.wallLamp(q[0], q[1], q[2], [nx, nz]); (K.lamps ||= []).push({ p: P(1.9, 3.0, 9.1), c: [1, 0.55, 0.25], r: 14, i: 14, flicker: 0.4 }); }
  const a0 = P(-2.8, 0, 12.2), a1 = P(-2.8, 5.2, 12.2), a2 = P(-2.8, 5.2, 15.4);
  K.beam('dark:wood', [a0[0], y - 0.3, a0[2]], a1, 0.18); K.beam('dark:wood', a1, a2, 0.14); K.beam('iron', a2, P(-2.8, -4, 15.4), 0.03);
  void dx2; void dz2;
}
function curtain(K, layer, ax, az, bx, bz, t, h, o = {}) {
  K.wall(layer, ax, az, bx, bz, t, h, o);
  if (K.lean) return;
  const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2, ux = (bx - ax) / len, uz = (bz - az) / len;
  const lite = o.lite || (layer.startsWith('soot:') ? layer.slice(5) : layer.startsWith('char:') ? 'soot:' + layer.slice(5) : 'soot:' + layer.replace(/^\w+:/, ''));
  const n = Math.max(1, Math.round(len / 18));
  // (Its buttresses in its own stone, stepped out wider at their feet: in the lighter they were pale strips up a dark wall,
  // seams and not masonry standing out of it, the critics.)
  for (let k = 0; k <= n; k++) {
    const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, y = Y(x, z) - 0.5;
    K.box(layer, x, y, z, 1.1, h * 0.94, t / 2 + 0.7, yaw, { collide: false });
    K.box(layer, x, y, z, 1.5, h * 0.36, t / 2 + 1.5, yaw, { collide: false });
  }
  // (And under its merlons a shelf carried out a stretch at a time, as on corbels: its head stands out over its face, the
  // wall's line at the top a shadow and not a ruled edge.)
  // (Chunk by chunk as K.wall lays it, its top following the ground's: one to a stretch stood off a slope's wall.)
  if (h > 12 && !o.y) { const c = Math.max(1, Math.ceil(len / 8)); for (let k = 0; k < c; k++) {
    const x = ax + (bx - ax) * (k + 0.5) / c, z = az + (bz - az) * (k + 0.5) / c;
    const y = Math.min(Y(x - (bx - ax) / c / 2, z - (bz - az) / c / 2), Y(x + (bx - ax) / c / 2, z + (bz - az) / c / 2));
    K.box('dark:stone', x, y + h - 2.4, z, len / c / 2 + 0.05, 1.5, t / 2 + 0.75, yaw, { collide: false });
  } }
  for (let k = 0; k < n; k++) {
    const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n, y = Y(x, z) - 0.5;
    K.box(lite, x, y, z, len / n / 2, 3.4, t / 2 + 0.9, yaw, { collide: false });
    for (const s of [-1, 1]) { const fx = x - uz * s * (t / 2 + 0.03), fz = z + ux * s * (t / 2 + 0.03), sy = y + h * 0.55; K.quad('char:iron', [fx - ux * 0.3, sy, fz - uz * 0.3], [fx + ux * 0.3, sy, fz + uz * 0.3], [fx + ux * 0.3, sy + 3.2, fz + uz * 0.3], [fx - ux * 0.3, sy + 3.2, fz - uz * 0.3], [-uz * s, 0, ux * s]); }
  }
}

// A fire that moves: a flame that turns to face you and the warm air round it (the delves' fires, src/gfx/interior.js GLOW,
// drawn near Phobos by src/gfx/renderer.js), over a low bed of coals, which is all a far eye and the shadows get.
export function fire(K, x, y, z, w, h, hue = 'dark:flame') {
  K.cone('blood:flame', x, y, z, w * 0.85, h * 0.12, 6);
  const seed = hash2(Math.round(x * 3), Math.round(z * 3));
  (K.fires ||= []).push({ delve: 'phobos', hue, kind: 'flame', x, y, z, w, h, ember: 0, seed },
    { delve: 'phobos', hue, kind: 'glow', x, y: y + h * 0.45, z, w: w * 2.6, h: w * 2.6, ember: 0, seed: 0 });
}

// A round tower from the ground (or y) up, with a steep cone (one small one in five a needle) or a crown of merlons (a fire
// in an iron bowl on some); a ring gallery near its head if big. And the kit that makes it masonry at three hundred metres
// (not on a phone): a battered foot, a dark string course every eighteen metres, slits staggered up it, a few lit at
// evening, and under a small one's head a corbelled ring.
// (turn: its sides turned so; shell: from near, its wall drawn by whoever asks, doorways cut through it, and gaps those
// doorways, which nothing round it crosses; bare: a plain shaft, nothing on its head (a square tower's, under a cone of
// its own). src/core/phobos-towers.js.)
export function tower(K, layer, x, z, r, h, roof, o = {}) {
  const y = o.y ?? Y(x, z), id = Math.round(x * 3 + z * 5), sides = o.sides || 12, turn = o.turn || 0, sink = o.sink ?? 3, ri = r * Math.cos(Math.PI / sides);
  // (Whether a side, from y0 to y1, would cross one of its doorways.)
  const cuts = (i, y0, y1) => !!o.gaps?.some((g) => y0 < g.y1 && y1 > g.y0 && Math.abs(((g.a - turn - (i + 0.5) / sides * TAU) % TAU + TAU + Math.PI) % TAU - Math.PI) < Math.PI / sides + g.w / ri);
  // (pass: a height from which it's walked through, the wall-walk's: solid below that, a doorway's worth of air above.)
  if (o.shell) o.shell(y);
  else K.drum(layer, x, y - sink, z, r, h + sink, sides, { collide: o.pass === undefined ? o.collide : false, turn });
  if (o.pass !== undefined) K.colliders.push({ x, z, hx: r * 0.8, hz: r * 0.8, yaw: 0, h: h, t: o.pass - 0.4 });
  // (Its head, which a drum has for a lid.)
  const cap = () => { for (let i = 0; i < sides; i++) { const a = turn + i / sides * TAU, b = turn + (i + 1) / sides * TAU; K.tri(layer, [x, y + h, z], [x + Math.cos(b) * r, y + h, z + Math.sin(b) * r], [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r]); } };
  if (o.bare) { if (o.shell) cap(); return y + h; }
  if (r >= 8) K.drum(layer, x, y + h - 7, z, r, 2, sides, { r2: r + 2, open: true, collide: false, turn }), K.drum(layer, x, y + h - 5, z, r + 2, 5, sides, { open: true, collide: false, turn });
  if (roof) { if (r < 9 && hash2(id, 11) < 0.08) K.cone(roof, x, y + h, z, r + 0.5, r * (o.steep ?? 2.4) * 1.8, sides, turn); else K.cone(roof, x, y + h, z, r + (r >= 8 ? 2.4 : 0.8), r * (o.steep ?? 2.4), sides, turn); }
  else {
    if (o.shell) cap();
    // (His V cut in each: swallowtail merlons round its head, the notch along the wall. On a phone, plain.)
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, mx = x + Math.cos(a) * (r - 0.5), mz = z + Math.sin(a) * (r - 0.5); if (K.lean) { if (i % 2 === 0) K.box(layer, mx, y + h, mz, 0.8, 1.6, 0.5, -a, { collide: false }); } else K.vee(layer, mx, y + h, mz, Math.min(1.4, r * 0.18), 2.0, 0.5, -a + Math.PI / 2, 0.5); }
    if (hash2(id, 12) < 0.45) { K.drum('iron', x, y + h, z, r * 0.22, 1.2, 8, { r2: r * 0.34, open: true, collide: false }); fire(K, x, y + h + 0.6, z, r * 0.24, r * 0.62); }
  }
  if (K.lean || o.plain) return y + h;
  // (The bands, and the corbels under a small one's head, a step lighter than the tower's own stone (the same stone less
  // sooted), so they read from the city without turning into painted stripes: the same value, they were gone at 200 m.)
  const own = layer.includes(':') ? layer.split(':')[1] : layer, tint = layer.includes(':') ? layer.split(':')[0] : '';
  const band = tint === 'dark' ? 'soot:' + own : tint === 'soot' ? 'dark:' + own : 'soot:stone';   // (soot's bands half a step up, not the bare stone: that read blue, rings painted round the drums.)
  // (The battered foot left off over a doorway, and its ends closed there.)
  const R0 = r * 1.08 + 0.7, hb = Math.min(9, 2 + h * 0.07);
  K.drum(layer, x, y - 1, z, R0, hb, sides, { r2: r, open: true, collide: false, turn, skip: (i) => cuts(i, y - 1, y - 1 + hb) });
  if (o.gaps) for (let i = 0; i < sides; i++) {
    if (!cuts(i, y - 1, y - 1 + hb)) continue;
    for (const [e, nb] of [[i, (i + sides - 1) % sides], [i + 1, (i + 1) % sides]]) {
      if (cuts(nb, y - 1, y - 1 + hb)) continue;
      const a = turn + e / sides * TAU, c = Math.cos(a), s = Math.sin(a);
      // (A quad with its last corner doubled, not a tri: a tri's painting runs by x + z, nothing along a face turned
      // 45°, the critics' smeared cheek by a tower's door.)
      const top = [x + c * r, y - 1 + hb, z + s * r];
      K.quad(layer, [x + c * r, y - 1, z + s * r], [x + c * R0, y - 1, z + s * R0], top, top);
    }
  }
  // (Each band a dark course and a weathered slope over it back to the wall, which takes the sky's light: a dark line
  // under a pale one, that reads at three hundred metres where a flat ring didn't.)
  for (let yy = y + 12; yy < y + h - 8; yy += 18) { const skip = (i) => cuts(i, yy, yy + 1.35); K.drum(band, x, yy, z, r + 0.5, 0.9, sides, { open: true, collide: false, turn, skip }); K.drum(layer, x, yy + 0.9, z, r + 0.5, 0.45, sides, { r2: r, open: true, collide: false, turn, skip }); }
  if (r < 8) K.drum(band, x, y + h - 2.4, z, r, 2.4, sides, { r2: r + 0.9, open: true, collide: false, turn });
  const n = Math.max(4, Math.round(h / 9)), sw = 0.22 + r * 0.03, sh = 1.2 + r * 0.16;
  for (let k = 0; k < n; k++) {
    const si = (k * 5 + (k & 1) * Math.floor(sides / 2) + id) % sides, a = turn + (si + 0.5) / sides * TAU, yy = y + 6 + (h - 16) * (k + 0.5) / n, cx = x + Math.cos(a) * (ri + 0.05), cz = z + Math.sin(a) * (ri + 0.05), tx = -Math.sin(a) * sw, tz = Math.cos(a) * sw;
    if (cuts(si, yy, yy + sh)) continue;
    K.quad(hash2(id + k, 13) < (o.lit ?? 0.22) ? 'eve:flame' : 'iron', [cx - tx, yy, cz - tz], [cx + tx, yy, cz + tz], [cx + tx, yy + sh, cz + tz], [cx - tx, yy + sh, cz - tz], [Math.cos(a), 0, Math.sin(a)]);
  }
  return y + h;
}
// A bridge between two points in the air: a deck, a parapet either side, and pointed hangers under it.
function bridge(K, layer, a, b, w = 3, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx), n = Math.max(1, Math.round(L / 14));
  // Its deck, sides and parapets drawn as faces that follow its fall, its hump and its arch underneath, a span a few metres
  // at a time: boxes a segment each stepped on its top where it fell and on its underside where it deepened toward a tower,
  // and a merlon stuck up mid each made, from the yard, a row of broken blocks and crosses against the sky. The critics; the
  // V and T rule.
  const sx = Math.sin(yaw), sz = Math.cos(yaw), arch = o.arch || 0, m = Math.max(2, Math.round(L / 6));
  const top = (u) => a[1] + dy * u + Math.sin(u * Math.PI) * arch;
  const bot = (u) => top(u) - 4 - (L > 20 ? 8 * Math.pow(1 - Math.sin(u * Math.PI), 2) : 0);
  const at = (u, off, y) => [a[0] + dx * u + sx * off, y, a[2] + dz * u + sz * off];
  const W = w + 0.3, I = w - 0.3;
  for (let k = 0; k < m; k++) {
    const u0 = k / m, u1 = (k + 1) / m, t0 = top(u0), t1 = top(u1), b0 = bot(u0), b1 = bot(u1);
    K.quad(layer, at(u0, -I, t0), at(u1, -I, t1), at(u1, I, t1), at(u0, I, t0), [0, 1, 0]);
    K.quad(layer, at(u0, -W, b0), at(u1, -W, b1), at(u1, W, b1), at(u0, W, b0), [0, -1, 0]);
    for (const s of [-1, 1]) {
      const N = [sx * s, 0, sz * s], M = [-sx * s, 0, -sz * s];
      K.quad(layer, at(u0, s * W, b0), at(u1, s * W, b1), at(u1, s * W, t1 + 1.2), at(u0, s * W, t0 + 1.2), N);
      K.quad(layer, at(u0, s * I, t0), at(u1, s * I, t1), at(u1, s * I, t1 + 1.2), at(u0, s * I, t0 + 1.2), M);
      K.quad(layer, at(u0, s * I, t0 + 1.2), at(u1, s * I, t1 + 1.2), at(u1, s * W, t1 + 1.2), at(u0, s * W, t0 + 1.2), [0, 1, 0]);
    }
  }
  // (A pier only where it comes down on the rock: one that stopped in the air was a block hung under the deck, and a deck
  // across a post is a T against the sky from the yard. Under every other stretch of the old fourteen metres.)
  if (o.piers) for (let i = 1; i < n; i += 2) {
    const u = (i + 0.5) / n, x = a[0] + dx * u, z = a[2] + dz * u, fy = Y(x, z) - 2, ty = bot(u) + 0.5;
    if (ty - fy < 190) K.box(layer, x, fy, z, 2.6, ty - fy, w * 0.8, yaw, { collide: false });
  }
  // (o.dress: a corbel of two wedges under each end, where it springs from its tower; and under a long one his V, two struts
  // down from its quarters to a point below its middle. A deck from nothing to nothing was a ribbon: the critics.)
  if (o.dress && !K.lean) {
    const was = K.soft; K.soft = true;
    for (const u of [0.03, 0.97]) { const q = at(u, 0, bot(u) + 0.6); for (const off of [-w * 0.6, w * 0.6]) K.spike(layer, q[0] + sx * off, q[1], q[2] + sz * off, 1.5, -(6 + Math.min(6, L * 0.06)), 4, yaw); }
    if (L > 55) { const tip = at(0.5, 0, bot(0.5) - Math.min(16, L * 0.14)); for (const u of [0.3, 0.7]) for (const off of [-w * 0.7, w * 0.7]) K.beam(layer, at(u, off, bot(u) + 0.3), [tip[0] + sx * off * 0.3, tip[1], tip[2] + sz * off * 0.3], 0.5); }
    K.soft = was;
  }
  // (walk: its deck is stood on, a tread at a time, following its fall and its arch. Its ends run a little into what it joins.)
  if (o.walk) {
    const m = Math.ceil((L + 4) / 0.9), rects = [];
    for (let k = 0; k < m; k++) { const u = ((k + 0.5) * 0.9 - 2) / L, v = Math.min(1, Math.max(0, u)); rects.push([a[0] + dx * u, a[2] + dz * u, 0.5, w - 0.4, yaw, a[1] + dy * v + (o.arch ? Math.sin(v * Math.PI) * o.arch : 0)]); }
    walk(K, rects);
    // Its parapets stop you, as they look to: a box down each side a span at a time, from under the deck to a little over the
    // parapet's top (so a jump doesn't clear it), and nothing below that, so the street or the yard under it is walked as
    // before. The deck ran to a hand inside a parapet nothing stood in, and a step to the side was a fall of a hundred metres.
    // (Not over its ends' last metre and a half, where it runs into its tower's gallery.)
    const e0 = Math.min(0.3, 1.5 / L), q = Math.max(2, Math.round(L / 3));
    for (let k = 0; k < q; k++) {
      const u0 = e0 + (1 - 2 * e0) * k / q, u1 = e0 + (1 - 2 * e0) * (k + 1) / q, t0 = top(u0), t1 = top(u1), um = (u0 + u1) / 2;
      for (const s of [-1, 1]) {
        const c = at(um, s * w, 0);
        K.colliders.push({ x: c[0], z: c[2], hx: L * (u1 - u0) / 2 + 0.15, hz: 0.3, yaw, h: Math.max(t0, t1) + 1.9 - Y(c[0], c[2]), b: Math.min(t0, t1) - 0.8, t: Math.max(t0, t1) + 1.9 });
      }
    }
  }
}
// Decks to stand on, high over ground that's walked on too (the patio, the Keep's steps, the stairs): [x, z, half across,
// half through, yaw, y] each. (stack and over: src/sim/world.js platformAt.)
export function walk(K, rects) { K.deck(rects); const p = K.floors.at(-1); p.stack = true; p.over = true; return p; }
// A stair that winds round (cx, cz) at radius r from y0 to y1, half a metre a step: the way up the outside of a tower, or
// (layer null: nothing drawn) up the inside of one. a0: where it starts; dir: which way it turns; turn: the whole angle
// it's to wind through, if it must end somewhere. Returns the angle it ends at.
export function spiral(K, layer, cx, cz, r, y0, y1, a0 = 0, dir = 1, o = {}) {
  const n = Math.max(1, Math.ceil((y1 - y0) / 0.5)), rise = (y1 - y0) / n, da = o.turn !== undefined ? o.turn / n : 0.95 / r, hw = o.hw ?? 2, half = Math.abs(da) * r / 2 + 0.08, rects = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + dir * (k + 0.5) * da, y = y0 + (k + 1) * rise, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    rects.push([x, z, hw, half, -a, y]);
    // (On a phone four steps are drawn as one block: the floors are the same.)
    // (o.thick: how deep a step's block goes under its tread; a slab, not a block, where its underside is seen.)
    const th = o.thick ?? 1.6;
    // (o.wedge: each step a wedge of the ring, so they meet edge to edge: a turned box's corners hung out under the next
    // step's, teeth seen from below, the critics on the towers' stairs.)
    if (layer && o.wedge) {
      // (Its underside sloped, from the step below's to the one above's, one even soffit under the flight, not teeth;
      // o.reach: drawn on out past its walk so it meets its wall, corners too, not stood free of it.)
      const s0 = a - Math.abs(da) / 2, s1 = a + Math.abs(da) / 2, ri = r - hw, ro = r + hw + (o.reach ?? 0), lo = dir * da > 0 ? s0 : s1;
      const b0 = y - th - (lo === s0 ? rise : 0), b1 = y - th - (lo === s1 ? rise : 0);
      const P = (an, rr, yy) => [cx + Math.cos(an) * rr, yy, cz + Math.sin(an) * rr];
      K.quad(layer, P(s0, ri, y), P(s1, ri, y), P(s1, ro, y), P(s0, ro, y), [0, 1, 0]);
      K.quad(layer, P(s0, ri, b0), P(s0, ro, b0), P(s1, ro, b1), P(s1, ri, b1), [0, -1, 0]);
      K.quad(layer, P(s0, ro, b0), P(s1, ro, b1), P(s1, ro, y), P(s0, ro, y), [Math.cos(a), 0, Math.sin(a)]);
      K.quad(layer, P(s0, ri, b0), P(s1, ri, b1), P(s1, ri, y), P(s0, ri, y), [-Math.cos(a), 0, -Math.sin(a)]);
      K.quad(layer, P(s0, ri, b0), P(s0, ro, b0), P(s0, ro, y), P(s0, ri, y), [Math.sin(s0), 0, -Math.cos(s0)]);
      K.quad(layer, P(s1, ri, b1), P(s1, ro, b1), P(s1, ro, y), P(s1, ri, y), [-Math.sin(s1), 0, Math.cos(s1)]);
    } else if (layer && (!K.lean || k % 4 === 0)) K.box(layer, x, y - th, z, hw, th, K.lean ? half * 4 : half, -a, { collide: false });
  }
  // (o.enclose: the stair walled and roofed as it winds, three steps to a stretch, an arrow slit every fifth and some lit:
  // a stair open round the outside of a tower is no stair a castle would have, the owner, 2026-11-19. Not on a phone.)
  if (o.enclose && layer && !K.lean) {
    const ro = r + hw + 0.4, ri = r - hw, Q = (an, rr, yy) => [cx + Math.cos(an) * rr, yy, cz + Math.sin(an) * rr];
    // (o.doors: that many steps at each end left unwalled, a doorway onto the gallery it leaves and the one it comes to.)
    for (let k0 = o.doors || 0, j = 0; k0 < n - (o.doors || 0); k0 += 3, j++) {
      const k1 = Math.min(n - (o.doors || 0), k0 + 3), A0 = a0 + dir * k0 * da, A1 = a0 + dir * k1 * da, Y0 = y0 + k0 * rise, Y1 = y0 + k1 * rise, am = (A0 + A1) / 2;
      const out = [Math.cos(am), 0, Math.sin(am)], inw = out.map((v) => -v);
      K.quad(o.enclose, Q(A0, ro, Y0 - 1.2), Q(A1, ro, Y1 - 1.2), Q(A1, ro, Y1 + 3.6), Q(A0, ro, Y0 + 3.6), out);
      K.quad(o.enclose, Q(A0, ro - 0.4, Y0), Q(A1, ro - 0.4, Y1), Q(A1, ro - 0.4, Y1 + 3.4), Q(A0, ro - 0.4, Y0 + 3.4), inw);
      K.quad(o.enclose, Q(A0, ri, Y0 + 3.6), Q(A1, ri, Y1 + 3.6), Q(A1, ro + 0.3, Y1 + 3.6), Q(A0, ro + 0.3, Y0 + 3.6), [0, 1, 0]);
      K.quad(o.enclose, Q(A0, ri, Y0 + 3.4), Q(A1, ri, Y1 + 3.4), Q(A1, ro, Y1 + 3.4), Q(A0, ro, Y0 + 3.4), [0, -1, 0]);
      if (j % 5 === 2) { const w = 0.2 / ro, ym = (Y0 + Y1) / 2 + 0.9; K.quad(hash2(Math.round(cx + j), Math.round(cz)) < 0.3 ? 'eve:flame' : 'slate:iron', Q(am - w, ro + 0.02, ym), Q(am + w, ro + 0.02, ym), Q(am + w, ro + 0.02, ym + 1.5), Q(am - w, ro + 0.02, ym + 1.5), out); }
    }
  }
  walk(K, rects);
  return a0 + dir * n * da;
}
// A ring to stand on round (cx, cz), from radius r0 out to r1, at y: a gallery. (r0 0: a whole floor.)
function ring(K, layer, cx, cz, r0, r1, y) {
  const N = 16, rects = [];
  for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * TAU; rects.push([cx + Math.cos(a) * (r0 + r1) / 2, cz + Math.sin(a) * (r0 + r1) / 2, (r1 - r0) / 2 + 0.2, Math.PI * r1 / N + 0.4, -a, y]); }
  walk(K, rects);
  if (layer) K.drum(layer, cx, y - 1.2, cz, r1, 1.2, N, { collide: false });
}
// A stair up a wall's west face (the wall at x = face, the stair out to the west of it) from y0 to y1, about z: flights of
// about 24 m that double back, side by side in two lanes, a landing at each end. Half a metre a step.
// (side: -1 the stair's out to the west of the face, +1 to the east.)
export function stairPlan(face, y0, y1, side = -1) {
  const HW = 3.4, RISE = 0.5, TREAD = 0.9, flights = Math.max(1, Math.round((y1 - y0) / 24)), n = Math.round((y1 - y0) / flights / RISE);
  return { HW, RISE, TREAD, flights, n, half: n * TREAD / 2, lanes: [face + side * (HW + 0.3), face + side * (HW * 3 + 0.9)] };
}
function stairs(K, layer, face, zc, y0, y1, side = -1) {
  const { HW, RISE, TREAD, flights, n, half, lanes } = stairPlan(face, y0, y1, side), mid = (lanes[0] + lanes[1]) / 2;
  let y = y0;
  for (let j = 0; j < flights; j++) {
    const up = j % 2 === 0 ? -1 : 1, top = j === flights - 1 ? y1 : y + n * RISE, lane = lanes[j % 2];
    // (steps(): the top step against (x, z), the rest out in front of it, the way yaw looks.)
    K.steps(layer, lane, zc + up * half, up < 0 ? 0 : Math.PI, HW, n, { rise: (top - y) / n, tread: TREAD, y });
    const p = K.floors.at(-1); p.stack = true; p.over = true;
    // The landing at its head, across both lanes (the last one in against the wall's top), and a parapet outside it.
    K.box(layer, mid, top - 3, zc + up * (half + 2.6), HW * 2 + 0.6, 3, 2.6, 0, { collide: false });
    walk(K, [[mid, zc + up * (half + 2.6), HW * 2 + 0.6, 2.6, 0, top]]);
    // (A rib of masonry under each flight, back to the wall, so it doesn't hang in the air.)
    K.box(layer, lane, y - 5, zc, HW, 5, half, 0, { collide: false });
    y = top;
  }
  // The foot: a landing on the ground it starts from.
  K.box(layer, mid, y0 - 1.5, zc + half + 2.6, HW * 2 + 0.6, 1.5, 2.6, 0, { collide: false });
  // (And a spine wall up between its two lanes, from the foot to a rail's height over the top flight, the landings open
  // past its ends: there was a slot a body's width between the flights, open from the top to the ground, that you fell
  // down cutting the corner from one flight to the next. tools/paths/trips.mjs.)
  if (flights > 1) K.box(layer, mid, y0 - 0.5, zc, 0.32, y1 + 1.1 - y0 + 0.5, half, 0);
}
// A tall pointed window on a wall's face: its middle (cx, cz) on the face, (nx, nz) out from it; half as wide as w, its
// sill at y0, springing at y1 and its point over that. Lit at evening (leaded glass with a fire behind it: 'eve:flame',
// dark glass by day) or black glass. A dark stone surround a hand proud of the wall and two mullions down it in the wall's own stone, so it's
// three lights; never a bar across one down, which is a cross, and the cross is hers. (Quads only: nothing here stops a body.)
function lancet(K, cx, cz, nx, nz, w, y0, y1, lit, stone) {
  const ax = nz, az = -nx, P = (u, y, o) => [cx + ax * u + nx * o, y, cz + az * u + nz * o], N = [nx, 0, nz], pk = y1 + w * 1.15, G = lit ? 'eve:flame' : 'slate:iron';
  K.quad('dark:stone', P(-w - 0.5, y0 - 0.7, 0.06), P(w + 0.5, y0 - 0.7, 0.06), P(w + 0.5, y1, 0.06), P(-w - 0.5, y1, 0.06), N);
  K.tri('dark:stone', P(-w - 0.5, y1, 0.06), P(w + 0.5, y1, 0.06), P(0, pk + 0.75, 0.06));
  K.quad(G, P(-w, y0, 0.12), P(w, y0, 0.12), P(w, y1, 0.12), P(-w, y1, 0.12), N);
  K.tri(G, P(-w, y1, 0.12), P(w, y1, 0.12), P(0, pk, 0.12));
  for (const m of [-w / 3, w / 3]) K.quad(stone, P(m - 0.12, y0, 0.18), P(m + 0.12, y0, 0.18), P(m + 0.12, y1 + w * 0.5, 0.18), P(m - 0.12, y1 + w * 0.5, 0.18), N);
  K.quad(stone, P(-w - 0.6, y0 - 0.05, 0.06), P(w + 0.6, y0 - 0.05, 0.06), P(w + 0.6, y0 - 0.05, 0.5), P(-w - 0.6, y0 - 0.05, 0.5), [0, 1, 0]);
}
// A block with a ridged roof at a height of its own (the castle's halls, which stand on the rock or on each other).
// Between its buttresses a lancet to each bay down both long sides, most of them lit; ends: lancets in its gable ends too,
// [west, east] how many (the Library's glazed end).
function hall(K, layer, roof, x, y, z, hx, h, hz, yaw = 0, o = {}) {
  K.box(layer, x, y, z, hx, h, hz, yaw, { collide: o.collide, top: false });
  gable(K, roof, x, y + h, z, hx + 0.6, hz + 0.6, hz * (o.pitch ?? 0.8), yaw, layer, 0.6);
  if (o.windows !== false && h > 12) {
    const c = Math.cos(yaw), s = Math.sin(yaw), nb = Math.max(2, Math.round(hx / 9)), bay = 2 * hx / nb, w = Math.min(1.7, bay * 0.11), id = Math.round(x * 3 + z * 7);
    const y0 = y + Math.max(3.5, h * 0.16), y1 = y + h * 0.72 - w * 1.15;
    for (let i = 0; i < nb; i++) for (const sd of [-1, 1]) {
      const lx = -hx + bay * (i + 0.5), lz = sd * (hz + 0.02);
      lancet(K, x + lx * c + lz * s, z - lx * s + lz * c, sd * s, sd * c, w, y0, y1, hash2(id + i * 7, sd + 40) < (o.lit ?? 0.6), layer);
    }
    (o.ends || [0, 0]).forEach((n, e) => {
      const sd = e ? 1 : -1, ww = Math.min(2.6, hz * 0.12), gap = 2 * ww + 3.2;
      for (let k = 0; k < n; k++) {
        const lz = (k - (n - 1) / 2) * gap, lx = sd * (hx + 0.02), tall = 1 - Math.abs(k - (n - 1) / 2) / n * 0.5;
        lancet(K, x + lx * c + lz * s, z - lx * s + lz * c, sd * c, -sd * s, ww, y0, y0 + (y1 - y0) * tall, true, layer);
      }
    });
  }
  // (Buttresses down its long sides, and a pinnacle on each.)
  const n = Math.max(2, Math.round(hx / 9)), c = Math.cos(yaw), s = Math.sin(yaw);
  if (o.buttress !== false) for (let i = 0; i <= n; i++) for (const sd of [-1, 1]) {
    const lx = -hx + (2 * hx) * i / n, lz = sd * (hz + 1.4), bx = x + lx * c + lz * s, bz = z - lx * s + lz * c;
    K.box(layer, bx, y, bz, 1.2, h * 0.86, 1.4, yaw, { collide: false });
    K.spike(roof, bx, y + h * 0.86, bz, 1.3, 6 + h * 0.08, 4, yaw + Math.PI / 4);
  }
}

// ---------------------------------------------------------------- the city

const STREETS = PHOBOS.streets;
export const streetNear = (x, z) => {
  let best = 1e9, dir = 0, w = 4;
  for (const st of STREETS) for (let i = 0; i + 1 < st.pts.length; i++) {
    const d = segD(x, z, st.pts[i], st.pts[i + 1]);
    if (d < best) { best = d; w = st.w; dir = Math.atan2(-(st.pts[i + 1][1] - st.pts[i][1]), st.pts[i + 1][0] - st.pts[i][0]); }
  }
  return { d: best, dir, w };
};
const sloughD = (x, z) => { let d = 1e9; for (let i = 0; i + 1 < SLOUGH.length; i++) d = Math.min(d, segD(x, z, SLOUGH[i], SLOUGH[i + 1])); return d; };
// (Its walls are Phobos's own layers, ph_*: tools/phobos/textures/wire_layers.py. Never the village's house walls,
// wall_NN, which are half-timber for small parts of village homes: the owner's rule, 2026-11-16.)
// What each district is built of and how: lot (across, through), heights, how much of it is built, walls, roofs.
// (Roofs: each quarter in its own colours, palette swaps of the four roof tiles (materials.js STATIC: slate, blood, moss,
// umber, soot), so from the castle the city's quarters are told apart: the burnt one soot-black, the rich slate and his
// ox-blood, the market and the tanners old clay, the poor old tile gone black. No sage or pink: a toy town's.)
const LOOK = {
  // (Each quarter roofed in a colour and a stuff of its own, and built to a height of its own, so from over the roofs and from
  // the castle the city is ten districts and not one grey sea: the critics, 2026-11-20. Dark slate at the gate; burnt black;
  // the tenements' brown shingle, tall; the market's old clay; moss-green by the water; the dyers' olive; the Bone Yards
  // pale and low; the garrison's blue slate, a third of it his red; the Approach's ox-blood; the Rise's verdigris, tallest; the dukes' lead.)
  barbican: { lot: [14, 12], h: [9, 13], fill: 0.5, wall: ['ph_basalt', 'dark:block'], roof: ['slate:p2_slate_roof', 'slate:roof_2'], row: 3, alley: 6 },
  cinder: { lot: [9, 10], h: [4, 9], fill: 0.86, wall: ['ph_burnt_wall', 'ph_soot_brick', 'ph_burnt_wall', 'p2_char_planks'], roof: [null, null, 'p2_burnt_roof', 'char:roof_4', 'p2_burnt_roof'] },
  rookeries: { lot: [7, 9], h: [11, 20], fill: 0.97, wall: ['ph_poor_brick', 'ph_poor_brick', 'ph_soot_brick', 'ph_daub'], roof: ['umber:p2_shingle_roof', 'umber:p2_shingle_roof', 'umber:roof_4', 'p2_shingle_roof'], row: 5, alley: 2.4 },
  market: { lot: [8, 11], h: [9, 14], fill: 0.95, wall: ['ph_market_wall', 'ph_market_wall', 'ph_daub'], roof: ['blood:roof_1', 'umber:roof_1', 'blood:roof_1', 'umber:roof_2'], open: 48 },
  wharf: { lot: [16, 13], h: [6, 9], fill: 0.9, wall: ['ph_poor_brick', 'rubble', 'p2_tar_boards'], roof: ['moss:p2_shingle_roof', 'moss:roof_4', 'moss:p2_slate_roof'], row: 2 },
  tanners: { lot: [8, 10], h: [7, 11], fill: 0.94, wall: ['ph_daub', 'ph_poor_brick', 'ph_daub'], roof: ['mire:roof_3', 'mire:p2_shingle_roof', 'mire:roof_3', 'umber:roof_3'] },
  bones: { lot: [10, 13], h: [5, 8], fill: 0.3, wall: ['p2_bone_rubble', 'pale:stone', 'p2_bone_rubble'], roof: ['pale:p2_slate_roof', 'pale:roof_2'], row: 3, alley: 7 },
  barracks: { lot: [22, 11], h: [8, 10], fill: 0.9, wall: ['soot:block', 'slate:course'], roof: ['slate:roof_1', 'slate:roof_1', 'blood:p2_blood_tiles'], open: 62, row: 2, alley: 5 },
  mages: { lot: [11, 12], h: [12, 19], fill: 0.9, spireWall: 'slate:course', wall: ['slate:ph_dressed', 'ph_rich_brick', 'frost:course'], roof: ['p2_verdigris_roof', 'p2_verdigris_roof', 'frost:p2_slate_roof'], spires: 0.06, row: 3 },
  dukes: { lot: [15, 15], h: [11, 15], fill: 0.85, wall: ['slate:ph_dressed', 'ph_rich_brick'], roof: ['p2_lead_roof', 'p2_lead_roof', 'slate:p2_slate_roof', 'blood:p2_blood_tiles'], spires: 0.04, row: 2, alley: 5 },
  approach: { lot: [11, 12], h: [10, 15], fill: 0.85, wall: ['ph_granite', 'slate:ph_dressed'], roof: ['blood:p2_blood_tiles', 'dark:roof_2', 'blood:p2_blood_tiles'], row: 3 },
  other: { lot: [8, 10], h: [7, 12], fill: 0.93, wall: ['ph_market_wall', 'ph_poor_brick', 'ph_daub'], roof: ['p2_slate_roof', 'slate:roof_3', 'p2_slate_roof', 'soot:roof_4'] },
};
// The roofs of the district nearest (x, z), however far: what a house between districts is roofed in, so the quarters' colours
// run on to meet each other and there's no grey sea between them (the critics, 2026-11-20).
function roofsNear(x, z) {
  let best = null, q = 1e9;
  for (const d of PHOBOS.districts) { const k = Math.hypot(x - d.x, z - d.z) / d.r; if (k < q) { q = k; best = d.key; } }
  return LOOK[best].roof.filter(Boolean);
}
function districtAt(x, z) {
  let best = 'other', q = 1.3, at = null;
  for (const d of PHOBOS.districts) { const k = Math.hypot(x - d.x, z - d.z) / d.r; if (k < q) { q = k; best = d.key; at = d; } }
  return { key: best, d: at };
}

function wall(K) {
  const W = CITY_WALL, T = 12, H = 50, L = 'soot:ph_basalt';
  const gates = PHOBOS.gates.map((g) => [g.x, g.z]);
  // (Each side's top is level, at H over the highest ground along it, and walked: the wall-walk. Through every tower on it,
  // a doorway each side of the tower's room: src/core/phobos-towers.js, which builds the towers.)
  const TOP = wallTops();
  let top = 0;
  const run = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, yaw = Math.atan2(-uz, ux);
    if (len < 4) return;
    // (Its body from a corner's drum's room outward, not through it: where the two walks meeting there aren't at one
    // height, the higher's wall had stood in the room as a block, between the stair and the doorway to the lower walk, so
    // nothing went from one side of the city's wall to the next: tools/paths/map.mjs.)
    const trim = (p) => { const t = wallTowerAt(p[0], p[1]); return t && t.key.startsWith('corner') && Math.hypot(t.x - p[0], t.z - p[1]) < 1 ? towerInner(t) + 0.3 : 0; };
    const ta = Math.min(trim(a), len / 2), tb = Math.min(trim(b), len / 2);
    K.wall(L, a[0] + ux * ta, a[1] + uz * ta, b[0] - ux * tb, b[1] - uz * tb, T, H, { crenel: true, y: top - 0.06 - H, skip: (x, z) => !!wallTowerAt(x, z) });
    // (The walk stops inside each tower's doorway: its room's floor is the tower's.)
    const cuts = cityTowers().filter((t) => t.kind === 'wall' && segD(t.x, t.z, a, b) < 3).map((t) => { const p = (t.x - a[0]) * ux + (t.z - a[1]) * uz, w = towerInner(t) - 0.3; return [p - w, p + w]; }).sort((p, q) => p[0] - q[0]);
    let u0 = -1;
    for (const [c0, c1] of [...cuts, [len + 1, len + 1]]) {
      const u1 = Math.min(c0, len + 1);
      if (u1 - u0 > 0.2) { const m = (u0 + u1) / 2; walk(K, [[a[0] + ux * m, a[1] + uz * m, (u1 - u0) / 2, T / 2, yaw, top]]); }
      u0 = Math.max(u0, c1);
    }
  };
  for (let i = 0; i < 12; i++) {
    const a = W[i], b = W[(i + 1) % 12], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    top = TOP[i];
    // (A gate on this side: the wall stops 10 m either side of it, a gatehouse stands in the gap, and the walk goes on
    // across the gate's head and through both its towers.)
    const g = gates.find((q) => segD(q[0], q[1], a, b) < 12);
    if (g) {
      const t = (g[0] - a[0]) * ux + (g[1] - a[1]) * uz;
      run(a, [a[0] + ux * (t - 10), a[1] + uz * (t - 10)]); run([a[0] + ux * (t + 10), a[1] + uz * (t + 10)], b);
      const gx = a[0] + ux * t, gz = a[1] + uz * t, gy = Y(gx, gz), yw = Math.atan2(-uz, ux);
      // (Over the way in: the gate's head, and his red down it. Through it at the walk's height a passage from the one
      // tower's doorway to the other's, its sides stopping you.)
      { const WAY = 2.2, sw = (10 - WAY) / 2;
        K.box(L, gx, gy + 16, gz, 9, top - 0.06 - gy - 16, 10, yw, { collide: false });
        if (gy + 78 > top + 3.4) K.box(L, gx, top + 3.4, gz, 9, gy + 78 - top - 3.4, 10, yw, { collide: false });
        for (const s of [-1, 1]) {
          const cx = gx - uz * s * (WAY + sw), cz = gz + ux * s * (WAY + sw);
          K.box(L, cx, top - 0.06, cz, 9, 3.46, sw, yw, { collide: false });
          K.colliders.push({ x: cx, z: cz, hx: 9, hz: sw, yaw: yw, h: top + 3.4 - Y(cx, cz), b: top - 1, t: top + 3.4 });
        }
        walk(K, [[gx, gz, 12, WAY + 0.1, yw, top]]); }
      hangBanner(K, gx - uz * 10.3, gy + 74, gz + ux * 10.3, [-uz, ux], 9, 50, 6); hangBanner(K, gx + uz * 10.3, gy + 74, gz - ux * 10.3, [uz, -ux], 9, 50, 6);
      // (The portcullis, wound up into the head all but its teeth, on the outer face; iron.)
      { const o = (uz * (gx - CITY.x) - ux * (gz - CITY.z)) > 0 ? 1 : -1, nx = uz * o, nz = -ux * o, px = gx + nx * 9.4, pz = gz + nz * 9.4, yw = Math.atan2(-uz, ux);
        for (let b = -7.6; b <= 7.61; b += 0.95) K.box('iron', px + ux * b, gy + 12.6, pz + uz * b, 0.09, 3.6, 0.09, yw, { collide: false });
        for (const y of [13.4, 15.2]) K.box('iron', px, gy + y, pz, 7.7, 0.12, 0.08, yw, { collide: false });
        for (let b = -7.6; b <= 7.61; b += 0.95) K.box('iron', px + ux * b, gy + 12.2, pz + uz * b, 0.05, 0.42, 0.05, yw + 0.785, { collide: false });
        GATE_FACE.push({ x: gx, z: gz, nx, nz, ux, uz, y: gy }); }
    } else run(a, b);
    // (A great drum at each corner, a stair inside it from the lower of the two walks that meet there to the higher; two at
    // each gate; a lesser tower every 100 m or so between: src/core/phobos-towers.js wallTowers.)
  }
  // The ways up onto it: a stair inside the wall beside the Drawbridge Gate (south of it) and one beside the Castle Gate
  // (north of it), from the street to the walk.
  { const fx = CITY.x - CITY.a + T / 2, zc = 70; stairs(K, L, fx, zc, Y(fx + 8, zc), TOP[5], 1); }
  { const fx = CITY.x + CITY.a - T / 2, zc = -70; stairs(K, L, fx, zc, Y(fx - 8, zc), TOP[11], -1); }
  // The barbican outside the Drawbridge Gate: two towers (src/core/phobos-towers.js) and a yard wall past the moat, and the
  // bridge's deck over it.
  // The Drawbridge: a deck of planks on stone over the moat (which runs under it: src/core/east.js gateWay), from the far
  // bank to the gate. An abutment of dressed stone at each end and a pier in the water between; the near twenty metres
  // are the leaf that lifts (lighter planks, two iron straps, and the chains from its far end up into the gate's head); a
  // rail of posts down both sides, which stops you. Walked: a deck at its own height, rising gently from bank to gate.
  { const g = GATE_FACE.find((q) => Math.abs(q.z) < 30 && q.x < CITY.x), x0 = g.x + g.nx * 10 + 1.5, xa = CITY.x - CITY.a * 1.09 - 3, x1 = x0 - 21.5;
    const yA = Y(xa - 1, 0) + 0.1, yB = Math.max(Y(x0 + 1, 0), Y(x0 + 4, 0), Y(x0 + 8, 0)) + 0.1, dy = (x) => yA + (yB - yA) * Math.max(0, Math.min(1, (x - xa) / (x0 - xa)));
    const rects = [];
    for (let x = xa; x < x0 - 0.01; x += 4) { const e = Math.min(x + 4, x0); rects.push([(x + e) / 2, 0, (e - x) / 2 + 0.02, 4.85, 0, dy((x + e) / 2)]); }
    walk(K, rects);
    for (let x = xa + 0.4; x < x0; x += 0.8) K.box(x < x1 ? 'dark:wood' : 'wood', x, dy(x) - 0.16, 0, 0.36, 0.16, 4.7, 0, { collide: false });
    K.box('dark:wood', x1, dy(x1) - 0.1, 0, 0.25, 0.22, 4.9, 0, { collide: false });
    for (const s of [-2.6, 2.6]) K.box('iron', (x0 + x1) / 2, dy((x0 + x1) / 2) + 0.01, s, 10.6, 0.03, 0.12, 0, { collide: false });
    for (const s of [-4.4, 4.4]) K.beam('iron', [x1 + 0.4, dy(x1) + 0.2, s], [x0 - 1.3, g.y + 14.5, s], 0.09);
    // (Under it: the stone it stands on, down to the ditch's floor.)
    const fl = PLAIN - 10;
    for (const [cx, hx] of [[xa + 2.5, 2.6], [x0 - 2.2, 2.3], [(xa + x1) / 2, 1.3]]) K.box('ph_basalt', cx, fl, 0, hx, dy(cx) - 0.3 - fl, 5.3, 0, { collide: false });
    for (let x = xa + 1; x < x1 - 1; x += 2.5) for (const s of [-4.9, 4.9]) K.box('dark:wood', x, dy(x) - 0.3, s, 0.12, 1.45, 0.12, 0, { collide: false });
    for (const s of [-4.9, 4.9]) { K.beam('dark:wood', [xa + 1, dy(xa) + 1.05, s], [x1 - 1, dy(x1) + 1.05, s], 0.07); K.beam('dark:wood', [xa + 1, dy(xa) + 0.55, s], [x1 - 1, dy(x1) + 0.55, s], 0.05);
      K.collide((xa + x0) / 2, s * 1.03, (x0 - xa) / 2, 0.15, 0, yB + 1.2); } }
  waters(K);
}
const GATE_FACE = [];
// Water in the moat and the Slough (src/core/east.js cuts both): a sheet over each, three metres and more over the ditch's
// floor at its middle, so it meets the banks wherever they are; left out at the gates' causeways and the Slough's bridges.
const moatAt = (th, k) => { let m = 0; for (let j = 0; j < 12; j++) m = Math.max(m, Math.cos(th - j * Math.PI / 6)); const r = k / m; return [CITY.x + CITY.a * r * Math.cos(th), CITY.z + CITY.b * r * Math.sin(th)]; };
// Water lies level. The moat's ditch climbs with the ground round the city, from the plain by the Drawbridge Gate up toward
// the castle's crag, and the Slough's bed runs over a rise in the city's middle: so each is a string of level reaches, a
// weir of dark stone across the ditch wherever the bed has climbed out of the reach below, the water falling over it; and
// where there's no ditch to hold any (the bed no lower than a bank: the crag's side of the ring) it's dry. (It was one
// sheet following the ground: water lying up a hillside. The owner, 2026-11-17: "fixing the water".)
// A run of beds [{ bed, bank }] walked from its lowest: each one's level (the reach it's in), or null where it's dry.
const DEPTH = 2.4, SHALLOW = 0.7;
function reaches(run, from) {
  const lv = new Array(run.length).fill(null);
  for (const dir of [1, -1]) {
    let L = null;
    for (let i = from; i >= 0 && i < run.length; i += dir) {
      const { bed, bank, skip } = run[i];
      if (skip) { lv[i] = null; continue; }                         // (filled in under a street that crosses: no water, the reach goes on past)
      if (L === null || bed > L - SHALLOW) L = bed + DEPTH;          // (climbed out of the reach below: a weir, and a new reach)
      // (Kept under its banks. Where there's no ditch, no water: and whatever's beyond starts a reach of its own.)
      if (bank < L + 0.25) { if (bank - bed < SHALLOW + 0.4) { L = null; continue; } L = bank - 0.25; }
      lv[i] = L;
    }
  }
  return lv;
}
const MOAT_N = 720;
let MOAT = null;
function moatRing() {
  if (MOAT) return MOAT;
  const ring = [];
  for (let i = 0; i < MOAT_N; i++) {
    const th = i / MOAT_N * TAU, [cx, cz] = moatAt(th, 1.047), a = moatAt(th, 1.016), b = moatAt(th, 1.08), oa = moatAt(th, 1.006), ob = moatAt(th, 1.09);
    ring.push({ th, a, b, bed: Y(cx, cz), bank: Math.min(Y(...oa), Y(...ob)) });
  }
  // (Walked both ways from its lowest, out on the plain; each way stops where the ditch runs out.)
  let low = 0; for (let i = 1; i < MOAT_N; i++) if (ring[i].bed < ring[low].bed) low = i;
  const turned = ring.slice(low).concat(ring.slice(0, low)), half = MOAT_N >> 1;
  const fwd = reaches(turned.slice(0, half), 0), back = reaches(turned.slice(half).reverse(), 0).reverse();
  turned.forEach((q, i) => { q.lv = i < half ? fwd[i] : back[i - half]; });
  return (MOAT = ring);
}
// The moat's water's height over (x, z), r metres round it allowed for; -Infinity if it's nowhere near, or dry there. (The
// barbican's towers stand on its bank and its sheet ran through their ground floor: src/core/phobos-towers.js plan.)
export function moatLevel(x, z, r = 0) {
  const u = (x - CITY.x) / CITY.a, v = (z - CITY.z) / CITY.b, th = Math.atan2(v, u);
  let m = 0; for (let j = 0; j < 12; j++) m = Math.max(m, Math.cos(th - j * Math.PI / 6));
  const k = Math.hypot(u, v) * m, pad = r / Math.min(CITY.a, CITY.b);
  if (k < 1.016 - pad || k > 1.08 + pad) return -Infinity;
  const ring = moatRing(), i = Math.round(((th + TAU) % TAU) / TAU * MOAT_N) % MOAT_N;
  let most = -Infinity;
  for (let d = -3; d <= 3; d++) { const lv = ring[(i + d + MOAT_N) % MOAT_N].lv; if (lv !== null && lv > most) most = lv; }
  return most;
}
// The Slough's stretches, eight metres each, down the city from its rise: each one's ends (p, q), which way it runs, its
// bed and lower bank, whether a street crosses there (skip) or it's out past the wall (out), and its water's level (lv:
// the reach it's in; null where there's none).
const SLOUGH_W = 10.5;
let SLOUGH_RUN = null;
export function sloughRun() {
  if (SLOUGH_RUN) return SLOUGH_RUN;
  // The Slough, down the city from its rise: reaches the same way, a weir at each step, running on under its bridges.
  const w = SLOUGH_W, run = [];
  const over = STREETS.filter((st) => st.name !== 'The Corpse Quay');
  const bridge = (x, z) => over.some((st) => st.pts.some((q, j) => j + 1 < st.pts.length && segD(x, z, q, st.pts[j + 1]) < st.w + 8));
  for (let i = 0; i + 1 < SLOUGH.length; i++) {
    const A = SLOUGH[i], B = SLOUGH[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L, n = Math.ceil(L / 8);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n * L, x = A[0] + ux * t, z = A[1] + uz * t, t0 = k / n * L, t1 = (k + 1) / n * L;
      run.push({ p: [A[0] + ux * t0, A[1] + uz * t0], q: [A[0] + ux * t1, A[1] + uz * t1], ux, uz, bed: Y(x, z), bank: Math.min(Y(x - uz * 15, z + ux * 15), Y(x + uz * 15, z - ux * 15)), out: cityIn(x, z) > 1.012, skip: bridge(A[0] + ux * t0, A[1] + uz * t0) || bridge(A[0] + ux * t1, A[1] + uz * t1) });
    }
  }
  let top = 0; for (let i = 1; i < run.length; i++) if (run[i].bed > run[top].bed) top = i;
  // (From its head both ways downhill: each stretch's level is its reach's, set from the low end up.)
  const lvN = reaches(run.slice(0, top + 1), 0), lvS = reaches(run.slice(top).reverse(), 0).reverse();
  run.forEach((r, i) => { r.lv = i <= top ? lvN[i] : lvS[i - top]; });
  return (SLOUGH_RUN = run);
}
// A weir: a wall of dark stone across a ditch from one bank's point to the other's, its top a hand under the upper reach,
// and the water over it down to the lower.
function weir(K, a, b, hi, lo, bed) {
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  K.box('dark:block', mx, bed - 0.6, mz, L / 2 + 0.6, hi - 0.08 - (bed - 0.6), 0.5, yaw, { collide: false });
  for (const sd of [-1, 1]) {
    const nx = -(b[1] - a[1]) / L * sd * 0.52, nz = (b[0] - a[0]) / L * sd * 0.52, P = (q, y) => [q[0] + nx, y, q[1] + nz];
    K.quad('water', sd > 0 ? P(a, hi) : P(b, hi), sd > 0 ? P(b, hi) : P(a, hi), sd > 0 ? P(b, lo) : P(a, lo), sd > 0 ? P(a, lo) : P(b, lo), [nx / 0.52, 0, nz / 0.52]);
  }
}
function waters(K) {
  const gw = (x, z) => (Math.abs(z) < 19 && x - CITY.x > 600) || (Math.abs(x - 9900) < 19 && z < -700) || (Math.abs(x - 9950) < 19 && z > 700);
  const ring = moatRing();
  // (Every other of the ring's points to a quad, but where the level changes: the sheet's corners on its own reach.)
  for (let i = 0; i < MOAT_N; i += 2) {
    const p = ring[i], q = ring[(i + 2) % MOAT_N], m = ring[(i + 1) % MOAT_N];
    if (p.lv === null || q.lv === null || m.lv === null) continue;
    if (gw(...p.a) || gw(...p.b) || gw(...q.a) || gw(...q.b)) continue;
    if (Math.abs(p.lv - q.lv) > 0.01) { const hi = Math.max(p.lv, q.lv), lo = Math.min(p.lv, q.lv); weir(K, m.a, m.b, hi, lo, m.bed); }
    const [e0, e1] = Math.abs(p.lv - q.lv) > 0.01 ? [[p, m, p.lv], [m, q, q.lv]] : [[p, q, p.lv]];
    for (const [u, v, y] of [e0, e1].filter(Boolean)) K.quad('dark:water', [u.a[0], y, u.a[1]], [v.a[0], y, v.a[1]], [v.b[0], y, v.b[1]], [u.b[0], y, u.b[1]], [0, 1, 0]);
  }
  // Two footbridges over the Slough where no street crosses it: a deck of planks on two stone piers, a low kerb each side
  // (no posts, no rails across). Walked: a deck over the water (walk).
  for (const zc of [-390, 180]) {
    const r0 = sloughRun().find((q) => !q.skip && q.lv !== null && Math.abs((q.p[1] + q.q[1]) / 2 - zc) < 5);
    if (!r0) continue;
    const mx = (r0.p[0] + r0.q[0]) / 2, mz = (r0.p[1] + r0.q[1]) / 2, { ux, uz } = r0, th = Math.atan2(-uz, ux), half = 16.5;
    const y = Math.min(Y(mx - uz * 15.5, mz + ux * 15.5), Y(mx + uz * 15.5, mz - ux * 15.5)) + 0.3;
    K.box('dark:wood', mx, y - 0.35, mz, 1.4, 0.35, half, th, { collide: false });
    for (const e of [-1, 1]) { K.box('dark:wood', mx + ux * e * 1.4, y, mz + uz * e * 1.4, 0.1, 0.35, half, th, { collide: false }); K.box('soot:ph_basalt', mx - uz * e * 6, r0.lv - 1.5, mz + ux * e * 6, 1.4, y - 0.35 - r0.lv + 1.5, 0.7, th, { collide: false }); }
    walk(K, [[mx, mz, 1.4, half, th, y]]);
  }
  // The Slough: its reaches (sloughRun), a weir at each step, none under the streets that cross it.
  const run = sloughRun(), w = SLOUGH_W;
  for (let i = 0; i < run.length; i++) {
    const r = run[i], { p, q, ux, uz, lv } = r;
    if (lv === null || r.out) continue;
    K.quad('mire:water', [p[0] - uz * w, lv, p[1] + ux * w], [q[0] - uz * w, lv, q[1] + ux * w], [q[0] + uz * w, lv, q[1] - ux * w], [p[0] + uz * w, lv, p[1] - ux * w], [0, 1, 0]);
    const nx = run[i + 1];
    if (nx && nx.lv !== null && !nx.out && Math.abs(nx.lv - lv) > 0.01) weir(K, [q[0] - uz * w, q[1] + ux * w], [q[0] + uz * w, q[1] - ux * w], Math.max(lv, nx.lv), Math.min(lv, nx.lv), Math.max(r.bed, nx.bed) - 1);
  }
}

// The city's houses, laid out once: each { x, z, yaw, hx, hz, h, wall, roof, front, cell } (or a mage's tower: spire, r).
// Not houses stood apart but blocks of them, two rows back to back sharing their party walls, a slit of yard between,
// their doors on the alleys three metres wide between one block and the next. Each district's blocks lie on a grid turned
// its own way, so where two districts meet the alleys kink and dead-end: the labyrinth. Then the streets' own frontages:
// down both sides of every named street houses stand shoulder to shoulder, facing it; the King's Mile's the tallest.
export const CELL = 100;
export const cellOf = (x, z) => `${Math.floor((x - 9300) / CELL)}_${Math.floor((z + 850) / CELL)}`;
let HOUSES = null;
export function phobosHouses() {
  if (HOUSES) return HOUSES;
  const out = [], inRamp = (x, z) => x > 10430 && Math.abs(z) < 48;
  // (No house stands in another: where two districts' grids meet, or a street bends, the first laid keeps its ground.
  // Separating axes: two turned rects overlap unless one of their four edge directions parts them, a hand's breadth allowed.)
  const grid = new Map(), gk = (x, z) => `${Math.floor(x / 30)}_${Math.floor(z / 30)}`;
  const span = (h, ax, az) => { const c = Math.cos(h.yaw || 0), s = Math.sin(h.yaw || 0), m = h.x * ax + h.z * az, e = Math.abs(h.hx * (c * ax - s * az)) + Math.abs(h.hz * (s * ax + c * az)); return [m - e, m + e]; };
  const hits = (a, b) => [a, b].every((h) => { const c = Math.cos(h.yaw || 0), s = Math.sin(h.yaw || 0); return [[c, -s], [s, c]].every(([ax, az]) => { const [a0, a1] = span(a, ax, az), [b0, b1] = span(b, ax, az); return Math.min(a1, b1) - Math.max(a0, b0) > 0.15; }); });
  // (A yard into every cell it reaches: some are a hall's length.)
  const yard = (o) => { const R = Math.hypot(o.hx, o.hz); for (let i = Math.floor((o.x - R) / 30); i <= Math.floor((o.x + R) / 30); i++) for (let j = Math.floor((o.z - R) / 30); j <= Math.floor((o.z + R) / 30); j++) (grid.get(`${i}_${j}`) || grid.set(`${i}_${j}`, []).get(`${i}_${j}`)).push(o); };
  const clear = (o) => { const kx = Math.floor(o.x / 30), kz = Math.floor(o.z / 30); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of grid.get(`${kx + a}_${kz + b}`) || []) if (hits(o, q)) return false; return true; };
  const put = (o) => {
    if (o.spire && (inHub(o.x, o.z, o.r + 1) || inSealSquare(o.x, o.z, o.r + 1))) return;
    if (!o.spire) {
      // (And the step before its door kept clear, so it opens on to the street or the alley and not a neighbour's wall.)
      const apron = o.roof ? { x: o.x + o.front * (o.hz + 0.7) * Math.sin(o.yaw), z: o.z + o.front * (o.hz + 0.7) * Math.cos(o.yaw), yaw: o.yaw, hx: DOOR + 0.3, hz: 0.7, yard: true } : null;
      if (!clear(o) || (apron && !clear(apron))) return;
      (grid.get(gk(o.x, o.z)) || grid.set(gk(o.x, o.z), []).get(gk(o.x, o.z))).push(o);
      if (apron) yard(apron);
    } else {
      // (A spire's ground, and the ground before its door, kept: it's gone into, src/core/phobos-towers.js.)
      const s = Math.sin(o.yaw), c = Math.cos(o.yaw), f = o.front, d = o.r + 1.4;
      const own = [{ x: o.x, z: o.z, yaw: o.yaw, hx: o.r + 0.2, hz: o.r + 0.2, yard: true }, { x: o.x + f * d * s, z: o.z + f * d * c, yaw: o.yaw, hx: DOOR + 0.8, hz: 1.4, yard: true }];
      if (!own.every(clear)) return;
      own.forEach(yard);
    }
    o.cell = cellOf(o.x, o.z); out.push(o);
  };
  // (And the landmarks' towers, the ground before their doors, and the blocks they stand by: src/core/phobos-towers.js.)
  for (const y of towerYards()) yard(y);
  // (The hubs' halls first, and their yards kept clear: a yard's a rect no city house may stand in.)
  for (const hb of HUBS) (grid.get(gk(hb.x, hb.z)) || grid.set(gk(hb.x, hb.z), []).get(gk(hb.x, hb.z))).push({ x: hb.x, z: hb.z, yaw: hb.yaw, hx: hb.hx + 1, hz: hb.hz + 1, yard: true });
  for (const o of hubHouses()) { o.cell = cellOf(o.x, o.z); out.push(o); }
  // (And the seals' squares: src/core/phobos-seals.js.)
  for (const s of PHOBOS_SEALS) (grid.get(gk(s.x, s.z)) || grid.set(gk(s.x, s.z), []).get(gk(s.x, s.z))).push({ x: s.x, z: s.z, yaw: s.yaw, hx: SEAL_SQUARE + 0.5, hz: SEAL_SQUARE + 0.5, yard: true });
  // (And the sewers' mouths: src/core/delve-sewers.js.)
  // (And a lane out from each the way it faces, so it's come to from the street and not through a house: the houses' doors
  // are shut now, and a row of them stood twenty metres before the Slough Mains and the Charnel Runs.)
  for (const s of SEWER_MOUTHS) {
    (grid.get(gk(s.x, s.z)) || grid.set(gk(s.x, s.z), []).get(gk(s.x, s.z))).push({ x: s.x, z: s.z, yaw: s.yaw, hx: MOUTH_SQUARE, hz: MOUTH_SQUARE, yard: true });
    const d = MOUTH_SQUARE + 9;
    yard({ x: s.x + Math.sin(s.yaw) * d, z: s.z + Math.cos(s.yaw) * d, yaw: s.yaw, hx: 8, hz: 9, yard: true });
  }
  const zones = [...PHOBOS.districts.map((d, i) => ({ key: d.key, x: d.x, z: d.z, r: d.r * 1.35, turn: (hash2(i, 77) - 0.5) * 1.5 })), { key: 'other', x: CITY.x, z: CITY.z, r: 900, turn: 0.31 }];
  for (const zn of zones) {
    const S = LOOK[zn.key], [uw, ud] = S.lot, n = S.row || 4, ALLEY = S.alley || 3, YARD = 2;
    const bw = n * uw + ALLEY, bd = 2 * ud + YARD + ALLEY, c = Math.cos(zn.turn), sn = Math.sin(zn.turn);
    const N = Math.ceil(zn.r / Math.min(bw, bd));
    for (let bi = -N; bi <= N; bi++) for (let bj = -N; bj <= N; bj++) {
      // (Every other row of blocks is slid half a block along, so no alley runs straight for long.)
      const lu = bi * bw + (bj & 1) * bw * 0.5, lv = bj * bd;
      for (let row = 0; row < 2; row++) for (let k = 0; k < n; k++) {
        const u = lu + (k + 0.5 - n / 2) * uw, v = lv + (row ? 1 : -1) * (ud + YARD) * 0.5;
        const x = zn.x + u * c + v * sn, z = zn.z - u * sn + v * c;
        if (districtAt(x, z).key !== zn.key || cityIn(x, z) > 0.965 || inRamp(x, z)) continue;
        const id = bi * 131 + bj * 17 + row * 7 + k, hsh = hash2(id, bi - bj);
        if (hash2(bi * 3 + k, bj * 5 + row) > S.fill) continue;
        const st = streetNear(x, z);
        if (st.d < st.w + (st.w > 5 ? 14.5 : 11.5) + Math.hypot(uw, ud) * 0.5 || sloughD(x, z) < 13 + ud * 0.5) continue;
        if (S.open && Math.hypot(x - zn.x, z - zn.z) < S.open) continue;
        const pick = (a) => a[Math.floor(hash2(id + 5, k) * a.length) % a.length];
        // (One block in eight stands half as tall again.)
        const h = (S.h[0] + (S.h[1] - S.h[0]) * hsh) * (hash2(bi * 5 + 1, bj * 3 + row) < 0.1 ? 1.45 : 1);
        // (A spire's door on the alley its row's doors are on: src/core/phobos-towers.js.)
        if (S.spires && hash2(id, 3) < S.spires) { put({ spire: true, x, z, r: Math.min(uw, ud) * 0.42, h: 26 + hsh * 34, wall: S.spireWall || pick(S.wall), yaw: zn.turn, front: row ? 1 : -1 }); continue; }
        // (Its door's in the long side that looks out on the alley, not the one on the yard.)
        put({ x, z, yaw: zn.turn, hx: uw * 0.5 + 0.02, hz: ud * 0.5, h, wall: pick(S.wall), roof: zn.key === 'other' ? pick(roofsNear(x, z)) : pick(S.roof), front: row ? 1 : -1, dk: zn.key });
      }
    }
  }
  for (const st of STREETS) {
    const spine = st.w > 5, uw = spine ? 7 : 6.5, ud = spine ? 12 : 10;
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(-uz, ux), n = Math.floor(L / uw);
      for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
        // (Each a house of its own: no two fronts in one line, or one height.)
        const t = (k + 0.5) * uw + (L - n * uw) / 2, off = st.w + ud / 2 + 0.6 + hash2(i * 17 + k, sd + 3) * 0.9;
        const x = a[0] + ux * t - uz * off * sd, z = a[1] + uz * t + ux * off * sd;
        if (cityIn(x, z) > 0.955 || inRamp(x, z) || sloughD(x, z) < 12 + ud * 0.5) continue;
        // (Not where another street crosses, nor in a district's open ground.)
        if (STREETS.some((o) => o !== st && o.pts.some((q, j) => j + 1 < o.pts.length && segD(x, z, q, o.pts[j + 1]) < o.w + ud * 0.6))) continue;
        const { key, d } = districtAt(x, z), S = LOOK[key];
        if (S.open && d && Math.hypot(x - d.x, z - d.z) < S.open) continue;
        const v = hash2(i * 31 + k, sd + 7), h = spine ? 9.5 + 6 * v + 3 * Math.min(1, Math.max(0, (x - 9400) / 1200)) : S.h[0] + (S.h[1] - S.h[0]) * v;
        // (Local +z is (-uz, ux): the house on that side of the street has its door in its -z side, toward the street.)
        put({ x, z, yaw, hx: uw * 0.5 + 0.02, hz: ud * 0.5, h, wall: S.wall[Math.floor(v * 97) % S.wall.length], roof: (key === 'other' ? ((a) => a[Math.floor(v * 53) % a.length])(roofsNear(x, z)) : S.roof[Math.floor(v * 53) % S.roof.length]) || (spine ? 'dark:roof_2' : null), front: -sd, shop: true, spine, dk: key });
      }
    }
  }
  // (Each roofed house's door its own number, the house's place in the list: src/items/phobos-doors.js. A spire's is the
  // towers': 20000 on.)
  out.forEach((h, i) => { if (h.roof && !h.spire) h.door = i; });
  // (And what each is, by its district and a number of its own; the one-off houses marked. src/core/phobos-houses.js.)
  for (const h of out) if (h.hub) h.dk ||= districtAt(h.x, h.z).key;
  styleHouses(out);
  HOUSES = out;
  return out;
}
const byCell = () => { const m = new Map(); for (const h of phobosHouses()) (m.get(h.cell) || m.set(h.cell, []).get(h.cell)).push(h); return m; };
// The far view of all of them, a group to each cell (src/core/sites.js Kit.group), so the renderer can fold a cell's away
// when it has the near view of it up (src/gfx/phobos-near.js); and what stops a body at each, which never changes.
// (The mages' spires are the towers': src/core/phobos-towers.js.)
function districts(K) {
  for (const [cell, list] of byCell()) K.group('ph:' + cell, true, () => { for (const h of list) if (!h.spire) houseFar(K, h); });
  // (The toll-houses on the Slough's two footbridges, src/core/phobos-houses.js: each in its cell's group, as a house is.)
  if (!K.lean) for (const b of footbridges()) K.group('ph:' + cellOf(b.x, b.z), true, () => bridgeHouse(K, b, true));
}
// Where the Slough's two footbridges are (waters, above, builds them): { x, z, y (the deck), th (its yaw), ux, uz }.
let FOOT = null;
function footbridges() {
  if (FOOT) return FOOT;
  FOOT = [];
  for (const zc of [-390, 180]) {
    const r0 = sloughRun().find((q) => !q.skip && q.lv !== null && Math.abs((q.p[1] + q.q[1]) / 2 - zc) < 5);
    if (!r0) continue;
    const mx = (r0.p[0] + r0.q[0]) / 2, mz = (r0.p[1] + r0.q[1]) / 2, { ux, uz } = r0;
    FOOT.push({ x: mx, z: mz, y: Math.min(Y(mx - uz * 15.5, mz + ux * 15.5), Y(mx + uz * 15.5, mz - ux * 15.5)) + 0.3, th: Math.atan2(-uz, ux), ux, uz });
  }
  return FOOT;
}
// One cell's houses as they are from near (houseNear), and what lines its streets: built when you come within a street or
// two of it, by the renderer. Nothing here stops a body: that's all in the far view's build.
// The street lamps: a lantern on a post every 22 m down each side of every named street, turn about; iron on the King's Mile.
let LAMPS = null;
// The ways the street crowd walks (src/folk/brain.js roam): down each side of every named street, on its sidewalk, a point
// every 4 m, broken where the street leaves the city, runs up to the castle, or comes within a haunt's `clear` of where
// the dead or the Loyal keep (src/core/east.js HAUNTS). [{ pts: [[x, z], ...], name, sd }], each of a few points at least;
// sd: which side of the street (the street's middle is that way of the lane, turned from its run).
let LANES = null;
export function phobosLanes() {
  if (LANES) return LANES;
  LANES = [];
  const ok = (x, z) => cityIn(x, z) < 0.95 && !(x > 10440 && Math.abs(z) < 60) && HAUNTS.every((h) => Math.hypot(x - h.x, z - h.z) > h.clear);
  for (const st of STREETS) for (const sd of [-1, 1]) {
    const off = st.w - (st.w > 5 ? 1.6 : 1.3);
    let run = [];
    const end = () => { if (run.length >= 5) LANES.push({ pts: run, name: st.name, sd }); run = []; };
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, n = Math.max(1, Math.round(L / 4));
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n * L, x = a[0] + ux * t - uz * off * sd, z = a[1] + uz * t + ux * off * sd;
        if (ok(x, z)) run.push([+x.toFixed(2), +z.toFixed(2)]); else end();
      }
    }
    end();
  }
  return LANES;
}
// (On the King's Mile and the other wide streets, one every 11 m, turn about, so each side has one every 22: it's lit
// down its length at night, not a black canyon with a lamp at the far end.)
export function phobosLamps() {
  if (LAMPS) return LAMPS;
  LAMPS = [];
  for (const st of STREETS) for (let i = 0; i + 1 < st.pts.length; i++) {
    const gap = st.w > 5 ? 11 : 22, a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, n = Math.floor(L / gap);
    for (let k = 0; k < n; k++) {
      const sd = (k + i) % 2 ? 1 : -1, t = (k + 0.5) * gap, off = st.w - 0.5, x = a[0] + ux * t - uz * off * sd, z = a[1] + uz * t + ux * off * sd;
      if (cityIn(x, z) > 0.97 || sloughD(x, z) < 6 || inSealSquare(x, z, 1)) continue;
      LAMPS.push({ x, z, yaw: Math.atan2(-uz, ux) + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), iron: st.w > 5, cell: cellOf(x, z) });
    }
  }
  return LAMPS;
}
// The wide streets' lamps: heavier than a lane's, which from down the street is a speck. A dark stone foot, an iron post,
// a braced bracket, and a cage of four bars round a fire with panes that light up as the day goes, a cap over it.
function streetLamp(K, x, z, hh, yaw) {
  const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), ax = x + c * 0.62, az = z - s * 0.62, y0 = y + hh - 1.15, y1 = y + hh - 0.3;
  K.drum('dark:stone', x, y - 0.2, z, 0.3, 0.95, 6, { r2: 0.22, collide: false });
  K.box('iron', x, y + 0.7, z, 0.08, hh - 0.7, 0.08, yaw, { collide: false });
  K.collide(x, z, 0.2, 0.2, 0, y + hh);
  K.beam('iron', [x, y + hh - 0.08, z], [ax, y + hh - 0.08, az], 0.06);
  K.beam('iron', [x, y + hh - 0.75, z], [x + c * 0.36, y + hh - 0.1, z - s * 0.36], 0.035);
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box('iron', ax + (u * c + v * s) * 0.17, y0, az + (-u * s + v * c) * 0.17, 0.022, y1 - y0, 0.022, yaw, { collide: false });
  K.drum('iron', ax, y0 - 0.06, az, 0.21, 0.08, 4, { turn: Math.PI / 4 - yaw, collide: false });
  K.cone('iron', ax, y1, az, 0.3, 0.28, 4, Math.PI / 4 - yaw);
  for (const [u, v, nu, nv] of [[0, -1, 0, -1], [1, 0, 1, 0], [0, 1, 0, 1], [-1, 0, -1, 0]]) {
    const px = ax + (u * c + v * s) * 0.15, pz = az + (-u * s + v * c) * 0.15, tx = (v * c - u * s) * 0.15, tz = (-v * s - u * c) * 0.15, N = [nu * c + nv * s, 0, -nu * s + nv * c];
    K.quad('eve:flame', [px - tx, y0 + 0.05, pz - tz], [px + tx, y0 + 0.05, pz + tz], [px + tx, y1 - 0.05, pz + tz], [px - tx, y1 - 0.05, pz - tz], N);
  }
  K.cone('flame', ax, y0 + 0.05, az, 0.08, 0.32, 4);
}
// The crag's cells: the castle's own from-near detail (castleNear) is built a cell at a time as the city's houses are,
// so it's on the GPU only while you're up there, and never in the land's one buffer (tests/sites-lean.test.mjs). What
// stops a body among it is in phobosCastle's build, from the start.
export const CASTLE_CELLS = (() => {
  const s = new Set();
  for (let x = CRAG.x - CRAG.a; x <= CRAG.x + CRAG.a + 1; x += CELL / 2) for (let z = CRAG.z - CRAG.b; z <= CRAG.z + CRAG.b + 1; z += CELL / 2) s.add(cellOf(x, z));
  return s;
})();
const inCell = (cell, x, z) => cellOf(x, z) === cell;
// The city wall from near: a pilaster every eighteen metres, its own stone less sooted; a heavy course along the foot of
// each bay and two slits up it, both faces. (Far off it's the land's plain wall: this, round the whole of it, would cost the
// land's budget twice over.) wallBays(): where each pilaster stands, clear of the gates.
let BAYS = null;
function wallBays() {
  if (BAYS) return BAYS;
  const W = CITY_WALL, gates = PHOBOS.gates.map((g) => [g.x, g.z]);
  BAYS = [];
  for (let i = 0; i < 12; i++) {
    const a = W[i], b = W[(i + 1) % 12], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
    let top = -Infinity; for (let k = 0; k <= 40; k++) top = Math.max(top, Y(a[0] + (b[0] - a[0]) * k / 40, a[1] + (b[1] - a[1]) * k / 40));
    for (let t = 16, k = 0; t < len - 16; t += 11 + 3 * hash2(i * 41 + k++, 61)) {
      const x = a[0] + ux * t, z = a[1] + uz * t;
      if (!gates.some((q) => Math.hypot(q[0] - x, q[1] - z) < 46)) BAYS.push({ x, z, ux, uz, yaw, top: top + 50, cell: cellOf(x, z) });
    }
  }
  return BAYS;
}
export const wallCells = () => wallBays().map((w) => w.cell);
function wallNear(K, cell) {
  const T = 12;
  for (const w of wallBays()) if (w.cell === cell) {
    // (A buttress: a stepped plinth, the shaft, a weathered cap under the parapet. Wide and few enough not to read as planks.)
    const y = Y(w.x, w.z) - 0.5, nx = -w.uz, nz = w.ux;
    K.box('soot:ph_basalt', w.x, y, w.z, 2.3, 7, T / 2 + 2.2, w.yaw, { collide: false });
    K.box('ph_basalt', w.x, y + 7, w.z, 1.7, 1.1, T / 2 + 1.7, w.yaw, { collide: false });
    K.box('ph_basalt', w.x, y + 8, w.z, 1.4, w.top - 5.2 - (y + 8), T / 2 + 1.1, w.yaw, { collide: false });
    K.box('soot:ph_basalt', w.x, w.top - 5.2, w.z, 1.6, 1.4, T / 2 + 1.4, w.yaw, { collide: false });
    const mx = w.x + w.ux * 6, mz = w.z + w.uz * 6, my = Y(mx, mz) - 0.5;
    K.box('ph_basalt', mx, my, mz, 4.2, 3.2, T / 2 + 0.6, w.yaw, { collide: false });
    for (const s of [-1, 1]) for (const hy of [0.42, 0.7]) {
      const fx = mx + nx * s * (T / 2 + 0.03), fz = mz + nz * s * (T / 2 + 0.03), sy = my + (w.top - my) * hy;
      K.quad('iron', [fx - w.ux * 0.35, sy, fz - w.uz * 0.35], [fx + w.ux * 0.35, sy, fz + w.uz * 0.35], [fx + w.ux * 0.35, sy + 3.4, fz + w.uz * 0.35], [fx - w.ux * 0.35, sy + 3.4, fz - w.uz * 0.35], [nx * s, 0, nz * s]);
    }
  }
}
// The Slough from near: a quay wall of dark stone down each bank to the water, a coping along its top; mooring posts
// along it; here and there a flight of steps down to the water, and a boat moored at their foot (a hull, two thwarts, a
// pole laid in it). (Nothing here stops a body: the ditch itself does.)
function sloughNear(K, cell) {
  const run = sloughRun(), w = SLOUGH_W, NC = { collide: false };
  run.forEach((r, i) => {
    if (r.lv === null || r.out || r.skip) return;
    const mx = (r.p[0] + r.q[0]) / 2, mz = (r.p[1] + r.q[1]) / 2;
    if (cellOf(mx, mz) !== cell) return;
    const { ux, uz } = r, yaw = Math.atan2(ux, uz) - Math.PI / 2, L = Math.hypot(r.q[0] - r.p[0], r.q[1] - r.p[1]);
    const nx = run[i + 1], step = nx && nx.lv !== null && !nx.out && !nx.skip && Math.abs(nx.lv - r.lv) > 0.01;
    for (const sd of [-1, 1]) {
      const qx = mx - uz * sd * (w + 0.4), qz = mz + ux * sd * (w + 0.4), top = Math.max(r.lv + 1.1, Math.min(Y(mx - uz * sd * (w + 3.5), mz + ux * sd * (w + 3.5)), r.lv + 4.6));
      K.box('soot:ph_basalt', qx, r.lv - 1.2, qz, L / 2 + 0.05, top - r.lv + 1.2, 0.45, yaw, NC);
      K.box('pale:ph_basalt', qx - uz * sd * 0.1, top, qz + ux * sd * 0.1, L / 2 + 0.05, 0.22, 0.62, yaw, NC);
      // (A slime line along the wall at the water, and a towpath of dark flags behind its coping.)
      K.box('mire:ph_basalt', qx + uz * sd * 0.03, r.lv - 0.1, qz - ux * sd * 0.03, L / 2 + 0.05, 0.5, 0.46, yaw, NC);
      { const tx = mx - uz * sd * (w + 2), tz = mz + ux * sd * (w + 2); K.box('dark:stone', tx, top - 0.5, tz, L / 2 + 0.05, 0.56, 1.5, yaw, NC); }
      const k = hash2(i * 7 + (sd > 0 ? 3 : 0), 19), k2 = hash2(i * 13 + (sd > 0 ? 5 : 0), 23);
      if (k > 0.25) { const px = r.p[0] - uz * sd * (w - 0.3), pz = r.p[1] + ux * sd * (w - 0.3); K.drum('dark:wood', px, r.lv - 1, pz, 0.2, 2.5, 6, NC); K.drum('char:stone', px, r.lv + 1.25, pz, 0.24, 0.14, 6, { open: true, collide: false }); }
      // (An outfall in the wall, one stretch in five: a dark mouth, its stain down to the water.)
      if (k2 > 0.8) { const ox = mx - uz * sd * (w - 0.08), oz = mz + ux * sd * (w - 0.08), N = [uz * sd, 0, -ux * sd]; const Q = (u, h) => [ox + ux * u, r.lv + h, oz + uz * u]; K.quad('obsidian', Q(-0.7, 0.5), Q(0.7, 0.5), Q(0.7, 1.7), Q(-0.7, 1.7), N); K.quad('mire:stone', Q(-0.5, -0.05), Q(0.5, -0.05), Q(0.6, 0.5), Q(-0.6, 0.5), N); }
      // (What's kept on the towpath: casks and crates against the bank, one stretch in three.)
      if (k2 < 0.33) { const cx = mx - uz * sd * (w + 2.9) + ux * 2, cz = mz + ux * sd * (w + 2.9) + uz * 2; K.box('wood', cx, top, cz, 0.6, 0.9, 0.6, k2 * 9, NC); K.drum('wood', cx - ux * 1.4, top, cz - uz * 1.4, 0.42, 1, 8, NC); K.box('wood', cx + ux * 1.3, top, cz + uz * 1.3, 0.5, 0.6, 0.5, -k2 * 7, NC); }
      // (Steps down, one stretch in six, and a boat by them.)
      if (k < 0.17) {
        for (let st = 0; st < 6; st++) { const o = w - 0.6 - st * 0.55, sx = mx - uz * sd * o + ux * 1.5, sz = mz + ux * sd * o + uz * 1.5; K.box('ph_basalt', sx, r.lv - 1, sz, 1.4, 1 + (top - r.lv) * (1 - st / 6), 0.28, yaw, NC); }
        const bx = mx - uz * sd * (w - 4.6) - ux * 2.5, bz = mz + ux * sd * (w - 4.6) - uz * 2.5, by = r.lv - 0.15;
        // (A barge: a long hull, pointed both ends, a deck load of casks and bales under a hide, a lantern on a post at its stern.)
        K.box('dark:wood', bx, by, bz, 4.6, 0.9, 1.5, yaw, NC);
        for (const g of [-1, 1]) K.box('wood', bx - uz * g * 1.5, by + 0.9, bz + ux * g * 1.5, 4.6, 0.4, 0.09, yaw, NC);
        K.beam('wood', [bx - ux * 4.4, by + 1.5, bz - uz * 4.4], [bx - ux * 6.4, by + 1.0, bz - uz * 6.4], 0.05);
        for (const e of [-1, 1]) K.quad('dark:wood', [bx + ux * e * 4.6 - uz * 1.5, by + 0.9, bz + uz * e * 4.6 + ux * 1.5], [bx + ux * e * 4.6 + uz * 1.5, by + 0.9, bz + uz * e * 4.6 - ux * 1.5], [bx + ux * e * 6.6, by + 1.15, bz + uz * e * 6.6], [bx + ux * e * 6.6, by + 1.15, bz + uz * e * 6.6]);
        K.box('p2_hessian', bx - ux * 1, by + 0.9, bz - uz * 1, 2, 0.9, 1.1, yaw, NC); K.drum('wood', bx + ux * 2.2, by + 0.9, bz + uz * 2.2, 0.45, 1, 8, NC); K.drum('wood', bx + ux * 3.2, by + 0.9, bz + uz * 3.2, 0.45, 1, 8, NC);
        K.box('dark:wood', bx - ux * 4, by + 0.9, bz - uz * 4, 0.07, 2.2, 0.07, 0, NC); K.cone('mire:flame', bx - ux * 4, by + 3.1, bz - uz * 4, 0.16, 0.4, 5);
        (K.lamps ||= []).push({ p: [bx - ux * 4, by + 3.2, bz - uz * 4], c: [0.55, 1, 0.5], r: 18, i: 14, flicker: 0.3 });
      }
    }
    // (Scum on the water, here and there: a dark skin of weed and muck, lying flat, three or four blots run together. Pale,
    // and nine-sided, it was white octagons on the water, a texture gone missing: the critics.)
    if (hash2(i * 3, 77) > 0.55) {
      const o = (hash2(i, 5) - 0.5) * 12, sx = mx - uz * o, sz = mz + ux * o;
      for (let k = 0; k < 4; k++) { const a = hash2(i, 40 + k) * 6.28, d = k ? 1 + 1.6 * hash2(i, 50 + k) : 0; K.disc('char:ph_basalt', sx + Math.cos(a) * d, r.lv + 0.03 + k * 0.004, sz + Math.sin(a) * d, (k ? 0.5 : 0.9) + hash2(i, 9 + k) * 0.8, 11); }
    }
    // The weir, where this stretch's water steps to the next's: a crest of dressed stone, a wing wall at each bank, the
    // water over it in a pale sheet, foam on the low side.
    if (step) {
      const hi = Math.max(r.lv, nx.lv), lo = Math.min(r.lv, nx.lv), dn = nx.lv < r.lv ? 1 : -1, cx = r.q[0], cz = r.q[1];
      K.box('ph_basalt', cx, lo - 1, cz, 0.9, hi - lo + 1.12, w + 0.6, yaw + Math.PI / 2, NC);
      for (const sd of [-1, 1]) K.box('soot:ph_basalt', cx - uz * sd * (w + 0.3), lo - 1, cz + ux * sd * (w + 0.3), 2.6, hi - lo + 2.6, 0.8, yaw, NC);
      const fx = cx + ux * dn * 0.95, fz = cz + uz * dn * 0.95, N = [ux * dn, 0, uz * dn];
      K.quad('pale:water', [fx - uz * (w - 0.4), hi + 0.06, fz + ux * (w - 0.4)], [fx + uz * (w - 0.4), hi + 0.06, fz - ux * (w - 0.4)], [fx + uz * (w - 0.4) + ux * dn * 0.5, lo, fz - ux * (w - 0.4) + uz * dn * 0.5], [fx - uz * (w - 0.4) + ux * dn * 0.5, lo, fz + ux * (w - 0.4) + uz * dn * 0.5], N);
      { const ax = cx + ux * dn * 3.2, az = cz + uz * dn * 3.2; K.quad('pale:water', [ax - uz * (w - 0.5) - ux * 1.9, lo + 0.04, az + ux * (w - 0.5) - uz * 1.9], [ax + uz * (w - 0.5) - ux * 1.9, lo + 0.04, az - ux * (w - 0.5) - uz * 1.9], [ax + uz * (w - 0.5) + ux * 1.9, lo + 0.04, az - ux * (w - 0.5) + uz * 1.9], [ax - uz * (w - 0.5) + ux * 1.9, lo + 0.04, az + ux * (w - 0.5) + uz * 1.9], [0, 1, 0]); }
    }
  });
}
// Is (x, z), r round, in a house's doorway, in or out: its width, and a little over a metre before and behind it? A barrel,
// a crate, a cart or a stall isn't set down there (K.clear, src/core/places.js): one house's back-yard crates or a street's
// barrels stood square before the next one's door, and once they were solid (keepProps) the house was a trap, got into
// and never out (tools/paths/map.mjs). Every house's, the whole city's, since one cell's things stand at another's doors.
let DOORWAYS = null;
export function inDoorway(x, z, r) {
  if (!DOORWAYS) {
    DOORWAYS = new Map();
    for (const h of phobosHouses()) {
      if (h.door === undefined) continue;
      const lz = h.front * (h.hz - WALL - 0.05), c = Math.cos(h.yaw), s = Math.sin(h.yaw), d = { x: h.x + lz * s, z: h.z + lz * c, c, s };
      const k = Math.floor(d.x / 8) * 10000 + Math.floor(d.z / 8);
      if (!DOORWAYS.has(k)) DOORWAYS.set(k, []);
      DOORWAYS.get(k).push(d);
    }
  }
  const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8);
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const d of DOORWAYS.get(i * 10000 + j) || []) {
    const dx = x - d.x, dz = z - d.z, u = dx * d.c - dz * d.s, v = dx * d.s + dz * d.c;
    if (Math.abs(u) < DOOR + r - 0.15 && Math.abs(v) < 1.3 + r) return true;
  }
  return false;
}
export function phobosCell(K, cell) {
  const n0 = K.colliders.length;
  K.clear = inDoorway;
  for (const l of phobosLamps()) if (l.cell === cell) {
    const hh = l.iron ? 4.2 : 2.8, out = l.iron ? 0.62 : 0.45;
    if (l.iron) streetLamp(K, l.x, l.z, hh, l.yaw); else K.lantern(l.x, l.z, hh, l.yaw, 'dark:wood');
    (K.lamps ||= []).push({ p: [l.x + Math.cos(l.yaw) * out, Y(l.x, l.z) + hh - 0.7, l.z - Math.sin(l.yaw) * out], c: [1, 0.66, 0.34], r: l.iron ? 32 : 36, i: l.iron ? 30 : 22, flicker: 0.3, prio: 8 });   // (prio: the street's own lamps before the doors', so there are pools down the cobbles at dusk, the critics)
  }
  for (const h of byCell().get(cell) || []) if (!h.spire) houseNear(K, h);
  // (What stands along its streets, and the toll-houses on the Slough's footbridges: src/core/phobos-houses.js.)
  streetLife(K, cell, { keep: keepProps, streets: STREETS, cellOf, districtAt, cityIn, sloughD, segD, BANNER, inSquare: (x, z) => inSealSquare(x, z, 2) || inHub(x, z, 2) || SEWER_MOUTHS.some((m) => Math.hypot(x - m.x, z - m.z) < MOUTH_SQUARE + 12) });
  for (const b of footbridges()) if (cellOf(b.x, b.z) === cell) bridgeHouse(K, b, false);
  // (Its towers and spires, gone into: their rooms, stairs and things.)
  for (const t of cityTowers()) if (t.cell === cell) towerNear(K, t);
  for (const hb of HUBS) if (cellOf(hb.x, hb.z) === cell) hubNear(K, hb);
  if (CASTLE_CELLS.has(cell) || TOWER_CELLS().has(cell)) castleNear(K, cell);
  sloughNear(K, cell);
  wallNear(K, cell);
  // A seal's square: dark flags laid round it, an iron lantern at each corner. (The seal itself: src/core/sites.js.)
  for (const s of PHOBOS_SEALS) if (cellOf(s.x, s.z) === cell) {
    K.paving('dark:stone', s.x, s.z, SEAL_SQUARE, SEAL_SQUARE, s.yaw, 0.04);
    const c = Math.cos(s.yaw), n = Math.sin(s.yaw), e = SEAL_SQUARE - 0.6;
    for (const [u, v] of [[-e, -e], [e, -e], [e, e], [-e, e]]) {
      const x = s.x + u * c + v * n, z = s.z - u * n + v * c, face = Math.atan2(s.x - x, s.z - z);
      K.lantern(x, z, 3.4, face, 'iron');
      (K.lamps ||= []).push({ p: [x, Y(x, z) + 3.0, z], c: [1, 0.62, 0.3], r: 26, i: 16, flicker: 0.3 });
    }
  }
  K.colliders.length = n0;
}

// What tells each district from the next from far off: one big thing in each.
function landmarks(K) {
  const D = Object.fromEntries(PHOBOS.districts.map((d) => [d.key, d]));
  const dun = (k) => PHOBOS.dungeons.find((q) => q.district === k);
  // The Bone Yards: the City Ossuary, a long black nave with two west towers, the biggest roof below the castle.
  // (Each one's towers are gone into, a room on every floor and somebody's things in it: src/core/phobos-towers.js
  // landmarkTowers, which stands them where they were, or clear of what they were built against.)
  { const d = { x: D.bones.x + 14, z: D.bones.z - 62 }, y = Y(d.x, d.z); hall(K, 'dark:ashlar', 'soot:roof_2', d.x, y - 2, d.z, 64, 56, 21, 0.2, { pitch: 1.1 }); }
  // Chainmarket: the gibbet tower in the square's middle, its head ringed with gibbet arms: a braced iron arm out from the
  // wall, a chain down from its end, and a cage on it, swung out over the square for the whole market to see.
  { const d = { x: D.market.x + 4, z: D.market.z - 34 }, top = Y(d.x, d.z) + 72;
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * TAU, c = Math.cos(a), sn = Math.sin(a), at = (r, y) => [d.x + c * r, y, d.z + sn * r];
      const ay = top - 5, reach = 15, cy = ay - 5.2, R = 1.15, H = 2.7;
      K.beam('iron', at(7.4, ay), at(reach + 0.4, ay), 0.22);              // (the arm)
      K.beam('iron', at(7.6, ay - 6), at(reach - 2.5, ay - 0.15), 0.14);   // (its brace, back to the wall)
      K.beam('iron', at(reach, ay), at(reach, cy + H + 0.1), 0.05);            // (the chain)
      const [cx, , cz] = at(reach, 0);
      K.drum('iron', cx, cy + H, cz, R, 0.45, 6, { r2: 0.35, open: true, collide: false });   // (the cage's head)
      for (let k = 0; k < 6; k++) { const b = k / 6 * TAU; K.beam('iron', [cx + Math.cos(b) * R, cy + H, cz + Math.sin(b) * R], [cx + Math.cos(b) * R, cy, cz + Math.sin(b) * R], 0.045); }
      K.drum('iron', cx, cy - 0.12, cz, R + 0.05, 0.14, 6, { collide: false });                     // (and its floor)
    } }
  // The Barracks Ward: the parade ground's four corner forts, the long drill hall, and the Marshal's tower over it.
  { const d = D.barracks, y = Y(d.x, d.z); hall(K, 'block', 'roof_2', d.x, y - 1, d.z - 84, 54, 26, 13, 0, { buttress: false }); K.cone('roof_2', d.x + 70, y + 82, d.z - 84, 15, 30, 4, Math.PI / 4); }
  // The Mages' Rise: the Tower of the Ninefold Eye, taller than anything in the city, and two lesser by it.
  { const g = dun('mages'); K.drum('frost:flame', g.x, Y(g.x, g.z) + 196 - 24, g.z, 15.3, 8, 16, { open: true, collide: false }); }
  // Dukes' Row: the Gilded Vault, a domed counting house.
  { const q = dun('dukes'), g = { x: q.x + 26, z: q.z + 30 }, y = Y(g.x, g.z); K.box('pale:course', g.x, y - 2, g.z, 34, 40, 34, 0.3); K.drum('pale:stone', g.x, y + 38, g.z, 25, 12, 16); K.cone('roof_1', g.x, y + 50, g.z, 26, 28, 16); }
  // The Rookeries: the Rotting Hospice, a hulk over the tenements, with a fire cage on its tower.
  { const g = dun('rookeries'), y = Y(g.x, g.z); hall(K, 'rubble', 'roof_4', g.x, y - 1, g.z, 40, 44, 16, 0.9, { buttress: false }); { const cx = g.x + 30, cz = g.z + 30, c9 = Math.cos(0.9), s9 = Math.sin(0.9); for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box('iron', cx + (u * c9 + v * s9) * 5.8, y + 75, cz + (-u * s9 + v * c9) * 5.8, 0.25, 8, 0.25, 0.9, { collide: false }); K.drum('iron', cx, y + 75, cz, 5.4, 1.2, 8, { r2: 6.2, open: true, collide: false }); fire(K, cx, y + 75.5, cz, 3.6, 8); K.cone('soot:roof_2', cx, y + 83, cz, 7.4, 6, 4, 0.9 + Math.PI / 4); } }
  // The Drowned Wharf: the sluice house and its wheel tower. The Tanners' Steps: the great stack.
  { const d = { x: D.tanners.x - 85, z: D.tanners.z + 70 }, y = Y(d.x + 30, d.z - 20); K.drum('rubble', d.x + 30, y - 2, d.z - 20, 9, 96, 12, { r2: 5 }); K.box('rubble', d.x + 30, y - 2, d.z - 20, 20, 22, 16, 0.4); }
  // The Cinder Quarter: the burnt minster, roofless, its west front and one tower still standing.
  { const d = { x: D.cinder.x + 30, z: D.cinder.z - 84 }, y = Y(d.x, d.z); for (const sd of [-1, 1]) K.wall('dark:rubble', d.x - 44, d.z + sd * 16, d.x + 44, d.z + sd * 16, 3, 44, { ruin: true }); K.box('dark:rubble', d.x - 46, y - 2, d.z, 4, 64, 18, 0); }
  // Ironmercy Gaol: a block with a tower at each corner and a taller one over its gate.
  { const g = dun('barracks'), y = Y(g.x, g.z); K.box('dark:block', g.x, y - 2, g.z, 34, 38, 26, 0.2); }
  // The three forts (stood back off the street each is named on).
  for (const q of PHOBOS.forts) { const o = [[0, 0], [30, 24], [-30, 24], [30, -24], [-30, -24], [0, 44], [0, -44]].find(([dx, dz]) => streetNear(q.x + dx, q.z + dz).d > 36) || [0, 0], f = { x: q.x + o[0], z: q.z + o[1] }, y = Y(f.x, f.z); K.box('dark:block', f.x, y - 2, f.z, 18, 34, 18, 0.4); }
}

// What the streets have that's seen from far: the King's Mile's two sidewalks, flagged and a hand higher than the roadway,
// under its house fronts; and Chainmarket's ring of stalls round the gibbet tower, with carts among them.
// (Its roadway, between the walks: setts down the King's Mile and the better streets, cobbles in the slums, ash in the Cinder
// Quarter, dyers' flags on the Tanners' Steps. The PH2 pack's.)
const roadOf = (spine, x, z) => {
  if (spine) return 'p2_rutted_setts';
  const k = districtAt(x, z).key;
  return k === 'cinder' ? 'p2_ash_street' : k === 'tanners' ? 'p2_dye_flags' : k === 'rookeries' || k === 'wharf' || k === 'other' ? 'p2_slum_cobbles' : k === 'bones' ? 'pale:p2_rutted_setts' : 'p2_rutted_setts';
};
function streets(K) {
  for (const st of STREETS) {
    const spine = st.w > 5, wide = spine ? 1.6 : 0.8;
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(-uz, ux), n = Math.ceil(L / 8);
      // (In big cells, a piece's whole length: the land's corners are near their budget. Not on a phone, whose ground shows the
      // road already.)
      if (!K.lean) for (let k = 0; k < n; k++) {
        const t = (k + 0.5) * L / n, x = a[0] + ux * t, z = a[1] + uz * t;
        if (cityIn(x, z) > 0.97 || (x > 10430 && Math.abs(z) < 48) || sloughD(x, z) < 6) continue;
        K.paving(roadOf(spine, x, z), x, z, L / n / 2 + 0.05, st.w - 2 * wide + 0.12, yaw, 0.09, 4.2);
      }
      for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
        const t = (k + 0.5) * L / n, off = st.w - wide + 0.1, x = a[0] + ux * t - uz * off * sd, z = a[1] + uz * t + ux * off * sd;
        if (cityIn(x, z) > 0.97 || (x > 10430 && Math.abs(z) < 48) || sloughD(x, z) < 6) continue;
        // (The walk a hand higher than the roadway, and a kerb of stone along its edge.)
        K.paving('soot:p2_walk_paving', x, z, L / n / 2 + 0.05, wide, yaw, 0.16);
        if (K.lean) continue;
        const kx = x + uz * (wide + 0.12) * sd, kz = z - ux * (wide + 0.12) * sd;
        // (Its top and its face to the road: two quads, not a box.)
        const ky = Y(kx, kz), hl = L / n / 2 + 0.05, e = (du, dv, yy) => [kx + ux * du + uz * dv * sd, yy, kz + uz * du - ux * dv * sd];
        // (Sooted: pale, the kerbs down every street read as lines painted on a road.)
        K.quad('char:stone', e(-hl, -0.14, ky + 0.2), e(hl, -0.14, ky + 0.2), e(hl, 0.14, ky + 0.2), e(-hl, 0.14, ky + 0.2), [0, 1, 0]);
        K.quad('char:stone', e(-hl, 0.14, ky - 0.1), e(hl, 0.14, ky - 0.1), e(hl, 0.14, ky + 0.2), e(-hl, 0.14, ky + 0.2), [uz * sd, 0, -ux * sd]);
      }
    }
  }
  if (K.lean) return;
  // Chainmarket: lanes of stalls under awnings round the gibbet tower, carts and crates among them, lanterns on poles.
  const d = PHOBOS.districts.find((q) => q.key === 'market'), n0 = K.colliders.length, mx = d.x + 4, mz = d.z - 34;
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const x = mx + i * 7.5 + (j & 1) * 2, z = mz + j * 6.5, rr = Math.hypot(x - mx, z - mz), v = hash2(i + 9, j + 5);
    if (rr < 13 || rr > 47 || streetNear(x, z).d < 11 || v < 0.12) continue;
    if (v > 0.9) K.cart(x, z, v * 6);
    else if (v > 0.82) { K.goods(x, z, 6, 1.2); K.barrel(x + 1.2, z + 0.4); }
    else K.stall(x, z, (j & 1) ? 0 : Math.PI, ['cloth_oat', 'cloth_red', 'cloth_oat'][(i + j + 12) % 3], (i * 3 + j + 40) % 4);
    if ((i + j) % 4 === 0 && v > 0.3) { K.lantern(x + 3.4, z + 2.6, 3.2, v * 6, 'dark:wood'); (K.lamps ||= []).push({ p: [x + 3.4, Y(x, z) + 2.8, z + 2.6], c: [1, 0.66, 0.34], r: 30, i: 18, flicker: 0.3 }); }
  }
  K.colliders.length = n0;
}
// (Every tower of the city's last: the wall's, the landmarks', the spires', each in its cell's group: src/core/phobos-towers.js.)
export function phobosCity(K) { wall(K); districts(K); streets(K); landmarks(K); hubFar(K); for (const t of cityTowers()) towerFar(K, t); }

// ---------------------------------------------------------------- the castle

// The castle from near, one cell of it (phobosCell): nothing yet.
// The castle from near, a cell at a time (CASTLE_CELLS): the Lower Ward's yard behind the gate, which is where you stand
// in it. Flagged from the gate to the ramp up to the Middle Ward, his fires in pairs down the way and his banners on poles
// between them; the yard's well; spears in racks and his stores by the gate; a stable against the north curtain; and a
// door, its steps and two fires to each of the Lower Ward's halls. (Nothing here stops a body: what does is in
// phobosCastle's build. Fires here are still flames with a light each: the moving ones are the far build's alone.)
const YARD = { x0: CRAG.x - CRAG.a * 0.86 + 10, x1: 10924, hz: 64 };
// The yard's fires: [x, z, big]: pairs down the flagged way, close together by the gate and further apart toward his mark;
// and two tall ones by the castle's door. Bowls here (castleNear), flames in the far build (phobosCastle).
const YARD_FIRES = [...[10810, 10832, 10878].flatMap((x) => [[x, -13.4, 0], [x, 13.4, 0]]), [10812.5, 15.4, 1], [10812.5, 30.6, 1]];
// The Lower Ward's halls, as phobosCastle stands them: [x, z, half along, half through, yaw, which long side faces the yard].
// The outer curtain's stretches near the yard (the ring phobosCastle walls the crag with), for castleNear's plinths.
const RING_NEAR = () => { const out = []; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, b = (i + 1) / 44 * TAU, p = [CRAG.x + Math.cos(a) * CRAG.a * 0.86, CRAG.z + Math.sin(a) * CRAG.b * 0.86], q = [CRAG.x + Math.cos(b) * CRAG.a * 0.86, CRAG.z + Math.sin(b) * CRAG.b * 0.86]; if (p[0] < 10900 && !(Math.abs(p[1]) < 22)) out.push([...p, ...q]); } return out; };
const YARD_HALLS = [[10850, 150, 44, 12, 0.25, -1], [10880, 215, 30, 10, 0.25, -1], [10850, -150, 40, 13, -0.25, 1], [10890, -215, 26, 9, -0.25, 1]];
function yardThings() {
  const out = [], add = (kind, x, z, o = {}) => out.push({ kind, x, z, cell: cellOf(x, z), ...o });
  // The way, flagged; and the yard either side of it in the wards' paving, in eight-metre slabs.
  for (let x = YARD.x0; x < YARD.x1; x += 8) for (let z = -YARD.hz; z < YARD.hz; z += 8) add('slab', x + 4, z + 4, { way: Math.abs(z + 4) < 9 });
  for (const [x, z, big] of YARD_FIRES) add('fire', x, z, { big });
  // (Against the yard's cross-wall, not out in the open: nothing upright stands in the yard's sightlines.)
  for (const z of [26, 42, 56]) for (const s of [-1, 1]) add('pole', 10850.4, s * z, { face: s });
  // (The yard's two halves: a drill ground north of the way, the carters' and the smiths' south of it.)
  for (const [x, z] of [[10826, 36], [10832, 42], [10838, 36], [10832, 30]]) add('dummy', x, z);
  for (const [x, z, yaw] of [[10822, 52, Math.PI], [10830, 52, Math.PI], [10838, 52, Math.PI], [10866, -52, 0], [10874, -52, 0]]) add('rack', x, z, { yaw });
  for (const [x, z] of [[10830, -34], [10836, -38], [10842, -32], [10874, 30], [10880, 26], [10868, -40], [10890, 40]]) add('stores', x, z);
  add('cart', 10836, -28, { yaw: 1.2 }); add('cart', 10878, -30, { yaw: -0.4 });
  for (const [ax, az, bx, bz] of RING_NEAR()) add('curtain', (ax + bx) / 2, (az + bz) / 2, { ax, az, bx, bz });
  // (Kerbs down both edges of the way.)
  for (let x = YARD.x0; x < YARD.x1 - 26; x += 8) for (const s of [-1, 1]) add('kerb', x + 4, s * 8.2);
  add('well', 10840, 34);
  for (const [x, z, yaw] of [[10800, -44, 0], [10806, -44, 0], [10812, -44, 0], [10800, 46, Math.PI], [10806, 46, Math.PI]]) add('rack', x, z, { yaw });
  for (const [x, z] of [[10822, -46], [10826, -43], [10868, 40], [10896, -38], [10900, -34]]) add('stores', x, z);
  add('cart', 10858, -30, { yaw: 0.5 }); add('cart', 10884, 44, { yaw: -0.9 });
  add('stable', 10872, 58);
  for (const [x, z, hx, hz, yaw, side] of YARD_HALLS) add('door', x, z, { hx, hz, yaw, side });
  return out;
}
let YARD_THINGS = null;
function castleNear(K, cell) {
  // (Its towers' stairs, galleries and decks: climb, below.)
  for (const t of castleTowers().towers) if (t.cell === cell && t.kind !== 'spire') climb(K, t, 'p2_walk_paving');
  for (const t of (YARD_THINGS ||= yardThings())) if (t.cell === cell) {
    const { x, z } = t, y = Y(x, z), NC = { collide: false };
    if (t.kind === 'slab') K.paving(t.way ? 'soot:p2_bone_joint_flags' : 'p2_ward_paving', x, z, 4.02, 4.02, 0, t.way ? 0.07 : 0.04);
    else if (t.kind === 'dummy') {
      // (A drill post: a stake, a straw body bound on it, a helm on its head. No arms out.)
      K.box('dark:wood', x, y, z, 0.09, 2.1, 0.09, 0, NC); K.drum('p2_straw_ground', x, y + 0.8, z, 0.34, 0.9, 7, { r2: 0.28, collide: false }); K.drum('char:stone', x, y + 1.75, z, 0.2, 0.3, 7, { r2: 0.12, collide: false });
    } else if (t.kind === 'curtain') {
      // (The curtain by the yard from near: a battered plinth along its foot, a string course under the walk, arrow loops
      // a man high between: so its thirty metres read as thirty.)
      const L = Math.hypot(t.bx - t.ax, t.bz - t.az), ux = (t.bx - t.ax) / L, uz = (t.bz - t.az) / L, yaw = Math.atan2(t.bx - t.ax, t.bz - t.az) - Math.PI / 2, g = Y(x, z) - 0.5;
      K.box('p2_curtain_granite', x, g, z, L / 2, 2.6, 3.6, yaw, NC); K.box('p2_curtain_granite', x, g + 2.6, z, L / 2, 0.7, 3.1, yaw, NC);
      K.box('p2_curtain_granite', x, g + 19, z, L / 2, 0.8, 3.0, yaw, NC);
      for (let u = -L / 2 + 4; u < L / 2 - 3; u += 7) for (const sd of [-1, 1]) { const fx = x + ux * u - uz * sd * 2.56, fz = z + uz * u + ux * sd * 2.56; K.quad('obsidian', [fx - ux * 0.22, g + 9, fz - uz * 0.22], [fx + ux * 0.22, g + 9, fz + uz * 0.22], [fx + ux * 0.22, g + 11.2, fz + uz * 0.22], [fx - ux * 0.22, g + 11.2, fz - uz * 0.22], [-uz * sd, 0, ux * sd]); }
    }
    else if (t.kind === 'kerb') K.box('dark:stone', x, y - 0.1, z, 4, 0.32, 0.22, 0, NC);
    else if (t.kind === 'fire') {
      // (A bowl of his fire on a tapered pillar of dark stone; the door's two twice the height. The flame is the far build's.)
      const h = t.big ? 5 : 2.6;
      K.drum('dark:stone', x, y - 0.3, z, t.big ? 1 : 0.8, h + 0.1, 6, { r2: t.big ? 0.6 : 0.5, collide: false });
      K.drum('char:stone', x, y + h - 0.2, z, 0.4, 0.5, 8, { r2: t.big ? 0.95 : 0.72, collide: false });
      (K.lamps ||= []).push({ p: [x, y + h + 1, z], c: [1, 0.42, 0.18], r: t.big ? 34 : 26, i: t.big ? 40 : 20, flicker: 0.4 });
    } else if (t.kind === 'pole') {
      // (His banner on a pole, hung from an arm out toward the way: one arm, out one side, the cloth below it.)
      // (The arm from the pole's very head, nothing of the pole over it: an arm part way down a pole is a cross.)
      K.box('dark:wood', x, y, z, 0.13, 11.27, 0.13, 0, NC);
      K.beam('dark:wood', [x, y + 11.2, z], [x, y + 11.2, z - t.face * 2.4], 0.08);
      // (His red, plain, tapering to a point: both faces. The pack's skull banner is a cut-out, which the near cells don't draw.)
      for (const e of [-1, 1]) {
        const zx = (u) => z - t.face * u, X = x + e * 0.02, T = y + 11.1;
        K.quad('char:cloth_red', [X, T, zx(0.15)], [X, T, zx(2.35)], [X, T - 0.5, zx(2.35)], [X, T - 0.5, zx(0.15)], [e, 0, 0]);
        K.quad('cloth_red', [X, T - 0.5, zx(0.15)], [X, T - 0.5, zx(2.35)], [X, T - 4.6, zx(2.35)], [X, T - 4.6, zx(0.15)], [e, 0, 0]);
        K.quad('cloth_red', [X, T - 4.6, zx(0.15)], [X, T - 4.6, zx(2.35)], [X, T - 6, zx(1.25)], [X, T - 6, zx(1.25)], [e, 0, 0]);
      }
    } else if (t.kind === 'well') {
      // (A kerb of dark blocks round black water, a windlass over it on two posts: its drum, a crank out one end.)
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; K.box('dark:stone', x + Math.cos(a) * 1.9, y, z + Math.sin(a) * 1.9, 0.45, 0.9, 0.3, Math.PI / 2 - a, NC); }
      K.disc('dark:water', x, y + 0.5, z, 1.7, 14);
      for (const s of [-1, 1]) K.box('dark:wood', x + s * 2.1, y, z, 0.13, 3.1, 0.13, 0, NC);
      K.beam('dark:wood', [x - 2.1, y + 2.6, z], [x + 2.1, y + 2.6, z], 0.2); K.beam('iron', [x + 2.1, y + 2.6, z], [x + 2.7, y + 2.25, z], 0.04);
      K.beam('iron', [x, y + 2.5, z], [x, y + 1.1, z], 0.025); K.drum('dark:wood', x, y + 0.75, z, 0.24, 0.36, 7, NC);
    } else if (t.kind === 'rack') {
      // (Spears stood against a backboard, their butts in a trough: nothing across the shafts.)
      const c = Math.cos(t.yaw), s = Math.sin(t.yaw);
      K.box('dark:wood', x, y + 0.3, z, 1.7, 1.9, 0.05, t.yaw, NC); K.box('dark:wood', x + s * 0.2, y, z + c * 0.2, 1.7, 0.25, 0.18, t.yaw, NC);
      for (let k = -3; k <= 3; k++) { const px = x + k * 0.46 * c + s * 0.2, pz = z - k * 0.46 * s + c * 0.2; K.box('wood', px, y, pz, 0.028, 3, 0.028, t.yaw, NC); K.cone('iron', px, y + 3, pz, 0.07, 0.45, 4); }
    } else if (t.kind === 'stores') {
      const k = hash2(x, z);
      if (k > 0.5) for (const [ox, oz, h] of [[0, 0, 1.1], [1, 0.25, 1.1], [0.45, 0.9, 0.95]]) { K.drum('wood', x + ox, y, z + oz, 0.45, h, 8, NC); K.drum('iron', x + ox, y + h * 0.3, z + oz, 0.465, 0.07, 8, { open: true, collide: false }); K.drum('iron', x + ox, y + h * 0.72, z + oz, 0.465, 0.07, 8, { open: true, collide: false }); }
      else { K.box('wood', x, y, z, 0.7, 1, 0.7, k * 3, NC); K.box('wood', x + 1.5, y, z + 0.2, 0.55, 0.8, 0.55, -k * 2, NC); K.box('wood', x + 0.4, y + 1, z, 0.45, 0.6, 0.45, k * 5, NC); }
    } else if (t.kind === 'cart') {
      const c = Math.cos(t.yaw), s = Math.sin(t.yaw);
      K.box('wood', x, y + 0.55, z, 0.9, 0.7, 1.6, t.yaw, NC);
      for (const u of [-1, 1]) K.drum('dark:wood', x + u * 1.0 * c, y + 0.1, z - u * 1.0 * s, 0.6, 0.12, 10, NC);
      for (const u of [-0.7, 0.7]) K.beam('wood', [x + u * c + s * 1.6, y + 0.7, z - u * s + c * 1.6], [x + u * c + s * 3.6, y + 0.25, z - u * s + c * 3.6], 0.06);
    } else if (t.kind === 'stable') {
      // (A lean-to against the north curtain: four posts, a pent roof of slate down to the yard, three stalls' rails, straw.)
      for (const u of [-9, -3, 3, 9]) K.box('dark:wood', x + u, y, z - 4, 0.16, 3, 0.16, 0, NC);
      K.quad('p2_slate_roof', [x - 10, y + 4.6, z + 3], [x + 10, y + 4.6, z + 3], [x + 10, y + 3, z - 4.6], [x - 10, y + 3, z - 4.6], [0, 0.97, -0.23]);
      K.quad('dark:wood', [x + 10, y + 4.55, z + 3], [x - 10, y + 4.55, z + 3], [x - 10, y + 2.95, z - 4.6], [x + 10, y + 2.95, z - 4.6], [0, -0.97, 0.23]);
      for (const u of [-3, 3]) K.box('dark:wood', x + u, y, z - 0.5, 0.08, 1.4, 3.5, 0, NC);
      K.paving('p2_straw_ground', x, z - 0.5, 9.6, 3.4, 0, 0.09);
      K.box('dark:wood', x - 6, y, z - 3.2, 1.3, 0.6, 0.35, 0, NC); K.box('dark:wood', x, y, z + 3, 10, 3.4, 0.12, 0, NC);
      K.drum('p2_straw_ground', x + 7, y - 0.2, z - 6.5, 1.6, 1.1, 7, { r2: 0.5, collide: false });
    } else if (t.kind === 'door') {
      // (A hall's door in its yard face: an iron-bound leaf in a frame of dressed stone, three steps down, a fire each side.)
      const c = Math.cos(t.yaw), s = Math.sin(t.yaw), f = t.side, P = (lx, lz) => [t.x + lx * c + lz * s, t.z - lx * s + lz * c], N = [f * s, 0, f * c];
      for (const lx of [-t.hx * 0.5, t.hx * 0.5]) {
        const [dx, dz] = P(lx, f * (t.hz + 0.12)), gy = Y(dx, dz);
        const Q = (u, h, o = 0) => { const [qx, qz] = P(lx + u, f * (t.hz + 0.12 + o)); return [qx, gy + h, qz]; };
        K.quad('p2_door_iron', f > 0 ? Q(-1.5, 4.4) : Q(1.5, 4.4), f > 0 ? Q(1.5, 4.4) : Q(-1.5, 4.4), f > 0 ? Q(1.5, 0.5) : Q(-1.5, 0.5), f > 0 ? Q(-1.5, 0.5) : Q(1.5, 0.5), N, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        for (const u of [-1.9, 1.9]) { const [qx, qz] = P(lx + u, f * (t.hz + 0.3)); K.box('p2_curtain_granite', qx, gy, qz, 0.4, 5, 0.4, t.yaw, NC); }
        { const [qx, qz] = P(lx, f * (t.hz + 0.3)); K.box('p2_curtain_granite', qx, gy + 4.5, qz, 2.6, 0.8, 0.5, t.yaw, NC); }
        // (A porch out over its steps: two piers, a pent of his red tiles, a warm light under it.)
        for (const u of [-3, 3]) { const [qx, qz] = P(lx + u, f * (t.hz + 3)); K.box('p2_curtain_granite', qx, gy - 0.4, qz, 0.5, 5.6, 0.5, t.yaw, NC); }
        { const [qx, qz] = P(lx, f * (t.hz + 1.6)); K.box('blood:p2_blood_tiles', qx, gy + 5.2, qz, 3.8, 0.5, 1.9, t.yaw, NC); (K.lamps ||= []).push({ p: [qx, gy + 3.6, qz], c: [1, 0.6, 0.3], r: 26, i: 40, flicker: 0.2 }); }
        for (let k = 0; k < 3; k++) { const [qx, qz] = P(lx, f * (t.hz + 0.9 + k * 0.5)); K.box('dark:stone', qx, gy - 0.4, qz, 2.6, 0.9 - k * 0.17 - 0.0, 0.26, t.yaw, NC); }
        for (const u of [-3.4, 3.4]) { const [qx, qz] = P(lx + u, f * (t.hz + 1.6)); K.drum('dark:stone', qx, gy - 0.3, qz, 0.6, 2.3, 6, { r2: 0.4, collide: false }); K.drum('char:stone', qx, gy + 2, qz, 0.32, 0.45, 8, { r2: 0.58, collide: false }); K.cone('blood:flame', qx, gy + 2.4, qz, 0.4, 1, 6); (K.lamps ||= []).push({ p: [qx, gy + 3, qz], c: [1, 0.42, 0.18], r: 22, i: 16, flicker: 0.4 }); }
      }
    }
  }
}

// The ground's height on the crag by ward, and a spot's own.
const wardY = (i) => PLAIN + WARDS[i][1];
export function phobosCastle(K) {
  // (The PH2 pack's: the wards' granite; his blood-red tiles on the halls, fish-scale slate on the towers' and spires' cones.)
  // (In soot, as the old granite was: his castle is dark from the city.)
  // (The curtains in the bridge ashlar: the granite's drips, a block at a time, lined up into a palisade's boards along
  // a wall seen from the city. The critics, round 2.)
  // (Its foot course and pilasters a step lighter, in the towers' granite: the ashlar's own lighter step is near white,
  // and a pale course across a dark face read as a cross from the gate. The V/T rule.)
  // (vee: his swallowtail merlons, a V cut in each, all along the castle's walls: Kit.vee, src/core/sites.js.)
  const BL = { crenel: true, lite: 'p2_curtain_granite', vee: true };
  // (The towers in the curtains' own ashlar, as dark: in the granite they stood pale grey against near-black walls, two
  // castles in one. The halls keep the granite, a step lighter than the walls round them.)
  const S = 'soot:p2_curtain_granite', C = 'soot:p2_bridge_ashlar', B = 'soot:p2_bridge_ashlar', R = 'blood:p2_blood_tiles', RT = 'soot:p2_fishscale_slate';
  // The outer curtain round the crag's edge, a tower every third stretch; the ward walls across it at each step up.
  const ring = [];
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; ring.push([CRAG.x + Math.cos(a) * CRAG.a * 0.86, CRAG.z + Math.sin(a) * CRAG.b * 0.86]); }
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    if (Math.abs(p[1]) < 22 && p[0] < CRAG.x) return;   // (the gate, at the west end)
    // (The Sally Gate, east, behind the Keep: the stretch split round its passage, sallyGate below.)
    if (i === SALLY) { const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L;
      curtain(K, B, p[0], p[1], mx - ux * 8.5, mz - uz * 8.5, 5, 24, BL); curtain(K, B, mx + ux * 8.5, mz + uz * 8.5, q[0], q[1], 5, 24, BL); return; }
    // (Its towers are gone into now, src/core/phobos-towers.js by castleWallTowers below: the curtain stops at each one's
    // face, so its room is its own.)
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uz = (q[1] - p[1]) / L, a = ringTower(ring, i) ? 7.2 : 0, b = ringTower(ring, (i + 1) % ring.length) ? 7.2 : 0;
    curtain(K, B, p[0] + ux * a, p[1] + uz * a, q[0] - ux * b, q[1] - uz * b, 5, 24, BL);
  });
  // (Only the Middle Ward's: where the High Ward's wall would run the Keep's body stands.)
  for (const [i, x0] of [[1, WARDS[1][0]]]) {
    // (The wall in three stretches, stopping at the faces of the towers on it: castleWallTowers.)
    for (const s of [-1, 1]) for (const [z0, z1] of [[24 + 11.5, 90 - 8], [90 + 8, 170 - 8], [170 + 8, 250]]) { const X = (zz) => x0 - s * 46 * 0.22 - s * (zz - 24) * (204 * 0.22 / 226); curtain(K, B, X(z0), s * z0, X(z1), s * z1, 8, 48, BL); }
    K.box(S, x0, Y(x0, 0) + 14, 0, 9, 44, 16, 0, { collide: false });
  }
  // The castle's other ways in (the owner, 2026-11-19: "Give the castle other entrances too"): the Sally Gate east, out
  // onto the shelf behind the Keep; and a postern in the curtain on each cliff, north and south, shut.
  sallyGate(K, ring, S, C, BL);
  for (const i of POSTERNS) postern(K, ring, i, C);
  // The gatehouse at the head of the Approach: two great drums and the gate's head between.
  const gx = CRAG.x - CRAG.a * 0.86, gy = Y(gx, 0);
  for (const s of [-1, 1]) tower(K, C, gx, s * 22, 13, 74, RT, { steep: 2.2, lit: 0.65 });
  K.box(S, gx, gy + 13, 0, 9, 40, 10, 0, { collide: false });
  { // (The passage under its head: dark walls and a dark vault, its mouths pointed both ends: the spandrels filled in.)
    for (const s of [-1, 1]) K.box('dark:stone', gx, gy - 0.5, s * 9.3, 9, 13.5, 0.3, 0, { collide: false, top: false });
    K.quad('dark:stone', [gx - 9, gy + 13, -9], [gx + 9, gy + 13, -9], [gx + 9, gy + 13, 9], [gx - 9, gy + 13, 9], [0, -1, 0]);
    for (const e of [-1, 1]) for (const s of [-1, 1]) K.tri(S, [gx + e * 9.04, gy + 7.5, s * 9], [gx + e * 9.04, gy + 13.05, s * 9], [gx + e * 9.04, gy + 13.05, 0]);
    for (const e of [-1, 1]) { K.quad('dark:stone', [gx + e * 9.08, gy + 7.2, -9.6], [gx + e * 9.08, gy + 7.2, -9], [gx + e * 9.08, gy + 13.4, 0.35], [gx + e * 9.08, gy + 13.4, -0.35], [e, 0, 0]); K.quad('dark:stone', [gx + e * 9.08, gy + 7.2, 9], [gx + e * 9.08, gy + 7.2, 9.6], [gx + e * 9.08, gy + 13.4, 0.35], [gx + e * 9.08, gy + 13.4, -0.35], [e, 0, 0]); }
    // (The portcullis wound up into the head, all but its teeth: bars down from a beam, none across.)
    // (No beam across their heads: with the bars it was a lattice. They hang from the vault itself. And the murder holes over
    // the passage, three, his fire's red in them; chains down from two of them.)
    for (const hx of [-5, 0, 5]) { K.quad('blood:flame', [gx + hx - 1.3, gy + 12.9, -1.3], [gx + hx + 1.3, gy + 12.9, -1.3], [gx + hx + 1.3, gy + 12.9, 1.3], [gx + hx - 1.3, gy + 12.9, 1.3], [0, -1, 0]); (K.lamps ||= []).push({ p: [gx + hx, gy + 11.5, 0], c: [1, 0.2, 0.08], r: 16, i: 30, flicker: 0.3 }); }
    for (const [hx, hz, len] of [[-5, 5.5, 4.5], [5, -5.5, 3.6], [0, 6.2, 2.8]]) K.beam('char:stone', [gx + hx, gy + 13, hz], [gx + hx, gy + 13 - len * 1.6, hz], 0.14);
    for (let b = -8.5; b <= 8.51; b += 0.85) { const top = gy + 13 - Math.max(0, Math.abs(b) - 3.5) * 0.9; K.box('iron', gx - 7.6, top - 2.6, b, 0.08, Math.max(0.4, 2.6 - (gy + 13 - top)), 0.08, 0, { collide: false }); }
    // (Its head machicolated: the parapet carried out on corbels over the way in, merlons on it, his red down its face.)
    K.box(S, gx, gy + 53, 0, 11.2, 3.4, 11.6, 0, { collide: false });
    for (let b = -10.4; b <= 10.41; b += 1.6) for (const e of [-1, 1]) K.box('dark:stone', gx + e * 10.3, gy + 51.2, b, 1.0, 1.8, 0.28, 0, { collide: false });
    for (let b = -10; b <= 10.01; b += 2.5) K.box(S, gx - 10.6, gy + 56.4, b, 0.6, 1.6, 0.6, 0, { collide: false });
    // (His war banners down it, the PH2 pack's: his horned skull, the wings.)
    for (const zc of [-5.4, 5.4]) K.quad(BANNER, [gx - 11.3, gy + 52.5, zc - 2.5], [gx - 11.3, gy + 52.5, zc + 2.5], [gx - 11.3, gy + 45, zc + 2.5], [gx - 11.3, gy + 45, zc - 2.5], [-1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  // A brazier: an iron bowl of his fire on a dark stone pillar, tapering.
  const brazier = (bx, bz, h = 2.4) => { const by = Y(bx, bz); K.drum('dark:stone', bx, by - 0.3, bz, 0.75, h + 0.3, 4, { r2: 0.5, turn: Math.PI / 4 }); K.drum('iron', bx, by + h, bz, 0.45, 0.7, 8, { r2: 1.0, open: true, collide: false }); fire(K, bx, by + h + 0.3, bz, 0.62, 2.1); (K.lamps ||= []).push({ p: [bx, by + h + 1.6, bz], c: [1, 0.42, 0.18], r: h > 3 ? 36 : 26, i: h > 3 ? 70 : 44, flicker: 0.35 }); };
  for (const s of [-1, 1]) brazier(gx - 15, s * 12.5, 3.2);
  // (The braziers' red thrown up the drums' faces at night, from low by each: so the castle's threshold is two lit towers
  // and a mouth between, not a void. Big, so it wins one of the frame's lights from all down the Approach.)
  for (const s of [-1, 1]) (K.lamps ||= []).push({ p: [gx - 18.5, gy + 2.5, s * 22], c: [1, 0.4, 0.16], r: 56, i: 320, flicker: 0.25, prio: 60 });
  // (And a lantern hung in the passage's vault on a chain, an iron cage with a fire in it, so the way in is a red mouth at
  // night and not a hole. Bars down the cage, none across.)
  for (const lx of [gx - 4, gx + 4]) {
    const ly = gy + 7.4;
    K.beam('iron', [lx, ly + 1.1, 0], [lx, gy + 13, 0], 0.035);
    K.cone('iron', lx, ly + 0.95, 0, 0.42, 0.35, 6); K.drum('iron', lx, ly - 0.1, 0, 0.3, 0.12, 6, { collide: false });
    for (let k = 0; k < 6; k++) { const t = k / 6 * TAU; K.box('iron', lx + Math.cos(t) * 0.33, ly, Math.sin(t) * 0.33, 0.025, 0.95, 0.025, 0, { collide: false }); }
    K.cone('flame', lx, ly + 0.02, 0, 0.2, 0.62, 5);
    (K.lamps ||= []).push({ p: [lx, ly + 0.4, 0], c: [1, 0.5, 0.22], r: 24, i: 90, flicker: 0.3, prio: 40 });
  }
  // (And fires down both its walls in iron baskets on brackets out from the stone, so from all down the Approach the way in is
  // a lit passage, the goal at the top of the climb, and not a slot: the critics. Each its basket's bars up, none across.)
  for (const s of [-1, 1]) for (const bx of [gx - 6.5, gx, gx + 6.5]) {
    const by = gy + 4.6, bz = s * 8.3;
    K.box('iron', bx, by - 0.5, s * 8.85, 0.09, 0.5, 0.55, 0, { collide: false });
    K.drum('iron', bx, by, bz, 0.22, 0.5, 6, { r2: 0.42, open: true, collide: false });
    fire(K, bx, by + 0.3, bz, 0.3, 1.1);
  }
  for (const s of [-1, 1]) (K.lamps ||= []).push({ p: [gx - 3, gy + 5.4, s * 7.4], c: [1, 0.46, 0.2], r: 22, i: 60, flicker: 0.35, prio: 30 });
  // The Approach: flagged down its crown, a low parapet along both edges (broken every so often, so what's on the slopes
  // can come up), and pillars of fire in pairs up its top half: from where the King's Mile, slanting up onto it, has come
  // into its middle (src/core/lands.js ROUTES), so nothing stands in the road.
  for (let x = 10452; x < gx - 12; x += 8) K.paving('p2_bone_joint_flags', x + 4, 0, 4.05, 9.5, 0, 0.08);
  for (let x = 10632; x < APPROACH_WALL - 30; x += 48) for (const s of [-1, 1]) K.wall('dark:stone', x, s * 12.6, Math.min(x + 40, APPROACH_WALL - 30), s * 12.6, 0.8, 1.15);
  // The causeway walled: a retaining wall each side from the ground below to the road, a parapet on it, buttresses down
  // its face every twenty metres, a dark course at its foot. (Its ground falls sheer: src/core/east.js.)
  // (The embankment below the walls, down both sides of the Approach's lower half, bare gravel slopes and nothing on them:
  // rubble and fallen blocks down it, more toward its foot, and dark scree. The critics.)
  if (!K.lean) for (let x = 10470; x < APPROACH_WALL - 20; x += 7) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const h = hash2(Math.round(x) * 3 + k, s * 17), zz = s * (15.5 + 22 * hash2(Math.round(x) + k * 7, s * 5)), xx = x + 5 * hash2(Math.round(x), k + 9);
    if (h > 0.7) continue;
    const y = Y(xx, zz), rr = 0.35 + 1.1 * hash2(Math.round(xx), Math.round(zz)) ** 2;
    if (h < 0.25) K.box('dark:rubble', xx, y - rr * 0.4, zz, rr * 1.2, rr * 1.1, rr * 0.8, h * 20, { collide: false });
    else K.drum('soot:rubble', xx, y - rr * 0.3, zz, rr, rr * 0.8, 5, { r2: rr * 0.55, collide: false });
    if (h < 0.4) K.disc('dark:rubble', xx + s * 1.5, y + 0.05, zz + s * 1.2, rr * 2.2, 7);
  }
  for (let x = APPROACH_WALL - 30; x < gx - 14; x += 12) {
    const xc = Math.min(x + 6, gx - 14), hx = Math.min(6, (gx - 14 - x) / 2), road = Y(xc, 0);
    for (const s of [-1, 1]) {
      const foot = Math.min(Y(xc, s * 22), road) - 1.5;
      K.box('soot:p2_bridge_ashlar', xc, foot, s * 14.2, hx + 0.02, road - foot + 1.2, 0.8, 0);
      K.box('p2_curtain_granite', xc, road + 1.2, s * 14.2, hx + 0.06, 0.22, 0.95, 0, { collide: false });
      K.box('dark:block', xc, foot, s * 14.6, hx + 0.03, 1.6, 0.5, 0, { collide: false });
      if (Math.round(x / 12) % 2 === 0 && road - foot > 4) K.box('soot:p2_bridge_ashlar', x, foot, s * 15.6, 1.3, road - foot - 0.6, 1.2, 0, { collide: false });
    }
  }
  for (let x = 10640; x < gx - 24; x += 24) for (const s of [-1, 1]) brazier(x, s * 10.8, 2.6);

  // ---- the Lower Ward (+120): the working castle
  // His mark in the yard, where the flagged way from the gate ends under the Middle Ward's wall: a ring of black iron as
  // tall as four men on a stepped plinth, two horns of his fire out of its top. (A ring and two horns: no letter. The same
  // as on his gates inside: src/core/delve-build.js mark.) What the yard is walked toward, and seen from the gate.
  { const mx = 10902, mz = 0, my = Y(mx, mz), r = 6.4, top = my + 3.2;
    K.drum('dark:stone', mx, my - 0.4, mz, 9, 1.2, 12); K.drum('dark:stone', mx, my + 0.8, mz, 7.4, 1.2, 12, { collide: false }); K.drum('dark:stone', mx, my + 2, mz, 6, 1.2, 12, { collide: false });
    // (A round of his red behind it, so the black ring shows from the gate: slices, widest at the middle; a slab of dark stone at its back.)
    const R = r * 1.22;
    // (Its back a round of dark stone, wider than the red: slices, as the red is. The ring black glass on iron, thirty pieces.)
    { const RB = R * 1.2; for (let i = 0; i < 13; i++) { const v = -RB + (i + 0.5) * RB * 2 / 13; K.box('char:stone', mx + 1.1, top + r + v - RB / 13, mz, 0.45, RB * 2 / 13, Math.sqrt(RB * RB - v * v), 0, { collide: false }); } }
    for (let i = 0; i < 11; i++) { const v = -R + (i + 0.5) * R * 2 / 11; K.box('cloth_red', mx + 0.6, top + r + v - R / 11, mz, 0.06, R * 2 / 11, Math.sqrt(R * R - v * v), 0, { collide: false }); }
    for (let k = 0; k < 30; k++) { const a = k / 30 * TAU, a2 = (k + 1) / 30 * TAU; K.beam('obsidian', [mx, top + r + Math.sin(a) * r, mz + Math.cos(a) * r], [mx, top + r + Math.sin(a2) * r, mz + Math.cos(a2) * r], 0.62); }
    for (const sg of [-1, 1]) { K.cone('blood:flame', mx, top + r * 1.82, mz + sg * r * 0.55, 0.8, 5.4, 5); fire(K, mx, top + r * 1.82, mz + sg * r * 0.55, 1.5, 4.4, 'blood:flame'); }
    (K.lamps ||= []).push({ p: [mx - 6, top + r, mz], c: [1, 0.25, 0.1], r: 46, i: 160, flicker: 0.2, prio: 50 });
    for (const sg of [-1, 1]) { K.drum('dark:stone', mx - 7.6, my - 0.3, mz + sg * 7.6, 0.9, 3.4, 6, { r2: 0.6 }); K.drum('char:stone', mx - 7.6, my + 3.1, mz + sg * 7.6, 0.5, 0.6, 8, { r2: 0.95, collide: false }); fire(K, mx - 7.6, my + 3.7, mz + sg * 7.6, 0.7, 1.9, 'blood:flame'); }
  }
  // The way's fires, and the door's (YARD_FIRES): the far build's, so they move. Their bowls are the near cells'.
  for (const [fx, fz, big] of YARD_FIRES) fire(K, fx, Y(fx, fz) + (big ? 5.3 : 2.9), fz, big ? 0.9 : 0.55, big ? 2.6 : 1.5, 'blood:flame');
  // The castle's door, the way in to the Lower Ward (src/core/delve-castle.js portal), against the north drum's yard face:
  // the yard's one warm light, and a wash of it up the drum, so it's found from the gate.
  (K.lamps ||= []).push({ p: [10811, Y(10811, 22) + 3.5, 22], c: [1, 0.62, 0.3], r: 34, i: 90, flicker: 0.25, prio: 40 });
  // A low wall across the yard a third of the way up it, a gap for the way and a guard post either side of the gap: the
  // walk from the gate to his mark in two beats.
  for (const s of [-1, 1]) {
    K.wall(B, 10852, s * 13, 10852, s * 60, 1.4, 3.2, { crenel: true });
    // (And a neck out of the gate: two walls a man and a half high, so the yard opens as you come out between them.)
    K.wall(B, gx + 10, s * 10.5, gx + 24, s * 10.5, 1.2, 5.5, { crenel: true });
    fire(K, 10852, Y(10852, s * 13) + 12.4, s * 13, 0.7, 2, 'blood:flame');
    K.drum(C, 10852, Y(10852, s * 13) - 1, s * 13, 2.6, 8, 8); K.cone(RT, 10852, Y(10852, s * 13) + 7, s * 13, 3.2, 5, 8);
  }
  const y0 = wardY(0), y1 = wardY(1), y2 = wardY(2);
  hall(K, B, R, 10850, Y(10850, 150) - 2, 150, 44, 22, 12, 0.25);            // the Barracks and Drill Halls
  hall(K, B, R, 10880, Y(10880, 215) - 2, 215, 30, 16, 10, 0.25);            // the Armoury
  K.box(B, 10835, Y(10835, 235) - 2, 235, 14, 18, 12, 0.25); for (const dx of [-7, 7]) K.drum(C, 10835 + dx, Y(10835, 235) + 16, 235, 2.6, 22, 8, { collide: false });   // the Forge and its stacks
  hall(K, B, R, 10850, Y(10850, -150) - 2, -150, 40, 20, 13, -0.25);         // the Kitchens and Cellars
  hall(K, B, R, 10890, Y(10890, -215) - 2, -215, 26, 14, 9, -0.25);          // the Servants' Warren
  // (The Oubliettes' stair tower at (10905, 75) is castleWallTowers' too. And the few of the walls' towers that can't be
  // gone into, as they were.)
  for (const t of castleWallTowers()) if (t.plain) tower(K, t.layer, t.x, t.z, t.r, t.h, t.roof, t.o);
  // The Aqueduct: a run of arches from the north side out over the cliff, dropping into the city's High Conduits.
  for (let i = 0; i < 9; i++) { const x = 10830 - i * 22, z = -110 - i * 7, top = y0 + 26; K.box(S, x, Y(x, z) - 2, z, 3, top - Y(x, z) + 2, 4, 0.3, { collide: false }); K.box(S, x + 11, top - 3, z - 3.5, 11.2, 5, 3, 0.3, { collide: false }); }

  // ---- the Middle Ward (+175): the halls
  hall(K, S, R, 11040, y1 - 2, 0, 52, 52, 19, 0, { pitch: 1 });               // the Great Hall
  // The Ancient Library: the biggest room in the castle, a great nave with a glazed end and a stair tower at each corner.
  hall(K, S, R, 11050, y1 - 2, -150, 62, 96, 34, 0.12, { pitch: 0.9, ends: [5, 0], lit: 0.8 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tower(K, C, 11050 + sx * 64, -150 + sz * 36, 7, 124, RT, { y: y1, steep: 3.4, collide: false });
  hall(K, S, R, 10985, y1 - 2, -70, 12, 28, 40, 0, { pitch: 0.5, buttress: false });   // the Portrait Gallery, a long wing
  K.box(S, 11110, y1 - 2, -70, 22, 34, 18, 0); K.drum('dark:stone', 11110, y1 + 32, -70, 12, 4, 12, { collide: false });   // the Map Room
  hall(K, S, R, 11030, y1 - 2, 120, 40, 36, 15, -0.1);                        // the Alchemists' Wing
  K.box('obsidian', 11085, y1 - 2, 190, 26, 22, 16, -0.1); K.drum('dark:stone', 11085, y1 + 20, 190, 15, 2, 14, { collide: false }); K.cone('obsidian', 11085, y1 + 22, 190, 15, 16, 14);   // the Conservatory of Dead Plants: glass
  hall(K, B, R, 11000, y1 - 2, 200, 34, 24, 14, -0.3, { buttress: false });   // the Menagerie
  // The Clock Tower and the Horn Galleries' campanile: two square shafts, the tallest things below the Keep. (Horns, not
  // bells: the bell is Tessariel's.)
  for (const [x, z, half, h, name] of [[11105, 75, 11, 190, 'clock'], [11140, 135, 8, 220, 'horns']]) {
    K.box(S, x, y1 - 2, z, half, h, half, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.spike(RT, x + sx * half, y1 + h - 2, z + sz * half, 2.4, 22, 4, Math.PI / 4);
    K.cone(RT, x, y1 + h - 2, z, half * 1.25, half * 4.5, 4, Math.PI / 4);
    if (name === 'clock') for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) K.drum('eve:flame', x + nx * (half + 0.2), y1 + h - 24, z + nz * (half + 0.2), 6, 0.4, 16, { collide: false });
    else K.box('dark:stone', x, y1 + h - 34, z, half + 1.5, 3, half + 1.5, 0, { collide: false });
  }

  // ---- the High Ward: his own. Its halls stand on the Keep's body's first two steps (STEPS), round the trunk's foot.
  const t1 = PLAIN + 300, t2 = PLAIN + 372, kx = KEEP.x + 40;
  hall(K, S, R, kx - 20, t1, -148, 84, 62, 17, 0, { pitch: 1.2, collide: false });        // the Sanctuaries: the black nave, along the north terrace
  for (const s of [-1, 1]) tower(K, C, kx - 106, -148 + s * 13, 7, 128, RT, { y: t1, steep: 4.4, collide: false });
  hall(K, S, R, kx - 10, t1, 148, 80, 50, 17, 0, { pitch: 0.9, collide: false });         // the Hall of Mirrors, along the south
  hall(K, S, R, kx + 136, t1, -70, 12, 44, 40, 0, { pitch: 0.6, collide: false });        // the Ossuary Chapel, on the east terrace
  K.box(B, kx + 136, t1, 70, 12, 36, 34, 0, { collide: false });                          // the Generals' Crypt's house
  K.box(B, kx + 70, t2, 108, 24, 40, 12, 0, { collide: false }); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.spike(RT, kx + 70 + sx * 24, t2 + 40, 108 + sz * 12, 3, 22, 4, Math.PI / 4);   // the Treasury
  { const ox = kx + 96, oz = -100; K.drum(C, ox, t2, oz, 20, 56, 16, { collide: false }); K.drum('dark:stone', ox, t2 + 56, oz, 20, 5, 16, { r2: 16, collide: false }); K.cone(RT, ox, t2 + 61, oz, 16, 16, 16); }   // the Observatory's drum and dome
  K.box(S, KEEP.x - 76, y2 - 2, 0, 22, t1 - y2 + 30, 34, 0, { collide: false });            // the Throne Antechambers, at the trunk's foot, with the stair up through the body
}

// ---------------------------------------------------------------- the Keep

// The Keep's body: four steps of masonry, [half across (east-west), half through, foot, top] over the plain, each set back.
export const STEPS = [[150, 168, KEEP.base - 8, 300], [122, 128, 300, 372], [94, 94, 372, 442], [68, 66, 442, 506]];
// Where each step's stair stands along its west face (z), clear of the Antechambers and each other.
export const STAIR_Z = [0, -84, 62, -44];
// The five spires round the trunk: [key, x, z, radius, foot, top] (over the plain), each higher than the last, the way up.
const SPIRE_SIDES = { ember: 8, bone: 6, blood: 8 };
export const SPIRES = [
  ['ember', 11150, -128, 23, 235, 410], ['storm', 11268, -168, 22, 300, 480], ['bone', 11368, -70, 21, 360, 540],
  ['shadow', 11374, 84, 20, 420, 595], ['blood', 11262, 168, 20, 470, 640],
];
export function phobosKeep(K) {
  // (The PH2 pack's: the Keep's basalt, near black ('char'), its fins, bands and galleries the same in soot, fish-scale slate
  // on its cones. The bone-inlaid stone made its fins a tan palisade from the city: not here.)
  // (Soot, not char: charred, the basalt went flat black. Its bridges and stairs in the ashlar charred, as dark as the
  // walls they cross: a paler bridge over a face in shadow read as a cross from the gate. The critics, round 3; the V/T rule.
  // Dark, not char: a deck's top catches the sky, and charred it still showed pale on the black.)
  const S = 'soot:p2_keep_basalt', C = 'soot:p2_keep_basalt', R = 'soot:p2_fishscale_slate', G = 'soot:p2_keep_basalt', KB = 'dark:p2_bridge_ashlar';
  const x = KEEP.x, z = KEEP.z, base = PLAIN + KEEP.base, P = (h) => PLAIN + h;
  // The Keep's own body: three great steps of masonry on the High Ward, each set back from the one under it, arcaded down
  // their faces and turreted at their corners. The trunk rises through them and the spires stand round them: without it
  // the Keep is a handful of pencils. (The High Ward's halls stand on its lower steps: phobosCastle.)
  STEPS.forEach(([hx, hz, a, b], i) => {
    const cx = x + 40 - i * 8;
    const foot = i === 0 ? PLAIN + 165 : P(a);   // (the first goes down into the rock: it overhangs the Middle Ward)
    // (Its walls half a step lighter than its fins and cornices: in the same soot the bays between went black in any shade,
    // a grid of holes, scaffolding round nothing, from the yard. The critics.)
    // (Its own stone, untinted: sooted or dark, its faces were a black cut-out at ten in the morning. The critics, 2026-11-20.)
    K.box('p2_keep_basalt', cx, foot, z, hx, P(b) - foot, hz, 0, { collide: false });
    // (Solid from the side, stood on from above: t, the top less a step, as the portals' terraces have it.)
    K.colliders.push({ x: cx, z, hx, hz, yaw: 0, h: P(b) - Y(cx, z), t: P(b) - 0.45 });
    walk(K, [[cx, z, hx, hz, 0, P(b)]]);
    const fins = (len) => Math.max(3, Math.round(len / 9));
    for (const sd of [-1, 1]) {
      // (Fins a metre and a half proud, not three: in the afternoon sun the deep ones threw a grid of black shadow across
    // every bay, holes in a frame, scaffolding, from the yard and the city. The critics, pass 1.)
    for (let k = 0, n = fins(hx); k <= n; k++) { const fx = cx - hx + 2 * hx * k / n; K.box(G, fx, P(a), z + sd * (hz + 0.6), 1.4, (b - a) * 0.84, 0.9, 0, { collide: false }); K.spike(R, fx, P(a) + (b - a) * 0.84, z + sd * (hz + 0.8), 1.5, 9, 4, Math.PI / 4); }
      for (let k = 0, n = fins(hz); k <= n; k++) { const fz = z - hz + 2 * hz * k / n; K.box(G, cx + sd * (hx + 0.6), P(a), fz, 0.9, (b - a) * 0.84, 1.4, 0, { collide: false }); K.spike(R, cx + sd * (hx + 0.8), P(a) + (b - a) * 0.84, fz, 1.5, 9, 4, Math.PI / 4); }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { K.drum(C, cx + sx * hx, P(a), z + sz * hz, 7, b - a + 18, 10, { collide: false }); K.cone(R, cx + sx * hx, P(b) + 18, z + sz * hz, 8, 26, 10); }
    // (A row of merlons round each step's lip.)
    K.box(G, cx, P(b), z, hx + 1.5, 2.4, hz + 1.5, 0, { collide: false, top: false });
    // (Storeys: a cornice every twelve metres, and a window to each bay between the fins on every one of them, one in
    // twelve lit at evening: three hundred metres of wall reads as a building, not a crate.)
    if (!K.lean) {
      for (let yy = P(a) + 12; yy < P(b) - 5; yy += 12) K.box(G, cx, yy, z, hx + 0.6, 0.9, hz + 0.6, 0, { collide: false, top: false });
      // (Not every bay the same, or it's an office block: some blind, some a pair of tall slits, some a window running
      // most of the storey's height, now and then one with a balcony on corbels under it.)
      const pane = (wx, wy, wz, nx, nz, w, h, lit) => { const ax = nz * w, az = -nx * w; K.quad(lit ? 'eve:flame' : 'slate:iron', [wx - ax, wy, wz - az], [wx + ax, wy, wz + az], [wx + ax, wy + h, wz + az], [wx - ax, wy + h, wz - az], [nx, 0, nz]); };
      const win = (wx, wy, wz, nx, nz, v, lit) => {
        if (v < 0.16) return;
        if (v < 0.32) { for (const e of [-0.6, 0.6]) pane(wx + nz * e, wy - 1, wz - nx * e, nx, nz, 0.22, 7.2, lit); return; }
        if (v > 0.88) { pane(wx, wy, wz, nx, nz, 0.75, 7.4, lit); return; }
        pane(wx, wy, wz, nx, nz, 0.75, 3.6, lit);
        if (v > 0.82) { const bxh = nz ? 1.8 : 0.9, bzh = nz ? 0.9 : 1.8; K.box(G, wx + nx * 0.9, wy - 0.7, wz + nz * 0.9, bxh, 0.45, bzh, 0, { collide: false }); K.box(G, wx + nx * 1.7, wy - 0.25, wz + nz * 1.7, nz ? 1.8 : 0.12, 1.0, nz ? 0.12 : 1.8, 0, { collide: false }); }
      };
      for (let yy = P(a) + 3.5; yy + 5 < P(b) - 3; yy += 12) for (const sd of [-1, 1]) {
        const nX = fins(hx), nZ = fins(hz);
        for (let k = 0; k < nX; k++) win(cx - hx + 2 * hx * (k + 0.5) / nX, yy, z + sd * (hz + 0.04), 0, sd, hash2(k * 5 + i * 3, Math.round(yy) * 2 + sd), hash2(k * 7 + i, Math.round(yy) + sd) < 0.085);
        for (let k = 0; k < nZ; k++) win(cx + sd * (hx + 0.04), yy, z - hz + 2 * hz * (k + 0.5) / nZ, sd, 0, hash2(k * 9 + i * 3, Math.round(yy) * 2 - sd), hash2(k * 11 + i, Math.round(yy) - sd) < 0.085);
      }
    }
  });
  // The great stairs: up the west face of each step to its top, in flights that double back (STAIRS). The first climbs from
  // the Middle Ward, under the patio, to the first step's top; then one to each step above. The carve-out's way up: the
  // spires' own ways, and the stair inside the body, come with the Keep's section.
  STEPS.forEach(([hx, , , b], i) => {
    const face = x + 40 - i * 8 - hx, from = i === 0 ? Y(face - 8, STAIR_Z[i]) : P(STEPS[i - 1][3]);
    // (In the charred ashlar: the basalt's cream mortar on every tread made a pale zigzag across his dark face.)
    stairs(K, KB, face, STAIR_Z[i], from, P(b));
  });
  // The Throne Tower: a trunk in four stages, each narrower, a gallery where each begins, and a crown of eight pinnacles
  // round the last with the spire in the middle of them.
  const stages = [[54, KEEP.base - 12, 400], [43, 400, 500], [33, 500, 580], [24, 580, 630]];
  stages.forEach(([r, a, b], i) => {
    K.drum(S, x, P(a), z, r, b - a, 20, { collide: i === 0 });
    K.drum(G, x, P(b) - 5, z, r, 2, 20, { r2: r + 3.5, open: true, collide: false }); K.drum(G, x, P(b) - 3, z, r + 3.5, 4, 20, { open: true, collide: false });
    // (Buttress fins up each stage, eight round.)
    for (let k = 0; k < 8; k++) { const t = k / 8 * TAU + i * 0.39; K.box(G, x + Math.cos(t) * (r + 1.5), P(a), z + Math.sin(t) * (r + 1.5), 2.6, (b - a) * 0.9, 1.6, -t, { collide: false }); K.spike(R, x + Math.cos(t) * (r + 2.6), P(a) + (b - a) * 0.9, z + Math.sin(t) * (r + 2.6), 2.2, 16, 4, t); }
    if (!K.lean) for (let yy = P(Math.max(a, 240)) + 6, j = 0; yy + 8 < P(b) - 6; yy += 16, j++) for (let k = 0; k < 10; k++) {
      const t = (2 * k + (j & 1) + 0.5) / 20 * TAU, d = r * Math.cos(Math.PI / 20) + 0.05, cx = x + Math.cos(t) * d, cz = z + Math.sin(t) * d, tx = -Math.sin(t) * 0.8, tz = Math.cos(t) * 0.8;
      K.quad(hash2(k + i * 10, j) < 0.12 ? 'eve:flame' : 'iron', [cx - tx, yy, cz - tz], [cx + tx, yy, cz + tz], [cx + tx, yy + 4.6, cz + tz], [cx - tx, yy + 4.6, cz - tz], [Math.cos(t), 0, Math.sin(t)]);
    }
  });
  for (let k = 0; k < 8; k++) { const t = k / 8 * TAU; K.drum(C, x + Math.cos(t) * 21, P(630), z + Math.sin(t) * 21, 2.8, 16, 8, { collide: false }); K.cone(R, x + Math.cos(t) * 21, P(646), z + Math.sin(t) * 21, 3.4, 18, 8); }
  // (His red in runs of slits up the trunk's west half, lit day and night, and three of his banners down the patio's lip:
  // at ten in the morning the Keep was a black cut-out from the yard. The critics, 2026-11-20.)
  if (!K.lean) {
    for (const [r, a, b] of stages) for (let k = 0; k < 5; k++) {
      const t = Math.PI + (k - 2) * 0.42, d = r * Math.cos(Math.PI / 20) + 0.08, cx = x + Math.cos(t) * d, cz = z + Math.sin(t) * d, tx = -Math.sin(t) * 0.45, tz = Math.cos(t) * 0.45;
      for (let yy = P(Math.max(a, 300)) + 8; yy + 4 < P(b) - 8; yy += 11) K.quad('blood:flame', [cx - tx, yy, cz - tz], [cx + tx, yy, cz + tz], [cx + tx, yy + 3.4, cz + tz], [cx - tx, yy + 3.4, cz - tz], [Math.cos(t), 0, Math.sin(t)]);
    }
    for (const zc of [-62, 0, 62]) hangBanner(K, x - 184 - 74 - 0.5, P(298), z + zc, [-1, 0], 8, 46, 5);
  }
  K.cone('p2_bronze_plates', x, P(630), z, 17, KEEP.top - 630, 16);
  // His balcony, west, at the last stage's foot, looking down the whole of it to the Sill; and the fire in the crown.
  K.box(G, x - 38, P(578), z, 10, 2, 14, 0, { collide: false }); for (const s of [-1, 1]) K.spike(G, x - 43, P(578), z + s * 9, 2.6, -16, 4, 0);
  K.drum('blood:flame', x, P(604), z, 24.3, 9, 20, { open: true, collide: false });
  for (let k = 0; k < 12; k++) { const t = (k + 0.5) / 12 * TAU; K.box(C, x + Math.cos(t) * 24.4, P(603.5), z + Math.sin(t) * 24.4, 1.7, 10, 1.7, -t, { collide: false }); }
  hangBanner(K, x - 54.4, P(396), z, [-1, 0], 14, 130, 12);
  // The way up the trunk's outside from the body's top step: a stair winding round its third stage, by a gallery at 560
  // where the Blood Spire's bridge lands, to the gallery at its head; then round the fourth to the crown's floor.
  { let a = Math.PI + 0.9;
    a = spiral(K, G, x, z, 35.6, P(STEPS[3][3]), P(560), a, 1, { enclose: S }); ring(K, G, x, z, 32.5, 38.6, P(560));
    a = spiral(K, G, x, z, 35.6, P(560), P(580), a, 1, { enclose: S }); ring(K, G, x, z, 23, 38.6, P(580));
    a = spiral(K, G, x, z, 26.6, P(580), P(630), a, 1, { enclose: S }); ring(K, null, x, z, 0, 29, P(630)); }
  // The Grand Patio (the Crown Court): the first step's top carried on out west over the Middle Ward on tall piers, 190 m
  // wide, a row of pinnacles along its lip.
  // (Its deck and slab are cut open over the first great stair, which climbs up through it at its east edge: laid whole, the
  // patio's floor ran on over the stairwell, so the stair was climbed onto the patio and never walked down again, a body
  // up there walking on air over the flights and off the far edge: tools/paths/map.mjs.)
  { const py = P(300), px = x - 110 - 74, x0 = px - 74, x1 = px + 74, z0 = z - 104, z1 = z + 104;
    const [wx, , wz0, wz1] = patioWell();
    const pieces = [[x0, wx, z0, z1], [wx, x1, z0, wz0], [wx, x1, wz1, z1]];
    for (const [a0, a1, b0, b1] of pieces) K.box(G, (a0 + a1) / 2, py - 7, (b0 + b1) / 2, (a1 - a0) / 2, 7, (b1 - b0) / 2, 0, { collide: false });
    walk(K, pieces.map(([a0, a1, b0, b1]) => [(a0 + a1) / 2, (b0 + b1) / 2, (a1 - a0) / 2, (b1 - b0) / 2, 0, py]));
    for (const dx of [-66, -22, 22]) for (let k = -3; k <= 3; k++) { const fx = px + dx, fz = z + k * 33, fy = Y(fx, fz); K.box(S, fx, fy, fz, 5, py - 7 - fy, 5, 0, { collide: false }); if (k < 3) K.box(G, fx, py - 21, fz + 16.5, 3, 14, 12, 0, { collide: false }); }
    for (let i = -10; i <= 10; i++) K.spike(R, px - 73, py, z + i * 10, 2, 13, 4, 0);
    for (const sz of [-1, 1]) { K.drum(C, px - 70, py - 40, z + sz * 100, 9, 100, 10, { collide: false }); K.cone(R, px - 70, py + 60, z + sz * 100, 11, 40, 10); } }
  // The trunk's hanging turrets: bartizans corbelled out of its upper stages, each on a spike of masonry, and from the
  // three highest spires a second, higher bridge in to it.
  for (let k = 0; k < 6; k++) {
    const t = k / 6 * TAU + 0.5, hy = 470 + (k % 3) * 52, rr = hy < 500 ? 46 : hy < 580 ? 36 : 27, hx2 = x + Math.cos(t) * (rr + 4), hz2 = z + Math.sin(t) * (rr + 4);
    K.drum(C, hx2, P(hy), hz2, 6, 44, 10, { collide: false }); K.cone(R, hx2, P(hy) + 44, hz2, 7.4, 26, 10); K.spike(G, hx2, P(hy), hz2, 6, -22, 10, 0);
  }
  // The five spires, each with its own crown, and from each to the next the bridge, stair or balcony the layout names.
  const tops = [];
  for (const [key, sx, sz, r, foot, top] of SPIRES) {
    const fy = Math.min(Y(sx, sz), P(foot));
    K.drum(S, sx, fy - 4, sz, r + 3, P(foot) - fy + 4, 16, {});                        // its pier, down to the rock
    K.drum(C, sx, P(foot), sz, r, top - foot, SPIRE_SIDES[key] || 16, { collide: false, turn: 0.39 });
    for (const f of [0.34, 0.67]) K.drum(G, sx, P(foot) + (top - foot) * f, sz, r, 2, 16, { r2: r + 2.4, open: true, collide: false });
    K.drum(G, sx, P(top) - 6, sz, r, 3, 16, { r2: r + 4, open: true, collide: false }); K.drum(G, sx, P(top) - 3, sz, r + 4, 5, 16, { open: true, collide: false });
    K.cone(R, sx, P(top) + 2, sz, r + 4.6, r * 4.4, 16);
    for (let k = 0; k < 6; k++) { const t = k / 6 * TAU; K.spike(R, sx + Math.cos(t) * (r + 3.4), P(top) + 2, sz + Math.sin(t) * (r + 3.4), 1.8, 20, 4, t); }
    K.drum('blood:flame', sx, P(top) - 14, sz, r + 0.3, 4, 16, { open: true, collide: false });
    for (let k = 0; k < 8; k++) { const t = (k + 0.5) / 8 * TAU, w = Math.max(0.6, r * 0.2); K.box(C, sx + Math.cos(t) * (r + 0.35), P(top) - 14.4, sz + Math.sin(t) * (r + 0.35), w, 4.8, w, -t, { collide: false }); }
    tops.push([sx, sz, r, foot, top]);
    // The way up its outside: a stair winding round it from the highest of the body's steps it stands against, by a
    // gallery a third and two thirds of the way up, to the gallery under its crown, where its bridge leaves.
    const RS = r + 5.4, on = STEPS.map(([hx, hz, , b], i) => ({ cx: x + 40 - i * 8, hx, hz, b })).filter((q) => Math.abs(sx - q.cx) < q.hx + RS && Math.abs(sz - z) < q.hz + RS).at(-1);
    let y = P(on.b), a = Math.atan2(z - sz, on.cx - sx) - 0.2;
    // (And a gallery wherever a rim tower's or a Needle's bridge comes in: castleTowers.)
    for (const lv of castleTowers().towers.find((q) => q.key === key).levels.map(P)) {
      if (lv <= y + 1) continue;
      a = spiral(K, G, sx, sz, RS, y, lv, a, 1, { enclose: C }); ring(K, G, sx, sz, r - 0.5, RS + 2.4, lv); y = lv;
    }
    // Its viewing deck, under its crown where its bridge leaves: a broad round terrace carried out on corbels, a solid
    // parapet crowned with his V merlons all round, an iron brazier burning at each quarter: a place to stand and see the
    // whole city and the Sill beyond from. (The owner, 2026-11-19: "the spires ... need decks, viewing points at the top
    // with patios around them.")
    { const dy = P(top) - 20, RD = RS + 7;
      ring(K, G, sx, sz, r - 0.5, RD, dy);
      K.drum('dark:p2_bridge_ashlar', sx, dy - 0.02, sz, RD - 0.6, 0.04, 24, { r2: RD - 0.6, collide: false });
      for (let k = 0; k < 16; k++) { const t = (k + 0.5) / 16 * TAU; K.spike(G, sx + Math.cos(t) * (RD - 1.2), dy - 1.2, sz + Math.sin(t) * (RD - 1.2), 1.1, -6, 4, -t); }
      const segs = 28;
      // (Open where its bridge to the next leaves, from the deck's rim at the deck's height: laid from the spire's wall, under
      // the deck, the bridge came out past the parapet a metre and more under it, a step up and no step back. map.mjs.)
      const si = SPIRES.findIndex((q) => q[0] === key), nx = SPIRES[si + 1] || [null, x, z], ba = Math.atan2(nx[2] - sz, nx[1] - sx), gap = (5.5 / 2 + 0.6) / RD;
      for (let k = 0; k < segs; k++) {
        const t = (k + 0.5) / segs * TAU, px = sx + Math.cos(t) * (RD - 0.3), pz = sz + Math.sin(t) * (RD - 0.3), half = Math.PI * (RD - 0.3) / segs + 0.05;
        if (Math.abs(Math.atan2(Math.sin(t - ba), Math.cos(t - ba))) < gap + Math.PI / segs) continue;
        K.box(G, px, dy, pz, 0.3, 1.1, half, -t);
        if (!K.lean) K.vee(G, px, dy + 1.1, pz, 0.3, 1.3, half * 0.55, -t);
      }
      for (let k = 0; k < 4; k++) { const t = k / 4 * TAU + 0.4, bx = sx + Math.cos(t) * (RD - 2.4), bz = sz + Math.sin(t) * (RD - 2.4);
        K.drum('dark:stone', bx, dy, bz, 0.5, 1.4, 6, { r2: 0.35, collide: false }); K.drum('iron', bx, dy + 1.4, bz, 0.45, 0.6, 8, { r2: 0.9, open: true, collide: false }); fire(K, bx, dy + 1.7, bz, 0.55, 1.8);
        if (k === 0) (K.lamps ||= []).push({ p: [bx, dy + 3, bz], c: [1, 0.42, 0.18], r: 30, i: 60, flicker: 0.35 }); } }
  }
  tops.forEach(([ax, az, ar, , atop], i) => {
    const nx = tops[i + 1] || [x, z, 33, 0, 590], [bx, bz, br] = nx, bfoot = i < 4 ? tops[i + 1][3] + (tops[i + 1][4] - tops[i + 1][3]) * 0.34 : 560;
    const d = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / d, uz = (bz - az) / d;
    const ad = ar + 12.4 - 0.4;   // (from its viewing deck's rim, RD: see the deck)
    bridge(K, KB, [ax + ux * ad, P(atop) - 20, az + uz * ad], [bx - ux * br, P(bfoot), bz - uz * br], 5.5, { arch: 6, piers: true, walk: true, dress: true });
    // (Each spire's tie back to the Keep's body is walked now, to a step's lip: castleTowers.)
  });
  // The lesser towers: the satellites out on the crag's rim and between the spires, the turrets on the curtain and the
  // wards, the Needles beyond the rim, the Clock Tower and the Horn Tower's heads, the patio's two: every one with a stair
  // up it, a gallery where each bridge meets it and a deck under its crown, and every bridge between them walked
  // (castleTowers, climb, below; the owner, 2026-11-19: "access ... all the different towers within Castle Velscour, and
  // go across all the bridges").
  const CT = castleTowers();
  // (Their slate dark, in two bands: pale, a cone read as untextured. Their stone at three times its size on a shaft this
  // tall: at its own six metres it was a chain-link moire from anywhere. The critics, 2026-11-20.)
  const SL = 'soot:p2_fishscale_slate', SL2 = 'dark:p2_fishscale_slate', BIG = { tile: 3 };
  // A cone in two bands of slate, the lower a little lighter.
  const cone2 = (cx, cy, cz, r, h, sides) => { K.drum(SL, cx, cy, cz, r, h * 0.45, sides, { r2: r * 0.55, open: true, collide: false }); K.cone(SL2, cx, cy + h * 0.45, cz, r * 0.55, h * 0.55, sides); };
  // A tower's crown, one of five by its number: a cone with pinnacles; his V in a ring of merlons round a fire; a drum wider
  // than the shaft under a low cone; two horns, leaning out, a fire between; a broken crown, its merlons at all heights.
  const crown = (t, cx, cy, cz, r, kind) => {
    if (K.lean) { K.cone(SL, cx, cy, cz, r + 2.4, r * 4.4, 10); return; }
    if (kind === 0) { cone2(cx, cy, cz, r + 2.6, r * (4 + 2 * hash2(t.i || 0, 9)), 12); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; K.spike(SL2, cx + Math.cos(a) * (r + 1.8), cy, cz + Math.sin(a) * (r + 1.8), 1.1, 9, 4, a); } }
    else if (kind === 1) { for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * TAU; K.vee(G, cx + Math.cos(a) * (r + 1.4), cy, cz + Math.sin(a) * (r + 1.4), 1.5, 3.4, 0.5, -a + Math.PI / 2, 0.5); } K.drum('iron', cx, cy, cz, r * 0.3, 1.4, 8, { r2: r * 0.5, open: true, collide: false }); fire(K, cx, cy + 1, cz, r * 0.34, r * 0.9, 'blood:flame'); }
    else if (kind === 2) { K.drum(G, cx, cy - 1, cz, r + 1.6, 3, 12, { r2: r + 4.4, open: true, collide: false }); K.drum(C, cx, cy + 2, cz, r + 4.4, 7, 12, { collide: false }); K.drum('blood:flame', cx, cy + 4, cz, r + 4.45, 1.6, 12, { open: true, collide: false }); for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * TAU; K.box(C, cx + Math.cos(a) * (r + 4.5), cy + 3.8, cz + Math.sin(a) * (r + 4.5), 1.3, 2, 1.3, -a, { collide: false }); } cone2(cx, cy + 9, cz, r + 5, r * 2.2, 12); }
    else if (kind === 3) { const a = Math.atan2(cz - KEEP.z, cx - KEEP.x) + Math.PI / 2; for (const sg of [-1, 1]) K.spike(SL2, cx + Math.cos(a) * sg * r * 0.55, cy, cz + Math.sin(a) * sg * r * 0.55, r * 0.5, r * 4.6, 5, a, [Math.cos(a) * sg * 0.16, Math.sin(a) * sg * 0.16]); K.drum('iron', cx, cy, cz, r * 0.26, 1.2, 8, { r2: r * 0.42, open: true, collide: false }); fire(K, cx, cy + 0.9, cz, r * 0.3, r * 0.8, 'blood:flame'); }
    else { for (let k = 0; k < 9; k++) { const a = (k + 0.5) / 9 * TAU, hh = 1.2 + 7 * hash2(k * 3 + (t.i || 0), 41) ** 2; K.box(C, cx + Math.cos(a) * (r + 1.2), cy, cz + Math.sin(a) * (r + 1.2), 1.1, hh, 0.7, -a + Math.PI / 2, { collide: false }); } K.cone(SL2, cx + r * 0.2, cy, cz - r * 0.15, r * 0.7, r * 2.6, 6); }
  };
  // His red in slits up a shaft, a run of them on the side toward the city and one a third round: lit day and night, so
  // the castle isn't a black cut-out against the morning.
  const slits = (cx, cz, r, y0, y1, sides, turn = 0) => {
    if (K.lean) return;
    for (const off of [0, Math.ceil(sides / 3)]) {
      const i = ((Math.round((Math.PI - turn) / TAU * sides - 0.5) + off) % sides + sides) % sides, a = turn + (i + 0.5) / sides * TAU, d = r * Math.cos(Math.PI / sides) + 0.06, wx = cx + Math.cos(a) * d, wz = cz + Math.sin(a) * d, tx = -Math.sin(a) * 0.32, tz = Math.cos(a) * 0.32;
      for (let yy = y0 + 9; yy + 3 < y1 - 8; yy += 13) K.quad('blood:flame', [wx - tx, yy, wz - tz], [wx + tx, yy, wz + tz], [wx + tx, yy + 2.6, wz + tz], [wx - tx, yy + 2.6, wz - tz], [Math.cos(a), 0, Math.sin(a)]);
    }
  };
  K.soft = true;   // (their crowns' pinnacles and horns stop nothing: a phone, which has plain cones, is stopped by what a PC is)
  for (const t of CT.towers) {
    const { x: sx, z: sz, r, top, fy } = t;
    if (t.kind === 'sat') {
      // (A battered foot, a shaft that narrows a little to its head, a gallery, its crown.)
      const sides = t.square ? 4 : t.i % 3 ? 12 : 8, turn = t.square ? t.i + Math.PI / 4 : 0, rr = t.square ? r * 0.95 * Math.SQRT2 : r;
      K.drum(C, sx, fy - 4, sz, rr * 1.22, 14, sides, { r2: rr, collide: fy > PLAIN + 100, turn, ...BIG });
      K.drum(C, sx, fy + 10, sz, rr, P(top) - fy - 10, sides, { r2: rr * 0.94, collide: false, turn, ...BIG });
      K.drum(G, sx, P(top) - 5, sz, r, 2, 12, { r2: r + 2, open: true, collide: false }); K.drum(G, sx, P(top) - 3, sz, r + 2, 4, 12, { open: true, collide: false });
      crown(t, sx, P(top) + 1, sz, r, t.i % 5);
      slits(sx, sz, rr * 0.97, fy, P(top), sides, turn);
    } else if (t.kind === 'small') {
      K.drum(C, sx, fy - 3, sz, r * 1.15, P(top) - fy + 3, 10, { r2: r * 0.94, collide: false, ...BIG });
      K.drum(G, sx, P(top) - 3, sz, r, 3, 10, { r2: r + 1.6, open: true, collide: false });
      crown(t, sx, P(top), sz, r - 0.6, [0, 4, 1, 0, 3][(t.i >> 1) % 5]);
      slits(sx, sz, r, fy, P(top), 10);
    } else if (t.kind === 'needle') {
      // A Needle: a pier down to the rock, a shaft in two stages, each narrower; a head twice the shaft's width with his
      // fire in a band round it; and a crown of its own, no two alike, a beacon burning in every one.
      const mid = fy + (P(top) - fy) * 0.56, n = NEEDLES.findIndex((q) => q[0] === t.key), hd = P(top) - 15;
      K.drum(S, sx, fy - 4, sz, r + 3.4, mid - fy + 4, 10, { r2: r + 0.8, collide: false, ...BIG });
      K.drum(C, sx, mid, sz, r + 0.8, hd - mid, 10, { r2: r * 0.9, collide: false, turn: 0.31, ...BIG });
      K.drum(G, sx, mid - 2, sz, r + 1, 2.4, 10, { r2: r + 2.8, open: true, collide: false });
      K.drum(G, sx, hd - 4, sz, r * 0.9, 4, 12, { r2: r * 1.9, open: true, collide: false });
      K.drum(C, sx, hd, sz, r * 1.9, 13, 12, { collide: false });
      K.drum('blood:flame', sx, hd + 5, sz, r * 1.9 + 0.06, 3, 12, { open: true, collide: false });
      for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * TAU; K.box(C, sx + Math.cos(a) * (r * 1.9 + 0.1), hd + 4.6, sz + Math.sin(a) * (r * 1.9 + 0.1), 1.5, 3.8, 1.5, -a, { collide: false }); }
      const cy = hd + 13;
      if (n % 3 === 0) { cone2(sx, cy, sz, r * 1.9 + 0.8, r * 7, 12); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.6; K.spike(SL2, sx + Math.cos(a) * r * 1.7, cy, sz + Math.sin(a) * r * 1.7, 1.6, 19, 4, a); } }
      else if (n % 3 === 1) { const a = Math.atan2(sz - KEEP.z, sx - KEEP.x) + Math.PI / 2; for (const sg of [-1, 1]) K.spike(SL2, sx + Math.cos(a) * sg * r, cy, sz + Math.sin(a) * sg * r, r * 0.8, r * 6.5, 5, a, [Math.cos(a) * sg * 0.13, Math.sin(a) * sg * 0.13]); }
      else { for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * TAU; if (!K.lean) K.vee(G, sx + Math.cos(a) * (r * 1.9 - 0.6), cy, sz + Math.sin(a) * (r * 1.9 - 0.6), 1.9, 4.4, 0.6, -a + Math.PI / 2, 0.5); } K.cone(SL2, sx, cy, sz, r * 0.9, r * 4.4, 8); }
      // (Its beacon: the land's fire, so it moves; and a light the frame's twelve can take from afar.)
      fire(K, sx, cy + (n % 3 === 0 ? r * 7 : 1.2), sz, 1.6, 5.5, 'blood:flame');
      (K.lamps ||= []).push({ p: [sx, cy + 4, sz], c: [1, 0.22, 0.1], r: 70, i: 220, flicker: 0.3, prio: 20 });
      slits(sx, sz, r + 0.6, fy, hd - 6, 10);
    }
    // (The spires, the Clock Tower, the Horn Tower and the patio's two are drawn where they always were: above, phobosCastle.)
    if (t.kind !== 'spire') climb(K, t, null);
  }
  K.soft = false;
  for (const b of CT.bridges) bridge(K, KB, b.a, b.b, b.w, { arch: b.arch, piers: b.piers, walk: true, dress: true });
  // (Their decks' fires: the far build's, so they move. The braziers themselves are the near cells'.)
  for (const t of CT.towers) for (const [bx, by, bz] of deckFires(t)) fire(K, bx, by + 1.7, bz, 0.55, 1.8);
}

// ---------------------------------------------------------------- the castle's wall towers, gone into

// Whether the curtain's ring has a tower at its i-th corner: every third, but the gate's and the Sally Gate's.
const ringTower = (ring, i) => i % 3 === 0 && i !== SALLY && !(Math.abs(ring[i][1]) < 22 && ring[i][0] < CRAG.x);
// The towers on the castle's own walls, gone into as the city's are (src/core/phobos-towers.js takes these in after its own:
// a door toward the ward, a guardroom, a stair, a room over it, a chest): the outer curtain's fourteen, the Middle Ward
// wall's six, and the Oubliettes' stair tower in the Lower Ward. As tower()'s own: { key, kind, layer, x, z, r, h, roof, o, face }.
export function castleWallTowers() {
  const C = 'soot:p2_bridge_ashlar', RT = 'soot:p2_fishscale_slate', R = 'blood:p2_blood_tiles', out = [], ring = [];
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; ring.push([CRAG.x + Math.cos(a) * CRAG.a * 0.86, CRAG.z + Math.sin(a) * CRAG.b * 0.86]); }
  ring.forEach((p, i) => { if (ringTower(ring, i)) out.push({ key: `curtain${i}`, kind: 'guard', layer: C, x: p[0], z: p[1], r: 8, h: 48 + 14 * hash2(i, 4), roof: i % 2 ? RT : null, o: { steep: 2.6 }, face: Math.atan2(CRAG.z - p[1], CRAG.x - p[0]) }); });
  const x0 = WARDS[1][0];
  for (const s of [-1, 1]) {
    out.push({ key: `wardgate${s}`, kind: 'guard', layer: C, x: x0, z: s * 24, r: 13, h: 96, roof: RT, o: { steep: 2.4, sides: 16 }, face: 0 });
    for (const zz of [90, 170]) out.push({ key: `ward${s}_${zz}`, kind: zz > 100 ? 'counting' : 'guard', layer: C, x: x0 - s * zz * 0.22, z: s * zz, r: 9, h: 70, roof: zz > 100 ? R : null, o: {}, face: 0 });
  }
  out.push({ key: 'oubliette', kind: 'gaol', layer: C, x: 10905, z: 75, r: 11, h: 58, roof: null, o: {}, face: Math.PI });
  // (Five can't be gone into: the three of the curtain's that stand in the Keep's own body, and the two of the Middle Ward
  // wall's whose only free side is a hall's wall. They stand as they did, drawn by phobosCastle.)
  const decks = HIGH_DECKS();
  for (const t of out) t.plain = decks.some(([x0, x1, z0, z1]) => t.x > x0 - t.r && t.x < x1 + t.r && t.z > z0 - t.r && t.z < z1 + t.r) || t.key === 'ward-1_90' || t.key === 'ward-1_170';
  return out;
}

// ---------------------------------------------------------------- the castle's towers, climbed

// The satellites: lesser towers out on the crag's rim and between the spires, no two the same height. [x, z, radius, top over the plain]
const SAT = [
  [11070, -215, 13, 330], [11190, -246, 12, 372], [11316, -232, 13, 418], [11416, -150, 12, 455], [11440, 5, 14, 500], [11420, 160, 12, 468],
  [11326, 238, 13, 512], [11200, 250, 12, 440], [11075, 215, 13, 362], [11020, -70, 10, 348], [11020, 74, 10, 356], [11090, -14, 9, 330],
  [11330, -8, 11, 560], [11316, -112, 10, 520], [11330, 116, 10, 578], [11140, 82, 9, 420],
];
// The Needles (the owner, 2026-11-19: "even taller with even more towers, spires, lookouts, and tons of bridges"): six
// slender towers out past the rim, each taller than any satellite, round the Keep's east side from the north cliff to the
// south, bridged to the satellites they stand over, to each other and in to the spires. [key, name, x, z, radius, top]
const NEEDLES = [
  ['cinder', 'the Cinder Needle', 11150, -292, 9, 520], ['widow', "the Widow's Needle", 11370, -205, 9, 560], ['gallows', 'the Gallows Needle', 11468, -80, 10, 600],
  ['thorn', 'the Thorn Needle', 11462, 90, 9, 585], ['red', 'the Red Needle', 11372, 212, 9, 612], ['ash', 'the Ash Needle', 11140, 290, 9, 540],
];
const SAT_NAMES = ['the Larder Tower', "the Fletchers' Tower", 'the North Watch', 'the Crow Tower', 'the Sally Tower', 'the Gibbet Watch', 'the South Watch', "the Falconers' Tower", "the Tanners' Tower",
  "the Page's Tower", 'the Kitchen Tower', "the Steward's Tower", 'the Black Tower', "the Seneschal's Tower", "the Chamberlain's Tower", "the Ringers' Tower"];
const TURRETS = ['Lamp', 'Rook', 'Smoke', 'Thrush', 'Cistern', 'Spindle', 'Latch', 'Candle', 'Owl', 'Ember', 'Wicket', 'Shrike', 'Bucket', 'Starling', 'Moth'];
// What's walked on high up that isn't a tower: the Keep's four steps and the patio, as [x0, x1, z0, z1, top over the plain].
const HIGH_DECKS = () => [...STEPS.map(([hx, hz, , b], i) => [KEEP.x + 40 - i * 8 - hx, KEEP.x + 40 - i * 8 + hx, KEEP.z - hz, KEEP.z + hz, b]), [KEEP.x - 184 - 74, KEEP.x - 184 + 74, KEEP.z - 104, KEEP.z + 104, 300]];
// How a tower's climbed: its stair's radius and half-width, its galleries' outer edge, its deck's.
// (re: the tower's own reach, a square one's to its corners. Its stair is a turret stood against it: a tight stair round
// its own newel, TURN metres to a turn, so every flight ends where it began, facing the tower, and a gallery every TURN.)
const TURN = 9, RT = 2.7, HW = 1.35;
const stairOf = (t) => { const re = t.square ? t.r * 1.36 : t.r; return { re, rg: re + 3.3, rd: re + 5.6, dt: re + RT + HW + 0.45 }; };

// The well in the Grand Patio over great stair 0's head: [x0, x1, z0, z1]. (Its edges a hand over the head landing's, so
// there's no slot between them to drop through. Nothing's to stand in it: a stair turret put over it had no floor.)
export function patioWell() {
  const x = KEEP.x, z = KEEP.z, f0 = x + 40 - STEPS[0][0], P0 = stairPlan(f0, Y(f0 - 8, STAIR_Z[0]), PLAIN + STEPS[0][3]);
  const wx = P0.lanes[1] - P0.HW - 0.1, wz = P0.half + 5.0, zc = z + STAIR_Z[0];
  return [wx, x - 110, zc - wz, zc + wz];   // (east to the patio's own edge)
}
let TOWERS = null;
// Every lesser tower of the castle and every bridge between them: { towers: [{ key, kind, name, x, z, r, top, fy, cell,
// base (what its stair starts from, over the plain: the ground, a deck it stands through, or null: reached only by a
// bridge), levels (its galleries, over the plain), deck (its lookout's height) }], bridges: [{ a, b (ends, in the world),
// w, arch, piers }] }. A spire's are the stages phobosKeep winds its own stair by, and any gallery a bridge adds.
export function castleTowers() {
  if (TOWERS) return TOWERS;
  const x = KEEP.x, z = KEEP.z, T = [], B = [], decks = HIGH_DECKS();
  const baseOf = (sx, sz, fy) => {
    let b = null;
    for (const [x0, x1, z0, z1, top] of decks) if (sx >= x0 && sx <= x1 && sz >= z0 && sz <= z1) b = Math.max(b ?? -Infinity, top);
    // (Else the crag's own ground, where it stands inside the curtain; out on the cliff it has no foot to be walked to.)
    if (b === null && fy > PLAIN + 100 && Math.hypot((sx - CRAG.x) / CRAG.a, (sz - CRAG.z) / CRAG.b) < 0.84) b = fy - PLAIN;
    return b;
  };
  const add = (key, kind, name, sx, sz, r, top, o = {}) => { const fy = Y(sx, sz), t = { key, kind, name, x: sx, z: sz, r, top, fy, cell: cellOf(sx, sz), levels: [], base: baseOf(sx, sz, fy), ...o }; T.push(t); return t; };
  const spires = SPIRES.map(([key, sx, sz, r, foot, top]) => add(key, 'spire', `the ${key[0].toUpperCase()}${key.slice(1)} Spire`, sx, sz, r, top, { foot, levels: [foot + (top - foot) * 0.34, foot + (top - foot) * 0.67, top - 20] }));
  const sat = SAT.map(([sx, sz, r, top], i) => add(`sat${i}`, 'sat', SAT_NAMES[i], sx, sz, r, top, { i, square: i % 3 === 1 }));
  const small = [];
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU + hash2(i, 31) * 0.14, k = i % 4 === 3 ? 0.56 + 0.1 * hash2(i, 17) : 0.76 + 0.12 * hash2(i, 17), sx = CRAG.x + Math.cos(a) * CRAG.a * k, sz = CRAG.z + Math.sin(a) * CRAG.b * k;
    if (i % 2 || (Math.abs(sz) < 30 && sx < x - 60)) continue;    // (the way up from the gate is kept open)
    if (Math.hypot(sx - x, sz - z) < 70 || SPIRES.some((q) => Math.hypot(sx - q[1], sz - q[2]) < q[3] + 16) || sat.some((q) => Math.hypot(sx - q.x, sz - q.z) < 26)) continue;
    const fy = Y(sx, sz), r = 5.5 + 3 * hash2(i, 5), top = (fy - PLAIN) + 55 + 95 * hash2(i, 23);
    small.push(add(`small${i}`, 'small', `the ${TURRETS[small.length % TURRETS.length]} Turret`, sx, sz, r, top, { i }));
  }
  const needles = NEEDLES.map(([key, name, sx, sz, r, top]) => add(key, 'needle', name, sx, sz, r, top));
  // (The Clock Tower and the Horn Tower stand through the patio's east edge and the Keep's first step: only their heads
  // show over those, and it's their heads that are climbed. The patio's own two at its west corners.)
  const clock = add('clock', 'clock', 'the Clock Tower', 11105, 75, 11, WARDS[1][1] + 188, { square: true });
  const horns = add('horns', 'horns', 'the Horn Tower', 11140, 135, 8, WARDS[1][1] + 218, { square: true });
  const patio = [-1, 1].map((s) => add(`patio${s}`, 'patio', s < 0 ? 'the North Belvedere' : 'the South Belvedere', x - 184 - 70, z + s * 100, 9, 360));
  for (const t of [...sat, ...small, ...needles, clock, horns, ...patio]) {
    // (A Needle's under its head, which is twice its shaft across: a deck up in the head looked at the head's inside.)
    t.deck = t.kind === 'clock' ? t.top - 26 : t.kind === 'horns' ? t.top - 30 : t.kind === 'needle' ? t.top - 29 : t.top - (t.kind === 'small' ? 7 : 11);
    // (One whose head doesn't clear what it stands through is in the Keep's body: seen from outside, never climbed.)
    t.buried = t.base !== null && t.deck < t.base + 6;
    if (t.buried) continue;
    // Where its stair turret stands: the side nearest the way it should (toward the Keep on a deck, toward the crag's
    // middle on the ground, away from it out on the cliff) that's clear of every higher deck and every other tower.
    const s = stairOf(t), want = t.base !== null && t.base > 290 ? Math.atan2(z - t.z, x - t.x) : Math.atan2(CRAG.z - t.z, CRAG.x - t.x) + (t.base === null ? Math.PI : 0);
    const lo = t.base ?? -Infinity, R = RT + HW + 0.6, well = patioWell(), rectD = (px, pz, [x0, x1, z0, z1]) => Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(z0 - pz, 0, pz - z1));
    t.ta = null;
    for (let k = 0; k < 24 && t.ta === null; k++) {
      const a = want + ((k + 1) >> 1) * (k & 1 ? -1 : 1) * TAU / 24, cx = t.x + Math.cos(a) * s.dt, cz = t.z + Math.sin(a) * s.dt;
      if (decks.some((d) => d[4] > lo + 1 && rectD(cx, cz, d) < R)) continue;
      if (t.base !== null && t.base > 290 && !decks.some((d) => d[4] === t.base && cx > d[0] + R && cx < d[1] - R && cz > d[2] + R && cz < d[3] - R)) continue;
      if (t.base !== null && t.base > 290 && rectD(cx, cz, well) < R) continue;
      if (t.base !== null && t.base <= 290 && Math.hypot((cx - CRAG.x) / CRAG.a, (cz - CRAG.z) / CRAG.b) > 0.82) continue;
      if (T.some((q) => q !== t && Math.hypot(q.x - cx, q.z - cz) < (q.square ? q.r * 1.36 : q.r) + R + (q.kind === 'spire' ? 9 : 1))) continue;
      t.ta = a;
    }
    if (t.ta === null) { t.buried = true; continue; }
    t.tx = t.x + Math.cos(t.ta) * s.dt; t.tz = t.z + Math.sin(t.ta) * s.dt;
    t.from = t.base === null ? null : t.base > 290 ? PLAIN + t.base : Y(t.tx - Math.cos(t.ta) * RT, t.tz - Math.sin(t.ta) * RT);
  }
  // (A gallery's height on a tower: on its stair's own rhythm, a turn at a time from where it starts.)
  const lattice = (t, h) => { if (t.from === null) { t.from0 ??= h; return t.from0 + Math.round((h - t.from0) / TURN) * TURN; } const f = t.from - PLAIN; return f + Math.max(0, Math.round((h - f) / TURN)) * TURN; };
  for (const t of T) if (t.kind !== 'spire' && !t.buried && t.from !== null) t.deck = lattice(t, t.deck);
  // A bridge from a's gallery at ha to b's at hb (over the plain), end to end between their galleries' outer edges. An end
  // that would come in under what its tower stands through is lifted to land on that deck.
  const end = (t, h) => (t.kind === 'spire' ? h : Math.min(t.deck ?? Infinity, lattice(t, h)));
  const span = (a, ha, b, hb, o = {}) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / d, uz = (b.z - a.z) / d;
    if (a.buried || b.buried) return false;
    const ea = end(a, ha), eb = end(b, hb), ra = a.kind === 'spire' ? a.r : stairOf(a).rg - 1, rb = b.kind === 'spire' ? b.r : stairOf(b).rg - 1;
    if (Math.abs(eb - ea) / Math.max(1, d - ra - rb) > 0.62) return false;   // (steeper than a stair: not built)
    for (const [t, e] of [[a, ea], [b, eb]]) if (!(t.kind === 'spire' && e <= t.on) && !t.levels.some((q) => Math.abs(q - e) < 0.01)) t.levels.push(e);
    if (B.some((q) => (q.from === a.key && q.to === b.key) || (q.from === b.key && q.to === a.key))) return false;
    B.push({ a: [a.x + ux * ra, PLAIN + ea, a.z + uz * ra], b: [b.x - ux * rb, PLAIN + eb, b.z - uz * rb], w: o.w ?? 4, arch: Math.min(o.arch ?? 7, (d - ra - rb) * 0.07), piers: !!o.piers, from: a.key, to: b.key });
    return true;
  };
  // (A spire's gallery: the nearest it has to h, if that's within nine metres; else one more, at h.)
  // (Never under the step its own stair starts from: there it lands on the step.)
  for (const sp of spires) { const RS = sp.r + 5.4; sp.on = STEPS.map(([hx, hz, , b], i) => ({ cx: x + 40 - i * 8, hx, hz, b })).filter((q) => Math.abs(sp.x - q.cx) < q.hx + RS && Math.abs(sp.z - z) < q.hz + RS).at(-1).b; sp.levels = sp.levels.filter((h) => h > sp.on + 1); }
  const snap = (s, h) => { if (h < s.on + 5) return s.on; const q = s.levels.reduce((best, v) => (Math.abs(v - h) < Math.abs(best - h) ? v : best), s.levels[0]); return Math.abs(q - h) < 9 ? q : h; };
  // (A spire's own three galleries, by which: a third and two thirds of the way up it, and under its crown.)
  const gal = (sp, lv) => [sp.foot + (sp.top - sp.foot) * 0.34, sp.foot + (sp.top - sp.foot) * 0.67, sp.top - 20][lv];
  const link = (a, b, drop, o) => { const h = Math.min(a.top, b.top) - drop; return span(a, h, b, h, o); };
  // (Each at a height of its own, turn about, and humped: two level spans meeting in a tower were one beam through it, a
  // cross against the sky from the yard below. The V and T rule.)
  for (let i = 0; i < 8; i++) link(sat[i], sat[i + 1], i % 2 ? 44 : 26);                      // the rim's ring of towers, round from the north cliff to the south
  for (const [i, j] of [[9, 0], [10, 8], [12, 13], [12, 14]]) link(sat[i], sat[j], 34);
  // The turrets: each tied by a light bridge to the tower nearest it, so from the city the whole rock is laced together.
  const every = [...sat, ...small];
  for (const t of small) {
    const near = every.filter((q) => q !== t).map((q) => [Math.hypot(q.x - t.x, q.z - t.z), q]).sort((p, q) => p[0] - q[0])[0];
    if (near && near[0] < 150) link(t, near[1], 12, { w: 3 });
  }
  // (And the rim towers to the spires they stand under.)
  for (const [i, s] of [[0, 0], [1, 1], [3, 2], [5, 3], [7, 4], [2, 1], [6, 4]]) { const h = sat[i].top - 30, sp = spires[s]; span(sat[i], h, sp, snap(sp, h)); }
  // The Needles: each to the two rim towers it stands over, the Gallows and the Thorn to each other, and each of the
  // middle four in to a spire's upper gallery.
  for (const [n, i, j] of [[0, 0, 1], [1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 7, 8]]) { link(needles[n], sat[i], 30); link(needles[n], sat[j], 46); }
  // (One only, the High Bridge, from the Gallows Needle to the Thorn: the Widow's to the Gallows and the Thorn to the Red
  // ran through the Crow Tower's crown and the Gibbet Watch's, which join those Needles anyway.)
  for (const [m, n] of [[2, 3]]) link(needles[m], needles[n], 94, { arch: 11, piers: true, w: 4.5 });
  for (const [n, s, lv] of [[1, 1, 1], [2, 2, 1], [3, 3, 1], [4, 4, 1]]) { const sp = spires[s], h = Math.min(needles[n].deck - 16, gal(sp, lv)); span(needles[n], h, sp, gal(sp, lv), { arch: 9, piers: true, w: 4.5 }); }
  // The Clock Tower to the Horn Tower and on to the Ringers' Tower; the belvederes to the Page's and the Kitchen Towers.
  link(clock, horns, 44, { arch: 5 }); span(horns, horns.top - 60, sat[15], sat[15].top - 30, { arch: 4 });
  link(patio[0], sat[9], 22, { arch: 4 }); link(patio[1], sat[10], 22, { arch: 4 });
  // And each spire tied back to the Keep's body: a flying bridge from one of its galleries to the lip of a step.
  // [spire, which of its galleries, which step]. (The Ember Spire stands in the first step's own floor.)
  for (const [s, lv, st] of [[1, 1, 2], [2, 1, 3], [3, 0, 3], [4, 0, 3]]) {
    const sp = spires[s], [hx, hz, , b] = STEPS[st], cx = x + 40 - st * 8;
    const tx = Math.max(cx - hx + 3, Math.min(cx + hx - 3, sp.x)), tz = Math.max(z - hz + 3, Math.min(z + hz - 3, sp.z)), d = Math.hypot(tx - sp.x, tz - sp.z), ux = (tx - sp.x) / d, uz = (tz - sp.z) / d;
    // (From its gallery's outer edge: a deck that falls away from under a gallery is a drop off the gallery's lip.)
    B.push({ a: [sp.x + ux * (sp.r + 7.6), PLAIN + gal(sp, lv), sp.z + uz * (sp.r + 7.6)], b: [tx, PLAIN + b, tz], w: 4.5, arch: 0, piers: true, from: sp.key, to: `step${st}` });
  }
  for (const t of T) {
    t.levels = t.levels.sort((p, q) => p - q).filter((h, i, all) => !i || h - all[i - 1] > 0.01);
    if (t.kind === 'spire') continue;
    // (A tower reached only by its bridges: its deck on its own rhythm too, now its lowest gallery's known.)
    if (t.buried) continue;
    if (t.from === null) { t.from0 ??= t.deck; t.deck = t.from0 + Math.round((t.deck - t.from0) / TURN) * TURN; }
    // (The deck is the last of them; none in what it stands through.)
    t.levels = t.levels.filter((h) => h < t.deck - 1 && (t.from === null || h > t.from - PLAIN + 1));
  }
  TOWERS = { towers: T, bridges: B };
  return TOWERS;
}

// A tower's stair turret, its galleries and its deck. draw null: only what's stood on, and from far the turret as a plain
// drum under a cap and a band for each gallery (in the cell's group, which the near view folds away); draw a layer: all
// of it, as it is from near (castleNear): the stair round its newel, walled and roofed, a doorway onto each gallery.
function climb(K, t, draw) {
  if (t.buried) return;
  const s = stairOf(t), P = (h) => PLAIN + h, stops = [...t.levels.map(P), P(t.deck)];
  const y0 = t.from ?? stops.shift(), top = P(t.deck), G = 'dark:p2_bridge_ashlar', seen = K.geometry !== false;
  // (Every flight starts and ends on the side facing the tower: TURN to a turn.)
  const a0 = t.ta + Math.PI, R = RT + HW + 0.4;
  // (Floored over the stair's well where no flight comes up through it: the lowest gallery of one reached by its bridges was
  // cut open there, a 400 m drop at the foot of its stair. tools/paths/trips.mjs.)
  const gallery = (h, rOut, deck, floored = false) => {
    walk(K, ringRects(t.x, t.z, s.re - 0.5, rOut, h, [t.tx, t.tz, floored ? 0 : RT + HW - 0.25]));
    if (floored) walk(K, ringRects(t.tx, t.tz, 0, R, h));
    if (!seen) return;
    // (From far a band; on a phone only the deck's.)
    if (!draw) {
      if (!K.lean || deck) K.drum(G, t.x, h - 1.1, t.z, s.re, 2.1, K.lean ? 8 : 12, { r2: rOut, open: true, collide: false });
      // (And a doorway's light on the shaft beside its turret, seen from the yard: there's a way up to here.)
      if (!K.lean) { const b = t.ta + 0.9, d = s.re + 0.08, cx = t.x + Math.cos(b) * d, cz = t.z + Math.sin(b) * d, tx = -Math.sin(b) * 0.7, tz = Math.cos(b) * 0.7; K.quad('eve:flame', [cx - tx, h + 0.2, cz - tz], [cx + tx, h + 0.2, cz + tz], [cx + tx, h + 2.6, cz + tz], [cx - tx, h + 2.6, cz - tz], [Math.cos(b), 0, Math.sin(b)]); }
      return;
    }
    K.drum(G, t.x, h - 1.1, t.z, s.re, 1.1, 16, { r2: rOut, collide: false, open: true });
    for (let k = 0; k < 16; k++) { const b0 = k / 16 * TAU, b1 = (k + 1) / 16 * TAU, F = (b, r) => [t.x + Math.cos(b) * r, h, t.z + Math.sin(b) * r]; K.quad('p2_walk_paving', F(b0, s.re - 0.6), F(b1, s.re - 0.6), F(b1, rOut), F(b0, rOut), [0, 1, 0]); }
    // (Its parapet: a low wall round its edge, his V in every other stretch, left open where the turret stands; corbels under it.)
    const n = Math.max(12, Math.round(rOut * 1.3)), gap = Math.asin(Math.min(1, R / s.dt)) + 0.05;
    for (let k = 0; k < n; k++) {
      const b = (k + 0.5) / n * TAU, px = t.x + Math.cos(b) * (rOut - 0.3), pz = t.z + Math.sin(b) * (rOut - 0.3), half = Math.PI * (rOut - 0.3) / n + 0.04;
      if (Math.abs(((b - t.ta) % TAU + TAU + Math.PI) % TAU - Math.PI) < gap) continue;
      // (Waist high, his V on one stretch in four: a parapet to the chest was most of what a deck looked at. The critics.)
      K.box(G, px, h, pz, 0.3, 0.72, half, -b, { collide: false }); if (k % 4 === 0) K.vee(G, px, h + 0.72, pz, 0.3, 0.7, half * 0.6, -b);
    }
    for (let k = 0; k < 8; k++) { const b = (k + 0.5) / 8 * TAU; K.spike(G, t.x + Math.cos(b) * (rOut - 1.1), h - 1.1, t.z + Math.sin(b) * (rOut - 1.1), 0.9, -4.5, 4, -b); }
  };
  const build = () => {
    let y = y0;
    // (One reached only by its bridges: its stair starts at its lowest gallery, which is laid too, or that bridge ended at
    // nothing: tools/paths/map.mjs.)
    if (t.from === null) gallery(y0, y0 === top ? s.rd : s.rg, y0 === top, true);
    for (const h of stops) {
      if (h <= y + 1) continue;
      const turn = Math.max(1, Math.round((h - y) / TURN)) * TAU;
      spiral(K, draw, t.tx, t.tz, RT, y, h, a0, 1, draw ? { hw: HW, turn, wedge: true, thick: 0.4, reach: 0.4 } : { hw: HW, turn });
      gallery(h, h === top ? s.rd : s.rg, h === top);
      y = h;
    }
    if (!seen) return;
    // The turret itself: from far a drum; from near its newel, and over its head on the deck a cap of slate on eight posts.
    if (!draw) K.drum(G, t.tx, y0 - 1.5, t.tz, R, top + 3.4 - y0 + 1.5, 8, { collide: false, open: true });
    else {
      // From near: its newel; its wall a drum of twelve sides, inside and out, open for a doorway's height toward the tower
      // at its foot and at every gallery; a slit in it every six metres; a cap of slate on its head.
      K.drum(G, t.tx, y0 - 1, t.tz, RT - HW, top + 3.4 - y0 + 1, 8, { collide: false });
      const N = 12, face = (i) => Math.abs((((i + 0.5) / N * TAU - a0) % TAU + TAU + Math.PI) % TAU - Math.PI) < TAU / N * 1.1;
      const doors = [y0, ...stops], cuts = [y0 - 1.5, ...doors.flatMap((h) => [h, h + 3.1]), top + 3.4].sort((p, q) => p - q);
      const Q = (i, rr, yy) => { const an = i / N * TAU; return [t.tx + Math.cos(an) * rr, yy, t.tz + Math.sin(an) * rr]; };
      for (let c = 0; c + 1 < cuts.length; c++) {
        const lo = cuts[c], hi = cuts[c + 1], door = doors.some((h) => Math.abs(h - lo) < 0.01);
        if (hi - lo < 0.05) continue;
        K.drum(G, t.tx, lo, t.tz, R, hi - lo, N, { collide: false, open: true, skip: door ? face : undefined });
        for (let i = 0; i < N; i++) { if (door && face(i)) continue; const am = (i + 0.5) / N * TAU; K.quad('pale:ph_grey_plaster', Q(i + 1, R - 0.3, lo), Q(i, R - 0.3, lo), Q(i, R - 0.3, hi), Q(i + 1, R - 0.3, hi), [-Math.cos(am), 0, -Math.sin(am)]); }
      }
      for (let yy = y0 + 5, j = 0; yy < top; yy += 6, j++) { const i = (j * 5 + 3) % N; if (face(i)) continue; const am = (i + 0.5) / N * TAU, w = 0.16, rr = R * Math.cos(Math.PI / N) + 0.03, cx = t.tx + Math.cos(am) * rr, cz = t.tz + Math.sin(am) * rr, tx = -Math.sin(am) * w, tz = Math.cos(am) * w; K.quad(j % 2 ? 'blood:flame' : 'eve:flame', [cx - tx, yy, cz - tz], [cx + tx, yy, cz + tz], [cx + tx, yy + 1.5, cz + tz], [cx - tx, yy + 1.5, cz - tz], [Math.cos(am), 0, Math.sin(am)]); }
    }
    if (!K.lean) K.drum(G, t.tx, top + 3.4, t.tz, R + 0.5, 0.5, 8, { collide: false });
    K.cone('soot:p2_fishscale_slate', t.tx, top + (K.lean ? 3.4 : 3.9), t.tz, R + 0.7, R * 2.3, K.lean ? 6 : 8);
  };
  if (draw) build(); else K.group('ph:' + t.cell, true, build);
  if (!draw) return;
  // From near, on its deck: a brazier at three points (their fires the land's), and where its stair starts a doorway's fire.
  for (const [bx, by, bz] of deckFires(t)) { K.drum('dark:stone', bx, by, bz, 0.5, 1.4, 6, { r2: 0.35, collide: false }); K.drum('iron', bx, by + 1.4, bz, 0.45, 0.6, 8, { r2: 0.9, open: true, collide: false }); }
  const f = deckFires(t)[0];
  if (f) (K.lamps ||= []).push({ p: [f[0], f[1] + 3, f[2]], c: [1, 0.42, 0.18], r: 30, i: 60, flicker: 0.35 });
  // What's found on a deck with no chest: a spyglass on its stand, trained on the city; or a crows' nest of sticks, three
  // eggs in it; or what's left of whoever came up here last.
  if (!castleFinds().chests.some((c) => c.id === `tower:${t.key}`)) {
    const a = t.ta + Math.PI - 0.95, r = s.rd - 1.5, fx = t.x + Math.cos(a) * r, fz = t.z + Math.sin(a) * r, k = Math.abs(Math.round(t.x + t.z)) % 3;
    if (k === 0) {
      for (let j = 0; j < 3; j++) { const b = j / 3 * TAU; K.beam('dark:wood', [fx + Math.cos(b) * 0.5, top, fz + Math.sin(b) * 0.5], [fx, top + 1.35, fz], 0.035); }
      K.beam('p2_bronze_plates', [fx - Math.cos(a) * 0.5, top + 1.3, fz - Math.sin(a) * 0.5], [fx + Math.cos(a) * 0.7, top + 1.62, fz + Math.sin(a) * 0.7], 0.07);
    } else if (k === 1) {
      K.drum('dark:wood', fx, top, fz, 0.9, 0.3, 9, { r2: 1.15, open: true, collide: false }); K.drum('p2_straw_ground', fx, top + 0.02, fz, 0.85, 0.1, 9, { collide: false });
      for (let j = 0; j < 3; j++) K.drum('pale:stone', fx + Math.cos(j * 2.1) * 0.22, top + 0.12, fz + Math.sin(j * 2.1) * 0.22, 0.09, 0.16, 6, { r2: 0.05, collide: false });
    } else {
      K.box('pale:stone', fx, top, fz, 0.5, 0.06, 0.16, a, { collide: false }); K.drum('pale:stone', fx + Math.cos(a + 1.57) * 0.7, top, fz + Math.sin(a + 1.57) * 0.7, 0.13, 0.17, 7, { r2: 0.09, collide: false });
      K.box('dark:cloth_oat', fx, top + 0.01, fz, 0.8, 0.02, 0.5, a + 0.4, { collide: false }); K.beam('dark:wood', [fx - 0.9, top + 0.05, fz + 0.4], [fx + 0.8, top + 0.05, fz - 0.5], 0.03);
    }
  }
  // (A lamp in the turret every two turns, so the stair isn't climbed blind.)
  // (Bright, and first among the frame's twelve when you're on it: a stair climbed blind is no stair.)
  for (let yy = y0 + 4; yy < top; yy += TURN) (K.lamps ||= []).push({ p: [t.tx - Math.cos(t.ta) * RT, yy + 2.6, t.tz - Math.sin(t.ta) * RT], c: [1, 0.6, 0.3], r: 13, i: 90, flicker: 0.25, prio: 40 });
  if (t.from !== null) {
    const fx = t.tx + Math.cos(t.ta + 1.9) * (R + 1.6), fz = t.tz + Math.sin(t.ta + 1.9) * (R + 1.6), fy = t.base > 290 ? t.from : Y(fx, fz);
    K.drum('dark:stone', fx, fy - 0.3, fz, 0.6, 2.5, 6, { r2: 0.4, collide: false }); K.drum('char:stone', fx, fy + 2.2, fz, 0.34, 0.5, 8, { r2: 0.62, collide: false });
    (K.lamps ||= []).push({ p: [fx, fy + 3.4, fz], c: [1, 0.5, 0.22], r: 24, i: 36, flicker: 0.35 });
  }
}
// A gallery's floor round (cx, cz), from r0 out to r1, at y. hole [x, z, r]: none of it over that (its stair turret's
// well: a floor laid over the stair's head was stepped up onto and never down off, tools/paths/map.mjs found: a trap at
// the top of every tower). In pieces a metre or so across, so what's left round the well still meets its wall.
function ringRects(cx, cz, r0, r1, y, hole = null) {
  if (!hole) { const N = 16, out = []; for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * TAU; out.push([cx + Math.cos(a) * (r0 + r1) / 2, cz + Math.sin(a) * (r0 + r1) / 2, (r1 - r0) / 2 + 0.2, Math.PI * r1 / N + 0.4, -a, y]); } return out; }
  const M = Math.max(1, Math.ceil((r1 - r0) / 1.2)), out = [];
  for (let m = 0; m < M; m++) {
    const ra = r0 + (r1 - r0) * m / M, rb = r0 + (r1 - r0) * (m + 1) / M, rm = (ra + rb) / 2, N = Math.max(16, Math.ceil(TAU * rb / 1.2));
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) / N * TAU, px = cx + Math.cos(a) * rm, pz = cz + Math.sin(a) * rm;
      if (Math.hypot(px - hole[0], pz - hole[1]) < hole[2]) continue;
      // (Overlapped well: turned pieces only just meeting left pinholes a body's point dropped through, 18 m down a tower.)
      out.push([px, pz, (rb - ra) / 2 + 0.2, Math.PI * rb / N + 0.2, -a, y]);
    }
  }
  return out;
}
// Where a tower's deck's braziers stand: [x, y (the deck's floor), z] each. (A spire's are phobosKeep's own.)
function deckFires(t) {
  if (t.kind === 'spire' || t.buried) return [];
  const s = stairOf(t), y = PLAIN + t.deck, out = [];
  for (let k = 0; k < 3; k++) { const a = t.ta + Math.PI + (k - 1) * 1.9; out.push([t.x + Math.cos(a) * (s.rd - 1.3), y, t.z + Math.sin(a) * (s.rd - 1.3)]); }
  return out;
}
// The cells the castle's towers stand in (some out past the crag's own: src/gfx/phobos-near.js builds them too).
export const towerCells = () => castleTowers().towers.map((t) => t.cell);
let TC = null;
const TOWER_CELLS = () => (TC ||= new Set(towerCells()));

// What's found on the land castle's towers (src/core/castle-finds.js): a lookout on every deck and at every spire's, on the
// Keep's crown and the patio's lip; a chest on the Needles' decks and every other satellite's and turret's.
let FINDS = null;
export function castleFinds() {
  if (FINDS) return FINDS;
  const chests = [], vistas = [], CT = castleTowers(), P = (h) => PLAIN + h;
  CT.towers.forEach((t, n) => {
    if (t.kind === 'spire') { vistas.push({ id: `spire_${t.key}`, name: t.name, x: t.x, y: P(t.top - 20), z: t.z, r: t.r + 13, xp: 14000 }); return; }
    if (t.buried) return;
    const s = stairOf(t);
    vistas.push({ id: t.key, name: t.name, x: t.x, y: P(t.deck), z: t.z, r: s.rd + 0.5, xp: t.kind === 'needle' ? 16000 : t.kind === 'small' ? 6000 : 10000 });
    if (t.kind === 'needle' || t.kind === 'clock' || t.kind === 'horns' || n % 2 === 0) {
      const a = t.ta + Math.PI + 0.95, r = s.re + 1.3;
      chests.push({ id: `tower:${t.key}`, x: t.x + Math.cos(a) * r, y: P(t.deck), z: t.z + Math.sin(a) * r, yaw: Math.atan2(Math.cos(a), Math.sin(a)), loot: t.kind === 'needle' ? 4 : t.kind === 'small' ? 2 : 3 });
    }
  });
  vistas.push({ id: 'keep_crown', name: "the Keep's Crown", x: KEEP.x, y: P(630), z: KEEP.z, r: 28, xp: 30000 });
  vistas.push({ id: 'keep_patio', name: 'the Crown Court', x: KEEP.x - 184 - 66, y: P(300), z: KEEP.z, r: 14, xp: 8000 });
  FINDS = { chests, vistas };
  return FINDS;
}

export function phobos(K) { phobosCity(K); phobosCastle(K); phobosKeep(K); }
