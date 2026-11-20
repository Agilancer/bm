// What makes each of Phobos's houses its own, and each district's unlike the next (the owner, 2026-11-19: "make the town
// look unique and interesting, and make the houses look even more unique"). src/core/phobos-build.js lays the houses out
// and builds their shells (phobosHouses, houseFar, houseNear); this says how each one is roofed and dressed, the same from
// far and near, by its district and a number of its own:
//   styleOf(h)      what this house is: its roof's shape, a jetty, an oriel, a gallery, timbering, a great stack, and so on
//   roofs(...)      a roof of any of the shapes, over a house's top (far and near)
//   houseFarMore    what's seen of its style from across the city (a great stack, a tower-house's turret)
//   dressHouse      what's seen of it from the street (the near cells': nothing here stops a body)
//   streetLife      what stands along the streets of a near cell: carts, troughs, stalls, vats, heaps, wash lines
//   LANDMARKS       the one-off houses, a few to a district: a tavern, a guildhall, a tower-house, a burnt shell
// No house is added or taken away here: a house's door is its place in the list (src/items/phobos-doors.js).
// No piece makes a cross or a T: timbers are uprights and V braces, never a bar across a post; a chain hangs from a beam's
// end; no rails on balusters (a gallery's front is boarded). His V is in the braces under the windows and on the doors'
// hoods. No letters but the shops' signs. Never the village's wall_NN (the owner's rule): ph_* and p2_* only.
import { terrainHeight } from './terrain.js';
import { hash2 } from './terrain-noise.js';

const TAU = Math.PI * 2, Y = (x, z) => terrainHeight(x, z);
const DOOR = 0.8, WALL = 0.45;
const idOf = (h) => Math.round(h.x * 7 + h.z * 13);

// Each district's character. roofs: how often each shape; the rest: how likely a house is to have it (where it can).
//   gable   a ridge and two slopes            hip      four slopes, no gable
//   crow    a gable with stepped end walls    pent     one slope, back to the alley
//   mansard two pitches all round             gambrel  a barn's roof, two pitches each side
//   flat    a lid behind a parapet            ribs     burnt out: the end walls and the rafters
const STYLE = {
  barbican: { roofs: { hip: 5, flat: 3, gable: 2 }, plinth: 0.9, quoin: 0.5, hood: 'stone', tones: ['', 'soot:', 'dark:'], merlon: 1 },
  cinder: { roofs: { gable: 4, pent: 3, ribs: 5, hip: 1 }, stack: 0.1, char: 0.7, tones: ['', 'char:', 'soot:'] },
  rookeries: { roofs: { gable: 4, gambrel: 3, pent: 2, mansard: 1 }, jetty: 0.85, gallery: 0.4, timber: 0.5, hood: 'board', tones: ['', 'soot:', 'umber:', 'dark:', ''] },
  market: { roofs: { crow: 4, gable: 3, hip: 1, gambrel: 1 }, jetty: 0.55, oriel: 0.25, timber: 0.9, hood: 'board', hoist: 0.2, tones: ['', 'pale:', 'umber:', ''] },
  wharf: { roofs: { gambrel: 5, gable: 3, pent: 2 }, gallery: 0.3, hoist: 0.6, stack: 0.05, timber: 0.3, tones: ['', 'soot:', 'mire:', ''] },
  tanners: { roofs: { gable: 4, pent: 3, gambrel: 2 }, timber: 0.8, loft: 0.5, stack: 0.14, jetty: 0.4, hood: 'board', tones: ['', 'umber:', 'umber:', 'mire:'] },
  bones: { roofs: { hip: 5, gable: 3, flat: 2 }, plinth: 1, bone: 0.7, hood: 'stone', tones: ['', 'pale:'] },
  barracks: { roofs: { flat: 4, hip: 4, gable: 2 }, plinth: 0.8, merlon: 1, hood: 'stone', tones: ['', 'dark:'] },
  mages: { roofs: { mansard: 3, hip: 3, gable: 2, crow: 2 }, oriel: 0.55, finial: 0.7, dormer: 0.6, quoin: 0.6, plinth: 0.7, hood: 'stone', vane: 0.3, tones: ['', 'frost:', ''] },
  dukes: { roofs: { mansard: 5, hip: 3, crow: 2 }, oriel: 0.5, dormer: 0.85, quoin: 0.85, plinth: 1, finial: 0.5, hood: 'stone', vane: 0.2, tones: ['', 'pale:', ''] },
  approach: { roofs: { crow: 4, hip: 3, mansard: 2, gable: 1 }, oriel: 0.3, plinth: 1, quoin: 0.7, dormer: 0.4, hood: 'stone', tones: ['', 'dark:', ''] },
  other: { roofs: { gable: 6, hip: 2, gambrel: 1, pent: 1, crow: 1 }, jetty: 0.45, timber: 0.6, hood: 'board', hoist: 0.08, tones: ['', 'soot:', 'umber:', ''] },
};
const pickW = (w, v) => { const ks = Object.keys(w); let sum = 0; for (const k of ks) sum += w[k]; let t = v * sum; for (const k of ks) { t -= w[k]; if (t <= 0) return k; } return ks.at(-1); };

// The one-off houses: [kind, district, its name, how many]. Each is one of the houses that already stands there, chosen
// by a number of its own (landmark(), below), and dressed as what it is.
export const LANDMARKS = [
  // (A tavern's fourth: which of the shops' twenty boards is its own, tools/phobos/textures/signs.py: 0 The Drowned Rat,
  // 4 Gutter Ales, 11 The Hanged Man, 16 The Bitter End. Three are named for their boards; the rest hang the brewer's.)
  ['tavern', 'barbican', 'the Last Lantern', 4], ['tavern', 'cinder', 'the Clinker', 4], ['tavern', 'rookeries', 'the Drowned Rat', 0], ['tavern', 'market', 'the Hanged Man', 11],
  ['tavern', 'wharf', 'the Bitter End', 16], ['tavern', 'tanners', 'the Dyed Hand', 4], ['tavern', 'barracks', 'the Broken Lance', 4], ['tavern', 'dukes', 'the Black Swan', 4],
  ['tavern', 'mages', 'the Ninth Candle', 4], ['tavern', 'bones', "the Sexton's Spade", 4], ['tavern', 'approach', 'the Red Stirrup', 4],
  ['guildhall', 'market', "the Chainwrights' Hall"], ['guildhall', 'tanners', "the Dyers' Hall"], ['guildhall', 'wharf', "the Lightermen's Hall"], ['guildhall', 'dukes', 'the Assay House'],
  ['guildhall', 'mages', "the Scriveners' Hall"], ['guildhall', 'barracks', "the Farriers' Hall"],
  ['towerhouse', 'mages', "the Astrologer's House"], ['towerhouse', 'dukes', 'the House of Seven Storeys'], ['towerhouse', 'approach', "the Bailiff's Tower"], ['towerhouse', 'market', "the Moneylender's Tower"],
  ['towerhouse', 'rookeries', 'the Leaning House'], ['towerhouse', 'bones', "the Charnel-Keeper's House"],
  ['shell', 'cinder', 'the Burnt Chandlery Row'], ['shell', 'cinder', "the Smelter's Shell"], ['shell', 'rookeries', 'the Fever House'],
  // (More tower-houses, to break the roofs' line in every quarter that has a roof line: the critics, 2026-11-20.)
  ['towerhouse', 'market', "the Chain-Factor's House"], ['towerhouse', 'mages', 'the House of Lenses'], ['towerhouse', 'dukes', 'the Old Vasque House'], ['towerhouse', 'approach', 'the Tithe House'],
  ['towerhouse', 'rookeries', 'the Crooked Stack'], ['towerhouse', 'barbican', "the Gate-Reeve's House"], ['towerhouse', 'tanners', 'the Alum House'], ['towerhouse', 'wharf', "the Harbour-Reeve's House"],
  ['towerhouse', 'other', "the Widow's Watch"], ['towerhouse', 'other', 'the Salt House'],
];
// Which house each is: of its district's houses on a street (a tavern's and a guildhall's wide enough to be one), the one
// its own number picks. [{ kind, key, name, h }], made once the houses are (styleHouses).
let MARKED = null;
export const landmarks = () => MARKED || [];

// Every house's style, once: h.st. And the landmarks marked (h.mark), a tower-house made tall.
export function styleHouses(houses) {
  if (MARKED) return;
  MARKED = [];
  const taken = new Set();
  LANDMARKS.forEach(([kind, key, name, sign], n) => {
    const want = (h) => h.roof && !h.spire && !h.hub && h.dk === key && !taken.has(h) && (kind === 'shell' ? !h.shop : kind === 'towerhouse' ? h.hx < 5.4 : h.shop || h.hx >= 3.6);
    let best = null, bv = 2;
    for (const h of houses) { if (!want(h)) continue; const v = hash2(idOf(h), 700 + n) + (h.shop ? 0 : 0.6); if (v < bv) { bv = v; best = h; } }
    if (!best) return;
    taken.add(best); best.mark = { kind, name, sign };
    // (A tower-house: half as tall again and more, its roof a steep cap. The stair inside goes as far as it did.)
    if (kind === 'towerhouse') best.h = Math.max(best.h * 1.7, 19 + 6 * hash2(idOf(best), 701));
    // (A guildhall a storey over its row, under a steep roof: src/core/phobos-build.js roofOf.)
    if (kind === 'guildhall') best.h = Math.max(best.h * 1.3, 14);
    MARKED.push({ kind, key, name, h: best });
  });
  for (const h of houses) if (!h.spire) h.st = styleOf(h);
}
export function styleOf(h) {
  if (h.st) return h.st;
  const S = STYLE[h.dk] || STYLE.other, id = idOf(h), r = (k) => hash2(id, 400 + k), storeys = Math.max(1, Math.round(h.h / 3.3));
  // (A hub's hall is what it was: src/core/phobos-hubs.js dresses it.)
  if (h.hub) return (h.st = { roof: h.roof ? 'gable' : 'none', S, jetty: 0 });
  const st = { roof: h.roof ? pickW(S.roofs, r(1)) : 'none', S };
  // (On the named streets a crow gable or a gable wants its end to the street; a stepped gable needs a house a little wide.)
  if (st.roof === 'crow' && Math.min(h.hx, h.hz) < 2.6) st.roof = 'gable';
  if ((st.roof === 'mansard' || st.roof === 'gambrel') && Math.min(h.hx, h.hz) < 3) st.roof = 'gable';
  if (st.roof === 'ribs' && h.shop) st.roof = 'gable';
  const daub = /daub|market_wall|boards/.test(h.wall || ''), poor = /poor|daub|soot|burnt|char|boards|rubble/.test(h.wall || '');
  st.jetty = h.roof && storeys >= 2 && r(2) < (S.jetty || 0) ? (storeys >= 3 && r(3) < 0.6 ? 2 : 1) : 0;
  st.oriel = h.roof && storeys >= 2 && h.hx >= 2.7 && r(4) < (S.oriel || 0);
  st.gallery = !st.oriel && st.jetty < 2 && storeys >= 3 && h.hx >= 2.8 && r(5) < (S.gallery || 0);
  st.timber = daub && r(6) < (S.timber || 0);
  st.stack = h.roof && !h.shop && r(7) < (S.stack || 0);
  st.plinth = !poor && r(8) < (S.plinth || 0);
  st.quoin = !poor && r(9) < (S.quoin || 0);
  st.hood = !h.shop && r(10) < 0.7 ? S.hood || null : null;
  st.hoist = storeys >= 2 && r(11) < (S.hoist || 0);
  st.loft = storeys >= 2 && r(12) < (S.loft || 0);
  st.dormer = r(13) < (S.dormer || 0) ? 1 + (h.hx > 4.5 && r(14) < 0.5 ? 1 : 0) : 0;
  st.finial = r(15) < (S.finial || 0);
  st.vane = r(16) < (S.vane || 0);
  st.bone = r(17) < (S.bone || 0);
  st.char = r(18) < (S.char || 0);
  st.merlon = !!S.merlon;
  // (Its walls a shade of their own, where they're one of the plain stones: the same brick in soot, in umber, pale.)
  const tone = S.tones[Math.floor(r(19) * S.tones.length) % S.tones.length];
  if (tone && h.wall && !h.wall.includes(':') && !h.hub) h.wall = tone + h.wall;
  if (h.mark?.kind === 'tavern') Object.assign(st, { jetty: Math.max(st.jetty, storeys >= 2 ? 1 : 0), oriel: false, gallery: false, hoist: false, hood: null });
  if (h.mark?.kind === 'guildhall') Object.assign(st, { roof: Math.min(h.hx, h.hz) >= 2.6 ? 'crow' : 'gable', jetty: 0, oriel: false, gallery: false, plinth: true, hood: null, hoist: false, loft: false });
  // (A tower-house: its main block flat-headed behind a parapet with his V at the corners, a narrower stage and a cap over it,
  // a turret up its corner: towerStage.)
  if (h.mark?.kind === 'towerhouse') Object.assign(st, { roof: 'flat', merlon: true, jetty: 0, gallery: false, oriel: storeys >= 2 && h.hx >= 2.7, hoist: false, loft: false, stack: false, dormer: 0 });
  if (h.mark?.kind === 'shell') Object.assign(st, { roof: 'ribs', jetty: 0, gallery: false, oriel: false, char: true, hoist: false, loft: false, stack: false });
  return (h.st = st);
}
// How high a house's eaves are over its floor's ground: its height, but for a tower-house, whose main block stops short of
// it under a narrower stage (towerStage).
export const eavesOf = (h) => (h.mark?.kind === 'towerhouse' ? h.h * 0.72 : h.h);
// How far a house's upper storeys stand out over the street (a deep jetty), from the third storey up.
export const jutOf = (h) => (h.st?.jetty === 2 ? 0.36 : 0);

// ---------------------------------------------------------------- roofs

const frame = (x, y, z, yaw) => {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  P.n = (nx, ny, nz) => [nx * c + nz * s, ny, -nx * s + nz * c];
  return P;
};
// How high a roof's top is over the eaves, by its shape (R: phobos-build.js roofOf).
export function roofTop(kind, R) {
  const { sz, rh } = R;
  if (kind === 'flat') return 0.75;
  if (kind === 'pent') return rh * 0.8;
  if (kind === 'mansard') { const d = Math.min(sz * 0.4, 1.5), y1 = Math.max(1.6, rh * 0.62); return y1 + (sz - d) * 0.35; }
  if (kind === 'gambrel') return rh * 0.62 + sz * 0.5 * 0.5;
  if (kind === 'crow') return rh + 0.55;
  return rh;
}
// A roof of shape kind over a house's top at (x, y, z): R its spans and pitch (roofOf), zs which way its high side is (a
// pent's), near whether it's seen from the street (its steps, its rafters' thickness). Its gable ends in wall.
export function roofs(K, kind, roof, wall, x, y, z, R, zs = 1, near = false) {
  const P = frame(x, y, z, R.yaw), { sx, sz, rh } = R, ex = sx - 0.4, ez = sz - 0.4;
  // A slope across the ridge, from z0 at y0 up to z1 at y1, its eave from a0 to a1 along the ridge and its head from b0 to b1.
  const sl = (z0, y0, z1, y1, a0, a1, b0, b1, layer = roof) => { const dz = z1 - z0, dy = y1 - y0, l = Math.hypot(dz, dy) || 1; K.quad(layer, P(a0, y0, z0), P(a1, y0, z0), P(b1, y1, z1), P(b0, y1, z1), P.n(0, Math.abs(dz) / l, -dy / l * Math.sign(dz || 1))); };
  // And one along it, from x0 at y0 up to x1 at y1.
  const xl = (x0, y0, x1, y1, a0, a1, b0, b1, layer = roof) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1; K.quad(layer, P(x0, y0, a0), P(x0, y0, a1), P(x1, y1, b1), P(x1, y1, b0), P.n(-dy / l * Math.sign(dx || 1), Math.abs(dx) / l, 0)); };
  // Three corners, facing n: from far a plain triangle (a corner fewer, ten thousand times), from near a face with its
  // last corner doubled, so its stone doesn't smear on a wall turned 45 degrees (K.tri's runs by x + z).
  const tri = (layer, a, b, c, n) => {
    if (near) return K.quad(layer, a, b, c, c, n);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if ((uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0) K.tri(layer, a, c, b); else K.tri(layer, a, b, c);
  };
  // A gable end at local x: the wall up under the roof, from its eaves to a point.
  const end = (e, top, k = 1, at = ex) => tri(wall, P(e * at, -0.02, -ez * k), P(e * at, -0.02, ez * k), P(e * at, top, 0), P.n(e, 0, 0));
  // A hip's end: a slope along the ridge from x0 up to a point at x1.
  const hipEnd = (x0, y0, x1, y1, hz) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1; tri(roof, P(x0, y0, -hz), P(x0, y0, hz), P(x1, y1, 0), P.n(-dy / l * Math.sign(dx || 1), Math.abs(dx) / l, 0)); };
  if (kind === 'hip') {
    const rl = Math.max(0.25, sx - sz);
    sl(-sz, 0, 0, rh, -sx, sx, -rl, rl); sl(sz, 0, 0, rh, -sx, sx, -rl, rl);
    hipEnd(sx, 0, rl, rh, sz); hipEnd(-sx, 0, -rl, rh, sz);
  } else if (kind === 'pent') {
    const hy = rh * 0.8;
    sl(-zs * sz, 0, zs * sz, hy, -sx, sx, -sx, sx);
    for (const e of [-1, 1]) tri(wall, P(e * ex, 0, -zs * ez), P(e * ex, 0, zs * ez), P(e * ex, hy * (sz + ez) / (2 * sz), zs * ez), P.n(e, 0, 0));
    K.quad(wall, P(-ex, 0, zs * ez), P(ex, 0, zs * ez), P(ex, hy * (sz + ez) / (2 * sz), zs * ez), P(-ex, hy * (sz + ez) / (2 * sz), zs * ez), P.n(0, 0, zs));
  } else if (kind === 'mansard') {
    const d = Math.min(sz * 0.4, 1.5), y1 = Math.max(1.6, rh * 0.62), ux = sx - d, uz = sz - d, y2 = y1 + uz * 0.35, rl = Math.max(0.25, ux - uz);
    sl(-sz, 0, -uz, y1, -sx, sx, -ux, ux); sl(sz, 0, uz, y1, -sx, sx, -ux, ux);
    xl(sx, 0, ux, y1, -sz, sz, -uz, uz); xl(-sx, 0, -ux, y1, -sz, sz, -uz, uz);
    sl(-uz, y1, 0, y2, -ux, ux, -rl, rl); sl(uz, y1, 0, y2, -ux, ux, -rl, rl);
    hipEnd(ux, y1, rl, y2, uz); hipEnd(-ux, y1, -rl, y2, uz);
  } else if (kind === 'gambrel') {
    const z1 = sz * 0.5, y1 = rh * 0.62, y2 = y1 + z1 * 0.5, k = (ez - 0.0) / sz;
    for (const e of [-1, 1]) { sl(e * sz, 0, e * z1, y1, -sx, sx, -sx, sx); sl(e * z1, y1, 0, y2, -sx, sx, -sx, sx); }
    for (const e of [-1, 1]) {
      K.quad(wall, P(e * ex, -0.02, -ez), P(e * ex, -0.02, ez), P(e * ex, y1 * k, z1 * k), P(e * ex, y1 * k, -z1 * k), P.n(e, 0, 0));
      tri(wall, P(e * ex, y1 * k, -z1 * k), P(e * ex, y1 * k, z1 * k), P(e * ex, y2 * k, 0), P.n(e, 0, 0));
    }
  } else if (kind === 'flat') {
    // (Far, the box's own lid is the roof. Near: the lid a little under a parapet's top.)
    if (near) {
      K.quad(roof, P(-ex, 0.03, -ez), P(-ex, 0.03, ez), P(ex, 0.03, ez), P(ex, 0.03, -ez), [0, 1, 0]);
      for (const e of [-1, 1]) { const [bx, by, bz] = P(0, 0, e * (ez - 0.12)); K.box(wall, bx, by, bz, ex, 0.75, 0.14, R.yaw, { collide: false }); const [cx, cy, cz] = P(e * (ex - 0.12), 0, 0); K.box(wall, cx, cy, cz, 0.14, 0.75, ez - 0.28, R.yaw, { collide: false }); }
    }
  } else if (kind === 'ribs') {
    // Burnt out: the two end walls stand, black, and what's left of the rafters between them.
    for (const e of [-1, 1]) end(e, rh * (ez / sz));
    const n = near ? Math.max(3, Math.round(sx / 0.9)) : 3, t = near ? 0.16 : 0.3;
    for (let i = 1; i < n; i++) {
      const lx = -ex + 2 * ex * i / n, gone = hash2(Math.round(x * 3 + i * 7), Math.round(z * 5)) ;
      if (gone < 0.25) continue;
      // (Each a pair up to the ridge, or one broken short; flat boards from far.)
      const cut = gone < 0.5 ? 0.55 : 1;
      for (const e of [-1, 1]) {
        if (near) K.beam('char:wood', P(lx, 0, e * ez), P(lx, rh * cut * (ez / sz), e * ez * (1 - cut)), t);
        else K.quad('char:wood', P(lx - t, 0, e * ez), P(lx + t, 0, e * ez), P(lx + t, rh * cut * (ez / sz), e * ez * (1 - cut)), P(lx - t, rh * cut * (ez / sz), e * ez * (1 - cut)), P.n(0, 0.7, e * 0.7));
      }
    }
    if (near) K.beam('char:wood', P(-ex, rh * (ez / sz) - 0.05, 0), P(ex * 0.3, rh * (ez / sz) - 0.05, 0), 0.18);
  } else {
    sl(-sz, 0, 0, rh, -sx, sx, -sx, sx); sl(sz, 0, 0, rh, -sx, sx, -sx, sx);
    if (kind === 'crow') {
      // Stepped gables: each end wall carried up past the roof in steps (from far, a wall a little bigger than the roof).
      if (!near) for (const e of [-1, 1]) end(e, rh + 0.55, 1.08, ex + 0.06);
      else for (const e of [-1, 1]) {
        end(e, rh * (ez / sz));
        const n = Math.max(3, Math.min(6, Math.round(rh / 1.1)));
        for (let k = 0; k < n; k++) { const w = (ez + 0.25) * (1 - k / n) - (k === n - 1 ? 0 : 0), y0 = rh * k / n - 0.3, [bx, by, bz] = P(e * (ex + 0.04), y0, 0); K.box(wall, bx, by, bz, 0.2, rh / n + 0.75, Math.max(0.3, w * (1 - 0.5 / n)), R.yaw, { collide: false }); }
      }
    } else for (const e of [-1, 1]) end(e, rh * (ez / sz));
  }
}

// ---------------------------------------------------------------- from far

// A tower-house's head, over its main block (whose eaves are top): a narrower stage set back from every side, one great
// window in its street face lit at night, a steep cap, and a round turret up its street corner from under the eaves to
// over the cap's foot, coned. The same from far and near (near: the turret's corbel, the window's one mullion, slits).
function towerStage(K, h, F, top, near) {
  const { c, s } = F, f = h.front, P = (lx, ly, lz) => [h.x + lx * c + lz * s, ly, h.z - lx * s + lz * c], NC = { collide: false };
  const y2 = F.hi + h.h + 1, ix = h.hx - 0.9, iz = h.hz - 0.9, sides = near ? 10 : 6, NF = [f * s, 0, f * c];
  K.box(h.wall, h.x, top, h.z, ix, y2 - top, iz, h.yaw, { collide: false, top: false });
  roofs(K, 'hip', h.roof, h.wall, h.x, y2, h.z, { yaw: h.yaw + (ix < iz ? Math.PI / 2 : 0), sx: Math.max(ix, iz) + 0.35, sz: Math.min(ix, iz) + 0.35, rh: Math.min(Math.min(ix, iz) * 1.9, 7.5) }, 1, near);
  const [tx, , tz] = P(h.hx - 0.35, 0, f * (h.hz - 0.35));
  K.drum(h.wall, tx, top - 4.5, tz, 1.3, y2 - top + 5.3, sides, NC); K.cone(h.roof, tx, y2 + 0.8, tz, 1.8, 4.4, sides);
  const gy0 = top + 0.9, gy1 = y2 - 0.7, zf = f * (iz + 0.04);
  K.quad('eve:flame', P(-0.62, gy0, zf), P(0.62, gy0, zf), P(0.62, gy1, zf), P(-0.62, gy1, zf), NF);
  if (!near) return;
  K.spike(h.wall, tx, top - 4.5, tz, 1.3, -2.4, 8, 0);
  // (The great window's surround and its one mullion; a slit in each side of the stage; a slit lit in the turret.)
  { const [mx, , mz] = P(0, 0, zf + f * 0.03); K.box('dark:wood', mx, gy0, mz, 0.05, gy1 - gy0, 0.03, h.yaw, NC); }
  for (const e of [-1, 1]) { const [qx, , qz] = P(e * 0.7, 0, zf + f * 0.02); K.box('dark:stone', qx, gy0 - 0.15, qz, 0.09, gy1 - gy0 + 0.3, 0.05, h.yaw, NC); }
  for (const e of [-1, 1]) K.quad('slate:iron', P(e * (ix + 0.03), top + 1.2, -0.18), P(e * (ix + 0.03), top + 1.2, 0.18), P(e * (ix + 0.03), y2 - 1.2, 0.18), P(e * (ix + 0.03), y2 - 1.2, -0.18), [e * c, 0, -e * s]);
  K.quad('eve:flame', P(h.hx - 0.35 - 0.16, top - 2.2, f * (h.hz - 0.35 + 1.32)), P(h.hx - 0.35 + 0.16, top - 2.2, f * (h.hz - 0.35 + 1.32)), P(h.hx - 0.35 + 0.16, top - 0.9, f * (h.hz - 0.35 + 1.32)), P(h.hx - 0.35 - 0.16, top - 0.9, f * (h.hz - 0.35 + 1.32)), NF);
  (K.lamps ||= []).push({ p: P(0, (gy0 + gy1) / 2, zf + f * 1.2), c: [1, 0.6, 0.3], r: 16, i: 9, flicker: 0.3 });
}
// What's seen of a house's style from across the city, besides its roof: a great stack (the dyers', the smelters'), a
// tower-house's head. (Not on a phone: its land is as many corners as it should hold.)
export function houseFarMore(K, h, F, top) {
  const st = h.st;
  if (!st || K.lean) return;
  const { c, s } = F, P = (lx, lz) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c];
  if (st.stack) { const [x, z] = P(-h.hx + 0.9, -h.front * (h.hz + 0.9)); K.drum('soot:ph_soot_brick', x, F.lo - 0.5, z, 0.95, top - F.lo + 6.5, 6, { r2: 0.6, collide: false }); }
  if (h.mark?.kind === 'towerhouse') towerStage(K, h, F, top, false);
}

// ---------------------------------------------------------------- from the street

// What's seen of a house's style from the street: called at the end of houseNear, with what that's worked out.
//   o: { P (local x, world y, local z), F (footing), fy (its floor), top (its eaves), f (its front), storeys, wins, R (roofOf),
//        flag (his banner hangs on it), BANNER, lamp(x, y, z, r, i) }
export function dressHouse(K, h, o) {
  const st = h.st;
  if (!st || !h.roof) return;
  const { P, F, fy, top, f, storeys, wins, R } = o, { c, s, lo } = F, id = idOf(h), r = (k) => hash2(id, 500 + k);
  const fz = f * h.hz, NF = [f * s, 0, f * c], NC = { collide: false }, mk = h.mark?.kind;
  // A flat piece on the front, off out from the wall, from (x0, y0) to (x1, y1); and a box there.
  const plate = (layer, x0, y0, x1, y1, off, uvs) => K.quad(layer, P(x0, y0, fz + f * off), P(x1, y0, fz + f * off), P(x1, y1, fz + f * off), P(x0, y1, fz + f * off), NF, uvs);
  const lump = (layer, lx, y, off, hx, hh, hz, top2) => { const [bx, , bz] = P(lx, 0, fz + f * off); K.box(layer, bx, y, bz, hx, hh, hz, h.yaw, top2 === undefined ? NC : { collide: false, top: top2 }); };
  const jut = jutOf(h), y2 = fy + 6.6, front = wins.filter((w) => w.q === f);
  const mid = (stn) => front.some((w) => w.st === stn && w.sd === 0);
  const poor = /poor|daub|soot|burnt|char|boards|rubble|market/.test(h.wall);

  // The step at its door, down to the street where the street's lower than its floor: a block of stone under the sill and
  // a lower one before it, so nothing's seen under the house. (The critics: pale voids under the doors on a slope.)
  { const [sx, , sz] = P(0, 0, fz + f * 0.9), g = Math.min(Y(sx, sz), fy) - 0.3;
    if (fy - g > 0.6) { lump('stone', 0, g, 0.45, DOOR + 0.32, fy - g - 0.02, 0.45); lump('stone', 0, g, 1.12, DOOR + 0.32, (fy - g) * 0.5, 0.24); } }

  // A plinth of darker stone along its foot, either side of the door; quoins up its corners (not on a shop's front: it has
  // a course of stone at every floor, and a quoin through a course is a cross at every storey: the critics).
  if (st.plinth && mk !== 'tavern') for (const e of [-1, 1]) { plate('dark:stone', e * (DOOR + 0.3), lo - 0.4, e * h.hx, fy + 0.6, 0.07); K.quad('dark:stone', P(e * (DOOR + 0.3), fy + 0.6, fz), P(e * h.hx, fy + 0.6, fz), P(e * h.hx, fy + 0.6, fz + f * 0.07), P(e * (DOOR + 0.3), fy + 0.6, fz + f * 0.07), [0, 1, 0]); }
  if (st.quoin && !h.shop) for (const e of [-1, 1]) plate('p2_quoins', e * h.hx, fy + (st.plinth ? 0.6 : 0), e * (h.hx - 0.42), top - 0.05, 0.05);
  if (st.bone) plate('p2_bone_inlay_stone', -h.hx, top - 0.75, h.hx, top - 0.1, 0.06);

  // A deep jetty: from the third storey up the front stands out over the street on a beam and its brackets.
  if (jut && y2 < top - 1.2) {
    lump(h.wall, 0, y2 - 0.3, jut / 2, h.hx + 0.02, top - y2 + 0.3, jut / 2, false);
    lump('dark:wood', 0, y2 - 0.55, jut / 2 + 0.03, h.hx + 0.08, 0.28, jut / 2 + 0.05);
    for (const e of [-1, 1]) K.beam('dark:wood', P(e * (h.hx - 0.25), y2 - 1.25, fz + f * 0.03), P(e * (h.hx - 0.25), y2 - 0.6, fz + f * (jut + 0.02)), 0.1);
  }

  // Timbering on the daubed ones, above the ground floor: posts between the floors, each stopped short of the floor under
  // it and the one over (a post that met a beam or a course was a T, and through one a cross: no post touches anything
  // that runs across; none at all on a shop's front, with its stone courses).
  if (st.timber && storeys >= 2 && !h.shop) for (let stn = 1; stn < storeys; stn++) {
    const ya = fy + stn * 3.3 + 0.32, yb = Math.min(top - 0.4, fy + (stn + 1) * 3.3 - 0.5), off = 0.035 + (stn >= 2 ? jut : 0);
    if (yb - ya < 1.2) continue;
    for (const lx of [-h.hx + 0.28, h.hx - 0.28]) plate('dark:wood', lx - 0.085, ya, lx + 0.085, yb, off);
    if (!mid(stn) && !(st.oriel && stn === 1)) plate('dark:wood', -0.085, ya, 0.085, yb, off);
  }
  // Under the upper windows, each its own: on the timbered houses a V of braces under one in three (under every one it
  // was wallpaper: the critics); a cloth aired over a sill; a box of dead stalks; a pair of shutters shut across the pane.
  // (The cloths buff, hessian and grey: never his red beside buff.)
  for (const w of front) {
    if (w.st === 0 || (st.oriel && w.st === 1 && w.sd === 0)) continue;
    const v = hash2(id + w.st * 7 + w.sd * 3, 541), off = 0.06 + (w.st >= 2 ? jut : 0), z = fz + f * off;
    if (st.timber && v < 0.33) { const vy = w.wy - 0.18; for (const e of [-1, 1]) K.beam('dark:wood', P(w.wx + e * 0.5, vy, z), P(w.wx, vy - 0.9, z), 0.12, 0.05); }
    else if (v > 0.33 && v < 0.5 && poor) {
      // (A cloth over the sill: dark, narrower than the window, hung askew, one corner lower. A pale square was a blank sheet.)
      const len = 0.3 + 0.35 * hash2(id + w.st, 542 + w.sd), cl = ['soot:cloth_oat', 'p2_hessian', 'mire:cloth_oat'][Math.floor(v * 97) % 3], x0 = w.wx - w.ww * 0.55, x1 = w.wx + w.ww * 0.4, zc = fz + f * (off + 0.13);
      K.quad(cl, P(x0, w.wy - 0.1 - len, zc), P(x1, w.wy - 0.1 - len * 0.55, zc), P(x1, w.wy - 0.08, zc), P(x0, w.wy - 0.08, zc), NF, [[0, 0.4], [0.4, 0.3], [0.4, 0], [0, 0]]);
    }
    else if (v > 0.5 && v < 0.64 && !poor) {
      lump('dark:wood', w.wx, w.wy - 0.44, off + 0.14, w.ww + 0.1, 0.28, 0.13);
      for (const e of [-0.5, 0.1, 0.6]) { const [bx, , bz] = P(w.wx + e * w.ww, 0, fz + f * (off + 0.14)); K.cone('char:bark', bx, w.wy - 0.18, bz, 0.09, 0.34 + 0.2 * hash2(id + w.st, 550 + Math.round(e * 10)), 4); }
    } else if (v > 0.8 && !w.open) plate(/^(pale|frost):/.test(h.wall) ? 'dark:p2_shutters' : 'p2_shutters', w.wx - w.ww - 0.03, w.wy, w.wx + w.ww + 0.03, w.wy + w.wh, 0.09 + (w.st >= 2 ? jut : 0), [[0, 1], [1, 1], [1, 0], [0, 0]]);
  }

  // An oriel: a bay of dark timber and lit glass corbelled out over the door at the first floor, a little roof of its own.
  if (st.oriel && !mid(1) && !o.flag && fy + 6.2 < top + 0.4) {
    const oy = fy + 3.3 + 0.7, oh = 1.75, ow = 0.85, od = 0.5, glass = h.dk === 'mages' ? 'frost:flame' : 'eve:flame';
    lump('dark:wood', 0, oy - 0.14, od / 2, ow + 0.06, 0.14, od / 2 + 0.04);
    lump('dark:wood', 0, oy, od / 2, ow, oh, od / 2, false);
    { const [bx, , bz] = P(0, 0, fz + f * od * 0.45); K.spike(h.wall, bx, oy - 0.14, bz, 0.5, -0.8, 4, h.yaw + Math.PI / 4); }
    for (const e of [-0.52, 0, 0.52]) plate(glass, e - 0.2, oy + 0.35, e + 0.2, oy + oh - 0.25, od + 0.02);
    for (const e of [-1, 1]) K.quad(glass, P(e * (ow + 0.02), oy + 0.35, fz + f * 0.1), P(e * (ow + 0.02), oy + 0.35, fz + f * (od - 0.08)), P(e * (ow + 0.02), oy + oh - 0.25, fz + f * (od - 0.08)), P(e * (ow + 0.02), oy + oh - 0.25, fz + f * 0.1), [e * c, 0, -e * s]);
    K.quad(h.roof, P(-ow - 0.12, oy + oh + 0.45, fz + f * 0.02), P(ow + 0.12, oy + oh + 0.45, fz + f * 0.02), P(ow + 0.12, oy + oh - 0.02, fz + f * (od + 0.16)), P(-ow - 0.12, oy + oh - 0.02, fz + f * (od + 0.16)), [f * s * 0.6, 0.8, f * c * 0.6]);
    if (r(1) < 0.6) o.lamp?.(P(0, oy + 0.9, fz + f * (od + 0.5)), 9, 5);
  }

  // A gallery across the front of the tenements, two floors up: boards on braces out from the wall, a boarded front (no
  // rails), the day's washing over it.
  if (st.gallery && y2 + 1.1 < top) {
    const gd = 0.95, gy = y2 - 0.1;
    lump('dark:wood', 0, gy - 0.1, gd / 2, h.hx - 0.1, 0.1, gd / 2);
    lump('p2_tar_boards', 0, gy, gd - 0.03, h.hx - 0.1, 0.95, 0.03);
    for (const e of [-1, 1]) { lump('p2_tar_boards', e * (h.hx - 0.13), gy, gd / 2, 0.03, 0.95, gd / 2); K.beam('dark:wood', P(e * (h.hx - 0.3), gy - 1.1, fz + f * 0.05), P(e * (h.hx - 0.3), gy - 0.1, fz + f * (gd - 0.1)), 0.11); }
    for (let k = 0, n = Math.floor(h.hx * 1.3); k < n; k++) {
      if (r(20 + k) < 0.45) continue;
      const lx = -h.hx + 0.5 + (2 * h.hx - 1) * (k + 0.5) / n, len = 0.45 + r(40 + k) * 0.5;
      plate(r(60 + k) < 0.4 ? 'soot:cloth_oat' : r(60 + k) < 0.7 ? 'p2_hessian' : 'umber:cloth_oat', lx - 0.26, gy + 0.93 - len, lx + 0.26, gy + 0.93, gd + 0.035, [[0, 0], [0.4, 0], [0.4, 0.4], [0, 0.4]]);
    }
  }

  // A drying loft, the dyers' and tanners': the top of the front boarded, tarred, where the hides and the cloth hang.
  if (st.loft && !jut && top - fy > 6) plate('p2_tar_boards', -h.hx + 0.25, top - 2.1, h.hx - 0.25, top - 0.2, 0.05);

  // A hoist: a beam out from under the eaves over the street, braced back to the wall, a rope down from its end and a
  // sack on it. (From its end, never from along it. A rope as thick as a wrist: on a thread the bale hung in the air.)
  if (st.hoist && !o.flag && mk !== 'towerhouse') {
    const hx0 = (r(2) - 0.5) * Math.max(0, h.hx - 1.6), hy = top - 0.45, reach = 1.35 + jut;
    K.beam('dark:wood', P(hx0, hy, fz - f * 0.2), P(hx0, hy, fz + f * reach), 0.16);
    K.beam('dark:wood', P(hx0, hy - 0.95, fz + f * (jut + 0.03)), P(hx0, hy - 0.08, fz + f * (reach - 0.2)), 0.09);
    const drop = 1.1 + r(3) * 1.4;
    K.beam('umber:cloth_oat', P(hx0, hy - 0.08, fz + f * reach), P(hx0, hy - drop, fz + f * reach), 0.07);
    { const [bx, , bz] = P(hx0, 0, fz + f * reach); K.drum('umber:cloth_oat', bx, hy - drop - 0.7, bz, 0.36, 0.72, 7, { r2: 0.16, collide: false }); }
  }

  // Over the door of a house that's no shop: a hood of two boards meeting in a point (the plainer streets'), or a head of
  // dressed stone on two pilasters, a V cut in it (the richer).
  if (st.hood === 'board') {
    const hy = fy + 2.5;
    for (const e of [-1, 1]) K.quad(h.roof, P(e * (DOOR + 0.45), hy, fz + f * 0.02), P(e * (DOOR + 0.45), hy - 0.12, fz + f * 0.75), P(0, hy + 0.5, fz + f * 0.75), P(0, hy + 0.62, fz + f * 0.02), [e * c * 0.5, 0.86, -e * s * 0.5]);
    for (const e of [-1, 1]) K.beam('dark:wood', P(e * (DOOR + 0.3), hy - 0.75, fz + f * 0.03), P(e * (DOOR + 0.3), hy - 0.1, fz + f * 0.6), 0.08);
  } else if (st.hood === 'stone') {
    for (const e of [-1, 1]) lump('dark:stone', e * (DOOR + 0.22), fy - 0.1, 0.09, 0.14, 2.45, 0.09);
    const hy = fy + 2.5, [bx, , bz] = P(0, 0, fz + f * 0.12);
    K.vee('dark:stone', bx, hy, bz, DOOR + 0.5, 0.62, 0.13, h.yaw, 0.5);
  }

  // The landmarks.
  if (mk === 'tavern') {
    // A tavern, found from down the street by day and by night: its ground floor fronted in dark oak under a fascia; a
    // bay of lit glass beside the door, a bench under the other window, casks stood up by the step; its board hung out
    // over the walk, half again as big as a shop's; a bush hung from an iron arm over the door (from the arm's end); a
    // light each side of the door, and a pool of it on the street.
    const gx = Math.min(h.hx - 1.05, DOOR + 1.6), g0 = Math.min(fy, lo) - 0.3, OAK = 'dark:p2_oak_planks';
    for (const e of [-1, 1]) plate(OAK, e * (DOOR + 0.1), g0, e * h.hx, fy + 0.86, 0.05);
    plate(OAK, -h.hx, fy + 2.78, h.hx, fy + 3.22, 0.08);
    K.quad(OAK, P(-h.hx, fy + 3.22, fz), P(h.hx, fy + 3.22, fz), P(h.hx, fy + 3.22, fz + f * 0.08), P(-h.hx, fy + 3.22, fz + f * 0.08), [0, 1, 0]);
    // (The bay: a sill on a foot of oak, three panes between its own two mullions, a roof of the house's tiles.)
    lump(OAK, gx, g0, 0.3, 0.82, fy + 0.8 - g0, 0.3);
    lump('dark:wood', gx, fy + 0.8, 0.3, 0.86, 1.72, 0.3, false);
    for (const e of [-0.54, 0, 0.54]) plate('eve:flame', gx + e - 0.22, fy + 1.0, gx + e + 0.22, fy + 2.36, 0.62);
    for (const e of [-1, 1]) K.quad('eve:flame', P(gx + e * 0.88, fy + 1.0, fz + f * 0.08), P(gx + e * 0.88, fy + 1.0, fz + f * 0.54), P(gx + e * 0.88, fy + 2.36, fz + f * 0.54), P(gx + e * 0.88, fy + 2.36, fz + f * 0.08), [e * c, 0, -e * s]);
    K.quad(h.roof, P(gx - 0.98, fy + 2.76, fz + f * 0.02), P(gx + 0.98, fy + 2.76, fz + f * 0.02), P(gx + 0.98, fy + 2.5, fz + f * 0.74), P(gx - 0.98, fy + 2.5, fz + f * 0.74), [f * s * 0.35, 0.94, f * c * 0.35]);
    { const [bx, , bz] = P(-gx, 0, fz + f * 0.42); K.bench(bx, bz, h.yaw, 1.0); }
    for (const [u, v, rr] of [[h.hx - 0.3, 1.0, 0.42], [h.hx - 0.3, 1.9, 0.4]]) { const [bx, , bz] = P(u, 0, fz + f * v); K.barrel(bx, bz, rr, 1.0); }
    // (The bush: a bundle of straw hung by a link from the end of an iron arm over the door, a brace back to the wall.)
    { const by = fy + 3.95, tip = fz + f * 1.5, [bx, , bz] = P(0, 0, tip);
      K.beam('iron', P(0, by, fz), P(0, by, tip), 0.05); K.beam('iron', P(0, by - 0.6, fz + f * 0.03), P(0, by - 0.05, fz + f * 0.9), 0.035);
      K.beam('iron', P(0, by, tip), P(0, by - 0.14, tip), 0.03);
      K.drum('p2_straw_ground', bx, by - 0.95, bz, 0.1, 0.45, 7, { r2: 0.34, collide: false }); K.cone('p2_straw_ground', bx, by - 0.5, bz, 0.34, 0.36, 7); }
    // (Its board: on a bracket out from the wall over the walk, edge on to the street, read from down it; hung by its two
    // ends. The alehouse's picture and name out of the shops' twenty: h.mark.sign.)
    { const i = h.mark.sign ?? 4, lx = -Math.min(h.hx - 0.5, DOOR + 1.9), hw = 0.9, zc = fz + f * (0.1 + hw), y0 = fy + 3.5, y1 = fy + 4.9, t = 0.06, tip = fz + f * (0.14 + 2 * hw);
      K.beam('iron', P(lx, y1 + 0.12, fz), P(lx, y1 + 0.12, tip), 0.06);
      for (const zz of [fz + f * 0.14, tip]) K.beam('iron', P(lx, y1 + 0.12, zz), P(lx, y1, zz), 0.014);
      const [bx, , bz] = P(lx, 0, zc); K.box('dark:wood', bx, y0 - 0.04, bz, t + 0.01, y1 - y0 + 0.08, hw + 0.04, h.yaw, NC);
      const u0 = (i % 4) / 4, u1 = u0 + 0.25, v0 = Math.floor(i / 4) / 5, v1 = v0 + 0.2;
      for (const e of [1, -1]) { const x = lx + e * (t + 0.013), za = zc + e * hw, zb = zc - e * hw; K.quad('p2_signs', P(x, y1, za), P(x, y1, zb), P(x, y0, zb), P(x, y0, za), [e * c, 0, -e * s], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]); } }
    for (const e of [-1, 1]) { const q = P(e * (DOOR + 0.5), fy + 2.45, fz + f * 0.09); K.wallLamp(q[0], q[1], q[2], [f * s, f * c]); }
    (K.lamps ||= []).push({ p: P(0, fy + 2.3, fz + f * 1.7), c: [1, 0.6, 0.28], r: 30, i: 36, flicker: 0.3, prio: 14 });
  } else if (mk === 'guildhall') {
    // A guildhall: an arcade of stone posts before its door carrying a walk over, his banner either side, a fire bowl.
    const ay = fy + 3.2, n = Math.max(3, Math.round(h.hx / 1.5));
    for (let k = 0; k <= n; k++) { const lx = -h.hx + 0.25 + (2 * h.hx - 0.5) * k / n; if (Math.abs(lx) < DOOR + 0.2) continue; const [bx, , bz] = P(lx, 0, fz + f * 1.25); K.drum('pale:stone', bx, Math.min(Y(bx, bz), fy) - 0.3, bz, 0.2, ay - Math.min(Y(bx, bz), fy) + 0.3, 8, NC); K.drum('dark:stone', bx, ay - 0.25, bz, 0.2, 0.25, 8, { r2: 0.32, collide: false }); }
    lump('dark:stone', 0, ay, 0.72, h.hx, 0.32, 0.72);
    lump(h.wall, 0, ay + 0.32, 1.38, h.hx, 0.85, 0.06);
    if (o.BANNER) for (const e of [-1, 1]) { const bx = e * Math.min(h.hx - 0.7, 2.2), by = Math.min(top - 0.4, fy + 8.2), bh = Math.min(3.4, by - ay - 1.5); if (bh > 1.6) plate(o.BANNER, bx - bh / 6, by, bx + bh / 6, by - bh, 0.07, [[0, 0], [1, 0], [1, 1], [0, 1]]); }
    (K.lamps ||= []).push({ p: P(0, fy + 2.6, fz + f * 0.8), c: [1, 0.62, 0.3], r: 22, i: 18, flicker: 0.3, prio: 10 });
  } else if (mk === 'towerhouse') towerStage(K, h, F, top, true);
  // The burnt ones: what's left of a beam leant on the front, ash at its foot.
  if (st.char && (mk === 'shell' || r(6) < 0.5)) {
    const lx = (r(7) - 0.5) * h.hx;
    K.beam('char:wood', P(lx, Math.min(fy, lo) - 0.1, fz + f * 1.3), P(lx + 0.5, fy + 2.6 + r(8), fz + f * 0.05), 0.17);
    const [ax, , az] = P(lx + 0.4, 0, fz + f * 0.8); K.disc('p2_ash_street', ax, Y(ax, az) + 0.05, az, 0.9 + r(9) * 0.7, 8);
  }

  // On its roof: a ridge cap along a ridged one, finials at its ends on the richer, a pennant on a few; dormers in the
  // front slope of the mansards and the better hips; merlons with his V at the corners of the garrison's flat ones.
  const kind = st.roof, RP = frame(h.x, top, h.z, R.yaw), rt = roofTop(kind, R);
  if (kind === 'gable' || kind === 'crow' || kind === 'gambrel' || kind === 'hip') {
    const rl = kind === 'hip' ? Math.max(0.25, R.sx - R.sz) : R.sx - 0.05;
    K.beam('dark:stone', RP(-rl, rt + 0.03, 0), RP(rl, rt + 0.03, 0), 0.2, 0.12);
    if (st.finial && kind !== 'crow') for (const e of [-1, 1]) { const q = RP(e * (rl - 0.1), rt, 0); K.spike('iron', q[0], q[1], q[2], 0.09, 1.0 + 0.5 * r(10), 4, 0); }
    if (st.vane) { const q = RP(rl - 0.1, rt, 0); K.box('iron', q[0], q[1], q[2], 0.025, 1.9, 0.025, 0, NC); const a = r(11) * TAU, vx = Math.cos(a), vz = Math.sin(a); K.quad('cloth_red', [q[0], q[1] + 1.85, q[2]], [q[0], q[1] + 1.45, q[2]], [q[0] + vx * 0.8, q[1] + 1.65, q[2] + vz * 0.8], [q[0] + vx * 0.8, q[1] + 1.65, q[2] + vz * 0.8], [-vz, 0, vx]); }
  }
  if (kind === 'flat' && st.merlon) for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { if (mk === 'towerhouse' && u > 0 && v * f > 0) continue; const q = RP(u * (R.sx - 0.75), 0.75, v * (R.sz - 0.55)); K.vee(h.wall, q[0], q[1], q[2], 0.45, 0.75, 0.14, R.yaw, 0.5); }
  if (st.dormer && !R.turn && (kind === 'mansard' || kind === 'hip' || kind === 'gable') && h.hx > 2.6) {
    const n = st.dormer, zf = f * (kind === 'mansard' ? R.sz - Math.min(R.sz * 0.4, 1.5) * 0.45 : R.sz * 0.6), dy = kind === 'mansard' ? 0.25 : R.rh * 0.22;
    for (let k = 0; k < n; k++) {
      const lx = n === 1 ? (r(12) - 0.5) * h.hx * 0.8 : (k ? 1 : -1) * h.hx * 0.45, q = RP(lx, dy, zf);
      K.box(h.wall, q[0], q[1], q[2], 0.5, 1.15, 0.5, h.yaw, { collide: false, top: false });
      roofs(K, 'gable', h.roof, h.wall, q[0], q[1] + 1.15, q[2], { yaw: h.yaw + Math.PI / 2, sx: 0.75, sz: 0.68, rh: 0.6 }, 1, true);
      const g = RP(lx, dy + 0.3, zf + f * 0.52), t = [Math.cos(h.yaw) * 0.3, -Math.sin(h.yaw) * 0.3];
      K.quad(r(13 + k) < 0.5 ? 'eve:flame' : 'slate:iron', [g[0] - t[0], g[1], g[2] - t[1]], [g[0] + t[0], g[1], g[2] + t[1]], [g[0] + t[0], g[1] + 0.7, g[2] + t[1]], [g[0] - t[0], g[1] + 0.7, g[2] - t[1]], NF);
    }
  }
  // A great stack: the dyers' and the smelters', round, of sooted brick, in the yard at the back corner, smoke out of it.
  if (st.stack) { const [x, , z] = P(-h.hx + 0.9, 0, -f * (h.hz + 0.9)); K.drum('soot:ph_soot_brick', x, lo - 0.5, z, 0.95, top - lo + 6.5, 10, { r2: 0.6, collide: false }); K.drum('dark:stone', x, top + 6, z, 0.66, 0.3, 10, { r2: 0.72, open: true, collide: false }); (K.smokes ||= []).push([x, top + 6.8, z], [x, top + 6.8, z]); }
}

// ---------------------------------------------------------------- the streets

// What stands along a near cell's streets, by the district it runs through: against the house fronts down the lanes (kegs,
// crates, a bench, a trough, heaps, the dyers' vats, hides on frames, a boat hauled out), and at the kerb of the King's
// Mile (carts, stalls, his banner on poles). Nothing here stops a body. o: { streets, cellOf, districtAt, cityIn, sloughD,
// BANNER, inSquare(x, z) }.
export function streetLife(K, cell, o) {
  const n0 = K.colliders.length;
  for (const [si, st] of o.streets.entries()) {
    const spine = st.w > 5;
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const a = st.pts[i], b = st.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(-uz, ux), gap = 11, n = Math.floor(L / gap);
      for (let k = 0; k < n; k++) for (const sd of [-1, 1]) {
        const v = hash2(si * 977 + i * 31 + k, sd + 40), t = (k + 0.5) * gap + (v - 0.5) * 3;
        const at = (off, along = 0) => [a[0] + ux * (t + along) - uz * off * sd, a[1] + uz * (t + along) + ux * off * sd];
        const [x, z] = at(st.w + 0.4);
        if (o.cellOf(x, z) !== cell || o.cityIn(x, z) > 0.95 || (x > 10430 && Math.abs(z) < 48) || o.sloughD(x, z) < 8 || o.inSquare(x, z)) continue;
        if (o.streets.some((q) => q !== st && q.pts.some((p, j) => j + 1 < q.pts.length && o.segD(x, z, p, q.pts[j + 1]) < q.w + 5))) continue;
        const dk = o.districtAt(x, z).key, w = hash2(si * 131 + i * 7 + k, sd + 50), u = hash2(si * 17 + i * 3 + k, sd + 60), y = Y(x, z), face = yaw + (sd > 0 ? Math.PI : 0);
        // Against the fronts.
        if (v < (dk === 'dukes' || dk === 'mages' ? 0.72 : 0.44)) {
          if (dk === 'tanners' && w < 0.5) {
            // (A dyer's vat: a tub of staves, the dye in it; a paddle stood in one.)
            K.drum('soot:wood', x, y - 0.1, z, 0.62, 0.85, 9, { open: true, collide: false }); K.disc(['blood:water', 'mire:water', 'dark:water'][Math.floor(u * 3)], x, y + 0.62, z, 0.56, 9);
            if (u < 0.5) K.beam('dark:wood', [x + 0.2, y + 0.3, z], [x + 0.45, y + 1.5, z + 0.2], 0.05);
          } else if (dk === 'tanners' || (dk === 'wharf' && w < 0.3)) {
            // (A hide or a net on a frame: two posts, the hide laced between them, clear of the ground.)
            const [p0, q0] = at(st.w + 0.45, -0.8), [p1, q1] = at(st.w + 0.45, 0.8);
            K.box('dark:wood', p0, Y(p0, q0) - 0.2, q0, 0.045, 2.1, 0.045, 0, { collide: false }); K.box('dark:wood', p1, Y(p1, q1) - 0.2, q1, 0.045, 2.1, 0.045, 0, { collide: false });
            K.quad(dk === 'wharf' ? 'p2_hessian' : 'umber:cloth_oat', [p0, Y(p0, q0) + 0.45, q0], [p1, Y(p1, q1) + 0.45, q1], [p1, Y(p1, q1) + 1.8, q1], [p0, Y(p0, q0) + 1.8, q0], null, [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]]);
          } else if (dk === 'wharf' && w < 0.6) { K.barrel(x, z, 0.4, 1.0); const [p, q] = at(st.w + 0.45, 0.8); K.barrel(p, q, 0.36, 0.9); if (u < 0.5) { const [p2, q2] = at(st.w + 0.4, 0.4); K.barrel(p2, q2, 0.32, 0.75, Y(p2, q2) + 0.92); } }
          else if (dk === 'cinder') { if (w < 0.5) { K.heap('p2_ash_street', x, z, 0.7 + u * 0.6, 0.35 + u * 0.3, 7, { collide: false }); K.beam('char:wood', [x - 0.6, y + 0.1, z], [x + 0.7, y + 0.7 + u, z + 0.3], 0.14); } else K.rock('soot:rubble', x, z, 0.5 + u * 0.4, 0.35, { collide: false }); }
          else if (dk === 'bones') { if (w < 0.5) { K.heap('p2_bone_rubble', x, z, 0.6 + u * 0.4, 0.4, 7, { collide: false }); } else K.crate(x, z, 0.36, yaw + u); }
          else if (dk === 'barracks' || dk === 'barbican' || dk === 'approach') {
            // (Spears stood in a trough against a backboard: nothing across their shafts. Or the garrison's kegs.)
            if (w < 0.45) { K.box('dark:wood', x, y + 0.2, z, 0.9, 1.7, 0.04, yaw, { collide: false }); K.box('dark:wood', x - uz * sd * -0.18, y, z + ux * sd * -0.18, 0.9, 0.22, 0.14, yaw, { collide: false }); for (let j = -2; j <= 2; j++) { const px = x + ux * j * 0.36 - uz * sd * -0.18, pz = z + uz * j * 0.36 + ux * sd * -0.18; K.box('wood', px, y, pz, 0.025, 2.7, 0.025, yaw, { collide: false }); K.cone('iron', px, y + 2.7, pz, 0.06, 0.4, 4); } }
            else if (w < 0.75) { K.barrel(x, z, 0.4, 1.0); K.crate(x + ux * 0.9, z + uz * 0.9, 0.38, yaw); }
          } else if (dk === 'dukes' || dk === 'mages') {
            // (A stone tub with a dead shrub in it, clipped; or a mounting block.)
            if (w < 0.5) { K.drum('dark:stone', x, y - 0.1, z, 0.5, 0.75, 8, { r2: 0.62, collide: false }); K.drum('dark:bark', x, y + 0.6, z, 0.07, 0.5, 5, { collide: false }); K.drum('char:bark', x, y + 1.0, z, 0.4, 0.6, 7, { r2: 0.28, collide: false }); }
            else if (w < 0.62) { K.box('pale:stone', x, y - 0.1, z, 0.55, 0.45, 0.3, yaw, { collide: false }); K.box('pale:stone', x + ux * 0.3, y + 0.3, z + uz * 0.3, 0.26, 0.4, 0.3, yaw, { collide: false }); }
            else if (dk === 'mages' && w < 0.86) {
              // (A cold fire in an iron bowl on three legs: the Rise's own light, blue-white.)
              for (let j = 0; j < 3; j++) { const a2 = j / 3 * TAU + u; K.beam('iron', [x + Math.cos(a2) * 0.42, y - 0.05, z + Math.sin(a2) * 0.42], [x + Math.cos(a2) * 0.12, y + 1.05, z + Math.sin(a2) * 0.12], 0.04); }
              K.drum('iron', x, y + 1.0, z, 0.16, 0.22, 8, { r2: 0.36, open: true, collide: false }); K.cone('frost:flame', x, y + 1.12, z, 0.2, 0.55, 5);
              (K.lamps ||= []).push({ p: [x, y + 1.7, z], c: [0.62, 0.8, 1], r: 14, i: 9, flicker: 0.25 });
            } else if (dk === 'dukes' && w < 0.86) {
              // (An urn on a foot of pale stone, a great house's; or his banner on a pole, one arm from its head.)
              K.box('pale:stone', x, y - 0.1, z, 0.34, 0.7, 0.34, yaw, { collide: false }); K.drum('dark:stone', x, y + 0.6, z, 0.16, 0.5, 8, { r2: 0.34, collide: false }); K.cone('dark:stone', x, y + 1.1, z, 0.34, 0.3, 8);
            }
          } else if (w < 0.3) { K.barrel(x, z, 0.38, 0.95); if (u < 0.5) { const [p, q] = at(st.w + 0.4, 0.75); K.sack(p, q); } }
          else if (w < 0.5) { K.crate(x, z, 0.4, yaw + u); if (u < 0.6) K.crate(x + ux * 0.15, z + uz * 0.15, 0.3, yaw + 0.5, y + 0.73); }
          else if (w < 0.62) K.bench(x, z, yaw, 0.95);
          else if (w < 0.72) K.trough(x, z, yaw, 1.1);
        }
        // At the King's Mile's kerb: carts and stalls, his banner on a pole (its arm from the pole's head).
        if (spine && v > 0.62) {
          const [kx, kz] = at(st.w - 4.1), ky = Y(kx, kz);
          if (v < 0.76) K.cart(kx, kz, yaw + (u - 0.5) * 0.5 + (sd > 0 ? Math.PI : 0));
          else if (v < 0.9) K.stall(kx, kz, face + Math.PI / 2, u < 0.5 ? 'cloth_red' : 'umber:cloth_oat', Math.floor(w * 4));
          else if (o.BANNER && w < 0.6) {
            const [px, pz] = at(st.w + 0.2);
            K.box('dark:wood', px, Y(px, pz), pz, 0.09, 6.2, 0.09, 0, { collide: false });
            const ex = px + uz * sd * 1.3, ez = pz - ux * sd * 1.3, T = Y(px, pz) + 6.15;
            K.beam('dark:wood', [px, T, pz], [ex, T, ez], 0.07);
            for (const e of [-1, 1]) K.quad(o.BANNER, [px + uz * sd * 0.15, T - 0.05, pz - ux * sd * 0.15], [ex, T - 0.05, ez], [ex, T - 2.9, ez], [px + uz * sd * 0.15, T - 2.9, pz - ux * sd * 0.15], [e * ux, 0, e * uz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
          } else { K.goods(kx, kz, 5, 1.0); K.barrel(kx + ux, kz + uz); }
          void ky;
        }
      }
    }
  }
  K.colliders.length = n0;
}

// A house built across one of the Slough's footbridges: a toll-house on the deck, its way through under it a pointed arch
// with a light in it, the keeper's room over on a jetty all round, boarded and tarred, windows on every side, a stack;
// and under it struts down to the bridge's two stone piers, so it stands on something. b: { x, z, y (the deck), th (the
// deck's yaw), ux, uz (down the water) }. From far its two storeys, its roof and a lit window each end (far: true).
export function bridgeHouse(K, b, far) {
  const { x, z, y, th } = b, len = 3.6, hw = 1.75, wall = 'umber:ph_daub', up = 'soot:p2_tar_boards', roof = 'umber:roof_3', NC = { collide: false };
  const c = Math.cos(th), s = Math.sin(th), P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  const R = { yaw: th + Math.PI / 2, sx: len + 0.95, sz: hw + 1.05, rh: 2.6 };
  // (Its two side walls stand on the deck's edges; the way through between them is the deck's own width.)
  for (const e of [-1, 1]) { const [bx, by, bz] = P(e * (hw - 0.16), 0, 0); K.box(wall, bx, by, bz, 0.16, 3.0, len, th, NC); }
  { const [bx, by, bz] = P(0, 3.0, 0); K.box(up, bx, by, bz, hw + 0.6, 2.9, len + 0.5, th, { collide: false, top: false }); }
  roofs(K, 'gable', roof, up, ...P(0, 5.9, 0), R, 1, !far);
  for (const g of [-1, 1]) { const zf = g * (len + 0.52); K.quad('eve:flame', P(-0.45, 4.0, zf), P(0.45, 4.0, zf), P(0.45, 5.1, zf), P(-0.45, 5.1, zf), [g * s, 0, g * c]); }
  if (far) return;
  // (The floor of the room over, on its beams, out past the walls under it all round: the jetty.)
  { const [bx, by, bz] = P(0, 2.78, 0); K.box('dark:wood', bx, by, bz, hw + 0.66, 0.24, len + 0.56, th, NC); }
  // (The way through: a pointed head to each end of it, a pair of dark boards meeting in a point over the deck.)
  for (const g of [-1, 1]) for (const e of [-1, 1]) {
    const zf = g * (len + 0.02), N = [g * s, 0, g * c];
    K.quad('dark:wood', P(e * (hw - 0.32), 1.75, zf), P(e * (hw - 0.32), 2.8, zf), P(e * 0.12, 2.8, zf), P(e * 0.12, 2.8, zf), N);
  }
  // (Struts from the bridge's two piers, 6 m either way along the deck, up and in to the jetty's corners: a V each side.)
  for (const g of [-1, 1]) for (const e of [-1, 1]) K.beam('dark:wood', P(e * 1.3, -0.45, g * 6), P(e * (hw + 0.5), 2.8, g * (len + 0.3)), 0.2);
  // (Brackets under the jetty down each long side, out over the water.)
  for (const e of [-1, 1]) for (const lz of [-2.4, 0, 2.4]) K.beam('dark:wood', P(e * (hw - 0.02), 1.9, lz), P(e * (hw + 0.55), 2.78, lz), 0.11);
  // (A post up each corner of the room over, stood on the jetty; a window each end with its one mullion and a V under it.)
  for (const e of [-1, 1]) for (const g of [-1, 1]) { const [px, py, pz] = P(e * (hw + 0.62), 3.02, g * (len + 0.52)); K.box('dark:wood', px, py, pz, 0.09, 2.6, 0.09, th, NC); }
  for (const g of [-1, 1]) {
    const zf = g * (len + 0.54);
    { const [mx, my, mz] = P(0, 4.0, zf); K.box('dark:wood', mx, my, mz, 0.04, 1.1, 0.03, th, NC); }
    for (const e of [-1, 1]) K.beam('dark:wood', P(e * 0.55, 3.9, zf), P(0, 3.15, zf), 0.11, 0.05);
  }
  // (And two windows down each long side, over the water: one lit, one shuttered.)
  for (const e of [-1, 1]) for (const lz of [-1.6, 1.6]) {
    const xf = e * (hw + 0.62), N = [e * c, 0, -e * s], lit = lz * e > 0;
    K.quad(lit ? 'eve:flame' : 'p2_shutters', P(xf, 4.0, lz - 0.4), P(xf, 4.0, lz + 0.4), P(xf, 5.0, lz + 0.4), P(xf, 5.0, lz - 0.4), N, lit ? undefined : [[0, 1], [1, 1], [1, 0], [0, 0]]);
    { const [sx, sy, sz] = P(xf + e * 0.06, 3.9, lz); K.box('dark:wood', sx, sy, sz, 0.07, 0.08, 0.5, th, NC); }
  }
  // (A stack up one side, a pot on it, smoke; the lantern in the passage on a chain from the floor over: an iron cage, a fire.)
  { const [cx, cy, cz] = P(hw + 0.3, 3.0, -len + 0.9); K.box('soot:stone', cx, cy, cz, 0.4, 5.3, 0.5, th, NC); K.drum('dark:stone', cx, cy + 5.3, cz, 0.16, 0.4, 6, NC); (K.smokes ||= []).push([cx, cy + 6.1, cz]); }
  K.beam('iron', P(0, 2.8, 0), P(0, 2.45, 0), 0.03); { const [lx, ly, lz] = P(0, 2.05, 0); K.drum('iron', lx, ly, lz, 0.16, 0.4, 6, { open: true, collide: false }); K.cone('flame', lx, ly + 0.05, lz, 0.07, 0.28, 4); }
  (K.lamps ||= []).push({ p: P(0, 2.0, 0), c: [1, 0.62, 0.3], r: 24, i: 30, flicker: 0.35, prio: 10 });
  for (const g of [-1, 1]) (K.lamps ||= []).push({ p: P(0, 4.4, g * (len + 1.4)), c: [1, 0.6, 0.3], r: 12, i: 6, flicker: 0.3 });
}
