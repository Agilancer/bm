import { lerp } from './math.js';

// View-space offset of the shield and left arm. Tuck the resting rim partly
// past the left edge, including on wider phone screens.
export const shieldRise = (up) => 1 - (1 - up) ** 3;
export const shieldX = (rise, aspect) => lerp(-0.16 - Math.min(aspect, 2.54) * 0.305, -0.50 + Math.max(0, 1 - aspect) * 0.12, rise);
export const shieldY = (rise) => lerp(-0.46, -0.10, rise);

// A point on the shield's broad face before applying the pose offset.
export const SHIELD_FACE_POINT = [0.06, -0.03, -0.50];
