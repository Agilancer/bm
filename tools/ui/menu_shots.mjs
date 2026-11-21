// Pictures of the menus (pause, save and load, settings, how to play, the quest log), for review: the game in a real
// Chrome on the real GPU, its window parked off screen. Needs the server (python tools/serve.py 8905) and Playwright
// (npm install -g playwright).
//
//   node tools/ui/menu_shots.mjs steps.json [port] [width] [height] [query]
//
// steps.json: a list of { "eval": "page code" } | { "wait": ms } | { "shot": "name" } | { "log": "page code" }
// | { "key": "Escape" } | { "click": "css selector" } | { "hover": "css selector" } | { "touch": true } (before the page loads:
// a phone's touch screen) | { "tap" | "down" | "drag": [x, y] or "css selector" } | { "up": true } (a thumb, on a touch
// screen). Shots go to tools/build/shots/menus/<name>.png.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const port = process.argv[3] || '8905', W = +(process.argv[4] || 1280), H = +(process.argv[5] || 720), extra = process.argv[6] || '';
const touch = steps.some((s) => s.touch);
const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'build', 'shots', 'menus');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-menus-'));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome', headless: false, viewport: { width: W, height: H }, hasTouch: touch, isMobile: false,
  deviceScaleFactor: touch ? 2 : 1,
  userAgent: touch ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--window-position=-3000,0'],
});
const page = ctx.pages()[0] || await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
page.on('console', (m) => { if (m.type() === 'error') console.log(m.type(), m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?auto&noopening${extra}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 240000, polling: 1000 });
// A thumb, through Chrome's own touch input (as a phone's would come): { "tap": [x, y] } down and up; { "down": [x, y] },
// { "drag": [x, y] } (in short steps from where it is), { "up": true }. [x, y] a point, or a css selector's middle.
const cdp = touch ? await ctx.newCDPSession(page) : null;
let thumb = null;
const at = async (p) => {
  if (Array.isArray(p)) return { x: p[0], y: p[1] };
  const r = await page.evaluate((sel) => { const q = document.querySelector(sel)?.getBoundingClientRect(); return q && { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, p);
  if (!r) throw new Error(`nothing at ${p}`);
  return r;
};
const touchAt = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
for (const s of steps) {
  if (s.tap) { const p = await at(s.tap); await touchAt('touchStart', p); await page.waitForTimeout(70); await touchAt('touchEnd'); }
  if (s.down) { thumb = await at(s.down); await touchAt('touchStart', thumb); }
  if (s.drag) {
    const to = await at(s.drag), from = thumb;
    for (let i = 1; i <= 10; i++) { thumb = { x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 }; await touchAt('touchMove', thumb); await page.waitForTimeout(30); }
  }
  if (s.up) { await touchAt('touchEnd'); thumb = null; }
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.eval) await page.evaluate(`(async () => { ${s.eval} })()`);
  if (s.key) await page.keyboard.press(s.key);
  if (s.click) await page.click(s.click);
  if (s.hover) await page.hover(s.hover);
  if (s.log) console.log(JSON.stringify(await page.evaluate(`(async () => { ${s.log} })()`)));
  if (s.shot) { await page.screenshot({ path: path.join(out, `${s.shot}.png`) }); console.log('shot', s.shot); }
}
await ctx.close();
