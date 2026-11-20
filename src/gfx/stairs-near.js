// The ways' flights of steps near you (src/core/stairs.js): there are tens of kilometres of them over the land, far more than
// the land's one buffer has room for, so each 64 m square of them is built when the eye comes within NEAR of it, one square a
// frame, into a buffer of its own, and let go once the eye's FAR from it. Drawn with the static pipeline, and into the
// shadows, as Phobos's near houses are (src/gfx/phobos-near.js). Nothing here stops a body: the steps are walked on their
// slope (src/core/roadbed.js), whose ground is drawn sunk under them (stairDip).
import { Kit } from '../core/sites.js';
import { STAIR_CELL, buildStairCell, stairCellCentre, stairCells } from '../core/stairs.js';

export class StairsNear {
  constructor(renderer) {
    this.r = renderer;
    this.cells = new Map();   // key -> { VB, IB, opaque, x, z }
    this.lean = !!renderer.tier.lean;
    this.NEAR = this.lean ? 110 : 190; this.FAR = this.NEAR + 70;
    this.count = 0;
  }

  update(cam) {
    const r = this.r;
    if (!r.landScenery || cam.y < -6) { if (this.cells.size) this.clear(); return; }
    const all = stairCells(), R = Math.ceil(this.NEAR / STAIR_CELL) + 1, ci = Math.floor(cam.x / STAIR_CELL), cj = Math.floor(cam.z / STAIR_CELL);
    let want = null, best = this.NEAR;
    for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) {
      const key = `${i}_${j}`;
      if (!all.has(key) || this.cells.has(key)) continue;
      const [x, z] = stairCellCentre(key), d = Math.max(0, Math.hypot(x - cam.x, z - cam.z) - STAIR_CELL * 0.7);
      if (d < best) { best = d; want = [key, x, z]; }
    }
    let changed = false;
    if (want) {
      const K = new Kit(true);
      buildStairCell(K, want[0], this.lean);
      K.finish();
      const set = r.packParts(K.parts);
      this.cells.set(want[0], { ...set, x: want[1], z: want[2] });
      changed = true;
    }
    for (const [key, c] of this.cells) {
      if (Math.hypot(c.x - cam.x, c.z - cam.z) - STAIR_CELL * 0.7 < this.FAR) continue;
      this.drop(key, c); changed = true;
    }
    if (changed) r.shadowEpoch = (r.shadowEpoch || 0) + 1;
    this.count = this.cells.size;
  }

  drop(key, c) {
    this.cells.delete(key);
    // (Gone once this frame's work that drew it is done.)
    setTimeout(() => { c.VB.destroy(); c.IB.destroy(); }, 500);
  }

  clear() { for (const [key, c] of [...this.cells]) this.drop(key, c); this.count = 0; this.r.shadowEpoch = (this.r.shadowEpoch || 0) + 1; }

  // Into a pass with the static pipeline (or a shadow's) already set: every square that's up.
  draw(pass) {
    for (const c of this.cells.values()) {
      if (!c.opaque) continue;
      pass.setVertexBuffer(0, c.VB);
      pass.setIndexBuffer(c.IB, 'uint32');
      pass.drawIndexed(c.opaque);
    }
  }
}
