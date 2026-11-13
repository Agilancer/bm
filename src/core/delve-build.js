// What's seen of the party dungeons (src/core/dungeon.js DELVES): each one's walls, floor and roof made from its field, its
// lights, its portals, and everything that stands in its rooms. Called by src/core/sites.js buildSites with its Kit (boxes,
// drums, cones, quads in the town's paintings), so it's all part of the one static mesh. No colliders: World walks the
// field itself, and whatever here is solid is in the field already (a prop with solid: true, in the delve's own file).
//
// Two kinds of shell. A cave (the Warrens, the Deeps): the walls where the field crosses zero, pushed back into the rock by
// a lumpy amount so they read as cut stone; the floor and roof on a two-metre grid; stalagmites, stalactites, columns
// where they meet. A castle (Blackvigil): the same walls stood straight and flat in coursed stone, a flagged floor, and a
// roof that's level over each room and steps between them, with the wall over each doorway.
//
// To dress a room: add props to its delve's file (kind, x, z, and what the kind takes) and, if it's a new kind, a builder
// to PROPS below. Triangles matter: this is all drawn every frame you're down here. tools/dungeon/check.mjs counts them.

import { hash2, vnoise } from './terrain-noise.js';
import { tileOf } from './sites.js';
import { DELVES, DUNGEON_CELL, GRID_UNIT, braziers, caveFloorY, caveRoofY, caveRoom, grid, torches } from './dungeon.js';

const TAU = Math.PI * 2;
const NO = { collide: false };

// ---- the shell ------------------------------------------------------------------------------------------------------------

const SEGS = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] };
const grad = (x, z) => { const e = 0.3, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1; return [gx / L, gz / L]; };
// How far a thing standing in a room reaches (as the field has it): what the walls leave alone, since it's drawn as itself.
const drawn = (d) => d.props.filter((p) => p.solid);
const nearProp = (list, lx, lz, pad) => list.some((p) => (p.hx !== undefined ? Math.max(Math.abs(lx - p.x) - p.hx, Math.abs(lz - p.z) - p.hz) : Math.hypot(lx - p.x, lz - p.z) - p.r) < pad);

// The wall's line, a metre at a time: marching squares on the field. each(ax, az, bx, bz) for every piece of it.
function outline(d, each) {
  const g = grid(d), C = DUNGEON_CELL, S = 2, own = drawn(d);
  const f = (i, j) => g.sdf[Math.min(g.H - 1, j) * g.W + Math.min(g.W - 1, i)];
  const lerp = (a, b) => a / (a - b);
  for (let j = 0; j + S < g.H; j += S) {
    for (let i = 0; i + S < g.W; i += S) {
      const v0 = f(i, j), v1 = f(i + S, j), v2 = f(i + S, j + S), v3 = f(i, j + S);
      const code = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const x0 = g.x0 + i * C, z0 = g.z0 + j * C, w = S * C;
      if (own.length && nearProp(own, x0 + w / 2 - d.x, z0 + w / 2 - d.z, 0.9)) continue;
      const e = [
        () => [x0 + w * lerp(v0, v1), z0], () => [x0 + w, z0 + w * lerp(v1, v2)],
        () => [x0 + w * (1 - lerp(v2, v3)), z0 + w], () => [x0, z0 + w * (1 - lerp(v3, v0))],
      ];
      for (const [p, q] of SEGS[code]) { const a = e[p](), b = e[q](); each(a[0], a[1], b[0], b[1]); }
    }
  }
}

// The room a point is nearest (for its own rock, where a room has one).
function nearRoom(d, x, z) {
  let best = null, bd = Infinity;
  for (const r of d.rooms) {
    // (A room with four walls by its walls, a cave's by its round.)
    const lx = x - d.x - r.x, lz = z - d.z - r.z;
    const dd = r.hx !== undefined ? Math.max(Math.abs(lx) - r.hx, Math.abs(lz) - r.hz) : Math.hypot(lx, lz) - r.r;
    if (dd < bd) { bd = dd; best = r; }
  }
  return best;
}

function caveShell(K, d) {
  const g = grid(d), C = DUNGEON_CELL, L = d.look;
  const f = (i, j) => g.sdf[Math.min(g.H - 1, j) * g.W + Math.min(g.W - 1, i)] * GRID_UNIT;
  const wx = (i) => g.x0 + i * C, wz = (j) => g.z0 + j * C;
  // Back into the rock, by height and place: the same for every wall piece that shares an edge, so nothing cracks.
  const lump = (x, y, z) => 0.15 + 0.55 * vnoise(x * 0.45 + y * 0.3, z * 0.45 - y * 0.2) + 0.25 * vnoise(x * 1.3, z * 1.3 + y);
  const BANDS = 4;
  outline(d, (ax, az, bx, bz) => {
    const ga = grad(ax, az), gb = grad(bx, bz);
    const fa = caveFloorY(ax, az) - 0.5, fb = caveFloorY(bx, bz) - 0.5, ra = caveRoofY(ax, az) + 0.6, rb = caveRoofY(bx, bz) + 0.6;
    const P = (x, z, gg, y0, y1, k) => { const y = y0 + (y1 - y0) * k, o = lump(x, y, z) * (k > 0.05 && k < 0.95 ? 1 : 0.4); return [x - gg[0] * o, y, z - gg[1] * o]; };
    // (Each room's own rock, where it has one; a seam of the next colour low on the wall here and there.)
    const room = nearRoom(d, (ax + bx) / 2, (az + bz) / 2), rock = room?.rock || L.wall, seam = room?.seam || L.seam;
    for (let b = 0; b < BANDS; b++) {
      const k0 = b / BANDS, k1 = (b + 1) / BANDS;
      // (Wound so the face looks out of the rock, into the cave: the field rises that way.)
      const A0 = P(ax, az, ga, fa, ra, k0), B0 = P(bx, bz, gb, fb, rb, k0), B1 = P(bx, bz, gb, fb, rb, k1), A1 = P(ax, az, ga, fa, ra, k1);
      const ux = B0[0] - A0[0], uz = B0[2] - A0[2], nx = -uz, nz = ux;
      const layer = seam && b === 1 && vnoise(ax * 0.09, az * 0.09) > 0.52 ? seam : rock;
      if (nx * (ga[0] + gb[0]) + nz * (ga[1] + gb[1]) < 0) K.quad(layer, A0, B0, B1, A1); else K.quad(layer, B0, A0, A1, B1);
    }
  });
  // The floor and the roof, two metres a cell, wherever a corner is in the open or near it.
  const F = 4;
  for (let j = 0; j + F < g.H; j += F) {
    for (let i = 0; i + F < g.W; i += F) {
      if (Math.max(f(i, j), f(i + F, j), f(i + F, j + F), f(i, j + F)) < -0.6) continue;
      const pts = [[i, j], [i + F, j], [i + F, j + F], [i, j + F]].map(([a, b]) => [wx(a), wz(b)]);
      const fl = pts.map(([x, z]) => [x, caveFloorY(x, z), z]), rf = pts.map(([x, z]) => [x, caveRoofY(x, z), z]);
      const room = nearRoom(d, pts[0][0] + 1, pts[0][1] + 1);
      K.quad(room?.ground || L.floor, fl[0], fl[3], fl[2], fl[1]);
      K.quad(L.roof, rf[0], rf[1], rf[2], rf[3]);
    }
  }
  // Stalagmites here and there, off the ways; stalactites over them and out over the rooms; and where the roof's low
  // enough for the two to have met, a column. (In the Deeps the ones from the roof are ice.)
  const own = drawn(d), clearOf = (x, z) => !nearProp(own, x - d.x, z - d.z, 0.6) && !nearProp(d.props, x - d.x, z - d.z, 1.5);
  for (let j = 0; j < g.H; j += 9) for (let i = 0; i < g.W; i += 9) {
    const x = wx(i) + hash2(i, j) * 3, z = wz(j) + hash2(j, i) * 3, dd = caveRoom(x, z);
    if (dd < 0.9 || dd > 2.4 || hash2(i * 3, j * 7) > 0.45 || !clearOf(x, z)) continue;
    const y = caveFloorY(x, z), h = 0.7 + hash2(i, j * 3) * 1.8, top = caveRoofY(x, z);
    if (top - y < 5.6 && hash2(i * 5, j) > 0.55) {
      // A column: two cones meeting at a waist.
      const mid = y + (top - y) * (0.4 + 0.2 * hash2(i, j * 11)), r = 0.38 + h * 0.1;
      K.drum(L.spike || L.roof, x, y - 0.1, z, r, mid - y + 0.1, 6, { r2: r * 0.42, open: true, collide: false, turn: hash2(i, j) * 3 });
      K.drum(L.spike || L.roof, x, mid, z, r * 0.42, top - mid + 0.4, 6, { r2: r * 1.1, open: true, collide: false, turn: hash2(i, j) * 3 });
      continue;
    }
    K.spike(L.stone || 'dark:rubble', x, y - 0.1, z, 0.3 + h * 0.12, h, 5, hash2(i, j) * 3);
  }
  for (let j = 4; j < g.H; j += 7) for (let i = 4; i < g.W; i += 7) {
    const x = wx(i) + hash2(i + 3, j) * 2.5, z = wz(j) + hash2(j + 5, i) * 2.5, dd = caveRoom(x, z);
    if (dd < 0.7 || hash2(i * 7, j * 3) > (dd < 3 ? 0.5 : 0.22)) continue;
    const y = caveFloorY(x, z), top = caveRoofY(x, z), room = top - y;
    if (room < 3.4) continue;
    // Longer where the roof's high, and never down to where a head is.
    const h = Math.min(room - 3, (0.6 + hash2(i, j * 5) * 1.9) * (room > 9 ? 1.7 : 1));
    if (h < 0.4) continue;
    const r = 0.16 + h * 0.11;
    K.spike(L.spike || L.roof, x, top + 0.35, z, r, -h - 0.35, 5, hash2(i, j) * 3, [(hash2(i, j + 2) - 0.5) * 0.12, (hash2(i + 2, j) - 0.5) * 0.12]);
    // (A cluster: two shorter beside it.)
    if (hash2(i + 9, j) > 0.5) for (let k = 0; k < 2; k++) {
      const a = hash2(i + k, j + 7) * TAU, o = 0.35 + r;
      K.spike(L.spike || L.roof, x + Math.cos(a) * o, top + 0.35, z + Math.sin(a) * o, r * 0.6, -h * (0.35 + 0.3 * k) - 0.35, 4, a);
    }
  }
}

// Blackvigil: straight walls of his black stone, a course of rubble at their foot; a flagged floor; each room's roof level,
// stepping where two meet (which makes the wall over a doorway).
function castleShell(K, d) {
  const g = grid(d), C = DUNGEON_CELL, L = d.look;
  const f = (i, j) => g.sdf[Math.min(g.H - 1, j) * g.W + Math.min(g.W - 1, i)] * GRID_UNIT;
  const wx = (i) => g.x0 + i * C, wz = (j) => g.z0 + j * C;
  const FOOT = 1.3;
  outline(d, (ax, az, bx, bz) => {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, gm = grad(mx, mz);
    // (The roof it stands to: the one over the floor it faces, half a metre out from it.)
    const ix = mx + gm[0] * 0.7, iz = mz + gm[1] * 0.7;
    const y0 = Math.min(caveFloorY(ax, az), caveFloorY(bx, bz)) - 0.4, top = caveRoofY(ix, iz) + 0.05;
    const ux = bx - ax, uz = bz - az, flip = -uz * gm[0] + ux * gm[1] < 0;
    const [px, pz, qx, qz] = flip ? [ax, az, bx, bz] : [bx, bz, ax, az];
    // (The painting runs on along the wall: across by where the piece is, up by its height.)
    // (Each by its own scale: tileOf, src/core/sites.js.)
    const band = (layer, a, b) => {
      const [TW, TH] = tileOf(layer), u = (x, z) => (Math.abs(ux) > Math.abs(uz) ? x : z) / TW;
      K.quad(layer, [px, a, pz], [qx, a, qz], [qx, b, qz], [px, b, pz], [gm[0], 0, gm[1]], [[u(px, pz), -a / TH], [u(qx, qz), -a / TH], [u(qx, qz), -b / TH], [u(px, pz), -b / TH]]);
    };
    // (Each room's own masonry, where it has one: rock for its walls, foot for the course under them.)
    const room = nearRoom(d, ix, iz), foot = caveFloorY(mx, mz) + FOOT;
    band(room?.foot || L.foot || 'dark:rubble', y0, foot);
    band(room?.rock || L.wall, foot, top);
  });
  // The floor, in two-metre flags; the roof over each, level; and a wall down from the higher roof where two differ.
  const F = 4, cols = Math.floor((g.W - 1) / F), rows = Math.floor((g.H - 1) / F);
  const roof = new Float32Array(cols * rows).fill(NaN);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = i * F, b = j * F;
    if (Math.max(f(a, b), f(a + F, b), f(a + F, b + F), f(a, b + F)) < 0.02) continue;
    const pts = [[a, b], [a + F, b], [a + F, b + F], [a, b + F]].map(([p, q]) => [wx(p), wz(q)]);
    const fl = pts.map(([x, z]) => [x, caveFloorY(x, z), z]);
    K.quad(nearRoom(d, wx(a + F / 2), wz(b + F / 2))?.ground || L.floor, fl[0], fl[3], fl[2], fl[1]);
    const y = roof[j * cols + i] = caveRoofY(wx(a + F / 2), wz(b + F / 2));
    K.quad(L.roof, [pts[0][0], y, pts[0][1]], [pts[1][0], y, pts[1][1]], [pts[2][0], y, pts[2][1]], [pts[3][0], y, pts[3][1]], [0, -1, 0]);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const y = roof[j * cols + i];
    if (Number.isNaN(y)) continue;
    const x0 = wx(i * F), z0 = wz(j * F), x1 = x0 + F * C, z1 = z0 + F * C;
    // (East and south of it; whichever is lower gets the face, looking into it.)
    if (i + 1 < cols) { const o = roof[j * cols + i + 1]; if (!Number.isNaN(o) && Math.abs(o - y) > 0.05) { const lo = Math.min(o, y), hi = Math.max(o, y), s = o < y ? 1 : -1; K.quad(L.wall, [x1, lo, s > 0 ? z0 : z1], [x1, lo, s > 0 ? z1 : z0], [x1, hi, s > 0 ? z1 : z0], [x1, hi, s > 0 ? z0 : z1], [s, 0, 0]); } }
    if (j + 1 < rows) { const o = roof[(j + 1) * cols + i]; if (!Number.isNaN(o) && Math.abs(o - y) > 0.05) { const lo = Math.min(o, y), hi = Math.max(o, y), s = o < y ? 1 : -1; K.quad(L.wall, [s > 0 ? x1 : x0, lo, z1], [s > 0 ? x0 : x1, lo, z1], [s > 0 ? x0 : x1, hi, z1], [s > 0 ? x1 : x0, hi, z1], [0, 0, s]); } }
  }
  // His red, hung down the long walls of the high rooms: a banner every so far, clear of the doors.
  for (const r of d.rooms) {
    if (r.roof < 9 || r.banners === 0 || L.banner === false) continue;
    const along = r.hz >= r.hx, len = along ? r.hz : r.hx, off = along ? r.hx : r.hz, n = Math.max(1, Math.round(len * 2 / (r.banners || 9)));
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const t = ((i + 0.5) / n * 2 - 1) * (len - 2.5);
      const lx = r.x + (along ? side * off : t), lz = r.z + (along ? t : side * off);
      banner(K, d, lx, lz, along ? -side : 0, along ? 0 : -side, 0.9, r.roof - 1.2, Math.max(3.2, r.roof * 0.42), r, L.banner || 'cloth_red');
    }
  }
  // The stairs: steps laid on the slope, a metre deep.
  for (const r of d.rooms) {
    if (!r.tz) continue;
    for (let s = -r.hz + 0.5; s < r.hz; s += 1) {
      const x = d.x + r.x, z = d.z + r.z + s, y = caveFloorY(x, z);
      K.box(L.floor, x, y - 0.5, z, r.hx - 0.05, 0.63, 0.5, 0, NO);
    }
  }
}

// A banner flat against a wall: at a local point on the wall, facing (nx, nz) into the room, half as wide as w, from top
// down to foot over the floor, swallow-tailed. Not hung over a doorway.
function banner(K, d, lx, lz, nx, nz, w, top, foot, r, cloth = 'cloth_red') {
  const x = d.x + lx, z = d.z + lz;
  if (caveRoom(x - nx * 1.2, z - nz * 1.2) > -0.3 || caveRoom(x + nx, z + nz) < 0.5) return;
  const y = d.y + r.y + (r.tz || 0) * (lz - r.z), o = 0.08, tx = -nz, tz = nx;
  const P = (u, h) => [x + nx * o + tx * u, y + h, z + nz * o + tz * u];
  K.quad(cloth, P(-w, top), P(w, top), P(w, foot + 0.7), P(-w, foot + 0.7), [nx, 0, nz], [[0, 0], [1, 0], [1, (top - foot) / 2], [0, (top - foot) / 2]]);
  K.tri(cloth, P(-w, foot + 0.7), P(0, foot + 0.7), P(-w, foot)); K.tri(cloth, P(0, foot + 0.7), P(w, foot + 0.7), P(w, foot));
  K.box('iron', x + nx * 0.1, y + top, z + nz * 0.1, nx ? 0.05 : w + 0.2, 0.08, nx ? w + 0.2 : 0.05, 0, NO);
}

// ---- its fires -------------------------------------------------------------------------------------------------------------

function fires(K, d) {
  const L = d.look;
  for (const [x, y, z, nx, nz] of torches(d)) {
    if (L.lamp === 'cap') {
      // A bracket of fungus out of the wall, its underside alight.
      K.drum('fruit', x - nx * 0.25, y - 0.12, z - nz * 0.25, 0.55, 0.14, 7, { r2: 0.38, collide: false, turn: x });
      K.drum(L.flame, x - nx * 0.25, y - 0.2, z - nz * 0.25, 0.4, 0.08, 7, { collide: false, turn: x });
      K.drum('fruit', x - nx * 0.3, y - 0.75, z - nz * 0.3 + 0.3, 0.34, 0.1, 6, { r2: 0.22, collide: false, turn: z });
      continue;
    }
    if (L.lamp === 'wisp') {
      // A corpse-light: a flame with nothing under it, standing off the wall over the water.
      K.cone(L.flame, x, y - 0.35, z, 0.12, 0.5, 5); K.cone(L.flame, x, y - 0.35, z, 0.12, -0.22, 5);
      continue;
    }
    if (L.lamp === 'bowl') {
      // A stone lamp on a corbel: a bowl of fat, a pale flame.
      K.box(L.wall, x - nx * 0.3, y - 0.5, z - nz * 0.3, 0.2, 0.28, 0.2, 0, NO);
      K.drum('rubble', x - nx * 0.1, y - 0.22, z - nz * 0.1, 0.12, 0.14, 6, { r2: 0.24, collide: false, open: true });
      K.cone(L.flame, x - nx * 0.1, y - 0.1, z - nz * 0.1, 0.1, 0.34, 5);
      continue;
    }
    if (L.cold) {
      // A shard of ice with a cold light in it, grown out of the wall.
      K.spike('ice', x - nx * 0.3, y - 0.5, z - nz * 0.3, 0.2, 0.95, 4, x, [nx * 0.25, nz * 0.25]);
      K.spike(L.flame, x - nx * 0.1, y - 0.2, z - nz * 0.1, 0.11, 0.6, 4, z, [nx * 0.3, nz * 0.3]);
      continue;
    }
    K.box('iron', x - nx * 0.25, y - 0.55, z - nz * 0.25, 0.05, 0.5, 0.05, 0, NO);
    K.drum('iron', x, y - 0.05, z, 0.1, 0.12, 6, { r2: 0.16, collide: false, open: true });
    K.cone(L.flame, x, y + 0.05, z, 0.14, 0.42, 5);
  }
  for (const [x, y, z, lift] of braziers(d)) {
    // (A chandelier, a hearth, a spit build their own fires: PROPS. Theirs say how high their light is.)
    if (lift !== undefined) continue;
    if (L.lamp === 'cap') {
      // A cap as tall as a man, its gills alight.
      K.drum('cloth_oat', x, y - 0.2, z, 0.2, 1.7, 6, { r2: 0.13, collide: false });
      K.drum(L.flame, x, y + 1.42, z, 0.72, 0.08, 9, { collide: false });
      K.drum('fruit', x, y + 1.5, z, 0.85, 0.16, 9, { r2: 0.7, collide: false }); K.cone('fruit', x, y + 1.66, z, 0.7, 0.4, 9);
      continue;
    }
    if (L.lamp === 'wisp') {
      // A corpse-light over a stump of the causeway's stone.
      K.drum('pale:stone', x, y - 0.3, z, 0.34, 0.9, 6, { r2: 0.26, collide: false, turn: x });
      K.cone(L.flame, x, y + 1.15, z, 0.2, 0.75, 6); K.cone(L.flame, x, y + 1.15, z, 0.2, -0.3, 6);
      continue;
    }
    if (L.lamp === 'bowl') {
      // A grave-lamp: a standing stone with a bowl cut in its head.
      K.box('rubble', x, y - 0.3, z, 0.3, 1.5, 0.24, x, NO);
      K.drum('pale:stone', x, y + 1.2, z, 0.2, 0.16, 7, { r2: 0.36, collide: false, open: true });
      K.cone(L.flame, x, y + 1.3, z, 0.24, 0.7, 6);
      continue;
    }
    if (L.cold) {
      // A cold fire: crystals standing out of a boss of ice.
      K.drum('ice', x, y - 0.2, z, 0.5, 0.5, 6, { r2: 0.3, collide: false });
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + x; K.spike(k ? L.flame : 'ice', x + Math.cos(a) * 0.16, y + 0.2, z + Math.sin(a) * 0.16, 0.16, 0.9 + (k % 2) * 0.5, 4, a, [Math.cos(a) * 0.22, Math.sin(a) * 0.22]); }
      continue;
    }
    K.drum('dark:stone', x, y - 0.2, z, 0.22, 1.35, 6, NO);
    K.drum('iron', x, y + 1.15, z, 0.22, 0.32, 8, { r2: 0.42, collide: false, open: true });
    K.cone(L.flame, x, y + 1.3, z, 0.3, 0.85, 6);
  }
}
// ---- what stands in the rooms ------------------------------------------------------------------------------------------------
// Each: (K, d, p, x, y, z) with the prop's own numbers in p, its place in the world on the floor at x, y, z.

const rod = (K, layer, ax, ay, az, bx, by, bz, t) => {
  // A thin bar between two points: a quad either way, so it shows from every side.
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), px = L > 1e-3 ? -dz / L * t : t, pz = L > 1e-3 ? dx / L * t : 0;
  K.quad(layer, [ax - px, ay, az - pz], [ax + px, ay, az + pz], [bx + px, by, bz + pz], [bx - px, by, bz - pz]);
  K.quad(layer, [ax, ay - t, az], [ax, ay + t, az], [bx, by + t, bz], [bx, by - t, bz]);
};
const egg = (K, layer, x, y, z, r, h, turn = 0) => { K.drum(layer, x, y, z, r * 0.45, h * 0.45, 6, { r2: r, open: true, collide: false, turn }); K.cone(layer, x, y + h * 0.45, z, r, h * 0.55, 6, turn); };
const skull = (K, x, y, z, r, turn = 0) => { K.drum('pale:stone', x, y, z, r * 0.8, r * 0.9, 6, { r2: r, collide: false, turn, open: true }); K.cone('pale:stone', x, y + r * 0.9, z, r, r * 0.7, 6, turn); };
// Ribs: arcs of bone standing out of the floor in a row.
function ribs(K, x, y, z, s, yaw, n = 5) {
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 0.55 * s, h = (1.5 - Math.abs(i - (n - 1) / 2) * 0.22) * s;
    for (const side of [-1, 1]) {
      let px = x + sn * o + c * side * 0.9 * s, py = y - 0.1, pz = z + c * o - sn * side * 0.9 * s;
      for (let k = 1; k <= 3; k++) {
        const a = k / 3 * 1.35, qx = x + sn * o + c * side * 0.9 * s * Math.cos(a), qy = y + h * Math.sin(a), qz = z + c * o - sn * side * 0.9 * s * Math.cos(a);
        rod(K, 'pale:stone', px, py, pz, qx, qy, qz, 0.05 * s);
        px = qx; py = qy; pz = qz;
      }
    }
  }
  K.box('pale:stone', x, y - 0.05, z, 0.07 * s, 0.14, n * 0.3 * s, yaw, NO);
}

const PROPS = {
  // ---- the keep ----
  column(K, d, p, x, y, z) {
    if (p.stone) {
      // (A standing stone: rough, leaning a little, as tall as three men, and nothing on its head.)
      K.drum('rubble', x, y - 0.3, z, p.r * 1.1, 5.6, 7, { r2: p.r * 0.8, collide: false, turn: x });
      K.drum('pale:stone', x, y + 3.4, z, p.r * 0.95, 0.22, 7, { open: true, collide: false, turn: x });
      return;
    }
    const top = caveRoofY(x + 0.01, z + 0.01), r = p.r;
    // (His black stone in the keep; a post of timber, or bleached stone, where the delve isn't his: wood, pale.)
    const [foot, shaft] = p.wood ? ['wood', 'wood'] : p.pale ? ['rubble', 'pale:stone'] : ['dark:rubble', 'dark:stone'];
    K.box(foot, x, y - 0.3, z, r * 1.25, 0.9, r * 1.25, 0, NO);
    K.drum(shaft, x, y + 0.6, z, r * 0.9, top - y - 1.5, p.wood ? 6 : 10, { open: true, collide: false });
    K.drum(shaft, x, top - 0.9, z, r * 0.9, 0.5, p.wood ? 6 : 10, { r2: r * 1.3, open: true, collide: false });
    K.box(foot, x, top - 0.4, z, r * 1.35, 0.45, r * 1.35, 0, { collide: false, top: false });
  },
  // A rib of stone sprung from one column to another, coming to a point.
  arch(K, d, p, x, y, z) {
    const x1 = d.x + p.x1, z1 = d.z + p.z1, N = 10, t = 0.32, tall = 0.55;
    const at = (k) => { const u = k / N, s = (1 - Math.abs(2 * u - 1)) * 0.85; return [x + (x1 - x) * u, y + p.spring + p.rise * Math.sqrt(s * (2 - s)) / 0.9887, z + (z1 - z) * u]; };
    const L = Math.hypot(x1 - x, z1 - z) || 1, nx = -(z1 - z) / L * t, nz = (x1 - x) / L * t;
    for (let k = 0; k < N; k++) {
      const a = at(k), b = at(k + 1);
      K.quad('dark:stone', [a[0] + nx, a[1], a[2] + nz], [b[0] + nx, b[1], b[2] + nz], [b[0] + nx, b[1] + tall, b[2] + nz], [a[0] + nx, a[1] + tall, a[2] + nz]);
      K.quad('dark:stone', [b[0] - nx, b[1], b[2] - nz], [a[0] - nx, a[1], a[2] - nz], [a[0] - nx, a[1] + tall, a[2] - nz], [b[0] - nx, b[1] + tall, b[2] - nz]);
      K.quad('dark:rubble', [a[0] - nx, a[1], a[2] - nz], [b[0] - nx, b[1], b[2] - nz], [b[0] + nx, b[1], b[2] + nz], [a[0] + nx, a[1], a[2] + nz]);
    }
  },
  table(K, d, p, x, y, z) {
    const long = p.hz >= p.hx, a = long ? p.hz : p.hx, yaw = long ? 0 : Math.PI / 2, up = p.rough ? 0.7 : 0.85;
    K.box('wood', x, y + up - 0.08, z, 0.62, 0.08, a - 0.15, yaw, NO);
    for (const s of [-1, 1]) K.box('wood', x + (long ? 0 : s * (a - 0.7)), y, z + (long ? s * (a - 0.7) : 0), 0.5, up - 0.08, 0.09, yaw, { collide: false, top: false });
    for (const s of [-1, 1]) K.box('wood', x + (long ? s * 0.95 : 0), y, z + (long ? 0 : s * 0.95), 0.16, 0.45, a - 0.3, yaw, NO);
    // What's left on it: a trencher or two, a candle.
    for (let k = 0; k < Math.floor(a / 2); k++) { const o = (k - (Math.floor(a / 2) - 1) / 2) * 2; K.drum(k % 2 ? 'iron' : 'cloth_oat', x + (long ? 0.15 : o), y + up, z + (long ? o : 0.15), 0.16, 0.06 + (k % 2) * 0.16, 6, NO); }
  },
  bunk(K, d, p, x, y, z) {
    K.box('wood', x, y, z, p.hx, 0.4, p.hz, 0, NO);
    K.box('cloth_oat', x, y + 0.4, z, p.hx - 0.08, 0.12, p.hz - 0.08, 0, NO);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box('wood', x + sx * (p.hx - 0.07), y, z + sz * (p.hz - 0.07), 0.07, 1.9, 0.07, 0, NO);
    K.box('wood', x, y + 1.35, z, p.hx, 0.1, p.hz, 0, NO);
    K.box(p.cloth || 'cloth_red', x, y + 1.45, z, p.hx - 0.08, 0.1, p.hz - 0.08, 0, NO);
  },
  shelf(K, d, p, x, y, z) {
    const h = p.h || 4;
    K.box('wood', x, y, z, p.hx, h, p.hz, 0, NO);
    // The books: a band of them on each shelf, on both faces.
    for (let k = 0; k < Math.floor(h / 0.9); k++) for (const s of [-1, 1]) {
      const yb = y + 0.35 + k * 0.9, xb = x + s * (p.hx + 0.01), layer = ['cloth_red', 'dark:cloth_oat', 'dark:cloth_red', 'cloth_oat'][(k + (s > 0 ? 1 : 0)) % 4];
      K.quad(layer, [xb, yb, z + s * (p.hz - 0.15)], [xb, yb, z - s * (p.hz - 0.15)], [xb, yb + 0.55, z - s * (p.hz - 0.15)], [xb, yb + 0.55, z + s * (p.hz - 0.15)], [s, 0, 0]);
    }
  },
  // Spears stood in a frame against a wall, facing yaw out from it.
  rack(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    for (const u of [-1.1, 1.1]) K.box('wood', x + u * c, y, z - u * s, 0.06, 1.5, 0.06, p.yaw, NO);
    for (const h of [0.5, 1.4]) K.box('wood', x, y + h, z, 1.15, 0.07, 0.05, p.yaw, NO);
    for (let k = 0; k < 5; k++) {
      const u = (k - 2) * 0.45, px = x + u * c + 0.12 * s, pz = z - u * s + 0.12 * c;
      K.box('wood', px, y, pz, 0.025, 2.2, 0.025, p.yaw, { collide: false, top: false });
      K.cone('iron', px, y + 2.2, pz, 0.06, 0.4, 4);
    }
  },
  // A suit of his black plate on a stand, his red on it.
  stand(K, d, p, x, y, z) {
    K.box('wood', x, y, z, 0.05, 1.5, 0.05, 0, NO);
    K.box('wood', x, y, z, 0.3, 0.06, 0.3, 0, NO);
    K.drum('iron', x, y + 0.85, z, 0.24, 0.6, 7, { r2: 0.32, collide: false });
    K.drum('iron', x, y + 1.5, z, 0.15, 0.3, 6, { r2: 0.12, collide: false });
    K.cone('cloth_red', x, y + 1.78, z, 0.05, 0.35, 4);
    K.box('cloth_red', x, y + 0.35, z, 0.2, 0.55, 0.26, 0, { collide: false, top: false });
  },
  anvil(K, d, p, x, y, z) {
    K.drum('dark:rubble', x, y, z, 0.5, 0.55, 7, NO);
    K.box('iron', x, y + 0.55, z, 0.5, 0.3, 0.2, 0.5, NO);
  },
  barrels(K, d, p, x, y, z) {
    for (const [ox, oz, h] of [[0, 0, 1.05], [0.95, 0.2, 1.05], [0.4, 0.85, 0.9]]) {
      K.drum('wood', x + ox, y, z + oz, 0.42, h, 8, NO);
      K.drum('iron', x + ox, y + h * 0.25, z + oz, 0.435, 0.06, 8, { open: true, collide: false });
      K.drum('iron', x + ox, y + h * 0.75, z + oz, 0.435, 0.06, 8, { open: true, collide: false });
    }
  },
  crates(K, d, p, x, y, z) {
    K.box('wood', x, y, z, 0.6, 0.9, 0.6, 0.2, NO); K.box('wood', x + 1.25, y, z + 0.1, 0.5, 0.7, 0.5, -0.3, NO); K.box('wood', x + 0.3, y + 0.9, z, 0.4, 0.55, 0.4, 0.6, NO);
  },
  // Bars of iron across a way: down to the floor, or drawn up over a door (raised: how far its foot hangs over the floor).
  portcullis(K, d, p, x, y, z) {
    const y0 = y + (p.raised || 0), y1 = y + p.h;
    for (let u = -p.w; u <= p.w + 0.01; u += 0.5) { K.box('iron', x + u, y0, z, 0.045, y1 - y0, 0.045, 0, NO); if (p.raised) K.cone('iron', x + u, y0, z, 0.06, -0.3, 4); }
    for (let h = y0 + 0.4; h < y1; h += 0.9) K.box('iron', x, h, z, p.w, 0.07, 0.03, 0, NO);
    if (!p.raised) K.quad('door_5', [x - p.w, y, z - 0.3], [x + p.w, y, z - 0.3], [x + p.w, y1, z - 0.3], [x - p.w, y1, z - 0.3], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  },
  // His red on the floor: a runner, laid along the floor's own slope.
  carpet(K, d, p, x, y, z) {
    const long = p.hz >= p.hx, a = long ? p.hz : p.hx, b = long ? p.hx : p.hz, n = Math.max(1, Math.round(a));
    for (let k = 0; k < n; k++) {
      const u0 = -a + k * 2 * a / n, u1 = u0 + 2 * a / n;
      const P = (u, v) => { const px = x + (long ? v : u), pz = z + (long ? u : v); return [px, caveFloorY(px, pz) + 0.035, pz]; };
      K.quad(p.layer || 'cloth_red', P(u0, -b), P(u1, -b), P(u1, b), P(u0, b), [0, 1, 0]);
    }
  },
  candles(K, d, p, x, y, z) {
    const y0 = y + (p.up || 0);
    for (const [ox, oz, h] of [[0, 0, 0.5], [0.22, 0.1, 0.34], [-0.1, 0.24, 0.42], [0.1, -0.2, 0.26]]) {
      K.drum('pale:stone', x + ox, y0, z + oz, 0.05, h, 5, NO);
      K.cone(d.look.flame, x + ox, y0 + h, z + oz, 0.035, 0.13, 4);
    }
  },
  // A circle cut in the floor and filled with black glass: where a working is made.
  circle(K, d, p, x, y, z) {
    const N = 28;
    for (const [r0, r1] of [[p.r - 0.35, p.r], [p.r * 0.55 - 0.15, p.r * 0.55]]) for (let i = 0; i < N; i++) {
      const a = i / N * TAU, b = (i + 1) / N * TAU;
      K.quad('obsidian', [x + Math.cos(a) * r0, y + 0.03, z + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + 0.03, z + Math.sin(a) * r1], [x + Math.cos(b) * r1, y + 0.03, z + Math.sin(b) * r1], [x + Math.cos(b) * r0, y + 0.03, z + Math.sin(b) * r0], [0, 1, 0]);
    }
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, b = (i + 2) / 5 * TAU; rod(K, 'obsidian', x + Math.cos(a) * p.r * 0.55, y + 0.04, z + Math.sin(a) * p.r * 0.55, x + Math.cos(b) * p.r * 0.55, y + 0.04, z + Math.sin(b) * p.r * 0.55, 0.08); }
  },
  lectern(K, d, p, x, y, z) {
    K.drum('dark:stone', x, y, z, 0.55, 0.3, 8, NO);
    K.drum('dark:stone', x, y + 0.3, z, 0.2, 1.0, 6, { open: true, collide: false });
    K.box('wood', x, y + 1.3, z + 0.05, 0.5, 0.08, 0.35, 0, NO);
    K.box('dark:cloth_red', x, y + 1.38, z + 0.05, 0.36, 0.09, 0.26, 0, NO);
    for (const s of [-1, 1]) { K.drum('iron', x + s * 0.9, y, z - 0.3, 0.06, 1.5, 5, NO); K.cone(d.look.flame, x + s * 0.9, y + 1.5, z - 0.3, 0.07, 0.24, 4); }
  },
  pew(K, d, p, x, y, z) {
    K.box('wood', x, y, z, p.hx, 0.45, p.hz * 0.6, 0, NO);
    K.box('wood', x, y, z + p.hz * 0.8, p.hx, 1.05, p.hz * 0.18, 0, NO);
  },
  // Velscour's altar: a block of his black stone, his red over it, two teeth of black glass behind it as at his obelisks.
  altar(K, d, p, x, y, z) {
    K.box('dark:stone', x, y, z, p.hx + 0.5, 0.25, p.hz + 0.5, 0, NO);
    K.box('dark:stone', x, y + 0.25, z, p.hx, 1.0, p.hz, 0, NO);
    K.box('cloth_red', x, y + 1.25, z, p.hx + 0.08, 0.05, p.hz * 0.6, 0, NO);
    for (const s of [-1, 1]) {
      K.spike('obsidian', x + s * (p.hx + 1.5), y, z - p.hz - 0.8, 0.7, 6.5, 5, s);
      K.drum('iron', x + s * (p.hx - 0.5), y + 1.3, z, 0.05, 0.5, 5, NO); K.cone(d.look.flame, x + s * (p.hx - 0.5), y + 1.8, z, 0.06, 0.2, 4);
    }
    K.drum('iron', x, y + 1.3, z, 0.3, 0.22, 8, { r2: 0.42, open: true, collide: false });
  },
  brazier() {},
  // A wheel of iron hung on a chain, fires round it.
  chandelier(K, d, p, x, y, z) {
    const top = caveRoofY(x, z), h = y + p.up;
    K.box('iron', x, h, z, 0.03, top - h, 0.03, 0, NO);
    K.drum('iron', x, h, z, 1.5, 0.14, 12, { open: true, collide: false });
    K.drum('iron', x, h, z, 1.38, 0.14, 12, { open: true, collide: false });
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4; rod(K, 'iron', x, h + 0.9, z, x + Math.cos(a) * 1.45, h + 0.1, z + Math.sin(a) * 1.45, 0.02); }
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; K.cone(d.look.flame, x + Math.cos(a) * 1.44, h + 0.14, z + Math.sin(a) * 1.44, 0.09, 0.32, 4); }
  },
  // A great hearth in a wall, facing yaw out from it.
  hearth(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    for (const u of [-2, 2]) { const [px, pz] = P(u, 0.3); K.box('dark:rubble', px, y, pz, 0.45, 2.6, 0.5, p.yaw, NO); }
    { const [px, pz] = P(0, 0.3); K.box('dark:rubble', px, y + 2.6, pz, 2.5, 0.7, 0.6, p.yaw, NO); K.box('dark:stone', px, y + 3.3, pz, 2, 3, 0.4, p.yaw, NO); }
    { const [px, pz] = P(0, 0.25); K.box('obsidian', px, y, pz, 1.55, 2.6, 0.06, p.yaw, { collide: false, top: false }); }
    for (const u of [-0.8, 0, 0.8]) { const [px, pz] = P(u, 0.5); K.cone(d.look.flame, px, y + 0.1, pz, 0.38, 1.1 + (u ? 0 : 0.4), 5); K.box('wood', px, y, pz, 0.5, 0.18, 0.12, p.yaw + u, NO); }
  },
  beam(K, d, p, x, y, z) {
    K.box('wood', x, y + p.up, z, p.hx, 0.5, 0.25, 0, NO);
    for (const s of [-1, 1]) K.box('wood', x + s * (p.hx - 1.2), y + p.up - 1.1, z, 0.9, 0.22, 0.2, s * 0.0, NO);
  },
  seat(K, d, p, x, y, z) {
    K.box(p.stone || 'dark:stone', x, y, z, p.hx, 0.7, p.hz, 0, NO);
    K.box(p.stone || 'dark:stone', x, y + 0.7, z + p.hz - 0.25, p.hx, 2.6, 0.25, 0, NO);
    K.box(p.cloth || 'cloth_red', x, y + 0.7, z - 0.1, p.hx - 0.25, 0.05, p.hz - 0.4, 0, NO);
  },
  // The Castellan's throne: black stone, a back as tall as three men, teeth of black glass along its top, his red down it.
  throne(K, d, p, x, y, z) {
    K.box('dark:rubble', x, y, z, p.hx + 0.8, 0.35, p.hz + 0.8, 0, NO);
    K.box('dark:stone', x, y + 0.35, z, p.hx, 0.9, p.hz, 0, NO);
    for (const s of [-1, 1]) K.box('dark:stone', x + s * (p.hx - 0.3), y + 1.25, z, 0.3, 0.9, p.hz, 0, NO);
    K.box('dark:stone', x, y + 1.25, z - p.hz + 0.3, p.hx, 5.2, 0.3, 0, NO);
    for (let k = 0; k < 5; k++) K.spike('obsidian', x + (k - 2) * 0.7, y + 6.4, z - p.hz + 0.3, 0.28, 1.4 + (2 - Math.abs(k - 2)) * 0.7, 4, k);
    K.quad('cloth_red', [x - 0.7, y + 6.2, z - p.hz + 0.62], [x + 0.7, y + 6.2, z - p.hz + 0.62], [x + 0.7, y + 1.3, z - p.hz + 0.62], [x - 0.7, y + 1.3, z - p.hz + 0.62], [0, 0, 1], [[0, 0], [1, 0], [1, 3], [0, 3]]);
    K.box('cloth_red', x, y + 1.25, z + 0.15, p.hx - 0.65, 0.06, p.hz - 0.4, 0, NO);
  },
  // An iron cage on a chain, and what was left in it.
  cage(K, d, p, x, y, z) {
    const top = caveRoofY(x, z), h = y + p.up;
    K.box('iron', x, h + 1.7, z, 0.03, top - h - 1.7, 0.03, 0, NO);
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; K.box('iron', x + Math.cos(a) * 0.5, h, z + Math.sin(a) * 0.5, 0.025, 1.5, 0.025, 0, NO); }
    K.drum('iron', x, h, z, 0.52, 0.06, 6, NO); K.cone('iron', x, h + 1.5, z, 0.54, 0.25, 6);
    skull(K, x, h + 0.06, z, 0.16);
  },

  // ---- the caves ----
  // Shoring: two props and a beam across, facing yaw; w is half its span.
  timber(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), h = p.h || 3;
    for (const u of [-p.w, p.w]) { const px = x + u * c, pz = z - u * s; K.box('wood', px, caveFloorY(px, pz) - 0.2, pz, 0.16, h + 0.2 + y - caveFloorY(px, pz), 0.16, p.yaw, NO); }
    K.box('wood', x, y + h, z, p.w + 0.4, 0.28, 0.2, p.yaw, NO);
    for (const u of [-1, 1]) { const px = x + u * (p.w - 0.55) * c, pz = z - u * (p.w - 0.55) * s; K.box('wood', px, y + h - 0.75, pz, 0.6, 0.12, 0.1, p.yaw, NO); }
  },
  cart(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw);
    K.box('wood', x, y + 0.35, z, 0.55, 0.6, 0.9, yaw, { collide: false, top: 'rubble' });
    for (const u of [-1, 1]) for (const w of [-1, 1]) K.drum('iron', x + u * 0.6 * c + w * 0.55 * s, y, z - u * 0.6 * s + w * 0.55 * c, 0.2, 0.4, 6, NO);
    for (const u of [-0.5, 0.5]) { K.box('wood', x + u * c - 0.2 * s, y - 0.03, z - u * s - 0.2 * c, 0.05, 0.06, 2.6, yaw, NO); }
  },
  heap(K, d, p, x, y, z) {
    K.drum(p.layer || d.look.wall, x, y - 0.2, z, p.r, p.r * 0.55, 7, { r2: p.r * 0.25, collide: false, turn: x });
    K.drum(p.layer || d.look.wall, x + p.r * 0.7, y - 0.2, z + p.r * 0.4, p.r * 0.6, p.r * 0.4, 6, { r2: p.r * 0.15, collide: false, turn: z });
  },
  // Picks and shovels left against the rock.
  tools(K, d, p, x, y, z) {
    for (let k = 0; k < 3; k++) {
      const a = (p.yaw || 0) + (k - 1) * 0.5, bx = x + Math.cos(a) * 0.5 * k * 0.6, bz = z + Math.sin(a) * 0.5 * k * 0.6;
      rod(K, 'wood', bx, y, bz, bx + Math.sin(a) * 0.5, y + 1.3, bz + Math.cos(a) * 0.5, 0.03);
      rod(K, 'iron', bx + Math.sin(a) * 0.5 - 0.3, y + 1.22, bz + Math.cos(a) * 0.5, bx + Math.sin(a) * 0.5 + 0.3, y + 1.32, bz + Math.cos(a) * 0.5, 0.035);
    }
  },
  // A vat of tallow over its fire-pit, a crust on it.
  vat(K, d, p, x, y, z) {
    K.drum('iron', x, y + 0.25, z, p.r, 0.95, 10, { r2: p.r * 1.12, lid: 'pale:stone', collide: false });
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + x; K.box('dark:rubble', x + Math.cos(a) * p.r * 0.8, y - 0.1, z + Math.sin(a) * p.r * 0.8, 0.22, 0.4, 0.22, a, NO); }
    K.cone('flame', x, y, z, p.r * 0.5, 0.3, 5);
    // (Drips down its side, gone hard.)
    for (let k = 0; k < 4; k++) { const a = k * 1.9 + z; K.cone('pale:stone', x + Math.cos(a) * p.r * 1.1, y + 1.2, z + Math.sin(a) * p.r * 1.1, 0.07, -0.5 - (k % 2) * 0.3, 4); }
  },
  // A carcass on a spit over a fire.
  spit(K, d, p, x, y, z) {
    for (const u of [-1.3, 1.3]) { K.box('wood', x + u, y - 0.1, z, 0.06, 1.3, 0.06, 0, NO); }
    rod(K, 'iron', x - 1.5, y + 1.15, z, x + 1.5, y + 1.15, z, 0.03);
    egg(K, 'cloth_oat', x, y + 0.85, z, 0.4, 0.75);
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5; K.box('dark:rubble', x + Math.cos(a) * 0.8, y - 0.1, z + Math.sin(a) * 0.8, 0.2, 0.3, 0.16, a, NO); }
    for (const [ox, oz, h] of [[0, 0, 0.7], [0.3, 0.15, 0.5], [-0.25, -0.1, 0.55]]) K.cone('flame', x + ox, y, z + oz, 0.22, h, 5);
  },
  // A seat for a goblin who calls himself a king: piled stone, a back of bones.
  stonethrone(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw);
    K.box('rubble', x, y - 0.2, z, 1.2, 0.5, 1.2, yaw, NO);
    K.box('dark:rubble', x, y + 0.3, z, 0.8, 0.6, 0.7, yaw, NO);
    K.box('dark:rubble', x - 0.55 * s, y + 0.9, z - 0.55 * c, 0.8, 1.9, 0.18, yaw, NO);
    for (let k = -2; k <= 2; k++) K.spike('pale:stone', x + k * 0.33 * c - 0.55 * s, y + 2.8, z - k * 0.33 * s - 0.55 * c, 0.09, 0.7 + (2 - Math.abs(k)) * 0.25, 4, k, [k * 0.08 * c, -k * 0.08 * s]);
    skull(K, x + 0.95 * c, y + 0.3, z - 0.95 * s, 0.17, 1); skull(K, x - 0.95 * c, y + 0.3, z + 0.95 * s, 0.17, 2);
    K.box(p.cloth || 'cloth_red', x, y + 0.9, z + 0.02, 0.5, 0.04, 0.5, yaw, NO);
  },
  // A hide tent: a goblin's nest.
  tent(K, d, p, x, y, z) {
    K.cone('cloth_oat', x, y, z, p.r || 1.3, (p.r || 1.3) * 1.5, 6, x);
    K.box('wood', x, y, z, 0.04, (p.r || 1.3) * 1.5 + 0.5, 0.04, 0, NO);
  },
  bones(K, d, p, x, y, z) {
    ribs(K, x, y, z, p.r / 2, x * 0.7);
    for (let k = 0; k < 4; k++) { const a = k * 1.7 + z, o = p.r * (0.5 + 0.3 * (k % 2)); skull(K, x + Math.cos(a) * o, y - 0.02, z + Math.sin(a) * o, 0.14 + 0.03 * (k % 3), a); }
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + x, o = p.r * (0.3 + 0.2 * (k % 3)); rod(K, 'pale:stone', x + Math.cos(a) * o, y + 0.05, z + Math.sin(a) * o, x + Math.cos(a + 0.7) * (o + 0.7), y + 0.07, z + Math.sin(a + 0.7) * (o + 0.7), 0.04); }
  },
  // Steps of bone: the long bones of something laid side by side down a slope.
  bonesteps(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    for (let k = 0; k < p.n; k++) {
      const u = (k - (p.n - 1) / 2) * 1.1, px = x + u * s, pz = z + u * c, py = caveFloorY(px, pz);
      rod(K, 'pale:stone', px - c * p.w, py + 0.06, pz + s * p.w, px + c * p.w, py + 0.06, pz - s * p.w, 0.09);
      for (const e of [-1, 1]) K.drum('pale:stone', px + e * c * p.w, py - 0.02, pz - e * s * p.w, 0.14, 0.18, 5, NO);
    }
  },
  // A heap of gold: coin spilled down it, a cup or a crown on top.
  gold(K, d, p, x, y, z) {
    K.drum('fruit2', x, y - 0.15, z, p.r, p.r * 0.5, 9, { r2: p.r * 0.3, collide: false, turn: x });
    K.cone('fruit2', x + p.r * 0.1, y + p.r * 0.3, z, p.r * 0.42, p.r * 0.4, 7, z);
    for (let k = 0; k < 4; k++) { const a = k * 1.6 + x; K.drum('fruit2', x + Math.cos(a) * p.r * 1.05, y - 0.05, z + Math.sin(a) * p.r * 1.05, p.r * 0.3, 0.14, 6, { r2: p.r * 0.12, collide: false }); }
    K.drum('iron', x - p.r * 0.5, y + p.r * 0.18, z + p.r * 0.3, 0.2, 0.35, 6, { r2: 0.28, collide: false });
  },
  // A clutch of eggs in a hollow.
  eggs(K, d, p, x, y, z) {
    const layer = p.layer || 'pale:stone', s = p.s || 1;
    for (const [ox, oz, r, h] of [[0, 0, 0.42, 0.95], [0.7, 0.2, 0.36, 0.8], [-0.4, 0.6, 0.38, 0.85], [0.2, -0.65, 0.33, 0.7], [-0.7, -0.3, 0.3, 0.66]]) egg(K, layer, x + ox * s, y - 0.1, z + oz * s, r * s, h * s, ox * 7);
    if (d.look.cold) for (let k = 0; k < 6; k++) { const a = k * TAU / 6; rod(K, 'white', x, y + 0.6 * s, z, x + Math.cos(a) * 1.6 * s, y + 0.02, z + Math.sin(a) * 1.6 * s, 0.012); }
  },
  // Water lying where the floor's low.
  pool(K, d, p, x, y, z) { K.disc(p.layer || 'lake', x, y + (p.up ?? 0.05), z, p.r, 14); },

  // ---- the Deeps ----
  drift(K, d, p, x, y, z) {
    K.drum('white', x, y - 0.15, z, p.r, p.r * 0.3, 8, { r2: p.r * 0.35, collide: false, turn: x });
    K.cone('white', x + p.r * 0.1, y + p.r * 0.14, z, p.r * 0.4, p.r * 0.14, 7, z);
  },
  // A pillar of ice from floor to roof, thin at its waist.
  icepillar(K, d, p, x, y, z) {
    const top = caveRoofY(x + 0.01, z + 0.01) + 0.4, mid = y + (top - y) * 0.45, r = p.r;
    K.drum('ice', x, y - 0.2, z, r * 1.25, mid - y + 0.2, 7, { r2: r * 0.7, open: true, collide: false, turn: x });
    K.drum('ice', x, mid, z, r * 0.7, top - mid, 7, { r2: r * 1.4, open: true, collide: false, turn: x });
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + z; K.spike('ice', x + Math.cos(a) * r * 1.3, y - 0.1, z + Math.sin(a) * r * 1.3, 0.3, 0.9 + k * 0.4, 4, a, [Math.cos(a) * 0.2, Math.sin(a) * 0.2]); }
  },
  // Ice lying over the floor: a sheet of it.
  sheet(K, d, p, x, y, z) { K.disc('ice', x, y + 0.14, z, p.r, 12); },
  // The frozen lake, shore to shore.
  lake(K, d, p, x, y, z) { K.disc('ice', x, y + 0.04, z, p.r, 36); },
  // Something dark under the ice.
  shape(K, d, p, x, y, z) { for (const [ox, oz, r] of [[0, 0, 2.2], [1.8, 0.6, 1.5], [-1.9, -0.4, 1.3], [3.2, 1.3, 0.8]]) K.disc('lake', x + ox * p.s, y + 0.06, z + oz * p.s, r * p.s, 9); },
  // A beast caught in the ice where it stood: its horns and ribs standing out of the block.
  frozen(K, d, p, x, y, z) {
    const s = p.s;
    K.drum('ice', x, y - 0.2, z, 1.6 * s, 2.3 * s, 7, { r2: 0.9 * s, collide: false, turn: x });
    for (const e of [-1, 1]) K.spike('pale:stone', x + e * 0.45 * s, y + 2.0 * s, z + 0.3 * s, 0.12 * s, 0.9 * s, 4, e, [e * 0.45, 0.1]);
    ribs(K, x + 0.2 * s, y + 0.2, z - 1.5 * s, 0.6 * s, x, 4);
    for (let k = 0; k < 3; k++) { const a = k * 2.2 + x; K.spike('ice', x + Math.cos(a) * 1.5 * s, y - 0.1, z + Math.sin(a) * 1.5 * s, 0.35 * s, 1.2 * s, 4, a, [Math.cos(a) * 0.3, Math.sin(a) * 0.3]); }
  },
  // The Goat-King's seat: a block of ice, great horns curving up either side of it.
  hornseat(K, d, p, x, y, z) {
    K.drum('ice', x, y - 0.2, z, p.r, 1.2, 7, { r2: p.r * 0.8, collide: false });
    K.box('frost:stone', x, y + 1.0, z - p.r * 0.5, p.r * 0.7, 2.2, 0.3, 0, NO);
    for (const e of [-1, 1]) {
      let px = x + e * p.r * 0.9, py = y + 0.6, pz = z - p.r * 0.3;
      for (let k = 1; k <= 5; k++) { const a = k / 5 * 2.2, qx = x + e * (p.r * 0.9 + Math.sin(a) * 1.5), qy = y + 0.6 + (1 - Math.cos(a)) * 1.9, qz = pz; rod(K, 'pale:stone', px, py, pz, qx, qy, qz, 0.2 - k * 0.03); px = qx; py = qy; }
    }
    skull(K, x, y + 3.2, z - p.r * 0.5, 0.3);
  },
  // A skull on a stake, horned.
  stake(K, d, p, x, y, z) {
    K.box('wood', x, y - 0.2, z, 0.05, 2.5, 0.05, 0.4, NO);
    skull(K, x, y + 2.2, z, 0.2, x);
    for (const e of [-1, 1]) K.spike('pale:stone', x + e * 0.15, y + 2.45, z, 0.06, 0.6, 4, e, [e * 0.6, 0]);
  },
  // A web strung from one place to another, floor to roof: spokes from its middle and rings across them.
  web(K, d, p, x, y, z) {
    const x1 = d.x + p.x1, z1 = d.z + p.z1, y1 = caveFloorY(x1, z1), top = Math.min(caveRoofY(x, z), caveRoofY(x1, z1)) - 0.3;
    const mx = (x + x1) / 2, mz = (z + z1) / 2, my = (y + y1) / 2 + (top - (y + y1) / 2) * 0.5, hw = Math.hypot(x1 - x, z1 - z) / 2, hh = (top - (y + y1) / 2) / 2;
    const ux = (x1 - x) / (2 * hw || 1), uz = (z1 - z) / (2 * hw || 1);
    const pt = (a, k) => { const c = Math.cos(a), s = Math.sin(a), e = 1 / Math.max(Math.abs(c), Math.abs(s)); return [mx + ux * c * e * hw * k, my + s * e * hh * k, mz + uz * c * e * hw * k]; };
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + 0.2, b = (i + 1) / N * TAU + 0.2, o = pt(a, 1);
      rod(K, 'white', mx, my, mz, o[0], o[1], o[2], 0.014);
      for (const k of [0.3, 0.55, 0.8]) { const q = pt(a, k), r = pt(b, k); rod(K, 'white', q[0], q[1], q[2], r[0], r[1], r[2], 0.01); }
    }
  },
  // The wrapped dead, hung up.
  cocoon(K, d, p, x, y, z) {
    const top = caveRoofY(x, z), h = Math.min(top - 1.6, y + 2.4 + hash2(x | 0, z | 0) * 1.5);
    rod(K, 'white', x, top + 0.2, z, x, h + 1.5, z, 0.02);
    K.drum('white', x, h + 0.7, z, 0.34, 0.8, 6, { r2: 0.12, open: true, collide: false });
    K.cone('white', x, h + 0.7, z, 0.34, -0.7, 6);
  },
  // A river caught as it fell: a curtain of ice down the wall, facing yaw.
  falls(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), N = 9, top = y + p.h;
    const P = (k, h, out) => { const u = (k / N - 0.5) * p.w; return [x + u * c + out * s, h, z - u * s + out * c]; };
    for (let k = 0; k < N; k++) {
      const o0 = 0.5 + 0.5 * Math.sin(k * 2.1), o1 = 0.5 + 0.5 * Math.sin((k + 1) * 2.1);
      K.quad('falls', P(k, y - 0.2, 1.6 + o0), P(k + 1, y - 0.2, 1.6 + o1), P(k + 1, top, o1 * 0.5), P(k, top, o0 * 0.5));
      K.spike('ice', ...P(k + 0.5, y - 0.1, 2.3 + o0), 0.5, 1 + o0, 4, k);
    }
    for (let k = 0; k < 5; k++) { const q = P(k * 2 + 0.5, top - 2 - k % 2 * 2, 1.2); K.spike('ice', q[0], q[1], q[2], 0.3, -2.4 - (k % 3), 4, k); }
  },

  // ---- the Drowned Vaults ----
  // A slab of the old causeway, tipped and sunk at one end.
  slab(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), tip = p.tip ?? 0.5, hx = 2.4, hz = 1.6;
    const q = (u, w, v) => [x + u * c + w * s, y + v, z - u * s + w * c];
    K.quad('pale:stone', q(-hx, -hz, -0.25), q(-hx, hz, -0.25), q(hx, hz, tip), q(hx, -hz, tip));
    K.quad('pale:rubble', q(hx, -hz, tip), q(hx, hz, tip), q(hx, hz, tip - 0.4), q(hx, -hz, tip - 0.4));
    K.quad('pale:rubble', q(-hx, hz, -0.25), q(-hx, hz, -0.6), q(hx, hz, tip - 0.4), q(hx, hz, tip));
    K.quad('pale:rubble', q(-hx, -hz, -0.6), q(-hx, -hz, -0.25), q(hx, -hz, tip), q(hx, -hz, tip - 0.4));
  },
  // A hole the Leviathan has left: a round of floor gone soft and dark, its lip heaved up. (What its eruptions leave in
  // its own fight looks the same on the ground: met here first.)
  sinkhole(K, d, p, x, y, z) {
    K.disc('dark:rubble', x, y + 0.05, z, p.r, 14);
    K.disc('lake', x, y + 0.07, z, p.r * 0.6, 12);
    for (let k = 0; k < 9; k++) { const a = k * 0.698 + x; K.drum('mire:rubble', x + Math.cos(a) * p.r, y - 0.15, z + Math.sin(a) * p.r, 0.55, 0.4 + 0.2 * (k % 2), 5, { r2: 0.3, collide: false, turn: a }); }
  },
  // Reeds standing out of the water: a clump of thin stems, a few with heads.
  reeds(K, d, p, x, y, z) {
    const n = Math.round(6 + p.r * 4);
    for (let k = 0; k < n; k++) {
      const a = hash2(k, (x | 0) + 7) * TAU, o = Math.sqrt(hash2(k + 3, z | 0)) * p.r, h = 1.1 + hash2(k, k + 5) * 1.3, px = x + Math.cos(a) * o, pz = z + Math.sin(a) * o;
      rod(K, 'cloth_oat', px, y - 0.1, pz, px + (hash2(k, 2) - 0.5) * 0.5, y + h, pz + (hash2(k, 4) - 0.5) * 0.5, 0.018);
      if (k % 3 === 0) K.drum('bark', px + (hash2(k, 2) - 0.5) * 0.5, y + h - 0.1, pz + (hash2(k, 4) - 0.5) * 0.5, 0.05, 0.3, 4, NO);
    }
  },
  // The toll's bar across the way, on its two posts, one end down.
  tollbar(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    for (const u of [-p.w, p.w]) K.box('wood', x + u * c, y - 0.2, z - u * s, 0.14, 1.5, 0.14, p.yaw, NO);
    rod(K, 'wood', x - p.w * c, y + 1.2, z + p.w * s, x + p.w * c, y + 0.3, z - p.w * s, 0.09);
    K.box('iron', x - p.w * c, y + 1.25, z + p.w * s, 0.2, 0.2, 0.2, p.yaw, NO);
  },
  // A boat's ribs and keel, on its side, what's left of its planking.
  wreck(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), S = p.s || 1;
    rod(K, 'wood', x - s * 2.6 * S, y + 0.1, z - c * 2.6 * S, x + s * 2.6 * S, y + 0.25, z + c * 2.6 * S, 0.12 * S);
    for (let k = -3; k <= 3; k++) {
      const bx = x + s * k * 0.75 * S, bz = z + c * k * 0.75 * S, w = (1 - Math.abs(k) / 5) * 1.2 * S;
      rod(K, 'wood', bx, y + 0.15, bz, bx + c * w, y + 0.9 * S, bz - s * w, 0.05 * S);
      if (k % 2) rod(K, 'wood', bx, y + 0.15, bz, bx - c * w * 0.8, y + 0.5 * S, bz + s * w * 0.8, 0.05 * S);
    }
    K.quad('wood', [x - s * 2 * S + c * 0.9 * S, y + 0.7 * S, z - c * 2 * S - s * 0.9 * S], [x + s * 0.4 * S + c * 1.1 * S, y + 0.8 * S, z + c * 0.4 * S - s * 1.1 * S], [x + s * 0.4 * S + c * 0.5 * S, y + 0.3 * S, z + c * 0.4 * S - s * 0.5 * S], [x - s * 2 * S + c * 0.4 * S, y + 0.25 * S, z - c * 2 * S - s * 0.4 * S]);
  },
  // The toll's bell, fallen: bronze gone green, its mouth half under.
  bell(K, d, p, x, y, z) {
    const S = p.s || 1;
    K.drum('mire:stone', x, y - 0.3 * S, z, 1.0 * S, 1.3 * S, 10, { r2: 0.55 * S, collide: false, turn: x });
    K.drum('mire:stone', x, y + 1.0 * S, z, 0.55 * S, 0.3 * S, 10, { r2: 0.2 * S, collide: false });
    K.drum('iron', x, y + 1.3 * S, z, 0.1 * S, 0.3 * S, 5, NO);
    K.box('wood', x + 0.9 * S, y - 0.1, z + 0.6 * S, 1.6 * S, 0.22, 0.16 * S, 0.5, NO);
  },
  // The strongroom's door: iron on oak, off one hinge, leaning in its frame.
  strongdoor(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), w = p.w;
    for (const u of [-w, w]) K.box('rubble', x + u * c, y - 0.3, z - u * s, 0.3, 3.4, 0.3, p.yaw || 0, NO);
    K.box('rubble', x, y + 3, z, w + 0.3, 0.45, 0.32, p.yaw || 0, NO);
    K.box('wood', x - w * 0.35 * c + 0.5 * s, y, z + w * 0.35 * s + 0.5 * c, w * 0.6, 2.8, 0.1, (p.yaw || 0) + 0.5, NO);
    for (const h of [0.5, 1.4, 2.3]) K.box('iron', x - w * 0.35 * c + 0.56 * s, y + h, z + w * 0.35 * s + 0.56 * c, w * 0.62, 0.12, 0.03, (p.yaw || 0) + 0.5, NO);
  },
  // Rock standing out of the water: a flat-topped boss of it, dry.
  rock(K, d, p, x, y, z) {
    K.drum(p.layer || 'pale:rubble', x, y - 1.3, z, p.r * 1.1, 1.3, 14, { r2: p.r, open: true, collide: false, turn: x });
    K.disc(p.layer || 'pale:rubble', x, y + 0.02, z, p.r, 18);
    for (let k = 0; k < 5; k++) { const a = k * 1.26 + z; K.drum(p.layer || 'pale:rubble', x + Math.cos(a) * p.r * 1.05, y - 0.5, z + Math.sin(a) * p.r * 1.05, 0.7, 0.5, 5, { r2: 0.4, collide: false, turn: a }); }
  },
  // A sluice: two piers and a gate of timber between them, lifted; the other gate lying where it fell.
  sluicegate(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), w = p.w;
    for (const u of [-w, w]) K.box('pale:rubble', x + u * c, y - 0.4, z - u * s, 0.5, 4.2, 0.5, p.yaw, NO);
    K.box('wood', x, y + 3.6, z, w + 0.6, 0.3, 0.3, p.yaw, NO);
    K.box('wood', x, y + 1.9, z, w - 0.5, 1.8, 0.08, p.yaw, NO);
    for (const u of [-w * 0.5, w * 0.5]) K.box('iron', x + u * c, y + 3.6, z - u * s, 0.04, 0.9, 0.04, p.yaw, NO);
    K.box('wood', x + 2.2 * s + 0.6 * c, y - 0.05, z + 2.2 * c - 0.6 * s, w - 0.6, 0.14, 1, p.yaw + 0.4, NO);
  },

  // ---- the Sporehold ----
  // A clump of caps: n of them, the biggest s tall.
  caps(K, d, p, x, y, z) {
    for (let k = 0; k < p.n; k++) {
      const a = k * 2.4 + x, o = k ? 0.5 + hash2(k, x | 0) * 1.4 * (p.s + 0.4) : 0, h = p.s * (1.5 - k * 0.16) + 0.15, px = x + Math.cos(a) * o, pz = z + Math.sin(a) * o, py = caveFloorY(px, pz);
      K.drum('cloth_oat', px, py - 0.1, pz, 0.06 + h * 0.07, h + 0.1, 5, { r2: 0.04 + h * 0.05, collide: false });
      K.drum('fruit', px, py + h - 0.05, pz, 0.2 + h * 0.42, 0.1 + h * 0.06, 7, { r2: 0.16 + h * 0.34, collide: false });
      K.cone('fruit', px, py + h + 0.05 + h * 0.06, pz, 0.16 + h * 0.34, 0.14 + h * 0.2, 7, a);
    }
  },
  // A cap the height of a house: a stem a body can hide behind, gills that give light (the room's own: braziers()).
  greatcap(K, d, p, x, y, z) {
    const h = p.h, r = p.r, top = Math.min(y + h, caveRoofY(x, z) - 0.6), R = r * 3.4;
    K.drum('cloth_oat', x, y - 0.3, z, r * 1.25, top - y + 0.3, 9, { r2: r * 0.7, open: true, collide: false, turn: x });
    // (Its gills alight: a rim of it under the cap's edge and a collar round the stem, not the whole underside, which
    // seen from below was a white ceiling.)
    K.drum(d.look.flame, x, top - 0.32, z, R * 0.93, 0.16, 12, { open: true, collide: false });
    K.drum(d.look.flame, x, top - 0.3, z, r * 1.5, 0.1, 9, { collide: false });
    K.drum('cloth_oat', x, top - 0.18, z, R * 0.92, 0.04, 12, { collide: false });
    K.drum('fruit', x, top - 0.15, z, R, 0.5, 12, { r2: R * 0.8, collide: false });
    K.cone('fruit', x, top + 0.35, z, R * 0.8, 1.1 + h * 0.08, 12, x);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + z; K.drum('fruit', x + Math.cos(a) * r * 1.2, y + 1.2 + k * 0.9, z + Math.sin(a) * r * 1.2, 0.6, 0.12, 6, { r2: 0.4, collide: false, turn: a }); }
  },
  // Shelves of bracket fungus stepping up a wall: n of them, out from it along yaw.
  bracket(K, d, p, x, y, z) {
    const c = Math.sin(p.yaw), s = Math.cos(p.yaw);
    for (let k = 0; k < p.n; k++) {
      const px = x + s * (k - (p.n - 1) / 2) * 1.1 + c * 0.3 * (k % 2), pz = z - c * (k - (p.n - 1) / 2) * 1.1 + s * 0.3 * (k % 2);
      K.drum('fruit', px, y + 0.5 + k * 0.55, pz, 0.95, 0.16, 7, { r2: 0.7, collide: false, turn: k });
      K.drum(d.look.flame, px, y + 0.46 + k * 0.55, pz, 0.8, 0.05, 7, { collide: false, turn: k });
    }
  },
  // Roots come down through the roof and into the floor.
  roots(K, d, p, x, y, z) {
    const top = caveRoofY(x, z) + 0.3;
    for (let k = 0; k < 5; k++) {
      const a = k * 1.26 + x, o = p.r * (0.3 + 0.7 * hash2(k, z | 0)), bx = x + Math.cos(a) * o, bz = z + Math.sin(a) * o, by = caveFloorY(bx, bz);
      const mx = x + Math.cos(a + 0.6) * o * 0.5, mz = z + Math.sin(a + 0.6) * o * 0.5, my = by + (top - by) * 0.5;
      rod(K, 'bark', bx, by - 0.2, bz, mx, my, mz, 0.09 + 0.05 * (k % 2)); rod(K, 'bark', mx, my, mz, x + Math.cos(a) * 0.4, top, z + Math.sin(a) * 0.4, 0.13);
    }
  },
  // Someone who came to look, and was kept: stood rooted, caps grown out of the shoulders.
  husk(K, d, p, x, y, z) {
    K.drum('cloth_oat', x, y - 0.1, z, 0.34, 0.9, 6, { r2: 0.2, collide: false, turn: x });
    K.drum('cloth_oat', x, y + 0.8, z, 0.2, 0.75, 6, { r2: 0.26, collide: false, turn: z });
    K.drum('pale:stone', x, y + 1.55, z, 0.13, 0.24, 6, { r2: 0.11, collide: false });
    for (const [ox, oz, h] of [[0.22, 0.05, 1.5], [-0.2, 0.1, 1.35], [0.05, -0.12, 1.8]]) { K.drum('fruit', x + ox, y + h, z + oz, 0.2, 0.06, 6, { r2: 0.15, collide: false }); K.cone('fruit', x + ox, y + h + 0.06, z + oz, 0.15, 0.12, 6); }
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + x; rod(K, 'white', x, y + 0.4, z, x + Math.cos(a) * 0.9, y + 0.02, z + Math.sin(a) * 0.9, 0.012); }
  },
  // A bed of hair, thread and what was dragged in.
  nest(K, d, p, x, y, z) {
    K.drum('cloth_oat', x, y - 0.15, z, p.r, 0.45, 10, { r2: p.r * 0.8, open: true, collide: false, turn: x });
    K.disc('dark:cloth_oat', x, y + 0.12, z, p.r * 0.8, 10);
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + z; rod(K, 'white', x + Math.cos(a) * p.r * 0.9, y + 0.3, z + Math.sin(a) * p.r * 0.9, x + Math.cos(a + 1.3) * p.r * 1.2, y + 0.04, z + Math.sin(a + 1.3) * p.r * 1.2, 0.014); }
  },
  // Pods in a bed: fat ones, ripening, a cap or two among them.
  podbed(K, d, p, x, y, z) {
    K.drum('dark:rubble', x, y - 0.2, z, p.r, 0.34, 9, { r2: p.r * 0.92, collide: false, turn: x });
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + x, o = k ? p.r * 0.6 : 0; egg(K, k % 3 ? 'fruit' : d.look.flame, x + Math.cos(a) * o, y + 0.1, z + Math.sin(a) * o, 0.3 + 0.08 * (k % 2), 0.6 + 0.2 * (k % 3), a); }
  },
  // The growth itself, come up through the floor: a knot of it as thick as a tower, lit from inside.
  heartroot(K, d, p, x, y, z) {
    const top = caveRoofY(x, z) + 0.4, r = p.r;
    K.drum('bark', x, y - 0.3, z, r * 1.5, (top - y) * 0.4, 9, { r2: r * 0.8, open: true, collide: false, turn: 1 });
    K.drum('bark', x, y - 0.3 + (top - y) * 0.4, z, r * 0.8, (top - y) * 0.6 + 0.3, 9, { r2: r * 1.7, open: true, collide: false, turn: 1 });
    for (let k = 0; k < 8; k++) {
      const a = k * 0.785, R = 9 + (k % 3) * 4, ex = x + Math.cos(a) * R, ez = z + Math.sin(a) * R;
      rod(K, 'bark', x + Math.cos(a) * r, y + 1.4, z + Math.sin(a) * r, ex, caveFloorY(ex, ez) - 0.1, ez, 0.16);
      K.drum(d.look.flame, x + Math.cos(a) * r * 1.1, y + 1.2 + k * 0.5, z + Math.sin(a) * r * 1.1, 0.5, 0.1, 6, NO);
      K.drum('fruit', x + Math.cos(a) * r * 1.1, y + 1.28 + k * 0.5, z + Math.sin(a) * r * 1.1, 0.6, 0.14, 6, { r2: 0.42, collide: false });
    }
  },
  // A ring of small caps on the floor: where a husk stands rooted to feed the Heart.
  rootring(K, d, p, x, y, z) {
    for (let k = 0; k < 9; k++) { const a = k * 0.698, px = x + Math.cos(a) * p.r, pz = z + Math.sin(a) * p.r; K.drum('cloth_oat', px, y - 0.05, pz, 0.05, 0.3, 4, NO); K.cone('fruit', px, y + 0.22, pz, 0.16, 0.14, 6); }
    for (let k = 0; k < 3; k++) { const a = k * 2.1; rod(K, 'bark', x + Math.cos(a) * 0.3, y + 0.05, z + Math.sin(a) * 0.3, x + Math.cos(a) * p.r * 2.4, y + 0.03, z + Math.sin(a) * p.r * 2.4, 0.07); }
  },

  // ---- the Hollow Playhouse ----
  // The doors of the House, shut and chained: w half their width, h their height.
  housedoors(K, d, p, x, y, z) {
    K.quad('door_5', [x - p.w, y, z], [x + p.w, y, z], [x + p.w, y + p.h, z], [x - p.w, y + p.h, z], [0, 0, 1], [[0, 1], [2, 1], [2, 0], [0, 0]]);
    K.box('wood', x, y + p.h, z, p.w + 0.3, 0.3, 0.2, 0, NO);
    rod(K, 'iron', x - 1, y + 1.5, z + 0.12, x + 1, y + 1.1, z + 0.12, 0.04); rod(K, 'iron', x - 1, y + 1.1, z + 0.12, x + 1, y + 1.5, z + 0.12, 0.04);
  },
  // A mark chalked on the boards: where a player stands.
  stagemark(K, d, p, x, y, z) { rod(K, 'white', x - 0.4, y + 0.03, z - 0.4, x + 0.4, y + 0.03, z + 0.4, 0.04); rod(K, 'white', x - 0.4, y + 0.03, z + 0.4, x + 0.4, y + 0.03, z - 0.4, 0.04); },
  // The box office: a counter with a grille over it.
  counter(K, d, p, x, y, z) {
    K.box('wood', x, y, z, p.hx, 1.1, p.hz, 0, NO);
    K.box('wood', x, y + 1.1, z, p.hx + 0.12, 0.08, p.hz + 0.1, 0, NO);
    for (let u = -p.hz + 0.2; u <= p.hz - 0.19; u += 0.4) K.box('iron', x + p.hx - 0.1, y + 1.18, z + u, 0.02, 1.1, 0.02, 0, NO);
    K.box('wood', x + p.hx - 0.1, y + 2.28, z, 0.06, 0.1, p.hz, 0, NO);
  },
  // A playbill pasted to the wall, facing yaw out from it. (No letters: a border and a block of colour.)
  playbill(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), q = (u, h, o) => [x + u * c + o * s, y + h, z - u * s + o * c];
    K.quad('cloth_oat', q(-0.7, 1.1, 0.03), q(0.7, 1.1, 0.03), q(0.7, 3, 0.03), q(-0.7, 3, 0.03), [s, 0, c]);
    K.quad('spore:cloth_oat', q(-0.5, 1.9, 0.05), q(0.5, 1.9, 0.05), q(0.5, 2.8, 0.05), q(-0.5, 2.8, 0.05), [s, 0, c]);
  },
  // A portrait in a frame, facing yaw out from the wall: a face that's gone dark.
  portrait(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), q = (u, h, o) => [x + u * c + o * s, y + h, z - u * s + o * c];
    K.quad('wood', q(-0.8, 1.5, 0.03), q(0.8, 1.5, 0.03), q(0.8, 3.7, 0.03), q(-0.8, 3.7, 0.03), [s, 0, c]);
    K.quad('dark:cloth_oat', q(-0.62, 1.68, 0.06), q(0.62, 1.68, 0.06), q(0.62, 3.52, 0.06), q(-0.62, 3.52, 0.06), [s, 0, c]);
  },
  // A rail of coats: two posts, a bar, what hangs from it.
  coatrail(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), w = p.hx;
    for (const u of [-w, w]) K.box('wood', x + u * c, y, z - u * s, 0.05, 1.8, 0.05, 0, NO);
    rod(K, 'wood', x - w * c, y + 1.8, z + w * s, x + w * c, y + 1.8, z - w * s, 0.03);
    for (let u = -w + 0.35; u < w; u += 0.55) {
      const k = Math.round(u * 7), layer = ['dark:cloth_oat', 'spore:cloth_oat', 'cloth_oat', 'dark:cloth_oat'][((k % 4) + 4) % 4];
      K.box(layer, x + u * c, y + 0.55 + 0.12 * (((k % 3) + 3) % 3), z - u * s, 0.2, 1.15, 0.09, (p.yaw || 0) + 1.57, NO);
    }
  },
  // A plinth for one of the company to stand on.
  plinth(K, d, p, x, y, z) { K.box('wood', x, y, z, 0.6, 0.12, 0.6, 0, NO); K.box('spore:cloth_oat', x, y + 0.12, z, 0.5, 0.03, 0.5, 0, NO); },
  // A box on the wall of the House, facing yaw out from it: a balcony front, curtains either side.
  box(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), q = (u, o) => [x + u * c + o * s, z - u * s + o * c];
    { const [px, pz] = q(0, 0.5); K.box('wood', px, y + 4, pz, 2.4, 0.18, 0.9, p.yaw, NO); K.box('wood', px + s * 0.5, y + 4.18, pz + c * 0.5, 2.4, 0.95, 0.08, p.yaw, NO); }
    for (const u of [-2.3, 2.3]) { const [px, pz] = q(u, 0.25); K.box('spore:cloth_oat', px, y + 4.2, pz, 0.35, 3.3, 0.12, p.yaw, NO); }
    { const [px, pz] = q(0, 0.2); K.box('spore:cloth_oat', px, y + 7.2, pz, 2.6, 0.5, 0.14, p.yaw, NO); }
  },
  // The house curtain, drawn up to one side: folds of it from the roof down.
  curtain(K, d, p, x, y, z) {
    const n = 5;
    for (let k = 0; k < n; k++) { const u = (k - (n - 1) / 2) * p.w * 2 / n; K.box(k % 2 ? 'spore:cloth_oat' : 'dark:cloth_oat', x + u, y, z + (k % 2) * 0.22, p.w / n + 0.05, p.h, 0.12, 0, NO); }
  },
  // And across the top of the arch: a swag of it.
  swag(K, d, p, x, y, z) {
    const N = 8;
    for (let k = 0; k < N; k++) {
      const u0 = (k / N * 2 - 1) * p.w, u1 = ((k + 1) / N * 2 - 1) * p.w, d0 = Math.abs(Math.sin(k * Math.PI / 2)) * 0.9, d1 = Math.abs(Math.sin((k + 1) * Math.PI / 2)) * 0.9;
      K.quad('spore:cloth_oat', [x + u0, y + p.up + 1.4, z], [x + u1, y + p.up + 1.4, z], [x + u1, y + p.up - d1, z], [x + u0, y + p.up - d0, z], [0, 0, 1]);
      K.quad('spore:cloth_oat', [x + u1, y + p.up + 1.4, z], [x + u0, y + p.up + 1.4, z], [x + u0, y + p.up - d0, z], [x + u1, y + p.up - d1, z], [0, 0, -1]);
    }
  },
  // A footlight at the lip of the stage: a shell of tin with a flame in it (the stage's own light: braziers()).
  footlight(K, d, p, x, y, z) {
    K.drum('iron', x, y, z, 0.2, 0.12, 6, NO); K.quad('iron', [x - 0.3, y, z + 0.25], [x + 0.3, y, z + 0.25], [x + 0.3, y + 0.5, z + 0.3], [x - 0.3, y + 0.5, z + 0.3], [0, 0, -1]);
    K.cone('flame', x, y + 0.12, z, 0.1, 0.34, 5);
  },
  // The backcloth: a painted wood, hung flat across the back of the stage.
  backdrop(K, d, p, x, y, z) {
    K.quad('pine_far', [x - p.w, y + 0.3, z], [x + p.w, y + 0.3, z], [x + p.w, y + p.h, z], [x - p.w, y + p.h, z], [0, 0, 1], [[0, 1], [2, 1], [2, 0], [0, 0]]);
    K.box('wood', x, y + p.h, z, p.w + 0.3, 0.14, 0.08, 0, NO); K.box('wood', x, y + 0.16, z, p.w + 0.3, 0.14, 0.08, 0, NO);
  },
  // A flat: canvas on a frame, braced from behind, painted as a tree or a wall.
  flat(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), q = (u, h, o = 0) => [x + u * c + o * s, y + h, z - u * s + o * c];
    K.quad('leaves_2', q(-p.w, 0), q(p.w, 0), q(p.w, p.h), q(-p.w, p.h), null, [[0, 1], [1, 1], [1, 0], [0, 0]]);
    K.quad('cloth_oat', q(p.w, 0, -0.04), q(-p.w, 0, -0.04), q(-p.w, p.h, -0.04), q(p.w, p.h, -0.04));
    rod(K, 'wood', ...q(0, p.h * 0.7, -0.05), ...q(0, 0, -1.6), 0.05);
  },
  // Ropes down from the flies, a sandbag on each.
  rigging(K, d, p, x, y, z) {
    const top = caveRoofY(x, z);
    for (const [ox, oz, h] of [[0, 0, 2.6], [0.9, 0.3, 4.2], [-0.6, 0.7, 3.3]]) { rod(K, 'cloth_oat', x + ox, top, z + oz, x + ox, y + h, z + oz, 0.02); K.drum('cloth_oat', x + ox, y + h - 0.5, z + oz, 0.16, 0.5, 6, { r2: 0.1, collide: false }); }
    K.box('wood', x, top - 0.5, z, 1.4, 0.16, 0.12, 0.3, NO);
  },
  // A dress form on its stand, half a costume pinned to it: thick enough to stand behind.
  dressform(K, d, p, x, y, z) {
    const r = p.r;
    K.drum('wood', x, y, z, r * 0.9, 0.14, 8, NO); K.drum('wood', x, y + 0.14, z, 0.09, 0.9, 6, NO);
    K.drum('cloth_oat', x, y + 1.0, z, r * 0.62, 0.7, 8, { r2: r * 0.86, collide: false }); K.drum('cloth_oat', x, y + 1.7, z, r * 0.86, 0.5, 8, { r2: r * 0.5, collide: false });
    K.drum('spore:cloth_oat', x, y + 0.3, z, r * 1.25, 0.75, 9, { r2: r * 0.66, open: true, collide: false });
    K.drum('wood', x, y + 2.2, z, 0.1, 0.16, 6, NO);
  },
  // Bolts of cloth stood on end and stacked.
  bolts(K, d, p, x, y, z) {
    for (const [ox, oz, h, l] of [[0, 0, 1.7, 'spore:cloth_oat'], [0.45, 0.2, 1.5, 'cloth_oat'], [-0.3, 0.45, 1.6, 'dark:cloth_oat'], [0.2, -0.45, 1.3, 'mire:cloth_oat']]) K.drum(l, x + ox, y, z + oz, 0.2, h, 7, NO);
  },
  // A looking-glass in a frame against the wall, facing yaw out from it.
  mirror(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), q = (u, h, o) => [x + u * c + o * s, y + h, z - u * s + o * c];
    K.quad('wood', q(-0.8, 0.9, 0.04), q(0.8, 0.9, 0.04), q(0.8, 2.9, 0.04), q(-0.8, 2.9, 0.04), [s, 0, c]);
    K.quad('ice', q(-0.66, 1.04, 0.07), q(0.66, 1.04, 0.07), q(0.66, 2.76, 0.07), q(-0.66, 2.76, 0.07), [s, 0, c]);
  },
  // A tree for the stage: a trunk of canvas, a flat head of leaves.
  proptree(K, d, p, x, y, z) {
    K.drum('bark', x, y, z, 0.22, 2.6, 6, { r2: 0.16, collide: false }); K.drum('wood', x, y, z, 0.6, 0.1, 6, NO);
    K.quad('leaves_2', [x - 1.4, y + 2.2, z], [x + 1.4, y + 2.2, z], [x + 1.4, y + 4.6, z], [x - 1.4, y + 4.6, z], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    K.quad('leaves_2', [x + 1.4, y + 2.2, z], [x - 1.4, y + 2.2, z], [x - 1.4, y + 4.6, z], [x + 1.4, y + 4.6, z], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  },
  // A cot with high sides.
  cot(K, d, p, x, y, z) {
    K.box('wood', x, y + 0.3, z, 0.55, 0.12, 1, 0, NO); K.box('cloth_oat', x, y + 0.42, z, 0.5, 0.08, 0.95, 0, NO);
    for (const sx of [-1, 1]) for (let u = -0.9; u <= 0.91; u += 0.3) K.box('wood', x + sx * 0.55, y, z + u, 0.025, 1.0, 0.025, 0, NO);
    for (const sx of [-1, 1]) K.box('wood', x + sx * 0.55, y + 1.0, z, 0.03, 0.05, 1, 0, NO);
  },
  // A rocking horse.
  horse(K, d, p, x, y, z) {
    for (const s of [-1, 1]) { rod(K, 'wood', x + s * 0.3, y + 0.12, z - 1, x + s * 0.3, y + 0.02, z, 0.05); rod(K, 'wood', x + s * 0.3, y + 0.02, z, x + s * 0.3, y + 0.12, z + 1, 0.05); }
    K.box('pale:stone', x, y + 0.6, z, 0.2, 0.36, 0.6, 0, NO);
    for (const [u, w] of [[-0.14, -0.45], [0.14, -0.45], [-0.14, 0.45], [0.14, 0.45]]) K.box('pale:stone', x + u, y + 0.1, z + w, 0.045, 0.5, 0.045, 0, NO);
    rod(K, 'pale:stone', x, y + 0.9, z + 0.5, x, y + 1.35, z + 0.8, 0.09); K.box('pale:stone', x, y + 1.25, z + 0.86, 0.09, 0.16, 0.2, 0, NO);
  },
  // Shelves of the finished: rows of small heads, facing yaw out from the wall.
  dollshelf(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    for (let h = 0; h < 4; h++) {
      K.box('wood', x + s * 0.2, y + 0.6 + h * 0.75, z + c * 0.2, 2.4, 0.05, 0.22, p.yaw, NO);
      for (let u = -2.1; u <= 2.11; u += 0.6) K.drum('pale:stone', x + u * c + s * 0.2, y + 0.65 + h * 0.75, z - u * s + c * 0.2, 0.11, 0.26, 5, { r2: 0.13, collide: false });
    }
    for (const u of [-2.4, 2.4]) K.box('wood', x + u * c + s * 0.2, y, z - u * s + c * 0.2, 0.05, 3.2, 0.22, p.yaw, NO);
  },
  // The Dollmaker's music box: a drum on legs, its comb, the key in its side.
  musicbox(K, d, p, x, y, z) {
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.78; K.box('wood', x + Math.cos(a) * p.r * 0.8, y, z + Math.sin(a) * p.r * 0.8, 0.07, 0.5, 0.07, 0, NO); }
    K.drum('wood', x, y + 0.5, z, p.r, 0.7, 12, NO); K.drum('fruit2', x, y + 1.2, z, p.r * 0.7, 0.3, 12, NO);
    for (let k = 0; k < 10; k++) { const a = k * 0.628; K.box('iron', x + Math.cos(a) * p.r * 0.72, y + 1.2, z + Math.sin(a) * p.r * 0.72, 0.02, 0.36, 0.02, 0, NO); }
    rod(K, 'iron', x + p.r, y + 0.85, z, x + p.r + 0.6, y + 0.85, z, 0.04); K.drum('iron', x + p.r + 0.6, y + 0.6, z, 0.25, 0.5, 6, { open: true, collide: false });
  },
  // Arms and legs hung up to dry on a line under the roof.
  limbs(K, d, p, x, y, z) {
    rod(K, 'cloth_oat', x - 3.6, y + p.up, z, x + 3.6, y + p.up - 0.2, z, 0.02);
    for (let u = -3; u <= 3.01; u += 0.75) { const h = 0.5 + 0.25 * Math.abs(Math.sin(u * 3)); rod(K, 'pale:stone', x + u, y + p.up - 0.1, z, x + u + 0.08, y + p.up - 0.1 - h, z + 0.05, 0.045); }
  },

  // ---- the Kingsbarrow ----
  // The slab that shut the door, split and fallen in, across a way: w half its width, h its height.
  doorslab(K, d, p, x, y, z) {
    for (const u of [-p.w - 0.5, p.w + 0.5]) K.box('rubble', x + u, y - 0.3, z, 0.5, p.h + 0.3, 0.5, 0, NO);
    K.box('rubble', x, y + p.h, z, p.w + 1.1, 0.7, 0.6, 0, NO);
    K.box('pale:stone', x - p.w * 0.55, y - 0.1, z + 1.6, p.w * 0.42, 0.3, 1.5, 0.3, NO);
    K.quad('pale:stone', [x + 0.3, y, z + 0.8], [x + p.w, y, z + 0.5], [x + p.w, y + p.h * 0.75, z + 0.15], [x + 0.6, y + p.h * 0.6, z + 0.2]);
  },
  // Round shields hung in a row on a wall, facing yaw out from it: the standing dead's.
  shields(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    for (let k = -2; k <= 2; k++) {
      const px = x + k * 1.5 * c + s * 0.12, pz = z - k * 1.5 * s + c * 0.12;
      K.drum(k % 2 ? 'mire:stone' : 'wood', px, y + 1.9, pz, 0.6, 0.08, 10, { collide: false, turn: p.yaw });
      K.cone('iron', px + s * 0.02, y + 1.98, pz + c * 0.02, 0.16, 0.14, 6);
    }
  },
  // A lintel across a passage, on two uprights: hx (or hz) half its span.
  lintel(K, d, p, x, y, z) {
    const along = p.hx !== undefined, w = along ? p.hx : p.hz, top = Math.min(caveRoofY(x, z) - y - 0.9, 5.2);
    for (const u of [-w + 0.45, w - 0.45]) K.box('rubble', x + (along ? u : 0), y - 0.2, z + (along ? 0 : u), along ? 0.42 : 0.5, top + 0.2, along ? 0.5 : 0.42, 0, NO);
    K.box('pale:rubble', x, y + top, z, along ? w : 0.6, 0.7, along ? 0.6 : w, 0, NO);
  },
  // A funeral urn, lidded, an offering beside it.
  urn(K, d, p, x, y, z) {
    K.drum('pale:rubble', x, y, z, 0.2, 0.34, 8, { r2: 0.38, collide: false }); K.drum('pale:rubble', x, y + 0.34, z, 0.38, 0.4, 8, { r2: 0.22, collide: false });
    K.drum('pale:rubble', x, y + 0.74, z, 0.24, 0.07, 8, NO); K.drum('rubble', x + 0.5, y, z + 0.2, 0.16, 0.08, 6, NO);
  },
  // One of the Warden's standing stones: rough, as tall as three men. Its foot always stands; the rest of it is scenery that
  // can go (<tag>_stone_<n>) and what it leaves when it's broken scenery that can come (<tag>_rubble_<n>): a snapped head
  // on the stump and its pieces lying round. (src/core/sites.js Kit.group; what stops a body stays the whole stone's round.)
  wardstone(K, d, p, x, y, z) {
    const r = p.r, cut = 1.5, tall = 5.6, at = (h) => r * (1.1 - 0.3 * h / tall);
    K.drum('rubble', x, y - 0.3, z, at(0), cut, 7, { r2: at(cut), collide: false, turn: x });
    K.group(`${d.tag}_stone_${p.n}`, true, () => {
      K.drum('rubble', x, y - 0.3 + cut, z, at(cut), tall - cut, 7, { r2: at(tall), collide: false, turn: x });
      K.drum('pale:stone', x, y + 3.4, z, at(3.7) + 0.06, 0.22, 7, { open: true, collide: false, turn: x });
    });
    K.group(`${d.tag}_rubble_${p.n}`, false, () => {
      // (The break: a slanted stub left on the stump, paler inside than out.)
      K.drum('pale:stone', x + 0.15, y - 0.3 + cut, z - 0.1, at(cut) * 0.92, 0.75, 5, { r2: at(cut) * 0.3, collide: false, turn: x + 0.7 });
      // (Its pieces: the big ones where it fell, toward the middle of the hall, and smaller ones thrown wider.)
      for (let i = 0; i < 9; i++) {
        const a = hash2(p.n * 7 + i, 3) * Math.PI * 2, far = r + 0.5 + hash2(p.n * 7 + i, 5) * 2.6, big = i < 3 ? 0.62 : 0.26 + hash2(i, p.n) * 0.2;
        const px = x + Math.sin(a) * far, pz = z + Math.cos(a) * far;
        K.rock(i % 3 ? 'rubble' : 'pale:stone', px, pz, big, big * (0.6 + hash2(i, 9) * 0.5), { y: caveFloorY(px, pz) - 0.08, collide: false, turn: a * 3 });
      }
    });
  },
  // A standing stone with a ring cut round it.
  ringstone(K, d, p, x, y, z) {
    K.box('rubble', x, y - 0.3, z, p.r, 2.9, p.r * 0.7, x, NO);
    K.box('pale:stone', x, y + 1.9, z, p.r + 0.04, 0.16, p.r * 0.7 + 0.04, x, NO);
  },
  // A bier: a slab on two stones, and who lies on it under a cloth gone to threads. (king: his, larger, with his blade.)
  bier(K, d, p, x, y, z) {
    const long = p.hz >= p.hx, a = long ? p.hz : p.hx, b = long ? p.hx : p.hz, yaw = long ? 0 : Math.PI / 2;
    for (const u of [-a * 0.6, a * 0.6]) K.box('rubble', x + (long ? 0 : u), y, z + (long ? u : 0), b * 0.8, 0.6, 0.3, yaw, NO);
    K.box('pale:stone', x, y + 0.6, z, b, 0.25, a, yaw, NO);
    K.box('cloth_oat', x, y + 0.85, z, b * 0.7, 0.2, a * 0.82, yaw, NO);
    skull(K, x + (long ? 0 : -a * 0.7), y + 0.85, z + (long ? -a * 0.7 : 0), 0.16);
    if (p.king) { rod(K, 'iron', x - a * 0.6, y + 1.08, z, x + a * 0.7, y + 1.08, z, 0.05); K.drum('fruit2', x - a * 0.72, y + 1.0, z, 0.2, 0.12, 8, { open: true, collide: false }); }
  },
  // What was buried with them: cups, a mirror, combs, rings, laid out on the floor.
  gravegoods(K, d, p, x, y, z) {
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + x, o = p.r * (0.3 + 0.7 * hash2(k, z | 0)), px = x + Math.cos(a) * o, pz = z + Math.sin(a) * o;
      if (k % 3 === 0) K.drum('fruit2', px, y, pz, 0.1, 0.22, 6, { r2: 0.16, collide: false });
      else if (k % 3 === 1) K.drum('mire:stone', px, y, pz, 0.22, 0.04, 8, NO);
      else K.box('pale:stone', px, y, pz, 0.16, 0.05, 0.05, a, NO);
    }
  },
  // Long bones stacked to head height against a wall, a row of skulls along the top, facing yaw out from it.
  bonestack(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    K.box('pale:stone', x + s * 0.4, y, z + c * 0.4, 3.2, 1.9, 0.4, p.yaw, NO);
    for (let h = 0; h < 5; h++) for (let u = -3; u <= 3.01; u += 0.5) K.drum('pale:rubble', x + u * c + s * 0.82, y + 0.2 + h * 0.36, z - u * s + c * 0.82, 0.09, 0.03, 5, NO);
    for (let u = -2.8; u <= 2.81; u += 0.7) skull(K, x + u * c + s * 0.45, y + 1.9, z - u * s + c * 0.45, 0.15, u);
  },
  // One of the guard who was shut in standing: in his niche still, mail gone green, spear grounded, facing yaw out from the wall.
  deadguard(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    K.box('rubble', x - s * 0.1, y, z - c * 0.1, 0.7, 2.5, 0.12, p.yaw, NO);
    K.drum('mire:stone', x + s * 0.3, y, z + c * 0.3, 0.3, 0.95, 6, { r2: 0.24, collide: false });
    K.drum('mire:stone', x + s * 0.3, y + 0.95, z + c * 0.3, 0.26, 0.6, 6, { r2: 0.3, collide: false });
    skull(K, x + s * 0.3, y + 1.58, z + c * 0.3, 0.14, p.yaw);
    K.cone('mire:stone', x + s * 0.3, y + 1.78, z + c * 0.3, 0.17, 0.2, 6);
    rod(K, 'wood', x + s * 0.4 + c * 0.42, y, z + c * 0.4 - s * 0.42, x + s * 0.4 + c * 0.42, y + 2.5, z + c * 0.4 - s * 0.42, 0.025);
    K.cone('iron', x + s * 0.4 + c * 0.42, y + 2.5, z + c * 0.4 - s * 0.42, 0.06, 0.34, 4);
  },
  // A pier of stacked bone standing out from a wall: long bones laid in courses, a row of skulls on top. Solid.
  bonepier(K, d, p, x, y, z) {
    K.box('pale:stone', x, y, z, p.hx, 2.6, p.hz, 0, NO);
    for (let h = 0; h < 6; h++) for (const s of [-1, 1]) for (let u = -p.hx + 0.3; u <= p.hx - 0.29; u += 0.5) K.drum('pale:rubble', x + u, y + 0.25 + h * 0.4, z + s * (p.hz + 0.02), 0.09, 0.03, 5, NO);
    for (let u = -p.hx + 0.4; u <= p.hx - 0.39; u += 0.7) skull(K, x + u, y + 2.6, z, 0.15, u);
  },
  // A hound's bones on their side, the collar still on.
  houndbones(K, d, p, x, y, z) {
    ribs(K, x, y - 0.25, z, 0.42, p.yaw, 4);
    const c = Math.sin(p.yaw), s = Math.cos(p.yaw);
    skull(K, x + c * 1.0, y, z + s * 1.0, 0.13, p.yaw); K.drum('mire:stone', x + c * 0.78, y, z + s * 0.78, 0.14, 0.05, 7, { open: true, collide: false });
    rod(K, 'pale:stone', x - c * 0.8, y + 0.04, z - s * 0.8, x - c * 1.5, y + 0.04, z - s * 1.5 + 0.2, 0.03);
  },
  // A chain from the roof to a ring in the floor, broken part way.
  chain(K, d, p, x, y, z) {
    const top = caveRoofY(x, z);
    K.box('iron', x, y + p.up * 0.45, z, 0.045, top - y - p.up * 0.45, 0.045, 0.4, NO);
    K.drum('iron', x, y, z, 0.3, 0.08, 8, { open: true, collide: false }); rod(K, 'iron', x, y + 0.05, z, x + 1.4, y + 0.05, z + 0.9, 0.05);
  },
};
export const PROP_KINDS = Object.keys(PROPS);

// ---- all of it -----------------------------------------------------------------------------------------------------------------

// portalWall: src/core/sites.js's, for the two portals inside each (the way back out by the way in, and the way out past
// its last boss), each with its back to the rock at the edge of its room, facing into it.
// (only: just these delves, for tools/dungeon/check.mjs to count each one's triangles.)
export function buildDelves(K, portalWall, only = DELVES) {
  for (const d of only) {
    if (d.style === 'castle') castleShell(K, d); else caveShell(K, d);
    fires(K, d);
    for (const p of d.props) {
      const x = d.x + p.x, z = d.z + p.z, make = PROPS[p.kind];
      if (!make) throw new Error(`delve-build: no builder for a prop of kind ${p.kind} (${d.key})`);
      make(K, d, p, x, caveFloorY(x, z), z);
    }
    portalWall(K, d.x + d.exitIn.x, d.z + d.exitIn.z, d.exitIn.yaw ?? Math.PI, `${d.tag}_in`, caveFloorY);
    portalWall(K, d.x + d.exitOut.x, d.z + d.exitOut.z, d.exitOut.yaw ?? 0, `${d.tag}_out`, caveFloorY);
  }
}
