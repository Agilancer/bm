// The rock the east is made of, and how its cliffs stand: the basin's walls round Phobos and Castle Velscour's crag
// (src/core/east.js eastHeight), the same shape the land is walked on and the rock's skin is drawn over
// (src/core/cliff-skin.js, src/gfx/cliffs.js).
//
// The rock lies in beds, one over another, the same everywhere out here: hard beds that stand as sheer cliff, and soft ones
// between them that lie back as ledges, or as scree slopes where they're thick. Where a wall is cut through them every bed
// shows as a band right along it: cliff, ledge, cliff, a scree slope, cliff. The beds dip a little toward the castle (east),
// so their lines run down the basin's long walls to it. (One height for a cliff and a smooth ramp to the top read as a
// curtain hung round the city: the owner, 2026-11-21, "make them actually look decent".)
//
// t: a height measured along the beds, the world's y plus their dip (tiltAt). cumAt(t): how far back a face has come,
// per unit of lean, by height t, from far under everything; tAtCum is the other way round.
import { fbm, vnoise, sstep } from './terrain-noise.js';

const T0 = -400, T1 = 1400, STEP = 0.25, N = Math.round((T1 - T0) / STEP);
// The dip: down eastward, about three metres in a hundred.
export const tiltAt = (x) => -0.03 * (x - 10000);

function rng(seed) { let s = seed; return () => { s = Math.imul(s ^ (s >>> 15), 2246822519) + 1 | 0; return ((s ^ (s >>> 13)) >>> 0) / 4294967296; }; }

// The beds: [t0, t1, run (metres back per metre up), hard (1: a cliff's bed), which (a number of its own, 0 to 1: its
// colour, and which stone it is, src/gfx/materials.js TERRAIN)].
export const BEDS = [];
{
  const R = rng(770311);
  let t = T0;
  while (t < T1) {
    // A hard bed: now and then a massive one, twenty-odd to fifty metres of near sheer cliff, and between them thin ones,
    // four to twelve, stacked one on another as one sheer packet. (All of a middling thickness, a wall's beds stood as a
    // dozen even steps: the critics' ziggurat.)
    const massive = R() < 0.32, th = massive ? 24 + 30 * R() : 4 + 8 * R();
    BEDS.push([t, t + th, massive ? 0.03 + 0.05 * R() : 0.05 + 0.08 * R(), 1, R()]); t += th;
    // Then a soft one. Over a massive bed a ledge (thin, lying far back) or now and then a scree slope (thick, at about
    // forty-five degrees); over a thin one only a parting, a metre of shale set back a hand's breadth, a line along the face.
    // (A ledge over every bed, a wall three hundred metres high had nineteen of them, ringing the basin like an open pit's
    // benches: the critics, round 3. Now five or so.)
    if (massive && R() < 0.3) { const s = 8 + 14 * R(); BEDS.push([t, t + s, 0.8 + 0.3 * R(), 0, R()]); t += s; }
    else if (massive) { const s = 2 + 5 * R(); BEDS.push([t, t + s, 1.5 * (1.3 + 1.6 * R()), 0, R()]); t += s; }
    else { const s = 0.5 + 1.2 * R(); BEDS.push([t, t + s, 0.22 + 0.25 * R(), 0, R()]); t += s; }
  }
}
// Per STEP of t from T0: the run, and which bed.
const RUN = new Float32Array(N), BED_OF = new Uint16Array(N), CUM = new Float64Array(N + 1);
{
  let b = 0;
  for (let i = 0; i < N; i++) {
    const t = T0 + (i + 0.5) * STEP;
    while (b + 1 < BEDS.length && t >= BEDS[b][1]) b++;
    RUN[i] = BEDS[b][2]; BED_OF[i] = b;
    CUM[i + 1] = CUM[i] + RUN[i] * STEP;
  }
}
// (The beds' mean run, metres back per metre up, over the walls' heights.)
const MEAN_RUN = (CUM[Math.round(300 / STEP) - Math.round(T0 / STEP)] - CUM[-Math.round(T0 / STEP)]) / 300;
const idxOf = (t) => Math.min(N - 1, Math.max(0, Math.floor((t - T0) / STEP)));

export function cumAt(t) {
  const f = (t - T0) / STEP;
  if (f <= 0) return f * STEP * RUN[0];
  if (f >= N) return CUM[N] + (f - N) * STEP * RUN[N - 1];
  const i = Math.floor(f);
  return CUM[i] + (f - i) * STEP * RUN[i];
}
export function tAtCum(c) {
  if (c <= 0) return T0 + c / RUN[0];
  if (c >= CUM[N]) return T1 + (c - CUM[N]) / RUN[N - 1];
  let lo = 0, hi = N;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CUM[m] <= c) lo = m; else hi = m; }
  return T0 + (lo + (c - CUM[lo]) / (CUM[lo + 1] - CUM[lo])) * STEP;
}
export const bedAt = (t) => BEDS[BED_OF[idxOf(t)]];
export const bedIndexAt = (t) => BED_OF[idxOf(t)];

// How a stretch of the basin's wall leans, at s metres along it (side: 0 the north wall, 1 the south): k, how far back it
// leans overall (the beds' runs times this); g, a gully's (more) or a spur's (less) extra lean that grows with the height,
// to some tens of metres at the top, so a gully cuts a V notch into the rim and a spur stands out of it as a buttress;
// f, the face's fluting, the joints the rock splits along, set back a metre or two in narrow vertical runs; lift, how far
// the beds are raised (or let down) there, the rock folded in long low waves, so their lines never run ruler straight
// along a wall but rise and fall over it, some twenty metres in half a kilometre.
// (Its lean sharply different from one stretch to the next: steep spurs standing out between bays laid back, five or six
// down each side. Near even all round, the ring's benches ran concentric like a quarry's: the critics, round 3. And its
// beds folded higher, so a band climbs or falls tens of metres across a few hundred.)
export function wallLie(s, side, chasm = false) {
  const o = side * 31.7;
  const k = chasm ? 0.6 + 0.75 * fbm(s * 0.0032 + o, 2.3 + o, 3) : 0.55 + 1.0 * sstep(0.32, 0.68, fbm(s * 0.0032 + o, 2.3 + o, 3));
  const gully = Math.pow(Math.max(0, 1 - Math.abs(2 * vnoise(s / 150 + o, 1.7) - 1)), 4);
  const spur = Math.pow(Math.max(0, 1 - Math.abs(2 * vnoise(s / 210 + o, 8.3) - 1)), 4);
  const f = 2.2 * Math.pow(Math.abs(2 * fbm(s / 14 + o, 4.4, 2) - 1), 0.6);
  const fault = faultAt(s, o);
  const lift = (chasm ? 44 : 100) * (fbm(s * (chasm ? 0.0019 : 0.0026) + o, 6.1 + o, 3) - 0.5) + (chasm ? 9 : 16) * (fbm(s * 0.0071 + o, 2.9, 2) - 0.5) + fault;
  return { k, g: 62 * gully - 16 * spur, f, gully, lift, fault };
}
// Faults: every couple of hundred metres along a wall (never evenly) the whole stack of beds is dropped or raised as a
// block, ten to forty metres, so the bands step at a crack instead of running unbroken round the basin like a cake's
// (the critics, round 1: "a wedding cake, an open pit"). The step's taken over a few metres.
const fhash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function faultAt(s, o) {
  const u = s / 230 + 0.9 * fbm(s * 0.0021 + o, 3.3 + o, 2) + o, c = Math.floor(u), f = u - c;
  const h = (n) => (fhash(n + o * 7.3) - 0.5) * 2 * (10 + 30 * fhash(n * 1.7 + 4.1));
  return h(c - 1) + (h(c) - h(c - 1)) * sstep(0, 0.035, f);
}
// The Chasm's walls: the same rock cut narrower, so its walls stand steeper (two thirds of the basin's lean) and its gullies
// shallower. s along the way, side 0 or 1.
export function chasmLie(s, side) {
  const L = wallLie(s * 1.6 + 3000, side + 2, true);
  // (Its beds' ledges fewer and wider than they were, the Chasm's walls lean as far overall as they did: two thirds of the
  // basin's old lean, by the beds' mean run then, 0.668, and now.)
  L.k *= 0.68 * 0.668 / MEAN_RUN; L.g *= 0.45; L.f *= 0.4;
  // (Not faulted: a slot a dozen metres wide, its walls stepped tens of metres at a crack, came out ramps and slabs across
  // the way. The basin's walls are.)
  L.lift -= L.fault; L.fault = 0;
  return L;
}
// How far back from its foot a wall with that lie stands, having come up c (cumAt's) from its foot.
const G_RISE = 26;
export const setbackOf = (c, lie) => lie.k * c + lie.g * (1 - Math.exp(-lie.k * c / G_RISE)) + lie.f;
// And the other way: how far up (in cumAt's terms) a wall with that lie is, d metres back from its foot (0 where it's
// not yet begun).
export function climbOf(d, lie) {
  const e = d - lie.f;
  if (e <= 0) return 0;
  const k = lie.k, g = lie.g;
  let c = e / (k + Math.max(0, g) / G_RISE);
  for (let i = 0; i < 5; i++) {
    const x = Math.exp(-k * c / G_RISE), f = k * c + g * (1 - x) - e, df = k + g * k / G_RISE * x;
    c -= f / df;
    if (c < 0) c = 0;
  }
  return c;
}

// A face's height, d metres back from a foot at height y0 (x for the dip), leaning as lie says.
export function faceY(x, y0, d, lie) {
  const tl = tiltAt(x) + (lie.lift || 0), t0 = y0 + tl;
  return tAtCum(cumAt(t0) + climbOf(d, lie)) - tl;
}

// The high ground's slopes in the same beds: a slope's height stepped, so that where it climbs through a hard bed it
// stands up as a band of cliff and where through a soft one it lies back as a ledge, over all the same climb (amt: how
// much; the ledges keep a little of the slope). Where it's level it's left level. (Its tops were a grey dough of rounded
// hills round the basin: the owner wanted the peaks to look like mountains, 2026-11-21.)
// (By the beds' setback smoothed over a hundred and twenty metres of them: so a step never takes a slope more than half a
// bed from where it was.)
const SMOOTH = new Float64Array(N + 1);
{
  const W = Math.round(60 / STEP), pre = new Float64Array(N + 2);
  for (let i = 0; i <= N; i++) pre[i + 1] = pre[i] + CUM[i];
  for (let i = 0; i <= N; i++) { const a = Math.max(0, i - W), b = Math.min(N, i + W); SMOOTH[i] = (pre[b + 1] - pre[a]) / (b - a + 1); }
}
// (The beds wave a little under the high ground, so its steps follow no one height round a hill; and at a little over half
// strength, its ledges keeping most of their slope: at full, a far-off land's cells drew the steps as squares and zigzags.)
export function terraceY(x, z, y, amt = 0.55) {
  const tl = tiltAt(x) + 26 * (fbm(x * 0.0031 + 1.3, z * 0.0031 - 4.1, 2) - 0.5), t = y + tl;
  const f = Math.min(N, Math.max(0, (t - T0) / STEP)), i = Math.min(N - 1, Math.floor(f));
  const c = SMOOTH[i] + (SMOOTH[i + 1] - SMOOTH[i]) * (f - i);
  return y + (tAtCum(c) - t) * amt;
}

// The castle's crag: its face between its foot (u 0) and the ward's edge on top (u 1), the beds' cliffs and ledges
// between, at whatever lean takes it up between the two.
export function cragFaceY(x, y0, y1, u) {
  const tl = tiltAt(x), c0 = cumAt(y0 + tl), c1 = cumAt(y1 + tl);
  return tAtCum(c0 + (c1 - c0) * Math.min(1, Math.max(0, u))) - tl;
}

// Where the talus heaps up under a gully, out over the foot: metres high, m metres out from the foot.
// (Steep, at about thirty degrees, a cone under each gully's mouth.)
export const fanOf = (lie, m) => 24 * lie.gully * Math.pow(Math.max(0, 1 - Math.max(0, m) / 44), 1.3);
