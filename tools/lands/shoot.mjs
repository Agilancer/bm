// Real frames of the land past the town, for review: the game in a real Chrome on the real GPU, its window parked off screen.
// Needs the server (python tools/serve.py 8481) and Playwright (npm install -g playwright).
//
//   node tools/lands/shoot.mjs steps.json [port]
//
// steps.json: a list of { "eval": "page code" } | { "wait": ms } | { "shot": "name" } | { "log": "page code" }.
// Shots go to tools/build/shots/heroes/<name>.png.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const port = process.argv[3] || '8481';
const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'build', 'shots', 'lands');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-lands-'));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome', headless: false, viewport: { width: 1280, height: 720 },
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--window-position=-3000,0'],
});
const page = ctx.pages()[0] || await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?auto&noopening`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 240000, polling: 1000 });
for (const s of steps) {
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.eval) await page.evaluate(`(async () => { ${s.eval} })()`);
  if (s.log) console.log(JSON.stringify(await page.evaluate(`(async () => { ${s.log} })()`)));
  if (s.shot) { await page.screenshot({ path: path.join(out, `${s.shot}.png`) }); console.log('shot', s.shot); }
}
await ctx.close();
