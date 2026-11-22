// A picture of a region's quests on the land: its roads, places, camps, lairs, dens, dungeon doors, where the tears open
// and the small things lie, and each quest drawn from whoever gives it to where its work is. For looking a region over
// (docs/QUEST-LOOP.md). Writes an SVG, and a PNG of it when there's a browser to draw one (Playwright).
//   node tools/quests/map.mjs <region> [out-directory=tools/build/quests]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { RULES } from '../../src/folk/quests.js';
import { QUESTS } from '../../src/folk/lines/quests.js';
import { CAMPS } from '../../src/core/camps-data.js';
import { SITES, ROUTES, WATERS } from '../../src/core/lands.js';
import { LAIRS } from '../../src/core/tripo-monsters.js';
import { OUTPOSTS, FINDS, TEAR_SPOTS } from '../../src/core/wilds-data.js';
import { FACTIONS } from '../../src/core/wilds.js';
import { DELVES } from '../../src/core/dungeon.js';
import { SEALS } from '../../src/core/sites.js';
import { lairLevelOf } from '../../src/ui/autobrain.js';
import { table, REGIONS, LOCAL } from './rules.mjs';
import { whereIs, stepSpots } from './geo.mjs';

const key = process.argv[2], dir = process.argv[3] || 'tools/build/quests';
const R = REGIONS.find((r) => r.key === key);
if (!R) { console.error(`node tools/quests/map.mjs <region>: ${REGIONS.map((r) => r.key).join(', ')}`); process.exit(2); }
const T = table().filter((q) => R.hubs.includes(q.hub));
const hubAt = (h) => (h === 'bellmourn' ? { x: 10, z: 0, name: 'Bellmourn', r: 80 } : SITES[h] || null);
const hubs = R.hubs.map((h) => [h, hubAt(h)]).filter(([h, s]) => s && (T.some((q) => q.hub === h) || CAMPS.some((c) => c.key === h)));
if (!hubs.length) { console.error('nothing to draw'); process.exit(1); }
let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
for (const [, s] of hubs) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); }
x0 -= 800; x1 += 800; z0 -= 800; z1 += 800;
const W = 1800, sc = W / (x1 - x0), Hh = Math.round((z1 - z0) * sc), X = (x) => ((x - x0) * sc).toFixed(1), Z = (z) => ((z - z0) * sc).toFixed(1);
const inb = (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" font-family="Verdana, sans-serif"><rect width="100%" height="100%" fill="#e9e4d4"/>`];
const text = (x, z, t, o = {}) => out.push(`<text x="${X(x)}" y="${Z(z)}" dx="${o.dx ?? 6}" dy="${o.dy ?? 4}" font-size="${o.size || 11}" fill="${o.fill || '#222'}" ${o.bold ? 'font-weight="bold"' : ''} ${o.halo === false ? '' : 'stroke="#e9e4d4" stroke-width="3" paint-order="stroke"'}>${esc(t)}</text>`);
for (const w of WATERS) if (inb(w.x, w.z, w.r)) out.push(`<circle cx="${X(w.x)}" cy="${Z(w.z)}" r="${(w.r * sc).toFixed(1)}" fill="#a9c4d6"/>`);
// The ways: footpaths and trails faint, lanes thin, the roads broad.
const STYLE = { great: ['#7a6a4f', 3.2], road: ['#8b7b5e', 2.4], lane: ['#a3967c', 1.3], path: ['#b9ae97', 0.8] };
for (const cls of ['path', 'lane', 'road', 'great']) for (const r of ROUTES) {
  if ((r.cls || 'lane') !== cls || !r.pts.some(([x, z]) => inb(x, z, 200))) continue;
  out.push(`<polyline points="${r.pts.map(([x, z]) => `${X(x)},${Z(z)}`).join(' ')}" fill="none" stroke="${STYLE[cls][0]}" stroke-width="${STYLE[cls][1]}" ${r.trail ? 'stroke-dasharray="4 3"' : ''}/>`);
}
for (const r of ROUTES) if ((r.cls === 'great' || r.cls === 'road') && !r.way) { const p = r.pts[Math.floor(r.pts.length / 2)]; if (inb(p[0], p[1])) text(p[0], p[1], r.name, { size: 10, fill: '#6b5a3e', dy: -5 }); }
for (const [x, z] of TEAR_SPOTS) if (inb(x, z)) out.push(`<path d="M${X(x)} ${Z(z)}m-3 -3l6 6m0 -6l-6 6" stroke="#8a4fb0" stroke-width="1.2"/>`);
for (const [x, z] of FINDS) if (inb(x, z)) out.push(`<circle cx="${X(x)}" cy="${Z(z)}" r="1.8" fill="#c9a227"/>`);
for (const o of OUTPOSTS) {
  if (!inb(o.x, o.z)) continue;
  const used = T.some((q) => RULES[q.id].steps.some((s) => s.clear === o.key || [s.kill, s.gather, s.enter].includes(`outpost:${o.key}`)));
  out.push(`<path d="M${X(o.x)} ${Z(o.z)}m0 -${o.pin ? 7 : 4.5}l${o.pin ? 7 : 4.5} ${o.pin ? 7 : 4.5}l-${o.pin ? 7 : 4.5} ${o.pin ? 7 : 4.5}l-${o.pin ? 7 : 4.5} -${o.pin ? 7 : 4.5}z" fill="${o.pin ? (used ? '#d9622b' : '#f0c9a8') : '#c8beaa'}" stroke="#6b3a1a" stroke-width="${o.pin ? 1.2 : 0.5}"/>`);
  if (o.pin) text(o.x, o.z, `${o.name} (${o.faction} ${FACTIONS[o.faction].lvl})`, { size: 10, fill: '#8a3a12', dx: 9 });
}
for (const l of LAIRS) if (!l.wild && inb(l.x, l.z)) { out.push(`<circle cx="${X(l.x)}" cy="${Z(l.z)}" r="4" fill="#b3261e"/>`); text(l.x, l.z, `${l.key} ${lairLevelOf(l.key) ?? '?'}`, { size: 9, fill: '#8c1d18' }); }
for (const d of DELVES) if (d.portal && !d.within && inb(d.portal.x, d.portal.z)) { out.push(`<rect x="${X(d.portal.x) - 6}" y="${Z(d.portal.z) - 6}" width="12" height="12" fill="#2b5fa8" stroke="#111"/>`); text(d.portal.x, d.portal.z, `${d.name} (dungeon, ${d.level})`, { size: 11, fill: '#1d3f73', bold: true, dx: 9 }); }
for (const s of SEALS) if (inb(s.x, s.z)) out.push(`<circle cx="${X(s.x)}" cy="${Z(s.z)}" r="6" fill="none" stroke="#1f8a8a" stroke-width="2"/>`);
for (const [k, s] of Object.entries(SITES)) {
  if (!inb(s.x, s.z)) continue;
  const camp = !!s.camp, n = T.filter((q) => q.hub === k).length;
  if (camp) out.push(`<path d="M${X(s.x)} ${Z(s.z)}m-8 6l8 -14l8 14z" fill="#2e7d32" stroke="#123" stroke-width="1"/>`);
  else out.push(`<circle cx="${X(s.x)}" cy="${Z(s.z)}" r="${Math.max(4, s.r * sc).toFixed(1)}" fill="none" stroke="#333" stroke-width="1.2"/>`);
  text(s.x, s.z, `${s.name}${n ? ` · ${n} quests` : ''}`, { size: camp || n ? 13 : 11, bold: camp || n > 0, fill: camp ? '#1b5e20' : '#222', dx: 11, dy: -6 });
  if (n) out.push(`<circle cx="${X(s.x)}" cy="${Z(s.z)}" r="${(LOCAL * sc).toFixed(1)}" fill="none" stroke="#2e7d32" stroke-width="0.7" stroke-dasharray="2 5"/>`);
}
if (inb(10, 0)) { out.push(`<rect x="${X(10) - 9}" y="${Z(0) - 9}" width="18" height="18" fill="#444"/>`); text(10, 0, `Bellmourn · ${T.filter((q) => q.hub === 'bellmourn').length} quests`, { size: 14, bold: true, dx: 13, dy: -8 }); out.push(`<circle cx="${X(10)}" cy="${Z(0)}" r="${(LOCAL * sc).toFixed(1)}" fill="none" stroke="#444" stroke-width="0.7" stroke-dasharray="2 5"/>`); }
// Each quest: from its giver to its work (blue), or on to the next hub (green, one way).
out.push('<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>');
for (const q of T) {
  const g = whereIs(QUESTS[q.id].giver);
  if (!g) continue;
  const seen = new Set();
  for (const st of RULES[q.id].steps) for (const s of stepSpots(q.id, st)) {
    if (s.what === 'back' || Math.hypot(s.x - g.x, s.z - g.z) < 25 || seen.has(`${Math.round(s.x)},${Math.round(s.z)}`)) continue;
    seen.add(`${Math.round(s.x)},${Math.round(s.z)}`);
    const lead = q.oneWay && st === RULES[q.id].steps.at(-1);
    out.push(`<line x1="${X(g.x)}" y1="${Z(g.z)}" x2="${X(s.x)}" y2="${Z(s.z)}" stroke="${lead ? '#1b8a3a' : q.far > LOCAL && !q.oneWay ? '#d00' : '#2a5db0'}" stroke-width="${lead ? 2.2 : 1.3}" ${lead ? 'stroke-dasharray="7 4"' : ''} marker-end="url(#a)" opacity="0.8"/>`);
    if (inb((g.x + s.x) / 2, (g.z + s.z) / 2)) text((g.x + s.x) / 2, (g.z + s.z) / 2, `${QUESTS[q.id].title} (${q.level})`, { size: 9, fill: lead ? '#14602a' : '#1f4688', dx: 3 });
  }
}
out.push(`<line x1="20" y1="${Hh - 20}" x2="${20 + 500 * sc}" y2="${Hh - 20}" stroke="#000" stroke-width="3"/><text x="20" y="${Hh - 28}" font-size="12">500 m</text>`);
out.push(`<text x="20" y="24" font-size="18" font-weight="bold">${esc(R.name)}</text><text x="20" y="42" font-size="11">green tent: a camp · ring: a place (teal ring: a seal) · red dot: a lair and its level · orange lozenge: a den pinned for a quest (pale: unused) · grey lozenge: an outpost · blue square: a dungeon's door · purple x: a tear · gold dot: a find · blue arrow: a quest's work · green dashes: sent on to the next hub · red arrow: breaks the ${LOCAL} m rule · dotted ring: ${LOCAL} m round a hub</text></svg>`);
fs.mkdirSync(dir, { recursive: true });
const svg = path.join(dir, `${key}.svg`), png = path.join(dir, `${key}.png`);
fs.writeFileSync(svg, out.join('\n'));
console.log(`wrote ${svg}`);
try {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const b = await chromium.launch(), page = await b.newPage({ viewport: { width: W, height: Hh }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0">${out.join('\n')}</body>`);
  await page.screenshot({ path: png });
  await b.close();
  console.log(`wrote ${png}`);
} catch (e) { console.log(`(no PNG: ${String(e.message || e).split('\n')[0]})`); }
