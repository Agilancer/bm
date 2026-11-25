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
//          It ends at the nearest place to where it was asked for that a body can stand and get to (not a gap shut in
//          behind a bed), and, asked for something to put a hand to (`touch`), one with nothing between it and that.
//          From inside such a gap (a body can get into one the grid calls shut), it starts with the way out (outOf).
//          Null: there's no way there.
//   probe  out past the grid, where only the pines and the places' walls stand in the way: which way to step, nearest the way
//          wanted, that's clear for a few metres.
//   escape out of a snug corner or a pocket, on a finer grid, to ground the rest of the walking grid is joined to.
//   east   in City State Phobos and Castle Velscour, over streets, stairs, decks and bridges one over another: by the east's
//          own walking map (src/sim/east-nav.js, assets/game/nav/east.bin, fetched the first time it's asked).
//   sight  from its eye to each of a list of marks: is there a clean line for a shot, clear of walls, corners, pines and the
//          rise of the ground by a hand's width either side; and if not, which way to step (and how far) to open one
//          (src/sim/sight.js).
//
// Started only once auto-play is first wanted (the Auto button or P): it costs a few seconds of a thread to build.
import { NAV_CELL, NAV_H, NAV_W, NAV_X0, NAV_Z0, World } from './world.js';
import { floorAt, inPit } from '../core/interior.js';
import { setOpeningTerrain, terrainHeight } from '../core/terrain.js';
import { setHallDoor } from '../core/testhall.js';
import { lineClear, sight } from './sight.js';
import { allWays } from '../core/roads.js';
import { TOWN } from '../core/town.js';
import { EastNav } from './east-nav.js';

let world = null, east = null, eastAsk = null, base = '';
// (The east's map, fetched once, the first time anyone's way is there.)
// (And let go of again three minutes after the last ask: some fifty megabytes a phone shouldn't carry about Bellmourn.)
let eastLast = 0;
const eastNav = () => { eastLast = Date.now(); return (eastAsk ??= fetch(`${base}assets/game/nav/east.bin`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (east = b ? new EastNav(b, world) : null)).catch(() => null)); };
// (unref: under Node, where the tests import this file for navFor, a timer kept on would keep the test from ever ending.)
setInterval(() => { if (east && Date.now() - eastLast > 180000) { east = null; eastAsk = null; } }, 30000).unref?.();
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

// Keeping off the grass. In the town and just round it (POLITE metres out from TOWN), a walk asked for politely (auto-play
// going about its errands: `polite` in the ask) keeps to the streets, the lanes, the paths to the doors and the worn square
// by the well, as the townsfolk do (GRASS in src/folk/ground.js): a step over grass costs GRASS more than one on a worn way,
// so it goes up to three times as far round to stay on one, and only crosses the grass where there's no way round (up to a
// stall, or someone stood in their yard). Indoors every step costs the same. It used to take the straight line between any
// two places in the town, round the sides of the houses and over their gardens; and at 0.8 more (under twice as dear) it
// still cut round the backs of the houses on its way out to the woods, two thirds of a run's walking in the town over the
// grass (the owner: "stays on the paths in town, not cutting around the outside of the buildings").
// tools/autoplay/town-grass.mjs reads a run's walking for it.
const GRASS = 2, POLITE = 24, SQUARE = [-1.5, 1, 8];
const PB = { x0: TOWN.x0 - POLITE, x1: TOWN.x1 + POLITE, z0: TOWN.z0 - POLITE, z1: TOWN.z1 + POLITE };
let polite = false;
// How worn each cell is, worked out the first time it's asked: 0 not yet, else 1 + 254 times how worn (0 grass, 1 a way's middle).
const wear = new Uint8Array(N);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// The ways' stretches by the 8 m square they come within reach of, inside PB.
let wayIndex = null;
function waysNear(x, z) {
  if (!wayIndex) {
    wayIndex = new Map();
    for (const w of allWays()) {
      for (let i = 0; i + 1 < w.pts.length; i++) {
        const [ax, az] = w.pts[i], [bx, bz] = w.pts[i + 1], m = w.w * 1.1 + 1;
        if (Math.max(ax, bx) + m < PB.x0 || Math.min(ax, bx) - m > PB.x1 || Math.max(az, bz) + m < PB.z0 || Math.min(az, bz) - m > PB.z1) continue;
        const s = [ax, az, bx - ax, bz - az, (bx - ax) ** 2 + (bz - az) ** 2 || 1, w.w];
        for (let jj = Math.floor((Math.min(az, bz) - m) / 8); jj <= Math.floor((Math.max(az, bz) + m) / 8); jj++) {
          for (let ii = Math.floor((Math.min(ax, bx) - m) / 8); ii <= Math.floor((Math.max(ax, bx) + m) / 8); ii++) {
            const key = (ii + 500) * 1000 + jj + 500;
            let l = wayIndex.get(key);
            if (!l) wayIndex.set(key, l = []);
            l.push(s);
          }
        }
      }
    }
  }
  return wayIndex.get((Math.floor(x / 8) + 500) * 1000 + Math.floor(z / 8) + 500) || [];
}
// How worn the ground is at (x, z): 0 grass, 1 the middle of a way or the square (without the ragged edge the paint has).
export function wornAt(x, z) {
  let best = 1 - sstep(SQUARE[2] - 2, SQUARE[2] + 1.5, Math.hypot(x - SQUARE[0], z - SQUARE[1]));
  for (const [ax, az, dx, dz, L2, w] of waysNear(x, z)) {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < w * 1.1) best = Math.max(best, 1 - sstep(w * 0.5, w * 1.1, d));
  }
  return best;
}
// What more a step onto this cell costs for being grass: nothing on a way, indoors, off in the country, or asked plainly.
function grassCost(k) {
  if (!polite) return 0;
  let v = wear[k];
  if (!v) {
    const x = cx(k), z = cz(k);
    v = wear[k] = x < PB.x0 || x > PB.x1 || z < PB.z0 || z > PB.z1 || floorAt(x, z) !== null ? 255 : 1 + Math.round(254 * wornAt(x, z));
  }
  return GRASS * (255 - v) / 254;
}
// A step's whole price onto a cell, as A* pays it: 1 down the middle of a way, more by a wall, more on grass.
const stepCost = (k) => (closeCell(k) ? CLOSE_COST : 1) + grassCost(k);
// What walking straight from a to b costs in the same coin, so a way that keeps to the road isn't pulled straight off it
// across the grass.
function toll(ax, az, bx, bz) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (CELL * 0.5)));
  let sum = 0;
  for (let q = 0; q <= n; q++) {
    const k = cellOf(ax + (bx - ax) * q / n, az + (bz - az) * q / n);
    if (k >= 0) sum += stepCost(k) * (q === 0 || q === n ? 0.5 : 1);
  }
  return sum * L / n;
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
// (From somewhere the grid calls solid, a snug corner a body can still stand in: the nearest free place it can walk to in a
// straight line, a body's width clear all the way, before the nearest of all. The nearest of all can be the other side of
// a wall: wedged in the nook between Silas Crane's hearth and his partition, its way out began through the partition,
// and it pushed at that till it was stopped.)
const bodyLine = (ax, az, bx, bz) => { const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.15)); for (let q = 1; q <= n; q++) if (world.inside(ax + (bx - ax) * q / n, az + (bz - az) * q / n, 0.3)) return false; return true; };
function freeNear(x, z) {
  const k0 = cellOf(x, z);
  if (k0 < 0) return -1;
  if (!blocked(k0)) return k0;
  const i0 = k0 % W, j0 = (k0 / W) | 0;
  let any = -1;
  for (let r = 1; r <= 8; r++) {
    let best = -1, bd = Infinity, near = -1, nd = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const k = j * W + i;
        if (blocked(k)) continue;
        const d = Math.hypot(cx(k) - x, cz(k) - z);
        if (d < nd) { nd = d; near = k; }
        if (d < bd && bodyLine(x, z, cx(k), cz(k))) { bd = d; best = k; }
      }
    }
    if (best >= 0) return best;
    if (any < 0 && near >= 0) any = near;
  }
  return any;
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
// Pulled straight: from each point, on to the furthest one it can see. Returns the points after the first. Asked politely,
// only as far as it can walk straight for no more than the way round costs (each point's `c`, what A* paid to get there),
// so a way that keeps to a street isn't pulled off it across the grass; and by halves, since each look along it is a walk
// of its own.
function pull(pts) {
  const out = [];
  let a = 0;
  const ok = (a, b) => straight(pts[a][0], pts[a][1], pts[b][0], pts[b][1])
    && (!polite || pts[a].c === undefined || pts[b].c === undefined || toll(pts[a][0], pts[a][1], pts[b][0], pts[b][1]) <= (pts[b].c - pts[a].c) * 1.02 + 0.5);
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    if (polite) { b = Math.min(b, a + 160); while (b > a + 1 && !ok(a, b)) b = a + Math.max(1, (b - a) >> 1); }
    else while (b > a + 1 && !ok(a, b)) b--;
    out.push(pts[b]);
    a = b;
  }
  return out;
}
const freeAt = (x, z) => { const k = cellOf(x, z); return k >= 0 && !blocked(k); };

// A pocket: a few free cells shut in on themselves (the gap behind a bed, the corner past a chest), too small a way in for a
// body. Nowhere to walk to: the nearest free place to a chest in a corner is often one of these, with the room's own floor a
// step further off. Found by filling out from the cell, and kept (the walls don't move).
const POCKET = 220, pocket = new Map(), fill = new Int32Array(POCKET + 8);
function inPocket(k0) {
  let v = pocket.get(k0);
  if (v !== undefined) return v;
  const seenHere = new Set([k0]);
  let head = 0, tail = 0;
  fill[tail++] = k0;
  while (head < tail && tail < POCKET) {
    const k = fill[head++], i = k % W, j = (k / W) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni;
      if (seenHere.has(nk) || solidCell(nk)) continue;
      seenHere.add(nk);
      fill[tail++] = nk;
      if (tail >= POCKET) break;
    }
  }
  v = tail < POCKET;
  // (All of it is the one pocket, or none of it is.)
  for (const k of seenHere) pocket.set(k, v);
  return v;
}
// The nearest free cell to a point that isn't shut in a pocket of its own, a few metres round at most; or -1. `home`: a
// cell that is itself in the pocket (where it's standing: then that's where it is, and no pocket to it). `touch`: the
// height of something there to put a hand to or have a word with (a chest's lid, someone's chest): then only a place
// with nothing between it and that, so it isn't sent to stand at the far side of a wall from it.
function standNear(x, z, home = -1, touch = null) {
  const k0 = cellOf(x, z);
  if (k0 < 0) return -1;
  const ok = (k) => !blocked(k) && (!inPocket(k) || (home >= 0 && pocket.get(home) && inPocket(home) && sameFill(k, home)))
    && (touch === null || lineClear(world, cx(k), world.height(cx(k), cz(k)) + 1.5, cz(k), x, touch, z));
  if (ok(k0)) return k0;
  const i0 = k0 % W, j0 = (k0 / W) | 0;
  let best = -1, bd = Infinity;
  for (let r = 1; r <= 8; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const k = j * W + i;
        if (!ok(k)) continue;
        const d = Math.hypot(cx(k) - x, cz(k) - z);
        if (d < bd) { bd = d; best = k; }
      }
    }
    // (A ring's corners are further off than the next ring's sides: one more ring, to be sure of the nearest.)
    if (best >= 0 && bd <= r * CELL) return best;
  }
  return best;
}
// Two cells of pockets: the same one? (Filled out from the one till the other's met, or it's all filled.)
function sameFill(a, b) {
  if (a === b) return true;
  const seenHere = new Set([a]), q = [a];
  while (q.length && seenHere.size < POCKET) {
    const k = q.pop(), i = k % W, j = (k / W) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni;
      if (nk === b) return true;
      if (seenHere.has(nk) || solidCell(nk)) continue;
      seenHere.add(nk); q.push(nk);
    }
  }
  return false;
}
const point = (x, z, door = -1) => { const k = cellOf(x, z); return [x, z, door >= 0 || (k >= 0 && closeCell(k)) ? 1 : 0, door]; };

// (again: this is the way on from the end of a way out of a pocket, so not out of one again.)
function path(from, to, avoid, touch = null, again = false) {
  if (++stamp > 65000) { stamp = 1; seen.fill(0); shut.fill(0); avoidMark.fill(0); }
  markAvoid(avoid, from, to);
  // (Where it's going: the nearest place to it a body can stand that isn't a pocket shut in on itself, unless that's the
  // very pocket it's standing in.)
  const s = freeNear(from[0], from[1]), t = s < 0 ? -1 : standNear(to[0], to[1], s, touch);
  if (s < 0 && !again && cellOf(from[0], from[1]) >= 0) return outOf(s, from, to, avoid, touch);
  if (s < 0 || t < 0) return null;
  // (Where it ends: the place asked for if that's where it's going, else the nearest it can stand. Never a place in a
  // wall, or behind a counter, to be walked at.)
  const end = cellOf(to[0], to[1]) === t ? [to[0], to[1]] : [cx(t), cz(t)];
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
        // (By a wall costs more than down the middle; and asked politely, over the town's grass more than on its ways.)
        const ng = g[k] + (di && dj ? 1.414 : 1) * CELL * stepCost(nk);
        if (seen[nk] === stamp && ng >= g[nk]) continue;
        seen[nk] = stamp; g[nk] = ng; parent[nk] = k;
        push(nk, ng + h(nk));
      }
    }
  }
  if (!found) return again ? null : outOf(s, from, to, avoid, touch);
  const cells = [];
  for (let k = t; k >= 0; k = parent[k]) cells.push(k);
  cells.reverse();
  // (Each with what it cost to get there, `c`, for pull's toll.)
  const at = (x, z, c) => Object.assign([x, z], { c });
  const mid = cells.map((k) => at(cx(k), cz(k), g[k]));
  // The doorways on the way, in order: each cuts the way in two, a place before its middle and a place beyond.
  const out = [];
  let leg = [at(from[0], from[1], 0)];
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
    before.c = mid[i].c; after.c = mid[i + 1].c;
    leg.push(before);
    for (const q of pull(leg)) out.push(point(q[0], q[1], q === before ? d.id : -1));
    out.push(point(after[0], after[1], d.id));
    leg = [after];
  }
  leg.push(mid[mid.length - 1], at(end[0], end[1], g[t]));
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
  // (Buried under the land, and the feet on the land: World.onLand. The catacombs' walls stood up through the hill.)
  if (c.under && world.onLand(x, z, y)) return false;
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
  // (By topOf, which knows a terrace's base is stood on, not walked into: its own sum here made every portal's terrace solid.)
  for (const c of world.sitesNear(x, z) || []) if (topOf(c) >= y && boxHit(c, x, z, r, y)) return true;
  // (Trunks stand on the land, not down in the catacombs under it. The hollows west of the town lie lower than -2 themselves.)
  if ((Math.abs(x) > 50 || Math.abs(z) > 50) && (y > -2 || y > terrainHeight(x, z) - 2)) {
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
// (Up a portal's steps as the feet go: each step's own height, so a terrace it can walk up isn't a wall to it. A rise of more
// than a step is one. Out in the land a dungeon's portal stands on a terrace, and it paced to and fro before the steps for ever.)
function clearFor(x, z, y, dx, dz, look) {
  for (let s = 0.4; s <= look; s += 0.4) {
    const px = x + dx * s, pz = z + dz * s, plat = world.platformAt ? world.platformAt(px, pz) : null;
    if (plat !== null) { if (plat + 0.2 - y > 0.6) return s - 0.4; y = plat + 0.2; }
    if (solidAt(px, pz, 0.45, y)) return s - 0.4;
  }
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
// own height there (so the catacombs' walls under it don't count: World marks them `under`).
// (On a portal's terrace, at the terrace's height, and no step between two cells of more than a stride's rise: up by its stairs.
// And over a terrace only to get onto it: to somewhere off it, round, at OVER the cost a metre on it. Auto-play, making for
// the foot of a portal's steps from beside its terrace, went up the steps at its end, over it, down the front, and turned
// round to go up them again.)
const lY = new Float32Array(280 * 280);
const LW = 280, LN = LW * LW, lSolid = new Uint8Array(LN), lG = new Float32Array(LN), lPar = new Int32Array(LN), lSeen = new Uint16Array(LN), lShut = new Uint16Array(LN);
const OVER = 5;
let lStamp = 1;
function local(from, to) {
  if (++lStamp > 65000) { lStamp = 1; lSeen.fill(0); lShut.fill(0); }
  lSolid.fill(0);
  const C = 0.5, cx0 = Math.min(from[0], to[0]) - 25, cz0 = Math.min(from[1], to[1]) - 25;
  if (Math.max(from[0], to[0]) + 25 - cx0 > LW * C || Math.max(from[1], to[1]) + 25 - cz0 > LW * C) return null;
  const cell = (x, z) => { const i = Math.floor((x - cx0) / C), j = Math.floor((z - cz0) / C); return i < 0 || j < 0 || i >= LW || j >= LW ? -1 : j * LW + i; };
  const px = (k) => ((k % LW) + 0.5) * C + cx0, pz = (k) => (((k / LW) | 0) + 0.5) * C + cz0;
  const solid = (k) => { let v = lSolid[k]; if (!v) { const x = px(k), z = pz(k), plat = world.platformAt ? world.platformAt(x, z) : null, y = lY[k] = plat ?? terrainHeight(x, z); v = lSolid[k] = solidAt(x, z, 0.42, y + 0.25) ? 2 : plat !== null ? 3 : 1; } return v === 2; };
  // (A step up or down too high to take, where either cell is on a terrace.)
  const cliff = (a, b) => (lSolid[a] === 3 || lSolid[b] === 3) && Math.abs(lY[a] - lY[b]) > 0.6;
  let s = cell(from[0], from[1]), t = cell(to[0], to[1]);
  if (s < 0 || t < 0) return null;
  // (Starting or ending against something: the nearest clear cell instead.)
  const clear = (k0) => { if (!solid(k0)) return k0; const i0 = k0 % LW, j0 = (k0 / LW) | 0; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = i0 + di, j = j0 + dj; if (i >= 0 && j >= 0 && i < LW && j < LW && !solid(j * LW + i)) return j * LW + i; } return -1; };
  s = clear(s); t = clear(t);
  if (s < 0 || t < 0) return null;
  const onto = lSolid[t] === 3;
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
      if (lShut[nk] === lStamp || solid(nk) || cliff(k, nk)) continue;
      if (di && dj && (solid(j * LW + ni) || solid(nj * LW + i))) continue;
      const ng = lG[k] + (di && dj ? 1.414 : 1) * C * (!onto && lSolid[nk] === 3 ? OVER : 1);
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
  // (Pulled straight, not over a terrace it went round: only from on one, getting off it.)
  const see = (a, b) => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25);
    let was = cell(a[0], a[1]);
    if (was >= 0) solid(was);
    const off = !onto && !(was >= 0 && lSolid[was] === 3);
    for (let q = 1; q <= n; q++) {
      const k = cell(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n);
      if (k < 0 || solid(k) || (was >= 0 && cliff(was, k)) || (off && lSolid[k] === 3)) return false;
      was = k;
    }
    return true;
  };
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

// Out of somewhere the grid has no way from: a nook a body fits with a finger's room (between Silas Crane's hearth and his
// partition), or a pocket a body got into all the same (behind the partition in the house at 10.75, 17.76: between the
// partition's end and the corner of a crate there's a gap a body takes on the slant, and the grid, whose boxes have square
// corners, calls it shut). By a finer grid of its own, a tenth of a metre, over wherever a body can be as the sim pushes it
// (World.inside with round corners, as World.resolve has them), to the nearest place the walking grid calls free that isn't
// a pocket itself: ground the rest of the grid is joined to. (It used to stop at the first free place, and from inside a
// pocket that was the pocket: it walked half a metre, stopped, asked again, and did that for as long as it was watched.)
// The points of the way, from where it stands, or null. Auto-play asks when it's been stopped twice in the same place, and
// a path from inside a pocket begins with it (outOf). keep: out of the circles that path is keeping clear of, too (a door
// it can't open yet: the walking grid takes every door as open).
const ESCAPE_R = 0.345;
const fitsLine = (ax, az, bx, bz) => { const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.1)); for (let q = 1; q <= n; q++) if (world.inside(ax + (bx - ax) * q / n, az + (bz - az) * q / n, ESCAPE_R, true)) return false; return true; };
function escape(x, z, keep = false) {
  const C = 0.1, N = 121, half = (N - 1) / 2;
  const kept = (k) => keep && avoidMark[k] === stamp;
  const at = (i, j) => [x + (i - half) * C, z + (j - half) * C];
  const seen = new Int32Array(N * N).fill(-2), q = [half * N + half];
  seen[q[0]] = -1;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % N, j = (k / N) | 0, [px, pz] = at(i, j), cell = cellOf(px, pz);
    if (h > 0 && cell >= 0 && !solidCell(cell) && !kept(cell) && Math.hypot(px - x, pz - z) > 0.5 && !inPocket(cell) && fitsLine(px, pz, cx(cell), cz(cell))) {
      const out = [[cx(cell), cz(cell)]];
      for (let c = k; c >= 0; c = seen[c]) out.push(at(c % N, (c / N) | 0));
      out.reverse();
      // (Every third point, and the last: near enough to follow, few enough to send.)
      return out.filter((_, n) => n % 3 === 0 || n >= out.length - 2);
    }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N || seen[nj * N + ni] !== -2) continue;
      const [qx, qz] = at(ni, nj);
      if (world.inside(qx, qz, ESCAPE_R, true) || kept(cellOf(qx, qz))) { seen[nj * N + ni] = -3; continue; }
      seen[nj * N + ni] = k; q.push(nj * N + ni);
    }
  }
  return null;
}
// A path from inside a pocket (cell s; or from somewhere solid with no free cell near): the way out on the finer grid, then
// on from where it comes out. Every point of the way out is walked, not run: it's snug. Null if there's no way out, or no
// way on from it. (Before, every path from in there was null, every errand was given up, and the escape went round inside it.)
function outOf(s, from, to, avoid, touch) {
  if (s >= 0 && !inPocket(s)) return null;
  const way = escape(from[0], from[1], true);
  if (!way) return null;
  const on = path(way.at(-1), to, avoid, touch, true);
  return on ? way.slice(1).map(([x, z]) => [x, z, 1, -1]).concat(on) : null;
}

// For tests (tests/nav-ground.test.mjs): the same questions asked of a World built there, with no thread.
export function navFor(w, interior = null) {
  world = w; boxIndex = null; ground.fill(0); room.fill(0); pocket.clear();
  setDoorways(interior?.things);
  // (pocket: is (x, z) on a free cell of the walking grid that's shut in a pocket?)
  const pocketAt = (x, z) => { const k = cellOf(x, z); return k >= 0 && !solidCell(k) && inPocket(k); };
  // (politePath: path as auto-play asks for it going about its errands, keeping to the town's ways.)
  const politePath = (...a) => { polite = true; try { return path(...a); } finally { polite = false; } };
  return { solidAt, clearFor, probe, local, path, politePath, straight, escape, pocket: pocketAt, doorways: () => DOORWAYS, SNUG, wornAt };
}

// (A worker's own scope: not there when a test imports this file.)
if (typeof self !== 'undefined') self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'boot') {
      setOpeningTerrain(m.opening);
      const [village, interior] = await Promise.all(['village.json', 'interior/interior.json'].map((f) => fetch(`${m.base}assets/game/${f}`).then((r) => r.json())));
      world = new World(village, interior);
      base = m.base;
      // (Phobos's doors all open to it: it opens one on its way, src/ui/autobrain.js phDoor.)
      world.setPhobosDoors(new Set(world.phDoors.keys()));
      setDoorways(interior.things);
      self.postMessage({ type: 'ready', spawns: world.spawns.map((s) => [s.x, s.z]), bounds: [X0, Z0, X0 + W * CELL, Z0 + H * CELL] });
    } else if (!world) {
      self.postMessage({ type: m.type, id: m.id, result: null });
    } else if (m.type === 'path') {
      polite = !!m.polite;
      const result = path(m.from, m.to, m.avoid, m.touch ?? null);
      polite = false;
      self.postMessage({ type: 'path', id: m.id, result });
    } else if (m.type === 'escape') {
      self.postMessage({ type: 'escape', id: m.id, result: escape(m.x, m.z) });
    } else if (m.type === 'local') {
      self.postMessage({ type: 'local', id: m.id, result: local(m.from, m.to) });
    } else if (m.type === 'east') {
      const E = await eastNav();
      self.postMessage({ type: 'east', id: m.id, result: E ? E.route(m.from, m.to, m.r ?? 1) : null, none: !E });
    } else if (m.type === 'ring') {
      // (How clear it is each of 16 ways round (x, z), from straight ahead +z round by +x: auto-play's backing off in a fight
      // picks among them, not into a wall. src/ui/autobrain.js escape.)
      const out = new Array(16);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; out[k] = clearFor(m.x, m.z, m.y ?? 0, Math.sin(a), Math.cos(a), m.look || 6); }
      self.postMessage({ type: 'ring', id: m.id, result: out });
    } else if (m.type === 'probe') {
      self.postMessage({ type: 'probe', id: m.id, result: probe(m.x, m.z, m.y ?? 0, m.hx, m.hz, m.look || 5) });
    } else if (m.type === 'sight') {
      // (The Test Dungeon's door, as the page last saw it: shut, nothing's shot through it.)
      setHallDoor(!!m.hallOpen);
      // (And the world's doors as they stand, for this look only: a shut one stops a bolt, and a word. For walking they're
      // all open here, since a door on its way it opens.)
      if (m.doors !== undefined) world.setDoors(m.doors);
      const result = sight(world, m.from, m.marks, 1.62, m.fat);
      world.setDoors(-1);
      self.postMessage({ type: 'sight', id: m.id, result });
    }
  } catch (err) {
    self.postMessage({ type: m.type, id: m.id, result: null, error: String(err?.message || err) });
  }
};
