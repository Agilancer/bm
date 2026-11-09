// Where the townsfolk can walk: the same boxes and floors the player walks on (assets/game/village.json and the houses'
// insides in interior.json), worked into two walking grids at half a metre, the ground (the land, and every house's ground
// floor) and upstairs, joined at each house's stair. A* finds the way; then the way is pulled straight wherever it can see.
// The doors count as open: the folk open them as they go (src/folk/brain.js asks the main thread).
import { homeFloor, setFloors } from '../core/interior.js';
import { terrainHeight } from '../core/terrain.js';

export const CELL = 0.5;
const HASH = 4;
const UP = 2.2;               // feet above this are upstairs (RAIL_Y in tools/interior/build_interior.py)

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

  // A* on one level, from a to b. A list of [x, z] points (pulled straight), or null if there's no way.
  find(level, ax, az, bx, bz, maxNodes = 120000) {
    const g = this.levels[level];
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
        const cost = G[c] + (k >= 4 ? Math.SQRT2 : 1);
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
    // Pull it straight: from each kept point, the furthest one it can see.
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let k = pts.length - 1;
      while (k > i + 1 && !this.sees(level, pts[i][0], pts[i][1], pts[k][0], pts[k][1])) k--;
      out.push(pts[k]);
      i = k;
    }
    return out;
  }
}
