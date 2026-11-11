// Lisandra's cave, high on the Long Road, and the opening played out in it. Shared by the sim (where you can walk), the
// land (where the hillside opens), the renderer (the rock, the clutter, the candles) and the screen (the camera and the words).
import { clamp, lerp, smoothstep } from './math.js';

// WAKE: the summons, the flash, the candles and her speech, up to the name prompt. NAME: waiting for it. HERD: she takes the
// name and herds you out. LEAVE: you walk out. COLLAPSE: the ledge, the cave-in, her face. ESCORT: the walk down. ARRIVED: done.
export const OPENING = { OFF: 0, WAKE: 1, NAME: 2, HERD: 3, LEAVE: 4, COLLAPSE: 5, ESCORT: 6, ARRIVED: 7 };
export const OPENING_REVISION = 4;

// The beats every part of the game keys off, in seconds into WAKE: the scene is laid out in src/core/opening-cave.js, by how
// long her lines take to say. Your eyes come open (if hazy) at GLAMOUR_AT, and the flash is at SWAP_AT.
export { CAST_AT, CAVE, CANDLES_AT, FALL, FALL_FROM, GLAMOUR_AT, HERD, NAME_AT, REVEAL_AT, SNAP_AT, SPARK_AT, SWAP_AT } from './opening-cave.js';
import { CANDLES_AT, CAVE, FALL, HERD, SWAP_AT } from './opening-cave.js';
export const DAZZLE = 3.2;             // s after the flash: your eyes swim, and clear
// In WAKE, your eyes: how high (lying in the circle, scrambling back at the flash, sitting up as she comes to you again,
// on your feet from the candles), and how far back from where you lie (the scramble). Her looks find them there.
export function wakeEyeH(t) {
  const scramble = smoothstep(SWAP_AT, SWAP_AT + 0.28, t), sit = smoothstep(CAVE.oh - 0.3, CAVE.drop + 0.6, t);
  return lerp(lerp(0.62, 0.46, scramble) + 0.4 * sit, 1.62, smoothstep(CANDLES_AT + 0.4, CANDLES_AT + 3.0, t));
}
export const wakeEyeBack = (t) => 0.5 * smoothstep(SWAP_AT, SWAP_AT + 0.28, t) * (1 - smoothstep(CANDLES_AT + 0.4, CANDLES_AT + 3.4, t));
export const HERD_CONTROL = HERD.control;  // into HERD: she's said her piece, and you can look and walk again
export const HERD_END = HERD.end;          // and this long after the name, you're walking out
export const COLLAPSE_END = FALL.end;      // the bars slide away and the walk down begins
export const DUST_AT = 7.0;        // in COLLAPSE: the mouth caves in, and she comes out of the dust pretty
export const KNEEL_UP = 10.3;
// Whether the story holds you still: you can't move, and on a phone the thumbs are put away. The bars stay up past this, as
// you walk out of the cave, and then the thumbs must be there, or a phone can't leave it.
export const storyHolds = (stage, t) => stage === OPENING.WAKE || stage === OPENING.NAME || stage === OPENING.COLLAPSE
  || (stage === OPENING.HERD && t < HERD_CONTROL);
// Which of her you see: lovely while the glamour holds, the witch from the flash until she comes out of the dust, and lovely
// to you from then on (in town, only by day). Everyone else only ever sees the witch.
export const prettyShown = (stage, t, day = true) => (stage === OPENING.WAKE && t < SWAP_AT) || (stage === OPENING.COLLAPSE && t >= DUST_AT)
  || stage === OPENING.ESCORT || (stage >= OPENING.ARRIVED && day);      // in COLLAPSE: she gets up off her knee
// In COLLAPSE, your eye height: down to a crouch as the mouth comes down, up again as she gets up, then a hand's breadth
// under full height until the walk, level with her eyes rather than looking down on her crown.
export const collapseEye = (t) => 1.62 - 0.52 * smoothstep(DUST_AT + 0.05, DUST_AT + 0.5, t) * (1 - smoothstep(KNEEL_UP, KNEEL_UP + 1.1, t))
  - 0.1 * smoothstep(DUST_AT, DUST_AT + 0.5, t) * (1 - smoothstep(COLLAPSE_END - 3.5, COLLAPSE_END - 0.6, t));

// ---- the cave's plan ---------------------------------------------------------------------------------------------------
// High on the shoulder of the hill over the Long Road, its mouth looking out toward the town. A centreline from the mouth
// in: x, z, the floor's height, the half width and the roof's height over the floor. It runs in up the fall of the hill,
// hooks right, then turns hard left into the chamber, so from inside you never see daylight.
const MOUTH = [-307.0, 277.0, 78.6, 1.5, 3.2];
const IN = [-0.622, 0.783], RIGHT = [0.783, 0.622];
const knee = (u, v, y, w, h) => [MOUTH[0] + IN[0] * u + RIGHT[0] * v, MOUTH[1] + IN[1] * u + RIGHT[1] * v, y, w, h];
const KNEES = [
  MOUTH,
  knee(9.5, 0, 78.35, 1.32, 2.95),
  knee(18.0, 2.9, 78.0, 1.4, 3.1),
  knee(20.4, -1.1, 77.7, 1.65, 3.5),   // where the tunnel opens into the chamber
];
const ENTRY = KNEES[3];
export const CHAMBER_AXIS = (() => {
  const dx = ENTRY[0] - KNEES[2][0], dz = ENTRY[1] - KNEES[2][1], l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
})();
export const CHAMBER_LEN = 21.6;
export const CHAMBER_W = 8.6;      // its half width where it's widest
// The chamber's half width, roof and floor, by distance in from where the tunnel meets it.
export function chamberShape(s) {
  const w = s <= 14 ? lerp(1.65, CHAMBER_W, smoothstep(0, 4.2, s)) : CHAMBER_W * Math.sqrt(Math.max(0, 1 - ((s - 14) / 7.7) ** 2));
  const h = s <= 13.5 ? lerp(3.5, 8.4, smoothstep(0, 5.5, s)) : 8.4 * Math.sqrt(Math.max(0, 1 - ((s - 13.5) / 8.6) ** 2));
  return [w, h, ENTRY[2] - 0.1 * smoothstep(0, 4, s)];
}

// The centreline, sampled every 0.4 m: x, z, its heading (dx, dz), the distance in from the mouth, the floor, the half width,
// the roof, and how far into the chamber (or -1 in the tunnel). The corners are rounded so the rings never fold.
export const CAVE_LINE = (() => {
  const pts = [];
  const lerpK = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const seg = (a, b, n) => { for (let i = 0; i < n; i++) pts.push(lerpK(a, b, i / n)); };
  const toward = (a, b, d) => lerpK(a, b, d / Math.hypot(b[0] - a[0], b[1] - a[1]));
  const bend = (a, k, b, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push(lerpK(lerpK(a, k, t), lerpK(k, b, t), t)); } };
  const [m, a, b, e] = KNEES;
  const a0 = toward(a, m, 3), a1 = toward(a, b, 3), b0 = toward(b, a, 3), b1 = toward(b, e, 2.6);
  seg(m, a0, 16); bend(a0, a, a1, 16); seg(a1, b0, 8); bend(b0, b, b1, 20); seg(b1, e, 6);
  pts.push(e);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tunnel = len.at(-1), out = [];
  const STEP = 0.4;
  let j = 0;
  for (let s = 0; s < tunnel - 0.2; s += STEP) {
    while (len[j + 1] < s) j++;
    const p = lerpK(pts[j], pts[j + 1], (s - len[j]) / (len[j + 1] - len[j]));
    out.push([p[0], p[1], 0, 0, s, p[2], p[3], p[4], -1]);
  }
  for (let c = 0; c <= CHAMBER_LEN + 1e-6; c += STEP) {
    const [w, h, f] = chamberShape(c);
    out.push([ENTRY[0] + CHAMBER_AXIS[0] * c, ENTRY[1] + CHAMBER_AXIS[1] * c, 0, 0, tunnel + c, f, w, h, c]);
  }
  for (let i = 0; i < out.length; i++) {
    const p = out[Math.max(0, i - 1)], q = out[Math.min(out.length - 1, i + 1)];
    const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
    out[i][2] = dx / l; out[i][3] = dz / l;
  }
  return out;
})();
export const CHAMBER_FIRST = CAVE_LINE.findIndex((p) => p[8] >= 0);
export const TUNNEL_LEN = CAVE_LINE[CHAMBER_FIRST][4];

// A point in the chamber, s metres in from where the tunnel meets it and q to the side.
export function chamberPoint(s, q) {
  return [ENTRY[0] + CHAMBER_AXIS[0] * s + CHAMBER_AXIS[1] * q, ENTRY[1] + CHAMBER_AXIS[1] * s - CHAMBER_AXIS[0] * q];
}
export const CHAMBER_YAW = Math.atan2(CHAMBER_AXIS[0], CHAMBER_AXIS[1]);   // facing in, toward the back wall

// Nearest place on the centreline: the segment and how far along it, the distance off it (signed by side), the distance in
// from the mouth (negative out past it), the floor, half width and roof there, and how far into the chamber (-1: the tunnel).
const NEAR = { i: 0, t: 0, d: 0, s: 0, floor: 0, w: 0, h: 0, chamber: -1 };
export function caveNearest(x, z) {
  let best = 1e18, before = false;
  const L = CAVE_LINE;
  for (let i = 0; i + 1 < L.length; i++) {
    const a = L[i], b = L[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
    const raw = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
    const t = clamp(raw, 0, 1);
    const ex = x - a[0] - dx * t, ez = z - a[1] - dz * t, d2 = ex * ex + ez * ez;
    if (d2 < best) {
      best = d2; before = i === 0 && raw < 0;
      NEAR.i = i; NEAR.t = t;
      NEAR.d = Math.sqrt(d2) * (ex * dz - ez * dx < 0 ? -1 : 1);
    }
  }
  const a = L[NEAR.i], b = L[NEAR.i + 1], t = NEAR.t;
  NEAR.s = lerp(a[4], b[4], t); NEAR.floor = lerp(a[5], b[5], t); NEAR.w = lerp(a[6], b[6], t); NEAR.h = lerp(a[7], b[7], t);
  NEAR.chamber = b[8] < 0 ? -1 : lerp(Math.max(0, a[8]), b[8], t);
  if (before) {
    const dx = x - L[0][0], dz = z - L[0][1];
    NEAR.s = dx * L[0][2] + dz * L[0][3];
    NEAR.d = -dx * L[0][3] + dz * L[0][2];
  }
  return NEAR;
}

// The cave's bounding box, so the rest of the world pays nothing for it.
export const CAVE_BOX = (() => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of CAVE_LINE) { x0 = Math.min(x0, p[0] - p[6]); x1 = Math.max(x1, p[0] + p[6]); z0 = Math.min(z0, p[1] - p[6]); z1 = Math.max(z1, p[1] + p[6]); }
  return { x0: x0 - 3, x1: x1 + 3, z0: z0 - 3, z1: z1 + 3 };
})();
export const inCaveBox = (x, z, m = 0) => x > CAVE_BOX.x0 - m && x < CAVE_BOX.x1 + m && z > CAVE_BOX.z0 - m && z < CAVE_BOX.z1 + m;

// The floor you stand on in the cave, or null outside it (past the mouth, or in the rock).
export function caveFloor(x, z) {
  if (!inCaveBox(x, z)) return null;
  const n = caveNearest(x, z);
  if (n.s < 0 || Math.abs(n.d) > n.w + 0.6) return null;
  return n.floor;
}

// Keep a circle of radius r inside the cave: the walls push it back toward the middle. Returns whether it was pushed.
export function caveKeep(out, r, feet = -Infinity) {
  const x = out[0], z = out[2];
  if (!inCaveBox(x, z)) return false;
  const n = caveNearest(x, z);
  if (n.s < -0.2 || Math.abs(n.d) > n.w + 1.5 || feet > n.floor + 4) return false;
  const room = Math.max(0.15, n.w - 0.14 - r);
  let px = x, pz = z, hit = false;
  // (Past the end of the line, the chamber's end wall.)
  const last = CAVE_LINE.at(-1);
  const along = (x - last[0]) * last[2] + (z - last[1]) * last[3];
  if (along > -1.2 - r) { px -= last[2] * (along + 1.2 + r); pz -= last[3] * (along + 1.2 + r); hit = true; }
  if (Math.abs(n.d) > room) {
    const a = CAVE_LINE[n.i], b = CAVE_LINE[n.i + 1];
    const cx = lerp(a[0], b[0], n.t), cz = lerp(a[1], b[1], n.t);
    const k = room / Math.abs(n.d);
    px = cx + (px - cx) * k; pz = cz + (pz - cz) * k;
    hit = true;
  }
  out[0] = px; out[2] = pz;
  return hit;
}

// Whether the hillside at (x, z), height y, would cut into the tunnel: the terrain is left open there, the rock face round
// the mouth covers the edge, and the floor runs out over the ledge to meet it.
export function caveCuts(x, z, y) {
  if (!inCaveBox(x, z, 8)) return false;
  const n = caveNearest(x, z);
  return n.s > -0.25 && Math.abs(n.d) < n.w + 0.45 && y < n.floor + n.h + 0.35;
}

// The mouth, its heading out, and the ledge in front of it.
export const CAVE_MOUTH = [MOUTH[0], MOUTH[1]];
export const CAVE_OUT = [-CAVE_LINE[0][2], -CAVE_LINE[0][3]];
export const CAVE_FLOOR = MOUTH[2];
export const LEDGE = [MOUTH[0] + CAVE_OUT[0] * 3.6, MOUTH[1] + CAVE_OUT[1] * 3.6];
export const LEDGE_Y = MOUTH[2] - 0.04;

// ---- marks in the chamber ----------------------------------------------------------------------------------------------
// (s metres in from where the tunnel meets the chamber, q to the side: her kitchen is on the -q side, her books and her bed
// on the +q side, the circle and the door at the far end.)
const at = (s, q) => chamberPoint(s, q);
export const WAKE_S = 15.2;
export const OPENING_SPAWN = at(WAKE_S, 0);
export const OPENING_YAW = CHAMBER_YAW + Math.PI;   // waking facing back out, toward her and the tunnel
export const PORTAL_S = 18.6;
export const PORTAL = (() => { const [x, z] = at(PORTAL_S, 0); return [x, chamberShape(PORTAL_S)[2] + 1.75, z]; })();
export const PORTAL_YAW = CHAMBER_YAW + Math.PI;
export const CIRCLE = at(WAKE_S, 0);
export const CIRCLE_Y = chamberShape(WAKE_S)[2];
export const WITCH_MARK = at(3.6, -1.0);
export const WITCH_STOP = at(WAKE_S - 1.9, 0.2);      // 1.9 m in front of you, as the glamour breaks
// Her way across to you as she talks you round, through her own things.
export const WEAVE = [at(3.6, -1.0), at(5.4, -2.2), at(7.6, -1.6), at(9.4, 0.9), at(11.6, 0.6), WITCH_STOP];
// Her marks through the rest of the cave (docs/OPENING-SCRIPT.md): a step back, seen; among her things for the snap; close
// in to look you over; a little back, arms folded; by her hearth, for the old story; back before you for the three
// proofs; round behind you to stand before the door; and where she holds out her hand for your name.
export const SEEN_SPOT = at(WAKE_S - 2.75, 0.12);
export const SNAP_SPOT = at(WAKE_S - 5.0, 1.5);
export const LEAN_SPOT = at(WAKE_S - 1.05, 0.12);
export const FOLD_SPOT = at(WAKE_S - 1.7, 0.2);
export const HEARTH = at(7.8, -6.6);
export const HEARTH_SPOT = at(8.9, -5.1);
export const LANTERN = (() => { const [x, z] = at(10.35, -6.75); return [x, chamberShape(10)[2] + 0.84, z]; })();
export const DOOR_SPOT = at(WAKE_S + 1.8, 0.0);
export const ROUND_R = 1.75;                // the half circle round you, on your left as you face her
export const OFFER_SPOT = at(WAKE_S - 1.6, 0.1);
// Where she writes your name in the ledger, on her way out.
export const WRITE_SPOT = at(2.65, 0.85);
export const LECTERN = at(1.9, 1.15);

// Her things: kind, s, q, turn, scale, and what it sits on (a height). Drawn by src/gfx/opening.js; boxes in src/sim/world.js.
// (A turn of 0 faces a thing deeper into the cave; +pi/2 faces it out from the kitchen wall, -pi/2 out from the other.)
const Q = Math.PI / 2;
export const CLUTTER = [
  // By the way in: the lectern and her ledger, and what she hasn't found a place for.
  ['lectern', 1.9, 1.15, 2.8, 1], ['crate', 2.6, -3.6, 0.3, 1], ['crate', 2.65, -3.65, 0.55, 0.78, 0.64], ['sack', 3.3, -4.4, 0.2, 1],
  ['barrel', 3.4, 4.2, 0, 1], ['barrel', 4.2, 4.9, 0.6, 0.95], ['broom', 2.2, 3.3, 0.4, 1],
  // Her kitchen: the hearth and its pot, the wood, a table to work at, shelves of jars, water, and stores.
  ['hearth', 7.8, -6.6, Q, 1], ['woodpile', 6.1, -7.1, Q + 0.1, 1], ['worktable', 9.9, -6.75, Q, 1], ['stool', 10.5, -5.5, 0.3, 1],
  ['pantry', 12.0, -7.05, Q, 1], ['barrel', 5.0, -6.2, 0, 1], ['barrel', 5.75, -6.85, 1.2, 0.9], ['bucket', 5.5, -5.4, 0.5, 1],
  ['sack', 13.0, -6.5, 1.1, 0.9], ['sack', 13.5, -5.9, 0.4, 1], ['basket', 11.2, -5.9, 0.2, 1],
  // Her books: a desk and chair, two cases, and the ones that don't fit.
  ['desk', 7.4, 6.7, -Q, 1], ['chair', 7.45, 5.75, Q + 0.25, 1], ['bookcase', 5.2, 6.9, -Q + 0.06, 1], ['bookcase', 9.7, 7.2, -Q - 0.05, 1],
  ['books', 6.2, 5.6, 0.7, 1], ['books', 10.9, 6.3, -0.4, 0.8], ['hide', 7.5, 5.3, 0.15, 1],
  // Her bed, a chest at its foot, a stand by its head, and a rug to put her feet on.
  ['bed', 14.7, 6.35, 0, 1], ['chest', 12.95, 6.5, -Q, 1], ['nightstand', 16.15, 5.35, 0.1, 1], ['ragrug', 14.5, 4.55, 0.05, 1],
  // Across from it, what's stored: boxes, a tub, and a glass she keeps a cloth over.
  ['crate', 14.6, -6.3, -0.2, 1.1], ['crate', 15.4, -5.6, 0.1, 0.9], ['crate', 14.65, -6.25, 0.4, 0.75, 0.7], ['mirror', 13.95, -7.2, Q, 1],
  ['tub', 16.5, -4.0, 0, 1], ['barrel', 16.9, 3.9, 0, 0.9],
  // In the middle of the room, so she comes to you round her own things; and a long rug down it.
  ['rug', 10.3, 0.2, 0, 1], ['crate', 7.0, 1.2, 0.4, 0.9], ['crate', 7.02, 1.18, 0.95, 0.6, 0.58], ['sack', 7.55, 1.75, 0.8, 0.85],
  ['barrel', 10.7, 2.3, 0.3, 0.8], ['sack', 11.15, 2.75, 2.0, 0.8], ['crate', 8.9, 2.6, -0.5, 0.85], ['books', 8.88, 2.58, 0.4, 0.7, 0.55],
];
// Half sizes across and along, and the height, by kind. (No box for what lies flat, or stands on something.)
export const CLUTTER_SIZE = {
  crate: [0.32, 0.32, 0.64], barrel: [0.3, 0.3, 0.85], chest: [0.42, 0.28, 0.55], books: [0.25, 0.2, 0.3],
  lectern: [0.28, 0.24, 1.15], sack: [0.25, 0.25, 0.5], hearth: [0.8, 0.8, 0.45], woodpile: [0.55, 0.3, 0.5], worktable: [0.85, 0.42, 0.84],
  stool: [0.2, 0.2, 0.46], pantry: [0.8, 0.22, 1.9], bucket: [0.17, 0.17, 0.32], basket: [0.24, 0.24, 0.3], desk: [0.8, 0.42, 0.8],
  chair: [0.24, 0.24, 0.95], bookcase: [0.7, 0.2, 1.95], bed: [0.62, 1.08, 0.6], nightstand: [0.24, 0.24, 0.6], mirror: [0.36, 0.14, 1.6],
  tub: [0.42, 0.42, 0.42], broom: [0.1, 0.1, 1.4],
};
const FLAT = new Set(['books', 'hide', 'ragrug', 'rug', 'broom']);
export function clutterBoxes() {
  return CLUTTER.filter((c) => !FLAT.has(c[0]) && c[5] === undefined).map(([kind, s, q, yaw, k]) => {
    const [x, z] = at(s, q), [hx, hz, h] = CLUTTER_SIZE[kind];
    return { x, z, hx: hx * k, hz: hz * k, yaw: yaw + CHAMBER_YAW, h: h * k };
  });
}

// The floating candles: where each hangs, and when it catches in the wave that rolls out from her past you. They hang low,
// 1.8 to 2.6 m up, most of them over her things, so the light falls on the room's life and not on bare rock.
export const CANDLES = (() => {
  const out = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const hang = (s, q, up = 0) => {
    const [x, z] = at(s, q), floor = chamberShape(s)[2];
    const d = Math.hypot(x - SNAP_SPOT[0], z - SNAP_SPOT[1]);
    out.push({ x, y: floor + 1.8 + up + rnd() * 0.8, z, tall: 0.1 + rnd() * 0.12, phase: rnd() * 6.28, at: CANDLES_AT + 0.06 + d * 0.07 + rnd() * 0.08 });
  };
  for (const [kind, s, q] of CLUTTER) {
    if (kind === 'lectern' || FLAT.has(kind) || kind === 'hearth') continue;
    // (Clear of the tall things' tops.)
    hang(s + (rnd() - 0.5) * 0.6, q + (rnd() - 0.5) * 0.6 - Math.sign(q) * (CLUTTER_SIZE[kind]?.[2] > 1.5 ? 0.9 : 0), CLUTTER_SIZE[kind]?.[2] > 1.5 ? 0.5 : 0);
  }
  while (out.length < 52) {
    const s = 0.8 + rnd() * (CHAMBER_LEN - 3.2), w = chamberShape(s)[0];
    hang(s, (rnd() * 2 - 1) * Math.max(0.6, w - 1.6));
  }
  // A few set on ledges down the tunnel, to see your way out by.
  for (const f of [0.22, 0.5, 0.78]) {
    const p = CAVE_LINE[Math.round(CHAMBER_FIRST * (1 - f))];
    out.push({ x: p[0] + p[3] * (p[6] - 0.3), y: p[5] + 1.45, z: p[1] - p[2] * (p[6] - 0.3), tall: 0.14, phase: f * 9, at: CANDLES_AT + 1.3 + f, ledge: true });
  }
  // The first to flare is the one over the ledger.
  out.push({ x: LECTERN[0], y: chamberShape(1.9)[2] + 1.85, z: LECTERN[1], tall: 0.16, phase: 1, at: CANDLES_AT });
  return out.sort((a, b) => a.at - b.at);
})();
// The candle nearest, of those hung in the room: your spark bursts it.
const nearestCandle = ([x, z], y) => {
  let best = -1, bd = 1e9;
  CANDLES.forEach((c, i) => { const d = Math.hypot(c.x - x, c.z - z, (c.y - y) * 0.5); if (!c.ledge && d < bd) { bd = d; best = i; } });
  return best;
};
export const BURST_CANDLE = nearestCandle([lerp(OPENING_SPAWN[0], FOLD_SPOT[0], 1.6), lerp(OPENING_SPAWN[1], FOLD_SPOT[1], 1.6)], CIRCLE_Y + 2.0);

// ---- the way down from the ledge ---------------------------------------------------------------------------------------
// Off the ledge along a shelf cut across the hillside; down four flights of stone steps that double back on each other;
// then a path along the foot of the hill, down onto the Long Road. Each point: x, z, its height, and what the stretch to
// it is. The land is cut and banked to it (src/core/terrain.js), the steps are laid on it (src/gfx/opening.js), and she
// leads you down it (src/core/escort.js).
const OUT5 = [MOUTH[0] - CAVE_LINE[0][2] * 5.6, MOUTH[1] - CAVE_LINE[0][3] * 5.6];
export const WAY = [
  [OUT5[0], OUT5[1], MOUTH[2] - 0.04, 'ledge'],
  [-310.5, 272.5, 78.5, 'path'], [-316.5, 267.5, 78.3, 'path'], [-320.5, 261.5, 78.0, 'path'], [-323, 256.5, 77.5, 'path'],
  [-311.5, 258.3, 72.3, 'stairs'], [-318, 247.2, 66.4, 'stairs'], [-305.5, 244.8, 60.5, 'stairs'], [-316, 236.7, 54.6, 'stairs'],
  [-304, 233.5, 50.8, 'path'], [-290, 229.5, 45.6, 'path'], [-276, 226, 41.9, 'path'], [-264, 219, 39.2, 'path'], [-256, 213.5, 37.8, 'path'],
];
export const WAY_W = 1.35, WAY_BLEND = 2.6, STAIR_FLAT = 0.9;
// Its stretches: ends, length, and whether it's a flight (level for STAIR_FLAT at each end: the landings at the turns).
export const WAY_SEGS = WAY.slice(1).map((b, i) => {
  const a = WAY[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  return { ax: a[0], az: a[1], ay: a[2], bx: b[0], bz: b[1], by: b[2], dx, dz, len, stairs: b[3] === 'stairs',
    x0: Math.min(a[0], b[0]) - WAY_W - WAY_BLEND, x1: Math.max(a[0], b[0]) + WAY_W + WAY_BLEND, z0: Math.min(a[1], b[1]) - WAY_W - WAY_BLEND, z1: Math.max(a[1], b[1]) + WAY_W + WAY_BLEND };
});
export const WAY_BOX = {
  x0: Math.min(MOUTH[0] - 12, ...WAY.map((p) => p[0] - 7)), x1: Math.max(MOUTH[0] + 12, ...WAY.map((p) => p[0] + 7)),
  z0: Math.min(MOUTH[1] - 12, ...WAY.map((p) => p[1] - 7)), z1: Math.max(MOUTH[1] + 12, ...WAY.map((p) => p[1] + 7)),
};
// The height of a stretch t of the way along it.
export function wayY(g, t) {
  if (!g.stairs) return g.ay + (g.by - g.ay) * t;
  const f = STAIR_FLAT / g.len;
  return g.ay + (g.by - g.ay) * clamp((t - f) / (1 - 2 * f), 0, 1);
}
// The land brought to the way: level where it runs, banked back to the hill's own lie either side. Where two flights are
// close (at a turn) each has its say by how near it is, so the ground between them has no step in it.
export function wayLevel(x, z, level) {
  if (x < WAY_BOX.x0 || x > WAY_BOX.x1 || z < WAY_BOX.z0 || z > WAY_BOX.z1) return level;
  let A = 0, B = 0, M = 0;
  for (let i = 0; i < WAY_SEGS.length; i++) {
    const g = WAY_SEGS[i];
    if (x < g.x0 || x > g.x1 || z < g.z0 || z > g.z1) continue;
    const t = clamp(((x - g.ax) * g.dx + (z - g.az) * g.dz) / (g.len * g.len), 0, 1);
    const d = Math.hypot(g.ax + g.dx * t - x, g.az + g.dz * t - z);
    if (d >= WAY_W + WAY_BLEND) continue;
    const k = 1 - smoothstep(WAY_W, WAY_W + WAY_BLEND, d), k2 = k * k * k * k;
    A += k2 * wayY(g, t); B += k2; if (k > M) M = k;
  }
  return B > 0 ? level + (A / B - level) * M : level;
}
// How far the drawn ground is sunk under the steps, which lie over it (the sim walks the slope they're laid on).
export function wayDip(x, z) {
  if (x < WAY_BOX.x0 || x > WAY_BOX.x1 || z < WAY_BOX.z0 || z > WAY_BOX.z1) return 0;
  let dip = 0;
  for (let i = 0; i < WAY_SEGS.length; i++) {
    const g = WAY_SEGS[i];
    if (!g.stairs || x < g.x0 || x > g.x1 || z < g.z0 || z > g.z1) continue;
    const t = clamp(((x - g.ax) * g.dx + (z - g.az) * g.dz) / (g.len * g.len), 0, 1);
    const d = Math.hypot(g.ax + g.dx * t - x, g.az + g.dz * t - z);
    dip = Math.max(dip, 0.45 * (1 - smoothstep(0.95, 1.5, d)));
  }
  return dip;
}

// Out of the chamber and down the tunnel, clear of her things (auto-play's way out: src/ui/autobrain.js).
export const RUN_OUT = (() => {
  const pts = [at(13, -0.6), at(9, -0.7), at(4.5, -0.2), at(0.5, 0)];
  for (let i = CHAMBER_FIRST - 3; i > 0; i -= 5) pts.push([CAVE_LINE[i][0], CAVE_LINE[i][1]]);
  pts.push(CAVE_MOUTH);
  return pts;
})();

// ---- the walk down ------------------------------------------------------------------------------------------------------
// From the ledge, down onto the Long Road and along it to the town's edge (src/sim/opening.js follows the road's own line).
export const ESCORT_TO = [-30, 21];

// Her clips in the opening (the walk is the form's own). Those that aren't a way of moving are kept on her mark.
// She runs with her own 'run' at every speed, flat out too (the owner's pick in lisandra.html: an even stride, light on
// her feet; no sprint clip, by the owner's word).
export const OPENING_RUN = 'run';
export const OPENING_MOVES = [OPENING_RUN];
export const OPENING_CLIPS = [
  'Spell_Simple_Idle_Loop', 'Idle_Lantern_Loop', 'greet_01', 'greet_02', 'Interact', 'Hit_Knockback', 'scared_02', 'afraid',
  'frightened', 'fold_arms', 'Idle_FoldArms_Loop', 'wait', 'Spell_Simple_Shoot', 'Pointing into the distance', 'Pointing at an enemy',
  'complain_01', 'complain_02', 'Idle_Talking_Loop', 'Talking to someone angrily', 'PickUp_Table', 'look_around',
  'Crouch_Idle_Loop', 'cry', 'depressed', 'standing_relax', 'Yes', 'agree', 'hug', 'angry_02', 'scratch', 'heart_pose',
  'fall', 'Farm_PlantSeed', 'bow', 'Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Exit', 'frustrated_01',
  ...OPENING_MOVES,
];
