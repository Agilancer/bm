// The town as the main thread has it: its worker (src/folk/folk.worker.js) started and fed (the hour, where the player
// and the eye are, what's hunting near town), and what it says back handed on (speech to the balloons, doors to the doors).
import { C, C_SIZE, CHARS_START, H } from '../core/layout.js';
import { inTown } from '../core/town.js';
import { FCTRL, FIN, FOLK_BYTES, mapFolk } from './layout.js';

export class TownClient {
  constructor(base, isolated) {
    this.shared = isolated;
    this.buffer = isolated ? new SharedArrayBuffer(FOLK_BYTES) : null;
    this.map = mapFolk(this.buffer || new ArrayBuffer(FOLK_BYTES));
    this.map.inbox[FIN.HOUR] = -1;
    this.map.inbox[FIN.PAUSED] = 1;
    this.day = 0; this.lastHour = -1;
    this.cast = 0;
    this.ready = false;
    this.listeners = [];
    this.routes = new Map();
    this.worker = new Worker(new URL('./folk.worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => this.message(e.data);
    this.worker.onerror = (e) => console.error('town worker', e.message);
    this.worker.postMessage({ type: 'boot', buffer: this.buffer, base });
  }

  on(fn) { this.listeners.push(fn); }

  message(m) {
    if (m.type === 'ready') {
      this.ready = true; this.count = m.count; this.beds = m.beds; this.houses = m.houses;
      // (What the town was told before it was listening.)
      if (this.flags) this.setFlags(this.flags);
      if (this.name) this.setName(this.name);
      if (this.onReady) this.onReady(m);
      return;
    }
    if (m.type === 'error') { console.error('town:', m.message); return; }
    if (m.type === 'route') { this.routes.get(m.id)?.(m.pts); this.routes.delete(m.id); return; }
    if (m.type === 'events') { for (const e of m.list) for (const fn of this.listeners) fn(e); return; }
    if (m.type === 'slot') {
      // (No shared memory: the worker posts each slot whole, and it's kept as slot 0.)
      this.map.slots[0].set(m.slot);
      this.map.bodies.set(m.bodies);
      Atomics.store(this.map.ctrl, FCTRL.LATEST, 0);
      Atomics.add(this.map.ctrl, FCTRL.TICK, 1);
    }
  }

  // Every frame: the hour (and a new day when it turns midnight), where the player and the eye are, danger.
  frame(snap, cam, hour, paused) {
    if (this.lastHour >= 0 && hour < this.lastHour - 12) this.day++;
    this.lastHour = hour;
    const inb = this.map.inbox;
    inb[FIN.HOUR] = hour; inb[FIN.DAY] = this.day;
    inb[FIN.PX] = snap[H.PX]; inb[FIN.PY] = snap[H.PY]; inb[FIN.PZ] = snap[H.PZ];
    inb[FIN.CAMX] = cam.x; inb[FIN.CAMY] = cam.y; inb[FIN.CAMZ] = cam.z;
    inb[FIN.PAUSED] = paused ? 1 : 0;
    inb[FIN.CAST] = this.cast;
    // Anything hostile and alive in reach of town, which the town runs indoors from.
    let n = 0;
    const count = snap[H.NCHARS] | 0;
    for (let i = 0; i < count && n < 8; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || snap[o + C.HOSTILE] < 0.5 || snap[o + C.HP] <= 0) continue;
      const x = snap[o + C.X], z = snap[o + C.Z];
      if (!inTown(x, z, 18)) continue;
      inb[FIN.DANGER + n * 2] = x; inb[FIN.DANGER + n * 2 + 1] = z; n++;
    }
    inb[FIN.DANGER_N] = n;
    if (!this.shared) this.worker.postMessage({ type: 'inbox', inbox: inb.slice() });
  }

  talkTo(i) { this.worker.postMessage({ type: 'talk', i }); }
  // A way on foot across the town from (ax, az) to (bx, bz), round the houses: a list of [x, z], or null.
  route(ax, az, bx, bz) {
    if (!this.ready) return Promise.resolve(null);
    const id = this.routeN = (this.routeN || 0) + 1;
    return new Promise((resolve) => { this.routes.set(id, resolve); this.worker.postMessage({ type: 'route', id, ax, az, bx, bz }); });
  }
  setFlags(flags) { this.flags = new Set(flags); this.worker.postMessage({ type: 'flags', flags: [...flags] }); }
  setName(name) { this.name = name; this.worker.postMessage({ type: 'name', name }); }

  save() { return { day: this.day }; }
  load(d) { this.day = d?.day | 0; this.lastHour = -1; }
}
