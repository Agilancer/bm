// A boss's fight photographed from up under its room's roof, to see what it marks on the floor as the game draws it: in
// at its door with nothing able to hurt you, into the room, and three pictures a few seconds apart, the boss put down to
// 60% and then 30% of its life on the way so its later tricks come round. Alone unless PARTY=1 (a hired party of four).
//   node tools/dungeon/shots.mjs bloat sallow ...     (bosses' keys; every boss of the later four delves unless told)
//   EVERY=<ms before each picture, 5000>  PARTY=1  PORT=<8481>
// Needs the server (python tools/serve.py 8481) and Playwright's Chromium. Saves tools/build/shots/fight_<boss>_<n>.png.
import { createRequire } from 'node:module';
import { BOSSES, DELVES, caveFloorY, caveRoofY, roomOf, roomSpot } from '../../src/core/dungeon.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const later = new Set(DELVES.slice(3).map((d) => d.key));
const asked = process.argv.slice(2);
const which = asked.length ? asked.map((k) => BOSSES.find((b) => b.key === k)).filter(Boolean) : BOSSES.filter((b) => later.has(b.delve));
const every = +(process.env.EVERY || 5000);

function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}

const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
for (const boss of which) {
  // (The game afresh for each: a fight left standing would hold up the next one's.)
  const page = await b.newPage({ viewport: { width: 960, height: 600 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
  await page.goto(`http://localhost:${process.env.PORT || 8481}/?auto&noopening&timer`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
  await page.evaluate(`bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; bm.skills("level", 17); ${process.env.PARTY ? 'bm.hire(4);' : ''}`);
  const shot = async (name) => { try { await Promise.race([page.evaluate(`bm.shot(${JSON.stringify(name)})`), new Promise((_, r) => setTimeout(() => r(new Error('shot timed out')), 150000))]); console.log('shot', name); } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); } };
  const r = roomOf(boss.room), [x, , z] = roomSpot(boss.room), y = caveFloorY(x, z);
  const cave = r.hx === undefined, half = cave ? [r.r * 0.72, r.r * 0.72] : [r.hx, r.hz], R = Math.max(half[0], half[1]);
  // (The eye: a corner of a built room under its roof, or well in from a cave's wall, where its roof is still high;
  // looking at the middle of the floor.)
  const ex = x + (cave ? r.r * 0.36 : half[0] * 0.86), ez = z + (cave ? r.r * 0.36 : half[1] * 0.86);
  const c = cam(ex, cave ? Math.min(caveRoofY(ex, ez) - 1.3, y + r.r * 0.8) : y + Math.min(r.roof - 1.2, R * 0.95), ez, x, y + 0.5, z);
  await page.evaluate(`bm.warrens('boss', { boss: ${JSON.stringify(boss.key)} })`);
  await page.waitForTimeout(2500);
  await page.evaluate(`bm.warrens('room', { room: ${JSON.stringify(boss.room)}, dx: ${-half[0] * 0.45}, dz: ${half[1] * 0.45} }); bm.setTime(12); bm.setCam(${JSON.stringify(c)});`);
  // (Its life set down a step before each picture, so its later turns come. Alone, you don't hurt it: with PARTY=1 the
  // party does, and may finish it while a picture's being saved.)
  let n = 0;
  for (const frac of [0, 0.6, 0.3]) {
    if (frac) await page.evaluate(`bm.warrens('hurt', { boss: ${JSON.stringify(boss.key)}, frac: ${frac} })`);
    await page.waitForTimeout(every);
    const st = await page.evaluate(`(() => { bm.setCam(${JSON.stringify(c)}); const w = bm.view.party.warrens, f = w?.fight; return { fight: f ? f.boss + ' ' + Math.round(f.t) + 's ' + f.bodies.map((q) => Math.round(q.hp * 100) + '%').join(',') : null, marks: w?.hazards?.map((h) => h.shape).join(',') || '', order: f?.order ? JSON.stringify(f.order).slice(0, 60) : '' }; })()`);
    await shot(`fight_${boss.key}_${++n}`);
    console.log('  ', JSON.stringify(st));
  }
  await page.close();
}
await b.close();
