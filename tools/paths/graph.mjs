// The east's walking map cut down to what auto-play carries (assets/game/nav/east.bin, read by src/sim/east-nav.js): the
// half-metre places of tools/build/paths/fine.bin gathered by TILE-metre square into the pieces a body walks about in
// without leaving the square (a street's width, a stair's turn, a bridge's span, a tower's floor), each piece one node at
// its middle, and from each the pieces next to it a step takes it to. Run after tools/paths/bake.mjs:
//
//   node tools/paths/graph.mjs
//
// east.bin (little-endian): header Uint32 [magic 'EAST', TW, TH, nodes, edges], then
//   per tile its count of nodes (Uint8, TW*TH),
//   per node x and z within its tile (Uint8 each, a 256th of TILE), y (Int16, twentieths of a metre), edges (Uint8),
//   per edge: the tile it's in (Uint8: 0-8, (di+1) + 3 (dj+1)), which node of that tile (Uint8), and its length (Uint8,
//   tenths of a metre).
import fs from 'node:fs';
import { CELL, W, H, X0, Z0 } from './grid.mjs';
import { cellsOf, loadFine, stepsOf } from './map.mjs';
import { TILE } from '../../src/sim/east-nav.js';

const F = loadFine(), cellOfPlace = cellsOf(F), K = Math.round(TILE / CELL);
const TW = Math.ceil(W / K), TH = Math.ceil(H / K);
const tileOf = (q) => { const k = cellOfPlace[q]; return Math.floor(((k / W) | 0) / K) * TW + Math.floor((k % W) / K); };
const px = (q) => X0 + ((cellOfPlace[q] % W) + 0.5) * CELL, pz = (q) => Z0 + (((cellOfPlace[q] / W) | 0) + 0.5) * CELL;

// Each place's steps, and whether each comes back (a step down a drop doesn't).
const steps = (q, fn) => stepsOf(F, q, cellOfPlace, fn);
const hasStep = (a, b) => { let y = false; steps(a, (p) => { if (p === b) y = true; }); return y; };

// The pieces: places of a tile joined by steps both ways within it.
const comp = new Int32Array(F.n).fill(-1);
const tileNodes = Array.from({ length: TW * TH }, () => []);
for (let q = 0; q < F.n; q++) {
  if (!F.fit[q] || comp[q] >= 0) continue;
  const t = tileOf(q), id = tileNodes[t].length, members = [q];
  comp[q] = id;
  for (let h = 0; h < members.length; h++) {
    steps(members[h], (p) => { if (comp[p] < 0 && F.fit[p] && tileOf(p) === t && hasStep(p, members[h])) { comp[p] = id; members.push(p); } });
  }
  // (Bits of a place a body can't move about in: a lone cell between a wall and a post. Kept only if a step leaves them.)
  let mx = 0, mz = 0, my = 0;
  for (const p of members) { mx += px(p); mz += pz(p); my += F.ys[p]; }
  mx /= members.length; mz /= members.length; my /= members.length;
  // (Its middle: the member nearest where they average, so it's somewhere a body stands.)
  let rep = members[0], rd = Infinity;
  for (const p of members) { const d = (px(p) - mx) ** 2 + (pz(p) - mz) ** 2 + ((F.ys[p] - my) * 0.5) ** 2; if (d < rd) { rd = d; rep = p; } }
  tileNodes[t].push({ rep, size: members.length, edges: new Map() });
}
// The steps between pieces, by the steps between their places.
let tooMany = 0;
for (let q = 0; q < F.n; q++) {
  if (!F.fit[q] || comp[q] < 0) continue;
  const t = tileOf(q), a = tileNodes[t][comp[q]];
  steps(q, (p) => {
    if (comp[p] < 0) return;
    const u = tileOf(p);
    if (u === t && comp[p] === comp[q]) return;
    const key = u * 256 + comp[p];
    if (!a.edges.has(key)) a.edges.set(key, { u, c: comp[p] });
  });
}
let nodes = 0, edges = 0, maxPer = 0;
for (const l of tileNodes) { nodes += l.length; maxPer = Math.max(maxPer, l.length); for (const nd of l) edges += nd.edges.size; }
if (maxPer > 255) throw new Error(`a tile has ${maxPer} pieces`);
const head = new Uint32Array([0x54534145, TW, TH, nodes, edges]);
const counts = new Uint8Array(TW * TH), nodeB = new Uint8Array(nodes * 5), edgeB = new Uint8Array(edges * 3);
let n = 0, e = 0;
for (let t = 0; t < TW * TH; t++) {
  const l = tileNodes[t];
  counts[t] = l.length;
  const ti = t % TW, tj = (t / TW) | 0;
  for (const nd of l) {
    const x = px(nd.rep), z = pz(nd.rep), y = F.ys[nd.rep];
    nodeB[n * 5] = Math.min(255, Math.round((x - X0 - ti * TILE) / TILE * 256));
    nodeB[n * 5 + 1] = Math.min(255, Math.round((z - Z0 - tj * TILE) / TILE * 256));
    new DataView(nodeB.buffer).setInt16(n * 5 + 2, Math.round(y * 20), true);
    if (nd.edges.size > 255) { tooMany++; }
    nodeB[n * 5 + 4] = Math.min(255, nd.edges.size);
    let k = 0;
    for (const { u, c } of nd.edges.values()) {
      if (k++ >= 255) break;
      const ui = u % TW, uj = (u / TW) | 0, o = tileNodes[u][c].rep;
      edgeB[e * 3] = (ui - ti + 1) + 3 * (uj - tj + 1);
      edgeB[e * 3 + 1] = c;
      edgeB[e * 3 + 2] = Math.min(255, Math.round(Math.hypot(px(o) - x, pz(o) - z, (F.ys[o] - y) * 0.5) * 10));
      e++;
    }
    n++;
  }
}
fs.mkdirSync(new URL('../../assets/game/nav/', import.meta.url), { recursive: true });
const out = fs.openSync(new URL('../../assets/game/nav/east.bin', import.meta.url), 'w');
for (const a of [head, counts, nodeB, edgeB.subarray(0, e * 3)]) fs.writeSync(out, new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
fs.closeSync(out);
console.log(`${TW}x${TH} tiles of ${TILE} m, ${nodes} pieces (at most ${maxPer} in a tile), ${e} steps between them${tooMany ? `, ${tooMany} with too many` : ''}`);
