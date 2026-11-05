// WGSL for GPU particles and the post chain.
import { COMMON } from './shaders.js';
import { RAMP } from './spellfx.js';

export const PARTICLE_SIM = /* wgsl */ `
struct P { pos: vec3f, life: f32, vel: vec3f, maxLife: f32, size: f32, kind: u32, seed: f32, pad: f32 };
struct Sim { dt: f32, time: f32, count: u32, pad: f32, wind: vec4f, map: vec4f };
struct Args { vertexCount: u32, instanceCount: atomic<u32>, firstVertex: u32, firstInstance: u32 };
struct Stain { xz: vec2f, size: f32, amount: f32 };
@group(0) @binding(0) var<uniform> S: Sim;
@group(0) @binding(1) var<storage, read_write> particles: array<P>;
@group(0) @binding(2) var<storage, read_write> drawArgs: Args;
@group(0) @binding(3) var<storage, read_write> alive: array<u32>;
@group(0) @binding(4) var<storage, read_write> stainArgs: Args;
@group(0) @binding(5) var<storage, read_write> stains: array<Stain>;
@group(0) @binding(6) var heightTex: texture_2d<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= S.count) { return; }
  var p = particles[i];
  if (p.life <= 0.0) { return; }
  p.life -= S.dt;
  if (p.life <= 0.0) { particles[i].life = 0.0; return; }
  let dt = S.dt;
  // 0 droplet, 1 mist, 2 spark, 3 dust, 4 smoke, 5 mote, 6 ember, 7 flame
  switch p.kind {
    case 0u: {
      p.vel.y -= 9.8 * dt;
      p.vel *= 1.0 - 0.25 * dt;
    }
    case 1u: {
      p.vel.y -= 1.8 * dt;
      p.vel *= 1.0 - 3.2 * dt;
      p.size += dt * 0.55;
    }
    case 2u: {
      p.vel.y -= 9.8 * dt;
      p.vel *= 1.0 - 1.2 * dt;
    }
    case 3u: {
      p.vel *= 1.0 - 2.4 * dt;
      p.vel.y += 0.12 * dt;
      p.size += dt * 0.5;
    }
    case 4u: {
      p.vel += (S.wind.xyz * 0.5 - p.vel) * 0.35 * dt;
      p.vel.y += 0.04 * dt;
      p.size += dt * 0.17;
    }
    case 5u: {
      let t = S.time * 0.8 + p.seed * 40.0;
      p.vel = S.wind.xyz * 0.25 + vec3f(sin(t), sin(t * 0.7 + 1.0) * 0.5, cos(t * 1.1)) * 0.11;
    }
    case 7u: {
      // Slows hard as it hits still air, then the heat takes it up, swelling.
      p.vel *= 1.0 - 2.0 * dt;
      p.vel.y += 2.6 * dt;
      p.size += dt * 0.75;
    }
    default: {
      if (p.kind >= 16u) {
        p.vel.y -= 2.2 * dt;
        p.vel *= 1.0 - 1.7 * dt;
      } else {
        p.vel.y += 0.5 * dt;
      }
    }
  }
  p.pos += p.vel * dt;
  // Landing.
  if (p.kind == 0u || p.kind == 2u) {
    let uv = (p.pos.xz - S.map.xy) * S.map.z;
    if (all(uv >= vec2f(0.0)) && all(uv < vec2f(1.0))) {
      let size = vec2f(textureDimensions(heightTex));
      let y = textureLoad(heightTex, vec2i(uv * size), 0).r;
      if (p.pos.y <= y + 0.02) {
        if (p.kind == 0u) {
          let at = atomicAdd(&stainArgs.instanceCount, 1u);
          if (at < arrayLength(&stains)) {
            stains[at].xz = p.pos.xz;
            stains[at].size = p.size * (2.2 + length(p.vel) * 0.45);
            stains[at].amount = 0.35;
          } else { atomicSub(&stainArgs.instanceCount, 1u); }
          particles[i].life = 0.0;
          return;
        }
        p.vel.y = abs(p.vel.y) * 0.32;
        p.vel.x *= 0.5; p.vel.z *= 0.5;
        p.pos.y = y + 0.021;
      }
    }
  }
  particles[i] = p;
  let at = atomicAdd(&drawArgs.instanceCount, 1u);
  if (at < arrayLength(&alive)) { alive[at] = i; } else { atomicSub(&drawArgs.instanceCount, 1u); }
}
`;

export const PARTICLE_DRAW = COMMON + RAMP + /* wgsl */ `
struct P { pos: vec3f, life: f32, vel: vec3f, maxLife: f32, size: f32, kind: u32, seed: f32, pad: f32 };
@group(1) @binding(0) var<storage, read> particles: array<P>;
@group(1) @binding(1) var<storage, read> alive: array<u32>;
@group(1) @binding(2) var depthTex: texture_2d<f32>;

struct V {
  @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) color: vec4f, @location(2) @interpolate(flat) kind: u32,
  @location(3) fade: f32, @location(4) viewZ: f32,
};

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  let pt = particles[alive[ii]];
  var c = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1));
  let q = c[vi];
  let vp = F.view * vec4f(pt.pos, 1.0);
  var off = q * pt.size;
  let a = clamp(pt.life / pt.maxLife, 0.0, 1.0);
  // Anything passing the lens shrinks away instead of filling the screen.
  let lens = smoothstep(0.25, 0.9, -vp.z);
  off *= lens;
  var o: V;
  o.uv = q; o.kind = pt.kind; o.fade = a; o.viewZ = -vp.z;
  var col = vec4f(1.0);
  let sun = F.sunColor.rgb; let amb = F.skyAmb.rgb;
  switch pt.kind {
    case 0u: {
      // Droplets stretch along their motion on screen.
      let vv = (F.view * vec4f(pt.vel, 0.0)).xy;
      let sp = length(vv);
      if (sp > 0.05) {
        let dir = vv / sp;
        let perp = vec2f(-dir.y, dir.x);
        let stretch = 1.0 + min(sp * 0.008 / max(pt.size, 0.001), 3.0);
        off = (dir * q.y * pt.size * stretch + perp * q.x * pt.size * 0.65) * lens;
      }
      let lit = sun * 0.1 + amb * 0.6;
      col = vec4f(vec3f(0.05 + 0.08 * pt.seed, 0.002, 0.002) * lit, 1.0);
    }
    case 1u: {
      let lit = sun * 0.14 + amb * 0.7;
      col = vec4f(vec3f(0.05, 0.004, 0.004) * lit, 0.12 * a);
    }
    case 2u: {
      let vv = (F.view * vec4f(pt.vel, 0.0)).xy;
      let sp = length(vv);
      if (sp > 0.05) {
        let dir = vv / sp;
        let perp = vec2f(-dir.y, dir.x);
        let stretch = 1.0 + min(sp * 0.011 / max(pt.size, 0.001), 6.0);
        off = (dir * q.y * pt.size * stretch + perp * q.x * pt.size) * lens;
      }
      let heat = a * a;
      col = vec4f(mix(vec3f(9.0, 1.8, 0.2), vec3f(40.0, 24.0, 9.0), heat), 0.0);
    }
    case 3u: {
      let lit = sun * 0.12 + amb * 0.75;
      col = vec4f(vec3f(0.5, 0.42, 0.3) * lit, 0.2 * a);
    }
    case 4u: {
      let lit = sun * 0.13 + amb * 0.8;
      let born = 1.0 - smoothstep(0.92, 1.0, a);
      col = vec4f(mix(vec3f(0.3), vec3f(0.44, 0.41, 0.39), pt.seed) * lit, 0.14 * a * born);
    }
    case 5u: {
      let tw = sin(F.camPos.w * 2.0 + pt.seed * 60.0) * 0.5 + 0.5;
      col = vec4f(vec3f(1.0, 0.86, 0.6) * (sun * 0.45 + amb * 0.2) * (0.5 + tw), 0.0);
      col *= smoothstep(0.0, 0.2, a) * (1.0 - smoothstep(0.85, 1.0, a));
    }
    case 7u: {
      // White at the mouth, through yellow and orange to a dull red that's gone before it reads as a ball.
      let hot = mix(mix(vec3f(1.5, 0.2, 0.02), vec3f(4.2, 1.45, 0.2), smoothstep(0.2, 0.6, a)), vec3f(4.6, 3.0, 1.0), smoothstep(0.72, 1.0, a));
      col = vec4f(hot * (0.7 + 0.3 * pt.seed), 0.26 * smoothstep(0.0, 0.3, a));
    }
    default: {
      if (pt.kind >= 16u) {
        // A spell's sparks: its own colours, streaking the way they go, and cooling.
        let vv = (F.view * vec4f(pt.vel, 0.0)).xy;
        let sp = length(vv);
        if (sp > 0.05) {
          let dir = vv / sp;
          let perp = vec2f(-dir.y, dir.x);
          let stretch = 1.0 + min(sp * 0.008 / max(pt.size, 0.001), 4.0);
          off = (dir * q.y * pt.size * stretch + perp * q.x * pt.size) * lens;
        }
        col = vec4f(rampColor(pt.kind - 16u, 0.3 + a * 0.7) * (1.0 + a * a * 22.0), 0.0);
      } else {
        col = vec4f(vec3f(6.0, 1.6, 0.25) * a, 0.0);
      }
    }
  }
  o.color = col;
  o.pos = F.proj * vec4f(vp.xy + off, vp.z, 1.0);
  return o;
}

@fragment fn fs(in: V) -> @location(0) vec4f {
  // On a phone these are drawn in the world's own pass against its depth, and go without soft edges where they meet it.
  var scene = 1e6;
  if (!LEAN) {
    scene = textureLoad(depthTex, vec2i(in.pos.xy), 0).r;
    if (scene < in.viewZ - 0.02) { discard; }
  }
  let r2 = dot(in.uv, in.uv);
  if (r2 > 1.0) { discard; }
  var shape = 1.0 - r2;
  var soft = 1.0;
  if (in.kind == 1u || in.kind == 3u || in.kind == 4u) {
    soft = clamp((scene - in.viewZ) * 2.2, 0.0, 1.0);
    shape = shape * shape;
  } else if (in.kind == 0u) {
    // A round wet bead with a highlight, not a flat dot.
    let hl = pow(max(1.0 - length(in.uv - vec2f(-0.3, 0.35)), 0.0), 6.0);
    return vec4f(in.color.rgb * (0.55 + 0.45 * shape) + vec3f(0.22, 0.1, 0.09) * hl, 1.0);
  }
  let c = in.color * shape * soft;
  return vec4f(c.rgb * select(1.0, in.color.a, in.color.a > 0.0), c.a);
}
`;

export const STAIN = /* wgsl */ `
struct U { map: vec4f };
struct Stain { xz: vec2f, size: f32, amount: f32 };
@group(0) @binding(0) var<uniform> M: U;
@group(0) @binding(1) var<storage, read> stains: array<Stain>;
struct V { @builtin(position) pos: vec4f, @location(0) q: vec2f, @location(1) a: f32, @location(2) @interpolate(flat) seed: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  var c = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1));
  let s = stains[ii];
  // (M.map.w: the smallest a stain can be. On a coarser map a drop would otherwise fall between the texels and vanish.
  // One that's been enlarged counts for less, or a few drops would make a pool.)
  let w = s.xz + c[vi] * max(s.size, M.map.w);
  let uv = (w - M.map.xy) * M.map.z;
  var o: V;
  o.pos = vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
  o.q = c[vi]; o.a = s.amount * clamp(s.size / max(M.map.w, 1e-5), 0.45, 1.0); o.seed = fract(s.xz.x * 13.7 + s.xz.y * 7.3);
  return o;
}
@fragment fn fs(in: V) -> @location(0) vec4f {
  // A splash has lobes, not a clean circle.
  let ang = atan2(in.q.y, in.q.x);
  let r = length(in.q) * (1.0 + 0.3 * sin(ang * 5.0 + in.seed * 40.0) + 0.14 * sin(ang * 11.0 + in.seed * 90.0));
  let a = (1.0 - smoothstep(0.42, 0.9, r)) * in.a;
  return vec4f(a, a, 0.0, a);
}
`;

// The greatsword's arc: a pale ribbon behind the blade, in the view model's own space.
export const TRAIL = COMMON + /* wgsl */ `
struct V { @builtin(position) pos: vec4f, @location(0) a: f32, @location(1) edge: f32 };
@vertex fn vs(@location(0) p: vec4f, @builtin(vertex_index) i: u32) -> V {
  var o: V;
  o.pos = F.vmProj * vec4f(p.xyz, 1.0);
  o.a = p.w;
  o.edge = f32(i & 1u);
  return o;
}
@fragment fn fs(in: V) -> @location(0) vec4f {
  // Brightest along the outer edge of the blade's path.
  let e = in.edge * in.edge;
  let c = vec3f(0.85, 0.9, 1.0) * in.a * e * 0.5;
  return vec4f(c, 0.0);
}
`;

const TRI = /* wgsl */ `
struct VT { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vsTri(@builtin(vertex_index) i: u32) -> VT {
  var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  var o: VT; o.pos = vec4f(p[i], 0.0, 1.0); o.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5); return o;
}
`;

export const BLOOM = TRI + /* wgsl */ `
struct U { texel: vec2f, mix_: f32, first: f32 };
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var<uniform> B: U;
fn karis(c: vec3f) -> f32 { return 1.0 / (1.0 + dot(c, vec3f(0.2126, 0.7152, 0.0722))); }
// Four taps each way on a phone.
fn four(u: vec2f, d: vec2f) -> vec3f {
  return (textureSampleLevel(src, smp, u + d * vec2f(-1, -1), 0).rgb + textureSampleLevel(src, smp, u + d * vec2f(1, -1), 0).rgb
    + textureSampleLevel(src, smp, u + d * vec2f(-1, 1), 0).rgb + textureSampleLevel(src, smp, u + d * vec2f(1, 1), 0).rgb) * 0.25;
}
@fragment fn down(in: VT) -> @location(0) vec4f {
  let t = B.texel; let u = in.uv;
  if (LEAN) {
    var o = four(u, t * 2.0);
    if (B.first > 0.5) { o = min(max(o - vec3f(1.1), vec3f(0.0)), vec3f(6.0)); }
    return vec4f(o, 1.0);
  }
  let a = textureSampleLevel(src, smp, u + t * vec2f(-2, -2), 0).rgb; let b = textureSampleLevel(src, smp, u + t * vec2f(0, -2), 0).rgb;
  let c = textureSampleLevel(src, smp, u + t * vec2f(2, -2), 0).rgb; let d = textureSampleLevel(src, smp, u + t * vec2f(-2, 0), 0).rgb;
  let e = textureSampleLevel(src, smp, u, 0).rgb; let f = textureSampleLevel(src, smp, u + t * vec2f(2, 0), 0).rgb;
  let g = textureSampleLevel(src, smp, u + t * vec2f(-2, 2), 0).rgb; let h = textureSampleLevel(src, smp, u + t * vec2f(0, 2), 0).rgb;
  let i = textureSampleLevel(src, smp, u + t * vec2f(2, 2), 0).rgb; let j = textureSampleLevel(src, smp, u + t * vec2f(-1, -1), 0).rgb;
  let k = textureSampleLevel(src, smp, u + t * vec2f(1, -1), 0).rgb; let l = textureSampleLevel(src, smp, u + t * vec2f(-1, 1), 0).rgb;
  let m = textureSampleLevel(src, smp, u + t * vec2f(1, 1), 0).rgb;
  var out_ = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  // Only what's truly bright blooms, so skin and sunlit plaster keep their shape and fireflies can't blow out.
  if (B.first > 0.5) { out_ = min(max(out_ - vec3f(1.1), vec3f(0.0)), vec3f(6.0)); }
  return vec4f(out_, 1.0);
}
@fragment fn up(in: VT) -> @location(0) vec4f {
  let t = B.texel; let u = in.uv;
  if (LEAN) { return vec4f(four(u, t) * B.mix_, 1.0); }
  var c = textureSampleLevel(src, smp, u, 0).rgb * 4.0;
  c += (textureSampleLevel(src, smp, u + t * vec2f(-1, 0), 0).rgb + textureSampleLevel(src, smp, u + t * vec2f(1, 0), 0).rgb + textureSampleLevel(src, smp, u + t * vec2f(0, -1), 0).rgb + textureSampleLevel(src, smp, u + t * vec2f(0, 1), 0).rgb) * 2.0;
  c += textureSampleLevel(src, smp, u + t * vec2f(-1, -1), 0).rgb + textureSampleLevel(src, smp, u + t * vec2f(1, -1), 0).rgb + textureSampleLevel(src, smp, u + t * vec2f(-1, 1), 0).rgb + textureSampleLevel(src, smp, u + t * vec2f(1, 1), 0).rgb;
  return vec4f(c / 16.0 * B.mix_, 1.0);
}
`;

export const AO = COMMON + TRI + /* wgsl */ `
@group(1) @binding(0) var depthTex: texture_2d<f32>;
fn viewPos(px: vec2f, z: f32) -> vec3f {
  let ndc = vec2f(px.x * F.screen.z * 2.0 - 1.0, 1.0 - px.y * F.screen.w * 2.0);
  return vec3f(ndc.x / F.proj[0][0], ndc.y / F.proj[1][1], -1.0) * z;
}
@fragment fn fsAO(in: VT) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(depthTex));
  let px = in.uv * size;
  let z = textureLoad(depthTex, vec2i(px), 0).r;
  if (z > 90.0 || z < 0.6) { return vec4f(1.0); }
  let p = viewPos(px, z);
  let dx = textureLoad(depthTex, vec2i(px) + vec2i(1, 0), 0).r - z;
  let dx2 = z - textureLoad(depthTex, vec2i(px) - vec2i(1, 0), 0).r;
  let dy = textureLoad(depthTex, vec2i(px) + vec2i(0, 1), 0).r - z;
  let dy2 = z - textureLoad(depthTex, vec2i(px) - vec2i(0, 1), 0).r;
  let px1 = viewPos(px + vec2f(1.0, 0.0), z + select(dx2, dx, abs(dx) < abs(dx2))) - p;
  let py1 = viewPos(px + vec2f(0.0, 1.0), z + select(dy2, dy, abs(dy) < abs(dy2))) - p;
  let n = normalize(cross(py1, px1));
  let rot = ign(in.pos.xy) * 6.2831853;
  let radius = 0.55;
  let pxR = radius * F.proj[1][1] / z * size.y * 0.5;
  var occ = 0.0;
  for (var i = 0; i < 10; i++) {
    let r = sqrt((f32(i) + 0.5) / 10.0);
    let a = f32(i) * 2.399963 + rot;
    let o = vec2f(cos(a), sin(a)) * r * max(pxR, 4.0);
    let sz = textureLoad(depthTex, vec2i(px + o), 0).r;
    let sp = viewPos(px + o, sz);
    let d = sp - p;
    let dl = length(d);
    let nd = dot(n, d) / max(dl, 1e-3);
    occ += max(nd - 0.08, 0.0) * (1.0 - smoothstep(radius * 0.6, radius * 1.6, dl));
  }
  let ao = clamp(1.0 - occ / 10.0 * 2.4, 0.0, 1.0);
  return vec4f(ao, ao, ao, 1.0);
}
@group(1) @binding(1) var aoTex: texture_2d<f32>;
@fragment fn fsApply(in: VT) -> @location(0) vec4f {
  // A depth-aware blur on the way up, which also hides the rotating sample pattern.
  let size = vec2f(textureDimensions(aoTex));
  let fullSize = vec2f(textureDimensions(depthTex));
  let z = textureLoad(depthTex, vec2i(in.uv * fullSize), 0).r;
  var sum = 0.0; var wsum = 0.0;
  for (var j = -2; j <= 2; j++) {
    for (var i = -2; i <= 2; i++) {
      let q = in.uv + vec2f(f32(i), f32(j)) * 1.0 / size;
      let a = textureSampleLevel(aoTex, clampSmp, q, 0.0).r;
      let dz = textureLoad(depthTex, vec2i(q * fullSize), 0).r;
      let w = exp(-abs(dz - z) * 3.5 / max(z * 0.1, 0.1));
      sum += a * w; wsum += w;
    }
  }
  let ao = sum / max(wsum, 1e-3);
  // The first-person arms have no business in it.
  let k = select(ao, 1.0, z < 0.6);
  return vec4f(k, k, k, 1.0);
}
`;

export const SHAFTS = COMMON + TRI + /* wgsl */ `
@group(1) @binding(0) var depthTex: texture_2d<f32>;
@fragment fn fs(in: VT) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(depthTex));
  let z = textureLoad(depthTex, vec2i(in.uv * size), 0).r;
  // The first-person arms stand in front of all the air.
  if (z < 0.6) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  let ndc = vec2f(in.uv.x * 2.0 - 1.0, 1.0 - in.uv.y * 2.0);
  let q = F.invViewProj * vec4f(ndc, 1e-4, 1.0);
  let dir = normalize(q.xyz / q.w - F.camPos.xyz);
  // viewZ to distance along this ray.
  let viewFwd = -vec3f(F.view[0][2], F.view[1][2], F.view[2][2]);
  let cosA = max(dot(dir, viewFwd), 0.05);
  let maxD = min(z / cosA, 90.0);
  let steps = 14;
  let stepLen = maxD / f32(steps);
  let jitter = ign(in.pos.xy);
  var acc = 0.0;
  for (var i = 0; i < steps; i++) {
    let t = (f32(i) + jitter) * stepLen;
    let p = F.camPos.xyz + dir * t;
    let dens = exp(-max(p.y, 0.0) * 0.1);
    acc += shadowQuick(p, t * cosA) * dens;
  }
  acc *= stepLen * 0.0011;
  let mu = dot(dir, F.sunDir.xyz);
  let g = 0.62;
  let phase = (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
  let c = F.sunColor.rgb * acc * (min(phase, 0.32) * 2.6 + 0.12);
  return vec4f(min(c, vec3f(0.12, 0.09, 0.06)), 1.0);
}
`;

export const COMPOSITE = TRI + /* wgsl */ `
struct U { flash: f32, weak: f32, time: f32, sharpen: f32, shafts: f32, bloom: f32, fade: f32, hitDir: f32, hitDirA: f32, pad0: f32, pad1: f32, pad2: f32 };
@group(0) @binding(0) var hdr: texture_2d<f32>;
@group(0) @binding(1) var bloomTex: texture_2d<f32>;
@group(0) @binding(2) var shaftTex: texture_2d<f32>;
@group(0) @binding(3) var smp: sampler;
@group(0) @binding(4) var<uniform> P: U;

// A filmic curve fit (Narkowicz-style, softened) with a little warmth in the shoulder.
fn tonemap(x: vec3f) -> vec3f {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}
fn srgb(c: vec3f) -> vec3f {
  let lo = c * 12.92; let hi = 1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3f(0.0031308));
}
fn ign2(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715)))); }

@fragment fn fs(in: VT) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(hdr));
  var col = textureSampleLevel(hdr, smp, in.uv, 0).rgb;
  // Contrast-adaptive sharpening, when the frame was rendered under the display's resolution.
  if (P.sharpen > 0.0) {
    let t = 1.0 / size;
    let n = textureSampleLevel(hdr, smp, in.uv + vec2f(0.0, -t.y), 0).rgb; let s = textureSampleLevel(hdr, smp, in.uv + vec2f(0.0, t.y), 0).rgb;
    let e = textureSampleLevel(hdr, smp, in.uv + vec2f(t.x, 0.0), 0).rgb; let w = textureSampleLevel(hdr, smp, in.uv + vec2f(-t.x, 0.0), 0).rgb;
    let mn = min(min(min(n, s), min(e, w)), col); let mx = max(max(max(n, s), max(e, w)), col);
    let amp = sqrt(clamp(min(mn, 1.0 - min(mx, vec3f(1.0))) / max(mx, vec3f(0.01)), vec3f(0.0), vec3f(1.0)));
    let wgt = amp * -P.sharpen * 0.2;
    col = max((n + s + e + w) * wgt + col, vec3f(0.0)) / (1.0 + 4.0 * wgt);
  }
  var shaftSum = vec3f(0.0);
  if (P.shafts > 0.0) {
    let st = 1.0 / vec2f(textureDimensions(shaftTex));
    shaftSum = textureSampleLevel(shaftTex, smp, in.uv, 0).rgb * 0.36;
    shaftSum += textureSampleLevel(shaftTex, smp, in.uv + st * vec2f(1.5, 0.5), 0).rgb * 0.16;
    shaftSum += textureSampleLevel(shaftTex, smp, in.uv + st * vec2f(-1.5, -0.5), 0).rgb * 0.16;
    shaftSum += textureSampleLevel(shaftTex, smp, in.uv + st * vec2f(0.5, -1.5), 0).rgb * 0.16;
    shaftSum += textureSampleLevel(shaftTex, smp, in.uv + st * vec2f(-0.5, 1.5), 0).rgb * 0.16;
  }
  col += shaftSum;
  let bloom = textureSampleLevel(bloomTex, smp, in.uv, 0).rgb;
  col += bloom * P.bloom;
  let aspect = size.x / size.y;
  let q = (in.uv - 0.5) * vec2f(aspect, 1.0);
  let r2 = dot(q, q);
  // Exposure, film curve, grade.
  col *= 1.08;
  col = tonemap(col);
  let l = dot(col, vec3f(0.2126, 0.7152, 0.0722));
  col = mix(vec3f(l), col, 1.1);
  // Warm the highs, cool the deep shadows a touch.
  col *= mix(vec3f(0.94, 0.98, 1.06), vec3f(1.04, 1.0, 0.94), smoothstep(0.1, 0.65, l));
  col = clamp(col, vec3f(0.0), vec3f(1.0));
  // Vignette, and the world closing in when you're hurt.
  col *= 1.0 - r2 * 0.32;
  if (P.weak > 0.0 || P.flash > 0.0) {
    let edge = smoothstep(0.1, 0.9, r2 * 2.0);
    let pulse = 0.75 + 0.25 * sin(P.time * 4.5);
    // A blow darkens the edges and leaves the middle clear: the next one still has to be read.
    let hurt = clamp(P.flash * (0.06 + edge * 0.6) + P.weak * edge * 0.4 * pulse, 0.0, 0.5);
    col *= 1.0 - hurt * 0.7;
    col = mix(col, vec3f(0.2, 0.012, 0.008), hurt * 0.5);
    col = mix(col, vec3f(dot(col, vec3f(0.3, 0.5, 0.2))), P.weak * 0.35);
  }
  // Where the blow came from: a red sweep on that side of the screen.
  if (P.hitDirA > 0.0) {
    let ang = atan2(q.x, -q.y);
    var dA = abs(ang - P.hitDir);
    dA = min(dA, 6.2831853 - dA);
    let m = (1.0 - smoothstep(0.1, 0.9, dA)) * smoothstep(0.08, 0.3, r2) * P.hitDirA;
    col = mix(col, vec3f(0.4, 0.015, 0.008), m * 0.45);
  }
  col = col * (1.0 - P.fade);
  var out_ = srgb(col);
  // Dither, so the long gradients of a dusk sky don't band.
  out_ += (ign2(in.pos.xy + fract(P.time) * 61.0) - 0.5) / 255.0;
  return vec4f(out_, 1.0);
}
`;
