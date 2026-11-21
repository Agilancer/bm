// The castle's lesser towers and their bridges (src/core/phobos-build.js castleTowers): what each stair starts from, its
// galleries, its deck; every bridge and its slope; and which towers can't be walked to from the castle's ground and decks.
//   node tools/phobos/towers.mjs
import { castleTowers, castleFinds } from '../../src/core/phobos-build.js';
import { PLAIN } from '../../src/core/east.js';
const { towers, bridges } = castleTowers();
for (const t of towers) console.log(t.key.padEnd(9), t.kind.padEnd(6), t.name.padEnd(26), `(${t.x.toFixed(0)}, ${t.z.toFixed(0)})`.padEnd(15), 'r', t.r.toFixed(1).padStart(4), 'ground', (t.fy - PLAIN).toFixed(0).padStart(4), 'base', String(t.base === null ? '-' : Math.round(t.base)).padStart(4), 'levels', t.levels.map((h) => h.toFixed(0)).join(' ').padEnd(20), 'deck', t.deck?.toFixed(0) ?? '', 'top', t.top.toFixed(0));
console.log();
for (const b of bridges) { const L = Math.hypot(b.b[0] - b.a[0], b.b[2] - b.a[2]); console.log(b.from.padEnd(9), '->', b.to.padEnd(9), 'len', L.toFixed(0).padStart(4), 'from', (b.a[1] - PLAIN).toFixed(0), 'to', (b.b[1] - PLAIN).toFixed(0), 'slope', ((b.b[1] - b.a[1]) / L).toFixed(2)); }
// Reached: a tower with a base, a spire (its own stair from the Keep's steps), and whatever a bridge joins to one reached.
const ok = new Set(towers.filter((t) => t.buried || t.from != null || t.kind === 'spire').map((t) => t.key));
for (let more = true; more;) { more = false; for (const b of bridges) for (const [p, q] of [[b.from, b.to], [b.to, b.from]]) if ((ok.has(p) || p.startsWith('step')) && !ok.has(q) && !q.startsWith('step')) { ok.add(q); more = true; } }
const lost = towers.filter((t) => !ok.has(t.key)).map((t) => t.key);
console.log(`\n${towers.length} towers, ${bridges.length} bridges; not reached: ${lost.join(', ') || 'none'}`);
const f = castleFinds(); console.log(`${f.vistas.length} lookouts, ${f.chests.length} chests`);
