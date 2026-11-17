// Pictures of Castle Velscour's wards as the game draws them (src/core/delve-castle.js), for the critics and the owner: the
// player set down in a room with the game's no-damage cheat, the hour noon, a camera held on a view of the room, and the
// canvas saved without the HUD. Each shot: a room to stand in, and an eye and a point it looks at, local to the ward.
//   node tools/phobos/castle_shots.mjs                 every shot
//   node tools/phobos/castle_shots.mjs mw_hall mw_rooms  just those
//   PORT=<8481>  WAIT=<ms after each move, 7000>
// Needs the server (python tools/serve.py 8481 --no-open) and Playwright's Chromium. Saves tools/build/shots/<name>.png.
import { createRequire } from 'node:module';
import { delveByKey } from '../../src/core/dungeon.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WAIT = +(process.env.WAIT || 7000);

// [name, ward, room to stand in, eye [x, up, z], looking at [x, up, z]] (up: over the ward's own floor height).
const SHOTS = [
  ['lw_mgate', 'lowerward', 'cl_mgate', [49, 14.2, -132], [49, 15.5, -152]],
  ['mw_gate', 'middleward', 'cm_gate', [-5.5, 2, -4], [4, 4, -46]],
  ['mw_court', 'middleward', 'cm_court', [19, 3.2, -33], [-10, 4, -60]],
  ['mw_hall', 'middleward', 'cm_screens', [-54, 4.2, -62], [-98, 2.6, -55]],
  ['mw_gallery', 'middleward', 'cm_gallery', [12, 1.9, -70], [12, 2.8, -132]],
  ['mw_maps', 'middleward', 'cm_maps', [44, 3, -88.5], [58, 0.6, -101]],
  ['mw_horns', 'middleward', 'cm_horns', [64, 2.2, -117], [64, 9, -168]],
  ['mw_library', 'middleward', 'cm_library', [24, 5.5, -134], [2, 2.5, -172]],
  ['mw_stacks', 'middleward', 'cm_stacks', [-10, 2.2, -176], [14, 2.4, -194]],
  ['mw_still', 'middleward', 'cm_still', [-34, 2.4, -111.5], [-52, 0.8, -126]],
  ['mw_conserv', 'middleward', 'cm_conserv', [-46, 2.6, -156], [-66, 3, -181]],
  // (Last: the household are loaded late, as the crowd is, once you're on your way to Phobos.)
  ['mw_rooms', 'middleward', 'cm_rooms', [36.4, 2.3, -155.5], [47, 0.9, -165]],
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
await page.evaluate('bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; bm.skills("level", 80);');
for (const [name, ward, room, eye, at] of which) {
  const d = delveByKey(ward), Y = d.y;
  const c = cam(d.x + eye[0], Y + eye[1], d.z + eye[2], d.x + at[0], Y + at[1], d.z + at[2]);
  await page.evaluate(`bm.warrens('room', { room: ${JSON.stringify(room)} }); bm.setTime(12); bm.setCam(${JSON.stringify(c)});`);
  await page.waitForTimeout(WAIT);
  try {
    await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify(name)}))`), new Promise((_, r) => setTimeout(() => r(new Error('timed out')), 120000))]);
    console.log('shot', name);
  } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); }
}
await b.close();
