// The land's roads and paths as one system, shared by every thread: what each stretch is laid with (SURFACES), the stretches as
// the ground's shader takes them (roadSegments: drawn sharp at any distance, src/gfx/materials.js TERRAIN), and the roads as a
// graph to find a way along (overLand: the quest trail, auto-play, the other Tessariels).
//
// The ways themselves: the town's paths and the Long Road (src/core/terrain.js PATHS, ROADS), the named roads and the outposts'
// trails (src/core/lands.js ROUTES), and the roads, lanes and footpaths laid between everything else by tools/roads/lay.mjs
// (src/core/roads-data.js). To change where a way runs, change those and run the tool again; never the data by hand.
import { CAVE_PATH, PATHS, ROADS } from './terrain.js';
import { COUNTRY_KEYS, ROUTES, SITES, WORLD_EAST, countryWeights } from './lands.js';
import { townDist } from './town.js';
import { cityIn } from './east.js';
import { hash2 } from './terrain-noise.js';

// What a way's laid with, by number (the ground's layers 17 + n: assets/game/tex/manifest.json ground, made by
// tools/roads/build_tex.py out of the desert tiles in assets/desert, palette-swapped to this country's greys and browns).
// 0 is the old worn gravel the town's paths and the Long Road have always had.
export const SURFACE = { OLD: 0, FLAG: 1, SETT: 2, GRAVEL: 3, STONES: 4, DIRT: 5, ASH: 6, PLANK: 7 };
export const SURFACE_LAYERS = ['road_flag', 'road_sett', 'road_gravel', 'road_stones', 'road_dirt', 'road_ash', 'road_plank'];

// The towns a road paves itself coming into (cobbles within reach of their gates).
const PAVED_NEAR = ['hamlet', 'farm', 'thornwick', 'cinderford', 'frostwatch', 'sallow', 'abbey', 'khel', 'keep', 'crossroads', 'belltower'].map((k) => SITES[k]);
const nearTown = (x, z, r) => Math.hypot(x, z) < r + 260 || PAVED_NEAR.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + r);
const CW = new Float32Array(COUNTRY_KEYS.length);
const ASHEN = COUNTRY_KEYS.indexOf('ashen'), FEN = COUNTRY_KEYS.indexOf('fen');

// The surface of a stretch of a way of class cls (great, road, lane, path) whose middle is (x, z); n: its place along the way, for
// the great roads' paving that comes and goes.
export function surfaceOf(cls, x, z, n = 0) {
  // (Inside Phobos's wall every way is paved: the King's Mile flagged, the rest in setts.)
  if (x > 9300 && x < 10800 && cityIn(x, z) < 1.01) return cls === 'great' ? SURFACE.FLAG : SURFACE.SETT;
  if (Math.hypot(x, z) > 1150) {
    countryWeights(x, z, CW);
    if (CW[ASHEN] > 0.5) return SURFACE.ASH;
    if (CW[FEN] > 0.55 && (cls === 'path' || cls === 'lane')) return SURFACE.PLANK;
  }
  if (cls === 'great') return nearTown(x, z, 420) || hash2(Math.floor(n / 16), Math.floor(x / 3000) + 77) < 0.55 ? SURFACE.FLAG : SURFACE.GRAVEL;
  if (cls === 'road') return nearTown(x, z, 200) ? SURFACE.SETT : SURFACE.GRAVEL;
  if (cls === 'lane') return nearTown(x, z, 120) ? SURFACE.SETT : SURFACE.STONES;
  return SURFACE.DIRT;
}

// Every way, as { pts, w, cls, kind(x, z, n) }: the town's own paths keep their old look in the town, and are laid as the
// church's cobbles, the sexton's stones and the hunters' earth out past it.
export function allWays(opening = false) {
  const out = [];
  for (const p of PATHS) {
    if (p === CAVE_PATH && !opening) continue;
    const kind = (x, z) => (townDist(x, z) < 6 ? SURFACE.OLD : p.hunt ? SURFACE.DIRT : x > 40 ? (p.w < 1.5 ? SURFACE.STONES : SURFACE.SETT) : SURFACE.OLD);
    out.push({ pts: p.pts, w: p.w, cls: p.hunt ? 'path' : 'lane', kind, town: true });
  }
  for (const r of ROADS) out.push({ pts: r.line, w: r.w, cls: 'great', kind: () => SURFACE.OLD, town: true });
  for (const r of ROUTES) out.push({ pts: r.pts, w: r.w, cls: r.cls, kind: (x, z, n) => surfaceOf(r.cls, x, z, n), name: r.name });
  return out;
}

// ---------------------------------------------------------------- for the ground's shader

// The stretches sorted into RD_CELL squares over the whole land (each listed in every square it comes within reach of):
// idx = [first, count] per square, then the lists; seg = two vec4 per stretch: (ax, az, bx, bz), (half-width, surface, how far
// along its way a starts, length).
export const RD_CELL = 64, RD_HALF = 5632, RD_N = Math.ceil(2 * RD_HALF / RD_CELL);
// (RD_N rows north to south; RD_NX squares along each, from the west edge out to the east's: the land's longer that way.)
export const RD_NX = Math.ceil((WORLD_EAST + 32 + RD_HALF) / RD_CELL);
const REACH = 7;   // past a way's edge that the shader still looks (its verge, and a far way drawn a little wide)
export function roadSegments(opening = false) {
  const segs = [];
  for (const w of allWays(opening)) {
    // (A finely curved line, the Long Road's, thinned to what shows; a long straight cut into 40 m, so what it's laid with
    // can change along it.)
    const pts = [];
    for (const q of thin(w.pts, 0.2)) {
      const last = pts.at(-1);
      if (last) { const L = Math.hypot(q[0] - last[0], q[1] - last[1]), n = Math.ceil(L / 40); for (let k = 1; k < n; k++) pts.push([last[0] + (q[0] - last[0]) * k / n, last[1] + (q[1] - last[1]) * k / n]); }
      pts.push(q);
    }
    let s = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.01) continue;
      segs.push([ax, az, bx, bz, w.w, w.kind((ax + bx) / 2, (az + bz) / 2, s / 20), s, L]);
      s += L;
    }
  }
  const cells = Array.from({ length: RD_NX * RD_N }, () => null);
  segs.forEach((g, n) => {
    const [ax, az, bx, bz, w] = g, m = w + REACH;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - m + RD_HALF) / RD_CELL)), i1 = Math.min(RD_NX - 1, Math.floor((Math.max(ax, bx) + m + RD_HALF) / RD_CELL));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - m + RD_HALF) / RD_CELL)), j1 = Math.min(RD_N - 1, Math.floor((Math.max(az, bz) + m + RD_HALF) / RD_CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      // (Only the squares it really comes within reach of: a long diagonal stretch's box holds many it never nears.)
      const qx = (i + 0.5) * RD_CELL - RD_HALF, qz = (j + 0.5) * RD_CELL - RD_HALF;
      if (segDist(qx, qz, ax, az, bx, bz) > m + RD_CELL * 0.7072) continue;
      (cells[j * RD_NX + i] ||= []).push(n);
    }
  });
  let total = 0;
  for (const c of cells) if (c) total += Math.min(c.length, RD_MAX);
  const idx = new Uint32Array(RD_NX * RD_N * 2 + total);
  let at = RD_NX * RD_N * 2;
  cells.forEach((c, k) => {
    if (!c) return;
    // (The widest and the old town ways first, so if a square's ever over full it's the footpaths that go.)
    if (c.length > RD_MAX) c.sort((p, q) => segs[q][4] - segs[p][4]);
    const n = Math.min(c.length, RD_MAX);
    idx[k * 2] = at; idx[k * 2 + 1] = n;
    for (let i = 0; i < n; i++) idx[at++] = c[i];
  });
  const seg = new Float32Array(segs.length * 8);
  segs.forEach((g, n) => seg.set(g, n * 8));
  return { idx, seg, count: segs.length };
}
export const RD_MAX = 48;

// The way under (x, z), as the ground's shader finds it (roadAt in src/gfx/materials.js), from what roadSegments made: how far
// past its edge (below 0 is on it) and what it's laid with. null where there's no way within reach.
export function wayAt(rs, x, z) {
  const i = Math.floor((x + RD_HALF) / RD_CELL), j = Math.floor((z + RD_HALF) / RD_CELL);
  if (i < 0 || j < 0 || i >= RD_N || j >= RD_N) return null;
  const k = (j * RD_N + i) * 2, first = rs.idx[k], n = Math.min(rs.idx[k + 1], RD_MAX), S = rs.seg;
  let best = null, be = Infinity;
  for (let m = 0; m < n; m++) {
    const o = rs.idx[first + m] * 8, ax = S[o], az = S[o + 1], dx = S[o + 2] - ax, dz = S[o + 3] - az, L = S[o + 7];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L)));
    const e = Math.hypot(x - ax - dx * t, z - az - dz * t) - S[o + 4];
    if (e < be) { be = e; best = S[o + 5]; }
  }
  return best === null ? null : { e: be, kind: best };
}

// A line with every point dropped that lies within tol of the straight run past it (Ramer-Douglas-Peucker).
function thin(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]); if (d > bd) { bd = d; best = i; } }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(ax + dx * t - px, az + dz * t - pz);
}

// ---------------------------------------------------------------- finding a way along them

// Every way cut into nodes no more than 20 m apart; where two come within 7 m of each other they join, and each one's ends are
// joined over open ground to the nearest node of each other way within 80 m. Built the first time it's asked for.
const STEP = 20, JOIN = 7, END_JOIN = 80, GCELL = 40;
const gkey = (i, j) => i * 100003 + j;
// Each node near (x, z), within r or a little more, to fn. (Made out here, so all it keeps hold of is the grid: made in
// roadGraph it would keep everything the graph was built from, every node's list and all, the size of the graph again.)
function aroundOf(grid) {
  return (x, z, r, fn) => {
    const R = Math.ceil(r / GCELL), ci = Math.floor(x / GCELL), cj = Math.floor(z / GCELL);
    for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) { const l = grid.get(gkey(i, j)); if (l) for (let n = 0; n < l.length; n++) fn(l[n]); }
  };
}
let GRAPH = null;
export function roadGraph() {
  if (GRAPH) return GRAPH;
  // (Not the Fall: it's for riding down on a shield, not walking.)
  const lines = [...ROADS.filter((r) => r.name !== 'the Fall').map((r) => r.line), ...PATHS.filter((p) => p !== CAVE_PATH).map((p) => p.pts), ...ROUTES.map((r) => r.pts)];
  const X = [], Z = [], L = [], adj = [];
  const node = (x, z, l) => { X.push(x); Z.push(z); L.push(l); adj.push([]); return X.length - 1; };
  const link = (a, b, w) => { adj[a].push(b, w); adj[b].push(a, w); };
  const ends = [];
  lines.forEach((line, l) => {
    let prev = node(line[0][0], line[0][1], l);
    ends.push(prev);
    for (let i = 1; i < line.length; i++) {
      const px = X[prev], pz = Z[prev], [x, z] = line[i], d = Math.hypot(x - px, z - pz);
      if (d < 0.01) continue;
      const n = Math.max(1, Math.ceil(d / STEP));
      for (let j = 1; j <= n; j++) { const k = node(px + (x - px) * j / n, pz + (z - pz) * j / n, l); link(prev, k, d / n); prev = k; }
    }
    ends.push(prev);
  });
  const N = X.length, grid = new Map();
  for (let a = 0; a < N; a++) {
    const k = gkey(Math.floor(X[a] / GCELL), Math.floor(Z[a] / GCELL));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(a);
  }
  for (const [k, l] of grid) grid.set(k, Int32Array.from(l));
  const around = aroundOf(grid);
  for (let a = 0; a < N; a++) around(X[a], Z[a], JOIN, (b) => {
    if (b <= a || L[b] === L[a]) return;
    const d = Math.hypot(X[a] - X[b], Z[a] - Z[b]);
    if (d < JOIN) link(a, b, d);
  });
  for (const a of ends) {
    const best = new Map();
    around(X[a], Z[a], END_JOIN, (b) => {
      if (L[b] === L[a]) return;
      const d = Math.hypot(X[a] - X[b], Z[a] - Z[b]);
      if (d < END_JOIN && d < (best.get(L[b])?.[1] ?? Infinity)) best.set(L[b], [b, d]);
    });
    for (const [b, d] of best.values()) if (d >= JOIN) link(a, b, d * 1.6);
  }
  // Kept packed (a phone holds one on more than one thread): each node's ways out are nbr[start[n]] to nbr[start[n + 1] - 1],
  // each so many metres (wt).
  const start = new Int32Array(N + 1);
  for (let a = 0; a < N; a++) start[a + 1] = start[a] + adj[a].length / 2;
  const nbr = new Int32Array(start[N]), wt = new Float32Array(start[N]);
  for (let a = 0; a < N; a++) for (let i = 0, k = start[a]; i < adj[a].length; i += 2, k++) { nbr[k] = adj[a][i]; wt[k] = adj[a][i + 1]; }
  GRAPH = { X: Float64Array.from(X), Z: Float64Array.from(Z), N, start, nbr, wt, around };
  return GRAPH;
}

// The nearest node of the graph to (x, z) and how far it is (within reach metres, else -1).
export function nearestRoad(x, z, reach = 400) {
  const { X, Z, around } = roadGraph();
  let k = -1, kd = reach;
  around(x, z, reach, (i) => { const d = Math.hypot(X[i] - x, Z[i] - z); if (d < kd) { kd = d; k = i; } });
  return { i: k, d: kd, x: k >= 0 ? X[k] : x, z: k >= 0 ? Z[k] : z };
}

// The way from (ax, az) to (bx, bz): along the roads wherever that's no dearer than going straight, a metre of open ground
// counting off metres of road (2 by default: a way along the roads twice as long as the straight line is still taken). A list
// of [x, z] from a to b. (onto: how far from a road a body looks for one to get onto, and off it at the far end.)
let dist = null, from = null, stamp = null, shut = null, round = 0;
export function overLand(ax, az, bx, bz, off = 2, onto = 260) {
  const { X, Z, start, nbr, wt, N, around } = roadGraph();
  if (!dist || dist.length < N + 2) { dist = new Float64Array(N + 2); from = new Int32Array(N + 2); stamp = new Uint32Array(N + 2); shut = new Uint32Array(N + 2); }
  round++;
  const S = N, T = N + 1;
  const seen = (n) => stamp[n] === round;
  const set = (n, d, f) => { dist[n] = d; from[n] = f; stamp[n] = round; };
  set(S, 0, -1);
  set(T, Math.hypot(bx - ax, bz - az) * off, S);
  const ends = (x, z) => {
    const out = [];
    around(x, z, onto, (i) => { const d = Math.hypot(X[i] - x, Z[i] - z); if (d < onto) out.push(i, d); });
    if (!out.length) { const q = nearestRoad(x, z, 1500); if (q.i >= 0) out.push(q.i, q.d); }
    return out;
  };
  const toT = new Map();
  const tn = ends(bx, bz);
  for (let i = 0; i < tn.length; i += 2) toT.set(tn[i], tn[i + 1] * off);
  const heap = [], hn = [];
  const h = (n) => Math.hypot(X[n] - bx, Z[n] - bz);   // (a metre of road at least, the rest of the way)
  const push = (n, f) => {
    heap.push(f); hn.push(n);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hn[p], hn[i]] = [hn[i], hn[p]]; i = p; }
  };
  const pop = () => {
    const n = hn[0], lf = heap.pop(), ln = hn.pop();
    if (heap.length) {
      heap[0] = lf; hn[0] = ln;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && heap[l] < heap[m]) m = l;
        if (r < heap.length && heap[r] < heap[m]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; [hn[m], hn[i]] = [hn[i], hn[m]]; i = m;
      }
    }
    return n;
  };
  const sn = ends(ax, az);
  for (let i = 0; i < sn.length; i += 2) { const n = sn[i], d = sn[i + 1] * off; if (!seen(n) || d < dist[n]) { set(n, d, S); push(n, d + h(n)); } }
  while (heap.length) {
    const n = pop();
    if (shut[n] === round) continue;
    shut[n] = round;
    const d = dist[n];
    if (d + h(n) >= dist[T]) break;
    const w = toT.get(n);
    if (w !== undefined && d + w < dist[T]) { dist[T] = d + w; from[T] = n; }
    if (n >= N) continue;
    for (let k = start[n]; k < start[n + 1]; k++) {
      const m = nbr[k], e = d + wt[k];
      if (!seen(m) || e < dist[m]) { set(m, e, n); push(m, e + h(m)); }
    }
  }
  const out = [[bx, bz]];
  for (let n = from[T]; n !== S && n >= 0; n = from[n]) out.push([X[n], Z[n]]);
  out.push([ax, az]);
  return out.reverse();
}
