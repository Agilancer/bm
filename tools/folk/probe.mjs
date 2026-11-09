// What's round a point on the folk's ground: colliders, the free grid, the house. node tools/folk/probe.mjs x z [level]
import { readFileSync } from 'node:fs';
import { Ground } from '../../src/folk/ground.js';
const J = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const G = new Ground(J('assets/game/village.json'), J('assets/game/interior/interior.json'), [-80, -75, 110, 80]);
const [x, z, level = 0] = process.argv.slice(2).map(Number);
console.log('house', G.houseAt(x, z), 'part', G.part(level, x, z), 'free', G.free(level, x, z));
for (let zz = z + 2; zz >= z - 2; zz -= 0.5) {
  let row = '';
  for (let xx = x - 3; xx <= x + 3; xx += 0.5) row += Math.abs(xx - x) < 0.01 && Math.abs(zz - z) < 0.01 ? '@' : G.free(level, xx, zz) ? (G.part(level, xx, zz) === G.part(level, x, z) ? '.' : 'o') : '#';
  console.log(zz.toFixed(1).padStart(6), row);
}
for (const c of G.colliders || []) if (Math.abs(c.x - x) < (c.hx || c.r || 0) + 2 && Math.abs(c.z - z) < (c.hz || c.r || 0) + 2) console.log(JSON.stringify(c));
