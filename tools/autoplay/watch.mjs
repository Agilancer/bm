// Auto-play watched without a GPU: the game headless on a software GPU with auto-play on, its status line, where it is, its
// life and its quests printed as they change, and any error. Needs the server (python tools/serve.py 8481).
//
//   NODE_PATH=$(npm root -g) node tools/autoplay/watch.mjs <minutes> [level]
//
// Env: PRE (page code run before auto-play starts: set a scene), SAFE=1 (nothing can hurt the player), EVERY (ms between
// looks, default 15000), PORT, Q (more query string), ALL=1 (the page's whole console).
// It also prints, as they happen, each time auto-play is stuck (three tries on without moving), lost (it leaves what it was
// going for) or gives something up for half a minute or more, with where it stood and what it was at: a run with none of
// those and a status line that keeps changing found its way. (A place it walks to and fro in shows as neither till the
// half minute is up: read where it is, too.) One run at a time: the page takes several gigabytes on a software GPU.
// On a software GPU the page dies within seconds of auto-play starting unless drawing is stubbed, so start PRE with
// `bm.renderer.frame = () => {}`. A scene, for example Ser Hale's first quest at Blackvigil's gate with a party:
//   PRE='bm.renderer.frame = () => {}; bm.hire(4); bm.view.townUI.quests.begin("gate_of_blackvigil"); bm.cmd(19, 0, -4880, 200)'
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const mins = +(process.argv[2] || 6), level = +(process.argv[3] || 0);
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 640, height: 400 } });
page.on('crash', () => console.log('PAGE CRASHED')); page.on('close', () => console.log('PAGE CLOSED')); b.on('disconnected', () => console.log('BROWSER GONE')); page.on('framenavigated', (f) => console.log('NAV', f.url().slice(0, 120))); if (process.env.ALL) page.on('console', (m) => console.log('  >', m.type(), m.text().slice(0, 200)));
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e.stack || e).slice(0, 900)));
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('preload')) console.log('err', t.slice(0, 500)); if (/Auto-play doesn|coverage|^auto-play: /.test(t)) console.log('con', t.slice(0, 300)); });
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer${process.env.Q || ''}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate(`bm.view.lands.cheats.noDamage = ${process.env.SAFE ? 'true' : 'false'}; ${level ? `bm.skills('level', ${level}); bm.skills('give', 30);` : ''} ${process.env.PRE || ''}; if (!bm.view.autoplay.on) bm.view.autoplay.toggle(true);
  { const B = bm.view.autoplay.brain, at = () => { const m = B.me(bm.snap()); return [m.x, m.y, m.z].map((v) => v.toFixed(1)).join(', ') + ' at ' + Math.round(B.t) + ' s, on ' + (B.job ? B.job.kind + ':' + B.job.why : 'nothing') + ': ' + (B.said || '').slice(0, 70); };
    const lost = B.lost.bind(B), giveUp = B.giveUp.bind(B), unstick = B.unstick.bind(B); let n = 0;
    B.lost = () => { console.log('auto-play: LOST ' + at()); lost(); };
    B.giveUp = (k, s) => { if (typeof k === 'string' && s >= 30 && !k.startsWith('foe:')) console.log('auto-play: gives up ' + k + ' for ' + s + ' s, ' + at()); giveUp(k, s); };
    B.unstick = (dt, m, mv) => { unstick(dt, m, mv); if (B.stuck.n >= 3 && B.stuck.n > n) console.log('auto-play: STUCK (' + B.stuck.n + ') ' + at()); n = B.stuck.n; }; }`);
let last = '';
for (let i = 0; i < mins * 60000 / +(process.env.EVERY || 15000); i++) {
  await page.waitForTimeout(+(process.env.EVERY || 15000));
  const s = await page.evaluate(`(async () => { const L = await import('/src/core/layout.js'); const s = bm.snap(); const a = bm.view.autoplay; return { hp: Math.round(s[L.H.HP] ?? -1), st: a.statusEl.textContent.slice(0, 140), on: a.on, p: [Math.round(s[L.H.PX]), Math.round(s[L.H.PZ])], q: Object.entries(bm.view.townUI.quests.q).map(([k, v]) => k + ':' + (v.stage === 'done' ? 'done' : v.step)).join(' ') }; })()`).catch((e) => ({ st: 'EVAL FAILED ' + String(e).slice(0, 200) }));
  const line = `${s.st} @${s.p} hp ${s.hp} [${s.q}]`;
  if (line !== last) console.log(`${Math.round((i + 1) * +(process.env.EVERY || 15000) / 1000)}s`, line);
  last = line;
}
await b.close();
