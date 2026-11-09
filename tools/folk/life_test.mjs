// A day in the town without drawing it: everyone's scripts run on a sped-up clock, and what each was doing is counted.
// node tools/folk/life_test.mjs [hours=26] [startHour=5]
// JUMP=1: the clock jumps on four hours now and then, as it does on a load or a night's sleep, and everyone's placed afresh.
import { readFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { FolkClips, FolkRig } from '../../src/folk/rig.js';
import { Ground } from '../../src/folk/ground.js';
import { Town, T_CLEAR, wearsT } from '../../src/folk/town.js';
import { Life, ACT } from '../../src/folk/brain.js';

const R = (p) => readFileSync(new URL(`../../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), spots = J('assets/game/folk/spots.json');
const folk = J('assets/game/folk/folk.json');
const bin = R('assets/game/folk/clips.bin');
const clips = new FolkClips(J('assets/game/folk/clips.json'), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const ground = new Ground(village, interior, [-80, -75, 110, 80]);
const town = new Town(village, interior, spots);
const events = [];
const life = new Life({ ground, town, clips, emit: (e) => events.push(e) });
const rigs = new Map();
for (const me of life.folk) {
  let m = me.p.body;
  if (!folk.models[m]) m = folk.swaps?.[m]?.base || folk.swaps?.[m]?.model || (me.child ? 'boy_1' : 'worker');
  if (!rigs.has(m)) { const b = R(`assets/game/folk/${folk.models[m].glb}`); rigs.set(m, new FolkRig(parseGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)), clips)); }
  life.setRig(me.i, rigs.get(m));
}
const hours = +(process.argv[2] || 26), start = +(process.argv[3] || 5);
let hour = start, day = 0;
const dt = 1 / 20;
const names = Object.fromEntries(Object.entries(ACT).map(([k, v]) => [v, k]));
const t0 = performance.now();
let lastH = Math.floor(hour), elapsed = 0;
const time = new Map();
const blockLog = new Map();
// Two standing in the one spot, near enough one inside the other: seconds per pair, and what they were at.
const stacked = new Map(), tEast = new Map();
let nextJump = 3, stepN = 0;
while (elapsed < hours) {
  const rate = hour >= 6 && hour < 20 ? 180 : 60;
  let dh = dt / rate;
  if (process.env.JUMP && elapsed >= nextJump) { dh += 4; nextJump += 5; }
  hour += dh; elapsed += dh;
  if (hour >= 24) { hour -= 24; day++; }
  life.update(dt, { hour, day, player: [-200, 0, -200], dangers: [] });
  for (const me of life.folk) {
    const k = `${me.id}|${me.key}|${me.cur.kind}`;
    if (!blockLog.has(k)) blockLog.set(k, new Map());
    const m = blockLog.get(k); m.set(me.act, (m.get(me.act) || 0) + dt);
  }
  // The owner's rule: nobody in Tessariel's colours out toward Velscour's church.
  for (const me of life.folk) if (wearsT(me.p) && me.x > T_CLEAR) { const e = tEast.get(me.id) || { s: 0, x: 0 }; e.s += dt; e.x = Math.max(e.x, me.x); tEast.set(me.id, e); }
  if (++stepN % 10 === 0) {
    const still = life.folk.filter((me) => me.posture === 'stand' && me.moving < 0.05 && me.act !== ACT.WALK);
    for (let a = 0; a < still.length; a++) {
      for (let b = a + 1; b < still.length; b++) {
        const p = still[a], q = still[b];
        // (Closer than the hard minimum the town keeps (Life.spread: 0.55 m grown, 0.45 m children), less a little for the easing.)
        const min = (p.child ? 0.225 : 0.275) + (q.child ? 0.225 : 0.275) - 0.06;
        if (p.level !== q.level || Math.abs(p.y - q.y) > 1 || Math.hypot(p.x - q.x, p.z - q.z) > min) continue;
        const k = `${p.id}+${q.id} ${p.cur.kind}/${q.cur.kind} at ${p.x.toFixed(1)},${p.z.toFixed(1)}`.replace(/ at .*/, '');
        const e = stacked.get(k) || { s: 0, at: `${p.x.toFixed(1)}, ${p.z.toFixed(1)}` };
        e.s += dt * 10; stacked.set(k, e);
      }
    }
  }
  if (Math.floor(hour) !== lastH) {
    lastH = Math.floor(hour);
    const c = {};
    for (const me of life.folk) c[names[me.act]] = (c[names[me.act]] || 0) + 1;
    const out = life.folk.filter((me) => me.house < 0).length;
    console.log(`day ${day} ${String(lastH).padStart(2)}:00  outdoors ${String(out).padStart(2)}  ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ')}  stuck ${life.stuck || 0}`);
  }
}
console.log('ran', ((performance.now() - t0) / 1000).toFixed(1), 's; door events', events.filter((e) => e.type === 'door').length);
// Where anyone got stuck: who, where, on which floor, doing what, the point they were making for, and whether they were waiting on someone.
for (const s of life.stuckLog || []) console.log('  stuck', s.join(' '));
const long = [...stacked].filter(([, e]) => e.s > 6).sort((a, b) => b[1].s - a[1].s);
console.log(long.length ? `standing in each other: ${long.length} pairs` : 'nobody standing in anybody');
console.log(tEast.size ? `T colours east of x ${T_CLEAR}: ${[...tEast].map(([id, e]) => `${id} ${Math.round(e.s)}s to x ${e.x.toFixed(0)}`).join(', ')}` : `T colours east of x ${T_CLEAR}: nobody`);
for (const [k, e] of long.slice(0, 20)) console.log(`  ${k}  ${Math.round(e.s)}s  at ${e.at}`);
// Blocks spent mostly walking: they never got there.
const bad = [];
for (const [k, m] of blockLog) {
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  const walk = (m.get(ACT.WALK) || 0) / total;
  if (total > 30 && walk > 0.6 && !k.includes('stroll') && !k.includes('patrol') && !k.includes('tithe')) bad.push(`${k} ${Math.round(total)}s walk ${(walk * 100) | 0}%`);
}
console.log('blocks mostly walking:', bad.length);
for (const b of bad.slice(0, 40)) console.log('  ', b);
// Where is everyone now?
for (const me of life.folk) if (me.act === ACT.WALK) console.log('  walking', me.id, me.cur.kind, me.x.toFixed(1), me.z.toFixed(1), me.level);
