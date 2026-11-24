// What's at and round a spot on the land: its height and slope, its country, the nearest road, and every lair, outpost,
// tear, find and place within reach. For choosing where a camp or a den goes.
//   node tools/quests/spot.mjs <x> <z> [reach=600]
//   node tools/quests/spot.mjs --find <x> <z> [within=120]   the nearest level, dry, clear ground to (x, z) for a camp
import { terrainHeight } from '../../src/core/terrain.js';
import { SITES, ROUTES, WATERS, countryAt, routeDist } from '../../src/core/lands.js';
import { LAIRS } from '../../src/core/tripo-monsters.js';
import { OUTPOSTS, FINDS, TEAR_SPOTS } from '../../src/core/wilds-data.js';
import { FACTIONS } from '../../src/core/wilds.js';

export const slopeAt = (x, z, r) => { let lo = 1e9, hi = -1e9; for (let a = 0; a < 8; a++) for (const q of [r * 0.5, r]) { const h = terrainHeight(x + Math.sin(a * 0.785) * q, z + Math.cos(a * 0.785) * q); lo = Math.min(lo, h); hi = Math.max(hi, h); } return (hi - lo) / (2 * r); };
export function roadNear(x, z) {
  let best = 1e18, which = null;
  for (const r of ROUTES) for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const d = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2;
    if (d < best) { best = d; which = r; }
  }
  return { d: Math.sqrt(best), road: which };
}
// Why (x, z) won't take something r wide, or null.
export function badGround(x, z, r, o = {}) {
  for (const k of Object.keys(SITES)) { const s = SITES[k]; if (k !== o.self && Math.hypot(x - s.x, z - s.z) < s.r + r + (o.site ?? 25)) return `site ${k}`; }
  for (const wt of WATERS) if (Math.hypot(x - wt.x, z - wt.z) < wt.r + r + 14) return 'water';
  if (slopeAt(x, z, r + 4) > (o.steep ?? 0.1)) return 'steep';
  const rd = roadNear(x, z);
  if (rd.d < (o.off ?? 6) + r) return 'road';
  for (const l of LAIRS) if (Math.hypot(x - l.x, z - l.z) < l.r + r + (o.lair ?? 70)) return `lair ${l.key}`;
  for (const t of TEAR_SPOTS) if (Math.hypot(x - t[0], z - t[1]) < r + 30) return 'tear';
  return null;
}
export function findGround(x, z, r, within = 120, o = {}) {
  for (let d = 0; d <= within; d += 6) for (let a = 0; a < (d ? Math.max(8, Math.round(d / 2)) : 1); a++) {
    const t = a / Math.max(8, Math.round(d / 2)) * Math.PI * 2, px = Math.round(x + Math.sin(t) * d), pz = Math.round(z + Math.cos(t) * d);
    if (!badGround(px, pz, r, o)) return [px, pz];
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  if (a[0] === '--find') {
    const [x, z, within = 120] = a.slice(1).map(Number), p = findGround(x, z, 22, within);
    console.log(p ? `${p[0]}, ${p[1]}  (${Math.round(Math.hypot(p[0] - x, p[1] - z))} m off; ${Math.round(roadNear(p[0], p[1]).d)} m from ${roadNear(p[0], p[1]).road.name})` : `nothing within ${within} m: ${badGround(x, z, 22)}`);
  } else {
    const [x, z, reach = 600] = a.map(Number), rd = roadNear(x, z), lvl = (l) => l.lvl ?? '?';
    console.log(`(${x}, ${z}): ${terrainHeight(x, z).toFixed(1)} m up, slope ${slopeAt(x, z, 24).toFixed(3)}, ${countryAt(x, z)}, ${Math.round(rd.d)} m from ${rd.road.name} (${rd.road.cls}); ${Math.round(Math.hypot(x, z))} m from Bellmourn; for a camp: ${badGround(x, z, 22) || 'good ground'}`);
    const near = (list, name) => list.map((q) => [q, Math.hypot(q.x - x, q.z - z)]).filter(([, d]) => d < reach).sort((p, q) => p[1] - q[1]).forEach(([q, d]) => console.log(`  ${String(Math.round(d)).padStart(4)} m  ${name(q)}`));
    console.log(' places:'); near(Object.entries(SITES).map(([k, s]) => ({ ...s, k })), (s) => `${s.k} (${s.name})${s.portal ? ', a seal' : ''}`);
    console.log(' lairs:'); near(LAIRS.filter((l) => !l.wild), (l) => `${l.key} lvl ${lvl(l)}: ${(l.boss || []).join('/')} ${l.n ? `+ ${l.n} of ${[...new Set((l.pick || []).map((p) => p.replace(/_\d+$/, '')))].join('/')}` : ''}  at ${l.x}, ${l.z}`);
    console.log(' outposts:'); near(OUTPOSTS, (o) => `${o.key} "${o.name}" ${o.faction} lvl ${FACTIONS[o.faction].lvl}${o.trail ? ', a trail' : ''}  at ${o.x}, ${o.z}`);
    console.log(` tears within ${reach} m: ${TEAR_SPOTS.filter((t) => Math.hypot(t[0] - x, t[1] - z) < reach).length}; things to find: ${FINDS.filter((f) => Math.hypot(f[0] - x, f[1] - z) < reach).length}`);
    void slopeAt;
  }
}
