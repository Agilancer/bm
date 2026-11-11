// The other Tessariels' moves, frame by frame, for looking at: the game in headless Chromium on a software GPU, the sim
// stopped and stepped a few ticks at a time, each frame drawn by hand and saved. It's slow to draw there, but every frame
// is exactly the moment asked for, which a running game can't give.
//
//   python tools/serve.py 8475 --no-open          (the server, first)
//   node tools/heroes/moves.mjs plan.json [port]
//
// plan.json: { "size": [w, h], "hour": 17, "level": 30, "at": [x, z], "strips": [ strip, ... ] }, a strip being
//   { "name", "cls" (which class does it), "key" (the move; or "tune": 0-2 for a bard at the lute, or "clip" for a clip of the
//     bank held on the body), "dist" (metres to the foes), "foes" (how many), "frames", "every" (ticks between frames),
//     "lead" (ticks before the first), "cam": [side, back, up] (metres from the middle of the two), "also": [more moves cast with it] }
// Frames go to tools/build/shots/mv_<name>_<n>.png (the server keeps shots in one folder); tools/heroes/sheet.py lays a
// strip's frames side by side.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
// (Or: node tools/heroes/moves.mjs all [class ...] [--port N]: every move of every class, or of those, laid out by what it is.)
const args = process.argv.slice(2);
const port = args.includes('--port') ? args[args.indexOf('--port') + 1] : (/^\d+$/.test(args[1] || '') ? args[1] : '8475');
const plan = args[0] === 'all' ? await planAll(args.slice(1).filter((a, i, l) => !a.startsWith('--') && l[i - 1] !== '--port')) : JSON.parse(fs.readFileSync(args[0], 'utf8'));
// (--plan: say what would be drawn, and stop.)
if (args.includes('--plan')) { console.log(JSON.stringify(plan, null, 1)); process.exit(0); }

// Every move, with how far off its foes stand, how long it is worth watching, and how far back to stand to see it.
async function planAll(only) {
  const { SKILLS } = await import('../../src/sim/hero.js');
  const { MORE_SKILLS } = await import('../../src/sim/heroskills.js');
  // seconds worth watching, and anything else out of the ordinary (back: metres the eye stands off; foes; dist; frames).
  const LONG = { blessed_shield: 2.5, shield_throw: 2.5, heavens_fury: 2.6, judgment_beam: 1.8, solar_hammer: 2.0, hammer_storm: 3.2, blessed_hammers: 2.6, hammer_throw: 1.9, consecration: 2, divine_shield: 2.2, fist_of_heavens: 1.4,
    tower_shields: 2.6, phalanx_rush: 2.2, spear_wall: 1.6, charge_of_the_order: 2.1, guided_arrow: 1.6, frost_arrow: 1.6, sniper_shot: 1.9, chain_shot: 1.7, arrow_storm: 3.2, black_hole_arrow: 4.4, rain_of_arrows: 2.4,
    rupture: 2.2, shadow_dance: 1.8, death_from_above: 1.8, vanish: 2.2, star_storm: 3, kick_chain: 2.2, giant_shuriken: 2.2, ninja_flurry: 2.2, spirit_star: 1.6, dragon_dive: 1.7, comet_dive: 1.5, storm_dive: 1.8, lance_barrier: 2.2,
    spear_rain: 2.8, dragon_breath: 1.7, dragonfall: 2.2, heavens_rain: 2.2, jump: 1.5, spear_barrage: 2.1, cross_cut: 2, energy_rang: 2.1, chakram: 2.6, orbiting_rangs: 2.2, homing_salvo: 2.3, blade_ring: 1.9, bladestorm: 2.8,
    golden_boomerang: 3.8, razor_tornado: 3.2, double_throw: 2.2, power_chord: 1.7, shockwave_riff: 1.8, echo: 2.2, dancing_notes: 2.2, bass_drop: 1.9, swashbuckle: 2, resonance_beam: 2.3, lullaby: 2.2, sonic_boom: 1.9, crescendo: 1.9, grand_finale: 3.3 };
  // (How much ground to take in, in metres, for the ones that cover a lot of it.)
  const WIDE = { hammer_storm: 13, arrow_storm: 14, charge_of_the_order: 14, golden_boomerang: 15, heavens_rain: 14, spear_rain: 12, grand_finale: 13, black_hole_arrow: 14, sonic_boom: 13, heavens_fury: 11, rain_of_arrows: 12, dragonfall: 12, comet_dive: 11,
    blade_ring: 12, bulwark_nova: 11, holy_nova: 11, star_storm: 14, shadow_dance: 11, kick_chain: 11, phalanx_rush: 12, razor_tornado: 11, homing_salvo: 11, solar_hammer: 11, death_from_above: 10, lullaby: 12, storm_dive: 11, dragon_dive: 10,
    tower_shields: 8, blessed_hammers: 10, energy_rang: 13, chakram: 12, cross_cut: 12, double_throw: 12, blessed_shield: 11, shield_throw: 11, hammer_throw: 10, backflip: 10, disengage: 12, substitution: 11, fan_of_knives: 11 };
  const strips = [];
  // How far back the eye stands to take in `wide` metres of ground through the lens, and how high for a look down of 19 degrees.
  const FOV = 24, eye = (wide) => { const back = Math.max(7.5, wide / (2 * Math.tan(FOV * Math.PI / 360) * 16 / 9)); return [0, back, 1 + back * 0.344]; };
  const far = (cls) => ['archer', 'bard', 'boomerang'].includes(cls);
  for (const [cls, list] of Object.entries(MORE_SKILLS)) {
    if (only.length && !only.includes(cls)) continue;
    // Its ordinary blows first (a foe in reach and nothing asked of it), then the first moves, then the new.
    strips.push({ name: `${cls}__blows`, cls, key: null, dist: far(cls) ? 5 : 1.9, foes: 2, frames: 10, every: 9, still: false, cam: eye(far(cls) ? 8.5 : 5.5), note: 'ordinary blows' });
    for (const q of [...(SKILLS[cls] || []), ...list]) {
      if (q.song || q.heal) continue;
      // (Its foes as near as the move allows, so everyone's as large in the picture as can be.)
      const lo = q.range ? q.range[0] : 0, hi = q.range ? q.range[1] : 2;
      const dist = Math.max(1.7, Math.min(hi - 0.3, lo + (hi - lo > 4 ? 1.6 : (hi - lo) * 0.5)) + 0.5), secs = LONG[q.key] || 1.25, frames = secs > 2.4 ? 10 : 8;
      strips.push({ name: `${cls}_${q.key}`, cls, key: q.key, dist, foes: q.aoe || q.crowd ? 5 : 3, frames, every: Math.max(4, Math.round(secs * 90 / (frames - 1))), cam: eye(WIDE[q.key] || dist + 4.5), note: `${q.name || q.key}${q.lvl ? `, level ${q.lvl}` : ''}` });
    }
    if (cls === 'bard') for (const v of [0, 1, 2]) strips.push({ name: `bard__lute${v}`, cls, tune: v, dist: 3, foes: 0, frames: 12, every: v === 1 ? 3 : v === 2 ? 9 : 5, cam: [-0.5, 7.5, 2.9], mid: 0, lookY: 1.15, fov: 15, lead: 60, note: ['strumming', 'picking', 'the great wheeling strum'][v] });
  }
  return { name: only.join('_') || 'all', size: [960, 540], hour: 13, at: [80, -28], fov: FOV, strips };
}
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'build', 'shots');
fs.mkdirSync(root, { recursive: true });
const [W, H] = plan.size || [800, 450];

const b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-watchdog'] });
const page = await b.newPage({ viewport: { width: W, height: H } });
await page.addInitScript((gfx) => { localStorage.setItem('velscour.settings', JSON.stringify({ gfx, keep: 'no', heroes: 'auto', volume: 0 })); }, plan.gfx || 'mobile');
let errs = 0;
page.on('pageerror', (e) => { if (errs++ < 12) console.log('PAGE ERROR', String(e).slice(0, 500)); });
page.on('console', (m) => { if (m.type() === 'error' && errs++ < 12) console.log('console error', m.text().slice(0, 500)); });
await page.goto(`http://localhost:${port}/?auto&noopening&timer&heroes=${plan.heroes || 8}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.bm && bm.snap && bm.snap(), null, { timeout: 300000, polling: 1000 });
await page.evaluate(async (hour) => {
  const L = await import('/src/core/layout.js');
  const v = bm.view, r = bm.renderer, wait = (ms) => new Promise((res) => setTimeout(res, ms));
  v.idle = true; v.idleFrames = 99; bm.fixScale(1); bm.setTime(hour); r.hideVM = true;
  if (v.autoplay) v.autoplay.on = false;
  window.MV = {
    cast: await bm.heroes('dump'),
    // n ticks of the world, then stopped again.
    async step(n) {
      const t0 = bm.snap()[L.H.TICK];
      bm.cmd(14, 0, n);
      const until = performance.now() + 3000 + n * 40;
      while (bm.snap()[L.H.TICK] < t0 + n && performance.now() < until) await wait(5);
      await wait(20);
    },
    async frame(dt = 0.05) {
      const snap = v.currentSnap();
      v.processEvents(snap); v.updateCamera(dt, snap); v.emitAmbient(dt, snap); v.emitBleeds(dt, snap); v.updateTrail(dt, snap);
      r.frame(v.overrideCam || v.cam, snap, v.sway, dt);
      await r.device.queue.onSubmittedWorkDone();
    },
    shot: (name) => new Promise((res) => r.canvas.toBlob(async (blob) => { await fetch(`/shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob }); res(name); }, 'image/png')),
    // (fov: the lens, in degrees up and down; the game's own is 64.)
    cam(x, y, z, tx, ty, tz, fov = 64) {
      let fx = tx - x, fy = ty - y, fz = tz - z; const l = 1 / Math.hypot(fx, fy, fz); fx *= l; fy *= l; fz *= l;
      let rx = -fz, rz = fx; const rl = 1 / Math.hypot(rx, rz); rx *= rl; rz *= rl;
      bm.setCam({ x, y, z, fx, fy, fz, ux: -rz * fy, uy: rz * fx - rx * fz, uz: rx * fy, fov: fov * Math.PI / 180 });
    },
    hero: async (slot) => (await bm.heroes('dump')).find((h) => h.slot === slot),
    wait,
  };
  bm.cmd(14, 0, 0);
}, plan.hour ?? 17);
// (Anything asked of the page that takes more than two minutes is given up on, and said.)
const ev = (code, arg) => Promise.race([page.evaluate(code, arg), new Promise((res, rej) => setTimeout(() => rej(new Error('the page did not answer')), 120000))]);
const cast = await ev(() => MV.cast);
console.log('cast:', cast.map((h) => `${h.slot}:${h.cls}`).join(' '), '| errors', await ev(() => window.__gpuErrors || 0));
const [bx, bz] = plan.at || [88, -30];
// (You, near enough that what they do is drawn and heard.)
// (One command at a time: they cross to the sim in one slot, and the next would overwrite it.)
await ev(async ([x, z]) => { bm.cmd(19, 0, x, z - 46); await MV.wait(250); }, [bx, bz]);
await ev(() => MV.step(2));
console.log('you:', JSON.stringify(await ev(() => { const q = bm.snap(); return [q[2].toFixed(0), q[4].toFixed(0)]; })));
// Everyone not wanted, well away.
// (And held there: they'd walk back to their own business otherwise, through the picture.)
await ev(([x, z]) => { bm.heroes('at', { x: x + 400, z: z + 400 }); bm.heroes('freeze', { seconds: 1e9 }); }, [bx, bz]);
await ev(() => MV.step(4));

if (plan.look) {
  // (A look at the ground from above, to choose a place.)
  await ev(([x, z, h]) => { MV.cam(x, h, z - 0.01, x, 0, z); }, [bx, bz, plan.look]);
  await ev(() => MV.frame()); await ev(() => MV.frame());
  await ev(() => MV.shot('mv__look'));
  console.log('look saved');
}
const sheets = [];
for (const s of plan.strips || []) {
  try {
  const who = cast.filter((h) => h.cls === s.cls && h.slot < (plan.heroes || 8))[s.which || 0];
  if (!who) { console.log('nobody is a', s.cls); continue; }
  const dist = s.dist ?? 4, n = s.frames || 8, every = s.every || 8, t0 = Date.now();
  process.stdout.write(`${s.name}... `);
  // The hero on the left of the picture, the foes to the right, the eye to the south of them looking north through a long lens
  // from a little above head height: near enough to eye level to read a body, and the horizon out of the picture (on a
  // software GPU the sky and the far land cost five times what the lawn does).
  await ev(async ({ slot, bx, bz, dist, foes, level, s, fov }) => {
    const face = -Math.PI / 2;
    bm.heroes('clear');
    bm.heroes('at', { slot, x: bx, z: bz });
    bm.heroes('level', { slot, level });
    bm.heroes('mute', { slot, still: s.still !== false });
    bm.heroes('freeze', { slot, seconds: 1e9, face });
    if (foes) bm.heroes('dummies', { x: bx - dist, z: bz, n: foes });
    await MV.step(foes ? 420 : 30);
    bm.heroes('at', { slot, x: bx, z: bz });
    bm.heroes('face', { slot, yaw: face });
    await MV.step(3);
    const [side, back, up] = s.cam, mid = bx - (s.mid ?? dist * 0.5), y = (await MV.hero(slot)).y;
    MV.cam(mid + side, y + up, bz - back, mid, y + (s.lookY ?? 1.0), bz, s.fov || fov);
    bm.heroes('freeze', { slot, seconds: 0 });
    if (s.tune !== undefined) bm.heroes('tune', { slot, v: s.tune, seconds: 30, rainbow: !!s.rainbow });
    else if (s.clip) bm.heroes('pose', { slot, clip: s.clip, at: 0 });
    else if (s.key) { bm.heroes('skill', { slot, key: s.key }); for (const k of s.also || []) bm.heroes('skill', { slot, key: k }); }
    else { bm.heroes('mute', { slot }); bm.heroes('attack', { slot }); }
    await MV.step(s.lead ?? 2);
  }, { slot: who.slot, bx, bz, dist, foes: s.foes ?? 3, level: s.level ?? plan.level ?? 30, s, fov: plan.fov || 24 });
  if (s.log) console.log(JSON.stringify(await ev((slot) => MV.hero(slot), who.slot)), JSON.stringify(await ev(() => window.bmHeroFx)));
  const files = [];
  for (let i = 0; i < n; i++) {
    const name = `mv_${s.name}_${String(i).padStart(2, '0')}`;
    // (A clip looked through: held at each of n places between two fractions of it, "span": [from, to].)
    if (s.clip) await ev(({ slot, clip, at }) => { bm.heroes('pose', { slot, clip, at }); }, { slot: who.slot, clip: s.clip, at: (s.span?.[0] ?? 0) + ((s.span?.[1] ?? 1) - (s.span?.[0] ?? 0)) * i / Math.max(1, n - 1) });
    await ev(async ({ every, name, first }) => { if (!first) await MV.step(every); await MV.frame(every / 90); await MV.shot(name); }, { every, name, first: i === 0 });
    files.push(path.join(root, name + '.png'));
    if (s.log) { const h = await ev((slot) => MV.hero(slot), who.slot); console.log(`  ${i}: at ${h.x}, ${h.z} going ${h.spd} m/s, goal ${h.goal}, doing ${h.action}, foe ${h.foeAt}, hold ${h.hold}`); }
  }
  // (Out of the way again, and the fight let go.)
  await ev(async ({ slot, bx, bz, s2 }) => { await MV.step(s2); bm.heroes("at", { slot, x: bx + 400 + slot * 3, z: bz + 400 }); bm.heroes("task", { slot }); bm.heroes("freeze", { slot, seconds: 1e9 }); bm.heroes("sweep"); bm.heroes("clear"); await MV.step(6); bm.cmd(8); await MV.wait(150); }, { slot: who.slot, bx, bz, s2: s.tail ?? 60 });
  sheets.push({ name: s.name, files, note: s.note || '' });
  console.log(`${s.name}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } catch (e) { console.log(`${s.name}: FAILED: ${String(e).slice(0, 200)}`); break; }
}
fs.writeFileSync(path.join(root, `mv__${plan.name || 'sheets'}.json`), JSON.stringify(sheets, null, 1));
console.log('gpu errors', await ev(() => window.__gpuErrors || 0));
await b.close();
