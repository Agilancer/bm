// node views.mjs name:ex,ey,ez:tx,ty,tz[:hour[:px,pz]] ...   (px,pz: where the player's put, when not at the eye: what
// lives there comes for the player, so the eye can stand off and watch)
//   (ey/ty: metres over the land when prefixed with +, else absolute)
//   AIM=<metres>: once settled, the eye is moved to stand that far from the nearest Tripo monster that's drawn, at its
//   shoulder's height, looking at it (monsters walk; this finds them).
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
page.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || (process.env.WARN && m.type() === 'warning')) && !t.includes('preload')) console.log(m.type() === 'error' ? 'err' : 'warn', t.slice(0, 400)); });
const t0 = Date.now();
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
console.log('up in', (Date.now() - t0) / 1000);
await page.evaluate(`bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; ${process.env.PRE || ''}`);
for (const a of process.argv.slice(2)) {
  const [name, e, t, hour, at] = a.split(':');
  const [ex, eys, ez] = e.split(','), [tx, tys, tz] = t.split(',');
  const c = cam(+ex, Yof(eys, +ex, +ez), +ez, +tx, Yof(tys, +tx, +tz), +tz);
  try {
    const [px, pz] = at ? at.split(',') : [ex, ez];
    await page.evaluate(`bm.cmd(19, 0, ${+px}, ${+pz}); bm.setTime(${hour || 11}); bm.setCam(${JSON.stringify(c)});`);
    await page.waitForTimeout(+(process.env.SETTLE || 6000));
    // AIMID=<roster id>: the eye is put before that monster's face (its own yaw), AIMD metres off (default 2.4), at its head.
    if (process.env.AIMID) {
      const r = await page.evaluate(`(async () => { const L = await import('/src/core/layout.js'); const t = bm.renderer.tripo, r = bm.renderer, s = bm.snap();
        for (let i = 0; i < t.count; i++) { const c = r.chars[t.first + i]; if (!t.want[i] || c.pending) continue; if (t.ids[(+t.want[i].split(':')[0]) - 1] !== ${JSON.stringify(process.env.AIMID)}) continue;
          const o = L.CHARS_START + (t.first + i) * L.C_SIZE; return { x: s[o + L.C.X], y: s[o + L.C.Y], z: s[o + L.C.Z], yaw: s[o + L.C.YAW], h: t.roster[${JSON.stringify(process.env.AIMID)}].height }; }
        return null; })()`);
      if (r) {
        const D = +(process.env.AIMD || 2.4), hy = r.y + r.h * 0.9;
        const c2 = cam(r.x + Math.sin(r.yaw) * D, hy + 0.1, r.z + Math.cos(r.yaw) * D, r.x, hy, r.z);
        await page.evaluate(`bm.setCam(${JSON.stringify(c2)})`);
        await page.waitForTimeout(1200);
        console.log('face of', process.env.AIMID, JSON.stringify(r));
      } else console.log('no', process.env.AIMID, 'drawn');
    }
    if (process.env.AIM) {
      const r = await page.evaluate(`(() => { const t = bm.renderer.tripo, r = bm.renderer; let best = null;
        for (let i = 0; i < t.count; i++) { const c = r.chars[t.first + i]; if (!t.want[i] || c.pending || !Number.isFinite(c.bx)) continue; const d = Math.hypot(c.bx - ${c.x}, c.bz - ${c.z}); if (!best || d < best.d) best = { d, x: c.bx, y: c.by, z: c.bz }; }
        return best; })()`);
      if (r) {
        const L = Math.hypot(r.x - c.x, r.z - c.z) || 1, A = +process.env.AIM;
        const c2 = cam(r.x - (r.x - c.x) / L * A, r.y + 0.75, r.z - (r.z - c.z) / L * A, r.x, r.y + 0.55, r.z);
        await page.evaluate(`bm.setCam(${JSON.stringify(c2)})`);
        await page.waitForTimeout(1500);
        console.log('aimed at', JSON.stringify(r));
      } else console.log('nothing to aim at');
    }
    await Promise.race([page.evaluate(`bm.shot(${JSON.stringify(name)})`), new Promise((_, r) => setTimeout(() => r(new Error('shot timed out')), 120000))]);
    console.log('shot', name);
  } catch (err) { console.log('FAILED', name, String(err).slice(0, 300)); }
}
// LOG: page code whose value is printed at the end (e.g. LOG='return bm.warrensState()').
if (process.env.LOG) console.log('log', JSON.stringify(await page.evaluate(`(async () => { ${process.env.LOG} })()`)));
await b.close();
