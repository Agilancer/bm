// The Outwall: City State Phobos's land outside its wall, the basin's floor between the moat and the cliffs (docs/PHOBOS-OUTSKIRTS.md).
// It was the moat plain, one level field of grit round the whole city with nothing on it and nothing to get down to off the
// causeway. Now it's the ground the city throws its work and its dead out onto:
//
//   north of the causeway, under the wall's long north-west side:
//     the Pauper Mounds   where those who died outside the gate are put, in long low mounds
//     the Old Delf        the quarry the wall came out of, stepped down into the plain against the cliff's foot
//     Ashfold             the ash-carters' and quarrymen's huddle, the hub there (src/folk/regions/outwall.js)
//     the Pyre Ground     a stone burning floor before the Charnel Gate, where the Bone Yards' dead come out to be burnt
//     the Middens         round the gate, under the north-east wall: what the city tips over its back
//   south of it, under the south-west side:
//     the Strip Fields    ridge-and-furrow in hedge-banked strips, east of the Gibbet Field
//     the Sump            the reed-mire the leat drains into
//     the Leat            the Slough's water let out under the Tanners' Water Gate, run west along the bay
//     the Tan Pits        the tanners' vats beside the leat, the stink kept outside the wall
//     Tanners' Hithe      the tanners' hamlet, the hub there
//     the Limekilns       under the south-east wall: kilns in a bank, burning lime for the city's mortar and its pits
//
// And the ways: the Ditch Road, north and south from the causeway's foot round the moat's outer bank and past the gates' fronts
// (a shelf left between the ditch and the cliffs there), and footpaths and steps off the causeway down to the plain and to each
// place. Shared by every thread: nothing but numbers and the noise is imported here (src/core/east.js takes the ground's
// shape from it, src/core/lands.js the ways; what's built is src/core/outskirts-build.js).
// +x is east, +z is south. No piece of it makes a cross or a T, and nothing of Tessariel's is out here.

import { fbm, hash2, sstep } from './terrain-noise.js';

// Where each place is: x, z, and how far its ground reaches (r). yaw: the way its long side runs (a turn about y).
export const OUT = {
  mounds: { x: 9195, z: -395, r: 60, yaw: 0.72, name: 'the Pauper Mounds' },
  delf: { x: 9350, z: -770, r: 75, yaw: 0.62, name: 'the Old Delf' },
  ashfold: { x: 9555, z: -880, r: 30, yaw: -2.6, name: 'Ashfold' },
  pyre: { x: 9712, z: -858, r: 34, yaw: 0.28, name: 'the Pyre Ground' },
  middens: { x: 10330, z: -1045, r: 85, yaw: -0.2, name: 'the Middens' },
  fields: { x: 9300, z: 470, r: 120, yaw: 0.9, name: 'the Strip Fields' },
  sump: { x: 9425, z: 735, r: 52, yaw: 0, name: 'the Sump' },
  tanpits: { x: 9668, z: 868, r: 30, yaw: -0.12, name: 'the Tan Pits' },
  hithe: { x: 9560, z: 858, r: 30, yaw: 2.9, name: "Tanners' Hithe" },
  kilns: { x: 10430, z: 1085, r: 70, yaw: 0.35, name: 'the Limekilns' },
  // (Round 1's critics: the whole east half was one road and two lairs. Where each arm of the Ditch Road ends, now somewhere.)
  lazar: { x: 10665, z: -718, r: 34, yaw: Math.PI, name: 'the Lazar House' },
  knackers: { x: 10670, z: 790, r: 34, yaw: 0, name: "the Knackers' Yard" },
};
export const OUT_KEYS = Object.keys(OUT);

// The Leat: from under the Tanners' Water Gate's causeway, west along the bay below the Tan Pits, into the Sump. [x, z]
export const LEAT = [[9950, 880], [9902, 893], [9840, 900], [9776, 897], [9716, 893], [9660, 900], [9610, 893], [9560, 870], [9512, 830], [9470, 785], [9440, 752]];
// The fields' strips: in the fields' own frame (u along a strip, v across), each [v0, v1, u0, u1]: long and narrow, a cart's turn
// at the ends (the headland), and no two the same length.
export const STRIPS = [[-96, -66, -70, 58], [-60, -36, -84, 66], [-30, -2, -78, 52], [4, 30, -66, 70], [36, 62, -90, 44], [68, 92, -60, 54]];

// The local frame of a place: (x, z) as u along its yaw, v across.
export const frame = (p, x, z) => { const c = Math.cos(p.yaw), s = Math.sin(p.yaw), dx = x - p.x, dz = z - p.z; return [dx * c - dz * s, dx * s + dz * c]; };
export const unframe = (p, u, v) => { const c = Math.cos(p.yaw), s = Math.sin(p.yaw); return [p.x + u * c + v * s, p.z - u * s + v * c]; };
// How far inside a rounded rectangle (half sizes hu, hv, its corners rounded by rr) the point (u, v) is: less than 0 outside.
const rrect = (u, v, hu, hv, rr) => { const qu = Math.abs(u) - hu + rr, qv = Math.abs(v) - hv + rr; return -(Math.hypot(Math.max(qu, 0), Math.max(qv, 0)) + Math.min(Math.max(qu, qv), 0) - rr); };
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return [Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z), t]; };
// How far (x, z) is from the Leat's line, and how far along it (0 at the gate, 1 at the Sump).
let LEAT_LEN = null;
export function leatAt(x, z) {
  if (!LEAT_LEN) { LEAT_LEN = [0]; for (let i = 0; i + 1 < LEAT.length; i++) LEAT_LEN.push(LEAT_LEN[i] + Math.hypot(LEAT[i + 1][0] - LEAT[i][0], LEAT[i + 1][1] - LEAT[i][1])); }
  let best = 1e9, s = 0;
  for (let i = 0; i + 1 < LEAT.length; i++) { const [d, t] = segD(x, z, LEAT[i], LEAT[i + 1]); if (d < best) { best = d; s = (LEAT_LEN[i] + (LEAT_LEN[i + 1] - LEAT_LEN[i]) * t) / LEAT_LEN.at(-1); } }
  return [best, s];
}

// The Old Delf: a pit stepped down in three benches, a ramp down its south-east side from the rim to its floor. Its depth at
// (x, z), metres under the plain (0 outside it).
export const DELF = { hu: 50, hv: 32, bench: 3.4, step: 8 };
export function delfDepth(x, z) {
  const p = OUT.delf, [u, v] = frame(p, x, z);
  if (Math.abs(u) > DELF.hu + 40 || Math.abs(v) > DELF.hv + 20) return 0;
  // (Its rim wanders a little, and its benches with it: cut by hand, not drawn with a rule.)
  const d = rrect(u, v, DELF.hu, DELF.hv, 14) + (fbm(x * 0.06, z * 0.06, 2) - 0.5) * 5;
  let dep = 0;
  for (let k = 1; k <= 3; k++) dep += DELF.bench * sstep(DELF.step * (k - 1), DELF.step * (k - 1) + 2.2, d);
  // (The ramp: a cart's width along the south-east side, from the rim at the west end down to the floor two thirds along.)
  const lane = 1 - sstep(2.6, 5, Math.abs(v - (DELF.hv - 7))), down = 3 * DELF.bench * Math.max(0, Math.min(1, (u + DELF.hu + 8) / (DELF.hu * 1.55)));
  if (lane > 0 && u > -DELF.hu - 14 && u < DELF.hu * 0.6) dep += (down - dep) * lane * sstep(-DELF.hu - 14, -DELF.hu - 6, u);
  return Math.max(0, dep);
}
// The spoil the Delf came out as: heaps beside it, west and north. [u, v, height, radius] in the Delf's frame.
const SPOIL = [[-62, -50, 7.5, 30], [-20, -66, 5.5, 22], [30, -60, 6.5, 26]];
// The Middens' heaps: what's tipped, in no order. [x, z, height, radius]
export const HEAPS = Array.from({ length: 14 }, (_, i) => {
  const a = hash2(i, 801) * Math.PI * 2, r = Math.sqrt(hash2(i, 803)) * 72;
  return [OUT.middens.x + Math.cos(a) * r * 1.3, OUT.middens.z + Math.sin(a) * r * 0.75, 4 + hash2(i, 805) * 6, 12 + hash2(i, 807) * 14];
});
// The Pauper Mounds: three rows, the last not full of long low mounds. [u, v] of each in the place's frame (each 13 by 4.5, 1.1 high).
export const MOUNDS = [[-36, -10], [-18, -11], [0, -9], [18, -10], [36, -11], [-27, 9], [-9, 10], [9, 9], [27, 10], [-44, 26], [-26, 27], [-8, 26], [10, 27]];
// The Limekilns' bank: a ridge of spoil and chalk against the cliff, its face to the city, the kilns' mouths in it.
export const KILN_BANK = { hu: 42, hv: 9, h: 7.5 };

// The basin floor's shape outside the moat: how much higher (or lower) than the moat plain, at (x, z). cw: how far out from
// the wall's middle (src/core/east.js cityIn: 1 on the wall; the moat's outer bank 1.085). PLAIN-relative, metres.
export function outskirtsLift(x, z, cw) {
  if (cw < 1.088) return 0;
  const out = sstep(1.088, 1.13, cw);
  // Swells: the plain's lie, a few metres over a few hundred, and rising a little toward the cliffs, so the water runs to the
  // moat. (It was one level within a metre and a half everywhere: "flat garbage".)
  let y = ((fbm(x * 0.0045 + 11, z * 0.0045 - 4, 3) - 0.5) * 8 + (fbm(x * 0.017, z * 0.017 + 9, 2) - 0.5) * 2.2 + Math.min(5, (cw - 1.09) * 9)) * out;
  // The Old Delf, and its spoil.
  {
    const p = OUT.delf, [u, v] = frame(p, x, z);
    if (Math.abs(u) < 140 && Math.abs(v) < 120) {
      let heap = 0;
      for (const [hu, hv, h, r] of SPOIL) { const d = Math.hypot(u - hu, v - hv) + (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 9; if (d < r) heap = Math.max(heap, h * Math.pow(1 - d / r, 1.3) * (0.85 + 0.15 * Math.cos(d * 0.4))); }
      // (Cut down from the plain as it lay: at the rim the ground's own, below it the benches' level.)
      const pit = delfDepth(x, z);
      y = (y + heap) * (1 - sstep(0, 1.5, pit)) - pit;
    }
  }
  // The Pauper Mounds: long, low, rounded, a hand's breadth of settling down each.
  {
    const p = OUT.mounds, [u, v] = frame(p, x, z);
    if (Math.abs(u) < 60 && Math.abs(v) < 26) {
      for (const [mu, mv] of MOUNDS) { const d = rrect(u - mu, v - mv, 6.5, 2.25, 2.2); if (d > -1.5) y += 1.7 * sstep(-1.5, 2.6, d) * (0.92 + 0.08 * Math.sin(u * 0.9 + mv)); }
    }
  }
  // The Pyre Ground: a burning floor raised a metre on rubble; the ash raked off it heaped round its edge.
  {
    const p = OUT.pyre, [u, v] = frame(p, x, z);
    if (Math.abs(u) < 50 && Math.abs(v) < 40) {
      const d = rrect(u, v, 17, 10, 2);
      y += (1.1 - y) * sstep(-2.5, 0.5, d);
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, hx = Math.cos(a) * 25, hz = Math.sin(a) * 17, r = 6 + (i % 2) * 3, q = Math.hypot(u - hx, v - hz); if (q < r) y += 1.6 * (1 - q / r) ** 1.4; }
    }
  }
  // The Middens: heap on heap.
  if (Math.abs(x - OUT.middens.x) < 130 && Math.abs(z - OUT.middens.z) < 110) {
    for (const [hx, hz, h, r] of HEAPS) { const q = Math.hypot(x - hx, z - hz) + (fbm(x * 0.07, z * 0.07, 2) - 0.5) * 6; if (q < r) y += h * Math.pow(1 - q / r, 1.2); }
  }
  // The Strip Fields: ridge and furrow down each strip, a bank between strips where the hedges stand.
  {
    const p = OUT.fields, [u, v] = frame(p, x, z);
    if (Math.abs(u) < 110 && Math.abs(v) < 110) {
      for (const [v0, v1, u0, u1] of STRIPS) {
        const inV = Math.min(v - v0, v1 - v), inU = Math.min(u - u0, u1 - u);
        if (inV > -4 && inU > -4) {
          const inside = Math.min(inV, inU);
          y += 0.68 * Math.cos((v - v0) / 7 * Math.PI * 2) * sstep(2, 5, inside) - 0.2 * sstep(1, 3, inside);   // (0.5 on 8 m: round 1 couldn't see it)
          y += 0.9 * (1 - sstep(0.5, 3.6, Math.abs(inside)));   // (the bank round it)
        }
      }
    }
  }
  // The Tan Pits' yard and the hubs' own, laid level where their sheds and vats stand. (Before the Leat:
  // it runs through the Hithe and below the pits, and a yard laid after it filled it in.)
  for (const k of ['tanpits', 'hithe', 'ashfold', 'lazar', 'knackers']) {
    const p = OUT[k], q = Math.hypot(x - p.x, z - p.z);
    if (q < p.r + 14) { const lv = k === 'tanpits' ? 0.6 : 1.2; y += (lv - y) * (1 - sstep(p.r - 6, p.r + 14, q)); }
  }
  // The Leat, cut a cart's width and as deep as a man is tall; and the Sump it ends in.
  if (x > 9380 && x < 9990 && z > 680 && z < 960) {
    const [d, s] = leatAt(x, z), w = 2.6 + 1.4 * s;
    if (d < w + 6) y -= (1.9 + 0.4 * s + Math.max(0, y) * 0.6) * (1 - sstep(w * 0.55, w + 6, d));
    const sd = Math.hypot((x - OUT.sump.x) * 0.9, z - OUT.sump.z) + (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 22;
    if (sd < OUT.sump.r + 20) y -= (y + 2.8) * (1 - sstep(OUT.sump.r * 0.55, OUT.sump.r + 20, sd));
  }
  // The Limekilns' bank, its face toward the city and its back running up into the talus.
  {
    const p = OUT.kilns, [u, v] = frame(p, x, z);
    if (Math.abs(u) < 80 && Math.abs(v) < 60) {
      const d = rrect(u, v - 8, KILN_BANK.hu, KILN_BANK.hv + 14, 10), face = sstep(-1, 6, d) * sstep(-30, 10, -(v - KILN_BANK.hv));
      y += (KILN_BANK.h + (fbm(x * 0.04, z * 0.04, 2) - 0.5) * 2) * face;
    }
  }
  return y;
}

// The talus heaped at the cliffs' feet, near each gate held low so there's a shelf to walk between the ditch and the rock
// (src/core/east.js basinWall): 1 far off, down to 0.3 at a gate's line.
export const gateShelf = (x) => 1 - 0.7 * (1 - sstep(60, 210, Math.min(Math.abs(x - 9900), Math.abs(x - 9950))));

// The ways (taken into src/core/lands.js ROUTES, laid by tools/roads/bed.mjs like any other): name, half-width, [x, z]s.
// The Ditch Road goes round the moat's outer bank both ways from the causeway's foot; the rest are footpaths, two of them
// down off the causeway's sides in steps. (Run through tools/roads/bed.mjs: a way too steep for its kind is stepped.)
export const OUT_ROUTES = [
  { name: 'the Ditch Road', w: 2.2, cls: 'lane', pts: [[9300, 0], [9282, -40], [9262, -110], [9248, -200], [9252, -300], [9285, -420], [9338, -540], [9402, -640], [9462, -720], [9520, -800], [9560, -852], [9620, -880], [9700, -888], [9790, -893], [9860, -893], [9935, -893], [10000, -895], [10080, -910], [10160, -935], [10250, -948], [10330, -955], [10420, -945], [10520, -912], [10600, -860], [10660, -770]] },
  { name: 'the Ditch Road', w: 2.2, cls: 'lane', pts: [[9300, 0], [9282, 40], [9262, 110], [9250, 200], [9256, 300], [9290, 420], [9340, 540], [9398, 640], [9466, 722], [9520, 790], [9560, 835], [9620, 845], [9700, 845], [9790, 870], [9870, 893], [9935, 893], [10000, 895], [10080, 912], [10170, 960], [10270, 1000], [10360, 1035], [10430, 1040], [10520, 1010], [10600, 950], [10660, 860]] },
  // Off the causeway's north side, down past the carrion's perches to the Ditch Road.
  { name: 'the Carrion Steps', w: 1.3, cls: 'path', pts: [[9206, 18], [9196, -10], [9178, -48], [9150, -92], [9112, -128], [9070, -150], [9100, -190], [9170, -210], [9248, -205]] },
  // Off its south side, down to the Gibbet Field and on to the fields.
  { name: 'the Gibbet Steps', w: 1.3, cls: 'path', pts: [[9122, 96], [9128, 130], [9138, 168], [9128, 215], [9135, 262], [9165, 292], [9205, 305], [9254, 302]] },
  // Into the Delf, down its ramp.
  { name: 'the Delf Way', w: 1.6, cls: 'path', pts: [[9300, -470], [9300, -560], [9294, -640], [9300, -700], [9313, -740]] },
  // Round the Pauper Mounds.
  { name: 'the Mound Path', w: 1.0, cls: 'path', pts: [[9257, -322], [9238, -345], [9229, -356]] },   // (to the mounds' edge: a way's bed flattens 15 m round it, and ending in their middle it had flattened two rows)
  // From Ashfold up onto the Pyre Ground.
  { name: 'the Pyre Path', w: 1.2, cls: 'path', pts: [[9620, -880], [9660, -870], [9690, -862]] },
  // Through the fields, along the headland.
  { name: 'the Headland', w: 1.1, cls: 'path', pts: [[9256, 302], [9230, 370], [9235, 450], [9278, 530], [9340, 540]] },
  // From the Hithe down along the Leat to the Sump's edge.
  { name: 'the Leat Path', w: 1.1, cls: 'path', pts: [[9560, 835], [9520, 815], [9488, 790], [9470, 760]] },
  // Up to the kilns' mouths.
  { name: 'the Kiln Track', w: 1.4, cls: 'path', pts: [[10430, 1040], [10420, 1065], [10410, 1072]] },
  // Out of the Delf east, from its rim to the Ditch Road: the masons' way to the city with the cut stone, and the way on to
  // Ashfold (without it auto-play crossed the plain from the Delf to Ashfold: 57% of its walking there was off any way).
  { name: "the Masons' Path", w: 1.2, cls: 'path', pts: [[9402, -760], [9440, -755], [9481, -746]] },
  // From where each arm of the Ditch Road ends, in at a gate: the Lazar House's in the north, the Knackers' Yard's in the south.
  { name: 'the Lazar Walk', w: 1.2, cls: 'path', pts: [[10660, -770], [10664, -746]] },
  { name: "the Knackers' Lane", w: 1.4, cls: 'path', pts: [[10660, 860], [10669, 816]] },
  // Through the yards, trodden: in from the road between the shanties to the reeve and the carter and out at the gate
  // (Ashfold); up from the road past the master's door to the plank bridge (the Hithe); down the Tan Pits' east side, between
  // the vats and the beam-house. (Round 2's critics: inside the places only 46% of the hero's walking was on a way.)
  { name: 'the Ash Yard', w: 1.1, cls: 'path', pts: [[9561, -854], [9560, -864], [9557, -872], [9550, -880], [9552, -888], [9544, -898]] },
  { name: 'the Hithe Landing', w: 1.1, cls: 'path', pts: [[9560, 836], [9561, 846], [9562, 853], [9562, 860]] },
  { name: 'the Pits Walk', w: 1.1, cls: 'path', pts: [[9672, 845], [9672, 856], [9670, 868]] },
];

// What the ground's made of, for the land's far map (src/sim/job.worker.js buildFarRows): every bit of the plain was the same
// grey grit. Each 0 to 1: dirt (trodden: the yards, the mounds' fresh earth, the fields' turned strips), ash (the Pyre Ground
// and the Middens, black), chalk (the Limekilns and the Delf's dust, white), wet (the Sump and the Leat's banks), green (the
// fields' stubble and the Sump's edge). Null outside the Outwall.
export function outskirtsGround(x, z) {
  if (x < 8990 || x > 10800 || Math.abs(z) > 1350) return null;
  const g = { dirt: 0, ash: 0, chalk: 0, wet: 0, green: 0 }, wob = (fbm(x * 0.05, z * 0.05, 2) - 0.5) * 10;
  const near = (p, r, fade) => 1 - sstep(r, r + fade, Math.hypot(x - p.x, z - p.z) + wob);
  for (const k of ['ashfold', 'hithe', 'tanpits', 'lazar', 'knackers']) g.dirt = Math.max(g.dirt, 0.85 * near(OUT[k], OUT[k].r - 4, 14));
  g.wet = Math.max(g.wet, 0.55 * near(OUT.knackers, 14, 16));   // (the knackers' yard's mire, where the pens drain)
  g.ash = Math.max(near(OUT.pyre, 24, 22), 0.45 * near(OUT.middens, 70, 40), 0.85 * near(OUT.ashfold, 30, 30));
  // (The Middens' heaps, each its own: wet brown-black rot round its foot where the rain runs off it, rotten brown-black over
  // it, on a floor of paler, trodden ash between, so a heap stands off the floor. Round 2's critics saw heap, floor and cliff
  // all one grey.)
  if (Math.abs(x - OUT.middens.x) < 140 && Math.abs(z - OUT.middens.z) < 120) for (const [hx, hz, , r] of HEAPS) {
    const q = Math.hypot(x - hx, z - hz) + wob * 0.4;
    if (q > r + 8) continue;
    const toe = sstep(r * 0.45, r * 0.8, q) * (1 - sstep(r, r + 8, q)), body = 1 - sstep(r * 0.6, r * 0.9, q);
    g.wet = Math.max(g.wet, 0.9 * toe); g.dirt = Math.max(g.dirt, 0.95 * toe, 0.9 * body); g.ash = Math.max(g.ash, 0.95 * body);
  }
  // (Sludge round the Tan Pits' vats, where they're baled out and slopped.)
  { const [u, v] = frame(OUT.tanpits, x, z); if (Math.abs(u + 7) < 12 && Math.abs(v + 4.6) < 9) g.wet = Math.max(g.wet, 0.75 * (1 - sstep(6, 9, Math.abs(v + 4.6))) * (1 - sstep(9, 12, Math.abs(u + 7)))); }
  // (Between the places, the basin's own ground: heath in patches, worn grass and bare, not one grey.)
  g.green = 0.5 * sstep(0.48, 0.66, fbm(x * 0.007 - 11, z * 0.007 + 5, 3));
  g.dirt = Math.max(g.dirt, 0.8 * near(OUT.pyre, 20, 12), 0.5 * near(OUT.middens, 60, 30));
  g.chalk = Math.max(g.chalk, near(OUT.kilns, 45, 30), 0.7 * near(OUT.delf, 55, 30), 0.95 * sstep(0.5, 2.5, delfDepth(x, z)));
  g.green *= 1 - 0.9 * Math.max(g.ash, g.chalk, g.dirt);
  {
    const sd = Math.hypot(x - OUT.sump.x, z - OUT.sump.z) + wob;
    g.wet = Math.max(g.wet, 1 - sstep(OUT.sump.r, OUT.sump.r + 35, sd));
    g.green = Math.max(g.green, 0.8 * (1 - sstep(OUT.sump.r + 10, OUT.sump.r + 60, sd)));
    if (x > 9380 && z > 680 && z < 960) g.wet = Math.max(g.wet, 1 - sstep(4, 16, leatAt(x, z)[0]));
  }
  {
    const [u, v] = frame(OUT.fields, x, z);
    STRIPS.forEach(([v0, v1, u0, u1], i) => {
      const inside = Math.min(v - v0, v1 - v, u - u0, u1 - u);
      if (inside > -3) {
        const w = sstep(-3, 3, inside); g.green = Math.max(g.green, w * (i % 2 ? 0.95 : 0.5)); if (i % 2 === 0) g.dirt = Math.max(g.dirt, w * 0.55);
        // (Every furrow bare and darker, every ridge green: the ridge-and-furrow read from the road.)
        const fur = sstep(-0.2, -0.75, Math.cos((v - v0) / 7 * Math.PI * 2)) * sstep(2, 5, inside);
        g.dirt = Math.max(g.dirt, fur * 0.8); g.wet = Math.max(g.wet, fur * 0.35);
      }
    });
  }
  {
    const [u, v] = frame(OUT.mounds, x, z);
    if (Math.abs(u) < 70 && Math.abs(v) < 30) {
      g.dirt = Math.max(g.dirt, 0.45 * (1 - sstep(45, 65, Math.abs(u))) * (1 - sstep(16, 28, Math.abs(v))));
      // (Each mound's own earth, turned and dark; the newest row darker and wetter still.)
      MOUNDS.forEach(([mu, mv], k) => { const d = rrect(u - mu, v - mv, 6.5, 2.25, 2.2); const w = 1 - sstep(-0.5, 1.5, -d); if (w > 0) { g.dirt = Math.max(g.dirt, w); g.wet = Math.max(g.wet, w * (k >= 9 ? 0.75 : 0.5)); } });
    }
  }
  return g;
}

// Where the dead pines stand on the Outwall (src/core/lands.js landTrees): a thicket round the Sump and down the Leat's banks,
// a few by the Pauper Mounds and along the fields' banks, a scatter under the cliffs. Nowhere in a place's yard. (The country
// grows none, so without these not one tree stood in the whole basin.)
export function outskirtsTrees(x, z) {
  if (x < 9000 || x > 10800 || Math.abs(z) > 1350) return 0;
  for (const k of OUT_KEYS) { const p = OUT[k]; if (k !== 'sump' && k !== 'fields' && Math.hypot(x - p.x, z - p.z) < p.r * (k === 'middens' ? 0.8 : 1.1)) return 0; }
  let t = 0.08 * sstep(0.5, 0.7, fbm(x * 0.012 + 3, z * 0.012 - 7, 2));
  const sd = Math.hypot(x - OUT.sump.x, z - OUT.sump.z);
  if (sd > OUT.sump.r * 0.75) t = Math.max(t, 0.5 * (1 - sstep(OUT.sump.r + 10, OUT.sump.r + 55, sd)));
  if (x > 9380 && z > 680 && z < 960) { const d = leatAt(x, z)[0]; if (d > 5) t = Math.max(t, 0.45 * (1 - sstep(8, 18, d))); }
  {
    const [u, v] = frame(OUT.mounds, x, z);
    if (Math.abs(u) < 90 && Math.abs(v) < 50 && Math.abs(v) > 22) t = Math.max(t, 0.25);
  }
  {
    const [u, v] = frame(OUT.fields, x, z);
    for (const [v0, , u0, u1] of STRIPS) if (Math.abs(v - (v0 - 3)) < 2.5 && u > u0 && u < u1) t = Math.max(t, 0.3);
  }
  return t;
}

// A place's yard, where no boulder may lie (src/core/rocks.js barred): the ten places, a little past their edges.
export function outskirtsYard(x, z) {
  if (x < 9100 || x > 10600 || Math.abs(z) > 1250) return false;
  for (const k of OUT_KEYS) { const p = OUT[k]; if ((x - p.x) ** 2 + (z - p.z) ** 2 < (p.r + 8) ** 2) return true; }
  return false;
}
