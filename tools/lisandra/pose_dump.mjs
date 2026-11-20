// Lisandra's poses through the cave, as the game makes them: the opening's own blocking (src/sim/opening.js) driving her
// real walker (src/sim/village-walker.js: clips, fitted arms, gown shaping, reach, snap), every STEP seconds of the scene
// from waking to the name and her herding you out. Each pose's skinning palette (dual quaternions, world space) goes to a
// JSON file that tools/lisandra/self_clip.py reads in Blender to find where her arms or hands pass into her own body.
//
//   node tools/lisandra/pose_dump.mjs OUT.json [witch|pretty] [STEP]
import fs from 'node:fs';
import { Opening } from '../../src/sim/opening.js';
import { OPENING } from '../../src/core/opening.js';
import { LISANDRA_FORMS } from '../../src/core/lisandra.js';
import { VillageWalker } from '../../src/sim/village-walker.js';
import { BODIES, Caster, Zombie } from '../../src/sim/undead.js';
import { C, C_PALETTE } from '../../src/core/layout.js';
import { INPUT } from '../../src/core/layout.js';

const out = process.argv[2], which = process.argv[3] || 'witch', STEP = Number(process.argv[4]) || 0.25;
const root = new URL('../../', import.meta.url);
const buf = (p) => { const b = fs.readFileSync(new URL(p, root)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
// LIS_CLEAR='{"clip": [out, fwd]}' tries other per-clip arm clearances (src/core/lisandra.js clear) on the witch.
const trial = process.env.LIS_CLEAR ? JSON.parse(process.env.LIS_CLEAR) : null;
const walkers = LISANDRA_FORMS.map((f, i) => new VillageWalker(buf(f.asset), i === 1 && trial ? { ...f, clear: { ...f.clear, ...trial } } : f, true));
for (const w of walkers) w.reset();
function standIn(proto, opts) {
  const k = Object.create(proto);
  Object.assign(k, { opts, scale: opts.scale || 1, x: 0, z: 0, y: 0, dead: true, dormant: true, deadT: 0, state: 0, stateT: 9, ups: 0, owner: null,
    reset(o) { Object.assign(this, { x: o.spawn[0], z: o.spawn[1], dead: false, dormant: false, deadT: 0, hp: o.hp, maxHp: o.hp }); this.ups++; },
    rise() {}, onHit() {} });
  return k;
}
const knights = [];
for (const b of BODIES) for (let i = 0; i < b.count; i++) {
  const caster = !b.model.startsWith('zombie_') || b.model === 'zombie_necromancer';
  knights.push(standIn(caster ? Caster.prototype : Zombie.prototype, { model: b.model, scale: b.scale, child: !!b.child }));
}
const world = { height: () => 0, groundFor: () => 0, groundBy: () => 0, setCaveSealed() {}, inside: () => false };
const input = new Float32Array(64);
const player = { x: 0, z: 0, y: 0, vx: 0, vz: 0, surfing: false, maxHp: 100, hp: 100, trauma: 0 };
const sim = { player, world, villagers: walkers, knights, time: 0, event() {}, input };
const op = new Opening(sim);
const w = walkers[which === 'pretty' ? 0 : 1];
const n = w.rig.count, snap = new Float32Array(C_PALETTE + n * 8 + 64);
const dt = 1 / 60, poses = [];
let T = 0, next = 0, cast = false;
while (T < 400 && op.stage !== OPENING.LEAVE && op.stage !== OPENING.ESCORT) {
  if (op.stage === OPENING.WAKE && !cast && op.time > 62) { input[INPUT.CAST_N] += 1; cast = true; }
  if (op.stage === OPENING.NAME && op.time > 3) op.named();
  op.update(dt); T += dt; sim.time = T;
  if (T >= next) {
    next += STEP;
    w.write(snap, 0);
    poses.push({ t: +T.toFixed(2), stage: op.stage, clip: w.clip, x: w.x, z: w.z, yaw: w.yaw,
      pal: Array.from(snap.subarray(C_PALETTE, C_PALETTE + n * 8), (v) => +v.toFixed(5)) });
  }
}
fs.writeFileSync(out, JSON.stringify({ which, asset: LISANDRA_FORMS[which === 'pretty' ? 0 : 1].asset, names: w.rig.names ?? null, poses }));
console.log(`${poses.length} poses of ${which}, ${T.toFixed(1)} s`);
