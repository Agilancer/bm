// WGSL for everything drawn in the world pass.
import { COMMON } from './shaders.js';

export const TERRAIN = COMMON + /* wgsl */ `
@group(1) @binding(0) var groundColor: texture_2d_array<f32>;
@group(1) @binding(1) var groundDetail: texture_2d_array<f32>;

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
  let dirtBase = gm.r * inMap;
  let macro2 = textureSampleLevel(noiseTex, repeatSmp, p.xz * 0.043 + 0.31, 0.0);

  let uvA = p.xz * 0.2;
  var grassCol: vec4f; var grassDet: vec4f; var dirtCol: vec4f; var dirtDet: vec4f;
  if (LEAN) {
    // One painting of each ground and one detail map on a phone (the paintings nearest the average of their kind, and
    // the relief of whichever ground this mostly is): the ground covers half the screen, so these three reads in place of
    // eight are the biggest saving in the frame.
    grassCol = textureSample(groundColor, repeatSmp, uvA, 5);
    // The patchwork the other paintings gave: warmer and cooler stretches, and dry ones.
    grassCol = vec4f(grassCol.rgb * mix(vec3f(1.2, 1.02, 0.85), vec3f(0.88, 1.0, 1.08), smoothstep(0.3, 0.7, macro2.g)), grassCol.a);
    grassCol = vec4f(mix(grassCol.rgb, vec3f(0.24, 0.2, 0.09), smoothstep(0.52, 0.78, macro2.r) * 0.38), grassCol.a);
    dirtCol = textureSample(groundColor, repeatSmp, uvA, 1);
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
  }

  // Dirt shows through where the grass's own height runs low.
  let edge = clamp(dirtBase * 1.7 - 0.35 + (dirtDet.a - grassDet.a) * 0.9 + (macro2.b - 0.5) * 0.35, 0.0, 1.0);
  let dirt = smoothstep(0.32, 0.68, edge);
  var albedo = mix(mix(vec3f(dot(grassCol.rgb, vec3f(0.3, 0.6, 0.1))), grassCol.rgb, 0.72) * vec3f(0.66, 0.62, 0.38), dirtCol.rgb, dirt);
  var det = mix(grassDet, dirtDet, dirt);
  // Meadow far from the village goes drier and more varied, like the hills under this light.
  let farDry = smoothstep(90.0, 420.0, length(p.xz));
  albedo = mix(albedo, albedo * vec3f(1.12, 0.95, 0.6) + vec3f(0.02, 0.012, 0.0), farDry * 0.8);
  albedo *= 0.8 + macro2.r * 0.45;
  // Under the blades the soil sits in shade.
  let grassCover = gm.g * inMap * (1.0 - smoothstep(F.counts.w * 0.75, F.counts.w, dist));
  albedo *= 1.0 - grassCover * 0.38;
  var rough = mix(0.95, det.b, 0.7);
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
@group(1) @binding(2) var<uniform> layers: array<vec4f, 48>;

struct V {
  @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f,
  @location(3) @interpolate(flat) layer: u32, @location(4) viewZ: f32,
};

@vertex fn vs(@location(0) pIn: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) layer: u32) -> V {
  var o: V;
  var p = pIn;
  let params = layers[min(layer, 47u)];
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

fn flatMaterial(id: u32, p: vec3f, t: f32) -> vec4f {
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
  let flat_ = in.layer >= 100u;
  let params = layers[min(in.layer, 47u)];
  let layerI = i32(min(in.layer, 47u));
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
    for (var i = 0; i < i32(steps); i++) {
      if (ray <= h) { break; }
      ray -= 1.0 / steps;
      cur -= delta;
      h = textureSampleGrad(detailArr, repeatSmp, cur, layerI, dx, dy).a;
    }
    uv = cur;
    ao = mix(1.0, 0.45 + 0.55 * smoothstep(0.2, 0.62, h), fade);
  }

  let tex = textureSampleGrad(colorArr, repeatSmp, uv, layerI, dx, dy);
  let det = textureSampleGrad(detailArr, repeatSmp, uv, layerI, dx, dy);
  if (flat_) {
    let m = flatMaterial(in.layer, p, F.camPos.w);
    albedo = m.rgb; rough = m.a;
    if (in.layer == 100u || in.layer == 105u) { metal = 0.9; }
    if (in.layer == 101u) {
      let f = 0.85 + 0.15 * sin(F.camPos.w * 11.0 + p.x * 9.0) * sin(F.camPos.w * 7.3);
      // (Without bloom to carry it, that heat would only be a white square, so it's a plain gold instead.)
      emissive = select(vec3f(14.0, 7.0, 2.4), vec3f(2.2, 1.2, 0.3), F.blood.w < 0.5) * f;
      albedo = vec3f(0.0);
    }
  } else {
    if (params.x > 0.0 && tex.a < 0.5) { discard; }
    albedo = tex.rgb;
    rough = det.b;
    n = perturbD(n0, dp1, dp2, dx, dy, det.rg, 1.0);
    if (params.z > 1.5) {
      // Stained glass with the day behind it.
      emissive = pow(albedo, vec3f(1.5)) * params.z * 1.6;
      albedo *= 0.05;
    } else if (params.z > 0.0) {
      // Leaded glass reads as dark and glossy, and a fire is lit behind some of it.
      let glass = 1.0 - smoothstep(0.1, 0.26, det.b);
      let room = textureSampleLevel(noiseTex, repeatSmp, floor(uv * vec2f(5.0, 3.0)) * 0.137 + 0.11 * vec2f(in.f32Layer()), 0.0).r;
      let lit = smoothstep(0.48, 0.62, room);
      let flick = 0.86 + 0.14 * sin(F.camPos.w * 3.1 + room * 40.0);
      emissive = glass * lit * vec3f(1.9, 0.92, 0.3) * flick;
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
  c += F.skyAmb.rgb * rimT * 0.32 * (0.35 + 0.65 * metal) * C.info.y;
  c = applyFog(c, p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

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
  var c = shadePBR(in.p, n, v, albedo, mr.g, mr.b, 1.0, shadow) + I.glow.rgb;
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

struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uv: vec2f, @location(3) viewZ: f32, @location(4) bind: vec3f };

@vertex fn vs(@location(0) sk: vec4f, @location(1) bindP: vec3f, @location(2) piece: u32, @location(3) uv: vec2f) -> V {
  var o: V;
  let vp = M.sway * vec4f(sk.xyz, 1.0);
  o.pos = F.vmProj * vp;
  let w = F.vmToWorld * vp;
  o.p = w.xyz;
  let nv = unpack4x8snorm(bitcast<u32>(sk.w)).xyz;
  o.n = (F.vmToWorld * M.sway * vec4f(nv, 0.0)).xyz;
  o.uv = uv; o.bind = bindP;
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
  // The spell hands are held up against the light as often as not: a low, warm fill from the eye keeps the skin skin, and the fingers' roundness in view.
  // And a spell's light, so near, can colour them but not burn them out: the upper arm faces all of it.
  if (M.params.w < 0.0) {
    c += albedo * vec3f(0.62, 0.5, 0.42) * (0.3 + 0.7 * max(dot(n, v), 0.0));
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
  let base = mix(vec3f(dot(base0, vec3f(0.3, 0.6, 0.1))), base0, 0.72) * vec3f(0.72, 0.68, 0.42);
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
  var c = alb * (F.sunColor.rgb * (nl * 0.28 + backlit * 0.5 + 0.05) * shadow + mix(F.groundAmb.rgb, F.skyAmb.rgb, 0.65 + 0.3 * t) * (0.65 + 0.5 * t));
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
  // The sun's disc and a hot rim of glow.
  c += F.sunColor.rgb * 16.0 * smoothstep(0.99965, 0.99985, cs);
  c += F.sunColor.rgb * pow(max(cs, 0.0), 900.0) * 1.2;
  // Clouds: a drifting layer projected on a dome, lit from the low sun's side.
  if (d.y > 0.01) {
    let t = F.camPos.w * 0.0035;
    let uv = d.xz / (d.y + 0.18) * 0.085 + vec2f(t, t * 0.4);
    let n = fbm(uv);
    let cover = smoothstep(0.46, 0.74, n);
    // Lit from the low sun's side, or on a phone simply darker where it's thick.
    var lit = clamp(1.3 - n * 1.25, 0.0, 1.0);
    if (!LEAN) { lit = clamp((n - fbm(uv + F.sunDir.xz * 0.03)) * 5.0 + 0.55, 0.0, 1.0); }
    let base = mix(vec3f(0.42, 0.38, 0.44), vec3f(1.5, 1.05, 0.7), lit) * mix(0.8, 1.6, pow(max(cs, 0.0), 4.0));
    let fade = smoothstep(0.01, 0.16, d.y);
    c = mix(c, base, cover * fade * 0.9);
  }
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = 4000.0;
  return o;
}
`;

// Bakes the atmosphere into a panorama once, which then lights every reflection and fills the sky.
export const SKY_BAKE = /* wgsl */ `
struct U { sun: vec4f, tint: vec4f };
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
  // Below the horizon, the land catches the same light.
  if (d.y < 0.0) { c = mix(c, S.tint.rgb, 1.0 - smoothstep(-0.12, 0.0, d.y)); }
  return vec4f(c, 1.0);
}
`;
