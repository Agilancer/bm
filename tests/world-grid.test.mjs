// The world's box grid (src/sim/world.js buildBoxGrid) and the trunk cells it skips must give the same answers as looking at every
// box and every trunk round about, which is how the world worked before. Checked on the real town, church and forest, with
// thousands of spots and rays near walls, in the woods and in the open, doors shut and open.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { floorAt } from '../src/core/interior.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));

// ---- the old way: every box, and the 3 x 3 trunk cells round about ------------------------------------------------------
const TRUNK_CELL = 16, TOWN = 50;
function insideAll(w, x, z, r) {
  for (const c of w.colliders) {
    if (c.b || c.t !== undefined) continue;
    const dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx * c.co - dz * c.s) < c.hx + r && Math.abs(dx * c.s + dz * c.co) < c.hz + r) return true;
  }
  if (Math.abs(x) > TOWN || Math.abs(z) > TOWN) {
    const ci = Math.floor(x / TRUNK_CELL), cj = Math.floor(z / TRUNK_CELL);
    for (let j = cj - 1; j <= cj + 1; j++) {
      for (let i = ci - 1; i <= ci + 1; i++) {
        const list = w.trunkCell(i, j);
        if (!list) continue;
        for (let k = 0; k < list.length; k += 4) if (Math.hypot(x - list[k], z - list[k + 1]) < list[k + 2] + r) { const f = floorAt(x, z); return !(f !== null && f < -2); }
      }
    }
  }
  return false;
}
function resolveAll(w, out, r, feet) {
  let x = out[0], z = out[2];
  let hit = false;
  const push = (c) => {
    const dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx) + Math.abs(dz) > c.hx + c.hz + r + 1) return;
    if (feet > (c.t ?? c.h + 0.02 + w.height(c.x, c.z)) || feet < c.b) return;
    if (c.under && w.onLand(x, z, feet)) return;   // (buried under the land, and the feet on it: World.onLand)
    const lx = dx * c.co - dz * c.s, lz = dx * c.s + dz * c.co;
    const qx = Math.abs(lx) - c.hx, qz = Math.abs(lz) - c.hz;
    if (qx > r || qz > r) return;
    const sx = lx < 0 ? -1 : 1, sz = lz < 0 ? -1 : 1;
    let px = 0, pz = 0;
    if (qx > 0 && qz > 0) {
      const d = Math.hypot(qx, qz);
      if (d >= r) return;
      px = sx * qx / d * (r - d); pz = sz * qz / d * (r - d);
    } else if (qx > qz) { px = sx * (r - qx); } else { pz = sz * (r - qz); }
    x += px * c.co + pz * c.s; z += -px * c.s + pz * c.co;
    hit = true;
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const c of w.colliders) push(c);
    const near = w.sitesNear(x, z);
    if (near) for (const c of near) push(c);
    if ((Math.abs(x) > TOWN || Math.abs(z) > TOWN) && feet > -2) {
      const ci = Math.floor(x / TRUNK_CELL), cj = Math.floor(z / TRUNK_CELL);
      for (let j = cj - 1; j <= cj + 1; j++) {
        for (let i = ci - 1; i <= ci + 1; i++) {
          const list = w.trunkCell(i, j);
          if (!list) continue;
          for (let k = 0; k < list.length; k += 4) {
            if (feet > list[k + 3]) continue;
            const dx = x - list[k], dz = z - list[k + 1], d = Math.hypot(dx, dz), R = list[k + 2] + r;
            if (d >= R || d < 1e-4) continue;
            x = list[k] + dx / d * R; z = list[k + 1] + dz / d * R;
            hit = true;
          }
        }
      }
    }
  }
  return [x, z, hit];
}
// (Only the boxes: the sites and the pines are looked through as they were.)
function rayAllBoxes(w, ox, oy, oz, dx, dy, dz, maxT) {
  let best = -1;
  for (const c of w.colliders) {
    const rx = ox - c.x, rz = oz - c.z;
    const lox = rx * c.co - rz * c.s, loz = rx * c.s + rz * c.co;
    const ldx = dx * c.co - dz * c.s, ldz = dx * c.s + dz * c.co;
    let t0 = 0, t1 = maxT;
    const slab = (o, d, h) => {
      if (Math.abs(d) < 1e-6) return Math.abs(o) <= h;
      let a = (-h - o) / d, b = (h - o) / d;
      if (a > b) { const s = a; a = b; b = s; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      return t0 <= t1;
    };
    if (!slab(lox, ldx, c.hx) || !slab(loz, ldz, c.hz)) continue;
    let yAt = oy + dy * t0;
    if (c.under && w.onLand(ox + dx * t0, oz + dz * t0, yAt)) continue;
    if (yAt < -2) yAt -= w.height(c.x, c.z);
    if (yAt < c.b || yAt > c.t) continue;
    if (yAt > c.h && c.h < 3.5) continue;
    if (c.h >= 3.5 && yAt > 7) continue;
    if (best < 0 || t0 < best) best = t0;
  }
  return best;
}

// ---- where to ask ----------------------------------------------------------------------------------------------------
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const spots = [];
const boxes = world.colliders;
for (let n = 0; n < 6000; n++) {
  const k = n % 3;
  if (k === 0) {        // beside a wall: on it, in it, or just clear of it
    const c = boxes[(rnd() * boxes.length) | 0];
    spots.push([c.x + (rnd() * 2 - 1) * (c.ex + 3), c.z + (rnd() * 2 - 1) * (c.ez + 3)]);
  } else if (k === 1) { // the woods and the fields round the town
    const a = rnd() * Math.PI * 2, d = 50 + rnd() * 260;
    spots.push([Math.cos(a) * d, Math.sin(a) * d]);
  } else spots.push([(rnd() * 2 - 1) * 520, (rnd() * 2 - 1) * 520]);
}
const RADII = [0.36, 0.45, 0.82, 0.86, 1.4];

test('a spot is inside something exactly when it was before', () => {
  for (const doors of [-1, 0]) {
    world.setDoors(doors);
    let hits = 0;
    for (const [x, z] of spots) {
      for (const r of RADII) {
        const want = insideAll(world, x, z, r), got = world.inside(x, z, r);
        assert.equal(got, want, `inside(${x}, ${z}, ${r}) doors ${doors}`);
        if (got) hits++;
      }
    }
    assert.ok(hits > 2000, `enough of the spots are in something (${hits})`);
  }
});

test('a body is pushed out of the walls and trunks to the same place, to the last bit', () => {
  for (const doors of [-1, 0]) {
    world.setDoors(doors);
    let moved = 0;
    for (const [x, z] of spots) {
      const ground = world.height(x, z);
      for (const r of [0.36, 0.4, 0.86]) {
        for (const up of [0, 0.6, 2.5]) {
          const a = new Float32Array([x, 0, z]);
          const [wx, wz, whit] = resolveAll(world, [a[0], 0, a[2]], r, ground + up);
          const hit = world.resolve(a, r, ground + up);
          assert.equal(hit, whit, `resolve hit at ${x}, ${z}`);
          assert.equal(a[0], Math.fround(wx), `resolve x at ${x}, ${z}`);
          assert.equal(a[2], Math.fround(wz), `resolve z at ${x}, ${z}`);
          if (whit) moved++;
        }
      }
    }
    assert.ok(moved > 2000, `enough bodies were pushed (${moved})`);
  }
});

test('a ray meets the same box at the same distance', () => {
  world.setDoors(0);
  let met = 0;
  for (const [x, z] of spots) {
    for (const len of [1.5, 6, 22, 90]) {
      const a = rnd() * Math.PI * 2, pitch = (rnd() - 0.5) * 0.3, y = world.height(x, z) + 0.4 + rnd() * 2;
      const dx = Math.sin(a) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(a) * Math.cos(pitch);
      const want = rayAllBoxes(world, x, y, z, dx, dy, dz, len);
      // (rayBoxes also looks at the sites and pines; a box hit is the answer only when it's the nearest, so compare boxes alone.)
      const saveSites = world.sitesNear, saveTrunks = world.trunks;
      world.sitesNear = () => null; world.trunks = new Map();
      const got = world.rayBoxes(x, y, z, dx, dy, dz, len);
      world.sitesNear = saveSites; world.trunks = saveTrunks;
      assert.equal(got, want, `ray from ${x}, ${z} len ${len}`);
      if (want >= 0) met++;
    }
  }
  assert.ok(met > 1000, `enough rays met a box (${met})`);
});

// ---- the way-finding fields -----------------------------------------------------------------------------------------
import { NAV_CELL, NAV_H, NAV_W, NAV_X0, NAV_Z0 } from '../src/sim/world.js';

// The old updateField, as it was: made again every 0.2 s or 2 m, whatever cell it started from, with the plain loop.
function oldField(w, slots, x, z, now, slot) {
  let f = slots.get(slot);
  if (!f) { f = { field: new Float32Array(NAV_W * NAV_H), x: 1e9, z: 1e9, t: -1e9 }; slots.set(slot, f); }
  if (Math.abs(now - f.t) < 0.2 && Math.hypot(x - f.x, z - f.z) < 2) return f.field;
  f.t = now; f.x = x; f.z = z;
  const { field } = f, grid = w.grid, queue = new Int32Array(NAV_W * NAV_H * 4);
  field.fill(1e9);
  const si = Math.max(0, Math.min(NAV_W - 1, ((x - NAV_X0) / NAV_CELL) | 0)), sj = Math.max(0, Math.min(NAV_H - 1, ((z - NAV_Z0) / NAV_CELL) | 0));
  let head = 0, tail = 0;
  queue[tail++] = sj * NAV_W + si; field[sj * NAV_W + si] = 0;
  const cap = queue.length;
  while (head < tail) {
    const k = queue[head++];
    const i = k % NAV_W, j = (k / NAV_W) | 0;
    const d = field[k];
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= NAV_W || nj >= NAV_H) continue;
        const nk = nj * NAV_W + ni;
        if (grid[nk]) continue;
        if (di && dj && (grid[j * NAV_W + ni] || grid[nj * NAV_W + i])) continue;
        const nd = d + (di && dj ? 1.414 : 1);
        if (nd > 150) continue;
        if (nd < field[nk] - 1e-3 && tail < cap) { field[nk] = nd; queue[tail++] = nk; }
      }
    }
  }
  return field;
}

test('the way to a spot is worked out the same, cell for cell, as the target moves and stands', () => {
  const slots = new Map();
  const same = (slot, label) => {
    const a = world.slots.get(slot).field, b = slots.get(slot).field;
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) assert.fail(`${label}: cell ${k % NAV_W}, ${(k / NAV_W) | 0}: ${a[k]} against ${b[k]}`);
  };
  // A target walking through the town, the woods and up to the grid's edge, a step a tick, and standing a while at the end;
  // and another, on a post, asked about every tick for two seconds.
  const walks = [[[0, 0], [30, -20]], [[-105, 63], [-80, 40]], [[NAV_X0 + 0.5, 0], [NAV_X0 + 6, 4]]];
  let t = 0;
  for (const [[x0, z0], [x1, z1]] of walks) {
    for (let n = 0; n <= 160; n++) {
      const u = Math.min(1, n / 120), x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      t += 1 / 144;
      world.updateField(x, z, t, 'walker'); oldField(world, slots, x, z, t, 'walker');
      if (n % 16 === 0) same('walker', `walking at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
    same('walker', 'standing');
  }
  for (let n = 0; n < 288; n++) {
    t += 1 / 144;
    world.updateField(-7, 19, t, 'post'); oldField(world, slots, -7, 19, t, 'post');
  }
  same('post', 'a post');
});

test('walking fields past the 24 kept: an idle one is taken over and made afresh, one in use never is', () => {
  const w = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
  const ref = new Map();
  // Twenty-four walkers to different spots, all at once: then one more, while they're all still asking.
  let t = 100;
  for (let n = 0; n < 24; n++) w.updateField(-60 + n * 5, 10, t, `k${n}`);
  w.updateField(0, -30, t, 'late');
  assert.equal(w.slots.size, 25, 'none of the busy ones was taken');
  // Then all but one go quiet for three seconds, and a newcomer takes over the oldest quiet one, no new field.
  t += 3;
  w.updateField(-60, 10, t, 'k0');
  const fields = new Set([...w.slots.values()].map((f) => f.field));
  const hero = { x: 12, z: -4 };
  w.updateField(hero.x, hero.z, t, hero);
  assert.equal(w.slots.size, 25);
  assert.ok(fields.has(w.slots.get(hero).field), 'an old field reused');
  assert.ok(w.slots.has('k0'), 'the one still asking kept its own');
  // And what it holds is the way to the hero, as if new.
  oldField(w, ref, hero.x, hero.z, t, 'hero');
  const a = w.slots.get(hero).field, b = ref.get('hero').field;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) assert.fail(`cell ${k % NAV_W}, ${(k / NAV_W) | 0}: ${a[k]} against ${b[k]}`);
});
