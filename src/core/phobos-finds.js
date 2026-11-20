// What's found off the beaten way in the city of Phobos itself (src/core/castle-finds.js takes these in with the castle's):
// lookouts at the heads of its towers and on its wall, and any chests beyond the towers' own (src/core/phobos-towers.js
// towerChests). chests: [{ id, x, y, z, yaw, loot }]; vistas: [{ id, name, x, y, z, r, xp }]. In the world's own metres.
export function cityFinds() { return { chests: [], vistas: [] }; }
