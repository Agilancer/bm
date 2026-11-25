// Auto-play's walking, traced: where it is every quarter second, headless, and what's wrong with how it went. Needs the server
// (python tools/serve.py 8481).
//
//   NODE_PATH=$(npm root -g) node tools/autoplay/trace.mjs <minutes> [level]
//
// Env as tools/autoplay/watch.mjs (PRE, SAFE, PORT, Q); POST: page code run once auto-play's on (its brain is made then);
// EVAL: page code whose answer is printed each minute; GFX: the graphics setting (Low, 'mobile', unless given).
// OUT=<file> writes the samples as JSON, each minute.
// It prints, a minute at a time, where it went and what at, and at the end:
//   - to and fro: each time it turned about (more than 135 degrees) and turned back again within four seconds, walking,
//     with where and what at. A person going somewhere doesn't do that.
//   - pressed: time spent with its keys held to walk and its body hardly moving (into a wall, a corner, a crowd).
//   - in Phobos: how much of its walking was on a street (inside a street's width of its middle), and how much off them.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const mins = +(process.argv[2] || 6), level = +(process.argv[3] || 0);
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-watchdog', '--disable-gpu-process-crash-limit'] });
const page = await b.newPage({ viewport: { width: 640, height: 400 } });
page.on('crash', () => console.log('PAGE CRASHED'));
page.on('pageerror', (e) => { if (!/Instance reference|Device was destroyed/.test(String(e))) console.log('PAGE ERROR', String(e.stack || e).slice(0, 900)); });
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/preload|Instance reference|Device was destroyed|device lost/.test(t)) console.log('err', t.slice(0, 300)); if (/^auto-play: /.test(t)) console.log('con', t.slice(0, 300)); });
// (Nothing drawn, from the start: a software GPU drawing this game on four cores loses its device within minutes, and the
// page goes back to its title. The walking is the sim's and the nav thread's, and needs no frame.)
// (And a device lost all the same is never told the page: it would go back to its title. Nothing's drawn after the start.)
// (The lowest graphics, so the software GPU lasts: the townsfolk's bodies are the GPU's, and without them nobody's about to talk to.)
await page.addInitScript((gfx) => { try { const k = 'velscour.settings', s = JSON.parse(localStorage.getItem(k) || '{}'); s.gfx = gfx; s.phobosAwe = 'off'; localStorage.setItem(k, JSON.stringify(s)); } catch { /* none */ } }, process.env.GFX || 'mobile');
if (!process.env.DRAW) await page.addInitScript(() => {
  if (!self.GPUAdapter) return;
  const rd = GPUAdapter.prototype.requestDevice;
  GPUAdapter.prototype.requestDevice = async function (d) { const dev = await rd.call(this, d); Object.defineProperty(dev, 'lost', { value: new Promise(() => {}) }); return dev; };
});
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer${process.env.Q || ''}`, { waitUntil: 'load' });
// (Drawing stubbed, but who's where among the townsfolk still read each frame, as the renderer's cull reads it: whereOf
// and everyone auto-play talks to come from there.)
await page.waitForFunction(() => { const r = window.bm?.view?.renderer; if (r && !r.__stub) { r.__stub = true; import('/src/folk/layout.js').then(({ readFolk }) => { r.frame = function () { if (this.folk?.map) this.folk.slot = readFolk(this.folk.map) || this.folk.slot; }; }); } return window.bm && bm.snap && bm.snap(); }, null, { timeout: 900000, polling: 250 });
await page.evaluate(`bm.view.lands.cheats.noDamage = ${process.env.SAFE ? 'true' : 'false'}; ${level ? `bm.skills('level', ${level}); bm.skills('give', 30);` : ''} ${process.env.PRE || ''}; if (!bm.view.autoplay.on) bm.view.autoplay.toggle(true); ${process.env.POST || ''};
  { const B = bm.view.autoplay.brain, giveUp = B.giveUp.bind(B);
    B.giveUp = (k, s) => { if (typeof k === 'string' && s >= 30 && !k.startsWith('foe:')) { const m = B.me(bm.snap()); console.log('auto-play: gives up ' + k + ' for ' + s + ' s at ' + Math.round(m.x) + ', ' + Math.round(m.z) + ' (' + Math.round(B.t) + ' s)'); } giveUp(k, s); };
    window.__tr = [];
    import('/src/core/layout.js').then((L) => setInterval(() => { const s = bm.snap(); if (!s) return; const I = bm.view.autoplay.brain.o.input, keys = I ? (I.keys ? Object.values(I.keys).some(Boolean) : 0) : 0;
      window.__tr.push([+(performance.now() / 1000).toFixed(2), +s[L.H.PX].toFixed(2), +s[L.H.PY].toFixed(2), +s[L.H.PZ].toFixed(2), B.job ? B.job.kind + ':' + B.job.why : '', (B.said || '').slice(0, 60), B.o.input.fwd ?? B.o.input.move ?? 0, Math.round(bm.hour ? bm.hour() * 10 : 0) / 10]); }, 250)); }`);
let all = [], seen = 0;
const flush = async () => { const got = await page.evaluate(() => { const a = window.__tr || []; window.__tr = []; return a; }).catch(() => []); all.push(...got); };
for (let i = 0; i < mins; i++) {
  await page.waitForTimeout(60000);
  await flush();
  const s = all.slice(seen); seen = all.length;
  if (!s.length) { console.log(`${i + 1} min: no samples`); continue; }
  const L = s[s.length - 1], says = [...new Set(s.map((q) => q[5]))].slice(-4).join(' | ');
  const q = await page.evaluate(() => Object.entries(bm.view.townUI.quests.q).map(([k, v]) => k + ':' + (v.stage === 'done' ? 'done' : v.step)).join(' ')).catch(() => '');
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(all));
  if (process.env.EVAL) console.log('  eval:', await page.evaluate(process.env.EVAL).then((v) => JSON.stringify(v)).catch((e) => String(e).slice(0, 300)));
  console.log(`${i + 1} min @${L[1] | 0},${L[3] | 0} y${L[2] | 0} h${L[7]} ${L[4]} :: ${says} [${q}]`);
}
await b.close();
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(all));
// ---- what went wrong
const { analyse } = await import('./trace-read.mjs');
analyse(all);
