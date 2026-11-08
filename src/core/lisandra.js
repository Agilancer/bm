export const LISANDRA_SCALE = 1.75;
export const SKIRT_PALETTE_JOINTS = 4;
// gown: how her walk is reworked for a long gown (src/sim/village-walker.js gownWalk). The witch shuffles, bent over.
// Pretty wears leathers (corset, trousers, boots): she walks her own walk, with no skirt mask and no cloth bones.
// armClearance: radians each upper arm is turned out from her body (fitArms), to clear the gown or, for Pretty, her hips.
export const LISANDRA_FORMS = [
  { asset: 'assets/game/lisandra/pretty.glb', armClearance: 0.08, legRadii: [0.095, 0.068, 0.058], walk: 'walk', route: [[2, 5], [7, 5], [7, -7], [2, -7]] },
  // cloth: what her skirt, tabard and sleeve bones keep clear of (src/sim/cloth.js), in metres: the thigh, knee and
  // ankle, and the hand. The bones lie on the cloth's surface, so these are the leg plus the cloth's own drape.
  { asset: 'assets/game/lisandra/witch.glb', armClearance: 0.19, skirtCenter: [0.006, 0.006], legRadii: [0.076, 0.065, 0.056], cloth: { legs: [0.11, 0.098, 0.09], hand: 0.055 }, walk: 'walk', gown: { stride: 0.5, knee: 0.42, inward: 0.03, shift: 0.012, roll: 0.03, arms: 0.25, stoop: 0.5 }, route: [[-12, 4], [-7, 4], [-7, -7], [-12, -7]] },
];
