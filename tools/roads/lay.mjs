// Lays the land's roads, lanes and footpaths between everything the old roads never reached: every place, every delve's
// portal, the standing battles, the towns' neighbours, the lairs and camps in the woods round Bellmourn, and footpaths out to
// the outposts and the things to find. Writes src/core/roads-data.js, the same every time it's run.
//   node tools/roads/lay.mjs [--quiet]
//
// How: the land is cut into 8 m squares, each with what it costs to walk (more on a slope, a lot more on a steep one, nothing
// at all through water, a wall, a hut or a fort); every way is the cheapest walk between its two ends (A*), where a square
// already on a road costs a third, so the new ways join the old ones and run along them rather than beside them. Only the
// stretches off the old roads are kept, smoothed and cut every 24 m or so. Which pairs of places get a way: each place and
// its neighbours (a Gabriel graph: no third place stands inside the circle the two of them make), then the stray ends.
import fs from 'node:fs';

globalThis.__bmNoWays = true;   // (lands.js leaves out the ways laid last time: this lays them again from nothing)
const { terrainHeight, CAVE_PATH, PATHS, ROADS } = await import('../../src/core/terrain.js');
const { CAVE_MOUTH, WAY, WAY_FOOT } = await import('../../src/core/opening.js');
const { SITES, ROUTES, WATERS, MOUNT, countryAt, siteAt } = await import('../../src/core/lands.js');
const { buildSites, portalStair } = await import('../../src/core/sites.js');
const { LAIRS } = await import('../../src/core/tripo-monsters.js');
const { OUTPOSTS, BATTLES, FINDS, FIND_KINDS, TEAR_SPOTS } = await import('../../src/core/wilds-data.js');
const { DELVES } = await import('../../src/core/dungeon.js');
const { CHURCH_FOOTPRINT, CHURCH_WING } = await import('../../src/core/church.js');
const { HUNT_GROUNDS } = await import('../../src/core/hunts.js');
const { TUMBLER_CAMPS } = await import('../../src/sim/tumblers.js');
const { CAMPS, campAt } = await import('../../src/core/camps-data.js');

const quiet = process.argv.includes('--quiet');
const log = (...a) => { if (!quiet) console.log(...a); };
const T0 = performance.now();

// ---------------------------------------------------------------- the grid
const CELL = 8, HALF = 5600, N = Math.round(2 * HALF / CELL), EDGE = 5440;
const cx = (i) => -HALF + (i + 0.5) * CELL, ci = (x) => Math.floor((x + HALF) / CELL);
const H = new Float32Array(N * N), C = new Float32Array(N * N), ROAD = new Uint8Array(N * N);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = terrainHeight(cx(i), cx(j));
log(`heights ${((performance.now() - T0) / 1000).toFixed(1)} s`);

// What a metre costs in each square: the slope, and what's there.
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const k = j * N + i, x = cx(i), z = cx(j);
  if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1 || Math.abs(x) > EDGE || Math.abs(z) > EDGE) { C[k] = Infinity; continue; }
  const s = Math.max(Math.abs(H[k + 1] - H[k - 1]), Math.abs(H[k + N] - H[k - N])) / (2 * CELL);
  C[k] = s > 0.85 ? Infinity : 1 + 46 * s * s + (s > 0.4 ? 60 * (s - 0.4) : 0);
}
const each = (x, z, r, fn) => {
  for (let j = Math.max(0, ci(z - r)); j <= Math.min(N - 1, ci(z + r)); j++) for (let i = Math.max(0, ci(x - r)); i <= Math.min(N - 1, ci(x + r)); i++) fn(j * N + i, cx(i), cx(j));
};
const disc = (x, z, r, fn) => each(x, z, r, (k, px, pz) => { if ((px - x) ** 2 + (pz - z) ** 2 < r * r) fn(k, Math.hypot(px - x, pz - z)); });
const block = (k) => { C[k] = Infinity; };
// Water, and the mountain's crown (its teeth and the frozen lake: the stair up stops at the rim).
for (const wt of WATERS) disc(wt.x, wt.z, wt.r + (wt.frozen ? 2 : 8), block);
disc(MOUNT.x, MOUNT.z, MOUNT.crown - 30, block);
// Everything built that you'd walk into, a little wider than it is.
const B = buildSites(false);
const boxHit = (c, x, z, m) => {
  const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw || 0), sn = Math.sin(c.yaw || 0);
  const u = dx * cs - dz * sn, w = dx * sn + dz * cs;
  return Math.abs(u) < c.hx + m && Math.abs(w) < c.hz + m;
};
// (And the delves' terraces and the flights up them, which are walked on (their walls stop you only below their tops, so
// they're not among the boxes taken here): a way comes to the foot of a portal's steps, never over its terrace.)
const STAIRS = DELVES.filter((d) => d.portal && !d.within && Math.abs(d.portal.x) < HALF && Math.abs(d.portal.z) < HALF).map(portalStair);
const solid = [...B.colliders.filter((c) => Math.abs(c.x) < HALF && Math.abs(c.z) < HALF && c.t === undefined), CHURCH_FOOTPRINT, CHURCH_WING, ...STAIRS.flatMap((s) => s.boxes)];
for (const c of solid) {
  const m = c === CHURCH_FOOTPRINT || c === CHURCH_WING ? 5 : 2.6, r = Math.hypot(c.hx, c.hz) + m;
  each(c.x, c.z, r, (k, x, z) => { if (boxHit(c, x, z, m)) block(k); });
}
// Lisandra's cave and her way down from it are the game's first steps: the one way on is down her flights to the road, so no
// footpath climbs the hill beside them or sets out from the cave's mouth over the hill the other way (the owner: a player
// fresh out of the cave was shown flights of steps going off away from where they're meant to go). Shut round the mouth and
// along her flights; her way isn't an old road to join, either (OLD below).
disc(CAVE_MOUTH[0], CAVE_MOUTH[1], 30, block);
for (let n = 0; n < WAY_FOOT; n++) {
  const [ax, az] = WAY[n], [bx, bz] = WAY[n + 1], L = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(L / 3));
  for (let s = 0; s <= steps; s++) disc(ax + (bx - ax) * s / steps, az + (bz - az) * s / steps, 16, block);
}
// Bellmourn's own streets are its own: nothing new runs through the town (its ways out are on the road map below).
const TOWN_BOX = { x0: -84, x1: 112, z0: -78, z1: 84 };
each((TOWN_BOX.x0 + TOWN_BOX.x1) / 2, (TOWN_BOX.z0 + TOWN_BOX.z1) / 2, 120, (k, x, z) => { if (x > TOWN_BOX.x0 && x < TOWN_BOX.x1 && z > TOWN_BOX.z0 && z < TOWN_BOX.z1) block(k); });
// Never on a lair out in the land (tests/quests-beyond.test.mjs: no road within its width, the lair's and 8 m of one; the town's
// own woods and a place's are their own), where a tear opens (8 m clear), or on a thing to find (4 m clear): a margin more
// for the squares and the smoothing. Dearer round them, and through a standing battle.
for (const l of LAIRS) {
  if (Math.hypot(l.x, l.z) >= 330 && !siteAt(l.x, l.z, 40)) disc(l.x, l.z, (l.r || 6) + 16, block);
  // (Dear out to as far as its monsters would see a traveller go by, src/ui/autobrain.js lairPass, and a square more: a
  // way that runs nearer is one auto-play leaves for the open country until it's of a level for what lives there.)
  disc(l.x, l.z, Math.max((l.r || 6) + 30, (l.r || 6) * 0.6 + 56), (k) => { C[k] *= 4; });
}
for (const b of BATTLES) for (let t = 0; t <= 1; t += 0.25) disc(b.x + (b.x2 - b.x) * t, b.z + (b.z2 - b.z) * t, 26, (k) => { C[k] *= 5; });
for (const [x, z] of TEAR_SPOTS) { disc(x, z, 26, (k) => { C[k] *= 2.5; }); disc(x, z, 16, block); }
for (const [x, z] of FINDS) disc(x, z, 10, block);
// The outposts: round, never through (but for the one a path's going to: OPEN below).
const OUT = new Uint8Array(N * N);
for (const o of OUTPOSTS) disc(o.x, o.z, o.r + 9, (k) => { OUT[k] = 1; });

// The old roads, cheap to walk along: every square within a road's half-width of one.
const OLD = [...ROUTES.map((r) => ({ pts: r.pts, w: r.w })), ...PATHS.filter((p) => p !== CAVE_PATH).map((p) => ({ pts: p.pts, w: p.w })), ...ROADS.map((r) => ({ pts: r.line, w: r.w }))];
const markLine = (pts, w, v = 1) => {
  for (let n = 0; n + 1 < pts.length; n++) {
    const [ax, az] = pts[n], [bx, bz] = pts[n + 1], L = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(L / 3));
    for (let s = 0; s <= steps; s++) disc(ax + (bx - ax) * s / steps, az + (bz - az) * s / steps, Math.max(w, 4.5), (k) => { ROAD[k] = v; });
  }
};
for (const r of OLD) markLine(r.pts, r.w);
log(`costs ${((performance.now() - T0) / 1000).toFixed(1)} s`);

// ---------------------------------------------------------------- the walk
const G = new Float32Array(N * N), FROM = new Int32Array(N * N), STAMP = new Int32Array(N * N), SHUT = new Int32Array(N * N);
let stamp = 0;
const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1], DL = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
const ON_ROAD = 0.32;
const costAt = (k, open) => {
  if (OUT[k] && !open?.has(k)) return Infinity;
  if (ROAD[k]) return C[k] === Infinity ? Infinity : ON_ROAD;
  return C[k];
};
// The cheapest walk from square a to square b (or, with b < 0, to the nearest square on a road), as squares; null if none
// within budget squares looked at.
function walk(a, b, open = null, budget = 900000) {
  stamp++;
  const heap = [], hk = [];
  const bi = b % N, bj = (b / N) | 0;
  const hfun = (k) => (b < 0 ? 0 : Math.hypot((k % N) - bi, ((k / N) | 0) - bj) * CELL * 0.62);
  const push = (k, f) => {
    heap.push(f); hk.push(k);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hk[p], hk[i]] = [hk[i], hk[p]]; i = p; }
  };
  const pop = () => {
    const k = hk[0], lf = heap.pop(), lk = hk.pop();
    if (heap.length) {
      heap[0] = lf; hk[0] = lk;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && heap[l] < heap[m]) m = l;
        if (r < heap.length && heap[r] < heap[m]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; [hk[m], hk[i]] = [hk[i], hk[m]]; i = m;
      }
    }
    return k;
  };
  STAMP[a] = stamp; G[a] = 0; FROM[a] = -1; push(a, hfun(a));
  let seen = 0;
  while (heap.length) {
    const k = pop();
    if (SHUT[k] === stamp) continue;
    SHUT[k] = stamp;
    if (k === b || (b < 0 && ROAD[k] && k !== a && G[k] > 0)) {
      const out = [];
      for (let q = k; q >= 0; q = FROM[q]) out.push(q);
      return out.reverse();
    }
    if (++seen > budget) { walk.why = `budget (${seen})`; return null; }
    const i = k % N, j = (k / N) | 0, ck = costAt(k, open);
    for (let d = 0; d < 8; d++) {
      const ni = i + DI[d], nj = j + DJ[d];
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nk = nj * N + ni, cn = costAt(nk, open);
      if (cn === Infinity || SHUT[nk] === stamp) continue;
      // (No corner cut past a blocked square.)
      if (d >= 4 && (costAt(j * N + ni, open) === Infinity || costAt(nj * N + i, open) === Infinity)) continue;
      const g = G[k] + DL[d] * CELL * (ck + cn) * 0.5;
      if (STAMP[nk] !== stamp || g < G[nk]) { STAMP[nk] = stamp; G[nk] = g; FROM[nk] = k; push(nk, g + hfun(nk)); }
    }
  }
  walk.why = `shut in after ${seen}`;
  return null;
}

// ---------------------------------------------------------------- squares to a line
const ptOf = (k) => [cx(k % N), cx((k / N) | 0)];
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bd = tol;
    const [ax, az] = pts[a], [bx, bz] = pts[b], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / L; if (d > bd) { bd = d; best = i; } }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function chaikin(pts, n) {
  for (let r = 0; r < n; r++) {
    const out = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    out.push(pts.at(-1));
    pts = out;
  }
  return pts;
}
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t < L) { out.push([ax + (bx - ax) * t / L, az + (bz - az) * t / L]); t += step; }
    carry = L - (t - step);
  }
  const last = pts.at(-1);
  if (Math.hypot(out.at(-1)[0] - last[0], out.at(-1)[1] - last[1]) > step * 0.3) out.push(last); else out[out.length - 1] = last;
  return out;
}
const clear = (pts, open) => pts.every(([x, z]) => { const k = ci(z) * N + ci(x); return costAt(k, open) !== Infinity || ROAD[k]; });
// The stretches of a walk that are off the old roads (with the road square each starts or ends on, so it joins), as lines.
function offRoad(sq, open) {
  const runs = [];
  let cur = null;
  for (let n = 0; n < sq.length; n++) {
    const on = ROAD[sq[n]] === 1;
    if (!on) { if (!cur) { cur = n > 0 ? [sq[n - 1]] : []; } cur.push(sq[n]); }
    else if (cur) { cur.push(sq[n]); runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const lines = [];
  for (const run of runs) {
    if (run.length < 4) continue;
    const raw = run.map(ptOf);
    let line = resample(chaikin(rdp(raw, 3.2), 2), 24);
    if (!clear(line, open)) line = resample(rdp(raw, 1.5), 16);
    if (!clear(line, open)) line = rdp(raw, 0.5);
    lines.push(line.map(([x, z]) => [Math.round(x), Math.round(z)]));
  }
  return lines;
}

// ---------------------------------------------------------------- what's joined to what
const shortName = (n) => n.replace(/^The /, '').replace(/^the /, '');
const NEAR = 1300;
const TOWNS = new Set(['hamlet', 'farm', 'thornwick', 'cinderford', 'frostwatch', 'sallow', 'abbey', 'khel', 'keep', 'crossroads', 'belltower']);
const nodes = [];
const node = (x, z, o) => { nodes.push({ x, z, ...o }); return nodes.length - 1; };
// (A camp in the woods round Bellmourn, src/core/camps-data.js, is one of the woods' own: footpaths to it, and no lane
// driven over the town's hills to the next place or to the Warrens' door.)
// (And a camp's way comes to its front, between its two lanterns, whose square is kept open as a portal's is: its middle
// is its fire and its yard, and a way driven at that was cut short at the first tent and left in pieces round it.)
for (const [k, s] of Object.entries(SITES)) {
  const kind = TOWNS.has(k) ? 'town' : s.camp && Math.hypot(s.x, s.z) < NEAR ? 'near' : 'site';
  if (!s.camp) { node(s.x, s.z, { key: k, name: shortName(s.name), kind, r: s.r }); continue; }
  const [x, z] = campAt(CAMPS.find((c) => c.key === k), 0, 19).map(Math.round);
  if (Math.abs(x) < EDGE && Math.abs(z) < EDGE) C[ci(z) * N + ci(x)] = 1;
  node(x, z, { key: k, name: shortName(s.name), kind, r: 0, own: true });
}
// (A delve's portal stands on its terrace: its way ends out in front of the foot of its steps, whose square is kept open.)
for (const d of DELVES) {
  if (!d.portal || d.within || Math.abs(d.portal.x) >= HALF || Math.abs(d.portal.z) >= HALF || nodes.some((n) => Math.hypot(n.x - d.portal.x, n.z - d.portal.z) < 120)) continue;
  const [x, z] = STAIRS.find((s) => s.key === d.key).out;
  C[ci(z) * N + ci(x)] = 1;
  node(x, z, { key: d.key, name: shortName(d.name), kind: 'site', r: 0, own: true });
}
for (const b of BATTLES) node((b.x + b.x2) / 2 + 40, (b.z + b.z2) / 2 + 40, { key: b.key, name: 'the battlefield', kind: 'battle', r: 0 });
// The woods round Bellmourn: the hunting grounds, the lairs and camps there, so the woods are walked between.
for (const g of HUNT_GROUNDS) node(g.x, g.z, { key: g.key, name: 'the hunting ground', kind: 'near', r: g.r });
for (const l of LAIRS) if (!l.wild && Math.hypot(l.x, l.z) < NEAR && !nodes.some((n) => Math.hypot(n.x - l.x, n.z - l.z) < 60)) node(l.x, l.z, { key: l.key, name: 'the lair', kind: 'near', r: l.r });
for (const c of TUMBLER_CAMPS) if (c.r && !nodes.some((n) => Math.hypot(n.x - c.x, n.z - c.z) < 80)) node(c.x, c.z, { key: 'camp', name: 'the camp', kind: c.x * c.x + c.z * c.z < NEAR * NEAR ? 'near' : 'site', r: c.r * 0.5 });
// And each far lair that isn't a wild one, on a lane: the land's named fights. (Not one stood beside a road for those going by
// to meet, `roadside`: the road's its way, and a lane of its own was 5,000 corners more on a phone. tools/quests/errands.mjs.)
for (const l of LAIRS) if (!l.wild && !l.roadside && Math.hypot(l.x, l.z) >= NEAR && !nodes.some((n) => Math.hypot(n.x - l.x, n.z - l.z) < 220)) node(l.x, l.z, { key: l.key, name: 'the lair', kind: 'lair', r: l.r });

// Rings of crossings in the woods round Bellmourn, and a loose lattice of them over all the land: where the footpaths meet,
// so there's a way through every stretch of country, not only out to its places.
const okAt = (x, z) => { const k = ci(z) * N + ci(x); return C[k] !== Infinity && !OUT[k]; };
for (const [r, n] of [[430, 12], [820, 18]]) for (let q = 0; q < n; q++) {
  const a = (q + 0.5) / n * Math.PI * 2, x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
  // (None on the hill over Lisandra's cave: one stood there drew footpaths up beside her flights and over from her door.)
  if (okAt(x, z) && Math.hypot(x - CAVE_MOUTH[0], z - CAVE_MOUTH[1]) > 120 && !nodes.some((m) => Math.hypot(m.x - x, m.z - z) < 140)) node(x, z, { key: 'woods', name: 'the woods', kind: 'near', r: 0 });
}
const LATTICE = 1150;
for (let row = 0; ; row++) {
  const z = -EDGE + 250 + row * LATTICE * 0.866;
  if (z > EDGE - 250) break;
  for (let x = -EDGE + 250 + (row % 2) * LATTICE / 2; x < EDGE - 250; x += LATTICE) {
    const jx = x + (((row * 7 + Math.round(x)) % 13) - 6) * 30, jz = z + (((row * 5 + Math.round(x) * 3) % 11) - 5) * 30;
    if (Math.hypot(jx, jz) < 1100 || !okAt(jx, jz) || nodes.some((m) => Math.hypot(m.x - jx, m.z - jz) < 420)) continue;
    node(Math.round(jx), Math.round(jz), { key: 'mark', name: 'the crossing', kind: 'mark', r: 0 });
  }
}
const MAJOR = (n) => n.kind === 'town' || n.kind === 'site';

// Pairs: the Gabriel graph (no third stands in the circle the two of them make), no longer than a country across. First the
// places among themselves, for the roads and lanes; then everything, for the footpaths.
const MAXLEN = { town: 3600, site: 2600, battle: 1400, near: 700, lair: 1500, mark: 1900 };
function gabriel(idx, lim) {
  const out = [];
  for (let x = 0; x < idx.length; x++) for (let y = x + 1; y < idx.length; y++) {
    const a = idx[x], b = idx[y], A = nodes[a], Bn = nodes[b], d = Math.hypot(A.x - Bn.x, A.z - Bn.z);
    if (d > lim(A, Bn) || d < 30) continue;
    const mx = (A.x + Bn.x) / 2, mz = (A.z + Bn.z) / 2, rr = (d / 2) ** 2 * 0.92;
    if (idx.some((c) => c !== a && c !== b && (nodes[c].x - mx) ** 2 + (nodes[c].z - mz) ** 2 < rr)) continue;
    out.push([a, b, d]);
  }
  return out.sort((p, q) => p[2] - q[2]);
}
const all = nodes.map((_, i) => i), major = all.filter((i) => MAJOR(nodes[i]));
const pairs = [
  ...gabriel(major, (A, Bn) => (A.kind === 'town' && Bn.kind === 'town' ? 5200 : 3200)),
  ...gabriel(all, (A, Bn) => Math.min(MAXLEN[A.kind], MAXLEN[Bn.kind])).filter(([a, b]) => !(MAJOR(nodes[a]) && MAJOR(nodes[b]))),
];
const CLS = (A, Bn) => {
  if (A.kind === 'town' && Bn.kind === 'town') return 'road';
  if ((A.kind === 'town' || A.kind === 'site') && (Bn.kind === 'town' || Bn.kind === 'site')) return 'lane';
  return 'path';
};
const WIDTH = { road: 2.4, lane: 1.7, path: 1.1 };
const WORD = { road: 'Road', lane: 'Lane', path: 'Path' };

const ways = [];
const named = new Map();
const nameFor = (A, Bn, cls) => {
  const [p, q] = A.kind === 'town' && Bn.kind !== 'town' ? [Bn, A] : [A, Bn];
  let n = !MAJOR(p) ? `the path to ${p.name}` : `the ${p.name.replace(/^(the|The) /, '')} ${WORD[cls]}`;
  if (cls === 'road' && q.kind === 'town') n = `the ${q.name.replace(/^(the|The) /, '')} and ${p.name.replace(/^(the|The) /, '')} Road`;
  const c = (named.get(n) || 0) + 1; named.set(n, c);
  return c > 1 ? `${n} (${c})` : n;
};
// A node's square, facing another (toward): out along the line between them from its middle, the first open square past the
// last shut one within reach (a lair is ringed with what lies about it, a walled place shut in; the way ends at its edge and its
// own streets take you on in). If that line's shut all the way, a little to either side.
function squareOf(n, toward = null) {
  if (n.own) return ci(n.z) * N + ci(n.x);   // (a portal's: the foot of its steps, whichever way the other end lies)
  const reach = (n.r || 6) + 44, a0 = toward ? Math.atan2(toward.z - n.z, toward.x - n.x) : 0;
  for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, 3.1]) {
    const a = a0 + da, c = Math.cos(a), sn = Math.sin(a);
    let last = -1, pick = -1;
    for (let d = 0; d <= reach; d += CELL * 0.5) {
      const k = ci(n.z + sn * d) * N + ci(n.x + c * d);
      if (C[k] === Infinity || OUT[k]) { last = d; pick = -1; } else if (pick < 0) pick = k;
    }
    if (pick >= 0 && (last < 0 || last < reach - CELL)) return pick;
  }
  return -1;
}
function lay(sq, cls, name, open) {
  for (const line of offRoad(sq, open)) {
    let L = 0; for (let i = 0; i + 1 < line.length; i++) L += Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]);
    if (L < 30) continue;
    // (Nor one that forks off the road where her way comes down onto it: she leads you on along the road from there.)
    if ([line[0], line.at(-1)].some(([x, z]) => Math.hypot(x - WAY.at(-1)[0], z - WAY.at(-1)[1]) < 40)) continue;
    ways.push({ name, cls, w: WIDTH[cls], pts: line });
    markLine(line, WIDTH[cls]);
  }
}
let laid = 0, failed = 0;
for (const [a, b] of pairs) {
  const A = nodes[a], Bn = nodes[b], sa = squareOf(A, Bn), sb = squareOf(Bn, A);
  if (sa < 0 || sb < 0) { failed++; continue; }
  const sq = walk(sa, sb);
  if (!sq) { failed++; log(`  no way: ${A.name} (${A.x}, ${A.z}) - ${Bn.name} (${Bn.x}, ${Bn.z}): ${walk.why}`); continue; }
  const cls = CLS(A, Bn);
  lay(sq, cls, nameFor(A, Bn, cls));
  laid++;
}
log(`${laid} pairs walked, ${failed} with no way, ${ways.length} ways, ${((performance.now() - T0) / 1000).toFixed(1)} s`);

// The old roads' stray ends (a road that stops short of anything): on to the nearest other way within 350 m.
const lines = OLD.map((r) => r.pts);
let strays = 0;
for (let li = 0; li < lines.length; li++) {
  for (const end of [lines[li][0], lines[li].at(-1)]) {
    if (Math.hypot(end[0], end[1]) < 120) continue;
    let touch = false, best = null, bd = 350;
    for (let lj = 0; lj < lines.length; lj++) {
      if (lj === li) continue;
      for (let n = 0; n + 1 < lines[lj].length; n++) {
        const [ax, az] = lines[lj][n], [bx, bz] = lines[lj][n + 1], dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((end[0] - ax) * dx + (end[1] - az) * dz) / (dx * dx + dz * dz || 1)));
        const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - end[0], pz - end[1]);
        if (d < 10) touch = true;
        if (d < bd) { bd = d; best = [px, pz]; }
      }
    }
    if (touch || !best) continue;
    // (A place's own end of a road is where it's meant to stop.)
    if (Object.values(SITES).some((s) => Math.hypot(s.x - end[0], s.z - end[1]) < s.r + 20)) continue;
    const sa = squareOf({ x: end[0], z: end[1] }), sb = squareOf({ x: best[0], z: best[1] });
    if (sa < 0 || sb < 0) continue;
    // (Walked with its own road taken off the map, so the way found isn't just back along it.)
    markLine(lines[li], OLD[li].w, 0);
    const sq = walk(sa, sb);
    markLine(lines[li], OLD[li].w, 1);
    if (sq) { lay(sq, 'lane', `the way on from ${end[0].toFixed(0)}, ${end[1].toFixed(0)}`); strays++; }
  }
}
log(`${strays} stray ends joined`);

// Footpaths out to every outpost without a trail, and to the finds a body would walk to, from the nearest road within reach.
const FIND_WALKED = new Set(['cart', 'camp', 'well', 'shrine', 'wreck', 'cairn', 'stone', 'grave', 'pyre', 'totem']);
let foot = 0;
const outposts = OUTPOSTS.filter((o) => !o.trail).map((o) => ({ x: o.x, z: o.z, r: o.r, name: o.name, out: true }));
const finds = FINDS.filter((f) => FIND_WALKED.has(FIND_KINDS[f[2]])).map(([x, z, k]) => ({ x: x + 9, z: z + 9, r: 2, name: `the ${FIND_KINDS[k]}` }));
for (const t of [...outposts, ...finds]) {
  const open = new Set();
  if (t.out) disc(t.x, t.z, t.r + 10, (k) => open.add(k));
  let s = -1, bd = 1e9;
  each(t.x, t.z, t.r + 20, (k, x, z) => { const d = Math.hypot(x - t.x, z - t.z); if (d > t.r + 3 && costAt(k, open) !== Infinity && d < bd) { bd = d; s = k; } });
  if (s < 0) continue;
  const sq = walk(s, -1, open, 60000);
  if (!sq) continue;
  let L = 0; for (let i = 0; i + 1 < sq.length; i++) L += CELL;
  if (L > (t.out ? 900 : 520)) continue;
  lay(sq, 'path', `the path to ${t.name.replace(/^(a|an|the) /i, 'the ')}`, open);
  foot++;
}
log(`${foot} footpaths to outposts and finds`);

// And a footpath from each hub to every lair and den its quests send you to (docs/QUEST-LOOP.md): the work is within 650 m
// of whoever gives it, and by the ways it was twice that, out to a road and back up another, or straight over a scarp.
// Walked from the lair's edge to the hub's front, along what's laid already where that serves.
{
  const { RULES } = await import('../../src/folk/quests.js');
  const { QUESTS } = await import('../../src/folk/lines/quests.js');
  const { whereIs } = await import('../quests/geo.mjs');
  const freeNear = (x, z, r0, r1, open) => { let s = -1, bd = 1e9; each(x, z, r1, (k, px, pz) => { const d = Math.hypot(px - x, pz - z); if (d >= r0 && costAt(k, open) !== Infinity && d < bd) { bd = d; s = k; } }); return s; };
  const seen = new Set();
  let quest = 0;
  for (const [id, R] of Object.entries(RULES)) {
    const g = QUESTS[id] && whereIs(QUESTS[id].giver);
    if (!g || g.down || Math.abs(g.x) > EDGE || Math.abs(g.z) > EDGE || g.where === 'bellmourn') continue;
    const camp = CAMPS.find((c) => c.key === g.where), from = camp ? campAt(camp, 0, 19) : [g.x, g.z];
    for (const st of R.steps) for (const k of [st.kill, st.gather, st.enter, st.clear && `outpost:${st.clear}`, ...(st.visit || [])]) {
      if (typeof k !== 'string' || !(k.startsWith('lair:') || k.startsWith('outpost:'))) continue;
      const t = k.startsWith('lair:') ? LAIRS.find((l) => l.key === k.slice(5)) : OUTPOSTS.find((o) => o.key === k.slice(8));
      const key = `${g.where}>${k}`;
      if (!t || seen.has(key) || Math.hypot(t.x - from[0], t.z - from[1]) > 720) continue;
      // (A den whose own trail sets out from this hub has its way already: tools/wilds/place.mjs.)
      if (t.trail && Math.hypot(t.trail[0][0] - g.x, t.trail[0][1] - g.z) < 60) { seen.add(key); continue; }
      seen.add(key);
      const open = new Set();
      disc(t.x, t.z, (t.r || 6) + 18, (c) => open.add(c));
      const a = freeNear(t.x, t.z, (t.r || 6) + 26, (t.r || 6) + 50, open)   // (short of its ground: a path's bed banked up to a den's edge on a slope stood a man's height off the land)
        , b = freeNear(from[0], from[1], 0, 24, null);
      if (a < 0 || b < 0) continue;
      const sq = walk(a, b, open, 200000);
      if (!sq) continue;
      lay(sq, 'path', `the path from ${shortName(SITES[g.where]?.name || g.where)} to ${t.name ? t.name.replace(/^(a|an|the) /i, 'the ') : 'the lair'}`, open);
      quest++;
    }
  }
  log(`${quest} footpaths from the hubs to their quests' lairs and dens`);
}

// ---------------------------------------------------------------- nothing built on a way
// (The grid's squares are 8 m: a way smoothed between them can still graze the corner of a wall, and a way's end runs on into
// the place it goes to. Cut it there, so what's left stops short of whatever it would walk into, as
// tools/lands/check-sites.mjs wants: no collider within four-fifths of a way's width.)
{
  const SG = new Map(), SC = 16, sk = (i, j) => i * 100003 + j;
  for (const c of solid) {
    const r = Math.hypot(c.hx, c.hz) + 4;
    for (let i = Math.floor((c.x - r) / SC); i <= Math.floor((c.x + r) / SC); i++) for (let j = Math.floor((c.z - r) / SC); j <= Math.floor((c.z + r) / SC); j++) {
      if (!SG.has(sk(i, j))) SG.set(sk(i, j), []);
      SG.get(sk(i, j)).push(c);
    }
  }
  const hit = (x, z, m) => (SG.get(sk(Math.floor(x / SC), Math.floor(z / SC))) || []).some((c) => boxHit(c, x, z, m));
  const out = [];
  let cuts = 0;
  for (const w of ways) {
    const m = w.w * 0.8 + 0.6, dense = [];
    for (let i = 0; i + 1 < w.pts.length; i++) {
      const [ax, az] = w.pts[i], [bx, bz] = w.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
      for (let k = 0; k < n; k++) dense.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    dense.push(w.pts.at(-1));
    let run = [], broke = false;
    const flush = () => {
      let L = 0; for (let i = 0; i + 1 < run.length; i++) L += Math.hypot(run[i + 1][0] - run[i][0], run[i + 1][1] - run[i][1]);
      if (L >= 12) out.push({ ...w, pts: rdp(run, 0.35).map(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10]) });
      run = [];
    };
    for (const p of dense) { if (hit(p[0], p[1], m)) { if (run.length) flush(); broke = true; } else run.push(p); }
    if (run.length) flush();
    if (broke) cuts++;
  }
  ways.length = 0; ways.push(...out);
  log(`${cuts} ways cut short of something built`);
}

// ---------------------------------------------------------------- written out
let km = 0; for (const w of ways) for (let i = 0; i + 1 < w.pts.length; i++) km += Math.hypot(w.pts[i + 1][0] - w.pts[i][0], w.pts[i + 1][1] - w.pts[i][1]) / 1000;
const byCls = {}; for (const w of ways) byCls[w.cls] = (byCls[w.cls] || 0) + 1;
log(`${ways.length} ways, ${km.toFixed(1)} km (${JSON.stringify(byCls)}) in ${((performance.now() - T0) / 1000).toFixed(1)} s`);
const body = ways.map((w) => `  ${JSON.stringify({ name: w.name, cls: w.cls, w: w.w, pts: w.pts })},`).join('\n');
fs.writeFileSync(new URL('../../src/core/roads-data.js', import.meta.url),
  `// Written by tools/roads/lay.mjs: don't edit by hand, run it again. (src/core/roads.js says what these are.)\nexport const WAYS = [\n${body}\n];\n`);
console.log(`wrote src/core/roads-data.js: ${ways.length} ways, ${km.toFixed(1)} km`);
