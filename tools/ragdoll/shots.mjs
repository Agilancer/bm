// Bodies falling, photographed in the game itself: each stood in the open, killed by a blow from where you stand, and
// pictured as it goes over and where it lies.
//   node tools/ragdoll/shots.mjs [names...]      (every scene below unless told)
//   PORT=<8630>  SHOW=1 (a window you can watch)
// Needs the server (python tools/serve.py 8630) and Playwright's Chromium. Saves tools/build/shots/ragdoll_<name>_<n>.png.
import { createRequire } from 'node:module';
import { C, C_SIZE, CHARS_START, MAX_CHARS } from '../../src/core/layout.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
// name, what (a knight's place in the sim's list, or t<n>: the nth Tripo monster in roster.json), its height.
const SCENES = [['knight', 0, 2.1], ['ogre', 39, 2.6], ['necromancer', 41, 1.8], ['goblin', 't0', 1.3], ['velscour', 't21', 2], ['giant', 't10', 3.2], ['werewolf', 't66', 2.2],
  ['spider', 't62', 1.6], ['dragon', 't60', 5], ['stag', 5, 2.6], ['crab', 2, 1.6]];
const asked = process.argv.slice(2), which = asked.length ? SCENES.filter((s) => asked.includes(s[0])) : SCENES;
const AT = [1880, 880];

function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}

const b = await chromium.launch({ headless: false, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--no-sandbox', ...(process.env.SHOW ? [] : ['--window-position=-3000,0'])] });
const page = await b.newPage({ viewport: { width: 1100, height: 700 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${process.env.PORT || 8630}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate('bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; bm.setTime(12); bm.cmd(2);');     // (nothing walks off: the sim's bodies are held still, and still die)
const shot = async (name) => { try { await Promise.race([page.evaluate(`bm.shot(${JSON.stringify(name)})`), new Promise((_, r) => setTimeout(() => r(new Error('shot timed out')), 60000))]); } catch (e) { console.log('FAILED', name, e.message); } };
let n = 0;
for (const [name, what, h] of which) {
  // Each on fresh ground a little way on from the last, the player 7 m off to one side, the eye square to the blow.
  const px = AT[0] + n * 14, pz = AT[1], x = px, z = pz - 7;
  n++;
  await page.evaluate(`bm.cmd(19, 0, ${px}, ${pz})`);
  await page.waitForTimeout(400);
  if (typeof what === 'string') await page.evaluate(`bm.cmd(24, ${what.slice(1)}, ${x}, ${z})`);
  else await page.evaluate(`bm.cmd(7, ${what}, ${x}, ${z})`);
  await page.waitForTimeout(typeof what === 'string' ? 6000 : 1500);
  // Where it really stands: the body nearest the spot, off the snapshot.
  const at = await page.evaluate(`(() => { const s = bm.snap(); let best = null, bd = 30; for (let i = 0; i < ${MAX_CHARS - 1}; i++) { const o = ${CHARS_START} + i * ${C_SIZE}; if (!s[o + ${C.ACTIVE}]) continue; const d = Math.hypot(s[o + ${C.X}] - ${x}, s[o + ${C.Z}] - ${z}); if (d < bd) { bd = d; best = [s[o + ${C.X}], s[o + ${C.Y}], s[o + ${C.Z}]]; } } return best; })()`);
  if (!at) { console.log('nothing stood for', name); continue; }
  const [bx, by, bz] = at;
  // (From the side and a little above, the blow coming from the right of the picture.)
  const c = cam(bx + h * 1.9, by + h * 0.8, bz - h * 0.9, bx, by + h * 0.35, bz - h * 0.45);
  await page.evaluate(`bm.setCam(${JSON.stringify(c)})`);
  await page.waitForTimeout(500);
  await shot(`ragdoll_${name}_0`);
  await page.evaluate(`bm.cmd(27, ${typeof what === 'string' ? -1 : what}, 45)`);
  let t = 0, i = 1;
  for (const at of [150, 450, 1000, 3500]) { await page.waitForTimeout(at - t); t = at; await shot(`ragdoll_${name}_${i++}`); t += 250; }
  console.log('shot', name);
}
await b.close();
