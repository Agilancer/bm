// The roads' bed (src/core/roadbed.js): laid level across, its heights in step with the ways, and its flights of steps
// walkable on their slope.
import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainHeight, groundBase } from '../src/core/terrain.js';
import { ROUTES } from '../src/core/lands.js';
import { BED, BED_COUNT } from '../src/core/roadbed-data.js';
import { BED_STEP, NO_BED, RISE, RISE_MAX, bedStale, routeSamples, stairDip, stairFlights } from '../src/core/roadbed.js';
import { Kit } from '../src/core/sites.js';
import { buildStairCell, stairCells } from '../src/core/stairs.js';

const decode = (b64) => { const b = Buffer.from(b64, 'base64'); return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };

test('the bed was laid for the ways as they are (else run node tools/roads/bed.mjs)', () => {
  assert.equal(BED_COUNT, ROUTES.length);
  ROUTES.forEach((r, n) => assert.equal(decode(BED[n][0]).length, routeSamples(r.pts, BED_STEP).length, r.name));
  stairFlights();
  assert.equal(bedStale, false);
});

test('the bed follows the land it was laid on (else the land changed: run node tools/roads/bed.mjs)', () => {
  // (Its heights are never further from the land under them than the deepest cut or fill, give or take where two meet.)
  let far = 0, n = 0;
  ROUTES.forEach((r, k) => {
    if (k % 7) return;
    const ys = decode(BED[k][0]), at = routeSamples(r.pts, BED_STEP);
    for (let i = 0; i < at.length; i += 5) { if (ys[i] === NO_BED) continue; n++; if (Math.abs(ys[i] / 32 - groundBase(at[i][0], at[i][1])) > 9) far++; }
  });
  assert.ok(far / n < 0.002, `${far} of ${n}`);
});

test('a road is level from one edge to the other', () => {
  // Across every way, every 10 m, at nine tenths of its half-width: nearly all within 2 in 100, and hardly any over 6.
  let n = 0, flat = 0, tipped = 0;
  for (const r of ROUTES) {
    const ys = decode(BED[ROUTES.indexOf(r)][0]);
    if (ys.some((y) => y === NO_BED)) continue;   // (not the town's and Phobos's own, which are left as they lie)
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, w = r.w * 0.9;
      for (let u = 3; u < L - 3; u += 10) {
        const x = ax + ux * u, z = az + uz * u, g = Math.abs(terrainHeight(x - uz * w, z + ux * w) - terrainHeight(x + uz * w, z - ux * w)) / (2 * w);
        n++; if (g < 0.02) flat++; if (g > 0.06) tipped++;
      }
    }
  }
  assert.ok(flat / n > 0.9, `level: ${(flat / n * 100).toFixed(1)}%`);
  assert.ok(tipped / n < 0.03, `tipped: ${(tipped / n * 100).toFixed(1)}%`);
});

test('every tread is within half a riser of the slope walked, and the ground is sunk only under the flights', () => {
  let n = 0;
  for (const f of stairFlights().filter((_, i) => i % 23 === 0)) {
    const y0 = f.point(f.s0)[2];
    for (let s = f.s0 + 0.2; s < f.s1 - 0.2; s += 0.37) {
      const [x, z, y] = f.point(s), q = Math.round((y - y0) / f.rise);
      assert.ok(Math.abs(y0 + q * f.rise - y) <= f.rise / 2 + 1e-6 && f.rise <= RISE_MAX && f.rise >= RISE);
      assert.ok(stairDip(x, z) > 0.3, `${f.name} at ${s.toFixed(1)}: ground not sunk`);
      n++;
    }
    // (Not a step's width off its side.)
    const [x, z, , ux, uz] = f.point((f.s0 + f.s1) / 2);
    if (!stairFlights().some((g) => g !== f && Math.hypot(g.point((g.s0 + g.s1) / 2)[0] - x, g.point((g.s0 + g.s1) / 2)[1] - z) < 80)) assert.equal(stairDip(x + uz * (f.w + 1.5), z - ux * (f.w + 1.5)), 0);
  }
  assert.ok(n > 100);
});

test('a square of steps builds', () => {
  const [key] = stairCells().keys();
  const K = new Kit(true);
  assert.ok(buildStairCell(K, key) > 0);
  K.finish();
  let tris = 0;
  for (const p of K.parts.values()) tris += p.idx.length / 3;
  assert.ok(tris > 0 && tris < 60000);
  assert.equal(K.colliders.length, 0);
});
