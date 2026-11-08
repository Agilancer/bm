// The knights after the first two, one in each of the other armour suits (rigged by tools/armor/rig_armor.py, from
// their own skin weights). The sim adds them after the field creatures and the renderer draws them in the same order.
//
// Tessariel's four carry the T and keep the village, each walking a beat through its streets (kind 1: friends to you
// and to Tessariel's knight at the gate, foes to Velscour's). The man-at-arms in plain plate carries Velscour's
// colours, so he keeps the west road, well away from any T (kind 0: he fights you, and Tessariel's knights fight him).
//
// sword/shield: which of the four prop models each holds. Scales are the first two knights', by height.
export const TOWN_KNIGHTS = [
  { suit: 't_white', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.35,
    // The north street, up past the well to the top houses and back.
    route: [[-3, 9], [-3, 29], [3, 44], [-3, 29]], yaw: 0 },
  { suit: 't_purple', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.3,
    // West side: between the big house and the western homes.
    route: [[-12, 9], [-30, 8], [-32, -8], [-30, -22], [-32, -8], [-30, 8]], yaw: -1.6 },
  { suit: 't_silver', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.4,
    // Across the south of the square and down to the south-east houses.
    route: [[-4, -10], [14, -10], [16, -28], [22, -40], [16, -28], [14, -10]], yaw: 1.6 },
  { suit: 't_pale', kind: 1, sword: 'gilded', shield: 't', style: 'silver', hostile: false, hp: 380, walk: 1.3,
    // The far south lane, round the back of the southern homes.
    route: [[-20, -28], [-2, -29], [0, -46], [-20, -46]], yaw: 1.6 },
  { suit: 'knight', kind: 0, sword: 'crimson', shield: 'v', style: 'black', hostile: true, hp: 460, walk: 1.45, leash: 22,
    // Velscour's man on the west road, outside the town's ring.
    route: [[-72, 4], [-84, -2], [-72, -10], [-84, -2]], yaw: -1.6 },
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
