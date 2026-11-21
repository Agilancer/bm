// The way up Castle Velscour as far as it's carved out (src/core/phobos-build.js, src/core/east.js): a body walked, a
// stride at a time, up the ramp into the Middle Ward and up the four great stairs to the Keep's fourth step, never
// asked to climb more than a step; and under the Grand Patio the ground is still the ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { terrainHeight } from '../src/core/terrain.js';
import { KEEP, PLAIN, WARD_RAMP } from '../src/core/east.js';
import { SPIRES, STAIR_Z, STEPS, footing, phobosHouses, stairPlan, upstairs } from '../src/core/phobos-build.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
// Walk from a to b in strides of 0.3 m, the feet at y: the ground met at each stride, and the biggest step up asked.
function walk(a, b, y, worst) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.3));
  for (let k = 1; k <= n; k++) {
    const h = world.height(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, y);
    worst.up = Math.max(worst.up, h - y); y = h;
  }
  return y;
}

test('the ramp from the Lower Ward through the gate is a ramp', () => {
  let worst = 0;
  for (let i = 0; i + 1 < WARD_RAMP.length; i++) {
    const a = WARD_RAMP[i], b = WARD_RAMP[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0; t < L - 2; t += 2) {
      const h0 = terrainHeight(a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L), h1 = terrainHeight(a[0] + (b[0] - a[0]) * (t + 2) / L, a[1] + (b[1] - a[1]) * (t + 2) / L);
      worst = Math.max(worst, Math.abs(h1 - h0) / 2);
    }
  }
  assert.ok(worst < 0.36, `the ramp's steepest two metres rise ${worst.toFixed(2)} in one`);
  const top = WARD_RAMP.at(-1);
  assert.ok(Math.abs(terrainHeight(top[0], top[1]) - (PLAIN + top[2])) < 2.5, 'it comes out on the Middle Ward');
});

test('the four great stairs are climbed a step at a time, from the Middle Ward to the fourth step', () => {
  let y = null;
  STEPS.forEach(([hx, , , b], i) => {
    const face = KEEP.x + 40 - i * 8 - hx, zc = STAIR_Z[i], y0 = i === 0 ? terrainHeight(face - 8, zc) : PLAIN + STEPS[i - 1][3];
    const P = stairPlan(face, y0, PLAIN + b), mid = (P.lanes[0] + P.lanes[1]) / 2, worst = { up: 0 };
    // (From the step below's top, or the ward, to the stair's foot.)
    let at = [mid, zc + P.half + 2.6];
    y = world.height(at[0], at[1], y ?? y0);
    assert.ok(Math.abs(y - y0) < 1.6, `stair ${i}: its foot is at ${y.toFixed(1)}, not ${y0.toFixed(1)}`);
    for (let j = 0; j < P.flights; j++) {
      const up = j % 2 === 0 ? -1 : 1, lane = P.lanes[j % 2];
      y = walk(at, [lane, zc - up * (P.half + 1)], y, worst); at = [lane, zc - up * (P.half + 1)];           // onto the flight's lane
      y = walk(at, [lane, zc + up * (P.half + 1.5)], y, worst); at = [lane, zc + up * (P.half + 1.5)];       // up it, onto the landing
    }
    y = walk(at, [face + 6, at[1]], y, worst);                                                               // off the landing onto the step
    assert.ok(worst.up <= 0.71, `stair ${i}: a step of ${worst.up.toFixed(2)} m`);
    assert.ok(Math.abs(y - (PLAIN + b)) < 0.2, `stair ${i}: it comes out at ${y.toFixed(1)}, not ${PLAIN + b}`);
    y = walk([face + 6, at[1]], [face + 6, STAIR_Z[i + 1] ?? at[1]], y, worst);                             // along the terrace toward the next
  });
});

test("under the Grand Patio the Middle Ward's ground is still the ground, and nobody else is lifted onto a deck", () => {
  const x = KEEP.x - 184, g = terrainHeight(x, 10);
  assert.equal(world.height(x, 10, g), g);
  assert.equal(world.height(x, 10), g);
  assert.ok(Math.abs(world.height(x, 10, PLAIN + 300.2) - (PLAIN + 300)) < 0.01, 'and stood on it, the patio is the floor');
});

test('the wall-walk is reached by the stair beside the Drawbridge Gate, and walked along', () => {
  const face = 10050 - 700 + 6, zc = 70, y0 = terrainHeight(face + 8, zc);
  let top = -Infinity;
  for (let k = 0; k <= 40; k++) top = Math.max(top, terrainHeight(9350, 214 - 428 * k / 40));
  top += 50.06;
  const P = stairPlan(face, y0, top, 1), mid = (P.lanes[0] + P.lanes[1]) / 2, worst = { up: 0 };
  let at = [mid, zc + P.half + 2.6], y = world.height(at[0], at[1], y0);
  for (let j = 0; j < P.flights; j++) {
    const up = j % 2 === 0 ? -1 : 1, lane = P.lanes[j % 2];
    y = walk(at, [lane, zc - up * (P.half + 1)], y, worst); at = [lane, zc - up * (P.half + 1)];
    y = walk(at, [lane, zc + up * (P.half + 1.5)], y, worst); at = [lane, zc + up * (P.half + 1.5)];
  }
  y = walk(at, [9350, at[1]], y, worst);            // onto the wall's top
  y = walk([9350, at[1]], [9350, 60], y, worst);    // and along it
  assert.ok(worst.up <= 0.71, `a step of ${worst.up.toFixed(2)} m`);
  assert.ok(Math.abs(y - top) < 0.1, `the walk is at ${y.toFixed(1)}, not ${top.toFixed(1)}`);
});

// A body turned loose on a floor: from (x, z) at y it goes wherever the next floor up within a step is, feeling round it
// for a tread higher than the one it's on. How high it gets before nothing higher is in reach.
function climb(x, z, y, limit = 9000) {
  for (let n = 0; n < limit; n++) {
    let best = null;
    // (Up to a few strides off on the level: a gallery is walked along to where the next flight starts.)
    for (let k = 0; k < 160 && !(best && k % 16 === 0 && k >= 48); k++) {
      const a = k / 16 * Math.PI * 2, d = [0.5, 0.8, 1.1, 1.8, 2.6, 3.4, 5, 7, 9.5, 12][Math.floor(k / 16)], px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, h = world.height(px, pz, y);
      if (h > y + 0.05 && h <= y + 0.71 && (!best || h > best[2])) best = [px, pz, h];
    }
    if (!best) break;
    [x, z, y] = best;
  }
  return [x, z, y];
}

test("the trunk's winding stair is climbed from the Keep's top step to the crown's floor", () => {
  const y0 = PLAIN + STEPS[3][3], a = Math.PI + 0.9, r = 35.6;
  // (Stood at its first tread's foot, on the top step.)
  let [, , y] = climb(KEEP.x + Math.cos(a) * r, KEEP.z + Math.sin(a) * r, y0);
  assert.ok(Math.abs(y - (PLAIN + 580)) < 0.6, `the first stair gets to ${(y - PLAIN).toFixed(1)} m over the plain, not the gallery at 580`);
  // (Across the gallery to the foot of the stair round the last stage, which is nearer the middle.)
  let foot = null;
  for (let k = 0; k < 720 && !foot; k++) { const t = k / 720 * Math.PI * 2, px = KEEP.x + Math.cos(t) * 26.6, pz = KEEP.z + Math.sin(t) * 26.6; if (Math.abs(world.height(px, pz, y) - (y + 0.5)) < 0.01) foot = [px, pz]; }
  assert.ok(foot, 'the last stair has a first tread on the gallery');
  [, , y] = climb(foot[0], foot[1], y + 0.5);
  assert.ok(Math.abs(y - (PLAIN + 630)) < 0.6, `it gets to ${(y - PLAIN).toFixed(1)} m over the plain, not 630`);
});

test('every spire is climbed by its own stair to the gallery under its crown, and its bridge is walked to the next', () => {
  SPIRES.forEach(([key, sx, sz, r, foot, top], i) => {
    const RS = r + 5.4, on = STEPS.map(([hx, hz, , b], k) => ({ cx: KEEP.x + 40 - k * 8, hx, hz, b })).filter((q) => Math.abs(sx - q.cx) < q.hx + RS && Math.abs(sz - KEEP.z) < q.hz + RS).at(-1);
    const a = Math.atan2(KEEP.z - sz, on.cx - sx) - 0.2;
    const [, , y] = climb(sx + Math.cos(a) * RS, sz + Math.sin(a) * RS, PLAIN + on.b);
    assert.ok(Math.abs(y - (PLAIN + top - 20)) < 0.6, `${key}: its stair gets to ${(y - PLAIN).toFixed(1)}, not ${top - 20}`);
    // Its bridge: from its gallery to the next spire's first gallery (the last, to the trunk at 560), a tread at a time.
    const nx = SPIRES[i + 1], [bx, bz, br, by] = nx ? [nx[1], nx[2], nx[3], nx[4] + (nx[5] - nx[4]) * 0.34] : [KEEP.x, KEEP.z, 33, 560];
    const d = Math.hypot(bx - sx, bz - sz), ux = (bx - sx) / d, uz = (bz - sz) / d, worst = { up: 0 };
    const end = walk([sx + ux * (r + 1), sz + uz * (r + 1)], [bx - ux * (br + 1), bz - uz * (br + 1)], y, worst);
    assert.ok(worst.up <= 0.71, `${key}: its bridge asks a step of ${worst.up.toFixed(2)} m`);
    assert.ok(Math.abs(end - (PLAIN + by)) < 1.6, `${key}: its bridge lands at ${(end - PLAIN).toFixed(1)}, not ${by.toFixed(1)}`);
  });
});

test('the wall-walk goes on through a tower and up inside a corner drum to the next side', () => {
  // From the west side's walk (south of the gate) north through the gatehouse and on to the north-west corner, and up.
  let top5 = -Infinity, top6 = -Infinity;
  for (let k = 0; k <= 40; k++) { top5 = Math.max(top5, terrainHeight(9350, 214 - 428 * k / 40)); top6 = Math.max(top6, terrainHeight(9350 + 188 * k / 40, -214 - 372 * k / 40)); }
  top5 += 50.06; top6 += 50.06;
  const worst = { up: 0 };  // (heights only: walls aren't asked here)
  let y = walk([9350, 60], [9350, -200], top5, worst);
  assert.ok(Math.abs(y - top5) < 0.1 && worst.up < 0.1, 'through the gatehouse and its towers on the level');
  [, , y] = climb(9350, -206, y);
  assert.ok(Math.abs(y - top6) < 0.6, `up the corner drum to ${y.toFixed(1)}, the next side's ${top6.toFixed(1)}`);
});

test("a house is walked into off the street, and its stair climbed to the room upstairs; downstairs, you're on its floor", () => {
  const H = phobosHouses().filter((h) => h.roof);
  let n = 0;
  for (let k = 0; k < H.length && n < 40; k += 241) {
    const h = H[k], F = footing(h), up = upstairs(h, F);
    if (!up) continue;
    n++;
    const f = h.front, P = (lx, lz) => [h.x + lx * F.c + lz * F.s, h.z - lx * F.s + lz * F.c], sx = -up.ix + 0.475;
    const out = P(0, f * (h.hz + 1.4)), door = P(0, f * (up.iz - 0.3)), foot = P(sx, f * (up.iz - 0.25)), head = P(sx, f * (up.hole[0] - 0.4)), room = P(up.ix * 0.5, 0);
    const worst = { up: 0 };  // (heights only: walls aren't asked here)
    let y = walk(out, door, world.height(...out), worst);
    assert.ok(Math.abs(y - up.fy) < 0.01, `house ${k}: inside the door at ${y.toFixed(2)}, its floor's ${up.fy.toFixed(2)}`);
    // (Downstairs, under the upstairs floor, it's still the ground floor.)
    assert.ok(Math.abs(world.height(...room, y) - up.fy) < 0.01, `house ${k}: lifted downstairs`);
    worst.up = 0;
    y = walk(door, foot, y, worst); y = walk(foot, head, y, worst); y = walk(head, room, y, worst);
    assert.ok(Math.abs(y - up.uy) < 0.01, `house ${k}: came out at ${y.toFixed(2)}, upstairs is ${up.uy.toFixed(2)}`);
    assert.ok(worst.up < 0.62, `house ${k}: a step of ${worst.up.toFixed(2)} on the stair`);
    // (And up either side of the flight, not only its middle: its treads were once a hand-wide strip down the middle.)
    for (const dx of [-0.3, 0.3]) {
      const f0 = P(sx + dx, f * (up.iz - 0.25)), h0 = P(sx + dx, f * (up.hole[0] - 0.4));
      const w2 = { up: 0 }, y2 = walk(f0, h0, up.fy, w2);
      assert.ok(Math.abs(y2 - up.uy) < 0.35 && w2.up < 0.62, `house ${k}: up the stair ${dx > 0 ? 'room' : 'wall'} side came to ${y2.toFixed(2)} (upstairs ${up.uy.toFixed(2)}), a step of ${w2.up.toFixed(2)}`);
    }
  }
  assert.ok(n >= 30, `only ${n} houses tried`);
});
