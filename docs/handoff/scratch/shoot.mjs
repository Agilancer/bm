// node shoot.mjs steps.json [query] : headless game on SwiftShader. steps: eval / wait / shot / log
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const q = process.argv[3] || '?noopening&timer';
const W = +(process.env.W || 960), H = +(process.env.H || 600);
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await b.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
page.on('console', (m) => { if (process.env.ALL || m.type() === 'error') console.log('err', m.text().slice(0, 400)); });
const t0 = Date.now();
await page.goto(`http://localhost:8481/${q}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 600000, polling: 1000 });
console.log('up in', (Date.now() - t0) / 1000);
for (const s of steps) {
  try {
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.eval) await page.evaluate(`(async () => { ${s.eval} })()`);
    if (s.log) console.log(JSON.stringify(await page.evaluate(`(async () => { ${s.log} })()`)));
    if (s.shot) { await page.screenshot({ path: `${process.env.OUT || '.'}/${s.shot}.png` }); console.log('shot', s.shot); }
  } catch (e) { console.log('STEP FAILED', JSON.stringify(s).slice(0, 100), String(e).slice(0, 300)); }
}
await b.close();
