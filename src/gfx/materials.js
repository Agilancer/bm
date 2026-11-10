// WGSL for everything drawn in the world pass.
import { COMMON } from './shaders.js';
import { CHURCH_Z } from '../core/church.js';

export const TERRAIN = COMMON + /* wgsl */ `
@group(1) @binding(0) var groundColor: texture_2d_array<f32>;
@group(1) @binding(1) var groundDetail: texture_2d_array<f32>;
@group(1) @binding(2) var farMap: texture_2d<f32>;
@group(1) @binding(3) var farTint: texture_2d<f32>;
@group(1) @binding(4) var farKind: texture_2d<f32>;
@group(1) @binding(5) var nearRoad: texture_2d<f32>;
@group(1) @binding(6) var<uniform> NR: vec4f;

struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) viewZ: f32 };
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f) -> V {
  var o: V;
  o.pos = F.viewProj * vec4f(p, 1.0);
  o.p = p; o.n = n;
  o.viewZ = -(F.view * vec4f(p, 1.0)).z;
  return o;
}

fn rot(p: vec2f, a: f32) -> vec2f { let c = cos(a); let s = sin(a); return vec2f(c * p.x - s * p.y, s * p.x + c * p.y); }

@fragment fn fs(in: V) -> Out {
  let p = in.p;
  let toCam = F.camPos.xyz - p;
  let dist = length(toCam);
  let v = toCam / dist;
  var gmUv = (p.xz - F.ground.xy) * F.ground.z;
  let gm = textureSampleLevel(groundMap, clampSmp, gmUv, 0.0);
  let inMap = step(0.0, gmUv.x) * step(gmUv.x, 1.0) * step(0.0, gmUv.y) * step(gmUv.y, 1.0);
  // Past the fine map of the village there's a coarse one of all the land: the roads, and where the pines stand.
  let fuv = p.xz / FAR_SPAN + 0.5;
  let fm = textureSampleLevel(farMap, clampSmp, fuv, 0.0);
  // The far countries (src/core/lands.js): their tint and wet, snow on the heights, rock on the steeps.
  let ft = textureSampleLevel(farTint, clampSmp, fuv, 0.0);
  let fk = textureSampleLevel(farKind, clampSmp, fuv, 0.0);
  let macro2 = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.043 + 0.31, 0.0);
  // Close round you, the roads from their fine map (src/gfx/rocks.js followRoads): a hard, ragged edge where the far map's is a
  // blur, and how far across the road this is, for its ruts and crown.
  var roadFine = 0.0; var nearIn = 0.0; var dc = 99.0; var rw = 0.0;
  if (!LEAN && NR.w > 0.5) {
    let nuv = (p.xz - NR.xy) * NR.z;
    let nr = textureSampleLevel(nearRoad, clampSmp, nuv, 0.0);
    nearIn = smoothstep(0.0, 0.08, min(min(nuv.x, 1.0 - nuv.x), min(nuv.y, 1.0 - nuv.y)));
    dc = nr.r * 12.0; rw = nr.g * 8.0;
    let wob = (macro2.a - 0.5) * 0.9 + (textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.9, 0.0).r - 0.5) * 0.6;
    roadFine = (1.0 - smoothstep(rw - 0.3, rw + 0.3, dc + wob)) * step(0.2, rw);
  }
  let dirtBase = mix(mix(fm.r, roadFine, nearIn), max(gm.r, roadFine * nearIn), inMap);
  let steep = 1.0 - in.n.y;

  let uvA = p.xz * 0.2;
  // The Tripo grounds (tools/world/build_ground.py), on a scale and turn of their own: the road's gravel, snow, stone, forest floor.
  let uvC = rot(p.xz, 0.6) * 0.17 + 0.11;
  let dxC = dpdx(uvC); let dyC = dpdy(uvC);
  // Stone on a steep face is painted on the face, not stretched down it from above.
  let side = select(p.zy, p.xy, abs(in.n.z) > abs(in.n.x)) * vec2f(0.13, -0.13);
  let dxS = dpdx(side); let dyS = dpdy(side);
  // Roads: worn gravel and set stones wherever the ground's trodden hard. Rock: on the steeps and the far map's bare ground.
  let roadAmt = smoothstep(0.42, 0.78, dirtBase + (macro2.g - 0.5) * 0.25);
  let rock0 = max(fm.a, smoothstep(0.2, 0.42, steep));
  let rockAmt = rock0 * smoothstep(0.1, 0.4, rock0 + (macro2.b - 0.5) * 0.3) * (1.0 - roadAmt * 0.8);
  let snowAmt = smoothstep(0.25, 0.6, fm.b + (macro2.r - 0.5) * 0.3) * smoothstep(0.55, 0.8, in.n.y);
  var grassCol: vec4f; var grassDet: vec4f; var dirtCol: vec4f; var dirtDet: vec4f;
  var rockCol = vec3f(0.0); var rockDet = vec4f(0.5, 0.5, 0.9, 0.5); var haveRock = false;
  var snowTex = vec4f(0.0); var haveSnow = false;
  var floorCol = vec3f(0.0); var haveFloor = false;
  var fenCol = vec3f(0.0); var ashCol = vec3f(0.0);
  if (LEAN) {
    // One painting of each ground and one detail map on a phone (the paintings nearest the average of their kind, and
    // the relief of whichever ground this mostly is): the ground covers half the screen, so these three reads in place of
    // eight are the biggest saving in the frame. (Where it's mostly road, the road's gravel in place of the dirt: no extra read.)
    grassCol = textureSample(groundColor, repeatSmp, uvA, 5);
    // The patchwork the other paintings gave: warmer and cooler stretches, and dry ones.
    grassCol = vec4f(grassCol.rgb * mix(vec3f(1.2, 1.02, 0.85), vec3f(0.88, 1.0, 1.08), smoothstep(0.3, 0.7, macro2.g)), grassCol.a);
    grassCol = vec4f(mix(grassCol.rgb, vec3f(0.24, 0.2, 0.09), smoothstep(0.52, 0.78, macro2.r) * 0.38), grassCol.a);
    dirtCol = textureSample(groundColor, repeatSmp, uvA, select(1, 6, dirtBase > 0.5));
    grassDet = textureSample(groundDetail, repeatSmp, uvA, select(3, 1, dirtBase > 0.5));
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
    grassCol = mix(textureSampleGrad(groundColor, repeatSmp, uvA, 3 + g0, dxA, dyA), textureSampleGrad(groundColor, repeatSmp, uvB, 3 + g1, dxB, dyB), gFade);
    grassDet = mix(textureSampleGrad(groundDetail, repeatSmp, uvA, 3 + g0, dxA, dyA), textureSampleGrad(groundDetail, repeatSmp, uvB, 3 + g1, dxB, dyB), gFade);
    dirtCol = mix(textureSampleGrad(groundColor, repeatSmp, uvB, d0, dxB, dyB), textureSampleGrad(groundColor, repeatSmp, uvA, d1, dxA, dyA), dFade);
    dirtDet = mix(textureSampleGrad(groundDetail, repeatSmp, uvB, d0, dxB, dyB), textureSampleGrad(groundDetail, repeatSmp, uvA, d1, dxA, dyA), dFade);
    // The road's own gravel and stones over the dirt.
    if (roadAmt > 0.002) {
      dirtCol = mix(dirtCol, textureSampleGrad(groundColor, repeatSmp, uvC, 6, dxC, dyC), roadAmt);
      dirtDet = mix(dirtDet, textureSampleGrad(groundDetail, repeatSmp, uvC, 6, dxC, dyC), roadAmt);
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
      let top = textureSampleGrad(groundColor, repeatSmp, uvC * 0.8, layer, dxC * 0.8, dyC * 0.8);
      let face = textureSampleGrad(groundColor, repeatSmp, side, layer, dxS, dyS);
      rockCol = mix(face.rgb, top.rgb, smoothstep(0.55, 0.85, in.n.y));
      rockDet = textureSampleGrad(groundDetail, repeatSmp, uvC * 0.8, layer, dxC * 0.8, dyC * 0.8);
      haveRock = true;
    }
    // Snow with its own drifts, and stones breaking through it where it's thin or the ground steepens.
    if (snowAmt > 0.002) {
      let sn = textureSampleGrad(groundColor, repeatSmp, uvC * 0.7, 7, dxC * 0.7, dyC * 0.7);
      let sr = textureSampleGrad(groundColor, repeatSmp, uvC * 0.9, 8, dxC * 0.9, dyC * 0.9);
      let stony = max(smoothstep(0.58, 0.8, macro1.a + (macro2.a - 0.5) * 0.25), smoothstep(0.12, 0.3, steep)) * smoothstep(0.95, 0.5, snowAmt * 0.75);
      snowTex = vec4f(mix(sn.rgb, sr.rgb, stony), stony);
      haveSnow = true;
    }
    // Under the pines, a floor of old needles and cones, not plain dark.
    if (fm.g > 0.02) { floorCol = textureSampleGrad(groundColor, repeatSmp, uvA * 0.8, 14, dxA * 0.8, dyA * 0.8).rgb; haveFloor = true; }
    // Fen and ash, in the countries that have them.
    if (ft.a > 0.2) { fenCol = textureSampleGrad(groundColor, repeatSmp, uvB, 15, dxB, dyB).rgb; }
    if (fk.r > 0.15) { ashCol = textureSampleGrad(groundColor, repeatSmp, uvC, 16, dxC, dyC).rgb; }
  }

  // Dirt shows through where the grass's own height runs low.
  let edge = clamp(dirtBase * 1.7 - 0.35 + (dirtDet.a - grassDet.a) * 0.9 + (macro2.b - 0.5) * 0.35, 0.0, 1.0);
  let dirt = smoothstep(0.32, 0.68, edge);
  var albedo = mix(mix(vec3f(dot(grassCol.rgb, vec3f(0.3, 0.6, 0.1))), grassCol.rgb, 0.5) * vec3f(0.58, 0.57, 0.4), dirtCol.rgb, dirt);
  var det = mix(grassDet, dirtDet, dirt);
  // Meadow far from the village goes drier and more varied, like the hills under this light.
  let farDry = smoothstep(90.0, 420.0, length(p.xz));
  albedo = mix(albedo, mix(vec3f(dot(albedo, vec3f(0.3, 0.6, 0.1))), albedo, 0.55) * vec3f(0.92, 0.9, 0.76), farDry * 0.85);
  albedo *= 0.8 + macro2.r * 0.45;
  // And a broader wash over the meadows, some sixty metres across: greener, yellower, greyer stretches, so the grass's paintings
  // never show their repeat from a hilltop.
  if (!LEAN) {
    let wash = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.017 + 0.71, 0.0);
    let grassy = 1.0 - dirt;
    albedo *= mix(vec3f(1.0), mix(vec3f(0.9, 0.97, 0.84), vec3f(1.1, 1.04, 0.92), wash.g) * (0.9 + 0.2 * wash.b), grassy);
  }
  // The fen's reeds and black water; the Ashen Waste's grey cinders.
  if (!LEAN) {
    let fenAmt = smoothstep(0.25, 0.6, ft.a + (macro2.g - 0.5) * 0.3) * (1.0 - dirt * 0.6);
    albedo = mix(albedo, fenCol * 0.85, fenAmt);
    let ashAmt = smoothstep(0.2, 0.55, fk.r + (macro2.b - 0.5) * 0.3) * (1.0 - roadAmt * 0.5);
    albedo = mix(albedo, ashCol * 0.9, ashAmt);
  }
  // The road's two ruts, darker and, in the wet, holding water; the crown between them greening over; its dust lighter than the dirt.
  var rut = 0.0;
  if (!LEAN && nearIn > 0.0 && rw > 1.3) {
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
  det = mix(det, rockDet, rockAmt * select(0.0, 1.0, haveRock));
  // Snow over all, thinning where the slope's too steep to hold it.
  var snowCol = vec3f(0.84, 0.87, 0.93) * (0.88 + 0.16 * grassDet.a);
  if (haveSnow) { snowCol = snowTex.rgb * mix(vec3f(1.04, 1.05, 1.08), vec3f(1.0), snowTex.a); }
  albedo = mix(albedo, snowCol, snowAmt);
  // Under the pines, old needles in the dark (less where the snow's got in).
  // (Where the stand's thick, the whole floor is needles, its edge wandering out into the grass.)
  let floorAmt = select(fm.g, smoothstep(0.12, 0.55, fm.g + (macro2.g - 0.5) * 0.3), haveFloor) * (1.0 - dirt * 0.7) * (1.0 - snowAmt * 0.6);
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

export const STATIC = COMMON + /* wgsl */ `
@group(1) @binding(0) var colorArr: texture_2d_array<f32>;
@group(1) @binding(1) var detailArr: texture_2d_array<f32>;
@group(1) @binding(2) var<uniform> layers: array<vec4f, 64>;

struct V {
  @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f,
  @location(3) @interpolate(flat) layer: u32, @location(4) viewZ: f32,
};

@vertex fn vs(@location(0) pIn: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) layer: u32) -> V {
  var o: V;
  var p = pIn;
  let params = layers[min(layer % 1000u, 63u)];
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
  // rgb + roughness for the few materials with no painting.
  if (id == 100u) { return vec4f(0.035, 0.034, 0.036, 0.42); }  // iron
  if (id == 101u) { return vec4f(1.0, 0.6, 0.2, 1.0); }         // flame (emissive below)
  if (id == 102u) { return vec4f(0.01, 0.018, 0.02, 0.05); }    // well water
  if (id == 103u) { return vec4f(0.45, 0.07, 0.05, 0.4); }      // apples
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
  let flat_ = lay >= 100u;
  let params = layers[min(lay, 63u)];
  let layerI = i32(min(lay, 63u));
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
    var h = textureSampleGrad(detailArr, repeatSmp, cur, layerI, dx, dy).a;
    var ray = 1.0;
    var hPrev = h;
    for (var i = 0; i < i32(steps); i++) {
      if (ray <= h) { break; }
      ray -= 1.0 / steps;
      cur -= delta;
      hPrev = h;
      h = textureSampleGrad(detailArr, repeatSmp, cur, layerI, dx, dy).a;
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

  var tex = textureSampleGrad(colorArr, repeatSmp, uv, layerI, dx, dy);
  var det = textureSampleGrad(detailArr, repeatSmp, uv, layerI, dx, dy);
  if (!LEAN && params.z < -1.5) {
    // Never the same stone twice: a slow noise picks between two copies of the tile, each shifted its own way, and they
    // meet along the height of the stone, so the seam runs in the mortar. The tile's repeat goes.
    let l = textureSampleLevel(noiseTex, repeatSmp, uv * 0.11 + 0.37, 0.0).r * 12.0;
    let ia = floor(l);
    let oa = sin(vec2f(3.0, 7.0) * ia); let ob = sin(vec2f(3.0, 7.0) * (ia + 1.0));
    let da = textureSampleGrad(detailArr, repeatSmp, uv + oa, layerI, dx, dy);
    let db = textureSampleGrad(detailArr, repeatSmp, uv + ob, layerI, dx, dy);
    let w = smoothstep(0.3, 0.7, l - ia + (db.a - da.a) * 1.1);
    tex = mix(textureSampleGrad(colorArr, repeatSmp, uv + oa, layerI, dx, dy), textureSampleGrad(colorArr, repeatSmp, uv + ob, layerI, dx, dy), w);
    det = mix(da, db, w);
  }
  if (flat_) {
    let m = flatMaterial(lay, p, F.camPos.w);
    albedo = m.rgb; rough = m.a;
    let t = F.camPos.w;
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
    if (lay >= 120u && lay < 130u) {
      // Jelly: dark and clear where you look straight through it, lit at the rim, its own glow in it; white for a moment when struck.
      let L = SLIME_LOOK[lay - 120u];
      let fres = pow(1.0 - clamp(abs(dot(n0, v)), 0.0, 1.0), 2.2);
      let heart = smoothstep(0.35, 0.95, in.uv.x) * (1.0 - fres);
      albedo = L.rgb * mix(0.55, 0.18, heart);
      rough = 0.06;
      emissive = L.rgb * (L.w * 2.2 + 0.05) * (1.0 - 0.6 * heart) + SLIME_RIM[lay - 120u] * fres * 0.55 + vec3f(in.uv.y * 1.6);
    }
    if (lay == 100u || lay == 105u) { metal = 0.9; }
    if (lay == 101u) {
      // (Its own light beside it, put out: src/gfx/homelights.js. A light the frame has no room for leaves the flame be.)
      for (var li = 0u; li < u32(F.counts.x); li++) {
        let L = F.lights[li];
        if (L.colI.w < 0.03 && distance(p, L.posR.xyz) < 0.45) { discard; }
      }
      let f = 0.85 + 0.15 * sin(F.camPos.w * 11.0 + p.x * 9.0) * sin(F.camPos.w * 7.3);
      // (Without bloom to carry it, that heat would only be a white square, so it's a plain gold instead.)
      emissive = select(vec3f(14.0, 7.0, 2.4), vec3f(2.2, 1.2, 0.3), F.blood.w < 0.5) * f;
      albedo = vec3f(0.0);
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
@fragment fn fsCut(in: VC) { if (textureSampleLevel(colorArr, smp, in.uv, i32(in.layer), 1.0).a < 0.5) { discard; } }
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
  let pxSize = max(length(dpdx(in.bind)), length(dpdy(in.bind)));
  let wound = evalWounds(in.bind, normalize(in.bindN), in.piece, F.camPos.w, pxSize);
  var n = perturb(n0, p, in.uv, nm.rg, 1.0);
  // Mail under the plates: rows of little rings, from the bind pose so they ride with the body. They melt to an
  // even dull steel with distance rather than sparkling.
  let isMail = in.uv.x > 1.5;
  let ab_ = abs(normalize(in.bindN));
  let qA = select(select(in.bind.xy, in.bind.xz, ab_.y > ab_.z), in.bind.zy, ab_.x > ab_.y && ab_.x > ab_.z);
  // (Larger on a phone, or at its resolution they melt away, and a visor's grille with them.)
  let g_ = qA * vec2f(115.0, 200.0) * select(1.0, 0.5, LEAN);
  let ringFade = 1.0 - smoothstep(0.12, 0.35, max(length(dpdx(g_)), length(dpdy(g_))));
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
  let darkPaint = (1.0 - smoothstep(0.06, 0.2, paint)) * metal * (1.0 - C.info.z);
  albedo = mix(albedo, vec3f(paint), darkPaint * 0.75);
  albedo = mix(albedo, max(albedo * 0.85 + 0.015, vec3f(0.07, 0.068, 0.066) * mix(1.0, 3.4, C.info.z)), metal);
  rough = mix(rough, max(rough, mix(0.34, 0.22, darkPaint)), metal);
  envBoost = mix(1.0, 1.4, metal);
  sunSpecScale = mix(1.0, 0.55, darkPaint);
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
  var ao = 1.0 - wound.cut * 0.55;
  // The hole shows wet dark flesh.
  let pulse = 0.5 + 0.5 * sin(C.info.x * 6.28318);
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
  let shadow = shadowAt(p, n0, in.viewZ, ign(in.pos.xy));
  var c = shadePBR(p, n, v, albedo, rough, metal, ao, shadow);
  // Bright torn lips stay findable at fighting range, and flash for an instant as the blade goes by.
  c += vec3f(0.17, 0.165, 0.155) * wound.lip * (0.45 + 0.55 * max(dot(n, F.sunDir.xyz), 0.0));
  c += vec3f(5.0, 2.6, 0.9) * wound.hot;
  // A cool edge of sky around the silhouette separates dark plate from anything behind it.
  let rimT = pow(1.0 - max(dot(n0, v), 0.0), 4.0) * select(1.0, smoothstep(0.0, 0.14, dot(n0, v)), LEAN);
  // (Below there's no sky: firelight, on bare flesh as much as plate, so a body comes off a dark wall.)
  c += select(F.skyAmb.rgb * 0.32 * (0.35 + 0.65 * metal), vec3f(0.5, 0.31, 0.17), indoorAt(p) > 1.5) * rimT * C.info.y;
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
  let up = n.y * 0.5 + 0.5;
  var ambient = mix(F.groundAmb.rgb, F.skyAmb.rgb, up);
  if (indoor > 1.5) { ambient = vec3f(0.044, 0.044, 0.048); } else if (indoor > 0.5) { ambient = mix(vec3f(0.12, 0.095, 0.08), vec3f(0.2, 0.19, 0.22), up); }
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
  if (indoor > 0.5) { reflected *= select(0.22, 0.05, indoor > 1.5); }
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
  let metal = (1.0 - smoothstep(0.15, 0.4, sat)) * smoothstep(0.1, 0.26, mx);
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
  let albedo = textureSample(albedoTex, repeatSmp, in.uv).rgb;
  let nm = textureSample(normalTex, repeatSmp, in.uv);
  let mr = textureSample(mrTex, repeatSmp, in.uv);
  let n = perturb(n0, in.p, in.uv, nm.rg, 1.0);
  let shadow = shadowAt(in.p, n0, in.viewZ, ign(in.pos.xy));
  // A dropped thing's rarity: a little all over, and strongest where it turns from the eye. (A gem's glow is flat: a = 0.)
  let rim = pow(1.0 - clamp(dot(n0, v), 0.0, 1.0), 2.2);
  var c = shadePBR(in.p, n, v, albedo, mr.g, mr.b, 1.0, shadow) + I.glow.rgb * mix(1.0, 0.05 + 1.5 * rim * rim, I.glow.a);
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
  var rough = mr.g; var metal = mr.b;
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
@fragment fn fs(in: V) -> Out {
  let q = F.invViewProj * vec4f(in.ndc, 1e-4, 1.0);
  let d = normalize(q.xyz / q.w - F.camPos.xyz);
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
