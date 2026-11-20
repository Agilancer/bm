// How far each of the sixteen rock meshes (src/gfx/rocks.js) reaches out across the ground in each of 16 directions, at size 1:
// the table src/core/rocks.js REACH keeps, so a boulder can be kept off a road by what it really covers, not its middle.
// node tools/world/rock-reach.mjs  (prints the table to paste)
import { icosphere, shapeOf } from '../../src/gfx/rocks.js';

const DIRS = 16, sphere = icosphere(3);
const rows = [];
for (let k = 0; k < 16; k++) {
  const shape = shapeOf(k);
  // (Only what stands above the instance's foot: the rest is in the ground.)
  const P = sphere.v.map((v) => shape(v).p).filter((p) => p[1] > 0);
  const row = [];
  for (let d = 0; d < DIRS; d++) {
    const a = d / DIRS * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    let m = 0;
    for (const p of P) m = Math.max(m, p[0] * c + p[2] * s);
    row.push(+m.toFixed(2));
  }
  rows.push(row);
}
console.log('export const REACH = [\n' + rows.map((r) => '  [' + r.join(', ') + '],').join('\n') + '\n];');
