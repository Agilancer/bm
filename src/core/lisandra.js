export const LISANDRA_SCALE = 1.75;
export const SKIRT_PALETTE_JOINTS = 4;
// gown: how her walk is reworked for a long gown (src/sim/village-walker.js gownWalk). The witch shuffles, bent over.
// Pretty wears leathers (corset, trousers, boots): she walks her own walk, with no skirt mask and no cloth bones.
// armClearance: radians each upper arm is turned out from her body (fitArms), to clear the gown or, for Pretty, her hips.
export const LISANDRA_FORMS = [
  { asset: 'assets/game/lisandra/pretty.glb', armClearance: 0.08, legRadii: [0.095, 0.068, 0.058], walk: 'walk', route: [[2, 5], [7, 5], [7, -7], [2, -7]] },
  // The witch is the owner's model as supplied (mesh, skin weights and textures byte for byte, but for the share of her
  // head her new jaw takes: tools/lisandra/jaw_rig.py), with her own walk and run, the clips she shares with Pretty, and
  // the _SKIRT mask that keeps her gown clear of her legs as she walks. Her jaw opens as she speaks. Her sleeves
  // are fitted, so her arms are turned out only a little (armClearance). She has NO cloth bones: on the owner's word her gown
  // moves only with her body, so it doesn't dance while she talks (docs/RENDERING.md). The bone-chain cloth
  // (src/sim/cloth.js, tools/lisandra/cloth_rig.py) is kept but unused: a form with no `cloth` here gets none.
  { asset: 'assets/game/lisandra/witch.glb', armClearance: 0.1, skirtCenter: [0.002, 0.013], legRadii: [0.076, 0.065, 0.056], walk: 'walk', gown: { stride: 0.5, knee: 0.42, inward: 0.03, shift: 0.012, roll: 0.03, arms: 0.25, stoop: 0.5 }, route: [[-12, 4], [-7, 4], [-7, -7], [-12, -7]] },
];
