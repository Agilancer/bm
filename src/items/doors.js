// The doors about the world, shut until you open them, and shut again when you say. Like the chests these are the render thread's: it swings them, and tells the sim
// which are open as a mask in the input block, so the sim's collision has a shut door in the doorway and an open one against the wall (World.setDoors).
// Which are open goes in a save. A door's leaves share its id: the cathedral's two open as one.
const SWING = 0.75;                 // seconds to open or shut; the great doors take longer
const NEAR = 24;                    // the relief is modelled this near, and left to the picture further off
const FACING = 0.3;

export class Doors {
  constructor(renderer, audio, things, input) {
    this.audio = audio;
    this.input = input;
    this.leaves = things.filter((t) => t.type === 'door').map((t) => ({ ...t, k: 0, item: { piece: t.piece, door: true, mat: new Float32Array(16) } }));
    this.leaves.forEach((l) => this.pose(l));
    this.doors = [];
    for (const l of this.leaves) {
      let d = this.doors.find((o) => o.id === l.id);
      if (!d) { d = { id: l.id, leaves: [], open: false, cx: l.cx, cz: l.cz, y: l.y, reach: l.reach, far: l.far, lock: l.lock || null }; this.doors.push(d); }
      d.leaves.push(l);
    }
    // What fills the corners over a house's arched door stays put.
    this.heads = things.filter((t) => t.type === 'door' && t.head).map((t) => {
      const s = Math.sin(t.yaw), c = Math.cos(t.yaw);
      return { x: t.head[0], y: t.y, z: t.head[1], item: { piece: 'door_head', door: true, mat: new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, t.head[0], t.y, t.head[1], 1]) } };
    });
    this.near = [];
    renderer.doorItems = this.near;
    this.mask();
  }

  pose(l) {
    const k = l.k * l.k * (3 - 2 * l.k), a = l.yaw + l.open * k, s = Math.sin(a), c = Math.cos(a);
    l.item.mat.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, l.x, l.y, l.z, 1]);
  }

  mask() {
    let m = 0;
    for (const d of this.doors) if (d.open) m += 2 ** d.id;
    this.input.value = m;
  }

  // Swings them and says what's near. Returns the door you're facing, within reach, or null.
  update(dt, px, py, pz, yaw) {
    this.near.length = 0;
    let best = null, bestD = 1e9;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const d of this.doors) {
      const swing = SWING * (d.reach > 3 ? 2 : 1), to = d.open ? 1 : 0;
      for (const l of d.leaves) {
        if (l.k !== to) {
          l.k = to > l.k ? Math.min(1, l.k + dt / swing) : Math.max(0, l.k - dt / swing);
          this.pose(l);
        }
      }
      const dx = d.cx - px, dz = d.cz - pz, dist = Math.hypot(dx, dz), dy = Math.abs(d.y - py);
      if (d.shutting && (dist > 1.6 || dy > 2.5)) { d.shutting = false; d.folk = false; this.toggle(d, true); }
      if (dy > 14 || dist > d.far) continue;
      const lod = dist > NEAR;
      for (const l of d.leaves) {
        l.item.piece = lod ? `${l.piece}_far` : l.piece;
        this.near.push(l.item);
      }
      if (dist < d.reach && dist < bestD && dy < 2.2 && (dx * fx + dz * fz) / (dist || 1) > FACING) { bestD = dist; best = d; }
    }
    for (const h of this.heads) if (Math.hypot(h.x - px, h.z - pz) < 110 && Math.abs(h.y - py) < 14) this.near.push(h.item);
    return best;
  }

  // The townsfolk come and go (src/folk/client.js): a door one of them opened they shut behind them, once you're out of
  // the way of it, unless you've had your hand on it since.
  byFolk(id, open) {
    const d = this.doors.find((o) => o.id === id);
    if (!d) return;
    if (open) { if (!d.open) { this.toggle(d, true); d.folk = true; } d.shutting = false; } else if (d.folk && d.open) d.shutting = true;
  }

  toggle(d, folk = false) {
    if (!folk) { d.folk = false; d.shutting = false; }
    d.open = !d.open;
    this.mask();
    const big = d.reach > 3 ? 0.7 : 1;
    this.audio.play('draw', d.cx, d.y + 1.2, d.cz, 0.3, (d.open ? 0.42 : 0.36) * big);
    if (!d.open) this.audio.play('land', d.cx, d.y + 1, d.cz, 0.4, 0.5 * big);
  }

  // What goes in a save: which are open, by id.
  save() { return this.doors.flatMap((d) => (d.open ? [d.id] : [])); }

  // (Null: all of them shut.)
  load(saved) {
    const open = new Set(Array.isArray(saved) ? saved : []);
    for (const d of this.doors) {
      d.open = open.has(d.id);
      for (const l of d.leaves) { l.k = d.open ? 1 : 0; this.pose(l); }
    }
    this.mask();
  }
}
