// The Test Dungeon: the main menu's way in for trying out the game's monsters. A bright white hall with three people in it
// (gear for nothing, a party for nothing, and whoever you want to fight), and a big door at its north end that opens on an
// arena. What you summon stands in the arena; the door opens on them, and shuts again once they're all down. Fall, and you're
// stood back at the hall's south end with everything as it was. (src/sim/testhall.js runs it, src/ui/testhall.js is its panels.)
//
// Where it really is: out past the world's west edge (WORLD_EDGE in src/core/lands.js), the far side of the world from the
// Hollowfang Warrens, and fifty metres under the land, so nothing walking the surface ever comes near it. Like the Warrens it
// has no colliders: its shape is a field (hallRoom, how far a point is inside the open floor), which the sim's World walks
// against (src/sim/world.js), and its walls, floor and ceiling are built from the same numbers (buildHall, for
// src/core/sites.js). The shaders call everything in its box the hall, and light it white (indoorAt in src/gfx/shaders.js).
//
// It's shared by every thread. The door is the one thing in it that moves: setHallDoor says whether its way through is open,
// on whichever thread asks (the sim's, the nav thread's), and the render thread slides the slab (src/gfx/renderer.js).
//
// The two letters: nothing in here carries a V or a T. It's plain white stone and grey iron.

// Where it lies: the middle of the doorway in the world, and the height of its floor.
export const HALL = { name: 'the Test Dungeon', x: -5800, z: 0, y: -50 };
// The rooms, in the hall's own frame (x east, z south of the doorway): the hall you start in, and the arena past the door.
export const LOBBY = { x0: -12, x1: 12, z0: 0, z1: 30, roof: 8 };
export const ARENA = { x0: -24, x1: 24, z0: -49.6, z1: -1.6, roof: 14 };
// The doorway through the wall between them, how high it is, and where the slab hangs in it (z, front and back).
export const DOOR = { x0: -4.5, x1: 4.5, z0: -1.6, z1: 0, h: 7, slab: [-1.0, -0.6], open: 2.6 };   // open: seconds to rise or fall
// Where you're stood: the hall's south end, looking up it at the door.
export const SPAWN = { x: 0, z: 26, yaw: Math.PI };
// Its three people, each behind a counter. who: which of the Free Company's bodies stands there (src/core/heroes.js BROKERS).
// at: where you stand to talk to them (E), in front of the counter.
export const STATIONS = [
  { key: 'gear', who: 'portal', x: -10.2, z: 15, yaw: Math.PI / 2, at: [-7.4, 15], counter: { x: -8.6, z: 15, hx: 0.45, hz: 2.6 }, name: 'The Hall Stores' },
  { key: 'party', who: 'town', x: 10.2, z: 15, yaw: -Math.PI / 2, at: [7.4, 15], counter: { x: 8.6, z: 15, hx: 0.45, hz: 2.6 }, name: 'The Free Company' },
  { key: 'foes', who: 'hall', x: -8, z: 2.2, yaw: 0, at: [-8, 5.6], counter: { x: -8, z: 3.9, hx: 2.6, hz: 0.45 }, name: 'The Summoning' },
];
export const STATION_REACH = 3.4;
export const COUNTER_H = 1.05;
// Where the summoned stand, in the arena's far half, before the door opens on them.
export const MUSTER = { x: 0, z: -30, r: 13 };

const BOX = { x0: -26, x1: 26, z0: -52, z1: 32 };
// Its box in the world, for the shaders, the map and a quick test. y0, y1: everything between is the hall's.
export const HALL_BOX = { x0: HALL.x + BOX.x0, x1: HALL.x + BOX.x1, z0: HALL.z + BOX.z0, z1: HALL.z + BOX.z1, y0: HALL.y - 20, y1: HALL.y + 25 };
export const inHall = (x, z) => x > HALL_BOX.x0 && x < HALL_BOX.x1 && z > HALL_BOX.z0 && z < HALL_BOX.z1;
// Whether a point (in the world) is in the arena, past the door, and in the hall you start in.
export const inArena = (x, z) => { const u = x - HALL.x, v = z - HALL.z; return u > ARENA.x0 - 0.5 && u < ARENA.x1 + 0.5 && v > ARENA.z0 - 0.5 && v < DOOR.z0 + 0.3; };
export const inLobby = (x, z) => { const u = x - HALL.x, v = z - HALL.z; return u > LOBBY.x0 - 0.5 && u < LOBBY.x1 + 0.5 && v > LOBBY.z0 + 0.4 && v < LOBBY.z1 + 0.5; };
export const inDoorway = (x, z, pad = 0) => { const u = x - HALL.x, v = z - HALL.z; return u > DOOR.x0 - pad && u < DOOR.x1 + pad && v > DOOR.z0 - pad && v < DOOR.z1 + pad; };
// A point in the hall's frame, in the world.
export const hallAt = (x, z) => [HALL.x + x, HALL.z + z];

// ---- the door ----------------------------------------------------------------------------------------------------------

let doorOpen = false, doorSeq = 0;
// Whether the way through the door is open (on this thread). The sim says, from the door's own state (src/sim/testhall.js).
export function setHallDoor(open) { if (open !== doorOpen) { doorOpen = open; doorSeq++; } }
export const hallDoorOpen = () => doorOpen;

// ---- the field ---------------------------------------------------------------------------------------------------------

// How far inside a rectangle a point is (below zero, outside it); and how far outside a box (below zero, inside it).
const inRect = (u, v, r) => Math.min(u - r.x0, r.x1 - u, v - r.z0, r.z1 - v);
function outBox(u, v, b) {
  const qx = Math.abs(u - b.x) - b.hx, qz = Math.abs(v - b.z) - b.hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}
// (The doorway's floor runs on a way into each room, so the two join without a seam, and its edges are the door's sides.)
const PASS = { x0: DOOR.x0, x1: DOOR.x1, z0: DOOR.z0 - 3, z1: DOOR.z1 + 3 };
const COUNTERS = STATIONS.map((s) => s.counter);

// How far inside the open floor a point (in the world) is: metres, below zero in the wall. Never more than the true distance
// to the nearest wall, so a ray can step by it.
export function hallRoom(x, z) {
  const u = x - HALL.x, v = z - HALL.z;
  let f = Math.max(inRect(u, v, LOBBY), inRect(u, v, ARENA));
  if (doorOpen) f = Math.max(f, inRect(u, v, PASS));
  for (const c of COUNTERS) f = Math.min(f, outBox(u, v, c));
  return f;
}
export const hallFloorY = () => HALL.y;
// The ceiling over a point: the arena's is higher than the hall's, and the doorway's lowest.
export function hallRoofY(x, z) {
  const v = z - HALL.z, u = x - HALL.x;
  if (v >= LOBBY.z0) return HALL.y + LOBBY.roof;
  if (v > DOOR.z0 && u > DOOR.x0 && u < DOOR.x1) return HALL.y + DOOR.h;
  return HALL.y + ARENA.roof;
}

// Push a body of radius r out of the walls, along the way out. True if it was pushed.
export function hallKeep(out, r) {
  let hit = false;
  for (let pass = 0; pass < 3; pass++) {
    const x = out[0], z = out[2], d = hallRoom(x, z);
    if (d >= r) break;
    const e = 0.05, gx = hallRoom(x + e, z) - hallRoom(x - e, z), gz = hallRoom(x, z + e) - hallRoom(x, z - e);
    const L = Math.hypot(gx, gz);
    if (L < 1e-6) break;
    const push = Math.min(3, r - d + 0.005);
    out[0] = x + gx / L * push; out[2] = z + gz / L * push;
    hit = true;
  }
  return hit;
}

// How far a ray goes along the ground before a wall, or -1 if it doesn't meet one within maxT (the walls go floor to ceiling).
export function hallRay(ox, oz, dx, dz, maxT) {
  const L = Math.hypot(dx, dz);
  if (L < 1e-6) return -1;
  const ux = dx / L, uz = dz / L;
  for (let s = 0; s <= maxT;) {
    const d = hallRoom(ox + ux * s, oz + uz * s);
    if (d < 0.02) return s;
    s += Math.max(0.05, d);
  }
  return -1;
}
// Whether a straight line along the ground stays in the open.
export const hallClear = (ax, az, bx, bz, pad = 0.05) => {
  const L = Math.hypot(bx - ax, bz - az);
  if (L < 1e-4) return hallRoom(ax, az) >= pad;
  for (let s = 0; s <= L;) {
    const d = hallRoom(ax + (bx - ax) * s / L, az + (bz - az) * s / L) - pad;
    if (d < 0.01) return false;
    s += Math.max(0.05, d);
  }
  return true;
};

// ---- the hall's own flow field, for whatever chases or follows inside it -------------------------------------------------
// As the Warrens' (CaveNav in src/core/dungeon.js): a metre grid, the cells too near a wall for a body shut, a field to each
// goal (rounded to two metres) shared by everyone going there. Made again when the door opens or shuts.

export class HallNav {
  constructor() {
    this.cell = 1; this.x0 = HALL_BOX.x0; this.z0 = HALL_BOX.z0;
    this.W = Math.ceil((HALL_BOX.x1 - HALL_BOX.x0) / this.cell); this.H = Math.ceil((HALL_BOX.z1 - HALL_BOX.z0) / this.cell);
    this.block = new Uint8Array(this.W * this.H);
    this.queue = new Int32Array(this.W * this.H);
    this.fields = new Map();
    this.seq = -1;
    this.refresh();
  }

  refresh() {
    if (this.seq === doorSeq) return;
    this.seq = doorSeq;
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) this.block[j * this.W + i] = hallRoom(this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell) < 0.55 ? 1 : 0;
    this.fields.clear();
  }

  cellOf(x, z) {
    const i = Math.max(0, Math.min(this.W - 1, Math.floor((x - this.x0) / this.cell))), j = Math.max(0, Math.min(this.H - 1, Math.floor((z - this.z0) / this.cell)));
    return j * this.W + i;
  }

  field(tx, tz, now) {
    this.refresh();
    const key = Math.round(tx / 2) * 100003 + Math.round(tz / 2);
    let f = this.fields.get(key);
    if (f && now - f.t < 3 && now >= f.t) { this.fields.delete(key); this.fields.set(key, f); return f.d; }
    const d = f?.d || new Float32Array(this.W * this.H);
    d.fill(1e9);
    let start = this.cellOf(tx, tz);
    if (this.block[start]) {
      let best = -1, bd = 1e9;
      const si = start % this.W, sj = (start / this.W) | 0;
      for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
        const i = si + di, j = sj + dj;
        if (i < 0 || j < 0 || i >= this.W || j >= this.H || this.block[j * this.W + i]) continue;
        if (di * di + dj * dj < bd) { bd = di * di + dj * dj; best = j * this.W + i; }
      }
      if (best >= 0) start = best;
    }
    const q = this.queue, W = this.W, H = this.H, B = this.block;
    let head = 0, tail = 0;
    q[tail++] = start; d[start] = 0;
    while (head < tail) {
      const k = q[head++], i = k % W, j = (k / W) | 0, dk = d[k];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nk = nj * W + ni;
        if (B[nk] || (di && dj && (B[j * W + ni] || B[nj * W + i]))) continue;
        const nd = dk + (di && dj ? 1.414 : 1);
        if (nd < d[nk] - 1e-3) { d[nk] = nd; q[tail++] = nk; }
      }
    }
    if (f) this.fields.delete(key);
    this.fields.set(key, { d, t: now });
    while (this.fields.size > 10) this.fields.delete(this.fields.keys().next().value);
    return d;
  }

  // The way to go from (x, z) toward (tx, tz): straight when the way's open, else down the field.
  flow(out, x, z, tx, tz, now) {
    const L = Math.hypot(tx - x, tz - z) || 1;
    if (L < 1.2 || hallClear(x, z, tx, tz, 0.5)) { out[0] = (tx - x) / L; out[1] = (tz - z) / L; return out; }
    const d = this.field(tx, tz, now), W = this.W;
    const k = this.cellOf(x, z), i = k % W, j = (k / W) | 0;
    let best = d[k], bx = (tx - x) / L, bz = (tz - z) / L;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= this.H) continue;
      const v = d[nj * W + ni] + (di && dj ? 0.414 : 0);
      if (v < best - 0.01) { best = v; bx = di; bz = dj; }
    }
    if (best >= 1e8 || this.block[k]) {
      const e = 0.3, gx = hallRoom(x + e, z) - hallRoom(x - e, z), gz = hallRoom(x, z + e) - hallRoom(x, z - e);
      if (Math.hypot(gx, gz) > 1e-4) { bx = gx; bz = gz; }
    }
    const l = Math.hypot(bx, bz) || 1;
    out[0] = bx / l; out[1] = bz / l;
    return out;
  }

  walkDist(x, z, tx, tz, now) {
    const d = this.field(tx, tz, now)[this.cellOf(x, z)];
    return d >= 1e8 ? Infinity : d;
  }
}

// ---- its lights, and what it's built of --------------------------------------------------------------------------------

// The panels in the ceilings, each a light: [x, y, z] in the world. The same on every thread, so what's drawn is what's lit.
export function hallLights() {
  const out = [];
  for (const [r, nx, nz] of [[LOBBY, 3, 4], [ARENA, 4, 4]]) {
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const u = r.x0 + (r.x1 - r.x0) * (i + 0.5) / nx, v = r.z0 + (r.z1 - r.z0) * (j + 0.5) / nz;
      out.push([HALL.x + u, HALL.y + r.roof - 0.05, HALL.z + v]);
    }
  }
  return out;
}

// The hall's walls, floors, ceilings, counters and light panels, into a src/core/sites.js Kit: white stone, a tiled white floor,
// grey iron. Each face is wound to look into the room. No colliders: World walks hallRoom.
export function buildHall(K) {
  const Y = HALL.y, X = (u) => HALL.x + u, Z = (v) => HALL.z + v;
  const up = [0, 1, 0], down = [0, -1, 0];
  // A floor (or a ceiling, looking down) over a rectangle.
  const floor = (layer, r, y, n) => {
    const a = [X(r.x0), y, Z(r.z0)], b = [X(r.x0), y, Z(r.z1)], c = [X(r.x1), y, Z(r.z1)], d = [X(r.x1), y, Z(r.z0)];
    if (n === up) K.quad(layer, a, b, c, d, up); else K.quad(layer, a, d, c, b, down);
  };
  // A wall along x (at z = v) or along z (at x = u), from y0 to y1, facing the way n says.
  const wallX = (layer, u0, u1, v, y0, y1, nz) => {
    const a = [X(u0), y0, Z(v)], b = [X(u1), y0, Z(v)], c = [X(u1), y1, Z(v)], d = [X(u0), y1, Z(v)];
    if (nz > 0) K.quad(layer, b, a, d, c, [0, 0, 1]); else K.quad(layer, a, b, c, d, [0, 0, -1]);
  };
  const wallZ = (layer, v0, v1, u, y0, y1, nx) => {
    const a = [X(u), y0, Z(v0)], b = [X(u), y0, Z(v1)], c = [X(u), y1, Z(v1)], d = [X(u), y1, Z(v0)];
    if (nx > 0) K.quad(layer, a, b, c, d, [1, 0, 0]); else K.quad(layer, b, a, d, c, [-1, 0, 0]);
  };
  // The hall you start in.
  floor('tile', LOBBY, Y, up); floor('white', LOBBY, Y + LOBBY.roof, down);
  wallZ('white', LOBBY.z0, LOBBY.z1, LOBBY.x0, Y, Y + LOBBY.roof, 1);
  wallZ('white', LOBBY.z0, LOBBY.z1, LOBBY.x1, Y, Y + LOBBY.roof, -1);
  wallX('white', LOBBY.x0, LOBBY.x1, LOBBY.z1, Y, Y + LOBBY.roof, -1);
  // Its north wall, round the doorway.
  wallX('white', LOBBY.x0, DOOR.x0, LOBBY.z0, Y, Y + LOBBY.roof, 1);
  wallX('white', DOOR.x1, LOBBY.x1, LOBBY.z0, Y, Y + LOBBY.roof, 1);
  wallX('white', DOOR.x0, DOOR.x1, LOBBY.z0, Y + DOOR.h, Y + LOBBY.roof, 1);
  // The arena.
  floor('tile', ARENA, Y, up); floor('white', ARENA, Y + ARENA.roof, down);
  wallZ('white', ARENA.z0, ARENA.z1, ARENA.x0, Y, Y + ARENA.roof, 1);
  wallZ('white', ARENA.z0, ARENA.z1, ARENA.x1, Y, Y + ARENA.roof, -1);
  wallX('white', ARENA.x0, ARENA.x1, ARENA.z0, Y, Y + ARENA.roof, 1);
  wallX('white', ARENA.x0, DOOR.x0, ARENA.z1, Y, Y + ARENA.roof, -1);
  wallX('white', DOOR.x1, ARENA.x1, ARENA.z1, Y, Y + ARENA.roof, -1);
  wallX('white', DOOR.x0, DOOR.x1, ARENA.z1, Y + DOOR.h, Y + ARENA.roof, -1);
  // The doorway: its floor, its sides in iron, and its head with a slot in it the slab rises into.
  floor('tile', { x0: DOOR.x0, x1: DOOR.x1, z0: DOOR.z0, z1: DOOR.z1 }, Y, up);
  wallZ('iron', DOOR.z0, DOOR.z1, DOOR.x0, Y, Y + DOOR.h, 1);
  wallZ('iron', DOOR.z0, DOOR.z1, DOOR.x1, Y, Y + DOOR.h, -1);
  floor('iron', { x0: DOOR.x0, x1: DOOR.x1, z0: DOOR.z0, z1: DOOR.slab[0] - 0.05 }, Y + DOOR.h, down);
  floor('iron', { x0: DOOR.x0, x1: DOOR.x1, z0: DOOR.slab[1] + 0.05, z1: DOOR.z1 }, Y + DOOR.h, down);
  // An iron frame round it on both faces, so it reads as a door from across either room.
  for (const [v, n] of [[LOBBY.z0 + 0.02, 1], [ARENA.z1 - 0.02, -1]]) {
    wallX('iron', DOOR.x0 - 0.5, DOOR.x0, v, Y, Y + DOOR.h + 0.5, n);
    wallX('iron', DOOR.x1, DOOR.x1 + 0.5, v, Y, Y + DOOR.h + 0.5, n);
    wallX('iron', DOOR.x0, DOOR.x1, v, Y + DOOR.h, Y + DOOR.h + 0.5, n);
  }
  // The counters: white with an iron top.
  for (const s of STATIONS) {
    const c = s.counter;
    K.box('white', X(c.x), Y, Z(c.z), c.hx, COUNTER_H, c.hz, 0, { top: 'iron', collide: false });
  }
  // A light panel under each light, a little proud of the ceiling.
  for (const [x, y, z] of hallLights()) {
    const h = 0.9;
    K.quad('glow', [x - h, y, z - h], [x + h, y, z - h], [x + h, y, z + h], [x - h, y, z + h], down);
  }
  K.spots.hall = [HALL.x + SPAWN.x, HALL.y, HALL.z + SPAWN.z, SPAWN.yaw];
}
