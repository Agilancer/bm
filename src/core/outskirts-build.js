// What's built on the Outwall, City State Phobos's land outside its wall (src/core/outskirts.js, docs/PHOBOS-OUTSKIRTS.md).
//
// Built twice, as the city's houses are (src/gfx/phobos-near.js): from far, in the land's build (outskirtsFar, called by
// src/core/phobos-build.js phobos), each thing's plain shape and what stops a body, a group to each 100 m cell ('ph:<cell>')
// so it's folded away while that cell's built from near; and from near (outskirtsNear, called by phobosCell), the same things
// with all their pieces, and the small things round them. A phone's land has none of the far shapes (it holds no more
// corners than it did: tests/sites-lean.test.mjs) and is stopped by what a PC is; it sees each place from near, as a PC does.
//
// The V and T rule holds out here as in the city (docs/PHOBOS-HANDOFF.md): no crosses or cross shapes, no crossbars, no T, no
// bells. So the carts' wheels are solid boards, not spoked; the frames hides hang on are two legs meeting and a pole laid on
// them; the stakes at the graves' heads are single posts; there's no scarecrow in the fields.

import { terrainHeight } from './terrain.js';
import { hash2 } from './terrain-noise.js';
import { Kit } from './sites.js';
import { DELF, HEAPS, KILN_BANK, LEAT, MOUNDS, OUT, OUT_ROUTES, STRIPS, delfDepth, frame, leatAt, unframe } from './outskirts.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);
// (The city's near cells: src/core/phobos-build.js cellOf, the same sum, kept here so neither file waits on the other.)
const cellOf = (x, z) => `${Math.floor((x - 9300) / 100)}_${Math.floor((z + 850) / 100)}`;
// A moving flame, Phobos's own (src/core/phobos-build.js fire): only the far build's are drawn.
function fire(K, x, y, z, w, h, hue = 'dark:flame') {
  K.cone('blood:flame', x, y, z, w * 0.85, h * 0.12, 6);
  const seed = hash2(Math.round(x * 3), Math.round(z * 3));
  (K.fires ||= []).push({ delve: 'phobos', hue, kind: 'flame', x, y, z, w, h, ember: 0, seed },
    { delve: 'phobos', hue, kind: 'glow', x, y: y + h * 0.45, z, w: w * 2.6, h: w * 2.6, ember: 0, seed: 0 });
}
const lamp = (K, x, y, z, r = 22, i = 14) => (K.lamps ||= []).push({ p: [x, y, z], c: [1, 0.6, 0.3], r, i, flicker: 0.4, prio: 4 });

// Which build this is: from far (every cell, a group each) or one cell from near.
let MODE = { far: true, cell: null };
let CELLS = null;
// A thing at (x, z): fn(near) builds it; from far it's grouped by its cell, from near built only in its own cell.
function put(K, x, z, fn) {
  const c = cellOf(x, z);
  if (MODE.far) { CELLS?.add(c); K.group('ph:' + c, true, () => fn(false)); } else if (c === MODE.cell) fn(true);
}
// The same, but only from near: the small things, which stop nobody.
const near = (K, x, z, fn) => { if (!MODE.far && cellOf(x, z) === MODE.cell) fn(); };

// ---- pieces

// A shanty: plank walls, a pitched roof of turf or boards, a door in its front (+v), a stovepipe; from far its box and roof.
function shack(K, x, z, yaw, hx, hz, h, o = {}) {
  put(K, x, z, (nr) => {
    const y = Math.min(Y(x - hx, z), Y(x + hx, z), Y(x, z - hz), Y(x, z + hz)), wall = o.wall || 'soot:wood', roof = o.roof || 'soot:roof_3';
    K.box(wall, x, y - 0.6, z, hx, h + 0.6, hz, yaw, { top: false });
    K.gable(roof, wall, x, y + h, z, hx, hz, o.rise ?? 1.4, yaw, 0.45);
    if (!nr) return;
    const c = Math.cos(yaw), s = Math.sin(yaw), P = (u, v, w) => [x + u * c + w * s, y + v, z - u * s + w * c];
    // (Its door: a leaf of boards with no brace across it, a step of stone before it.)
    K.quad('dark:wood', P(-0.5, 0, hz + 0.03), P(0.5, 0, hz + 0.03), P(0.5, 1.9, hz + 0.03), P(-0.5, 1.9, hz + 0.03), [s, 0, c]);
    { const [sx, , sz] = P(0, 0, hz + 0.45); K.box('rubble', sx, Y(sx, sz) - 0.25, sz, 0.6, 0.35, 0.3, yaw, { collide: false }); }
    // (A shutter's square, shut, on one side of it.)
    if (hx > 2) K.quad('dark:wood', P(hx - 1.4, 1.1, hz + 0.03), P(hx - 0.6, 1.1, hz + 0.03), P(hx - 0.6, 1.8, hz + 0.03), P(hx - 1.4, 1.8, hz + 0.03), [s, 0, c]);
    if (o.pipe !== false) { const [px, , pz] = P(-hx * 0.5, 0, -hz * 0.4); K.drum('iron', px, y + h + 0.5, pz, 0.13, 1.6, 6, { collide: false }); }
  });
}

// A long earth mound, rounded: three hipped tiers one over another, each narrower, every face sloped (ends too) and faced
// out, so its ends run down into the ground. (As three stacked gables, the upper two stood proud of the lowest, and their
// upright end triangles showed as black wedges at each mound's ends: round 3's critics, all three.)
function hump(K, layer, x, y, z, hx, hz, h, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w, v) => [x + u * c + v * s, y + w, z - u * s + v * c];
  const face = (a, b, d, e) => {
    const n = [(b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])];
    const m = [(a[0] + b[0] + d[0]) / 3 - x, 0, (a[2] + b[2] + d[2]) / 3 - z], l = Math.hypot(...n) || 1, sg = n[0] * m[0] + n[2] * m[2] < 0 ? -1 : 1;
    K.quad(layer, a, b, d, e, n.map((q) => sg * q / l));
  };
  for (const [fx, fz, lift, rise] of [[1, 1, 0, 0.42], [0.88, 0.66, 0.12, 0.5], [0.74, 0.34, 0.38, 0.62]]) {
    const ax = hx * fx, az = hz * fz, y0 = lift * h - 0.1, y1 = y0 + rise * h, rl = Math.max(0.3, ax - az * 1.6);
    const [A, B, C, D] = [P(-ax, y0, -az), P(ax, y0, -az), P(ax, y0, az), P(-ax, y0, az)], R0 = P(-rl, y1, 0), R1 = P(rl, y1, 0);
    face(A, B, R1, R0); face(C, D, R0, R1); face(B, C, R1, R1); face(D, A, R0, R0);
  }
}

// A wheel of boards, not spokes: a solid disc standing on edge (x, y, z its middle), its face along yaw's across.
function disc(K, x, y, z, yaw, r) {
  const c = Math.cos(yaw), s = Math.sin(yaw), n = 9;
  for (const off of [-0.06, 0.06]) for (let i = 0; i < n; i++) {
    const a = i / n * TAU, b = (i + 1) / n * TAU, W = (q, rr) => [x + Math.cos(q) * rr * c + off * s, y + Math.sin(q) * rr, z - Math.cos(q) * rr * s + off * c];
    if (off < 0) K.tri('dark:wood', [x + off * s, y, z + off * c], W(a, r), W(b, r)); else K.tri('dark:wood', [x + off * s, y, z + off * c], W(b, r), W(a, r));
  }
}
// A cart (its shafts toward +u), load: what's heaped in it, or nothing.
function cart(K, x, z, yaw, load = null) {
  put(K, x, z, (nr) => {
    const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    K.box('dark:wood', x, y + 0.6, z, 1.4, 0.5, 0.75, yaw, { collide: false });
    if (load) K.box(load, x, y + 1.05, z, 1.25, 0.35, 0.62, yaw, { collide: false });
    K.collide(x, z, 1.5, 0.9, yaw, y + 1.4);
    if (!nr) return;
    for (const sd of [-1, 1]) { const [wx, wz] = P(-0.1, sd * 0.86); disc(K, wx, y + 0.6, wz, yaw, 0.6); }
    for (const sd of [-1, 1]) { const [ax, az] = P(1.4, sd * 0.45), [bx, bz] = P(3.0, sd * 0.38); K.beam('dark:wood', [ax, y + 0.75, az], [bx, Y(bx, bz) + 0.1, bz], 0.07); }
  });
}
// A cart thrown out: on its side, its bed standing, one board wheel under it and the other lying off. (The kit's own wreck has
// a spoked wheel: a cross, which Velscour's land never shows.)
function wreck(K, x, z, yaw) {
  put(K, x, z, (nr) => {
    const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    K.box('dark:wood', x, y - 0.1, z, 1.5, 0.55, 0.12, yaw, { collide: false });
    { const [bx, bz] = P(0, 0.75); K.box('dark:wood', bx, y - 0.1, bz, 1.5, 1.3, 0.1, yaw + 0.12, { collide: false }); }
    K.collide(x, z, 1.6, 0.8, yaw, y + 1.3);
    if (!nr) return;
    { const [wx, wz] = P(0.3, -0.35); disc(K, wx, y + 0.55, wz, yaw + 0.2, 0.6); }
    { const [wx, wz] = P(2.4, -1.2); K.drum('dark:wood', wx, Y(wx, wz) - 0.02, wz, 0.6, 0.1, 9, { collide: false }); }
    { const [ax, az] = P(-1.5, 0.3), [bx, bz] = P(-3.1, 0.5); K.beam('dark:wood', [ax, y + 0.3, az], [bx, Y(bx, bz) + 0.05, bz], 0.07); }
  });
}
// A pyre: logs laid one way only, three courses, a shrouded body on top; lit or not.
function pyre(K, x, z, yaw, lit) {
  put(K, x, z, (nr) => {
    const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w, v) => [x + u * c + w * s, y + v, z - u * s + w * c];
    if (!nr) {
      K.box(lit ? 'char:wood' : 'bark', x, y - 0.1, z, 1.5, 1.0, 0.85, yaw);
      if (lit) fire(K, x, y + 1.0, z, 1.6, 3.2);
      return;
    }
    for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) {
      const w = -0.72 + i * 0.36 + (k % 2) * 0.12, v = 0.15 + k * 0.3, j = hash2(i + k * 7, Math.round(x));
      K.beam(lit && k < 2 ? 'char:wood' : 'bark', P(-1.55 - j * 0.2, w, v), P(1.5 + j * 0.25, w + (j - 0.5) * 0.1, v), 0.14);
    }
    if (!lit) { const [bx, by, bz] = P(0, 0, 1.0); K.box('pale:cloth_oat', bx, by, bz, 0.9, 0.28, 0.27, yaw, { collide: false }); }
  });
}
// A vat sunk in a stone kerb, what's in it showing: liquor (a painting, tinted for the dye or the lime in it).
function vat(K, x, z, yaw, liquor) {
  put(K, x, z, (nr) => {
    let y = Y(x, z);
    // (Sunk: the liquor at the ground, a kerb of black oak a third of a metre over it, its inner face showing. Raised a
    // half-metre, round 1's critics read garden beds; level with a thin kerb, round 2's read floor tiles. The liquor's matte,
    // not water: the water layer's a bright glossy grey from any way off.)
    K.box('rubble', x, y - 0.9, z, 1.12, 1.0, 1.12, yaw, { top: liquor });
    // (Wet brown oak, not black: as char the grid read as a waffle iron, round 3's critics.)
    { const c = Math.cos(yaw), s = Math.sin(yaw); for (const [u, w, hx, hz] of [[0, 1.3, 1.5, 0.2], [0, -1.3, 1.5, 0.2], [1.3, 0, 0.2, 1.1], [-1.3, 0, 0.2, 1.1]]) K.box(nr ? 'umber:wood' : 'dark:wood', x + u * c + w * s, y - 0.2, z - u * s + w * c, hx, 0.65, hz, yaw, { collide: false }); }
    if (!nr) return;
    // (The kerb's inner faces dark down to the liquor, the lip's shadow: lit, the sunk liquor read level with the kerb.)
    { const c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w, v) => [x + u * c + w * s, y + v, z - u * s + w * c], e = 1.09;
      for (const [a, b] of [[[-e, -e], [e, -e]], [[e, -e], [e, e]], [[e, e], [-e, e]], [[-e, e], [-e, -e]]]) {
        const mu = (a[0] + b[0]) / 2, mw = (a[1] + b[1]) / 2, l = Math.hypot(mu, mw), nu = -mu / l, nw = -mw / l;
        K.quad('char:rubble', P(a[0], a[1], 0.1), P(b[0], b[1], 0.1), P(b[0], b[1], 0.44), P(a[0], a[1], 0.44), [nu * c + nw * s, 0, -nu * s + nw * c]);
      } }
    y -= 0.38;
    // (A pole left standing in it, leaning; a hide half under.)
    const c = Math.cos(yaw), s = Math.sin(yaw), j = hash2(Math.round(x), Math.round(z));
    if (j > 0.4) K.beam('dark:wood', [x + 0.3 * c, y + 0.35, z - 0.3 * s], [x + 0.9 * c + 0.4 * s, y + 2.3, z - 0.9 * s + 0.4 * c], 0.04);
    if (j < 0.6) K.quad('umber:cloth_oat', [x - 0.8 * c, y + 0.52, z + 0.8 * s], [x + 0.2 * c, y + 0.52, z - 0.2 * s], [x + 0.2 * c + 0.9 * s, y + 0.75, z - 0.2 * s + 0.9 * c], [x - 0.8 * c + 0.9 * s, y + 0.75, z + 0.8 * s + 0.9 * c], [0, 1, 0]);
  });
}
// A frame of two legs meeting at the top each end (no crossing past it) and a pole laid in them, hides over the pole.
function hideFrame(K, x, z, yaw, len = 2.4, hides = 'umber:cloth_oat') {
  put(K, x, z, (nr) => {
    const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w, v) => [x + u * c + w * s, y + v, z - u * s + w * c], H = 2.0;
    K.collide(x, z, len, 0.6, yaw, y + H);
    if (!nr) { K.quad(hides, P(-len, -0.7, 0.4), P(len, -0.7, 0.4), P(len, 0, H), P(-len, 0, H)); K.quad(hides, P(len, 0.7, 0.4), P(-len, 0.7, 0.4), P(-len, 0, H), P(len, 0, H)); return; }
    for (const u of [-len, len]) for (const sd of [-1, 1]) K.beam('wood', P(u, sd * 0.85, -0.2), P(u, 0, H), 0.05);
    K.beam('wood', P(-len, 0, H + 0.04), P(len, 0, H + 0.04), 0.05);
    for (let i = 0; i < 3; i++) {
      const u0 = -len + 0.15 + i * (2 * len - 0.3) / 3, u1 = u0 + (2 * len - 0.3) / 3 - 0.12, d = 0.9 + hash2(i, Math.round(z)) * 0.5;
      for (const sd of [-1, 1]) K.quad(i === 1 ? 'blood:cloth_oat' : hides, P(sd > 0 ? u0 : u1, 0, H - 0.02), P(sd > 0 ? u1 : u0, 0, H - 0.02), P(sd > 0 ? u1 : u0, sd * 0.55, H - d), P(sd > 0 ? u0 : u1, sd * 0.55, H - d));
    }
  });
}
// A lime kiln built into the bank's face: a squat drum of rubble standing out of the stone wall from the yard up to the bank's
// top (y0 to top), its mouth an arch at the foot facing the city, fire in it. (Round 1's critics: on top of a soft lump.)
function kiln(K, x, z, yaw, lit, y0 = null, top = null) {
  put(K, x, z, (nr) => {
    const y = y0 ?? Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    const h = top !== null ? top + 1.2 - (y - 0.5) : 7.5;
    K.drum('soot:rubble', x, y - 0.5, z, 3.6, h, 12, { r2: 3.0, lid: 'char:rubble' });
    const [mx, mz] = P(0, 3.4), my = y0 ?? Y(mx, mz);
    if (lit) fire(K, mx, my + 0.2, mz, 1.0, 1.7, 'dark:flame');
    // (The draw-arch's back glowing, seen from the yard: round 2's critics found a match-sized fire at a stump's foot. And the
    // lime's white run down the kiln's face from its top, where it's drawn and spilt.)
    if (lit) K.quad('flame', [mx - 0.8 * c - 0.3 * s, my, mz + 0.8 * s - 0.3 * c], [mx + 0.8 * c - 0.3 * s, my, mz - 0.8 * s - 0.3 * c], [mx + 0.8 * c - 0.3 * s, my + 1.9, mz - 0.8 * s - 0.3 * c], [mx - 0.8 * c - 0.3 * s, my + 1.9, mz + 0.8 * s - 0.3 * c], [s, 0, c]);
    for (const [e, w, d] of [[-1.6, 0.5, 0.55], [0.4, 0.9, 0.75], [2.1, 0.4, 0.45]]) {
      const a0 = (e - w) / 3.62, a1 = (e + w) / 3.62, R = 3.64, yt = y - 0.5 + h, yb = yt - h * d;
      const E = (a, yy) => [x + (Math.sin(a) * c + Math.cos(a) * s) * R, yy, z + (-Math.sin(a) * s + Math.cos(a) * c) * R];
      const nx = Math.cos((a0 + a1) / 2) * s + Math.sin((a0 + a1) / 2) * c, nz = Math.cos((a0 + a1) / 2) * c - Math.sin((a0 + a1) / 2) * s;
      K.quad('pale:rubble', E(a0, yb), E(a1, yb), E(a1, yt), E(a0, yt), [nx, 0, nz]);
    }
    if (!nr) return;
    if (lit) lamp(K, mx + 1.2 * s, my + 1.0, mz + 1.2 * c, 16, 14);
    K.arch('dark:rubble', mx, mz, yaw, { a: 0.8, pw: 0.9, hs: 0.9, t: 1.4, ring: 0.45, top: 2.6, y: my, collide: false });
    K.drum('char:rubble', x, y - 0.5 + h - 1.0, z, 3.0, 0.4, 12, { r2: 2.6, open: true, collide: false });
  });
}
// A shear-legs: two long poles leaning together over the Delf's edge, a stay back to a stake, a rope down with a block on it.
function shearLegs(K, x, z, yaw, reach = 3.5, h = 8) {
  put(K, x, z, (nr) => {
    const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    const [tx, tz] = P(reach, 0), top = [tx, y + h, tz];
    for (const sd of [-1, 1]) { const [fx, fz] = P(0, sd * 2.2); K.beam('dark:wood', [fx, Y(fx, fz) - 0.2, fz], top, 0.16); }
    const [bx, bz] = P(-6, 0);
    K.beam('dark:wood', [bx, Y(bx, bz) + 0.3, bz], top, 0.08);
    if (!nr) return;
    K.box('dark:wood', bx, Y(bx, bz) - 0.3, bz, 0.25, 1.0, 0.25, yaw, { collide: false });
    K.beam('iron', top, [tx, y + h * 0.45, tz], 0.035);
    K.box('pale:ashlar', tx, y + h * 0.45 - 1.0, tz, 0.6, 0.95, 0.45, yaw + 0.3, { collide: false });
  });
}
// Cut blocks stacked: n of them in courses, each a man's length.
function blocks(K, x, z, yaw, n = 6) {
  put(K, x, z, (nr) => {
    const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw);
    if (!nr) { K.box('pale:ashlar', x, y - 0.1, z, 1.6, 0.6 * Math.ceil(n / 3), 0.7, yaw); return; }
    for (let i = 0; i < n; i++) {
      const k = Math.floor(i / 3), u = (i % 3 - 1) * 1.05 + k * 0.25, j = hash2(i, Math.round(x));
      K.box('pale:ashlar', x + u * c, y - 0.1 + k * 0.6, z - u * s, 0.5, 0.58, 0.7, yaw + (j - 0.5) * 0.15, { collide: false });
    }
  });
}
// A post with a lantern on it, lit at dusk (from near).
function lanternPost(K, x, z, yaw) { put(K, x, z, (nr) => { if (!nr) return; K.lantern(x, z, 2.7, yaw, 'dark:wood'); lamp(K, x + Math.cos(yaw) * 0.45, Y(x, z) + 2.1, z - Math.sin(yaw) * 0.45); }); }
// A fire on the ground, ringed with stones; from far its flame.
function hearth(K, x, z) { put(K, x, z, (nr) => { if (nr) { K.campfire(x, z, false); lamp(K, x, Y(x, z) + 0.8, z, 12, 8); } else fire(K, x, Y(x, z) + 0.15, z, 0.5, 1.1); }); }
// Reeds: a clump of thin blades.
// (From far, a tuft for each clump: near only, from the approach the Sump had three tufts, round 3's critics.)
function reeds(K, x, z, n = 7) {
  put(K, x, z, (nr) => { if (!nr) { K.cone('moss:cloth_oat', x, Y(x, z) - 0.1, z, 0.7, 1.7, 5); return; } for (let i = 0; i < n; i++) { const a = hash2(i, Math.round(x * 3)) * TAU, r = hash2(i, Math.round(z * 3)) * 1.1, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; K.cone(i % 3 ? 'moss:cloth_oat' : 'umber:cloth_oat', px, Y(px, pz) - 0.1, pz, 0.09, 1.2 + hash2(i, 5) * 0.9, 5); } });
}
// A stake at a grave's head: one post, a rag tied on.
function stake(K, x, z, k) {
  near(K, x, z, () => {
    const y = Y(x, z), lx = (hash2(k, 3) - 0.5) * 0.25, lz = (hash2(k, 4) - 0.5) * 0.25;
    K.beam('dark:wood', [x, y - 0.2, z], [x + lx, y + 1.15, z + lz], 0.06);
    if (k % 3 === 0) K.quad('soot:cloth_oat', [x + lx, y + 1.05, z + lz], [x + lx + 0.05, y + 1.0, z + lz + 0.05], [x + lx + 0.25, y + 0.55, z + lz + 0.2], [x + lx + 0.15, y + 0.55, z + lz + 0.1]);
  });
}
// A run of dry-stone wall over uneven ground: short lengths, each sat on the ground under it.
// Is (x, z) within m of the worn width of one of the Outwall's own ways? (tools/lands/check-sites.mjs: nothing stands on a way.)
function onOutWay(x, z, m) {
  for (const r of OUT_ROUTES) for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
    if (Math.min(ax, bx) > x + 60 || Math.max(ax, bx) < x - 60 || Math.min(az, bz) > z + 60 || Math.max(az, bz) < z - 60) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(ax + dx * t - x, az + dz * t - z) < r.w * 0.8 + m) return true;
  }
  return false;
}
function dryWall(K, a, b, h = 0.8) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 5));
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (hash2(Math.round(mx), Math.round(mz)) < 0.14) continue;   // (gaps, where it's fallen or been gone through)
    { let on = false; for (let k = 0; k <= 4; k++) on ||= onOutWay(x0 + (x1 - x0) * k / 4, z0 + (z1 - z0) * k / 4, 0.6); if (on) continue; }   // (and where a way goes through it)
    put(K, mx, mz, () => K.box('rubble', mx, Y(mx, mz) - 0.35, mz, L / n / 2 + 0.05, h + 0.35 - hash2(i, Math.round(mz)) * 0.25, 0.32, Math.atan2(-(z1 - z0), x1 - x0)));
  }
}

// ---- the places

function ashfold(K) {
  const p = OUT.ashfold, at = (u, v) => unframe(p, u, v);
  // Five shanties round a beaten yard, the carts the ash goes out in, the fire, the sutler's board.
  for (const [u, v, a, hx, hz, h] of [[-14, -10, 0.3, 2.8, 2.2, 2.3], [-3, -16, -0.1, 3.4, 2.4, 2.5], [10, -14, -0.4, 2.6, 2.1, 2.2], [16, 2, -1.5, 2.8, 2.2, 2.4], [-17, 6, 1.4, 2.4, 2.0, 2.1]]) {
    const [x, z] = at(u, v); shack(K, x, z, p.yaw + a, hx, hz, h);
  }
  { const [x, z] = at(5, 9); cart(K, x, z, p.yaw + 2.6, 'soot:rubble'); }
  { const [x, z] = at(-8, 12); cart(K, x, z, p.yaw + 0.4, 'char:rubble'); }
  { const [x, z] = at(0, 0); hearth(K, x, z); }
  { const [x, z] = at(7, -4); put(K, x, z, (nr) => { if (nr) { K.table(x, z, p.yaw, 1.2); K.goods(x + 0.5, z + 1.2, 5, 1.0); } else K.collide(x, z, 1.2, 0.5, p.yaw, Y(x, z) + 0.9); }); }
  // (Sacks of ash in a row against the biggest shanty, barrels, a water butt.)
  near(K, ...at(-3, -12.6), () => { for (let i = 0; i < 6; i++) { const [x, z] = at(-5.5 + i * 0.95, -12.8 + (i % 2) * 0.3); K.sack(x, z, 0.36); } });
  near(K, ...at(12, -9), () => { const [x, z] = at(12, -9); K.barrel(x, z); K.barrel(...at(12.9, -9.6)); K.barrel(...at(11.2, -9.9), 0.3, 0.8); });
  near(K, ...at(-12, -4), () => { const [x, z] = at(-12, -4); K.woodpile(x, z, p.yaw + 0.3); });
  for (const [u, v] of [[-4, 22], [4, 22]]) { const [x, z] = at(u, v); lanternPost(K, x, z, p.yaw + (u < 0 ? 0 : Math.PI)); }
  // (The outer ring: three more hovels and a lean-to stable, their backs to the wind off the cliffs.)
  for (const [u, v, a, hx, hz, h] of [[-26, -4, 1.7, 2.2, 1.8, 2.0], [24, -14, -0.9, 2.3, 1.9, 2.0], [26, 12, -2.0, 2.0, 1.8, 1.9]]) {
    const [x, z] = at(u, v); shack(K, x, z, p.yaw + a, hx, hz, h, { roof: 'soot:roof_1' });
  }
  { const [x, z] = at(-6, -24); put(K, x, z, (nr) => { if (nr) K.leanTo(x, z, p.yaw, 4.5, 2.2, 2.6); else K.collide(x, z, 4.5, 1.6, p.yaw, Y(x, z) + 2.4); }); }
  // (A dry wall round the back of the yard, broken, its open side to the road; the ash heaped grey against it, waiting to go out.)
  dryWall(K, at(-30, 16), at(-30, -18), 0.9); dryWall(K, at(-30, -20), at(18, -27), 0.9); dryWall(K, at(20, -26), at(31, -2), 0.9);
  for (const [u, v, r] of [[-22, -14, 3.2], [-12, -22, 2.6], [20, -20, 2.8], [28, 4, 2.2]]) put(K, ...at(u, v), (nr) => { const [x, z] = at(u, v); if (nr) K.heap('soot:rubble', x, z, r, r * 0.55, 9, { collide: false }); else K.box('soot:rubble', x, Y(x, z) - 0.4, z, r * 0.6, r * 0.55, r * 0.6, p.yaw + u, { collide: false }); });
  near(K, ...at(-20, 12), () => { for (let i = 0; i < 8; i++) { const [x, z] = at(-22 + (i % 4) * 1.0, 11 + Math.floor(i / 4) * 0.9); K.sack(x, z, 0.4); } });
  near(K, ...at(18, 10), () => { const [x, z] = at(18, 10); K.woodpile(x, z, p.yaw - 1.2, 2.2, 1.2, 0.7); });
  { const [x, z] = at(22, -4); cart(K, x, z, p.yaw - 1.0, 'soot:rubble'); }
}

function delf(K) {
  const p = OUT.delf, at = (u, v) => unframe(p, u, v);
  // The shear-legs at the rim over the deepest bench, the blocks cut and waiting, a sled, a hut for the tools.
  { const [x, z] = at(8, -DELF.hv - 2); shearLegs(K, x, z, p.yaw + Math.PI / 2, 4.2, 9); }
  for (const [u, v, n] of [[22, -DELF.hv - 7, 6], [-8, -DELF.hv - 8, 4], [12, 0, 5], [-18, 6, 3]]) {
    const [x, z] = at(u, v); blocks(K, x, z, p.yaw + hash2(u, v) * 0.6, n);
  }
  { const [x, z] = at(-DELF.hu - 12, -12); shack(K, x, z, p.yaw + 1.6, 2.6, 2.0, 2.2, { roof: 'roof_3' }); }
  { const [x, z] = at(-DELF.hu - 2, DELF.hv - 7); cart(K, x, z, p.yaw, 'pale:rubble'); }
  // (A ladder down each bench's face, where the ramp's far.)
  for (const [u, v] of [[30, -18], [36, -10]]) near(K, ...at(u, v), () => { const [x, z] = at(u, v), [tx, tz] = at(u, v - 2.2), ty = Y(tx, tz); K.ladder(x, z, tx, ty + 0.2, tz, 0.5); });
  // (Spoil and rubble on the benches; wedges and mauls left by the blocks.)
  for (let i = 0; i < 10; i++) {
    const u = (hash2(i, 61) - 0.5) * DELF.hu * 1.6, v = (hash2(i, 63) - 0.5) * DELF.hv * 1.4, [x, z] = at(u, v);
    if (delfDepth(x, z) < 1) continue;
    near(K, x, z, () => K.heap('pale:rubble', x, z, 1.2 + hash2(i, 65), 0.8 + hash2(i, 67) * 0.8, 7, { collide: false }));
  }
  { const [x, z] = at(-DELF.hu - 4, DELF.hv - 2); lanternPost(K, x, z, p.yaw); }
  { const [x, z] = at(-20, -DELF.hv - 2); shearLegs(K, x, z, p.yaw + Math.PI / 2, 3.6, 7.5); }
  for (const [u, v, n] of [[34, -DELF.hv - 6, 5], [-30, -DELF.hv - 9, 6], [26, 12, 4], [-2, -12, 3], [38, 20, 6]]) { const [x, z] = at(u, v); blocks(K, x, z, p.yaw + hash2(u, v) * 0.8, n); }
  // (A stone-sled at the ramp's head, a block roped on it, its runners in the ruts.)
  { const [x, z] = at(-DELF.hu + 6, DELF.hv + 4); put(K, x, z, (nr) => { const y = Y(x, z), c = Math.cos(p.yaw), s = Math.sin(p.yaw); K.box('pale:ashlar', x, y + 0.35, z, 0.9, 0.6, 0.6, p.yaw, { collide: false }); K.collide(x, z, 1.6, 0.8, p.yaw, y + 1.0); if (!nr) return; for (const sd of [-1, 1]) K.box('dark:wood', x + sd * 0.55 * s, y + 0.05, z + sd * 0.55 * c, 1.6, 0.15, 0.1, p.yaw, { collide: false }); K.box('dark:wood', x, y + 0.25, z, 1.3, 0.08, 0.7, p.yaw, { collide: false }); }); }
  // (The scree off the cutting, rough grey heaps along the rim.)
  for (const [u, v, r] of [[-40, -38, 3.0], [10, -44, 2.6], [44, -30, 2.4], [-46, 20, 2.2]]) put(K, ...at(u, v), (nr) => { const [x, z] = at(u, v); if (nr) K.heap('pale:rubble', x, z, r, r * 0.6, 8, { collide: false }); else K.box('pale:rubble', x, Y(x, z) - 0.4, z, r * 0.6, r * 0.6, r * 0.6, p.yaw + v, { collide: false }); });
}

function pyreGround(K) {
  const p = OUT.pyre, at = (u, v) => unframe(p, u, v);
  // The burning floor: flags laid over the raised rubble, black with it.
  put(K, p.x, p.z, (nr) => { if (nr) K.paving('char:stone', p.x, p.z, 16.5, 9.5, p.yaw, 0.04, 2.5); });
  pyre(K, ...at(-9, -3), p.yaw, true);
  pyre(K, ...at(0, -3), p.yaw, false);
  pyre(K, ...at(9, -3.5), p.yaw, false);
  pyre(K, ...at(-4, 4.5), p.yaw + 0.05, false);
  // The keepers' shed at its back, a bone cart, the ash heaped on boards to go out to Ashfold.
  { const [x, z] = at(4, -16); shack(K, x, z, p.yaw, 3.4, 2.0, 2.5, { roof: 'char:roof_3' }); }
  { const [x, z] = at(15, 6); cart(K, x, z, p.yaw + 2.9, 'pale:cloth_oat'); }
  for (const [u, v, r] of [[-20, 6, 1.8], [-18, -10, 1.4], [20, -8, 1.6]]) near(K, ...at(u, v), () => { const [x, z] = at(u, v); K.heap('soot:rubble', x, z, r, r * 0.7, 8, { collide: false }); });
  // (Long iron hooks the keepers turn the dead with, leant on the shed: poles with a hook at the end, no crosspiece.)
  near(K, ...at(4, -13.6), () => { for (let i = 0; i < 3; i++) { const [x, z] = at(1 + i * 0.6, -13.7), [tx, tz] = at(1.3 + i * 0.6, -14.0), y = Y(x, z); K.beam('iron', [x, y, z], [tx, y + 2.6, tz], 0.03); } });
  for (const [u, v] of [[-18, 0], [18, 0]]) { const [x, z] = at(u, v); lanternPost(K, x, z, p.yaw + (u < 0 ? Math.PI : 0)); }
}

function paupers(K) {
  const p = OUT.mounds, at = (u, v) => unframe(p, u, v);
  MOUNDS.forEach(([u, v], k) => { const [x, z] = at(u + 7.2, v); stake(K, x, z, k); });
  // (A plain board at every head, a single plank stood in the earth, some leaning off true by the turn: no crosspiece, ever.
  // Seen from the road, which the stakes alone weren't.)
  // (Round 2's critics: the mounds read as faint bumps and the boards as matchsticks. Each mound's earth built up over the
  // ground's own swell, dark and turned, half a metre and more; each board a metre and more of weathered grey plank, leaning
  // as they do when the earth settles.)
  MOUNDS.forEach(([u, v], k) => {
    const fresh = k >= 9;
    // (A long earth ridge, not drums: three heaps side by side read as sawn stumps. hump, above.)
    { const [x, z] = at(u, v); put(K, x, z, () => { let y = 1e9; for (const [a, b] of [[-6, -2], [6, -2], [-6, 2], [6, 2], [0, 0]]) y = Math.min(y, Y(...at(u + a, v + b))); const L = fresh ? 'umber:p2_ash_clay_ground' : 'dark:p2_ash_clay_ground', h = fresh ? 0.85 : 0.65; hump(K, L, x, y, z, 6.2, 2.3, h, p.yaw); }); }
    const [x, z] = at(u + 6.6, v + (hash2(k, 8) - 0.5) * 0.8), y = Y(x, z), lean = (hash2(k, 11) - 0.5) * 0.5, tall = 1.0 + hash2(k, 9) * 0.45;
    const [tx, tz] = at(u + 6.6 + lean, v + (hash2(k, 8) - 0.5) * 0.8 + (hash2(k, 12) - 0.5) * 0.3);
    put(K, x, z, () => K.beam(k % 3 ? 'pale:wood' : 'wood', [x, y - 0.3, z], [tx, y + tall, tz], 0.18, 0.05));
  });
  // (A fresh one, open: a black hole in the turned earth, the spoil heaped beside it, the spade stood in the spoil; the bier
  // the dead came out on, its two poles laid along it, and the cart that brought them.)
  {
    const [x, z] = at(46, -2), y = Y(x, z), c = Math.cos(p.yaw), s = Math.sin(p.yaw), P = (uu, ww, vv = 0) => [x + uu * c + ww * s, y + vv, z - uu * s + ww * c];
    put(K, x, z, (nr) => {
      K.quad('char:stone', P(-1.0, -0.45, 0.06), P(1.0, -0.45, 0.06), P(1.0, 0.45, 0.06), P(-1.0, 0.45, 0.06), [0, 1, 0]);
      for (const [a, b] of [[P(-1.05, -0.5, 0.05), P(1.05, -0.5, 0.05)], [P(1.05, 0.5, 0.05), P(-1.05, 0.5, 0.05)]]) K.quad('umber:rubble', a, b, [b[0], b[1] + 0.25, b[2]], [a[0], a[1] + 0.25, a[2]]);
      const [hx, , hz] = P(0, 1.9); K.heap('umber:rubble', hx, hz, 1.4, 0.95, 8, { collide: false });
      if (!nr) return;
      // (The spade's handle only, stood in the spoil: its blade across the shaft's foot would be a T.)
      K.beam('dark:wood', P(0.2, 1.9, 0.5), P(0.35, 2.0, 1.75), 0.04);
      for (const ww of [-0.32, 0.32]) K.beam('wood', P(-1.4, -1.6 + ww, 0.12), P(1.4, -1.6 + ww, 0.12), 0.04);
      { const [sx, , sz] = P(0, -1.6); K.box('pale:cloth_oat', sx, y + 0.14, sz, 0.85, 0.12, 0.26, p.yaw, { collide: false }); }
    });
    const [cx, cz] = at(50, 4); cart(K, cx, cz, p.yaw + 2.2, 'pale:cloth_oat');
  }
  { const [x, z] = at(-48, 0); put(K, x, z, (nr) => { if (nr) K.rock('dark:stone', x, z, 0.8, 1.6); }); }
  // (Small field stones laid at the feet of the older mounds, and a sexton's lean-to at the end of the rows.)
  MOUNDS.forEach(([u, v], k) => { if (k % 2) near(K, ...at(u - 7, v), () => { const [x, z] = at(u - 7, v); K.rock('dark:stone', x, z, 0.35 + hash2(k, 91) * 0.2, 0.5); }); });
  { const [x, z] = at(52, 22); put(K, x, z, (nr) => { if (nr) K.leanTo(x, z, p.yaw + Math.PI, 3.0, 2.0, 2.4); else K.collide(x, z, 3.0, 1.4, p.yaw, Y(x, z) + 2.2); }); }
  for (const [u, v] of [[-56, -2], [56, 6]]) { const [x, z] = at(u, v); lanternPost(K, x, z, p.yaw); }
}

function middens(K) {
  const p = OUT.middens;
  // On every heap: what's thrown out of a city. Crates broken open, barrels, bones, a cart on its side.
  HEAPS.forEach(([x, z, h, r], i) => {
    near(K, x, z, () => {
      for (let k = 0; k < 12; k++) {
        const a = hash2(i, k * 3) * TAU, d = hash2(k, i * 5) * r * 0.7, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, py = Y(px, pz);
        const j = (i + k) % 4;
        if (j === 0) K.crate(px, pz, 0.35 + hash2(k, i) * 0.2, a, py - 0.1);
        else if (j === 1) K.barrel(px, pz, 0.32, 0.85, py - 0.15);
        else if (j === 2) K.beam('pale:stone', [px, py + 0.1, pz], [px + Math.cos(a + 1) * 0.9, py + 0.15, pz + Math.sin(a + 1) * 0.9], 0.05);
        else K.sack(px, pz, 0.3, py);
      }
    });
  });
  { const [x, z] = [p.x + 34, p.z + 30]; wreck(K, x, z, 0.4); }
  // (Round 2's critics: grey dunes and three sheds; the junk too small to see from thirty metres. So on every heap, things
  // a man's height and more that break its outline from the road: a hut's roof fallen in whole, a stack of barrels, a cart
  // on its side, the ribs of a horse the knackers didn't want. Smoke off two, where something's always smouldering.)
  // (Round 3's critics: still too small to break a heap's line. Each now half as big again, the first stood on the crown
  // where it shows against the sky, and the heap nearest the rag-pickers' road twice the size, with a crate pile beside.)
  let hero = 0; HEAPS.forEach(([hx, hz], i) => { const [bx, bz] = HEAPS[hero]; if (Math.hypot(hx - p.x + 34, hz - p.z - 46) < Math.hypot(bx - p.x + 34, bz - p.z - 46)) hero = i; });
  HEAPS.forEach(([hx, hz, h, r], i) => {
    const S = i === hero ? 2.0 : 1.55;
    for (let k = 0; k < (i === hero ? 4 : 3); k++) {
      const a = hash2(i, k * 7 + 300) * TAU, d = k === 0 ? r * 0.06 : r * (0.3 + hash2(k, i + 301) * 0.3), x = hx + Math.cos(a) * d, z = hz + Math.sin(a) * d, yaw = a + 1.3 + hash2(i, k) * 0.8;
      const kind = (i + k) % 4;
      if (kind === 0) put(K, x, z, (nr) => { const y = Y(x, z); K.gable('soot:roof_1', 'soot:wood', x, y - 0.5 * S, z, 2.6 * S, 1.9 * S, 1.3 * S, yaw, 0.3); if (nr) for (let q = 0; q < 3; q++) { const e = (q - 1) * 1.7 * S; K.beam('soot:wood', [x + Math.cos(yaw) * e, y + 0.1, z - Math.sin(yaw) * e], [x + Math.cos(yaw) * (e + 0.6 * S) + Math.sin(yaw) * 2.4 * S, y + 1.6 * S, z - Math.sin(yaw) * (e + 0.6 * S) + Math.cos(yaw) * 2.4 * S], 0.08 * S); } });
      else if (kind === 1) put(K, x, z, (nr) => {
        // (A pyramid of barrels, five, four and three high: a stack of six was lost in the heap.)
        const y = Y(x, z);
        if (!nr) { K.box('umber:wood', x, y - 0.1, z, 2.2, 2.6, 0.9, yaw, { collide: false }); return; }
        for (const [row, n] of [[0, 5], [1, 4], [2, 3]]) for (let q = 0; q < n; q++) { const e = (q - (n - 1) / 2) * 0.86, [bx, bz] = [x + Math.cos(yaw) * e, z - Math.sin(yaw) * e]; K.barrel(bx, bz, 0.42, 1.05, (row ? Math.max(Y(x, z), Y(bx, bz)) : Y(bx, bz)) - 0.1 + row * 1.0); }
      });
      else if (kind === 2) {
        wreck(K, x, z, yaw);
        // (Crates heaped against the cart, broken and whole, two and three high.)
        near(K, x, z, () => { const c = Math.cos(yaw), s = Math.sin(yaw); for (let q = 0; q < 7; q++) { const u = 1.6 + (q % 3) * 0.75, w = -1.3 - Math.floor(q / 3) * 0.2, cx = x + u * c + w * s, cz = z - u * s + w * c, sz = 0.5 + hash2(q, i) * 0.2; K.crate(cx, cz, sz, yaw + hash2(i, q) * 0.6, Y(cx, cz) - 0.1 + Math.floor(q / 3) * 0.75); } });
      } else put(K, x, z, (nr) => {
        // (Ribs: a pair of curved bones every half-metre along the heap's flank, the two of a pair never meeting, and no spine
        // laid across their feet: each rib on a spine would be a T.)
        const y = Y(x, z), c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w, v) => [x + u * S * c + w * S * s, y + v * S, z - u * S * s + w * S * c];
        for (let q = 0; q < 6; q++) { const u = -1.3 + q * 0.5, L = 1.0 + Math.sin(q / 5 * Math.PI) * 0.6; for (const sd of [-1, 1]) { K.beam('pale:stone', P(u, sd * 0.1, 0.25), P(u + 0.05, sd * L * 0.7, 0.25 + L * 0.8), 0.05 * S); if (nr) K.beam('pale:stone', P(u + 0.05, sd * L * 0.7, 0.25 + L * 0.8), P(u + 0.1, sd * L * 0.35, 0.25 + L * 1.25), 0.04 * S); } }
        if (nr) K.heap('pale:stone', ...P(-2.1, 0, 0).filter((_, n) => n !== 1), 0.35 * S, 0.4 * S, 6, { collide: false });
      });
    }
    // (Smoke off four heaps, not two, and thick: each column drawn three times over.)
    if (i === 3 || i === 9 || i === 6 || i === hero) { const y = Y(hx, hz); put(K, hx, hz, (nr) => { if (!nr) (K.smokes ||= []).push([hx, y + 1.2, hz], [hx + 0.4, y + 1.0, hz - 0.3], [hx - 0.3, y + 1.1, hz + 0.4]); else fire(K, hx + 0.8, y - 0.2, hz, 0.5, 0.7); }); }
  });
  // The rag-pickers' two shelters and their fire, at the heaps' edge by the road.
  shack(K, p.x - 40, p.z + 48, 0.2, 2.2, 1.8, 1.9, { roof: 'soot:roof_1', pipe: false });
  shack(K, p.x - 30, p.z + 54, -0.3, 2.0, 1.7, 1.8, { roof: 'soot:roof_1', pipe: false });
  hearth(K, p.x - 34, p.z + 46);
  shack(K, p.x - 50, p.z + 40, 0.9, 1.9, 1.6, 1.8, { roof: 'soot:roof_1', pipe: false });
  // (From far, the heaps' tops and flanks: broken boards, barrel staves and rags sticking out of them, so they read as rubbish
  // from the road and not as sand. Round 1's critics.)
  HEAPS.forEach(([x, z, h, r], i) => put(K, x, z, (nr) => {
    if (nr) return;
    for (let k = 0; k < 9; k++) { const a = hash2(i, k + 40) * TAU, d = r * (0.15 + hash2(k, i + 41) * 0.6), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; K.box(['dark:wood', 'soot:wood', 'umber:cloth_oat', 'pale:stone', 'blood:cloth_oat'][k % 5], px, Y(px, pz) - 0.2, pz, 0.5 + hash2(i, k) * 0.6, 0.35 + hash2(k, i + 9) * 0.4, 0.3, a, { collide: false }); }
  }));
  // (Bone heaps, the knackers' leavings, by the road in.)
  for (let i = 0; i < 5; i++) { const x = p.x - 20 + i * 9, z = p.z + 60 + hash2(i, 77) * 8; near(K, x, z, () => { for (let k = 0; k < 7; k++) { const a = hash2(i, k) * TAU, py = Y(x, z); K.beam('pale:stone', [x + Math.cos(a) * 0.4, py + 0.1, z + Math.sin(a) * 0.4], [x + Math.cos(a) * 1.3, py + 0.1 + hash2(k, i) * 0.3, z + Math.sin(a) * 1.3], 0.05); } }); }
}

function fields(K) {
  const p = OUT.fields, at = (u, v) => unframe(p, u, v);
  // A wall along every other bank, broken; stooks of the blighted rye on the strip that was cut.
  STRIPS.forEach(([v0, v1, u0, u1], i) => {
    if (i % 2 === 0) dryWall(K, at(u0, v0 - 1.5), at(u1, v0 - 1.5));
    if (i === 2) for (let u = u0 + 8; u < u1 - 6; u += 7) for (const v of [v0 + 7, v1 - 7]) near(K, ...at(u, v), () => { const [x, z] = at(u + hash2(u, v) * 2, v); const y = Y(x, z); K.cone('umber:cloth_oat', x, y - 0.1, z, 0.55, 1.5, 7); });
  });
  dryWall(K, at(-90, 96), at(58, 96));
  // The field barn, roofless: four walls of rubble, their tops come down.
  { const [x, z] = at(-102, -20); put(K, x, z, () => { for (const [a, b] of [[[-5, -3.5], [5, -3.5]], [[5, -3.5], [5, 3.5]], [[5, 3.5], [1, 3.5]], [[-1.6, 3.5], [-5, 3.5]], [[-5, 3.5], [-5, -3.5]]]) { const [ax, az] = unframe({ x, z, yaw: p.yaw }, ...a), [bx, bz] = unframe({ x, z, yaw: p.yaw }, ...b); K.wall('rubble', ax, az, bx, bz, 0.5, 3.2, { ruin: true }); } }); }
}

function leatAndSump(K) {
  // The water: the Sump's still face and the Leat running down to it, a hand under its banks (from far too: it's seen).
  const s = OUT.sump, sy = Y(s.x, s.z) + 1.25;
  put(K, s.x, s.z, () => {
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * TAU, b = (i + 1) / 20 * TAU, r = s.r * 0.62;
      // (Soot-dark and matte, so the sky at a grazing look doesn't lay it pale: round 3's critics, from the approach.)
      // (The moat's dark, still water, its picture laid by the world's x and z: as the game's glassy water, plain or fen, it took
      // the sky and read as a patch of snow, round 2's critics; on a fan of plain triangles it had no texture coordinates and
      // smeared into spokes.)
      const C = [s.x, sy, s.z];
      K.quad('soot:p2_moat_water', C, C, [s.x + Math.cos(b) * r * 1.1, sy, s.z + Math.sin(b) * r], [s.x + Math.cos(a) * r * 1.1, sy, s.z + Math.sin(a) * r], [0, 1, 0]);
    }
  });
  let prev = null;
  for (let i = 0; i + 1 < LEAT.length; i++) {
    const [ax, az] = LEAT[i], [bx, bz] = LEAT[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 6));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const ux = (z1 - z0) / (L / n), uz = -(x1 - x0) / (L / n), w0 = 1.6 + 1.0 * leatAt(x0, z0)[1], w1 = 1.6 + 1.0 * leatAt(x1, z1)[1];
      const y0 = prev ?? Y(x0, z0) + 0.55, y1 = Math.min(y0, Y(x1, z1) + 0.55);
      prev = y1;
      put(K, (x0 + x1) / 2, (z0 + z1) / 2, () => K.quad('water', [x0 - ux * w0, y0, z0 - uz * w0], [x0 + ux * w0, y0, z0 + uz * w0], [x1 + ux * w1, y1, z1 + uz * w1], [x1 - ux * w1, y1, z1 - uz * w1], [0, 1, 0]));
    }
  }
  // Reeds round the Sump and along the Leat's last reach; a punt drawn up; eel-traps.
  // (Forty-eight clumps hugging the water's edge: twenty-six spread over the bank were three tufts from any way off, round 3's critics.)
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU + hash2(i, 9) * 0.12, r = s.r * (0.57 + hash2(i, 11) * 0.12); reeds(K, s.x + Math.cos(a) * r * 1.1, s.z + Math.sin(a) * r, 6 + (i % 4)); }
  near(K, s.x + 34, s.z - 6, () => { K.boat(s.x + 34, Y(s.x + 34, s.z - 6) + 0.1, s.z - 6, 0.6, 4.2, { roll: 0.2 }); for (let i = 0; i < 3; i++) K.drum('bark', s.x + 30 + i * 0.9, Y(s.x + 30 + i, s.z - 12) - 0.1, s.z - 12, 0.3, 0.7, 7, { r2: 0.18, collide: false }); });
  // Plank bridges where the paths cross it: by the Hithe, and under the gate.
  for (const [x, z, yaw] of [[9562, 862, 1.2], [9905, 893, 1.33]]) put(K, x, z, () => { const y = Math.max(Y(x, z) + 1.0, Y(x + Math.cos(yaw) * 4, z - Math.sin(yaw) * 4), Y(x - Math.cos(yaw) * 4, z + Math.sin(yaw) * 4)); K.box('dark:wood', x, y - 0.25, z, 1.0, 0.25, 4.6, yaw, { collide: false }); K.deck?.([[x, z, 1.0, 4.6, yaw, y]]); });
}

function tanPits(K) {
  const p = OUT.tanpits, at = (u, v) => unframe(p, u, v);
  // Three rows of vats: lime nearest the shed, then the dark bark liquor, then the dyes the Quiet Watch's works buy (oxblood,
  // ochre, the green of the walnut).
  // (Three liquors to tell apart from the road: lime white, tannin brown, the dung-green bate; and the oxblood dye.)
  // (The liquor as the moat's picture, tinted, laid by the world's x and z: as cloth and ashlar it read as sand and powder in a
  // sandbox, round 3's critics. Tannin brown in most, the olive bate one in each row, so it's in front whichever way you
  // come; one of lime, one of oxblood.)
  const T = 'dark:p2_moat_water', G = 'mire:p2_moat_water';
  const LIQ = [[T, G, T, 'pale:ashlar'], [T, T, G, T], [G, T, 'blood:p2_moat_water', T]];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const [x, z] = at(-12 + k * 3.4, -8 + r * 3.4); vat(K, x, z, p.yaw, LIQ[r][k]); }
  // The beam-house: an open shed over the fleshing beams; hide frames down the yard; stacked hides; lime barrels.
  { const [x, z] = at(9, -9); put(K, x, z, (nr) => { const y = Y(x, z), c = Math.cos(p.yaw), s = Math.sin(p.yaw); for (const [u, w] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) K.box('dark:wood', x + u * c + w * s, y - 0.3, z - u * s + w * c, 0.14, 3.2, 0.14, p.yaw); K.gable('soot:roof_3', 'dark:wood', x, y + 2.9, z, 4.2, 3.2, 1.5, p.yaw, 0.4); if (nr) for (const u of [-2, 1.5]) K.beam('bark', [x + u * c, y + 0.15, z - u * s], [x + (u + 0.4) * c + 1.4 * s, y + 1.0, z - (u + 0.4) * s + 1.4 * c], 0.22); }); }
  for (const [u, v] of [[-10, 6], [-3, 7], [4, 6]]) { const [x, z] = at(u, v); hideFrame(K, x, z, p.yaw); }
  // (The far row: the old pits, out past the yard's end toward the gate, deep, and not emptied since anyone's father's day.)
  for (let k = 0; k < 4; k++) { const x = 9706 + k * 3.3, z = 875 + k * 0.4; vat(K, x, z, p.yaw, k % 2 ? 'mire:p2_moat_water' : 'dark:p2_moat_water'); }
  near(K, ...at(14, 2), () => { const [x, z] = at(14, 2), y = Y(x, z); for (let i = 0; i < 6; i++) K.box(i % 2 ? 'umber:cloth_oat' : 'dark:cloth_oat', x, y + i * 0.09, z, 0.9 - i * 0.04, 0.09, 0.7, p.yaw + i * 0.07, { collide: false }); for (let i = 0; i < 3; i++) K.barrel(...at(15.5 + i * 0.85, -2)); });
  // (More hides stacked by the beam-house, and the lime in its barrels beside it: round 3's critics.)
  for (const [u, v, a] of [[5, -4, 0.3], [13, -5, -0.5]]) near(K, ...at(u, v), () => { const [x, z] = at(u, v), y = Y(x, z); for (let i = 0; i < 5; i++) K.box(i % 2 ? 'umber:cloth_oat' : 'dark:cloth_oat', x, y + i * 0.09, z, 0.85 - i * 0.04, 0.09, 0.65, p.yaw + a + i * 0.08, { collide: false }); });
  near(K, ...at(7, -14), () => { for (let i = 0; i < 4; i++) { const [x, z] = at(5.5 + i * 0.9, -14 + (i % 2) * 0.3); K.barrel(x, z); K.drum('pale:rubble', x, Y(x, z) + 0.93, z, 0.3, 0.1, 7, { r2: 0.12, collide: false }); } });
}

function hithe(K) {
  const p = OUT.hithe, at = (u, v) => unframe(p, u, v);
  for (const [u, v, a, hx, hz, h] of [[-12, -12, 0.2, 3.0, 2.3, 2.5], [2, -15, -0.15, 3.2, 2.4, 2.6], [15, -9, -0.6, 2.6, 2.1, 2.3], [-15, 9, 2.9, 2.6, 2.1, 2.2], [12, 12, 3.4, 2.8, 2.2, 2.4]]) {
    const [x, z] = at(u, v); shack(K, x, z, p.yaw + a, hx, hz, h, { wall: 'umber:wood' });
  }
  // (The yard's on the near bank: the Leat runs through the Hithe's middle, its landing, the far shanties over the plank bridge.)
  { const [x, z] = at(-4, 5); hearth(K, x, z); }
  { const [x, z] = at(6, 6); put(K, x, z, (nr) => { if (nr) { K.table(x, z, p.yaw + 0.2, 1.2); K.goods(x - 0.4, z + 1.2, 5, 1.0); } else K.collide(x, z, 1.2, 0.5, p.yaw + 0.2, Y(x, z) + 0.9); }); }
  { const [x, z] = at(-6, 14); cart(K, x, z, p.yaw - 0.4, 'umber:cloth_oat'); }
  near(K, ...at(10, 10), () => { const [ax, az] = at(9, 10), [bx, bz] = at(14, 13); K.washing(ax, az, bx, bz); });
  for (const [u, v] of [[-22, 4], [22, 11]]) { const [x, z] = at(u, v); lanternPost(K, x, z, p.yaw); }
}

function limekilns(K) {
  const p = OUT.kilns, at = (u, v) => unframe(p, u, v), yaw = p.yaw + Math.PI;
  // The bank's face (v -15 to -8, toward the city) walled in dressed stone, the yard's floor to the bank's top; the three kilns
  // stand out of it, all three burning, and a buttress between each two.
  const floorY = (u) => Y(...at(u, -24)), topY = (u) => Y(...at(u, -2));
  for (let u = -38; u <= 38; u += 6) {
    const [x, z] = at(u, -13.5), y0 = Math.min(floorY(u), floorY(u + 3)) - 0.6, y1 = Math.max(topY(u), topY(u + 3)) + 0.4;
    put(K, x, z, (nr) => { K.box('stone', x, y0, z, 3.1, y1 - y0, 1.3, p.yaw); if (nr) K.box('pale:stone', x, y1, z, 3.15, 0.25, 1.45, p.yaw, { collide: false }); });
  }
  for (const u of [-36, -12, 12, 36]) { const [x, z] = at(u, -15.2); put(K, x, z, (nr) => { if (nr) K.box('stone', x, floorY(u) - 0.5, z, 1.0, topY(u) - floorY(u) - 0.6, 0.9, p.yaw); }); }
  for (const u of [-24, 0, 24]) { const [x, z] = at(u, -13); kiln(K, x, z, yaw, true, floorY(u), topY(u)); }
  // The burnt lime heaped white in front of them, the chalk carted in heaped behind; wood stacked for the burning.
  for (const [u, v, r] of [[-12, -24, 2.4], [12, -25, 2.0], [30, -22, 1.6]]) put(K, ...at(u, v), (nr) => { const [x, z] = at(u, v); if (nr) K.heap('pale:rubble', x, z, r, r * 0.8, 9, { collide: false }); else K.box('pale:rubble', x, Y(x, z) - 0.3, z, r * 0.6, r * 0.7, r * 0.6, p.yaw, { collide: false }); });
  for (const u of [-34, 36]) near(K, ...at(u, -2), () => { const [x, z] = at(u, -2); K.woodpile(x, z, p.yaw, 2.0, 1.4, 0.6); });
  { const [x, z] = at(5, -21); cart(K, x, z, p.yaw + 0.3, 'pale:rubble'); }   // (off the Kiln Track)
  { const [x, z] = at(44, -10); shack(K, x, z, p.yaw + Math.PI, 2.6, 2.0, 2.2, { roof: 'pale:roof_3' }); }
}

// The gates' fronts: where the Ditch Road goes over the gate's causeway, a lantern on a post each side.
function gateFronts(K) {
  for (const [x, z, yaw] of [[9878, -899, 0], [9922, -899, Math.PI], [9928, 899, 0], [9972, 899, Math.PI]]) lanternPost(K, x, z, yaw);
}

// The Lazar House, where the north arm of the Ditch Road gives out: the hall the city put its lepers in, stone, inside a yard
// wall with one gate (+v, toward the road); two cells; a well with no frame over it; their graves outside the east wall, a
// plain board at each head; a cart of wraps.
function lazarHouse(K) {
  const p = OUT.lazar, at = (u, v) => unframe(p, u, v);
  const C = [[4, 20], [26, 20], [26, -22], [-26, -22]], D = [[-26, -22], [-26, 20], [-4, 20]];
  for (const run of [C, D]) for (let i = 0; i + 1 < run.length; i++) dryWall(K, at(...run[i]), at(...run[i + 1]), 1.7);
  { const [x, z] = at(0, -9); shack(K, x, z, p.yaw, 10, 3.6, 3.2, { wall: 'stone', roof: 'soot:roof_3', rise: 1.8, pipe: false }); }
  for (const u of [-17, 17]) { const [x, z] = at(u, 6); shack(K, x, z, p.yaw + (u > 0 ? -0.15 : 0.15), 2.2, 2.0, 2.2, { roof: 'soot:roof_1', pipe: false }); }
  { const [x, z] = at(8, 9); put(K, x, z, (nr) => { const y = Y(x, z); K.drum('stone', x, y - 0.3, z, 0.95, 1.1, 10, { r2: 0.95, open: true }); if (nr) K.drum('dark:stone', x, y + 0.6, z, 0.75, 0.05, 10, { collide: false }); }); }
  { const [x, z] = at(-8, 12); cart(K, x, z, p.yaw + 0.6, 'pale:cloth_oat'); }
  for (let k = 0; k < 14; k++) { const [x, z] = at(31 + (k % 3) * 3.2, -18 + Math.floor(k / 3) * 7 + hash2(k, 3) * 1.5); put(K, x, z, () => K.box(k % 2 ? 'dark:wood' : 'soot:wood', x, Y(x, z) - 0.3, z, 0.05, 1.0 + hash2(k, 4) * 0.45, 0.25, p.yaw + Math.PI / 2 + (hash2(k, 5) - 0.5) * 0.4, { collide: false })); }
  for (const u of [-5.5, 5.5]) { const [x, z] = at(u, 22); lanternPost(K, x, z, p.yaw); }
}

// The Knackers' Yard, where the south arm ends: the boiling-house with its cauldron, wattle pens, bone heaps, hides on frames.
function knackersYard(K) {
  const p = OUT.knackers, at = (u, v) => unframe(p, u, v);
  { const [x, z] = at(0, -13); shack(K, x, z, p.yaw, 6, 3.5, 3.0, { wall: 'umber:wood', roof: 'soot:roof_3' }); }
  { const [x, z] = at(-9, -2); put(K, x, z, (nr) => { const y = Y(x, z); K.drum('iron', x, y + 0.3, z, 1.25, 1.1, 10, { r2: 1.05, open: true }); fire(K, x, y + 0.05, z, 0.8, 0.9); if (nr) lamp(K, x, y + 1.2, z, 16, 10); }); }
  // (Hurdles of woven hazel, pen by pen: thin, brown, each a panel; nothing crossing anything.)
  const PENS = [[6, -8, 20, 0], [6, 0, 20, 8], [-22, 4, -12, 14]];
  for (const [u0, v0, u1, v1] of PENS) for (const [a, b] of [[[u0, v0], [u1, v0]], [[u1, v0], [u1, v1]], [[u1, v1], [u0, v1]], [[u0, v1], [u0, v0]]]) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 2.6));
    for (let i = 0; i < n; i++) { if (i === 1 && a[1] === v1 && b[1] === v1) continue; const t = (i + 0.5) / n, [x, z] = at(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); put(K, x, z, () => K.box('umber:wood', x, Y(x, z) - 0.2, z, L / n / 2 - 0.05, 1.25, 0.06, p.yaw + Math.atan2(-(b[1] - a[1]), b[0] - a[0]))); }
  }
  for (const [u, v, r] of [[-16, -8, 1.7], [-20, -14, 1.3], [16, 14, 1.5]]) { const [x, z] = at(u, v); put(K, x, z, (nr) => { K.heap('pale:rubble', x, z, r, r * 0.7, 8, { collide: false }); if (nr) for (let k = 0; k < 6; k++) { const a = hash2(k, Math.round(x)) * TAU, y = Y(x, z); K.beam('pale:stone', [x + Math.cos(a) * r * 0.6, y + 0.3, z + Math.sin(a) * r * 0.6], [x + Math.cos(a) * (r + 0.9), y + 0.1, z + Math.sin(a) * (r + 0.9)], 0.06); } }); }
  for (const [u, v, a] of [[-3, 9, 0.1], [5, 13, -0.2]]) { const [x, z] = at(u, v); hideFrame(K, x, z, p.yaw + a); }
  for (const u of [-5.5, 5.5]) { const [x, z] = at(u, 22); lanternPost(K, x, z, p.yaw); }
}

function all(K) { ashfold(K); delf(K); pyreGround(K); paupers(K); middens(K); fields(K); leatAndSump(K); tanPits(K); hithe(K); limekilns(K); lazarHouse(K); knackersYard(K); gateFronts(K); }

/** The Outwall from far, into the land's build: plain shapes (none on a phone) and what stops a body (on both). */
export function outskirtsFar(K) {
  MODE = { far: true, cell: null };
  const g = K.geometry;
  if (K.lean) K.geometry = false;
  all(K);
  K.geometry = g;
}
/** One 100 m cell of it from near (src/core/phobos-build.js phobosCell). */
export function outskirtsNear(K, cell) {
  MODE = { far: false, cell };
  all(K);
  MODE = { far: true, cell: null };
}
/** Every cell with something of it to build from near (src/gfx/phobos-near.js). */
export function outCells() {
  if (!CELLS) { CELLS = new Set(); MODE = { far: true, cell: null }; all(new Kit(false)); }
  return [...CELLS];
}
