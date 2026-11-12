// Finds a sound spot near each lair that's wanted: off the roads, out of the places, the water and the steep ground, Velscour's
// knights (v) half a kilometre from any seal, no two lairs crowding each other, and no spot's neighbours within 235 m more than
// the twelve body slots can stand up. Lairs already in LAIRS are kept where they are.
//   node tools/monsters/place-lairs.mjs want.json out.json
// want.json: [{ key, x, z, r, n, boss?: 1, off?: [nearest, furthest from a road], v?: 1 }]; prints and writes where each can stand.
import { terrainHeight } from '../../src/core/terrain.js';
import { SITES, routeDist, waterAt, WATERS, CLIFF, countryAt, siteAt } from '../../src/core/lands.js';
import { LAIRS } from '../../src/core/tripo-monsters.js';
import { inTown } from '../../src/core/town.js';
import { TUMBLER_CAMPS } from '../../src/sim/tumblers.js';
import { CAMPS } from '../../src/sim/slimes.js';
import fs from 'node:fs';
const want = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const placed = LAIRS.filter((l) => !want.some((w) => w.key === l.key)).map((l) => ({ ...l, count: (l.boss ? 1 : 0) + l.n }));
const SEALS = Object.values(SITES).filter((s) => s.portal || s.light);
const slope = (x, z, r) => { let lo = 1e9, hi = -1e9; for (let a = 0; a < 8; a++) for (const q of [r * 0.5, r]) { const h = terrainHeight(x + Math.sin(a * 0.785) * q, z + Math.cos(a * 0.785) * q); lo = Math.min(lo, h); hi = Math.max(hi, h); } return (hi - lo) / (2 * r); };
function ok(w, x, z) {
  const r = w.r;
  if (inTown(x, z, 40)) return 'town';
  for (const k of Object.keys(SITES)) { const s = SITES[k], d = Math.hypot(x - s.x, z - s.z); if (d < s.r + r + 6) return 'site ' + k; }
  for (const wt of WATERS) if (Math.hypot(x - wt.x, z - wt.z) < wt.r + r + 12) return 'water';
  if (Math.abs(x - CLIFF.x) < 30 + r && z > CLIFF.z0 - 60 && z < CLIFF.z1 + 60) return 'cliff';
  const rd = routeDist(x, z);
  if (rd.road && rd.d < (w.off?.[0] ?? 34) + r * 0.5) return 'road';
  if (w.off && !(rd.road && rd.d <= w.off[1])) return 'far from road';
  if (slope(x, z, r + 4) > 0.16) return 'steep';
  if (w.v) for (const s of SEALS) if (Math.hypot(x - s.x, z - s.z) < 520) return 'seal';
  // (Nor where the tumblers or the jellies already keep: one fight at a time.)
  for (const c of [...TUMBLER_CAMPS, ...CAMPS]) if (Math.hypot(x - c.x, z - c.z) < c.r + r + 60) return 'camp';
  let near = w.count;
  for (const p of placed) { const d = Math.hypot(x - p.x, z - p.z); if (d < r + p.r + 60) return 'crowd ' + p.key; if (d < 235) near += p.count; }
  if (near > 12) return 'slots';
  return null;
}
const out = [];
for (const w of want) {
  w.count = (w.boss ? 1 : 0) + w.n;
  let best = null;
  search: for (let ring = 0; ring <= 40; ring++) for (let a = 0; a < Math.max(1, ring * 6); a++) {
    const ang = a / Math.max(1, ring * 6) * 6.2832 + ring, x = Math.round(w.x + Math.sin(ang) * ring * 8), z = Math.round(w.z + Math.cos(ang) * ring * 8);
    if (!ok(w, x, z)) { best = [x, z]; break search; }
  }
  if (!best) { console.error('NO SPOT', w.key, ok(w, w.x, w.z)); continue; }
  const [x, z] = best;
  placed.push({ ...w, x, z });
  const rd = routeDist(x, z);
  out.push({ key: w.key, x, z, moved: Math.round(Math.hypot(x - w.x, z - w.z)), country: countryAt(x, z), road: rd.road ? `${rd.road.name} ${Math.round(rd.d)}m` : '-', site: Object.keys(SITES).map((k) => [k, Math.round(Math.hypot(x - SITES[k].x, z - SITES[k].z))]).sort((a, b) => a[1] - b[1])[0].join(' ') });
}
for (const o of out) console.log(`${o.key.padEnd(20)} ${String(o.x).padStart(6)} ${String(o.z).padStart(6)}  moved ${String(o.moved).padStart(3)}  ${o.country.padEnd(9)} ${o.road.padEnd(26)} ${o.site}`);
fs.writeFileSync(process.argv[3], JSON.stringify(out));
