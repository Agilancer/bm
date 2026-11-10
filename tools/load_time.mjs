// How long the game takes to start, and where the time goes. Two starts in one fresh browser profile: the first with
// nothing in the browser's cache, the second with it full. For each: when the simulation, the land, the pictures and the
// models were ready (src/gfx/renderer.js load, window.bm.loadLaps), how many files came down and how big, and any file
// fetched more than once. Needs the server (python tools/serve.py) and Playwright (npm install -g playwright).
//
//   node tools/load_time.mjs [url] [--phone] [--software]
//
//   url         default http://localhost:8402/?auto=1&noopening (?auto=1 starts the game without the title's questions)
//   --phone     an emulated Pixel 7: the phone's graphics tier, which loads less at once to spare its memory
//   --software  headless, on SwiftShader (a software GPU), for a machine with no GPU. Its times are much longer than a
//               real GPU's, and say more about its CPU than about the game: use them for before-and-after only.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) || 'http://localhost:8402/?auto=1&noopening';
const phone = args.includes('--phone'), software = args.includes('--software');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-load-'));
const ctx = await chromium.launchPersistentContext(profile, {
  headless: software,
  args: ['--enable-unsafe-webgpu', ...(software ? ['--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] : ['--window-position=-3600,0', '--window-size=1300,800'])],
  ...(phone ? { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' } : { viewport: { width: 1280, height: 720 } }),
});
const page = ctx.pages()[0] || await ctx.newPage();
let done = [], errors = [];
ctx.on('requestfinished', async (r) => {
  const res = await r.response().catch(() => null);
  const sizes = await r.sizes().catch(() => null);
  done.push({ path: new URL(r.url()).pathname, bytes: sizes?.responseBodySize || 0, status: res?.status() });
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 200)));

async function start(tag) {
  done = []; errors = [];
  const t0 = Date.now();
  await page.goto(url);
  let up = true;
  try { await page.waitForFunction(() => window.bm && window.bm.snap && window.bm.snap(), null, { timeout: 600000, polling: 100 }); } catch { up = false; }
  const seconds = (Date.now() - t0) / 1000;
  const laps = up ? await page.evaluate(() => window.bm.loadLaps || []) : [];
  const info = up ? await page.evaluate(() => ({ tier: bm.renderer.tier.name, cores: navigator.hardwareConcurrency })) : {};
  await new Promise((r) => setTimeout(r, 1500));
  // (A file read from the browser's cache has no body on the wire: only what came over the network is counted.)
  const net = done.filter((d) => d.bytes > 0), bytes = net.reduce((a, d) => a + d.bytes, 0);
  console.log(`\n${tag}: ${up ? `up in ${seconds.toFixed(1)} s` : `NOT UP after ${seconds.toFixed(0)} s`} (${info.tier || '?'} graphics, ${info.cores || '?'} threads)`);
  for (const [what, ms] of laps) console.log(`  ${(ms / 1000).toFixed(1).padStart(6)} s  ${what}`);
  console.log(`  ${done.length} requests; over the network ${net.length} files, ${(bytes / 1e6).toFixed(0)} MB`);
  const by = {};
  for (const d of net) { const k = d.path.split('/').slice(1, 4).join('/'); (by[k] ||= { n: 0, b: 0 }); by[k].n++; by[k].b += d.bytes; }
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1].b - a[1].b).slice(0, 8)) console.log(`    ${k.padEnd(36)} ${String(v.n).padStart(4)} files ${(v.b / 1e6).toFixed(1).padStart(7)} MB`);
  const seen = new Set();
  let again = 0, over = 0;
  for (const d of net) { if (seen.has(d.path)) { again++; over += d.bytes; } else seen.add(d.path); }
  if (again) console.log(`  ${again} of those came over the network a second time, ${(over / 1e6).toFixed(0)} MB that needn't have`);
  if (errors.length) console.log('  errors:', errors.slice(0, 5).join(' | '));
}
await start('start 1 (nothing cached)');
await start('start 2 (the browser\'s cache full)');
await ctx.close();
fs.rmSync(profile, { recursive: true, force: true });
