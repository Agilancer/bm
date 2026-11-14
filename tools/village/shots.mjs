// The town's houses photographed in the game itself, for looking them over after a build: each one from the front and the
// back, the camera kept out of the other houses. Works on a machine with no GPU (a software one, in a real Chromium window on a
// virtual screen):
//
//   python tools/serve.py 8402 --no-open &
//   xvfb-run -a -s "-screen 0 1600x1000x24" node tools/village/shots.mjs [houses=all, as 1,2,5] [views=f,b] [gfx=mobile]
//
// Shots go to tools/build/shots/house_NN<view>.png. views: f front, b back, g and c the same from the other side, t from above.
// gfx: mobile (about half a minute a shot on four cores) or auto (a PC's graphics: two minutes or more a shot).
// A camera of your own: CAM="name:ex,ey,ez,tx,ty,tz[,hour] ..." (the eye, what it looks at, the hour of the day) instead of houses.
//
// What it took, for the next machine like this one. The headless shell can't make the canvas's swap chain ("Could not find
// SharedImageBackingFactory", then the device is lost), so it's a window (headless: false) on Xvfb, with Vulkan on; and the GPU
// watchdog is off, since a software GPU's frame takes seconds and the watchdog kills the GPU's process for it. The page's own
// bm.shot() takes the picture: Playwright's screenshot times out waiting on frames that slow.
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../../', import.meta.url);
const v = JSON.parse(fs.readFileSync(new URL('assets/game/village.json', root)));
const [only, views = 'f,b', gfx = 'mobile'] = process.argv.slice(2);
const port = process.env.PORT || '8402';

function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez;
  const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx;
  const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: -rz * fy, uy: rz * fx - rx * fz, uz: rx * fy };
}
// Is (x, z) in a house, or within 1.5 m of one?
const inHouse = (x, z) => v.footprints.some((c) => {
  const co = Math.cos(c.yaw), si = Math.sin(c.yaw), dx = x - c.x, dz = z - c.z;
  return Math.abs(dx * co - dz * si) < c.hx + 1.5 && Math.abs(dx * si + dz * co) < c.hz + 1.5;
});

const shots = [];   // [name, camera, hour]
if (process.env.CAM) {
  for (const a of process.env.CAM.split(/\s+/).filter(Boolean)) {
    const [name, rest] = a.split(':'), [ex, ey, ez, tx, ty, tz, hour = 11] = rest.split(',').map(Number);
    shots.push([name, cam(ex, ey, ez, tx, ty, tz), hour]);
  }
} else {
  const pick = only && only !== 'all' ? only.split(',').map(Number) : null;
  v.homes.forEach((h, i) => {
    if (pick && !pick.includes(i + 1)) return;
    const [mx, mz] = h.mid, size = Math.max(h.w, h.d) * h.k;
    for (const vw of views.split(',')) {
      const base = h.yaw + { f: 0.6, b: Math.PI + 0.6, g: -0.6, c: Math.PI - 0.6, t: 0.3 }[vw];
      const dist = vw === 't' ? size * 0.9 : size * 1.25 + 4, ey = vw === 't' ? 16 : 4.2;
      // Round a little, or nearer or further, till the eye's out of every other house and nothing stands between.
      let a = base, d = dist;
      search: for (const sc of [1, 0.85, 1.2, 0.7]) {
        for (const off of [0, -0.25, 0.25, -0.5, 0.5, -0.8, 0.8]) {
          const x = mx + Math.sin(base + off) * dist * sc, z = mz + Math.cos(base + off) * dist * sc;
          let ok = !inHouse(x, z);
          for (let t = 0.15; t < 0.6 && ok; t += 0.1) ok = !inHouse(x + (mx - x) * t, z + (mz - z) * t) || Math.hypot(mx - x, mz - z) * (1 - t) < size * 0.75;
          if (ok) { a = base + off; d = dist * sc; break search; }
        }
      }
      shots.push([`house_${String(i + 1).padStart(2, '0')}${vw}`, cam(mx + Math.sin(a) * d, ey, mz + Math.cos(a) * d, mx, 3.6, mz), vw === 'b' || vw === 'c' ? 14 : 11]);
    }
  });
}

const browser = await chromium.launch({ channel: 'chromium', headless: false, args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-gpu-watchdog'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
if (gfx !== 'auto') await page.addInitScript((g) => { try { localStorage.setItem('velscour.settings', JSON.stringify({ gfx: g, keep: 'no' })); } catch { /* no storage */ } }, gfx);
page.on('console', (m) => { if (m.type() === 'error' && !/404|preload/.test(m.text())) console.log('page:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${port}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { polling: 1000 });
await page.evaluate(() => { bm.fixScale(1); bm.renderer.hideVM = true; });
await page.waitForTimeout(3000);
// (WARM=seconds lets the game run that long first, at the hour of the first shot: for the town to get to its work.)
// (RUN=seconds runs the town on by that many seconds at once before each place's pictures: bm.townRun.)
if (process.env.WARM && shots.length) { await page.evaluate(([cm, h]) => { bm.setTime(h); bm.setCam(cm); }, [shots[0][1], shots[0][2]]); await page.waitForTimeout(+process.env.WARM * 1000); }
// (FRAMES=n takes n pictures at each place, one after another, as name_0, name_1...: something moving, as far as a
// software GPU's frames show it.)
const frames = +(process.env.FRAMES || 1);
for (const [name, c, hour] of shots) {
  await page.evaluate(([cm, h]) => { bm.setTime(h); bm.setCam(cm); }, [c, hour]);
  if (process.env.RUN) await page.evaluate((s) => bm.townRun(s), +process.env.RUN);
  await page.waitForTimeout(1500);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((n) => bm.shot(n), frames > 1 ? `${name}_${f}` : name);
    if (frames > 1) await page.waitForTimeout(+(process.env.GAP || 250));
  }
  console.log('shot', name);
}
await browser.close();
