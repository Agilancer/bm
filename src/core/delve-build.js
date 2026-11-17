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
import { dress } from './delve-dress.js';
import { DELVES, DUNGEON_CELL, GRID_UNIT, braziers, caveFloorY, caveRoofY, caveRoom, grid, torches } from './dungeon.js';

const TAU = Math.PI * 2;
const NO = { collide: false };

// ---- the shell ------------------------------------------------------------------------------------------------------------

const SEGS = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] };
export const grad = (x, z) => { const e = 0.3, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1; return [gx / L, gz / L]; };
// How far a thing standing in a room reaches (as the field has it): what the walls leave alone, since it's drawn as itself.
const drawn = (d) => d.props.filter((p) => p.solid);
export const nearProp = (list, lx, lz, pad) => list.some((p) => (p.hx !== undefined ? Math.max(Math.abs(lx - p.x) - p.hx, Math.abs(lz - p.z) - p.hz) : Math.hypot(lx - p.x, lz - p.z) - p.r) < pad);

// The wall's line, a metre at a time: marching squares on the field. each(ax, az, bx, bz) for every piece of it.
export function outline(d, each) {
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

// A stalagmite (h below zero: a stalactite): a thick root narrowing by a shoulder to a point, a little off its own line,
// where it was a plain pyramid.
function tooth(K, layer, x, y, z, r, h, turn) {
  // (A flared collar where it meets the rock, a body in two lengths with a kink between them, a point.)
  const k1 = 0.3 + 0.1 * hash2(x * 3, z * 5), k2 = 0.68 + 0.1 * hash2(z * 3, x * 5), ox = (hash2(x, z * 7) - 0.5) * r * 0.7, oz = (hash2(z, x * 7) - 0.5) * r * 0.7;
  K.drum(layer, x, y, z, r * 1.3, h * 0.1, 6, { r2: r, open: true, collide: false, turn: turn + 0.4 });
  K.drum(layer, x, y + h * 0.08, z, r, h * (k1 - 0.08), 6, { r2: r * 0.62, open: true, collide: false, turn });
  K.drum(layer, x + ox * 0.25, y + h * k1, z + oz * 0.25, r * 0.62, h * (k2 - k1), 5, { r2: r * 0.3, open: true, collide: false, turn: turn + 0.6 });
  K.spike(layer, x + ox * 0.5, y + h * k2, z + oz * 0.5, r * 0.31, h * (1 - k2), 4, turn, [ox / Math.abs(h), oz / Math.abs(h)]);
}

export const roofLump = (x, z) => 1.1 * vnoise(x * 0.33 + 7, z * 0.33 - 3) ** 2 + 0.35 * vnoise(x * 0.9, z * 0.9);

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
    // (And leaning back as it climbs, so the roof springs from further out than the floor ends: a cave's belly, not a wall with a lid.)
    const P = (x, z, gg, y0, y1, k) => { const y = y0 + (y1 - y0) * k, o = lump(x, y, z) * (k > 0.05 && k < 0.95 ? 1 : 0.4) + 0.9 * k * k; return [x - gg[0] * o, y, z - gg[1] * o]; };
    // (Each room's own rock, where it has one; a seam of the next colour low on the wall here and there.)
    const room = nearRoom(d, (ax + bx) / 2, (az + bz) / 2), rock = room?.rock || L.wall, seam = room?.seam || L.seam;
    for (let b = 0; b < BANDS; b++) {
      const k0 = b / BANDS, k1 = (b + 1) / BANDS;
      // (Wound so the face looks out of the rock, into the cave: the field rises that way.)
      const A0 = P(ax, az, ga, fa, ra, k0), B0 = P(bx, bz, gb, fb, rb, k0), B1 = P(bx, bz, gb, fb, rb, k1), A1 = P(ax, az, ga, fa, ra, k1);
      const ux = B0[0] - A0[0], uz = B0[2] - A0[2], nx = -uz, nz = ux;
      // (The upper half in the roof's own stone: the wall goes up into the roof, where it was a wall with a lid on.)
      const layer = b >= 2 ? L.roof : seam && b === 1 && vnoise(ax * 0.09, az * 0.09) > 0.52 ? seam : rock;
      // (The painting runs on from piece to piece: across by whichever of x and z the wall runs along, up by height.)
      const [TW, TH] = tileOf(layer), ax_ = Math.abs(ux) > Math.abs(uz), uv = (q) => [(ax_ ? q[0] : q[2]) / TW, -q[1] / TH];
      if (nx * (ga[0] + gb[0]) + nz * (ga[1] + gb[1]) < 0) K.quad(layer, A0, B0, B1, A1, null, [A0, B0, B1, A1].map(uv)); else K.quad(layer, B0, A0, A1, B1, null, [B0, A0, A1, B1].map(uv));
    }
  });
  // The floor and the roof, two metres a cell, wherever a corner is in the open or near it.
  const F = 4;
  for (let j = 0; j + F < g.H; j += F) {
    for (let i = 0; i + F < g.W; i += F) {
      if (Math.max(f(i, j), f(i + F, j), f(i + F, j + F), f(i, j + F)) < -2.2) continue;
      const pts = [[i, j], [i + F, j], [i + F, j + F], [i, j + F]].map(([a, b]) => [wx(a), wz(b)]);
      // (The roof as it's seen is lumpier than the one the field has, and never lower.)
      const fl = pts.map(([x, z]) => [x, caveFloorY(x, z), z]), rf = pts.map(([x, z]) => [x, caveRoofY(x, z) + roofLump(x, z), z]);
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
    tooth(K, L.stone || 'dark:rubble', x, y - 0.1, z, 0.34 + h * 0.13, h, hash2(i, j) * 3);
    // (A smaller one beside it, as often as not.)
    if (hash2(i * 9, j * 5) > 0.5) { const a = hash2(j, i * 3) * TAU; tooth(K, L.stone || 'dark:rubble', x + Math.cos(a) * (0.5 + h * 0.15), y - 0.1, z + Math.sin(a) * (0.5 + h * 0.15), 0.2 + h * 0.05, h * 0.45, a); }
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
    tooth(K, L.spike || L.roof, x, top + 0.2 + roofLump(x, z), z, r * 1.15, -h - 0.2 - roofLump(x, z), hash2(i, j) * 3);
    // (A cluster: two shorter beside it.)
    if (hash2(i + 9, j) > 0.5) for (let k = 0; k < 2; k++) {
      const a = hash2(i + k, j + 7) * TAU, o = 0.35 + r;
      K.spike(L.spike || L.roof, x + Math.cos(a) * o, top + 0.35, z + Math.sin(a) * o, r * 0.6, -h * (0.35 + 0.3 * k) - 0.35, 4, a);
    }
  }
}

// The Elder Gods' islands (style 'void'): no walls and no roof. Each island's top where the field is open, flat on a
// two-metre grid and cut along its edge; under its edge a cliff, and under that its root, tapering down into the void to
// a point a long way below (`root`: how far; the Rimespire's swells out before it narrows, so it stands as a spire). A
// bridge's deck has a shallow keel under it and kerbstones along its sides. A pillar of the Cinderwell is drawn by its own
// builder (basalt), so a cell across its step is laid at the foot of the step.
function voidShell(K, d) {
  const g = grid(d), C = DUNGEON_CELL, L = d.look;
  const f = (i, j) => g.sdf[Math.min(g.H - 1, j) * g.W + Math.min(g.W - 1, i)] * GRID_UNIT;
  const wx = (i) => g.x0 + i * C, wz = (j) => g.z0 + j * C;
  // What a point's ground belongs to: the island or the bridge whose open space reaches it furthest.
  const owner = (x, z) => {
    const lx = x - d.x, lz = z - d.z;
    let best = null, bv = -Infinity;
    for (const r of d.rooms) { const v = r.r - Math.hypot(lx - r.x, lz - r.z); if (v > bv) { bv = v; best = { room: r }; } }
    for (const t of d.tunnels) for (let q = 1; q < t.pts.length; q++) {
      const a = t.pts[q - 1], b = t.pts[q], sx = b[0] - a[0], sz = b[1] - a[1];
      const u = Math.max(0, Math.min(1, ((lx - a[0]) * sx + (lz - a[1]) * sz) / (sx * sx + sz * sz || 1)));
      const cx = a[0] + sx * u, cz = a[1] + sz * u, v = t.w - Math.hypot(lx - cx, lz - cz);
      if (v > bv) { bv = v; best = { bridge: t, cx: d.x + cx, cz: d.z + cz }; }
    }
    return best;
  };
  // The top: a cell at a time, the field's open part of each cut along the edge (the corners in the open and where the edge
  // crosses its sides), laid as a fan.
  const F = 4;
  for (let j = 0; j + F < g.H; j += F) for (let i = 0; i + F < g.W; i += F) {
    const cs = [[i, j], [i + F, j], [i + F, j + F], [i, j + F]], v = cs.map(([a, b]) => f(a, b));
    if (v.every((q) => q <= 0)) continue;
    const pts = [];
    for (let k = 0; k < 4; k++) {
      const [a, b] = cs[k], [a2, b2] = cs[(k + 1) % 4], v0 = v[k], v1 = v[(k + 1) % 4];
      if (v0 > 0) pts.push([wx(a), wz(b)]);
      if ((v0 > 0) !== (v1 > 0)) { const t = v0 / (v0 - v1); pts.push([wx(a) + (wx(a2) - wx(a)) * t, wz(b) + (wz(b2) - wz(b)) * t]); }
    }
    if (pts.length < 3) continue;
    const ys = pts.map(([x, z]) => caveFloorY(x, z)), lo = Math.min(...ys);
    // (A cell across a pillar's step: at the step's foot. The pillar has its own top.)
    const flat = Math.max(...ys) - lo > 0.8;
    const P = pts.map(([x, z], k) => [x, flat ? lo : ys[k], z]);
    const o = owner(pts[0][0] + 0.5, pts[0][1] + 0.5), layer = o?.room?.ground || (o?.bridge ? L.deck || 'dark:block' : L.floor);
    for (let k = 1; k + 1 < P.length; k++) {
      const a = P[0], b = P[k], c = P[k + 1], ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      if (ny > 0) K.quad(layer, a, b, c, c); else K.quad(layer, a, c, b, b);
    }
  }
  // The sides and what hangs under them, along the edge a metre at a time.
  const lump = (x, z, k) => (vnoise(x * 0.21 + k * 3.1, z * 0.21 - k * 1.7) - 0.5) * 2;
  outline(d, (ax, az, bx, bz) => {
    const o = owner((ax + bx) / 2, (az + bz) / 2);
    if (!o) return;
    const ga = grad(ax, az), gb = grad(bx, bz), ya = caveFloorY(ax, az), yb = caveFloorY(bx, bz);
    let P;
    if (o.room) {
      const r = o.room, cx = d.x + r.x, cz = d.z + r.z, base = d.y + r.y, D = r.root ?? r.r * 1.4;
      // (Levels down the root: how far in toward its middle, how far down, and how lumpy.)
      const IN = r.spire ? [0, -0.06, -0.3, -0.42, -0.3, 0.55, 0.985] : [0, -0.05, 0.14, 0.42, 0.7, 0.88, 0.985];
      const DN = r.spire ? [0, 0.08, 0.18, 0.35, 0.55, 0.8, 1] : [0, 0.04, 0.16, 0.36, 0.6, 0.82, 1];
      P = (x, z, y, gg, k) => {
        if (k === 0) return [x, y, z];
        const t = IN[k], lm = k < IN.length - 1 ? lump(x, z, k) * Math.min(3.5, 0.6 + D * 0.03) : 0;
        const px = x + (cx - x) * t - gg[0] * lm, pz = z + (cz - z) * t - gg[1] * lm;
        return [px, k === 1 ? y - 1.1 : base - D * DN[k], pz];
      };
      P.levels = IN.length;
      P.layer = (k) => (k < 2 ? r.rock || L.wall : k < 4 ? r.rock || L.wall : 'dark:rubble');
      // (Strata stood out of its side under the lip here and there, and points of rock hanging from its root: no island's
      // underside a smooth cone.)
      const hh = hash2(Math.round(ax * 2.3) + 11, Math.round(az * 2.3) - 7);
      if (hh > 0.84) K.box(r.rock || L.wall, ax - ga[0] * 0.45, ya - 1.8 - hash2(ax * 3, az) * 2.6, az - ga[1] * 0.45, 0.8, 0.5 + hash2(az, ax * 3) * 0.6, 0.9 + (hh - 0.84) * 9, Math.atan2(bx - ax, bz - az), NO);
      if (hh < 0.075) { const q = P(ax, az, ya, ga, 3); hang(K, 'dark:rubble', q[0], q[1] + 0.8, q[2], 0.9 + hh * 22, 3 + hash2(az * 2, ax) * Math.min(16, D * 0.22), 5, hh * 90); }
      else if (hh > 0.77 && hh < 0.8) { const q = P(ax, az, ya, ga, 5); hang(K, 'dark:rubble', q[0], q[1] + 0.8, q[2], 1.5, 4 + hash2(ax, az * 2) * Math.min(20, D * 0.25), 5, hh * 60); }
    } else {
      // A bridge: a keel a couple of metres deep under its deck, in toward its middle line.
      const t = o.bridge, keel = t.ramp ? 3.4 : 2.2;
      P = (x, z, y, gg, k) => {
        if (k === 0) return [x, y, z];
        const u = [0, -0.04, 0.75][k], down = [0, 0.6, keel][k];
        const ox = (o.cx - x) * u, oz = (o.cz - z) * u;
        return [x + ox, y - down, z + oz];
      };
      P.levels = 3;
      P.layer = () => L.keel || 'dark:block';
      // (A kerbstone every few metres along its side.)
      if (hash2(Math.round(ax * 3), Math.round(az * 3)) > 0.6) {
        const nx = ga[0], nz = ga[1];
        K.box(L.kerb || 'dark:rubble', ax + nx * 0.3, ya - 0.05, az + nz * 0.3, 0.32, 0.38, 0.22, Math.atan2(bx - ax, bz - az), NO);
      }
    }
    for (let k = 0; k + 1 < P.levels; k++) {
      const A0 = P(ax, az, ya, ga, k), B0 = P(bx, bz, yb, gb, k), B1 = P(bx, bz, yb, gb, k + 1), A1 = P(ax, az, ya, ga, k + 1);
      // (Facing out of the island: the field falls that way.)
      const ux = B0[0] - A0[0], uz = B0[2] - A0[2], nx = -uz, nz = ux, layer = P.layer(k);
      if (nx * (ga[0] + gb[0]) + nz * (ga[1] + gb[1]) < 0) K.quad(layer, A0, A1, B1, B0); else K.quad(layer, B0, B1, A1, A0);
    }
  });
  // Rock and void glass adrift between the islands, each at its own height: what the Maw tore off them and let go.
  for (let n = 0; n < 160; n++) {
    const r = d.rooms[Math.floor(hash2(n, 1.5) * d.rooms.length)], a = hash2(n, 2.5) * TAU, far = r.r + 7 + hash2(n, 3.5) * 36;
    const x = d.x + r.x + Math.sin(a) * far, z = d.z + r.z + Math.cos(a) * far;
    if (caveRoom(x, z) > -5) continue;
    const y = d.y + r.y - 4 + (hash2(n, 4.5) - 0.62) * 30, s = 0.45 + hash2(n, 5.5) ** 2 * 3.4, t = hash2(n, 6.5) * TAU;
    const layer = hash2(n, 7.5) > 0.5 ? 'dark:rubble' : r.rock || L.wall;
    cap(K, layer, x, y, z, s, s * (0.3 + hash2(n, 8.5) * 0.4), 5, t);
    hang(K, layer, x, y, z, s, s * (1.4 + hash2(n, 9.5) * 1.6), 5, t);
    if (hash2(n, 10.5) > 0.72) crystal(K, 'voidglass', x, y + s * 0.2, z, s * 0.15, s * 1.1, [0.1, -0.05], t);
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
    // (And by a doorway's corner, where half a metre out is under the passage's lower roof: the highest of three looks in,
    // so no wall stops short of the roof it stands under and leaves a hole.)
    const y0 = Math.min(caveFloorY(ax, az), caveFloorY(bx, bz)) - 0.4;
    // (The roof is laid a two-metre flag at a time, each at the height over its own middle: the wall goes up to the flag
    // it stands under, which by a passage's mouth is the room's and not the passage's.)
    const flag = (x, z) => caveRoofY(g.x0 + (Math.floor((x - g.x0) / C / 4) * 4 + 2) * C, g.z0 + (Math.floor((z - g.z0) / C / 4) * 4 + 2) * C);
    let top = Math.max(caveRoofY(ix, iz), flag(mx + gm[0] * 0.3, mz + gm[1] * 0.3), flag(ix, iz));
    for (const o of [1.8, 3]) if (caveRoom(mx + gm[0] * o, mz + gm[1] * o) > 0.3) top = Math.max(top, caveRoofY(mx + gm[0] * o, mz + gm[1] * o));
    top += 0.05;
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
    const footL = room?.foot || L.foot || 'dark:rubble';
    band(footL, y0, foot);
    band(room?.rock || L.wall, foot, top);
    // (A plinth standing a hand proud of the wall's foot, and a string course over the lights: the wall has a profile.)
    // (Only where the wall runs straight along x or z: a corner's diagonal piece would stand its strip askew.)
    if (Math.min(Math.abs(ux), Math.abs(uz)) > 0.02) return;
    const o = 0.11, ox = Math.round(gm[0]) * o, oz = Math.round(gm[1]) * o, fy = caveFloorY(mx, mz), pt = fy + 0.42, c0 = fy + (L.high || 2.3) + 1.15, c1 = c0 + 0.3;
    const prof = L.course || footL;
    K.quad(prof, [px + ox, y0, pz + oz], [qx + ox, y0, qz + oz], [qx + ox, pt, qz + oz], [px + ox, pt, pz + oz], [gm[0], 0, gm[1]]);
    K.quad(prof, [px + ox, pt, pz + oz], [qx + ox, pt, qz + oz], [qx, pt + 0.1, qz], [px, pt + 0.1, pz], [gm[0] * 0.5, 0.86, gm[1] * 0.5]);
    if (c1 < top - 0.4) {
      K.quad(prof, [px + ox, c0, pz + oz], [qx + ox, c0, qz + oz], [qx + ox, c1, qz + oz], [px + ox, c1, pz + oz], [gm[0], 0, gm[1]]);
      K.quad(prof, [px, c0 - 0.1, pz], [qx, c0 - 0.1, qz], [qx + ox, c0, qz + oz], [px + ox, c0, pz + oz], [gm[0] * 0.5, -0.86, gm[1] * 0.5]);
      K.quad(prof, [px + ox, c1, pz + oz], [qx + ox, c1, qz + oz], [qx, c1 + 0.06, qz], [px, c1 + 0.06, pz], [gm[0] * 0.5, 0.86, gm[1] * 0.5]);
    }
  });
  // The floor, in two-metre flags; the roof over each, level; and a wall down from the higher roof where two differ.
  const F = 4, cols = Math.floor((g.W - 1) / F), rows = Math.floor((g.H - 1) / F);
  const roof = new Float32Array(cols * rows).fill(NaN);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = i * F, b = j * F;
    if (Math.max(f(a, b), f(a + F, b), f(a + F, b + F), f(a, b + F)) < 0.02) continue;
    const pts = [[a, b], [a + F, b], [a + F, b + F], [a, b + F]].map(([p, q]) => [wx(p), wz(q)]);
    const fl = pts.map(([x, z]) => [x, caveFloorY(x, z), z]);
    // (Boards a hand and a half wide, where the floor's of wood: the painting's own are a metre.)
    const ground = nearRoom(d, wx(a + F / 2), wz(b + F / 2))?.ground || L.floor, boards = /wood$/.test(ground);
    K.quad(ground, fl[0], fl[3], fl[2], fl[1], boards ? [0, 1, 0] : null, boards ? [fl[0], fl[3], fl[2], fl[1]].map((q) => [q[0] / 1.1, q[2] / 0.9]) : null);
    const y = roof[j * cols + i] = caveRoofY(wx(a + F / 2), wz(b + F / 2));
    K.quad(L.roof, [pts[0][0], y, pts[0][1]], [pts[1][0], y, pts[1][1]], [pts[2][0], y, pts[2][1]], [pts[3][0], y, pts[3][1]], [0, -1, 0]);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const y = roof[j * cols + i];
    if (Number.isNaN(y)) continue;
    const x0 = wx(i * F), z0 = wz(j * F), x1 = x0 + F * C, z1 = z0 + F * C;
    // (East and south of it; whichever is lower gets the face, looking into it.)
    if (i + 1 < cols) { const o = roof[j * cols + i + 1]; if (!Number.isNaN(o) && Math.abs(o - y) > 0.05) { const lo = Math.min(o, y), hi = Math.max(o, y), s = o < y ? 1 : -1; K.quad(nearRoom(d, x0 + 1, z0 + 1)?.rock || L.wall, [x1, lo, s > 0 ? z0 : z1], [x1, lo, s > 0 ? z1 : z0], [x1, hi, s > 0 ? z1 : z0], [x1, hi, s > 0 ? z0 : z1], [s, 0, 0]); } }
    if (j + 1 < rows) { const o = roof[(j + 1) * cols + i]; if (!Number.isNaN(o) && Math.abs(o - y) > 0.05) { const lo = Math.min(o, y), hi = Math.max(o, y), s = o < y ? 1 : -1; K.quad(nearRoom(d, x0 + 1, z0 + 1)?.rock || L.wall, [s > 0 ? x1 : x0, lo, z1], [s > 0 ? x0 : x1, lo, z1], [s > 0 ? x0 : x1, hi, z1], [s > 0 ? x1 : x0, hi, z1], [0, 0, s]); } }
  }
  // His red, hung down the long walls of the high rooms: a banner every so far, clear of the doors.
  for (const r of d.rooms) {
    if (r.roof < 9 || r.banners === 0 || L.banner === false) continue;
    const along = r.hz >= r.hx, len = along ? r.hz : r.hx, off = along ? r.hx : r.hz, n = Math.max(1, Math.round(len * 2 / (r.banners || 9)));
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const t = ((i + 0.5) / n * 2 - 1) * (len - 2.5);
      const lx = r.x + (along ? side * off : t), lz = r.z + (along ? t : side * off);
      banner(K, d, lx, lz, along ? -side : 0, along ? 0 : -side, 0.9, r.roof - 1.2, Math.max(3.2, r.roof * 0.42), r, r.cloth || L.banner || 'cloth_red');
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
  // (A painted one, the PH2 pack's: laid once, two wide to three long, its own shape cut out; as big as the wall allows.)
  if (/(^|:)p2_/.test(cloth)) {
    const hh = Math.min(top - foot + 0.7, 9), hw = hh / 3;
    K.quad(cloth, P(-hw, top), P(hw, top), P(hw, top - hh), P(-hw, top - hh), [nx, 0, nz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    K.box('iron', x + nx * 0.1, y + top, z + nz * 0.1, nx ? 0.05 : hw + 0.2, 0.08, nx ? hw + 0.2 : 0.05, 0, NO);
    return;
  }
  K.quad(cloth, P(-w, top), P(w, top), P(w, foot + 0.7), P(-w, foot + 0.7), [nx, 0, nz], [[0, 0], [1, 0], [1, (top - foot) / 2], [0, (top - foot) / 2]]);
  K.tri(cloth, P(-w, foot + 0.7), P(0, foot + 0.7), P(-w, foot)); K.tri(cloth, P(0, foot + 0.7), P(w, foot + 0.7), P(w, foot));
  K.box('iron', x + nx * 0.1, y + top, z + nz * 0.1, nx ? 0.05 : w + 0.2, 0.08, nx ? w + 0.2 : 0.05, 0, NO);
}

// ---- its fires -------------------------------------------------------------------------------------------------------------
// A flame isn't built: it's a card the renderer turns to face you and burns in the shader (src/gfx/interior.js GLOW,
// src/gfx/renderer.js delveFires), in the delve's own colour. What's built is what it burns on. K.fires takes them:
// kind 'flame' (x, y, z its root, w its half width, h its height), 'glow' (a soft round of light w across, about x, y, z),
// 'wisp' (a flame with nothing under it, that bobs). ember: sparks go up from it when you're near (src/main.js).
export function fire(K, d, x, y, z, w, h, o = {}) {
  K.fires.push({ delve: d.key, hue: o.hue || d.look.flame, kind: o.kind || 'flame', x, y, z, w, h, ember: o.ember ? 1 : 0, seed: hash2(x * 3.1 + y, z * 2.7) });
  if (o.glow) K.fires.push({ delve: d.key, hue: o.hue || d.look.flame, kind: 'glow', x, y: y + h * 0.45, z, w: o.glow, h: o.glow, ember: 0, seed: 0 });
}
const glow = (K, d, x, y, z, r, hue) => K.fires.push({ delve: d.key, hue: hue || d.look.flame, kind: 'glow', x, y, z, w: r, h: r, ember: 0, seed: 0 });
// A bar of four sides between any two points, t thick (half): a torch's stave, a tripod's leg, a strut.
export function bar(K, layer, a, b, t, t2 = t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
  // (Two ways across it: one level, one square to that.)
  let ux = -dz, uz = dx; const ul = Math.hypot(ux, uz);
  if (ul < 1e-4) { ux = 1; uz = 0; } else { ux /= ul; uz /= ul; }
  const vx = (dy * uz) / L, vy = (dz * ux - dx * uz) / L, vz = (-dy * ux) / L;
  const C = (q, s, k, tt) => [q[0] + (ux * s + vx * k) * tt, q[1] + vy * k * tt, q[2] + (uz * s + vz * k) * tt];
  const ring = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < 4; i++) {
    const [s0, k0] = ring[i], [s1, k1] = ring[(i + 1) % 4];
    K.quad(layer, C(a, s0, k0, t), C(a, s1, k1, t), C(b, s1, k1, t2), C(b, s0, k0, t2));
  }
}
// A crystal: six sides, leaning, cut to a point at its head.
// A point of rock hanging down from (x, y, z), h long, its faces turned out; and a low cap the right way up (neither stops
// anything: they're out over the void or under an island).
function hang(K, layer, x, y, z, r, h, sides, turn) {
  for (let i = 0; i < sides; i++) {
    const a = turn + i / sides * TAU, b = turn + (i + 1) / sides * TAU, w = 0.75 + 0.5 * hash2(i, x);
    K.tri(layer, [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(a + 0.5) * r * 0.1 * w, y - h, z + Math.sin(a + 0.5) * r * 0.1 * w]);
  }
}
function cap(K, layer, x, y, z, r, h, sides, turn) {
  for (let i = 0; i < sides; i++) {
    const a = turn + i / sides * TAU, b = turn + (i + 1) / sides * TAU;
    K.tri(layer, [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x, y + h, z], [x + Math.cos(b) * r, y, z + Math.sin(b) * r]);
  }
}
function crystal(K, layer, x, y, z, r, h, lean, turn) {
  const k = h < 0 ? 0.8 : 0.78, tx = x + lean[0] * h * k, tz = z + lean[1] * h * k, p = K.part(layer);
  void p;
  for (let i = 0; i < 6; i++) {
    const a = turn + i / 6 * TAU, b = turn + (i + 1) / 6 * TAU;
    K.quad(layer, [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [tx + Math.cos(b) * r * 0.85, y + h * k, tz + Math.sin(b) * r * 0.85], [tx + Math.cos(a) * r * 0.85, y + h * k, tz + Math.sin(a) * r * 0.85]);
  }
  K.spike(layer, tx, y + h * k, tz, r * 0.85, h * (1 - k), 6, turn, lean);
}
// Coals: a bed of them alight, a few gone black on top.
// An open fire: a wide low body and two taller tongues, so it fills what it burns in.
function blaze(K, d, x, y, z, w, h, o = {}) {
  fire(K, d, x, y, z, w * 1.2, h * 0.55, { hue: o.hue });
  fire(K, d, x + w * 0.22, y + h * 0.05, z - w * 0.15, w * 0.62, h, o);
  fire(K, d, x - w * 0.25, y + h * 0.03, z + w * 0.18, w * 0.55, h * 0.78, { hue: o.hue });
}
function coals(K, d, x, y, z, r, hue) {
  K.drum(hue || d.look.flame, x, y - 0.05, z, r, 0.07, 7, { r2: r * 0.8, collide: false, turn: x });
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + z; K.spike('dark:rubble', x + Math.cos(a) * r * 0.45, y, z + Math.sin(a) * r * 0.45, r * 0.3, r * 0.3, 4, a); }
}
// A cage of iron bars for a fire to sit in: a hoop at the foot and the lip, bars between.
function cage(K, x, y, z, r0, r1, h, n = 6) {
  K.drum('iron', x, y, z, r0, 0.05, n, { r2: r0, collide: false });
  K.drum('iron', x, y + h - 0.04, z, r1, 0.05, n, { r2: r1 * 1.04, open: true, collide: false });
  for (let k = 0; k < n; k++) { const a = k * TAU / n; rod(K, 'iron', x + Math.cos(a) * r0, y, z + Math.sin(a) * r0, x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1, 0.012); }
}

function fires(K, d) {
  const L = d.look, castle = d.style === 'castle';
  for (const [x, y, z, nx, nz] of torches(d)) {
    // (back: how far behind it the wall is, so what holds it is fixed to the wall and not hung in the air before it.)
    const tx = -nz, tz = nx, back = Math.max(0.3, caveRoom(x, z)) + 0.02;
    if (L.lamp === 'post') {
      // (The Elder Gods' islands have no walls to hang a light on: a post at the edge, a shard of void glass floating
      // over its head with the light in it.)
      const px = x + nx * 0.25, pz = z + nz * 0.25, fy = caveFloorY(px, pz);
      K.drum('void:block', px, fy - 0.3, pz, 0.26, 0.5, 6, { r2: 0.2, collide: false, turn: x });
      K.drum('void:block', px, fy + 0.2, pz, 0.11, y - fy - 0.75, 6, { r2: 0.08, collide: false, turn: x, open: true });
      cage(K, px, y - 0.6, pz, 0.08, 0.2, 0.3, 4);
      crystal(K, 'voidglass', px, y - 0.38, pz, 0.08, 0.5, [0, 0], x);
      fire(K, d, px, y - 0.3, pz, 0.14, 0.3, { kind: 'wisp', glow: 1.15 });
      continue;
    }
    if (L.lamp === 'cap') {
      // Brackets of fungus grown out of the wall in tiers, sunk into it, their undersides alight.
      const wx_ = x - nx * (back + 0.15), wz_ = z - nz * (back + 0.15);
      for (const [u, up, r] of [[0, -0.12, 0.85], [0.45, -0.7, 0.6], [-0.4, 0.4, 0.5]]) {
        const cx = wx_ + tx * u, cz = wz_ + tz * u;
        K.drum('fruit', cx, y + up, cz, r, 0.12, 8, { r2: r * 0.72, collide: false, turn: x + u });
        K.drum('fruit', cx, y + up - 0.16, cz, r * 0.45, 0.16, 8, { r2: r, collide: false, open: true, turn: x + u });
        K.drum(L.flame, cx, y + up - 0.05, cz, r * 0.9, 0.05, 8, { collide: false, open: true, turn: x + u });
      }
      glow(K, d, x - nx * 0.1, y - 0.35, z - nz * 0.1, 0.8);
      continue;
    }
    if (L.lamp === 'wisp') {
      // A corpse-light: a flame with nothing under it, standing off the wall over the water.
      fire(K, d, x, y - 0.3, z, 0.16, 0.46, { kind: 'wisp', glow: 0.75 });
      continue;
    }
    if (L.lamp === 'bowl') {
      // A stone lamp on a corbel: a bowl of fat, a pale flame.
      K.box('rubble', x - nx * (back - 0.2), y - 0.66, z - nz * (back - 0.2), 0.2, 0.34, 0.22, Math.atan2(nx, nz), NO);
      K.box('rubble', x - nx * (back - 0.3), y - 0.34, z - nz * (back - 0.3), 0.27, 0.1, 0.32, Math.atan2(nx, nz), NO);
      K.drum('rubble', x - nx * 0.2, y - 0.24, z - nz * 0.2, 0.12, 0.14, 7, { r2: 0.24, collide: false, lid: L.flame });
      fire(K, d, x - nx * 0.2, y - 0.12, z - nz * 0.2, 0.13, 0.4, { glow: 0.7 });
      continue;
    }
    if (L.cold) {
      // Crystals of ice grown out of the wall on a boss of rime, the cold light in the heart of the longest.
      const bx = x - nx * (back - 0.15), bz = z - nz * (back - 0.15);
      K.drum('frost:rubble', bx, y - 0.75, bz, 0.5, 0.3, 6, { r2: 0.3, collide: false, turn: x, lid: 'white' });
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + x, lx = nx * 0.35 + Math.cos(a) * 0.3, lz = nz * 0.35 + Math.sin(a) * 0.3, h = k ? 0.45 + 0.35 * hash2(k, x) : 1.05, r = k ? 0.09 : 0.14;
        const cx = bx + Math.cos(a) * 0.18 * (k ? 1 : 0), cz = bz + Math.sin(a) * 0.18 * (k ? 1 : 0);
        crystal(K, 'ice', cx, y - 0.55, cz, r, h, [lx, lz], a);
        if (!k) K.spike(L.flame, cx + lx * 0.2, y - 0.4, cz + lz * 0.2, 0.05, 0.75, 4, a, [lx, lz]);
      }
      glow(K, d, bx + nx * 0.35, y + 0.05, bz + nz * 0.35, 0.8);
      continue;
    }
    if (L.lamp === 'candle') {
      // A sconce: a plate on the wall, an arm out from it, three candles in their cups.
      K.box('iron', x - nx * back, y - 0.36, z - nz * back, 0.05, 0.16, 0.03, Math.atan2(nx, nz), NO);
      bar(K, 'iron', [x - nx * back, y - 0.3, z - nz * back], [x - nx * 0.1, y - 0.18, z - nz * 0.1], 0.018);
      bar(K, 'iron', [x - nx * 0.1 - tx * 0.24, y - 0.18, z - nz * 0.1 - tz * 0.24], [x - nx * 0.1 + tx * 0.24, y - 0.18, z - nz * 0.1 + tz * 0.24], 0.016);
      for (const u of [-0.24, 0, 0.24]) {
        const cx = x - nx * 0.1 + tx * u, cz = z - nz * 0.1 + tz * u, ch = u ? 0.14 : 0.2;
        K.drum('iron', cx, y - 0.19, cz, 0.03, 0.04, 5, { r2: 0.05, collide: false });
        K.drum('white', cx, y - 0.15, cz, 0.022, ch, 5, NO);
        fire(K, d, cx, y - 0.15 + ch, cz, 0.05, 0.16, { glow: u ? 0 : 0.55 });
      }
      continue;
    }
    if (castle) {
      // A cresset: a plate bolted to the wall, an arm, a cage of iron with the fire in it.
      K.box('iron', x - nx * back, y - 0.56, z - nz * back, 0.045, 0.5, 0.03, Math.atan2(nx, nz), NO);
      bar(K, 'iron', [x - nx * back, y - 0.5, z - nz * back], [x, y - 0.2, z], 0.022);
      bar(K, 'iron', [x - nx * back, y - 0.12, z - nz * back], [x - nx * 0.05, y - 0.16, z - nz * 0.05], 0.016);
      cage(K, x, y - 0.2, z, 0.08, 0.17, 0.3, 5);
      coals(K, d, x, y - 0.12, z, 0.1);
      fire(K, d, x, y - 0.1, z, 0.26, 0.42);
      fire(K, d, x, y - 0.08, z, 0.19, 0.66, { glow: 0.85 });
      continue;
    }
    // A torch: a stave jammed in a crack of the rock, bound to an iron staple, its head wrapped and alight.
    const fx = x - nx * 0.95, fz = z - nz * 0.95, hx = x - nx * 0.05, hz = z - nz * 0.05;
    bar(K, 'wood', [fx, y - 0.95, fz], [hx, y - 0.08, hz], 0.032, 0.026);
    bar(K, 'iron', [x - nx * 0.6 - tx * 0.07, y - 0.6, z - nz * 0.6 - tz * 0.07], [x - nx * 0.6 + tx * 0.07, y - 0.6, z - nz * 0.6 + tz * 0.07], 0.045);
    K.drum('dark:cloth_oat', hx, y - 0.14, hz, 0.05, 0.2, 5, { r2: 0.075, collide: false, turn: x, lid: L.flame });
    fire(K, d, hx, y + 0.02, hz, 0.19, 0.56, { glow: 0.8 });
  }
  let n = 0;
  for (const [x, y, z, lift, how] of braziers(d)) {
    if (how === 'hang') {
      // Over the middle of a great cavern: a fire hung from the roof, whatever burns down here.
      const top = caveRoofY(x, z) + (castle ? 0.05 : 0.3 + roofLump(x, z)), h = y + lift;
      if (L.lamp === 'cap') {
        // Caps grown down from the roof in a cluster, gills out.
        for (let k = 0; k < 4; k++) { const a = k * 1.7 + x, o = k ? 0.7 : 0, px = x + Math.cos(a) * o, pz = z + Math.sin(a) * o, len = top - h - (k ? 0.8 : 0); K.drum('spore:rubble', px, top - len, pz, 0.09, len, 5, NO); K.cone('fruit', px, top - len - 0.3, pz, k ? 0.5 : 0.8, -0.35, 8); K.drum(L.flame, px, top - len - 0.36, pz, k ? 0.44 : 0.72, 0.06, 8, NO); }
        glow(K, d, x, h - 0.2, z, 2.2);
      } else if (L.lamp === 'wisp') {
        for (let k = 0; k < 3; k++) { const a = k * 2.1 + z; fire(K, d, x + Math.cos(a) * 0.8, h - 0.5 + k * 0.4, z + Math.sin(a) * 0.8, 0.3, 0.9, { kind: 'wisp', glow: k ? 0 : 2.2 }); }
      } else if (L.cold) {
        // Icicles in a cluster, the cold light in the long one at the middle.
        K.spike(L.flame, x, top, z, 0.1, h - top - 0.5, 4, z);
        crystal(K, 'ice', x, top, z, 0.3, h - top - 0.2, [0, 0], x);
        for (let k = 0; k < 5; k++) { const a = k * 1.26 + x; K.spike(k === 2 ? L.flame : 'ice', x + Math.cos(a) * 0.5, top, z + Math.sin(a) * 0.5, k === 2 ? 0.06 : 0.16, (h - top) * (0.4 + 0.1 * k), 4, a); }
        glow(K, d, x, h + 0.9, z, 2.6);
      } else if (L.lamp === 'candle') {
        PROPS.chandelier(K, d, { up: lift - 0.4 }, x, y, z);
      } else if (L.lamp === 'bowl') {
        // A grave-lamp hung on three chains: a wide bowl of stone, the pale flame standing in it.
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + x; rod(K, 'iron', x + Math.cos(a) * 0.1, top, z + Math.sin(a) * 0.1, x + Math.cos(a) * 0.55, h - 0.2, z + Math.sin(a) * 0.55, 0.02); }
        K.drum('pale:stone', x, h - 0.5, z, 0.25, 0.32, 9, { r2: 0.62, collide: false, lid: L.flame });
        K.drum('rubble', x, h - 0.62, z, 0.12, 0.12, 6, { r2: 0.25, collide: false, open: true });
        blaze(K, d, x, h - 0.16, z, 0.42, 1.0, { glow: 2 });
      } else {
        // A basket of iron bars on a chain, three more chains from its rim, coals in it.
        rod(K, 'iron', x, top, z, x, h + 0.9, z, 0.025);
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + x; rod(K, 'iron', x, h + 0.9, z, x + Math.cos(a) * 0.5, h + 0.12, z + Math.sin(a) * 0.5, 0.018); }
        cage(K, x, h - 0.38, z, 0.26, 0.52, 0.5, 8);
        coals(K, d, x, h - 0.22, z, 0.34);
        blaze(K, d, x, h - 0.2, z, 0.5, 1.25, { glow: 2.2, ember: true });
      }
      continue;
    }
    // (A chandelier, a hearth, a spit build their own fires: PROPS. Theirs say how high their light is.)
    if (lift !== undefined) continue;
    n++;
    if (L.lamp === 'cap') {
      // A cap as tall as a man, its gills alight; two small ones at its foot.
      K.drum('cloth_oat', x, y - 0.2, z, 0.2, 1.7, 6, { r2: 0.13, collide: false });
      K.drum(L.flame, x, y + 1.42, z, 0.72, 0.08, 9, { collide: false });
      K.drum('fruit', x, y + 1.5, z, 0.85, 0.16, 9, { r2: 0.7, collide: false }); K.cone('fruit', x, y + 1.66, z, 0.7, 0.4, 9);
      for (const s of [-1, 1]) { const a = x * 1.7 + s * 1.3, px = x + Math.cos(a) * 0.55, pz = z + Math.sin(a) * 0.55; K.drum('cloth_oat', px, y - 0.1, pz, 0.06, 0.45, 5, NO); K.drum(L.flame, px, y + 0.3, pz, 0.2, 0.04, 6, NO); K.cone('fruit', px, y + 0.34, pz, 0.24, 0.16, 6); }
      glow(K, d, x, y + 1.25, z, 1.3);
      continue;
    }
    if (L.lamp === 'wisp') {
      // A corpse-light over a stump of the causeway's stone.
      K.drum('mire:rubble', x, y - 0.3, z, 0.55, 0.5, 7, { r2: 0.4, collide: false, turn: z, lid: 'mire:rubble' });
      fire(K, d, x, y + 0.95, z, 0.3, 0.85, { kind: 'wisp', glow: 1.1 });
      fire(K, d, x + 0.3, y + 0.6, z - 0.2, 0.12, 0.34, { kind: 'wisp' });
      continue;
    }
    if (L.lamp === 'bowl') {
      // A grave-lamp: a standing stone with a bowl cut in its head.
      K.box('rubble', x, y - 0.3, z, 0.3, 1.5, 0.24, x, NO);
      K.box('pale:rubble', x, y - 0.3, z, 0.42, 0.42, 0.36, x, NO);
      K.drum('pale:stone', x, y + 1.2, z, 0.2, 0.16, 7, { r2: 0.36, collide: false, lid: L.flame });
      blaze(K, d, x, y + 1.33, z, 0.28, 0.8, { glow: 1.2 });
      continue;
    }
    if (L.cold) {
      // A cold fire: crystals standing out of a boss of rime, the light in the hearts of the tall ones.
      K.drum('frost:rubble', x, y - 0.2, z, 0.62, 0.4, 7, { r2: 0.36, collide: false, turn: x, lid: 'white' });
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + x, o = k ? 0.26 : 0, lean = [Math.cos(a) * 0.28 * (k ? 1 : 0), Math.sin(a) * 0.28 * (k ? 1 : 0)], h = k ? 0.6 + 0.6 * hash2(k, z) : 1.6;
        crystal(K, 'ice', x + Math.cos(a) * o, y + 0.1, z + Math.sin(a) * o, k ? 0.11 : 0.17, h, lean, a);
        if (k < 3) K.spike(L.flame, x + Math.cos(a) * o, y + 0.2, z + Math.sin(a) * o, 0.06, h * 0.8, 4, a, lean);
      }
      glow(K, d, x, y + 0.9, z, 1.5);
      continue;
    }
    if (L.lamp === 'candle') {
      // A candle-stand: a foot, a stem, a ring of five candles at different heights.
      K.drum('iron', x, y, z, 0.3, 0.05, 8, { r2: 0.24, collide: false });
      K.drum('iron', x, y + 0.05, z, 0.035, 1.25, 5, NO);
      K.drum('iron', x, y + 1.25, z, 0.3, 0.035, 8, NO);
      for (let k = 0; k < 5; k++) {
        const a = k * TAU / 5 + x, cx = x + Math.cos(a) * 0.26, cz = z + Math.sin(a) * 0.26, ch = 0.14 + 0.12 * hash2(k + x, z);
        K.drum('white', cx, y + 1.28, cz, 0.028, ch, 5, NO);
        fire(K, d, cx, y + 1.28 + ch, cz, 0.06, 0.19);
      }
      K.drum('white', x, y + 1.28, z, 0.035, 0.34, 5, NO);
      fire(K, d, x, y + 1.62, z, 0.07, 0.22, { glow: 0.9 });
      continue;
    }
    if (castle) {
      // A standing cresset: a foot of three claws, a stem of iron, a basket of bars with the fire in it.
      for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + x; bar(K, 'iron', [x + Math.cos(a) * 0.42, y, z + Math.sin(a) * 0.42], [x, y + 0.32, z], 0.035, 0.03); }
      K.drum('iron', x, y + 0.28, z, 0.045, 1.05, 6, NO);
      K.drum('iron', x, y + 0.8, z, 0.075, 0.07, 6, NO);
      cage(K, x, y + 1.3, z, 0.16, 0.36, 0.42, 8);
      coals(K, d, x, y + 1.42, z, 0.24);
      blaze(K, d, x, y + 1.46, z, 0.4, 1.1, { glow: 1.5, ember: true });
      continue;
    }
    if (n % 3 === 0) {
      // A fire on the floor: a ring of stones, sticks leaned together, coals under them.
      for (let k = 0; k < 7; k++) { const a = k * TAU / 7 + x, rr = 0.62 + 0.08 * hash2(k, x); K.box(k % 2 ? 'rubble' : 'dark:rubble', x + Math.cos(a) * rr, y - 0.08, z + Math.sin(a) * rr, 0.17, 0.2 + 0.1 * hash2(x, k), 0.13, -a + 1.57, NO); }
      coals(K, d, x, y + 0.06, z, 0.42);
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + z; bar(K, 'wood', [x + Math.cos(a) * 0.5, y, z + Math.sin(a) * 0.5], [x - Math.cos(a) * 0.08, y + 0.5, z - Math.sin(a) * 0.08], 0.05, 0.035); }
      blaze(K, d, x, y + 0.1, z, 0.5, 1.2, { glow: 1.6, ember: true });
      continue;
    }
    // A brazier: three legs of iron lashed under a bowl, coals in it.
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + x; bar(K, 'iron', [x + Math.cos(a) * 0.4, y - 0.05, z + Math.sin(a) * 0.4], [x - Math.cos(a) * 0.1, y + 1.12, z - Math.sin(a) * 0.1], 0.028); }
    K.drum('iron', x, y + 0.55, z, 0.2, 0.03, 6, { collide: false, open: true });
    K.drum('iron', x, y + 1.02, z, 0.16, 0.3, 8, { r2: 0.42, collide: false, open: true });
    K.drum('iron', x, y + 1.3, z, 0.42, 0.04, 8, { r2: 0.44, collide: false, open: true });
    coals(K, d, x, y + 1.3, z, 0.33);
    blaze(K, d, x, y + 1.3, z, 0.4, 1.0, { glow: 1.5, ember: true });
  }
}
// ---- what stands in the rooms ------------------------------------------------------------------------------------------------
// Each: (K, d, p, x, y, z) with the prop's own numbers in p, its place in the world on the floor at x, y, z.

// A culvert's opening: half its width, how far its sill is over the floor it stands on, how high it is. (culvert, grate)
const CULVERT = { hw: 1.2, sill: 0.35, high: 2.5 };
export function rod(K, layer, ax, ay, az, bx, by, bz, t) {
  // A thin bar between two points: a quad either way, so it shows from every side.
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), px = L > 1e-3 ? -dz / L * t : t, pz = L > 1e-3 ? dx / L * t : 0;
  K.quad(layer, [ax - px, ay, az - pz], [ax + px, ay, az + pz], [bx + px, by, bz + pz], [bx - px, by, bz - pz]);
  K.quad(layer, [ax, ay - t, az], [ax, ay + t, az], [bx, by + t, bz], [bx, by - t, bz]);
}
const egg = (K, layer, x, y, z, r, h, turn = 0) => { K.drum(layer, x, y, z, r * 0.45, h * 0.45, 6, { r2: r, open: true, collide: false, turn }); K.cone(layer, x, y + h * 0.45, z, r, h * 0.55, 6, turn); };
const skull = (K, x, y, z, r, turn = 0) => { K.drum('pale:stone', x, y, z, r * 0.8, r * 0.9, 6, { r2: r, collide: false, turn, open: true }); K.cone('pale:stone', x, y + r * 0.9, z, r, r * 0.7, 6, turn); };
// A cap: a swollen foot, a stem with a skirt on it, pale gills, a cap in two rounds with its rim rolled under.
function mushroom(K, x, y, z, h, turn = 0) {
  const sr = 0.06 + h * 0.07, R = 0.2 + h * 0.42;
  K.drum('cloth_oat', x, y - 0.1, z, sr * 1.9, 0.1 + h * 0.14, 6, { r2: sr * 1.1, open: true, collide: false, turn });
  K.drum('cloth_oat', x, y + h * 0.14, z, sr * 1.1, h * 0.86, 6, { r2: sr * 0.75, open: true, collide: false, turn });
  K.drum('pale:cloth_oat', x, y + h * 0.62, z, sr * 0.9, h * 0.08, 7, { r2: sr * 2.2, open: true, collide: false, turn });
  K.drum('pale:cloth_oat', x, y + h - 0.06, z, sr, 0.05, 8, { r2: R * 0.94, open: true, collide: false, turn });
  K.drum('fruit', x, y + h - 0.05, z, R * 0.92, 0.06 + h * 0.03, 8, { r2: R, open: true, collide: false, turn });
  K.drum('fruit', x, y + h + 0.01 + h * 0.03, z, R, 0.08 + h * 0.1, 8, { r2: R * 0.72, open: true, collide: false, turn });
  K.drum('fruit', x, y + h + 0.09 + h * 0.13, z, R * 0.72, 0.06 + h * 0.08, 8, { r2: R * 0.3, collide: false, turn, lid: 'fruit' });
}
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

export const PROPS = {
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
    const [foot, shaft] = p.wood ? ['wood', 'wood'] : p.pale ? ['rubble', 'pale:stone'] : p.shaft ? ['dark:block', p.shaft] : ['dark:rubble', 'dark:stone'];
    K.box(foot, x, y - 0.3, z, r * 1.25, 0.9, r * 1.25, 0, NO);
    // (square: a pier of dressed stone, its faces flat, where a drum's would run the stone's painting on the slant.)
    if (p.square) K.box(shaft, x, y + 0.6, z, r * 0.85, top - y - 1.5, r * 0.85, 0, NO);
    else K.drum(shaft, x, y + 0.6, z, r * 0.9, top - y - 1.5, p.wood ? 6 : 10, { open: true, collide: false });
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
    // (cloth: a long cloth down it, pale, hanging over its ends; and plates laid down both sides of it.)
    if (p.cloth) {
      K.box(p.cloth, x, y + up - 0.005, z, long ? 0.45 : a - 0.1, 0.012, long ? a - 0.1 : 0.45, 0, NO);
      for (const e of [-1, 1]) K.box(p.cloth, x + (long ? 0 : e * (a - 0.1)), y + up - 0.3, z + (long ? e * (a - 0.1) : 0), long ? 0.45 : 0.01, 0.3, long ? 0.01 : 0.45, 0, NO);
      for (let o = -a + 1; o <= a - 1; o += 1.4) for (const sd of [-1, 1]) K.drum('pale:stone', x + (long ? sd * 0.38 : o), y + up + 0.01, z + (long ? o : sd * 0.38), 0.15, 0.02, 8, NO);
    }
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
  // (h: how tall its posts are; n: how many shafts it holds. An armoury's are taller and fuller than a guardroom's.)
  rack(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), h = p.h || 1.5, n = p.n || 5, hw = (n - 1) * 0.225 + 0.2, len = h + 0.7;
    for (const u of [-hw, hw]) K.box('wood', x + u * c, y, z - u * s, 0.06, h, 0.06, p.yaw, NO);
    // A dark board behind the shafts and a trough their butts stand in; nothing across them (a rail across each shaft made
    // a cross of it: the V and T rule). (board: an armoury's, a gap every fourth.)
    K.box('dark:wood', x - 0.03 * s, y + 0.3, z - 0.03 * c, hw, h - 0.3, 0.03, p.yaw, NO); K.box('dark:wood', x + 0.12 * s, y, z + 0.12 * c, hw, 0.22, 0.16, p.yaw, NO);
    K.box('dark:wood', x - 0.03 * s, y + h, z - 0.03 * c, hw + 0.06, 0.08, 0.05, p.yaw, NO);
    for (let k = 0; k < n; k++) {
      if (p.board && k % 4 === 3) continue;
      const u = (k - (n - 1) / 2) * 0.45, px = x + u * c + 0.12 * s, pz = z - u * s + 0.12 * c;
      K.box('wood', px, y, pz, 0.025, len, 0.025, p.yaw, { collide: false, top: false });
      K.cone('iron', px, y + len, pz, 0.06, 0.4, 4);
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
  // (plain: bars down from a beam, none across: a door of his that nothing of hers can be read in. The V and T rule.)
  portcullis(K, d, p, x, y, z) {
    const y0 = y + (p.raised || 0), y1 = y + p.h;
    for (let u = -p.w; u <= p.w + 0.01; u += 0.5) { K.box('iron', x + u, y0, z, 0.045, y1 - y0, 0.045, 0, NO); if (p.raised || p.plain) K.cone('iron', x + u, y0, z, 0.06, -0.3, 4); }
    if (p.plain) K.box('iron', x, y1 - 0.3, z, p.w + 0.1, 0.3, 0.1, 0, NO);
    else for (let h = y0 + 0.4; h < y1; h += 0.9) K.box('iron', x, h, z, p.w, 0.07, 0.03, 0, NO);
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
      fire(K, d, x + ox, y0 + h, z + oz, 0.05, 0.16, { glow: ox ? 0 : 0.5 });
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
    for (const s of [-1, 1]) { K.drum('iron', x + s * 0.9, y, z - 0.3, 0.06, 1.5, 5, NO); K.drum('white', x + s * 0.9, y + 1.5, z - 0.3, 0.035, 0.16, 5, NO); fire(K, d, x + s * 0.9, y + 1.66, z - 0.3, 0.07, 0.22, { glow: 0.5 }); }
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
      K.drum('iron', x + s * (p.hx - 0.5), y + 1.3, z, 0.05, 0.5, 5, NO); K.drum('white', x + s * (p.hx - 0.5), y + 1.8, z, 0.03, 0.14, 5, NO); fire(K, d, x + s * (p.hx - 0.5), y + 1.94, z, 0.07, 0.22, { glow: 0.5 });
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
    // (Three chains, not four: four, from under it, were a cross in a ring. The V and T rule.)
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.5; rod(K, 'iron', x, h + 0.9, z, x + Math.cos(a) * 1.45, h + 0.1, z + Math.sin(a) * 1.45, 0.02); }
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8, cx = x + Math.cos(a) * 1.44, cz = z + Math.sin(a) * 1.44; K.drum('iron', cx, h + 0.12, cz, 0.05, 0.05, 5, { r2: 0.09, collide: false }); K.drum('white', cx, h + 0.17, cz, 0.04, 0.2, 5, NO); fire(K, d, cx, h + 0.37, cz, 0.1, 0.3); }
    glow(K, d, x, h + 0.5, z, 2.4);
  },
  // A great hearth in a wall, facing yaw out from it.
  // (great: so many times the size, with a hood over it on corbels and a bed of embers out before it: a castle kitchen's,
  // a forge's.)
  hearth(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c], g = p.great || 1;
    for (const u of [-2 * g, 2 * g]) { const [px, pz] = P(u, 0.3); K.box('dark:rubble', px, y, pz, 0.45 * g, 2.6 * g, 0.5, p.yaw, NO); }
    { const [px, pz] = P(0, 0.3); K.box('dark:rubble', px, y + 2.6 * g, pz, 2.5 * g, 0.7, 0.6, p.yaw, NO); K.box('dark:stone', px, y + 2.6 * g + 0.7, pz, 2 * g, 3, 0.4, p.yaw, NO); }
    { const [px, pz] = P(0, 0.25); K.box('obsidian', px, y, pz, 1.55 * g, 2.6 * g, 0.06, p.yaw, { collide: false, top: false }); }
    for (const u of [-0.8, 0, 0.8]) { const [px, pz] = P(u * g, 0.5); fire(K, d, px, y + 0.2, pz, 0.5 * g, (1.2 + (u ? 0 : 0.5)) * g, { ember: !u, glow: u ? 0 : 2 * g }); K.box('wood', px, y, pz, 0.5 * g, 0.18, 0.12, p.yaw + u, NO); }
    { const [px, pz] = P(0, 0.5); K.box(d.look.flame, px, y + 0.02, pz, 1.2 * g, 0.1, 0.3 * g, p.yaw, NO); }
    if (p.great) {
      // The hood, out over the fire on two corbels, and the embers raked out onto the hearthstone before it, glowing.
      { const [px, pz] = P(0, 1.3); K.box('dark:stone', px, y + 2.6 * g, pz, 2.3 * g, 0.6, 1.1, p.yaw, NO); }
      for (const u of [-2.1 * g, 2.1 * g]) { const [px, pz] = P(u, 1.2); K.box('dark:rubble', px, y + 2.6 * g - 0.6, pz, 0.3, 0.6, 0.9, p.yaw, NO); }
      // (bed: false, a hall's: the hearthstone bare, the fire kept on its grate.)
      { const [px, pz] = P(0, 1.6); K.box('dark:rubble', px, y, pz, 2.2 * g, 0.12, 1, p.yaw, NO); if (p.bed !== false) K.box(d.look.flame, px, y + 0.13, pz, 1.7 * g, 0.03, 0.7, p.yaw, NO); glow(K, d, px, y + 0.5, pz, 2.6 * g); }
    }
  },
  beam(K, d, p, x, y, z) {
    K.box('wood', x, y + p.up, z, p.hx, 0.5, 0.25, 0, NO);
    for (const s of [-1, 1]) K.box('wood', x + s * (p.hx - 1.2), y + p.up - 1.1, z, 0.9, 0.22, 0.2, s * 0.0, NO);
  },
  // (Its back to the south, facing north; flip: its back to the north, facing south; yaw: facing that way, its back behind.)
  seat(K, d, p, x, y, z) {
    const yw = p.yaw ?? (p.flip ? 0 : Math.PI), fx = Math.sin(yw), fz = Math.cos(yw), rot = p.yaw ?? 0;
    K.box(p.stone || 'dark:stone', x, y, z, p.hx, 0.7, p.hz, rot, NO);
    K.box(p.stone || 'dark:stone', x - fx * (p.hz - 0.25), y + 0.7, z - fz * (p.hz - 0.25), p.hx, 2.6, 0.25, rot, NO);
    K.box(p.cloth || 'cloth_red', x + fx * 0.1, y + 0.7, z + fz * 0.1, p.hx - 0.25, 0.05, p.hz - 0.4, rot, NO);
  },
  // A bookcase: a dark frame (plinth, cornice, ends, a back between) and its books on both long faces, the PH2 pack's
  // painted spines; or on one face only (one: +1 or -1, which way it faces), stood against a wall. Long along x or z, the
  // longer; h tall.
  bookcase(K, d, p, x, y, z) {
    const long = p.hz >= p.hx, a = long ? p.hz : p.hx, t = long ? p.hx : p.hz, h = p.h || 4;
    K.box('dark:wood', x, y, z, p.hx, 0.25, p.hz, 0, NO);
    K.box('dark:wood', x, y + h - 0.22, z, p.hx + 0.08, 0.3, p.hz + 0.08, 0, NO);
    K.box('dark:wood', x, y + 0.25, z, long ? t * 0.35 : a - 0.1, h - 0.47, long ? a - 0.1 : t * 0.35, 0, NO);
    for (const e of [-1, 1]) K.box('dark:wood', x + (long ? 0 : e * (a - 0.06)), y, z + (long ? e * (a - 0.06) : 0), long ? t + 0.04 : 0.07, h, long ? 0.07 : t + 0.04, 0, NO);
    // (The spines painted twice the pack's size: at its own they read as a grille. A lip of dark wood along each shelf, from
    // end-board to end-board and no further.)
    const y0 = y + 0.25, y1 = y + h - 0.22, w = a - 0.13, uv = [[0, (y1 - y0) / 1.76], [w * 2 / 2.38, (y1 - y0) / 1.76], [w * 2 / 2.38, 0], [0, 0]];
    for (const s of p.one ? [p.one] : [-1, 1]) {
      if (long) { const xb = x + s * (t - 0.03); K.quad('p2_book_spines', [xb, y0, z + s * w], [xb, y0, z - s * w], [xb, y1, z - s * w], [xb, y1, z + s * w], [s, 0, 0], uv); }
      else { const zb = z + s * (t - 0.03); K.quad('p2_book_spines', [x - s * w, y0, zb], [x + s * w, y0, zb], [x + s * w, y1, zb], [x - s * w, y1, zb], [0, 0, s], uv); }
      for (let sh = y0 + 1.76; sh < y1 - 0.3; sh += 1.76) K.box('dark:wood', x + (long ? s * (t - 0.01) : 0), sh - 0.04, z + (long ? 0 : s * (t - 0.01)), long ? 0.04 : w, 0.07, long ? w : 0.04, 0, NO);
    }
  },
  // A bench: a plank on two trestles, along x (or z, the longer way).
  bench(K, d, p, x, y, z) {
    const long = p.hz > p.hx, a = long ? p.hz : p.hx, yaw = long ? Math.PI / 2 : 0;
    K.box('wood', x, y + 0.4, z, a, 0.07, 0.2, yaw, NO);
    for (const s of [-1, 1]) K.box('wood', x + (long ? 0 : s * (a - 0.4)), y, z + (long ? s * (a - 0.4) : 0), 0.06, 0.4, 0.18, yaw, NO);
  },
  // A great horn of some beast on a bracket high on a wall, facing yaw out from it: up out of an iron collar, curving out and
  // up to its bell; iron bands round it. (The Horn Galleries': sounded, they turn the castle's patrols.)
  horn(K, d, p, x, y, z) {
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), h0 = y + (p.up ?? 5), s = p.s || 1, N = 7;
    const at = (t) => { const a = t * Math.PI * 0.5; return [x + fx * (0.25 + Math.sin(a) * 1.5 * s), h0 + (1 - Math.cos(a)) * 2.1 * s - 0.6 * s * (1 - t), z + fz * (0.25 + Math.sin(a) * 1.5 * s)]; };
    // (Its root strapped to an iron plate on the wall, a collar round it.)
    K.box('iron', x + fx * 0.04, h0 - 0.75 * s, z + fz * 0.04, 0.3 * s, 0.9 * s, 0.04, p.yaw, NO);
    { const r = at(0.08); K.drum('iron', r[0], r[1] - 0.1, r[2], 0.12 * s, 0.16, 8, { open: true, collide: false }); bar(K, 'iron', [x + fx * 0.06, r[1] - 0.02, z + fz * 0.06], r, 0.04, 0.04); }
    for (let k = 0; k < N; k++) {
      const a = at(k / N), b = at((k + 1) / N), r0 = (0.07 + 0.32 * (k / N) ** 2) * s, r1 = (0.07 + 0.32 * ((k + 1) / N) ** 2) * s;
      bar(K, 'pale:stone', a, b, r0, r1);
      if (k % 2) K.drum('iron', b[0], b[1] - 0.04, b[2], r1 * 1.2, 0.08, 8, { open: true, collide: false });
    }
    const e = at(1);
    K.drum('pale:stone', e[0], e[1], e[2], 0.42 * s, 0.35 * s, 10, { r2: 0.62 * s, open: true, collide: false });
    K.drum('iron', e[0], e[1] + 0.3 * s, e[2], 0.64 * s, 0.08, 10, { open: true, collide: false });
  },
  // An alchemist's still: a pot of iron on three legs over its coals, its head, an arm out to a flask of glass.
  // (A furnace of brick with its fire showing in its mouth, a round-bellied pot of dark copper on it, a swan neck down to a
  // flask of green glass on a stool: nothing of it shaped like a bell.)
  alembic(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, fx = Math.sin(yaw), fz = Math.cos(yaw);
    K.box('dark:block', x, y, z, 0.62, 0.9, 0.62, yaw, NO);
    K.box('obsidian', x + fx * 0.63, y + 0.15, z + fz * 0.63, 0.26, 0.4, 0.02, yaw, NO);
    fire(K, d, x + fx * 0.5, y + 0.12, z + fz * 0.5, 0.18, 0.35, { hue: 'flame', glow: 0.9 });
    K.drum('umber:iron', x, y + 0.9, z, 0.32, 0.22, 10, { r2: 0.5, open: true, collide: false });
    K.drum('umber:iron', x, y + 1.12, z, 0.5, 0.4, 10, { r2: 0.36, open: true, collide: false });
    K.drum('umber:iron', x, y + 1.52, z, 0.36, 0.2, 10, { r2: 0.12, collide: false });
    K.drum('umber:iron', x, y + 1.72, z, 0.1, 0.3, 6, { r2: 0.08, collide: false });
    const top = [x, y + 2.0, z], mid = [x + fx * 0.6, y + 2.15, z + fz * 0.6], end = [x + fx * 1.35, y + 1.05, z + fz * 1.35];
    bar(K, 'umber:iron', top, mid, 0.04, 0.035); bar(K, 'umber:iron', mid, end, 0.035, 0.03);
    K.box('wood', x + fx * 1.45, y, z + fz * 1.45, 0.28, 0.6, 0.28, yaw, NO);
    K.drum('forest:stone', x + fx * 1.45, y + 0.6, z + fz * 1.45, 0.24, 0.32, 8, { r2: 0.07, collide: false });
  },
  // A shelf of the alchemists' jars against a wall, facing yaw out from it: boards on brackets, jars of green glass on them.
  jarshelf(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), w = p.w || 2;
    for (let h = 0; h < 3; h++) {
      const by = y + 0.9 + h * 0.7;
      K.box('dark:wood', x + s * 0.18, by, z + c * 0.18, w, 0.05, 0.2, p.yaw, NO);
      for (let u = -w + 0.2; u <= w - 0.2; u += 0.32) {
        const k = Math.round((u + h * 1.7) * 10), jh = 0.18 + 0.12 * (((k % 3) + 3) % 3), jr = 0.07 + 0.03 * (((k % 2) + 2) % 2);
        K.drum(k % 4 ? 'forest:stone' : 'umber:stone', x + u * c + s * 0.18, by + 0.05, z - u * s + c * 0.18, jr, jh, 6, { r2: jr * 0.8, collide: false });
      }
    }
  },
  // The map table: a long table with the castle's map on it in canvas (no letters: lines and blocks), pins of iron stuck in it,
  // candles at the corners.
  maptable(K, d, p, x, y, z) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box('wood', x + sx * (p.hx - 0.3), y, z + sz * (p.hz - 0.3), 0.12, 0.85, 0.12, 0, NO);
    K.box('wood', x, y + 0.85, z, p.hx, 0.1, p.hz, 0, NO);
    K.quad('p2_hessian', [x - p.hx + 0.2, y + 0.96, z + p.hz - 0.2], [x + p.hx - 0.2, y + 0.96, z + p.hz - 0.2], [x + p.hx - 0.2, y + 0.96, z - p.hz + 0.2], [x - p.hx + 0.2, y + 0.96, z - p.hz + 0.2], [0, 1, 0]);
    for (let k = 0; k < 9; k++) { const u = (hash2(k, x) - 0.5) * (p.hx - 0.6) * 2, w = (hash2(z, k) - 0.5) * (p.hz - 0.6) * 2; K.drum(k % 3 ? 'iron' : 'cloth_red', x + u, y + 0.96, z + w, 0.04, 0.22, 5, { r2: 0.02, collide: false }); }
    for (const sx of [-1, 1]) { const cx = x + sx * (p.hx - 0.35), cz = z - p.hz + 0.35; K.drum('pale:stone', cx, y + 0.96, cz, 0.05, 0.3, 5, NO); fire(K, d, cx, y + 1.26, cz, 0.05, 0.16, { glow: 0.5 }); }
    // The castle on it, carved: three wards stepping up to the east, the Keep's spires on the highest, his red on the Keep.
    for (const [u, hx, hz, h] of [[-0.45, 0.5, 0.95, 0.08], [0.1, 0.42, 0.8, 0.16], [0.6, 0.36, 0.7, 0.26]]) K.box('dark:wood', x + u * p.hx, y + 0.96, z, hx, h, hz, 0, NO);
    for (const [u, w, h] of [[0.6, 0, 0.55], [0.72, 0.4, 0.42], [0.48, -0.4, 0.38], [0.75, -0.3, 0.34]]) K.drum('dark:wood', x + u * p.hx, y + 1.22, z + w, 0.07, h, 6, { r2: 0.05, collide: false });
    K.cone('blood:cloth_red', x + 0.6 * p.hx, y + 1.77, z, 0.08, 0.22, 6);
  },
  // A dead tree in a planter of dark stone: a trunk and its bare limbs, up out of grey earth.
  deadtree(K, d, p, x, y, z) {
    const h = p.h || 6, r = p.r || 1.6, turn = x * 1.3 + z;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; K.box('dark:block', x + Math.cos(a) * r, y, z + Math.sin(a) * r, 0.62 * r * 0.78, 0.55, 0.22, Math.PI / 2 - a, NO); }
    K.disc('dark:rubble', x, y + 0.45, z, r, 12);
    // (The trunk a round drum, not a bar: a bar's painting runs on the slant and stripes it.)
    const top = [x, y + h * 0.55, z];
    K.drum('dark:wood', x, y + 0.3, z, 0.3 * h / 6, h * 0.55 - 0.3, 7, { r2: 0.2 * h / 6, collide: false, turn });
    for (let k = 0; k < 5; k++) {
      const a = turn + k * 1.37, up = h * (0.4 + 0.12 * (k % 3)), o = h * (0.18 + 0.06 * (k % 2));
      const b = [x + Math.cos(a) * o * 0.35, y + up, z + Math.sin(a) * o * 0.35], c = [x + Math.cos(a) * o, y + up + h * 0.32, z + Math.sin(a) * o];
      bar(K, 'dark:wood', k ? b : top, c, 0.13, 0.04);
      if (k % 2 === 0) bar(K, 'dark:wood', c, [c[0] + Math.cos(a + 0.9) * 0.8, c[1] + 0.7, c[2] + Math.sin(a + 0.9) * 0.8], 0.04, 0.015);
    }
  },
  // A casting pit in a forge's floor: a ring of dark stone round a round of metal run molten, glowing. (What his idol is
  // cast in, at the end.)
  castpit(K, d, p, x, y, z) {
    K.disc('soot:block', x, y + 0.03, z, p.r + 0.9, 16);
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; K.box('dark:block', x + Math.cos(a) * (p.r + 0.35), y, z + Math.sin(a) * (p.r + 0.35), 0.36, 0.45, 0.2, Math.PI / 2 - a, NO); }
    K.disc(d.look.flame, x, y + 0.3, z, p.r, 16); K.disc('blood:flame', x, y + 0.32, z, p.r * 0.55, 12);
    glow(K, d, x, y + 0.9, z, p.r * 1.6);
  },
  // A pit cut in a floor: a kerb of dark stone, block against block, round a round of black water far down. (The
  // oubliettes': you're put down one.)
  pit(K, d, p, x, y, z) {
    K.disc('lake', x, y + 0.04, z, p.r, 20);
    const n = 22, R = p.r + 0.3, half = Math.PI * R / n + 0.03;
    for (let k = 0; k < n; k++) { const a = k / n * TAU; K.box('dark:ashlar', x + Math.cos(a) * R, y, z + Math.sin(a) * R, half, 0.4, 0.3, Math.PI / 2 - a, NO); }
  },
  // His mark: a ring of black iron upright, facing yaw, two horns of his red fire standing out of its top. On his gates and
  // his chairs. (A ring and two horns: no letter, nothing of hers.)
  mark(K, d, p, x, y, z) {
    const r = p.r || 0.8, h = y + (p.up ?? 3) + r, c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), g = r / 0.8;
    // (A round of his red behind it, so the black ring shows on black stone: slices, widest at the middle.)
    const R = r * 1.3, b = (p.back || 1) * 0.1;
    for (let i = 0; i < 9; i++) { const v = -R + (i + 0.5) * R * 2 / 9; K.box('cloth_red', x + b * s, h + v - R / 9, z + b * c, Math.sqrt(R * R - v * v), R * 2 / 9, 0.03, p.yaw || 0, NO); }
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, u = Math.cos(a) * r; K.box('iron', x + u * c, h + Math.sin(a) * r - 0.07 * g, z - u * s, 0.1 * g, 0.14 * g, 0.06 * g, p.yaw || 0, NO); }
    for (const sg of [-1, 1]) { const u = sg * r * 0.55; K.cone('blood:flame', x + u * c, h + r * 0.8, z - u * s, 0.13 * g, 0.95 * g, 5); glow(K, d, x + u * c, h + r * 1.2, z - u * s, 0.9 * g, 'blood:flame'); }
  },
  // A fire basket: an iron bowl up on a wall-walk's merlon, burning.
  basket(K, d, p, x, y, z) {
    const h = y + p.up;
    K.drum('iron', x, h, z, 0.22, 0.3, 7, { r2: 0.4, open: true, collide: false });
    fire(K, d, x, h + 0.25, z, 0.35, 0.9, { ember: true, glow: 1.6 });
  },
  // A painting of the PH2 pack laid once (tools/phobos/textures/wire_ph2.py), cut out: flat on a wall at up (its foot), w
  // across and h up, facing yaw (0: +z); or flat on the floor (flat). Cobwebs, old blood, scorch, a prisoner's tallies.
  decal(K, d, p, x, y, z) {
    const w = p.w || 1, h = p.h || w, c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    if (p.flat) {
      const P = (u, v) => [x + u * c + v * s, y + 0.03, z - u * s + v * c];
      K.quad(p.layer, P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2), [0, 1, 0], uv);
      return;
    }
    const top = y + (p.up ?? 1) + h, P = (u, yy) => [x + u * c, yy, z - u * s];
    K.quad(p.layer, P(-w / 2, top), P(w / 2, top), P(w / 2, top - h), P(-w / 2, top - h), [s, 0, c], uv);
  },
  // An iron sill across a floor: where something comes down (the gate's teeth, in their slots overhead).
  sill(K, d, p, x, y, z) { K.box('iron', x, y, z, p.hx, 0.05, p.hz || 0.3, 0, NO); },
  // A wall-walk up a yard's wall: a ledge of stone at up, corbels under it, merlons along its edge on the yard's side (side:
  // which way that is, +1 or -1 along the ledge's short way).
  walk(K, d, p, x, y, z) {
    const h = y + p.up, along = p.hx > p.hz, len = along ? p.hx : p.hz, deep = along ? p.hz : p.hx, sd = p.side || 1;
    K.box('ashlar', x, h - 0.45, z, p.hx, 0.45, p.hz, 0, NO);
    for (let u = -len + 1; u <= len - 1; u += 2) {
      const ex = along ? x + u : x + sd * deep, ez = along ? z + sd * deep : z + u;
      K.box('ashlar', ex - (along ? 0 : sd * 0.18), h, ez - (along ? sd * 0.18 : 0), along ? 0.5 : 0.18, 1.1, along ? 0.18 : 0.5, 0, NO);
      const cx = along ? x + u : x - sd * (deep - 0.5), cz = along ? z - sd * (deep - 0.5) : z + u;
      K.box('dark:block', cx, h - 1.3, cz, along ? 0.25 : 0.5, 0.85, along ? 0.5 : 0.25, 0, NO);
    }
    K.box('ashlar', along ? x : x + sd * deep, h, along ? z + sd * deep : z, along ? p.hx : 0.12, 0.45, along ? 0.12 : p.hz, 0, NO);
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
    coals(K, d, x, y + 0.05, z, p.r * 0.6, 'flame');
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + x + 1; fire(K, d, x + Math.cos(a) * p.r * 0.7, y + 0.05, z + Math.sin(a) * p.r * 0.7, 0.2, 0.5, { hue: 'flame' }); }
    // (Drips down its side, gone hard.)
    for (let k = 0; k < 4; k++) { const a = k * 1.9 + z; K.cone('pale:stone', x + Math.cos(a) * p.r * 1.1, y + 1.2, z + Math.sin(a) * p.r * 1.1, 0.07, -0.5 - (k % 2) * 0.3, 4); }
  },
  // A carcass on a spit over a fire.
  spit(K, d, p, x, y, z) {
    for (const u of [-1.3, 1.3]) { K.box('wood', x + u, y - 0.1, z, 0.06, 1.3, 0.06, 0, NO); }
    rod(K, 'iron', x - 1.5, y + 1.15, z, x + 1.5, y + 1.15, z, 0.03);
    egg(K, 'cloth_oat', x, y + 0.85, z, 0.4, 0.75);
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5; K.box('dark:rubble', x + Math.cos(a) * 0.8, y - 0.1, z + Math.sin(a) * 0.8, 0.2, 0.3, 0.16, a, NO); }
    coals(K, d, x, y + 0.05, z, 0.55, 'flame');
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3; bar(K, 'wood', [x + Math.cos(a) * 0.6, y, z + Math.sin(a) * 0.6], [x - Math.cos(a) * 0.15, y + 0.3, z - Math.sin(a) * 0.15], 0.06); }
    for (const [ox, oz, h] of [[0, 0, 0.8], [0.3, 0.15, 0.55], [-0.25, -0.1, 0.6]]) fire(K, d, x + ox, y + 0.08, z + oz, 0.3, h, { hue: 'flame', ember: !ox, glow: ox ? 0 : 1.6 });
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
    // A mound of coin in three slumped tiers, coin slid out round its foot, cups and a plate standing out of it.
    const r = p.r;
    K.drum('gold', x, y - 0.15, z, r, r * 0.3, 11, { r2: r * 0.66, collide: false, turn: x, open: true });
    K.drum('gold', x + r * 0.06, y - 0.15 + r * 0.3, z, r * 0.66, r * 0.2, 9, { r2: r * 0.34, collide: false, turn: z, open: true });
    K.drum('gold', x + r * 0.1, y - 0.15 + r * 0.5, z + r * 0.03, r * 0.34, r * 0.12, 7, { r2: r * 0.12, collide: false, turn: x, lid: 'gold' });
    for (let k = 0; k < 7; k++) { const a = k * 0.93 + x, o = r * (0.95 + 0.35 * hash2(k, x)); K.drum('gold', x + Math.cos(a) * o, y - 0.02, z + Math.sin(a) * o, r * (0.1 + 0.12 * hash2(x, k)), 0.06, 6, { collide: false, turn: k, lid: 'gold' }); }
    K.drum('iron', x - r * 0.5, y + r * 0.16, z + r * 0.3, 0.2, 0.35, 6, { r2: 0.28, collide: false });
    K.drum('gold', x + r * 0.45, y + r * 0.2, z - r * 0.25, 0.1, 0.22, 6, { r2: 0.05, collide: false, open: true }); K.drum('gold', x + r * 0.45, y + r * 0.2 + 0.22, z - r * 0.25, 0.05, 0.2, 6, { r2: 0.17, collide: false, open: true });
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
  // Iron bars in a culvert's mouth (below): nine uprights and two rails in its opening. What's solid is the prop's own
  // box, a little wider, so nothing slips by at the sides.
  grate(K, d, p, x, y, z) {
    const across = p.hz > p.hx, w = CULVERT.hw - 0.05, y0 = y + CULVERT.sill, n = 9;
    for (let i = 0; i < n; i++) { const u = (i / (n - 1) * 2 - 1) * w; K.box('iron', across ? x : x + u, y0 - 0.1, across ? z + u : z, 0.045, CULVERT.high + 0.2, 0.045, 0, NO); }
    for (const h of [0.5, 1.8]) K.box('iron', x, y0 + h, z, across ? 0.03 : w, 0.07, across ? w : 0.03, 0, NO);
  },
  // A drain built through the rock: a square culvert of coursed stone from its head (where the prop stands) down to its
  // foot (to), with a headwall round its mouth at each end. It lines a tunnel cut for it (a delve's `drain`), which is
  // too steep for the cave's own walls to close properly; the grates stand in its two mouths.
  culvert(K, d, p, x, y, z) {
    const { hw, sill, high } = CULVERT, fx = d.x + p.to[0], fz = d.z + p.to[1], fy = caveFloorY(fx, fz);
    const L = Math.hypot(fx - x, fz - z) || 1, tx = (fx - x) / L, tz = (fz - z) / L, sx = -tz, sz = tx;
    // (A face wound to look the way asked.)
    const face = (layer, a, b, c, e, want) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [e[0] - a[0], e[1] - a[1], e[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0) K.quad(layer, a, b, c, e); else K.quad(layer, e, c, b, a);
    };
    // (A little past each mouth, so the lining runs into its headwall.)
    const at = (k, side, up) => { const px = x + (fx - x) * k, pz = z + (fz - z) * k, py = y + (fy - y) * k; return [px + sx * side * hw, py + sill + up * high, pz + sz * side * hw]; };
    const k0 = -0.2 / L, k1 = 1 + 0.2 / L, lining = p.layer || d.look.wall;
    face(lining, at(k0, -1, 0), at(k0, 1, 0), at(k1, 1, 0), at(k1, -1, 0), [0, 1, 0]);
    face(lining, at(k0, -1, 1), at(k0, 1, 1), at(k1, 1, 1), at(k1, -1, 1), [0, -1, 0]);
    face(lining, at(k0, -1, 0), at(k1, -1, 0), at(k1, -1, 1), at(k0, -1, 1), [sx, 0, sz]);
    face(lining, at(k0, 1, 0), at(k1, 1, 0), at(k1, 1, 1), at(k0, 1, 1), [-sx, 0, -sz]);
    // The headwalls: two piers, a sill and a lintel round the opening, wide and tall enough to close the cut's own mouth.
    const along = Math.abs(tx) > Math.abs(tz), stone = p.head || lining, cap = p.cap || stone;
    for (const [mx, my, mz] of [[x, y, z], [fx, fy, fz]]) {
      const wide = 4.2, top = Math.max(caveRoofY(mx + 0.01, mz + 0.01) + 1.2, my + sill + high + 1);
      const box = (layer, u, y0, y1, half) => K.box(layer, mx + sx * u, y0, mz + sz * u, along ? 0.28 : half, y1 - y0, along ? half : 0.28, 0, NO);
      for (const side of [-1, 1]) box(stone, side * (hw + (wide - hw) / 2), my - 1.2, top, (wide - hw) / 2);
      box(stone, 0, my - 1.2, my + sill, hw);
      box(cap, 0, my + sill + high, my + sill + high + 0.45, hw + 0.25);
      box(stone, 0, my + sill + high + 0.45, top, hw);
    }
  },
  // ---- the sewers of Phobos (src/core/delve-sewers.js) ----
  // A sewer's run: a hand of water down the middle of a passage from here to `to`, a kerb either side, following the floor.
  channel(K, d, p, x, y, z) {
    const tx = d.x + p.to[0], tz = d.z + p.to[1], L = Math.hypot(tx - x, tz - z) || 1, ux = (tx - x) / L, uz = (tz - z) / L, sx = -uz, sz = ux, w = p.w || 1.3;
    const n = Math.max(1, Math.round(L / 4)), kerb = d.look.foot || d.look.wall;
    for (let k = 0; k < n; k++) {
      const a = k / n * L, b = (k + 1) / n * L, ax = x + ux * a, az = z + uz * a, bx = x + ux * b, bz = z + uz * b;
      const ya = caveFloorY(ax, az) + 0.04, yb = caveFloorY(bx, bz) + 0.04;
      K.quad('lake', [ax + sx * w, ya, az + sz * w], [bx + sx * w, yb, bz + sz * w], [bx - sx * w, yb, bz - sz * w], [ax - sx * w, ya, az - sz * w], [0, 1, 0]);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, my = Math.min(ya, yb) - 0.1, yaw = Math.atan2(ux, uz);
      // (A kerb a shin high, so the run reads as a channel down the passage and not a stripe on its floor.)
      for (const e of [-1, 1]) K.box(kerb, mx + sx * (w + 0.14) * e, my, mz + sz * (w + 0.14) * e, 0.16, 0.44, (b - a) / 2 + 0.02, yaw, NO);
    }
  },
  // A great wheel of timber and iron high in a wall, facing south: the Wharf's sluice wheel, seen from under it.
  wheel(K, d, p, x, y, z) {
    const cy = y + p.up, r = p.r, N = 16;
    for (let k = 0; k < N; k++) {
      const a = k / N * TAU, b = (k + 1) / N * TAU;
      rod(K, 'wood', x + Math.cos(a) * r, cy + Math.sin(a) * r, z, x + Math.cos(b) * r, cy + Math.sin(b) * r, z, 0.22);
      K.box('wood', x + Math.cos(a + 0.2) * (r + 0.4), cy + Math.sin(a + 0.2) * (r + 0.4) - 0.5, z + 0.1, 0.08, 1, 0.7, 0, NO);
      if (k % 2 === 0) rod(K, 'wood', x, cy, z + 0.2, x + Math.cos(a) * r, cy + Math.sin(a) * r, z + 0.2, 0.14);
    }
    K.drum('iron', x, cy - 0.5, z, 0.7, 1, 10, NO);
    rod(K, 'iron', x, cy, z - 1.2, x, cy, z + 1.2, 0.25);
  },
  // A stone spout high in a wall, facing south, and the water off its lip down to the floor.
  // (layer: what its water's drawn in; falls, a white sheet, if not said.)
  spout(K, d, p, x, y, z) {
    const top = y + p.up, w = p.w, wl = p.layer || 'falls';
    K.box(d.look.foot || 'block', x, top - 0.5, z + 0.6, w + 0.4, 0.5, 1.4, 0, NO);
    K.box(d.look.foot || 'block', x, top, z + 0.2, w + 0.6, 1.2, 1, 0, NO);
    K.quad(wl, [x - w, y - 0.1, z + 3.2], [x + w, y - 0.1, z + 3.2], [x + w, top - 0.5, z + 1.9], [x - w, top - 0.5, z + 1.9]);
    K.quad(wl, [x + w, y - 0.1, z + 3.2], [x - w, y - 0.1, z + 3.2], [x - w, top - 0.5, z + 1.9], [x + w, top - 0.5, z + 1.9]);
  },
  // A shaft of daylight down from a garden over the roof: the sky's disc where the roof's open, and the light's pool on the
  // floor under it (its lamp: src/core/dungeon.js braziers, LIT).
  daylight(K, d, p, x, y, z) {
    const top = caveRoofY(x, z), r = p.r;
    K.drum('pale:flame', x, top - 0.25, z, r, 0.2, 16, { collide: false });
    K.drum('pale:stone', x, top - 0.45, z, r + 0.5, 0.2, 16, { r2: r, open: true, collide: false });
    // (pool: false, no pale round on the floor under it: its own cold light lights the floor, src/gfx/renderer.js.)
    if (p.pool !== false) K.drum('pale:flame', x, y + 0.01, z, r * 1.15, 0.02, 16, { collide: false });
  },
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
      mushroom(K, px, py, pz, h, a);
    }
    // (And the small ones round their feet.)
    for (let k = 0; k < p.n; k++) { const a = k * 1.9 + z, o = 0.3 + hash2(k, z | 0) * (1.2 + p.s), px = x + Math.cos(a) * o, pz = z + Math.sin(a) * o, py = caveFloorY(px, pz), h = 0.1 + 0.12 * hash2(x | 0, k); K.drum('cloth_oat', px, py - 0.03, pz, 0.025, h, 4, NO); K.cone('fruit', px, py + h - 0.02, pz, 0.07 + h * 0.4, 0.07, 6, a); }
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
  // (up: hung so much higher; a gallery's second row. sitter: one of his house painted in it, a dark ground, a pale face and
  // the cloth of their livery (no letters, no plaque); then its frame dark iron, and sz so much bigger.)
  portrait(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), k = p.sz || 1, q = (u, h, o) => [x + u * k * c + o * s, y + (h - 1.5) * k + 1.5 + (p.up || 0), z - u * k * s + o * c];
    K.quad(p.sitter ? 'iron' : 'wood', q(-0.8, 1.5, 0.03), q(0.8, 1.5, 0.03), q(0.8, 3.7, 0.03), q(-0.8, 3.7, 0.03), [s, 0, c]);
    K.quad('dark:cloth_oat', q(-0.62, 1.68, 0.06), q(0.62, 1.68, 0.06), q(0.62, 3.52, 0.06), q(-0.62, 3.52, 0.06), [s, 0, c]);
    if (!p.sitter) return;
    // The sitter: shoulders in their cloth, a neck, a face, the hair over it; and a hand at the breast.
    K.quad(p.sitter, q(-0.5, 1.68, 0.075), q(0.5, 1.68, 0.075), q(0.36, 2.55, 0.075), q(-0.36, 2.55, 0.075), [s, 0, c]);
    K.quad('pale:cloth_oat', q(-0.07, 2.5, 0.08), q(0.07, 2.5, 0.08), q(0.07, 2.66, 0.08), q(-0.07, 2.66, 0.08), [s, 0, c]);
    K.quad('pale:cloth_oat', q(-0.15, 2.62, 0.085), q(0.15, 2.62, 0.085), q(0.13, 3.02, 0.085), q(-0.13, 3.02, 0.085), [s, 0, c]);
    K.quad('dark:wood', q(-0.17, 2.9, 0.09), q(0.17, 2.9, 0.09), q(0.12, 3.14, 0.09), q(-0.12, 3.14, 0.09), [s, 0, c]);
    K.quad('pale:cloth_oat', q(0.05, 2.0, 0.08), q(0.2, 2.0, 0.08), q(0.2, 2.12, 0.08), q(0.05, 2.12, 0.08), [s, 0, c]);
  },
  // A rail of coats: two posts, a bar, what hangs from it.
  coatrail(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw || 0), s = Math.sin(p.yaw || 0), w = p.hx;
    for (const u of [-w, w]) K.box('wood', x + u * c, y, z - u * s, 0.05, 1.8, 0.05, 0, NO);
    rod(K, 'wood', x - w * c, y + 1.8, z + w * s, x + w * c, y + 1.8, z - w * s, 0.03);
    for (let u = -w + 0.35; u < w; u += 0.55) {
      const k = Math.round(u * 7), layer = ['dark:cloth_oat', 'spore:cloth_oat', 'cloth_oat', 'dark:cloth_oat'][((k % 4) + 4) % 4];
      // (A skirt, a bodice, two sleeves, a hook to the rail: at three lengths.)
      const cx = x + u * c, cz = z - u * s, len = 0.75 + 0.2 * (((k % 3) + 3) % 3), sh = y + 1.62;
      K.drum(layer, cx, sh - 0.5 - len, cz, 0.3, len, 6, { r2: 0.13, open: true, collide: false, turn: k });
      K.drum(layer, cx, sh - 0.5, cz, 0.13, 0.42, 6, { r2: 0.19, collide: false, turn: k });
      for (const sd of [-1, 1]) bar(K, layer, [cx + sd * 0.19 * s, sh - 0.12, cz + sd * 0.19 * c], [cx + sd * 0.3 * s, sh - 0.68, cz + sd * 0.3 * c], 0.05, 0.04);
      rod(K, 'iron', cx, sh - 0.08, cz, cx, y + 1.8, cz, 0.012);
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
    fire(K, d, x, y + 0.12, z, 0.1, 0.3, { hue: 'flame', glow: 0.6 });
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
  // (stone: dressed stone for it, a castle's, not rubble.)
  lintel(K, d, p, x, y, z) {
    const along = p.hx !== undefined, w = along ? p.hx : p.hz, top = Math.min(caveRoofY(x, z) - y - 0.9, 5.2);
    for (const u of [-w + 0.45, w - 0.45]) K.box(p.stone || 'rubble', x + (along ? u : 0), y - 0.2, z + (along ? 0 : u), along ? 0.42 : 0.5, top + 0.2, along ? 0.5 : 0.42, 0, NO);
    K.box(p.stone || 'pale:rubble', x, y + top, z, along ? w : 0.6, 0.7, along ? 0.6 : w, 0, NO);
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
  // ---- the Elder Gods' islands (src/core/delve-elder.js) ----
  // The broken arch the way in stands in: two leaning piers of old block, one gone at two thirds of its height, the lintel
  // snapped off short above the other; void crystal grown out of the break, and the fallen stone at their feet.
  voidarch(K, d, p, x, y, z) {
    const w = p.w, h = p.h;
    for (const [s, top, lean] of [[-1, h, -0.06], [1, h * 0.66, 0.04]]) {
      const px = x + s * w;
      K.box('void:block', px, y - 0.3, z, 0.7, 0.6, 0.7, 0, NO);
      K.drum('void:block', px, y + 0.25, z, 0.5, top - 0.25, 4, { r2: 0.42, collide: false, turn: Math.PI / 4, open: true });
      K.box('void:block', px + lean, y + top - 0.05, z, 0.55, 0.32, 0.6, 0, NO);
    }
    // (The lintel: from the whole pier halfway across, its end jagged.)
    for (let k = 0; k < 5; k++) K.box('void:block', x - w + k * 0.55, y + h + 0.27, z, 0.3, 0.55 - k * 0.07, 0.48, k * 0.05, NO);
    crystal(K, 'voidglass', x + w, y + h * 0.66 + 0.2, z, 0.22, 1.5, [-0.1, 0.05], 0.4);
    crystal(K, 'voidglass', x + w + 0.25, y + h * 0.66 + 0.1, z + 0.2, 0.13, 0.9, [0.25, 0.1], 1.1);
    for (let k = 0; k < 6; k++) { const a = k * 1.9 + 0.3, r = 1.2 + hash2(k, 3) * 1.6; K.box('void:rubble', x + w * 0.9 + Math.cos(a) * r, y - 0.15, z - 1 + Math.sin(a) * r * 0.6, 0.25 + hash2(k, 5) * 0.3, 0.3 + hash2(k, 7) * 0.25, 0.22 + hash2(k, 9) * 0.25, a, NO); }
    glow(K, d, x + w, y + h * 0.66 + 1.2, z, 1.4);
  },
  // Void crystal: a long shard of black-violet glass grown out of the stone, and (cluster) a ring of smaller ones about it.
  voidcrystal(K, d, p, x, y, z) {
    const t = hash2(x * 1.3, z * 0.7) * TAU, lean = [(hash2(x, z * 3) - 0.5) * 0.3, (hash2(z, x * 3) - 0.5) * 0.3];
    K.drum('void:rubble', x, y - 0.25, z, p.r * 1.6, 0.35, 6, { r2: p.r * 1.1, collide: false, turn: t });
    crystal(K, 'voidglass', x, y - 0.1, z, p.r, p.h, lean, t);
    const n = p.cluster ? 5 : 2;
    for (let k = 0; k < n; k++) {
      const a = t + k * TAU / n + 0.4, o = p.r * 1.25, hh = p.h * (0.3 + 0.35 * hash2(k, x));
      crystal(K, 'voidglass', x + Math.cos(a) * o, y - 0.1, z + Math.sin(a) * o, p.r * (0.35 + 0.2 * hash2(z, k)), hh, [Math.cos(a) * 0.35, Math.sin(a) * 0.35], a);
    }
    if (p.h > 2.5) glow(K, d, x, y + p.h * 0.4, z, 0.6 + p.h * 0.12);
  },
  // A dragon's scale as tall as a man or more, stood on its root in a socket of stone: a slab that narrows to a point,
  // edge-on to the altar's middle (yaw). In its god's colour where it has one: green, red, bone, black.
  scalestone(K, d, p, x, y, z) {
    const layer = { green: 'mire:block', red: 'dark:block', undead: 'pale:block', black: 'obsidian' }[p.god] || 'void:block';
    const yaw = p.yaw ?? hash2(x, z) * TAU, r = p.r, h = p.h;
    K.drum('void:rubble', x, y - 0.3, z, r * 1.2, 0.55, 6, { r2: r * 0.95, collide: false, turn: yaw });
    for (let k = 0; k < 4; k++) {
      const u = k / 4, w = r * (1 - u * 0.78), hh = h / 4;
      K.box(layer, x, y + 0.2 + u * h * 0.85, z, w, hh * 0.9, 0.16 + 0.06 * (1 - u), yaw, NO);
    }
    K.spike(layer, x, y + 0.2 + h * 0.85 + h / 4 * 0.8, z, r * 0.3, h * 0.28, 4, yaw + Math.PI / 4);
    // (A light about its foot: its god's colour is lit over it while that god lives, src/sim/voidland.js voidDraw.)
    glow(K, d, x, y + 0.6, z, 1.1);
  },
  // The altar the four scales stand round: two broad steps of old block, a ring of runes alight in the upper, a dish of
  // void glass in its middle.
  scalealtar(K, d, p, x, y, z) {
    K.drum('void:block', x, y - 0.4, z, p.r, 0.55, 16, { collide: false });
    K.drum('void:block', x, y + 0.15, z, p.r * 0.7, 0.2, 16, { collide: false });
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, b = (i + 0.7) / 24 * TAU, r0 = p.r * 0.5, r1 = p.r * 0.6, yy = y + 0.36;
      K.quad('rune', [x + Math.cos(a) * r0, yy, z + Math.sin(a) * r0], [x + Math.cos(a) * r1, yy, z + Math.sin(a) * r1], [x + Math.cos(b) * r1, yy, z + Math.sin(b) * r1], [x + Math.cos(b) * r0, yy, z + Math.sin(b) * r0], [0, 1, 0]);
    }
    K.drum('void:block', x, y + 0.35, z, 0.9, 0.5, 8, { r2: 1.15, collide: false, open: true });
    K.disc('voidglass', x, y + 0.8, z, 1.1, 12);
    glow(K, d, x, y + 1.2, z, 2.2);
  },
  // A seal across a bridge's mouth: two obelisks of void block either side, and between them a sheet of the god's ward
  // (scenery `${tag}_seal_${key}`, gone when it opens: src/sim/voidland.js). The first is open from the start.
  voidseal(K, d, p, x, y, z) {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), w = p.w, h = p.h;
    // (Across the way: yaw is the way's own heading, so across is square to it.)
    const ax = c, az = -s;
    for (const sd of [-1, 1]) {
      const ox = x + ax * sd * (w + 0.5), oz = z + az * sd * (w + 0.5);
      K.drum('void:block', ox, y - 0.3, oz, 0.62, 0.5, 4, { collide: false, turn: p.yaw + Math.PI / 4 });
      K.drum('void:block', ox, y + 0.2, oz, 0.48, h, 4, { r2: 0.3, collide: false, turn: p.yaw + Math.PI / 4, open: true });
      K.spike('void:block', ox, y + 0.2 + h, oz, 0.3, 0.9, 4, p.yaw + Math.PI / 4);
      for (let k = 0; k < 3; k++) K.box('rune', ox, y + 1.2 + k * 1.3, oz, 0.34, 0.12, 0.34, p.yaw, NO);
    }
    if (p.open) return;
    K.group(`${d.tag}_seal_${p.key}`, true, () => {
      const N = 6;
      for (let k = 0; k < N; k++) {
        const u0 = -w + (2 * w) * k / N, u1 = -w + (2 * w) * (k + 1) / N, top = (u) => y + h - 0.8 * (u / w) ** 2;
        K.quad('seal', [x + ax * u0, y, z + az * u0], [x + ax * u1, y, z + az * u1], [x + ax * u1, top(u1), z + az * u1], [x + ax * u0, top(u0), z + az * u0]);
      }
      glow(K, d, x, y + h * 0.5, z, 2.4, 'frost:flame');
    });
  },
  // A lightning pylon of the Galeward: a plinth, a tapering shaft of pale stone bound in iron, three iron rings round its
  // head and a stormglass heart in them, alight. Solid (it's what the gale can't get behind).
  pylon(K, d, p, x, y, z) {
    const r = p.r, h = p.h, t = p.n * 0.7;
    K.drum('pale:block', x, y - 0.3, z, r * 1.25, 1.1, 8, { r2: r * 1.1, collide: false, turn: t });
    K.drum('pale:block', x, y + 0.8, z, r * 0.8, h - 2.6, 8, { r2: r * 0.5, collide: false, turn: t, open: true });
    for (const k of [0.25, 0.5, 0.75]) K.drum('iron', x, y + 0.8 + (h - 2.6) * k, z, r * (0.8 - 0.3 * k) + 0.06, 0.22, 8, { collide: false, turn: t, open: true });
    for (let k = 0; k < 3; k++) {
      const hy = y + h - 1.8 + k * 0.55, rr = 1.2 - k * 0.22;
      K.drum('iron', x, hy, z, rr, 0.12, 12, { collide: false, open: true });
      for (let i = 0; i < 3; i++) { const a = t + i * TAU / 3 + k; rod(K, 'iron', x + Math.cos(a) * r * 0.5, y + h - 2.0, z + Math.sin(a) * r * 0.5, x + Math.cos(a) * rr, hy, z + Math.sin(a) * rr, 0.035); }
    }
    crystal(K, 'storm', x, y + h - 1.9, z, 0.38, 1.9, [0, 0], t);
    glow(K, d, x, y + h - 0.9, z, 2.6, 'frost:flame');
  },
  // The Cinderwell's vent: the island's middle gone down into the void, magma a long way down it, its light coming up.
  vent(K, d, p, x, y, z) {
    const base = caveFloorY(x + p.r + 4, z);
    // (Its magma a few metres down, where it's seen from the ring, and its light up over the rim.)
    K.disc('magma', x, base - 3.2, z, p.r * 0.97, 24);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; glow(K, d, x + Math.cos(a) * p.r * 0.55, base - 2.6, z + Math.sin(a) * p.r * 0.55, 3.4, 'dark:flame'); }
    glow(K, d, x, base - 1, z, 6.5, 'dark:flame');
  },
  // A column of basalt: six-sided, standing a step and a half out of the Cinderwell's floor (y is its top), a flared foot,
  // cracks of magma at its foot. The field has it as a dais; this is only how it looks.
  basalt(K, d, p, x, y, z) {
    const r = p.r * 1.07, foot = y - p.up, t = p.n * 0.9;
    K.drum('dark:stone', x, foot - 0.4, z, r * 1.12, 0.55, 6, { r2: r, collide: false, turn: t, open: true });
    K.drum('dark:stone', x, foot + 0.15, z, r, p.up - 0.15, 6, { r2: r * 0.98, collide: false, turn: t });
    K.drum('magma', x, foot - 0.02, z, r * 1.2, 0.06, 6, { r2: r * 1.14, collide: false, turn: t, open: true });
    if (p.n % 3 === 0) glow(K, d, x, foot + 0.3, z, 1.4, 'dark:flame');
  },
  // Rime: a knot of ice grown up out of the ledge, taller than a man (what you hold to against the Grasp); a claw of it
  // (claw) on each of the Rimespire's islets, where Morvekh's grip goes in at the end.
  rime(K, d, p, x, y, z) {
    const t = hash2(x, z) * TAU;
    K.drum('frost:rubble', x, y - 0.3, z, p.r * 1.6, 0.45, 6, { r2: p.r * 1.1, collide: false, turn: t, lid: 'white' });
    crystal(K, 'ice', x, y - 0.1, z, p.r, p.h, [0.05, -0.04], t);
    const n = p.claw ? 5 : 3;
    for (let k = 0; k < n; k++) {
      const a = t + k * TAU / n, o = p.r * 1.1, hh = p.h * (p.claw ? 0.75 : 0.45) * (0.7 + 0.3 * hash2(k, z));
      crystal(K, 'ice', x + Math.cos(a) * o, y - 0.1, z + Math.sin(a) * o, p.r * 0.45, hh, [Math.cos(a) * (p.claw ? 0.5 : 0.3), Math.sin(a) * (p.claw ? 0.5 : 0.3)], a);
    }
    glow(K, d, x, y + p.h * 0.45, z, p.claw ? 2 : 1.2, 'frost:flame');
  },
  // The Lip of the Maw's rim: rubble and black glass heaped round its edge, as if pulled toward the Maw and caught,
  // leaning out to it; nothing in a bridge's mouth or on a gust stone.
  accretion(K, d, p, x, y, z) {
    const stones = d.props.filter((q) => q.kind === 'guststone');
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * TAU + hash2(i, 5) * 0.06, r = p.r - 1.4 - hash2(i, 9) * 1.4, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (caveRoom(px, pz) < 0.6 || caveRoom(px, pz) > 3.5) continue;
      if (stones.some((q) => Math.hypot(d.x + q.x - px, d.z + q.z - pz) < 4)) continue;
      // (Not in the bridge's mouth: the way in comes up the Lip's south side.)
      if (Math.cos(a - Math.PI / 2) > 0.985) continue;
      const py = caveFloorY(px, pz), h = 0.5 + hash2(i, 13) * 1.4;
      if (hash2(i, 17) > 0.6) K.spike('obsidian', px, py - 0.2, pz, 0.25 + hash2(i, 19) * 0.25, h * 1.6, 4, a, [Math.cos(a) * 0.5, Math.sin(a) * 0.5]);
      else K.box('void:rubble', px, py - 0.25, pz, 0.35 + hash2(i, 21) * 0.4, h * 0.6, 0.3 + hash2(i, 23) * 0.35, a, NO);
    }
  },
  // Cracks across the Lip's flags, alight with the void's violet, running north to its edge and the Maw past it: n of them
  // from across w metres of its south half, each a jagged line a metre and a half at a time, narrowing, a branch now and then.
  voidcracks(K, d, p, x, y, z) {
    const strip = (ax, az, bx, bz, w) => {
      const L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L * w, nz = (bx - ax) / L * w;
      const ya = caveFloorY(ax, az) + 0.025, yb = caveFloorY(bx, bz) + 0.025;
      K.quad('rune', [ax - nx, ya, az - nz], [bx - nx, yb, bz - nz], [bx + nx, yb, bz + nz], [ax + nx, ya, az + nz], [0, 1, 0]);
    };
    for (let n = 0; n < p.n; n++) {
      let px = x + (hash2(n, 3) - 0.5) * p.w, pz = z + (hash2(n, 4) - 0.5) * 4, a = Math.PI + (hash2(n, 7) - 0.5) * 0.5, w = 0.34;
      const len = p.len * (0.6 + hash2(n, 11) * 0.4);
      for (let s = 0; s < len; s += 1.5) {
        a += (hash2(n * 13 + s, 5) - 0.5) * 0.75;
        const qx = px + Math.sin(a) * 1.5, qz = pz + Math.cos(a) * 1.5;
        if (caveRoom(qx, qz) < 0.4) break;
        strip(px, pz, qx, qz, w);
        if (hash2(n * 7 + s, 9) > 0.8) { const b = a + (hash2(s, n) > 0.5 ? 0.9 : -0.9), ex = px + Math.sin(b) * 2.2, ez = pz + Math.cos(b) * 2.2; if (caveRoom(ex, ez) > 0.6) strip(px, pz, ex, ez, w * 0.55); }
        px = qx; pz = qz; w = Math.max(0.1, w * 0.975);
      }
    }
  },
  // A gust stone: a round flag of old block let into the ground, a ring of runes alight round its rim; an updraft (gust)
  // has three ribbons of pale wind standing up over it.
  guststone(K, d, p, x, y, z) {
    K.drum('void:block', x, y - 0.25, z, p.r, 0.3, 12, { collide: false });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, b = (i + 0.6) / 12 * TAU, r0 = p.r * 0.72, r1 = p.r * 0.9, yy = y + 0.06;
      K.quad('rune', [x + Math.cos(a) * r0, yy, z + Math.sin(a) * r0], [x + Math.cos(a) * r1, yy, z + Math.sin(a) * r1], [x + Math.cos(b) * r1, yy, z + Math.sin(b) * r1], [x + Math.cos(b) * r0, yy, z + Math.sin(b) * r0], [0, 1, 0]);
    }
    if (p.gust) for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + p.n; K.spike('storm', x + Math.cos(a) * 0.5, y + 0.1, z + Math.sin(a) * 0.5, 0.06, 2.6 + k * 0.4, 3, a, [-Math.sin(a) * 0.12, Math.cos(a) * 0.12]); }
    glow(K, d, x, y + 0.4, z, 1.3);
  },
};
export const PROP_KINDS = Object.keys(PROPS);

// ---- all of it -----------------------------------------------------------------------------------------------------------------

// portalWall: src/core/sites.js's, for the two portals inside each (the way back out by the way in, and the way out past
// its last boss), each with its back to the rock at the edge of its room, facing into it.
// (only: just these delves, for tools/dungeon/check.mjs to count each one's triangles.)
export function buildDelves(K, portalWall, only = DELVES) {
  for (const d of only) {
    if (d.style === 'castle') castleShell(K, d); else if (d.style === 'void') voidShell(K, d); else caveShell(K, d);
    fires(K, d);
    for (const p of d.props) {
      const x = d.x + p.x, z = d.z + p.z, make = PROPS[p.kind];
      if (!make) throw new Error(`delve-build: no builder for a prop of kind ${p.kind} (${d.key})`);
      make(K, d, p, x, caveFloorY(x, z), z);
    }
    dress(K, d);
    K.delve = d;
    portalWall(K, d.x + d.exitIn.x, d.z + d.exitIn.z, d.exitIn.yaw ?? Math.PI, `${d.tag}_in`, caveFloorY);
    portalWall(K, d.x + d.exitOut.x, d.z + d.exitOut.z, d.exitOut.yaw ?? 0, `${d.tag}_out`, caveFloorY);
    // (A sewer's: the ladder-head under each of its second mouths, and its gates into the next sector.)
    (d.ways || []).forEach((w, i) => portalWall(K, d.x + w.in.x, d.z + w.in.z, w.in.yaw, `${d.tag}_u${i}`, caveFloorY));
    (d.links || []).forEach((l, i) => {
      portalWall(K, d.x + l.x, d.z + l.z, l.yaw, `${d.tag}_l${i}`, caveFloorY);
      // Two lamps on posts either side of a gate, burning the colour of the sector it goes to (green, blue, violet, amber),
      // in that sector's stone: so a gate says where it leads before it's gone through.
      const to = DELVES.find((q) => q.key === l.to), flame = to?.look.flame || 'flame', post = to?.look.foot || 'block';
      const c = Math.cos(l.yaw), s = Math.sin(l.yaw);
      for (const u of [-5, 5]) {
        const x = d.x + l.x + u * c, z = d.z + l.z - u * s, y = caveFloorY(x, z);
        K.box(post, x, y - 0.2, z, 0.32, 1.9, 0.32, l.yaw, NO);
        K.drum(post, x, y + 1.7, z, 0.5, 0.18, 8, { r2: 0.42, collide: false });
        K.drum(flame, x, y + 1.88, z, 0.34, 0.55, 8, { r2: 0.08, collide: false });
      }
    });
    K.delve = null;
  }
}
