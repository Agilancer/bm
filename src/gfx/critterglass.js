// A gilded wisp's crystal (src/gfx/critters.js): VELSCOUR's see-through faceted shell round its heart, a gold octahedron for
// the Gilded Wisp and a tall bipyramid of rainbow facets for the Prismatic one. It's light, not a solid: drawn after the
// world into its pass, added to what's there, tested against what's in front and never hiding what's behind, both its sides,
// each flat facet catching the sun at its edge and glowing at its rim, so the heart shows through it as VELSCOUR's does; and
// the facets' edges lit, so it reads as VELSCOUR's crystal frame.
//
// And a ripe one's arrow where something's in front of it (a pine's boughs, the brow of a hill): the arrow itself is a body
// among the rest (src/gfx/critters.js), and here, drawn after the world only where it's hidden, a ghost of it at about half,
// so a ripe one is always findable.
import { COMMON } from './shaders.js';
import { WISP, arrow, MATS, MAT_KEYS, PALETTE_W, PALETTE_H } from '../core/critter-models.js';

const CAP = 32;              // shells a frame, each kind (and arrows)
const INST = 20;             // floats a shell: its matrix, and its colour and strength
const RAIN = ['#ff60d0', '#60d8ff', '#ffe050', '#80ff90', '#b070ff', '#ff9040'];
const lin = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255) ** 2.2);

const WGSL = COMMON + /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) n: vec3f, @location(1) wp: vec3f, @location(2) col: vec3f, @location(3) k: f32, @location(4) bary: vec3f };
@vertex fn vs(@location(0) p: vec3f, @location(1) n: vec3f, @location(2) c: vec3f, @location(3) bary: vec3f,
              @location(4) m0: vec4f, @location(5) m1: vec4f, @location(6) m2: vec4f, @location(7) m3: vec4f, @location(8) k: vec4f) -> VO {
  var o: VO;
  let M = mat4x4f(m0, m1, m2, m3);
  let w = M * vec4f(p, 1.0);
  o.wp = w.xyz;
  o.pos = F.viewProj * w;
  o.n = (M * vec4f(n, 0.0)).xyz;
  o.col = c * k.rgb;
  o.k = k.a;
  o.bary = bary;
  return o;
}
@fragment fn fs(in: VO, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  let V = normalize(F.camPos.xyz - in.wp);
  var N = normalize(in.n);
  if (!front) { N = -N; }
  let ndv = abs(dot(N, V));
  // Its rim glows; a facet square on is clear, so the heart shows through. (The far side, seen through the near, dimmer.)
  let rim = pow(1.0 - ndv, 1.6);
  let face = select(0.5, 1.0, front);
  let sun = normalize(F.sunDir.xyz);
  let glint = pow(max(dot(reflect(-V, N), sun), 0.0), 48.0) * (0.25 + 0.75 * F.skyAmb.a);
  // (Each facet's edges: a fine bright line, the same width whatever the distance, smoothed.)
  let e = min(in.bary.x, min(in.bary.y, in.bary.z));
  let w = max(fwidth(e), 1e-4);
  let edge = 1.0 - smoothstep(0.035, 0.035 + 1.5 * w, e);
  let c = in.col * (0.07 + 0.8 * rim + 1.1 * edge) * face + vec3f(1.0, 0.95, 0.82) * glint * 1.6 * face;
  return vec4f(c * in.k, 0.0);
}
// An arrow's ghost, where something's in front of it: its own flat colours, at in.k.
@fragment fn fsGhost(in: VO) -> @location(0) vec4f {
  return vec4f(in.col, in.k);
}`;
const STRIDE = 48;           // a corner: position, normal, colour, its place in its triangle

// The shells, flat-faced, as lists of [position, normal, colour] for each corner (three a facet, none shared).
function shell(prism) {
  // (The gilded one's a little taller than wide, VELSCOUR's teardrop of a crystal.)
  const R = (prism ? 8 : 7.4) * WISP, h = prism ? 1.55 : 1.25;
  const P = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  let tris = [];
  for (let i = 0; i < 4; i++) for (const up of [1, -1]) {
    const a = P[i], b = P[(i + 1) % 4], t = [0, up, 0];
    tris.push(up > 0 ? [t, a, b] : [t, b, a]);
  }
  // (The Gilded Wisp's: once more finely faceted, as three.js's OctahedronGeometry(7.4, 1), each new corner out on the ball.)
  if (!prism) {
    const mid = (p, q) => { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], l = Math.hypot(...m); return m.map((v) => v / l); };
    tris = tris.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]; });
  }
  const out = [], gold = lin('#ffd870');
  tris.forEach((tri, f) => {
    const q = tri.map((v) => [v[0] * R, v[1] * R * h, v[2] * R]);
    const u = q[1].map((v, k) => v - q[0][k]), w = q[2].map((v, k) => v - q[0][k]);
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...n); n = n.map((v) => v / l);
    const cx = q[0][0] + q[1][0] + q[2][0], cy = q[0][1] + q[1][1] + q[2][1], cz = q[0][2] + q[1][2] + q[2][2];
    if (n[0] * cx + n[1] * cy + n[2] * cz < 0) n = n.map((v) => -v);
    const col = prism ? lin(RAIN[f % RAIN.length]).map((v) => 0.35 + v * 0.65) : gold;
    q.forEach((p, j) => out.push(...p, ...n, ...col, j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0));
  });
  return new Float32Array(out);
}

// An arrow (src/core/critter-models.js arrow), unrolled into its triangles in the same layout, each corner its paint's colour.
function arrowMesh(face, rim) {
  const g = arrow(face, rim), out = [];
  for (const i of g.idx) {
    const u = g.uv[i * 2], v = g.uv[i * 2 + 1], key = MAT_KEYS[Math.floor(u * PALETTE_W) + Math.floor(v * PALETTE_H) * PALETTE_W];
    const col = lin((MATS[key] || MATS.red).c);
    out.push(g.p[i * 3], g.p[i * 3 + 1], g.p[i * 3 + 2], g.n[i * 3], g.n[i * 3 + 1], g.n[i * 3 + 2], ...col, 0, 0, 0);
  }
  return new Float32Array(out);
}
export const GHOST = { red: 0, lit: 1, gold: 2 };

export class CritterGlass {
  constructor(device) {
    this.device = device;
    const up = (data) => {
      const vb = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(vb, 0, data);
      return { vb, count: data.length / (STRIDE / 4) };
    };
    // (Shells: the gilded, the prismatic. Ghosts: the red arrow, the lit one, the gold one.)
    this.mesh = [shell(false), shell(true), arrowMesh('red', 'redDark'), arrowMesh('litFace', 'red'), arrowMesh('amberFace', 'amberDark')].map(up);
    this.inst = new Float32Array(5 * CAP * INST);
    this.buf = device.createBuffer({ size: this.inst.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.n = [0, 0, 0, 0, 0];
  }

  // The pipeline, for the world's pass as it is (again whenever that's rebuilt).
  build(bgl0, targets, depthFormat, msaa, compile) {
    const module = compile(WGSL), layout = this.device.createPipelineLayout({ bindGroupLayouts: [bgl0] });
    const vertex = { module, entryPoint: 'vs', buffers: [
      { arrayStride: STRIDE, attributes: [0, 1, 2, 3].map((l) => ({ shaderLocation: l, offset: l * 12, format: 'float32x3' })) },
      { arrayStride: INST * 4, stepMode: 'instance', attributes: [4, 5, 6, 7, 8].map((l, i) => ({ shaderLocation: l, offset: i * 16, format: 'float32x4' })) },
    ] };
    const blendTo = (blend) => targets.map((t, i) => (i ? { format: t.format, writeMask: 0 } : { format: t.format, blend }));
    this.pipe = this.device.createRenderPipeline({
      layout, vertex,
      fragment: { module, entryPoint: 'fs', targets: blendTo({ color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } }) },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare: 'greater' }, multisample: { count: msaa },
    });
    // (The ghosts: only where something nearer is in front (the depth's reversed: nearer is greater), laid over it.)
    this.ghostPipe = this.device.createRenderPipeline({
      layout, vertex,
      fragment: { module, entryPoint: 'fsGhost', targets: blendTo({ color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } }) },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare: 'less' }, multisample: { count: msaa },
    });
  }

  begin() { this.n.fill(0); }

  /** An arrow's ghost this frame: kind GHOST.red, .lit or .gold; m its matrix; k how much of it shows where it's hidden. */
  ghost(kind, m, k) { this.slot(2 + kind, m, [1, 1, 1], k); }

  /** A shell this frame: m its matrix (column-major, 16), col its colour (linear), k how strongly it shows. */
  put(prism, m, col, k) { this.slot(prism ? 1 : 0, m, col, k); }

  slot(s, m, col, k) {
    if (this.n[s] >= CAP) return;
    const o = (s * CAP + this.n[s]++) * INST, d = this.inst;
    for (let i = 0; i < 16; i++) d[o + i] = m[i];
    d[o + 16] = col[0]; d[o + 17] = col[1]; d[o + 18] = col[2]; d[o + 19] = k;
  }

  draw(pass) {
    if (!this.pipe || !this.n.some((n) => n)) return;
    const q = this.device.queue;
    let on = null;
    for (let s = 0; s < 5; s++) {
      if (!this.n[s]) continue;
      const want = s < 2 ? this.pipe : this.ghostPipe;
      if (on !== want) { pass.setPipeline(want); on = want; }
      q.writeBuffer(this.buf, s * CAP * INST * 4, this.inst, s * CAP * INST, this.n[s] * INST);
      pass.setVertexBuffer(0, this.mesh[s].vb);
      pass.setVertexBuffer(1, this.buf, s * CAP * INST * 4);
      pass.draw(this.mesh[s].count, this.n[s]);
    }
  }
}
