// A body's pose, made where it stood and faced, moved bodily to where it stands and faces now. Bodies far off (or out of sight)
// are given a full pose only every few frames; in the frames between, the last one is carried along with them like this, so they
// glide with the world instead of standing still and jumping, and only their limbs are a frame or two behind. The townsfolk
// (src/folk/folk.worker.js) and everyone in the fight (src/sim/knight.js, src/sim/beast.js).
//
// Palettes are world-space dual quaternions (src/sim/anim.js writePalette): real q, dual 0.5 t q. The carry is a turn about the
// up axis by the change of facing and a shift: c = (qc, dc), and each joint becomes c times itself.

// The carry from (yaw0, x0, y0, z0) to (yaw1, x1, y1, z1), into c: [s, w, tx, ty, tz, cos, sin] with qc = (0, s, 0, w).
// True when it moves anything at all.
export function carryFrame(c, yaw0, x0, y0, z0, yaw1, x1, y1, z1) {
  const a = yaw1 - yaw0, ca = Math.cos(a), sa = Math.sin(a);
  c[0] = Math.sin(a / 2); c[1] = Math.cos(a / 2);
  c[2] = x1 - (x0 * ca + z0 * sa); c[3] = y1 - y0; c[4] = z1 - (-x0 * sa + z0 * ca);
  c[5] = ca; c[6] = sa;
  return a !== 0 || x1 !== x0 || y1 !== y0 || z1 !== z0;
}

// count joints of src (from so) carried by c into dst (from dOff). src and dst may be the same array.
export function carryPalette(src, so, dst, dOff, count, c) {
  const s = c[0], w = c[1], tx = c[2], ty = c[3], tz = c[4];
  // dc = 0.5 (tc, 0) qc
  const ex = 0.5 * (tx * w - tz * s), ey = 0.5 * ty * w, ez = 0.5 * (tx * s + tz * w), ew = -0.5 * ty * s;
  for (let j = 0; j < count; j++) {
    const i = so + j * 8, o = dOff + j * 8;
    const rx = src[i], ry = src[i + 1], rz = src[i + 2], rw = src[i + 3];
    const dx = src[i + 4], dy = src[i + 5], dz = src[i + 6], dw = src[i + 7];
    // real: qc r
    dst[o] = w * rx + s * rz; dst[o + 1] = w * ry + s * rw; dst[o + 2] = w * rz - s * rx; dst[o + 3] = w * rw - s * ry;
    // dual: qc d + dc r
    dst[o + 4] = w * dx + s * dz + ew * rx + ex * rw + ey * rz - ez * ry;
    dst[o + 5] = w * dy + s * dw + ew * ry - ex * rz + ey * rw + ez * rx;
    dst[o + 6] = w * dz - s * dx + ew * rz + ex * ry - ey * rx + ez * rw;
    dst[o + 7] = w * dw - s * dy + ew * rw - ex * rx - ey * ry - ez * rz;
  }
}

// A point (x, y, z at src[so..]) carried by c into dst[dOff..].
export function carryPoint(src, so, dst, dOff, c) {
  const x = src[so], y = src[so + 1], z = src[so + 2], ca = c[5], sa = c[6];
  dst[dOff] = x * ca + z * sa + c[2]; dst[dOff + 1] = y + c[3]; dst[dOff + 2] = -x * sa + z * ca + c[4];
}

// A column-major 4x4 (a held sword, a shield) carried by c: its three axes turned, its place turned and shifted.
export function carryMat4(src, so, dst, dOff, c) {
  const ca = c[5], sa = c[6];
  for (let k = 0; k < 3; k++) {
    const i = so + k * 4, o = dOff + k * 4, x = src[i], y = src[i + 1], z = src[i + 2];
    dst[o] = x * ca + z * sa; dst[o + 1] = y; dst[o + 2] = -x * sa + z * ca; dst[o + 3] = src[i + 3];
  }
  carryPoint(src, so + 12, dst, dOff + 12, c);
  dst[dOff + 15] = src[so + 15];
}
