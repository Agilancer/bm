// The Marches' five places (docs/PHOBOS-LAYOUT.md, tools/phobos/layout.json): Velscour's three watch keeps and two towers on
// the roads east, in the weathered grey of the old border, his red on them. Each has a job, and a shape that tells it from the
// others a long way off: Greywarden's beacon, the Lantern's lit head, Gatewatch's toll gate across the road, the Needle's
// height, Marshal's Hold's great yard. Then the way's own: the toll gate at Widow's Notch, the Broken Span's stumps, and the
// Sill's parapet. Built with src/core/sites.js's Kit. No piece makes a cross or a T (the T is Tessariel's).

import { terrainHeight } from './terrain.js';
import { SITES, routeDist } from './lands.js';
import { hash2 } from './terrain-noise.js';
import { SPAN, SILL } from './east.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);
// Each place in a stone of its own, so they're told apart as far off as they're seen: [curtain, towers, dressed, trim, rough, roof].
const STONE = {
  grey: ['pale:course', 'pale:stone', 'pale:course', 'pale:stone', 'pale:rubble', 'roof_2'],       // Greywarden: the old border's pale stone
  frost: ['frost:course', 'frost:course', 'frost:stone', 'frost:stone', 'frost:rubble', 'dark:roof_2'],   // the Lantern: cold blue-grey
  toll: ['block', 'course', 'ashlar', 'stone', 'rubble', 'roof_4'],                                  // Gatewatch: the road's own brown stone
  black: ['dark:block', 'dark:course', 'dark:ashlar', 'dark:stone', 'dark:rubble', 'dark:roof_2'],   // the Needle and Marshal's Hold: his black
};
const B = 'block', C = 'course', A = 'ashlar', G = 'stone', R = 'rubble';

// A curtain round (cx, cz): half sizes hx, hz, tall h, a drum at each corner, its gate in the side facing `gate`
// ('n', 's', 'e', 'w') between two gate towers, with his red over it. Returns where the gate is and which way it looks.
function curtain(K, cx, cz, y0, hx, hz, h, gate, o = {}) {
  const [B, C, A] = o.stone || STONE.toll, roofOf = (o.stone || STONE.toll)[5];
  const side = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
  for (const k of ['n', 's', 'e', 'w']) {
    const [sx, sz] = side[k], opt = { crenel: true, y: y0, gap: k === gate ? 4 : 0 };
    if (sx) K.wall(B, cx + sx * hx, cz - hz, cx + sx * hx, cz + hz, 3, h, opt);
    else K.wall(B, cx - hx, cz + sz * hz, cx + hx, cz + sz * hz, 3, h, opt);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    K.tower(C, cx + sx * hx, cz + sz * hz, o.drum || 6, h + 7, o.roof === undefined ? roofOf : o.roof, { y: y0, sides: 14 });
  }
  const [gx, gz] = side[gate], px = cx + gx * hx, pz = cz + gz * hz, yaw = Math.atan2(gx, gz);
  for (const s of [-1, 1]) {
    const tx = px + gx * 2 + gz * s * 8, tz = pz + gz * 2 + gx * s * 8;
    K.tower(A, tx, tz, 4.6, h + 5, null, { y: y0 });
    K.banner(tx, tz, 6, yaw, 'cloth_red', { y: y0 + h + 5, pole: 'iron', w: 1.4, len: 4.4, collide: false });
  }
  K.hanging('cloth_red', px + gx * 2.2, y0 + h - 1.2, pz + gz * 2.2, [gx, gz], 3.2, 5, 2);
  for (const s of [-1, 1]) K.brazier(px + gx * 9 + gz * s * 5, pz + gz * 9 + gx * s * 5, 1.6);
  return [px + gx * 10, y0, pz + gz * 10, yaw];
}

// A square great tower with a crown of merlons, buttressed at its corners.
function greatTower(K, x, z, y0, half, h, st = STONE.toll) {
  const layer = st[2], G = st[3], R = st[4];
  K.box(R, x, y0 - 1, z, half + 2, 2.4, half + 2, 0);
  K.box(layer, x, y0 + 1.4, z, half, h, half, 0, { top: R });
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5) / 8 * 2 - 1;
    for (const s of [-1, 1]) { K.box(G, x + u * half, y0 + 1.4 + h, z + s * half, 0.9, 1.6, 0.7, 0, { collide: false }); K.box(G, x + s * half, y0 + 1.4 + h, z + u * half, 0.7, 1.6, 0.9, 0, { collide: false }); }
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(G, x + sx * half, y0, z + sz * half, 1.3, h * 0.82, 1.3, 0, { collide: false });
}

// Greywarden Keep: the beacon. A square keep whose great tower carries an iron fire-basket you can see from the old edge.
function greywarden(K) {
  const k = SITES.greywarden, y0 = Y(k.x, k.z);
  K.spots.greywardenGate = curtain(K, k.x, k.z, y0, 44, 36, 13, 's', { stone: STONE.grey });
  greatTower(K, k.x - 10, k.z - 6, y0, 11, 34, STONE.grey);
  // The beacon: a basket on four iron legs over the tower's head, and the fire in it.
  const bx = k.x - 10, bz = k.z - 6, by = y0 + 35.4;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.beam('iron', [bx + sx * 4, by, bz + sz * 4], [bx + sx * 2.2, by + 7, bz + sz * 2.2], 0.22);
  K.drum('iron', bx, by + 7, bz, 2.4, 1.6, 10, { r2: 3.4, open: true, collide: false });
  K.cone('flame', bx, by + 7.6, bz, 3.4, 11, 8);
  // The yard: a stable range against the north wall, the well, stacked beacon wood.
  K.box(R, k.x + 20, y0, k.z - 27, 16, 5, 5, 0); K.box('roof_2', k.x + 20, y0 + 5, k.z - 27, 17, 0.5, 6, 0, { collide: false });
  K.drum(G, k.x + 22, y0 - 0.2, k.z + 12, 1.6, 1.1, 10);
  for (let i = 0; i < 5; i++) K.box('wood', k.x - 30 + i * 2.2, y0, k.z + 22, 1, 1.2 + (i % 2) * 0.5, 2.4, 0.1 * i);
}

// The Lantern: a signal tower. Slender, a gallery two thirds up, and a glazed head full of light.
function lantern(K) {
  const k = SITES.lantern, y0 = Y(k.x, k.z), h = 44, [, C, , G, R] = STONE.frost;
  K.drum(R, k.x, y0 - 1.5, k.z, 9, 3.5, 14);
  K.tower(C, k.x, k.z, 4.6, h, null, { y: y0 + 1.5, sides: 14 });
  K.drum(G, k.x, y0 + 28, k.z, 4.6, 1, 14, { r2: 6.2, open: true, collide: false }); K.drum(G, k.x, y0 + 29, k.z, 6.2, 1.5, 14, { open: true, collide: false });
  // The head: eight iron posts, the light between them, a cap.
  const hy = y0 + h + 2;
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; K.beam('iron', [k.x + Math.cos(a) * 4, hy, k.z + Math.sin(a) * 4], [k.x + Math.cos(a) * 4, hy + 6, k.z + Math.sin(a) * 4], 0.2); }
  K.drum('flame', k.x, hy + 0.4, k.z, 3.1, 5, 8, { collide: false });
  K.cone('dark:roof_2', k.x, hy + 6, k.z, 5.4, 9, 8);
  K.steps(R, k.x, k.z + 9, 0, 2, 8, { rise: 0.19, tread: 0.4, y: y0 });
  K.banner(k.x + 5.5, k.z + 5.5, 7, 0.8, 'cloth_red', { pole: 'iron', w: 1.3, len: 4 });
  for (const [dx, dz] of [[-12, 4], [11, -8]]) K.brazier(k.x + dx, k.z + dz, 1.5);
}

// Gatewatch Keep: the toll. The keep stands back from the road; where the roads meet below it a gate of two towers
// straddles the Throne Road, and the toll chain hangs across between them.
function gatewatch(K) {
  const k = SITES.gatewatch, y0 = Y(k.x, k.z);
  K.spots.gatewatchGate = curtain(K, k.x, k.z, y0, 40, 34, 12, 'e', { roof: null });
  greatTower(K, k.x - 12, k.z, y0, 12, 26);
  K.box(R, k.x + 14, y0, k.z - 22, 12, 6, 6, 0); K.box('roof_2', k.x + 14, y0 + 6, k.z - 22, 13, 0.5, 7, 0, { collide: false });
  // The toll gate on the road (the Throne Road leaves the meeting of the March Road and the Marshal's Road at 6700, 60).
  const gx = 6790, gz = 51, gy = Y(gx, gz);
  for (const s of [-1, 1]) {
    K.tower(A, gx, gz + s * 9.5, 5, 24, 'roof_4', { y: Y(gx, gz + s * 9.5), steep: 2 });
    K.wall(B, gx, gz + s * 15, gx, gz + s * 60, 2.6, 8, { crenel: true });
    K.hanging('cloth_red', gx - 5.1, gy + 19, gz + s * 9.5, [-1, 0], 3, 12, 3);
    K.banner(gx + 5, gz + s * 9.5, 6, Math.PI / 2, 'cloth_red', { pole: 'iron', w: 1.3, len: 4, collide: false, y: gy + 9 });
    K.brazier(gx + 7, gz + s * 6.4, 1.6);
  }
  // (The chain: hung low across the way from tower to tower, on a windlass in the north one. It's lowered, or you pay.)
  for (let i = 0; i < 9; i++) {
    const u0 = i / 9, u1 = (i + 1) / 9, sag = (u) => 1.5 - 1.1 * Math.sin(u * Math.PI);
    K.beam('iron', [gx, gy + sag(u0), gz - 5.3 + u0 * 10.6], [gx, gy + sag(u1), gz - 5.3 + u1 * 10.6], 0.3);
  }
  K.spots.tollChain = [gx, gy, gz, Math.PI / 2];
  // The toll house beside it.
  K.box(R, gx - 9, Y(gx - 9, gz - 16), gz - 16, 4, 4.4, 3.4, 0); K.box('roof_2', gx - 9, Y(gx - 9, gz - 16) + 4.4, gz - 16, 4.8, 0.5, 4.2, 0, { collide: false });
}

// The Needle: a lookout. Taller and thinner than anything else in the Marches, on the ridge's foot, with a crow's nest.
function needle(K) {
  const k = SITES.needle, y0 = Y(k.x, k.z), h = 76, [B, , , G, R] = STONE.black;
  K.drum(R, k.x, y0 - 2, k.z, 7, 4, 12);
  K.tower(B, k.x, k.z, 3.3, h, 'dark:roof_2', { y: y0 + 2, steep: 4.6, sides: 12 });
  for (const [yy, r] of [[24, 4.6], [48, 4.4]]) K.drum(G, k.x, y0 + yy, k.z, 3.3, 0.8, 12, { r2: r, open: true, collide: false });
  K.drum(G, k.x, y0 + h - 4, k.z, 3.3, 1, 12, { r2: 5.6, open: true, collide: false }); K.drum('wood', k.x, y0 + h - 3, k.z, 5.6, 1.4, 12, { open: true, collide: false });
  K.hanging('cloth_red', k.x - 3.4, y0 + 60, k.z, [-1, 0], 2.4, 40, 6);
  K.steps(R, k.x - 8, k.z, -Math.PI / 2, 1.8, 10, { rise: 0.2, tread: 0.4, y: y0 });
  K.brazier(k.x - 12, k.z + 5, 1.5); K.brazier(k.x - 12, k.z - 5, 1.5);
}

// Marshal's Hold: the Old Marshal's. The biggest of them: a wide yard for his host to drill in (and to fight him in), a long
// hall across its back, two great towers of unequal height, and the gate north onto the Marshal's Road.
function marshal(K) {
  const k = SITES.marshal, y0 = Y(k.x, k.z);
  K.spots.marshalGate = curtain(K, k.x, k.z, y0, 56, 46, 20, 'n', { drum: 8, stone: STONE.black });
  const [, , A, G, R] = STONE.black;
  // The hall across the south side.
  K.box(A, k.x, y0, k.z + 30, 34, 24, 9, 0, { top: R });
  for (let i = -3; i <= 3; i++) { K.box(G, k.x + i * 10, y0, k.z + 20.4, 1.1, 23, 0.8, 0, { collide: false }); K.hanging('cloth_red', k.x + i * 10 + 5, y0 + 21, k.z + 20.9, [0, -1], 3, 15, 3); }
  K.box('dark:roof_2', k.x, y0 + 24, k.z + 30, 35.5, 0.6, 10.5, 0, { collide: false });
  K.quad('door_5', [k.x - 3, y0, k.z + 20.95], [k.x + 3, y0, k.z + 20.95], [k.x + 3, y0 + 7, k.z + 20.95], [k.x - 3, y0 + 7, k.z + 20.95], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  greatTower(K, k.x - 40, k.z + 30, y0, 10, 78, STONE.black);
  greatTower(K, k.x + 40, k.z + 30, y0, 9, 52, STONE.black);
  K.cone('dark:roof_2', k.x - 40, y0 + 79.4, k.z + 30, 9, 22, 4, Math.PI / 4);
  K.hanging('cloth_red', k.x - 40, y0 + 70, k.z + 19.9, [0, -1], 5, 44, 6);
  // The yard: a ring of posts with his red on them round the drill ground, braziers at the quarters.
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + 0.26, px = k.x + Math.cos(a) * 26, pz = k.z - 8 + Math.sin(a) * 20;
    if (i % 3 === 0) K.brazier(px, pz, 1.8);
    else K.banner(px, pz, 5, a, 'cloth_red', { pole: 'iron', w: 1.1, len: 3.4, collide: false });
  }
  K.spots.marshalYard = [k.x, y0, k.z - 8, 0];
}

// The way's own: what's left of the toll gate at Widow's Notch (the Toll-Giant keeps it now), the Broken Span's piers either
// side of the cleft with the fallen deck in it, and the Sill's parapet, where the city is first seen.
function way(K) {
  const n = SITES.notch;
  for (const s of [-1, 1]) {
    const z = n.z + s * 10.5, y = Y(n.x, n.z);   // (stood on the pass's own floor, hard against its walls)
    K.tower('dark:course', n.x, z, 5.5, 26 + s * 6, null, { y });
    K.wall('dark:block', n.x, z + s * 5.5, n.x, z + s * 22, 3, 14, { ruin: true });
    K.brazier(n.x + 8, n.z + s * 9, 1.8);
    K.hanging('cloth_red', n.x - 5.6, y + 22, z, [-1, 0], 3, 14, 3);
  }
  // The Span: an abutment 26 m high against each wall with the stump of its arch reaching out, a broken pier in the cleft,
  // and the deck's blocks, three to six metres of them, lying where they fell: the crossing is between them.
  for (const s of [-1, 1]) {
    const px = SPAN.x + s * 30, pz = SPAN.z - s * 12, y = Y(px, pz);
    K.box('dark:ashlar', px, y - 4, pz, 4.5, 30, 6.5, 0.35, { top: 'dark:rubble' });
    for (let i = 0; i < 4; i++) K.box('dark:stone', px - s * (5 + i * 3.4), y + 20 - i * i * 0.9, pz + s * (1.8 + i * 1.2), 2.2, 4.4 - i * 0.5, 5.4, 0.35 + s * i * 0.05, { collide: false });
    K.hanging('cloth_red', px - s * 4.7, y + 22, pz + s * 1.6, [-s, 0.35 * s], 4, 16, 3);
    // (A fire by each, off the way.)
    for (const [dx, dz] of [[-s * 8, 9], [-s * 8, -9], [s * 2, 12], [s * 2, -12]]) { const rd = routeDist(px + dx, pz + dz); if (!rd.road || rd.d > rd.road.w + 3) { K.brazier(px + dx, pz + dz, 1.8); break; } }
  }
  for (const [dx, dz] of [[4, -18], [-4, 18], [10, -24], [-10, 24]]) {
    const x = SPAN.x + dx, z = SPAN.z + dz, rd = routeDist(x, z);
    if (rd.road && rd.d < rd.road.w + 7) continue;
    K.box('dark:ashlar', x, Y(x, z) - 3, z, 3, 12, 4.2, 0.5, { top: 'dark:rubble' }); break;
  }
  for (let i = 0; i < 30; i++) {
    const u = hash2(i, 91) * 2 - 1, v = hash2(i, 47) * 2 - 1, x = SPAN.x + u * 24, z = SPAN.z - u * 9 + v * 10;
    const r = 1.5 + hash2(i, 5) * 1.6, rd = routeDist(x, z);
    if (rd.road && rd.d < rd.road.w + r + 1.5) continue;   // (the way between them is kept: you thread the stones, you don't climb them)
    K.rock(i % 3 ? 'dark:stone' : 'dark:rubble', x, z, r, 1.2 + hash2(i, 9) * 2.2);
  }
  // The Sill: a kerb round the shelf's lip no higher than a knee (nothing between you and the city), a brazier at each end
  // of it, and a brazier at every turn of the causeway down, so its S is seen from above and from the gate.
  for (let i = -5; i <= 5; i++) {
    if (Math.abs(i - 1.2) < 1.1) continue;   // (the causeway goes off a little south of east)
    const a = i * 0.24, a2 = (i + 1) * 0.24, r = SILL.r - 2;
    K.wall('dark:block', SILL.x + Math.cos(a) * r, SILL.z + Math.sin(a) * r, SILL.x + Math.cos(a2) * r, SILL.z + Math.sin(a2) * r, 1, 0.45, { y: SILL.y });
  }
  for (const a of [-1.3, 1.6]) K.brazier(SILL.x + Math.cos(a) * (SILL.r - 3), SILL.z + Math.sin(a) * (SILL.r - 3), 1.8);
  for (const [x, z] of [[9010, 46], [9100, 96], [9190, 40], [9265, -34]]) for (const s of [-1, 1]) K.brazier(x + s * 2, z + s * 13, 2.2);
  K.spots.sill = [SILL.x + 14, SILL.y, SILL.z, Math.PI / 2];
}

export function marches(K) { greywarden(K); lantern(K); gatewatch(K); needle(K); marshal(K); way(K); }
