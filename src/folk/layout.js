// The townsfolk's shared memory: written by src/folk/folk.worker.js, read by the renderer (src/gfx/folk.js), the town's UI
// (src/ui/folk.js) and the sim (the player bumps into them). Their own buffer, apart from the fight's snapshot, so the town
// can live at its own pace and the fight never waits on it.
//
// [ctrl: Int32 x 8][inbox: f32 x 64][bodies: f32 x FOLK_MAX * 4][3 slots: f32 x SLOT_FLOATS]
// A slot is a header and then a block per person: where they are, which way they face, where their head is, and their pose
// as a skinning palette. The writer fills a slot nobody is reading and then publishes it as LATEST; a reader marks the one
// it's on as READING (the same handshake as the fight's snapshot, src/core/layout.js).

export const FOLK_MAX = 48;
// Palette joints a person can have: their own (55 at most in the owner's models) and the four the skirt borrows.
export const FOLK_JOINTS = 72;

// PACE_US, PACE_SEQ: the time the render thread's frames have asked the town for (microseconds, a running count that wraps), and a
// count of the asks to wake on (TownClient.pace, and the loop in folk.worker.js). COST_US, FRAMES: what the town's frames have cost
// since the render thread last took the totals, for the Frame rate readout.
export const FCTRL = { LATEST: 0, READING: 1, TICK: 2, READY: 3, PACE_US: 4, PACE_SEQ: 5, COST_US: 6, FRAMES: 7, SIZE: 8 };

// main -> worker, written every frame by the main thread.
export const FIN = {
  HOUR: 0, PX: 1, PY: 2, PZ: 3, YAW: 4, PAUSED: 5, CAST: 6, TALKING: 7, CAMX: 8, CAMY: 9, CAMZ: 10, DAY: 11, IDLE: 12,
  // Up to 8 dangers the town should run from (anything hunting within reach of town): x, z pairs, and how many.
  DANGER_N: 13, DANGER: 14, SIZE: 64,
};

// Per person, in a slot.
export const F = {
  ACTIVE: 0, X: 1, Y: 2, Z: 3, YAW: 4, HX: 5, HY: 6, HZ: 7, BODY: 8, POSED: 9, HOUSE: 10, LEVEL: 11, SLEEP: 12, TALK: 13, BUSY: 14,
  // The bed (src/folk/folk.worker.js `beds`) they're lying in, times 4, plus 1 + which side of it (-1, 0, 1); -1 when not abed.
  BED: 15, SIZE: 16,
};
export const F_PALETTE = F.SIZE;
export const FOLK_STRIDE = F.SIZE + FOLK_JOINTS * 8;
export const SLOT_HEAD = 16;
export const SH = { COUNT: 0, TICK: 1, HOUR: 2 };
export const SLOT_FLOATS = SLOT_HEAD + FOLK_MAX * FOLK_STRIDE;

const CTRL_BYTES = FCTRL.SIZE * 4, INBOX_BYTES = FIN.SIZE * 4, BODIES_BYTES = FOLK_MAX * 4 * 4;
export const FOLK_BYTES = CTRL_BYTES + INBOX_BYTES + BODIES_BYTES + 3 * SLOT_FLOATS * 4;

export function mapFolk(buffer) {
  let o = 0;
  const ctrl = new Int32Array(buffer, o, FCTRL.SIZE); o += CTRL_BYTES;
  const inbox = new Float32Array(buffer, o, FIN.SIZE); o += INBOX_BYTES;
  // Where each one stands, for the player to bump into: x, z, radius, and 1 when they're there at all.
  const bodies = new Float32Array(buffer, o, FOLK_MAX * 4); o += BODIES_BYTES;
  const slots = [0, 1, 2].map((i) => new Float32Array(buffer, o + i * SLOT_FLOATS * 4, SLOT_FLOATS));
  return { ctrl, inbox, bodies, slots };
}

// The newest slot, marked as being read. Null before the town has written one.
export function readFolk(m) {
  const { ctrl } = m;
  if (Atomics.load(ctrl, FCTRL.TICK) === 0) return null;
  let latest;
  do {
    latest = Atomics.load(ctrl, FCTRL.LATEST);
    Atomics.store(ctrl, FCTRL.READING, latest);
  } while (Atomics.load(ctrl, FCTRL.LATEST) !== latest);
  return m.slots[latest];
}

// A slot to write: neither the newest nor the one being read.
export function freeSlot(m) {
  const latest = Atomics.load(m.ctrl, FCTRL.LATEST), reading = Atomics.load(m.ctrl, FCTRL.READING);
  for (let i = 0; i < 3; i++) if (i !== latest && i !== reading) return i;
  return (latest + 1) % 3;
}

export function publish(m, i) {
  Atomics.store(m.ctrl, FCTRL.LATEST, i);
  Atomics.add(m.ctrl, FCTRL.TICK, 1);
}
