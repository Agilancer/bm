
// Blackvigil Keep's outside. The curtain with a drum tower at each corner under its cone and plain ones along the walls;
// the gatehouse's two towers with a machicolated gallery between them over the gate, the portcullis down; arrow slits; the
// great keep within, buttressed, turrets on its corners, the tall tower behind with his lit windows at its head. Out along
// the approach: a spiked ditch-line between two black revetments with the bridge over it, the barbican beyond, gibbets and
// braziers up to it. (The ground straight before the gate, between it and the ditch, is left bare: the way down into the
// keep's dungeon stands there. The land can't be dug from here, so the ditch is a walled bed of stakes, not a hollow.)
function keep(K) {
  const k = at('keep'), y0 = Y(k.x, k.z), HX = 70, HZ = 58, wallH = 16;
  const G = 'dark:stone', R = 'dark:rubble';
  K.wall(G, k.x - HX, k.z - HZ, k.x + HX, k.z - HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x - HX, k.z + HZ, k.x + HX, k.z + HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x - HX, k.z - HZ, k.x - HX, k.z + HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x + HX, k.z - HZ, k.x + HX, k.z + HZ, 3, wallH, { crenel: true, y: y0, gap: 4 });
  // A slit in a round tower's wall, looking out at ang; and one in a flat wall at (x, z) facing [nx, nz].
  const slit = (cx, cz, r, ang, yy, hh = 2.2, layer = 'obsidian') => { const c = Math.cos(ang), s = Math.sin(ang), px = cx + c * (r + 0.04), pz = cz + s * (r + 0.04); K.quad(layer, [px + s * 0.16, yy, pz - c * 0.16], [px - s * 0.16, yy, pz + c * 0.16], [px - s * 0.16, yy + hh, pz + c * 0.16], [px + s * 0.16, yy + hh, pz - c * 0.16], [c, 0, s]); };
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = k.x + sx * HX, cz = k.z + sz * HZ;
    K.tower(G, cx, cz, 7, wallH + 8, 'dark:roof_2', { y: y0, sides: 16 });
    // (The gallery round its head, on corbels, to drop things from.)
    K.drum(G, cx, y0 + wallH + 3.6, cz, 7, 1.0, 16, { r2: 8.1, open: true, collide: false }); K.drum(G, cx, y0 + wallH + 4.6, cz, 8.1, 2.4, 16, { open: true, collide: false });
    for (let i = 0; i < 5; i++) { const a = Math.atan2(sz, sx) - 1.2 + i * 0.6; slit(cx, cz, 7, a, y0 + 6 + (i % 2) * 5); slit(cx, cz, 8.1, a + 0.3, y0 + wallH + 5); }
  }
  for (const [dx, dz] of [[-24, -HZ], [24, -HZ], [-24, HZ], [24, HZ], [-HX, 0], [HX, -33], [HX, 33]]) {
    K.tower(G, k.x + dx, k.z + dz, 5, wallH + 4, null, { y: y0 });
    const out = Math.atan2(Math.abs(dz) === HZ ? dz : 0, Math.abs(dx) === HX ? dx : 0);
    for (const da of [-0.7, 0, 0.7]) slit(k.x + dx, k.z + dz, 5, out + da, y0 + 7 + Math.abs(da) * 5);
  }
  // The gatehouse: two towers flanking the gate, a passage roofed over, the gallery across between them, the portcullis.
  for (const sz of [-1, 1]) { K.tower(G, k.x + HX + 2, k.z + sz * 9, 5.5, wallH + 6, null, { y: y0 }); for (const da of [-0.5, 0.25]) slit(k.x + HX + 2, k.z + sz * 9, 5.5, da * sz, y0 + 8 + (da > 0 ? 6 : 0), 2.4); }
  K.box(G, k.x + HX, y0 + 7.5, k.z, 3, wallH - 7.5, 4.5, 0, { collide: false });
  K.box(G, k.x + HX + 3.3, y0 + wallH - 1.6, k.z, 1.2, 3.4, 4.4, 0, { collide: false });
  for (let i = -3; i <= 3; i++) { if (i % 2) K.box(G, k.x + HX + 4.3, y0 + wallH + 1.8, k.z + i * 1.25, 0.2, 1.1, 0.5, 0, { collide: false }); K.box(G, k.x + HX + 3.5, y0 + wallH - 2.5, k.z + i * 1.3, 0.9, 0.9, 0.22, 0, { collide: false }); }
  K.quad('door_5', [k.x + HX + 1.6, y0, k.z + 3.6], [k.x + HX + 1.6, y0, k.z - 3.6], [k.x + HX + 1.6, y0 + 7.5, k.z - 3.6], [k.x + HX + 1.6, y0 + 7.5, k.z + 3.6], [1, 0, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  for (let i = -3; i <= 3; i++) K.beam('iron', [k.x + HX + 1.85, y0, k.z + i * 1.05], [k.x + HX + 1.85, y0 + 7.5, k.z + i * 1.05], 0.13);
  for (const v of [1.6, 3.6, 5.6]) K.beam('iron', [k.x + HX + 1.85, y0 + v, k.z - 3.6], [k.x + HX + 1.85, y0 + v, k.z + 3.6], 0.11);
  K.collide(k.x + HX, k.z, 1.5, 4.2, 0, y0 + 7.5);   // (the gate's shut: he doesn't open it to you yet)
  // The road side of the curtain: a gallery on corbels either side of the gatehouse, slits under it.
  for (const s of [-1, 1]) {
    K.box(G, k.x + HX + 1.95, y0 + wallH - 1.2, k.z + s * 33, 0.5, 1.2, 18, 0, { collide: false });
    for (let i = 0; i < 12; i++) { const z = k.z + s * (16.5 + i * 3); K.box(G, k.x + HX + 1.85, y0 + wallH - 2.0, z, 0.4, 0.8, 0.25, 0, { collide: false }); if (i % 3 === 1) K.quad('obsidian', [k.x + HX + 1.54, y0 + 7, z + 1.66], [k.x + HX + 1.54, y0 + 7, z + 1.34], [k.x + HX + 1.54, y0 + 9.4, z + 1.34], [k.x + HX + 1.54, y0 + 9.4, z + 1.66], [1, 0, 0]); }
  }
  // The keep: a great block on a plinth, buttressed up its faces, a crown of merlons, a turret on three corners and at the
  // fourth the tower taller than everything, his red down its face and his fires in its head.
  const bx = k.x - 12;
  K.box(R, bx, y0 - 1, k.z, 30, 3, 26, 0);
  K.box(G, bx, y0 + 2, k.z, 26, 44, 22, 0, { top: R });
  for (let i = 0; i < 16; i++) {
    const u = (i + 0.5) / 16 * 2 - 1;
    K.box(G, bx + u * 26, y0 + 46, k.z - 22, 1, 1.8, 0.8, 0, { collide: false });
    K.box(G, bx + u * 26, y0 + 46, k.z + 22, 1, 1.8, 0.8, 0, { collide: false });
    K.box(G, bx - 26, y0 + 46, k.z + u * 22, 0.8, 1.8, 1, 0, { collide: false });
    K.box(G, bx + 26, y0 + 46, k.z + u * 22, 0.8, 1.8, 1, 0, { collide: false });
  }
  for (const dz of [-18, -6, 6, 18]) for (const sx of [-1, 1]) { K.box(G, bx + sx * 26.6, y0 + 2, k.z + dz, 0.7, 36, 1.1, 0, { collide: false }); K.box(G, bx + sx * 26.3, y0 + 38, k.z + dz, 0.4, 5, 0.9, 0, { collide: false }); }
  for (const dx of [-18, -6, 6, 18]) for (const sz of [-1, 1]) { K.box(G, bx + dx, y0 + 2, k.z + sz * 22.6, 1.1, 36, 0.7, 0, { collide: false }); K.box(G, bx + dx, y0 + 38, k.z + sz * 22.3, 0.9, 5, 0.4, 0, { collide: false }); }
  for (const [sx, sz] of [[1, -1], [1, 1], [-1, 1]]) { const cx = bx + sx * 26, cz = k.z + sz * 22; K.drum(G, cx, y0 + 37, cz, 2.2, 3, 10, { r2: 3.4, open: true, collide: false }); K.drum(G, cx, y0 + 40, cz, 3.4, 10, 10, { collide: false }); K.cone('dark:roof_2', cx, y0 + 50, cz, 4.1, 7, 10); slit(cx, cz, 3.4, Math.atan2(sz, sx), y0 + 43, 2.4, 'flame'); }
  K.tower(G, k.x - 34, k.z - 18, 9, 78, 'dark:roof_2', { y: y0, steep: 2.4, sides: 16 });
  K.drum(G, k.x - 34, y0 + 70, k.z - 18, 9, 1.4, 16, { r2: 10.4, open: true, collide: false }); K.drum(G, k.x - 34, y0 + 71.4, k.z - 18, 10.4, 5.6, 16, { open: true, collide: false });
  for (let i = 0; i < 8; i++) slit(k.x - 34, k.z - 18, 10.4, i / 8 * TAU + 0.2, y0 + 72.6, 2.6, 'flame');
  for (let i = 0; i < 6; i++) slit(k.x - 34, k.z - 18, 9, -0.9 + i * 0.36, y0 + 30 + i * 6, 3);
  // His red, long, down the road side of the corner towers and the tall tower, so the road sees it from far off.
  for (const sz of [-1, 1]) K.quad('cloth_red', [k.x + HX + 7.1, y0 + 18, k.z + sz * HZ - 2.2], [k.x + HX + 7.1, y0 + 18, k.z + sz * HZ + 2.2], [k.x + HX + 7.1, y0 + 4, k.z + sz * HZ + 2.2], [k.x + HX + 7.1, y0 + 4, k.z + sz * HZ - 2.2], [1, 0, 0], [[0, 0], [1, 0], [1, 3], [0, 3]]);
  K.quad('cloth_red', [k.x - 24.9, y0 + 68, k.z - 21], [k.x - 24.9, y0 + 68, k.z - 15], [k.x - 24.9, y0 + 34, k.z - 15], [k.x - 24.9, y0 + 34, k.z - 21], [1, 0, 0], [[0, 0], [1, 0], [1, 5], [0, 5]]);
  for (const dz of [-12, 0, 12]) K.hanging('cloth_red', k.x + 14, y0 + 42, k.z + dz, [1, 0], 4.4, 28, 3);
  K.quad('door_5', [k.x + 14.05, y0 + 2, k.z - 2.5], [k.x + 14.05, y0 + 2, k.z + 2.5], [k.x + 14.05, y0 + 8.5, k.z + 2.5], [k.x + 14.05, y0 + 8.5, k.z - 2.5], [1, 0, 0], [[1, 1], [0, 1], [0, 0], [1, 0]]);
  K.steps(R, k.x + 18, k.z, Math.PI / 2, 3.2, 10, { rise: 0.2, tread: 0.45, y: y0, walk: false });
  for (const dz of [-5, 5]) K.brazier(k.x + 18, k.z + dz, 1.6);
  K.hanging('cloth_red', k.x + HX + 4.5, y0 + wallH - 1.9, k.z, [1, 0], 3.4, 5.4, 2);
  for (const sz of [-1, 1]) K.banner(k.x + HX + 2, k.z + sz * 9, 7, sz > 0 ? 0 : Math.PI, 'cloth_red', { y: y0 + wallH + 6, pole: 'iron', w: 1.6, len: 5, collide: false });
  // The ditch-line across the approach, 38 m out: two revetments, the bed between them set with stakes, the bridge over it.
  const x0 = k.x + HX + 38, x1 = x0 + 7, xm = x0 + 3.5, dy = y0 + 1.33;
  for (const x of [x0, x1]) for (const s of [-1, 1]) K.wall(R, x, k.z + s * 3.4, x, k.z + s * 62, 0.9, 1.3, { y: y0 });
  for (const s of [-1, 1]) { K.wall(R, x0, k.z + s * 62, x1, k.z + s * 62, 0.9, 1.3, { y: y0 }); K.quad(R, [x0, y0 + 0.04, k.z + s * 3.4], [x0, y0 + 0.04, k.z + s * 62], [x1, y0 + 0.04, k.z + s * 62], [x1, y0 + 0.04, k.z + s * 3.4], [0, 1, 0]); }
  for (let i = 0; i < 46; i++) { const s = i % 2 ? 1 : -1, z = k.z + s * (5.5 + Math.floor(i / 2) * 2.45), x = x0 + 1.6 + hash2(i, 3) * 3.8; K.spike(i % 5 ? 'dark:wood' : 'obsidian', x, y0, z, 0.16, 1.7 + hash2(i, 5) * 0.9, 4, i, [(hash2(i, 7) - 0.3) * 0.5, 0]); }
  K.box('wood', xm, dy - 0.22, k.z, 4.4, 0.22, 3.2, 0, { collide: false });
  for (const dx of [-3.3, 0, 3.3]) K.box(G, xm + dx, y0 - 0.3, k.z, 0.6, 1.42, 3.3, 0, { collide: false });
  K.collide(xm, k.z, 4.4, 3.3, 0, y0 + 1.15);
  K.deck([[xm, k.z, 4.4, 3.0, 0, dy]]);
  K.steps(G, xm - 4.4, k.z, -Math.PI / 2, 3.0, 7, { rise: 0.19, tread: 0.42, y: y0 }); K.steps(G, xm + 4.4, k.z, Math.PI / 2, 3.0, 7, { rise: 0.19, tread: 0.42, y: y0 });
  for (const s of [-1, 1]) { K.box(G, xm, dy - 0.2, k.z + s * 3.2, 4.4, 1.1, 0.2, 0); for (const dx of [-4.4, 4.4]) { K.box(G, xm + dx, y0 - 0.3, k.z + s * 3.25, 0.4, 2.9, 0.4, 0); K.spike('iron', xm + dx, y0 + 2.6, k.z + s * 3.25, 0.2, 1.1, 4, 0.78); } }
  // The barbican past the ditch: two towers and the arch between them, wings of wall either side, his red on their heads.
  const xb = x1 + 7;
  for (const s of [-1, 1]) {
    K.tower(G, xb, k.z + s * 8, 3.7, 12, null, { y: y0 }); slit(xb, k.z + s * 8, 3.7, s * 0.5, y0 + 6); slit(xb, k.z + s * 8, 3.7, s * 0.5 + Math.PI - s, y0 + 6);
    K.wall(G, xb, k.z + s * 11.5, xb, k.z + s * 27, 2, 6, { crenel: true, y: y0 });
    K.banner(xb, k.z + s * 8, 6, s > 0 ? 0 : Math.PI, 'cloth_red', { y: y0 + 12, pole: 'iron', w: 1.3, len: 4, collide: false });
    K.brazier(xb + 5, k.z + s * 6, 1.6);
  }
  K.arch(G, xb, k.z, Math.PI / 2, { a: 3.3, pw: 1.0, hs: 4.2, top: 10, t: 3.2, y: y0 });
  for (let i = -3; i <= 3; i++) for (const dx of [-1.4, 1.4]) if (i % 2 === 0) K.box(G, xb + dx, y0 + 10, k.z + i * 1.25, 0.2, 1.1, 0.55, 0, { collide: false });
  for (let i = -2; i <= 2; i++) K.spike('iron', xb + 1.7, y0 + 7.6 + Math.abs(i) * 0.0, k.z + i * 1.3, 0.14, -1.2, 4, 0.78);
  // Up the Vigil Road to the barbican: gibbets, and braziers in pairs.
  for (let i = 2; i <= 6; i++) {
    const x = k.x + HX + 14 + i * 26;
    K.brazier(x, k.z + 7); K.brazier(x, k.z - 7);
    if (i % 2) { const gx = x + 13, gz = k.z + 11, gy = Y(gx, gz); K.box('wood', gx, gy - 0.4, gz, 0.15, 6, 0.15, 0); K.box('wood', gx - 1.2, gy + 5.4, gz, 1.4, 0.18, 0.15, 0, { collide: false }); K.drum('iron', gx - 2.3, gy + 2.6, gz, 0.4, 1.6, 6, { open: true, collide: false }); K.heap('pale:rubble', gx - 2.3, gz + 0.4, 0.9, 0.45, 6, { collide: false }); }
    else { const px = x + 13, pz = k.z - 11; K.spike('dark:wood', px, Y(px, pz) - 0.3, pz, 0.14, 4.4, 4, 0.5, [0.05, 0]); K.rock('pale:stone', px + 0.2, pz, 0.3, 0.32, { y: Y(px, pz) + 3.2, collide: false }); }
  }
  K.spots.keepGate = [k.x + HX + 8, y0, k.z, Math.PI / 2];
}

function barrow(K) {
  // The Barrows: the great mounds are the land's own (lands.js BARROWS); here, their doors: two stones and a lintel, a slab
  // across; a kerb of stones round the great one and an avenue up to its door from the track; a dolmen with its capstone
  // slid; and the camp of whoever's been digging into the second mound.
  const b = at('barrows');
  for (const [dx, dz, r, yaw] of BARROWS.map((q) => [q[0] - b.x, q[1] - b.z, q[2], q[4]])) {
    const x = b.x + dx + Math.cos(yaw) * r * 0.82, z = b.z + dz + Math.sin(yaw) * r * 0.82, y = Y(x, z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const side of [-1, 1]) K.box('rubble', x - s * side * 1.4, y - 0.5, z + c * side * 1.4, 0.45, 3.2, 0.45, -yaw);
    K.box('rubble', x, y + 2.6, z, 0.6, 0.6, 2.2, -yaw, { collide: false });
    K.box('stone', x + c * 0.4, y - 0.3, z + s * 0.4, 0.2, 2.6, 1.05, -yaw);
    for (const side of [-1, 1]) for (const d of [1.6, 3.4]) K.rock('rubble', x + c * d - s * side * (2.2 + d * 0.25), z + s * d + c * side * (2.2 + d * 0.25), 0.55, 0.9, { collide: false });
  }
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU, x = b.x + Math.cos(a) * 28.5, z = b.z + Math.sin(a) * 28.5;
    if (Math.abs(((a - 0.4 + Math.PI) % TAU) - Math.PI) < 0.22) continue;
    K.menhir('rubble', x, z, 0.5 + hash2(i, 3) * 0.25, 1.1 + hash2(i, 5) * 0.9, -a, (hash2(i, 7) - 0.5) * 0.2);
  }
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
    const d = 33 + i * 6.5, x = b.x + Math.cos(0.4) * d - Math.sin(0.4) * side * 3.6, z = b.z + Math.sin(0.4) * d + Math.cos(0.4) * side * 3.6;
    if (routeDist(x, z).d > 3) K.menhir('rubble', x, z, 0.45, 1.8 + hash2(i, side + 9) * 1.2, -0.4, (hash2(i, side + 3) - 0.5) * 0.25);
  }
  { const x = b.x - 62, z = b.z + 28, y = Y(x, z);
    for (const [dx, dz, hh] of [[-1.5, -1, 2.1], [1.6, -0.8, 1.9], [0, 1.6, 2.2]]) K.box('rubble', x + dx, y - 0.5, z + dz, 0.5, hh + 0.5, 0.4, dx);
    K.quad('rubble', [x - 2.8, y + 2.2, z - 2.2], [x - 2.4, y + 2.4, z + 2.8], [x + 3, y + 1.8, z + 2.4], [x + 2.6, y + 1.7, z - 2.4]); K.quad('rubble', [x - 2.8, y + 1.75, z - 2.2], [x + 2.6, y + 1.25, z - 2.4], [x + 3, y + 1.35, z + 2.4], [x - 2.4, y + 1.95, z + 2.8]);
    for (const [a, c] of [[[x - 2.8, z - 2.2, 2.2, 1.75], [x - 2.4, z + 2.8, 2.4, 1.95]], [[x - 2.4, z + 2.8, 2.4, 1.95], [x + 3, z + 2.4, 1.8, 1.35]], [[x + 3, z + 2.4, 1.8, 1.35], [x + 2.6, z - 2.4, 1.7, 1.25]], [[x + 2.6, z - 2.4, 1.7, 1.25], [x - 2.8, z - 2.2, 2.2, 1.75]]]) K.quad('rubble', [a[0], y + a[3], a[1]], [c[0], y + c[3], c[1]], [c[0], y + c[2], c[1]], [a[0], y + a[2], a[1]]); }
  { const [mx, mz, mr] = BARROWS[1], x = mx + 6, z = mz - mr - 7;
    K.heap('dark:rubble', mx + 1, mz - mr + 1.5, 2.4, 1.3, 7); K.heap('dark:rubble', mx - 4.5, mz - mr - 1, 1.6, 0.9, 6, { collide: false });
    K.tent(x, z, 0.5, 1.7, 1.3, 1.7); K.tent(x + 5.5, z - 2.5, -0.3, 1.5, 1.2, 1.5, 'wall_13'); K.campfire(x + 2, z + 4, false);
    K.cart(x - 6, z - 1, 2.4, { len: 1.1, load: 'dark:rubble' }); K.goods(x + 6.5, z + 2.5, 4, 1.2); K.ladder(mx + 3, mz - mr - 1, mx + 1.5, Y(mx, mz - mr + 4) + 0.5, mz - mr + 4.5);
    K.spots.barrows_camp = [x + 3.5, Y(x + 3.5, z + 1), z + 1, 2.4]; }
  for (const [dx, dz] of [[52, -78], [-30, -96], [96, 40]]) K.banner(b.x + dx, b.z + dz, 3, dx, 'cloth_oat', { w: 0.45, len: 1.0 });
  // The Nine Maidens: a ring of nine, one lying where she fell; the Piper off to the north-west, taller than any; two
  // stones and a lintel for the ring's door; a flat stone in its middle with a burnt-out fire by it.
  const m = at('stones');
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9 * TAU, x = m.x + Math.cos(t) * 16, z = m.z + Math.sin(t) * 16;
    if (i === 6) { K.box('stone', x, Y(x, z) - 0.3, z, 2.6, 0.9, 0.8, t); continue; }
    K.menhir('stone', x, z, 0.9 + hash2(i, 1) * 0.3, 3.4 + hash2(i, 4) * 1.6, -t, (hash2(i, 8) - 0.5) * 0.12);
  }
  K.menhir('stone', m.x - 25, m.z - 19, 1.2, 6.2, 0.7, 0.07);
  for (const s of [-1, 1]) K.menhir('stone', m.x + s * 1.9, m.z - 21.5, 0.6, 3.1, 0, 0);
  K.box('stone', m.x, Y(m.x, m.z - 21.5) + 2.45, m.z - 21.5, 2.9, 0.55, 0.6, 0, { collide: false });
  K.box('stone', m.x - 1, Y(m.x - 1, m.z - 1) - 0.3, m.z - 1, 1.9, 0.85, 1.1, 0.5); K.campfire(m.x + 3.2, m.z + 1.5, false);
  for (let i = 0; i < 5; i++) { const t = 0.7 + i * 1.3, x = m.x + Math.cos(t) * (8 + i), z = m.z + Math.sin(t) * (8 + i); K.cairn(x, z, 0.4, 0.55); }
  K.spots.stones_ring = [m.x + 4, Y(m.x + 4, m.z - 5), m.z - 5, 0.6];
}

function rimeholt(K) {
  // Frostwatch: the watch-fort at the Frost Road's end. A stone tower with a beacon on its head, a wall round its yard with
  // a gate north to the road and south to the fells, two long houses, the stable and the smithy against the walls, a well,
  // sledges and stores, stakes outside against whatever comes down off the Deeps.
  const f = at('frostwatch'), fy = Y(f.x, f.z), FS = 'frost:stone', FR = 'frost:rubble';
  K.tower(FS, f.x, f.z - 10, 5, 20, null, { sides: 12 });
  K.drum(FS, f.x, fy + 16.6, f.z - 10, 5, 0.9, 12, { r2: 5.9, open: true, collide: false }); K.drum(FS, f.x, fy + 17.5, f.z - 10, 5.9, 2.4, 12, { open: true, collide: false });
  K.drum('iron', f.x, fy + 20, f.z - 10, 0.7, 0.9, 8, { r2: 1.2, open: true, collide: false }); K.cone('flame', f.x, fy + 20.4, f.z - 10, 0.9, 2.2, 6);
  for (const [a, yy] of [[0.3, 6], [1.9, 10], [3.5, 14], [5.1, 8]]) K.quad('water', [f.x + Math.cos(a) * 5.04 + Math.sin(a) * 0.2, fy + yy, f.z - 10 + Math.sin(a) * 5.04 - Math.cos(a) * 0.2], [f.x + Math.cos(a) * 5.04 - Math.sin(a) * 0.2, fy + yy, f.z - 10 + Math.sin(a) * 5.04 + Math.cos(a) * 0.2], [f.x + Math.cos(a) * 5.04 - Math.sin(a) * 0.2, fy + yy + 2, f.z - 10 + Math.sin(a) * 5.04 + Math.cos(a) * 0.2], [f.x + Math.cos(a) * 5.04 + Math.sin(a) * 0.2, fy + yy + 2, f.z - 10 + Math.sin(a) * 5.04 - Math.cos(a) * 0.2], [Math.cos(a), 0, Math.sin(a)]);
  K.quad('door_2', [f.x - 0.9, fy, f.z - 4.93], [f.x + 0.9, fy, f.z - 4.93], [f.x + 0.9, fy + 2.5, f.z - 4.93], [f.x - 0.9, fy + 2.5, f.z - 4.93], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  const X = 26, Z = 22, wl = (ax, az, bx, bz) => K.wall(FR, f.x + ax, f.z + az, f.x + bx, f.z + bz, 1.2, 3.6, { crenel: true });
  wl(-X, -Z, 9.6, -Z); wl(14.4, -Z, X, -Z); wl(X, -Z, X, Z); wl(X, Z, 2.4, Z); wl(-2.4, Z, -X, Z); wl(-X, Z, -X, -Z);
  for (const [gx, gz] of [[9.2, -Z], [14.8, -Z], [-2.8, Z], [2.8, Z]]) { K.box(FS, f.x + gx, Y(f.x + gx, f.z + gz) - 0.5, f.z + gz, 0.7, 5.6, 0.9, 0); K.brazier(f.x + gx + (gx > 5 ? (gx > 12 ? 1.6 : -1.6) : gx > 0 ? 1.6 : -1.6), f.z + gz + (gz > 0 ? 2.2 : -2.2), 1.5); }
  K.box(FS, f.x + 12, Y(f.x + 12, f.z - Z) + 4.3, f.z - Z, 3.4, 0.8, 0.9, 0, { collide: false }); K.box(FS, f.x, Y(f.x, f.z + Z) + 4.3, f.z + Z, 3.4, 0.8, 0.9, 0, { collide: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.tower(FR, f.x + sx * X, f.z + sz * Z, 2.6, 5.6, null, { sides: 8 });
  K.house(f.x - 13, f.z + 9, 7, 4, 3.6, Math.PI, 'wall_18', 'roof_4', { chimney: 4, lamp: 1 });
  K.house(f.x + 14, f.z + 9, 7, 4, 3.6, Math.PI, 'wall_20', 'roof_4', { chimney: -4, lamp: -1 });
  // (The stable on the east wall, the smithy on the west; the well in the yard's middle.)
  K.leanTo(f.x + 23, f.z - 6, -Math.PI / 2, 5, 2, 3, 'roof_4'); K.trough(f.x + 19.6, f.z - 8.5, Math.PI / 2, 1.2); K.hayrick(f.x + 22.5, f.z - 13.5, 1.2, 1.9);
  K.leanTo(f.x - 23.2, f.z - 9, Math.PI / 2, 3.4, 1.9, 2.9, 'roof_4'); K.box('stone', f.x - 23.6, fy - 0.2, f.z - 10.6, 0.7, 1.1, 0.7, 0); K.cone('flame', f.x - 23.6, fy + 0.85, f.z - 10.6, 0.35, 0.5, 6);
  K.stump(f.x - 21.2, f.z - 8.4, 0.3, 0.6); K.box('iron', f.x - 21.2, fy + 0.6, f.z - 8.4, 0.3, 0.2, 0.12, 0.4, { collide: false });
  K.well(f.x + 6, f.z - 1, 0.2, { roof: 'roof_4', stone: FS });
  K.woodpile(f.x - 22.5, f.z + 2, Math.PI / 2, 2.4, 1.4, 0.55); K.woodpile(f.x + 5.6, f.z + 18.6, 0, 2.2, 1.2, 0.5);
  K.goods(f.x - 6, f.z + 18.5, 6, 1.7); K.rack(f.x - 15, f.z - 17.5, 0, 1.6, null, 1.5);
  // (A sledge by the south gate, another loaded.)
  for (const [sx, sz, yaw, load] of [[7, 13.5, 0.3, true], [-8, -17, 1.2, false]]) { const P = K.frame(f.x + sx, f.z + sz, yaw); for (const s of [-1, 1]) { const [ax, az] = P(-1.4, s * 0.45), [bx, bz] = P(1.5, s * 0.45), [cx, cz] = P(1.9, s * 0.45); K.beam('wood', [ax, fy + 0.08, az], [bx, fy + 0.08, bz], 0.09); K.beam('wood', [bx, fy + 0.08, bz], [cx, fy + 0.5, cz], 0.08); } K.box('wood', f.x + sx, fy + 0.25, f.z + sz, 1.3, 0.08, 0.55, yaw, { collide: false }); if (load) K.box('cloth_oat', f.x + sx, fy + 0.33, f.z + sz, 1.0, 0.5, 0.45, yaw, { collide: false }); K.collide(f.x + sx, f.z + sz, 1.5, 0.6, yaw, fy + 0.8); }
  K.lantern(f.x + 2.6, f.z + 4.5, 2.8, Math.PI); K.lantern(f.x + 15.5, f.z - 17, 2.8, Math.PI); K.banner(f.x, f.z - 10, 5, 0.4, 'cloth_oat', { y: fy + 19.9, w: 1.2, len: 3.2, collide: false });
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = 37 + hash2(i, 3) * 3, x = f.x + Math.cos(a) * r * 1.1, z = f.z + Math.sin(a) * r; if (routeDist(x, z).d < 5 || Math.hypot(x - 700, z - 3928) < 7) continue; K.spike('bark', x, Y(x, z) - 0.3, z, 0.17, 2.1, 4, a, [Math.cos(a) * 0.45, Math.sin(a) * 0.45]); }
  K.spots.frostwatch_yard = [f.x - 10, fy, f.z - 1, Math.PI / 2];
  // The Frozen Shrine: Tessariel's. Four pillars and a lintel round a T of white stone, all in ice; steps up to it, his
  // sunburst on the lintel, the ice hanging from it, two fires that haven't gone out, the pilgrims' cairns and their flags.
  const s = at('shrine'), sy = Y(s.x, s.z);
  K.disc('ice', s.x, sy + 0.05, s.z, 10.5, 20);
  K.box('frost:stone', s.x, sy - 0.4, s.z, 4.5, 0.8, 4.5, 0.3, { collide: false });
  K.deck([[s.x, s.z, 4.5, 4.5, 0.3, sy + 0.4]]);
  { const P = K.frame(s.x, s.z, 0.3); for (let q = 0; q < 4; q++) { const yaw = 0.3 + q * Math.PI / 2, [px, pz] = K.frame(s.x, s.z, yaw)(0, 4.5); K.steps('frost:stone', px, pz, yaw, 1.6, 2, { rise: 0.2, tread: 0.4, y: sy }); } void P; }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [px, pz] = K.frame(s.x, s.z, 0.3)(sx * 3.4, sz * 3.4); K.drum('frost:stone', px, sy + 0.4, pz, 0.45, 5, 10, { collide: false }); K.drum('frost:stone', px, sy + 0.4, pz, 0.62, 0.4, 10, { collide: false }); K.collide(px, pz, 0.45, 0.45, 0, sy + 5.4); }
  K.box('frost:stone', s.x, sy + 5.4, s.z, 4.2, 0.6, 4.2, 0.3, { collide: false });
  for (let q = 0; q < 4; q++) { const a = 0.3 + q * Math.PI / 2, n = [Math.sin(a), Math.cos(a)]; K.sunburst('fruit2', s.x + n[0] * 4.22, sy + 5.7, s.z + n[1] * 4.22, n, 0.42); }
  K.box('pale:stone', s.x, sy + 0.4, s.z, 0.3, 3.2, 0.3, 0.3, { collide: false });
  K.box('pale:stone', s.x, sy + 3.0, s.z, 1.3, 0.3, 0.3, 0.3, { collide: false });
  K.collide(s.x, s.z, 0.4, 0.4, 0.3, sy + 3.6);
  for (let i = 0; i < 14; i++) { const t = i / 14 * TAU; K.spike('ice', s.x + Math.cos(t) * 2.6, sy + 0.4, s.z + Math.sin(t) * 2.6, 0.25, 1 + hash2(i, 3) * 2, 4, t); }
  for (let i = 0; i < 18; i++) { const [px, pz] = K.frame(s.x, s.z, 0.3)(i < 9 ? -4.1 + i * 1.02 : (i % 2 ? 4.1 : -4.1), i < 9 ? (i % 2 ? 4.1 : -4.1) : -4.1 + (i - 9) * 1.02); K.spike('ice', px, sy + 5.42, pz, 0.14, -(0.5 + hash2(i, 9) * 1.5), 4, i); }
  for (const sd of [-1, 1]) { const [px, pz] = K.frame(s.x, s.z, 0.3)(sd * 6.6, 7.4); K.drum('frost:stone', px, sy - 0.2, pz, 0.3, 1.5, 6); K.drum('iron', px, sy + 1.3, pz, 0.25, 0.35, 8, { r2: 0.45, collide: false, open: true }); K.cone('flame', px, sy + 1.45, pz, 0.32, 0.9, 6); }
  for (let i = 0; i < 7; i++) { const t = 1.1 + i * 0.75, r = 12.5 + hash2(i, 5) * 5, x = s.x + Math.cos(t) * r, z = s.z + Math.sin(t) * r; if (Math.hypot(x - -700, z - 3312) < 6.5) continue; K.cairn(x, z, 0.55 + hash2(i, 6) * 0.4, 0.8 + hash2(i, 7) * 0.5, 'frost:rubble'); }
  K.washing(s.x - 12, s.z - 8, s.x - 5.5, s.z - 11.5, 2.3); K.washing(s.x + 6, s.z - 12, s.x + 12.5, s.z - 8, 2.3);
}

function gallows(K) {
  // Hangman's Cross: where the roads meet under the gallows-tree: three posts and three beams on a mound, ropes still on
  // them; the old gibbet and its cage, the cairn, the fingerpost; the hangman's hut and the dead-cart, the stocks, the
  // nameless graves behind.
  const c = at('crossroads'), cy = Y(c.x, c.z);
  K.box('wood', c.x + 6, cy - 0.5, c.z + 6, 0.2, 7.5, 0.2, 0.6);
  K.box('wood', c.x + 4.8, cy + 6.6, c.z + 6.8, 1.6, 0.22, 0.18, 0.6, { collide: false });
  K.drum('iron', c.x + 3.6, cy + 3.6, c.z + 7.6, 0.45, 1.8, 6, { open: true, collide: false });
  K.drum('rubble', c.x - 6, cy - 0.4, c.z - 6, 2.2, 1.8, 9, { r2: 0.6 });
  K.signpost(c.x - 2, c.z + 3, [0.9, -2.3, 2.6], 3);
  { const gx = c.x + 10, gz = c.z - 9, tri = [0, 1, 2].map((i) => [gx + Math.cos(i * TAU / 3 + 0.4) * 3.2, gz + Math.sin(i * TAU / 3 + 0.4) * 3.2]);
    K.drum('rubble', gx, cy - 0.5, gz, 5.6, 1.0, 10, { r2: 4.6, collide: false }); K.collide(gx, gz, 3.6, 3.6, 0.4, cy + 0.5);
    tri.forEach(([px, pz], i) => { const [qx, qz] = tri[(i + 1) % 3]; K.box('wood', px, cy + 0.4, pz, 0.2, 6.2, 0.2, i, { collide: false }); K.beam('wood', [px, cy + 6.4, pz], [qx, cy + 6.4, qz], 0.24);
      for (const u of [0.3, 0.62]) { const rx = px + (qx - px) * u, rz = pz + (qz - pz) * u; K.beam('cloth_oat', [rx, cy + 6.3, rz], [rx, cy + 4.6 + u, rz], 0.04); } });
    K.ladder(gx - 4.6, gz + 3.4, tri[1][0] + 0.2, cy + 6.2, tri[1][1] + 0.2); }
  K.house(c.x - 15, c.z - 13, 3.2, 2.6, 2.5, 0.9, 'wall_18', 'roof_4', { door: 'door_3', chimney: -1.8, lamp: 1 });
  K.cart(c.x - 9, c.z - 16, -0.4, { len: 1.6 }); K.woodpile(c.x - 19.2, c.z - 9.5, 0.9, 1.2, 0.9);
  // (The stocks: two posts and the boards between.)
  for (const s of [-1, 1]) K.box('wood', c.x + 12 + s * 1.1, cy - 0.3, c.z + 12, 0.1, 1.5, 0.1, 0.2, { collide: false });
  K.box('wood', c.x + 12, cy + 0.55, c.z + 12, 1.2, 0.5, 0.06, 0.2);
  K.graves(c.x + 17, c.z - 20, 0.3, 5, 2.4, 'rubble', 2.4);
  for (let i = 0; i < 4; i++) K.box('dark:rubble', c.x + 12 + i * 2.6, Y(c.x + 12 + i * 2.6, c.z - 15) - 0.2, c.z - 15 + (i % 2) * 0.6, 0.45, 0.38, 0.95, 0.3, { collide: false });
  K.lantern(c.x - 4.5, c.z - 4.5, 2.9, 0.8); K.trough(c.x - 11, c.z - 8.5, 0.9, 1);
  K.spots.crossroads_post = [c.x - 6.5, cy, c.z + 1.5, 1.2];
  // Mother Grawl's Hut: crooked, low, the cauldron over its fire at the door, a fence of bones, her herbs on racks, skulls
  // on poles to say keep off, toadstools coming up round the garden she doesn't weed.
  const w = at('witch'), wy = Y(w.x, w.z);
  K.house(w.x, w.z, 4.5, 3.5, 2.8, 0.5, 'wall_18', 'roof_4', { rise: 4.5, door: 'door_3', chimney: 2.5 });
  K.windowAt(w.x + 2.2 * Math.cos(0.5) + 3.54 * Math.sin(0.5), wy + 1.0, w.z - 2.2 * Math.sin(0.5) + 3.54 * Math.cos(0.5), [Math.sin(0.5), Math.cos(0.5)], 0.4, 0.6, true);
  { const cx = w.x + 3 * Math.sin(0.5) + 2, cz = w.z + 3 * Math.cos(0.5) + 3;
    K.campfire(cx, cz, true); K.drum('iron', cx, wy + 0.45, cz, 0.8, 0.9, 10, { r2: 0.95, lid: 'lake', collide: false });
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3; K.beam('iron', [cx + Math.cos(a) * 1.3, wy, cz + Math.sin(a) * 1.3], [cx, wy + 2.6, cz], 0.06); } }
  for (let i = 0; i < 18; i++) { const t = 0.2 + i / 18 * 5.2, x = w.x + Math.cos(t) * 10, z = w.z + Math.sin(t) * 10; K.box('pale:stone', x, Y(x, z) - 0.2, z, 0.08, 1.3 + hash2(i, 2) * 0.5, 0.08, t, { collide: false }); if (i < 17) { const t2 = 0.2 + (i + 1) / 18 * 5.2; K.beam('pale:stone', [x, Y(x, z) + 0.8, z], [w.x + Math.cos(t2) * 10, Y(w.x + Math.cos(t2) * 10, w.z + Math.sin(t2) * 10) + 0.8, w.z + Math.sin(t2) * 10], 0.05); } }
  for (const [dx, dz, a] of [[11.5, 7.5, 0.4], [-12, 5, 2.2], [9, -11, 5.2]]) { const x = w.x + dx, z = w.z + dz; K.spike('bark', x, Y(x, z) - 0.3, z, 0.12, 3, 4, a); K.rock('pale:stone', x, z, 0.26, 0.3, { y: Y(x, z) + 2.5, collide: false }); }
  K.rack(w.x - 6.5, w.z + 3.5, 2.1, 1.3, 'cloth_oat', 1.6); K.rack(w.x - 6, w.z - 2.5, 1.7, 1.3, 'cloth_red', 1.6);
  K.woodpile(w.x + 5.6, w.z - 3.4, 0.5 + Math.PI / 2, 1.2, 0.9); K.well(w.x - 3, w.z + 7.6, 0.4, { roof: false, stone: 'rubble' });
  K.leanTo(w.x - 2.6, w.z - 5.2, 0.5 + Math.PI, 1.8, 1.1, 2, 'roof_4'); K.barrel(w.x - 3.6, w.z - 5.6); K.sack(w.x - 1.9, w.z - 6);
  for (let i = 0; i < 9; i++) { const t = hash2(i, 41) * TAU, r = 5.5 + hash2(i, 42) * 9, x = w.x + Math.cos(t) * r, z = w.z + Math.sin(t) * r, h = 0.2 + hash2(i, 43) * 0.35; K.drum('cloth_oat', x, Y(x, z) - 0.1, z, 0.06, h + 0.1, 5, { collide: false }); K.cone('fruit', x, Y(x, z) + h - 0.03, z, 0.22 + h * 0.4, 0.2, 7); }
  K.spots.witch_door = [w.x + 5.6 * Math.sin(0.5) - 1.6, wy, w.z + 5.6 * Math.cos(0.5) - 0.4, 0.5];
  // The Twisted Grove: its stone table, under dead trees wrung like rope; rags and bones hung in them, a ring of small
  // stones round the table, an old fire.
  const g = at('grove'), gy = Y(g.x, g.z);
  K.box('rubble', g.x, gy - 0.3, g.z, 2.6, 1.2, 1.4, 0.7); K.box('rubble', g.x, gy + 0.9, g.z, 2.9, 0.22, 1.7, 0.7, { collide: false });
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; K.rock('rubble', g.x + Math.cos(a) * 6.5, g.z + Math.sin(a) * 6.5, 0.45, 0.5, { collide: false, turn: a }); }
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * TAU + hash2(i, 1) * 0.3, r = 13 + hash2(i, 2) * 24, x = g.x + Math.cos(a) * r, z = g.z + Math.sin(a) * r, y = Y(x, z) - 0.4, hh = 5 + hash2(i, 3) * 4;
    // (A trunk in three twists, leaning round on itself, and bare boughs off it.)
    let p = [x, y, z], tw = hash2(i, 4) * TAU;
    for (let sgm = 0; sgm < 3; sgm++) { const q = [p[0] + Math.cos(tw) * 0.9, p[1] + hh / 3, p[2] + Math.sin(tw) * 0.9]; K.beam('bark', p, q, 0.75 - sgm * 0.2); p = q; tw += 2.1; }
    for (let bq = 0; bq < 4; bq++) { const ba = tw + bq * 1.7, e = [p[0] + Math.cos(ba) * (2 + hash2(i, bq + 5) * 2), p[1] + 0.6 + hash2(i, bq + 9) * 2.2 - bq * 0.9, p[2] + Math.sin(ba) * (2 + hash2(i, bq + 5) * 2)]; K.beam('bark', [p[0], p[1] - bq * 0.8, p[2]], e, 0.24); if ((i + bq) % 4 === 0) K.quad(bq % 2 ? 'cloth_red' : 'cloth_oat', e, [e[0] + 0.3, e[1], e[2] + 0.1], [e[0] + 0.3, e[1] - 1.3, e[2] + 0.2], [e[0], e[1] - 1.5, e[2] + 0.1], null, [[0, 0], [0.2, 0], [0.2, 0.6], [0, 0.6]]); }
    K.collide(x, z, 0.4, 0.4, 0, y + 3);
  }
  K.campfire(g.x - 5, g.z + 3.5, false); K.heap('pale:rubble', g.x + 3.6, g.z - 3.6, 0.9, 0.5, 6, { collide: false });
  K.spots.grove_table = [g.x - 1.5, Y(g.x - 1.5, g.z + 4), g.z + 4, 2.9];
}

function deepwood(K) {
  // The Hermit's Hollow: his one room and its smoke, a garden behind a wattle fence, hives, a spring in a stone ring, wood
  // stacked for a winter, a seat by his fire.
  const h = at('hermit'), hy = Y(h.x, h.z);
  K.house(h.x, h.z, 3.5, 3, 2.6, 2.4, 'wall_17', 'roof_1', { chimney: 2, lamp: 1 });
  K.fence([[h.x + 5, h.z + 2], [h.x + 12, h.z + 3], [h.x + 12.5, h.z + 9.5], [h.x + 5, h.z + 9], [h.x + 5, h.z + 4.2]], 0.9);
  for (let i = 0; i < 5; i++) K.box('dark:rubble', h.x + 6.2 + i * 1.2, hy - 0.05, h.z + 6, 0.4, 0.22, 2.4, 0.05, { collide: false });
  for (let i = 0; i < 9; i++) K.cone('cloth_oat', h.x + 6.2 + (i % 5) * 1.2, hy + 0.1, h.z + 4.6 + Math.floor(i / 5) * 2.2, 0.22, 0.5, 5, i);
  for (let i = 0; i < 3; i++) { const x = h.x - 7 - i * 1.5, z = h.z + 5 + (i % 2); K.box('wood', x, Y(x, z) - 0.1, z, 0.4, 0.5, 0.4, 0.3); K.drum('cloth_oat', x, Y(x, z) + 0.4, z, 0.36, 0.5, 8, { r2: 0.3, collide: false }); K.cone('cloth_oat', x, Y(x, z) + 0.9, z, 0.32, 0.3, 8); }
  K.well(h.x - 4.5, h.z - 6.5, 0.6, { roof: false, stone: 'rubble' }); K.woodpile(h.x + 4.4, h.z - 2.4, 2.4, 1.6, 1.2); K.woodpile(h.x + 6, h.z - 4.6, 2.4, 1.3, 0.9);
  K.campfire(h.x - 3.2, h.z + 6, true); K.stump(h.x - 4.9, h.z + 6.8, 0.36, 0.5); K.stump(h.x - 1.8, h.z + 7.6, 0.3, 0.45); K.rack(h.x - 8, h.z - 1, 1.2, 1.2, 'cloth_oat', 1.5);
  K.cairn(h.x + 2, h.z + 12, 0.7, 1.1); K.lantern(h.x - 1, h.z + 10.5, 2.3, 2);
  K.spots.hermit_fire = [h.x - 2.8, Y(h.x - 2.8, h.z + 3.6), h.z + 3.6, -0.6];
}

function sorrowhorn(K) {
  // The Broken Stair: the way onto the mountain. A gate of two great piers with a third of its arch left and the rest across
  // the road; the stair going up behind it between broken walls, the plinths of what stood either side; a shelter the
  // pilgrims built against one pier, their cairns and their flags.
  const s = at('stair'), sy = Y(s.x, s.z), yaw = Math.atan2(MOUNT.x - s.x, MOUNT.z - s.z);
  const c = Math.cos(yaw), sn = Math.sin(yaw), P = K.frame(s.x, s.z, yaw);
  K.arch('pale:stone', s.x, s.z, yaw, { a: 4, pw: 4, hs: 13, t: 4, ring: 1.7, y: sy, broken: 0.36, n: 10 });
  for (const side of [-1, 1]) { const [px, pz] = P(side * 6, 0); K.box('stone', px, sy - 1, pz, 2.5, 2.2, 2.5, yaw, { collide: false }); K.box('stone', px, sy + 12.3, pz, 2.3, 0.7, 2.3, yaw, { collide: false }); }
  K.box('pale:stone', s.x + c * 1.5 + sn * 5, sy - 0.6, s.z - sn * 1.5 + c * 5, 6, 1.6, 1.4, -yaw + 0.25);
  for (const [u, w, r, t] of [[-2.5, 7.5, 1.3, 0.4], [3.2, 9, 1, 1.2], [8, 4, 1.4, 2.2], [-1, 3.6, 0.9, 0.8]]) { const [px, pz] = P(u, w); K.box('pale:stone', px, Y(px, pz) - 0.4, pz, r, r * 0.8, r * 0.7, t); }
  for (let i = 0; i < 26; i++) { const [px, pz] = P(0, -(4 + i * 1.4)); K.box('stone', px, Math.min(sy - 1 + i * 0.4, Y(px, pz) + 0.25) - 0.6, pz, 3.6, 1.6, 0.7, yaw, { collide: false }); }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) { const [ax, az] = P(side * 4.6, -(5 + i * 9)), [bx2, bz2] = P(side * 4.6, -(13 + i * 9)); K.wall('pale:rubble', ax, az, bx2, bz2, 0.9, 2.4, { ruin: true }); }
    const [px, pz] = P(side * 10, 6); K.box('pale:stone', px, Y(px, pz) - 0.5, pz, 1.3, 2.3, 1.3, yaw); K.rock('pale:stone', px, pz, 0.9, 0.8 + (side > 0 ? 2.2 : 0), { y: Y(px, pz) + 1.7, collide: false });
  }
  { const [lx, lz] = P(10.8, -1.5); K.leanTo(lx, lz, yaw + Math.PI / 2, 2.4, 1.6, 2.4, 'roof_4'); const [fx, fz] = P(13, 3); K.campfire(fx, fz, false); const [gx, gz] = P(12, -4.5); K.goods(gx, gz, 3, 1); }
  for (let i = 0; i < 6; i++) { const [px, pz] = P((i % 2 ? 1 : -1) * (13 + i * 2.2), 9 + i * 3.4); if (Math.hypot(px + 1663.1, pz + 1890) < 7 || routeDist(px, pz).d < 4) continue; K.cairn(px, pz, 0.6 + hash2(i, 3) * 0.5, 0.9 + hash2(i, 5) * 0.7, 'pale:rubble'); if (i % 2) K.banner(px + 1.5, pz, 2.6, i, 'cloth_oat', { w: 0.4, len: 0.9, collide: false }); }
  K.spots.stair_gate = [P(-9, 9)[0], Y(...P(-9, 9)), P(-9, 9)[1], yaw + Math.PI];
  // Greywatch, high on the shoulder: a ruined tower, its head broken, a beacon iron on it gone cold; what's left of its
  // yard wall and the stair up to its door; somebody's frozen camp in its lee.
  const gx = MOUNT.x + 820, gz = MOUNT.z + 760, gy = Y(gx, gz);
  K.tower('pale:rubble', gx, gz, 6, 18, null);
  for (let i = 0; i < 5; i++) { const a = 0.6 + i * 0.5; K.box('pale:rubble', gx + Math.cos(a) * 5.4, gy + 18, gz + Math.sin(a) * 5.4, 0.7, 1.5 + hash2(i, 2) * 3.5, 0.55, -a, { collide: false }); }
  K.drum('iron', gx, gy + 18, gz, 0.6, 0.8, 8, { r2: 1.0, open: true, collide: false });
  for (const [a, yy] of [[0.4, 5], [2.2, 9], [4.3, 12], [5.6, 6.5]]) K.quad('water', [gx + Math.cos(a) * 6.05 + Math.sin(a) * 0.22, gy + yy, gz + Math.sin(a) * 6.05 - Math.cos(a) * 0.22], [gx + Math.cos(a) * 6.05 - Math.sin(a) * 0.22, gy + yy, gz + Math.sin(a) * 6.05 + Math.cos(a) * 0.22], [gx + Math.cos(a) * 6.05 - Math.sin(a) * 0.22, gy + yy + 2.2, gz + Math.sin(a) * 6.05 + Math.cos(a) * 0.22], [gx + Math.cos(a) * 6.05 + Math.sin(a) * 0.22, gy + yy + 2.2, gz + Math.sin(a) * 6.05 - Math.cos(a) * 0.22], [Math.cos(a), 0, Math.sin(a)]);
  K.wall('pale:rubble', gx - 16, gz + 10, gx + 18, gz + 14, 1.4, 5, { ruin: true });
  K.wall('pale:rubble', gx + 18, gz + 14, gx + 20, gz - 8, 1.4, 4, { ruin: true });
  for (const [dx, dz, r, t] of [[9, 4, 1.3, 0.5], [11.5, 7, 0.9, 1.4], [-9, 5, 1.1, 2.3], [7, -9, 1.2, 0.2], [-3, 9.5, 0.8, 1]]) K.box('pale:rubble', gx + dx, Y(gx + dx, gz + dz) - 0.4, gz + dz, r, r * 0.8, r * 0.7, t);
  K.tent(gx + 12, gz + 1, 0.4, 1.5, 1.2, 1.5, 'cloth_oat'); K.campfire(gx + 9.5, gz - 1.5, false); K.crate(gx + 13.6, gz - 1.6, 0.35, 0.3);
  K.spots.greywatch = [gx - 9, Y(gx - 9, gz - 2), gz - 2, -Math.PI / 2];
  // The Crown of Teeth (the top, as nothing else in the land): the Rimeglass, a frozen lake in the caldera; in it, a spire of black glass
  // that the ice has climbed; round the shelf, twelve pale pillars with nothing on them, and black teeth along the rim.
  const lake = WATERS.find((w) => w.key === 'rimeglass'), ly = waterLevel(lake);
  K.disc('ice', MOUNT.x, ly, MOUNT.z, MOUNT.lake + 2, 48);
  for (let i = 0; i < 9; i++) {
    const t = i / 9 * TAU, r = i ? 6 + hash2(i, 1) * 5 : 0;
    K.spike('obsidian', MOUNT.x + Math.cos(t) * r, ly - 1, MOUNT.z + Math.sin(t) * r, i ? 2.4 + hash2(i, 2) * 1.8 : 8, i ? 16 + hash2(i, 3) * 20 : 84, i ? 5 : 7, t, [(hash2(i, 4) - 0.5) * 0.3, (hash2(i, 5) - 0.5) * 0.3]);
  }
  for (let i = 0; i < 26; i++) { const t = i / 26 * TAU; K.spike('ice', MOUNT.x + Math.cos(t) * 7.5, ly + 3 + hash2(i, 6) * 26, MOUNT.z + Math.sin(t) * 7.5, 0.6, 2 + hash2(i, 7) * 3, 4, t, [Math.cos(t) * 0.5, Math.sin(t) * 0.5]); }
  for (let i = 0; i < 12; i++) {
    const t = i / 12 * TAU, x = MOUNT.x + Math.cos(t) * (MOUNT.lake + 26), z = MOUNT.z + Math.sin(t) * (MOUNT.lake + 26), low = i % 4 === 1;
    K.drum('pale:stone', x, Y(x, z) - 0.5, z, 1.2, low ? 4 : 11, 10); K.drum('pale:stone', x, Y(x, z) - 0.5, z, 1.7, 1.1, 10, { collide: false });
    if (!low) K.drum('pale:stone', x, Y(x, z) + 10.5, z, 1.2, 0.7, 10, { r2: 1.6, collide: false });
    else for (let q = 0; q < 2; q++) { const dx = x + Math.cos(t + 1.2 + q) * (3 + q * 2.4), dz = z + Math.sin(t + 1.2 + q) * (3 + q * 2.4); K.drum('pale:stone', dx, Y(dx, dz) - 0.3, dz, 1.2, 1.3, 10, { turn: q }); }
  }
  // (Ice come up out of the lake in a broken ring, and slabs of the old way laid from the rim's seal toward it.)
  for (let i = 0; i < 16; i++) { const t = i / 16 * TAU + hash2(i, 21) * 0.2, r = 30 + hash2(i, 22) * 26; K.spike('ice', MOUNT.x + Math.cos(t) * r, ly - 0.3, MOUNT.z + Math.sin(t) * r, 0.7 + hash2(i, 23), 2 + hash2(i, 24) * 5, 5, t, [Math.cos(t) * 0.25, Math.sin(t) * 0.25]); }
  for (let i = 0; i < 5; i++) K.paving('pale:stone', MOUNT.x + MOUNT.lake + 30 - i * 5.2, MOUNT.z + (i % 2) * 0.8, 2.2, 1.6, hash2(i, 31) * 0.3, 0.08);
  for (let i = 0; i < 40; i++) {
    const t = i / 40 * TAU + hash2(i, 9) * 0.1, r = MOUNT.crown - 6 + hash2(i, 10) * 14, x = MOUNT.x + Math.cos(t) * r, z = MOUNT.z + Math.sin(t) * r;
    K.spike('obsidian', x, Y(x, z) - 2, z, 2 + hash2(i, 11) * 2, 8 + hash2(i, 12) * 16, 5, t, [(hash2(i, 13) - 0.5) * 0.4, (hash2(i, 14) - 0.5) * 0.4]);
  }
}

