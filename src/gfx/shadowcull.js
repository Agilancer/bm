// Which bodies each shadow cascade needs (docs/RENDERING.md, "Shadow culling").
// A cascade is an orthographic box seen from the sun. A body whose bounding sphere lies wholly outside the box's square
// can't darken a single texel of that cascade's map, so drawing it there is wasted work: leaving it out gives the same
// map. Only the square is tested, never the depth: the box is 520 m deep along the light, and a caster outside that is
// clipped by the GPU anyway.

// m: a Float32Array holding the cascade's view-projection matrix (column-major) at offset o.
// x, y, z, r: the body's bounding sphere, in metres.
export function inCascade(m, o, x, y, z, r) {
  const cx = m[o] * x + m[o + 4] * y + m[o + 8] * z + m[o + 12];
  const cy = m[o + 1] * x + m[o + 5] * y + m[o + 9] * z + m[o + 13];
  // (Each row's length is the box's scale on that axis: one over its half-width.)
  const sx = Math.hypot(m[o], m[o + 4], m[o + 8]);
  const sy = Math.hypot(m[o + 1], m[o + 5], m[o + 9]);
  return Math.abs(cx) <= 1 + r * sx && Math.abs(cy) <= 1 + r * sy;
}

// A sphere sure to hold a body in any pose: the cull radius the renderer already trusts for the camera, or the
// farthest point of its bind pose with a quarter again for reach and a metre for the centre sitting a metre up, plus a
// metre to spare.
export function bodyRadius(cullR, bindR) {
  return Math.max(cullR, (bindR || 0) * 1.25 + 1) + 1;
}
