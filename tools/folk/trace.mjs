// Follow a few people through a stretch of the day: what they're doing every few seconds.
// node tools/folk/trace.mjs <ids,comma> [startHour] [hours] [every seconds]
import { readFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { FolkClips, FolkRig } from '../../src/folk/rig.js';
import { Ground } from '../../src/folk/ground.js';
import { Town } from '../../src/folk/town.js';
import { Life, ACT } from '../../src/folk/brain.js';

const R = (p) => readFileSync(new URL(`../../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), spots = J('assets/game/folk/spots.json');
const folk = J('assets/game/folk/folk.json');
const bin = R('assets/game/folk/clips.bin');
const clips = new FolkClips(J('assets/game/folk/clips.json'), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
export const ground = new Ground(village, interior, [-80, -75, 110, 80]);
const town = new Town(village, interior, spots);
export const life = new Life({ ground, town, clips });
const rigs = new Map();
for (const me of life.folk) {
  let m = me.p.body;
  if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
  if (!rigs.has(m)) { const b = R(`assets/game/folk/${folk.models[m].glb}`); rigs.set(m, new FolkRig(parseGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)), clips)); }
  life.setRig(me.i, rigs.get(m));
}
const ids = (process.argv[2] || 'tilly').split(','), start = +(process.argv[3] || 5), hours = +(process.argv[4] || 1), every = +(process.argv[5] || 5);
const names = Object.fromEntries(Object.entries(ACT).map(([k, v]) => [v, k]));
let hour = start, day = 0, el = 0, t = 0, next = 0;
const dt = 1 / 20;
while (el < hours) {
  const rate = hour >= 6 && hour < 20 ? 180 : 60, dh = dt / rate;
  hour += dh; el += dh; t += dt;
  if (hour >= 24) { hour -= 24; day++; }
  life.update(dt, { hour, day, player: [-200, 0, -200], dangers: [] });
  if (process.env.TIMES && Math.floor(hour) !== globalThis.lh) { globalThis.lh = Math.floor(hour); console.log("hour", globalThis.lh, (performance.now() / 1000).toFixed(1), "s, stuck", life.stuck || 0); }
  if (t >= next) {
    next += every;
    const hh = `${Math.floor(hour)}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
    for (const id of ids) {
      const me = life.byId[id];
      console.log(hh, id.padEnd(9), me.cur.kind.padEnd(7), names[me.act].padEnd(6), me.posture.padEnd(6), me.pose.clip?.name.padEnd(10), `(${me.x.toFixed(2)}, ${me.y.toFixed(2)}, ${me.z.toFixed(2)}) L${me.level} h${me.house} hold${me.hold}`);
    }
  }
}
if (process.env.STUCK) {
  const by = {};
  for (const s of life.stuckLog || []) (by[s[0]] ||= []).push(s.slice(1));
  for (const [id, l] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) console.log(id, l.length, JSON.stringify(l.slice(0, 4)));
}
