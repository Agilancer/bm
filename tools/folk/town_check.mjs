// Whether the townsfolk's places are on ground they can walk to: every outdoor place, each house's door and inside, each bed,
// seat and hearth. Run from the repo: node tools/folk/town_check.mjs
import { readFileSync } from 'node:fs';
import { Ground } from '../../src/folk/ground.js';
import { Town, PLACES, ROUND } from '../../src/folk/town.js';
import { FolkClips } from '../../src/folk/rig.js';
import { Life } from '../../src/folk/brain.js';

const J = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url)));
const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), spots = J('assets/game/folk/spots.json');
const t0 = performance.now();
const ground = new Ground(village, interior, [-80, -75, 110, 80]);
console.log('ground', Math.round(performance.now() - t0), 'ms');
const town = new Town(village, interior, spots);
let bad = 0;
const T = ground.part(0, -1.5, 4);
// Somewhere a walk can end: a free cell of the town's ground (or a house's upstairs) within 1.3 m.
const near = (level, x, z) => {
  const part = level ? ground.part(1, x, z) || null : T;
  const p = part ? ground.reach(level, part, x, z, ground.heightFor(x, z, level ? 9 : 0.5), 1.6) : ground.nearestFree(level, x, z, 1.3);
  return p ? Math.hypot(p[0] - x, p[1] - z) : null;
};
for (const p of PLACES) {
  const d = near(0, ...p.at);
  if (d === null) { bad++; console.log('PLACE', p.id, p.at); }
  if (p.front && near(0, ...p.front) === null) { bad++; console.log('FRONT', p.id, p.front); }
}
for (const [x, z] of ROUND) if (near(0, x, z) === null) { bad++; console.log('ROUND', x, z); }
for (const h of town.houses) {
  const out = near(0, ...h.outside), inn = near(0, ...h.inside);
  const line = [h.i, h.key, 'door', h.doorId, 'out', out?.toFixed(2), 'in', inn?.toFixed(2), 'beds', h.beds.length, 'seats', h.seats.length, 'atTable', h.seats.filter((s) => s.table >= 0).length, 'hearth', !!h.hearth, 'route', h.route.length, 'stair', h.stair];
  console.log(line.join(' '));
  if (out === null || inn === null || h.doorId === null) bad++;
  for (const b of h.beds) {
    // You lie down from sitting on its edge: either side, at its middle.
    const yaw = Math.atan2(b.dir[0], b.dir[1]), c = Math.cos(yaw), s = Math.sin(yaw);
    const ok = [-1, 1].filter((k) => near(b.level, b.x + c * (b.width / 2 + 0.1) * k, b.z - s * (b.width / 2 + 0.1) * k) !== null);
    if (!ok.length) { bad++; console.log('  BED no side', h.key, b.x, b.z, b.level); }
  }
  for (const st of h.seats) {
    const d = near(st.level, st.x + Math.sin(st.yaw) * 0.26, st.z + Math.cos(st.yaw) * 0.26);
    if (d === null) { bad++; console.log('  SEAT no way', h.key, st.x.toFixed(2), st.z.toFixed(2), st.level); }
  }
  if (h.hearth && near(0, h.hearth.x, h.hearth.z) === null) { bad++; console.log('  HEARTH blocked', h.key); }
  if (h.oven && near(0, h.oven.x, h.oven.z) === null) { bad++; console.log('  OVEN blocked', h.key); }
  if (h.stair >= 0) {
    const foot = h.route[h.stair], head = h.route[h.stair + 1];
    if (near(0, ...foot) === null || near(1, ...head) === null) { bad++; console.log('  STAIR', h.key, foot, head); }
  }
}
console.log(bad ? `${bad} problems` : 'all reachable');

// And a bed for everyone, in their own house: nobody lodged in someone else's, nobody on a pallet on the floor. (Two who share
// a bed are a couple, or children; one who sleeps by day shares with one who sleeps by night.)
const bin = readFileSync(new URL('../../assets/game/folk/clips.bin', import.meta.url));
const clips = new FolkClips(J('assets/game/folk/clips.json'), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const life = new Life({ ground, town, clips, emit: () => {} });
let homeless = 0;
const sleepers = new Map();
for (const me of life.folk) {
  if (me.home !== town.byKey[me.p.home]) { homeless++; console.log('  LODGED', me.id, me.p.home, 'in', me.home.key); }
  if (!me.bed || me.bed.pallet) { homeless++; console.log('  NO BED', me.id, me.p.home, me.bed?.pallet ? 'a pallet on the floor' : ''); continue; }
  const k = sleepers.get(me.bed.bed) || [];
  k.push(me.id); sleepers.set(me.bed.bed, k);
}
for (const [b, who] of sleepers) if (who.length > 2) { homeless++; console.log('  CROWDED', who.join(', ')); }
console.log(homeless ? `${homeless} without a bed of their own` : `everyone has a bed: ${life.folk.length} people, ${sleepers.size} beds slept in`);
if (bad || homeless) process.exitCode = 1;
