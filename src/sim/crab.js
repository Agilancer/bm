// The great crabs of the outer fields. They come for the player from several sides at once, and their
// wounds work like the knights': a cut, then a second blow through the same cut, and it bleeds.
import { C, C_BLEEDS, C_GASH, C_MASKS, C_PALETTE, EV, GASH_FLOATS, MAX_BLEEDS, MAX_GASH } from '../core/layout.js';
import { clamp, damp, quatMul, quatRotate, quatYaw, wrapAngle } from '../core/math.js';

export const CRAB_SCALE = 2.6;
const S = CRAB_SCALE;
// Floor speeds of the clips, from assets/monsters/crab_monster/clips.json, at this size.
const STRIDE = { walk_stalk: 0.1 * S, walk_skitter: 0.32 * S, run_scuttle: 1.0667 * S, run_gallop: 1.992 * S };
const ATTACKS = {
  attack_bite: { rate: 1.08, windows: [[0.3, 0.46]], reach: 1.05 * S, dmg: 12, lunge: [0.24, 0.42, 3.4] },
  attack_claw: { rate: 1.0, windows: [[0.28, 0.41], [0.43, 0.56]], reach: 1.0 * S, dmg: 9, lunge: [0.2, 0.34, 1.6] },
  attack_slam: { rate: 0.95, windows: [[0.5, 0.57]], reach: 1.1 * S, dmg: 18, lunge: [0.26, 0.5, 6.2], knock: 6 },
  jump: { rate: 1.0, windows: [[0.56, 0.62]], reach: 0.8 * S, dmg: 10, lunge: [0.3, 0.57, 8.2], knock: 4 },
};
const STATE = { WANDER: 0, STALK: 1, CHASE: 2, ATTACK: 3, DEAD: 10 };
const tv = new Float32Array(3), out3 = new Float32Array(3);

function turn(a, b, step) { const d = wrapAngle(b - a); return wrapAngle(a + clamp(d, -step, step)); }

export class Crab {
  constructor(id, kind, rig, opts) {
    // Each crab has its own pose arrays over the shared clips.
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
    this.bodyRadius = 1.45;
    const J = (n) => rig.index.get(n);
    const sph = (n, r) => ({ j: J(n), r: r * S });
    this.spheres = [sph('cog', 0.3), sph('body_front', 0.27), sph('body_rear', 0.26), sph('mouth_top', 0.14), sph('L_pincer_2', 0.08), sph('R_pincer_2', 0.08)];
    for (const side of ['L', 'R']) for (const leg of [1, 2, 3, 4]) { this.spheres.push(sph(`${side}_leg${leg}_2`, 0.06), sph(`${side}_leg${leg}_3`, 0.05)); }
    this.mouth = J('mouth_top');
    this.inv = new Array(rig.count).fill(null).map(() => ({ q: new Float32Array(4), t: new Float32Array(3), r: new Float32Array(4) }));
    this.invTick = -1;
    this.reset(opts);
  }

  reset(opts) {
    Object.assign(this, {
      x: opts.spawn[0], z: opts.spawn[1], y: 0, yaw: opts.yaw, faceYaw: opts.yaw, vx: 0, vz: 0, speed: 0, hp: opts.hp, maxHp: opts.hp, stam: 100, armor: 1,
      state: STATE.WANDER, stateT: 0, dead: false, deadT: 0, hostile: true, iframes: false, shieldUp: 0, gashes: [], bleeds: [], heart: Math.random(), gashVersion: (this.gashVersion || 0) + 1,
      clip: 'walk_stalk', t: Math.random(), fade: 1, attack: null, activeOn: -1, used: false, cooldown: 0, bites: 0, hitOnce: false, wanderT: 0, wx: 0, wz: 0, flinch: 0, tilt: 0, slammed: false,
      flankAngle: opts.flank, stepClock: 0,
    });
    this.rig.rot.set(this.rig.restR); this.rig.tr.set(this.rig.restT);
    this.rig.rot2.set(this.rig.restR); this.rig.tr2.set(this.rig.restT);
    this.pickWander();
  }

  pickWander() {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 8;
    this.wx = this.opts.spawn[0] + Math.sin(a) * r;
    this.wz = this.opts.spawn[1] + Math.cos(a) * r;
    this.wanderT = 4 + Math.random() * 5;
  }

  setClip(name) {
    if (this.clip === name) return;
    this.rig.capture();
    this.clip = name;
    this.t = 0;
    this.fade = 0;
  }

  observeSwing() {}

  update(dt, sim) {
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt / 0.14);
    const p = sim.player;
    const dx = p.x - this.x, dz = p.z - this.z, dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    this.heart += dt * 1.1;
    if (this.bleeds.length && !this.dead) { let flow = 0; for (const b of this.bleeds) flow += b.rate; this.hp -= dt * flow * 3.0; }
    if (this.hp <= 0 && !this.dead) this.die(sim);
    this.flinch = Math.max(0, this.flinch - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    let rate = this.flinch > 0 ? 0.35 : 1;
    if (this.dead) {
      this.deadT += dt;
      this.vx = damp(this.vx, 0, 5, dt); this.vz = damp(this.vz, 0, 5, dt);
      // The legs give out on the belly-down frame of the slam, and the shell settles.
      const c = this.rig.clips.attack_slam;
      this.clip = 'attack_slam';
      this.t = Math.min(this.t + dt * 1.6, c.dur * 0.53);
      if (this.t < c.dur * 0.42) this.t = c.dur * 0.42;
      rate = 0;
    } else if (this.state === STATE.ATTACK) {
      this.thinkAttack(dt, sim, p, dist, toPlayer);
    } else {
      this.thinkMove(dt, sim, p, dist, toPlayer);
    }
    this.x += this.vx * dt; this.z += this.vz * dt;
    tv[0] = this.x; tv[2] = this.z;
    sim.world.resolve(tv, 0.95, this.y + 0.6);
    this.x = tv[0]; this.z = tv[2];
    this.y = sim.world.height(this.x, this.z);
    // Clip time.
    if (this.state !== STATE.ATTACK && !this.dead) {
      const stride = STRIDE[this.clip];
      if (stride) rate *= clamp(this.speed / stride, 0.25, 1.5);
      this.t += dt * rate;
      const dur = this.rig.clips[this.clip].dur;
      this.stepClock += dt * rate * 6 / dur;
      if (this.stepClock > 1 && this.speed > 0.1) {
        this.stepClock -= 1;
        sim.event(EV.STEP, this.x, this.y, this.z, clamp(this.speed / 5, 0.1, 1), 2, this.id);
      }
    }
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT[0] = this.x; this.rig.rootT[1] = this.y; this.rig.rootT[2] = this.z;
    if (this.dead) {
      // The legs give out, the shell settles and it tips slowly over.
      const k = Math.min(this.deadT / 1.4, 1), e = k * k * (3 - 2 * k);
      const a = e * 0.32 * this.tipSide / 2;
      tip[0] = 0; tip[1] = 0; tip[2] = Math.sin(a); tip[3] = Math.cos(a);
      yawQ[0] = this.rig.rootQ[0]; yawQ[1] = this.rig.rootQ[1]; yawQ[2] = this.rig.rootQ[2]; yawQ[3] = this.rig.rootQ[3];
      quatMul(this.rig.rootQ, 0, yawQ, 0, tip, 0);
      this.rig.rootT[1] -= e * 0.16;
    }
  }

  thinkMove(dt, sim, p, dist, toPlayer) {
    // They wake a while after the first blood is spilled, or in the end regardless, and then they know where you
    // are. They lose interest once the knight is dead, so a win isn't taken away by a crab.
    const started = sim.firstBloodAt >= 0 && sim.time > sim.firstBloodAt + this.opts.delay;
    const awake = started || sim.time > this.opts.delay + 70 || dist < 20 || this.hitOnce;
    const senses = awake && !p.dead && sim.gameState === 0 && !sim.knights[0].dead;
    if (senses && !sim.crabWoke) { sim.crabWoke = true; sim.event(EV.CRAB_WAKE); }
    let dvx = 0, dvz = 0, want;
    if (!senses) {
      this.state = STATE.WANDER;
      this.wanderT -= dt;
      if (this.wanderT <= 0 || Math.hypot(this.wx - this.x, this.wz - this.z) < 1.5) this.pickWander();
      const a = Math.atan2(this.wx - this.x, this.wz - this.z);
      dvx = Math.sin(a) * 0.8; dvz = Math.cos(a) * 0.8;
      want = 'walk_skitter';
    } else {
      this.state = dist > 14 ? STATE.STALK : STATE.CHASE;
      // They spread out and come at you from different sides.
      const side = toPlayer + Math.PI + this.flankAngle * clamp(dist / 12, 0, 1);
      const tx = p.x + Math.sin(side) * Math.min(dist * 0.55, 6), tz = p.z + Math.cos(side) * Math.min(dist * 0.55, 6);
      sim.world.updateField(p.x, p.z, sim.time);
      sim.world.flow(flow, this.x, this.z, tx, tz);
      const speed = dist > 5 ? 5.5 : 2.7;
      const sp = speed * (1 - this.bleeds.length * 0.1);
      dvx = flow[0] * sp; dvz = flow[1] * sp;
      want = sp > 3.8 ? 'run_gallop' : 'run_scuttle';
      if (this.cooldown <= 0 && !p.dead) {
        if (dist < 2.5) { this.startAttack(sim, Math.random() < 0.55 ? 'attack_bite' : 'attack_claw'); return; }
        if (dist < 6.5 && dist > 3.4 && Math.random() < dt * 1.5) { this.startAttack(sim, Math.random() < 0.6 ? 'attack_slam' : 'jump'); return; }
      }
    }
    const k = 1 - Math.exp(-6 * dt);
    this.vx += (dvx - this.vx) * k; this.vz += (dvz - this.vz) * k;
    this.speed = Math.hypot(this.vx, this.vz);
    if (this.speed > 0.3) this.yaw = turn(this.yaw, Math.atan2(this.vx, this.vz), 3.4 * dt);
    this.setClip(want);
  }

  startAttack(sim, name) {
    this.setClip(name);
    this.attack = ATTACKS[name];
    this.state = STATE.ATTACK;
    this.activeOn = -1; this.used = false;
    sim.event(EV.GRUNT, this.x, this.y + 1.2, this.z, 2);
  }

  thinkAttack(dt, sim, p, dist, toPlayer) {
    const a = this.attack, c = this.rig.clips[this.clip];
    this.t += dt * a.rate * (this.flinch > 0 ? 0.4 : 1);
    const f = this.t / c.dur;
    const [l0, l1, lv] = a.lunge;
    const v = f > l0 && f < l1 ? lv : 0;
    const go = dist > 1.6 ? 1 : 0;
    this.vx = Math.sin(this.yaw) * v * go; this.vz = Math.cos(this.yaw) * v * go;
    this.speed = 0;
    if (f < l0) this.yaw = turn(this.yaw, toPlayer, 2.8 * dt);
    const w = a.windows.findIndex((x) => f >= x[0] && f <= x[1]);
    if (w >= 0) {
      if (this.activeOn !== w) { this.activeOn = w; this.used = false; }
      if (!this.used && !p.dead && !p.iframes) {
        const m = this.mouth * 3, wt = this.rig.wt;
        const d = Math.min(dist, Math.hypot(wt[m] - p.x, wt[m + 2] - p.z));
        const facing = Math.abs(wrapAngle(toPlayer - this.yaw)) < 1.4;
        if (d < a.reach && facing && Math.abs(p.y - this.y) < 1.5) {
          this.used = true;
          this.bites++;
          p.damage(sim, a.dmg, this.x, this.z, a.knock || 0);
          sim.event(EV.HURT, p.x, p.y + 1.1, p.z, a.dmg);
        }
      }
    }
    if (this.clip === 'attack_slam' && f > 0.5 && !this.slammed) {
      this.slammed = true;
      sim.event(EV.GROUND, this.x + Math.sin(this.yaw), this.y, this.z + Math.cos(this.yaw));
    }
    if (this.t >= c.dur) {
      this.slammed = false;
      this.attack = null;
      this.state = STATE.CHASE;
      this.cooldown = 0.8 + Math.random() * 1.8;
      this.setClip('run_scuttle');
    }
  }

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

  onHit(sim, kind) {
    this.flinch = kind === 'puncture' ? 0.4 : 0.18;
    this.cooldown = Math.max(this.cooldown, kind === 'puncture' ? 0.8 : 0.3);
    this.hitOnce = true;
  }

  die(sim) {
    this.dead = true; this.hp = 0;
    this.tipSide = Math.random() < 0.5 ? -1 : 1;
    this.state = STATE.DEAD;
    this.attack = null;
    this.rig.capture();
    this.fade = 0;
    this.t = this.rig.clips.attack_slam.dur * 0.42;
    sim.event(EV.CRAB_DIE, this.x, this.y + 0.3, this.z);
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
    snap[cOff + C.HOSTILE] = 1;
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

const flow = new Float32Array(2), tip = new Float32Array(4), yawQ = new Float32Array(4);
