// Shield surfing, after Bellmourn's board.js. Jump and keep Space held a moment: the shield's under your feet, and it stays there when
// you let go. Space on the ground hops with it; Space again off the ground steps off it. A wall stops it, and so does running out of
// speed. Slopes speed you up, flat ground slows you, a crest throws you into the air, and a landing on a downslope turns the drop into speed.
// W pushes a little, S drags a heel, A and D carve, all as you look.
import { floorAt } from '../core/interior.js';
import { INPUT, EV } from '../core/layout.js';
import { clamp } from '../core/math.js';

const G = 14;           // the player's own gravity
const HOLD = 0.12;      // Space held this long, off the ground: on the shield
const COOL = 0.25;      // off it this long before getting on again
const VMAX = 26;
const DRAG = 0.011;     // the air against you (x speed squared)
const GRIP = 0.12, GRIP_STONE = 0.2;   // how much the ground holds it back, a share of its weight
const PUSH = 6.5, PUSH_TOP = 9;        // W: strong from still, a little at speed
const BRAKE = 5;        // S, against the way you go
const CARVE = 17, TURN = 2.6, AIR_TURN = 0.8;   // A and D: the sideways grip (m/s/s) and the fastest turn (rad/s)
const POP = 5.6;        // the hop
const STOPPED = 0.7, STOP_AFTER = 0.25;   // this slow for this long, on the ground: off it
const GRACE = 0.4;      // ...though not just after landing, when a push is on its way
const STEP_E = 0.55;    // how far either side the slope is read
const R = 0.36;
const out = new Float32Array(3), n = [0, 1, 0];

function slope(p, world) {
  const top = p.y + 0.6, low = p.y - 0.6, e = STEP_E;
  const h = (x, z) => clamp(world.height(x, z), low, top);
  const hx = (h(p.x + e, p.z) - h(p.x - e, p.z)) / (2 * e), hz = (h(p.x, p.z + e) - h(p.x, p.z - e)) / (2 * e);
  const l = 1 / Math.hypot(hx, 1, hz);
  n[0] = -hx * l; n[1] = l; n[2] = -hz * l;
}

function off(p) {
  p.surfing = false; p.surfAir = false; p.surfHold = 0; p.surfCool = COOL; p.surfSlow = 0;
}

// Turn the velocity toward the wish, by at most rate (rad/s) x how sideways it is. Returns how fast it turned.
function carve(p, wx, wz, rate, dt) {
  const sp = Math.hypot(p.vx, p.vz), wl = Math.hypot(wx, wz);
  if (sp < 0.3 || wl < 0.1) return 0;
  const cross = (p.vx * wz - p.vz * wx) / (sp * wl), dot = (p.vx * wx + p.vz * wz) / (sp * wl);
  const want = Math.atan2(cross, dot);
  const turn = Math.sign(want) * Math.min(Math.abs(want), rate * Math.abs(cross) * dt * wl);
  if (!turn) return 0;
  const c = Math.cos(turn), s = Math.sin(turn), x = p.vx * c - p.vz * s;
  p.vz = p.vx * s + p.vz * c; p.vx = x;
  return turn / dt;
}

// Across the ground, along what it can slide along. False if it met a wall, and that's the end of the ride.
function move(p, dt, sim) {
  const ox = p.x, oz = p.z, dx = p.vx * dt, dz = p.vz * dt, hs = Math.hypot(p.vx, p.vz);
  p.x += dx; p.z += dz;
  out[0] = p.x; out[2] = p.z;
  sim.world.resolve(out, R, p.y + 0.2);
  p.x = out[0]; p.z = out[2];
  p.keepToLand();
  const mx = p.x - ox, mz = p.z - oz, bx = dx - mx, bz = dz - mz;
  if (Math.hypot(bx, bz) < 1e-4 || hs < 1e-4) return true;
  const into = (bx * p.vx + bz * p.vz) / hs / dt;
  if (into > 0.5 * hs) {
    p.vx *= 0.15; p.vz *= 0.15;
    sim.event(EV.WALL, p.x, p.y + 0.3, p.z, -p.vx / hs, 0, -p.vz / hs);
    off(p);
    return false;
  }
  p.vx = mx / dt; p.vz = mz / dt;
  return true;
}

function ride(p, dt, wx, wz, sim) {
  const w = sim.world;
  slope(p, w);
  // Gravity along the slope, on the ground's plane.
  p.vx += G * n[1] * n[0] * dt; p.vy += G * (n[1] * n[1] - 1) * dt; p.vz += G * n[1] * n[2] * dt;
  let d = p.vx * n[0] + p.vy * n[1] + p.vz * n[2];
  p.vx -= n[0] * d; p.vy -= n[1] * d; p.vz -= n[2] * d;
  let turn = 0, brake = 0;
  const wl = Math.hypot(wx, wz);
  if (wl > 0.1) {
    const hs = Math.hypot(p.vx, p.vz), sp = Math.hypot(hs, p.vy);
    if (hs < 0.6) { p.vx += wx / wl * PUSH * dt; p.vz += wz / wl * PUSH * dt; } else {
      const along = (p.vx * wx + p.vz * wz) / (hs * wl);
      if (along > 0) {
        const k = 1 + PUSH * along * Math.max(0.12, 1 - sp / PUSH_TOP) * dt / Math.max(sp, 0.1);
        p.vx *= k; p.vy *= k; p.vz *= k;
      } else brake = BRAKE * -along;
      turn = carve(p, wx, wz, Math.min(TURN, CARVE / hs), dt);
    }
  }
  // The ground and the air holding you back, and a carve scrubs a little.
  const sp = Math.hypot(p.vx, p.vy, p.vz), mu = floorAt(p.x, p.z) === null ? GRIP : GRIP_STONE;
  const left = clamp(sp - (mu * G * n[1] + DRAG * sp * sp + brake + 0.6 * Math.abs(turn)) * dt, 0, VMAX);
  if (sp > 1e-6) { const k = left / sp; p.vx *= k; p.vy *= k; p.vz *= k; } else { p.vx = 0; p.vy = 0; p.vz = 0; }
  const oy = p.y;
  if (!move(p, dt, sim)) return;
  // Down the slope with it. A crest that falls away faster than you would throws you into the air.
  const pred = oy + p.vy * dt, floor = w.height(p.x, p.z);
  if (floor >= pred - 0.5 * G * dt * dt - 0.025) {
    p.y = floor;
    slope(p, w);
    const was = Math.hypot(p.vx, p.vy, p.vz);
    d = p.vx * n[0] + p.vy * n[1] + p.vz * n[2];
    p.vx -= n[0] * d; p.vy -= n[1] * d; p.vz -= n[2] * d;
    // (The next stretch's slope keeps the speed. A sharp crease into a bank costs what goes into it.)
    if (Math.abs(d) < 2.5) { const l = Math.hypot(p.vx, p.vy, p.vz); if (l > 1e-6) { const k = was / l; p.vx *= k; p.vy *= k; p.vz *= k; } }
  } else {
    p.surfAir = true;
    p.y = pred;
  }
}

function fly(p, dt, wx, wz, sim) {
  p.vy -= G * dt;
  const k = Math.max(0, 1 - DRAG * Math.hypot(p.vx, p.vy, p.vz) * dt);
  p.vx *= k; p.vy *= k; p.vz *= k;
  carve(p, wx, wz, AIR_TURN, dt);
  if (!move(p, dt, sim)) return;
  p.y += p.vy * dt;
  const floor = sim.world.height(p.x, p.z);
  if (p.y > floor) return;
  // The landing: what went into the ground is lost, and what went along it is kept.
  p.y = floor;
  slope(p, sim.world);
  const into = -(p.vx * n[0] + p.vy * n[1] + p.vz * n[2]);
  if (into > 0) { p.vx += n[0] * into; p.vy += n[1] * into; p.vz += n[2] * into; }
  if (into > 2) {
    sim.event(EV.LAND, p.x, p.y, p.z, clamp(into / 7, 0, 1));
    p.landKick = clamp(into * 0.018, 0, 0.13);
  }
  p.surfAir = false; p.surfGrace = GRACE; p.surfSlow = 0;
}

// One tick of the player's movement, if the shield has it: true, and the walk doesn't run.
export function stepSurf(p, dt, input, sim) {
  p.surfCool = Math.max(0, p.surfCool - dt);
  if (!p.surfing) {
    p.surfHold = input[INPUT.JUMP_HELD] > 0.5 ? p.surfHold + dt : 0;
    if (input[INPUT.SHIELD] < 0.5 || p.surfHold < HOLD || p.onGround || p.surfCool > 0) return false;
    p.surfing = true; p.surfAir = true; p.surfSlow = 0;
    p.dodgeT = 0;
  }
  if (input[INPUT.SHIELD] < 0.5) { off(p); return false; }
  // Space, as a press: a hop on the ground, off the shield in the air.
  const pressed = input[INPUT.JUMP] !== p.jumpSeen;
  p.jumpSeen = input[INPUT.JUMP];
  if (pressed) {
    if (p.surfAir) { off(p); return false; }
    slope(p, sim.world);
    p.vx += n[0] * POP * 0.35; p.vy += n[1] * POP * 0.35 + POP * 0.65; p.vz += n[2] * POP * 0.35;
    p.surfAir = true;
    sim.event(EV.JUMP, p.x, p.y, p.z);
  }
  const mx = input[INPUT.MOVE_X], mz = input[INPUT.MOVE_Z], s = Math.sin(p.yaw), c = Math.cos(p.yaw);
  const wx = mx * -c + mz * s, wz = mx * s + mz * c;
  if (p.surfAir) fly(p, dt, wx, wz, sim); else ride(p, dt, wx, wz, sim);
  p.onGround = !p.surfAir;
  if (!p.surfing) return true;
  // Run out of speed: off it, once there's been the chance of a push.
  p.surfGrace = Math.max(0, p.surfGrace - dt);
  if (!p.surfAir && !p.surfGrace && Math.hypot(p.vx, p.vz) < STOPPED) {
    p.surfSlow += dt;
    if (p.surfSlow >= STOP_AFTER) off(p);
  } else p.surfSlow = 0;
  return true;
}
