// The game kept on the device (coi-sw.js), checked for real: three starts in one fresh browser profile. The first
// downloads and keeps what it loads; the second downloads only files.json and the page's own first files (they came down
// before the worker was in charge, the first time); then src/title.js is touched, and the third downloads just that.
// Needs the server (python tools/serve.py, which makes files.json) and Playwright (npm install -g playwright).
//   node tools/keep_check.mjs [url]     (default http://localhost:8402/?auto=1&noopening&keep)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const url = process.argv[2] || 'http://localhost:8402/?auto=1&noopening&keep';
const browser = await chromium.launch({ headless: false, args: ['--enable-unsafe-webgpu', '--window-position=-3600,0', '--window-size=980,660'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
let net = [], fromSW = 0, errors = [];
ctx.on('requestfinished', async (r) => {
  const sw = !!r.serviceWorker();
  const res = await r.response().catch(() => null);
  if (sw) net.push([new URL(r.url()).pathname, Number(res?.headers()['content-length'] || 0)]);
  else if (res?.fromServiceWorker()) fromSW++;
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 160)));
async function start(tag) {
  net = []; fromSW = 0; errors = [];
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.bm && window.bm.snap && window.bm.snap(), null, { timeout: 180000, polling: 250 });
  const up = (Date.now() - t0) / 1000;
  await new Promise((r) => setTimeout(r, 4000));
  const st = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const keys = await (await caches.open('bm-files-v1')).keys();
    const est = await navigator.storage.estimate();
    return { isolated: crossOriginIsolated, controlled: !!navigator.serviceWorker.controller, sw: reg?.active?.scriptURL?.split('/').pop(), kept: keys.length, usageMB: Math.round(est.usage / 1e6), persisted: await navigator.storage.persisted() };
  });
  const bytes = net.reduce((a, [, b]) => a + b, 0);
  console.log(`${tag}: up in ${up.toFixed(1)} s; from the network via the worker ${net.length} files, ${(bytes / 1e6).toFixed(1)} MB; served from the store ${fromSW}; ` + JSON.stringify(st));
  if (net.length) { const by = {}; for (const [p] of net) { const d = p.split('/').slice(0, 4).join('/'); by[d] = (by[d] || 0) + 1; } console.log('   downloaded by folder:', JSON.stringify(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12))); console.log('   e.g.', net.slice(0, 6).map(([p]) => p).join(' ')); }
  if (errors.length) console.log('   errors:', errors.slice(0, 5).join(' | '));
}
await start('start 1 (fresh)');
await start('start 2 (kept)');
const f = ROOT + 'src/title.js', now = new Date();
fs.utimesSync(f, now, now);
await start('start 3 (title.js touched)');
await browser.close();
