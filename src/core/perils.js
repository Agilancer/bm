// What a monster marks on the ground before it lands there: the shapes, and whether a point is in one. Shared by every
// thread: the sim (src/sim/perils.js) hurts what's inside, the party (src/sim/hero.js) and auto-play (src/ui/autobrain.js)
// step out by the same sums, and the shaders draw the same shape (FX.MARK, src/gfx/spellfx.js).
//
// A mark is { shape, x, z, r, ... }:
//   circle  everything within r of (x, z)
//   ring    between r0 and r of it: the middle is safe
//   cone    within r, and within `half` radians either side of yaw
//   line    a strip from (x, z) out along yaw, r long and w either side
//   cross   `arms` such strips, evenly round, the first along yaw
// yaw is the game's: 0 looks down +z, and x is sin(yaw).

export const SHAPE = { circle: 0, ring: 1, cone: 2, line: 3, cross: 4 };
export const SHAPES = Object.keys(SHAPE);

const strip = (f, s, r, w) => {
  const qx = Math.abs(f - r / 2) - r / 2, qy = Math.abs(s) - w;
  return qx > 0 && qy > 0 ? Math.hypot(qx, qy) : Math.max(qx, qy);
};

/** How far (x, z) is from the mark's edge, in metres: under nothing inside it, over nothing outside. */
export function edge(h, x, z) {
  const dx = x - h.x, dz = z - h.z, d = Math.hypot(dx, dz);
  switch (h.shape) {
    case 'ring': return Math.max(d - h.r, (h.r0 || 0) - d);
    case 'cone': {
      const sy = Math.sin(h.yaw), cy = Math.cos(h.yaw);
      const a = Math.abs(Math.atan2(dx * cy - dz * sy, dx * sy + dz * cy)), half = h.half ?? 0.5;
      if (a <= half) return Math.max(d - h.r, -d * Math.sin(Math.min(half - a, Math.PI / 2)));
      return Math.max(d * Math.sin(Math.min(a - half, Math.PI / 2)), d - h.r);
    }
    case 'line': {
      const sy = Math.sin(h.yaw), cy = Math.cos(h.yaw);
      return strip(dx * sy + dz * cy, dx * cy - dz * sy, h.r, h.w ?? 1);
    }
    case 'cross': {
      const n = h.arms || 4;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        const a = h.yaw + i * Math.PI * 2 / n, sy = Math.sin(a), cy = Math.cos(a);
        best = Math.min(best, strip(dx * sy + dz * cy, dx * cy - dz * sy, h.r, h.w ?? 1));
      }
      return best;
    }
    default: return d - h.r;
  }
}

/** Whether (x, z) is in the mark, or within pad of it. */
export const covers = (h, x, z, pad = 0) => edge(h, x, z) < pad;

/** As far out as the mark reaches from its own (x, z): for anything that only wants to know if it's near. */
export const reachOf = (h) => h.r + (h.shape === 'line' || h.shape === 'cross' ? h.w ?? 1 : 0);

/**
 * The way out of every mark (x, z) is in or within pad of: [x, z] to step to, or null if it's clear of them all.
 * open(x, z) says whether there's floor to stand on there: with it, a step into the rock is turned along it.
 */
export function wayOut(marks, x, z, pad = 0.8, open = null) {
  let px = 0, pz = 0, any = false;
  const e = 0.25;
  for (const h of marks) {
    if (Math.hypot(x - h.x, z - h.z) > reachOf(h) + pad + 1) continue;
    const d = edge(h, x, z);
    if (d > pad) continue;
    // (Downhill on the mark's own field: the nearest edge. Dead on its middle there's no slope, so any way will do.)
    let gx = edge(h, x + e, z) - edge(h, x - e, z), gz = edge(h, x, z + e) - edge(h, x, z - e), L = Math.hypot(gx, gz);
    if (L < 1e-3) { const a = (h.seed || 0.37) * 6.283; gx = Math.sin(a); gz = Math.cos(a); L = 1; }
    const out = pad + 0.6 - d;
    px += gx / L * out; pz += gz / L * out; any = true;
  }
  if (!any) return null;
  // (Two marks pulling opposite ways cancel: then sideways from the first.)
  if (Math.hypot(px, pz) < 0.3) { const t = px; px = -pz + 0.6; pz = t + 0.6; }
  const clear = (qx, qz) => { for (const h of marks) if (edge(h, qx, qz) < pad * 0.5) return false; return !open || open(qx, qz); };
  const tx = x + px, tz = z + pz;
  if (clear(tx, tz)) return [tx, tz];
  // Downhill only goes into another mark, or another arm of the same one, or the rock: then the nearest clear ground, looked
  // for all round, the nearer the way it was already going the better.
  const L = Math.hypot(px, pz) || 1;
  for (const d of [0.75, 1.25, 2, 3, 4.5, 6.5, 9, 13]) {
    let best = null, bs = -2;
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, qx = x + Math.sin(a) * d, qz = z + Math.cos(a) * d;
      if (!clear(qx, qz)) continue;
      const score = (Math.sin(a) * px + Math.cos(a) * pz) / L;
      if (score > bs) { bs = score; best = [qx, qz]; }
    }
    if (best) return best;
  }
  return [tx, tz];
}

/** A mark as the page needs it (auto-play reads these): its shape and where, and whether it's biting yet. */
export const markOut = (h) => ({ shape: h.shape, x: h.x, z: h.z, r: h.r, r0: h.r0 || 0, yaw: h.yaw || 0, half: h.half ?? 0.5, w: h.w ?? 1, arms: h.arms || 4, seed: h.seed || 0, live: h.t >= h.fuse, jump: !!h.jump });
