// Every body in the clips it lives by, through the game's own pose code: nothing not a number, nobody's hands or feet
// flung off. node tools/folk/all_check.mjs
import { readFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { FolkClips, FolkRig, FolkPose } from '../../src/folk/rig.js';
const R = (p) => readFileSync(new URL(`../../assets/game/folk/${p}`, import.meta.url));
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const folk = JSON.parse(R('folk.json')), meta = JSON.parse(R('clips.json'));
const clips = new FolkClips(meta, ab(R('clips.bin')));
const NAMES = ['walk', 'walk_ual', 'walk_formal', 'walk_proud', 'swagger', 'jog', 'run', 'flee', 'idle', 'idle_ual', 'fold_arms', 'fold_arms_ual', 'look_around', 'talk', 'nod', 'lantern', 'water', 'wait', 'scratch', 'laugh'];
let bad = 0, n = 0;
for (const [id, m] of Object.entries(folk.models)) {
  const rig = new FolkRig(parseGLB(ab(R(m.glb))), clips, { armOut: 0.1, skirt: m.skirt || null, upright: m.upright, fold: m.fold });
  const pose = new FolkPose(rig), out = new Float32Array(rig.count * 8 + 64);
  for (const name of NAMES) {
    const c = rig.clip(name);
    if (!c) { console.log('no clip', name); bad++; continue; }
    for (const s of [0.1, 0.5, 0.9]) {
      pose.a.clip = c; pose.a.t = c.dur * s; pose.w = 1;
      pose.solve(0, 0, 0, 0, out, 0); n++;
      let ok = true;
      for (let i = 0; i < rig.count * 3; i++) if (!Number.isFinite(pose.wt[i]) || Math.abs(pose.wt[i]) > 4) ok = false;
      for (let i = 0; i < rig.count * 8; i++) if (!Number.isFinite(out[i])) ok = false;
      if (!ok) { console.log('BAD', id, name, s); bad++; }
    }
  }
}
console.log(`${n} poses of ${Object.keys(folk.models).length} bodies, ${bad} bad`);
process.exit(bad ? 1 : 0);
