// The Bell Tower of the Four Watches on Bell Knoll, Tessariel's, inside and out (src/core/sites.js builds the yard round
// it): a pale shaft on a battered plinth, hollow, its walls a metre thick with the stair's slits through them; a door that
// opens (src/items/doors.js); inside, a stair of eight flights round the walls of the well, the first in stone and the
// rest in oak on landings in the corners, up to the belfry floor; and over that the four bells in their frame, each on a
// wheel with its rope down to the floor, that you ring yourself (src/items/bells.js). And the Bellwright's house in the
// yard, with a door and his room behind it.
//
// In the tower's own frame: u east and w south of its middle, v up from the land there. The stair goes round the well
// sunwise from the door: up the east wall, along the north, down the west, along the south, twice, sixteen rises a wall.
// What's walked on is one platform of stacked floors (World.platformAt: you stand on the highest within a step of your
// feet); what stops you, boxes with a foot and a top (b, t) so the floors above and below don't get in each other's way.

import { terrainHeight } from './terrain.js';
import { SITES } from './lands.js';

const Q = Math.PI / 4;
const S = 'pale:stone', G = 'pale:rubble', SP = 'frost:roof_2';
const X = SITES.belltower.x, Z = SITES.belltower.z, BY = terrainHeight(X, Z);

/** Where the tower stands and its levels: the land at its middle, the ground floor, the belfry floor, the bells' axles. */
export const TOWER = { x: X, z: Z, y: BY, floor: BY + 0.95, belfry: BY + 27.5, pivot: BY + 33.2, ceiling: BY + 35.9 };

const G0 = 0.95, BF = 27.5, PV = 33.2;           // (over the land at the middle)
const IN = 3.6, OUT = 4.6, E = 2.45, BIN = 3.8;  // the shaft's inner and outer faces; the well's edge; the belfry's inner face
const M = (E + IN) / 2, HB = (IN - E) / 2;       // the middle of a stair's band and half its width
const RISE = (BF - G0) / 128, TREAD = 2 * E / 15;
const DOOR = { hw: 1.1, spring: 2.4, apex: 3.4, pass: 1.25, roof: 3.55, hinge: 5.3, front: 5.52, back: 4.58 };
// (Each painting's metres to a repeat: sites.js TILE.)
const TILE = { ashlar: [8.4, 4.2], course: [8.1, 4.1], wall: [7, 4.2] };

// A face looking out along (nx, nz), as sites.js has them: a point u along it, d out from the middle, v up.
const face = (cx, cz, nx, nz) => (u, d, v) => [cx + nx * d - nz * u, BY + v, cz + nz * d + nx * u];
const FACES = [[0, 1], [1, 0], [0, -1], [-1, 0]];   // south, east, north, west
const T = (u, v, w) => [X + u, BY + v, Z + w];

// ---- the stair

// Each wall's flight: where it starts on its band's middle and which way it climbs.
const BANDS = [
  { s: [M, E], d: [0, -1] },     // up the east wall, going north
  { s: [E, -M], d: [-1, 0] },    // along the north, going west
  { s: [-M, -E], d: [0, 1] },    // down the west, going south
  { s: [-E, M], d: [1, 0] },     // along the south, going east
];
const LANDINGS = [[M, -M], [-M, -M], [-M, M], [M, M]];           // the corner each band's flight comes up to
const EDGE = [[E, E], [E, -E], [-E, -E], [-E, E]];                // the well's corners: band b's edge runs from EDGE[b] to EDGE[b + 1]
const footOf = (f) => G0 + 16 * f * RISE;

/** Flight f's fifteen steps (0: the first, from the ground floor): each one's middle (u, w), its top v and its half sizes. */
export function stepsOf(f) {
  const { s, d } = BANDS[f % 4], across = d[0] !== 0, out = [];
  for (let k = 1; k <= 15; k++) {
    const t = (k - 0.5) * TREAD;
    out.push({ k, u: s[0] + d[0] * t, w: s[1] + d[1] * t, v: footOf(f) + k * RISE, hu: across ? TREAD / 2 : HB, hw: across ? HB : TREAD / 2 });
  }
  return out;
}

// The slits, one to a flight (not the last, which comes up under the belfry), at the step where a window can go between
// the string courses, its sill a little over eye height less a stride: [flight, step].
const SLIT_AT = [[0, 8], [1, 8], [2, 14], [3, 8], [4, 4], [5, 8], [6, 8]];
const SLITS = SLIT_AT.map(([f, k]) => {
  const st = stepsOf(f)[k - 1], fi = [1, 2, 3, 0][f % 4], [nx, nz] = FACES[fi];
  return { fi, u: -nz * st.u + nx * st.w, v0: st.v + 0.8, v1: st.v + 2.8 };
});

// ---- what's indoors

/** The rooms the sky doesn't reach (src/gfx/shaders.js indoorAt: lit as a house is): the tower below the belfry, its
 * passage, and the Bellwright's room. { x, z, hx, hz, y0, y1 }. */
export const INDOORS = [
  { x: X, z: Z, hx: IN + 0.02, hz: IN + 0.02, y0: BY - 1, y1: BY + BF - 0.05 },
  { x: X, z: Z + (IN + DOOR.hinge) / 2 - 0.01, hx: DOOR.pass + 0.02, hz: (DOOR.hinge - IN) / 2 + 0.03, y0: BY - 1, y1: BY + G0 + DOOR.roof },
];

// ---- the bells

/** The four bells, each in its pit on a side of the frame: the way it swings out (n), its mouth's radius D, the note it
 * strikes and how long a swing takes; the axle (at), the turn that lays the model along it (yaw), the wheel's radius and
 * where its rope hangs (rope: x, z). The model's own frame: x along the axle, its wheel at x = -1.25; y up; z out. */
export const BELLS = [
  ['tenor', 'the tenor', [0, 1], 0.8, 293.66, 2.1],
  ['third', 'the third', [1, 0], 0.71, 329.63, 1.95],
  ['second', 'the second', [0, -1], 0.63, 369.99, 1.8],
  ['treble', 'the treble', [-1, 0], 0.56, 392.0, 1.68],
].map(([key, name, n, D, hz, period], i) => {
  const px = X + n[0] * 2.15, pz = Z + n[1] * 2.15, wheel = 1.1 * D, ax = [n[1], -n[0]];
  return { i, key, name, n, D, hz, period, wheel, at: [px, BY + PV, pz], yaw: Math.atan2(n[0], n[1]),
    rope: [px - ax[0] * 1.25 - n[0] * wheel, pz - ax[1] * 1.25 - n[1] * wheel] };
});
/** The ropes at rest: the belfry floor, and over it the rope's tail end and the woollen grip (the sally), from and to. */
export const ROPE = { floor: BY + BF, tail: 1.0, sally: [1.25, 2.05], wheelX: -1.25 };

/** Whether (x, z) at height y is under a roof here: the tower's well below the belfry, or the Bellwright's room. (The third
 * person camera keeps low there: src/sim/sim.worker.js.) */
export function underRoof(x, z, y) {
  if (Math.abs(x - X) < IN && Math.abs(z - Z) < IN && y < BY + BF - 1.6) return true;
  return Math.abs(x - HOUSE.x) < HOUSE.hx - 0.24 && Math.abs(z - HOUSE.z) < HOUSE.hz - 0.24 && y < HOUSE.floor + 2;
}

// ---- pieces

// A rectangle less the holes in it, as the rectangles left: [u0, u1, v0, v1] each.
function cut(u0, u1, v0, v1, holes) {
  const vs = [...new Set([v0, v1, ...holes.flatMap((h) => [h[2], h[3]]).filter((v) => v > v0 && v < v1)])].sort((a, b) => a - b), out = [];
  for (let i = 0; i + 1 < vs.length; i++) {
    const a = vs[i], b = vs[i + 1], mid = (a + b) / 2;
    const gaps = holes.filter((h) => h[2] < mid && h[3] > mid).map((h) => [Math.max(u0, h[0]), Math.min(u1, h[1])]).sort((p, q) => p[0] - q[0]);
    let u = u0;
    for (const [c0, c1] of gaps) { if (c0 > u + 1e-4) out.push([u, c0, a, b]); u = Math.max(u, c1); }
    if (u1 > u + 1e-4) out.push([u, u1, a, b]);
  }
  return out;
}

// One face of a wall at d in frame F, from u0 to u1 and v0 to v1, less its holes, its painting run on across it unbroken.
function wallFace(K, F, d, u0, u1, v0, v1, holes, layer, tile, shift = 0) {
  const [tw, th] = tile, uv = (u, v) => [(u + shift) / tw, -(BY + v) / th];
  for (const [a, b, c, e] of cut(u0, u1, v0, v1, holes)) K.quad(layer, F(a, d, c), F(b, d, c), F(b, d, e), F(a, d, e), null, [uv(a, c), uv(b, c), uv(b, e), uv(a, e)]);
}

// Through a wall's thickness round a hole: o on the face at dO, i on the face at dI (wider, for a splay). No sill if the hole
// comes down to the floor.
function reveal(K, F, dO, dI, o, i, layer, sill = true) {
  K.quad(layer, F(o[0], dO, o[2]), F(i[0], dI, i[2]), F(i[0], dI, i[3]), F(o[0], dO, o[3]));
  K.quad(layer, F(i[1], dI, i[2]), F(o[1], dO, o[2]), F(o[1], dO, o[3]), F(i[1], dI, i[3]));
  if (sill) K.quad(layer, F(i[0], dI, i[2]), F(o[0], dO, o[2]), F(o[1], dO, o[2]), F(i[1], dI, i[2]));
  K.quad(layer, F(o[0], dO, o[3]), F(i[0], dI, i[3]), F(i[1], dI, i[3]), F(o[1], dO, o[3]));
}

// A box with its foot and top at world heights b and t: what stops a body between them and nowhere else.
function solid(K, x, z, hx, hz, b, t) {
  K.colliders.push({ x, z, hx, hz, yaw: 0, h: t - terrainHeight(x, z), b, t });
}
const solidT = (K, u0, u1, w0, w1, b, t) => solid(K, X + (u0 + u1) / 2, Z + (w0 + w1) / 2, (u1 - u0) / 2, (w1 - w0) / 2, BY + b, BY + t);

// A lamp's light, with its flame where wallLamp hangs it.
function lampAt(K, x, y, z, face, r = 8, i = 3.6) {
  K.wallLamp(x, y, z, face);
  (K.lamps ||= []).push({ p: [x + face[0] * 0.4, y - 0.3, z + face[1] * 0.4], c: [1, 0.62, 0.3], r, i, flicker: 0.45 });
}

// The two-centred head of the door (tools/doors/model.py pointed): how high over its spring at x across from its middle.
function pointed(x, hw, h) {
  x = Math.min(Math.abs(x), hw);
  const cx = (hw * hw - h * h) / (2 * hw), r = hw - cx;
  return Math.sqrt(Math.max(r * r - (x - cx) ** 2, 0));
}

// ---- the tower

/** The tower, all of it: plinth, shaft, slits, string courses, buttresses, belfry, spire; the door and its porch; the
 * ground floor, the stair and the belfry floor; the bells' frame (the bells are the render thread's: src/items/bells.js). */
export function buildTower(K) {
  const x = X, z = Z, by = BY;
  // The plinth: four battered faces, six out at the foot and five at the top, and a ledge round the shaft on it. (The
  // south's middle stops at the sill: over it the door's block stands out, and through it the way in.)
  FACES.forEach(([nx, nz], fi) => {
    const F = face(x, z, nx, nz), dv = (v) => 6 - (v + 1) / 4;
    if (fi === 0) {
      for (const sd of [-1, 1]) {
        K.quad(G, F(sd * 6, 6, -1), F(sd * 2.05, 6, -1), F(sd * 2.05, 5, 3), F(sd * 5, 5, 3));
        K.quad(S, F(sd * 5, 5, 3), F(sd * 2.05, 5, 3), F(sd * 2.05, OUT, 3), F(sd * OUT, OUT, 3));
      }
      K.quad(G, F(-2.05, 6, -1), F(2.05, 6, -1), F(2.05, dv(G0), G0), F(-2.05, dv(G0), G0));
    } else {
      K.quad(G, F(-6, 6, -1), F(6, 6, -1), F(5, 5, 3), F(-5, 5, 3));
      K.quad(S, F(-5, 5, 3), F(5, 5, 3), F(OUT, OUT, 3), F(-OUT, OUT, 3));
    }
  });
  // The shaft: a metre of wall, ashlar outside and coursed stone in, its slits splayed wide on the inside; the way in
  // through the south wall.
  FACES.forEach(([nx, nz], fi) => {
    const F = face(x, z, nx, nz), mine = SLITS.filter((s) => s.fi === fi);
    const outer = mine.map((s) => [s.u - 0.2, s.u + 0.2, s.v0, s.v1]), inner = mine.map((s) => [s.u - 0.5, s.u + 0.5, s.v0 - 0.25, s.v1 + 0.25]);
    if (fi === 0) { outer.push([-DOOR.pass, DOOR.pass, 2.9, G0 + DOOR.roof]); inner.push([-DOOR.pass, DOOR.pass, G0 - 0.1, G0 + DOOR.roof]); }
    wallFace(K, F, OUT, -OUT, OUT, 3, BF, outer, 'pale:ashlar', TILE.ashlar, fi * 9.2);
    wallFace(K, F, IN, -IN, IN, G0, BF, inner, 'pale:course', TILE.course, fi * 7.2);
    mine.forEach((s, k) => {
      reveal(K, F, OUT, IN, outer[k], inner[k], 'pale:course');
      // (Outside, a hood over each and a sill under it.)
      const hd = F(s.u, 4.72, s.v1 + 0.45), sl = F(s.u, 4.72, s.v0 - 0.2);
      K.box(S, hd[0], hd[1], hd[2], nz ? 0.5 : 0.14, 0.18, nz ? 0.14 : 0.5, 0, { collide: false });
      K.box(S, sl[0], sl[1], sl[2], nz ? 0.4 : 0.12, 0.16, nz ? 0.12 : 0.4, 0, { collide: false });
    });
  });
  // The string courses, their tops a ledge round the outside (the last one's the belfry's sill, in to its inner face).
  for (const [yy, hw, hh, inner] of [[10.6, 4.9, 0.4, OUT], [18.6, 4.9, 0.4, OUT], [26.9, 4.85, 0.3, OUT], [27.2, 5.1, 0.5, BIN]]) {
    K.box(S, x, by + yy, z, hw, hh, hw, 0, { collide: false, top: false });
    for (const [nx, nz] of FACES) { const F = face(x, z, nx, nz), v = yy + hh; K.quad(S, F(-hw, hw, v), F(hw, hw, v), F(inner, inner, v), F(-inner, inner, v)); }
  }
  FACES.forEach(([nx, nz]) => {
    const F = face(x, z, nx, nz);
    // The buttresses, a pair to a corner, stepping in at each string course under a sloped head.
    for (const u of [-3.95, 3.95]) for (const [y0, y1, pr] of [[-1, 10.6, 1.5], [10.6, 18.6, 1.0], [18.6, 26.2, 0.55]]) {
      const c = F(u, OUT + pr / 2, 0);
      K.box(S, c[0], by + y0, c[2], nz ? 0.55 : pr / 2, y1 - y0, nz ? pr / 2 : 0.55, 0, { collide: false });
      K.quad(S, F(u - 0.6, OUT + pr + 0.05, y1), F(u + 0.6, OUT + pr + 0.05, y1), F(u + 0.6, OUT, y1 + 1.0), F(u - 0.6, OUT, y1 + 1.0));
      for (const sd of [-1, 1]) K.tri(S, F(u + sd * 0.56, OUT + pr, y1), F(u + sd * 0.56, OUT, y1), F(u + sd * 0.56, OUT, y1 + 1.0));
    }
    // The belfry's face: two arches side by side, louvres across their lower half, a sill under them inside.
    const yaw = Math.atan2(nx, nz);
    for (const u of [-1.6, 1.6]) {
      const c = F(u, 4.2, 0);
      K.arch(S, c[0], c[2], yaw, { a: 1.25, pw: 0.35, hs: 4.4, top: 8.2, t: 0.8, y: by + 27.7, collide: false });
      for (const v of [0.5, 1.3, 2.1, 2.9]) K.quad('wood', F(u - 1.25, 4.5, 27.7 + v), F(u + 1.25, 4.5, 27.7 + v), F(u + 1.25, 3.95, 28.25 + v), F(u - 1.25, 3.95, 28.25 + v));
      K.box(S, c[0], by + 27.2, c[2], nz ? 1.25 : 0.4, 0.75, nz ? 0.4 : 1.25, 0, { collide: false });
    }
    // The parapet over it, a pinnacle at the corner.
    const p = F(0, 4.8, 0);
    K.box(S, p[0], by + 36.35, p[2], nz ? 4.6 : 0.2, 1.15, nz ? 0.2 : 4.6, 0, { collide: false });
    for (let k = -3; k <= 3; k++) { const q = F(k * 1.25, 4.8, 0); K.box(S, q[0], by + 37.5, q[2], nz ? 0.32 : 0.2, 0.5, nz ? 0.2 : 0.32, 0, { collide: false }); }
    const cn = F(4.8, 4.8, 0);
    K.box(S, cn[0], by + 35.9, cn[2], 0.5, 2.9, 0.5, 0, { collide: false }); K.cone(S, cn[0], by + 38.8, cn[2], 0.75, 2.4, 4, Q);
    K.drum('fruit2', cn[0], by + 41.15, cn[2], 0.14, 0.28, 5, { collide: false });
  });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(S, x + sx * 3.9, by + 27.7, z + sz * 3.9, 0.7, 8.2, 0.7, 0, { collide: false });
  K.box(S, x, by + 35.9, z, 5.1, 0.45, 5.1, 0, { collide: false });
  // The spire: copper on an eight-sided drum, a ball and a rod, his sunburst in gilt at the very top, looking four ways.
  K.drum(SP, x, by + 36.35, z, 4.35, 1.3, 8, { turn: Q / 2, collide: false, open: true });
  K.cone(SP, x, by + 37.6, z, 4.6, 5.2, 8, Q / 2); K.drum(SP, x, by + 37.6, z, 3.35, 3.6, 8, { r2: 2.35, turn: Q / 2, collide: false, open: true });
  K.cone(SP, x, by + 41.2, z, 2.35, 11.2, 8, Q / 2);
  // (The spire broached in two pitches, a gilt band where they meet, a lucarne on each face.)
  K.drum('fruit2', x, by + 41.0, z, 2.5, 0.3, 8, { r2: 2.45, turn: Q / 2, collide: false, open: true });
  for (const [nx, nz] of FACES) {
    const F = face(x, z, nx, nz);
    K.quad('water', F(-0.45, 3.42, 38.0), F(0.45, 3.42, 38.0), F(0.45, 3.42, 39.3), F(-0.45, 3.42, 39.3), [nx, 0, nz]);
    K.quad(SP, F(-0.8, 3.5, 39.3), F(0, 3.5, 40.2), F(0, 2.4, 40.2), F(-0.8, 2.6, 39.3)); K.quad(SP, F(0.8, 3.5, 39.3), F(0, 3.5, 40.2), F(0, 2.4, 40.2), F(0.8, 2.6, 39.3));
    for (const sd of [-1, 1]) K.quad(S, F(sd * 0.45, 3.45, 37.9), F(sd * 0.62, 3.45, 37.9), F(sd * 0.62, 3.45, 39.3), F(sd * 0.45, 3.45, 39.3), [nx, 0, nz]);
  }
  K.drum('fruit2', x, by + 52.2, z, 0.34, 0.6, 6, { r2: 0.2, collide: false }); K.box('fruit2', x, by + 52.7, z, 0.05, 1.9, 0.05, 0, { collide: false });
  K.sunburst('fruit2', x, by + 54.8, z, [0, 1], 1.05); K.sunburst('fruit2', x, by + 54.8, z, [1, 0], 1.05);

  doorway(K);
  belfry(K, inside(K));
  walls(K);
}

// The door, in a block that stands out of the plinth's batter, the passage behind it through the wall; the porch before it
// under its own little roof, five steps up to it, his sunburst over it.
function doorway(K) {
  const x = X, z = Z, by = BY, dy = by + G0, { hw, spring, apex, pass, roof, hinge, front, back } = DOOR;
  const mid = (back + hinge) / 2, hd = (hinge - back) / 2, fm = (hinge + front) / 2, fd = (front - hinge) / 2;
  for (const sd of [-1, 1]) {
    // (Its jambs: the rebate at the front the leaf shuts against, the passage wider behind it.)
    K.box(S, x + sd * (2.05 + pass) / 2, by - 1, z + mid, (2.05 - pass) / 2, 5.9, hd, 0, { collide: false });
    K.box(S, x + sd * (2.05 + hw) / 2, by - 1, z + fm, (2.05 - hw) / 2, 5.9, fd, 0, { collide: false });
  }
  K.box(S, x, by - 1, z + (back + front) / 2, pass, G0 + 1, (front - back) / 2, 0, { collide: false });
  K.box(S, x, dy + roof, z + mid, pass, by + 4.9 - dy - roof, hd, 0, { collide: false });
  // The head over the leaf: its two-centred arch, the face round it at the front and the back, and its soffit.
  const N = 12, top = 4.9 - G0;
  for (let i = 0; i < N; i++) {
    const a = -hw + 2 * hw * i / N, b = -hw + 2 * hw * (i + 1) / N, ya = G0 + spring + pointed(a, hw, apex - spring), yb = G0 + spring + pointed(b, hw, apex - spring);
    for (const w of [front, hinge]) K.quad(S, T(a, ya, w), T(b, yb, w), T(b, G0 + top, w), T(a, G0 + top, w));
    K.quad(S, T(a, ya, hinge), T(b, yb, hinge), T(b, yb, front), T(a, ya, front));
  }
  K.quad(S, T(-hw, G0 + top, hinge), T(-hw, G0 + top, front), T(hw, G0 + top, front), T(hw, G0 + top, hinge));
  // The passage: its walls, its flat stone roof, its floor.
  for (const sd of [-1, 1]) K.quad('pale:course', T(sd * pass, G0 - 0.05, IN), T(sd * pass, G0 - 0.05, hinge), T(sd * pass, G0 + roof, hinge), T(sd * pass, G0 + roof, IN));
  K.quad(S, T(-pass, G0 + roof, IN), T(pass, G0 + roof, IN), T(pass, G0 + roof, hinge), T(-pass, G0 + roof, hinge));
  K.quad('pale:flags', T(-pass, G0, IN), T(-pass, G0, back), T(pass, G0, back), T(pass, G0, IN));
  // The leaf: oak and iron, swung in against the passage's wall when it's open (src/items/doors.js). Id 19.
  const shut = { x, z: z + hinge - 0.04, hx: hw, hz: 0.12, yaw: 0 }, ajar = { x: x - hw + 0.05, z: z + hinge - hw, hx: 0.1, hz: hw, yaw: 0 };
  for (const c of [shut, ajar]) { c.t = dy + apex; c.h = c.t - terrainHeight(c.x, c.z); }
  (K.doors ||= []).push({ type: 'door', id: 19, piece: 'door_pointed', x: x - hw, y: dy, z: z + hinge, yaw: 0, open: Math.PI / 2, shut, ajar, cx: x, cz: z + hinge + 0.1, reach: 2.8, far: 320, tall: 30 });
  // The porch.
  K.box(G, x, by - 0.5, z + 6.2, 2.05, 1.45, 0.7, 0, { collide: false });
  K.deck([[x, z + 6.2, 1.2, 0.7, 0, dy]]);
  for (const s of [-1, 1]) K.box(S, x + s * 1.75, by - 0.5, z + 5.95, 0.3, 4.95, 0.45, 0);
  K.arch(S, x, z + 6.65, 0, { a: 1.2, pw: 0.55, hs: 2.3, top: 3.5, t: 0.5, y: dy });
  K.gable('roof_2', S, x, dy + 3.5, z + 6.0, 0.95, 2.05, 1.5, Math.PI / 2, 0.25);
  K.steps(G, x, z + 6.9, 0, 1.2, 5, { rise: 0.19, tread: 0.36, y: by });
  for (const s of [-1, 1]) { K.box(S, x + s * 1.47, by - 0.4, z + 7.8, 0.25, 1.0, 0.92, 0); K.wallLamp(x + s * 1.48, dy + 2.5, z + 6.92, [0, 1]); }
  K.sunburst('fruit2', x, by + 8.5, z + 4.64, [0, 1], 1.6);
  // (Pale cloth with his sunburst down the two buttresses by the door; a rail down the steps, a flame in each lamp.)
  for (const s of [-1, 1]) { K.hanging('white', x + s * 3.95, by + 9.6, z + 6.1, [0, 1], 0.9, 3.6, 2); K.sunburst('fruit2', x + s * 3.95, by + 8.3, z + 6.2, [0, 1], 0.36); }
  for (const s of [-1, 1]) { K.beam('iron', [x + s * 1.47, by + 1.5, z + 6.95], [x + s * 1.47, by + 1.05, z + 8.7], 0.05); K.cone('flame', x + s * 1.88, dy + 2.05, z + 6.92, 0.1, 0.34, 4); }
}

// The ground floor, the stair round the well and its landings, the rails; the floors to walk on.
function inside(K) {
  const plat = { x: X, z: Z, r: 7.5, rects: [], stack: true };
  K.floors.push(plat);
  const floor = (u, w, hu, hw, v) => plat.rects.push({ x: X + u, z: Z + w, c: 1, s: 0, hu, hw, y: BY + v });
  floor(0, 0, IN, IN, G0);
  floor(0, (IN + DOOR.front) / 2, DOOR.pass, (DOOR.front - IN) / 2 + 0.05, G0);
  K.quad('pale:flags', T(-IN, G0, -IN), T(-IN, G0, IN), T(IN, G0, IN), T(IN, G0, -IN));
  for (let f = 0; f < 8; f++) {
    const b = f % 4, steps = stepsOf(f);
    for (const s of steps) {
      floor(s.u, s.w, s.hu + 0.004, s.hw + 0.004, s.v);
      // (The first flight's stone, solid to the floor; the rest are oak blocks on a string.)
      if (f === 0) K.box(S, X + s.u, BY + G0 - 0.02, Z + s.w, s.hu, s.v - G0 + 0.02, s.hw, 0, { collide: false });
      else K.box('wood', X + s.u, BY + s.v - 0.2, Z + s.w, s.hu, 0.2, s.hw, 0, { collide: false });
    }
    const [a, c] = [EDGE[b], EDGE[(b + 1) % 4]], v0 = footOf(f), v1 = footOf(f) + 15 * RISE;
    if (f) K.beam('wood', T(a[0], v0 + 0.05, a[1]), T(c[0], v1 + 0.05, c[1]), 0.07, 0.42);
    // The landing it comes up to, on two stone corbels in the corner. (The last comes up to the belfry floor.)
    if (f < 7) {
      const [lu, lw] = LANDINGS[b], v = footOf(f + 1);
      floor(lu, lw, HB + 0.01, HB + 0.01, v);
      K.box('wood', X + lu, BY + v - 0.2, Z + lw, HB, 0.2, HB, 0, { collide: false });
      for (const [cu, cw] of [[Math.sign(lu) * (IN - 0.2), lw], [lu, Math.sign(lw) * (IN - 0.2)]]) K.box(S, X + cu, BY + v - 0.65, Z + cw, 0.22, 0.45, 0.22, 0, { collide: false });
    }
    // Its rail on the well side: posts at the ends and the middle, a handrail along them. And what stops you going over it:
    // from under its first step to a metre over its landing. (The last flight's, over the belfry floor, only where the
    // stair comes up through it; where the floor's over it, under the floor.)
    const n = [-Math.sign(a[0] + c[0]) * 0.06, -Math.sign(a[1] + c[1]) * 0.06];   // (a little out into the well)
    for (const t of [0, 0.5, 1]) {
      const pu = a[0] + (c[0] - a[0]) * t + n[0], pw = a[1] + (c[1] - a[1]) * t + n[1], pv = v0 + (v1 - v0 + RISE) * t;
      K.box('wood', X + pu, BY + pv - 0.25, Z + pw, 0.05, 1.25, 0.05, 0, { collide: false });
    }
    K.beam('wood', T(a[0] + n[0], v0 + 0.97, a[1] + n[1]), T(c[0] + n[0], v1 + RISE + 0.97, c[1] + n[1]), 0.07, 0.06);
    const lo = f === 0 ? -2 : v0 - 0.3;
    const rail = (u0, u1, w0, w1, top) => solidT(K, Math.min(u0, u1) - 0.06 + n[0], Math.max(u0, u1) + 0.06 + n[0], Math.min(w0, w1) - 0.06 + n[1], Math.max(w0, w1) + 0.06 + n[1], lo, top);
    if (f < 7) rail(a[0], c[0], a[1], c[1], footOf(f + 1) + 1.1);
    else { rail(a[0], -1.2, a[1], c[1], BF - 0.35); rail(-1.2, c[0], a[1], c[1], BF + 1.1); }
  }
  // The ground floor's things: the Bellwright's table by the west wall with his book of the watches and a candle, a bench;
  // rope in coils, oil for the bells, a spare clapper, a chest; Tessariel's cloth on the north wall. Two lamps.
  const y = BY + G0;
  K.box('wood', X - 2.9, y + 0.72, Z + 0.6, 0.45, 0.07, 1.0, 0, { collide: false });
  for (const [du, dw] of [[-0.35, -0.85], [0.35, -0.85], [-0.35, 0.85], [0.35, 0.85]]) K.box('wood', X - 2.9 + du, y, Z + 0.6 + dw, 0.05, 0.72, 0.05, 0, { collide: false });
  K.box('wood', X - 2.85, y + 0.79, Z + 0.4, 0.22, 0.04, 0.3, 0.2, { collide: false });
  K.box('white', X - 2.85, y + 0.79, Z + 0.4, 0.2, 0.06, 0.28, 0.2, { collide: false });
  K.drum('white', X - 2.75, y + 0.79, Z + 1.1, 0.04, 0.2, 6, { collide: false }); K.cone('flame', X - 2.75, y + 0.99, Z + 1.1, 0.025, 0.08, 4);
  K.box('wood', X - 1.95, y, Z + 0.6, 0.18, 0.45, 0.8, 0, { collide: false });
  solidT(K, -3.6, -1.75, -0.45, 1.65, G0 - 0.5, G0 + 0.85);
  for (const [cu, cw, r] of [[-2.95, 2.95, 0.42], [-2.95, 2.1, 0.3], [-3.05, -3.0, 0.36]]) { K.drum('cloth_oat', X + cu, y, Z + cw, r, 0.16, 10, { r2: r * 0.95, collide: false }); K.drum('cloth_oat', X + cu, y + 0.16, Z + cw, r * 0.95, 0.14, 10, { r2: r * 0.7, collide: false }); }
  for (const [cu, cw] of [[3.0, -3.0], [2.2, -3.1], [1.45, -3.15]]) K.barrel(X + cu, Z + cw, 0.3, 0.8, y);
  solidT(K, 1.1, 3.6, -3.6, -2.6, G0 - 0.5, G0 + 0.9);
  K.beam('iron', T(-1.2, G0 + 0.12, -3.4), T(-0.4, G0 + 0.85, -3.55), 0.07); K.drum('iron', X - 1.25, y, Z - 3.35, 0.16, 0.22, 8, { r2: 0.12, collide: false });
  K.box('wood', X - 1.9, y, Z + 3.2, 0.45, 0.5, 0.3, 0, { collide: false }); K.box('iron', X - 1.9, y + 0.5, Z + 3.2, 0.46, 0.04, 0.31, 0, { collide: false });
  solidT(K, -2.4, -1.4, 2.85, 3.6, G0 - 0.5, G0 + 0.55);
  K.hanging('white', X, y + 3.0, Z - IN, [0, 1], 1.1, 2.2, 2); K.sunburst('fruit2', X, y + 2.2, Z - IN + 0.09, [0, 1], 0.42);
  lampAt(K, X - IN, y + 2.4, Z - 1.4, [1, 0], 9, 4.2);
  lampAt(K, X + 1.4, y + 2.4, Z - IN, [0, 1], 9, 4.2);
  // And one over every other landing going up, on the wall the flight came up along, so the stair's never dark.
  for (const f of [1, 3, 4, 6]) {
    const [lu, lw] = LANDINGS[f % 4], v = BY + footOf(f + 1) + 2.5, b = f % 4;
    if (b % 2 === 0) lampAt(K, X + Math.sign(lu) * IN, v, Z + lw, [-Math.sign(lu), 0], 8, 3.4);
    else lampAt(K, X + lu, v, Z + Math.sign(lw) * IN, [0, -Math.sign(lw)], 8, 3.4);
  }
  return plat;
}

// The belfry floor over the well, open where the stair comes up through it, a rail round the opening; its ceiling; the
// bells' frame; the watch lamp in the middle.
function belfry(K, plat) {
  const y = BY + BF;
  const floor = (u0, u1, w0, w1) => {
    plat.rects.push({ x: X + (u0 + u1) / 2, z: Z + (w0 + w1) / 2, c: 1, s: 0, hu: (u1 - u0) / 2, hw: (w1 - w0) / 2, y });
    K.box('wood', X + (u0 + u1) / 2, y - 0.12, Z + (w0 + w1) / 2, (u1 - u0) / 2, 0.12, (w1 - w0) / 2, 0, { collide: false });
  };
  floor(-BIN, BIN, -BIN, E); floor(-BIN, -1.2, E, BIN); floor(E, BIN, E, BIN);
  for (const w of [-2.6, -0.9, 0.8]) K.box('wood', X, y - 0.42, Z + w, IN, 0.3, 0.1, 0, { collide: false });
  K.box('wood', X, y - 0.42, Z + E - 0.1, IN, 0.3, 0.1, 0, { collide: false }); K.box('wood', X - 1.3, y - 0.42, Z + (E + IN) / 2, 0.1, 0.3, (IN - E) / 2, 0, { collide: false });
  // (The rail round the opening.)
  for (const [u, w] of [[-1.26, E - 0.06], [0.6, E - 0.06], [E, E - 0.06], [-1.26, IN - 0.1]]) K.box('wood', X + u, y, Z + w, 0.05, 1.0, 0.05, 0, { collide: false });
  K.beam('wood', T(-1.26, BF + 0.97, E - 0.06), T(E, BF + 0.97, E - 0.06), 0.07, 0.06); K.beam('wood', T(-1.26, BF + 0.97, E - 0.06), T(-1.26, BF + 0.97, IN - 0.1), 0.07, 0.06);
  solidT(K, -1.32, -1.2, E, IN, BF - 0.4, BF + 1.1);
  // The corner piers, and the ceiling under the slab: boards on three beams.
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) solid(K, X + sx * 3.9, Z + sz * 3.9, 0.7, 0.7, y - 0.3, y + 8.5);
  K.quad('wood', T(-BIN, 35.9, -BIN), T(BIN, 35.9, -BIN), T(BIN, 35.9, BIN), T(-BIN, 35.9, BIN));
  for (const u of [-2.2, 0, 2.2]) K.box('wood', X + u, BY + 35.6, Z, 0.12, 0.3, BIN, 0, { collide: false });
  // The frame: four oak posts round the middle, and from each a beam to the wall either way, two to a bell, on which its
  // headstock's gudgeons turn; a brace from each post to each beam.
  const top = PV - 0.1;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    K.box('wood', X + sx, y, Z + sz, 0.13, top - BF, 0.13, 0, { collide: false });
    solid(K, X + sx, Z + sz, 0.14, 0.14, y - 0.3, y + 6);
    K.beam('wood', T(sx * 1.0, top - 0.15, sz * 1.0), T(sx * BIN, top - 0.15, sz * 1.0), 0.26, 0.3);
    K.beam('wood', T(sx * 1.0, top - 0.15, sz * 1.0), T(sx * 1.0, top - 0.15, sz * BIN), 0.26, 0.3);
    K.beam('wood', T(sx * 1.0, top - 1.4, sz * 1.0), T(sx * 2.2, top - 0.3, sz * 1.0), 0.14, 0.14);
    K.beam('wood', T(sx * 1.0, top - 1.4, sz * 1.0), T(sx * 1.0, top - 0.3, sz * 2.2), 0.14, 0.14);
    // (A sill along the floor from post to wall under each beam, the frame's foot.)
    K.box('wood', X + sx * (1 + BIN) / 2, y, Z + sz, (BIN - 1) / 2, 0.16, 0.12, 0, { collide: false });
  }
  // The bearings each gudgeon turns in, iron on the beams; and where each rope comes down, a guide on a bar.
  for (const B of BELLS) {
    const ax = [B.n[1], -B.n[0]];
    for (const sd of [-1, 1]) K.box('iron', B.at[0] + ax[0] * sd * 1.0, PV + BY - 0.12, B.at[2] + ax[1] * sd * 1.0, 0.09, 0.1, 0.09, 0, { collide: false });
    // (The guide: an iron arm out from the nearest post, a ring at its end the rope runs through.)
    const [rx, rz] = B.rope, sx = Math.sign(rx - X), sz = Math.sign(rz - Z), gy = BY + BF + 3.3;
    K.beam('iron', [X + sx, gy, Z + sz], [rx, gy, rz], 0.03);
    K.drum('iron', rx, gy - 0.04, rz, 0.05, 0.08, 6, { open: true, collide: false });
  }
  // The watch lamp hung in the middle, that's seen from the road by night: a cage like the road's lanterns, a size up,
  // its light just under it (in it, the iron's lit white from inside).
  K.drum('iron', X, BY + 30.3, Z, 0.16, 0.5, 4, { r2: 0.2, open: true, collide: false }); K.cone('iron', X, BY + 30.8, Z, 0.25, 0.2, 4);
  K.cone('flame', X, BY + 30.33, Z, 0.09, 0.3, 4); K.beam('iron', T(0, 30.98, 0), T(0, 35.9, 0), 0.04);
  (K.lamps ||= []).push({ p: [X, BY + 30.05, Z], c: [1, 0.66, 0.34], r: 13, i: 6, flicker: 0.35 });
}

// What stops you in the tower: its walls (the south one open for the way in), from under the land to the parapet.
function walls(K) {
  const lo = -2, hi = 36.4, R = 5.6;
  solidT(K, -R, R, -R, -IN, lo, hi); solidT(K, IN, R, -IN, IN, lo, hi); solidT(K, -R, -IN, -IN, IN, lo, hi);
  solidT(K, -R, -DOOR.pass, IN, R, lo, hi); solidT(K, DOOR.pass, R, IN, R, lo, hi); solidT(K, -DOOR.pass, DOOR.pass, IN, R, G0 + DOOR.roof, hi);
}

// ---- the Bellwright's house

const HOUSE = { x: X + 12.6, z: Z + 4, hx: 2.6, hz: 3.4, floor: BY + 0.12, eave: BY + 2.88, rise: 2.21, t: 0.24 };
INDOORS.push({ x: HOUSE.x, z: HOUSE.z, hx: HOUSE.hx - HOUSE.t + 0.02, hz: HOUSE.hz - HOUSE.t + 0.02, y0: BY - 0.5, y1: HOUSE.eave + HOUSE.rise });

/** His house against the yard's east wall: plastered timber, its door to the yard on the west, three windows with their
 * shutters open, a hearth at the north end under the chimney; inside, his bed, his table and his chest. Door 20. */
export function buildHouse(K) {
  const { x, z, hx, hz, floor: fy, eave, rise, t } = HOUSE, W = 'wall_12', fv = fy - BY, ev = eave - BY;
  const dw = 0.77, dh = 2.18;
  // Each wall: [face, half its length, its holes as [u0, u1, v0, v1]].
  const walls = [
    [[-1, 0], hz, [[-dw, dw, fv, fv + dh], [-2.35, -1.65, fv + 1.0, fv + 1.8]]],
    [[1, 0], hz, [[-1.4, -0.6, fv + 1.0, fv + 1.8]]],
    [[0, 1], hx, [[-0.4, 0.4, fv + 1.0, fv + 1.8]]],
    [[0, -1], hx, []],
  ];
  walls.forEach(([[nx, nz], L, holes], i) => {
    const F = face(x, z, nx, nz), d = nx ? hx : hz;
    wallFace(K, F, d, -L, L, -0.6, ev, holes, W, TILE.wall, i * 5.1);
    wallFace(K, F, d - t, -(L - t), L - t, fv, ev, holes, W, TILE.wall, i * 5.1 + 0.3);
    K.quad(W, F(-L, d, ev), F(L, d, ev), F(L - t, d - t, ev), F(-(L - t), d - t, ev));
    holes.forEach((h) => {
      const door = h[2] <= fv + 0.01;
      reveal(K, F, d, d - t, h, h, 'wood', !door);
      if (door) return;
      // (A sill outside, and the shutters folded back to the wall either side.)
      const sl = F((h[0] + h[1]) / 2, d + 0.08, h[2] - 0.08), wd = (h[1] - h[0]) / 2;
      K.box('wood', sl[0], sl[1], sl[2], nz ? wd + 0.1 : 0.1, 0.08, nz ? 0.1 : wd + 0.1, 0, { collide: false });
      for (const [a, b] of [[h[0] - wd - 0.05, h[0] - 0.05], [h[1] + 0.05, h[1] + wd + 0.05]]) K.quad('wood', F(a, d + 0.04, h[2]), F(b, d + 0.04, h[2]), F(b, d + 0.04, h[3]), F(a, d + 0.04, h[3]));
    });
  });
  K.gable('roof_2', W, x, eave, z, hz, hx, rise, -Math.PI / 2);
  for (const dz of [-1.7, 0, 1.7]) K.box('wood', x, eave - 0.18, z + dz, hx - t, 0.18, 0.08, 0, { collide: false });
  // What stops you: the walls, the front one open at the door.
  const lo = BY - 1, hi = eave + 0.3;
  solid(K, x - hx + t / 2, z - (hz + dw) / 2, t / 2, (hz - dw) / 2, lo, hi); solid(K, x - hx + t / 2, z + (hz + dw) / 2, t / 2, (hz - dw) / 2, lo, hi);
  solid(K, x + hx - t / 2, z, t / 2, hz, lo, hi); solid(K, x, z - hz + t / 2, hx, t / 2, lo, hi); solid(K, x, z + hz - t / 2, hx, t / 2, lo, hi);
  // His floor of boards, the threshold in the doorway with it.
  K.deck([[x, z, hx - t, hz - t, 0, fy], [x - hx + t / 2, z, t / 2 + 0.02, dw, 0, fy]]);
  K.quad('wood', [x - hx + t, fy, z - hz + t], [x - hx + t, fy, z + hz - t], [x + hx - t, fy, z + hz - t], [x + hx - t, fy, z - hz + t]);
  K.quad('wood', [x - hx, fy, z - dw], [x - hx, fy, z + dw], [x - hx + t, fy, z + dw], [x - hx + t, fy, z - dw]);
  // The door: oak and iron, as the town's are, swinging in (src/items/doors.js).
  const hz0 = z - dw, dx = x - hx + t / 2;
  const shut = { x: dx, z, hx: 0.125, hz: dw + 0.03, yaw: 0 }, ajar = { x: dx + dw, z: hz0 + 0.06, hx: dw, hz: 0.062, yaw: 0 };
  for (const c of [shut, ajar]) { c.t = fy + dh; c.h = c.t - terrainHeight(c.x, c.z); }
  (K.doors ||= []).push({ type: 'door', id: 20, piece: 'door_iron2', x: dx, y: fy, z: hz0, yaw: -Math.PI / 2, open: Math.PI / 2, shut, ajar, cx: dx, cz: z, reach: 2.4, far: 200, head: [dx, hz0] });
  K.wallLamp(x - hx, BY + 2.28, z + 1.25, [-1, 0]);
  // The hearth at the north end, the chimney over it through the roof.
  const hzN = z - hz + t, hy = fy;
  for (const sd of [-1, 1]) K.box(S, x + sd * 0.62, hy, hzN + 0.35, 0.2, 1.05, 0.35, 0, { collide: false });
  K.box('wood', x, hy + 1.05, hzN + 0.36, 0.85, 0.2, 0.37, 0, { collide: false });
  K.box(S, x, hy + 1.25, hzN + 0.3, 0.8, eave + rise - hy - 0.6, 0.3, 0, { collide: false });
  K.box(S, x, hy - 0.05, hzN + 0.62, 0.95, 0.07, 0.3, 0, { collide: false });
  K.quad('dark:stone', [x - 0.42, hy, hzN + 0.02], [x + 0.42, hy, hzN + 0.02], [x + 0.42, hy + 1.05, hzN + 0.02], [x - 0.42, hy + 1.05, hzN + 0.02]);
  K.box(S, x, eave + rise - 0.9, z - hz + 0.4, 0.45, 2.4, 0.4, 0, { collide: false });
  for (const a of [-0.3, 0.35]) K.beam('bark', [x - 0.3, hy + 0.08, hzN + 0.3 + a * 0.2], [x + 0.3, hy + 0.12, hzN + 0.35 - a * 0.2], 0.09);
  K.cone('flame', x, hy + 0.1, hzN + 0.32, 0.22, 0.55, 5);
  solid(K, x, hzN + 0.35, 0.95, 0.5, lo, hi);
  (K.lamps ||= []).push({ p: [x, hy + 0.6, hzN + 0.9], c: [1, 0.5, 0.2], r: 7, i: 3.6, flicker: 0.8 });
  // His bed along the back wall, his chest at its foot; the table in the middle with a stool either side, a candle on it.
  const bx = x + hx - t - 0.55;
  K.box('wood', bx, hy, z + 2.0, 0.5, 0.42, 1.0, 0, { collide: false }); K.box('cloth_oat', bx, hy + 0.42, z + 2.0, 0.46, 0.14, 0.95, 0, { collide: false });
  K.box('white', bx, hy + 0.56, z + 2.65, 0.32, 0.1, 0.2, 0, { collide: false }); K.box('wood', bx, hy, z + 3.0 - t / 2, 0.52, 0.95, 0.05, 0, { collide: false });
  solid(K, bx, z + 2.0, 0.52, 1.02, lo, hy + 0.6);
  K.box('wood', bx, hy, z + 0.72, 0.42, 0.48, 0.26, 0, { collide: false }); K.box('iron', bx, hy + 0.48, z + 0.72, 0.43, 0.03, 0.27, 0, { collide: false });
  solid(K, bx, z + 0.72, 0.44, 0.28, lo, hy + 0.55);
  const tx = x + 0.1, tz = z;
  K.box('wood', tx, hy + 0.72, tz, 0.5, 0.06, 0.75, 0, { collide: false });
  for (const [a, b] of [[-0.4, -0.65], [0.4, -0.65], [-0.4, 0.65], [0.4, 0.65]]) K.box('wood', tx + a, hy, tz + b, 0.05, 0.72, 0.05, 0, { collide: false });
  for (const sd of [-1, 1]) K.drum('wood', tx + sd * 0.85, hy, tz, 0.2, 0.45, 8, { collide: false });
  K.drum('white', tx + 0.15, hy + 0.78, tz - 0.3, 0.035, 0.18, 6, { collide: false }); K.cone('flame', tx + 0.15, hy + 0.96, tz - 0.3, 0.022, 0.07, 4);
  K.drum('wood', tx - 0.1, hy + 0.78, tz + 0.25, 0.14, 0.06, 8, { r2: 0.17, collide: false });
  solid(K, tx, tz, 0.55, 0.8, lo, hy + 0.8);
  // A shelf on the south wall with his jars and a hand bell; Tessariel's sunburst over it.
  const sz = z + hz - t - 0.15;
  K.box('wood', x - 1.2, hy + 1.35, sz, 0.7, 0.04, 0.15, 0, { collide: false });
  for (const [a, r] of [[-0.6, 0.08], [-0.35, 0.1], [-0.05, 0.07]]) K.drum('pale:stone', x - 1.2 + a, hy + 1.39, sz, r, r * 2.4, 7, { r2: r * 0.7, collide: false });
  K.drum('fruit2', x - 0.75, hy + 1.39, sz, 0.09, 0.14, 8, { r2: 0.05, collide: false });
  K.sunburst('fruit2', x - 1.2, hy + 2.05, z + hz - t - 0.01, [0, -1], 0.3);
}
