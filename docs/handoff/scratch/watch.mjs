// node watch.mjs <minutes> [level] : the game headless with auto-play on; its status line every 15 s, and any error.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const mins = +(process.argv[2] || 6), level = +(process.argv[3] || 0);
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 640, height: 400 } });
page.on('crash', () => console.log('PAGE CRASHED')); page.on('close', () => console.log('PAGE CLOSED')); b.on('disconnected', () => console.log('BROWSER GONE')); page.on('framenavigated', (f) => console.log('NAV', f.url().slice(0, 120))); if (process.env.ALL) page.on('console', (m) => console.log('  >', m.type(), m.text().slice(0, 200)));
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e.stack || e).slice(0, 900)));
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('preload')) console.log('err', t.slice(0, 500)); if (/Auto-play doesn|coverage/.test(t)) console.log('con', t.slice(0, 300)); });
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate(`bm.view.lands.cheats.noDamage = ${process.env.SAFE ? 'true' : 'false'}; ${level ? `bm.skills('level', ${level}); bm.skills('give', 30);` : ''} ${process.env.PRE || ''}; if (!bm.view.autoplay.on) bm.view.autoplay.toggle(true);`);
let last = '';
for (let i = 0; i < mins * 60000 / +(process.env.EVERY || 15000); i++) {
  await page.waitForTimeout(+(process.env.EVERY || 15000));
  const s = await page.evaluate(`(async () => { const L = await import('/src/core/layout.js'); const s = bm.snap(); const a = bm.view.autoplay; return { hp: Math.round(s[L.H.HP] ?? -1), st: a.statusEl.textContent.slice(0, 140), on: a.on, p: [Math.round(s[L.H.PX]), Math.round(s[L.H.PZ])], q: Object.entries(bm.view.townUI.quests.q).map(([k, v]) => k + ':' + (v.stage === 'done' ? 'done' : v.step)).join(' ') }; })()`).catch((e) => ({ st: 'EVAL FAILED ' + String(e).slice(0, 200) }));
  const line = `${s.st} @${s.p} hp ${s.hp} [${s.q}]`;
  if (line !== last) console.log(`${Math.round((i + 1) * +(process.env.EVERY || 15000) / 1000)}s`, line);
  last = line;
}
await b.close();
