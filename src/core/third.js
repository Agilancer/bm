// The third-person view: where its camera stands, shared by the thread that draws it (GameView.updateCamera in src/main.js)
// and the one that aims by it (Casting.eye in src/sim/casting.js) and keeps it out of the walls (Sim.stepBody).
//
// The camera looks along the same line you do in first person, from a point a step to the right of your eye and a little
// above it, and stands back along that line. So the X in the middle of the screen is still what you aim at, and your own
// body is left of it, out of the way.
import { OPENING } from './opening.js';

export const THIRD = {
  dist: 4.0,      // how far back (m)
  side: 0.5,      // to the right of the eye
  up: 0.3,        // above it
  near: 0.55,     // never nearer than this
  hide: 0.95,     // nearer than this the body isn't drawn: you'd be looking out through his back
  skin: 0.28,     // kept off whatever's behind the camera
  indoors: 0.5,   // under a roof, no higher than this over the eye
};

// Not in Lisandra's cave: only once you're out and the walk down has begun (or there's no opening at all).
export const thirdAllowed = (stage) => !(stage > OPENING.OFF && stage < OPENING.ESCORT);
