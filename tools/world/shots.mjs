// Steps for tools/lands/shoot.mjs: the same places every round, for the critics. Prints the JSON.
//   node tools/world/shots.mjs [round] > steps.json
import { terrainHeight } from '../../src/core/terrain.js';
import { CELL, TREE_FLOATS, treesInCells } from '../../src/core/forest.js';

// Moved sideways till no trunk or bough is in the eye or the first 30 m of the view.
function clear(ex, ez, tx, tz) {
  const l = Math.hypot(tx - ex, tz - ez), dx = (tx - ex) / l, dz = (tz - ez) / l;
  for (const off of [0, 5, -5, 10, -10, 15, -15, 20, -20, 30, -30, 40, -40, 55, -55, 70, -70]) {
    const x = ex - dz * off, z = ez + dx * off;
    const t = treesInCells(Math.floor((x - 45) / CELL), Math.ceil((x + 45) / CELL), Math.floor((z - 45) / CELL), Math.ceil((z + 45) / CELL));
    let ok = true;
    for (let k = 0; k < t.length && ok; k += TREE_FLOATS) {
      const px = t[k] - x, pz = t[k + 1] - z, along = px * dx + pz * dz, across = Math.abs(px * dz - pz * dx);
      if (Math.hypot(px, pz) < 10 || (along > 0 && along < 34 && across < 7.5)) ok = false;
    }
    if (ok) return [x, z, tx - dz * off, tz + dx * off];
  }
  return [ex, ez, tx, tz];
}

const round = process.argv[2] || 'r1';
// [name, eye x, eye z, look x, look z, eye height, look height over ground, hour]
const SPOTS = [
  ['hill_road', 420, 30, 560, 40, 1.65, 1.2, 11],
  ['vigil_road', -560, -80, -800, -120, 1.65, 1.0, 15],
  ['darkwood', -140, 170, -200, 120, 1.65, 1.2, 12],
  ['frost_road', 210, 1650, 380, 2500, 1.65, 6.0, 10],
  ['rimeholt_open', 860, 3600, 600, 3900, 1.8, 0.0, 12],
  ['ashen', -3500, -620, -3750, -680, 1.65, 0.0, 14],
  ['sorrowhorn', -2300, -2180, -2600, -2900, 1.8, 40, 13],
  ['rustwood', 3600, -2380, 3900, -2800, 1.65, 1.0, 16],
  ['fen', -100, -3050, -230, -3300, 1.65, 0.5, 11],
  ['downs', 1600, 120, 1900, 60, 1.65, 1.0, 9],
  ['barrow', -2400, 2900, -2800, 3300, 1.65, 1.0, 13],
  ['gallows', 3300, 2600, 4040, 3150, 1.65, 1.0, 15],
  ['deepwood', -1300, -1100, -1500, -1600, 1.65, 1.0, 12],
  ['town_edge', 6, 100, -20, 190, 1.65, 1.0, 11],
];

function cam(ex, ez, tx, tz, h, th) {
  const ey = terrainHeight(ex, ez) + h, ty = terrainHeight(tx, tz) + th;
  let fx = tx - ex, fy = ty - ey, fz = tz - ez;
  const l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  // up = right x forward, right = forward x worldUp
  let rx = fy * 0 - fz * 1, ry = fz * 0 - fx * 0, rz = fx * 1 - fy * 0;
  const rl = Math.hypot(rx, ry, rz); rx /= rl; ry /= rl; rz /= rl;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const s = Math.sign(uy) || 1;
  return { x: ex, y: ey, z: ez, fx, fy, fz, ux: ux * s, uy: uy * s, uz: uz * s };
}

const only = process.argv[3] ? process.argv[3].split(',') : null;
const steps = [{ eval: 'bm.fixScale(1); bm.renderer.hideVM = true; bm.view.lands.cheats.noDamage = true;' }];
for (let [name, ex, ez, tx, tz, h, th, hour] of SPOTS) {
  if (only && !only.includes(name)) continue;
  [ex, ez, tx, tz] = clear(ex, ez, tx, tz);
  steps.push({ eval: `bm.cmd(19, 0, ${ex}, ${ez}); bm.setTime(${hour}); bm.setCam(${JSON.stringify(cam(ex, ez, tx, tz, h, th))});` });
  steps.push({ wait: 9000 });
  steps.push({ shot: `${round}_${name}` });
}
// Walks: four steps down a stretch, as you'd see it going along. [name, from x, z, to x, z, hour]
const WALKS = [
  ['walk_hill', 330, 22, 590, 44, 11],
  ['walk_fen', -60, -2990, -260, -3330, 11],
  ['walk_deep', -1280, -1060, -1520, -1640, 12],
];
for (const [name, x0, z0, x1, z1, hour] of WALKS) {
  if (only && !only.includes(name)) continue;
  for (let k = 0; k < 4; k++) {
    const f = k / 4, g = f + 0.12;
    let [ex, ez, tx, tz] = clear(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, x0 + (x1 - x0) * g, z0 + (z1 - z0) * g);
    steps.push({ eval: `bm.cmd(19, 0, ${ex}, ${ez}); bm.setTime(${hour}); bm.setCam(${JSON.stringify(cam(ex, ez, tx, tz, 1.65, 0.6))});` });
    steps.push({ wait: k ? 5000 : 9000 });
    steps.push({ shot: `${round}_${name}_${k}` });
  }
}
// The Mire Mound: three under the fen ahead, coming up as you near, and spitting.
if (!only || only.includes('t_mire')) {
  let [ex, ez, tx, tz] = clear(-100, -3050, -230, -3300);
  const l = Math.hypot(tx - ex, tz - ez), fx = (tx - ex) / l, fz = (tz - ez) / l;
  const at = (along, side) => [ex + fx * along - fz * side, ez + fz * along + fx * side];
  steps.push({ eval: `bm.cmd(19, 0, ${ex}, ${ez}); bm.setTime(11); bm.setCam(${JSON.stringify(cam(ex, ez, tx, tz, 1.75, 0.6))});` });
  steps.push({ wait: 6000 });
  for (const [along, side, size] of [[7.5, -2.5, 1], [9.5, 2.5, 1], [11, 0, 2]]) { const [x, z] = at(along, side); steps.push({ eval: `bm.cmd(42, ${80 + size}, ${x}, ${z});` }); steps.push({ wait: 150 }); }
  steps.push({ wait: 300 });
  steps.push({ shot: `${round}_t_mire_under` });
  steps.push({ wait: 1000 });
  steps.push({ shot: `${round}_t_mire_up` });
  steps.push({ wait: 1100 });
  steps.push({ shot: `${round}_t_mire_spit` });
}
// The Crowmother's flock over the Downs: wheeling over you, then three diving, seen looking up.
if (!only || only.includes('t_crows')) {
  const [ex, ez, tx, tz] = clear(1700, -150, 1680, -170);
  steps.push({ eval: `bm.cmd(19, 0, ${ex}, ${ez}); bm.setTime(10); bm.setCam(${JSON.stringify(cam(ex, ez, tx, tz, 1.7, 13))});` });
  steps.push({ wait: 6000 });
  steps.push({ eval: `bm.cmd(42, 98, ${ex}, ${ez});` });
  for (const [w, n] of [[2500, 'circle'], [700, 'a'], [700, 'b'], [700, 'c'], [700, 'd'], [700, 'e'], [700, 'f']]) { steps.push({ wait: w }); steps.push({ shot: `${round}_t_crows_${n}` }); }
  steps.push({ eval: `bm.setCam(${JSON.stringify(cam(ex, ez, tx, tz, 1.7, 4))});` });
  steps.push({ wait: 1500 });
  steps.push({ shot: `${round}_t_crows_low` });
}
// The tumblers: three of a kind lying among the rocks ahead, then woken and rolling at you. [name, kind, x, z, look x, z, hour]
const TUMBLERS = [
  ['t_moss', 0, -1300, -1100, -1500, -1600, 12],
  ['t_chalk', 1, 1600, 120, 1900, 60, 10],
  ['t_rust', 2, 3600, -2380, 3900, -2800, 15],
  ['t_cinder', 3, -3500, -620, -3750, -680, 14],
  ['t_rime', 4, 860, 3600, 600, 3900, 12],
  ['t_barrow', 5, -2400, 2900, -2800, 3300, 13],
  ['t_gallows', 6, 3300, 2600, 4040, 3150, 15],
  ['t_sorrow', 7, -2300, -2180, -2600, -2900, 13],
];
for (let [name, kind, ex, ez, tx, tz, hour] of TUMBLERS) {
  if (only && !only.includes(name)) continue;
  [ex, ez, tx, tz] = clear(ex, ez, tx, tz);
  const l = Math.hypot(tx - ex, tz - ez), fx = (tx - ex) / l, fz = (tz - ez) / l;
  // You stand where the eye is; they lie 13 to 20 m ahead, a little to either side.
  const at = (along, side) => [ex + fx * along - fz * side, ez + fz * along + fx * side];
  const spots = [[14, -4, 1], [18, 3, 2], [22, -1, kind === 7 ? 3 : 0]];
  steps.push({ eval: `bm.cmd(19, 0, ${ex}, ${ez}); bm.setTime(${hour}); bm.setCam(${JSON.stringify(cam(ex, ez, tx, tz, 1.75, 0.6))});` });
  steps.push({ wait: 6000 });
  for (const [along, side, size] of spots) { const [x, z] = at(along, side); steps.push({ eval: `bm.cmd(42, ${kind * 10 + size}, ${x}, ${z});` }); steps.push({ wait: 150 }); }
  steps.push({ wait: 1200 });
  steps.push({ shot: `${round}_${name}_asleep` });
  steps.push({ eval: 'bm.cmd(41);' });
  steps.push({ wait: 1300 });
  steps.push({ shot: `${round}_${name}_waking` });
  steps.push({ wait: 900 });
  steps.push({ shot: `${round}_${name}_rolling` });
}
steps.push({ log: 'return { rocks: bm.renderer.stats.rocks, gpuMs: bm.renderer.stats.gpuMs }' });
console.log(JSON.stringify(steps, null, 1));
