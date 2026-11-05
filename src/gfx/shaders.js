// WGSL shared by the world's pipelines: the frame block, lighting, shadows, fog.

export const COMMON = /* wgsl */ `
struct Light { posR: vec4f, colI: vec4f };
struct Frame {
  viewProj: mat4x4f,
  view: mat4x4f,
  proj: mat4x4f,
  invViewProj: mat4x4f,
  vmProj: mat4x4f,
  vmToWorld: mat4x4f,
  cascades: array<mat4x4f, 3>,
  camPos: vec4f,          // w = time
  sunDir: vec4f,          // w = shadow softness
  sunColor: vec4f,
  skyAmb: vec4f,
  groundAmb: vec4f,
  fogColor: vec4f,        // a = density
  fogParams: vec4f,       // x = height falloff, y = sun tint
  splits: vec4f,
  screen: vec4f,          // w, h, 1/w, 1/h
  wind: vec4f,            // xz = direction, y = strength, w = gust phase
  ground: vec4f,          // ground map: min x, min z, 1/size, grass tint
  blood: vec4f,           // blood map: min x, min z, 1/size, whether there's bloom
  chars: array<vec4f, 6>, // bodies pressing the grass
  lights: array<Light, 12>,
  counts: vec4f,          // x = lights, y = cascades, z = pom, w = grass near radius
};

@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var repeatSmp: sampler;
@group(0) @binding(2) var clampSmp: sampler;
@group(0) @binding(3) var shadowSmp: sampler_comparison;
@group(0) @binding(4) var shadowTex: texture_depth_2d_array;
@group(0) @binding(5) var envTex: texture_2d<f32>;
@group(0) @binding(6) var groundMap: texture_2d<f32>;
@group(0) @binding(7) var bloodMap: texture_2d<f32>;
@group(0) @binding(8) var noiseTex: texture_2d<f32>;

const PI = 3.14159265;
var<private> sunSpecScale = 1.0;
var<private> envBoost = 1.0;

fn ign(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715)))); }
fn octDecode(u: u32) -> vec3f {
  let v = unpack4x8snorm(u);
  return normalize(v.xyz);
}

fn envDir(d: vec3f, lod: f32) -> vec3f {
  let u = atan2(d.x, d.z) / (2.0 * PI) + 0.5;
  let v = acos(clamp(d.y, -1.0, 1.0)) / PI;
  return textureSampleLevel(envTex, clampSmp, vec2f(u, v), lod).rgb;
}

fn cascadeFor(p: vec3f, viewZ: f32) -> i32 {
  var c = 0;
  let n = i32(F.counts.y);
  if (viewZ > F.splits.x && n > 1) { c = 1; }
  if (viewZ > F.splits.y && n > 2) { c = 2; }
  return c;
}

fn shadowAt(p: vec3f, n: vec3f, viewZ: f32, seed: f32) -> f32 {
  let c = cascadeFor(p, viewZ);
  if (viewZ > F.splits.z) { return 1.0; }
  let offset = n * (0.012 + f32(c) * 0.03);
  let cp = F.cascades[c] * vec4f(p + offset, 1.0);
  let uv = vec2f(cp.x * 0.5 + 0.5, 0.5 - cp.y * 0.5);
  // On a phone: three taps close up, so leaf shadows stay soft, and one further off, where small pixels hide the edge.
  if (LEAN) {
    var s1 = textureSampleCompareLevel(shadowTex, shadowSmp, uv, c, cp.z);
    if (c == 0) {
      let k = F.sunDir.w * 0.5;
      s1 = (s1 + textureSampleCompareLevel(shadowTex, shadowSmp, uv + vec2f(k, k * 0.6), c, cp.z) + textureSampleCompareLevel(shadowTex, shadowSmp, uv + vec2f(-k, k * 0.6), c, cp.z)) / 3.0;
    }
    return mix(s1, 1.0, smoothstep(F.splits.z * 0.86, F.splits.z, viewZ));
  }
  let texel = F.sunDir.w * (1.0 + f32(c) * 0.25);
  let a = seed * 6.2831853;
  let ca = cos(a); let sa = sin(a);
  var s = 0.0;
  // A small rotated Vogel disc: soft edges for few taps.
  for (var i = 0; i < 6; i++) {
    let r = sqrt((f32(i) + 0.5) / 6.0);
    let t = f32(i) * 2.399963;
    let o = vec2f(cos(t), sin(t)) * r;
    let q = vec2f(o.x * ca - o.y * sa, o.x * sa + o.y * ca) * texel;
    s += textureSampleCompareLevel(shadowTex, shadowSmp, uv + q, c, cp.z);
  }
  s /= 6.0;
  // Fade out at the far edge.
  let edge = smoothstep(F.splits.z * 0.86, F.splits.z, viewZ);
  return mix(s, 1.0, edge);
}

fn shadowQuick(p: vec3f, viewZ: f32) -> f32 {
  if (viewZ > F.splits.z) { return 1.0; }
  let c = cascadeFor(p, viewZ);
  let cp = F.cascades[c] * vec4f(p + F.sunDir.xyz * 0.04, 1.0);
  let uv = vec2f(cp.x * 0.5 + 0.5, 0.5 - cp.y * 0.5);
  return textureSampleCompareLevel(shadowTex, shadowSmp, uv, c, cp.z);
}

fn dGGX(nh: f32, a: f32) -> f32 { let a2 = a * a; let d = nh * nh * (a2 - 1.0) + 1.0; return a2 / max(PI * d * d, 1e-4); }
fn vSmith(nv: f32, nl: f32, a: f32) -> f32 {
  let k = a * 0.5;
  return 0.25 / max((nv * (1.0 - k) + k) * (nl * (1.0 - k) + k), 1e-3);
}
fn fSchlick(f0: vec3f, vh: f32) -> vec3f { return f0 + (vec3f(1.0) - f0) * pow(1.0 - vh, 5.0); }

fn brdf(n: vec3f, v: vec3f, l: vec3f, albedo: vec3f, f0: vec3f, rough: f32, metal: f32) -> vec3f {
  let nl = max(dot(n, l), 0.0);
  // On a phone, earth and plaster are lit as what they nearly are: a highlight that rough is hardly there. It fades out
  // rather than stopping at a line, or a surface whose paint hovers around that line goes to pepper.
  if (LEAN && rough > 0.92 && metal < 0.02) { return albedo / PI * nl; }
  let h = normalize(v + l);
  let nv = max(dot(n, v), 0.02);
  let nh = max(dot(n, h), 0.0);
  let vh = max(dot(v, h), 0.0);
  let a = max(rough * rough, 0.012);
  let spec = dGGX(nh, a) * vSmith(nv, nl, a) * fSchlick(f0, vh) * sunSpecScale * select(1.0, 1.0 - smoothstep(0.75, 0.92, rough), LEAN && metal < 0.02);
  let diff = albedo * (1.0 - metal) / PI;
  return (diff + spec) * nl;
}

// Indoors the sky doesn't reach. 0 outside, 1 in the cathedral, 2 below. The boxes are the inside of tools/interior/build_interior.py's walls.
fn indoorAt(p: vec3f) -> f32 {
  if (p.x < 65.9) { return 0.0; }
  if (p.x < 113.0) { return select(0.0, 1.0, abs(p.z) < 13.9 && p.y < 24.0); }
  if (p.x < 125.0) { return select(0.0, 1.0, abs(p.z) < 7.2 && p.y < 9.5); }
  // (The land above is out here too, and never as low as the catacombs' ceilings.)
  if (p.x < 176.0 && abs(p.z) < 3.0 && p.y < 9.5) { return 2.0; }
  return select(0.0, 2.0, p.x < 262.0 && p.z > -108.0 && p.z < 45.0 && p.y < -6.0);
}

fn shadePBR(p: vec3f, n: vec3f, v: vec3f, albedo: vec3f, rough: f32, metal: f32, ao: f32, shadow: f32) -> vec3f {
  let f0 = mix(vec3f(0.04), albedo, metal);
  let indoor = indoorAt(p);
  var c = vec3f(0.0);
  if (indoor < 0.5) { c = brdf(n, v, F.sunDir.xyz, albedo, f0, rough, metal) * F.sunColor.rgb * shadow; }
  // Ambient: the sky's hemisphere for diffuse, its picture for reflections.
  let up = n.y * 0.5 + 0.5;
  var ambient = mix(F.groundAmb.rgb, F.skyAmb.rgb, up);
  if (indoor > 1.5) { ambient = vec3f(0.085, 0.072, 0.06); } else if (indoor > 0.5) { ambient = mix(vec3f(0.12, 0.095, 0.08), vec3f(0.2, 0.19, 0.22), up); }
  let nv = max(dot(n, v), 0.0);
  let refl = reflect(-v, n);
  // On a phone only metal reads the sky's picture. On anything else it's a faint sheen, and this fit to that picture, as
  // blurred as a rough surface sees it, does as well.
  let toSun = max(dot(refl, F.sunDir.xyz), 0.0);
  var env = vec3f(0.08, 0.12, 0.15) + vec3f(0.16, 0.16, 0.15) * toSun * toSun;
  if (!LEAN || metal > 0.02) {
    let lod = rough * 7.0;
    // Steel takes the sky's brightness more than its colour.
    let envRaw = envDir(refl, lod);
    env = mix(vec3f(dot(envRaw, vec3f(0.2126, 0.7152, 0.0722))), envRaw, 0.62);
  }
  // (On a phone the very edge-on sheen goes: on a plate's thin rim it's a line of bright specks a low resolution can't hold.)
  let fr = f0 + (max(vec3f(1.0 - rough), f0) - f0) * pow(1.0 - nv, 5.0) * select(1.0, smoothstep(0.0, 0.14, nv), LEAN);
  // The ground's reflection, when the mirror direction looks down, is dim and warm.
  let horizon = smoothstep(-0.25, 0.12, refl.y);
  var reflected = mix(F.groundAmb.rgb * 0.8, env, horizon);
  if (indoor > 0.5) { reflected *= select(0.22, 0.05, indoor > 1.5); }
  let sunOcc = mix(0.55, 1.0, shadow);
  c += albedo * (1.0 - metal) * ambient * ao;
  c += reflected * fr * ao * sunOcc * envBoost;
  // Lanterns and lit windows.
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

fn applyFog(c: vec3f, p: vec3f, viewDir: vec3f, dist: f32) -> vec3f {
  let indoor = indoorAt(p);
  if (indoor > 0.5) {
    // Dust, and at the bottom of the stair a damp that swallows the far end of a long gallery.
    let inside = select(vec3f(0.05, 0.045, 0.04), vec3f(0.012, 0.007, 0.0045), indoor > 1.5);
    return mix(c, inside, clamp(1.0 - exp(-dist * select(0.005, 0.0055, indoor > 1.5)), 0.0, 1.0));
  }
  let h = max(p.y, -5.0);
  let density = F.fogColor.a * exp(-max(h, 0.0) * F.fogParams.x);
  let f = 1.0 - exp(-dist * density);
  let s = pow(max(dot(viewDir, F.sunDir.xyz), 0.0), 6.0);
  let col = mix(F.fogColor.rgb, F.sunColor.rgb * 0.34, s * F.fogParams.y);
  return mix(c, col, clamp(f, 0.0, 1.0));
}

// Mikkelsen's bump from a height field, with no tangents.
fn bumpNormal(n: vec3f, p: vec3f, h: f32) -> vec3f {
  let dpx = dpdx(p); let dpy = dpdy(p);
  let r1 = cross(dpy, n); let r2 = cross(n, dpx);
  let det = dot(dpx, r1);
  let g = sign(det) * (dpdx(h) * r1 + dpdy(h) * r2);
  return normalize(abs(det) * n - g);
}

// Tangent frame from screen derivatives, for normal maps on meshes with no tangents.
fn perturb(n: vec3f, p: vec3f, uv: vec2f, m: vec2f, strength: f32) -> vec3f {
  return perturbD(n, dpdx(p), dpdy(p), dpdx(uv), dpdy(uv), m, strength);
}
fn perturbD(n: vec3f, dp1: vec3f, dp2: vec3f, duv1: vec2f, duv2: vec2f, m: vec2f, strength: f32) -> vec3f {
  let dp2p = cross(dp2, n); let dp1p = cross(n, dp1);
  let t = dp2p * duv1.x + dp1p * duv2.x;
  let b = dp2p * duv1.y + dp1p * duv2.y;
  let inv = 1.0 / sqrt(max(max(dot(t, t), dot(b, b)), 1e-12));
  let mxy = (m * 2.0 - 1.0) * strength;
  let mz = sqrt(clamp(1.0 - dot(mxy, mxy), 0.0, 1.0));
  return normalize(t * inv * mxy.x + b * inv * mxy.y + n * mz);
}

struct Out { @location(0) color: vec4f, @location(1) depth: f32 };
`;

// The skinning compute shader: dual quaternions, so a plate blended across two joints stays rigid.
export const SKIN = /* wgsl */ `
struct Params { count: u32, flexAmp: f32, time: f32, pad: f32, wind: vec4f };
struct In { pos: vec3f, flex: f32, normal: vec3f, piece: u32, joints: u32, weights: u32, u: f32, v: f32 };
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> palette: array<vec4f>;
@group(0) @binding(2) var<storage, read> verts: array<In>;
@group(0) @binding(3) var<storage, read_write> outV: array<vec4f>;
@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= P.count) { return; }
  let v = verts[i];
  let w = unpack4x8unorm(v.weights);
  let j0 = v.joints & 255u; let j1 = (v.joints >> 8u) & 255u; let j2 = (v.joints >> 16u) & 255u; let j3 = v.joints >> 24u;
  let q0 = palette[j0 * 2u];
  var r = q0 * w.x;
  var d = palette[j0 * 2u + 1u] * w.x;
  if (w.y > 0.0) {
    let q = palette[j1 * 2u]; let s = select(w.y, -w.y, dot(q, q0) < 0.0);
    r += q * s; d += palette[j1 * 2u + 1u] * s;
    if (w.z > 0.0) {
      let q2 = palette[j2 * 2u]; let s2 = select(w.z, -w.z, dot(q2, q0) < 0.0);
      r += q2 * s2; d += palette[j2 * 2u + 1u] * s2;
      if (w.w > 0.0) {
        let q3 = palette[j3 * 2u]; let s3 = select(w.w, -w.w, dot(q3, q0) < 0.0);
        r += q3 * s3; d += palette[j3 * 2u + 1u] * s3;
      }
    }
  }
  let il = 1.0 / length(r);
  r *= il; d *= il;
  let t = 2.0 * (r.w * d.xyz - d.w * r.xyz + cross(r.xyz, d.xyz));
  var p = v.pos + 2.0 * cross(r.xyz, cross(r.xyz, v.pos) + r.w * v.pos);
  p += t;
  let n = v.normal + 2.0 * cross(r.xyz, cross(r.xyz, v.normal) + r.w * v.normal);
  if (v.flex > 0.0) {
    // Cloth sways in the wind and trails the body.
    let f = v.flex * v.flex;
    let ph = P.time * 2.6 + p.y * 4.0 + v.pos.x * 7.0;
    p += (P.wind.xyz * (sin(ph) * 0.5 + 0.6) + vec3f(sin(ph * 1.3), 0.0, cos(ph * 0.9)) * 0.022) * f * P.flexAmp;
  }
  outV[i] = vec4f(p, bitcast<f32>(pack4x8snorm(vec4f(n, 0.0))));
}
`;
