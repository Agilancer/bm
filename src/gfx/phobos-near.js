// Phobos near you. The city's ten thousand houses are in the land's one buffer as plain blocks (src/core/phobos-build.js
// houseFar), a group to each 100 m cell. A cell within NEAR of the eye is built again as it is from near (houseNear:
// hollow, gone into, with windows, lamps, chimneys and a little furniture), one cell a frame, into a buffer of its own;
// its blocks in the land's buffer are folded to a point while that's up, and put back when the eye's gone FAR from it.
// The same trick as a delve's rock, which is built when you go down it (renderer.js useUnder), a cell at a time.
//
// What stops a body is none of this: every house's walls are colliders from the start, the doorway left open.

// Its doors: each shut one's leaf is drawn with its house; opened, that's folded away (hideDoor) and the leaf's swung as a
// thing of its own (src/items/phobos-doors.js).

import { buildPhobosCell, buildSites, unpackCell } from '../core/sites.js';
import { CASTLE_CELLS, CELL, cellOf, phobosHouses, towerCells, wallCells } from '../core/phobos-build.js';
import { cityTowers } from '../core/phobos-towers.js';
import { CITY, CRAG } from '../core/east.js';

const NEAR = 150, FAR = 230, KEEP = 30;   // metres to build a cell at, and to let it go at; how many are kept at most
// (A phone's: nearer, and fewer kept. A cell from near is 150,000 to 380,000 corners, 5 to 14 MB on the GPU, and thirty of
// them were 130 MB more than the land a phone already holds.)
// (Kept: more than are ever wanted at once, which is twelve at its distances, or they'd be built and let go in turn for good.)
const LEAN = { near: 105, far: 165, keep: 14 };

/** Every cell of the city with something in it to build from near. */
export function phobosCells() { return [...new Set([...phobosHouses().map((h) => h.cell), ...CASTLE_CELLS, ...towerCells(), ...wallCells(), ...cityTowers().map((t) => t.cell)])]; }

export class PhobosNear {
  constructor(renderer) {
    this.r = renderer;
    this.cells = new Map();       // cell -> { VB, IB, opaque, cut, x, z }
    // (The cells with houses in, and the crag's: src/core/phobos-build.js castleNear; and the towers', gone into.)
    // (Worked out with the land on its thread, where it was built there: src/core/sites.js adoptSites.)
    this.have = new Set(buildSites().phCells || phobosCells());
    this.count = 0;
    this.doors = new Map();       // door id -> { cell, VB, runs, hidden }
    const lean = !!renderer.tier.lean;
    this.near = lean ? LEAN.near : NEAR; this.far = lean ? LEAN.far : FAR; this.keep = lean ? LEAN.keep : KEEP;
    // Cells are built on a thread of their own (src/core/sites.worker.js), one asked for at a time, and put up when they
    // come back: built here each was a tenth to a fifth of a second's stop on a PC, and you come into the city to twenty
    // of them wanting building. apart: false once that thread's failed, and they're built here as they used to be.
    this.builder = null; this.asked = null; this.ready = []; this.apart = typeof Worker !== 'undefined';
  }

  /** The cell asked of the builder's thread (started the first time, ended when the city's left: clear). */
  ask(key) {
    if (!this.builder) {
      try {
        this.builder = new Worker(new URL('../core/sites.worker.js', import.meta.url), { type: 'module' });
        const fail = (why) => { console.warn('Phobos, built apart:', why); this.apart = false; this.asked = null; try { this.builder?.terminate(); } catch { /* gone */ } this.builder = null; };
        this.builder.onmessage = (e) => { this.asked = null; if (e.data.error) fail(e.data.error); else this.ready.push([e.data.cell, unpackCell(e.data)]); };
        this.builder.onerror = (e) => fail(e.message || 'its thread failed');
      } catch (err) { this.apart = false; return; }
    }
    this.asked = key; this.askedAt = performance.now();
    this.builder.postMessage({ cell: key, opening: !!this.r.openingEnabled, lean: !!this.r.tier.lean });
  }

  // A door's leaf as its house has it, folded away (hide) or put back. (Nothing if its cell isn't up: when it is, it's
  // built as phDoorSwung says.)
  hideDoor(id, hide) {
    const d = this.doors.get(id);
    if (!d || d.hidden === hide) return;
    d.hidden = hide;
    for (const r of d.runs) {
      let data = r.shown;
      if (hide) { data = r.shown.slice(); for (let i = 0; i < data.length; i += 9) { data[i] = r.shown[0]; data[i + 1] = r.shown[1]; data[i + 2] = r.shown[2]; } }
      this.r.device.queue.writeBuffer(d.VB, r.at, data);
    }
    this.r.shadowEpoch = (this.r.shadowEpoch || 0) + 1;
  }

  // Smoke up out of the chimneys of the cells that are up, the nearest few at a time: a wisp each, now and then, drifting
  // off on the wind and thinning. (The renderer's own smoke, src/gfx/renderer.js emit 4.) Not on a phone.
  smoke(dt, cam) {
    const r = this.r;
    if (r.tier.lean || !this.cells.size || (this.smokeT = (this.smokeT || 0) - dt) > 0) return;
    this.smokeT = 0.18;
    let n = 0;
    for (const c of this.cells.values()) {
      if (!c.smokes?.length || Math.hypot(c.x - cam.x, c.z - cam.z) > 160) continue;
      for (let k = 0; k < c.smokes.length && n < 14; k += 1 + ((Math.random() * 3) | 0)) {
        const [x, y, z] = c.smokes[k];
        r.emit(4, 1, x, y, z, 0.35, 1, 0.15, 0.25, 0.6, 1.1, 0.5, 1.6, 4, 7);
        n++;
      }
    }
  }

  // Each frame: the nearest cell that wants building is built (one a frame: a few milliseconds), and any gone far is let go.
  update(cam) {
    const r = this.r;
    const NEAR = this.near, FAR = this.far, KEEP = this.keep;
    this.cam = cam;
    if (!r.landScenery || cam.x < CITY.x - CITY.a - FAR || cam.x > CRAG.x + CRAG.a + FAR || Math.abs(cam.z - CITY.z) > CITY.b + FAR) { this.waiting = false; if (this.cells.size || this.builder) this.clear(); return; }
    let want = null, best = NEAR;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const x = cam.x + i * CELL, z = cam.z + j * CELL, key = cellOf(x, z);
      if (!this.have.has(key) || this.cells.has(key)) continue;
      const [ci, cj] = key.split('_').map(Number), cx = 9300 + (ci + 0.5) * CELL, cz = -850 + (cj + 0.5) * CELL;
      const d = Math.max(0, Math.hypot(cx - cam.x, cz - cam.z) - CELL * 0.7);
      if (d < best) { best = d; want = [key, cx, cz]; }
    }
    // (A cell near still to come: renderer.landReady waits on it.)
    this.waiting = !!want || !!this.asked;
    let changed = false, built = null;
    if (this.apart) {
      // (What's come back is put up, if it's still wanted: you may have gone on past it. Then the nearest wanting is asked for.)
      // (A thread that's said nothing of a cell for ten seconds isn't going to: ended, and the next one asked starts another.)
      // (Half a minute: its first cell waits on the thread reading the city in, which is seconds on a phone. And the second
      // time it happens the cells are built here from then on, as they used to be: slow, but there.)
      if (this.asked && performance.now() - this.askedAt > 30000) {
        try { this.builder?.terminate(); } catch { /* gone */ }
        this.builder = null; this.asked = null;
        if ((this.quiet = (this.quiet || 0) + 1) >= 2) this.apart = false;
      }
      const got = this.ready.shift();
      if (want && !this.asked && !(got && got[0] === want[0])) this.ask(want[0]);
      want = null;
      if (got && !this.cells.has(got[0])) {
        const [ci, cj] = got[0].split('_').map(Number), cx = 9300 + (ci + 0.5) * CELL, cz = -850 + (cj + 0.5) * CELL;
        if (Math.hypot(cx - cam.x, cz - cam.z) - CELL * 0.7 < FAR) { want = [got[0], cx, cz]; built = got[1]; }
      }
    }
    if (want && this.apart === false) built = buildPhobosCell(want[0], !!r.tier.lean);
    if (want && built) {
      const set = r.packParts(built.parts, built.groups);
      for (const [k, runs] of set.slices) {
        const id = Number(k.slice(5));
        this.doors.set(id, { cell: want[0], VB: set.VB, runs, hidden: false });
        if (r.phDoorSwung?.(id)) this.hideDoor(id, true);
      }
      // (Its hearths, door lamps and street lanterns light what's round them, as the land's own lamps do, while it's up.)
      for (const l of built.lamps) { l.phobos = want[0]; r.lights.push(l); }
      if (built.lamps.length) r.litOrder = null;   // (the renderer's own list of them by nearness is made again)
      this.cells.set(want[0], { ...set, x: want[1], z: want[2], lamps: built.lamps.length, smokes: built.smokes });
      r.foldLand('ph:' + want[0], true);
      changed = true;
    }
    // (Let go: whatever's gone far; and, over the number kept, the furthest first, and never one near enough to be wanted
    // again at once.)
    const dist = (c) => Math.hypot(c.x - cam.x, c.z - cam.z) - CELL * 0.7;
    for (const [key, c] of [...this.cells]) if (dist(c) >= FAR && !(want && key === want[0])) { this.drop(key, c); changed = true; }
    while (this.cells.size > KEEP) {
      let far = null, fd = NEAR;
      for (const [key, c] of this.cells) { const d = dist(c); if (d > fd && !(want && key === want[0])) { fd = d; far = [key, c]; } }
      if (!far) break;
      this.drop(far[0], far[1]); changed = true;
    }
    if (changed) r.shadowEpoch = (r.shadowEpoch || 0) + 1;
    this.count = this.cells.size;
  }

  drop(key, c) {
    this.cells.delete(key);
    for (const [id, d] of this.doors) if (d.cell === key) this.doors.delete(id);
    this.r.foldLand('ph:' + key, false);
    if (c.lamps) { const L = this.r.lights; let n = 0; for (let i = 0; i < L.length; i++) if (L[i].phobos !== key) L[n++] = L[i]; L.length = n; this.r.litOrder = null; }
    // (Gone once this frame's work that drew it is done.)
    setTimeout(() => { c.VB.destroy(); c.IB.destroy(); }, 500);
  }

  clear() {
    for (const [key, c] of [...this.cells]) this.drop(key, c);
    this.r.shadowEpoch = (this.r.shadowEpoch || 0) + 1;
    // (And the builder's thread with the city: its copy of Phobos is tens of megabytes.)
    try { this.builder?.terminate(); } catch { /* gone */ }
    this.builder = null; this.asked = null; this.ready.length = 0; this.count = 0;
  }

  // Into a pass with the static pipeline (or a shadow's) already set: every cell that's up. cut: the cutout pipeline's
  // turn (nothing of a cell's is a cutout yet).
  // view: the eye's own pass, where a cell wholly behind you is left out (by its place on the ground only: a cell's towers
  // stand hundreds of metres, so nothing's said of its height, and nothing's left out while you look steeply up or down).
  draw(pass, view) {
    const cam = view && this.cam, fl = cam ? Math.hypot(cam.fx, cam.fz) : 0, cull = fl > 0.72;
    for (const c of this.cells.values()) {
      if (!c.opaque) continue;
      if (cull && ((c.x - cam.x) * cam.fx + (c.z - cam.z) * cam.fz) / fl < -CELL * 0.75) continue;
      pass.setVertexBuffer(0, c.VB);
      pass.setIndexBuffer(c.IB, 'uint32');
      pass.drawIndexed(c.opaque);
    }
  }
}
