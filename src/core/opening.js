// Lisandra's cave, high on the Long Road, and the opening played out in it. Shared by the sim (where you can walk), the
// land (where the hillside opens), the renderer (the rock, the clutter, the candles) and the screen (the camera and the words).
import { clamp, lerp, smoothstep } from './math.js';

// WAKE: the summons, the flash, the candles and her speech, up to the name prompt. NAME: waiting for it. HERD: she takes the
// name and herds you out. LEAVE: you walk out. COLLAPSE: the ledge, the cave-in, her face. ESCORT: the walk down. ARRIVED: done.
export const OPENING = { OFF: 0, WAKE: 1, NAME: 2, HERD: 3, LEAVE: 4, COLLAPSE: 5, ESCORT: 6, ARRIVED: 7 };
export const OPENING_REVISION = 4;

// The beats every part of the game keys off, in seconds into WAKE.
export const SWAP_AT = 9.0;        // the flash: the glamour shorts out and the witch is standing there
export const SNAP_AT = 14.6;       // her snap: the drone cuts dead
export const CANDLES_AT = 15.6;    // the candles pop alight
export const NAME_AT = 41.0;       // the name prompt
export const HERD_END = 13.2;      // control comes back this long after the name
export const COLLAPSE_END = 41.8;  // the bars slide away and the walk down begins
export const DUST_AT = 7.0;        // in COLLAPSE: the mouth caves in, and she comes out of the dust pretty
export const KNEEL_UP = 10.3;      // in COLLAPSE: she gets up off her knee
// In COLLAPSE, your eye height: down to a crouch as the mouth comes down, up again as she gets up, then a hand's breadth
// under full height until the walk, level with her eyes rather than looking down on her crown.
export const collapseEye = (t) => 1.62 - 0.52 * smoothstep(DUST_AT + 0.05, DUST_AT + 0.5, t) * (1 - smoothstep(KNEEL_UP, KNEEL_UP + 1.1, t))
  - 0.1 * smoothstep(DUST_AT, DUST_AT + 0.5, t) * (1 - smoothstep(COLLAPSE_END - 3.5, COLLAPSE_END - 0.6, t));

// ---- the cave's plan ---------------------------------------------------------------------------------------------------
// A centreline from the mouth in: x, z, the floor's height, the half width and the roof's height over the floor. It hooks
// right, then turns hard left into the chamber, so from inside you never see daylight.
const MOUTH = [-353.0, 257.0, 58.4, 1.5, 3.2];
const KNEES = [
  MOUTH,
  [-347.6, 264.0, 58.15, 1.32, 2.95],
  [-340.6, 268.6, 57.8, 1.4, 3.1],
  [-342.2, 272.6, 57.5, 1.65, 3.5],   // where the tunnel opens into the chamber
];
const ENTRY = KNEES[3];
export const CHAMBER_AXIS = (() => {
  const dx = ENTRY[0] - KNEES[2][0], dz = ENTRY[1] - KNEES[2][1], l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
})();
export const CHAMBER_LEN = 16.7;
// The chamber's half width, roof and floor, by distance in from where the tunnel meets it.
export function chamberShape(s) {
  const w = s <= 11 ? lerp(1.65, 6.8, smoothstep(0, 3.4, s)) : 6.8 * Math.sqrt(Math.max(0, 1 - ((s - 11) / 5.75) ** 2));
  const h = s <= 10.5 ? lerp(3.5, 7.6, smoothstep(0, 4.5, s)) : 7.6 * Math.sqrt(Math.max(0, 1 - ((s - 10.5) / 6.65) ** 2));
  return [w, h, 57.5 - 0.1 * smoothstep(0, 4, s)];
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
const at = (s, q) => chamberPoint(s, q);
export const WAKE_S = 11.8;
export const OPENING_SPAWN = at(WAKE_S, 0);
export const OPENING_YAW = CHAMBER_YAW + Math.PI;   // waking facing back out, toward her and the tunnel
export const PORTAL_S = 14.4;
export const PORTAL = (() => { const [x, z] = at(PORTAL_S, 0); return [x, chamberShape(PORTAL_S)[2] + 1.75, z]; })();
export const PORTAL_YAW = CHAMBER_YAW + Math.PI;
export const CIRCLE = at(WAKE_S, 0);
export const WITCH_MARK = at(2.9, -1.0);
export const WITCH_STOP = at(9.9, 0.2);      // 1.9 m in front of you, when she's said her piece
// Her way across, through her own mess.
export const WEAVE = [at(2.9, -1.0), at(4.3, -2.1), at(6.0, -1.7), at(7.3, 0.8), at(8.8, 0.6), WITCH_STOP];
// She tidies by the portal while you go, and runs for the mouth when it dies.
export const TIDY_MARK = at(13.0, 2.6);
export const LECTERN = at(1.7, 1.15);
export const RUN_OUT = (() => {
  const pts = [TIDY_MARK, at(9, 1.0), at(4, 0.3), at(0.5, 0)];
  for (let i = CHAMBER_FIRST - 3; i > 0; i -= 5) pts.push([CAVE_LINE[i][0], CAVE_LINE[i][1]]);
  pts.push(CAVE_MOUTH);
  return pts;
})();

// The clutter: kind, s, q, turn, scale, and what it sits on (a height). Drawn by src/gfx/opening.js; boxes in src/sim/world.js.
export const CLUTTER = [
  ['crate', 2.1, -3.4, 0.3, 1], ['crate', 2.15, -3.45, 0.55, 0.78, 0.64], ['crate', 4.6, -5.0, -0.2, 1.1], ['crate', 5.7, -5.4, 0.1, 0.9],
  ['crate', 5.1, -5.2, 0.4, 0.75, 0.7], ['barrel', 3.4, 4.4, 0, 1], ['barrel', 4.3, 5.1, 0.6, 0.95], ['barrel', 3.85, 4.75, 1.2, 0.9, 0.85],
  ['table', 7.6, 4.9, -0.12, 1], ['chest', 9.3, -5.5, 1.4, 1], ['books', 6.4, -3.3, 0.7, 1], ['books', 9.6, 4.6, -0.4, 0.8],
  ['bedroll', 13.6, 4.2, 0.35, 1], ['cauldron', 8.4, -3.9, 0, 1], ['lectern', 1.7, 1.15, 2.8, 1], ['sack', 3.0, -4.6, 0.2, 1],
  ['sack', 10.6, -5.2, 1.1, 0.9], ['crate', 12.2, -5.3, -0.3, 1], ['barrel', 11.8, 5.6, 0, 0.9],
  // In the middle of the room, so she comes to you round her own mess.
  ['crate', 5.4, 1.3, 0.4, 0.9], ['crate', 5.42, 1.28, 0.95, 0.6, 0.58], ['sack', 5.95, 1.8, 0.8, 0.85], ['barrel', 8.0, -1.05, 0.3, 0.8],
  ['sack', 8.45, -1.45, 2.0, 0.8], ['crate', 6.8, 2.35, -0.5, 0.85], ['books', 6.78, 2.33, 0.4, 0.7, 0.55],
];
// Half sizes across and along, and the height, by kind.
export const CLUTTER_SIZE = {
  crate: [0.32, 0.32, 0.64], barrel: [0.3, 0.3, 0.85], table: [0.75, 0.42, 0.82], chest: [0.42, 0.28, 0.55], books: [0.25, 0.2, 0.3],
  bedroll: [0.45, 0.95, 0.2], cauldron: [0.42, 0.42, 0.62], lectern: [0.28, 0.24, 1.15], sack: [0.25, 0.25, 0.5],
};
export function clutterBoxes() {
  return CLUTTER.filter((c) => c[0] !== 'bedroll' && c[0] !== 'books' && c[5] === undefined).map(([kind, s, q, yaw, k]) => {
    const [x, z] = at(s, q), [hx, hz, h] = CLUTTER_SIZE[kind];
    return { x, z, hx: hx * k, hz: hz * k, yaw: yaw + CHAMBER_YAW, h: h * k };
  });
}

// The floating candles: where each hangs, and when it catches in the wave that rolls out from her past you. They hang low,
// 1.8 to 2.6 m up, most of them over her things, so the light falls on the room's mess and not on bare rock.
export const CANDLES = (() => {
  const out = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const hang = (s, q) => {
    const [x, z] = at(s, q), floor = chamberShape(s)[2];
    const d = Math.hypot(x - WITCH_MARK[0], z - WITCH_MARK[1]);
    out.push({ x, y: floor + 1.8 + rnd() * 0.8, z, tall: 0.1 + rnd() * 0.12, phase: rnd() * 6.28, at: CANDLES_AT + 0.06 + d * 0.07 + rnd() * 0.08 });
  };
  for (const [kind, s, q] of CLUTTER) if (kind !== 'lectern') hang(s + (rnd() - 0.5) * 0.6, q + (rnd() - 0.5) * 0.6);
  while (out.length < 44) {
    const s = 0.8 + rnd() * 14.2, w = chamberShape(s)[0];
    hang(s, (rnd() * 2 - 1) * Math.max(0.6, w - 1.3));
  }
  // A few set on ledges down the tunnel, to see your way out by.
  for (const f of [0.22, 0.5, 0.78]) {
    const p = CAVE_LINE[Math.round(CHAMBER_FIRST * (1 - f))];
    out.push({ x: p[0] + p[3] * (p[6] - 0.3), y: p[5] + 1.45, z: p[1] - p[2] * (p[6] - 0.3), tall: 0.14, phase: f * 9, at: CANDLES_AT + 1.3 + f, ledge: true });
  }
  // The first to flare is the one over the ledger.
  out.push({ x: LECTERN[0], y: chamberShape(1.7)[2] + 1.85, z: LECTERN[1], tall: 0.16, phase: 1, at: CANDLES_AT });
  return out.sort((a, b) => a.at - b.at);
})();

// ---- the walk down ------------------------------------------------------------------------------------------------------
// From the ledge, down onto the Long Road and along it to the town's edge (src/sim/opening.js follows the road's own line).
export const ESCORT_TO = [-30, 21];

// Her clips in the opening (the walk is the form's own). Those that aren't a way of moving are kept on her mark.
export const OPENING_MOVES = ['Jog_Fwd_Loop', 'Sprint_Loop'];
export const OPENING_CLIPS = [
  'Spell_Simple_Idle_Loop', 'Idle_Lantern_Loop', 'greet_01', 'greet_02', 'Interact', 'Hit_Knockback', 'scared_02', 'afraid',
  'frightened', 'fold_arms', 'Idle_FoldArms_Loop', 'wait', 'Spell_Simple_Shoot', 'Pointing into the distance', 'Pointing at an enemy',
  'complain_01', 'complain_02', 'Idle_Talking_Loop', 'Talking to someone angrily', 'PickUp_Table', 'look_around',
  'Crouch_Idle_Loop', 'cry', 'depressed', 'standing_relax', 'Yes', 'agree', 'hug', 'angry_01', 'scratch', 'heart_pose',
  'fall', 'Farm_PlantSeed',
  ...OPENING_MOVES,
];
