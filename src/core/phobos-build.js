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
import { CITY, CITY_WALL, CRAG, HAUNTS, KEEP, PLAIN, SLOUGH, WARDS, cityIn } from './east.js';
import { PHOBOS } from './phobos-data.js';
import { HUBS, hubHouses, hubFar, hubNear, inHub } from './phobos-hubs.js';
import { PHOBOS_SEALS, SEAL_SQUARE, inSealSquare } from './phobos-seals.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);
const segD = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
};

// ---------------------------------------------------------------- pieces

// A ridged roof over a box's top: its ridge along the box's length (local x).
function gable(K, layer, x, y, z, hx, hz, rh, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  K.quad(layer, P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, rh, 0), P(-hx, rh, 0));
  K.quad(layer, P(hx, 0, hz), P(-hx, 0, hz), P(-hx, rh, 0), P(hx, rh, 0));
  K.tri(layer, P(hx, 0, -hz), P(hx, 0, hz), P(hx, rh, 0));
  K.tri(layer, P(-hx, 0, hz), P(-hx, 0, -hz), P(-hx, rh, 0));
}
// Where a house stands on its ground: the lowest and highest of its corners' ground, and its floor (the highest).
export function footing(h) {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  let lo = Infinity, hi = -Infinity;
  for (const [lx, lz] of [[-h.hx, -h.hz], [h.hx, -h.hz], [h.hx, h.hz], [-h.hx, h.hz]]) { const y = Y(h.x + lx * c + lz * s, h.z - lx * s + lz * c); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return { lo, hi, c, s };
}
const DOOR = 0.8, WALL = 0.45;   // half a doorway's width; a house wall's thickness
// A house's upstairs, if it has one: two storeys or more, and room inside for a stair up its left wall (local x -) from by
// the door to the back, with floor beside it and beyond it. (Its floors, with the ground floor's: houseWalls.) { ix, iz, fy, uy, uc, sw, steps: [[lx, lz, y]], hole: [z0, z1],
// rects } (rects: the floor and the treads, as K.deck takes them). RISE a step, TREAD its depth, SW the stair's width.
const RISE = 0.3, TREAD = 0.27, SW = 0.95, STOREY = 3.3;
export function upstairs(h, F) {
  const ix = h.hx - WALL, iz = h.hz - WALL;
  if (!h.roof || h.h < 6 || ix < 2.2 || iz < 1.95) return null;
  const { hi, c, s } = F, f = h.front, fy = hi + 0.1, uy = fy + STOREY, uc = Math.min(hi + h.h - 0.3, uy + 2.9), n = Math.round(STOREY / RISE);
  const W = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c], yaw = h.yaw, sx = -ix + SW / 2, z0 = iz - 0.45, z1 = z0 - n * TREAD;
  const steps = [], rects = [];
  for (let k = 1; k <= n; k++) {
    const lz = f * (z0 - (k - 0.5) * TREAD), y = fy + k * RISE;
    steps.push([sx, lz, y]);
    rects.push([...W(sx, lz), TREAD / 2 + 0.02, SW / 2, yaw, y]);
  }
  // (The floor: all of it beside the stair; and past its head, and over its foot, on its own side.)
  rects.push([...W(SW / 2, 0), ix - SW / 2, iz, yaw, uy]);
  rects.push([...W(sx, f * (z1 - iz) / 2), SW / 2, (z1 + iz) / 2, yaw, uy]);
  rects.push([...W(sx, f * (z0 + iz) / 2), SW / 2, (iz - z0) / 2, yaw, uy]);
  // (The rects' half-sizes are along the house's local x and z, the way world.js reads a rect turned by yaw.)
  return { ix, iz, fy, uy, uc, steps, hole: [z1, z0], rects };
}
// A door shut and barred: one house in sixteen of those that aren't shops, never gone into.
const barred = (h) => !!h.roof && !h.shop && !h.hub && hash2(Math.round(h.x * 7 + h.z * 13), 71) < 0.0625;
// What stops a body at a house: its four walls, the front one in two with the doorway between. (Nearly every house in
// Phobos is gone into: the owner's word. Its inside is drawn only near you, houseNear.) front: +1 or -1, which of its
// long sides the door is in (local z).
function houseWalls(K, h, F) {
  const { lo, hi, c, s } = F, t = WALL / 2, P = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
  // (Pushed as they are, their height from the house's own lowest ground: fifty thousand walls don't each ask the land.)
  const put = (px, pz, hx, hz) => K.colliders.push({ x: px, z: pz, hx, hz, yaw: h.yaw, h: hi + h.h - lo });
  put(...P(0, -h.front * (h.hz - t)), h.hx, t);
  for (const sd of [-1, 1]) put(...P(sd * (h.hx - t), 0), t, h.hz);
  const half = (h.hx - DOOR) / 2;
  for (const sd of [-1, 1]) put(...P(sd * (DOOR + half), h.front * (h.hz - t)), half, t);
  // (A barred door stops you in its doorway.)
  if (barred(h)) put(...P(0, h.front * (h.hz - WALL - 0.05)), DOOR, 0.06);
  // What's stood on inside: the ground floor (at the house's highest corner, as drawn, wherever the hill under it is
  // lower) and its threshold out to the step; and upstairs, the stair's treads and the floor over. One stack (src/sim/world.js
  // platformAt): the highest of them within a step of the feet, else the ground floor, so downstairs is walked under the
  // upstairs floor and anyone without feet to go by (a monster come in after you) is on the ground floor.
  const fy = F.hi + 0.1, W = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c], ix = h.hx - WALL, iz = h.hz - WALL;
  const rects = [[...W(0, 0), ix, iz, h.yaw, fy]];
  if (!barred(h)) rects.push([...W(0, h.front * (iz + h.hz + 0.9) / 2), DOOR + 0.3, (h.hz + 0.9 - iz) / 2, h.yaw, fy]);
  const up = upstairs(h, F);
  if (up) rects.push(...up.rects);
  K.deck(rects); K.floors.at(-1).stack = true;
}
// A house from far off: a box on the ground (its foot sunk to the lowest of its corners) with a ridged roof, or none if
// it's a ruin.
function houseFar(K, h) {
  const F = footing(h), { lo, hi } = F;
  // (On a phone a flat lid in the roof's own tiles: ten thousand ridged roofs are more corners than it should hold.)
  K.box(h.wall, h.x, lo - 0.5, h.z, h.hx, hi - lo + h.h + 0.5, h.hz, h.yaw, { top: h.roof ? (K.lean ? h.roof : false) : h.wall, collide: false });
  if (h.roof && !K.lean) gable(K, h.roof, h.x, hi + h.h, h.z, h.hx + 0.4, h.hz + 0.4, Math.min(h.hx, h.hz) * 0.9, h.yaw);
  // (One in three has a lit window in its front, big enough to be seen from the castle: the city's alight from far off.)
  const id = Math.round(h.x * 7 + h.z * 13);
  if (h.roof && hash2(id, 61) < 0.55) {
    const { c, s } = F, f = h.front, wy = hi + 1.3 + Math.floor(hash2(id, 62) * Math.max(1, Math.round(h.h / 3.3))) * 3.3, wx = (hash2(id, 63) - 0.5) * h.hx, wz = f * (h.hz + 0.06);
    const P = (lx, ly, lz) => [h.x + lx * c + lz * s, ly, h.z - lx * s + lz * c];
    if (wy + 1.6 < hi + h.h) K.quad('flame', P(wx + f * 0.65, wy, wz), P(wx - f * 0.65, wy, wz), P(wx - f * 0.65, wy + 1.4, wz), P(wx + f * 0.65, wy + 1.4, wz), [f * s, 0, f * c]);
  }
  houseWalls(K, h, F);
}
// Things that stand on the land (the kit's furniture: a table, a barrel) stood on a floor instead: whatever fn builds at
// (x, z) is lifted from the ground there to y. (A house's floor is at its highest corner's ground; the ground under it
// may be lower.)
function onFloor(K, x, z, y, fn) {
  const before = new Map([...K.parts].map(([l, q]) => [l, q.pos.length]));
  fn();
  const dy = y - Y(x, z);
  if (Math.abs(dy) < 0.01) return;
  for (const [l, q] of K.parts) { const a = q.pos.a || q.pos; for (let i = (before.get(l) || 0) + 1; i < q.pos.length; i += 3) a[i] += dy; }
}
// The same house from near: a shell you walk into. Outside: its walls with the doorway cut, windows (most of them lit),
// a lamp by the door of one in three, its roof with a chimney and now and then a dormer. Inside: plastered walls, a board
// floor, a ceiling, and a little of somebody's life. A ruin has no roof or ceiling, and rubble for furniture.
function houseNear(K, h) {
  const F = footing(h), { lo, hi, c, s } = F, f = h.front, top = hi + h.h, fy = hi + 0.1, ceil = Math.min(top - 0.3, fy + 3.1);
  const P = (lx, ly, lz) => [h.x + lx * c + lz * s, ly, h.z - lx * s + lz * c];
  const id = Math.round(h.x * 7 + h.z * 13), r = (k) => hash2(id, k), ruin = !h.roof;
  // Outside: back and sides whole; the front in three round the doorway.
  const fz = f * h.hz, out = (ax, az, bx, bz, y0, y1) => K.quad(h.wall, P(ax, y0, az), P(bx, y0, bz), P(bx, y1, bz), P(ax, y1, az));
  const dh = fy + 2.35;
  if (f > 0) { out(h.hx, fz, DOOR, fz, lo - 0.5, top); out(-DOOR, fz, -h.hx, fz, lo - 0.5, top); out(DOOR, fz, -DOOR, fz, dh, top); out(-h.hx, -fz, h.hx, -fz, lo - 0.5, top); }
  else { out(-h.hx, fz, -DOOR, fz, lo - 0.5, top); out(DOOR, fz, h.hx, fz, lo - 0.5, top); out(-DOOR, fz, DOOR, fz, dh, top); out(h.hx, -fz, -h.hx, -fz, lo - 0.5, top); }
  out(h.hx, -h.hz, h.hx, h.hz, lo - 0.5, top); out(-h.hx, h.hz, -h.hx, -h.hz, lo - 0.5, top);
  // Inside: the same four the other way round, a hand's breadth in; the doorway's cheeks and head; floor and ceiling.
  const ix = h.hx - WALL, iz = h.hz - WALL, IN = 'ph_grey_plaster', inn = (ax, az, bx, bz, y0, y1) => K.quad(IN, P(ax, y0, az), P(bx, y0, bz), P(bx, y1, bz), P(ax, y1, az));
  const up = upstairs(h, F), gz = f * iz, roofY = ruin ? top : up ? up.uc : ceil;
  if (f > 0) { inn(DOOR, gz, ix, gz, fy, roofY); inn(-ix, gz, -DOOR, gz, fy, roofY); inn(-DOOR, gz, DOOR, gz, dh, roofY); inn(ix, -gz, -ix, -gz, fy, roofY); }
  else { inn(-DOOR, gz, -ix, gz, fy, roofY); inn(ix, gz, DOOR, gz, fy, roofY); inn(DOOR, gz, -DOOR, gz, dh, roofY); inn(-ix, -gz, ix, -gz, fy, roofY); }
  inn(ix, iz, ix, -iz, fy, roofY); inn(-ix, -iz, -ix, iz, fy, roofY);
  for (const sd of [-1, 1]) K.quad('wood', P(sd * DOOR, fy - 0.2, fz), P(sd * DOOR, fy - 0.2, gz), P(sd * DOOR, dh, gz), P(sd * DOOR, dh, fz));
  K.quad('wood', P(-DOOR, dh, fz), P(DOOR, dh, fz), P(DOOR, dh, gz), P(-DOOR, dh, gz), [0, -1, 0]);
  K.quad('ph_boards', P(-ix, fy, -iz), P(-ix, fy, iz), P(ix, fy, iz), P(ix, fy, -iz), [0, 1, 0]);
  // (A step at the door where the street's lower than the floor.)
  K.quad('stone', P(-DOOR - 0.3, fy, fz), P(-DOOR - 0.3, fy, fz + f * 0.9), P(DOOR + 0.3, fy, fz + f * 0.9), P(DOOR + 0.3, fy, fz), [0, 1, 0]);
  if (!ruin && !up) K.quad('wood', P(-ix, ceil, -iz), P(ix, ceil, -iz), P(ix, ceil, iz), P(-ix, ceil, iz), [0, -1, 0]);
  if (up) upstairsNear(K, h, up, P, r);
  // The door: hung on its right-hand post, swung in and stood open (barred shut on a few); planks, two iron straps.
  if (!ruin) {
    const shut = barred(h), th = shut ? 0 : (1.3 + r(26) * 0.5), hx0 = DOOR - 0.04, hz0 = f * (iz - 0.02), L = 2 * DOOR - 0.08;
    const dx = -Math.cos(th), dz = -f * Math.sin(th), [wx, , wz] = P(hx0 + dx * L / 2, 0, hz0 + dz * L / 2);
    const [ex, , ez] = P(hx0 + dx, 0, hz0 + dz), [ox, , oz] = P(hx0, 0, hz0), yawL = Math.atan2(-(ez - oz), ex - ox);
    K.box('wood', wx, fy, wz, L / 2, 2.3, 0.035, yawL, { collide: false });
    for (const sy of [0.45, 1.75]) K.box('iron', wx, fy + sy, wz, L / 2 - 0.05, 0.07, 0.045, yawL, { collide: false });
  }
  // The roof: ridged, a chimney on most, a dormer on some of the bigger.
  if (!ruin) {
    const rh = Math.min(h.hx, h.hz) * 0.9;
    gable(K, h.roof, h.x, top, h.z, h.hx + 0.4, h.hz + 0.4, rh, h.yaw);
    if (r(1) < 0.7) { const [cx, , cz] = P((r(2) - 0.5) * h.hx * 1.2, 0, (r(3) - 0.5) * h.hz * 0.5); K.box('stone', cx, top + rh * 0.35, cz, 0.42, rh * 0.75 + 0.9, 0.42, h.yaw, { collide: false }); if (r(4) < 0.4) K.cone('flame', cx, top + rh * 1.1 + 0.9, cz, 0.16, 0.5, 4); }
    if (h.hx > 4.2 && r(5) < 0.3) { const [dx, , dz] = P((r(6) - 0.5) * h.hx, 0, f * h.hz * 0.55); K.box(h.wall, dx, top + rh * 0.1, dz, 0.9, 1.5, 0.9, h.yaw, { collide: false, top: false }); gable(K, h.roof, dx, top + rh * 0.1 + 1.5, dz, 1.1, 1.1, 0.8, h.yaw + Math.PI / 2); }
  } else for (let k = 0; k < 3; k++) { const [qx, , qz] = P((r(20 + k) - 0.5) * ix * 1.5, 0, (r(30 + k) - 0.5) * iz * 1.5); K.rock('dark:rubble', qx, qz, 0.5 + r(40 + k) * 0.7, 0.4 + r(50 + k) * 0.5, { collide: false }); }
  // Windows, a pair to a storey front and back where there's room; most lit after dark. A lamp by one door in three.
  const storeys = Math.max(1, Math.round(h.h / 3.3));
  for (let st = 0; st < storeys; st++) for (const side of [1, -1]) for (const sd of [-1, 1]) {
    const wx = sd * Math.min(h.hx - 1.1, DOOR + 1.6), wy = fy + 1.2 + st * 3.3;
    if (wy + 1 > top || h.hx < 2.4) continue;
    if (side < 0 && hash2(id + st, 77) > 0.3) continue;   // (few in the back, which looks on the yard)
    // (Lit: more of them low down, where people are, than up under the roofs; a house with nobody in has none. All one
    // warm light. Each in a wooden frame with a sill, the frame proud of the wall and the pane set back in it.)
    const lit = !ruin && r(9) < 0.8 && hash2(id + st * 3 + sd, side + 9) < (st === 0 ? 0.42 : 0.2), q = side * f, wz = q * (h.hz + 0.05), d = q > 0 ? 1 : -1, N = [q * s, 0, q * c];
    const ww = 0.26 + 0.08 * r(14), wh = 0.6 + 0.2 * r(15), fw = ww + 0.1;
    K.quad('wood', P(wx + d * fw, wy - 0.12, wz), P(wx - d * fw, wy - 0.12, wz), P(wx - d * fw, wy + wh + 0.1, wz), P(wx + d * fw, wy + wh + 0.1, wz), N);
    K.quad(lit ? 'flame' : 'iron', P(wx + d * ww, wy, wz + q * 0.07), P(wx - d * ww, wy, wz + q * 0.07), P(wx - d * ww, wy + wh, wz + q * 0.07), P(wx + d * ww, wy + wh, wz + q * 0.07), N);
    // (A bar down and a bar across the lit ones, so it's a window and not a hole; a shutter hung open by some.)
    if (lit && st === 0) { K.quad('wood', P(wx + d * 0.025, wy, wz + q * 0.1), P(wx - d * 0.025, wy, wz + q * 0.1), P(wx - d * 0.025, wy + wh, wz + q * 0.1), P(wx + d * 0.025, wy + wh, wz + q * 0.1), N); K.quad('wood', P(wx + d * ww, wy + wh * 0.5 - 0.025, wz + q * 0.1), P(wx - d * ww, wy + wh * 0.5 - 0.025, wz + q * 0.1), P(wx - d * ww, wy + wh * 0.5 + 0.025, wz + q * 0.1), P(wx + d * ww, wy + wh * 0.5 + 0.025, wz + q * 0.1), N); }
    if (st === 0 || r(16 + st) < 0.5) K.quad('wood', P(wx - d * fw, wy, wz + q * 0.03), P(wx - d * (fw + 0.34), wy, wz + q * 0.03), P(wx - d * (fw + 0.34), wy + wh, wz + q * 0.03), P(wx - d * fw, wy + wh, wz + q * 0.03), N);
    // (And from inside, on the floors you can stand on: the frame and the pane on the plaster, facing in; the pane dark glass,
    // the night or the next house's wall beyond it, whatever the lamp in it shows the street.)
    if (!ruin && st <= (upstairs(h, F) ? 1 : 0)) {
      const iw = q * (h.hz - WALL - 0.02), NI = [-q * s, 0, -q * c];
      K.quad('wood', P(wx - d * fw, wy - 0.12, iw), P(wx + d * fw, wy - 0.12, iw), P(wx + d * fw, wy + wh + 0.1, iw), P(wx - d * fw, wy + wh + 0.1, iw), NI);
      K.quad('iron', P(wx - d * ww, wy, iw - q * 0.02), P(wx + d * ww, wy, iw - q * 0.02), P(wx + d * ww, wy + wh, iw - q * 0.02), P(wx - d * ww, wy + wh, iw - q * 0.02), NI);
      K.quad('wood', P(wx - d * fw, wy - 0.14, iw - q * 0.18), P(wx + d * fw, wy - 0.14, iw - q * 0.18), P(wx + d * fw, wy - 0.1, iw), P(wx - d * fw, wy - 0.1, iw), [0, 1, 0]);
    }
  }
  if (r(8) < (h.shop ? 0.9 : 0.5)) { const q = P(DOOR + 0.5, fy + 2.5, fz); K.wallLamp(...q, [f * s, f * c]); if (r(8) < 0.3) (K.lamps ||= []).push({ p: [q[0] + f * s * 0.5, q[1] - 0.4, q[2] + f * c * 0.5], c: [1, 0.62, 0.3], r: 18, i: 11, flicker: 0.4 }); }
  // A shop's front, on the named streets: an awning over the door, a board hung out on an iron bracket, goods by the step.
  if (h.shop && !ruin) {
    const cloth = r(21) < 0.5 ? 'cloth_red' : 'cloth_oat', aw = Math.min(h.hx - 0.3, 2.2), ay = fy + 2.75;
    if (r(22) < 0.75) { K.quad(cloth, P(aw * f, ay, fz + f * 0.02), P(-aw * f, ay, fz + f * 0.02), P(-aw * f, ay - 0.5, fz + f * 1.5), P(aw * f, ay - 0.5, fz + f * 1.5)); K.quad(cloth, P(-aw * f, ay, fz + f * 0.02), P(aw * f, ay, fz + f * 0.02), P(aw * f, ay - 0.5, fz + f * 1.5), P(-aw * f, ay - 0.5, fz + f * 1.5)); }
    if (r(23) < 0.6) { const b0 = P(-DOOR - 0.9, fy + 3.3, fz), b1 = P(-DOOR - 0.9, fy + 3.3, fz + f * 1.0), sg = P(-DOOR - 0.9, fy + 2.5, fz + f * 0.8); K.beam('iron', b0, b1, 0.05); K.box('wood', sg[0], sg[1], sg[2], 0.05, 0.6, 0.38, h.yaw, { collide: false }); }
    if (r(24) < 0.45) { const g = P(DOOR + 1.6, 0, fz + f * 0.8); K.goods(g[0], g[2], 4, 0.7); }
  }
  const n1 = K.colliders.length;
  if (/poor_brick|daub|soot/.test(h.wall) && r(17) < 0.16 && h.h > 7) { const a = P(-h.hx * 0.5, 0, fz + f * 0.15), b = P(-h.hx * 0.5, 0, fz + f * 2.85); K.washing(a[0], a[2], b[0], b[2], 3.6 + r(18) * 2.4); }
  if (r(19) < 0.14) { const q = P(-DOOR - 1.1, 0, fz + f * 0.5); K.barrel(q[0], q[2]); }
  else if (r(19) < 0.2) { const q = P(h.hx - 1.2, 0, fz + f * 0.45); K.woodpile(q[0], q[2], h.yaw, 0.9, 0.8, 0.3); }
  K.colliders.length = n1;
  // A hearth against the back wall: a chimney breast to the ceiling, a black firebox in it, logs, and a fire if anyone's home.
  if (!ruin && ix > 1.4) {
    const [qx, , qz] = P(0, 0, -f * (iz - 0.3)), fb = -f * (iz - 0.62);
    K.box('stone', qx, fy, qz, 1.15, roofY - fy, 0.3, h.yaw, { collide: false });
    K.quad('dark:stone', P(0.7 * f, fy + 0.05, fb), P(-0.7 * f, fy + 0.05, fb), P(-0.7 * f, fy + 1.15, fb), P(0.7 * f, fy + 1.15, fb), [f * s, 0, f * c]);
    K.box('wood', qx + f * s * 0.36, fy + 1.3, qz + f * c * 0.36, 1.3, 0.12, 0.12, h.yaw, { collide: false });
    const [gx, , gz] = P(0, 0, -f * (iz - 0.85));
    for (const [u, v] of [[-0.3, 0.05], [0.3, -0.05]]) { const e0 = P(u - 0.35, fy + 0.12, -f * (iz - 0.85) + v), e1 = P(u + 0.35, fy + 0.2, -f * (iz - 0.85) - v); K.beam('bark', e0, e1, 0.09); }
    if (r(9) < 0.8) {
      K.cone('flame', gx, fy + 0.15, gz, 0.34, 0.95, 6); K.cone('flame', gx + c * 0.22, fy + 0.15, gz - s * 0.22, 0.2, 0.6, 5); K.cone('flame', gx - c * 0.2, fy + 0.15, gz + s * 0.2, 0.17, 0.5, 5);
      (K.lamps ||= []).push({ p: [gx + f * s * 0.6, fy + 1.0, gz + f * c * 0.6], c: [1, 0.6, 0.3], r: Math.max(11, h.hx + h.hz + 4), i: 16, flicker: 0.6 });
    }
  }
  // A little of somebody's life: a table and a bench, a barrel or two, a heap of goods, a rack. (Nothing here stops you.)
  if (!ruin && ix > 1.6 && iz > 1.6) {
    const at = (u, v) => { const q = P(u * ix * 0.7, 0, v * iz * 0.7); return [q[0], q[2]]; };
    const n0 = K.colliders.length;
    const set = (u, v, fn) => { const [px, pz] = at(u, v); fn(px, pz); };
    // (All of it lifted together from the ground under the house's middle to its floor.)
    onFloor(K, h.x, h.z, fy, () => {
    set(-0.45, f * 0.15, (px, pz) => { K.table(px, pz, h.yaw, 1.2); if (r(9) < 0.8) { const ty = Y(px, pz) + 0.78; K.drum('pale:stone', px, ty, pz, 0.035, 0.16, 5, { collide: false }); K.cone('flame', px, ty + 0.16, pz, 0.03, 0.09, 4); (K.lamps ||= []).push({ p: [px, fy + 1.25, pz], c: [1, 0.78, 0.5], r: Math.max(8, h.hx + h.hz), i: 7, flicker: 0.25 }); } }); set(-0.45, f * 0.45, (px, pz) => K.bench(px, pz, h.yaw, 1.0)); set(-0.45, -f * 0.15, (px, pz) => K.bench(px, pz, h.yaw, 1.0));
    if (r(11) < 0.75) set(0.85, -f * 0.75, (px, pz) => K.barrel(px, pz));
    if (r(11) < 0.4) set(0.6, -f * 0.8, (px, pz) => K.barrel(px, pz));
    if (r(12) < 0.6) set(0.7, f * 0.5, (px, pz) => K.goods(px, pz, 5, 0.8));
    if (r(13) < 0.45) set(-0.85, -f * 0.6, (px, pz) => K.rack(px, pz, h.yaw + Math.PI / 2, 1.2));
    if (r(25) < 0.5) set(0.45, -f * 0.9, (px, pz) => K.woodpile(px, pz, h.yaw, 0.7, 0.6, 0.25));
    });
    K.colliders.length = n0;
  }
}
// A house's upstairs from near (upstairs, above): the ground floor's ceiling on its joists and the floor over it, both cut
// round the stair; the stair, boarded in under (a cupboard door in it), its treads proud of dark risers, a handrail on
// newels; a railing round the hole; and a bedroom: a bed with a headboard, a chest at its foot, a stool, a rug, a pallet
// in the bigger ones, a candle in most.
function upstairsNear(K, h, up, P, r) {
  const { ix, iz, fy, uy, uc, steps, hole: [z1, z0] } = up, f = h.front, xs = -ix + SW, n = steps.length;
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
  for (let zz = -iz + 0.5; zz < iz - 0.3; zz += 1.2) {
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
  K.quad('wood', P(so, fy, f * z0), P(so, fy, f * z1), P(so, nose(z1) - 0.3, f * z1), P(so, Math.max(fy + 0.02, nose(z0) - 0.3), f * z0), NX);
  K.quad('dark:wood', P(so + 0.01, nose(z0) - 0.32, f * z0), P(so + 0.01, nose(z1) - 0.32, f * z1), P(so + 0.01, nose(z1) + 0.02, f * z1), P(so + 0.01, nose(z0) + 0.02, f * z0), NX);
  { const zc = z1 + 0.75, dw = 0.32, dh = Math.min(1.5, nose(zc + dw) - 0.45 - fy);
    if (dh > 0.9) { K.quad('dark:wood', P(so + 0.015, fy + 0.04, f * (zc + dw)), P(so + 0.015, fy + 0.04, f * (zc - dw)), P(so + 0.015, fy + dh, f * (zc - dw)), P(so + 0.015, fy + dh, f * (zc + dw)), NX);
      bx('iron', so + 0.03, fy + dh * 0.55, f * (zc + dw - 0.08), 0.02, 0.1, 0.02); } }
  // (A handrail up it on two newels; the foot one by the bottom step, the head one at the hole.)
  const hr = xs + 0.06, ha = P(hr, nose(z0) + 0.85, f * (z0 + 0.05)), hb = P(hr, nose(z1) + 0.85, f * (z1 - 0.05));
  K.beam('wood', ha, hb, 0.035);
  bx('dark:wood', hr, fy, f * (z0 + 0.05), 0.06, nose(z0) + 1.0 - fy, 0.06);
  // A railing round the hole's open sides (the room's side and its foot), posts every 0.8 m or so, a rail and a mid-rail.
  const rail = (ax, az, bx2, bz) => {
    const L = Math.hypot(bx2 - ax, bz - az), m = Math.max(2, Math.round(L / 0.8));
    for (const hy of [0.95, 0.5]) K.beam('wood', P(ax, uy + hy, f * az), P(bx2, uy + hy, f * bz), hy > 0.9 ? 0.04 : 0.025);
    for (let k = 0; k <= m; k++) { const u = k / m; bx('dark:wood', ax + (bx2 - ax) * u, uy, f * (az + (bz - az) * u), 0.045, 1.0, 0.045); }
  };
  rail(xs + 0.05, z1, xs + 0.05, z0 + 0.05); rail(-ix + 0.05, z0 + 0.05, xs + 0.05, z0 + 0.05);
  // Skirting along the upstairs walls, dark timber; a post up each corner.
  const sk = (ax, az, bx2, bz, N) => K.quad('dark:wood', P(ax, uy, az), P(bx2, uy, bz), P(bx2, uy + 0.14, bz), P(ax, uy + 0.14, az), N);
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), d = 0.012;
  sk(ix - d, -iz, ix - d, iz, [-c, 0, s]); sk(-ix + d, -iz, -ix + d, iz, [c, 0, -s]); sk(-ix, iz - d, ix, iz - d, [-s, 0, -c]); sk(-ix, -iz + d, ix, -iz + d, [s, 0, c]);
  for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx('dark:wood', u * (ix - 0.08), uy, v * (iz - 0.08), 0.08, uc - uy, 0.08);
  // The bed: against the right wall, its head to the back, a headboard, a blanket and a pillow; the chest at its foot, an
  // iron band round it, a candle on it in most; a stool by the bed's head; a rug beside it.
  const bxx = ix - 0.6, bz = -f * (iz - 1.1), blanket = r(27) < 0.5 ? 'cloth_red' : 'cloth_oat';
  bx('wood', bxx, uy, bz, 0.5, 0.42, 1.0);
  bx('dark:wood', bxx, uy, -f * (iz - 0.06), 0.52, 1.0, 0.05);
  bx(blanket, bxx, uy + 0.42, bz + f * 0.15, 0.48, 0.09, 0.85);
  bx(blanket === 'cloth_red' ? 'cloth_oat' : 'pale:stone', bxx, uy + 0.42, bz - f * 0.8, 0.34, 0.13, 0.15);
  const cz = bz + f * 1.45;
  if (iz > 2.3) {
    bx('wood', bxx, uy, cz, 0.45, 0.45, 0.28);
    for (const u of [-0.3, 0.3]) bx('iron', bxx + u, uy, cz, 0.035, 0.47, 0.295);
    if (r(28) < 0.7) {
      const [lx, lz] = at(bxx + 0.2, cz);
      K.drum('pale:stone', lx, uy + 0.45, lz, 0.035, 0.14, 5, { collide: false }); K.cone('flame', lx, uy + 0.59, lz, 0.03, 0.09, 4);
      (K.lamps ||= []).push({ p: [lx, uy + 1.0, lz], c: [1, 0.78, 0.5], r: Math.max(7, ix + iz + 2), i: 6, flicker: 0.25 });
    }
  }
  bx('wood', xs + 0.9, uy, f * (z1 - 1.2), 0.18, 0.45, 0.18);
  // (By the stair head, against the rail: a stack of crates, and a peg-rail of coats on the wall over them.)
  bx('wood', xs + 0.45, uy, f * (z1 - 0.45), 0.3, 0.55, 0.3, h.yaw + 0.2); bx('dark:wood', xs + 0.45, uy + 0.55, f * (z1 - 0.45), 0.24, 0.42, 0.24, h.yaw - 0.15);
  { const rx = bxx - 1.15, rz = bz + f * 0.2, rw = 0.55, rl = 0.9; K.quad(r(29) < 0.5 ? 'cloth_red' : 'cloth_oat', P(rx - rw, uy + 0.012, rz - rl), P(rx + rw, uy + 0.012, rz - rl), P(rx + rw, uy + 0.012, rz + rl), P(rx - rw, uy + 0.012, rz + rl), [0, 1, 0]); }
  // (A straw pallet on the floor along the front, by the right wall, where there's room for one: a second sleeper.)
  if (ix > 2.8 && iz > 3.2) {
    bx('dark:cloth_oat', ix - 0.5, uy, f * 0.3, 0.4, 0.14, 0.85); bx(blanket, ix - 0.5, uy + 0.14, f * (0.3 - 0.6), 0.38, 0.1, 0.12);
    bx('dark:wood', ix - 0.4, uy, f * 1.6, 0.3, 0.75, 0.2);
  }
}
// A round tower from the ground (or y) up, with a steep cone or a crown of merlons; a ring gallery near its head if big.
function tower(K, layer, x, z, r, h, roof, o = {}) {
  const y = o.y ?? Y(x, z);
  // (pass: a height from which it's walked through, the wall-walk's: solid below that, a doorway's worth of air above.)
  K.drum(layer, x, y - (o.sink ?? 3), z, r, h + (o.sink ?? 3), o.sides || 12, { collide: o.pass === undefined ? o.collide : false });
  if (o.pass !== undefined) K.colliders.push({ x, z, hx: r * 0.8, hz: r * 0.8, yaw: 0, h: h, t: o.pass - 0.4 });
  if (r >= 8) K.drum(layer, x, y + h - 7, z, r, 2, o.sides || 12, { r2: r + 2, open: true, collide: false }), K.drum(layer, x, y + h - 5, z, r + 2, 5, o.sides || 12, { open: true, collide: false });
  if (roof) K.cone(roof, x, y + h, z, r + (r >= 8 ? 2.4 : 0.8), r * (o.steep ?? 2.4), o.sides || 12);
  else for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; K.box(layer, x + Math.cos(a) * (r - 0.5), y + h, z + Math.sin(a) * (r - 0.5), 0.8, 1.6, 0.5, -a, { collide: false }); }
  return y + h;
}
// A bridge between two points in the air: a deck, a parapet either side, and pointed hangers under it. Not stood on yet.
function bridge(K, layer, a, b, w = 3, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx), n = Math.max(1, Math.round(L / 14));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, x = a[0] + dx * u, y = a[1] + dy * u, z = a[2] + dz * u, sag = o.arch ? -Math.sin(u * Math.PI) * o.arch : 0;
    K.box(layer, x, y - 4 - sag, z, L / n / 2 + 0.1, 4, w, yaw, { collide: false });
    if (o.piers && i % 2 === 1) { const fy = Math.max(Y(x, z), y - 190); K.box(layer, x, fy, z, 2.6, y - 4 - sag - fy, w * 0.8, yaw, { collide: false }); }
    for (const s of [-1, 1]) K.box(layer, x + Math.sin(yaw) * s * w, y - sag, z + Math.cos(yaw) * s * w, L / n / 2 + 0.1, 1.2, 0.3, yaw, { collide: false });
    // (A buttress pier hanging under every other span: the bridge's teeth.)
    if (i % 2 === 0 && n > 2) K.spike(layer, x, y - 2 - sag, z, w * 0.8, -(6 + 5 * hash2(i, n)), 4, yaw);
  }
  // (walk: its deck is stood on, a tread at a time, following its fall and its arch. Its ends run a little into what it joins.)
  if (o.walk) {
    const m = Math.ceil((L + 4) / 0.9), rects = [];
    for (let k = 0; k < m; k++) { const u = ((k + 0.5) * 0.9 - 2) / L, v = Math.min(1, Math.max(0, u)); rects.push([a[0] + dx * u, a[2] + dz * u, 0.5, w - 0.4, yaw, a[1] + dy * v + (o.arch ? Math.sin(v * Math.PI) * o.arch : 0)]); }
    walk(K, rects);
  }
}
// Decks to stand on, high over ground that's walked on too (the patio, the Keep's steps, the stairs): [x, z, half across,
// half through, yaw, y] each. (stack and over: src/sim/world.js platformAt.)
function walk(K, rects) { K.deck(rects); const p = K.floors.at(-1); p.stack = true; p.over = true; return p; }
// A stair that winds round (cx, cz) at radius r from y0 to y1, half a metre a step: the way up the outside of a tower, or
// (layer null: nothing drawn) up the inside of one. a0: where it starts; dir: which way it turns; turn: the whole angle
// it's to wind through, if it must end somewhere. Returns the angle it ends at.
function spiral(K, layer, cx, cz, r, y0, y1, a0 = 0, dir = 1, o = {}) {
  const n = Math.max(1, Math.ceil((y1 - y0) / 0.5)), rise = (y1 - y0) / n, da = o.turn !== undefined ? o.turn / n : 0.95 / r, hw = o.hw ?? 2, half = Math.abs(da) * r / 2 + 0.08, rects = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + dir * (k + 0.5) * da, y = y0 + (k + 1) * rise, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    rects.push([x, z, hw, half, -a, y]);
    // (On a phone four steps are drawn as one block: the floors are the same.)
    if (layer && (!K.lean || k % 4 === 0)) K.box(layer, x, y - 1.6, z, hw, 1.6, K.lean ? half * 4 : half, -a, { collide: false });
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
}
// A block with a ridged roof at a height of its own (the castle's halls, which stand on the rock or on each other).
function hall(K, layer, roof, x, y, z, hx, h, hz, yaw = 0, o = {}) {
  K.box(layer, x, y, z, hx, h, hz, yaw, { collide: o.collide, top: false });
  gable(K, roof, x, y + h, z, hx + 0.6, hz + 0.6, hz * (o.pitch ?? 0.8), yaw);
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
const streetNear = (x, z) => {
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
const LOOK = {
  barbican: { lot: [14, 12], h: [9, 14], fill: 0.5, wall: ['ph_basalt', 'dark:block'], roof: ['dark:roof_2'], row: 3, alley: 6 },
  cinder: { lot: [9, 10], h: [4, 10], fill: 0.86, wall: ['ph_burnt_wall', 'ph_soot_brick', 'ph_burnt_wall'], roof: [null, null, null, 'dark:roof_2'] },
  rookeries: { lot: [7, 9], h: [9, 17], fill: 0.97, wall: ['ph_poor_brick', 'ph_poor_brick', 'ph_soot_brick', 'ph_daub'], roof: ['roof_3', 'roof_4', 'dark:roof_2'], row: 5, alley: 2.4 },
  market: { lot: [8, 11], h: [8, 13], fill: 0.95, wall: ['ph_market_wall', 'ph_market_wall', 'ph_daub'], roof: ['roof_1', 'roof_2'], open: 48 },
  wharf: { lot: [16, 13], h: [8, 11], fill: 0.9, wall: ['ph_poor_brick', 'rubble'], roof: ['roof_4'], row: 2 },
  tanners: { lot: [8, 10], h: [7, 11], fill: 0.94, wall: ['ph_daub', 'ph_poor_brick', 'ph_daub'], roof: ['roof_3', 'roof_4'] },
  bones: { lot: [10, 13], h: [6, 10], fill: 0.3, wall: ['pale:stone', 'pale:rubble'], roof: ['dark:roof_2'], row: 3, alley: 7 },
  barracks: { lot: [22, 11], h: [9, 12], fill: 0.9, wall: ['block', 'course'], roof: ['roof_2'], open: 62, row: 2, alley: 5 },
  mages: { lot: [11, 12], h: [11, 16], fill: 0.9, wall: ['ph_dressed', 'ph_rich_brick', 'frost:course'], roof: ['dark:roof_2', 'roof_2'], spires: 0.12, row: 3 },
  dukes: { lot: [15, 15], h: [10, 14], fill: 0.85, wall: ['ph_dressed', 'ph_rich_brick'], roof: ['roof_1', 'dark:roof_2'], spires: 0.04, row: 2, alley: 5 },
  approach: { lot: [11, 12], h: [9, 14], fill: 0.85, wall: ['ph_granite', 'ph_dressed'], roof: ['dark:roof_2'], row: 3 },
  other: { lot: [8, 10], h: [7, 12], fill: 0.93, wall: ['ph_market_wall', 'ph_poor_brick', 'ph_daub'], roof: ['roof_3', 'roof_4', 'roof_1'] },
};
function districtAt(x, z) {
  let best = 'other', q = 1.3, at = null;
  for (const d of PHOBOS.districts) { const k = Math.hypot(x - d.x, z - d.z) / d.r; if (k < q) { q = k; best = d.key; at = d; } }
  return { key: best, d: at };
}

function wall(K) {
  const W = CITY_WALL, T = 12, H = 50, L = 'ph_basalt';
  const gates = PHOBOS.gates.map((g) => [g.x, g.z]);
  // (Each side's top is level, at H over the highest ground along it, and walked: the wall-walk. It stops at every tower
  // for now: the doors through them come with the wall's own section.)
  const TOP = W.map((a, i) => {
    const b = W[(i + 1) % 12]; let hi = -Infinity;
    for (let k = 0; k <= 40; k++) hi = Math.max(hi, Y(a[0] + (b[0] - a[0]) * k / 40, a[1] + (b[1] - a[1]) * k / 40));
    return hi + H + 0.06;
  });
  let top = 0;
  const run = (a, b) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 4) return;
    K.wall(L, a[0], a[1], b[0], b[1], T, H, { crenel: true, y: top - 0.06 - H });
    walk(K, [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len / 2 + 1, T / 2, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), top]]);
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
      const gx = a[0] + ux * t, gz = a[1] + uz * t, gy = Y(gx, gz);
      for (const s of [-1, 1]) tower(K, 'ph_basalt', gx + ux * s * 24, gz + uz * s * 24, 16, 122, 'dark:roof_2', { steep: 2.2, sides: 16, pass: top });
      // (Over the way in: the gate's head, and his red down it.)
      K.box('ph_basalt', gx, gy + 16, gz, 11, 62, 10, Math.atan2(-uz, ux), { collide: false });
      walk(K, [[gx, gz, 12, T / 2, Math.atan2(-uz, ux), top]]);
      K.hanging('cloth_red', gx - uz * 10.3, gy + 74, gz + ux * 10.3, [-uz, ux], 9, 50, 6); K.hanging('cloth_red', gx + uz * 10.3, gy + 74, gz - ux * 10.3, [uz, -ux], 9, 50, 6);
      // (The portcullis, wound up into the head all but its teeth, on the outer face; iron.)
      { const o = (uz * (gx - CITY.x) - ux * (gz - CITY.z)) > 0 ? 1 : -1, nx = uz * o, nz = -ux * o, px = gx + nx * 9.4, pz = gz + nz * 9.4, yw = Math.atan2(-uz, ux);
        for (let b = -7.6; b <= 7.61; b += 0.95) K.box('iron', px + ux * b, gy + 12.6, pz + uz * b, 0.09, 3.6, 0.09, yw, { collide: false });
        for (const y of [13.4, 15.2]) K.box('iron', px, gy + y, pz, 7.7, 0.12, 0.08, yw, { collide: false });
        for (let b = -7.6; b <= 7.61; b += 0.95) K.box('iron', px + ux * b, gy + 12.2, pz + uz * b, 0.05, 0.42, 0.05, yw + 0.785, { collide: false });
        GATE_FACE.push({ x: gx, z: gz, nx, nz, ux, uz, y: gy }); }
    } else run(a, b);
    // A great drum at each corner: inside it a stair winds from the lower of the two walks that meet there up to the
    // higher. And a lesser tower every 100 m or so between, walked straight through.
    const prev = TOP[(i + 11) % 12], lo = Math.min(prev, top), hi = Math.max(prev, top), pa = W[(i + 11) % 12];
    tower(K, 'ph_basalt', a[0], a[1], 17, Math.max(92, hi - Y(a[0], a[1]) + 30), 'dark:roof_2', { steep: 2, sides: 16, pass: lo });
    if (hi - lo > 0.6) {
      // (It starts over the lower walk and ends over the higher: along this side from the corner, or back along the last.)
      const along = Math.atan2(uz, ux), back = Math.atan2(pa[1] - a[1], pa[0] - a[0]), from = top < prev ? along : back, to = top < prev ? back : along;
      const n = Math.ceil((hi - lo) / 0.5), want = n * 0.95 / 6; let turn = ((to - from) % TAU + TAU) % TAU;
      turn += TAU * Math.max(0, Math.round((want - turn) / TAU));
      spiral(K, null, a[0], a[1], 6, lo, hi, from, 1, { turn, hw: 2.4 });
    }
    const n = Math.round(len / 100);
    for (let k = 1; k < n; k++) {
      const x = a[0] + ux * len * k / n, z = a[1] + uz * len * k / n;
      if (g && Math.hypot(x - g[0], z - g[1]) < 60) continue;
      tower(K, 'ph_basalt', x, z, 11, Math.max(74, top - Y(x, z) + 24), k % 2 ? null : 'dark:roof_2', { pass: top });
    }
  }
  // The ways up onto it: a stair inside the wall beside the Drawbridge Gate (south of it) and one beside the Castle Gate
  // (north of it), from the street to the walk.
  { const fx = CITY.x - CITY.a + T / 2, zc = 70; stairs(K, 'dark:stone', fx, zc, Y(fx + 8, zc), TOP[5], 1); }
  { const fx = CITY.x + CITY.a - T / 2, zc = -70; stairs(K, 'dark:stone', fx, zc, Y(fx - 8, zc), TOP[11], -1); }
  // The barbican outside the Drawbridge Gate: two towers and a yard wall past the moat, and the bridge's deck over it.
  const bx = CITY.x - CITY.a - 34;
  for (const s of [-1, 1]) tower(K, 'ph_basalt', bx, s * 24 - 6, 10, 48, 'dark:roof_2');
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
function waters(K) {
  const at = (th, k) => { let m = 0; for (let j = 0; j < 12; j++) m = Math.max(m, Math.cos(th - j * Math.PI / 6)); const r = k / m; return [CITY.x + CITY.a * r * Math.cos(th), CITY.z + CITY.b * r * Math.sin(th)]; };
  const gw = (x, z) => (Math.abs(z) < 19 && x - CITY.x > 600) || (Math.abs(x - 9900) < 19 && z < -700) || (Math.abs(x - 9950) < 19 && z > 700);
  const N = 360, ring = [];
  for (let i = 0; i <= N; i++) { const th = i / N * TAU, [cx, cz] = at(th, 1.047), a = at(th, 1.016), b = at(th, 1.08); ring.push({ a, b, y: Y(cx, cz) + 2.4, gate: gw(cx, cz) || gw(...a) || gw(...b) }); }
  for (let i = 0; i < N; i++) { const p = ring[i], q = ring[i + 1]; if (p.gate || q.gate) continue; K.quad('dark:water', [p.a[0], p.y, p.a[1]], [q.a[0], q.y, q.a[1]], [q.b[0], q.y, q.b[1]], [p.b[0], p.y, p.b[1]], [0, 1, 0]); }
  const over = STREETS.filter((st) => st.name !== 'The Corpse Quay');
  const bridge = (x, z) => over.some((st) => st.pts.some((q, j) => j + 1 < st.pts.length && segD(x, z, q, st.pts[j + 1]) < st.w + 8));
  for (let i = 0; i + 1 < SLOUGH.length; i++) {
    const A = SLOUGH[i], B = SLOUGH[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L, n = Math.ceil(L / 6), w = 10.5;
    for (let k = 0; k < n; k++) {
      const t0 = k / n * L, t1 = (k + 1) / n * L, p = [A[0] + ux * t0, A[1] + uz * t0], q = [A[0] + ux * t1, A[1] + uz * t1];
      if (cityIn(...p) > 1.012 || cityIn(...q) > 1.012 || bridge(...p) || bridge(...q)) continue;
      const y = Y((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) + 2.6;
      K.quad('water', [p[0] - uz * w, y, p[1] + ux * w], [q[0] - uz * w, y, q[1] + ux * w], [q[0] + uz * w, y, q[1] - ux * w], [p[0] + uz * w, y, p[1] - ux * w], [0, 1, 0]);
    }
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
  const put = (o) => {
    if (o.spire && (inHub(o.x, o.z, o.r + 1) || inSealSquare(o.x, o.z, o.r + 1))) return;
    if (!o.spire) {
      const kx = Math.floor(o.x / 30), kz = Math.floor(o.z / 30);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of grid.get(`${kx + a}_${kz + b}`) || []) if (hits(o, q)) return;
      (grid.get(gk(o.x, o.z)) || grid.set(gk(o.x, o.z), []).get(gk(o.x, o.z))).push(o);
    }
    o.cell = cellOf(o.x, o.z); out.push(o);
  };
  // (The hubs' halls first, and their yards kept clear: a yard's a rect no city house may stand in.)
  for (const hb of HUBS) (grid.get(gk(hb.x, hb.z)) || grid.set(gk(hb.x, hb.z), []).get(gk(hb.x, hb.z))).push({ x: hb.x, z: hb.z, yaw: hb.yaw, hx: hb.hx + 1, hz: hb.hz + 1, yard: true });
  for (const o of hubHouses()) { o.cell = cellOf(o.x, o.z); out.push(o); }
  // (And the seals' squares: src/core/phobos-seals.js.)
  for (const s of PHOBOS_SEALS) (grid.get(gk(s.x, s.z)) || grid.set(gk(s.x, s.z), []).get(gk(s.x, s.z))).push({ x: s.x, z: s.z, yaw: s.yaw, hx: SEAL_SQUARE + 0.5, hz: SEAL_SQUARE + 0.5, yard: true });
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
        if (S.spires && hash2(id, 3) < S.spires) { put({ spire: true, x, z, r: Math.min(uw, ud) * 0.42, h: 26 + hsh * 34, wall: pick(S.wall) }); continue; }
        // (Its door's in the long side that looks out on the alley, not the one on the yard.)
        put({ x, z, yaw: zn.turn, hx: uw * 0.5 + 0.02, hz: ud * 0.5, h, wall: pick(S.wall), roof: pick(S.roof), front: row ? 1 : -1 });
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
        put({ x, z, yaw, hx: uw * 0.5 + 0.02, hz: ud * 0.5, h, wall: S.wall[Math.floor(v * 97) % S.wall.length], roof: S.roof[Math.floor(v * 53) % S.roof.length] || (spine ? 'dark:roof_2' : null), front: -sd, shop: true });
      }
    }
  }
  HOUSES = out;
  return out;
}
const byCell = () => { const m = new Map(); for (const h of phobosHouses()) (m.get(h.cell) || m.set(h.cell, []).get(h.cell)).push(h); return m; };
// The far view of all of them, a group to each cell (src/core/sites.js Kit.group), so the renderer can fold a cell's away
// when it has the near view of it up (src/gfx/phobos-near.js); and what stops a body at each, which never changes.
function districts(K) {
  for (const [cell, list] of byCell()) K.group('ph:' + cell, true, () => { for (const h of list) { if (h.spire) tower(K, h.wall, h.x, h.z, h.r, h.h, 'dark:roof_2', { steep: 3 }); else houseFar(K, h); } });
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
export function phobosLamps() {
  if (LAMPS) return LAMPS;
  LAMPS = [];
  for (const st of STREETS) for (let i = 0; i + 1 < st.pts.length; i++) {
    const a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, n = Math.floor(L / 22);
    for (let k = 0; k < n; k++) {
      const sd = (k + i) % 2 ? 1 : -1, t = (k + 0.5) * 22, off = st.w - 0.5, x = a[0] + ux * t - uz * off * sd, z = a[1] + uz * t + ux * off * sd;
      if (cityIn(x, z) > 0.97 || sloughD(x, z) < 6 || inSealSquare(x, z, 1)) continue;
      LAMPS.push({ x, z, yaw: Math.atan2(-uz, ux) + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), iron: st.w > 5, cell: cellOf(x, z) });
    }
  }
  return LAMPS;
}
export function phobosCell(K, cell) {
  const n0 = K.colliders.length;
  for (const l of phobosLamps()) if (l.cell === cell) {
    const hh = l.iron ? 3.6 : 2.8;
    K.lantern(l.x, l.z, hh, l.yaw, l.iron ? 'iron' : 'wood');
    (K.lamps ||= []).push({ p: [l.x + Math.cos(l.yaw) * 0.45, Y(l.x, l.z) + hh - 0.4, l.z - Math.sin(l.yaw) * 0.45], c: [1, 0.66, 0.34], r: 36, i: 22, flicker: 0.3 });
  }
  for (const h of byCell().get(cell) || []) { if (h.spire) tower(K, h.wall, h.x, h.z, h.r, h.h, 'dark:roof_2', { steep: 3 }); else houseNear(K, h); }
  for (const hb of HUBS) if (cellOf(hb.x, hb.z) === cell) hubNear(K, hb);
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
  { const d = { x: D.bones.x + 14, z: D.bones.z - 62 }, y = Y(d.x, d.z); hall(K, 'dark:ashlar', 'dark:roof_2', d.x, y - 2, d.z, 64, 56, 21, 0.2, { pitch: 1.1 }); for (const s of [-1, 1]) tower(K, 'dark:course', d.x - 62 + s * 4, d.z + s * 24 - 13, 10, 128, 'dark:roof_2', { steep: 4 }); }
  // Chainmarket: the gibbet tower in the square's middle, chains out from its head.
  { const d = { x: D.market.x + 4, z: D.market.z - 34 }, top = tower(K, 'ph_basalt', d.x, d.z, 8, 72, null); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; K.beam('iron', [d.x + Math.cos(a) * 7, top - 3, d.z + Math.sin(a) * 7], [d.x + Math.cos(a) * 30, top - 40, d.z + Math.sin(a) * 30], 0.45); } }
  // The Barracks Ward: the parade ground's four corner forts, the long drill hall, and the Marshal's tower over it.
  { const d = D.barracks, y = Y(d.x, d.z); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tower(K, 'block', d.x + sx * 60, d.z + sz * 60, 11, 46, null); hall(K, 'block', 'roof_2', d.x, y - 1, d.z - 84, 54, 26, 13, 0, { buttress: false }); K.box('block', d.x + 70, y - 2, d.z - 84, 12, 84, 12, 0); K.cone('roof_2', d.x + 70, y + 82, d.z - 84, 15, 30, 4, Math.PI / 4); }
  // The Mages' Rise: the Tower of the Ninefold Eye, taller than anything in the city, and two lesser by it.
  { const g = dun('mages'); const top = tower(K, 'frost:course', g.x, g.z, 15, 196, 'dark:roof_2', { steep: 3.6, sides: 16 }); K.drum('glow', g.x, top - 24, g.z, 15.3, 8, 16, { open: true, collide: false }); tower(K, 'frost:course', g.x - 34, g.z + 20, 7, 104, 'dark:roof_2', { steep: 4 }); tower(K, 'frost:course', g.x + 26, g.z + 30, 6, 86, 'dark:roof_2', { steep: 4 }); }
  // Dukes' Row: the Gilded Vault, a domed counting house.
  { const q = dun('dukes'), g = { x: q.x + 26, z: q.z + 30 }, y = Y(g.x, g.z); K.box('pale:course', g.x, y - 2, g.z, 34, 40, 34, 0.3); K.drum('pale:stone', g.x, y + 38, g.z, 25, 12, 16); K.cone('roof_1', g.x, y + 50, g.z, 26, 28, 16); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tower(K, 'pale:course', g.x + sx * 36, g.z + sz * 36, 5, 62, 'roof_1', { steep: 3 }); }
  // The Rookeries: the Rotting Hospice, a hulk over the tenements, with its bell cote.
  { const g = dun('rookeries'), y = Y(g.x, g.z); hall(K, 'rubble', 'roof_4', g.x, y - 1, g.z, 40, 44, 16, 0.9, { buttress: false }); K.box('rubble', g.x + 30, y - 1, g.z + 30, 7, 76, 7, 0.9); K.cone('roof_4', g.x + 30, y + 75, g.z + 30, 9, 20, 4, 0.9 + Math.PI / 4); }
  // The Drowned Wharf: the sluice house and its wheel tower. The Tanners' Steps: the great stack.
  { const g = dun('wharf'); tower(K, 'dark:course', g.x, g.z, 14, 64, 'roof_4', { steep: 1.4, sides: 16 }); }
  { const d = { x: D.tanners.x - 85, z: D.tanners.z + 70 }, y = Y(d.x + 30, d.z - 20); K.drum('rubble', d.x + 30, y - 2, d.z - 20, 9, 96, 12, { r2: 5 }); K.box('rubble', d.x + 30, y - 2, d.z - 20, 20, 22, 16, 0.4); }
  // The Cinder Quarter: the burnt minster, roofless, its west front and one tower still standing.
  { const d = { x: D.cinder.x + 30, z: D.cinder.z - 84 }, y = Y(d.x, d.z); for (const sd of [-1, 1]) K.wall('dark:rubble', d.x - 44, d.z + sd * 16, d.x + 44, d.z + sd * 16, 3, 44, { ruin: true }); K.box('dark:rubble', d.x - 46, y - 2, d.z, 4, 64, 18, 0); tower(K, 'dark:rubble', d.x - 46, d.z - 22, 8, 98, null); }
  // Ironmercy Gaol: a block with a tower at each corner and a taller one over its gate.
  { const g = dun('barracks'), y = Y(g.x, g.z); K.box('dark:block', g.x, y - 2, g.z, 34, 38, 26, 0.2); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tower(K, 'dark:course', g.x + sx * 33, g.z + sz * 26, 7, 58, null); tower(K, 'dark:course', g.x - 36, g.z, 9, 88, 'dark:roof_2', { steep: 2.6 }); }
  // The three forts (stood back off the street each is named on).
  for (const q of PHOBOS.forts) { const o = [[0, 0], [30, 24], [-30, 24], [30, -24], [-30, -24], [0, 44], [0, -44]].find(([dx, dz]) => streetNear(q.x + dx, q.z + dz).d > 36) || [0, 0], f = { x: q.x + o[0], z: q.z + o[1] }, y = Y(f.x, f.z); K.box('dark:block', f.x, y - 2, f.z, 18, 34, 18, 0.4); tower(K, 'dark:course', f.x + 15, f.z - 15, 8, 66, 'dark:roof_2'); }
}

// What the streets have that's seen from far: the King's Mile's two sidewalks, flagged and a hand higher than the roadway,
// under its house fronts; and Chainmarket's ring of stalls round the gibbet tower, with carts among them.
function streets(K) {
  for (const st of STREETS) {
    const spine = st.w > 5, wide = spine ? 1.6 : 0.8;
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(-uz, ux), n = Math.ceil(L / 8);
      for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
        const t = (k + 0.5) * L / n, off = st.w - wide + 0.1, x = a[0] + ux * t - uz * off * sd, z = a[1] + uz * t + ux * off * sd;
        if (cityIn(x, z) > 0.97 || (x > 10430 && Math.abs(z) < 48) || sloughD(x, z) < 6) continue;
        // (The walk a hand higher than the roadway, and a kerb of stone along its edge.)
        K.paving('flags', x, z, L / n / 2 + 0.05, wide, yaw, 0.16);
        if (K.lean) continue;
        const kx = x + uz * (wide + 0.12) * sd, kz = z - ux * (wide + 0.12) * sd;
        // (Its top and its face to the road: two quads, not a box.)
        const ky = Y(kx, kz), hl = L / n / 2 + 0.05, e = (du, dv, yy) => [kx + ux * du + uz * dv * sd, yy, kz + uz * du - ux * dv * sd];
        K.quad('stone', e(-hl, -0.14, ky + 0.2), e(hl, -0.14, ky + 0.2), e(hl, 0.14, ky + 0.2), e(-hl, 0.14, ky + 0.2), [0, 1, 0]);
        K.quad('stone', e(-hl, 0.14, ky - 0.1), e(hl, 0.14, ky - 0.1), e(hl, 0.14, ky + 0.2), e(-hl, 0.14, ky + 0.2), [uz * sd, 0, -ux * sd]);
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
    if ((i + j) % 4 === 0 && v > 0.3) { K.lantern(x + 3.4, z + 2.6, 3.2, v * 6, 'wood'); (K.lamps ||= []).push({ p: [x + 3.4, Y(x, z) + 2.8, z + 2.6], c: [1, 0.66, 0.34], r: 30, i: 18, flicker: 0.3 }); }
  }
  K.colliders.length = n0;
}
export function phobosCity(K) { wall(K); districts(K); streets(K); landmarks(K); hubFar(K); }

// ---------------------------------------------------------------- the castle

// The ground's height on the crag by ward, and a spot's own.
const wardY = (i) => PLAIN + WARDS[i][1];
export function phobosCastle(K) {
  const S = 'ph_granite', C = 'ph_granite', B = 'ph_granite', R = 'dark:roof_2';
  // The outer curtain round the crag's edge, a tower every third stretch; the ward walls across it at each step up.
  const ring = [];
  for (let i = 0; i < 44; i++) { const a = i / 44 * TAU; ring.push([CRAG.x + Math.cos(a) * CRAG.a * 0.86, CRAG.z + Math.sin(a) * CRAG.b * 0.86]); }
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    if (Math.abs(p[1]) < 22 && p[0] < CRAG.x) return;   // (the gate, at the west end)
    K.wall(B, p[0], p[1], q[0], q[1], 5, 24, { crenel: true });
    if (i % 3 === 0) tower(K, C, p[0], p[1], 8, 48 + 14 * hash2(i, 4), i % 2 ? R : null, { steep: 2.6 });
  });
  // (Only the Middle Ward's: where the High Ward's wall would run the Keep's body stands.)
  for (const [i, x0] of [[1, WARDS[1][0]]]) {
    for (const s of [-1, 1]) { K.wall(B, x0 - s * 46 * 0.22 - 0, s * 24, x0 - s * 250 * 0.22, s * 250, 8, 48, { crenel: true }); tower(K, C, x0, s * 24, 13, 96, R, { steep: 2.4, sides: 16 }); for (const zz of [90, 170]) tower(K, C, x0 - s * zz * 0.22, s * zz, 9, 70, zz > 100 ? R : null); }
    K.box(S, x0, Y(x0, 0) + 14, 0, 9, 44, 16, 0, { collide: false });
  }
  // The gatehouse at the head of the Approach: two great drums and the gate's head between.
  const gx = CRAG.x - CRAG.a * 0.86, gy = Y(gx, 0);
  for (const s of [-1, 1]) tower(K, S, gx, s * 22, 13, 74, R, { steep: 2.2 });
  K.box(S, gx, gy + 13, 0, 9, 40, 10, 0, { collide: false });
  K.hanging('cloth_red', gx - 9.3, gy + 50, 0, [-1, 0], 8, 30, 5);

  // ---- the Lower Ward (+120): the working castle
  const y0 = wardY(0), y1 = wardY(1), y2 = wardY(2);
  hall(K, B, R, 10850, Y(10850, 150) - 2, 150, 44, 22, 12, 0.25);            // the Barracks and Drill Halls
  hall(K, B, R, 10880, Y(10880, 215) - 2, 215, 30, 16, 10, 0.25);            // the Armoury
  K.box(B, 10835, Y(10835, 235) - 2, 235, 14, 18, 12, 0.25); for (const dx of [-7, 7]) K.drum(C, 10835 + dx, Y(10835, 235) + 16, 235, 2.6, 22, 8, { collide: false });   // the Forge and its stacks
  hall(K, B, R, 10850, Y(10850, -150) - 2, -150, 40, 20, 13, -0.25);         // the Kitchens and Cellars
  hall(K, B, R, 10890, Y(10890, -215) - 2, -215, 26, 14, 9, -0.25);          // the Servants' Warren
  tower(K, C, 10905, 75, 11, 58, null);                                       // the Oubliettes' stair
  // The Aqueduct: a run of arches from the north side out over the cliff, dropping into the city's High Conduits.
  for (let i = 0; i < 9; i++) { const x = 10830 - i * 22, z = -110 - i * 7, top = y0 + 26; K.box(S, x, Y(x, z) - 2, z, 3, top - Y(x, z) + 2, 4, 0.3, { collide: false }); K.box(S, x + 11, top - 3, z - 3.5, 11.2, 5, 3, 0.3, { collide: false }); }

  // ---- the Middle Ward (+175): the halls
  hall(K, S, R, 11040, y1 - 2, 0, 52, 52, 19, 0, { pitch: 1 });               // the Great Hall
  // The Ancient Library: the biggest room in the castle, a great nave with a glazed end and a stair tower at each corner.
  hall(K, S, R, 11050, y1 - 2, -150, 62, 96, 34, 0.12, { pitch: 0.9 });
  K.quad('glow', [10987.5, y1 + 14, -126], [10987.5, y1 + 14, -174], [10987.5, y1 + 80, -174], [10987.5, y1 + 80, -126], [-1, 0, 0]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tower(K, C, 11050 + sx * 64, -150 + sz * 36, 7, 124, R, { y: y1, steep: 3.4, collide: false });
  hall(K, S, R, 10985, y1 - 2, -70, 12, 28, 40, 0, { pitch: 0.5, buttress: false });   // the Portrait Gallery, a long wing
  K.box(S, 11110, y1 - 2, -70, 22, 34, 18, 0); K.drum('dark:stone', 11110, y1 + 32, -70, 12, 4, 12, { collide: false });   // the Map Room
  hall(K, S, R, 11030, y1 - 2, 120, 40, 36, 15, -0.1);                        // the Alchemists' Wing
  K.box('ice', 11085, y1 - 2, 190, 26, 22, 16, -0.1); K.drum('ice', 11085, y1 + 20, 190, 15, 2, 14, { collide: false }); K.cone('ice', 11085, y1 + 22, 190, 15, 16, 14);   // the Conservatory of Dead Plants: glass
  hall(K, B, R, 11000, y1 - 2, 200, 34, 24, 14, -0.3, { buttress: false });   // the Menagerie
  // The Clock Tower and the Bell Galleries' campanile: two square shafts, the tallest things below the Keep.
  for (const [x, z, half, h, name] of [[11105, 75, 11, 190, 'clock'], [11140, 135, 8, 220, 'bells']]) {
    K.box(S, x, y1 - 2, z, half, h, half, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.spike(R, x + sx * half, y1 + h - 2, z + sz * half, 2.4, 22, 4, Math.PI / 4);
    K.cone(R, x, y1 + h - 2, z, half * 1.25, half * 4.5, 4, Math.PI / 4);
    if (name === 'clock') for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) K.drum('glow', x + nx * (half + 0.2), y1 + h - 24, z + nz * (half + 0.2), 6, 0.4, 16, { collide: false });
    else K.box('dark:stone', x, y1 + h - 34, z, half + 1.5, 3, half + 1.5, 0, { collide: false });
  }

  // ---- the High Ward: his own. Its halls stand on the Keep's body's first two steps (STEPS), round the trunk's foot.
  const t1 = PLAIN + 300, t2 = PLAIN + 372, kx = KEEP.x + 40;
  hall(K, S, R, kx - 20, t1, -148, 84, 62, 17, 0, { pitch: 1.2, collide: false });        // the Sanctuaries: the black nave, along the north terrace
  for (const s of [-1, 1]) tower(K, C, kx - 106, -148 + s * 13, 7, 128, R, { y: t1, steep: 4.4, collide: false });
  hall(K, S, R, kx - 10, t1, 148, 80, 50, 17, 0, { pitch: 0.9, collide: false });         // the Hall of Mirrors, along the south
  hall(K, S, R, kx + 136, t1, -70, 12, 44, 40, 0, { pitch: 0.6, collide: false });        // the Ossuary Chapel, on the east terrace
  K.box(B, kx + 136, t1, 70, 12, 36, 34, 0, { collide: false });                          // the Generals' Crypt's house
  K.box(B, kx + 70, t2, 108, 24, 40, 12, 0, { collide: false }); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.spike(R, kx + 70 + sx * 24, t2 + 40, 108 + sz * 12, 3, 22, 4, Math.PI / 4);   // the Treasury
  { const ox = kx + 96, oz = -100; K.drum(C, ox, t2, oz, 20, 56, 16, { collide: false }); K.drum('dark:stone', ox, t2 + 56, oz, 20, 5, 16, { r2: 16, collide: false }); K.cone(R, ox, t2 + 61, oz, 16, 16, 16); }   // the Observatory's drum and dome
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
  const S = 'ph_keep_wall', C = 'ph_keep_wall', R = 'dark:roof_2', G = 'dark:stone';
  const x = KEEP.x, z = KEEP.z, base = PLAIN + KEEP.base, P = (h) => PLAIN + h;
  // The Keep's own body: three great steps of masonry on the High Ward, each set back from the one under it, arcaded down
  // their faces and turreted at their corners. The trunk rises through them and the spires stand round them: without it
  // the Keep is a handful of pencils. (The High Ward's halls stand on its lower steps: phobosCastle.)
  STEPS.forEach(([hx, hz, a, b], i) => {
    const cx = x + 40 - i * 8;
    const foot = i === 0 ? PLAIN + 165 : P(a);   // (the first goes down into the rock: it overhangs the Middle Ward)
    K.box(S, cx, foot, z, hx, P(b) - foot, hz, 0, { collide: false });
    // (Solid from the side, stood on from above: t, the top less a step, as the portals' terraces have it.)
    K.colliders.push({ x: cx, z, hx, hz, yaw: 0, h: P(b) - Y(cx, z), t: P(b) - 0.45 });
    walk(K, [[cx, z, hx, hz, 0, P(b)]]);
    const fins = (len) => Math.max(3, Math.round(len / 9));
    for (const sd of [-1, 1]) {
      for (let k = 0, n = fins(hx); k <= n; k++) { const fx = cx - hx + 2 * hx * k / n; K.box(G, fx, P(a), z + sd * (hz + 1.2), 1.4, (b - a) * 0.84, 1.6, 0, { collide: false }); K.spike(R, fx, P(a) + (b - a) * 0.84, z + sd * (hz + 1.4), 1.5, 9, 4, Math.PI / 4); }
      for (let k = 0, n = fins(hz); k <= n; k++) { const fz = z - hz + 2 * hz * k / n; K.box(G, cx + sd * (hx + 1.2), P(a), fz, 1.6, (b - a) * 0.84, 1.4, 0, { collide: false }); K.spike(R, cx + sd * (hx + 1.4), P(a) + (b - a) * 0.84, fz, 1.5, 9, 4, Math.PI / 4); }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { K.drum(C, cx + sx * hx, P(a), z + sz * hz, 7, b - a + 18, 10, { collide: false }); K.cone(R, cx + sx * hx, P(b) + 18, z + sz * hz, 8, 26, 10); }
    // (A row of merlons round each step's lip.)
    K.box(G, cx, P(b), z, hx + 1.5, 2.4, hz + 1.5, 0, { collide: false, top: false });
  });
  // The great stairs: up the west face of each step to its top, in flights that double back (STAIRS). The first climbs from
  // the Middle Ward, under the patio, to the first step's top; then one to each step above. The carve-out's way up: the
  // spires' own ways, and the stair inside the body, come with the Keep's section.
  STEPS.forEach(([hx, , , b], i) => {
    const face = x + 40 - i * 8 - hx, from = i === 0 ? Y(face - 8, STAIR_Z[i]) : P(STEPS[i - 1][3]);
    stairs(K, G, face, STAIR_Z[i], from, P(b));
  });
  // The Throne Tower: a trunk in four stages, each narrower, a gallery where each begins, and a crown of eight pinnacles
  // round the last with the spire in the middle of them.
  const stages = [[54, KEEP.base - 12, 400], [43, 400, 500], [33, 500, 580], [24, 580, 630]];
  stages.forEach(([r, a, b], i) => {
    K.drum(S, x, P(a), z, r, b - a, 20, { collide: i === 0 });
    K.drum(G, x, P(b) - 5, z, r, 2, 20, { r2: r + 3.5, open: true, collide: false }); K.drum(G, x, P(b) - 3, z, r + 3.5, 4, 20, { open: true, collide: false });
    // (Buttress fins up each stage, eight round.)
    for (let k = 0; k < 8; k++) { const t = k / 8 * TAU + i * 0.39; K.box(G, x + Math.cos(t) * (r + 1.5), P(a), z + Math.sin(t) * (r + 1.5), 2.6, (b - a) * 0.9, 1.6, -t, { collide: false }); K.spike(R, x + Math.cos(t) * (r + 2.6), P(a) + (b - a) * 0.9, z + Math.sin(t) * (r + 2.6), 2.2, 16, 4, t); }
  });
  for (let k = 0; k < 8; k++) { const t = k / 8 * TAU; K.drum(C, x + Math.cos(t) * 21, P(630), z + Math.sin(t) * 21, 2.8, 16, 8, { collide: false }); K.cone(R, x + Math.cos(t) * 21, P(646), z + Math.sin(t) * 21, 3.4, 18, 8); }
  K.cone(R, x, P(630), z, 17, KEEP.top - 630, 16);
  // His balcony, west, at the last stage's foot, looking down the whole of it to the Sill; and the fire in the crown.
  K.box(G, x - 38, P(578), z, 10, 2, 14, 0, { collide: false }); for (const s of [-1, 1]) K.spike(G, x - 43, P(578), z + s * 9, 2.6, -16, 4, 0);
  K.drum('flame', x, P(604), z, 24.3, 9, 20, { open: true, collide: false });
  K.hanging('cloth_red', x - 54.4, P(396), z, [-1, 0], 14, 130, 12);
  // The way up the trunk's outside from the body's top step: a stair winding round its third stage, by a gallery at 560
  // where the Blood Spire's bridge lands, to the gallery at its head; then round the fourth to the crown's floor.
  { let a = Math.PI + 0.9;
    a = spiral(K, G, x, z, 35.6, P(STEPS[3][3]), P(560), a, 1); ring(K, G, x, z, 32.5, 38.6, P(560));
    a = spiral(K, G, x, z, 35.6, P(560), P(580), a, 1); ring(K, G, x, z, 23, 38.6, P(580));
    a = spiral(K, G, x, z, 26.6, P(580), P(630), a, 1); ring(K, null, x, z, 0, 29, P(630)); }
  // The Grand Patio (the Crown Court): the first step's top carried on out west over the Middle Ward on tall piers, 190 m
  // wide, a row of pinnacles along its lip.
  { const py = P(300), px = x - 110 - 74;
    K.box(G, px, py - 7, z, 74, 7, 104, 0, { collide: false });
    walk(K, [[px, z, 74, 104, 0, py]]);
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
    K.drum('flame', sx, P(top) - 14, sz, r + 0.3, 4, 16, { open: true, collide: false });
    tops.push([sx, sz, r, foot, top]);
    // The way up its outside: a stair winding round it from the highest of the body's steps it stands against, by a
    // gallery a third and two thirds of the way up, to the gallery under its crown, where its bridge leaves.
    const RS = r + 5.4, on = STEPS.map(([hx, hz, , b], i) => ({ cx: x + 40 - i * 8, hx, hz, b })).filter((q) => Math.abs(sx - q.cx) < q.hx + RS && Math.abs(sz - z) < q.hz + RS).at(-1);
    let y = P(on.b), a = Math.atan2(z - sz, on.cx - sx) - 0.2;
    for (const lv of [P(foot) + (top - foot) * 0.34, P(foot) + (top - foot) * 0.67, P(top) - 20]) {
      if (lv <= y + 1) continue;
      a = spiral(K, G, sx, sz, RS, y, lv, a, 1); ring(K, G, sx, sz, r - 0.5, RS + 2.4, lv); y = lv;
    }
  }
  tops.forEach(([ax, az, ar, , atop], i) => {
    const nx = tops[i + 1] || [x, z, 33, 0, 590], [bx, bz, br] = nx, bfoot = i < 4 ? tops[i + 1][3] + (tops[i + 1][4] - tops[i + 1][3]) * 0.34 : 560;
    const d = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / d, uz = (bz - az) / d;
    bridge(K, G, [ax + ux * ar, P(atop) - 20, az + uz * ar], [bx - ux * br, P(bfoot), bz - uz * br], 5.5, { arch: 6, piers: true, walk: true });
    // (And each spire tied back to the trunk lower down, a flying bridge to its nearest gallery.)
    const dt = Math.hypot(x - ax, z - az), tx = (x - ax) / dt, tz = (z - az) / dt, ty = tops[i][3] + (atop - tops[i][3]) * 0.34;
    bridge(K, G, [ax + tx * ar, P(ty), az + tz * ar], [x - tx * (ty < 400 ? 54 : ty < 500 ? 43 : 33), P(ty) + 12, z - tz * (ty < 400 ? 54 : ty < 500 ? 43 : 33)], 4.5, { arch: 4, piers: true });
  });
  for (const i of [2, 3, 4]) {
    const [ax, az, ar, , atop] = tops[i], dt = Math.hypot(x - ax, z - az), tx = (x - ax) / dt, tz = (z - az) / dt, hy = atop - 26, rr = hy < 500 ? 43 : hy < 580 ? 33 : 24;
    bridge(K, G, [ax + tx * ar, P(hy), az + tz * ar], [x - tx * rr, P(hy) + 8, z - tz * rr], 4, { arch: 5 });
  }
  // The satellites: lesser towers out on the crag's rim and between the spires, no two the same height, every one joined
  // to a neighbour by a bridge high up. [x, z, radius, top over the plain]
  const SAT = [
    [11070, -215, 13, 330], [11190, -246, 12, 372], [11316, -232, 13, 418], [11416, -150, 12, 455], [11440, 5, 14, 500], [11420, 160, 12, 468],
    [11326, 238, 13, 512], [11200, 250, 12, 440], [11075, 215, 13, 362], [11020, -70, 10, 348], [11020, 74, 10, 356], [11090, -14, 9, 330],
    [11330, -8, 11, 560], [11316, -112, 10, 520], [11330, 116, 10, 578], [11140, 82, 9, 420],
  ];
  const sat = SAT.map(([sx, sz, r, top], i) => {
    const fy = Y(sx, sz);
    if (i % 3 === 1) K.box(C, sx, fy - 4, sz, r * 0.95, P(top) - fy + 4, r * 0.95, i, { collide: fy > PLAIN + 100 });
    else K.drum(C, sx, fy - 4, sz, r, P(top) - fy + 4, i % 3 ? 12 : 8, { collide: fy > PLAIN + 100 });
    K.drum(G, sx, P(top) - 5, sz, r, 2, 12, { r2: r + 2, open: true, collide: false }); K.drum(G, sx, P(top) - 3, sz, r + 2, 4, 12, { open: true, collide: false });
    K.cone(R, sx, P(top) + 1, sz, r + 2.6, r * (4 + 2 * hash2(i, 9)), 12);
    return [sx, sz, r, top];
  });
  const link = (a, b, drop = 26) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uz = (b[1] - a[1]) / d, h = Math.min(a[3], b[3]) - drop; bridge(K, G, [a[0] + ux * a[2], P(h), a[1] + uz * a[2]], [b[0] - ux * b[2], P(h), b[1] - uz * b[2]], 4, { arch: 2.5, piers: drop > 20 }); };
  for (let i = 0; i < 9; i++) link(sat[i], sat[(i + 1) % 9]);                // the rim's ring of towers, all the way round
  for (const [i, j] of [[9, 0], [10, 8], [11, 9], [11, 10], [12, 13], [12, 14], [15, 10], [13, 2], [14, 6], [12, 4]]) link(sat[i], sat[j], 34);
  // The lesser towers: turrets out on the curtain and a few on the wards below, some two dozen, each tied by a light bridge to the
  // two towers nearest it, so from the city the whole rock is laced together.
  const small = [];
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU + hash2(i, 31) * 0.14, k = i % 4 === 3 ? 0.56 + 0.1 * hash2(i, 17) : 0.76 + 0.12 * hash2(i, 17), sx = CRAG.x + Math.cos(a) * CRAG.a * k, sz = CRAG.z + Math.sin(a) * CRAG.b * k;
    if (i % 2 || (Math.abs(sz) < 30 && sx < x - 60)) continue;    // (the way up from the gate is kept open)
    if (Math.hypot(sx - x, sz - z) < 70 || SPIRES.some((q) => Math.hypot(sx - q[1], sz - q[2]) < q[3] + 16) || sat.some((q) => Math.hypot(sx - q[0], sz - q[1]) < 26)) continue;
    const fy = Y(sx, sz), r = 5.5 + 3 * hash2(i, 5), top = (fy - PLAIN) + 55 + 95 * hash2(i, 23);
    K.drum(C, sx, fy - 3, sz, r, P(top) - fy + 3, 10, { collide: false });
    K.drum(G, sx, P(top) - 3, sz, r, 3, 10, { r2: r + 1.6, open: true, collide: false });
    K.cone(R, sx, P(top), sz, r + 1.8, r * 5, 10);
    small.push([sx, sz, r, top]);
  }
  const every = [...sat, ...small];
  for (const t of small) {
    const near = every.filter((q) => q !== t).map((q) => [Math.hypot(q[0] - t[0], q[1] - t[1]), q]).sort((p, q) => p[0] - q[0]).slice(0, 2);
    for (const [d, q] of near) if (d < 150) link(t, q, 12);
  }
  // (And the rim towers to the spires they stand under.)
  for (const [i, s] of [[0, 0], [1, 1], [3, 2], [5, 3], [7, 4], [2, 1], [6, 4]]) { const t = tops[s]; link(sat[i], [t[0], t[1], t[2], sat[i][3] + 10], 30); }
}

export function phobos(K) { phobosCity(K); phobosCastle(K); phobosKeep(K); }
