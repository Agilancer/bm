// Lisandra's cloth: her skirt, tabard and hanging sleeves are chains of bones (tools/lisandra/cloth_rig.py) that hang
// with gravity, trail behind her, and are kept out of her legs, hands and body. Each chain is a line of points: the first
// rides on the body bone it hangs from, the rest swing. A skirt point is pulled a little toward where the sculpt put it,
// so the dress keeps its cut; a sleeve hangs straight down from the arm. Every segment is pushed out of whatever it
// would pass through. Points beside each other round the skirt hold their spacing, so it neither bunches nor tears.
// Then each bone is turned to lie along its points.
import { quatMul, quatNormalize, quatRotate } from '../core/math.js';

const STEP = 1 / 120;
const GRAVITY = 9.8;

// Per kind: how hard each point is pulled toward its shape (per sixtieth of a second, top point to tip), how much speed
// it keeps per step, what it collides with, and whether its shape is the sculpt's or simply hanging down.
const KINDS = {
  skirt: { follow: [0.24, 0.12, 0.06], keep: 0.965, hits: ['legs', 'feet', 'hands'] },
  // The tabard hangs between her thighs, so every point of it is carried as the old skin carried it (skinned), and it
  // only sways about that; it is one chain down its middle, so its colliders are padded a little toward its edges.
  tabard: { follow: [0.25, 0.2, 0.15], keep: 0.95, hits: ['legs', 'feet', 'hands'], pad: 0.02, skinned: true },
  sleeve: { follow: [0.06, 0.05, 0.04], keep: 0.95, hits: ['dress', 'legs'], hang: true },
};

export class Cloth {
  // def: the cloth extras from the model. form: the colliders (see LISANDRA_FORMS). scale: model units to metres.
  constructor(rig, def, form, scale) {
    this.rig = rig;
    this.chains = def.chains.map((ch) => {
      const joints = ch.joints.map((n) => rig.index.get(n));
      const parent = rig.index.get(ch.parent);
      const n = joints.length + 1;
      const rest = new Float32Array(n * 3);
      // A cloth bone is bound without a turn, so its bind position is minus its inverse bind translation.
      joints.forEach((j, k) => { for (let a = 0; a < 3; a++) rest[k * 3 + a] = -rig.ibT[j * 3 + a]; });
      for (let a = 0; a < 3; a++) rest[(n - 1) * 3 + a] = ch.tip[a] * scale;
      const len = new Float32Array(n);
      for (let k = 1; k < n; k++) len[k] = Math.hypot(rest[k * 3] - rest[k * 3 - 3], rest[k * 3 + 1] - rest[k * 3 - 2], rest[k * 3 + 2] - rest[k * 3 - 1]);
      const kind = KINDS[ch.kind];
      // The top point is carried as the old skin carried the cloth there: a mix of body bones.
      const bones = (a) => ({ j: a.j.map((n) => rig.index.get(n)), w: a.w });
      const anchors = (ch.anchors || [{ j: [ch.parent], w: [1] }]).map(bones);
      return { kind, anchor: anchors[0], anchors, name: ch.kind, side: ch.side, angle: ch.angle, joints, parent, n, rest, len, x: new Float32Array(n * 3), prev: new Float32Array(n * 3), target: new Float32Array(n * 3) };
    });
    // Neighbours round the skirt keep their spacing level by level. Angles run from the front round her left to the back;
    // an open skirt's first and last chains are the two sides of its slit. (A sleeve's two edges hang where they will.)
    this.rings = [];
    const skirt = this.chains.filter((c) => c.name === 'skirt').sort((a, b) => (a.angle + 360) % 360 - (b.angle + 360) % 360);
    for (let i = 0; i + 1 < skirt.length; i++) this.rings.push([skirt[i], skirt[i + 1]]);
    if (def.closed && skirt.length > 2) this.rings.push([skirt[skirt.length - 1], skirt[0]]);
    for (const [a, b] of this.rings) {
      const d = new Float32Array(a.n);
      for (let k = 0; k < a.n; k++) d[k] = Math.hypot(a.rest[k * 3] - b.rest[k * 3], a.rest[k * 3 + 1] - b.rest[k * 3 + 1], a.rest[k * 3 + 2] - b.rest[k * 3 + 2]);
      a.ringTo = a.ringTo || [];
      a.ringTo.push([b, d]);
    }
    // Colliders: capsules between joints, radius at each end, in metres (form.legs, form.hand).
    const J = (n) => rig.index.get('mixamorig:' + n);
    // ext carries a capsule on past its far joint, as a fraction of its length: the shin's covers the boot's heel.
    const cap = (a, b, ra, rb, group, ext = 0) => ({ a: J(a), b: J(b), ra, rb, group, ext });
    this.colliders = [];
    for (const s of ['Left', 'Right']) {
      this.colliders.push(cap(s + 'UpLeg', s + 'Leg', form.legs[0], form.legs[1], 'legs'));
      this.colliders.push(cap(s + 'Leg', s + 'Foot', form.legs[1], form.legs[2] + 0.02, 'legs', 0.32));
      this.colliders.push(cap(s + 'Foot', s + 'ToeBase', form.legs[2] * 0.85, form.legs[2] * 0.7, 'feet'));
      this.colliders.push(cap(s + 'ForeArm', s + 'Hand', form.hand * 0.8, form.hand, 'hands'));
      this.colliders.push(cap(s + 'Hand', s + 'HandMiddle2', form.hand, form.hand * 0.8, 'hands'));
    }
    this.hipsJoint = J('Hips');
    // How far her body and dress reach at her sides, by depth under the hips: the sleeves hang outside it.
    this.dress = (def.dress || []).map(([d, r]) => [d * scale, r * scale + (form.sleeveGap ?? 0.02)]);
    this.fresh = true;
    this.time = 0;
    this.acc = 0;
    this.q = new Float32Array(4);
    this.t = new Float32Array(3);
    this.v = new Float32Array(3);
  }

  reset() { this.fresh = true; }

  // Where each point wants to be. The top: where the old skin put it. Below that, the sculpted shape held still on the
  // body bone (through its skinning transform) and moved to hang from that top; or, for hanging cloth, straight down.
  targets() {
    const { pq, pt } = this.rig;
    const v = this.v;
    for (const c of this.chains) {
      const p = c.parent, tg = c.target;
      let ox = 0, oy = 0, oz = 0;
      const { j, w } = c.anchor;
      for (let m = 0; m < j.length; m++) {
        quatRotate(v, 0, pq, j[m] * 4, c.rest, 0);
        ox += (v[0] + pt[j[m] * 3]) * w[m]; oy += (v[1] + pt[j[m] * 3 + 1]) * w[m]; oz += (v[2] + pt[j[m] * 3 + 2]) * w[m];
      }
      if (c.kind.skinned) {
        // Every point where the old skin put it (the tip goes with the last bone's mix).
        for (let k = 0; k < c.n; k++) {
          const a = c.anchors[Math.min(k, c.anchors.length - 1)];
          let x = 0, y = 0, z = 0;
          for (let m = 0; m < a.j.length; m++) {
            quatRotate(v, 0, pq, a.j[m] * 4, c.rest, k * 3);
            x += (v[0] + pt[a.j[m] * 3]) * a.w[m]; y += (v[1] + pt[a.j[m] * 3 + 1]) * a.w[m]; z += (v[2] + pt[a.j[m] * 3 + 2]) * a.w[m];
          }
          tg[k * 3] = x; tg[k * 3 + 1] = y; tg[k * 3 + 2] = z;
        }
        continue;
      }
      for (let k = 0; k < c.n; k++) {
        if (k && c.kind.hang) { tg[k * 3] = tg[k * 3 - 3]; tg[k * 3 + 1] = tg[k * 3 - 2] - c.len[k]; tg[k * 3 + 2] = tg[k * 3 - 1]; continue; }
        quatRotate(tg, k * 3, pq, p * 4, c.rest, k * 3);
        tg[k * 3] += pt[p * 3]; tg[k * 3 + 1] += pt[p * 3 + 1]; tg[k * 3 + 2] += pt[p * 3 + 2];
      }
      ox -= tg[0]; oy -= tg[1]; oz -= tg[2];
      for (let k = 0; k < c.n; k++) { tg[k * 3] += ox; tg[k * 3 + 1] += oy; tg[k * 3 + 2] += oz; }
    }
  }

  // After rig.solve(): move the cloth on by dt and rewrite its bones in the palette at out[off].
  step(dt, out, off, wind = 0) {
    this.targets();
    if (this.fresh || dt > 0.5) {
      for (const c of this.chains) { c.x.set(c.target); c.prev.set(c.target); }
      this.fresh = false;
      dt = 0;
    }
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.time += STEP;
      this.integrate(STEP, wind);
    }
    this.write(out, off);
  }

  integrate(dt, wind) {
    const g = GRAVITY * dt * dt;
    const blow = wind * dt * dt;
    for (const c of this.chains) {
      const { x, prev, target, kind } = c;
      // The top point rides the body.
      for (let a = 0; a < 3; a++) { prev[a] = x[a]; x[a] = target[a]; }
      for (let k = 1; k < c.n; k++) {
        const i = k * 3;
        const follow = 1 - Math.pow(1 - kind.follow[Math.min(k - 1, kind.follow.length - 1)], dt * 60);
        const gust = blow * (1 + Math.sin(this.time * 1.7 + k + (c.angle || 0) * 0.05));
        for (let a = 0; a < 3; a++) {
          const v = (x[i + a] - prev[i + a]) * kind.keep;
          prev[i + a] = x[i + a];
          x[i + a] += v + (target[i + a] - x[i + a]) * follow;
        }
        x[i + 1] -= g;
        x[i] += gust * 0.6; x[i + 2] += gust;
      }
    }
    for (let it = 0; it < 3; it++) {
      for (const c of this.chains) this.lengths(c);
      for (const c of this.chains) if (c.ringTo) for (const [b, d] of c.ringTo) this.spacing(c, b, d);
      for (const c of this.chains) this.collide(c);
    }
    for (const c of this.chains) this.lengths(c);
  }

  // Each point at its own distance from the one above.
  lengths(c) {
    const x = c.x;
    for (let k = 1; k < c.n; k++) {
      const i = k * 3;
      const dx = x[i] - x[i - 3], dy = x[i + 1] - x[i - 2], dz = x[i + 2] - x[i - 1];
      const l = Math.hypot(dx, dy, dz) || 1e-6;
      const s = c.len[k] / l;
      x[i] = x[i - 3] + dx * s; x[i + 1] = x[i - 2] + dy * s; x[i + 2] = x[i - 1] + dz * s;
    }
  }

  // Side by side, between 85% and 125% of the sculpted spacing.
  spacing(a, b, rest) {
    for (let k = 1; k < a.n; k++) {
      const i = k * 3;
      const dx = b.x[i] - a.x[i], dy = b.x[i + 1] - a.x[i + 1], dz = b.x[i + 2] - a.x[i + 2];
      const l = Math.hypot(dx, dy, dz) || 1e-6;
      const want = Math.min(Math.max(l, rest[k] * 0.85), rest[k] * 1.25);
      if (want === l) continue;
      const s = (l - want) / l * 0.5;
      a.x[i] += dx * s; a.x[i + 1] += dy * s; a.x[i + 2] += dz * s;
      b.x[i] -= dx * s; b.x[i + 1] -= dy * s; b.x[i + 2] -= dz * s;
    }
  }

  collide(c) {
    const { wt } = this.rig;
    const x = c.x;
    const hx = wt[this.hipsJoint * 3], hz = wt[this.hipsJoint * 3 + 2];
    for (const col of this.colliders) {
      if (!c.kind.hits.includes(col.group)) continue;
      const a = col.a * 3, b = col.b * 3;
      const ax = wt[a], ay = wt[a + 1], az = wt[a + 2];
      const ex = (wt[b] - ax) * (1 + col.ext), ey = (wt[b + 1] - ay) * (1 + col.ext), ez = (wt[b + 2] - az) * (1 + col.ext);
      const ee = ex * ex + ey * ey + ez * ez || 1e-6;
      for (let k = 1; k < c.n; k++) {
        const i = k * 3, h = i - 3;
        // The nearest points of this cloth segment and the capsule's line (Ericson, Real-Time Collision Detection 5.1.9).
        const dx = x[i] - x[h], dy = x[i + 1] - x[h + 1], dz = x[i + 2] - x[h + 2];
        const rx = x[h] - ax, ry = x[h + 1] - ay, rz = x[h + 2] - az;
        const dd = dx * dx + dy * dy + dz * dz || 1e-6, de = dx * ex + dy * ey + dz * ez;
        const dr = dx * rx + dy * ry + dz * rz, er = ex * rx + ey * ry + ez * rz;
        const den = dd * ee - de * de;
        let s = den > 1e-9 ? Math.min(1, Math.max(0, (de * er - dr * ee) / den)) : 1;
        let t = (de * s + er) / ee;
        if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -dr / dd)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (de - dr) / dd)); }
        const cx = ax + ex * t, cy = ay + ey * t, cz = az + ez * t;
        const px = x[h] + dx * s, py = x[h + 1] + dy * s, pz = x[h + 2] + dz * s;
        const wx = px - cx, wy = py - cy, wz = pz - cz;
        const r = col.ra + (col.rb - col.ra) * t + (c.kind.pad || 0);
        const ww = wx * wx + wy * wy + wz * wz;
        if (ww >= r * r) continue;
        // Cloth is only ever pushed straight out from her middle, as a leg or hand presses a gown outward. (Pushed along
        // whatever way the leg faced, the edge of a skirt wraps round the thigh.)
        let ux = px - hx, uz = pz - hz;
        const ul = Math.hypot(ux, uz);
        if (ul < 1e-4) continue;
        ux /= ul; uz /= ul;
        const wu = wx * ux + wz * uz;
        const lift = -wu + Math.sqrt(Math.max(0, wu * wu - (ww - r * r)));
        // Share the push between the segment's two ends so the nearest point clears; a top point that rides the body
        // doesn't move, so then the lower end takes it all.
        const w0 = k === 1 ? 0 : 1 - s, w1 = Math.max(s, k === 1 ? 0.3 : 0);
        const m = Math.min(lift, 0.1) / (w0 * w0 + w1 * w1);
        x[h] += ux * m * w0; x[h + 2] += uz * m * w0;
        x[i] += ux * m * w1; x[i + 2] += uz * m * w1;
      }
    }
    // Sleeves stay outside the dress.
    const dress = this.dress;
    if (c.kind.hits.includes('dress') && dress.length > 1) {
      const hy = wt[this.hipsJoint * 3 + 1];
      for (let k = 1; k < c.n; k++) {
        const i = k * 3;
        const below = hy - x[i + 1];
        if (below < dress[0][0]) continue;
        let s = 0;
        while (s + 2 < dress.length && dress[s + 1][0] < below) s++;
        const f = Math.min(1, (below - dress[s][0]) / (dress[s + 1][0] - dress[s][0]));
        const r = dress[s][1] + (dress[s + 1][1] - dress[s][1]) * f;
        const dx = x[i] - hx, dz = x[i + 2] - hz;
        const d = Math.hypot(dx, dz);
        if (d >= r || d < 1e-5) continue;
        x[i] = hx + dx / d * r; x[i + 2] = hz + dz / d * r;
      }
    }
  }

  // Each bone turned from where the rigid cloth would point it to where its points now lie, and placed at its point.
  write(out, off) {
    const { pq, wq, wt } = this.rig;
    const q = this.q, v = this.v;
    for (const c of this.chains) {
      const p = c.parent * 4;
      for (let k = 0; k < c.joints.length; k++) {
        const j = c.joints[k], i = k * 3;
        // The rigid direction of this bone, and the one it has now.
        v[0] = c.rest[i + 3] - c.rest[i]; v[1] = c.rest[i + 4] - c.rest[i + 1]; v[2] = c.rest[i + 5] - c.rest[i + 2];
        quatRotate(v, 0, pq, p, v, 0);
        let ax = v[0], ay = v[1], az = v[2];
        let al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
        let bx = c.x[i + 3] - c.x[i], by = c.x[i + 4] - c.x[i + 1], bz = c.x[i + 5] - c.x[i + 2];
        const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;
        // The shortest turn from a to b.
        const d = ax * bx + ay * by + az * bz;
        q[0] = ay * bz - az * by; q[1] = az * bx - ax * bz; q[2] = ax * by - ay * bx; q[3] = 1 + d;
        if (q[3] < 1e-6) { q[0] = 0; q[1] = 0; q[2] = 1; q[3] = 0; }
        quatNormalize(q, 0);
        quatMul(wq, j * 4, q, 0, pq, p);
        wt[j * 3] = c.x[i]; wt[j * 3 + 1] = c.x[i + 1]; wt[j * 3 + 2] = c.x[i + 2];
        // Bound without a turn: the skinning transform is this turn, and the point less the turned bind position.
        const x = wq[j * 4], y = wq[j * 4 + 1], z = wq[j * 4 + 2], w = wq[j * 4 + 3];
        v[0] = c.rest[i]; v[1] = c.rest[i + 1]; v[2] = c.rest[i + 2];
        quatRotate(v, 0, wq, j * 4, v, 0);
        const tx = c.x[i] - v[0], ty = c.x[i + 1] - v[1], tz = c.x[i + 2] - v[2];
        const o = off + j * 8;
        out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
        out[o + 4] = 0.5 * (tx * w + ty * z - tz * y);
        out[o + 5] = 0.5 * (-tx * z + ty * w + tz * x);
        out[o + 6] = 0.5 * (tx * y - ty * x + tz * w);
        out[o + 7] = -0.5 * (tx * x + ty * y + tz * z);
      }
    }
  }
}
