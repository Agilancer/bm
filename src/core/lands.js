// The land beyond Bellmourn: the countries, the places in them, the roads between, and what they do to the ground. Shared by
// every thread, like src/core/terrain.js, which calls landHeight() out past the town's own hills.
//
// Laid out after the first Bellmourn's world (Agilancer/Bellmourn, src/fps/land.js, region.js, mountain.js, keep.js), with the
// same countries in the same directions, but much further apart: the old keep stood 240 m from the well, this one 5 km.
// +x is east, +z is south (the church is east of town, the start is on the road south of it).
//
// The two letters (README, "The two sides"): Velscour's places (the keep, the Vigil Road's gibbets, the Black Obelisks) are all
// west and north-west, out past the Ashen Waste. Tessariel's (the Bell Tower, the Abbey of Saint Ossery, the Frozen Shrine) are
// east and south. No site of one is within 1.5 km of a site of the other: tools/lands/check.mjs holds it.

import { fbm, hash2, sstep } from './terrain-noise.js';
import { OUTPOSTS } from './wilds-data.js';

export const WORLD_EDGE = 5600;

// The countries. c: where each one is thickest (warped nearest-centre, as land.js did it). hills: how much of the far hills it
// keeps. trees: how thick the pines stand, and code: their tint (0 green, 1 rust, 2 snow-dusted, 3 dead). ground: the shader's tint
// (see TERRAIN in src/gfx/materials.js), [r, g, b] multiplied in, and wet, dry and snow amounts.
export const COUNTRIES = {
  darkwood: { name: 'The Darkwood', c: [[0, 0], [-700, 500], [600, 600]], hills: 1, trees: 1, code: 0, tint: [1, 1, 1], wet: 0, dry: 0, snow: 0 },
  downs: { name: 'The Green Downs', c: [[2100, -100], [1700, 400]], hills: 0.22, trees: 0.12, code: 0, tint: [1.08, 1.12, 0.9], wet: 0, dry: 0, snow: 0 },
  fen: { name: 'The Weeping Fen', c: [[0, -3400], [-900, -4300], [900, -2600]], hills: 0.04, trees: 0.25, code: 3, tint: [0.78, 0.86, 0.7], wet: 0.85, dry: 0, snow: 0 },
  rustwood: { name: 'The Rustwood', c: [[3900, -2900], [4700, -1300], [2900, -4300]], hills: 0.55, trees: 0.9, code: 1, tint: [1.22, 0.88, 0.66], wet: 0, dry: 0.25, snow: 0 },
  ashen: { name: 'The Ashen Waste', c: [[-3800, -700], [-5000, 200], [-4700, -2600], [-3300, -1500]], hills: 0.4, trees: 0.06, code: 3, tint: [0.92, 0.88, 0.82], wet: 0, dry: 1, snow: 0 },
  barrow: { name: 'The Barrow Moor', c: [[-3000, 3200], [-1900, 4400], [-1800, 2200]], hills: 0.35, trees: 0.12, code: 3, tint: [1.02, 0.86, 0.92], wet: 0.2, dry: 0.3, snow: 0 },
  rimeholt: { name: 'The Rimeholt Fells', c: [[600, 3900], [-700, 3300], [1500, 4700]], hills: 1.15, trees: 0.35, code: 2, tint: [1, 1, 1], wet: 0, dry: 0, snow: 0.8 },
  gallows: { name: 'The Gallowswood', c: [[4100, 3200], [4800, 1600], [3100, 4500]], hills: 0.5, trees: 0.7, code: 3, tint: [0.84, 0.82, 0.78], wet: 0.1, dry: 0.4, snow: 0 },
  deepwood: { name: 'The Deepwood', c: [[-1300, -1500], [-1700, -600]], hills: 0.75, trees: 1.25, code: 0, tint: [0.82, 0.9, 0.82], wet: 0.2, dry: 0, snow: 0 },
};
export const COUNTRY_KEYS = Object.keys(COUNTRIES);
const LIST = COUNTRY_KEYS.map((k) => COUNTRIES[k]);

// The Sorrowhorn, north-west: a cone of ridges with a broken crown. Its top is not a peak but a caldera, a ring of black teeth
// round a frozen lake, the Rimeglass, with the Crown of Teeth standing in it.
export const MOUNT = { x: -2600, z: -3000, R: 1750, peak: 980, crown: 170, lake: 70, name: 'The Sorrowhorn' };

// The Green Downs' cliff: the land steps up 30 m east of this line, and Brightwater comes over it.
export const CLIFF = { x: 2640, z0: -900, z1: 700, top: 30 };
export const POOL = { x: 2612, z: -120, r: 30 };
export const KNOLL = { x: 2440, z: -540, r: 80, h: 22 };
// The barrows' mounds: [x, z, radius, height, which way the door faces] (their doors: src/core/sites.js).
export const BARROWS = [[-2900, 3400, 26, 7, 0.4], [-2840, 3480, 14, 4, 1.4], [-2980, 3330, 18, 5, -2.2], [-2810, 3330, 11, 3, -0.6], [-3010, 3470, 12, 3.5, 2.6]];

// Named places: [x, z, radius, name], and what's done to the ground there (pad: levelled to its own middle's height).
// keep: Velscour's; light: Tessariel's (the two-letter rule); portal: has a seal; music/amb: what's heard (src/audio-lands.js).
export const SITES = {
  // The Green Downs
  farm: { x: 1720, z: 160, r: 60, name: 'Millhaven Farm', pad: 14, portal: true },
  mill: { x: 1840, z: 360, r: 30, name: 'The Millhaven Windmill', pad: 8 },
  hamlet: { x: 2040, z: 0, r: 90, name: 'Millhaven', pad: 0, portal: true },
  falls: { x: POOL.x, z: POOL.z, r: 80, name: 'Brightwater Falls', portal: true },
  belltower: { x: KNOLL.x, z: KNOLL.z, r: 60, name: 'The Bell Tower of the Four Watches', pad: 12, light: true, portal: true },
  // The Weeping Fen
  sallow: { x: -250, z: -3400, r: 110, name: 'Sallowmere', portal: true },
  chapel: { x: -900, z: -4300, r: 45, name: 'The Drowned Chapel', pad: 14, light: true, portal: true },
  // The Rustwood
  abbey: { x: 3950, z: -2880, r: 80, name: 'The Abbey of Saint Ossery', pad: 34, light: true, portal: true },
  fungus: { x: 2900, z: -4300, r: 50, name: 'The Fungal Ring', pad: 20 },
  cutters: { x: 4700, z: -1300, r: 45, name: "The Woodcutters' Camp", pad: 18 },
  // The Ashen Waste
  khel: { x: -3700, z: -700, r: 80, name: 'The Caravanserai of Khel', pad: 34, portal: true },
  bones: { x: -4500, z: -2000, r: 70, name: 'The Bone Field', keep: true },
  obelisks: { x: -4700, z: -2600, r: 60, name: 'The Black Obelisks', pad: 22, keep: true },
  keep: { x: -5000, z: 200, r: 150, name: 'Blackvigil Keep', pad: 120, keep: true },
  // The Barrow Moor
  barrows: { x: -2900, z: 3400, r: 140, name: 'The Barrows' },
  stones: { x: -1900, z: 4400, r: 45, name: 'The Nine Maidens', pad: 18, portal: true },
  // The Rimeholt Fells
  frostwatch: { x: 700, z: 3900, r: 80, name: 'Frostwatch', pad: 30, portal: true },
  shrine: { x: -700, z: 3300, r: 40, name: 'The Frozen Shrine', pad: 12, light: true, portal: true },
  // The Gallowswood
  crossroads: { x: 4100, z: 3200, r: 60, name: "Hangman's Cross", pad: 20, portal: true },
  witch: { x: 4800, z: 1600, r: 40, name: "Mother Grawl's Hut", pad: 12 },
  grove: { x: 3100, z: 4500, r: 70, name: 'The Twisted Grove' },
  // The Deepwood
  hermit: { x: -1300, z: -1500, r: 40, name: "The Hermit's Hollow", pad: 14 },
  // The Sorrowhorn
  stair: { x: -1650, z: -1900, r: 40, name: 'The Broken Stair', pad: 16, portal: true },
  crown: { x: MOUNT.x, z: MOUNT.z, r: MOUNT.crown, name: 'The Crown of Teeth', portal: true },
  // The small towns: Thornwick on the Gallows Road, where the downs run out; Cinderford on the Vigil Road, the last free
  // hearths before the Ashen Waste (nobody's letter on either: they're plain folk's).
  thornwick: { x: 2400, z: 1800, r: 80, name: 'Thornwick', pad: 48, portal: true },
  cinderford: { x: -2100, z: -200, r: 80, name: 'Cinderford', pad: 46, portal: true },
  // And places to find on the way to somewhere else.
  deepsmouth: { x: 880, z: 3990, r: 45, name: 'The Howling Mouth', pad: 16 },
  cairnfield: { x: 1250, z: -420, r: 50, name: 'The Cairnfield' },
  causeway: { x: -420, z: -2700, r: 60, name: 'The Sunken Mile' },
  tor: { x: 1500, z: 4600, r: 50, name: "Ravens' Tor" },
  charmill: { x: -3150, z: -1000, r: 40, name: 'The Charred Mill', pad: 12 },
  // Three more beside the roads, plain folk's: a drovers' wayhouse on the Barrow Track, a burnt tollhouse on the Gallows Road,
  // and the quarry on the Abbey Road that the abbey's stone was cut from.
  wayhouse: { x: -1720, z: 2378, r: 35, name: 'The Moor Wayhouse', pad: 14 },
  oldtoll: { x: 3314, z: 2581, r: 35, name: 'The Old Toll', pad: 12 },
  quarry: { x: 2924, z: -1676, r: 45, name: 'Ossery Quarry', pad: 16 },
};
export const SITE_KEYS = Object.keys(SITES);

// The roads, as polylines (x, z) with a half-width. Drawn worn into the ground, kept clear of trees, and on the map.
export const ROUTES = [
  // East: on past the church and over the open land to the Downs, the farm, the hamlet and the falls; a spur up Bell Knoll.
  { name: 'the Hill Road', w: 3, pts: [[300, 10], [560, 40], [900, 30], [1250, 90], [1500, 130], [1720, 150], [1900, 60], [2040, 0], [2300, -60], [2480, -110]] },
  { name: 'the Knoll Path', w: 1.8, pts: [[2300, -60], [2360, -240], [2420, -420], [2440, -490], [2440, -521]] },
  { name: 'the Mill Lane', w: 1.6, pts: [[1720, 150], [1780, 260], [1840, 340]] },
  // West: the Vigil Road, out of the west gate, south of the hill, through the Ashen Waste to Velscour's keep.
  { name: 'the Vigil Road', w: 3.4, pts: [[-70, -2], [-300, -40], [-800, -120], [-1400, -60], [-2100, -200], [-2900, -420], [-3700, -650], [-4300, -300], [-4780, 120]] },
  // North-west: the Pilgrims' Road, off the Vigil Road, to the foot of the Sorrowhorn.
  { name: "the Pilgrims' Road", w: 2.6, pts: [[-800, -120], [-1050, -600], [-1300, -1100], [-1500, -1600], [-1650, -1880]] },
  // North: the Fen Way, off the town's north road, to Sallowmere.
  { name: 'the Fen Way', w: 2.2, pts: [[0, -60], [40, -700], [-60, -1500], [-100, -2300], [-200, -3000], [-250, -3280]] },
  // South: the Frost Road, on from the south road past the start, to Frostwatch's north gate.
  { name: 'the Frost Road', w: 2.4, pts: [[-20, 190], [80, 800], [200, 1600], [380, 2500], [560, 3300], [700, 3820], [712, 3872]] },
  // South-east: the Gallows Road, off the Hill Road, to Hangman's Cross.
  { name: 'the Gallows Road', w: 2.2, pts: [[900, 30], [1500, 900], [2400, 1800], [3300, 2600], [4040, 3150]] },
  // South-west: the Barrow Track, off the Frost Road, over the moor.
  { name: 'the Barrow Track', w: 1.8, pts: [[80, 800], [-700, 1500], [-1700, 2400], [-2600, 3200], [-2850, 3330]] },
  // North-east: the Abbey Road, off the Hill Road, up through the Rustwood.
  { name: 'the Abbey Road', w: 2.2, pts: [[1500, 130], [2000, -700], [2900, -1700], [3600, -2400], [3900, -2800]] },
  // Out of Frostwatch's gate and round the fell to the Howling Mouth.
  { name: 'the Deeps Path', w: 1.6, pts: [[700, 3930], [760, 3962], [820, 3982], [866, 3990]] },
  // And on from it over the fell to Ravens' Tor.
  { name: 'the Tor Path', w: 1.4, pts: [[820, 3982], [1000, 4150], [1250, 4420], [1470, 4585]] },
  // Off the Fen Way along what's left of the old causeway; off the Hill Road up to the Cairnfield; off the Vigil Road to the mill.
  { name: 'the Sunken Mile', w: 1.6, pts: [[-150, -2640], [-260, -2690], [-378, -2700]] },
  { name: 'the Cairn Path', w: 1.4, pts: [[1250, 90], [1210, -150], [1240, -372]] },
  { name: 'the Mill Track', w: 1.6, pts: [[-3020, -453], [-3100, -700], [-3135, -962]] },
];
// And the trails off them to the outposts out in the land (src/core/wilds.js; laid by tools/wilds/place.mjs): narrow, worn
// ways like any other, so nothing grows on them, the map draws them and the trail to a place follows them.
for (const o of OUTPOSTS) if (o.trail) ROUTES.push({ name: `the trail to ${o.name}`, w: 1.2, pts: o.trail, trail: true });
for (const r of ROUTES) {
  r.x0 = Math.min(...r.pts.map((p) => p[0])) - r.w - 40; r.x1 = Math.max(...r.pts.map((p) => p[0])) + r.w + 40;
  r.z0 = Math.min(...r.pts.map((p) => p[1])) - r.w - 40; r.z1 = Math.max(...r.pts.map((p) => p[1])) + r.w + 40;
}

// Open water: its surface's height is worked out from the land as it lies (WATERS[i].y, filled below). Frozen: walk on it.
export const WATERS = [
  { key: 'pool', x: POOL.x, z: POOL.z, r: POOL.r, depth: 1.3 },
  { key: 'sallow', x: -250, z: -3400, r: 95, depth: 1.1 },
  { key: 'fenpool1', x: 300, z: -3000, r: 40, depth: 0.9 },
  { key: 'fenpool2', x: -550, z: -3900, r: 55, depth: 0.9 },
  { key: 'rimeglass', x: MOUNT.x, z: MOUNT.z, r: MOUNT.lake, depth: 0, frozen: true },
];

function segD2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  const ex = ax + dx * t - px, ez = az + dz * t - pz;
  return ex * ex + ez * ez;
}

// How far (x, z) is from the nearest road's middle, and which (null when none is within 60 m).
// (There are a couple of hundred of them with the trails, and every pine and every corner of the ground asks: each stretch
// is sorted into the 128 m squares it comes within 60 m of.)
const RCELL = 128, RGRID = new Map();
const rkey = (i, j) => (i + 512) * 1024 + (j + 512);
for (const r of ROUTES) for (let i = 0; i + 1 < r.pts.length; i++) {
  const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], m = r.w + 61;
  for (let ci = Math.floor((Math.min(ax, bx) - m) / RCELL); ci <= Math.floor((Math.max(ax, bx) + m) / RCELL); ci++) {
    for (let cj = Math.floor((Math.min(az, bz) - m) / RCELL); cj <= Math.floor((Math.max(az, bz) + m) / RCELL); cj++) {
      const k = rkey(ci, cj);
      if (!RGRID.has(k)) RGRID.set(k, []);
      RGRID.get(k).push(r, ax, az, bx, bz);
    }
  }
}
const RD = { d: 0, road: null };
export function routeDist(x, z) {
  let best = 1e18, which = null;
  const list = RGRID.get(rkey(Math.floor(x / RCELL), Math.floor(z / RCELL)));
  if (list) for (let i = 0; i < list.length; i += 5) {
    const d = segD2(x, z, list[i + 1], list[i + 2], list[i + 3], list[i + 4]);
    if (d < best) { best = d; which = list[i]; }
  }
  // (Past 60 m nobody's asked which: as before, when a road's box was the test.)
  if (best > 3721) which = null;
  return { d: Math.sqrt(best), road: which };
}

// The weight of each country at (x, z), into out (an array as long as COUNTRY_KEYS).
const W = new Float32Array(LIST.length);
const CENTRES = LIST.map((c) => Float64Array.from(c.c.flat()));   // (each country's centres, laid flat: this is worked out for every texel of the far land)
export function countryWeights(x, z, out = W) {
  const wx = x + (fbm(x * 0.0011, z * 0.0011, 3) - 0.5) * 900, wz = z + (fbm(x * 0.0011 + 17, z * 0.0011 + 9, 3) - 0.5) * 900;
  let dmin = 1e18;
  for (let i = 0; i < LIST.length; i++) {
    let d = 1e18;
    const c = CENTRES[i];
    for (let k = 0; k < c.length; k += 2) d = Math.min(d, Math.hypot(wx - c[k], wz - c[k + 1]));
    out[i] = d; dmin = Math.min(dmin, d);
  }
  let tot = 0;
  for (let i = 0; i < LIST.length; i++) { out[i] = Math.exp(-(out[i] - dmin) / 160); tot += out[i]; }
  for (let i = 0; i < LIST.length; i++) out[i] /= tot;
  return out;
}

// The country (x, z) is most in.
export function countryAt(x, z) {
  const w = countryWeights(x, z);
  let best = 0;
  for (let i = 1; i < w.length; i++) if (w[i] > w[best]) best = i;
  return COUNTRY_KEYS[best];
}

// The place (x, z) is in, or null.
export function siteAt(x, z, pad = 0) {
  for (const k of SITE_KEYS) { const s = SITES[k]; if ((x - s.x) ** 2 + (z - s.z) ** 2 < (s.r + pad) ** 2) return k; }
  return null;
}

// ---------------------------------------------------------------- the ground

// The mountain alone: a cone of ridges, its crown broken into a caldera ringed with teeth.
export function mountainHeight(x, z) {
  const dx = x - MOUNT.x, dz = z - MOUNT.z, d = Math.hypot(dx, dz);
  if (d > MOUNT.R) return 0;
  const t = 1 - d / MOUNT.R;
  const ridge = 1 - Math.abs(fbm(x * 0.004 + 3, z * 0.004 - 7, 4) * 2 - 1);
  let h = MOUNT.peak * Math.pow(t, 1.55) * (0.82 + 0.3 * ridge * ridge) + t * t * 60 * (fbm(x * 0.02, z * 0.02, 3) - 0.5);
  // The crown: the rim stands a little proud, then falls inward to the lake shelf; teeth stand up round the rim.
  const rim = MOUNT.crown, inner = rim - 55;
  if (d < rim + 60) {
    const ang = Math.atan2(dz, dx);
    const teeth = Math.pow(Math.max(0, Math.sin(ang * 23 + fbm(ang * 3, 1, 2) * 6)), 6) * 60 * (1 - sstep(rim - 10, rim + 40, d)) * sstep(inner, rim - 5, d);
    const shelf = MOUNT.peak - 120;
    const bowl = 1 - sstep(inner - 20, rim, d);
    h = h + (shelf - h) * bowl + teeth;
    if (d < MOUNT.lake + 30) h += (shelf - h) * (1 - sstep(MOUNT.lake - 4, MOUNT.lake + 30, d));
  }
  return h * sstep(0, 0.08, t);
}

// Bend the town's land (level: wild() in src/core/terrain.js) into the countries. Leaves the first 1.2 km round the town alone.
const PADS = {};
export function landHeight(x, z, level, raw = false) {
  const r = Math.hypot(x, z);
  if (r < 1150) return level;
  const out = sstep(1150, 1700, r);
  const w = countryWeights(x, z);
  let hills = 0, wet = 0, dry = 0;
  for (let i = 0; i < LIST.length; i++) { hills += w[i] * LIST[i].hills; wet += w[i] * LIST[i].wet; dry += w[i] * LIST[i].dry; }
  const roll = (fbm(x * 0.012 + 7, z * 0.012 + 1, 4) - 0.42) * 26;
  const big = Math.pow(fbm(x * 0.0026 - 5, z * 0.0026 + 9, 5), 1.6) * 330;
  // Dunes in the dry country, hummocks in the wet.
  const dunes = dry * Math.pow(Math.abs(Math.sin(x * 0.011 + fbm(x * 0.004, z * 0.004, 2) * 9)), 2) * 14;
  let h = big * hills + roll * (1 - wet * 0.85) + dunes + wet * (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 2;
  h = level + (h - level) * out;
  // The Sorrowhorn, over whatever's there.
  const m = mountainHeight(x, z);
  if (m > 0) h = Math.max(h, m + h * 0.15);
  // The Downs' cliff, with the falls' notch, and Bell Knoll.
  if (x > CLIFF.x - 30 && z > CLIFF.z0 - 200 && z < CLIFF.z1 + 200) {
    const e = sstep(CLIFF.x - 6, CLIFF.x + 6, x + (fbm(z * 0.03, 3, 2) - 0.5) * 18) * (1 - sstep(CLIFF.z1, CLIFF.z1 + 200, z)) * (1 - sstep(CLIFF.z0, CLIFF.z0 - 200, z));
    h += CLIFF.top * e;
  }
  const kd = Math.hypot(x - KNOLL.x, z - KNOLL.z);
  if (kd < KNOLL.r) h += KNOLL.h * Math.pow(1 - kd / KNOLL.r, 1.4) * (1 - 0.3 * sstep(0, 0.4, 1 - kd / KNOLL.r));
  if (Math.abs(x - BARROWS[0][0]) < 200 && Math.abs(z - BARROWS[0][1]) < 200) {
    for (const [bx, bz, br, bh] of BARROWS) { const q = 1 - ((x - bx) ** 2 + (z - bz) ** 2) / (br * br); if (q > 0) h += bh * Math.pow(q, 0.7); }
  }
  if (raw) return h;
  // Roads: smoothed, so they don't climb every hummock (blended toward the land's own lie a little way off).
  const rd = routeDist(x, z);
  if (rd.road && rd.d < rd.road.w + 14) {
    const s = 6, avg = (h + baseNear(x + s, z) + baseNear(x - s, z) + baseNear(x, z + s) + baseNear(x, z - s)) / 5;
    h += (avg - h) * (1 - sstep(rd.road.w, rd.road.w + 14, rd.d));
  }
  // Places, levelled to their own middle.
  for (const k of SITE_KEYS) {
    const s = SITES[k];
    if (!s.pad) continue;
    const d = Math.hypot(x - s.x, z - s.z);
    if (d > s.pad + 30) continue;
    const y = PADS[k] ?? (PADS[k] = rawHeight(s.x, s.z));
    h += (y - h) * (1 - sstep(s.pad, s.pad + 30, d));
  }
  // Water: a bowl under each.
  for (const wt of WATERS) {
    if (wt.frozen) continue;
    const d = Math.hypot(x - wt.x, z - wt.z);
    if (d > wt.r + 40) continue;
    const y = waterLevel(wt);
    // The bed falls to its depth at the middle; the shore stands just proud of the water.
    const bed = y - wt.depth * (1 - sstep(0, wt.r, d)) - 0.25;
    if (d < wt.r) h = Math.min(h, bed);
    else h += (Math.max(y + 0.2, Math.min(h, y + 2)) - h) * (1 - sstep(wt.r, wt.r + 40, d));
  }
  return h;
}

// (The land before roads, places and water: what they're levelled to. src/core/terrain.js hands over its own land.)
let base = null;
export function setLandBase(f) { base = f; }
const baseNear = (x, z) => (base ? landHeight(x, z, base(x, z), true) : 0);
const rawHeight = baseNear;

export function waterLevel(wt) {
  if (wt.y === undefined) wt.y = rawHeight(wt.x, wt.z) + (wt.frozen ? 0.06 : -0.4);
  return wt.y;
}

// Where water stands over the land, its height, else null.
export function waterAt(x, z) {
  for (const wt of WATERS) {
    if (wt.frozen) continue;
    if ((x - wt.x) ** 2 + (z - wt.z) ** 2 < (wt.r + 6) ** 2) return waterLevel(wt);
  }
  return null;
}

// ---------------------------------------------------------------- what grows, and the ground's tint

// How thick the pines stand out here (times the near woods' own amount), and their tint code.
export function landTrees(x, z) {
  const r = Math.hypot(x, z);
  if (r < 1150) return 1;
  // Not on the roads, the places, the water, the cliff's face, or high on the mountain.
  // (Asked first: they're quick to tell, and where one holds there's no need to weigh the countries.)
  const rd = routeDist(x, z);
  if (rd.road && rd.d < rd.road.w + 7) return 0;
  if (siteAt(x, z, 15)) return 0;
  for (const wt of WATERS) if ((x - wt.x) ** 2 + (z - wt.z) ** 2 < (wt.r + 10) ** 2) return 0;
  if (Math.abs(x - CLIFF.x) < 14 && z > CLIFF.z0 && z < CLIFF.z1) return 0;
  const w = countryWeights(x, z);
  let t = 0;
  for (let i = 0; i < LIST.length; i++) t += w[i] * LIST[i].trees;
  t = 1 + (t - 1) * sstep(1150, 1700, r);
  const md = Math.hypot(x - MOUNT.x, z - MOUNT.z);
  if (md < MOUNT.R) t *= sstep(0.42, 0.62, md / MOUNT.R);
  return t;
}

export function treeCode(x, z) {
  if (Math.hypot(x, z) < 1300) return 0;
  const md = Math.hypot(x - MOUNT.x, z - MOUNT.z);
  if (md < MOUNT.R * 0.75) return 2;
  const k = countryAt(x, z);
  const c = COUNTRIES[k].code;
  // (Dead wood only in stands; most of a dead country's trees are still green, just grim.)
  if (c === 3) return hash2(Math.floor(x / 37), Math.floor(z / 41)) < 0.55 ? 3 : 0;
  return c;
}

// The ground's snow (0-1) and bare rock (0-1) here: the far map's blue and alpha.
export function groundCover(x, z, h, slope) {
  const md = Math.hypot(x - MOUNT.x, z - MOUNT.z);
  let snow = 0, rock = 0;
  if (Math.hypot(x, z) > 1150) {
    const w = countryWeights(x, z);
    for (let i = 0; i < LIST.length; i++) snow += w[i] * LIST[i].snow;
    snow *= sstep(1150, 1700, Math.hypot(x, z));
  }
  // The mountain whitens from 520 m up, and its crown is all ice and black stone.
  snow = Math.max(snow, sstep(480, 640, h + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 80));
  rock = Math.max(sstep(0.55, 0.9, slope), md < MOUNT.R ? sstep(0.6, 0.85, 1 - md / MOUNT.R) * 0.6 : 0);
  if (md < MOUNT.crown + 50) rock = Math.max(rock, sstep(MOUNT.lake + 20, MOUNT.crown - 20, md));
  if (Math.abs(x - CLIFF.x) < 12 && z > CLIFF.z0 && z < CLIFF.z1) rock = 1;
  return [Math.min(1, snow), Math.min(1, rock)];
}

// The countries as the ground shader takes them: centres (x, z, index), and per country a tint and wet/dry.
export function shaderCountries() {
  const centres = [], looks = [];
  LIST.forEach((c, i) => { for (const [x, z] of c.c) centres.push(x, z, i, 0); looks.push(...c.tint, 0, c.wet, c.dry, c.snow, 0); });
  return { centres: new Float32Array(centres), looks: new Float32Array(looks), n: centres.length / 4 };
}
