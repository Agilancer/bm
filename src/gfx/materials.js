// WGSL for everything drawn in the world pass.
import { COMMON } from './shaders.js';
import { CHURCH_SITE, CHURCH_Z } from '../core/church.js';
import { CRAG } from '../core/east.js';
import { SITES } from '../core/lands.js';
import { terrainHeight } from '../core/terrain.js';
import { RD_CELL, RD_HALF, RD_MAX, RD_N, RD_NX } from '../core/roads.js';

// Where the ground is known to a building's foot without a map of it: each place's levelled pad (src/core/lands.js SITES,
// levelled to its own middle's height), and the town's houses, which all stand at the land's 0 to 0.1. [x, z, radius,
// height], for the damp and the splashed dirt at the foot of a wall (STATIC). A pad the land doesn't keep level (a few,
// where hills come in over its edge) is left out; anywhere else a wall has no damp band.
const GROUNDS = (() => {
  const g = [[20, 0, 78, 0.06]];
  for (const s of Object.values(SITES)) {
    if (!s.pad) continue;
    const y = terrainHeight(s.x, s.z);
    let off = 0;
    for (let a = 0; a < 16; a++) off = Math.max(off, Math.abs(terrainHeight(s.x + Math.cos(a) * s.pad * 0.9, s.z + Math.sin(a) * s.pad * 0.9) - y));
    if (off < 0.25) g.push([s.x, s.z, s.pad * 0.95, y]);
  }
  return g;
})();
const f1 = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(+v.toFixed(3)));
const GROUND_WGSL = /* wgsl */ `
const GROUNDS = array<vec4f, ${GROUNDS.length}>(${GROUNDS.map((g) => `vec4f(${g.map(f1).join(', ')})`).join(', ')});
// The ground's height under p, where it's known; else far below.
fn groundUnder(p: vec3f) -> f32 {
  if (p.x > ${f1(CHURCH_SITE.x0)} && p.x < ${f1(CHURCH_SITE.x1)} && abs(p.z - ${f1(CHURCH_SITE.z)}) < ${f1(CHURCH_SITE.hz)}) { return ${f1(CHURCH_SITE.y)}; }
  for (var i = 0; i < ${GROUNDS.length}; i++) {
    let G = GROUNDS[i]; let d = p.xz - G.xy;
    if (dot(d, d) < G.z * G.z) { return G.w; }
  }
  return -1e6;
}
`;

export const TERRAIN = COMMON + /* wgsl */ `
@group(1) @binding(0) var groundColor: texture_2d_array<f32>;
@group(1) @binding(1) var groundDetail: texture_2d_array<f32>;
@group(1) @binding(2) var farMap: texture_2d<f32>;
@group(1) @binding(3) var farTint: texture_2d<f32>;
@group(1) @binding(4) var farKind: texture_2d<f32>;
// Every road and path in the land (src/core/roads.js roadSegments): per 64 m square its first stretch and how many, then the
// lists; and each stretch as two vec4: (ax, az, bx, bz), (half-width, what it's laid with, how far along its way a is, length).
@group(1) @binding(5) var<storage, read> roadIdx: array<u32>;
@group(1) @binding(6) var<storage, read> roadSeg: array<vec4f>;
const RD_HALF = ${RD_HALF.toFixed(1)}; const RD_CELL = ${RD_CELL.toFixed(1)}; const RD_N = ${RD_N}; const RD_NX = ${RD_NX}; const RD_MAX = ${RD_MAX}u;

// The nearest way to q: how far outside its edge (less than nothing: on it), its half-width, what it's laid with, how far
// along and across it q is, and which way it runs.
struct RoadHit { e: f32, w: f32, kind: f32, along: f32, across: f32, dir: vec2f };
fn roadAt(q: vec2f) -> RoadHit {
  var h = RoadHit(99.0, 0.0, 0.0, 0.0, 0.0, vec2f(1.0, 0.0));
  let c = vec2i(floor((q + RD_HALF) / RD_CELL));
  if (c.x < 0 || c.y < 0 || c.x >= RD_NX || c.y >= RD_N) { return h; }
  let k = u32(c.y * RD_NX + c.x) * 2u;
  let first = roadIdx[k];
  let n = min(roadIdx[k + 1u], RD_MAX);
  for (var i = 0u; i < n; i++) {
    let s = roadIdx[first + i] * 2u;
    let A = roadSeg[s]; let B = roadSeg[s + 1u];
    let ab = A.zw - A.xy; let ap = q - A.xy;
    let t = clamp(dot(ap, ab) / (B.w * B.w), 0.0, 1.0);
    let e = length(ap - ab * t) - B.x;
    if (e < h.e) {
      let dir = ab / B.w;
      h = RoadHit(e, B.x, B.y, B.z + t * B.w, dir.x * ap.y - dir.y * ap.x, dir);
    }
  }
  return h;
}

struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) viewZ: f32 };
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f) -> V {
  var o: V;
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.p = p; o.n = n;
  o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  return o;
}

fn rot(p: vec2f, a: f32) -> vec2f { let c = cos(a); let s = sin(a); return vec2f(c * p.x - s * p.y, s * p.x + c * p.y); }

// A ground painting laid without its repeat (on a PC). The land is cut into patches along the contours of a slow noise (k,
// 0 to 1, read once for here); each patch has its own copy of the painting, slid its own way, and where two patches meet
// the copy that stands higher there (by the painting's own height, each lifted by how far into its patch this is) shows,
// over an edge a few hundredths of the height wide: so a join runs round a stone or a tussock, the way a stone in one
// copy lies on the other, and never fades one painting through the other (a cross-fade ghosted the flagstones' joints and
// greyed the grass: the critics). What blending there is keeps the painting's contrast: the two are mixed about the
// painting's own mean and the mix scaled back up by how much it would have lost. One copy alone where a patch is whole,
// so the second read is only paid along the joins. slide: which ways a copy may be slid (setts and flags only along
// their way, or their rows break). (The owner: the same tile over and over on the ground, the houses and the castles.)
struct GS { c: vec4f, d: vec4f };
fn hash2(i: f32) -> vec2f { return fract(sin(vec2f(12.9898, 78.233) * i + vec2f(0.0, i * 0.37)) * 43758.5453); }
fn keepContrast(a: vec4f, b: vec4f, w: f32, mean: vec4f) -> vec4f {
  return mean + (mix(a, b, w) - mean) / sqrt(w * w + (1.0 - w) * (1.0 - w));
}
fn untile(l: i32, uv: vec2f, dx: vec2f, dy: vec2f, k: f32, slide: vec2f) -> GS {
  let s = k * 7.0 + f32(l) * 0.618;
  let i = floor(s);
  let t = clamp((fract(s) - 0.2) / 0.6, 0.0, 1.0);
  var a = GS(vec4f(0.0), vec4f(0.5, 0.5, 0.9, 0.5)); var b = a;
  if (t < 1.0) {
    let o = hash2(i) * slide;
    a = GS(textureSampleGrad(groundColor, repeatSmp, uv + o, l, dx, dy), textureSampleGrad(groundDetail, repeatSmp, uv + o, l, dx, dy));
  }
  if (t <= 0.0) { return a; }
  let o = hash2(i + 1.0) * slide;
  b = GS(textureSampleGrad(groundColor, repeatSmp, uv + o, l, dx, dy), textureSampleGrad(groundDetail, repeatSmp, uv + o, l, dx, dy));
  if (t >= 1.0) { return b; }
  let w = smoothstep(-0.07, 0.07, (b.d.a + t * 1.25) - (a.d.a + (1.0 - t) * 1.25));
  let mean = textureSampleLevel(groundColor, repeatSmp, uv, l, 12.0);
  return GS(keepContrast(a.c, b.c, w, mean), mix(a.d, b.d, w));
}
// (The same for a painting whose colour alone is wanted: its light stands for its height.)
fn untileC(l: i32, uv: vec2f, dx: vec2f, dy: vec2f, k: f32) -> vec4f {
  let s = k * 7.0 + f32(l) * 0.618;
  let i = floor(s);
  let t = clamp((fract(s) - 0.2) / 0.6, 0.0, 1.0);
  var a = vec4f(0.0);
  if (t < 1.0) { a = textureSampleGrad(groundColor, repeatSmp, uv + hash2(i), l, dx, dy); }
  if (t <= 0.0) { return a; }
  let b = textureSampleGrad(groundColor, repeatSmp, uv + hash2(i + 1.0), l, dx, dy);
  if (t >= 1.0) { return b; }
  let la = sqrt(dot(a.rgb, vec3f(0.3, 0.6, 0.1))); let lb = sqrt(dot(b.rgb, vec3f(0.3, 0.6, 0.1)));
  let w = smoothstep(-0.06, 0.06, (lb + t * 1.1) - (la + (1.0 - t) * 1.1));
  return keepContrast(a, b, w, textureSampleLevel(groundColor, repeatSmp, uv, l, 12.0));
}

@fragment fn fs(in: V) -> Out {
  let p = in.p;
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  var gmUv = (p.xz - F.ground.xy) * F.ground.z;
  let gm = textureSampleLevel(groundMap, clampSmp, gmUv, 0.0);
  let inMap = step(0.0, gmUv.x) * step(gmUv.x, 1.0) * step(0.0, gmUv.y) * step(gmUv.y, 1.0);
  // Past the fine map of the village there's a coarse one of all the land: the roads, and where the pines stand.
  let fuv = (p.xz - FAR_ORG) / FAR_SPAN;
  let fm = textureSampleLevel(farMap, clampSmp, fuv, 0.0);
  // The far countries (src/core/lands.js): their tint and wet, snow on the heights, rock on the steeps.
  let ft = textureSampleLevel(farTint, clampSmp, fuv, 0.0);
  let fk = textureSampleLevel(farKind, clampSmp, fuv, 0.0);
  let macro2 = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.043 + 0.31, 0.0);
  // The roads and paths, wherever they are (src/core/roads.js): a hard edge, ragged on the earth ones and near straight on the
  // paved; how far across the way this is, for its ruts and crown; and what it's laid with. A far way is drawn a little wider,
  // so it still reads from a hilltop as a line across the land.
  let rh = roadAt(p.xz);
  let grow = clamp((dist - 40.0) * 0.004, 0.0, 2.2);
  let paved = rh.kind > 0.5 && rh.kind < 2.5;
  let wob = ((macro2.a - 0.5) * 0.8 + (textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.9, 0.0).r - 0.5) * 0.5) * select(1.0, 0.3, paved);
  let soft = 0.14 + dist * 0.0022;
  let roadIn = (1.0 - smoothstep(-soft, soft, rh.e - grow + wob)) * step(0.2, rh.w);
  let pave = roadIn * step(0.5, rh.kind);
  let dc = abs(rh.across); let rw = rh.w; let nearIn = 1.0;
  let dirtBase = max(mix(fm.r, gm.r, inMap), roadIn * select(1.0, 0.75, rh.kind > 0.5));
  // (The worn rim just outside a way's edge.)
  let verge = (1.0 - smoothstep(0.0, 1.4 + grow, rh.e - grow + wob)) * (1.0 - roadIn) * step(0.2, rh.w);
  let dpx = dpdx(p.xz); let dpy = dpdy(p.xz);
  let steep = 1.0 - in.n.y;

  let uvA = p.xz * 0.2;
  // The Tripo grounds (tools/world/build_ground.py), on a scale and turn of their own: the road's gravel, snow, stone, forest floor.
  let uvC = rot(p.xz, 0.6) * 0.17 + 0.11;
  let dxC = dpdx(uvC); let dyC = dpdy(uvC);
  // Stone on a steep face is painted on the face, not stretched down it from above: from the side it faces most, the two
  // sides blended by how much it faces each (picking one smeared a face that turned between them).
  let sideX = p.zy * vec2f(0.13, -0.13); let sideZ = p.xy * vec2f(0.13, -0.13);
  let dxSX = dpdx(sideX); let dySX = dpdy(sideX); let dxSZ = dpdx(sideZ); let dySZ = dpdy(sideZ);
  let nx4 = pow(abs(in.n.x), 4.0); let nz4 = pow(abs(in.n.z), 4.0);
  let faceX = nx4 / max(nx4 + nz4, 1e-6);
  // Roads: worn gravel and set stones wherever the ground's trodden hard. Rock: on the steeps and the far map's bare ground.
  let roadAmt = smoothstep(0.42, 0.78, dirtBase + (macro2.g - 0.5) * 0.25);
  let rock0 = max(fm.a, smoothstep(0.2, 0.42, steep));
  let rockAmt = rock0 * smoothstep(0.1, 0.4, rock0 + (macro2.b - 0.5) * 0.3) * (1.0 - roadAmt * 0.8);
  let snowAmt = smoothstep(0.25, 0.6, fm.b + (macro2.r - 0.5) * 0.3) * smoothstep(0.55, 0.8, in.n.y) * (1.0 - 0.7 * roadIn);
  var grassCol: vec4f; var grassDet: vec4f; var dirtCol: vec4f; var dirtDet: vec4f;
  var rockCol = vec3f(0.0); var rockDet = vec4f(0.5, 0.5, 0.9, 0.5); var haveRock = false;
  var snowTex = vec4f(0.0); var haveSnow = false;
  var floorCol = vec3f(0.0); var haveFloor = false;
  var fenCol = vec3f(0.0); var ashCol = vec3f(0.0);
  var paveCol = vec3f(0.0); var paveDet = vec4f(0.5, 0.5, 0.9, 0.5);
  if (LEAN) {
    // One painting of each ground and one detail map on a phone (the paintings nearest the average of their kind, and
    // the relief of whichever ground this mostly is): the ground covers half the screen, so these three reads in place of
    // eight are the biggest saving in the frame. (Where it's mostly road, the road's gravel in place of the dirt: no extra read.)
    // (Its repeat bent out of line by a slow warp, a couple of metres either way over some tens: no grid to see, for one
    // more read of the small noise and none of the paintings.)
    let uvL = uvA + (textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.011 + vec2f(0.57, 0.19), 3.0).rg - 0.5) * 1.1;
    grassCol = textureSample(groundColor, repeatSmp, uvL, 5);
    // The patchwork the other paintings gave: warmer and cooler stretches, and dry ones.
    grassCol = vec4f(grassCol.rgb * mix(vec3f(1.2, 1.02, 0.85), vec3f(0.88, 1.0, 1.08), smoothstep(0.3, 0.7, macro2.g)), grassCol.a);
    grassCol = vec4f(mix(grassCol.rgb, vec3f(0.24, 0.2, 0.09), smoothstep(0.52, 0.78, macro2.r) * 0.38), grassCol.a);
    // (On a laid way, its own ground in the dirt's place: still the one read.)
    dirtCol = textureSample(groundColor, repeatSmp, uvL, select(select(1, 6, dirtBase > 0.5), 17 + i32(rh.kind + 0.5), pave > 0.3));
    grassDet = textureSample(groundDetail, repeatSmp, uvL, select(3, 1, dirtBase > 0.5));
    dirtDet = vec4f(grassDet.rgb, 1.0 - grassDet.a);
  } else {
    let macro1 = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.0071, 0.0);
    // Two scales and a rotation on each ground type, so the paintings never read as a grid.
    let uvB = rot(p.xz, 1.1) * 0.13 + 0.37;
    let dxA = dpdx(uvA); let dyA = dpdy(uvA);
    let dxB = dpdx(uvB); let dyB = dpdy(uvB);
    let gPick = macro1.g * 3.0;
    let g0 = i32(floor(gPick)) % 3;
    let g1 = (g0 + 1) % 3;
    let gFade = smoothstep(0.3, 0.7, fract(gPick));
    let dPick = macro1.r * 3.0;
    let d0 = i32(floor(dPick)) % 3;
    let d1 = (d0 + 1) % 3;
    let dFade = smoothstep(0.3, 0.7, fract(dPick));
    // (And each of those laid without its own repeat: untile(). Its patches, from a noise of their own.)
    let kU = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.021 + vec2f(0.23, 0.61), 0.0);
    let free = vec2f(1.0);
    var ga = GS(vec4f(0.0), vec4f(0.5)); var gb = ga; var da = ga; var db = ga;
    if (gFade < 1.0) { ga = untile(3 + g0, uvA, dxA, dyA, kU.r, free); }
    if (gFade > 0.0) { gb = untile(3 + g1, uvB, dxB, dyB, kU.g, free); }
    if (dFade < 1.0) { da = untile(d0, uvB, dxB, dyB, kU.b, free); }
    if (dFade > 0.0) { db = untile(d1, uvA, dxA, dyA, kU.a, free); }
    grassCol = mix(ga.c, gb.c, gFade); grassDet = mix(ga.d, gb.d, gFade);
    dirtCol = mix(da.c, db.c, dFade); dirtDet = mix(da.d, db.d, dFade);
    // The road's own gravel and stones over the dirt.
    if (roadAmt > 0.002) {
      let r = untile(6, uvC, dxC, dyC, kU.g, free);
      dirtCol = mix(dirtCol, r.c, roadAmt);
      dirtDet = mix(dirtDet, r.d, roadAmt);
    }
    // Which stone: grey granite round the town, black basalt in the Ashen Waste and on the Sorrowhorn, rust-red in the Rustwood,
    // pale limestone on the Downs and the moor, frost-split where the snow lies. Picked per spot with a little noise, so where two
    // countries meet their stones come in clumps rather than along a line.
    if (rockAmt > 0.002) {
      let j = macro1.b - 0.5;
      var layer = 9;
      var bw = max(0.0, 1.0 - fk.r - fk.g - fk.b - fk.a) + j * 0.5;
      if (fk.r + fk.a - j * 0.4 > bw) { layer = 11; bw = fk.r + fk.a - j * 0.4; }
      if (fk.g + j * 0.3 > bw) { layer = 17; bw = fk.g + j * 0.3; }
      if (fk.b - j * 0.35 > bw) { layer = 12; bw = fk.b - j * 0.35; }
      if (fm.b + j * 0.3 > max(bw, 0.35)) { layer = 10; }
      let top = untile(layer, uvC * 0.8, dxC * 0.8, dyC * 0.8, kU.r, free);
      // (A face's patches by its own noise, read across the face: the land's from above would smear down a cliff. Only
      // what's steep is a face: on a gentle slope the side's painting is stretched, and a little of it was a smear.)
      let topW = smoothstep(0.45, 0.75, in.n.y);
      var face = top.c;
      if (topW < 1.0) {
        var fs = vec4f(0.0); var fw = 0.0;
        if (faceX > 0.03) { fs += untileC(layer, sideX, dxSX, dySX, textureSampleLevel(noiseTex, repeatSmp, sideX * 0.16 + vec2f(0.47, 0.13), 0.0).b) * faceX; fw += faceX; }
        if (faceX < 0.97) { fs += untileC(layer, sideZ, dxSZ, dySZ, textureSampleLevel(noiseTex, repeatSmp, sideZ * 0.16 + vec2f(0.47, 0.13), 0.0).b) * (1.0 - faceX); fw += 1.0 - faceX; }
        face = fs / fw;
      }
      rockCol = mix(face.rgb, top.c.rgb, topW);
      rockDet = top.d;
      haveRock = true;
    }
    // Snow with its own drifts, and stones breaking through it where it's thin or the ground steepens.
    if (snowAmt > 0.002) {
      let sn = untileC(7, uvC * 0.7, dxC * 0.7, dyC * 0.7, kU.b);
      let sr = untileC(8, uvC * 0.9, dxC * 0.9, dyC * 0.9, kU.a);
      let stony = max(smoothstep(0.58, 0.8, macro1.a + (macro2.a - 0.5) * 0.25), smoothstep(0.12, 0.3, steep)) * smoothstep(0.95, 0.5, snowAmt * 0.75);
      snowTex = vec4f(mix(sn.rgb, sr.rgb, stony), stony);
      haveSnow = true;
    }
    // A laid way's own ground: setts, flags and planks laid square to it, the rest by the land's own turn.
    if (pave > 0.002) {
      let layer = 17 + i32(rh.kind + 0.5);
      let nrm = vec2f(-rh.dir.y, rh.dir.x);
      var sc = vec2f(0.38);
      if (rh.kind < 1.5) { sc = vec2f(1.0 / 3.6); } else if (rh.kind < 2.5) { sc = vec2f(1.0 / 2.4); } else if (rh.kind > 6.5) { sc = vec2f(1.0 / 2.2, 1.0 / 1.9); }
      var uvP = rot(p.xz, 0.6 + rh.kind) * 0.38;
      var gx = rot(dpx, 0.6 + rh.kind) * 0.38; var gy = rot(dpy, 0.6 + rh.kind) * 0.38;
      if (rh.kind < 2.5 || rh.kind > 6.5) {
        uvP = vec2f(rh.across, rh.along) * sc;
        gx = vec2f(dot(dpx, nrm), dot(dpx, rh.dir)) * sc; gy = vec2f(dot(dpy, nrm), dot(dpy, rh.dir)) * sc;
      }
      // (Setts, flags and planks laid square to their way are slid only along it, or their courses would break.)
      let pv = untile(layer, uvP, gx, gy, kU.a, select(vec2f(1.0), vec2f(0.0, 1.0), rh.kind < 2.5 || rh.kind > 6.5));
      paveCol = pv.c.rgb;
      paveDet = pv.d;
    }
    // Under the pines, a floor of old needles and cones, not plain dark.
    if (fm.g > 0.02) { floorCol = untileC(14, uvA * 0.8, dxA * 0.8, dyA * 0.8, kU.g).rgb; haveFloor = true; }
    // Fen and ash, in the countries that have them.
    if (ft.a > 0.2) { fenCol = untileC(15, uvB, dxB, dyB, kU.r).rgb; }
    if (fk.r > 0.15) { ashCol = untileC(16, uvC, dxC, dyC, kU.b).rgb; }
  }

  // The meadows' own lie, some tens of metres to a patch (field): dry stretches gone to straw, lush dark ones, and worn
  // places where the earth shows through, more of them where the ground tilts. (One green carpet from a hilltop, the
  // critics: the paintings' repeat was gone and the land was still all one.)
  let field = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.0091 + vec2f(0.13, 0.52), 0.0);
  let worn = smoothstep(0.66, 0.8, field.a + (macro2.r - 0.5) * 0.15) * 0.45 * (1.0 - 0.5 * inMap) + smoothstep(0.14, 0.34, steep) * 0.25;
  // Dirt shows through where the grass's own height runs low.
  let edge = clamp(dirtBase * 1.7 - 0.35 + (dirtDet.a - grassDet.a) * 0.9 + (macro2.b - 0.5) * 0.35 + worn, 0.0, 1.0);
  let dirt = smoothstep(0.32, 0.68, edge);
  // (Earth that shows only because the grass is worn there is the plain grey-brown of trodden ground, not the country's
  // red: in the Rustwood a worn bank was an orange stain, the critics.)
  let wornOnly = clamp(worn * 2.0 - dirtBase * 2.0, 0.0, 1.0);
  let earth = mix(dirtCol.rgb, vec3f(dot(dirtCol.rgb, vec3f(0.3, 0.6, 0.1))) * vec3f(1.05, 0.98, 0.86), wornOnly * 0.75);
  var albedo = mix(mix(vec3f(dot(grassCol.rgb, vec3f(0.3, 0.6, 0.1))), grassCol.rgb, 0.5) * vec3f(0.58, 0.57, 0.4), earth, dirt);
  var det = mix(grassDet, dirtDet, dirt);
  // Meadow far from the village goes drier and more varied, like the hills under this light.
  let farDry = smoothstep(90.0, 420.0, length(p.xz));
  albedo = mix(albedo, mix(vec3f(dot(albedo, vec3f(0.3, 0.6, 0.1))), albedo, 0.55) * vec3f(0.92, 0.9, 0.76), farDry * 0.85);
  albedo *= 0.8 + macro2.r * 0.45;
  // (The field's dry and lush stretches, over the far wash so it doesn't grey them out: gentle where the grass's blades
  // stand over the ground, which stay green, and fuller out on the open land.)
  let dryK = smoothstep(0.52, 0.72, field.r + (macro2.g - 0.5) * 0.2) * mix(0.14, 0.5, farDry) * (1.0 - dirt);
  albedo = mix(albedo, vec3f(dot(albedo, vec3f(0.3, 0.6, 0.1))) * vec3f(1.42, 1.18, 0.66) + vec3f(0.012, 0.009, 0.0), dryK);
  albedo *= mix(vec3f(1.0), vec3f(0.8, 0.94, 0.72), smoothstep(0.56, 0.76, field.g) * mix(0.5, 1.0, farDry) * (1.0 - dirt));
  // And a broader wash over the meadows, some sixty metres across: greener, yellower, greyer stretches, so the grass's paintings
  // never show their repeat from a hilltop.
  if (!LEAN) {
    let wash = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.017 + 0.71, 0.0);
    let grassy = 1.0 - dirt;
    albedo *= mix(vec3f(1.0), mix(vec3f(0.9, 0.97, 0.84), vec3f(1.1, 1.04, 0.92), wash.g) * (0.9 + 0.2 * wash.b), grassy);
    // And broader still, three hundred metres across: dry yellow stretches and dark damp hollows, so open country isn't
    // one green to the horizon. (The world once-over, 2026-11-20.)
    let big = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.0033 + 0.37, 0.0);
    albedo *= mix(vec3f(1.0), mix(vec3f(0.74, 0.84, 0.7), vec3f(1.22, 1.12, 0.8), smoothstep(0.3, 0.7, big.r)) * (0.92 + 0.16 * big.a), grassy * 0.85);
  }
  // A road's verge: the grass beside it trodden brown, so a way doesn't end at a line. (No sample: a phone has it too.)
  { let verge = smoothstep(0.06, 0.34, dirtBase) * (1.0 - dirt);
    albedo = mix(albedo, albedo * vec3f(0.7, 0.62, 0.48), verge * 0.75); }
  // The fen's reeds and black water; the Ashen Waste's grey cinders.
  if (!LEAN) {
    let fenAmt = smoothstep(0.25, 0.6, ft.a + (macro2.g - 0.5) * 0.3) * (1.0 - dirt * 0.6) * (1.0 - roadIn);
    albedo = mix(albedo, fenCol * 0.85, fenAmt);
    let ashAmt = smoothstep(0.2, 0.55, fk.r + (macro2.b - 0.5) * 0.3) * (1.0 - roadAmt * 0.5) * (1.0 - roadIn);
    albedo = mix(albedo, ashCol * 0.9, ashAmt);
    // A laid way over all of it, a little darker at its very edge where the stones are set in.
    let rim = smoothstep(-0.55, 0.0, rh.e - grow) * pave;
    albedo = mix(albedo, paveCol * (1.0 - 0.22 * rim), pave);
    det = mix(det, paveDet, pave);
  }
  // The verge: trodden, darker, a little bare.
  albedo = mix(albedo, albedo * vec3f(0.8, 0.76, 0.7), verge * 0.55);
  // The road's two ruts, darker and, in the wet, holding water; the crown between them greening over; its dust lighter than the dirt.
  var rut = 0.0;
  if (!LEAN && rw > 1.3 && !paved && rh.kind < 6.5 && abs(rh.kind - 4.0) > 0.5) {
    let rc = rw * 0.42;
    rut = (1.0 - smoothstep(0.1, 0.32, abs(dc - rc))) * nearIn * roadAmt;
    let crown = (1.0 - smoothstep(rc * 0.3, rc * 0.68, dc)) * nearIn * roadAmt * step(1.9, rw);
    albedo *= (1.0 + 0.2 * roadAmt * nearIn) * (1.0 - rut * 0.24);
    albedo = mix(albedo, mix(vec3f(dot(grassCol.rgb, vec3f(0.3, 0.6, 0.1))), grassCol.rgb, 0.5) * vec3f(0.58, 0.57, 0.4), crown * 0.4 * smoothstep(0.35, 0.65, grassDet.a + 0.2));
  }
  albedo *= ft.rgb * 1.5;
  // Wet country: dark, peaty, with standing sheen.
  albedo = mix(albedo, albedo * vec3f(0.5, 0.56, 0.46), ft.a * (0.35 + 0.35 * macro2.g));
  // Bare rock: the stone of the country (on a phone, the dirt's own grain gone grey).
  if (!haveRock) {
    let grey = dot(dirtCol.rgb, vec3f(0.3, 0.6, 0.1));
    rockCol = vec3f(grey) * vec3f(0.72, 0.72, 0.76) * (0.75 + 0.5 * dirtDet.a);
  }
  albedo = mix(albedo, rockCol * (1.0 + 0.18 * fk.a), rockAmt);
  // (The castle's crag, src/core/east.js CRAG, inside its curtain and down its banks: rock and gravel near half as dark, a
  // dull brown-black. Pale, its slopes in the yard and the wards were snow against the black walls, the gate lost on them.
  // The critics.)
  let cragD = (p.xz - vec2f(${CRAG.x.toFixed(1)}, ${CRAG.z.toFixed(1)})) / vec2f(${CRAG.a.toFixed(1)}, ${CRAG.b.toFixed(1)});
  let cragE = dot(cragD, cragD);   // (not pow: of a negative it's nothing, and the crag's ground went white)
  albedo *= mix(vec3f(0.5, 0.48, 0.45), vec3f(1.0), smoothstep(0.85, 1.15, cragE));
  det = mix(det, rockDet, rockAmt * select(0.0, 1.0, haveRock));
  // Snow over all, thinning where the slope's too steep to hold it.
  var snowCol = vec3f(0.84, 0.87, 0.93) * (0.88 + 0.16 * grassDet.a);
  if (haveSnow) { snowCol = snowTex.rgb * mix(vec3f(1.04, 1.05, 1.08), vec3f(1.0), snowTex.a); }
  albedo = mix(albedo, snowCol, snowAmt);
  // Under the pines, old needles in the dark (less where the snow's got in).
  // (Where the stand's thick, the whole floor is needles, its edge wandering out into the grass.)
  let floorAmt = select(fm.g, smoothstep(0.12, 0.55, fm.g + (macro2.g - 0.5) * 0.3), haveFloor) * (1.0 - dirt * 0.7) * (1.0 - snowAmt * 0.6) * (1.0 - roadIn);
  albedo = mix(albedo, select(vec3f(0.045, 0.034, 0.022), floorCol * 0.62, haveFloor), floorAmt * 0.85);
  // Under the blades the soil sits in shade.
  let grassCover = gm.g * inMap * (1.0 - smoothstep(F.counts.w * 0.75, F.counts.w, dist));
  albedo *= 1.0 - grassCover * 0.38;
  var rough = mix(mix(0.95, det.b, 0.7), 0.55, snowAmt * 0.6 + ft.a * 0.3);
  rough = mix(rough, 0.25, rut * ft.a);
  var n = perturb(normalize(in.n), p, uvA, det.rg, 0.9 - 0.5 * smoothstep(8.0, 30.0, dist));

  // Blood soaked into the earth.
  let bUv = (p.xz - F.blood.xy) * F.blood.z;
  var bld = 0.0;
  if (all(bUv > vec2f(0.0)) && all(bUv < vec2f(1.0))) {
    bld = textureSampleLevel(bloodMap, clampSmp, bUv, 0.0).r;
  }
  // It soaks in along the grain of the ground, in fingers and islands, and pools shiny where it runs deep.
  var fine = vec4f(0.5);
  if (!LEAN || bld > 0.0) { fine = textureSampleLevel(noiseTex, repeatSmp, p.xz * select(0.57, 1.9, LEAN), 0.0); }
  let soak = bld * (0.55 + 1.1 * fine.g) + (det.a - 0.5) * select(0.25, 0.55, LEAN) * step(0.01, bld);
  let wet = smoothstep(0.1, 0.32, soak);
  let deep = smoothstep(0.42, 0.85, soak);
  albedo = mix(albedo, mix(vec3f(0.1, 0.006, 0.004), vec3f(0.05, 0.002, 0.002), deep), wet * 0.97);
  // Glossy, but its sun glint is broken up by the rippled normal and kept small.
  rough = mix(rough, mix(0.32, 0.15, deep), wet);
  sunSpecScale = mix(1.0, 0.12, wet);
  envBoost = mix(1.0, 0.3, wet);
  n = normalize(mix(n, normalize(in.n + vec3f(fine.b - 0.5, 0.0, fine.a - 0.5) * 0.45), wet * 0.85));

  let seed = ign(in.pos.xy);
  let shadow = shadowAt(p, normalize(in.n), in.viewZ, seed);
  var c = shadePBR(p, n, v, albedo, rough, 0.0, 1.0, shadow);
  // Low mist lying over the fen's wet ground, thicker out from you.
  if (!LEAN) { c = mix(c, F.skyAmb.rgb * 0.62 + F.sunColor.rgb * 0.05, ft.a * smoothstep(6.0, 70.0, dist) * 0.38 * (0.7 + 0.6 * macro2.g)); }
  c = applyFog(c, p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

// How many entries STATIC's per-layer table holds: the first array's 64, then the PH2 pack's (renderer.js; interior.js
// fills its own).
export const STATIC_SLOTS = 192;
export const STATIC = COMMON + /* wgsl */ `
@group(1) @binding(0) var colorArr: texture_2d_array<f32>;
@group(1) @binding(1) var detailArr: texture_2d_array<f32>;
@group(1) @binding(2) var<uniform> layers: array<vec4f, ${STATIC_SLOTS}>;
// The PH2 pack (tools/phobos/textures/wire_ph2.py): a second array, smaller and square, its layers numbered from 200 and
// their entries in the table above from 64. (The first array's table was full.) slotOf: a layer's entry in the table.
@group(1) @binding(3) var p2Color: texture_2d_array<f32>;
@group(1) @binding(4) var p2Detail: texture_2d_array<f32>;
fn slotOf(lay: u32) -> u32 { return select(min(lay, 63u), min(lay - 136u, ${STATIC_SLOTS - 1}u), lay >= 200u); }
fn colAt(uv: vec2f, l: i32, dx: vec2f, dy: vec2f) -> vec4f {
  if (l >= 200) { return textureSampleGrad(p2Color, repeatSmp, uv, l - 200, dx, dy); }
  return textureSampleGrad(colorArr, repeatSmp, uv, l, dx, dy);
}
// (One of the pack's laid in the world's own metres, s to a repeat, its level from how far off it is: a pixel's width at
// that distance over a texel's. Phobos's weathering.)
fn p2W(uv: vec2f, l: i32, s: f32, dist: f32) -> vec4f {
  return textureSampleLevel(p2Color, repeatSmp, uv, l - 200, clamp(log2(max(dist * 1.25 / s, 1e-3)), 0.0, 9.0));
}
fn detAt(uv: vec2f, l: i32, dx: vec2f, dy: vec2f) -> vec4f {
  if (l >= 200) { return textureSampleGrad(p2Detail, repeatSmp, uv, l - 200, dx, dy); }
  return textureSampleGrad(detailArr, repeatSmp, uv, l, dx, dy);
}
${GROUND_WGSL}
// A wall's (or a roof's) own across and down in the world's metres, for what weathers it: qa where it faces along x, qb
// where it faces along z, f how much it faces x. The two are blended by f rather than one picked, so round a tower the
// pattern turns with the wall and never switches (picking one was a hard line down every drum). nz2: the small noise read
// that way, s to the metre; p2W2: one of the PH2 pack's paintings (s metres a repeat across, t down).
fn nz2(qa: vec2f, qb: vec2f, f: f32, s: f32, o: vec2f, lv: f32) -> vec4f {
  let a = select(0.0, f, f > 0.03); let b = select(0.0, 1.0 - f, f < 0.97);
  var r = vec4f(0.0);
  if (a > 0.0) { r += textureSampleLevel(noiseTex, repeatSmp, qa * s + o, lv) * a; }
  if (b > 0.0) { r += textureSampleLevel(noiseTex, repeatSmp, qb * s + o, lv) * b; }
  return r / (a + b);
}
fn p2W2(qa: vec2f, qb: vec2f, f: f32, l: i32, s: f32, t: f32, o: vec2f, dist: f32) -> vec4f {
  let a = select(0.0, f, f > 0.03); let b = select(0.0, 1.0 - f, f < 0.97);
  var r = vec4f(0.0);
  if (a > 0.0) { r += p2W(vec2f(qa.x / s, -qa.y / t) + o, l, s, dist) * a; }
  if (b > 0.0) { r += p2W(vec2f(qb.x / s, -qb.y / t) + o, l, s, dist) * b; }
  return r / (a + b);
}

struct V {
  @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f,
  @location(3) @interpolate(flat) layer: u32, @location(4) viewZ: f32,
};

@vertex fn vs(@location(0) pIn: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) layer: u32) -> V {
  var o: V;
  var p = pIn;
  let params = layers[slotOf(layer % 1000u)];
  if (params.w > 0.0) {
    // Leaves stir, in gusts that travel across the trees.
    let t = F.camPos.w;
    let ph = dot(p, vec3f(0.31, 0.11, 0.27));
    let amp = 0.06 + 0.1 * (sin(t * 0.7 + ph * 0.4) * 0.5 + 0.5);
    p += vec3f(sin(t * 1.9 + ph) * amp, sin(t * 2.7 + ph * 1.7) * amp * 0.5, cos(t * 2.2 + ph * 1.3) * amp);
  }
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.p = p; o.n = n; o.uv = uv; o.layer = layer;
  o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  return o;
}

// The slimes' kinds (src/sim/slimes.js SPECIES, in order): colour and glow, and the rim's sheen.
const SLIME_LOOK = array<vec4f, 9>(
  vec4f(0.062, 0.399, 0.028, 0.05),
  vec4f(0.111, 0.101, 0.012, 0.00),
  vec4f(0.019, 0.267, 1.000, 0.22),
  vec4f(0.488, 0.003, 0.019, 0.06),
  vec4f(1.000, 0.235, 0.002, 0.50),
  vec4f(0.198, 0.021, 1.000, 0.45),
  vec4f(0.330, 0.752, 0.004, 0.65),
  vec4f(0.002, 0.001, 0.002, 0.00),
  vec4f(0.619, 0.573, 0.369, 0.03));
const SLIME_RIM = array<vec3f, 9>(
  vec3f(0.339, 1.000, 0.164),
  vec3f(0.442, 0.399, 0.117),
  vec3f(0.330, 0.723, 1.000),
  vec3f(1.000, 0.145, 0.145),
  vec3f(1.000, 0.639, 0.117),
  vec3f(0.639, 0.359, 1.000),
  vec3f(0.828, 1.000, 0.220),
  vec3f(0.145, 0.041, 1.000),
  vec3f(1.000, 0.924, 0.694));

fn flatMaterial(id: u32, p: vec3f, t: f32) -> vec4f {
  if (id == 110u) { return vec4f(0.012, 0.024, 0.028, 0.04); }  // lake
  if (id == 111u) { return vec4f(0.7, 0.78, 0.82, 0.3); }      // falling water
  if (id == 112u) { return vec4f(0.52, 0.64, 0.74, 0.12); }    // ice
  if (id == 113u) { return vec4f(0.04, 0.06, 0.1, 0.25); }     // a seal's face
  if (id == 114u) { return vec4f(0.014, 0.012, 0.018, 0.07); }  // black glass (the Crown of Teeth)
  if (id == 115u) { return vec4f(0.95, 0.6, 0.16, 0.3); }      // gold (a hoard's coin: src/core/delve-build.js)
  // The Elder Gods' void (src/core/delve-build.js): its black-violet glass, the Cinderwell's magma, runes alight, stormglass.
  if (id == 116u) { return vec4f(0.03, 0.012, 0.05, 0.06); }
  if (id == 117u) { return vec4f(0.06, 0.012, 0.004, 0.7); }
  if (id == 118u) { return vec4f(0.02, 0.012, 0.03, 0.5); }
  if (id == 119u) { return vec4f(0.5, 0.62, 0.8, 0.15); }
  // rgb + roughness for the few materials with no painting.
  if (id == 100u) { return vec4f(0.035, 0.034, 0.036, 0.42); }  // iron
  if (id == 101u) { return vec4f(1.0, 0.6, 0.2, 1.0); }         // flame (emissive below)
  if (id == 102u) { return vec4f(0.01, 0.018, 0.02, 0.05); }    // well water
  if (id == 103u) { return vec4f(0.45, 0.07, 0.05, 0.4); }      // apples
  // The Test Dungeon (src/core/testhall.js): white stone, its white tiled floor, the panels of light in its ceilings.
  if (id == 106u) { return vec4f(0.8, 0.8, 0.79, 0.85); }       // white
  if (id == 107u) {
    // A metre tile with a thin grey joint, and a darker line every five metres, to judge a distance by.
    let g = abs(fract(p.xz) - 0.5);
    let five = abs(fract(p.xz / 5.0) - 0.5) * 5.0;
    let joint = smoothstep(0.475, 0.495, max(g.x, g.y));
    let major = smoothstep(2.44, 2.48, max(five.x, five.y));
    return vec4f(vec3f(0.78) * (1.0 - 0.22 * joint) * (1.0 - 0.3 * major), 0.5);
  }
  if (id == 108u) { return vec4f(1.0, 1.0, 1.0, 1.0); }         // a light panel (emissive below)
  return vec4f(0.62, 0.42, 0.1, 0.55);                          // pears
}

@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> Out {
  let p = in.p;
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  var n0 = normalize(in.n);
  var o: Out;
  o.depth = in.viewZ;
  var uv = in.uv;
  // (A thousand times which other light it's in, over the layer: dark, pale, frost. src/core/sites.js)
  let lay = in.layer % 1000u;
  let tintK = in.layer / 1000u;
  let flat_ = lay >= 100u && lay < 200u;
  let params = layers[slotOf(lay)];
  let layerI = i32(select(min(lay, 63u), min(lay, ${200 + STATIC_SLOTS - 65}u), lay >= 200u));
  if (!front && params.x == 0.0) { n0 = -n0; }
  var albedo: vec3f; var rough = 0.8; var metal = 0.0; var emissive = vec3f(0.0); var ao = 1.0;
  let dx = dpdx(uv); let dy = dpdy(uv);
  let dp1 = dpdx(p); let dp2 = dpdy(p);

  // Parallax: walls and roofs have real relief close up, read from the painting's height.
  var n = n0;
  if (F.counts.z > 0.0 && params.y > 0.0 && dist < 24.0 && !flat_) {
    let dp2p = cross(dp2, n0); let dp1p = cross(n0, dp1);
    let T = dp2p * dx.x + dp1p * dy.x;
    let B = dp2p * dx.y + dp1p * dy.y;
    let inv = 1.0 / sqrt(max(max(dot(T, T), dot(B, B)), 1e-14));
    let vt = vec3f(dot(v, T) * inv, dot(v, B) * inv, max(dot(v, n0), 0.15));
    let fade = 1.0 - smoothstep(10.0, 24.0, dist);
    let steps = 10.0 * F.counts.z + 2.0;
    let delta = vt.xy / vt.z * params.y * fade / steps;
    var cur = uv;
    var h = detAt(cur, layerI, dx, dy).a;
    var ray = 1.0;
    var hPrev = h;
    for (var i = 0; i < i32(steps); i++) {
      if (ray <= h) { break; }
      ray -= 1.0 / steps;
      cur -= delta;
      hPrev = h;
      h = detAt(cur, layerI, dx, dy).a;
    }
    uv = cur;
    if (params.z < 0.0) {
      // Relief this deep shows its steps: put the hit between the last two, where the ray really crossed.
      let after = h - ray;
      let before = hPrev - (ray + 1.0 / steps);
      uv = cur + delta * clamp(after / max(after - before, 1e-4), 0.0, 1.0);
    }
    ao = mix(1.0, 0.45 + 0.55 * smoothstep(0.2, 0.62, h), fade);
  }

  var tex = colAt(uv, layerI, dx, dy);
  var det = detAt(uv, layerI, dx, dy);
  if (!LEAN && params.z < -1.5) {
    // Never the same stone twice: a slow noise picks between two copies of the tile, each shifted its own way, and they
    // meet along the height of the stone, so the seam runs in the mortar. The tile's repeat goes.
    let l = textureSampleLevel(noiseTex, repeatSmp, uv * 0.11 + 0.37, 0.0).r * 12.0;
    let ia = floor(l);
    let oa = sin(vec2f(3.0, 7.0) * ia); let ob = sin(vec2f(3.0, 7.0) * (ia + 1.0));
    let da = detAt(uv + oa, layerI, dx, dy);
    let db = detAt(uv + ob, layerI, dx, dy);
    let w = smoothstep(0.3, 0.7, l - ia + (db.a - da.a) * 1.1);
    tex = mix(colAt(uv + oa, layerI, dx, dy), colAt(uv + ob, layerI, dx, dy), w);
    det = mix(da, db, w);
  }
  // Phobos: no tile the same as the one beside it. Its masonry, roofs and boards (params.w < 0: renderer.js) read from two
  // copies of the tile, each slid along its own way, a slow noise choosing between them and the seam following the
  // painting's height, so it runs in the mortar and not across a stone. Slid along only, never up, so courses and strips
  // stay level. (The same tile over a whole street read as a game from the nineties: the owner.)
  let phob = !LEAN && p.x > 9300.0 && p.x < 11800.0 && abs(p.z) < 1100.0 && !flat_ && params.z >= 0.0;
  if (phob && params.w < 0.0 && dist < 320.0) {
    let l = textureSampleLevel(noiseTex, repeatSmp, uv * 0.093 + vec2f(0.71, 0.29), 0.0).g * 9.0;
    let ia = floor(l);
    let oa = vec2f(fract(sin(ia * 12.9898) * 43758.5), 0.0); let ob = vec2f(fract(sin((ia + 1.0) * 12.9898) * 43758.5), 0.0);
    let da = detAt(uv + oa, layerI, dx, dy);
    let db = detAt(uv + ob, layerI, dx, dy);
    let w = smoothstep(0.32, 0.68, l - ia + (db.a - da.a) * 0.9);
    tex = mix(colAt(uv + oa, layerI, dx, dy), colAt(uv + ob, layerI, dx, dy), w);
    det = mix(da, db, w);
  }
  // And the same everywhere else: the town's and the land's own masonry, roofs and boards, the castles and the places out in
  // the countries, and down the delves. Its patches are laid in the world's own space, not the painting's, so two towers
  // built alike aren't stone for stone the same; slid along only, so a course stays level. Never a painting with windows in
  // it (params.z), a door, a banner or anything laid once (params.w is nothing on those). (The owner: the same texture over
  // and over on the houses and the castles.)
  let wide = !LEAN && !phob && !flat_ && params.w < 0.0 && params.z == 0.0;
  if (wide && dist < 260.0) {
    let l = textureSampleLevel(noiseTex, repeatSmp, vec2f(p.x + p.y * 0.71, p.z - p.y * 0.63) * 0.043 + vec2f(0.19, 0.83), 0.0).b * 8.0;
    let ia = floor(l);
    let oa = vec2f(fract(sin(ia * 12.9898 + 0.31) * 43758.5), 0.0); let ob = vec2f(fract(sin((ia + 1.0) * 12.9898 + 0.31) * 43758.5), 0.0);
    let t = clamp((l - ia - 0.25) / 0.5, 0.0, 1.0);
    if (t <= 0.0) { tex = colAt(uv + oa, layerI, dx, dy); det = detAt(uv + oa, layerI, dx, dy); }
    else if (t >= 1.0) { tex = colAt(uv + ob, layerI, dx, dy); det = detAt(uv + ob, layerI, dx, dy); }
    else {
      let da = detAt(uv + oa, layerI, dx, dy);
      let db = detAt(uv + ob, layerI, dx, dy);
      let w = smoothstep(0.0, 1.0, clamp(t + (db.a - da.a) * 2.4 * t * (1.0 - t), 0.0, 1.0));
      tex = mix(colAt(uv + oa, layerI, dx, dy), colAt(uv + ob, layerI, dx, dy), w);
      det = mix(da, db, w);
    }
  }
  if (flat_) {
    let m = flatMaterial(lay, p, F.camPos.w);
    albedo = m.rgb; rough = m.a;
    let t = F.camPos.w;
    // (Fen water, 'mire:water', Phobos's Slough: green-brown and thick, a scum of muck on it in drifts, a slow stir and no
    // more, the sky in it dulled. As well water it was a clean canal, a mirror: the critics.)
    if (lay == 102u && tintK == 4u) {
      let d = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.06 + vec2f(t * 0.004, t * 0.002), 0.0);
      albedo = mix(vec3f(0.034, 0.036, 0.016), vec3f(0.06, 0.052, 0.026), smoothstep(0.42, 0.7, d.r));
      rough = mix(0.68, 0.8, smoothstep(0.5, 0.75, d.g)); ao = 0.36;   // (the sky in it dulled to a third: the whole sky lay on it in white sheets)
      n = normalize(vec3f((d.b - 0.5) * 0.06, 1.0, (d.a - 0.5) * 0.06));
    }
    if (lay == 110u || lay == 112u) {
      // Open water stirs in two sets of ripples; ice lies still, cracked.
      let a = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.045 + vec2f(t * 0.011, t * 0.007), 0.0).rg - 0.5;
      let b = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.13 - vec2f(t * 0.019, -t * 0.013), 0.0).ba - 0.5;
      if (lay == 110u) { n = normalize(vec3f((a.x + b.x) * 0.22, 1.0, (a.y + b.y) * 0.22)); }
      else {
        let c = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.21, 0.0).r;
        albedo *= mix(0.7, 1.08, smoothstep(0.46, 0.5, abs(c - 0.5) + 0.46)) * (0.9 + a.x * 0.4);
        n = normalize(vec3f(a.x * 0.08, 1.0, a.y * 0.08));
      }
    }
    if (lay == 111u) {
      // The falls: streaks running down, foam where they land.
      let s = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.uv.x * 3.0, in.uv.y * 0.6 - t * 0.9), 0.0);
      albedo *= 0.55 + 0.6 * s.r;
      emissive = albedo * 0.12 * F.sunColor.a;
      n = normalize(n0 + vec3f((s.g - 0.5) * 0.4, 0.0, (s.b - 0.5) * 0.4));
    }
    if (lay == 113u) {
      // A seal: blue light moving under the stone, slow, like breath.
      let s = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.19 + vec2f(sin(t * 0.3), cos(t * 0.23)) * 0.1, 0.0);
      let rune = smoothstep(0.47, 0.5, abs(s.r - 0.5) + 0.47) * (1.0 - smoothstep(0.5, 0.56, abs(s.g - 0.5) + 0.5));
      emissive = vec3f(0.25, 0.55, 1.3) * (0.35 + 0.25 * sin(t * 1.3) + rune * 1.6);
    }
    if (lay >= 116u && lay <= 119u) {
      let fres = pow(1.0 - clamp(abs(dot(n0, v)), 0.0, 1.0), 2.0);
      // Void glass: dark where you look into it, its violet heart at the edges, breathing slowly.
      if (lay == 116u) { emissive = vec3f(0.42, 0.13, 0.95) * (0.18 + 0.9 * fres) * (0.85 + 0.15 * sin(t * 0.9 + p.x * 0.3 + p.z * 0.2)); }
      // Magma: a crust drifting over it, white-orange in the cracks.
      if (lay == 117u) {
        let s = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.06 + vec2f(t * 0.008, -t * 0.005), 0.0);
        let s2 = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.21 - vec2f(t * 0.013, t * 0.011), 0.0);
        let crack = 1.0 - smoothstep(0.03, 0.14, abs(s.r - 0.5) + (s2.g - 0.5) * 0.12);
        emissive = select(mix(vec3f(0.9, 0.12, 0.01), vec3f(9.0, 3.2, 0.5), crack), mix(vec3f(0.6, 0.1, 0.01), vec3f(2.4, 1.0, 0.2), crack), F.blood.w < 0.5);
        albedo *= 1.0 - crack;
      }
      if (lay == 118u) { emissive = vec3f(0.85, 0.36, 1.9) * (0.75 + 0.25 * sin(t * 1.7 + p.x + p.z)); }
      // Stormglass: white-blue, flickering as lightning does.
      if (lay == 119u) {
        let fl = step(0.82, fract(sin(floor(t * 9.0 + p.y) * 12.9898) * 43758.5)) * 1.6 + 0.6;
        emissive = vec3f(0.9, 1.3, 2.6) * fl * (0.6 + 0.4 * fres);
      }
    }
    if (lay >= 120u && lay < 130u) {
      // Jelly: dark and clear where you look straight through it, lit at the rim, its own glow in it; white for a moment when struck.
      let L = SLIME_LOOK[lay - 120u];
      let fres = pow(1.0 - clamp(abs(dot(n0, v)), 0.0, 1.0), 2.2);
      let heart = smoothstep(0.35, 0.95, in.uv.x) * (1.0 - fres);
      albedo = L.rgb * mix(0.55, 0.18, heart);
      rough = 0.06;
      emissive = L.rgb * (L.w * 2.2 + 0.05) * (1.0 - 0.6 * heart) + SLIME_RIM[lay - 120u] * fres * 0.55 + vec3f(in.uv.y * 1.6);
    }
    if (lay == 100u || lay == 105u || lay == 115u) { metal = 0.9; }
    // (Glass in a window that's never lit, Phobos's ('slate:iron'): dark blue-grey, glossy, the sky in it; not a black hole.)
    // (Each pane a little different, and at night near black, the moon only a glint in it.)
    let paneK = fract(sin(dot(floor(p * 0.55), vec3f(12.99, 4.13, 78.23))) * 43758.5);
    let dayK = smoothstep(0.3, 0.9, F.sunColor.a);
    if (lay == 100u && tintK == 7u) { albedo = vec3f(0.03, 0.034, 0.042) * (0.6 + 0.8 * paneK) * mix(0.3, 1.0, dayK); metal = 0.04 * dayK; rough = mix(0.88, mix(0.5, 0.72, paneK), dayK); ao = 0.55; }   // (darker and duller: the sky full in them, they were blank paper, the critics)
    if (lay == 108u) { emissive = select(vec3f(6.0, 6.0, 5.6), vec3f(1.6, 1.6, 1.5), F.blood.w < 0.5); albedo = vec3f(0.0); }
    if (lay == 101u) {
      // (Its own light beside it, put out: src/gfx/homelights.js. A light the frame has no room for leaves the flame be.)
      for (var li = 0u; li < u32(F.counts.x); li++) {
        let L = F.lights[li];
        if (L.colI.w < 0.03 && distance(p, L.posR.xyz) < 0.45) { discard; }
      }
      let f = 0.85 + 0.15 * sin(F.camPos.w * 11.0 + p.x * 9.0) * sin(F.camPos.w * 7.3);
      // (Without bloom to carry it, that heat would only be a white square, so it's a plain gold instead.)
      // White-hot where it faces you, deepening to the orange of its own light toward its rim, with a lick running up
      // it: a flame, where it was one flat white shape (a torch's cone was a paper hat). A lantern's pane seen square on
      // is as bright as ever.
      let face = abs(dot(n0, v));
      let lick = 0.5 + 0.5 * sin(p.y * 31.0 - F.camPos.w * 9.0 + (p.x + p.z) * 17.0);
      let heat = smoothstep(0.12, 0.9, face) * (0.82 + 0.18 * lick);
      emissive = select(mix(vec3f(2.2, 0.28, 0.02), vec3f(14.0, 7.0, 2.4), heat), mix(vec3f(1.2, 0.36, 0.04), vec3f(2.2, 1.2, 0.3), heat), F.blood.w < 0.5) * f;
      // (A flame in another light, as a painting has one: Velscour's fire in Blackvigil Keep burns redder ('dark:flame'), the
      // Howling Deeps' cold lights burn blue-white ('frost:flame'). src/core/delve-build.js)
      if (tintK == 1u) { emissive *= vec3f(1.0, 0.36, 0.2); }
      if (tintK == 3u) { emissive = emissive.bgr * vec3f(0.7, 0.9, 1.0); }
      // (And the delves that came after: a grave-lamp's pale flame in the Kingsbarrow ('pale:flame'), the corpse-lights of
      // the Drowned Vaults ('mire:flame'), the Sporehold's gills ('spore:flame').)
      if (tintK == 2u) { emissive = vec3f(dot(emissive, vec3f(0.3, 0.5, 0.2))) * vec3f(0.8, 1.0, 0.74); }
      if (tintK == 4u) { emissive = emissive.grb * vec3f(0.55, 0.95, 0.6); }
      if (tintK == 5u) { emissive = vec3f(dot(emissive, vec3f(0.3, 0.5, 0.2))) * vec3f(0.5, 0.2, 0.95); }
      if (tintK == 6u) { emissive = vec3f(dot(emissive, vec3f(0.3, 0.5, 0.2))) * vec3f(0.62, 0.3, 1.0); }
      // (A window lit at evening ('eve:flame', Phobos's panes): dark glass by day, a lamp behind it as the light goes, warm
      // and a little red.)
      let night = 1.0 - smoothstep(0.3, 0.9, F.sunColor.a);
      if (tintK == 12u) { emissive *= vec3f(0.5, 0.7, 0.95) * night; }
      if (tintK == 8u) { emissive = vec3f(dot(emissive, vec3f(0.3, 0.5, 0.2))) * vec3f(0.95, 0.1, 0.035); }
      // (The sky seen up a slot cut in a roof ('slate:flame', the Redoubt under the Sill's court and hall): a steady pale
      // overcast, no flicker and no flame's heat in it. src/core/delve-build.js daylight.)
      if (tintK == 7u) { emissive = vec3f(1.15, 1.22, 1.36); }
      albedo = vec3f(0.0);
      if (tintK == 12u) { albedo = vec3f(0.03, 0.034, 0.042) * (0.6 + 0.8 * paneK) * (1.0 - night); metal = 0.04 * (1.0 - night); rough = mix(0.5, 0.72, paneK); ao = mix(0.55, 1.0, night); }
    }
  } else {
    if (params.x > 0.0 && tex.a < 0.5) { discard; }
    albedo = tex.rgb;
    rough = det.b;
    if (tintK > 0u) {
      let lum = dot(albedo, vec3f(0.3, 0.55, 0.15));
      // Velscour's black stone, with a little of the red in it; limestone bleached and bone; stone under rime, whitest on top.
      if (tintK == 1u) { albedo = vec3f(lum) * vec3f(0.27, 0.22, 0.22); rough = rough * 0.8; }
      if (tintK == 2u) { albedo = mix(albedo, vec3f(lum * 1.25 + 0.16) * vec3f(1.0, 0.97, 0.9), 0.8); }
      if (tintK == 3u) { albedo = mix(vec3f(lum) * vec3f(0.85, 0.92, 1.05), vec3f(0.82, 0.86, 0.92), smoothstep(0.2, 0.8, n0.y) * 0.8 + 0.12); }
      // Rock that's stood in fen water: green-black, and slick. And rock the Sporehold's growth has got into: violet in it.
      if (tintK == 4u) { albedo = mix(albedo, vec3f(lum) * vec3f(0.42, 0.62, 0.46), 0.82); rough = rough * 0.55; }
      if (tintK == 5u) { albedo = mix(albedo, vec3f(lum * 1.1) * vec3f(0.74, 0.52, 0.92), 0.78); }
      // The void's stone: black, with violet in it, a little glassy.
      if (tintK == 6u) { albedo = mix(albedo, vec3f(lum * 0.8) * vec3f(0.47, 0.41, 0.58), 0.86); rough = rough * 0.85; }
      // Phobos's palette swaps (src/core/phobos-build.js): blue-grey slate; his blood red, ox-blood, deep and dark; old stone
      // and tile gone green-grey with lichen; umber, old fired clay; and soot, brown-black where the smoke's lain for years.
      if (tintK == 7u) { albedo = mix(albedo, vec3f(lum * 0.95) * vec3f(0.56, 0.62, 0.72), 0.85); rough = rough * 0.9; }
      if (tintK == 8u) { albedo = mix(albedo, vec3f(lum * 0.72) * vec3f(0.56, 0.14, 0.12), 0.9); }
      if (tintK == 9u) { albedo = mix(albedo, vec3f(lum) * vec3f(0.55, 0.62, 0.42), 0.62); }
      if (tintK == 10u) { albedo = mix(albedo, vec3f(lum * 0.82) * vec3f(0.8, 0.53, 0.36), 0.75); }
      if (tintK == 11u) { albedo = mix(albedo, vec3f(lum * 0.62) * vec3f(0.62, 0.55, 0.5), 0.8); rough = max(rough, 0.72); }
      // (And the Keep's own, 'char': near black, and matte, so the sun on a round shaft doesn't turn it silver.)
      if (tintK == 13u) { albedo = vec3f(lum * 0.5) * vec3f(0.52, 0.47, 0.47); rough = max(rough, 0.8); }
      // (And two of his liveries in Castle Velscour's wings, docs/PHOBOS-LAYOUT.md: royal blue, and forest green. Never gold
      // beside the blue.)
      if (tintK == 14u) { albedo = mix(albedo, vec3f(lum * 1.5 + 0.05) * vec3f(0.13, 0.27, 0.9), 0.94); }
      if (tintK == 15u) { albedo = mix(albedo, vec3f(lum * 1.4 + 0.04) * vec3f(0.2, 0.56, 0.2), 0.92); }
    }
    // Phobos's walls weathered, in the world's own space so it runs on over every tile, joint and house: a slow drift of
    // tone and warmth so no two houses and no two stretches of a curtain are the same stone; soot run down from every
    // ledge and sill (the PH2 pack's soot streaks); grime in broad clouds; cracks here and there; moss and lichen in the
    // damp, most on what faces north; dead ivy up some walls; and on its roofs moss in the hollows and grime down the
    // slope. (Only there, the box of the city and the crag: src/core/phobos-build.js. Not on a phone.)
    if (phob && params.x == 0.0) {
      let vert = abs(n0.y) < 0.45;
      let along = select(p.z, p.x, abs(n0.z) > abs(n0.x));
      let q = select(p.xz, vec2f(along, p.y), vert);
      let big = textureSampleLevel(noiseTex, repeatSmp, q * 0.0061 + vec2f(0.13, 0.57), 0.0);
      let mid = textureSampleLevel(noiseTex, repeatSmp, q * 0.031 + vec2f(0.41, 0.09), 0.0);
      // Tone and warmth, house by house and stretch by stretch.
      albedo *= 0.62 + 0.66 * big.r;
      albedo = mix(albedo, albedo * vec3f(1.12, 1.0, 0.84), smoothstep(0.45, 0.75, big.g) * 0.8);
      albedo = mix(albedo, albedo * vec3f(0.86, 0.94, 1.08), smoothstep(0.45, 0.75, big.b) * 0.6);
      // Grime in clouds.
      let gr = p2W(q / 9.0, 287, 9.0, dist).r;
      albedo *= 1.0 - 0.55 * gr * smoothstep(0.25, 0.65, mid.r);
      let mason = params.w > -1.5 && params.w < -0.5;   // (masonry, -1, only: boards, roofs, doors and cloth are spared what follows but the tone and grime)
      if (vert && mason) {
        // In the city, the houses' old render: a skin of sooted plaster over their brick and stone, here whole, there
        // fallen away in ragged islands to the masonry, its edge following the stones. (Not on the castle's walls.)
        if (params.w < 0.0 && p.x < 10640.0) {
          let pl = p2W(vec2f(along, -p.y) / 3.0, 252, 3.0, dist).rgb;
          let keep = smoothstep(0.46, 0.54, big.a * 0.8 + mid.a * 0.45 + (det.a - 0.5) * 0.3 - 0.1);
          albedo = mix(albedo, pl * (0.55 + 0.5 * big.r), keep * 0.92);
          // (A dark lip where it's broken off.)
          albedo *= 1.0 - 0.35 * (1.0 - abs(keep * 2.0 - 1.0)) * keep;
        }
        // Soot down from every ledge, in four-metre runs; heavier toward the city's smoke.
        let st = p2W(vec2f(along / 4.0, -p.y / 4.0), 280, 4.0, dist).r;
        albedo *= 1.0 - 0.72 * st * smoothstep(0.3, 0.6, mid.g + 0.15);
        // And on what's tall, the castle's towers and curtains above all, long runs of soot and rain from far up, fourteen
        // metres across and thirty-six down a repeat: a drum a hundred metres high streaked the length of it, not ruled.
        let tall = p2W(vec2f(along / 14.0, -p.y / 36.0), 280, 14.0, dist).r;
        albedo *= 1.0 - 0.5 * tall * smoothstep(0.3, 0.6, big.r + 0.12);
        // Cracks, now and then.
        let ck = p2W(vec2f(along / 3.0, -p.y / 3.0) + 0.37, 285, 3.0, dist).r;
        albedo *= 1.0 - 0.5 * ck * smoothstep(0.62, 0.8, big.a);
        // Moss and lichen in the damp, more on what faces north and toward the foot of a wall.
        let damp = smoothstep(0.55, 0.8, mid.b + max(-n0.z, 0.0) * 0.25 + (0.5 - fract(p.y / 23.0)) * 0.05);
        let moss = p2W(vec2f(along / 2.0, -p.y / 2.0), 282, 2.0, dist).rgb;
        let li = p2W(vec2f(along, -p.y) / 1.5, 286, 1.5, dist).rgb;
        albedo = mix(albedo, mix(li * 0.7, moss * 0.8, 0.6), damp * 0.55);
        // Dead ivy up some walls, dark and dry.
        let iv = p2W(vec2f(along / 3.0, -p.y / 4.5), 293, 4.0, dist).r;
        albedo = mix(albedo, vec3f(0.07, 0.06, 0.045), iv * smoothstep(0.7, 0.86, big.b) * 0.92);
        rough = max(rough, 0.6);
      } else if (n0.y > 0.45) {
        // A roof's or a ledge's top: moss in its hollows, darker in the grime's clouds.
        let moss = p2W(p.xz / 2.0, 282, 2.0, dist).rgb;
        albedo = mix(albedo, moss * 0.7, smoothstep(0.58, 0.82, mid.b) * smoothstep(0.1, 0.5, 1.0 - det.a) * 0.6);
      }
    }
    // Out in the weather everywhere else (above the delves, which lie fifty metres and more under the land): the town's
    // houses, the castles and the places, in the world's own space so it runs on over every tile and joint, and placed
    // where weather puts it rather than in clouds (the critics: clouds of grime with no cause read as camouflage):
    // - every surface: a slow drift of tone, a few in a hundred, so no two houses or stretches of curtain are one stone;
    // - masonry, roofs and boards: each stone, shingle or board its own tone, on its face (by the painting's height) so
    //   the joints stay dark between them; the same stone in the same place, tile after tile, was the repeat that read;
    // - a wall's foot, where the ground under it is known (groundUnder): rising damp and splashed dirt, a ragged band to
    //   about a metre, greener and darker on what faces north;
    // - masonry: thin rain streaks down its face, a crack now and then, lichen on its tops;
    // - a roof: its streaks down the fall line, moss on the slope that faces north, in the shingles' hollows;
    // - a painted front (params.z): never its timber or its glass. Only its plaster and infill: each bay a little its own
    //   tone, a line of dirt where the plaster meets the timber, and the damp at the foot. (The owner: the fronts with their
    //   cross beams must look right.)
    // The church's masonry (-3, src/gfx/interior.js) takes the tone and the stone by stone, none of the weather: the same
    // stone lines its inside. On a phone, the drift of tone only. (The PH2 pack's decals, soot and cracks, are white on black made cut-outs: what
    // they mark is in their alpha, their colour near black.)
    if (!phob && params.w < 0.0 && params.x == 0.0 && p.y > -20.0) {
      let big = textureSampleLevel(noiseTex, repeatSmp, vec2f(p.x + p.y * 0.5, p.z - p.y * 0.5) * 0.0093 + vec2f(0.61, 0.27), 0.0);
      albedo *= 0.92 + 0.17 * big.r;
      albedo = mix(albedo, albedo * vec3f(1.04, 1.0, 0.94), smoothstep(0.4, 0.75, big.g));
      albedo = mix(albedo, albedo * vec3f(0.97, 0.99, 1.03), smoothstep(0.4, 0.75, big.b));
      if (!LEAN) {
        let top = n0.y > 0.9;
        let vert = abs(n0.y) < 0.45;
        let slope = !top && !vert && n0.y > 0.0;
        let hx = n0.x * n0.x * n0.x * n0.x; let hz = n0.z * n0.z * n0.z * n0.z;
        let fx = hx / max(hx + hz, 1e-6);
        let qa = vec2f(p.z, p.y); let qb = vec2f(p.x, p.y);
        let mason = params.z == 0.0 && params.w > -1.5;
        let boards = params.w < -1.5 && params.w > -2.5;
        let weather = params.w > -2.5;
        let ground = groundUnder(p);
        let hg = p.y - ground;
        if (params.z == 0.0) {
          let sz = select(0.62, 1.35, boards);
          var sv: vec4f;
          if (top) { sv = textureSampleLevel(noiseTex, repeatSmp, p.xz * sz + vec2f(0.17, 0.43), 2.0); }
          else { sv = nz2(qa, qb, fx, sz, vec2f(0.17, 0.43), 2.0); }
          let face = smoothstep(0.34, 0.6, det.a);
          albedo *= mix(1.0, select(0.8 + 0.4 * sv.r, 0.85 + 0.3 * sv.r, boards), face);
          albedo = mix(albedo, albedo * vec3f(1.06, 1.0, 0.93), smoothstep(0.55, 0.8, sv.g) * face);
          albedo = mix(albedo, vec3f(dot(albedo, vec3f(0.3, 0.55, 0.15))) * vec3f(0.97, 0.99, 1.03), smoothstep(0.58, 0.85, sv.b) * face * 0.5);
        }
        if (params.z > 0.0) {
          let glass = 1.0 - smoothstep(0.1, 0.26, det.b);
          let sg = sqrt(max(tex.rgb, vec3f(0.0)));
          let wood = clamp((0.4 - dot(sg, vec3f(0.2126, 0.7152, 0.0722))) * 7.0, 0.0, 1.0) * clamp((sg.r - sg.b) * 7.0, 0.0, 1.0);
          let infill = (1.0 - smoothstep(0.15, 0.5, wood)) * (1.0 - glass);
          // (Each bay: a noise about a bay's width, read across the front.)
          let bay = nz2(qa, qb, fx, 0.33, vec2f(0.33, 0.77), 1.0);
          albedo *= mix(1.0, 0.93 + 0.13 * bay.r, infill);
          albedo = mix(albedo, albedo * vec3f(1.04, 0.99, 0.9), smoothstep(0.5, 0.8, bay.g) * infill);
          // (The stains, drips and old patches painted into the plaster, the same in every bay: lifted toward the plaster
          // round them in some bays and left in others, by the bay's own noise, so each bay keeps a different few.)
          let wide = textureSampleLevel(colorArr, repeatSmp, uv, layerI, 6.0).rgb;
          let lifted = max(albedo, albedo * clamp(dot(wide, vec3f(0.3, 0.55, 0.15)) / max(dot(tex.rgb, vec3f(0.3, 0.55, 0.15)), 1e-3), 1.0, 1.7));
          albedo = mix(albedo, lifted, smoothstep(0.42, 0.62, bay.a) * infill * 0.85);
          // (Where the plaster meets the timber: the painting itself, blurred, is darker there.)
          let soft = sqrt(max(textureSampleLevel(colorArr, repeatSmp, uv, layerI, 4.0).rgb, vec3f(0.0)));
          let nearWood = clamp((0.62 - dot(soft, vec3f(0.2126, 0.7152, 0.0722))) * 4.0, 0.0, 1.0);
          albedo *= 1.0 - 0.14 * nearWood * infill * (0.5 + bay.b);
        }
        if (weather && vert && hg > -1.0 && hg < 2.5) {
          // The foot of a wall: damp risen into it and the dirt splashed up, to about a metre with a ragged top.
          let rag = nz2(qa, qb, fx, 1.3, vec2f(0.71, 0.11), 1.0);
          let band = 1.0 - smoothstep(0.35, 1.0 + 0.5 * rag.r, hg);
          let splash = 1.0 - smoothstep(0.0, 0.3 + 0.2 * rag.g, hg);
          let north = smoothstep(-0.2, 0.8, -n0.z);
          albedo = mix(albedo, albedo * mix(vec3f(0.87, 0.85, 0.8), vec3f(0.8, 0.85, 0.76), north * 0.7), band * select(0.8, 1.0, mason));
          albedo *= 1.0 - 0.1 * splash;
          rough = mix(rough, max(rough, 0.85), band * 0.5);
        }
        if (mason && vert) {
          // Rain down the face in thin runs, here and there along it (where a noise along the wall says the water comes
          // down), no darker than a sixth. (Everywhere at once, every few metres, they read as pinstripes: a repeat again.)
          let st = p2W2(qa, qb, fx, 280, 5.3, 13.0, vec2f(0.0), dist).a;
          let runs = nz2(qa, qb, fx, 0.17, vec2f(0.21, 0.66), 1.0);
          albedo *= 1.0 - 0.18 * st * smoothstep(0.45, 0.68, runs.r);
          let ck = p2W2(qa, qb, fx, 285, 3.0, 3.0, vec2f(0.61, 0.0), dist).a;
          albedo *= 1.0 - 0.3 * ck * smoothstep(0.62, 0.8, big.a);
        }
        if (mason && top) {
          // A wall's top or a ledge: lichen in spots, grey-green and pale.
          let li = p2W(p.xz / 1.5, 286, 1.5, dist).rgb;
          let m = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.21 + vec2f(0.4, 0.2), 0.0);
          albedo = mix(albedo, li * 0.85, smoothstep(0.5, 0.75, m.b) * 0.45);
        }
        if (boards && slope) {
          // A roof: streaks down the fall line from the ridge, and moss on the slope that faces north, in its hollows.
          // (Each roof its own: a noise about a house apart sets one redder or browner, one greyer and older.)
          let own = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.031 + vec2f(0.83, 0.37), 0.0);
          albedo *= 0.86 + 0.28 * own.r;
          albedo = mix(albedo, albedo * vec3f(1.1, 0.96, 0.86), smoothstep(0.45, 0.75, own.g) * 0.8);
          // (Older and greyer is a warm grey, weathered wood's: a cool one beside red shingles read lilac.)
          albedo = mix(albedo, vec3f(dot(albedo, vec3f(0.3, 0.55, 0.15))) * vec3f(1.04, 0.98, 0.9), smoothstep(0.5, 0.8, own.b) * 0.45);
          let st = p2W2(qa, qb, fx, 280, 3.1, 5.0, vec2f(0.37, 0.0), dist).a;
          let m = nz2(qa, qb, fx, 0.27, vec2f(0.05, 0.71), 0.0);
          albedo *= 1.0 - 0.22 * st * smoothstep(0.35, 0.6, m.r);
          let north = smoothstep(-0.1, 0.5, -n0.z);
          let moss = p2W(p.xz / 2.0, 282, 2.0, dist).rgb;
          // (Moss in the shingles' hollows and down the slope in runs, never in clouds.)
          let mrun = nz2(qa * vec2f(1.0, 0.25), qb * vec2f(1.0, 0.25), fx, 0.9, vec2f(0.5, 0.1), 1.0);
          albedo = mix(albedo, moss * 0.8, smoothstep(0.55, 0.78, mrun.b) * north * smoothstep(0.2, 0.6, 1.0 - det.a) * 0.4);
        }
      }
    }
    n = perturbD(n0, dp1, dp2, dx, dy, det.rg, select(1.0, mix(1.4, 0.7, smoothstep(5.0, 20.0, dist)), params.z < 0.0));
    if (params.z < 0.0) {
      // What the damp has done, in world space, so it runs on across every tile and joint. Mortar and hollows first.
      let cav = smoothstep(0.08, 0.5, det.a);
      albedo *= mix(0.42, 1.0, cav);
      ao *= mix(0.5, 1.0, cav);
      // Grey stone. The warmth is the flames', so what they don't reach falls away cold, and a lit pool stands off its shadow.
      albedo = mix(vec3f(dot(albedo, vec3f(0.3, 0.55, 0.15))), albedo, 0.62);
      let level = select(-16.25, -24.25, p.z < ${(CHURCH_Z - 54).toFixed(1)});   // (the catacombs' two floors: north of the Sexton's Stair is the lower; src/core/church.js)
      let q = select(vec2f(p.x + p.z, p.y), p.xz, abs(n0.y) > 0.6);
      let m = textureSampleLevel(noiseTex, repeatSmp, q * 0.047, 0.0);
      // Old stone is never one colour: blotches of dark, and a drift between ochre and grey.
      albedo *= 0.72 + 0.56 * m.r;
      albedo = mix(albedo, albedo * vec3f(1.1, 0.96, 0.78), smoothstep(0.42, 0.58, m.g));
      // (Far off, a sharp highlight on bumpy stone is only sparkle.)
      rough = max(rough, 0.62 * smoothstep(7.0, 20.0, dist));
      if (!LEAN) {
        if (n0.y > 0.6) {
          // Where a floor dips, water stands: dark, smooth, and holding the flames.
          let s = textureSampleLevel(noiseTex, repeatSmp, q * 0.13 + 0.5, 0.0).b;
          let pool = smoothstep(0.6, 0.67, s + (0.5 - det.a) * 0.25);
          albedo *= 1.0 - 0.4 * pool;
          rough = mix(rough, 0.09, pool);
          n = normalize(mix(n, n0, pool * 0.92));
        } else if (n0.y > -0.4) {
          // Water comes down a wall in runs, and rises from the floor in a dark tide.
          let run = textureSampleLevel(noiseTex, repeatSmp, vec2f((p.x + p.z) * 0.29, p.y * 0.012), 0.0).b;
          let wet = smoothstep(0.54, 0.64, run);
          albedo *= 1.0 - 0.42 * wet;
          rough = mix(rough, 0.42, wet);
          let tide = smoothstep(0.0, 1.5, p.y - level + (m.a - 0.5) * 2.2);
          albedo *= mix(0.4, 1.0, tide);
          rough = mix(0.34, rough, tide);
        }
      }
    }
    if (params.z > 1.5) {
      // Stained glass with the day behind it.
      emissive = pow(albedo, vec3f(1.5)) * params.z * 1.6 * F.sunColor.a;
      albedo *= 0.05;
    } else if (params.z > 1.1) {
      // (The PH2 pack's lit leaded glass: a lamp behind it, warm, coming up as the light goes; by day a little of it.)
      let night = 1.0 - smoothstep(0.3, 0.9, F.sunColor.a);
      emissive = pow(albedo, vec3f(1.3)) * (0.35 + 2.6 * night);
      metal = 0.2; rough = 0.3;
    } else if (params.z > 0.0) {
      // Leaded glass reads as dark and glossy, and a fire is lit behind some of it.
      let glass = 1.0 - smoothstep(0.1, 0.26, det.b);
      let room = textureSampleLevel(noiseTex, repeatSmp, floor(uv * vec2f(5.0, 3.0)) * 0.137 + 0.11 * vec2f(in.f32Layer()), 0.0).r;
      let lit = smoothstep(0.48, 0.62, room);
      let flick = 0.86 + 0.14 * sin(F.camPos.w * 3.1 + room * 40.0);
      // (A window's one face looks out. Seen from indoors, its back, it's the day outside that comes through, or none at night.)
      emissive = select(glass * vec3f(0.85, 0.9, 1.0) * F.sunColor.a * 1.3, glass * lit * vec3f(1.9, 0.92, 0.3) * flick * mix(1.7, 0.75, F.skyAmb.a), front);
      metal = glass * 0.3;
    }
  }
  var shadow = shadowAt(p, n0, in.viewZ, ign(in.pos.xy));
  var c: vec3f;
  if (params.w > 0.0) {
    // Foliage: soft wrapped light, and the sun coming through from behind.
    let nl = dot(n0, F.sunDir.xyz);
    let wrap = clamp(nl * 0.6 + 0.4, 0.0, 1.0);
    let through = pow(clamp(dot(-v, F.sunDir.xyz), 0.0, 1.0), 3.0) * 0.8 + clamp(-nl, 0.0, 1.0) * 0.25;
    c = albedo * (F.sunColor.rgb * (wrap * 0.34 + through * vec3f(0.5, 0.65, 0.2)) * shadow + mix(F.groundAmb.rgb, F.skyAmb.rgb, n0.y * 0.5 + 0.5) * 0.9);
  } else {
    c = shadePBR(p, n, v, albedo, rough, metal, ao, shadow);
  }
  c += emissive;
  c = applyFog(c, p, -v, dist);
  o.color = vec4f(c, 1.0);
  return o;
}
`.replace('vec2f(in.f32Layer())', 'vec2f(f32(in.layer))');

// Shadow-pass pipelines share one tiny shader family.
export const SHADOW = /* wgsl */ `
struct U { m: mat4x4f, t: vec4f };
@group(0) @binding(0) var<uniform> U_: U;
@vertex fn vsPos(@location(0) p: vec3f) -> @builtin(position) vec4f { return U_.m * vec4f(p, 1.0); }
@vertex fn vsProp(@location(0) p: vec3f, @location(1) a: vec4f, @location(2) b: vec4f, @location(3) c: vec4f, @location(4) d: vec4f) -> @builtin(position) vec4f {
  return U_.m * mat4x4f(a, b, c, d) * vec4f(p, 1.0);
}
@vertex fn vsSkin(@location(0) p: vec4f) -> @builtin(position) vec4f { return U_.m * vec4f(p.xyz, 1.0); }
struct VC { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) @interpolate(flat) layer: u32 };
@vertex fn vsCut(@location(0) pIn: vec3f, @location(2) uv: vec2f, @location(3) layer: u32) -> VC {
  var o: VC;
  o.pos = U_.m * vec4f(pIn, 1.0); o.uv = uv; o.layer = layer;
  return o;
}
@group(1) @binding(0) var colorArr: texture_2d_array<f32>;
@group(1) @binding(1) var smp: sampler;
@group(1) @binding(2) var p2Color: texture_2d_array<f32>;
@fragment fn fsCut(in: VC) {
  // (The PH2 pack's from its own array: STATIC's layers 200 on.)
  let l = in.layer % 1000u;
  var a: f32;
  if (l >= 200u) { a = textureSampleLevel(p2Color, smp, in.uv, i32(l - 200u), 1.0).a; } else { a = textureSampleLevel(colorArr, smp, in.uv, i32(l), 1.0).a; }
  if (a < 0.5) { discard; }
}
`;

// Plate armour: painted atlas, wounds evaluated in bind space so they ride the plate exactly.
export const ARMOR = COMMON + /* wgsl */ `
struct Gash { a: vec4f, b: vec4f, n: vec4f, f: vec4f };
struct CharU { gash: array<Gash, 24>, masks: array<vec4u, 16>, info: vec4f };
@group(1) @binding(0) var<uniform> C: CharU;
@group(1) @binding(1) var albedoTex: texture_2d<f32>;
@group(1) @binding(2) var normalTex: texture_2d<f32>;
@group(1) @binding(3) var mrTex: texture_2d<f32>;

struct V {
  @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f,
  @location(3) bind: vec3f, @location(4) @interpolate(flat) piece: u32, @location(5) viewZ: f32, @location(6) bindN: vec3f,
};

@vertex fn vs(@location(0) sk: vec4f, @location(1) bindP: vec3f, @location(2) piece: u32, @location(3) uv: vec2f, @location(4) bindN: vec3f) -> V {
  var o: V;
  o.pos = F.viewProj * vec4f(sk.xyz, 1.0);
  o.p = sk.xyz;
  o.n = unpack4x8snorm(bitcast<u32>(sk.w)).xyz;
  o.uv = uv; o.bind = bindP; o.piece = piece; o.bindN = bindN;
  o.viewZ = -(F.view * vec4f(sk.xyz, 1.0)).z;
  return o;
}

fn h1(x: f32) -> f32 { return fract(sin(x * 127.1) * 43758.5453); }
fn vn1(x: f32) -> f32 { let i = floor(x); let f = fract(x); let u = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), u); }

struct Wound { h: f32, cut: f32, lip: f32, hole: f32, torn: f32, blood: f32, hot: f32, streak: f32, wall: f32 };

fn evalWounds(p: vec3f, nb: vec3f, piece: u32, time: f32, pxSize: f32) -> Wound {
  var w: Wound;
  var mask = C.masks[piece / 4u][piece % 4u];
  var guard_ = 0;
  loop {
    if (mask == 0u || guard_ >= 24) { break; }
    guard_++;
    let bi = firstTrailingBit(mask);
    mask &= mask - 1u;
    let g = C.gash[bi];
    let nn = g.n.xyz;
    let a = g.a.xyz;
    let ab = g.b.xyz - a;
    let L2 = dot(ab, ab);
    let rel = p - a;
    if (g.a.w < 0.0) {
      // Where a limb came away: blood thrown over the skin all round the joint, on both sides of it.
      let rr = length(rel);
      let q = rel / max(rr, 1e-4);
      let turn = atan2(q.x, q.z) * 3.0 + q.y * 7.0;
      let edge = -g.a.w * (0.5 + 0.7 * vn1(turn + f32(bi)) + 0.3 * vn1(turn * 3.7 + f32(bi)));
      let flecks = step(0.46, vn1(p.x * 70.0 + p.y * 31.0) * vn1(p.z * 70.0 - p.y * 43.0));
      let thrown = max(1.0 - smoothstep(edge * 0.8, edge, rr), flecks * (1.0 - smoothstep(edge, edge * 1.9, rr)));
      w.blood = max(w.blood, thrown);
      w.h += thrown * 0.0012;
      continue;
    }
    let t = clamp(dot(rel, ab) / max(L2, 1e-6), 0.0, 1.0);
    let dv = rel - ab * t;
    let dn = dot(dv, nn);
    if (dot(nb, nn) < -0.1 || abs(dn) > 0.075) { continue; }
    let L = sqrt(L2);
    let dist = length(dv - nn * dn);
    let along = t * L;
    let seed = f32(bi) * 7.3;
    // A sword's tear: narrow at both ends, ragged along its edges.
    let env = sqrt(max(sin(3.14159 * clamp(t, 0.015, 0.985)), 0.0));
    // (Flesh, info.w, opens wider than plate.)
    let width = g.a.w * (0.3 + 1.1 * env) * (1.0 + smoothstep(0.0, 0.1, L)) * (1.0 + C.info.w * 1.3);
    // Each side of a tear has its own edge: a mirrored one reads as teeth.
    let sideS = select(0.0, 19.0, dot(dv, cross(nn, ab / max(L, 1e-4))) > 0.0);
    let jag = (vn1(along * 30.0 + seed + sideS) - 0.5) * 0.7 * width + (vn1(along * 170.0 + seed + sideS) - 0.5) * 0.22 * width;
    let d = dist + jag;
    let cut = 1.0 - smoothstep(width * 0.55, width * 0.9, d);
    let lip = (1.0 - smoothstep(width * 0.9, width * 1.2, d)) * (1.0 - cut);
    // Fine scratches beside the cut, which melt to an even scuff once a pixel is wider than they are.
    // (Twice as wide on a phone, so its larger pixels can still hold them.)
    let stripes = smoothstep(0.45, 0.8, vn1(dot(p, cross(nn, ab / max(L, 1e-4))) * select(520.0, 260.0, LEAN) + seed));
    let scrape = (1.0 - smoothstep(width * 1.6, width * 5.0, d)) * mix(stripes, 0.3, smoothstep(0.001, 0.0025, pxSize * select(1.0, 0.5, LEAN)));
    let age = time - g.b.w;
    w.cut = max(w.cut, cut);
    w.lip = max(w.lip, lip);
    w.torn = max(w.torn, scrape * 0.6);
    w.h += -cut * 0.009 + lip * 0.0035;
    // The lips flash as the blade passes, and that's all: this is cold steel being torn, not cut with a torch.
    w.hot = max(w.hot, lip * exp(-age * 12.0));
    // One inner wall of the tear catches the light, which is what gives the slit its depth.
    let tang0 = ab / max(L, 1e-4);
    let side0 = dot(dv, cross(nn, tang0));
    w.wall = max(w.wall, cut * smoothstep(-0.1 * width, width * 0.5, side0));
    // On flesh the blow throws a splat of blood out round the slash, with flecks beyond it.
    if (C.info.w > 0.5) {
      let mid = rel - ab * 0.5;
      let su = dot(mid, tang0);
      let sv = dot(mid, cross(nn, tang0));
      let sr = length(vec2f(su * 0.75, sv));
      let turn = atan2(sv, su);
      let reach = (0.035 + 0.025 * h1(seed)) * (0.55 + 0.75 * vn1(turn * 2.7 + seed) + 0.35 * vn1(turn * 8.3 + seed));
      let flecks = step(0.46, vn1(su * 85.0 + seed) * vn1(sv * 85.0 + seed * 1.7));
      let splat = max(1.0 - smoothstep(reach * 0.8, reach, sr), flecks * (1.0 - smoothstep(reach, reach * 2.1, sr)));
      w.blood = max(w.blood, splat * smoothstep(0.0, 0.05, age));
      w.h += splat * 0.0012;
    }
    // A hole where the blade went through, and what comes out of it.
    if (g.n.w >= 0.0) {
      let t0 = g.f.w / max(L2, 1e-6);
      let rp = rel - ab * clamp(t0, 0.0, 1.0);
      let rr = length(rp - nn * dot(rp, nn));
      let tang = ab / max(L, 1e-4);
      let bit = cross(nn, tang);
      let ang = atan2(dot(rp, bit), dot(rp, tang));
      let pAge = time - g.n.w;
      let holeR = 0.02 + 0.012 * vn1(ang * 2.3 + seed) + 0.009 * vn1(ang * 7.1 + seed);
      let hole = 1.0 - smoothstep(holeR * 0.82, holeR, rr);
      let torn = (1.0 - smoothstep(holeR, holeR * 2.1, rr)) * (1.0 - hole);
      w.hole = max(w.hole, hole);
      w.torn = max(w.torn, torn);
      w.h += -hole * 0.018 + torn * 0.006 * vn1(ang * 5.0 + seed);
      // Rivers of blood running down the plate from the hole, lengthening with time.
      let down = g.f.xyz;
      let s = dot(rp, down);
      let side = dot(rp, cross(nn, down));
      let reach = min(pAge * 0.17 + 0.03, 0.75);
      var blood = (1.0 - smoothstep(holeR * 1.1, holeR * 2.6, rr)) * smoothstep(0.0, 0.25, pAge);
      for (var k = 0; k < 4; k++) {
        let fk = f32(k);
        let off = (fk - 1.5) * 0.017 + (vn1(s * 16.0 + fk * 3.1 + seed) - 0.5) * 0.024;
        let wid = (0.011 - 0.002 * fk) * (1.0 + 0.5 * vn1(s * 8.0 + fk));
        let tipAt = reach * (0.55 + 0.45 * h1(fk + seed));
        let stream = (1.0 - smoothstep(wid * 0.6, wid, abs(side - off))) * smoothstep(-0.015, 0.012, s) * (1.0 - smoothstep(tipAt - 0.012, tipAt, s));
        blood = max(blood, stream);
      }
      w.blood = max(w.blood, blood);
      w.h += blood * 0.0012;
      // The wider stain creeping out around it.
      w.streak = max(w.streak, (1.0 - smoothstep(0.0, 0.2 + pAge * 0.01, rr)) * 0.5);
    }
  }
  return w;
}

@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> Out {
  let p = in.p;
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  var n0 = normalize(in.n);
  if (!front) { n0 = -n0; }
  // A sharper mip of the paint on a phone, or fine work like the visor's grille averages away at its resolution.
  var albedo = textureSampleBias(albedoTex, repeatSmp, in.uv, select(0.0, -0.8, LEAN)).rgb;
  let mr = textureSample(mrTex, repeatSmp, in.uv);
  let nm = textureSample(normalTex, repeatSmp, in.uv);
  var rough = mr.g;
  var metal = mr.b;
  // The other Tessariels (info.z below zero; src/core/heroes.js): their metal was guessed from the paint when they were
  // built (tools/armor/rig_armor.py derive_pbr), so faces, hair, cloth and leather came out as polished metal. On them only
  // what's painted like steel or gilt is metal (on the plate classes, info.z -2, anything but skin and the darkest cloth;
  // -3 is in armour but not all steel, the dragoons and the boomerang knights: their paint as -1's, their gaps in mail).
  let heroLook = C.info.z < -0.5;
  if (heroLook) {
    let hi = max(albedo.r, max(albedo.g, albedo.b));
    let lo = min(albedo.r, min(albedo.g, albedo.b));
    let sat = (hi - lo) / max(hi, 1e-3);
    let skin = smoothstep(0.12, 0.2, sat) * (1.0 - smoothstep(0.55, 0.7, sat)) * smoothstep(0.22, 0.35, hi) * step(albedo.b, albedo.g) * step(albedo.g, albedo.r) * smoothstep(0.04, 0.12, albedo.r - albedo.b);
    let grey = (1.0 - smoothstep(0.08, 0.2, sat)) * smoothstep(0.16, 0.38, hi);
    let gilt = smoothstep(0.45, 0.6, sat) * smoothstep(0.3, 0.55, hi) * step(albedo.b, albedo.g) * step(albedo.g, albedo.r) * smoothstep(0.15, 0.3, albedo.r - albedo.b);
    let plate = select(max(grey, gilt), smoothstep(0.05, 0.14, hi), C.info.z < -1.5 && C.info.z > -2.5);
    metal = metal * plate * (1.0 - skin);
    rough = mix(max(rough, 0.68), rough, metal);
  }
  let pxSize = max(length(dpdx(in.bind)), length(dpdy(in.bind)));
  // (A hero's cloth is marked in its piece number, tools/heroes/mail.py CLOTH_BIT: nobody else's pieces reach it.)
  let isCloth = (in.piece & 0x4000u) != 0u;
  let wound = evalWounds(in.bind, normalize(in.bindN), in.piece & 0x3FFFu, F.camPos.w, pxSize);
  var n = perturb(n0, p, in.uv, nm.rg, 1.0);
  // Mail under the plates: rows of little rings, from the bind pose so they ride with the body. They melt to an
  // even dull steel with distance rather than sparkling.
  let isMail = in.uv.x > 1.5 && !heroLook;
  let ab_ = abs(normalize(in.bindN));
  let qA = select(select(in.bind.xy, in.bind.xz, ab_.y > ab_.z), in.bind.zy, ab_.x > ab_.y && ab_.x > ab_.z);
  // (Larger on a phone, or at its resolution they melt away, and a visor's grille with them.)
  let g_ = qA * vec2f(115.0, 200.0) * select(1.0, 0.5, LEAN);
  let ringFade = 1.0 - smoothstep(0.12, 0.35, max(length(dpdx(g_)), length(dpdy(g_))));
  // A hero's gap covers, in their own tube's coordinates (tools/heroes/mail.py: u past 2 is how far round, plus 2 on a
  // blackened suit; v how far along, plus 100 up inside a helm). Rings nine millimetres across round the tube, rows four
  // and a half apart; a padded coat's diamonds thirty. Worked out here, where derivatives may be taken.
  let isCover = in.uv.x > 1.5 && heroLook;
  let cu = in.uv.x - 2.0;
  // (A dyed hero's coat rides in info.z's fraction, herolook.js coverCode: plain and light is a pale suit, a paladin's
  // ivory. Its mail is bright and the insides of its plates a pale steel, whatever the body it was cut from was: in the
  // gaps of a blackened body's legs, and through the torn hem of an ivory cape, blackened iron was holes.)
  let zc = -C.info.z - floor(-C.info.z);
  let cc = round((zc - 0.01) / 0.0015);
  let paleCoat = heroLook && zc > 0.005 && cc % 4.0 > 1.5 && (floor(cc / 4.0) % 2.0) < 0.5;
  let darkBake = cu >= 2.0;
  let darkSuit = darkBake && !paleCoat;
  // (Deep or not: a step. As clamp(v / 100), a tube's own way along below came out at nought, less the very thing it's
  // measured by, and its rows of rings with it: close up, mail was all the dark between its rings, a black hole.)
  let deepK = select(0.0, 1.0, in.uv.y > 50.0);
  let tubeUV = vec2f(cu - select(0.0, 2.0, darkBake), in.uv.y - 100.0 * deepK);
  // (Rings fifteen millimetres across, larger than life, so they hold as rings a few strides off; past that their rows
  // still show as bands, rowFade, and past that it's an even dull iron.)
  let tg = tubeUV * vec2f(67.0, 134.0) * select(1.0, 0.6, LEAN);
  let tgPx = max(length(dpdx(tg)), length(dpdy(tg)));
  // (Rings only while each is some pixels across: down to a pixel and a half, crowns and the dark between them were a
  // black-and-white dot pattern that swam as the hero moved.)
  let tFade = (1.0 - smoothstep(0.2, 0.5, tgPx)) * select(0.0, 1.0, isCover);
  let rowFade = (1.0 - smoothstep(0.8, 2.2, tgPx)) * select(0.0, 1.0, isCover);
  let tq = tubeUV * 33.0 * select(1.0, 0.6, LEAN);
  let qFade = (1.0 - smoothstep(0.15, 0.4, max(length(dpdx(tq)), length(dpdy(tq))))) * select(0.0, 1.0, isCover);
  var mailH = 0.0;
  if (isMail) {
    let row = floor(g_.y);
    let cell = fract(vec2f(g_.x + row * 0.5, g_.y)) - 0.5;
    let rr = length(cell);
    let ring = smoothstep(0.2, 0.3, rr) * (1.0 - smoothstep(0.42, 0.5, rr));
    mailH = ring * 0.0022 * ringFade;
    albedo = mix(vec3f(0.14, 0.14, 0.15), mix(vec3f(0.07), vec3f(0.22, 0.22, 0.23), ring), ringFade);
    rough = 0.5;
    metal = 1.0;
    n = n0;
  }
  var rimK = 1.0;
  var backAO = 1.0;
  var coverEnv = 1.0;
  var paleIn = 0.0;
  if (isCover) {
    // A hero's gap covers (tools/heroes/mail.py): what shows where the plates part, and where a suit has no plate at
    // all. Laid out round each tube (cu: metres round it, uv.y: metres along it). On those in armour (info.z -2, -3)
    // it's mail: steel crowns, dark between them, a step brighter than the plate (bright mail on a bright suit,
    // blackened on a blackened one), so a gap reads as steel under steel, never as a hole or as grey rubber. On the
    // rest (-1) it's the padded coat under their clothes: dark linen quilted in diamonds.
    if (C.info.z < -1.5) {
      let row = floor(tg.y);
      let cell = fract(vec2f(tg.x + row * 0.5, tg.y)) - 0.5;
      let rr = length(cell);
      // (Its edges as soft as a pixel is wide, so a ring a few pixels across is drawn, not sampled.)
      let rw = min(0.1, 0.5 * tgPx);
      let ring = smoothstep(0.2 - rw, 0.3 + rw, rr) * (1.0 - smoothstep(0.42 - rw, 0.5 + rw, rr));
      // (Each ring catches the light a little differently: that sparkle is what says mail from a way off.)
      let jit = h1(row * 7.31 + floor(tg.x + row * 0.5) * 3.17);
      mailH = ring * 0.0012 * tFade;
      // (The dark between the rings not a black: at 0.015 under crowns of 0.4 it was the most contrast on the hero, and
      // it shimmered. A pale suit's a step lighter again, crowns and all: its mail was the darkest thing on an ivory suit.)
      let crown = select(select(vec3f(0.40, 0.40, 0.41), vec3f(0.48, 0.48, 0.47), paleCoat), vec3f(0.14, 0.14, 0.15), darkSuit);
      let gap = select(select(vec3f(0.05), vec3f(0.09), paleCoat), vec3f(0.015), darkSuit);
      // (Melted: a stop under the plate beside it, its rows still banding it light and dark.)
      let band = 1.0 + 0.25 * (abs(fract(tg.y * 0.5) - 0.5) * 4.0 - 1.0) * rowFade;
      let melt = select(select(vec3f(0.3, 0.3, 0.305), vec3f(0.36, 0.36, 0.355), paleCoat), vec3f(0.06, 0.06, 0.062), darkSuit) * band;
      albedo = mix(melt, mix(gap, crown, ring), tFade);
      rough = mix(0.6, mix(0.9, 0.25 + 0.2 * jit, ring), tFade);
      metal = mix(select(0.25, 0.4, darkSuit), ring, tFade);
      coverEnv = select(0.6, 0.4, darkSuit);
    } else {
      let s1 = abs(fract(tq.x + tq.y) - 0.5);
      let s2 = abs(fract(tq.x - tq.y) - 0.5);
      // (Each diamond puffed up between its lines of stitching.)
      let puff = smoothstep(0.0, 0.22, min(s1, s2));
      mailH = puff * 0.0016 * qFade;
      // (A dyed party member's padded coat is in their coat's colour and about its light, or a brown linen under a navy coat
      // is a stain at the hips. Its colour rides in info.z's fraction, a code: hue in 32, colour in 2, light in 4. herolook.js
      // coverCode. None: the brown linen.)
      var linen = vec3f(0.07, 0.05, 0.035);
      let zf = -C.info.z - floor(-C.info.z);
      if (zf > 0.005) {
        let code = round((zf - 0.01) / 0.0015);
        let hh = floor(code / 8.0) / 32.0;
        let sk = select(0.15, 0.4, (floor(code / 4.0) % 2.0) > 0.5);
        let li = code % 4.0;
        let lk = select(select(select(0.035, 0.06, li > 0.5), 0.1, li > 1.5), 0.16, li > 2.5);
        let tint = mix(vec3f(1.0), clamp(abs(fract(hh + vec3f(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, vec3f(0.0), vec3f(1.0)), sk);
        linen = tint * (lk / max(dot(tint, vec3f(0.2126, 0.7152, 0.0722)), 0.05));
      }
      albedo = linen * mix(0.93, 0.85 + 0.15 * puff, qFade);
      rough = 0.8;
      metal = 0.0;
    }
    rimK = 0.5;
    // Up inside a helm (deep), or the inside of a cover: shadow, so an open helm is a dark opening and not a face of mail.
    // (The inside of a cover, a skirt's or a gusset's, is its own stuff in shadow, not a black cutout.)
    albedo = mix(albedo, vec3f(0.01), deepK);
    rough = mix(rough, 1.0, deepK);
    metal = mix(metal, 0.0, deepK);
    let inside = select(1.0, 0.0, front);
    albedo = albedo * mix(1.0, 0.4, inside);
    metal = metal * (1.0 - inside);
    rimK = rimK * (1.0 - max(deepK, inside));
    backAO = mix(1.0, 0.2, deepK) * mix(1.0, 0.5, inside);
    coverEnv = coverEnv * (1.0 - max(deepK, inside));
    mailH = mailH * (1.0 - deepK);
    n = n0;
  } else if (heroLook && !front && !isCloth) {
    // The inside of a plate, seen where it's parted from the next: raw dark iron on those in armour, a dark lining on the
    // rest, and in its own shadow. (Painted as its outside, a plate read paper-thin, bright where the eye wants shadow.)
    // (A pale suit's, paleCoat, is a pale lining: as steel, in its own shadow it took no light but its reflection's.)
    // (And it has a little light of its own: where a piece cut from another body leaves a hole into the hollow suit, its
    // far inside, wholly in shadow, was a black void in ivory.)
    if (C.info.z < -1.5 && paleCoat) { albedo = vec3f(0.46, 0.45, 0.43); metal = 0.0; rough = 0.85; paleIn = 1.0; }
    else if (C.info.z < -1.5) { albedo = vec3f(0.10, 0.098, 0.095); metal = 1.0; rough = 0.6; }
    else { albedo = albedo * 0.35; metal = 0.0; rough = 0.85; }
    backAO = 0.45;
    rimK = 0.3;
    n = n0;
  } else if (heroLook && !front && paleCoat) {
    // (A pale suit's cloth seen from inside, where a tabard or a cape turns: its own cream, with a little light of its own.
    // Its normal turned to the eye, it took the ground's light, and the inside of an ivory tabard was a grey hole in it.)
    paleIn = 0.5;
  }
  if (in.uv.x < -1.5) {
    // A stump: the cap inside a limb that shows once what was beyond it has gone. Bone at the middle, meat round it, blackening at the rim.
    let rad = -2.0 - in.uv.x;
    albedo = mix(mix(vec3f(0.62, 0.56, 0.45), vec3f(0.3, 0.025, 0.025), smoothstep(0.16, 0.24, rad)), vec3f(0.06, 0.008, 0.008), smoothstep(0.72, 1.0, rad));
    rough = mix(0.45, 0.28, smoothstep(0.16, 0.24, rad));
    metal = 0.0;
    n = n0;
  }
  n = bumpNormal(n, p, wound.h + mailH);
  // Metals take their reflection tint from the paint. Even blackened steel reflects at about a fifth, which keeps the
  // plates' shapes readable against a bright sky instead of leaving a cutout.
  // Dark paint is neutral blackened steel with a tighter highlight, so the black knight stays black in full sun.
  let paint = dot(albedo, vec3f(0.2126, 0.7152, 0.0722));
  let steelK = max(C.info.z, 0.0);
  let darkPaint = (1.0 - smoothstep(0.06, 0.2, paint)) * metal * (1.0 - steelK) * select(1.0, 0.0, heroLook);
  albedo = mix(albedo, vec3f(paint), darkPaint * 0.75);
  albedo = mix(albedo, max(albedo * 0.85 + 0.015, vec3f(0.07, 0.068, 0.066) * mix(1.0, 3.4, steelK)), metal);
  rough = mix(rough, max(rough, mix(0.34, 0.22, darkPaint)), metal);
  // (No plastic sheen: shaders.js matteRough. The black knight's dark steel keeps its tighter highlight.)
  rough = max(matteRough(rough, metal) - 0.2 * darkPaint, rough);
  envBoost = mix(1.0, 1.1, metal) * coverEnv;
  sunSpecScale = mix(1.0, 0.55, darkPaint);
  // A townsperson's palette swap, in the shader (src/gfx/folk.js swapCode): info.x of ten and over is 10 + hue shift (0 to 1)
  // + 2 * saturation (tenths) + 32 * value (tenths). Clothes and hair moved in hue a little, and dulled or darkened; skin, by
  // its colour, left as it is. Never blue: whatever a shift would make blue goes grey instead (no blue beside gold).
  // A swap dyed (info.x of a thousand and over: src/gfx/folk.js swapCode with a dye): its cloth taken out of the colours it was
  // made in altogether. The dark of it (coats, breeches, hoods) dyed one colour and the light of it (shirts, aprons, coifs)
  // another, of sixteen a dyer's vat in Phobos might give and none of them blue; greys and blacks take the dye too, so a black
  // coat comes out oxblood or moss or plum; how strongly, and how dark it's all worn. Its grain, its folds and its dirt
  // kept (the value's the cloth's own). Skin left as it is, as in the plainer swap below.
  if (C.info.x >= 1000.0) {
    let code0 = C.info.x - 1000.0;
    let hq = floor(code0 / 131072.0);
    let code = code0 - hq * 131072.0;
    let vq = floor(code / 1024.0);
    let r1 = code - vq * 1024.0;
    let aq = floor(r1 / 256.0);
    let r2 = r1 - aq * 256.0;
    let lq = floor(r2 / 16.0);
    let dq = r2 - lq * 16.0;
    var DYES = array<f32, 16>(0.0, 0.025, 0.05, 0.075, 0.1, 0.125, 0.16, 0.2, 0.26, 0.32, 0.38, 0.8, 0.85, 0.9, 0.94, 0.97);
    let hd = DYES[u32(dq)];
    let hl = DYES[u32(lq)];
    let amt = (aq + 1.0) / 4.0;
    let vs = 0.55 + vq * 0.05;
    let mx = max(albedo.r, max(albedo.g, albedo.b));
    let mn = min(albedo.r, min(albedo.g, albedo.b));
    let dl = mx - mn;
    var hh = 0.0;
    if (dl > 1e-4) {
      if (mx == albedo.r) { hh = (albedo.g - albedo.b) / dl; } else if (mx == albedo.g) { hh = 2.0 + (albedo.b - albedo.r) / dl; } else { hh = 4.0 + (albedo.r - albedo.g) / dl; }
      hh = fract(hh / 6.0 + 1.0);
    }
    let sat = select(0.0, dl / mx, mx > 1e-4);
    let skin = (1.0 - smoothstep(0.055, 0.07, hh)) * smoothstep(0.3, 0.42, sat) * (1.0 - smoothstep(0.8, 0.88, sat)) * smoothstep(0.02, 0.07, mx);
    let light = smoothstep(0.07, 0.2, mx);
    let ns = clamp(mix(sat, mix(0.62, 0.42, light), amt), 0.0, 0.85);
    let nv = max(mx, 0.025 + 0.025 * amt) * vs;
    let kd = vec3f(5.0, 3.0, 1.0) + hd * 6.0;
    let kl = vec3f(5.0, 3.0, 1.0) + hl * 6.0;
    let rd = nv - nv * ns * clamp(min(fract(kd / 6.0) * 6.0, 4.0 - fract(kd / 6.0) * 6.0), vec3f(0.0), vec3f(1.0));
    let rl = nv - nv * ns * clamp(min(fract(kl / 6.0) * 6.0, 4.0 - fract(kl / 6.0) * 6.0), vec3f(0.0), vec3f(1.0));
    // (Nor the head's own: its hair keeps the colour it grew. Marked in the piece's top bit, src/folk/hats.js HEAD_BIT.)
    let head = select(0.0, 1.0, (in.piece & 0x8000u) != 0u);
    // (Unless it's to be another colour: hq, one of seven a head of hair comes in. Its own light and dark kept as the grain
    // of it; not its skin, nor anything pale on it, the whites of the eyes, teeth, a white beard's own white.)
    var HAIR = array<vec3f, 8>(vec3f(0.0), vec3f(0.012, 0.010, 0.009), vec3f(0.035, 0.019, 0.011), vec3f(0.085, 0.036, 0.016),
      vec3f(0.15, 0.045, 0.018), vec3f(0.26, 0.19, 0.095), vec3f(0.17, 0.165, 0.16), vec3f(0.42, 0.41, 0.39));
    let hairTo = HAIR[u32(hq)] * clamp(sqrt(mx / 0.06), 0.45, 1.7);
    let hairK = head * (1.0 - skin) * select(0.0, 1.0, hq > 0.5) * (1.0 - smoothstep(0.22, 0.38, mx));
    albedo = mix(mix(mix(rd, rl, light), albedo, max(skin, head)), hairTo, hairK);
  } else if (C.info.x >= 10.0) {
    let code = C.info.x - 10.0;
    let vi = floor(code / 32.0);
    let rem = code - vi * 32.0;
    let si = floor(rem / 2.0);
    let dh = rem - si * 2.0;
    let mx = max(albedo.r, max(albedo.g, albedo.b));
    let mn = min(albedo.r, min(albedo.g, albedo.b));
    let dl = mx - mn;
    var hh = 0.0;
    if (dl > 1e-4) {
      if (mx == albedo.r) { hh = (albedo.g - albedo.b) / dl; } else if (mx == albedo.g) { hh = 2.0 + (albedo.b - albedo.r) / dl; } else { hh = 4.0 + (albedo.r - albedo.g) / dl; }
      hh = fract(hh / 6.0 + 1.0);
    }
    let sat = select(0.0, dl / mx, mx > 1e-4);
    let skin = (1.0 - smoothstep(0.055, 0.07, hh)) * smoothstep(0.3, 0.42, sat) * (1.0 - smoothstep(0.8, 0.88, sat)) * smoothstep(0.02, 0.07, mx);
    var nh = fract(hh + dh - select(0.0, 1.0, dh > 0.5));
    var ns = clamp(sat * si / 10.0, 0.0, 1.0);
    ns *= 1.0 - 0.8 * smoothstep(0.46, 0.52, nh) * (1.0 - smoothstep(0.7, 0.76, nh));
    let nv = mx * vi / 10.0;
    let k6 = vec3f(5.0, 3.0, 1.0) + nh * 6.0;
    let rgb = nv - nv * ns * clamp(min(fract(k6 / 6.0) * 6.0, 4.0 - fract(k6 / 6.0) * 6.0), vec3f(0.0), vec3f(1.0));
    albedo = mix(rgb, albedo, skin);
  }
  albedo *= C.info.y;
  // Bright scraped steel at the cut's lips and scratches.
  let bare = max(wound.lip, wound.torn);
  // (On anything with no steel on it, info.w, the lips of the cut are wet meat.)
  albedo = mix(albedo, mix(vec3f(0.72, 0.7, 0.67), vec3f(0.26, 0.025, 0.025), C.info.w), bare * 0.9);
  rough = mix(rough, 0.26, bare);
  metal = mix(metal, 1.0 - C.info.w, bare);
  // Inside the cut: a dark slit, with one torn inner wall catching the light.
  albedo = mix(albedo, mix(vec3f(0.012), vec3f(0.2, 0.19, 0.18), wound.wall * 0.7), wound.cut * 0.97);
  rough = mix(rough, 0.6, wound.cut);
  var ao = (1.0 - wound.cut * 0.55) * backAO;
  // The hole shows wet dark flesh.
  let pulse = 0.5 + 0.5 * sin(select(C.info.x, 0.0, C.info.x >= 10.0) * 6.28318);
  albedo = mix(albedo, vec3f(0.16, 0.006, 0.006) * (0.7 + 0.5 * pulse), wound.hole);
  rough = mix(rough, 0.09, wound.hole);
  metal = mix(metal, 0.0, wound.hole);
  ao *= 1.0 - wound.hole * 0.6;
  // Blood over everything else.
  // (Not on a stump's cut face: that keeps its bone.)
  let blood = select(max(wound.blood, wound.streak * 0.0), 0.0, in.uv.x < -1.5);
  albedo = mix(albedo, vec3f(0.20, 0.006, 0.006), blood);
  rough = mix(rough, 0.11, blood);
  metal = mix(metal, 0.0, blood);
  albedo = mix(albedo, albedo * vec3f(0.78, 0.5, 0.48), wound.streak * (1.0 - blood));
  // Plate that turns within one of a phone's pixels can't hold a sharp highlight: it would only sparkle.
  if (LEAN) { rough = max(rough, min(length(fwidth(n0)) * 1.1, 0.7)); }
  else {
    // (And on a PC, the same trouble at its own size: a body far off, or a plate's rim, turns through more than a pixel can
    // show, and its highlight flickers on and off from frame to frame, which no smoothing of edges mends. The highlight is
    // widened by how far the surface turns across the pixel, and no further than a little: Tokuyoshi and Kaplanyan's
    // filter. Up close, where a plate is many pixels of one facing, it changes nothing.)
    let nx = dpdx(n0); let ny = dpdy(n0);
    rough = sqrt(min(rough * rough + min(0.5 * (dot(nx, nx) + dot(ny, ny)), 0.18), 1.0));
  }
  let shadow = shadowAt(p, n0, in.viewZ, ign(in.pos.xy));
  var c = shadePBR(p, n, v, albedo, rough, metal, ao, shadow);
  // Bright torn lips stay findable at fighting range, and flash for an instant as the blade goes by.
  c += vec3f(0.17, 0.165, 0.155) * wound.lip * (0.45 + 0.55 * max(dot(n, F.sunDir.xyz), 0.0));
  c += vec3f(5.0, 2.6, 0.9) * wound.hot;
  // What the body's maps mark as lit of itself: the metal/rough map's alpha, which every body's is whole but the possessed
  // knights' eyes (tools/monsters/possessed_knights.py). It's this red and not the paint's, so no palette washes it out,
  // and it's bright enough to bloom: the eyes show across a dark hall. (Much brighter and the tone curve washes it to white:
  // seen in the game at 11, a pale streak.)
  c += vec3f(5.2, 0.13, 0.035) * (1.0 - mr.a) * (0.85 + 0.15 * sin(F.camPos.w * 5.0));
  // A cool edge of sky around the silhouette separates dark plate from anything behind it.
  let rimT = pow(1.0 - max(dot(n0, v), 0.0), 4.0) * select(1.0, smoothstep(0.0, 0.14, dot(n0, v)), LEAN);
  // (Below there's no sky: firelight, on bare flesh as much as plate, so a body comes off a dark wall.)
  let rimIn = indoorAt(p);
  // (Outdoors it's a faint edge on cloth and skin, which is what keeps them from looking wet; more on plate.)
  c += select(select(select(F.skyAmb.rgb * 0.24 * (0.15 + 0.85 * metal), vec3f(0.5, 0.31, 0.17), rimIn > 1.5), vec3f(0.3, 0.31, 0.33), rimIn > 2.5), vec3f(0.44, 0.3, 0.66), rimIn > 3.5) * rimT * C.info.y * rimK;
  // (A hero's painted plate is all metal to the light, so its shaded side had only what it mirrored, which in a wood is
  // dark: a black shape with no plates in it. A share of the sky's and the ground's light on its paint, as a worn, rough
  // surface scatters it.)
  if (heroLook) { c += albedo * mix(F.groundAmb.rgb, F.skyAmb.rgb, 0.5 + 0.5 * n.y) * (0.42 * metal) * ao; }
  c += albedo * mix(F.groundAmb.rgb, F.skyAmb.rgb, 0.5) * 0.8 * paleIn;
  c = applyFog(c, p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

// Model-true shading (docs/RENDERING.md, "Model-true shading"): the character shader above with two things changed,
// for a body whose model should look as its maker made it. Only Lisandra's two forms use it (renderer.js `trueLook`);
// every other body is drawn with ARMOR exactly as it was.
// (Her normal map is read the glTF way, as everyone's is: perturbD() in shaders.js does that for every shader now. It
// used to turn green over here, on top of a frame that already had it right, which lit her folds upside down.)
// 1. No knight's steel. ARMOR greys dark paint that's partly metal into blackened plate, darkens metal's paint and
//    floors its roughness. A Tripo texture marks leather, hair and cloth partly metal, so that greyed and dulled her.
//    Here the paint, roughness and metal are used as the texture has them.
// 2. The sky's reflection by the split-sum approximation: an analytic fit of the reflectance (Karis 2014, "Physically
//    Based Shading on Mobile") with the energy a rough surface loses to single scattering given back (Fdez-Agüera 2019),
//    the diffuse keeping only what the reflection leaves, and the sky's own colour. That is how a glTF viewer (three.js,
//    which Tripo's site runs on) lights a model. The scene's ambient, sun, lamps, shadows and fog are the same as
//    everyone's, so she still stands in the same light as the people round her.
// Her face has no inside to the mouth, so as her jaw turns down (tools/lisandra/jaw_rig.py) only the few triangles across
// the painted line between her lips stretch. mouth.x > 0 while she speaks: then of those triangles, a lens round the line
// in bind space (lip: y0 - k (x - mid)^2; mouth.w half as wide as her mouth, mouth.y half as tall as the gap she's
// opened, on her front past z = mouth.z) is the dark inside of her mouth.
export const MOUTH_WGSL = `  if (C.mouth.x > 0.0 && in.bind.z > C.mouth.z) {
    let mx = in.bind.x - C.lip.z;
    let lens = C.mouth.y * (1.0 - mx * mx / (C.mouth.w * C.mouth.w));
    if (lens > 1e-5) {
      let deep = 1.0 - abs(in.bind.y - (C.lip.x - C.lip.y * mx * mx)) / lens;
      let inside = smoothstep(0.0, 0.45, deep) * C.mouth.x;
      albedo = mix(albedo, mix(vec3f(0.075, 0.022, 0.02), vec3f(0.012, 0.004, 0.004), smoothstep(0.3, 1.0, deep)), inside);
      rough = mix(rough, 0.85, inside);
      metal = mix(metal, 0.0, inside);
    }
  }
`;

const TRUE_SWAPS = [
  [/\/\/ Metals take their reflection tint from the paint\.[\s\S]*?sunSpecScale = mix\(1\.0, 0\.55, darkPaint\);/, '// (No knight\'s steel: the paint, roughness and metal as the texture has them.)\n  envBoost = 1.0;\n  sunSpecScale = 1.0;'],
  ['var c = shadePBR(p, n, v, albedo, rough, metal, ao, shadow);', 'var c = shadeTrue(p, n, v, albedo, rough, metal, ao, shadow);'],
  // The witch's mouth (renderer.js writes mouth and lip; zero for anyone without a jaw).
  ['info: vec4f };', 'info: vec4f, mouth: vec4f, lip: vec4f };'],
  ['  albedo *= C.info.y;\n', '  albedo *= C.info.y;\n' + MOUTH_WGSL],
];

const SHADE_TRUE = /* wgsl */ `
// The split-sum's reflectance: of the light a mirror direction brings, what a surface this rough sends back at this
// angle, as a scale and bias on f0 (Karis 2014's fit to the integral).
fn envDFG(rough: f32, nv: f32) -> vec2f {
  let c0 = vec4f(-1.0, -0.0275, -0.572, 0.022);
  let c1 = vec4f(1.0, 0.0425, 1.04, -0.04);
  let r = rough * c0 + c1;
  let a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
  return vec2f(-1.04, 1.04) * a004 + r.zw;
}

// shadePBR, with the reflection done by the split-sum and the sky's own colour. The sun, the scene's ambient, the
// indoor and cave rules and the lamps are shadePBR's, line for line.
fn shadeTrue(p: vec3f, n: vec3f, v: vec3f, albedo: vec3f, rough: f32, metal: f32, ao: f32, shadow: f32) -> vec3f {
  let f0 = mix(vec3f(0.04), albedo, metal);
  let indoor = indoorAt(p);
  let cave = caveAt(p);
  var c = vec3f(0.0);
  if (indoor < 0.5 && cave < 0.99) { c = brdf(n, v, F.sunDir.xyz, albedo, f0, rough, metal) * F.sunColor.rgb * shadow * (1.0 - cave); }
  if (indoor > 3.5) { c = voidKeys(n, v, albedo, f0, rough, metal) * voidTint(p, 0.0); }
  let up = n.y * 0.5 + 0.5;
  var ambient = mix(F.groundAmb.rgb, F.skyAmb.rgb, up);
  if (indoor > 3.5) { ambient = voidAmbient(up) * voidTint(p, 1.0); }
  else if (indoor > 2.5) { ambient = mix(vec3f(0.36, 0.36, 0.38), vec3f(0.82, 0.83, 0.86), up); }
  else if (indoor > 1.5) { ambient = select(select(vec3f(0.044, 0.044, 0.048), vec3f(0.095, 0.078, 0.064), indoor > 2.1), vec3f(0.15, 0.105, 0.085), indoor > 2.2); } else if (indoor > 0.5) { ambient = mix(vec3f(0.12, 0.095, 0.08), vec3f(0.2, 0.19, 0.22), up); }
  if (indoor > 1.1 && indoor < 1.5) { ambient *= mix(0.25, 1.0, clamp((F.sunColor.a - 0.1) / 0.9, 0.0, 1.0)); }
  ambient = mix(ambient, F.caveAmb.rgb * mix(0.7, 1.15, up), cave);
  let nv = max(dot(n, v), 1e-3);
  let refl = reflect(-v, n);
  let toSun = max(dot(refl, F.sunDir.xyz), 0.0);
  var env = F.skyAmb.rgb * vec3f(0.24, 0.29, 0.26) + F.sunColor.rgb * 0.045 * toSun * toSun;
  // (The sky's picture, as blurred as a surface this rough sees it. On a phone only metal reads it, as in shadePBR.)
  if (!LEAN || metal > 0.02) { env = envDir(refl, rough * 7.0); }
  let horizon = smoothstep(-0.25, 0.12, refl.y);
  var reflected = mix(F.groundAmb.rgb * 0.8, env, horizon);
  // (In the keep's lit halls, 2.25, plate takes a warm sheen off the fires: Velscour's knights are blackened steel, which
  // takes no other light, and against dark stone they were shapes cut out of the room.)
  if (indoor > 3.5) { reflected = mix(vec3f(0.02, 0.012, 0.035), voidEnv(refl), horizon); }
  else if (indoor > 0.5) { reflected *= select(select(vec3f(0.22), select(vec3f(0.05), vec3f(0.17, 0.11, 0.075), indoor > 2.2), indoor > 1.5), vec3f(0.5), indoor > 2.5); }
  reflected *= mix(1.0, 0.06, cave);
  let dfg = envDFG(rough, nv);
  let fss = f0 * dfg.x + dfg.y;
  let ems = 1.0 - (dfg.x + dfg.y);
  let favg = f0 + (vec3f(1.0) - f0) / 21.0;
  let fms = fss * favg / (vec3f(1.0) - ems * favg);
  // (On a phone the very edge-on sheen goes, as in shadePBR: a low resolution can't hold it.)
  let spec = (fss + fms * ems) * select(1.0, smoothstep(0.0, 0.14, nv), LEAN);
  let sunOcc = mix(0.55, 1.0, shadow);
  c += albedo * (1.0 - metal) * (vec3f(1.0) - spec) * ambient * ao;
  c += reflected * spec * ao * sunOcc;
  let nl = i32(F.counts.x);
  for (var i = 0; i < nl; i++) {
    let L = F.lights[i];
    let d = L.posR.xyz - p;
    let d2 = dot(d, d);
    let r = L.posR.w;
    if (d2 > r * r) { continue; }
    let att = pow(max(1.0 - d2 / (r * r), 0.0), 2.0) / max(d2, 0.25);
    c += brdf(n, v, normalize(d), albedo, f0, rough, metal) * L.colI.rgb * L.colI.w * att;
  }
  return c;
}
`;

// ARMOR with the swaps made, and shadeTrue added. Throws if ARMOR has changed so that a swap no longer finds its line.
function trueShader(src) {
  let out = src;
  for (const [from, to] of TRUE_SWAPS) {
    const next = out.replace(from, to);
    if (next === out) throw new Error(`ARMOR_TRUE: no match for ${String(from).slice(0, 60)}`);
    out = next;
  }
  return out + SHADE_TRUE;
}
export const ARMOR_TRUE = trueShader(ARMOR);

// The smith's kit (src/gfx/folktools.js): his tools, the iron in the tongs, the coals, the axe on its rack. The bodies' own
// shading, but what the metal/rough map's alpha marks as lit of itself is lit in its own paint's colour and not the possessed
// knights' red, by as much as info.x says (0 to 1): cold, it's as dark as iron black from the fire; coming up, it's a dull
// deep shade of its paint, and at the top its paint's own colour and bright enough to bloom. So the one sum does iron in
// the fire (dull red to yellow) and the runes cut in the axe (a low green to the colour of ice).
export const ARMOR_KIT = (() => {
  let out = ARMOR;
  for (const [from, to] of [
    ['  var rough = mr.g;\n  var metal = mr.b;\n', '  var rough = mr.g;\n  var metal = mr.b;\n  let kitLit = 1.0 - mr.a;\n  let kitPaint = albedo;\n  albedo = mix(albedo, vec3f(0.022, 0.02, 0.019), kitLit);\n'],
    ['  c += vec3f(5.2, 0.13, 0.035) * (1.0 - mr.a) * (0.85 + 0.15 * sin(F.camPos.w * 5.0));\n', '  c += kitPaint * mix(vec3f(1.0, 0.3, 0.1), vec3f(1.0), C.info.x) * (kitLit * C.info.x * C.info.x * 7.0);\n'],
  ]) {
    const next = out.replace(from, to);
    if (next === out) throw new Error(`ARMOR_KIT: no match for ${from.slice(0, 50)}`);
    out = next;
  }
  return out;
})();

// Swords and shields in hand: instanced rigid meshes.
export const PROP = COMMON + /* wgsl */ `
struct PU { glint: vec4f };
@group(1) @binding(0) var albedoTex: texture_2d<f32>;
@group(1) @binding(1) var<uniform> P: PU;
struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) viewZ: f32, @location(4) local: vec3f };
@vertex fn vs(@location(0) pIn: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(5) a: vec4f, @location(6) b: vec4f, @location(7) c: vec4f, @location(8) d: vec4f) -> V {
  let m = mat4x4f(a, b, c, d);
  let w = m * vec4f(pIn, 1.0);
  var o: V;
  o.pos = F.viewProj * w; o.p = w.xyz; o.n = (m * vec4f(n, 0.0)).xyz; o.uv = uv; o.local = pIn;
  o.viewZ = -(F.view * w).z;
  return o;
}
@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> Out {
  let toCam = F.camPos.xyz - in.p;
  let dist = length(toCam);
  let v = toCam / dist;
  var n = normalize(in.n);
  if (!front) { n = -n; }
  let tex = textureSampleBias(albedoTex, repeatSmp, in.uv, select(0.0, -0.8, LEAN));
  var albedo = tex.rgb;
  let mx = max(max(albedo.r, albedo.g), albedo.b);
  let sat = (mx - min(min(albedo.r, albedo.g), albedo.b)) / max(mx, 0.001);
  // (A painted prop's metal is its own steel's, guessed before it was painted (herolook.js prop): by its paint, a
  // bleached board, all white and pale grey, was all steel, a mirror of the ground in every facet, a brown stain.)
  let metal = select((1.0 - smoothstep(0.15, 0.4, sat)) * smoothstep(0.1, 0.26, mx), tex.a, P.glint.y > 0.5);
  let rough = mix(0.72, 0.45, metal);
  albedo = mix(albedo, albedo * 1.15 + 0.05, metal);
  let shadow = shadowAt(in.p, n, in.viewZ, ign(in.pos.xy));
  var c = shadePBR(in.p, n, v, albedo, rough, metal, 1.0, shadow);
  // A cold flash along the blade just before it falls.
  c += vec3f(9.0, 9.5, 11.0) * P.glint.x * smoothstep(0.1, 0.62, in.local.y) * metal;
  c = applyFog(c, in.p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

// Swords and gems lying in the world, on the same maps as in the hand.
export const ITEM = COMMON + /* wgsl */ `
struct IU { glow: vec4f };
@group(1) @binding(0) var<uniform> I: IU;
@group(1) @binding(1) var albedoTex: texture_2d<f32>;
@group(1) @binding(2) var normalTex: texture_2d<f32>;
@group(1) @binding(3) var mrTex: texture_2d<f32>;
struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) viewZ: f32 };
@vertex fn vs(@location(0) pIn: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(5) a: vec4f, @location(6) b: vec4f, @location(7) c: vec4f, @location(8) d: vec4f) -> V {
  let m = mat4x4f(a, b, c, d);
  let w = m * vec4f(pIn, 1.0);
  var o: V;
  o.pos = F.viewProj * w; o.p = w.xyz; o.n = (m * vec4f(n, 0.0)).xyz; o.uv = uv;
  o.viewZ = -(F.view * w).z;
  return o;
}
@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> Out {
  if (I.glow.a < -1.5) {
    // A portal's whirl (src/gfx/renderer.js portalModels): the face the owner painted it on, drawn moving. uv is the face's place
    // in the model (tools/portal/pack.py), glow.xy the whirl's middle there and glow.z its radius. a -2: the Warrens' portal,
    // a funnel going back into its wall, seen from the front; a -3: a seal's, a disc lying in its dais, seen from over it.
    // A whirl that winds down into a deep blue well: wide arms of blue and a finer counter-turning weave of violet-white over
    // them, rings of light falling away inward, clouds carried round, sparks carried round and in, a white heart that
    // breathes, now and then a crackle of lightning across it, and a hot rim that flickers like a held flame.
    let t = F.camPos.w;
    // (a -4: the Warrens' way out while its last boss lives, gone out: a dark, still well, no blue in it.)
    let dead = I.glow.a < -3.5;
    let lying = I.glow.a < -2.5 && !dead;
    // (a -2.25: the same whirl in Velscour's red, the Redoubt under the Sill's: its blues turned to embers.)
    let ember = abs(I.glow.a + 2.25) < 0.1;
    let d = (in.uv - I.glow.xy) / I.glow.z;
    let r = length(d);
    let a = atan2(d.y, d.x);
    let lr = log(r + 0.02);
    let w1 = a + lr * 2.6 - t * 1.5;
    let n1 = textureSampleLevel(noiseTex, repeatSmp, vec2f(cos(w1), sin(w1)) * 0.23 + vec2f(lr * 0.35 - t * 0.11, t * 0.03), 0.0);
    let arms = pow(0.5 + 0.5 * sin(w1 * 4.0 + (n1.r - 0.5) * 5.0), 3.0) * smoothstep(0.02, 0.35, r);
    let w2 = a - lr * 4.1 + t * 2.2;
    let n2 = textureSampleLevel(noiseTex, repeatSmp, vec2f(cos(w2), sin(w2)) * 0.31 + vec2f(t * 0.07, lr * 0.5), 0.0);
    let weave = pow(0.5 + 0.5 * sin(w2 * 7.0 + (n2.g - 0.5) * 7.0), 12.0) * smoothstep(0.1, 0.5, r);
    let fall = 1.0 / (r + 0.25);
    let rings = pow(0.5 + 0.5 * sin(fall * 9.0 + t * 3.4 + (n1.g - 0.5) * 3.0), 6.0) * smoothstep(0.08, 0.6, r);
    // Clouds: the paint's pale vapour, wound round with the arms and drifting in.
    let w3 = a + lr * 1.7 - t * 0.9;
    let n5 = textureSampleLevel(noiseTex, repeatSmp, vec2f(cos(w3), sin(w3)) * 0.45 + vec2f(lr * 0.6 - t * 0.2, 0.37), 0.0);
    let cloud = smoothstep(0.35, 0.85, n5.r * 0.7 + n1.b * 0.5) * smoothstep(0.05, 0.4, r);
    let n3 = textureSampleLevel(noiseTex, repeatSmp, vec2f(cos(w1), sin(w1)) * 0.9 + vec2f(lr * 1.7 - t * 0.45, 0.13), 0.0);
    let spark = smoothstep(0.83, 0.96, n3.b) * (0.6 + 0.4 * sin(t * 9.0 + n3.r * 40.0));
    let breath = 0.82 + 0.18 * sin(t * 2.3) + 0.06 * sin(t * 7.1);
    let heart = exp(-r * 9.0) * breath;
    // The lightning: the noise's half-way line, thin, at a new place every few frames, and only some of the time.
    let beat = floor(t * 7.0);
    let n4 = textureSampleLevel(noiseTex, repeatSmp, vec2f(cos(a), sin(a)) * 0.12 + vec2f(r * 0.33, fract(beat * 0.137)), 0.0);
    let on = step(0.55, fract(sin(beat * 12.9898) * 43758.5453));
    let bolt = (1.0 - smoothstep(0.0, 0.03, abs(n4.r - 0.5))) * on * smoothstep(0.25, 0.7, r);
    var c = vec3f(0.004, 0.012, 0.06) + vec3f(0.01, 0.04, 0.2) * smoothstep(1.6, 0.2, r);
    c += arms * vec3f(0.06, 0.26, 1.1) * (0.35 + n1.b) * smoothstep(1.8, 0.4, r);
    c += cloud * select(vec3f(0.05, 0.13, 0.45), vec3f(0.12, 0.26, 0.75), lying);
    c += weave * vec3f(0.75, 0.42, 2.2);
    c += rings * vec3f(0.04, 0.14, 0.6);
    c += spark * vec3f(2.8, 3.2, 4.0);
    c += heart * select(vec3f(1.8, 2.6, 4.2), vec3f(2.4, 3.2, 4.6), lying);
    c += bolt * vec3f(1.4, 2.4, 5.0);
    // (Not so bright it reads as a lamp: the whirl's to be seen.)
    c *= 0.55;
    // The rim, flickering, and a glow in from it.
    let edge = r - 1.0;
    let flick = 0.75 + 0.25 * sin(a * 11.0 - t * 5.0) * sin(a * 23.0 + t * 7.3);
    c += exp(-abs(edge) * 14.0) * vec3f(0.5, 1.2, 3.0) * flick;
    c += exp(-max(-edge, 0.0) * 4.0) * vec3f(0.06, 0.18, 0.7);
    if (dead) { c = vec3f(0.003, 0.003, 0.004) + vec3f(0.03, 0.031, 0.034) * smoothstep(0.0, 1.3, r); }
    if (ember) { c = vec3f(c.b, c.g * 0.42 + c.b * 0.07, c.r * 0.45); }
    let toCam = F.camPos.xyz - in.p;
    let dist = length(toCam);
    c = applyFog(c, in.p, -toCam / dist, dist);
    var out: Out;
    out.color = vec4f(c, 1.0);
    out.depth = in.viewZ;
    return out;
  }
  if (I.glow.a < 0.0) {
    let p = in.uv * 2.0 - 1.0;
    let r = length(p);
    let a = atan2(p.y, p.x);
    let t = F.camPos.w;
    let edge = 0.956 + 0.025 * sin(a * 7.0 - t * 2.6) + 0.012 * sin(a * 17.0 + t * 3.1);
    if (r > edge) { discard; }
    let rim = exp(-abs(r - edge + 0.052) * 34.0);
    let whirl = a * 3.0 - r * 21.0 + t * 3.25 + sin(r * 13.0 + a * 2.0) * 0.8;
    let threads = pow(0.5 + 0.5 * sin(whirl), 7.0) * smoothstep(0.04, 0.42, r);
    let vapor = 0.5 + 0.5 * sin(a * 5.0 - r * 31.0 + t * 4.8 + sin(a * 8.0 + r * 31.0 - t) * 1.3);
    let core = vec3f(0.048, 0.005, 0.12) + vapor * vec3f(0.22, 0.022, 0.51);
    let fire = threads * vec3f(0.64, 0.15, 1.6) * (0.3 + 0.7 * r);
    var out: Out;
    out.color = vec4f(core + fire + rim * vec3f(2.25, 0.58, 4.25), 1.0);
    out.depth = in.viewZ;
    return out;
  }
  let toCam = F.camPos.xyz - in.p;
  let dist = length(toCam);
  let v = toCam / dist;
  var n0 = normalize(in.n);
  if (!front) { n0 = -n0; }
  var albedo = textureSample(albedoTex, repeatSmp, in.uv).rgb;
  // (A portal's stone gone out, a 1.25: its runes and gems lose their blue, dull grey in the stone.)
  if (I.glow.a > 1.1 && I.glow.a < 1.5) {
    let lit = smoothstep(0.22, 0.5, albedo.b) * smoothstep(0.08, 0.3, albedo.b - max(albedo.r, albedo.g * 0.85));
    albedo = mix(albedo, vec3f(dot(albedo, vec3f(0.3, 0.5, 0.2)) * 0.3), lit);
  }
  let nm = textureSample(normalTex, repeatSmp, in.uv);
  let mr = textureSample(mrTex, repeatSmp, in.uv);
  let n = perturb(n0, in.p, in.uv, nm.rg, 1.0);
  let shadow = shadowAt(in.p, n0, in.viewZ, ign(in.pos.xy));
  // A dropped thing's rarity: a little all over, and strongest where it turns from the eye. (A gem's glow is flat: a = 0.)
  // (Further off, a few pixels across, its rim is a hairline and its rarity can't be told: the rim's widened and a little
  // more of it is in its body with distance, so it reads about as wide on the screen near and far. Drops only, a <= 1.
  // Close up its rim is the softer: at the full strength it's had far off, a drop at the feet wore a neon outline.)
  let far = select(0.0, smoothstep(5.0, 22.0, dist), I.glow.a <= 1.0);
  let rim = pow(1.0 - clamp(dot(n0, v), 0.0, 1.0), mix(2.2, 0.9, far));
  // (A gilded critter's, a 6, src/gfx/critters.js: what its metal map's red marks glows its own colour, glow.rgb times; and
  // its metal is polished, not toned down.)
  let painted = I.glow.a > 5.5;
  var c: vec3f;
  if (painted) {
    c = shadePBR(in.p, n, v, albedo, mr.g, mr.b, 1.0, shadow) + albedo * mr.r * I.glow.rgb;
  } else {
    c = shadePBR(in.p, n, v, albedo, matteRough(mr.g, mr.b), mr.b, 1.0, shadow) + I.glow.rgb * mix(1.0, 0.05 + 0.3 * far + (1.0 + 0.6 * far) * rim * rim, I.glow.a);
  }
  // A portal's stone (src/gfx/renderer.js portalModels): its runes and gems, painted the whirl's blue, glow of themselves.
  if (I.glow.a > 1.5 && !painted) {
    let lit = smoothstep(0.22, 0.5, albedo.b) * smoothstep(0.08, 0.3, albedo.b - max(albedo.r, albedo.g * 0.85));
    // (a 3.25: the Redoubt's, its runes burning his red.)
    let rune = select(albedo, vec3f(albedo.b, albedo.g * 0.4, albedo.r * 0.4), abs(I.glow.a - 3.25) < 0.1);
    c += rune * lit * I.glow.a * (0.85 + 0.15 * sin(F.camPos.w * 2.3));
  }
  c = applyFog(c, in.p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

// The first-person arms and the sword in hand, drawn with their own camera over the world.
export const VIEWMODEL = COMMON + /* wgsl */ `
struct VM { sway: mat4x4f, params: vec4f };  // params: x = blood on the sword, y = steel by its paint alone, z = takes blood, w = the blade's length
@group(1) @binding(0) var<uniform> M: VM;
@group(1) @binding(1) var albedoTex: texture_2d<f32>;
@group(1) @binding(2) var normalTex: texture_2d<f32>;
@group(1) @binding(3) var mrTex: texture_2d<f32>;

struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) viewZ: f32, @location(4) bind: vec3f, @location(5) @interpolate(flat) staff: u32 };

@vertex fn vs(@location(0) sk: vec4f, @location(1) bindP: vec3f, @location(2) piece: u32, @location(3) uv: vec2f) -> V {
  var o: V;
  let vp = M.sway * vec4f(sk.xyz, 1.0);
  o.pos = F.vmProj * vp;
  let w = F.vmToWorld * vp;
  o.p = w.xyz;
  let nv = unpack4x8snorm(bitcast<u32>(sk.w)).xyz;
  o.n = (F.vmToWorld * M.sway * vec4f(nv, 0.0)).xyz;
  o.uv = uv; o.bind = bindP; o.staff = piece;
  o.viewZ = -vp.z;
  return o;
}

fn h2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn vn2(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2f(1.0, 0.0)), u.x), mix(h2(i + vec2f(0.0, 1.0)), h2(i + vec2f(1.0, 1.0)), u.x), u.y);
}

@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> Out {
  let toCam = F.camPos.xyz - in.p;
  let dist = max(length(toCam), 0.01);
  let v = toCam / dist;
  var n0 = normalize(in.n);
  if (!front) { n0 = -n0; }
  var albedo = textureSample(albedoTex, repeatSmp, in.uv).rgb;
  let nm = textureSample(normalTex, repeatSmp, in.uv);
  let mr = textureSample(mrTex, repeatSmp, in.uv);
  var rough = matteRough(mr.g, mr.b); var metal = mr.b;
  var n = n0;
  if (M.params.y > 0.5) {
    // The greatsword: steel unless the paint says otherwise.
    let mx = max(max(albedo.r, albedo.g), albedo.b);
    let sat = (mx - min(min(albedo.r, albedo.g), albedo.b)) / max(mx, 0.001);
    metal = (1.0 - smoothstep(0.14, 0.4, sat)) * smoothstep(0.08, 0.25, mx);
    rough = mix(0.7, 0.24, metal);
    albedo = mix(albedo, albedo * 1.2 + 0.06, metal);
  } else {
    n = perturb(n0, in.p, in.uv, nm.rg, 1.0);
  }
  if (M.params.z > 0.5) {
    // Blood down the blade after a kill-worthy thrust.
    let along = in.bind.y / M.params.w;
    let b = min(M.params.x, 0.62) * smoothstep(0.25, 0.7, along + 0.12);
    // Thin runs along the blade, not blobs.
    let streaks = vn2(vec2f(in.bind.x * 70.0 + in.bind.z * 120.0, along * 3.0)) * 0.65 + vn2(vec2f(in.bind.z * 300.0, along * 12.0)) * 0.35;
    let cover = smoothstep(1.0 - b * 1.25, 1.05 - b * 1.1, streaks);
    albedo = mix(albedo, vec3f(0.085, 0.003, 0.003), cover);
    rough = mix(rough, 0.3, cover);
    metal = mix(metal, 0.0, cover);
  }
  let worldViewZ = -(F.view * vec4f(in.p, 1.0)).z;
  let shadow = shadowAt(in.p, n0, max(worldViewZ, 0.1), ign(in.pos.xy));
  var c = shadePBR(in.p, n, v, albedo, rough, metal, 1.0, shadow);
  // STAFF_LIGHT
  // The spell hands are held up against the light as often as not: a low, warm fill from the eye keeps the skin skin, and the fingers' roundness in view.
  // And a spell's light, so near, can colour them but not burn them out: the upper arm faces all of it.
  if (M.params.w < 0.0) {
    // (How much is -w: the skull in the hand takes less than skin, being so much paler that it would light up the night.)
    c += albedo * vec3f(0.62, 0.5, 0.42) * (0.3 + 0.7 * max(dot(n, v), 0.0)) * -M.params.w;
    let most = max(max(c.r, c.g), c.b);
    if (most > 1.0) { c *= (1.0 + (most - 1.0) * 0.12) / most; }
  }
  var o: Out;
  o.color = vec4f(c, 1.0);
  // (The spell hands say how near they look, not how far off they're drawn.)
  o.depth = select(in.viewZ, 0.2, M.params.w < 0.0);
  return o;
}
`;

// Grass, one instance per blade, lit per vertex.
// A cut-out's edge in a multisampled frame. A leaf or a needle is a painting's alpha tested once a pixel: in or out, so
// its edge is a stair of whole pixels however many samples the frame has (the samples only ever smooth a triangle's edge).
// Here the test gives each pixel a share instead: how far the alpha is past the cut, over how fast it changes across the
// pixel, as that many of the pixel's samples. With one sample it's the old test exactly.
export const cutMaskWGSL = (samples) => /* wgsl */ `
fn cutMask(a: f32, cut: f32, slope: f32) -> u32 {
  let cov = clamp((a - cut) / max(slope, 0.0005) + 0.5, 0.0, 1.0);
  let n = u32(cov * ${samples}.0 + 0.5);
  return (1u << n) - 1u;
}
`;

// STATIC with its leaves cut that way (renderer.js pStaticCut, on a PC). The alpha's slope comes from two more reads
// of the painting half a pixel along and down: where the test is, the shader has already branched on the layer, and a
// derivative can't be asked for there.
const STATIC_HARD_CUT = 'if (params.x > 0.0 && tex.a < 0.5) { discard; }';
export function staticSoftCut(samples) {
  const swaps = [
    ['@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> Out {', '@fragment fn fs(in: V, @builtin(front_facing) front: bool) -> OutCut {'],
    ['var o: Out;\n  o.depth = in.viewZ;', 'var o: OutCut;\n  o.mask = 0xFFFFFFFFu;\n  o.depth = in.viewZ;'],
    [STATIC_HARD_CUT, `if (params.x > 0.0) {
      let ax = colAt(uv + dx * 0.5, layerI, dx, dy).a;
      let ay = colAt(uv + dy * 0.5, layerI, dx, dy).a;
      o.mask = cutMask(tex.a, 0.5, (abs(ax - tex.a) + abs(ay - tex.a)) * 2.0);
      if (o.mask == 0u) { discard; }
    }`],
  ];
  let code = STATIC;
  for (const [from, to] of swaps) {
    if (code.split(from).length !== 2) throw new Error(`staticSoftCut: STATIC has changed under it (${from.slice(0, 40)})`);
    code = code.replace(from, to);
  }
  return `${code}\nstruct OutCut { @location(0) color: vec4f, @builtin(sample_mask) mask: u32, @location(1) depth: f32 };\n${cutMaskWGSL(samples)}`;
}

export const GRASS = COMMON + /* wgsl */ `
@group(1) @binding(0) var groundColor: texture_2d_array<f32>;
@group(1) @binding(1) var groundDetail: texture_2d_array<f32>;

struct V { @builtin(position) pos: vec4f, @location(0) color: vec3f, @location(1) viewZ: f32 };

fn bladeHash(x: f32) -> f32 { return fract(sin(x * 91.3458) * 47453.5453); }

fn makeBlade(root: vec3f, packed_: u32, t: f32, side: f32, width0: f32) -> V {
  var o: V;
  let yaw = f32(packed_ & 255u) / 255.0 * 6.2831853;
  let hgt = 0.1 + f32((packed_ >> 8u) & 255u) / 255.0 * 0.36;
  let rnd = f32((packed_ >> 16u) & 255u) / 255.0;
  let tint = f32(packed_ >> 24u) / 255.0;
  let time = F.camPos.w;
  let facing = vec2f(cos(yaw), sin(yaw));
  // Wind arrives in waves.
  let wPhase = dot(root.xz, F.wind.xz) * 0.42 - time * 1.35;
  let gust = sin(wPhase) * 0.5 + 0.5 + 0.3 * sin(wPhase * 2.7 + rnd * 6.0);
  let flutter = sin(time * 5.0 + rnd * 40.0) * 0.05;
  var bend = F.wind.xz * (gust * F.wind.y + 0.08) + facing * (0.14 + rnd * 0.22) + vec2f(flutter);
  // Bodies press it flat.
  for (var i = 0; i < select(6, 3, LEAN); i++) {
    let ch = F.chars[i];
    if (ch.w <= 0.0) { continue; }
    let d = root.xz - ch.xz;
    let dl = length(d);
    let k = 1.0 - smoothstep(ch.w * 0.5, ch.w * 1.5, dl);
    if (k > 0.0 && abs(root.y - ch.y) < 1.2) { bend += d / max(dl, 0.05) * k * 0.95; }
  }
  let curve = t * t;
  let up = 1.0 - min(length(bend), 1.0) * 0.5 * t;
  let side3 = vec3f(-facing.y, 0.0, facing.x);
  var p = root + vec3f(bend.x * curve * hgt, t * hgt * up, bend.y * curve * hgt);
  let w = width0 * (1.0 - t * t * 0.92);
  p += side3 * side * w;
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  // Colour comes from the same paintings as the ground beneath it (their average on a phone, measured from them).
  var base0 = mix(vec3f(0.053, 0.2, 0.009), vec3f(0.102, 0.213, 0.015), tint);
  if (!LEAN) {
    let uv = root.xz * 0.2;
    let layer = 3 + i32(tint * 2.99);
    base0 = textureSampleLevel(groundColor, repeatSmp, uv, layer, 5.0).rgb;
  }
  let base = mix(vec3f(dot(base0, vec3f(0.3, 0.6, 0.1))), base0, 0.5) * vec3f(0.62, 0.61, 0.42);
  let root_ = base * (0.4 + 0.14 * tint);
  let tip = base * (1.0 + 0.35 * rnd) + vec3f(0.05, 0.05, 0.0) * tint;
  var alb = mix(root_, tip, t);
  if (!LEAN) {
    let bUv = (root.xz - F.blood.xy) * F.blood.z;
    let bl = textureSampleLevel(bloodMap, clampSmp, bUv, 0.0).r;
    alb = mix(alb, vec3f(0.14, 0.008, 0.005), smoothstep(0.03, 0.4, bl));
  }
  // Lighting: a soft term from a mostly-up normal, and sun through the leaf.
  let n = normalize(vec3f(bend.x * 0.6, 1.0, bend.y * 0.6) + side3 * side * 0.4);
  let shadow = shadowQuick(p, o.viewZ);
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  let nl = max(dot(n, F.sunDir.xyz), 0.0);
  let backlit = pow(max(dot(-v, F.sunDir.xyz), 0.0), 4.0) * t * select(1.7, 0.95, LEAN);
  var c = alb * (F.sunColor.rgb * (nl * 0.28 + backlit * 0.3 + 0.05) * shadow + mix(F.groundAmb.rgb, F.skyAmb.rgb, 0.65 + 0.3 * t) * (0.65 + 0.5 * t));
  c = applyFog(c, p, -v, dist);
  o.color = c;
  return o;
}

// Near blades: a seven-vertex strip, three segments (five and two on a phone, a little wider).
@vertex fn vsNear(@builtin(vertex_index) vi: u32, @location(0) root: vec3f, @location(1) packed_: u32) -> V {
  let row = vi / 2u;
  let t = f32(row) / select(3.0, 2.0, LEAN);
  let side = select(-1.0, 1.0, (vi & 1u) == 1u);
  // (On a phone, slight up close and wider further off, where there are fewer of them to fill the view.)
  return makeBlade(root, packed_, t, side, select(0.014, mix(0.013, 0.02, clamp(distance(root, F.camPos.xyz) / 8.0, 0.0, 1.0)), LEAN));
}
// Far blades: one triangle, wider, so a distant field stays full.
@vertex fn vsFar(@builtin(vertex_index) vi: u32, @location(0) root: vec3f, @location(1) packed_: u32) -> V {
  let t = select(0.0, 1.0, vi == 2u);
  let side = select(select(1.0, -1.0, vi == 0u), 0.0, vi == 2u);
  return makeBlade(root, packed_, t, side, select(0.04, 0.036, LEAN));
}
@fragment fn fs(in: V) -> Out {
  var o: Out;
  o.color = vec4f(in.color, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

export const GRASS_CULL = /* wgsl */ `
struct Blade { pos: vec3f, packed_: u32 };
struct CullU { viewProj: mat4x4f, cam: vec4f, grid: vec4f, map: vec4f, planes: array<vec4f, 5> };
struct Args { vertexCount: u32, instanceCount: atomic<u32>, firstVertex: u32, firstInstance: u32 };
@group(0) @binding(0) var<uniform> U: CullU;
@group(0) @binding(1) var<storage, read_write> nearArgs: Args;
@group(0) @binding(2) var<storage, read_write> farArgs: Args;
@group(0) @binding(3) var<storage, read_write> nearOut: array<Blade>;
@group(0) @binding(4) var<storage, read_write> farOut: array<Blade>;
@group(0) @binding(5) var groundTex: texture_2d<f32>;
@group(0) @binding(6) var heightTex: texture_2d<f32>;

fn hash3(p: vec2u) -> vec3u {
  // pcg3d: no visible structure, which a lattice of grass shows up immediately.
  var v = vec3u(p.x, p.y, p.x ^ (p.y << 16u)) * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> vec3u(16u);
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let n = u32(U.grid.x);
  let idx = id.x;
  if (idx >= n * n) { return; }
  let gx = idx % n; let gz = idx / n;
  let spacing = U.grid.y;
  let half_ = f32(n) * 0.5 * spacing;
  // A world-locked lattice, so blades don't swim as the camera moves.
  let origin = floor((U.cam.xz - vec2f(half_)) / spacing);
  let cell = vec2i(origin) + vec2i(i32(gx), i32(gz));
  let h = hash3(vec2u(bitcast<u32>(cell.x + 100000), bitcast<u32>(cell.y + 100000)));
  let jitter = vec2f(f32(h.x & 65535u), f32(h.y & 65535u)) / 65535.0;
  var xz = (vec2f(cell) + jitter) * spacing;
  if (LEAN) {
    // A phone has too few blades to fill the ground evenly, and evenly they look planted. They gather in tufts instead.
    let tuft = floor(xz / 0.85);
    let ht = hash3(vec2u(bitcast<u32>(i32(tuft.x) + 100000), bitcast<u32>(i32(tuft.y) + 100000)));
    xz = mix(xz, (tuft + vec2f(f32(ht.x & 255u), f32(ht.y & 255u)) / 255.0) * 0.85, 0.6);
  }
  let d = distance(xz, U.cam.xz);
  let radius = U.grid.z;
  if (d > radius) { return; }
  let uv = (xz - U.map.xy) * U.map.z;
  if (any(uv < vec2f(0.0)) || any(uv >= vec2f(1.0))) { return; }
  let size = vec2f(textureDimensions(groundTex));
  let tc = vec2i(uv * size);
  let gm = textureLoad(groundTex, tc, 0);
  let keep = f32((h.z >> 16u) & 65535u) / 65535.0;
  // Thin out with distance: the survivors widen in the far LOD.
  let lod = smoothstep(U.grid.w * 0.6, radius, d);
  if (keep > gm.g * gm.g * (1.0 - lod * 0.82) * 1.05) { return; }
  let y = textureLoad(heightTex, tc, 0).r;
  let p = vec3f(xz.x, y, xz.y);
  for (var i = 0; i < 5; i++) {
    let pl = U.planes[i];
    if (dot(pl.xyz, p) + pl.w < -0.9) { return; }
  }
  var b: Blade;
  b.pos = p;
  let yawB = h.x >> 24u;
  // Clumps of taller growth and bare tufts, from the big-scale channel.
  let tall = clamp(f32(h.y >> 24u) / 255.0 * 0.55 + gm.b * 0.75 - 0.1, 0.0, 1.0);
  let hgt = u32(tall * 255.0);
  let rnd = (h.z >> 8u) & 255u;
  let tint = u32(clamp(gm.b * 0.65 + f32(h.z & 255u) / 255.0 * 0.35, 0.0, 1.0) * 255.0);
  b.packed_ = yawB | (hgt << 8u) | (rnd << 16u) | (tint << 24u);
  if (d < U.grid.w) {
    let at = atomicAdd(&nearArgs.instanceCount, 1u);
    if (at < arrayLength(&nearOut)) { nearOut[at] = b; } else { atomicSub(&nearArgs.instanceCount, 1u); }
  } else {
    let at = atomicAdd(&farArgs.instanceCount, 1u);
    if (at < arrayLength(&farOut)) { farOut[at] = b; } else { atomicSub(&farArgs.instanceCount, 1u); }
  }
}
`;

export const SKY = COMMON + /* wgsl */ `
struct V { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  var o: V; o.pos = vec4f(p[i], 0.0, 1.0); o.ndc = p[i]; return o;
}
fn fbm(p0: vec2f) -> f32 {
  var p = p0; var a = 0.5; var s = 0.0;
  for (var i = 0; i < select(4, 2, LEAN); i++) {
    s += a * textureSampleLevel(noiseTex, repeatSmp, p, 0.0).r;
    p = p * 2.07 + vec2f(0.13, 0.27); a *= 0.5;
  }
  return select(s, s * 1.25, LEAN);
}
// The Elder Gods' void (src/core/delve-elder.js): no day and no night. A nebula wrapped round the whole of it, violet and
// rose, brightest along a band; stars, more than the land's and some of them coloured; and low in the north the Maw, a
// black hole: the dark of its horizon, the ring of light bent round its edge, and its burning disc, tilted, the near side
// across the hole and the far side's light bent up over it.
fn voidSky(d: vec3f) -> vec3f {
  let t = F.camPos.w;
  let w = abs(d) / (abs(d.x) + abs(d.y) + abs(d.z));
  let n1 = fbm(d.yz * 0.8 + vec2f(t * 0.0012, 0.0)) * w.x + fbm(d.xz * 0.8 + vec2f(0.0, t * 0.001)) * w.y + fbm(d.xy * 0.8 + vec2f(0.31, 0.77)) * w.z;
  let n2 = fbm(d.yz * 2.1 + vec2f(0.5, 0.2)) * w.x + fbm(d.xz * 2.1 + vec2f(0.13, 0.6)) * w.y + fbm(d.xy * 2.1 + vec2f(0.9, 0.4)) * w.z;
  let band = exp(-pow(dot(d, vec3f(0.29, 0.91, -0.29)) * 2.4, 2.0));
  let cloud = smoothstep(0.36, 0.82, n1);
  var c = vec3f(0.006, 0.003, 0.012);
  c += mix(vec3f(0.11, 0.03, 0.2), vec3f(0.3, 0.07, 0.2), smoothstep(0.4, 0.72, n2)) * cloud * (0.3 + 0.95 * band);
  c += vec3f(0.04, 0.07, 0.15) * smoothstep(0.56, 0.9, n2) * band;
  let g = d * 240.0;
  let cell = floor(g);
  let pick = fract(sin(dot(cell, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
  let glint = smoothstep(0.42, 0.1, length(fract(g) - 0.5)) * step(0.993, pick) * (pick - 0.993) * 160.0;
  c += mix(vec3f(0.7, 0.75, 1.0), vec3f(1.0, 0.6, 0.8), fract(pick * 97.0)) * glint * (1.0 - cloud * 0.5);
  // The Maw.
  let M = VOID_MAW;
  let cm = dot(d, M);
  let ang = acos(clamp(cm, -1.0, 1.0));
  let R = 0.16;
  let u = normalize(cross(M, vec3f(0.0, 1.0, 0.0)));
  let up = cross(u, M);
  let px = dot(d, u);
  let py = dot(d, up);
  let re = length(vec2f(px, py / 0.24));
  let a = atan2(py, px);
  let swirl = textureSampleLevel(noiseTex, repeatSmp, vec2f(a * 0.35 + t * 0.025, re * 2.2 - t * 0.015), 0.0).r;
  c += vec3f(0.32, 0.1, 0.26) * exp(-ang * 5.0);
  let disc = smoothstep(R * 1.1, R * 1.45, re) * (1.0 - smoothstep(R * 2.0, R * 3.6, re)) * step(0.0, cm);
  let hot = mix(vec3f(4.2, 1.5, 0.6), vec3f(1.1, 0.25, 1.4), smoothstep(R * 1.45, R * 3.2, re));
  let arc = exp(-pow((ang - R * 1.3) / (R * 0.16), 2.0)) * smoothstep(0.0, 0.5, py / max(ang, 1e-4));
  if (ang < R) { c = vec3f(0.0); }
  // (The near half of the disc is in front of the hole; the far half is behind it, and only its bent light shows.)
  c += hot * disc * (0.5 + 0.9 * swirl) * select(1.0, 0.0, ang < R && py > 0.0);
  c += vec3f(3.6, 1.7, 1.1) * exp(-pow((ang - R * 1.04) / (R * 0.045), 2.0));
  c += vec3f(2.0, 0.75, 1.15) * arc * (0.45 + 0.8 * swirl);
  return c;
}
@fragment fn fs(in: V) -> Out {
  let q = F.invViewProj * vec4f(in.ndc, 1e-4, 1.0);
  let d = normalize(q.xyz / q.w - F.camPos.xyz);
  if (indoorAt(F.camPos.xyz) > 3.5) { var ov: Out; ov.color = vec4f(voidSky(d), 1.0); ov.depth = 4000.0; return ov; }
  var c = envDir(d, 0.0);
  let cs = dot(d, F.sunDir.xyz);
  let day = F.skyAmb.a;
  // Stars, a few and small, when the sun's well gone.
  if (day < 0.5 && d.y > 0.0) {
    let g = d * 210.0;
    let cell = floor(g);
    let pick = fract(sin(dot(cell, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
    let glint = smoothstep(0.42, 0.12, length(fract(g) - 0.5)) * step(0.9965, pick) * (pick - 0.9965) * 300.0;
    c += vec3f(0.62, 0.68, 0.82) * glint * (1.0 - smoothstep(0.0, 0.5, day)) * smoothstep(0.02, 0.2, d.y);
  }
  // The disc, and a hot rim of glow. (The moon's the bigger of the two, and has a ring of haze round it.)
  let edge = mix(0.9993, 0.99965, day);
  c += F.sunColor.rgb * mix(9.0, 11.0, day) * smoothstep(edge, edge + 0.0002, cs);
  c += F.sunColor.rgb * pow(max(cs, 0.0), 900.0) * 1.2;
  c += F.sunColor.rgb * pow(max(cs, 0.0), 40.0) * 0.14 * (1.0 - day);
  // Clouds: a drifting layer projected on a dome, lit from the low sun's side.
  if (d.y > 0.01) {
    let t = F.camPos.w * 0.0035;
    let uv = d.xz / (d.y + 0.18) * 0.085 + vec2f(t, t * 0.4);
    let n = fbm(uv);
    let cover = smoothstep(0.3, 0.58, n);
    // Lit from the low sun's side, or on a phone simply darker where it's thick.
    var lit = clamp(1.3 - n * 1.25, 0.0, 1.0);
    if (!LEAN) { lit = clamp((n - fbm(uv + F.sunDir.xz * 0.03)) * 5.0 + 0.55, 0.0, 1.0); }
    let base = mix(F.skyAmb.rgb * 0.95 + F.fogColor.rgb * 0.18, F.fogColor.rgb * 0.75 + F.sunColor.rgb * 0.16, lit) * mix(0.8, 1.6, pow(max(cs, 0.0), 4.0));
    let fade = smoothstep(0.01, 0.16, d.y);
    c = mix(c, base, cover * fade * 0.94);
  }
  // Low down, the sky's the same haze the land goes into.
  c = mix(c, F.fogColor.rgb, 1.0 - smoothstep(0.0, 0.13, d.y));
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = 4000.0;
  return o;
}
`;

// Bakes the atmosphere into a panorama every so often, which then lights every reflection and fills the sky.
export const SKY_BAKE = /* wgsl */ `
struct U { sun: vec4f, tint: vec4f, sky: vec4f };
@group(0) @binding(0) var<uniform> S: U;
struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
  var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  var o: V; o.pos = vec4f(p[i], 0.0, 1.0); o.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5); return o;
}
const R_E = 6360e3; const R_A = 6420e3;
const BETA_R = vec3f(5.8e-6, 13.5e-6, 33.1e-6);
const BETA_M = vec3f(21e-6);
fn sphere(ro: vec3f, rd: vec3f, r: f32) -> vec2f {
  let b = dot(ro, rd); let c = dot(ro, ro) - r * r; let d = b * b - c;
  if (d < 0.0) { return vec2f(1e9, -1e9); }
  let s = sqrt(d); return vec2f(-b - s, -b + s);
}
fn sky(rd: vec3f, sun: vec3f) -> vec3f {
  let ro = vec3f(0.0, R_E + 300.0, 0.0);
  let hitA = sphere(ro, rd, R_A);
  var tMax = hitA.y;
  let hitE = sphere(ro, rd, R_E);
  if (hitE.x > 0.0) { tMax = min(tMax, hitE.x); }
  let N = 16;
  let dt = tMax / f32(N);
  var sumR = vec3f(0.0); var sumM = vec3f(0.0);
  var odR = 0.0; var odM = 0.0;
  let mu = dot(rd, sun);
  let pR = 3.0 / (16.0 * 3.14159) * (1.0 + mu * mu);
  let g = 0.76;
  let pM = 3.0 / (8.0 * 3.14159) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
  for (var i = 0; i < N; i++) {
    let p = ro + rd * ((f32(i) + 0.5) * dt);
    let h = length(p) - R_E;
    let hR = exp(-h / 8000.0) * dt;
    let hM = exp(-h / 1200.0) * dt;
    odR += hR; odM += hM;
    let hs = sphere(p, sun, R_A);
    let dts = hs.y / 6.0;
    var lR = 0.0; var lM = 0.0; var blocked = false;
    for (var j = 0; j < 6; j++) {
      let ps = p + sun * ((f32(j) + 0.5) * dts);
      let hh = length(ps) - R_E;
      if (hh < 0.0) { blocked = true; break; }
      lR += exp(-hh / 8000.0) * dts; lM += exp(-hh / 1200.0) * dts;
    }
    if (!blocked) {
      let tau = BETA_R * (odR + lR) + BETA_M * 1.1 * (odM + lM);
      let att = exp(-tau);
      sumR += att * hR; sumM += att * hM;
    }
  }
  return (sumR * BETA_R * pR + sumM * BETA_M * pM) * 7.0;
}
@fragment fn fs(in: V) -> @location(0) vec4f {
  let az = (in.uv.x - 0.5) * 6.2831853;
  let el = in.uv.y * 3.14159265;
  let d = vec3f(sin(el) * sin(az), cos(el), sin(el) * cos(az));
  var c = sky(normalize(vec3f(d.x, max(d.y, 0.002), d.z)), S.sun.xyz);
  // A grey world: the blue mostly gone, however clear the air. And never quite black, with the moon up there somewhere.
  c = mix(vec3f(dot(c, vec3f(0.3, 0.55, 0.15))), c, 0.5) * 0.72 + S.sky.rgb * mix(0.55, 0.3, S.sun.w);
  // Below the horizon, the land catches the same light.
  if (d.y < 0.0) { c = mix(c, S.tint.rgb, 1.0 - smoothstep(-0.12, 0.0, d.y)); }
  return vec4f(c, 1.0);
}
`;

// The held skull and its gems: VIEWMODEL with the bone's palette swap. mr.r says what's bone (tools/wizard/skull_arm.py), so the hand holding it stays a hand. See src/items/skins.js.
const SKULL_SKIN = /* wgsl */ `
  var emit = vec3f(0.0);
  if (M.c.w >= 0.0) {
    let kind = M.c.w;
    let mask = smoothstep(0.3, 0.7, mr.r);
    let tm = F.camPos.w;
    let L = dot(albedo, vec3f(0.3, 0.59, 0.11));
    let s = pow(clamp(L / 0.72, 0.0, 1.0), 1.25);
    var col = mix(M.a.rgb, M.b.rgb, smoothstep(0.0, 0.55, s));
    col = mix(col, M.c.rgb, smoothstep(0.55, 1.0, s));
    // What is deep (the sockets, the nose) stays dark whatever it is made of, so the eyes have something to burn against.
    let deep = 1.0 - smoothstep(0.02, 0.1, L);
    var mt = M.a.w; var ro = M.b.w;
    let Q = in.bind * 34.0;
    let facing = max(dot(n, v), 0.0);
    let glow = M.fx.rgb * M.fx.a;
    // Fine branching cracks of its own, as the bone's are too faint to find.
    let w0 = vn2(Q.xy * 1.15 + vec2f(3.1, 1.7));
    let w1 = vn2(Q.xy * 2.7 + vec2f(w0 * 2.4, -w0));
    let crack = max(1.0 - smoothstep(0.0, 0.028, abs(w0 - 0.5)), (1.0 - smoothstep(0.0, 0.03, abs(w1 - 0.5))) * smoothstep(0.42, 0.56, w0));
    if (kind == 1.0) {
      let wet = smoothstep(0.42, 0.68, vn2(vec2f(Q.x * 1.6, Q.y * 0.42 + tm * 0.3)));
      col = mix(col, M.fx.rgb * 0.7, wet * 0.5);
      ro = mix(0.4, 0.05, wet);
      emit = glow * (0.04 + 0.22 * wet * (0.7 + 0.3 * sin(tm * 2.0 + Q.y)));
    } else if (kind == 2.0) {
      emit = glow * crack * (0.72 + 0.28 * sin(tm * 2.3 + Q.x * 0.4 + Q.y * 0.3));
    } else if (kind == 3.0) {
      let a0 = vn2(Q.xy * 0.42 + vec2f(tm * 0.08, -tm * 0.06));
      let b0 = vn2(Q.xy * 0.95 - a0 * 3.5 + vec2f(-tm * 0.12, tm * 0.07));
      let neb = smoothstep(0.45, 0.85, b0);
      let hue = mix(M.fx.rgb, M.fx.gbr, 0.5 + 0.5 * sin(b0 * 7.0 + tm * 0.35));
      let cell = floor(Q.xy * 6.5);
      let star = step(0.97, h2(cell)) * (0.55 + 0.45 * sin(tm * 3.0 + h2(cell + 3.0) * 40.0));
      emit = hue * M.fx.a * (neb * neb * 0.045 + crack * 0.3) + vec3f(star * 2.2);
    } else if (kind == 4.0) {
      let f0 = vn2(Q.xy * 0.62 + vec2f(w0, -tm * 0.14)) + 0.5 * vn2(Q.xy * 1.5 + vec2f(tm * 0.1, -tm * 0.26));
      let lava = max(smoothstep(0.92, 1.25, f0) * 0.13, crack * 0.75);
      emit = glow * lava * (0.8 + 0.2 * sin(tm * 3.1 + Q.y * 0.5));
      ro = mix(ro, 0.85, lava);
    } else if (kind == 5.0) {
      let fres = 1.0 - facing;
      let ph = fres * 1.7 + vn2(Q.xy * 0.34) * 1.5 + tm * 0.1;
      let irid = 0.5 + 0.5 * cos(6.283 * (ph + vec3f(0.0, 0.33, 0.67)));
      col = mix(col, irid * (0.25 + s), 0.75);
      emit = irid * fres * fres * fres * 0.3 * M.fx.a;
    } else if (kind == 6.0) {
      col = mix(col, M.fx.rgb, crack);
      mt = mix(mt, 1.0, crack); ro = mix(ro, 0.16, crack);
      emit = glow * crack * 0.3;
    } else if (kind == 7.0) {
      let cell = floor(Q.xy * 11.0);
      let spark = step(0.96, h2(cell)) * (0.5 + 0.5 * sin(tm * 2.0 + h2(cell + 7.0) * 30.0));
      emit = glow * (spark * 2.0 + pow(1.0 - facing, 3.0) * 0.25);
    }
    col = mix(col, M.a.rgb * 0.25, deep);
    emit *= 1.0 - deep;
    albedo = mix(albedo, col, mask);
    rough = mix(rough, ro, mask);
    metal = mix(metal, mt, mask);
    emit *= mask;
  } else {
    // A gem: a light of its own.
    emit = albedo * M.fx.a;
  }
`;
const skullCode = VIEWMODEL
  .replace('struct VM { sway: mat4x4f, params: vec4f };', 'struct VM { sway: mat4x4f, params: vec4f, a: vec4f, b: vec4f, c: vec4f, fx: vec4f };')
  .replace('  let worldViewZ = -(F.view * vec4f(in.p, 1.0)).z;', () => SKULL_SKIN + '  let worldViewZ = -(F.view * vec4f(in.p, 1.0)).z;')
  .replace('o.color = vec4f(c, 1.0);\r\n  // (The spell hands', 'o.color = vec4f(c + emit, 1.0);\r\n  // (The spell hands')
  .replace('o.color = vec4f(c, 1.0);\n  // (The spell hands', 'o.color = vec4f(c + emit, 1.0);\n  // (The spell hands');
if (!skullCode.includes('c + emit') || !skullCode.includes('kind == 7.0') || !skullCode.includes('fx: vec4f')) throw new Error('VIEWMODEL has moved: fix the skull skin');
export const VIEWMODEL_SKULL = skullCode;
