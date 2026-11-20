// Pictures for judging how a texture's repeat shows: the ground, the town's houses, the castles out in the land. The same
// places every round, so a critic can set one round's picture beside the last's.
//
//   python tools/serve.py 8481 --no-open &
//   xvfb-run -a -s "-screen 0 1600x1000x24" node tools/world/repeats.mjs <round> [names=all] [gfx=auto]
//
// Shots go to tools/build/shots/<round>_<name>.png. gfx: auto (a PC's graphics, the default) or mobile (a phone's lean
// shaders). BASE=<git ref>: the game's files changed since that commit (code and textures) are served as they were in it, so a place added
// later can have its "before" taken without undoing anything (BASE=HEAD: the last commit's shaders; the page's service
// worker is kept out then, so the old files are the ones it gets).
//
// On a machine with no GPU it's a real Chromium window on a virtual screen with a software GPU, as tools/village/shots.mjs
// does it (the headless shell loses its device): about four minutes a picture on four cores at 1280 by 720. The player is
// put at each place first, so the land round it is built before the picture's taken.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const { terrainHeight } = await import(path.join(ROOT, 'src/core/terrain.js'));

// [name, eye x, eye y, eye z, look x, look y, look z, hour, settle seconds]. A y that starts with + is metres over the land.
const SPOTS = [
  // The town: its square's beaten earth, a long timbered front, the stone houses, the roofs from the bell's height.
  ['square', 0, '+1.8', 8, 1, '+3', -19.9, 11, 4],
  ['lane', 30, '+5', 22, 45, '+3', -25, 15, 4],
  ['stonehouse', -26, '+1.7', -30, -40.8, '+3.5', -14, 10, 4],
  ['roofs', 30, '+22', 40, -10, '+2', -10, 13, 4],
  ['timbers', -29, '+1.7', -25, -37.5, '+3.6', -12, 11, 4],
  // The land: meadow and road toward the hill, rock and road climbing, a wide look down over the downs.
  ['meadow', 140, '+1.8', 40, 300, '+1', 60, 11, 10],
  ['hillroad', 420, '+1.65', 30, 560, '+1.2', 40, 11, 12],
  ['downs', 1600, '+14', 120, 1900, '+1', 60, 9, 14],
  // The castles: Blackvigil's curtain, Gatewatch Keep, Frostwatch's wall, the abbey, Khel's caravanserai, the bell tower.
  ['blackvigil', -4900, '+2.5', 290, -4990, '+9', 258, 14, 16],
  ['gatewatch', 6700, '+2', 185, 6640, '+9', 150, 12, 16],
  ['greywarden', 5935, '+2', -1995, 5900, '+8', -1936, 10, 16],
  ['frostwatch', 640, '+2', 3820, 700, '+8', 3900, 12, 16],
  ['abbey', 3880, '+2', -2800, 3950, '+8', -2880, 15, 16],
  ['khel', -3620, '+2', -640, -3700, '+6', -700, 14, 16],
];

function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez;
  const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx;
  const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: -rz * fy, uy: rz * fx - rx * fz, uz: rx * fy };
}
const Y = (s, x, z) => (String(s).startsWith('+') ? terrainHeight(x, z) + +String(s).slice(1) : +s);

const [round = 'r0', only = 'all', gfx = 'auto'] = process.argv.slice(2);
const pick = only === 'all' ? null : only.split(',');
const port = process.env.PORT || '8481';
const browser = await chromium.launch({ channel: 'chromium', headless: false, args: ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-gpu-watchdog'] });
const ctx = await browser.newContext({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) }, serviceWorkers: process.env.BASE ? 'block' : 'allow' });
const page = await ctx.newPage();
page.setDefaultTimeout(900000);
if (gfx !== 'auto') await page.addInitScript((g) => { try { localStorage.setItem('velscour.settings', JSON.stringify({ gfx: g, keep: 'no' })); } catch { /* no storage */ } }, gfx);
if (process.env.BASE) {
  // (Every game file changed since that commit, the textures with the code, is served as it was in it.)
  const changed = execSync(`git diff --name-only ${process.env.BASE} -- src assets`, { cwd: ROOT }).toString().split('\n').filter(Boolean);
  for (const f of changed) {
    const body = execSync(`git show ${process.env.BASE}:${f}`, { cwd: ROOT, maxBuffer: 1 << 28 });
    const type = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.webp') ? 'image/webp' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    await ctx.route(new RegExp(`/${f.replaceAll('/', '\\/').replaceAll('.', '\\.')}(\\?.*)?$`), (r) => r.fulfill({ status: 200, contentType: type, body }));
  }
  console.log('serving', changed.length, 'files as they were at', process.env.BASE);
}
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 400)));
page.on('console', (m) => { if (m.type() === 'error' && !/404|preload/.test(m.text())) console.log('page:', m.text().slice(0, 300)); });
const t0 = Date.now();
await page.goto(`http://localhost:${port}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { polling: 1000 });
console.log('up in', Math.round((Date.now() - t0) / 1000), 's');
await page.evaluate(() => { bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; });
await page.waitForTimeout(3000);
for (const [name, ex, ey, ez, tx, ty, tz, hour, settle] of SPOTS) {
  if (pick && !pick.includes(name)) continue;
  const c = cam(ex, Y(ey, ex, ez), ez, tx, Y(ty, tx, tz), tz);
  // (The player stands at the eye, so the land, the grass and the places round it are built; then the eye is set.)
  await page.evaluate(([x, z, cm, h]) => { bm.cmd(19, 0, x, z); bm.setTime(h); bm.setCam(cm); }, [ex, ez, c, hour]);
  await page.waitForTimeout(settle * 1000);
  await page.evaluate(([cm, h]) => { bm.setTime(h); bm.setCam(cm); }, [c, hour]);
  await page.waitForTimeout(1500);
  await page.evaluate((n) => bm.shot(n), `${round}_${name}`);
  console.log('shot', `${round}_${name}`, Math.round((Date.now() - t0) / 1000), 's');
}
await browser.close();
