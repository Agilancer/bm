// Phobos near you. The city's ten thousand houses are in the land's one buffer as plain blocks (src/core/phobos-build.js
// houseFar), a group to each 100 m cell. A cell within NEAR of the eye is built again as it is from near (houseNear:
// hollow, gone into, with windows, lamps, chimneys and a little furniture), one cell a frame, into a buffer of its own;
// its blocks in the land's buffer are folded to a point while that's up, and put back when the eye's gone FAR from it.
// The same trick as a delve's rock, which is built when you go down it (renderer.js useUnder), a cell at a time.
//
// What stops a body is none of this: every house's walls are colliders from the start, the doorway left open.

import { buildPhobosCell } from '../core/sites.js';
import { CELL, cellOf, phobosHouses } from '../core/phobos-build.js';
import { CITY } from '../core/east.js';

const NEAR = 150, FAR = 230, KEEP = 30;   // metres to build a cell at, and to let it go at; how many are kept at most

export class PhobosNear {
  constructor(renderer) {
    this.r = renderer;
    this.cells = new Map();       // cell -> { VB, IB, opaque, cut, x, z }
    this.have = new Set(phobosHouses().map((h) => h.cell));
    this.count = 0;
  }

  // Each frame: the nearest cell that wants building is built (one a frame: a few milliseconds), and any gone far is let go.
  update(cam) {
    const r = this.r;
    if (!r.landScenery || Math.abs(cam.x - CITY.x) > CITY.a + FAR || Math.abs(cam.z - CITY.z) > CITY.b + FAR) { if (this.cells.size) this.clear(); return; }
    let want = null, best = NEAR;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const x = cam.x + i * CELL, z = cam.z + j * CELL, key = cellOf(x, z);
      if (!this.have.has(key) || this.cells.has(key)) continue;
      const [ci, cj] = key.split('_').map(Number), cx = 9300 + (ci + 0.5) * CELL, cz = -850 + (cj + 0.5) * CELL;
      const d = Math.max(0, Math.hypot(cx - cam.x, cz - cam.z) - CELL * 0.7);
      if (d < best) { best = d; want = [key, cx, cz]; }
    }
    let changed = false;
    if (want) {
      const built = buildPhobosCell(want[0]), set = r.packParts(built.parts);
      // (Its hearths, door lamps and street lanterns light what's round them, as the land's own lamps do, while it's up.)
      for (const l of built.lamps) { l.phobos = want[0]; r.lights.push(l); }
      if (built.lamps.length) r.litOrder = null;   // (the renderer's own list of them by nearness is made again)
      this.cells.set(want[0], { ...set, x: want[1], z: want[2], lamps: built.lamps.length });
      r.foldLand('ph:' + want[0], true);
      changed = true;
    }
    for (const [key, c] of this.cells) {
      if (Math.hypot(c.x - cam.x, c.z - cam.z) - CELL * 0.7 < FAR && this.cells.size <= KEEP) continue;
      if (want && key === want[0]) continue;
      this.drop(key, c); changed = true;
      if (this.cells.size <= KEEP) break;
    }
    if (changed) r.shadowEpoch = (r.shadowEpoch || 0) + 1;
    this.count = this.cells.size;
  }

  drop(key, c) {
    this.cells.delete(key);
    this.r.foldLand('ph:' + key, false);
    if (c.lamps) { const L = this.r.lights; let n = 0; for (let i = 0; i < L.length; i++) if (L[i].phobos !== key) L[n++] = L[i]; L.length = n; this.r.litOrder = null; }
    // (Gone once this frame's work that drew it is done.)
    setTimeout(() => { c.VB.destroy(); c.IB.destroy(); }, 500);
  }

  clear() { for (const [key, c] of [...this.cells]) this.drop(key, c); this.r.shadowEpoch = (this.r.shadowEpoch || 0) + 1; }

  // Into a pass with the static pipeline (or a shadow's) already set: every cell that's up. cut: the cutout pipeline's
  // turn (nothing of a cell's is a cutout yet).
  draw(pass) {
    for (const c of this.cells.values()) {
      if (!c.opaque) continue;
      pass.setVertexBuffer(0, c.VB);
      pass.setIndexBuffer(c.IB, 'uint32');
      pass.drawIndexed(c.opaque);
    }
  }
}
