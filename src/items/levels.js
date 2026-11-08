// Experience and levels. A kill pays by what it was; each level makes every spell bite harder, and deepens life and mana.
// It's kept in the pack's save, and worked out on the render thread: the sim only gets what it comes to (writeWeapon).

export const MAX_LEVEL = 50;

// By the kind the sim reports for a kill: 0 the black knight, 1 the silver knight, 2 a crab, 3 the Gravehart, 4 the Hydra, 5 a zombie, 6 the ogre, 7 a caster, 8 a champion.
export const XP_OF = { 0: 600, 1: 180, 2: 80, 3: 900, 4: 1200, 5: 14, 6: 70, 7: 45, 8: 110, 9: 16 };

// The experience the start of a level takes, in all. A level is about half as long again as the one before it, early on.
export const xpFor = (level) => (level <= 1 ? 0 : Math.round(90 * (level - 1) ** 1.75));

export const levelPerks = (level) => {
  const n = Math.max(level, 1) - 1;
  return { power: 1 + n * 0.07, life: n * 8, mana: n * 6, regen: 1 + n * 0.04 };
};

// Adds to the pack's total. Returns whether that was a new level.
export function stepXp(pack, amount) {
  pack.xp += amount;
  let up = false;
  while (pack.level < MAX_LEVEL && pack.xp >= xpFor(pack.level + 1)) { pack.level++; up = true; }
  return up;
}
