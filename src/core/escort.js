// The way down from Lisandra's ledge to Bellmourn: along the shelf, down the steps and the path onto the Long Road, and along it to the town's edge. Shared
// by the sim (she leads you down it: src/sim/opening.js) and the screen (the trail on the ground: src/ui/trail.js).
import { CAVE_MOUTH, CAVE_OUT, ESCORT_TO } from './opening.js';
import { CAVE_PATH, ROADS } from './terrain.js';
import { clamp } from './math.js';

const out = (d) => [CAVE_MOUTH[0] + CAVE_OUT[0] * d, CAVE_MOUTH[1] + CAVE_OUT[1] * d];
export const VIEW_SPOT = out(5.6);  // where you stand on the ledge when the cave comes down
export const DIVE_TO = out(3.0);    // where she comes down out of the dust: 2.6 m from you
export const STORM_TO = out(3.7);   // where she has it out with you: 1.9 m off, and where the walk down starts

const CORNER_COS = Math.cos(50 * Math.PI / 180), CORNER_CUT = 0.75;
// Marks every ~4 m, with their distance along.
export const ROUTE = (() => {
  const road = ROADS[0].line;
  const end = CAVE_PATH.pts.at(-1);
  let k = 0, best = 1e9;
  road.forEach((p, i) => { const d = Math.hypot(p[0] - end[0], p[1] - end[1]); if (d < best) { best = d; k = i; } });
  // (From where she has it out with you, along the shelf, down the steps and the path: src/core/opening.js WAY.)
  const pts = [STORM_TO, ...CAVE_PATH.pts.slice(2)];
  for (let i = k - 1; i >= 0; i--) pts.push([road[i][0], road[i][1]]);
  pts.push(ESCORT_TO);
  // A sharp turn (the head of the steps, and where each flight doubles back) is walked round, not pivoted on: the corner
  // is cut by a short curve that keeps to the landing, and those who follow the way slow for it (corners: where they are).
  const round = [pts[0]], turns = [];
  for (let i = 1; i < pts.length; i++) {
    const v = pts[i], a = round.at(-1), b = pts[i + 1];
    if (!b) { round.push(v); break; }
    const la = Math.hypot(v[0] - a[0], v[1] - a[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const ia = [(v[0] - a[0]) / la, (v[1] - a[1]) / la], ob = [(b[0] - v[0]) / lb, (b[1] - v[1]) / lb];
    if (la < 0.05 || lb < 0.05 || ia[0] * ob[0] + ia[1] * ob[1] > CORNER_COS) { round.push(v); continue; }
    const T = Math.min(CORNER_CUT, la / 3, lb / 3), p0 = [v[0] - ia[0] * T, v[1] - ia[1] * T], p1 = [v[0] + ob[0] * T, v[1] + ob[1] * T];
    for (let j = 0; j <= 6; j++) {
      const t = j / 6, u = 1 - t;
      round.push([u * u * p0[0] + 2 * u * t * v[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * v[1] + t * t * p1[1]]);
      if (j === 3) turns.push(round.at(-1));
    }
  }
  const line = [round[0]], s = [0], corners = [];
  for (let i = 1; i < round.length; i++) {
    const a = line.at(-1), b = round[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 0.02) continue;
    const n = Math.max(1, Math.round(d / 4));
    for (let j = 1; j <= n; j++) { line.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); s.push(s.at(-1) + d / n); }
    if (turns.includes(b)) corners.push(s.at(-1));
  }
  return { pts: line, s, len: s.at(-1), corners };
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

// How far d is from the nearest sharp turn of the way (the steps' landings), and how far on the next one is (Infinity: none).
export function cornerNear(d) {
  let best = Infinity;
  for (const c of ROUTE.corners) best = Math.min(best, Math.abs(c - d));
  return best;
}
export function cornerAhead(d) {
  for (const c of ROUTE.corners) if (c >= d) return c - d;
  return Infinity;
}
