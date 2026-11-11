// The smith's own clips, made here and not taken from Lisandra's: nothing she has swings a hammer down onto an anvil.
//
//   hammer        a blow on the anvil and the lift for the next, over and over; the face lands on FORGE.strike at blowAt
//   hammer_hold   standing with it at his side between heats
//   hammer_take   his hand out to the handle where it lies on the anvil (takeAt), and up with it; backwards, he lays it down
//
// They're worked out on Homunculus's own body (assets/game/folk/smith.glb): where the hammer has to be at each moment, the
// arm bent to put the hand there, his back into it, and then written as turns of Lisandra's bones like every other clip, so
// the game plays them as it plays the rest (src/folk/rig.js). Where the hammer is in his hand, and where the anvil stands,
// are src/folk/smithy.js's, which the game reads too.
//
// Also drops the clips nobody uses any more (DROPPED), and packs the file again without them.
//
//   node tools/folk/smith_clips.mjs          writes assets/game/folk/clips.json and clips.bin
//   node tools/folk/smith_clips.mjs --check  only says how near the hammer comes to where it's meant to be
//
// Run it after tools/folk/pack_clips.py, which knows nothing of these.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { quatFromMat3 } from '../../src/core/math.js';
import { FolkClips, FolkRig, FolkPose } from '../../src/folk/rig.js';
import { PEOPLE } from '../../src/folk/people.js';
import { FORGE, HAMMER, HAMMER_REST, SMITH_CLIPS, gripOf, hammerQuat } from '../../src/folk/smithy.js';

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
const grip = gripOf(rig);

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

// The smith in that pose, standing at the forge: where his hammer is.
function stand(D, hips) {
  pose.sa.set(localsOf(D));
  pose.ha.set(hips);
  pose.fk(0, 0, 0, 0);
  const h = rig.hands[1], wq = at4(pose.wq, h);
  return { q: qmul(wq, grip.q), g: add(at3(pose.wt, h), rot(wq, grip.t)), shoulder: at3(pose.wt, S.arm), wq };
}

// His right arm, in his own rig: the joints, how long the bones are, and which way they lie and bend at rest.
const sj = (n) => rig.index.get(`mixamorig:${n}`);
const S = { arm: sj('RightArm'), fore: rig.fore[1], hand: rig.hands[1] };
const rp = (j) => at3(rig.rest.t, j);
const L1 = Math.hypot(...sub(rp(S.fore), rp(S.arm))), L2 = Math.hypot(...sub(rp(S.hand), rp(S.fore)));
// (An elbow bends the forearm forwards from where every body's bound, arms out.)
const restFrame = (a, b) => { const d = unit(sub(rp(b), rp(a))); return frame(d, unit(cross(d, [0, 0, 1]))); };
const REST_UPPER = restFrame(S.arm, S.fore), REST_FORE = restFrame(S.fore, S.hand);
const REST_HAMMER = hammerQuat(grip.k, grip.f);
const POLE = [-0.55, -0.7, -0.45];     // the elbow: down, out, and behind
// Fingers shut round the handle: each joint turned about the knuckle line, towards the palm.
const CURL = dot(cross(grip.k, grip.f), grip.palm) > 0 ? grip.k : mul(grip.k, -1);
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'].map((f) => [1, 2, 3, 4].map((i) => her(`RightHand${f}${i}`)));
const HAND = her('RightHand'), ARM = her('RightArm'), FORE = her('RightForeArm');
const HAND_SUB = below(HAND);

// The arm put where the hammer has to be. D: the pose so far (the back already leant); want: { g, q } of the hammer's grip;
// arm: how much of this over the pose's own arm (0-1); fist: how far the fingers are shut (0-1).
function reach(D0, hips, want, arm, fist) {
  let target = want.g, D = D0;
  for (let pass = 0; pass < 6; pass++) {
    D = D0.slice();
    const sh = stand(D0, hips).shoulder;
    const dHand = qmul(want.q, conj(REST_HAMMER));
    const wrist = sub(target, rot(dHand, grip.at));
    let sw = sub(wrist, sh), d = Math.hypot(...sw);
    const dn = unit(sw);
    d = Math.min(L1 + L2 - 0.004, Math.max(Math.abs(L1 - L2) + 0.004, d));
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const u = unit(sub(POLE, mul(dn, dot(POLE, dn))));
    const elbow = add(sh, add(mul(dn, a), mul(u, h))), to = add(sh, mul(dn, d));
    const n = unit(cross(dn, mul(u, -1)));
    const upper = unit(sub(elbow, sh)), fore = unit(sub(to, elbow));
    const set = (j, q) => { D[j] = arm >= 1 ? q : nlerp(D0[j], q, arm); };
    set(ARM, qmul(frame(upper, unit(cross(cross(upper, n), upper))), conj(REST_UPPER)));
    set(FORE, qmul(frame(fore, unit(cross(cross(fore, n), fore))), conj(REST_FORE)));
    // The hand, and all its fingers carried with it as they were.
    const carry = qmul(dHand, conj(D0[HAND]));
    for (const j of HAND_SUB) set(j, qmul(carry, D0[j]));
    curl(D, fist);
    const got = stand(D, hips);
    if (arm < 1) break;
    target = add(target, sub(want.g, got.g));
  }
  return D;
}

function curl(D, fist) {
  if (fist <= 0) return;
  const hand = D[HAND];
  for (const f of FINGERS) {
    [62, 150, 212, 212].forEach((deg, i) => { D[f[i]] = nlerp(D[f[i]], qmul(hand, axisAngle(CURL, deg)), fist); });
  }
}

// His back: bent forward by lean and turned by twist (degrees; a twist to his left is +), shared out up the spine, his head
// brought part of the way back up to look at the work.
function bend(D, lean, twist) {
  // (Most of the lean low down, where a man bends over his work; the turn evenly.)
  [['Spine', 0.6], ['Spine1', 0.2], ['Spine2', 0.2]].forEach(([s, share]) => {
    const part = qmul(axisAngle([1, 0, 0], lean * share), axisAngle([0, 1, 0], twist / 3));
    for (const j of below(her(s))) D[j] = qmul(part, D[j]);
  });
  const up = axisAngle([1, 0, 0], -lean * 0.4);
  for (const j of below(her('Neck'))) D[j] = qmul(up, D[j]);
  return D;
}

// ---- where the hammer goes ----
const RIGHT = [-1, 0, 0];
const swing = (h) => hammerQuat(h, cross(unit(h), RIGHT));      // the face leading, down the arc of a blow
const H_BLOW = unit([0.1, -0.1, 1]);
const Q_BLOW = swing(H_BLOW);
// (The grip when the face is on the anvil: back along the handle from the head, the head's half height above the face.)
const G_BLOW = sub(FORGE.strike, add(rot(Q_BLOW, [0, HAMMER.head, 0]), rot(Q_BLOW, [0, 0, HAMMER.face])));
const HOVER = { g: add(G_BLOW, [0, 0.13, -0.02]), q: swing([0.1, 0.1, 1]), lean: 18, twist: 0 };
const TOP = { g: [-0.37, 1.5, 0.08], q: swing([-0.08, 0.8, -0.6]), lean: 9, twist: -14 };
const BLOW = { g: G_BLOW, q: Q_BLOW, lean: 27, twist: 6 };
const BOUNCE = { g: add(G_BLOW, [0, 0.07, -0.01]), q: swing([0.1, -0.02, 1]), lean: 25, twist: 4 };

// A path through keys: [t, key, ease, via]. ease: how the stretch up to this key is timed; via: a point the grip bows towards.
function along(keys, t) {
  let i = 1;
  while (i < keys.length - 1 && t > keys[i][0]) i++;
  const [t0, a] = keys[i - 1], [t1, b, ease = smooth, via] = keys[i];
  const s = ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))));
  const g = via ? add(add(mul(a.g, (1 - s) * (1 - s)), mul(via, 2 * s * (1 - s))), mul(b.g, s * s)) : mix(a.g, b.g, s);
  const out = { g, q: nlerp(a.q, b.q, s) };
  for (const k of ['lean', 'twist', 'arm', 'fist']) out[k] = (a[k] ?? 1) + ((b[k] ?? 1) - (a[k] ?? 1)) * s;
  return out;
}

const made = {};
const report = [];

// One clip: frames of her bones' turns and her hips, from a pose to start from and where the hammer is at each moment.
function make(name, dur, loop, at) {
  const frames = Math.round(dur * FPS) + 1, rots = [], hips = [];
  let worst = 0;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS, k = at(loop && f === frames - 1 ? 0 : t);
    const D = k.reach ? reach(bend(k.base.D.slice(), k.lean, k.twist), k.base.hips, k, k.arm, k.fist) : k.D;
    rots.push(localsOf(D)); hips.push(k.base.hips);
    if (k.reach && k.arm >= 1) worst = Math.max(worst, Math.hypot(...sub(stand(D, k.base.hips).g, k.g)));
  }
  made[name] = { frames, dur: (frames - 1) / FPS, loop, rots, hips };
  report.push(`${name}: ${frames} frames, ${made[name].dur.toFixed(2)} s; the grip within ${(worst * 1000).toFixed(1)} mm of where it's meant to be`);
}

const ease2 = (x) => x * x;
const out3 = (x) => 1 - (1 - x) ** 3;
const idle0 = turnsOf('idle_ual', 0);

// The blows. (A little over a second each: the lift, a breath at the top, down hard, the bounce off the face.)
{
  const keys = [
    [0, HOVER], [0.42, TOP, smooth, [-0.2, 1.3, 0.46]], [0.47, { ...TOP, g: add(TOP.g, [0, 0.012, -0.012]) }],
    [SMITH_CLIPS.blowAt, BLOW, ease2, [-0.2, 1.46, 0.5]], [0.72, BOUNCE, out3], [1.1, HOVER],
  ];
  make(SMITH_CLIPS.blow, 1.1, true, (t) => ({ ...along(keys, t), base: idle0, reach: true, arm: 1, fist: 1 }));
}

// With it at his side: his own standing about, the hand shut on the handle and let down at the wrist so the head hangs.
{
  const c = clips.clips.idle_ual;
  make(SMITH_CLIPS.hold, c.dur, true, (t) => {
    const base = turnsOf('idle_ual', t), D = base.D.slice();
    const palm = rot(D[HAND], grip.palm);
    const drop = [35, -35].map((deg) => axisAngle(palm, deg)).sort((a, b) => rot(qmul(a, D[HAND]), grip.k)[1] - rot(qmul(b, D[HAND]), grip.k)[1])[0];
    for (const j of HAND_SUB) D[j] = qmul(drop, D[j]);
    curl(D, 1);
    return { D, base };
  });
}

// Taking it up off the anvil.
{
  const side = stand(idle0.D, idle0.hips);
  const SIDE = { g: side.g, q: side.q, lean: 0, twist: 0, arm: 0, fist: 0 };
  const LAID = { g: HAMMER_REST.t, q: HAMMER_REST.q, lean: 26, twist: 5, arm: 1, fist: 0.15 };
  const keys = [
    [0, SIDE], [0.3, { ...along([[0, SIDE], [1, LAID, smooth, [-0.3, 1.08, 0.2]]], 0.62), arm: 1, fist: 0 }, smooth],
    [SMITH_CLIPS.takeAt - 0.04, LAID, out3], [SMITH_CLIPS.takeAt + 0.06, { ...LAID, fist: 1 }], [1.1, { ...HOVER, arm: 1, fist: 1 }, smooth, add(HOVER.g, [0.02, 0.1, -0.08])],
  ];
  make(SMITH_CLIPS.take, 1.1, false, (t) => ({ ...along(keys, t), base: idle0, reach: true }));
}

console.log(report.join('\n'));
{
  // How the blow lands, on his own body through the game's own pose code.
  const c = made[SMITH_CLIPS.blow], f = Math.round(SMITH_CLIPS.blowAt * FPS);
  pose.sa.set(c.rots[f]); pose.ha.set(c.hips[f]); pose.fk(0, 0, 0, 0);
  const wq = at4(pose.wq, S.hand), q = qmul(wq, grip.q), g = add(at3(pose.wt, S.hand), rot(wq, grip.t));
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
