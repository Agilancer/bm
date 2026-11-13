// What monsters throw and what they mark on the ground, for anything in the game to use: sim.perils.
//
// A mark is a warning drawn on the ground in one of the shapes of src/core/perils.js (a circle, a ring, a cone, a strip,
// crossed strips). It fills as its fuse runs out, then lands on everyone inside it; after that it may stay and burn
// (dps), turn (spin), travel (vx, vz), spread (grow) or bite whatever touches it (touch). A shot is something flying: it
// hurts the first of you it meets, a raised shield turns it, and it may leave a mark where it ends. Both hurt you and
// every other Tessariel standing there, whoever they were meant for.
//
//   sim.perils.mark({ shape: 'cone', x, z, yaw, r: 12, half: 0.6, fuse: 1.2, dmg: 40, elem: ELEM.FIRE })
//   sim.perils.shot({ x, y, z, yaw, speed: 14, dmg: 12, look: 'blade' })
//
// Built on those: fan, nova, spiral and wall (shots); lob, rain, march, rings and wave (marks). The named attacks the
// monsters make of them are in src/sim/moves.js. The party steps out of marks by danger() (src/sim/hero.js), and auto-play
// by the same shapes, posted to the page a few times a second.
import { SHAPE, covers, edge, markOut, reachOf, wayOut } from '../core/perils.js';
import { EV } from '../core/layout.js';
import { clamp } from '../core/math.js';
import { ELEM, FX } from './spells.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
// What each element leaves in the air where it lands.
const SMOKE = { [ELEM.FIRE]: FX.FLAME, [ELEM.STONE]: FX.ROCK };

export class Perils {
  constructor(sim) {
    this.sim = sim;
    this.marks = []; this.shots = []; this.arcs = []; this.jobs = [];
    this.list = [];
    this.postT = 0; this.posted = 0; this.looseAt = -1;
    // What's landed on the player since the count was last cleared (tools/dungeon/fight.mjs reads it).
    this.tally = { hits: 0, dmg: 0, by: {} };
  }

  clear() { this.marks.length = 0; this.shots.length = 0; this.arcs.length = 0; this.jobs.length = 0; }
  get busy() { return this.marks.length + this.shots.length + this.arcs.length + this.jobs.length > 0; }

  // Everyone it can hurt: you, and the other Tessariels who are up.
  victims() {
    const sim = this.sim, out = this.list;
    if (this.listTick === sim.tick) return out;
    this.listTick = sim.tick;
    out.length = 0;
    if (!sim.player.dead) out.push(sim.player);
    for (const h of sim.heroes) if (h.active && !h.dead && !h.broker && !h.hidden && !h.surf) out.push(h);
    return out;
  }

  // Off the ground: over a wave that runs along it.
  airborne(v) {
    if (v === this.sim.player) return !v.onGround && v.y > this.sim.world.height(v.x, v.z) + 0.3;
    return !!v.jump;
  }

  hurt(v, dmg, x, z, knock = 0, blockable = false, tag = '') {
    const sim = this.sim;
    if (v.dead || dmg <= 0) return false;
    const was = v.hp;
    if (v.damage(sim, dmg, x, z, knock, !blockable) === false) return false;
    if (v === sim.player) {
      sim.event(EV.HURT, v.x, v.y + 1.1, v.z, dmg);
      const t = this.tally; t.hits++; t.dmg += Math.max(0, was - v.hp); if (tag) t.by[tag] = (t.by[tag] || 0) + 1;
    }
    return true;
  }

  // ---- marks on the ground --------------------------------------------------------------------------------------------
  // fuse: seconds of warning. dmg, knock: what lands when it runs out. life: how long it stays after. dps: what standing in
  // it costs, a bite each half second. touch: what crossing it costs (again: seconds before it bites the same one twice).
  // jump: a leap clears it. spin: radians a second it turns, once it's live. vx, vz: how it travels. grow: metres a second
  // its radius spreads (band: how wide the ring stays). ride: a body it stays on, pointing where that points (turn: off its
  // facing; ahead: metres in front). follow: a body it stays under until `lock` of the fuse has run. aim: a body it keeps
  // pointing at until then. from: who made it (the blow comes from there). spare(body): true for one it leaves alone.
  // then(mark, perils, inside): called as it lands, with who was in it. soak: one to stand in, not to be out of (nobody
  // is steered out of it; a fight says who goes in). share: its dmg is split among those in it.

  mark(o) {
    const sim = this.sim;
    const m = {
      shape: 'circle', x: 0, z: 0, r: 2, r0: 0, yaw: 0, half: 0.5, w: 1, arms: 4,
      fuse: 1.2, dmg: 0, knock: 0, life: 0, dps: 0, touch: 0, again: 1, jump: false, elem: ELEM.FIRE,
      spin: 0, vx: 0, vz: 0, grow: 0, band: 1.2, turn: 0, ahead: 0, lock: 0.7,
      ride: null, follow: null, aim: null, from: null, then: null, tag: '', quiet: false, soak: false, share: false,
      t: 0, tick: 0, seed: Math.random(), landed: false, bit: null, ...o,
    };
    if (m.ride) this.carry(m);
    m.y = o.y ?? sim.world.height(m.x, m.z);
    this.marks.push(m);
    return m;
  }

  carry(m) {
    const b = m.ride;
    m.yaw = b.yaw + m.turn;
    m.x = b.x + Math.sin(b.yaw) * m.ahead; m.z = b.z + Math.cos(b.yaw) * m.ahead;
  }

  stepMarks(dt) {
    const sim = this.sim, vs = this.victims();
    let gone = false;
    for (const m of this.marks) {
      m.t += dt;
      if (m.ride) {
        if (m.ride.dead) { m.dead = true; gone = true; continue; }
        this.carry(m); m.y = sim.world.height(m.x, m.z);
      }
      if (m.t < m.fuse) {
        if (m.t < m.fuse * m.lock) {
          if (m.follow && !m.follow.dead) { m.x = m.follow.x; m.z = m.follow.z; m.y = sim.world.height(m.x, m.z); }
          if (m.aim && !m.aim.dead) m.yaw = Math.atan2(m.aim.x - m.x, m.aim.z - m.z);
        }
        continue;
      }
      const fx = m.from ? m.from.x : m.x, fz = m.from ? m.from.z : m.z;
      if (!m.landed) {
        m.landed = true;
        const inside = vs.filter((v) => covers(m, v.x, v.z, 0.25) && !(m.jump && this.airborne(v)) && !m.spare?.(v));
        const dmg = m.share ? m.dmg / Math.max(1, inside.length) : m.dmg;
        if (dmg > 0) for (const v of inside) this.hurt(v, dmg, fx, fz, m.knock, false, m.tag);
        if (!m.quiet) this.land(m);
        m.then?.(m, this, inside);
      }
      if (m.t >= m.fuse + m.life) { if (m.t >= m.fuse + m.life + 0.3) { m.dead = true; gone = true; } continue; }
      if (m.spin) m.yaw += m.spin * dt;
      if (m.vx || m.vz) { m.x += m.vx * dt; m.z += m.vz * dt; m.y = sim.world.height(m.x, m.z); }
      if (m.grow) { m.r += m.grow * dt; if (m.shape === 'ring') m.r0 = Math.max(0, m.r - m.band); }
      if (m.dps > 0) {
        m.tick -= dt;
        if (m.tick <= 0) {
          m.tick = 0.5;
          // (The ground burning under you: from where it burns, and no shove. Every blow on you knocks you back a step, from
          // whoever struck it; a bite from a pool used to, too, from whoever threw it, so a pool pushed whoever stood in it
          // out across its edge in four seconds, and nobody ever burned in one.)
          for (const v of vs) if (covers(m, v.x, v.z) && !m.spare?.(v)) this.hurt(v, m.dps * 0.5, m.x, m.z, null, false, m.tag);
        }
      }
      if (m.touch > 0) {
        for (const v of vs) {
          if (!covers(m, v.x, v.z) || (m.jump && this.airborne(v)) || m.spare?.(v)) continue;
          const bit = m.bit || (m.bit = new Map());
          if (sim.time - (bit.get(v) ?? -1e9) < m.again) continue;
          bit.set(v, sim.time);
          this.hurt(v, m.touch, fx, fz, m.knock, false, m.tag);
        }
      }
    }
    if (gone) this.marks = this.marks.filter((m) => !m.dead);
  }

  // A point somewhere in a mark.
  pointIn(m, out) {
    const R = reachOf(m);
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R;
      out[0] = m.x + Math.sin(a) * d; out[1] = m.z + Math.cos(a) * d;
      if (covers(m, out[0], out[1], -0.1)) return true;
    }
    return false;
  }

  // What's seen as it lands: a clap over the whole of it, and its element thrown up inside it.
  land(m) {
    const sim = this.sim, c = sim.casting, R = reachOf(m), at = this.at || (this.at = [0, 0]);
    if (m.shape === 'circle') c.burst(FX.SHOCK, m.elem, m.x, m.y + 0.3, m.z, m.r * 0.35, m.r * 1.1, 0.45, { light: 4 + m.r, lightR: m.r * 2 });
    else if (m.shape === 'ring') c.burst(FX.RING, m.elem, m.x, m.y + 0.1, m.z, m.r * 0.9, m.r * 1.05, 0.45, { light: 5, lightR: m.r });
    const n = clamp(Math.round(R * (m.shape === 'circle' ? 1.2 : 0.9)), 2, 9), shape = SMOKE[m.elem] ?? FX.PUFF;
    for (let i = 0; i < n; i++) {
      if (!this.pointIn(m, at)) continue;
      const y = sim.world.height(at[0], at[1]);
      if (shape === FX.ROCK) c.burst(FX.ROCK, m.elem, at[0], y + 0.25, at[1], 0.3, 0.26, 1.1);
      else c.burst(shape, m.elem, at[0], y + 0.15, at[1], 0.5, shape === FX.FLAME ? 1.6 : 2.2, rnd(0.5, 0.9), { alpha: 0.85, len: 1.1, light: i === 0 ? 6 : 0, lightR: 6 });
    }
    if (m.dmg > 0 && R >= 2) sim.event(EV.GROUND, m.x, m.y, m.z);
  }

  drawMarks() {
    const sim = this.sim, c = sim.casting, at = this.at || (this.at = [0, 0]);
    for (const m of this.marks) {
      const live = m.t >= m.fuse, R = reachOf(m);
      let fill, alpha, light = 0;
      if (!live) { const k = m.t / m.fuse; fill = Math.min(k, 0.995); alpha = 0.6 + 0.4 * k; }
      else {
        fill = 1.5;
        alpha = m.life > 0 ? clamp((m.fuse + m.life - m.t) / 0.7, 0, 1) : clamp(1 - (m.t - m.fuse) / 0.3, 0, 1);
        if (m.life > 0) light = 3 * alpha;
      }
      if (alpha <= 0) continue;
      const k = SHAPE[m.shape] ?? 0;
      const A = k === 1 ? (m.r0 || 0) / R : k === 2 ? m.half : k >= 3 ? m.w / R : 0, B = k >= 3 ? m.r / R : 0;
      c.fx(FX.MARK, m.elem, m.x, m.y + 0.06, m.z, R, Math.sin(m.yaw), A, Math.cos(m.yaw), B, alpha, light, R * 1.4, fill, m.seed, k === 4 ? 4 + (m.arms || 4) / 100 : k);
      // (What burns on throws its fire up now and then.)
      if (live && m.life > 0 && (m.dps > 0 || m.touch > 0) && ((sim.tick + (m.seed * 97 | 0)) & 7) === 0 && this.pointIn(m, at)) {
        const y = sim.world.height(at[0], at[1]);
        c.burst(m.elem === ELEM.FIRE ? FX.FLAME : FX.PUFF, m.elem, at[0], y + 0.15, at[1], 0.3, m.elem === ELEM.FIRE ? 1 : 1.5, 0.8, { alpha: 0.7 * alpha, len: 0.8 });
      }
    }
  }

  // ---- what flies -----------------------------------------------------------------------------------------------------
  // From (x, y, z) along yaw (and pitch, or straight at a body or a point: at, to). speed, size, dmg, knock, life (seconds).
  // look: 'orb', 'rock', 'blade', 'flask', 'lance'. home: how hard it turns after `at`, for homeFor seconds. grav: how hard it
  // falls. bounce: how many times it skips off the ground. pierce: goes on through who it hits. block: a shield stops it
  // (true unless said). ghost: through walls. burst: a mark left where it ends (its x and z are filled in).

  shot(o) {
    const sim = this.sim;
    const s = { x: 0, y: 1, z: 0, speed: 14, size: 0.22, elem: ELEM.FIRE, dmg: 10, knock: 0, life: 4, look: 'orb', home: 0, homeFor: 0, at: null,
      grav: 0, bounce: 0, pierce: false, block: true, ghost: false, burst: null, from: null, tag: '', age: 0, seed: Math.random(), ...o };
    let dx, dy, dz;
    const to = o.to || (o.at && o.yaw === undefined ? [o.at.x, o.at.y + 1, o.at.z] : null);
    if (to) { dx = to[0] - s.x; dy = to[1] - s.y; dz = to[2] - s.z; }
    else { const p = o.pitch || 0; dx = Math.sin(o.yaw || 0) * Math.cos(p); dy = Math.sin(p); dz = Math.cos(o.yaw || 0) * Math.cos(p); }
    const L = Math.hypot(dx, dy, dz) || 1;
    s.vx = dx / L * s.speed; s.vy = dy / L * s.speed; s.vz = dz / L * s.speed;
    if (sim.time - this.looseAt > 0.12) { this.looseAt = sim.time; sim.event(EV.SPELL_LOOSE, s.elem, 0, s.x, s.y, s.z); }
    this.shots.push(s);
    return s;
  }

  stepShots(dt) {
    const sim = this.sim, vs = this.victims();
    let gone = false;
    for (const s of this.shots) {
      s.age += dt;
      if (s.home && s.at && !s.at.dead && s.age < s.homeFor) {
        let ax = s.at.x - s.x, ay = s.at.y + 1 - s.y, az = s.at.z - s.z;
        const L = Math.hypot(ax, ay, az) || 1, k = 1 - Math.exp(-s.home * dt);
        ax = ax / L * s.speed; ay = ay / L * s.speed; az = az / L * s.speed;
        s.vx += (ax - s.vx) * k; s.vy += (ay - s.vy) * k; s.vz += (az - s.vz) * k;
        const l = Math.hypot(s.vx, s.vy, s.vz) || 1; s.vx *= s.speed / l; s.vy *= s.speed / l; s.vz *= s.speed / l;
      }
      if (s.grav) s.vy -= s.grav * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      let end = s.age > s.life;
      const g = sim.world.height(s.x, s.z);
      if (s.y < g + 0.05) {
        if (s.bounce > 0) { s.bounce--; s.y = g + 0.06; s.vy = Math.abs(s.vy) * 0.62; sim.casting.burst(FX.SHOCK, s.elem, s.x, g + 0.2, s.z, 0.3, 1.6, 0.3); }
        else { s.y = g + 0.05; end = true; }
      }
      if (!s.ghost && sim.world.inside(s.x, s.z, 0.05)) end = true;
      for (const v of vs) {
        if (s.y < v.y - 0.1 || s.y > v.y + 2 || Math.hypot(s.x - v.x, s.z - v.z) > 0.42 + s.size) continue;
        if (s.struck?.has(v) || v.iframes) continue;
        (s.struck || (s.struck = new Set())).add(v);
        // (From where it came, so a shield turned to it stops it.)
        this.hurt(v, s.dmg, s.x - s.vx, s.z - s.vz, s.knock, s.block, s.tag);
        if (!s.pierce) { end = true; break; }
      }
      if (end) {
        s.dead = true; gone = true;
        sim.casting.burst(FX.FLARE, s.elem, s.x, s.y, s.z, s.size * 1.2, s.size * 4, 0.22, { alpha: 1.1, light: 8, lightR: 5 });
        if (s.burst) this.mark({ elem: s.elem, from: s.from, tag: s.tag, fuse: 0, ...s.burst, x: s.x, z: s.z });
      }
    }
    if (gone) this.shots = this.shots.filter((s) => !s.dead);
  }

  drawShot(look, elem, x, y, z, vx, vy, vz, size, age, seed) {
    const c = this.sim.casting, sp = Math.hypot(vx, vy, vz) || 1, dx = vx / sp, dy = vy / sp, dz = vz / sp;
    switch (look) {
      case 'rock': c.fx(FX.ROCK, elem, x - dx * size, y - dy * size, z - dz * size, size, dx, dy, dz, size * 2, 1, 0, 0, (age * 1.3) % 1, seed); break;
      case 'blade': {
        const a = age * 19 + seed * 6, ax = Math.sin(a), az = Math.cos(a), len = size * 4;
        c.fx(FX.BLADE, elem, x - ax * len * 0.5, y, z - az * len * 0.5, size * 0.32, ax, 0.05, az, len, 1, 2, 3, 0, seed);
        break;
      }
      case 'flask': c.fx(FX.FLASK, elem, x - dx * 0.16, y - dy * 0.16, z - dz * 0.16, size * 0.4, Math.sin(age * 13), Math.cos(age * 13), 0.2, size * 1.5, 1, 4, 5, 0, seed); break;
      case 'lance': c.fx(FX.LANCE, elem, x - dx * 1.2, y - dy * 1.2, z - dz * 1.2, size * 0.3, dx, dy, dz, 1.9, 1, 3, 4, 0, seed); break;
      default:
        c.fx(FX.ORB, elem, x, y, z, size, 0, 1, 0, 0, 1, 7, 5, 0, seed);
        // (Tails only while there's room for them: a hundred in the air are told apart without.)
        if (c.n < 260) c.fx(FX.TRAIL, elem, x, y, z, size * 0.65, -dx, -dy, -dz, Math.min(age * sp, 1.6), 0.85, 0, 0, 0, seed);
    }
  }

  // ---- shots, in their patterns ---------------------------------------------------------------------------------------

  /** n shots spread evenly across `spread` radians about o.yaw. */
  fan(o, n, spread) { for (let i = 0; i < n; i++) this.shot({ ...o, yaw: o.yaw + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0) }); }

  /** n shots all round, the first along o.yaw (or `turn` off north), each starting `out` metres from the middle. */
  nova(o, n, turn = o.yaw || 0, out = 0) {
    for (let i = 0; i < n; i++) { const a = turn + i * TAU / n; this.shot({ ...o, x: o.x + Math.sin(a) * out, z: o.z + Math.cos(a) * out, yaw: a }); }
  }

  /** Streams that turn as they pour: arms at once, one volley every `every` seconds for secs, turning `turn` radians a second. o.from: a body to pour from. */
  spiral(o, { arms = 3, secs = 3, every = 0.16, turn = 1.6, up = 1.2 } = {}) {
    let a = o.yaw || 0;
    this.every(every, secs, () => {
      const b = o.from;
      if (b?.dead) return false;
      a += turn * every;
      this.nova({ ...o, ...(b ? { x: b.x, y: b.y + up, z: b.z } : null) }, arms, a);
      return true;
    });
  }

  /** A row of shots abreast, coming on along yaw from a line `width` wide through (x, z), with a way through: gap shots left out at gapAt (or somewhere). */
  wall(o, { width = 14, n = 9, gap = 2, gapAt = -1 } = {}) {
    const at = gapAt < 0 ? Math.floor(Math.random() * (n - gap + 1)) : gapAt, rx = Math.cos(o.yaw), rz = -Math.sin(o.yaw);
    for (let i = 0; i < n; i++) {
      if (i >= at && i < at + gap) continue;
      const u = (i / (n - 1) - 0.5) * width;
      this.shot({ ...o, x: o.x + rx * u, z: o.z + rz * u });
    }
  }

  // ---- marks, in their patterns ---------------------------------------------------------------------------------------

  /** Thrown overarm from `from` ([x, y, z]) to land on (o.x, o.z) after `time`: the mark o is its warning, and goes off as it lands. */
  lob(from, o, { time = 1.3, look = 'rock', size = 0.35, high = 0 } = {}) {
    const m = this.mark({ ...o, fuse: time });
    this.arcs.push({ t: 0, time, look, size, elem: m.elem, x0: from[0], y0: from[1], z0: from[2], m, high: high || Math.max(2.5, Math.hypot(m.x - from[0], m.z - from[2]) * 0.3), seed: Math.random() });
    if (this.sim.time - this.looseAt > 0.12) { this.looseAt = this.sim.time; this.sim.event(EV.WHOOSH, from[0], from[1], from[2]); }
    return m;
  }

  drawArcs(dt) {
    let gone = false;
    for (const a of this.arcs) {
      a.t += dt;
      if (a.t >= a.time || a.m.dead) { a.dead = true; gone = true; continue; }
      // (To where its mark is now: a mark that's still following someone takes its stone with it.)
      const u = a.t / a.time, e = 0.02, m = a.m;
      const at = (q) => [a.x0 + (m.x - a.x0) * q, a.y0 + (m.y - a.y0) * q + 4 * a.high * q * (1 - q), a.z0 + (m.z - a.z0) * q];
      const p = at(u), n = at(Math.min(1, u + e));
      this.drawShot(a.look, a.elem, p[0], p[1], p[2], n[0] - p[0], n[1] - p[1], n[2] - p[2], a.size, a.t, a.seed);
    }
    if (gone) this.arcs = this.arcs.filter((a) => !a.dead);
  }

  /** n marks like o, each somewhere within R of (x, z), coming down one after another over secs. */
  rain(x, z, R, n, secs, o) {
    const open = (qx, qz) => !this.sim.world.inside(qx, qz, 0.4);
    for (let i = 0; i < n; i++) {
      this.later(secs * i / n, () => {
        for (let t = 0; t < 5; t++) {
          const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R, qx = x + Math.sin(a) * d, qz = z + Math.cos(a) * d;
          if (open(qx, qz)) { this.mark({ ...o, x: qx, z: qz }); return; }
        }
      });
    }
  }

  /** n marks like o in a row from (x, z) along yaw, `step` apart, each `gap` seconds after the last: something coming at you along the ground. */
  march(x, z, yaw, n, step, gap, o) {
    for (let i = 0; i < n; i++) {
      const qx = x + Math.sin(yaw) * step * (i + 1), qz = z + Math.cos(yaw) * step * (i + 1);
      this.later(gap * i, () => { if (!this.sim.world.inside(qx, qz, 0.3)) this.mark({ ...o, x: qx, z: qz }); });
    }
  }

  /** Rings out from (x, z), one after another, `gap` seconds apart: the first a circle to radii[0], then each ring to the next. Stand where the last one was. */
  rings(x, z, radii, gap, o) {
    radii.forEach((r, i) => this.later(gap * i, () => this.mark({ ...o, x, z, shape: i ? 'ring' : 'circle', r, r0: i ? radii[i - 1] : 0 })));
  }

  /** A ring that runs out along the ground from (x, z), to be jumped: speed (m/s), reach (how far), band (how wide), touch (what it costs). */
  wave(x, z, { speed = 9, reach = 16, band = 1.3, r = 1.5, ...o } = {}) {
    return this.mark({ shape: 'ring', x, z, r, r0: Math.max(0, r - band), band, grow: speed, life: (reach - r) / speed, fuse: 0, jump: true, again: 99, quiet: true, ...o });
  }

  // ---- when --------------------------------------------------------------------------------------------------------

  later(secs, fn) { this.jobs.push({ at: secs, fn, every: 0, until: 0 }); }
  /** fn every `gap` seconds for secs, from now; it stops early if fn says false. */
  every(gap, secs, fn) { this.jobs.push({ at: 0, fn, every: gap, until: secs }); }

  stepJobs(dt) {
    if (!this.jobs.length) return;
    const due = this.jobs;
    this.jobs = [];
    for (const j of due) {
      j.at -= dt; j.until -= dt;
      if (j.at > 0) { this.jobs.push(j); continue; }
      const go = j.fn();
      if (j.every && go !== false && j.until > 0) { j.at += j.every; this.jobs.push(j); }
    }
  }

  // ---- each tick ------------------------------------------------------------------------------------------------------

  step(dt) {
    if (!this.busy) return;
    this.stepJobs(dt);
    this.stepMarks(dt);
    this.stepShots(dt);
  }

  // After the spells' own shapes, each tick (src/sim/sim.worker.js).
  draw(dt) {
    this.post(dt);
    if (!this.busy) return;
    this.drawMarks();
    this.drawArcs(dt);
    for (const s of this.shots) this.drawShot(s.look, s.elem, s.x, s.y, s.z, s.vx, s.vy, s.vz, s.size, s.age, s.seed);
  }

  // ---- for whoever has to get out of the way ------------------------------------------------------------------------------

  /** Where a body at (x, z) should step to, out of every mark it's in or within pad of; null if it's clear. */
  danger(x, z, pad = 0.8) {
    if (!this.marks.length) return null;
    return wayOut(this.marks.filter((m) => !m.jump && !m.soak), x, z, pad, (qx, qz) => !this.sim.world.inside(qx, qz, 0.7));
  }

  /** Whether (x, z) is clear of every mark. */
  safe(x, z, pad = 0.4) { for (const m of this.marks) if (!m.jump && !m.soak && edge(m, x, z) < pad) return false; return true; }

  /** A wave about to reach (x, z): something to jump. */
  waveAt(x, z, within = 1.6) { for (const m of this.marks) if (m.jump && m.t >= m.fuse && Math.abs(edge(m, x, z)) < within) return m; return null; }

  // The marks and shots near you, a few times a second, for the page (auto-play steps out of them: src/ui/autobrain.js).
  post(dt) {
    if ((this.postT -= dt) > 0) return;
    this.postT = 0.1;
    if (!this.marks.length && !this.shots.length && !this.posted) return;
    const p = this.sim.player;
    const marks = this.marks.filter((m) => Math.hypot(m.x - p.x, m.z - p.z) < reachOf(m) + 30).map(markOut);
    const shots = this.shots.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) < 30).slice(0, 60).map((s) => ({ x: s.x, y: s.y, z: s.z, vx: s.vx, vz: s.vz, r: s.size }));
    this.posted = marks.length + shots.length;
    self.postMessage({ type: 'perils', marks, shots });
  }
}
