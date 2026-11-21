import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const tmp = [0, 0, 0]; let s = 0;
for (const [name, f] of [['heightFor', (x, z) => world.heightFor(x, z, 50)], ['landAt', (x, z) => world.landAt(x, z)], ['platformAt', (x, z) => world.platformAt(x, z, 50)], ['resolve', (x, z) => { tmp[0] = x; tmp[2] = z; world.resolve(tmp, 0.4, 20, true); return tmp[0]; }], ['topUnder', (x, z) => world.topUnder(x, z, 30)]]) {
  const t = performance.now();
  for (let i = 0; i < 100000; i++) { const x = 9600 + (i % 500) * 0.5, z = -200 + Math.floor(i / 500) * 0.5; s += f(x, z) || 0; }
  console.log(name, ((performance.now() - t) / 100).toFixed(2), 'us');
}
let mx = 0, tot = 0, n = 0; for (const l of world.siteBoxes.values()) { mx = Math.max(mx, l.length); tot += l.length; n++; }
console.log('site cells', n, 'avg', (tot / n).toFixed(1), 'max', mx);
const l = world.sitesNear(9700, -100); console.log('at 9700,-100', l?.length, 'noT', l?.filter(c=>c.t===undefined).length);
