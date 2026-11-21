// The land's one buffer, drawn a piece at a time: what's in view, or in a shadow's square, and nothing else.
//
// Everything built out in the countries (src/core/sites.js) and Bellmourn itself is one vertex buffer and one index
// buffer (renderer.js buildStatics), a million and a third indices, and it was drawn whole: in the eye's pass, in the
// near shadow every frame and the far one every other, though a phone's near shadow is twenty metres across. Here its
// triangles are put in order by the square of ground each stands on (256 m), in the opaque run and the cutouts' run
// apart, and each square keeps where it is in the buffer and a sphere round all of it (every corner, not only the
// middle: a long wall's ends are in it). A pass then draws the squares it can see, the neighbours run together into one
// draw. (The performance critic, 2026-11-20.)
//
// The vertex buffer isn't touched: foldLand's places in it hold.

import { inCascade } from './shadowcull.js';

export const LAND_CELL = 128;

// idx[from, to) put in order of square, in place. Returns the squares: first index, how many, and a sphere [x, y, z, r].
export function bucketLand(f, idx, from, to, size = LAND_CELL) {
  const nt = ((to - from) / 3) | 0;
  if (!nt) return { n: 0, first: new Uint32Array(0), count: new Uint32Array(0), sph: new Float32Array(0) };
  const cx = new Float32Array(nt), cz = new Float32Array(nt);
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let t = 0; t < nt; t++) {
    const a = idx[from + t * 3] * 9, b = idx[from + t * 3 + 1] * 9, c = idx[from + t * 3 + 2] * 9;
    const x = (f[a] + f[b] + f[c]) / 3, z = (f[a + 2] + f[b + 2] + f[c + 2]) / 3;
    cx[t] = x; cz[t] = z;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  if (!(x1 >= x0)) { x0 = x1 = 0; } if (!(z1 >= z0)) { z0 = z1 = 0; }
  const nx = (((x1 - x0) / size) | 0) + 1, nz = (((z1 - z0) / size) | 0) + 1;
  const key = new Uint32Array(nt), counts = new Uint32Array(nx * nz);
  for (let t = 0; t < nt; t++) {
    // (A corner that isn't a number puts its triangle in the first square: (NaN | 0) is 0.)
    const i = Math.min(nx - 1, ((cx[t] - x0) / size) | 0), j = Math.min(nz - 1, ((cz[t] - z0) / size) | 0);
    const k = i + nx * j;
    key[t] = k; counts[k]++;
  }
  const start = new Uint32Array(nx * nz);
  let n = 0;
  for (let k = 0, s = 0; k < counts.length; k++) { start[k] = s; s += counts[k]; if (counts[k]) n++; }
  const at = start.slice(), out = new Uint32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const p = at[key[t]]++ * 3, q = from + t * 3;
    out[p] = idx[q]; out[p + 1] = idx[q + 1]; out[p + 2] = idx[q + 2];
  }
  idx.set(out, from);
  const first = new Uint32Array(n), count = new Uint32Array(n), sph = new Float32Array(n * 4);
  let e = 0;
  for (let k = 0; k < counts.length; k++) {
    if (!counts[k]) continue;
    const t0 = start[k], t1 = t0 + counts[k];
    let ax = Infinity, ay = Infinity, az = Infinity, bx = -Infinity, by = -Infinity, bz = -Infinity;
    for (let p = t0 * 3; p < t1 * 3; p++) {
      const v = out[p] * 9, x = f[v], y = f[v + 1], z = f[v + 2];
      if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; if (z < az) az = z; if (z > bz) bz = z;
    }
    first[e] = from + t0 * 3; count[e] = counts[k] * 3;
    if (bx >= ax && by >= ay && bz >= az) {
      sph[e * 4] = (ax + bx) / 2; sph[e * 4 + 1] = (ay + by) / 2; sph[e * 4 + 2] = (az + bz) / 2;
      sph[e * 4 + 3] = Math.hypot(bx - ax, by - ay, bz - az) / 2 + 1;
    } else sph[e * 4 + 3] = 1e9;   // (nothing but corners that aren't numbers: always drawn, as before)
    e++;
  }
  return { n, first, count, sph };
}

// The squares that reach into the eye's view (pl: its five planes, facing in), neighbours drawn together. Returns how
// many indices were drawn.
export function drawLandInView(pass, L, pl) {
  let a = -1, end = 0, drawn = 0;
  const S = L.sph;
  for (let i = 0; i < L.n; i++) {
    const x = S[i * 4], y = S[i * 4 + 1], z = S[i * 4 + 2], r = S[i * 4 + 3];
    let seen = true;
    for (let k = 0; k < 20; k += 4) if (pl[k] * x + pl[k + 1] * y + pl[k + 2] * z + pl[k + 3] < -r) { seen = false; break; }
    if (seen) { if (a < 0) a = L.first[i]; end = L.first[i] + L.count[i]; }
    else if (a >= 0) { pass.drawIndexed(end - a, 1, a); drawn += end - a; a = -1; }
  }
  if (a >= 0) { pass.drawIndexed(end - a, 1, a); drawn += end - a; }
  return drawn;
}

// The squares that reach a shadow cascade's square (m, o: its view-projection, as shadowcull.js inCascade takes it).
export function drawLandInCascade(pass, L, m, o) {
  let a = -1, end = 0, drawn = 0;
  const S = L.sph;
  for (let i = 0; i < L.n; i++) {
    if (inCascade(m, o, S[i * 4], S[i * 4 + 1], S[i * 4 + 2], S[i * 4 + 3])) { if (a < 0) a = L.first[i]; end = L.first[i] + L.count[i]; }
    else if (a >= 0) { pass.drawIndexed(end - a, 1, a); drawn += end - a; a = -1; }
  }
  if (a >= 0) { pass.drawIndexed(end - a, 1, a); drawn += end - a; }
  return drawn;
}
