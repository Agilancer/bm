// How the other Tessariels hold what they carry when they aren't striking (src/sim/hero.js: carryAim, poseLance, poseReady),
// run with no page on the real bodies: a lance at ease, a board between blows, a bow between shots, a swordsman's empty hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage } from './hero-stage.mjs';

const joint = (h, j) => [h.pose.wt[j * 3], h.pose.wt[j * 3 + 1], h.pose.wt[j * 3 + 2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
// How far a point is from the line through `o` along the unit `d`.
const off = (p, o, d) => { const v = sub(p, o), t = v[0] * d[0] + v[1] * d[1] + v[2] * d[2]; return len([v[0] - d[0] * t, v[1] - d[1] * t, v[2] - d[2] * t]); };
// The weapon in the main hand: where its grip is, and the way it lies (its point's way).
const main = (h) => { const m = h.propMatrices; return { at: [m[12], m[13], m[14]], way: [m[4], m[5], m[6]] }; };

test('a lancer at ease: standing, the lance is grounded by his foot with his hand on the shaft; walking, it lies on his shoulder', () => {
  const { hero, step } = stage('lancer', 30, 0);
  hero.task = { kind: 'town', peace: true }; hero.hold = 1e9; hero.goal = null;
  step(3);
  const P = hero.mainP, u = hero.rig.height / 1.8;
  {
    const { at, way } = main(hero), butt = at[1] - way[1] * P.butt, fist = hero.handPos('r');
    assert.ok(way[1] > 0.97, `standing, the lance is upright (${way[1].toFixed(2)})`);
    assert.ok(Math.abs(butt - hero.y) < 0.06, `its butt is on the ground (${(butt - hero.y).toFixed(2)} m off it)`);
    assert.ok(fist[1] - hero.y > 1.0 * u && fist[1] - hero.y < 1.45 * u, `his hand is on it at his chest (${(fist[1] - hero.y).toFixed(2)} m up)`);
    assert.ok(off(fist, at, way) < 0.14, `and on the shaft (${off(fist, at, way).toFixed(2)} m off it)`);
    assert.ok(hero.lanceAway < 0.05, 'not on his back');
  }
  // Off down the road.
  hero.hold = 0; hero.goal = { x: 80, z: 0, speed: 1.8, stop: 0.5 };
  let worst = 0;
  step(3);
  step(3, () => {
    const { at, way } = main(hero), f = [Math.sin(hero.yaw), 0, Math.cos(hero.yaw)];
    assert.ok(way[1] > 0.6 && way[1] < 0.95, `walking, the lance is sloped (${way[1].toFixed(2)} up)`);
    assert.ok(way[0] * f[0] + way[2] * f[2] < -0.3, 'its point behind him');
    assert.ok(at[1] + way[1] * P.reach - hero.y > 2.4, 'and over his head');
    worst = Math.max(worst, off(joint(hero, hero.arms.r.u), at, way));
  });
  assert.ok(hero.speed > 1, 'he is walking');
  assert.ok(worst < 0.3, `it lies over his right shoulder the whole way (${worst.toFixed(2)} m off it at worst)`);
});

test('a paladin with a mace and a board keeps the board up before him between blows, short of a block', () => {
  const { hero, foes, step } = stage('paladin:sword_board', 30, 1);
  assert.equal(hero.style, 'sword_board');
  foes[0].x = 2.2; hero.foe = foes[0]; hero.gcd = 1e9; hero.shotCd = 1e9; for (const q of hero.skills) q.t = 1e9;
  step(2);
  assert.ok(hero.shieldUp > 0.45 && hero.shieldUp < 0.6, `the board is up, and not a block (${hero.shieldUp.toFixed(2)})`);
  const m = hero.propMatrices, pel = joint(hero, hero.J.pelvis), f = [Math.sin(hero.yaw), Math.cos(hero.yaw)];
  const ahead = (m[16 + 12] - pel[0]) * f[0] + (m[16 + 14] - pel[2]) * f[1];
  assert.ok(ahead > 0.2, `it is before him (${ahead.toFixed(2)} m)`);
  assert.ok(m[16 + 13] - hero.y > 0.9, `at his chest, not hanging at his side (${(m[16 + 13] - hero.y).toFixed(2)} m up)`);
});

test('an archer between shots holds the bow low before her on a bent arm, not out at arm\'s length', () => {
  const { hero, foes, step } = stage('archer', 30, 1);
  // (No shot let go: stood to her foe with the bow in her hand, as she is between them.)
  foes[0].x = 9; hero.foe = foes[0]; hero.gcd = 1e9; hero.shotCd = 1e9; for (const q of hero.skills) q.t = 1e9;
  let seen = 0, straight = 0, far = 0;
  step(2);
  step(3, () => {
    hero.hold = 1e9;                                    // (stood where she is: nothing to walk round)
    if (hero.swing || hero.bowW > 0.02 || hero.readyW < 0.97) return;
    seen++;
    const A = hero.arms.l, sh = joint(hero, A.u), el = joint(hero, A.f), ha = joint(hero, A.h);
    const a = sub(sh, el), b = sub(ha, el), bend = Math.acos((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b)));
    straight = Math.max(straight, bend);
    far = Math.max(far, len(sub(ha, sh)) / hero.armLen('l'));
    assert.ok(ha[1] < sh[1], 'the bow hand is below her shoulder');
  });
  assert.ok(seen > 60, `she stands between shots some of the time (${seen} ticks)`);
  assert.ok(straight < 2.5, `her bow arm is bent (${(straight * 57.3).toFixed(0)} degrees at the elbow at its straightest)`);
  assert.ok(far < 0.9, `and not reached out (${(far * 100).toFixed(0)}% of its length)`);
});

test('a bard with a sword keeps his empty hand in by his hip between blows, and has both hands for the lute after', () => {
  const { hero, foes, step } = stage('bard', 30, 1);
  foes[0].x = 1.8; hero.foe = foes[0]; hero.gcd = 1e9; hero.shotCd = 1e9; for (const q of hero.skills) q.t = 1e9;
  step(2.5);
  assert.ok(hero.readyW > 0.9);
  const ha = hero.handPos('l'), pel = joint(hero, hero.J.pelvis), f = [Math.sin(hero.yaw), Math.cos(hero.yaw)];
  const ahead = (ha[0] - pel[0]) * f[0] + (ha[2] - pel[2]) * f[1];
  assert.ok(ahead < 0.3, `the hand is not held out before him (${ahead.toFixed(2)} m ahead of his hips)`);
  assert.ok(ha[1] - pel[1] < 0.2, `it is down by his hip (${(ha[1] - pel[1]).toFixed(2)} m over it)`);
  // The fight over: nothing of it is left in the arm.
  foes[0].x += 900; foes[0].aggro = false; hero.foe = null; hero.task = { kind: 'town', peace: true }; hero.hold = 1e9;
  step(1.5);
  assert.ok(hero.readyW < 0.02, 'let go when the fight is');
});
