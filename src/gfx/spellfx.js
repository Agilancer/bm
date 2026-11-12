// Spells on the screen. The sim writes what's alive as a list of shapes; solid things (ice, stone, bone, blades) are drawn lit in the
// world, and everything else (fire, light, force) as procedural HDR light after it, hot enough for the bloom to carry.
import { FX_FLOATS, FX_START, H, MAX_FX } from '../core/layout.js';
import { ELEM, ELEM_LIGHT, FX, FX_CARRIED } from '../sim/spells.js';
import { COMMON, MAX_LIT } from './shaders.js';
import { mipCountFor } from './gpu.js';
import { SHIELD_CELL, SHIELD_NAMES, SHIELD_OUTLINE } from './shieldshapes.js';

// Each element's colours in linear light, white-hot first, down to the deep shade its edges fall off through.
export const RAMP = /* wgsl */ `
fn rampStop(e: u32, i: u32) -> vec3f {
  var R = array<vec3f, 48>(
    vec3f(1.0, 0.86, 0.52), vec3f(1.0, 0.44, 0.08), vec3f(0.72, 0.1, 0.015), vec3f(0.09, 0.008, 0.0),       // fire
    vec3f(0.9, 1.0, 1.0), vec3f(0.42, 0.8, 1.0), vec3f(0.08, 0.34, 0.92), vec3f(0.008, 0.05, 0.24),         // frost
    vec3f(1.0, 0.84, 1.0), vec3f(0.84, 0.32, 1.0), vec3f(0.38, 0.07, 0.9), vec3f(0.05, 0.008, 0.2),         // arcane
    vec3f(0.94, 0.95, 1.0), vec3f(0.56, 0.5, 1.0), vec3f(0.24, 0.14, 0.95), vec3f(0.03, 0.015, 0.3),        // storm
    vec3f(1.0, 1.0, 0.84), vec3f(0.7, 1.0, 0.38), vec3f(0.14, 0.7, 0.14), vec3f(0.008, 0.14, 0.04),         // heal
    vec3f(1.0, 1.0, 0.9), vec3f(1.0, 0.84, 0.5), vec3f(1.0, 0.54, 0.14), vec3f(0.28, 0.11, 0.015),          // light
    vec3f(1.0, 0.72, 0.72), vec3f(1.0, 0.13, 0.17), vec3f(0.52, 0.008, 0.035), vec3f(0.05, 0.0, 0.008),     // drain
    vec3f(1.0, 1.0, 0.94), vec3f(0.78, 0.92, 0.62), vec3f(0.28, 0.6, 0.4), vec3f(0.025, 0.09, 0.06),        // bone
    vec3f(0.88, 0.74, 1.0), vec3f(0.48, 0.18, 1.0), vec3f(0.11, 0.015, 0.44), vec3f(0.004, 0.0, 0.016),     // void
    vec3f(0.88, 1.0, 0.46), vec3f(0.44, 0.95, 0.09), vec3f(0.07, 0.34, 0.025), vec3f(0.008, 0.045, 0.008),  // poison
    vec3f(1.0, 1.0, 1.0), vec3f(0.44, 0.95, 1.0), vec3f(0.05, 0.58, 0.74), vec3f(0.008, 0.11, 0.15),        // spirit
    vec3f(1.0, 0.74, 0.42), vec3f(0.58, 0.4, 0.26), vec3f(0.24, 0.19, 0.15), vec3f(0.03, 0.024, 0.018)      // stone
  );
  return R[e * 4u + i];
}
fn rampColor(e: u32, t: f32) -> vec3f {
  let s = clamp(t, 0.0, 1.0) * 2.999;
  let i = u32(s);
  return mix(rampStop(e, 3u - i), rampStop(e, 2u - i), s - f32(i));
}
`;

export const LIGHT_SHAPES = /* wgsl */ `
struct Inst { p: vec4f, a: vec4f, m: vec4f, x: vec4f };  // p: place, size. a: axis, length. m: shape, element, seed, age. x: alpha, light, its reach, extra.
@group(1) @binding(0) var<storage, read> fx: array<Inst>;
@group(1) @binding(1) var depthTex: texture_2d<f32>;

struct V {
  @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) viewZ: f32, @location(2) @interpolate(flat) id: u32,
  @location(3) @interpolate(flat) c0: vec3f, @location(4) @interpolate(flat) c1: vec3f, @location(5) @interpolate(flat) c2: vec3f, @location(6) @interpolate(flat) c3: vec3f,
};

const HOT = 8.0;
const BEAM_ROOM = 1.5;    // how much wider a beam's card is than the beam
const FLAME_ROOM = 1.4;   // and a flame's than the flame

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  let I = fx[ii];
  var quad = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1));
  let q = quad[vi];
  let shape = u32(I.m.x);
  let e = u32(I.m.y);
  let size = I.p.w;
  var o: V;
  o.id = ii; o.uv = q;
  o.c0 = rampStop(e, 0u); o.c1 = rampStop(e, 1u); o.c2 = rampStop(e, 2u); o.c3 = rampStop(e, 3u);
  var vp: vec3f;
  switch shape {
    case 1u, 2u, 8u: {
      // A ribbon along its length, turned to face the eye. A beam widens to its extra.
      let s = (q.y + 1.0) * 0.5;
      let P = I.p.xyz + I.a.xyz * I.a.w * s;
      let side = normalize(cross(I.a.xyz, F.camPos.xyz - P) + vec3f(0.0, 1e-4, 0.0));
      var w = size;
      var room = 1.0;
      if (shape == 1u) { w = mix(size, I.x.w, s); room = BEAM_ROOM; }
      vp = (F.view * vec4f(P + side * q.x * w * room, 1.0)).xyz;
      o.uv = vec2f(q.x * room, s);
    }
    case 3u, 4u, 9u, 14u: {
      // Marks on the ground. With the depth to read, they are drawn from a card as wide as they are and laid onto whatever's
      // really there; from inside one, the whole screen is the card. A phone lays them flat.
      if (LEAN) {
        vp = (F.view * vec4f(I.p.xyz + vec3f(q.x * size * 1.35, 0.08, q.y * size * 1.35), 1.0)).xyz;
        o.uv = q * 1.35;
      } else {
        let vc = (F.view * vec4f(I.p.xyz, 1.0)).xyz;
        if (length(vc) < size * 2.0 + 1.2) {
          o.pos = vec4f(q, 0.5, 1.0); o.viewZ = 0.0;
          return o;
        }
        vp = vc + vec3f(q * size * 1.8, 0.0);
      }
    }
    case 5u, 10u: {
      // Standing up, and turned to you about the upright. Its width is its length.
      let to = F.camPos.xyz - I.p.xyz;
      let side = normalize(vec3f(to.z, 0.0, -to.x) + vec3f(1e-4, 0.0, 0.0));
      // Larger than the fire on it, which never reaches the card's edge; the fire itself stays the size it was asked for.
      let along = vec2f(q.x * FLAME_ROOM, (q.y + 1.0) * 0.5 * FLAME_ROOM);
      vp = (F.view * vec4f(I.p.xyz + side * along.x * I.a.w + vec3f(0.0, along.y * size, 0.0), 1.0)).xyz;
      o.uv = vec2f(along.x, along.y * 2.0 - 1.0);
    }
    case 13u: {
      // A ghost of the shield: flat, upright, its face along the way it flies.
      let side = normalize(cross(vec3f(0.0, 1.0, 0.0), I.a.xyz));
      vp = (F.view * vec4f(I.p.xyz + side * q.x * size + vec3f(0.0, q.y * size * 1.25, 0.0), 1.0)).xyz;
      o.uv = q;
    }
    case 15u: {
      // A sign: turned to the eye, or (given a face to lie along) a card in the world.
      if (dot(I.a.xyz, I.a.xyz) > 0.25) {
        let n = normalize(I.a.xyz);
        let other = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(n.y) > 0.92);
        let t1 = normalize(cross(other, n));
        let t2 = cross(n, t1);
        vp = (F.view * vec4f(I.p.xyz + (t1 * q.x + t2 * q.y) * size, 1.0)).xyz;
      } else {
        vp = (F.view * vec4f(I.p.xyz, 1.0)).xyz;
        vp = vec3f(vp.xy + q * size * smoothstep(0.05, 0.5, -vp.z), vp.z);
      }
    }
    default: {
      vp = (F.view * vec4f(I.p.xyz, 1.0)).xyz;
      // Passing the lens, it shrinks away rather than fill the screen.
      vp = vec3f(vp.xy + q * size * smoothstep(0.05, 0.5, -vp.z), vp.z);
    }
  }
  o.viewZ = -vp.z;
  o.pos = F.proj * vec4f(vp, 1.0);
  return o;
}

var<private> C: array<vec3f, 4>;
fn ramp(t: f32) -> vec3f {
  let s = clamp(t, 0.0, 1.0) * 2.999;
  let i = u32(s);
  return mix(C[3u - i], C[2u - i], s - f32(i));
}
fn n1(p: vec2f) -> f32 { return textureSampleLevel(noiseTex, repeatSmp, p, 0.0).r; }
fn fbm(p: vec2f) -> f32 {
  return n1(p) * 0.5 + textureSampleLevel(noiseTex, repeatSmp, p * 2.03 + vec2f(0.37, 0.11), 0.0).g * 0.27
    + textureSampleLevel(noiseTex, repeatSmp, p * 4.07 + vec2f(0.71, 0.53), 0.0).b * 0.15 + textureSampleLevel(noiseTex, repeatSmp, p * 8.13 + vec2f(0.13, 0.91), 0.0).a * 0.08;
}
// Noise with its contrast brought back up: the sums above bunch around the middle.
fn cn(v: f32) -> f32 { return clamp((v - 0.5) * 2.1 + 0.5, 0.0, 1.0); }

fn orb(uv: vec2f, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r >= 1.0) { return vec4f(0.0); }
  // Noise on the face of a ball, boiling.
  let sp = uv / (1.0 + sqrt(max(1.0 - r * r, 0.0)));
  let flow = vec2f(T * 0.11, -T * 0.19);
  let w = cn(fbm(sp * 0.22 + flow * 0.6 + seed));
  let n = cn(fbm(sp * 0.42 + w * 0.2 - flow));
  let body = smoothstep(0.74, 0.14, r + (n - 0.5) * 0.62);
  let halo = pow(1.0 - r, 2.4);
  let heat = clamp(body * (0.42 + n * 0.8) + pow(1.0 - r, 5.0) * 0.5, 0.0, 1.0);
  return vec4f(ramp(heat) * (0.2 + heat * heat * HOT * 1.4) * body * smoothstep(1.0, 0.72, r) + ramp(0.5) * halo * 1.0, 0.0);
}

fn beam(uv: vec2f, L: f32, near: f32, far: f32, seed: f32, T: f32) -> vec4f {
  let d = abs(uv.x);
  let s = uv.y * L;
  let n = cn(fbm(vec2f(s * 0.045 - T * 0.85 + seed, uv.x * 0.1 + seed)));
  let m = cn(fbm(vec2f(s * 0.12 - T * 1.7, uv.x * 0.2 - seed)));
  let edge = d + (n - 0.5) * 0.78;
  // It frays out before the card ends, and its two ends are round, however wide it has got by then.
  let body = smoothstep(0.95, 0.12, edge) * smoothstep(BEAM_ROOM, 0.92, d);
  let core = exp(-d * d * 7.0);
  let heat = clamp(core * (0.5 + m * 0.65) + body * 0.22, 0.0, 1.0);
  let toEnd = (1.0 - uv.y) * L / max(mix(near, far, uv.y), 0.001) + (n - 0.5) * 0.9;
  let fromStart = uv.y * L / max(near, 0.001);
  let ends = smoothstep(0.0, 1.0, fromStart * 1.6 - d * d) * smoothstep(0.0, 1.3, toEnd - d * d * 0.8);
  return vec4f(ramp(heat) * (0.3 + heat * heat * HOT * 1.3) * body * ends, 0.0);
}

fn bolt(uv: vec2f, L: f32, jag: f32, seed: f32, T: f32) -> vec4f {
  let s = uv.y;
  let env = sin(s * 3.14159);
  let t = floor(T * 22.0) * 0.137 + seed * 0.71;
  let wander = (n1(vec2f(s * L * 0.021 + t, seed)) - 0.5) * 2.0 + (n1(vec2f(s * L * 0.075 - t, seed + 0.4)) - 0.5);
  let x = uv.x - clamp(wander * jag * 1.7, -0.55, 0.55) * pow(env, 0.6);
  let core = exp(-x * x * 900.0);
  let glow = exp(-abs(x) * 12.0);
  let fall = smoothstep(0.0, 0.02, s) * smoothstep(1.0, 0.98, s);
  // A fork that wanders off and dies.
  let wf = (n1(vec2f(s * L * 0.05 + t * 1.7, seed + 0.8)) - 0.5) * 3.2;
  let xf = uv.x - clamp(wf * jag, -0.6, 0.6) * smoothstep(0.25, 0.9, s);
  let fork = exp(-xf * xf * 1300.0) * smoothstep(0.2, 0.32, s) * smoothstep(0.95, 0.5, s);
  return vec4f((ramp(1.0) * HOT * 3.0 * core + ramp(1.0) * HOT * 1.2 * fork + ramp(0.55) * glow * 1.8) * fall * smoothstep(1.0, 0.68, abs(uv.x)), 0.0);
}

fn ring(uv: vec2f, age: f32, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r > 1.3) { return vec4f(0.0); }
  let a = atan2(uv.y, uv.x);
  let n = cn(fbm(vec2f(cos(a) * 0.3 + seed, sin(a) * 0.3 + r * 0.14 - T * 0.05)));
  let w = 0.035 + 0.09 * age;
  let dr = (r - 0.93) / w;
  let band = exp(-dr * dr) * (0.35 + n * 1.1);
  let haze = smoothstep(0.95, 0.15, r) * 0.14 * (1.0 - age) * n;
  return vec4f(ramp(band) * (band * band * HOT * 1.5 + band * 1.2) + ramp(0.45) * haze, 0.0);
}

// The mark a spell leaves on the ground: dark where it's scorched or wet, with its element's light running in the veins.
fn disc(uv: vec2f, size: f32, age: f32, e: u32, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r > 1.25) { return vec4f(0.0); }
  let q = uv * size * 0.024;
  let w = cn(fbm(q + vec2f(T * 0.008, -T * 0.006) + seed));
  let n = cn(fbm(q * 2.1 + w * 0.12 + seed * 0.3));
  let edge = smoothstep(1.0, 0.45, r + (w - 0.5) * 0.7) * smoothstep(1.25, 0.95, r);
  var v = 1.0 - abs(n * 2.0 - 1.0);    // ridges where the noise crosses its middle
  v = pow(v, 5.0);
  if (e == 1u) {   // frost: a white crust feathering out, cold light under it
    let crust = smoothstep(0.32, 0.7, n) * edge;
    return vec4f(ramp(0.75) * (crust * 0.34 + v * edge * 0.9), crust * 0.42);
  }
  if (e == 9u || e == 8u) {   // a stain with a sickly glow
    return vec4f(ramp(0.5) * edge * (0.14 + v * 0.8), edge * 0.32);
  }
  let pulse = 0.72 + 0.28 * n1(q * 0.5 + vec2f(T * 0.06, 0.0));
  let burn = v * pulse * (1.0 - age * 0.55);
  return vec4f(ramp(0.4 + burn * 0.6) * burn * edge * HOT * 0.7, edge * 0.74);
}

fn line(v: f32, at: f32, w: f32) -> f32 { let d = (v - at) / w; return exp(-d * d); }
fn rune(uv: vec2f, seed: f32, T: f32, holy: f32) -> vec4f {
  let r = length(uv);
  if (r > 1.2) { return vec4f(0.0); }
  let a = atan2(uv.y, uv.x);
  let tau = 6.28318;
  // Circles, and the gauge marks between the outer two, slowly turning against each other.
  var c = line(r, 0.97, 0.008) + line(r, 0.9, 0.004) * 0.5 + line(r, 0.52, 0.006) * 0.7;
  let ticks = step(0.86, fract((a + T * 0.12) / tau * 60.0)) * step(0.935, r) * step(r, 0.968);
  // Two polygons, one turning each way: an open seven inside a closing three.
  let sec7 = tau / 7.0;
  let f7 = (fract((a - T * 0.3 + seed) / sec7) - 0.5) * sec7;
  let hept = r * cos(f7);
  let sec3 = tau / 3.0;
  let f3 = (fract((a + T * 0.42 + seed) / sec3) - 0.5) * sec3;
  let tri = r * cos(f3);
  if (holy > 0.5) {
    // Hallowed ground: rays going out from a cross at its heart (a paladin's; the rune's own figures are a wizard's).
    let rays = pow(abs(cos(a * 8.0 + T * 0.15)), 60.0) * step(0.56, r) * step(r, 0.88);
    let bar = max(step(abs(uv.x), 0.035) * step(abs(uv.y + 0.03), 0.34), step(abs(uv.y - 0.1), 0.035) * step(abs(uv.x), 0.2));
    c += rays * 0.9 + bar * 1.1;
  } else {
    c += line(hept, 0.84, 0.006) * step(r, 0.9) + line(tri, 0.25, 0.006) * step(r, 0.52) * 1.2;
  }
  let sweep = 0.55 + 0.45 * sin(a * 2.0 - T * 2.6);
  return vec4f(ramp(0.85) * (c * HOT * 1.1 * (0.5 + sweep * 0.5) + ticks * HOT * 0.3) + ramp(0.35) * smoothstep(1.0, 0.1, r) * 0.1, 0.0);
}

// A flame's shape is its own, and comes to nothing inside its card: narrow at the tip, leaning as it climbs. The noise only bites into
// it and throws up tongues, each measured from how much flame is left there.
fn flame(uv: vec2f, wide: f32, tall: f32, seed: f32, T: f32) -> vec4f {
  let s = (uv.y + 1.0) * 0.5;
  // (However small it is, it has as many tongues as a big one: only a very wide flame gets more.)
  let fx = 0.16 + wide * 0.05;
  let fy = 0.1 + tall * 0.035;
  let n = cn(fbm(vec2f(uv.x * fx + seed, s * fy - T * 0.34)));
  let m = cn(fbm(vec2f(uv.x * fx * 2.4 - seed, s * fy * 2.6 - T * 0.7)));
  let lean = (cn(fbm(vec2f(seed * 3.1, s * fy * 0.7 - T * 0.2))) - 0.5) * 0.5 * s;
  let x = uv.x + lean;
  // How tall the fire is here: the middle gets to the top, the sides fall short, and each tongue goes up on its own.
  let tongues = cn(fbm(vec2f(x * (fx * 3.2) + seed * 2.0, T * 0.42)));
  let top = max(1.0 - x * x * 0.8, 0.0) * (0.42 + tongues * 0.62 + (n - 0.5) * 0.3);
  let body = clamp(1.0 - s / max(top, 0.05), 0.0, 1.0);
  let across = (0.86 - abs(x) * (0.86 + (m - 0.5) * 0.5)) * pow(body, 0.42) * 1.5;
  let d = across + (n * 0.5 + m * 0.5 - 0.5) * body * 0.7;
  let v = smoothstep(0.0, 0.62, d);
  let h = v * (0.55 + m * 0.55) * (0.62 + body * 0.5);
  // (The foot fades into what it's standing on rather than end in a line, and nothing gets near the edge of the card.)
  let foot = smoothstep(-0.01, 0.07, s);
  let safe = smoothstep(FLAME_ROOM, 1.12, abs(uv.x)) * smoothstep(FLAME_ROOM, 1.12, s);
  return vec4f(ramp(h) * (0.2 + h * h * HOT * 1.1) * smoothstep(0.0, 0.1, d) * foot * safe, 0.0);
}

fn puff(uv: vec2f, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r >= 1.0) { return vec4f(0.0); }
  let n = cn(fbm(uv * 0.13 + vec2f(T * 0.02, -T * 0.03) + seed));
  let d = smoothstep(1.0, 0.1, r + (n - 0.5) * 0.9) * smoothstep(1.0, 0.62, r);
  return vec4f(ramp(0.2 + n * 0.32) * d * d * 0.5, d * d * 0.55);
}

fn flare(uv: vec2f, seed: f32) -> vec4f {
  let r = length(uv);
  if (r >= 1.0) { return vec4f(0.0); }
  let edge = (1.0 - r) * (1.0 - r);
  let core = 0.028 / (r * r + 0.028);
  // A wide lens streak, and four thin rays.
  let streak = exp(-abs(uv.y) * 34.0) * exp(-abs(uv.x) * 2.2);
  let a = atan2(uv.y, uv.x) + seed * 3.0;
  let rays = pow(abs(cos(a * 2.0)), 24.0) * exp(-r * 4.5);
  return vec4f((ramp(1.0) * core * HOT * 0.8 + ramp(0.62) * (streak * 2.4 + rays * 1.5 + exp(-r * 3.2) * 0.9)) * edge, 0.0);
}

fn trail(uv: vec2f, L: f32, seed: f32, T: f32) -> vec4f {
  let f = 1.0 - uv.y;
  let w = abs(uv.x) / max(pow(f, 0.8), 0.001);
  if (w >= 1.0) { return vec4f(0.0); }
  let n = cn(fbm(vec2f(uv.y * L * 0.05 + T * 0.55 + seed, uv.x * 0.09)));
  let body = smoothstep(1.0, 0.1, w + (n - 0.5) * 0.7 * (1.0 - f * 0.6)) * smoothstep(1.0, 0.62, w);
  let h = clamp(body * f * (0.5 + n * 0.75) + f * f * f * body * 0.3, 0.0, 1.0);
  return vec4f(ramp(h) * (0.18 + h * h * HOT * 1.2) * body * f, 0.0);
}

fn column(uv: vec2f, seed: f32, T: f32) -> vec4f {
  // (Its card is a flame's, so it stops short of that, and of the edge.)
  let s = clamp((uv.y + 1.0) * 0.5, 0.0, 1.0);
  let n = cn(fbm(vec2f(uv.x * 0.14 + seed, s * 0.11 - T * 0.22)));
  let c = exp(-uv.x * uv.x * 5.0) * pow(1.0 - s, 1.3) * (0.32 + n * 0.95) * smoothstep(0.0, 0.05, s) * smoothstep(1.2, 0.72, abs(uv.x));
  return vec4f(ramp(c) * (0.25 + c * c * HOT * 1.2) * c * 1.6, 0.0);
}

fn vortex(uv: vec2f, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r >= 1.0) { return vec4f(0.0); }
  let a = atan2(uv.y, uv.x);
  // Arms winding tighter toward the hole, and everything falling in.
  let swirl = a + 1.4 / (r + 0.16) - T * 2.4 + seed;
  let n = cn(fbm(vec2f(cos(swirl), sin(swirl)) * 0.2 + vec2f(r * 0.3 - T * 0.09, 0.0)));
  let disk = smoothstep(1.0, 0.42, r) * smoothstep(0.2, 0.36, r) * n * n * 1.8;
  let rim = line(r, 0.3, 0.022);
  let hole = smoothstep(0.34, 0.25, r);
  let rgb = ramp(disk * 0.75) * disk * (0.5 + disk * HOT * 0.65) + ramp(1.0) * rim * HOT * 1.3;
  return vec4f(rgb, max(hole, disk * 0.2));
}

fn kite(uv: vec2f) -> vec4f {
  let x = abs(uv.x);
  let d = max(uv.y - (0.85 - x * x * 0.3), x - 0.78 * clamp((uv.y + 1.0) / 1.2, 0.0, 1.0));
  if (d >= 0.0) { return vec4f(0.0); }
  let rim = smoothstep(-0.14, -0.01, d);
  let t = 0.16 + 0.1 * (uv.y + 1.0) + rim * 0.75;
  return vec4f(ramp(t) * t * 1.5, t * 0.55);
}
fn shock(uv: vec2f, age: f32, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r >= 1.0) { return vec4f(0.0); }
  let a = atan2(uv.y, uv.x);
  let n = cn(fbm(vec2f(cos(a), sin(a)) * 0.22 + vec2f(seed, r * 0.1)));
  let w = 0.028 + 0.1 * age;
  let dr = (r - 0.9) / w;
  let band = exp(-dr * dr) * (0.3 + n * 1.0) * smoothstep(1.0, 0.95, r);
  let inner = smoothstep(0.9, 0.3, r) * 0.1 * (1.0 - age);
  return vec4f(ramp(band) * (band * band * HOT * 1.5 + band * 0.9) + ramp(0.5) * inner * n, 0.0);
}

// ---- signs drawn in light (GLYPHS in src/sim/spells.js): the bards' notes and their sound, the stars a ninja throws, the
// crescents blades leave, a paladin's cross. Each is a mask in a card from -1 to 1, bright in its middle, with a soft glow.
fn seg(p: vec2f, a: vec2f, b: vec2f) -> f32 { let pa = p - a; let ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
fn ink(d: f32, w: f32) -> f32 { return smoothstep(w, w * 0.45, d); }
fn head(p: vec2f, c: vec2f) -> f32 {
  let q = p - c;
  let r = vec2f(q.x * 0.94 + q.y * 0.34, -q.x * 0.34 + q.y * 0.94);
  return smoothstep(1.0, 0.72, length(r / vec2f(0.27, 0.19)));
}
fn starN(p: vec2f, n: f32, inner: f32) -> f32 {
  let a = atan2(p.y, p.x);
  let r = length(p);
  let s = 3.14159 / n;
  let f = abs(fract(a / (2.0 * s) + 0.5) - 0.5) * 2.0;     // 0 on a point, 1 between two
  let edge = mix(0.95, inner, pow(f, 0.8));
  return smoothstep(edge, edge * 0.8, r);
}
fn glyph(uv0: vec2f, which: u32, turn: f32, age: f32, seed: f32, T: f32) -> vec4f {
  let cs = cos(turn); let sn = sin(turn);
  let uv = vec2f(uv0.x * cs + uv0.y * sn, -uv0.x * sn + uv0.y * cs);
  let r = length(uv);
  if (r >= 1.42) { return vec4f(0.0); }
  var m = 0.0;       // the sign itself
  var hot = 0.75;    // how far up its element's colours
  var halo = 0.35;
  switch which {
    case 0u: {   // a quaver
      m = max(head(uv, vec2f(-0.16, -0.56)), ink(seg(uv, vec2f(0.08, -0.5), vec2f(0.08, 0.72)), 0.06));
      m = max(m, ink(seg(uv, vec2f(0.08, 0.72), vec2f(0.46, 0.34)), 0.085 - 0.03 * smoothstep(0.1, 0.5, uv.x)));
      m = max(m, ink(seg(uv, vec2f(0.46, 0.34), vec2f(0.4, 0.02)), 0.05));
    }
    case 1u: {   // two, beamed
      m = max(head(uv, vec2f(-0.56, -0.58)), head(uv, vec2f(0.34, -0.46)));
      m = max(m, max(ink(seg(uv, vec2f(-0.32, -0.52), vec2f(-0.32, 0.6)), 0.055), ink(seg(uv, vec2f(0.58, -0.4), vec2f(0.58, 0.72)), 0.055)));
      m = max(m, ink(seg(uv, vec2f(-0.32, 0.6), vec2f(0.58, 0.72)), 0.1));
      m = max(m, ink(seg(uv, vec2f(-0.32, 0.36), vec2f(0.58, 0.48)), 0.06));
    }
    case 2u: {   // a crotchet
      m = max(head(uv, vec2f(-0.14, -0.56)), ink(seg(uv, vec2f(0.1, -0.5), vec2f(0.1, 0.74)), 0.06));
    }
    case 3u: {   // sound: arcs going out along +x, each fainter
      let a = atan2(uv.y, uv.x);
      let fan = smoothstep(1.05, 0.55, abs(a));
      for (var i = 0; i < 3; i++) {
        let rr = 0.3 + f32(i) * 0.3;
        m = max(m, ink(abs(r - rr), 0.05) * fan * (1.0 - f32(i) * 0.22));
      }
      halo = 0.12;
    }
    case 4u: {   // a throwing star: four points, a hole at its heart
      m = starN(uv, 4.0, 0.2) * smoothstep(0.07, 0.13, r);
      hot = 0.95;
    }
    case 5u: {   // the crescent a blade leaves
      let a = atan2(uv.y, uv.x);
      let w = 0.2 * pow(max(cos(a * 1.15), 0.0), 1.6);      // (a little under half a circle: what a blade sweeps before a body, not round behind it)
      m = smoothstep(w, w * 0.3, abs(r - 0.78 + 0.1 * cos(a))) * step(0.001, w);
      hot = 0.68; halo = 0.0;
    }
    case 6u: {   // a drop
      let q = vec2f(uv.x, uv.y + 0.3);
      m = max(smoothstep(0.46, 0.34, length(q)), smoothstep(0.26 * (1.0 - smoothstep(-0.1, 1.0, uv.y)), 0.0, abs(uv.x)) * step(-0.1, uv.y) * step(uv.y, 0.92));
      hot = 0.55; halo = 0.1;
    }
    case 7u: {   // a cross
      m = max(ink(seg(uv, vec2f(0.0, -0.85), vec2f(0.0, 0.85)), 0.11), ink(seg(uv, vec2f(-0.5, 0.3), vec2f(0.5, 0.3)), 0.11));
      hot = 0.72;
    }
    case 8u: {   // a boomerang: two arms from an elbow, thinning to their tips
      let w = 0.2 - 0.11 * smoothstep(0.1, 0.9, abs(uv.x));
      m = max(ink(seg(uv, vec2f(0.0, 0.42), vec2f(-0.82, -0.36)), w), ink(seg(uv, vec2f(0.0, 0.42), vec2f(0.82, -0.36)), w));
      hot = 0.9;
    }
    case 9u: {   // a hammer
      let hd = max(abs(uv.x) - 0.52, abs(uv.y - 0.52) - 0.27);
      m = max(smoothstep(0.03, -0.03, hd), ink(seg(uv, vec2f(0.0, -0.88), vec2f(0.0, 0.3)), 0.09));
      hot = 0.9;
    }
    case 10u: {  // a six-pointed star
      m = starN(uv, 6.0, 0.42);
      hot = 0.9;
    }
    case 11u: {  // a spark: eight thin rays
      let a = atan2(uv.y, uv.x);
      m = pow(abs(cos(a * 4.0)), 26.0) * smoothstep(0.8, 0.05, r) + pow(abs(cos(a * 2.0)), 40.0) * smoothstep(1.0, 0.1, r);   // (its rays end inside its card: longer, they showed the card's edge)
      m = clamp(m + smoothstep(0.2, 0.0, r), 0.0, 1.0);
      hot = 1.0;
    }
    case 12u: {  // a pair of wings: feathers fanned out and up from two shoulders at the card's middle
      let q = vec2f(abs(uv.x) - 0.08, uv.y + 0.35);
      let a = atan2(q.x, q.y);
      let rr = length(q);
      let feather = pow(abs(cos(a * 9.0)), 2.5);
      let span = 1.25 - 0.32 * abs(a - 0.75);
      m = smoothstep(0.1, 0.3, a) * smoothstep(1.75, 1.35, a) * smoothstep(span, span * 0.62, rr) * smoothstep(0.04, 0.22, rr) * (0.3 + 0.7 * feather) * step(0.0, q.x);
      hot = 0.78; halo = 0.0;
    }
    default: {   // a shield: a kite, rimmed
      let x = abs(uv.x);
      let d = max(uv.y - (0.85 - x * x * 0.3), x - 0.7 * clamp((uv.y + 1.0) / 1.2, 0.0, 1.0));
      m = smoothstep(0.0, -0.05, d) * (0.3 + 0.7 * smoothstep(-0.16, -0.02, d));
      m = max(m, smoothstep(0.0, -0.05, d) * (ink(abs(uv.x), 0.05) + ink(abs(uv.y - 0.25), 0.05)) * 0.8);
      hot = 0.85;
    }
  }
  let shimmer = 0.85 + 0.15 * sin(T * 9.0 + seed * 40.0);
  let glow = exp(-r * 2.6) * halo;
  // (Bright enough to bloom a little, not so bright the colour burns out to white.)
  return vec4f(ramp(hot) * m * HOT * 0.4 * shimmer + ramp(0.5) * (glow + m * 0.7), 0.0);
}

// A warning on the ground (src/core/perils.js, src/sim/perils.js): where something is about to land, in the shape it lands
// in. Its edge is a bright line, the ground inside it darkened and lit, and it fills from where it starts to its far edge
// as its time runs out; once it's biting (fill at 1 or over) the whole of it burns. kind: 0 a circle, 1 a ring (A its inner
// edge), 2 a cone (A half its angle), 3 a strip (A half its width, B its length), 4 crossed strips (as many as kind's
// hundredths). dir: the way it points. A and B are in the mark's own radius, as uv is.
fn stripSd(f: f32, s: f32, r: f32, w: f32) -> f32 {
  let q = vec2f(abs(f - r * 0.5) - r * 0.5, abs(s) - w);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0);
}
fn mark(uv: vec2f, dir: vec2f, A: f32, B: f32, kindF: f32, fill: f32, size: f32, seed: f32, T: f32) -> vec4f {
  let r = length(uv);
  if (r > 1.25) { return vec4f(0.0); }
  let kind = u32(kindF);
  let f = dot(uv, dir);
  let s = uv.x * dir.y - uv.y * dir.x;
  var d = r - 1.0;
  var along = r;
  switch kind {
    case 1u: { d = max(r - 1.0, A - r); along = (r - A) / max(1.0 - A, 0.001); }
    case 2u: {
      let a = abs(atan2(s, f));
      if (a <= A) { d = max(r - 1.0, -r * sin(min(A - a, 1.5708))); } else { d = max(r * sin(min(a - A, 1.5708)), r - 1.0); }
    }
    case 3u: { d = stripSd(f, s, B, A); along = f / max(B, 0.001); }
    case 4u: {
      let sec = 6.28318 / max(round(fract(kindF) * 100.0), 1.0);
      let k = (fract(atan2(s, f) / sec + 0.5) - 0.5) * sec;
      d = stripSd(r * cos(k), r * sin(k), B, A); along = r * cos(k) / max(B, 0.001);
    }
    default: {}
  }
  let px = d * size;
  if (px > 0.6) { return vec4f(0.0); }
  let inside = smoothstep(0.05, -0.05, px);
  let rim = exp(-px * px / 0.005);
  let glow = exp(-abs(px) * 4.0) * 0.3;
  let n = cn(fbm(uv * size * 0.045 + vec2f(seed, T * 0.02)));
  let live = step(1.0, fill);
  let filled = inside * smoothstep(fill + 0.012, fill - 0.012, along);
  let gap = (along - fill) * size / 0.2;
  let front = inside * exp(-gap * gap) * (1.0 - live);
  let beat = 0.72 + 0.28 * sin(T * 11.0 + seed * 20.0);
  var heat = rim + glow + front * 0.9 + filled * (0.14 + n * 0.24) + inside * 0.04;
  heat += live * inside * (0.22 + n * 0.55) * beat;
  return vec4f(ramp(0.5 + 0.5 * max(rim, front)) * heat * HOT * 0.42, inside * (0.36 + 0.22 * filled));
}

@fragment fn fs(in: V) -> @location(0) vec4f {
  let I = fx[in.id];
  C[0] = in.c0; C[1] = in.c1; C[2] = in.c2; C[3] = in.c3;
  let shape = u32(I.m.x);
  let e = u32(I.m.y);
  let seed = I.m.z * 0.37;
  let age = I.m.w;
  let T = F.camPos.w;
  let alpha = abs(I.x.x);
  var uv = in.uv;
  var keep = 1.0;
  var scene = 1e6;
  if (!LEAN) { scene = textureLoad(depthTex, vec2i(in.pos.xy), 0).r; }
  if (shape == 3u || shape == 4u || shape == 9u || shape == 14u) {
    if (!LEAN) {
      // Back from the depth to the point in the world under this pixel.
      if (scene < 0.35) { discard; }
      let ndc = vec2f(in.pos.x * F.screen.z * 2.0 - 1.0, 1.0 - in.pos.y * F.screen.w * 2.0);
      let far = F.invViewProj * vec4f(ndc, 0.5, 1.0);
      let dir = far.xyz / far.w - F.camPos.xyz;
      let fwd = -vec3f(F.view[0].z, F.view[1].z, F.view[2].z);
      let w = F.camPos.xyz + dir / dot(dir, fwd) * scene;
      let d = w - I.p.xyz;
      uv = d.xz / I.p.w;
      let tall = clamp(I.p.w * 0.35, 0.6, 1.5);
      keep = 1.0 - smoothstep(tall * 0.45, tall, abs(d.y));
      if (keep <= 0.0) { discard; }
    }
  } else if (!LEAN) {
    if (I.x.x < 0.0) {
      // Drawn over the hands, with the fingers dark against it.
      if (scene < 0.35) { keep = 0.42; }
    } else {
      if (scene < in.viewZ) { discard; }
      keep = clamp((scene - in.viewZ) * 2.6, 0.0, 1.0);
    }
  }
  var c = vec4f(0.0);
  switch shape {
    case 0u: { c = orb(uv, seed, T); }
    case 1u: { c = beam(uv, I.a.w, I.p.w, I.x.w, seed, T); }
    case 2u: { c = bolt(uv, I.a.w, I.x.w, seed, T); }
    case 3u: { c = ring(uv, age, seed, T); }
    case 4u: { c = disc(uv, I.p.w, age, e, seed, T); }
    case 5u: { c = flame(uv, I.a.w, I.p.w, seed, T); }
    case 6u: { c = puff(uv, seed, T); }
    case 7u: { c = flare(uv, seed); }
    case 8u: { c = trail(uv, I.a.w, seed, T); }
    case 9u: { c = rune(uv, seed, T, I.x.w); }
    case 10u: { c = column(uv, seed, T); }
    case 11u: { c = vortex(uv, seed, T); }
    case 12u: { c = shock(uv, age, seed, T); }
    case 13u: { c = kite(uv); }
    case 14u: { c = mark(uv, I.a.xz, I.a.y, I.a.w, I.x.w, age, I.p.w, seed, T); }
    case 15u: { c = glyph(uv, u32(I.x.w + 0.5), I.a.w, age, seed, T); }
    default: { discard; }
  }
  return c * alpha * keep;
}
`;

const SOLID_SHAPES = /* wgsl */ `
struct Inst { p: vec4f, a: vec4f, m: vec4f, x: vec4f };
@group(1) @binding(0) var<storage, read> fx: array<Inst>;
struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) along: f32, @location(2) @interpolate(flat) id: u32, @location(3) viewZ: f32, @location(4) ring: f32 };

fn jitter(v: f32) -> f32 { return fract(sin(v * 91.7) * 43758.5453); }

// Six-sided, narrowing to a point at each end from its widest place. No vertices: it's all from the index. A BOX is a block,
// its twelve triangles from the same thirty-six indices.
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  let I = fx[ii];
  let shape = u32(I.m.x);
  let seed = I.m.z;
  let axis = normalize(I.a.xyz);
  let other = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(axis.y) > 0.92);
  var side = normalize(cross(axis, other));
  var up = cross(side, axis);
  var o: V;
  o.id = ii;
  if (shape == 22u || shape == 23u) {
    // (These two are turned about their own length by the seed, so a hammer can tumble and a star lie in any plane.)
    let c = cos(seed); let s = sin(seed);
    let s2 = side * c + up * s;
    up = up * c - side * s;
    side = s2;
  }
  if (shape == 22u) {
    var CUBE = array<u32, 36>(0u, 1u, 3u, 0u, 3u, 2u, 4u, 6u, 7u, 4u, 7u, 5u, 0u, 4u, 5u, 0u, 5u, 1u, 2u, 3u, 7u, 2u, 7u, 6u, 0u, 2u, 6u, 0u, 6u, 4u, 1u, 5u, 7u, 1u, 7u, 3u);
    let k = CUBE[vi];
    let cx = f32(k & 1u) * 2.0 - 1.0;
    let cy = f32((k >> 1u) & 1u);
    let cz = f32((k >> 2u) & 1u) * 2.0 - 1.0;
    let w = I.p.xyz + axis * (cy - 0.5) * I.a.w + side * cx * I.p.w + up * cz * I.x.w;
    o.p = w; o.along = cy; o.ring = 1.0;
    o.pos = F.viewProj * vec4f(w, 1.0);
    o.viewZ = -(F.view * vec4f(w, 1.0)).z;
    return o;
  }
  let tri = vi / 3u;
  let corner = vi % 3u;
  let k = tri % 6u;
  let top = tri < 6u;
  var belly = 0.3;
  switch shape {
    case 17u: { belly = 0.05; }   // a spike: all rise
    case 18u: { belly = 0.82; }   // a lance: long haft, a head at its end
    case 19u: { belly = 0.14; }   // a blade: a hilt's width low down
    case 20u, 21u, 23u: { belly = 0.5; }
    default: {}
  }
  var along = belly;
  var rad = 0.0;
  var ring = 1.0;
  var at = 0.0;
  let isApex = corner == 2u;
  if (isApex) { along = select(0.0, 1.0, top); ring = 0.0; } else {
    let second = (corner == 1u) == top;
    at = f32(k + select(0u, 1u, second));
    let i = at % 6.0;
    rad = 0.72 + 0.56 * jitter(seed + i * 1.37);
    along = belly + (jitter(seed * 3.0 + i) - 0.5) * 0.1;
    if (shape == 23u) { rad = 1.0; along = belly; }
  }
  let ang = at / 6.0 * 6.28318 + seed * 6.0;
  var flat_ = 1.0;
  if (shape == 19u) { flat_ = 0.16; }
  if (shape == 23u) { flat_ = 0.13; }
  // A blade's width lies along its side, so it isn't turned by the seed.
  let thin = shape == 19u || shape == 23u;
  let ca = select(cos(ang), cos(at / 6.0 * 6.28318), thin);
  let sa = select(sin(ang), sin(at / 6.0 * 6.28318), thin);
  let w = I.p.xyz + axis * (along - select(0.0, 0.5, shape == 23u)) * I.a.w + (side * ca + up * sa * flat_) * rad * I.p.w;
  o.p = w; o.along = along; o.ring = ring;
  o.pos = F.viewProj * vec4f(w, 1.0);
  o.viewZ = -(F.view * vec4f(w, 1.0)).z;
  return o;
}

@fragment fn fs(in: V) -> Out {
  let I = fx[in.id];
  let shape = u32(I.m.x);
  let e = u32(I.m.y);
  let age = I.m.w;
  let seed = I.m.z;
  let T = F.camPos.w;
  let toCam = F.camPos.xyz - in.p;
  let dist = length(toCam);
  let v = toCam / dist;
  var n = normalize(cross(dpdx(in.p), dpdy(in.p)));
  if (dot(n, v) < 0.0) { n = -n; }
  let ndv = max(dot(n, v), 0.0);
  let fres = pow(1.0 - ndv, 3.0);
  var albedo = vec3f(0.5);
  var rough = 0.6;
  var metal = 0.0;
  var glow = vec3f(0.0);
  let noise = textureSampleLevel(noiseTex, repeatSmp, in.p.xz * 0.1 + vec2f(in.p.y * 0.17, seed), 0.0);
  switch shape {
    case 16u: {   // ice: dark and clear, lit up from inside at its edges
      albedo = vec3f(0.1, 0.27, 0.44); rough = 0.1;
      glow = rampColor(e, 0.68) * (fres * 3.6 + 0.14 + pow(noise.r, 3.0) * 1.1 + in.along * 0.26);
    }
    case 17u: {   // black stone broken out of the ground, molten in its cracks and along the base, cooling as it comes up
      let fine = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.p.x + in.p.z, in.p.y) * 0.8 + seed, 0.0);
      let wide = textureSampleLevel(noiseTex, repeatSmp, vec2f(in.p.x - in.p.z, in.p.y) * 0.27 + seed * 3.0, 0.0);
      albedo = mix(vec3f(0.03, 0.026, 0.024), vec3f(0.14, 0.12, 0.105), fine.g * wide.r * 1.8); rough = 0.82;
      let cool = (1.0 - age * 0.72) * (1.0 - age * 0.72);
      let crack = pow(1.0 - abs(wide.b * 2.0 - 1.0), 10.0) + pow(1.0 - abs(fine.b * 2.0 - 1.0), 14.0) * 0.5;
      glow = rampColor(11u, 1.0) * vec3f(1.0, 0.5, 0.18) * cool * (crack * 9.0 + smoothstep(0.34, 0.0, in.along) * 1.5);
    }
    case 18u: {   // bone: yellowed, polished
      albedo = mix(vec3f(0.62, 0.58, 0.44), vec3f(0.86, 0.83, 0.68), noise.r); rough = 0.34;
      glow = rampColor(e, 0.62) * fres * 2.2;
    }
    case 19u: {   // a spirit's sword: nothing but its own light, brightest down the edge
      albedo = vec3f(0.02, 0.1, 0.13); rough = 0.2; metal = 1.0;
      let shimmer = 0.75 + 0.25 * sin(T * 11.0 + in.along * 9.0 + seed * 40.0);
      glow = rampColor(e, 0.55 + in.along * 0.35) * (0.3 + fres * 3.2) * shimmer;
    }
    case 20u: {   // the falling stone: black crust, split, and molten in the splits
      albedo = vec3f(0.05, 0.04, 0.035); rough = 0.9;
      let q = textureSampleLevel(noiseTex, repeatSmp, in.p.xz * 0.05 + vec2f(in.p.y * 0.05, T * 0.03), 0.0).r;
      let crack = pow(1.0 - abs(q * 2.0 - 1.0), 3.0);
      glow = rampColor(0u, 0.55 + crack * 0.45) * (crack * 14.0 + 0.7);
    }
    case 22u, 23u: {   // a block or a shard of something (MAT, in the age), lit along its edges by its element as much as its alpha says
      let mat = u32(age + 0.5);
      let lit = abs(I.x.x);
      if (mat == 1u) { albedo = vec3f(0.9, 0.52, 0.1); rough = 0.4; metal = 1.0; }      // (gold deep enough to stay gold under a noon sky)
      else if (mat == 2u) { albedo = mix(vec3f(0.2, 0.11, 0.05), vec3f(0.34, 0.2, 0.1), noise.g); rough = 0.75; }
      else if (mat == 3u) { albedo = vec3f(0.02); rough = 0.3; }
      else { albedo = vec3f(0.62, 0.66, 0.72); rough = 0.24; metal = 1.0; }
      // (Light itself is its element's colour all through, not white at its heart: a star of fire is seen to be of fire.)
      glow = rampColor(e, 0.62) * lit * (fres * 2.4 + select(0.12, 1.7, mat == 3u)) * (0.85 + 0.15 * sin(T * 13.0 + seed * 7.0));
      if (mat == 3u) { glow += rampColor(e, 0.76) * lit * pow(ndv, 3.0) * 1.2; }
    }
    default: {   // the flask: thick green glass, with something moving in it
      albedo = vec3f(0.04, 0.16, 0.04); rough = 0.08;
      glow = rampColor(e, 0.6) * (fres * 2.0 + 0.9 + noise.r);
    }
  }
  let shadow = shadowAt(in.p, n, in.viewZ, ign(in.pos.xy));
  var c = shadePBR(in.p, n, v, albedo, rough, metal, 1.0, shadow) + glow;
  c = applyFog(c, in.p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

// The lancers' spinning shields (FX.SHIELD): a real board of gold each, one of four (src/gfx/shieldshapes.js, from VELSCOUR's
// Lancer: tools/shields/lancer_spin.py), bowed, with a rim's thickness, its face worked in relief and its rear dark hide and
// gold grips. Its axis is the way its face looks, its length how far it's turned in its own plane, its age which of the four.
const SHIELD_SHADER = /* wgsl */ `
struct Inst { p: vec4f, a: vec4f, m: vec4f, x: vec4f };
@group(1) @binding(0) var<storage, read> fx: array<Inst>;
@group(1) @binding(1) var shieldTex: texture_2d<f32>;
struct V { @builtin(position) pos: vec4f, @location(0) p: vec3f, @location(1) n: vec3f, @location(2) uvk: vec3f, @location(3) @interpolate(flat) id: u32, @location(4) viewZ: f32,
  @location(5) @interpolate(flat) side: vec3f, @location(6) @interpolate(flat) up: vec3f };

@vertex fn vs(@location(0) pos: vec3f, @location(1) nrm: vec3f, @location(2) uvk: vec3f, @builtin(instance_index) ii: u32) -> V {
  let I = fx[ii];
  let axis = normalize(I.a.xyz);
  // (Its own right, as you face it; and its own up. Lying flat, its up is away to the north.)
  let other = select(vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, -1.0), abs(axis.y) > 0.92);
  var side = normalize(cross(other, axis));
  var up = cross(axis, side);
  let c = cos(I.a.w); let s = sin(I.a.w);
  let s2 = side * c + up * s;
  up = up * c - side * s;
  side = s2;
  var o: V;
  let w = I.p.xyz + (side * pos.x + up * pos.y + axis * pos.z) * I.p.w;
  o.p = w; o.id = ii; o.uvk = uvk; o.side = side; o.up = up;
  o.n = side * nrm.x + up * nrm.y + axis * nrm.z;
  o.pos = F.viewProj * vec4f(w, 1.0);
  o.viewZ = -(F.view * vec4f(w, 1.0)).z;
  return o;
}

@fragment fn fs(in: V) -> Out {
  let I = fx[in.id];
  let e = u32(I.m.y);
  let t = textureSample(shieldTex, clampSmp, in.uvk.xy);
  let toCam = F.camPos.xyz - in.p;
  let dist = length(toCam);
  let v = toCam / dist;
  let kind = in.uvk.z;                 // 0 its face, 1 its edge, 2 its rear
  var n = normalize(in.n);
  var tone = 0.8;
  var hide = 0.0;
  if (kind < 0.5 || kind > 1.5) {
    let lean = t.gb * 2.0 - 1.0;
    let tx = select(in.side, -in.side, kind > 1.5);
    n = normalize(tx * lean.x + in.up * lean.y + n * sqrt(max(1.0 - dot(lean, lean), 0.05)));
    tone = t.r;
    hide = clamp((1.0 - t.a) / 0.75, 0.0, 1.0);
  }
  let ndv = max(dot(n, v), 0.0);
  let fres = pow(1.0 - ndv, 3.0);
  // (Gold deep enough to stay gold under a noon sky, darker in its hollows; the hide takes no shine.)
  let albedo = mix(vec3f(1.0, 0.6, 0.14) * mix(0.26, 1.15, tone), vec3f(0.1, 0.055, 0.03) * (0.5 + tone), hide);
  let rough = mix(mix(0.5, 0.28, tone), 0.85, hide);
  // (Not all metal: gold that shows nothing but the sky is brown wherever the sky is dark.)
  let metal = 0.72 * (1.0 - hide);
  // Its element's light along its edge and off its rim, as much as its alpha says.
  let lit = abs(I.x.x);
  // And a little of its own: these are called up, not carried, and gold of light is never dull in a shadow.
  let glow = (rampColor(e, 0.62) * lit * (fres * 2.0 + select(0.03, 0.22, kind > 0.5 && kind < 1.5)) * (0.85 + 0.15 * sin(F.camPos.w * 9.0 + f32(in.id)))
    + albedo * 0.1 * min(lit * 2.0, 1.0)) * (1.0 - hide);
  let shadow = shadowAt(in.p, n, in.viewZ, ign(in.pos.xy));
  var c = shadePBR(in.p, n, v, albedo, rough, metal, mix(0.55, 1.0, tone), shadow) + glow;
  c = applyFog(c, in.p, -v, dist);
  var o: Out;
  o.color = vec4f(c, 1.0);
  o.depth = in.viewZ;
  return o;
}
`;

// The four shields' meshes, from their outlines: a face and a rear in rings from the middle out, bowed, and an edge between.
// Returns { vertices (x, y, z, normal, u, v, kind: nine floats each), indices, parts: [first index, count] for each }.
const SHIELD_THICK = 0.075, SHIELD_BOW = 0.11, SHIELD_RINGS = [0.3, 0.6, 0.85, 1];
export function shieldMeshes() {
  const V = [], X = [], parts = [], cols = SHIELD_NAMES.length;
  SHIELD_NAMES.forEach((name, col) => {
    const R = SHIELD_OUTLINE[name], n = R.length, first = X.length;
    const at = (i) => { const a = (i % n) * 2 * Math.PI / n; return [Math.cos(a) * R[i % n], Math.sin(a) * R[i % n]]; };
    for (const rear of [0, 1]) {
      const base = V.length / 9, s = rear ? -1 : 1;
      const put = (x, y, f, r, dx, dy) => {
        const lean = 2 * SHIELD_BOW * f / Math.max(r, 0.2), L = Math.hypot(lean, 1);
        V.push(x, y, SHIELD_THICK / 2 * s + SHIELD_BOW * (1 - f * f), s * dx * lean / L, s * dy * lean / L, s / L,
          (col + 0.5 + s * x * SHIELD_CELL) / cols, (rear + 0.5 - y * SHIELD_CELL) / 2, rear * 2);
      };
      put(0, 0, 0, 1, 0, 0);
      for (const f of SHIELD_RINGS) for (let i = 0; i < n; i++) { const [x, y] = at(i), r = Math.hypot(x, y); put(x * f, y * f, f, r, x / r, y / r); }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        X.push(base, base + 1 + i, base + 1 + j);
        for (let k = 0; k + 1 < SHIELD_RINGS.length; k++) { const a = base + 1 + k * n, b = a + n; X.push(a + i, b + i, b + j, a + i, b + j, a + j); }
      }
    }
    // (The edge: each point twice, with the outline's own normal there.)
    const base = V.length / 9;
    for (let i = 0; i < n; i++) {
      const [x, y] = at(i), [px, py] = at(i + n - 1), [qx, qy] = at(i + 1);
      let nx = qy - py, ny = px - qx; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      for (const s of [1, -1]) V.push(x, y, SHIELD_THICK / 2 * s, nx, ny, s * 0.25, 0, 0, 1);
    }
    for (let i = 0; i < n; i++) { const a = base + i * 2, b = base + ((i + 1) % n) * 2; X.push(a, b, b + 1, a, b + 1, a + 1); }
    parts.push([first, X.length - first]);
  });
  return { vertices: new Float32Array(V), indices: new Uint16Array(X), parts };
}

const GROUND = new Set([FX.RING, FX.DISC, FX.RUNE, FX.MARK]);
const MAX_LIGHTS = 4;
const STRIDE = FX_FLOATS * 4;

export class SpellFX {
  constructor(r) {
    this.r = r;
    const { device } = r;
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.glowBuf = device.createBuffer({ size: MAX_FX * STRIDE, usage });
    this.solidBuf = device.createBuffer({ size: MAX_FX * STRIDE, usage });
    this.glowData = new Float32Array(MAX_FX * FX_FLOATS);
    this.solidData = new Float32Array(MAX_FX * FX_FLOATS);
    this.nGlow = 0; this.nSolid = 0; this.nFirst = 0;
    // The shields: their own instances, sorted by which of the four each is, and one mesh that holds all four.
    this.shieldBuf = device.createBuffer({ size: MAX_FX * STRIDE, usage });
    this.shieldData = new Float32Array(MAX_FX * FX_FLOATS);
    this.shieldN = SHIELD_NAMES.map(() => 0);
    this.last = performance.now();
    this.spare = [];
    this.bglGlow = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    ] });
    this.bglSolid = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
    ] });
    this.solidBG = device.createBindGroup({ layout: this.bglSolid, entries: [{ binding: 0, resource: { buffer: this.solidBuf } }] });
    this.bglShield = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ] });
    const mesh = this.shieldMesh = shieldMeshes();
    this.shieldVB = device.createBuffer({ size: mesh.vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.shieldIB = device.createBuffer({ size: Math.ceil(mesh.indices.byteLength / 4) * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(this.shieldVB, 0, mesh.vertices);
    device.queue.writeBuffer(this.shieldIB, 0, mesh.indices.buffer, 0, mesh.indices.byteLength);
    // (Plain gold until their paint is down: it's asked for as the pipelines are built, and waits for nothing.)
    const plain = device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    device.queue.writeTexture({ texture: plain }, new Uint8Array([150, 128, 128, 255]), {}, [1, 1]);
    this.shieldPaint(plain);
  }

  shieldPaint(tex) {
    this.shieldBG = this.r.device.createBindGroup({ layout: this.bglShield, entries: [{ binding: 0, resource: { buffer: this.shieldBuf } }, { binding: 1, resource: tex.createView() }] });
  }

  async loadShields() {
    const { r } = this, { device } = r;
    try {
      const blob = await fetch(`${r.base || ''}assets/game/fx/lancer_shields.webp`).then((q) => { if (!q.ok) throw new Error(q.status); return q.blob(); });
      const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const w = bmp.width, h = bmp.height, mips = mipCountFor(w, h);
      const tex = device.createTexture({ size: [w, h], format: 'rgba8unorm', mipLevelCount: mips,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      device.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex, premultipliedAlpha: false }, [w, h]);
      bmp.close();
      const enc = device.createCommandEncoder();
      r.mip.generate(tex, 'rgba8unorm', 1, mips, enc);
      device.queue.submit([enc.finish()]);
      this.shieldPaint(tex);
    } catch (e) { console.warn('lancer shields', e); }
  }

  buildSolid(layout, targets, depth, ms) {
    const mod = this.r.shader(COMMON + RAMP + SOLID_SHAPES);
    this.pSolid = this.r.device.createRenderPipeline({
      layout: layout(this.bglSolid),
      vertex: { module: mod, entryPoint: 'vs' },
      fragment: { module: mod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth, multisample: ms,
    });
    if (!this.shieldsAsked) { this.shieldsAsked = true; this.loadShields(); }
    const smod = this.r.shader(COMMON + RAMP + SHIELD_SHADER);
    this.pShield = this.r.device.createRenderPipeline({
      layout: layout(this.bglShield),
      vertex: { module: smod, entryPoint: 'vs', buffers: [{ arrayStride: 36, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32x3' }] }] },
      fragment: { module: smod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth, multisample: ms,
    });
  }

  buildGlow(inWorld) {
    const { r } = this, { device } = r;
    const mod = r.shader(COMMON + RAMP + LIGHT_SHAPES);
    const make = (cmp) => device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [r.bgl0, this.bglGlow] }),
      vertex: { module: mod, entryPoint: 'vs' },
      fragment: { module: mod, entryPoint: 'fs', targets: [{ format: r.gpu.hdrFormat, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] },
      ...inWorld(cmp),
    });
    this.pGlow = make('greater');
    this.pGlowOver = r.tier.lean ? make('always') : this.pGlow;
  }

  depthBG(ldView) {
    return this.r.device.createBindGroup({ layout: this.bglGlow, entries: [{ binding: 0, resource: { buffer: this.glowBuf } }, { binding: 1, resource: ldView }] });
  }

  // Each frame: sort the snapshot's shapes into what's solid and what's light, spray what they spray, and add their lights to the
  // frame's. Returns how many lights it added.
  frame(snap, d, lightsAt, taken) {
    const { r, glowData: g, solidData: s } = this;
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const n = snap[H.FX_N] | 0;
    let nG = 0, nS = 0;
    // Marks on the ground go down first, then the light over them, and what's drawn over the hands last.
    for (const pass of [0, 1, 2]) {
      if (pass === 2) this.nFirst = nG;
      for (let i = 0; i < n; i++) {
        const o = FX_START + i * FX_FLOATS, shape = snap[o + 8];
        if (shape >= FX.LIGHT) continue;
        if (shape === FX.SHIELD) continue;
        if (shape >= FX.ICE) {
          if (pass === 0) { s.set(snap.subarray(o, o + FX_FLOATS), nS * FX_FLOATS); nS++; }
          continue;
        }
        const over = snap[o + 12] < 0;
        if ((pass === 0) !== GROUND.has(shape)) continue;
        if (pass !== 0 && (pass === 2) !== over) continue;
        g.set(snap.subarray(o, o + FX_FLOATS), nG * FX_FLOATS);
        nG++;
      }
    }
    this.nGlow = nG; this.nSolid = nS;
    const q = r.device.queue;
    if (nG) q.writeBuffer(this.glowBuf, 0, g, 0, nG * FX_FLOATS);
    if (nS) q.writeBuffer(this.solidBuf, 0, s, 0, nS * FX_FLOATS);
    // The shields, each kind's together.
    let nSh = 0;
    for (let kind = 0; kind < this.shieldN.length; kind++) {
      const from = nSh;
      for (let i = 0; i < n; i++) {
        const o = FX_START + i * FX_FLOATS;
        if (snap[o + 8] !== FX.SHIELD || Math.min(this.shieldN.length - 1, Math.max(0, Math.round(snap[o + 11]))) !== kind) continue;
        this.shieldData.set(snap.subarray(o, o + FX_FLOATS), nSh * FX_FLOATS);
        nSh++;
      }
      this.shieldN[kind] = nSh - from;
    }
    if (nSh) q.writeBuffer(this.shieldBuf, 0, this.shieldData, 0, nSh * FX_FLOATS);
    // The lights your party carries first (FX_CARRIED: the renderer left them room, carried() below), steady; then the
    // brightest few of the rest light the world, however many the tier otherwise affords.
    const lit = this.spare, held = this.held || (this.held = []);
    lit.length = 0; held.length = 0;
    for (let i = 0; i < n; i++) {
      const o = FX_START + i * FX_FLOATS;
      if (snap[o + 13] > 0) (snap[o + 8] === FX.LIGHT && snap[o + 15] === FX_CARRIED ? held : lit).push(o);
      this.spray(snap, o, dt);
    }
    const nh = Math.min(held.length, r.tier.lean ? 2 : 4, MAX_LIT - taken);
    for (let i = 0; i < nh; i++) {
      const o = held[i], c = ELEM_LIGHT[snap[o + 9] | 0];
      d.set([snap[o], snap[o + 1], snap[o + 2], snap[o + 14], c[0], c[1], c[2], snap[o + 13]], lightsAt + (taken + i) * 8);
    }
    taken += nh;
    if (lit.length > 1) lit.sort((a, b) => snap[b + 13] - snap[a + 13]);
    const room = Math.min(lit.length, r.tier.lean ? 2 : MAX_LIGHTS, MAX_LIT - taken);
    const t = now * 0.001;
    for (let i = 0; i < room; i++) {
      const o = lit[i], c = ELEM_LIGHT[snap[o + 9] | 0];
      const fl = 0.86 + 0.14 * Math.sin(t * 23 + i * 2.1) * Math.sin(t * 13.7 + i);
      d.set([snap[o], snap[o + 1], snap[o + 2], snap[o + 14], c[0], c[1], c[2], snap[o + 13] * fl], lightsAt + (taken + i) * 8);
    }
    return nh + room;
  }

  // How many carried lights the snapshot has (as many as frame() will place), so the lanterns and torches leave room.
  carried(snap) {
    const n = snap[H.FX_N] | 0;
    let k = 0;
    for (let i = 0; i < n; i++) { const o = FX_START + i * FX_FLOATS; if (snap[o + 8] === FX.LIGHT && snap[o + 15] === FX_CARRIED && snap[o + 13] > 0) k++; }
    return Math.min(k, this.r.tier.lean ? 2 : 4);
  }

  spray(snap, o, dt) {
    const shape = snap[o + 8], e = snap[o + 9] | 0, size = snap[o + 3], alpha = Math.abs(snap[o + 12]);
    const x = snap[o], y = snap[o + 1], z = snap[o + 2], r = this.r;
    const kind = 16 + e;
    const n = (rate) => { const v = rate * dt; return Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0); };
    switch (shape) {
      case FX.ORB:
        if (size > 0.22) r.emit(e === ELEM.FIRE ? 6 : kind, n(90 * size), x, y, z, 0, 0.4, 0, 1, 0.3, 2.2, 0.012, 0.03, 0.3, 0.9);
        break;
      case FX.TRAIL:
        if (size > 0.06) r.emit(kind, n(90 * size), x, y, z, snap[o + 4], snap[o + 5], snap[o + 6], 0.5, 0.4, 2.4, 0.008, 0.02, 0.2, 0.6);
        break;
      case FX.FLAME:
        r.emit(6, n(9 * snap[o + 7] * alpha), x + (Math.random() - 0.5) * snap[o + 7], y + Math.random() * size * 0.7, z + (Math.random() - 0.5) * snap[o + 7], 0, 1, 0, 0.4, 0.5, 2, 0.012, 0.028, 0.7, 1.7);
        break;
      case FX.BEAM: {
        if (snap[o + 3] > 0.1 && snap[o + 15] > 0) {
          const L = snap[o + 7], ax = snap[o + 4], ay = snap[o + 5], az = snap[o + 6], u = Math.random();
          r.emit(e === ELEM.FIRE ? 6 : kind, n(90), x + ax * L * u, y + ay * L * u, z + az * L * u, ax, ay + 0.2, az, 0.7, 0.8, 4, 0.012, 0.03, 0.2, 0.7);
          r.emit(2, n(70), x + ax * L, y + ay * L, z + az * L, -ax, 0.5 - ay, -az, 1.1, 1.5, 6, 0.003, 0.008, 0.2, 0.6);
        }
        break;
      }
      case FX.BOLT: {
        const L = snap[o + 7], ax = snap[o + 4], ay = snap[o + 5], az = snap[o + 6];
        r.emit(kind, n(40), x + ax * L, y + ay * L, z + az * L, ax, ay, az, 1.3, 1, 5, 0.006, 0.014, 0.1, 0.35);
        break;
      }
      case FX.VORTEX:
        // Motes spiralling in.
        for (let i = n(60); i > 0; i--) {
          const a = Math.random() * Math.PI * 2, R = size * (1.5 + Math.random() * 2);
          const px = Math.cos(a) * R, pz = Math.sin(a) * R, py = (Math.random() - 0.5) * size;
          r.emit(kind, 1, x + px, y + py, z + pz, -px - pz * 1.2, -py, -pz + px * 1.2, 0, R * 1.3, R * 1.7, 0.012, 0.026, 0.45, 0.6);
        }
        break;
      case FX.DISC:
        if (e === ELEM.FIRE) {
          const a = Math.random() * Math.PI * 2, R = Math.sqrt(Math.random()) * size;
          r.emit(6, n(2.4 * size * alpha), x + Math.cos(a) * R, y + 0.1, z + Math.sin(a) * R, 0, 1, 0, 0.5, 0.4, 1.8, 0.012, 0.028, 0.8, 1.9);
        }
        break;
      default:
    }
  }

  drawSolid(pass) {
    if (this.nSolid) {
      pass.setPipeline(this.pSolid);
      pass.setBindGroup(1, this.solidBG);
      pass.draw(36, this.nSolid);
    }
    let first = 0, set = false;
    this.shieldN.forEach((count, kind) => {
      if (!count) return;
      if (!set) { set = true; pass.setPipeline(this.pShield); pass.setBindGroup(1, this.shieldBG); pass.setVertexBuffer(0, this.shieldVB); pass.setIndexBuffer(this.shieldIB, 'uint16'); }
      const [at, len] = this.shieldMesh.parts[kind];
      pass.drawIndexed(len, count, at, 0, first);
      first += count;
    });
  }

  draw(pass) {
    if (!this.nGlow) return;
    pass.setBindGroup(1, this.r.fxBG);
    if (this.nFirst) { pass.setPipeline(this.pGlow); pass.draw(6, this.nFirst); }
    if (this.nGlow > this.nFirst) { pass.setPipeline(this.pGlowOver); pass.draw(6, this.nGlow - this.nFirst, 0, this.nFirst); }
  }
}
