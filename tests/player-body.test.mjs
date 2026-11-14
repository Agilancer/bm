// Your own body in the third-person view (src/sim/playerbody.js), with no GPU: it stands on the ground, holds what it's
// given where a hand is, wears the shield on its back only with the skull in hand and off the board, rides the board with
// its arms out and its wrists straight, and its casts move the arms without lifting the feet. And the view is locked in Lisandra's cave (src/core/third.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PlayerBody } from '../src/sim/playerbody.js';
import { C_PALETTE, C_PROPS, MAX_CHARS, MAX_JOINTS } from '../src/core/layout.js';
import { quatRotate } from '../src/core/math.js';
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

// An arm as it lies: the elbow's bend (0 straight), the hand off its forearm's own line, and the hand turned about that
// line from how the forearm has it (all of which is in the wrist's skin: the forearm's can't turn along its length). Rad.
function arm(body, side) {
  const A = body.arms[side], { wq, wt } = body.rig, bq = body.bq;
  const p = (j) => [wt[j * 3], wt[j * 3 + 1], wt[j * 3 + 2]], q = (a, j) => [a[j * 4], a[j * 4 + 1], a[j * 4 + 2], a[j * 4 + 3]];
  const unit = (a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d); return d.map((v) => v / l); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const inv = (a) => [-a[0], -a[1], -a[2], a[3]];
  const u = unit(p(A.up), p(A.lo)), l = unit(p(A.lo), p(A.hand)), f = [0, 0, 0];
  quatRotate(f, 0, wq, A.hand * 4, A.fL, 0);
  // (The hand's turn from the bind, in the forearm's: its part about the forearm's own line.)
  const rel = mul(inv(mul(q(wq, A.lo), inv(q(bq, A.lo)))), mul(q(wq, A.hand), inv(q(bq, A.hand))));
  let wring = 2 * Math.atan2(dot(rel, A.dirL), rel[3]);
  if (wring > Math.PI) wring -= 2 * Math.PI; else if (wring < -Math.PI) wring += 2 * Math.PI;
  return { elbow: Math.acos(Math.min(1, dot(u, l))), bend: Math.acos(Math.max(-1, Math.min(1, dot(l, f)))), wring: Math.abs(wring), wrist: p(A.hand), elbowAt: p(A.lo) };
}
const DEG = 180 / Math.PI;

test('on the board: the leading arm out for balance, the right hand as it carries the staff whether the staff is in it or not', () => {
  const head = 0.7, h = [Math.sin(head), 0, Math.cos(head)];
  const along = (p, s, d) => (p[0] - s.x) * d[0] + (p[2] - s.z) * d[2];
  const board = (o) => ({ hx: h[0], hz: h[2], nx: 0, ny: 1, nz: 0, tilt: 0, air: false, ...o });
  const ways = { level: {}, 'onto his toes': { tilt: 1 }, 'onto his heels': { tilt: -1 }, 'in the air': { air: true } };
  // With nothing in his hands (put away, as they are on a ride out of a fight), and with the staff out.
  const seen = {};
  for (const [name, o] of Object.entries(ways)) {
    const ride = (stow) => { const body = make(), s = state({ vx: h[0] * 9, vz: h[2] * 9, stow, onGround: !o.air, surf: board(o) }); settle(body, s); return { body, s, L: arm(body, 'L'), R: arm(body, 'R') }; };
    const away = ride(1), out = ride(0), { L, R, s } = away;
    assert.ok(L.elbow * DEG > 25 && L.elbow * DEG < 100, `${name}: the leading elbow is bent ${(L.elbow * DEG).toFixed(0)} degrees`);
    assert.ok(L.bend * DEG < 12, `${name}: the leading hand is ${(L.bend * DEG).toFixed(0)} degrees off its forearm`);
    assert.ok(L.wring * DEG < 35, `${name}: the leading wrist is wrung ${(L.wring * DEG).toFixed(0)} degrees`);
    assert.ok(L.wrist[1] - s.y > 0.6, `${name}: the leading hand is up off his knees (${(L.wrist[1] - s.y).toFixed(2)})`);
    assert.ok(along(L.wrist, s, h) > 0.3, `${name}: the leading hand is out over the nose`);
    // The right hand: the staff's hold, at his hip, with or without the staff (the owner's ask, 2026-11-13).
    assert.ok(dist(R.wrist, out.R.wrist) < 0.03, `${name}: the empty right hand is ${(dist(R.wrist, out.R.wrist) * 100).toFixed(1)} cm from where it carries the staff`);
    assert.ok(R.elbow * DEG > 40 && R.elbow * DEG < 100, `${name}: the right elbow is bent ${(R.elbow * DEG).toFixed(0)} degrees`);
    assert.ok(R.bend * DEG < 32 && R.wring * DEG < 35, `${name}: the right wrist is bent ${(R.bend * DEG).toFixed(0)} and wrung ${(R.wring * DEG).toFixed(0)} degrees`);
    assert.ok(away.body.arms.R.pose.curl > 1.1, `${name}: the right hand is shut as on the staff (${away.body.arms.R.pose.curl.toFixed(2)})`);
    seen[name] = { L, s };
  }
  // A lean moves the leading hand: onto his toes it goes down, onto his heels up.
  const { L } = seen.level;
  assert.ok(seen['onto his toes'].L.wrist[1] < L.wrist[1] - 0.08, 'onto his toes: leading hand down');
  assert.ok(seen['onto his heels'].L.wrist[1] > L.wrist[1] + 0.04, 'onto his heels: leading hand up');
});

test('on the board with the staff and the skull: a level grip, the staff\'s foot clear of the hill, the skull held out ahead', () => {
  const head = 0.7, h = [Math.sin(head), 0, Math.cos(head)], toes = [-h[2], 0, h[0]];
  // The ground as it lies: level, and 20 degrees down ahead, up ahead, and up to either side.
  const lie = (x, z) => { const l = Math.hypot(x, 1, z); return [x / l, 1 / l, z / l]; }, t = Math.tan(20 / DEG);
  const grounds = { level: [0, 1, 0], downhill: lie(h[0] * t, h[2] * t), uphill: lie(-h[0] * t, -h[2] * t), 'up to his toes': lie(-toes[0] * t, -toes[2] * t), 'up to his heels': lie(toes[0] * t, toes[2] * t) };
  for (const [name, n] of Object.entries(grounds)) {
    for (const tilt of [0, 1, -1]) {
      const body = make(), s = state({ vx: h[0] * 9, vz: h[2] * 9, surf: { hx: h[0], hz: h[2], nx: n[0], ny: n[1], nz: n[2], tilt, air: false } });
      const snap = settle(body, s), staff = prop(snap, 0), R = arm(body, 'R'), Lh = arm(body, 'L');
      const up = [staff[4], staff[5], staff[6]].map((v) => v / Math.hypot(staff[4], staff[5], staff[6]));
      // Its foot (1.14 m under the fist) over the ground's own plane.
      const foot = [staff[12] - up[0] * 1.14 - s.x, staff[13] - up[1] * 1.14 - s.y, staff[14] - up[2] * 1.14 - s.z];
      const over = foot[0] * n[0] + foot[1] * n[1] + foot[2] * n[2];
      assert.ok(over > 0.08, `${name}, lean ${tilt}: the staff's foot is ${over.toFixed(2)} m over the ground`);
      assert.ok(up[0] * h[0] + up[2] * h[2] > 0.5, `${name}, lean ${tilt}: its head is the way he's going`);
      assert.ok(dist(staff.slice(12, 15), at(body, 'R_Hand')) < 0.14, 'the staff is in the right fist');
      assert.ok(R.bend * DEG < 32 && R.wring * DEG < 35, `${name}, lean ${tilt}: the staff's wrist is bent ${(R.bend * DEG).toFixed(0)} and wrung ${(R.wring * DEG).toFixed(0)} degrees`);
      assert.ok(R.elbow * DEG > 40 && R.elbow * DEG < 100, `${name}, lean ${tilt}: the staff's elbow is bent ${(R.elbow * DEG).toFixed(0)} degrees`);
      assert.ok(Lh.bend * DEG < 20 && Lh.wring * DEG < 35, `${name}, lean ${tilt}: the skull's wrist is bent ${(Lh.bend * DEG).toFixed(0)} and wrung ${(Lh.wring * DEG).toFixed(0)} degrees`);
      if (name === 'level' && !tilt) {
        const skull = prop(snap, 1), knee = at(body, 'L_Calf');
        assert.ok(skull[13] > knee[1] + 0.25, `the skull is held up off his knee (${(skull[13] - knee[1]).toFixed(2)} m over it)`);
        assert.ok((skull[8] * h[0] + skull[10] * h[2]) / Math.hypot(skull[8], skull[9], skull[10]) > 0.8, 'and looks the way the board is going');
      }
    }
  }
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
