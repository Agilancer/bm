// Collision and navigation against the village: oriented boxes on a height function, a flat ground grid
// for the flow field, and rays against the plates of a rigid armour.
import { terrainHeight } from '../core/terrain.js';

const NAV_SIZE = 110, NAV_CELL = 1.0, NAV_HALF = NAV_SIZE * NAV_CELL / 2;

export class World {
  constructor(data) {
    this.colliders = data.colliders.map((c) => ({ ...c, s: Math.sin(c.yaw), co: Math.cos(c.yaw) }));
    this.lightsData = data.lights;
    this.grid = new Uint8Array(NAV_SIZE * NAV_SIZE);
    this.slots = new Map();
    this.queue = new Int32Array(NAV_SIZE * NAV_SIZE * 4);
    this.heights = new Float32Array(257 * 257);
    for (let j = 0; j < 257; j++) for (let i = 0; i < 257; i++) this.heights[j * 257 + i] = terrainHeight(i - 128, j - 128);
    for (let j = 0; j < NAV_SIZE; j++) {
      for (let i = 0; i < NAV_SIZE; i++) {
        const x = (i + 0.5) * NAV_CELL - NAV_HALF, z = (j + 0.5) * NAV_CELL - NAV_HALF;
        this.grid[j * NAV_SIZE + i] = this.inside(x, z, 0.55) ? 1 : 0;
      }
    }
  }

  height(x, z) {
    const u = x + 128, v = z + 128;
    if (u < 0 || v < 0 || u >= 256 || v >= 256) return terrainHeight(x, z);
    const i = u | 0, j = v | 0, a = u - i, b = v - j, h = this.heights;
    const k = j * 257 + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + 257] * (1 - a) + h[k + 258] * a) * b;
  }

  inside(x, z, r) {
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z;
      if (Math.abs(dx * c.co - dz * c.s) < c.hx + r && Math.abs(dx * c.s + dz * c.co) < c.hz + r) return true;
    }
    return false;
  }

  // Push a circle out of boxes. feet is the circle's height: low boxes can be jumped over.
  resolve(out, r, feet) {
    let x = out[0], z = out[2];
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.colliders) {
        if (feet > c.h + 0.02 + this.height(c.x, c.z)) continue;
        const dx = x - c.x, dz = z - c.z;
        if (Math.abs(dx) + Math.abs(dz) > c.hx + c.hz + r + 1) continue;
        const lx = dx * c.co - dz * c.s, lz = dx * c.s + dz * c.co;
        const qx = Math.abs(lx) - c.hx, qz = Math.abs(lz) - c.hz;
        if (qx > r || qz > r) continue;
        const sx = lx < 0 ? -1 : 1, sz = lz < 0 ? -1 : 1;
        let px = 0, pz = 0;
        if (qx > 0 && qz > 0) {
          const d = Math.hypot(qx, qz);
          if (d >= r) continue;
          px = sx * qx / d * (r - d); pz = sz * qz / d * (r - d);
        } else if (qx > qz) { px = sx * (r - qx); } else { pz = sz * (r - qz); }
        x += px * c.co + pz * c.s; z += -px * c.s + pz * c.co;
        hit = true;
      }
    }
    out[0] = x; out[2] = z;
    return hit;
  }

  // Does a ray hit a box tall enough to block it? Returns distance, or -1.
  rayBoxes(ox, oy, oz, dx, dy, dz, maxT) {
    let best = -1;
    for (const c of this.colliders) {
      const rx = ox - c.x, rz = oz - c.z;
      const lox = rx * c.co - rz * c.s, loz = rx * c.s + rz * c.co;
      const ldx = dx * c.co - dz * c.s, ldz = dx * c.s + dz * c.co;
      let t0 = 0, t1 = maxT;
      const slab = (o, d, h) => {
        if (Math.abs(d) < 1e-6) return Math.abs(o) <= h;
        let a = (-h - o) / d, b = (h - o) / d;
        if (a > b) { const s = a; a = b; b = s; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        return t0 <= t1;
      };
      if (!slab(lox, ldx, c.hx) || !slab(loz, ldz, c.hz)) continue;
      const yAt = oy + dy * t0;
      if (yAt > c.h && c.h < 3.5) continue;
      if (c.h >= 3.5 && yAt > 7) continue;
      if (best < 0 || t0 < best) best = t0;
    }
    return best;
  }

  sees(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const L = Math.hypot(dx, dy, dz) || 1;
    return this.rayBoxes(ax, ay, az, dx / L, dy / L, dz / L, L) < 0;
  }

  // Breadth-first distance field to a point, so the knight can path around the houses.
  // Slot 0 is the player, shared by everyone hunting them. Anyone going elsewhere keeps a slot of their own.
  updateField(x, z, now, slot = 0) {
    let f = this.slots.get(slot);
    if (!f) { f = { field: new Float32Array(NAV_SIZE * NAV_SIZE), x: 1e9, z: 1e9, t: -1e9 }; this.slots.set(slot, f); }
    if (Math.abs(now - f.t) < 0.2 && Math.hypot(x - f.x, z - f.z) < 2) return;
    f.t = now; f.x = x; f.z = z;
    const { field } = f;
    const { grid, queue } = this;
    field.fill(1e9);
    const si = Math.max(0, Math.min(NAV_SIZE - 1, ((x + NAV_HALF) / NAV_CELL) | 0)), sj = Math.max(0, Math.min(NAV_SIZE - 1, ((z + NAV_HALF) / NAV_CELL) | 0));
    let head = 0, tail = 0;
    queue[tail++] = sj * NAV_SIZE + si; field[sj * NAV_SIZE + si] = 0;
    const cap = queue.length;
    while (head < tail) {
      const k = queue[head++];
      const i = k % NAV_SIZE, j = (k / NAV_SIZE) | 0;
      const d = field[k];
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= NAV_SIZE || nj >= NAV_SIZE) continue;
          const nk = nj * NAV_SIZE + ni;
          if (grid[nk]) continue;
          if (di && dj && (grid[j * NAV_SIZE + ni] || grid[nj * NAV_SIZE + i])) continue;
          const nd = d + (di && dj ? 1.414 : 1);
          if (nd < field[nk] - 1e-3 && tail < cap) { field[nk] = nd; queue[tail++] = nk; }
        }
      }
    }
  }

  // Unit direction along the flow field toward the target, or straight there if off the grid.
  flow(out, x, z, tx, tz, slot = 0) {
    const i = ((x + NAV_HALF) / NAV_CELL) | 0, j = ((z + NAV_HALF) / NAV_CELL) | 0;
    let bx = tx - x, bz = tz - z;
    const field = this.slots.get(slot)?.field;
    if (field && i >= 1 && j >= 1 && i < NAV_SIZE - 1 && j < NAV_SIZE - 1) {
      let best = field[j * NAV_SIZE + i];
      let found = false;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const v = field[(j + dj) * NAV_SIZE + i + di];
          if (v < best - 0.01) {
            const cost = v + (di && dj ? 1.414 : 1);
            if (!found || cost < best + 1e8) { best = v; bx = di; bz = dj; found = true; }
          }
        }
      }
      // With a clear line, head straight there and skip the grid's stair-steps.
      if (this.sees(x, 1, z, tx, 1, tz)) { bx = tx - x; bz = tz - z; }
    }
    const L = Math.hypot(bx, bz) || 1;
    out[0] = bx / L; out[1] = bz / L;
    return out;
  }

  clearance(x, z, dx, dz, dist, r) {
    for (let s = 0.5; s <= dist; s += 0.5) if (this.inside(x + dx * s, z + dz * s, r)) return s - 0.5;
    return dist;
  }
}

// A flat BVH over one rigid plate's triangles, in bind space.
export class PlateBVH {
  constructor(pos, tris, tstart, tcount) {
    this.pos = pos;
    this.tris = tris;
    this.order = new Uint32Array(tcount);
    for (let i = 0; i < tcount; i++) this.order[i] = tstart + i;
    const cent = new Float32Array(tris.length);
    const c = (t, k) => (pos[tris[t * 3] * 3 + k] + pos[tris[t * 3 + 1] * 3 + k] + pos[tris[t * 3 + 2] * 3 + k]) / 3;
    this.nodes = [];
    const build = (lo, hi) => {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = lo; i < hi; i++) {
        const t = this.order[i];
        for (let v = 0; v < 3; v++) {
          const vi = tris[t * 3 + v] * 3;
          for (let k = 0; k < 3; k++) { const p = pos[vi + k]; if (p < mn[k]) mn[k] = p; if (p > mx[k]) mx[k] = p; }
        }
      }
      const id = this.nodes.length;
      const node = { mn, mx, lo, hi, l: -1, r: -1 };
      this.nodes.push(node);
      if (hi - lo <= 6) return id;
      const ax = mx[0] - mn[0] > mx[1] - mn[1] ? (mx[0] - mn[0] > mx[2] - mn[2] ? 0 : 2) : (mx[1] - mn[1] > mx[2] - mn[2] ? 1 : 2);
      const sub = Array.from(this.order.subarray(lo, hi));
      sub.sort((a, b) => c(a, ax) - c(b, ax));
      this.order.set(sub, lo);
      const mid = (lo + hi) >> 1;
      node.l = build(lo, mid);
      node.r = build(mid, hi);
      return id;
    };
    build(0, tcount);
    this.stack = new Int32Array(64);
    this.mn = this.nodes[0].mn; this.mx = this.nodes[0].mx;
  }

  // Möller-Trumbore through the tree. Returns t; hit normal in hitN. Both sides count: plates are shells.
  ray(ox, oy, oz, dx, dy, dz, maxT, hitN) {
    const { nodes, stack, order, tris, pos } = this;
    let best = maxT, found = false, sp = 0;
    stack[sp++] = 0;
    const idx = 1 / (dx || 1e-9), idy = 1 / (dy || 1e-9), idz = 1 / (dz || 1e-9);
    while (sp) {
      const n = nodes[stack[--sp]];
      const t1x = (n.mn[0] - ox) * idx, t2x = (n.mx[0] - ox) * idx;
      const t1y = (n.mn[1] - oy) * idy, t2y = (n.mx[1] - oy) * idy;
      const t1z = (n.mn[2] - oz) * idz, t2z = (n.mx[2] - oz) * idz;
      const tn = Math.max(Math.min(t1x, t2x), Math.min(t1y, t2y), Math.min(t1z, t2z));
      const tf = Math.min(Math.max(t1x, t2x), Math.max(t1y, t2y), Math.max(t1z, t2z));
      if (tf < 0 || tn > tf || tn > best) continue;
      if (n.l >= 0) { stack[sp++] = n.l; stack[sp++] = n.r; continue; }
      for (let i = n.lo; i < n.hi; i++) {
        const t = order[i];
        const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, c = tris[t * 3 + 2] * 3;
        const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
        const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-9) continue;
        const inv = 1 / det;
        const sx = ox - pos[a], sy = oy - pos[a + 1], sz = oz - pos[a + 2];
        const u = (sx * px + sy * py + sz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (tt > 0.001 && tt < best) {
          best = tt; found = true;
          let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
          const l = 1 / (Math.hypot(nx, ny, nz) || 1);
          nx *= l; ny *= l; nz *= l;
          if (nx * dx + ny * dy + nz * dz > 0) { nx = -nx; ny = -ny; nz = -nz; }
          hitN[0] = nx; hitN[1] = ny; hitN[2] = nz;
        }
      }
    }
    return found ? best : -1;
  }
}
