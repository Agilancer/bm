// What a gem does to what it's set in, to look at. Every kind has its own particles, motion and light, and they add up: a staff with
// a ruby and a sapphire smoulders and snows at once. A better cut does it harder, and a Flawless stone adds a flourish of its own.
// All of it is on the render thread and owes the sim nothing. Particle kinds 16 + an element are the spells' own colours (src/sim/spells.js).
import { H } from '../core/layout.js';
import { SKULL_SEAT } from './renderer.js';
import { ELEM } from '../sim/spells.js';

// Where the skull is on the screen, in the world's wider camera: tan 32 over tan 38 turns one's slope into the other's.
const SEAT_A = (SKULL_SEAT[12] / SKULL_SEAT[14]) * 0.8 * 0.6, SEAT_B = (SKULL_SEAT[13] / -SKULL_SEAT[14]) * 0.8 * 0.6;
const K = (e) => 16 + e;
const GRADE = [0.7, 1, 1.5];
const TAU = Math.PI * 2;

// Each: light [r, g, b], its strength and reach, how it moves, and what it sheds, given a place to shed it from.
const LOOKS = {
  // Embers rising off it on the heat, and a warm light that gutters like a coal.
  ruby: {
    light: [1, 0.32, 0.12], i: 1.5, r: 5, pulse: (t) => 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 7.3),
    shed(r, x, y, z, n) { r.emit(6, n(26), x, y, z, 0, 1, 0, 0.5, 0.2, 0.9, 0.006, 0.014, 0.5, 1.1); },
    flawless(r, x, y, z, n) { r.emit(K(ELEM.FIRE), n(10), x, y, z, 0, 1, 0, 0.3, 0.8, 1.6, 0.014, 0.03, 0.2, 0.4); },
  },
  // Sparks jumping out in straight, quick lines, with a strobe like lightning a long way off.
  topaz: {
    light: [1, 0.78, 0.3], i: 1.7, r: 5, pulse: (t) => (Math.sin(t * 23) * Math.sin(t * 5.1) > 0.55 ? 1.5 : 0.35),
    shed(r, x, y, z, n) { r.emit(K(ELEM.STORM), n(20), x, y, z, 0, 0.2, 0, 3, 1.5, 4, 0.002, 0.005, 0.07, 0.18); },
    flawless(r, x, y, z, n, t) { const a = t * 9; r.emit(2, n(14), x + Math.cos(a) * 0.14, y, z + Math.sin(a) * 0.14, Math.cos(a), 0.3, Math.sin(a), 0.5, 1, 2.2, 0.002, 0.005, 0.1, 0.22); },
  },
  // A slow green breath that hangs, and a faint glow.
  emerald: {
    light: [0.25, 1, 0.45], i: 1.0, r: 4, pulse: (t) => 0.8 + 0.2 * Math.sin(t * 1.6),
    shed(r, x, y, z, n) { r.emit(K(ELEM.POISON), n(16), x, y - 0.03, z, 0, -0.15, 0, 1.2, 0.04, 0.22, 0.016, 0.04, 0.9, 1.9); },
    flawless(r, x, y, z, n, t) { const a = t * 1.7; for (const s of [0, Math.PI]) r.emit(K(ELEM.HEAL), n(7), x + Math.cos(a + s) * 0.18, y + Math.sin(t * 0.9 + s) * 0.1, z + Math.sin(a + s) * 0.18, 0, 1, 0, 0.3, 0.05, 0.2, 0.006, 0.012, 0.5, 1); },
  },
  // Snow that falls off it, a cold steady light, and a slow ring of frost round about.
  sapphire: {
    light: [0.3, 0.55, 1], i: 1.3, r: 5.5, pulse: () => 1,
    shed(r, x, y, z, n) { r.emit(K(ELEM.FROST), n(18), x, y, z, 0, -1, 0, 0.7, 0.12, 0.45, 0.004, 0.01, 0.8, 1.5); },
    flawless(r, x, y, z, n, t) { const a = t * 2.6; r.emit(K(ELEM.FROST), n(30), x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2, 0, 1, 0, 0.1, 0, 0.05, 0.005, 0.01, 0.35, 0.6); },
  },
  // Dark motes coming in from the air and going into it. It takes more light than it gives.
  amethyst: {
    light: [0.55, 0.15, 1], i: 1.1, r: 4, pulse: (t) => 0.55 + 0.45 * Math.sin(t * 2.2) ** 2,
    shed(r, x, y, z, n) {
      for (let i = n(16); i > 0; i--) {
        const a = Math.random() * TAU, b = Math.random() * 2 - 1, c = Math.sqrt(1 - b * b), R = 0.28 + Math.random() * 0.2;
        const dx = Math.cos(a) * c, dz = Math.sin(a) * c;
        r.emit(Math.random() < 0.4 ? K(ELEM.VOID) : K(ELEM.ARCANE), 1, x + dx * R, y + b * R, z + dz * R, -dx, -b, -dz, 0, R * 1.6, R * 2.2, 0.004, 0.01, 0.35, 0.5);
      }
    },
    flawless(r, x, y, z, n, t) { const a = t * 5; r.emit(K(ELEM.VOID), n(22), x + Math.cos(a) * 0.12, y + Math.sin(a) * 0.12, z, 0, 0, 0, 0, 0, 0.02, 0.012, 0.02, 0.2, 0.3); },
  },
  // Glints that go off like a star, and a light that turns through every colour.
  diamond: {
    light: null, i: 1.4, r: 5, pulse: () => 1,
    shed(r, x, y, z, n) { r.emit(2, n(12), x, y, z, 0, 1, 0, 1.8, 0.1, 0.5, 0.004, 0.012, 0.15, 0.4); r.emit(K(ELEM.LIGHT), n(8), x, y, z, 0, 1, 0, 3, 0.3, 1.1, 0.003, 0.008, 0.15, 0.35); },
    flawless(r, x, y, z, n, t) { const e = [ELEM.FIRE, ELEM.LIGHT, ELEM.POISON, ELEM.FROST, ELEM.ARCANE][Math.floor(t * 3) % 5]; r.emit(K(e), n(24), x, y, z, 0, 1, 0, 3, 0.8, 1.6, 0.004, 0.009, 0.2, 0.4); },
  },
};

const prism = (t) => [0.55 + 0.45 * Math.sin(t * 1.3), 0.55 + 0.45 * Math.sin(t * 1.3 + 2.1), 0.55 + 0.45 * Math.sin(t * 1.3 + 4.2)];

export class GemFx {
  constructor(renderer) {
    this.r = renderer;
    this.t = 0;
    renderer.gemLights = this.lights = [];
    this.pool = [0, 1, 2].map(() => ({ p: [0, 0, 0], c: [1, 1, 1], r: 4, i: 0 }));
    this.fill = { p: [0, 0, 0], c: [0.45, 0.7, 0.8], r: 0.9, i: 0.22 };
  }

  // Everything in the sockets of one thing, at one place. strength: bigger for what's out in the world than what's in the hand.
  shine(gems, x, y, z, dt, strength, glow = 1) {
    if (!gems?.length) return;
    const r = this.r, t = this.t;
    const n = (rate) => (v) => { const a = v * rate * dt; return Math.floor(a) + (Math.random() < a - Math.floor(a) ? 1 : 0); };
    let lr = 0, lg = 0, lb = 0, li = 0, lreach = 0;
    for (const g of gems) {
      const look = LOOKS[g.kind];
      if (!look) continue;
      const k = GRADE[g.grade] * strength;
      look.shed(r, x, y, z, n(k), t);
      if (g.grade === 2) look.flawless(r, x, y, z, n(strength), t);
      const c = look.light || prism(t), i = look.i * GRADE[g.grade] * look.pulse(t);
      lr += c[0] * i; lg += c[1] * i; lb += c[2] * i; li += i; lreach = Math.max(lreach, look.r);
    }
    const L = this.pool[this.used++];
    if (!L || !li) return;
    L.p[0] = x; L.p[1] = y; L.p[2] = z; L.c[0] = lr / li; L.c[1] = lg / li; L.c[2] = lb / li; L.r = lreach; L.i = Math.min(li, 3.5) * glow;
    this.lights.push(L);
  }

  // From the camera, somewhere in the view: right, up, forward.
  at(cam, a, b, c) {
    const rx = cam.fz, rz = -cam.fx;
    const l = Math.hypot(rx, rz) || 1;
    return [cam.x + rx / l * a + cam.ux * b + cam.fx * c, cam.y + cam.uy * b + cam.fy * c, cam.z + rz / l * a + cam.uz * b + cam.fz * c];
  }

  step(dt, snap, cam, pack) {
    this.t += dt;
    this.lights.length = 0;
    this.used = 0;
    const { main, off, skull } = pack.slots;
    // Whatever's in it, a skull keeps a little cold light on its face, so it doesn't go to a dark lump at night.
    if (skull) { const L = this.fill; L.p = this.at(cam, SEAT_A * 0.8, SEAT_B * 0.8, 0.48); this.lights.push(L); }
    if (main?.gems?.length) this.shine(main.gems, ...this.at(cam, -0.42, -0.03, 0.8), dt, 0.5, 0.4);
    if (skull?.gems?.length) this.shine(skull.gems, ...this.at(cam, SEAT_A, SEAT_B, 0.6), dt, 0.5, 0.22);   // (A light this near the hand would burn it white: it's the ground and the walls it's for.)
    // A shield on the arm is out of view under a staff: you see its stones when you're riding it, under your feet, and they run hot.
    if (off?.gems?.length && this.r.board.sword && snap[H.SURF] > 0.5) {
      const m = this.r.board.mat;
      this.shine(off.gems, m[12], m[13] + 0.08, m[14], dt, 2.2);
    }
  }
}
