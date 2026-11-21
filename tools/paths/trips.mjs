// Auto-play's walks about City State Phobos and Castle Velscour, played out without the game: a body moved as the sim moves
// the player (src/sim/player.js: pushed out of boxes by World.resolve, its feet set down on max(heightFor, topUnder), falling
// when there's nothing under it), steered at each point of the way the nav thread's east map gives (src/sim/east-nav.js
// route), the way asked for again as auto-play asks for it (src/ui/autobrain.js eastWalk), every Phobos door open. A walk
// fails where auto-play would give up: no way there, or no nearer for half a minute.
//
//   node tools/paths/trips.mjs [threads] [--from-gate] [--pairs N] [--only kind]
//
// Prints each failure with where it stood; writes tools/build/paths/trips.json.
import fs from 'node:fs';
import { against } from './baseline.mjs';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (isMainThread) {
  const { targets } = await import('./targets.mjs');
  const { EAST_DOOR } = await import('../../src/sim/east-nav.js');
  const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const threads = +(args.find((a) => /^\d+$/.test(a)) || Math.max(1, os.cpus().length - 2));
  const only = opt('--only', null), pairs = +opt('--pairs', 40), trace = opt('--trace', null), from = opt('--from', null);
  let T = targets();
  const all = T;
  if (only) T = T.filter((t) => t.kind.includes(only));
  // (--trace name [--from name]: that one walk, where it is every few seconds.)
  if (trace) T = all.filter((t) => t.name === trace);
  const start = { kind: 'start', name: 'the road before the Drawbridge Gate', x: EAST_DOOR[0], z: EAST_DOOR[1], y: null, r: 3 };
  const trips = T.map((t) => ({ from: from ? all.find((q) => q.name === from) : start, to: t, trace: !!trace }));
  // (And between places, picked so every kind is a start somewhere: a fixed pick, so runs compare.)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < (trace ? 0 : pairs); k++) { const a = T[Math.floor(rnd() * T.length)], b = T[Math.floor(rnd() * T.length)]; if (a !== b) trips.push({ from: a, to: b }); }
  const results = [];
  let next = 0;
  const t0 = performance.now();
  await new Promise((resolve) => {
    let running = 0;
    const go = () => {
      if (next >= trips.length) { if (!running) resolve(); return; }
      running++;
      const batch = trips.slice(next, next + 6); next += batch.length;
      const w = new Worker(new URL(import.meta.url), { workerData: { trips: batch } });
      w.on('message', (r) => { results.push(r); if (!r.ok) console.log(`FAIL ${r.from} -> ${r.kind} ${r.to}: ${r.why} at ${r.at.map((v) => v.toFixed(1)).join(', ')} (${r.secs.toFixed(0)} s)`); });
      w.on('error', (e) => { console.log('worker error', e); });
      w.on('exit', () => { running--; go(); });
    };
    for (let k = 0; k < threads; k++) go();
  });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok} of ${results.length} walks got there (${((performance.now() - t0) / 1000).toFixed(0)} s); slowest ${Math.max(...results.map((r) => r.secs)).toFixed(0)} s of walking; longest ask ${Math.max(...results.map((r) => r.ask)).toFixed(0)} ms`);
  fs.mkdirSync(new URL('../build/paths/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../build/paths/trips.json', import.meta.url), JSON.stringify(results, null, 1));
  // (Known failures allowed, by baseline.json; a new one, or fewer getting there, fails the run.)
  const known = results.filter((r) => !r.ok).map((r) => `${r.from} -> ${r.to}`).sort();
  process.exit(against('trips', { failed: results.length - ok }, known) ? 0 : 1);
} else {
  const { World } = await import('../../src/sim/world.js');
  const { EastNav } = await import('../../src/sim/east-nav.js');
  const read = (p) => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url)));
  const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
  world.setPhobosDoors(new Set(world.phDoors.keys()));
  const nav = new EastNav(fs.readFileSync(new URL('../../assets/game/nav/east.bin', import.meta.url)), world);
  const DT = 1 / 30, RUN = 6.2, WALK = 3.2;
  const settle = (x, z, y) => nav.ground(x, z, y);
  for (const { from, to, trace } of workerData.trips) {
    // (The start: on the ground there, or on the floor at its height.)
    let x = from.x, z = from.z, y = settle(x, z, from.y ?? -100), vy = 0;
    // (A start inside something: the nearest place it fits, as the map has it.)
    // (Somewhere a body stands that can be got to from the gate: a place the player can't be isn't a start.)
    // (Nor a ledge nothing walks to: a spire's pier top round its foot.)
    if (!nav.fits(x, z, y) || !nav.nodesNear(x, z, y, 4, 3).some((n) => nav.live[n])) { const live = (L) => L.filter((n) => nav.live[n]); const n = live(nav.nodesNear(x, z, from.y, from.r || 6, 6))[0] ?? live(nav.nodesNear(x, z, null, 12))[0]; if (n !== undefined) { x = nav.x[n]; z = nav.z[n]; y = settle(x, z, nav.y[n]); } }
    const res = { from: from.name, to: to.name, kind: to.kind, ok: false, why: '', at: [x, y, z], secs: 0, ask: 0, asks: 0 };
    let P = null, askT = -99, t = 0, best = Infinity, bestT = 0, miss = 0, fresh = false;
    const tmp = [0, 0, 0];
    const done = () => Math.hypot(x - to.x, z - to.z) <= to.r + 0.3 && (to.y === null || Math.abs(y - to.y) <= (to.dy ?? 2.5));
    while (t < 900) {
      if (done()) { res.ok = true; break; }
      // (Asked again as eastWalk asks: no way yet, every 7 s, or with less than 14 m of it walked out ahead.)
      let left = 0;
      if (P) { let px = x, pz = z; for (const p of P) { if (p[2] === 2) break; left += Math.hypot(p[0] - px, p[1] - pz); px = p[0]; pz = p[1]; } }
      if (!P || t - askT > 7 || (left < 14 && P.some((p) => p[2] === 2))) {
        const a0 = performance.now();
        const r = nav.route([x, y, z], [to.x, to.z, to.y], Math.max(0.5, to.r - 0.3));
        const ms = performance.now() - a0;
        res.ask = Math.max(res.ask, ms); res.asks++;
        if (ms > 3000) (res.slow ||= []).push([Math.round(ms), +x.toFixed(1), +y.toFixed(1), +z.toFixed(1), r ? r.length : 0]);
        askT = t;
        if (r?.length) { P = r; miss = 0; fresh = true; } else if (++miss >= 3) { res.why = 'no way there'; break; } else P = null;
      }
      // (Nearer as eastWalk counts it: down the way it has, up and down too.)
      let L = Math.hypot(x - to.x, z - to.z);
      if (P?.length) { let px = x, py = y, pz = z; L = 0; for (const p of P) { L += Math.hypot(p[0] - px, p[1] - pz) + Math.abs((p[4] ?? py) - py); px = p[0]; pz = p[1]; py = p[4] ?? py; } L += Math.hypot(px - to.x, pz - to.z); }
      if (fresh) { fresh = false; best = Math.max(best, L); }
      if (L < best - 6) { best = L; bestT = t; } else if (t - bestT > 30) { res.why = 'no nearer for 30 s'; break; }
      let mx = 0, mz = 0, run = false;
      if (P) {
        while (P.length > 1) {
          const q = P[0], k = Math.hypot(x - q[0], z - q[1]), level = Math.abs((q[4] ?? y) - y) < (k < 0.2 ? 0.6 : 0.3);   // (as eastWalk)
          const gone = (x - q[0]) * (P[1][0] - q[0]) + (z - q[1]) * (P[1][1] - q[1]) > 0;
          if ((level && (k < 0.5 || (gone && k < 0.8))) || (q[2] === 2 && k < 3)) P.shift(); else break;
        }
        const k = Math.hypot(P[0][0] - x, P[0][1] - z);
        if (k > 0.05) { mx = (P[0][0] - x) / k; mz = (P[0][1] - z) / k; }
        // (Run as eastWalk runs: on, more than 8 m from the goal, but a walk round a bend and up or down a height.)
        run = Math.hypot(x - to.x, z - to.z) > 8;
        if (run && k < 4 && P.length > 1) { let b = Math.atan2(P[1][0] - P[0][0], P[1][1] - P[0][1]) - Math.atan2(P[0][0] - x, P[0][1] - z); b = Math.abs(((b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); if (b > 0.6) run = false; }
        if (run && Math.abs((P[0][4] ?? y) - y) > 1.5 && k < 6) run = false;
        if (P.length === 1 && k < 0.35) { mx = mz = 0; }
      }
      // (The sim's step: on, out of whatever it walked into, down onto what's under it.)
      const sp = run ? RUN : WALK, y0 = y;
      x += mx * sp * DT; z += mz * sp * DT;
      vy -= 12 * DT; y += vy * DT;
      tmp[0] = x; tmp[2] = z; world.resolve(tmp, 0.36, Math.max(y0, y) + 0.2, true); x = tmp[0]; z = tmp[2];
      const g = Math.max(world.heightFor(x, z, y), world.topUnder(x, z, vy > 0 ? y : Math.max(y0, y) + 0.2));
      if (y <= g) { if (vy < -14) res.fell = (res.fell || 0) + 1; y = g; vy = 0; }
      t += DT;
      if (trace && Math.abs(t % 3) < DT) console.log(`t ${t.toFixed(0)} at ${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)} next ${P ? P.slice(0, 3).map((p) => p.slice(0, 2).map((v) => v.toFixed(1)).join(',') + '/' + (p[4] ?? 0).toFixed(1) + (p[2] === 2 ? 'c' : '')).join(' ') : '-'} left ${P?.length ?? 0}`);
    }
    if (!res.ok && !res.why) res.why = 'out of time';
    res.at = [x, y, z]; res.secs = t;
    parentPort.postMessage(res);
  }
}
