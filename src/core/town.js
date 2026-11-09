// The town: safe ground. Nothing that hunts you comes into it (Sim.step and Sim.nudgeBody in src/sim/sim.worker.js), no pack comes out of
// the trees near it (stepWoods in src/sim/undead.js), and Velscour's knight won't follow you into it (Knight.selectTarget). It takes in the
// houses round the square and runs east over the ground where the church stood, which the town is to grow onto. The church itself is
// out past it, a field away: src/core/church.js.
export const TOWN = { x0: -62, x1: 100, z0: -58, z1: 62 };

// How far outside the town this is, in metres; less than nothing inside it. (Measured to a box, so out past a corner it rounds off.)
export function townDist(x, z) {
  const qx = Math.max(TOWN.x0 - x, x - TOWN.x1), qz = Math.max(TOWN.z0 - z, z - TOWN.z1);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}

// In the town, or within margin metres of it (a margin under nothing keeps that far in from its edge).
export const inTown = (x, z, margin = 0) => townDist(x, z) < margin;

// Where the church stood: brought down level with the town and kept clear of pines (src/core/terrain.js, forest.js), and built on. The
// east end: the reeve's manor, the bakehouse and the herbalist's (tools/village/build_village.py, houses 13 to 15). Past it, the land
// climbs again to the church's own terrace.
export const OLD_CHURCH_GROUND = { x0: 50, x1: 106, hz: 26, y: 0.1, blend: 24 };
export const oldChurchGround = (x, z) => Math.max(OLD_CHURCH_GROUND.x0 - x, x - OLD_CHURCH_GROUND.x1, Math.abs(z) - OLD_CHURCH_GROUND.hz);
