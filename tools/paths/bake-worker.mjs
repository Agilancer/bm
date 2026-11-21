// One strip of the east's walking map (tools/paths/bake.mjs): every place a body can stand in each half-metre cell, one
// over another (the street, a house's upstairs, a bridge, a tower's floors), and which of the next cells' places a step
// each way takes it to. Worked out by the sim's own rules (src/sim/world.js): where the feet come down is
// max(heightFor, topUnder) from where they were, and a place is free if resolve doesn't push a body standing there.
import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import { World } from '../../src/sim/world.js';
import { BODY, CELL, DROP, LAYERS, RISE, X0, Z0, W } from './grid.mjs';
import { FLOOR_RISE } from '../../src/sim/east-nav.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
// (Every door open: auto-play opens one on its way, as you do. Which cells a shut one stands in, bake.mjs marks.)
world.setPhobosDoors(new Set(world.phDoors.keys()));

const { j0, j1 } = workerData, I0 = workerData.i0 ?? 0, I1 = workerData.i1 ?? W - 1, CW = I1 - I0 + 1;
const tmp = [0, 0, 0];
// (Settled: feet set down on a stair's tread may be lifted onto the deck it runs into the very next tick, as heightFor takes
// the highest floor within a step of the feet. So again from where they came down, till they stay.)
const ground = (x, z, y) => { let g = Math.max(world.heightFor(x, z, y), world.topUnder(x, z, y + 0.2)); for (let k = 0; k < 6; k++) { const h = Math.max(world.heightFor(x, z, g), world.topUnder(x, z, g + 0.2)); if (Math.abs(h - g) < 0.005) break; g = h; } return g; };
const free = (x, z, y) => { tmp[0] = x; tmp[2] = z; world.resolve(tmp, BODY, y + 0.2, true); return Math.abs(tmp[0] - x) + Math.abs(tmp[2] - z) < 0.004; };

// Every height a body could be stood at in (x, z): the land, each floor of each platform over it, each box's top.
function candidates(x, z) {
  const c = [world.landAt(x, z)];
  const list = world.platGrid.get((Math.floor(x / 64) + 4096) * 8192 + Math.floor(z / 64) + 4096);
  if (list) for (const p of list) {
    if (Math.abs(x - p.x) > p.r || Math.abs(z - p.z) > p.r) continue;
    for (const f of p.rects) {
      const dx = x - f.x, dz = z - f.z;
      if (Math.abs(dx * f.c - dz * f.s) <= f.hu && Math.abs(dx * f.s + dz * f.c) <= f.hw) c.push(f.y);
    }
  }
  const near = world.sitesNear(x, z);
  if (near) for (const b of near) {
    const dx = x - b.x, dz = z - b.z;
    if (Math.abs(dx * b.co - dz * b.s) <= b.hx && Math.abs(dx * b.s + dz * b.co) <= b.hz) c.push(world.boxTop(b));
  }
  return c;
}

// The places in one cell: the heights a body stays at once stood there (where the feet come down from just over each
// candidate is that candidate), lowest first, at most LAYERS.
function placesAt(i, j) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL, out = [];
  for (const y0 of candidates(x, z).sort((a, b) => a - b)) {
    if (!Number.isFinite(y0)) continue;
    const g = ground(x, z, y0 + 0.01);
    if (Math.abs(g - y0) > 0.03) continue;
    if (out.length && Math.abs(out.at(-1) - g) < 0.08) continue;
    out.push(g);
  }
  return out.slice(-LAYERS);
}

// The rows this strip owns, and one either side to step into.
const rows = new Map();
for (let j = Math.max(0, j0 - 1); j <= j1 + 1; j++) {
  const row = new Array(W), z = Z0 + (j + 0.5) * CELL;
  for (let i = Math.max(0, I0 - 1); i <= Math.min(W - 1, I1 + 1); i++) { const ys = placesAt(i, j), x = X0 + (i + 0.5) * CELL; row[i] = { ys, fit: ys.map((y) => free(x, z, y)) }; }
  rows.set(j, row);
  if (j >= j0 && (j - j0) % 40 === 0) parentPort.postMessage({ type: 'row', j });
}

// Out: per cell its count of places; per place its height, whether a body fits there, and for each of the four steps
// (+x, -x, +z, -z) the index of the place in that cell it comes down on, or -1.
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const n = (j1 - j0 + 1) * CW;
const count = new Uint8Array(n);
let total = 0;
for (let j = j0; j <= j1; j++) for (let i = I0; i <= I1; i++) total += (count[(j - j0) * CW + i - I0] = rows.get(j)[i].ys.length);
const ys = new Float32Array(total), fit = new Uint8Array(total), link = new Int8Array(total * 4).fill(-1);
let q = 0;
for (let j = j0; j <= j1; j++) {
  const row = rows.get(j);
  for (let i = I0; i <= I1; i++) {
    const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
    row[i].ys.forEach((y, k) => {
      ys[q] = y;
      const ok = row[i].fit[k];
      fit[q] = ok ? 1 : 0;
      if (ok) DIRS.forEach(([di, dj], d) => {
        const ni = i + di, nj = j + dj, nrow = rows.get(nj);
        if (ni < 0 || ni >= W || !nrow || !nrow[ni]) return;
        const there = nrow[ni].ys;
        if (!there.length) return;
        const nx = x + di * CELL, nz = z + dj * CELL, g = ground(nx, nz, y);
        if (g - y > (g <= world.landAt(nx, nz) + 0.05 ? RISE : FLOOR_RISE) || y - g > DROP) return;   // (src/sim/east-nav.js FLOOR_RISE)
        let best = -1, bd = 0.05;
        there.forEach((ty, k) => { const e = Math.abs(ty - g); if (e < bd) { bd = e; best = k; } });
        if (best >= 0 && nrow[ni].fit[best]) link[q * 4 + d] = best;
      });
      q++;
    });
  }
}
parentPort.postMessage({ type: 'done', j0, j1, count, ys, fit, link }, [count.buffer, ys.buffer, fit.buffer, link.buffer]);
