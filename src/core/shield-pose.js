import { lerp, quatMul, quatRotate } from './math.js';

// View-space offset of the shield and left arm. Tuck the resting rim partly
// past the left edge, including on wider phone screens.
export const shieldRise = (up) => 1 - (1 - up) ** 3;
export const shieldX = (rise, aspect) => lerp(-0.16 - Math.min(aspect, 2.54) * 0.305, -0.44 + Math.max(0, 1 - aspect) * 0.12, rise);
export const shieldY = (rise) => lerp(-0.46, -0.10, rise);

// A point on the shield's broad face before applying the pose offset.
export const SHIELD_FACE_POINT = [0.06, -0.03, -0.50];

export function shieldPose(out, up, aspect) {
  const rise = shieldRise(up);
  const pitch = -7 * Math.PI / 360 * rise, yaw = 6 * Math.PI / 360 * rise;
  const sp = Math.sin(pitch), cp = Math.cos(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw);
  out[0] = cy * sp; out[1] = sy * cp; out[2] = -sy * sp; out[3] = cy * cp;

  // Pivot around the wave's launch point so it stays seated on the shield face.
  quatRotate(out, 4, out, 0, SHIELD_FACE_POINT, 0);
  out[4] = (SHIELD_FACE_POINT[0] - out[4] + shieldX(rise, aspect)) * 0.5;
  out[5] = (SHIELD_FACE_POINT[1] - out[5] + shieldY(rise)) * 0.5;
  out[6] = (SHIELD_FACE_POINT[2] - out[6]) * 0.5;
  out[7] = 0;
  quatMul(out, 4, out, 4, out, 0);
}
