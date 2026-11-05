// Can you walk it? In at each house's door, across to the foot of its stair, up, on into the rooms over, and back down again, by the way
// tools/interior/build_interior.py says each is laid out, with the same collision and the same floors the player gets.  node tools/interior/homes.mjs
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

const routes = inter.homes.filter((h) => h.route);
if (routes.length !== village.homes.length) { fails++; console.log('homes', village.homes.length, 'walked', routes.length); }
village.homes.forEach((h, i) => {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  const tr = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
  const hd = h.d / 2, iz = hd - 0.12;
  const start = tr(h.door, hd + 1.2), inside = tr(h.door, iz - 0.4), route = routes[i].route, foot = routes[i].stair;
  const to = (b, p) => walk(b, p[0], p[1], (x, z) => [x, z]);
  const b = { x: start[0], y: w.height(start[0], start[1]), z: start[1] };
  console.log(`house at ${h.x}, ${h.z}`);
  say('in at the door', to(b, inside), b);
  route.forEach((p, k) => {
    say(k === foot ? 'foot of the stair' : k === foot + 1 ? 'head of the stair' : k < foot ? 'across the floor' : 'upstairs', to(b, p), b);
    if (k === foot + 1 && b.y < 2.8) { fails++; console.log('  never got upstairs', b.y); }
  });
  for (const k of route.keys()) say('and back', to(b, route[route.length - 1 - k]), b);
  if (b.y > 0.5) { fails++; console.log('  still up at', b.y); }
  say('back out', to(b, inside) && to(b, start), b);
});
console.log(fails, 'failed');
process.exit(fails ? 1 : 0);
