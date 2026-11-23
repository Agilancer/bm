// City State Phobos's props and trails (the owner, 2026-11-21: "the alleys that the player travels through is filled with
// stuff, and he clips through it"; "Phobos needs defined paths or trails connected to the main road"). What stands in the
// way behind the houses and along the streets is solid for the sim and the walking map (src/core/phobos-props.js, made by
// tools/paths/props.mjs, up to date with what the city builds); and every trail (src/core/phobos-trails-data.js, made by
// tools/paths/trails.mjs) is on ground the walking map walks, and joins the streets, the Throne Road or a trail laid before it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { World } from '../src/sim/world.js';
import { EAST_DOOR, EastNav, HOME_NEAR, X0, X1, Z0, Z1, inEast } from '../src/sim/east-nav.js';
import { phobosProps } from '../src/core/phobos-props.js';
import { trailRoots } from '../src/core/phobos-trails.js';
import { TRAILS } from '../src/core/phobos-trails-data.js';
import { targets } from '../tools/paths/targets.mjs';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const world = new World(JSON.parse(R('assets/game/village.json')), JSON.parse(R('assets/game/interior/interior.json')));
const nav = new EastNav(R('assets/game/nav/east.bin'), world);

test('the props: thousands, all in the east, each a box a body is stopped by', () => {
  const P = phobosProps();
  assert.ok(P.length > 15000, `${P.length} props`);
  for (const c of P) assert.ok(inEast(c.x, c.z) && c.hx > 0 && c.hz > 0 && c.h > 0.3);
  // (One of them, in the world: walked into from beside it, pushed back out.)
  const c = P.find((q) => q.hx > 0.3 && q.hz > 0.3 && q.h > 0.8);
  const at = [c.x + 0.05, 0, c.z];
  world.resolve(at, 0.36, world.landAt(c.x, c.z));
  assert.ok(Math.hypot(at[0] - c.x, at[2] - c.z) > 0.2, 'stood inside a prop');
});

test('the props file is what the city builds now', { timeout: 240000 }, () => {
  execFileSync(process.execPath, [new URL('../tools/paths/props.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), '--check'], { stdio: 'pipe' });
});

test('every trail is on walkable ground and joins the roads or a trail before it', () => {
  assert.ok(TRAILS.length > 100, `${TRAILS.length} trails`);
  const near = (x, z, L, r) => L.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
  const along = (L) => { const out = []; for (let i = 0; i + 1 < L.length; i++) { const n = Math.max(1, Math.ceil(Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]) / 2)); for (let k = 0; k < n; k++) out.push([L[i][0] + (L[i + 1][0] - L[i][0]) * k / n, L[i][1] + (L[i + 1][1] - L[i][1]) * k / n]); } out.push(L.at(-1)); return out; };
  let flat = trailRoots().flatMap(along);
  for (const t of TRAILS) {
    for (const [x, z, y] of t.pts) {
      assert.ok(x > X0 && x < X1 && z > Z0 && z < Z1, `${t.name}: off the east`);
      assert.ok(nav.nodesNear(x, z, y, 1.5, 1.5).some((n) => nav.live[n]), `${t.name}: (${x}, ${z}, ${y}) not on the walking map`);
    }
    const [ex, ez] = t.pts.at(-1);
    assert.ok(near(ex, ez, flat, 4.5), `${t.name}: ends at (${ex}, ${ez}), on no road or trail`);
    flat = flat.concat(along(t.pts));
  }
});

// The long way from the gate to each hub and district keeps to the streets and trails, and out of people's houses but the
// last few strides (EastNav INDOORS: one went in at a house's door and stuck against its inside wall).
test('ways across the city keep out of houses and mostly to the trails', () => {
  const [dx, dz] = EAST_DOOR, dy = nav.ground(dx, dz, -100);
  let on = 0, all = 0;
  for (const t of targets().filter((q) => q.kind === 'hub' || q.kind === 'district')) {
    const P = nav.route([dx, dy, dz], [t.x, t.z, t.y], t.r);
    assert.ok(P, `no way to ${t.name}`);
    for (let i = 1; i < P.length; i++) {
      const [x, z, , , y] = P[i], near = nav.nodesNear(x, z, y ?? null, 0.8, 1.5);
      const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      all += d; if (near.some((n) => nav.onTrail[n] & 1)) on += d;
      if (Math.hypot(x - t.x, z - t.z) < HOME_NEAR + t.r) continue;
      assert.ok(!near.length || !near.every((n) => nav.onTrail[n] & 2), `${t.name}: through a house at (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }
  }
  assert.ok(on / all > 0.6, `only ${(100 * on / all).toFixed(0)}% on the trails`);
});
