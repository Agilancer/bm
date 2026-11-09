// Stones and boulders (where they lie: src/core/rocks.js). Sixteen rocks, each made at three levels of detail from one shape: a
// lumpy ball cut by a handful of planes, as stone breaks, so each has flat fractured faces and edges. Every rock in the land is
// one of the sixteen, turned, stretched and sunk into the ground. And with them, drawn the same way, what else lies about: fallen
// logs and stumps, reeds, ferns and tufts of grass that sway, and puddles. They're painted with the ground's own stone (the Tripo layers,
// tools/world/build_ground.py), the country's kind of stone, with moss on top in the woods and snow on top where it lies.
import { makeBuffer } from './gpu.js';
import { COMMON } from './shaders.js';
import { ROCK_FLOATS, STONE_REACH, BOULDER_REACH, ROCK_VARIANTS, ALL_VARIANTS, LOG, STUMP, REED, FERN, TUFT, PUDDLE } from '../core/rocks.js';
import { MAX_TUMBLERS, TUMBLER_FLOATS, TUMBLERS_START } from '../core/layout.js';

const VARIANTS = ALL_VARIANTS, LODS = 3, FLOATS = 8, CHUNK = 24;
const NEAR = 36, MID = 150;          // Metres to a chunk's middle: the finest mesh, then the middle one, then the coarsest.
// Laid again round you once you've gone this far from where they were last laid.
const RELAY_STONES = 40, RELAY_BOULDERS = 160;

function rng(seed) { let s = seed; return () => { s = Math.imul(s ^ (s >>> 15), 2246822519) + 1 | 0; return ((s ^ (s >>> 13)) >>> 0) / 4294967296; }; }

function icosphere(sub) {
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map((p) => { const l = Math.hypot(...p); return p.map((c) => c / l); });
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < sub; s++) {
    const mid = new Map(), nf = [];
    const m = (a, b) => {
      const k = a < b ? a * 65536 + b : b * 65536 + a;
      if (mid.has(k)) return mid.get(k);
      const p = v[a].map((c, i) => (c + v[b][i]) / 2), l = Math.hypot(...p);
      v.push(p.map((c) => c / l));
      mid.set(k, v.length - 1);
      return v.length - 1;
    };
    for (const [a, b, c] of f) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    f = nf;
  }
  return { v, f };
}

// The shape of rock number k, as a function of the direction out from its middle: the same at every level of detail. Returns the
// point, and the face it broke along when it lies on one (so a fractured face is lit flat, and its edges show).
function shapeOf(k) {
  const R = rng(1009 + k * 7919);
  const kind = k < 8 ? 'round' : k < 12 ? 'slab' : 'crag';
  const scale = kind === 'round' ? [1, 0.62 + 0.33 * R(), 1.0] : kind === 'slab' ? [1.3, 0.5, 1.05] : [0.85, 1.25, 0.72];
  scale[0] *= 0.88 + 0.24 * R(); scale[2] *= 0.88 + 0.24 * R();
  // A crag leans, as it split off the bedrock.
  const lean = kind === 'crag' ? [(R() - 0.5) * 0.5, (R() - 0.5) * 0.35] : [(R() - 0.5) * 0.12, (R() - 0.5) * 0.12];
  const bumps = Array.from({ length: 7 }, (_, i) => {
    const a = R() * 6.28, b = Math.acos(2 * R() - 1), f = i < 4 ? 1.6 + R() * 2.2 : 5 + R() * 4;
    return [Math.sin(b) * Math.cos(a) * f, Math.cos(b) * f, Math.sin(b) * Math.sin(a) * f, R() * 6.28, i < 4 ? 0.04 + 0.06 * R() : 0.012 + 0.012 * R()];
  });
  // The planes it broke along. A crag's mostly up its sides, with a slanting top; a slab's top and bottom are nearly flat.
  const cuts = [];
  const n = kind === 'crag' ? 10 : kind === 'slab' ? 8 : 9 + Math.floor(R() * 4);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.28;
    let y = kind === 'crag' ? (R() - 0.45) * 0.7 : (R() * 2 - 1) * 0.8;
    if (kind === 'crag' && i === 0) y = 0.75 + 0.2 * R();
    if (kind === 'slab' && i < 2) y = i === 0 ? 0.93 + 0.06 * R() : -0.95;
    const h = Math.sqrt(Math.max(0, 1 - y * y));
    cuts.push([Math.cos(a) * h, y, Math.sin(a) * h, 0.5 + 0.32 * R()]);
  }
  return (d) => {
    let r = 1;
    for (const [fx, fy, fz, ph, amp] of bumps) r += amp * Math.sin(d[0] * fx + d[1] * fy + d[2] * fz + ph);
    let p = [d[0] * r, d[1] * r, d[2] * r];
    let face = null;
    for (const [nx, ny, nz, off] of cuts) {
      const o = p[0] * nx + p[1] * ny + p[2] * nz - off;
      if (o > 0) { p = [p[0] - nx * o, p[1] - ny * o, p[2] - nz * o]; face = [nx, ny, nz]; }
    }
    // (A flat foot, buried anyway, so the underside isn't drawn for nothing.)
    if (p[1] < -0.45) { p[1] = -0.45; face = [0, -1, 0]; }
    // A few fine dents on the faces, so they aren't glass-flat.
    const fine = 1 + 0.015 * Math.sin(p[0] * 11 + p[2] * 7) * Math.sin(p[1] * 13 - p[0] * 5);
    p = [p[0] * scale[0] * fine, p[1] * scale[1] * fine, p[2] * scale[2] * fine];
    // Stood on its foot: the bottom at about -0.25 of its height, so the instance's y is the ground; and leaning.
    p[1] += 0.45 * scale[1] - 0.25 * scale[1];
    const up = Math.max(0, p[1]);
    p[0] += lean[0] * up; p[2] += lean[1] * up;
    let fn = null;
    if (face) {
      // (A plane's normal through the stretch: divide by the scale; then the lean's shear.)
      let nx = face[0] / scale[0], ny = face[1] / scale[1], nz = face[2] / scale[2];
      ny -= lean[0] * nx + lean[1] * nz;
      const l = Math.hypot(nx, ny, nz);
      fn = [nx / l, ny / l, nz / l];
    }
    return { p, fn };
  };
}

// What else lies on the ground (src/core/rocks.js LOG..PUDDLE), made at three levels of detail: their points, normals, triangles.
function debrisMesh(v, lod) {
  const P = [], N = [], F = [];
  const R = rng(4111 + v * 613);
  const vert = (p, n) => { const l = Math.hypot(...n) || 1; P.push(p); N.push([n[0] / l, n[1] / l, n[2] / l]); return P.length - 1; };
  // A blade: from its foot along a bent line up to its tip, narrowing; segs pieces.
  const blade = (bx, bz, h, w, dir, bend, segs, side) => {
    const dx = Math.cos(dir), dz = Math.sin(dir), sx = -dz * w, sz = dx * w;
    const nrm = [dx * 0.6 + side[0], 0.5, dz * 0.6 + side[1]];
    let prev = null;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, out = bend * t * t, y = h * t * (1 - 0.25 * bend * t), ww = 1 - t * 0.92;
      const cx = bx + dx * out, cz = bz + dz * out;
      const a = vert([cx - sx * ww, y, cz - sz * ww], nrm), b = vert([cx + sx * ww, y, cz + sz * ww], nrm);
      if (prev) F.push([prev[0], prev[1], b], [prev[0], b, a]);
      prev = [a, b];
    }
  };
  if (v === LOG[0] || v === LOG[1]) {
    const k = v - LOG[0], segs = [10, 7, 5][lod], rings = [7, 4, 2][lod], half = 1.6 + 0.4 * k, r0 = 0.2 + 0.04 * k, cy = 0.18;
    const ring = [];
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1), x = -half + 2 * half * t, r = r0 * (1 - 0.14 * t + 0.05 * Math.sin(t * 9 + k)), bow = 0.05 * Math.sin(t * Math.PI);
      const row = [];
      for (let j = 0; j < segs; j++) {
        const a = j / segs * 6.2832, bump = 1 + 0.07 * Math.sin(a * 3 + t * 5 + k);
        const jag = i === 0 ? -0.09 * (1 + Math.sin(a * 3 + k * 2)) : i === rings - 1 ? 0.09 * (1 + Math.sin(a * 2 + k)) : 0;
        row.push(vert([x + jag, cy + bow + r * bump * Math.cos(a), r * bump * Math.sin(a)], [0, Math.cos(a), Math.sin(a)]));
      }
      ring.push(row);
    }
    for (let i = 0; i + 1 < rings; i++) for (let j = 0; j < segs; j++) { const j1 = (j + 1) % segs; F.push([ring[i][j], ring[i + 1][j], ring[i + 1][j1]], [ring[i][j], ring[i + 1][j1], ring[i][j1]]); }
    // Its two broken ends.
    for (const [i, sx] of [[0, -1], [rings - 1, 1]]) {
      const c = vert([sx * (half + 0.05), cy, 0], [sx, 0, 0]);
      const cap = ring[i].map((q) => vert(P[q], [sx, 0, 0]));
      for (let j = 0; j < segs; j++) F.push([c, cap[j], cap[(j + 1) % segs]]);
    }
  } else if (v === STUMP[0] || v === STUMP[1]) {
    const k = v - STUMP[0], segs = [12, 8, 6][lod], rings = [5, 3, 2][lod], H = 0.5 + 0.18 * k, r0 = 0.3;
    const ring = [];
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1), row = [];
      for (let j = 0; j < segs; j++) {
        const a = j / segs * 6.2832, flare = 0.7 * (1 - t) ** 3 * (0.5 + 0.5 * Math.cos(a * 5 + k));
        const top = i === rings - 1 ? 0.12 * Math.sin(a * 2 + k) + 0.06 * Math.sin(a * 5 + k * 3) : 0;
        const r = r0 * (1 + flare) * (1 + 0.05 * Math.sin(a * 7));
        row.push(vert([r * Math.cos(a), -0.15 + (H + 0.15) * t + top, r * Math.sin(a)], [Math.cos(a), 0.25 * (1 - t), Math.sin(a)]));
      }
      ring.push(row);
    }
    for (let i = 0; i + 1 < rings; i++) for (let j = 0; j < segs; j++) { const j1 = (j + 1) % segs; F.push([ring[i][j], ring[i][j1], ring[i + 1][j1]], [ring[i][j], ring[i + 1][j1], ring[i + 1][j]]); }
    const c = vert([0, H - 0.03, 0], [0, 1, 0]), cap = ring[rings - 1].map((q) => vert(P[q], [0, 1, 0]));
    for (let j = 0; j < segs; j++) F.push([c, cap[(j + 1) % segs], cap[j]]);
  } else if (REED.includes(v)) {
    // Three kinds of bed: tall and thin; short, thick and leaning; and broken, some stems snapped and bent over.
    const k = v - REED[0], n = [[16, 10, 6], [22, 14, 8], [12, 8, 5]][k][lod], segs = [3, 2, 1][lod];
    for (let b = 0; b < n; b++) {
      const a = R() * 6.2832, d = Math.sqrt(R()) * (k === 1 ? 0.3 : 0.2), dir = R() * 6.2832;
      const h = k === 0 ? 1.0 + 0.5 * R() : k === 1 ? 0.6 + 0.35 * R() : 0.5 + 0.7 * R();
      const bend = k === 2 && R() < 0.4 ? 0.9 + 0.5 * R() : k === 1 ? 0.3 + 0.3 * R() : 0.1 + 0.25 * R();
      blade(Math.cos(a) * d, Math.sin(a) * d, h, k === 1 ? 0.045 : 0.032, dir, bend, segs, [0, 0]);
    }
  } else if (v === FERN) {
    const n = [8, 6, 4][lod], segs = [5, 3, 2][lod];
    for (let b = 0; b < n; b++) {
      const dir = b / n * 6.2832 + R() * 0.4, len = 0.55 + 0.2 * R(), dx = Math.cos(dir), dz = Math.sin(dir);
      let prev = null;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs, r = len * t, y = 0.38 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.75) - 0.08 * t, w = 0.15 * Math.sin(Math.min(1, t * 1.1) * Math.PI) + 0.01;
        const nrm = [-dx * 0.3 * (t - 0.5), 1, -dz * 0.3 * (t - 0.5)];
        const a = vert([dx * r + dz * w, y, dz * r - dx * w], nrm), c = vert([dx * r - dz * w, y, dz * r + dx * w], nrm);
        if (prev) F.push([prev[0], prev[1], c], [prev[0], c, a]);
        prev = [a, c];
      }
    }
  } else if (v === TUFT) {
    const n = [14, 9, 5][lod], segs = [2, 2, 1][lod];
    for (let b = 0; b < n; b++) {
      const a = R() * 6.2832, d = Math.sqrt(R()) * 0.14, dir = a + (R() - 0.5);
      blade(Math.cos(a) * d, Math.sin(a) * d, 0.32 + 0.3 * R(), 0.03, dir, 0.12 + 0.2 * R(), segs, [0, 0]);
    }
  } else {
    // A pool: water with a soft, wandering edge, and a band of wet mud round it sloping down under the ground.
    const segs = 40, c = vert([0, 0, 0], [0, 1, 0]), edge = [], rim = [];
    const ph = R() * 6.28, ph2 = R() * 6.28;
    for (let j = 0; j < segs; j++) {
      const a = j / segs * 6.2832, r = 0.85 + 0.1 * Math.sin(a * 2 + ph) + 0.06 * Math.sin(a * 3 + ph2);
      edge.push(vert([Math.cos(a) * r, 0, Math.sin(a) * r], [0, 1, 0]));
      rim.push(vert([Math.cos(a) * r * 1.4, -0.05, Math.sin(a) * r * 1.4], [0, 1, 0]));
    }
    for (let j = 0; j < segs; j++) { const j1 = (j + 1) % segs; F.push([c, edge[j1], edge[j]], [edge[j], edge[j1], rim[j1]], [edge[j], rim[j1], rim[j]]); }
  }
  return { P, N, F };
}

// A crow, in the tumblers' units (the sim's radius scales it): its body along +z, wings out along x, flat and two-jointed, a
// fanned tail. The tumblers' shader flaps the wings and folds them back for a dive.
function crowMesh() {
  const P = [], N = [], F = [];
  const v = (x, y, z, n) => { P.push([x, y, z]); N.push(n); return P.length - 1; };
  // Body: rings along it, round in section, deeper at the breast; a head, and a beak to a point.
  const rings = [[-0.62, 0.07, 0.06], [-0.3, 0.14, 0.12], [0.1, 0.17, 0.16], [0.46, 0.12, 0.12], [0.66, 0.11, 0.11], [0.84, 0.07, 0.07], [1.06, 0.0, 0.0]];
  const seg = 7, start = P.length;
  rings.forEach(([z, w, h]) => {
    for (let i = 0; i < seg; i++) {
      const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      v(c * w, 0.2 + s * h - (z > 0.85 ? 0.03 : 0), z, [c, s, 0]);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < seg; i++) {
    const a = start + r * seg + i, b = start + r * seg + (i + 1) % seg, c = a + seg, d = b + seg;
    F.push([a, b, d], [a, d, c]);
  }
  // Tail: a fan behind.
  const up = [0, 1, 0];
  const t0 = v(-0.08, 0.24, -0.55, up), t1 = v(0.08, 0.24, -0.55, up), t2 = v(0.3, 0.2, -1.25, up), t3 = v(-0.3, 0.2, -1.25, up), t4 = v(0, 0.21, -1.15, up);
  F.push([t0, t1, t4], [t1, t2, t4], [t3, t0, t4]);
  // Wings: inner from the shoulder to the wrist, outer to the fingered tip, swept back.
  for (const sx of [-1, 1]) {
    const a = v(sx * 0.16, 0.28, 0.32, up), b = v(sx * 0.16, 0.27, -0.38, up);
    const c = v(sx * 0.82, 0.32, 0.3, up), d = v(sx * 0.82, 0.31, -0.6, up), w = v(sx * 0.9, 0.31, -0.15, up);
    // (The tip ragged: five long flight feathers spread like fingers.)
    const rim = [c];
    [[1.38, 0.18], [1.48, 0.0], [1.47, -0.2], [1.38, -0.38], [1.2, -0.54]].forEach(([fx, fz], i) => {
      rim.push(v(sx * fx, 0.3, fz, up));
      if (i < 4) rim.push(v(sx * (fx - 0.2), 0.3, fz - 0.1, up));
    });
    rim.push(d);
    F.push([a, c, d], [a, d, b]);
    for (let i = 0; i < rim.length - 1; i++) F.push([w, rim[i], rim[i + 1]]);
  }
  return { P, N, F };
}

function rockMeshes() {
  const verts = [], idx = [], parts = [];
  for (let lod = 0; lod < LODS; lod++) {
    const sphere = icosphere(3 - lod);
    for (let k = 0; k < VARIANTS; k++) {
      const base = verts.length / 6;
      const first = idx.length;
      if (k >= ROCK_VARIANTS) {
        const { P, N, F } = debrisMesh(k, lod);
        for (const f of F) idx.push(base + f[0], base + f[1], base + f[2]);
        for (let i = 0; i < P.length; i++) verts.push(...P[i], ...N[i]);
        parts.push({ first, count: idx.length - first, base: 0 });
        continue;
      }
      const shape = shapeOf(k);
      const S = sphere.v.map(shape);
      const P = S.map((s) => s.p);
      const N = P.map(() => [0, 0, 0]);
      for (let [a, b, c] of sphere.f) {
        const pa = P[a], pb = P[b], pc = P[c];
        const e1 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], e2 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        // (Wound so it faces out.)
        const cx = pa[0] + pb[0] + pc[0], cy = pa[1] + pb[1] + pc[1], cz = pa[2] + pb[2] + pc[2];
        if (n[0] * cx + n[1] * (cy - 0.6) + n[2] * cz < 0) { [b, c] = [c, b]; n = n.map((q) => -q); }
        for (const q of [a, b, c]) { N[q][0] += n[0]; N[q][1] += n[1]; N[q][2] += n[2]; }
        idx.push(base + a, base + b, base + c);
      }
      for (let i = 0; i < P.length; i++) {
        const l = Math.hypot(...N[i]) || 1;
        let n = [N[i][0] / l, N[i][1] / l, N[i][2] / l];
        // On a fractured face, mostly the face's own normal: flat faces, edges that catch the light.
        const f = S[i].fn;
        if (f && lod < 2) { n = [n[0] * 0.25 + f[0] * 0.75, n[1] * 0.25 + f[1] * 0.75, n[2] * 0.25 + f[2] * 0.75]; const m = Math.hypot(...n); n = n.map((q) => q / m); }
        verts.push(P[i][0], P[i][1], P[i][2], n[0], n[1], n[2]);
      }
      parts.push({ first, count: idx.length - first, base: 0 });
    }
  }
  // (Last, the crow, for the flocks over the Downs.)
  const base = verts.length / 6, first = idx.length, crow = crowMesh();
  for (const f of crow.F) idx.push(base + f[0], base + f[1], base + f[2]);
  for (let i = 0; i < crow.P.length; i++) verts.push(...crow.P[i], ...crow.N[i]);
  parts.push({ first, count: idx.length - first, base: 0 });
  return { verts: new Float32Array(verts), idx: new Uint32Array(idx), parts };
}

const ROCK = COMMON + /* wgsl */ `
@group(1) @binding(0) var groundColor: texture_2d_array<f32>;
@group(1) @binding(1) var groundDetail: texture_2d_array<f32>;
@group(1) @binding(2) var farMap: texture_2d<f32>;
@group(1) @binding(3) var farTint: texture_2d<f32>;
@group(1) @binding(4) var farKind: texture_2d<f32>;

struct V {
  @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) viewZ: f32,
  @location(3) @interpolate(flat) look: vec4f, @location(4) low: f32, @location(5) tint: vec3f,
  @location(6) lp: vec3f, @location(7) ln: vec3f, @location(8) @interpolate(flat) mat: f32,
};

@vertex fn vs(@location(0) pIn: vec3f, @location(1) nIn: vec3f, @location(5) at: vec4f, @location(6) spin: vec4f) -> V {
  var o: V;
  // (Which mesh, and its tone, in one: src/gfx/rocks.js setRocks.) What it's made of: 0 stone, 1 log, 2 stump, 3 reeds, 4 fern,
  // 5 tuft, 6 puddle.
  let vk = floor(spin.w);
  let tone = spin.w - vk;
  var mat = 0.0;
  if (vk > 15.5) { mat = 1.0; }
  if (vk > 17.5) { mat = 2.0; }
  if (vk > 19.5) { mat = 3.0; }
  if (vk > 22.5) { mat = 4.0; }
  if (vk > 23.5) { mat = 5.0; }
  if (vk > 24.5) { mat = 6.0; }
  var pl = pIn;
  // What grows sways in the wind, more the higher up it.
  if (mat > 2.5 && mat < 5.5) {
    let sway = sin(F.camPos.w * 1.6 + at.x * 0.37 + at.z * 0.29) * 0.07 + sin(F.camPos.w * 2.9 + at.x * 0.11 - at.z * 0.23) * 0.03;
    pl = pl + vec3f(sway, 0.0, sway * 0.6) * pIn.y * pIn.y;
  }
  let q = vec3f(pl.x, pl.y * spin.z, pl.z) * at.w;
  let p = vec3f(q.x * spin.x - q.z * spin.y, q.y, q.x * spin.y + q.z * spin.x) + at.xyz;
  let nq = normalize(vec3f(nIn.x, nIn.y / spin.z, nIn.z));
  o.n = vec3f(nq.x * spin.x - nq.z * spin.y, nq.y, nq.x * spin.y + nq.z * spin.x);
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.p = p;
  o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  o.low = pIn.y;
  o.lp = pIn; o.ln = nIn; o.mat = mat;
  // What stone, from the country it lies in: the same pick as the ground's (src/gfx/materials.js TERRAIN).
  let fuv = at.xz / FAR_SPAN + 0.5;
  let fm = textureSampleLevel(farMap, clampSmp, fuv, 0.0);
  let fk = textureSampleLevel(farKind, clampSmp, fuv, 0.0);
  let ft = textureSampleLevel(farTint, clampSmp, fuv, 0.0);
  let j = tone - 0.5;
  var layer = 9.0;
  var bw = max(0.0, 1.0 - fk.r - fk.g - fk.b - fk.a) + j * 0.5;
  if (fk.r + fk.a - j * 0.4 > bw) { layer = 11.0; bw = fk.r + fk.a - j * 0.4; }
  if (fk.g + j * 0.3 > bw) { layer = 17.0; bw = fk.g + j * 0.3; }
  if (fk.b - j * 0.35 > bw) { layer = 12.0; bw = fk.b - j * 0.35; }
  if (fm.b + j * 0.3 > max(bw, 0.35)) { layer = 10.0; }
  // Moss on its top in the woods and the wet; snow on its top where the ground's white.
  let moss = clamp(fm.g * 1.3 + ft.a * 0.6 + 0.15 - fk.r - fm.b, 0.0, 1.0) * (0.55 + 0.6 * tone);
  o.look = vec4f(layer, moss, fm.b, tone);
  o.tint = ft.rgb * 1.5;
  return o;
}

@fragment fn fs(in: V) -> Out {
  let p = in.p;
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  let n0 = normalize(in.n);
  let layer = i32(in.look.x);
  // Painted from all three sides, each where the face looks most that way. (On a phone, only the side it looks most.)
  let k = 0.42;
  let w0 = pow(abs(n0), vec3f(4.0));
  let w = w0 / (w0.x + w0.y + w0.z);
  var col: vec3f; var det: vec4f;
  let uvX = p.zy * k; let uvY = p.xz * k; let uvZ = p.xy * k;
  let dxY = dpdx(uvY); let dyY = dpdy(uvY);
  let uvF = vec2f(0.4536 * p.x - 0.8912 * p.z, 0.8912 * p.x + 0.4536 * p.z) * 0.13 + 0.37;
  let dxF = dpdx(uvF); let dyF = dpdy(uvF);
  if (LEAN) {
    var uv = uvY;
    if (w.x > w.y && w.x > w.z) { uv = uvX; } else if (w.z > w.y) { uv = uvZ; }
    col = textureSample(groundColor, repeatSmp, uv, layer).rgb;
    det = vec4f(0.5, 0.5, 0.9, 0.5);
  } else {
    col = textureSample(groundColor, repeatSmp, uvX, layer).rgb * w.x + textureSample(groundColor, repeatSmp, uvY, layer).rgb * w.y + textureSample(groundColor, repeatSmp, uvZ, layer).rgb * w.z;
    var uvD = uvY;
    if (w.x > w.y && w.x > w.z) { uvD = uvX; } else if (w.z > w.y) { uvD = uvZ; }
    det = textureSample(groundDetail, repeatSmp, uvD, layer);
  }
  // (The paintings are of stone in shade; a boulder in the open sits near the ground's own value, not a hole in it.)
  var albedo = col * 1.45 * (0.82 + 0.36 * in.look.w) * mix(vec3f(1.0), in.tint, 0.5);
  // (Even the blackest stone in full light isn't a hole: basalt and ash stone kept off black.)
  albedo = max(albedo, vec3f(0.12, 0.115, 0.108) * mix(vec3f(1.0), in.tint, 0.5));
  // Bands in the stone, as it was laid down: level, wandering a little.
  let strata = textureSampleLevel(noiseTex, repeatSmp, vec2f(p.x * 0.013 + p.z * 0.011, p.y * 0.55), 0.0);
  albedo *= 0.84 + 0.32 * strata.g;
  // The top: moss, or snow lying on it.
  let up = n0.y + (det.a - 0.5) * 0.6;
  let mossAmt = smoothstep(0.25, 0.75, up) * in.look.y;
  if (mossAmt > 0.01 && !LEAN) {
    let m = textureSampleGrad(groundColor, repeatSmp, uvY * 1.3, 13, dxY * 1.3, dyY * 1.3).rgb;
    albedo = mix(albedo, m * vec3f(0.8, 0.85, 0.7), mossAmt);
  } else if (mossAmt > 0.01) { albedo = mix(albedo, vec3f(0.12, 0.16, 0.07), mossAmt); }
  let snowAmt = smoothstep(0.3, 0.6, up) * smoothstep(0.2, 0.5, in.look.z);
  if (snowAmt > 0.01) {
    var s = vec3f(0.84, 0.87, 0.93);
    if (!LEAN) { s = textureSampleGrad(groundColor, repeatSmp, uvY * 1.1, 7, dxY * 1.1, dyY * 1.1).rgb * 1.06; }
    albedo = mix(albedo, s, snowAmt);
  }
  // Earth on it where it goes into the ground, and the light shut out.
  var ao = mix(0.45, 1.0, smoothstep(-0.25, 0.25, in.low));
  albedo = mix(albedo, vec3f(0.16, 0.13, 0.09) * in.tint, (1.0 - smoothstep(-0.02, 0.16, in.low)) * 0.6 * (1.0 - snowAmt));
  var n = n0;
  if (!LEAN) { n = perturb(n0, p, uvD_(n0, p, k), det.rg, 0.55 * (1.0 - smoothstep(20.0, 60.0, dist))); }
  var rough = mix(0.92, det.b, 0.5) * mix(1.0, 0.7, snowAmt);
  var water = 0.0;
  // Not stone: wood, what grows, or water.
  if (in.mat > 0.5) {
    let lp = in.lp;
    let tone = in.look.w;
    if (in.mat < 2.5) {
      // Bark: grooved along the grain; the broken or sawn end pale, in rings. A log lies along x; a stump stands up y.
      let isLog = in.mat < 1.5;
      let along = select(lp.y, lp.x, isLog);
      let ang = select(atan2(lp.z, lp.x), atan2(lp.z, lp.y - 0.18), isLog);
      let nb = textureSampleLevel(noiseTex, repeatSmp, vec2f(along * 0.45, ang * 0.32), 0.0);
      let groove = smoothstep(0.3, 0.5, abs(fract(ang * 5.2 + nb.r * 2.2 + along * 0.2) - 0.5)) * (0.6 + 0.4 * nb.a);
      var wood = mix(vec3f(0.07, 0.06, 0.047), vec3f(0.028, 0.022, 0.017), groove) * (0.7 + 0.6 * nb.g);
      let endAmt = select(smoothstep(0.6, 0.9, in.ln.y), smoothstep(0.6, 0.9, abs(in.ln.x)), isLog);
      let rr = select(length(lp.xz), length(vec2f(lp.y - 0.18, lp.z)), isLog);
      let rings = fract(rr * 24.0 + nb.b * 0.7);
      // (Old wood, weathered grey; the rings only faintly there.)
      wood = mix(wood, mix(vec3f(0.19, 0.17, 0.145), vec3f(0.15, 0.13, 0.11), smoothstep(0.35, 0.65, rings)) * (0.75 + 0.35 * nb.g), endAmt);
      // (Some burned, black.)
      wood *= select(1.0, 0.22, tone < 0.13);
      albedo = wood * mix(vec3f(1.0), in.tint, 0.5);
      albedo = mix(albedo, vec3f(0.055, 0.075, 0.025) * in.tint, smoothstep(0.55, 0.9, n0.y + (nb.a - 0.5) * 0.6) * in.look.y * 0.75 * (1.0 - endAmt));
      rough = 0.88;
      ao = 1.0;
      n = n0;
    } else if (in.mat < 5.5) {
      // Reeds dark at the foot and straw at the tip; fern green, its leaflets cut across it; tufts going dry at their tips.
      let hgt = clamp(lp.y / select(0.55, 1.25, in.mat < 3.5), 0.0, 1.0);
      var plant = mix(vec3f(0.12, 0.15, 0.06), vec3f(0.36, 0.36, 0.17), hgt * hgt);
      if (in.mat < 3.5) {
        let tip = mix(mix(vec3f(0.2, 0.22, 0.08), vec3f(0.3, 0.2, 0.1), smoothstep(0.0, 0.5, tone)), vec3f(0.44, 0.38, 0.2), smoothstep(0.5, 1.0, tone));
        plant = mix(vec3f(0.08, 0.1, 0.04), tip, smoothstep(0.15, 0.9, hgt));
      }
      if (in.mat > 3.5 && in.mat < 4.5) {
        let leaf = 0.5 + 0.5 * sin(length(lp.xz) * 60.0);
        plant = mix(vec3f(0.07, 0.13, 0.03), vec3f(0.15, 0.25, 0.06), hgt) * mix(0.6, 1.1, leaf);
      }
      albedo = plant * (0.8 + 0.4 * tone) * mix(vec3f(1.0), in.tint, 0.65);
      n = normalize(select(n0, -n0, dot(n0, v) < 0.0) * 0.5 + vec3f(0.0, 0.8, 0.0));
      rough = 0.8;
      ao = mix(0.45, 1.0, hgt);
    } else {
      // Still, black water with the sky in it, and a muddy rim; the wind ruffling it.
      // Peaty water, near black looking down into it, the sky in it as you look across; wet mud round it, darker by the water.
      // (The water's own wandering edge is where the mesh starts down into its rim.)
      let rim = 1.0 - smoothstep(-0.012, -0.0005, lp.y);
      let shore = smoothstep(-0.015, -0.045, lp.y);
      let rip = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.5 + vec2f(F.camPos.w * 0.025, F.camPos.w * 0.018), 0.0);
      let mud = textureSampleGrad(groundColor, repeatSmp, uvF, 15, dxF, dyF).rgb * 0.85 * in.tint;
      albedo = mix(vec3f(0.03, 0.025, 0.017), mud * mix(0.45, 0.8, shore), rim);
      rough = mix(0.05, mix(0.35, 0.8, shore), rim);
      n = normalize(vec3f((rip.r - 0.5) * 0.12, 1.0, (rip.g - 0.5) * 0.12) * (1.0 - rim) + n0 * rim);
      water = 1.0 - rim;
      ao = 1.0;
    }
  }
  let seed = ign(in.pos.xy);
  let shadow = shadowAt(p, n0, in.viewZ, seed);
  var c = shadePBR(p, n, v, albedo, rough, 0.0, ao, shadow);
  // (Stone's shaded side still has the whole sky over it: a soft fill, so a big dark boulder's back isn't a black hole.)
  if (in.mat < 0.5) { c += albedo * mix(F.groundAmb.rgb, F.skyAmb.rgb, 0.65) * 0.55 * ao * (1.0 - 0.6 * shadow * max(dot(n, F.sunDir.xyz), 0.0)); }
  // (Water gives back the sky only as you look across it; looking down into it, it's dark peat.)
  c *= mix(1.0, 0.28 + 0.72 * pow(1.0 - max(dot(n, v), 0.0), 5.0), water);
  c = applyFog(c, p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}

// (The uv the detail map was read with, again, for the bump's tangents.)
fn uvD_(n: vec3f, p: vec3f, k: f32) -> vec2f {
  let a = abs(n);
  if (a.x > a.y && a.x > a.z) { return p.zy * k; }
  if (a.z > a.y) { return p.xy * k; }
  return p.xz * k;
}
`;

const SHADOW_ROCK = /* wgsl */ `
struct U { m: mat4x4f, t: vec4f };
@group(0) @binding(0) var<uniform> U_: U;
@vertex fn vs(@location(0) pIn: vec3f, @location(5) at: vec4f, @location(6) spin: vec4f) -> @builtin(position) vec4f {
  let q = vec3f(pIn.x, pIn.y * spin.z, pIn.z) * at.w;
  return U_.m * vec4f(vec3f(q.x * spin.x - q.z * spin.y, q.y, q.x * spin.y + q.z * spin.x) + at.xyz, 1.0);
}
`;

// The tumblers (src/sim/tumblers.js): the round rocks again, turned whole as they roll, painted in local space so the paint rolls
// with them, and lit from inside along their cracks in their country's fire. Asleep, their cracks are dark: just another boulder.
// (Their kinds, in the sim's order: TUMBLER_KINDS. Stone layer, moss, and the fire's colour.)
const TUMBLER = COMMON + /* wgsl */ `
@group(1) @binding(0) var groundColor: texture_2d_array<f32>;
@group(1) @binding(1) var groundDetail: texture_2d_array<f32>;

// (Bare stone, all but the Mire Mound's bog-weed: no moss or snow on a sleeping one, where the boulders round it have theirs.)
const LOOK = array<vec4f, 11>(
  vec4f(9.0, 0.0, 0.0, 0.0), vec4f(12.0, 0.0, 0.0, 0.0), vec4f(17.0, 0.0, 0.0, 0.0), vec4f(11.0, 0.0, 0.0, 0.0),
  vec4f(10.0, 0.0, 0.0, 0.0), vec4f(12.0, 0.0, 0.0, 0.0), vec4f(9.0, 0.0, 0.0, 0.0), vec4f(11.0, 0.0, 0.0, 0.0),
  vec4f(15.0, 0.55, 0.0, 0.0), vec4f(11.0, 0.0, 0.0, 0.0), vec4f(11.0, 0.0, 0.0, 0.0));
// (The crows' eyes: a dull ember; the Crowmother's, a cold violet.)
const FIRE = array<vec3f, 11>(
  vec3f(0.35, 1.0, 0.25), vec3f(1.0, 0.82, 0.4), vec3f(1.0, 0.4, 0.1), vec3f(1.0, 0.28, 0.04),
  vec3f(0.4, 0.78, 1.0), vec3f(0.7, 1.0, 0.75), vec3f(0.72, 0.3, 1.0), vec3f(0.35, 0.85, 1.0),
  vec3f(0.75, 0.95, 0.15), vec3f(1.0, 0.3, 0.08), vec3f(0.75, 0.35, 1.0));

struct V {
  @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) viewZ: f32,
  @location(3) @interpolate(flat) look: vec4f, @location(4) lp: vec3f, @location(5) ln: vec3f,
};

@vertex fn vs(@location(0) pIn: vec3f, @location(1) nIn: vec3f, @location(5) r0: vec4f, @location(6) r1: vec4f, @location(7) r2: vec4f, @location(8) look: vec4f) -> V {
  var o: V;
  var q = pIn - vec3f(0.0, 0.16, 0.0);
  var nl = nIn;
  // (The Mire Mound: squat and spread, a heap of bog, not a boulder.)
  if (look.x > 7.5 && look.x < 8.5) {
    let d = normalize(pIn - vec3f(0.0, 0.25, 0.0));
    let lump = 0.75 * (1.0 + 0.08 * sin(d.x * 5.0 + d.z * 3.0 + r0.w) + 0.05 * sin(d.z * 7.0 - d.y * 4.0 + r2.w));
    // (Its foot flares into a skirt of mud, and it's sunk so the rim lies a little under the bog: it swells out of the ground,
    // not sitting on it. The 0.72 the renderer lifts every tumbler by is for a boulder's height, so most of it is taken back.)
    let sag = 1.0 + 0.6 * (1.0 - smoothstep(-0.6, 0.3, d.y));
    q = d * lump * vec3f(1.35 * sag, 0.6, 1.35 * sag) - vec3f(0.0, 0.37, 0.0);
    nl = normalize(d * vec3f(1.0 / (1.35 * sag), 1.0 / 0.6, 1.0 / (1.35 * sag)));
    // (A glob of it in flight, the little ones: a round lump, centred where the sim has it.)
    if (look.w < 0.3) { q = d * lump * vec3f(1.0, 0.85, 1.15); nl = d; }
  }
  // A crow: its wings beat (how hard, the sim's glow), and fold back along it for a dive.
  if (look.x > 8.5) {
    let ax = abs(pIn.x);
    let open = smoothstep(0.1, 0.5, look.y);
    let beat = sin(F.camPos.w * select(13.0, 8.0, look.x > 9.5) + (r0.w + r2.w) * 1.7);
    let reach = max(0.0, ax - 0.15);
    q.y = q.y + beat * reach * 0.6 * look.y + reach * reach * 0.12;
    q.x = sign(pIn.x) * (min(ax, 0.16) + reach * mix(0.35, 1.0, open));
    q.z = q.z - reach * (1.0 - open) * 0.55;
  }
  let p = vec3f(dot(r0.xyz, q), dot(r1.xyz, q), dot(r2.xyz, q)) + vec3f(r0.w, r1.w + look.w * 0.72, r2.w);
  o.n = normalize(vec3f(dot(r0.xyz, nl), dot(r1.xyz, nl), dot(r2.xyz, nl)));
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.p = p;
  o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  o.look = look;
  o.lp = q * look.w; o.ln = nl;
  return o;
}

@fragment fn fs(in: V) -> Out {
  let p = in.p;
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  var n0 = normalize(in.n);
  // (A crow's wing is one sheet: its underside is as black as its top.)
  if (in.look.x > 8.5 && dot(n0, v) < 0.0) { n0 = -n0; }
  let kind = u32(in.look.x);
  let lk = LOOK[kind];
  let layer = i32(lk.x);
  let ln = normalize(in.ln);
  let w0 = pow(abs(ln), vec3f(4.0));
  let w = w0 / (w0.x + w0.y + w0.z);
  let k = 0.5;
  let lp = in.lp;
  var col = textureSample(groundColor, repeatSmp, lp.zy * k, layer).rgb * w.x + textureSample(groundColor, repeatSmp, lp.xz * k, layer).rgb * w.y + textureSample(groundColor, repeatSmp, lp.xy * k, layer).rgb * w.z;
  let det = textureSample(groundDetail, repeatSmp, lp.zy * k * 0.7, layer) * w.x + textureSample(groundDetail, repeatSmp, lp.xz * k * 0.7, layer) * w.y + textureSample(groundDetail, repeatSmp, lp.xy * k * 0.7, layer) * w.z;
  // (As light as the boulders it lies among, and kept off black the same way: asleep, it's bare, not a hole.)
  var albedo = max(col * 1.3, vec3f(0.12, 0.115, 0.108));
  // Moss on the Mossback, wherever it lay uppermost last.
  let m = textureSample(groundColor, repeatSmp, lp.xz * 0.7, 13).rgb;
  albedo = mix(albedo, m * vec3f(0.8, 0.85, 0.7), smoothstep(0.1, 0.6, ln.y + (det.a - 0.5)) * lk.y);
  // The cracks: the low places in the stone's own relief, joined up by a slow wander, lit from inside.
  // Asleep, now and then a slow pulse of light runs through it: only close to, and only if you're looking.
  let tell = (1.0 - smoothstep(0.0, 0.05, in.look.y)) * pow(max(0.0, sin(F.camPos.w * 1.7 + (p.x + p.z) * 0.37)), 14.0) * (1.0 - smoothstep(10.0, 16.0, dist));
  let glow = max(in.look.y, tell * 0.4);
  let vein = textureSample(noiseTex, repeatSmp, (lp.xz + lp.zy * 0.7) * 0.18);
  let crack = smoothstep(0.3, 0.16, det.a) * 0.8 + (1.0 - smoothstep(0.0, 0.032, abs(vein.g - 0.5))) * 1.0;
  let pulse = 0.7 + 0.3 * sin(F.camPos.w * 4.0 + lp.y * 3.0);
  var fire = FIRE[kind] * crack * glow * pulse * 5.0;
  albedo *= mix(1.0, 0.45, min(1.0, crack) * glow);
  var rough0 = mix(0.92, det.b, 0.5);
  if (kind >= 9u) {
    // Black feather with a blue-green oil sheen, and the eyes alight.
    let q = lp / in.look.w + vec3f(0.0, 0.16, 0.0);
    let sheen = pow(1.0 - abs(dot(n0, v)), 3.0);
    albedo = vec3f(0.014, 0.014, 0.017) + vec3f(0.006, 0.016, 0.02) * sheen;
    let mother = kind == 10u;
    let eye = 1.0 - smoothstep(select(0.025, 0.045, mother), select(0.05, 0.075, mother), length(vec3f(abs(q.x) - 0.1, q.y - 0.26, q.z - 0.78)));
    fire = FIRE[kind] * eye * select(2.5, 14.0, mother);
    rough0 = 0.82;
  }
  if (kind == 8u) {
    // Wet black bog, weed over its top, and the sickly light only in the thinnest seams of it.
    let seam = 1.0 - smoothstep(0.0, 0.022, abs(vein.g - 0.5));
    fire = FIRE[kind] * seam * glow * pulse * 5.0;
    albedo = mix(col * vec3f(0.42, 0.4, 0.34), m * vec3f(0.45, 0.55, 0.3), smoothstep(0.1, 0.6, ln.y + (det.a - 0.5)) * select(0.7, 0.12, in.look.w < 0.3));
    // (Matte peat, wet only in streaks running down it.)
    let streak = smoothstep(0.58, 0.7, textureSampleLevel(noiseTex, repeatSmp, vec2f(atan2(lp.z, lp.x) * 0.9, lp.y * 0.12), 0.0).r);
    rough0 = mix(0.72, 0.16, streak);
    albedo *= mix(1.0, 0.7, streak);
  }
  let ao = mix(0.6, 1.0, smoothstep(-0.6, 0.6, n0.y));
  let rough = rough0;
  let seed = ign(in.pos.xy);
  let shadow = shadowAt(p, n0, in.viewZ, seed);
  var c = shadePBR(p, n0, v, albedo, rough, 0.0, ao, shadow);
  // (The same soft sky fill on its shaded side as the rocks have; not on the crows, which stay black.)
  if (kind < 9u) { c += albedo * mix(F.groundAmb.rgb, F.skyAmb.rgb, 0.65) * 0.55 * ao * (1.0 - 0.6 * shadow * max(dot(n0, F.sunDir.xyz), 0.0)); }
  c += fire + vec3f(1.0, 0.6, 0.4) * in.look.z * 0.6;
  c = applyFog(c, p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

const SHADOW_TUMBLER = /* wgsl */ `
struct U { m: mat4x4f, t: vec4f };
@group(0) @binding(0) var<uniform> U_: U;
@vertex fn vs(@location(0) pIn: vec3f, @location(5) r0: vec4f, @location(6) r1: vec4f, @location(7) r2: vec4f, @location(8) look: vec4f) -> @builtin(position) vec4f {
  var q = pIn - vec3f(0.0, 0.16, 0.0);
  // (The Mire Mound's shadow from its own heap: as in TUMBLER.)
  if (look.x > 7.5 && look.x < 8.5) {
    let d = normalize(pIn - vec3f(0.0, 0.25, 0.0));
    let sag = 1.0 + 0.6 * (1.0 - smoothstep(-0.6, 0.3, d.y));
    q = d * 0.75 * vec3f(1.35 * sag, 0.6, 1.35 * sag) - vec3f(0.0, 0.37, 0.0);
  }
  return U_.m * vec4f(vec3f(dot(r0.xyz, q), dot(r1.xyz, q), dot(r2.xyz, q)) + vec3f(r0.w, r1.w + look.w * 0.72, r2.w), 1.0);
}
`;

const T_FLOATS = 16;
const T_INSTANCE = { arrayStride: T_FLOATS * 4, stepMode: 'instance', attributes: [5, 6, 7, 8].map((l, i) => ({ shaderLocation: l, offset: i * 16, format: 'float32x4' })) };

const MESH = { arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] };
const INSTANCE = { arrayStride: FLOATS * 4, stepMode: 'instance', attributes: [{ shaderLocation: 5, offset: 0, format: 'float32x4' }, { shaderLocation: 6, offset: 16, format: 'float32x4' }] };

export class Rocks {
  constructor(r) {
    this.r = r;
    const { device, tier } = r;
    this.lean = !!tier.lean;
    const { verts, idx, parts } = rockMeshes();
    this.VB = makeBuffer(device, verts, GPUBufferUsage.VERTEX);
    this.IB = makeBuffer(device, idx, GPUBufferUsage.INDEX);
    this.parts = parts;   // [lod * VARIANTS + variant]
    // On a phone: the stones only close by, and the boulders only as far as the haze lets you see them.
    this.stoneReach = this.lean ? 60 : STONE_REACH;
    this.boulderReach = this.lean ? 300 : BOULDER_REACH;
    // (Stones, boulders, great boulders; gravel, and what grows.)
    this.reach = [this.stoneReach, this.boulderReach * 0.5, this.boulderReach, this.lean ? 25 : 50, this.lean ? 35 : 95];
    this.chunks = [];
    this.lists = Array.from({ length: LODS }, () => ({ buf: null, cpu: new Float32Array(0), cap: 0, count: 0, runs: new Array(VARIANTS).fill(null).map(() => [0, 0]) }));
    this.stoneAt = [1e9, 1e9]; this.boulderAt = [1e9, 1e9]; this.roadAt = [1e9, 1e9]; this.roadBusy = false;
    this.busy = false; this.dirty = true;
    this.lastX = 1e9; this.lastZ = 1e9; this.lastFx = 0; this.lastFz = 0;
    this.stones = new Float32Array(0); this.boulders = new Float32Array(0);
    r.stats.rocks = 0;
    // The tumblers: a list of each of the four round rocks, filled every frame from the snapshot.
    this.tCpu = new Float32Array(MAX_TUMBLERS * T_FLOATS);
    this.tBuf = device.createBuffer({ size: this.tCpu.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.tRuns = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];   // (The four round rocks, and the crow.)
    this.crowPart = parts[parts.length - 1];
    this.tCount = 0;
  }

  buildPipelines(layout, targets, depth, ms, shDepth, bglShadow) {
    const { r } = this;
    const { device } = r;
    const FAR_SPAN = r.farSpan.toFixed(1);
    const mod = r.shader(ROCK.replaceAll('FAR_SPAN', FAR_SPAN));
    this.pMain = device.createRenderPipeline({
      layout: layout(r.bgl0, r.bglArr2),
      vertex: { module: mod, entryPoint: 'vs', buffers: [MESH, INSTANCE] },
      fragment: { module: mod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const tmod = r.shader(TUMBLER);
    this.pTumbler = device.createRenderPipeline({
      layout: layout(r.bgl0, r.bglArr2),
      vertex: { module: tmod, entryPoint: 'vs', buffers: [MESH, T_INSTANCE] },
      fragment: { module: tmod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const tsh = device.createShaderModule({ code: SHADOW_TUMBLER });
    this.pTumblerShadow = device.createRenderPipeline({
      layout: layout(bglShadow),
      vertex: { module: tsh, entryPoint: 'vs', buffers: [MESH, T_INSTANCE] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
    const sh = device.createShaderModule({ code: SHADOW_ROCK });
    this.pShadow = device.createRenderPipeline({
      layout: layout(bglShadow),
      vertex: { module: sh, entryPoint: 'vs', buffers: [MESH, INSTANCE] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
  }

  // The fine map of the roads round you (the ground's shader draws their edges, ruts and crown from it), made again in the pool's
  // threads once you've gone 40 m. (Not on a phone: its ground has no use for it.)
  followRoads(cam) {
    if (this.lean || this.roadBusy) return;
    const pool = this.r.landPool || this.r.pool;
    if (!pool || Math.hypot(cam.x - this.roadAt[0], cam.z - this.roadAt[1]) < 40) return;
    this.roadBusy = true;
    const cx = Math.round(cam.x), cz = Math.round(cam.z);
    pool.run('roadmap', { opening: this.r.openingEnabled, cx, cz }).then((res) => {
      const { device } = this.r;
      device.queue.writeTexture({ texture: this.r.nearRoad }, res.data, { bytesPerRow: 512 * 4 }, [512, 512]);
      device.queue.writeBuffer(this.r.nearRoadU, 0, new Float32Array([res.x0, res.z0, 1 / 256, 1]));
      this.roadAt = [cx, cz];
    }).catch((e) => console.warn('roadmap', e)).finally(() => { this.roadBusy = false; });
  }

  // Lay the stones and boulders again round the camera, in the pool's threads, if it's gone far enough from where they were laid.
  follow(cam) {
    if (this.busy) return;
    const pool = this.r.landPool || this.r.pool;
    if (!pool) return;
    const ms = Math.hypot(cam.x - this.stoneAt[0], cam.z - this.stoneAt[1]) > RELAY_STONES;
    const mb = Math.hypot(cam.x - this.boulderAt[0], cam.z - this.boulderAt[1]) > RELAY_BOULDERS;
    if (!ms && !mb) return;
    this.busy = true;
    const cx = Math.round(cam.x), cz = Math.round(cam.z);
    pool.run('rocks', { opening: this.r.openingEnabled, cx, cz, sreach: ms ? this.stoneReach : 0, breach: mb ? this.boulderReach : 0 }).then((res) => {
      if (ms) { this.stones = res.stones; this.stoneAt = [cx, cz]; }
      if (mb) { this.boulders = res.boulders; this.boulderAt = [cx, cz]; }
      this.setRocks();
    }).catch((e) => console.warn('rocks', e)).finally(() => { this.busy = false; });
  }

  // Sorted into chunks, and in each chunk by which rock, so a chunk's rocks of one kind are one run to copy.
  setRocks() {
    const byChunk = new Map();
    // Three sets, each as far off as it can still be made out: stones, boulders, and the great ones.
    const add = (data, small) => {
      for (let o = 0; o < data.length; o += ROCK_FLOATS) {
        const v = data[o + 8];
        const set = small ? (v >= REED[0] && v <= TUFT ? 4 : data[o + 3] * data[o + 6] < 0.2 ? 3 : 0) : data[o + 3] * data[o + 6] < 1.3 ? 1 : 2;
        const k = `${set}:${Math.floor(data[o] / CHUNK)},${Math.floor(data[o + 2] / CHUNK)}`;
        let c = byChunk.get(k);
        if (!c) byChunk.set(k, c = { x: (Math.floor(data[o] / CHUNK) + 0.5) * CHUNK, z: (Math.floor(data[o + 2] / CHUNK) + 0.5) * CHUNK, small, set, items: Array.from({ length: VARIANTS }, () => []) });
        // (Which mesh rides in the tone's whole part, for the shader to know what it's drawing.)
        c.items[v].push(data[o], data[o + 1], data[o + 2], data[o + 3], data[o + 4], data[o + 5], data[o + 6], v + Math.min(0.999, data[o + 7]));
      }
    };
    add(this.stones, true);
    add(this.boulders, false);
    let total = 0;
    this.chunks = [...byChunk.values()].map((c) => {
      const runs = c.items.map((a) => new Float32Array(a));
      const n = runs.reduce((m, a) => m + a.length / FLOATS, 0);
      total += n;
      return { x: c.x, z: c.z, small: c.small, set: c.set, runs, n };
    });
    this.r.stats.rocks = total;
    const { device } = this.r;
    for (const L of this.lists) {
      if (L.cap >= total) continue;
      if (L.buf) L.buf.destroy();
      L.cap = Math.ceil(total * 1.25) + 64;
      L.buf = device.createBuffer({ size: L.cap * FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      L.cpu = new Float32Array(L.cap * FLOATS);
    }
    this.dirty = true;
  }

  update(cam, aspect, tanHalf) {
    this.follow(cam);
    this.followRoads(cam);
    if (!this.chunks.length) return;
    const moved = Math.hypot(cam.x - this.lastX, cam.z - this.lastZ) > 1.5;
    const fl = Math.hypot(cam.fx, cam.fz) || 1, fx = cam.fx / fl, fz = cam.fz / fl;
    if (!this.dirty && !moved && fx * this.lastFx + fz * this.lastFz > 0.995) return;
    this.dirty = false;
    this.lastX = cam.x; this.lastZ = cam.z; this.lastFx = fx; this.lastFz = fz;
    const halfAngle = Math.atan(tanHalf * aspect) + 0.25;
    const steep = Math.abs(cam.fy) > 0.5;
    // Which chunks go at which detail.
    const picks = [[], [], []];
    for (const c of this.chunks) {
      const dx = c.x - cam.x, dz = c.z - cam.z, d = Math.hypot(dx, dz);
      if (d > this.reach[c.set] + CHUNK) continue;
      // (Behind you, only the near ones: they throw shadows you can see.)
      if (!steep && d > 30) {
        const off = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
        if (off > halfAngle + Math.asin(Math.min(1, CHUNK / d))) continue;
      }
      const lod = d < NEAR && !this.lean ? 0 : d < MID ? 1 : 2;
      // (Stones are small: a step coarser at any distance.)
      picks[Math.min(2, lod + (c.small && d > 14 ? 1 : 0))].push(c);
    }
    const q = this.r.device.queue;
    picks.forEach((list, lod) => {
      const L = this.lists[lod];
      let o = 0;
      for (let v = 0; v < VARIANTS; v++) {
        const start = o;
        for (const c of list) { const a = c.runs[v]; if (a.length) { L.cpu.set(a, o * FLOATS); o += a.length / FLOATS; } }
        L.runs[v][0] = start; L.runs[v][1] = o - start;
      }
      L.count = o;
      if (o) q.writeBuffer(L.buf, 0, L.cpu, 0, o * FLOATS);
    });
  }

  // The tumblers from the snapshot (src/sim/tumblers.js write), sorted by which rock they are.
  updateTumblers(snap, cam) {
    const per = [[], [], [], [], []];
    for (let i = 0; i < MAX_TUMBLERS; i++) {
      const o = TUMBLERS_START + i * TUMBLER_FLOATS;
      if (!snap[o]) continue;
      if (Math.abs(snap[o + 1] - cam.x) > 200 || Math.abs(snap[o + 3] - cam.z) > 200) continue;
      per[Math.min(4, snap[o + 17] | 0)].push(o);
    }
    let n = 0;
    const f = this.tCpu;
    per.forEach((list, v) => {
      this.tRuns[v][0] = n;
      for (const o of list) {
        const R = snap[o + 4], k = n * T_FLOATS;
        for (let row = 0; row < 3; row++) {
          f[k + row * 4] = snap[o + 8 + row * 3] * R; f[k + row * 4 + 1] = snap[o + 9 + row * 3] * R; f[k + row * 4 + 2] = snap[o + 10 + row * 3] * R;
          f[k + row * 4 + 3] = snap[o + 1 + row];
        }
        f[k + 12] = snap[o + 5]; f[k + 13] = snap[o + 6]; f[k + 14] = snap[o + 7]; f[k + 15] = R;
        n++;
      }
      this.tRuns[v][1] = n - this.tRuns[v][0];
    });
    this.tCount = n;
    if (n) this.r.device.queue.writeBuffer(this.tBuf, 0, f, 0, n * T_FLOATS);
  }

  drawTumblers(pass, shadow) {
    if (!this.tCount) return;
    pass.setPipeline(shadow ? this.pTumblerShadow : this.pTumbler);
    pass.setVertexBuffer(0, this.VB);
    pass.setIndexBuffer(this.IB, 'uint32');
    pass.setVertexBuffer(1, this.tBuf);
    for (let v = 0; v < 5; v++) {
      const [first, n] = this.tRuns[v];
      if (!n) continue;
      const part = v < 4 ? this.parts[v] : this.crowPart;
      pass.drawIndexed(part.count, n, part.first, 0, first);
    }
  }

  draw(mp, bg) {
    if (!this.pMain) return;
    if (!this.chunks.length) { if (this.tCount) { mp.setBindGroup(1, bg); this.drawTumblers(mp, false); } return; }
    mp.setBindGroup(1, bg);
    if (this.pTumbler) this.drawTumblers(mp, false);
    mp.setPipeline(this.pMain);
    mp.setVertexBuffer(0, this.VB);
    mp.setIndexBuffer(this.IB, 'uint32');
    this.lists.forEach((L, lod) => {
      if (!L.count) return;
      mp.setVertexBuffer(1, L.buf);
      for (let v = 0; v < VARIANTS; v++) {
        const [first, n] = L.runs[v];
        if (!n) continue;
        const part = this.parts[lod * VARIANTS + v];
        mp.drawIndexed(part.count, n, part.first, 0, first);
      }
    });
  }

  // Every cascade takes the near rocks; the last takes the middle ring too. (On a phone, only the last.)
  drawShadow(sp, last) {
    if (!this.pShadow || (this.lean && !last)) return;
    this.drawTumblers(sp, true);
    if (!this.chunks.length) return;
    sp.setPipeline(this.pShadow);
    sp.setVertexBuffer(0, this.VB);
    sp.setIndexBuffer(this.IB, 'uint32');
    const lods = last ? [0, 1] : [0];
    for (const lod of lods) {
      const L = this.lists[lod];
      if (!L.count) continue;
      sp.setVertexBuffer(1, L.buf);
      for (let v = 0; v < VARIANTS; v++) {
        const [first, n] = L.runs[v];
        if (!n || v === PUDDLE) continue;
        const part = this.parts[lod * VARIANTS + v];
        sp.drawIndexed(part.count, n, part.first, 0, first);
      }
    }
  }
}
