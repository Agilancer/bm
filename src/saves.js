// Saved games: ten slots, and the game as it was last played (Continue), in localStorage under velscour.* so they
// never meet Bellmourn's saves on a shared host.
//
// A save is a set of named parts, each written and read by the system it belongs to:
//
//   { v: SAVE_VERSION, at, summary: [lines for the slot list], parts: { player: {...}, stats: {...}, ... } }
//
// Today there are three (main.js): `player`, where you stand and which way you face, `stats`, the time played, and `pack`,
// what you carry and have on. Quests and the world's own state come in later as parts of their own, with addPart. A part
// missing from a save (one made before the part existed) is loaded with null, and starts as in a new game. When a
// part's shape changes, raise SAVE_VERSION and add a step to MIGRATIONS that brings the older saves up to it.

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 10;

// version -> (save) => the save at the next version. e.g. 1: (d) => { d.parts.player.cell = 'velscour'; d.v = 2; return d; }
const MIGRATIONS = {};

const parts = new Map();

/** A part of every save. save() -> data (or a promise of it); load(data or null, whole save); summary(data) -> a line
 * for the slot list, or nothing. Parts load in the order they were added. */
export function addPart(name, part) { parts.set(name, part); }

/** Everything there is to save, now. */
export async function capture() {
  const out = { v: SAVE_VERSION, parts: {} };
  for (const [name, p] of parts) out.parts[name] = await p.save();
  out.summary = [...parts].map(([name, p]) => p.summary?.(out.parts[name])).filter(Boolean);
  return out;
}

/** Puts a save back, part by part. Throws on a save this version can't read. */
export async function restore(data) {
  const d = migrate(structuredClone(data));
  for (const [name, p] of parts) await p.load(d.parts[name] ?? null, d);
}

function migrate(d) {
  if (!d || typeof d.v !== 'number' || !d.parts) throw new Error('This save can\'t be read.');
  if (d.v > SAVE_VERSION) throw new Error('This save is from a newer version of the game.');
  while (d.v < SAVE_VERSION) {
    const step = MIGRATIONS[d.v];
    if (!step) throw new Error(`Saves from version ${d.v} can't be read any more.`);
    d = step(d);
  }
  return d;
}

// ---- where they're kept ----------------------------------------------------------------------------------------

const SLOT_KEY = (i) => `velscour.save.${i}`;
const AUTO_KEY = 'velscour.autosave';
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const parse = (k) => { try { return JSON.parse(get(k) || 'null'); } catch { return null; } };
const put = (k, data) => { try { localStorage.setItem(k, JSON.stringify({ ...data, at: Date.now() })); return true; } catch (e) { console.warn('save', e); return false; } };
const del = (k) => { try { localStorage.removeItem(k); } catch { /* no storage */ } };

export const saves = {
  read: (i) => parse(SLOT_KEY(i)),
  write: (i, data) => put(SLOT_KEY(i), data),
  clear: (i) => del(SLOT_KEY(i)),
  any() { for (let i = 1; i <= SLOT_COUNT; i++) if (get(SLOT_KEY(i))) return true; return false; },
  auto: () => parse(AUTO_KEY),
  writeAuto: (data) => put(AUTO_KEY, data),
  clearAuto: () => del(AUTO_KEY),
  // The newest game there is: the one kept as it was played, or a slot saved after it.
  newest() {
    let best = this.auto();
    for (let i = 1; i <= SLOT_COUNT; i++) { const d = this.read(i); if (d && (!best || d.at > best.at)) best = d; }
    return best;
  },
};
