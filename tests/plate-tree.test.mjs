// The tree over a suit's plates (src/sim/world.js PlateBVH), its nodes in two typed arrays: a ray through it meets what
// a ray tried against every triangle meets.   node --test tests/plate-tree.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PlateBVH } from '../src/sim/world.js';

function rnd(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

test('a ray through the tree meets the nearest triangle, as trying them all does', () => {
  const r = rnd(7), nt = 900;
  const pos = new Float32Array(nt * 9), tris = new Uint32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const cx = r() * 4 - 2, cy = r() * 4 - 2, cz = r() * 4 - 2;
    for (let v = 0; v < 3; v++) { pos[t * 9 + v * 3] = cx + r() * 0.5; pos[t * 9 + v * 3 + 1] = cy + r() * 0.5; pos[t * 9 + v * 3 + 2] = cz + r() * 0.5; tris[t * 3 + v] = t * 3 + v; }
  }
  const all = new PlateBVH(pos, tris, 0, nt), part = new PlateBVH(pos, tris, 300, 200);
  assert.equal(all.box.length % 6, 0); assert.equal(all.link.length / 4, all.box.length / 6);
  for (let k = 0; k < 3; k++) { assert.ok(all.mn[k] < -1.9 && all.mx[k] > 2.3, 'its box holds them all'); }
  // One triangle at a time: a tree of one leaf, which is every triangle tried.
  const single = (lo, n) => Array.from({ length: n }, (_, i) => new PlateBVH(pos, tris, lo + i, 1));
  const brute = (list, o, d, hn) => { let best = -1; const n = [0, 0, 0]; for (const b of list) { const t = b.ray(o[0], o[1], o[2], d[0], d[1], d[2], best < 0 ? 50 : best, n); if (t >= 0) { best = t; hn[0] = n[0]; hn[1] = n[1]; hn[2] = n[2]; } } return best; };
  const every = single(0, nt), some = single(300, 200);
  let hits = 0;
  for (let i = 0; i < 400; i++) {
    const o = [r() * 10 - 5, r() * 10 - 5, r() * 10 - 5];
    let d = [-o[0] + r() - 0.5, -o[1] + r() - 0.5, -o[2] + r() - 0.5]; const l = Math.hypot(...d); d = d.map((v) => v / l);
    for (const [tree, list] of [[all, every], [part, some]]) {
      const n1 = [0, 0, 0], n2 = [0, 0, 0];
      const a = tree.ray(o[0], o[1], o[2], d[0], d[1], d[2], 50, n1), b = brute(list, o, d, n2);
      assert.ok(Math.abs(a - b) < 1e-9, `ray ${i}: ${a} against ${b}`);
      if (a >= 0) { hits++; assert.deepEqual(n1, n2); }
    }
  }
  assert.ok(hits > 200, `${hits} hits`);
});
