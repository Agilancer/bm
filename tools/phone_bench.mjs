// Runs the game in Chrome at a phone's screen size on SwiftShader, a software GPU, so it's slow in a way a desktop's real GPU
// never is. It says nothing about any particular phone's speed, but before-and-after comparisons and the governor's behaviour
// under real load are honest. Needs the server (python tools/serve.py) and Playwright (npm install -g playwright).
//
//   node tools/phone_bench.mjs frames [port]   each frame drawn by hand and waited for, in three staged scenes
//   node tools/phone_bench.mjs parts [port]    what each part of the frame costs, by turning it off
//   node tools/phone_bench.mjs real [port]     the real boot through the title with the governor deciding, then a fight
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const mode = process.argv[2] || 'frames';
const port = process.argv[3] || '8402';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-phone-'));

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome', headless: true,
  args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--ignore-gpu-blocklist'],
  viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
});
const page = ctx.pages()[0] || await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const gameUp = () => page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 240000 });
const cmd = async (...a) => { await page.evaluate((a) => bm.cmd(...a), a); await page.waitForTimeout(120); };

// The game's own loop stands down, as it does under the title, and each frame is drawn and waited for.
const handDrawn = async () => {
  await page.goto(`http://localhost:${port}/?auto=1`, { waitUntil: 'load' });
  await gameUp();
  await page.evaluate(() => { bm.view.idle = true; bm.view.idleFrames = 99; bm.fixScale(1); });
  await page.waitForTimeout(400);
};
const timeFrames = (n) => page.evaluate(async (n) => {
  const v = bm.view, r = bm.renderer, times = [];
  let last = performance.now();
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    const dt = Math.min((t - last) / 1000, 0.05); last = t;
    const snap = v.currentSnap();
    v.processEvents(snap); v.updateCamera(dt, snap); v.emitAmbient(dt, snap); v.emitBleeds(dt, snap); v.updateTrail(dt, snap);
    r.frame(v.overrideCam || v.cam, snap, v.sway, dt);
    await r.device.queue.onSubmittedWorkDone();
    if (i >= 2) times.push(performance.now() - t);
    await new Promise((res) => setTimeout(res, 0));
  }
  times.sort((a, b) => a - b);
  return { medianMs: +times[times.length >> 1].toFixed(0), render: `${r.W}x${r.H}`, msaa: r.msaa, errors: window.__gpuErrors || 0 };
}, n);

if (mode === 'frames') {
  await handDrawn();
  const rows = {};
  rows['village view'] = await timeFrames(14);
  await cmd(4, 0);
  await cmd(1, 0, 2.6);
  await page.waitForTimeout(600);
  rows.duel = await timeFrames(14);
  await cmd(3, 0, 1);
  // (H.PX and H.PZ are 2 and 4 in the snapshot.)
  await page.evaluate(() => { const s = bm.snap(); bm.cmd(7, 2, s[2] + 4, s[4] + 3); });
  await page.waitForTimeout(120);
  await page.evaluate(() => { const s = bm.snap(); bm.cmd(7, 3, s[2] - 4, s[4] + 4); });
  await page.waitForTimeout(600);
  rows['duel, crabs, bleeding'] = await timeFrames(14);
  console.table(rows);
} else if (mode === 'parts') {
  await handDrawn();
  const rows = {};
  const stage = async (name, on, off) => {
    if (on) await page.evaluate(on);
    rows[name] = (await timeFrames(9)).medianMs;
    if (off) await page.evaluate(off);
  };
  await stage('everything');
  await stage('no rocks', 'bm.renderer.rocksOn=false', 'bm.renderer.rocksOn=true');
  await stage('no grass', 'bm.renderer.grassOn=false', 'bm.renderer.grassOn=true');
  await stage('no bloom', 'bm.renderer.useBloom=false', 'bm.renderer.useBloom=true');
  await stage('no arms', 'bm.renderer.hideVM=true', 'bm.renderer.hideVM=false');
  await stage('scale 0.75', 'bm.fixScale(0.75)', 'bm.fixScale(1)');
  await stage('scale 0.5', 'bm.fixScale(0.5)', 'bm.fixScale(1)');
  await stage('scale 0.25 (what barely shrinks)', 'bm.fixScale(0.25)', 'bm.fixScale(1)');
  await stage('no multisampling', 'bm.renderer.dropMSAA()');
  console.table(rows);
} else {
  await page.addInitScript(() => { localStorage.setItem('bm-threads-consent', 'all'); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await gameUp();
  await page.waitForFunction(() => bm.view.benched, null, { timeout: 180000 });
  console.log('timed under the title:', await page.evaluate(() => {
    const r = bm.renderer;
    return JSON.stringify({ scale: r.scale, rung: bm.view.governor.rung, msaa: r.msaa, render: `${r.W}x${r.H}`, drawnUnderTitle: bm.view.idleFrames, errors: window.__gpuErrors || 0 });
  }));
  await page.evaluate(() => { window.bmTitle.onMenu('new'); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.log_ = [];
    const start = performance.now();
    setInterval(() => {
      const r = bm.renderer;
      window.log_.push({ t: +((performance.now() - start) / 1000).toFixed(0), fps: +bm.view.hud.fps.toFixed(1), busyMs: +r.stats.busyMs.toFixed(0), inFlight: r.inFlight, render: `${r.W}x${r.H}`, rung: bm.view.governor.rung, effects: r.demoted || 0, grass: r.grassOn, bloom: r.useBloom, tick: bm.snap()[1] });
    }, 5000);
  });
  await page.waitForTimeout(30000);
  await cmd(4, 0);
  await cmd(1, 0, 2.6);
  await page.waitForTimeout(15000);
  console.table(await page.evaluate(() => window.log_));
  console.log('gpu errors', await page.evaluate(() => window.__gpuErrors || 0));
}
if (errors.length) console.log('page errors:', errors.slice(0, 5));
await ctx.close();
fs.rmSync(profile, { recursive: true, force: true });
