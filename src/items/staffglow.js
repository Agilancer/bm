// How every staff is held, and the colour of the living light in its head (materials.js), shared by the renderer and the tools.
import { STAFFS2 } from './staffs2.js';

// Every staff turns this far about its own shaft in the hand, from the frame its model was cut in: the head's face to the eye
// rather than its edge. (The owner's call, 2026-11-07: "turned 90 degrees in the player's hand".)
export const STAFF_SPIN = Math.PI / 2;

const C = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// What each shot glows, for the staffs that fire it.
export const SHOT_GLOW = {
  sunburst: C('#ffc44a'), crescent: C('#bcd4ff'), stasis: C('#7fe9ff'), singularity: C('#8a2cff'), prism: C('#9ad8ff'), leech: C('#ff1a3a'),
  wyrm: C('#ff6a12'), phoenix: C('#ff8a1c'), tesla: C('#6aa8ff'), souls: C('#9cffd0'), thorns: C('#5cff4a'), starfall: C('#e8e2ff'), judgement: C('#fff1b8'),
  vine: C('#26ff45'), rime: C('#14a0ff'), comet: C('#ff3806'), bloom: C('#40ffa3'), shade: C('#8514ff'), frost: C('#4db8ff'),
};

export const STAFF_GLOW = {
  // The first twelve, as they glowed before.
  greenwood_staff: C('#26ff45'), crystal_staff: C('#148cff'), skullhorn_staff: C('#ff3806'), gnarled_crook: C('#8ca6ff'),
  dark_staff: C('#8514ff'), death_staff: C('#40ffa3'), earth_staff: C('#ff8f14'), fire_staff: C('#ff3806'),
  ice_staff: C('#148cff'), life_staff: C('#26ff45'), vine_staff: C('#26ff45'), wind_staff: C('#8ca6ff'),
};
for (const s of STAFFS2) STAFF_GLOW[s.id] = SHOT_GLOW[s.shot];
