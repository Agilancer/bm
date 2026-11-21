// The first visit to Phobos (docs/FIRST-VISIT.md), played by auto-play in a real Chrome on the real GPU, its window parked off
// screen (so the page is never hidden and never paused), from a save: how far it gets, what it's doing, and pictures as it goes.
// Needs the server (python tools/serve.py <port>) and Playwright (npm install -g playwright).
//
//   node tools/firstvisit/play.mjs <save.json> [port] [minutes] [name]
//
// save.json: a game's velscour.autosave (from the page: localStorage, posted out, e.g. through /shot), or 'new' for a New
// Game from the title, the opening and all (to time how long a new player takes to reach Lisandra's door). Shots go to
// tools/build/shots/firstvisit/<name>_<n>.png, one a minute; the log line every ten seconds says where the player is, its
// life and level, what auto-play's on, and each first-visit quest's state.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const [saveFile, port = '8821', minutes = '10', name = 'fv'] = process.argv.slice(2);
const fresh = saveFile === 'new';
const save = fresh ? '' : fs.readFileSync(saveFile, 'utf8');
const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'build', 'shots', 'firstvisit');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-fv-'));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome', headless: false, viewport: { width: 1280, height: 720 },
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--window-position=-3000,0', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const page = ctx.pages()[0] || await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e)));
// (An error's stack the first time each is seen, the line only after: auto-play's catch logs once a tick.)
const seenErr = new Set();
page.on('console', async (m) => {
  if (m.type() !== 'error') return;
  const t = m.text().slice(0, 300);
  if (seenErr.has(t)) return;
  seenErr.add(t);
  const st = await Promise.all(m.args().map((a) => a.evaluate((e) => (e && e.stack) || '').catch(() => ''))).then((s) => s.filter(Boolean).join(' | ')).catch(() => '');
  console.log('console', t, st ? ' :: ' + st.slice(0, 1200) : '');
});
// (The save in before the page reads it; only the first time, so the game's own saves stand after.)
await page.addInitScript(([s, look]) => {
  if (sessionStorage.getItem('fv-seeded')) return;
  sessionStorage.setItem('fv-seeded', '1');
  if (s) localStorage.setItem('velscour.autosave', s);
  localStorage.setItem('velscour.settings', JSON.stringify({ keep: 'no', background: 'run' }));
  localStorage.setItem('bm-threads-consent', 'all');
  // (Phobos's first sight, src/ui/firstsight.js, is kept on the device, not in the save: seen already if the save's past
  // Lisandra's door, so a leg played on from a save doesn't stand through the five-minute look again.)
  if (s && !look && /"the_door_east":\{"stage":"done"/.test(s)) localStorage.setItem('velscour.phobosSeen', '1');
}, [save, !!process.env.LOOK]);   // (LOOK=1: stand through it anyway)
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
// (The title's menu up, its Continue live: src/title.js maybeMenu. It wants a click to begin (the sound's let in by one), and
// then the cards go by; a click on them only skips one.)
for (let i = 0; i < 90; i++) {
  if (await page.evaluate(() => !!document.querySelector('.menu-on'))) break;
  if (i % 5 === 0) await page.mouse.click(40, 700);
  await page.waitForTimeout(2000);
}
const go = fresh ? 'new' : 'continue';
await page.waitForFunction((a) => { const b = document.querySelector(`.menu-on [data-a="${a}"]`); return b && !b.disabled; }, go, { timeout: 240000, polling: 1000 });
await page.waitForTimeout(1500);
await page.evaluate((a) => document.querySelector(`[data-a="${a}"]`).click(), go);
await page.waitForFunction(() => window.bm && bm.snap && bm.snap() && bm.townUI, null, { timeout: 240000, polling: 1000 });
await page.waitForTimeout(6000);
await page.evaluate(async () => { const { INPUT, H } = await import('/src/core/layout.js'); window.INP = INPUT; window.HH = H; bm.shared.input[INPUT.PAUSE] = 0; });
// Auto-play on, on the quests.
await page.evaluate(() => {
  // (Auto-play's own catch logs an error's message only: its stack kept here, said once, below.)
  bm.autoplay.wake();
  const b = bm.autoplay.brain, step = b.step.bind(b);
  b.step = (...a) => { try { return step(...a); } catch (e) { window.fvErr = String(e.stack); throw e; } };
  bm.autoplay.begin('quests');
});
let errSaid = '';
const IDS = [...(fresh ? ['lisandra_work', 'bed_and_bell'] : []), 'the_door_east', 'fv_the_way_down', 'fv_gibbet_field', 'fv_carrion', 'fv_the_redoubt', 'fv_home'];
const t0 = Date.now();
let n = 0;
while (Date.now() - t0 < +minutes * 60000) {
  await page.waitForTimeout(10000);
  const r = await page.evaluate((ids) => {
    bm.shared.input[INP.PAUSE] = 0;
    const s = bm.snap(), Q = bm.townUI.quests, a = bm.townUI.act.auto?.() || {};
    const q = ids.map((id) => { const st = Q.state(id); return `${id.replace('fv_', '')}:${st ? (st.stage === 'done' ? 'DONE' : `${st.step}/${st.n}`) : '-'}`; }).join(' ');
    const xp = bm.pack.xp | 0, gain = xp - (window.fvXp ?? xp); window.fvXp = xp;
    return `t ${(s[0] | 0)}s op ${s[HH.OPENING]} xp ${xp}${gain ? ` (+${gain})` : ''} at ${s[2] | 0},${s[3] | 0},${s[4] | 0} life ${s[HH.HP] | 0}/${s[HH.MAX_HP] | 0} lvl ${bm.pack.level} | ${a.on ? (a.say || a.quest || '') : 'auto off'} | ${q}`;
  }, IDS);
  console.log(`[${((Date.now() - t0) / 1000) | 0}] ${r}`);
  // (FOES=1: what's about, alive, within seventy metres, by name and life: where a kill's experience came from.)
  if (process.env.FOES) console.log('   foes:', await page.evaluate(() => { const s = bm.snap(), b = bm.autoplay.brain; return b.foes(s, { x: s[HH.PX], y: s[HH.PY], z: s[HH.PZ] }).map((f) => `${b.foeName(f)} ${f.hp | 0}/${f.maxHp | 0} @${f.d | 0}m`).join(', '); }).catch((e) => String(e)));
  const err = await page.evaluate(() => window.fvErr || '');
  if (err && err !== errSaid) { errSaid = err; console.log('STACK', err.slice(0, 1500)); }
  if (((Date.now() - t0) / 60000 | 0) >= n) { await page.screenshot({ path: path.join(out, `${name}_${String(n).padStart(2, '0')}.png`) }); n++; }
}
const fin = await page.evaluate(() => localStorage.getItem('velscour.autosave'));
fs.writeFileSync(path.join(out, `${name}_end.json`), fin);
await ctx.close();
