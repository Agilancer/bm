// What stands at (x, z): node tools/paths/_what.mjs x z
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const [x, z] = process.argv.slice(2).map(Number);
for (const p of world.platGrid.get((Math.floor(x / 64) + 4096) * 8192 + Math.floor(z / 64) + 4096) || []) {
  if (Math.abs(x - p.x) > p.r || Math.abs(z - p.z) > p.r) continue;
  p.rects.forEach((f, i) => { const dx = x - f.x, dz = z - f.z; if (Math.abs(dx * f.c - dz * f.s) <= f.hu && Math.abs(dx * f.s + dz * f.c) <= f.hw) console.log('floor', p.over ? 'over' : p.stack ? 'stack' : 'plain', 'y', f.y.toFixed(2), 'rect', i, 'of', p.rects.length, 'at', f.x.toFixed(1), f.z.toFixed(1), 'hu', f.hu.toFixed(2), 'hw', f.hw.toFixed(2)); });
}
for (const c of world.sitesNear(x, z) || []) { const dx = x - c.x, dz = z - c.z; if (Math.abs(dx * c.co - dz * c.s) <= c.hx + 0.4 && Math.abs(dx * c.s + dz * c.co) <= c.hz + 0.4) console.log('box top', world.boxTop(c).toFixed(2), 'b', c.b, 'at', c.x.toFixed(1), c.z.toFixed(1), 'hx', c.hx.toFixed(2), 'hz', c.hz.toFixed(2), 'yaw', c.yaw.toFixed(2), c.phDoor !== undefined ? 'door ' + c.phDoor : ''); }
console.log('land', world.landAt(x, z).toFixed(2), 'height()', world.height(x, z).toFixed(2));
