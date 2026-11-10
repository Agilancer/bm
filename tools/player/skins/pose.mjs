// The body's points stood as he stands in the game (arms down, nothing in the hands), for the skin kit's preview pictures:
//   node tools/player/skins/pose.mjs out.f32      -> float32 x, y, z for every point of the mesh, then its normals the same
import fs from 'node:fs';
import { accessor, parseGLB } from '../../../src/core/glb.js';
import { PlayerBody } from '../../../src/sim/playerbody.js';
import { C_PROPS } from '../../../src/core/layout.js';

const file = fs.readFileSync(new URL('../../../assets/game/player/wizard.glb', import.meta.url));
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const body = new PlayerBody(buffer.slice(0));
const snap = new Float32Array(C_PROPS + 64);
const s = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, onGround: true, sprinting: false, dodge: 0, dead: false, deadT: 0, staff: false, skull: false, shield: false, guard: 0, surf: null, cast: null };
body.breath = 0;
for (let i = 0; i < 90; i++) { body.update(1 / 60, s); body.breath = 0; body.write(snap, 0, true); }
const glb = parseGLB(buffer), at = glb.json.meshes[0].primitives[0].attributes;
const P = accessor(glb, at.POSITION), N = accessor(glb, at.NORMAL), J = accessor(glb, at.JOINTS_0), W = accessor(glb, at.WEIGHTS_0);
const n = P.length / 3, out = new Float32Array(n * 6), { pq, pt } = body.rig;
const turn = (q, k, x, y, z) => {
  const qx = pq[k], qy = pq[k + 1], qz = pq[k + 2], qw = pq[k + 3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  return [x + qw * tx + qy * tz - qz * ty, y + qw * ty + qz * tx - qx * tz, z + qw * tz + qx * ty - qy * tx];
};
for (let v = 0; v < n; v++) {
  for (let c = 0; c < 4; c++) {
    const w = W[v * 4 + c], j = J[v * 4 + c];
    if (!w) continue;
    const p = turn(pq, j * 4, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]), m = turn(pq, j * 4, N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
    for (let k = 0; k < 3; k++) { out[v * 3 + k] += w * (p[k] + pt[j * 3 + k]); out[n * 3 + v * 3 + k] += w * m[k]; }
  }
}
fs.writeFileSync(process.argv[2], Buffer.from(out.buffer));
console.log(`${n} points posed`);
