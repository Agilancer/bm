// The east's walking map's grid (tools/paths/bake.mjs), the same as auto-play walks it by (src/sim/east-nav.js): half-metre
// cells over City State Phobos and Castle Velscour, from outside the Drawbridge Gate to the castle's east rim; a body's
// radius, the most a step may rise or drop to a next cell; and the most places one over another in a cell that are kept.
import { BODY, CELL, DROP, GH, GW, RISE, X0, X1, Z0, Z1 } from '../../src/sim/east-nav.js';
export { BODY, CELL, DROP, RISE, X0, X1, Z0, Z1 };
export const W = GW, H = GH, LAYERS = 64; // (A tower stair turns a dozen times and more over the one cell: every turn kept. A step names its place by Int8.)
