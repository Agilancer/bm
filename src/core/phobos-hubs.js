// Phobos's three hubs (docs/PHOBOS-LAYOUT.md, "Hubs"): walled yards off the street where the living who aren't his keep
// house, each with a hall you go into (two storeys, its upstairs: a house of src/core/phobos-build.js phobosHouses, with a
// hub flag) and someone in the yard with work for you (src/folk/people.js HUBFOLK; their quests src/folk/phobos-quests.js).
//   The Pennyless: thieves who give it back, behind the burnt-out chandlery on Ash Lane in the Cinder Quarter.
//   The Quiet Watch: knights in hiding, behind a dye works on the High Loop on the Tanners' Steps. Nothing of Tessariel's
//     shows here, not a mark (the V and T rule): they're plain men and women at the vats.
//   The Ashwardens: the demon hunters, walled into a charnel house on the High Loop at the Bone Yards' north end.
// Each: { key, name, district, x, z, yaw, front, hx, hz } — a yard hx along its street by hz deep, its gate in the side
// toward the street (local z = front * hz). Placed off the streets and clear of the haunts (tools: scratchpad hubspots).
import { terrainHeight } from './terrain.js';

const Y = (x, z) => terrainHeight(x, z);

export const HUBS = [
  { key: 'pennyless', name: 'The Pennyless', district: 'cinder', x: 9617, z: -292, yaw: 1.107, front: -1, hx: 15, hz: 12, wall: 'ph_burnt_wall' },
  { key: 'watch', name: 'The Quiet Watch', district: 'tanners', x: 10004, z: 637, yaw: -2.858, front: 1, hx: 15, hz: 12, wall: 'ph_daub' },
  { key: 'ash', name: 'The Ashwardens', district: 'bones', x: 10054, z: -552, yaw: -0.464, front: -1, hx: 15, hz: 12, wall: 'pale:block' },
];
export const HUB = Object.fromEntries(HUBS.map((h) => [h.key, h]));

// A point in a hub's own frame (x along its street, z out toward it by front) in the world.
export const hubAt = (h, lx, lz) => { const c = Math.cos(h.yaw), s = Math.sin(h.yaw), z = lz * h.front; return [h.x + lx * c + z * s, h.z - lx * s + z * c]; };
// Whether (x, z) is inside a hub's yard (pad: metres more all round). Nothing of the city's is built there.
export function inHub(x, z, pad = 0) {
  for (const h of HUBS) {
    const c = Math.cos(h.yaw), s = Math.sin(h.yaw), dx = x - h.x, dz = z - h.z;
    if (Math.abs(dx * c - dz * s) < h.hx + pad && Math.abs(dx * s + dz * c) < h.hz + pad) return h;
  }
  return null;
}
// Where each hub's giver stands, at their own work: Lowe at the end of the long table, Treller among the vats, Grail by
// the pyre; facing the gate.
const STATION = { pennyless: [-4.2, 1.5], watch: [-3.4, 5], ash: [5.4, 2] };
export function hubPost(key) {
  const h = HUB[key], [x, z] = hubAt(h, ...STATION[key]);
  const [gx, gz] = hubAt(h, 0, h.hz);
  return { post: [+x.toFixed(1), +z.toFixed(1)], face: +Math.atan2(gx - x, gz - z).toFixed(3) };
}
// Smoke and steam that go up from the yards, seen over their walls (src/main.js emitAmbient): the Ashwardens' pyre, the
// Pennyless' cookfire, the madder vat on the boil. { x, y, z, big, steam }
export const HUB_SMOKE = [
  { key: 'ash', at: [8, 3.5], up: 2.2, big: 1 },
  { key: 'pennyless', at: [5, 2], up: 1.6, big: 0.45 },
  { key: 'watch', at: [-11, 3.5], up: 0.9, big: 0.6, steam: true },
].map((m) => { const [x, z] = hubAt(HUB[m.key], ...m.at); return { x, y: Y(x, z) + m.up, z, big: m.big, steam: !!m.steam }; });

// The halls, as houses of the city's (phobosHouses takes these first): the hub's own at the yard's back, door to the yard;
// and the Pennyless' burnt chandlery on the street side, roofless, its door on Ash Lane.
export function hubHouses() {
  const out = [];
  for (const h of HUBS) {
    const yaw = h.yaw, [x, z] = hubAt(h, 2, -(h.hz - 5.6));
    out.push({ x, z, yaw, hx: 8.02, hz: 5, h: h.key === 'ash' ? 11 : 9.5, wall: h.wall, roof: h.key === 'ash' ? 'dark:roof_2' : 'roof_2', front: h.front, hub: h.key });
    if (h.key === 'pennyless') { const [cx, cz] = hubAt(h, 9.5, h.hz - 4.6); out.push({ x: cx, z: cz, yaw, hx: 5, hz: 4, h: 8, wall: 'ph_burnt_wall', roof: null, front: h.front, hub: h.key, ruin: true }); }
  }
  return out;
}

// From far (with the city's walls, always built): the yard's wall, four metres and a half, the gate cut in the front;
// what stops a body at it.
export function hubFar(K) {
  for (const h of HUBS) {
    const C = [[-h.hx, -h.hz], [h.hx, -h.hz], [h.hx, h.hz], [-h.hx, h.hz]].map(([u, v]) => hubAt(h, u, v * 1));
    // (back, the two sides, and the front in two round the gate: corners are local (u, v) with v toward the street.)
    const P = (u, v) => hubAt(h, u, v);
    const L = h.wall, T = 0.7, H = 4.5;
    K.wall(L, ...P(-h.hx, -h.hz), ...P(h.hx, -h.hz), T, H);
    K.wall(L, ...P(-h.hx, -h.hz), ...P(-h.hx, h.hz), T, H);
    K.wall(L, ...P(h.hx, -h.hz), ...P(h.hx, h.hz), T, H);
    K.wall(L, ...P(-h.hx, h.hz), ...P(-2.4, h.hz), T, H);
    K.wall(L, ...P(2.4, h.hz), ...P(h.hx, h.hz), T, H);
    // The gate: two piers and a beam over, so it reads from the street as a way in, not a gap.
    for (const s of [-1, 1]) { const [px, pz] = P(s * 2.7, h.hz); K.box(L, px, Y(px, pz) - 0.4, pz, 0.6, 6.2, 0.6, h.yaw); }
    { const [bx, bz] = P(0, h.hz); K.box('dark:wood', bx, Y(bx, bz) + 5.3, bz, 3.4, 0.45, 0.35, h.yaw, { collide: false }); }
    void C;
  }
}

// A fire: three tongues of flame, not one, turned and leaning a little each, and a glow in the coals under them.
function fire(K, x, y, z, s = 1) {
  K.disc('glow', x, y + 0.02, z, 0.42 * s, 9);
  K.cone('flame', x, y, z, 0.42 * s, 1.15 * s, 9, 0.3);
  K.cone('flame', x + 0.16 * s, y, z - 0.1 * s, 0.26 * s, 0.8 * s, 7, 1.1);
  K.cone('flame', x - 0.14 * s, y, z + 0.12 * s, 0.22 * s, 0.65 * s, 7, 2.0);
}
// A brazier as the Ashwardens keep them: a squat stone post, a wide iron bowl, coals and a fire in it.
function bowl(K, x, z, h = 1.0) {
  const y = Y(x, z);
  K.drum('dark:stone', x, y - 0.2, z, 0.3, h + 0.2, 8, { collide: false });
  K.drum('iron', x, y + h, z, 0.28, 0.38, 10, { r2: 0.58, collide: false, open: true });
  K.disc('dark:rubble', x, y + h + 0.3, z, 0.52, 10);
  fire(K, x, y + h + 0.3, z, 0.8);
}

// From near (built with its cell): what makes each yard its own, and lights. (Nothing here stops you.)
export function hubNear(K, h) {
  const P = (u, v) => hubAt(h, u, v), n0 = K.colliders.length;
  const G = (u, v) => { const [x, z] = P(u, v); return [x, Y(x, z), z]; };
  const out = [Math.sin(h.yaw) * h.front, Math.cos(h.yaw) * h.front];   // (the way out of the gate, in the world)
  const along = [Math.cos(h.yaw), -Math.sin(h.yaw)];                       // (the yard's own x, in the world)
  const light = (u, v, y, c = [1, 0.62, 0.3], r = 16, i = 10) => { const [x, gy, z] = G(u, v); (K.lamps ||= []).push({ p: [x, gy + y, z], c, r, i, flicker: 0.4 }); };
  const rnd = (k) => { const t = Math.sin(k * 127.1 + h.x * 0.013) * 43758.5; return t - Math.floor(t); };
  // Lanterns either side of the gate, out on the street, and in on the yard.
  for (const s of [-1, 1]) { const [x, gy, z] = G(s * 2.7, h.hz + 0.65); K.wallLamp(x, gy + 3.6, z, out); }
  light(0, h.hz + 1.5, 3.2); light(0, h.hz - 2, 3.2, [1, 0.6, 0.3], 14, 7);
  // The yard's ground: flags, worn.
  { const [x, , z] = G(0, 0); K.paving('dark:stone', x, z, h.hx - 0.6, h.hz - 0.6, h.yaw, 0.04); }
  if (h.key === 'pennyless') {
    // Behind the burnt front: what the Pennyless take and give back. Sacks and crates, a long table with the day's loaves
    // and a red purse on it, a cookfire, washing.
    for (const [u, v] of [[-11, -2], [-10, -3.2], [-11.6, -3.6], [11, -2.5]]) { const [x, , z] = G(u, v); K.crate(x, z, 0.4 + 0.1 * Math.abs(u % 2), u * 0.3, null); }
    for (const [u, v] of [[-12, 3], [-11.2, 3.6], [12, 1]]) { const [x, , z] = G(u, v); K.barrel(x, z); }
    { const [x, , z] = G(-6, 1.5); K.table(x, z, h.yaw, 1.8); const [bx1, , bz1] = G(-6, 2.4); K.bench(bx1, bz1, h.yaw, 1.6); const [bx2, , bz2] = G(-6, 0.6); K.bench(bx2, bz2, h.yaw, 1.6); }
    for (let k = 0; k < 6; k++) { const [x, gy, z] = G(-7.2 + k * 0.42, 1.35 + (k % 2) * 0.25); K.drum('bark', x, gy + 0.78, z, 0.13, 0.11, 7, { collide: false }); }
    { const [x, gy, z] = G(-5.1, 1.6); K.drum('cloth_red', x, gy + 0.78, z, 0.12, 0.16, 7, { r2: 0.05, collide: false }); }
    { const [x, , z] = G(-7.5, 5.5); K.goods(x, z, 7, 1.6); }
    { const [x, gy, z] = G(5, 2); K.campfire(x, z, false); fire(K, x, gy + 0.25, z, 0.85); light(5, 2, 1.6, [1, 0.5, 0.2], 14, 12); }
    { const [ax, ay, az] = G(-14.3, -6), [bx, , bz] = G(-4, -9); K.washing?.(ax, az, bx, bz, ay + 3.4 - Y(ax, az)); }
    // The chandlery, burnt: its walls' tops charred and broken, two roof beams fallen in, a third still standing up out of
    // it against the sky, and the tallow in black heaps. (Its walls: a ruin of src/core/phobos-build.js houseNear.)
    const cu = 9.5, cv = h.hz - 4.6, hx = 5, hz = 4;
    let top = -1e9; for (const [u, v] of [[cu - hx, cv - hz], [cu + hx, cv - hz], [cu + hx, cv + hz], [cu - hx, cv + hz]]) top = Math.max(top, G(u, v)[1]);
    top += 8;
    const char = (u0, v0, u1, v1, n) => {
      const len = Math.hypot(u1 - u0, v1 - v0), yw = h.yaw + (Math.abs(v1 - v0) > Math.abs(u1 - u0) ? Math.PI / 2 : 0);
      { const [x, , z] = G((u0 + u1) / 2, (v0 + v1) / 2); K.box('dark:rubble', x, top - 1.2, z, len / 2 + 0.27, 1.0, 0.27, yw, { collide: false }); }
      let t0 = 0;
      for (let k = 0; t0 < 1; k++) {
        const r = rnd(k * 7 + u0 * 3 + v0), w = (0.35 + rnd(k * 11 + v0 * 5 + u0) * 0.9) / len, t = Math.min(1, t0 + w), [x, , z] = G(u0 + (u1 - u0) * (t0 + t) / 2, v0 + (v1 - v0) * (t0 + t) / 2);
        if (r > 0.18) { const dh = r > 0.85 ? 1.3 + r * 1.2 : r * r * 0.9; K.box('dark:rubble', x, top - 0.2, z, (t - t0) * len / 2 + 0.01, dh + 0.2, 0.26, yw, { collide: false }); }
        t0 = t;
      }
    };
    char(cu - hx, cv - hz, cu + hx, cv - hz); char(cu - hx, cv + hz, cu + hx, cv + hz); char(cu - hx, cv - hz, cu - hx, cv + hz); char(cu + hx, cv - hz, cu + hx, cv + hz);
    { const a = G(cu - 3.5, cv - 2.5), b = G(cu + 2, cv + 3.2); K.beam('dark:wood', [a[0], a[1] + 0.2, a[2]], [b[0], top - 2.5, b[2]], 0.16); }
    { const a = G(cu + 3.6, cv - 3), b = G(cu - 1, cv + 1); K.beam('dark:wood', [a[0], top - 0.6, a[2]], [b[0], b[1] + 0.3, b[2]], 0.15); }
    { const a = G(cu + 0.5, cv - 0.5); K.beam('dark:wood', [a[0], a[1], a[2]], [a[0] + along[0] * 1.2, top + 3.2, a[2] + along[1] * 1.2], 0.17); }
    for (const [u, v] of [[cu - 2, cv + 1.5], [cu + 2.5, cv - 1]]) { const [x, , z] = G(u, v); K.rock('dark:rubble', x, z, 0.9, 0.5, { collide: false }); }
  } else if (h.key === 'watch') {
    // A dye works: open vats of madder, weld and soot-black, one on the boil; long lengths of cloth hung over high poles
    // to dry, seen over the wall from the street; a rack of staves that are not only staves; a stirring pole.
    const dyes = ['cloth_red', 'cloth_oat', 'dark:cloth_red', 'dark:cloth_oat'];
    let k = 0;
    for (const u of [-11, -8, -5]) for (const v of [3.5, 6.5]) {
      const [x, gy, z] = G(u, v);
      K.drum('wood', x, gy - 0.1, z, 1.05, 1.0, 12, { collide: false, open: true });
      K.disc(dyes[k++ % dyes.length], x, gy + 0.62, z, 1.0, 12);
      K.drum('iron', x, gy + 0.78, z, 1.08, 0.08, 12, { collide: false, open: true });
    }
    { const [x, gy, z] = G(-5, 6.5); K.beam('wood', [x + along[0] * 0.5, gy + 0.6, z + along[1] * 0.5], [x + along[0] * 1.6, gy + 2.3, z + along[1] * 1.6], 0.04); }
    const H = 4.2;
    for (const v of [-3, -0.5]) {
      const a = G(-13.5, v), b = G(-2, v);
      for (const e of [a, b]) K.beam('dark:wood', [e[0], e[1] - 0.2, e[2]], [e[0], e[1] + H, e[2]], 0.07);
      K.beam('dark:wood', [a[0], a[1] + H, a[2]], [b[0], b[1] + H, b[2]], 0.05);
      for (let u = -12.7, j = 0; u < -2.6; u += 1.25, j++) {
        // (A length thrown over the pole: down both sides, a hand apart, each its own length.)
        const [x, , z] = G(u, v), w = 0.5, d1 = 1.9 + rnd(j + v) * 1.3, d2 = 1.4 + rnd(j * 3 + v) * 1.2, c = dyes[(j + (v < -1 ? 1 : 0)) % dyes.length];
        const y = a[1] + H - 0.05, n = [Math.sin(h.yaw) * 0.06, Math.cos(h.yaw) * 0.06];
        const L = (sd, d) => K.quad(c, [x - along[0] * w / 2 + n[0] * sd, y, z - along[1] * w / 2 + n[1] * sd], [x + along[0] * w / 2 + n[0] * sd, y, z + along[1] * w / 2 + n[1] * sd],
          [x + along[0] * w / 2 + n[0] * sd, y - d, z + along[1] * w / 2 + n[1] * sd], [x - along[0] * w / 2 + n[0] * sd, y - d, z - along[1] * w / 2 + n[1] * sd], null, [[0, 0], [0.5, 0], [0.5, d / 2], [0, d / 2]]);
        L(1, d1); L(-1, d2);
      }
    }
    { const [x, , z] = G(9, 4); K.rack(x, z, h.yaw, 2.2, 'cloth_oat', 1.8); }
    { const [x, , z] = G(11, 1); K.woodpile(x, z, h.yaw, 1.6, 1.1, 0.5); }
    for (const [u, v] of [[12.5, 6], [12, 7.4]]) { const [x, , z] = G(u, v); K.barrel(x, z); }
    { const [x, gy, z] = G(-11, 2.1); K.drum('dark:stone', x, gy - 0.1, z, 0.5, 0.4, 8, { collide: false }); fire(K, x, gy + 0.3, z, 0.5); }
    light(-8, 5, 2.6, [1, 0.66, 0.36], 14, 8);
  } else {
    // A charnel house: what the Bone Yards' rows give up, heaped by the back wall to be salted and burned; the pyre in a
    // ring of stones on a scorched floor; ash in low drifts; iron braziers at the four corners of the working ground.
    { const [cx, gy, cz] = G(-9.5, -6.8);
      for (let j = 0; j < 9; j++) { const n = Math.round(18 - j * 1.9), r = 2.3 - j * 0.24;
        for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + j, rr = r * (0.3 + 0.7 * rnd(k + j * 17));
          K.box('pale:stone', cx + Math.cos(a) * rr, gy + j * 0.2, cz + Math.sin(a) * rr, 0.42 + rnd(k * 5 + j) * 0.2, 0.07, 0.07, rnd(k * 7 + j * 3) * 3.1, { collide: false });
          if (k % 4 === 0) K.drum('pale:stone', cx + Math.cos(a) * rr, gy + j * 0.2 + 0.08, cz + Math.sin(a) * rr, 0.09, 0.12, 6, { collide: false }); } }
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; K.drum('pale:stone', cx + Math.cos(a) * 2.5, gy, cz + Math.sin(a) * 2.5, 0.15, 0.2, 7, { r2: 0.11, collide: false }); }
      for (const [ox, oz, oy] of [[0, 0, 1.75], [0.6, 0.3, 1.25], [-0.5, 0.5, 1.1], [0.2, -0.7, 1.0]]) K.drum('pale:stone', cx + ox, gy + oy, cz + oz, 0.16, 0.22, 7, { r2: 0.12, collide: false }); }
    for (const u of [-12.5, -6.5]) { const [x, gy, z] = G(u, -10.6); K.box('pale:stone', x, gy - 0.2, z, 1.2, 1.4, 0.55, h.yaw, { collide: false }); }
    for (const [u, v, r] of [[5.2, 1.6, 1.1], [10.9, 5.6, 1.3], [6.2, 6.4, 0.9], [11, 1.8, 0.8]]) { const [x, gy, z] = G(u, v); K.cone('dark:rubble', x, gy - 0.1, z, r, 0.3, 9); }
    { const [x, gy, z] = G(8, 3.5);
      K.disc('dark:rubble', x, gy + 0.06, z, 2.7, 14);
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + 0.3, rr = 2.6 + rnd(k * 13) * 1.2; K.disc('dark:rubble', x + Math.cos(a) * rr, gy + 0.05, z + Math.sin(a) * rr, 0.5 + rnd(k * 5) * 0.6, 8); }
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; K.box('dark:stone', x + Math.cos(a) * 2.2, gy - 0.1, z + Math.sin(a) * 2.2, 0.32, 0.38, 0.22, -a, { collide: false }); }
      for (let j = 0; j < 5; j++) for (const o of [-0.5, 0, 0.5]) { const t = h.yaw + (j % 2) * Math.PI / 2, ox = Math.cos(t + Math.PI / 2) * o, oz = -Math.sin(t + Math.PI / 2) * o; K.box('bark', x + ox, gy + j * 0.24, z + oz, 1.1, 0.11, 0.11, t, { collide: false }); }
      for (let k = 0; k < 5; k++) K.box('pale:stone', x + (rnd(k) - 0.5) * 1.2, gy + 1.22, z + (rnd(k + 9) - 0.5) * 1.2, 0.4, 0.05, 0.05, rnd(k + 3) * 3, { collide: false });
      fire(K, x, gy + 1.15, z, 1.7);
      light(8, 3.5, 2.2, [1, 0.5, 0.2], 22, 18); }
    for (const [u, v] of [[-3.5, 7], [3.5, 7], [-3.5, -2], [3.5, -2]]) { const [x, , z] = G(u, v); bowl(K, x, z, 1.0); }
    light(0, 2.5, 2.4, [1, 0.55, 0.25], 16, 9);
    { const [x, , z] = G(12, 6); K.rack(x, z, h.yaw + Math.PI / 2, 2.0, 'dark:cloth_oat', 1.8); }
  }
  // (The giver's post is clear: nothing set down within a metre of it.)
  K.colliders.length = n0;
}
