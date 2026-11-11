// Where the townsfolk can walk: the same boxes and floors the player walks on (assets/game/village.json and the houses'
// insides in interior.json), worked into two walking grids at half a metre, the ground (the land, and every house's ground
// floor) and upstairs, joined at each house's stair. A* finds the way; then the way is pulled straight wherever it can see.
// The doors count as open: the folk open them as they go (src/folk/brain.js asks the main thread).
import { homeFloor, setFloors } from '../core/interior.js';
import { PATHS, CAVE_PATH, terrainHeight } from '../core/terrain.js';

export const CELL = 0.5;
const HASH = 4;
const UP = 2.2;               // feet above this are upstairs (RAIL_Y in tools/interior/build_interior.py)
// What a step costs, for the way people choose (a step on a road or a lane, clear of everything, costs 1):
const GRASS = 0.8;            // this much more over grass: they'll go most of twice as far round to keep to a worn way
const BESIDE = [1.2, 0.5, 0.15];   // and this much more one, two and three cells from a wall, a fence or a table: nobody walks along rubbing one
const SQUARE = [-1.5, 1, 8];  // the square round the well, worn bare: x, z, radius (pathAmount in src/core/terrain.js)
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Ground {
  // bounds: [x0, z0, x1, z1] of the land the town's walking is worked out for.
  constructor(village, interior, bounds, radius = 0.24) {
    setFloors(interior.floors, interior.homes);
    this.colliders = village.colliders.concat(interior.colliders).map((c) => ({ ...c, s: Math.sin(c.yaw || 0), co: Math.cos(c.yaw || 0) }));
    // The doors' shut leaves never stand in anyone's way here; their open ones lie against the wall.
    for (const t of interior.things || []) {
      if (t.type === 'door' && t.ajar) this.colliders.push({ ...t.ajar, s: 0, co: 1 });
    }
    this.hash = new Map();
    for (const c of this.colliders) {
      const R = Math.hypot(c.hx, c.hz) + 1;   // (and a metre round, for whoever's brushing it)
      for (let i = Math.floor((c.x - R) / HASH); i <= Math.floor((c.x + R) / HASH); i++) {
        for (let j = Math.floor((c.z - R) / HASH); j <= Math.floor((c.z + R) / HASH); j++) {
          const k = i * 100003 + j;
          if (!this.hash.has(k)) this.hash.set(k, []);
          this.hash.get(k).push(c);
        }
      }
    }
    this.homes = interior.homes;
    [this.x0, this.z0, this.x1, this.z1] = bounds;
    this.W = Math.ceil((this.x1 - this.x0) / CELL);
    this.H = Math.ceil((this.z1 - this.z0) / CELL);
    this.radius = radius;
    // Land heights, cached on a 1 m grid over the bounds.
    this.hw = Math.ceil(this.x1 - this.x0) + 2;
    this.hh = Math.ceil(this.z1 - this.z0) + 2;
    this.land = new Float32Array(this.hw * this.hh);
    for (let j = 0; j < this.hh; j++) for (let i = 0; i < this.hw; i++) this.land[j * this.hw + i] = terrainHeight(this.x0 + i, this.z0 + j);
    this.levels = [this.build(0), this.build(1)];
    this.costs = [this.price(0), this.price(1)];
    // Which stretch of ground each free cell is part of: one walk can reach another only within the same one.
    this.parts = this.levels.map((g) => this.label(g));
    this.g = new Float32Array(this.W * this.H);
    this.from = new Int32Array(this.W * this.H);
    this.seen = new Uint32Array(this.W * this.H);     // this search has reached it
    this.shut = new Uint32Array(this.W * this.H);     // this search is done with it
    // The open list: a binary heap of (f, cell), a cell in it more than once if a shorter way to it turned up.
    this.heapF = new Float32Array(this.W * this.H * 2);
    this.heapC = new Int32Array(this.W * this.H * 2);
    this.stamp = 0;
  }

  landHeight(x, z) {
    const u = x - this.x0, v = z - this.z0;
    if (u < 0 || v < 0 || u >= this.hw - 1 || v >= this.hh - 1) return terrainHeight(x, z);
    const i = u | 0, j = v | 0, a = u - i, b = v - j, h = this.land, w = this.hw, k = j * w + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + w] * (1 - a) + h[k + w + 1] * a) * b;
  }

  // The floor under someone whose feet are at y: a house's (the highest they could have stepped up to), or the land.
  heightFor(x, z, y) {
    return homeFloor(x, z, y) ?? this.landHeight(x, z);
  }

  // Which house (index into interior.homes) a point is inside, or -1.
  houseAt(x, z) {
    for (let i = 1; i < this.homes.length; i++) {
      const g = this.homes[i].ground;
      if (g && x >= g[0] && x <= g[2] && z >= g[1] && z <= g[3]) return i;
    }
    return -1;
  }

  // Would a body of radius r with its feet at `feet` stand in a box here?
  blocked(x, z, r, feet) {
    const list = this.hash.get(Math.floor(x / HASH) * 100003 + Math.floor(z / HASH));
    if (!list) return false;
    for (const c of list) {
      if (feet > (c.t ?? c.h + 0.02 + this.heightFor(c.x, c.z, 0.5)) || c.b && feet < c.b) continue;   // (b: under an upstairs floor; land a little below 0 is still under a wall)
      const dx = x - c.x, dz = z - c.z;
      if (Math.abs(dx * c.co - dz * c.s) < c.hx + r && Math.abs(dx * c.s + dz * c.co) < c.hz + r) return true;
    }
    return false;
  }

  // Push a circle out of the boxes it's in (as World.resolve does for the player).
  resolve(out, r, feet) {
    let x = out[0], z = out[2], hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const list = this.hash.get(Math.floor(x / HASH) * 100003 + Math.floor(z / HASH));
      if (!list) break;
      for (const c of list) {
        if (feet > (c.t ?? c.h + 0.02 + this.heightFor(c.x, c.z, 0.5)) || c.b && feet < c.b) continue;   // (b: under an upstairs floor; land a little below 0 is still under a wall)
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.co - dz * c.s, lz = dx * c.s + dz * c.co;
        const qx = Math.abs(lx) - c.hx, qz = Math.abs(lz) - c.hz;
        if (qx > r || qz > r) continue;
        const sx = lx < 0 ? -1 : 1, sz = lz < 0 ? -1 : 1;
        let px = 0, pz = 0;
        if (qx > 0 && qz > 0) {
          const d = Math.hypot(qx, qz);
          if (d >= r) continue;
          px = sx * qx / d * (r - d); pz = sz * qz / d * (r - d);
        } else if (qx > qz) px = sx * (r - qx); else pz = sz * (r - qz);
        x += px * c.co + pz * c.s; z += -px * c.s + pz * c.co;
        hit = true;
      }
    }
    out[0] = x; out[2] = z;
    return hit;
  }

  // A walking grid: 0 free, 1 blocked. Level 0 is the ground and the houses' ground floors, level 1 their upstairs.
  build(level) {
    const g = new Uint8Array(this.W * this.H).fill(1);
    const r = this.radius;
    for (let j = 0; j < this.H; j++) {
      for (let i = 0; i < this.W; i++) {
        const x = this.x0 + (i + 0.5) * CELL, z = this.z0 + (j + 0.5) * CELL;
        let feet;
        if (level === 0) {
          const f = homeFloor(x, z, 0.5);
          feet = f ?? this.landHeight(x, z);
          if (f !== null && f > 1.2) continue;     // (under a stair's high end)
        } else {
          const f = homeFloor(x, z, 9);
          if (f === null || f < UP) continue;
          feet = f;
        }
        if (!this.blocked(x, z, r, feet + 0.05)) g[j * this.W + i] = 0;
      }
    }
    return g;
  }

  // How worn the ground is at a point, 0 grass to 1 the middle of a road, a lane or the square: the same ways the land is painted
  // with (PATHS in src/core/terrain.js), without the ragged edge the paint has.
  worn(x, z) {
    if (!this.ways) {
      this.ways = [];
      for (const p of PATHS) {
        if (p === CAVE_PATH) continue;
        for (let i = 0; i + 1 < p.pts.length; i++) {
          const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1], m = p.w * 1.1;
          if (Math.max(ax, bx) + m < this.x0 || Math.min(ax, bx) - m > this.x1 || Math.max(az, bz) + m < this.z0 || Math.min(az, bz) - m > this.z1) continue;
          this.ways.push([ax, az, bx - ax, bz - az, (bx - ax) ** 2 + (bz - az) ** 2 || 1, p.w]);
        }
      }
    }
    let best = 1 - sstep(SQUARE[2] - 2, SQUARE[2] + 1.5, Math.hypot(x - SQUARE[0], z - SQUARE[1]));
    for (const [ax, az, dx, dz, L2, w] of this.ways) {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
      if (d < w * 1.1) best = Math.max(best, 1 - sstep(w * 0.5, w * 1.1, d));
    }
    return best;
  }

  // What a step onto each cell costs (see GRASS and BESIDE): 1 at the least, so the straight-line guess A* goes by never
  // overshoots.
  price(level) {
    const W = this.W, H = this.H, g = this.levels[level], cost = new Float32Array(W * H).fill(1);
    // How many cells each free cell is from a blocked one, as far as BESIDE counts: a flood out from the walls.
    const far = new Uint8Array(W * H).fill(255);
    let edge = [];
    for (let c = 0; c < W * H; c++) if (g[c]) { far[c] = 0; edge.push(c); }
    for (let d = 1; d <= BESIDE.length; d++) {
      const next = [];
      for (const c of edge) {
        const ci = c % W, cj = (c / W) | 0;
        for (let k = 0; k < 8; k++) {
          const i = ci + [1, -1, 0, 0, 1, 1, -1, -1][k], j = cj + [0, 0, 1, -1, 1, -1, 1, -1][k];
          if (i < 0 || j < 0 || i >= W || j >= H) continue;
          const n = j * W + i;
          if (far[n] > d) { far[n] = d; next.push(n); }
        }
      }
      edge = next;
    }
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const c = j * W + i;
        if (g[c]) continue;
        const x = this.x0 + (i + 0.5) * CELL, z = this.z0 + (j + 0.5) * CELL;
        // (Indoors and upstairs every step is the same price, the shortest way through a room: rooms are too close for
        // anyone to keep off the furniture, and all of them on the one line down the middle of the floor only get in each
        // other's way.)
        if (level !== 0 || this.houseAt(x, z) > 0) continue;
        const v = 1 + (far[c] <= BESIDE.length ? BESIDE[far[c] - 1] : 0) + GRASS * (1 - this.worn(x, z));
        cost[c] = v;
      }
    }
    return cost;
  }

  // What walking straight from a to b costs, in the same coin as A*'s steps; Infinity if it leaves the free cells.
  toll(level, ax, az, bx, bz) {
    const g = this.levels[level], cost = this.costs[level];
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (CELL * 0.5)));
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      const t = k / n, c = this.cell(ax + (bx - ax) * t, az + (bz - az) * t);
      if (c < 0 || g[c]) { if (k === 0 || k === n) continue; return Infinity; }
      sum += cost[c] * (k === 0 || k === n ? 0.5 : 1);
    }
    return sum * L / n / CELL;
  }

  // Flood the free cells into parts (by the same steps A* takes). Part 0 is blocked; the biggest on the ground is the town.
  label(g) {
    const W = this.W, H = this.H, part = new Int32Array(W * H), stack = new Int32Array(W * H);
    const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
    let next = 0, size = [0];
    for (let c0 = 0; c0 < W * H; c0++) {
      if (g[c0] || part[c0]) continue;
      const id = ++next;
      let n = 0, count = 0;
      stack[n++] = c0; part[c0] = id;
      while (n) {
        const c = stack[--n], ci = c % W, cj = (c / W) | 0;
        count++;
        for (let k = 0; k < 8; k++) {
          const i = ci + DI[k], j = cj + DJ[k];
          if (i < 0 || j < 0 || i >= W || j >= H) continue;
          const d = j * W + i;
          if (g[d] || part[d]) continue;
          if (k >= 4 && (g[cj * W + i] || g[j * W + ci])) continue;
          part[d] = id; stack[n++] = d;
        }
      }
      size.push(count);
    }
    part.sizes = size;
    return part;
  }

  part(level, x, z) {
    const c = this.cell(x, z);
    return c < 0 ? 0 : this.parts[level][c];
  }

  // The nearest free cell within reach that's on the given part (the town's, say), or null.
  nearestOn(level, part, x, z, reach = 3) {
    const g = this.parts[level];
    const ci = Math.floor((x - this.x0) / CELL), cj = Math.floor((z - this.z0) / CELL);
    const n = Math.ceil(reach / CELL);
    let best = null, bd = 1e9;
    for (let dj = -n; dj <= n; dj++) {
      for (let di = -n; di <= n; di++) {
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= this.W || j >= this.H || g[j * this.W + i] !== part) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = [this.x0 + (i + 0.5) * CELL, this.z0 + (j + 0.5) * CELL]; }
      }
    }
    return best;
  }

  // Is there a wall between two points (anything standing taller than a body, not the furniture they'd step over)?
  walled(ax, az, bx, bz, feet) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.1));
    for (let k = 0; k <= n; k++) {
      const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
      const list = this.hash.get(Math.floor(x / HASH) * 100003 + Math.floor(z / HASH));
      if (!list) continue;
      for (const c of list) {
        const top = c.t ?? c.h + 0.02 + this.heightFor(c.x, c.z, 0.5);
        if (top < feet + 1.25 || feet > top || c.b && feet < c.b) continue;
        const dx = x - c.x, dz = z - c.z;
        if (Math.abs(dx * c.co - dz * c.s) < c.hx && Math.abs(dx * c.s + dz * c.co) < c.hz) return true;
      }
    }
    return false;
  }

  // The nearest cell on a part of the ground from which (x, z) can be stepped to with no wall between, or null.
  reach(level, part, x, z, feet, far = 2) {
    const g = this.parts[level];
    const ci = Math.floor((x - this.x0) / CELL), cj = Math.floor((z - this.z0) / CELL), n = Math.ceil(far / CELL);
    const cand = [];
    for (let dj = -n; dj <= n; dj++) {
      for (let di = -n; di <= n; di++) {
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= this.W || j >= this.H || g[j * this.W + i] !== part) continue;
        const px = this.x0 + (i + 0.5) * CELL, pz = this.z0 + (j + 0.5) * CELL, d = Math.hypot(px - x, pz - z);
        if (d <= far) cand.push([d, px, pz]);
      }
    }
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, px, pz] of cand) if (!this.walled(px, pz, x, z, feet)) return [px, pz];
    return null;
  }

  cell(x, z) {
    const i = Math.floor((x - this.x0) / CELL), j = Math.floor((z - this.z0) / CELL);
    return i < 0 || j < 0 || i >= this.W || j >= this.H ? -1 : j * this.W + i;
  }

  free(level, x, z) {
    const c = this.cell(x, z);
    return c >= 0 && this.levels[level][c] === 0;
  }

  // The nearest free cell to (x, z) on a level, within `reach` metres. Its centre, or null.
  nearestFree(level, x, z, reach = 3) {
    const g = this.levels[level];
    const ci = Math.floor((x - this.x0) / CELL), cj = Math.floor((z - this.z0) / CELL);
    const n = Math.ceil(reach / CELL);
    let best = null, bd = 1e9;
    for (let dj = -n; dj <= n; dj++) {
      for (let di = -n; di <= n; di++) {
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= this.W || j >= this.H || g[j * this.W + i]) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = [this.x0 + (i + 0.5) * CELL, this.z0 + (j + 0.5) * CELL]; }
      }
    }
    return best;
  }

  // Can you walk straight from a to b on this level, without leaving free cells?
  sees(level, ax, az, bx, bz) {
    const g = this.levels[level];
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / (CELL * 0.5));
    for (let k = 1; k < n; k++) {
      const t = k / n, c = this.cell(ax + (bx - ax) * t, az + (bz - az) * t);
      if (c < 0 || g[c]) return false;
    }
    return true;
  }

  // A* on one level, from a to b. A list of [x, z] points (pulled straight), or null if there's no way. The way it finds is
  // the cheapest by what each step costs (`price`): along the roads and lanes where they serve, and clear of walls. plain:
  // the shortest way and nothing else, every step the same price (for the main thread's asks: auto-play's walking).
  find(level, ax, az, bx, bz, maxNodes = 120000, plain = false) {
    const g = this.levels[level], price = plain ? null : this.costs[level];
    let s = this.cell(ax, az), t = this.cell(bx, bz);
    if (s < 0 || t < 0) return null;
    // The stretch of ground the walk is on: the goal's if it's on free ground, else the start's, else the biggest. A start
    // or a goal off it (in furniture, or a pocket of floor boxed in by it: between a bench and its table) moves to the
    // nearest cell that's on it.
    const P = this.parts[level];
    if (P.big === undefined) P.big = P.sizes.indexOf(Math.max(...P.sizes.slice(1)));
    const part = !g[t] && P.sizes[P[t]] > 40 ? P[t] : !g[s] && P.sizes[P[s]] > 40 ? P[s] : !g[t] ? P[t] : P.big;
    if (g[s] || P[s] !== part) { const p = this.nearestOn(level, part, ax, az, 3); if (!p) return null; s = this.cell(p[0], p[1]); }
    // (A goal that isn't on the ground they can walk: the walk ends as near as it gets, not through whatever's in the way.)
    if (g[t] || P[t] !== part) { const p = this.nearestOn(level, part, bx, bz, 3); if (!p) return null; t = this.cell(p[0], p[1]); [bx, bz] = p; }
    if (s === t) return [[ax, az], [bx, bz]];
    const W = this.W, stamp = ++this.stamp;
    const { from, seen, shut, heapF, heapC } = this;
    const G = this.g, cap = heapC.length;
    const tx = t % W, tz = (t / W) | 0;
    const hOf = (c) => { const dx = Math.abs(c % W - tx), dz = Math.abs(((c / W) | 0) - tz); return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)); };
    let n = 0;
    const push = (c, f) => {
      if (n >= cap) return;
      let i = n++;
      while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= f) break; heapF[i] = heapF[p]; heapC[i] = heapC[p]; i = p; }
      heapF[i] = f; heapC[i] = c;
    };
    const pop = () => {
      const top = heapC[0], lf = heapF[--n], lc = heapC[n];
      let i = 0;
      while (true) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && heapF[c + 1] < heapF[c]) c++;
        if (heapF[c] >= lf) break;
        heapF[i] = heapF[c]; heapC[i] = heapC[c]; i = c;
      }
      heapF[i] = lf; heapC[i] = lc;
      return top;
    };
    seen[s] = stamp; G[s] = 0; from[s] = -1;
    push(s, hOf(s));
    let found = false, count = 0;
    const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
    while (n > 0 && count < maxNodes) {
      const c = pop();
      if (shut[c] === stamp) continue;
      shut[c] = stamp;
      count++;
      if (c === t) { found = true; break; }
      const ci = c % W, cj = (c / W) | 0;
      for (let k = 0; k < 8; k++) {
        const i = ci + DI[k], j = cj + DJ[k];
        if (i < 0 || j < 0 || i >= W || j >= this.H) continue;
        const d = j * W + i;
        if (g[d] || shut[d] === stamp) continue;
        // No cutting a corner between two walls.
        if (k >= 4 && (g[cj * W + i] || g[j * W + ci])) continue;
        const cost = G[c] + (k >= 4 ? Math.SQRT2 : 1) * (price ? (price[c] + price[d]) * 0.5 : 1);
        if (seen[d] === stamp && cost >= G[d]) continue;
        seen[d] = stamp; G[d] = cost; from[d] = c;
        push(d, cost + hOf(d));
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = t; c >= 0; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => [this.x0 + (c % W + 0.5) * CELL, this.z0 + (((c / W) | 0) + 0.5) * CELL]);
    pts[0] = [ax, az];
    pts[pts.length - 1] = [bx, bz];
    // Pull it straight: from each kept point, the furthest one it can see, and can walk straight to for no more than the way
    // round costs (so a way that keeps to a road isn't pulled off it across the grass).
    const ok = (i, k) => (plain ? this.sees(level, pts[i][0], pts[i][1], pts[k][0], pts[k][1])
      : this.toll(level, pts[i][0], pts[i][1], pts[k][0], pts[k][1]) <= (G[cells[k]] - G[cells[i]]) * 1.02 + 0.5);
    let out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let k = pts.length - 1;
      if (plain) { while (k > i + 1 && !ok(i, k)) k--; }
      else {
        // (By halves, not one at a time: a long way has hundreds of cells, and each look along it is a walk of its own.)
        k = Math.min(k, i + 96);
        while (k > i + 1 && !ok(i, k)) k = i + Math.max(1, (k - i) >> 1);
      }
      out.push(pts[k]);
      i = k;
    }
    if (plain) return out;
    // (And the points that left in a straight run for no reason.)
    for (let n = 1; n + 1 < out.length;) {
      const a = out[n - 1], b = out[n], c = out[n + 1];
      const round = this.toll(level, a[0], a[1], b[0], b[1]) + this.toll(level, b[0], b[1], c[0], c[1]);
      if (round < Infinity && this.toll(level, a[0], a[1], c[0], c[1]) <= round * 1.01 + 0.2) out.splice(n, 1); else n++;
    }
    // Then its corners rounded: nobody walks to a point, turns on it and walks on. Each corner is cut back up to a metre
    // either side and the turn made over the stretch between, where that stays on free ground.
    const smooth = [out[0]];
    for (let n = 1; n + 1 < out.length; n++) {
      const a = smooth[smooth.length - 1], b = out[n], c = out[n + 1];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const turn = la > 1e-3 && lc > 1e-3 ? Math.acos(Math.max(-1, Math.min(1, ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) / (la * lc)))) : 0;
      const cut = Math.min(1.0, la * 0.45, lc * 0.45);
      if (turn < 0.3 || cut < 0.2 || level !== 0 || this.houseAt(b[0], b[1]) > 0) { smooth.push(b); continue; }
      const p0 = [b[0] + (a[0] - b[0]) * cut / la, b[1] + (a[1] - b[1]) * cut / la], p2 = [b[0] + (c[0] - b[0]) * cut / lc, b[1] + (c[1] - b[1]) * cut / lc];
      const arc = [];
      for (const t of [0, 0.25, 0.5, 0.75, 1]) arc.push([(1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * b[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * b[1] + t * t * p2[1]]);
      let free = this.sees(level, a[0], a[1], arc[0][0], arc[0][1]) && this.sees(level, arc[4][0], arc[4][1], c[0], c[1]);
      for (let q = 0; q < 5 && free; q++) free = this.free(level, arc[q][0], arc[q][1]) && (q === 0 || this.sees(level, arc[q - 1][0], arc[q - 1][1], arc[q][0], arc[q][1]));
      if (free) smooth.push(...arc); else smooth.push(b);
    }
    smooth.push(out[out.length - 1]);
    out = smooth;
    return out;
  }
}
