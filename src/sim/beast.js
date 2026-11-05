// What monsters have in common: their own pose over shared clips, one soft skin that the blade tests against spheres
// riding its joints, and wounds that work like the knights': a cut, then a second blow through the same cut, and it bleeds.
import { C, C_BLEEDS, C_GASH, C_MASKS, C_PALETTE, GASH_FLOATS, MAX_BLEEDS, MAX_GASH } from '../core/layout.js';
import { clamp, quatRotate } from '../core/math.js';

const tv = new Float32Array(3), out3 = new Float32Array(3);

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

  // Wounds live on the whole skin here, not plate by plate.
  nearestGash(piece, lx, ly, lz, radius, swing) {
    let best = null, bd = radius * 1.6;
    for (const g of this.gashes) {
      if (g.swing === swing) continue;
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

  write(snap, cOff, sim) {
    const { rig } = this;
    const clip = rig.clips[this.clip];
    rig.solve(clip, this.t, this.fade, snap, cOff + C_PALETTE);
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
      snap[o] = out3[0]; snap[o + 1] = out3[1]; snap[o + 2] = out3[2];
      tv[0] = b.n[0]; tv[1] = b.n[1]; tv[2] = b.n[2];
      quatRotate(out3, 0, this.inv[b.piece].q, 0, tv, 0);
      snap[o + 3] = out3[0]; snap[o + 4] = out3[1]; snap[o + 5] = out3[2];
      snap[o + 6] = b.rate; snap[o + 7] = b.born;
    });
    this.writeGashes(snap, cOff, sim);
  }
}
