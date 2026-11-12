// Pieces the party dungeons' layouts are written with (src/core/delve-vaults.js and the rest): plain sums, so a room can
// be moved and what joins it follows.

// A castle's room: its middle, half its width (x) and length (z), its floor, how high its roof is over that.
export const R = (id, name, x, z, hx, hz, y, roof, o = {}) => ({ id, name, x, z, hx, hz, y, roof, ...o });
// A cave's room: its middle, its radius, its floor, how high its roof can rise.
export const C = (id, name, x, z, r, y, roof, o = {}) => ({ id, name, x, z, r, y, roof, ...o });

// A cave's tunnel between two round rooms: from a little inside the edge of one to a little inside the edge of the other,
// bowed `bend` metres to one side at its middle (the left of the way from a to b, as you'd walk it; below zero, the right).
export function link(rooms, a, b, bend = 0, w = 3.2, o = {}) {
  const A = rooms.find((r) => r.id === a), B = rooms.find((r) => r.id === b);
  if (!A || !B) throw new Error(`link: no room ${A ? b : a}`);
  const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  const p0 = [A.x + ux * (A.r - 2), A.z + uz * (A.r - 2)], p1 = [B.x - ux * (B.r - 2), B.z - uz * (B.r - 2)];
  const mid = [(p0[0] + p1[0]) / 2 + uz * bend, (p0[1] + p1[1]) / 2 - ux * bend];
  const round = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  return { pts: [p0, mid, p1].map(round), w, ...o };
}
// A point of a round room: `far` of its radius out from its middle, at angle a (0 north, turning east).
export const at = (rooms, id, far, a) => { const r = rooms.find((q) => q.id === id); return [Math.round((r.x + Math.sin(a) * r.r * far) * 10) / 10, Math.round((r.z - Math.cos(a) * r.r * far) * 10) / 10]; };
// A blind cut off a round room: out through its wall at angle a (0 north, turning east), `len` metres past it.
export function niche(rooms, id, a, len = 8, w = 1.7, o = {}) {
  const r = rooms.find((q) => q.id === id), sx = Math.sin(a), sz = -Math.cos(a);
  const round = (v) => Math.round(v * 10) / 10;
  return { pts: [[round(r.x + sx * (r.r - 2)), round(r.z + sz * (r.r - 2))], [round(r.x + sx * (r.r + len)), round(r.z + sz * (r.r + len))]], w, niche: true, ...o };
}
