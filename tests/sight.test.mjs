// A clean line for a shot (src/sim/sight.js), on the real town: what auto-play asks before it lets fly, and what the other
// Tessariels ask before they loose. Nothing through a wall; nothing that only just grazes a corner; and when there's no line,
// the step to the side it's told to take really does open one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { FAT, cleanLine, lineClear, sight } from '../src/sim/sight.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const EYE = 1.62;
// The town's walls: tall thin boxes standing on the ground, long enough to hide behind.
const walls = world.colliders.filter((c) => !c.b && c.t === undefined && c.h >= 2.5 && Math.max(c.hx, c.hz) >= 2 && Math.abs(c.x) < 120 && Math.abs(c.z) < 120);
// A point by a wall, in its own frame: `along` its length from its middle, `out` from its face.
const at = (c, along, out) => {
  const [lx, lz] = c.hx >= c.hz ? [along, out] : [out, along];
  return [c.x + lx * c.co + lz * c.s, c.z - lx * c.s + lz * c.co];
};
const half = (c) => Math.max(c.hx, c.hz), thin = (c) => Math.min(c.hx, c.hz);
const eyeAt = (x, z) => world.height(x, z) + EYE;
const free = (x, z) => !world.inside(x, z, 0.45);

test('there are walls to hide behind', () => assert.ok(walls.length > 30, `${walls.length} walls`));

test('nothing is shot through a wall', () => {
  for (const c of walls) {
    const [ax, az] = at(c, 0, -(thin(c) + 3)), [bx, bz] = at(c, 0, thin(c) + 3);
    assert.equal(lineClear(world, ax, eyeAt(ax, az), az, bx, eyeAt(bx, bz), bz), false);
    assert.equal(cleanLine(world, ax, eyeAt(ax, az), az, bx, eyeAt(bx, bz), bz), false);
  }
});

test('a line that only grazes a corner is not a clean one', () => {
  let grazes = 0;
  for (const c of walls) {
    for (const end of [1, -1]) {
      // Across the wall's end, half a hand's width past it: the bare line misses the corner, by less than a bolt needs.
      const a = end * (half(c) + FAT * 0.5);
      const [ax, az] = at(c, a, -3), [bx, bz] = at(c, a, 3);
      const ay = eyeAt(ax, az), by = eyeAt(bx, bz);
      if (!free(ax, az) || !free(bx, bz) || !lineClear(world, ax, ay, az, bx, by, bz)) continue;   // (the next wall stands there: not this test's)
      grazes++;
      assert.equal(cleanLine(world, ax, ay, az, bx, by, bz), false, 'a bare line past the corner is clear, but not by a hand\'s width');
      // (And well clear of the corner, where nothing else stands, it is clean.)
      const [cx, cz] = at(c, a + end * 1.2, -3), [dx, dz] = at(c, a + end * 1.2, 3);
      if (free(cx, cz) && free(dx, dz) && lineClear(world, cx + (cx - ax) * 0.4, ay, cz + (cz - az) * 0.4, dx + (dx - bx) * 0.4, by, dz + (dz - bz) * 0.4) && lineClear(world, cx, ay, cz, dx, by, dz) && lineClear(world, ax + (cx - ax) * 0.6, ay, az + (cz - az) * 0.6, bx + (dx - bx) * 0.6, by, bz + (dz - bz) * 0.6)) assert.equal(cleanLine(world, cx, ay, cz, dx, by, dz), true);
    }
  }
  assert.ok(grazes >= 5, `only ${grazes} wall ends with a bare line past them`);
});

test('behind a corner: no line, and the step it names opens one', () => {
  let found = 0;
  for (const c of walls) {
    for (const end of [1, -1]) {
      // The shooter close behind the wall near its end, the mark round that end on the other side.
      const L = half(c), [ax, az] = at(c, end * (L - 1), -(thin(c) + 2)), [bx, bz] = at(c, end * (L - 2), thin(c) + 5);
      if (!free(ax, az) || !free(bx, bz)) continue;
      const ay = eyeAt(ax, az), by = world.height(bx, bz) + 1.1;
      const [[clear, step]] = sight(world, [ax, ay, az], [[bx, by, bz]]);
      assert.equal(clear, 0, 'the wall is between them');
      if (!step) continue;   // (boxed in by the neighbours: it would go round)
      // (Its right, facing the mark, is (-dz, dx) of the way to it: the move keys' own frame.)
      const dx = bx - ax, dz = bz - az, D = Math.hypot(dx, dz), px = ax - dz / D * step, pz = az + dx / D * step;
      assert.ok(free(px, pz), 'the step is somewhere it can stand');
      assert.equal(cleanLine(world, px, ay, pz, bx, by, bz), true, 'and from there the line is clean');
      found++;
    }
  }
  // And out in the woods, behind a pine: a step to the side and the line's open.
  let pines = 0;
  for (let j = -8; j <= 8 && pines < 40; j++) {
    for (let i = -8; i <= 8 && pines < 40; i++) {
      const list = world.trunkCell(i, j);
      if (!list) continue;
      for (let k = 0; k < list.length && pines < 40; k += 4) {
        const tx = list[k], tz = list[k + 1];
        const ax = tx - 5, az = tz, bx = tx + 6, bz = tz;
        if (!free(ax, az) || !free(bx, bz) || world.height(ax, az) < -2) continue;
        const ay = eyeAt(ax, az), by = world.height(bx, bz) + 1.1;
        if (list[k + 3] < ay) continue;   // (a stump lower than the shot)
        const [[clear, step]] = sight(world, [ax, ay, az], [[bx, by, bz]]);
        if (clear) continue;   // (a rise or a dip: the trunk isn't between them at this height)
        pines++;
        if (!step) continue;
        const px = ax, pz = az + step;   // (facing +x, its right is +z)
        assert.ok(free(px, pz), 'the step is somewhere it can stand');
        assert.equal(cleanLine(world, px, ay, pz, bx, by, bz), true, 'and from there the line is clean');
        found++;
      }
    }
  }
  assert.ok(pines >= 10, `only ${pines} pines stood behind`);
  assert.ok(found >= 8, `only ${found} places where a sidestep opens the line`);
});

test('open ground is a clean line', () => {
  // Out in the meadow south of the town, clear of the pines: a few lines found clear by the bare ray are clean by the fat one too.
  let n = 0;
  for (let k = 0; k < 400 && n < 20; k++) {
    const ax = -30 + (k * 37 % 61), az = 20 + (k * 53 % 31), bx = ax + 9, bz = az + 4;
    if (world.inside(ax, az, 1.5) || world.inside(bx, bz, 1.5)) continue;
    if (world.clearance(ax, az, 9 / Math.hypot(9, 4), 4 / Math.hypot(9, 4), Math.hypot(9, 4), 1.2) < Math.hypot(9, 4) - 0.1) continue;
    const ay = eyeAt(ax, az), by = world.height(bx, bz) + 1.1;
    if (!lineClear(world, ax, ay, az, bx, by, bz)) continue;   // (a rise in the ground)
    assert.deepEqual(sight(world, [ax, ay, az], [[bx, by, bz]]), [[1, 0]]);
    n++;
  }
  assert.ok(n >= 10, `only ${n} open lines found`);
});
