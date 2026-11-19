// The opening played out with no page, as the sim plays it (src/sim/opening.js): from waking in Lisandra's cave to her
// quest at the edge of Bellmourn, with a player who does what's asked when it's asked. It prints each stage as it begins,
// each line she says with when, the fight's waves, and how long it all took, so a change to the script or the way down
// can be read end to end. (Stand-ins for the world and the dead, as in tests/road-fight.test.mjs.)
//
//   node tools/opening/play.mjs [--idle] [--walk] [--kill N]
//
// --idle: never casts in the cave (the spark goes on its own). --walk: walks the road instead of running (5.6 m/s against
// 3.5). --kill N: how many of the dead the player puts down a second (default 0.8).
import { Opening } from '../../src/sim/opening.js';
import { CAVE_LINE, CHAMBER_FIRST, OPENING, caveNearest } from '../../src/core/opening.js';
import { CUES, CUE_IDS, SCRIPT } from '../../src/core/opening-script.js';
import { ROUTE, routeAt, routeDir } from '../../src/core/escort.js';
import { BODIES, Caster, Zombie } from '../../src/sim/undead.js';
import { INPUT } from '../../src/core/layout.js';

const arg = (k) => process.argv.includes(k);
const KILL = Number(process.argv[process.argv.indexOf('--kill') + 1]) || 0.8, ROAD = arg('--walk') ? 3.5 : 5.6;

function standIn(proto, opts) {
  const k = Object.create(proto);
  Object.assign(k, { opts, scale: opts.scale || 1, x: 0, z: 0, y: 0, dead: true, dormant: true, deadT: 0, state: 0, stateT: 9, ups: 0, owner: null,
    reset(o) { Object.assign(this, { x: o.spawn[0], z: o.spawn[1], dead: false, dormant: false, deadT: 0, hp: o.hp, maxHp: o.hp }); this.ups++; },
    rise() {}, onHit() {} });
  return k;
}
const knights = [];
for (const b of BODIES) for (let i = 0; i < b.count; i++) {
  const caster = !b.model.startsWith('zombie_') || b.model === 'zombie_necromancer', reserve = i >= b.count - (b.kept || 0);
  if (b.model === 'zombie_ogre' || (caster && !reserve)) continue;
  knights.push(standIn(caster ? Caster.prototype : Zombie.prototype, { model: b.model, scale: b.scale, reserve, child: !!b.child, grave: !reserve && i < 2 ? [0, 0] : null, role: caster ? 'necromancer' : undefined }));
}
const world = { height: () => 0, groundFor: () => 0, groundBy: () => 0, setCaveSealed() {}, inside: () => false };
const body = () => ({ x: 0, z: 0, y: 0, yaw: 0, act(dt, w, b) { if (b.to && b.speed > 0) { const dx = b.to[0] - this.x, dz = b.to[1] - this.z, d = Math.hypot(dx, dz); if (d > 0.02) { const s = Math.min(d, b.speed * dt); this.x += dx / d * s; this.z += dz / d * s; } } } });
const input = new Float32Array(64);
const player = { x: 0, z: 0, y: 0, vx: 0, vz: 0, surfing: false, maxHp: 100, hp: 100, trauma: 0 };
const sim = { player, world, villagers: [body(), body()], knights, time: 0, event() {}, input };
const op = new Opening(sim);

const names = Object.fromEntries(Object.entries(OPENING).map(([k, v]) => [v, k]));
const clock = (s) => { const d = Math.round(s * 10); return `${Math.floor(d / 600)}:${String(Math.floor(d % 600 / 10)).padStart(2, '0')}.${d % 10}`; };
const dt = 1 / 60;
let T = 0, stage = -1, stageT = 0, lastLine = null, lastCue = 0, s = 0, firstMove = null, firstCast = null, fightT = null, maxShake = 0;
const took = {};
while (T < 1800 && op.stage !== OPENING.ARRIVED) {
  if (op.stage !== stage) {
    if (stage >= 0) took[names[stage]] = T - stageT;
    stage = op.stage; stageT = T;
    console.log(`\n${clock(T)}  == ${names[stage]}`);
    if (stage === OPENING.LEAVE || stage === OPENING.HERD) { [player.x, player.z] = [player.x, player.z]; }
  }
  const t = op.time;
  // The cave: cast a second after you're asked (unless --idle), and give a name three seconds after the prompt.
  if (stage === OPENING.WAKE && !arg('--idle') && t > (op.castSeen === undefined ? 1e9 : 0) && t > 59.9 && firstCast === null) {
    const { CAST_AT } = await import('../../src/core/opening.js');
    if (t > CAST_AT + 1) { input[INPUT.CAST_N] += 1; firstCast = T; }
  }
  if (stage === OPENING.NAME && t > 3) op.named();
  // Out of the cave: along its middle, from wherever you are to the mouth, as fast as you're let; then out onto the ledge.
  let v = 0, dir = [0, 0];
  if (stage === OPENING.HERD && t > op.time - 1 && !op.frozen() || stage === OPENING.LEAVE) {
    const n = caveNearest(player.x, player.z), i = Math.max(0, n.i - 2), to = CAVE_LINE[i];
    const out = n.s < 0.5 ? [player.x + (CAVE_LINE[0][0] - CAVE_LINE[3][0]), player.z + (CAVE_LINE[0][1] - CAVE_LINE[3][1])] : [to[0], to[1]];
    const d = Math.hypot(out[0] - player.x, out[1] - player.z) || 1;
    v = Math.min(sim.paceCap ?? 6.5, 6.5); dir = [(out[0] - player.x) / d, (out[1] - player.z) / d];
    if (firstMove === null) firstMove = T;
  }
  if (stage === OPENING.ESCORT) {
    const fighting = op.fightS && !op.ambushDone;
    if (fighting && fightT === null) { fightT = T; console.log(`${clock(T)}  -- the dead come up`); }
    v = fighting ? 0 : Math.min(sim.paceCap ?? ROAD, ROAD);
    s = Math.min(ROUTE.len, Math.max(s, op.prog - 6) + v * dt);
    const [x, z] = routeAt(s), [rx, rz] = routeDir(s);
    player.x = x; player.z = z; dir = [rx, rz];
    if (s >= ROUTE.len - 0.01 && !took.walked) { took.walked = 1; console.log(`${clock(T)}  -- you're at the town's edge`); }
    if (fighting) {
      const up = knights.filter((k) => !k.dead);
      if (Math.floor((T - fightT) * KILL) !== Math.floor((T - fightT - dt) * KILL) && up.length) { up[0].dead = true; up[0].deadT = 0; }
      if (process.env.DEBUG && Math.floor(T - fightT) !== Math.floor(T - fightT - dt)) console.log(`   ${(T - fightT).toFixed(0)} s: ${up.length} up, phase ${op.fightS.phase}, due ${op.fightS.due.length}`);
    } else if (fightT !== null && op.ambushDone && !took.fight) { took.fight = T - fightT; console.log(`${clock(T)}  -- the last of them down (${took.fight.toFixed(0)} s)`); }
  } else if (v) { player.x += dir[0] * v * dt; player.z += dir[1] * v * dt; }
  player.vx = dir[0] * v; player.vz = dir[1] * v;
  op.update(dt); T += dt; sim.time = T;
  maxShake = Math.max(maxShake, player.trauma);
  for (const k of knights) if (k.dead && !k.dormant) k.deadT += dt;
  // What she says: the scripted lines of a stage, and the cues.
  const l = SCRIPT[op.stage]?.find((x) => op.time >= x.at && op.time - dt < x.at);
  if (l && l !== lastLine) { lastLine = l; console.log(`${clock(T)}  ${l.text.replace('{name}', 'Jamie')}`); }
  if (op.cue !== lastCue) { lastCue = op.cue; const c = CUES[CUE_IDS[op.cue - 1]]; if (c) console.log(`${clock(T)}  [${CUE_IDS[op.cue - 1]}] ${c.text.replace('{name}', 'Jamie')}`); }
}
took[names[stage]] = T - stageT;
console.log(`\n${clock(T)}  == ${names[op.stage]}`);
console.log('\nHow long each part took:', Object.entries(took).filter(([k]) => k !== 'walked').map(([k, v]) => `${k} ${v.toFixed(0)} s`).join(', '));
console.log(`Your first cast at ${firstCast === null ? 'never (the spark went on its own)' : clock(firstCast)}; first step of your own at ${clock(firstMove ?? 0)}; the tunnel ${maxShake > 0.3 ? 'shook' : 'never shook'}.`);
console.log(`In all ${clock(T)} from waking to her quest.`);
