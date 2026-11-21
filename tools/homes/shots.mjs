// Pictures from inside the houses: Phobos's (src/core/phobos-build.js houseNear, src/core/phobos-rooms.js) and Bellmourn's
// (tools/interior/build_interior.py homes()), room by room, for the houses pass (docs/HOMES.md). In the machine's own
// Chrome on its own graphics card, as tools/phobos/town_shots.mjs.
//   node tools/homes/shots.mjs <spec> [<spec> ...]   PORT=<8497> WAIT=<9000> HOUR=<14> OUT=<prefix> FOV=<78>
// A spec: ph:<house index>:<view>[:hour] or vil:<home 0-14>:<view>[:hour], or bed:<crowd id>[:hour] (over where one of
// Phobos's crowd sleeps, src/folk/phobos-homes.js, from the foot of the bed and above).
//   Phobos views: g (the ground floor, or its street room, from the front corner), h (the hall behind, from its doorway, to
//   the hearth), gb (the ground floor from the back, to the door), u (upstairs, the back chamber from the stair head), uf
//   (upstairs, the front chamber), ub (upstairs from the back), st (the stair from its foot), out (the front from the street)
//   Bellmourn views: g, gb, u, ub, out
// A Phobos camera's kept out of the furniture (the plan's pieces, half a metre round). Saves tools/build/shots/<OUT_><name>.png.
// Needs the server (python tools/serve.py 8497 --no-open) and Playwright (NODE_PATH to the global node_modules).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { footing, phobosHouses, upstairs } from '../../src/core/phobos-build.js';
import { eavesOf } from '../../src/core/phobos-houses.js';
import { roomPlan } from '../../src/core/phobos-rooms.js';
import { bedOf } from '../../src/folk/phobos-homes.js';

const require = createRequire(import.meta.url);
const WAIT = +(process.env.WAIT || 9000), HOUR = +(process.env.HOUR || 14), FOV = +(process.env.FOV || 78) * Math.PI / 180;
const WALL = 0.45, SW = 1.25;

function cam(e, t) {
  let fx = t[0] - e[0], fy = t[1] - e[1], fz = t[2] - e[2]; const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy, s = Math.sign(uy) || 1;
  return { x: e[0], y: e[1], z: e[2], fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s, fov: FOV };
}

// A Phobos house's views. Its frame: x across it (the stair up its -x wall), w out through its front.
export function phView(i, view) {
  const H = phobosHouses(), h = H[i], F = footing(h), { c, s } = F, f = h.front;
  const P = (lx, ly, w) => [h.x + lx * c + f * w * s, ly, h.z - lx * s + f * w * c];
  const ix = h.hx - WALL, iz = h.hz - WALL, fy = F.hi + 0.1, up = upstairs(h, F), uy = up ? up.uy : fy;
  const plan = roomPlan(h, F, up), pd = plan.part?.down, pu = plan.part?.up, xs = -ix + SW;
  // (Clear of the floor's pieces, and inside the room asked for: the nearest spot to the one wanted.)
  const clear = (lv, x, w, w0 = -iz, w1 = iz) => {
    const its = plan.floors[lv]?.items || [];
    const ok = (px, pw) => px > -ix + 0.3 && px < ix - 0.3 && pw > w0 + 0.3 && pw < w1 - 0.3 && !(lv === 0 && up && px < xs + 0.1 && pw > up.hole[0]) && !(lv === 1 && up && px < xs + 0.1 && pw > up.hole[0] - 0.1 && pw < up.hole[1] + 0.1)
      && its.every((it) => { if (it.k === 'rug' || it.k === 'hanging') return true; const [ax, aw] = it.F[0] === 0 ? [it.hu, it.hv] : [it.hv, it.hu]; return Math.abs(px - it.x) > ax + 0.45 || Math.abs(pw - it.w) > aw + 0.45; });
    for (let r = 0; r < 3; r += 0.15) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * 6.283) * r, pw = w + Math.sin(a / 16 * 6.283) * r; if (ok(px, pw)) return [px, pw]; if (!r) break; }
    return [x, w];
  };
  let e, t;
  const at = (lv, y, x, w, tx, ty, tw, w0, w1) => { const [ex, ew] = clear(lv, x, w, w0, w1); e = P(ex, y, ew); t = P(tx, ty, tw); };
  if (view === 'g') { if (pd) at(0, fy + 1.6, ix - 0.4, pd.w + 0.45, -ix * 0.25, fy + 0.85, iz, pd.w, iz); else at(0, fy + 1.6, ix - 0.4, iz - 0.4, -ix * 0.35, fy + 0.85, -iz); }
  else if (view === 'h') { if (pd) at(0, fy + 1.6, (pd.g0 + pd.g1) / 2, pd.w - 0.5, ix, fy + 0.8, -iz * 0.75, -iz, pd.w); else at(0, fy + 1.6, up ? xs + 0.5 : -ix + 0.5, iz * 0.25, ix, fy + 0.8, -iz * 0.5); }
  else if (view === 'gb') at(0, fy + 1.6, ix - 0.4, -iz + 0.4, -ix * 0.3, fy + 0.95, iz, -iz, pd ? pd.w : iz);
  else if (view === 'u') at(1, uy + 1.6, xs + 0.5, (pu ? pu.w : 0) - 0.4, ix, uy + 0.7, -iz * 0.8, -iz, pu ? pu.w : iz);
  else if (view === 'uf') at(1, uy + 1.6, xs + 0.5, (pu ? pu.w : 0) + 0.4, ix, uy + 0.7, iz * 0.8, pu ? pu.w : -iz, iz);
  else if (view === 'ub') at(1, uy + 1.6, ix - 0.4, -iz + 0.4, -ix * 0.3, uy + 0.85, iz, -iz, pu ? pu.w : iz);
  else if (view.startsWith('at')) {
    // (A camera by hand: at<x>_<w>_<height over the floor>_<to x>_<to w>[_<to height>], the house's own frame, level 0 or 1 by L1.)
    const [x, w, y, tx, tw, ty = 0.9, lv = 0] = view.slice(2).split('_').map(Number), yy = lv ? uy : fy;
    e = P(x, yy + y, w); t = P(tx, yy + ty, tw);
  }
  else if (view === 'tr') {
    // (The trade's own pieces, from across the street room: whatever of them's there, framed from the far side of it.)
    const w0 = pd ? pd.w : -iz, hs = plan.floors[0].items.filter((it) => it.hero && it.w > w0);
    const hx = hs.reduce((a, it) => a + it.x, 0) / (hs.length || 1), hw = hs.length ? hs.reduce((a, it) => a + it.w, 0) / hs.length : iz * 0.5;
    const cands = [[0.2, w0 + 0.7], [0.2, iz - 0.7], [xs + 0.5, (w0 + iz) / 2], [ix - 0.5, w0 + 0.7], [ix - 0.5, iz - 0.7]].map(([x, w]) => clear(0, x, w, w0, iz));
    const [cx, cw] = cands.sort((a, b) => Math.hypot(b[0] - hx, b[1] - hw) - Math.hypot(a[0] - hx, a[1] - hw))[0];
    e = P(cx, fy + 1.65, cw); t = P(hx, fy + 0.95, hw);
  }
  else if (view === 'st') { e = P(xs + 1.3, fy + 1.5, iz - 0.5); t = P(-ix + SW / 2, fy + 2.3, up ? up.hole[0] : 0); }
  else { e = P(h.hx * 0.6, fy + 1.8, h.hz + 9); t = P(0, fy + eavesOf(h) * 0.5, 0); }
  const stand = P(0, 0, h.hz + 1.6);
  return { at: [stand[0], stand[2]], e, t, label: `ph${i} ${h.dk} ${plan.hold.kind}${plan.hold.trade ? ' ' + plan.hold.trade : ''}${up ? '' : ' (one storey)'}` };
}

// A Bellmourn home's views (tools/interior/build_interior.py Home: local z its front, the plan k bigger about the front wall).
const VIL = JSON.parse(readFileSync(new URL('../../assets/game/village.json', import.meta.url))).homes;
const NAMES = ['inn', 'chandler', 'reeve', 'cottage', 'smith', 'alewife', 'barn', 'tannery', 'weaver', 'hunter', 'coffins', 'tower', 'manor', 'bakery', 'herbalist'];
function vilView(i, view) {
  const h = VIL[i], k = h.k || 1, hw = h.w / 2, hd = h.d / 2, ix = hw - 0.12, iz = hd - 0.12, c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  const P = (lx, y, lz) => { const X = lx * k, Z = (lz - hd) * k + hd; return [h.x + X * c + Z * s, y, h.z - X * s + Z * c]; };
  const F = 0.16, U = h.h1 + 0.3;
  const stand = P(0, 0, hd + 2.5);
  let e, t;
  if (view === 'g') { e = P(ix - 0.3, F + 1.55, iz - 0.3); t = P(-ix * 0.3, F + 0.8, -iz); }
  else if (view === 'gb') { e = P(-ix * 0.15, F + 1.6, -iz * 0.3); t = P(ix * 0.25, F + 0.9, iz); }   // (from the middle of the back half: its corner was inside a partition or the stair in six homes, round 3)
  else if (view === 'u') { e = P(ix - 0.3, U + 1.5, iz - 0.3); t = P(-ix * 0.3, U + 0.7, -iz); }
  else if (view === 'ub') { e = P(-ix + 0.3, U + 1.5, -iz + 0.3); t = P(ix * 0.3, U + 0.8, iz); }
  else if (view.startsWith('at')) {
    // (at<lx>_<lz>_<y>[_<from x>_<from z>]: close on a spot on the plan, from 1.4 m off toward the room's middle or the point given.)
    const [lx, lz, y, fx = 0, fz = 0] = view.slice(2).split('_').map(Number), dx = fx - lx, dz = fz - lz, d = Math.hypot(dx, dz) || 1;
    e = P(lx + dx / d * 1.4, y + 0.9, lz + dz / d * 1.4); t = P(lx, y, lz);
  }
  else { e = P(hw * 0.5, 2, hd + 10); t = P(0, 3, 0); }
  return { at: [stand[0], stand[2]], e, t, label: `vil${i} ${NAMES[i]}` };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const specs = process.argv.slice(2);
  if (!specs.length) { console.log('give specs: ph:<i>:<view> or vil:<i>:<view>'); process.exit(1); }
  const jobs = specs.map((sp) => {
    const [kind, i, view = 'g', hour] = sp.split(':');
    if (kind === 'bed') {
      const b = bedOf(i), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), h = phobosHouses()[b.house], f = h.front, w = h.hz + 1.6;
      return { name: `bed_${i}`, hour: /^\d/.test(view) ? +view : 23, at: [h.x + f * w * Math.sin(h.yaw), h.z + f * w * Math.cos(h.yaw)], e: [b.cx + fx * 1.9 - fz * 0.5, b.y + 1.9, b.cz + fz * 1.9 + fx * 0.5], t: [b.cx, b.y, b.cz], label: `${i} in house ${b.house}` };
    }
    const v = kind === 'ph' ? phView(+i, view) : vilView(+i, view);
    return { name: `${kind}${i}_${view}${hour ? '_' + hour : ''}`, hour: hour ? +hour : HOUR, ...v };
  });
  const { chromium } = require('playwright');
  const b = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', String(e).slice(0, 600)));
  await page.goto(`http://localhost:${process.env.PORT || 8497}/?auto&noopening&timer`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 300000, polling: 1000 });
  await page.evaluate('bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true; if (bm.view.questTrail) bm.view.questTrail.off = true;');
  let last = null;
  for (const j of jobs) {
    const c = cam(j.e, j.t);
    const far = !last || Math.hypot(last[0] - j.at[0], last[1] - j.at[1]) > 30;
    await page.evaluate(`bm.cmd(19, 0, ${j.at[0]}, ${j.at[1]}); bm.setTime(${j.hour}); bm.setCam(${JSON.stringify(c)});`);
    await page.waitForTimeout(far ? WAIT : 2500);
    last = j.at;
    try {
      await Promise.race([page.evaluate(`(bm.setCam(${JSON.stringify(c)}), bm.shot(${JSON.stringify((process.env.OUT ? process.env.OUT + '_' : '') + j.name)}))`), new Promise((_, r) => setTimeout(() => r(new Error('timed out')), 60000))]);
      console.log('shot', j.name, '|', j.label);
    } catch (e) { console.log('FAILED', j.name, String(e).slice(0, 200)); }
  }
  await b.close();
}
