// Pictures of City State Phobos out on the land as the game draws it, for the critics and the owner: the player set down
// at a spot (bm.cmd(19, 0, x, z)), the hour set, a camera held, the canvas saved without the HUD.
//   node tools/phobos/city_shots.mjs [names]      PORT=<8481>  WAIT=<ms after each move, 12000>  HOUR=<12>  EVAL=<js, logged>
// Needs the server (python tools/serve.py 8481 --no-open) and Playwright's Chromium. Saves tools/build/shots/<name>.png.
import { createRequire } from 'node:module';
import { terrainHeight } from '../../src/core/terrain.js';
import { castleTowers } from '../../src/core/phobos-build.js';
import { PLAIN } from '../../src/core/east.js';

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
  // (Pass 2, on the streets themselves: a point a way along one, looking on down it.)
  ['p2_mile', [9655, -30], [9655, 2, -30], [9830, 5, -80]],
  ['p2_mile_e', [10010, 20], [10010, 2, 20], [10200, 8, 120]],
  ['p2_ash', [9600, -300], [9600, 2, -300], [9640, 4, -380]],
  ['p2_low', [9720, 370], [9720, 2, 370], [9800, 4, 400]],
  ['p2_loop', [10435, -290], [10435, 2, -290], [10520, 6, -200]],
  ['p2_loop_up', [10435, -290], [10440, 14, -300], [10475, 0, -250]],
  ['p2_quay', [9905, -100], [9905, 2.5, -100], [9890, 3, -300]],
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
  ['castle_deck', [11181, -139], [11181, 173.2, -139], [11268, 225, -168]],
  ['castle_deck_city', [11237, -168], [11237, 226.7, -168], [10300, 40, -60]],
  ['castle_sally', [11392, 20], [11392, 4, 20], [11366, 9, 18.4]],
  ['castle_terrace', [11590, 30], [11600, 3, 40], [11300, 260, 0]],
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
// The castle's towers, Needles and bridges (src/core/phobos-build.js castleTowers): eyes at heights over the plain.
{ const { towers, bridges } = castleTowers(), T = Object.fromEntries(towers.map((t) => [t.key, t])), A = (x, h, z) => [x, PLAIN + h - terrainHeight(x, z), z];
  // (From its lip on the side of what's looked at, a pace in from the parapet.)
  const deck = (k, dx, dz, to) => { const t = T[k], re = (t.square ? t.r * 1.36 : t.r) + 4.2, a = Math.atan2(to[2] - t.z, to[0] - t.x); return [`kt_deck_${k}`, [t.x, t.z], A(t.x + Math.cos(a) * re, t.deck + 1.75, t.z + Math.sin(a) * re), to]; };
  SHOTS.push(
    ['kt_north', [11180, -400], A(11150, 330, -470), A(11260, 440, 0)],
    ['kt_east', [11600, 40], A(11680, 430, 60), A(11300, 470, 0)],
    ['kt_south', [11150, 330], A(11120, 300, 400), A(11300, 470, 60)],
    ['kt_yard_up', [10830, 0], [10805, 3.2, 3], A(11215, 430, 0)],
    deck('gallows', -11, 4, A(11215, 560, 0)), deck('red', -9, -9, A(11215, 600, 0)), deck('sat4', -13, 0, A(10500, 60, 0)), deck('clock', -14, 0, A(10300, 40, 0)),
    (() => { const b = bridges.find((q) => q.from === 'gallows' && q.to === 'thorn'), u = 0.3, v = 0.7, at = (k) => [b.a[0] + (b.b[0] - b.a[0]) * k, b.a[2] + (b.b[2] - b.a[2]) * k], [ex, ez] = at(u), [lx, lz] = at(v), y = (b.a[1] + b.b[1]) / 2 - PLAIN + b.arch * 0.84; return ['kt_bridge', [ex, ez], A(ex, y + 1.8, ez), A(lx, y + 3, lz)]; })(),
    (() => { const t = T.sat8, c = Math.cos(t.ta), s = Math.sin(t.ta); return ['kt_turret', [t.tx + c * 12, t.tz + s * 12], [t.tx + c * 13 - s * 5, 2.4, t.tz + s * 13 + c * 5], [t.x, 16, t.z]]; })(),
    (() => { const t = T.sat8, a = t.ta + Math.PI + 1.2, y = t.from - PLAIN + 9 * 1.19; return ['kt_stair', [t.tx, t.tz], A(t.tx + Math.cos(a) * 2.7, y + 1.7, t.tz + Math.sin(a) * 2.7), A(t.tx + Math.cos(a + 1.3) * 2.9, y + 2.6, t.tz + Math.sin(a + 1.3) * 2.9)]; })(),
    ['kt_patio', [10980, 0], A(10975, 302, 30), A(11215, 420, 0)],
    ['kt_needle', [T.gallows.x, T.gallows.z], A(T.gallows.x - 62, T.gallows.deck + 12, T.gallows.z + 24), A(T.gallows.x, T.gallows.deck + 6, T.gallows.z)],
    ['kt_needle_far', [T.gallows.x, T.gallows.z], A(T.gallows.x - 150, T.gallows.deck - 40, T.gallows.z + 60), A(T.gallows.x, T.gallows.deck - 30, T.gallows.z)],
  ); }
// The rest of the world, for the once-over (docs/WORLD-PASS.md): the town, the roads, the small towns and the far places.
// [name, stand at [x, z], eye [x, up, z], looking at [x, up, z]], heights over the ground there.
SHOTS.push(
  ['wd_bellmourn', [0, 40], [0, 2, 46], [0, 6, -20]],
  ['wd_bellmourn_e', [0, -30], [4, 2, -44], [0, 5, 20]],
  ['wd_road_e', [1726, 168], [1726, 3, 168], [2041, 8, -7]],
  ['wd_woods', [-300, -260], [-300, 2.2, -260], [-380, 6, -330]],
  ['wd_thornwick', [2400, 1880], [2400, 3, 1890], [2400, 6, 1800]],
  ['wd_cinderford', [-2100, -120], [-2100, 3, -110], [-2100, 6, -200]],
  ['wd_frostwatch', [700, 3980], [700, 3, 3990], [700, 6, 3900]],
  ['wd_belltower', [2440, -450], [2440, 3, -440], [2440, 20, -540]],
  ['wd_abbey', [3950, -2780], [3950, 3, -2770], [3950, 10, -2880]],
  ['wd_fen', [-250, -3280], [-250, 3, -3270], [-250, 2, -3400]],
  ['wd_keep', [-4760, 128], [-4740, 8, 128], [-4900, 30, 180]],
  ['wd_barrows', [-2900, 3520], [-2900, 3, 3530], [-2900, 4, 3400]],
  ['wd_barrows_e', [-2830, 3380], [-2830, 3, 3380], [-2900, 5, 3405]],
  ['wd_sill', [9000, -100], [9000, 12, -100], [9700, 40, 0]],
);
const asked = process.argv.slice(2), which = asked.length ? SHOTS.filter((s) => asked.includes(s[0])) : SHOTS;
// (On Windows the machine's own GPU by D3D11: the software Vulkan the Linux container wants gives no adapter there.)
const b = await chromium.launch({ args: process.platform === 'win32' ? ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-features=Vulkan,WebGPU', '--disable-dawn-features=use_dxc'] : ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
if (process.env.CONSOLE) page.on('console', (m) => { if (/error|warn/i.test(m.type()) || /wgsl|shader/i.test(m.text())) console.log('CONSOLE', m.type(), m.text().slice(0, 400)); });
await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate('bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; if (bm.view.questTrail) bm.view.questTrail.off = true;');
for (const [name, at, eye, look] of which) {
  const c = cam(eye[0], terrainHeight(eye[0], eye[2]) + eye[1], eye[2], look[0], terrainHeight(look[0], look[2]) + look[1], look[2]);
  await page.evaluate(`bm.cmd(19, 0, ${at[0]}, ${at[1]}); bm.setTime(${HOUR}); bm.setCam(${JSON.stringify(c)});`);
  await page.waitForTimeout(WAIT);
  // (And till the near cells asked for have come back from their thread, and no more are wanted: src/gfx/phobos-near.js.)
  for (let k = 0; k < 40; k++) { const busy = await page.evaluate('(() => { const n = bm.view.renderer.phobosNear; return !!n && (!!n.asked || !!n.built); })()'); if (!busy && k) break; await page.waitForTimeout(1500); }
  // (EVAL=<js>: a value read off the page before the shot, to see what's going on there.)
  if (process.env.EVAL) console.log(name, 'EVAL', JSON.stringify(await page.evaluate(process.env.EVAL)));
  try {
    await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify(name)}))`), new Promise((_, r) => setTimeout(() => r(new Error('timed out')), +(process.env.SHOT_MS || 180000)))]);
    console.log('shot', name);
  } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); }
}
await b.close();
