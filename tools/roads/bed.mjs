// Lays every way's bed (src/core/roadbed.js): the height of its middle along it, eased into a grade a road could take, cut
// into the rises and banked over the dips, no deeper than its class allows; and where it must still climb harder than that,
// a flight of steps. Writes src/core/roadbed-data.js, the same every time it's run. Run it after tools/roads/lay.mjs, and
// whenever the land changes.
//   node tools/roads/bed.mjs [--quiet]
//
// How: the land under each way's middle every 2 m (as it lies, before any way's laid), smoothed along it over a window that
// grows with the way (a great road's long, a footpath's short), kept within its cut-and-fill of the land, and smoothed again
// a little. The ways are laid widest first; a later one that runs onto one laid already takes that one's height there, and
// eases to and from it, so where two meet they're one level. Then: wherever the grade's over its class's most for more than a
// few metres, steps.
import fs from 'node:fs';

globalThis.__bmNoBed = true;   // (the land as it lies, with no bed laid yet)
const { groundBase, terrainHeight } = await import('../../src/core/terrain.js');
const { PORTAL_BANKS, ROUTES, SITES } = await import('../../src/core/lands.js');
const { SEALS, buildSites } = await import('../../src/core/sites.js');
const { townDist } = await import('../../src/core/town.js');
const { cityIn } = await import('../../src/core/east.js');
const { routeSamples, BED_STEP, NO_BED } = await import('../../src/core/roadbed.js');

const quiet = process.argv.includes('--quiet');
const log = (...a) => { if (!quiet) console.log(...a); };
const T0 = performance.now();
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// By class: how far either side the grade's averaged (m), the deepest cut or fill (m), and the steepest grade before steps.
const CLASS = {
  great: { win: 45, dev: 5, stair: 0.36 },
  road: { win: 32, dev: 4, stair: 0.32 },
  lane: { win: 22, dev: 2, stair: 0.25 },
  path: { win: 14, dev: 1.4, stair: 0.25 },
};
const RANK = { great: 0, road: 1, lane: 2, path: 3 };
const SUB = 2;   // metres between the heights worked on (every other one is kept: BED_STEP)

// Where nothing's laid: the town's green, inside Phobos's wall, and wherever the land's shaped for something after the ways
// are laid (src/core/terrain.js: the hill's roads and its top, the church's terrace, the house plots, the Warrens' portal),
// which has the last word; and a place's own level ground (src/core/lands.js SITES pad) and round its seal, where what's built
// there was set on the land as it was levelled for it; and round a dungeon's way in, its terrace and the bank it's cut into
// (src/core/lands.js PORTAL_BANKS, part of the land as it lies, so it isn't seen as shaped after).
const PADDED = Object.values(SITES).filter((s) => s.pad);
const unlaid = (x, z) => townDist(x, z) < 12 || (x > 9300 && x < 10800 && cityIn(x, z) < 1.05) || Math.abs(terrainHeight(x, z) - groundBase(x, z)) > 0.01
  || PADDED.some((s) => Math.hypot(x - s.x, z - s.z) < s.pad + 4) || SEALS.some((s) => Math.hypot(x - s.x, z - s.z) < 9)
  || PORTAL_BANKS.some((b) => Math.hypot(x - b[0], z - b[1]) < 30);

// Ways laid so far, for the later ones to meet: their stretches in 32 m squares.
const CELL = 32, grid = new Map(), gk = (i, j) => (i + 4096) * 8192 + (j + 4096);
function addLaid(at, ys, w) {
  for (let i = 0; i + 1 < at.length; i++) {
    if (ys[i] === null || ys[i + 1] === null) continue;
    const [ax, az] = at[i], [bx, bz] = at[i + 1], m = w + 6;
    for (let ci = Math.floor((Math.min(ax, bx) - m) / CELL); ci <= Math.floor((Math.max(ax, bx) + m) / CELL); ci++)
      for (let cj = Math.floor((Math.min(az, bz) - m) / CELL); cj <= Math.floor((Math.max(az, bz) + m) / CELL); cj++) {
        const k = gk(ci, cj);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([ax, az, bx, bz, ys[i], ys[i + 1], w]);
      }
  }
}
// The height of a way laid already that a way w wide at (x, z) would run into (their beds overlap), or null.
function laidAt(x, z, w) {
  const l = grid.get(gk(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!l) return null;
  let best = Infinity, y = null;
  for (const [ax, az, bx, bz, ya, yb, ww] of l) {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < ww + w + 1.7 && d < best) { best = d; y = ya + (yb - ya) * t; }   // (their beds, shoulders and all, overlap)
  }
  return y;
}

// Smoothed along, a triangle half-width h samples wide; near either end the window shrinks to keep even about the point, so
// a way that ends on a climb ends on the land's own height, not cut under it.
function smooth(y, h) {
  if (h < 1) return y.slice();
  const n = y.length, out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.min(h, i, n - 1 - i);
    let a = 0, c = 0;
    for (let k = -r; k <= r; k++) { const wt = r + 1 - Math.abs(k); a += y[i + k] * wt; c += wt; }
    out[i] = a / c;
  }
  return out;
}

const order = ROUTES.map((r, n) => n).sort((a, b) => (RANK[ROUTES[a].cls] ?? 3) - (RANK[ROUTES[b].cls] ?? 3) || ROUTES[b].w - ROUTES[a].w || a - b);
const out = new Array(ROUTES.length);
let flightsM = 0, nFlights = 0, maxDev = 0, laidM = 0, nLand = 0;
// A landing every LAND_RISE (m) of a flight's climb, so long as the rest needn't climb harder than LAND_GRADE for it.
const LAND_RISE = 2.2, LAND_GRADE = 0.55;
for (const n of order) {
  const r = ROUTES[n], C = CLASS[r.cls] || CLASS.path;
  const at = routeSamples(r.pts, SUB);
  const g = Float64Array.from(at, (p) => groundBase(p[0], p[1]));
  const skip = at.map((p) => unlaid(p[0], p[1]));
  // Eased along, held within its cut and fill, and eased again a little.
  let p = smooth(g, Math.round(C.win / SUB));
  for (let i = 0; i < p.length; i++) p[i] = Math.max(g[i] - C.dev, Math.min(g[i] + C.dev, p[i]));
  p = smooth(p, 3);
  // Where it runs onto a way laid already: that one's height, and eased to and from it over up to 40 m (between two such, from
  // one to the other).
  const pin = at.map((q) => laidAt(q[0], q[1], r.w));
  const pins = [];
  for (let i = 0; i < at.length; i++) if (pin[i] !== null) pins.push(i);
  if (pins.length) {
    const d = pins.map((i) => pin[i] - p[i]);
    const q = Float64Array.from(p);
    let k = 0;
    for (let i = 0; i < at.length; i++) {
      while (k + 1 < pins.length && pins[k + 1] <= i) k++;
      const L = pins[k] <= i ? k : -1, R = pins[k] <= i ? k + 1 : k;
      const sL = L >= 0 ? at[i][2] - at[pins[L]][2] : Infinity, sR = R < pins.length ? at[pins[R]][2] - at[i][2] : Infinity;
      let off;
      if (sL === 0) off = d[L];
      else if (L >= 0 && R < pins.length && sL + sR < 80) off = d[L] + (d[R] - d[L]) * sL / (sL + sR);
      else off = (L >= 0 ? d[L] * (1 - sstep(0, 40, sL)) : 0) + (R < pins.length ? d[R] * (1 - sstep(0, 40, sR)) : 0);
      q[i] = p[i] + off;
    }
    p = q;
  }
  // Steps: wherever it climbs harder than its class allows for 6 m and more (two such within 8 m of each other are one flight),
  // each end out to a kept height.
  const fl = [];
  let s0 = null;
  for (let i = 0; i + 1 < at.length; i++) {
    const steep = !skip[i] && !skip[i + 1] && Math.abs(p[i + 1] - p[i]) / (at[i + 1][2] - at[i][2] || 1) > C.stair;
    if (steep && s0 === null) s0 = at[i][2];
    if (!steep && s0 !== null) { fl.push([s0, at[i][2]]); s0 = null; }
  }
  if (s0 !== null) fl.push([s0, at.at(-1)[2]]);
  const merged = [];
  for (const f of fl) { if (merged.length && f[0] - merged.at(-1)[1] < 8) merged.at(-1)[1] = f[1]; else merged.push(f); }
  const kept = routeSamples(r.pts, BED_STEP), total = kept.at(-1)[2];
  const flights = [];
  for (const [a, b] of merged) {
    if (b - a < 6) continue;
    const A = Math.max(0, Math.floor(a / BED_STEP) * BED_STEP), B = Math.min(total, Math.ceil(b / BED_STEP) * BED_STEP);
    flights.push(A, Math.abs(B - total) < 1e-6 ? total : B);
    flightsM += B - A; nFlights++;
  }
  // The kept heights: every BED_STEP, from the worked ones (2 m apart, so every other, and the last).
  const yAt = (s) => { const f = s / SUB, i = Math.min(p.length - 2, Math.floor(f)); const t = Math.max(0, Math.min(1, (s - at[i][2]) / (at[i + 1][2] - at[i][2] || 1))); return p[i] + (p[i + 1] - p[i]) * t; };
  const skAt = (s) => skip[Math.min(skip.length - 1, Math.round(s / SUB))];
  const yk = kept.map((q) => (at.length > 1 ? yAt(q[2]) : p[0]));
  // Landings: a flight that climbs more than LAND_RISE is broken by a level stretch (one BED_STEP) every LAND_RISE or so of
  // climb, its other stretches each a little steeper to make it up (not past LAND_GRADE: fewer landings, then). Each is put
  // where the climb so far crosses its share, so the flight's own shape is kept between them.
  for (let k = 0; k < flights.length; k += 2) {
    const a = Math.round(flights[k] / BED_STEP), b = Math.min(kept.length - 1, Math.round(flights[k + 1] / BED_STEP));
    const dy = [];
    for (let i = a; i < b; i++) dy.push(yk[i + 1] - yk[i]);
    const Y = dy.reduce((m, v) => m + Math.abs(v), 0), m = dy.length;
    // (Landings at least three stretches apart, and none where the rest would have to climb past LAND_GRADE anywhere.)
    let at_ = [];
    for (let n = Math.min(Math.floor(Y / LAND_RISE), Math.floor((m - 1) / 3)); n >= 1; n--) {
      const pick = [], step = Y / (n + 1);
      let acc = 0, want = step;
      for (let i = 0; i < m && pick.length < n; i++) { acc += Math.abs(dy[i]); if (acc >= want && i > 0 && i < m - 1 && (!pick.length || i - pick.at(-1) >= 3)) { pick.push(i); want += step; } }
      const took = pick.reduce((v, i) => v + Math.abs(dy[i]), 0), left = Y - took;
      if (!pick.length || left <= 0) continue;
      const most = dy.reduce((v, d, i) => (pick.includes(i) ? v : Math.max(v, Math.abs(d) * Y / left)), 0) / BED_STEP;
      if (most <= LAND_GRADE) { at_ = pick; break; }
    }
    if (!at_.length) continue;
    const gone = at_.reduce((v, i) => v + dy[i], 0), net = dy.reduce((v, d) => v + d, 0), rest = net - gone;
    // (The climb the landings took, shared out over the rest by how much each already climbs.)
    const absRest = dy.reduce((v, d, i) => v + (at_.includes(i) ? 0 : Math.abs(d)), 0) || 1;
    let y = yk[a];
    for (let i = 0; i < m; i++) { const d = at_.includes(i) ? 0 : dy[i] + gone * Math.abs(dy[i]) / absRest; y += d; yk[a + i + 1] = y; }
    void rest; nLand += at_.length;
  }
  const ys = new Int16Array(kept.length);
  const laid = [];
  for (let i = 0; i < kept.length; i++) {
    if (skAt(kept[i][2])) { ys[i] = NO_BED; laid.push(null); continue; }
    const y = yk[i];
    if (Math.abs(y) > 1020) throw new Error(`${r.name}: a height of ${y.toFixed(0)} m won't keep`);
    ys[i] = Math.round(y * 32); laid.push(ys[i] / 32);
    maxDev = Math.max(maxDev, Math.abs(y - groundBase(kept[i][0], kept[i][1])));
  }
  laidM += total;
  addLaid(kept, laid, r.w);
  out[n] = [Buffer.from(ys.buffer).toString('base64'), flights.map((v) => +v.toFixed(2))];
}

// Where people stand (the places' spots): a road's banks are let back to the land round each that's within reach of one, so
// nobody's stood on a slope. (src/core/roadbed.js KEEP.)
const KEEP = [];
{
  const near = new Set();
  for (const r of ROUTES) for (const [x, z] of routeSamples(r.pts, 8)) near.add(`${Math.floor(x / 32)}_${Math.floor(z / 32)}`);
  const spots = buildSites(false, false).spots;
  for (const [k, p] of Object.entries(spots)) {
    if (k.startsWith('seal_') || k.endsWith('_portal') || p[0] < -5600 || p[0] > 11700 || Math.abs(p[2]) > 5600) continue;
    let hit = false;
    for (let i = -1; i <= 1 && !hit; i++) for (let j = -1; j <= 1; j++) if (near.has(`${Math.floor(p[0] / 32) + i}_${Math.floor(p[2] / 32) + j}`)) { hit = true; break; }
    if (hit) KEEP.push([+p[0].toFixed(1), +p[2].toFixed(1)]);
  }
}

const body = out.map((e) => `  [${JSON.stringify(e[0])},${JSON.stringify(e[1])}]`).join(',\n');
fs.writeFileSync(new URL('../../src/core/roadbed-data.js', import.meta.url),
  `// Written by tools/roads/bed.mjs: don't edit by hand, run it again. (src/core/roadbed.js says what these are.)\nexport const BED_COUNT = ${ROUTES.length};\nexport const KEEP = ${JSON.stringify(KEEP)};\nexport const BED = [\n${body}\n];\n`);
log(`${KEEP.length} spots kept; ${ROUTES.length} ways, ${(laidM / 1000).toFixed(1)} km laid; ${nFlights} flights of steps, ${(flightsM / 1000).toFixed(2)} km, ${nLand} landings; deepest cut or fill ${maxDev.toFixed(1)} m; ${((performance.now() - T0) / 1000).toFixed(1)} s`);
