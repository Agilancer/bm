// What lines the roads and paths out in the land (src/core/roads.js allWays), so a way looks walked and kept: a signpost at
// each crossing, its arms down the ways that leave it; a squat milestone every half a kilometre or so of the bigger roads;
// lanterns on posts and lengths of fence coming in to a town, a hayrick or a trough in its fields; and out in the wilds, now
// and then, a boulder or two at the edge, a cart left by the road, a stack of cut wood, a cold fire with a log to sit on.
// Built by buildSites after the outposts are dressed (src/core/sites.js), out of the sites' own pieces.
//
// Nothing stands on a way, in water, on a steep bank, in a town or a place, at an outpost or a lair, or in anything built.
// What would stop a body (the posts, the fences, a cart, a big rock) is built the same on a phone as on a PC; the rest is for
// the eye, without colliders, and only on a PC (K.lean). No letter or mark on anything: a signpost's arms are plain boards,
// each at its own height, and never two on one level.
import { terrainHeight } from './terrain.js';
import { SITES, waterAt } from './lands.js';
import { townDist } from './town.js';
import { hash2 } from './terrain-noise.js';
import { allWays, roadGraph } from './roads.js';
import { BATTLES, FINDS, OUTPOSTS, TEAR_SPOTS } from './wilds-data.js';
import { LAIRS } from './tripo-monsters.js';
import { DELVES } from './dungeon.js';
import { CHURCH_FOOTPRINT, CHURCH_WING } from './church.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);
const TOWN_KEYS = ['hamlet', 'farm', 'thornwick', 'cinderford', 'frostwatch', 'sallow', 'abbey', 'khel', 'keep', 'crossroads', 'belltower'];

export function dressRoads(K) {
  if (globalThis.__bmNoWays) return;   // (tools/roads/lay.mjs lays the ways again from nothing: nothing yet to line)
  const ways = allWays(false);

  // ---- what's in the way of a thing set down
  // The ways' edges: every stretch, in 32 m squares.
  const RC = 32, rgrid = new Map(), rkey = (i, j) => i * 100003 + j;
  for (const w of ways) {
    const p = w.pts;
    for (let i = 0; i + 1 < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1], m = w.w + 8;
      for (let ci = Math.floor((Math.min(ax, bx) - m) / RC); ci <= Math.floor((Math.max(ax, bx) + m) / RC); ci++)
        for (let cj = Math.floor((Math.min(az, bz) - m) / RC); cj <= Math.floor((Math.max(az, bz) + m) / RC); cj++) {
          const k = rkey(ci, cj);
          if (!rgrid.has(k)) rgrid.set(k, []);
          rgrid.get(k).push(ax, az, bx, bz, w.w);
        }
    }
  }
  // How far outside the nearest way's edge (x, z) is (8 and more: nowhere near one).
  const edge = (x, z) => {
    const l = rgrid.get(rkey(Math.floor(x / RC), Math.floor(z / RC)));
    let e = 8;
    if (l) for (let i = 0; i < l.length; i += 5) {
      const ax = l[i], az = l[i + 1], dx = l[i + 2] - ax, dz = l[i + 3] - az, L2 = dx * dx + dz * dz;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
      e = Math.min(e, Math.hypot(x - ax - dx * t, z - az - dz * t) - l[i + 4]);
    }
    return e;
  };
  // Everything built so far, in 16 m squares.
  const BC = 16, bgrid = new Map();
  const addBox = (c) => {
    const r = Math.hypot(c.hx, c.hz);
    for (let i = Math.floor((c.x - r) / BC); i <= Math.floor((c.x + r) / BC); i++)
      for (let j = Math.floor((c.z - r) / BC); j <= Math.floor((c.z + r) / BC); j++) {
        const k = rkey(i, j);
        if (!bgrid.has(k)) bgrid.set(k, []);
        bgrid.get(k).push(c);
      }
  };
  for (const c of [...K.colliders, CHURCH_FOOTPRINT, CHURCH_WING]) if (Math.abs(c.x) < 6000 && Math.abs(c.z) < 6000) addBox(c);
  const built = (x, z, m) => {
    for (const c of bgrid.get(rkey(Math.floor(x / BC), Math.floor(z / BC))) || []) {
      const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw || 0), sn = Math.sin(c.yaw || 0);
      if (Math.abs(dx * cs - dz * sn) < c.hx + m && Math.abs(dx * sn + dz * cs) < c.hz + m) return true;
    }
    return false;
  };
  // The places, the outposts, the lairs and the rest that have their own dressing, and what's set down here already.
  const keepOff = [
    ...Object.values(SITES).map((s) => [s.x, s.z, s.r + 12]),
    ...OUTPOSTS.map((o) => [o.x, o.z, o.r + 16]),
    ...LAIRS.map((l) => [l.x, l.z, (l.r || 4) + 14]),
    ...BATTLES.map((b) => [(b.x + b.x2) / 2, (b.z + b.z2) / 2, 22]),
    ...TEAR_SPOTS.map(([x, z]) => [x, z, 14]),
    ...FINDS.map(([x, z]) => [x, z, 6]),
    ...DELVES.filter((d) => d.portal).map((d) => [d.portal.x, d.portal.z, 10]),
  ];
  const PC = 64, pgrid = new Map();
  for (const [x, z, r] of keepOff) {
    for (let i = Math.floor((x - r) / PC); i <= Math.floor((x + r) / PC); i++)
      for (let j = Math.floor((z - r) / PC); j <= Math.floor((z + r) / PC); j++) {
        const k = rkey(i, j);
        if (!pgrid.has(k)) pgrid.set(k, []);
        pgrid.get(k).push(x, z, r);
      }
  }
  const placed = [];   // [x, z, r] of what's set down here, in pgrid too
  const taken = (x, z, r) => {
    const l = pgrid.get(rkey(Math.floor(x / PC), Math.floor(z / PC)));
    if (l) for (let i = 0; i < l.length; i += 3) if (Math.hypot(x - l[i], z - l[i + 1]) < l[i + 2] + r) return true;
    return false;
  };
  const mark = (x, z, r) => { const k = rkey(Math.floor(x / PC), Math.floor(z / PC)); if (!pgrid.has(k)) pgrid.set(k, []); pgrid.get(k).push(x, z, r); placed.push([x, z, r]); };
  const steep = (x, z, r) => { const a = Y(x - r, z), b = Y(x + r, z), c = Y(x, z - r), d = Y(x, z + r); return Math.max(Math.abs(a - b), Math.abs(c - d)) / (2 * r) > 0.45; };
  // Somewhere a thing r across can stand: off every way by `off`, on firm level ground, clear of everything.
  const free = (x, z, r, off = 0.7) => Math.abs(x) < 5450 && Math.abs(z) < 5450 && townDist(x, z) > 30
    && edge(x, z) > r + off && waterAt(x, z) === null && !steep(x, z, Math.max(1, r)) && !taken(x, z, r) && !built(x, z, r + 0.4);
  // (Pieces for the eye only: no colliders, and not on a phone.)
  const soft = (fn) => { if (K.lean) return; const n = K.colliders.length; fn(); K.colliders.length = n; };
  // (Pieces that stop a body: on every machine alike, and what follows keeps clear of them.)
  const hard = (fn) => { const n = K.colliders.length; fn(); for (let i = n; i < K.colliders.length; i++) addBox(K.colliders[i]); };
  // The widest way within reach of (x, z): its half-width (a lane's is 1.7, a road's 2.4, a great road's more).
  const widest = (x, z, reach = 6) => {
    const l = rgrid.get(rkey(Math.floor(x / RC), Math.floor(z / RC)));
    let most = 0;
    if (l) for (let i = 0; i < l.length; i += 5) {
      const ax = l[i], az = l[i + 1], dx = l[i + 2] - ax, dz = l[i + 3] - az, L2 = dx * dx + dz * dz;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
      if (Math.hypot(x - ax - dx * t, z - az - dz * t) - l[i + 4] < reach) most = Math.max(most, l[i + 4]);
    }
    return most;
  };
  // What lights the way at night (the renderer's lights, src/gfx/renderer.js: the nearest few lit, each fading out before
  // the next takes its place): a lantern on a post, its cage hung out over the road on its arm; and a fire.
  const lamps = K.lamps || (K.lamps = []);
  const lantern = (x, z, face, h = 2.5) => {
    hard(() => K.lantern(x, z, h, face));
    lamps.push({ p: [x + Math.cos(face) * 0.45, Y(x, z) + h - 0.4, z - Math.sin(face) * 0.45], c: [1, 0.64, 0.3], r: 14, i: 5.5, flicker: 0.35, road: true });
  };
  // (Facing a way's middle from beside it, on side s of a way running (tx, tz).)
  const toward = (s, tx, tz) => Math.atan2(-s * tx, -s * tz);

  // How near a town: metres outside its edge.
  const TOWNS = TOWN_KEYS.map((k) => SITES[k]).filter(Boolean);
  const townNear = (x, z) => { let d = Math.max(0, townDist(x, z)); for (const s of TOWNS) d = Math.min(d, Math.max(0, Math.hypot(x - s.x, z - s.z) - s.r)); return d; };

  // ---- the crossings
  const { X, Z, start, N } = roadGraph();
  const posts = [];
  const cand = [];
  for (let a = 0; a < N; a++) if (start[a + 1] - start[a] >= 3) cand.push(a);
  for (const a of cand) {
    const x0 = X[a], z0 = Z[a];
    if (townDist(x0, z0) < 50 || posts.some(([px, pz]) => Math.hypot(px - x0, pz - z0) < 140)) continue;
    // The ways leaving it: round it at 24 m, which ways the ground is road.
    const dirs = [];
    let run = null;
    const S = 36, on = [];
    for (let i = 0; i < S; i++) { const t = i / S * TAU; on.push(edge(x0 + Math.sin(t) * 24, z0 + Math.cos(t) * 24) < 0); }
    const first = on.indexOf(false);
    if (first < 0) continue;
    for (let k = 1; k <= S; k++) {
      const i = (first + k) % S;
      if (on[i] && run === null) run = [i, i];
      else if (on[i]) run[1] = i;
      if (!on[i] && run !== null) { const m = (run[0] + ((run[1] - run[0] + S) % S) / 2) / S * TAU; dirs.push(m); run = null; }
    }
    if (dirs.length < 3) continue;
    // Stand it in the widest gap between them, just off the road.
    dirs.sort((p, q) => p - q);
    let gap = -1, mid = 0;
    for (let i = 0; i < dirs.length; i++) { const g = ((dirs[(i + 1) % dirs.length] - dirs[i]) + TAU) % TAU; if (g > gap) { gap = g; mid = dirs[i] + g / 2; } }
    let sx = 0, sz = 0, ok = false;
    for (let d = 3; d < 16; d += 0.5) { sx = x0 + Math.sin(mid) * d; sz = z0 + Math.cos(mid) * d; if (edge(sx, sz) > 0.9) { ok = free(sx, sz, 0.5, 0.9); break; } }
    if (!ok) continue;
    // Its arms toward the ways out, the three most apart, each a level lower than the last.
    const arms = dirs.length > 3 ? [dirs[0], dirs[Math.round(dirs.length / 3)], dirs[Math.round(dirs.length * 2 / 3)]] : dirs;
    hard(() => K.signpost(sx, sz, arms.map((t) => Math.atan2(Math.sin(t) * 24 + x0 - sx, Math.cos(t) * 24 + z0 - sz)), 2.6 + hash2(a, 7) * 0.4));
    mark(sx, sz, 1.5);
    posts.push([sx, sz]);
    // Where lanes and roads cross (not where two footpaths do), a lantern by the post, hung out over the crossing.
    if (widest(x0, z0, 8) >= 1.7) {
      const la = mid + (hash2(a, 3) < 0.5 ? 0.5 : -0.5);
      for (let d = 3; d < 14; d += 0.5) {
        const lx = x0 + Math.sin(la) * d, lz = z0 + Math.cos(la) * d;
        if (edge(lx, lz) > 0.8) { if (free(lx, lz, 0.2, 0.6) && Math.hypot(lx - sx, lz - sz) > 1.2) { lantern(lx, lz, Math.atan2(x0 - lx, z0 - lz) - Math.PI / 2); mark(lx, lz, 1); } break; }
      }
    }
  }

  // ---- along the ways
  ways.forEach((w, wi) => {
    const p = w.pts, big = w.cls === 'great' || w.cls === 'road', lane = w.cls === 'lane', path = !big && !lane;
    const SP = big ? 20 : lane ? 24 : 30;
    let along = 0, next = SP * hash2(wi, 3), mile = 140 + hash2(wi, 5) * 300, n = 0, lampSide = 1, miles = 0;
    for (let i = 0; i + 1 < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.01) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, yaw = Math.atan2(tx, tz);
      while (next < along + L) {
        const u = next - along, cx = ax + tx * u, cz = az + tz * u;
        next += SP; n++;
        if (townDist(cx, cz) < 40) continue;
        const h = hash2(wi * 131 + n, n * 7 - wi), h2 = hash2(n * 3 + 11, wi * 17 + 5), side = h2 < 0.5 ? -1 : 1;
        const S = (off, s = side, du = 0) => [cx + tz * s * (w.w + off) + tx * du, cz - tx * s * (w.w + off) + tz * du];
        const near = townNear(cx, cz);
        // A milestone on the bigger roads, every so far.
        if (!path && next - SP > mile) {
          const [x, z] = S(1.5 + h * 0.4);
          if (free(x, z, 0.4)) { hard(() => K.menhir(h < 0.5 ? 'stone' : 'rubble', x, z, 0.28, 1.25 + h * 0.3, yaw + (h - 0.5) * 0.3, (h2 - 0.5) * 0.08)); mark(x, z, 1); }
          // (And on the great roads and the roads, every other milestone has a lantern across from it: a long dark way
          // between towns has a light to walk to every kilometre or so.)
          if (big && miles++ % 2 === 0) { const [lx, lz] = S(1.1, -side); if (free(lx, lz, 0.2, 0.5)) { lantern(lx, lz, toward(-side, tx, tz)); mark(lx, lz, 1); } }
          mile += 420 + hash2(wi, n) * 160;
          continue;
        }
        if (near < 260) {
          // Coming in to a town: lanterns down the bigger ways, fences and the things of its fields along them.
          // (Close in, one every other stretch, side to side down the road; further out, every third; on a footpath only
          // the last of the way in, where it meets the town.)
          if ((!path && (near < 120 ? n % 2 === 0 : n % 3 === 0)) || (path && near < 60 && n % 2 === 0)) {
            lampSide = -lampSide;
            const [x, z] = S(1.1, lampSide);
            if (free(x, z, 0.2, 0.5)) { lantern(x, z, toward(lampSide, tx, tz)); mark(x, z, 1); }
            continue;
          }
          if (h < 0.15) {
            // A length of fence along the road, following it.
            const off = 2.2 + h2 * 1.2, pts = [];
            for (let k = -2; k <= 2; k++) { const [x, z] = S(off, side, k * 3.2); if (!free(x, z, 0.3, 1.4)) { pts.length = 0; break; } pts.push([x, z]); }
            if (pts.length) { hard(() => K.fence(pts, 1.1)); for (const [x, z] of pts) mark(x, z, 0.6); }
            continue;
          }
          if (h < 0.3) {
            const [x, z] = S(3.4 + h2 * 3);
            const k = Math.floor(hash2(n, wi * 3) * 5);
            if (k === 0 && free(x, z, 1.6)) { soft(() => K.hayrick(x, z, 1.2 + h * 1.2, 2 + h * 1.4)); mark(x, z, 2); }
            else if (k === 1 && free(x, z, 1.4)) { soft(() => K.trough(x, z, yaw, 1.2)); mark(x, z, 1.5); }
            else if (k === 2 && free(x, z, 1.6)) { soft(() => K.woodpile(x, z, yaw, 1.2, 0.9)); mark(x, z, 1.6); }
            else if (k === 3 && free(x, z, 1.4)) { soft(() => K.goods(x, z, 3, 1)); mark(x, z, 1.6); }
            else if (k === 4 && free(x, z, 1)) { soft(() => K.bench(x, z, yaw + (side > 0 ? Math.PI : 0), 0.9)); mark(x, z, 1.2); }
          }
          continue;
        }
        // Out in the wilds, now and then.
        const rockAt = big ? 0.07 : 0.05;
        if (h < rockAt) {
          // A boulder at the edge, a smaller one leaning on it.
          const r = 0.7 + h2 * 0.5, [x, z] = S(r + 1.2);
          if (free(x, z, r)) {
            const layer = h2 < 0.5 ? 'rubble' : 'stone';
            hard(() => K.rock(layer, x, z, r, r * 0.9));
            const [x2, z2] = S(r * 2 + 1.2, side, (h / rockAt - 0.5) * 3);
            if (free(x2, z2, 0.4)) soft(() => K.rock(layer, x2, z2, 0.35 + h2 * 0.15, 0.3, { collide: false }));
            mark(x, z, r + 1);
          }
          continue;
        }
        if (h < rockAt + (big ? 0.035 : 0.022)) {
          const [x, z] = S(3.4 + h2 * 1.5);
          const k = Math.floor(hash2(n * 5, wi + 9) * 6);
          if (k === 0 && free(x, z, 2.2)) { hard(() => K.cart(x, z, yaw + (h2 - 0.5) * 0.6, h2 < 0.35 ? { wreck: true } : h2 < 0.7 ? { load: 'cloth_oat' } : {})); mark(x, z, 3.2); }
          else if (k === 1 && free(x, z, 1.4)) { soft(() => K.goods(x, z, 3, 0.9)); mark(x, z, 1.6); }
          else if (k === 2 && free(x, z, 1.6)) { soft(() => K.woodpile(x, z, yaw, 1.1, 0.8)); mark(x, z, 1.6); }
          else if (k === 3 && free(x, z, 2.2)) {
            // A wayside stop: a fire, a log either side; on the bigger roads, now and then, still burning (and lighting the
            // road), as if whoever sat by it has only just gone on.
            const burning = !path && h2 < 0.45;
            if (burning && !K.lean) lamps.push({ p: [x, Y(x, z) + 0.7, z], c: [1, 0.5, 0.2], r: 12, i: 6, flicker: 0.9, road: true });
            soft(() => {
              K.campfire(x, z, burning);
              for (const sd of [-1, 1]) { const lx = x + tx * sd * 1.6, lz = z + tz * sd * 1.6; K.beam('bark', [lx - tz * 0.8, Y(lx, lz) + 0.18, lz + tx * 0.8], [lx + tz * 0.8, Y(lx, lz) + 0.18, lz - tx * 0.8], 0.17); }
            });
            mark(x, z, 2.6);
          }
          else if (k === 4 && free(x, z, 0.8)) { soft(() => { K.stump(x, z, 0.32, 0.45); K.stump(x + tx * 1.1, z + tz * 1.1, 0.26, 0.3); }); mark(x, z, 1.4); }
          else if (k === 5 && free(x, z, 1.3)) { hard(() => K.cairn(x, z, 0.75, 1, 'rubble')); mark(x, z, 1.6); }
        }
      }
      along += L;
    }
  });
  return { posts: posts.length, placed: placed.length };
}
