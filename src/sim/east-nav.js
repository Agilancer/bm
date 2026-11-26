// Auto-play's way about City State Phobos and Castle Velscour (src/sim/nav.worker.js 'east'): streets, alleys, a house's
// stair, the wall-walk, the castle's ramps and towers and the bridges between them, one over another.
//
// The rest of the land is walked flat: a short A* on the ground round whatever's in the way (nav.worker.js local). Here
// that was never enough: a bridge over a street was the street to it, a tower's floors one floor, ten thousand houses a
// maze it saw 45 m of at a time, and it walked into walls and stood there.
//
// So the east has a map of its own, baked (tools/paths/bake.mjs, tools/paths/graph.mjs: assets/game/nav/east.bin): the
// land cut into TILE-metre squares, and in each square the pieces of floor a body walks about in without leaving it (a
// street's width, a stair's turn, a bridge's span, each floor of a tower), each a node at its middle, joined to the pieces
// next to it that a step takes it to (a drop only one way). The long way is found on that, which is quick, and the next
// few tens of metres of it walked out by the sim's own rules (src/sim/world.js: where the feet come down, max(heightFor,
// topUnder) from where they were; free where resolve doesn't push a body) on a half-metre grid round it, one over another.
//
// Every door is open to it (auto-play opens a Phobos door on its way: src/ui/autobrain.js phDoor).
//
// In the city it keeps to the streets, as a person going somewhere does (WAY_COST): a metre down the King's Mile, Ash Lane,
// the Low Road, the High Loop or the Corpse Quay costs a metre; one along an alley or across a yard on the ground, more; one
// through a house, up a stair, along the wall-walk or over a roof, more again. So it goes by the streets unless what it's
// going to is in off them, and leaves them nearest to it. It used to take whatever was shortest: through people's houses,
// along back alleys and over the wall-walk, door to door. (The castle's all floors and stairs, and is walked as it was.)
import { PHOBOS } from '../core/phobos-data.js';
import { cityIn } from '../core/east.js';
import { allWays } from '../core/roads.js';
// (And out on the plain under the Sill, outside the wall, the land's own roads: the Throne Road down from the Sill to the
// Drawbridge Gate. A metre of the plain off a road costs `plain`: it used to cut straight across, off the road it winds down
// by. A floor out there, the castle's, costs a metre as it did.)
// (plain 1.8, not 1.5: on Phobos's Outwall, with paths to every place, it still walked half its way off them.)
export const WAY_COST = { street: 1, ground: 2.5, floor: 4, plain: 1.8 };
// (North and south, out to the Outwall's Ditch Road, z -893 and 893, and the places on it: at 860, the road was off the map, and
// auto-play crossed open ground forty metres off it, along the edge, from Ashfold and the Hithe east.)
export const CELL = 0.5, X0 = 9000, Z0 = -920, X1 = 11720, Z1 = 920, TILE = 4;
// (RISE: the land's own slope never stops the sim's feet, steep as it is: only a deck more than a step over them, or a box
// they'd walk into. So a cell's climb is let up to RISE, dear past STEEP; a drop of more than DROP isn't taken.)
export const BODY = 0.36, RISE = 3, STEEP = 0.75, DROP = 1.1;
// (Down the land itself, from land: as far as up it. The sim's feet go down a crag's face as they go up it; held to DROP there,
// a way along a steep side was one-way across it, and auto-play walked to and fro under the castle's crag for good.)
// (Room over the head: nothing walked on or stood on from a step over the feet to 1.2 m. Under a drawbridge's edge, a deck a
// metre up, the way walked on along the bank while the sim's feet were lifted onto the deck at every step. Not higher: a
// spiral's third tread over its foot is 1.5 m up, and its foot must be stood on. On the land only: a stair's last treads
// run in under the landing they come up to, and are walked, the feet lifted onto it: so they were lost, and with them every
// corner tower's stair up to the city's walk.)
export const headroom = (w, x, z, y) => y > w.landAt(x, z) + 0.05 || Math.max(w.heightFor(x, z, y + 0.5), w.topUnder(x, z, y + 1.2)) <= y + 0.75;
export const dropOf = (fromLand, toLand) => (fromLand && toLand ? RISE : DROP);
// (Onto a floor, a stair's tread or a deck, from one half-metre cell to the next: no more than this. The sim lifts the feet
// onto a floor only within 0.7 of them, a tick at a time; on the land there's no such limit, RISE.)
export const SLOP = 0.3;
export const FLOOR_RISE = 1.0;
export const GW = Math.round((X1 - X0) / CELL), GH = Math.round((Z1 - Z0) / CELL);
// (In it, with room round the edge for a search.)
export const inEast = (x, z) => x > X0 + 12 && x < X1 - 12 && z > Z0 + 12 && z < Z1 - 12;
// (Still on it, for a walker with a way on it in hand: inside the box itself, by a few metres. Out on the Outwall, the Tan Pits'
// yard lies on inEast's own edge, z 848: in, the way steered it south to the road; out, across country steered it north at
// the wall; a frame each, and it stood there pressed, going nowhere. src/ui/autobrain.js eastWalk. And not only inside: Ashfold
// stands just north of the box, z -870, and the way east from it runs the box's own edge row; with the line at z -857, it
// stood on it, a frame in and a frame out, for minutes in all. A way in hand is kept a dozen metres past the edge, then.)
export const onEast = (x, z) => x > X0 - 12 && x < X1 + 12 && z > Z0 - 12 && z < Z1 + 12;
// (A point brought onto the box, for asking a way from just outside it.)
export const intoEast = (x, z) => [Math.min(X1 - 1, Math.max(X0 + 1, x)), Math.min(Z1 - 1, Math.max(Z0 + 1, z))];
// Where the long way in starts from outside: the road before the Drawbridge Gate (tools/paths/map.mjs floods from it).
export const EAST_DOOR = [9240, 0];

// (FINE_BUDGET: one half-metre search's cells at most; ROUTE_BUDGET: all of one route's together, so no ask keeps a phone's
// nav thread for long: a way the near search can't walk out is left to the long way's nodes, asked again on the way.)
const ROOMY = 0.62, CLOSE_COST = 1.6, FINE_BUDGET = 16000, ROUTE_BUDGET = 40000, AHEAD = 40;

export class EastNav {
  constructor(buf, world) {
    this.world = world;
    const dv = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer, buf.byteOffset || 0);
    const [magic, TW, TH, nodes, edges] = [0, 4, 8, 12, 16].map((o) => dv.getUint32(o, true));
    if (magic !== 0x54534145) throw new Error('east.bin: not a walking map');
    this.TW = TW; this.TH = TH; this.N = nodes;
    let o = 20;
    const counts = new Uint8Array(dv.buffer, dv.byteOffset + o, TW * TH); o += TW * TH;
    this.tileStart = new Uint32Array(TW * TH + 1);
    for (let t = 0; t < TW * TH; t++) this.tileStart[t + 1] = this.tileStart[t] + counts[t];
    this.x = new Float32Array(nodes); this.z = new Float32Array(nodes); this.y = new Float32Array(nodes);
    this.eStart = new Uint32Array(nodes + 1);
    const ne = new Uint8Array(nodes);
    for (let t = 0, n = 0; t < TW * TH; t++) {
      const ti = t % TW, tj = (t / TW) | 0;
      for (let k = 0; k < counts[t]; k++, n++) {
        const b = o + n * 5;
        this.x[n] = X0 + ti * TILE + dv.getUint8(b) / 256 * TILE;
        this.z[n] = Z0 + tj * TILE + dv.getUint8(b + 1) / 256 * TILE;
        this.y[n] = dv.getInt16(b + 2, true) / 20;
        ne[n] = dv.getUint8(b + 4);
      }
    }
    o += nodes * 5;
    for (let n = 0; n < nodes; n++) this.eStart[n + 1] = this.eStart[n] + ne[n];
    // (Lengths kept as the file has them, tenths of a metre in a byte: three million steps, and a phone's worker to hold them.)
    this.eTo = new Uint32Array(edges); this.eLen = new Uint8Array(edges);
    for (let t = 0, n = 0; t < TW * TH; t++) {
      const ti = t % TW, tj = (t / TW) | 0;
      for (let k = 0; k < counts[t]; k++, n++) {
        for (let e = this.eStart[n]; e < this.eStart[n + 1]; e++) {
          const b = o + e * 3, d = dv.getUint8(b), ui = ti + (d % 3) - 1, uj = tj + ((d / 3) | 0) - 1;
          this.eTo[e] = this.tileStart[uj * TW + ui] + dv.getUint8(b + 1);
          this.eLen[e] = Math.max(1, dv.getUint8(b + 2));
        }
      }
    }
    this.g = new Float32Array(nodes); this.par = new Int32Array(nodes); this.seen = new Uint32Array(nodes); this.shut = new Uint32Array(nodes);
    this.stamp = 0; this.spent = 0;
    this.cache = new Map();
    // (Which pieces are got to from the gate road at all: a roof, a sealed room, a wall's top are never a way's end, or a
    // wide place asked for (a fort, a hub) had its nearest sixty-four all up on its roofs.)
    this.live = new Uint8Array(nodes);
    { const q = []; for (const n of this.nodesNear(EAST_DOOR[0], EAST_DOOR[1], null, 8)) { this.live[n] = 1; q.push(n); }
      for (let h = 0; h < q.length; h++) { const n = q[h]; for (let e = this.eStart[n]; e < this.eStart[n + 1]; e++) { const m = this.eTo[e]; if (!this.live[m]) { this.live[m] = 1; q.push(m); } } } }
    this.tmp = [0, 0, 0];
    // (Which TILE squares a street runs through, to within its width: the same raster for the long way and the walk out.)
    // (0: out of the city; 1: in it, off the streets; 2: on one; 3: out of it, on one of the land's roads.)
    this.street = new Uint8Array(TW * TH);
    for (let k = 0; k < TW * TH; k++) if (cityIn(X0 + (k % TW + 0.5) * TILE, Z0 + (((k / TW) | 0) + 0.5) * TILE) < 0.97) this.street[k] = 1;
    for (const st of PHOBOS.streets) for (let i = 0; i + 1 < st.pts.length; i++) {
      const [ax, az] = st.pts[i], [bx, bz] = st.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, w = st.w + 0.5;
      for (let t = 0; t <= L; t += 1) for (let o = -w; o <= w; o += 1) { const k = this.tileOf(ax + ux * t - uz * o, az + uz * t + ux * o); if (k >= 0 && this.street[k]) this.street[k] = 2; }
    }
    for (const way of allWays()) for (let i = 0; i + 1 < way.pts.length; i++) {
      const [ax, az] = way.pts[i], [bx, bz] = way.pts[i + 1];
      if (Math.max(ax, bx) < X0 || Math.min(ax, bx) > X1 || Math.max(az, bz) < Z0 || Math.min(az, bz) > Z1) continue;
      const L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L, w = way.w + 1;
      for (let t = 0; t <= L; t += 1) for (let o = -w; o <= w; o += 1) { const k = this.tileOf(ax + ux * t - uz * o, az + uz * t + ux * o); if (k >= 0 && !this.street[k]) this.street[k] = 3; }
    }
    // (Each node's cost a metre, worked out the first time a search comes to it: 0 not yet.)
    this.wcost = new Float32Array(nodes);
  }

  // What a metre at (x, z), at height y, costs (WAY_COST): a street's, the ground's off one, or a floor's. Out of the city, a metre.
  wayCost(x, z, y, onLand) {
    const k = this.tileOf(x, z), s = k >= 0 ? this.street[k] : 0;
    if (s === 3) return 1;
    const land = onLand ?? y <= this.world.landAt(x, z) + 0.05;
    if (!s) return land ? WAY_COST.plain : 1;
    if (!land) return WAY_COST.floor;
    return s === 2 ? WAY_COST.street : WAY_COST.ground;
  }
  costOf(n) { return this.wcost[n] || (this.wcost[n] = this.wayCost(this.x[n], this.z[n], this.y[n])); }

  // ---- the sim's rules, at a half-metre cell's middle (kept: the ground never changes; the doors are all open to it)
  // (Settled: feet set down on a stair's last tread are lifted onto the deck it runs into the next tick, as heightFor takes
  // the highest floor within a step of the feet; so again from there, till they stay. tools/paths/bake-worker.mjs, the same.)
  ground(x, z, y) {
    const w = this.world;
    let g = Math.max(w.heightFor(x, z, y), w.topUnder(x, z, y + 0.2));
    for (let k = 0; k < 6; k++) { const h = Math.max(w.heightFor(x, z, g), w.topUnder(x, z, g + 0.2)); if (Math.abs(h - g) < 0.005) break; g = h; }
    return g;
  }
  fits(x, z, y, r = BODY) { const t = this.tmp; t[0] = x; t[2] = z; this.world.resolve(t, r, y + 0.2, true); return Math.abs(t[0] - x) + Math.abs(t[2] - z) < 0.004 && headroom(this.world, x, z, y); }
  // The place a body comes down on stepping into cell (i, j) from height y: [its height, fits, roomy], cached.
  land(i, j, y) {
    const key = (j * GW + i) * 8192 + Math.round(y * 4) + 4096;
    let v = this.cache.get(key);
    if (v === undefined) {
      if (this.cache.size > 60000) this.cache.clear();   // (a few streets' worth: kept small for a phone)
      const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL, g = this.ground(x, z, y);
      const ok = this.fits(x, z, g), W = this.world;
      // (Roomy: clear of walls by more than a body, and no drop of more than a step within a hand of it either: a stair's
      // open side, a spiral's newel, a deck's edge are walked along in their middles.)
      let edge = false;
      if (ok) for (const [dx, dz] of [[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]) if (g - Math.max(W.heightFor(x + dx, z + dz, g), W.topUnder(x + dx, z + dz, g + 0.2)) > 1.2) { edge = true; break; }
      v = [g, ok, ok && !edge && this.fits(x, z, g, ROOMY), g <= W.landAt(x, z) + 0.05];
      this.cache.set(key, v);
    }
    return v;
  }

  tileOf(x, z) {
    const i = Math.floor((x - X0) / TILE), j = Math.floor((z - Z0) / TILE);
    return i < 0 || j < 0 || i >= this.TW || j >= this.TH ? -1 : j * this.TW + i;
  }
  // The nodes within r metres of (x, z), at about height y (any, with y null), nearest first.
  nodesNear(x, z, y, r, dy = 3) {
    const out = [];
    const i0 = Math.floor((x - r - X0) / TILE), i1 = Math.floor((x + r - X0) / TILE), j0 = Math.floor((z - r - Z0) / TILE), j1 = Math.floor((z + r - Z0) / TILE);
    for (let j = Math.max(0, j0); j <= Math.min(this.TH - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.TW - 1, i1); i++) {
      const t = j * this.TW + i;
      for (let n = this.tileStart[t]; n < this.tileStart[t + 1]; n++) {
        if (y !== null && Math.abs(this.y[n] - y) > dy) continue;
        const d = Math.hypot(this.x[n] - x, this.z[n] - z);
        if (d <= r) out.push([n, d + (y === null ? 0 : Math.abs(this.y[n] - y) * 0.5)]);
      }
    }
    return out.sort((a, b) => a[1] - b[1]).map((p) => p[0]);
  }

  // ---- the long way: A* over the nodes, from any of `from` (node -> cost so far) to any of `goal` (a Set), or null.
  coarse(from, goal, tx, tz, budget = 3000000) {   // (a walk across the whole east is a million pops and more)
    if (++this.stamp > 4e9) { this.stamp = 1; this.seen.fill(0); this.shut.fill(0); }
    const S = this.stamp, heap = [];
    const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= f) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= heap[i][0]) break; [heap[i], heap[c]] = [heap[c], heap[i]]; i = c; } } return top[1]; };
    const h = (n) => Math.hypot(this.x[n] - tx, this.z[n] - tz);
    for (const [n, c] of from) { this.seen[n] = S; this.g[n] = c; this.par[n] = -1; push(n, c + h(n)); }
    while (heap.length && budget-- > 0) {
      const n = pop();
      if (this.shut[n] === S) continue;
      this.shut[n] = S;
      if (goal.has(n)) { const out = []; for (let k = n; k >= 0; k = this.par[k]) out.push(k); return out.reverse(); }
      for (let e = this.eStart[n]; e < this.eStart[n + 1]; e++) {
        const m = this.eTo[e];
        if (this.shut[m] === S) continue;
        const ng = this.g[n] + this.eLen[e] * 0.1 * (this.costOf(n) + this.costOf(m)) * 0.5;
        if (this.seen[m] === S && ng >= this.g[m]) continue;
        this.seen[m] = S; this.g[m] = ng; this.par[m] = n;
        push(m, ng + h(m));
      }
    }
    return null;
  }

  // ---- the next stretch, walked out: A* on the half-metre grid from (x, y, z) to whichever of `marks` ([x, z, y|null, r]) it
  // comes to first, over the box from lo to hi. [[x, z, y], ...] (pulled straight) and which mark, or null.
  fine(fx, fy, fz, marks, lo, hi, budget = FINE_BUDGET) {
    const i0 = Math.max(0, Math.floor((lo[0] - X0) / CELL)), i1 = Math.min(GW - 1, Math.floor((hi[0] - X0) / CELL));
    const j0 = Math.max(0, Math.floor((lo[1] - Z0) / CELL)), j1 = Math.min(GH - 1, Math.floor((hi[1] - Z0) / CELL));
    const si = Math.floor((fx - X0) / CELL), sj = Math.floor((fz - Z0) / CELL);
    if (si < i0 || si > i1 || sj < j0 || sj > j1) return null;
    const key = (i, j, y) => ((j - j0) * (i1 - i0 + 1) + (i - i0)) * 8192 + Math.round(y * 4) + 4096;
    const G = new Map(), P = new Map(), Y = new Map(), shut = new Set(), heap = [];
    const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= f) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= heap[i][0]) break; [heap[i], heap[c]] = [heap[c], heap[i]]; i = c; } } return top[1]; };
    const hOf = (x, z) => { let b = Infinity; for (const m of marks) b = Math.min(b, Math.max(0, Math.hypot(x - m[0], z - m[1]) - m[3])); return b; };
    const at = (k) => { const c = Math.floor(k / 8192), i = i0 + (c % (i1 - i0 + 1)), j = j0 + Math.floor(c / (i1 - i0 + 1)); return [i, j]; };
    // (The start: where the feet are, as the sim has them; or, wedged against something, the nearest free place round it.)
    let sy = this.ground(X0 + (si + 0.5) * CELL, Z0 + (sj + 0.5) * CELL, fy + 0.3);
    const s = key(si, sj, sy);
    G.set(s, 0); P.set(s, -1); Y.set(s, sy); push(s, hOf(fx, fz));
    let found = -1, mark = -1;
    const b0 = budget;
    while (heap.length && budget-- > 0) {
      const k = pop();
      if (shut.has(k)) continue;
      shut.add(k);
      const [i, j] = at(k), y = Y.get(k), x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL, here = y <= this.world.landAt(x, z) + 0.05;
      for (let q = 0; q < marks.length; q++) {
        const m = marks[q];
        if (Math.hypot(x - m[0], z - m[1]) <= m[3] && (m[2] === null || m[2] === undefined || Math.abs(y - m[2]) < 1.6)) { found = k; mark = q; break; }
      }
      if (found >= 0) break;
      const step = [];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < i0 || ni > i1 || nj < j0 || nj > j1) { step.push(null); continue; }
        const v = this.land(ni, nj, y);
        // (Up: clear at the height it steps from, too, as the sim moves the feet before it lifts them. tools/paths/bake-worker.mjs.)
        if (v[1] && v[0] > y + 0.01 && !this.fits(X0 + (ni + 0.5) * CELL, Z0 + (nj + 0.5) * CELL, y)) { step.push(null); continue; }
        step.push(v[1] && v[0] - y <= (v[3] ? RISE : FLOOR_RISE) && y - v[0] <= dropOf(here, v[3]) ? [ni, nj, v[0], v[2] ? 1 : CLOSE_COST] : null);
      }
      // (On the slant only where both ways round the corner are open and come down about level with it.)
      for (const [a, b] of [[0, 2], [0, 3], [1, 2], [1, 3]]) {
        if (!step[a] || !step[b]) continue;
        const ni = step[a][0], nj = step[b][1], v = this.land(ni, nj, y);
        if (v[1] && !(v[0] > y + 0.01 && !this.fits(X0 + (ni + 0.5) * CELL, Z0 + (nj + 0.5) * CELL, y)) && v[0] - y <= (v[3] ? RISE : FLOOR_RISE) && y - v[0] <= dropOf(here, v[3]) && Math.abs(v[0] - step[a][2]) < RISE && Math.abs(v[0] - step[b][2]) < RISE) step.push([ni, nj, v[0], (v[2] ? 1 : CLOSE_COST) * Math.SQRT2]);
      }
      for (const st of step) {
        if (!st) continue;
        const [ni, nj, ny, c] = st, nk = key(ni, nj, ny);
        if (shut.has(nk)) continue;
        const nx = X0 + (ni + 0.5) * CELL, nz = Z0 + (nj + 0.5) * CELL;
        const ng = G.get(k) + c * CELL * this.wayCost(nx, nz, ny, this.land(ni, nj, y)[3]) + Math.max(0, ny - y) * 0.6 + Math.max(0, Math.abs(ny - y) - STEEP) * 6;
        const old = G.get(nk);
        if (old !== undefined && ng >= old) continue;
        G.set(nk, ng); P.set(nk, k); Y.set(nk, ny);
        push(nk, ng + hOf(X0 + (ni + 0.5) * CELL, Z0 + (nj + 0.5) * CELL));
      }
    }
    this.spent += b0 - Math.max(0, budget);
    if (found < 0) return null;
    const cells = [];
    for (let k = found; k >= 0; k = P.get(k)) { const [i, j] = at(k); cells.push([X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, Y.get(k)]); }
    cells.reverse();
    return { pts: this.pull([[fx, fz, sy]].concat(cells.slice(1))), mark };
  }

  // A straight walk from a to b, as the feet would go: never a step too high or too far down, never pushed by a wall, and
  // (so a line isn't drawn along one) never within ROOMY of one where neither end is.
  // (On a floor, as the sim lifts feet onto one: only within 0.7 of where they are, a tick at a time, a fifth of a metre a
  // tick at a run. Taken as the land is, a line across a spiral stair's inner edge, where the treads crowd in, went up three
  // of them in a stride: the feet stayed under them and it dropped back to the foot. tools/paths/trips.mjs.)
  // (Over floors, the line a hand to either side too: the feet are never on the line itself, and a spiral's chord walked
  // half a metre off it went in over the well and down to the foot. tools/paths/trips.mjs.)
  walkable(a, b) {
    const on = this.line(a, b, 0);
    if (on !== 1) return on === 0;
    return this.line(a, b, SLOP) !== false && this.line(a, b, -SLOP) !== false;
  }
  // (0: walkable all on land; 1: walkable, over a floor somewhere; false: not. Off: that far to its left.)
  line(a, b, off) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 0.2)), W = this.world;
    const ox = d > 0 ? -(b[1] - a[1]) / d * off : 0, oz = d > 0 ? (b[0] - a[0]) / d * off : 0;
    let y = a[2], floor = 0, was = y <= W.landAt(a[0], a[1]) + 0.05;
    for (let q = 1; q <= n; q++) {
      const x = a[0] + (b[0] - a[0]) * q / n + ox * Math.min(1, q, n - q), z = a[1] + (b[1] - a[1]) * q / n + oz * Math.min(1, q, n - q);
      const g = Math.max(W.heightFor(x, z, y), W.topUnder(x, z, y + 0.2)), land = g <= W.landAt(x, z) + 0.05;
      if (g - y > (land ? RISE * 0.4 + 0.12 : 0.6) || y - g > dropOf(was, land) * 0.4 + 0.1 || (!off && (!this.fits(x, z, g, BODY + 0.06) || (g > y + 0.01 && !this.fits(x, z, y))))) return false;
      if (!land) floor = 1;
      y = g; was = land;
    }
    return Math.abs(y - b[2]) < 0.6 ? floor : false;
  }
  pull(pts) {
    const out = [pts[0]];
    let a = 0;
    while (a < pts.length - 1) {
      let b = Math.min(pts.length - 1, a + 40);
      while (b > a + 1 && !this.walkable(pts[a], pts[b])) b--;
      out.push(pts[b]);
      a = b;
    }
    return out;
  }

  // From (x, y, z) to (tx, tz) (at about ty, if it's given; within r): the way, as [[x, z, close, door, y], ...]: walked out
  // to about AHEAD metres on, then the long way's nodes on from there (close = 2: not walked out yet: ask again on the way).
  // Null: there's no way there.
  route(from, to, r = 1) {
    const [fx, fy, fz] = from, [tx, tz] = to, ty = to[2] ?? null;
    this.spent = 0;
    const left = (cap = FINE_BUDGET) => Math.max(0, Math.min(cap, ROUTE_BUDGET - this.spent));
    // (Near: one walk out, all the way.)
    if (Math.hypot(tx - fx, tz - fz) < 26 && (ty === null || Math.abs(ty - fy) < 8)) {
      const lo = [Math.min(fx, tx) - 14, Math.min(fz, tz) - 14], hi = [Math.max(fx, tx) + 14, Math.max(fz, tz) + 14];
      const f = this.fine(fx, fy, fz, [[tx, tz, ty, r]], lo, hi, left());
      if (f) return f.pts.map((p) => [p[0], p[1], 0, -1, p[2]]);
    }
    // The nodes it can start from: those near it that the half-metre walk gets to first.
    let near = this.nodesNear(fx, fz, fy, 7, 4);
    if (!near.length) return null;
    // (Only places got to from the gate: and none so near, the nearest further off that are, as a spire's crown is a step or
    // two from its deck's: "no way there" from where it stood, else.)
    { let on = near.filter((n) => this.live[n]); if (!on.length) on = this.nodesNear(fx, fz, fy, 20, 6).filter((n) => this.live[n]); if (on.length) near = on; }
    const start = this.fine(fx, fy, fz, near.slice(0, 24).map((n) => [this.x[n], this.z[n], this.y[n], 0.6]), [fx - 10, fz - 10], [fx + 10, fz + 10], left(6000));
    const s0 = start ? near[start.mark] : near[0];
    const ends = this.nodesNear(tx, tz, ty, Math.max(4, Math.min(r + 2, 30)), ty === null ? 1e9 : 3).filter((n) => this.live[n]);
    if (!ends.length) return null;
    const path = this.coarse([[s0, 0]], new Set(ends.slice(0, 64)), tx, tz);
    if (!path) return null;
    // Walked out: from where it stands through the nodes, a stretch at a time, as far as AHEAD.
    const out = [[fx, fz, 0, -1, fy]];
    let cx = fx, cy = fy, cz = fz, k = 0, gone = 0;
    while (k < path.length && gone < AHEAD) {
      // (The node a dozen metres on, or the last: walked to round anything, over the box round the nodes between.)
      let e = k, run = 0;
      while (e + 1 < path.length && run < 12) { run += Math.hypot(this.x[path[e + 1]] - this.x[path[e]], this.z[path[e + 1]] - this.z[path[e]]); e++; }
      const last = e === path.length - 1;
      let lo = [cx, cz], hi = [cx, cz];
      for (let q = k; q <= e; q++) { lo = [Math.min(lo[0], this.x[path[q]]), Math.min(lo[1], this.z[path[q]])]; hi = [Math.max(hi[0], this.x[path[q]]), Math.max(hi[1], this.z[path[q]])]; }
      lo = [lo[0] - 8, lo[1] - 8]; hi = [hi[0] + 8, hi[1] + 8];
      const goal = last ? [[tx, tz, ty, r], [this.x[path[e]], this.z[path[e]], this.y[path[e]], 0.4]] : [[this.x[path[e]], this.z[path[e]], this.y[path[e]], 0.6]];
      if (left() < 1500) break;
      const f = this.fine(cx, cy, cz, goal, lo, hi, left());
      if (!f) break;
      for (const p of f.pts.slice(1)) out.push([p[0], p[1], 0, -1, p[2]]);
      const lp = f.pts.at(-1);
      gone += Math.hypot(lp[0] - cx, lp[1] - cz);
      [cx, cz, cy] = lp;
      k = e;
      if (last) {
        if (f.mark === 0) return out;
        // (At the last node, and the place asked for is a step or two on: a last walk out to it.)
        const g = this.fine(cx, cy, cz, [[tx, tz, ty, r]], [Math.min(cx, tx) - 8, Math.min(cz, tz) - 8], [Math.max(cx, tx) + 8, Math.max(cz, tz) + 8], left());
        if (g) for (const p of g.pts.slice(1)) out.push([p[0], p[1], 0, -1, p[2]]);
        return out;
      }
    }
    // (The rest by the long way's nodes, to be walked out as it comes to them.)
    for (let q = k + 1; q < path.length; q++) if (q === path.length - 1 || q % 3 === 0) out.push([this.x[path[q]], this.z[path[q]], 2, -1, this.y[path[q]]]);
    out.push([tx, tz, 2, -1, ty ?? this.y[path.at(-1)]]);
    return out;
  }
}
