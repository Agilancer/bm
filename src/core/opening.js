export const OPENING = { OFF: 0, NAME: 1, LEAVE: 2, REVEAL: 3, ESCORT: 4, ARRIVED: 5 };
export const OPENING_REVISION = 3;
export const OPENING_SPAWN = [37.05, 122.4];
export const OPENING_YAW = 2.52;
export const CAVE_CENTRE = 38;
export const CAVE_MOUTH = 116;
export const CAVE_BACK = 125.4;
export const CAVE_FLOOR = 4.35;
export const PORTAL = [CAVE_CENTRE, CAVE_FLOOR + 1.66, CAVE_BACK - 0.8];

export const CAVE_TRAIL = [[38.4, 113.5], [37, 108], [33.5, 103.5], [28, 100.8], [21, 100], [15, 96.5], [10.8, 89.5], [8, 80]];
export const OPENING_ROUTE = [
  [39.2, 119.7], [38.4, 115.6], ...CAVE_TRAIL,
  [7.25, 68], [6.5, 56], [6, 48], [3, 39], [1, 32], [-1, 23], [-2.7, 17.5],
];

const middle = (CAVE_MOUTH + CAVE_BACK) / 2;
export const CAVE_WALLS = [
  { x: 34.95, z: middle, hx: 0.75, hz: 4.55, yaw: 0, h: 5 },
  { x: 41.05, z: middle, hx: 0.75, hz: 4.55, yaw: 0, h: 5 },
  { x: CAVE_CENTRE, z: CAVE_BACK, hx: 3.8, hz: 0.7, yaw: 0, h: 5 },
];

export const NAME_PROMPT_AT = 27.8;
export const REVEAL_END = 20.6;
export const REVEAL_SWAP_AT = 1.25;
export const OPENING_CLIPS = [
  'Spell_Simple_Idle_Loop', 'afraid', 'greet_01', 'Pointing into the distance', 'scared_02', 'frightened',
];
