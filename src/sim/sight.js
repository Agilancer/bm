// A clean line for something shot or thrown: from an eye (or a bow hand) to a mark, clear of what would stop it on the way.
// Shared by auto-play (src/sim/nav.worker.js `sight`: it asks before every shot) and the other Tessariels (src/sim/hero.js
// lineTo), so neither shoots through a wall or round a corner. world: a World (src/sim/world.js).

// A shot's line from a to b, as Casting.trace stops a bolt: the boxes, the places' walls and the pines (World.rayBoxes), then
// the ground between. (Short of b by half a metre: the mark's own body isn't in its way.)
export function lineClear(world, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  if (L < 0.8) return true;
  const ux = dx / L, uy = dy / L, uz = dz / L, far = L - 0.5;
  if (world.rayBoxes(ax, ay, az, ux, uy, uz, far) >= 0) return false;
  for (let s = 0.75; s < far; s += 0.75) if (ay + uy * s < world.height(ax + ux * s, az + uz * s) - 0.05) return false;
  return true;
}

// A clean line, not one that grazes a corner: the line itself and one a hand's width either side of it, all clear. (A bolt
// leaves the staff's head, beside the eye, for where the mark will be by then: a line that only just clears a corner doesn't.)
export const FAT = 0.32;
export function cleanLine(world, ax, ay, az, bx, by, bz, fat = FAT) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, rx = -dz / L * fat, rz = dx / L * fat;
  return lineClear(world, ax, ay, az, bx, by, bz) && lineClear(world, ax + rx, ay, az + rz, bx + rx, by, bz + rz) && lineClear(world, ax - rx, ay, az - rz, bx - rx, by, bz - rz);
}

// For each mark [x, y, z] from an eye [x, y, z]: [clean (1 or 0), step]. step: how far to its right (+) or its left (-) the
// shooter would have to stand for a clean line (the nearest such place it can walk straight to), or 0 if a few steps to the
// side wouldn't do it and it has to go round. (Right, facing the mark: (-dz, dx) of the way to it, as the move keys have it.)
// fat: how wide a line to ask for. A shot's (FAT), or next to nothing for a hand put out or a word had: is there a wall
// between, not would a bolt clear the corner.
const PEEKS = [1.2, 2.4, 3.6, 5];
export function sight(world, from, marks, eye = 1.62, fat = FAT) {
  const [ax, ay, az] = from, out = [];
  for (const [bx, by, bz] of marks) {
    if (cleanLine(world, ax, ay, az, bx, by, bz, fat)) { out.push([1, 0]); continue; }
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, rx = -dz / L, rz = dx / L;
    let step = 0;
    for (const k of PEEKS) {
      for (const side of [1, -1]) {
        const px = ax + rx * side * k, pz = az + rz * side * k;
        // (Somewhere it can stand, and walk straight to, on the same footing.)
        if (world.inside(px, pz, 0.45) || world.clearance(ax, az, rx * side, rz * side, k, 0.42) < k - 0.05) continue;
        if (Math.abs(world.height(px, pz) - (ay - eye)) > 1.5) continue;
        if (cleanLine(world, px, ay, pz, bx, by, bz, fat)) { step = side * k; break; }
      }
      if (step) break;
    }
    out.push([0, step]);
  }
  return out;
}
