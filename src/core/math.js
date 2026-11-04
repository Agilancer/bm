// Small allocation-free maths for the render and sim threads. Quaternions are [x, y, z, w],
// matrices are column-major Float32Array(16) (or plain arrays) in WebGPU clip space (z 0..1).

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const wrapAngle = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

export function quatMul(out, oi, a, ai, b, bi) {
  const ax = a[ai], ay = a[ai + 1], az = a[ai + 2], aw = a[ai + 3];
  const bx = b[bi], by = b[bi + 1], bz = b[bi + 2], bw = b[bi + 3];
  out[oi] = aw * bx + ax * bw + ay * bz - az * by;
  out[oi + 1] = aw * by - ax * bz + ay * bw + az * bx;
  out[oi + 2] = aw * bz + ax * by - ay * bx + az * bw;
  out[oi + 3] = aw * bw - ax * bx - ay * by - az * bz;
}

// Rotate vector v (at vi) by quaternion q (at qi), adding the translation t if given.
export function quatRotate(out, oi, q, qi, v, vi) {
  const x = q[qi], y = q[qi + 1], z = q[qi + 2], w = q[qi + 3];
  const vx = v[vi], vy = v[vi + 1], vz = v[vi + 2];
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  out[oi] = vx + w * tx + y * tz - z * ty;
  out[oi + 1] = vy + w * ty + z * tx - x * tz;
  out[oi + 2] = vz + w * tz + x * ty - y * tx;
}

export function quatYaw(out, oi, yaw) {
  out[oi] = 0; out[oi + 1] = Math.sin(yaw / 2); out[oi + 2] = 0; out[oi + 3] = Math.cos(yaw / 2);
}

export function quatAxisAngle(out, oi, ax, ay, az, angle) {
  const s = Math.sin(angle / 2);
  out[oi] = ax * s; out[oi + 1] = ay * s; out[oi + 2] = az * s; out[oi + 3] = Math.cos(angle / 2);
}

export function quatNormalize(q, i) {
  const l = 1 / (Math.hypot(q[i], q[i + 1], q[i + 2], q[i + 3]) || 1);
  q[i] *= l; q[i + 1] *= l; q[i + 2] *= l; q[i + 3] *= l;
}

// Blend with sign correction, for pose layers. Caller normalises.
export function quatNlerp(out, oi, a, ai, b, bi, t) {
  const d = a[ai] * b[bi] + a[ai + 1] * b[bi + 1] + a[ai + 2] * b[bi + 2] + a[ai + 3] * b[bi + 3];
  const s = d < 0 ? -t : t, r = 1 - t;
  const x = a[ai] * r + b[bi] * s, y = a[ai + 1] * r + b[bi + 1] * s;
  const z = a[ai + 2] * r + b[bi + 2] * s, w = a[ai + 3] * r + b[bi + 3] * s;
  const l = 1 / (Math.sqrt(x * x + y * y + z * z + w * w) || 1);
  out[oi] = x * l; out[oi + 1] = y * l; out[oi + 2] = z * l; out[oi + 3] = w * l;
}

// Rigid transform as (q, t): out = a * b.
export function trsMul(oq, ot, oi, aq, at, ai, bq, bt, bi) {
  quatRotate(ot, oi * 3, aq, ai * 4, bt, bi * 3);
  ot[oi * 3] += at[ai * 3]; ot[oi * 3 + 1] += at[ai * 3 + 1]; ot[oi * 3 + 2] += at[ai * 3 + 2];
  quatMul(oq, oi * 4, aq, ai * 4, bq, bi * 4);
}

export function quatFromMat3(m) {
  // m is column-major 3x3 in a 9 array
  const t = m[0] + m[4] + m[8];
  let x, y, z, w;
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    w = 0.25 * s; x = (m[5] - m[7]) / s; y = (m[6] - m[2]) / s; z = (m[1] - m[3]) / s;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    w = (m[5] - m[7]) / s; x = 0.25 * s; y = (m[3] + m[1]) / s; z = (m[6] + m[2]) / s;
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    w = (m[6] - m[2]) / s; x = (m[3] + m[1]) / s; y = 0.25 * s; z = (m[7] + m[5]) / s;
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    w = (m[1] - m[3]) / s; x = (m[6] + m[2]) / s; y = (m[7] + m[5]) / s; z = 0.25 * s;
  }
  return [x, y, z, w];
}

export function mat4Identity() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }

export function mat4Mul(o, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let i = 0; i < 4; i++) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    o[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
    o[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
    o[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
    o[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  }
  return o;
}

export function mat4Invert(o, m) {
  const a = m;
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4];
  const b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12];
  const b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  det = 1 / det;
  const r = [
    (a[5] * b11 - a[6] * b10 + a[7] * b09) * det, (a[2] * b10 - a[1] * b11 - a[3] * b09) * det,
    (a[13] * b05 - a[14] * b04 + a[15] * b03) * det, (a[10] * b04 - a[9] * b05 - a[11] * b03) * det,
    (a[6] * b08 - a[4] * b11 - a[7] * b07) * det, (a[0] * b11 - a[2] * b08 + a[3] * b07) * det,
    (a[14] * b02 - a[12] * b05 - a[15] * b01) * det, (a[8] * b05 - a[10] * b02 + a[11] * b01) * det,
    (a[4] * b10 - a[5] * b08 + a[7] * b06) * det, (a[1] * b08 - a[0] * b10 - a[3] * b06) * det,
    (a[12] * b04 - a[13] * b02 + a[15] * b00) * det, (a[9] * b02 - a[8] * b04 - a[11] * b00) * det,
    (a[5] * b07 - a[4] * b09 - a[6] * b06) * det, (a[0] * b09 - a[1] * b07 + a[2] * b06) * det,
    (a[13] * b01 - a[12] * b03 - a[14] * b00) * det, (a[8] * b03 - a[9] * b01 + a[10] * b00) * det,
  ];
  for (let i = 0; i < 16; i++) o[i] = r[i];
  return o;
}

export function mat4FromQT(o, q, qi, t, ti) {
  const x = q[qi], y = q[qi + 1], z = q[qi + 2], w = q[qi + 3];
  o[0] = 1 - 2 * (y * y + z * z); o[1] = 2 * (x * y + z * w); o[2] = 2 * (x * z - y * w); o[3] = 0;
  o[4] = 2 * (x * y - z * w); o[5] = 1 - 2 * (x * x + z * z); o[6] = 2 * (y * z + x * w); o[7] = 0;
  o[8] = 2 * (x * z + y * w); o[9] = 2 * (y * z - x * w); o[10] = 1 - 2 * (x * x + y * y); o[11] = 0;
  o[12] = t[ti]; o[13] = t[ti + 1]; o[14] = t[ti + 2]; o[15] = 1;
  return o;
}

// Reversed-Z infinite perspective, y up, looking down -z.
export function mat4Perspective(o, fovy, aspect, near) {
  const f = 1 / Math.tan(fovy / 2);
  o.fill(0);
  o[0] = f / aspect; o[5] = f; o[11] = -1; o[14] = near;
  return o;
}

export function mat4Ortho(o, l, r, b, t, n, f) {
  o.fill(0);
  o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = 1 / (n - f);
  o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = n / (n - f); o[15] = 1;
  return o;
}

export function mat4LookTo(o, ex, ey, ez, fx, fy, fz, ux, uy, uz) {
  // f is the forward direction (unit). Right-handed view looking down -z.
  let sx = fy * uz - fz * uy, sy = fz * ux - fx * uz, sz = fx * uy - fy * ux;
  const sl = 1 / (Math.hypot(sx, sy, sz) || 1);
  sx *= sl; sy *= sl; sz *= sl;
  const tx = sy * fz - sz * fy, ty = sz * fx - sx * fz, tz = sx * fy - sy * fx;
  o[0] = sx; o[1] = tx; o[2] = -fx; o[3] = 0;
  o[4] = sy; o[5] = ty; o[6] = -fy; o[7] = 0;
  o[8] = sz; o[9] = tz; o[10] = -fz; o[11] = 0;
  o[12] = -(sx * ex + sy * ey + sz * ez);
  o[13] = -(tx * ex + ty * ey + tz * ez);
  o[14] = fx * ex + fy * ey + fz * ez;
  o[15] = 1;
  return o;
}

export function transformPoint(o, m, x, y, z) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return o;
}
