// City State Phobos's trails: the ways auto-play keeps to in the east (src/sim/east-nav.js prices a step off them
// OFF_TRAIL of one on them). Its named streets (src/core/phobos-data.js), the Throne Road in from the land's roads to the
// Drawbridge Gate, and the paths laid from those to every place it goes: a delve's grate or portal, a hub, a fort, a gate, a
// district's middle, a tower's door, someone it has a word with (tools/paths/trails.mjs, into src/core/phobos-trails-data.js,
// walked on the east's own walking map so none runs through a wall or a yard full of crates). The owner, 2026-11-21: "Phobos
// needs defined paths or trails connected to the main road to help the AI auto play get back on track".
// Each a line of [x, z, y] (y: the height it's walked at).
import { PHOBOS } from './phobos-data.js';
import { terrainHeight } from './terrain.js';
import { allWays } from './roads.js';
import { TRAILS } from './phobos-trails-data.js';

const EAST = (x, z) => x > 9000 && x < 11720 && z > -860 && z < 860;
let LINES = null;
// (A line along the ground, a point every 4 m, each at the land's height there.)
const onGround = (pts) => {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
    for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; out.push([x, z, terrainHeight(x, z)]); }
  }
  const [x, z] = pts.at(-1);
  out.push([x, z, terrainHeight(x, z)]);
  return out;
};
// The streets and the road in: what the paths are laid from.
export function trailRoots() {
  const out = PHOBOS.streets.map((st) => onGround(st.pts));
  // (The land's roads where they run into the east: the Throne Road from the Sill down to the gate.)
  for (const w of allWays()) {
    if (PHOBOS.streets.some((st) => st.name === w.name)) continue;
    let run = [];
    for (const p of w.pts) { if (EAST(p[0], p[1])) run.push([p[0], p[1]]); else { if (run.length > 1) out.push(onGround(run)); run = []; } }
    if (run.length > 1) out.push(onGround(run));
  }
  return out;
}
export function trailLines() {
  if (LINES) return LINES;
  LINES = trailRoots();
  for (const t of TRAILS) LINES.push(t.pts);
  return LINES;
}
