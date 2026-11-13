// What lies about a lair (src/core/tripo-monsters.js LAIRS): until this, the things of the land stood on bare ground. Each
// gets what its own kind would leave: a goblins' or kobolds' camp its fire, stakes and the bones of its dinners; spiders
// their webs strung between dead poles and what they've wrapped; the dead children, the possessed and the necromancers a
// plot of leaning stones; goat men and demons a ring of black stones; a dragon or a worm its scorched bed; harpies and
// bats a roost; a wolf its den; Velscour's knights and the plague's a picket of stakes and a cold fire.
//
// It's for the eye only: nothing here has a collider (whatever the pieces lay is taken off again), so no fight and no
// path is changed by it; it's kept low, or out at the rim, so nothing is walked through that looks solid. Nothing is laid
// on a road, in water, on a seal, where somebody stands (K.spots), or inside something already built. No cloth, no mark
// of either side (README "The two sides").
import { terrainHeight } from './terrain.js';
import { routeDist, waterAt } from './lands.js';
import { hash2 } from './terrain-noise.js';
import { LAIRS } from './tripo-monsters.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);

// What a lair's dressed as, by who lives there (its bosses first: a dragon's bed is a dragon's whoever waits on it).
export function lairKind(l) {
  // (An outpost or a battle says its own: src/core/wilds.js.)
  if (l.dress) return l.dress;
  const names = (l.boss || []).concat(l.pick || []).join(' ');
  for (const [re, kind] of [
    [/dragon|worm/, 'bed'], [/harpy|werebat/, 'roost'], [/werewolf/, 'den'], [/velscour|possessed_knight|plague|skeleton|golem/, 'picket'],
    [/spider/, 'webs'], [/goatman|night_demon/, 'ring'], [/necromancer|zombie|possessed|mannequin/, 'plot'], [/goblin|kobold/, 'camp'],
  ]) if (re.test(names)) return kind;
  return 'camp';
}

export function dressLairs(K, seals = []) {
  const kept = K.colliders.length;
  const spots = Object.values(K.spots);
  const solid = K.colliders.filter((c) => Math.abs(c.x) < 5600 && Math.abs(c.z) < 5600);
  for (const [n, l] of LAIRS.entries()) {
    const near = solid.filter((c) => Math.abs(c.x - l.x) < 60 && Math.abs(c.z - l.z) < 60);
    // Is this a place to lay something r wide?
    const free = (x, z, r = 0.6) => {
      if (routeDist(x, z).d < 4.5 + r || waterAt(x, z) !== null) return false;
      for (const s of seals) if (Math.hypot(s.x - x, s.z - z) < 6 + r) return false;
      for (const p of spots) if (Math.hypot(p[0] - x, p[2] - z) < 2.5 + r) return false;
      for (const c of near) {
        const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw || 0), sn = Math.sin(c.yaw || 0);
        if (Math.abs(dx * cs - dz * sn) < c.hx + r + 0.3 && Math.abs(dx * sn + dz * cs) < c.hz + r + 0.3) return false;
      }
      // (Not on a slope it would hang off.)
      return Math.abs(Y(x + r, z) - Y(x - r, z)) < 0.5 + r * 0.5 && Math.abs(Y(x, z + r) - Y(x, z - r)) < 0.5 + r * 0.5;
    };
    const h = (k) => hash2(n * 7 + k, n * 13 - k * 3);
    // A point a (turns) round the lair, d metres out from its middle.
    const at = (a, d) => [l.x + Math.cos(a * TAU) * d, l.z + Math.sin(a * TAU) * d];
    const R = Math.max(3, l.r);

    // ---- the pieces
    // Bones on the ground: a few long ones crossed, a skull among them.
    const bones = (x, z, k) => {
      if (!free(x, z, 0.5)) return;
      const y = Y(x, z) + 0.04;
      for (let i = 0; i < 2; i++) { const a = h(k + i) * TAU, len = 0.25 + h(k + i + 3) * 0.3, ox = (h(k + i + 6) - 0.5) * 0.7, oz = (h(k + i + 9) - 0.5) * 0.7; K.beam('pale:stone', [x + ox - Math.cos(a) * len, y, z + oz - Math.sin(a) * len], [x + ox + Math.cos(a) * len, y + 0.03, z + oz + Math.sin(a) * len], 0.05); }
      K.spike('pale:stone', x + 0.2, y - 0.03, z - 0.15, 0.13, 0.2, 4, h(k) * 6);
    };
    // A stake driven in, leaning out from the lair; a skull on some.
    const stake = (x, z, k, tall = 1.5, layer = 'bark') => {
      if (!free(x, z, 0.3)) return;
      const a = Math.atan2(z - l.z, x - l.x), lean = 0.12 + h(k) * 0.2, hh = tall * (0.8 + h(k + 1) * 0.5), y = Y(x, z);
      K.spike(layer, x, y - 0.3, z, 0.09, hh + 0.3, 4, h(k) * 3, [Math.cos(a) * lean, Math.sin(a) * lean]);
      if (h(k + 2) > 0.62) K.spike('pale:stone', x + Math.cos(a) * lean * hh * 0.86, y + hh * 0.82, z + Math.sin(a) * lean * hh * 0.86, 0.13, 0.22, 4, k);
    };
    const stone = (x, z, k, layer, r = 0.5, tall = 0.5) => { if (free(x, z, r)) K.rock(layer, x, z, r * (0.7 + h(k) * 0.6), tall * (0.7 + h(k + 1) * 0.6), { collide: false, turn: h(k + 2) * 6 }); };
    const fire = (x, z, lit) => { if (free(x, z, 0.8)) { K.campfire(x, z, lit); return true; } return false; };
    const mound = (x, z, k, layer, r = 0.8, tall = 0.4) => { if (free(x, z, r)) K.heap(layer, x, z, r * (0.8 + h(k) * 0.4), tall, 5, { collide: false }); };

    const kind = lairKind(l);
    if (kind === 'camp') {
      // The fire off its middle, logs to sit on round it, the dinners' bones, a midden, stakes round the rim.
      const [fx, fz] = at(h(1), R * 0.35);
      if (fire(fx, fz, true)) for (let i = 0; i < 3; i++) { const a = h(2) + i / 3 + 0.1, x = fx + Math.cos(a * TAU) * 1.7, z = fz + Math.sin(a * TAU) * 1.7; if (free(x, z, 0.5)) K.beam('bark', [x - Math.sin(a * TAU) * 0.7, Y(x, z) + 0.14, z + Math.cos(a * TAU) * 0.7], [x + Math.sin(a * TAU) * 0.7, Y(x, z) + 0.14, z - Math.cos(a * TAU) * 0.7], 0.3); }
      for (let i = 0; i < 4; i++) bones(...at(h(10 + i), R * (0.3 + h(14 + i) * 0.7)), 20 + i * 12);
      { const [x, z] = at(h(3) + 0.5, R + 1.5); mound(x, z, 5, 'dark:rubble', 1.1, 0.5); bones(x + 0.9, z + 0.4, 70); }
      const nS = 7 + Math.round(R);
      for (let i = 0; i < nS; i++) if (h(40 + i) > 0.3) stake(...at(i / nS + h(60) * 0.1, R + 2.2 + h(80 + i) * 0.8), 100 + i * 3);
    } else if (kind === 'webs') {
      // Dead poles round the rim, strands strung between them, bundles wrapped and hung or dropped, a few bones.
      const nP = 6, poles = [];
      for (let i = 0; i < nP; i++) { const [x, z] = at(i / nP + h(i) * 0.08, R + 1.5 + h(i + 9) * 1.5); if (!free(x, z, 0.3)) continue; const hh = 2.4 + h(i + 20) * 1.6, y = Y(x, z); K.spike('bark', x, y - 0.4, z, 0.16, hh + 0.4, 5, i, [(h(i + 30) - 0.5) * 0.3, (h(i + 31) - 0.5) * 0.3]); poles.push([x, y + hh * 0.8, z, i]); }
      for (let i = 0; i < poles.length; i++) {
        const a = poles[i], b = poles[(i + 1) % poles.length];
        if (poles.length < 2 || Math.hypot(a[0] - b[0], a[2] - b[2]) > R * 2.4) continue;
        // (A strand sags to its middle; a second runs to the ground.)
        const m = [(a[0] + b[0]) / 2, Math.max(Y((a[0] + b[0]) / 2, (a[2] + b[2]) / 2) + 2.1, Math.min(a[1], b[1]) - 0.5), (a[2] + b[2]) / 2];
        K.beam('white', [a[0], a[1], a[2]], m, 0.022); K.beam('white', m, [b[0], b[1], b[2]], 0.022);
        if (h(50 + i) > 0.4) { K.beam('white', m, [m[0], m[1] - 0.9, m[2]], 0.02); K.drum('cloth_oat', m[0], m[1] - 1.75, m[2], 0.16, 0.5, 6, { r2: 0.28, collide: false, open: true }); K.cone('cloth_oat', m[0], m[1] - 1.25, m[2], 0.28, 0.4, 6); K.cone('cloth_oat', m[0], m[1] - 1.75, m[2], 0.16, -0.25, 6); }
      }
      for (let i = 0; i < 3; i++) { const [x, z] = at(h(70 + i), R * (0.4 + h(73 + i) * 0.6)); if (free(x, z, 0.5)) { const y = Y(x, z); K.drum('cloth_oat', x, y - 0.05, z, 0.3, 0.35, 6, { r2: 0.22, collide: false, turn: i }); K.cone('cloth_oat', x, y + 0.3, z, 0.22, 0.2, 6, i); } }
      for (let i = 0; i < 3; i++) bones(...at(h(80 + i), R * (0.3 + h(83 + i) * 0.8)), 90 + i * 12);
    } else if (kind === 'plot') {
      // Leaning stones in a rough row or two, a mound of turned earth before some, a dead fire, a bone or two.
      const yaw = h(1) * TAU, c = Math.cos(yaw), s = Math.sin(yaw);
      for (let i = 0; i < 9; i++) {
        const u = (i % 5 - 2) * 1.9 + (h(i) - 0.5) * 0.6, w = R + 1.4 + Math.floor(i / 5) * 2.1, x = l.x + u * c + w * s, z = l.z - u * s + w * c;
        if (h(i + 10) < 0.2 || !free(x, z, 0.5)) continue;
        K.gravestone(x, z, yaw + (h(i + 20) - 0.5) * 0.4, 0.5 + h(i + 30) * 0.45, i % 3 ? 'rubble' : 'stone');
        if (h(i + 40) > 0.45) { const mx = x - s * 0.9, mz = z - c * 0.9; if (free(mx, mz, 0.6)) K.box('dark:rubble', mx, Y(mx, mz) - 0.1, mz, 0.35, 0.24, 0.8, yaw, { collide: false }); }
      }
      fire(...at(h(2), R * 0.3), false);
      for (let i = 0; i < 2; i++) bones(...at(h(50 + i), R * (0.4 + h(53 + i) * 0.5)), 60 + i * 12);
      for (let i = 0; i < 3; i++) stake(...at(h(70 + i) , R + 2 + h(73 + i)), 80 + i * 3, 1.1, 'wood');
    } else if (kind === 'ring') {
      // Black stones stood in a ring, a slab at its middle, a cold fire by it, horns of glass, bones.
      const nR = 7;
      for (let i = 0; i < nR; i++) { const [x, z] = at(i / nR + h(1), R + 1.8); if (!free(x, z, 0.5)) continue; const hh = 0.9 + h(i + 5) * 0.9; K.spike('dark:rubble', x, Y(x, z) - 0.3, z, 0.42, hh + 0.3, 5, i, [(h(i + 10) - 0.5) * 0.25, (h(i + 11) - 0.5) * 0.25]); }
      { const [x, z] = at(h(2), R * 0.25); if (free(x, z, 1)) { K.box('dark:rubble', x, Y(x, z) - 0.2, z, 0.95, 0.42, 0.55, h(3) * 3, { collide: false }); bones(x + 0.2, z + 1.2, 20); } }
      fire(...at(h(2) + 0.5, R * 0.45), false);
      for (let i = 0; i < 4; i++) { const [x, z] = at(h(30 + i), R * (0.5 + h(34 + i) * 0.6)); if (free(x, z, 0.3)) K.spike('obsidian', x, Y(x, z) - 0.1, z, 0.1, 0.45 + h(38 + i) * 0.4, 4, i, [(h(40 + i) - 0.5) * 0.4, (h(44 + i) - 0.5) * 0.4]); }
      for (let i = 0; i < 2; i++) bones(...at(h(50 + i), R * (0.6 + h(53 + i) * 0.5)), 60 + i * 12);
    } else if (kind === 'bed') {
      // A bed of scorched earth banked round, ribs standing out of it, bones everywhere, glass where the fire fell.
      const B = R + 3;
      for (let i = 0; i < 9; i++) { const [x, z] = at(i / 9 + h(i) * 0.05, B + h(i + 9) * 1.5); mound(x, z, i + 20, i % 3 ? 'dark:rubble' : 'dark:stone', 1.5, 0.55); }
      { const [x, z] = at(h(1), B * 0.75), yaw = h(2) * TAU; if (free(x, z, 1.6)) for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) { const u = (i - 2) * 0.55, bx = x + Math.cos(yaw) * u, bz = z + Math.sin(yaw) * u, y = Y(bx, bz); K.spike('pale:stone', bx - Math.sin(yaw) * sd * 0.5, y - 0.1, bz + Math.cos(yaw) * sd * 0.5, 0.06, 0.9 - Math.abs(i - 2) * 0.12, 4, i, [Math.sin(yaw) * sd * 0.35, -Math.cos(yaw) * sd * 0.35]); } }
      for (let i = 0; i < 6; i++) bones(...at(h(30 + i), B * (0.35 + h(36 + i) * 0.7)), 40 + i * 12);
      for (let i = 0; i < 5; i++) { const [x, z] = at(h(120 + i), B * (0.5 + h(125 + i) * 0.6)); if (free(x, z, 0.3)) K.spike('obsidian', x, Y(x, z) - 0.1, z, 0.14, 0.4 + h(130 + i) * 0.5, 4, i, [(h(135 + i) - 0.5) * 0.5, (h(140 + i) - 0.5) * 0.5]); }
    } else if (kind === 'roost') {
      // Perches: bare poles with a cross-piece, a nest of sticks on the ground, droppings of bone, pale stones.
      for (let i = 0; i < 4; i++) { const [x, z] = at(i / 4 + h(1), R + 2 + h(i + 2) * 1.5); if (!free(x, z, 0.3)) continue; const y = Y(x, z), hh = 3 + h(i + 6) * 1.5, a = h(i + 10) * TAU; K.spike('bark', x, y - 0.4, z, 0.15, hh + 0.4, 5, i); K.beam('bark', [x - Math.cos(a) * 0.8, y + hh * 0.78, z - Math.sin(a) * 0.8], [x + Math.cos(a) * 0.8, y + hh * 0.82, z + Math.sin(a) * 0.8], 0.09); }
      { const [x, z] = at(h(20), R * 0.3); if (free(x, z, 1.2)) { const y = Y(x, z); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + h(i + 21), b = a + 1.9; K.beam('bark', [x + Math.cos(a) * 1.0, y + 0.08 + (i % 3) * 0.09, z + Math.sin(a) * 1.0], [x + Math.cos(b) * 1.0, y + 0.12 + (i % 3) * 0.09, z + Math.sin(b) * 1.0], 0.08); } for (let i = 0; i < 3; i++) K.spike('pale:stone', x + (h(i + 31) - 0.5) * 0.5, y + 0.1, z + (h(i + 34) - 0.5) * 0.5, 0.15, 0.24, 5, i); } }
      for (let i = 0; i < 5; i++) bones(...at(h(40 + i), R * (0.4 + h(45 + i) * 0.8)), 50 + i * 12);
      for (let i = 0; i < 4; i++) stone(...at(h(110 + i), R + 1 + h(114 + i) * 2), 118 + i * 3, 'pale:rubble', 0.45, 0.4);
    } else if (kind === 'den') {
      // A scrape under three boulders, the ground worn, what's left of what it brought home.
      for (let i = 0; i < 3; i++) stone(...at(h(1) + i * 0.12, R + 2.6), 5 + i * 3, 'rubble', 1.3, 1.3);
      { const [x, z] = at(h(1) + 0.12, R + 1.2); mound(x, z, 20, 'dark:rubble', 1.2, 0.3); }
      for (let i = 0; i < 6; i++) bones(...at(h(30 + i), R * (0.5 + h(36 + i) * 1.2)), 40 + i * 12);
      for (let i = 0; i < 3; i++) stone(...at(h(120 + i), R + 2 + h(123 + i) * 2), 126 + i * 3, 'rubble', 0.4, 0.35);
    } else {
      // A picket: stakes of iron-shod timber round the rim, a cold fire, dark stones to sit on, the dead they've left.
      const nS = 10 + Math.round(R);
      for (let i = 0; i < nS; i++) if (i % 4 !== 3) stake(...at(i / nS + h(1) * 0.1, R + 2.4), 10 + i * 3, 1.7, 'dark:wood');
      if (fire(...at(h(2), R * 0.3), false)) for (let i = 0; i < 2; i++) stone(...at(h(2) + 0.3 + i * 0.4, R * 0.3 + 1.6), 60 + i * 3, 'dark:rubble', 0.4, 0.4);
      for (let i = 0; i < 4; i++) bones(...at(h(70 + i), R * (0.5 + h(74 + i) * 0.7)), 80 + i * 12);
      for (let i = 0; i < 2; i++) { const [x, z] = at(h(130 + i), R + 3.4); mound(x, z, 132 + i, 'dark:rubble', 0.9, 0.35); }
    }
  }
  // (For the eye only: whatever colliders the pieces laid are taken off again.)
  K.colliders.length = kept;
}
