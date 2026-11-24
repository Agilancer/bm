// The cliffs' skin round Phobos (src/core/cliff-skin.js): built in a pool thread the first time you come out east, kept while
// you're out there, let go once you're well back west. Drawn with the land's own shader (materials.js TERRAIN, its cliff
// variant: the same paintings and light as the ground it stands out of), before the land, so the land's own face behind it
// is never shaded; and into the far shadow map, as the land is.
import { makeBuffer } from './gpu.js';

const COME = 7300, GO = 6600;   // x: built once you're past COME, let go once you're back past GO

export class CliffSkin {
  constructor(renderer) { this.r = renderer; this.VB = null; this.IB = null; this.count = 0; this.busy = false; }

  update(cam) {
    const r = this.r;
    if (cam.x > COME && cam.y > -6 && !this.VB && !this.busy) {
      const pool = r.landPool || r.pool;
      if (!pool) return;
      this.busy = true;
      pool.run('cliffs', { opening: r.openingEnabled, lean: !!r.tier.lean }).then((res) => {
        if (this.dropped) { this.dropped = false; return; }
        this.VB = makeBuffer(r.device, res.verts, GPUBufferUsage.VERTEX);
        this.IB = makeBuffer(r.device, res.idx, GPUBufferUsage.INDEX);
        this.count = res.idx.length;
        r.shadowEpoch = (r.shadowEpoch || 0) + 1;
      }).catch((e) => console.warn('cliffs', e)).finally(() => { this.busy = false; });
    } else if (cam.x < GO && (this.VB || this.busy)) {
      if (this.busy) { this.dropped = true; return; }
      const old = [this.VB, this.IB];
      this.VB = this.IB = null; this.count = 0;
      setTimeout(() => { for (const b of old) b.destroy(); }, 500);
    }
  }

  // Into a pass with its pipeline (or its shadow's) and the land's bindings set.
  draw(pass) {
    if (!this.count) return;
    pass.setVertexBuffer(0, this.VB);
    pass.setIndexBuffer(this.IB, 'uint32');
    pass.drawIndexed(this.count);
  }
}
