// What stands at the land's outposts, its tear spots and the small things to find (src/core/wilds.js, wilds-data.js):
// plain geometry from the sites' own pieces (src/core/sites.js Kit, src/core/places.js PIECES), a build for each kind of
// outpost. Called by buildSites after the lairs are dressed (src/core/lair-dress.js gives each garrison's ground its fire,
// bones and stakes; this is what's built round it).
//
// A camp is a broken palisade with its gate to the trail, tents and a totem; diggings are spoil heaps and a propped adit;
// a graveyard a fenced plot with a lych gate and a dead-house; a tomb a mound with a stone door and standing stones; a
// fort Velscour's black stockade with two towers and red cloth; a tower his tall black watchtower; and so on down.
//
// Only what you couldn't sensibly walk through keeps its collider: the towers, the big rocks, the mounds. Fences and
// palisades are broken and gapped and have none, so nothing that hunts you is ever stuck behind one. Nothing is laid on a
// road, a trail or water. No letter and neither side's mark on anything; Velscour's cloth is plain red.
import { terrainHeight } from './terrain.js';
import { routeDist, waterAt } from './lands.js';
import { hash2 } from './terrain-noise.js';
import { FACTIONS } from './wilds.js';
import { FIND_KINDS, FINDS, OUTPOSTS, TEAR_SPOTS } from './wilds-data.js';

const TAU = Math.PI * 2;
const Y = (x, z) => terrainHeight(x, z);

export function dressWilds(K) {
  const free = (x, z, r = 0.6) => routeDist(x, z).d > 3.2 + r && waterAt(x, z) === null;
  // (Whatever colliders fn's pieces lay are taken off again: for the eye only.)
  // On a phone (K.lean: src/core/sites.js buildSites) they aren't laid at all.
  const soft = (fn, always = false) => { if (K.lean && !always) return; const n = K.colliders.length; fn(); K.colliders.length = n; };

  OUTPOSTS.forEach((o, n) => {
    const f = FACTIONS[o.faction], R = o.r, h = (k) => hash2(n * 11 + k, n * 5 - k * 7 + 3);
    // A point a (radians) round from the gate, d metres out; and the yaw that faces the middle from there.
    const P = (a, d) => [o.x + Math.sin(o.yaw + a) * d, o.z + Math.cos(o.yaw + a) * d];
    const gate = P(0, R + 5);
    const skullPole = (x, z, tall, k) => { if (!free(x, z, 0.3)) return; const y = Y(x, z); K.spike('bark', x, y - 0.3, z, 0.12, tall + 0.3, 5, k); K.spike('pale:stone', x, y + tall - 0.1, z, 0.2, 0.3, 4, k); K.beam('bark', [x - 0.5, y + tall * 0.7, z], [x + 0.5, y + tall * 0.72, z], 0.07); };
    const deadTree = (x, z, tall, k) => { if (!free(x, z, 0.5)) return; const y = Y(x, z); K.spike('bark', x, y - 0.5, z, 0.3, tall + 0.5, 6, k, [(h(k) - 0.5) * 0.2, (h(k + 1) - 0.5) * 0.2]); for (let i = 0; i < 3; i++) { const a = h(k + 2 + i) * TAU, u = 0.45 + i * 0.16, len = 1.2 + h(k + 7 + i) * 1.4; K.beam('bark', [x, y + tall * u, z], [x + Math.cos(a) * len, y + tall * u + len * 0.6, z + Math.sin(a) * len], 0.1, 0.03); } };
    const tents = (count, d, layer, big = 1) => { for (let i = 0; i < count; i++) { const a = Math.PI * (0.55 + i * 0.9 / Math.max(1, count - 1) * (count > 1 ? 1 : 0)) * (i % 2 ? 1 : -1), [x, z] = P(a, d + h(20 + i) * 1.5); if (free(x, z, 2)) K.tent(x, z, o.yaw + a + Math.PI, 1.5 * big, 1.25 * big, 1.6 * big, layer); } };
    const stockade = (layer, tall, sides, r, more = 2) => {
      // Its gate to the trail, and a couple of lengths fallen or never finished.
      const gaps = [[gate[0], gate[1], 3.4]];
      for (let i = 0; i < more; i++) gaps.push([...P(1.3 + i * 2.2 + h(30 + i), r), 3]);
      // (Its own, and not the towns' palisade with a point cut on every log: a length of wall and a tall pointed post at
      // each end is a fifth of the corners, and there are eighty of these.)
      const pts = K.ring(o.x, o.z, r, sides, o.yaw + Math.PI / sides);
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), cnt = Math.max(1, Math.round(len / 6)), yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
        for (let k = 0; k < cnt; k++) {
          const u = (k + 0.5) / cnt, x = ax + (bx - ax) * u, z = az + (bz - az) * u, hl = len / cnt / 2;
          if (gaps.some(([gx, gz, gr]) => Math.hypot(x - gx, z - gz) < gr) || !free(x, z, 1.5)) continue;
          const y = Y(x, z) - 0.5, hh = tall + (h(200 + i * 7 + k) - 0.5) * 0.5;
          K.box(layer, x, y, z, hl + 0.02, hh + 0.5, 0.15, yaw, { top: false, collide: false });
          if ((i + k) % 2) K.spike(layer, x + Math.cos(yaw) * hl, y, z - Math.sin(yaw) * hl, 0.2, hh + 1.1, 4, k);
        }
      }
    };

    soft(() => {
      switch (f.kind) {
        case 'camp': {
          stockade('bark', 2.4, 11, R + 5);
          tents(2, R + 1.5, 'cloth_oat');
          for (const sd of [-1, 1]) skullPole(...P(sd * 0.32, R + 5.6), 3.2, 40 + sd);
          // A look-out: four legs, a deck, a rail.
          { const [x, z] = P(Math.PI * 0.85, R + 2.5); if (free(x, z, 1.6)) { const y = Y(x, z); for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box('bark', x + dx, y - 0.3, z + dz, 0.09, 3.6, 0.09, 0, { collide: false }); K.box('wood', x, y + 3, z, 1.25, 0.12, 1.25, 0, { collide: false }); K.box('wood', x, y + 3.7, z - 1.2, 1.25, 0.08, 0.05, 0, { collide: false }); } }
          break;
        }
        case 'dig': {
          for (let i = 0; i < 3; i++) { const [x, z] = P(1 + i * 1.6 + h(i), R + 4 + h(i + 4) * 3); if (free(x, z, 2.5)) K.heap(i % 2 ? 'rubble' : 'dark:rubble', x, z, 2 + h(i + 8) * 1.6, 1.2 + h(i + 12) * 1.2, 7, { collide: false }); }
          // The adit: a mound at the back, a propped mouth in its face, a black throat behind it.
          { const [x, z] = P(Math.PI, R + 5); if (free(x, z, 4)) { K.heap('rubble', x, z, 5, 3.2, 9, { collide: false }); const [ax, az] = P(Math.PI, R + 0.6); K.arch('wood', ax, az, o.yaw, { a: 1.1, hs: 1.9, pw: 0.3, t: 0.5, collide: false }); K.box('dark:stone', ...P(Math.PI, R + 1.4).flatMap((v, i) => (i ? [v] : [v, Y(ax, az) - 0.2])), 1.1, 2.2, 0.5, o.yaw, { collide: false }); } }
          { const [x, z] = P(0.6, R + 2); if (free(x, z, 2)) K.cart(x, z, o.yaw + 1, {}); }
          { const [x, z] = P(-0.7, R + 1.5); if (free(x, z, 1.5)) K.goods(x, z, 2, 1); }
          { const [x, z] = P(-0.3, R + 4); if (free(x, z, 0.5)) K.lantern(x, z, 2.4, o.yaw); }
          for (let i = 0; i < 3; i++) { const [x, z] = P(2.2 + i * 0.5, R + 1 + i); if (free(x, z, 0.5)) K.box('wood', x, Y(x, z) - 0.1, z, 0.9, 0.16, 0.12, h(50 + i) * 3, { collide: false }); }
          break;
        }
        case 'graveyard': {
          const r = R + 6, ring = K.ring(o.x, o.z, r, 4, o.yaw + Math.PI / 4);
          // A low fence, down in places; the lych gate on the trail's side.
          for (let i = 0; i < 4; i++) { const [ax, az] = ring[i], [bx, bz] = ring[i + 1]; for (let k = 0; k < 3; k++) { if (h(60 + i * 3 + k) < 0.3) continue; const u0 = k / 3 + 0.04, u1 = (k + 1) / 3 - 0.04, p0 = [ax + (bx - ax) * u0, az + (bz - az) * u0], p1 = [ax + (bx - ax) * u1, az + (bz - az) * u1]; if (Math.hypot((p0[0] + p1[0]) / 2 - gate[0], (p0[1] + p1[1]) / 2 - gate[1]) < 4 || !free(p0[0], p0[1], 1) || !free(p1[0], p1[1], 1)) continue; K.fence([p0, p1], 1.1); } }
          if (free(gate[0], gate[1], 2)) K.arch('rubble', gate[0], gate[1], o.yaw, { a: 1.2, hs: 2.2, pw: 0.5, t: 0.5, collide: false });
          for (const sd of [-1, 1]) { const [x, z] = P(sd * 1.15, R * 0.55 + 3); if (free(x, z, 3)) K.graves(x, z, o.yaw, 2.2, 1.6, sd > 0 ? 'stone' : 'rubble', 2.1); }
          // The dead-house at the back: four walls, a stone roof, a black door.
          { const [x, z] = P(Math.PI, R + 2.5); if (free(x, z, 2.5)) { const y = Y(x, z); K.box('stone', x, y - 0.4, z, 1.7, 2.6, 1.4, o.yaw, { collide: false }); K.gable('stone', 'stone', x, y + 2.2, z, 1.9, 1.6, 1, o.yaw); K.box('obsidian', ...P(Math.PI, R + 1.08).flatMap((v, i) => (i ? [v] : [v, y - 0.2])), 0.5, 1.9, 0.06, o.yaw, { collide: false }); } }
          deadTree(...P(2.2, R + 3.5), 5.5, 70); deadTree(...P(-2, R + 8), 4.5, 80);
          break;
        }
        case 'tomb': {
          const [mx, mz] = P(Math.PI, R + 6);
          if (free(mx, mz, 6)) { K.heap('dark:rubble', mx, mz, 7, 3.6, 10, { collide: false }); const [ax, az] = P(Math.PI, R - 0.2); K.arch('stone', ax, az, o.yaw, { a: 1, hs: 2, pw: 0.6, t: 0.9, collide: false }); K.box('obsidian', ...P(Math.PI, R + 0.5).flatMap((v, i) => (i ? [v] : [v, Y(ax, az) - 0.2])), 1, 2.2, 0.2, o.yaw, { collide: false }); }
          for (let i = 0; i < 7; i++) { const a = -1.9 + i * 0.63, [x, z] = P(a, R + 4.5); if (Math.abs(a) > 0.25 && free(x, z, 0.6)) K.menhir(i % 2 ? 'rubble' : 'stone', x, z, 0.7 + h(i) * 0.3, 2 + h(i + 9) * 1.4, o.yaw + a, (h(i + 20) - 0.5) * 0.3); }
          for (const sd of [-1, 1]) { const [x, z] = P(sd * 0.5, R + 7); if (free(x, z, 1.4)) K.cairn(x, z, 1, 1.3); }
          break;
        }
        case 'fort': {
          stockade('dark:wood', 3.3, 8, R + 6, 3);
          tents(3, R + 1, 'cloth_red', 1.15);
          for (const sd of [-1, 1]) { const [x, z] = P(sd * 0.3, R + 6.6); if (free(x, z, 0.5)) K.banner(x, z, 5.5, o.yaw, 'cloth_red', { collide: false, pole: 'dark:wood' }); const [bx, bz] = P(sd * 0.5, R * 0.5); if (free(bx, bz, 0.5)) K.brazier(bx, bz, 1.2); }
          { const [x, z] = P(Math.PI * 0.9, R * 0.6); if (free(x, z, 1.5)) K.rack(x, z, o.yaw, 1.8, null, 1.6); }
          break;
        }
        case 'tower': {
          for (let i = 0; i < 5; i++) { const a0 = 0.5 + i * 1.1, [ax, az] = P(a0, R + 5), [bx, bz] = P(a0 + 0.8, R + 5); if (h(90 + i) > 0.25 && free(ax, az, 1) && free(bx, bz, 1)) K.wall('dark:rubble', ax, az, bx, bz, 0.8, 2.6, { ruin: true }); }
          for (const sd of [-1, 1]) { const [x, z] = P(sd * 0.35, R + 3); if (free(x, z, 0.5)) K.brazier(x, z, 1.3); }
          { const [x, z] = P(0.9, R + 2); if (free(x, z, 0.5)) K.banner(x, z, 5, o.yaw, 'cloth_red', { collide: false, pole: 'dark:wood' }); }
          tents(1, R + 1, 'cloth_red');
          break;
        }
        case 'ring': case 'coven': {
          const coven = f.kind === 'coven', stone = /rime/.test(o.faction) ? 'pale:stone' : coven ? 'dark:stone' : 'rubble';
          for (let i = 0; i < 7; i++) { const a = 0.4 + i * (TAU - 0.8) / 6, [x, z] = P(a, R + 4); if (free(x, z, 0.6)) K.menhir(stone, x, z, 0.8 + h(i) * 0.4, (coven ? 1.4 : 2.4) + h(i + 9) * 1.3, o.yaw + a, (h(i + 20) - 0.5) * 0.25); }
          { const [x, z] = P(Math.PI, R * 0.3); if (free(x, z, 1.2)) K.box(stone, x, Y(x, z) - 0.2, z, 1.2, 0.75, 0.6, o.yaw, { collide: false }); }
          if (coven) { for (let i = 0; i < 2; i++) { const [x, z] = P(1.57 + i * 3.14, R + 1.5); if (free(x, z, 0.5)) K.brazier(x, z, 1.1); } const [x, z] = P(Math.PI, R + 7.5); if (free(x, z, 2.5)) K.pavilion(x, z, 2.2, 3, 'cloth_oat'); }
          else for (const sd of [-1, 1]) skullPole(...P(sd * 0.3, R + 5), 2.8, 50 + sd);
          break;
        }
        case 'nest': {
          for (let i = 0; i < 3; i++) deadTree(...P(0.8 + i * 2 + h(i), R + 6 + h(i + 5) * 3), 5 + h(i + 9) * 3, 100 + i * 12);
          // What they've hung up to keep.
          for (let i = 0; i < 2; i++) { const [x, z] = P(1.8 + i * 2.6, R + 3.5); if (!free(x, z, 0.5)) continue; const y = Y(x, z); K.spike('bark', x, y - 0.4, z, 0.13, 4.4, 5, i, [0.2, 0.1]); K.beam('white', [x + 0.7, y + 3.6, z + 0.35], [x + 0.7, y + 2.5, z + 0.35], 0.02); K.drum('cloth_oat', x + 0.7, y + 1.5, z + 0.35, 0.2, 1, 6, { r2: 0.34, collide: false }); K.cone('cloth_oat', x + 0.7, y + 2.5, z + 0.35, 0.34, 0.4, 6); }
          break;
        }
        case 'ruin': {
          const r = R + 5, ring = K.ring(o.x, o.z, r, 4, o.yaw + Math.PI / 4);
          for (let i = 0; i < 4; i++) { if (i === 3 || h(110 + i) < 0.2) continue; const [ax, az] = ring[i], [bx, bz] = ring[i + 1]; if (free(ax, az, 1.5) && free(bx, bz, 1.5) && free((ax + bx) / 2, (az + bz) / 2, 1.5)) K.wall('rubble', ax, az, bx, bz, 0.9, 4.4, { ruin: true, gap: 1.6 }); }
          if (free(gate[0], gate[1], 2.5)) K.arch('rubble', gate[0], gate[1], o.yaw, { a: 1.5, hs: 3, pw: 0.8, t: 0.9, broken: 0.1, collide: false });
          for (let i = 0; i < 5; i++) { const [x, z] = P(h(120 + i) * TAU, R * (0.4 + h(125 + i))); if (free(x, z, 0.7)) K.drum('stone', x, Y(x, z) - 0.15, z, 0.45, 0.5 + h(130 + i) * 0.8, 8, { collide: false, turn: i }); }
          break;
        }
        case 'field': {
          // Scarecrows on their poles round a patch of stubble, a rick or two, a fence that's mostly down.
          for (let i = 0; i < 5; i++) { const [x, z] = P(0.5 + i * 1.25, R + 3 + h(i) * 3); if (!free(x, z, 0.6)) continue; const y = Y(x, z); K.spike('bark', x, y - 0.3, z, 0.08, 2.5, 4, i); K.beam('bark', [x - 0.8, y + 1.7, z], [x + 0.8, y + 1.75, z], 0.06); K.drum('cloth_oat', x, y + 1.9, z, 0.2, 0.36, 6, { collide: false }); K.cone('roof_1', x, y + 2.24, z, 0.36, 0.3, 6); K.drum('cloth_oat', x, y + 1.0, z, 0.22, 0.75, 5, { r2: 0.3, collide: false }); }
          for (let i = 0; i < 2; i++) { const [x, z] = P(2.4 + i * 1.4, R + 8); if (free(x, z, 2)) K.heap('roof_1', x, z, 1.7, 2.3, 9, { collide: false }); }
          for (let i = 0; i < 4; i++) { const [ax, az] = P(0.5 + i * 1.5, R + 10), [bx, bz] = P(1.3 + i * 1.5, R + 10); if (h(140 + i) > 0.35 && free(ax, az, 1) && free(bx, bz, 1)) K.fence([[ax, az], [bx, bz]], 1); }
          break;
        }
        case 'pesthouse': {
          for (let i = 0; i < 2; i++) { const a = Math.PI * (0.7 + i * 0.6), [x, z] = P(a, R + 3.5); if (free(x, z, 2.5)) K.leanTo(x, z, o.yaw + a + Math.PI, 2.2, 1.5, 2.3, 'roof_1', 'wood', { collide: false }); }
          { const [x, z] = P(0.7, R + 3); if (free(x, z, 2)) K.cart(x, z, o.yaw + 2, { load: 'cloth_oat' }); }
          // The burning ground: a black heap with what wouldn't burn standing out of it.
          { const [x, z] = P(-1.2, R + 5); if (free(x, z, 2.5)) { K.heap('dark:rubble', x, z, 2.4, 1, 8, { collide: false }); for (let i = 0; i < 3; i++) K.spike('dark:wood', x + (h(150 + i) - 0.5) * 2.4, Y(x, z) + 0.3, z + (h(155 + i) - 0.5) * 2.4, 0.07, 1 + h(160 + i), 4, i, [(h(165 + i) - 0.5) * 0.6, (h(170 + i) - 0.5) * 0.6]); } }
          tents(2, R + 1, 'cloth_oat');
          for (const sd of [-1, 1]) skullPole(...P(sd * 0.3, R + 5), 2.6, 60 + sd);
          break;
        }
        default:   // (a roost, a den, a bed: what the lair's own dressing lays, and the rocks below)
      }
    });
    // What's solid: Velscour's towers, the crags of a roost, the boulders of a den, the black glass round a drake's bed.
    if (f.kind === 'fort') for (const sd of [-1, 1]) { const [x, z] = P(Math.PI + sd * 0.75, R + 6.5); if (free(x, z, 3.5)) K.tower('dark:block', x, z, 2.1, 7.5, null); }
    else if (f.kind === 'tower') { const [x, z] = P(Math.PI, R + 5); if (free(x, z, 5)) { K.tower('dark:block', x, z, 3.1, 15, null); K.drum('dark:course', x, Y(x, z) + 9.5, z, 3.5, 0.6, 14, { collide: false }); } }
    else if (f.kind === 'roost') { for (let i = 0; i < 3; i++) { const [x, z] = P(Math.PI + (i - 1) * 0.9, R + 5 + h(i) * 2); if (!free(x, z, 3)) continue; const tall = 5 + h(i + 3) * 4; K.rock('rubble', x, z, 2 + h(i + 6), tall, { turn: h(i + 9) * 6 }); soft(() => { const y = Y(x, z) + tall * 0.92; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, b = a + 2; K.beam('bark', [x + Math.cos(a) * 0.9, y + (k % 2) * 0.1, z + Math.sin(a) * 0.9], [x + Math.cos(b) * 0.9, y + 0.1, z + Math.sin(b) * 0.9], 0.07); } }); } }
    else if (f.kind === 'den') { for (let i = 0; i < 4; i++) { const [x, z] = P(Math.PI + (i - 1.5) * 0.5, R + 4.5 + (i % 2) * 2.2); if (free(x, z, 3)) K.rock('rubble', x, z, 2 + h(i) * 1.2, 2 + h(i + 4) * 1.6, { turn: h(i + 8) * 6 }); } }
    else if (f.kind === 'bed') soft(() => { for (let i = 0; i < 6; i++) { const [x, z] = P(0.6 + i * 1.0, R + 6 + h(i) * 2); if (free(x, z, 0.8)) K.spike(i % 2 ? 'obsidian' : 'dark:stone', x, Y(x, z) - 0.4, z, 0.5 + h(i + 5) * 0.4, 2 + h(i + 10) * 2.6, 5, i, [(h(i + 15) - 0.5) * 0.5, (h(i + 20) - 0.5) * 0.5]); } });
  });

  // Where the world tears: a ring of black shards leaning out from its middle, there whether it's open or shut.
  soft(() => {
    TEAR_SPOTS.forEach(([x, z], n) => {
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + n, r = 5.2 + hash2(n, i) * 1.2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (free(px, pz, 0.5)) K.spike('obsidian', px, Y(px, pz) - 0.4, pz, 0.34 + hash2(i, n) * 0.2, 1.6 + hash2(n + 3, i) * 2.2, 4, i, [Math.cos(a) * 0.35, Math.sin(a) * 0.35]); }
    });
  });

  // The small things to find (on a phone too: each has something put by, and a glint over nothing would be a cheat).
  soft(() => {
    FINDS.forEach(([x, z, kind], n) => {
      if (!free(x, z, 1.5)) return;
      const y = Y(x, z), yaw = hash2(n, 9) * TAU, h = (k) => hash2(n * 3 + k, k * 7 - n);
      const bones = (bx, bz) => { for (let i = 0; i < 3; i++) { const a = h(i) * TAU, len = 0.3 + h(i + 3) * 0.3; K.beam('pale:stone', [bx - Math.cos(a) * len, Y(bx, bz) + 0.04, bz - Math.sin(a) * len], [bx + Math.cos(a) * len, Y(bx, bz) + 0.07, bz + Math.sin(a) * len], 0.05); } K.spike('pale:stone', bx + 0.3, Y(bx, bz) - 0.02, bz, 0.13, 0.2, 4, n); };
      switch (FIND_KINDS[kind]) {
        case 'cart': K.cart(x, z, yaw, {}); bones(x + 1.8, z + 0.6); break;
        case 'wreck': K.cart(x, z, yaw, { load: 'cloth_oat' }); K.goods(x + 2, z - 1, 4, 1.3); K.barrel(x - 1.8, z + 1); break;
        case 'grave': K.gravestone(x, z, yaw, 0.8, 'stone'); K.box('dark:rubble', x - Math.sin(yaw) * 1, y - 0.12, z - Math.cos(yaw) * 1, 0.4, 0.28, 0.9, yaw, { collide: false }); K.spike('bark', x + 0.9, y - 0.2, z + 0.3, 0.05, 1.3, 4, n); break;
        case 'cairn': K.cairn(x, z, 1.2, 1.5); break;
        case 'camp': K.tent(x, z, yaw, 1.4, 1.2, 1.5, 'cloth_oat'); K.campfire(x + Math.sin(yaw) * 2.6, z + Math.cos(yaw) * 2.6, false); K.beam('bark', [x + Math.sin(yaw) * 2.6 - 1.4, Y(x, z) + 0.14, z + Math.cos(yaw) * 2.6 + 1], [x + Math.sin(yaw) * 2.6 - 0.2, Y(x, z) + 0.14, z + Math.cos(yaw) * 2.6 + 1.8], 0.28); break;
        case 'stone': K.menhir('rubble', x, z, 1, 3.2, yaw, 0.12); K.rock('rubble', x + 1.4, z + 0.5, 0.5, 0.4, { collide: false }); break;
        case 'bones': for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) { const u = (i - 2.5) * 0.7, bx = x + Math.cos(yaw) * u, bz = z + Math.sin(yaw) * u; K.spike('pale:stone', bx - Math.sin(yaw) * sd * 0.9, Y(bx, bz) - 0.1, bz + Math.cos(yaw) * sd * 0.9, 0.09, 1.7 - Math.abs(i - 2.5) * 0.22, 4, i, [Math.sin(yaw) * sd * 0.5, -Math.cos(yaw) * sd * 0.5]); } bones(x + 2.6, z); break;
        case 'well': K.well(x, z, yaw, {}); break;
        case 'hide': K.leanTo(x, z, yaw, 1.6, 1.1, 1.7, 'roof_1', 'bark', {}); K.rack(x + Math.sin(yaw) * 2.4, z + Math.cos(yaw) * 2.4, yaw, 1.3, null, 1.5); break;
        case 'shrine': K.menhir('stone', x, z, 0.8, 1.5, yaw, 0); K.drum('stone', x, y - 0.15, z, 1.3, 0.3, 10, { collide: false }); K.lantern(x + 1.5, z, 2, yaw); break;
        case 'pyre': K.heap('dark:rubble', x, z, 1.8, 0.7, 8, { collide: false }); for (let i = 0; i < 4; i++) K.spike('dark:wood', x + (h(i) - 0.5) * 1.8, y + 0.2, z + (h(i + 4) - 0.5) * 1.8, 0.07, 0.9 + h(i + 8), 4, i, [(h(i + 12) - 0.5) * 0.7, (h(i + 16) - 0.5) * 0.7]); bones(x + 1.6, z + 1); break;
        default: K.spike('bark', x, y - 0.4, z, 0.2, 4.2, 6, n); for (let i = 0; i < 3; i++) K.spike('pale:stone', x + 0.02, y + 1.6 + i * 0.8, z + 0.2, 0.2, 0.3, 4, i); K.beam('bark', [x - 0.9, y + 3.3, z], [x + 0.9, y + 3.35, z], 0.08);
      }
    });
  }, true);
}
