// What the east's walking map (tools/build/paths/fine.bin, from tools/paths/bake.mjs) says: from outside the Drawbridge
// Gate, every place a body can walk to and walk back from; and what can't be: each delve's way in, the hubs, the gates,
// every tower's foot and top, every bridge, every deck and upstairs floor; and every place you can get into and not out of
// (a drop with no way back up), where auto-play would be stuck for good.
//
//   node tools/paths/map.mjs [out.json]
//
// Also writes tools/build/paths/reach.bin (per place: 1 got to and back, 2 got to only, 0 never) for tools/paths/draw.py.
import fs from 'node:fs';
import { against } from './baseline.mjs';
import { CELL, W, H, X0, Z0 } from './grid.mjs';
import { buildSites, floorRects } from '../../src/core/sites.js';
import { DELVES } from '../../src/core/dungeon.js';
import { PHOBOS } from '../../src/core/phobos-data.js';
import { targets } from './targets.mjs';
import { cityTowers, cityDoors } from '../../src/core/phobos-towers.js';

export function loadFine(file = new URL('../build/paths/fine.bin', import.meta.url)) {
  const buf = fs.readFileSync(file), u = new Uint32Array(buf.buffer, buf.byteOffset, 3);
  const [w, h, n] = u;
  let o = buf.byteOffset + 12;
  const start = new Uint32Array(buf.buffer.slice(o, o + (w * h + 1) * 4)); o += (w * h + 1) * 4;
  const ys = new Float32Array(buf.buffer.slice(o, o + n * 4)); o += n * 4;
  const fit = new Uint8Array(buf.buffer.slice(o, o + n)); o += n;
  const link = new Int8Array(buf.buffer.slice(o, o + n * 4));
  return { w, h, n, start, ys, fit, link };
}

// The graph's steps from place q: the four straight ones, and the four on the slant where both ways round the corner
// agree on where they come down (so no corner's cut).
export function stepsOf(F, q, cellOfPlace, fn) {
  const { start, link } = F, k = cellOfPlace[q], i = k % W, j = (k / W) | 0;
  // (Never off the map's edge: a step there named a cell past it.)
  const to = (d, p) => { const l = link[p * 4 + d]; if (l < 0) return -1; const ni = i + [1, -1, 0, 0][d], nj = j + [0, 0, 1, -1][d]; if (ni < 0 || nj < 0 || ni >= W || nj >= H) return -1; return start[nj * W + ni] + l; };
  const s = [to(0, q), to(1, q), to(2, q), to(3, q)];
  for (let d = 0; d < 4; d++) if (s[d] >= 0) fn(s[d], 1);
  for (const [a, b] of [[0, 2], [0, 3], [1, 2], [1, 3]]) {
    if (s[a] < 0 || s[b] < 0) continue;
    const viaA = linkFrom(F, s[a], cellOfPlace, b), viaB = linkFrom(F, s[b], cellOfPlace, a);
    if (viaA >= 0 && viaA === viaB) fn(viaA, Math.SQRT2);
  }
}
function linkFrom(F, p, cellOfPlace, d) {
  const l = F.link[p * 4 + d];
  if (l < 0) return -1;
  const k = cellOfPlace[p], ni = (k % W) + [1, -1, 0, 0][d], nj = ((k / W) | 0) + [0, 0, 1, -1][d];
  if (ni < 0 || nj < 0 || ni >= W || nj >= H) return -1;
  return F.start[nj * W + ni] + l;
}
export function cellsOf(F) {
  const c = new Uint32Array(F.n);
  for (let k = 0; k < F.w * F.h; k++) for (let q = F.start[k]; q < F.start[k + 1]; q++) c[q] = k;
  return c;
}
// The place in the cell at (x, z) nearest height y (or the lowest, with y null).
export function placeAt(F, x, z, y = null) {
  const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
  if (i < 0 || j < 0 || i >= W || j >= H) return -1;
  const k = j * W + i;
  let best = -1, bd = Infinity;
  for (let q = F.start[k]; q < F.start[k + 1]; q++) { const d = y === null ? F.ys[q] : Math.abs(F.ys[q] - y); if (d < bd) { bd = d; best = q; } }
  return best;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('map.mjs')) {
  const F = loadFine(), cellOfPlace = cellsOf(F);
  const px = (q) => X0 + ((cellOfPlace[q] % W) + 0.5) * CELL, pz = (q) => Z0 + (((cellOfPlace[q] / W) | 0) + 0.5) * CELL;
  // Back links, for the way back.
  const fwd = (q, fn) => stepsOf(F, q, cellOfPlace, fn);
  const flood = (seeds, next) => {
    const seen = new Uint8Array(F.n), queue = new Int32Array(F.n);
    let a = 0, b = 0;
    for (const s of seeds) if (s >= 0 && F.fit[s]) { seen[s] = 1; queue[b++] = s; }
    while (a < b) { const q = queue[a++]; next(q, (p) => { if (!seen[p] && F.fit[p]) { seen[p] = 1; queue[b++] = p; } }); }
    return seen;
  };
  const seed = placeAt(F, 9240, 0);
  const there = flood([seed], fwd);
  // (The way back: a reversed graph, built once.)
  const revStart = new Uint32Array(F.n + 1), cnt = new Uint32Array(F.n);
  for (let q = 0; q < F.n; q++) if (F.fit[q]) fwd(q, (p) => { cnt[p]++; });
  for (let q = 0; q < F.n; q++) revStart[q + 1] = revStart[q] + cnt[q];
  const rev = new Int32Array(revStart[F.n]), fill = revStart.slice(0, F.n);
  for (let q = 0; q < F.n; q++) if (F.fit[q]) fwd(q, (p) => { rev[fill[p]++] = q; });
  const back = flood([seed], (q, fn) => { for (let r = revStart[q]; r < revStart[q + 1]; r++) fn(rev[r]); });
  const reach = new Uint8Array(F.n);
  let both = 0, only = 0;
  for (let q = 0; q < F.n; q++) { if (there[q] && back[q]) { reach[q] = 1; both++; } else if (there[q]) { reach[q] = 2; only++; } }
  fs.writeFileSync(new URL('../build/paths/reach.bin', import.meta.url), reach);
  const fitN = F.fit.reduce((s, v) => s + v, 0);
  console.log(`${F.n} places, ${fitN} a body fits, ${both} walked to and back from the gate, ${only} got into and not out of`);

  // Is (x, z) at about height y got to? The nearest place got to and back within r (2D), and how far.
  const near = (x, z, y = null, r = 6, dy = 2.5) => {
    let best = null, bd = Infinity;
    const i0 = Math.floor((x - r - X0) / CELL), i1 = Math.floor((x + r - X0) / CELL), j0 = Math.floor((z - r - Z0) / CELL), j1 = Math.floor((z + r - Z0) / CELL);
    for (let j = Math.max(0, j0); j <= Math.min(H - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(W - 1, i1); i++) {
      const k = j * W + i;
      for (let q = F.start[k]; q < F.start[k + 1]; q++) {
        if (reach[q] !== 1 || (y !== null && Math.abs(F.ys[q] - y) > dy)) continue;
        const d = Math.hypot(px(q) - x, pz(q) - z);
        if (d < bd) { bd = d; best = q; }
      }
    }
    return best === null ? null : { d: bd, y: F.ys[best] };
  };
  const report = { places: F.n, fits: fitN, both, only, missing: [], traps: [] };
  const want = (kind, name, x, z, y = null, r = 6, dy = 2.5) => {
    const n = near(x, z, y, r, dy);
    if (!n) report.missing.push({ kind, name, x: +x.toFixed(1), z: +z.toFixed(1), y: y === null ? null : +y.toFixed(1) });
    return n;
  };
  // (Auto-play's own list: tools/paths/targets.mjs, which trips.mjs walks to.)
  for (const t of targets()) want(t.kind, t.name, t.x, t.z, t.y, Math.max(t.r, 2), t.dy);
  // Every deck and upstairs floor: is any of it got to at its own height?
  const S = buildSites();
  let decks = 0, decksMissed = 0;
  for (const p of S.floors) {
    if (p.x < X0 || p.x > X0 + W * CELL || p.z < Z0 || p.z > Z0 + H * CELL) continue;
    for (const f of floorRects(p)) {
      if (f.hu < 0.6 || f.hw < 0.6) continue;
      decks++;
      // (Its cells: a few across it, at its own height.)
      let ok = false;
      for (let u = -f.hu + 0.25; u <= f.hu - 0.25 && !ok; u += 0.5) for (let v = -f.hw + 0.25; v <= f.hw - 0.25 && !ok; v += 0.5) {
        const x = f.x + u * f.c + v * f.s, z = f.z - u * f.s + v * f.c, q = placeAt(F, x, z, f.y);
        if (q >= 0 && reach[q] === 1 && Math.abs(F.ys[q] - f.y) < 0.1) ok = true;
      }
      if (!ok) { decksMissed++; if (report.missing.filter((m) => m.kind === 'deck').length < 400) report.missing.push({ kind: 'deck', name: p.over ? 'deck' : p.stack ? 'floor' : 'terrace', x: +f.x.toFixed(1), z: +f.z.toFixed(1), y: +f.y.toFixed(1), size: [+(2 * f.hu).toFixed(1), +(2 * f.hw).toFixed(1)] }); }
    }
  }
  report.decks = decks; report.decksMissed = decksMissed;
  // Traps, by the 8 m square: got into, no way out.
  const trapSq = new Map();
  for (let q = 0; q < F.n; q++) if (reach[q] === 2) { const k = `${Math.floor(px(q) / 8)}_${Math.floor(pz(q) / 8)}`; const t = trapSq.get(k) || trapSq.set(k, { x: px(q), z: pz(q), y: F.ys[q], n: 0 }).get(k); t.n++; }
  report.traps = [...trapSq.values()].sort((a, b) => b.n - a.n).map((t) => ({ x: +t.x.toFixed(1), z: +t.z.toFixed(1), y: +t.y.toFixed(1), n: t.n }));
  // Edges with nothing to stop you: a place got to whose next cell has nothing within a step of it and a floor more than four
  // metres down (a deck's edge, a bridge's side, a stair's open side), by the 8 m square.
  const edgeSq = new Map();
  for (let q = 0; q < F.n; q++) {
    if (reach[q] !== 1) continue;
    const k = cellOfPlace[q], i = k % W, j = (k / W) | 0, y = F.ys[q];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = (j + dj) * W + i + di;
      if (i + di < 0 || i + di >= W || j + dj < 0 || j + dj >= H) continue;
      let near = false, below = false;
      for (let p = F.start[nk]; p < F.start[nk + 1]; p++) { if (Math.abs(F.ys[p] - y) < 1.2) near = true; if (F.fit[p] && F.ys[p] < y - 4) below = true; }
      if (near || !below) continue;
      const key = `${Math.floor(px(q) / 8)}_${Math.floor(pz(q) / 8)}`;
      const e = edgeSq.get(key) || edgeSq.set(key, { x: +px(q).toFixed(1), z: +pz(q).toFixed(1), y: +y.toFixed(1), n: 0 }).get(key);
      e.n++;
    }
  }
  report.edges = [...edgeSq.values()].sort((a, b) => b.n - a.n);
  console.log(`unguarded edges in ${report.edges.length} 8 m squares, ${report.edges.reduce((s, e) => s + e.n, 0)} cell sides`);
  report.doors = cityDoors().length;
  const byKind = {};
  for (const m of report.missing) byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  console.log('not got to:', byKind, `decks ${decksMissed} of ${decks}`, `trap squares ${report.traps.length}`);
  for (const m of report.missing.filter((m) => m.kind !== 'deck')) console.log(' ', m.kind, m.name, m.x, m.z, m.y ?? '');
  fs.writeFileSync(process.argv[2]?.startsWith('--') ? new URL('../build/paths/report.json', import.meta.url) : process.argv[2] || new URL('../build/paths/report.json', import.meta.url), JSON.stringify(report, null, 1));
  if (!against('map', { trapped: only, decksMissed, trapSquares: report.traps.length, missing: report.missing.filter((m) => m.kind !== 'deck').length })) process.exitCode = 1;
}
