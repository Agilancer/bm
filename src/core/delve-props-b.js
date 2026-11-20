// Things that stand in Castle Velscour's later dungeons (src/core/delve-castle-b.js: the Clockworks, the Menagerie of
// Chains, the Ossuary Chapel, the Hall of Mirrors), built as src/core/delve-build.js PROPS are and taken into them: a prop
// is (K, d, p, x, y, z), K the Kit, d the delve, p the prop as written, (x, y, z) where it stands on its floor.
//
// His castle: nothing here makes a cross or a T. A wheel has three spokes or five, never four; bars stand upright and
// nothing runs across them; a frame is two posts and a head, the posts stopping at it; a clock's face has marks round it
// and no numerals; nothing rings (the hours are struck on gongs of iron: the bell is Tessariel's).
import { caveRoofY } from './dungeon.js';

const TAU = Math.PI * 2, NO = { collide: false };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// A bar from a to b, t thick: four sides. (As src/core/places.js beam; its ends are in what it joins.)
function bar(K, layer, a, b, t) {
  const d = unit(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], u = unit(cross(d, up)), v = cross(u, d);
  const C = (p, i) => { const su = (i === 0 || i === 3 ? -1 : 1) * t / 2, sv = (i < 2 ? -1 : 1) * t / 2; return [p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv]; };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; K.quad(layer, C(a, i), C(a, j), C(b, j), C(b, i)); }
}
// A frame facing yaw at (x, y, z): F(u across, h up, o out toward the room) is a point of it; F.n the way it faces.
function frame(x, y, z, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), F = (u, h, o = 0) => [x + u * c + o * s, y + h, z - u * s + o * c];
  F.n = [s, 0, c];
  return F;
}
// A round of something upright, facing F.n: slices across it, widest at the middle (as his mark's round of red is laid:
// a fan from its middle runs its painting out in rays, and a rayed round is a sunburst, which is hers). r0: a ring, the
// middle left open.
function round(K, layer, F, cy, r, o, N = 16, r0 = 0) {
  if (r0) {
    for (let i = 0; i < N; i++) { const a = i / N * TAU, b = (i + 1) / N * TAU; K.quad(layer, F(Math.cos(a) * r0, cy + Math.sin(a) * r0, o), F(Math.cos(a) * r, cy + Math.sin(a) * r, o), F(Math.cos(b) * r, cy + Math.sin(b) * r, o), F(Math.cos(b) * r0, cy + Math.sin(b) * r0, o), F.n); }
    return;
  }
  const n = Math.max(6, Math.round(N * 0.7)), w = (v) => Math.sqrt(Math.max(0, r * r - v * v));
  for (let i = 0; i < n; i++) { const v0 = -r + 2 * r * i / n, v1 = -r + 2 * r * (i + 1) / n; K.quad(layer, F(-w(v0), cy + v0, o), F(w(v0), cy + v0, o), F(w(v1), cy + v1, o), F(-w(v1), cy + v1, o), F.n); }
}
const skull = (K, x, y, z, r, turn = 0) => { K.drum('pale:stone', x, y, z, r * 0.8, r * 0.9, 6, { r2: r, collide: false, turn, open: true }); K.cone('pale:stone', x, y + r * 0.9, z, r, r * 0.7, 6, turn); };

export const PROPS_B = {
  // ---- the Clockworks ----
  // A wheel of the works, upright against a wall and facing yaw out from it (flat: lying, a floor to stand on or a
  // platter): its rim, its teeth, its hub, and three spokes or five (spokes; never four). up: its middle over the floor.
  gear(K, d, p, x, y, z) {
    const r = p.r, L = p.layer || 'p2_bronze_plates', teeth = Math.max(8, Math.round(r * 5)), sp = p.spokes === 5 ? 5 : 3, turn = p.turn || 0;
    if (p.flat) {
      const h = p.h || 0.35, y0 = y + (p.up || 0);
      K.drum(L, x, y0, z, r, h, Math.max(12, teeth), { collide: false, turn });
      for (let k = 0; k < teeth; k++) { const a = turn + k / teeth * TAU; K.box(L, x + Math.cos(a) * (r + 0.12), y0, z + Math.sin(a) * (r + 0.12), 0.16, h, Math.PI * r / teeth * 0.5, -a, NO); }
      K.drum('iron', x, y0 + h, z, Math.max(0.25, r * 0.16), 0.3, 8, NO);
      return;
    }
    const F = frame(x, y, z, p.yaw || 0), cy = p.up ?? r + 0.4, o = p.out ?? 0.25, t = Math.max(0.12, r * 0.07);
    const P = (a, rr, oo = o) => F(Math.cos(a) * rr, cy + Math.sin(a) * rr, oo);
    const N = Math.max(12, teeth);
    for (let k = 0; k < N; k++) { const a = turn + k / N * TAU, b = turn + (k + 1) / N * TAU; bar(K, L, P(a, r), P(b, r), t * 1.6); }
    for (let k = 0; k < teeth; k++) { const a = turn + (k + 0.5) / teeth * TAU; bar(K, L, P(a, r), P(a, r + Math.max(0.16, r * 0.1)), t * 1.2); }
    for (let k = 0; k < sp; k++) { const a = turn + k / sp * TAU + 0.3; bar(K, L, P(a, r * 0.18), P(a, r), t); }
    round(K, 'iron', F, cy, r * 0.2, o + t, 10);
    bar(K, 'iron', F(0, cy, 0), F(0, cy, o + t * 1.5), t * 1.6);
  },
  // A pendulum: its rod down from the roof, its bob a lens of bronze, hung a little off the plumb (lean: metres across,
  // along x or, with alongZ, along z). up: the bob's middle over the floor.
  pendulum(K, d, p, x, y, z) {
    const top = caveRoofY(x, z), up = p.up ?? 2.2, lx = p.alongZ ? 0 : (p.lean || 0), lz = p.alongZ ? (p.lean || 0) : 0, r = p.r || 1.1;
    bar(K, 'iron', [x, top, z], [x + lx, y + up + r * 0.7, z + lz], 0.14);
    K.drum('p2_bronze_plates', x + lx, y + up - r * 0.35, z + lz, r * 0.55, r * 0.35, 12, { r2: r, open: true, collide: false });
    K.drum('p2_bronze_plates', x + lx, y + up, z + lz, r, r * 0.35, 12, { r2: r * 0.55, collide: false });
    K.cone('iron', x + lx, y + up - r * 0.35 - 0.5, z + lz, 0.001, 0.5, 6);
  },
  // A clock's face on a wall, facing yaw: a pale round, a ring of iron, twelve marks round it (marks, not numerals), and
  // two hands from its middle at an open angle (hands: [long, short], radians; they never lie in one line). lit: the face
  // glows, the dial seen from behind.
  clockface(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), r = p.r || 2.4, cy = p.up ?? r + 1, o = 0.06, [ha, hb] = p.hands || [1.1, 2.6];
    const P = (a, rr, oo) => F(Math.cos(a) * rr, cy + Math.sin(a) * rr, oo);
    round(K, p.lit ? 'pale:flame' : 'pale:stone', F, cy, r, o, 20);
    for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, b = (k + 1) / 20 * TAU; bar(K, 'iron', P(a, r, o + 0.05), P(b, r, o + 0.05), Math.max(0.1, r * 0.06)); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + 0.26; bar(K, 'iron', P(a, r * 0.8, o + 0.04), P(a, r * 0.93, o + 0.04), Math.max(0.05, r * 0.035)); }
    bar(K, 'iron', P(ha, 0, o + 0.08), P(ha, r * 0.82, o + 0.08), Math.max(0.06, r * 0.045));
    bar(K, 'iron', P(hb, 0, o + 0.1), P(hb, r * 0.52, o + 0.1), Math.max(0.08, r * 0.06));
    round(K, 'iron', F, cy, r * 0.07, o + 0.14, 8);
  },
  // A gong of iron for striking the hours on: two posts, a head between them (the posts stop at it), the gong hung from
  // it on two chains, a boss at its middle.
  gong(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), r = p.r || 1.3, h = r * 2 + 1.4;
    for (const u of [-1, 1]) K.box('dark:wood', ...F(u * (r + 0.45), 0, 0), 0.14, h, 0.14, p.yaw || 0, NO);
    bar(K, 'dark:wood', F(-(r + 0.45), h + 0.13, 0), F(r + 0.45, h + 0.13, 0), 0.28);
    for (const u of [-1, 1]) bar(K, 'iron', F(u * r * 0.5, h - 0.1, 0), F(u * r * 0.5, 0.6 + r + Math.sqrt(1 - 0.25) * r, 0), 0.035);
    for (const s of [-1, 1]) { const G = frame(...F(0, 0, 0), (p.yaw || 0) + (s < 0 ? Math.PI : 0)); round(K, 'iron', G, 0.6 + r, r, 0.03, 16); round(K, 'p2_bronze_plates', G, 0.6 + r, r * 0.28, 0.07, 10); }
  },
  // Clock weights hung in a shaft: so many (n) long drums of iron on chains from the roof, at different heights.
  weights(K, d, p, x, y, z) {
    const n = p.n || 3, top = caveRoofY(x, z);
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + (p.turn || 0), wx = x + Math.cos(a) * (p.r || 1.6), wz = z + Math.sin(a) * (p.r || 1.6), up = (p.up || 3) + ((k * 7) % 5) * 1.3;
      bar(K, 'iron', [wx, top, wz], [wx, y + up + 2.2, wz], 0.05);
      K.drum('iron', wx, y + up, wz, 0.42, 2.2, 8, NO); K.cone('iron', wx, y + up + 2.2, wz, 0.42, 0.4, 8);
    }
  },
  // The lift: a round platform of iron plate in a cage of upright bars, a ring round their heads, hung from the roof on one
  // chain; the winding post beside it, a slot in its head for the Winding Key.
  lift(K, d, p, x, y, z) {
    const r = p.r || 2.2, top = caveRoofY(x, z), h = 3.2;
    K.drum('iron', x, y, z, r, 0.16, 12, NO);
    for (let k = 0; k < 9; k++) { const a = (k + 0.5) / 9 * TAU; if (Math.abs(Math.atan2(Math.sin(a - (p.face ?? Math.PI / 2)), Math.cos(a - (p.face ?? Math.PI / 2)))) < 0.5) continue; K.box('iron', x + Math.cos(a) * (r - 0.1), y + 0.16, z + Math.sin(a) * (r - 0.1), 0.04, h, 0.04, 0, NO); }
    K.drum('iron', x, y + h + 0.1, z, r, 0.12, 12, { open: true, collide: false });
    K.cone('iron', x, y + h + 0.2, z, r, 1.1, 12);
    bar(K, 'iron', [x, y + h + 1.2, z], [x, top, z], 0.09);
    const wx = x + Math.cos(p.face ?? Math.PI / 2) * (r + 1.3) + 1.2, wz = z + Math.sin(p.face ?? Math.PI / 2) * (r + 1.3);
    K.drum('p2_bronze_plates', wx, y, wz, 0.3, 1.3, 8, NO); K.drum('iron', wx, y + 1.3, wz, 0.36, 0.14, 8, NO);
  },
  // ---- the Menagerie of Chains ----
  // A beast's cage on the floor: bars upright all round it, a plate for a lid, a chain from the lid to the roof. Nothing
  // across the bars. open: its front (toward +z, or the way `face` says) stands open, the door's bars swung aside.
  beastcage(K, d, p, x, y, z) {
    // (turn: hx and hz are what it takes up of the floor, and it's turned a quarter: its own length lies along z.)
    const hx = (p.turn ? p.hz : p.hx) || 2, hz = (p.turn ? p.hx : p.hz) || 1.6, h = p.h || 2.8, yaw = p.yaw || 0, F = frame(x, y, z, yaw), gap = 0.32;
    const post = (u, o) => K.box('iron', ...F(u, 0, o), 0.035, h, 0.035, yaw, NO);
    for (let u = -hx; u <= hx + 0.01; u += gap) { post(u, -hz); if (!p.open || Math.abs(u) > hx * 0.55) post(u, hz); }
    for (let o = -hz + gap; o < hz - 0.01; o += gap) { post(-hx, o); post(hx, o); }
    K.box('iron', ...F(0, h, 0), hx + 0.08, 0.08, hz + 0.08, yaw, NO);
    K.box('dark:stone', ...F(0, -0.02, 0), hx + 0.1, 0.1, hz + 0.1, yaw, NO);
    if (p.straw !== false) K.box('p2_straw_ground', ...F(0, 0.08, 0), hx - 0.15, 0.06, hz - 0.15, yaw, NO);
    if (p.open) for (let u = 0; u <= hx * 0.55; u += gap) K.box('iron', ...F(hx * 0.55 + u * 0.3, 0, hz + u), 0.035, h, 0.035, yaw, NO);
    // (Hung: on two chains, one from each end of its lid. One from its middle was a post under a beam.)
    if (p.hang) for (const u of [-1, 1]) { const q = F(u * hx, 0, 0); bar(K, 'iron', [q[0], y + h + 0.08, q[2]], [q[0], caveRoofY(q[0], q[2]), q[2]], 0.05); }
    if (p.bones) { skull(K, ...F(-hx * 0.4, 0.14, 0.2), 0.16, 1); bar(K, 'pale:stone', F(0.2, 0.2, -0.3), F(0.9, 0.22, 0.2), 0.05); }
  },
  // A post the chains are made fast to: a stump of dark stone, an iron ring through its head, a chain off it along the floor.
  chainpost(K, d, p, x, y, z) {
    const r = p.r || 0.9, h = p.h || 2.6;
    K.drum('dark:stone', x, y - 0.2, z, r, h + 0.2, 8, { r2: r * 0.8, collide: false });
    K.drum('iron', x, y + h * 0.72, z, r * 0.86, 0.22, 8, { open: true, collide: false });
    K.drum('iron', x, y + h, z, r * 0.5, 0.1, 8, NO);
    const a = (x * 0.7 + z * 0.3) % TAU;
    bar(K, 'iron', [x + Math.cos(a) * r, y + h * 0.75, z + Math.sin(a) * r], [x + Math.cos(a) * (r + 1.6), y + 0.06, z + Math.sin(a) * (r + 1.6)], 0.06);
    bar(K, 'iron', [x + Math.cos(a) * (r + 1.6), y + 0.06, z + Math.sin(a) * (r + 1.6)], [x + Math.cos(a + 0.5) * (r + 3.2), y + 0.06, z + Math.sin(a + 0.5) * (r + 3.2)], 0.06);
  },
  // Meat on hooks: so many (n) joints hung from the roof on single hooks along x (or, with alongZ, along z), none across another.
  hooks(K, d, p, x, y, z) {
    const n = p.n || 4, top = caveRoofY(x, z), up = p.up || 2.2;
    for (let k = 0; k < n; k++) {
      const u = (k - (n - 1) / 2) * 1.3, hx = x + (p.alongZ ? 0 : u), hz = z + (p.alongZ ? u : 0);
      bar(K, 'iron', [hx, top, hz], [hx, y + up + 1.1, hz], 0.03);
      K.drum('blood:cloth_red', hx, y + up, hz, 0.2, 1.1, 6, { r2: 0.34, collide: false, turn: k });
      K.cone('pale:stone', hx, y + up - 0.25, hz, 0.001, 0.25, 5);
    }
  },
  // ---- the Hall of Mirrors ----
  // A great glass on a wall, facing yaw: a frame of dark iron, two posts and an arched head, the glass in it. w, h: half
  // its width, its height. broken: the glass is out of it, black behind, shards at its foot. draped: a cloth hung over it.
  bigmirror(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), w = p.w || 1.4, h = p.h || 4.2, up = p.up ?? 0.3, t = 0.2, L = p.frame || 'gold';
    for (const u of [-1, 1]) bar(K, L, F(u * (w + t / 2), up, 0.06), F(u * (w + t / 2), up + h, 0.06), t);
    const N = 8;
    for (let k = 0; k < N; k++) { const a = Math.PI - k / N * Math.PI, b = Math.PI - (k + 1) / N * Math.PI; bar(K, L, F(Math.cos(a) * (w + t / 2), up + h + Math.sin(a) * w * 0.6, 0.06), F(Math.cos(b) * (w + t / 2), up + h + Math.sin(b) * w * 0.6, 0.06), t); }
    bar(K, L, F(-w, up, 0.06), F(w, up, 0.06), t);
    // (Its glass is the game's bare iron, which is a mirror: it takes the room's light and gives it back.)
    const glass = p.broken ? 'char:stone' : p.draped ? (p.cloth || 'dark:cloth_oat') : 'iron';
    K.quad(glass, F(-w, up + 0.08, 0.04), F(w, up + 0.08, 0.04), F(w, up + h, 0.04), F(-w, up + h, 0.04), F.n);
    for (let k = 0; k < N; k++) { const a = Math.PI - k / N * Math.PI, b = Math.PI - (k + 1) / N * Math.PI; K.quad(glass, F(0, up + h, 0.04), F(Math.cos(a) * w, up + h + Math.sin(a) * w * 0.6, 0.04), F(Math.cos(b) * w, up + h + Math.sin(b) * w * 0.6, 0.04), F(Math.cos(b) * w, up + h + Math.sin(b) * w * 0.6, 0.04), F.n); }
    if (p.broken) for (let k = 0; k < 5; k++) { const q = F(-w + (k + 0.5) * w * 0.4, 0, 0.5 + (k % 3) * 0.35); K.spike('ice', q[0], q[1], q[2], 0.14 + (k % 2) * 0.08, 0.3 + (k % 3) * 0.2, 3, k); }
    if (p.draped) { K.quad(p.cloth || 'dark:cloth_oat', F(-w - 0.3, up + h * 0.2, 0.2), F(w + 0.3, up + h * 0.2, 0.2), F(w + 0.2, up + h + w * 0.6, 0.12), F(-w - 0.2, up + h + w * 0.6, 0.12), F.n); }
  },
  // A standing glass on the floor, on a foot: a pane a man and a half high, seen from both sides, a gold post each end
  // (and every two metres of a long run of it).
  pane(K, d, p, x, y, z) {
    const yaw = p.yaw || 0, w = p.w || 0.9, h = p.h || 2.8;
    for (const s of [0, Math.PI]) { const F = frame(x, y, z, yaw + s); K.quad('iron', F(-w, 0.3, 0.03), F(w, 0.3, 0.03), F(w, 0.3 + h, 0.03), F(-w, 0.3 + h, 0.03), F.n); }
    const F = frame(x, y, z, yaw);
    // (A post at each end and every two metres between: a long run of it is a wall of panes.)
    const n = Math.max(1, Math.round(w / 1.1));
    // (No rail along their heads: a rail over a row of posts is a T at every post. Each post ends in a point of its own.)
    for (let k = 0; k <= n; k++) { const u = -w - 0.05 + (2 * w + 0.1) * k / n, q = F(u, 0.4 + h, 0); bar(K, 'gold', F(u, 0.2, 0), q, 0.1); K.cone('gold', q[0], q[1], q[2], 0.09, 0.3, 4); }
    K.box('char:stone', x, y, z, w + 0.2, 0.25, 0.35, yaw, NO);
  },
  // Broken glass on the floor: shards standing out of a scatter of it.
  shards(K, d, p, x, y, z) {
    const r = p.r || 1.4;
    K.disc('ice', x, y + 0.03, z, r * 0.8, 9);
    for (let k = 0; k < 7; k++) { const a = k * 2.4 + x, o = r * (0.25 + 0.7 * ((k * 5) % 7) / 7); K.spike('ice', x + Math.cos(a) * o, y, z + Math.sin(a) * o, 0.1 + (k % 3) * 0.06, 0.25 + (k % 4) * 0.22, 3, k, [Math.cos(a) * 0.3, Math.sin(a) * 0.3]); }
  },
  // ---- the Ossuary Chapel ----
  // A wall of skulls, facing yaw: rows of them set in pale mortar, w half its width, h its height. A shelf of long bones
  // along its foot.
  skullwall(K, d, p, x, y, z) {
    const F = frame(x, y, z, p.yaw || 0), w = p.w || 3, h = p.h || 3.2, yaw = p.yaw || 0;
    K.box('p2_bone_plaster', ...F(0, 0, -0.12), w, h, 0.14, yaw, NO);
    for (let r = 0; r * 0.42 < h - 0.5; r++) for (let u = -w + 0.25 + (r % 2) * 0.2; u <= w - 0.2; u += 0.42) { const q = F(u, 0.3 + r * 0.42, 0.06); skull(K, q[0], q[1], q[2], 0.15, yaw + u); }
    for (let u = -w + 0.2; u <= w - 0.2; u += 0.22) { const a = F(u, 0.06, 0.1), b = F(u, 0.06, 0.75); bar(K, 'pale:stone', a, b, 0.07); }
  },
  // A candle-tree of bone: a tall stem, three arms out of it at different heights (each rising, none level across it),
  // a red flame on each and one on its head.
  bonetree(K, d, p, x, y, z) {
    const h = p.h || 3.2;
    K.drum('pale:stone', x, y, z, 0.3, 0.2, 8, { r2: 0.14, collide: false });
    bar(K, 'pale:stone', [x, y + 0.2, z], [x, y + h, z], 0.1);
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * TAU + x, hy = y + h * (0.45 + k * 0.14), ex = x + Math.cos(a) * 0.7, ez = z + Math.sin(a) * 0.7;
      bar(K, 'pale:stone', [x, hy, z], [ex, hy + 0.5, ez], 0.06);
      skull(K, ex, hy + 0.5, ez, 0.1, a); K.cone('blood:flame', ex, hy + 0.7, ez, 0.06, 0.24, 5);
    }
    skull(K, x, y + h, z, 0.13); K.cone('blood:flame', x, y + h + 0.24, z, 0.08, 0.3, 5);
  },
  // A stall for his chapel: a long seat with a high back, in dark boards, facing +z (or, flip, -z). hx: half its length.
  // (Plain boards: the game's own plank has ironwork painted on it that, a pew's length of it, is a row of small crosses.)
  stall(K, d, p, x, y, z) {
    const hx = p.hx || 4, s = p.flip ? -1 : 1, L = p.layer || 'dark:p2_worn_floorboards';
    K.box(L, x, y + 0.42, z, hx, 0.08, 0.34, 0, NO);
    K.box(L, x, y, z - s * 0.36, hx, 1.5, 0.06, 0, NO);
    for (const u of [-1, 1]) K.box(L, x + u * (hx - 0.05), y, z, 0.06, 0.9, 0.36, 0, NO);
    K.box('pale:stone', x, y + 1.5, z - s * 0.36, hx, 0.07, 0.09, 0, NO);
  },
  // His font: a bowl of black stone on a stem of stacked skulls, red in it.
  bonefont(K, d, p, x, y, z) {
    for (let k = 0; k < 4; k++) skull(K, x, y + k * 0.24, z, 0.2, k * 1.3);
    K.drum('char:stone', x, y + 0.96, z, 0.35, 0.4, 10, { r2: p.r || 1, collide: false });
    K.disc('blood:cloth_red', x, y + 1.33, z, (p.r || 1) * 0.92, 10);
  },
};
