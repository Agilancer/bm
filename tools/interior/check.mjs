// Can you walk it? From the village green, through the great door, the office and down the stair, to everywhere a zombie stands,
// with the same grid and the same collision the game uses.  node tools/interior/check.mjs
import { readFileSync } from 'node:fs';
import { World } from '../../src/sim/world.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../../assets/game/${p}`, import.meta.url)));
const inter = json('interior/interior.json');
const w = new World(json('village.json'), inter);
const t0 = performance.now();
w.updateField(40, 0, 0);
console.log('field', (performance.now() - t0).toFixed(1), 'ms from the green, reach 150 m');

// Walk a capsule down a chain of waypoints, steering by the flow field to each, and see it arrive.
const walk = (from, to, maxT = 200) => {
  const pos = [from[0], 0, from[1]], flow = new Float32Array(3);
  w.updateField(to[0], to[1], 0, 1);
  let y = w.height(pos[0], pos[2]);
  let lastY = y, worstStep = 0;
  for (let t = 0; t < maxT; t += 1 / 30) {
    w.flow(flow, pos[0], pos[2], to[0], to[1], 1);
    pos[0] += flow[0] * 4 / 30; pos[2] += flow[1] * 4 / 30;
    w.resolve(pos, 0.36, y + 0.2);
    y = w.height(pos[0], pos[2]);
    worstStep = Math.max(worstStep, Math.abs(y - lastY)); lastY = y;
    if (Math.hypot(pos[0] - to[0], pos[2] - to[1]) < 1.2) return { ok: true, t: +t.toFixed(1), y: +y.toFixed(2), worstStep: +worstStep.toFixed(2) };
  }
  return { ok: false, at: [+pos[0].toFixed(1), +y.toFixed(1), +pos[2].toFixed(1)] };
};
// (Over the gulf and on is the far side of a jump: nothing can walk there.)
const route = [[50, 0], [68, 0], [106, -8], [110, -9.5], [111.4, -11], [114.3, -11], [114.3, -4], [115, 0], [123, 0], [126, 0], [172, 0], [186, -8], [186, -53], [186, -68], [190, -72], [203, -86.6], [228, -86.6], [240, -86.6]];
let fails = 0;
for (let i = 0; i + 1 < route.length; i++) {
  const r = walk(route[i], route[i + 1]);
  if (!r.ok) fails++;
  console.log(route[i], '->', route[i + 1], JSON.stringify(r));
}
w.updateField(186, -5, 0, 2);
const f = w.slots.get(2).field;
let lost = 0;
for (const s of inter.spawns.filter((p) => p.z > -125)) {
  const i = ((s.x + 256) | 0), j = ((s.z + 256) | 0);
  if (f[j * 512 + i] > 1e8) { lost++; console.log('cut off:', s.x, s.z); }
}
console.log(inter.spawns.length, 'spawn points,', lost, 'unreachable within 150 m of the crypt.', fails, 'failed legs');
process.exit(fails || lost ? 1 : 0);
