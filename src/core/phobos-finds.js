// What's found off the beaten way in the city of Phobos itself (src/core/castle-finds.js takes these in with the castle's):
// lookouts at the heads of its towers and on its wall, and any chests beyond the towers' own (src/core/phobos-towers.js
// towerChests). chests: [{ id, x, y, z, yaw, loot }]; vistas: [{ id, name, x, y, z, r, xp }]. In the world's own metres.
//
// The lookouts are places a player can stand, every one on a floor that's walked (tests/phobos-town.test.mjs): the rooms the
// wall-walk runs through, fifty metres over the streets (its gates' drums, its posts); the top rooms of the city's towers,
// up their stairs (where each one's chest is); and the passages of the toll-houses on the Slough's two footbridges
// (src/core/phobos-houses.js bridgeHouse). The town's quests send you up to them (src/folk/phobos-quests-town.js).
import { cityTowers, towerChests } from './phobos-towers.js';
import { sloughRun } from './phobos-build.js';
import { terrainHeight } from './terrain.js';

// [id, name, the tower's key (src/core/phobos-towers.js cityTowers), what the sight's worth]
const TOWER_LOOKS = [
  // (On the wall: a wall tower's room is at the walk's height.)
  ['drawbridge_head', "the Drawbridge Gate's Head", 'gate5_1', 2400],
  ['ashwatch_post', 'the Ashwatch Post', 'lesser6_2', 2600],
  ['rookery_post', 'the Rookery Watch', 'lesser4_2', 2600],
  ['charnel_drum', "the Charnel Gate's Drum", 'gate8_1', 3000],
  ['water_gate_drum', "the Tanners' Water Gate's Drum", 'gate2_1', 3000],
  ['magewall_post', 'the Magewall Post', 'lesser10_2', 3600],
  ['dukes_wall_post', "the Dukes' Wall Post", 'lesser0_2', 3600],
  ['castle_gate_drum', "the Castle Gate's Drum", 'gate11_1', 4400],
  // (Up a tower's own stair: its top room.)
  ['barbican_loft', "the Barbican's Guardroom Loft", 'barbican1', 2200],
  ['minster_tower', "the Burnt Minster's Loft", 'minster', 2600],
  ['gibbet_loft', "the Gibbet Tower's Loft", 'gibbet', 2800],
  ['hospice_ward', "the Rotting Hospice's Top Ward", 'hospice', 2800],
  ['sluice_loft', "the Sluice House's Wheel Loft", 'sluice', 2800],
  ['eye_room', 'the Scrying Room of the Ninefold Eye', 'eye', 4000],
];
// The Slough's two footbridges' toll-houses: [id, name, the bridge's z (src/core/phobos-build.js waters)].
const TOLLS = [['toll_upper', 'the Upper Toll-House on the Slough', -390], ['toll_lower', 'the Lower Toll-House on the Slough', 180]];

let FINDS = null;
export function cityFinds() {
  if (FINDS) return FINDS;
  const vistas = [], towers = new Map(cityTowers().map((t) => [t.key, t])), chests = new Map(towerChests().map((c) => [c.tower, c]));
  for (const [id, name, key, xp] of TOWER_LOOKS) {
    const t = towers.get(key);
    if (!t) throw new Error(`phobos-finds: no tower ${key} for ${id}`);
    // (A wall tower's room: at its walk's height. A tower of its own: its top floor, a step under where its chest stands.)
    const c = chests.get(key), y = t.kind === 'wall' ? Math.min(...t.ways.map((w) => w[1])) : c ? c.y - 0.2 : null;
    if (y === null) throw new Error(`phobos-finds: ${key} has no top floor`);
    vistas.push({ id, name, x: t.x, y, z: t.z, r: Math.max(4, t.r * 0.7), xp });
  }
  for (const [id, name, zc] of TOLLS) {
    const r0 = sloughRun().find((q) => !q.skip && q.lv !== null && Math.abs((q.p[1] + q.q[1]) / 2 - zc) < 5);
    if (!r0) continue;
    const x = (r0.p[0] + r0.q[0]) / 2, z = (r0.p[1] + r0.q[1]) / 2;
    vistas.push({ id, name, x, y: Math.min(terrainHeight(x - r0.uz * 15.5, z + r0.ux * 15.5), terrainHeight(x + r0.uz * 15.5, z - r0.ux * 15.5)) + 0.3, z, r: 3.2, xp: 2400 });
  }
  return (FINDS = { chests: [], vistas });
}
