// The Tripo monsters face the way they go (src/sim/tripo.js prepareRig): each one with arms, played through its walk and its
// run as the game plays it, has its shoulders square to its yaw. Most of the models stand under a node of their own with a
// quarter turn in it, and without that turn they ran side on, and swung at the air beside you.
//   node --test tests/tripo-facing.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRig } from '../src/sim/tripo.js';
import { quatYaw } from '../src/core/math.js';
import { withVariants } from '../src/core/tripo-monsters.js';

const root = new URL('../', import.meta.url);
const roster = withVariants(JSON.parse(readFileSync(new URL('assets/monsters/tripo/roster.json', root), 'utf8')));
const deg = (a) => Math.round(a * 180 / Math.PI);

test('every Tripo monster with arms faces its yaw as it walks and runs', () => {
  let read = 0;
  for (const [id, meta] of Object.entries(roster)) {
    const b = readFileSync(new URL(`assets/monsters/tripo/${meta.src || id}.glb`, root));
    const rig = prepareRig(id, meta, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    const joint = (end) => rig.names.findIndex((n) => n.endsWith(':' + end));
    const L = joint('LeftArm'), R = joint('RightArm');
    if (L < 0 || R < 0) continue;   // (the dragons, spiders and worms: no shoulders to read)
    const yaw = 0.7;
    rig.rootQ = new Float32Array(4); rig.rootT = new Float32Array(3);
    quatYaw(rig.rootQ, 0, yaw);
    const out = new Float32Array(rig.count * 8);
    for (const name of ['walk', 'run']) {
      const clip = rig.clips[name];
      if (!clip) continue;
      // Forward is the up axis crossed with the line from the left shoulder to the right, over the clip.
      let s = 0, c = 0;
      for (let f = 0; f < 16; f++) {
        rig.solve(clip, clip.dur * f / 16, 1, out, 0);
        const dx = rig.wt[R * 3] - rig.wt[L * 3], dz = rig.wt[R * 3 + 2] - rig.wt[L * 3 + 2], a = Math.atan2(dz, -dx);
        s += Math.sin(a); c += Math.cos(a);
      }
      const off = Math.atan2(Math.sin(Math.atan2(s, c) - yaw), Math.cos(Math.atan2(s, c) - yaw));
      assert.ok(Math.abs(off) < 0.35, `${id} ${name}: its shoulders face ${deg(off)} degrees off the way it's going`);
      read++;
    }
  }
  assert.ok(read > 80, `only ${read} clips read`);
});
