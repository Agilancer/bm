// The land drawn a square at a time (src/gfx/landcells.js): every triangle kept, each in the square its sphere holds,
// and a pass that sees everything draws everything, in one draw.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketLand, drawLandInView } from '../src/gfx/landcells.js';

function land(nt, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const f = new Float32Array(nt * 3 * 9), idx = new Uint32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const x = rnd() * 3000 - 1500, z = rnd() * 2000 - 1000, w = rnd() < 0.05 ? 400 : 6;
    for (let k = 0; k < 3; k++) {
      const v = t * 3 + k;
      f[v * 9] = x + (rnd() - 0.5) * w; f[v * 9 + 1] = rnd() * 40; f[v * 9 + 2] = z + (rnd() - 0.5) * w;
      idx[v] = v;
    }
  }
  return { f, idx };
}

test('every triangle is kept, and its corners lie in its square\'s sphere', () => {
  const { f, idx } = land(5000);
  const before = new Set(); for (let t = 0; t < 5000; t++) before.add(idx.slice(t * 3, t * 3 + 3).join(','));
  // (Two runs, as the land has: the opaque and the cutouts, each bucketed apart.)
  const A = bucketLand(f, idx, 0, 3000 * 3), B = bucketLand(f, idx, 3000 * 3, 5000 * 3);
  const after = new Set(); for (let t = 0; t < 5000; t++) after.add(idx.slice(t * 3, t * 3 + 3).join(','));
  assert.deepEqual(after, before);
  for (const [L, from, to] of [[A, 0, 9000], [B, 9000, 15000]]) {
    let at = from;
    for (let i = 0; i < L.n; i++) {
      assert.equal(L.first[i], at, 'the squares lie end to end in the buffer'); at += L.count[i];
      const [x, y, z, r] = L.sph.slice(i * 4, i * 4 + 4);
      for (let p = L.first[i]; p < L.first[i] + L.count[i]; p++) {
        const v = idx[p] * 9;
        assert.ok(Math.hypot(f[v] - x, f[v + 1] - y, f[v + 2] - z) <= r + 1e-3, 'a corner outside its square\'s sphere');
      }
    }
    assert.equal(at, to);
  }
});

test('a view that holds everything draws it all in one draw; one that holds nothing draws nothing', () => {
  const { f, idx } = land(2000, 3);
  const L = bucketLand(f, idx, 0, 6000);
  const calls = [];
  const pass = { drawIndexed: (n, k, a) => calls.push([n, a]) };
  const all = new Float32Array(20); for (let k = 0; k < 5; k++) all[k * 4 + 3] = 1;   // (0x + 1 >= 0 everywhere)
  assert.equal(drawLandInView(pass, L, all), 6000);
  assert.deepEqual(calls, [[6000, 0]]);
  calls.length = 0;
  const none = new Float32Array(20); none[3] = -1e12;
  assert.equal(drawLandInView(pass, L, none), 0);
  assert.equal(calls.length, 0);
});

test('a corner that isn\'t a number neither throws nor is lost', () => {
  const { f, idx } = land(50, 11);
  f[0] = NaN; f[2] = NaN;
  const L = bucketLand(f, idx, 0, 150);
  let n = 0; for (let i = 0; i < L.n; i++) n += L.count[i];
  assert.equal(n, 150);
});
