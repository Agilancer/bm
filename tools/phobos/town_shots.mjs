// Pictures of Phobos's streets and roofs, for the houses' and the streets' dress (src/core/phobos-houses.js): as
// tools/phobos/city_shots.mjs, but in the machine's own Chrome on its own graphics card (Playwright's Chromium has no
// D3D12 shader compiler on Windows, and its software renderer never gets the game up here), and an eye may be given a
// height of its own (a fourth number, true: y as it stands, not over the ground).
//   node tools/phobos/town_shots.mjs [names]   PORT=<8493>  WAIT=<12000>  HOUR=<15>  OUT=<folder under tools/build/shots>
// Needs the server (python tools/serve.py 8493 --no-open), Playwright, and Chrome. Saves tools/build/shots/<name>.png.
import { createRequire } from 'node:module';
import { terrainHeight } from '../../src/core/terrain.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WAIT = +(process.env.WAIT || 12000), HOUR = +(process.env.HOUR || 15);
// [name, stand at [x, z], eye [x, up, z, abs?], looking at [x, up, z, abs?]]
const SHOTS = [
  // (The streets, as tools/phobos/city_shots.mjs has them.)
  ['sv_cinder', [9600, -300], [9600, 1.8, -300], [9640, 4, -380]],
  ['sv_rookeries', [9600, 270], [9600, 1.8, 270], [9640, 4, 340]],
  ['sv_market', [9760, -50], [9760, 1.8, -50], [9830, 4, -80]],
  ['sv_mages', [10300, -420], [10300, 1.8, -420], [10350, 5, -380]],
  ['sv_dukes', [10460, 330], [10460, 1.8, 330], [10400, 5, 420]],
  ['p2_mile', [9655, -30], [9655, 2, -30], [9830, 5, -80]],
  ['p2_low', [9720, 370], [9720, 2, 370], [9800, 4, 400]],
  ['sv_overview', [9700, 0], [9700, 60, 0], [10200, 0, 0]],
  // (From over the roofs: the west quarters, the Rookeries and the Wharf, Dukes' Row.)
  ['tn_above_w', [9700, -100], [9690, 75, -160], [9800, 0, 20]],
  ['tn_above_s', [9700, 330], [9640, 70, 280], [9800, 0, 420]],
  ['tn_above_e', [10380, 380], [10300, 80, 320], [10450, 0, 460]],
  // (The one-off houses: a tavern, a guildhall, a tower-house, a burnt shell; the Tanners' Steps; a toll-house on the Slough.)
  ['tn_tavern', [9757, -60], [9756, 2, -61], [9763, 6, -46]],
  ['tn_guildhall', [9708, -44], [9710, 2.2, -43], [9701, 5, -59]],
  ['tn_towerhouse', [9938, -22], [9939.5, 2, -24.5], [9931, 16, -9]],
  ['tn_shell', [9775, 492], [9777, 2.5, 490], [9767, 6, 504]],
  ['tn_tanners', [10106, 578], [10104, 2, 577], [10122, 5, 593]],
  ['tn_toll', [9864, -372], [9864, 59.5, -368, true], [9864, 61, -390.5, true]],
  ['tn_toll_in', [9850, -390.5], [9853, 59.6, -390.5, true], [9870, 60, -390.5, true]],
  ['tn_night', [9655, -30], [9655, 2, -30], [9830, 5, -80], 22],
  ['tn_tavern_night', [9757, -60], [9755, 2, -63], [9763, 5, -46], 21.5],
  ['tn_dukes', [10469, 329], [10461.7, 2, 338.5], [10477, 6, 335]],
  ['tn_above_night', [9700, -100], [9690, 75, -160], [9800, 0, 20], 22],
];

function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}
const yOf = ([x, up, z, abs]) => (abs ? up : terrainHeight(x, z) + up);

const asked = process.argv.slice(2), which = asked.length ? SHOTS.filter((s) => asked.includes(s[0])) : SHOTS;
const b = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
if (process.env.CONSOLE) page.on('console', (m) => { if (/error|warn/i.test(m.type()) || /wgsl|shader/i.test(m.text())) console.log('CONSOLE', m.type(), m.text().slice(0, 400)); });
await page.goto(`http://localhost:${process.env.PORT || 8493}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 300000, polling: 1000 });
await page.evaluate('bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; if (bm.view.questTrail) bm.view.questTrail.off = true;');
for (const [name, at, eye, look, hour] of which) {
  const c = cam(eye[0], yOf(eye), eye[2], look[0], yOf(look), look[2]);
  await page.evaluate(`bm.cmd(19, 0, ${at[0]}, ${at[1]}); bm.setTime(${hour ?? HOUR}); bm.setCam(${JSON.stringify(c)});`);
  await page.waitForTimeout(WAIT);
  try {
    await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify((process.env.OUT ? process.env.OUT + '_' : '') + name)}))`), new Promise((_, r) => setTimeout(() => r(new Error('timed out')), 60000))]);
    console.log('shot', name);
  } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); }
}
await b.close();
