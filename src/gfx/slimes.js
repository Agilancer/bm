// The slimes' bodies (src/sim/slimes.js): a lathe each, squashed and stretched (its volume kept), its top leaning behind its base,
// wobbling, built again on the CPU every frame from the snapshot's slime slots, and drawn with the village's own pipeline as
// a flat material per kind (materials.js STATIC, 120 + kind: see-through-looking jelly, a dark heart, a lit rim).
import { MAX_SLIMES, SLIME_FLOATS, SLIMES_START } from '../core/layout.js';

const SIDES = 16, RINGS = 9;
const VERTS = SIDES * (RINGS + 1) + 1, FLOATS = 9;
const TAU = Math.PI * 2;
// The side's radius at height y (0 the base, 1 the top), for a body this tall for its radius.
const profile = (h, y) => (h > 1.2 ? Math.sqrt(Math.max(0, 1 - y * y)) * (1 - 0.72 * y ** 3) : Math.max(0, 1 - y ** 2.2) ** (h < 0.8 ? 0.45 : 0.5));

export class SlimeBodies {
  constructor(r) {
    this.r = r;
    const { device } = r;
    this.data = new ArrayBuffer(MAX_SLIMES * VERTS * FLOATS * 4);
    this.f = new Float32Array(this.data); this.u = new Uint32Array(this.data);
    this.VB = device.createBuffer({ size: this.data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    const per = [];
    for (let j = 0; j < RINGS; j++) {
      for (let i = 0; i < SIDES; i++) {
        const a = j * SIDES + i, b = j * SIDES + (i + 1) % SIDES;
        per.push(a, b, b + SIDES, a, b + SIDES, a + SIDES);
      }
    }
    for (let i = 0; i < SIDES; i++) per.push(RINGS * SIDES + i, RINGS * SIDES + (i + 1) % SIDES, VERTS - 1);
    this.perIdx = per.length;
    const idx = new Uint32Array(MAX_SLIMES * per.length);
    for (let s = 0; s < MAX_SLIMES; s++) for (let k = 0; k < per.length; k++) idx[s * per.length + k] = per[k] + s * VERTS;
    this.IB = device.createBuffer({ size: idx.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(this.IB, 0, idx);
    this.count = 0;
  }

  update(snap, t, cam) {
    const { f, u } = this;
    let n = 0;
    for (let s = 0; s < MAX_SLIMES; s++) {
      const o = SLIMES_START + s * SLIME_FLOATS;
      if (!snap[o]) continue;
      const x = snap[o + 1], y = snap[o + 2], z = snap[o + 3];
      if (Math.abs(x - cam.x) > 160 || Math.abs(z - cam.z) > 160) continue;
      const R = snap[o + 4], kind = snap[o + 5] | 0, st = snap[o + 6], lx = snap[o + 7], lz = snap[o + 8], flash = snap[o + 9], h = snap[o + 11];
      const H = R * h * st, side = R / Math.sqrt(st), layer = 120 + kind;
      let v = n * VERTS * FLOATS;
      const put = (px, py, pz, nx, ny, nz, core) => {
        f[v] = px; f[v + 1] = py; f[v + 2] = pz; f[v + 3] = nx; f[v + 4] = ny; f[v + 5] = nz; f[v + 6] = core; f[v + 7] = flash; u[v + 8] = layer; v += FLOATS;
      };
      for (let j = 0; j <= RINGS; j++) {
        const yy = j / RINGS * 0.98, pr = j === 0 ? 0.9 : profile(h, yy);
        for (let i = 0; i < SIDES; i++) {
          const a = i / SIDES * TAU, wob = 1 + 0.045 * Math.sin(t * 6.5 + a * 3 + yy * 5 + s) * (0.3 + yy);
          const rr = side * pr * wob, ca = Math.cos(a), sa = Math.sin(a);
          const py = y + yy * H, px = x + ca * rr + lx * yy * H, pz = z + sa * rr + lz * yy * H;
          // (Round-ish normals, from a middle a third of the way up: it's jelly, not a lathe.)
          const ny = (yy - 0.3) * (H / Math.max(side, 0.01)) * 0.9 + 0.15;
          const L = Math.hypot(ca * pr, ny, sa * pr) || 1;
          put(px, py, pz, ca * pr / L, ny / L, sa * pr / L, pr);
        }
      }
      put(x + lx * H, y + H, z + lz * H, 0, 1, 0, 0);
      n++;
    }
    this.count = n;
    if (n) this.r.device.queue.writeBuffer(this.VB, 0, this.data, 0, n * VERTS * FLOATS * 4);
  }

  draw(pass) {
    if (!this.count) return;
    pass.setVertexBuffer(0, this.VB);
    pass.setIndexBuffer(this.IB, 'uint32');
    pass.drawIndexed(this.count * this.perIdx);
  }
}
