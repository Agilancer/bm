// Every delve photographed as a player meets it, for the dungeon once-over and its critics: for each delve its boss rooms,
// its biggest other room and its longest passage (or every room with ALL=1), each from where a player walks in, at a
// player's height, looking down the room; and the same room from up near its roof looking down at its floor (HIGH=1 only).
// The packs are left as they are, so what stands in a room is seen standing on its floor (or not).
//   node tools/dungeon/survey.mjs                       every delve
//   node tools/dungeon/survey.mjs westdrains vaults     just those
//   PORT=<8611> WAIT=<ms after each move, 4500> ALL=1 HIGH=1 OUT=<prefix, sv>
// Needs the server (python tools/serve.py 8611 --no-open) and Playwright (NODE_PATH at the global node_modules).
// Saves tools/build/shots/<OUT>_<delve>_<room>.png, and prints what it shot.
import { createRequire } from 'node:module';
import { BOSSES, DELVES, caveFloorY, caveRoofY } from '../../src/core/dungeon.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const WAIT = +(process.env.WAIT || 4500), OUT = process.env.OUT || 'sv';

function cam(ex, ey, ez, tx, ty, tz) {
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}

// The rooms worth a picture in a delve: its bosses', its biggest other, its longest passage, its way in.
function pick(d) {
  if (process.env.ALL) return d.rooms;
  const area = (r) => (r.hx !== undefined ? r.hx * r.hz * 4 : Math.PI * r.r * r.r);
  const boss = new Set(BOSSES.filter((b) => b.delve === d.key).map((b) => b.room));
  const out = d.rooms.filter((r) => boss.has(r.id));
  const rest = d.rooms.filter((r) => !boss.has(r.id));
  const big = [...rest].sort((a, b) => area(b) - area(a))[0];
  const long = rest.filter((r) => r.hx !== undefined && Math.max(r.hx, r.hz) / Math.min(r.hx, r.hz) > 4).sort((a, b) => Math.max(b.hx, b.hz) - Math.max(a.hx, a.hz))[0];
  for (const r of [d.rooms[0], big, long]) if (r && !out.includes(r)) out.push(r);
  return out;
}

// A player's eye in a room: in from one end (or a cave's edge), 1.9 m up, looking down its length at chest height.
function eyes(d, r) {
  const X = d.x + r.x, Z = d.z + r.z;
  let ex, ez, tx, tz;
  // (The way in, where the portal stands at one end: from its middle, so the eye isn't inside the portal's stone.)
  if (r === d.rooms[0] && r.hx !== undefined) { ex = X; ez = Z - 3; tx = X; tz = Z - Math.max(r.hz, 6) - 3; }
  else if (r.hx === undefined) { ex = X + r.r * 0.55; ez = Z + r.r * 0.55; tx = X - r.r * 0.3; tz = Z - r.r * 0.3; }
  else if (r.hz >= r.hx) { ex = X + r.hx * 0.35; ez = Z + r.hz - Math.min(4, r.hz * 0.3); tx = X - r.hx * 0.1; tz = Z - r.hz * 0.6; }
  else { ex = X + r.hx - Math.min(4, r.hx * 0.3); ez = Z + r.hz * 0.35; tx = X - r.hx * 0.6; tz = Z - r.hz * 0.1; }
  const ey = caveFloorY(ex, ez) + 1.9, ty = caveFloorY(tx, tz) + 1.4;
  const shots = [['', cam(ex, Math.min(ey, caveRoofY(ex, ez) - 0.4), ez, tx, ty, tz)]];
  if (process.env.HIGH) {
    const R = r.hx === undefined ? r.r : Math.max(r.hx, r.hz), hy = Math.min(caveRoofY(ex, ez) - 1, caveFloorY(ex, ez) + Math.min(9, R * 0.7));
    shots.push(['_hi', cam(ex, hy, ez, X, caveFloorY(X, Z) + 0.5, Z)]);
  }
  return shots;
}

// (And close looks at what the once-over made, by the props themselves: [delve, name, prop kind, n-th of it, from, height].)
const CLOSE = [['kingsbarrow', 'seal_candles', 'candles', 0, [4, 2.4], 1.7], ['kingsbarrow', 'queens_candles', 'candles', 6, [-2, 3], 1.6],
  ['vaults', 'boards', 'boards', 0, [3, 4], 1.8], ['westdrains', 'grate', 'streetgrate', 1, [4, 3], 1.7], ['westdrains', 'outfall', 'outfall', 0, [1.5, 3.5], 1.6],
  ['undercroft', 'jar', 'glassjar', 0, [3, 4], 1.8], ['westdrains', 'cocoon', 'cocoon', 0, [4, 3], 2.2], ['mirrors', 'mirror', 'bigmirror', 0, [0, 5], 1.8],
  ['highward', 'oculus', 'daylight', 0, [5, 4], 1.7]];
function closeUps(d) {
  const out = [];
  for (const [key, name, kind, n, [ox, oz], up] of CLOSE) {
    if (key !== d.key) continue;
    const p = d.props.filter((q) => q.kind === kind)[n]; if (!p) continue;
    // (Offsets are in the prop's own frame where it faces a way (yaw): oz out the way it faces.)
    const yw = p.yaw || 0, X = d.x + p.x, Z = d.z + p.z, ex = X + ox * Math.cos(yw) + oz * Math.sin(yw), ez = Z - ox * Math.sin(yw) + oz * Math.cos(yw), fy = caveFloorY(X, Z);
    const ty = kind === 'daylight' || kind === 'streetgrate' ? Math.min(caveRoofY(X, Z) - 1, fy + 6) : kind === 'cocoon' ? fy + 3 : kind === 'outfall' ? fy + 1 : kind === 'bigmirror' ? fy + 2.5 : kind === 'glassjar' ? fy + 1.6 : fy + 0.6;
    out.push([name, cam(ex, caveFloorY(ex, ez) + up, ez, X, ty, Z), d.rooms[0].id]);
  }
  return out;
}

const asked = process.argv.slice(2), which = asked.length ? DELVES.filter((d) => asked.includes(d.key)) : DELVES;
const WIN = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-features=Vulkan,WebGPU', '--disable-dawn-features=use_dxc'];
const SOFT = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'];
const b = await chromium.launch({ args: process.platform === 'win32' ? WIN : SOFT });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
await page.goto(`http://localhost:${process.env.PORT || 8611}/?auto&noopening&timer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 900000, polling: 1000 });
await page.evaluate('window.__reviewShots = "calm"; bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; bm.skills("level", 120); if (bm.view.questTrail) bm.view.questTrail.off = true;');
for (const d of which) {
  for (const r of pick(d)) {
    for (const [tag, c] of eyes(d, r)) {
      const name = `${OUT}_${d.key}_${r.id}${tag}`;
      await page.evaluate(`bm.warrens('room', { room: ${JSON.stringify(r.id)} }); bm.setTime(12); bm.setCam(${JSON.stringify(c)});`);
      await page.waitForTimeout(WAIT);
      try {
        await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify(name)}))`), new Promise((_, rj) => setTimeout(() => rj(new Error('timed out')), 120000))]);
        console.log('shot', name, '|', d.name, '|', r.name || r.id);
      } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); }
    }
  }
  for (const [nm, c] of closeUps(d)) {
    const name = `${OUT}_${d.key}_zz_${nm}`;
    // (To the prop's own spot: the nearest room's middle first, so the place round it is streamed in.)
    const room = d.rooms.reduce((a, r) => (Math.hypot(d.x + r.x - c.x, d.z + r.z - c.z) < Math.hypot(d.x + a.x - c.x, d.z + a.z - c.z) ? r : a), d.rooms[0]);
    await page.evaluate(`bm.warrens('room', { room: ${JSON.stringify(room.id)} }); bm.setTime(12); bm.setCam(${JSON.stringify(c)});`);
    await page.waitForTimeout(WAIT);
    try {
      await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify(name)}))`), new Promise((_, rj) => setTimeout(() => rj(new Error('timed out')), 120000))]);
      console.log('shot', name, '|', d.name, '| close look:', nm);
    } catch (e) { console.log('FAILED', name, String(e).slice(0, 200)); }
  }
}
await b.close();
