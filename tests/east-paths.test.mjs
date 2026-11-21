// Auto-play's walking map of City State Phobos and Castle Velscour (assets/game/nav/east.bin, src/sim/east-nav.js; made by
// tools/paths/bake.mjs and graph.mjs): from the road before the Drawbridge Gate, a way to every delve's door on the streets
// (the sewers' grates, the castle's portals), every gate, every castle tower's deck and every bridge between them; and the
// near way walked out over a stair, not through its wall. (tools/paths/trips.mjs walks every one of them as the sim moves
// the player; tools/paths/map.mjs checks every place it gets to it can get back from.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from '../src/sim/world.js';
import { EAST_DOOR, EastNav } from '../src/sim/east-nav.js';
import { targets } from '../tools/paths/targets.mjs';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const world = new World(JSON.parse(R('assets/game/village.json')), JSON.parse(R('assets/game/interior/interior.json')));
world.setPhobosDoors(new Set(world.phDoors.keys()));
const nav = new EastNav(R('assets/game/nav/east.bin'), world);
const T = targets();
const [dx, dz] = EAST_DOOR, dy = nav.ground(dx, dz, -100);
const from = nav.nodesNear(dx, dz, dy, 7, 4);

// (Every target's nodes, got to over the map's long way from the gate road's.)
const gets = (t) => {
  // (Only places got to from the gate are a way's end, as EastNav.route has it: a spire's crown over its deck isn't.)
  const ends = nav.nodesNear(t.x, t.z, t.y, Math.max(4, Math.min(t.r + 2, 30)), t.y === null ? 1e9 : 3).filter((n) => nav.live[n]);
  return ends.length > 0 && nav.coarse(from.slice(0, 4).map((n) => [n, 0]), new Set(ends.slice(0, 64)), t.x, t.z) !== null;
};

test('the gate road is on the map', () => {
  assert.ok(from.length > 0, 'no node by the Drawbridge Gate road');
});

for (const kind of ['portal', 'way in', 'gate', 'castle tower deck', 'bridge']) {
  test(`a way to every ${kind}`, () => {
    const L = T.filter((t) => t.kind === kind);
    assert.ok(L.length > 0, `no ${kind}s to look for`);
    const miss = L.filter((t) => !gets(t)).map((t) => `${t.name} (${t.x.toFixed(0)}, ${t.z.toFixed(0)})`);
    assert.deepEqual(miss, [], `no way to: ${miss.join('; ')}`);
  });
}

test('a near way is walked out, each step one the body can take', () => {
  // (From the gate road toward the first castle tower deck: the first stretch walked out, the rest by the long way.)
  const t = T.find((q) => q.kind === 'castle tower deck');
  const P = nav.route([dx, dy, dz], [t.x, t.z, t.y], t.r);
  assert.ok(P?.length > 1, 'no way');
  for (let i = 1; i < P.length; i++) {
    if (P[i][2] === 2 || P[i - 1][2] === 2) continue;
    assert.ok(nav.walkable([P[i - 1][0], P[i - 1][1], P[i - 1][4]], [P[i][0], P[i][1], P[i][4]]) || Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) < 0.8,
      `a step it can't take at ${P[i].slice(0, 2).map((v) => v.toFixed(1))}`);
  }
});
