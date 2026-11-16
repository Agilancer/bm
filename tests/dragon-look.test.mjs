// The dragons' look (src/sim/anim.js ArmsRig.aimHead, src/sim/tripo.js TripoMonster.look): while a clip says so (its
// info.aim window) the last joints of the neck and the head turn the mouth up or down onto what it breathes or bites at,
// so a breath comes out of the jaw at you and not over your head or into the ground at its own feet. Each dragon, its
// breath held, aimed at one near and low and one far off: the mouth points within a few degrees of each.
//   node --test tests/dragon-look.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRig } from '../src/sim/tripo.js';
import { quatRotate, quatYaw } from '../src/core/math.js';

const root = new URL('../', import.meta.url);
const roster = JSON.parse(readFileSync(new URL('assets/monsters/tripo/roster.json', root), 'utf8'));
const deg = (a) => a * 180 / Math.PI;

// The mouth's tip and which way it points, below level (radians), from the solved pose.
function mouth(rig) {
  const h = rig.mouth, v = new Float32Array(3);
  quatRotate(v, 0, rig.wq, h * 4, rig.mouthTip, 0);
  const p = [rig.wt[h * 3] + v[0], rig.wt[h * 3 + 1] + v[1], rig.wt[h * 3 + 2] + v[2]];
  return { p, down: Math.atan2(-v[1], Math.hypot(v[0], v[2])) };
}

test('each dragon turns its mouth onto what it breathes at, near and far', () => {
  let read = 0;
  for (const id of ['dragon_green', 'dragon_red', 'dragon_black', 'dragon_undead']) {
    const meta = roster[id];
    assert.ok(meta, `${id} in the roster`);
    const b = readFileSync(new URL(`assets/monsters/tripo/${meta.src || id}.glb`, root));
    const rig = prepareRig(id, meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    assert.ok(rig.lookChain, `${id}: has its look chain (neck4 to the head)`);
    const clip = rig.clips.breath_hold;
    assert.ok(clip?.info?.aim, `${id}: breath_hold says when to look`);
    rig.rootQ = new Float32Array(4); rig.rootT = new Float32Array(3);
    quatYaw(rig.rootQ, 0, 0.4);
    const out = new Float32Array(rig.count * 8);
    // where it points with no look, and where the mouth is
    rig.aim = null;
    rig.solve(clip, 0.5, 1, out, 0);
    const bare = mouth(rig);
    const fx = Math.sin(0.4), fz = Math.cos(0.4);
    for (const [dist, y] of [[8, 0.9], [60, 0.9]]) {
      const to = [bare.p[0] + fx * dist, y, bare.p[2] + fz * dist];
      rig.aim = { joints: rig.lookChain, share: [0.15, 0.2, 0.25, 0.4], tip: rig.mouthTip, to, w: 1,
        lo: -6 * Math.PI / 180, hi: 58 * Math.PI / 180, most: 42 * Math.PI / 180, applied: 0 };
      rig.solve(clip, 0.5, 1, out, 0);
      const m = mouth(rig);
      const want = Math.atan2(m.p[1] - y, Math.hypot(to[0] - m.p[0], to[2] - m.p[2]));
      const off = deg(m.down - want);
      assert.ok(Math.abs(off) < 4, `${id} at ${dist} m: the mouth points ${off.toFixed(1)} degrees off (wants ${deg(want).toFixed(1)} below level, was ${deg(bare.down).toFixed(1)} with no look)`);
      read++;
    }
    // and with no weight it's the clip's own pose, untouched
    rig.aim.w = 0;
    rig.solve(clip, 0.5, 1, out, 0);
    assert.ok(Math.abs(deg(mouth(rig).down - bare.down)) < 0.01, `${id}: no look, no change`);
  }
  assert.equal(read, 8);
});
