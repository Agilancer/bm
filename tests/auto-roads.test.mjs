// Auto-play's long way (src/ui/autobrain.js planWay): to the nearest point of a road, down the roads, lanes and paths, and
// off them where they come nearest to where it's going; through the woken seals when that's shorter; and up a delve's portal
// by the flight down the front of its terrace, square on and up the middle (src/core/sites.js portalStair). It used to go
// straight across country whenever the roads were half as long again as the line: from the Bone Fields over the Sorrowhorn,
// and at a low level, keeping out of every lair's wake, across country almost everywhere. And it came at a terrace from
// whichever side its way left off, into the parapet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Brain, planWay, stairsOf } from '../src/ui/autobrain.js';
import { inEast } from '../src/sim/east-nav.js';
import { allWays, nearestRoad, roadGraph } from '../src/core/roads.js';
import { SITES } from '../src/core/lands.js';
import { SEALS, portalStair } from '../src/core/sites.js';
import { DELVES } from '../src/core/dungeon.js';
import { LAIRS } from '../src/core/tripo-monsters.js';
import { SILL_DOOR } from '../src/folk/first-visit.js';
import { World } from '../src/sim/world.js';
import { navFor } from '../src/sim/nav.worker.js';

// How far (x, z) is off the nearest way, past its edge (under nothing: on it).
const segs = [];
for (const w of allWays()) for (let i = 0; i + 1 < w.pts.length; i++) segs.push([...w.pts[i], ...w.pts[i + 1], w.w]);
const GRID = new Map(), GC = 32;
segs.forEach((s, n) => {
  for (let i = Math.floor((Math.min(s[0], s[2]) - 10) / GC); i <= Math.floor((Math.max(s[0], s[2]) + 10) / GC); i++) {
    for (let j = Math.floor((Math.min(s[1], s[3]) - 10) / GC); j <= Math.floor((Math.max(s[1], s[3]) + 10) / GC); j++) {
      const k = i * 100003 + j; if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(n);
    }
  }
});
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(ax + dx * t - px, az + dz * t - pz); };
const offRoad = (x, z) => { let b = 99; for (const n of GRID.get(Math.floor(x / GC) * 100003 + Math.floor(z / GC)) || []) { const s = segs[n]; b = Math.min(b, segDist(x, z, s[0], s[1], s[2], s[3]) - s[4]); } return b; };
// A way walked from a: how much of it is on a road, and its longest stretch off one (through a seal, from where it lets out).
function score(a, way) {
  let on = 0, all = 0, run = 0, worst = 0, px = a.x, pz = a.z;
  for (const q of way) {
    const L = Math.hypot(q.x - px, q.z - pz), n = Math.ceil(L / 2);
    // (Within City State Phobos and Castle Velscour the way's walked out by the east's own map of its streets, stairs and
    // bridges, from the road before the Drawbridge Gate: src/sim/east-nav.js, tests/east-paths.test.mjs. Not a stretch off-road.)
    const inside = inEast(px, pz) && inEast(q.x, q.z);
    for (let k = 0; k < n && !inside; k++) {
      const x = px + (q.x - px) * (k + 0.5) / n, z = pz + (q.z - pz) * (k + 0.5) / n;
      all += L / n;
      if (offRoad(x, z) < 3) { on += L / n; run = 0; } else worst = Math.max(worst, run += L / n);
    }
    [px, pz] = q.seal ? [q.to.x, q.to.z] : [q.x, q.z];
  }
  return { on: all ? on / all : 1, all, worst };
}
// Its head as it is in the game, without the game: what it keeps clear of at its level, the seals it's woken, the nav ground.
const brain = (awake = []) => {
  const b = Object.create(Brain.prototype);
  b.nav = { inGrid: (x, z) => Math.abs(x) < 246 && Math.abs(z) < 246 };
  b.o = { lands: { awake: new Set(awake) } };
  b.snap = null; b.blackKnight = () => null;
  return b;
};
const TOWN = { x: 2, z: 64 };
const ends = [...Object.entries(SITES).map(([k, s]) => [k, s.x, s.z]), ...DELVES.filter((d) => !d.within).map((d) => [`${d.key}'s portal`, d.portal.x, d.portal.z])];

for (const lvl of [1, 12, 30]) {
  test(`at level ${lvl}, from Bellmourn to every place and portal it keeps to the roads`, () => {
    const B = brain();
    let on = 0, all = 0;
    for (const [name, x, z] of ends) {
      const s = score(TOWN, B.longWay({ ...TOWN, lvl }, { x, z }));
      on += s.on * s.all; all += s.all;
      // (Off a road only to get to one, or from one to where it's going: the Sorrowhorn's crown is a kilometre from any road.)
      const far = nearestRoad(x, z, 3000).d;
      // (At level 1 it keeps clear of every den pinned by the far camps: 230 m there, where it cuts round one to a place it has no business at yet.)
      assert.ok(s.worst < Math.max(lvl === 1 ? 230 : 160, far + 60), `${name}: ${s.worst.toFixed(0)} m at a stretch off a road (it's ${far.toFixed(0)} m from one)`);
    }
    assert.ok(on / all > 0.95, `${(100 * on / all).toFixed(1)}% of the way on a road`);
  });
}

test('between the places, it goes round by the roads, not over the mountains', () => {
  const B = brain(), keys = Object.keys(SITES);
  let on = 0, all = 0;
  for (let i = 0; i < keys.length; i++) {
    const a = SITES[keys[i]], b = SITES[keys[(i * 7 + 3) % keys.length]];
    if (a === b) continue;
    const from = { x: a.x + 12, z: a.z + 12, lvl: 20 }, far = Math.max(nearestRoad(from.x, from.z, 3000).d, nearestRoad(b.x, b.z, 3000).d);
    const s = score(from, B.longWay(from, { x: b.x, z: b.z }));
    on += s.on * s.all; all += s.all;
    assert.ok(s.worst < Math.max(160, far + 60), `${keys[i]} to ${keys[(i * 7 + 3) % keys.length]}: ${s.worst.toFixed(0)} m at a stretch off a road`);
  }
  assert.ok(on / all > 0.95, `${(100 * on / all).toFixed(1)}% on a road`);
  // (The one it went straight over: the Bone Fields to the chapel, across the Sorrowhorn.)
  const s = score({ x: SITES.bones.x, z: SITES.bones.z }, B.longWay({ x: SITES.bones.x, z: SITES.bones.z, lvl: 20 }, { x: SITES.chapel.x, z: SITES.chapel.z }));
  assert.ok(s.on > 0.9 && s.worst < 160, `the Bone Fields to the chapel: ${(100 * s.on).toFixed(0)}% on a road, ${s.worst.toFixed(0)} m off at a stretch`);
});

test('on the woods round the town it walks the paths, and in the town or under it goes straight there', () => {
  const grid = (x, z) => Math.abs(x) < 246 && Math.abs(z) < 246;
  const w = planWay({ x: 0, z: 40 }, { x: -150, z: 150 }, { grid });
  assert.ok(w.length > 4 && score({ x: 0, z: 40 }, w).on > 0.8, 'out into the woods by the paths');
  assert.equal(planWay({ x: 0, z: 0 }, { x: 30, z: 20 }, { grid }).length, 1, 'across the town: one path');
  const below = { x: 200, z: 10, below: true };
  assert.equal(planWay({ x: 170, z: 5 }, below, { grid, below: true }).length, 1, 'down in the catacombs: one path');
});

test('the seals: stepped through when that is shorter', () => {
  const a = SITES.thornwick, b = SITES.cinderford;
  const w = brain(SEALS.map((s) => s.key)).longWay({ x: a.x + 10, z: a.z + 10, lvl: 30 }, { x: b.x, z: b.z });
  assert.ok(w.some((q) => q.seal), 'Thornwick to Cinderford, with every seal awake, goes through one');
});

// The steps themselves, and the world: each delve's portal stands on its terrace and the flight comes down its front.
const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const interior = read('assets/game/interior/interior.json');
const world = new World(read('assets/game/village.json'), interior);
const nav = navFor(world, interior);

for (const d of DELVES.filter((q) => !q.within)) {
  const S = portalStair(d), p = d.portal;
  // Along the middle of the flight from its foot (out the front: fx, fz) and across it.
  const frame = (x, z) => { const dx = x - S.out[0], dz = z - S.out[1]; return [-(dx * S.fx + dz * S.fz), dx * S.fz - dz * S.fx]; };
  test(`${d.name}'s steps are where the world has them, and clear up the middle`, () => {
    assert.ok(S.steps, 'a flight that meets the ground');
    assert.ok(Math.abs(world.platformAt(...S.head) - S.top) < 0.4, `the head of the steps is on the terrace (${world.platformAt(...S.head)} for ${S.top.toFixed(2)})`);
    assert.equal(world.platformAt(...S.foot), null, 'the foot of them is on the ground');
    assert.equal(world.platformAt(...S.out), null);
    let y = world.height(...S.out);
    const L = Math.hypot(p.x - S.out[0], p.z - S.out[1]);
    for (let k = 0.2; k < L; k += 0.2) {
      const x = S.out[0] + (p.x - S.out[0]) * k / L, z = S.out[1] + (p.z - S.out[1]) * k / L, h = world.height(x, z);
      assert.ok(h - y < 0.4, `a rise of ${(h - y).toFixed(2)} m ${k.toFixed(1)} m up from the front`);
      assert.ok(!nav.solidAt(x, z, 0.42, h + 0.25), `something in the way ${k.toFixed(1)} m up`);
      y = h;
    }
    const pts = nav.local(S.out, [p.x, p.z]);
    assert.ok(pts?.length && Math.hypot(pts.at(-1)[0] - p.x, pts.at(-1)[1] - p.z) < 1, 'a short path up them ends at the portal');
    assert.ok(stairsOf(p.x, p.z) && !stairsOf(...S.out), 'the portal is on the terrace and the point out in front is not');
  });

  test(`${d.name}'s portal is gone up to by its steps, and left down them`, () => {
    const B = brain();
    for (const from of [TOWN, { x: p.x - S.fx * 60 + S.fz * 30, z: p.z - S.fz * 60 - S.fx * 30 }]) {
      const w = B.longWay({ ...from, lvl: 30 }, p);
      const up = w.filter((q) => q.stair);
      assert.equal(up.length, 3, 'out in front, the foot, the head');
      const along = up.map((q) => frame(q.x, q.z));
      assert.ok(along.every(([, c]) => Math.abs(c) < 0.05), 'all on the middle line');
      assert.ok(along[0][0] < along[1][0] && along[1][0] < along[2][0], 'in order, up');
      assert.ok(w.indexOf(up[2]) === w.length - 2 && w.at(-1) === p, 'then the portal');
      assert.ok(up[1].walk && up[2].walk, 'walked up');
    }
    // Out of the delve: set down 4 m out from the portal (src/sim/dungeon.js), and straight down the steps, not back first.
    const out = { x: p.x + S.fx * 4, z: p.z + S.fz * 4, lvl: 30 };
    const w = B.longWay(out, TOWN);
    assert.ok(w[0].stair && w[1].stair && !w[2].stair, 'the foot and out in front of it first');
    assert.ok(frame(w[0].x, w[0].z)[0] < frame(out.x, out.z)[0] && frame(w[1].x, w[1].z)[0] < frame(w[0].x, w[0].z)[0], 'down, away from the portal');
  });
}

test('from beside a terrace, the short way to the foot of its steps goes round it, not over it', () => {
  // (src/sim/nav.worker.js local: it went up a terrace's end steps, over it and down the front, then turned to go up again.)
  for (const d of DELVES) {
    const S = portalStair(d);
    const at = (along, across) => [S.out[0] - S.fx * along + S.fz * across, S.out[1] - S.fz * along - S.fx * across];
    const depth = (x, z) => Math.max(...S.boxes.map((c) => { const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return Math.min(c.hx - Math.abs(dx * cs - dz * sn), c.hz - Math.abs(dx * sn + dz * cs)); }));
    for (const along of [4, 8, 12]) for (const across of [-9, 9]) {
      const from = at(along, across);
      if (nav.solidAt(from[0], from[1], 0.42, world.height(...from) + 0.25) || world.platformAt(...from) !== null) continue;
      const pts = nav.local(from, S.out);
      assert.ok(pts?.length, `${d.name}: no way from ${along} m back and ${across} across`);
      let deep = -9, [px, pz] = from;
      for (const [x, z] of pts) { for (let k = 0; k <= 40; k++) deep = Math.max(deep, depth(px + (x - px) * k / 40, pz + (z - pz) * k / 40)); px = x; pz = z; }
      assert.ok(deep < 0.5, `${d.name}: from ${along} m back and ${across} across it goes ${deep.toFixed(2)} m in over the terrace`);
    }
  }
});

test('no road or path runs over a terrace or up its steps (tools/roads/lay.mjs)', () => {
  const hit = (c, x, z, m) => { const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return Math.abs(dx * cs - dz * sn) < c.hx + m && Math.abs(dx * sn + dz * cs) < c.hz + m; };
  for (const d of DELVES) {
    const S = portalStair(d);
    for (const w of allWays()) for (let i = 0; i + 1 < w.pts.length; i++) {
      const [ax, az] = w.pts[i], [bx, bz] = w.pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
      for (let k = 0; k <= n; k++) {
        const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
        assert.ok(!S.boxes.some((c) => hit(c, x, z, w.w * 0.8)), `${w.name} runs over ${d.name}'s terrace at ${x.toFixed(0)}, ${z.toFixed(0)}`);
      }
    }
  }
});

test('a way is worked out in a few milliseconds, even at level 1 with every seal awake', () => {
  roadGraph();
  const B = brain(SEALS.map((s) => s.key)), keys = Object.keys(SITES), t = [];
  for (let i = 0; i < 30; i++) {
    const a = SITES[keys[i % keys.length]], b = SITES[keys[(i * 7 + 3) % keys.length]], t0 = performance.now();
    B.longWay({ x: a.x + 15, z: a.z + 15, lvl: 1 }, { x: b.x, z: b.z });
    t.push(performance.now() - t0);
  }
  t.sort((p, q) => p - q);
  assert.ok(t[15] < 25, `half of them took more than ${t[15].toFixed(1)} ms`);
});

// Inside the east's box but this side of the city (the plain under the Sill: the Gibbet Field, the carrion), it crosses onto
// the east's map where the road comes into the box, not at the Drawbridge Gate. It used to go to the gate whenever one end
// was in the box: from Wenna down the road past the Gibbet Field to the gate and back up to it, and from there home by the
// gate again, to and fro along the road under the castle.
test('to and from the plain under the Sill: not by the Drawbridge Gate, and no further than the road there and back', () => {
  const sill = { x: SILL_DOOR.x, z: SILL_DOOR.z };
  for (const key of ['sill_gibbets', 'sill_carrion']) {
    const l = LAIRS.find((q) => q.key === key), at = { x: l.x, z: l.z };
    for (const [a, b] of [[sill, at], [at, sill]]) {
      const way = planWay(a, b);
      assert.ok(!way.some((q) => q.gate), `${key}: by the gate`);
      let L = 0, x = a.x, z = a.z;
      for (const q of way) { L += Math.hypot(q.x - x, q.z - z); x = q.x; z = q.z; }
      assert.ok(L < Math.hypot(b.x - a.x, b.z - a.z) * 1.7, `${key}: ${L.toFixed(0)} m of way for ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(0)} m`);
    }
  }
  // (Into the city itself, the east's map still takes it in by the gate road: the way hands over inside the box.)
  const city = planWay(sill, { x: 9600, z: 0 });
  assert.ok(inEast(city.at(-2).x, city.at(-2).z), 'handed over to the east map outside its box');
});
