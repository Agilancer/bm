// The wizard's robe (tools/player/robe_rig.py): the back of it hangs from cloth bones that src/sim/cloth.js swings, and the
// strap across his back rides the collarbones, not the upper arms.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { PlayerBody } from '../src/sim/playerbody.js';
import { C_PALETTE, MAX_JOINTS } from '../src/core/layout.js';

const file = fs.readFileSync(new URL('../assets/game/player/wizard.glb', import.meta.url));
const buffer = () => file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

test('the back of his robe hangs under him at every pace, and never goes wild', () => {
  const body = new PlayerBody(buffer());
  assert.ok(body.cloth, 'the wizard has cloth bones');
  assert.ok(body.count <= MAX_JOINTS);
  const snap = new Float32Array(C_PALETTE + MAX_JOINTS * 8 + 64);
  const { rig } = body, pelvis = rig.index.get('Pelvis');
  let z = 0;
  for (const v of [0, 1.3, 3.1, 5.6, 8.6, 0]) {
    for (let k = 0; k < 90; k++) {
      const dt = 1 / 60;
      z += v * dt;
      body.update(dt, { x: 0, y: 0, z, yaw: 0, pitch: 0, vx: 0, vz: v, onGround: true, staff: true, skull: true });
      body.write(snap, 0, true);
      for (let i = 0; i < body.count * 8; i++) assert.ok(Number.isFinite(snap[C_PALETTE + i]));
      for (const c of body.cloth.chains) {
        const i = (c.n - 1) * 3, below = rig.wt[pelvis * 3 + 1] - c.x[i + 1], out = Math.hypot(c.x[i] - rig.wt[pelvis * 3], c.x[i + 2] - rig.wt[pelvis * 3 + 2]);
        assert.ok(below > 0.25 && below < 0.6, `chain ${c.angle} at ${v} m/s: its hem ${below.toFixed(2)} m under the pelvis`);
        assert.ok(out < 0.4, `chain ${c.angle} at ${v} m/s: its hem ${out.toFixed(2)} m out from him`);
      }
    }
  }
});
