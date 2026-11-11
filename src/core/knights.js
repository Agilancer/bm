// The knights after the first two, one in each of the other armour suits (rigged by tools/armor/rig_armor.py, from
// their own skin weights). The sim adds them after the field creatures and the renderer draws them in the same order.
//
// Tessariel's four carry the T and keep the town (guard: src/sim/town-watch.js): two walk its edge, one each way round,
// and two its streets. When anything attacks in or near the town the nearest goes to deal with it. Nothing of yours or
// the other Tessariels' harms them, and they never turn on you (kind 1: friends to you and to Tessariel's knight at the
// gate, foes to Velscour's). The man-at-arms in plain plate carries Velscour's
// colours, so he keeps the west road, well away from any T (kind 0: he fights you, and Tessariel's knights fight him).
//
// sword/shield: which of the four prop models each holds. Scales are the first two knights', by height.
// Round the inside of the town's edge (src/core/town.js TOWN), clear of the houses and fences.
const PERIMETER = [[-56, -50], [-56, 0], [-56, 54], [-14, 57], [30, 57], [66, 56], [92, 44], [92, 10], [92, -28], [86, -50], [50, -50], [10, -52], [-30, -52]];

export const TOWN_KNIGHTS = [
  { suit: 't_white', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.5, guard: true,
    // The town's edge, sunwise: up the west side, along the north, down the east past the manor and back along the south.
    route: PERIMETER, yaw: 0 },
  { suit: 't_purple', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.35, guard: true,
    // The west half's streets: up past the well to the top houses, round the western homes and back by the south lane.
    route: [[-3, 9], [-3, 29], [3, 44], [-24, 46], [-42, 30], [-42, -4], [-36, -26], [-14, -30], [-4, -14]], yaw: 0 },
  { suit: 't_silver', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.5, guard: true,
    // The town's edge the other way round, starting on the far side of it, so one of the two is never far off.
    route: [...PERIMETER.slice(6), ...PERIMETER.slice(0, 6)].reverse(), yaw: 3.1 },
  { suit: 't_pale', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.35, guard: true,
    // The east half: down the south-east houses, out to the bakehouse and the manor at the east end, and back by the north lanes.
    route: [[15, -9], [22, -40], [40, -46], [62, -28], [84, -20], [86, 20], [62, 34], [30, 32], [22, 12]], yaw: 1.6 },
  { suit: 'knight', kind: 0, sword: 'crimson', shield: 'v', style: 'black', hostile: true, hp: 460, walk: 1.45, leash: 22,
    // Velscour's man on the west road, outside the town's ring.
    route: [[-72, 4], [-84, -2], [-72, -10], [-84, -2]], yaw: -1.6 },
  { suit: 'paladin_bellwright', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 900, walk: 0.9,
    // Ser Anselm Toller, the Bellwright, a Tessariel's paladin: before his door at the Bell Tower of the Four Watches, on the
    // knoll far east (src/core/lands.js KNOLL; sites.js spots.bellwright). Talked to through src/folk/lines/beyond.js.
    route: [[2440.6, -531.6], [2445.4, -531.8]], yaw: Math.PI, bellwright: true },
].map((k) => {
  const height = k.suit === 'knight' ? 1.9 : 1.94;
  // The black knight is 2.12 m and holds the crimson sword and V board; the silver one is 1.92 m with the gilded and T.
  const s = k.sword === 'crimson' ? 1.085 * height / 2.12 : 0.96 * height / 1.92;
  const b = k.shield === 'v' ? 1.6 * height / 2.12 : 1.25 * height / 1.92;
  return {
    ...k, asset: `assets/game/knights/${k.suit}.glb`, spawn: k.route[0], swordScale: s, shieldScale: b,
    shieldHit: k.shield === 'v' ? 1.3 : 1.2, bladeLen: 1, pauseClip: k.hostile ? null : 'Idle_Loop',
  };
});
