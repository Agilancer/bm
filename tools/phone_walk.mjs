// How the game runs at a phone's screen and on a phone's settings (the page told it's a phone: its user agent, a touch
// screen, 915 x 412), on this machine's own GPU: frame times stood still at a spread of places, and the stalls while moving
// through Phobos (its near cells streaming in, src/gfx/phobos-near.js). It says nothing of any one phone's speed: it is for
// before and after, and for finding what stalls.
//   node tools/phone_walk.mjs [port 8481]      PC=1: a desk's screen and settings instead
// Needs the server (python tools/serve.py <port> --no-open) and Playwright's Chromium.
import { createRequire } from 'node:module';
import { terrainHeight } from '../src/core/terrain.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const port = process.argv[2] || 8481, PC = !!process.env.PC;
const WIN = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-features=Vulkan,WebGPU', '--disable-dawn-features=use_dxc'];
const b = await chromium.launch({ args: process.platform === 'win32' ? WIN : ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const ctx = await b.newContext(PC ? { viewport: { width: 1600, height: 900 } } : { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 300)));
await page.goto(`http://localhost:${port}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 600000, polling: 1000 });
await page.evaluate('bm.view.lands.cheats.noDamage = true; if (bm.view.questTrail) bm.view.questTrail.off = true;');
console.log(PC ? 'a desk' : 'a phone', JSON.stringify(await page.evaluate('({ tier: bm.view.renderer.tier?.name || bm.view.renderer.tier, lean: !!bm.view.renderer.tier?.lean, scale: bm.view.renderer.scale, w: bm.view.renderer.canvas?.width, h: bm.view.renderer.canvas?.height })')));

// Frame times over so many seconds, measured in the page: mean, the 95th in a hundred, the worst, how many over 50 ms.
const frames = (secs) => page.evaluate((secs) => new Promise((res) => {
  const d = []; let last = performance.now(); const t0 = last;
  const f = (t) => { d.push(t - last); last = t; if (t - t0 < secs * 1000) requestAnimationFrame(f); else { d.shift(); d.sort((p, q) => p - q); res({ n: d.length, mean: +(d.reduce((s, v) => s + v, 0) / d.length).toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), worst: +d.at(-1).toFixed(1), over50: d.filter((v) => v > 50).length }); } };
  requestAnimationFrame(f);
}), secs);
const look = (x, z, tx, tz, up = 2) => { const y = terrainHeight(x, z) + up, fx = tx - x, fz = tz - z, l = Math.hypot(fx, fz); return { x, y, z, fx: fx / l, fy: 0, fz: fz / l, ux: 0, uy: 1, uz: 0 }; };

// Stood still: [name, x, z, looking toward x, z].
const SPOTS = [
  ['Bellmourn, the well', 0, 20, 0, -40], ['the west road', -900, 0, -1400, 40], ['Phobos, the Drawbridge Gate', 9330, 0, 9600, 0], ['Phobos, the Rookeries', 9600, 270, 9640, 340],
  ["Phobos, the King's Mile", 9655, -30, 9830, -80], ['the castle yard', 10830, 0, 11215, 0], ['under the Keep, east', 11480, 40, 11215, 0],
];
for (const [name, x, z, tx, tz] of SPOTS) {
  await page.evaluate(`bm.cmd(19, 0, ${x}, ${z}); bm.setTime(15); bm.setCam(${JSON.stringify(look(x, z, tx, tz))});`);
  await page.waitForTimeout(9000);
  for (let k = 0; k < 30; k++) { if (!(await page.evaluate('(() => { const n = bm.view.renderer.phobosNear; return !!n && (!!n.asked || !!n.built); })()'))) break; await page.waitForTimeout(1000); }
  console.log(name.padEnd(30), JSON.stringify(await frames(6)), JSON.stringify(await page.evaluate('(() => { const r = bm.view.renderer, s = r.stats; return { land: s.staticTris * 3, eye: s.landDrawn, sh0: s.landShadow0, sh1: s.landShadow1 }; })()')));
}
// Moving: down the King's Mile from the gate to the Approach, 12 m a second, the camera with you: near cells come as you go.
{ const x0 = 9360, x1 = 10300, secs = (x1 - x0) / 12;
  await page.evaluate(`bm.cmd(19, 0, ${x0}, 0)`); await page.waitForTimeout(8000);
  const run = page.evaluate(({ x0, x1, secs }) => new Promise((res) => {
    const d = []; let last = performance.now(); const t0 = last;
    const f = (t) => { d.push(t - last); last = t; const k = Math.min(1, (t - t0) / (secs * 1000)), x = x0 + (x1 - x0) * k; bm.setCam({ x, y: window.__y(x), z: 0, fx: 1, fy: 0, fz: 0, ux: 0, uy: 1, uz: 0 }); if (k < 1) requestAnimationFrame(f); else { d.shift(); const s = d.slice().sort((p, q) => p - q); res({ n: d.length, mean: +(d.reduce((a, v) => a + v, 0) / d.length).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), worst: +s.at(-1).toFixed(1), over50: d.filter((v) => v > 50).length, over100: d.filter((v) => v > 100).length, cells: bm.view.renderer.phobosNear?.count }); } };
    requestAnimationFrame(f);
  }), { x0, x1, secs });
  // (The ground's height along the Mile, for the camera: sampled here and handed in.)
  const ys = []; for (let x = x0; x <= x1 + 1; x += 5) ys.push(terrainHeight(x, 0) + 6);
  await page.evaluate(({ ys, x0 }) => { window.__y = (x) => ys[Math.max(0, Math.min(ys.length - 1, Math.round((x - x0) / 5)))]; }, { ys, x0 });
  console.log("moving down the King's Mile".padEnd(30), JSON.stringify(await run));
}
await b.close();
