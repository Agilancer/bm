import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { carryFrame, carryMat4, carryPalette, carryPoint } from '../src/core/carry.js';
import { FolkClips, FolkPose, FolkRig, SKIRT_JOINTS } from '../src/folk/rig.js';
import { ClipBank, Rig, writePalette } from '../src/sim/anim.js';
import { Knight } from '../src/sim/knight.js';
import { World } from '../src/sim/world.js';

const bytes = (path) => { const b = fs.readFileSync(new URL(path, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const json = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));

// The same pose to within float error: joint by joint, as the two halves of each dual quaternion (q and -q are one turn).
function samePalette(a, b, count, what) {
  for (let j = 0; j < count; j++) {
    const o = j * 8, s = a[o] * b[o] + a[o + 1] * b[o + 1] + a[o + 2] * b[o + 2] + a[o + 3] * b[o + 3] < 0 ? -1 : 1;
    for (let k = 0; k < 8; k++) assert.ok(Math.abs(a[o + k] - s * b[o + k]) < 2e-4, `${what}: joint ${j} [${k}] ${a[o + k]} vs ${b[o + k]}`);
  }
}

const moves = [
  [0, 0, 0, 0, 0.3, 1.2, 0, -0.7],
  [12.5, 0.4, -30, 2.9, 13.1, 0.55, -29.2, -3.1],
  [-60, 2, 44, -1.2, -59.7, 2.01, 44.4, -1.05],
];

test('a townsperson posed in one place and carried to another is posed as if made there, skirt and all', () => {
  const folk = json('../assets/game/folk/folk.json');
  const clips = new FolkClips(json('../assets/game/folk/clips.json'), bytes('../assets/game/folk/clips.bin'));
  const m = folk.models.lady_blue;
  const rig = new FolkRig(parseGLB(bytes(`../assets/game/folk/${m.glb}`)), clips, { skirt: m.skirt });
  const pose = new FolkPose(rig);
  pose.play('walk'); pose.step(0.37);
  const n = rig.count + SKIRT_JOINTS, A = new Float32Array(n * 8), B = new Float32Array(n * 8), C = new Float32Array(n * 8), c = new Float32Array(8);
  for (const [x0, y0, z0, yaw0, x1, y1, z1, yaw1] of moves) {
    pose.solve(x0, y0, z0, yaw0, A, 0);
    pose.solve(x1, y1, z1, yaw1, B, 0);
    assert.ok(carryFrame(c, yaw0, x0, y0, z0, yaw1, x1, y1, z1));
    carryPalette(A, 0, C, 0, rig.count, c);
    samePalette(C, B, rig.count, 'folk');
    const s = rig.count * 8;
    for (let i = 0; i < 6; i++) {
      carryPoint(A, s + i * 4, C, s + i * 4, c);
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(C[s + i * 4 + k] - B[s + i * 4 + k]) < 2e-4, `skirt point ${i}`);
      assert.equal(A[s + i * 4 + 3], B[s + i * 4 + 3]);
    }
    assert.ok(Math.abs(B[s + 24] - yaw1) < 1e-6);
  }
  // Nowhere to go: nothing carried.
  assert.equal(carryFrame(c, 0.5, 1, 2, 3, 0.5, 1, 2, 3), false);
});

test('a knight posed in one place and carried to another: the same palette, sword and shield as one posed there', () => {
  const bank = new ClipBank(json('../assets/game/clips.json'), bytes('../assets/game/clips.bin'));
  const k = new Knight(0, 0, new Rig(parseGLB(bytes('../assets/game/velscour_knight.glb')), bank), bank,
    { spawn: [0, 0], hp: 500, hostile: true, swordScale: 1.085, shieldScale: 1.6, bladeLen: 1, route: [[0, 0]], walk: 1.5, style: 'black' });
  const world = Object.assign(Object.create(World.prototype), { colliders: [], trunks: new Map(), siteBoxes: new Map(), height: () => 0 });
  const sim = { time: 0, tick: 0, gameState: 0, world, knights: [k], player: { x: 10, y: 0, z: 0, dead: false }, casting: { bolts: [] }, event() {}, slowMo() {}, tacticWeights: [1, 1, 1, 1, 1, 1] };
  k.play('Walk_Loop'); k.animate(0.4, sim);
  const n = k.rig.count, A = new Float32Array(n * 8), B = new Float32Array(n * 8), C = new Float32Array(n * 8), c = new Float32Array(8);
  const pA = new Float32Array(48), pB = new Float32Array(48), pC = new Float32Array(48);
  for (const [x0, y0, z0, yaw0, x1, y1, z1, yaw1] of moves) {
    Object.assign(k, { x: x0, y: y0, z: z0, yaw: yaw0 }); k.animate(0, sim);
    writePalette(k.pose, A, 0); k.writeProps(pA, 0);
    Object.assign(k, { x: x1, y: y1, z: z1, yaw: yaw1 }); k.animate(0, sim);
    writePalette(k.pose, B, 0); k.writeProps(pB, 0);
    carryFrame(c, yaw0, x0, y0, z0, yaw1, x1, y1, z1);
    carryPalette(A, 0, C, 0, n, c);
    samePalette(C, B, n, 'knight');
    for (let m = 0; m < 2; m++) {
      carryMat4(pA, m * 16, pC, m * 16, c);
      for (let i = 0; i < 16; i++) assert.ok(Math.abs(pC[m * 16 + i] - pB[m * 16 + i]) < 3e-4, `prop ${m} [${i}] ${pC[m * 16 + i]} vs ${pB[m * 16 + i]}`);
    }
  }
});
