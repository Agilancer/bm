// The clips on a grid as fine as their own keys (src/sim/anim.js ArmsRig): never more frames than the 60 Hz grid they had,
// no more than the file has keys where its keys are at a steady rate, and the pose at any moment what the keys themselves
// say, a straight line between two of them. Witch.glb's keys are at no rate that divides 60, so a 60 Hz grid cut across
// them by up to ten degrees; the staff arms' keys aren't on a grid of their own, so they keep the 60 Hz one.
//   node --test tests/arms-rig-rate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ArmsRig } from '../src/sim/anim.js';
import { parseGLB, readClips, readSkeleton } from '../src/core/glb.js';

const root = new URL('../', import.meta.url);
const read = (p) => { const b = readFileSync(new URL(p, root)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

// The turn a track's own keys give at time t: the two keys either side, signs made to agree, blended and made whole.
function fromKeys(track, t) {
  const { times, values } = track;
  let k = 0;
  while (k + 2 < times.length && times[k + 1] < t) k++;
  const a = Math.min(1, Math.max(0, (t - times[k]) / Math.max(times[k + 1] - times[k], 1e-6)));
  const q0 = values.slice(k * 4, k * 4 + 4), q1 = Array.from(values.slice(k * 4 + 4, k * 4 + 8));
  if (q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3] < 0) for (let s = 0; s < 4; s++) q1[s] = -q1[s];
  const q = [0, 1, 2, 3].map((s) => q0[s] * (1 - a) + q1[s] * a), l = Math.hypot(...q);
  return q.map((v) => v / l);
}
const angle = (p, q) => 2 * Math.acos(Math.min(1, Math.abs(p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3]))) * 180 / Math.PI;

// thin: its keys are at a steady rate, so its grid is theirs (fewer frames than keys, near enough); otherwise 60 Hz.
const FILES = [
  { file: 'assets/monsters/zombie/zombie_1.glb', thin: true },
  { file: 'assets/monsters/tripo/werewolf_brown.glb', thin: true },
  { file: 'assets/monsters/crab_monster/crab_monster.glb', thin: true },
  { file: 'assets/game/lisandra/witch.glb', thin: true },
  { file: 'assets/fp/arms_staff.glb', thin: false },
];

for (const { file, thin } of FILES) {
  test(`${file.split('/').pop()}: ${thin ? 'as many frames as keys' : 'the 60 Hz grid'}, and the keys' own pose between them`, () => {
    const buf = read(file), rig = new ArmsRig(buf.slice(0));
    const glb = parseGLB(buf.slice(0)), clips = readClips(glb, readSkeleton(glb));
    let worst = 0, checked = 0, frames = 0, keys = 0, at60 = 0;
    const rot = new Float32Array(rig.count * 4), tr = new Float32Array(rig.count * 3);
    for (const [name, c] of Object.entries(clips)) {
      const clip = rig.clips[name], n60 = Math.max(2, Math.round(c.dur * 60) + 1);
      let most = 2;
      for (const [, k] of c.rot) most = Math.max(most, k.times.length);
      assert.ok(clip.frames <= n60, `${name}: ${clip.frames} frames, more than the 60 Hz grid's ${n60}`);
      if (thin) assert.ok(clip.frames <= most + 1, `${name}: ${clip.frames} frames for ${most} keys`);
      frames += clip.frames; keys += most; at60 += n60;
      for (let s = 0; s < 24; s++) {
        const t = (s + 0.37) / 24 * c.dur;
        // (Not looped here: the moment itself, as the file has it.)
        rig.sampleInto({ ...clip, loop: false }, t, rot, tr);
        for (const [j, k] of c.rot) {
          if (k.times.length < 2) continue;
          worst = Math.max(worst, angle(fromKeys(k, t), rot.subarray(j * 4, j * 4 + 4)));
          checked++;
        }
      }
    }
    assert.ok(checked > 100, 'enough turns checked');
    assert.ok(worst < 0.1, `within a tenth of a degree of the keys (worst ${worst.toFixed(3)}°)`);
    if (thin) assert.ok(frames < keys * 1.1 && frames < at60 * 0.6, `${frames} frames for ${keys} keys (${at60} at 60 Hz)`);
    else assert.equal(frames, at60);
  });
}
