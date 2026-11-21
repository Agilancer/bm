// node tools/paths/_walk.mjs x y z dx dz secs [speed]: the trips.mjs body walked straight that way, every tick printed
import fs from 'node:fs';
import { World } from '../../src/sim/world.js';
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
world.setPhobosDoors(new Set(world.phDoors.keys()));
let [x, y, z, mx, mz, secs, sp = 6.2] = process.argv.slice(2).map(Number);
const L = Math.hypot(mx, mz); mx /= L; mz /= L;
let vy = 0; const DT = 1 / 30, tmp = [0, 0, 0];
for (let t = 0; t < secs; t += DT) {
  const y0 = y;
  x += mx * sp * DT; z += mz * sp * DT; vy -= 12 * DT; y += vy * DT;
  tmp[0] = x; tmp[2] = z; world.resolve(tmp, 0.36, Math.max(y0, y) + 0.2, true); x = tmp[0]; z = tmp[2];
  const g = Math.max(world.heightFor(x, z, y), world.topUnder(x, z, vy > 0 ? y : Math.max(y0, y) + 0.2));
  if (y <= g) { y = g; vy = 0; }
  console.log(t.toFixed(2), x.toFixed(2), y.toFixed(2), z.toFixed(2));
}
