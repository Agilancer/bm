// The east, out past the old edge of the world: the Marches, the ridge and Widow's Notch, the Chasm down to the Sill, and the
// great bowl the City State of Phobos stands in, with Castle Velscour's crag at its back. Laid out in docs/PHOBOS-LAYOUT.md and
// tools/phobos/layout.json (the numbers here are that file's). Only the ground: what stands on it is src/core/sites.js.
// +x is east, +z is south.

import { fbm, sstep } from './terrain-noise.js';
import { PHOBOS } from './phobos-data.js';

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
const gateWay = (x, z) => (Math.abs(z) < 16 && Math.abs(x - CITY.x) > 600) || (Math.abs(x - 9900) < 16 && z < -700) || (Math.abs(x - 9950) < 16 && z > 700);
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
// How far inside the basin's cliff foot (x, z) is, metres (less than nothing: outside it).
export function basinIn(x, z) {
  if (x < 8935) return -Math.max(8935 - x, Math.abs(z));
  if (x > 11560) return -Math.max(x - 11560, Math.abs(z));
  const calm = (g) => sstep(60, 420, Math.abs(x - g)) * sstep(8935, 9150, x) * (1 - sstep(10600, 10900, x));
  const n = edgeAt(BASIN_N, x) + (fbm(x * 0.0042 + 3, 1.7, 3) - 0.5) * 260 * calm(GATE_N) + (fbm(x * 0.021, 5, 2) - 0.5) * 34 * calm(GATE_N);
  const so = edgeAt(BASIN_S, x) + (fbm(x * 0.0042 - 8, 6.1, 3) - 0.5) * 260 * calm(GATE_S) + (fbm(x * 0.021, 9, 2) - 0.5) * 34 * calm(GATE_S);
  return Math.min(z + n, so - z, (x - 8935) * 2, (11560 - x) * 2);
}

// The way through: up to the Notch, down the Chasm to the Sill, and the causeway down onto the plain to the drawbridge.
// [x, z, the floor's height]. It winds: a long bend north under the ridge, back south through a slot to the Broken Span,
// north again round a buttress, and out at the Sill; then the causeway sweeps down in an S. (Drawn through these as one
// smooth line: CHASM.)
const WAY = [
  [7150, 30, 150], [NOTCH.x, NOTCH.z, NOTCH.y], [7640, -70, 145], [7780, -250, 137], [7950, -300, 129], [8080, -150, 122], [8130, 50, 116],
  [8250, 210, 108], [SPAN.x, SPAN.z, 99], [8500, -50, 94], [8550, -200, 91], [8690, -270, 87], [8810, -150, 84], [8870, -10, 82],
  [SILL.x, SILL.z, SILL.y], [9010, 46, SILL.y - 5], [9100, 96, 62], [9190, 40, 46], [9265, -34, 31], [9330, 0, PLAIN + 1],
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
const SPAN_S = LEN[8 * 8], SILL_S = LEN[14 * 8];
// A chasm wall's height t metres back from the floor's edge: a first cliff, a ledge, a second cliff, a broader ledge, and on up.
const wallUp = (t) => (t < 5 ? 17 * sstep(0, 5, t) : t < 13 ? 17 + (t - 5) * 0.25 : t < 20 ? 19 + 27 * sstep(13, 20, t) : t < 33 ? 46 + (t - 20) * 0.25 : 49.25 + (t - 33) * 5);
const NEAR = { d: 0, y: 0, s: 0 };
function chasmNear(x, z) {
  let best = 1e18;
  for (let i = 0; i + 1 < CHASM.length; i++) {
    const a = CHASM[i], b = CHASM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const ex = a[0] + dx * t - x, ez = a[1] + dz * t - z, q = ex * ex + ez * ez;
    if (q < best) { best = q; NEAR.y = a[2] + (b[2] - a[2]) * t; NEAR.s = LEN[i] + (LEN[i + 1] - LEN[i]) * t; }
  }
  NEAR.d = Math.sqrt(best);
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
// The ward's height (over the plain) at x on the crag.
export function wardAt(x) {
  let y = WARDS[0][1];
  for (let i = 1; i < WARDS.length; i++) y += (WARDS[i][1] - WARDS[i - 1][1]) * sstep(WARDS[i][0] - 20, WARDS[i][0] + 20, x);
  return y;
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
  const high = 190 + 250 * Math.pow(rg, 1.6) + 46 * rg2 * rg2
    + (70 + 130 * fbm(z * 0.0031 + 2, 7, 3)) * Math.exp(-(((x - 7500 - wob) / 170) ** 2))
    // (The Notch's two horns, a tall one north of it and a broader one south: seen from Greywarden, they say where the pass is.)
    + 230 * Math.exp(-(((x - 7530) / 150) ** 2) - (((z + 330) / 150) ** 2)) + 160 * Math.exp(-(((x - 7500) / 190) ** 2) - (((z - 300) / 200) ** 2));
  let y = h + (Math.max(high, h * 0.4 + 120) - h) * sstep(7120 + wob, 7470 + wob, x);
  // (Round the basin's head the high ground is held low, so the castle and the Keep break the sky by themselves.)
  if (x > 10200) { const k = sstep(10200, 10800, x) * (1 - sstep(1000, 1700, Math.abs(z))); y -= Math.max(0, y - 225) * 0.85 * k; }
  // (And either side of the Sill the rim is cut down, so that from the shelf the wall, the castle and the Keep fill the view
  // and the cliffs don't stand over them.)
  { const sd = Math.hypot(x - SILL.x, z - SILL.z); if (sd < 900 && x > SILL.x - 260) y -= Math.max(0, y - 150) * 0.8 * (1 - sstep(420, 900, sd)) * sstep(SILL.x - 260, SILL.x - 60, x); }
  // The basin: its floor the moat plain, its sides cliffs that stand right up against the city's north and south gates.
  const m = basinIn(x, z);
  if (m > -70) {
    const cw = cityIn(x, z);
    let floor = PLAIN + (fbm(x * 0.02, z * 0.02 + 40, 3) - 0.5) * 3 + cityRise(x, z) * (1 - sstep(0.96, 1.12, cw));
    // The moat, a ditch 40 m wide round the wall's foot (left whole at the gates); and the Slough through the city.
    if (cw > 1.012 && cw < 1.085 && !gateWay(x, z)) floor -= 8 * sstep(1.012, 1.026, cw) * (1 - sstep(1.068, 1.085, cw));
    if (cw < 1.02 && x > 9780 && x < 10030) {
      const sd = sloughNear(x, z);
      // (Left whole where a street crosses it: a causeway with the water, when there is water, let through under it.)
      if (sd < 14) floor -= 4.5 * (1 - sstep(6, 14, sd)) * sstep(1, 7, streetOver(x, z));
    }
    // The crag: three terraces, cliffs all round but where the Approach comes up to its west end.
    // (Not a round either: ribs and gullies in its sides, its terraces' edges skewed and wandering, a buttress to the west
    // where the Approach meets it, and a saddle at its back tying it to the basin's head.)
    const rough = sstep(10770, 10900, x);
    const c = Math.hypot((x - CRAG.x) / CRAG.a, (z - CRAG.z) / CRAG.b) + ((fbm(x * 0.006 + 8, z * 0.006, 3) - 0.5) * 0.34 + (fbm(x * 0.03 + 8, z * 0.03, 2) - 0.5) * 0.1) * rough;
    if (c < 1.2) floor = Math.max(floor, PLAIN + wardAt(x + z * 0.22 + (fbm(z * 0.011, 3, 2) - 0.5) * 90) * (1 - sstep(0.95, 1.06, c)));
    floor = Math.max(floor, PLAIN + 215 * sstep(11300, 11420, x) * (1 - sstep(110, 250, Math.abs(z))));
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
      if (ramp > floor) floor += (ramp - floor) * (1 - sstep(13, 44, Math.abs(z)));
    }
    // (The basin's sides: a talus apron at their feet, then the cliff.)
    if (m > 0 && m < 30) floor += 21 * Math.pow(1 - m / 30, 1.5) * sstep(8990, 9080, x);
    y = m > 0 ? floor : floor + (y - floor) * sstep(0, 30, -m);
  }
  // The way through: cut down to its floor through the highland; built up as a causeway from the Sill down to the plain.
  if (x > 7100 && x < 9400 && Math.abs(z) < 520) {
    const n = chasmNear(x, z);
    let fl = n.y;
    // (The Broken Span: where the bridge stood the floor falls away into a cleft, and you cross on what fell.)
    fl -= 9 * Math.exp(-(((n.s - SPAN_S) / 22) ** 2));
    // (Its floor: a slot two carts wide in places, a hollow you could camp a company in in others; the causeway narrow.)
    // (Its floor: a slot one cart wide in places, a chamber you could camp a company in in others; pinched to a doorway for
    // the last of it, so the Sill opens out all at once; the causeway narrow.)
    let w = 5.5 + 120 * Math.pow(fbm(n.s * 0.0052 + 2, 4, 2), 2.6);
    w += (6.5 - w) * sstep(SILL_S - 80, SILL_S - 34, n.s);
    if (n.s > SILL_S) w = 9;
    if (y > fl && n.s <= SILL_S + 30) y = Math.min(y, fl + wallUp(Math.max(0, n.d - w + (fbm(x * 0.045, z * 0.045, 2) - 0.5) * 7)));
    else if (y > fl) y = fl + (y - fl) * sstep(w, w + 50, n.d);
    else if (n.s > SILL_S - 5) y = fl + (y - fl) * sstep(w, w + 46, n.d);
    // The Sill itself: a level shelf at the Chasm's mouth, out over the plain.
    const sd = Math.hypot(x - SILL.x, z - SILL.z);
    if (sd < SILL.r + 26) y = SILL.y + (y - SILL.y) * sstep(SILL.r, SILL.r + 26, sd);
  }
  return y;
}

// Whether the east's ground is too steep here for anything to stand on it (a cliff: the ridge's face, the Chasm's walls, the
// basin's and the crag's). By its own shape alone, over a level 150 m: near enough, and cheap.
export function eastSteep(x, z) {
  const g = 6, dx = eastHeight(x + g, z, 150) - eastHeight(x - g, z, 150), dz = eastHeight(x, z + g, 150) - eastHeight(x, z - g, 150);
  return Math.hypot(dx, dz) / (2 * g) > 0.8;
}
