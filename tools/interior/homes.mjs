// Can you walk it? In at each house's door, across to the foot of its stair, up, round the landing, and back down again, with the
// same collision and the same floors the player gets.  node tools/interior/homes.mjs
import { readFileSync } from 'node:fs';
import { World } from '../../src/sim/world.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../../assets/game/${p}`, import.meta.url)));
const inter = json('interior/interior.json'), village = json('village.json');
const w = new World(village, inter);

// Straight at a point, as a player walks, at 4 m/s and with gravity. Null if it never gets there.
const walk = (b, lx, lz, tr) => {
  const to = tr(lx, lz);
  const pos = [b.x, 0, b.z];
  for (let t = 0; t < 12; t += 1 / 60) {
    const dx = to[0] - pos[0], dz = to[1] - pos[2], L = Math.hypot(dx, dz);
    if (L < 0.25) { b.x = pos[0]; b.z = pos[2]; return true; }
    pos[0] += dx / L * 4 / 60; pos[2] += dz / L * 4 / 60;
    w.resolve(pos, 0.36, b.y + 0.2);
    const g = w.heightFor(pos[0], pos[2], b.y);
    b.y = b.y <= g ? g : Math.max(g, b.y - 4 / 60);
    b.x = pos[0]; b.z = pos[2];
  }
  return false;
};

let fails = 0;
const say = (name, ok, b) => { if (!ok) fails++; console.log(`  ${name}: ${ok ? 'ok' : 'STUCK'} at (${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})`); };

for (const h of village.homes) {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  const tr = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
  const hd = h.d / 2, ix = h.w / 2 - 0.12, iz = hd - 0.12, side = h.chimney[0] < 0 ? 1 : -1;
  const hi = side * (ix - 1.1), lo = side * (ix - 1.1 - 4.2), zs = -iz + 0.6;
  const start = tr(h.door, hd + 1.2);
  const b = { x: start[0], y: w.height(start[0], start[1]), z: start[1] };
  console.log(`house at ${h.x}, ${h.z}`);
  say('out front', true, b);
  say('in at the door', walk(b, h.door, iz - 0.4, tr), b);
  say('middle of the floor', walk(b, lo - side * 0.5, -iz + 2.0, tr), b);
  say('foot of the stair', walk(b, lo - side * 0.5, zs, tr), b);
  say('up it', walk(b, hi + side * 0.6, zs, tr), b);
  const up = b.y;
  say('along the landing', walk(b, hi + side * 0.6, -iz + 1.9, tr), b);
  say('over the room', walk(b, 0, -iz + 1.9, tr), b);
  if (up < 3) { fails++; console.log('  never got upstairs', up); }
  say('back to the landing', walk(b, hi + side * 0.6, -iz + 1.9, tr), b);
  say('to the head of the stair', walk(b, hi + side * 0.6, zs, tr), b);
  say('down it', walk(b, lo - side * 0.5, zs, tr), b);
  if (b.y > 0.5) { fails++; console.log('  still up at', b.y); }
  say('back out', walk(b, h.door, iz - 0.4, tr) && walk(b, h.door, hd + 1.2, tr), b);
}
console.log(fails, 'failed');
process.exit(fails ? 1 : 0);
