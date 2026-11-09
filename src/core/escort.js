// The way down from Lisandra's ledge to Bellmourn: off the ledge onto the Long Road, and along it to the town's edge. Shared
// by the sim (she leads you down it: src/sim/opening.js) and the screen (the trail on the ground: src/ui/trail.js).
import { CAVE_MOUTH, CAVE_OUT, ESCORT_TO } from './opening.js';
import { CAVE_PATH, ROADS } from './terrain.js';
import { clamp } from './math.js';

const out = (d) => [CAVE_MOUTH[0] + CAVE_OUT[0] * d, CAVE_MOUTH[1] + CAVE_OUT[1] * d];
export const VIEW_SPOT = out(5.6);  // where you stand on the ledge when the cave comes down
export const DIVE_TO = out(3.0);    // where she comes down out of the dust: 2.6 m from you
export const STORM_TO = out(3.7);   // where she has it out with you: 1.9 m off, and where the walk down starts

// Marks every ~4 m, with their distance along.
export const ROUTE = (() => {
  const road = ROADS[0].line;
  const end = CAVE_PATH.pts.at(-1);
  let k = 0, best = 1e9;
  road.forEach((p, i) => { const d = Math.hypot(p[0] - end[0], p[1] - end[1]); if (d < best) { best = d; k = i; } });
  const pts = [STORM_TO, ...CAVE_PATH.pts.slice(1)];
  for (let i = k - 1; i >= 0; i--) pts.push([road[i][0], road[i][1]]);
  pts.push(ESCORT_TO);
  const line = [pts[0]], s = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = line.at(-1), b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 0.05) continue;
    const n = Math.max(1, Math.round(d / 4));
    for (let j = 1; j <= n; j++) { line.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); s.push(s.at(-1) + d / n); }
  }
  return { pts: line, s, len: s.at(-1) };
})();
export const ESCORT_LEN = ROUTE.len;

// The point d metres along.
export function routeAt(d) {
  const { pts, s } = ROUTE;
  let i = 0;
  while (i + 2 < s.length && s[i + 1] < d) i++;
  const t = clamp((d - s[i]) / (s[i + 1] - s[i]), 0, 1);
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
}

// How far along is nearest (x, z): looked for within `within` of `around`, if given. On the segments, not just the marks.
export function routeNear(x, z, around = null, within = 90) {
  const { pts, s } = ROUTE;
  let best = 1e18, at = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    if (around !== null && (s[i + 1] < around - within || s[i] > around + within)) continue;
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1);
    const ex = a[0] + dx * t - x, ez = a[1] + dz * t - z, d2 = ex * ex + ez * ez;
    if (d2 < best) { best = d2; at = s[i] + (s[i + 1] - s[i]) * t; }
  }
  return at;
}

// Which way the road runs d metres along (a unit vector, x and z).
export function routeDir(d) {
  const a = routeAt(d - 1.5), b = routeAt(d + 1.5), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}
