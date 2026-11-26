// Cloth that hangs: the back of the wizard's robe (tools/player/robe_rig.py, src/sim/playerbody.js), and once Lisandra's.
// Her skirt, tabard and hanging sleeves were chains of bones (tools/lisandra/cloth_rig.py) that hang
// with gravity, trail behind her, and are kept out of her legs, hands and body. Each chain is a line of points: the first
// rides on the body bone it hangs from, the rest swing. A skirt point is pulled a little toward where the sculpt put it,
// so the dress keeps its cut; a sleeve hangs straight down from the arm. Every segment is pushed out of whatever it
// would pass through. Points beside each other round the skirt hold their spacing, so it neither bunches nor tears.
// No piece swings more than about 35 degrees off hanging straight (past its own cut), a kink straightens out, nothing goes
// under the ground, and a leg's push moves the cloth without flinging it. Then each bone is turned to lie along its points.
import { quatMul, quatNormalize, quatRotate } from '../core/math.js';

const STEP = 1 / 120;
const ZERO = [0, 0, 0];
const GRAVITY = 9.8;
const SWING = 35 * Math.PI / 180;   // how far off straight down a piece may swing, past its own cut
const BEND = 0.12;                  // how hard a kink is pulled straight, per pass
const PUSH_KEEP = 0.3;              // of a push out of a leg, how much carries on as swing
const GROUND = 0.012;               // cloth lies this far over the ground
const POOL = 0.0025;                // how far a point lying on the ground slides out from her, per step (so a hem pools)
const POOL_MAX = 0.05;              // and no further than this from where it came down (or a kneel swells into a dome)
const PART = [50 * Math.PI / 180, 85 * Math.PI / 180];   // thighs this far apart: the tabard hangs free instead of skinned

// Per kind: how hard each point is pulled toward its shape (per sixtieth of a second, top point to tip), how much speed
// it keeps per step, what it collides with, and whether its shape is the sculpt's or simply hanging down.
const KINDS = {
  skirt: { follow: [0.24, 0.12, 0.06], keep: 0.965, hits: ['legs', 'feet', 'hands'] },
  // The tabard hangs between her thighs, so every point of it is carried as the old skin carried it (skinned), and it
  // only sways about that; it is one chain down its middle, so its colliders are padded a little toward its edges.
  tabard: { follow: [0.25, 0.2, 0.15], keep: 0.95, hits: ['legs', 'feet', 'hands'], pad: 0.02, skinned: true },
  sleeve: { follow: [0.06, 0.05, 0.04], keep: 0.95, hits: ['dress', 'legs'], hang: true },
};

// A cloth's own pace, when its form gives one (form.motion; the wizard's robe, src/sim/playerbody.js): each point swings
// back to its cut as a pendulum of `hz` (top point to tip), losing `damp` of its swing against the body (0..1 of
// critical), with `air` (per second) of drag on its speed through the air, so it trails a little as he runs, and `gravity`
// as a share of the full pull (the cut is already the cloth hanging). A spring pull per frame (follow) and drag on the speed
// through the air (keep) made a stiff spring with almost nothing against it: his robe rang at seven to sixteen swings a second.
function pace(m) {
  const w = m.hz.map((f) => 2 * Math.PI * f * STEP);
  return { k: w.map((x) => x * x), rel: w.map((x) => Math.exp(-2 * m.damp * x)), air: Math.exp(-m.air * STEP), g: m.gravity, push: m.push ?? 0.015, clear: m.clear ?? -1 };
}

const MIXAMO = {
  hips: 'mixamorig:Hips', upLeg: (s) => `mixamorig:${s}UpLeg`, leg: (s) => `mixamorig:${s}Leg`, foot: (s) => `mixamorig:${s}Foot`,
  toe: (s) => `mixamorig:${s}ToeBase`, foreArm: (s) => `mixamorig:${s}ForeArm`, hand: (s) => `mixamorig:${s}Hand`, fingers: (s) => `mixamorig:${s}HandMiddle2`,
};

export class Cloth {
  // def: the cloth extras from the model. form: the colliders (see LISANDRA_FORMS). scale: model units to metres.
  constructor(rig, def, form, scale) {
    this.form = form;
    this.rig = rig;
    this.chains = def.chains.map((ch) => {
      const joints = ch.joints.map((n) => rig.index.get(n));
      const parent = rig.index.get(ch.parent);
      const n = joints.length + 1;
      const rest = new Float32Array(n * 3);
      // A cloth bone is bound without a turn, so its bind position is minus its inverse bind translation.
      joints.forEach((j, k) => { for (let a = 0; a < 3; a++) rest[k * 3 + a] = -rig.ibT[j * 3 + a]; });
      for (let a = 0; a < 3; a++) rest[(n - 1) * 3 + a] = ch.tip[a] * scale;
      const len = new Float32Array(n), cap = new Float32Array(n);
      const kind = KINDS[ch.kind];
      for (let k = 1; k < n; k++) {
        const dx = rest[k * 3] - rest[k * 3 - 3], dy = rest[k * 3 + 1] - rest[k * 3 - 2], dz = rest[k * 3 + 2] - rest[k * 3 - 1];
        len[k] = Math.hypot(dx, dy, dz);
        // Its cut, as an angle off straight down (a sleeve's is straight down), and the swing allowed past it.
        const cut = kind.hang ? 0 : Math.atan2(Math.hypot(dx, dz), Math.max(1e-4, -dy));
        cap[k] = Math.min(Math.PI * 0.62, Math.max(SWING, cut + SWING * 0.45));
      }
      // The top point is carried as the old skin carried the cloth there: a mix of body bones.
      const bones = (a) => ({ j: a.j.map((n) => rig.index.get(n)), w: a.w });
      const anchors = (ch.anchors || [{ j: [ch.parent], w: [1] }]).map(bones);
      return { kind, motion: form.motion && ch.kind === 'skirt' ? pace(form.motion) : null, anchor: anchors[0], anchors, name: ch.kind, side: ch.side, angle: ch.angle, joints, parent, n, rest, len, cap, x: new Float32Array(n * 3), prev: new Float32Array(n * 3), target: new Float32Array(n * 3), was: new Float32Array(n * 3) };
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
    // Colliders: capsules between joints, radius at each end, in metres (form.legs, form.hand). The joints by their names in
    // a Mixamo skeleton (hers), or as form.bones names them (the wizard's: src/sim/playerbody.js).
    const named = form.bones || MIXAMO;
    const J = (n, s) => rig.index.get(typeof named[n] === 'function' ? named[n](s) : named[n]);
    // ext carries a capsule on past its far joint, as a fraction of its length: the shin's covers the boot's heel.
    const cap = (s, a, b, ra, rb, group, ext = 0) => ({ a: J(a, s), b: J(b, s), ra, rb, group, ext, below: a !== 'upLeg' && group !== 'hands' });
    this.colliders = [];
    for (const s of ['Left', 'Right']) {
      this.colliders.push(cap(s, 'upLeg', 'leg', form.legs[0], form.legs[1], 'legs'));
      this.colliders.push(cap(s, 'leg', 'foot', form.legs[1], form.legs[2] + 0.02, 'legs', 0.32));
      this.colliders.push(cap(s, 'foot', 'toe', form.legs[2] * 0.85, form.legs[2] * 0.7, 'feet'));
      this.colliders.push(cap(s, 'foreArm', 'hand', form.hand * 0.8, form.hand, 'hands'));
      this.colliders.push(cap(s, 'hand', 'fingers', form.hand, form.hand * 0.8, 'hands'));
    }
    for (const c of this.colliders) if (c.a === undefined || c.b === undefined) throw new Error('cloth: a collider joint is missing');
    this.hipsJoint = J('hips');
    this.thighs = ['Left', 'Right'].map((s) => [J('upLeg', s), J('leg', s)]);
    // How far her body and dress reach at her sides, by depth under the hips: the sleeves hang outside it.
    this.dress = (def.dress || []).map(([d, r]) => [d * scale, r * scale + (form.sleeveGap ?? 0.02)]);
    this.fresh = true;
    this.time = 0;
    this.acc = 0;
    // Every point is kept from here (his hips at the frame's start, in the world), not from the world's middle. The world
    // runs thousands of metres out, where a 32-bit number only tells half a millimetre from the next: the cloth's swing
    // each step is less than that, so it jittered on the grid and couldn't settle (a robe panel stood out 28 cm off its
    // cut in the Test Dungeon, 5.8 km out). Its points near his hips are kept to a thousandth of that.
    // (o: that place in the world; r: the same in the rig's own space, which is the world for a rig solved where it
    // stands, and about his feet for one solved there and moved after, src/sim/anim.js ArmsRig.shift.)
    this.o = new Float64Array(3);
    this.r = new Float64Array(3);
    this.q = new Float32Array(4);
    this.t = new Float32Array(3);
    this.v = new Float32Array(3);
  }

  reset() { this.fresh = true; }

  // Put somewhere else at a stroke, facing as he did (a door, a portal): the robe goes along as it hangs and swings
  // now, kept from his hips, not left behind in the world nor started again still on its cut (a flick at a run).
  carry() { this.carried = true; }

  // Where each point wants to be. The top: where the old skin put it. Below that, the sculpted shape held still on the
  // body bone (through its skinning transform) and moved to hang from that top; or, for hanging cloth, straight down.
  targets() {
    const { pq, pt, wt } = this.rig;
    const v = this.v, [o0, o1, o2] = this.r;
    // How far her thighs are parted (a kneel, a long step): past a point the skinned tabard stops being carried between
    // them, where it would stretch from one to the other like a board, and hangs from her waist over the forward knee.
    const [[la, lb], [ra, rb]] = this.thighs;
    const lx = wt[lb * 3] - wt[la * 3], ly = wt[lb * 3 + 1] - wt[la * 3 + 1], lz = wt[lb * 3 + 2] - wt[la * 3 + 2];
    const rx = wt[rb * 3] - wt[ra * 3], ry = wt[rb * 3 + 1] - wt[ra * 3 + 1], rz = wt[rb * 3 + 2] - wt[ra * 3 + 2];
    const cos = (lx * rx + ly * ry + lz * rz) / ((Math.hypot(lx, ly, lz) * Math.hypot(rx, ry, rz)) || 1);
    const parted = Math.acos(Math.max(-1, Math.min(1, cos)));
    const free = Math.max(0, Math.min(1, (parted - PART[0]) / (PART[1] - PART[0])));
    for (const c of this.chains) {
      const p = c.parent, tg = c.target;
      let ox = 0, oy = 0, oz = 0;
      const { j, w } = c.anchor;
      for (let m = 0; m < j.length; m++) {
        quatRotate(v, 0, pq, j[m] * 4, c.rest, 0);
        ox += (v[0] + pt[j[m] * 3] - o0) * w[m]; oy += (v[1] + pt[j[m] * 3 + 1] - o1) * w[m]; oz += (v[2] + pt[j[m] * 3 + 2] - o2) * w[m];
      }
      if (c.kind.skinned) {
        // Every point where the old skin put it (the tip goes with the last bone's mix).
        for (let k = 0; k < c.n; k++) {
          const a = c.anchors[Math.min(k, c.anchors.length - 1)];
          let x = 0, y = 0, z = 0;
          for (let m = 0; m < a.j.length; m++) {
            quatRotate(v, 0, pq, a.j[m] * 4, c.rest, k * 3);
            x += (v[0] + pt[a.j[m] * 3] - o0) * a.w[m]; y += (v[1] + pt[a.j[m] * 3 + 1] - o1) * a.w[m]; z += (v[2] + pt[a.j[m] * 3 + 2] - o2) * a.w[m];
          }
          tg[k * 3] = x; tg[k * 3 + 1] = y; tg[k * 3 + 2] = z;
        }
        if (free > 0) {
          // Hanging straight down from its top instead.
          let hy = tg[1];
          for (let k = 1; k < c.n; k++) {
            hy -= c.len[k];
            tg[k * 3] += (tg[0] - tg[k * 3]) * free; tg[k * 3 + 1] += (hy - tg[k * 3 + 1]) * free; tg[k * 3 + 2] += (tg[2] - tg[k * 3 + 2]) * free;
          }
        }
        continue;
      }
      for (let k = 0; k < c.n; k++) {
        if (k && c.kind.hang) { tg[k * 3] = tg[k * 3 - 3]; tg[k * 3 + 1] = tg[k * 3 - 2] - c.len[k]; tg[k * 3 + 2] = tg[k * 3 - 1]; continue; }
        quatRotate(v, 0, pq, p * 4, c.rest, k * 3);
        tg[k * 3] = v[0] + pt[p * 3] - o0; tg[k * 3 + 1] = v[1] + pt[p * 3 + 1] - o1; tg[k * 3 + 2] = v[2] + pt[p * 3 + 2] - o2;
      }
      ox -= tg[0]; oy -= tg[1]; oz -= tg[2];
      for (let k = 0; k < c.n; k++) { tg[k * 3] += ox; tg[k * 3 + 1] += oy; tg[k * 3 + 2] += oz; }
    }
  }

  // After rig.solve(): move the cloth on by dt and rewrite its bones in the palette at out[off]. ground: the height of the
  // ground under her. at: where the rig was solved about, in the world (none: in the world itself).
  step(dt, out, off, wind = 0, ground = -Infinity, at = ZERO) {
    this.ground = ground;
    // (Kept from his hips as they are now: what was kept from where they were is moved by as much.)
    const h = this.hipsJoint * 3, wt = this.rig.wt, o = this.o, r = this.r;
    r[0] = wt[h]; r[1] = wt[h + 1]; r[2] = wt[h + 2];
    const dx = r[0] + at[0] - o[0], dy = r[1] + at[1] - o[1], dz = r[2] + at[2] - o[2];
    o[0] = r[0] + at[0]; o[1] = r[1] + at[1]; o[2] = r[2] + at[2];
    if (this.carried) this.carried = false;
    else if (!this.fresh) {
      for (const c of this.chains) for (const arr of [c.x, c.prev, c.was]) for (let i = 0; i < c.n * 3; i += 3) { arr[i] -= dx; arr[i + 1] -= dy; arr[i + 2] -= dz; }
    }
    this.targets();
    // A cloth with a pace of its own (form.motion.clear: how far, in metres) has its cut itself kept off his thighs: it
    // swings toward a shape that already clears a leg coming forward under it, and is carried aside on its spring, not
    // only knocked off the leg once it's in it. (A thigh at a run sank half as far into the robe.)
    for (const c of this.chains) if (c.motion && c.motion.clear >= 0) for (let it = 0; it < 2; it++) this.collide(c, c.target, null, Infinity, c.motion.clear);
    if (this.fresh || dt > 0.5) {
      for (const c of this.chains) { c.x.set(c.target); c.prev.set(c.target); c.was.set(c.target); c.slid?.fill(0); }
      this.fresh = false;
      dt = 0;
    }
    this.acc = Math.min(this.acc + dt, 0.1);
    // (The targets move once a frame; the steps in it take that move a share each, so the body's speed is even through them.)
    const steps = Math.floor(this.acc / STEP + 1e-9);
    for (let s = 0; s < steps; s++) {
      this.acc -= STEP;
      this.time += STEP;
      this.integrate(STEP, wind, (s + 1) / steps, 1 / steps);
    }
    if (steps) for (const c of this.chains) c.was.set(c.target);
    this.write(out, off);
  }

  // f: how far through this frame's move of the body this step is; share: the share of it one step takes.
  integrate(dt, wind, f = 1, share = 1) {
    const g = GRAVITY * dt * dt;
    const blow = wind * dt * dt;
    for (const c of this.chains) {
      const { x, prev, target, kind, was } = c;
      // The top point rides the body.
      for (let a = 0; a < 3; a++) { prev[a] = x[a]; x[a] = was[a] + (target[a] - was[a]) * f; }
      if (c.motion) {
        const m = c.motion;
        for (let k = 1; k < c.n; k++) {
          const i = k * 3, j = Math.min(k - 1, m.k.length - 1);
          for (let a = 0; a < 3; a++) {
            // Its place on the body now, and how that moved this step: the swing is damped against the body's own move.
            const to = was[i + a] + (target[i + a] - was[i + a]) * f, body = (target[i + a] - was[i + a]) * share;
            const v = (body + (x[i + a] - prev[i + a] - body) * m.rel[j]) * m.air;
            prev[i + a] = x[i + a];
            x[i + a] += v + (to - x[i + a]) * m.k[j];
          }
          x[i + 1] -= g * m.g;
        }
        continue;
      }
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
      for (const c of this.chains) this.straighten(c);
      for (const c of this.chains) this.lengths(c);
      for (const c of this.chains) if (c.ringTo) for (const [b, d] of c.ringTo) this.spacing(c, b, d);
      for (const c of this.chains) this.collide(c);
    }
    for (const c of this.chains) { this.lengths(c); this.floor(c); }
  }

  // A kink eased toward the line of the piece above it, and no piece swung further off straight down than its cap.
  straighten(c) {
    const x = c.x;
    for (let k = 2; k < c.n; k++) {
      const i = k * 3, h = i - 3, g = i - 6, s = c.len[k] / (c.len[k - 1] || 1);
      // (Cloth with a pace of its own keeps its cut's bends: the piece above's swing off its cut carries on down, rather
      // than every bend pulled out, which held the robe's hem a few centimetres off its cut standing still.)
      if (c.motion) { const t = c.target; for (let a = 0; a < 3; a++) x[i + a] += (x[h + a] + t[i + a] - t[h + a] + (x[h + a] - x[g + a] - t[h + a] + t[g + a]) * s - x[i + a]) * BEND; continue; }
      for (let a = 0; a < 3; a++) x[i + a] += (x[h + a] + (x[h + a] - x[g + a]) * s - x[i + a]) * BEND;
    }
    for (let k = 1; k < c.n; k++) {
      const i = k * 3, h = i - 3;
      const dx = x[i] - x[h], dy = x[i + 1] - x[h + 1], dz = x[i + 2] - x[h + 2];
      const across = Math.hypot(dx, dz), l = Math.hypot(across, dy) || 1e-6;
      if (Math.atan2(across, -dy) <= c.cap[k]) continue;
      const k2 = l * Math.sin(c.cap[k]) / (across || 1e-6);
      x[i] = x[h] + dx * k2; x[i + 1] = x[h + 1] - l * Math.cos(c.cap[k]); x[i + 2] = x[h + 2] + dz * k2;
    }
  }

  // Nothing under the ground: it lies on it, slowed, and what lies there spreads out from her so a long hem pools rather
  // than piling up into a column under her.
  floor(c) {
    const y = this.ground + GROUND - this.o[1], x = c.x, prev = c.prev;
    // (The hips are where the points are kept from.)
    const hx = 0, hz = 0;
    const slid = c.slid ??= new Float32Array(c.n);
    for (let k = 1; k < c.n; k++) {
      const i = k * 3;
      if (x[i + 1] >= y) { slid[k] = Math.max(0, slid[k] - POOL * 0.5); continue; }
      x[i + 1] = y; prev[i + 1] = y;
      prev[i] += (x[i] - prev[i]) * 0.5; prev[i + 2] += (x[i + 2] - prev[i + 2]) * 0.5;
      const ox = x[i] - hx, oz = x[i + 2] - hz, ol = Math.hypot(ox, oz);
      if (ol > 1e-4 && slid[k] < POOL_MAX) { x[i] += ox / ol * POOL; x[i + 2] += oz / ol * POOL; slid[k] += POOL; }
    }
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

  // x, pv: the points to push and their last places (none: a shape, with no speed to keep); cap: the most a point moves.
  collide(c, x = c.x, pv = c.prev, cap = c.motion ? c.motion.push : 0.1, margin = 0) {
    const { wt } = this.rig;
    const [o0, o1, o2] = this.r;
    const hx = 0, hz = 0;   // (the hips: where the points are kept from)
    for (const col of this.colliders) {
      if (!c.kind.hits.includes(col.group)) continue;
      // (Cloth with a pace of its own is kept off the thighs and hands only. Under the knee a shin swings up behind into
      // the hem as he runs, and there's no pushing the cloth clear of a heel coming up through it: each step flung the
      // hem out round the heel by a foot and more. The robe covers what a calf does under it.)
      if (c.motion && col.below) continue;
      const a = col.a * 3, b = col.b * 3;
      const ax = wt[a] - o0, ay = wt[a + 1] - o1, az = wt[a + 2] - o2;
      const ex = (wt[b] - wt[a]) * (1 + col.ext), ey = (wt[b + 1] - wt[a + 1]) * (1 + col.ext), ez = (wt[b + 2] - wt[a + 2]) * (1 + col.ext);
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
        const r = col.ra + (col.rb - col.ra) * t + (c.kind.pad || 0) + margin;
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
        // (And it's eased off a thigh over a few steps, not snapped off it in one.)
        const m = Math.min(lift, cap) / (w0 * w0 + w1 * w1);
        x[h] += ux * m * w0; x[h + 2] += uz * m * w0;
        x[i] += ux * m * w1; x[i + 2] += uz * m * w1;
        // Moved, not flung: most of the push doesn't carry on as speed.
        // (Cloth with a pace of its own lies on the leg and is carried by it, not bounced off: a bounce each step, then
        // pulled back onto the leg, set it chattering against the thigh.)
        if (!pv) continue;
        const still = c.motion ? 1 : 1 - PUSH_KEEP;
        if (k > 1) { pv[h] += ux * m * w0 * still; pv[h + 2] += uz * m * w0 * still; }
        pv[i] += ux * m * w1 * still; pv[i + 2] += uz * m * w1 * still;
      }
    }
    // Sleeves stay outside the dress.
    const dress = this.dress;
    if (c.kind.hits.includes('dress') && dress.length > 1) {
      const hy = 0;
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
    const q = this.q, v = this.v, [o0, o1, o2] = this.r;
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
        wt[j * 3] = c.x[i] + o0; wt[j * 3 + 1] = c.x[i + 1] + o1; wt[j * 3 + 2] = c.x[i + 2] + o2;
        // Bound without a turn: the skinning transform is this turn, and the point less the turned bind position.
        const x = wq[j * 4], y = wq[j * 4 + 1], z = wq[j * 4 + 2], w = wq[j * 4 + 3];
        v[0] = c.rest[i]; v[1] = c.rest[i + 1]; v[2] = c.rest[i + 2];
        quatRotate(v, 0, wq, j * 4, v, 0);
        const tx = c.x[i] + o0 - v[0], ty = c.x[i + 1] + o1 - v[1], tz = c.x[i + 2] + o2 - v[2];
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
