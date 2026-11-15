// The bell tower's four bells (src/core/belltower.js BELLS), that you ring yourself: up the stair to the belfry floor, a
// rope in your hand, E. Like the doors these are the render thread's: it swings them, sounds them and draws them; the sim
// never knows. A pull sets a bell swinging, or swings it higher if it is; it dies away by itself. Its clapper hangs near
// still as the bronze swings round it, and the sound bow comes to it at each end of the swing: a strike, while the swing's
// big enough. Its rope's drawn up and paid out as the wheel turns. The models: tools/belltower/bells.py.
import { BELLS, ROPE } from '../core/belltower.js';

const D2R = Math.PI / 180;
const FIRST = 40 * D2R;      // how far a pull from still swings a bell
const MORE = 14 * D2R;       // what each pull after adds
const MOST = 62 * D2R;       // and as high as it's let go
const FADE = 12;             // seconds for a swing to die to a third
const STRIKES = 16 * D2R;    // under this it swings without striking
const ALPHA = Math.atan(0.75 / 1.16);   // how far a clapper leans in its bell before it meets the sound bow
const REACH = 1.4;           // how near a rope is to be had
const FACING = 0.3;
const SEEN = 420;            // drawn this near (they're seen swinging in the belfry's arches from the road)

export class Bells {
  constructor(renderer, audio) {
    this.audio = audio;
    this.bells = BELLS.map((B) => ({
      ...B, th: 0, w: 0, side: 0, knock: 0, knockSide: 0, last: 0,
      clapY: -0.15 - 0.07 * 1.45 * B.D,
      label: `Ring ${B.name}`,
      body: { piece: `bell_${B.key}`, bell: true, mat: new Float32Array(16) },
      clapper: { piece: `clapper_${B.key}`, bell: true, mat: new Float32Array(16) },
      cord: { piece: 'rope', bell: true, mat: new Float32Array(16) },
      sally: { piece: 'sally', bell: true, mat: new Float32Array(16) },
    }));
    for (const b of this.bells) this.pose(b);
    this.near = [];
    renderer.bellItems = this.near;
  }

  // How far it's swinging: its swing's full height, now.
  amp(b) {
    const om = (2 * Math.PI) / b.period;
    return Math.hypot(b.th, b.w / om);
  }

  // A pull on its rope: from still, a swing; swinging, a higher one, the way it's going (its angle doesn't jump).
  pull(b) {
    const om = (2 * Math.PI) / b.period, A = this.amp(b);
    const to = Math.min(MOST, A < 3 * D2R ? FIRST : A + MORE);
    const dir = Math.abs(b.w) < 0.05 ? 1 : Math.sign(b.w);
    b.w = dir * om * Math.sqrt(Math.max(0, to * to - b.th * b.th));
    // (The rope through the hands, and the stock creaking over.)
    this.audio.play('takeThing', b.rope[0], ROPE.floor + 1.6, b.rope[1], 0.6, 0.7);
  }

  // Swings and sounds them, poses what's near. Returns the rope you're facing, within reach, or null.
  update(dt, px, py, pz, yaw) {
    const h = Math.min(dt, 0.1), steps = Math.max(1, Math.ceil(h / (1 / 120))), s = h / steps;
    for (const b of this.bells) {
      const om = (2 * Math.PI) / b.period;
      if (b.th === 0 && b.w === 0 && !b.knock) continue;
      for (let k = 0; k < steps; k++) {
        const was = b.w;
        b.w += (-om * om * b.th - (2 / FADE) * b.w) * s;
        b.th += b.w * s;
        // At each end of the swing (where it turns), the sound bow comes to the clapper: a strike, if it's swinging enough.
        if (was !== 0 && Math.sign(b.w) !== Math.sign(was)) {
          const A = Math.abs(b.th);
          if (A > STRIKES) {
            const gain = 0.35 + 0.65 * Math.min(1, (A - STRIKES) / (MOST - STRIKES));
            const [x, y, z] = b.at;
            this.audio.bell(x, y - 0.9, z, b.hz, gain);
            b.knock = 1; b.knockSide = Math.sign(b.th);
          }
        }
      }
      b.knock = Math.max(0, b.knock - h / 0.25);
      // (Still again: let go of it.)
      if (this.amp(b) < 0.2 * D2R && !b.knock) { b.th = 0; b.w = 0; }
      this.pose(b);
    }
    this.near.length = 0;
    const [tx, , tz] = BELLS[0].at;
    if (Math.hypot(tx - px, tz - pz) < SEEN && py > ROPE.floor - 60) for (const b of this.bells) this.near.push(b.body, b.clapper, b.cord, b.sally);
    // A rope, if you're on the belfry floor and at one.
    if (Math.abs(py - ROPE.floor) > 1.2) return null;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let best = null, bestD = 1e9;
    for (const b of this.bells) {
      const dx = b.rope[0] - px, dz = b.rope[1] - pz, dist = Math.hypot(dx, dz);
      if (dist < REACH && dist < bestD && (dist < 0.5 || (dx * fx + dz * fz) / dist > FACING)) { bestD = dist; best = b; }
    }
    return best;
  }

  // Each piece where it is: the bell turned on its axle by th (its mouth out the way it faces, n, for th > 0), its clapper
  // hung from under its crown leaning less than the bell does, the rope paid out by the wheel's turn and its grip on it.
  pose(b) {
    const s = Math.sin(b.yaw), c = Math.cos(b.yaw), [x, y, z] = b.at;
    const set = (m, t, ox, oy, oz) => {
      const st = Math.sin(t), ct = Math.cos(t);
      m.set([c, 0, -s, 0, -s * st, ct, -c * st, 0, s * ct, st, c * ct, 0, ox, oy, oz, 1]);
    };
    set(b.body.mat, b.th, x, y, z);
    // (The clapper hangs from a point under the crown, turned with the bell: there, its own lean. It leans as much less
    // than the bell as puts it against the sound bow at the swing's end, and is knocked back off it for a moment after.)
    const A = Math.max(this.amp(b), STRIKES), rel = -b.th * (ALPHA / A) + b.knockSide * 0.5 * b.knock * (1 - b.knock);
    const st = Math.sin(b.th), ct = Math.cos(b.th), cy = b.clapY;
    set(b.clapper.mat, b.th + rel, x - s * st * cy, y + ct * cy, z - c * st * cy);
    const drop = b.wheel * b.th, [rx, rz] = b.rope;
    const bottom = ROPE.floor + ROPE.tail - drop, top = y;
    b.cord.mat.set([1, 0, 0, 0, 0, top - bottom, 0, 0, 0, 0, 1, 0, rx, bottom, rz, 1]);
    b.sally.mat.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, rx, ROPE.floor + ROPE.sally[0] - drop, rz, 1]);
  }
}
