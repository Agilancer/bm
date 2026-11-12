// The pieces the places are dressed with (src/core/sites.js mixes PIECES into its Kit): an arch, a wall with openings, steps
// you walk up, tents, carts, stalls, gravestones, boats, barrels, lanterns, banners, a roofed well, a palisade, a plank
// bridge, rocks and cairns. Each is a handful of boxes and quads in the town's own paintings, with a collider where you'd
// walk into it; and the two small towns and the lesser places built out of them, below.
//
// No piece makes a cross or a T: a banner hangs down its own pole, a grave is a slab, a signpost's arms are at odd heights.
// (The T is Tessariel's; plain folk's places and Velscour's carry none. README, "The two sides".)

import { terrainHeight } from './terrain.js';
import { SITES, routeDist } from './lands.js';
import { hash2 } from './terrain-noise.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export const PIECES = {
  // A frame turned by yaw about (x, z), as Kit.box turns: local x across, local z out of the front. P(lx, lz) -> [x, z].
  frame(x, z, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; },

  // A floor to walk on that isn't the land's: level rects (x, z, half across, half through, yaw, height), all one platform.
  deck(rects) {
    const plat = { x: rects[0][0], z: rects[0][1], r: 0, rects: [] };
    for (const [x, z, hu, hw, yaw, y] of rects) {
      plat.rects.push({ x, z, c: Math.cos(yaw), s: Math.sin(yaw), hu, hw, y });
      plat.r = Math.max(plat.r, Math.hypot(x - plat.x, z - plat.z) + Math.hypot(hu, hw) + 0.5);
    }
    this.floors.push(plat);
  },

  // A timber (or a rope, a spar) from a to b, t thick: four sides and its ends.
  beam(layer, a, b, t = 0.1, t2 = t) {
    const d = unit(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(d, up)), v = cross(u, d);
    const C = (p, i) => { const su = (i === 0 || i === 3 ? -1 : 1) * t / 2, sv = (i < 2 ? -1 : 1) * t2 / 2; return [p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv]; };
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; this.quad(layer, C(a, i), C(a, j), C(b, j), C(b, i)); }
    this.quad(layer, C(b, 0), C(b, 1), C(b, 2), C(b, 3)); this.quad(layer, C(a, 3), C(a, 2), C(a, 1), C(a, 0));
  },

  // Flat dressing on the ground (paving, a plank walk, an ash ring): laid on the land a few centimetres up, a cell at a time.
  paving(layer, x, z, hx, hz, yaw = 0, lift = 0.05) {
    const P = this.frame(x, z, yaw), nx = Math.max(1, Math.ceil(hx / 2)), nz = Math.max(1, Math.ceil(hz / 2));
    const V = (i, j) => { const [px, pz] = P(-hx + 2 * hx * i / nx, -hz + 2 * hz * j / nz); return [px, Y(px, pz) + lift, pz]; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) this.quad(layer, V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i + 1, j), [0, 1, 0]);
  },
  // And round: a ring of it from r0 out to r1 (r0 = 0: a disc).
  ringPaving(layer, x, z, r0, r1, sides = 16, lift = 0.05) {
    const V = (r, i) => { const a = i / sides * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; return [px, Y(px, pz) + lift, pz]; };
    for (let i = 0; i < sides; i++) {
      if (r0 > 0.01) this.quad(layer, V(r0, i), V(r0, i + 1), V(r1, i + 1), V(r1, i), [0, 1, 0]);
      else { const p = this.part(layer), b = p.pos.length / 3; for (const q of [[x, Y(x, z) + lift, z], V(r1, i + 1), V(r1, i)]) { p.pos.push(...q); p.nrm.push(0, 1, 0); p.uv.push(q[0] / 3, q[2] / 3); } p.idx.push(b, b + 1, b + 2); }
    }
  },

  crate(x, z, s = 0.45, yaw = 0, y = null) { this.box('wood', x, (y ?? Y(x, z)) - 0.05, z, s, s * 1.7 + 0.05, s, yaw, { collide: y === null }); },
  barrel(x, z, r = 0.36, h = 0.95, y = null) {
    const y0 = y ?? Y(x, z) - 0.05;
    this.drum('wood', x, y0, z, r, h, 8, { r2: r * 0.92, collide: y === null });
    this.drum('iron', x, y0 + h * 0.62, z, r * 1.0, h * 0.09, 8, { r2: r * 0.985, open: true, collide: false });
  },
  sack(x, z, r = 0.34, y = null) { this.drum('cloth_oat', x, (y ?? Y(x, z)) - 0.05, z, r, r * 1.5, 6, { r2: r * 0.55, collide: false, turn: x }); },
  // A heap of goods: crates, barrels and sacks about a middle, n of them, the same every time for the same place.
  goods(x, z, n = 5, spread = 1.4) {
    for (let i = 0; i < n; i++) {
      const a = hash2(x + i, z) * TAU, r = (0.3 + 0.7 * hash2(z, x + i * 3)) * spread, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, k = (i + Math.floor(hash2(x, z) * 3)) % 3;
      if (k === 0) this.crate(px, pz, 0.32 + hash2(i, x) * 0.2, a); else if (k === 1) this.barrel(px, pz); else this.sack(px, pz);
    }
  },

  // A lantern on a post: an arm, an iron cage, a flame in it.
  lantern(x, z, h = 2.5, yaw = 0, layer = 'wood') {
    const y = Y(x, z), P = this.frame(x, z, yaw), [ax, az] = P(0.45, 0);
    this.box(layer, x, y - 0.3, z, 0.07, h + 0.3, 0.07, yaw, { collide: false });
    this.collide(x, z, 0.12, 0.12, 0, y + h);
    this.beam(layer, [x, y + h - 0.08, z], [ax, y + h - 0.08, az], 0.06);
    this.drum('iron', ax, y + h - 0.5, az, 0.1, 0.34, 4, { open: true, collide: false, r2: 0.13 });
    this.cone('iron', ax, y + h - 0.16, az, 0.17, 0.14, 4);
    this.cone('flame', ax, y + h - 0.47, az, 0.07, 0.24, 4);
  },
  // And one hung on a wall: a bracket out along face [nx, nz], the cage under it.
  wallLamp(x, y, z, face) {
    const [nx, nz] = face, ax = x + nx * 0.4, az = z + nz * 0.4;
    this.beam('iron', [x, y, z], [ax, y, az], 0.05);
    this.drum('iron', ax, y - 0.42, az, 0.1, 0.34, 4, { open: true, collide: false, r2: 0.13 });
    this.cone('flame', ax, y - 0.4, az, 0.07, 0.24, 4);
  },

  // Steps up to a door: n of them, hw half wide, the top one against (x, z) at height y0 + n rise and each lower one further
  // out the front. You walk up them (a floor each); cheeks: low walls down either side.
  steps(layer, x, z, yaw, hw, n, o = {}) {
    const rise = o.rise ?? 0.19, tread = o.tread ?? 0.42, y0 = o.y ?? Y(x, z), P = this.frame(x, z, yaw), land = o.landing ?? 0, rects = [];
    for (let k = 0; k < n; k++) {
      const deep = k === 0 ? tread + land : tread, lz = k === 0 ? deep / 2 : land + tread * (k + 0.5), [px, pz] = P(0, lz), top = y0 + (n - k) * rise;
      this.box(layer, px, y0 - 0.4, pz, hw, top - y0 + 0.4, deep / 2 + 0.01, yaw, { collide: false });
      rects.push([px, pz, hw, deep / 2 + 0.01, yaw, top]);
    }
    if (o.walk !== false) this.deck(rects);
    else { const [px, pz] = P(0, (land + n * tread) / 2); this.collide(px, pz, hw, (land + n * tread) / 2, yaw, y0 + n * rise); }
    if (o.cheeks) for (const sd of [-1, 1]) {
      const [px, pz] = P(sd * (hw + 0.22), (land + n * tread) / 2);
      this.box(o.cheeks, px, y0 - 0.4, pz, 0.22, n * rise + 0.75, (land + n * tread) / 2 + 0.1, yaw);
    }
    return y0 + n * rise;
  },

  // An arch across (x, z), looking out along yaw: two piers a apart either side of the middle, pw wide, hs to the springing,
  // t thick, and a round head of ring stone over them. top: a wall filled in over it to that height (else a free ring).
  // broken: how much of the ring still stands, from the left pier (0-1). Colliders: the piers.
  arch(layer, x, z, yaw, o = {}) {
    const a = o.a ?? 1.5, pw = o.pw ?? 0.7, hs = o.hs ?? 2.6, t = (o.t ?? 0.8) / 2, ring = o.ring ?? 0.5, N = o.n ?? 8, y0 = o.y ?? Y(x, z);
    const P = this.frame(x, z, yaw), W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y0 + v, pz]; };
    const keep = o.broken ?? 1;
    for (const sd of [-1, 1]) {
      if (sd > 0 && keep < 0.2) { const [px, pz] = P(a + pw / 2, 0); this.box(layer, px, y0 - 0.5, pz, pw / 2, hs * 0.45 + 0.5, t, yaw, { collide: o.collide !== false }); continue; }
      const [px, pz] = P(sd * (a + pw / 2), 0);
      this.box(layer, px, y0 - 0.5, pz, pw / 2, hs + 0.5, t, yaw, { collide: o.collide !== false });
    }
    for (let i = 0; i < N; i++) {
      if ((i + 1) / N > keep) break;
      const t0 = Math.PI - i / N * Math.PI, t1 = Math.PI - (i + 1) / N * Math.PI;
      const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1), R = a + ring;
      // (The soffit, and the face either side: up to the wall's top where there's one, else the ring's own back.)
      this.quad(layer, W(c0 * a, hs + s0 * a, t), W(c1 * a, hs + s1 * a, t), W(c1 * a, hs + s1 * a, -t), W(c0 * a, hs + s0 * a, -t));
      for (const w of [t, -t]) {
        if (o.top) this.quad(layer, W(c0 * a, hs + s0 * a, w), W(c1 * a, hs + s1 * a, w), W(c1 * a, o.top, w), W(c0 * a, o.top, w));
        else this.quad(layer, W(c0 * a, hs + s0 * a, w), W(c1 * a, hs + s1 * a, w), W(c1 * R, hs + s1 * R, w), W(c0 * R, hs + s0 * R, w));
      }
      if (!o.top) this.quad(layer, W(c0 * R, hs + s0 * R, -t), W(c1 * R, hs + s1 * R, -t), W(c1 * R, hs + s1 * R, t), W(c0 * R, hs + s0 * R, t));
    }
    if (o.top) {
      // The wall over the piers either side of the head, and its top.
      for (const sd of [-1, 1]) { const [px, pz] = P(sd * (a + pw / 2), 0); this.box(layer, px, y0 + hs, pz, pw / 2, o.top - hs, t, yaw, { collide: false }); }
      this.quad(layer, W(-a, o.top, -t), W(-a, o.top, t), W(a, o.top, t), W(a, o.top, -t), [0, 1, 0]);
    }
  },

  // A straight wall with openings in it: 2 hw long through (x, z), t thick, h tall from y. holes: [{ u, w, y0, y1, round }]
  // (its middle along the wall, half width, sill and head over the wall's foot; round: a round head on it). ruin: the top
  // comes down unevenly and some heads are gone. A hole down to the ground is a way through; a window isn't.
  pierced(layer, x, z, yaw, hw, h, t, holes = [], o = {}) {
    const y = o.y ?? Math.min(Y(x, z), Y(...this.frame(x, z, yaw)(-hw, 0)), Y(...this.frame(x, z, yaw)(hw, 0))), P = this.frame(x, z, yaw);
    const hs = [...holes].sort((p, q) => p.u - q.u), tall = (u) => (o.ruin ? h * (0.4 + 0.6 * hash2(Math.round(x + u * 3.1), Math.round(z - u * 1.7))) : h);
    const W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v, pz]; };
    let u0 = -hw; const cols = [];
    for (const q of hs) { cols.push([u0, q.u - q.w]); u0 = q.u + q.w; }
    cols.push([u0, hw]);
    const tops = [];
    cols.forEach(([a, b], i) => {
      if (b - a < 0.05) { tops.push(h); return; }
      // (A column between two holes stands its full height or near it; a long run steps down in pieces when it's a ruin.)
      const n = o.ruin ? Math.max(1, Math.round((b - a) / 3.2)) : 1; let lo = 1e9;
      for (let k = 0; k < n; k++) {
        const c0 = a + (b - a) * k / n, c1 = a + (b - a) * (k + 1) / n, hh = tall((c0 + c1) / 2 + i), [px, pz] = P((c0 + c1) / 2, 0);
        this.box(layer, px, y - 0.5, pz, (c1 - c0) / 2, hh + 0.5, t / 2, yaw); lo = Math.min(lo, hh);
      }
      tops.push(o.ruin ? lo : h);
    });
    hs.forEach((q, i) => {
      const [px, pz] = P(q.u, 0), head = q.y1 + (q.round ? q.w : 0), top = Math.min(tops[i], tops[i + 1]);
      if (q.y0 > 0.05) this.box(layer, px, y - 0.5, pz, q.w, q.y0 + 0.5, t / 2, yaw);
      if (top < head + 0.3) return;                       // (the head's fallen)
      if (q.round) {
        const N = 6;
        for (let k = 0; k < N; k++) {
          const t0 = Math.PI - k / N * Math.PI, t1 = Math.PI - (k + 1) / N * Math.PI, c0 = Math.cos(t0) * q.w, s0 = Math.sin(t0) * q.w, c1 = Math.cos(t1) * q.w, s1 = Math.sin(t1) * q.w;
          this.quad(layer, W(q.u + c0, q.y1 + s0, t / 2), W(q.u + c1, q.y1 + s1, t / 2), W(q.u + c1, q.y1 + s1, -t / 2), W(q.u + c0, q.y1 + s0, -t / 2));
          for (const w of [t / 2, -t / 2]) this.quad(layer, W(q.u + c0, q.y1 + s0, w), W(q.u + c1, q.y1 + s1, w), W(q.u + c1, head, w), W(q.u + c0, head, w));
        }
      }
      this.box(layer, px, y + head, pz, q.w, top - head, t / 2, yaw, { collide: false });
    });
  },

  // A ridge tent: hx long, hz half wide at the ground, h to its ridge; its front (+x end) open, a pole at each end.
  tent(x, z, yaw, hx = 1.6, hz = 1.3, h = 1.7, layer = 'cloth_oat') {
    const y = Y(x, z) - 0.05, P = this.frame(x, z, yaw), W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v, pz]; };
    this.quad(layer, W(-hx, 0, -hz), W(hx, 0, -hz), W(hx, h, 0), W(-hx, h, 0));
    this.quad(layer, W(hx, 0, hz), W(-hx, 0, hz), W(-hx, h, 0), W(hx, h, 0));
    this.tri(layer, W(-hx, 0, -hz), W(-hx, 0, hz), W(-hx, h, 0));
    // (The door's flaps, drawn back.)
    this.tri(layer, W(hx, 0, -hz), W(hx, 0, -hz * 0.45), W(hx, h, 0)); this.tri(layer, W(hx, 0, hz), W(hx, 0, hz * 0.45), W(hx, h, 0));
    for (const u of [-hx, hx]) this.beam('wood', W(u, 0, 0), W(u, h + 0.25, 0), 0.07);
    this.collide(x, z, hx, hz * 0.75, yaw, y + h);
  },
  // A round one: a wall of cloth and a cone over it, a pole out of its top.
  pavilion(x, z, r = 2, h = 3, layer = 'cloth_oat', roof = layer) {
    const y = Y(x, z) - 0.05;
    this.drum(layer, x, y, z, r, h * 0.5, 8, { open: true });
    this.cone(roof, x, y + h * 0.5, z, r + 0.25, h * 0.5, 8);
    this.box('wood', x, y + h, z, 0.05, 0.5, 0.05, 0, { collide: false });
  },
  // A lean-to against something: a back of planks, a roof falling to two posts at the front, open under it.
  leanTo(x, z, yaw, hx, hz, h, roof = 'roof_1', wall = 'wood', o = {}) {
    const y = o.y ?? Y(x, z), P = this.frame(x, z, yaw), W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v, pz]; };
    if (o.back !== false) { const [bx, bz] = P(0, -hz); this.box(wall, bx, y - 0.3, bz, hx, h + 0.3, 0.09, yaw); }
    for (const sd of o.sides === false ? [] : [-1, 1]) {
      const [sx, sz] = P(sd * hx, -hz * 0.25);
      this.box(wall, sx, y - 0.3, sz, 0.08, h * 0.72 + 0.3, hz * 0.75, yaw);
    }
    for (const sd of [-1, 1]) { const [px, pz] = P(sd * (hx - 0.12), hz - 0.12); this.box('wood', px, y - 0.3, pz, 0.1, h * 0.68 + 0.3, 0.1, yaw); }
    this.quad(roof, W(-hx - 0.3, h + 0.12, -hz - 0.2), W(hx + 0.3, h + 0.12, -hz - 0.2), W(hx + 0.3, h * 0.66, hz + 0.35), W(-hx - 0.3, h * 0.66, hz + 0.35));
  },

  // A wheel standing up: a rim, a hub and spokes, flat. (x, y, z) its middle; it rolls along yaw's across.
  wheel(x, y, z, yaw, r = 0.6, layer = 'wood') {
    const P = this.frame(x, z, yaw), W = (u, v) => { const [px, pz] = P(u, 0); return [px, y + v, pz]; };
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, b = (i + 1) / 8 * TAU, q = r * 0.8;
      this.quad(layer, W(Math.cos(a) * q, Math.sin(a) * q), W(Math.cos(b) * q, Math.sin(b) * q), W(Math.cos(b) * r, Math.sin(b) * r), W(Math.cos(a) * r, Math.sin(a) * r), [P(0, 1)[0] - x, 0, P(0, 1)[1] - z]);
    }
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI, c = Math.cos(a), s = Math.sin(a), w = 0.045;
      this.quad(layer, W(-c * r * 0.82 + s * w, -s * r * 0.82 - c * w), W(c * r * 0.82 + s * w, s * r * 0.82 - c * w), W(c * r * 0.82 - s * w, s * r * 0.82 + c * w), W(-c * r * 0.82 - s * w, -s * r * 0.82 + c * w), [P(0, 1)[0] - x, 0, P(0, 1)[1] - z]);
    }
  },
  // A cart: a bed on two wheels, its shafts down on the ground in front (+x). load: what's in it (a painting), or nothing.
  // wreck: on its side with a wheel off.
  cart(x, z, yaw = 0, o = {}) {
    const y = Y(x, z), P = this.frame(x, z, yaw), W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v, pz]; };
    const L = o.len ?? 1.5, B = 0.75, r = 0.62;
    if (o.wreck) {
      this.box('wood', x, y - 0.05, z, L, 0.5, 0.12, yaw);
      this.quad('wood', W(-L, 0.45, 0.1), W(L, 0.45, 0.1), W(L, 0.75, 1.3), W(-L, 0.75, 1.3));
      this.wheel(...W(0.2, r * 0.75, -0.25), yaw + 0.25, r);
      const [wx, wz] = P(L + 0.9, -1.1);
      this.drum('wood', wx, Y(wx, wz), wz, r, 0.09, 8, { r2: r, collide: false });
      return;
    }
    this.box('wood', x, y + r + 0.05, z, L, 0.12, B, yaw, { collide: false });
    for (const sd of [-1, 1]) { const [px, pz] = P(0, sd * B); this.box('wood', px, y + r + 0.17, pz, L, 0.42, 0.04, yaw, { collide: false, top: false }); }
    { const [px, pz] = P(-L, 0); this.box('wood', px, y + r + 0.17, pz, 0.04, 0.42, B, yaw, { collide: false, top: false }); }
    for (const sd of [-1, 1]) {
      this.wheel(...W(-0.15, r, sd * (B + 0.1)), yaw, r);
      this.beam('wood', W(L, r + 0.1, sd * 0.5), W(L + 1.7, 0.1, sd * 0.42), 0.08);
    }
    this.beam('wood', W(-0.15, r, -B - 0.1), W(-0.15, r, B + 0.1), 0.09);
    if (o.load) {
      this.box(o.load, x, y + r + 0.17, z, L - 0.15, 0.55, B - 0.1, yaw, { collide: false });
    }
    this.collide(x, z, L, B + 0.1, yaw, y + r + 0.7);
  },

  // A market stall: four posts, a counter, an awning of cloth falling to the front, what's sold laid out on it.
  stall(x, z, yaw = 0, cloth = 'cloth_oat', sells = 0) {
    const y = Y(x, z), P = this.frame(x, z, yaw), W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v, pz]; };
    const hx = 1.5, hz = 0.9;
    for (const [u, w, hh] of [[-hx, -hz, 2.5], [hx, -hz, 2.5], [hx, hz, 2.0], [-hx, hz, 2.0]]) this.beam('wood', W(u, -0.2, w), W(u, hh, w), 0.09);
    this.quad(cloth, W(-hx - 0.25, 2.55, -hz - 0.2), W(hx + 0.25, 2.55, -hz - 0.2), W(hx + 0.25, 1.98, hz + 0.3), W(-hx - 0.25, 1.98, hz + 0.3));
    this.quad(cloth, W(-hx - 0.25, 1.98, hz + 0.3), W(hx + 0.25, 1.98, hz + 0.3), W(hx + 0.25, 1.7, hz + 0.3), W(-hx - 0.25, 1.7, hz + 0.3));
    const [cx, cz] = P(0, hz * 0.4);
    this.box('wood', cx, y - 0.1, cz, hx, 1.0, 0.42, yaw);
    // (Its wares: loaves and cheeses, apples, cloth, pots.)
    for (let i = 0; i < 4; i++) {
      const [gx, gz] = P(-hx + 0.45 + i * 0.7, hz * 0.4), k = (sells + i) % 4;
      if (k === 0) this.drum('cloth_oat', gx, y + 0.9, gz, 0.2, 0.16, 6, { collide: false });
      else if (k === 1) this.cone('fruit', gx, y + 0.9, gz, 0.24, 0.22, 6);
      else if (k === 2) this.box(sells % 2 ? 'cloth_red' : 'cloth_oat', gx, y + 0.9, gz, 0.26, 0.12, 0.2, yaw + 0.3, { collide: false });
      else this.drum('rubble', gx, y + 0.9, gz, 0.13, 0.3, 6, { r2: 0.17, collide: false });
    }
  },

  // A gravestone: a slab leaning as it's settled, its head cut to a point or left square. (Never a cross: see the top.)
  gravestone(x, z, yaw = 0, h = 0.9, layer = 'stone') {
    const k = hash2(Math.round(x * 3), Math.round(z * 3)), lean = (k - 0.5) * 0.3, w = 0.28 + k * 0.12;
    const y = Y(x, z) - 0.25, c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [x + lx * c + (lz + ly * lean) * s, y + ly, z - lx * s + (lz + ly * lean) * c];
    const B = [[-w, -0.07], [w, -0.07], [w, 0.07], [-w, 0.07]], hh = h + 0.25;
    for (let i = 0; i < 4; i++) { const [ax, az] = B[i], [bx, bz] = B[(i + 1) % 4]; this.quad(layer, P(ax, 0, az), P(bx, 0, bz), P(bx, hh, bz), P(ax, hh, az)); }
    if (k > 0.45) for (const w2 of [-0.07, 0.07]) this.tri(layer, P(-w, hh, w2), P(w, hh, w2), P(0, hh + w * 0.8, w2));
    else this.quad(layer, P(-w, hh, -0.07), P(-w, hh, 0.07), P(w, hh, 0.07), P(w, hh, -0.07), [0, 1, 0]);
    if (h > 0.6) this.collide(x, z, w, 0.12, yaw, y + hh);
  },
  // A graveyard's worth: rows of stones in a w by d plot, some gone, a mound before a few.
  graves(x, z, yaw, hx, hz, layer = 'stone', gap = 2.2) {
    const P = this.frame(x, z, yaw);
    for (let lx = -hx; lx <= hx + 0.01; lx += gap) for (let lz = -hz; lz <= hz + 0.01; lz += gap * 1.25) {
      const k = hash2(Math.round(x + lx * 7), Math.round(z + lz * 5));
      if (k < 0.22) continue;
      const [px, pz] = P(lx + (k - 0.5) * 0.5, lz);
      this.gravestone(px, pz, yaw + (k - 0.5) * 0.4, 0.55 + k * 0.6, layer);
      if (k > 0.7) { const [mx, mz] = P(lx, lz + 1.0); this.box('dark:rubble', mx, Y(mx, mz) - 0.2, mz, 0.4, 0.36, 0.85, yaw, { collide: false }); }
    }
  },

  // A boat, bow to +x: pointed, flat in the bottom, two thwarts. y: where its bottom lies (the water, or the shore).
  boat(x, y, z, yaw = 0, len = 4.2, o = {}) {
    const P = this.frame(x, z, yaw), bw = len * 0.19, hh = 0.55, roll = o.roll ?? 0, layer = o.layer || 'wood';
    const W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v + w * roll, pz]; };
    const out = [[len / 2, 0], [len * 0.22, bw], [-len * 0.3, bw], [-len / 2, bw * 0.6], [-len / 2, -bw * 0.6], [-len * 0.3, -bw], [len * 0.22, -bw]];
    const lo = out.map(([u, w]) => W(u * 0.9, 0, w * 0.55)), hi = out.map(([u, w]) => W(u, hh, w));
    for (let i = 0; i < out.length; i++) { const j = (i + 1) % out.length; this.quad(layer, lo[i], lo[j], hi[j], hi[i]); }
    for (let i = 1; i + 1 < out.length; i++) this.tri(layer, lo[0], lo[i], lo[i + 1]);
    for (const u of [len * 0.08, -len * 0.26]) this.quad(layer, W(u - 0.12, hh * 0.7, -bw * 0.95), W(u - 0.12, hh * 0.7, bw * 0.95), W(u + 0.12, hh * 0.7, bw * 0.95), W(u + 0.12, hh * 0.7, -bw * 0.95), [0, 1, 0]);
    if (o.collide !== false) this.collide(x, z, len / 2, bw, yaw, y + hh);
  },

  // A flag on its own pole: the cloth hangs down the pole from its head, long, with a forked tail. (No bar across.)
  banner(x, z, h = 5, yaw = 0, cloth = 'cloth_red', o = {}) {
    const y = o.y ?? Y(x, z), P = this.frame(x, z, yaw), W = (u, v) => { const [px, pz] = P(u, 0); return [px, y + v, pz]; };
    const w = o.w ?? 0.9, len = o.len ?? h * 0.5, pole = o.pole || 'wood';
    this.box(pole, x, y - 0.3, z, 0.06, h + 0.3, 0.06, yaw, { collide: false });
    this.cone('iron', x, y + h, z, 0.1, 0.3, 4);
    this.quad(cloth, W(0.06, h - 0.1), W(0.06 + w, h - 0.25), W(0.06 + w, h - len), W(0.06, h - len + 0.1), null, [[0, 0], [w / 2, 0], [w / 2, len / 2], [0, len / 2]]);
    this.tri(cloth, W(0.06, h - len + 0.1), W(0.06 + w * 0.5, h - len + 0.05), W(0.06 + w * 0.2, h - len - 0.6));
    this.tri(cloth, W(0.06 + w * 0.5, h - len + 0.05), W(0.06 + w, h - len), W(0.06 + w * 0.8, h - len - 0.6));
    if (o.collide !== false) this.collide(x, z, 0.1, 0.1, 0, y + h);
  },
  // Cloth hung flat on a wall: w wide, len long from y down, its foot cut to a point. face: the wall's way out, [nx, nz].
  hanging(cloth, x, y, z, face, w, len, rep = 2) {
    const [nx, nz] = face, rx = nz, rz = -nx, P = (u, v) => [x + rx * u + nx * 0.07, y + v, z + rz * u + nz * 0.07];
    this.quad(cloth, P(-w / 2, 0), P(w / 2, 0), P(w / 2, -len), P(-w / 2, -len), [nx, 0, nz], [[0, 0], [1, 0], [1, rep], [0, rep]]);
    this.tri(cloth, P(-w / 2, -len), P(w / 2, -len), P(0, -len - w * 0.6));
  },

  // A well with a roof: a stone ring, the water down in it, two posts, a windlass and a little roof.
  well(x, z, yaw = 0, o = {}) {
    const y = Y(x, z), P = this.frame(x, z, yaw), stone = o.stone || 'stone', roof = o.roof || 'roof_1';
    this.drum(stone, x, y - 0.3, z, 1.05, 1.15, 12, { open: true });
    this.drum(stone, x, y + 0.85, z, 1.15, 0.12, 12, { r2: 1.15, open: true, collide: false });
    // (Its rim's top: a ring, the water a way down inside it.)
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, b = (i + 1) / 12 * TAU, V = (r, t, v) => [x + Math.cos(t) * r, y + v, z + Math.sin(t) * r];
      this.quad(stone, V(0.75, a, 0.97), V(0.75, b, 0.97), V(1.15, b, 0.97), V(1.15, a, 0.97), [0, 1, 0]);
      this.quad(stone, V(0.75, b, 0.97), V(0.75, a, 0.97), V(0.75, a, 0.3), V(0.75, b, 0.3));
    }
    this.disc('water', x, y + 0.3, z, 0.76, 12);
    if (o.roof === false) return;
    for (const sd of [-1, 1]) { const [px, pz] = P(sd * 1.25, 0); this.box('wood', px, y - 0.2, pz, 0.09, 2.7, 0.09, yaw, { collide: false }); }
    this.beam('wood', [P(-1.25, 0)[0], y + 1.75, P(-1.25, 0)[1]], [P(1.25, 0)[0], y + 1.75, P(1.25, 0)[1]], 0.14);
    this.gable(roof, 'wood', x, y + 2.45, z, 1.45, 0.75, 0.75, yaw, 0.25);
    this.drum('wood', x + 0.25, y + 1.0, z + 0.2, 0.16, 0.3, 6, { collide: false });
  },

  // A palisade along pts: split logs set upright, their heads cut to points. gaps: [x, z, r] left open (a gate).
  palisade(pts, h = 2.8, o = {}) {
    const layer = o.layer || 'bark', gaps = o.gaps || [], p = this.part(layer);
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 3.2));
      const yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2, c = Math.cos(yaw), s = Math.sin(yaw);
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, hl = len / n / 2;
        if (gaps.some(([gx, gz, gr]) => Math.hypot(x - gx, z - gz) < gr)) continue;
        const y = Math.min(Y(x - c * hl, z + s * hl), Y(x + c * hl, z - s * hl)) - 0.4, hh = h + (hash2(Math.round(x), Math.round(z)) - 0.5) * 0.3;
        this.box(layer, x, y, z, hl + 0.02, hh + 0.4, 0.16, yaw, { top: false });
        // (The points: a little pyramid on each log's head.)
        const m = Math.max(2, Math.round(hl * 2 / 0.62));
        for (let q = 0; q < m; q++) {
          const lx = -hl + (q + 0.5) * hl * 2 / m, w = hl / m, tip = 0.4 + hash2(q + Math.round(x * 2), Math.round(z * 2)) * 0.25;
          const V = (dx, dz, dy) => [x + (lx + dx) * c + dz * s, y + hh + 0.4 + dy, z - (lx + dx) * s + dz * c];
          const A = V(-w, -0.16, 0), B = V(w, -0.16, 0), C = V(w, 0.16, 0), D = V(-w, 0.16, 0), T = V(0, 0, tip);
          this.tri(layer, A, T, B); this.tri(layer, B, T, C); this.tri(layer, C, T, D); this.tri(layer, D, T, A);
        }
      }
    }
    return p;
  },
  // A ring of it (or of anything a callback builds): the corner points of an n-gon, radius r, about (x, z).
  ring(x, z, r, n, turn = 0) { const out = []; for (let i = 0; i <= n; i++) { const a = turn + i / n * TAU; out.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); } return out; },

  // A plank bridge from a to b, hw half wide, its deck up above the land at its ends: piles under it, a rail each side.
  // You walk over it (a floor), up a step at each end.
  bridge(ax, az, bx, bz, hw = 1.3, o = {}) {
    const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2, x = (ax + bx) / 2, z = (az + bz) / 2;
    const up = o.up ?? 0.3, y = Math.max(Y(ax, az), Y(bx, bz)) + up, P = this.frame(x, z, yaw);
    this.box('wood', x, y - 0.14, z, len / 2, 0.14, hw, yaw, { collide: false });
    const rects = [[x, z, len / 2, hw, yaw, y]];
    for (const sd of [-1, 1]) {
      const [ex, ez] = P(sd * (len / 2 + 0.3), 0);
      this.box('wood', ex, Y(ex, ez) - 0.3, ez, 0.3, y - up / 2 - Y(ex, ez) + 0.3, hw, yaw, { collide: false });
      rects.push([ex, ez, 0.3, hw, yaw, y - up / 2]);
    }
    this.deck(rects);
    const n = Math.max(2, Math.round(len / 3));
    for (let k = 0; k <= n; k++) for (const sd of [-1, 1]) {
      const [px, pz] = P(-len / 2 + len * k / n, sd * (hw - 0.08));
      this.box('bark', px, Math.min(Y(px, pz), y) - 0.8, pz, 0.1, y + (o.rail === false ? 0 : 0.95) - Math.min(Y(px, pz), y) + 0.8, 0.1, yaw, { collide: false });
    }
    if (o.rail !== false) for (const sd of [-1, 1]) {
      const [a0, a1] = P(-len / 2, sd * (hw - 0.08)), [b0, b1] = P(len / 2, sd * (hw - 0.08));
      this.beam('wood', [a0, y + 0.9, a1], [b0, y + 0.9, b1], 0.08);
      const [cx, cz] = P(0, sd * (hw + 0.05));
      this.colliders.push({ x: cx, z: cz, hx: len / 2, hz: 0.08, yaw, h: y + 0.95 - Y(cx, cz) });
    }
  },

  // A boulder: six-sided, lumpy, the same each time for the same place.
  rock(layer, x, z, r, h, o = {}) {
    const y = o.y ?? Y(x, z) - h * 0.25, n = 6, k = (i, j) => 0.75 + 0.5 * hash2(Math.round(x * 7) + i * 13, Math.round(z * 7) + j * 5);
    const ring = (rr, yy, j) => { const out = []; for (let i = 0; i < n; i++) { const a = (o.turn || 0) + i / n * TAU; out.push([x + Math.cos(a) * rr * k(i, j) * (o.sx ?? 1), y + yy, z + Math.sin(a) * rr * k(i, j)]); } return out; };
    // (A belly wider than its foot, shoulders at uneven heights, a crown off its middle: not a cut block.)
    const lift = (pts, j, amt) => pts.map((q, i) => [q[0], q[1] + (k(i, j + 3) - 1) * amt, q[2]]);
    const A = ring(r * 0.9, 0, 0), B = lift(ring(r * 1.05, h * 0.42, 1), 1, h * 0.5), C = lift(ring(r * 0.62, h * 0.95, 2), 2, h * 0.7);
    const T = [x + (k(1, 9) - 1) * r * 0.5, y + h * 1.3, z + (k(2, 9) - 1) * r * 0.5];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(layer, A[j], A[i], B[i], B[j]); this.quad(layer, B[j], B[i], C[i], C[j]); this.tri(layer, C[j], C[i], T); }
    if (r > 0.55 && o.collide !== false) this.collide(x, z, r * 0.75, r * 0.75, 0, y + h * 1.1);
  },
  // A cairn of piled stones. open: robbed, a ring of what's left round a dark hole, its capstone thrown aside.
  cairn(x, z, r = 1.4, h = 1.6, layer = 'rubble', open = false) {
    const y = Y(x, z);
    if (!open) { this.drum(layer, x, y - 0.4, z, r, h + 0.4, 7, { r2: r * 0.38, turn: x }); this.rock(layer, x, z, r * 0.42, h * 0.3, { y: y + h - 0.05, collide: false }); return; }
    this.drum(layer, x, y - 0.4, z, r, h * 0.4 + 0.4, 7, { r2: r * 0.8, open: true, turn: x });
    for (let i = 0; i < 7; i++) {
      const a = x + i / 7 * TAU, b = x + (i + 1) / 7 * TAU, V = (rr, t, v) => [x + Math.cos(t) * rr, y + v, z + Math.sin(t) * rr];
      this.quad(layer, V(r * 0.45, a, h * 0.4), V(r * 0.45, b, h * 0.4), V(r * 0.8, b, h * 0.4), V(r * 0.8, a, h * 0.4), [0, 1, 0]);
      this.quad(layer, V(r * 0.45, b, h * 0.4), V(r * 0.45, a, h * 0.4), V(r * 0.45, a, 0.05), V(r * 0.45, b, 0.05));
    }
    this.disc('water', x, y + 0.06, z, r * 0.46, 7);
    const sa = hash2(Math.round(x), Math.round(z)) * TAU, sx = x + Math.cos(sa) * (r + 1.2), sz = z + Math.sin(sa) * (r + 1.2);
    this.box(layer, sx, Y(sx, sz) - 0.15, sz, r * 0.55, 0.4, r * 0.4, sa, { collide: false });
  },

  // A stack of cut wood: bark along it, the cut ends pale.
  woodpile(x, z, yaw = 0, hx = 1.4, h = 1.0, hz = 0.45) {
    const y = Y(x, z) - 0.1, P = this.frame(x, z, yaw), W = (u, v, w) => { const [px, pz] = P(u, w); return [px, y + v, pz]; };
    this.box('bark', x, y, z, hx, h + 0.1, hz, yaw);
    for (const sd of [-1, 1]) this.quad('wood', W(sd * (hx + 0.012), 0, -hz), W(sd * (hx + 0.012), 0, hz), W(sd * (hx + 0.012), h + 0.1, hz), W(sd * (hx + 0.012), h + 0.1, -hz));
  },
  hayrick(x, z, r = 1.5, h = 2.4) { const y = Y(x, z) - 0.15; this.drum('cloth_oat', x, y, z, r, h * 0.55, 9, { r2: r * 0.9, open: true }); this.cone('cloth_oat', x, y + h * 0.55, z, r * 0.9, h * 0.45, 9); },
  trough(x, z, yaw = 0, len = 1.3) { this.box('wood', x, Y(x, z) - 0.1, z, len, 0.55, 0.32, yaw, { top: 'water' }); },
  bench(x, z, yaw = 0, len = 0.9, layer = 'wood') {
    const y = Y(x, z), P = this.frame(x, z, yaw);
    this.box(layer, x, y + 0.42, z, len, 0.07, 0.2, yaw, { collide: false });
    for (const sd of [-1, 1]) { const [px, pz] = P(sd * (len - 0.15), 0); this.box(layer, px, y - 0.1, pz, 0.05, 0.52, 0.18, yaw, { collide: false }); }
    this.collide(x, z, len, 0.2, yaw, y + 0.49);
  },
  table(x, z, yaw = 0, len = 1.1) {
    const y = Y(x, z), P = this.frame(x, z, yaw);
    this.box('wood', x, y + 0.72, z, len, 0.07, 0.45, yaw, { collide: false });
    for (const sd of [-1, 1]) { const [px, pz] = P(sd * (len - 0.2), 0); this.box('wood', px, y - 0.1, pz, 0.06, 0.82, 0.38, yaw, { collide: false }); }
    this.collide(x, z, len, 0.45, yaw, y + 0.8);
  },
  // A fire on the ground in a ring of stones: lit, or cold ash.
  campfire(x, z, lit = true) {
    const y = Y(x, z);
    this.drum('rubble', x, y - 0.1, z, 0.62, 0.28, 8, { r2: 0.5, lid: 'dark:rubble' });
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + x; this.beam('bark', [x + Math.cos(a) * 0.45, y + 0.2, z + Math.sin(a) * 0.45], [x - Math.cos(a) * 0.2, y + 0.5, z - Math.sin(a) * 0.2], 0.11); }
    if (lit) this.cone('flame', x, y + 0.2, z, 0.3, 0.8, 6);
  },
  // A rack: two posts, rails between, things hung from them (cloth, fish, hides: cloth).
  rack(x, z, yaw = 0, len = 1.4, cloth = 'cloth_oat', h = 1.7) {
    const y = Y(x, z), P = this.frame(x, z, yaw), W = (u, v) => { const [px, pz] = P(u, 0); return [px, y + v, pz]; };
    for (const sd of [-1, 1]) this.beam('wood', W(sd * len, -0.2), W(sd * len, h), 0.08);
    this.beam('wood', W(-len, h - 0.08), W(len, h - 0.08), 0.06);
    if (cloth) for (let i = 0; i < 3; i++) {
      const u = -len + 0.3 + i * (2 * len - 0.6) / 3, w = (2 * len - 0.6) / 3 - 0.12, d = 0.5 + hash2(i + Math.round(x), Math.round(z)) * 0.6;
      this.quad(i === 1 && cloth === 'cloth_oat' ? 'wall_13' : cloth, W(u, h - 0.1), W(u + w, h - 0.1), W(u + w, h - 0.1 - d), W(u, h - 0.1 - d), null, [[0, 0], [0.3, 0], [0.3, 0.3], [0, 0.3]]);
    }
    this.collide(x, z, len, 0.1, yaw, y + h);
  },
  // A line of washing between two posts.
  washing(ax, az, bx, bz, h = 1.9) {
    const ya = Y(ax, az), yb = Y(bx, bz);
    this.box('wood', ax, ya - 0.2, az, 0.05, h + 0.2, 0.05, 0); this.box('wood', bx, yb - 0.2, bz, 0.05, h + 0.2, 0.05, 0);
    this.beam('cloth_oat', [ax, ya + h - 0.05, az], [bx, yb + h - 0.05, bz], 0.025);
    const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 1.1));
    for (let i = 0; i < n; i++) {
      const u0 = (i + 0.2) / n, u1 = (i + 0.85) / n, d = 0.5 + hash2(i + Math.round(ax), Math.round(az)) * 0.7, L = (u) => [ax + (bx - ax) * u, ya + (yb - ya) * u + h - 0.07, az + (bz - az) * u];
      const A = L(u0), B = L(u1);
      this.quad(i % 3 === 1 ? 'cloth_red' : 'cloth_oat', A, B, [B[0], B[1] - d, B[2]], [A[0], A[1] - d, A[2]], null, [[0, 0], [0.4, 0], [0.4, 0.4], [0, 0.4]]);
    }
  },
  // A ladder from the ground at (x, z) leaning to (tx, ty, tz).
  ladder(x, z, tx, ty, tz, w = 0.5) {
    const y = Y(x, z), dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz) || 1, px = -dz / l * w / 2, pz = dx / l * w / 2, n = Math.max(3, Math.round((ty - y) / 0.38));
    for (const sd of [-1, 1]) this.beam('wood', [x + px * sd, y, z + pz * sd], [tx + px * sd, ty, tz + pz * sd], 0.06);
    for (let i = 1; i < n; i++) { const u = i / n, cx = x + dx * u, cy = y + (ty - y) * u, cz = z + dz * u; this.beam('wood', [cx - px, cy, cz - pz], [cx + px, cy, cz + pz], 0.04); }
  },
  // A post with arms pointing the ways the roads go, each at its own height.
  signpost(x, z, ways = [0, 2], h = 2.7) {
    const y = Y(x, z);
    this.box('wood', x, y - 0.3, z, 0.08, h + 0.3, 0.08, 0.3);
    ways.forEach((a, i) => {
      const c = Math.sin(a), s = Math.cos(a), yy = y + h - 0.25 - i * 0.42;
      this.beam('wood', [x + c * 0.1, yy, z + s * 0.1], [x + c * 1.05, yy, z + s * 1.05], 0.045, 0.24);
    });
  },
  // A stump, an upright log, a chopping block.
  stump(x, z, r = 0.3, h = 0.5) { this.drum('bark', x, Y(x, z) - 0.1, z, r, h + 0.1, 7, { lid: 'wood', r2: r * 0.9 }); },
  // A heap: earth, ash, charcoal, peat, a kiln's clamp.
  heap(layer, x, z, r, h, sides = 9, o = {}) {
    let y = 1e9; for (let i = 0; i < 6; i++) y = Math.min(y, Y(x + Math.cos(i) * r, z + Math.sin(i) * r));
    this.drum(layer, x, y - 0.3, z, r, h * 0.6 + 0.3, sides, { r2: r * 0.72, open: true, turn: x, collide: o.collide });
    this.drum(layer, x, y + h * 0.6, z, r * 0.72, h * 0.4, sides, { r2: r * 0.25, turn: x, collide: false, lid: o.lid || layer });
  },
  // A window in a house's wall: dark glass, a sill and a lintel of timber, a shutter each side. face: the wall's way out.
  windowAt(x, y, z, face, w = 0.5, h = 0.8, lit = false) {
    const [nx, nz] = face, rx = nz, rz = -nx, P = (u, v, d = 0.04) => [x + rx * u + nx * d, y + v, z + rz * u + nz * d];
    this.quad(lit ? 'flame' : 'water', P(-w, 0), P(w, 0), P(w, h), P(-w, h), [nx, 0, nz]);
    this.quad('wood', P(-w - 0.1, -0.1, 0.07), P(w + 0.1, -0.1, 0.07), P(w + 0.1, 0, 0.07), P(-w - 0.1, 0, 0.07), [nx, 0, nz]);
    this.quad('wood', P(-w - 0.1, h, 0.07), P(w + 0.1, h, 0.07), P(w + 0.1, h + 0.1, 0.07), P(-w - 0.1, h + 0.1, 0.07), [nx, 0, nz]);
    for (const sd of [-1, 1]) this.quad('wood', P(sd * w, 0, 0.06), P(sd * (w + 0.42), 0, 0.06), P(sd * (w + 0.42), h, 0.06), P(sd * w, h, 0.06), [nx, 0, nz], [[0, 0], [0.2, 0], [0.2, 0.6], [0, 0.6]]);
  },
};

// ---------------------------------------------------------------- laying a street

// A road through a place's middle (cx, cz), coming in along d1 and going on along d2 (unit ways). Returns where (t, off)
// is: t metres along it from the middle, off metres to its left (north of a road going east), and the yaw that faces the road.
export function street(cx, cz, d1, d2) {
  return (t, off) => {
    const d = t < 0 ? d1 : d2, nx = d[1], nz = -d[0], f = off > 0 ? -1 : 1;
    return { x: cx + d[0] * t + nx * off, z: cz + d[1] * t + nz * off, yaw: Math.atan2(nx * f, nz * f) };
  };
}
export const way = (ax, az, bx, bz) => { const l = Math.hypot(bx - ax, bz - az); return [(bx - ax) / l, (bz - az) / l]; };

const at = (k) => SITES[k];

// ---------------------------------------------------------------- Thornwick

// Thornwick, on the Gallows Road where the downs run out: plain folk behind a palisade, a gate each way the road runs. The
// inn under its sign of three apples, a market square with its pillar, stalls and well, ten roofs, a smith's lean-to, a
// wayside shrine with a lamp in it (nobody's letter on it), a watch platform by the gate that looks at the Gallowswood;
// outside, the fields, a sheepfold, ricks.
export function thornwick(K) {
  const c = at('thornwick'), cy = Y(c.x, c.z), st = street(c.x, c.z, way(1500, 900, 2400, 1800), way(2400, 1800, 3300, 2600));
  const R = 42, gates = [st(-R, 0), st(R, 0)];
  K.palisade(K.ring(c.x, c.z, R, 34, 0.1), 3, { gaps: gates.map((g) => [g.x, g.z, 4.4]) });
  gates.forEach((g, i) => {
    const t = i ? R : -R;
    for (const off of [-3.6, 3.6]) { const p = st(t, off); K.drum('bark', p.x, cy - 0.4, p.z, 0.3, 5, 7); K.lantern(st(t + (i ? -2.2 : 2.2), off * 1.25).x, st(t + (i ? -2.2 : 2.2), off * 1.25).z, 2.8, g.yaw + (off > 0 ? 0 : Math.PI)); }
    const a = st(t, -3.6), b = st(t, 3.6); K.beam('bark', [a.x, cy + 4.3, a.z], [b.x, cy + 4.3, b.z], 0.34);
    // (The gate's leaves, stood open against the palisade inside.)
    for (const off of [-3.9, 3.9]) { const q = st(t + (i ? -1.6 : 1.6), off * 1.02); K.box('wood', q.x, cy - 0.1, q.z, 1.5, 2.9, 0.09, g.yaw + Math.PI / 2 + (off > 0 ? 0.12 : -0.12)); }
    const sp = st(t + (i ? 9 : -9), 4.2); K.signpost(sp.x, sp.z, i ? [0.84, -2.3] : [-2.36, 0.8]);
  });
  // The inn, two floors, south-west of the road at the middle: its sign on a bracket, benches and a table out front, the
  // yard at its side with a stable lean-to, a trough and a rail.
  { const p = st(0, -17), F = K.frame(p.x, p.z, p.yaw);
    K.house(p.x, p.z, 7, 5, 5.4, p.yaw, 'wall_12', 'roof_2', { chimney: 5.6, lamp: 1, rise: 4.2 });
    K.box('stone', ...((q) => [q[0], cy + 5, q[1]])(F(-5.6, 0)), 0.6, 6.6, 0.6, p.yaw, { collide: false });
    K.wallLamp(...((q) => [q[0], cy + 2.6, q[1]])(F(-1.25, 5.03)), [Math.sin(p.yaw), Math.cos(p.yaw)]);
    const b0 = F(3.4, 5.05), b1 = F(3.4, 6.5); K.beam('iron', [b0[0], cy + 4.3, b0[1]], [b1[0], cy + 4.3, b1[1]], 0.07);
    const sg = F(3.4, 6.0); K.box('wood', sg[0], cy + 3.25, sg[1], 0.05, 0.9, 0.5, p.yaw, { collide: false });
    for (const [u, v] of [[-0.22, 3.55], [0.22, 3.55], [0, 3.85]]) for (const sd of [-1, 1]) { const q = F(3.4 + sd * 0.07, 6.0 + u); K.drum('fruit', q[0], cy + v, q[1], 0.17, 0.02, 7, { collide: false }); }
    for (const [u, w] of [[-4, 7.4], [4.6, 7.6]]) { const q = F(u, w); K.table(q[0], q[1], p.yaw, 1.1); const b = F(u, w + 1), b2 = F(u, w - 1); K.bench(b[0], b[1], p.yaw, 1); K.bench(b2[0], b2[1], p.yaw, 1); }
    const br = F(6.2, 5.6); K.barrel(br[0], br[1]); const br2 = F(6.9, 6.2); K.barrel(br2[0], br2[1], 0.4, 1.05);
    const lt = F(10.6, -1.5); K.leanTo(lt[0], lt[1], p.yaw + Math.PI / 2, 3.4, 2, 2.8, 'roof_2'); const tr = F(10.5, 3.6); K.trough(tr[0], tr[1], p.yaw, 1.2);
    const rk = F(10.8, 6.2); K.rack(rk[0], rk[1], p.yaw, 1.6, null, 1.1); const hy = F(13.2, -3.8); K.hayrick(hy[0], hy[1], 1.2, 1.9); const wp = F(-8.6, 1); K.woodpile(wp[0], wp[1], p.yaw + Math.PI / 2, 2, 1.3);
    K.spots.thornwick_inn = [2393.7, cy, 1806.3, 2.356]; }
  // The homes: [along the road, off it, wall, roof, half long, half deep].
  const homes = [[-32, 12.5, 'wall_14', 'roof_1', 5, 4.2], [-18, 12.5, 'wall_16', 'roof_3', 4.6, 4.2], [26, 12.5, 'wall_18', 'roof_2', 5, 4.4], [4, 31, 'wall_13', 'roof_1', 5.2, 4.2], [-21, 28.5, 'wall_19', 'roof_4', 4.4, 3.8],
    [-30, -13, 'wall_15', 'roof_3', 5, 4.4], [18, -12.5, 'wall_10', 'roof_1', 4.8, 4.2], [31, -12.5, 'wall_17', 'roof_4', 4.4, 4], [6, -32.5, 'wall_11', 'roof_3', 5, 4]];
  homes.forEach(([t, off, w, r, hx, hz], i) => {
    const p = st(t, off), sgn = Math.sign(off);
    K.house(p.x, p.z, hx, hz, 3.9 + (i % 3) * 0.45, p.yaw, w, r, { chimney: i % 2 ? -hx + 1.6 : hx - 1.6, lamp: i % 2 ? 1 : 0 });
    const q = st(t - hx - 1.3, off + sgn * 1.5), e = st(t + hx + 0.7, off - sgn * (hz - 1.2));
    if (i % 3 === 0) K.woodpile(q.x, q.z, p.yaw + Math.PI / 2, 1.2, 0.9); else if (i % 3 === 1) { K.barrel(q.x, q.z); K.crate(st(t - hx - 1.4, off + sgn * 2.6).x, st(t - hx - 1.4, off + sgn * 2.6).z, 0.36, 0.5); } else K.goods(q.x, q.z, 3, 0.8);
    K.barrel(e.x, e.z, 0.34, 0.9);
  });
  { const a = st(-12, 21.5), b = st(-12, 27.5); K.washing(a.x, a.z, b.x, b.z); const a2 = st(14, -20), b2 = st(22, -21.5); K.washing(a2.x, a2.z, b2.x, b2.z); }
  // The market square, north-east of the road: flagged, the pillar on its steps with the lantern at its head, the well, stalls.
  { const m = st(5, 16), my = cy;
    K.paving('flags', m.x, m.z, 11, 7.2, m.yaw);
    K.drum('stone', m.x, my - 0.4, m.z, 2.1, 0.75, 8); K.drum('stone', m.x, my + 0.35, m.z, 1.4, 0.32, 8, { collide: false });
    K.drum('stone', m.x, my + 0.67, m.z, 0.34, 3.3, 8, { r2: 0.24, collide: false }); K.drum('stone', m.x, my + 3.97, m.z, 0.5, 0.25, 8, { r2: 0.5, collide: false });
    K.drum('iron', m.x, my + 4.22, m.z, 0.2, 0.5, 4, { open: true, collide: false, r2: 0.26 }); K.cone('flame', m.x, my + 4.26, m.z, 0.12, 0.38, 4); K.cone('iron', m.x, my + 4.72, m.z, 0.34, 0.3, 4);
    const w = st(-7, 19); K.well(w.x, w.z, m.yaw);
    [[-3, 22.5, 'cloth_oat', 0], [13.5, 22, 'wall_13', 1], [15, 10.5, 'cloth_oat', 2], [5, 24, 'cloth_red', 3]].forEach(([t, off, cl, k], i) => { const p = st(t, off); K.stall(p.x, p.z, p.yaw + (i === 2 ? Math.PI : 0), cl, k); });
    const g = st(11, 15); K.goods(g.x, g.z, 4, 1.2); const ct = st(-9.5, 8.6); K.cart(ct.x, ct.z, m.yaw + 0.1, { load: 'cloth_oat' });
    const bn = st(8.5, 12.4); K.bench(bn.x, bn.z, m.yaw);
    K.spots.thornwick_cross = [2408, cy, 1791, -0.785]; }
  // The smith's lean-to against the last house by the east gate, his fire and his block; the shrine at the square's back: a
  // stone house the height of a child, a lamp burning in it, what people have left before it.
  { const p = st(34.6, 9.6); K.leanTo(p.x, p.z, p.yaw, 2.6, 2, 2.8, 'roof_2'); const f = st(36, 11.2); K.box('stone', f.x, cy - 0.2, f.z, 0.65, 1.1, 0.6, p.yaw); K.cone('flame', f.x, cy + 0.85, f.z, 0.33, 0.5, 6);
    const a = st(33.6, 7.6); K.stump(a.x, a.z, 0.3, 0.6); K.box('iron', a.x, cy + 0.6, a.z, 0.3, 0.2, 0.12, p.yaw, { collide: false }); const tr = st(31.4, 6.6); K.trough(tr.x, tr.z, p.yaw, 0.6);
    const s = st(16, 31.5), F = K.frame(s.x, s.z, s.yaw);
    K.box('stone', s.x, cy - 0.3, s.z, 0.75, 1.9, 0.6, s.yaw); K.gable('roof_1', 'stone', s.x, cy + 1.6, s.z, 0.75, 0.6, 0.6, s.yaw, 0.2);
    const n = F(0, 0.62), N = (u, v) => [F(u, 0.62)[0], cy + v, F(u, 0.62)[1]];
    K.quad('water', N(-0.4, 0.75), N(0.4, 0.75), N(0.4, 1.45), N(-0.4, 1.45), [Math.sin(s.yaw), 0, Math.cos(s.yaw)]);
    K.cone('flame', n[0] + Math.sin(s.yaw) * 0.1, cy + 0.8, n[1] + Math.cos(s.yaw) * 0.1, 0.07, 0.24, 4);
    for (const u of [-0.6, 0, 0.55]) { const q = F(u, 1.1); K.drum('cloth_oat', q[0], cy - 0.02, q[1], 0.14, 0.14, 6, { collide: false }); } }
  // The watch platform inside the east gate, looking down the road into the Gallowswood: four legs, a floor with a rail, a
  // roof of boards, the ladder up.
  { const p = st(36.5, -8), F = K.frame(p.x, p.z, p.yaw), H = 6.2;
    for (const [u, w] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) { const q = F(u, w); K.drum('bark', q[0], cy - 0.4, q[1], 0.17, H + 2.9, 6, { collide: false }); }
    for (const [u0, w0, u1, w1] of [[-1.5, -1.5, 1.5, 1.5], [1.5, -1.5, -1.5, 1.5]]) { const a = F(u0, w0), b = F(u1, w1); K.beam('wood', [a[0], cy + 0.3, a[1]], [b[0], cy + H - 0.3, b[1]], 0.1); }
    K.box('wood', p.x, cy + H, p.z, 2, 0.14, 2, p.yaw, { collide: false });
    for (const [u, w, hx, hz] of [[0, -1.95, 2, 0.05], [0, 1.95, 2, 0.05], [-1.95, 0, 0.05, 2], [1.95, 0, 0.05, 2]]) { const q = F(u, w); K.box('wood', q[0], cy + H + 0.14, q[1], hx, 0.95, hz, p.yaw, { collide: false }); }
    K.quad('roof_3', ...[[-2.4, -2.4, 2.3], [2.4, -2.4, 2.3], [2.4, 2.4, 2.9], [-2.4, 2.4, 2.9]].map(([u, w, v]) => { const q = F(u, w); return [q[0], cy + H + v, q[1]]; }));
    const l0 = F(0, 4), l1 = F(0, 2.05); K.ladder(l0[0], l0[1], l1[0], cy + H + 0.1, l1[1]);
    K.collide(p.x, p.z, 1.7, 1.7, p.yaw, cy + 2.4); }
  // Out past the palisade: two fields under corn and stubble, the sheepfold, ricks, a cart on the headland.
  for (const [dx, dz, w, d, sto] of [[-52, 44, 15, 10, true], [12, -66, 17, 9, false]]) {
    const x = c.x + dx, z = c.z + dz;
    K.fence([[x - w, z - d], [x + w, z - d], [x + w, z + d], [x - w, z + d], [x - w, z - d + 3]]);
    if (sto) for (let i = 0; i < 15; i++) { const px = x - w + 3 + (i % 5) * 6 + hash2(i, 2) * 2, pz = z - d + 3 + Math.floor(i / 5) * 6 + hash2(i, 5) * 2; K.cone('cloth_oat', px, Y(px, pz) - 0.1, pz, 0.55, 1.3, 6, i); }
    else { K.hayrick(x - 8, z + 2, 1.6, 2.6); K.hayrick(x - 4, z - 3, 1.4, 2.2); K.cart(x + 6, z + 1, 0.5, { load: 'cloth_oat' }); }
  }
  { const x = c.x + 64, z = c.z - 14; K.fence([[x - 8, z - 6], [x + 8, z - 6], [x + 8, z + 6], [x - 8, z + 6], [x - 8, z - 3]], 1); K.leanTo(x + 4, z - 4.2, 0, 2.6, 1.4, 1.9, 'roof_3'); K.trough(x - 3, z + 3.5, 0.2, 1); K.hayrick(x + 11, z + 9, 1.3, 2); }
  K.spots.thornwick_gate = [2369.6, cy, 1776.6, 0.785];
}

// ---------------------------------------------------------------- Cinderford

// Cinderford, on the Vigil Road in the Deepwood's edge: the last free hearths before the Ashen Waste. A stony stream bed
// with a ford and a plank bridge beside it; seven roofs; a stockade on the side that looks west, a watchtower and a beacon
// laid ready at its gate; the charcoal burners' clamps smoking behind; the tents and carts of people come out of the Waste;
// a rough graveyard that's filling. (Nobody's letter here: it's 2.9 km from Blackvigil.)
export function cinderford(K) {
  const c = at('cinderford'), cy = Y(c.x, c.z), st = street(c.x, c.z, way(-1400, -60, -2100, -200), way(-2100, -200, -2900, -420));
  // The stream: a bed of stones north to south, a trickle down its middle; slabs where the road fords it, the bridge south of them.
  const sx = c.x + 24, fz = st(-24.5, 0).z;
  for (let i = -5; i <= 5; i++) {
    const z = c.z + i * 8, x = sx + Math.sin(i * 1.3) * 1.6;
    K.paving('rubble', x, z, 3.1, 4.2, Math.sin(i) * 0.15, 0.04);
    if (Math.abs(z - fz) > 5 && Math.abs(z - fz - 9) > 3) { K.paving('lake', x + Math.sin(i * 2.1) * 0.8, z, 0.7, 4.3, Math.sin(i) * 0.2, 0.075); for (const sd of [-1, 1]) K.rock('rubble', x + sd * (2.4 + hash2(i, sd + 2)), z + hash2(i, sd + 5) * 5 - 2.5, 0.5 + hash2(i, sd + 7) * 0.6, 0.6, { collide: false }); }
  }
  for (const dx of [-2.2, 0, 2.2]) K.paving('stone', sx + dx, fz + dx * 0.2, 1.0, 2.4, 0.1 + dx * 0.05, 0.085);
  K.bridge(sx - 5, fz + 9, sx + 5, fz + 9.3, 1.0, { up: 0.32 });
  // The homes: [along the road (west is +), off it (south is +), wall, roof].
  const homes = [[-12, -12, 'wall_18', 'roof_4'], [4, -12.5, 'wall_17', 'roof_2'], [19, -12, 'wall_20', 'roof_4'], [-9, 12.5, 'wall_15', 'roof_2'], [9, 12.5, 'wall_18', 'roof_4'], [21.5, 13, 'wall_17', 'roof_3'], [0, 29, 'wall_20', 'roof_2']];
  homes.forEach(([t, off, w, r], i) => {
    const p = st(t, off), hx = 4.4 + (i % 2) * 0.4, sg = Math.sign(off);
    K.house(p.x, p.z, hx, 3.8, 3.4 + (i % 3) * 0.3, p.yaw, w, r, { chimney: i % 2 ? 2.6 : -2.6, lamp: i % 3 === 0 ? 1 : 0, door: 'door_3' });
    const q = st(t + hx + 1.2, off + sg * 1.2); if (i % 2) K.woodpile(q.x, q.z, p.yaw + Math.PI / 2, 1.3, 1); else { K.barrel(q.x, q.z); K.sack(st(t + hx + 1.3, off + sg * 2.2).x, st(t + hx + 1.3, off + sg * 2.2).z); }
  });
  { const w = st(0, 9); K.well(w.x, w.z, 0.3, { roof: 'roof_4', stone: 'rubble' }); const l = st(-3, -6); K.lantern(l.x, l.z, 2.7, 2); const l2 = st(15, 6); K.lantern(l2.x, l2.z, 2.7, 0.4);
    const r = st(13, -19.5); K.rack(r.x, r.z, 0.3, 1.5, 'cloth_oat', 1.6); const a = st(-14, 19), b = st(-7, 20.5); K.washing(a.x, a.z, b.x, b.z); }
  // The stockade, round the west from the north side to the south, and the gate in it where the road goes out.
  const g = st(41, 0), pts = [];
  for (let a = 95; a <= 266; a += 9) pts.push([c.x + Math.cos(a * Math.PI / 180) * 41, c.z + Math.sin(a * Math.PI / 180) * 41]);
  K.palisade(pts, 3.3, { gaps: [[g.x, g.z, 4.2]] });
  for (const off of [-3.5, 3.5]) { const p = st(41, off); K.drum('bark', p.x, cy - 0.4, p.z, 0.32, 5.2, 7); K.spike('bark', p.x, cy + 4.7, p.z, 0.3, 0.8, 6); }
  for (let i = 0; i < 12; i++) { const a = (150 + i * 6.5) * Math.PI / 180, x = c.x + Math.cos(a) * 44.5, z = c.z + Math.sin(a) * 44.5; if (Math.hypot(x - g.x, z - g.z) < 6) continue; K.spike('bark', x, Y(x, z) - 0.2, z, 0.15, 1.9, 4, a, [Math.cos(a) * 0.5, Math.sin(a) * 0.5]); }
  // The watchtower inside the gate, south of the road: a stone foot, a timber head that looks over the stockade, the ladder;
  // and north of the road the beacon: a cairn with the iron on it and the wood laid in, unlit.
  { const p = st(34.5, 9), F = K.frame(p.x, p.z, 0);
    K.box('rubble', p.x, cy - 0.4, p.z, 2.1, 4, 2.1, 0.2); K.box('wood', p.x, cy + 3.6, p.z, 2.5, 0.18, 2.5, 0.2, { collide: false });
    for (const [u, w] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]]) { const q = K.frame(p.x, p.z, 0.2)(u, w); K.box('bark', q[0], cy + 3.6, q[1], 0.13, 3.4, 0.13, 0.2, { collide: false }); }
    for (const [u, w, hx, hz] of [[0, -2.3, 2.3, 0.05], [0, 2.3, 2.3, 0.05], [-2.3, 0, 0.05, 2.3], [2.3, 0, 0.05, 2.3]]) { const q = K.frame(p.x, p.z, 0.2)(u, w); K.box('wood', q[0], cy + 3.78, q[1], hx, 1.0, hz, 0.2, { collide: false }); }
    K.drum('roof_4', p.x, cy + 7, p.z, 3.6, 0.01, 4, { r2: 3.6, turn: 0.2 + Math.PI / 4, open: true, collide: false }); K.cone('roof_4', p.x, cy + 7, p.z, 3.7, 2.2, 4, Math.PI / 4 - 0.2);
    const l = F(4.6, 0.6); K.ladder(l[0], l[1], p.x + 2.45, cy + 3.8, p.z + 0.4);
    const b = st(35.5, -9.5); K.heap('rubble', b.x, b.z, 2.3, 1.7, 8); K.drum('iron', b.x, cy + 1.7, b.z, 0.5, 0.7, 8, { r2: 0.95, open: true, collide: false });
    for (let i = 0; i < 4; i++) { const a = i * 0.8; K.beam('bark', [b.x + Math.cos(a) * 0.6, cy + 2.0, b.z + Math.sin(a) * 0.6], [b.x - Math.cos(a) * 0.5, cy + 3.0, b.z - Math.sin(a) * 0.5], 0.13); }
    K.spots.cinderford_watch = [-2129, cy, -201.5, 1.571]; }
  // The clamps: three heaps of turf over slow fires, a red eye at each one's vent; cordwood stacked to feed them, the black
  // sacks, the burners' hut of boards.
  [[-6, -37, 2.7], [5, -39.5, 2.4], [15, -36, 2.9]].forEach(([t, off, r], i) => {
    const p = st(t, off); K.heap('dark:rubble', p.x, p.z, r, r * 0.85, 9);
    K.cone('flame', p.x + 0.2, cy + r * 0.82, p.z, 0.22, 0.35, 5); K.cone('flame', p.x + Math.cos(i * 2) * r * 0.8, cy + r * 0.3, p.z + Math.sin(i * 2) * r * 0.8, 0.14, 0.2, 4);
  });
  { const w = st(-14, -30); K.woodpile(w.x, w.z, 0.2, 2.4, 1.4, 0.6); const w2 = st(-15, -33); K.woodpile(w2.x, w2.z, 0.25, 2, 1.1, 0.6); const h = st(24, -30); K.leanTo(h.x, h.z, h.yaw, 2.4, 1.6, 2.3, 'roof_4');
    for (let i = 0; i < 6; i++) { const q = st(10 + (i % 3) * 0.8, -30.5 - Math.floor(i / 3) * 0.7); K.drum('dark:rubble', q.x, cy - 0.05, q.z, 0.34, 0.6, 6, { r2: 0.2, collide: false, turn: i }); }
    const ct = st(-2, -30.5); K.cart(ct.x, ct.z, 0.5, { load: 'dark:rubble', len: 1.3 });
    K.spots.cinderford_kiln = [-2098, cy, -229, 0]; }
  // The camp over the ford: tents, the carts they came on, what they brought, one fire for all of them.
  { for (const [t, off, yaw, cl] of [[-30.5, 22.5, 0.4, 'cloth_oat'], [-39, 24, -0.5, 'wall_13'], [-43.5, 14, 1.2, 'cloth_oat'], [-34, 31.5, 2.2, 'cloth_oat']]) { const p = st(t, off); K.tent(p.x, p.z, yaw, 1.7, 1.3, 1.6, cl); }
    const f = st(-36.5, 19.5); K.campfire(f.x, f.z, true); const c1 = st(-29, 13.5); K.cart(c1.x, c1.z, 0.2, { load: 'cloth_oat' }); const c2 = st(-41, 30); K.cart(c2.x, c2.z, 2.4, { len: 1.2 });
    const g1 = st(-33, 26.5); K.goods(g1.x, g1.z, 5, 1.3); const g2 = st(-41, 19); K.goods(g2.x, g2.z, 3, 0.9); const r = st(-45, 21.5); K.rack(r.x, r.z, 1.4, 1.2, 'cloth_oat', 1.5);
    K.spots.cinderford_camp = [-2067, cy, -180, 3.142]; }
  // The graveyard, inside the stockade on the south-west: stones for the first of them, boards and bare mounds for the rest.
  { const x = c.x - 18, z = c.z + 31; K.graves(x, z, 0.2, 5.5, 2.6, 'rubble', 2.3);
    for (let i = 0; i < 5; i++) { const px = x - 6 + i * 2.7, pz = z + 6.2 + (i % 2) * 0.5; K.box('dark:rubble', px, cy - 0.2, pz, 0.45, 0.4, 0.95, 0.2, { collide: false }); K.box('wood', px, cy - 0.1, pz - 1.15, 0.2, 0.75, 0.03, 0.2, { collide: false }); }
    K.fence([[x - 8.5, z - 4.5], [x + 8.5, z - 4.5]], 0.9); K.beam('wood', [x + 7.2, cy, z + 5], [x + 7.6, cy + 1.3, z + 5.3], 0.05); }
  { const s = st(-17, -5.2); K.signpost(s.x, s.z, [1.37, -1.8]); }
}

// ---------------------------------------------------------------- the lesser places

export function lesser(K) {
  // The Moor Wayhouse, off the Barrow Track: a drovers' house, half of it still roofed and lived in, the other wing open to
  // the sky; the stable, the yard's wall, the well, peat cut and stacked, a post at the track to say it's there.
  { const s = at('wayhouse'), y = Y(s.x, s.z), yaw = 0.727, F = K.frame(s.x, s.z, yaw), V = (u, w, v = 0) => { const q = F(u, w); return [q[0], y + v, q[1]]; };
    const h = F(-3, 0); K.house(h[0], h[1], 6, 4, 3.4, yaw, 'wall_16', 'roof_1', { chimney: -4.4, lamp: 1 });
    const wf = F(8, 4), wb = F(8, -4), we = F(13, 0);
    K.pierced('rubble', wf[0], wf[1], yaw, 5, 3.6, 0.7, [{ u: -1.5, w: 0.75, y0: 0, y1: 2.1 }, { u: 2.4, w: 0.5, y0: 1, y1: 2 }], { ruin: true, y });
    K.pierced('rubble', wb[0], wb[1], yaw, 5, 3.6, 0.7, [{ u: 1, w: 0.5, y0: 1, y1: 2 }], { ruin: true, y }); K.pierced('rubble', we[0], we[1], yaw + Math.PI / 2, 4, 4.6, 0.7, [], { ruin: true, y });
    K.beam('dark:wood', V(4, -3, 3.4), V(11, 2, 0.3), 0.26); K.beam('dark:wood', V(5, 3, 3.2), V(10, -2.5, 0.25), 0.26);
    const lt = F(-12.6, 1.2); K.leanTo(lt[0], lt[1], yaw, 3.2, 2.2, 2.7, 'roof_1'); const tr = F(-12.6, 4.6); K.trough(tr[0], tr[1], yaw, 1.2); const hr = F(-17, -3); K.hayrick(hr[0], hr[1], 1.4, 2.2);
    for (const [a, b] of [[[-17.5, 6], [-17.5, 13]], [[-17.5, 13], [-6, 14.5]], [[1, 14.5], [15, 13]], [[15, 13], [15, 5]]]) K.wall('rubble', ...F(...a), ...F(...b), 0.6, 1.2, { ruin: true });
    const wl = F(4.5, 9.5); K.well(wl[0], wl[1], yaw, { roof: 'roof_1', stone: 'rubble' });
    for (const [u, w, l] of [[10, 9, 1.5], [10.6, 10.6, 1.2], [-9, 10.5, 1.3]]) { const q = F(u, w); K.box('dark:rubble', q[0], y - 0.1, q[1], l, 0.9, 0.5, yaw + 0.1); }
    const ct = F(-8, 7.2); K.cart(ct[0], ct[1], yaw + 0.4, { load: 'dark:rubble' }); const bn = F(-5.6, 5); K.bench(bn[0], bn[1], yaw, 0.9); const sp = F(-2.5, 26.3); K.signpost(sp[0], sp[1], [yaw + Math.PI, yaw + Math.PI / 2 + 0.1]);
    const gp = F(-2.5, 14.5); K.lantern(gp[0], gp[1], 2.7, yaw);
    K.spots.wayhouse_door = [...V(-0.6, 7), yaw]; }
  // The Old Toll, on the Gallows Road past Thornwick: the tollhouse burnt to its walls, the bar across the road broken in
  // two, the strongbox dragged out and emptied, a cart on its side, two graves somebody took the time to dig.
  { const s = at('oldtoll'), y = Y(s.x, s.z), yaw = -0.638, F = K.frame(s.x, s.z, yaw), V = (u, w, v = 0) => { const q = F(u, w); return [q[0], Y(q[0], q[1]) + v, q[1]]; }, D = 'dark:rubble', C = 'dark:wood';
    const wf = F(0, 8), wb = F(0, 0), wl = F(-5, 4), wr = F(5, 4);
    K.pierced(D, wf[0], wf[1], yaw, 5, 3.8, 0.6, [{ u: 0, w: 0.8, y0: 0, y1: 2.2 }, { u: -3, w: 0.5, y0: 1, y1: 2.1 }, { u: 3, w: 0.5, y0: 1, y1: 2.1 }], { ruin: true, y });
    K.pierced(D, wb[0], wb[1], yaw, 5, 3.8, 0.6, [], { ruin: true, y }); K.pierced(D, wl[0], wl[1], yaw + Math.PI / 2, 4, 4.8, 0.6, [], { ruin: true, y }); K.pierced(D, wr[0], wr[1], yaw + Math.PI / 2, 4, 4.8, 0.6, [{ u: 0, w: 0.5, y0: 1, y1: 2.1 }], { ruin: true, y });
    const ch = F(-4, 1); K.box('stone', ch[0], y - 0.3, ch[1], 0.7, 6.4, 0.7, yaw, { collide: false });
    K.beam(C, V(-4, 1.5, 3.6), V(3.5, 6, 0.3), 0.26); K.beam(C, V(4, 1, 3.2), V(-2, 6.5, 0.3), 0.26); K.beam(C, V(-1, 0.6, 0.25), V(3, 7.2, 0.3), 0.22);
    // (The bar: its post and stub this side of the road, the other post over the way, the long end thrown on the verge.)
    const p1 = F(-6, 20.3), p2 = F(-6, 27.7);
    K.box('wood', p1[0], Y(...p1) - 0.3, p1[1], 0.16, 1.6, 0.16, yaw); K.box('wood', p2[0], Y(...p2) - 0.3, p2[1], 0.16, 1.5, 0.16, yaw);
    K.beam('cloth_red', V(-6, 20.3, 1.15), V(-6.2, 21.9, 2.3), 0.13); K.beam('cloth_red', V(-11, 18.2, 0.12), V(-8, 19.9, 0.12), 0.13); K.beam('cloth_oat', V(-8, 19.9, 0.12), V(-6.7, 20.7, 0.14), 0.13);
    const bx = F(0.5, 14.8); K.box('wood', bx[0], Y(...bx) - 0.05, bx[1], 0.6, 0.6, 0.4, yaw + 0.5, { top: 'water' }); K.quad('wood', V(0.1, 15.5, 0.55), V(1.2, 15, 0.55), V(1.35, 15.3, 1.15), V(0.25, 15.8, 1.15));
    const ct = F(8, 16.5); K.cart(ct[0], ct[1], yaw + 0.3, { wreck: true }); for (const [u, w] of [[10.5, 14], [6.5, 13.5], [9, 12]]) { const q = F(u, w); K.sack(q[0], q[1], 0.3); }
    const lt = F(9.5, 3); K.box(D, lt[0], y - 0.3, lt[1], 0.3, 2.2, 3, yaw); K.beam(C, V(6, 5.5, 2.3), V(11.5, 1, 0.2), 0.2);
    for (const u of [-11, -8.6]) { const q = F(u, 6); K.box(D, q[0], Y(...q) - 0.2, q[1], 0.45, 0.42, 1, yaw, { collide: false }); const g = F(u, 4.6); K.gravestone(g[0], g[1], yaw, 0.6, 'rubble'); }
    const wq = F(-8, 12.5); K.well(wq[0], wq[1], yaw, { roof: false, stone: 'rubble' }); const sp = F(5, 20.3); K.signpost(sp[0], sp[1], [yaw + Math.PI / 2, yaw - Math.PI / 2]);
    K.spots.oldtoll_bar = [...V(-3.2, 18.6), yaw]; }
  // Ossery Quarry, beside the Abbey Road: the pale face the abbey was cut from, in three benches; blocks squared and left,
  // drums for pillars nobody came for, the crane and its wheel, the cutters' hut, spoil in heaps.
  { const s = at('quarry'), y = Y(s.x, s.z), yaw = -Math.PI / 4, F = K.frame(s.x, s.z, yaw), S = 'pale:stone';
    for (const [u, w, hx, hz, hh] of [[0, -17, 17, 3.2, 3.4], [1, -21.5, 14.5, 3, 6.8], [-2, -26, 11.5, 3.4, 10.4], [-18.5, -12.5, 3, 6, 4.8], [18.5, -13.5, 3.2, 5, 6], [15, -22, 4, 4, 9]]) {
      const q = F(u, w); let lo = 1e9; for (const [a, b] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) lo = Math.min(lo, Y(...F(u + a, w + b)));
      K.box(S, q[0], lo - 0.5, q[1], hx, y + hh - lo + 0.5, hz, yaw, { top: 'pale:rubble' });
    }
    for (let i = 0; i < 14; i++) { const q = F(-11 + hash2(i, 3) * 20, -12 + hash2(i, 5) * 9), k = hash2(i, 7); K.box(S, q[0], Y(...q) - 0.1, q[1], 0.5 + k * 0.5, 0.5 + hash2(i, 9) * 0.4, 0.4 + k * 0.3, yaw + k * 2); }
    for (let i = 0; i < 6; i++) { const q = F(9 + (i % 3) * 1.5, -5 - (i > 2 ? 0.5 : 0)); K.box(S, q[0], y - 0.05 + (i > 2 ? 0.72 : 0), q[1], 0.7, 0.72, 0.5, yaw, { collide: i < 3 }); }
    for (const [u, w, t] of [[-10, 2, 0], [-8.2, 3.4, 1], [-11.5, 4.5, 2]]) { const q = F(u, w); K.drum(S, q[0], y - 0.1, q[1], 0.75, 1.1, 10, { turn: t }); }
    // (The crane: a mast, its jib out over the bench's foot, a block on the rope, the wheel that winds it.)
    { const m = F(-5, -9.5), top = [m[0], y + 7.4, m[1]], j = F(-1.2, -12.8), jib = [j[0], y + 8.8, j[1]];
      K.box('wood', m[0], y - 0.3, m[1], 0.16, 7.7, 0.16, yaw); K.beam('wood', [m[0], y + 4, m[1]], jib, 0.16); K.beam('wood', top, jib, 0.07);
      for (const [u, w] of [[-7.4, -8], [-4, -6.6]]) { const q = F(u, w); K.beam('wood', [q[0], y, q[1]], [m[0], y + 5, m[1]], 0.12); }
      K.beam('cloth_oat', jib, [j[0], y + 2.9, j[1]], 0.04); K.box(S, j[0], y + 1.9, j[1], 0.55, 1.0, 0.45, yaw + 0.3, { collide: false });
      const wq = F(-6.4, -9.9); K.wheel(wq[0], y + 1.65, wq[1], yaw + Math.PI / 2, 1.6); K.collide(wq[0], wq[1], 0.3, 1.5, yaw, y + 3.2); }
    const h = F(12, 5); K.house(h[0], h[1], 3.4, 2.8, 2.6, yaw - Math.PI / 2, 'wall_17', 'roof_3', { chimney: 2, lamp: 1, door: 'door_3' });
    const lt = F(13.5, -1.2); K.leanTo(lt[0], lt[1], yaw - Math.PI / 2, 2, 1.4, 2.2, 'roof_3'); const rk = F(7.6, 0.4); K.rack(rk[0], rk[1], yaw + 0.3, 1.2, null, 1.3);
    const ct = F(-2, 6); K.cart(ct[0], ct[1], yaw - Math.PI / 2 + 0.2, { load: S, len: 1.3 });
    for (const [u, w, r] of [[-15, 8, 2.6], [-12, 12.5, 1.9], [5, 14, 2.2]]) { const q = F(u, w); K.heap('pale:rubble', q[0], q[1], r, r * 0.6, 8); }
    const cf = F(5, 4.5); K.campfire(cf[0], cf[1], false); const st1 = F(3.6, 6.2); K.stump(st1[0], st1[1], 0.3, 0.45);
    K.paving('wood', ...F(0, -13.6), 1.1, 2.4, yaw, 0.1);
    const sp = F(6.8, 6.6); K.spots.quarry_hut = [sp[0], Y(...sp), sp[1], yaw - Math.PI / 2 + 0.4]; }
  // The Howling Mouth, up past Frostwatch: where the wind comes out of the hill. A horseshoe of rimed rock with an arch of
  // it standing across the back, ice hung from it; cairns down the path, a post with a warning on it, old bones frozen
  // where they fell, and a climbers' camp nobody came back to. (Its middle is left bare for the way down.)
  { const s = at('deepsmouth'), y = Y(s.x, s.z), FR = 'frost:rubble';
    for (let i = 0; i < 11; i++) {
      const a = (-78 + i * 15.6) * Math.PI / 180, r = 17.5 + hash2(i, 3) * 4, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r, big = 3 + hash2(i, 5) * 2.4;
      K.rock(FR, x, z, big, 4.5 + hash2(i, 7) * 5 + (Math.abs(i - 5) < 3 ? 3 : 0), { turn: a, y: Math.min(Y(x, z), y) - 1.5 });
      if (i % 2) K.rock(FR, x + Math.cos(a) * 5, z + Math.sin(a) * 5, big * 1.3, 8 + hash2(i, 9) * 4, { turn: a + 1, y: Math.min(Y(x, z), y) - 1.5 });
    }
    // (The arch: two stacks of rock and a slab across them, twelve metres back from the middle.)
    for (const sd of [-1, 1]) { K.rock(FR, s.x + 12.5, s.z + sd * 6.4, 2.3, 5.4, { y: y - 1, turn: sd }); K.rock(FR, s.x + 12.7, s.z + sd * 6.1, 1.9, 3.6, { y: y + 5.2, turn: sd + 2, collide: false }); }
    K.box(FR, s.x + 12.6, y + 9.2, s.z, 1.7, 1.5, 8.4, 0.06, { collide: false }); K.rock(FR, s.x + 12.4, s.z - 2, 2.2, 1.6, { y: y + 10.4, collide: false });
    K.quad('obsidian', [s.x + 15.5, y - 0.2, s.z - 5], [s.x + 15.5, y - 0.2, s.z + 5], [s.x + 15.5, y + 9.4, s.z + 5], [s.x + 15.5, y + 9.4, s.z - 5], [-1, 0, 0]);
    for (let i = 0; i < 11; i++) K.spike('ice', s.x + 12 + hash2(i, 2) * 1.2, y + 9.25, s.z - 6.4 + i * 1.28, 0.2, -(0.7 + hash2(i, 4) * 2.2), 4, i);
    for (let i = 0; i < 9; i++) { const a = 1.9 + i * 0.32, r = 11 + hash2(i, 12) * 5, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r; if (i % 3 !== 1) K.spike('ice', x, Y(x, z) - 0.2, z, 0.3 + hash2(i, 13) * 0.3, 0.9 + hash2(i, 14) * 1.6, 4, a); }
    for (const [dx, dz, r] of [[-17, -8, 1.0], [-25, 7.5, 0.8], [-31, -6.5, 1.1], [-11.5, -13.5, 0.7], [-38, 6, 0.9]]) if (routeDist(s.x + dx, s.z + dz).d > 3.2) K.cairn(s.x + dx, s.z + dz, r, r * 1.35, FR);
    { const px = s.x - 19, pz = s.z + 5.2, py = Y(px, pz); K.box('bark', px, py - 0.4, pz, 0.11, 3.5, 0.11, 0.4); K.rock('pale:stone', px, pz, 0.24, 0.28, { y: py + 3.05, collide: false });
      K.quad('cloth_red', [px + 0.1, py + 2.7, pz], [px + 0.95, py + 2.6, pz + 0.2], [px + 0.9, py + 1.5, pz + 0.25], [px + 0.1, py + 1.75, pz], null, [[0, 0], [0.3, 0], [0.3, 0.4], [0, 0.4]]); K.beam('pale:stone', [px - 0.5, py + 2.2, pz], [px + 0.5, py + 1.9, pz - 0.2], 0.07); }
    { const bx = s.x - 9, bz = s.z - 17, by = Y(bx, bz); for (let i = 0; i < 6; i++) { const x = bx + i * 0.8; K.beam('pale:stone', [x, by, bz - 1.2], [x + 0.2, by + 1.3 - i * 0.1, bz - 0.5], 0.1); K.beam('pale:stone', [x + 0.2, by + 1.3 - i * 0.1, bz - 0.5], [x + 0.3, by + 0.9, bz + 0.5], 0.09); } K.beam('pale:stone', [bx - 0.8, by + 0.25, bz - 0.4], [bx + 5.2, by + 0.2, bz - 0.2], 0.2); K.rock('pale:stone', bx - 1.5, bz - 0.4, 0.5, 0.5, { collide: false }); }
    K.tent(s.x - 13, s.z + 15, 0.5, 1.6, 1.2, 1.5); K.tent(s.x - 19.5, s.z + 13.5, -0.6, 1.5, 1.2, 1.4, 'wall_13'); K.campfire(s.x - 15.5, s.z + 10.8, false);
    K.crate(s.x - 10.6, s.z + 12.6, 0.36, 0.4); K.rack(s.x - 9.6, s.z + 17.4, 0.9, 1.2, 'cloth_oat', 1.4); K.barrel(s.x - 17.8, s.z + 17, 0.3, 0.8);
    K.spots.deepsmouth_camp = [s.x - 13, Y(s.x - 13, s.z + 11), s.z + 11, -0.4]; }
  // Ravens' Tor, out on the fell: a stack of weathered rock in three lifts with a cap stone leaning on its head. A stair cut
  // round it goes up to the first ledge, where a hermit had a cell under the overhang; the ravens' nest is on the top.
  { const s = at('tor'), yc = Y(s.x, s.z), FR = 'frost:rubble', top = yc + 7.5;
    K.drum(FR, s.x, yc - 6, s.z, 9.2, 13.5, 9, { r2: 8, collide: false, turn: 0.3 });
    for (const yaw of [0, Math.PI / 4]) K.collide(s.x, s.z, 6.3, 6.3, yaw, top - 0.1);
    K.deck([0, 1, 2, 3].map((q) => [s.x, s.z, 5.9, 5.9, q * Math.PI / 8, top]));
    K.drum(FR, s.x + 1.3, top, s.z - 1, 5.6, 5.6, 8, { r2: 4.8, turn: 1 }); K.drum(FR, s.x + 0.6, top + 5.6, s.z - 1.6, 3.9, 4.4, 7, { r2: 3.1, turn: 2, collide: false });
    K.rock(FR, s.x + 1.2, s.z - 1.2, 3.3, 3, { y: top + 9.6, collide: false, sx: 1.3 });
    // (The stair: twenty steps up the west and north-west side, each a block set against the rock.)
    const rects = [], n = 20, y0 = Y(s.x - 10.2, s.z) - 0.1, rise = (top - y0) / n;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + i * 0.092, x = s.x + Math.cos(a) * (10.2 - i * 0.07), z = s.z + Math.sin(a) * (10.2 - i * 0.07), ty = y0 + (i + 1) * rise;
      K.box('stone', x, Math.min(Y(x, z), ty) - 1.6, z, 1.15, ty - Math.min(Y(x, z), ty) + 1.6, 0.52, -a, { collide: false });
      rects.push([x, z, 1.15, 0.52, -a, ty]);
    }
    K.deck(rects);
    for (const [dx, dz, r, hh] of [[-13, 9, 3.2, 3.6], [9, 10.5, 4, 5], [12.5, -6, 3.4, 4.2], [-4, -13.5, 2.6, 2.4], [15, 3, 2.2, 2.6], [-15, -7, 1.8, 1.8]]) K.rock(FR, s.x + dx, s.z + dz, r, hh, { turn: dx });
    // (The cell: a slab roof on two stones in the lee of the second lift, a dead fire, a bowl.)
    { const cx = s.x - 4.6, cz = s.z + 3.4; for (const sd of [-1, 1]) K.box(FR, cx + sd * 1.1, top, cz + sd * 0.5, 0.25, 1.5, 0.9, 0.6, { collide: false }); K.box(FR, cx, top + 1.5, cz, 1.7, 0.25, 1.3, 0.6, { collide: false });
      K.drum('rubble', cx - 1.2, top, cz + 2.3, 0.4, 0.16, 7, { collide: false, lid: 'dark:rubble' }); K.drum('wood', cx + 1.2, top, cz + 1.9, 0.16, 0.1, 6, { collide: false, lid: 'water' }); }
    // (The nest: sticks in a ring on the cap stone, three eggs.)
    { const nx = s.x + 1.4, nz = s.z - 1.4, ny = top + 13.2; K.drum('bark', nx, ny, nz, 1.2, 0.45, 8, { r2: 1.6, open: true, collide: false }); K.disc('bark', nx, ny + 0.12, nz, 1.25, 8);
      for (let i = 0; i < 9; i++) { const a = i * 0.7; K.beam('bark', [nx + Math.cos(a) * 1.7, ny + 0.2 + (i % 3) * 0.1, nz + Math.sin(a) * 1.7], [nx + Math.cos(a + 2) * 1.5, ny + 0.5, nz + Math.sin(a + 2) * 1.5], 0.07); }
      for (let i = 0; i < 3; i++) K.rock('pale:stone', nx - 0.3 + i * 0.3, nz + (i % 2) * 0.25, 0.14, 0.16, { y: ny + 0.15, collide: false }); }
    K.cairn(s.x - 17, s.z + 1.5, 0.8, 1.2, FR); K.banner(s.x - 16, s.z - 3, 3, 2, 'cloth_oat', { w: 0.45, len: 1 });
    K.spots.tor_foot = [s.x - 14.5, Y(s.x - 14.5, s.z + 2.5), s.z + 2.5, -Math.PI / 2]; }
}
