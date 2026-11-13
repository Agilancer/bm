// Who a monster is after. The player, unless one of the other Tessariels (src/sim/hero.js) has picked a fight with it
// and is nearer: a hero that strikes a monster becomes its foe for a while, and the monster turns on them.
// Each monster's update asks this where it used to read sim.player, so the rest of its brain is unchanged.
export const FOE_MEMORY = 8;

export function foeOf(m, sim) {
  // Turned on someone of its own accord: down the Warrens a boss, or one of a pack, now and then breaks from the tank and
  // comes for you (src/sim/dungeon.js turnOn, stepPacks). Nothing holds it till that passes.
  const o = m.fixOn;
  if (o && !o.dead && sim.time < m.fixT) return o;
  // Held by a tank of your party (src/sim/hero.js companion): it goes for them, whoever else is hitting it.
  const t = m.tauntBy;
  if (t && !t.dead && !t.hidden && !t.surf && sim.time < m.tauntT) return t;
  const p = sim.player, f = m.heroFoe;
  // At one of another side (src/sim/wilds.js rivals): it keeps at them, unless you've just hurt it or you're on top of it.
  const r = m.rival;
  if (r && !r.dead && !r.dormant && sim.time - (m.playerHitT ?? -1e9) > 5 && (!f || sim.time - (m.heroFoeT ?? -1e9) > 5)
    && (p.dead || Math.hypot(p.x - m.x, p.z - m.z) > 3.5)) return r;
  if (!f || f.dead || f.hidden || sim.time - (m.heroFoeT ?? -1e9) > FOE_MEMORY) return p;
  const dp = p.dead ? 1e9 : Math.hypot(p.x - m.x, p.z - m.z), df = Math.hypot(f.x - m.x, f.z - m.z);
  // (The player close by and the hero far off: the player's the nearer threat.)
  return df < dp + 2 ? f : p;
}

// A monster busy with a hero, so the woods and the catacombs don't pick its body up and stand it somewhere else mid-fight.
export const heroBusy = (m, sim) => !!m.heroFoe && sim.time - (m.heroFoeT ?? -1e9) < FOE_MEMORY + 4;
