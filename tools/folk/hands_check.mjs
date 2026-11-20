// The game's own pose code against tools/folk/hands.py's mirror of it in Blender: where it puts a body's finger joints in
// a clip (and its arms, drawn out and brought forward for a fold as the game does).
//   node tools/folk/hands_check.mjs BODY CLIP SHARE [ARM_OUT] [FOLD] [upright]  ->  JSON {name: [x, y, z]} of the arm, hand and finger joints.
import { readFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { FolkClips, FolkRig, FolkPose } from '../../src/folk/rig.js';
const R = (p) => readFileSync(new URL(`../../assets/game/folk/${p}`, import.meta.url));
const [body, clip, share = '0.25', armOut = '0', fold = '0', upright = ''] = process.argv.slice(2);
const bin = R('clips.bin'), meta = JSON.parse(R('clips.json'));
const clips = new FolkClips(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const g = R(`${body}.glb`);
const rig = new FolkRig(parseGLB(g.buffer.slice(g.byteOffset, g.byteOffset + g.byteLength)), clips, { armOut: Number(armOut), fold: Number(fold), upright: upright === 'upright' });
const pose = new FolkPose(rig);
const c = rig.clip(clip);
pose.a.clip = c; pose.a.t = c.dur * Number(share); pose.w = 1;
pose.solve(0, 0, 0, 0, new Float32Array(rig.count * 8 + 64), 0);
const out = {};
rig.names.forEach((n, j) => { if (/Hand|Arm/.test(n)) out[n.split(':').pop()] = [pose.wt[j * 3], pose.wt[j * 3 + 1], pose.wt[j * 3 + 2]].map((v) => +v.toFixed(5)); });
console.log(JSON.stringify(out));
