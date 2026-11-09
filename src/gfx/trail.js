// The quest trail as drawn: a line of soft gold dots lying on the ground, added over the world in the glow pass
// (src/gfx/interior.js GLOW, its round blob). Where they go is src/ui/trail.js's.
import { makeBuffer } from './gpu.js';

const MAX = 80;
const GOLD = [1.0, 0.72, 0.1];

export class TrailFX {
  constructor(r) {
    this.r = r;
    this.data = new Float32Array(MAX * 6 * 9);
    this.vb = makeBuffer(r.device, this.data, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    this.n = 0;
  }

  // dots: x, y, z, radius, brightness for each, n of them.
  set(dots, n) {
    n = Math.min(n, MAX);
    const g = this.data, uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    let o = 0;
    for (let i = 0; i < n; i++) {
      const x = dots[i * 5], y = dots[i * 5 + 1], z = dots[i * 5 + 2], s = dots[i * 5 + 3], k = dots[i * 5 + 4];
      const P = [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]];
      for (const c of [0, 1, 2, 0, 2, 3]) {
        g[o++] = P[c][0]; g[o++] = y; g[o++] = P[c][1]; g[o++] = uv[c][0]; g[o++] = uv[c][1];
        g[o++] = GOLD[0] * k; g[o++] = GOLD[1] * k; g[o++] = GOLD[2] * k; g[o++] = 101;
      }
    }
    this.n = n;
    if (n) this.r.device.queue.writeBuffer(this.vb, 0, this.data, 0, n * 6 * 9);
  }

  draw(pass) {
    if (!this.n || !this.r.interior) return;
    pass.setPipeline(this.r.pGlow);
    pass.setBindGroup(1, this.r.interior.atlas.bg);
    pass.setVertexBuffer(0, this.vb);
    pass.draw(this.n * 6);
  }
}
