// How bodies are drawn (docs/RENDERING.md): Lisandra's model-true shading touches no other body's shader, a cascade
// leaves out only bodies that can't reach it, and the witch is the owner's model with no cloth bones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ARMOR, ARMOR_TRUE } from '../src/gfx/materials.js';
import { COMMON } from '../src/gfx/shaders.js';
import { bodyRadius, inCascade } from '../src/gfx/shadowcull.js';
import { mat4LookTo, mat4Mul, mat4Ortho } from '../src/core/math.js';
import { LISANDRA_FORMS } from '../src/core/lisandra.js';

test('model-true shading is ARMOR with only its two changes', () => {
  // No knight's steel, and the split-sum reflection. (The normal map is read as everyone's is: see the next test.)
  assert.match(ARMOR_TRUE, /var n = perturb\(n0, p, in\.uv, nm\.rg, 1\.0\);/);
  assert.doesNotMatch(ARMOR_TRUE, /darkPaint/);
  assert.match(ARMOR_TRUE, /var c = shadeTrue\(p, n, v, albedo, rough, metal, ao, shadow\);/);
  assert.match(ARMOR_TRUE, /fn envDFG\(/);
  // Take the two changes back out and what's left is ARMOR, character for character.
  const back = ARMOR_TRUE.slice(0, ARMOR_TRUE.indexOf('\n// The split-sum\'s reflectance'))
    .replace('shadeTrue(p, n, v,', 'shadePBR(p, n, v,');
  const steel = ARMOR.match(/\/\/ Metals take their reflection tint from the paint\.[\s\S]*?sunSpecScale = mix\(1\.0, 0\.55, darkPaint\);/)[0];
  assert.equal(back.replace(/\/\/ \(No knight's steel[^\n]*\n {2}envBoost = 1\.0;\n {2}sunSpecScale = 1\.0;/, steel), ARMOR);
  // ...and ARMOR itself, which every other body is drawn with, has none of it.
  assert.doesNotMatch(ARMOR, /shadeTrue|envDFG|1\.0 - nm\.g/);
});

test('normal maps are read the glTF way: red along u, green up the picture, whichever way the screen runs', () => {
  // perturbD's frame comes out scaled by the screen's handedness, and WebGPU's window y runs down, so for a face toward
  // the eye it points along -u and -v. Checked on a GPU (a camera-facing quad with a (1, .5) and a (.5, 1) texel): red
  // came out along -u until the frame was turned by sign(det), and green is read against v.
  const at = COMMON.indexOf('fn perturbD('), f = COMMON.slice(at, COMMON.indexOf('\n}', at));
  assert.match(f, /let det = dot\(dp1, dp2p\);/);
  assert.match(f, /select\(1\.0, -1\.0, det < 0\.0\)/);
  assert.match(f, /t \* inv \* mxy\.x - b \* inv \* mxy\.y/);
  // No shader turns green over on top of that.
  assert.doesNotMatch(ARMOR_TRUE, /1\.0 - nm\.g/);
});

// A cascade as renderer.js writeFrame makes one: a square 2·rad across round (cx, cz), seen from the sun.
function cascade(cx, cz, rad, sun = [0.3, -0.8, 0.2]) {
  const L = Math.hypot(...sun), s = sun.map((v) => v / L);
  const V = new Float32Array(16), P = new Float32Array(16), VP = new Float32Array(16);
  mat4LookTo(V, 0, 0, 0, -s[0], -s[1], -s[2], 0, 1, 0);
  const lx = V[0] * cx + V[8] * cz, ly = V[1] * cx + V[9] * cz, lz = V[2] * cx + V[10] * cz;
  mat4Ortho(P, lx - rad, lx + rad, ly - rad, ly + rad, -lz - 260, -lz + 260);
  mat4Mul(VP, P, V);
  return VP;
}

test('a cascade keeps every body that reaches its square, and only those', () => {
  // (The sun straight down makes the square a square on the ground.)
  const m = cascade(100, 50, 20, [0, -1, 0.0001]);
  assert.equal(inCascade(m, 0, 100, 1, 50, 2), true);
  assert.equal(inCascade(m, 0, 119, 1, 50, 2), true);    // inside, near the edge
  assert.equal(inCascade(m, 0, 121.5, 1, 50, 2), true);  // centre outside, but its sphere reaches in
  assert.equal(inCascade(m, 0, 122.5, 1, 50, 2), false); // wholly outside
  assert.equal(inCascade(m, 0, 100, 1, 200, 5), false);
  // With a low sun, every point of a body that the GPU would draw into the map is kept: sample bodies all round,
  // project their spheres' extreme points, and check none that touches the square is culled.
  const low = cascade(0, 0, 30, [0.8, -0.35, 0.4]);
  const proj = (x, y, z) => [low[0] * x + low[4] * y + low[8] * z + low[12], low[1] * x + low[5] * y + low[9] * z + low[13]];
  for (let x = -80; x <= 80; x += 3.7) {
    for (let z = -80; z <= 80; z += 3.7) {
      const r = 2.5;
      let touches = false;
      for (let k = 0; k < 64 && !touches; k++) {
        const a = k * 2.399, b = Math.acos(1 - 2 * (k + 0.5) / 64);
        const [u, v] = proj(x + r * Math.sin(b) * Math.cos(a), 1 + r * Math.cos(b), z + r * Math.sin(b) * Math.sin(a));
        touches = Math.abs(u) <= 1 && Math.abs(v) <= 1;
      }
      if (touches) assert.equal(inCascade(low, 0, x, 1, z, r), true, `${x},${z}`);
    }
  }
});

test('a body\'s shadow sphere is never smaller than its camera cull radius', () => {
  assert.equal(bodyRadius(5, 0), 6);
  assert.equal(bodyRadius(2.6, 1.8), 1.8 * 1.25 + 1 + 1);
  assert.ok(bodyRadius(5, 9) > 9);
});

test('the witch is the owner\'s model with no cloth bones, and her gown has no cloth sim', () => {
  const witch = LISANDRA_FORMS.find((f) => f.asset.endsWith('witch.glb'));
  assert.equal(witch.cloth, undefined);
  const b = fs.readFileSync(new URL('../assets/game/lisandra/witch.glb', import.meta.url));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  const joints = json.skins[0].joints.map((j) => json.nodes[j].name);
  assert.equal(joints.length, 65);
  assert.deepEqual(joints.filter((n) => n.startsWith('cloth')), []);
  assert.equal(json.extras?.cloth, undefined);
  assert.equal(json.animations.length, 175);
  // (Her gown keeps the _SKIRT mask, which only pushes it out of a leg that would cut through it.)
  assert.ok(json.meshes[0].primitives[0].attributes._SKIRT !== undefined);
});
