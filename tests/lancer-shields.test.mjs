// The lancers' spinning shields (FX.SHIELD): the four golden shields from VELSCOUR's Lancer, as real boards. Their outlines
// and paint are written by tools/shields/lancer_spin.py; the renderer builds their meshes (src/gfx/spellfx.js shieldMeshes).
//   node --test tests/lancer-shields.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FX, SHIELDS } from '../src/sim/spells.js';
import { SHIELD_CELL, SHIELD_NAMES, SHIELD_OUTLINE } from '../src/gfx/shieldshapes.js';
import { shieldMeshes } from '../src/gfx/spellfx.js';

test('the four shields are the sim\'s four, in the renderer\'s order', () => {
  assert.equal(FX.SHIELD, 24, 'solid, and not a light (src/gfx/spellfx.js frame)');
  assert.ok(FX.SHIELD >= FX.ICE && FX.SHIELD < FX.LIGHT);
  assert.deepEqual(SHIELD_NAMES, ['round', 'diamond', 'kite', 'tower']);
  assert.deepEqual([SHIELDS.ROUND, SHIELDS.DIAMOND, SHIELDS.KITE, SHIELDS.TOWER], [0, 1, 2, 3]);
});

test('each outline is whole, the same either side, and stays inside its cell of the paint', () => {
  for (const name of SHIELD_NAMES) {
    const R = SHIELD_OUTLINE[name], n = R.length;
    assert.ok(n >= 48 && n % 4 === 0, `${name}: ${n} spokes`);
    for (let i = 0; i < n; i++) {
      assert.ok(R[i] > 0.2 && R[i] <= 1.12, `${name}: spoke ${i} is ${R[i]}`);
      assert.ok(Math.abs(R[i] - R[(n / 2 - i + n) % n]) < 1e-3, `${name}: lopsided at spoke ${i}`);
      assert.ok(R[i] * SHIELD_CELL < 0.5, `${name}: out of its cell`);
    }
    assert.ok(Math.abs(R[n / 4] - 1) < 0.04 && Math.abs(R[3 * n / 4] - 1) < 0.04, `${name}: one half height up and down`);
  }
  // (Each its own shape: no two as wide as each other.)
  const wide = SHIELD_NAMES.map((name) => SHIELD_OUTLINE[name][0]);
  assert.equal(new Set(wide.map((w) => w.toFixed(1))).size, 4, `widths ${wide}`);
});

test('the meshes: a face, a rear and an edge each, every index its own shield\'s', () => {
  const { vertices: V, indices: X, parts } = shieldMeshes();
  assert.equal(parts.length, 4);
  assert.equal(V.length % 9, 0);
  assert.ok(V.length / 9 < 65536, 'sixteen-bit indices');
  let end = 0;
  parts.forEach(([first, count], k) => {
    assert.equal(first, end); end = first + count;
    assert.equal(count % 3, 0);
    const kinds = new Set();
    for (let i = first; i < first + count; i++) {
      const o = X[i] * 9, u = V[o + 6], v = V[o + 7], kind = V[o + 8];
      kinds.add(kind);
      assert.ok(Number.isFinite(V[o]) && Math.hypot(V[o + 3], V[o + 4], V[o + 5]) > 0.2);
      if (kind === 1) continue;
      assert.ok(u > k / 4 && u < (k + 1) / 4, `shield ${k} reads another's paint: u ${u}`);
      assert.ok(kind === 0 ? v < 0.5 : v > 0.5, 'the face from the top row, the rear from the bottom');
      assert.ok(kind === 0 ? V[o + 5] > 0 : V[o + 5] < 0, 'the face looks out, the rear back');
    }
    assert.deepEqual([...kinds].sort(), [0, 1, 2]);
  });
  assert.equal(end, X.length);
});

test('a lancer\'s boards are the golden shields, not kites of light', () => {
  const skills = fs.readFileSync(new URL('../src/sim/heroskills.js', import.meta.url), 'utf8');
  for (const key of ['tower_shields', 'bulwark_nova', 'charge_of_the_order']) {
    const at = skills.indexOf(`CAST.${key} = `), body = skills.slice(at, skills.indexOf('\nCAST.', at + 10));
    assert.ok(at > 0 && body.includes('shield3('), `${key} draws no shield`);
    assert.ok(!body.includes('FX.KITE'), `${key} still draws a kite of light`);
  }
  const paint = fs.statSync(new URL('../assets/game/fx/lancer_shields.webp', import.meta.url));
  assert.ok(paint.size > 50000, 'their paint is there');
});
