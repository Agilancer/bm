// Lays the living land out (src/core/wilds.js): where the outposts stand and the trails to them, where tears can open,
// the standing battles, and the small things to find. Writes src/core/wilds-data.js, the same every time it's run.
//   node tools/wilds/place.mjs
// Everything keeps off the roads, the places, the water, the cliff, the steep ground and the town's own woods; no spot
// has more bodies within 235 m than the twelve slots can stand up (tests/quests-beyond.test.mjs); Velscour's forts and
// towers stand only in the Ashen Waste, half a kilometre from any seal and 1.5 km from Tessariel's places.
import fs from 'node:fs';
import { terrainHeight } from '../../src/core/terrain.js';
import { SITES, ROUTES, WATERS, CLIFF, MOUNT, countryAt } from '../../src/core/lands.js';
import { LAIRS } from '../../src/core/tripo-monsters.js';
import { TUMBLER_CAMPS } from '../../src/sim/tumblers.js';
import { CAMPS } from '../../src/sim/slimes.js';
import { COUNTRY_FACTIONS, COUNTRY_TEARS, FACTIONS, atWar, outpostLair } from '../../src/core/wilds.js';

let seed = 0x5eed1e55;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const EDGE = 5300;
const ROADS = ROUTES.filter((r) => !r.trail);
const SEALS = Object.values(SITES).filter((s) => s.portal || s.light), LIGHTS = Object.values(SITES).filter((s) => s.light);
const OLD = LAIRS.filter((l) => !l.wild).map((l) => ({ x: l.x, z: l.z, r: l.r, count: (l.boss ? 1 : 0) + l.n }));
const placed = [...OLD];        // everything that stands bodies up
const keepOff = [];             // what a trail goes round: the battles and the tears
const trails = [];
const taken = [];               // everything at all: [x, z, r]
const slope = (x, z, r) => { let lo = 1e9, hi = -1e9; for (let a = 0; a < 8; a++) for (const q of [r * 0.5, r]) { const h = terrainHeight(x + Math.sin(a * 0.785) * q, z + Math.cos(a * 0.785) * q); lo = Math.min(lo, h); hi = Math.max(hi, h); } return (hi - lo) / (2 * r); };
function roadNear(x, z) {
  let best = 1e18, at = null;
  for (const r of ROADS) for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2;
    if (d < best) { best = d; at = [ax + dx * t, az + dz * t, r.w]; }
  }
  return { d: Math.sqrt(best), at };
}
// Why (x, z) won't do for something r wide, or null. o: off (nearest a road it may be), count (bodies), v (Velscour's), gap (from anything else).
function bad(x, z, r, o = {}) {
  if (Math.abs(x) > EDGE || Math.abs(z) > EDGE) return 'edge';
  if (Math.hypot(x, z) < (o.town ?? 430)) return 'town';
  for (const k of Object.keys(SITES)) { const s = SITES[k]; if (Math.hypot(x - s.x, z - s.z) < s.r + r + (o.site ?? 30)) return 'site'; }
  for (const wt of WATERS) if (Math.hypot(x - wt.x, z - wt.z) < wt.r + r + 14) return 'water';
  if (Math.abs(x - CLIFF.x) < 34 + r && z > CLIFF.z0 - 60 && z < CLIFF.z1 + 60) return 'cliff';
  if (Math.hypot(x - MOUNT.x, z - MOUNT.z) < MOUNT.R * 0.55) return 'mountain';
  const rd = roadNear(x, z);
  if (rd.d < (o.off ?? 40) + r) return 'road';
  if (slope(x, z, r + 5) > (o.steep ?? 0.14)) return 'steep';
  if (o.v) {
    if (countryAt(x, z) !== 'ashen') return 'not his';
    for (const s of SEALS) if (Math.hypot(x - s.x, z - s.z) < 540) return 'seal';
    for (const s of LIGHTS) if (Math.hypot(x - s.x, z - s.z) < 1550) return 'light';
  }
  for (const t of trails) for (let i = 0; i + 1 < t.length; i++) {
    const [ax, az] = t[i], [bx, bz] = t[i + 1], dx = bx - ax, dz = bz - az, q = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(ax + dx * q - x, az + dz * q - z) < r + 8) return 'trail';
  }
  for (const c of [...TUMBLER_CAMPS, ...CAMPS]) if (Math.hypot(x - c.x, z - c.z) < c.r + r + 60) return 'camp';
  for (const t of taken) if (Math.hypot(x - t[0], z - t[1]) < t[2] + r + (o.gap ?? 60)) return 'crowd';
  for (const p of OLD) if (Math.hypot(x - p.x, z - p.z) < p.r + r + (o.gap ?? 60)) return 'crowd';
  if (o.count) {
    // (Not this spot's neighbourhood alone: each neighbour's own must still hold with this one in it.)
    const sum = (qx, qz) => { let n = 0; for (const p of placed) if (Math.hypot(qx - p.x, qz - p.z) < 262) n += p.count; return n; };
    if (sum(x, z) + o.count > 12) return 'slots';
    for (const p of placed) if (Math.hypot(x - p.x, z - p.z) < 262 && sum(p.x, p.z) + o.count > 12) return 'slots';
  }
  return null;
}
const round = (v) => Math.round(v);
// A trail from the nearest road (or the nearest outpost that has one) to just short of (x, z).
function trailTo(x, z, r, outposts) {
  const rd = roadNear(x, z);
  let from = rd.d < 950 ? [rd.at[0], rd.at[1]] : null, len = rd.d;
  for (const o of outposts) { const d = Math.hypot(o.x - x, o.z - z); if (o.trail && d < len * 0.7 && d < 800) { const a = Math.atan2(x - o.x, z - o.z); from = [o.x + Math.sin(a) * (o.r + 14), o.z + Math.cos(a) * (o.r + 14)]; len = d; } }
  if (!from) return null;
  const dx = x - from[0], dz = z - from[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, stop = r + 13;
  if (L < stop + 20) return null;
  const n = Math.max(1, Math.round(L / 110)), pts = [[round(from[0]), round(from[1])]];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), w = (rnd() - 0.5) * Math.min(60, L * 0.22), px = from[0] + dx * t - uz * w, pz = from[1] + dz * t + ux * w;
    pts.push([round(px), round(pz)]);
  }
  pts.push([round(x - ux * stop), round(z - uz * stop)]);
  // (Not through water, a place or over a cliff's edge: then it has no trail, and is found by those who look.)
  for (let i = 0; i + 1 < pts.length; i++) for (let t = 0; t <= 1; t += 0.1) {
    const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pz = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
    for (const wt of WATERS) if (Math.hypot(px - wt.x, pz - wt.z) < wt.r + 10) return null;
    for (const k of Object.keys(SITES)) { const s = SITES[k]; if (Math.hypot(px - s.x, pz - s.z) < s.r + (k === 'keep' ? 130 : 6)) return null; }
    if (Math.abs(px - CLIFF.x) < 30 && pz > CLIFF.z0 - 40 && pz < CLIFF.z1 + 40) return null;
    for (const p of OLD) if (Math.hypot(px - p.x, pz - p.z) < p.r + 12) return null;
    for (const o of outposts) if (Math.hypot(px - o.x, pz - o.z) < o.r + 11) return null;
    for (const t of keepOff) if (Math.hypot(px - t[0], pz - t[1]) < t[2] + 14) return null;
  }
  return pts;
}

// ---- the standing battles: two sides at war, beside a road where a traveller comes on them.
const BATTLES = [];
for (const r of ROADS) for (let i = 0; i + 1 < r.pts.length; i++) {
  const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
  for (let s = 260 + rnd() * 300; s < L; s += 180 + rnd() * 120) {
    const side = rnd() < 0.5 ? -1 : 1, off = 62 + rnd() * 50, ux = (bx - ax) / L, uz = (bz - az) / L;
    const x = round(ax + ux * s - uz * side * off), z = round(az + uz * s + ux * side * off);
    const country = countryAt(x, z), list = COUNTRY_FACTIONS[country].filter((k) => !FACTIONS[k].v || country === 'ashen');
    const a = list[Math.floor(rnd() * Math.min(4, list.length))];
    const foes = list.filter((k) => atWar(FACTIONS[a].side, FACTIONS[k].side) && !(FACTIONS[a].v && FACTIONS[k].v));
    if (!foes.length) continue;
    const b = foes[Math.floor(rnd() * foes.length)], v = FACTIONS[a].v || FACTIONS[b].v;
    const ang = rnd() * 6.28, x2 = round(x + Math.sin(ang) * 15), z2 = round(z + Math.cos(ang) * 15);
    if (bad(x, z, 16, { off: 34, count: 8, v, gap: 64, town: 520, steep: 0.24, site: 140 }) || BATTLES.some((q) => Math.hypot(q.x - x, q.z - z) < 900)) continue;
    BATTLES.push({ key: `wb_${BATTLES.length + 1}`, a, b, x, z, x2, z2 });
    placed.push({ x, z, r: 16, count: 8 }); taken.push([x, z, 20]); keepOff.push([x, z, 22]);
  }
}

// ---- where tears can open: all over, a few hundred metres apart, each of one of its country's two kinds.
const TEAR_SPOTS = [];
for (let cx = -EDGE; cx <= EDGE; cx += 560) for (let cz = -EDGE; cz <= EDGE; cz += 560) for (let tries = 0; tries < 6; tries++) {
  const x = round(cx + (rnd() - 0.5) * 420), z = round(cz + (rnd() - 0.5) * 420);
  if (bad(x, z, 12, { off: 30, gap: 95, town: 520, site: 120, steep: 0.18 })) continue;
  TEAR_SPOTS.push([x, z, COUNTRY_TEARS[countryAt(x, z)][rnd() < 0.6 ? 0 : 1]]); taken.push([x, z, 12]); keepOff.push([x, z, 12]);
  break;
}

// ---- the outposts: tried on a jittered grid, in a shuffled order, each given to one of its country's factions.
const cells = [];
for (let x = -EDGE; x <= EDGE; x += 470) for (let z = -EDGE; z <= EDGE; z += 470) cells.push([x, z, rnd()]);
cells.sort((a, b) => a[2] - b[2]);
const OUTPOSTS = [], uses = {}, names = {};
for (const [cx, cz] of cells) {
  for (let tries = 0; tries < 9; tries++) {
    const x = round(cx + (rnd() - 0.5) * 400), z = round(cz + (rnd() - 0.5) * 400);
    const country = countryAt(x, z), list = COUNTRY_FACTIONS[country];
    // (The first of a country's list the most often; each country's least used first, so they all get stood somewhere.)
    const want = (k) => ((uses[country + k] || 0) + 1) * (1 + list.indexOf(k) * 0.22);
    const fk = [...new Set(list)].sort((a, b) => want(a) - want(b))[rnd() < 0.75 ? 0 : 1];
    const f = FACTIONS[fk], r = f.kind === 'fort' ? 11 : f.kind === 'graveyard' || f.kind === 'camp' ? 8 : 7;
    const count = outpostLair({ faction: fk, key: '', x, z, r }).n + 1;
    if (bad(x, z, r + 8, { off: 46, count, v: f.v, gap: 150, site: 140, steep: country === 'rimeholt' ? 0.42 : f.kind === 'roost' || f.kind === 'den' ? 0.3 : 0.22 })) continue;
    uses[country + fk] = (uses[country + fk] || 0) + 1;
    const k = names[fk] = (names[fk] ?? -1) + 1;
    const trail = trailTo(x, z, r, OUTPOSTS);
    if (trail) trails.push(trail);
    const to = trail ? trail[trail.length - 2] : [0, 0];
    OUTPOSTS.push({ key: `wo_${fk}_${k + 1}`, faction: fk, name: f.places[k % f.places.length], x, z, r, yaw: +Math.atan2(to[0] - x, to[1] - z).toFixed(2), trail });
    placed.push({ x, z, r, count }); taken.push([x, z, r + 8]);
    break;
  }
}

// ---- the small things to find: nothing lives at them. Each has a little put by, for whoever comes on it first.
const FIND_KINDS = ['cart', 'grave', 'cairn', 'camp', 'stone', 'bones', 'well', 'hide', 'shrine', 'pyre', 'totem', 'wreck'];
const FINDS = [];
for (let cx = -EDGE; cx <= EDGE; cx += 330) for (let cz = -EDGE; cz <= EDGE; cz += 330) for (let tries = 0; tries < 3; tries++) {
  if (rnd() < 0.3) break;
  const x = round(cx + (rnd() - 0.5) * 290), z = round(cz + (rnd() - 0.5) * 290), near = roadNear(x, z).d;
  if (bad(x, z, 4, { off: 9, gap: 45, town: 380, site: 20, steep: 0.16 })) continue;
  // (Carts and wells by the roads; the rest wherever.)
  const kinds = near < 40 ? ['cart', 'well', 'shrine', 'grave', 'camp'] : FIND_KINDS.filter((k) => k !== 'cart' && k !== 'well');
  FINDS.push([x, z, FIND_KINDS.indexOf(kinds[Math.floor(rnd() * kinds.length)])]); taken.push([x, z, 4]);
  break;
}

const j = (v) => JSON.stringify(v);
const out = `// Written by tools/wilds/place.mjs: don't edit by hand, run it again. (src/core/wilds.js says what these are.)
export const OUTPOSTS = [\n${OUTPOSTS.map((o) => '  ' + j(o)).join(',\n')},\n];
export const BATTLES = [\n${BATTLES.map((o) => '  ' + j(o)).join(',\n')},\n];
// [x, z, kind (TEARS_KINDS)]
export const TEAR_SPOTS = ${j(TEAR_SPOTS)};
export const FIND_KINDS = ${j(FIND_KINDS)};
// [x, z, kind (FIND_KINDS)]
export const FINDS = ${j(FINDS)};
`;
fs.writeFileSync(new URL('../../src/core/wilds-data.js', import.meta.url), out);
const by = {}; for (const o of OUTPOSTS) by[o.faction] = (by[o.faction] || 0) + 1;
console.log(`${OUTPOSTS.length} outposts (${OUTPOSTS.filter((o) => o.trail).length} with a trail), ${BATTLES.length} battles, ${TEAR_SPOTS.length} tear spots, ${FINDS.length} finds`);
console.log(Object.entries(by).map(([k, n]) => `${k} ${n}`).join(', '));
const unused = Object.keys(FACTIONS).filter((k) => !by[k]);
if (unused.length) console.log('NOT STOOD ANYWHERE:', unused.join(', '));
