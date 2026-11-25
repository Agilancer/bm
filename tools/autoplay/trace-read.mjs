// What tools/autoplay/trace.mjs's samples say about how it walked: [t, x, y, z, job, said, ...] every quarter second.
//   node tools/autoplay/trace-read.mjs <samples.json>
import { readFileSync } from 'node:fs';
import { PHOBOS } from '../../src/core/phobos-data.js';
import { cityIn } from '../../src/core/east.js';
import { routeDist } from '../../src/core/lands.js';
import { townDist } from '../../src/core/town.js';

const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z); };
// How far inside the nearest street it is: less than nothing on one.
const offStreet = (x, z) => { let best = 1e9; for (const st of PHOBOS.streets) for (let i = 0; i + 1 < st.pts.length; i++) best = Math.min(best, segD(x, z, st.pts[i], st.pts[i + 1]) - st.w - 0.5); return best; };

export function analyse(S) {
  if (S.length < 8) { console.log('too few samples'); return; }
  let turns = [], pressed = 0, pressedAt = [], walked = 0, onSt = 0, offSt = 0, offAt = new Map(), onRd = 0, offRd = 0, offRdAt = new Map();
  const head = [];
  // (A fight is all turning about, and isn't counted: only going somewhere.)
  const FIGHT = /foe|Fight|Backing|shield|risen|champion|the dead|Taking|line to|tank|Riding|Running|Dodging|Mend|Learning|Picking|Opening|knight|wolf|spider|crab/i;
  for (let i = 4; i < S.length; i++) {
    const a = S[i - 4], c = S[i], d = Math.hypot(c[1] - a[1], c[3] - a[3]), dt = c[0] - a[0];
    head.push(d / dt > 0.8 && !FIGHT.test(c[5]) && !FIGHT.test(a[5]) ? Math.atan2(c[1] - a[1], c[3] - a[3]) : null);
    const step = Math.hypot(c[1] - S[i - 1][1], c[3] - S[i - 1][3]), sdt = c[0] - S[i - 1][0];
    if (sdt > 0 && step / sdt < 6) walked += step;
    // (Wanting to go and hardly going: its own word for what it's at is about walking somewhere, and a second's progress is under 0.3 m.)
    if (c[4] && dt > 0 && d < 0.3 * dt && /^(go|talk|hire|quest|offer|warrens|loot|hunt|sell)/.test(c[4]) && !/Talking|Waiting|waiting|Hiring|Selling|Buying|Fighting|fight|Resting|Sleeping|Opening/.test(c[5])) { pressed += S[i][0] - S[i - 1][0]; pressedAt.push([c[1], c[3], c[4], c[5]]); }
    // (Out in the land, walking somewhere, not fighting: on a road or path (inside its width and a couple of metres), or not.)
    if (step > 0.05 && step / sdt < 9 && cityIn(c[1], c[3]) > 1.05 && townDist(c[1], c[3]) > 30 && c[2] > -20 && /^(go|talk|warrens)/.test(c[4]) && !/^go:(via|seal)/.test(c[4]) && !FIGHT.test(c[5])) {
      const rd = routeDist(c[1], c[3]);
      if (rd.road && rd.d < rd.road.w + 2) onRd += step; else { offRd += step; const k = `${Math.round(c[1] / 25) * 25},${Math.round(c[3] / 25) * 25} ${c[4]}`; offRdAt.set(k, (offRdAt.get(k) || 0) + step); }
    }
    if (cityIn(c[1], c[3]) < 1 && c[2] < 200 && step > 0.05) { const o = offStreet(c[1], c[3]); if (o <= 0) onSt += step; else { offSt += step; const k = `${Math.round(c[1] / 20) * 20},${Math.round(c[3] / 20) * 20}`; offAt.set(k, (offAt.get(k) || 0) + step); } }
  }
  // To and fro: a turn about, and back again inside four seconds.
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  for (let i = 0; i < head.length; i++) {
    if (head[i] === null) continue;
    for (let j = i + 2; j < Math.min(head.length, i + 8); j++) {
      if (head[j] === null || Math.abs(wrap(head[j] - head[i])) < 2.36) continue;
      for (let k = j + 2; k < Math.min(head.length, j + 16); k++) if (head[k] !== null && Math.abs(wrap(head[k] - head[i])) < 0.8) { const s = S[j + 4]; turns.push([s[0], s[1], s[3], s[4], s[5]]); i = k; break; }
      break;
    }
  }
  const T = S[S.length - 1][0] - S[0][0];
  console.log(`\n${(T / 60).toFixed(1)} min traced, ${Math.round(walked)} m walked`);
  console.log(`to and fro: ${turns.length} (${(turns.length / (T / 60)).toFixed(2)} a minute)`);
  for (const t of turns.slice(0, 25)) console.log(`  ${t[0].toFixed(0)} s at ${t[1] | 0}, ${t[2] | 0}: ${t[3]} :: ${t[4]}`);
  console.log(`pressed, going nowhere: ${pressed.toFixed(0)} s`);
  const byPlace = new Map(); for (const [x, z, j, s] of pressedAt) { const k = `${Math.round(x / 5) * 5},${Math.round(z / 5) * 5} ${j} :: ${s}`; byPlace.set(k, (byPlace.get(k) || 0) + 0.25); }
  for (const [k, v] of [...byPlace].sort((p, q) => q[1] - p[1]).slice(0, 12)) console.log(`  ${v.toFixed(0)} s  ${k}`);
  if (onRd + offRd > 50) console.log(`out in the land: ${Math.round(onRd)} m on roads and paths, ${Math.round(offRd)} m off them (${(100 * onRd / (onRd + offRd)).toFixed(0)}% on)`);
  if (onRd + offRd > 50) for (const [k, v] of [...offRdAt].sort((p, q) => q[1] - p[1]).slice(0, 10)) console.log(`  ${Math.round(v)} m off them about ${k}`);
  if (onSt + offSt > 20) {
    console.log(`in Phobos: ${Math.round(onSt)} m on its streets, ${Math.round(offSt)} m off them (${(100 * onSt / (onSt + offSt)).toFixed(0)}% on)`);
    for (const [k, v] of [...offAt].sort((p, q) => q[1] - p[1]).slice(0, 10)) console.log(`  ${Math.round(v)} m off the streets about ${k}`);
  }
}
if (process.argv[1]?.endsWith('trace-read.mjs')) analyse(JSON.parse(readFileSync(process.argv[2], 'utf8')));
