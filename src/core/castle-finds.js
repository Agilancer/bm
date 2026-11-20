// What's found off the beaten way in Castle Velscour and Phobos: treasure chests in the corners of its delves and at the
// heads of its towers, and its lookouts (a named place with a view: stand on it once and it's yours).
//
// A delve's chests are written with it (src/core/delve-*.js chests: [{ id, room, x, z, yaw, loot, up }], x and z local to the
// delve, on its room's floor); the land castle's stand on its towers' decks (src/core/phobos-build.js castleFinds). They are
// kept in a save by their id, not their place in a list, so more can be added anywhere (src/items/chests.js placed).
// A lookout: { id, name, x, y, z, r }. Found when you stand within r of it (src/main.js lookouts); kept by the quests as
// 'vista:<id>' (src/folk/quests.js flag), which a quest's visit step can ask for ('vista:<id>': AREAS).
import { DELVES } from './dungeon.js';
import { castleFinds } from './phobos-build.js';

let CHESTS = null, VISTAS = null;
const floorOf = (d, room) => { const r = d.rooms.find((q) => q.id === room); if (!r) throw new Error(`castle-finds: no room ${room} in ${d.key}`); return d.y + r.y; };

export function castleChests() {
  if (CHESTS) return CHESTS;
  CHESTS = [];
  for (const d of DELVES) for (const c of d.chests || []) CHESTS.push({ type: 'chest', id: `${d.key}:${c.id}`, x: d.x + c.x, y: floorOf(d, c.room) + (c.up || 0), z: d.z + c.z, yaw: c.yaw || 0, loot: c.loot ?? 2 });
  for (const c of castleFinds().chests) CHESTS.push({ type: 'chest', ...c });
  const ids = new Set();
  for (const c of CHESTS) { if (ids.has(c.id)) throw new Error(`castle-finds: two chests called ${c.id}`); ids.add(c.id); }
  return CHESTS;
}

export function castleVistas() {
  if (VISTAS) return VISTAS;
  VISTAS = [];
  for (const d of DELVES) for (const v of d.vistas || []) VISTAS.push({ id: v.id, name: v.name, x: d.x + v.x, y: floorOf(d, v.room) + (v.up || 0), z: d.z + v.z, r: v.r || 5, delve: d.key, xp: v.xp || d.level * 220 });
  for (const v of castleFinds().vistas) VISTAS.push({ r: 7, xp: 9000, ...v });
  const ids = new Set();
  for (const v of VISTAS) { if (ids.has(v.id)) throw new Error(`castle-finds: two lookouts called ${v.id}`); ids.add(v.id); }
  return VISTAS;
}
export const vistaAt = (x, y, z) => castleVistas().find((v) => Math.abs(y - v.y) < 4 && Math.hypot(x - v.x, z - v.z) < v.r) || null;
