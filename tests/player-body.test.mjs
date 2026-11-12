// Your own body in the third-person view (src/sim/playerbody.js), with no GPU: it stands on the ground, holds what it's
// given where a hand is, wears the shield on its back only with the skull in hand and off the board, and its casts move
// the arms without lifting the feet. And the view is locked in Lisandra's cave (src/core/third.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PlayerBody } from '../src/sim/playerbody.js';
import { C_PALETTE, C_PROPS, MAX_CHARS, MAX_JOINTS } from '../src/core/layout.js';
import { OPENING } from '../src/core/opening.js';
import { thirdAllowed } from '../src/core/third.js';

const file = readFileSync(new URL('../assets/game/player/wizard.glb', import.meta.url));
const make = () => new PlayerBody(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const state = (o = {}) => ({ x: 3, y: 1, z: -2, yaw: 0.7, pitch: 0, vx: 0, vz: 0, onGround: true, sprinting: false, dodge: 0, dead: false, deadT: 0, staff: true, skull: true, shield: true, guard: 0, surf: null, cast: null, staffHead: 0.5, ...o });
function settle(body, s, secs = 1.5, each) {
  const snap = new Float32Array(C_PROPS + 48 + 8);
  for (let i = 0; i < secs * 60; i++) { const st = typeof s === 'function' ? s(i / 60) : s; body.update(1 / 60, st); body.write(snap, 0, true); each?.(snap, i / 60); }
  return snap;
}
const at = (body, name) => { const j = body.rig.index.get(name) * 3; return [body.rig.wt[j], body.rig.wt[j + 1], body.rig.wt[j + 2]]; };
const prop = (snap, k) => Array.from(snap.subarray(C_PROPS + k * 16, C_PROPS + k * 16 + 16));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('the body fits a character slot', () => {
  const body = make();
  assert.ok(body.count <= MAX_JOINTS, `${body.count} joints`);
  assert.ok(MAX_CHARS >= 1);
  for (const clip of ['walk', 'run', 'death']) assert.ok(body.rig.clips[clip], clip);
});

test('standing: feet on the ground, eyes at the first-person eye, every joint a real number', () => {
  const body = make(), s = state(), snap = settle(body, s);
  for (let i = C_PALETTE; i < C_PALETTE + body.count * 8; i++) assert.ok(Number.isFinite(snap[i]), `palette ${i}`);
  for (const foot of ['L_Foot', 'R_Foot']) { const y = at(body, foot)[1] - s.y; assert.ok(y > 0.05 && y < 0.25, `${foot} ${y.toFixed(3)} m up`); }
  const eye = at(body, 'L_Eye');
  assert.ok(Math.abs(eye[1] - s.y - 1.62) < 0.04, `eye at ${(eye[1] - s.y).toFixed(3)}`);
  assert.ok(Math.hypot(eye[0] - s.x, eye[2] - s.z) < 0.2, 'stood where the player is');
});

test('the staff is in the right fist, upright, and the skull under the left hand', () => {
  const body = make(), s = state(), snap = settle(body, s);
  const staff = prop(snap, 0), skull = prop(snap, 1);
  assert.equal(staff[15], 1); assert.equal(skull[15], 1);
  assert.ok(dist(staff.slice(12, 15), at(body, 'R_Hand')) < 0.14, 'the staff is at the right hand');
  assert.ok(staff[5] > 0.85, `the staff stands up (${staff[5].toFixed(2)})`);
  const hand = at(body, 'L_Hand'), sk = skull.slice(12, 15);
  assert.ok(dist(sk, hand) < 0.25, 'the skull is at the left hand');
  assert.ok(sk[1] < hand[1], 'and hangs under it');
  assert.ok(skull[5] > 0.8, 'crown up');
  // Its face the way he does.
  const face = [skull[8], skull[9], skull[10]];
  assert.ok(face[0] * Math.sin(s.yaw) + face[2] * Math.cos(s.yaw) > 0.8 * Math.hypot(...face), 'the skull looks ahead');
});

test('the shield: on the back with a skull in hand, on the arm without, under the feet on a ride', () => {
  const body = make();
  let s = state(), snap = settle(body, s);
  const back = prop(snap, 2), spine = at(body, 'Spine02');
  assert.equal(back[15], 1, 'on the back');
  const behind = (back[12] - spine[0]) * Math.sin(s.yaw) + (back[14] - spine[2]) * Math.cos(s.yaw);
  assert.ok(behind < -0.1 && behind > -0.35, `behind the spine (${behind.toFixed(2)})`);
  // Leaned over: its point (the model's -y) down, and off to one side.
  const down = [-back[4], -back[5], -back[6]];
  assert.ok(down[1] < -0.7, 'the point is toward the ground');
  assert.ok(Math.hypot(down[0], down[2]) > 0.3, 'at an angle');
  s = state({ skull: false }); snap = settle(make(), s);
  assert.equal(prop(snap, 2)[15], 0, 'not on the back without the skull');
  assert.equal(prop(snap, 1)[15], 1, 'on the arm');
  const riding = make();
  s = state({ vz: 9, surf: { hx: Math.sin(0.7), hz: Math.cos(0.7), nx: 0, ny: 1, nz: 0, tilt: 0, air: false } }); snap = settle(riding, s);
  const board = prop(snap, 2);
  assert.equal(board[15], 1, 'the board is there');
  assert.ok(board[13] - s.y < 0.2 && board[9] > 0.95, 'flat, under him');
  for (const foot of ['L_Foot', 'R_Foot']) {
    const f = at(riding, foot);
    assert.ok(f[1] - s.y > 0.15 && f[1] - s.y < 0.4, `${foot} on the board (${(f[1] - s.y).toFixed(2)})`);
    assert.ok(Math.hypot(f[0] - s.x, f[2] - s.z) < 0.45, `${foot} over it`);
  }
  assert.ok(at(riding, 'Head')[1] - s.y < 1.5, 'knees bent');
});

test('walking and running keep the feet under him and the staff off the ground', () => {
  for (const speed of [1.3, 5.6, 8.6]) {
    const body = make(), s = state({ vx: Math.sin(0.7) * speed, vz: Math.cos(0.7) * speed, sprinting: speed > 8 });
    let low = Infinity, butt = Infinity;
    settle(body, s, 3, (snap, t) => {
      if (t < 1) return;
      low = Math.min(low, at(body, 'L_ToeBase')[1] - s.y, at(body, 'R_ToeBase')[1] - s.y);
      const m = prop(snap, 0); butt = Math.min(butt, m[13] - m[5] * 1.0 - s.y);
    });
    assert.ok(low > -0.06, `at ${speed} m/s a toe goes ${low.toFixed(3)} under the ground`);
    if (speed > 3) assert.ok(butt > 0, `at ${speed} m/s the staff's foot drags (${butt.toFixed(2)})`);
  }
});

test('a cast moves the arms and leaves the feet where they were', () => {
  const kinds = [['shot', 1], ['throw', 1], ['throw', 2], ['raise', 1], ['raise', 2]];
  for (const [kind, hands] of kinds) {
    const body = make(), s = state();
    settle(body, s);
    const feet = [at(body, 'L_Foot'), at(body, 'R_Foot')], hand = at(body, 'R_Hand'), left = at(body, 'L_Hand');
    settle(body, state({ cast: { kind, hands, wind: 1, hit: 1, w: 1, shake: 0 } }), 0.5);
    assert.ok(dist(at(body, 'R_Hand'), hand) > 0.15, `${kind} ${hands}: the right hand moves`);
    if (hands === 2) assert.ok(dist(at(body, 'L_Hand'), left) > 0.15, `${kind} ${hands}: and the left`);
    else assert.ok(dist(at(body, 'L_Hand'), left) < 0.12, `${kind} ${hands}: the left keeps the skull`);
    assert.ok(dist(at(body, 'L_Foot'), feet[0]) < 0.03 && dist(at(body, 'R_Foot'), feet[1]) < 0.03, `${kind} ${hands}: the feet stay`);
    if (kind === 'raise') assert.ok(at(body, 'R_Hand')[1] > hand[1] + 0.4, 'raised overhead');
    if (kind === 'throw') { const d = at(body, 'R_Hand'); assert.ok((d[0] - hand[0]) * Math.sin(s.yaw) + (d[2] - hand[2]) * Math.cos(s.yaw) > 0.1, 'thrown out ahead'); }
    assert.ok(body.staffTip.every(Number.isFinite) && body.palmL.every(Number.isFinite));
  }
});

test('nothing is drawn when the view is first person', () => {
  const body = make(), snap = new Float32Array(C_PROPS + 64);
  body.update(1 / 60, state()); body.write(snap, 0, false);
  assert.equal(snap[0], 0);
});

test('no third person in Lisandra\'s cave: only once you are out', () => {
  for (const stage of [OPENING.WAKE, OPENING.NAME, OPENING.HERD, OPENING.LEAVE, OPENING.COLLAPSE]) assert.equal(thirdAllowed(stage), false, `stage ${stage}`);
  for (const stage of [OPENING.OFF, OPENING.ESCORT, OPENING.ARRIVED]) assert.equal(thirdAllowed(stage), true, `stage ${stage}`);
});

test('put away, out of a fight: the staff on the back under the shield, the skull at the left hip, both hands empty', () => {
  const body = make(), s = state({ stow: 1 }), snap = settle(body, s);
  const staff = prop(snap, 0), skull = prop(snap, 1), shield = prop(snap, 2), spine = at(body, 'Spine02'), hip = at(body, 'Hip');
  const fwd = [Math.sin(s.yaw), 0, Math.cos(s.yaw)], left = [Math.cos(s.yaw), 0, -Math.sin(s.yaw)];
  const rel = (m, o, d) => (m[12] - o[0]) * d[0] + (m[14] - o[2]) * d[2];
  assert.equal(staff[15], 1); assert.equal(skull[15], 1); assert.equal(shield[15], 1);
  // The staff: behind the spine, well off the right hand, standing nearly upright, and nearer his back than the shield is.
  assert.ok(rel(staff, spine, fwd) < -0.08, 'the staff is behind him');
  assert.ok(dist(staff.slice(12, 15), at(body, 'R_Hand')) > 0.3, 'and out of his hand');
  assert.ok(staff[5] > 0.9, `nearly upright (${staff[5].toFixed(2)})`);
  assert.ok(rel(shield, spine, fwd) < rel(staff, spine, fwd) - 0.02, 'the shield is over it');
  // The skull: at the left hip, crown up, below the belt and off the hand.
  assert.ok(rel(skull, hip, left) > 0.12 && rel(skull, hip, left) < 0.3, `at the left hip (${rel(skull, hip, left).toFixed(2)})`);
  assert.ok(Math.abs(skull[13] - hip[1]) < 0.15 && skull[5] > 0.8, 'hung at the hip, crown up');
  // With no skull the shield still goes to the back, and nothing's left on the arm.
  const bare = settle(make(), state({ stow: 1, skull: false }));
  assert.equal(prop(bare, 1)[15], 0, 'nothing on the arm');
  assert.equal(prop(bare, 2)[15], 1, 'the shield on the back');
  // And out again: in the hands as before.
  const out = settle(body, state({ stow: 0 }));
  assert.ok(dist(prop(out, 0).slice(12, 15), at(body, 'R_Hand')) < 0.14, 'the staff back in the right hand');
  assert.ok(dist(prop(out, 1).slice(12, 15), at(body, 'L_Hand')) < 0.25, 'the skull back under the left');
});
