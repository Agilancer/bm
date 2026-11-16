// The shield's track, ridden on the ground (src/sim/surf.js): a groove through dirt and grass, and a trough through snow, that
// fade away behind you after a while; and over stone, no track but sparks off its rim. What it's riding over is
// src/ui/places.js boardGround, and the scrape it makes is src/audio.js surf. All of it is on the render thread and owes the sim
// nothing: the track is a ribbon laid a few centimetres over the ground, drawn straight after it, that darkens what's under it
// (a multiply, so it takes the ground's own light and colour), and fades out by the sim's clock on the GPU.
import { H } from '../core/layout.js';
import { terrainHeight } from '../core/terrain.js';
import { boardGround } from '../ui/places.js';
import { COMMON } from './shaders.js';

const MAX = 1400;        // stretches of track kept (some 500 m of it)
const STRIDE = 20;       // floats a stretch
const STEP = 0.36;       // metres between the points it's laid through
const HALF = 0.23;       // half the track's width (a kite shield's)
const LIFT = 0.045;      // over the ground, so it never sinks into it
const LIFE = { dirt: 22, snow: 34 };   // seconds it lasts (the last half of that, fading)
const KIND = { dirt: 0, snow: 1 };

const WGSL = COMMON + /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) wp: vec3f, @location(2) born: f32, @location(3) k: vec3f };
@vertex fn vs(@builtin(vertex_index) i: u32, @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f, @location(3) d: vec4f, @location(4) e: vec4f) -> VO {
  var o: VO;
  // (0: the near end's left, 1: its right, 2: the far end's left, 3: its right.)
  let far = i >= 2u; let right = (i & 1u) == 1u;
  let L = select(a, c, far); let R = select(b, d, far);
  let q = select(L, R, right);
  o.wp = q.xyz;
  o.pos = F.viewProj * vec4f(q.xyz, 1.0);
  o.uv = vec2f(select(-1.0, 1.0, right), select(b.w, d.w, far));
  o.born = select(a.w, c.w, far);
  o.k = e.xyz;
  return o;
}
fn h1(n: f32) -> f32 { return fract(sin(n * 127.1) * 43758.5453); }
@fragment fn fs(in: VO) -> @location(0) vec4f {
  let age = F.camPos.w - in.born;
  let life = in.k.y;
  // Fading over the second half of its life, and away into the distance (where the fog's already over the ground it would darken).
  var fade = 1.0 - smoothstep(life * 0.5, life, age);
  fade *= 1.0 - smoothstep(40.0, 85.0, distance(F.camPos.xyz, in.wp));
  if (age < -0.5) { fade = 0.0; }
  let u = abs(in.uv.x);
  // Scored along its length by the shield's rim and what was under it: lanes across it, each its own darkness, coming and going.
  let lane = floor((in.uv.x + 1.0) * 7.0) + in.k.z * 31.0;
  let along = in.uv.y * (0.35 + h1(lane) * 0.5) + h1(lane + 3.0) * 10.0;
  let streak = mix(h1(lane + floor(along)), h1(lane + floor(along) + 1.0), smoothstep(0.0, 1.0, fract(along)));
  var m = vec3f(1.0);
  if (in.k.x < 0.5) {
    // Dirt: the earth turned up, darker and browner than the grass or the dust over it, with a lip of it thrown up at the sides.
    let groove = 1.0 - smoothstep(0.6, 0.98, u);
    m = mix(vec3f(1.0), vec3f(0.48, 0.41, 0.35), groove * (0.7 + 0.3 * streak));
    let lip = smoothstep(0.76, 0.93, u) * (1.0 - smoothstep(0.93, 1.0, u));
    m += vec3f(0.2, 0.16, 0.11) * lip;
  } else {
    // Snow: pressed down into a trough that holds a bluer shade, and banked up bright along both sides.
    let groove = 1.0 - smoothstep(0.66, 0.97, u);
    m = mix(vec3f(1.0), vec3f(0.62, 0.71, 0.9), groove * (0.8 + 0.2 * streak));
    let bank = smoothstep(0.78, 0.94, u) * (1.0 - smoothstep(0.94, 1.0, u));
    m += vec3f(0.2, 0.2, 0.21) * bank;
  }
  // (Blended as twice this times what's there: 0.5 leaves the ground as it was.)
  return vec4f(mix(vec3f(1.0), m, fade) * 0.5, 0.0);
}`;

export class BoardMarks {
  constructor(device) {
    this.device = device;
    this.buf = device.createBuffer({ size: MAX * STRIDE * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.data = new Float32Array(MAX * STRIDE);
    this.n = 0;          // stretches laid so far, ever (the ring's write point is n % MAX)
    this.dirty = -1;     // the first slot written since the last upload
    this.last = null;    // the last point laid, while a track is being laid
    this.ground = null;  // what the shield's on now, while it's on the ground: 'dirt', 'snow', 'stone', 'wood', 'water'
    this.speed = 0;
    this.seed = 0;
    this.time = 0;
    this.groundT = 0;
  }

  // The pipeline, for the world's pass as it is (again whenever that's rebuilt: the track itself is kept).
  build(bgl0, targets, depthFormat, msaa, compile) {
    const module = compile(WGSL);
    this.pipe = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
      vertex: { module, entryPoint: 'vs', buffers: [{ arrayStride: STRIDE * 4, stepMode: 'instance', attributes: [0, 1, 2, 3, 4].map((l) => ({ shaderLocation: l, offset: l * 16, format: 'float32x4' })) }] },
      fragment: { module, entryPoint: 'fs', targets: targets.map((t, i) => (i ? { format: t.format, writeMask: 0 } : { format: t.format, blend: { color: { srcFactor: 'dst', dstFactor: 'src' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } })) },
      primitive: { topology: 'triangle-strip' },
      depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare: 'greater' }, multisample: { count: msaa },
    });
  }

  clear() { this.n = 0; this.last = null; this.dirty = -1; }

  // Where the ground is under a point of the track: the land's own height where you're on the land, else the floor you're on.
  groundY(x, z, y, onLand) { return (onLand ? terrainHeight(x, z) : y) + LIFT; }

  // A point of the track, its two edges square to the way it's going.
  point(x, y, z, dx, dz, kind, along, onLand) {
    const ex = -dz * HALF, ez = dx * HALF;
    return { x, y, z, kind, along, born: this.time, onLand,
      lx: x + ex, lz: z + ez, ly: this.groundY(x + ex, z + ez, y, onLand), rx: x - ex, rz: z - ez, ry: this.groundY(x - ex, z - ez, y, onLand) };
  }

  lay(p, q) {
    const s = this.n % MAX, o = s * STRIDE, D = this.data;
    D[o] = p.lx; D[o + 1] = p.ly; D[o + 2] = p.lz; D[o + 3] = p.born;
    D[o + 4] = p.rx; D[o + 5] = p.ry; D[o + 6] = p.rz; D[o + 7] = p.along;
    D[o + 8] = q.lx; D[o + 9] = q.ly; D[o + 10] = q.lz; D[o + 11] = q.born;
    D[o + 12] = q.rx; D[o + 13] = q.ry; D[o + 14] = q.rz; D[o + 15] = q.along;
    D[o + 16] = KIND[q.kind]; D[o + 17] = LIFE[q.kind]; D[o + 18] = this.seed; D[o + 19] = 0;
    if (this.dirty < 0) this.dirty = s;
    this.n++;
  }

  // Each frame: the shield's on the ground or it isn't, and if it is, what's under it and what it leaves there.
  // time: the sim's clock as the shaders have it (F.camPos.w); ways: the roads, for what they're laid with; r: the renderer, for sparks.
  update(dt, snap, time, ways, r) {
    // (A game loaded, or a new one: the clock's gone back, and the track was somewhere else.)
    if (time < this.time - 1) this.clear();
    this.time = time;
    const x = snap[H.PX], y = snap[H.PY], z = snap[H.PZ], vx = snap[H.VX], vz = snap[H.VZ], sp = Math.hypot(vx, vz);
    const riding = snap[H.SURF] > 1.5 && snap[H.ON_GROUND] > 0.5 && sp > 0.8 && snap[H.HP] > 0;
    if (!riding) { this.last = null; this.ground = null; this.speed = 0; return; }
    this.speed = sp;
    const last = this.last;
    const d = last ? Math.hypot(x - last.x, z - last.z) : 0;
    // What's under it: at each point of the track, and a few times a second between (for the sound and the sparks).
    this.groundT -= dt;
    if (!last || d >= STEP || this.groundT <= 0 || !this.ground) { this.ground = boardGround(x, y, z, ways); this.groundT = 0.12; }
    const kind = this.ground, marks = kind === 'dirt' || kind === 'snow';
    const onLand = Math.abs(y - terrainHeight(x, z)) < 0.2;
    if (kind === 'stone') this.sparks(dt, x, y, z, vx / sp, vz / sp, sp, r);
    // A new track where there was none, after a jump, or after a jump in place (a blink, a portal): it doesn't join the last.
    if (!last || d > 3) {
      this.seed = Math.random();
      this.last = this.point(x, y, z, vx / sp, vz / sp, kind, 0, onLand);
      return;
    }
    if (d < STEP) return;
    const p = this.point(x, y, z, (x - last.x) / d, (z - last.z) / d, kind, last.along + d, onLand);
    if (marks && last.kind === kind) this.lay(last, p);
    this.last = p;
  }

  // Off the shield's rim where it's dragged over stone: sprays of them out from both sides of it, more the faster it goes, in
  // little bursts as it catches and skips (the smithy's grinder throws the same kind: src/gfx/folktools.js). Torn off a rim that's
  // going your way, they go on with some of its speed, so they hang out at your sides a moment before they fall behind.
  sparks(dt, x, y, z, fx, fz, sp, r) {
    const rate = Math.min(90, 10 + sp * 4), n = Math.floor(rate * dt) + (Math.random() < (rate * dt) % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1, back = (Math.random() - 0.65) * 0.8;
      const px = x - fx * back + fz * side * HALF * 0.9, pz = z - fz * back - fx * side * HALF * 0.9;
      // (Its way: on with the board at about half its speed, and out sideways and up at three to five metres a second.)
      const on = sp * (0.4 + Math.random() * 0.25), out = 2.6 + Math.random() * 2.4, up = 0.9 + Math.random() * 1.6;
      const vx = fx * on + fz * side * out, vz = fz * on - fx * side * out, v = Math.hypot(vx, up, vz);
      r.emit(2, 3 + Math.floor(Math.random() * 4), px, y + 0.04, pz, vx / v, up / v, vz / v, 0.22, v * 0.85, v * 1.1, 0.005, 0.011, 0.2, 0.55);
    }
  }

  draw(pass) {
    const count = Math.min(this.n, MAX);
    if (!count || !this.pipe) return;
    if (this.dirty >= 0) {
      // (Only what's been laid since the last frame: a stretch or two, unless the ring came round.)
      const end = this.n % MAX || MAX, q = this.device.queue;
      if (end > this.dirty) q.writeBuffer(this.buf, this.dirty * STRIDE * 4, this.data, this.dirty * STRIDE, (end - this.dirty) * STRIDE);
      else { q.writeBuffer(this.buf, this.dirty * STRIDE * 4, this.data, this.dirty * STRIDE, (MAX - this.dirty) * STRIDE); q.writeBuffer(this.buf, 0, this.data, 0, end * STRIDE); }
      this.dirty = -1;
    }
    pass.setPipeline(this.pipe);
    pass.setVertexBuffer(0, this.buf);
    pass.draw(4, count);
  }
}
