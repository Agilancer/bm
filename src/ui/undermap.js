// The charts of the places under a roof: the cathedral and its catacombs, the Hollowfang Warrens, the Test Dungeon. As in
// Bellmourn, a chart below ground is of what you've walked: the passages and rooms come out of the dark as you pass through
// them, and no further than you could have seen (the filling-in runs along the floor from where you stand, so it stops at
// walls). Each place has its own chart, half a metre to a cell, drawn from the place's own shape: the church's floors and
// colliders (assets/game/interior/interior.json), the warrens' field (src/core/dungeon.js), the hall's (src/core/testhall.js).
//
// A chart lies the way the land's paper does (src/ui/map.js): +z up, -x to the right.

import { churchAt, inChurch } from '../core/church.js';
import { DUNGEON, DUNGEON_BOX, ROOMS, caveFloorY, caveRoom, inDungeon, toWorld as caveAt } from '../core/dungeon.js';
import { ARENA, HALL, HALL_BOX, LOBBY, hallAt, hallRoom, inDoorway, inHall } from '../core/testhall.js';

export const CELL = 0.5;              // metres to a cell, and to a pixel of the chart
const REACH = 16;                     // how far along the floor the chart fills in round you, metres
const ROCK = 0, FLOOR = 1, STEPS = 2, PIT = 3;

// Stone by how deep it lies: warm near the light, cold far under it. Steps are banded, a pit's floor glows a little red.
const HIGH = [158, 138, 102], DEEP = [78, 84, 108], WALL = [214, 190, 138], PIT_C = [86, 40, 30];

const levelOf = (f, x, z) => {
  if (f.y === f.y2 || f.y2 === undefined) return f.y;
  const t = f.axis === 'x' ? (x - f.x0) / (f.x1 - f.x0) : (z - f.z0) / (f.z1 - f.z0);
  return f.y + (f.y2 - f.y) * t;
};

export class Chart {
  // box: its bounds in the world. shape(chart): fills kind and hgt (called once, the first time it's wanted).
  constructor(key, name, shape) {
    this.key = key; this.name = name; this.shape = shape;
    this.kind = null; this.pending = null;
    this.labels = []; this.doors = [];
    this.last = -1;
  }

  // Sets its bounds and makes its cells. From shape().
  lay(x0, z0, x1, z1) {
    this.x0 = x0; this.z0 = z0; this.x1 = x1; this.z1 = z1;
    this.cols = Math.ceil((x1 - x0) / CELL); this.rows = Math.ceil((z1 - z0) / CELL);
    const n = this.cols * this.rows;
    this.kind = new Uint8Array(n); this.hgt = new Float32Array(n); this.seen = new Uint8Array(n);
    this.stamp = new Uint32Array(n); this.gen = 0; this.queue = new Int32Array(n);
    this.canvas = document.createElement('canvas'); this.canvas.width = this.cols; this.canvas.height = this.rows;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.cols, this.rows);
  }

  col(x) { return Math.floor((this.x1 - x) / CELL); }
  row(z) { return Math.floor((this.z1 - z) / CELL); }
  cellX(i) { return this.x1 - (i + 0.5) * CELL; }
  cellZ(j) { return this.z1 - (j + 0.5) * CELL; }

  // Every cell whose middle is in the rectangle (and, turned by yaw, in the box): fn(k, x, z).
  cells(x0, z0, x1, z1, fn) {
    const i0 = Math.max(0, this.col(x1)), i1 = Math.min(this.cols - 1, this.col(x0));
    const j0 = Math.max(0, this.row(z1)), j1 = Math.min(this.rows - 1, this.row(z0));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = this.cellX(i), z = this.cellZ(j);
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) fn(j * this.cols + i, x, z);
    }
  }

  // Made the first time it's wanted. False while it can't be yet (the church's, before its file is in).
  ready() {
    if (this.kind) return true;
    if (!this.shape(this)) return false;
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < this.kind.length; k++) if (this.kind[k]) { lo = Math.min(lo, this.hgt[k]); hi = Math.max(hi, this.hgt[k]); }
    this.lo = lo; this.hi = Math.max(hi, lo + 1);
    if (this.pending) { this.unpack(this.pending); this.pending = null; }
    return true;
  }

  paint(k, c) {
    const d = this.img.data, o = k * 4;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }

  colour(k) {
    const kind = this.kind[k];
    if (kind === PIT) return PIT_C;
    const t = Math.min(1, Math.max(0, (this.hgt[k] - this.lo) / (this.hi - this.lo)));
    const i = k % this.cols, j = (k / this.cols) | 0;
    // (A grain, as paper has; and steps in bands by their height, which reads as a stair from above.)
    let s = 0.97 + (((i * 7 + j * 13) % 5) * 0.015);
    if (kind === STEPS) s *= (Math.floor(this.hgt[k] / 0.45) & 1) ? 1.16 : 0.84;
    return [(DEEP[0] + (HIGH[0] - DEEP[0]) * t) * s, (DEEP[1] + (HIGH[1] - DEEP[1]) * t) * s, (DEEP[2] + (HIGH[2] - DEEP[2]) * t) * s];
  }

  // A cell of floor comes out of the dark, and the faces of the walls round it.
  mark(k) {
    if (this.seen[k] === 1) return;
    this.seen[k] = 1;
    this.paint(k, this.colour(k));
    const i = k % this.cols, j = (k / this.cols) | 0;
    this.dirty(i, j);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= this.cols || b >= this.rows) continue;
      const n = b * this.cols + a;
      if (this.kind[n] !== ROCK || this.seen[n]) continue;
      this.seen[n] = 2; this.paint(n, WALL); this.dirty(a, b);
    }
  }

  dirty(i, j) {
    if (!this.d) { this.d = [i, j, i, j]; return; }
    const d = this.d;
    if (i < d[0]) d[0] = i; if (j < d[1]) d[1] = j; if (i > d[2]) d[2] = i; if (j > d[3]) d[3] = j;
  }

  flush() {
    const d = this.d;
    if (!d) return;
    this.ctx.putImageData(this.img, 0, 0, d[0], d[1], d[2] - d[0] + 1, d[3] - d[1] + 1);
    this.d = null;
  }

  // Fills in the chart round (x, z): along the floor from where you stand, as far as REACH.
  see(x, z) {
    if (!this.ready()) return;
    let ci = this.col(x), cj = this.row(z);
    if (ci < 0 || cj < 0 || ci >= this.cols || cj >= this.rows) return;
    const here = cj * this.cols + ci;
    if (here === this.last) return;
    this.last = here;
    let start = here;
    if (this.kind[start] === ROCK) {
      // (Hard against a wall, or on something the chart calls stone: the nearest floor will do.)
      start = -1;
      let best = 1e9;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
        const a = ci + di, b = cj + dj, dd = di * di + dj * dj;
        if (a < 0 || b < 0 || a >= this.cols || b >= this.rows || dd >= best || this.kind[b * this.cols + a] === ROCK) continue;
        best = dd; start = b * this.cols + a;
      }
      if (start < 0) return;
    }
    const q = this.queue, r2 = (REACH / CELL) ** 2, gen = ++this.gen, cols = this.cols;
    let head = 0, tail = 0;
    q[tail++] = start; this.stamp[start] = gen;
    while (head < tail) {
      const k = q[head++];
      this.mark(k);
      const i = k % cols, j = (k / cols) | 0;
      for (let s = 0; s < 4; s++) {
        const a = i + (s === 0 ? 1 : s === 1 ? -1 : 0), b = j + (s === 2 ? 1 : s === 3 ? -1 : 0);
        if (a < 0 || b < 0 || a >= cols || b >= this.rows) continue;
        const n = b * cols + a;
        if (this.stamp[n] === gen || this.kind[n] === ROCK || (a - ci) ** 2 + (b - cj) ** 2 > r2) continue;
        this.stamp[n] = gen; q[tail++] = n;
      }
    }
    this.flush();
  }

  isSeen(x, z) {
    if (!this.kind) return false;
    const i = this.col(x), j = this.row(z);
    return i >= 0 && j >= 0 && i < this.cols && j < this.rows && this.seen[j * this.cols + i] === 1;
  }

  // Drawn into g at k pixels a metre, with the world's (cx, cz) at (ox, oy).
  draw(g, ox, oy, cx, cz, k) {
    if (!this.kind) return;
    g.imageSmoothingEnabled = CELL * k < 2;
    g.drawImage(this.canvas, ox + (cx - this.x1) * k, oy + (cz - this.z1) * k, this.cols * CELL * k, this.rows * CELL * k);
    g.imageSmoothingEnabled = true;
  }

  reset() {
    this.pending = null; this.last = -1;
    if (!this.kind) return;
    this.seen.fill(0); this.img.data.fill(0);
    this.ctx.clearRect(0, 0, this.cols, this.rows);
  }

  // As saved: the floor you've seen, eight cells to a byte, in base64. Nothing, for a place you've never been in.
  save() {
    if (!this.kind) return this.pending || '';
    const n = this.kind.length, bytes = new Uint8Array(Math.ceil(n / 8));
    let any = false;
    for (let k = 0; k < n; k++) if (this.seen[k] === 1) { bytes[k >> 3] |= 1 << (k & 7); any = true; }
    if (!any) return '';
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }

  load(s) {
    this.reset();
    if (typeof s !== 'string' || !s) return;
    if (this.kind) this.unpack(s); else { this.pending = s; this.ready(); }
  }

  unpack(s) {
    try {
      const b = atob(s), n = this.kind.length;
      if (b.length !== Math.ceil(n / 8)) return;      // (a chart of another shape: the place was rebuilt)
      for (let k = 0; k < n; k++) if ((b.charCodeAt(k >> 3) & (1 << (k & 7))) && this.kind[k] !== ROCK) this.mark(k);
      this.d = [0, 0, this.cols - 1, this.rows - 1]; this.flush();
    } catch { /* an unreadable chart starts over */ }
  }
}

// The cathedral and everything under it, from the interior's own floors and walls.
let interior = null;
export const setInterior = (data) => { interior = data; CHURCH.ready(); };

const CHURCH = new Chart('church', 'The Cathedral', (c) => {
  if (!interior) return false;
  const floors = interior.floors || [];
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const f of floors) { x0 = Math.min(x0, f.x0); z0 = Math.min(z0, f.z0); x1 = Math.max(x1, f.x1); z1 = Math.max(z1, f.z1); }
  c.lay(x0 - 2, z0 - 2, x1 + 2, z1 + 2);
  // (The first floor a point is in is the one it stands on: src/core/interior.js floorAt.)
  for (const f of floors) {
    c.cells(f.x0, f.z0, f.x1, f.z1, (k, x, z) => {
      if (c.kind[k]) return;
      c.kind[k] = f.pit ? PIT : f.y !== f.y2 ? STEPS : FLOOR; c.hgt[k] = levelOf(f, x, z);
    });
  }
  // The floors one over another, where there's a drop with a bridge across it (the Mourning Rift): what's highest shows.
  for (const h of interior.homes || []) {
    if (!(h.ground && h.ground[0] > 1e8)) continue;
    for (const f of h.floors) {
      c.cells(f.x0, f.z0, f.x1, f.z1, (k, x, z) => {
        const v = levelOf(f, x, z);
        if (c.kind[k] && c.kind[k] !== PIT && v <= c.hgt[k]) return;
        if (c.kind[k] === PIT && v < c.hgt[k] - 0.5) return;
        const low = v < h.y + 1.5;
        c.kind[k] = low ? PIT : f.y !== f.y2 ? STEPS : FLOOR; c.hgt[k] = v;
      });
    }
    c.labels.push({ x: (h.x0 + h.x1) / 2, z: (h.z0 + h.z1) / 2, text: 'The Mourning Rift' });
  }
  // Its walls and pillars: whatever stands a man's height or more.
  for (const b of interior.colliders || []) {
    if (b.h < 2) continue;
    const s = Math.sin(b.yaw || 0), co = Math.cos(b.yaw || 0), r = Math.hypot(b.hx, b.hz);
    c.cells(b.x - r, b.z - r, b.x + r, b.z + r, (k, x, z) => {
      const dx = x - b.x, dz = z - b.z;
      if (Math.abs(dx * co - dz * s) <= b.hx && Math.abs(dx * s + dz * co) <= b.hz) c.kind[k] = ROCK;
    });
  }
  for (const t of interior.things || []) if (t.type === 'door' && t.cx !== undefined) c.doors.push({ x: t.cx, z: t.cz });
  const [nx, nz] = churchAt(90, 0);
  c.labels.push({ x: nx, z: nz, text: 'The Nave' });
  return true;
});
// (Under the land it's the catacombs.)
CHURCH.title = (y) => (y < -6 ? 'The Catacombs' : 'The Cathedral');

const WARRENS = new Chart('warrens', DUNGEON.name, (c) => {
  const B = DUNGEON_BOX;
  c.lay(B.x0, B.z0, B.x1, B.z1);
  for (let k = 0; k < c.kind.length; k++) {
    const x = c.cellX(k % c.cols), z = c.cellZ((k / c.cols) | 0);
    if (caveRoom(x, z) > 0.25) { c.kind[k] = FLOOR; c.hgt[k] = caveFloorY(x, z); }
  }
  for (const r of ROOMS) { const [x, z] = caveAt(r.x, r.z); c.labels.push({ x, z, text: r.name[0].toUpperCase() + r.name.slice(1) }); }
  return true;
});

const TESTHALL = new Chart('hall', HALL.name[0].toUpperCase() + HALL.name.slice(1), (c) => {
  const B = HALL_BOX;
  c.lay(B.x0, B.z0, B.x1, B.z1);
  for (let k = 0; k < c.kind.length; k++) {
    const x = c.cellX(k % c.cols), z = c.cellZ((k / c.cols) | 0);
    if (hallRoom(x, z) > 0 || inDoorway(x, z)) { c.kind[k] = FLOOR; c.hgt[k] = HALL.y; }
  }
  const mid = (r) => hallAt((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2);
  c.labels.push({ x: mid(LOBBY)[0], z: mid(LOBBY)[1], text: 'The Hall' }, { x: mid(ARENA)[0], z: mid(ARENA)[1], text: 'The Arena' });
  return true;
});

export const CHARTS = [CHURCH, WARRENS, TESTHALL];

// Which place's chart a point is on, or null out under the sky.
export function chartAt(x, y, z) {
  if (inHall(x, z)) return TESTHALL;
  if (inDungeon(x, z)) return WARRENS;
  if (inChurch(x, y, z)) return CHURCH;
  return null;
}
