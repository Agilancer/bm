// Things that stand in the Redoubt under the Sill (src/core/delve-redoubt.js, docs/FIRST-VISIT.md), built as
// src/core/delve-build.js PROPS are and taken into them: a prop is (K, d, p, x, y, z), K the Kit, d the delve, p the prop as
// written, (x, y, z) where it stands on its floor.
//
// His, so nothing of hers: no ring with anything round it (a ring read as a cog, or her sun), no cross and no T. Bars stand
// upright and nothing runs across them but at their heads and feet.
import { bar, fire, rod } from './delve-build.js';

const NO = { collide: false };
// A frame facing yaw at (x, y, z): F(u across, h up, o out toward where it faces) is a point of it.
function frame(x, y, z, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return (u, h, o = 0) => [x + u * c + o * s, y + h, z - u * s + o * c];
}
const glow = (K, d, x, y, z, r, hue) => K.fires.push({ delve: d.key, hue: hue || d.look.flame, kind: 'glow', x, y, z, w: r, h: r, ember: 0, seed: 0 });

export const PROPS_RD = {
  // His mark as his Redoubt shows it: his skull banner (the PH2 pack's painting, two wide to three long) hung flat on the wall
  // from an iron rod, facing yaw, its foot at up; a basket of his red fire either side of it. r: how big (its height 2.8 r).
  skullmark(K, d, p, x, y, z) {
    const r = p.r || 1, hh = r * 2.8, hw = hh / 3, yaw = p.yaw || 0, foot = y + (p.up ?? 3), top = foot + hh;
    // (The banner's own way across, as src/core/delve-build.js banner hangs one: its painting the right way round.)
    const F = frame(x, 0, z, yaw + Math.PI), n = [Math.sin(yaw), 0, Math.cos(yaw)], o = -0.1;
    K.quad('p2_banner_skull', F(-hw, top, o), F(hw, top, o), F(hw, top - hh, o), F(-hw, top - hh, o), n, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    const [rx, , rz] = F(0, 0, o - 0.02);
    K.box('iron', rx, top - 0.04, rz, hw + 0.2, 0.08, 0.05, yaw, NO);
    for (const sg of [-1, 1]) {
      const [bx, , bz] = F(sg * (hw + 0.55), 0, o - 0.3), by = foot + hh * 0.35;
      rod(K, 'iron', ...F(sg * (hw + 0.55), by - 0.5, o + 0.05), bx, by - 0.05, bz, 0.03);
      K.drum('iron', bx, by - 0.12, bz, 0.16, 0.22, 7, { r2: 0.26, open: true, collide: false });
      fire(K, d, bx, by + 0.08, bz, 0.18, 0.5, { hue: 'blood:flame', glow: 1.2 });
    }
  },
  // A debtor's cell, stood on the floor against a wall: iron bars as tall as a man and more, a plate over them and one under,
  // its door hung open on the side it faces (yaw: the Pen-Warden lets them out), and, if `held`, what's left of whoever
  // couldn't pay slumped against its back. w: its half width.
  cell(K, d, p, x, y, z) {
    const w = p.w || 1.2, h = p.h || 2.6, yaw = p.yaw || 0, F = frame(x, y, z, yaw);
    K.box('dark:block', x, y, z, w + 0.08, 0.08, w + 0.08, yaw, NO);
    K.box('iron', x, y + h, z, w + 0.08, 0.07, w + 0.08, yaw, NO);
    const upright = (a, b) => rod(K, 'iron', a[0], y + 0.08, a[2], b[0], y + h, b[2], 0.028);
    for (let t = -w; t <= w + 0.01; t += 0.3) {
      upright(F(t, 0, -w), F(t, 0, -w));
      upright(F(-w, 0, t), F(-w, 0, t)); upright(F(w, 0, t), F(w, 0, t));
      // (The front: the door's gap in the middle.)
      if (Math.abs(t) > 0.55) upright(F(t, 0, w), F(t, 0, w));
    }
    // The door, swung out: its uprights between a rail at its head and one at its foot.
    const hinge = F(0.55, 0, w), out = F(0.55 + 0.45, 0, w + 0.95);
    for (const hh of [0.15, h - 0.12]) rod(K, 'iron', hinge[0], y + hh, hinge[2], out[0], y + hh, out[2], 0.03);
    for (let k = 1; k <= 4; k++) { const t = k / 4.4, bx = hinge[0] + (out[0] - hinge[0]) * t, bz = hinge[2] + (out[2] - hinge[2]) * t; rod(K, 'iron', bx, y + 0.15, bz, bx, y + h - 0.12, bz, 0.024); }
    if (p.held) debtor(K, F, -w + 0.3, p.held);
  },
  // A trough of black water for the quench: dark stone, long.
  trough(K, d, p, x, y, z) {
    K.box('dark:block', x, y, z, p.hx, 0.75, p.hz, p.yaw || 0, NO);
    K.box('lake', x, y + 0.7, z, p.hx - 0.12, 0.03, p.hz - 0.12, p.yaw || 0, NO);
  },
  // A rack of his plate half made: two posts and a head, the breastplates hung from it on hooks, not yet blacked; facing yaw.
  platerack(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, F = frame(x, y, z, yaw), n = p.n || 4, half = (n - 1) * 0.55 + 0.5;
    for (const s of [-1, 1]) { const a = F(s * half, 0); rod(K, 'dark:wood', a[0], y, a[2], a[0], y + 2.3, a[2], 0.07); }
    bar(K, 'dark:wood', F(-half, 2.3), F(half, 2.3), 0.08);
    for (let k = 0; k < n; k++) {
      const [px, , pz] = F((k - (n - 1) / 2) * 1.1, 0, 0.05);
      rod(K, 'iron', px, y + 2.3, pz, px, y + 2.0, pz, 0.015);
      K.drum('iron', px, y + 1.25, pz, 0.28, 0.62, 7, { r2: 0.34, collide: false, turn: yaw });
      K.cone('iron', px, y + 1.87, pz, 0.34, 0.13, 7, yaw);
    }
  },
};

// Whoever couldn't pay, slumped where they sat down against the bars: rags and bone. F the cell's frame, o how far from its
// middle the back is (toward the door's side is +), seed which way it's fallen.
function debtor(K, F, o, seed) {
  const lean = (seed % 2 ? 1 : -1) * 0.12;
  const hip = F(lean, 0.22, o + 0.22), chest = F(lean * 1.6, 0.86, o + 0.02);
  bar(K, 'dark:cloth_oat', hip, chest, 0.17, 0.15);
  // (The head lolled to one side, onto a shoulder.)
  const hd = F(lean * 3, 1.02, o + 0.12);
  K.drum('pale:stone', hd[0], hd[1], hd[2], 0.1, 0.17, 6, { r2: 0.12, collide: false, open: true });
  K.cone('pale:stone', hd[0], hd[1] + 0.17, hd[2], 0.12, 0.1, 6);
  for (const s of [-1, 1]) {
    const knee = F(lean + s * 0.17, 0.42, o + 0.62), foot = F(lean + s * 0.22, 0.07, o + 0.98);
    bar(K, 'cloth_oat', F(lean + s * 0.1, 0.2, o + 0.26), knee, 0.075, 0.065);
    bar(K, 'pale:stone', knee, foot, 0.05, 0.04);
    // (Arms down at the sides, the hands open on the floor.)
    const sh = F(lean * 1.5 + s * 0.2, 0.8, o + 0.05), hand = F(lean + s * 0.36, 0.1, o + 0.34);
    bar(K, 'cloth_oat', sh, hand, 0.05, 0.035);
  }
}
