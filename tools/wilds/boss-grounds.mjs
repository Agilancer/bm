// Finds the world bosses' grounds (src/core/wilds.js WORLD_BOSSES): wide, level clearings a little off the land's roads,
// three or four to a country, where a boss three times a man's height can be fought with room to run. Writes
// src/core/boss-grounds.js, the same every time it's run.
//   node tools/wilds/boss-grounds.mjs
// Each keeps off the roads (but within sight of one), the places, the water, the cliff, the mountain, the camps, every lair,
// outpost, battle, tear and find (a boss and its adds want the twelve slots to themselves), and the town by 700 m. The pines
// and the boulders keep out of each (src/core/hunts.js FAR_GROUNDS), as they do out of a tear's spot.
import fs from 'node:fs';

const { terrainHeight } = await import('../../src/core/terrain.js');
const { SITES, ROUTES, WATERS, CLIFF, MOUNT, countryAt } = await import('../../src/core/lands.js');
const { LAIRS } = await import('../../src/core/tripo-monsters.js');
const { CAMPS } = await import('../../src/core/camps-data.js');
const { TEAR_SPOTS, FINDS, OUTPOSTS, BATTLES } = await import('../../src/core/wilds-data.js');
const { COUNTRY_FACTIONS } = await import('../../src/core/wilds.js');

let seed = 0xb055e5;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = 24;                 // the clearing's radius
const PER = 4;                // grounds a country
const APART = 650;            // metres between two grounds
const { WORLD_EAST } = await import('../../src/core/lands.js');

const ROADS = ROUTES.filter((r) => !r.trail);
// How far it rises and falls across r: the worst of eight ways, at half and the whole of it, over the width.
const slope = (x, z, r) => { let lo = 1e9, hi = -1e9; for (let a = 0; a < 12; a++) for (const q of [r * 0.35, r * 0.7, r]) { const h = terrainHeight(x + Math.sin(a * 0.524) * q, z + Math.cos(a * 0.524) * q); lo = Math.min(lo, h); hi = Math.max(hi, h); } return (hi - lo) / (2 * r); };
function roadNear(x, z) {
  let best = 1e18;
  for (const r of ROADS) for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2);
  }
  return Math.sqrt(best);
}
const taken = [
  ...LAIRS.map((l) => [l.x, l.z, l.r + 170]),
  ...OUTPOSTS.map((o) => [o.x, o.z, o.r + 170]),
  ...BATTLES.flatMap((b) => [[b.x, b.z, 170], [b.x2, b.z2, 170]]),
  ...TEAR_SPOTS.map(([x, z]) => [x, z, 140]),
  ...FINDS.map(([x, z]) => [x, z, R + 8]),
  ...CAMPS.map((c) => [c.x, c.z, c.r + 160]),
];
function bad(x, z, roadFar = R + 95) {
  if (x < -5250 || x > WORLD_EAST - 60 || Math.abs(z) > 5250) return 'edge';
  if (Math.hypot(x, z) < 700) return 'town';
  for (const s of Object.values(SITES)) if (Math.hypot(x - s.x, z - s.z) < s.r + R + 90) return 'site';
  for (const w of WATERS) if (Math.hypot(x - w.x, z - w.z) < w.r + R + 20) return 'water';
  if (Math.abs(x - CLIFF.x) < 60 + R && z > CLIFF.z0 - 80 && z < CLIFF.z1 + 80) return 'cliff';
  if (Math.hypot(x - MOUNT.x, z - MOUNT.z) < MOUNT.R * 0.7) return 'mountain';
  const rd = roadNear(x, z);
  if (rd < R + 22 || rd > roadFar) return 'road';
  if (slope(x, z, R) > 0.1) return 'steep';
  for (const t of taken) if (Math.hypot(x - t[0], z - t[1]) < t[2] + R) return 'crowd';
  return null;
}

const out = [];
const why = {};
for (const country of Object.keys(COUNTRY_FACTIONS)) {
  const mine = [];
  // (Off a road: a point along one of the country's roads, and out to one side of it.)
  const segs = [];
  for (const r of ROADS) for (let i = 0; i + 1 < r.pts.length; i++) { const [ax, az] = r.pts[i]; if (countryAt(ax, az) === country) segs.push([r.pts[i], r.pts[i + 1]]); }
  for (let n = 0; n < 120000 && mine.length < PER && segs.length; n++) {
    const [[ax, az], [bx, bz]] = segs[Math.floor(rnd() * segs.length)], t = rnd(), L = Math.hypot(bx - ax, bz - az) || 1;
    const side = rnd() < 0.5 ? 1 : -1, off = R + 30 + rnd() * 60;
    const x = Math.round(ax + (bx - ax) * t + (bz - az) / L * off * side), z = Math.round(az + (bz - az) * t - (bx - ax) / L * off * side);
    if (countryAt(x, z) !== country) continue;
    // (Well inside the country, not on its border: a boss of the Fells in the Fells.)
    if ([[60, 0], [-60, 0], [0, 60], [0, -60]].some(([dx, dz]) => countryAt(x + dx, z + dz) !== country)) continue;
    const b = bad(x, z);
    if (b) { why[b] = (why[b] || 0) + 1; continue; }
    if (out.concat(mine).some((g) => Math.hypot(g.x - x, g.z - z) < APART)) { why.apart = (why.apart || 0) + 1; continue; }
    mine.push({ key: `bg_${country}_${mine.length}`, country, x, z, r: R });
  }
  out.push(...mine);
  console.log(`${country}: ${mine.length}`);
}
console.log('turned away:', why);
// The Heralds' own grounds, for two of the four quests that send you to put one down (src/folk/regions/waste.js, deepwood.js:
// wboss steps, at:), each near whoever gives it, so the quest's work is within reach of its hub (tools/quests/rules.mjs LOCAL,
// 650 m): the nearest good ground to them, 220 to 560 m off, by the same rules but further from a road if need be. (The other
// two give from by a ground of the countries' already: bg_downs_1, Sib Kestrel's; bg_rimeholt_0, Dain Scree's.)
const HERALD_GROUNDS = [{ key: 'bg_herald_hearth', who: 'vesna' }, { key: 'bg_herald_hollow', who: 'isla' }];
const { POSTED } = await import('../../src/folk/people.js');
for (const h of HERALD_GROUNDS) {
  const [px, pz] = POSTED.find((q) => q.id === h.who).post;
  let best = null;
  for (let d = 220; d <= 560 && !best; d += 20) {
    for (let a = 0; a < 72; a++) {
      const x = Math.round(px + Math.sin(a * Math.PI / 36) * d), z = Math.round(pz + Math.cos(a * Math.PI / 36) * d);
      if (bad(x, z, R + 240) || out.some((g) => Math.hypot(g.x - x, g.z - z) < 300)) continue;
      best = { key: h.key, country: countryAt(x, z), x, z, r: R };
      break;
    }
  }
  if (best) { out.push(best); console.log(`${h.key}: ${Math.round(Math.hypot(best.x - px, best.z - pz))} m from ${h.who}`); } else console.log(`no ground for ${h.key}`);
}
const body = `// Written by tools/wilds/boss-grounds.mjs: don't edit by hand, run it again. (src/core/wilds.js WORLD_BOSSES says what these are for.)\n`
  + `// Each a level clearing, r metres across its middle, a little off a road; the pines keep out of it (src/core/hunts.js FAR_GROUNDS).\n`
  + `export const BOSS_GROUNDS = [\n${out.map((g) => `  ${JSON.stringify(g)},`).join('\n')}\n];\n`;
fs.writeFileSync(new URL('../../src/core/boss-grounds.js', import.meta.url), body);
console.log(`${out.length} grounds written`);
