// Collision and navigation against the village: oriented boxes on a height function, a flat ground grid
// for the flow field, and rays against the plates of a rigid armour.
import { floorAt, homeFloor, inPit, setFloors } from '../core/interior.js';
import { CELL, TREE_FLOATS, treesInCells, trunkRadius } from '../core/forest.js';
import { BOULDER_CELL, ROCK_FLOATS, rockRadius, rocksInCells } from '../core/rocks.js';
import { LAND_EDGE, openingTerrain, terrainHeight } from '../core/terrain.js';
import { caveFloor, caveKeep } from '../core/opening.js';
import { CHURCH_BOUNDS } from '../core/church.js';
import { buildSites } from '../core/sites.js';
import { CaveNav, caveFloorY, caveKeep as warrenKeep, caveRay, caveRoom, inDungeon } from '../core/dungeon.js';

// The places out in the countries (src/core/sites.js): their boxes kept by 64 m cell, so a body only looks at the ones near it.
const SITE_CELL = 64;
const siteKey = (i, j) => (i + 200) * 400 + j + 200;

// (Big enough to reach the catacombs, wherever the church stands: src/core/church.js. Cells nobody can stand on are walled off, so the search
// stays small.) Its north-west corner and how many cells it is each way, for the tools and tests that read a field: cell (i, j) is row j * NAV_W.
export const NAV_CELL = 1.0, NAV_X0 = -256, NAV_Z0 = Math.min(-256, Math.floor(CHURCH_BOUNDS.z0) - 8);
export const NAV_W = Math.ceil((Math.max(256, CHURCH_BOUNDS.x1 + 8) - NAV_X0) / NAV_CELL), NAV_H = Math.ceil((Math.max(256, CHURCH_BOUNDS.z1 + 8) - NAV_Z0) / NAV_CELL);
const NAV_REACH = 150;
const NAV_RADIUS = 0.86;
const NAV_EDGE = 250;      // Past this nothing's worked out where to walk: whatever's chasing you stops at it, and the land goes on to LAND_EDGE.

const OUT_OF_THE_WAY = 1e9;  // (a box only those with their feet above this run into)
// The walking fields kept before an idle one is reused (World.freeField), and how long unasked-for makes one idle (seconds).
const FIELDS_KEPT = 24, FIELD_IDLE = 2;
const byIndex = (a, b) => a.n - b.n;
const TRUNK_CELL = 16, TOWN = 50;     // (The forest stands clear of the town, so nobody in it looks for a trunk.)
const trunkKey = (i, j) => (i + 1000) * 2000 + j + 1000;   // (11 km is 700 trunk cells: well inside)
// Down in the catacombs, under the land: the pines standing up on it aren't down there. (Over them, floorAt gives their floor.)
const underLand = (x, z) => { if (inDungeon(x, z)) return true; const f = floorAt(x, z); return f !== null && f < -2; };
// Whether every point of trunk cell (i, j) is at least R from x, z: then none of the trunks standing in it (their middles are in it) is
// within R either.
const farFromCell = (x, z, i, j, R) => {
  const dx = Math.max(i * TRUNK_CELL - x, 0, x - (i + 1) * TRUNK_CELL), dz = Math.max(j * TRUNK_CELL - z, 0, z - (j + 1) * TRUNK_CELL);
  return dx * dx + dz * dz >= R * R;
};
// The boxes, kept by 8 m cell: each in every cell its footprint reaches, padded by BOX_PAD, in the order of this.colliders (resolve's
// pushes depend on the order). A circle of up to BOX_R (times 1.42 for a box's corner) at a point in a cell can only touch the boxes
// in that cell's list, with a metre over for what one pass of resolve pushes it; a wider one looks at them all. So a body looks at a
// few dozen boxes instead of all thousand. (The widest anyone tests is 1.8 m, a big Tripo monster.)
const BOX_CELL = 8, BOX_PAD = 4, BOX_R = 2, NO_BOXES = [];
const boxKey = (i, j) => (i + 4096) * 8192 + j + 4096;

export class World {
  constructor(data, interior) {
    // The pines' trunks, by the cell they're in. As far as you can go, and no further.
    // (Worked out a cell at a time, the first time anyone comes near it: the land's 11 km across.)
    this.trunks = new Map();
    setFloors(interior.floors, interior.homes);
    this.spawns = interior.spawns;
    this.colliders = data.colliders.concat(interior.colliders).map((c) => ({ ...c, s: Math.sin(c.yaw), co: Math.cos(c.yaw) }));
    this.siteBoxes = new Map();
    for (const c0 of buildSites().colliders) {
      const c = { ...c0, s: Math.sin(c0.yaw), co: Math.cos(c0.yaw) }, R = Math.hypot(c.hx, c.hz);
      for (let j = Math.floor((c.z - R) / SITE_CELL); j <= Math.floor((c.z + R) / SITE_CELL); j++) {
        for (let i = Math.floor((c.x - R) / SITE_CELL); i <= Math.floor((c.x + R) / SITE_CELL); i++) {
          const k = siteKey(i, j);
          let list = this.siteBoxes.get(k);
          if (!list) this.siteBoxes.set(k, list = []);
          list.push(c);
        }
      }
    }
    this.lightsData = data.lights;
    this.grid = new Uint8Array(NAV_W * NAV_H);
    this.slots = new Map();
    this.queue = new Int32Array(NAV_W * NAV_H * 4);
    this.heights = new Float32Array(257 * 257);
    for (let j = 0; j < 257; j++) for (let i = 0; i < 257; i++) this.heights[j * 257 + i] = terrainHeight(i - 128, j - 128);
    for (let j = 0; j < NAV_H; j++) {
      for (let i = 0; i < NAV_W; i++) {
        const x = (i + 0.5) * NAV_CELL + NAV_X0, z = (j + 0.5) * NAV_CELL + NAV_Z0;
        this.grid[j * NAV_W + i] = ((Math.abs(x) > NAV_EDGE || Math.abs(z) > NAV_EDGE) && (floorAt(x, z) === null || inPit(x, z))) || this.inside(x, z, NAV_RADIUS) ? 1 : 0;
      }
    }
    // The doors: each leaf a box in its doorway when it's shut and a box against the wall when it's open, one of them out of the way. (Not in the grid above: they come and go.)
    // They start open, for the tools that walk the place; the game's first tick shuts them.
    this.doors = (interior.things || []).filter((t) => t.type === 'door').map((t) => {
      const box = (c) => { const o = { ...c, s: 0, co: 1 }; this.colliders.push(o); return o; };
      return { id: t.id, shut: box(t.shut), ajar: box(t.ajar) };
    });
    this.setDoors(-1);
    // Lisandra's cave: open until it falls in, and then its mouth is rubble (src/sim/opening.js).
    this.caveSealed = false;
    this.caveRubble = this.colliders.filter((c) => c.rubble);
    this.setCaveSealed(false);
    this.buildRayGrid();
  }

  // For rays (raycast): the boxes by BOX_CELL cell, each in every cell its own footprint touches, kept in the order of this.colliders.
  // A ray looks at the boxes along it rather than all of them (a thousand, with the church's floors). (boxesNear below is the
  // walkers' grid, padded for a circle at a point; a ray crosses many cells, so it has this one. Doors and the cave's rubble
  // come and go by their heights, so they're in both.)
  buildRayGrid() {
    const cs = this.colliders;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let n = 0; n < cs.length; n++) {
      const c = cs[n];
      c.n = n;
      c.ex = c.hx * Math.abs(c.co) + c.hz * Math.abs(c.s);
      c.ez = c.hx * Math.abs(c.s) + c.hz * Math.abs(c.co);
      x0 = Math.min(x0, c.x - c.ex); x1 = Math.max(x1, c.x + c.ex); z0 = Math.min(z0, c.z - c.ez); z1 = Math.max(z1, c.z + c.ez);
    }
    const g = { i0: 0, j0: 0, w: 0, h: 0, cells: [] };
    if (cs.length) {
      g.i0 = Math.floor(x0 / BOX_CELL); g.j0 = Math.floor(z0 / BOX_CELL);
      g.w = Math.floor(x1 / BOX_CELL) - g.i0 + 1; g.h = Math.floor(z1 / BOX_CELL) - g.j0 + 1;
      g.cells = new Array(g.w * g.h).fill(null);
      for (const c of cs) {
        for (let j = Math.floor((c.z - c.ez) / BOX_CELL); j <= Math.floor((c.z + c.ez) / BOX_CELL); j++) {
          for (let i = Math.floor((c.x - c.ex) / BOX_CELL); i <= Math.floor((c.x + c.ex) / BOX_CELL); i++) {
            const k = (j - g.j0) * g.w + i - g.i0;
            (g.cells[k] ||= []).push(c);
          }
        }
      }
    }
    g.count = cs.length;
    this.rayGrid = g;
    this.boxSeen = new Uint32Array(cs.length);
    this.boxMark = 0;
    this.boxList = [];
    return g;
  }

  // The grid, built again if boxes have been added since (a bare world in the tests, given walls as it goes). A box mustn't be
  // moved across the ground once it's in: the doors and the rubble only go up and down.
  rayCells() {
    const g = this.rayGrid;
    return g && g.count === this.colliders.length ? g : this.buildRayGrid();
  }

  // The boxes whose footprints meet the square x0..x1, z0..z1, in this.colliders' order, each once. (null: more cells than are
  // worth looking through one by one, so look at them all.)
  boxesIn(x0, z0, x1, z1) {
    const g = this.rayCells();
    const i0 = Math.max(0, Math.floor(x0 / BOX_CELL) - g.i0), i1 = Math.min(g.w - 1, Math.floor(x1 / BOX_CELL) - g.i0);
    const j0 = Math.max(0, Math.floor(z0 / BOX_CELL) - g.j0), j1 = Math.min(g.h - 1, Math.floor(z1 / BOX_CELL) - g.j0);
    const out = this.boxList;
    out.length = 0;
    if (i1 < i0 || j1 < j0) return out;
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 64) return null;
    if (i0 === i1 && j0 === j1) { const list = g.cells[j0 * g.w + i0]; if (list) for (const c of list) out.push(c); return out; }
    if (++this.boxMark === 0xffffffff) { this.boxSeen.fill(0); this.boxMark = 1; }
    const mark = this.boxMark, seen = this.boxSeen;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const list = g.cells[j * g.w + i];
        if (!list) continue;
        for (const c of list) if (seen[c.n] !== mark) { seen[c.n] = mark; out.push(c); }
      }
    }
    if (j1 > j0 || i1 > i0) out.sort(byIndex);
    return out;
  }

  // The boxes that could touch a circle of radius r at x, z, in collider order.
  boxesNear(x, z, r) {
    const all = this.colliders;
    if (r > BOX_R) return all;
    // (Boxes are only ever added, at the end: the doors after the walking grid, the tests' own. Any new since are put in first.)
    if (this.boxedN !== all.length) {
      if (!this.boxGrid || !(this.boxedN < all.length)) { this.boxGrid = new Map(); this.boxedN = 0; }
      for (; this.boxedN < all.length; this.boxedN++) {
        const c = all[this.boxedN], R = Math.hypot(c.hx, c.hz) + BOX_PAD;
        for (let j = Math.floor((c.z - R) / BOX_CELL); j <= Math.floor((c.z + R) / BOX_CELL); j++) {
          for (let i = Math.floor((c.x - R) / BOX_CELL); i <= Math.floor((c.x + R) / BOX_CELL); i++) {
            const k = boxKey(i, j);
            let list = this.boxGrid.get(k);
            if (!list) this.boxGrid.set(k, list = []);
            list.push(c);
          }
        }
      }
    }
    return this.boxGrid.get(boxKey(Math.floor(x / BOX_CELL), Math.floor(z / BOX_CELL))) || NO_BOXES;
  }

  // The trunks standing in one of the trunk grid's cells, and the boulders lying in it: [x, z, radius, ...], or null.
  trunkCell(i, j) {
    const key = trunkKey(i, j);
    let list = this.trunks.get(key);
    if (list === undefined) {
      const x0 = i * TRUNK_CELL, z0 = j * TRUNK_CELL;
      // (A forest cell's tree can stand up to 0.9 of a cell from its corner: take the cells round about and keep what falls in this one.)
      const t = treesInCells(Math.floor(x0 / CELL) - 1, Math.ceil((x0 + TRUNK_CELL) / CELL) + 1, Math.floor(z0 / CELL) - 1, Math.ceil((z0 + TRUNK_CELL) / CELL) + 1);
      list = [];
      for (let k = 0; k < t.length; k += TREE_FLOATS) {
        if (t[k] < x0 || t[k] >= x0 + TRUNK_CELL || t[k + 1] < z0 || t[k + 1] >= z0 + TRUNK_CELL) continue;
        list.push(t[k], t[k + 1], trunkRadius(t[k + 2], t[k + 3]), 1e9);
      }
      // And the boulders big enough to walk into (src/core/rocks.js), as circles like the trunks.
      const b = rocksInCells(Math.floor(x0 / BOULDER_CELL) - 1, Math.ceil((x0 + TRUNK_CELL) / BOULDER_CELL) + 1, Math.floor(z0 / BOULDER_CELL) - 1, Math.ceil((z0 + TRUNK_CELL) / BOULDER_CELL) + 1, true);
      for (let k = 0; k < b.length; k += ROCK_FLOATS) {
        if (b[k] < x0 || b[k] >= x0 + TRUNK_CELL || b[k + 2] < z0 || b[k + 2] >= z0 + TRUNK_CELL) continue;
        const r = rockRadius(b[k + 3], b[k + 6], b[k + 8]);
        // (Its top, over which a jump or a spell goes: about seven tenths of its size up.)
        if (r > 0) list.push(b[k], b[k + 2], r, b[k + 1] + b[k + 3] * b[k + 6] * 0.75);
      }
      if (list.length) { let m = 0; for (let k = 2; k < list.length; k += 4) m = Math.max(m, list[k]); list.maxR = m; } else list = null;
      this.trunks.set(key, list);
    }
    return list;
  }

  setCaveSealed(sealed) {
    this.caveSealed = sealed;
    for (const c of this.caveRubble) c.b = sealed ? 0 : OUT_OF_THE_WAY;
  }

  // mask: a bit for each door that stands open. -1: all of them.
  setDoors(mask) {
    for (const d of this.doors) {
      const open = mask < 0 || Math.floor(mask / 2 ** d.id) % 2 === 1;
      d.shut.b = open ? OUT_OF_THE_WAY : 0;
      d.ajar.b = open ? 0 : OUT_OF_THE_WAY;
    }
  }

  height(x, z) {
    // (The Hollowfang Warrens lie out past the edge of the world, under it: src/core/dungeon.js.)
    if (inDungeon(x, z)) return caveFloorY(x, z);
    const f = floorAt(x, z);
    if (f !== null) return f;
    if (openingTerrain && !this.caveSealed) { const c = caveFloor(x, z); if (c !== null) return c; }
    const u = x + 128, v = z + 128;
    if (u < 0 || v < 0 || u >= 256 || v >= 256) return terrainHeight(x, z);
    const i = u | 0, j = v | 0, a = u - i, b = v - j, h = this.heights;
    const k = j * 257 + i;
    return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + 257] * (1 - a) + h[k + 258] * a) * b;
  }

  // Where the player comes down, at height y: in a house that depends how high they've got. Everyone else stays on the ground floor.
  heightFor(x, z, y) {
    return homeFloor(x, z, y) ?? this.height(x, z);
  }

  inside(x, z, r) {
    if (inDungeon(x, z)) return caveRoom(x, z) < r;
    const boxes = this.boxesNear(x, z, r);
    for (let n = 0; n < boxes.length; n++) {
      const c = boxes[n];
      if (c.b || c.t !== undefined) continue;   // (Upstairs, or down in the rift: nobody who goes by this is there.)
      const dx = x - c.x, dz = z - c.z;
      if (Math.abs(dx * c.co - dz * c.s) < c.hx + r && Math.abs(dx * c.s + dz * c.co) < c.hz + r) return true;
    }
    if (Math.abs(x) > TOWN || Math.abs(z) > TOWN) {
      const ci = Math.floor(x / TRUNK_CELL), cj = Math.floor(z / TRUNK_CELL);
      for (let j = cj - 1; j <= cj + 1; j++) {
        for (let i = ci - 1; i <= ci + 1; i++) {
          const list = this.trunkCell(i, j);
          if (!list) continue;
          for (let k = 0; k < list.length; k += 4) { const ex = x - list[k], ez = z - list[k + 1], R = list[k + 2] + r; if (ex * ex + ez * ez < R * R) return !underLand(x, z); }
        }
      }
    }
    return false;
  }

  // The boxes of the places out in the land within a cell of x, z (or null).
  sitesNear(x, z) {
    return this.siteBoxes.get(siteKey(Math.floor(x / SITE_CELL), Math.floor(z / SITE_CELL))) || null;
  }

  // Push a circle out of boxes. feet is the circle's height: low boxes can be jumped over.
  resolve(out, r, feet) {
    if (inDungeon(out[0], out[2])) return warrenKeep(out, r);
    let x = out[0], z = out[2];
    let hit = false;
    const push = (c) => {
      const dx = x - c.x, dz = z - c.z;
      if (Math.abs(dx) + Math.abs(dz) > c.hx + c.hz + r + 1) return;
      if (feet > (c.t ?? c.h + 0.02 + this.height(c.x, c.z)) || feet < c.b) return;
      const lx = dx * c.co - dz * c.s, lz = dx * c.s + dz * c.co;
      const qx = Math.abs(lx) - c.hx, qz = Math.abs(lz) - c.hz;
      if (qx > r || qz > r) return;
      const sx = lx < 0 ? -1 : 1, sz = lz < 0 ? -1 : 1;
      let px = 0, pz = 0;
      if (qx > 0 && qz > 0) {
        const d = Math.hypot(qx, qz);
        if (d >= r) return;
        px = sx * qx / d * (r - d); pz = sz * qz / d * (r - d);
      } else if (qx > qz) { px = sx * (r - qx); } else { pz = sz * (r - qz); }
      x += px * c.co + pz * c.s; z += -px * c.s + pz * c.co;
      hit = true;
    };
    for (let pass = 0; pass < 2; pass++) {
      // (The boxes round where the circle is at the start of each pass.)
      const boxes = this.boxesNear(x, z, r);
      for (let n = 0; n < boxes.length; n++) push(boxes[n]);
      const near = this.sitesNear(x, z);
      if (near) for (const c of near) push(c);
      if ((Math.abs(x) > TOWN || Math.abs(z) > TOWN) && feet > -2) {
        const ci = Math.floor(x / TRUNK_CELL), cj = Math.floor(z / TRUNK_CELL);
        for (let j = cj - 1; j <= cj + 1; j++) {
          for (let i = ci - 1; i <= ci + 1; i++) {
            const list = this.trunkCell(i, j);
            // (Nothing in a cell whose trunks can't reach the body moves it, so nothing after it in the loop changes.)
            if (!list || farFromCell(x, z, i, j, r + list.maxR)) continue;
            for (let k = 0; k < list.length; k += 4) {
              if (feet > list[k + 3]) continue;
              const dx = x - list[k], dz = z - list[k + 1], d = Math.hypot(dx, dz), R = list[k + 2] + r;
              if (d >= R || d < 1e-4) continue;
              x = list[k] + dx / d * R; z = list[k + 1] + dz / d * R;
              hit = true;
            }
          }
        }
      }
    }
    out[0] = x; out[2] = z;
    // In the cave, its walls.
    if (openingTerrain && !this.caveSealed && caveKeep(out, r, feet)) hit = true;
    return hit;
  }

  // Does a ray hit a box tall enough to block it? Returns distance, or -1.
  rayBoxes(ox, oy, oz, dx, dy, dz, maxT) {
    // (In the Warrens the rock goes floor to roof: only the plan matters.)
    if (inDungeon(ox, oz)) {
      const L = Math.hypot(dx, dz);
      if (L < 1e-5) return -1;
      const s = caveRay(ox, oz, dx / L, dz / L, maxT * L);
      return s < 0 ? -1 : s / L;
    }
    let best = -1;
    const ex = ox + dx * maxT, ez = oz + dz * maxT;
    // (Only boxes whose footprints meet the ray's: buildRayGrid. The nearest hit is the same whichever order they're tried in.)
    const boxes = this.boxesIn(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez)) ?? this.colliders;
    for (const c of boxes) {
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
      // (Underground, a box's height counts from the floor it stands on.)
      let yAt = oy + dy * t0;
      if (yAt < -2) yAt -= this.height(c.x, c.z);
      if (yAt < c.b || yAt > c.t) continue;
      if (yAt > c.h && c.h < 3.5) continue;
      if (c.h >= 3.5 && yAt > 7) continue;
      if (best < 0 || t0 < best) best = t0;
    }
    // The places' walls, near where the ray starts and ends (rays are short), by their height over the land.
    const seen = new Set();
    for (const list of [this.sitesNear(ox, oz), this.sitesNear(ox + dx * maxT, oz + dz * maxT)]) {
      if (!list) continue;
      for (const c of list) {
        if (seen.has(c)) continue;
        seen.add(c);
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
        if (oy + dy * t0 > c.h + terrainHeight(c.x, c.z)) continue;
        if (best < 0 || t0 < best) best = t0;
      }
    }
    // And the pines, stepping along the ray a cell at a time.
    const flat2 = dx * dx + dz * dz;
    if (flat2 > 1e-6 && (oy > -2 || oy + dy * maxT > -2) && (Math.abs(ox) > TOWN || Math.abs(oz) > TOWN || Math.abs(ex) > TOWN || Math.abs(ez) > TOWN)) {
      const step = TRUNK_CELL / Math.sqrt(flat2);
      let lastKey = -1;
      for (let s = 0; s <= maxT + step; s += step) {
        const key = trunkKey(Math.floor((ox + dx * Math.min(s, maxT)) / TRUNK_CELL), Math.floor((oz + dz * Math.min(s, maxT)) / TRUNK_CELL));
        if (key === lastKey) continue;
        lastKey = key;
        const list = this.trunks.get(key);
        if (!list) continue;
        for (let k = 0; k < list.length; k += 4) {
          const qx = list[k] - ox, qz = list[k + 1] - oz;
          const t = Math.max(0, Math.min(maxT, (qx * dx + qz * dz) / flat2));
          if (oy + dy * t > list[k + 3]) continue;
          if (Math.hypot(ox + dx * t - list[k], oz + dz * t - list[k + 1]) < list[k + 2] && (best < 0 || t < best)) best = t;
        }
      }
    }
    return best;
  }

  sees(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const L = Math.hypot(dx, dy, dz) || 1;
    return this.rayBoxes(ax, ay, az, dx / L, dy / L, dz / L, L) < 0;
  }

  // Breadth-first distance field to a point, so the knight can path around the houses.
  // Slot 0 is the player, shared by everyone hunting them. Anyone going elsewhere keeps a slot of their own: a key of their
  // own kind's ('k' and a knight's id, 'h' a hero's, 't' a Tripo monster's, 'f' a field creature's...), so two never share one.
  // (Two going to different places in one slot made it again for each, every tick, turn about, and one could follow the other's.)
  // Those after someone else, a hero say, use that one as the key: all of them after the same one share it.
  updateField(x, z, now, slot = 0) {
    if (inDungeon(x, z)) { (this.cave ||= new CaveNav()).field(x, z, now); return; }
    let f = this.slots.get(slot);
    if (!f) { f = this.freeField(now); this.slots.set(slot, f); }
    f.used = now;
    if (Math.abs(now - f.t) < 0.2 && Math.hypot(x - f.x, z - f.z) < 2) return;
    f.t = now; f.x = x; f.z = z;
    const si = Math.max(0, Math.min(NAV_W - 1, ((x - NAV_X0) / NAV_CELL) | 0)), sj = Math.max(0, Math.min(NAV_H - 1, ((z - NAV_Z0) / NAV_CELL) | 0));
    // The field depends on nothing but the cell it starts from (the grid doesn't change), so from the same cell it's what it was:
    // kept, as though made again. (A knight walking to a post made it five times a second.)
    if (si === f.si && sj === f.sj) return;
    f.si = si; f.sj = sj;
    const { field } = f;
    const { grid, queue } = this;
    field.fill(1e9);
    let head = 0, tail = 0;
    queue[tail++] = sj * NAV_W + si; field[sj * NAV_W + si] = 0;
    const cap = queue.length;
    const W = NAV_W;
    while (head < tail) {
      const k = queue[head++];
      const j = (k / W) | 0, i = k - j * W;
      const d = field[k];
      // (Past the reach for every neighbour: a straight step is the shortest.)
      if (d + 1 > NAV_REACH) continue;
      // The eight neighbours in the order they've always been taken in (the row above, either side, the row below), unrolled:
      // a diagonal only past two open sides, and nothing off the grid.
      const l = i > 0, r = i < W - 1, u = j > 0, dn = j < NAV_H - 1;
      const gL = l ? grid[k - 1] : 1, gR = r ? grid[k + 1] : 1, gU = u ? grid[k - W] : 1, gD = dn ? grid[k + W] : 1;
      const dd = d + 1.414, ds = d + 1, diag = dd <= NAV_REACH;
      if (u) {
        if (diag && l && !gL && !gU && !grid[k - W - 1] && dd < field[k - W - 1] - 1e-3 && tail < cap) { field[k - W - 1] = dd; queue[tail++] = k - W - 1; }
        if (!gU && ds < field[k - W] - 1e-3 && tail < cap) { field[k - W] = ds; queue[tail++] = k - W; }
        if (diag && r && !gR && !gU && !grid[k - W + 1] && dd < field[k - W + 1] - 1e-3 && tail < cap) { field[k - W + 1] = dd; queue[tail++] = k - W + 1; }
      }
      if (!gL && ds < field[k - 1] - 1e-3 && tail < cap) { field[k - 1] = ds; queue[tail++] = k - 1; }
      if (!gR && ds < field[k + 1] - 1e-3 && tail < cap) { field[k + 1] = ds; queue[tail++] = k + 1; }
      if (dn) {
        if (diag && l && !gL && !gD && !grid[k + W - 1] && dd < field[k + W - 1] - 1e-3 && tail < cap) { field[k + W - 1] = dd; queue[tail++] = k + W - 1; }
        if (!gD && ds < field[k + W] - 1e-3 && tail < cap) { field[k + W] = ds; queue[tail++] = k + W; }
        if (diag && r && !gR && !gD && !grid[k + W + 1] && dd < field[k + W + 1] - 1e-3 && tail < cap) { field[k + W + 1] = dd; queue[tail++] = k + W + 1; }
      }
    }
  }

  // A field for a new slot. A field is 1.2 MB, and with a slot for every walker the land's monsters would keep a hundred, so once
  // there are FIELDS_KEPT, one nobody has asked for in FIELD_IDLE seconds is taken over. (Never one in use: that would make it again
  // every tick, turn about, as a shared slot did.)
  freeField(now) {
    if (this.slots.size >= FIELDS_KEPT) {
      let old = null, oldKey;
      for (const [k, f] of this.slots) if (Math.abs(now - f.used) > FIELD_IDLE && (!old || f.used < old.used)) { old = f; oldKey = k; }
      if (old) { this.slots.delete(oldKey); Object.assign(old, { x: 1e9, z: 1e9, t: -1e9, si: -1, sj: -1 }); return old; }
    }
    return { field: new Float32Array(NAV_W * NAV_H), x: 1e9, z: 1e9, t: -1e9, si: -1, sj: -1, used: now };
  }

  // Unit direction along the flow field toward the target, or straight there if off the grid.
  flow(out, x, z, tx, tz, slot = 0) {
    if (inDungeon(x, z) && inDungeon(tx, tz)) return (this.cave ||= new CaveNav()).flow(out, x, z, tx, tz, this.now ?? 0);
    const i = ((x - NAV_X0) / NAV_CELL) | 0, j = ((z - NAV_Z0) / NAV_CELL) | 0;
    let bx = tx - x, bz = tz - z;
    const field = this.slots.get(slot)?.field;
    if (field && i >= 1 && j >= 1 && i < NAV_W - 1 && j < NAV_H - 1) {
      let best = field[j * NAV_W + i];
      let found = false;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if ((!di && !dj) || this.grid[(j + dj) * NAV_W + i + di]) continue;
          if (di && dj && (this.grid[j * NAV_W + i + di] || this.grid[(j + dj) * NAV_W + i])) continue;
          const v = field[(j + dj) * NAV_W + i + di];
          if (v < best - 0.01) {
            const cost = v + (di && dj ? 1.414 : 1);
            if (!found || cost < best + 1e8) { best = v; bx = di; bz = dj; found = true; }
          }
        }
      }
      // With a clear line, head straight there and skip the grid's stair-steps.
      const D = Math.hypot(tx - x, tz - z);
      if (this.clearance(x, z, (tx - x) / (D || 1), (tz - z) / (D || 1), D, NAV_RADIUS) >= D) { bx = tx - x; bz = tz - z; }
    }
    const L = Math.hypot(bx, bz) || 1;
    out[0] = bx / L; out[1] = bz / L;
    return out;
  }

  clearance(x, z, dx, dz, dist, r) {
    for (let s = Math.min(0.2, dist); s <= dist + 0.199; s += 0.2) if (this.inside(x + dx * Math.min(s, dist), z + dz * Math.min(s, dist), r)) return Math.max(0, Math.min(s, dist) - 0.2);
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
