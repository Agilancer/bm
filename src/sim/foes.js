// Who a monster is after. The player, unless one of the other Tessariels (src/sim/hero.js) has picked a fight with it
// and is nearer: a hero that strikes a monster becomes its foe for a while, and the monster turns on them.
// Each monster's update asks this where it used to read sim.player, so the rest of its brain is unchanged.
export const FOE_MEMORY = 8;

export function foeOf(m, sim) {
  const p = sim.player, f = m.heroFoe;
  if (!f || f.dead || f.hidden || sim.time - (m.heroFoeT ?? -1e9) > FOE_MEMORY) return p;
  const dp = p.dead ? 1e9 : Math.hypot(p.x - m.x, p.z - m.z), df = Math.hypot(f.x - m.x, f.z - m.z);
  // (The player close by and the hero far off: the player's the nearer threat.)
  return df < dp + 2 ? f : p;
}

// A monster busy with a hero, so the woods and the catacombs don't pick its body up and stand it somewhere else mid-fight.
export const heroBusy = (m, sim) => !!m.heroFoe && sim.time - (m.heroFoeT ?? -1e9) < FOE_MEMORY + 4;
