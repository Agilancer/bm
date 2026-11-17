// City State Phobos's doors: every house's and every tower's (src/core/phobos-build.js houseDoor, src/core/phobos-towers.js
// towerDoor), ten thousand of them, shut till you open them, E, and shut again when you say. The render thread's, as
// Bellmourn's are (src/items/doors.js): it swings them and tells the sim which stand open (src/sim/world.js
// setPhobosDoor), so a shut one stops you in its doorway. Which are open goes in a save.
//
// A shut door is drawn with its house, from near (src/gfx/phobos-near.js). Opened, that one's folded away and the door's
// leaf is drawn as a thing of its own, swung on its hinge; shut again, it's put back.

import { cityDoors } from '../core/phobos-towers.js';
import { DOOR, LEAF, leafU0 } from '../core/phobos-build.js';

const SWING = 0.75;          // seconds to open or shut
const OPEN = 1.62;           // how far it swings in, open: a little past square, clear of the doorway (the critics: at
                             // 1.45 a tower's iron door stood a third across it, seen down the deep reveal)
const REACH = 2.2, FACING = 0.3;
const SEEN = 70, MOST = 40;  // drawn swung this near, this many at most
const GRID = 32;
const key = (x, z) => `${Math.floor(x / GRID)}_${Math.floor(z / GRID)}`;

// The leaf as a thing of its own: from its hinge (0, 0, 0) along x to its far edge, up y, its two faces painted (the same
// way round as the near view's, so it doesn't change when it starts to swing), its edges the painting's dark frame.
export function leafMesh(kind) {
  const { L, H, T } = LEAF, pos = [], nrm = [], uv = [], idx = [], u0 = leafU0(kind);
  const face = (P, n, uvs) => { const b = pos.length / 3; for (let i = 0; i < 4; i++) { pos.push(...P[i]); nrm.push(...n); uv.push(...uvs[i]); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  const Q = [[u0, 0], [1, 0], [1, 1], [u0, 1]], E = [[u0 + 0.02, 0.5], [u0 + 0.02, 0.5], [u0 + 0.02, 0.5], [u0 + 0.02, 0.5]];
  face([[0, H, 0.04], [L, H, 0.04], [L, 0, 0.04], [0, 0, 0.04]], [0, 0, 1], Q);
  face([[L, H, -0.04], [0, H, -0.04], [0, 0, -0.04], [L, 0, -0.04]], [0, 0, -1], Q);
  face([[0, 0, -T], [0, 0, T], [0, H, T], [0, H, -T]], [-1, 0, 0], E);
  face([[L, 0, T], [L, 0, -T], [L, H, -T], [L, H, T]], [1, 0, 0], E);
  face([[0, H, T], [L, H, T], [L, H, -T], [0, H, -T]], [0, 1, 0], E);
  face([[0, 0, -T], [L, 0, -T], [L, 0, T], [0, 0, T]], [0, -1, 0], E);
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx: new Uint32Array(idx) };
}

export class PhobosDoors {
  // post: a message to the sim.
  constructor(renderer, audio, post) {
    this.r = renderer; this.audio = audio; this.post = post;
    this.doors = cityDoors();
    this.byId = new Map();
    this.grid = new Map();
    for (const d of this.doors) {
      // (Where it's reached at: its doorway's middle, the sill's height.)
      const c = Math.cos(d.yaw), s = Math.sin(d.yaw), lz = d.f * (d.iz + d.hz) / 2;
      d.cx = d.x + lz * s; d.cz = d.z + lz * c;
      this.byId.set(d.id, d);
      const k = key(d.cx, d.cz);
      (this.grid.get(k) || this.grid.set(k, []).get(k)).push(d);
    }
    this.open = new Set();
    this.swing = new Map();       // id -> how far open it's drawn, 0 to 1, while it's open or on its way
    this.items = new Map();       // id -> { mesh, mat }
    // (The near view asks, building a cell, whether a door's leaf is to be folded away: it is while it's swung.)
    renderer.phDoorSwung = (id) => this.swing.has(id);
  }

  // Swings them, draws those swung, and says what's near. Returns the door you're facing, within reach, or null.
  update(dt, px, py, pz, yaw) {
    for (const [id, k0] of this.swing) {
      const to = this.open.has(id) ? 1 : 0;
      const k = to > k0 ? Math.min(1, k0 + dt / SWING) : Math.max(0, k0 - dt / SWING);
      if (k === 0 && !to) { this.swing.delete(id); this.items.delete(id); this.r.phobosNear?.hideDoor(id, false); continue; }
      this.swing.set(id, k);
    }
    let n = 0;
    for (const [id, k] of this.swing) {
      const d = this.byId.get(id);
      if (n >= MOST || Math.hypot(d.cx - px, d.cz - pz) > SEEN) continue;
      const mesh = this.r.phLeaf(d.kind, leafMesh);
      if (!mesh) continue;
      const it = this.items.get(id) || this.items.set(id, { mesh, mat: new Float32Array(16) }).get(id);
      it.mesh = mesh;
      this.pose(d, k, it.mat);
      this.r.doorItems.push(it);
      n++;
    }
    let best = null, bestD = 1e9;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), gi = Math.floor(px / GRID), gj = Math.floor(pz / GRID);
    for (let i = gi - 1; i <= gi + 1; i++) for (let j = gj - 1; j <= gj + 1; j++) {
      for (const d of this.grid.get(`${i}_${j}`) || []) {
        const dx = d.cx - px, dz = d.cz - pz, dist = Math.hypot(dx, dz);
        if (dist < REACH && dist < bestD && Math.abs(d.fy - py) < 2.2 && (dx * fx + dz * fz) / (dist || 1) > FACING) { bestD = dist; best = d; }
      }
    }
    // (The same one each frame while it's the one: the prompt's only written again when that changes.)
    if (!best) return null;
    best.hand ||= { ph: true, id: best.id };
    best.hand.open = this.open.has(best.id);
    return best.hand;
  }

  // Hung on its right-hand post (the near view's leaf, src/core/phobos-build.js doorLeaf), swung in by k.
  pose(d, k, mat) {
    const th = OPEN * k * k * (3 - 2 * k), c = Math.cos(d.yaw), s = Math.sin(d.yaw);
    const hx0 = DOOR - 0.04, hz0 = d.f * (d.iz - 0.02), lx = -Math.cos(th), lz = -d.f * Math.sin(th);
    const hx = d.x + hx0 * c + hz0 * s, hz = d.z - hx0 * s + hz0 * c, wx = lx * c + lz * s, wz = -lx * s + lz * c;
    // (Its x along the leaf, out from the hinge; its z the face the near view paints first, which is that turned a
    // quarter: a turn about the upright, as doorLeaf's box is.)
    mat.set([wx, 0, wz, 0, 0, 1, 0, 0, -wz, 0, wx, 0, hx, d.fy, hz, 1]);
  }

  toggle(near) {
    const d = this.byId.get(near.id);
    if (!d) return;
    const open = !this.open.has(d.id);
    if (open) this.open.add(d.id); else this.open.delete(d.id);
    if (open && !this.swing.has(d.id)) { this.swing.set(d.id, 0); this.r.phobosNear?.hideDoor(d.id, true); }
    this.audio.play(open ? 'doorOpen' : 'doorClose', d.cx, d.fy + 1.2, d.cz, 0.9);
    this.post({ type: 'phDoor', id: d.id, open });
  }

  // What goes in a save: which are open, by number.
  save() { return [...this.open]; }

  // (Null: all of them shut.)
  load(saved) {
    for (const id of this.swing.keys()) this.r.phobosNear?.hideDoor(id, false);
    this.open = new Set(Array.isArray(saved) ? saved.filter((id) => this.byId.has(id)) : []);
    this.swing = new Map([...this.open].map((id) => [id, 1]));
    this.items.clear();
    for (const id of this.open) this.r.phobosNear?.hideDoor(id, true);
    this.post({ type: 'phDoors', open: [...this.open] });
  }
}
