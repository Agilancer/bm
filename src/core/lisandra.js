export const LISANDRA_SCALE = 1.75;
export const SKIRT_PALETTE_JOINTS = 4;
// gown: how her walk is reworked for a long gown (src/sim/village-walker.js gownWalk). Pretty takes short, quick steps on
// one line with little arm swing; the witch shuffles, bent over.
export const LISANDRA_FORMS = [
  // cloth: what her skirt, tabard and sleeve bones keep clear of (src/sim/cloth.js), in metres: the thigh, knee and
  // ankle, and the hand. The bones lie on the cloth's surface, so these are the leg plus the cloth's own drape.
  { asset: 'assets/game/lisandra/pretty.glb', armClearance: 0.23, skirtCenter: [0.002, 0.082], legRadii: [0.095, 0.068, 0.058], cloth: { legs: [0.125, 0.1, 0.09], hand: 0.055 }, walk: 'walk', gown: { stride: 0.66, knee: 0.55, inward: 0.07, arms: 0.35 }, route: [[2, 5], [7, 5], [7, -7], [2, -7]] },
  { asset: 'assets/game/lisandra/witch.glb', armClearance: 0.19, skirtCenter: [0.006, 0.006], legRadii: [0.076, 0.065, 0.056], cloth: { legs: [0.11, 0.098, 0.09], hand: 0.055 }, walk: 'walk', gown: { stride: 0.5, knee: 0.42, inward: 0.03, shift: 0.012, roll: 0.03, arms: 0.25, stoop: 0.5 }, route: [[-12, 4], [-7, 4], [-7, -7], [-12, -7]] },
];
