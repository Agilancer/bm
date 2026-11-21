// The cliffs' skin: the rock of the basin's walls round Phobos and of Castle Velscour's crag, drawn as a mesh of its own over
// the land's (src/gfx/cliffs.js). The land is a grid seen from above, a few metres a cell near you and tens of metres far
// off: a face three hundred metres high over thirty across came out as a smooth curtain, striped down by the grid's own
// cells. This is the same face (src/core/cliffs.js, as src/core/east.js shapes the land), laid in rows up it instead: a row
// at every bed's foot and top, a lip that overhangs at every hard bed's top, the rock bulging out of it here and there, and
// at the top a rim laid back over the high ground. It stands a metre or so proud of the land's own face, so the land is
// never seen through it (and its shader draws it a little nearer the eye the farther off it is, for the land's coarser cells
// out there: materials.js TERRAIN's cliff variant).
//
// Each column of it stands on a foot: where along the wall, which way is in, how the wall leans there; and goes up row by
// row, each row's height and setback the wall's own, till it's past the land's top (the land's own height says where: that's
// the rim), then over onto the land behind. Neighbouring columns are stitched by their rows, so where two start or end on
// different rows the seam still closes.
//
// The Chasm's walls are laid the same way, along the way down it from the Notch to the Sill, each column out from its line;
// as the land there is graded by the way, its rows are put where the land has them when the rock's own shape and the land
// disagree, and a column that has climbed past the middle of a promontory (on the inside of a bend) stops there.
//
// Out: 8 floats a corner: x, y, z, the normal, how open to the sky the rock is there (its hollows and the undersides of
// its lips darker), and which bed it's in (0 to 1, for the bed's colour).
import { fbm, sstep } from './terrain-noise.js';
import { BEDS, bedIndexAt, chasmLie, cumAt, setbackOf, tiltAt } from './cliffs.js';
import { CHASM, CHASM_LEN, CHASM_SILL_S, CRAG, PLAIN, basinEdges, basinWall, chasmAlong, chasmWallNoise, chasmWidth, cragC, cragTop, eastHeight } from './east.js';
import { terrainHeight } from './terrain.js';

// The land's height, as fast as it can be had out here: past the Sill the country's own hills under the east's shapes never
// show (eastHeight's high ground stands over them everywhere: tools checked to within a hair, roads aside), so the east's
// shape alone, but on the ways (the Chasm's causeway, the Approach), which are laid level (src/core/roadbed.js).
const land = (x, z) => (x < 9450 || (x < 10870 && Math.abs(z) < 80) ? terrainHeight(x, z) : eastHeight(x, z, 0));
// (In the Chasm the same, but for the way along its floor, and the Notch, where the country under it still shows.)
const landChasm = (x, z, nearFloor) => (nearFloor || x < 7700 ? terrainHeight(x, z) : eastHeight(x, z, 0));

export const SKIN_FLOATS = 9;

// Every row up a face, by height along the beds (t), the same for every column: [t, kind]. kind: 0 face, 1 a hard bed's
// foot (the back of the ledge under it), 2 under a lip, 3 the lip, 4 a ledge's front, 5 soft.
function rowList(step, lean) {
  const rows = [];
  for (const [t0, t1, , hard] of BEDS) {
    if (t1 < -200 || t0 > 1000) continue;
    const th = t1 - t0;
    if (hard) {
      const body = Math.max(0.5, th - 2.1), n = Math.max(1, Math.ceil(body / step));
      for (let i = 0; i < n; i++) rows.push([t0 + body * i / n, i === 0 ? 1 : 0]);
      if (!lean) rows.push([t1 - 2.1, 2]);
      rows.push([t1 - 0.6, 3]);
    } else {
      const n = Math.max(1, Math.ceil(th / step));
      for (let i = 0; i < n; i++) rows.push([t0 + th * i / n, i === 0 ? 4 : 5]);
    }
  }
  return rows;
}
// How far a row stands out from the land's face (on top of the skin's own inset): a hard bed's top bulges out into a lip that
// overhangs the ledge under it, and the ledge's front is that lip's top.
const PROUD = [0, -0.25, 0.9, 2.1, 1.1, 0];

// Columns: { x, z (the foot), ix, iz (in, level), s (metres along, for its noise), y0 (the foot's height), kind, ... }.
// The basin's walls stand on the line basinEdges draws, north and south; each column goes in along z (as east.js measures
// their setback), but they're spaced by the length of the foot's line, so a bay's curve is as fine as a straight.
function basinColumns(spacing) {
  const cols = [];
  for (const side of [0, 1]) {
    let s = 0, next = 0, px = null, pz = 0;
    for (let x = 8950; x <= 11545; x += 0.5) {
      const [n, so] = basinEdges(x), z = side ? so : -n;
      if (px !== null) s += Math.hypot(x - px, z - pz);
      px = x; pz = z;
      if (s < next) continue;
      next = s + spacing;
      const W = basinWall(x, z + (side ? -1 : 1));
      cols.push({ kind: 'wall', side, x, z, ix: 0, iz: side ? 1 : -1, s: s + side * 5000, y0: W.foot, lie: W.lie });
    }
  }
  return cols;
}
// The crag's, round it from its middle: each column in along the line to the middle, its foot where cragC is 1.06 and its
// top where it's 0.95.
function cragColumns(spacing) {
  const cols = [], R = (CRAG.a + CRAG.b) / 2, n = Math.round(2 * Math.PI * R * 1.06 / spacing);
  const along = (th, c, lo = 0, hi = 1.6 * Math.max(CRAG.a, CRAG.b), n = 24) => {
    // (The distance out along the line at th where cragC is c: it rises outward, so by halving.)
    for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if (cragC(CRAG.x + Math.cos(th) * m, CRAG.z + Math.sin(th) * m) < c) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  for (let i = 0; i < n; i++) {
    const th = i / n * 2 * Math.PI, rf = along(th, 1.06), rt = along(th, 0.95), cx = Math.cos(th), cz = Math.sin(th);
    cols.push({ kind: 'crag', x: CRAG.x + cx * rf, z: CRAG.z + cz * rf, ix: -cx, iz: -cz, s: 20000 + i * spacing, rf, rt, th, along });
  }
  return cols;
}

// The Chasm's: both walls, from the Notch (its line's ninth point) to the Sill, a column every `spacing` metres along the way,
// each going out square to it into the rock.
function chasmColumns(spacing) {
  const cols = [], L = CHASM_LEN;
  let s = L[8];
  for (let i = 8; i + 1 < CHASM.length && s <= CHASM_SILL_S + 20; i++) {
    const a = CHASM[i], b = CHASM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    for (; s < L[i + 1] && s <= CHASM_SILL_S + 20; s += spacing) {
      const u = (s - L[i]) / (L[i + 1] - L[i]), x = a[0] + dx * u, z = a[1] + dz * u, fl = a[2] + (b[2] - a[2]) * u;
      for (const side of [0, 1]) {
        const nx = (side ? -dz : dz) / len, nz = (side ? dx : -dx) / len;
        cols.push({ kind: 'chasm', side, cx: x, cz: z, x, z, ix: nx, iz: nz, s: 40000 + side * 9000 + s, along: s, fl, w: chasmWidth(s), lie: chasmLie(s, side) });
      }
    }
  }
  return cols;
}

// A Chasm column's corners: as columnPoints, but each row put by the rock's shape, then onto the land along the column's
// line where the two disagree (the way's grading near the floor, a bend), and stopped at a promontory's middle.
function chasmPoints(col, rows, caps, spacing) {
  const out = [], tl = tiltAt(col.cx) + col.lie.lift, c0 = cumAt(col.fl + tl), t0 = col.fl + tl;
  const at = (D) => [col.cx + col.ix * D, col.cz + col.iz * D];
  const hAt = (D) => { const [x, z] = at(D); return landChasm(x, z, D < col.w + 3); };
  // (Past a promontory's middle the nearest of the way is suddenly another stretch of it, round the bend: where along it
  // jumps from one row to the next by more than going in that far could move it.)
  const alongAt = (D) => { const [x, z] = at(D); return chasmAlong(x, z); };
  let lastA = col.along, lastAD = 0;
  const passed = (D) => { const a = alongAt(D); return Math.abs(a - lastA) > 24 + 2.5 * Math.abs(D - lastAD); };
  out.push({ p: [col.cx + col.ix * (col.w - 3), col.fl - 7, col.cz + col.iz * (col.w - 3)], t: t0 - 7, kind: 0, key: -1, ok: 'buried' });
  let prevD = Math.max(0, col.w - 2), prev = null;
  for (let r = 0; r < rows.length; r++) {
    const [t, kind] = rows[r];
    if (t <= t0 + 0.3) continue;
    const y = t - tl, d = setbackOf(cumAt(t) - c0, col.lie);
    let D = col.w + d;
    for (let k = 0; k < 3; k++) { const [x, z] = at(D); D = col.w + d - chasmWallNoise(x, z, D - col.w); }
    D = Math.max(D, prevD);
    let h = hAt(D);
    if (Math.abs(h - y) >= 0.7) {
      // (Onto the land: between the last row's place, under this height, and thirty metres on, over it.)
      let lo = prevD, hi = D + 30;
      if (hAt(lo) > y) { D = lo; }
      else if (hAt(hi) < y) {
        // Past the top: the rim's the highest of the land just past the last row, and over onto it from there.
        if (prev) {
          let best = prevD, top = hAt(prevD);
          for (let e = prevD + 2; e <= prevD + 40; e += 2) { const q = hAt(e); if (q > top + 0.05) { top = q; best = e; } }
          if (best > prevD + 0.5 && !passed(best)) { const [x, z] = at(best); out.push({ p: [x, top, z], t: top + tl, kind: 3, key: r - 0.5, ok: true, rim: true }); }
          const [rx, rz] = at(best);
          caps.forEach((w, i) => {
            const x = rx + col.ix * w, z = rz + col.iz * w;
            if (passed(best + w)) return;
            out.push({ p: [x, landChasm(x, z, false) + (i === caps.length - 1 ? -0.4 : 0.22), z], t: top + tl, kind: 6, key: 1e5 + i, ok: true, cap: true });
          });
        }
        break;
      } else {
        for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (hAt(m) < y) lo = m; else hi = m; }
        D = (lo + hi) / 2;
      }
      h = hAt(D);
    }
    // (Stopped, too, where it's gone in further than the walls ever stand back from the floor, or where the land had this row
    // far further in than the last: past the fold of a bend's inside, onto some other face. The land carries on from there.)
    if (passed(D)) {
      // (Up to the fold itself, though: the skin from either side meets along the promontory's crest, and the land's own
      // cells, which cut that knife-edge into teeth against the sky, stand behind it.)
      let lo = lastAD, hi = D;
      for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; if (Math.abs(alongAt(m) - lastA) > 24 + 2.5 * Math.abs(m - lastAD)) hi = m; else lo = m; }
      // (But only a short way on, a row's height or so: run far up the land's own slope to a crest well above, the sheet lay
      // along that slope, in and out of it, and drew as a striped ghost over the rock.)
      const hy = hAt(lo), py = prev ? prev.p[1] : col.fl;
      if (lo > lastAD + 0.5 && lo < lastAD + 9 && hy > py && hy < py + 9) {
        const [x, z] = at(lo);
        out.push({ p: [x, hy, z], t: hy + tl, kind: 3, key: r - 0.5, ok: true, ridge: true });
        col.cut = 'ridge';
      } else col.cut = true;
      break;
    }
    // (A hundred and eighty metres back: the walls are two hundred and more high, and stopped at seventy a third of them
    // left their tops to the land's own cells, which draw a sheer face as a staircase of ribs, saw teeth at the rim.)
    if (D - col.w > 180 || (prev && D - prevD > 24)) { col.cut = true; if (globalThis.__cutStats) { const k = D - col.w > 180 ? 'far' : 'jump'; globalThis.__cutStats[k] = (globalThis.__cutStats[k] || 0) + 1; } break; }
    lastA = alongAt(D); lastAD = D;
    const [x, z] = at(D);
    const pt = { p: [x, y, z], t, kind, key: r, ok: Math.abs(h - y) < 0.7 ? true : h > y ? 'buried' : 'air' };
    if (pt.ok === 'air') break;
    out.push(pt);
    prev = pt; prevD = D;
  }
  return out;
}

// Which bed starts at or just under t (a row on a join is in the bed over it).
function bedAbove(t) {
  let lo = 0, hi = BEDS.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (BEDS[m][0] <= t + 0.05) lo = m; else hi = m - 1; }
  return lo;
}

// One column's corners, bottom up: [{ p: [x, y, z], t, kind, key, ok }]. ok: on the land's face (true), under it ('buried')
// or over it ('air').
function columnPoints(col, rows, caps) {
  const out = [], tl = tiltAt(col.x) + (col.lie?.lift || 0);
  let place;
  if (col.kind === 'wall') {
    const c0 = cumAt(col.y0 + tl);
    place = (t) => { const d = setbackOf(cumAt(t) - c0, col.lie); return [col.x + col.ix * d, t - tl, col.z + col.iz * d]; };
  } else {
    // (Up the crag: each row where the land itself has that height along the column's line, in from its foot. The crag's top
    // isn't one height (its three wards' terraces, each stepping down its face), and the basin's talus is heaped against
    // its foot in the slots either side: by its own shape alone its rows stood off the land, or under it, in tatters.)
    const cx = Math.cos(col.th), cz = Math.sin(col.th), lo0 = col.rt - 12, hi0 = col.rf + 12;
    const pt = (r) => [CRAG.x + cx * r, CRAG.z + cz * r];
    place = (t) => {
      const y = t - tl;
      let lo = lo0, hi = hi0;
      { const [x, z] = pt(lo); if (land(x, z) < y) return [x, y, z]; }
      { const [x, z] = pt(hi); if (land(x, z) > y) return [x, y, z]; }
      for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2, [x, z] = pt(m); if (land(x, z) > y) lo = m; else hi = m; }
      const [x, z] = pt((lo + hi) / 2);
      return [x, y, z];
    };
    col.y0 = PLAIN;
  }
  const t0 = col.y0 + tl;
  const judge = (p) => { const h = land(p[0], p[2]); return Math.abs(h - p[1]) < 0.7 ? true : h > p[1] ? 'buried' : 'air'; };
  // A first corner sunk under the talus, a little out from the foot, so the skin goes into the ground.
  out.push({ p: [col.x - col.ix * 2, col.y0 - 7, col.z - col.iz * 2], t: t0 - 7, kind: 0, key: -1, ok: 'buried' });
  let prev = null;
  for (let r = 0; r < rows.length; r++) {
    const [t, kind] = rows[r];
    if (t <= t0 + 0.2) continue;
    const p = place(t), ok = judge(p);
    if (ok === 'air') {
      // Past the land's top: the rim's between this row and the last, where the face meets the land.
      if (prev && prev.ok !== 'air') {
        let lo = prev.t, hi = t;
        for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2, q = place(m); if (land(q[0], q[2]) >= q[1] - 0.05) lo = m; else hi = m; }
        const q = place(lo);
        out.push({ p: q, t: lo, kind: 3, key: r - 0.5, ok: true, rim: true });
        // And over onto the land behind it, a little proud of it, sinking into it at the back.
        caps.forEach((w, i) => {
          const x = q[0] + col.ix * w, z = q[2] + col.iz * w;
          out.push({ p: [x, land(x, z) + (i === caps.length - 1 ? -0.4 : 0.22), z], t: lo, kind: 6, key: 1e5 + i, ok: true, cap: true });
        });
      }
      break;
    }
    const pt = { p, t, kind, key: r, ok };
    out.push(pt);
    prev = pt;
  }
  return out;
}

// Two columns' corners, stitched up between them by their keys: triangles [a, b, c] as indices.
function stitch(A, B, ia, ib, tris, group) {
  let i = 0, j = 0;
  while (i < A.length - 1 || j < B.length - 1) {
    const stepA = i < A.length - 1 && (j >= B.length - 1 || A[i + 1].key <= B[j + 1].key);
    if (stepA) { tris.push(Object.assign([ia + i, ib + j, ia + i + 1], { group })); i++; }
    else { tris.push(Object.assign([ia + i, ib + j, ib + j + 1], { group })); j++; }
  }
}

export function buildCliffSkin({ lean = false } = {}) {
  const spacing = lean ? 9 : 4.5, step = lean ? 10 : 6, caps = lean ? [7, 20, 42] : [4, 11, 22];
  const rows = rowList(step, lean);
  const runs = [{ cols: basinColumns(spacing), closed: false }, { cols: cragColumns(spacing), closed: true }, { cols: chasmColumns(spacing), closed: false, pair: true }];
  const P = [], meta = [], tris = [];
  for (const run of runs) {
    const cols = run.cols.map((c) => (c.kind === 'chasm' ? chasmPoints(c, rows, caps, spacing) : columnPoints(c, rows, caps)));
    // (A Chasm column cut short at a promontory's middle stands no higher than its neighbours' tops and a few metres: cut
    // one by one, their tops were a saw's teeth against the sky.)
    if (run.pair) {
      const topOf = (pts) => pts.reduce((m, q) => (q.cap ? m : Math.max(m, q.p[1])), -Infinity);
      const tops = cols.map(topOf);
      for (let pass = 0; pass < 4; pass++) {
        for (let k = 0; k < cols.length; k++) {
          if (run.cols[k].cut !== true) continue;
          let lim = Infinity;
          for (const j of [k - 4, k - 2, k + 2, k + 4]) if (j >= 0 && j < cols.length) lim = Math.min(lim, tops[j] + 6 * Math.abs(j - k) / 2);
          if (tops[k] > lim) tops[k] = lim;
        }
      }
      cols.forEach((pts, k) => { if (run.cols[k].cut === true) cols[k] = pts.filter((q) => !q.cap && q.p[1] <= tops[k] + 0.01); });
    }
    const base = [];
    cols.forEach((pts, k) => { run.cols[k].top = pts.reduce((m, q) => (q.cap ? m : Math.max(m, q.p[1])), -Infinity); });
    cols.forEach((pts, k) => { base.push(P.length); for (const q of pts) { P.push(q.p); meta.push({ ...q, col: run.cols[k] }); } });
    for (let k = 0; k + 1 < cols.length + (run.closed ? 1 : 0); k++) {
      // (The Chasm's columns come in pairs, one either side: each stitched to the next on its own side.)
      const k2 = run.pair ? k + 2 : (k + 1) % cols.length;
      if (k2 >= cols.length) continue;
      // (The basin's north wall and its south are one list: never stitch the one's last to the other's first.)
      if (run.cols[k].side !== run.cols[k2].side) continue;
      stitch(cols[k], cols[k2], base[k], base[k2], tris, run.pair ? `chasm${run.cols[k].side}` : null);
    }
  }
  // Keep the triangles on the face: none with a corner in the air (past the rim, or where the land's been cut away from the
  // face: the Chasm's mouth, the Approach), none wholly buried.
  let keep = tris.filter((t) => t.every((i) => meta[i].ok !== 'air') && !t.every((i) => meta[i].ok === 'buried'));
  // Wound to face out (and up).
  const facing = (t) => {
    const [a, b, c] = t.map((i) => P[i]), col = meta[t[0]].col;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    return -(nx * col.ix + nz * col.iz) + 0.4 * ny;
  };
  // (Save on the inside of the Chasm's sharp bends, where its columns, each square to the way, cross one another before
  // they reach the bend's middle: there the skin, stitched in order along the way, is folded back over itself, sheet
  // through sheet, which drew as a striped ghost over the wall. Stitched the same way all down a side, the skin's faces
  // all come out wound the one way but the folded ones: those are left out, and the land's own wall stands there.)
  const vote = {};
  for (const t of keep) if (t.group) vote[t.group] = (vote[t.group] || 0) + Math.sign(facing(t));
  keep = keep.filter((t) => !t.group || Math.sign(facing(t)) === Math.sign(vote[t.group]));
  // (Nor, in the Chasm, a long thin one, stretched between two columns whose rows the land put far apart: they stood as
  // flat slabs and blades across its walls. The land's own face is under them.)
  keep = keep.filter((t) => {
    if (!t.group) return true;
    const [a, b, c] = t.map((i) => P[i]);
    const e = [[a, b], [b, c], [c, a]].map(([u, v]) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]));
    const L = Math.max(...e), s = (e[0] + e[1] + e[2]) / 2, area = Math.sqrt(Math.max(0, s * (s - e[0]) * (s - e[1]) * (s - e[2])));
    return !(L > 14 && (L * L) / (2 * area + 1e-6) > 5);
  });
  for (const t of keep) if (facing(t) < 0) { const s = t[1]; t[1] = t[2]; t[2] = s; }
  const normals = () => {
    const N = P.map(() => [0, 0, 0]);
    for (const t of keep) {
      const [a, b, c] = t.map((i) => P[i]);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      for (const i of t) { N[i][0] += n[0]; N[i][1] += n[1]; N[i][2] += n[2]; }
    }
    return N.map((n) => { const l = Math.hypot(...n) || 1; return [n[0] / l, n[1] / l, n[2] / l]; });
  };
  // Stood proud of the land's face: an inset all over, the rock bulging out of it in places, the lips.
  let N = normals();
  // (And each hard bed split by its joints into blocks, eight to twenty-five metres along, each standing out or set back its
  // own metre or three, an odd one fallen: never one smooth band, nor all its blocks standing out together.)
  const jh = (a, b) => { const v = Math.sin(a * 91.3 + b * 47.7 + 13.1) * 43758.5453; return v - Math.floor(v); };
  const bulge = meta.map((q) => {
    if (q.cap || q.ridge) return 0;
    const b = bedIndexAt(q.t), hard = BEDS[b][3] && q.kind <= 3;
    let out = 1.6 * Math.max(0, fbm(q.col.s / 13 + 3.1, q.p[1] / 9 + 0.7, 3) - 0.28);
    if (hard) {
      const len = 8 + 17 * jh(b, 1), blk = Math.floor((q.col.s + 40 * jh(b, 2)) / len), r = jh(b, blk);
      out += r < 0.12 ? -0.6 : 3.4 * Math.pow(r, 1.6);
    }
    return out;
  });
  P.forEach((p, i) => {
    const q = meta[i];
    if (q.cap) return;
    // (The rim itself and the rock just under it hardly stood out: a lip there, and blocks jutting under it, made blades of
    // the Chasm's rims against the sky.)
    const top = q.col.top - q.p[1], tk = q.rim ? 0 : Math.min(1, Math.max(0, top / 8));
    const out = q.ridge || q.rim ? 0.45 : 1.05 + (bulge[i] + PROUD[q.kind] * (q.kind === 6 ? 0 : 1)) * tk;
    // (Out along the normal, but never down into the ledge under it: a lip's underside faces down.)
    const n = N[i], h = Math.hypot(n[0], n[2]) || 1, lv = Math.max(0, n[1]);
    p[0] += (n[0] / h) * out * (1 - lv * 0.5); p[2] += (n[2] / h) * out * (1 - lv * 0.5);
    p[1] += lv * out * 0.5;
  });
  N = normals();
  // How open to the sky: hollows (no bulge) darker, the back of a ledge under the next cliff darker, a lip's underside dark,
  // the lip's edge lit.
  const verts = new Float32Array(P.length * SKIN_FLOATS);
  P.forEach((p, i) => {
    const q = meta[i], n = N[i];
    let open = 0.74 + 0.025 * bulge[i] + [0, -0.34, -0.5, 0.08, 0.14, 0.02, 0.05][q.kind] - 0.35 * Math.max(0, -n[1]);
    if (q.ok === 'buried') open -= 0.15;
    const o = i * SKIN_FLOATS;
    verts[o] = p[0]; verts[o + 1] = p[1]; verts[o + 2] = p[2];
    verts[o + 3] = n[0]; verts[o + 4] = n[1]; verts[o + 5] = n[2];
    verts[o + 6] = Math.min(1.1, Math.max(0.2, open));
    // (The bed of the band of the face just over this corner: the rows are laid on the beds' joins, so each band of
    // triangles lies in one bed, and the GPU takes the value from a triangle's first corner, its lowest, unblended. Blended
    // corner to corner, a hash's in-betweens drew as stripes and nested chevrons: the critics' "ghost".)
    const bb = bedAbove(q.t);
    verts[o + 7] = BEDS[bb][4] * (BEDS[bb][3] ? 1 : -1);
    // (How much it's the rock's: all of it on the face, going into the land's own ground over the caps behind the rim, so
    // no strip of rock lies along every cliff's top.)
    verts[o + 8] = q.cap ? [0.55, 0.18, 0][Math.min(2, q.key - 1e5)] : 1;
  });
  const idx = new Uint32Array(keep.length * 3);
  keep.forEach((t, k) => { idx[k * 3] = t[0]; idx[k * 3 + 1] = t[1]; idx[k * 3 + 2] = t[2]; });
  return { verts, idx };
}
