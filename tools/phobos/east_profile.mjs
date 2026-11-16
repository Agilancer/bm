// The east's ground, to look at: node tools/phobos/east_profile.mjs [grid.bin]
// Prints the height along the Throne Road and across the ridge; with a path, writes a grid of heights (Float32, 16 m cells,
// x 5000..11800, z -5696..5696) for tools/phobos/east_map.py to draw.
import { writeFileSync } from 'node:fs';
globalThis.__bmNoWays = true;
const { terrainHeight } = await import('../../src/core/terrain.js');
const { ROUTES, SITES, countryAt } = await import('../../src/core/lands.js');
const road = ROUTES.find((r) => r.name === 'the Throne Road');
let s = 0, worst = 0;
for (let i = 0; i + 1 < road.pts.length; i++) {
  const [ax, az] = road.pts[i], [bx, bz] = road.pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 10);
  let line = '';
  for (let k = 0; k < n; k++) {
    const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, h = terrainHeight(x, z), h2 = terrainHeight(ax + (bx - ax) * (k + 1) / n, az + (bz - az) * (k + 1) / n);
    worst = Math.max(worst, Math.abs(h2 - h) / (L / n));
    if (k % Math.max(1, Math.round(n / 6)) === 0) line += ` ${h.toFixed(0)}`;
  }
  console.log(`${String(ax).padStart(5)},${String(az).padStart(5)} -> ${bx},${bz}:${line}`);
  s += L;
}
console.log('Throne Road', s.toFixed(0), 'm; steepest 10 m step', worst.toFixed(2));
for (const z of [0, -1500, 2500]) { let l = `z ${z}:`; for (let x = 5000; x <= 11800; x += 200) l += ` ${terrainHeight(x, z).toFixed(0)}`; console.log(l); }
for (const k of ['greywarden', 'lantern', 'gatewatch', 'needle', 'marshal', 'notch', 'span', 'sill']) console.log(k, terrainHeight(SITES[k].x, SITES[k].z).toFixed(1), countryAt(SITES[k].x, SITES[k].z));
if (process.argv[2]) {
  const X0 = 5000, X1 = 11800, Z0 = -5696, Z1 = 5696, C = 16, W = (X1 - X0) / C, H = (Z1 - Z0) / C, g = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) g[j * W + i] = terrainHeight(X0 + (i + 0.5) * C, Z0 + (j + 0.5) * C);
  writeFileSync(process.argv[2], Buffer.from(g.buffer));
  console.log('grid', W, H);
}
