// Real frames of the roads, for review: the game in a real Chrome on the real GPU, its window parked off screen.
// Needs the server (python tools/serve.py 8620) and Playwright (npm install -g playwright).
//
//   node tools/roads/shoot.mjs views.json [port] [outdir]
//
// views.json: a list of
//   { "name": "x", "at": [x, z], "eye": [dx, up, dz], "look": [dx, up, dz], "fov": 60, "hour": 12 }   a view near (x, z): the eye
//        and what it looks at are offsets from there, their heights over the ground under each
//   { "name": "x", "map": [x, z], "span": 800 }   the big map, framed on (x, z), so many metres across
//   { "name": "x", "mini": [x, z], "yaw": 0 }     the corner map, standing at (x, z)
//   { "eval": "page code" } | { "wait": ms }
// Shots go to outdir (tools/build/shots/roads by default).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const views = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const port = process.argv[3] || '8620';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const out = process.argv[4] || path.join(here, '..', 'build', 'shots', 'roads');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-roads-'));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome', headless: false, viewport: { width: 1280, height: 720 },
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--window-position=-3000,0'],
});
const page = ctx.pages()[0] || await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?auto&noopening${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 240000, polling: 1000 });
await page.waitForTimeout(3000);
await page.evaluate(`(async () => { window.__T = await import('/src/core/terrain.js'); })()`);
for (const v of views) {
  if (v.wait) await page.waitForTimeout(v.wait);
  if (v.eval) console.log(JSON.stringify(await page.evaluate(`(async () => { ${v.eval} })()`)));
  if (v.at) {
    const [x, z] = v.at, e = v.eye || [0, 40, 60], l = v.look || [0, 0, 0];
    await page.evaluate(([x, z]) => bm.cmd(19, 0, x, z), [x, z]);
    await page.waitForTimeout(v.settle ?? 4500);
    await page.evaluate(({ x, z, e, l, fov, hour }) => {
      const h = __T.terrainHeight;
      const ex = x + e[0], ez = z + e[2], ey = h(ex, ez) + e[1];
      const lx = x + l[0], lz = z + l[2], ly = h(lx, lz) + l[1];
      let fx = lx - ex, fy = ly - ey, fz = lz - ez; const n = Math.hypot(fx, fy, fz); fx /= n; fy /= n; fz /= n;
      // up: world up made square to the way it looks
      let ux = -fx * fy, uy = 1 - fy * fy, uz = -fz * fy; const m = Math.hypot(ux, uy, uz); ux /= m; uy /= m; uz /= m;
      bm.setTime(hour ?? 12);
      bm.renderer.hideVM = true;
      bm.setCam({ x: ex, y: ey, z: ez, fx, fy, fz, ux, uy, uz, fov: (fov || 60) * Math.PI / 180 });
    }, { x, z, e, l, fov: v.fov, hour: v.hour });
    await page.waitForTimeout(v.hold ?? 2500);
    await page.screenshot({ path: path.join(out, `${v.name}.png`) });
    await page.evaluate(() => bm.setCam(null));
    console.log('shot', v.name);
  }
  if (v.map) {
    const [x, z] = v.map;
    await page.evaluate(([x, z]) => bm.cmd(19, 0, x, z), [x, z]);
    await page.waitForTimeout(1500);
    await page.evaluate(({ x, z, span, see }) => {
      const m = bm.view.worldMap;
      if (see) for (let i = 0; i < 64; i++) m.see?.(x + ((i % 8) - 3.5) * span / 8, z + (Math.floor(i / 8) - 3.5) * span / 8, span / 6);
      if (!m.open) m.toggle ? m.toggle() : null;
      m.spanOut = span; m.follow = false; m.cx = x; m.cz = z; m.redraw();
    }, { x, z, span: v.span || 800, see: v.see !== false });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `${v.name}.png`) });
    await page.evaluate(() => { const m = bm.view.worldMap; if (m.open && m.toggle) m.toggle(); if (m.open && m.close) m.close(); });
    console.log('shot', v.name);
  }
}
await ctx.close();
