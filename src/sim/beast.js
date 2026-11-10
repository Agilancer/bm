// What monsters have in common: their own pose over shared clips, one soft skin that the blade tests against spheres
// riding its joints, and wounds that work like the knights': a cut, then a second blow through the same cut, and it bleeds.
import { C, C_BLEEDS, C_GASH, C_MASKS, C_PALETTE, EV, GASH_FLOATS, MAX_BLEEDS, MAX_GASH } from '../core/layout.js';
import { carryFrame, carryPalette, carryPoint } from '../core/carry.js';
import { clamp, quatMul, quatNormalize, quatRotate } from '../core/math.js';

const GRAVITY = 15;
const tv = new Float32Array(3), tv2 = new Float32Array(3), out3 = new Float32Array(3), tq = new Float32Array(4), tq2 = new Float32Array(4);
const beastCarry = new Float32Array(8);

export class Beast {
  constructor(id, kind, rig, opts) {
    // Each one has its own pose arrays over the shared clips.
    this.rig = Object.create(rig);
    this.rig.rot = new Float32Array(rig.count * 4);
    this.rig.tr = new Float32Array(rig.count * 3);
    this.rig.rot2 = new Float32Array(rig.count * 4);
    this.rig.tr2 = new Float32Array(rig.count * 3);
    this.rig.wq = new Float32Array(rig.count * 4);
    this.rig.wt = new Float32Array(rig.count * 3);
    this.rig.pq = new Float32Array(rig.count * 4);
    this.rig.pt = new Float32Array(rig.count * 3);
    this.rig.rootQ = new Float32Array(4); this.rig.rootT = new Float32Array(3);
    this.id = id; this.kind = kind; this.opts = opts;
    this.inv = new Array(rig.count).fill(null).map(() => ({ q: new Float32Array(4), t: new Float32Array(3), r: new Float32Array(4) }));
    this.invTick = -1;
  }

  setClip(name) {
    if (this.clip === name) return;
    this.rig.capture();
    this.clip = name;
    this.t = 0;
    this.fade = 0;
  }

  observeSwing() {}

  // ---- blows ----------------------------------------------------------------------------------------

  plateTransforms() {
    const { pq, pt } = this.rig;
    this.inv.forEach((iv, j) => {
      iv.q[0] = pq[j * 4]; iv.q[1] = pq[j * 4 + 1]; iv.q[2] = pq[j * 4 + 2]; iv.q[3] = pq[j * 4 + 3];
      iv.r[0] = -iv.q[0]; iv.r[1] = -iv.q[1]; iv.r[2] = -iv.q[2]; iv.r[3] = iv.q[3];
      iv.t[0] = pt[j * 3]; iv.t[1] = pt[j * 3 + 1]; iv.t[2] = pt[j * 3 + 2];
    });
  }

  // The shell is one soft skin, so the blade tests against spheres riding its joints.
  rayPlates(ox, oy, oz, dx, dy, dz, maxT, hit) {
    const { wt } = this.rig;
    let best = -1, bj = -1, nx = 0, ny = 0, nz = 0;
    for (const s of this.spheres) {
      const k = s.j * 3;
      const lx = wt[k] - ox, ly = wt[k + 1] - oy, lz = wt[k + 2] - oz;
      const tca = lx * dx + ly * dy + lz * dz;
      const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
      if (d2 > s.r * s.r) continue;
      const t = tca - Math.sqrt(s.r * s.r - d2);
      if (t > 0 && t < maxT && (best < 0 || t < best)) {
        best = t; bj = s.j;
        nx = (ox + dx * t - wt[k]) / s.r; ny = (oy + dy * t - wt[k + 1]) / s.r; nz = (oz + dz * t - wt[k + 2]) / s.r;
      }
    }
    if (best < 0) return false;
    this.plateTransforms();
    const iv = this.inv[bj];
    tv[0] = ox + dx * best - iv.t[0]; tv[1] = oy + dy * best - iv.t[1]; tv[2] = oz + dz * best - iv.t[2];
    quatRotate(out3, 0, iv.r, 0, tv, 0);
    hit.lx = out3[0]; hit.ly = out3[1]; hit.lz = out3[2];
    tv[0] = nx; tv[1] = ny; tv[2] = nz;
    quatRotate(out3, 0, iv.r, 0, tv, 0);
    hit.nx = out3[0]; hit.ny = out3[1]; hit.nz = out3[2];
    hit.t = best; hit.piece = bj;
    return true;
  }

  dirToBind(out, piece, x, y, z) { tv[0] = x; tv[1] = y; tv[2] = z; quatRotate(out, 0, this.inv[piece].r, 0, tv, 0); return out; }

  bindToWorld(out, piece, x, y, z) {
    const iv = this.inv[piece];
    tv[0] = x; tv[1] = y; tv[2] = z;
    quatRotate(out, 0, iv.q, 0, tv, 0);
    out[0] += iv.t[0]; out[1] += iv.t[1]; out[2] += iv.t[2];
    return out;
  }

  addGash(sim, piece, lx, ly, lz, nx, ny, nz, downX, downY, downZ) {
    if (this.gashes.length >= MAX_GASH) this.gashes.shift();
    const g = { piece, a: [lx, ly, lz], b: [lx, ly, lz], n: [nx, ny, nz], flow: [downX, downY, downZ], born: sim.time, punct: -1, width: 0.0074 + Math.random() * 0.0028 };
    this.gashes.push(g);
    this.gashVersion++;
    return g;
  }

  // Blood thrown over the skin round a joint: no cut to it, and nothing a blade can go through. The radius goes down as a negative width.
  addThrownBlood(sim, jointName, radius) {
    const j = this.jointOf(jointName), { wt } = this.rig;
    this.plateTransforms();
    const iv = this.inv[j];
    tv[0] = wt[j * 3] - iv.t[0]; tv[1] = wt[j * 3 + 1] - iv.t[1]; tv[2] = wt[j * 3 + 2] - iv.t[2];
    quatRotate(out3, 0, iv.r, 0, tv, 0);
    const g = this.addGash(sim, j, out3[0], out3[1], out3[2], 0, 1, 0, 0, -1, 0);
    g.width = -radius;
    g.punct = sim.time;
    g.thrown = true;
  }

  // Wounds live on the whole skin here, not plate by plate.
  nearestGash(piece, lx, ly, lz, radius, swing) {
    let best = null, bd = radius * 1.6;
    for (const g of this.gashes) {
      if (g.swing === swing || g.thrown) continue;
      const a = g.a, b = g.b, dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L2 = dx * dx + dy * dy + dz * dz;
      const t = L2 > 1e-8 ? clamp(((lx - a[0]) * dx + (ly - a[1]) * dy + (lz - a[2]) * dz) / L2, 0, 1) : 0;
      const d = Math.hypot(a[0] + dx * t - lx, a[1] + dy * t - ly, a[2] + dz * t - lz);
      if (d < bd) { bd = d; best = g; best.tOn = t; }
    }
    return best;
  }

  puncture(sim, g) {
    if (g.punct >= 0) {
      const old = this.bleeds.find((b) => b.gash === g);
      if (old) old.rate = Math.min(2.5, old.rate + 0.6);
      return;
    }
    const t = g.tOn ?? 0.5;
    const px = g.a[0] + (g.b[0] - g.a[0]) * t, py = g.a[1] + (g.b[1] - g.a[1]) * t, pz = g.a[2] + (g.b[2] - g.a[2]) * t;
    g.punct = sim.time;
    g.a2 = [px, py, pz];
    if (this.bleeds.length < MAX_BLEEDS) this.bleeds.push({ gash: g, piece: g.piece, p: [px, py, pz], n: [g.n[0], g.n[1], g.n[2]], born: sim.time, rate: 1 });
    this.gashVersion++;
  }

  writeGashes(snap, cOff, sim) {
    const u = sim.snapU;
    let mask = 0;
    this.gashes.forEach((g, i) => {
      const o = cOff + C_GASH + i * GASH_FLOATS;
      snap[o] = g.a[0]; snap[o + 1] = g.a[1]; snap[o + 2] = g.a[2]; snap[o + 3] = g.width;
      snap[o + 4] = g.b[0]; snap[o + 5] = g.b[1]; snap[o + 6] = g.b[2]; snap[o + 7] = g.born;
      snap[o + 8] = g.n[0]; snap[o + 9] = g.n[1]; snap[o + 10] = g.n[2]; snap[o + 11] = g.punct;
      snap[o + 12] = g.flow[0]; snap[o + 13] = g.flow[1]; snap[o + 14] = g.flow[2];
      snap[o + 15] = g.a2 ? (g.a2[0] - g.a[0]) * (g.b[0] - g.a[0]) + (g.a2[1] - g.a[1]) * (g.b[1] - g.a[1]) + (g.a2[2] - g.a[2]) * (g.b[2] - g.a[2]) : 0;
      mask |= 1 << i;
    });
    u[cOff + C_MASKS] = mask >>> 0;
  }

  // ---- pieces that have come off ----------------------------------------------------------------------

  bleedFrom(sim, name, life) { this.jets.push({ j: this.jointOf(name), life, born: sim.time, clock: 0 }); }

  // Takes these joints off the skeleton: from here on their palette follows a rigid body, and the clips no longer touch them.
  drop(sim, names, radius, rank) {
    const { pq, pt, wt } = this.rig;
    const js = names.map(this.jointOf);
    const taken = new Set(js);
    this.bleeds = this.bleeds.filter((b) => !taken.has(b.piece));
    let cx = 0, cy = 0, cz = 0;
    for (const j of js) { cx += wt[j * 3]; cy += wt[j * 3 + 1]; cz += wt[j * 3 + 2]; }
    cx /= js.length; cy /= js.length; cz /= js.length;
    // Thrown out from the body and up a little, tumbling. Longer pieces turn slower.
    const ox = cx - this.x, oz = cz - this.z, ol = Math.hypot(ox, oz) || 1, spin = 3.4 / Math.sqrt(rank);
    this.chunks.push({
      js, q0: js.map((j) => [pq[j * 4], pq[j * 4 + 1], pq[j * 4 + 2], pq[j * 4 + 3]]), t0: js.map((j) => [pt[j * 3], pt[j * 3 + 1], pt[j * 3 + 2]]),
      c0: [cx, cy, cz], x: cx, y: cy, z: cz, vx: ox / ol * 2.1 + this.vx * 0.5, vy: 2.6 + Math.random() * 1.2, vz: oz / ol * 2.1 + this.vz * 0.5,
      q: new Float32Array([0, 0, 0, 1]), wx: (Math.random() - 0.5) * spin * 2, wy: (Math.random() - 0.5) * spin, wz: (Math.random() - 0.5) * spin * 2, radius: radius * this.scale * 0.55,
      // the points it can land on: its own joints, relative to where it is
      pts: js.map((j) => [wt[j * 3] - cx, wt[j * 3 + 1] - cy, wt[j * 3 + 2] - cz]), inertia: 0.5 + rank * 0.6, rest: false, thuds: 0, age: 0,
    });
    sim.event(EV.SEVER, cx, cy, cz, ox / ol, 0.5, oz / ol);
  }

  stepChunks(dt, sim) {
    for (const c of this.chunks) {
      if (c.rest) continue;
      c.age += dt;
      c.vy -= GRAVITY * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      // Turning: q' = q + (w q) dt / 2
      tq[0] = c.wx * dt * 0.5; tq[1] = c.wy * dt * 0.5; tq[2] = c.wz * dt * 0.5; tq[3] = 1;
      quatMul(tq2, 0, tq, 0, c.q, 0);
      c.q.set(tq2); quatNormalize(c.q, 0);
      // The lowest of its points takes the ground.
      // (What's cut off a thing in a pit lands in the pit, whatever crosses over it.)
      const g = (this.opts?.pit ? this.opts.pit.y : sim.world.height(c.x, c.z)) + c.radius;
      let low = 1e9, lx = 0, ly = 0, lz = 0;
      for (const p of c.pts) {
        tv[0] = p[0]; tv[1] = p[1]; tv[2] = p[2];
        quatRotate(tv2, 0, c.q, 0, tv, 0);
        if (tv2[1] < low) { low = tv2[1]; lx = tv2[0]; ly = tv2[1]; lz = tv2[2]; }
      }
      const d = g - (c.y + low);
      if (d > 0) {
        c.y += d;
        if (c.vy < -2.2 && c.thuds < 3) { c.thuds++; sim.event(EV.CHUNK_LAND, c.x, g - c.radius, c.z, clamp(-c.vy / 8, 0.2, 1)); }
        const j = Math.max(0, -c.vy);
        c.vy = c.vy < 0 ? -c.vy * 0.28 : c.vy;
        c.vx *= 1 - Math.min(1, 8 * dt) * 0.6 - 0.06 * Math.min(j, 1); c.vz *= 1 - Math.min(1, 8 * dt) * 0.6 - 0.06 * Math.min(j, 1);
        // the ground pushes up at that point, away from under the middle: a piece balanced on its end falls over
        const k = (j * 0.9 + GRAVITY * dt) / c.inertia;
        c.wx += lz * k * -1; c.wz += lx * k;
        const a = Math.exp(-5.5 * dt); c.wx *= a; c.wy *= a; c.wz *= a;
        if (c.age > 1 && Math.abs(c.vy) < 0.5 && Math.hypot(c.vx, c.vz) < 0.2 && Math.hypot(c.wx, c.wy, c.wz) < 0.25) c.rest = true;
      }
      if (c.age > 7) c.rest = true;
    }
    // Blood comes out of a stump in pulses, weakening.
    this.jets = this.jets.filter((b) => sim.time - b.born < b.life);
    const { wt, wq } = this.rig;
    for (const b of this.jets) {
      b.clock -= dt;
      if (b.clock > 0) continue;
      b.clock = 0.07;
      const age = (sim.time - b.born) / b.life, pulse = 0.55 + 0.45 * Math.sin(sim.time * 9);
      tv[0] = 0; tv[1] = 1; tv[2] = 0;
      quatRotate(tv2, 0, wq, b.j * 4, tv, 0);
      sim.event(EV.STUMP, wt[b.j * 3], wt[b.j * 3 + 1], wt[b.j * 3 + 2], tv2[0], tv2[1] + 0.3, tv2[2], (1 - age) * pulse);
    }
  }

  // The chunks' palette goes on top of what the clip wrote.
  isChunk(j) {
    if (this.chunks) for (const c of this.chunks) if (c.js.includes(j)) return true;
    return false;
  }

  writeChunks(snap, off) {
    const pq = this.rig.pq, pt = this.rig.pt;
    for (const c of this.chunks) {
      c.js.forEach((j, n) => {
        const q0 = c.q0[n], t0 = c.t0[n];
        tq[0] = q0[0]; tq[1] = q0[1]; tq[2] = q0[2]; tq[3] = q0[3];
        quatMul(tq2, 0, c.q, 0, tq, 0);
        tv[0] = t0[0] - c.c0[0]; tv[1] = t0[1] - c.c0[1]; tv[2] = t0[2] - c.c0[2];
        quatRotate(tv2, 0, c.q, 0, tv, 0);
        const x = tq2[0], y = tq2[1], z = tq2[2], w = tq2[3], tx = tv2[0] + c.x, ty = tv2[1] + c.y, tz = tv2[2] + c.z;
        pq[j * 4] = x; pq[j * 4 + 1] = y; pq[j * 4 + 2] = z; pq[j * 4 + 3] = w;
        pt[j * 3] = tx; pt[j * 3 + 1] = ty; pt[j * 3 + 2] = tz;
        const o = off + j * 8;
        snap[o] = x; snap[o + 1] = y; snap[o + 2] = z; snap[o + 3] = w;
        snap[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
        snap[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
        snap[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
        snap[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
      });
    }
  }

  write(snap, cOff, sim) {
    const { rig } = this;
    const clip = rig.clips[this.clip];
    // A full pose when one's due (Sim.poseGap: every tick near the player or on screen near by), or at once on a new clip; in
    // between the last one, carried to where the body's got to (src/core/carry.js). this.carried is that carry, or null.
    const pal = this.posePal || (this.posePal = new Float32Array(rig.count * 8));
    const gap = sim?.poseGap ? sim.poseGap(this, this.lodSlot) : 0;
    if (this.posedYaw === undefined || !gap || this.clip !== this.posedClip || sim.time - this.posedAt >= gap - 1e-6) {
      rig.solve(clip, this.t, this.fade, pal, 0);
      this.posedAt = sim?.time ?? 0; this.posedClip = this.clip;
      this.posedX = this.x; this.posedY = this.y; this.posedZ = this.z; this.posedYaw = this.yaw;
      this.carried = null;
    } else this.carried = carryFrame(beastCarry, this.posedYaw, this.posedX, this.posedY, this.posedZ, this.yaw, this.x, this.y, this.z) ? beastCarry : null;
    if (this.carried) carryPalette(pal, 0, snap, cOff + C_PALETTE, rig.count, this.carried);
    else snap.set(pal, cOff + C_PALETTE);
    if (this.chunks) this.writeChunks(snap, cOff + C_PALETTE);
    snap[cOff + C.ACTIVE] = 1;
    snap[cOff + C.KIND] = this.kind;
    snap[cOff + C.X] = this.x; snap[cOff + C.Y] = this.y; snap[cOff + C.Z] = this.z; snap[cOff + C.YAW] = this.yaw;
    snap[cOff + C.HP] = this.hp; snap[cOff + C.MAX_HP] = this.maxHp;
    snap[cOff + C.BLEED] = this.bleeds.length;
    snap[cOff + C.STATE] = this.state;
    snap[cOff + C.GASH_VERSION] = this.gashVersion;
    snap[cOff + C.GASH_COUNT] = this.gashes.length;
    snap[cOff + C.HOSTILE] = this.hostile ? 1 : 0;
    snap[cOff + C.HEART] = this.heart;
    snap[cOff + C.SPEED] = this.speed;
    snap[cOff + C.LANDED] = this.bites;
    this.plateTransforms();
    snap[cOff + C.N_BLEEDS] = this.bleeds.length;
    this.bleeds.forEach((b, i) => {
      const o = cOff + C_BLEEDS + i * 8;
      this.bindToWorld(out3, b.piece, b.p[0], b.p[1], b.p[2]);
      // (Where the pose has been carried, the wound goes with it; not on a piece that's come off, which flies on its own.)
      const c = this.carried && !this.isChunk(b.piece) ? this.carried : null;
      if (c) carryPoint(out3, 0, out3, 0, c);
      snap[o] = out3[0]; snap[o + 1] = out3[1]; snap[o + 2] = out3[2];
      tv[0] = b.n[0]; tv[1] = b.n[1]; tv[2] = b.n[2];
      quatRotate(out3, 0, this.inv[b.piece].q, 0, tv, 0);
      if (c) { const x = out3[0]; out3[0] = x * c[5] + out3[2] * c[6]; out3[2] = -x * c[6] + out3[2] * c[5]; }
      snap[o + 3] = out3[0]; snap[o + 4] = out3[1]; snap[o + 5] = out3[2];
      snap[o + 6] = b.rate; snap[o + 7] = b.born;
    });
    this.writeGashes(snap, cOff, sim);
  }
}
