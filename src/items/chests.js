// The chests about the world, shut until you open them. Like what's lying on the ground, these are the render thread's: the sim only
// knows a box to walk round. Which are open goes in a save; they stay open through a new fight, and only New Game shuts them again.
import { groundAt } from '../core/interior.js';
import { makeRng, rollChest } from './items.js';

// Out in the woods, for finding: further out, better. (After the house and crypt chests, so a save's list still lines up.)
function woodsChests() {
  const out = [];
  for (let i = 0; out.length < 16 && i < 40; i++) {
    const a = i * 2.399963, r = 88 + i * 7.5, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if ((x > 30 && Math.abs(z) < 50) || Math.hypot(x + 3.5, z - 72) < 30) continue;
    out.push({ type: 'chest', x, z, y: groundAt(x, z), yaw: a, loot: r > 170 ? 1 : 0 });
  }
  return out;
}

const REACH = 2.2, FACING = 0.3;
const SEEN = 30;                       // drawn from this near
const OPENING = 0.8, OPEN_DEG = 72;    // (the same opening as tools/chest/separate.py keys)
const SPILL_AT = 0.35;                 // how far up the lid is when what's in it comes out
const HINGE_Y = 0.399, HINGE_Z = -0.276;

export class Chests {
  constructor(renderer, audio, drops, things) {
    this.renderer = renderer;
    this.audio = audio;
    this.drops = drops;
    this.rng = makeRng((Math.random() * 4294967296) >>> 0);
    this.list = things.filter((t) => t.type === 'chest').concat(woodsChests()).map((t) => {
      const s = Math.sin(t.yaw), c = Math.cos(t.yaw);
      const body = new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, t.x, t.y, t.z, 1]);
      const ch = { ...t, s, c, open: false, spilled: false, k: 0, lidK: -1, body: { piece: 'body', mat: body }, lid: { piece: 'lid', mat: new Float32Array(16) } };
      this.pose(ch);
      return ch;
    });
    this.near = [];
    renderer.chests = this.near;
  }

  // The lid, about its hinge at the back of the box.
  pose(ch) {
    const k = ch.k * ch.k * (3 - 2 * ch.k), a = -k * OPEN_DEG * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const { s, c, x, y, z } = ch;
    ch.lid.mat.set([c, 0, -s, 0, s * sa, ca, c * sa, 0, s * ca, -sa, c * ca, 0, x + s * HINGE_Z, y + HINGE_Y, z + c * HINGE_Z, 1]);
    ch.lidK = ch.k;
  }

  // Moves the lids and says what's near. Returns the shut chest you're facing, within reach, or null.
  update(dt, px, py, pz, yaw) {
    this.near.length = 0;
    let best = null, bestD = REACH;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (const ch of this.list) {
      if (ch.open && ch.k < 1) {
        ch.k = Math.min(1, ch.k + dt / OPENING);
        if (!ch.spilled && ch.k >= SPILL_AT) this.spill(ch);
        this.pose(ch);
      }
      const dx = ch.x - px, dz = ch.z - pz, d = Math.hypot(dx, dz), dy = Math.abs(ch.y - py);
      if (d > SEEN || dy > 12) continue;
      this.near.push(ch.body, ch.lid);
      if (!ch.open && d < bestD && dy < 2 && (dx * fx + dz * fz) / (d || 1) > FACING) { bestD = d; best = ch; }
    }
    return best;
  }

  open(ch) {
    if (ch.open) return;
    ch.open = true;
    this.audio.play('land', ch.x, ch.y, ch.z, 0.5, 0.55);
    this.audio.play('draw', ch.x, ch.y, ch.z, 0.35, 0.5);
  }

  // Out over the front, a pace or so.
  spill(ch) {
    ch.spilled = true;
    for (const item of rollChest(this.rng, ch.loot | 0)) {
      const a = ch.yaw + (Math.random() - 0.5) * 1.3, r = 0.85 + Math.random() * 0.55;
      this.drops.spawn(item, ch.x + Math.sin(a) * r, ch.z + Math.cos(a) * r, [ch.x, ch.y + 0.65, ch.z]);
    }
  }

  // What goes in a save: which are open, by their place in the list.
  save() { return this.list.flatMap((ch, i) => (ch.open ? [i] : [])); }

  // (They come back open, and what was in them has been had. Null: all of them shut.)
  load(d) {
    const open = new Set(Array.isArray(d) ? d : []);
    this.list.forEach((ch, i) => {
      ch.open = ch.spilled = open.has(i);
      ch.k = ch.open ? 1 : 0;
      this.pose(ch);
    });
  }
}
