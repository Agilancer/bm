// Auto-play's sense of the ground (src/ui/autoplay.js): the same World the sim walks everyone on (src/sim/world.js), built here
// on a thread of its own so the frame never waits on it. It answers two questions:
//
//   path   from a point to a point over the ground the sim's nav grid covers (the town, the woods round it, the cathedral and
//          the catacombs): A* on a half-metre grid of its own, kept off any circles it's told to keep clear of (a knight's post),
//          then pulled straight. (The sim's grid is a metre, and fattened for a knight: too coarse for the Sexton's passage and
//          the office door, which the sim's own walkers only get through by walking straight at them.) It keeps to the middle
//          of a street or a room where there's one, never draws a line closer to a wall than a body and a little, and goes
//          through every doorway square on: to a place a pace before its middle, then to one a pace beyond (DOORWAYS). Each
//          point is [x, z, close, door]: close to a wall there (walk, don't run), and which doorway it's a side of, or -1.
//          Null: there's no way there.
//   probe  out past the grid, where only the pines and the places' walls stand in the way: which way to step, nearest the way
//          wanted, that's clear for a few metres.
//   sight  from its eye to each of a list of marks: is there a clean line for a shot, clear of walls, corners, pines and the
//          rise of the ground by a hand's width either side; and if not, which way to step (and how far) to open one
//          (src/sim/sight.js).
//
// Started only once someone has spoken the skull's word for auto-play: it costs a few seconds of a thread to build.
import { NAV_CELL, NAV_H, NAV_W, NAV_X0, NAV_Z0, World } from './world.js';
import { floorAt, inPit } from '../core/interior.js';
import { setOpeningTerrain, terrainHeight } from '../core/terrain.js';
import { setHallDoor } from '../core/testhall.js';
import { sight } from './sight.js';

let world = null;
const CELL = 0.5, BODY = 0.42, EDGE = 250;
const X0 = NAV_X0, Z0 = NAV_Z0, W = Math.round(NAV_W * NAV_CELL / CELL), H = Math.round(NAV_H * NAV_CELL / CELL), N = W * H;
// Each cell's ground, worked out the first time a search reaches it: 0 not yet, 1 free, 2 solid.
const ground = new Uint8Array(N);
const g = new Float32Array(N), parent = new Int32Array(N), seen = new Uint16Array(N), shut = new Uint16Array(N), avoidMark = new Uint16Array(N);
let stamp = 1;
// A binary heap of cells by f.
const HEAP = 1 << 20;
const heapK = new Int32Array(HEAP), heapF = new Float32Array(HEAP);
let heapN = 0;
const push = (k, f) => {
  if (heapN >= HEAP) return;
  let i = heapN++;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapF[p] <= f) break;
    heapK[i] = heapK[p]; heapF[i] = heapF[p]; i = p;
  }
  heapK[i] = k; heapF[i] = f;
};
const pop = () => {
  const top = heapK[0], k = heapK[--heapN], f = heapF[heapN];
  let i = 0;
  for (;;) {
    let c = 2 * i + 1;
    if (c >= heapN) break;
    if (c + 1 < heapN && heapF[c + 1] < heapF[c]) c++;
    if (heapF[c] >= f) break;
    heapK[i] = heapK[c]; heapF[i] = heapF[c]; i = c;
  }
  heapK[i] = k; heapF[i] = f;
  return top;
};

const cellOf = (x, z) => {
  const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
  return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i;
};
const cx = (k) => ((k % W) + 0.5) * CELL + X0;
const cz = (k) => (((k / W) | 0) + 0.5) * CELL + Z0;
// As the sim's grid has it: out past the woods only the floors under the land (the catacombs) count, and nothing in the rift.
function solidCell(k) {
  let v = ground[k];
  if (!v) {
    const x = cx(k), z = cz(k);
    v = ground[k] = ((Math.abs(x) > EDGE || Math.abs(z) > EDGE) && (floorAt(x, z) === null || inPit(x, z))) || world.inside(x, z, BODY) ? 2 : 1;
  }
  return v === 2;
}

// How much room a free cell has: 0 not yet, 1 roomy, 2 close to a wall (within ROOMY of one). Close cells cost more to
// cross, so a path keeps to the middle of a street or a room where there is one, and only goes by a wall where it must (a
// doorway, a passage). SNUG: the nearest a drawn line may come to a wall, a body's 0.36 and a little.
const room = new Uint8Array(N);
const ROOMY = 0.8, SNUG = 0.47, CLOSE_COST = 2.4;
function closeCell(k) {
  let v = room[k];
  if (!v) v = room[k] = world.inside(cx(k), cz(k), ROOMY) ? 2 : 1;
  return v === 2;
}

// The doorways (interior.json's doors, a leaf or two to each): the middle of each, the way through it (nx, nz), and half its
// width. A path that goes through one is taken to a place a pace before its middle and then one a pace beyond, so it's
// walked square on and down the middle, from outside or from in, and never round the jamb at a slant.
let DOORWAYS = [];
const STAND = 1.0;
function setDoorways(things) {
  const by = new Map();
  for (const t of things || []) {
    if (t.type !== 'door' || !t.shut) continue;
    const b = t.shut, alongX = b.hx >= b.hz;   // (the leaf lies along x: the way through is along z)
    let d = by.get(t.id);
    if (!d) by.set(t.id, d = { id: t.id, x: t.cx, z: t.cz, nx: alongX ? 0 : 1, nz: alongX ? 1 : 0, half: 0 });
    d.half = Math.max(d.half, alongX ? Math.abs(b.x - t.cx) + b.hx : Math.abs(b.z - t.cz) + b.hz);
  }
  DOORWAYS = [...by.values()];
}
// The doorway a step from a to b goes through, if it does: [doorway, which way (1 along its normal, -1 against)].
function doorwayBetween(ax, az, bx, bz) {
  for (const d of DOORWAYS) {
    const sa = (ax - d.x) * d.nx + (az - d.z) * d.nz, sb = (bx - d.x) * d.nx + (bz - d.z) * d.nz;
    if (sa === sb || (sa > 0) === (sb > 0)) continue;
    const t = sa / (sa - sb), x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    if (Math.abs((x - d.x) * d.nz + (z - d.z) * d.nx) <= d.half + 0.1) return [d, sb > sa ? 1 : -1];
  }
  return null;
}

// Circles to keep out of, marked for this one search (a cell is kept clear by its stamp).
function markAvoid(avoid, a, b) {
  for (const [x, z, r] of avoid || []) {
    // (Not a circle you're starting in, or ending in: those you have to get out of, or into, somehow.)
    if (Math.hypot(a[0] - x, a[1] - z) < r || Math.hypot(b[0] - x, b[1] - z) < r) continue;
    const i0 = Math.max(0, Math.floor((x - r - X0) / CELL)), i1 = Math.min(W - 1, Math.floor((x + r - X0) / CELL));
    const j0 = Math.max(0, Math.floor((z - r - Z0) / CELL)), j1 = Math.min(H - 1, Math.floor((z + r - Z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(cx(j * W + i) - x, cz(j * W + i) - z) < r) avoidMark[j * W + i] = stamp;
  }
}
const blocked = (k) => avoidMark[k] === stamp || solidCell(k);

// The nearest free cell to a point, a few metres round at most.
function freeNear(x, z) {
  const k0 = cellOf(x, z);
  if (k0 < 0) return -1;
  if (!blocked(k0)) return k0;
  const i0 = k0 % W, j0 = (k0 / W) | 0;
  for (let r = 1; r <= 8; r++) {
    let best = -1, bd = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const k = j * W + i;
        if (blocked(k)) continue;
        const d = Math.hypot(cx(k) - x, cz(k) - z);
        if (d < bd) { bd = d; best = k; }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

// Can you walk straight from a to b: over free cells, and by a wall never closer to it than SNUG? (By a wall the line
// itself is measured against it, not the cell it crosses: a cell is free by its middle, and a line can cut its corner.)
function straight(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2);
  for (let s = 1; s <= n; s++) {
    const t = s / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, k = cellOf(x, z);
    if (k < 0 || blocked(k)) return false;
    if (closeCell(k) && world.inside(x, z, SNUG)) return false;
  }
  return true;
}
// Pulled straight: from each point, on to the furthest one it can see. Returns the points after the first.
function pull(pts) {
  const out = [];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !straight(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
    out.push(pts[b]);
    a = b;
  }
  return out;
}
const freeAt = (x, z) => { const k = cellOf(x, z); return k >= 0 && !blocked(k); };
const point = (x, z, door = -1) => { const k = cellOf(x, z); return [x, z, door >= 0 || (k >= 0 && closeCell(k)) ? 1 : 0, door]; };

function path(from, to, avoid) {
  if (++stamp > 65000) { stamp = 1; seen.fill(0); shut.fill(0); avoidMark.fill(0); }
  markAvoid(avoid, from, to);
  const s = freeNear(from[0], from[1]), t = freeNear(to[0], to[1]);
  if (s < 0 || t < 0) return null;
  // (Where it ends: the place asked for if a body can stand there, else the nearest it can. Never a place in a wall, or
  // behind a counter, to be walked at.)
  const end = freeAt(to[0], to[1]) ? [to[0], to[1]] : [cx(t), cz(t)];
  if (s === t) return [point(end[0], end[1])];
  const tx = cx(t), tz = cz(t);
  const h = (k) => { const dx = Math.abs(cx(k) - tx), dz = Math.abs(cz(k) - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  heapN = 0;
  g[s] = 0; parent[s] = -1; seen[s] = stamp;
  push(s, h(s));
  let found = false, budget = 400000;
  while (heapN && budget-- > 0) {
    const k = pop();
    if (shut[k] === stamp) continue;
    shut[k] = stamp;
    if (k === t) { found = true; break; }
    const i = k % W, j = (k / W) | 0;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nk = nj * W + ni;
        if (shut[nk] === stamp || blocked(nk)) continue;
        if (di && dj && (blocked(j * W + ni) || blocked(nj * W + i))) continue;
        // (By a wall costs more than down the middle.)
        const ng = g[k] + (di && dj ? 1.414 : 1) * CELL * (closeCell(nk) ? CLOSE_COST : 1);
        if (seen[nk] === stamp && ng >= g[nk]) continue;
        seen[nk] = stamp; g[nk] = ng; parent[nk] = k;
        push(nk, ng + h(nk));
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = t; k >= 0; k = parent[k]) cells.push(k);
  cells.reverse();
  const mid = cells.map((k) => [cx(k), cz(k)]);
  // The doorways on the way, in order: each cuts the way in two, a place before its middle and a place beyond.
  const out = [];
  let leg = [[from[0], from[1]]];
  for (let i = 0; i + 1 < mid.length; i++) {
    const through = doorwayBetween(mid[i][0], mid[i][1], mid[i + 1][0], mid[i + 1][1]);
    leg.push(mid[i]);
    if (!through) continue;
    const [d, dir] = through;
    // (How far back to stand: a pace, or as far as it already is if it starts nearer the door than that; a pace beyond,
    // or as far as where it's going if that's nearer.)
    const depth = (x, z) => Math.abs((x - d.x) * d.nx + (z - d.z) * d.nz);
    const stand = (side, most) => {
      for (const k of [Math.min(STAND, most), 0.75, 0.5]) {
        if (k > most + 0.01) continue;
        const x = d.x + d.nx * side * k, z = d.z + d.nz * side * k;
        if (freeAt(x, z)) return [x, z];
      }
      return null;
    };
    const beside = (x, z, side) => ((x - d.x) * d.nx + (z - d.z) * d.nz) * side > 0 && depth(x, z) < STAND && Math.abs((x - d.x) * d.nz + (z - d.z) * d.nx) < d.half + 1.5;
    const before = stand(-dir, !out.length && beside(from[0], from[1], -dir) ? Math.max(0.4, depth(from[0], from[1])) : STAND);
    const after = stand(dir, beside(end[0], end[1], dir) ? Math.max(0.4, depth(end[0], end[1])) : STAND);
    if (!before || !after) continue;
    leg.push(before);
    for (const q of pull(leg)) out.push(point(q[0], q[1], q === before ? d.id : -1));
    out.push(point(after[0], after[1], d.id));
    leg = [after];
  }
  leg.push(mid[mid.length - 1], end);
  for (const q of pull(leg)) out.push(point(q[0], q[1]));
  return out;
}

// Out past the grid: a box, a place's wall or a pine within r of feet at height y. (Height counts: the land over the catacombs
// has their walls under it, which World.inside, being flat, would see. A box is in the way between its foot and its top, as
// World.resolve has it.)
const topOf = (c) => (c.top ??= c.t ?? c.h + 0.02 + world.height(c.x, c.z));
function boxHit(c, x, z, r, y) {
  const dx = x - c.x, dz = z - c.z;
  if (Math.abs(dx) + Math.abs(dz) > c.hx + c.hz + r + 1) return false;
  if (y > topOf(c) || y < (c.b || -1e9) - 1) return false;
  return Math.abs(dx * c.co - dz * c.s) < c.hx + r && Math.abs(dx * c.s + dz * c.co) < c.hz + r;
}
// The boxes by the 16 m cell they reach into, so a point only looks at its own few.
let boxIndex = null;
function boxesNear(x, z) {
  if (!boxIndex) {
    boxIndex = new Map();
    for (const c of world.colliders) {
      const R = Math.hypot(c.hx, c.hz) + 1;
      for (let j = Math.floor((c.z - R) / 16); j <= Math.floor((c.z + R) / 16); j++) for (let i = Math.floor((c.x - R) / 16); i <= Math.floor((c.x + R) / 16); i++) {
        const k = (i + 1000) * 2000 + j + 1000;
        let l = boxIndex.get(k);
        if (!l) boxIndex.set(k, l = []);
        l.push(c);
      }
    }
  }
  return boxIndex.get((Math.floor(x / 16) + 1000) * 2000 + Math.floor(z / 16) + 1000) || [];
}
function solidAt(x, z, r, y) {
  for (const c of boxesNear(x, z)) if (boxHit(c, x, z, r, y)) return true;
  for (const c of world.sitesNear(x, z) || []) if ((c.top ??= c.h + world.height(c.x, c.z)) >= y && boxHit(c, x, z, r, y)) return true;
  if ((Math.abs(x) > 50 || Math.abs(z) > 50) && y > -2) {
    const ci = Math.floor(x / 16), cj = Math.floor(z / 16);
    for (let j = cj - 1; j <= cj + 1; j++) {
      for (let i = ci - 1; i <= ci + 1; i++) {
        const list = world.trunkCell(i, j);
        // ([x, z, radius, top] each: World.trunkCell. A boulder lower than the feet isn't in their way.)
        if (list) for (let k = 0; k < list.length; k += 4) if (y <= list[k + 3] && Math.hypot(x - list[k], z - list[k + 1]) < list[k + 2] + r) return true;
      }
    }
  }
  return false;
}
function clearFor(x, z, y, dx, dz, look) {
  for (let s = 0.4; s <= look; s += 0.4) if (solidAt(x + dx * s, z + dz * s, 0.45, y)) return s - 0.4;
  return look;
}
const TURNS = [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8, 1.1, -1.1, 1.45, -1.45, 1.9, -1.9, 2.5, -2.5, Math.PI];
function probe(x, z, y, hx, hz, look) {
  const a0 = Math.atan2(hx, hz);
  let best = null, bc = -1;
  for (const t of TURNS) {
    const a = a0 + t, dx = Math.sin(a), dz = Math.cos(a);
    const c = clearFor(x, z, y, dx, dz, look);
    if (c >= look) return [dx, dz, c];
    if (c > bc + 0.3) { bc = c; best = [dx, dz, c]; }
  }
  return best;
}

// Out in the land, a short way: A* on a half-metre grid laid round both ends just for this, each cell solid or not at the land's
// own height there (so the catacombs' walls under it don't count, and their light wells, which stand up through it, do).
const LW = 280, LN = LW * LW, lSolid = new Uint8Array(LN), lG = new Float32Array(LN), lPar = new Int32Array(LN), lSeen = new Uint16Array(LN), lShut = new Uint16Array(LN);
let lStamp = 1;
function local(from, to) {
  if (++lStamp > 65000) { lStamp = 1; lSeen.fill(0); lShut.fill(0); }
  lSolid.fill(0);
  const C = 0.5, cx0 = Math.min(from[0], to[0]) - 25, cz0 = Math.min(from[1], to[1]) - 25;
  if (Math.max(from[0], to[0]) + 25 - cx0 > LW * C || Math.max(from[1], to[1]) + 25 - cz0 > LW * C) return null;
  const cell = (x, z) => { const i = Math.floor((x - cx0) / C), j = Math.floor((z - cz0) / C); return i < 0 || j < 0 || i >= LW || j >= LW ? -1 : j * LW + i; };
  const px = (k) => ((k % LW) + 0.5) * C + cx0, pz = (k) => (((k / LW) | 0) + 0.5) * C + cz0;
  const solid = (k) => { let v = lSolid[k]; if (!v) { const x = px(k), z = pz(k); v = lSolid[k] = solidAt(x, z, 0.42, terrainHeight(x, z) + 0.25) ? 2 : 1; } return v === 2; };
  let s = cell(from[0], from[1]), t = cell(to[0], to[1]);
  if (s < 0 || t < 0) return null;
  // (Starting or ending against something: the nearest clear cell instead.)
  const clear = (k0) => { if (!solid(k0)) return k0; const i0 = k0 % LW, j0 = (k0 / LW) | 0; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = i0 + di, j = j0 + dj; if (i >= 0 && j >= 0 && i < LW && j < LW && !solid(j * LW + i)) return j * LW + i; } return -1; };
  s = clear(s); t = clear(t);
  if (s < 0 || t < 0) return null;
  const tx = px(t), tz = pz(t), h = (k) => { const dx = Math.abs(px(k) - tx), dz = Math.abs(pz(k) - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  heapN = 0; lG[s] = 0; lPar[s] = -1; lSeen[s] = lStamp; push(s, h(s));
  let found = false, budget = 60000;
  while (heapN && budget-- > 0) {
    const k = pop();
    if (lShut[k] === lStamp) continue;
    lShut[k] = lStamp;
    if (k === t) { found = true; break; }
    const i = k % LW, j = (k / LW) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= LW || nj >= LW) continue;
      const nk = nj * LW + ni;
      if (lShut[nk] === lStamp || solid(nk)) continue;
      if (di && dj && (solid(j * LW + ni) || solid(nj * LW + i))) continue;
      const ng = lG[k] + (di && dj ? 1.414 : 1) * C;
      if (lSeen[nk] === lStamp && ng >= lG[nk]) continue;
      lSeen[nk] = lStamp; lG[nk] = ng; lPar[nk] = k;
      push(nk, ng + h(nk));
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = t; k >= 0; k = lPar[k]) cells.push(k);
  cells.reverse();
  const pts = [[from[0], from[1]]].concat(cells.map((k) => [px(k), pz(k)]));
  const see = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25); for (let q = 1; q <= n; q++) { const k = cell(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n); if (k < 0 || solid(k)) return false; } return true; };
  const out = [];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !see(pts[a], pts[b])) b--;
    out.push(pts[b]);
    a = b;
  }
  return out;
}

// For tests (tests/nav-ground.test.mjs): the same questions asked of a World built there, with no thread.
export function navFor(w, interior = null) {
  world = w; boxIndex = null; ground.fill(0); room.fill(0);
  setDoorways(interior?.things);
  return { solidAt, clearFor, probe, local, path, straight, doorways: () => DOORWAYS, SNUG };
}

// (A worker's own scope: not there when a test imports this file.)
if (typeof self !== 'undefined') self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'boot') {
      setOpeningTerrain(m.opening);
      const [village, interior] = await Promise.all(['village.json', 'interior/interior.json'].map((f) => fetch(`${m.base}assets/game/${f}`).then((r) => r.json())));
      world = new World(village, interior);
      setDoorways(interior.things);
      self.postMessage({ type: 'ready', spawns: world.spawns.map((s) => [s.x, s.z]), bounds: [X0, Z0, X0 + W * CELL, Z0 + H * CELL] });
    } else if (!world) {
      self.postMessage({ type: m.type, id: m.id, result: null });
    } else if (m.type === 'path') {
      self.postMessage({ type: 'path', id: m.id, result: path(m.from, m.to, m.avoid) });
    } else if (m.type === 'local') {
      self.postMessage({ type: 'local', id: m.id, result: local(m.from, m.to) });
    } else if (m.type === 'probe') {
      self.postMessage({ type: 'probe', id: m.id, result: probe(m.x, m.z, m.y ?? 0, m.hx, m.hz, m.look || 5) });
    } else if (m.type === 'sight') {
      // (The Test Dungeon's door, as the page last saw it: shut, nothing's shot through it.)
      setHallDoor(!!m.hallOpen);
      self.postMessage({ type: 'sight', id: m.id, result: sight(world, m.from, m.marks) });
    }
  } catch (err) {
    self.postMessage({ type: m.type, id: m.id, result: null, error: String(err?.message || err) });
  }
};
