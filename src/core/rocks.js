// Stones and boulders, all over the land: where they lie, worked out the same on every thread, for the renderer to draw
// (src/gfx/rocks.js) and the sim to walk into (src/sim/world.js). Two grids: stones on a fine one, close round you, and
// boulders on a coarse one, out as far as you can see.
//
// Where: a scatter everywhere, thicker in outcrops. Lining every road and path, kerb stones and broken bits along its edges
// and a little gravel on it. In the woods, mossy boulders between the trunks. On the steeps and the far map's bare rock,
// slabs and scree. In open snow, crags and slabs jutting out of it. Never in the town, on a place, in water, or on a road.
import { oldChurchGround } from './town.js';
import { CAVE_PATH, PATHS, PLOTS, ROADS, fbm, hash2, nearest, openingTerrain, segDist2, sstep, terrainHeight } from './terrain.js';
import { forestAmount } from './forest.js';
import { inCaveBox } from './opening.js';
import { CLIFF, COUNTRY_KEYS, MOUNT, WATERS, countryWeights, groundCover, routeDist, siteAt } from './lands.js';
import { churchSite } from './church.js';
import { PORTAL } from './dungeon.js';
import { huntEdge } from './hunts.js';

export const STONE_CELL = 4, BOULDER_CELL = 12;
// (x, y, z, size, cos, sin, how tall for its size, tone) and which of the meshes: src/gfx/rocks.js ROCK_VARIANTS.
export const ROCK_FLOATS = 9;
// The meshes: eight round boulders, four slabs, four crags; then what else lies on the ground: fallen logs, stumps, reeds, a
// fern, a tuft of grass, and a puddle.
export const ROUND = [0, 1, 2, 3, 4, 5, 6, 7], SLAB = [8, 9, 10, 11], CRAG = [12, 13, 14, 15];
export const LOG = [16, 17], STUMP = [18, 19], REED = [20, 21, 22], FERN = 23, TUFT = 24, PUDDLE = 25;
export const ROCK_VARIANTS = 16, ALL_VARIANTS = 26;
// How far round you the renderer lays each.
export const STONE_REACH = 150, BOULDER_REACH = 640;

const TOWN = 72;

// How far outside the nearest road's edge (x, z) is (negative: on it), and that road's half-width.
const EDGE = { d: 0, w: 0 };
export function roadEdge(x, z) {
  let d = 1e9, w = 0;
  const r = Math.hypot(x, z);
  if (r < 300) {
    for (const p of PATHS) {
      if (p === CAVE_PATH && !openingTerrain) continue;
      for (let i = 0; i + 1 < p.pts.length; i++) {
        const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
        const e = Math.sqrt(segDist2(x, z, ax, az, bx, bz)) - p.w;
        if (e < d) { d = e; w = p.w; }
      }
    }
  }
  if (x < -10) {
    for (const road of ROADS) {
      if (x < road.x0 || x > road.x1 || z < road.z0 || z > road.z1) continue;
      const e = nearest(road, x, z).d - road.w;
      if (e < d) { d = e; w = road.w; }
    }
  }
  if (r > 250) {
    const rd = routeDist(x, z);
    if (rd.road && rd.d - rd.road.w < d) { d = rd.d - rd.road.w; w = rd.road.w; }
  }
  EDGE.d = d; EDGE.w = w;
  return EDGE;
}

// Nowhere a stone may lie: the town, the church's ground, the houses' plots, the cave, the places, the water, the cliff's face.
function barred(x, z) {
  if (Math.hypot(x, z) < TOWN) return true;
  // (And the town's east end, built since on the ground the church stood on: the manor, the bakehouse and the herbalist's. A boulder
  // lay against the herbalist's wall, and stones in the manor's forecourt.)
  if (oldChurchGround(x, z) < 6) return true;
  if (churchSite(x, z) < 10) return true;
  for (const p of PLOTS) if (Math.max(Math.abs(x - p[0]) - p[2], Math.abs(z - p[1]) - p[3]) < 5) return true;
  if (openingTerrain && inCaveBox(x, z, 9)) return true;
  if (siteAt(x, z, 6)) return true;
  // (The Warrens' portal, its platform and the steps down from it, on the hillside: src/core/sites.js portalWall.)
  if ((x - PORTAL.x) ** 2 + (z - PORTAL.z) ** 2 < 18 ** 2) return true;
  for (const wt of WATERS) if ((x - wt.x) ** 2 + (z - wt.z) ** 2 < (wt.r + 4) ** 2) return true;
  if (Math.abs(x - CLIFF.x) < 16 && z > CLIFF.z0 && z < CLIFF.z1) return true;
  return false;
}

// The lie of the land at (x, z): height, steepness (0 flat), and the far map's snow and bare rock.
function lie(x, z) {
  const h = terrainHeight(x, z), g = 2;
  const dx = (terrainHeight(x + g, z) - terrainHeight(x - g, z)) / (2 * g), dz = (terrainHeight(x, z + g) - terrainHeight(x, z - g)) / (2 * g);
  const slope = 1 - 1 / Math.hypot(dx, 1, dz);
  const [snow, rock] = groundCover(x, z, h, slope * 3);
  return { h, slope, snow, rock, dx, dz };
}

// How stony each country is, over the scatter everywhere gets (src/core/lands.js COUNTRIES).
const STONY = { darkwood: 0.12, downs: 0.35, fen: 0.1, rustwood: 0.25, ashen: 0.6, barrow: 0.45, rimeholt: 0.45, gallows: 0.3, deepwood: 0.3 };
const STONY_OF = COUNTRY_KEYS.map((k) => STONY[k] ?? 0.1);
const CW = new Float32Array(COUNTRY_KEYS.length);
function stony(x, z) {
  if (Math.hypot(x, z) < 1000) return 0.18;
  countryWeights(x, z, CW);
  let t = 0;
  for (let c = 0; c < CW.length; c++) t += CW[c] * STONY_OF[c];
  return t;
}

const pickOf = (list, u) => list[Math.min(list.length - 1, Math.floor(u * list.length))];

// One cell's stone or boulder, or nothing. big: the boulder grid.
function rockInCell(i, j, big, out) {
  const cell = big ? BOULDER_CELL : STONE_CELL, s0 = big ? 211 : 17;
  const pick = hash2(i * 5 + s0, j * 3 - s0);
  if (pick > 0.92) return;
  const x = (i + 0.1 + 0.8 * hash2(i + 3 * s0, j - 41)) * cell, z = (j + 0.1 + 0.8 * hash2(i - 59, j + 2 * s0)) * cell;
  if (barred(x, z)) return;
  const e = roadEdge(x, z);
  // Not on a road, but for the odd stone of its gravel; boulders stand back from one, and out of a hunting ground's open
  // middle, where they'd hide what you're fighting (src/core/hunts.js).
  if (big && (e.d < 2 || huntEdge(x, z) < 3)) return;
  const on = e.d < -0.35;
  if (on && e.d < -e.w * 0.55) return;
  const L = lie(x, z);
  const forest = forestAmount(x, z);
  // Outcrops: the land's stone comes up in patches.
  const clump = fbm(x * 0.017 + 5.3, z * 0.017 - 2.1, 2);
  const crop = 0.45 + 1.6 * sstep(0.42, 0.68, clump);
  const steep = sstep(0.12, 0.45, L.slope);
  const land = stony(x, z);
  let p;
  if (big) {
    p = (0.16 + land * 1.3 + 0.45 * forest + 0.9 * steep + 1.0 * L.rock + 0.9 * L.snow) * crop;
    p += e.d < 6 ? 0.08 : 0;
  } else {
    // A road's shoulder: stones all along it.
    const shoulder = on ? 0.2 : 1 - sstep(0.6, 3.4, e.d);
    // (And within an outcrop, in heaps round its boulders, with bare turf between.)
    const heap = 0.55 + 1.1 * sstep(0.38, 0.66, fbm(x * 0.07 - 1.7, z * 0.07 + 8.9, 2));
    p = (0.2 + land * 1.3 + 0.3 * forest + 0.5 * steep + 0.8 * L.rock + 0.4 * L.snow) * crop * heap + 1.2 * shoulder;
  }
  if (pick > Math.min(0.92, p)) return;
  // Stones lie in little heaps: up to six round the cell's point, more where there are more of them.
  if (!big) {
    const n = 1 + Math.floor(Math.min(5, p * 3.5) * hash2(i - 211, j + 307));
    for (let q = 0; q < n; q++) {
      const qa = hash2(i + q * 17, j - q * 31) * 6.2832, qr = q ? 0.35 + 1.1 * hash2(i - q * 7, j + q * 11) : 0;
      const sx = x + Math.cos(qa) * qr, sz = z + Math.sin(qa) * qr;
      const se = q ? roadEdge(sx, sz) : e;
      if (q && se.d < -se.w * 0.55) continue;
      const son = se.d < -0.35;
      stone(i * 7 + q * 3, j * 5 - q, sx, sz, q ? terrainHeight(sx, sz) : L.h, L.slope, son, out);
    }
    return;
  }
  // Boulders lie in groups: the big one, and up to four smaller ones round it, more where the land's stonier.
  const md = Math.hypot(x - MOUNT.x, z - MOUNT.z), flank = md < MOUNT.R ? sstep(0.15, 0.55, 1 - md / MOUNT.R) : 0;
  const n = 1 + Math.floor(Math.min(flank > 0.25 ? 6 : 4, p * 4) * hash2(i - 211, j + 307));
  let lead = 0;
  for (let q = 0; q < n; q++) {
    const qi = i * 7 + q * 13, qj = j * 3 - q * 5;
    let bx = x, bz = z, bh = L.h;
    if (q) {
      const qa = hash2(qi + 17, qj - 31) * 6.2832, qr = lead * (1.3 + 1.6 * hash2(qi - 7, qj + 11));
      bx = x + Math.cos(qa) * qr; bz = z + Math.sin(qa) * qr;
      if (barred(bx, bz) || roadEdge(bx, bz).d < 1.5) continue;
      bh = terrainHeight(bx, bz);
    }
    const u = hash2(qi - 7, qj + 13), v = hash2(qi + 29, qj - 3), a = hash2(qi + 101, qj + 7) * 6.2832;
    let variant;
    // In open snow and on bare rock: crags and slabs breaking out of it. On the steeps: slabs. In the woods and fields: round boulders.
    if ((L.snow > 0.4 || L.rock > 0.5 || land > 0.4) && u < 0.5) variant = pickOf(CRAG, v);
    else if (steep > 0.5 || u > 0.72) variant = pickOf(SLAB, v);
    else variant = pickOf(ROUND, v);
    let size = 0.75 + 1.9 * hash2(qi + 61, qj + 67) ** 1.5;
    // Now and then a great one, out where the land's wild.
    if (!q && hash2(i - 97, j - 89) > 0.78 && (L.rock > 0.3 || L.snow > 0.3 || steep > 0.4 || forest > 0.5 || land > 0.1)) size *= 1.9 + 1.2 * hash2(i + 13, j - 5);
    // On the Sorrowhorn's flanks, crags of the mountain itself standing out of the slope, with scree round their feet.
    if (!q && flank > 0.25 && steep > 0.25 && hash2(i + 71, j - 19) > 0.72) { variant = pickOf(CRAG, v); size = 3 + 4 * hash2(i - 3, j + 41); }
    if (q) size = Math.max(0.3, lead * (0.3 + 0.45 * hash2(qi + 61, qj + 67)));
    else lead = size;
    const tall = variant >= CRAG[0] ? (size > 2.9 ? 1.1 + 0.4 * hash2(qi + 3, qj + 77) : 0.8 + 0.45 * hash2(qi + 3, qj + 77)) : variant >= SLAB[0] ? 0.75 + 0.35 * hash2(qi + 3, qj + 77) : 0.75 + 0.3 * hash2(qi + 3, qj + 77);
    // Sunk into the ground, more on a slope, so the uphill side is buried and nothing floats; and never so high that the low side
    // of a big one stands clear of the ground, its earthy underside showing.
    const fr = size * 0.75, lo = Math.min(terrainHeight(bx + fr, bz), terrainHeight(bx - fr, bz), terrainHeight(bx, bz + fr), terrainHeight(bx, bz - fr));
    const y = Math.min(bh - size * tall * (0.2 + 0.3 * fenAt(bx, bz)) - size * Math.min(0.9, L.slope * 2.2), lo - size * tall * 0.1);
    out.push(bx, y, bz, size, Math.cos(a), Math.sin(a), tall, hash2(qi + 13, qj + 101), variant);
  }
}

// One small stone: on a road, a bit of its gravel; off it, anything up to a knee high.
function stone(i, j, x, z, h, slope, on, out) {
  const u = hash2(i - 7, j + 13), v = hash2(i + 29, j - 3), a = hash2(i + 101, j + 7) * 6.2832;
  const variant = u < 0.7 ? pickOf(ROUND, v) : pickOf(SLAB, v);
  const size = on ? 0.06 + 0.1 * hash2(i + 5, j + 9) : 0.14 + 0.55 * hash2(i + 5, j + 9) ** 1.7;
  const tall = variant >= SLAB[0] ? 0.7 + 0.4 * hash2(i + 3, j + 77) : 0.7 + 0.35 * hash2(i + 3, j + 77);
  const y = h - size * tall * (0.22 + 0.3 * fenAt(x, z)) - size * Math.min(0.9, slope * 2.2);
  out.push(x, y, z, size, Math.cos(a), Math.sin(a), tall, hash2(i + 13, j + 101), variant);
}

const FEN = COUNTRY_KEYS.indexOf('fen'), ASHEN = COUNTRY_KEYS.indexOf('ashen');
// How much (x, z) is the fen's: its stones lie half sunk in the mud.
function fenAt(x, z) {
  if (Math.hypot(x, z) < 1500) return 0;
  countryWeights(x, z, CW);
  return CW[FEN];
}

// A road's own bits: its gravel, the kerb stones along both edges, and tufts of grass where the verge meets it. Tried at points
// all over the cell, and each kept only where it belongs.
function roadBits(i, j, plants, out) {
  for (let q = 0; q < 12; q++) {
    const x = (i + hash2(i * 13 + q * 7, j - q * 3)) * STONE_CELL, z = (j + hash2(i - q * 11, j * 17 + q * 5)) * STONE_CELL;
    const e = roadEdge(x, z);
    const u = hash2(i + q * 29, j - q * 37), v = hash2(i - q * 41, j + q * 43), a = hash2(i + q * 3, j + q * 53) * 6.2832;
    if (e.d < -0.3 && e.d > -e.w * 0.9) {
      if (u > 0.7) continue;
      const variant = v < 0.75 ? pickOf(ROUND, v / 0.75) : pickOf(SLAB, (v - 0.75) / 0.25), size = 0.07 + 0.13 * hash2(i + q, j - q) ** 1.6;
      out.push(x, terrainHeight(x, z) - size * 0.15, z, size, Math.cos(a), Math.sin(a), 0.55 + 0.3 * u, 0.6 + 0.39 * v, variant);
    } else if (e.d >= -0.3 && e.d < 1.4) {
      if (u < 0.5) {
        const variant = v < 0.6 ? pickOf(ROUND, v / 0.6) : pickOf(SLAB, (v - 0.6) / 0.4), size = 0.15 + 0.38 * hash2(i - q, j + q) ** 1.4;
        out.push(x, terrainHeight(x, z) - size * 0.2, z, size, Math.cos(a), Math.sin(a), 0.65 + 0.35 * u, v, variant);
      } else if (u < 0.85 && plants) {
        out.push(x, terrainHeight(x, z) - 0.02, z, 0.45 + 0.4 * v, Math.cos(a), Math.sin(a), 0.8 + 0.5 * u, v, TUFT);
      }
    }
  }
}

// Whatever else lies in a stone cell: the fen's puddles and reeds, the woods' fallen logs, stumps and ferns, the meadow's tufts.
function debrisInCell(i, j, out) {
  const x = (i + 0.1 + 0.8 * hash2(i + 401, j - 77)) * STONE_CELL, z = (j + 0.1 + 0.8 * hash2(i - 83, j + 419)) * STONE_CELL;
  if (barred(x, z)) return;
  const e = roadEdge(x, z);
  const L = lie(x, z);
  const cold = L.snow > 0.35 || L.rock > 0.6;
  let fen = 0, ash = 0;
  if (Math.hypot(x, z) > 1500) { countryWeights(x, z, CW); fen = CW[FEN]; ash = CW[ASHEN]; }
  const plants = !cold && ash < 0.5;
  if (e.d < 4) roadBits(i, j, plants, out);
  if (e.d < 1.2 || cold) return;
  const forest = forestAmount(x, z);
  const u = hash2(i * 3 + 71, j * 7 - 13), v = hash2(i - 29, j * 5 + 3), a = hash2(i + 7, j - 61) * 6.2832;
  const h = L.h;
  const put = (variant, px, pz, py, size, tall, tone) => out.push(px, py, pz, size, Math.cos(a), Math.sin(a), tall, tone, variant);
  // A few round the cell's point.
  const some = (n, spread, f) => {
    for (let q = 0; q < n; q++) {
      const qa = hash2(i + q * 19, j - q * 23) * 6.2832, qr = q ? spread * (0.4 + 0.6 * hash2(i - q * 13, j + q * 29)) : 0;
      f(x + Math.cos(qa) * qr, z + Math.sin(qa) * qr, q);
    }
  };
  if (fen > 0.35) {
    // Standing water in the flats, reeds round it and everywhere wet, and the odd drowned stump or trunk.
    const reed = (px, pz, q, s) => put(REED[Math.floor(hash2(i + q * 5, j - q * 3) * 3)], px, pz, terrainHeight(px, pz) - 0.05, s * (0.75 + 0.5 * hash2(i + q, j)), 0.6 + 0.85 * hash2(i, j + q), hash2(i - q, j - q));
    if (L.slope < 0.03 && u < 0.16 * fen) {
      // A pool, and reeds standing round its edge, where reeds grow.
      const size = 1.4 + 2.4 * v;
      put(PUDDLE, x, z, h + 0.01, size, 1, v);
      const n = 3 + Math.floor(5 * hash2(i - 5, j + 9));
      for (let q = 0; q < n; q++) {
        const qa = (q + hash2(i + q, j - q) * 0.7) / n * 6.2832, qr = size * (1.0 + 0.3 * hash2(i - q * 3, j + q * 7));
        reed(x + Math.cos(qa) * qr, z + Math.sin(qa) * qr, q + 11, 1);
      }
      return;
    }
    // Elsewhere in beds, thick in some stretches and none in others.
    const bed = sstep(0.38, 0.62, fbm(x * 0.045 + 3.1, z * 0.045 - 1.3, 2));
    if (u < 0.62 * fen * (0.25 + 1.3 * bed)) {
      some(1 + Math.floor((2 + 3 * bed) * v), 1.6, (px, pz, q) => reed(px, pz, q, 1));
      return;
    }
    if (u > 0.965) { put(pickOf(STUMP, v), x, z, h - 0.12, 0.6 + 0.4 * v, 0.7 + 0.5 * u, v); return; }
    if (u > 0.94) { put(pickOf(LOG, v), x, z, h - 0.1, 0.7 + 0.5 * v, 1, v); return; }
  }
  // About a hunting ground (src/core/hunts.js), where the pines were thinned and the floor lies open: the stumps of what was
  // felled, and low cover over nearly all of it, rough grass in the glade and ferns with it under what's left standing.
  // Nothing of it stands over the knee.
  const glade = fen > 0.35 || !plants ? 1e9 : huntEdge(x, z);
  if (glade < 30) {
    const near = 1 - sstep(14, 30, glade);
    if (u < 0.08 * near) { put(pickOf(STUMP, v), x, z, h - 0.1 - L.slope * 0.4, 0.8 + 0.6 * v, 0.45 + 0.4 * hash2(i, j), v); return; }
    if (u < 0.9 * near) {
      const open = glade < 3;
      some(3 + Math.floor(4 * v), 1.7, (px, pz, q) => {
        if (q && roadEdge(px, pz).d < 0.4) return;
        if (!open && (q + i + j) % 2) put(FERN, px, pz, terrainHeight(px, pz) - 0.03, 0.7 + 0.6 * hash2(i + q, j - q), 0.8 + 0.4 * hash2(i - q, j), hash2(i + q, j + q));
        else put(TUFT, px, pz, terrainHeight(px, pz) - 0.02, 0.55 + 0.6 * hash2(i - q, j + q), 0.8 + 0.5 * hash2(i + q, j), hash2(i, j - q));
      });
      return;
    }
  }
  if (forest > 0.08 && ash < 0.5) {
    // The woods: fallen trunks, old stumps, ferns in the shade.
    if (u < 0.045 * forest) { put(pickOf(LOG, v), x, z, h - 0.08 - L.slope * 0.6, 0.8 + 0.7 * v, 1, v); return; }
    if (u < 0.11 * forest) { put(pickOf(STUMP, v), x, z, h - 0.1 - L.slope * 0.4, 0.8 + 0.6 * v, 0.7 + 0.6 * hash2(i, j), v); return; }
    if (u < Math.min(0.75, 0.9 * forest)) {
      some(1 + Math.floor(3 * v), 1.4, (px, pz, q) => put(FERN, px, pz, terrainHeight(px, pz) - 0.03, 0.7 + 0.6 * hash2(i + q, j - q), 0.8 + 0.4 * hash2(i - q, j), hash2(i + q, j + q)));
      return;
    }
  }
  // Rough tufts in the open grass.
  if (plants && u > 0.42) some(2 + Math.floor(5 * v), 1.5, (px, pz, q) => put(TUFT, px, pz, terrainHeight(px, pz) - 0.02, 0.55 + 0.6 * hash2(i - q, j + q), 0.8 + 0.5 * hash2(i + q, j), hash2(i, j - q)));
  // In the Ashen Waste, the black stumps of what burned.
  if (ash > 0.5 && u > 0.975) put(pickOf(STUMP, v), x, z, h - 0.1, 0.8 + 0.5 * v, 0.6 + 0.4 * u, 0.02 + 0.1 * v);
}


// The stones (or boulders) of cells [i0, i1) x [j0, j1), ROCK_FLOATS each: the same whichever square they're asked for in.
export function rocksInCells(i0, i1, j0, j1, big) {
  const out = [];
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) { rockInCell(i, j, big, out); if (!big) debrisInCell(i, j, out); }
  return new Float32Array(out);
}

// Stones within sreach and boulders within breach of (cx, cz).
export function rocksAround(cx, cz, sreach = STONE_REACH, breach = BOULDER_REACH) {
  const sc = STONE_CELL, bc = BOULDER_CELL;
  const stones = rocksInCells(Math.floor((cx - sreach) / sc), Math.ceil((cx + sreach) / sc), Math.floor((cz - sreach) / sc), Math.ceil((cz + sreach) / sc), false);
  const boulders = rocksInCells(Math.floor((cx - breach) / bc), Math.ceil((cx + breach) / bc), Math.floor((cz - breach) / bc), Math.ceil((cz + breach) / bc), true);
  return { stones, boulders };
}

// How wide a boulder is where you'd walk into it, or 0 for one you'd step over. (The mesh is about a unit round; see src/gfx/rocks.js.)
export const rockRadius = (size, tall, variant) => (variant >= ROCK_VARIANTS || size * tall < 0.55 ? 0 : size * (variant >= CRAG[0] ? 0.55 : variant >= SLAB[0] ? 0.9 : 0.78));
