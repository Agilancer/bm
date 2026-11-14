// The third-person view: where its camera stands, shared by the thread that draws it (GameView.updateCamera in src/main.js)
// and the one that aims by it (Casting.eye in src/sim/casting.js) and keeps it out of the walls (Sim.stepBody).
//
// The camera looks along the same line you do in first person, from a point a step to the right of your eye and a little
// above it, and stands back along that line. So the X in the middle of the screen is still what you aim at, and your own
// body is left of it, out of the way.
//
// How far back is the mouse wheel's (ViewSwitch.wheel in src/ui/view.js): out of first person it stands the camera just
// behind you, and each notch takes it further back, up to three times V's; back in, to the nearest, and one more notch is
// first person again.
import { OPENING } from './opening.js';

export const THIRD = {
  dist: 4.0,      // how far back (m), until the wheel says otherwise
  close: 1.5,     // the wheel brings it no nearer than this (one more notch in is first person)
  far: 12,        // nor takes it further back than this
  notch: 1.22,    // each notch of the wheel: this many times further back, or nearer
  side: 0.5,      // to the right of the eye
  up: 0.3,        // above it
  near: 0.55,     // never nearer than this
  hide: 0.95,     // nearer than this the body isn't drawn: you'd be looking out through his back
  skin: 0.28,     // kept off whatever's behind the camera
  indoors: 0.5,   // under a roof, no higher than this over the eye
};

// Not in Lisandra's cave: only once you're out and the walk down has begun (or there's no opening at all).
export const thirdAllowed = (stage) => !(stage > OPENING.OFF && stage < OPENING.ESCORT);

// How far back, as kept in the settings: a number in reach, or else V's own.
export const thirdZoom = (v) => (Number.isFinite(v) && v >= THIRD.close && v <= THIRD.far ? v : THIRD.dist);

// The wheel turned `notches` (out is more): how far back that leaves the camera, kept in reach.
export const zoomBy = (d, notches) => Math.min(THIRD.far, Math.max(THIRD.close, d * THIRD.notch ** notches));
