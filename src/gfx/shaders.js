// WGSL shared by the world's pipelines: the frame block, lighting, shadows, fog.
import { CHURCH_X, CHURCH_Z, SEXTON } from '../core/church.js';
import { DUNGEON_BOX } from '../core/dungeon.js';
import { HALL_BOX } from '../core/testhall.js';

const f32 = (v) => v.toFixed(2);   // (a number into WGSL, as a float)
import { CAVE_BOX, CAVE_LINE, CHAMBER_FIRST } from '../core/opening.js';

// Lisandra's cave, as the shader sees it: a few straight pieces of its centreline, each with its half width and roof. How far
// into it a point is, 0 out on the ledge to 1 a few metres in, takes the sun away and puts the cave's own light in its place.
const CAVE_WGSL = (() => {
  const L = CAVE_LINE, pick = [];
  for (let i = 0; i < CHAMBER_FIRST; i += 6) pick.push(i);
  pick.push(CHAMBER_FIRST, L.length - 1);
  const A = [], B = [];
  let y0 = 1e9, y1 = -1e9;
  for (let k = 0; k + 1 < pick.length; k++) {
    const a = L[pick[k]], b = L[pick[k + 1]], chamber = b[8] >= 0 && a[8] >= 0;
    let w = 0, top = -1e9;
    for (let i = pick[k]; i <= pick[k + 1]; i++) { w = Math.max(w, L[i][6]); top = Math.max(top, L[i][5] + L[i][7]); y0 = Math.min(y0, L[i][5]); }
    top += chamber ? 1.0 : 0.4;
    y1 = Math.max(y1, top);
    A.push(`vec4f(${a[0].toFixed(3)}, ${a[1].toFixed(3)}, ${b[0].toFixed(3)}, ${b[1].toFixed(3)})`);
    B.push(`vec4f(${a[4].toFixed(3)}, ${b[4].toFixed(3)}, ${(w + (chamber ? 1.0 : 0.6)).toFixed(3)}, ${top.toFixed(3)})`);
  }
  const N = A.length, f = (v) => v.toFixed(2);
  return `
var<private> CAVE_A: array<vec4f, ${N}> = array<vec4f, ${N}>(${A.join(', ')});
var<private> CAVE_B: array<vec4f, ${N}> = array<vec4f, ${N}>(${B.join(', ')});
fn caveAt(p: vec3f) -> f32 {
  if (F.caveAmb.w < 0.5 || p.x < ${f(CAVE_BOX.x0)} || p.x > ${f(CAVE_BOX.x1)} || p.z < ${f(CAVE_BOX.z0)} || p.z > ${f(CAVE_BOX.z1)} || p.y < ${f(y0 - 1)} || p.y > ${f(y1)}) { return 0.0; }
  var best = 1.0e9; var s = -1.0; var w = 0.0; var top = 0.0;
  for (var i = 0; i < ${N}; i++) {
    let a = CAVE_A[i]; let b = CAVE_B[i];
    let e = a.zw - a.xy;
    let raw = dot(p.xz - a.xy, e) / dot(e, e);
    let t = clamp(raw, 0.0, 1.0);
    let d = length(p.xz - (a.xy + e * t));
    if (d < best) { best = d; s = mix(b.x, b.y, t); w = b.z; top = b.w; if (i == 0 && raw < 0.0) { s = raw * length(e); } }
  }
  if (best > w || p.y > top) { return 0.0; }
  return smoothstep(-0.3, 3.5, s);
}`;
})();

// How many lamps a frame can light (Frame.lights below; renderer.js and spellfx.js fill them).
export const MAX_LIT = 36;

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
  sunColor: vec4f,        // a = how much day there is behind a window
  skyAmb: vec4f,          // a = how far up the sun is, 0 to 1
  groundAmb: vec4f,
  fogColor: vec4f,        // a = density
  fogParams: vec4f,       // x = height falloff, y = sun tint
  splits: vec4f,
  screen: vec4f,          // w, h, 1/w, 1/h
  wind: vec4f,            // xz = direction, y = strength, w = gust phase
  ground: vec4f,          // ground map: min x, min z, 1/size, grass tint
  blood: vec4f,           // blood map: min x, min z, 1/size, whether there's bloom
  chars: array<vec4f, 6>, // bodies pressing the grass
  lights: array<Light, ${MAX_LIT}>,
  counts: vec4f,          // x = lights, y = cascades, z = pom, w = grass near radius
  caveAmb: vec4f,         // Lisandra's cave: its own ambient light, w = whether it's there at all
  feet: array<vec4f, 12>, // who stands near you, for the dark under them (underfoot): x, z, their soles' height, how wide
  feetBox: vec4f,         // the square that holds them all: min x, min z, max x, max z
  feetY: vec4f,           // the lowest and highest ground they could darken, how far off the dark has faded out, how many
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

// Indoors the sky doesn't reach. 0 outside, 1 in the cathedral, 1.25 in a house, 2 below, 3 in the Test Dungeon's white hall. The boxes are the inside of tools/interior/build_interior.py's walls.
fn inHome(p: vec3f, x: f32, z: f32, hx: f32, hz: f32, jx: f32, jz: f32, y1: f32, top: f32) -> bool {
  let up = p.y > y1;
  return p.y < top && abs(p.x - x) < hx + select(0.0, jx, up) && abs(p.z - z) < hz + select(0.0, jz, up);
}

fn indoorAt(p: vec3f) -> f32 {
  // The Hollowfang Warrens, out past the world's edge and deep under it (src/core/dungeon.js).
  if (p.x > ${f32(DUNGEON_BOX.x0)} && p.x < ${f32(DUNGEON_BOX.x1)} && p.z > ${f32(DUNGEON_BOX.z0)} && p.z < ${f32(DUNGEON_BOX.z1)} && p.y < -20.0) { return 2.0; }
  // The Test Dungeon, out past the other edge and as deep (src/core/testhall.js).
  if (p.x > ${f32(HALL_BOX.x0)} && p.x < ${f32(HALL_BOX.x1)} && p.z > ${f32(HALL_BOX.z0)} && p.z < ${f32(HALL_BOX.z1)} && p.y < ${f32(HALL_BOX.y1)}) { return 3.0; }
  if (p.x < ${f32(CHURCH_X + 65.9)}) {
    // The houses, to the inside of their walls, with the overhang upstairs. Written by tools/village/build_village.py, which is the one that knows.
    if (p.y < 0.0) { return 0.0; }
    // <homes>
    return select(0.0, 1.25, inHome(p, 1.00, -19.93, 9.32, 4.58, 0.00, 0.42, 3.40, 6.07)
      || inHome(p, -19.88, 0.50, 4.33, 5.89, 0.50, 0.00, 3.30, 6.27)
      || inHome(p, 19.32, 3.50, 4.08, 6.51, 0.00, 0.00, 3.50, 6.17)
      || inHome(p, 9.50, 21.82, 6.20, 4.08, 0.00, 0.00, 2.80, 5.17)
      || inHome(p, -10.82, 36.00, 4.08, 5.58, 0.00, 0.00, 3.10, 5.57)
      || inHome(p, 16.88, 37.00, 4.33, 6.20, 0.50, 0.00, 3.30, 5.97)
      || inHome(p, 38.00, -37.00, 7.45, 4.95, 0.00, 0.00, 3.50, 6.27)
      || inHome(p, 44.00, -15.05, 4.95, 4.70, 0.00, 0.00, 3.10, 5.47)
      || inHome(p, -40.75, -14.00, 3.70, 6.83, 0.35, 0.00, 3.00, 5.37)
      || inHome(p, -42.88, 18.00, 4.33, 5.26, 0.00, 0.00, 3.00, 5.37)
      || inHome(p, 8.00, -38.00, 4.64, 4.95, 0.00, 0.50, 3.30, 6.07)
      || inHome(p, -30.00, -34.92, 4.58, 4.58, 0.00, 0.00, 3.40, 6.77)
      || inHome(p, 80.00, -12.50, 8.07, 4.95, 0.00, 0.00, 3.50, 6.37)
      || inHome(p, 64.00, 10.38, 5.89, 4.33, 0.00, 0.40, 3.10, 5.57)
      || inHome(p, 84.00, 10.88, 4.95, 4.33, 0.00, 0.00, 3.00, 5.37));
    // </homes>
  }
  // The church, in its own frame: it was moved out east of the town as a whole (src/core/church.js). inChurchFrame there is the same.
  let c = vec3f(p.x - ${f32(CHURCH_X)}, p.y, p.z - ${f32(CHURCH_Z)});
  if (c.x < 113.0) { return select(0.0, 1.0, abs(c.z) < 13.9 && c.y < 24.0); }
  if (c.x < 125.0) { return select(0.0, 1.0, (abs(c.z) < 6.5 && c.y < 9.5) || (c.x < 115.75 && c.z < 0.0 && c.z > -12.45 && c.y < 7.5)); }
  // (The land above is out here too, and never as low as the catacombs' ceilings.)
  // (The Sexton's passage in from the wing's south wall: src/core/church.js SEXTON.)
  if (c.x > ${f32(SEXTON.x0)} && c.x < ${f32(SEXTON.x1)} && c.z > ${f32(SEXTON.z0)} && c.z < ${f32(SEXTON.z1)} && c.y < ${f32(SEXTON.y)}) { return 1.0; }
  // (The stair's passage, under its falling roof: the land over it is outdoors.)
  if (c.x < 176.0 && abs(c.z) < 3.0 && c.y < 9.0 - (c.x - 125.0) * 0.33) { return 2.0; }
  return select(0.0, 2.0, c.x < 262.0 && c.z > -176.0 && c.z < 45.0 && c.y < -6.0);
}

${CAVE_WGSL}
// What stands on the ground keeps the sky's light, and most of a lamp's, off the ground right under it: a soft dark
// round its feet. The sun casts a shadow of its own; a cave, a room, the night and the shade had nothing, and whoever
// stood in them stood a little off the floor. Not on a phone. (renderer.js writeFeet says who.)
fn underfoot(p: vec3f) -> f32 {
  if (LEAN || p.x < F.feetBox.x || p.z < F.feetBox.y || p.x > F.feetBox.z || p.z > F.feetBox.w || p.y < F.feetY.x || p.y > F.feetY.y) { return 1.0; }
  var k = 1.0;
  let count = i32(F.feetY.w);
  for (var i = 0; i < count; i++) {
    let f = F.feet[i];
    let d = p.xz - f.xy;
    let q = dot(d, d) / (f.w * f.w);
    // (From half a metre under their soles, for a step or a slope, to a hand's breadth over them: the floor, and the very
    // bottom of a boot or a hem.)
    let h = p.y - f.z;
    if (q >= 1.0 || h > 0.3 || h < -0.5) { continue; }
    let near = clamp((F.feetY.z - distance(F.camPos.xz, f.xy)) / 6.0, 0.0, 1.0);
    k *= 1.0 - 0.62 * (1.0 - q) * (1.0 - q) * near * (1.0 - smoothstep(0.04, 0.3, h));
  }
  return k;
}

fn shadePBR(p: vec3f, n: vec3f, v: vec3f, albedo: vec3f, rough: f32, metal: f32, ao: f32, shadow: f32) -> vec3f {
  let f0 = mix(vec3f(0.04), albedo, metal);
  let indoor = indoorAt(p);
  let cave = caveAt(p);
  var c = vec3f(0.0);
  if (indoor < 0.5 && cave < 0.99) { c = brdf(n, v, F.sunDir.xyz, albedo, f0, rough, metal) * F.sunColor.rgb * shadow * (1.0 - cave); }
  // Ambient: the sky's hemisphere for diffuse, its picture for reflections.
  let up = n.y * 0.5 + 0.5;
  var ambient = mix(F.groundAmb.rgb, F.skyAmb.rgb, up);
  // (The Test Dungeon is lit white from its ceilings: bright from above, the floor's light thrown back up.)
  if (indoor > 2.5) { ambient = mix(vec3f(0.36, 0.36, 0.38), vec3f(0.82, 0.83, 0.86), up); }
  else if (indoor > 1.5) { ambient = vec3f(0.044, 0.044, 0.048); } else if (indoor > 0.5) { ambient = mix(vec3f(0.12, 0.095, 0.08), vec3f(0.2, 0.19, 0.22), up); }
  // (A house's rooms have only their windows: at night, about a fifth of the day's. F.sunColor.a is the day behind a window.)
  if (indoor > 1.1 && indoor < 1.5) { ambient *= mix(0.25, 1.0, clamp((F.sunColor.a - 0.1) / 0.9, 0.0, 1.0)); }
  ambient = mix(ambient, F.caveAmb.rgb * mix(0.7, 1.15, up), cave);
  let nv = max(dot(n, v), 0.0);
  let refl = reflect(-v, n);
  // On a phone only metal reads the sky's picture. On anything else it's a faint sheen, and this fit to that picture, as
  // blurred as a rough surface sees it, does as well.
  let toSun = max(dot(refl, F.sunDir.xyz), 0.0);
  var env = F.skyAmb.rgb * vec3f(0.24, 0.29, 0.26) + F.sunColor.rgb * 0.045 * toSun * toSun;
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
  if (indoor > 0.5) { reflected *= select(select(0.22, 0.05, indoor > 1.5), 0.5, indoor > 2.5); }
  reflected *= mix(1.0, 0.06, cave);
  let sunOcc = mix(0.55, 1.0, shadow);
  let foot = underfoot(p);
  c += albedo * (1.0 - metal) * ambient * ao * foot;
  c += reflected * fr * ao * sunOcc * envBoost * foot;
  // Lanterns and lit windows.
  let lampFoot = mix(1.0, foot, 0.75);
  let nl = i32(F.counts.x);
  for (var i = 0; i < nl; i++) {
    let L = F.lights[i];
    let d = L.posR.xyz - p;
    let d2 = dot(d, d);
    let r = L.posR.w;
    if (d2 > r * r) { continue; }
    let att = pow(max(1.0 - d2 / (r * r), 0.0), 2.0) / max(d2, 0.25);
    c += brdf(n, v, normalize(d), albedo, f0, rough, metal) * L.colI.rgb * L.colI.w * att * lampFoot;
  }
  return c;
}

fn applyFog(c: vec3f, p: vec3f, viewDir: vec3f, dist: f32) -> vec3f {
  let indoor = indoorAt(p);
  let cave = caveAt(p);
  if (cave > 0.01) {
    // Deep in the hill the far end goes to murk, and seen from out on the ledge the tunnel is a dark throat.
    let murk = mix(c, F.caveAmb.rgb * 0.4, clamp(1.0 - exp(-dist * 0.035), 0.0, 1.0));
    return mix(c, murk, cave);
  }
  if (indoor > 2.5) {
    // The Test Dungeon: a faint white haze down the length of the arena, no more.
    return mix(c, vec3f(0.7, 0.72, 0.75), clamp(1.0 - exp(-dist * 0.0025), 0.0, 1.0));
  }
  if (indoor > 0.5) {
    // Dust, and at the bottom of the stair a damp that swallows the far end of a long gallery.
    let inside = select(vec3f(0.05, 0.045, 0.04), vec3f(0.012, 0.007, 0.0045), indoor > 1.5);
    return mix(c, inside, clamp(1.0 - exp(-dist * select(0.005, 0.003, indoor > 1.5)), 0.0, 1.0));
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

// Tangent frame from screen derivatives, for normal maps on meshes with no tangents. Maps are read the glTF way: red
// along u, green up the picture (v runs down it). The frame comes out scaled by the screen's handedness, and WebGPU's
// window y runs down, so for a face toward the eye it points along -u and -v; sign(det) turns it the right way round,
// front face or back. (Before, red was read backwards: every fold and seam lit from the wrong side, left to right.)
fn perturb(n: vec3f, p: vec3f, uv: vec2f, m: vec2f, strength: f32) -> vec3f {
  return perturbD(n, dpdx(p), dpdy(p), dpdx(uv), dpdy(uv), m, strength);
}
fn perturbD(n: vec3f, dp1: vec3f, dp2: vec3f, duv1: vec2f, duv2: vec2f, m: vec2f, strength: f32) -> vec3f {
  let dp2p = cross(dp2, n); let dp1p = cross(n, dp1);
  let t = dp2p * duv1.x + dp1p * duv2.x;
  let b = dp2p * duv1.y + dp1p * duv2.y;
  let det = dot(dp1, dp2p);
  let inv = select(1.0, -1.0, det < 0.0) / sqrt(max(max(dot(t, t), dot(b, b)), 1e-12));
  let mxy = (m * 2.0 - 1.0) * strength;
  let mz = sqrt(clamp(1.0 - dot(mxy, mxy), 0.0, 1.0));
  return normalize(t * inv * mxy.x - b * inv * mxy.y + n * mz);
}

struct Out { @location(0) color: vec4f, @location(1) depth: f32 };
`;

// The skinning compute shader: dual quaternions, so a plate blended across two joints stays rigid.
export const SKIN = /* wgsl */ `
struct Params { count: u32, flexAmp: f32, time: f32, cut: u32, wind: vec4f };
struct In { pos: vec3f, flex: f32, normal: vec3f, piece: u32, joints: u32, weights: u32, u: f32, v: f32 };
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> palette: array<vec4f>;
@group(0) @binding(2) var<storage, read> verts: array<In>;
@group(0) @binding(3) var<storage, read_write> outV: array<vec4f>;
// Push outward along the panel's original direction so a vertex that crosses
// the centre of a leg always returns to the correct side of the dress.
fn clearLeg(p: vec3f, outward: vec2f, a: vec4f, b: vec4f) -> f32 {
  let segment = b.xyz - a.xyz;
  let t = clamp((p.y - a.y) / min(-0.001, segment.y), 0.0, 1.0);
  let centre = mix(a.xyz, b.xyz, t);
  let radius = mix(a.w, b.w, t);
  let height = p.y - centre.y;
  let crossSection = radius * radius - height * height;
  let delta = p.xz - centre.xz;
  let along = dot(delta, outward);
  let across = dot(delta, vec2f(-outward.y, outward.x));
  let circle = crossSection - across * across;
  if (circle <= 0.0 || along < -radius * 1.35) { return 0.0; }
  let influence = smoothstep(-radius * 1.35, -radius * 0.65, along);
  return clamp(sqrt(circle) + 0.008 - along, 0.0, 0.20) * influence;
}

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= P.count) { return; }
  let v = verts[i];
  // A stump's cap (see stumps.js) is nothing at all until its joint has been cut: piece holds its own part and, in the third place, the part across the joint.
  if (v.u < -1.5 && ((P.cut >> (v.piece & 15u)) & 1u) == ((P.cut >> ((v.piece >> 8u) & 15u)) & 1u)) {
    outV[i] = vec4f(0.0);
    return;
  }
  var w = unpack4x8unorm(v.weights);
  let j0 = v.joints & 255u; let j1 = (v.joints >> 8u) & 255u; let j2 = (v.joints >> 16u) & 255u; let j3 = v.joints >> 24u;
  if (P.cut != 0u) {
    // Where a piece has come off, a vertex lets go of the joints on the far side of the cut, so the skin parts instead of stretching.
    // piece holds, four bits each, the vertex's own part of the body and then the part of each joint it follows.
    let own = (P.cut >> (v.piece & 15u)) & 1u;
    let kept = w * vec4f(
      f32(((P.cut >> ((v.piece >> 4u) & 15u)) & 1u) == own), f32(((P.cut >> ((v.piece >> 8u) & 15u)) & 1u) == own),
      f32(((P.cut >> ((v.piece >> 12u) & 15u)) & 1u) == own), f32(((P.cut >> ((v.piece >> 16u) & 15u)) & 1u) == own));
    let sum = kept.x + kept.y + kept.z + kept.w;
    if (sum > 0.001) { w = kept / sum; }
  }
  let q0 = palette[select(select(select(j3, j2, w.z > 0.0), j1, w.y > 0.0), j0, w.x > 0.0) * 2u];
  var r = palette[j0 * 2u] * w.x;
  var d = palette[j0 * 2u + 1u] * w.x;
  if (w.y > 0.0) {
    let q = palette[j1 * 2u]; let s = select(w.y, -w.y, dot(q, q0) < 0.0);
    r += q * s; d += palette[j1 * 2u + 1u] * s;
  }
  if (w.z > 0.0) {
    let q2 = palette[j2 * 2u]; let s2 = select(w.z, -w.z, dot(q2, q0) < 0.0);
    r += q2 * s2; d += palette[j2 * 2u + 1u] * s2;
  }
  if (w.w > 0.0) {
    let q3 = palette[j3 * 2u]; let s3 = select(w.w, -w.w, dot(q3, q0) < 0.0);
    r += q3 * s3; d += palette[j3 * 2u + 1u] * s3;
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
  if (v.flex < 0.0) {
    let start = arrayLength(&palette) - 8u;
    let angle = (f32(v.piece) / 65535.0 - 0.5) * 6.2831853 + palette[start + 6u].x;
    let direction = vec2f(sin(angle), cos(angle));
    let flex = -v.flex;
    // A skirt ripples a little as it hangs (the townsfolk's). Not the witch's gown: on the owner's word it moves with her
    // body alone, so it doesn't dance while she stands and talks. P.wind.w is 1 for her and 0 for everyone else, so
    // theirs is multiplied by exactly 1 and comes out the same to the bit (docs/RENDERING.md).
    let sway = 0.009 * sin(P.time * 4.6 - v.pos.y * 12.0 + angle * 1.5) * flex * (1.0 - P.wind.w);
    p += vec3f(direction.x, 0.0, direction.y) * sway;
    var lift = 0.0;
    for (var j = 0u; j < 6u; j += 3u) {
      lift = max(lift, clearLeg(p, direction, palette[start + j], palette[start + j + 1u]));
      lift = max(lift, clearLeg(p, direction, palette[start + j + 1u], palette[start + j + 2u]));
    }
    p += vec3f(direction.x, 0.0, direction.y) * lift * flex;
  }
  outV[i] = vec4f(p, bitcast<f32>(pack4x8snorm(vec4f(n, 0.0))));
}
`;
