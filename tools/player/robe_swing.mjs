// How the back of the wizard's robe moves: how fast it waves, how far, at each pace. Plays PlayerBody headless (the same
// code the game runs) and follows each cloth chain's hem against where the sculpt puts it on the pelvis.
//
//   node tools/player/robe_swing.mjs [--json out.json] [--at x,y,z]      (--at: start him there in the world, not at its middle)
//
// For each pace: the hem's waving rate (Hz: how often its swing about its mean turns back, halved), how far it swings
// (cm, peak to peak about its mean), its speed against the body (m/s, 95th percentile), and how far it trails (cm), all
// against his pelvis, in the frame of the way he's heading (trail: how far the hem hangs from it, on average).
import fs from 'fs';
import { PlayerBody } from '../../src/sim/playerbody.js';
import { C_PALETTE, MAX_JOINTS } from '../../src/core/layout.js';
import { quatRotate } from '../../src/core/math.js';

const file = fs.readFileSync(new URL('../../assets/game/player/wizard.glb', import.meta.url));
const buffer = () => file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const FPS = 60, SECS = 8;
const CASES = [
  { name: 'idle', v: 0 }, { name: 'walk', v: 1.4 }, { name: 'jog', v: 3.1 }, { name: 'run', v: 5.6 }, { name: 'sprint', v: 8.4, sprint: true },
  { name: 'stop', v: 5.6, stopAt: 3 }, { name: 'turns', v: 3.1, turn: 1.6 },
];

export function measure(Body = PlayerBody, at = [0, 0, 0]) {
  const out = {};
  for (const cs of CASES) {
    const body = new Body(buffer());
    const snap = new Float32Array(C_PALETTE + MAX_JOINTS * 8 + 64);
    const { rig } = body, pelvis = rig.index.get('Pelvis');
    let [x, y0, z] = at, yaw = 0;
    const rows = [];   // per frame: each chain's hem in the pelvis's frame, minus its sculpted place
    const q = new Float32Array(4), v = new Float32Array(3), r = new Float32Array(3);
    for (let f = 0; f < SECS * FPS; f++) {
      const dt = 1 / FPS, t = f * dt;
      const sp = cs.stopAt !== undefined && t > cs.stopAt ? 0 : cs.v;
      if (cs.turn) yaw = Math.sin(t * cs.turn) * 1.2;
      const vx = Math.sin(yaw) * sp, vz = Math.cos(yaw) * sp;
      x += vx * dt; z += vz * dt;
      body.update(dt, { x, y: y0, z, yaw, pitch: 0, vx, vz, onGround: true, sprinting: !!cs.sprint, staff: true, skull: true });
      body.write(snap, 0, true);
      if (t < 2) continue;   // settled
      // The frame he's heading in, on his pelvis (his heading's turn undone, not the hips' own twist and roll: what's seen
      // is the cloth moving against the way he goes, and a rigid target twisting with his hips would count as a swing).
      q[0] = 0; q[1] = -Math.sin(yaw / 2); q[2] = 0; q[3] = Math.cos(yaw / 2);
      const row = [];
      for (const c of body.cloth.chains) {
        const i = (c.n - 1) * 3;
        for (const [arr, dst] of [[c.x, v], [c.target, r]]) {
          const o = body.cloth.o ?? [0, 0, 0];   // (the cloth's points are kept from there: his hips in the world)
          dst[0] = arr[i] + o[0] - rig.wt[pelvis * 3]; dst[1] = arr[i + 1] + o[1] - rig.wt[pelvis * 3 + 1]; dst[2] = arr[i + 2] + o[2] - rig.wt[pelvis * 3 + 2];
          quatRotate(dst, 0, q, 0, dst, 0);
        }
        row.push([v[0], v[1], v[2]]);   // (against his pelvis, as it's seen: its cut moves aside with a leg too, src/sim/cloth.js step)
      }
      rows.push(row);
    }
    const nC = rows[0].length, res = [];
    for (let c = 0; c < nC; c++) {
      const s = rows.map((rw) => rw[c]);
      const mean = [0, 1, 2].map((a) => s.reduce((m, p) => m + p[a], 0) / s.length);
      // The swing's main line (the axis it moves most along), then turns of it.
      const d = s.map((p) => [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]]);
      let best = 0, ax = [0, 0, 1];
      for (const a of [[1, 0, 0], [0, 0, 1], [0.707, 0, 0.707], [0.707, 0, -0.707], [0, 1, 0]]) {
        const varA = d.reduce((m, p) => m + (p[0] * a[0] + p[1] * a[1] + p[2] * a[2]) ** 2, 0);
        if (varA > best) { best = varA; ax = a; }
      }
      const y = d.map((p) => p[0] * ax[0] + p[1] * ax[1] + p[2] * ax[2]);
      // Turns back: sign changes of its speed that come with at least 3 mm of travel since the last.
      let turns = 0, last = y[0], dir = 0;
      for (let k = 1; k < y.length; k++) {
        const dd = y[k] - last;
        if (Math.abs(dd) < 0.003) continue;
        const nd = Math.sign(dd);
        if (dir && nd !== dir) turns++;
        dir = nd; last = y[k];
      }
      const span = (y.length - 1) / FPS;
      const sp = [];
      for (let k = 1; k < s.length; k++) sp.push(Math.hypot(s[k][0] - s[k - 1][0], s[k][1] - s[k - 1][1], s[k][2] - s[k - 1][2]) * FPS);
      sp.sort((a, b) => a - b);
      res.push({ hz: turns / 2 / span, swing: (Math.max(...y) - Math.min(...y)) * 100, speed: sp[Math.floor(sp.length * 0.95)], trail: Math.hypot(mean[0], mean[2]) * 100 });
    }
    const avg = (k) => res.reduce((m, r2) => m + r2[k], 0) / res.length;
    const mx = (k) => Math.max(...res.map((r2) => r2[k]));
    out[cs.name] = { hz: avg('hz'), hzMax: mx('hz'), swing: avg('swing'), swingMax: mx('swing'), speed: mx('speed'), trail: mx('trail') };
  }
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('robe_swing.mjs')) {
  const a = process.argv.indexOf('--at');
  const res = measure(PlayerBody, a > 0 ? process.argv[a + 1].split(',').map(Number) : [0, 0, 0]);
  console.log('pace      waves/s (max)   swing cm (max)   speed m/s   trail cm');
  for (const [k, r] of Object.entries(res)) console.log(`${k.padEnd(8)}  ${r.hz.toFixed(2).padStart(5)} (${r.hzMax.toFixed(2)})   ${r.swing.toFixed(1).padStart(5)} (${r.swingMax.toFixed(1)})      ${r.speed.toFixed(2)}       ${r.trail.toFixed(1)}`);
  const j = process.argv.indexOf('--json');
  if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(res, null, 1));
}
