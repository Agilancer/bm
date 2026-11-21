// Auto-play walked through the east in the game itself (not trips.mjs's copy of its rules): the page in Chrome on this
// machine's own graphics card, the player put on the road before the Drawbridge Gate, nothing able to hurt him, and
// auto-play's choice of job replaced by a list of places in Phobos and Castle Velscour, one after the other. It prints when
// each is got to, and every time auto-play is stuck, lost or gives one up, with where it stood.
//   NODE_PATH=$(npm root -g) node tools/paths/ingame.mjs [minutes] [name,name,...]     PORT (8492), EVERY (ms, 10000)
// Needs the server (python tools/serve.py <PORT> --no-open). The names are targets.mjs's; by default a sewer grate, a city
// tower, a castle tower's deck, a bridge between towers and the gate road again.
import { createRequire } from 'node:module';
import { targets } from './targets.mjs';
import { EAST_DOOR } from '../../src/sim/east-nav.js';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const mins = +(process.argv[2] || 20), T = targets();
const pick = (process.argv[3] || 'The West Drains,the Latch Turret,sat1 to sat2,The Drawbridge Gate').split(',');
const goals = pick.map((n) => { const t = T.find((q) => q.name === n && q.kind !== 'castle tower foot') || T.find((q) => q.name === n); if (!t) throw new Error('no target ' + n); return { name: `${t.kind} ${t.name}`, x: t.x, z: t.z, y: t.y, r: t.r, dy: t.dy }; });
const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--disable-dawn-features=use_dxc'] });
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
page.on('crash', () => console.log('PAGE CRASHED'));
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e.stack || e).slice(0, 600)));
page.on('console', (m) => { const t = m.text(); if (/^auto-play: /.test(t)) console.log(t.slice(0, 300)); else if (m.type() === 'error' && !t.includes('preload')) console.log('err', t.slice(0, 300)); });
await page.goto(`http://localhost:${process.env.PORT || 8492}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate(`(() => {
  bm.view.lands.cheats.noDamage = true;
  bm.cmd(19, 0, ${EAST_DOOR[0]}, ${EAST_DOOR[1]});
  const B = bm.view.autoplay.brain, G = ${JSON.stringify(goals)}; let i = 0;
  const at = () => { const m = B.me(bm.snap()); return [m.x, m.y, m.z].map((v) => v.toFixed(1)).join(', ') + ' at ' + Math.round(B.t) + ' s'; };
  B.choose = (m) => {
    const g = G[i]; if (!g) return null;
    if (Math.hypot(m.x - g.x, m.z - g.z) <= g.r + 0.3 && (g.y === null || Math.abs(m.y - g.y) <= g.dy)) { console.log('auto-play: REACHED ' + g.name + ', ' + at()); i++; return B.choose(m); }
    return { kind: 'go', why: 'trial' + i, x: g.x, z: g.z, y: g.y ?? undefined, r: Math.min(g.r, 6), say: g.name };
  };
  const lost = B.lost.bind(B), giveUp = B.giveUp.bind(B), unstick = B.unstick.bind(B); let n = 0;
  B.lost = () => { console.log('auto-play: LOST ' + at()); lost(); };
  B.giveUp = (k, s) => { if (typeof k === 'string' && k.startsWith('trial')) console.log('auto-play: gives up ' + k + ' for ' + s + ' s, ' + at()); giveUp(k, s); };
  B.unstick = (dt, m, mv) => { unstick(dt, m, mv); if (B.stuck.n >= 3 && B.stuck.n > n) console.log('auto-play: STUCK (' + B.stuck.n + ') ' + at()); n = B.stuck.n; };
  window.__done = () => i >= G.length; window.__at = at;
  if (!bm.view.autoplay.on) bm.view.autoplay.toggle?.();
})()`);
const t0 = Date.now();
while (Date.now() - t0 < mins * 60000) {
  await page.waitForTimeout(+(process.env.EVERY || 10000));
  const s = await page.evaluate(`({ done: __done(), at: __at(), st: bm.view.autoplay.statusEl?.textContent?.slice(0, 90), on: bm.view.autoplay.on })`).catch((e) => ({ err: String(e).slice(0, 200) }));
  console.log(`${Math.round((Date.now() - t0) / 1000)}s`, JSON.stringify(s));
  if (s.done) { console.log('ALL REACHED'); break; }
}
await b.close();
