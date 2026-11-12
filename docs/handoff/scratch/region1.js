function downs(K) {
  // Millhaven Farm: the farmhouse, the barn and its cart shed, three fenced fields with the corn stooked in one, ricks, a
  // sty, a well. (South of the Hill Road and east of the Mill Lane, which leaves it here.)
  const f = at('farm');
  K.house(f.x - 12, f.z + 4, 7.5, 5, 6.5, 0.1, 'wall_14', 'roof_1', { chimney: 4.5, lamp: 1 });
  K.house(f.x + 30, f.z + 14, 7, 9, 5.5, Math.PI / 2 + 0.1, 'wood', 'roof_3', { door: 'door_3' });
  K.leanTo(f.x + 30, f.z + 28.5, 0.1, 5, 2.4, 3, 'roof_3');
  K.cart(f.x + 28.5, f.z + 29, 0.1 + Math.PI / 2, { load: 'cloth_oat' });
  for (const [dx, dz, w, d] of [[-40, 34, 17, 11], [-30, 68, 15, 11], [64, 44, 13, 9]]) {
    const x = f.x + dx, z = f.z + dz;
    K.fence([[x - w, z - d], [x + w, z - d], [x + w, z + d], [x - w, z + d], [x - w, z - d + 3]]);
  }
  for (let i = 0; i < 14; i++) { const x = f.x - 52 + (i % 5) * 6 + hash2(i, 2) * 2, z = f.z + 28 + Math.floor(i / 5) * 6 + hash2(i, 5) * 2; K.cone('cloth_oat', x, Y(x, z) - 0.1, z, 0.55, 1.3, 6, i); }
  for (const [dx, dz, r] of [[6, 30, 1.7], [10.5, 31, 1.4], [8, 35, 1.9]]) K.hayrick(f.x + dx, f.z + dz, r, r * 1.6);
  K.well(f.x - 1, f.z + 12, 0.4);
  K.trough(f.x + 20, f.z + 6, 1.2); K.woodpile(f.x - 20.5, f.z + 9, 0.1 + Math.PI / 2, 1.6, 1.1);
  K.stump(f.x - 18, f.z + 12, 0.35, 0.55);
  K.washing(f.x - 16, f.z + 13, f.x - 9, f.z + 15.5);
  // (The sty: a low wall round a little house.)
  for (const [ax, az, bx, bz] of [[14, 16, 21, 16], [21, 16, 21, 22], [21, 22, 14, 22], [14, 22, 14, 18]]) K.wall('rubble', f.x + ax, f.z + az, f.x + bx, f.z + bz, 0.4, 0.9);
  K.house(f.x + 19, f.z + 20, 1.3, 1.1, 1.0, -Math.PI / 2, 'wood', 'roof_3', { door: 'door_3', rise: 0.7 });
  K.goods(f.x + 23, f.z + 2, 5, 1.6); K.lantern(f.x - 4, f.z + 0.5, 2.6, 2);
  K.spots.farm_yard = [f.x + 6, Y(f.x + 6, f.z + 8), f.z + 8, Math.PI];
  // The windmill on its rise: a tapering tower on a footing, a gallery round it, a cap, four sails stopped at a slant; the
  // miller's house, his cart and a stone worn out.
  const m = at('mill'), my = Y(m.x, m.z);
  K.drum('stone', m.x, my - 0.6, m.z, 4.7, 1.3, 8);
  K.drum('wall_09', m.x, my - 0.5, m.z, 4.2, 13, 8, { r2: 3.2, collide: false });
  K.drum('wood', m.x, my + 4.4, m.z, 5.3, 0.16, 8, { r2: 5.3, collide: false });
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU, c = Math.cos(a), s = Math.sin(a); K.beam('wood', [m.x + c * 5.2, my + 4.5, m.z + s * 5.2], [m.x + c * 5.2, my + 5.5, m.z + s * 5.2], 0.08); K.beam('wood', [m.x + c * 5.1, my + 4.4, m.z + s * 5.1], [m.x + c * 3.95, my + 2.6, m.z + s * 3.95], 0.1); }
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU, b = (i + 1.5) / 8 * TAU; K.beam('wood', [m.x + Math.cos(a) * 5.2, my + 5.45, m.z + Math.sin(a) * 5.2], [m.x + Math.cos(b) * 5.2, my + 5.45, m.z + Math.sin(b) * 5.2], 0.07); }
  K.cone('roof_2', m.x, my + 12.5, m.z, 4, 4.2, 8);
  // (Its door to the lane, on the north; the sails to the south.)
  K.quad('door_2', [m.x + 0.8, my + 0.7, m.z - 4.22], [m.x - 0.8, my + 0.7, m.z - 4.22], [m.x - 0.8, my + 3.1, m.z - 4.22], [m.x + 0.8, my + 3.1, m.z - 4.22], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.steps('stone', m.x, m.z - 4.75, Math.PI, 1.1, 3, { rise: 0.2, tread: 0.4, y: my + 0.1 });
  const hub = [m.x, my + 11.5, m.z + 4.6];
  K.beam('wood', [m.x, my + 11.5, m.z + 2.6], [m.x, my + 11.5, m.z + 4.9], 0.5);
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + i * Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a);
    const P = (r, w, d = 0) => [hub[0] + cx * r - cy * w, hub[1] + cy * r + cx * w, hub[2] + d];
    K.beam('wood', P(0, 0), P(10.2, 0), 0.22);
    K.quad('cloth_oat', P(2, 0.15, 0.05), P(9.6, 0.15, 0.05), P(9.6, 1.7, 0.3), P(2, 1.7, 0.3));
    for (let q = 0; q < 6; q++) K.beam('wood', P(2 + q * 1.52, 0, 0.02), P(2 + q * 1.52, 1.75, 0.3), 0.06);
    K.beam('wood', P(2, 1.72, 0.3), P(9.6, 1.72, 0.3), 0.07);
  }
  // (The tail pole, down to the ground on the north-east, that turns the cap.)
  K.beam('wood', [m.x + 2, my + 12.6, m.z - 2.4], [m.x + 7.5, my + 0.4, m.z - 9], 0.16);
  K.house(m.x - 13, m.z - 3, 4.2, 3.4, 3.2, Math.PI / 2 + 0.2, 'wall_09', 'roof_2', { chimney: -2.5, lamp: -1 });
  K.cart(m.x + 8, m.z - 13, 2.2, { load: 'cloth_oat' });
  for (let i = 0; i < 5; i++) K.sack(m.x + 2.2 + (i % 3) * 0.6, m.z - 5.6 - Math.floor(i / 3) * 0.6, 0.36);
  K.wheel(m.x - 3.2, my + 0.7, m.z - 4.9, 0.5, 0.75, 'stone');
  K.fence([[m.x - 20, m.z - 9], [m.x - 20, m.z + 6], [m.x - 6, m.z + 8]]);
  // Millhaven: a street of homes along the Hill Road, a green with the well and the market pillar, a smithy, a tithe barn,
  // a graveyard behind its wall, folds and ricks out at its ends.
  const hm = at('hamlet'), st = street(hm.x, hm.z, way(1900, 60, 2040, 0), way(2040, 0, 2300, -60));
  const homes = [
    [-62, 15, 'wall_16', 'roof_1', 5.5, 4.2], [-38, 14, 'wall_13', 'roof_4', 5, 4.4], [-13, 15, 'wall_15', 'roof_3', 6, 4.5], [34, 15, 'wall_19', 'roof_2', 5.2, 4.2], [58, 14, 'wall_10', 'roof_1', 5.5, 4.5],
    [-52, -14, 'wall_12', 'roof_3', 5, 4.2], [-28, -15, 'wall_17', 'roof_1', 5.6, 4.4], [42, -14, 'wall_14', 'roof_4', 5.5, 4.5], [66, -15, 'wall_11', 'roof_3', 4.8, 4],
  ];
  homes.forEach(([t, off, w, r, hx, hz], i) => {
    const p = st(t, off);
    K.house(p.x, p.z, hx, hz, 4.2 + (i % 3) * 0.4, p.yaw, w, r, { chimney: i % 2 ? -3 : 3, lamp: i % 3 === 0 ? 1 : 0 });
    // (Behind each: a woodpile, a water butt, a line of washing or a rick.)
    const q = st(t + 3, off + Math.sign(off) * (hz + 3));
    if (i % 3 === 0) K.woodpile(q.x, q.z, p.yaw, 1.3, 0.9); else if (i % 3 === 1) K.hayrick(q.x, q.z, 1.3, 2.2); else { const e = st(t - 4, off + Math.sign(off) * (hz + 3.5)); K.washing(q.x, q.z, e.x, e.z); }
    const bq = st(t + hx + 0.8, off - Math.sign(off) * (hz - 1)); K.barrel(bq.x, bq.z);
  });
  // The green, north of the road at the middle: the well, the pillar on its steps, stalls on a market day, benches.
  const g = st(10, 15);
  K.well(g.x - 5, g.z - 2, 0.4);
  K.drum('stone', g.x + 4, Y(g.x + 4, g.z) - 0.6, g.z, 1.9, 0.9, 8); K.drum('stone', g.x + 4, Y(g.x + 4, g.z) + 0.3, g.z, 1.2, 0.3, 8, { collide: false });
  K.drum('stone', g.x + 4, Y(g.x + 4, g.z) + 0.6, g.z, 0.3, 3.2, 8, { r2: 0.22, collide: false }); K.drum('stone', g.x + 4, Y(g.x + 4, g.z) + 3.8, g.z, 0.42, 0.5, 6, { r2: 0.1, collide: false });
  for (const [t, off, c, k] of [[2, 9.5, 'cloth_oat', 0], [18, 9, 'cloth_red', 1], [13, 22, 'cloth_oat', 2]]) { const p = st(t, off); K.stall(p.x, p.z, p.yaw, c, k); }
  { const p = st(4, 21); K.bench(p.x, p.z, p.yaw); const q = st(22, 16); K.lantern(q.x, q.z, 2.8, 1); K.spots.millhaven_green = [st(10, 8).x, Y(st(10, 8).x, st(10, 8).z), st(10, 8).z, st(10, 8).yaw]; }
  // The smithy, south of the road: an open shed, the forge's fire, the anvil's block, iron leaning on the wall.
  { const p = st(8, -15); K.house(p.x, p.z, 4.5, 3.6, 3.6, p.yaw, 'wall_18', 'roof_2', { chimney: 3.2 });
    const q = st(16.5, -13); K.leanTo(q.x, q.z, p.yaw, 2.8, 2.2, 2.9, 'roof_2'); const a = st(16.5, -10.5);
    K.stump(a.x, a.z, 0.3, 0.6); K.box('iron', a.x, Y(a.x, a.z) + 0.6, a.z, 0.3, 0.2, 0.12, p.yaw, { collide: false });
    const fr = st(18, -14); K.box('stone', fr.x, Y(fr.x, fr.z) - 0.2, fr.z, 0.7, 1.1, 0.6, p.yaw); K.cone('flame', fr.x, Y(fr.x, fr.z) + 0.85, fr.z, 0.35, 0.5, 6);
    const tr = st(13.6, -10.2); K.trough(tr.x, tr.z, p.yaw, 0.7); const c = st(21, -10); K.cart(c.x, c.z, p.yaw + 0.5, { wreck: false }); }
  // The tithe barn at the east end, and the graveyard behind its wall at the west.
  { const p = st(86, 20); K.house(p.x, p.z, 9, 5.5, 5.2, p.yaw, 'wood', 'roof_3', { door: 'door_3', rise: 5 }); const q = st(74, 22); K.hayrick(q.x, q.z, 1.8, 2.8); const r = st(98, 12); K.cart(r.x, r.z, 0.4, { load: 'cloth_oat' }); }
  { const p = st(-84, 22), y = p.yaw; K.graves(p.x, p.z, y, 6, 5, 'stone');
    const F = K.frame(p.x, p.z, y), c = [[-8.5, -7.5], [8.5, -7.5], [8.5, 7.5], [-8.5, 7.5]].map(([u, w]) => F(u, w));
    K.wall('rubble', ...c[0], ...c[1], 0.5, 1); K.wall('rubble', ...c[1], ...c[2], 0.5, 1); K.wall('rubble', ...c[3], ...c[0], 0.5, 1);
    K.wall('rubble', ...c[3], ...F(-2, 7.5), 0.5, 1); K.wall('rubble', ...F(2, 7.5), ...c[2], 0.5, 1); }
  // A fold of hurdles at the south-east, and a signpost where the road comes in from the west.
  { const p = st(70, -34); K.fence([[p.x - 8, p.z - 6], [p.x + 8, p.z - 6], [p.x + 8, p.z + 6], [p.x - 8, p.z + 6], [p.x - 8, p.z - 3]]); K.trough(p.x + 2, p.z - 4.5, 0, 1); const s = st(-92, -5); K.signpost(s.x, s.z, [1.2, -1.9]); }
  // Brightwater: the falls over the cliff, the pool under them, boulders; a fisher's hut on the west shore, his boat and
  // racks, a plank landing, stepping stones across the outflow.
  const pool = WATERS.find((w) => w.key === 'pool'), py = waterLevel(pool);
  K.disc('lake', pool.x, py, pool.z, pool.r + 1, 40);
  // (Down the face as it really lies, a strip at a time, a hand's breadth off the rock; from the lip to the pool's edge.)
  let lip = CLIFF.x;
  for (let x = CLIFF.x; x < CLIFF.x + 70; x += 2) if (Y(x, POOL.z) > Y(lip, POOL.z)) lip = x;
  let prev = null;
  for (let x = CLIFF.x - 6; x <= lip + 2; x += 3) {
    const y = Math.max(py, Y(x, POOL.z)) + 0.35, v = (lip - x) / 8;
    if (prev) K.quad('falls', [x, y, POOL.z - 7], [x, y, POOL.z + 7], [prev[0], prev[1], POOL.z + 7.5], [prev[0], prev[1], POOL.z - 7.5], null, [[0, v], [1, v], [1, prev[2]], [0, prev[2]]]);
    prev = [x, y, v];
  }
  for (let i = 0; i < 16; i++) {
    const a = 0.9 + i * 0.3, r = pool.r + 2 + hash2(i, 1) * 5, x = pool.x + Math.cos(a) * r, z = pool.z + Math.sin(a) * r;
    if (Math.hypot(x - 2574.4, z + 124) < 9) continue;
    K.rock('rubble', x, z, 1.1 + hash2(i, 3) * 1.6, 1.3 + hash2(i, 5) * 1.6, { turn: a });
  }
  for (const [dx, dz, r] of [[22, -12, 3.2], [24, 10, 2.6], [17, -20, 2], [19, 19, 1.8]]) K.rock('rubble', pool.x + dx, pool.z + dz, r, r * 0.9, { y: py - 0.6 });
  { const hx = pool.x - 41, hz = pool.z + 26;
    K.house(hx, hz, 3.4, 2.8, 2.7, -0.9, 'wall_17', 'roof_1', { chimney: 2, lamp: 1 });
    K.rack(hx + 6, hz + 5.5, 0.4, 1.6); K.rack(hx + 4.5, hz + 8.5, 0.5, 1.6, 'cloth_oat', 1.5);
    K.boat(pool.x - 33.5, Y(pool.x - 33.5, pool.z + 14) - 0.05, pool.z + 14, 0.9, 4, { roll: 0.25 });
    K.boat(pool.x - 21, py - 0.12, pool.z + 6, 0.3, 4.2, { collide: false });
    K.bridge(pool.x - 33, pool.z + 5, pool.x - 24, pool.z + 3, 0.9, { up: 0.25, rail: false });
    K.barrel(hx + 3.2, hz - 3.4); K.crate(hx + 4.1, hz - 2.8, 0.35, 0.4); K.woodpile(hx - 4.6, hz + 1, -0.9, 1.1, 0.8);
    K.bench(pool.x - 30, pool.z + 30, 2.4); K.signpost(2486, -104, [-1.5, 1.3]);
    K.spots.falls_hut = [hx + 3.2, Y(hx + 3.2, hz + 3.6), hz + 3.6, 0.7]; }
  belltower(K);
  // The Cairnfield, on the open down west of the Abbey Road: dozens of cairns, some opened, round a great one in its kerb.
  const cf = at('cairnfield');
  K.cairn(cf.x, cf.z, 4.2, 4.4);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x = cf.x + Math.cos(a) * 7.5, z = cf.z + Math.sin(a) * 7.5; K.rock('rubble', x, z, 0.7 + hash2(i, 3) * 0.3, 0.7, { turn: a, collide: false }); }
  K.menhir('rubble', cf.x + 10.5, cf.z - 3, 0.7, 3.6, 0.6, 0.08);
  for (let i = 0; i < 40; i++) {
    const a = hash2(i, 21) * TAU, r = 13 + hash2(i, 22) * 34, x = cf.x + Math.cos(a) * r, z = cf.z + Math.sin(a) * r, s = 0.9 + hash2(i, 23) * 1.1;
    if (routeDist(x, z).d < 5) continue;
    K.cairn(x, z, s, s * (0.9 + hash2(i, 24) * 0.5), 'rubble', i % 5 === 2);
  }
  // (Somebody's been digging: a barrow, a spade stuck in the spoil, a marker with a rag on it.)
  K.heap('dark:rubble', cf.x - 9, cf.z + 9, 1.6, 0.9, 7, { collide: false }); K.cart(cf.x - 12.5, cf.z + 11, 0.7, { len: 1.0 });
  K.beam('wood', [cf.x - 9.4, Y(cf.x - 9.4, cf.z + 8.6) + 0.5, cf.z + 8.6], [cf.x - 9.1, Y(cf.x - 9.4, cf.z + 8.6) + 1.8, cf.z + 8.9], 0.05);
  K.banner(cf.x + 3, cf.z + 12, 3.2, 1, 'cloth_oat', { w: 0.5, len: 0.9 });
}

// The Bell Tower of the Four Watches, Tessariel's, on Bell Knoll: a pale shaft on a battered plinth, buttressed at its
// corners, three stages of slits under string courses; a belfry of paired arches with the four bells in their frame over the
// louvres; a parapet with pinnacles, the copper spire and its gilt finial. Steps and a porch to the door on its south, his
// sunburst over it. Round it the Bellwright's yard: his house, wood and oil store, the well, the ladder he oils the bells
// from, an old cracked bell; the gate to the Knoll Path; and out on the knoll a ring of watch-stones.
function belltower(K) {
  const b = at('belltower'), x = b.x, z = b.z, by = Y(x, z), S = 'pale:stone', G = 'stone', Q = Math.PI / 4, R2 = Math.SQRT2;
  K.drum(G, x, by - 1, z, 6.0 * R2, 4, 4, { r2: 5.0 * R2, turn: Q, collide: false, lid: S });
  K.box(S, x, by + 3, z, 4.6, 24.5, 4.6, 0, { top: 'wood', collide: false });
  K.collide(x, z, 5.6, 5.6, 0, by + 27);
  for (const [yy, hw, hh] of [[10.6, 4.82, 0.35], [18.6, 4.82, 0.35], [27.2, 5.05, 0.5]]) K.box(G, x, by + yy, z, hw, hh, hw, 0, { collide: false });
  // Each face: its way out, and a point u along it, d out from the tower's middle, v up.
  const faces = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  faces.forEach(([nx, nz], fi) => {
    const F = (u, d, v) => [x + nx * d - nz * u, by + v, z + nz * d + nx * u];
    // The buttresses, a pair to a corner, stepping in at each string course under a sloped head.
    for (const u of [-3.95, 3.95]) for (const [y0, y1, pr] of [[-1, 10.6, 1.5], [10.6, 18.6, 1.0], [18.6, 26.2, 0.55]]) {
      const c = F(u, 4.6 + pr / 2, 0);
      K.box(S, c[0], by + y0, c[2], nz ? 0.55 : pr / 2, y1 - y0, nz ? pr / 2 : 0.55, 0, { collide: false });
      K.quad(G, F(u - 0.6, 4.6 + pr + 0.05, y1), F(u + 0.6, 4.6 + pr + 0.05, y1), F(u + 0.6, 4.6, y1 + 1.0), F(u - 0.6, 4.6, y1 + 1.0));
    }
    // The slits: dark, under a little hood, a sill under them. (The south face's first stage has the door and the sunburst.)
    for (const [v, hh, uu] of [[5.6, 2.0, [0]], [13.0, 2.4, [0]], [21.0, 2.6, [-1.3, 1.3]]]) {
      if (fi === 0 && v < 6) continue;
      for (const u of uu) {
        K.quad('water', F(u - 0.2, 4.63, v), F(u + 0.2, 4.63, v), F(u + 0.2, 4.63, v + hh), F(u - 0.2, 4.63, v + hh), [nx, 0, nz]);
        K.tri('water', F(u - 0.2, 4.63, v + hh), F(u + 0.2, 4.63, v + hh), F(u, 4.63, v + hh + 0.4));
        const hd = F(u, 4.72, v + hh + 0.45), sl = F(u, 4.72, v - 0.2);
        K.box(G, hd[0], hd[1], hd[2], nz ? 0.5 : 0.14, 0.18, nz ? 0.14 : 0.5, 0, { collide: false });
        K.box(G, sl[0], sl[1], sl[2], nz ? 0.4 : 0.12, 0.16, nz ? 0.12 : 0.4, 0, { collide: false });
      }
    }
    // The belfry's face: two arches side by side, louvres across their lower half.
    const yaw = Math.atan2(nx, nz);
    for (const u of [-1.6, 1.6]) {
      const c = F(u, 4.2, 0);
      K.arch(S, c[0], c[2], yaw, { a: 1.25, pw: 0.35, hs: 4.4, top: 8.2, t: 0.8, y: by + 27.7, collide: false });
      for (const v of [0.5, 1.3, 2.1, 2.9]) K.quad('wood', F(u - 1.25, 4.5, 27.7 + v), F(u + 1.25, 4.5, 27.7 + v), F(u + 1.25, 3.95, 28.25 + v), F(u - 1.25, 3.95, 28.25 + v));
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
  K.box(G, x, by + 35.9, z, 5.05, 0.45, 5.05, 0, { collide: false });
  // The bells in their frame: bronze, a great one, two middling and a small, each under its headstock on the cage's beams.
  for (const s of [-1, 1]) { K.beam('wood', [x - 3.5, by + 33.6, z + s * 1.0], [x + 3.5, by + 33.6, z + s * 1.0], 0.28); K.beam('wood', [x + s * 1.0, by + 33.9, z - 3.5], [x + s * 1.0, by + 33.9, z + 3.5], 0.28); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.beam('wood', [x + sx * 2.9, by + 27.7, z + sz * 2.9], [x + sx * 1.0, by + 33.6, z + sz * 1.0], 0.2);
  for (const [sx, sz, D] of [[0, 1, 1.2], [0, -1, 1.0], [1, 0, 0.9], [-1, 0, 0.78]]) {
    const bx = x + sx * 2.15, bz = z + sz * 2.15;
    K.drum('fruit2', bx, by + 33.2 - D * 1.25, bz, D, D * 0.45, 12, { r2: D * 0.72, collide: false, open: true });
    K.drum('fruit2', bx, by + 33.2 - D * 0.8, bz, D * 0.72, D * 0.8, 12, { r2: D * 0.4, collide: false });
    K.drum('iron', bx, by + 33.2 - D * 1.45, bz, 0.09, D * 0.6, 5, { collide: false });
    K.box('wood', bx, by + 33.2, bz, sx ? 0.18 : D * 0.9, 0.36, sx ? D * 0.9 : 0.18, 0, { collide: false });
  }
  // The spire: copper on an eight-sided drum, a ball and a rod, his sunburst in gilt at the very top, looking four ways.
  K.drum('roof_2', x, by + 36.35, z, 4.35, 1.3, 8, { turn: Q / 2, collide: false, open: true });
  K.cone('roof_2', x, by + 37.6, z, 4.6, 14.8, 8, Q / 2);
  K.drum('fruit2', x, by + 52.0, z, 0.34, 0.6, 6, { r2: 0.2, collide: false }); K.box('fruit2', x, by + 52.5, z, 0.05, 1.9, 0.05, 0, { collide: false });
  K.sunburst('fruit2', x, by + 54.6, z, [0, 1], 0.95); K.sunburst('fruit2', x, by + 54.6, z, [1, 0], 0.95);
  // The door, in a block that stands out of the plinth's batter; a porch before it under its own little roof; five steps.
  const dy = by + 0.95;
  K.box(S, x, by - 1, z + 5.05, 2.05, 5.9, 0.47, 0, { collide: false });
  K.quad('door_4', [x - 1, dy, z + 5.54], [x + 1, dy, z + 5.54], [x + 1, dy + 2.9, z + 5.54], [x - 1, dy + 2.9, z + 5.54], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.box(G, x, by - 0.5, z + 6.2, 2.05, 1.45, 0.7, 0, { collide: false });
  K.deck([[x, z + 6.2, 1.2, 0.7, 0, dy]]);
  for (const s of [-1, 1]) K.box(S, x + s * 1.75, by - 0.5, z + 5.95, 0.3, 4.95, 0.45, 0);
  K.arch(S, x, z + 6.65, 0, { a: 1.2, pw: 0.55, hs: 2.3, top: 3.5, t: 0.5, y: dy });
  K.gable('roof_2', S, x, dy + 3.5, z + 6.0, 0.95, 2.05, 1.5, Math.PI / 2, 0.25);
  K.steps(G, x, z + 6.9, 0, 1.2, 5, { rise: 0.19, tread: 0.36, y: by });
  for (const s of [-1, 1]) { K.box(S, x + s * 1.47, by - 0.4, z + 7.8, 0.25, 1.0, 0.92, 0); K.wallLamp(x + s * 1.48, dy + 2.5, z + 6.92, [0, 1]); }
  K.sunburst('fruit2', x, by + 8.5, z + 4.64, [0, 1], 1.6);
  // The yard: a low wall of pale rubble, the gate on the south between two piers with a lantern by each.
  const W = 17, N = -14, So = 18;
  K.wall('pale:rubble', x - W, z + N, x + W, z + N, 0.7, 1.5); K.wall('pale:rubble', x + W, z + N, x + W, z + So, 0.7, 1.5); K.wall('pale:rubble', x - W, z + So, x - W, z + N, 0.7, 1.5);
  K.wall('pale:rubble', x - W, z + So, x - 2.6, z + So, 0.7, 1.5); K.wall('pale:rubble', x + 2.6, z + So, x + W, z + So, 0.7, 1.5);
  for (const s of [-1, 1]) {
    const gx = x + s * 2.45, gy = Y(gx, z + So);
    K.box(S, gx, gy - 0.5, z + So, 0.45, 3.2, 0.45, 0); K.cone(S, gx, gy + 2.7, z + So, 0.7, 0.8, 4, Q); K.drum('fruit2', gx, gy + 3.45, z + So, 0.16, 0.3, 5, { collide: false });
    K.lantern(x + s * 4.4, z + So + 1.2, 2.7, s > 0 ? Math.PI : 0);
  }
  K.paving('stone', x, z + 13.3, 8.5, 4.6);
  // The Bellwright's house against the east wall, his wood and his chopping block; the oil store under a lean-to on the
  // north wall; the well; a bench in the sun; the ladder up the west face; and the old first bell, cracked, on its baulks.
  K.house(x + 12.6, z + 4, 3.4, 2.6, 2.9, -Math.PI / 2, 'wall_12', 'roof_2', { chimney: -2.2, lamp: 1 });
  K.woodpile(x + 13.2, z + 9.6, 0, 1.7, 1.15, 0.5); K.stump(x + 10.4, z + 10.2, 0.32, 0.55);
  K.leanTo(x + 9, z - 12.4, 0, 2.6, 1.2, 2.4, 'roof_2');
  K.barrel(x + 7.6, z - 12.3); K.barrel(x + 8.5, z - 12.6); K.crate(x + 10.3, z - 12.4, 0.4, 0.2);
  K.well(x - 11, z + 9.5, 0.3, { roof: 'roof_2' });
  K.bench(x - 8, z + 14.6, 0.2);
  K.ladder(x - 8.3, z - 1.6, x - 4.72, by + 14.2, z - 1.6);
  K.box('wood', x - 10.5, by - 0.05, z - 8.2, 1.3, 0.3, 0.14, 0.3, { collide: false }); K.box('wood', x - 10.2, by - 0.05, z - 7.0, 1.3, 0.3, 0.14, 0.3, { collide: false });
  K.drum('fruit2', x - 10.35, by + 0.22, z - 7.6, 1.0, 0.5, 12, { r2: 0.74 }); K.drum('fruit2', x - 10.35, by + 0.72, z - 7.6, 0.74, 0.8, 12, { r2: 0.4, collide: false });
  // Out on the knoll: four watch-stones at the quarters between the winds, and the stumps of the old watch-posts between
  // them; lanterns up the path to the gate.
  for (let i = 0; i < 12; i++) {
    const a = (i + 0.5) / 12 * TAU, px = x + Math.cos(a) * 36, pz = z + Math.sin(a) * 36;
    if (i % 3 === 1) K.menhir(S, px, pz, 1.0, 4.6 + hash2(i, 3), -a, (hash2(i, 5) - 0.5) * 0.1);
    else K.drum('bark', px, Y(px, pz) - 0.4, pz, 0.28, 1.5 + hash2(i, 7) * 1.4, 6, { r2: 0.2 });
  }
  K.lantern(x + 2.8, z + 31, 2.7, Math.PI); K.lantern(x - 2.8, z + 44, 2.7, 0);
  K.spots.bellwright = [x + 2.8, by, z + 9.6, Math.PI];
  K.spots.hale = [x - 4, by, z + 9.6, Math.PI];
}

function fen(K) {
  for (const key of ['sallow', 'fenpool1', 'fenpool2']) {
    const w = WATERS.find((q) => q.key === key);
    K.disc('lake', w.x, waterLevel(w), w.z, w.r + 1, 48);
  }
  // Sallowmere: the east jetty, half gone into the water, a boat tied to it; and where the Fen Way comes down to the south
  // shore, the eel-fishers' huts on their legs, a landing you can walk out on, boats, racks of nets, a smoke-shed.
  const s = at('sallow'), wy = waterLevel(WATERS.find((q) => q.key === 'sallow'));
  for (let i = 0; i < 9; i++) {
    const x = s.x + 96 - i * 3, z = s.z + 10;
    if (i < 7) K.box('wood', x, wy + 0.25 - i * 0.05, z, 1.5, 0.12, 1.2, 0.02 * i, { collide: false });
    K.box('wood', x, wy - 1.5, z + 1.2, 0.12, 2, 0.12, 0, { collide: false });
    K.box('wood', x, wy - 1.5, z - 1.2, 0.12, 2 + (i % 3) * 0.5, 0.12, 0, { collide: false });
  }
  K.boat(s.x + 84, wy - 0.15, s.z + 13.2, 0.1, 4.4, { collide: false });
  const sh = (dx) => { let z = s.z + 80; while (z < s.z + 120 && Y(s.x + dx, z) < wy + 0.35) z += 0.5; return z; };   // (the south shore's edge at x)
  [[-34, 0.15, 'wall_17'], [-17, -0.1, 'wall_18'], [16, 0.1, 'wall_20'], [33, -0.2, 'wall_17']].forEach(([dx, yaw, wall], i) => {
    const x = s.x + dx, z = sh(dx) + 6 + (i % 2) * 2.5, y = Math.max(Y(x, z), wy) + 1.1;
    for (const [px, pz] of [[-2.6, -2], [2.6, -2], [2.6, 2], [-2.6, 2]]) K.box('bark', x + px, Y(x + px, z + pz) - 0.6, z + pz, 0.13, y - Y(x + px, z + pz) + 0.9, 0.13, yaw, { collide: false });
    K.house(x, z, 3.1, 2.5, 2.4, yaw + Math.PI, wall, 'roof_4', { y: y + 0.3, rise: 2.2, door: 'door_3' });
    K.box('wood', x, y - 0.12, z, 3.5, 0.14, 2.9, yaw, { collide: false });
    K.ladder(x + 1.6, z - 4.1, x + 1.6, y, z - 2.9, 0.55);
    if (i % 2) K.rack(x + 5.5, z + 0.5, 1.3, 1.5); else K.barrel(x - 4.2, z + 1.2);
  });
  { const z0 = sh(0);
    K.bridge(s.x, z0 + 1.5, s.x, z0 - 17, 1.2, { up: 0.35 });
    K.boat(s.x + 3.2, wy - 0.15, z0 - 11, Math.PI / 2 + 0.1, 4.2, { collide: false }); K.boat(s.x - 3.4, wy - 0.15, z0 - 6, -Math.PI / 2, 3.8, { collide: false });
    K.boat(s.x + 8, Y(s.x + 8, z0 + 3) + 0.5, z0 + 3, 0.5, 4, { roll: 0, layer: 'wood' });
    K.leanTo(s.x - 9, z0 + 16, Math.PI, 2.2, 1.6, 2.4, 'roof_4'); K.rack(s.x - 9, z0 + 13.2, Math.PI, 1.6, 'cloth_oat', 1.6);
    K.rack(s.x + 9.5, z0 + 9, 0.3, 2, 'cloth_oat', 2); K.rack(s.x + 11, z0 + 12, 0.2, 2, 'cloth_oat', 2);
    K.lantern(s.x + 2.4, z0 + 3.5, 2.7, Math.PI); K.lantern(s.x - 2.6, z0 + 22, 2.7, 0);
    K.goods(s.x - 6, z0 + 6.5, 5, 1.5); K.hayrick(s.x + 16, z0 + 17, 1.1, 1.7); K.hayrick(s.x + 18.4, z0 + 16, 0.9, 1.4);
    K.campfire(s.x + 6, z0 + 14.5, true); K.bench(s.x + 6, z0 + 16.6, 0);
    K.spots.sallow_landing = [s.x - 3.6, Y(s.x - 3.6, z0 + 9), z0 + 9, Math.PI]; }
  // The Drowned Chapel: Tessariel's, roofless, its west end sunk in the mire; the T still on its gable, his sunburst under
  // it. Lancets down its sides between buttresses, the chancel arch still standing inside, its dead under pale slabs.
  const c = at('chapel'), cy = Y(c.x, c.z), lanc = (us, y0 = 2.2, y1 = 5) => us.map((u) => ({ u, w: 0.6, y0, y1, round: true }));
  K.pierced('rubble', c.x, c.z - 6, 0, 12, 7.4, 1, lanc([-8, -4, 0, 4, 8]), { ruin: true, y: cy });
  K.pierced('rubble', c.x, c.z + 6, 0, 12, 7.4, 1, lanc([-8, -4, 0, 4, 8]), { ruin: true, y: cy });
  K.pierced('rubble', c.x + 12, c.z, Math.PI / 2, 6.5, 9, 1, lanc([-2.2, 0, 2.2], 3, 6.2), { y: cy });
  K.tri('rubble', [c.x + 12.5, cy + 9, c.z - 6.5], [c.x + 12.5, cy + 9, c.z + 6.5], [c.x + 12.5, cy + 13.2, c.z]); K.tri('rubble', [c.x + 11.5, cy + 9, c.z - 6.5], [c.x + 11.5, cy + 9, c.z + 6.5], [c.x + 11.5, cy + 13.2, c.z]);
  K.pierced('rubble', c.x - 12, c.z, Math.PI / 2, 6.5, 5, 1, [{ u: 0, w: 1.3, y0: 0, y1: 2.6, round: true }], { ruin: true, y: cy });
  for (const u of [-10, -6, -2, 2, 6, 10]) for (const sd of [-1, 1]) K.box('rubble', c.x + u, cy - 0.5, c.z + sd * 6.9, 0.45, 3.6 + hash2(u, sd) * 2.4, 0.5, 0, { collide: false });
  K.arch('rubble', c.x + 5, c.z, Math.PI / 2, { a: 2.6, pw: 0.9, hs: 3.4, t: 0.9, ring: 0.6, y: cy, broken: 0.75 });
  K.box('pale:stone', c.x + 12.62, cy + 11.6, c.z, 0.2, 0.5, 1.5, 0, { collide: false });
  K.box('pale:stone', c.x + 12.62, cy + 9.3, c.z, 0.2, 2.4, 0.42, 0, { collide: false });
  K.sunburst('fruit2', c.x + 12.56, cy + 7.9, c.z, [1, 0], 0.9);
  K.disc('lake', c.x - 4, cy + 0.15, c.z, 7, 20);
  K.box('pale:stone', c.x + 9, cy - 0.2, c.z, 0.9, 1.25, 1.6, 0); K.box('pale:stone', c.x + 9, cy + 1.05, c.z, 1.05, 0.14, 1.8, 0, { collide: false });
  for (const [dx, dz, r, a] of [[-14.5, 3, 1.1, 0.4], [-9, -8.6, 0.9, 1.2], [3, 8.4, 1.0, 2.1], [-3, -1.5, 0.8, 0.3], [-15, -4, 0.7, 2.6]]) K.box('rubble', c.x + dx, Y(c.x + dx, c.z + dz) - 0.3, c.z + dz, r, 0.7, r * 0.6, a);
  K.graves(c.x + 4, c.z - 15, 0.1, 9, 3, 'pale:stone', 2.6);
  K.steps('rubble', c.x + 4, c.z + 22.5, 0, 0, 0);
  K.paving('wood', c.x - 18.5, c.z + 0.5, 4.5, 0.8, 0.15, 0.12);
  K.spots.chapel_door = [c.x - 17, Y(c.x - 17, c.z + 3.5), c.z + 3.5, -Math.PI / 2];
  // The Sunken Mile: the old pale causeway into the fen, most of its slabs under the mire or tipped, its piers broken off,
  // one arch of its bridge left, the waymark down in the reeds. (The path follows what's left of it.)
  const sm = at('causeway');
  for (let i = -8; i <= 8; i++) {
    const x = sm.x + i * 6.4 + hash2(i, 31) * 1.5, k = hash2(i, 33), off = k < 0.35 ? 0 : (k - 0.5) * 9, z = sm.z + off, y = Y(x, z);
    // (On the way, a slab lies flat and you walk over it; off it, they've tipped and sunk.)
    if (off === 0) K.paving('pale:stone', x, z, 2.7, 1.9, hash2(i, 35) * 0.2 - 0.1, 0.07);
    else { const P = K.frame(x, z, k * 3), q = (u, w, v) => { const [px, pz] = P(u, w); return [px, y + v, pz]; }; K.quad('pale:stone', q(-2.6, -1.8, -0.3), q(-2.6, 1.8, -0.3), q(2.6, 1.8, 0.9 * k), q(2.6, -1.8, 0.9 * k)); K.collide(x, z, 1.4, 1.2, k * 3, y + 0.5); }
    if (i % 2) for (const sd of [-1, 1]) { const pz = sm.z + sd * (4.2 + hash2(i, sd + 40)), h = 0.8 + hash2(i * 3, sd + 7) * 2.6; K.drum('pale:stone', x + 1.5, Y(x + 1.5, pz) - 0.6, pz, 0.75, h + 0.6, 7, { r2: 0.62, turn: i }); }
  }
  K.arch('pale:stone', sm.x - 22, sm.z + 9.5, 0.2 + Math.PI / 2, { a: 2.4, pw: 1.3, hs: 1.6, t: 2.2, ring: 0.7, broken: 1 });
  K.arch('pale:stone', sm.x - 22.8, sm.z + 17.5, 0.2 + Math.PI / 2, { a: 2.4, pw: 1.3, hs: 1.6, t: 2.2, ring: 0.7, broken: 0.38 });
  // (The waymark: a needle of pale stone, down, in two pieces, by the foot it stood on.)
  K.box('pale:stone', sm.x + 14, Y(sm.x + 14, sm.z - 8) - 0.4, sm.z - 8, 1.3, 1.3, 1.3, 0.3);
  K.box('pale:stone', sm.x + 19.5, Y(sm.x + 19.5, sm.z - 9.5) - 0.35, sm.z - 9.5, 3.4, 0.9, 0.5, 0.25); K.box('pale:stone', sm.x + 25.6, Y(sm.x + 25.6, sm.z - 11.6) - 0.5, sm.z - 11.6, 1.9, 0.8, 0.42, 0.5);
  for (const [dx, dz, r] of [[-12, -10, 6], [8, 11, 7.5], [31, 6, 5], [-34, -6, 6.5]]) { let lo = 1e9; for (let a = 0; a < 6; a++) lo = Math.min(lo, Y(sm.x + dx + Math.cos(a) * r * 0.6, sm.z + dz + Math.sin(a) * r * 0.6)); K.disc('lake', sm.x + dx, lo + 0.1, sm.z + dz, r, 14); }
  K.boat(sm.x + 6, Y(sm.x + 6, sm.z + 9) - 0.1, sm.z + 9, 2.2, 3.6, { roll: 0.3, collide: false });
  K.spots.causeway_mark = [sm.x + 12, Y(sm.x + 12, sm.z - 3.5), sm.z - 3.5, 0];
}

function rustwood(K) {
  // The Abbey of Saint Ossery, Tessariel's: the nave's walls standing with their windows empty, its roof fallen in, the
  // east gable whole with his sunburst over three lancets, a bell-cote on the west gable over the door; the cloister's
  // arcade round its garth on the north, the brothers' graves on the south, and what's left of the precinct wall and gate.
  const a = at('abbey'), ay = Y(a.x, a.z);
  const L = 22, Wd = 8, win = (us, y0, y1, w = 0.9) => us.map((u) => ({ u, w, y0, y1, round: true }));
  K.pierced('stone', a.x, a.z - Wd, 0, L, 11, 1.4, win([-16, -8, 0, 8, 16], 3, 7.2), { ruin: true, y: ay });
  K.pierced('stone', a.x, a.z + Wd, 0, L, 11, 1.4, win([-16, -8, 0, 8, 16], 3, 7.2), { y: ay });
  K.pierced('stone', a.x + L, a.z, Math.PI / 2, Wd + 0.7, 13, 1.4, win([-3.2, 0, 3.2], 3.4, 8.6, 0.8), { y: ay });
  K.tri('stone', [a.x + L + 0.7, ay + 13, a.z - Wd - 0.7], [a.x + L + 0.7, ay + 13, a.z + Wd + 0.7], [a.x + L + 0.7, ay + 19, a.z]); K.tri('stone', [a.x + L - 0.7, ay + 13, a.z - Wd - 0.7], [a.x + L - 0.7, ay + 13, a.z + Wd + 0.7], [a.x + L - 0.7, ay + 19, a.z]);
  K.pierced('stone', a.x - L, a.z, Math.PI / 2, Wd + 0.7, 14, 1.4, [{ u: 0, w: 1.9, y0: 0, y1: 3.6, round: true }, { u: 0, w: 1.3, y0: 7.6, y1: 9.6, round: true }].slice(0, 1), { y: ay });
  for (let i = -2; i <= 2; i++) for (const sd of [-1, 1]) {
    if (sd < 0 && i === -1) continue;
    const bx = a.x + i * 8 + 4 * (i < 2 ? 1 : -3), bz = a.z + sd * (Wd + 1.15);
    K.box('stone', bx, ay - 0.3, bz, 0.8, 7.6, 0.75, 0, { collide: false }); K.box('stone', bx, ay + 7.3, a.z + sd * (Wd + 0.95), 0.65, 3.2, 0.5, 0, { collide: false });
  }
  for (let i = 0; i < 6; i++) { const x = a.x + 6 - i * 4.4; K.box('roof_3', x, ay + 0.2 + (i % 2) * 0.7, a.z - 2 + (i % 3) * 1.6, 2.4, 0.3, 3, 0.3 * i, { collide: false }); }
  for (let i = 0; i < 4; i++) K.beam('dark:wood', [a.x - 14 + i * 9, ay + 0.3, a.z - 5 + (i % 2) * 6], [a.x - 9 + i * 9, ay + 3.2 + (i % 2) * 2.5, a.z + 5.5 - (i % 2) * 9], 0.35);
  // (The pillars of the nave: three pairs still up, the rest in drums on the floor.)
  for (const [u, hh] of [[-12, 6], [-4, 3.2], [4, 6], [12, 1.4]]) for (const sd of [-1, 1]) { K.drum('stone', a.x + u, ay - 0.3, a.z + sd * 4.2, 0.6, hh * (sd > 0 ? 1 : 0.7) + 0.3, 8); }
  for (const [dx, dz, t] of [[-6.5, 2.5, 0.4], [1.5, -1.6, 1.3], [9.5, 1.2, 2.2]]) K.drum('stone', a.x + dx, ay - 0.1, a.z + dz, 0.6, 0.9, 8, { turn: t });
  K.box('pale:stone', a.x + 17.5, ay - 0.2, a.z, 1.0, 1.3, 2.0, 0); K.box('pale:stone', a.x + 17.5, ay + 1.1, a.z, 1.15, 0.15, 2.2, 0, { collide: false });
  K.steps('stone', a.x + 15, a.z, -Math.PI / 2, 4, 0);
  K.sunburst('fruit2', a.x + L + 0.72, ay + 15.2, a.z, [1, 0], 1.7);
  K.sunburst('fruit2', a.x - L - 0.72, ay + 6.6, a.z, [-1, 0], 1.1);
  // The bell-cote over the west door (Orrin asks after it): two piers, a lintel, a small bell, a little gable.
  for (const s of [-1, 1]) K.box('stone', a.x - L, ay + 14, a.z + s * 1.6, 0.6, 5, 0.6, 0, { collide: false });
  K.box('stone', a.x - L, ay + 19, a.z, 0.7, 0.6, 2.3, 0, { collide: false });
  K.gable('roof_3', 'stone', a.x - L, ay + 19.6, a.z, 2.3, 0.7, 1.3, Math.PI / 2, 0.2);
  K.drum('fruit2', a.x - L, ay + 16.2, a.z, 0.75, 0.9, 12, { r2: 0.32, collide: false });
  // The cloister: an arcade down two sides of the garth, a well in the grass, the walk's roof gone.
  const cz = a.z - Wd - 14;
  for (let i = 0; i < 7; i++) K.arch('stone', a.x - 19 + i * 5.2, cz, 0, { a: 1.9, pw: 0.7, hs: 2.5, t: 0.7, ring: 0.45, y: ay, broken: i === 4 ? 0.4 : i === 5 ? 0 : 1, n: 6 });
  for (let i = 0; i < 2; i++) K.arch('stone', a.x - 22, cz + 3.4 + i * 5.2, Math.PI / 2, { a: 1.9, pw: 0.7, hs: 2.5, t: 0.7, ring: 0.45, y: ay, n: 6 });
  K.wall('stone', a.x + 16, cz, a.x + 16, a.z - Wd, 0.9, 4.5, { ruin: true });
  K.well(a.x - 5, cz + 7, 0, { roof: false });
  K.paving('stone', a.x - 3, cz + 2.4, 17, 1.3);
  // The graves, the precinct's wall and its gate to the road, the lay brothers' shed with what they left.
  K.graves(a.x + 2, a.z + Wd + 13, 0, 12, 3.2, 'pale:stone', 2.5);
  K.wall('rubble', a.x - 46, a.z + 30, a.x - 14, a.z + 34, 0.9, 2.6, { ruin: true }); K.wall('rubble', a.x - 46, a.z + 30, a.x - 48, a.z - 6, 0.9, 2.6, { ruin: true });
  K.wall('rubble', a.x + 4, a.z + 35, a.x + 30, a.z + 33, 0.9, 2.6, { ruin: true });
  K.arch('stone', a.x - 5, a.z + 35, 0.05, { a: 2.2, pw: 1.1, hs: 2.8, t: 1.1, top: 6, y: Y(a.x - 5, a.z + 35) });
  K.sunburst('fruit2', a.x - 5, Y(a.x - 5, a.z + 35) + 5.25, a.z + 35.6, [0, 1], 0.55);
  K.leanTo(a.x - 30, a.z + 12.4, Math.PI, 3, 1.6, 2.6, 'roof_3'); K.goods(a.x - 31, a.z + 15.5, 4, 1.3); K.cart(a.x - 36, a.z + 20, 0.6, { wreck: true });
  for (const [dx, dz, r, t] of [[-27, 2.5, 1.2, 0.3], [-25.5, -4, 0.9, 1.1], [8, -12, 1.1, 2], [26, 5, 1.3, 0.7], [24.8, -6, 0.8, 1.9], [-12, 12, 0.9, 2.7]]) K.box('stone', a.x + dx, Y(a.x + dx, a.z + dz) - 0.3, a.z + dz, r, 0.8, r * 0.65, t);
  K.spots.abbey_door = [a.x - L - 5, Y(a.x - L - 5, a.z + 3), a.z + 3, -Math.PI / 2];
  // The Fungal Ring: caps the height of a man in a ring, a great one fallen across its middle, their young in clumps, and
  // the camp of somebody who came to look at them and didn't stay.
  const f = at('fungus');
  const cap = (x, z, h, big = true) => {
    const y = Y(x, z);
    K.drum('cloth_oat', x, y - 0.2, z, 0.35 + h * 0.08, h, big ? 8 : 5, { r2: 0.25 + h * 0.06, collide: big });
    K.drum('fruit', x, y + h - 0.2, z, 1 + h * 0.45, 0.35, big ? 12 : 7, { r2: 0.8 + h * 0.4, collide: false });
    K.cone('fruit', x, y + h + 0.15, z, 0.8 + h * 0.4, 0.5 + h * 0.18, big ? 12 : 7);
  };
  for (let i = 0; i < 13; i++) { const t = i / 13 * TAU, r = 22 + hash2(i, 9) * 4; cap(f.x + Math.cos(t) * r, f.z + Math.sin(t) * r, 1.5 + hash2(i, 11) * 2.5); }
  for (let i = 0; i < 26; i++) { const t = hash2(i, 51) * TAU, r = 6 + hash2(i, 52) * 26; cap(f.x + Math.cos(t) * r, f.z + Math.sin(t) * r, 0.25 + hash2(i, 53) * 0.7, false); }
  cap(f.x - 3, f.z + 2, 6.5);
  { const y = Y(f.x + 6, f.z - 4); K.beam('cloth_oat', [f.x + 3, y + 0.5, f.z - 7], [f.x + 12, y + 0.7, f.z - 1], 1.1); K.drum('fruit', f.x + 12.6, y - 0.6, f.z - 0.6, 2.8, 2.6, 9, { r2: 2.0, turn: 1 }); K.collide(f.x + 7.5, f.z - 4, 4.8, 0.6, -0.59, y + 1); }
  K.tent(f.x - 12, f.z - 9, 0.5, 1.5, 1.2, 1.5); K.campfire(f.x - 9, f.z - 6.5, false); K.crate(f.x - 13.5, f.z - 6, 0.35, 0.2); K.rack(f.x - 8, f.z - 11, 1.2, 1.1, 'cloth_oat', 1.4);
  K.spots.fungus_camp = [f.x - 7, Y(f.x - 7, f.z - 4), f.z - 4, 0.8];
  // The Woodcutters' Camp: two cabins and the mess lean-to, the sawpit under its trestle, stacks of sawn logs, the stumps
  // of what they've felled, a loaded cart, the fire and its benches.
  const w = at('cutters'), wy = Y(w.x, w.z);
  K.house(w.x - 9, w.z - 9, 4, 3, 2.7, 0.3, 'wood', 'roof_1', { door: 'door_3', chimney: 2.6 });
  K.house(w.x + 4, w.z - 12, 3.6, 2.8, 2.6, -0.15, 'wood', 'roof_3', { door: 'door_3' });
  K.leanTo(w.x - 13, w.z + 2, Math.PI / 2 + 0.2, 3.4, 2, 2.6, 'roof_1'); K.table(w.x - 12.6, w.z + 2, 0.2, 1.2); K.bench(w.x - 11.2, w.z + 2.2, 0.2 + Math.PI / 2, 1.1);
  for (let s = 0; s < 4; s++) K.woodpile(w.x + 9 + (s % 2) * 3.4, w.z + 2 + Math.floor(s / 2) * 6.5, 0.05 * s, 0.9 + (s % 2) * 0.3, 0.9 + hash2(s, 3) * 0.7, 2.6);
  // (The pit: a dark slot in the ground, a log across the trestle over it, the long saw standing in the cut.)
  K.paving('water', w.x - 1, w.z + 9, 3, 0.8, 0.1, 0.06);
  for (const u of [-2.6, 2.6]) { const P = K.frame(w.x - 1, w.z + 9, 0.1), [ax, az] = P(u, -1.3), [bx, bz] = P(u, 1.3); K.beam('wood', [ax, wy + 0.9, az], [bx, wy + 0.9, bz], 0.16); for (const [px, pz] of [[ax, az], [bx, bz]]) K.box('wood', px, wy - 0.2, pz, 0.09, 1.1, 0.09, 0.1); }
  K.beam('bark', [w.x - 4.4, wy + 1.25, w.z + 9.35], [w.x + 2.4, wy + 1.25, w.z + 8.65], 0.55); K.box('iron', w.x - 0.4, wy + 0.2, w.z + 9, 0.02, 2.2, 0.09, 0.1, { collide: false });
  K.collide(w.x - 1, w.z + 9, 3.4, 1.4, 0.1, wy + 1.3);
  for (let i = 0; i < 16; i++) { const t = hash2(i, 61) * TAU, r = 20 + hash2(i, 62) * 22, x = w.x + Math.cos(t) * r, z = w.z + Math.sin(t) * r; K.stump(x, z, 0.3 + hash2(i, 63) * 0.25, 0.35 + hash2(i, 64) * 0.4); }
  K.cart(w.x + 2, w.z + 17, 0.4, { load: 'bark', len: 1.8 }); K.campfire(w.x - 3, w.z - 1.5, true);
  K.bench(w.x - 3, w.z - 3.6, 0); K.bench(w.x - 5.2, w.z - 1.2, Math.PI / 2); K.stump(w.x - 0.6, w.z - 0.4, 0.34, 0.5);
  K.rack(w.x + 9.5, w.z - 8.5, 1.3, 1.2, null, 1.5); K.goods(w.x - 5, w.z - 12.5, 4, 1.2); K.lantern(w.x - 6.4, w.z - 5.6, 2.6, 1);
  K.spots.cutters_fire = [w.x - 0.5, wy, w.z - 3.4, -0.9];
}

function ashen(K) {
  // The Caravanserai of Khel: a square court behind blind walls with a tower at each corner, a gate between two more under
  // an arch, an arcade round the inside shaded with awnings, the well, the traders' stalls and carts, and the late comers'
  // tents outside the walls. (Plain folk's: nobody's colours on it.)
  const k = at('khel'), H = 30, ky = Y(k.x, k.z);
  K.wall('rubble', k.x - H, k.z - H, k.x + H, k.z - H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x + H, k.z - H, k.x + H, k.z + H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x + H, k.z + H, k.x + 4, k.z + H, 1.6, 7, { crenel: true }); K.wall('rubble', k.x - 4, k.z + H, k.x - H, k.z + H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x - H, k.z + H, k.x - H, k.z - H, 1.6, 7, { crenel: true });
  for (const sx of [-1, 1]) K.tower('rubble', k.x + sx * 6.6, k.z + H, 3, 11, null);
  K.arch('rubble', k.x, k.z + H, 0, { a: 2.9, pw: 0.8, hs: 3.6, top: 8.6, t: 2.2, y: ky, n: 8 });
  for (let i = -2; i <= 2; i++) K.box('rubble', k.x + i * 1.5, ky + 8.6, k.z + H + 0.7, 0.45, 1, 0.4, 0, { collide: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.tower('rubble', k.x + sx * H, k.z + sz * H, 3.4, 9, null);
  for (let i = 0; i < 10; i++) {
    const t = -H + 6 + i * (2 * H - 12) / 9;
    for (const [x, z] of [[k.x + t, k.z - H + 6], [k.x - H + 6, k.z + t], [k.x + H - 6, k.z + t]]) K.drum('stone', x, Y(x, z) - 0.2, z, 0.5, 4.2, 8);
  }
  // (The awnings: cloth from the wall down to the pillars' heads, bay by bay, a few gone.)
  for (let i = 0; i < 9; i++) {
    const t0 = -H + 6 + i * (2 * H - 12) / 9, t1 = t0 + (2 * H - 12) / 9, c = i % 4 === 1 ? 'wall_13' : 'cloth_oat';
    if (i !== 3) K.quad(c, [k.x + t0, ky + 5.2, k.z - H + 0.9], [k.x + t1, ky + 5.2, k.z - H + 0.9], [k.x + t1, ky + 4.05, k.z - H + 6.4], [k.x + t0, ky + 4.05, k.z - H + 6.4], null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (i !== 6) K.quad(c, [k.x - H + 0.9, ky + 5.2, k.z + t1], [k.x - H + 0.9, ky + 5.2, k.z + t0], [k.x - H + 6.4, ky + 4.05, k.z + t0], [k.x - H + 6.4, ky + 4.05, k.z + t1], null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (i !== 1) K.quad(c, [k.x + H - 0.9, ky + 5.2, k.z + t0], [k.x + H - 0.9, ky + 5.2, k.z + t1], [k.x + H - 6.4, ky + 4.05, k.z + t1], [k.x + H - 6.4, ky + 4.05, k.z + t0], null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  K.well(k.x, k.z, 0.2, { stone: 'stone', roof: 'roof_1' }); K.trough(k.x + 3.4, k.z + 1.5, 0.2, 1.4); K.trough(k.x - 3.4, k.z - 1.5, 0.2, 1.4);
  for (const [dx, dz, yaw, c, s] of [[-14, 8, Math.PI / 2, 'cloth_oat', 0], [-14, -4, Math.PI / 2, 'wall_13', 1], [14, -6, -Math.PI / 2, 'cloth_oat', 2], [12, 12, -Math.PI / 2 - 0.3, 'wall_13', 3], [0, -15, 0, 'cloth_oat', 1]]) K.stall(k.x + dx, k.z + dz, yaw, c, s);
  K.cart(k.x + 17, k.z + 20, 0.4, { load: 'cloth_oat' }); K.cart(k.x - 19, k.z + 19, 2.6, { load: 'wood' }); K.cart(k.x + 20, k.z - 19, 1.2);
  K.goods(k.x - 21, k.z - 20, 7, 2.2); K.goods(k.x + 22, k.z + 3, 5, 1.6); K.goods(k.x - 22, k.z + 1, 4, 1.4);
  for (const [dx, dz] of [[-8, 22], [8, 22], [-8, -8], [8, -8]]) K.lantern(k.x + dx, k.z + dz, 3, dx > 0 ? Math.PI : 0);
  K.pavilion(k.x + 6, k.z + 14, 2.3, 3.4, 'cloth_oat', 'wall_13');
  for (const sx of [-1, 1]) K.banner(k.x + sx * 6.6, k.z + H, 5, 0, 'cloth_oat', { y: ky + 11, w: 1.1, len: 3.4, collide: false });
  // (Outside: a late caravan's camp against the east wall, a picket line, their fire.)
  K.tent(k.x + 42, k.z + 10, 0.3, 2, 1.5, 1.9); K.tent(k.x + 44, k.z + 18, -0.4, 1.8, 1.4, 1.8, 'wall_13'); K.pavilion(k.x + 40, k.z - 2, 2.1, 3.2);
  K.campfire(k.x + 39, k.z + 14, true); K.rack(k.x + 48, k.z + 4, 1.4, 3, null, 1.3); K.cart(k.x + 37, k.z + 24, 2.9, { load: 'cloth_oat' }); K.goods(k.x + 46, k.z + 12, 4, 1.3);
  K.spots.khel_court = [k.x + 5, ky, k.z + 6, Math.PI];
  // The Bone Field: the ribs of something enormous coming up out of the ash, its spine between them, the skull at their
  // east end with its horn. Velscour's: his red on poles down both sides, a black slab between two fires where it's fed.
  const b = at('bones');
  for (let r = 0; r < 9; r++) {
    for (const side of [-1, 1]) {
      const x0 = b.x - 24 + r * 6, z0 = b.z;
      for (let s = 0; s < 6; s++) {
        const u = s / 6, v = (s + 1) / 6, ang = (q) => q * 1.9;
        const P = (q) => [x0 + Math.sin(q * 0.4) * 0.6, Y(x0, z0) - 1 + Math.sin(ang(q)) * 14 * (1 - r * 0.05), z0 + side * (1 - Math.cos(ang(q))) * 9];
        K.beam('pale:stone', P(u), P(v), 0.75 - s * 0.08, 0.55 - s * 0.05);
      }
      K.collide(x0, b.z + side * 9, 0.5, 0.5, 0, Y(x0, b.z) + 3);
    }
    K.drum('pale:stone', b.x - 24 + r * 6, Y(b.x - 24 + r * 6, b.z) - 0.9, b.z, 1.5, 1.9, 7, { r2: 1.1, turn: r });
  }
  // (The skull: the brow, the long jaw laid on the ash, two pits for its eyes, the horn.)
  { const sx = b.x + 34, sy = Y(sx, b.z);
    K.rock('pale:stone', sx, b.z, 6.5, 5.2, { y: sy - 1.6, turn: 0.3 }); K.rock('pale:stone', sx + 7.5, b.z, 3.6, 2.2, { y: sy - 0.9, turn: 1.1, sx: 1.7 });
    for (const sd of [-1, 1]) { K.disc('obsidian', sx + 3.2, sy + 2.6, b.z + sd * 2.6, 0.01, 3); const e = [sx + 4.9, sy + 2.3, b.z + sd * 2.7]; for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU, a1 = (i + 1) / 6 * TAU; K.tri('obsidian', e, [e[0] - 0.5, e[1] + Math.cos(a0) * 1.0, e[2] + Math.sin(a0) * 1.1], [e[0] - 0.5, e[1] + Math.cos(a1) * 1.0, e[2] + Math.sin(a1) * 1.1]); } }
    K.spike('pale:stone', sx - 1, sy + 2.5, b.z, 1.9, 9, 6, 0.3, [-0.35, 0.1]); }
  for (let i = 0; i < 6; i++) { const x = b.x - 30 + i * 13, sd = i % 2 ? 1 : -1, z = b.z + sd * 15; K.banner(x, z, 5.5, sd > 0 ? 0.4 : 2.6, 'cloth_red', { pole: 'dark:wood', len: 2.6 }); }
  K.box('dark:stone', b.x - 36, Y(b.x - 36, b.z) - 0.4, b.z, 1.6, 1.3, 2.6, 0.1); K.brazier(b.x - 36, b.z + 5, 1.4); K.brazier(b.x - 36, b.z - 5, 1.4);
  for (let i = 0; i < 9; i++) { const t = hash2(i, 71) * TAU, r = 16 + hash2(i, 72) * 30, x = b.x + Math.cos(t) * r * 1.3, z = b.z + Math.sin(t) * r; if (Math.abs(z - b.z) < 11) continue; K.heap('pale:rubble', x, z, 1 + hash2(i, 73), 0.6 + hash2(i, 74) * 0.5, 6, { collide: false }); K.beam('pale:stone', [x + 1, Y(x + 1, z) + 0.2, z - 1.5], [x - 0.6, Y(x, z) + 0.9, z + 1.6], 0.22); }
  // The Black Obelisks: seven needles of his black stone, one fallen, on a ring of black paving round the stepped slab; his
  // red down two of them, iron from their heads to the slab, braziers that never go out, glass teeth come up outside the ring.
  const o = at('obelisks'), oy = Y(o.x, o.z);
  K.ringPaving('dark:stone', o.x, o.z, 4.6, 24.5, 20);
  for (let i = 0; i < 7; i++) {
    const t = i / 7 * TAU, x = o.x + Math.cos(t) * 20, z = o.z + Math.sin(t) * 20, hh = 16 + hash2(i, 2) * 6;
    if (i === 4) { K.box('dark:stone', x, Y(x, z) - 0.4, z, 9, 1.6, 1.4, t); K.box('dark:stone', x - Math.sin(t) * 0, Y(x, z) - 0.6, z, 1.9, 2.6, 1.9, -t); continue; }
    K.box('dark:stone', x, Y(x, z) - 0.4, z, 2.1, 1.3, 2.1, -t);
    K.menhir('dark:stone', x, z, 1.5, hh, -t, 0);
    K.cone('dark:stone', x, Y(x, z) + hh - 0.6, z, 1.1, 2.5, 4, t);
    if (i % 3 === 0) K.hanging('cloth_red', x - Math.cos(t) * 1.25, Y(x, z) + hh * 0.72, z - Math.sin(t) * 1.25, [-Math.cos(t), -Math.sin(t)], 1.3, hh * 0.4, 3);
    if (i % 2) K.beam('iron', [x - Math.cos(t) * 0.8, Y(x, z) + hh * 0.8, z - Math.sin(t) * 0.8], [o.x + Math.cos(t) * 2, oy + 1.9, o.z + Math.sin(t) * 2], 0.09);
  }
  K.box('dark:stone', o.x, oy - 0.5, o.z, 4.4, 1.0, 4.4, 0.4); K.box('dark:stone', o.x, oy + 0.5, o.z, 3, 0.9, 3, 0.4, { collide: false });
  for (let i = 0; i < 4; i++) { const t = 0.4 + i * Math.PI / 2 + Math.PI / 4; K.brazier(o.x + Math.cos(t) * 7.5, o.z + Math.sin(t) * 7.5, 1.4); }
  for (let i = 0; i < 14; i++) { const t = hash2(i, 81) * TAU, r = 28 + hash2(i, 82) * 16, x = o.x + Math.cos(t) * r, z = o.z + Math.sin(t) * r; K.spike('obsidian', x, Y(x, z) - 0.5, z, 0.5 + hash2(i, 83) * 0.7, 2 + hash2(i, 84) * 4.5, 5, t, [(hash2(i, 85) - 0.5) * 0.4, (hash2(i, 86) - 0.5) * 0.4]); }
  // The Charred Mill, alone in the Waste: a post mill burnt where it stood. Its trestle and the black ribs of its body, the
  // stocks of two sails, the stones fallen through; a ring of ash round it; the miller's house a shell, his cart with it.
  const cm = at('charmill'), my = Y(cm.x, cm.z), C = 'dark:wood';
  K.ringPaving('dark:rubble', cm.x, cm.z, 0, 13, 18, 0.05); K.ringPaving('pale:rubble', cm.x, cm.z, 0, 7.5, 14, 0.08);
  K.drum(C, cm.x, my - 0.4, cm.z, 0.5, 6.4, 7);
  for (let i = 0; i < 4; i++) { const t = 0.3 + i * Math.PI / 2, c = Math.cos(t), s = Math.sin(t); K.beam(C, [cm.x - c * 0.2, my + 0.25, cm.z - s * 0.2], [cm.x + c * 4.2, my + 0.25, cm.z + s * 4.2], 0.36); K.beam(C, [cm.x + c * 3.8, my + 0.4, cm.z + s * 3.8], [cm.x + c * 0.3, my + 4.2, cm.z + s * 0.3], 0.3); K.box('rubble', cm.x + c * 4.1, my - 0.3, cm.z + s * 4.1, 0.6, 0.5, 0.6, -t); }
  { const P = K.frame(cm.x, cm.z, 0.3), V = (u, v, w) => { const [px, pz] = P(u, w); return [px, my + v, pz]; }, hx = 2.3, hz = 2.9;
    K.box(C, cm.x, my + 5.2, cm.z, hx, 0.28, hz, 0.3, { collide: false });
    for (const [u, w, hh] of [[-hx, -hz, 6.8], [hx, -hz, 4.4], [hx, hz, 7.4], [-hx, hz, 3.1], [0, -hz, 5.6], [0, hz, 7.9], [-hx, 0, 5.2], [hx, 0, 2.6]]) K.beam(C, V(u, 5.4, w), V(u * 0.97, 5.4 + hh, w * 0.97), 0.26);
    K.beam(C, V(-hx, 9.2, -hz), V(0, 10.6, -hz), 0.2); K.beam(C, V(-hx, 8.2, 0), V(-hx, 9.6, -hz), 0.2); K.beam(C, V(0, 12.6, hz), V(hx, 12.2, hz), 0.2);
    K.quad(C, V(-hx, 5.4, hz), V(0, 5.4, hz), V(0, 9.4, hz), V(-hx, 7.6, hz)); K.quad(C, V(hx, 5.4, -hz), V(hx, 5.4, 0), V(hx, 7.6, 0), V(hx, 8.8, -hz));
    // (The windshaft still through the head of it, two stocks of the sails on it, the others on the ground.)
    K.beam(C, V(0, 11.2, hz - 1.5), V(0, 11.9, hz + 1.9), 0.42); K.beam(C, V(-4.6, 9.2, hz + 1.7), V(3.4, 14, hz + 1.7), 0.2); K.beam(C, V(1.2, 11.9, hz + 1.75), V(-2.4, 16.6, hz + 1.75), 0.2);
    K.beam(C, V(4.2, 0.2, 7.5), V(-3.8, 0.35, 10.5), 0.2); K.beam(C, V(-6.5, 0.2, 5), V(-9.6, 0.3, -2.2), 0.2); for (let q = 0; q < 4; q++) K.beam(C, V(3 - q * 1.9, 0.25, 7.9 + q * 0.7), V(3.4 - q * 1.9, 0.25, 9.3 + q * 0.7), 0.07); }
  K.drum('stone', cm.x + 1.6, my - 0.1, cm.z - 2.4, 0.9, 0.34, 10, { r2: 0.9 }); K.wheel(cm.x - 2.6, my + 0.65, cm.z + 1.2, 1.1, 0.85, 'stone');
  K.collide(cm.x, cm.z, 1.2, 1.2, 0.3, my + 5);
  { const hx = cm.x + 15, hz = cm.z - 9;
    K.pierced('dark:rubble', hx, hz - 3.2, 0.2, 4.2, 3.4, 0.6, [{ u: 1.5, w: 0.5, y0: 1, y1: 2.1 }], { ruin: true }); K.pierced('dark:rubble', hx, hz + 3.2, 0.2, 4.2, 3.4, 0.6, [{ u: -0.5, w: 0.7, y0: 0, y1: 2.2 }], { ruin: true });
    const P = K.frame(hx, hz, 0.2); for (const sd of [-1, 1]) { const [px, pz] = P(sd * 4.2, 0); K.pierced('dark:rubble', px, pz, 0.2 + Math.PI / 2, 3.2, 4.4, 0.6, [], { ruin: true }); }
    K.beam(C, [hx - 3, Y(hx, hz) + 0.2, hz - 1], [hx + 2.4, Y(hx, hz) + 2.4, hz + 2.6], 0.24); K.beam(C, [hx + 3, Y(hx, hz) + 0.2, hz - 2], [hx - 1, Y(hx, hz) + 1.5, hz + 2.4], 0.24);
    K.box('stone', hx - 3, Y(hx - 3, hz) - 0.3, hz - 2.2, 0.6, 4.6, 0.6, 0.2, { collide: false }); }
  K.cart(cm.x - 13, cm.z + 8, 0.8, { wreck: true }); K.well(cm.x + 9, cm.z + 12, 0, { roof: false });
  for (let i = 0; i < 7; i++) { const t = hash2(i, 91) * TAU, r = 16 + hash2(i, 92) * 16, x = cm.x + Math.cos(t) * r, z = cm.z + Math.sin(t) * r; K.drum(C, x, Y(x, z) - 0.3, z, 0.22 + hash2(i, 93) * 0.15, 1 + hash2(i, 94) * 2.6, 5, { r2: 0.1 }); }
  K.spots.charmill_well = [cm.x + 6.5, Y(cm.x + 6.5, cm.z + 9.5), cm.z + 9.5, -2.2];
  // Blackvigil Keep: Velscour's. The curtain wall in his black stone, a drum tower at each corner, the gatehouse on the Vigil Road
  // (east), the great keep within, his red over the gate and braziers up the road.
  keep(K);
}
