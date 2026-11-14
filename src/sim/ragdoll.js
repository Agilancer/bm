// What a body does once nothing's holding it up. Whatever dies goes limp where it stands: the joints that matter become points
// with weight, held to each other at the lengths they had (and kept from folding flat), and they fall, land on the ground and
// lie as they landed. No clip: the skeleton is read back off the points each tick, so it works for any rig (a man, a stag, a
// dragon, a spider) with no table of its bones. Fingers, twist bones and the like ride their parents as they were.
// Runs on the sim thread, a few seconds a body, with nothing allocated per tick; asleep, a body costs nothing.
import { quatMul, quatNormalize, quatRotate } from '../core/math.js';

const STEP = 1 / 120, GRAVITY = 15, ITERS = 8, MOST = 40;
// The most a point moves in a tick (30 m/s), and how far over a point's head the ground can be and still be ground.
const FASTEST = 30 * STEP, LEDGE = 0.45;
// Joints that are never points of their own.
const SOFT = /thumb|index|middle|ring_|ring\d|handring|pinky|finger|twist|roll|weapon|shield|grip|jaw|eye|tongue|leaf|_end$/i;
// A two-legged body's knees (Mixamo's LeftLeg, the master skeleton's calf_l): they bend one way.
const KNEE = /(^|[:_])(left|right)?(leg|calf)(_[lr])?$/i;
const HEAD = /head/i;

const tq = new Float32Array(4), tq2 = new Float32Array(4), ta = new Float32Array(3), tb = new Float32Array(3), tc = new Float32Array(3);
const wall = new Float32Array(3);

const conj = (out, q, qi) => { out[0] = -q[qi]; out[1] = -q[qi + 1]; out[2] = -q[qi + 2]; out[3] = q[qi + 3]; return out; };

// The shortest turn that takes one unit vector to another.
function arc(out, ax, ay, az, bx, by, bz) {
  const d = ax * bx + ay * by + az * bz;
  if (d < -0.99999) {
    // (Straight back: half a turn about anything square to it.)
    let x = 0, y = -az, z = ay;
    if (Math.abs(ax) < 0.6) { x = 0; y = -az; z = ay; } else { x = -ay; y = ax; z = 0; }
    const l = Math.hypot(x, y, z) || 1;
    out[0] = x / l; out[1] = y / l; out[2] = z / l; out[3] = 0;
    return out;
  }
  out[0] = ay * bz - az * by; out[1] = az * bx - ax * bz; out[2] = ax * by - ay * bx; out[3] = 1 + d;
  quatNormalize(out, 0);
  return out;
}

export class Ragdoll {
  // rig: names, parent (parents first), count. wq, wt: where every joint is in the world this instant.
  // o: yaw, vx, vz (the body's own going), dirX, dirZ, kick (which way it was struck, and how hard, m/s), size (its height),
  //    ground(x, z, y), walls(v3, r, feet) or null.
  constructor(rig, wq, wt, o) {
    const n = this.n = rig.count, { parent, names } = rig;
    this.parent = parent;
    this.ground = o.ground; this.walls = o.walls || null;
    const q0 = this.q0 = Float32Array.from(wq.subarray(0, n * 4)), p0 = Float32Array.from(wt.subarray(0, n * 3));
    const dist = (a, b) => Math.hypot(p0[a * 3] - p0[b * 3], p0[a * 3 + 1] - p0[b * 3 + 1], p0[a * 3 + 2] - p0[b * 3 + 2]);
    // The body proper: the root with the most under it, and down from there to the first joint that forks (past a `root` on
    // the ground, a `cog`). What's above that, or off on a root of its own, rides it.
    // (Not every file lists a joint after its parent: `order` does.)
    const size = new Int16Array(n).fill(1), kids = Array.from({ length: n }, () => []);
    for (let j = 0; j < n; j++) if (parent[j] >= 0) kids[parent[j]].push(j);
    const order = this.order = [];
    for (let j = 0; j < n; j++) if (parent[j] < 0) order.push(j);
    for (let at = 0; at < order.length; at++) for (const k of kids[order[at]]) order.push(k);
    for (let at = n - 1; at >= 0; at--) { const j = order[at]; if (parent[j] >= 0) size[parent[j]] += size[j]; }
    let top = order[0];
    for (let j = 0; j < n; j++) if (parent[j] < 0 && size[j] > size[top]) top = j;
    let base = top;
    while (kids[base].length === 1) base = kids[base][0];
    if (!kids[base].length) base = top;
    this.base = base;
    const inBody = new Uint8Array(n), soft = new Uint8Array(n);
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const j of order) {
      inBody[j] = j === base || (parent[j] >= 0 && inBody[parent[j]]) ? 1 : 0;
      if (!inBody[j]) continue;
      soft[j] = j !== base && (soft[parent[j]] || SOFT.test(names[j])) ? 1 : 0;
      for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p0[j * 3 + a]); hi[a] = Math.max(hi[a], p0[j * 3 + a]); }
    }
    this.inBody = inBody;
    const S = this.size = Math.max(Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), o.size || 0, 0.2);
    // Which joints are points: each one far enough from the last point above it. Too many, and the measure goes up.
    const part = this.part = new Int16Array(n), over = new Int16Array(n);
    let pj = [], pp = [], thresh = S * 0.04;
    for (;;) {
      pj = []; pp = [];
      for (const j of order) {
        part[j] = -1; over[j] = -1;
        if (!inBody[j]) continue;
        if (j === base) { part[j] = over[j] = 0; pj.push(j); pp.push(-1); continue; }
        const a = over[parent[j]];
        if (!soft[j] && dist(j, pj[a]) > thresh) { part[j] = over[j] = pj.length; pj.push(j); pp.push(a); } else over[j] = a;
      }
      if (pj.length <= MOST) break;
      thresh *= 1.25;
    }
    const m = this.m = pj.length;
    this.pj = pj; this.pp = pp;
    const pos = this.pos = new Float32Array(m * 3), prev = this.prev = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) for (let a = 0; a < 3; a++) pos[i * 3 + a] = p0[pj[i] * 3 + a];
    const pk = Array.from({ length: m }, () => []), weight = new Int16Array(m).fill(1);
    for (let i = m - 1; i > 0; i--) { weight[pp[i]] += weight[i]; pk[pp[i]].unshift(i); }
    // The trunk: whatever limbs hang off, and what's between such places. It bends a little; a limb bends a lot.
    const trunk = new Uint8Array(m);
    for (let i = m - 1; i >= 0; i--) {
      let big = 0, under = 0;
      for (const k of pk[i]) { if (weight[k] >= 2) big++; if (trunk[k]) under = 1; }
      trunk[i] = big >= 2 || under ? 1 : 0;
    }
    const pd = (a, b) => dist(pj[a], pj[b]);
    this.rad = Float32Array.from(pj, (j, i) => S * (trunk[i] ? 0.06 : HEAD.test(names[j]) ? 0.055 : pk[i].length ? 0.04 : 0.03));
    // The ground under each, and where each last stood on ground that made sense.
    // (A hand through a wall at the moment of death has no ground of its own that makes sense: it takes the body's.)
    const under = Math.min(o.ground(p0[base * 3], p0[base * 3 + 2], p0[base * 3 + 1]), lo[1]);
    this.gnd = Float32Array.from(pj, (j, i) => { const h = o.ground(p0[j * 3], p0[j * 3 + 2], p0[j * 3 + 1]); return (h > p0[j * 3 + 1] + this.rad[i] + LEDGE ? under : h) + this.rad[i]; });
    this.safe = new Float32Array(m * 2);
    for (let i = 0; i < m; i++) { this.safe[i * 2] = p0[pj[i] * 3]; this.safe[i * 2 + 1] = p0[pj[i] * 3 + 2]; }
    // What holds them together. kind 0: this far apart, exactly. kind 1: no nearer than this.
    const ca = [], cb = [], cd = [], ck = [];
    const hold = (a, b, d, kind) => { ca.push(a); cb.push(b); cd.push(d); ck.push(kind); };
    const first = (i) => { let best = -1; for (const k of pk[i]) if (best < 0 || weight[k] > weight[best] || (weight[k] === weight[best] && pd(k, i) > pd(best, i))) best = k; return best; };
    for (let i = 1; i < m; i++) {
      const a = pp[i], g = pp[a] ?? -1;
      hold(i, a, pd(i, a), 0);
      if (g >= 0) {
        const L = pd(i, a) + pd(a, g), now = pd(i, g), stiff = trunk[a] && trunk[g];
        hold(i, g, Math.min(now * 0.97, L * (stiff ? 0.96 : 0.6)), 1);
      }
    }
    for (let i = 0; i < m; i++) {
      const k = pk[i], c = k.length;
      if (c < 2) continue;
      // Brothers keep their distance (hips, shoulders, the roots of a spider's legs): that's what gives a trunk its shape.
      if (c <= 6) {
        for (let a = 0; a < c; a++) for (let b = a + 1; b < c; b++) {
          hold(k[a], k[b], pd(k[a], k[b]), 0);
          // And what hangs from each doesn't pass through the other's (knees, shoulders).
          const ka = first(k[a]), kb = first(k[b]);
          if (ka >= 0 && kb >= 0) hold(ka, kb, Math.min(pd(ka, kb) * 0.97, pd(k[a], k[b]) * 0.75), 1);
        }
      } else for (let a = 0; a < c; a++) { hold(k[a], k[(a + 1) % c], pd(k[a], k[(a + 1) % c]), 0); hold(k[a], k[(a + 2) % c], pd(k[a], k[(a + 2) % c]), 0); }
    }
    this.ca = Int16Array.from(ca); this.cb = Int16Array.from(cb); this.cd = Float32Array.from(cd); this.ck = Uint8Array.from(ck);
    // Reading the skeleton back: each point's joint turns to face its heaviest child, and (where it has two that aren't in a
    // line) rolls about that to face the second. These are the directions to those children, in the joint's own frame.
    const aim1 = this.aim1 = new Int16Array(m).fill(-1), aim2 = this.aim2 = new Int16Array(m).fill(-1);
    const u1 = this.u1 = new Float32Array(m * 3), u2 = this.u2 = new Float32Array(m * 3);
    const dirTo = (out, oi, from, to) => {
      const j = pj[from], k = pj[to];
      ta[0] = p0[k * 3] - p0[j * 3]; ta[1] = p0[k * 3 + 1] - p0[j * 3 + 1]; ta[2] = p0[k * 3 + 2] - p0[j * 3 + 2];
      const l = Math.hypot(ta[0], ta[1], ta[2]) || 1;
      ta[0] /= l; ta[1] /= l; ta[2] /= l;
      tb[0] = ta[0]; tb[1] = ta[1]; tb[2] = ta[2];
      quatRotate(out, oi, conj(tq, q0, j * 4), 0, ta, 0);
    };
    for (let i = 0; i < m; i++) {
      const k1 = first(i);
      if (k1 < 0) continue;
      aim1[i] = k1; dirTo(u1, i * 3, i, k1);
      const ax = tb[0], ay = tb[1], az = tb[2];
      let best = -1, bs = 0.25;
      for (const k of pk[i]) {
        if (k === k1) continue;
        dirTo(tc, 0, i, k);
        const s = Math.hypot(ay * tb[2] - az * tb[1], az * tb[0] - ax * tb[2], ax * tb[1] - ay * tb[0]);
        if (s > bs) { bs = s; best = k; }
      }
      if (best >= 0) { aim2[i] = best; dirTo(u2, i * 3, i, best); }
    }
    // Every other joint, as it sat on its parent (or, for what isn't the body proper, on the body's first joint).
    const lq = this.lq = new Float32Array(n * 4), lt = this.lt = new Float32Array(n * 3);
    for (let j = 0; j < n; j++) {
      if (j === base) continue;
      const p = inBody[j] ? parent[j] : base;
      conj(tq, q0, p * 4);
      quatMul(lq, j * 4, tq, 0, q0, j * 4);
      ta[0] = p0[j * 3] - p0[p * 3]; ta[1] = p0[j * 3 + 1] - p0[p * 3 + 1]; ta[2] = p0[j * 3 + 2] - p0[p * 3 + 2];
      quatRotate(lt, j * 3, tq, 0, ta, 0);
    }
    // Knees: found by name on a two-legged body, with which way is forward kept against the hips' own three points.
    this.knees = null;
    const knees = [];
    for (let i = 1; i < m; i++) if (KNEE.test(names[pj[i]]) && pp[i] >= 0 && pk[i].length) knees.push([pp[i], i, first(i)]);
    if (knees.length === 2 && aim1[0] >= 0 && aim2[0] >= 0) {
      this.knees = knees;
      this.frame(tc);
      const fx = Math.sin(o.yaw || 0), fz = Math.cos(o.yaw || 0);
      this.fwd = [fx * fr[0] + fz * fr[2], fx * fr[3] + fz * fr[5], fx * fr[6] + fz * fr[8]];
    }
    // Off it goes: its own going, the blow's (more of it higher up, so it's thrown over rather than slid), a little of its own.
    let y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < m; i++) { y0 = Math.min(y0, pos[i * 3 + 1]); y1 = Math.max(y1, pos[i * 3 + 1]); }
    const kick = o.kick || 0, dx = o.dirX || 0, dz = o.dirZ || 0;
    for (let i = 0; i < m; i++) {
      const w = 0.3 + 0.9 * (pos[i * 3 + 1] - y0) / Math.max(y1 - y0, 0.1);
      const vx = (o.vx || 0) + dx * kick * w + (Math.random() - 0.5) * 0.5, vy = kick * 0.3 * w, vz = (o.vz || 0) + dz * kick * w + (Math.random() - 0.5) * 0.5;
      prev[i * 3] = pos[i * 3] - vx * STEP; prev[i * 3 + 1] = pos[i * 3 + 1] - vy * STEP; prev[i * 3 + 2] = pos[i * 3 + 2] - vz * STEP;
    }
    this.age = 0; this.calm = 0; this.asleep = false; this.last = null; this.tick = 0; this.dy = 0; this.fresh = true;
    this.x = pos[0]; this.y = pos[1]; this.z = pos[2];
  }

  // The hips' frame from their three points: along the spine, square to it toward the second child, and the third of them.
  frame() {
    const { pos, aim1, aim2 } = this, a = aim1[0] * 3, b = aim2[0] * 3;
    let ex = pos[a] - pos[0], ey = pos[a + 1] - pos[1], ez = pos[a + 2] - pos[2];
    let l = Math.hypot(ex, ey, ez) || 1;
    ex /= l; ey /= l; ez /= l;
    let sx = pos[b] - pos[0], sy = pos[b + 1] - pos[1], sz = pos[b + 2] - pos[2];
    const d = sx * ex + sy * ey + sz * ez;
    sx -= ex * d; sy -= ey * d; sz -= ez * d;
    l = Math.hypot(sx, sy, sz) || 1;
    sx /= l; sy /= l; sz /= l;
    fr[0] = ex; fr[1] = ey; fr[2] = ez; fr[3] = sx; fr[4] = sy; fr[5] = sz;
    fr[6] = ey * sz - ez * sy; fr[7] = ez * sx - ex * sz; fr[8] = ex * sy - ey * sx;
  }

  // On to time `now` (the sim's clock, so a slowed world falls slowly). True if anything moved, or it's the first look.
  step(now) {
    const first = this.fresh;
    this.fresh = false;
    if (this.last === null) this.last = now;
    if (this.asleep) { this.last = now; return first; }
    let steps = Math.floor((now - this.last) / STEP + 1e-6);
    if (steps <= 0) return first;
    this.last += steps * STEP;
    if (steps > 4) { steps = 4; this.last = now; }
    for (let s = 0; s < steps; s++) this.tickOnce();
    this.x = this.pos[0]; this.y = this.pos[1]; this.z = this.pos[2];
    return true;
  }

  tickOnce() {
    const { m, pos, prev, rad, gnd, safe, ca, cb, cd, ck } = this;
    const g = GRAVITY * STEP * STEP;
    // (Air, and then, once it's had time to fall, a drag that grows till it's still: a big body's many holds never quite agree.)
    const keep = 0.994 - 0.1 * Math.min(1, Math.max(0, (this.age - 2.5) / 2.5));
    for (let i = 0; i < m; i++) {
      const o = i * 3;
      const vx = (pos[o] - prev[o]) * keep, vy = (pos[o + 1] - prev[o + 1]) * keep, vz = (pos[o + 2] - prev[o + 2]) * keep;
      prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
      // (Nothing goes faster than a fall from a tower: a hold that's lost its head can't throw the body over the hill.)
      const sp = Math.hypot(vx, vy, vz), cap = sp > FASTEST ? FASTEST / sp : 1;
      pos[o] += vx * cap; pos[o + 1] += vy * cap - g; pos[o + 2] += vz * cap;
      // The ground under it. Ground that's suddenly far over its head is a ledge or the top of a wall (down in the catacombs,
      // the hill itself, thirty metres up): it isn't climbed, the point goes back to where the ground last made sense.
      const h = this.ground(pos[o], pos[o + 2], prev[o + 1]);
      if (h > pos[o + 1] + rad[i] + LEDGE) { pos[o] = prev[o] = safe[i * 2]; pos[o + 2] = prev[o + 2] = safe[i * 2 + 1]; }
      else { gnd[i] = h + rad[i]; safe[i * 2] = pos[o]; safe[i * 2 + 1] = pos[o + 2]; }
    }
    const nc = ca.length;
    for (let it = 0; it < ITERS; it++) {
      for (let c = 0; c < nc; c++) {
        const a = ca[c] * 3, b = cb[c] * 3;
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1e-6 || (ck[c] === 1 && d >= cd[c])) continue;
        const k = (d - cd[c]) / d * 0.5;
        pos[a] += dx * k; pos[a + 1] += dy * k; pos[a + 2] += dz * k;
        pos[b] -= dx * k; pos[b + 1] -= dy * k; pos[b + 2] -= dz * k;
      }
      if (this.knees) this.bendKnees();
      for (let i = 0; i < m; i++) if (pos[i * 3 + 1] < gnd[i]) pos[i * 3 + 1] = gnd[i];
    }
    // What's on the ground drags on it.
    let fastest = 0;
    for (let i = 0; i < m; i++) {
      const o = i * 3;
      if (pos[o + 1] <= gnd[i] + 0.004) { prev[o] += (pos[o] - prev[o]) * 0.22; prev[o + 2] += (pos[o + 2] - prev[o + 2]) * 0.22; }
      // Walls, trunks and rocks, every other tick a point, as they stop a body on its feet (whatever stands more than a step
      // high, at any height). Eased out of them, not thrown: a hand that died inside a tree's girth would tear the arm off.
      if (this.walls && ((i + this.tick) & 1) === 0) {
        wall[0] = pos[o]; wall[1] = pos[o + 1]; wall[2] = pos[o + 2];
        if (this.walls(wall, rad[i], gnd[i] - rad[i] + 0.2)) {
          let dx = wall[0] - pos[o], dz = wall[2] - pos[o + 2];
          const d = Math.hypot(dx, dz), most = 0.006;
          if (d > most) { dx *= most / d; dz *= most / d; }
          pos[o] += dx; pos[o + 2] += dz;
          prev[o] += dx + (pos[o] - prev[o] - dx) * 0.5; prev[o + 2] += dz + (pos[o + 2] - prev[o + 2] - dz) * 0.5;
        }
      }
      fastest = Math.max(fastest, Math.abs(pos[o] - prev[o]) + Math.abs(pos[o + 1] - prev[o + 1]) + Math.abs(pos[o + 2] - prev[o + 2]));
    }
    this.tick++;
    this.age += STEP;
    this.calm = fastest < 0.2 * STEP ? this.calm + STEP : 0;
    if ((this.age > 0.8 && this.calm > 0.5) || this.age > 7) this.asleep = true;
  }

  // A knee that's gone the wrong way is pushed back through: forward for a leg hanging straight down from the hips, and
  // turned with the thigh from there.
  bendKnees() {
    const { pos, fwd } = this;
    this.frame();
    const fx = fwd[0] * fr[0] + fwd[1] * fr[3] + fwd[2] * fr[6], fy = fwd[0] * fr[1] + fwd[1] * fr[4] + fwd[2] * fr[7], fz = fwd[0] * fr[2] + fwd[1] * fr[5] + fwd[2] * fr[8];
    for (const [T, K, F] of this.knees) {
      const t = T * 3, k = K * 3, f = F * 3;
      let tx = pos[k] - pos[t], ty = pos[k + 1] - pos[t + 1], tz = pos[k + 2] - pos[t + 2];
      const l = Math.hypot(tx, ty, tz) || 1;
      tx /= l; ty /= l; tz /= l;
      arc(tq, -fr[0], -fr[1], -fr[2], tx, ty, tz);
      ta[0] = fx; ta[1] = fy; ta[2] = fz;
      quatRotate(tb, 0, tq, 0, ta, 0);
      const mx = pos[k] - (pos[t] + pos[f]) / 2, my = pos[k + 1] - (pos[t + 1] + pos[f + 1]) / 2, mz = pos[k + 2] - (pos[t + 2] + pos[f + 2]) / 2;
      const d = mx * tb[0] + my * tb[1] + mz * tb[2];
      if (d >= 0) continue;
      const push = -d;
      pos[k] += tb[0] * push * 0.6; pos[k + 1] += tb[1] * push * 0.6; pos[k + 2] += tb[2] * push * 0.6;
      pos[t] -= tb[0] * push * 0.2; pos[t + 1] -= tb[1] * push * 0.2; pos[t + 2] -= tb[2] * push * 0.2;
      pos[f] -= tb[0] * push * 0.4; pos[f + 1] -= tb[1] * push * 0.4; pos[f + 2] -= tb[2] * push * 0.4;
    }
  }

  // Every joint's place and turn in the world, off the points. dy: the whole of it that much higher (lower: a body the ground's taking).
  pose(wq, wt, dy = 0) {
    const { parent, part, pos, lq, lt, inBody, base, q0 } = this;
    this.dy = dy;
    wq[base * 4] = q0[base * 4]; wq[base * 4 + 1] = q0[base * 4 + 1]; wq[base * 4 + 2] = q0[base * 4 + 2]; wq[base * 4 + 3] = q0[base * 4 + 3];
    wt[base * 3] = pos[0]; wt[base * 3 + 1] = pos[1] + dy; wt[base * 3 + 2] = pos[2];
    this.face(wq, base, 0);
    for (const j of this.order) {
      if (j === base) continue;
      const p = inBody[j] ? parent[j] : base, i = part[j];
      quatMul(wq, j * 4, wq, p * 4, lq, j * 4);
      if (i >= 0) { wt[j * 3] = pos[i * 3]; wt[j * 3 + 1] = pos[i * 3 + 1] + dy; wt[j * 3 + 2] = pos[i * 3 + 2]; this.face(wq, j, i); }
      else {
        quatRotate(wt, j * 3, wq, p * 4, lt, j * 3);
        wt[j * 3] += wt[p * 3]; wt[j * 3 + 1] += wt[p * 3 + 1]; wt[j * 3 + 2] += wt[p * 3 + 2];
      }
    }
  }

  face(wq, j, i) {
    const { pos, aim1, aim2, u1, u2 } = this, k1 = aim1[i], k2 = aim2[i];
    if (k1 < 0) return;
    let ax = pos[k1 * 3] - pos[i * 3], ay = pos[k1 * 3 + 1] - pos[i * 3 + 1], az = pos[k1 * 3 + 2] - pos[i * 3 + 2];
    const l = Math.hypot(ax, ay, az);
    if (l < 1e-6) return;
    ax /= l; ay /= l; az /= l;
    quatRotate(ta, 0, wq, j * 4, u1, i * 3);
    arc(tq, ta[0], ta[1], ta[2], ax, ay, az);
    quatMul(wq, j * 4, tq, 0, wq, j * 4);
    if (k2 >= 0) {
      quatRotate(ta, 0, wq, j * 4, u2, i * 3);
      let bx = pos[k2 * 3] - pos[i * 3], by = pos[k2 * 3 + 1] - pos[i * 3 + 1], bz = pos[k2 * 3 + 2] - pos[i * 3 + 2];
      let d = ta[0] * ax + ta[1] * ay + ta[2] * az;
      const px = ta[0] - ax * d, py = ta[1] - ay * d, pz = ta[2] - az * d;
      d = bx * ax + by * ay + bz * az;
      bx -= ax * d; by -= ay * d; bz -= az * d;
      if (Math.hypot(px, py, pz) > 1e-4 && Math.hypot(bx, by, bz) > 1e-4) {
        const sin = (py * bz - pz * by) * ax + (pz * bx - px * bz) * ay + (px * by - py * bx) * az, cos = px * bx + py * by + pz * bz;
        const h = Math.atan2(sin, cos) / 2, sh = Math.sin(h);
        tq[0] = ax * sh; tq[1] = ay * sh; tq[2] = az * sh; tq[3] = Math.cos(h);
        quatMul(wq, j * 4, tq, 0, wq, j * 4);
      }
    }
    quatNormalize(wq, j * 4);
  }
}

const fr = new Float32Array(9);

// A blow that landed on k, from (x, z), with this much weight to it: remembered for which way the body's thrown if it dies of it.
export function struck(k, sim, x, z, force = 20) { k.hitX = x; k.hitZ = z; k.hitF = force; k.hitAt = sim.time; }

// A body gone limp, from where its joints are now.
export function fall(k, sim, rig, wq, wt) {
  let dx = 0, dz = 0, kick = 0.7;
  if (k.hitAt !== undefined && sim.time - k.hitAt < 0.8) {
    dx = k.x - k.hitX; dz = k.z - k.hitZ;
    kick = Math.min(4.5, 1.4 + (k.hitF || 0) * 0.04);
  }
  const l = Math.hypot(dx, dz);
  if (l > 0.05) { dx /= l; dz /= l; } else { const a = Math.random() * Math.PI * 2; dx = Math.sin(a); dz = Math.cos(a); }
  const pit = k.opts?.pit, world = sim.world;
  return new Ragdoll(rig, wq, wt, {
    yaw: k.yaw, vx: k.vx || 0, vz: k.vz || 0, dirX: dx, dirZ: dz, kick, size: k.meta?.height || 0,
    ground: pit ? () => pit.y : (x, z, y) => world.groundFor(x, z, y),
    walls: pit ? null : (v, r, feet) => world.resolve(v, r, feet),
  });
}

// A skinning palette (dual quaternions) for joints placed in the world, as ArmsRig.solve writes one.
export function paletteOut(rig, out, off) {
  const { wq, wt, pq, pt, ibQ, ibT, count } = rig;
  for (let j = 0; j < count; j++) {
    quatMul(pq, j * 4, wq, j * 4, ibQ, j * 4);
    quatRotate(pt, j * 3, wq, j * 4, ibT, j * 3);
    pt[j * 3] += wt[j * 3]; pt[j * 3 + 1] += wt[j * 3 + 1]; pt[j * 3 + 2] += wt[j * 3 + 2];
    const x = pq[j * 4], y = pq[j * 4 + 1], z = pq[j * 4 + 2], w = pq[j * 4 + 3];
    const tx = pt[j * 3], ty = pt[j * 3 + 1], tz = pt[j * 3 + 2];
    const o = off + j * 8;
    out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
    out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
    out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
    out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
    out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
  }
}
