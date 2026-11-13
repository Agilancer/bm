// What the delves' shells are dressed with, worked out from each one's own field so nothing here is placed by hand
// (src/core/delve-build.js builds the shell, the fires and the props; this comes after them). A castle's doorways get
// frames, its walls piers with a base and a head, its lower rooms beams across from pier to pier. A cave gets fallen rock
// along the foot of its walls, something across its tunnels (the Warrens' shoring, the Vaults' old piers, the Sporehold's
// roots, the Deeps' ice), and its own litter near the walls (look.litter). None of it is solid, and all of it keeps to
// the edges: the floors the fights use are as they were. tools/dungeon/check.mjs counts its triangles with the rest.

import { hash2 } from './terrain-noise.js';
import { caveFloorY, caveRoofY, caveRoom, torches } from './dungeon.js';
import { PROPS, bar, grad, nearProp, outline, rod, roofLump } from './delve-build.js';

const TAU = Math.PI * 2;
const NO = { collide: false };
// Clear of everything a room's own file put in it (by pad metres), and of its portals and way in.
function clear(d, x, z, pad) {
  if (nearProp(d.props, x - d.x, z - d.z, pad)) return false;
  for (const q of [d.entry, d.exitIn, d.exitOut]) if (Math.hypot(d.x + q.x - x, d.z + q.z - z) < 5 + pad) return false;
  return true;
}
const roomOf = (d, lx, lz) => d.rooms.find((r) => (r.hx !== undefined ? Math.abs(lx - r.x) <= r.hx + 0.6 && Math.abs(lz - r.z) <= r.hz + 0.6 : Math.hypot(lx - r.x, lz - r.z) <= r.r + 1));

// ---- a castle ---------------------------------------------------------------------------------------------------------------

function doorways(K, d) {
  const L = d.look;
  for (const t of d.tunnels) {
    if (t.pts.length !== 2 || t.niche) continue;
    const [a, b] = t.pts, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    const ends = t.dead ? [[a, -1]] : [[a, -1], [b, 1]];
    for (const [e, s] of ends) {
      // (Stood a hand out into the room it opens on. Not where the room's own file has a door, a bar or a lintel.)
      const lx = e[0] + ux * s * 0.28, lz = e[1] + uz * s * 0.28, x = d.x + lx, z = d.z + lz;
      if (d.props.some((p) => /lintel|doorslab|portcullis|housedoors|strongdoor|curtain|swag/.test(p.kind) && Math.hypot(p.x - lx, p.z - lz) < 3.5)) continue;
      const room = roomOf(d, e[0] + ux * s * 2, e[1] + uz * s * 2), stone = room?.foot || L.foot || 'dark:stone';
      const y = caveFloorY(x, z), h = Math.min(t.h || 6, caveRoofY(d.x + e[0] - ux * s * 1.5, d.z + e[1] - uz * s * 1.5) - y), w = t.w, yaw = Math.atan2(uz, ux) + Math.PI / 2;
      const P = (u) => [x - uz * u, z + ux * u];
      if (stone === 'wood') {
        // Joinery: two posts, a head across them, a moulding over it, and brackets in the corners.
        for (const u of [-w - 0.18, w + 0.18]) { const [px, pz] = P(u); K.box('wood', px, y - 0.1, pz, 0.2, h + 0.1, 0.3, yaw, NO); }
        K.box('wood', x, y + h - 0.02, z, w + 0.5, 0.42, 0.34, yaw, NO);
        K.box('dark:wood', x, y + h + 0.4, z, w + 0.7, 0.14, 0.42, yaw, NO);
        for (const u of [-1, 1]) { const [ax, az] = P(u * w), [bx, bz] = P(u * (w - 0.9)); bar(K, 'wood', [ax, y + h - 0.95, az], [bx, y + h - 0.05, bz], 0.08); }
        continue;
      }
      if (L.megalith) {
        // A trilithon: two great stones stood on end, leaning in a little, and a third laid across them, overhanging.
        for (const u of [-1, 1]) { const [ax, az] = P(u * (w + 0.5)), [bx, bz] = P(u * (w + 0.36)); bar(K, 'rubble', [ax, y - 0.2, az], [bx, y + h + 0.05, bz], 0.6, 0.46); }
        K.box('pale:rubble', x, y + h, z, w + 1.5, 0.95, 0.62, yaw + 0.03, NO);
        K.box('rubble', x, y + h + 0.95, z, w * 0.6, 0.3, 0.5, yaw - 0.04, NO);
        continue;
      }
      // Masonry: jambs on a plinth, an impost on each, a lintel, and over it a relieving arch of three stones.
      for (const u of [-w - 0.28, w + 0.28]) {
        const [px, pz] = P(u);
        K.box(stone, px, y - 0.1, pz, 0.46, 0.55, 0.42, yaw, NO);
        K.box(stone, px, y + 0.45, pz, 0.36, h - 0.75, 0.34, yaw, NO);
        K.box(stone, px, y + h - 0.3, pz, 0.48, 0.3, 0.44, yaw, NO);
      }
      K.box(stone, x, y + h, z, w + 0.85, 0.62, 0.4, yaw, NO);
      for (const u of [-1, 0, 1]) { const [px, pz] = P(u * w * 0.62); K.box(stone, px, y + h + 0.62, pz, w * (u ? 0.26 : 0.34), u ? 0.36 : 0.62, 0.32, yaw, NO); }
      // (Corbels under the lintel's ends, so the head of the opening is shouldered, not square.)
      for (const u of [-1, 1]) { const [px, pz] = P(u * (w - 0.3)); K.box(stone, px, y + h - 0.5, pz, 0.34, 0.5, 0.3, yaw, NO); }
    }
  }
}

// Piers along a room's walls, between its lights; and in the lower rooms a beam across from each to the one opposite.
function piers(K, d) {
  const L = d.look, every = (L.every || 9);
  for (const r of d.rooms) {
    if (r.hx === undefined || r.piers === 0) continue;
    const stone = r.foot || L.foot || 'dark:stone', wood = stone === 'wood';
    const beams = r.roof <= 16 && !r.tz && r.beams !== 0;
    // (Along the long walls: the beams cross the short way.)
    const along = r.hz >= r.hx, len = along ? r.hz : r.hx, off = along ? r.hx : r.hz, n = Math.max(1, Math.round((len * 2 - 3) / every));
    const stood = [];
    for (let i = 0; i <= n; i++) {
      const tt = -len + 1.5 + (len * 2 - 3) * i / n, pair = [];
      for (const side of [-1, 1]) {
        const lx = r.x + (along ? side * off : tt), lz = r.z + (along ? tt : side * off), nx = along ? -side : 0, nz = along ? 0 : -side;
        const x = d.x + lx, z = d.z + lz;
        // (A wall behind it and floor before it: not across a doorway, nor where the room's own things stand.)
        if (caveRoom(x - nx * 1.2, z - nz * 1.2) > -0.3 || caveRoom(x + nx * 0.8, z + nz * 0.8) < 0.4 || !clear(d, x + nx * 0.4, z + nz * 0.4, 0.5)) { pair.push(null); continue; }
        const y = caveFloorY(x + nx * 0.5, z + nz * 0.5), top = caveRoofY(x + nx * 0.8, z + nz * 0.8), yaw = along ? 0 : Math.PI / 2, o = 0.24;
        const px = x + nx * o, pz = z + nz * o;
        if (wood) {
          K.box('wood', px, y - 0.1, pz, 0.2, top - y + 0.1, 0.2, yaw, NO);
          K.box('dark:wood', px, y - 0.1, pz, 0.27, 1.0, 0.27, yaw, NO);
          bar(K, 'wood', [px + nx * 0.1, top - 1.3, pz + nz * 0.1], [px + nx * 1.1, top - 0.25, pz + nz * 1.1], 0.09);
        } else {
          K.box(stone, px, y - 0.1, pz, 0.3, 0.75, 0.52, yaw, NO);
          K.box(stone, px, y + 0.65, pz, 0.22, top - y - 1.25, 0.4, yaw, NO);
          K.box(stone, px, top - 0.62, pz, 0.36, 0.64, 0.56, yaw, { collide: false, top: false });
        }
        pair.push([px, top, pz]);
      }
      stood.push(pair);
    }
    if (!beams && !L.loculi) continue;
    if (beams) {
    // A beam (a slab of stone, where the look's beam is stone) from each pier to the one opposite, a lighter one between
    // each pair, and two purlins the long way over them.
    const beam = wood ? 'wood' : L.beam || 'wood', top = d.y + r.y + r.roof, deep = beam === 'wood' ? 0.42 : 0.95;
    const cross = (tt, t, hgt) => {
      const mx = d.x + r.x + (along ? 0 : tt), mz = d.z + r.z + (along ? tt : 0);
      if (Math.abs(caveRoofY(mx, mz) - top) > 0.2) return;
      K.box(beam, mx, top - hgt - 0.02, mz, along ? off - 0.1 : t, hgt, along ? t : off - 0.1, 0, NO);
    };
    for (let i = 0; i <= n; i++) {
      const tt = -len + 1.5 + (len * 2 - 3) * i / n;
      if (stood[i][0] || stood[i][1]) { cross(tt, beam === 'wood' ? 0.22 : 0.32, deep); for (const q of stood[i]) if (q) K.box(beam, q[0] + (along ? Math.sign(d.x + r.x - q[0]) * 0.55 : 0), top - deep - 0.5, q[2] + (along ? 0 : Math.sign(d.z + r.z - q[2]) * 0.55), along ? 0.5 : 0.3, 0.5, along ? 0.3 : 0.5, 0, NO); }
      if (i < n) for (const f of [1 / 3, 2 / 3]) cross(tt + (len * 2 - 3) / n * f, 0.13, deep * 0.6);
    }
    if (beam === 'wood') for (const u of [-0.45, 0.45]) K.box(beam, d.x + r.x + (along ? u * off : 0), top - deep - 0.26, d.z + r.z + (along ? 0 : u * off), along ? 0.14 : len - 0.3, 0.26, along ? len - 0.3 : 0.14, 0, NO);
    }
    // (What's in the bays between the piers, by the look: his chains and shackles in the keep; in the Playhouse what a
    // theatre leans on its walls: flats, sandbags, coils of rope.)
    if (L.bays && r.bays !== 0) for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const tt = -len + 1.5 + (len * 2 - 3) * (i + 0.5) / n + (hash2(i, r.x + side) - 0.5) * 2, lx = r.x + (along ? side * off : tt), lz = r.z + (along ? tt : side * off), nx = along ? -side : 0, nz = along ? 0 : -side;
      const x = d.x + lx + nx * 0.2, z = d.z + lz + nz * 0.2, hh = hash2(x * 1.3, z * 0.7), tx = -nz, tz = nx;
      if (hh < 0.3 || caveRoom(x - nx * 1.5, z - nz * 1.5) > -0.3 || caveRoom(x + nx * 0.8, z + nz * 0.8) < 0.4 || !clear(d, x + nx * 0.5, z + nz * 0.5, 1.1)) continue;
      if (torches(d).some((q) => Math.hypot(q[0] - x, q[2] - z) < 1.8)) continue;
      const y = caveFloorY(x + nx * 0.5, z + nz * 0.5);
      if (L.bays === 'chains') {
        // A ring-plate high on the wall, two chains down from it to shackles, one broken short; a third on the floor.
        K.box('iron', x - nx * 0.12, y + 2.5, z - nz * 0.12, along ? 0.04 : 0.5, 0.16, along ? 0.5 : 0.04, 0, NO);
        for (const u of [-0.35, 0.35]) { const len2 = u < 0 ? 1.5 : 0.7 + hh; rod(K, 'iron', x + tx * u, y + 2.55, z + tz * u, x + tx * u * 1.2 + nx * 0.06, y + 2.55 - len2, z + tz * u * 1.2 + nz * 0.06, 0.022); K.drum('iron', x + tx * u * 1.2 + nx * 0.06, y + 2.45 - len2, z + tz * u * 1.2 + nz * 0.06, 0.07, 0.1, 6, { collide: false, open: true }); }
        if (hh > 0.6) { rod(K, 'iron', x + nx * 0.3, y + 0.04, z + nz * 0.3, x + nx * 0.9 + tx * 0.7, y + 0.04, z + nz * 0.9 + tz * 0.7, 0.025); K.drum('pale:stone', x + nx * 0.5 + tx * 0.2, y, z + nz * 0.5 + tz * 0.2, 0.11, 0.13, 6, { r2: 0.14, collide: false, lid: 'pale:stone' }); }
      } else if (hh < 0.55) {
        // A flat leant against the wall: canvas on a frame, its brace behind it.
        const w = 0.9 + hh, H = 2.6 + hh * 2, a0 = [x + tx * -w + nx * 0.75, y, z + tz * -w + nz * 0.75], a1 = [x + tx * w + nx * 0.75, y, z + tz * w + nz * 0.75], b1 = [x + tx * w + nx * 0.1, y + H, z + tz * w + nz * 0.1], b0 = [x - tx * w + nx * 0.1, y + H, z - tz * w + nz * 0.1];
        K.quad(hh < 0.42 ? 'spore:cloth_oat' : 'dark:cloth_oat', a0, a1, b1, b0); K.quad('wood', a1, a0, b0, b1);
        bar(K, 'wood', a0, b0, 0.04); bar(K, 'wood', a1, b1, 0.04); bar(K, 'wood', b0, b1, 0.04);
      } else {
        // Sandbags, a coil of rope, a cleat on the wall with a line made off to it.
        for (let k = 0; k < 3; k++) K.drum('cloth_oat', x + nx * 0.5 + tx * (k - 1) * 0.5, y, z + nz * 0.5 + tz * (k - 1) * 0.5, 0.2, 0.3 + 0.08 * k, 6, { r2: 0.13, collide: false, lid: 'cloth_oat', turn: k });
        K.drum('cloth_oat', x + nx * 0.6 + tx * 1.1, y, z + nz * 0.6 + tz * 1.1, 0.34, 0.14, 8, { r2: 0.3, collide: false, open: true }); K.drum('cloth_oat', x + nx * 0.6 + tx * 1.1, y, z + nz * 0.6 + tz * 1.1, 0.2, 0.14, 8, { collide: false, open: true });
        K.box('wood', x - nx * 0.1, y + 1.5, z - nz * 0.1, along ? 0.06 : 0.25, 0.08, along ? 0.25 : 0.06, 0, NO); rod(K, 'cloth_oat', x, y + 1.54, z, x + nx * 0.1, caveRoofY(x + nx * 0.5, z + nz * 0.5), z + nz * 0.1, 0.015);
      }
    }
    // (The Kingsbarrow's dead on shelves between the piers: a slab on two stubs, bones bundled on it, a skull or two.)
    if (L.loculi && r.loculi !== 0) for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const tt = -len + 1.5 + (len * 2 - 3) * (i + 0.5) / n, lx = r.x + (along ? side * off : tt), lz = r.z + (along ? tt : side * off), nx = along ? -side : 0, nz = along ? 0 : -side;
      const x = d.x + lx + nx * 0.36, z = d.z + lz + nz * 0.36, hh = hash2(x, z);
      if (hh < 0.15 || caveRoom(x - nx * 1.5, z - nz * 1.5) > -0.3 || caveRoom(x + nx * 0.6, z + nz * 0.6) < 0.4 || !clear(d, x, z, 0.9)) continue;
      if (torches(d).some((q) => Math.hypot(q[0] - x, q[2] - z) < 1.6)) continue;
      const y = caveFloorY(x + nx * 0.4, z + nz * 0.4), yaw = along ? 0 : Math.PI / 2, tx = -nz, tz = nx;
      for (const lv of hh > 0.7 ? [0.75, 1.75] : [1.0]) {
        K.box('pale:rubble', x, y + lv, z, 0.36, 0.12, 1.15, yaw, NO);
        for (const u of [-0.9, 0.9]) K.box('rubble', x + tx * u, y + lv - 0.3, z + tz * u, 0.3, 0.3, 0.14, yaw, NO);
        for (let k = 0; k < 5; k++) { const u = -0.8 + k * 0.3, w = 0.06 * (k % 2 ? 1 : -1); rod(K, 'pale:stone', x + tx * u + nx * w, y + lv + 0.16 + 0.03 * (k % 3), z + tz * u + nz * w, x + tx * (u + 0.75) - nx * w, y + lv + 0.16, z + tz * (u + 0.75) - nz * w, 0.03); }
        K.drum('pale:stone', x + tx * 0.75 * (hh > 0.5 ? 1 : -1), y + lv + 0.12, z + tz * 0.75 * (hh > 0.5 ? 1 : -1), 0.11, 0.13, 6, { r2: 0.14, collide: false, lid: 'pale:stone' });
      }
    }
  }
}

// ---- a cave -----------------------------------------------------------------------------------------------------------------

// Fallen rock along the foot of the walls: small stuff everywhere, a boulder now and then.
function scree(K, d) {
  const L = d.look;
  const lit = torches(d);
  outline(d, (ax, az, bx, bz) => {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, h = hash2(mx * 1.7, mz * 2.3);
    // A rib of rock standing out of the wall from floor to roof, every so far: leaning, thick at its foot, boulders by it.
    const hr = hash2(mx * 0.91, mz * 1.13);
    if (hr < 0.085 && !lit.some((q) => Math.hypot(q[0] - mx, q[2] - mz) < 2.2) && clear(d, mx, mz, 1.5)) {
      const g = grad(mx, mz), room = roomOf(d, mx - d.x, mz - d.z), rock = room?.rock || L.wall, R = 0.7 + hr * 6, x = mx - g[0] * 0.25, z = mz - g[1] * 0.25;
      const y = caveFloorY(mx, mz) - 0.4, top = caveRoofY(mx + g[0], mz + g[1]) + 0.8, lean = (hash2(mz, mx) - 0.5) * 1.2, mid = y + (top - y) * 0.45;
      // (Three lengths of it, each stepped a little off the last, thick at the foot and where it joins the roof.)
      const H = top + roofLump(mx, mz) - y, sx = -g[1] * lean * 0.12, sz = g[0] * lean * 0.12;
      K.drum(rock, x + g[0] * 0.2, y, z + g[1] * 0.2, R * 1.5, H * 0.16, 6, { r2: R * 0.95, open: true, collide: false, turn: mx });
      K.drum(rock, x, y + H * 0.14, z, R * 0.95, H * 0.34, 6, { r2: R * 0.62, open: true, collide: false, turn: mx + 0.5 });
      K.drum(rock, x + sx, y + H * 0.44, z + sz, R * 0.7, H * 0.34, 6, { r2: R * 0.74, open: true, collide: false, turn: mz });
      K.drum(L.roof, x + sx * 2 - g[0] * 0.3, y + H * 0.74, z + sz * 2 - g[1] * 0.3, R * 0.78, H * 0.28, 6, { r2: R * 1.25, open: true, collide: false, turn: mx + 1 });
    }
    // (In the cold: water frozen as it ran down the wall, every so far: a fall of ice from the wall's head to the floor.)
    if (L.litter === 'snow' && hr > 0.1 && hr < 0.14 && clear(d, mx, mz, 1.5)) {
      const g = grad(mx, mz), y = caveFloorY(mx, mz) - 0.2, top = caveRoofY(mx + g[0] * 0.5, mz + g[1] * 0.5) + 0.5, H = top - y;
      // (Ribbons of it side by side down the wall, long and thin, each ending at its own height over a mound of it.)
      for (let k = 0; k < 6; k++) { const u = (k - 2.5) * 0.42, px = mx - g[1] * u + g[0] * 0.15, pz = mz + g[0] * u + g[1] * 0.15, len = H * (0.72 + 0.28 * hash2(k, mx)); K.spike('ice', px, top, pz, 0.3, -len, 4, k, [g[0] * 0.12, g[1] * 0.12]); }
      K.drum('white', mx + g[0] * 0.3, y, mz + g[1] * 0.3, 1.7, 0.3, 8, { r2: 0.8, collide: false, turn: mz, lid: 'ice' });
    }
    // (In the cold: icicles along the head of the wall.)
    if (L.litter === 'snow' && h > 0.5) {
      const g = grad(mx, mz);
      for (let k = 0; k < 2; k++) { const o = 0.5 + k * 0.5, x = mx + g[0] * o + g[1] * (k - 0.5) * 0.6, z = mz + g[1] * o - g[0] * (k - 0.5) * 0.6, len2 = 0.3 + hash2(mx + k, mz) * 0.9; K.spike('ice', x, caveRoofY(x, z) + 0.4, z, 0.07 + len2 * 0.05, -len2 - 0.4, 4, k); }
    }
    if (h > 0.42) return;
    const g = grad(mx, mz), room = roomOf(d, mx - d.x, mz - d.z);
    const rock = h < 0.14 ? room?.rock || L.wall : L.stone || 'dark:rubble';
    const out = 0.25 + hash2(mx, mz * 3.1) * 0.9, x = mx + g[0] * out, z = mz + g[1] * out;
    if (caveRoom(x, z) < 0.1 || !clear(d, x, z, 0.4)) return;
    const y = caveFloorY(x, z), s = 0.16 + hash2(mz, mx) * 0.3;
    if (h < 0.045) {
      // A boulder: a lump with a smaller one fallen against it.
      const R = 0.55 + hash2(mx * 3, mz) * 0.5;
      K.drum(rock, x, y - 0.25, z, R, R * 0.75, 6, { r2: R * 0.62, collide: false, turn: mx, lid: rock });
      K.drum(rock, x + g[0] * R * 0.9, y - 0.2, z + g[1] * R * 0.9, R * 0.5, R * 0.45, 5, { r2: R * 0.3, collide: false, turn: mz, lid: rock });
      return;
    }
    if (h < 0.2) K.drum(rock, x, y - 0.1, z, s * 1.2, s * 0.9, 5, { r2: s * 0.7, collide: false, turn: mx * 2, lid: rock });
    else K.spike(rock, x, y - 0.08, z, s, s * 0.9, 4, mx);
    if (h > 0.3) K.spike(rock, x + g[1] * s * 2, y - 0.06, z - g[0] * s * 2, s * 0.6, s * 0.5, 4, mz);
  });
}

// Something across the tunnels, every so far: by the delve's look.span.
function spans(K, d) {
  const L = d.look, kind = L.span;
  if (!kind) return;
  for (const t of d.tunnels) {
    if (t.dead || t.niche || t.w < 2.4) continue;
    for (let q = 1; q < t.pts.length; q++) {
      const a = t.pts[q - 1], b = t.pts[q], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
      for (let s = 6; s < len - 1.5; s += 6) {
        const cx = d.x + a[0] + ux * s, cz = d.z + a[1] + uz * s;
        if (caveRoom(cx, cz) < 1 || !clear(d, cx, cz, 1.2)) continue;
        // (Out to the rock either side.)
        const side = [-1, 1].map((sg) => { let o = 0.5; while (o < 7 && caveRoom(cx - uz * sg * o, cz + ux * sg * o) > 0.3) o += 0.15; return [cx - uz * sg * o, cz + ux * sg * o, o]; });
        if (side[0][2] > 6 || side[1][2] > 6) continue;
        const [l, r] = side, yl = caveFloorY(l[0], l[1]), yr = caveFloorY(r[0], r[1]), roof = caveRoofY(cx, cz), y = caveFloorY(cx, cz);
        const hh = hash2(cx, cz);
        if (kind === 'timber') {
          // The kobolds' shoring: two props leaning in, a cap across, a wedge under each end, and one in three sagging.
          const H = Math.min(roof - y - 0.35, 3.6), sag = hh < 0.33 ? 0.35 : 0;
          const lt = [l[0] + (cx - l[0]) * 0.12, y + H, l[1] + (cz - l[1]) * 0.12], rt = [r[0] + (cx - r[0]) * 0.12, y + H - sag, r[1] + (cz - r[1]) * 0.12];
          bar(K, 'wood', [l[0], yl - 0.2, l[1]], lt, 0.14, 0.12); bar(K, 'wood', [r[0], yr - 0.2, r[1]], rt, 0.14, 0.12);
          bar(K, 'wood', [lt[0] - (cx - l[0]) * 0.1, lt[1] + 0.1, lt[2] - (cz - l[1]) * 0.1], [rt[0] - (cx - r[0]) * 0.1, rt[1] + 0.1, rt[2] - (cz - r[1]) * 0.1], 0.15);
          for (const [p, tp, c] of [[l, lt, 1], [r, rt, -1]]) bar(K, 'wood', [tp[0] + (cx - p[0]) * 0.22, tp[1] - 0.02, tp[2] + (cz - p[1]) * 0.22], [p[0] + (cx - p[0]) * 0.1, tp[1] - 0.8, p[1] + (cz - p[1]) * 0.1], 0.07);
        } else if (kind === 'pier') {
          // What the builders left: a pier of dressed stone either side, one of them broken off, its head lying by it.
          for (const [p, k] of [[l, 0], [r, 1]]) {
            const px = p[0] + (cx - p[0]) * 0.1, pz = p[1] + (cz - p[1]) * 0.1, py = caveFloorY(px, pz), whole = (hh > 0.5) === !!k, H = whole ? Math.min(roof - py - 0.2, 4.2) : 1 + hh * 1.6;
            K.box('pale:stone', px, py - 0.2, pz, 0.5, 0.55, 0.5, hh * 3, NO);
            K.box('mire:stone', px, py + 0.35, pz, 0.38, H - 0.35, 0.38, hh * 3, NO);
            if (whole) K.box('pale:stone', px, py + H - 0.35, pz, 0.52, 0.4, 0.52, hh * 3, NO);
            else K.box('mire:stone', px + (cx - p[0]) * 0.25 + ux * 0.9, py - 0.15, pz + (cz - p[1]) * 0.25 + uz * 0.9, 0.38, 0.5, 0.7, hh * 9, NO);
          }
        } else if (kind === 'root') {
          // Roots come down the walls and across under the roof, a few hanging loose.
          const top = roof - 0.15;
          bar(K, 'bark', [l[0], yl - 0.2, l[1]], [l[0] + (cx - l[0]) * 0.2, top - 0.5, l[1] + (cz - l[1]) * 0.2], 0.13, 0.09);
          bar(K, 'bark', [l[0] + (cx - l[0]) * 0.2, top - 0.5, l[1] + (cz - l[1]) * 0.2], [cx + ux * 0.6, top, cz + uz * 0.6], 0.09, 0.07);
          bar(K, 'bark', [cx + ux * 0.6, top, cz + uz * 0.6], [r[0], top - 1.2 - hh, r[1]], 0.07, 0.1);
          for (let k = 0; k < 4; k++) { const f = 0.2 + 0.2 * k, hx = l[0] + (r[0] - l[0]) * f + ux * (hash2(k, cx) - 0.5), hz = l[1] + (r[1] - l[1]) * f + uz * (hash2(k, cz) - 0.5); rod(K, 'bark', hx, top + 0.2, hz, hx + (hash2(cx, k) - 0.5) * 0.3, top - 0.6 - hash2(cz, k) * 1.2, hz, 0.02); }
        } else if (kind === 'ice') {
          // A fringe of icicles where the roof comes down, and rime banked against the walls under it.
          for (let k = 0; k < 7; k++) { const f = (k + 0.5) / 7, hx = l[0] + (r[0] - l[0]) * f + ux * (hash2(k, cx) - 0.5) * 0.8, hz = l[1] + (r[1] - l[1]) * f + uz * (hash2(k, cz) - 0.5) * 0.8, len2 = 0.5 + hash2(cx + k, cz) * 1.3 * (Math.abs(f - 0.5) + 0.4); K.spike('ice', hx, caveRoofY(hx, hz) + 0.3, hz, 0.1 + len2 * 0.07, -len2 - 0.3, 4, k); }
          for (const p of [l, r]) { const px = p[0] + (cx - p[0]) * 0.18, pz = p[1] + (cz - p[1]) * 0.18; PROPS.drift(K, d, { r: 0.8 + hh * 0.6 }, px, caveFloorY(px, pz), pz); }
        }
      }
    }
  }
}

// A delve's own litter near its walls: look.litter says what.
function litter(K, d) {
  const L = d.look, kind = L.litter;
  if (!kind) return;
  const { box } = d, step = 4.5;
  for (let gz = box.z0; gz < box.z1; gz += step) for (let gx = box.x0; gx < box.x1; gx += step) {
    const x = gx + hash2(gx, gz) * step, z = gz + hash2(gz, gx) * step, dd = caveRoom(x, z);
    if (dd < 0.9 || dd > 2.6) continue;
    const h = hash2(gx * 0.37, gz * 0.73);
    if (h > 0.55 || !clear(d, x, z, 1.4)) continue;
    const y = caveFloorY(x, z), g = grad(x, z), yaw = Math.atan2(g[0], g[1]);
    if (kind === 'bones') {
      // What the Warrens leave lying: gnawed bones, a skull, a pot, a broken crate, a stake with a rag on it.
      if (h < 0.2) { for (let k = 0; k < 4; k++) { const a = k * 1.9 + x, o = 0.2 + 0.25 * k; rod(K, 'pale:stone', x + Math.cos(a) * o, y + 0.04, z + Math.sin(a) * o, x + Math.cos(a + 1) * (o + 0.5), y + 0.06, z + Math.sin(a + 1) * (o + 0.5), 0.035); } K.drum('pale:stone', x, y, z, 0.12, 0.13, 5, { r2: 0.15, collide: false, lid: 'pale:stone' }); }
      else if (h < 0.34) { K.drum('cloth_oat', x, y, z, 0.16, 0.22, 7, { r2: 0.3, collide: false, open: true }); K.drum('cloth_oat', x, y + 0.22, z, 0.3, 0.26, 7, { r2: 0.18, collide: false, lid: 'dark:rubble' }); K.drum('cloth_oat', x + 0.5, y, z + 0.2, 0.14, 0.3, 6, { r2: 0.2, collide: false, lid: 'dark:rubble' }); }
      else if (h < 0.45) { K.box('wood', x, y, z, 0.38, 0.5, 0.32, h * 20, NO); K.box('wood', x + 0.6, y, z + 0.3, 0.3, 0.06, 0.4, h * 9, NO); }
      else { bar(K, 'wood', [x, y - 0.1, z], [x + 0.15, y + 1.9, z + 0.1], 0.045); K.quad('cloth_red', [x + 0.15, y + 1.85, z + 0.1], [x + 0.6, y + 1.7, z + 0.2], [x + 0.55, y + 1.2, z + 0.25], [x + 0.13, y + 1.35, z + 0.1]); K.drum('pale:stone', x + 0.15, y + 1.9, z + 0.1, 0.1, 0.14, 5, { r2: 0.13, collide: false, lid: 'pale:stone' }); }
    } else if (kind === 'snow') {
      // Blown snow banked against the rock, a slick of ice, a rib of something frozen in.
      if (h < 0.3) PROPS.drift(K, d, { r: 0.9 + h * 3 }, x - g[0] * 0.5, y, z - g[1] * 0.5);
      else if (h < 0.42) K.disc('ice', x, y + 0.05, z, 0.9 + h, 9);
      else { for (let k = 0; k < 3; k++) { const a = k * 2.1 + x; K.spike('ice', x + Math.cos(a) * 0.3, y - 0.1, z + Math.sin(a) * 0.3, 0.16, 0.5 + 0.5 * hash2(k, x), 4, a, [Math.cos(a) * 0.3, Math.sin(a) * 0.3]); } }
    } else if (kind === 'mire') {
      // Standing water, reeds at its edge, a block of the old work fallen in.
      if (h < 0.26) { K.disc('lake', x, y + 0.04, z, 1 + h * 4, 10); PROPS.reeds(K, d, { r: 0.5 }, x - g[0] * 0.9, y, z - g[1] * 0.9); }
      else if (h < 0.4) PROPS.reeds(K, d, { r: 0.7 }, x, y, z);
      else if (h < 0.47) {
        // A column of the old hall, broken off: its base, two drums standing, one fallen beside it.
        K.box('pale:stone', x, y - 0.2, z, 0.55, 0.45, 0.55, h * 9, NO);
        K.drum('pale:stone', x, y + 0.25, z, 0.4, 0.8 + h, 9, { r2: 0.38, collide: false, lid: 'mire:stone' });
        bar(K, 'pale:stone', [x + 1.1, y + 0.3, z + 0.5], [x + 2.1, y + 0.22, z + 1.3], 0.36);
      } else {
        // A mooring post, a ring in it, the rope gone green.
        bar(K, 'wood', [x, y - 0.3, z], [x + 0.12, y + 1.3, z + 0.05], 0.11, 0.09); K.drum('iron', x + 0.1, y + 1.0, z + 0.04, 0.16, 0.05, 7, { collide: false, open: true });
        rod(K, 'mire:cloth_oat', x + 0.1, y + 1.0, z + 0.04, x + 0.9, y + 0.03, z + 0.5, 0.02);
      }
    } else if (kind === 'spore') {
      // Caps come up at the foot of the walls, brackets on them, threads hanging.
      if (h < 0.3) PROPS.caps(K, d, { n: 2 + Math.round(h * 10), s: 0.25 + h }, x, y, z);
      else if (h < 0.42) { const wx = x - g[0] * (dd + 0.1), wz = z - g[1] * (dd + 0.1); for (let k = 0; k < 3; k++) K.drum('fruit', wx + g[1] * (k - 1) * 0.5, y + 0.7 + k * 0.5, wz - g[0] * (k - 1) * 0.5, 0.5 - k * 0.08, 0.1, 6, { r2: 0.34, collide: false, turn: k }); }
      else { const top = caveRoofY(x, z); for (let k = 0; k < 5; k++) { const a = k * 1.3 + z, hx = x + Math.cos(a) * 0.5, hz = z + Math.sin(a) * 0.5; rod(K, 'spore:cloth_oat', hx, top + 0.3, hz, hx + 0.1, top - 0.8 - hash2(k, x) * 1.6, hz, 0.015); } }
    }
    void yaw;
  }
}

// What lies flat on the open floor, where the fights are: nothing that stands. By the look's litter.
function underfoot(K, d) {
  const L = d.look, kind = L.litter;
  if (!kind) return;
  const { box } = d, step = 7;
  for (let gz = box.z0; gz < box.z1; gz += step) for (let gx = box.x0; gx < box.x1; gx += step) {
    const x = gx + hash2(gx * 1.3, gz) * step, z = gz + hash2(gz * 1.3, gx) * step, dd = caveRoom(x, z);
    if (dd < 3) continue;
    const h = hash2(gx * 0.53, gz * 0.29);
    if (h > 0.6 || !clear(d, x, z, 1.2)) continue;
    const y = caveFloorY(x, z), a = h * 40;
    const flat = (layer, r, n, up = 0.03) => { for (let k = 0; k < n; k++) { const b = k * TAU / n, c = (k + 1) * TAU / n, rr = (q) => r * (0.75 + 0.5 * hash2(x + q, z)); const P = (ang, q) => { const px = x + Math.cos(ang) * rr(q), pz = z + Math.sin(ang) * rr(q); return [px, caveFloorY(px, pz) + up, pz]; }; K.tri(layer, [x, y + up, z], P(c, (k + 1) % n), P(b, k)); } };
    if (kind === 'bones') {
      // Planks thrown down over the wet, a scatter of gnawed bone, a dropped pick.
      if (h < 0.25) for (let k = 0; k < 3; k++) K.box('wood', x + Math.sin(a) * k * 0.5, y - 0.02, z + Math.cos(a) * k * 0.5, 0.16, 0.06, 1.1 + 0.3 * hash2(k, x), a + (hash2(k, z) - 0.5) * 0.3, NO);
      else if (h < 0.45) for (let k = 0; k < 6; k++) { const b = k * 1.1 + a, o = 0.3 + 0.35 * k * hash2(k, x); rod(K, 'pale:stone', x + Math.cos(b) * o, y + 0.04, z + Math.sin(b) * o, x + Math.cos(b + 0.9) * (o + 0.45), y + 0.05, z + Math.sin(b + 0.9) * (o + 0.45), 0.03); }
      else {
        // A length of the diggers' cart-way: two rails on their sleepers.
        const c = Math.cos(a), sn = Math.sin(a), Y = (px, pz) => caveFloorY(px, pz);
        for (let k = -3; k <= 3; k++) { const px = x + sn * k * 0.7, pz = z + c * k * 0.7; K.box('wood', px, Y(px, pz) - 0.03, pz, 0.62, 0.07, 0.09, a, NO); }
        for (const u of [-0.42, 0.42]) { const ax = x + c * u - sn * 2.4, az = z - sn * u - c * 2.4, bx = x + c * u + sn * 2.4, bz = z - sn * u + c * 2.4; bar(K, 'iron', [ax, Y(ax, az) + 0.07, az], [bx, Y(bx, bz) + 0.07, bz], 0.03); }
      }
    } else if (kind === 'snow') {
      if (h < 0.35) flat('ice', 1.5 + h * 3, 9, 0.04); else flat('white', 1.2 + h * 2, 8, 0.05);
    } else if (kind === 'mire') {
      if (h < 0.3) { flat('lake', 1.4 + h * 4, 9, 0.035); for (let k = 0; k < 4; k++) K.drum('mire:cloth_oat', x + Math.cos(a + k * 1.7) * (0.4 + 0.3 * k), y + 0.045, z + Math.sin(a + k * 1.7) * (0.4 + 0.3 * k), 0.22 + 0.06 * k, 0.012, 7, { collide: false, turn: k }); }
      else if (h < 0.45) for (let k = 0; k < 3; k++) K.box('pale:stone', x + Math.cos(a + k * 2) * 0.9, y - 0.14, z + Math.sin(a + k * 2) * 0.9, 0.45, 0.18, 0.3, a + k, NO);
      // (Steps of the old work going down into the floor's wet: three, each lower.)
      else for (let k = 0; k < 3; k++) K.box('pale:stone', x + Math.sin(a) * k * 0.55, y - 0.3, z + Math.cos(a) * k * 0.55, 1.1 - k * 0.1, 0.42 - k * 0.11, 0.28, a, NO);
    } else if (kind === 'spore') {
      // A ring of small caps, or a mat of pale thread.
      if (h < 0.35) for (let k = 0; k < 9; k++) { const b = k * TAU / 9, px = x + Math.cos(b) * 1.1, pz = z + Math.sin(b) * 1.1, py = caveFloorY(px, pz), hh = 0.1 + 0.1 * hash2(k, x); K.drum('cloth_oat', px, py - 0.03, pz, 0.025, hh, 4, NO); K.cone('fruit', px, py + hh - 0.02, pz, 0.1, 0.07, 6, b); }
      else PROPS.caps(K, d, { n: 2, s: 0.12 }, x, y, z);
    }
  }
}

export function dress(K, d) {
  if (d.style === 'castle') { doorways(K, d); piers(K, d); return; }
  scree(K, d); spans(K, d); litter(K, d); underfoot(K, d);
}
