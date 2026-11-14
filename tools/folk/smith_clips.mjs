// The smith's own clips, made here and not taken from Lisandra's: nothing she has swings a hammer down onto an anvil, works
// a pair of bellows, or holds a blade to a grindstone. Each is made at one of his stations (src/folk/smithy.js STATIONS), in
// that station's own frame, by saying where each hand's tool has to be at each moment:
//
//   hammer        a blow on the anvil and the lift for the next, over and over; the face lands on FORGE.strike at blowAt,
//                 the iron held on the anvil's face in the tongs
//   hammer_hold   standing with the hammer at his side between heats, the iron held up to look at
//   hammer_take   his hand out to the handle where it lies on the anvil (takeAt), and up with it; backwards, he lays it down
//   anvil_set     the iron laid on the anvil's face; backwards, lifted off it
//   tongs_carry   how the tongs are held between one thing and the next: laid over his walk and his standing
//   tongs_take    his left hand to the tongs where they lie across the hearth's edge (tongsAt); backwards, he leaves them
//   bellows       a pull on the bellows' rope and the let-up, over and over (pumpAt), the iron held in the coals
//   fire_draw     the iron out of the fire and up before him; backwards, back into it
//   quench        the iron down into the slack tub (quenchAt), stirred, and out
//   file_take, blade_take, rag_take   his right hand to each where it lies (takeAt), as the hammer
//   file          the file drawn along the blade where it lies on the bench, his other hand holding it down
//   grind         the blade held across the turning stone in both hands, worked along it
//   polish        the rag worked round the axe's blade, his other hand on its haft
//
// They're worked out on Homunculus's own body (assets/game/folk/smith.glb): where a tool has to be, the arm bent to put the
// hand there, his back into it, and then written as turns of Lisandra's bones like every other clip, so the game plays them
// as it plays the rest (src/folk/rig.js). How his hands hold things, and where everything stands, are src/folk/smithy.js's,
// which the game reads too.
//
// Also drops the clips nobody uses any more (DROPPED), and packs the file again without them.
//
//   node tools/folk/smith_clips.mjs          writes assets/game/folk/clips.json and clips.bin
//   node tools/folk/smith_clips.mjs --check  only says how near each tool comes to where it's meant to be
//
// Run it after tools/folk/pack_clips.py, which knows nothing of these.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { quatFromMat3 } from '../../src/core/math.js';
import { FolkClips, FolkRig, FolkPose } from '../../src/folk/rig.js';
import { PEOPLE } from '../../src/folk/people.js';
import { BENCH, BLADE, FILE, FIRE, FORGE, HAMMER, HAMMER_REST, RACK, RAG_BELT, REST_AT, SMITH_CLIPS, TONGS, TUB, WHEEL, gripOf, hammerQuat, pullGrip, pumpAt } from '../../src/folk/smithy.js';

const DROPPED = ['push', 'cleave'];
const FPS = 30;
const dir = new URL('../../assets/game/folk/', import.meta.url);
const bytes = (f) => { const b = readFileSync(new URL(f, dir)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const meta = JSON.parse(readFileSync(new URL('clips.json', dir), 'utf8'));
const bin = bytes('clips.bin');
const clips = new FolkClips(meta, bin);
const smith = PEOPLE.find((p) => p.id === 'homunculus');
const rig = new FolkRig(parseGLB(bytes('smith.glb')), clips, { armOut: smith.armOut });
const pose = new FolkPose(rig);

// ---- a little vector and quaternion arithmetic ([x, y, z] and [x, y, z, w]) ----
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const conj = (q) => [-q[0], -q[1], -q[2], q[3]];
const qunit = (q) => { const l = 1 / (Math.hypot(...q) || 1); return q.map((x) => x * l); };
const rot = (q, v) => {
  const t = mul(cross(q, v), 2);
  return add(add(v, mul(t, q[3])), cross(q, t));
};
const axisAngle = (a, deg) => { const r = deg * Math.PI / 360, s = Math.sin(r); return [a[0] * s, a[1] * s, a[2] * s, Math.cos(r)]; };
const nlerp = (a, b, t) => { const s = dot(a, b) + a[3] * b[3] < 0 ? -1 : 1; return qunit(a.map((x, i) => x * (1 - t) + b[i] * s * t)); };
const frame = (x, y) => { const z = cross(x, y); return quatFromMat3([...x, ...y, ...z]); };
const at4 = (a, j) => [a[j * 4], a[j * 4 + 1], a[j * 4 + 2], a[j * 4 + 3]];
const at3 = (a, j) => [a[j * 3], a[j * 3 + 1], a[j * 3 + 2]];
const smooth = (x) => x * x * (3 - 2 * x);

// ---- her skeleton, and a pose as each bone's turn from its rest in the world (the thing every body shares) ----
const N = clips.count;
const her = (n) => clips.index.get(`mixamorig:${n}`);
const below = (root) => { const out = []; for (let j = 0; j < N; j++) for (let k = j; k >= 0; k = clips.parent[k]) if (k === root) { out.push(j); break; } return out; };
const restQ = (j) => at4(clips.rest.q, j);

// A clip of hers at time t: every bone's turn from rest, and her hips.
function turnsOf(name, t) {
  const local = new Float32Array(clips.restR), hips = [0, 0, 0];
  clips.sample(clips.clips[name], t, local, hips);
  const world = [], D = [];
  for (let j = 0; j < N; j++) {
    const p = clips.parent[j];
    world[j] = p < 0 ? at4(local, j) : qmul(world[p], at4(local, j));
    D[j] = qmul(world[j], conj(restQ(j)));
  }
  return { D, hips };
}

// Back to her bones' own turns, as a clip stores them.
function localsOf(D) {
  const out = new Float32Array(N * 4);
  for (let j = 0; j < N; j++) {
    const p = clips.parent[j], w = qmul(D[j], restQ(j));
    out.set(qunit(p < 0 ? w : qmul(conj(qmul(D[p], restQ(p))), w)), j * 4);
  }
  return out;
}

// ---- his two arms, in his own rig: the joints, how long the bones are, which way they lie and bend at rest, how the hand holds ----
const sj = (n) => rig.index.get(`mixamorig:${n}`);
const rp = (j) => at3(rig.rest.t, j);
const ARMS = [0, 1].map((side) => {
  const name = side ? 'Right' : 'Left', grip = gripOf(rig, side);
  const S = { arm: sj(`${name}Arm`), fore: rig.fore[side], hand: rig.hands[side] };
  // (An elbow bends the forearm forwards from where every body's bound, arms out.)
  const restFrame = (a, b) => { const d = unit(sub(rp(b), rp(a))); return frame(d, unit(cross(d, [0, 0, 1]))); };
  const HAND = her(`${name}Hand`);
  return {
    side, grip, S, L1: Math.hypot(...sub(rp(S.fore), rp(S.arm))), L2: Math.hypot(...sub(rp(S.hand), rp(S.fore))),
    REST_UPPER: restFrame(S.arm, S.fore), REST_FORE: restFrame(S.fore, S.hand), REST_TOOL: hammerQuat(grip.k, grip.f),
    POLE: [side ? -0.55 : 0.55, -0.7, -0.45],     // the elbow: down, out, and behind
    // Fingers shut round a handle: each joint turned about the knuckle line, towards the palm.
    CURL: dot(cross(grip.k, grip.f), grip.palm) > 0 ? grip.k : mul(grip.k, -1),
    FINGERS: ['Index', 'Middle', 'Ring', 'Pinky'].map((f) => [1, 2, 3, 4].map((i) => her(`${name}Hand${f}${i}`))),
    HAND, ARM: her(`${name}Arm`), FORE: her(`${name}ForeArm`), HAND_SUB: below(HAND),
  };
});
const [LEFT, RIGHT] = ARMS;
if (process.argv.includes('--check')) console.log(`his arms: ${ARMS.map((A) => `${(A.L1 + A.L2).toFixed(3)} m from ${rp(A.S.arm).map((x) => x.toFixed(2)).join(' ')}`).join('; ')}; hips at ${rp(rig.hips).map((x) => x.toFixed(2)).join(' ')}`);

// The smith in that pose, standing at a station's origin: where each hand's tool is, and his shoulders.
function stand(D, hips) {
  pose.sa.set(localsOf(D));
  pose.ha.set(hips);
  pose.fk(0, 0, 0, 0);
  return ARMS.map((A) => { const wq = at4(pose.wq, A.S.hand); return { q: qmul(wq, A.grip.q), g: add(at3(pose.wt, A.S.hand), rot(wq, A.grip.t)), shoulder: at3(pose.wt, A.S.arm), wq }; });
}

// An arm put where its tool has to be. D0: the pose so far (the back already leant); want: { g, q } of the tool's grip; arm:
// how much of this over the pose's own arm (0-1); fist: how far the fingers are shut (0-1); pole: where the elbow's drawn to.
function reachArm(D0, D, hips, A, want) {
  const arm = want.arm ?? 1, fist = want.fist ?? 1, pole = want.pole || A.POLE;
  let target = want.g;
  for (let pass = 0; pass < 6; pass++) {
    const sh = stand(D0, hips)[A.side].shoulder;
    const dHand = qmul(want.q, conj(A.REST_TOOL));
    const wrist = sub(target, rot(dHand, A.grip.at));
    let sw = sub(wrist, sh), d = Math.hypot(...sw);
    const dn = unit(sw);
    d = Math.min(A.L1 + A.L2 - 0.004, Math.max(Math.abs(A.L1 - A.L2) + 0.004, d));
    const a = (A.L1 * A.L1 - A.L2 * A.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.L1 * A.L1 - a * a));
    const u = unit(sub(pole, mul(dn, dot(pole, dn))));
    const elbow = add(sh, add(mul(dn, a), mul(u, h))), to = add(sh, mul(dn, d));
    const n = unit(cross(dn, mul(u, -1)));
    const upper = unit(sub(elbow, sh)), fore = unit(sub(to, elbow));
    const set = (j, q) => { D[j] = arm >= 1 ? q : nlerp(D0[j], q, arm); };
    set(A.ARM, qmul(frame(upper, unit(cross(cross(upper, n), upper))), conj(A.REST_UPPER)));
    set(A.FORE, qmul(frame(fore, unit(cross(cross(fore, n), fore))), conj(A.REST_FORE)));
    // The hand, and all its fingers carried with it as they were.
    const carry = qmul(dHand, conj(D0[A.HAND]));
    for (const j of A.HAND_SUB) set(j, qmul(carry, D0[j]));
    curl(D, fist, A);
    if (arm < 1) break;
    // (Judged with the other arm as it'll be: both are in D.)
    const got = stand(D, hips)[A.side];
    target = add(target, sub(want.g, got.g));
  }
}
function reach(D0, hips, wants) {
  const D = D0.slice();
  ARMS.forEach((A) => { const w = wants[A.side]; if (w) reachArm(D0, D, hips, A, w); });
  return D;
}

function curl(D, fist, A = RIGHT) {
  if (fist <= 0) return;
  const hand = D[A.HAND];
  for (const f of A.FINGERS) {
    [62, 150, 212, 212].forEach((deg, i) => { D[f[i]] = nlerp(D[f[i]], qmul(hand, axisAngle(A.CURL, deg)), fist); });
  }
}

// His back: bent forward by lean and turned by twist (degrees; a twist to his left is +), shared out up the spine, his head
// brought part of the way back up to look at the work, and turned by look (degrees, + to his left).
function bend(D, lean, twist, look = 0) {
  // (Most of the lean low down, where a man bends over his work; the turn evenly.)
  [['Spine', 0.6], ['Spine1', 0.2], ['Spine2', 0.2]].forEach(([s, share]) => {
    const part = qmul(axisAngle([1, 0, 0], lean * share), axisAngle([0, 1, 0], twist / 3));
    for (const j of below(her(s))) D[j] = qmul(part, D[j]);
  });
  const up = qmul(axisAngle([0, 1, 0], look), axisAngle([1, 0, 0], -lean * 0.4));
  for (const j of below(her('Neck'))) D[j] = qmul(up, D[j]);
  return D;
}

// ---- how a tool's held ----
// A handle along h, the hand's fingers lying towards c (made square to h). For either hand, grasp(h) has the fingers over
// the top of a handle that points away from him, the thumb's side leading: the palm to the middle.
const SIDEWAYS = [-1, 0, 0];
const hold = (h, c) => hammerQuat(unit(h), c);
const grasp = (h) => hold(h, cross(unit(h), SIDEWAYS));
const swing = grasp;      // (the hammer's face leading, down the arc of a blow)
const tk = (g, q, o = {}) => ({ g, q, arm: 1, fist: 1, ...o });
// A tool's grip when a point up its length (y) has to be at p, the tool turned q.
const gripAt = (p, q, y, off = [0, 0, 0]) => sub(p, rot(q, [off[0], y, off[2]]));

// ---- a path through keys ----
// keys: [t, key, ease, { R: via, L: via }]. A key: { lean, twist, look, R: { g, q, arm, fist }, L: the same }.
function mixHand(a, b, s, via) {
  if (!a && !b) return null;
  // (A hand with nothing asked of it at one end: it's let go into the pose's own arm there.)
  const A = a || { ...b, arm: 0, fist: 0 }, B = b || { ...a, arm: 0, fist: 0 };
  const g = via ? add(add(mul(A.g, (1 - s) * (1 - s)), mul(via, 2 * s * (1 - s))), mul(B.g, s * s)) : mix(A.g, B.g, s);
  const n = (k, d) => (A[k] ?? d) + ((B[k] ?? d) - (A[k] ?? d)) * s;
  return { g, q: nlerp(A.q, B.q, s), arm: n('arm', 1), fist: n('fist', 1), pole: A.pole || B.pole ? mix(A.pole || B.pole, B.pole || A.pole, s) : undefined };
}
function along(keys, t) {
  let i = 1;
  while (i < keys.length - 1 && t > keys[i][0]) i++;
  const [t0, a] = keys[i - 1], [t1, b, ease = smooth, via = {}] = keys[i];
  const s = ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))));
  const out = { R: mixHand(a.R, b.R, s, via.R), L: mixHand(a.L, b.L, s, via.L) };
  for (const k of ['lean', 'twist', 'look']) out[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * s;
  return out;
}

const made = {};
const report = [];

// One clip: frames of her bones' turns and her hips. at(t): { base: { D, hips }, lean, twist, look, R, L }.
function make(name, dur, loop, at) {
  const frames = Math.round(dur * FPS) + 1, rots = [], hips = [];
  let worst = 0, where = '';
  for (let f = 0; f < frames; f++) {
    const t = f / FPS, k = at(loop && f === frames - 1 ? 0 : t);
    const D = reach(bend(k.base.D.slice(), k.lean || 0, k.twist || 0, k.look || 0), k.base.hips, [k.L, k.R]);
    if (k.after) k.after(D);
    rots.push(localsOf(D)); hips.push(k.base.hips);
    const got = stand(D, k.base.hips);
    for (const A of ARMS) {
      const w = [k.L, k.R][A.side];
      if (!w || (w.arm ?? 1) < 1) continue;
      const off = Math.hypot(...sub(got[A.side].g, w.g));
      if (off > worst) { worst = off; where = `${A.side ? 'right' : 'left'} hand at ${t.toFixed(2)} s, wanted at ${w.g.map((x) => x.toFixed(2)).join(' ')}, its shoulder at ${got[A.side].shoulder.map((x) => x.toFixed(2)).join(' ')}`; }
    }
  }
  made[name] = { frames, dur: (frames - 1) / FPS, loop, rots, hips };
  report.push(`${name}: ${frames} frames, ${made[name].dur.toFixed(2)} s; the tools within ${(worst * 1000).toFixed(1)} mm of where they're meant to be${worst > 0.004 ? ` (${where})` : ''}`);
}

const ease2 = (x) => x * x;
const out3 = (x) => 1 - (1 - x) ** 3;
const lin = (x) => x;
const idle0 = turnsOf('idle_ual', 0);
const C = SMITH_CLIPS;
const still = (keys) => (t) => ({ ...along(keys, t), base: idle0 });
// Where a hand's tool is when the arm's just hanging in his standing pose: to start a reach from, and to end one at.
const SIDE = stand(idle0.D, idle0.hips).map((s) => ({ g: s.g, q: s.q, arm: 0, fist: 0 }));
const fistAtSide = (side) => ({ ...SIDE[side], fist: 1 });

// ---- the tongs, in his left hand ----
// Between one thing and the next: low at his side and a little forward, the iron out ahead of him and clear of his legs.
const CARRY = tk([0.34, 0.97, 0.2], grasp([-0.16, -0.1, 1]));
// On the anvil: the iron's end laid across the face where the blows fall, the tongs coming to it from his left.
const ON_ANVIL = (() => {
  const q = hold([-0.8, -0.22, 0.42], [0.1, -1, 0.3]);
  return tk(gripAt([FORGE.strike[0] + 0.035, FORGE.face + TONGS.bar, FORGE.strike[2]], q, TONGS.tip - 0.05), q, { pole: [0.75, -0.5, -0.45] });
})();
// In the fire: as they lie across the hearth's edge, the iron's end in the coals; and drawn back out of them.
const TONGS_REST = REST_AT.tongs[1];
const IN_FIRE = tk(add(TONGS_REST.t, [0, 0.012, 0]), TONGS_REST.q);

// ---- at the anvil ----
{
  const H_BLOW = unit([0.1, -0.1, 1]), Q_BLOW = swing(H_BLOW);
  // (The grip when the face is on the iron: back along the handle from the head, the head's half height above the face.)
  const G_BLOW = sub(add(FORGE.strike, [0, TONGS.bar * 2, 0]), add(rot(Q_BLOW, [0, HAMMER.head, 0]), rot(Q_BLOW, [0, 0, HAMMER.face])));
  const HOVER = { lean: 18, twist: 0, R: tk(add(G_BLOW, [0, 0.13, -0.02]), swing([0.1, 0.1, 1])), L: ON_ANVIL };
  const TOP = { lean: 9, twist: -14, R: tk([-0.37, 1.5, 0.08], swing([-0.08, 0.8, -0.6])), L: ON_ANVIL };
  // (The iron gives under the blow, and comes back up.)
  const dip = { ...ON_ANVIL, g: add(ON_ANVIL.g, [0, -0.006, 0]) };
  const BLOW = { lean: 27, twist: 6, R: tk(G_BLOW, Q_BLOW), L: dip };
  const BOUNCE = { lean: 25, twist: 4, R: tk(add(G_BLOW, [0, 0.07, -0.01]), swing([0.1, -0.02, 1])), L: ON_ANVIL };
  // The blows. (A little over a second each: the lift, a breath at the top, down hard, the bounce off the face.)
  make(C.blow, 1.1, true, still([
    [0, HOVER], [0.42, TOP, smooth, { R: [-0.2, 1.3, 0.46] }], [0.47, { ...TOP, R: { ...TOP.R, g: add(TOP.R.g, [0, 0.012, -0.012]) } }],
    [C.blowAt, BLOW, ease2, { R: [-0.2, 1.46, 0.5] }], [0.72, BOUNCE, out3], [1.1, HOVER],
  ]));

  // With the hammer at his side: his own standing about, the hand shut on the handle and let down at the wrist so the head
  // hangs; and the iron brought up in the tongs to look at its colour.
  {
    const c = clips.clips.idle_ual, q = hold([-0.5, 0.3, 0.8], [0.2, -1, 0.3]);
    const LOOK = tk([0.33, 1.08, 0.2], q, { pole: [0.7, -0.6, -0.3] });
    make(C.hold, c.dur, true, (t) => {
      const base = turnsOf('idle_ual', t);
      return { base, lean: 3, look: 8, L: { ...LOOK, g: add(LOOK.g, [0, 0.012 * Math.sin(t / c.dur * Math.PI * 2), 0]) }, after(D) {
        const palm = rot(D[RIGHT.HAND], RIGHT.grip.palm);
        const drop = [35, -35].map((deg) => axisAngle(palm, deg)).sort((a, b) => rot(qmul(a, D[RIGHT.HAND]), RIGHT.grip.k)[1] - rot(qmul(b, D[RIGHT.HAND]), RIGHT.grip.k)[1])[0];
        for (const j of RIGHT.HAND_SUB) D[j] = qmul(drop, D[j]);
        curl(D, 1, RIGHT);
      } };
    });
  }

  // Taking the hammer up off the anvil, the iron lying on the face.
  {
    const LAID = { lean: 26, twist: 5, R: tk(HAMMER_REST.t, HAMMER_REST.q, { fist: 0.15 }), L: ON_ANVIL };
    const START = { lean: 14, twist: 0, R: SIDE[1], L: ON_ANVIL };
    const part = along([[0, START], [1, LAID, smooth, { R: [-0.3, 1.08, 0.2] }]], 0.62);
    make(C.take, 1.1, false, still([
      [0, START], [0.3, { ...part, R: { ...part.R, arm: 1, fist: 0 } }, smooth],
      [C.takeAt - 0.04, LAID, out3], [C.takeAt + 0.06, { ...LAID, R: { ...LAID.R, fist: 1 } }], [1.1, HOVER, smooth, { R: add(HOVER.R.g, [0.02, 0.1, -0.08]) }],
    ]));
  }

  // The iron laid on the anvil, from where he carries it.
  make(C.set, 0.9, false, still([
    [0, { lean: 0, L: CARRY, R: fistAtSide(1) }], [0.62, { lean: 12, L: { ...ON_ANVIL, g: add(ON_ANVIL.g, [0.02, 0.07, -0.03]) }, R: SIDE[1] }, smooth, { L: [0.5, 1.12, 0.3] }],
    [0.9, { lean: 14, L: ON_ANVIL, R: SIDE[1] }, out3],
  ]));
}

// How he carries the tongs: his standing about, the left arm holding them out, the right hand shut on whatever's in it.
// (Laid over his walk from the left shoulder down; or from the right hand down alone, for a fist.)
{
  const c = clips.clips.idle_ual;
  make(C.carry, c.dur, true, (t) => ({ base: turnsOf('idle_ual', t), L: CARRY, after(D) { curl(D, 1, RIGHT); } }));
}

// ---- at the fire ----
{
  // His right hand on the grip of the bellows' rope: over it, knuckles up.
  const onRope = (p) => tk(pullGrip(p), hold([1, 0, 0], [0, -0.25, 1]), { pole: [-0.8, -0.5, -0.2] });
  const AT_FIRE = { lean: 12, twist: 0, look: 6 };
  // The tongs taken up: his hand down to them where they lie, shut on the reins, and they're his.
  make(C.tongs, 1.0, false, still([
    [0, { lean: 0, L: SIDE[0] }], [C.tongsAt - 0.06, { ...AT_FIRE, lean: 16, L: { ...IN_FIRE, g: TONGS_REST.t, fist: 0.1 } }, smooth, { L: [0.4, 1.2, 0.22] }],
    [C.tongsAt + 0.06, { ...AT_FIRE, lean: 16, L: { ...IN_FIRE, g: TONGS_REST.t } }], [1.0, { ...AT_FIRE, L: IN_FIRE }],
  ]));
  // The bellows: down on the rope with his weight behind it, and up as the board falls; the iron turned in the coals.
  make(C.pump, C.pumpDur, true, (t) => {
    const p = pumpAt(t), turn = Math.sin(t / C.pumpDur * Math.PI * 2);
    const q = qmul(IN_FIRE.q, axisAngle([0, 1, 0], 14 * turn));
    return { base: idle0, lean: 11 + 7 * p, twist: -10 - 6 * p, look: 10, R: onRope(p), L: { ...IN_FIRE, q, g: add(IN_FIRE.g, [0.01 * turn, 0, -0.012 * turn]) } };
  });
  // Out of the fire: drawn back along itself clear of the coals, and up to where he carries it; his other hand off the rope.
  const back = add(IN_FIRE.g, mul(rot(IN_FIRE.q, [0, 1, 0]), -0.3));
  make(C.draw, 1.3, false, still([
    [0, { lean: 11, twist: -10, look: 10, R: onRope(0), L: IN_FIRE }],
    [0.5, { lean: 9, twist: -2, look: 6, R: { ...onRope(0), g: add(pullGrip(0), [0.08, -0.2, -0.1]), arm: 0.5, fist: 0.5 }, L: { ...IN_FIRE, g: add(back, [0, 0.04, 0]) } }, smooth],
    [1.3, { lean: 0, L: CARRY, R: fistAtSide(1) }, smooth, { L: [0.36, 1.18, 0.3] }],
  ]));
}

// ---- at the slack tub ----
{
  // Down into the water, the tongs near upright; stirred about; and out.
  const q = hold([-0.22, -0.8, 0.56], [-0.3, -0.5, -0.8]);
  const IN = (dx, dz, dy = 0) => tk(gripAt([dx, TUB.water - 0.14 + dy, TUB.off + dz], q, TONGS.tip), q, { pole: [0.8, -0.3, -0.5] });
  const keys = [[0, { lean: 0, L: CARRY, R: fistAtSide(1) }], [0.55, { lean: 14, look: 4, L: IN(0, 0, 0.36), R: SIDE[1] }, smooth, { L: [0.4, 1.2, 0.36] }],
    [C.quenchAt, { lean: 22, look: 4, L: IN(0, 0), R: SIDE[1] }, ease2]];
  for (let i = 1; i <= 6; i++) { const a = i / 6 * Math.PI * 2; keys.push([C.quenchAt + i * 0.24, { lean: 22, look: 4, L: IN(Math.sin(a) * 0.07, (1 - Math.cos(a)) * 0.05 - 0.04), R: SIDE[1] }, lin]); }
  keys.push([2.9, { lean: 12, look: 8, L: IN(0, 0, 0.4), R: SIDE[1] }, smooth], [3.5, { lean: 0, L: CARRY, R: fistAtSide(1) }, smooth, { L: [0.4, 1.15, 0.36] }]);
  make(C.quench, 3.5, false, still(keys));
}

// ---- taking a thing up in his right hand from where it lies ----
function takeClip(name, rest, o = {}) {
  const lean = o.lean ?? 24, twist = o.twist ?? 6;
  const LAID = { lean, twist, R: tk(rest.t, rest.q, { fist: 0.15, pole: o.pole }), L: o.L };
  const START = { lean: 0, twist: 0, R: SIDE[1], L: o.L0 };
  const via = o.via || [-0.3, 1.1, 0.25];
  const part = along([[0, START], [1, LAID, smooth, { R: via }]], 0.62);
  const up = add(rest.t, o.lift || [0, 0.12, -0.1]);
  make(name, 1.1, false, still([
    [0, START], [0.3, { ...part, R: { ...part.R, arm: 1, fist: 0 } }, smooth], [C.takeAt - 0.04, LAID, out3], [C.takeAt + 0.06, { ...LAID, R: { ...LAID.R, fist: 1 } }],
    [0.78, { lean: lean * 0.6, twist: twist * 0.5, R: tk(up, o.upQ || rest.q), L: o.L }, smooth], [1.1, { lean: 0, R: fistAtSide(1), L: o.L0 }, smooth],
  ]));
}

// ---- at the bench ----
{
  const blade = REST_AT.blade[1], fileR = REST_AT.file[1];
  takeClip(C.fileTake, fileR, { lean: 30, twist: 12, lift: [0.04, 0.1, -0.06] });
  takeClip(C.bladeTake, blade, { lean: 32, twist: 2, lift: [0, 0.1, -0.08] });
  // The file along the blade's edge, away from him and back, his left hand flat on the blade to hold it.
  const edge = (x) => add(blade.t, add(rot(blade.q, [0, x, 0]), rot(blade.q, [0, 0, BLADE.edge * 0.6])));
  const fq = hammerQuat(unit([0.62, -0.1, 0.78]), cross(unit([0.62, 0, 0.78]), [0, 1, 0]));
  const press = tk(add(edge(0.36), [0.03, 0.03, 0.06]), hold([-1, 0, 0.2], [0.2, -0.2, 1]), { fist: 0.12, pole: [0.8, -0.4, -0.4] });
  const F = (x, lift) => tk(gripAt(add(edge(x), [0, 0.006 + lift, 0]), fq, FILE.tip * 0.55), fq, { pole: [-0.7, -0.5, -0.5] });
  make(C.file, 1.3, true, still([
    [0, { lean: 30, twist: 8, R: F(0.08, 0), L: press }], [0.55, { lean: 33, twist: -2, R: F(0.3, 0), L: press }, smooth],
    [0.75, { lean: 33, twist: -1, R: F(0.31, 0.035), L: press }], [1.15, { lean: 30, twist: 7, R: F(0.07, 0.04), L: press }, smooth], [1.3, { lean: 30, twist: 8, R: F(0.08, 0), L: press }],
  ]));
}

// ---- at the grindstone ----
{
  // The blade across the top of the stone, its edge down on it and trailing; drawn across and back, and rocked.
  const top = [0, WHEEL.axle + WHEEL.r, WHEEL.off];
  const bq = (rock) => hold([1, 0.03, 0.12], [0, -0.42 - rock, 1]);
  const R_ = (y, rock) => { const q = bq(rock); return tk(gripAt(add(top, [0, 0.004, 0.01]), q, y, [0, 0, BLADE.edge * 0.8]), q, { pole: [-0.9, -0.2, -0.4] }); };
  const L_ = (y, rock) => { const q = bq(rock); return tk(add(add(top, [0, 0.03, 0.0]), rot(q, [0, 0.13 + (0.25 - y) * 0.3, 0])), hold([-0.2, 0, -1], [-1, -0.15, 0.2]), { fist: 0.1, pole: [0.9, -0.2, -0.4] }); };
  const K = (y, rock, lean) => ({ lean, twist: 0, R: R_(y, rock), L: L_(y, rock) });
  make(C.grind, 2.0, true, still([[0, K(0.16, 0, 29)], [0.9, K(0.34, 0.1, 32), smooth], [1.1, K(0.34, 0.14, 32)], [1.9, K(0.17, 0.02, 29), smooth], [2.0, K(0.16, 0, 29)]]));
}

// ---- at the axe ----
{
  // His rag out of his belt: where it's tucked, on his own hips as he stands.
  pose.sa.set(localsOf(idle0.D)); pose.ha.set(idle0.hips); pose.fk(0, 0, 0, 0);
  const belt = { q: RAG_BELT.q, t: add(at3(pose.wt, rig.hips), RAG_BELT.t) };
  takeClip(C.ragTake, belt, { lean: 0, twist: 0, via: [-0.34, 1.0, 0.1], lift: [-0.03, 0.1, 0.12], pole: [-0.6, -0.3, -0.75] });
  // The rag round and round on the blade to his right, his palm to it; his left hand on the haft, to hold it still.
  const face = RACK.off - 0.03, mid = [-0.24, RACK.hook - 0.73, face - 0.045];
  const pq = hold([1, 0.1, 0], [0.1, 1, 0.25]);
  const haft = tk([0.035, RACK.hook - 1.06, face - 0.03], hold([0, 1, 0], [-0.7, 0, 0.7]), { fist: 0.85, pole: [0.7, -0.6, -0.3] });
  const keys = [];
  for (let i = 0; i <= 12; i++) {
    const a = i / 12 * Math.PI * 2, r = 0.1;
    keys.push([i * 0.25, { lean: 8 + 2 * Math.sin(a), twist: -10 - 4 * Math.cos(a), look: -12, R: tk(add(mid, [Math.cos(a) * r * 1.1, Math.sin(a) * r, 0]), pq, { fist: 0.55, pole: [-0.8, -0.5, -0.3] }), L: haft }, lin]);
  }
  make(C.polish, 3.0, true, still(keys));
}

console.log(report.join('\n'));
{
  // How the blow lands, on his own body through the game's own pose code.
  const c = made[SMITH_CLIPS.blow], f = Math.round(SMITH_CLIPS.blowAt * FPS);
  pose.sa.set(c.rots[f]); pose.ha.set(c.hips[f]); pose.fk(0, 0, 0, 0);
  const wq = at4(pose.wq, RIGHT.S.hand), q = qmul(wq, RIGHT.grip.q), g = add(at3(pose.wt, RIGHT.S.hand), rot(wq, RIGHT.grip.t));
  const face = add(g, rot(q, [0, HAMMER.head, HAMMER.face]));
  console.log(`the blow: the face at ${face.map((x) => x.toFixed(3)).join(', ')}; the anvil's at ${FORGE.strike.join(', ')}; it looks ${rot(q, [0, 0, 1]).map((x) => x.toFixed(2)).join(', ')}`);
}
if (process.argv.includes("--check")) process.exit(0);

// ---- packed again: everything that's kept, then these ----
const rotIn = new Int16Array(bin, 0, meta.hipsByteOffset >> 1), hipsIn = new Float32Array(bin, meta.hipsByteOffset);
const rotOut = [], hipsOut = [], out = {};
for (const [name, c] of Object.entries(meta.clips)) {
  if (DROPPED.includes(name) || made[name]) continue;
  const tracks = c.tracks.map(([j, off, still]) => {
    const n = (still ? 1 : c.frames) * 4, o = rotOut.length;
    for (let i = 0; i < n; i++) rotOut.push(rotIn[off + i]);
    return [j, o, still];
  });
  const h = hipsOut.length;
  for (let i = 0; i < c.frames * 3; i++) hipsOut.push(hipsIn[c.hips + i]);
  out[name] = { ...c, tracks, hips: h };
}
for (const [name, c] of Object.entries(made)) {
  const tracks = [];
  for (let j = 0; j < N; j++) {
    const a = at4(c.rots[0], j);
    const still = c.rots.every((r) => Math.abs(dot(at4(r, j), a) + r[j * 4 + 3] * a[3]) > 1 - 1e-7);
    tracks.push([j, rotOut.length, still ? 1 : 0]);
    for (const r of still ? [c.rots[0]] : c.rots) for (let i = 0; i < 4; i++) rotOut.push(Math.round(r[j * 4 + i] * 32767));
  }
  const h = hipsOut.length;
  for (const p of c.hips) hipsOut.push(...p);
  out[name] = { frames: c.frames, dur: +c.dur.toFixed(5), loop: c.loop, tracks, hips: h, travel: 0, src: 'tools/folk/smith_clips.mjs' };
}
const pad = rotOut.length % 2;
const rotBytes = (rotOut.length + pad) * 2;
const buf = new ArrayBuffer(rotBytes + hipsOut.length * 4);
new Int16Array(buf, 0, rotOut.length).set(rotOut);
new Float32Array(buf, rotBytes).set(hipsOut);
writeFileSync(new URL('clips.bin', dir), new Uint8Array(buf));
writeFileSync(new URL('clips.json', dir), JSON.stringify({ ...meta, hipsByteOffset: rotBytes, clips: out }));
console.log(`${Object.keys(out).length} clips, ${(buf.byteLength / 1048576).toFixed(2)} MB${DROPPED.some((d) => meta.clips[d]) ? `; dropped ${DROPPED.filter((d) => meta.clips[d]).join(', ')}` : ''}`);
