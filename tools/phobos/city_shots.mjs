// Pictures of City State Phobos out on the land as the game draws it, for the critics and the owner: the player set down
// at a spot (bm.cmd(19, 0, x, z)), the hour set, a camera held, the canvas saved without the HUD.
//   node tools/phobos/city_shots.mjs [names]      PORT=<8481>  WAIT=<ms after each move, 12000>  HOUR=<12>
// Needs the server (python tools/serve.py 8481 --no-open) and Playwright's Chromium. Saves tools/build/shots/<name>.png.
import { createRequire } from 'node:module';
import { terrainHeight } from '../../src/core/terrain.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WAIT = +(process.env.WAIT || 12000), HOUR = +(process.env.HOUR || 12);
// [name, stand at [x, z], eye [x, up over the ground there, z], looking at [x, up over the ground there, z]]
const SHOTS = [
  ['city_moat_w', [9290, 60], [9290, 9, 60], [9330, 0, -40]],
  ['city_moat_n', [9700, -700], [9690, 10, -712], [9760, 2, -760]],
  ['city_slough', [9872, -200], [9885, 6, -150], [9862, 0, -300]],
  ['city_slough_top', [9912, 150], [9920, 7, 120], [9905, 0, 220]],
  ['city_weir', [9866, -410], [9868, 7, -428], [9860, 1, -330]],
  ['city_weir_low', [9862, -345], [9864, 3.2, -352], [9860, 2, -323]],
  ['city_quay', [9900, 150], [9892, 2.2, 150], [9912, 0.5, 190]],
  ['sv_approach_edge', [10560, 0], [10540, 6, 14], [10600, 2, 16]],
  ['sv_causeway', [10700, 30], [10680, 16, 60], [10760, 4, 14]],
  ['sv_cinder', [9600, -300], [9600, 1.8, -300], [9640, 4, -380]],
  ['sv_rookeries', [9600, 270], [9600, 1.8, 270], [9640, 4, 340]],
  ['sv_market', [9760, -50], [9760, 1.8, -50], [9830, 4, -80]],
  ['sv_mages', [10300, -420], [10300, 1.8, -420], [10350, 5, -380]],
  ['sv_dukes', [10460, 330], [10460, 1.8, 330], [10400, 5, 420]],
  ['sv_bones', [9900, -560], [9900, 1.8, -560], [10000, 4, -600]],
  ['sv_bank', [10050, 250], [10050, 3, 250], [10150, 14, 200]],
  ['sv_approach_top', [10600, 20], [10590, 30, 45], [10610, 0, 18]],
  ['sv_night', [9560, 200], [9560, 1.8, 200], [9640, 4, 340]],
  ['sv_overview', [9700, 0], [9700, 60, 0], [10200, 0, 0]],
  ['city_mile', [9500, 0], [9500, 2.2, 0], [9600, 6, 0]],
  ['city_street', [9700, -250], [9700, 2.2, -250], [9760, 5, -290]],
  ['city_castle', [10600, 0], [10600, 12, 0], [10900, 120, 0]],
  ['castle_gate', [10720, 0], [10722, 4, 5], [10790, 30, -4]],
  ['castle_gate_side', [10730, -60], [10735, 6, -75], [10790, 26, 0]],
  ['castle_yard', [10830, 0], [10800, 3.2, 3], [10900, 14, -6]],
  ['castle_up_p', [10830, 0], [10800, 3.2, 3], [10880, 55, 50]],
  ['castle_up_n', [10830, 0], [10800, 3.2, 3], [10880, 55, -50]],
  ['keep_face', [10900, 0], [10960, 90, 70], [11120, 130, 10]],
  ['castle_mark', [10870, 6], [10872, 3, 9], [10904, 7, 0]],
  ['castle_yard_n', [10840, 20], [10822, 3, 14], [10868, 4, 58]],
  ['castle_yard_s', [10840, -20], [10816, 4, -16], [10870, 3, -60]],
  ['castle_yard_back', [10880, 30], [10890, 3, 40], [10783, 40, 0]],
  ['castle_city', [10320, -160], [10320, 40, -160], [11000, 260, 0]],
  ['city_castle_far', [9980, 0], [9980, 30, 0], [10900, 200, 0]],
];
function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}
const asked = process.argv.slice(2), which = asked.length ? SHOTS.filter((s) => asked.includes(s[0])) : SHOTS;
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate('bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; if (bm.view.questTrail) bm.view.questTrail.off = true;');
for (const [name, at, eye, look] of which) {
  const c = cam(eye[0], terrainHeight(eye[0], eye[2]) + eye[1], eye[2], look[0], terrainHeight(look[0], look[2]) + look[1], look[2]);
  await page.evaluate(`bm.cmd(19, 0, ${at[0]}, ${at[1]}); bm.setTime(${HOUR}); bm.setCam(${JSON.stringify(c)});`);
  await page.waitForTimeout(WAIT);
  try {
    await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify(name)}))`), new Promise((_, r) => setTimeout(() => r(new Error('timed out')), 180000))]);
    console.log('shot', name);
  } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); }
}
await b.close();
