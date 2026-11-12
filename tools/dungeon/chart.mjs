// A plan of each party dungeon as a picture, for looking at a layout without the game: the floor as the field has it
// (darker where it's deeper), every room by name with how far it is to walk from the way in, the packs (how many, of
// what), the bosses, what's solid in the rooms, the doors a fight's adds come through, the way in and the way out.
//   node tools/dungeon/chart.mjs [delve ...] [--out dir]     (every delve, into tools/build/delves, unless told)
// Needs Playwright's Chromium (it draws on a canvas and saves a PNG).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { BOSSES, CaveNav, DELVES, caveFloorY, caveRoom, grid, roomSpot, toWorld } from '../../src/core/dungeon.js';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2), oi = args.indexOf('--out');
const out = oi >= 0 ? args[oi + 1] : new URL('../build/delves/', import.meta.url).pathname;
const names = args.filter((a, i) => !a.startsWith('--') && i !== oi + 1 || (oi < 0 && !a.startsWith('--')));
const which = DELVES.filter((d) => !names.length || names.includes(d.key));
fs.mkdirSync(out, { recursive: true });

function dataFor(d) {
  const g = grid(d), S = 2, W = Math.ceil(g.W / S), H = Math.ceil(g.H / S);     // a metre a cell
  const cells = new Array(W * H).fill(null);
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = g.x0 + i * S * 0.5, z = g.z0 + j * S * 0.5;
    if (caveRoom(x, z) > 0.15) { const y = caveFloorY(x, z) - d.y; cells[j * W + i] = Math.round(y * 10) / 10; lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  const nav = new CaveNav(d), [ex, ez] = toWorld(d.entry.x, d.entry.z, d);
  const L = (x, z) => [(x - (g.x0 - d.x)) , (z - (g.z0 - d.z))];
  const short = (id) => id.replace(/_(green|red|black|white|armored|undead|brown)/g, '').replace(/_\d+$/, '').replace(/^(zombie_boy|zombie_girl)$/, 'child');
  return {
    name: d.name, key: d.key, level: d.level, style: d.style, W, H, cells, lo, hi,
    rooms: d.rooms.map((r) => { const [x, , z] = roomSpot(r.id); return { name: r.name, id: r.id, at: L(r.x, r.z), y: r.y, r: r.r, walk: Math.round(nav.walkDist(ex, ez, x, z, 0)) }; }),
    packs: d.packs.map((p) => { const r = d.rooms.find((q) => q.id === p.room); return { key: p.key, at: L(r.x + (p.at?.[0] || 0), r.z + (p.at?.[1] || 0)), n: p.n, who: [...new Set(p.pick.map(short))].join('/'), elite: p.elite ? short(p.elite[0]) : '', walk: p.walk?.map((q) => L(q[0], q[1])), spots: p.spots?.map((q) => L(q[0], q[1])), more: p.more ? { n: p.more.n, at: L(p.more.from[0], p.more.from[1]) } : null }; }),
    bosses: BOSSES.filter((b) => b.delve === d.key).map((b) => { const r = d.rooms.find((q) => q.id === b.room); return { name: b.name, at: L(r.x, r.z), hp: b.hp, needs: b.needs || null }; }),
    solids: d.props.filter((p) => p.solid).map((p) => ({ at: L(p.x, p.z), r: p.r, hx: p.hx, hz: p.hz })).concat((d.pillars || []).map((p) => ({ at: L(p[0], p[1]), r: p[2] }))),
    props: d.props.filter((p) => !p.solid).map((p) => ({ at: L(p.x, p.z), kind: p.kind })),
    doors: d.tunnels.filter((t) => t.dead).map((t) => L(...t.pts[t.pts.length - 1])),
    entry: L(d.entry.x, d.entry.z), exitIn: L(d.exitIn.x, d.exitIn.z), exitOut: L(d.exitOut.x, d.exitOut.z),
    way: Math.round(nav.walkDist(ex, ez, ...toWorld(d.exitOut.x, d.exitOut.z, d), 0)),
  };
}

const page = (D) => `<!doctype html><body style="margin:0;background:#14161a"><canvas id="c"></canvas><script>
const D = ${JSON.stringify(D)}, K = 5, PAD = 70, c = document.getElementById('c'), g = c.getContext('2d');
c.width = D.W * K + PAD * 2; c.height = D.H * K + PAD * 2 + 40;
g.fillStyle = '#14161a'; g.fillRect(0, 0, c.width, c.height);
const X = (x) => PAD + x * K, Z = (z) => PAD + 40 + z * K;
for (let j = 0; j < D.H; j++) for (let i = 0; i < D.W; i++) { const y = D.cells[j * D.W + i]; if (y === null) continue; const k = (y - D.lo) / Math.max(1, D.hi - D.lo); g.fillStyle = 'hsl(' + (205 - k * 165) + ',26%,' + (30 + k * 34) + '%)'; g.fillRect(X(i), Z(j), K, K); }
g.fillStyle = '#3b3f48'; for (const s of D.solids) { if (s.hx !== undefined) g.fillRect(X(s.at[0] - s.hx), Z(s.at[1] - s.hz), s.hx * 2 * K, s.hz * 2 * K); else { g.beginPath(); g.arc(X(s.at[0]), Z(s.at[1]), (s.r || 1) * K, 0, 7); g.fill(); } }
g.fillStyle = 'rgba(20,22,26,.45)'; for (const p of D.props) { g.beginPath(); g.arc(X(p.at[0]), Z(p.at[1]), 2.2, 0, 7); g.fill(); }
const text = (s, x, y, o = {}) => { g.font = (o.bold ? 'bold ' : '') + (o.size || 13) + 'px sans-serif'; g.textAlign = o.align || 'center'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(10,11,14,.85)'; g.strokeText(s, x, y); g.fillStyle = o.color || '#fff'; g.fillText(s, x, y); };
for (const q of D.doors) { g.fillStyle = '#c084fc'; g.fillRect(X(q[0]) - 5, Z(q[1]) - 5, 10, 10); text('adds', X(q[0]), Z(q[1]) - 9, { size: 11, color: '#d8b4fe' }); }
for (const p of D.packs) {
  if (p.walk) { g.strokeStyle = '#fca5a5'; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(p.walk[0][0]), Z(p.walk[0][1])); g.lineTo(X(p.walk[1][0]), Z(p.walk[1][1])); g.stroke(); g.setLineDash([]); }
  for (const s of p.spots || []) { g.fillStyle = '#f87171'; g.beginPath(); g.arc(X(s[0]), Z(s[1]), 4, 0, 7); g.fill(); }
  if (p.more) { g.fillStyle = '#fb923c'; g.beginPath(); g.arc(X(p.more.at[0]), Z(p.more.at[1]), 5, 0, 7); g.fill(); text('+' + p.more.n, X(p.more.at[0]) + 12, Z(p.more.at[1]) + 4, { size: 11, color: '#fdba74' }); }
  g.fillStyle = '#dc2626'; g.beginPath(); g.arc(X(p.at[0]), Z(p.at[1]), 9, 0, 7); g.fill(); text(String(p.n), X(p.at[0]), Z(p.at[1]) + 4, { size: 12, bold: true });
  text(p.who + (p.elite ? ' + ' + p.elite + '!' : '') + (p.walk ? ' (patrol)' : p.spots ? ' (posted)' : ''), X(p.at[0]), Z(p.at[1]) + 23, { size: 11, color: '#fecaca' });
}
for (const b of D.bosses) { const x = X(b.at[0]), z = Z(b.at[1]); g.fillStyle = '#facc15'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 6 : 14; g.lineTo(x + Math.cos(a) * r, z + Math.sin(a) * r); } g.fill(); text(b.name + ' (' + b.hp + ')' + (b.needs ? ' [needs ' + b.needs.join(' + ') + ']' : ''), x, z + 30, { size: 13, bold: true, color: '#fde68a' }); }
for (const r of D.rooms) text(r.name + '  ' + r.walk + ' m, y ' + r.y, X(r.at[0]), Z(r.at[1]) - (r.r ? Math.min(r.r, 14) : 9) * K * 0.55 - 6, { size: 14, bold: true });
const mark = (q, color, label) => { g.fillStyle = color; g.beginPath(); g.arc(X(q[0]), Z(q[1]), 7, 0, 7); g.fill(); text(label, X(q[0]) + 12, Z(q[1]) + 5, { size: 12, color, align: 'left' }); };
mark(D.entry, '#4ade80', 'way in'); mark(D.exitIn, '#38bdf8', 'portal out'); mark(D.exitOut, '#38bdf8', 'portal out (after the last boss)');
text(D.name + '   level ' + D.level + ', ' + D.style + ', ' + D.way + ' m from the way in to the way out (shortest)   north is up', PAD, 34, { size: 20, bold: true, align: 'left' });
g.fillStyle = '#fff'; g.fillRect(PAD, c.height - 30, 20 * K, 4); text('20 m', PAD + 10 * K, c.height - 36, { size: 12 });
text('red disc: a pack (how many; who; ! an elite leads it)   star: a boss (life)   purple: where a fight\\u2019s adds come from   grey: solid (pillars, furniture)   floor: sand high, blue deep', PAD + 24 * K, c.height - 24, { size: 12, align: 'left', color: '#cbd5e1' });
</script></body>`;

const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (const d of which) {
  const D = dataFor(d), p = await b.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  await p.setContent(page(D));
  const file = `${out}/${d.key}.png`;
  await (await p.$('#c')).screenshot({ path: file });
  await p.close();
  console.log(`${d.name}: ${file}`);
}
await b.close();
