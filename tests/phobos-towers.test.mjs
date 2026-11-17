// City State Phobos's doors and towers (src/core/phobos-build.js houseDoor, src/core/phobos-towers.js, src/items/phobos-doors.js):
// every house's door and every tower's opens and shuts, a shut one stops you and an open one doesn't, and every tower is
// gone into: in at its door, up its stair floor by floor to the chest on its top floor; the wall's, through from walk to walk.
//   node --test tests/phobos-towers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { buildSites, buildPhobosCell } from '../src/core/sites.js';
import { phobosHouses } from '../src/core/phobos-build.js';
import { cityDoors, cityTowers, towerChests, towerInner } from '../src/core/phobos-towers.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
// A body walked from a to b (x, z), its feet at y, in 5 cm strides, pushed out of what's in the way at each: where it ends.
function go(a, b, y) {
  const out = [a[0], y, a[1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05);
  for (let k = 0; k < n; k++) { out[0] += (b[0] - a[0]) / n; out[2] += (b[1] - a[1]) / n; world.resolve(out, 0.3, y); }
  return [out[0], out[2]];
}
// Up whatever's within a step of the feet from (x, z), till nothing higher is: how high it gets (tests/phobos-way.test.mjs).
function climb(x, z, y) {
  for (let n = 0; n < 4000; n++) {
    let best = null;
    for (let k = 0; k < 96 && !(best && k % 16 === 0 && k >= 48); k++) {
      const a = k / 16 * Math.PI * 2, d = [0.4, 0.7, 1, 1.5, 2.2, 3][Math.floor(k / 16)], px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, h = world.height(px, pz, y);
      if (h > y + 0.05 && h <= y + 0.71 && (!best || h > best[2])) best = [px, pz, h];
    }
    if (!best) break;
    [x, z, y] = best;
  }
  return y;
}
const frame = (d) => { const c = Math.cos(d.yaw), s = Math.sin(d.yaw); return (lx, lz) => [d.x + lx * c + lz * s, d.z - lx * s + lz * c]; };

test('every roofed house and every tower on its own ground has a door of its own, and a box in its doorway', () => {
  const houses = phobosHouses(), doors = cityDoors(), ids = new Set(doors.map((d) => d.id));
  assert.equal(ids.size, doors.length, 'no two doors share a number');
  for (const h of houses) if (h.roof && !h.spire) assert.ok(ids.has(h.door), 'a roofed house has a door');
  assert.ok(houses.length < 20000, "the towers' numbers come after every house's");
  const free = cityTowers().filter((t) => t.kind !== 'wall');
  assert.equal(doors.length, houses.filter((h) => h.roof && !h.spire).length + free.length);
  const boxes = new Map();
  for (const c of buildSites().colliders) if (c.phDoor !== undefined) boxes.set(c.phDoor, (boxes.get(c.phDoor) || 0) + 1);
  for (const d of doors) assert.equal(boxes.get(d.id), 1, `door ${d.id}: one box`);
});

test('a shut door stops you in its doorway, and opened it lets you through, both ways', () => {
  const doors = cityDoors(), sample = doors.filter((d, i) => d.id >= 20000 || i % 97 === 0), stuck = [];
  for (const d of sample) {
    const P = frame(d), out = P(0, d.f * (d.hz + 1.0)), inn = P(0, d.f * (d.iz - 1.0));
    world.setPhobosDoor(d.id, false);
    const shut = go(out, inn, d.fy);
    world.setPhobosDoor(d.id, true);
    const open = go(out, inn, d.fy), back = go(inn, out, d.fy);
    world.setPhobosDoor(d.id, false);
    if (Math.hypot(shut[0] - inn[0], shut[1] - inn[1]) < 1.2 || Math.hypot(open[0] - inn[0], open[1] - inn[1]) > 0.1 || Math.hypot(back[0] - out[0], back[1] - out[1]) > 0.1) stuck.push(d.id);
  }
  assert.ok(sample.length > 150, `${sample.length} doors tried`);
  assert.deepEqual(stuck, [], 'each shut stops, each open lets through');
});

test('every tower on its own ground is climbed from its door to the chest on its top floor', () => {
  const chests = new Map(towerChests().map((c) => [c.tower, c])), low = [];
  for (const t of cityTowers()) {
    if (t.kind === 'wall') continue;
    const c = chests.get(t.key);
    assert.ok(c, `${t.key}: a chest`);
    // (In at the door, a stride past the threshold.)
    const d = cityDoors().find((q) => q.id === t.door), P = frame(d), [x, z] = P(0, d.iz - 1.2);
    const y = climb(x, z, world.height(x, z, d.fy));
    if (Math.abs(y - c.y) > 0.3) low.push(`${t.key} ${(y - d.fy).toFixed(1)} of ${(c.y - d.fy).toFixed(1)}`);
  }
  assert.deepEqual(low, [], 'each stair goes to the top floor');
});

test("the wall's towers are walked through from the walk, and a corner's stair goes from the lower walk to the higher", () => {
  const bad = [];
  for (const t of cityTowers()) {
    if (t.kind !== 'wall') continue;
    const r = towerInner(t);
    for (const [a, wy] of t.ways) {
      // (From out on the walk, into the room, at its floor.)
      // (Just out of its doorway: two of the gates' towers stand against a corner's, so further out is in the corner's.)
      const out = [t.x + Math.cos(a) * (t.r + 0.6), t.z + Math.sin(a) * (t.r + 0.6)], inn = [t.x + Math.cos(a) * (r - 1.5), t.z + Math.sin(a) * (r - 1.5)];
      const y0 = world.height(out[0], out[1], wy), e = go(out, inn, y0);
      if (Math.abs(y0 - wy) > 0.1 || Math.hypot(e[0] - inn[0], e[1] - inn[1]) > 0.1) bad.push(`${t.key} at ${a.toFixed(2)}: walk ${y0.toFixed(1)}/${wy.toFixed(1)}, got ${Math.hypot(e[0] - inn[0], e[1] - inn[1]).toFixed(1)} short`);
    }
    if (t.spiral) {
      const lo = Math.min(...t.ways.map((w) => w[1])), hi = Math.max(...t.ways.map((w) => w[1])), a = t.spiral.from;
      const y = climb(t.x + Math.cos(a) * 6, t.z + Math.sin(a) * 6, lo);
      if (Math.abs(y - hi) > 0.3) bad.push(`${t.key}: its stair to ${y.toFixed(1)}, not ${hi.toFixed(1)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("a tower's near view has its rooms: a floor and a lamp each, its door's leaf to fold away, and its chest's room", () => {
  for (const key of ['spire', 'eye', 'gaolgate', 'hospice', 'marshal', 'corner3', 'lesser1_1']) {
    const t = cityTowers().find((q) => q.key.startsWith(key));
    const b = buildPhobosCell(t.cell);
    if (t.door !== undefined) assert.ok(b.groups.has('door:' + t.door), `${t.key}: its door's leaf`);
    assert.ok(b.lamps.some((l) => Math.hypot(l.p[0] - t.x, l.p[2] - t.z) < t.r), `${t.key}: lit inside`);
    for (const [layer, p] of b.parts) for (let i = 0; i < p.pos.length; i += 97) assert.ok(Number.isFinite(p.pos[i]), `${t.key} ${layer}`);
  }
});
