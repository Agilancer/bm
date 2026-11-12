// What the other Tessariels throw and catch again (src/sim/heroskills.js stepShotX): a board, a blade or a boomerang on its
// way home keeps to a speed of its own, however long it's out. One that came home slower than its thrower ran used to gain
// half again on every tick once it was overdue, and in two seconds stood ten to the thirty-eighth metres off, which the
// Warrens' fights (tools/dungeon/fight.mjs) found as a shape with a bad number in it.
//   node --test tests/hero-shots.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { install, stepShotX } from '../src/sim/heroskills.js';

install({ fightable: () => false });
const DT = 1 / 120;
const world = { rayBoxes: () => -1, height: () => 0 };

// A thrower running off at `run` m/s, and the board he threw `ahead` of him, coming home.
function chase(o, run, secs) {
  const owner = { x: 0, y: 0, z: 0, dead: false, fxOk: () => false, handPos: () => [owner.x, 1.2, owner.z] };
  const w = { sim: { world }, targets: [] };
  let caught = 0, top = 0;
  const s = { kind: 'x', owner, t: 0, life: 1, r: 0.6, hitSet: new Set(), size: 1, x: 0, y: 1.2, z: 6, vx: 0, vy: 0, vz: 17, ret: true, skim: true, caught: () => { caught = s.t; }, ...o };
  for (let t = 0; t < secs && !s.done; t += DT) {
    owner.z -= run * DT;
    s.t += DT;
    stepShotX(w, s, DT);
    top = Math.max(top, Math.hypot(s.vx, s.vy, s.vz));
    for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz']) assert.ok(Number.isFinite(Math.fround(s[k])), `${k} went to ${s[k]}`);
  }
  return { caught, top, s };
}

test('a thrown board comes home at its own pace, however long it is out', () => {
  // The paladin's (backV 0.85, v) and the lancer's (backV 1), and one with neither: each overdue, its thrower running.
  for (const o of [{ v: 17, backV: 0.85 }, { v: 17, backV: 1 }, {}]) {
    const { top, caught, s } = chase(o, 9, 6);
    assert.ok(top < 17 * 1.6 + 0.01, `${JSON.stringify(o)}: up to ${top.toFixed(1)} m/s`);
    assert.ok(caught || s.done, `${JSON.stringify(o)}: never ended`);
  }
});
