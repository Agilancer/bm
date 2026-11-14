// Homunculus in his yard: the smithy out under the lean-to on the north side of his house, and the ground in front of it.
// Where each thing he works at stands, what he holds and how his hands hold it, where each tool lies when it's out of his
// hand, and where the moving parts (the bellows, the grindstone, the great axe on its rack) are at any moment. Shared by
// the town's thread (src/folk/brain.js `forge`, which lives his day; src/folk/folk.worker.js, which says where everything
// is), the renderer (src/gfx/folktools.js, which draws it; src/core/smithyard.js, what's built there and never moves), the
// folk viewer, and tools/folk/smith_clips.mjs, which makes the clips he works by so that each tool meets what it's used on.
//
// A station's own frame: he stands at its origin, on the ground, facing +z, his left to +x. Everything at a station is
// laid out in that frame (the anvil stands across his front, its horn to his left), and STATIONS says where each frame is
// in the world. The clips are made in the frame; the yard is built from it; so the two can't disagree.
import { quatFromMat3, quatMul, quatRotate } from '../core/math.js';

export const FORGE = {
  off: 0.56,                    // from where he stands to the middle of the anvil
  face: 0.88,                   // the anvil's face, above the ground
  strike: [-0.12, 0.88, 0.56],  // where the blows land: the middle of the face, a little to his hammer hand's side
};

// The ground the yard stands on: the smith's plot, levelled (PLOTS in src/core/terrain.js; tests/smithy.test.mjs holds it to that).
export const YARD_Y = 0.1;
const W = Math.PI / 2;
// Where he stands for each piece of work, and which way he faces (0 = +z, south; his left is +x turned by it).
export const STATIONS = {
  fire: { x: -10.6, z: 28.7, yaw: -W },        // at the hearth's east face, looking west into the coals; the bellows on his right
  anvil: { x: -9.31, z: 27.55, yaw: W },       // west of the anvil, looking east down the yard to the road
  tub: { x: -9.31, z: 27.22, yaw: Math.PI },   // the slack tub, by the eave's edge north of the anvil
  bench: { x: -8.3, z: 29.35, yaw: 0 },        // the bench along the house's wall
  wheel: { x: -5.62, z: 27.3, yaw: W },        // the grindstone, out in the open east of the lean-to
  axe: { x: -4.224, z: 29.284, yaw: -W / 2 },  // before the great axe on its rack, near enough to lay a hand on it
};
// A point of a station's frame in the world.
export function inYard(st, p, out = [0, 0, 0]) {
  const c = Math.cos(st.yaw), s = Math.sin(st.yaw);
  out[0] = st.x + p[0] * c + p[2] * s; out[1] = YARD_Y + p[1]; out[2] = st.z - p[0] * s + p[2] * c;
  return out;
}
const yawQ = (yaw) => [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
// A frame { q, t } of a station's, in the world.
export function frameInYard(st, f) {
  const q = [0, 0, 0, 1];
  quatMul(q, 0, yawQ(st.yaw), 0, f.q, 0);
  return { q, t: inYard(st, f.t) };
}

// What's where at each station, in its own frame (y from the ground).
export const FIRE = {
  edge: 0.54, top: 0.95,                 // the hearth's near edge, and its top
  coals: [0.24, 1.0, 1.0],               // the heart of the fire
  // The bellows: a great pair on a trestle along his right, their nose into the hearth's side. hinge: the middle of the top
  // board's hinge, at the nose; long: the board's length back from it. The pole over them rocks on pivot; its near end has
  // an arm out towards him (reach) and a rope and a grip hung from that by his right hand (pull), its far end a chain to the
  // board's tail (link).
  hinge: [-0.55, 0.98, 0.5], long: 1.1, wide: 0.52,
  pivot: [-0.55, 1.98, -0.3], pull: 0.5, link: 0.34, rope: 0.62, reach: 0.22,
  stroke: 0.44,                          // how far the pole rocks from level when it's pulled right down (radians)
};
export const TUB = { off: 0.66, r: 0.34, rim: 0.6, water: 0.5 };
// (He's a broad man with short arms: 0.47 m from shoulder to wrist. So the bench is a high one and he stands close to it, the
// stone's set high, and he stands near enough the axe to lay a hand on it. tools/folk/smith_clips.mjs says what he can't reach.)
export const BENCH = { off: 0.5, top: 1.0, hx: 1.1, hz: 0.3, wall: 30.235 };
export const WHEEL = { off: 0.52, axle: 0.8, r: 0.33, thick: 0.09 };
// The rack is that far in front of him; the axe hangs from the hook under its bar, head up, its faces to him and away.
export const RACK = { off: 0.42, bar: 2.3, hook: 2.18, post: 0.78 };

// The hammer in its own frame: the handle up +y, the hand's grip at the origin, the face to +z and the peen to -z.
export const HAMMER = {
  butt: -0.1, top: 0.275, handle: 0.015,       // the handle: from, to, and its half thickness
  head: 0.25, cheek: 0.024, eye: 0.026,        // the head: how far up the handle its middle is, half its width, half its height
  face: 0.062, peen: -0.068,                   // how far the face and the peen stand out from the handle
};

// The clips he works by (assets/game/folk/clips.*, made by tools/folk/smith_clips.mjs), and the moments in them that matter:
// when the blow lands in `hammer`, and when his hand closes on the handle in `hammer_take` (played backwards to put it down).
export const SMITH_CLIPS = {
  blow: 'hammer', hold: 'hammer_hold', take: 'hammer_take', blowAt: 0.6, takeAt: 0.5,
  // And the rest of his work. tongs: the tongs taken up off the hearth's edge (tongsAt), the iron still in the fire; pump: the
  // bellows worked, a pull every pumpDur, the iron held in the coals; draw: the iron out of the fire and up before him (and
  // backwards, back in); carry: how the tongs are held between one thing and the next (laid over his walk and his standing);
  // set: the iron laid on the anvil's face (backwards, lifted off it); quench: into the slack tub, the hiss at quenchAt;
  // fileTake, bladeTake, ragTake: his hand to each where it lies (takeAt), as the hammer; file: the file drawn along the blade
  // on the bench; grind: the blade held to the wheel; polish: the rag worked over the axe's blade.
  tongs: 'tongs_take', tongsAt: 0.5, pump: 'bellows', pumpDur: 1.8, draw: 'fire_draw', carry: 'tongs_carry', set: 'anvil_set',
  quench: 'quench', quenchAt: 0.95, fileTake: 'file_take', bladeTake: 'blade_take', ragTake: 'rag_take',
  file: 'file', grind: 'grind', polish: 'polish',
};
// How far down the bellows' rope is pulled at each moment of a pull (0 up, 1 down): down smartly, and let up slower.
export function pumpAt(t) {
  const u = ((t / SMITH_CLIPS.pumpDur) % 1 + 1) % 1, sm = (x) => x * x * (3 - 2 * x);
  return u < 0.36 ? sm(u / 0.36) : u < 0.44 ? 1 : 1 - sm((u - 0.44) / 0.56);
}

const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// The turn that takes the hammer's own axes to: its handle along `h`, its face towards `c` (made square to h).
export function hammerQuat(h, c) {
  const y = unit(h), x = unit(cross(y, c)), z = cross(x, y);
  return quatFromMat3([x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]]);
}

// How a hand holds it (side 1 his right, 0 his left), read off a body's rest pose: the handle along the knuckles, out past the forefinger; the face
// the way the knuckles point; the grip in the palm, under the middle finger's root.
//   q, t: the hammer's frame in the hand joint's own.   k, f, palm: the knuckle line, the fingers' way and the palm's, at rest.
export function gripOf(rig, side = 1) {
  const j = (n) => rig.index.get(`mixamorig:${side ? 'Right' : 'Left'}Hand${n}`);
  const P = (i) => [rig.rest.t[i * 3], rig.rest.t[i * 3 + 1], rig.rest.t[i * 3 + 2]];
  const hand = rig.hands[side], w = P(hand), mid = P(j('Middle1')), ix = P(j('Index1')), pk = P(j('Pinky1'));
  const k = unit([ix[0] - pk[0], ix[1] - pk[1], ix[2] - pk[2]]);
  let f = [mid[0] - w[0], mid[1] - w[1], mid[2] - w[2]];
  const along = dot(f, k);
  f = unit([f[0] - k[0] * along, f[1] - k[1] * along, f[2] - k[2] * along]);
  // (Every body's bound with its palms to the floor.)
  let palm = cross(k, f);
  if (palm[1] > 0) palm = [-palm[0], -palm[1], -palm[2]];
  const reach = Math.hypot(mid[0] - w[0], mid[1] - w[1], mid[2] - w[2]);
  const at = [0, 1, 2].map((i) => w[i] + (mid[i] - w[i]) * 0.86 + palm[i] * reach * 0.3);
  const inv = [-rig.rest.q[hand * 4], -rig.rest.q[hand * 4 + 1], -rig.rest.q[hand * 4 + 2], rig.rest.q[hand * 4 + 3]];
  const q = [0, 0, 0, 1], t = [0, 0, 0];
  quatMul(q, 0, inv, 0, hammerQuat(k, f), 0);
  quatRotate(t, 0, inv, 0, [at[0] - w[0], at[1] - w[1], at[2] - w[2]], 0);
  return { q, t, k, f, palm, at: [at[0] - w[0], at[1] - w[1], at[2] - w[2]] };
}

// Where it's left when it's out of his hand, in the forge's frame: stood on its face on the anvil's, where the last blow fell,
// the handle level and out over the near edge towards his hammer hand, to be taken as it's held. { q, t }: the hammer's frame.
export const HAMMER_REST = (() => {
  const h = unit([0.2, 0, 1]), q = hammerQuat(h, [0, -1, 0]);
  const face = [-0.05, FORGE.face, FORGE.off - 0.012];
  return { q, t: [face[0] - h[0] * HAMMER.head, face[1] + HAMMER.face, face[2] - h[2] * HAMMER.head] };
})();

// The forge's frame for someone standing at (x, y, z) facing yaw, and the hammer at rest in the world from it.
export function hammerAtRest(x, y, z, yaw) {
  const root = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], q = [0, 0, 0, 1], t = [0, 0, 0];
  quatMul(q, 0, root, 0, HAMMER_REST.q, 0);
  quatRotate(t, 0, root, 0, HAMMER_REST.t, 0);
  return { q, t: [t[0] + x, t[1] + y, t[2] + z] };
}

// A frame (q at qi, t at ti) as one joint of a skinning palette: a dual quaternion, as src/folk/rig.js writes them.
export function writeDQ(out, o, q, qi, t, ti) {
  const x = q[qi], y = q[qi + 1], z = q[qi + 2], w = q[qi + 3], tx = t[ti], ty = t[ti + 1], tz = t[ti + 2];
  out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
  out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
  out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
  out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
  out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
}

// Where a palette joint's frame has its origin.
export function dqOrigin(p, o, out = [0, 0, 0]) {
  const x = p[o], y = p[o + 1], z = p[o + 2], w = p[o + 3], dx = p[o + 4], dy = p[o + 5], dz = p[o + 6], dw = p[o + 7];
  out[0] = 2 * (w * dx - dw * x + (y * dz - z * dy));
  out[1] = 2 * (w * dy - dw * y + (z * dx - x * dz));
  out[2] = 2 * (w * dz - dw * z + (x * dy - y * dx));
  return out;
}


// ---- the kit: everything in the yard that moves, or is taken up and put down ----
//
// Each is a rigid piece with a frame of its own, drawn as one joint of a little skinned mesh (src/folk/smithkit.js has their
// shapes; src/gfx/folktools.js draws them). `yard` is the world's own frame, for what's drawn with them but never moves (the
// coals, the bellows' leather where it meets the bottom board). The town's thread writes the rest after the smith's own joints
// in his slot, in this order, and after them one more "joint" that's eight numbers (KD): how the fire's burning and the rest.
export const KIT = ['yard', 'hammer', 'tongs', 'blade', 'file', 'rag', 'board', 'lever', 'pull', 'link', 'wheel', 'axe'];
export const KJ = Object.fromEntries(KIT.map((k, i) => [k, i]));
export const KIT_SLOT = KIT.length;       // joints in his slot past his own: the kit's but `yard`, and the numbers
export const KD = { FIRE: 0, HEAT: 1, GLOW: 2, GRIND: 3, STEAM: 4, AWAY: 5 };

// Their sizes, each in its own frame. The tongs: the hand's grip at the origin, the reins up +y to the rivet, the jaws past
// it, and the iron they hold on out to its tip. The blade and the file: the tang (or the handle) in the hand, the steel up
// +y, the blade's edge to +z and its flat to x.
export const TONGS = { butt: -0.13, rivet: 0.33, jaws: 0.43, iron: 0.37, tip: 0.7, bar: 0.011 };
export const BLADE = { butt: -0.1, heel: 0.04, tip: 0.56, back: -0.018, edge: 0.034, thick: 0.004 };
export const FILE = { butt: -0.11, heel: 0.02, tip: 0.31 };
// The axe, from the hook it hangs by (its origin) down: the chain, the spike on its head, the middle of the head, and the
// point on its butt. Its blades spread along x, 0.46 each way; its faces look along z.
export const AXE = { chain: 0.24, head: 0.6, span: 0.46, butt: 2.02 };

const UP = [0, 1, 0];
// Lying flat: its long way along h (level), its flat (x) down, which is how a right hand comes to it from above.
const lyingDown = (h) => hammerQuat(h, cross(unit(h), UP));
const station = (name, f) => frameInYard(STATIONS[name], f);
// The frames the bellows and the pole turn in: +z back from the nose, towards the yard; x the hinge.
const BACK = quatFromMat3([-1, 0, 0, 0, 1, 0, 0, 0, -1]);

// His rag, when it's not in his hand: tucked in his belt at his right hip. From his hips, in the frame of the way he's facing.
export const RAG_BELT = { q: hammerQuat([0, 0, 1], [0, -1, 0]), t: [-0.225, 0.0, 0.085] };
// Where each of the rest lies when it's out of his hand: [whose frame, { q, t } in it].
export const REST_AT = {
  hammer: ['anvil', HAMMER_REST],
  // The tongs across the hearth's edge, the iron's end in the coals.
  tongs: ['fire', (() => {
    const tip = [FIRE.coals[0] - 0.02, FIRE.coals[1] + 0.035, FIRE.coals[2] - 0.06], h = unit([-0.07, 0.035, 1]);
    return { q: hammerQuat(h, cross(UP, h)), t: tip.map((v, i) => v - h[i] * (TONGS.tip - 0.04)) };
  })()],
  blade: ['bench', { q: lyingDown([1, 0, 0]), t: [-0.2, BENCH.top + BLADE.thick + 0.002, BENCH.off - 0.2] }],
  file: ['bench', { q: lyingDown([0.3, 0, 1]), t: [-0.38, BENCH.top + 0.008, BENCH.off - 0.22] }],
};
// The same, in the world. (The rag's on him: RAG_BELT.)
export const REST = Object.fromEntries(Object.entries(REST_AT).map(([k, [st, f]]) => [k, station(st, f)]));

const rotX = (a) => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
const rotZ = (a) => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
const qm = (a, b) => { const o = [0, 0, 0, 1]; quatMul(o, 0, a, 0, b, 0); return o; };
const qr = (q, v) => { const o = [0, 0, 0]; quatRotate(o, 0, q, 0, v, 0); return o; };
// The board's own lift for a rock of the pole: its tail goes up as far as the chain's end does.
export const boardLift = (rock) => Math.asin(FIRE.link * Math.sin(rock) / FIRE.long);
export const BOARD_SHUT = Math.asin(0.1 / FIRE.long);     // the gap at the bellows' tail when the pole's level

// The moving parts, in the world, for: pump (0-1, how far the rope's pulled), spin (the wheel's turn, radians), sway (the
// axe's, radians, [side to side, about its chain]). Returns { board, lever, pull, link, wheel, axe }, each { q, t }.
export function machines(pump, spin, sway) {
  const F = STATIONS.fire, rock = pump * FIRE.stroke, yq = yawQ(F.yaw), base = qm(yq, BACK);
  const pivot = inYard(F, FIRE.pivot), end = (zl, xl = 0) => { const p = qr(qm(base, rotX(-rock)), [xl, 0, zl]); return [pivot[0] + p[0], pivot[1] + p[1], pivot[2] + p[2]]; };
  const Wh = STATIONS.wheel, A = STATIONS.axe;
  return {
    board: { q: qm(base, rotX(-(BOARD_SHUT + boardLift(rock)))), t: inYard(F, FIRE.hinge) },
    lever: { q: qm(base, rotX(-rock)), t: pivot },
    pull: { q: base, t: end(-FIRE.pull, -FIRE.reach) },
    link: { q: base, t: end(FIRE.link) },
    wheel: { q: qm(yawQ(Wh.yaw), rotX(spin)), t: inYard(Wh, [0, WHEEL.axle, WHEEL.off]) },
    axe: { q: qm(yawQ(A.yaw), qm(rotZ(sway[0]), [0, Math.sin(sway[1] / 2), 0, Math.cos(sway[1] / 2)])), t: inYard(A, [0, RACK.hook, RACK.off]) },
  };
}
// Where the grip on the bellows' rope is, in the fire's frame, for a pull: what his hand's made to follow.
export function pullGrip(pump) {
  const rock = pump * FIRE.stroke;
  return [FIRE.pivot[0] + FIRE.reach, FIRE.pivot[1] - FIRE.pull * Math.sin(rock) - FIRE.rope, FIRE.pivot[2] + FIRE.pull * Math.cos(rock)];
}

// ---- the kit as it stands at any moment ----
//
// What the smith's doing, as the town's thread keeps it on him (src/folk/brain.js `forge`), is `me.kit`:
//   tool    what's in his right hand: null, or 'hammer', 'blade', 'file', 'rag'
//   tongs   the tongs are in his left
//   pump    how far the bellows' rope is pulled (0-1)
//   inFire  the iron's in the coals (it is whenever the tongs lie on the hearth)
//   grind   the blade's on the stone, and the stone's turning
//   quench  the iron's in the tub
//   polish  his rag's on the axe
export const newKitState = () => ({ tool: null, tongs: false, pump: 0, inFire: false, grind: false, quench: false, polish: false });

const HELD = ['hammer', 'blade', 'file', 'rag'];
export class SmithKit {
  constructor(rig) {
    this.rig = rig;
    this.grip = [gripOf(rig, 0), gripOf(rig, 1)];
    // The kit's joints but `yard`, and the numbers after them: what goes into his slot.
    this.pal = new Float32Array(KIT_SLOT * 8);
    this.held = new Float32Array(KIT.length * 8);     // the last frame each thing in his hands had, for carrying between poses
    this.rest = {};
    for (const [k, f] of Object.entries(REST)) { this.rest[k] = new Float32Array(8); writeDQ(this.rest[k], 0, f.q, 0, f.t, 0); }
    this.t = 0; this.spin = 0; this.speed = 0; this.pump = 0;
    this.fire = 0.3; this.heat = 0.1; this.glow = 0.35; this.steam = 0; this.push = 0;
    this.q = [0, 0, 0, 1]; this.v = [0, 0, 0];
    this.step(0, newKitState(), false);
  }

  // The fire, the iron's heat, the stone's turning and the axe's light, a moment on. there: he's in the yard at his work.
  step(dt, k, there) {
    this.t += dt;
    const ease = (v, to, rate) => v + (to - v) * (1 - Math.exp(-rate * dt));
    this.pump = ease(this.pump, k.pump, 30);
    // (Blown up by each pull of the rope, and dying back between; banked low when he's not at it.)
    this.fire = Math.min(1, ease(this.fire, there ? 0.34 : 0.14, 0.1) + (k.pump > 0.25 ? k.pump * 0.5 * dt : 0));
    const inFire = k.inFire || !k.tongs;
    if (k.quench) { this.heat = ease(this.heat, 0, 5); this.steam = 1; } else {
      this.heat = inFire ? ease(this.heat, Math.min(1, this.fire * 1.25 - 0.08), this.fire > this.heat ? 0.4 : 0.08) : ease(this.heat, 0, 0.045);
      this.steam = Math.max(0, this.steam - dt / 1.6);
    }
    this.speed = ease(this.speed, k.grind ? 10 : 0, k.grind ? 2.2 : 0.5);
    this.spin = (this.spin + this.speed * dt) % (Math.PI * 2);
    // (Its runes: low and slow on their own, up when he's at it with his rag, and they don't go straight down after.)
    this.glow = ease(this.glow, k.polish ? 0.95 : 0.3 + 0.1 * Math.sin(this.t * 0.7) + 0.05 * Math.sin(this.t * 2.3), k.polish ? 0.8 : 0.25);
    this.push = ease(this.push, k.polish ? 1 : 0, 2);
    this.grindOn = k.grind;
  }

  // Everything's frame into this.pal. pose: his, just solved, or null between poses (what's in his hands keeps the frame it
  // had; carry, a frame of src/core/carry.js, moves it along with him). k: his kit state; yaw: the way he's facing.
  write(pose, k, yaw, carry, carryPalette) {
    const out = this.pal, rig = this.rig;
    const hold = (name, side) => {
      const j = KJ[name], o = (j - 1) * 8, h = rig.hands[side], g = this.grip[side];
      if (pose) {
        quatMul(this.q, 0, pose.wq, h * 4, g.q, 0);
        quatRotate(this.v, 0, pose.wq, h * 4, g.t, 0);
        for (let i = 0; i < 3; i++) this.v[i] += pose.wt[h * 3 + i];
        writeDQ(this.held, j * 8, this.q, 0, this.v, 0);
      }
      if (!pose && carry) carryPalette(this.held, j * 8, out, o, 1, carry);
      else out.set(this.held.subarray(j * 8, j * 8 + 8), o);
    };
    for (const name of HELD) { if (k.tool === name) hold(name, 1); else if (name !== 'rag') out.set(this.rest[name], (KJ[name] - 1) * 8); }
    if (k.tool !== 'rag') {
      // (In his belt: it goes where his hips go.)
      const j = KJ.rag, o = (j - 1) * 8, h = rig.hips;
      if (pose) {
        const yq = yawQ(yaw);
        quatMul(this.q, 0, yq, 0, RAG_BELT.q, 0);
        quatRotate(this.v, 0, yq, 0, RAG_BELT.t, 0);
        for (let i = 0; i < 3; i++) this.v[i] += pose.wt[h * 3 + i];
        writeDQ(this.held, j * 8, this.q, 0, this.v, 0);
      }
      if (!pose && carry) carryPalette(this.held, j * 8, out, o, 1, carry);
      else out.set(this.held.subarray(j * 8, j * 8 + 8), o);
    }
    if (k.tongs) hold('tongs', 0); else out.set(this.rest.tongs, (KJ.tongs - 1) * 8);
    const sw = [0.012 * Math.sin(this.t * 0.9) + this.push * 0.02 * Math.sin(this.t * 2.6), 0.03 * Math.sin(this.t * 0.37) + this.push * 0.05 * Math.sin(this.t * 1.7)];
    const M = machines(this.pump, this.spin, sw);
    for (const name of ['board', 'lever', 'pull', 'link', 'wheel', 'axe']) writeDQ(out, (KJ[name] - 1) * 8, M[name].q, 0, M[name].t, 0);
    const d = (KIT.length - 1) * 8;
    out[d + KD.FIRE] = this.fire; out[d + KD.HEAT] = this.heat; out[d + KD.GLOW] = this.glow;
    out[d + KD.GRIND] = this.grindOn ? this.speed / 10 : 0; out[d + KD.STEAM] = this.steam; out[d + KD.AWAY] = 0;
    return out;
  }
}
