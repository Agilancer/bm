// Whether every delve's bosses and packs fit where they stand: each model's height (and how high it flies) against the roof
// of its room, and its body's footprint (measured off its glb) against the radius the sim keeps it off the walls by.
//   node tools/dungeon/clipcheck.mjs
import { bodyRadius } from '../../src/sim/tripo.js';
import fs from 'node:fs';
import { BOSSES, DELVES, roomOf } from '../../src/core/dungeon.js';
import { withVariants } from '../../src/core/tripo-monsters.js';

const dir = 'assets/monsters/tripo/';
const roster = withVariants(JSON.parse(fs.readFileSync(dir + 'roster.json')));
const foot = {};
function footOf(id) {
  if (foot[id]) return foot[id];
  const m = roster[id]; if (!m) return null;
  const f = dir + (m.src || id) + '.glb';
  if (!fs.existsSync(f)) return null;
  const b = fs.readFileSync(f), jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString());
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const me of j.meshes) for (const p of me.primitives) { const a = j.accessors[p.attributes.POSITION]; if (a.min) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); } }
  const e = mx.map((v, i) => v - mn[i]);
  // (Which way is up: a spider's, a dragon's the shortest; a worm's and a man's the longest of the three... taken as the
  // roster says it stands.)
  const up = m.kind === 'spider' || m.kind === 'dragon' ? 1 : e.indexOf(Math.max(...e));
  const flat = e.filter((_, i) => i !== up), s = m.height / e[up];
  return (foot[id] = { half: Math.min(...flat) * s / 2, long: Math.max(...flat) * s / 2, H: m.height, hover: Math.max(0, ...Object.values(m.hover || {})) * m.height, kind: m.kind });
}
const radius = (f, boss) => bodyRadius(f.H, f.kind, boss);
let bad = 0;
for (const b of BOSSES) {
  const r = roomOf(b.room), d = DELVES.find((q) => q.key === b.delve);
  for (const id of b.models) {
    const f = footOf(id); if (!f) { console.log('?', b.key, id, 'no model'); continue; }
    const top = f.H + f.hover, roof = r.roof, gap = roof - top;
    const over = f.half - radius(f, true);
    const flag = gap < 0.5 ? 'ROOF' : '';
    if (flag) bad++;
    console.log(`${flag.padEnd(5)}${(d?.key || '').padEnd(18)}${b.key.padEnd(16)}${id.padEnd(20)}H ${f.H.toFixed(1)} up ${f.hover.toFixed(1)} roof ${roof} gap ${gap.toFixed(1)}  half ${f.half.toFixed(2)} long ${f.long.toFixed(2)} r ${radius(f, true).toFixed(2)} over ${over.toFixed(2)}`);
  }
}
console.log(bad ? `${bad} bosses too tall for their rooms` : 'every boss stands under its roof');
