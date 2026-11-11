// node views.mjs name:ex,ey,ez:tx,ty,tz[:hour] ...   (ey/ty: metres over the land when prefixed with +, else absolute)
// Teleports the player to the eye, sets the camera, and saves tools/build/shots/<name>.png through bm.shot.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const { terrainHeight } = await import(path.join(ROOT, 'src/core/terrain.js'));
function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, ry = 0, rz = fx; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; rz /= rl;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}
const Yof = (s, x, z) => (s.startsWith('+') ? terrainHeight(x, z) + +s.slice(1) : +s);
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await b.newPage({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 600) } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('preload')) console.log('err', t.slice(0, 400)); });
const t0 = Date.now();
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
console.log('up in', (Date.now() - t0) / 1000);
await page.evaluate(`bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; ${process.env.PRE || ''}`);
for (const a of process.argv.slice(2)) {
  const [name, e, t, hour] = a.split(':');
  const [ex, eys, ez] = e.split(','), [tx, tys, tz] = t.split(',');
  const c = cam(+ex, Yof(eys, +ex, +ez), +ez, +tx, Yof(tys, +tx, +tz), +tz);
  try {
    await page.evaluate(`bm.cmd(19, 0, ${+ex}, ${+ez}); bm.setTime(${hour || 11}); bm.setCam(${JSON.stringify(c)});`);
    await page.waitForTimeout(+(process.env.SETTLE || 6000));
    await Promise.race([page.evaluate(`bm.shot(${JSON.stringify(name)})`), new Promise((_, r) => setTimeout(() => r(new Error('shot timed out')), 120000))]);
    console.log('shot', name);
  } catch (err) { console.log('FAILED', name, String(err).slice(0, 300)); }
}
await b.close();
