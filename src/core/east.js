// The east, out past the old edge of the world: the Marches, the ridge and Widow's Notch, the Chasm down to the Sill, and the
// great bowl the City State of Phobos stands in, with Castle Velscour's crag at its back. Laid out in docs/PHOBOS-LAYOUT.md and
// tools/phobos/layout.json (the numbers here are that file's). Only the ground: what stands on it is src/core/sites.js.
// +x is east, +z is south.

import { fbm, sstep } from './terrain-noise.js';
import { PHOBOS } from './phobos-data.js';
import { chasmLie, cragFaceY, faceY, fanOf, terraceY, wallLie } from './cliffs.js';

// Where the old world ended on this side, and where it ends now. (North, south and west are still WORLD_EDGE: lands.js.)
export const EAST_FROM = 5600, WORLD_EAST = 11700;

export const PLAIN = 20;            // the moat plain's height: everything in the bowl is measured up from it
export const SILL = { x: 8950, z: 0, y: PLAIN + 60, r: 34 };
export const NOTCH = { x: 7500, z: 0, y: 150 };
export const SPAN = { x: 8400, z: 120 };
export const CITY = { x: 10050, z: 0, a: 700, b: 800 };
export const CRAG = { x: 11075, z: 0, a: 340, b: 300 };
// The castle's three wards, as heights over the plain, stepping up eastward (the Keep stands on the last).
// (Raised from the layout's first +70, +90, +115: the owner, 2026-11-15, wants the castle far taller, and the critics found
// the rock a pancake against the basin's cliffs.)
export const WARDS = [[10760, 120], [10950, 175], [11150, 235]];
// The ramp from the Lower Ward up through the Middle Ward's gate: [x, z, height over the plain].
export const WARD_RAMP = [[10880, -150, 120], [10936, -8, 152], [10966, 6, 160], [11004, 96, 175]];
// The Keep on top of it: where its trunk stands, the High Ward's height it stands on, and its top (over the plain).
export const KEEP = { x: 11215, z: 0, base: 235, top: 680 };
// The city's canal, the Slough, north gate to south: [x, z].
// Where the city's own horrors keep (src/core/tripo-monsters.js LAIRS, the phobos_* ones): the dead in the Bone Yards, what
// walks the burnt Cinder Quarter, Velscour's Loyal in his blood red at the Barracks and on the Castle Approach, what comes up
// out of the Drowned Wharf, and the necromancers of the Mages' Rise. Each in the clearest ground of its district off its
// streets (as every lair is off the roads: tests/quests-beyond.test.mjs). The street
// crowd keeps `clear` metres from them (src/core/phobos-build.js phobosLanes).
export const HAUNTS = [
  { key: 'phobos_boneyards', x: 9890, z: -710, r: 10, clear: 90 },
  { key: 'phobos_cinder', x: 9698, z: -396, r: 6, clear: 70 },
  { key: 'phobos_barracks', x: 10192, z: 149, r: 12, clear: 90 },
  { key: 'phobos_approach', x: 10480, z: 0, r: 12, clear: 90 },
  { key: 'phobos_wharf', x: 9930, z: 545, r: 5, clear: 70 },
  { key: 'phobos_mages', x: 10398, z: -298, r: 5, clear: 70 },
];
// Where the Castle Approach's walled causeway begins (east.js eastHeight; phobos-build.js phobosCastle).
export const APPROACH_WALL = 10690;
export const SLOUGH = [[9880, -780], [9860, -300], [9900, 100], [9930, 380], [9950, 794]];
function sloughNear(x, z) {
  let best = 1e18;
  for (let i = 0; i + 1 < SLOUGH.length; i++) {
    const a = SLOUGH[i], b = SLOUGH[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, (a[0] + dx * t - x) ** 2 + (a[1] + dz * t - z) ** 2);
  }
  return Math.sqrt(best);
}
// The nearest point of the Slough's line to (x, z), and which way it runs there: [px, pz, ux, uz].
function sloughAt(x, z) {
  let best = 1e18, out = null;
  for (let i = 0; i + 1 < SLOUGH.length; i++) {
    const a = SLOUGH[i], b = SLOUGH[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const d = (a[0] + dx * t - x) ** 2 + (a[1] + dz * t - z) ** 2;
    if (d < best) { best = d; out = [a[0] + dx * t, a[1] + dz * t, dx / L, dz / L]; }
  }
  return out;
}
// How far (x, z) is outside the nearest of the city's streets that cross the Slough (the King's Mile, the Low Road).
function streetOver(x, z) {
  let best = 1e9;
  for (const st of PHOBOS.streets) {
    if (st.name === 'The Corpse Quay') continue;   // (it runs along the Slough, not over it)
    for (let i = 0; i + 1 < st.pts.length; i++) {
      const a = st.pts[i], b = st.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) - st.w);
    }
  }
  return best;
}
// Whether (x, z) is on the line of one of the four gates, where the moat is left uncut for the way in.
// (Not at the Drawbridge Gate: the moat runs under its bridge, src/core/phobos-build.js wall.)
const gateWay = (x, z) => (Math.abs(z) < 16 && x - CITY.x > 600) || (Math.abs(x - 9900) < 16 && z < -700) || (Math.abs(x - 9950) < 16 && z > 700);
// The basin Phobos stands in: not round. How far its cliffs' feet stand north and south of the drawbridge's line, at each x
// (the two sides differ, and both wander): a point at the Sill, bays either side of the plain, pinched in to 40 m outside
// the wall at the Charnel Gate (north) and the Tanners' Water Gate (south), wide again behind the city, then drawn in hard against the castle's crag, north and south, so the castle fills the
// basin's head from wall to wall.
const BASIN_N = [[8935, 0], [8960, 150], [9080, 520], [9300, 1010], [9560, 1180], [9760, 930], [9900, 836], [10040, 900], [10300, 1190], [10600, 1040], [10780, 640], [10930, 372], [11075, 338], [11300, 330], [11450, 240], [11560, 0]];
const BASIN_S = [[8935, 0], [8960, 130], [9100, 430], [9330, 760], [9600, 1000], [9820, 900], [9950, 848], [10100, 930], [10380, 1300], [10660, 1240], [10840, 660], [10990, 384], [11075, 346], [11300, 338], [11470, 230], [11560, 0]];
const GATE_N = 9900, GATE_S = 9950;
function edgeAt(T, x) {
  for (let i = 0; i + 1 < T.length; i++) if (x <= T[i + 1][0]) { const t = sstep(T[i][0], T[i + 1][0], x); return T[i][1] + (T[i + 1][1] - T[i][1]) * t; }
  return 0;
}
// How far the basin's cliff feet stand north and south of the drawbridge's line at x: [north, south], metres.
const calmAt = (x, g) => sstep(60, 420, Math.abs(x - g)) * sstep(8935, 9150, x) * (1 - sstep(10600, 10900, x));
export function basinEdges(x) {
  const n = edgeAt(BASIN_N, x) + (fbm(x * 0.0042 + 3, 1.7, 3) - 0.5) * 260 * calmAt(x, GATE_N) + (fbm(x * 0.021, 5, 2) - 0.5) * 34 * calmAt(x, GATE_N);
  const so = edgeAt(BASIN_S, x) + (fbm(x * 0.0042 - 8, 6.1, 3) - 0.5) * 260 * calmAt(x, GATE_S) + (fbm(x * 0.021, 9, 2) - 0.5) * 34 * calmAt(x, GATE_S);
  return [n, so];
}
// How far inside the basin's cliff foot (x, z) is, metres (less than nothing: outside it).
export function basinIn(x, z) {
  if (x < 8935) return -Math.max(8935 - x, Math.abs(z));
  if (x > 11560) return -Math.max(x - 11560, Math.abs(z));
  const [n, so] = basinEdges(x);
  return Math.min(z + n, so - z, (x - 8935) * 2, (11560 - x) * 2);
}
// The basin's walls (src/core/cliffs.js): which wall (x, z) is behind (0 north, 1 south), where that wall's foot is (z),
// how that stretch of it leans, and the height of its foot: the plain, and the talus heaped against it, higher under a
// gully. WALL_BACK: how far back from their feet the walls can reach before the land behind is their top.
export const WALL_BACK = 280;
const TALUS = 21;
const talusAt = (x) => sstep(8990, 9080, x);
export function basinWall(x, z) {
  const [n, so] = basinEdges(x), side = -n - z > z - so ? 0 : 1, zf = side ? so : -n, lie = wallLie(x, side);
  const foot = PLAIN + (fbm(x * 0.02, zf * 0.02 + 40, 3) - 0.5) * 3 + (TALUS + fanOf(lie, 0)) * talusAt(x);
  return { side, zf, lie, foot };
}

// The way through: up to the Notch, down the Chasm to the Sill, and the causeway down onto the plain to the drawbridge.
// [x, z, the floor's height]. It winds: a long bend north under the ridge, back south through a slot to the Broken Span,
// north again round a buttress, and out at the Sill; then the causeway sweeps down in an S. (Drawn through these as one
// smooth line: CHASM.)
const WAY = [
  [7150, 30, 150], [NOTCH.x, NOTCH.z, NOTCH.y], [7640, -70, 145], [7780, -250, 137], [7950, -300, 129], [8080, -150, 122], [8130, 50, 116],
  [8250, 210, 108], [SPAN.x, SPAN.z, 99], [8500, -50, 94], [8550, -200, 91], [8690, -270, 87], [8810, -150, 84], [8870, -10, 82],
  [SILL.x, SILL.z, SILL.y], [9010, 46, SILL.y - 5], [9100, 96, 62], [9190, 40, 46], [9250, -26, 33], [9276, 0, 29], [9330, 0, PLAIN + 1],
];
export const CHASM = [];
for (let i = 0; i + 1 < WAY.length; i++) {
  const p0 = WAY[Math.max(0, i - 1)], p1 = WAY[i], p2 = WAY[i + 1], p3 = WAY[Math.min(WAY.length - 1, i + 2)];
  for (let k = 0; k < 8; k++) {
    const t = k / 8, cr = (q) => 0.5 * (2 * p1[q] + (p2[q] - p0[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t * t + (3 * p1[q] - p0[q] - 3 * p2[q] + p3[q]) * t * t * t);
    CHASM.push([Math.round(cr(0)), Math.round(cr(1)), p1[2] + (p2[2] - p1[2]) * t]);
  }
}
CHASM.push(WAY.at(-1));
const lengths = () => { const L = [0]; for (let i = 0; i + 1 < CHASM.length; i++) L.push(L[i] + Math.hypot(CHASM[i + 1][0] - CHASM[i][0], CHASM[i + 1][1] - CHASM[i][1])); return L; };
// (And between the long bends it snakes, a hundred metres a turn, so you never see far down it: but for the Notch, the Span
// and the Sill, which stand where they're put.)
{
  const L = lengths(), keys = [L[8], L[8 * 8], L[14 * 8]], moved = CHASM.map((p) => p.slice());
  for (let i = 9; i < 14 * 8; i++) {
    const a = CHASM[i - 1], b = CHASM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], d = Math.hypot(dx, dz) || 1;
    const amp = 36 * Math.min(...keys.map((k) => sstep(25, 120, Math.abs(L[i] - k)))) * Math.sin(L[i] / 33);
    moved[i][0] = Math.round(CHASM[i][0] - dz / d * amp); moved[i][1] = Math.round(CHASM[i][1] + dx / d * amp);
  }
  moved.forEach((p, i) => { CHASM[i] = p; });
}
const LEN = lengths();
export const CHASM_LEN = LEN;
const SPAN_S = LEN[8 * 8], SILL_S = LEN[14 * 8];
export const CHASM_SILL_S = SILL_S;
// The Chasm's floor, how far either side of its line, s metres along it: a slot one cart wide in places, a chamber you
// could camp a company in in others; pinched to a doorway for the last of it, so the Sill opens out all at once; the
// causeway narrow.
export function chasmWidth(s) {
  let w = 5.5 + 120 * Math.pow(fbm(s * 0.0052 + 2, 4, 2), 2.6);
  w += (6.5 - w) * sstep(SILL_S - 80, SILL_S - 34, s);
  return s > SILL_S ? 9 : w;
}
// (Its walls: the rock's beds, src/core/cliffs.js, as the basin's are, from the floor's edge up to the high ground.)
// How much further back (or less) a wall stands at (x, z), e metres back from the floor's edge: a metre of roughness
// everywhere, and, growing with the height, buttresses and bays some tens of metres, so the walls round a bend aren't rings
// drawn round it (from above they were an open pit's terraces). (Only a metre: the walls are so near sheer that a few
// metres in or out was a hundred up or down, and they stood in organ pipes, ten metres apart and the wall's whole height,
// their tips the rims' saw teeth from the floor.)
export const chasmWallNoise = (x, z, e) => (fbm(x * 0.045, z * 0.045, 2) - 0.5) * 2.4 + (fbm(x * 0.0105 + 5.3, z * 0.0105 - 2.9, 3) - 0.5) * 64 * sstep(4, 45, e);
const NEAR = { d: 0, d2: 1e9, y: 0, s: 0, side: 0, y2: 0, s2: 0, side2: 0, x: NaN, z: NaN };
// Which way the line turns at each of its corners (+1, -1: the side, as NEAR.side reckons it, 1 or 0, that's the inside).
const TURN = CHASM.map((p, i) => {
  if (i === 0 || i + 1 >= CHASM.length) return 0;
  const a = CHASM[i - 1], b = CHASM[i + 1];
  return Math.sign((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]));
});
const segDist = (i, x, z) => {
  const a = CHASM[i], b = CHASM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
};
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function chasmNear(x, z) {
  // (Asked twice running for the same spot, by eastHeight and then chasmBank: once is enough.)
  if (x === NEAR.x && z === NEAR.z) return NEAR;
  NEAR.x = x; NEAR.z = z;
  let best = 1e18, bi = 0;
  for (let i = 0; i + 1 < CHASM.length; i++) {
    const a = CHASM[i], b = CHASM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const ex = a[0] + dx * t - x, ez = a[1] + dz * t - z, q = ex * ex + ez * ez;
    if (q < best) {
      best = q; bi = i; NEAR.y = a[2] + (b[2] - a[2]) * t; NEAR.s = LEN[i] + (LEN[i + 1] - LEN[i]) * t;
      NEAR.side = dx * (z - a[1]) - dz * (x - a[0]) > 0 ? 1 : 0;
    }
  }
  NEAR.d = Math.sqrt(best);
  // (Rounded on the inside of each of the line's corners: the walls stand some way out from it, and there the two
  // stretches' distances met in a crease, a knife-edge fin up the wall at every corner, twenty metres apart, the rims' saw
  // teeth seen from the floor. On the outside a corner's already round.)
  const sg = NEAR.side ? 1 : -1;
  if (bi > 0 && TURN[bi] === sg) NEAR.d = smin(NEAR.d, segDist(bi - 1, x, z), 26);
  if (bi + 2 < CHASM.length && TURN[bi + 1] === sg) NEAR.d = smin(NEAR.d, segDist(bi + 1, x, z), 26);
  // (And how far the way is round the bend: the nearest of it that's another reach, further along it than straight across.
  // Where the two are near the same, (x, z) is on the crease between them, a promontory's crest.)
  let b2 = 1e18;
  for (let i = 0; i + 1 < CHASM.length; i++) {
    if (LEN[i + 1] < NEAR.s - 2000 || LEN[i] > NEAR.s + 2000) continue;
    const a = CHASM[i], b = CHASM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const ex = a[0] + dx * t - x, ez = a[1] + dz * t - z, q = ex * ex + ez * ez;
    // (Further along than 1.1 times straight across and a bit: never so for a point off a straight stretch, whose every
    // other point is further across than along.)
    const s = LEN[i] + (LEN[i + 1] - LEN[i]) * t;
    if (q < b2 && Math.abs(s - NEAR.s) > 1.1 * Math.sqrt(q) + 12) {
      b2 = q; NEAR.s2 = s; NEAR.y2 = a[2] + (b[2] - a[2]) * t; NEAR.side2 = dx * (z - a[1]) - dz * (x - a[0]) > 0 ? 1 : 0;
    }
  }
  NEAR.d2 = Math.sqrt(b2);
  return NEAR;
}

// The city's wall is a dodecagon (the owner, 2026-11-15), not a round: twelve straight sides, longer north to south than east
// to west, a flat side square to the drawbridge, another to the castle, and one each to the north and south gates.
// cityIn: under 1 inside it, 1 on the wall. CITY_WALL: its twelve corners, [x, z], from the south-east round by the south.
export function cityIn(x, z) {
  const u = (x - CITY.x) / CITY.a, v = (z - CITY.z) / CITY.b;
  let m = 0;
  for (let k = 0; k < 12; k++) m = Math.max(m, u * Math.cos(k * Math.PI / 6) + v * Math.sin(k * Math.PI / 6));
  return m;
}
export const CITY_WALL = Array.from({ length: 12 }, (_, k) => { const t = (k + 0.5) * Math.PI / 6, r = 1 / Math.cos(Math.PI / 12); return [Math.round(CITY.x + CITY.a * r * Math.cos(t)), Math.round(CITY.z + CITY.b * r * Math.sin(t))]; });

// The city's own ground inside its wall: level at the Barbican, rising east to the foot of the Castle Approach.
// It climbs toward the castle's gate from every side, in ten terraces with a bank between each (steep, but walked), so the
// roofs stack up street over street and the Keep stands at the head of every one of them.
export function cityRise(x, z = 0) {
  const t = Math.min(1, Math.max(0, 1 - (Math.hypot(x - 10700, z * 0.8) - 220) / 1150)), n = 10, f = t * n, k = Math.floor(f);
  return 96 * (k + sstep(0.62, 1, f - k)) / n;
}
// The crag's shape: c, how far out from its middle (x, z) is, 1 about its foot (an ellipse, but with ribs and gullies in its
// sides and its edges skewed and wandering, from the Approach's buttress east); its cliffs stand from c 1.06 (foot) to 0.95
// (the ward's edge on top). cragTop: the height of the ward there.
export function cragC(x, z) {
  const rough = sstep(10770, 10900, x);
  return Math.hypot((x - CRAG.x) / CRAG.a, (z - CRAG.z) / CRAG.b) + ((fbm(x * 0.006 + 8, z * 0.006, 3) - 0.5) * 0.34 + (fbm(x * 0.03 + 8, z * 0.03, 2) - 0.5) * 0.1) * rough;
}
export const cragTop = (x, z) => PLAIN + wardAt(x + z * 0.22 + (fbm(z * 0.011, 3, 2) - 0.5) * 90);
// The ward's height (over the plain) at x on the crag.
export function wardAt(x) {
  let y = WARDS[0][1];
  for (let i = 1; i < WARDS.length; i++) y += (WARDS[i][1] - WARDS[i - 1][1]) * sstep(WARDS[i][0] - 20, WARDS[i][0] + 20, x);
  return y;
}

// The mountains either side of the basin: massifs north and south of it, standing four to six hundred metres over its
// rims, so the castle at the head stands framed between ranges (never behind it: there the high ground's held low so the
// castle and the Keep break the sky by themselves). [x, z, height, radius]
const PEAKS = [[9650, -2350, 470, 360], [10450, -2150, 600, 420], [11250, -1780, 520, 320], [9850, 2350, 520, 380], [10700, 2200, 640, 430], [11300, 1820, 480, 300]];
// Each massif's summits: its own horn, the tallest, and two lesser ones off its shoulders at about two thirds and half its
// height. Each a horn of three faces with arêtes between them, its sides falling concave and steepest at the top, and
// gullies down them. (Ridged noise over one dome stood a crown of a dozen near-equal needles on every massif: the critics.)
// [x, z, height, radius, its turn]
const SUMMITS = PEAKS.flatMap(([px, pz, H, R], k) => {
  const a = k * 2.399 + 0.7;
  return [[px, pz, H, R * 1.15, a], [px + Math.cos(a) * R * 0.8, pz + Math.sin(a) * R * 0.8, H * 0.66, R * 0.75, a + 1.1],
    [px + Math.cos(a + 2.6) * R * 0.7, pz + Math.sin(a + 2.6) * R * 0.7, H * 0.5, R * 0.6, a + 2.3]];
});
function peaksAt(x, z) {
  let h = 0;
  for (const [sx, sz, H, R, ph] of SUMMITS) {
    const dx = x - sx, dz = z - sz, d2 = dx * dx + dz * dz;
    if (d2 > R * R * 2) continue;
    const d = Math.sqrt(d2), th = Math.atan2(dz, dx);
    // (Lopsided: one face long and laid back, the one opposite short and steep, so its top stands off its middle; and each
    // arête notched two or three times on its way down. Even all round, every horn was a pyramid: the critics, round 3.)
    const Rr = R * (1 + 0.22 * Math.cos(3 * th + ph)) * (1 + 0.32 * Math.cos(th - 1.7 * ph)) * (0.85 + 0.3 * fbm(x * 0.004 + ph, z * 0.004 - ph, 2));
    const u = 1 - d / Rr;
    if (u <= 0) continue;
    const cr = 1 - Math.abs(2 * fbm(x * 0.0065 + ph * 3, z * 0.0065 - ph, 2) - 1);
    const ar = Math.pow(Math.max(0, Math.cos(3 * th + ph)), 6), nt = Math.pow(Math.max(0, Math.sin(u * 8.5 + ph * 2.1)), 10);
    const v = H * Math.pow(u, 1.7) * (1 - 0.26 * (1 - u) * (1 - cr * cr)) * (1 - 0.07 * ar * nt * (1 - u));
    if (v > h) h = v;
  }
  return h;
}

const ridgeWander = (z) => (fbm(z * 0.0011 + 3, 1.5, 3) - 0.5) * 620 + (fbm(z * 0.006, 9, 2) - 0.5) * 110;
const WANDER0 = ridgeWander(0);

// The ground out east: h is the land as the countries made it (lands.js landHeight, before roads, places and water).
export function eastHeight(x, z, h) {
  if (x < 7000) return h;
  // The highland: the ridge's west face climbs out of the Marches to a crest over the Notch's line, and behind it broken
  // high ground runs east to the bowl's rim and on round it to the world's edge.
  // (The ridge's line wanders, but stands where the layout has it at the Notch; its crest is a row of peaks, and the high
  // ground behind is ridged like a mountain's back, never lower than the Chasm's walls need.)
  const wob = ridgeWander(z) - WANDER0;
  const rg = 1 - Math.abs(fbm(x * 0.0016 + 31, z * 0.0016 - 12, 5) * 2 - 1), rg2 = 1 - Math.abs(fbm(x * 0.0062, z * 0.0062 + 5, 3) * 2 - 1);
  // (Its slopes stepped in the rock's beds: src/core/cliffs.js terraceY. But the mountains only at their feet: stepped to
  // their tops, they stood as ziggurats with snow along every step; and hardly at all just back from the Chasm's rims, whose
  // steps, seen from its floor against the sky, were a saw's teeth.)
  const pk = peaksAt(x, z);
  let tAmt = 0.45 * (1 - 0.85 * sstep(40, 200, pk));
  if (x > 7100 && x < 9400 && Math.abs(z) < 1000) { const n = chasmNear(x, z); tAmt *= 0.08 + 0.92 * sstep(100, 380, n.d - chasmWidth(n.s)); }
  const high = terraceY(x, z, 190 + 250 * Math.pow(rg, 1.6) + 46 * rg2 * rg2 + pk
    + (70 + 130 * fbm(z * 0.0031 + 2, 7, 3)) * Math.exp(-(((x - 7500 - wob) / 170) ** 2))
    // (The Notch's two horns, a tall one north of it and a broader one south: seen from Greywarden, they say where the pass is.)
    + 230 * Math.exp(-(((x - 7530) / 150) ** 2) - (((z + 330) / 150) ** 2)) + 160 * Math.exp(-(((x - 7500) / 190) ** 2) - (((z - 300) / 200) ** 2)), tAmt);
  let y = h + (Math.max(high, h * 0.4 + 120) - h) * sstep(7120 + wob, 7470 + wob, x);
  // (Round the basin's head the high ground is held low, so the castle and the Keep break the sky by themselves.)
  // (Along the basin's sides the rim rises and falls, some tens of metres over a few hundred: one rim height all round read
  // as a quarry's.)
  if (x > 9150 && x < 10700) y += (fbm(x * 0.0024 + 7, z * 0.0024 - 3, 3) - 0.5) * 200 * sstep(9150, 9450, x) * (1 - sstep(10400, 10700, x)) * sstep(500, 900, Math.abs(z));
  if (x > 10200) { const k = sstep(10200, 10800, x) * (1 - sstep(1000, 1700, Math.abs(z))); y -= Math.max(0, y - 225) * 0.85 * k; }
  // (And either side of the Sill the rim is cut down, so that from the shelf the wall, the castle and the Keep fill the view
  // and the cliffs don't stand over them.)
  { const sd = Math.hypot(x - SILL.x, z - SILL.z); if (sd < 900 && x > SILL.x - 260) y -= Math.max(0, y - 150) * 0.8 * (1 - sstep(420, 900, sd)) * sstep(SILL.x - 260, SILL.x - 60, x); }
  // The basin: its floor the moat plain, its sides cliffs that stand right up against the city's north and south gates.
  const m = basinIn(x, z);
  if (m > -WALL_BACK) {
    const cw = cityIn(x, z);
    let floor = PLAIN + (fbm(x * 0.02, z * 0.02 + 40, 3) - 0.5) * 3 + cityRise(x, z) * (1 - sstep(0.96, 1.12, cw));
    // The moat, a ditch 40 m wide round the wall's foot (left whole at the gates); and the Slough through the city.
    if (cw > 1.012 && cw < 1.085 && !gateWay(x, z)) floor -= 8 * sstep(1.012, 1.026, cw) * (1 - sstep(1.068, 1.085, cw));
    if (cw < 1.02 && x > 9780 && x < 10030) {
      const sd = sloughNear(x, z);
      // (Left whole where a street crosses it: a causeway with the water, when there is water, let through under it.)
      // (Cut from the lower of its two banks, not from the ground it's in: it runs along the edge of a terrace in the city's
      // middle, where a ditch cut from the high side had its bed over the low bank, and no water could lie in it.)
      if (sd < 14) {
        const [px, pz, ux, uz] = sloughAt(x, z), base = (bx, bz) => PLAIN + (fbm(bx * 0.02, bz * 0.02 + 40, 3) - 0.5) * 3 + cityRise(bx, bz);
        const low = Math.min(floor, base(px - uz * 17, pz + ux * 17), base(px + uz * 17, pz - ux * 17));
        floor -= (floor - low + 4.5) * (1 - sstep(6, 14, sd)) * sstep(1, 7, streetOver(x, z));
      }
    }
    // The crag: three terraces, cliffs all round but where the Approach comes up to its west end.
    // (Not a round either: ribs and gullies in its sides, its terraces' edges skewed and wandering, a buttress to the west
    // where the Approach meets it, and a saddle at its back tying it to the basin's head.)
    // (The basin's sides: a talus apron at their feet, heaped into a fan under every gully; laid here, before the crag, so
    // it fills the slots either side of the crag without lifting the crag's own face.)
    const W = m < 48 ? basinWall(x, z) : null;
    const c = cragC(x, z);
    // (But not heaped into the slots between the walls and the crag: there it buried the crag's foot in one smooth dome.)
    if (W) floor += (TALUS * Math.pow(1 - Math.min(1, Math.max(0, m) / 30), 1.5) + fanOf(W.lie, m)) * talusAt(x) * sstep(1.08, 1.4, c);
    // (Each only lifts the ground where it has something to lift: as a floor of PLAIN they filled the moat back in.)
    // (Its sides in the rock's beds, src/core/cliffs.js: cliff, ledge, cliff, from the foot to the ward's edge.)
    // (And cut by gullies between buttresses, ten metres back, every sixty or so round it, from its foot to near its top: the
    // ward's edge itself left whole, for the curtain on it. Smooth all round, its south face was one dome: the critics.)
    if (c < 1.06) {
      let u = (1.06 - c) / 0.11;
      if (x > 10800) {
        const per = Math.atan2((z - CRAG.z) / CRAG.b, (x - CRAG.x) / CRAG.a) * 330;
        const gl = Math.pow(Math.max(0, 1 - Math.abs(2 * fbm(per / 45 + 4.4, 2.2, 2) - 1)), 2);
        u -= 0.6 * gl * (1 - sstep(0.72, 0.93, u)) * sstep(10800, 10900, x);
      }
      floor = Math.max(floor, cragFaceY(x, PLAIN, cragTop(x, z), u));
    }
    // (The saddle at its back, up to the basin's head: in the beds too, cliff and ledge, not a smooth heap.)
    if (x > 11300) { const u = sstep(11300, 11420, x) * (1 - sstep(110, 250, Math.abs(z))); if (u > 0) floor = Math.max(floor, cragFaceY(x, PLAIN, PLAIN + 215, u)); }
    // The way up from the Lower Ward: a ramp along the foot of the Middle Ward's wall, in through its gate and round onto
    // the ward (WARD_RAMP). Cut and banked into the rock, as the Chasm's floor is.
    if (x > 10860 && x < 11030 && z > -175 && z < 120) {
      let best = 1e9, ry = 0;
      for (let i = 0; i + 1 < WARD_RAMP.length; i++) {
        const a = WARD_RAMP[i], b = WARD_RAMP[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))), d = Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
        if (d < best) { best = d; ry = a[2] + (b[2] - a[2]) * t; }
      }
      if (best < 19) floor += (PLAIN + ry - floor) * (1 - sstep(6, 19, best));
    }
    // The Castle Approach: a ramp built up from the city's top streets to the Lower Ward's gate, on the King's Mile's line.
    if (x > 10440 && x < 10830 && Math.abs(z) < 44) {
      const ramp = PLAIN + cityRise(10440) + (WARDS[0][1] - cityRise(10440)) * sstep(10440, 10790, x);
      // (Its sides soft slopes where the High Loop comes up onto it; past that a causeway walled both sides, its ground
      // falling sheer from the parapet's foot: src/core/phobos-build.js phobosCastle builds the walls.)
      const sheer = sstep(APPROACH_WALL - 30, APPROACH_WALL, x), w0 = 13 + 0.6 * sheer, w1 = 44 - (44 - 15.6) * sheer;
      if (ramp > floor) floor += (ramp - floor) * (1 - sstep(w0, w1, Math.abs(z)));
    }
    // The basin's sides: over the talus, the cliff, in the rock's beds (src/core/cliffs.js), up to the high ground behind it.
    y = W && m < 0 ? Math.max(floor, Math.min(y, faceY(x, W.foot, -m, W.lie))) : floor;
  }
  // The way through: cut down to its floor through the highland; built up as a causeway from the Sill down to the plain.
  if (x > 7100 && x < 9400 && Math.abs(z) < 520) {
    const n = chasmNear(x, z);
    let fl = n.y;
    // (The Broken Span: where the bridge stood the floor falls away into a cleft, and you cross on what fell.)
    fl -= 9 * Math.exp(-(((n.s - SPAN_S) / 22) ** 2));
    const w = chasmWidth(n.s);
    // (Cut by both reaches either side of a promontory, where one's round a bend from the other: the lower of the two walls,
    // a little rounded where they meet. By the nearest alone, two reaches as wide as each other's walls weren't stood at two
    // heights along the line between them, a step the height of a wall drawn dead straight, its edge the rims' saw teeth
    // from the floor: the critics.)
    if (y > fl && n.s <= SILL_S + 30) {
      let f = faceY(x, fl, Math.max(0, n.d - w + chasmWallNoise(x, z, n.d - w)), chasmLie(n.s, n.side));
      if (n.d2 < n.d + 60 && n.s2 <= SILL_S + 30) {
        const fl2 = n.y2 - 9 * Math.exp(-(((n.s2 - SPAN_S) / 22) ** 2)), w2 = chasmWidth(n.s2);
        const f2 = n.d2 <= w2 ? fl2 : faceY(x, fl2, Math.max(0, n.d2 - w2 + chasmWallNoise(x, z, n.d2 - w2)), chasmLie(n.s2, n.side2));
        f = smin(f, f2, 14);
      }
      y = Math.min(y, f);
    }
    else if (y > fl) y = fl + (y - fl) * sstep(w, w + 50, n.d);
    // (The causeway ends at the moat's far bank, where the Drawbridge's abutment stands: the ditch runs on under the bridge.)
    else if (n.s > SILL_S - 5 && cityIn(x, z) > 1.088) y = fl + (y - fl) * sstep(w, w + 46, n.d);
    // The Sill itself: a level shelf at the Chasm's mouth, out over the plain.
    const sd = Math.hypot(x - SILL.x, z - SILL.z);
    if (sd < SILL.r + 26) y = SILL.y + (y - SILL.y) * sstep(SILL.r, SILL.r + 26, sd);
  }
  return y;
}

// Where along the Chasm's line (x, z) is nearest, metres from its start (src/core/cliff-skin.js: where a wall's column has
// gone past the middle of a promontory, the face beyond is another's).
export const chasmAlong = (x, z) => chasmNear(x, z).s;

// The Throne Road's banks (src/core/roadbed.js) cut back into the Chasm's walls as into any hillside, a slope sixteen metres
// wide eased up from the road's edge: there the walls stood up out of a smooth ramp. The floor's laid level already, at the
// way's own height (eastHeight): so past the floor's edge the walls stand as they are, sheer from it. (A bank that fills
// is left be.) level: the land with the road laid in it; h: without.
export function chasmBank(x, z, level, h) {
  if (x < 7400 || x > 9000 || level >= h || Math.abs(z) > 520) return level;
  const n = chasmNear(x, z);
  if (n.s > SILL_S) return level;
  return level + (h - level) * sstep(0, 2, n.d - chasmWidth(n.s));
}

// Whether the east's ground is too steep here for anything to stand on it (a cliff: the ridge's face, the Chasm's walls, the
// basin's and the crag's). By its own shape alone, over a level 150 m: near enough, and cheap.
export function eastSteep(x, z) {
  const g = 6, dx = eastHeight(x + g, z, 150) - eastHeight(x - g, z, 150), dz = eastHeight(x, z + g, 150) - eastHeight(x, z - g, 150);
  return Math.hypot(dx, dz) / (2 * g) > 0.8;
}
