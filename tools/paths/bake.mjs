// The east's walking map, worked out on many threads (tools/paths/bake-worker.mjs) and kept whole in
// tools/build/paths/fine.bin for tools/paths/map.mjs and graph.mjs to read: every place a body stands in each half-metre
// cell over City State Phobos and Castle Velscour, and where a step each way takes it.
//
//   node tools/paths/bake.mjs [threads]                    the whole east (about ten minutes on 14 threads)
//   node tools/paths/bake.mjs [threads] x0 z0 x1 z1        only that box (metres), put into the fine.bin there is: for after
//                                                          a change to what's built there (keep the box round all of it)
//
// fine.bin: a header [W, H, places] (Uint32), then per cell where its places start (Uint32, W*H + 1), per place its height
// (Float32), whether a body fits (Uint8), and its four steps (+x, -x, +z, -z: Int8, the place's index in that cell, or -1).
import fs from 'node:fs';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { CELL, H, W, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';

const args = process.argv.slice(2).map(Number);
const threads = args[0] || Math.max(1, os.cpus().length - 2);
const FILE = new URL('../build/paths/fine.bin', import.meta.url);
// (A box: its cells and a ring of one more round it, so the steps into it from outside are worked out again too.)
const box = args.length >= 5 ? args.slice(1, 5) : null;
const I0 = box ? Math.max(0, Math.floor((box[0] - X0) / CELL) - 1) : 0, I1 = box ? Math.min(W - 1, Math.floor((box[2] - X0) / CELL) + 1) : W - 1;
const J0 = box ? Math.max(0, Math.floor((box[1] - Z0) / CELL) - 1) : 0, J1 = box ? Math.min(H - 1, Math.floor((box[3] - Z0) / CELL) + 1) : H - 1;
const CW = I1 - I0 + 1;
const per = Math.max(2, Math.ceil((J1 - J0 + 1) / (threads * 3)));
const jobs = [];
for (let j = J0; j <= J1; j += per) jobs.push([j, Math.min(J1, j + per - 1)]);
const parts = [];
const t0 = performance.now();
let done = 0;
await new Promise((resolve, reject) => {
  let next = 0, running = 0;
  const go = () => {
    if (next >= jobs.length) { if (!running) resolve(); return; }
    const [j0, j1] = jobs[next++];
    running++;
    const w = new Worker(new URL('./bake-worker.mjs', import.meta.url), { workerData: { j0, j1, i0: I0, i1: I1 } });
    w.on('message', (m) => {
      if (m.type !== 'done') return;
      parts.push(m); done++;
      console.log(`rows ${m.j0}-${m.j1} (${done}/${jobs.length}) ${((performance.now() - t0) / 1000).toFixed(0)} s`);
    });
    w.on('error', reject);
    w.on('exit', () => { running--; go(); });
  };
  for (let k = 0; k < Math.min(threads, jobs.length); k++) go();
});
parts.sort((a, b) => a.j0 - b.j0);
// Each part's places by row, from its own counts.
const rowAt = new Map();
for (const p of parts) {
  let pq = 0;
  for (let j = p.j0; j <= p.j1; j++) { rowAt.set(j, { p, q: pq }); for (let i = 0; i < CW; i++) pq += p.count[(j - p.j0) * CW + i]; }
}
const old = box ? loadFine(FILE) : null;
let total = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const mine = j >= J0 && j <= J1 && i >= I0 && i <= I1;
  if (mine) { const r = rowAt.get(j); total += r.p.count[(j - r.p.j0) * CW + i - I0]; } else if (old) total += old.start[j * W + i + 1] - old.start[j * W + i];
}
const start = new Uint32Array(W * H + 1), ys = new Float32Array(total), fit = new Uint8Array(total), link = new Int8Array(total * 4).fill(-1);
let q = 0;
for (let j = 0; j < H; j++) {
  const r = rowAt.get(j);
  let pq = r ? r.q : 0;
  for (let i = 0; i < W; i++) {
    const k = j * W + i;
    start[k] = q;
    if (r && i >= I0 && i <= I1) {
      const c = r.p.count[(j - r.p.j0) * CW + i - I0];
      for (let m = 0; m < c; m++, q++, pq++) { ys[q] = r.p.ys[pq]; fit[q] = r.p.fit[pq]; for (let d = 0; d < 4; d++) link[q * 4 + d] = r.p.link[pq * 4 + d]; }
    } else if (old) {
      for (let o = old.start[k]; o < old.start[k + 1]; o++, q++) { ys[q] = old.ys[o]; fit[q] = old.fit[o]; for (let d = 0; d < 4; d++) link[q * 4 + d] = old.link[o * 4 + d]; }
    }
  }
}
start[W * H] = q;
fs.mkdirSync(new URL('../build/paths/', import.meta.url), { recursive: true });
const head = new Uint32Array([W, H, total]);
const out = fs.openSync(FILE, 'w');
for (const a of [head, start, ys, fit, link]) fs.writeSync(out, new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
fs.closeSync(out);
console.log(`${total} places in ${W}x${H} cells${box ? `, ${CW}x${J1 - J0 + 1} of them baked again` : ''}, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
