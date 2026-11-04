// The phone governor against simulated phones, since a real one isn't always to hand.
//   node tools/test_governor.mjs
// A phone here is a GPU cost at scale 1 (of which a quarter doesn't shrink with the picture), a display that only shows
// whole refreshes, and sometimes a browser power cap or heat. Each case states where it must end up.
import { Governor, PHONE_STEPS } from '../src/gfx/governor.js';

function run(name, { costMs, seconds = 120, vsync = 1000 / 60, cap = 0, heat = null, cpuMs = 0, seedFirst = true, seedMs = 0, jitter = 0.03, lateMs = 0, steep = 0 }) {
  let scale = 1, effects = 0;
  const gov = new Governor({ apply: (s) => { scale = s; }, demote: () => { if (effects >= 7) return false; effects++; return true; } });
  if (lateMs) gov.lateMs = lateMs;
  const gpuAt = (t) => {
    const base = heat ? costMs * (t < heat.at ? 1 : heat.by) : costMs;
    // (steep: pixels cost more than the governor's model says, so a climb it thought safe isn't.)
    const pixels = steep ? scale ** steep : scale * scale;
    return base * (0.25 + 0.75 * pixels) * (1 - effects * 0.05);
  };
  if (seedFirst) gov.seed(seedMs || gpuAt(0));
  let changes = 0, last = gov.rung, framesLate = 0, frames = 0, worstRun = 0, run_ = 0;
  const log = [];
  for (let t = 1; t <= seconds; t++) {
    const gpu = gpuAt(t) * (1 + (Math.random() - 0.5) * jitter);
    // Frames land on whole refreshes, and no faster than the cap or the CPU allow.
    const need = Math.max(gpu, cpuMs, cap || 0);
    const frameMs = Math.ceil(need / vsync - 1e-6) * vsync;
    frames++;
    if (frameMs > (lateMs || 1000 / 60 * 1.14)) { framesLate++; run_++; worstRun = Math.max(worstRun, run_); } else run_ = 0;
    gov.update(frameMs, gpu, t);
    if (gov.rung !== last) { changes++; last = gov.rung; log.push(`${t}s:${PHONE_STEPS[gov.rung]}`); }
  }
  const finalGpu = gpuAt(seconds);
  return { name, scale, effects, changes, lateSeconds: framesLate, longestLateRun: worstRun, finalGpuMs: +finalGpu.toFixed(1), log: log.slice(0, 8).join(' ') };
}

const cases = [
  ['flagship: climbs to the top rung', { costMs: 4 }, (r) => r.scale === 1.5 && r.longestLateRun === 0],
  ['good phone: holds near full', { costMs: 12 }, (r) => r.scale >= 0.88 && r.longestLateRun <= 2],
  ['mid phone: settles under full and stays', { costMs: 28 }, (r) => r.scale < 1 && r.finalGpuMs <= 16.7 && r.lateSeconds <= 4 && r.changes <= 5],
  ['slow phone: goes all the way down and still tries', { costMs: 60 }, (r) => r.scale === 0.55 && r.effects >= 1],
  ['not seeded: finds its level from a bad start', { costMs: 28, seedFirst: false }, (r) => r.finalGpuMs <= 16.7 && r.lateSeconds <= 8],
  ['stuck at 30 on vsync with the GPU just over budget: steps down', { costMs: 19, seedFirst: false }, (r) => r.finalGpuMs <= 16.7 && r.lateSeconds <= 4],
  ['browser power cap at 30: spends no resolution for nothing', { costMs: 8, cap: 33.3 }, (r) => r.scale >= 1 && r.effects === 0],
  ['CPU-bound, GPU idle: resolution stays', { costMs: 8, cpuMs: 24 }, (r) => r.scale >= 1 && r.effects === 0],
  ['heat halves the GPU after a minute: steps down, and stays smooth', { costMs: 12, heat: { at: 60, by: 2 } }, (r) => r.finalGpuMs <= 16.7 && r.lateSeconds <= 4],
  ['no ping-pong just under the line', { costMs: 14 }, (r) => r.changes <= 3 && r.lateSeconds <= 2],
  ['120 Hz panel on every other refresh', { costMs: 20, vsync: 1000 / 120 }, (r) => r.finalGpuMs <= 16.7],
  ['90 Hz panel at 45: not chased down the ladder', { costMs: 14, vsync: 1000 / 90, lateMs: 24 }, (r) => r.scale >= 0.88 && r.lateSeconds === 0],
  ['seeded far too low by a cold GPU: climbs back', { costMs: 6, seedMs: 40 }, (r) => r.scale >= 1 && r.longestLateRun === 0],
  ['a climb that fails: backs off and does not keep trying', { costMs: 6.5, seedFirst: false, steep: 7, seconds: 300 }, (r) => r.changes <= 10 && r.lateSeconds <= 8],
];

let failed = 0;
for (const [name, opts, ok] of cases) {
  const r = run(name, opts);
  const pass = ok(r);
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}\n     scale ${r.scale}  effects ${r.effects}  changes ${r.changes}  late ${r.lateSeconds}s (longest ${r.longestLateRun}s)  gpu ${r.finalGpuMs} ms  ${r.log}`);
}
console.log(failed ? `${failed} failed` : 'all held');
process.exit(failed ? 1 : 0);
