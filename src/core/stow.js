// Weapons put away, out of a fight: you (src/sim/sim.worker.js stepStow, src/sim/playerbody.js) and everyone who carries
// arms about the land (src/sim/knight.js, src/sim/hero.js). In a fight they're in the hand; once it's over they're kept out
// for `after` seconds, in case there's more, and then put away: a staff, a spear or a bow on the back, a shield on the back
// over it, a sword or a knife at the hip, your skull at your hip. Under a roof of stone (the church and its catacombs, the
// Warrens, the Test Dungeon) they're never put away.
import { inDungeon } from './dungeon.js';
import { inHall } from './testhall.js';
import { floorAt } from './interior.js';

export const STOW = {
  after: 15,      // s since the last of the fighting before anything's put away
  draw: 0.22,     // s to have it in hand again
  away: 0.7,      // s to put it away
  near: 22,       // m: something awake and at you this near keeps yours out
  close: 14,      // m: the same for a beast that doesn't say whether it's at you
};

// Somewhere weapons stay out whatever's about.
export const armedGround = (x, z) => inDungeon(x, z) || inHall(x, z) || floorAt(x, z) !== null;

// One body's count of the calm, and how far put away it is (0 in hand, 1 away). o: { calmT, stow }, kept on the body.
export function stepStow(o, dt, busy, x, z) {
  if (busy) o.calmT = 0;
  else {
    o.calmT += dt;
    // (Looked at as it's about to put them away, and now and then after: not every tick for every body.)
    if (o.calmT >= STOW.after && (o.groundT = (o.groundT || 0) - dt) <= 0) { o.groundT = 1; o.onArmed = armedGround(x, z); }
    if (o.calmT >= STOW.after && o.onArmed) o.calmT = STOW.after - 0.5;
  }
  const to = o.calmT >= STOW.after ? 1 : 0;
  o.stow = Math.max(0, Math.min(1, o.stow + (to ? dt / STOW.away : -dt / STOW.draw)));
  return o.stow;
}
